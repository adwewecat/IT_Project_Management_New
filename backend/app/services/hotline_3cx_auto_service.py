# -*- coding: utf-8 -*-
"""
Dịch vụ nghiệp vụ Tự Động Phân Hàng Đợi Trực Hotline 3CX (Part 1):
- Quản lý danh mục nhân sự & máy nhánh (DEFAULT_3CX_MEMBERS, Seed dữ liệu idempotent, Member CRUD).
- Quản lý cấu hình kết nối portal 3CX & mật khẩu bảo mật (get_public_config, get_runtime_credentials, update_config).
- Quản lý lưới lịch trực theo ngày, tuần, tháng (get_schedules_range, get_week_schedules, upsert_schedules, clone_previous_week_schedules, apply_week_template_to_month).
- Thuật toán thuần túy tính toán kế hoạch phân ca trực (resolve_shift_plan: xử lý ca ngày, ca tối, xoay tua cuối tuần, ngày lễ).
"""

from __future__ import annotations

import asyncio
import calendar
from datetime import date, datetime, timedelta
import json
import logging
import os
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.hotline_3cx_auto import (
    Hotline3cxConfig,
    Hotline3cxMember,
    Hotline3cxSchedule,
    Hotline3cxSyncLog,
)
from app.schemas.hotline_3cx_auto import (
    Hotline3cxConfigOut,
    Hotline3cxConfigUpdate,
    HotlineMemberCreate,
    HotlineMemberUpdate,
    ResolvedShiftPlan,
    ResolvedUserAssignment,
    ScheduleDayItem,
    ScheduleDayUpsertItem,
)
from app.services.ticket_batch_service import (
    _decode_password,
    _encode_password,
    _is_timeout_error,
    _setup_playwright_browsers_path,
    format_friendly_error,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
)

logger = logging.getLogger(__name__)

# ==============================================================================
# HẰNG SỐ DANH MỤC NHÂN SỰ & NGÀY TRONG TUẦN
# ==============================================================================

# Danh sách 7 nhân sự IT DEPT / ITS mặc định phụ trách trực hotline 3CX
DEFAULT_3CX_MEMBERS: List[Dict[str, object]] = [
    {"ext_line": "8775", "full_name": "HUNG PHAM TRAN MANH", "department": "HCM IT DEPT", "sort_order": 1},
    {"ext_line": "8778", "full_name": "DUY NGO NHUT", "department": "HCM IT DEPT", "sort_order": 2},
    {"ext_line": "8776", "full_name": "NGUYEN VU MINH THUC", "department": "HCM IT DEPT", "sort_order": 3},
    {"ext_line": "8772", "full_name": "NGUYEN VI TRAM", "department": "HCM ITS", "sort_order": 4},
    {"ext_line": "8779", "full_name": "LUC LE HOANG", "department": "HCM ITS", "sort_order": 5},
    {"ext_line": "8741", "full_name": "QUYEN TO THI", "department": "HCM IT DEPT", "sort_order": 6},
    {"ext_line": "8740", "full_name": "DUNG NGUYEN ANH", "department": "HCM IT DEPT", "sort_order": 7},
]

# Nhãn tiếng Việt cho các ngày trong tuần (isoweekday: 1=Thứ Hai ... 7=Chủ Nhật)
WEEKDAY_NAMES: Dict[int, str] = {
    1: "Thứ Hai",
    2: "Thứ Ba",
    3: "Thứ Tư",
    4: "Thứ Năm",
    5: "Thứ Sáu",
    6: "Thứ Bảy",
    7: "Chủ Nhật",
}


# ==============================================================================
# 1. SEED DỮ LIỆU BAN ĐẦU & DANH MỤC NHÂN SỰ (MEMBERS CRUD)
# ==============================================================================


def ensure_seeded_data(db: Session) -> None:
    """
    Khởi tạo dữ liệu mẫu ban đầu một cách an toàn và idempotent:
    1. Kiểm tra bản ghi cấu hình HOTLINE_3CX_CONFIG (id=1), nếu chưa có thì tạo mới với các giá trị mặc định.
    2. Kiểm tra bảng HOTLINE_3CX_MEMBERS, nếu số lượng bản ghi = 0 thì chèn 7 nhân sự mặc định.
       Nếu bảng đã có dữ liệu (kể cả sau khi người dùng xóa/sửa), hàm KHÔNG tự ý chèn lại để bảo toàn dữ liệu.
    """
    # 1. Khởi tạo cấu hình singleton id=1 nếu chưa có
    config_row = db.query(Hotline3cxConfig).filter(Hotline3cxConfig.id == 1).first()
    if not config_row:
        initial_pw_enc = ""
        fallback_pw = settings.HOTLINE_3CX_PASSWORD or ""
        if fallback_pw.strip():
            initial_pw_enc = _encode_password(fallback_pw.strip())

        config_row = Hotline3cxConfig(
            id=1,
            portal_url="https://ggg.ringbot.co:5001/#/login",
            username="8740",
            password_enc=initial_pw_enc,
            day_queue_name="IT HCM App Day",
            night_queue_name="IT HCM App Night",
            morning_time="06:00",
            evening_time="16:29",
            alert_emails="dung.nguyenanh@ggg.com.vn",
        )
        db.add(config_row)
        db.commit()
        logger.info("[3CX_HOTLINE] Đã khởi tạo cấu hình singleton id=1 mặc định")

    # 2. Khởi tạo 7 nhân sự ban đầu nếu bảng nhân sự còn trống (count == 0)
    member_count = db.query(Hotline3cxMember).count()
    if member_count == 0:
        for item in DEFAULT_3CX_MEMBERS:
            member = Hotline3cxMember(
                ext_line=str(item["ext_line"]),
                full_name=str(item["full_name"]),
                department=str(item["department"]),
                is_active=True,
                sort_order=int(item["sort_order"]),
            )
            db.add(member)
        db.commit()
        logger.info("[3CX_HOTLINE] Đã nạp thành công 7 nhân sự hotline mặc định")


