from __future__ import annotations

import io
import json
import math
import os
import re
from typing import Optional, List, Dict, Any, Set
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, and_, desc, asc, cast, UnicodeText, case
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.memo import Memo, MemoTemplateConfig, MemoTemplateBrand
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.memo import (
    MemoItem,
    MemoCreate,
    MemoUpdate,
    MemoGiaHan,
    MemoStats,
    MemoListResponse,
    NextItSetupResponse,
    RoundRobinUserItem,
    RoundRobinConfigResponse,
    RoundRobinConfigUpdate,
)


def get_memo_stats(db: Session) -> MemoStats:
    """
    Thống kê tổng số lượng Memo theo trạng thái và gia hạn (tối ưu gộp 1 query duy nhất).
    """
    base_where = or_(Memo.active == True, Memo.active == None)

    row = db.execute(
        select(
            func.count(Memo.id).label("total"),
            func.sum(case((or_(Memo.trangthai != "2", Memo.trangthai == None), 1), else_=0)).label("cho_setup"),
            func.sum(case((Memo.trangthai == "1", 1), else_=0)).label("da_setup_nhap"),
            func.sum(case((Memo.trangthai == "2", 1), else_=0)).label("da_public"),
            func.sum(case((or_(Memo.trangthai == "4", Memo.trangthai == "bo_sung"), 1), else_=0)).label("bo_sung"),
            func.sum(
                case(
                    (or_(Memo.giahan == "1", Memo.giahan == "True", Memo.giahan == "TRUE"), 1),
                    else_=0,
                )
            ).label("gia_han"),
        ).where(base_where)
    ).first()

    return MemoStats(
        total=int(row.total or 0) if row else 0,
        cho_setup=int(row.cho_setup or 0) if row else 0,
        da_setup_nhap=int(row.da_setup_nhap or 0) if row else 0,
        da_public=int(row.da_public or 0) if row else 0,
        gia_han=int(row.gia_han or 0) if row else 0,
        bo_sung=int(row.bo_sung or 0) if row else 0,
    )


def get_memo_list(
    db: Session,
    search: Optional[str] = None,
    trangthai: Optional[str] = None,
    it_setup: Optional[str] = None,
    giahan: Optional[str] = None,
    tungay: Optional[date] = None,
    denngay: Optional[date] = None,
    page: int = 1,
    page_size: int = 50,
) -> MemoListResponse:
    """
    Lấy danh sách Memo có phân trang, tìm kiếm và lọc trạng thái.
    """
    base_where = [or_(Memo.active == True, Memo.active == None)]

    if search:
        s = f"%{search.strip()}%"
        base_where.append(Memo.ma_memo.like(s))

    if trangthai and trangthai != "ALL":
        if trangthai in ["0", "pending", "cho_setup"]:
            # Quy chuẩn: Chờ setup bao gồm setup nháp (1), bổ sung nút bấm (4), gia hạn... tức là mọi memo chưa chuyển về Đã Public (2)
            base_where.append(or_(Memo.trangthai != "2", Memo.trangthai == None))
        elif trangthai == "4" or trangthai == "bo_sung":
            base_where.append(or_(Memo.trangthai == "4", Memo.trangthai == "bo_sung"))
        else:
            base_where.append(Memo.trangthai == trangthai.strip())

    if it_setup and it_setup != "ALL":
        base_where.append(Memo.it_setup.like(f"%{it_setup.strip()}%"))

    if giahan and giahan != "ALL":
        if giahan == "1":
            base_where.append(or_(Memo.giahan == "1", Memo.giahan == "True", Memo.giahan == "TRUE"))
        else:
            base_where.append(or_(Memo.giahan == "0", Memo.giahan == "False", Memo.giahan == "FALSE", Memo.giahan == None))

    if tungay:
        base_where.append(Memo.ngay_batdau >= tungay)

    if denngay:
        base_where.append(Memo.ngay_ketthuc <= denngay)

    where_clause = and_(*base_where)

    # Đếm tổng
    total = db.scalar(select(func.count(Memo.id)).where(where_clause)) or 0

    # Phân trang
    offset = (page - 1) * page_size
    stmt = (
        select(Memo)
        .where(where_clause)
        .order_by(desc(Memo.ngay_insert), desc(Memo.id))
        .offset(offset)
        .limit(page_size)
    )
    items = db.scalars(stmt).all()

    stats = get_memo_stats(db)

    return MemoListResponse(
        items=[MemoItem.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        stats=stats,
    )


def get_memo_by_id(db: Session, memo_id: int) -> Optional[Memo]:
    return db.scalar(
        select(Memo).where(
            and_(Memo.id == memo_id, or_(Memo.active == True, Memo.active == None))
        )
    )


def get_app_users(db: Session) -> List[Dict[str, Any]]:
    """
    Lấy danh sách người dùng App active từ dbo.LIST_USER (phanquyen = '2' hoặc 'app').
    """
    stmt = (
        select(User.id, User.user_name1, User.full_name)
        .where(
            and_(
                func.lower(func.trim(User.phanquyen)).in_(["2", "app"]),
                or_(User.active == True, User.active == None),
                User.user_name1 != "test",
            )
        )
        .order_by(asc(User.id))
    )
    rows = db.execute(stmt).all()
    result = []
    for r in rows:
        result.append({
            "id": r[0],
            "username": (r[1] or "").strip(),
            "full_name": (r[2] or "").strip(),
            "label": f"{r[2].strip()} ({r[1].strip()})" if r[2] else r[1].strip()
        })
    return result


def get_round_robin_excluded_users(db: Session) -> Set[str]:
    """
    Lấy danh sách các username bị loại trừ khỏi vòng xoay từ MEMO_TEMPLATE_CONFIG.
    """
    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_round_robin_excluded"
        )
    )
    if cfg and cfg.config_val:
        try:
            items = json.loads(cfg.config_val)
            if isinstance(items, list):
                return set(str(u).strip().lower() for u in items)
        except Exception:
            pass
    return set()


def get_round_robin_config(db: Session) -> RoundRobinConfigResponse:
    """
    Lấy danh sách tất cả nhân sự App (phanquyen = '2') và trạng thái xoay vòng của từng người.
    """
    excluded = get_round_robin_excluded_users(db)
    stmt = (
        select(User.id, User.user_name1, User.full_name)
        .where(
            and_(
                func.lower(func.trim(User.phanquyen)).in_(["2", "app"]),
                or_(User.active == True, User.active == None),
                User.user_name1 != "test",
            )
        )
        .order_by(asc(User.id))
    )
    rows = db.execute(stmt).all()
    user_items = []
    active_count = 0
    for r in rows:
        uname = (r[1] or "").strip()
        is_active = uname.lower() not in excluded
        if is_active:
            active_count += 1
        user_items.append(
            RoundRobinUserItem(
                id=r[0],
                username=uname,
                full_name=(r[2] or "").strip() if r[2] else None,
                is_active=is_active,
            )
        )
    return RoundRobinConfigResponse(
        users=user_items,
        total=len(user_items),
        active_count=active_count,
    )


