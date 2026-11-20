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
import hmac
import json
import logging
import os
import re
import secrets
import socket
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.hotline_3cx_auto import (
    Hotline3cxConfig,
    Hotline3cxHoliday,
    Hotline3cxMember,
    Hotline3cxRelayTask,
    Hotline3cxSchedule,
    Hotline3cxSyncLog,
)
from app.schemas.hotline_3cx_auto import (
    Hotline3cxConfigOut,
    Hotline3cxConfigUpdate,
    HotlineHolidayBatchCreateRequest,
    HotlineHolidayItem,
    HotlineMemberCreate,
    HotlineMemberUpdate,
    RelayTaskPayload,
    ResolvedShiftPlan,
    ResolvedUserAssignment,
    ScheduleDayItem,
    ScheduleDayUpsertItem,
)
from app.services.ticket_batch_service import (
    _decode_password,
    _encode_password,
    _is_browser_missing_error,
    _is_timeout_error,
    _setup_playwright_browsers_path,
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
        # Dung == True thay vi .is_(True) vi MSSQL T-SQL khong ho tro cu phap 'IS 1' cho cot BIT
        query = query.filter(Hotline3cxMember.is_active == True)  # noqa: E712
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


def _ensure_relay_token_on_cfg(db: Session, cfg: Hotline3cxConfig) -> str:
    """Đảm bảo cấu hình luôn có sẵn relay_token ngẫu nhiên bảo mật."""
    existing = (getattr(cfg, "relay_token", None) or "").strip()
    if not existing:
        cfg.relay_token = secrets.token_urlsafe(32)
        db.commit()
        db.refresh(cfg)
        return cfg.relay_token
    return existing


def get_or_create_config(db: Session) -> Hotline3cxConfig:
    """Lấy bản ghi cấu hình id=1, nếu chưa có thì tự động tạo mới và sinh relay_token."""
    cfg = db.query(Hotline3cxConfig).filter(Hotline3cxConfig.id == 1).first()
    if not cfg:
        cfg = Hotline3cxConfig(
            id=1,
            execution_mode="DIRECT",
            relay_token=secrets.token_urlsafe(32),
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
        return cfg

    _ensure_relay_token_on_cfg(db, cfg)
    return cfg


def _is_relay_online(cfg: Hotline3cxConfig, max_age_seconds: int = 90) -> bool:
    """Kiểm tra Relay Worker có đang heartbeat gần đây hay không."""
    last_seen = getattr(cfg, "relay_last_seen_at", None)
    if not last_seen:
        return False
    return (datetime.now() - last_seen).total_seconds() <= max_age_seconds


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
        execution_mode=(cfg.execution_mode or "DIRECT").upper(),
        relay_token=cfg.relay_token,
        relay_worker_name=cfg.relay_worker_name,
        relay_last_ip=cfg.relay_last_ip,
        relay_last_seen_at=cfg.relay_last_seen_at,
        relay_online=_is_relay_online(cfg),
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
        "execution_mode",
    ):
        val = getattr(config_in, field, None)
        if val is not None:
            if field == "execution_mode":
                val = str(val).strip().upper()
                if val not in ("DIRECT", "RELAY"):
                    val = "DIRECT"
            setattr(cfg, field, val)

    cfg.updated_at = datetime.now()
    db.commit()
    db.refresh(cfg)
    return cfg


def regenerate_relay_token(db: Session) -> Hotline3cxConfigOut:
    """Tạo mới relay_token bảo mật cho Relay Worker."""
    cfg = get_or_create_config(db)
    cfg.relay_token = secrets.token_urlsafe(32)
    cfg.updated_at = datetime.now()
    db.commit()
    db.refresh(cfg)
    return get_public_config(db)


def verify_relay_token(db: Session, provided_token: Optional[str]) -> bool:
    """Kiểm tra X-Relay-Token gửi từ Relay Worker bằng so sánh an toàn constant-time."""
    if not provided_token or not provided_token.strip():
        return False
    cfg = get_or_create_config(db)
    expected = (cfg.relay_token or "").strip()
    if not expected:
        return False
    return hmac.compare_digest(provided_token.strip(), expected)


# ==============================================================================
# 3. QUẢN LÝ LỊCH TRỰC THEO NGÀY, TUẦN, THÁNG (SCHEDULE GRID & BULK HELPERS)
# ==============================================================================


def get_week_monday(anchor: date) -> date:
    """Tính ngày Thứ Hai đầu tuần tương ứng với ngày anchor (anchor.weekday(): 0=Mon..6=Sun)."""
    return anchor - timedelta(days=anchor.weekday())


def compute_effective_mode(
    duty_date: date,
    shift_mode: str,
    holiday_dates: Optional[Set[date]] = None,
) -> str:
    """
    Xác định chế độ phân ca thực tế: WEEKDAY (ngày thường) hoặc WEEKEND (cuối tuần / lễ).
    - Nếu shift_mode ép cụ thể là WEEKDAY hoặc WEEKEND -> ưu tiên theo chỉ định.
    - Nếu là AUTO: ngày nằm trong HOTLINE_3CX_HOLIDAYS hoặc Thứ Bảy (6) / Chủ Nhật (7) -> WEEKEND.
    """
    if shift_mode in ("WEEKDAY", "WEEKEND"):
        return shift_mode
    if holiday_dates and duty_date in holiday_dates:
        return "WEEKEND"
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


def get_holiday_map(
    db: Session,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> Dict[date, Hotline3cxHoliday]:
    """Lấy map {holiday_date: Hotline3cxHoliday} trong khoảng ngày (hoặc toàn bộ nếu không truyền)."""
    query = db.query(Hotline3cxHoliday)
    if start_date is not None:
        query = query.filter(Hotline3cxHoliday.holiday_date >= start_date)
    if end_date is not None:
        query = query.filter(Hotline3cxHoliday.holiday_date <= end_date)
    rows = query.order_by(Hotline3cxHoliday.holiday_date.asc()).all()
    return {r.holiday_date: r for r in rows}


def _build_holiday_item(
    row: Hotline3cxHoliday,
    sched_map: Dict[date, Hotline3cxSchedule],
) -> HotlineHolidayItem:
    """Đóng gói một bản ghi Hotline3cxHoliday kèm thứ và nhân sự 06:00 (nếu có)."""
    sched = sched_map.get(row.holiday_date)
    weekend_lines = _parse_json_lines(sched.weekend_lines_json) if sched else []
    return HotlineHolidayItem(
        id=row.id,
        holiday_date=row.holiday_date,
        name=row.name or "",
        weekday_label=WEEKDAY_NAMES.get(row.holiday_date.isoweekday(), ""),
        weekend_lines=weekend_lines,
        created_by=row.created_by,
        created_at=row.created_at,
    )


def list_holidays(db: Session, year: Optional[int] = None) -> List[HotlineHolidayItem]:
    """Liệt kê danh sách Ngày Lễ Riêng (tùy chọn lọc theo năm) kèm nhân sự ca lễ đang gán."""
    query = db.query(Hotline3cxHoliday)
    if year is not None:
        query = query.filter(
            Hotline3cxHoliday.holiday_date >= date(year, 1, 1),
            Hotline3cxHoliday.holiday_date <= date(year, 12, 31),
        )
    rows = query.order_by(Hotline3cxHoliday.holiday_date.asc()).all()
    if not rows:
        return []

    dates = [r.holiday_date for r in rows]
    sched_rows = (
        db.query(Hotline3cxSchedule)
        .filter(Hotline3cxSchedule.duty_date.in_(dates))
        .all()
    )
    sched_map = {s.duty_date: s for s in sched_rows}
    return [_build_holiday_item(r, sched_map) for r in rows]


def upsert_holidays_batch(
    db: Session,
    payload: HotlineHolidayBatchCreateRequest,
    created_by: Optional[str] = None,
) -> List[HotlineHolidayItem]:
    """
    Thêm hoặc cập nhật 1 ngày lễ hoặc một khoảng ngày lễ liên tiếp [start_date..end_date].
    Nếu payload.weekend_lines có giá trị, cập nhật luôn danh sách Chính/Phụ 06:00 cho các ngày lễ đó.
    """
    start_d = payload.start_date
    end_d = payload.end_date or payload.start_date
    if end_d < start_d:
        raise ValueError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu.")
    total_days = (end_d - start_d).days + 1
    if total_days > 62:
        raise ValueError("Chỉ được thêm tối đa 62 ngày lễ liên tiếp trong một lần.")

    clean_name = (payload.name or "").strip() or "Nghỉ lễ riêng"
    clean_lines = _clean_lines(payload.weekend_lines or [])
    target_dates = [start_d + timedelta(days=i) for i in range(total_days)]

    existing_hols = (
        db.query(Hotline3cxHoliday)
        .filter(Hotline3cxHoliday.holiday_date.in_(target_dates))
        .all()
    )
    hol_map = {h.holiday_date: h for h in existing_hols}
    saved_hols: List[Hotline3cxHoliday] = []

    for d_val in target_dates:
        existing_h = hol_map.get(d_val)
        if existing_h:
            existing_h.name = clean_name
            saved_hols.append(existing_h)
        else:
            new_h = Hotline3cxHoliday(
                holiday_date=d_val,
                name=clean_name,
                created_by=created_by,
                created_at=datetime.now(),
            )
            db.add(new_h)
            saved_hols.append(new_h)

    existing_scheds = (
        db.query(Hotline3cxSchedule)
        .filter(Hotline3cxSchedule.duty_date.in_(target_dates))
        .all()
    )
    sched_map = {s.duty_date: s for s in existing_scheds}
    now_ts = datetime.now()

    for d_val in target_dates:
        s_row = sched_map.get(d_val)
        if s_row:
            # Nếu trước đó ép WEEKDAY thì mở lại AUTO để nhận diện chế độ ngày lễ
            if s_row.shift_mode == "WEEKDAY":
                s_row.shift_mode = "AUTO"
            if clean_lines:
                s_row.weekend_lines_json = json.dumps(clean_lines, ensure_ascii=False)
                s_row.updated_by = created_by
                s_row.updated_at = now_ts
        elif clean_lines:
            new_s = Hotline3cxSchedule(
                duty_date=d_val,
                shift_mode="AUTO",
                morning_lines_json="[]",
                evening_lines_json="[]",
                weekend_lines_json=json.dumps(clean_lines, ensure_ascii=False),
                weekend_evening_override_json="[]",
                note=clean_name,
                updated_by=created_by,
                updated_at=now_ts,
            )
            db.add(new_s)
            sched_map[d_val] = new_s

    db.commit()
    for h_row in saved_hols:
        db.refresh(h_row)
    return [_build_holiday_item(h_row, sched_map) for h_row in saved_hols]


def delete_holiday(db: Session, holiday_id: int) -> bool:
    """Xóa một Ngày Lễ Riêng theo ID và khôi phục chế độ ngày thường nếu đang ép WEEKEND."""
    row = db.query(Hotline3cxHoliday).filter(Hotline3cxHoliday.id == holiday_id).first()
    if not row:
        return False
    target_date = row.holiday_date
    db.delete(row)

    # Nếu lịch ngày thường T2-T6 từng lưu shift_mode='WEEKEND', đưa về 'AUTO' để tránh kẹt lễ
    if target_date.isoweekday() not in (6, 7):
        sched = (
            db.query(Hotline3cxSchedule)
            .filter(Hotline3cxSchedule.duty_date == target_date)
            .first()
        )
        if sched and sched.shift_mode == "WEEKEND":
            sched.shift_mode = "AUTO"

    db.commit()
    return True


def normalize_backup_hhmm(raw: Optional[str]) -> Optional[str]:
    """
    Chuẩn hóa và kiểm tra giờ hẹn cập nhật Manual Backup theo định dạng 24h HH:mm.
    Trả về None nếu người dùng để trống; ném ValueError nếu sai định dạng.
    """
    if raw is None:
        return None
    cleaned = str(raw).strip()
    if not cleaned:
        return None
    m = re.match(r"^(\d{1,2}):(\d{2})$", cleaned)
    if not m:
        raise ValueError(
            f"Giờ hẹn không hợp lệ: '{cleaned}'. Vui lòng nhập theo định dạng 24h HH:mm (VD: 11:30 hoặc 20:00)."
        )
    hour_val = int(m.group(1))
    min_val = int(m.group(2))
    if not (0 <= hour_val <= 23 and 0 <= min_val <= 59):
        raise ValueError(
            f"Giờ hẹn không hợp lệ: '{cleaned}'. Giờ phải từ 00:00 đến 23:59 (HH:mm)."
        )
    return f"{hour_val:02d}:{min_val:02d}"


def get_schedules_range(db: Session, start_date: date, end_date: date) -> List[ScheduleDayItem]:
    """
    Lấy lưới lịch trực trong khoảng ngày [start_date, end_date] (bao gồm cả 2 đầu mút).
    Tự động kết hợp danh mục Ngày Lễ Riêng (HOTLINE_3CX_HOLIDAYS).
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
    holiday_map = get_holiday_map(db, start_date, end_date)
    holiday_dates = set(holiday_map.keys())

    result: List[ScheduleDayItem] = []
    cur_date = start_date
    delta_one_day = timedelta(days=1)

    while cur_date <= end_date:
        is_wk = cur_date.isoweekday() in (6, 7)
        wk_label = WEEKDAY_NAMES.get(cur_date.isoweekday(), "")
        hol_row = holiday_map.get(cur_date)
        is_hol = hol_row is not None
        hol_name = hol_row.name if hol_row else None

        if cur_date in row_map:
            r = row_map[cur_date]
            eff_mode = compute_effective_mode(cur_date, r.shift_mode, holiday_dates=holiday_dates)
            item = ScheduleDayItem(
                id=r.id,
                duty_date=r.duty_date,
                shift_mode=r.shift_mode,
                morning_lines=_parse_json_lines(r.morning_lines_json),
                evening_lines=_parse_json_lines(r.evening_lines_json),
                weekend_lines=_parse_json_lines(r.weekend_lines_json),
                weekend_evening_override=_parse_json_lines(r.weekend_evening_override_json),
                morning_backup_time=getattr(r, "morning_backup_time", None),
                morning_backup_lines=_parse_json_lines(getattr(r, "morning_backup_lines_json", "[]")),
                evening_backup_time=getattr(r, "evening_backup_time", None),
                evening_backup_lines=_parse_json_lines(getattr(r, "evening_backup_lines_json", "[]")),
                note=r.note,
                weekday_label=wk_label,
                effective_mode=eff_mode,
                is_weekend=is_wk,
                is_custom_holiday=is_hol,
                holiday_name=hol_name,
                updated_by=r.updated_by,
                updated_at=r.updated_at,
            )
        else:
            eff_mode = compute_effective_mode(cur_date, "AUTO", holiday_dates=holiday_dates)
            item = ScheduleDayItem(
                id=None,
                duty_date=cur_date,
                shift_mode="AUTO",
                morning_lines=[],
                evening_lines=[],
                weekend_lines=[],
                weekend_evening_override=[],
                morning_backup_time=None,
                morning_backup_lines=[],
                evening_backup_time=None,
                evening_backup_lines=[],
                note=None,
                weekday_label=wk_label,
                effective_mode=eff_mode,
                is_weekend=is_wk,
                is_custom_holiday=is_hol,
                holiday_name=hol_name,
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
        mb_time = normalize_backup_hhmm(item.morning_backup_time)
        mb_json = json.dumps(item.morning_backup_lines or [], ensure_ascii=False)
        eb_time = normalize_backup_hhmm(item.evening_backup_time)
        eb_json = json.dumps(item.evening_backup_lines or [], ensure_ascii=False)
        now_ts = datetime.now()

        if existing:
            existing.shift_mode = item.shift_mode
            existing.morning_lines_json = morning_json
            existing.evening_lines_json = evening_json
            existing.weekend_lines_json = weekend_json
            existing.weekend_evening_override_json = override_json
            existing.morning_backup_time = mb_time
            existing.morning_backup_lines_json = mb_json
            existing.evening_backup_time = eb_time
            existing.evening_backup_lines_json = eb_json
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
                morning_backup_time=mb_time,
                morning_backup_lines_json=mb_json,
                evening_backup_time=eb_time,
                evening_backup_lines_json=eb_json,
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
    Tương ứng từng ngày T2->T2, T3->T3... CN->CN, đồng thời:
    - Không sao chép nhầm trạng thái WEEKEND của ngày lễ đột xuất tuần trước sang ngày thường tuần mới.
    - Bảo toàn nhân sự trực lễ nếu ngày đích nằm trong danh mục Ngày Lễ Riêng.
    """
    target_monday = get_week_monday(target_week_start)
    target_sunday = target_monday + timedelta(days=6)
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

    target_rows = (
        db.query(Hotline3cxSchedule)
        .filter(
            Hotline3cxSchedule.duty_date >= target_monday,
            Hotline3cxSchedule.duty_date <= target_sunday,
        )
        .all()
    )
    target_existing_map = {r.duty_date: r for r in target_rows}
    target_holidays = set(get_holiday_map(db, target_monday, target_sunday).keys())

    upsert_items: List[ScheduleDayUpsertItem] = []
    for day_offset in range(7):
        p_date = prev_monday + timedelta(days=day_offset)
        t_date = target_monday + timedelta(days=day_offset)
        prev_row = prev_map.get(p_date)
        existing_target = target_existing_map.get(t_date)
        is_target_holiday = t_date in target_holidays

        if prev_row:
            prev_wk_lines = _parse_json_lines(prev_row.weekend_lines_json)
            prev_ov_lines = _parse_json_lines(prev_row.weekend_evening_override_json)
            if is_target_holiday and existing_target:
                ex_wk = _parse_json_lines(existing_target.weekend_lines_json)
                if ex_wk:
                    prev_wk_lines = ex_wk
                    prev_ov_lines = _parse_json_lines(existing_target.weekend_evening_override_json)

            # Không để WEEKEND (lễ đột xuất tuần trước) lây sang T2-T6 tuần mới
            cloned_mode = prev_row.shift_mode
            if is_target_holiday or (cloned_mode == "WEEKEND" and t_date.isoweekday() not in (6, 7)):
                cloned_mode = "AUTO"

            upsert_items.append(
                ScheduleDayUpsertItem(
                    duty_date=t_date,
                    shift_mode=cloned_mode,
                    morning_lines=_parse_json_lines(prev_row.morning_lines_json),
                    evening_lines=_parse_json_lines(prev_row.evening_lines_json),
                    weekend_lines=prev_wk_lines,
                    weekend_evening_override=prev_ov_lines,
                    note=prev_row.note,
                )
            )
        else:
            existing_wk = _parse_json_lines(existing_target.weekend_lines_json) if (is_target_holiday and existing_target) else []
            existing_ov = _parse_json_lines(existing_target.weekend_evening_override_json) if (is_target_holiday and existing_target) else []
            upsert_items.append(
                ScheduleDayUpsertItem(
                    duty_date=t_date,
                    shift_mode="AUTO",
                    morning_lines=[],
                    evening_lines=[],
                    weekend_lines=existing_wk,
                    weekend_evening_override=existing_ov,
                    note=existing_target.note if (is_target_holiday and existing_target) else None,
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
    Khớp từng ngày theo thứ trong tuần (isoweekday 1..7), ĐỒNG THỜI BẢO VỆ các Ngày Lễ Riêng:
    - Không ghi đè thành ngày thường nếu ngày đó nằm trong HOTLINE_3CX_HOLIDAYS.
    - Giữ nguyên danh sách trực lễ đã cấu hình riêng cho ngày lễ đó (nếu chưa có thì gợi ý theo T7/CN mẫu).
    """
    template_by_isoweekday = {item.duty_date.isoweekday(): item for item in template_days}

    # Tìm nhân sự cuối tuần mẫu mặc định (ưu tiên CN rồi T7) để dự phòng nếu ngày lễ chưa chọn người
    default_holiday_lines: List[str] = []
    for wk_day in (7, 6):
        tmpl_wk = template_by_isoweekday.get(wk_day)
        if tmpl_wk and tmpl_wk.weekend_lines:
            default_holiday_lines = list(tmpl_wk.weekend_lines)
            break

    _, total_days_in_month = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, total_days_in_month)

    existing_rows = (
        db.query(Hotline3cxSchedule)
        .filter(
            Hotline3cxSchedule.duty_date >= month_start,
            Hotline3cxSchedule.duty_date <= month_end,
        )
        .all()
    )
    existing_map = {r.duty_date: r for r in existing_rows}
    holiday_dates = set(get_holiday_map(db, month_start, month_end).keys())

    upsert_items: List[ScheduleDayUpsertItem] = []
    for day_num in range(1, total_days_in_month + 1):
        target_date = date(year, month, day_num)
        existing_row = existing_map.get(target_date)
        if not overwrite_existing and existing_row is not None:
            continue

        template_item = template_by_isoweekday.get(target_date.isoweekday())
        if template_item:
            is_hol = target_date in holiday_dates
            if is_hol:
                eff_mode = "AUTO"
                ex_wk = _parse_json_lines(existing_row.weekend_lines_json) if existing_row else []
                ex_ov = _parse_json_lines(existing_row.weekend_evening_override_json) if existing_row else []
                wk_lines = ex_wk if ex_wk else (list(template_item.weekend_lines) or list(default_holiday_lines))
                ov_lines = ex_ov if ex_wk else list(template_item.weekend_evening_override)
            else:
                eff_mode = (
                    "AUTO"
                    if (template_item.shift_mode == "WEEKEND" and target_date.isoweekday() not in (6, 7))
                    else template_item.shift_mode
                )
                wk_lines = list(template_item.weekend_lines)
                ov_lines = list(template_item.weekend_evening_override)

            upsert_items.append(
                ScheduleDayUpsertItem(
                    duty_date=target_date,
                    shift_mode=eff_mode,
                    morning_lines=list(template_item.morning_lines),
                    evening_lines=list(template_item.evening_lines),
                    weekend_lines=wk_lines,
                    weekend_evening_override=ov_lines,
                    note=existing_row.note if (is_hol and existing_row and existing_row.note) else template_item.note,
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
    holiday_dates: Optional[Set[date]] = None,
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
    if shift_code_upper not in ("MORNING", "EVENING", "MORNING_BACKUP", "EVENING_BACKUP"):
        raise ValueError(
            f"shift_code không hợp lệ: '{shift_code}'. Chỉ chấp nhận MORNING, EVENING, MORNING_BACKUP hoặc EVENING_BACKUP."
        )

    # 1. Xác định effective_mode (có xét Ngày Lễ Riêng nếu có)
    raw_shift_mode = schedule_row.shift_mode if schedule_row else "AUTO"
    effective_mode = compute_effective_mode(
        duty_date, raw_shift_mode, holiday_dates=holiday_dates
    )

    # 2. Đọc các mảng line từ bản ghi lịch trực
    if schedule_row:
        morning_raw = _parse_json_lines(schedule_row.morning_lines_json)
        evening_raw = _parse_json_lines(schedule_row.evening_lines_json)
        weekend_raw = _parse_json_lines(schedule_row.weekend_lines_json)
        override_raw = _parse_json_lines(schedule_row.weekend_evening_override_json)
        morning_backup_raw = _parse_json_lines(getattr(schedule_row, "morning_backup_lines_json", "[]"))
        evening_backup_raw = _parse_json_lines(getattr(schedule_row, "evening_backup_lines_json", "[]"))
    else:
        morning_raw, evening_raw, weekend_raw, override_raw = [], [], [], []
        morning_backup_raw, evening_backup_raw = [], []

    morning_lines = _clean_lines(morning_raw, active_lines)
    evening_lines = _clean_lines(evening_raw, active_lines)
    weekend_lines = _clean_lines(weekend_raw, active_lines)
    weekend_override = _clean_lines(override_raw, active_lines)
    morning_backup_lines = _clean_lines(morning_backup_raw, active_lines)
    evening_backup_lines = _clean_lines(evening_backup_raw, active_lines)

    day_queue = (config.day_queue_name or "IT HCM App Day") if config else "IT HCM App Day"
    night_queue = (config.night_queue_name or "IT HCM App Night") if config else "IT HCM App Night"

    entries: List[ResolvedUserAssignment] = []
    queue_name = day_queue
    use_skill_group = False

    # 3. Phân luồng theo ca Backup Manual hoặc ca thường / cuối tuần
    if shift_code_upper == "MORNING_BACKUP":
        if effective_mode == "WEEKDAY":
            queue_name = day_queue
            use_skill_group = False
            entries = [
                ResolvedUserAssignment(ext_line=line, skill_group=None)
                for line in morning_backup_lines
            ]
        else:
            queue_name = night_queue
            use_skill_group = True
            entries = [
                ResolvedUserAssignment(ext_line=line, skill_group=str(idx + 1))
                for idx, line in enumerate(morning_backup_lines)
            ]
    elif shift_code_upper == "EVENING_BACKUP":
        queue_name = night_queue
        use_skill_group = True
        entries = [
            ResolvedUserAssignment(ext_line=line, skill_group=str(idx + 1))
            for idx, line in enumerate(evening_backup_lines)
        ]
    elif effective_mode == "WEEKDAY":
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


def _extract_host_port(portal_url: str) -> Tuple[str, int]:
    """Tách hostname và port mặc định từ URL portal 3CX."""
    parsed = urlparse((portal_url or "").strip())
    host = parsed.hostname or (portal_url or "").strip()
    if parsed.port is not None:
        port = int(parsed.port)
    elif (parsed.scheme or "").lower() == "http":
        port = 80
    else:
        port = 443
    return host, port


def probe_portal_tcp(
    portal_url: str, timeout_sec: float = 3.0
) -> Tuple[Optional[str], bool, Optional[str]]:
    """
    Kiểm tra nhanh DNS và kết nối TCP trực tiếp từ máy chủ tới Portal 3CX.
    Trả về (resolved_ip, direct_tcp_ok, error_detail).
    """
    host, port = _extract_host_port(portal_url)
    if not host:
        return None, False, "Thiếu hostname Portal 3CX"

    resolved_ip: Optional[str] = None
    try:
        resolved_ip = socket.gethostbyname(host)
    except Exception as dns_err:
        return None, False, f"Lỗi phân giải DNS '{host}': {dns_err}"

    try:
        with socket.create_connection((host, port), timeout=timeout_sec):
            return resolved_ip, True, None
    except Exception as tcp_err:
        return resolved_ip, False, str(tcp_err)


def format_3cx_sync_error(
    exc: Exception,
    portal_url: str = "",
    probe_result: Optional[Tuple[Optional[str], bool, Optional[str]]] = None,
) -> str:
    """
    Định dạng thông báo lỗi chẩn đoán chính xác cho phân hệ 3CX (không dùng chuỗi 600s gây hiểu nhầm).
    """
    raw = str(exc).strip()
    low = raw.lower()
    err_type = type(exc).__name__.lower()

    if "err_connection_timed_out" in low or "err_timed_out" in low or "err_proxy" in low:
        host, port = _extract_host_port(portal_url)
        ip_info = ""
        tcp_hint = ""
        if probe_result is not None:
            resolved_ip, direct_ok, _ = probe_result
            if resolved_ip:
                ip_info = f" -> {resolved_ip}:{port}"
            if direct_ok:
                tcp_hint = (
                    " (Kết nối TCP trực tiếp từ Python THÀNH CÔNG nhưng trình duyệt bị nghẽn — "
                    "hãy kiểm tra System Proxy/Firewall cho Chromium trên máy chủ)"
                )
            else:
                tcp_hint = (
                    " — Máy chủ Backend hiện không thông cổng mạng này. Vui lòng kiểm tra trên Server: "
                    f"(1) Mở Firewall Outbound TCP port {port}, "
                    "(2) Nếu Server cùng Datacenter với tổng đài 3CX bị chặn NAT Loopback hãy đổi 'URL Portal 3CX' ở tab Cấu Hình sang IP nội bộ hoặc trỏ file hosts, "
                    f"(3) Kiểm tra proxy chặn cổng {port}"
                )
        return (
            f"Không thể kết nối TCP tới Portal 3CX ({host}:{port}{ip_info}) từ máy chủ Backend"
            f"{tcp_hint}."
        )

    if _is_browser_missing_error(exc):
        return (
            "Server chưa cài đặt Chromium cho Playwright. Vui lòng chạy install_playwright_server.bat "
            "hoặc đảm bảo Server có sẵn Microsoft Edge / Chrome."
        )

    if _is_timeout_error(exc) or "timeout" in err_type:
        return (
            "Quá thời gian chờ phản hồi từ Portal 3CX (60 giây). "
            "Vui lòng kiểm tra tốc độ mạng hoặc đường dẫn Portal 3CX trong tab Cấu Hình."
        )

    return raw or type(exc).__name__


async def _safe_wait_network_idle_3cx(page, timeout_ms: int = 15000) -> None:
    """Chờ networkidle an toàn cho trang Angular 3CX, không làm sập phiên nếu WebSocket giữ kết nối."""
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=min(timeout_ms, 10000))
    except Exception:
        pass
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except Exception:
        pass


async def _create_3cx_browser_context(playwright_instance, bypass_proxy: bool = False):
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
    if bypass_proxy:
        chromium_args.append("--no-proxy-server")

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
        browser, context = await _create_3cx_browser_context(p, bypass_proxy=False)
        page = await context.new_page()
        try:
            # 1. Điều hướng và Đăng nhập (dùng domcontentloaded để không kẹt WebSocket 3CX)
            logger.info(f"[3CX_SYNC] Đang kết nối tới portal 3CX: {portal_url}")
            try:
                await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            except Exception as nav_err:
                nav_low = str(nav_err).lower()
                if (
                    "err_connection_timed_out" in nav_low
                    or "err_timed_out" in nav_low
                    or "err_proxy" in nav_low
                ):
                    _, direct_ok, _ = await asyncio.to_thread(probe_portal_tcp, portal_url, 3.0)
                    if direct_ok:
                        logger.warning(
                            "[3CX_SYNC] Trình duyệt mặc định nghẽn kết nối dù TCP trực tiếp thông -> thử lại với --no-proxy-server"
                        )
                        try:
                            await context.close()
                        except Exception:
                            pass
                        try:
                            await browser.close()
                        except Exception:
                            pass
                        browser, context = await _create_3cx_browser_context(p, bypass_proxy=True)
                        page = await context.new_page()
                        await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
                    else:
                        raise
                else:
                    raise

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
            await _safe_wait_network_idle_3cx(page, 15000)

            call_handling_link = page.locator("a:has-text('Call Handling')").first
            await call_handling_link.wait_for(state="visible", timeout=15000)
            await call_handling_link.click()
            await _safe_wait_network_idle_3cx(page, 15000)

            # 3. Mở hàng đợi tương ứng (0006 cho Day, 0007 cho Night)
            logger.info(f"[3CX_SYNC] Tìm kiếm hàng đợi '{plan.queue_name}'...")
            fallback_code = "0006" if "day" in plan.queue_name.lower() else "0007"
            # Cho bang queue Angular render xong truoc khi loc ten/ma hang doi
            await page.locator("tr.clickable, table tbody tr").first.wait_for(state="visible", timeout=15000)
            queue_row = page.locator(f"tr:has-text('{plan.queue_name}')").first
            try:
                await queue_row.wait_for(state="visible", timeout=5000)
            except Exception:
                # Fallback theo mã hàng đợi 0006 hoặc 0007
                queue_row = page.locator(f"tr:has-text('{fallback_code}')").first
                await queue_row.wait_for(state="visible", timeout=15000)

            await queue_row.click()
            await page.locator("button[data-qa='back-btn']").wait_for(state="visible", timeout=15000)
            await _safe_wait_network_idle_3cx(page, 15000)

            # 4. Chuyển sang tab Users BEN TRONG chi tiet Queue (khong dung a:has-text('Users') de tranh bam nham sidebar #/office/users)
            users_tab = page.locator(
                "a#users-link[role='tab'], ul.nav-tabs a#users-link, [role='tab']:has-text('Users')"
            ).first
            await users_tab.wait_for(state="visible", timeout=15000)
            await users_tab.click()
            users_panel = page.locator("div.tab-pane.active[role='tabpanel'], [role='tabpanel'][aria-labelledby='users-link']").first
            await users_panel.locator("[data-qa='add-agent'] button").wait_for(state="visible", timeout=15000)
            await asyncio.sleep(0.5)

            # Thu thập danh sách user hiện tại ben trong tabpanel Users của Queue
            existing_user_elems = await users_panel.locator("button[data-qa='remove-agent']").all()
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
            trash_loc = users_panel.locator("button[data-qa='remove-agent']")
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
            add_btn = users_panel.locator("[data-qa='add-agent'] button, button:has-text('Add User')").first
            for idx, assignment in enumerate(plan.entries):
                logger.info(f"[3CX_SYNC] Thêm nhân sự [{idx + 1}/{len(plan.entries)}]: máy nhánh {assignment.ext_line}, Skill Group {assignment.skill_group}")
                await add_btn.click()
                await asyncio.sleep(0.5)

                # Dòng mới thêm vào nằm ở cuối danh sách UserListItem ben trong users_panel
                new_row = users_panel.locator(".queueAgent.cdk-drag, [id^='UserListItem']").last
                user_input = new_row.locator("app-dn-select input[role='combobox']").first
                await user_input.wait_for(state="visible", timeout=10000)
                await user_input.fill(assignment.ext_line)
                await asyncio.sleep(0.6)

                # Chọn kết quả tìm kiếm đúng mã line bên trong ng-dropdown-panel:
                # Ưu tiên [data-qa='peer-number'] (tránh lỗi \b khi 3CX ghép textContent "8778Duy..." không khoảng trắng)
                await page.locator("ng-dropdown-panel .ng-option").first.wait_for(
                    state="visible", timeout=10000
                )
                ext_val = assignment.ext_line
                peer_exact = re.compile(r"^\s*" + re.escape(ext_val) + r"\s*$")
                opt = (
                    page.locator("ng-dropdown-panel .ng-option")
                    .filter(has=page.locator("[data-qa='peer-number']", has_text=peer_exact))
                    .first
                )
                if await opt.count() == 0:
                    fallback_pat = re.compile(r"^\s*" + re.escape(ext_val) + r"(?:\D|$)")
                    opt = (
                        page.locator("ng-dropdown-panel .ng-option")
                        .filter(has_text=fallback_pat)
                        .first
                    )
                await opt.wait_for(state="visible", timeout=10000)
                await opt.click()
                await asyncio.sleep(0.3)

                # Nếu hàng đợi sử dụng Skill Group (chế độ ca chiều / cuối tuần)
                if plan.use_skill_group and assignment.skill_group:
                    skill_select = new_row.locator("ng-select[bindvalue='value']").first
                    await skill_select.wait_for(state="visible", timeout=10000)
                    await skill_select.click()
                    await asyncio.sleep(0.3)
                    skill_pattern = re.compile(rf"^\s*{re.escape(str(assignment.skill_group))}\s*$")
                    skill_opt = page.locator("ng-dropdown-panel .ng-option").filter(has_text=skill_pattern).first
                    await skill_opt.wait_for(state="visible", timeout=10000)
                    await skill_opt.click()
                    await asyncio.sleep(0.3)

            # Xác thực số lượng dòng bằng đúng số nhân sự cần phân
            final_rows_count = await users_panel.locator("button[data-qa='remove-agent']").count()
            if final_rows_count != len(plan.entries):
                raise RuntimeError(
                    f"Số lượng nhân sự phân bổ không khớp: mong đợi {len(plan.entries)}, thực tế {final_rows_count}"
                )

            # 6.3. Nhấn Lưu cấu hình (chỉ click khi nút Save không bị disabled)
            logger.info("[3CX_SYNC] Đang lưu cấu hình hàng đợi 3CX...")
            save_btn = page.locator("button#btnSave, button[data-qa='save']").first
            await asyncio.sleep(0.5)
            if await save_btn.is_enabled():
                await save_btn.click()
                await _safe_wait_network_idle_3cx(page, 15000)
                await asyncio.sleep(2)
            else:
                logger.info("[3CX_SYNC] Nút Save đang tắt (danh sách giống hiện tại), bỏ qua click Save")

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


def _get_hotline_upload_dir() -> str:
    """Trả về đường dẫn thư mục lưu ảnh chụp đồng bộ 3CX (tĩnh tại /uploads/hotline_3cx)."""
    backend_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    return os.path.join(backend_root, "uploads", "hotline_3cx")


def has_pending_relay_sync(db: Session, duty_date: date, shift_code: str) -> bool:
    """Kiểm tra có tác vụ Relay thực tế (không phải dry_run) đang chờ/chạy cho ca này không."""
    row = (
        db.query(Hotline3cxRelayTask)
        .filter(
            Hotline3cxRelayTask.duty_date == duty_date,
            Hotline3cxRelayTask.shift_code == shift_code.upper(),
            Hotline3cxRelayTask.status.in_(["PENDING", "RUNNING"]),
            # Dung == False thay vi .is_(False) vi MSSQL T-SQL khong ho tro 'IS 0' cho cot BIT
            Hotline3cxRelayTask.is_dry_run == False,  # noqa: E712
        )
        .first()
    )
    return row is not None


def record_relay_heartbeat(
    db: Session,
    worker_name: str,
    client_ip: Optional[str] = None,
) -> Hotline3cxConfig:
    """Ghi nhận tín hiệu hoạt động gần nhất từ 3CX Sync Relay Worker."""
    cfg = get_or_create_config(db)
    clean_worker = (worker_name or "3CX-Relay-PC").strip()[:150] or "3CX-Relay-PC"
    clean_ip = (client_ip or "").strip()[:60] or None
    cfg.relay_worker_name = clean_worker
    if clean_ip:
        cfg.relay_last_ip = clean_ip
    cfg.relay_last_seen_at = datetime.now()
    db.commit()
    db.refresh(cfg)
    return cfg


def expire_stale_relay_tasks(
    db: Session,
    timeout_minutes: int = 15,
    alert_fn=None,
) -> int:
    """
    Đánh dấu TIMEOUT cho các task Relay bị kẹt quá timeout_minutes (mặc định 15 phút),
    đồng thời cập nhật Hotline3cxSyncLog thành FAILED và gửi email cảnh báo nếu là ca chạy thật.
    """
    now_ts = datetime.now()
    cutoff = now_ts - timedelta(minutes=timeout_minutes)
    active_tasks = (
        db.query(Hotline3cxRelayTask)
        .filter(Hotline3cxRelayTask.status.in_(["PENDING", "RUNNING"]))
        .all()
    )
    expired_items: List[Hotline3cxRelayTask] = []
    for task in active_tasks:
        ref_time = task.claimed_at or task.created_at
        if ref_time and ref_time < cutoff:
            expired_items.append(task)

    if not expired_items:
        return 0

    cfg = get_or_create_config(db)
    err_msg = (
        f"Không thấy 3CX Relay Worker online hoặc phản hồi kết quả sau {timeout_minutes} phút."
    )

    for task in expired_items:
        task.status = "TIMEOUT"
        task.finished_at = now_ts
        task.error_message = err_msg
        if task.sync_log_id:
            sync_log = (
                db.query(Hotline3cxSyncLog)
                .filter(Hotline3cxSyncLog.id == task.sync_log_id)
                .first()
            )
            if sync_log and sync_log.status in ("PENDING", "RUNNING"):
                sync_log.status = "FAILED"
                sync_log.error_message = err_msg
                sync_log.finished_at = now_ts

    db.commit()

    for task in expired_items:
        if not task.is_dry_run:
            subject = (
                f"[LỖI 3CX] Relay Worker quá hạn đồng bộ ca {task.shift_code} "
                f"ngày {task.duty_date.strftime('%d-%m-%Y')}"
            )
            body = (
                f"<p><strong>{err_msg}</strong></p>"
                f"<p>Hàng đợi: {task.queue_name}. Vui lòng kiểm tra PC chạy 3CX Relay Worker.</p>"
            )
            if alert_fn:
                alert_fn(subject, body, cfg.alert_emails)
            else:
                send_sync_alert_email(subject, body, cfg.alert_emails)

    return len(expired_items)


def claim_next_relay_task(
    db: Session,
    worker_name: str,
    client_ip: Optional[str] = None,
) -> Optional[RelayTaskPayload]:
    """
    Nhận nguyên tử (atomic claim) tác vụ PENDING cũ nhất giao cho Relay Worker.
    Chống trùng lặp khi có nhiều Worker cùng poll đồng thời.
    """
    record_relay_heartbeat(db, worker_name=worker_name, client_ip=client_ip)
    expire_stale_relay_tasks(db, timeout_minutes=15)

    clean_worker = (worker_name or "3CX-Relay-PC").strip()[:150] or "3CX-Relay-PC"
    for _ in range(3):
        candidate = (
            db.query(Hotline3cxRelayTask)
            .filter(Hotline3cxRelayTask.status == "PENDING")
            .order_by(Hotline3cxRelayTask.id.asc())
            .first()
        )
        if not candidate:
            return None

        now_ts = datetime.now()
        updated = (
            db.query(Hotline3cxRelayTask)
            .filter(
                Hotline3cxRelayTask.id == candidate.id,
                Hotline3cxRelayTask.status == "PENDING",
            )
            .update(
                {
                    "status": "RUNNING",
                    "worker_name": clean_worker,
                    "claimed_at": now_ts,
                },
                synchronize_session=False,
            )
        )
        db.commit()
        if updated != 1:
            continue

        if candidate.sync_log_id:
            sync_log = (
                db.query(Hotline3cxSyncLog)
                .filter(Hotline3cxSyncLog.id == candidate.sync_log_id)
                .first()
            )
            if sync_log and sync_log.status == "PENDING":
                sync_log.status = "RUNNING"
                db.commit()

        plan = ResolvedShiftPlan.model_validate_json(candidate.plan_json)
        creds = get_runtime_credentials(db)
        return RelayTaskPayload(
            task_id=candidate.id,
            duty_date=candidate.duty_date,
            shift_code=candidate.shift_code,
            queue_name=candidate.queue_name,
            is_dry_run=bool(candidate.is_dry_run),
            portal_url=creds.portal_url,
            username=creds.username,
            password=creds.password,
            plan=plan,
        )

    return None


def report_relay_task_result(
    db: Session,
    task_id: int,
    status_str: str,
    worker_name: str = "3CX-Relay-PC",
    applied_lines_json: Optional[str] = None,
    error_message: Optional[str] = None,
    screenshot_bytes: Optional[bytes] = None,
    alert_fn=None,
) -> Tuple[Hotline3cxRelayTask, Optional[str]]:
    """
    Lưu kết quả thực thi từ Relay Worker (SUCCESS / DRY_RUN / FAILED),
    lưu ảnh PNG đính kèm và cập nhật Hotline3cxSyncLog tương ứng.
    """
    task = (
        db.query(Hotline3cxRelayTask)
        .filter(Hotline3cxRelayTask.id == task_id)
        .first()
    )
    if not task:
        raise ValueError(f"Không tìm thấy tác vụ Relay ID={task_id}.")

    final_status = (status_str or "").strip().upper()
    if final_status not in ("SUCCESS", "DRY_RUN", "FAILED"):
        raise ValueError(f"Trạng thái báo cáo không hợp lệ: '{status_str}'.")

    now_ts = datetime.now()
    clean_worker = (worker_name or task.worker_name or "3CX-Relay-PC").strip()[:150]
    clean_err = (error_message or "").strip() or None

    saved_url_path: Optional[str] = None
    if screenshot_bytes and len(screenshot_bytes) > 0:
        if len(screenshot_bytes) > 10 * 1024 * 1024:
            raise ValueError("Dung lượng ảnh chụp màn hình vượt quá 10MB.")
        upload_dir = _get_hotline_upload_dir()
        os.makedirs(upload_dir, exist_ok=True)
        fname = (
            f"relay_{task.duty_date.strftime('%Y%m%d')}_{task.shift_code.lower()}_"
            f"{now_ts.strftime('%H%M%S')}_{task.id}.png"
        )
        abs_path = os.path.join(upload_dir, fname)
        with open(abs_path, "wb") as f_out:
            f_out.write(screenshot_bytes)
        saved_url_path = f"/uploads/hotline_3cx/{fname}"

    task.status = final_status
    task.worker_name = clean_worker
    task.error_message = clean_err
    task.finished_at = now_ts

    cfg = get_or_create_config(db)
    cfg.relay_worker_name = clean_worker
    cfg.relay_last_seen_at = now_ts

    if task.sync_log_id:
        sync_log = (
            db.query(Hotline3cxSyncLog)
            .filter(Hotline3cxSyncLog.id == task.sync_log_id)
            .first()
        )
        if sync_log:
            sync_log.status = final_status
            if applied_lines_json and applied_lines_json.strip():
                sync_log.applied_lines_json = applied_lines_json.strip()
            sync_log.error_message = clean_err
            if saved_url_path:
                sync_log.screenshot_path = saved_url_path
            sync_log.finished_at = now_ts
            orig_trig = (sync_log.triggered_by or "Relay").strip()
            relay_suffix = f"Relay: {clean_worker}"
            if relay_suffix not in orig_trig:
                sync_log.triggered_by = f"{orig_trig} ({relay_suffix})"[:100]

    db.commit()
    db.refresh(task)

    if final_status == "FAILED" and not task.is_dry_run:
        subject = (
            f"[LỖI 3CX] Relay Worker thất bại ca {task.shift_code} "
            f"ngày {task.duty_date.strftime('%d-%m-%Y')}"
        )
        body = (
            f"<p>Relay Worker <strong>{clean_worker}</strong> đồng bộ 3CX thất bại.</p>"
            f"<p>Lỗi chi tiết: <strong>{clean_err or 'Không xác định'}</strong></p>"
        )
        if alert_fn:
            alert_fn(subject, body, cfg.alert_emails)
        else:
            send_sync_alert_email(subject, body, cfg.alert_emails)

    return task, saved_url_path


def get_due_manual_backup_shifts(
    db: Session, target_date: date, current_hhmm: str
) -> List[Tuple[str, str]]:
    """
    Trả về danh sách các mốc hẹn giờ Backup Manual đến hạn lúc current_hhmm trong ngày target_date:
    - ('MORNING_BACKUP', hhmm) nếu có morning_backup_time == current_hhmm và có nhân sự backup sáng.
    - ('EVENING_BACKUP', hhmm) nếu có evening_backup_time == current_hhmm và có nhân sự backup tối.
    """
    row = (
        db.query(Hotline3cxSchedule)
        .filter(Hotline3cxSchedule.duty_date == target_date)
        .first()
    )
    if not row:
        return []

    due: List[Tuple[str, str]] = []
    clean_now = (current_hhmm or "").strip()

    mb_time = (getattr(row, "morning_backup_time", None) or "").strip()
    mb_lines = _clean_lines(_parse_json_lines(getattr(row, "morning_backup_lines_json", "[]")))
    if mb_time and mb_time == clean_now and len(mb_lines) > 0:
        due.append(("MORNING_BACKUP", mb_time))

    eb_time = (getattr(row, "evening_backup_time", None) or "").strip()
    eb_lines = _clean_lines(_parse_json_lines(getattr(row, "evening_backup_lines_json", "[]")))
    if eb_time and eb_time == clean_now and len(eb_lines) > 0:
        due.append(("EVENING_BACKUP", eb_time))

    return due


def has_backup_sync_for_slot(
    db: Session, duty_date: date, shift_code: str, scheduled_hhmm: str
) -> bool:
    """
    Kiểm tra xem mốc hẹn Backup Manual (duty_date, shift_code, scheduled_hhmm) đã chạy thành công
    hoặc đang chờ/chạy qua Relay Worker hay chưa (chống trùng lặp trong cùng phút hẹn,
    nhưng vẫn cho chạy nếu người dùng đổi sang giờ hẹn khác trong cùng ngày).
    """
    slot_tag = f"({scheduled_hhmm})"
    shift_up = shift_code.upper()

    logs = (
        db.query(Hotline3cxSyncLog)
        .filter(
            Hotline3cxSyncLog.duty_date == duty_date,
            Hotline3cxSyncLog.shift_code == shift_up,
            Hotline3cxSyncLog.status.in_(["SUCCESS", "PENDING", "RUNNING"]),
            # Dung == False thay vi .is_(False) vi MSSQL T-SQL khong ho tro 'IS 0' cho cot BIT
            Hotline3cxSyncLog.is_dry_run == False,  # noqa: E712
        )
        .all()
    )
    for item in logs:
        if slot_tag in (item.triggered_by or ""):
            return True

    tasks = (
        db.query(Hotline3cxRelayTask)
        .filter(
            Hotline3cxRelayTask.duty_date == duty_date,
            Hotline3cxRelayTask.shift_code == shift_up,
            Hotline3cxRelayTask.status.in_(["PENDING", "RUNNING", "SUCCESS"]),
            Hotline3cxRelayTask.is_dry_run == False,  # noqa: E712
        )
        .all()
    )
    for task in tasks:
        if slot_tag in (task.triggered_by or ""):
            return True

    return False


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
            # Dung == False thay vi .is_(False) vi MSSQL T-SQL khong ho tro 'IS 0' cho cot BIT
            Hotline3cxSyncLog.is_dry_run == False,  # noqa: E712
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


def cancel_pending_sync_log(
    db: Session,
    log_id: int,
    cancelled_by: str = "Admin",
) -> Optional[Hotline3cxSyncLog]:
    """Hủy một lệnh đồng bộ đang kẹt ở trạng thái PENDING / RUNNING trong hàng chờ."""
    log = (
        db.query(Hotline3cxSyncLog)
        .filter(Hotline3cxSyncLog.id == log_id)
        .first()
    )
    if not log:
        return None
    if log.status not in ("PENDING", "RUNNING"):
        raise ValueError("Chỉ có thể hủy các tác vụ đang ở trạng thái Chờ Relay hoặc Đang chạy.")

    now_ts = datetime.now()
    reason = f"Đã hủy lệnh chờ thủ công bởi {cancelled_by}."
    log.status = "CANCELLED"
    log.finished_at = now_ts
    log.error_message = reason

    relay_tasks = (
        db.query(Hotline3cxRelayTask)
        .filter(
            Hotline3cxRelayTask.sync_log_id == log.id,
            Hotline3cxRelayTask.status.in_(["PENDING", "RUNNING"]),
        )
        .all()
    )
    for task in relay_tasks:
        task.status = "CANCELLED"
        task.finished_at = now_ts
        task.error_message = reason

    db.commit()
    db.refresh(log)
    return log


def cancel_all_pending_sync_logs(
    db: Session,
    cancelled_by: str = "Admin",
) -> int:
    """Hủy toàn bộ các lệnh đồng bộ đang ở trạng thái PENDING / RUNNING trong hàng chờ."""
    now_ts = datetime.now()
    reason = f"Đã hủy hàng loạt lệnh chờ thủ công bởi {cancelled_by}."

    active_logs = (
        db.query(Hotline3cxSyncLog)
        .filter(Hotline3cxSyncLog.status.in_(["PENDING", "RUNNING"]))
        .all()
    )
    for log in active_logs:
        log.status = "CANCELLED"
        log.finished_at = now_ts
        log.error_message = reason

    active_tasks = (
        db.query(Hotline3cxRelayTask)
        .filter(Hotline3cxRelayTask.status.in_(["PENDING", "RUNNING"]))
        .all()
    )
    for task in active_tasks:
        task.status = "CANCELLED"
        task.finished_at = now_ts
        task.error_message = reason

    count = max(len(active_logs), len(active_tasks))
    if active_logs or active_tasks:
        db.commit()
    return count


async def run_shift_sync(
    db: Session,
    duty_date: Optional[date] = None,
    shift_code: Optional[str] = None,
    triggered_by: Optional[str] = "Admin",
    dry_run: bool = False,
    allow_retry: bool = False,
    force_direct: bool = False,
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

    if eff_shift not in ("MORNING", "EVENING", "MORNING_BACKUP", "EVENING_BACKUP"):
        raise ValueError(
            f"Ca trực không hợp lệ: '{shift_code}'. Chỉ chấp nhận MORNING, EVENING, MORNING_BACKUP hoặc EVENING_BACKUP."
        )

    # Đọc bản ghi lịch trực, ngày lễ riêng và cấu hình singleton
    schedule_row = (
        db.query(Hotline3cxSchedule)
        .filter(Hotline3cxSchedule.duty_date == eff_date)
        .first()
    )
    holiday_dates = set(get_holiday_map(db, eff_date, eff_date).keys())
    config = get_or_create_config(db)
    active_mems = list_members(db, active_only=True)
    active_lines = {m.ext_line for m in active_mems}

    # Tính toán kế hoạch phân ca
    plan = resolve_shift_plan(
        eff_date,
        eff_shift,
        schedule_row,
        config,
        active_lines=active_lines,
        holiday_dates=holiday_dates,
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

    # Nếu cấu hình ở chế độ RELAY và không yêu cầu ép chạy trực tiếp (force_direct) -> đẩy vào hàng đợi Relay
    if not force_direct and (config.execution_mode or "DIRECT").upper() == "RELAY":
        now_ts = datetime.now()
        applied_lines = [e.ext_line for e in plan.entries]
        queued_log = Hotline3cxSyncLog(
            duty_date=eff_date,
            shift_code=eff_shift,
            queue_name=plan.queue_name,
            applied_lines_json=json.dumps(applied_lines, ensure_ascii=False),
            status="PENDING",
            is_dry_run=dry_run,
            triggered_by=triggered_by,
            error_message=None,
            screenshot_path=None,
            started_at=now_ts,
            finished_at=None,
        )
        db.add(queued_log)
        db.flush()

        relay_task = Hotline3cxRelayTask(
            duty_date=eff_date,
            shift_code=eff_shift,
            queue_name=plan.queue_name,
            is_dry_run=dry_run,
            triggered_by=triggered_by,
            plan_json=plan.model_dump_json(),
            status="PENDING",
            sync_log_id=queued_log.id,
            created_at=now_ts,
        )
        db.add(relay_task)
        db.commit()
        db.refresh(queued_log)
        logger.info(
            "[3CX_RELAY] Đã đưa lệnh đồng bộ ca %s ngày %s vào hàng đợi Relay Worker (task_id=%s, log_id=%s)",
            eff_shift,
            eff_date.strftime("%d-%m-%Y"),
            relay_task.id,
            queued_log.id,
        )
        return queued_log

    filename = (
        f"sync_{eff_date.strftime('%Y%m%d')}_{eff_shift.lower()}_{datetime.now().strftime('%H%M%S')}.png"
    )
    abs_screenshot_dir = _get_hotline_upload_dir()
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
        probe_res = None
        err_low = str(last_error).lower()
        if _is_timeout_error(last_error) or "err_connection" in err_low or "err_proxy" in err_low:
            probe_res = await asyncio.to_thread(probe_portal_tcp, creds.portal_url, 3.0)
        friendly = format_3cx_sync_error(
            last_error, portal_url=creds.portal_url, probe_result=probe_res
        )
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