def list_members(db: Session, active_only: bool = False) -> List[Hotline3cxMember]:
    """Lấy danh sách nhân sự trực hotline theo thứ tự sort_order tăng dần."""
    query = db.query(Hotline3cxMember)
    if active_only:
        query = query.filter(Hotline3cxMember.is_active.is_(True))
    return query.order_by(Hotline3cxMember.sort_order.asc(), Hotline3cxMember.id.asc()).all()


def create_member(db: Session, member_in: HotlineMemberCreate) -> Hotline3cxMember:
    """Tạo mới một nhân sự trực hotline với số máy nhánh 3CX."""
    member = Hotline3cxMember(
        ext_line=member_in.ext_line.strip(),
        full_name=member_in.full_name.strip(),
        department=member_in.department.strip() if member_in.department else "",
        is_active=member_in.is_active,
        sort_order=member_in.sort_order,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def update_member(
    db: Session, member_id: int, member_in: HotlineMemberUpdate
) -> Optional[Hotline3cxMember]:
    """Cập nhật thông tin nhân sự trực hotline."""
    member = db.query(Hotline3cxMember).filter(Hotline3cxMember.id == member_id).first()
    if not member:
        return None

    if member_in.ext_line is not None:
        member.ext_line = member_in.ext_line.strip()
    if member_in.full_name is not None:
        member.full_name = member_in.full_name.strip()
    if member_in.department is not None:
        member.department = member_in.department.strip()
    if member_in.is_active is not None:
        member.is_active = member_in.is_active
    if member_in.sort_order is not None:
        member.sort_order = member_in.sort_order

    member.updated_at = datetime.now()
    db.commit()
    db.refresh(member)
    return member


def delete_member(db: Session, member_id: int) -> bool:
    """Xóa một nhân sự trực hotline khỏi danh mục."""
    member = db.query(Hotline3cxMember).filter(Hotline3cxMember.id == member_id).first()
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


# ==============================================================================
# 2. QUẢN LÝ CẤU HÌNH & MẬT KHẨU BẢO MẬT (CONFIG & RUNTIME CREDENTIALS)
# ==============================================================================


class RuntimeCredentials:
    """Thông tin xác thực portal 3CX phục vụ Playwright worker (truy cập cả attribute lẫn dictionary)."""

    def __init__(self, portal_url: str, username: str, password: str):
        self.portal_url = portal_url
        self.username = username
        self.password = password

    def __getitem__(self, item: str) -> str:
        if item in ("portal_url", "username", "password"):
            return getattr(self, item)
        raise KeyError(item)

    def __iter__(self):
        return iter((self.portal_url, self.username, self.password))


def get_or_create_config(db: Session) -> Hotline3cxConfig:
    """Lấy bản ghi cấu hình id=1, nếu chưa có thì tự động tạo mới."""
    cfg = db.query(Hotline3cxConfig).filter(Hotline3cxConfig.id == 1).first()
    if not cfg:
        cfg = Hotline3cxConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


def get_public_config(db: Session) -> Hotline3cxConfigOut:
    """
    Trả về cấu hình công khai an toàn cho frontend.
    TUYỆT ĐỐI KHÔNG chứa password raw hay password_enc, chỉ trả cờ has_password: bool.
    """
    cfg = get_or_create_config(db)
    has_db_pw = bool(cfg.password_enc and cfg.password_enc.strip())
    has_env_pw = bool(settings.HOTLINE_3CX_PASSWORD and settings.HOTLINE_3CX_PASSWORD.strip())
    has_pw = has_db_pw or has_env_pw

    return Hotline3cxConfigOut(
        portal_url=cfg.portal_url,
        username=cfg.username,
        has_password=has_pw,
        day_queue_name=cfg.day_queue_name,
        night_queue_name=cfg.night_queue_name,
        morning_time=cfg.morning_time,
        evening_time=cfg.evening_time,
        alert_emails=cfg.alert_emails,
        updated_at=cfg.updated_at,
    )


def get_runtime_credentials(db: Session) -> RuntimeCredentials:
    """
    Lấy thông tin đăng nhập đầy đủ (bao gồm raw password đã giải mã) cho worker Playwright.
    Ưu tiên mật khẩu lưu trong DB; nếu rỗng thì fallback sang settings.HOTLINE_3CX_PASSWORD.
    """
    cfg = get_or_create_config(db)
    raw_pw = ""
    if cfg.password_enc and cfg.password_enc.strip():
        raw_pw = _decode_password(cfg.password_enc)

    if not raw_pw and settings.HOTLINE_3CX_PASSWORD and settings.HOTLINE_3CX_PASSWORD.strip():
        raw_pw = settings.HOTLINE_3CX_PASSWORD.strip()

    return RuntimeCredentials(
        portal_url=cfg.portal_url,
        username=cfg.username,
        password=raw_pw,
    )


def update_config(db: Session, config_in: Hotline3cxConfigUpdate) -> Hotline3cxConfig:
    """Cập nhật cấu hình hệ thống trực Hotline 3CX."""
    cfg = get_or_create_config(db)

    # Chỉ cập nhật mật khẩu khi giá trị truyền vào không rỗng
    if config_in.password is not None and config_in.password.strip():
        cfg.password_enc = _encode_password(config_in.password.strip())

    for field in (
        "portal_url",
        "username",
        "day_queue_name",
        "night_queue_name",
        "morning_time",
        "evening_time",
        "alert_emails",
    ):
        val = getattr(config_in, field, None)
        if val is not None:
            setattr(cfg, field, val)

    cfg.updated_at = datetime.now()
    db.commit()
    db.refresh(cfg)
    return cfg


# ==============================================================================
# 3. QUẢN LÝ LỊCH TRỰC THEO NGÀY, TUẦN, THÁNG (SCHEDULE GRID & BULK HELPERS)
# ==============================================================================


def get_week_monday(anchor: date) -> date:
    """Tính ngày Thứ Hai đầu tuần tương ứng với ngày anchor (anchor.weekday(): 0=Mon..6=Sun)."""
    return anchor - timedelta(days=anchor.weekday())


def compute_effective_mode(duty_date: date, shift_mode: str) -> str:
    """Xác định chế độ phân ca thực tế: WEEKDAY (ngày thường) hoặc WEEKEND (cuối tuần / lễ)."""
    if shift_mode in ("WEEKDAY", "WEEKEND"):
        return shift_mode
    # Nếu là AUTO: Thứ Bảy (6) và Chủ Nhật (7) là WEEKEND, còn lại là WEEKDAY
    return "WEEKEND" if duty_date.isoweekday() in (6, 7) else "WEEKDAY"


def _parse_json_lines(json_str: Optional[str]) -> List[str]:
    """Helper chuyển chuỗi JSON thành danh sách số máy nhánh."""
    if not json_str:
        return []
    try:
        parsed = json.loads(json_str)
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if str(x).strip()]
        return []
    except Exception:
        return []