def update_round_robin_config(
    db: Session,
    payload: RoundRobinConfigUpdate,
    current_user: Optional[str] = "system",
) -> RoundRobinConfigResponse:
    """
    Cập nhật danh sách nhân sự tham gia xoay vòng Memo. Chỉ lưu danh sách các user bị loại trừ vào MEMO_TEMPLATE_CONFIG.
    """
    # Lấy toàn bộ user App hiện có
    stmt = (
        select(User.user_name1)
        .where(
            and_(
                func.lower(func.trim(User.phanquyen)).in_(["2", "app"]),
                or_(User.active == True, User.active == None),
                User.user_name1 != "test",
            )
        )
    )
    all_app_unames = [r[0].strip().lower() for r in db.execute(stmt).all() if r[0]]
    active_set = set(u.strip().lower() for u in payload.active_usernames)

    # Excluded là những người thuộc all_app_unames nhưng KHÔNG nằm trong active_set
    excluded = [u for u in all_app_unames if u not in active_set]

    # Lưu vào MEMO_TEMPLATE_CONFIG
    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_round_robin_excluded"
        )
    )
    json_val = json.dumps(excluded)
    if cfg:
        cfg.config_val = json_val
    else:
        cfg = MemoTemplateConfig(
            config_key="memo_round_robin_excluded",
            config_val=json_val,
        )
        db.add(cfg)

    # Ghi log audit
    db.add(AuditLog(
        manhinh="APP_MEMO",
        chucnang="CONFIG_ROUND_ROBIN_USERS",
        user_thuchien=current_user,
        noidung=f"Cập nhật danh sách IT xoay vòng Memo. Bỏ ra khỏi xoay vòng ({len(excluded)} người): {', '.join(excluded) if excluded else 'Không có'}",
        ngay_insert=datetime.now(),
        active=True,
    ))
    db.commit()

    return get_round_robin_config(db)


def next_alpha_prefix(prefix: str) -> str:
    """
    Tăng tiền tố chữ cái theo chuẩn alphabet:
    A -> B -> ... -> Z -> AA -> AB...
    """
    chars = list(prefix.upper())
    i = len(chars) - 1
    while i >= 0:
        if chars[i] == 'Z':
            chars[i] = 'A'
            i -= 1
        else:
            chars[i] = chr(ord(chars[i]) + 1)
            return "".join(chars)
    return "A" + "".join(chars)


def parse_ma_tua(code: str) -> tuple[str, int, int]:
    """
    Phân tích mã tua: VD: 'A0001.01' -> ('A', 1, 1).
    Nếu không hợp lệ, trả về ('A', 1, 0).
    """
    if not code:
        return ("A", 1, 0)
    m = re.match(r"^([A-Za-z]+)(\d{4})\.(\d{2})$", code.strip())
    if not m:
        return ("A", 1, 0)
    prefix = m.group(1).upper()
    round_num = int(m.group(2))
    member_idx = int(m.group(3))
    return (prefix, round_num, member_idx)


def calc_next_slot(prefix: str, round_num: int, member_idx: int, num_members: int = 6) -> tuple[str, str, int, int]:
    """
    Tính mã tua tiếp theo theo quy tắc:
    - 6 người mỗi tua: .01 đến .06
    - Hết .06 -> sang tua kế: A0001.06 -> A0002.01
    - Hết 9999 -> sang chữ cái tiếp theo: A9999.06 -> B0001.01
    Trả về (code, next_prefix, next_round_num, next_member_idx).
    """
    num_members = max(num_members, 1)
    if member_idx < num_members:
        member_idx += 1
    else:
        member_idx = 1
        if round_num < 9999:
            round_num += 1
        else:
            round_num = 1
            prefix = next_alpha_prefix(prefix)
    code = f"{prefix}{round_num:04d}.{member_idx:02d}"
    return (code, prefix, round_num, member_idx)


def get_active_round_robin_users(db: Session) -> List[str]:
    """
    Lấy danh sách các username IT App active tham gia xoay vòng, sắp xếp cố định theo User.id.
    """
    excluded = get_round_robin_excluded_users(db)
    stmt = (
        select(User.user_name1)
        .where(
            and_(
                func.lower(func.trim(User.phanquyen)).in_(["2", "app"]),
                or_(User.active == True, User.active == None),
                User.user_name1 != "test",
            )
        )
        .order_by(asc(User.id))
    )
    rows = db.execute(stmt).all()
    user_list = []
    all_users = []
    for r in rows:
        if r[0]:
            uname = r[0].strip().lower()
            all_users.append(uname)
            if uname not in excluded:
                user_list.append(uname)
    if not user_list:
        user_list = all_users
    return user_list


def get_current_rotation_state(db: Session, num_members: int = 6) -> tuple[str, int, int]:
    """
    Lấy trạng thái tua hiện tại (prefix, round_num, member_idx).
    Ưu tiên đọc từ MEMO_TEMPLATE_CONFIG (key 'memo_rotation_state').
    Nếu chưa có, quét mã tua gần nhất trong bảng MEMO.
    Nếu vẫn chưa có, khởi tạo ('A', 1, 0) để gán bắt đầu từ A0001.01.
    """
    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_rotation_state"
        )
    )
    if cfg and cfg.config_val:
        try:
            data = json.loads(cfg.config_val)
            prefix = str(data.get("prefix", "A")).upper()
            round_num = int(data.get("round_num", 1))
            member_idx = int(data.get("member_idx", 0))
            return (prefix, round_num, member_idx)
        except Exception:
            pass

    # Quét từ memo gần nhất có ma_tua
    last_memo = db.scalar(
        select(Memo.ma_tua)
        .where(
            and_(
                Memo.ma_tua != None,
                Memo.ma_tua != "",
                or_(Memo.active == True, Memo.active == None)
            )
        )
        .order_by(desc(Memo.id))
        .limit(1)
    )
    if last_memo:
        return parse_ma_tua(last_memo)

    return ("A", 1, 0)


def get_reclaimed_slots(db: Session) -> List[Dict[str, Any]]:
    """
    Lấy danh sách các lượt/mã tua được hoàn trả từ Memo chờ setup bị xóa.
    Mỗi phần tử: {"user": str, "ma_tua": str, "memo_id": int, "ma_memo": str, "deleted_at": str}
    """
    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_reclaimed_slots"
        )
    )
    if cfg and cfg.config_val:
        try:
            items = json.loads(cfg.config_val)
            if isinstance(items, list):
                return items
        except Exception:
            pass
    return []


def add_reclaimed_slot(db: Session, user: str, ma_tua: str, memo_id: int, ma_memo: str):
    """
    Bổ sung mã lượt và user vào hàng đợi bù khi một Memo ở trạng thái Chờ setup bị xóa.
    Giúp user vừa bị xóa được gán ngay mã lượt đó ở Memo tiếp theo, không bị bỏ qua mất lượt.
    """
    if not user or not ma_tua:
        return
    u_clean = user.strip().lower()
    t_clean = ma_tua.strip().upper()
    slots = get_reclaimed_slots(db)

    # Kiểm tra tránh trùng lặp
    for s in slots:
        if s.get("ma_tua") == t_clean and s.get("user") == u_clean:
            return

    new_slot = {
        "user": u_clean,
        "ma_tua": t_clean,
        "memo_id": memo_id,
        "ma_memo": ma_memo or "",
        "deleted_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    slots.append(new_slot)

    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_reclaimed_slots"
        )
    )
    json_val = json.dumps(slots)
    if cfg:
        cfg.config_val = json_val
    else:
        cfg = MemoTemplateConfig(
            config_key="memo_reclaimed_slots",
            config_val=json_val
        )
        db.add(cfg)


