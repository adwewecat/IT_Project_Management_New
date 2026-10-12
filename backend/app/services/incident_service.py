import json
import unicodedata
from datetime import datetime, date
from typing import Optional, List, Tuple
from sqlalchemy import select, func, desc, or_, and_, text
from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentAssign,
    IncidentProgressUpdate,
    IncidentStatusUpdate,
    IncidentResponse,
    IncidentListResponse,
)


def remove_accents(input_str: Optional[str]) -> str:
    """Normalize Vietnamese text by removing diacritics / accents for flexible search."""
    if not input_str:
        return ""
    # Normalize unicode to decomposed form
    nfkd_form = unicodedata.normalize('NFKD', input_str)
    # Filter out combining marks
    result = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    # Replace special Vietnamese chars like đ, Đ
    return result.replace('đ', 'd').replace('Đ', 'D').lower()


def format_restaurant_display(sap: Optional[str], name: Optional[str], rk7: Optional[str], ip: Optional[str]) -> str:
    """Format restaurant name according to requirement: Mã Sap + tên NH + mã RK7 + (IP)
    Ví dụ: 4737 CloudPot Giga Mall Phạm Văn Đồng 761 (10.9.127.1)
    """
    parts = []
    if sap and str(sap).strip():
        parts.append(str(sap).strip())
    if name and str(name).strip():
        parts.append(str(name).strip())
    if rk7 and str(rk7).strip():
        parts.append(str(rk7).strip())
    
    main_text = " ".join(parts)
    if ip and str(ip).strip():
        ip_clean = str(ip).strip()
        if not (ip_clean.startswith("(") and ip_clean.endswith(")")):
            main_text = f"{main_text} ({ip_clean})"
        else:
            main_text = f"{main_text} {ip_clean}"
    return main_text.strip()


def to_incident_response(item: Incident) -> IncidentResponse:
    return IncidentResponse(
        id=item.id,
        appname=item.APPNAME,
        noidung=item.NOIDUNG,
        trangthai=item.TRANGTHAI or False,
        date_insert=item.DATE_INSERT,
        date_loi=item.DATE_LOI,
        user_insert=item.USER_INSERT,
        active=item.ACTIVE,
        is_private=item.IS_PRIVATE if item.IS_PRIVATE is not None else True,
        restaurant_id=item.RESTAURANT_ID,
        restaurant_name=item.RESTAURANT_NAME,
        sap_code=item.SAP_CODE,
        rk7_code=item.RK7_CODE,
        ip_address=item.IP_ADDRESS,
        assign_type=item.ASSIGN_TYPE,
        assigned_to=item.ASSIGNED_TO,
        assigned_name=item.ASSIGNED_NAME,
        progress_notes=item.PROGRESS_NOTES,
        images=item.IMAGES,
        files=item.FILES,
        resolved_at=item.RESOLVED_AT,
        resolved_by=item.RESOLVED_BY,
        date_update=item.DATE_UPDATE,
        user_update=item.USER_UPDATE,
    )