def get_schedules_range(db: Session, start_date: date, end_date: date) -> List[ScheduleDayItem]:
    """
    Lấy lưới lịch trực trong khoảng ngày [start_date, end_date] (bao gồm cả 2 đầu mút).
    Những ngày chưa có bản ghi trong DB sẽ tự động được bổ sung hàng mặc định rỗng kèm nhãn thứ và effective_mode.
    """
    rows = (
        db.query(Hotline3cxSchedule)
        .filter(
            Hotline3cxSchedule.duty_date >= start_date,
            Hotline3cxSchedule.duty_date <= end_date,
        )
        .all()
    )
    row_map = {r.duty_date: r for r in rows}

    result: List[ScheduleDayItem] = []
    cur_date = start_date
    delta_one_day = timedelta(days=1)

    while cur_date <= end_date:
        is_wk = cur_date.isoweekday() in (6, 7)
        wk_label = WEEKDAY_NAMES.get(cur_date.isoweekday(), "")

        if cur_date in row_map:
            r = row_map[cur_date]
            eff_mode = compute_effective_mode(cur_date, r.shift_mode)
            item = ScheduleDayItem(
                id=r.id,
                duty_date=r.duty_date,
                shift_mode=r.shift_mode,
                morning_lines=_parse_json_lines(r.morning_lines_json),
                evening_lines=_parse_json_lines(r.evening_lines_json),
                weekend_lines=_parse_json_lines(r.weekend_lines_json),
                weekend_evening_override=_parse_json_lines(r.weekend_evening_override_json),
                note=r.note,
                weekday_label=wk_label,
                effective_mode=eff_mode,
                is_weekend=is_wk,
                updated_by=r.updated_by,
                updated_at=r.updated_at,
            )
        else:
            eff_mode = "WEEKEND" if is_wk else "WEEKDAY"
            item = ScheduleDayItem(
                id=None,
                duty_date=cur_date,
                shift_mode="AUTO",
                morning_lines=[],
                evening_lines=[],
                weekend_lines=[],
                weekend_evening_override=[],
                note=None,
                weekday_label=wk_label,
                effective_mode=eff_mode,
                is_weekend=is_wk,
                updated_by=None,
                updated_at=None,
            )
        result.append(item)
        cur_date += delta_one_day

    return result


def get_week_schedules(db: Session, anchor_date: date) -> List[ScheduleDayItem]:
    """Lấy danh sách 7 ngày Thứ Hai - Chủ Nhật chứa ngày anchor_date."""
    monday = get_week_monday(anchor_date)
    sunday = monday + timedelta(days=6)
    return get_schedules_range(db, monday, sunday)


def upsert_schedules(
    db: Session, days: List[ScheduleDayUpsertItem], updated_by: Optional[str] = None
) -> List[Hotline3cxSchedule]:
    """Lưu danh sách lịch trực theo ngày (thêm mới nếu chưa có, cập nhật nếu đã tồn tại)."""
    saved_rows: List[Hotline3cxSchedule] = []

    for item in days:
        existing = (
            db.query(Hotline3cxSchedule)
            .filter(Hotline3cxSchedule.duty_date == item.duty_date)
            .first()
        )

        morning_json = json.dumps(item.morning_lines, ensure_ascii=False)
        evening_json = json.dumps(item.evening_lines, ensure_ascii=False)
        weekend_json = json.dumps(item.weekend_lines, ensure_ascii=False)
        override_json = json.dumps(item.weekend_evening_override, ensure_ascii=False)
        now_ts = datetime.now()

        if existing:
            existing.shift_mode = item.shift_mode
            existing.morning_lines_json = morning_json
            existing.evening_lines_json = evening_json
            existing.weekend_lines_json = weekend_json
            existing.weekend_evening_override_json = override_json
            existing.note = item.note
            existing.updated_by = updated_by
            existing.updated_at = now_ts
            saved_rows.append(existing)
        else:
            row = Hotline3cxSchedule(
                duty_date=item.duty_date,
                shift_mode=item.shift_mode,
                morning_lines_json=morning_json,
                evening_lines_json=evening_json,
                weekend_lines_json=weekend_json,
                weekend_evening_override_json=override_json,
                note=item.note,
                updated_by=updated_by,
                updated_at=now_ts,
            )
            db.add(row)
            saved_rows.append(row)

    db.commit()
    for row in saved_rows:
        db.refresh(row)
    return saved_rows


def clone_previous_week_schedules(
    db: Session, target_week_start: date, updated_by: Optional[str] = None
) -> List[Hotline3cxSchedule]:
    """
    Sao chép lịch trực của tuần liền trước sang tuần mục tiêu (bắt đầu từ target_week_start).
    Tương ứng từng ngày T2->T2, T3->T3... CN->CN.
    """
    target_monday = get_week_monday(target_week_start)
    prev_monday = target_monday - timedelta(days=7)
    prev_sunday = prev_monday + timedelta(days=6)

    prev_rows = (
        db.query(Hotline3cxSchedule)
        .filter(
            Hotline3cxSchedule.duty_date >= prev_monday,
            Hotline3cxSchedule.duty_date <= prev_sunday,
        )
        .all()
    )
    prev_map = {r.duty_date: r for r in prev_rows}

    upsert_items: List[ScheduleDayUpsertItem] = []
    for day_offset in range(7):
        p_date = prev_monday + timedelta(days=day_offset)
        t_date = target_monday + timedelta(days=day_offset)
        prev_row = prev_map.get(p_date)

        if prev_row:
            upsert_items.append(
                ScheduleDayUpsertItem(
                    duty_date=t_date,
                    shift_mode=prev_row.shift_mode,
                    morning_lines=_parse_json_lines(prev_row.morning_lines_json),
                    evening_lines=_parse_json_lines(prev_row.evening_lines_json),
                    weekend_lines=_parse_json_lines(prev_row.weekend_lines_json),
                    weekend_evening_override=_parse_json_lines(
                        prev_row.weekend_evening_override_json
                    ),
                    note=prev_row.note,
                )
            )
        else:
            upsert_items.append(
                ScheduleDayUpsertItem(
                    duty_date=t_date,
                    shift_mode="AUTO",
                    morning_lines=[],
                    evening_lines=[],
                    weekend_lines=[],
                    weekend_evening_override=[],
                    note=None,
                )
            )

    return upsert_schedules(db, upsert_items, updated_by=updated_by)