def pop_next_reclaimed_slot(db: Session) -> Optional[Dict[str, Any]]:
    """
    Lấy và xóa slot bù đầu tiên trong hàng đợi.
    """
    slots = get_reclaimed_slots(db)
    if not slots:
        return None

    first_slot = slots.pop(0)
    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_reclaimed_slots"
        )
    )
    if cfg:
        cfg.config_val = json.dumps(slots)

    return first_slot


def preview_next_it_setup(db: Session, user_list: Optional[List[str]] = None) -> tuple[str, str, bool, Optional[str]]:
    """
    Xem trước người IT và mã tua tiếp theo (không ghi DB, dùng để gợi ý khi mở form).
    Ưu tiên lấy từ lượt bù (Memo Chờ setup đã bị xóa).
    Trả về (next_user, next_ma_tua, is_reclaimed, reclaimed_reason).
    """
    reclaimed = get_reclaimed_slots(db)
    if reclaimed:
        first = reclaimed[0]
        return (
            first.get("user", ""),
            first.get("ma_tua", ""),
            True,
            f"Lượt bù mã {first.get('ma_tua')} cho @{first.get('user')} (do Memo #{first.get('ma_memo')} chờ setup đã bị xóa)"
        )

    if user_list is None:
        user_list = get_active_round_robin_users(db)
    if not user_list:
        return ("", "A0001.01", False, None)

    curr_p, curr_r, curr_m = get_current_rotation_state(db, len(user_list))
    code, next_p, next_r, next_m = calc_next_slot(curr_p, curr_r, curr_m, len(user_list))
    next_user = user_list[(next_m - 1) % len(user_list)]
    return (next_user, code, False, None)


