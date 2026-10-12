from __future__ import annotations

from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import select, func, desc, or_, and_
from sqlalchemy.orm import Session

from app.models.violation import Violation, StaffLeaveLog, StaffLeaveType
from app.models.user import User
from app.schemas.violation import (
    ViolationCreate,
    ViolationBatchCreate,
    ViolationUpdate,
    ViolationResponse,
    ViolationListResponse,
    LeaveLogCreate,
    LeaveLogUpdate,
    LeaveLogResponse,
    LeaveLogListResponse,
    LeaveTypeCreate,
    LeaveTypeUpdate,
    LeaveTypeResponse,
)


def create_violations_batch(db: Session, payload: ViolationBatchCreate, current_username: str) -> List[Violation]:
    now = datetime.now()
    results = []
    
    clean_usernames = [u.strip() for u in payload.nguoi_saiphams if u.strip()]
    if not clean_usernames:
        return results

    user_map = {}
    lower_unames = [u.lower() for u in clean_usernames]
    users = db.scalars(select(User).where(func.lower(User.user_name1).in_(lower_unames))).all()
    for u in users:
        user_map[u.user_name1.lower()] = u.full_name or u.user_name1

    for uname in clean_usernames:
        full_name = user_map.get(uname.lower(), uname)
        violation = Violation(
            NGUOI_SAIPHAMM=uname,
            HO_TEN=full_name,
            NOIDUNG=payload.noidung.strip(),
            LOAI_SAIPHAM=payload.loai_saipham or "other",
            DATE_SAIPHAM=payload.date_saipham or now,
            GIAITRINH=payload.giaitrinh,
            TRANGTHAI=False,
            IMAGES=payload.images,
            FILES=payload.files,
            DATE_INSERT=now,
            DATE_UPDATE=now,
            USER_INSERT=current_username,
            USER_UPDATE=current_username,
            ACTIVE=True,
        )
        db.add(violation)
        results.append(violation)

    db.commit()
    for v in results:
        db.refresh(v)
    return results


def create_violation(db: Session, payload: ViolationCreate, current_username: str) -> Violation:
    now = datetime.now()
    user_obj = db.scalar(select(User).where(func.lower(User.user_name1) == payload.nguoi_saipham.strip().lower()))
    full_name = payload.ho_ten or (user_obj.full_name if user_obj else payload.nguoi_saipham)

    violation = Violation(
        NGUOI_SAIPHAMM=payload.nguoi_saipham.strip(),
        HO_TEN=full_name,
        NOIDUNG=payload.noidung.strip(),
        LOAI_SAIPHAM=payload.loai_saipham or "other",
        DATE_SAIPHAM=payload.date_saipham or now,
        GIAITRINH=payload.giaitrinh,
        TRANGTHAI=False,
        IMAGES=payload.images,
        FILES=payload.files,
        DATE_INSERT=now,
        DATE_UPDATE=now,
        USER_INSERT=current_username,
        USER_UPDATE=current_username,
        ACTIVE=True,
    )
    db.add(violation)
    db.commit()
    db.refresh(violation)
    return violation