def apply_week_template_to_month(
    db: Session,
    year: int,
    month: int,
    template_days: List[ScheduleDayUpsertItem],
    updated_by: Optional[str] = None,
    overwrite_existing: bool = True,
) -> int:
    """
    Áp dụng mẫu tuần (7 ngày mẫu) cho toàn bộ các ngày trong tháng (year, month).
    Khớp từng ngày theo thứ trong tuần (isoweekday 1..7).
    Trả về tổng số ngày đã được lưu cấu hình.
    """
    # Xây dựng bản đồ mẫu theo thứ trong tuần: 1=Thứ Hai ... 7=Chủ Nhật
    template_by_isoweekday = {item.duty_date.isoweekday(): item for item in template_days}

    _, total_days_in_month = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, total_days_in_month)

    existing_dates = set()
    if not overwrite_existing:
        existing_rows = (
            db.query(Hotline3cxSchedule.duty_date)
            .filter(
                Hotline3cxSchedule.duty_date >= month_start,
                Hotline3cxSchedule.duty_date <= month_end,
            )
            .all()
        )
        existing_dates = {r[0] for r in existing_rows}

    upsert_items: List[ScheduleDayUpsertItem] = []
    for day_num in range(1, total_days_in_month + 1):
        target_date = date(year, month, day_num)
        if not overwrite_existing and target_date in existing_dates:
            continue

        template_item = template_by_isoweekday.get(target_date.isoweekday())
        if template_item:
            upsert_items.append(
                ScheduleDayUpsertItem(
                    duty_date=target_date,
                    shift_mode=template_item.shift_mode,
                    morning_lines=list(template_item.morning_lines),
                    evening_lines=list(template_item.evening_lines),
                    weekend_lines=list(template_item.weekend_lines),
                    weekend_evening_override=list(template_item.weekend_evening_override),
                    note=template_item.note,
                )
            )

    if upsert_items:
        upsert_schedules(db, upsert_items, updated_by=updated_by)

    return len(upsert_items)


# ==============================================================================
# 4. THUẬT TOÁN THUẦN TÚY PHÂN CA TRỰC (PURE DOMAIN LOGIC: resolve_shift_plan)
# ==============================================================================


def _clean_lines(raw_lines: List[str], active_lines: Optional[Set[str]] = None) -> List[str]:
    """
    Làm sạch danh sách line máy nhánh:
    - Loại bỏ giá trị rỗng/None, khoảng trắng thừa
    - Khử trùng lặp (deduplicate) nhưng vẫn bảo toàn nguyên vẹn thứ tự ban đầu
    - Lọc theo active_lines (nếu có truyền vào)
    """
    seen: Set[str] = set()
    cleaned: List[str] = []

    for item in raw_lines:
        if item is None:
            continue
        line_str = str(item).strip()
        if line_str and line_str not in seen:
            if active_lines is not None and line_str not in active_lines:
                continue
            seen.add(line_str)
            cleaned.append(line_str)

    return cleaned