def allocate_next_it_setup(db: Session) -> Dict[str, Any]:
    """
    Cấp phát slot xoay tua tiếp theo (ghi nhận state mới vào DB).
    Nếu có lượt bù từ Memo chờ setup bị xóa -> ưu tiên cấp lượt bù này cho user vừa bị xóa trước,
    tránh bị bỏ qua mất lượt.
    """
    reclaimed = pop_next_reclaimed_slot(db)
    if reclaimed:
        return {
            "next_user": reclaimed.get("user", ""),
            "ma_tua": reclaimed.get("ma_tua", ""),
            "is_reclaimed": True
        }

    user_list = get_active_round_robin_users(db)
    if not user_list:
        return {"next_user": "", "ma_tua": "A0001.01", "is_reclaimed": False}

    curr_p, curr_r, curr_m = get_current_rotation_state(db, len(user_list))
    code, next_p, next_r, next_m = calc_next_slot(curr_p, curr_r, curr_m, len(user_list))
    next_user = user_list[(next_m - 1) % len(user_list)]

    # Lưu lại trạng thái xoay tua mới
    cfg = db.scalar(
        select(MemoTemplateConfig).where(
            MemoTemplateConfig.config_key == "memo_rotation_state"
        )
    )
    state_data = {
        "prefix": next_p,
        "round_num": next_r,
        "member_idx": next_m,
        "last_ma_tua": code,
        "last_user": next_user,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    json_val = json.dumps(state_data)
    if cfg:
        cfg.config_val = json_val
    else:
        cfg = MemoTemplateConfig(
            config_key="memo_rotation_state",
            config_val=json_val
        )
        db.add(cfg)

    return {"next_user": next_user, "ma_tua": code, "is_reclaimed": False}


def get_next_it_setup(db: Session) -> NextItSetupResponse:
    """
    Thuật toán Round-Robin: Gợi ý nhân sự IT Setup và Mã Tua tiếp theo dựa trên tiến trình xoay tua.
    Chỉ xoay vòng qua các nhân sự KHÔNG bị loại trừ.
    """
    user_list = get_active_round_robin_users(db)
    if not user_list:
        return NextItSetupResponse(status="ok", next_user="", user_list=[], next_ma_tua=None)

    next_user, next_ma_tua, is_reclaimed, reclaimed_reason = preview_next_it_setup(db, user_list)
    return NextItSetupResponse(
        status="ok",
        next_user=next_user,
        user_list=user_list,
        next_ma_tua=next_ma_tua,
        is_reclaimed=is_reclaimed,
        reclaimed_reason=reclaimed_reason,
    )



def check_memo_code_exists(
    db: Session,
    ma_memo: str,
    exclude_id: Optional[int] = None,
) -> Optional[Memo]:
    """
    Kiểm tra xem mã Memo đã tồn tại trong hệ thống chưa (không phân biệt hoa thường, bỏ khoảng trắng thừa).
    Hỗ trợ tìm chính xác và tìm tiền tố nếu bản ghi cũ có kèm ghi chú sau dấu gạch ngang (-).
    """
    if not ma_memo:
        return None
    clean = ma_memo.strip().lower()
    if not clean:
        return None
    # 1. Khớp chính xác
    stmt = (
        select(Memo)
        .where(
            func.lower(func.trim(Memo.ma_memo)) == clean,
            or_(Memo.active == True, Memo.active == None)
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(Memo.id != exclude_id)
    found = db.scalar(stmt.limit(1))
    if found:
        return found

    # 2. Khớp tiền tố nếu bản ghi cũ có ghi chú sau dấu gạch ngang (VD: '302621AF001 - ...')
    prefix_stmt = (
        select(Memo)
        .where(
            or_(
                func.lower(func.trim(Memo.ma_memo)).like(f"{clean} - %"),
                func.lower(func.trim(Memo.ma_memo)).like(f"{clean}-%"),
            ),
            or_(Memo.active == True, Memo.active == None)
        )
    )
    if exclude_id is not None:
        prefix_stmt = prefix_stmt.where(Memo.id != exclude_id)
    return db.scalar(prefix_stmt.limit(1))


def create_memo(
    db: Session,
    payload: MemoCreate,
    current_user: Optional[str] = "system",
) -> Memo:
    """
    Tạo mới một Memo (chặn trùng mã Memo).
    """
    clean_ma_memo = payload.ma_memo.strip() if payload.ma_memo else None
    if clean_ma_memo:
        existing = check_memo_code_exists(db, clean_ma_memo)
        if existing:
            assigned_str = f"gán cho {existing.it_setup}" if existing.it_setup else "đã có trong hệ thống"
            raise ValueError(f"Mã Memo '{clean_ma_memo}' đã tồn tại ({assigned_str}). Không thể tạo trùng mã!")

    now = datetime.now()
    hoanthanh_val = None
    if payload.trangthai == "2":
        hoanthanh_val = now.strftime("%Y-%m-%d %H:%M:%S")

    # Gán IT Setup và Mã Tua tự động xoay vòng khi tạo mới
    slot = allocate_next_it_setup(db)
    auto_next_user = slot["next_user"]
    ma_tua_assigned = payload.ma_tua.strip() if payload.ma_tua else slot["ma_tua"]
    it_setup_assigned = payload.it_setup.strip() if payload.it_setup else auto_next_user

    item = Memo(
        ma_memo=clean_ma_memo,
        subject_mail=payload.subject_mail.strip() if payload.subject_mail else None,
        ngay_batdau=payload.ngay_batdau,
        ngay_ketthuc=payload.ngay_ketthuc,
        it_setup=it_setup_assigned,
        ma_tua=ma_tua_assigned,
        giahan=payload.giahan or "0",
        ngay_tiepnhan=payload.ngay_tiepnhan or now,
        trangthai=payload.trangthai or "0",
        hoanthanh=hoanthanh_val,
        nguoi_gui=payload.nguoi_gui.strip() if payload.nguoi_gui else None,
        huong_dan=payload.huong_dan,
        noidung_mail=payload.noidung_mail,
        ten_file_memo=payload.ten_file_memo.strip() if payload.ten_file_memo else None,
        note=payload.note.strip() if payload.note else None,
        ngay_insert=now,
        ngay_update=now,
        active=True,
    )

    db.add(item)
    db.flush()

    # Log audit
    log_entry = AuditLog(
        manhinh="APP_MEMO",
        chucnang="INSERT_MEMO",
        user_thuchien=current_user,
        noidung=f"Insert Memo {item.ma_memo} (ID: {item.id}, Mã Tua: {item.ma_tua}, IT Setup: {item.it_setup})",
        ngay_insert=now,
        active=True,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(item)
    return item


def update_memo(
    db: Session,
    memo_id: int,
    payload: MemoUpdate,
    current_user: Optional[str] = "system",
) -> Optional[Memo]:
    """
    Cập nhật Memo. Nếu có đổi người IT Setup, ghi nhật ký log vào note và audit logs.
    Tuần tự xoay tua hệ thống không bị ảnh hưởng bởi việc chỉnh sửa gán lại này.
    """
    item = get_memo_by_id(db, memo_id)
    if not item:
        return None

    now = datetime.now()
    old_it = (item.it_setup or "").strip() or "Chưa gán"
    new_it = payload.it_setup.strip() if payload.it_setup is not None else None
    it_changed = (new_it is not None and new_it != old_it)

    if payload.ma_memo is not None:
        item.ma_memo = payload.ma_memo.strip()
    if payload.subject_mail is not None:
        item.subject_mail = payload.subject_mail.strip()
    if payload.ngay_batdau is not None:
        item.ngay_batdau = payload.ngay_batdau
    if payload.ngay_ketthuc is not None:
        item.ngay_ketthuc = payload.ngay_ketthuc
    if payload.it_setup is not None:
        item.it_setup = payload.it_setup.strip()
    if payload.ma_tua is not None:
        item.ma_tua = payload.ma_tua.strip() if payload.ma_tua else None
    if payload.giahan is not None:
        item.giahan = payload.giahan
    if payload.ngay_tiepnhan is not None:
        item.ngay_tiepnhan = payload.ngay_tiepnhan
    if payload.trangthai is not None:
        item.trangthai = payload.trangthai
        if payload.trangthai == "2" and not item.hoanthanh:
            item.hoanthanh = now.strftime("%Y-%m-%d %H:%M:%S")
    if payload.hoanthanh is not None:
        item.hoanthanh = payload.hoanthanh
    if payload.nguoi_gui is not None:
        item.nguoi_gui = payload.nguoi_gui.strip()
    if payload.huong_dan is not None:
        item.huong_dan = payload.huong_dan
    if payload.noidung_mail is not None:
        new_mail = payload.noidung_mail.strip() if payload.noidung_mail else ""
        old_mail = item.noidung_mail or ""
        old_guide = item.huong_dan or ""
        # Bảo toàn đợt bổ sung nếu trong DB cũ đã có [BỔ SUNG mà payload vô tình thiếu
        if re.search(r"\[bổ sung", old_mail, re.IGNORECASE) and not re.search(r"\[bổ sung", new_mail, re.IGNORECASE):
            supp_match = re.search(r"(\[bổ sung[\s\S]*)", old_mail, re.IGNORECASE)
            if supp_match:
                new_mail = (new_mail.strip() + "\n\n" + supp_match.group(1).strip()).strip()
        elif re.search(r"\[bổ sung", old_guide, re.IGNORECASE) and not re.search(r"\[bổ sung", new_mail, re.IGNORECASE):
            supp_match = re.search(r"(\[bổ sung[\s\S]*)", old_guide, re.IGNORECASE)
            if supp_match:
                new_mail = (new_mail.strip() + "\n\n" + supp_match.group(1).strip()).strip()
        item.noidung_mail = new_mail or None
    if payload.ten_file_memo is not None:
        item.ten_file_memo = payload.ten_file_memo.strip()
    if payload.note is not None:
        item.note = payload.note.strip()
    if payload.active is not None:
        old_active = item.active
        item.active = payload.active
        # Nếu chuyển active sang False (xóa mềm qua update)
        if (old_active is True or old_active is None) and payload.active is False:
            is_cho_setup = str(item.trangthai or "").strip() in ["0", "Chờ Setup", "Chờ setup", "cho_setup"]
            if is_cho_setup and item.it_setup and item.ma_tua:
                add_reclaimed_slot(
                    db=db,
                    user=item.it_setup,
                    ma_tua=item.ma_tua,
                    memo_id=item.id,
                    ma_memo=item.ma_memo or "",
                )

    # Nếu đổi người IT, ghi log ghi nhận user nào đổi vào cuối note và bảng LOGS
    if it_changed:
        change_log = f"[{now.strftime('%Y-%m-%d %H:%M:%S')}] User '{current_user}' đã đổi IT phụ trách từ '{old_it}' sang '{new_it}'"
        if item.note:
            item.note = f"{item.note.strip()}\n{change_log}"
        else:
            item.note = change_log

        db.add(AuditLog(
            manhinh="APP_MEMO",
            chucnang="CHANGE_IT_SETUP",
            user_thuchien=current_user,
            noidung=change_log,
            ngay_insert=now,
            active=True,
        ))

    item.ngay_update = now

    log_entry = AuditLog(
        manhinh="APP_MEMO",
        chucnang="UPDATE_MEMO",
        user_thuchien=current_user,
        noidung=f"Update Memo {item.ma_memo} (ID: {item.id}, Trangthai: {item.trangthai})",
        ngay_insert=now,
        active=True,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(item)
    return item


def gia_han_memo(
    db: Session,
    memo_id: int,
    payload: MemoGiaHan,
    current_user: Optional[str] = "system",
) -> Optional[Memo]:
    """
    Gia hạn Memo: Tạo một bản ghi Memo mới kế thừa từ Memo gốc với cờ giahan = '1'.
    Đồng thời tính xoay tua như memo mới và cấp mã tua tuần tự, không dồn vào bạn làm trước đó.
    """
    orig = get_memo_by_id(db, memo_id)
    if not orig:
        return None

    now = datetime.now()
    hoanthanh_val = None
    if payload.trangthai == "2":
        hoanthanh_val = now.strftime("%Y-%m-%d %H:%M:%S")

    # Tính xoay tua như memo mới, cấp mã tua mới theo vòng xoay (ưu tiên lượt bù nếu có)
    slot = allocate_next_it_setup(db)
    auto_next_user = slot["next_user"]
    ma_tua_assigned = payload.ma_tua.strip() if payload.ma_tua else slot["ma_tua"]
    it_setup_assigned = payload.it_setup.strip() if payload.it_setup else auto_next_user

    new_item = Memo(
        ma_memo=(payload.ma_memo or orig.ma_memo or "").strip(),
        subject_mail=(payload.subject_mail if payload.subject_mail is not None else orig.subject_mail),
        ngay_batdau=payload.ngay_batdau or orig.ngay_batdau,
        ngay_ketthuc=payload.ngay_ketthuc or orig.ngay_ketthuc,
        it_setup=it_setup_assigned,
        ma_tua=ma_tua_assigned,
        giahan="1",  # Cờ gia hạn
        ngay_tiepnhan=payload.ngay_tiepnhan or now,
        trangthai=payload.trangthai or "0",
        hoanthanh=hoanthanh_val,
        nguoi_gui=(payload.nguoi_gui or orig.nguoi_gui or "").strip(),
        huong_dan=payload.huong_dan if payload.huong_dan is not None else orig.huong_dan,
        ten_file_memo=payload.ten_file_memo if payload.ten_file_memo is not None else orig.ten_file_memo,
        note=payload.note if payload.note is not None else orig.note,
        ngay_insert=now,
        ngay_update=now,
        active=True,
    )

    db.add(new_item)
    db.flush()

    log_entry = AuditLog(
        manhinh="APP_MEMO",
        chucnang="GIAHAN_MEMO",
        user_thuchien=current_user,
        noidung=f"Gia Hạn Memo {orig.ma_memo} -> Mới ID: {new_item.id} (Mã Tua: {new_item.ma_tua}, Gán IT: {new_item.it_setup})",
        ngay_insert=now,
        active=True,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(new_item)
    return new_item


def delete_memo(
    db: Session,
    memo_id: int,
    current_user: Optional[str] = "system",
) -> bool:
    """
    Xóa mềm Memo (active = False).
    Nếu memo đang ở trạng thái Chờ setup ('0'), đang ở mã lượt nào thì bổ sung ngay mã lượt đó
    cho user vừa bị xóa vào hàng đợi bù để tránh bị bỏ qua mất lượt.
    """
    item = get_memo_by_id(db, memo_id)
    if not item:
        return False

    now = datetime.now()
    item.active = False
    item.ngay_update = now

    audit_note = f"Delete (Soft) Memo {item.ma_memo} (ID: {memo_id})"

    # Kiểm tra trạng thái Chờ setup ('0')
    is_cho_setup = str(item.trangthai or "").strip() in ["0", "Chờ Setup", "Chờ setup", "cho_setup"]
    if is_cho_setup and item.it_setup and item.ma_tua:
        add_reclaimed_slot(
            db=db,
            user=item.it_setup,
            ma_tua=item.ma_tua,
            memo_id=item.id,
            ma_memo=item.ma_memo or ""
        )
        audit_note += f" - [BÙ LƯỢT] Hoàn trả mã lượt {item.ma_tua} cho user '{item.it_setup}' do Memo chờ setup bị xóa."

    log_entry = AuditLog(
        manhinh="APP_MEMO",
        chucnang="DELETE_MEMO",
        user_thuchien=current_user,
        noidung=audit_note,
        ngay_insert=now,
        active=True,
    )
    db.add(log_entry)
    db.commit()
    return True


def export_memo_excel(
    db: Session,
    search: Optional[str] = None,
    trangthai: Optional[str] = None,
    it_setup: Optional[str] = None,
    giahan: Optional[str] = None,
    tungay: Optional[date] = None,
    denngay: Optional[date] = None,
) -> io.BytesIO:
    """
    Xuất danh sách Memo ra file Excel (.xlsx).
    """
    base_where = [or_(Memo.active == True, Memo.active == None)]

    if search:
        s = f"%{search.strip()}%"
        base_where.append(Memo.ma_memo.like(s))

    if trangthai and trangthai != "ALL":
        if trangthai in ["0", "pending", "cho_setup"]:
            base_where.append(or_(Memo.trangthai != "2", Memo.trangthai == None))
        elif trangthai == "4" or trangthai == "bo_sung":
            base_where.append(or_(Memo.trangthai == "4", Memo.trangthai == "bo_sung"))
        else:
            base_where.append(Memo.trangthai == trangthai.strip())

    if it_setup and it_setup != "ALL":
        base_where.append(Memo.it_setup.like(f"%{it_setup.strip()}%"))

    if giahan and giahan != "ALL":
        if giahan == "1":
            base_where.append(or_(Memo.giahan == "1", Memo.giahan == "True", Memo.giahan == "TRUE"))
        else:
            base_where.append(or_(Memo.giahan == "0", Memo.giahan == "False", Memo.giahan == "FALSE", Memo.giahan == None))

    if tungay:
        base_where.append(Memo.ngay_batdau >= tungay)

    if denngay:
        base_where.append(Memo.ngay_ketthuc <= denngay)

    stmt = (
        select(Memo)
        .where(and_(*base_where))
        .order_by(desc(Memo.ngay_insert), desc(Memo.id))
    )
    items = db.scalars(stmt).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "DANH_SACH_MEMO"

    # Title
    ws.merge_cells("A1:K1")
    title_cell = ws["A1"]
    title_cell.value = "DANH SÁCH QUẢN LÝ MEMO - GGG IT APP"
    title_cell.font = Font(name="Arial", size=15, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 40

    # Headers
    headers = [
        "STT",
        "Mã Memo",
        "Mã Tua",
        "Loại Memo",
        "IT Setup",
        "Trạng Thái",
        "Ngày Bắt Đầu",
        "Ngày Kết Thúc",
        "Tiêu Đề / Link Chiến Dịch",
        "Ngày Tiếp Nhận",
        "Hoàn Thành",
        "Người Gửi / Ghi Chú",
        "Đánh Giá (Admin)",
        "Ghi Chú Đánh Giá",
        "Người Đánh Giá",
        "Thời Gian Đánh Giá"
    ]

    ws.row_dimensions[2].height = 28
    header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    for col_idx, h in enumerate(headers, start=1):
        cell = ws.cell(row=2, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    # Status mapper
    trangthai_names = {
        "0": "Chờ Setup",
        "1": "Đã setup nháp",
        "2": "Đã Public",
    }

    # Data rows
    font_data = Font(name="Arial", size=9)
    fill_even = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    for row_idx, item in enumerate(items, start=3):
        ws.row_dimensions[row_idx].height = 24
        is_even = (row_idx % 2 == 0)

        is_giahan = str(item.giahan).strip() in ["1", "True", "TRUE"]
        loai_memo = "Gia Hạn" if is_giahan else "Memo Mới"
        tt_str = trangthai_names.get(str(item.trangthai), item.trangthai or "")

        hoanthanh_display = item.hoanthanh or ""
        if hoanthanh_display.startswith("9999-12-30"):
            hoanthanh_display = "Chưa hoàn thành"

        if item.ReviewStatus == "fail":
            rev_str = "Không đạt (Fail)"
        elif item.ReviewStatus == "ok":
            rev_str = "Đạt (OK)"
        elif hoanthanh_display and hoanthanh_display != "Chưa hoàn thành":
            rev_str = "Hoàn thành thành công"
        else:
            rev_str = "Chưa hoàn thành"

        row_data = [
            row_idx - 2,
            item.ma_memo or "",
            item.ma_tua or "",
            loai_memo,
            item.it_setup or "",
            tt_str,
            str(item.ngay_batdau) if item.ngay_batdau else "",
            str(item.ngay_ketthuc) if item.ngay_ketthuc else "",
            item.subject_mail or "",
            item.ngay_tiepnhan.strftime("%Y-%m-%d %H:%M") if item.ngay_tiepnhan else "",
            hoanthanh_display,
            item.note or item.nguoi_gui or "",
            rev_str,
            item.ReviewNote or "",
            item.ReviewedBy or "",
            item.ReviewedAt.strftime("%Y-%m-%d %H:%M") if item.ReviewedAt else ""
        ]

        for col_idx, val in enumerate(row_data, start=1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = font_data
            cell.border = thin_border
            if is_even:
                cell.fill = fill_even

            if col_idx in [1, 3, 5, 6, 7, 9, 10, 12, 14, 15]:
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # Column widths
    col_widths = {
        "A": 8,
        "B": 18,
        "C": 14,
        "D": 16,
        "E": 16,
        "F": 14,
        "G": 14,
        "H": 42,
        "I": 18,
        "J": 20,
        "K": 26,
        "L": 22,
        "M": 30,
        "N": 18,
        "O": 18,
    }
    for col_letter, width in col_widths.items():
        ws.column_dimensions[col_letter].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def review_memo(
    db: Session,
    memo_id: int,
    review_status: Optional[str],
    review_note: Optional[str],
    username: str
) -> Memo:
    memo = db.get(Memo, memo_id)
    if not memo:
        raise ValueError("Không tìm thấy Memo tương ứng")

    norm_status = review_status.lower().strip() if review_status else None
    if norm_status and norm_status not in ["ok", "fail"]:
        norm_status = None

    if norm_status == "fail" and not (review_note and review_note.strip()):
        raise ValueError("Vui lòng nhập lý do đánh giá không đạt (Fail)!")

    now = datetime.now()
    memo.ReviewStatus = norm_status
    memo.ReviewNote = review_note.strip() if (review_note and norm_status) else None
    memo.ReviewedBy = username if norm_status else None
    memo.ReviewedAt = now if norm_status else None
    memo.ngay_update = now

    db.commit()
    db.refresh(memo)
    return memo


# ---------------------------------------------------------------------------
# Memo Template & BM MKT Management Services
# ---------------------------------------------------------------------------

DEFAULT_TO_EMAILS = "DCORP Support <19006140@dcorp.com.vn>; LOI Nguyen (DCORP | HCM) <d.loinq@dcorp.com.vn>; 'TUAN Nguyen (DCORP | HCM)' <d.tuannv@dcorp.com.vn>; support@dcorp.com.vn; quan.pham@ggg.com.vn;"

DEFAULT_BASE_CC_EMAILS = "hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn; hien.lethu@ggg.com.vn; hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn; ha.nl@ggg.com.vn; erp.team@ggg.com.vn; trang.bt2@gg.com.vn;"

DEFAULT_MKT_LINK = "https://goldengatetradeservice.sharepoint.com/:x:/s/CAMNANGTHONGTIN/IQCMsLY2xKEmSKrDPc1VpU_JAU4LDzEBTzgph82KZqAZjOA?e=xOsFGO"

DEFAULT_EMAIL_BODY = """<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; color: #1e293b; line-height: 1.55;">
    <p style="margin: 0 0 10px 0;">Dear Anh/Chị,</p>
    <p style="margin: 0 0 10px 0;">MEMO đã được setup trên POS.</p>
    <p style="margin: 0 0 10px 0;">Memo bắt đầu từ:</p>
    <p style="margin: 0 0 10px 0;">Mã IO (Memo):</p>
    <p style="margin: 0 0 15px 0;">Link Setup:</p>
    
    <p style="color: red; margin: 15px 0 5px 0; font-weight: bold; text-decoration: underline;">Hướng dẫn:</p>
    <ul style="padding-left: 20px; margin: 5px 0 15px 0;">
        <li style="margin-bottom: 6px;">Các điều kiện nút bấm nhà hàng xem trong <span class="highlight-yellow" style="background-color: yellow; color: black; font-style: italic; text-decoration: underline;">file đính kèm</span> hoặc truy cập <span class="highlight-yellow" style="background-color: yellow; color: black;">link G-Process</span> để áp dụng đúng chương trình</li>
        <li style="margin-bottom: 6px;">Anh/chị Nhà Hàng vui lòng xem kỹ danh sách <span class="highlight-yellow" style="background-color: yellow; color: black;">Nhà Hàng được áp dụng</span>.</li>
        <li style="margin-bottom: 6px;">Các <span class="highlight-yellow" style="background-color: yellow; color: black;">Nhà Hàng không áp dụng</span> anh/chị vui lòng bỏ qua mail này. Cần thêm thông tin cơ chế chương trình anh/chị vui lòng liên hệ team MKT phụ trách brand của mình để được giải đáp</li>
    </ul>

    <div style="background-color: #000; color: #FFCC00; padding: 10px; font-weight: bold; text-align: center; border-radius: 6px; margin: 15px 0;">
        Nhà hàng lưu ý kiểm tra nút bấm giảm trước khi đóng giao dịch!
    </div>

    <p style="margin: 15px 0 5px 0;"><span class="highlight-yellow" style="background-color: yellow; color: black; font-weight: bold; padding: 1px 4px; border-radius: 3px;">Coupon</span></p>
    <p style="margin: 0; padding-left: 10px;">Chọn ORDER --&gt; Tính tiền --&gt; Giảm giá --&gt; <strong>Internal Coupon</strong> --&gt; chọn "............."</p>
    <p style="margin: 0; padding-left: 10px;">Mã RK7: ..........................</p>

    <p style="color: red; margin: 20px 0 5px 0; font-weight: bold;">Lưu ý :</p>
    <ul style="padding-left: 20px; margin: 5px 0 15px 0; list-style-type: square;">
        <li style="margin-bottom: 8px;">NH kiểm tra nếu <span class="highlight-yellow" style="background-color: yellow; color: black;">chưa có nút bấm báo ngay hotline Dcorp 19006140 nhận phím 1</span> để được hỗ trợ.</li>
        <li style="margin-bottom: 8px;"><span class="highlight-yellow" style="background-color: yellow; color: black;">Nếu đã có nút bấm vui lòng kiểm tra kỹ lại xem thông tin setup đã chính xác so với MEMO</span>, có sai sót trong quá trình vận hành NH vui lòng báo ngay hotline IT nhấn phím 2, không liên hệ được hotline vui lòng gọi trực tiếp IT gửi hướng dẫn memo để điều chỉnh chính xác <span style="color: red; font-weight: bold; text-decoration: underline;">trước khi bán</span>. (Mặc định Nhà hàng không phản hồi nghĩa là SETUP MEMO trên POS đã chính xác với nội dung memo MKT ban hành, mọi sai sót sau khi bán IT hoàn toàn không chịu trách nhiệm, nên mong NH kiểm tra kỹ trước khi bán)</li>
    </ul>

    <p style="margin: 15px 0 5px 0; color: #475569; font-weight: bold;">@Dear team Dcorp,</p>
    <p style="margin: 0 0 10px 0; padding-left: 10px; color: #475569; font-style: italic;">Vui lòng tiếp nhận thông tin support khi cần thiết nhé</p>
    
    <p style="margin: 15px 0 5px 0; color: #475569; font-weight: bold;">@Dear team MKT,</p>
    <p style="margin: 0 0 15px 0; padding-left: 10px; color: #475569; font-style: italic;">Team vui lòng hướng dẫn thêm các cơ chế cho nhà hàng dễ vận hành nhé</p>
    
    <p style="color: #94a3b8; margin: 15px 0;">-------------------------------------------------------------------------------------</p>
    
    <p style="margin: 0 0 5px 0; font-weight: bold;">Nếu là Voucher sau Thuế thì setup trong nhóm Voucher Internal hay External</p>
    <ol style="padding-left: 20px; margin: 5px 0 15px 0;">
        <li style="margin-bottom: 4px;">Trong nhóm External vui lòng cung cấp thêm mã SAP PartnerCode</li>
        <li style="margin-bottom: 4px;">Voucher cần setup mệnh giá bao nhiêu, Có xuất Hóa Đơn hay không</li>
    </ol>
    <p style="font-style: italic; color: #475569; margin-bottom: 15px;">Những phần trên có thể trao đổi với chị Hiền ACC để được hướng dẫn</p>

    <p style="background-color: #ffcccc; color: red; padding: 6px 12px; font-weight: bold; border-left: 4px solid red; margin: 15px 0;">
        Lưu ý : Memo “Lũy Kế” tự động , hướng dẫn NH chỉ thao tác bấm 1 lần
    </p>

    <p style="margin: 15px 0 5px 0;"><span class="highlight-yellow" style="background-color: yellow; color: black; font-weight: bold; padding: 1px 4px; border-radius: 3px;">Tặng món</span></p>
    <p style="margin: 0; padding-left: 10px;">Chọn đúng món --&gt; Tính tiền --&gt; Giảm giá --&gt; <strong>Tặng món MKT</strong> --&gt; chọn "............"</p>
    <p style="margin: 0; padding-left: 10px;">Mã RK7: ..........................</p>
    <p style="margin: 0 0 15px 0; padding-left: 10px;">Mã Món Tặng : ...................................</p>

    <p style="margin: 15px 0 5px 0;"><span class="highlight-yellow" style="background-color: yellow; color: black; font-weight: bold; padding: 1px 4px; border-radius: 3px;">GRO Discount Campaign</span></p>
    <p style="margin: 0; padding-left: 10px;">Chọn ORDER --&gt; Tính tiền --&gt; Giảm giá --&gt; <strong>GRO Discount Campaign</strong> --&gt; chọn "........."</p>
    <p style="margin: 0 0 15px 0; padding-left: 10px;">Mã RK7: ..................</p>

    <p style="margin: 15px 0 5px 0;"><span class="highlight-yellow" style="background-color: yellow; color: black; font-weight: bold; padding: 1px 4px; border-radius: 3px;">Giảm giá ngân ngân hàng</span></p>
    <p style="margin: 0; padding-left: 10px;">Chọn ORDER --&gt; Tính tiền --&gt; Giảm giá --&gt; <strong>Giảm giá ngân ngân hàng</strong> --&gt; chọn "........."</p>
    <p style="margin: 0 0 15px 0; padding-left: 10px;">Mã RK7: ..................</p>

    <p style="margin: 15px 0 5px 0;"><span class="highlight-yellow" style="background-color: yellow; color: black; font-weight: bold; padding: 1px 4px; border-radius: 3px;">Công nợ</span></p>
    <p style="margin: 0; padding-left: 10px;">Đóng giao dịch --&gt; <strong>Công nợ</strong> --&gt; chọn "VIETLIFE"</p>
    <p style="margin: 0; padding-left: 10px;">--&gt; quẹt thẻ quản lý --&gt; nhập tên người gửi hợp đồng --&gt; xác nhận</p>
</div>"""


def _get_config_value(db: Session, key: str, default: str) -> str:
    cfg = db.execute(select(MemoTemplateConfig).where(MemoTemplateConfig.config_key == key)).scalar_one_or_none()
    if cfg and cfg.config_val:
        return cfg.config_val
    return default


def _set_config_value(db: Session, key: str, val: str):
    cfg = db.execute(select(MemoTemplateConfig).where(MemoTemplateConfig.config_key == key)).scalar_one_or_none()
    if cfg:
        cfg.config_val = val
    else:
        db.add(MemoTemplateConfig(config_key=key, config_val=val))
    db.commit()


def get_memo_template_data(db: Session) -> Dict[str, Any]:
    to_emails = _get_config_value(db, "to_emails", DEFAULT_TO_EMAILS)
    base_cc_emails = _get_config_value(db, "base_cc_emails", DEFAULT_BASE_CC_EMAILS)
    mkt_link = _get_config_value(db, "mkt_link", DEFAULT_MKT_LINK)
    email_body = _get_config_value(db, "email_body", DEFAULT_EMAIL_BODY)

    base_set = set([e.strip().lower() for e in base_cc_emails.replace(",", ";").split(";") if e.strip()])

    brands = db.execute(
        select(MemoTemplateBrand).where(MemoTemplateBrand.active == True).order_by(MemoTemplateBrand.brand_name)
    ).scalars().all()

    brand_items = []
    all_bm_set: Set[str] = set()

    for b in brands:
        raw_cc = (b.cc_emails or "").strip()
        emails = [e.strip() for e in raw_cc.replace(",", ";").split(";") if e.strip()]
        bm_emails_list = [e for e in emails if e.lower() not in base_set]
        bm_emails_str = "; ".join(bm_emails_list)

        for bm in bm_emails_list:
            all_bm_set.add(bm)

        if bm_emails_str:
            full_cc = f"{bm_emails_str}; {base_cc_emails}"
        else:
            full_cc = base_cc_emails

        brand_items.append({
            "id": b.id,
            "brand_name": b.brand_name,
            "bm_emails": bm_emails_str,
            "full_cc_emails": full_cc,
            "active": b.active
        })

    all_bm_list = sorted(list(all_bm_set))
    all_bm_str = "; ".join(all_bm_list)
    all_brands_cc_str = f"{all_bm_str}; {base_cc_emails}" if all_bm_str else base_cc_emails

    return {
        "to_emails": to_emails,
        "base_cc_emails": base_cc_emails,
        "mkt_link": mkt_link,
        "email_body": email_body,
        "brands": brand_items,
        "all_bm_emails": all_bm_str,
        "all_brands_cc_emails": all_brands_cc_str
    }


def update_memo_template_to(db: Session, to_emails: str) -> str:
    cleaned = to_emails.strip()
    _set_config_value(db, "to_emails", cleaned)
    return cleaned


def update_memo_template_base_cc(db: Session, base_cc_emails: str) -> str:
    cleaned = base_cc_emails.strip()
    _set_config_value(db, "base_cc_emails", cleaned)
    base_set = set([e.strip().lower() for e in cleaned.replace(",", ";").split(";") if e.strip()])
    brands = db.execute(select(MemoTemplateBrand)).scalars().all()
    for b in brands:
        old_cc = (b.cc_emails or "").strip()
        emails = [e.strip() for e in old_cc.replace(",", ";").split(";") if e.strip()]
        bms = [e for e in emails if e.lower() not in base_set]
        bm_str = "; ".join(bms)
        b.cc_emails = f"{bm_str}; {cleaned}" if bm_str else cleaned
    db.commit()
    return cleaned


def update_memo_template_link(db: Session, mkt_link: str) -> str:
    cleaned = mkt_link.strip()
    _set_config_value(db, "mkt_link", cleaned)
    return cleaned


def update_memo_template_body(db: Session, email_body: str) -> str:
    cleaned = email_body.strip()
    _set_config_value(db, "email_body", cleaned)
    return cleaned


def upsert_memo_template_brand(
    db: Session,
    brand_name: str,
    bm_emails: str,
    active: bool = True
) -> MemoTemplateBrand:
    b_name = brand_name.strip()
    base_cc = _get_config_value(db, "base_cc_emails", DEFAULT_BASE_CC_EMAILS)

    brand = db.execute(select(MemoTemplateBrand).where(MemoTemplateBrand.brand_name == b_name)).scalar_one_or_none()

    clean_bms = [e.strip() for e in bm_emails.replace(",", ";").split(";") if e.strip()]
    bm_str = "; ".join(clean_bms)
    full_cc = f"{bm_str}; {base_cc}" if bm_str else base_cc

    if brand:
        brand.cc_emails = full_cc
        brand.active = active
    else:
        brand = MemoTemplateBrand(
            brand_name=b_name,
            cc_emails=full_cc,
            active=active
        )
        db.add(brand)

    db.commit()
    db.refresh(brand)
    return brand


def delete_memo_template_brand(db: Session, brand_id: int) -> bool:
    brand = db.get(MemoTemplateBrand, brand_id)
    if not brand:
        return False
    brand.active = False
    db.commit()
    return True


def sync_bm_from_parsed_dict(db: Session, brand_to_bms: Dict[str, List[str]]) -> Dict[str, Any]:
    base_cc = _get_config_value(db, "base_cc_emails", DEFAULT_BASE_CC_EMAILS)
    updated_brands = []

    for brand_name, bm_list in brand_to_bms.items():
        clean_name = brand_name.strip()
        if not clean_name:
            continue

        unique_bms = list(dict.fromkeys([e.strip() for e in bm_list if e.strip() and "@" in e]))
        bm_str = "; ".join(unique_bms)
        full_cc = f"{bm_str}; {base_cc}" if bm_str else base_cc

        brand = db.execute(
            select(MemoTemplateBrand).where(func.lower(MemoTemplateBrand.brand_name) == clean_name.lower())
        ).scalar_one_or_none()

        if brand:
            brand.cc_emails = full_cc
            brand.active = True
            updated_brands.append({"brand": brand.brand_name, "bm": bm_str, "action": "updated"})
        else:
            new_brand = MemoTemplateBrand(
                brand_name=clean_name,
                cc_emails=full_cc,
                active=True
            )
            db.add(new_brand)
            updated_brands.append({"brand": clean_name, "bm": bm_str, "action": "created"})

    db.commit()
    return {
        "status": "success",
        "total_updated": len(updated_brands),
        "brands": updated_brands
    }


def sync_bm_from_excel(db: Session, file_bytes: bytes) -> Dict[str, Any]:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    brand_to_bms: Dict[str, List[str]] = {}

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            continue

        header_row_idx = -1
        brand_col = -1
        role_col = -1
        email_col = -1

        for r_idx, row in enumerate(rows[:15]):
            row_str = [str(c or "").strip().lower() for c in row]
            for c_idx, val in enumerate(row_str):
                if "nhãn hàng" in val or "nhãn" in val or "brand" in val:
                    brand_col = c_idx
                elif "vai trò" in val or "role" in val or "chức vụ" in val:
                    role_col = c_idx
                elif "email" in val or "mail" in val:
                    email_col = c_idx

            if brand_col != -1 and email_col != -1:
                header_row_idx = r_idx
                break

        if header_row_idx != -1 and brand_col != -1 and email_col != -1:
            for row in rows[header_row_idx + 1:]:
                if len(row) <= max(brand_col, email_col):
                    continue
                brand_val = str(row[brand_col] or "").strip()
                email_val = str(row[email_col] or "").strip()
                role_val = str(row[role_col] or "").strip().upper() if role_col != -1 and len(row) > role_col else ""

                if not brand_val or not email_val or "@" not in email_val:
                    continue

                if role_col != -1 and role_val and "BM" not in role_val:
                    continue

                if brand_val not in brand_to_bms:
                    brand_to_bms[brand_val] = []
                if email_val not in brand_to_bms[brand_val]:
                    brand_to_bms[brand_val].append(email_val)

    if not brand_to_bms:
        raise ValueError("Không tìm thấy dữ liệu cột 'Nhãn hàng' và 'Email' (với Vai trò 'BM') trong file Excel.")

    return sync_bm_from_parsed_dict(db, brand_to_bms)


def sync_bm_from_text(db: Session, text_content: str) -> Dict[str, Any]:
    lines = text_content.strip().split("\n")
    brand_to_bms: Dict[str, List[str]] = {}
    email_regex = re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")

    for line in lines:
        parts = [p.strip() for p in re.split(r"[\t;,|]", line) if p.strip()]
        if len(parts) < 2:
            continue

        found_emails = []
        brand_name = ""
        for idx, part in enumerate(parts):
            matches = email_regex.findall(part)
            if matches:
                found_emails.extend(matches)
            elif idx == 0 or (idx == 1 and not brand_name and parts[0].isdigit()):
                brand_name = part

        if not brand_name and parts:
            brand_name = parts[1] if parts[0].isdigit() and len(parts) > 1 else parts[0]

        if brand_name and found_emails:
            if brand_name not in brand_to_bms:
                brand_to_bms[brand_name] = []
            for em in found_emails:
                if em not in brand_to_bms[brand_name]:
                    brand_to_bms[brand_name].append(em)

    if not brand_to_bms:
        raise ValueError("Không tìm thấy dòng dữ liệu nào có Tên nhãn hàng và Email hợp lệ.")

    return sync_bm_from_parsed_dict(db, brand_to_bms)