def create_incident(
    db: Session,
    payload: IncidentCreate,
    current_username: str,
    current_user_fullname: Optional[str] = None
) -> IncidentResponse:
    now = datetime.now()

    res_name = payload.restaurant_name
    if not res_name or not res_name.strip():
        res_name = format_restaurant_display(
            payload.sap_code,
            payload.restaurant_name,
            payload.rk7_code,
            payload.ip_address
        )

    assign_type = (payload.assign_type or "LEADER").upper()
    assigned_to = payload.assigned_to
    assigned_name = payload.assigned_name

    # Nếu chọn Cá Nhân xử lý thì tự động gán cho chính user tạo
    if assign_type == "INDIVIDUAL":
        assigned_to = current_username
        assigned_name = current_user_fullname or current_username

    init_note = f"[{now.strftime('%d/%m/%Y %H:%M')}] {current_username} ghi nhận sự vụ."
    if assigned_to:
        init_note += f" Phân công: {assigned_name or assigned_to} (Cá nhân tự xử lý)."

    incident = Incident(
        NOIDUNG=payload.noidung.strip(),
        TRANGTHAI=False,
        DATE_INSERT=now,
        DATE_LOI=payload.date_loi or now,
        USER_INSERT=current_username,
        ACTIVE=True,
        RESTAURANT_ID=payload.restaurant_id,
        RESTAURANT_NAME=res_name,
        SAP_CODE=str(payload.sap_code).strip() if payload.sap_code else None,
        RK7_CODE=str(payload.rk7_code).strip() if payload.rk7_code else None,
        IP_ADDRESS=str(payload.ip_address).strip() if payload.ip_address else None,
        ASSIGN_TYPE=assign_type,
        ASSIGNED_TO=assigned_to,
        ASSIGNED_NAME=assigned_name,
        PROGRESS_NOTES=init_note,
        IMAGES=payload.images,
        FILES=payload.files,
        # Nếu giao Leader phân công thì bắt buộc là Công khai (False) để Leader và Team tiếp nhận
        IS_PRIVATE=False if assign_type == "LEADER" else (payload.is_private if payload.is_private is not None else True),
        DATE_UPDATE=now,
        USER_UPDATE=current_username,
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return to_incident_response(incident)


def get_incidents(
    db: Session,
    tab: str = "pending",  # "pending" or "completed"
    search: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    user_insert: Optional[str] = None,
    assigned_to: Optional[str] = None,
    restaurant_id: Optional[int] = None,
    current_username: Optional[str] = None,
    is_super_admin: bool = False,
    limit: int = 200,
    offset: int = 0
) -> IncidentListResponse:
    base_where = [Incident.ACTIVE == True]

    # Phân tab
    is_completed = (tab.lower() == "completed")
    if is_completed:
        base_where.append(Incident.TRANGTHAI == True)
    else:
        base_where.append(or_(Incident.TRANGTHAI == False, Incident.TRANGTHAI.is_(None)))

    # Bộ lọc nhà hàng
    if restaurant_id is not None:
        base_where.append(Incident.RESTAURANT_ID == restaurant_id)

    # Quyền riêng tư:
    # Nếu không phải super admin: Chỉ xem sự vụ công khai (IS_PRIVATE=False) HOẶC sự vụ do chính mình tạo / được gán
    privacy_filter = None
    if not is_super_admin and current_username:
        cu_lower = current_username.strip().lower()
        privacy_filter = or_(
            Incident.IS_PRIVATE == False,
            Incident.IS_PRIVATE.is_(None),
            func.lower(Incident.USER_INSERT) == cu_lower,
            func.lower(Incident.ASSIGNED_TO) == cu_lower,
        )
        base_where.append(privacy_filter)

    # Bộ lọc ngày
    if from_date:
        try:
            fd = datetime.strptime(from_date, "%Y-%m-%d")
            base_where.append(Incident.DATE_INSERT >= fd)
        except Exception:
            pass
    if to_date:
        try:
            td = datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            base_where.append(Incident.DATE_INSERT <= td)
        except Exception:
            pass

    # Bộ lọc người note
    if user_insert and user_insert.strip() and user_insert != "ALL":
        base_where.append(func.lower(Incident.USER_INSERT) == user_insert.strip().lower())

    # Bộ lọc người xử lý
    if assigned_to and assigned_to.strip() and assigned_to != "ALL":
        base_where.append(func.lower(Incident.ASSIGNED_TO) == assigned_to.strip().lower())

    # Đếm số lượng theo tab (có tính quyền riêng tư và nhà hàng)
    cnt_base = [Incident.ACTIVE == True]
    if privacy_filter is not None:
        cnt_base.append(privacy_filter)
    if restaurant_id is not None:
        cnt_base.append(Incident.RESTAURANT_ID == restaurant_id)

    cnt_uncompleted = db.scalar(
        select(func.count(Incident.id)).where(*cnt_base, or_(Incident.TRANGTHAI == False, Incident.TRANGTHAI.is_(None)))
    ) or 0
    cnt_completed = db.scalar(
        select(func.count(Incident.id)).where(*cnt_base, Incident.TRANGTHAI == True)
    ) or 0

    # Lấy toàn bộ danh sách thỏa mãn base_where để hỗ trợ tìm kiếm tiếng Việt không dấu chuẩn xác
    stmt = select(Incident).where(and_(*base_where))
    if is_completed:
        # Tab đã xong: xếp theo ngày cập nhật/hoàn thành mới nhất
        stmt = stmt.order_by(desc(Incident.RESOLVED_AT), desc(Incident.DATE_UPDATE), desc(Incident.id))
    else:
        stmt = stmt.order_by(desc(Incident.DATE_INSERT), desc(Incident.id))

    records = db.scalars(stmt).all()

    # Client-level filter tiếng Việt không dấu nếu có search
    filtered_items = []
    search_clean = remove_accents(search).strip() if search else ""

    for item in records:
        if search_clean:
            haystack = " ".join([
                item.NOIDUNG or "",
                item.RESTAURANT_NAME or "",
                item.SAP_CODE or "",
                item.RK7_CODE or "",
                item.IP_ADDRESS or "",
                item.USER_INSERT or "",
                item.ASSIGNED_TO or "",
                item.ASSIGNED_NAME or "",
                item.PROGRESS_NOTES or ""
            ])
            if search_clean not in remove_accents(haystack):
                continue
        filtered_items.append(item)

    # Nếu tab Đã xong, chỉ hiện tối đa 200 lỗi gần nhất theo yêu cầu
    if is_completed:
        filtered_items = filtered_items[:200]

    total_matched = len(filtered_items)
    paginated_items = filtered_items[offset : offset + limit]

    response_items = [to_incident_response(item) for item in paginated_items]

    return IncidentListResponse(
        items=response_items,
        total=total_matched,
        uncompleted_count=cnt_uncompleted,
        completed_count=cnt_completed,
    )


def get_incident_by_id(db: Session, incident_id: int) -> Optional[Incident]:
    return db.scalar(select(Incident).where(Incident.id == incident_id, Incident.ACTIVE == True))


def assign_incident(
    db: Session,
    incident_id: int,
    payload: IncidentAssign,
    current_username: str
) -> IncidentResponse:
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        raise ValueError("Sự vụ không tồn tại hoặc đã bị xóa.")

    now = datetime.now()
    target_user = db.scalar(select(User).where(func.lower(User.user_name1) == payload.assigned_to.strip().lower()))
    full_name = payload.assigned_name or (target_user.full_name if target_user else payload.assigned_to)

    old_assignee = incident.ASSIGNED_NAME or incident.ASSIGNED_TO or "Chưa phân công"
    incident.ASSIGN_TYPE = "LEADER"
    incident.IS_PRIVATE = False
    incident.ASSIGNED_TO = payload.assigned_to.strip()
    incident.ASSIGNED_NAME = full_name
    incident.DATE_UPDATE = now
    incident.USER_UPDATE = current_username

    note_log = f"\n[{now.strftime('%d/%m/%Y %H:%M')}] {current_username} phân công cho {full_name} (Trước đó: {old_assignee})."
    incident.PROGRESS_NOTES = (incident.PROGRESS_NOTES or "") + note_log

    db.commit()
    db.refresh(incident)
    return to_incident_response(incident)


def add_progress_note(
    db: Session,
    incident_id: int,
    payload: IncidentProgressUpdate,
    current_username: str
) -> IncidentResponse:
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        raise ValueError("Sự vụ không tồn tại hoặc đã bị xóa.")

    now = datetime.now()
    incident.DATE_UPDATE = now
    incident.USER_UPDATE = current_username

    note_log = f"\n[{now.strftime('%d/%m/%Y %H:%M')}] {current_username}: {payload.note.strip()}"
    incident.PROGRESS_NOTES = (incident.PROGRESS_NOTES or "") + note_log

    db.commit()
    db.refresh(incident)
    return to_incident_response(incident)


def update_incident_status(
    db: Session,
    incident_id: int,
    payload: IncidentStatusUpdate,
    current_username: str
) -> IncidentResponse:
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        raise ValueError("Sự vụ không tồn tại hoặc đã bị xóa.")

    now = datetime.now()
    incident.TRANGTHAI = payload.trangthai
    incident.DATE_UPDATE = now
    incident.USER_UPDATE = current_username

    if payload.trangthai:
        incident.RESOLVED_AT = now
        incident.RESOLVED_BY = current_username
        status_text = "Đã hoàn thành"
    else:
        incident.RESOLVED_AT = None
        incident.RESOLVED_BY = None
        status_text = "Mở lại (Chưa hoàn thành)"

    extra = f" - Ghi chú: {payload.note.strip()}" if payload.note and payload.note.strip() else ""
    note_log = f"\n[{now.strftime('%d/%m/%Y %H:%M')}] {current_username} chuyển trạng thái sang '{status_text}'{extra}."
    incident.PROGRESS_NOTES = (incident.PROGRESS_NOTES or "") + note_log

    db.commit()
    db.refresh(incident)
    return to_incident_response(incident)


def delete_incident(db: Session, incident_id: int, current_username: str) -> bool:
    incident = get_incident_by_id(db, incident_id)
    if not incident:
        return False
    incident.ACTIVE = False
    incident.DATE_UPDATE = datetime.now()
    incident.USER_UPDATE = current_username
    db.commit()
    return True