def resolve_shift_plan(
    duty_date: date,
    shift_code: str,
    schedule_row: Optional[Hotline3cxSchedule],
    config: Hotline3cxConfig,
    active_lines: Optional[Set[str]] = None,
) -> ResolvedShiftPlan:
    """
    Thuật toán cốt lõi tính toán kế hoạch gán máy nhánh và Skill Group vào hàng đợi 3CX:
    Quy tắc nghiệp vụ:
    1. Xác định effective_mode (WEEKDAY hoặc WEEKEND):
       - Nếu schedule_row có shift_mode là WEEKDAY hoặc WEEKEND: lấy theo giá trị đó.
       - Nếu shift_mode là AUTO (hoặc chưa có lịch): T7-CN là WEEKEND, T2-T6 là WEEKDAY.
    2. Nếu effective_mode == "WEEKDAY":
       - Ca sáng (MORNING): Hàng đợi config.day_queue_name ("IT HCM App Day"), use_skill_group=False,
         toàn bộ nhân sự nhận skill_group=None (đổ chuông song song / parallel ring).
       - Ca chiều (EVENING): Hàng đợi config.night_queue_name ("IT HCM App Night"), use_skill_group=True,
         nhân sự đầu tiên nhận skill_group="1", nhân sự thứ hai nhận skill_group="2", v.v.
    3. Nếu effective_mode == "WEEKEND":
       - Cả ca sáng và ca chiều đều phân vào hàng đợi config.night_queue_name ("IT HCM App Night") với use_skill_group=True.
       - Ca sáng (MORNING): Lấy danh sách weekend_lines theo đúng thứ tự (index 0 -> "1", index 1 -> "2"...).
       - Ca chiều (EVENING):
         + Nếu có weekend_evening_override: lấy danh sách override này (index 0 -> "1", index 1 -> "2"...).
         + Nếu không có override: tự động hoán đổi 2 người đầu tiên [p2, p1, *rest] để người trực phụ ca sáng
           lên làm người trực chính (Skill Group 1) của ca chiều.
    4. Bỏ qua đồng bộ (should_skip=True) nếu không có nhân sự nào được phân.
    """
    shift_code_upper = shift_code.upper()
    if shift_code_upper not in ("MORNING", "EVENING"):
        raise ValueError(
            f"shift_code không hợp lệ: '{shift_code}'. Chỉ chấp nhận 'MORNING' hoặc 'EVENING'."
        )

    # 1. Xác định effective_mode
    raw_shift_mode = schedule_row.shift_mode if schedule_row else "AUTO"
    effective_mode = compute_effective_mode(duty_date, raw_shift_mode)

    # 2. Đọc các mảng line từ bản ghi lịch trực
    if schedule_row:
        morning_raw = _parse_json_lines(schedule_row.morning_lines_json)
        evening_raw = _parse_json_lines(schedule_row.evening_lines_json)
        weekend_raw = _parse_json_lines(schedule_row.weekend_lines_json)
        override_raw = _parse_json_lines(schedule_row.weekend_evening_override_json)
    else:
        morning_raw, evening_raw, weekend_raw, override_raw = [], [], [], []

    morning_lines = _clean_lines(morning_raw, active_lines)
    evening_lines = _clean_lines(evening_raw, active_lines)
    weekend_lines = _clean_lines(weekend_raw, active_lines)
    weekend_override = _clean_lines(override_raw, active_lines)

    day_queue = (config.day_queue_name or "IT HCM App Day") if config else "IT HCM App Day"
    night_queue = (config.night_queue_name or "IT HCM App Night") if config else "IT HCM App Night"

    entries: List[ResolvedUserAssignment] = []
    queue_name = day_queue
    use_skill_group = False

    # 3. Phân luồng theo effective_mode và ca trực
    if effective_mode == "WEEKDAY":
        if shift_code_upper == "MORNING":
            queue_name = day_queue
            use_skill_group = False
            entries = [
                ResolvedUserAssignment(ext_line=line, skill_group=None) for line in morning_lines
            ]
        else:  # EVENING
            queue_name = night_queue
            use_skill_group = True
            entries = [
                ResolvedUserAssignment(ext_line=line, skill_group=str(idx + 1))
                for idx, line in enumerate(evening_lines)
            ]
    else:  # WEEKEND (hoặc ngày lễ chạy theo chế độ cuối tuần)
        queue_name = night_queue
        use_skill_group = True

        if shift_code_upper == "MORNING":
            target_lines = weekend_lines
        else:  # EVENING
            if len(weekend_override) > 0:
                target_lines = weekend_override
            else:
                # Tự động đảo vị trí 2 nhân sự đầu tiên nếu không có override
                if len(weekend_lines) >= 2:
                    target_lines = [weekend_lines[1], weekend_lines[0]] + weekend_lines[2:]
                else:
                    target_lines = list(weekend_lines)

        entries = [
            ResolvedUserAssignment(ext_line=line, skill_group=str(idx + 1))
            for idx, line in enumerate(target_lines)
        ]

    # 4. Kiểm tra trường hợp rỗng không có line trực nào
    if len(entries) == 0:
        formatted_date = duty_date.strftime("%d-%m-%Y")
        skip_reason_text = (
            f"Chưa cấu hình nhân sự trực cho ca {shift_code_upper} ngày {formatted_date}."
        )
        return ResolvedShiftPlan(
            duty_date=duty_date,
            shift_code=shift_code_upper,  # type: ignore[arg-type]
            effective_mode=effective_mode,
            queue_name=queue_name,
            use_skill_group=use_skill_group,
            entries=[],
            should_skip=True,
            skip_reason=skip_reason_text,
        )

    return ResolvedShiftPlan(
        duty_date=duty_date,
        shift_code=shift_code_upper,  # type: ignore[arg-type]
        effective_mode=effective_mode,
        queue_name=queue_name,
        use_skill_group=use_skill_group,
        entries=entries,
        should_skip=False,
        skip_reason=None,
    )


# ==============================================================================
# 5. TỰ ĐỘNG HÓA PLAYWRIGHT ĐỒNG BỘ HÀNG ĐỢI 3CX (PLAYWRIGHT SYNC ENGINE)
# ==============================================================================


async def _create_3cx_browser_context(playwright_instance):
    """
    Khởi tạo Chromium browser và context riêng biệt cho portal 3CX.
    Viewport cố định 1440x900 đảm bảo giao diện web desktop của 3CX
    không bao giờ bị co lại thành layout mobile hay ẩn sidebar / cột hàng đợi.
    """
    _setup_playwright_browsers_path()
    browser = None
    launch_err = None
    chromium_args = [
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--disable-gpu",
        "--mute-audio",
    ]
    for ch in [None, "msedge", "chrome"]:
        try:
            if ch is None:
                browser = await playwright_instance.chromium.launch(
                    headless=True, args=chromium_args
                )
            else:
                browser = await playwright_instance.chromium.launch(
                    channel=ch, headless=True, args=chromium_args
                )
            if browser:
                break
        except Exception as e:
            launch_err = e
            continue

    if not browser:
        if launch_err:
            raise launch_err
        raise RuntimeError("Không thể khởi động trình duyệt Playwright Chromium cho 3CX")

    context = await browser.new_context(
        ignore_https_errors=True,
        viewport={"width": 1440, "height": 900},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    )
    context.set_default_timeout(45000)
    context.set_default_navigation_timeout(60000)
    return browser, context