def get_violations(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None,
    username: Optional[str] = None,
    loai_saipham: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> ViolationListResponse:
    base_where = [Violation.ACTIVE == True]

    if month and year:
        base_where.append(func.month(Violation.DATE_SAIPHAM) == month)
        base_where.append(func.year(Violation.DATE_SAIPHAM) == year)
    elif year:
        base_where.append(func.year(Violation.DATE_SAIPHAM) == year)

    if username and username.strip() and username != "ALL":
        base_where.append(func.lower(Violation.NGUOI_SAIPHAMM) == username.strip().lower())

    if loai_saipham and loai_saipham.strip() and loai_saipham != "ALL":
        base_where.append(Violation.LOAI_SAIPHAM == loai_saipham.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_where.append(
            or_(
                Violation.NOIDUNG.ilike(term),
                Violation.NGUOI_SAIPHAMM.ilike(term),
                Violation.HO_TEN.ilike(term),
                Violation.GIAITRINH.ilike(term),
            )
        )

    stmt = select(Violation).where(and_(*base_where)).order_by(desc(Violation.DATE_SAIPHAM), desc(Violation.id))
    total = db.scalar(select(func.count(Violation.id)).where(and_(*base_where))) or 0
    items = db.scalars(stmt.offset(offset).limit(limit)).all()

    resp_items = [
        ViolationResponse(
            id=i.id,
            nguoi_saipham=i.NGUOI_SAIPHAMM,
            ho_ten=i.HO_TEN,
            noidung=i.NOIDUNG,
            loai_saipham=i.LOAI_SAIPHAM,
            date_saipham=i.DATE_SAIPHAM,
            giaitrinh=i.GIAITRINH,
            trangthai=i.TRANGTHAI or False,
            images=i.IMAGES,
            files=i.FILES,
            date_insert=i.DATE_INSERT,
            date_update=i.DATE_UPDATE,
            user_insert=i.USER_INSERT,
            user_update=i.USER_UPDATE,
            active=i.ACTIVE,
        )
        for i in items
    ]
    return ViolationListResponse(items=resp_items, total=total)


def update_violation(db: Session, violation_id: int, payload: ViolationUpdate, current_username: str) -> Violation:
    item = db.scalar(select(Violation).where(Violation.id == violation_id, Violation.ACTIVE == True))
    if not item:
        raise ValueError("Không tìm thấy ghi nhận sai phạm.")

    now = datetime.now()
    if payload.ho_ten is not None:
        item.HO_TEN = payload.ho_ten
    if payload.noidung is not None:
        item.NOIDUNG = payload.noidung.strip()
    if payload.loai_saipham is not None:
        item.LOAI_SAIPHAM = payload.loai_saipham
    if payload.date_saipham is not None:
        item.DATE_SAIPHAM = payload.date_saipham
    if payload.giaitrinh is not None:
        item.GIAITRINH = payload.giaitrinh
    if payload.trangthai is not None:
        item.TRANGTHAI = payload.trangthai
    if payload.images is not None:
        item.IMAGES = payload.images
    if payload.files is not None:
        item.FILES = payload.files

    item.DATE_UPDATE = now
    item.USER_UPDATE = current_username
    db.commit()
    db.refresh(item)
    return item


def delete_violation(db: Session, violation_id: int, current_username: str) -> bool:
    item = db.scalar(select(Violation).where(Violation.id == violation_id, Violation.ACTIVE == True))
    if not item:
        return False
    item.ACTIVE = False
    item.DATE_UPDATE = datetime.now()
    item.USER_UPDATE = current_username
    db.commit()
    return True


# ================= STAFF LEAVE LOGS =================

def create_leave_log(db: Session, payload: LeaveLogCreate, current_username: str) -> StaffLeaveLog:
    user_obj = db.scalar(select(User).where(func.lower(User.user_name1) == payload.username.strip().lower()))
    full_name = payload.full_name or (user_obj.full_name if user_obj else payload.username)

    log = StaffLeaveLog(
        USERNAME=payload.username.strip(),
        FULL_NAME=full_name,
        LEAVE_TYPE=payload.leave_type,
        START_TIME=payload.start_time,
        END_TIME=payload.end_time,
        REASON=payload.reason,
        NOTE=payload.note,
        USER_INSERT=current_username,
        DATE_INSERT=datetime.now(),
        ACTIVE=True,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_leave_logs(
    db: Session,
    month: Optional[int] = None,
    year: Optional[int] = None,
    username: Optional[str] = None,
    leave_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> LeaveLogListResponse:
    base_where = [StaffLeaveLog.ACTIVE == True]

    if month and year:
        base_where.append(func.month(StaffLeaveLog.START_TIME) == month)
        base_where.append(func.year(StaffLeaveLog.START_TIME) == year)
    elif year:
        base_where.append(func.year(StaffLeaveLog.START_TIME) == year)

    if username and username.strip() and username != "ALL":
        base_where.append(func.lower(StaffLeaveLog.USERNAME) == username.strip().lower())

    if leave_type and leave_type.strip() and leave_type != "ALL":
        clean_types = [t.strip() for t in leave_type.split(",") if t.strip() and t.strip() != "ALL"]
        if len(clean_types) == 1:
            base_where.append(StaffLeaveLog.LEAVE_TYPE == clean_types[0])
        elif len(clean_types) > 1:
            base_where.append(StaffLeaveLog.LEAVE_TYPE.in_(clean_types))

    if search and search.strip():
        term = f"%{search.strip()}%"
        base_where.append(
            or_(
                StaffLeaveLog.REASON.ilike(term),
                StaffLeaveLog.NOTE.ilike(term),
                StaffLeaveLog.USERNAME.ilike(term),
                StaffLeaveLog.FULL_NAME.ilike(term),
            )
        )

    stmt = select(StaffLeaveLog).where(and_(*base_where)).order_by(desc(StaffLeaveLog.START_TIME), desc(StaffLeaveLog.id))
    total = db.scalar(select(func.count(StaffLeaveLog.id)).where(and_(*base_where))) or 0
    items = db.scalars(stmt.offset(offset).limit(limit)).all()

    resp_items = [
        LeaveLogResponse(
            id=i.id,
            username=i.USERNAME,
            full_name=i.FULL_NAME,
            leave_type=i.LEAVE_TYPE,
            start_time=i.START_TIME,
            end_time=i.END_TIME,
            reason=i.REASON,
            note=i.NOTE,
            user_insert=i.USER_INSERT,
            date_insert=i.DATE_INSERT,
            active=i.ACTIVE,
        )
        for i in items
    ]
    return LeaveLogListResponse(items=resp_items, total=total)


def update_leave_log(db: Session, leave_id: int, payload: LeaveLogUpdate, current_username: str) -> StaffLeaveLog:
    item = db.scalar(select(StaffLeaveLog).where(StaffLeaveLog.id == leave_id, StaffLeaveLog.ACTIVE == True))
    if not item:
        raise ValueError("Không tìm thấy ghi nhận nghỉ phép.")

    if payload.username is not None:
        item.USERNAME = payload.username
    if payload.full_name is not None:
        item.FULL_NAME = payload.full_name
    if payload.leave_type is not None:
        item.LEAVE_TYPE = payload.leave_type
    if payload.start_time is not None:
        item.START_TIME = payload.start_time
    if payload.end_time is not None:
        item.END_TIME = payload.end_time
    if payload.reason is not None:
        item.REASON = payload.reason
    if payload.note is not None:
        item.NOTE = payload.note

    db.commit()
    db.refresh(item)
    return item


def delete_leave_log(db: Session, leave_id: int, current_username: str) -> bool:
    item = db.scalar(select(StaffLeaveLog).where(StaffLeaveLog.id == leave_id, StaffLeaveLog.ACTIVE == True))
    if not item:
        return False
    item.ACTIVE = False
    db.commit()
    return True


# ================= STAFF LEAVE TYPES =================

def _slugify_type_code(text: str) -> str:
    import unicodedata
    import re
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    slug = re.sub(r'[^a-zA-Z0-9]+', '_', text.lower()).strip('_')
    return slug or "custom_leave"


def ensure_default_leave_types(db: Session) -> None:
    """Đảm bảo các loại nghỉ chuẩn (cả ngày, ca sáng, ca chiều...) luôn đầy đủ."""
    try:
        # Nếu còn 'half_day' cũ, chuyển sang 'half_day_morning'
        half_day = db.scalar(select(StaffLeaveType).where(StaffLeaveType.CODE == 'half_day'))
        if half_day:
            half_day.CODE = 'half_day_morning'
            half_day.NAME = 'Nghỉ nửa ngày ca sáng'
            half_day.COLOR = '#8B5CF6'
            half_day.SORT_ORDER = 2
            db.commit()

        # Kiểm tra và thêm half_day_morning nếu chưa có
        hdm = db.scalar(select(StaffLeaveType).where(StaffLeaveType.CODE == 'half_day_morning'))
        if not hdm:
            hdm = StaffLeaveType(
                CODE='half_day_morning',
                NAME='Nghỉ nửa ngày ca sáng',
                COLOR='#8B5CF6',
                SORT_ORDER=2,
                IS_ACTIVE=True,
                USER_INSERT='system',
            )
            db.add(hdm)
            db.commit()

        # Kiểm tra và thêm half_day_afternoon nếu chưa có
        hda = db.scalar(select(StaffLeaveType).where(StaffLeaveType.CODE == 'half_day_afternoon'))
        if not hda:
            hda = StaffLeaveType(
                CODE='half_day_afternoon',
                NAME='Nghỉ nửa ngày ca chiều',
                COLOR='#A855F7',
                SORT_ORDER=3,
                IS_ACTIVE=True,
                USER_INSERT='system',
            )
            db.add(hda)
            db.commit()
    except Exception:
        db.rollback()


def get_leave_types(db: Session, include_inactive: bool = False) -> List[LeaveTypeResponse]:
    ensure_default_leave_types(db)
    query = select(StaffLeaveType)
    if not include_inactive:
        query = query.where(StaffLeaveType.IS_ACTIVE == True)
    query = query.order_by(StaffLeaveType.SORT_ORDER.asc(), StaffLeaveType.id.asc())
    items = db.scalars(query).all()
    return [
        LeaveTypeResponse(
            id=i.id,
            code=i.CODE,
            name=i.NAME,
            color=i.COLOR,
            sort_order=i.SORT_ORDER or 0,
            is_active=i.IS_ACTIVE if i.IS_ACTIVE is not None else True,
        )
        for i in items
    ]


def create_leave_type(db: Session, payload: LeaveTypeCreate, current_username: str) -> StaffLeaveType:
    name_clean = payload.name.strip()
    if not name_clean:
        raise ValueError("Tên loại ghi nhận không được để trống.")

    raw_code = (payload.code or "").strip()
    code = raw_code if raw_code else _slugify_type_code(name_clean)

    # Check duplicate code
    existing = db.scalar(select(StaffLeaveType).where(func.lower(StaffLeaveType.CODE) == code.lower()))
    if existing:
        if not existing.IS_ACTIVE:
            # Re-activate
            existing.IS_ACTIVE = True
            existing.NAME = name_clean
            if payload.color:
                existing.COLOR = payload.color
            if payload.sort_order is not None:
                existing.SORT_ORDER = payload.sort_order
            existing.DATE_UPDATE = datetime.now()
            existing.USER_UPDATE = current_username
            db.commit()
            db.refresh(existing)
            return existing
        raise ValueError(f"Mã loại '{code}' đã tồn tại trong hệ thống.")

    # Determine sort order if not given
    sort_order = payload.sort_order
    if sort_order is None or sort_order == 0:
        max_sort = db.scalar(select(func.max(StaffLeaveType.SORT_ORDER))) or 0
        sort_order = max_sort + 1

    item = StaffLeaveType(
        CODE=code,
        NAME=name_clean,
        COLOR=payload.color or "#3B82F6",
        SORT_ORDER=sort_order,
        IS_ACTIVE=payload.is_active if payload.is_active is not None else True,
        DATE_INSERT=datetime.now(),
        USER_INSERT=current_username,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_leave_type(db: Session, type_id: int, payload: LeaveTypeUpdate, current_username: str) -> StaffLeaveType:
    item = db.scalar(select(StaffLeaveType).where(StaffLeaveType.id == type_id))
    if not item:
        raise ValueError("Không tìm thấy loại ghi nhận.")

    if payload.name is not None:
        name_clean = payload.name.strip()
        if not name_clean:
            raise ValueError("Tên loại không được để trống.")
        item.NAME = name_clean

    if payload.code is not None:
        code_clean = payload.code.strip()
        if code_clean and code_clean.lower() != item.CODE.lower():
            dup = db.scalar(select(StaffLeaveType).where(func.lower(StaffLeaveType.CODE) == code_clean.lower(), StaffLeaveType.id != type_id))
            if dup:
                raise ValueError(f"Mã loại '{code_clean}' đã được sử dụng.")
            # Also update records in STAFF_LEAVE_LOGS if leave_type changed
            old_code = item.CODE
            item.CODE = code_clean
            logs = db.scalars(select(StaffLeaveLog).where(StaffLeaveLog.LEAVE_TYPE == old_code)).all()
            for l in logs:
                l.LEAVE_TYPE = code_clean

    if payload.color is not None:
        item.COLOR = payload.color
    if payload.sort_order is not None:
        item.SORT_ORDER = payload.sort_order
    if payload.is_active is not None:
        item.IS_ACTIVE = payload.is_active

    item.DATE_UPDATE = datetime.now()
    item.USER_UPDATE = current_username
    db.commit()
    db.refresh(item)
    return item


def delete_leave_type(db: Session, type_id: int, current_username: str) -> bool:
    item = db.scalar(select(StaffLeaveType).where(StaffLeaveType.id == type_id))
    if not item:
        return False
    # Soft delete / de-activate
    item.IS_ACTIVE = False
    item.DATE_UPDATE = datetime.now()
    item.USER_UPDATE = current_username
    db.commit()
    return True