async def _playwright_sync_3cx_queue(
    portal_url: str,
    username: str,
    password: str,
    plan: ResolvedShiftPlan,
    dry_run: bool = False,
    screenshot_file_path: Optional[str] = None,
) -> dict:
    """
    Đồng bộ danh sách máy nhánh và Skill Group vào hàng đợi 3CX bằng Playwright.
    Sử dụng các selector Angular chính xác đã được live probe xác thực.
    """
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser, context = await _create_3cx_browser_context(p)
        page = await context.new_page()
        try:
            # 1. Điều hướng và Đăng nhập
            logger.info(f"[3CX_SYNC] Đang kết nối tới portal 3CX: {portal_url}")
            await page.goto(portal_url, wait_until="networkidle", timeout=60000)

            # Điền Extension / Username
            user_input = page.locator("#loginInput, input[placeholder*='Extension']").first
            await user_input.wait_for(state="visible", timeout=20000)
            await user_input.fill(username)

            # Điền Password
            pass_input = page.locator("#passwordInput, input[type='password']").first
            await pass_input.fill(password)

            # Nhấn Login
            submit_btn = page.locator("button[type='submit']").first
            await submit_btn.click()

            # Chờ chuyển hướng vào hệ thống (Dashboard hoặc Admin menu xuất hiện)
            admin_btn = page.locator("a#menuAdmin, a:has-text('Admin')").first
            try:
                await admin_btn.wait_for(state="visible", timeout=30000)
            except Exception:
                # Kiểm tra thông báo lỗi trên màn hình đăng nhập
                err_loc = page.locator(".alert-danger, .error-message, .pw-login-error, .invalid-feedback")
                if await err_loc.count() > 0 and await err_loc.first.is_visible():
                    err_txt = (await err_loc.first.inner_text()).strip()
                    raise ValueError(f"Đăng nhập 3CX thất bại: {err_txt}")
                raise ValueError("Sai tài khoản hoặc mật khẩu 3CX (không thể vào màn hình quản trị)")

            # 2. Điều hướng vào Admin -> Call Handling
            logger.info("[3CX_SYNC] Đăng nhập thành công, điều hướng vào Call Handling...")
            await admin_btn.click()
            await page.wait_for_load_state("networkidle", timeout=20000)

            call_handling_link = page.locator("a:has-text('Call Handling')").first
            await call_handling_link.wait_for(state="visible", timeout=15000)
            await call_handling_link.click()
            await page.wait_for_load_state("networkidle", timeout=20000)

            # 3. Mở hàng đợi tương ứng (0006 cho Day, 0007 cho Night)
            logger.info(f"[3CX_SYNC] Tìm kiếm hàng đợi '{plan.queue_name}'...")
            queue_row = page.locator(f"tr:has-text('{plan.queue_name}')").first
            if await queue_row.count() == 0:
                # Fallback theo mã hàng đợi 0006 hoặc 0007
                fallback_code = "0006" if "day" in plan.queue_name.lower() else "0007"
                queue_row = page.locator(f"tr:has-text('{fallback_code}')").first

            await queue_row.wait_for(state="visible", timeout=15000)
            await queue_row.click()
            await page.wait_for_load_state("networkidle", timeout=20000)

            # 4. Chuyển sang tab Users
            users_tab = page.locator("button[role='tab']:has-text('Users'), a:has-text('Users'), [id='users-link']").first
            await users_tab.wait_for(state="visible", timeout=15000)
            await users_tab.click()
            await page.wait_for_load_state("networkidle", timeout=15000)
            await asyncio.sleep(1)

            # Thu thập danh sách user hiện tại
            existing_user_elems = await page.locator("button[data-qa='remove-agent']").all()
            existing_count = len(existing_user_elems)
            logger.info(f"[3CX_SYNC] Số nhân sự hiện tại trong hàng đợi: {existing_count}")

            # 5. Xử lý Chế Độ DRY_RUN (Kiểm tra đọc, KHÔNG thay đổi dữ liệu)
            if dry_run:
                logger.info("[3CX_SYNC] Chạy ở chế độ DRY_RUN - chụp ảnh màn hình và không ghi dữ liệu")
                if screenshot_file_path:
                    os.makedirs(os.path.dirname(os.path.abspath(screenshot_file_path)), exist_ok=True)
                    await page.screenshot(path=screenshot_file_path, full_page=True)

                back_btn = page.locator("button[data-qa='back-btn']").first
                if await back_btn.count() > 0 and await back_btn.is_visible():
                    await back_btn.click()

                return {
                    "status": "DRY_RUN",
                    "queue_name": plan.queue_name,
                    "existing_users_count": existing_count,
                    "verified_lines": [e.ext_line for e in plan.entries],
                }

            # 6. Xử lý Chế Độ Đồng Bộ Thực Tế (dry_run=False)
            # 6.1. Xóa toàn bộ nhân sự cũ (Zero-wipe guard)
            logger.info("[3CX_SYNC] Đang xóa toàn bộ nhân sự cũ trong hàng đợi...")
            trash_loc = page.locator("button[data-qa='remove-agent']")
            deletes_done = 0
            while await trash_loc.count() > 0 and deletes_done < 50:
                await trash_loc.first.click()
                await asyncio.sleep(0.3)
                deletes_done += 1

            remaining = await trash_loc.count()
            if remaining != 0:
                raise RuntimeError(f"Zero-wipe guard thất bại: vẫn còn {remaining} nhân sự chưa được xóa")

            logger.info(f"[3CX_SYNC] Đã xóa sạch {deletes_done} nhân sự cũ thành công (count = 0)")

            # 6.2. Thêm từng nhân sự theo kế hoạch phân ca
            add_btn = page.locator("[data-qa='add-agent'] button, button:has-text('Add User')").first
            for idx, assignment in enumerate(plan.entries):
                logger.info(f"[3CX_SYNC] Thêm nhân sự [{idx + 1}/{len(plan.entries)}]: máy nhánh {assignment.ext_line}, Skill Group {assignment.skill_group}")
                await add_btn.click()
                await asyncio.sleep(0.5)

                # Dòng mới thêm vào nằm ở cuối danh sách UserListItem
                new_row = page.locator(".queueAgent.cdk-drag, [id^='UserListItem']").last
                user_input = new_row.locator("app-dn-select input[role='combobox']").first
                await user_input.wait_for(state="visible", timeout=10000)
                await user_input.fill(assignment.ext_line)
                await asyncio.sleep(0.6)

                # Chọn kết quả tìm kiếm trong dropdown .ng-option
                opt = page.locator(f".ng-option:has-text('{assignment.ext_line}')").first
                await opt.wait_for(state="visible", timeout=10000)
                await opt.click()
                await asyncio.sleep(0.3)

                # Nếu hàng đợi sử dụng Skill Group (chế độ ca chiều / cuối tuần)
                if plan.use_skill_group and assignment.skill_group:
                    skill_select = new_row.locator("ng-select[bindvalue='value'], ng-select").nth(1)
                    await skill_select.click()
                    await asyncio.sleep(0.3)
                    skill_opt = page.locator(f".ng-option:has-text('{assignment.skill_group}')").first
                    await skill_opt.wait_for(state="visible", timeout=10000)
                    await skill_opt.click()
                    await asyncio.sleep(0.3)

            # Xác thực số lượng dòng bằng đúng số nhân sự cần phân
            final_rows_count = await page.locator("button[data-qa='remove-agent']").count()
            if final_rows_count != len(plan.entries):
                raise RuntimeError(
                    f"Số lượng nhân sự phân bổ không khớp: mong đợi {len(plan.entries)}, thực tế {final_rows_count}"
                )

            # 6.3. Nhấn Lưu cấu hình
            logger.info("[3CX_SYNC] Đang lưu cấu hình hàng đợi 3CX...")
            save_btn = page.locator("button#btnSave, button[data-qa='save']").first
            await save_btn.click()
            await page.wait_for_load_state("networkidle", timeout=20000)
            await asyncio.sleep(2)

            # Chụp ảnh xác nhận kết quả
            if screenshot_file_path:
                os.makedirs(os.path.dirname(os.path.abspath(screenshot_file_path)), exist_ok=True)
                await page.screenshot(path=screenshot_file_path, full_page=True)
                logger.info(f"[3CX_SYNC] Đã chụp ảnh xác nhận: {screenshot_file_path}")

            return {
                "status": "SUCCESS",
                "queue_name": plan.queue_name,
                "applied_lines": [e.ext_line for e in plan.entries],
                "count": len(plan.entries),
            }
        finally:
            await context.close()
            await browser.close()


# ==============================================================================
# 6. GỬI EMAIL THÔNG BÁO & CẢNH BÁO LỖI (EMAIL ALERTS)
# ==============================================================================


def send_sync_alert_email(
    subject: str,
    body: str,
    alert_emails: Optional[str] = None,
) -> bool:
    """
    Gửi email thông báo / cảnh báo kết quả đồng bộ Hotline 3CX qua Office365 SMTP.
    Tái sử dụng các hằng số SMTP từ ticket_batch_service.
    """
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    recipients = []
    if alert_emails and alert_emails.strip():
        for e in alert_emails.replace(";", ",").split(","):
            cleaned = e.strip()
            if cleaned and "@" in cleaned:
                recipients.append(cleaned)

    if not recipients:
        recipients = ["dung.nguyenanh@ggg.com.vn"]

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = SMTP_USER
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html", "utf-8"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, recipients, msg.as_string())

        logger.info(f"[3CX_HOTLINE] Đã gửi email cảnh báo tới: {recipients}")
        return True
    except Exception as exc:
        logger.error(f"[3CX_HOTLINE] Lỗi khi gửi email cảnh báo: {exc}")
        return False


# ==============================================================================
# 7. QUẢN LÝ NHẬT KÝ & ĐIỀU PHỐI ĐỒNG BỘ CA TRỰC (RUN SYNC & LOGS)
# ==============================================================================


def has_successful_sync(db: Session, duty_date: date, shift_code: str) -> bool:
    """
    Kiểm tra xem ca trực ngày duty_date đã có bản ghi đồng bộ THÀNH CÔNG THỰC TẾ
    (status='SUCCESS' và KHÔNG PHẢI DRY RUN is_dry_run=False) hay chưa.
    Dùng làm safety guard chống chạy lặp lại các ca đã thành công.
    """
    row = (
        db.query(Hotline3cxSyncLog)
        .filter(
            Hotline3cxSyncLog.duty_date == duty_date,
            Hotline3cxSyncLog.shift_code == shift_code.upper(),
            Hotline3cxSyncLog.status == "SUCCESS",
            Hotline3cxSyncLog.is_dry_run.is_(False),
        )
        .first()
    )
    return row is not None


def list_sync_logs(db: Session, limit: int = 50) -> List[Hotline3cxSyncLog]:
    """Lấy danh sách nhật ký đồng bộ Hotline 3CX mới nhất."""
    return (
        db.query(Hotline3cxSyncLog)
        .order_by(Hotline3cxSyncLog.id.desc())
        .limit(limit)
        .all()
    )


async def run_shift_sync(
    db: Session,
    duty_date: Optional[date] = None,
    shift_code: Optional[str] = None,
    triggered_by: Optional[str] = "Admin",
    dry_run: bool = False,
    allow_retry: bool = False,
    sync_fn=None,
    sleep_fn=None,
    alert_fn=None,
) -> Hotline3cxSyncLog:
    """
    Điều phối quy trình đồng bộ ca trực Hotline 3CX:
    1. Xác định duty_date và shift_code (mặc định hôm nay, ca sáng nếu < 12h, ca chiều nếu >= 12h).
    2. Tính toán kế hoạch phân ca (resolve_shift_plan). Nếu rỗng (should_skip=True), lưu log SKIPPED, gửi cảnh báo và kết thúc.
    3. Lấy thông tin xác thực runtime 3CX. Nếu thiếu mật khẩu, ghi nhận FAILED và cảnh báo.
    4. Thực thi Playwright worker (sync_fn) với cơ chế Retry tối đa 3 lần (mỗi lần cách 60 giây) khi gặp lỗi Timeout.
    5. Lưu kết quả vào HOTLINE_3CX_SYNC_LOGS (SUCCESS / DRY_RUN / FAILED), lưu ảnh chụp màn hình và gửi email thông báo khi lỗi/bỏ qua.
    """
    eff_date = duty_date or date.today()

    if shift_code is None:
        eff_shift = "MORNING" if datetime.now().hour < 12 else "EVENING"
    else:
        eff_shift = shift_code.upper()

    if eff_shift not in ("MORNING", "EVENING"):
        raise ValueError(
            f"Ca trực không hợp lệ: '{shift_code}'. Chỉ chấp nhận 'MORNING' hoặc 'EVENING'."
        )

    # Đọc bản ghi lịch trực và cấu hình singleton
    schedule_row = (
        db.query(Hotline3cxSchedule)
        .filter(Hotline3cxSchedule.duty_date == eff_date)
        .first()
    )
    config = get_or_create_config(db)
    active_mems = list_members(db, active_only=True)
    active_lines = {m.ext_line for m in active_mems}

    # Tính toán kế hoạch phân ca
    plan = resolve_shift_plan(
        eff_date, eff_shift, schedule_row, config, active_lines=active_lines
    )

    # Nếu không có nhân sự trực nào được cấu hình -> Ghi log SKIPPED
    if plan.should_skip:
        now_ts = datetime.now()
        skip_log = Hotline3cxSyncLog(
            duty_date=eff_date,
            shift_code=eff_shift,
            queue_name=plan.queue_name,
            applied_lines_json="[]",
            status="SKIPPED",
            is_dry_run=dry_run,
            triggered_by=triggered_by,
            error_message=plan.skip_reason,
            screenshot_path=None,
            started_at=now_ts,
            finished_at=now_ts,
        )
        db.add(skip_log)
        db.commit()
        db.refresh(skip_log)

        if not dry_run:
            subject = (
                f"[CẢNH BÁO 3CX] Bỏ qua đồng bộ Hotline ca {eff_shift} ngày {eff_date.strftime('%d-%m-%Y')}"
            )
            body = (
                f"<p>Hệ thống tự động bỏ qua đồng bộ vì: <strong>{plan.skip_reason}</strong></p>"
                f"<p>Vui lòng vào màn hình Lịch Trực Hotline 3CX để cập nhật nhân sự phân ca.</p>"
            )
            if alert_fn:
                await alert_fn(subject, body)
            else:
                await asyncio.to_thread(
                    send_sync_alert_email, subject, body, config.alert_emails
                )

        return skip_log

    # Lấy thông tin xác thực portal 3CX
    creds = get_runtime_credentials(db)
    if not creds.password:
        err_msg = "Mật khẩu 3CX chưa được cấu hình trong Hệ Thống hoặc file .env"
        now_ts = datetime.now()
        fail_log = Hotline3cxSyncLog(
            duty_date=eff_date,
            shift_code=eff_shift,
            queue_name=plan.queue_name,
            applied_lines_json=json.dumps(
                [e.ext_line for e in plan.entries], ensure_ascii=False
            ),
            status="FAILED",
            is_dry_run=dry_run,
            triggered_by=triggered_by,
            error_message=err_msg,
            screenshot_path=None,
            started_at=now_ts,
            finished_at=now_ts,
        )
        db.add(fail_log)
        db.commit()
        db.refresh(fail_log)

        if not dry_run:
            subject = (
                f"[LỖI 3CX] Thiếu thông tin xác thực ca {eff_shift} ngày {eff_date.strftime('%d-%m-%Y')}"
            )
            body = f"<p>Lỗi: <strong>{err_msg}</strong></p>"
            if alert_fn:
                await alert_fn(subject, body)
            else:
                await asyncio.to_thread(
                    send_sync_alert_email, subject, body, config.alert_emails
                )

        return fail_log

    # Chuẩn bị đường dẫn ảnh chụp màn hình (static endpoint /uploads/hotline_3cx/)
    filename = (
        f"sync_{eff_date.strftime('%Y%m%d')}_{eff_shift.lower()}_{datetime.now().strftime('%H%M%S')}.png"
    )
    backend_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    abs_screenshot_dir = os.path.join(backend_root, "uploads", "hotline_3cx")
    abs_screenshot_path = os.path.join(abs_screenshot_dir, filename)
    url_screenshot_path = f"/uploads/hotline_3cx/{filename}"

    actual_sync_fn = sync_fn or _playwright_sync_3cx_queue
    max_attempts = 3 if (allow_retry and not dry_run) else 1
    started_at = datetime.now()
    last_error: Optional[Exception] = None

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(
                f"[3CX_SYNC] Bắt đầu đồng bộ ca {eff_shift} ngày {eff_date.strftime('%d-%m-%Y')} (Lần thử {attempt}/{max_attempts})..."
            )
            await actual_sync_fn(
                portal_url=creds.portal_url,
                username=creds.username,
                password=creds.password,
                plan=plan,
                dry_run=dry_run,
                screenshot_file_path=abs_screenshot_path,
            )
            last_error = None
            break
        except Exception as exc:
            last_error = exc
            logger.warning(
                f"[3CX_SYNC] Lần thử {attempt}/{max_attempts} thất bại: {exc}"
            )
            if attempt < max_attempts and _is_timeout_error(exc):
                logger.info("[3CX_SYNC] Tạm dừng 60 giây trước khi thử lại...")
                if sleep_fn:
                    await sleep_fn(60)
                else:
                    await asyncio.sleep(60)
            else:
                break

    finished_at = datetime.now()
    applied_lines = [e.ext_line for e in plan.entries]

    if last_error is not None:
        final_status = "FAILED"
        friendly = format_friendly_error(last_error)
        raw_err = str(last_error).strip()
        if raw_err and raw_err not in friendly:
            final_error_msg = f"{friendly} ({raw_err})"
        else:
            final_error_msg = friendly
    else:
        final_status = "DRY_RUN" if dry_run else "SUCCESS"
        final_error_msg = None

    screenshot_saved = None
    if os.path.isfile(abs_screenshot_path):
        screenshot_saved = url_screenshot_path

    log = Hotline3cxSyncLog(
        duty_date=eff_date,
        shift_code=eff_shift,
        queue_name=plan.queue_name,
        applied_lines_json=json.dumps(applied_lines, ensure_ascii=False),
        status=final_status,
        is_dry_run=dry_run,
        triggered_by=triggered_by,
        error_message=final_error_msg,
        screenshot_path=screenshot_saved,
        started_at=started_at,
        finished_at=finished_at,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # Gửi email cảnh báo khi thất bại thực tế (không phải dry run)
    if final_status == "FAILED" and not dry_run:
        subject = (
            f"[LỖI 3CX] Thất bại đồng bộ Hotline ca {eff_shift} ngày {eff_date.strftime('%d-%m-%Y')}"
        )
        body = (
            f"<p>Quy trình đồng bộ 3CX thất bại sau {max_attempts} lần thử.</p>"
            f"<p>Lỗi chi tiết: <strong>{final_error_msg}</strong></p>"
        )
        if alert_fn:
            await alert_fn(subject, body)
        else:
            await asyncio.to_thread(
                send_sync_alert_email, subject, body, config.alert_emails
            )

    return log
