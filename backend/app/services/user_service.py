from datetime import datetime
from typing import List, Optional, Tuple
from sqlalchemy import func, select, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, RoleLevel
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserUpdate, UserItemResponse, UserListResponse
from app.services.auth_service import ROLE_NAMES, parse_user_roles


def log_admin_action(
    db: Session,
    screen: str,
    action: str,
    actor: str,
    content: str
):
    """Ghi nhận lịch sử thao tác vào dbo.LOGS và dbo.LOGS__New"""
    try:
        log_entry = AuditLog(
            manhinh=screen,
            chucnang=action,
            user_thuchien=actor,
            noidung=content,
            ngay_insert=datetime.now(),
            active=True
        )
        db.add(log_entry)
    except Exception as e:
        logger.warning(f"Lỗi ghi dbo.LOGS: {e}")

    try:
        from app.services.log_service import LogService
        LogService.record_log(
            db=db,
            nhom_quyen="ADMIN",
            man_hinh=screen,
            hanh_dong=action,
            noi_dung=content,
            user_thuchien=actor
        )
    except Exception as e:
        logger.warning(f"Lỗi ghi dbo.LOGS__New từ log_admin_action: {e}")


ROLE_CODE_TO_CANONICAL = {
    "admin": "1",
    "administrator": "1",
    "1": "1",
    "0": "0",
    "app": "2",
    "it application": "2",
    "it_application": "2",
    "2": "2",
    "helpdesk": "3",
    "it helpdesk": "3",
    "it_helpdesk": "3",
    "3": "3",
    "inventory": "inventory",
    "inv": "inventory",
    "4": "inventory",
}


def format_roles_to_phanquyen(roles: Optional[List[str]], phanquyen: Optional[str]) -> str:
    """Format multiple roles into stored canonical phanquyen string ('1', '2', '3', 'inventory')"""
    if roles is not None and len(roles) > 0:
        cleaned = []
        for r in roles:
            rc = str(r).strip().lower()
            canonical = ROLE_CODE_TO_CANONICAL.get(rc, rc)
            if canonical and canonical not in cleaned:
                cleaned.append(canonical)
        return ",".join(cleaned) if cleaned else "2"
    if phanquyen and phanquyen.strip():
        parts = [p.strip().lower() for p in phanquyen.split(",") if p.strip()]
        cleaned = []
        for p in parts:
            canonical = ROLE_CODE_TO_CANONICAL.get(p, p)
            if canonical and canonical not in cleaned:
                cleaned.append(canonical)
        return ",".join(cleaned) if cleaned else "2"
    return "2"


def resolve_role_info(role_levels_map: dict, phanquyen: Optional[str], quyen_mo_rong: Optional[str]) -> Tuple[List[str], str, Optional[str]]:
    roles, role_name = parse_user_roles(phanquyen)
    role_level_name = None
    if quyen_mo_rong and str(quyen_mo_rong) in role_levels_map:
        role_level_name = role_levels_map[str(quyen_mo_rong)]
    return roles, role_name, role_level_name


def get_users(
    db: Session,
    search: Optional[str] = None,
    phanquyen: Optional[str] = None,
    active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> UserListResponse:
    # Build query
    query = select(User)

    if search:
        term = f"%{search.strip().lower()}%"
        query = query.where(
            or_(
                func.lower(User.user_name1).like(term),
                func.lower(User.full_name).like(term),
                func.lower(User.email).like(term),
                func.lower(User.manv).like(term),
            )
        )

    if phanquyen and phanquyen.strip():
        target = phanquyen.strip().lower()
        if target in ["inventory", "4"]:
            conds = [User.phanquyen.like("%inventory%"), User.phanquyen.like("%4%")]
        elif target in ["admin", "1"]:
            conds = [User.phanquyen.like("%admin%"), User.phanquyen.like("%1%")]
        elif target in ["app", "2"]:
            conds = [User.phanquyen.like("%app%"), User.phanquyen.like("%2%")]
        elif target in ["helpdesk", "3"]:
            conds = [User.phanquyen.like("%helpdesk%"), User.phanquyen.like("%3%")]
        else:
            conds = [User.phanquyen.like(f"%{target}%")]
        query = query.where(or_(*conds))

    if active is not None:
        query = query.where(User.active == active)

    # Count total
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0

    # Get items
    query = query.order_by(User.id.desc()).offset(skip).limit(limit)
    users = db.scalars(query).all()

    # Pre-fetch role levels for fast lookup
    all_levels = db.scalars(select(RoleLevel)).all()
    levels_map = {str(lvl.id): lvl.tenquyen for lvl in all_levels if lvl.tenquyen}

    items: List[UserItemResponse] = []
    for u in users:
        roles, role_name, role_level_name = resolve_role_info(levels_map, u.phanquyen, u.quyen_mo_rong)
        items.append(
            UserItemResponse(
                id=u.id,
                username=u.user_name1,
                full_name=u.full_name,
                email=u.email,
                manv=u.manv,
                phanquyen=u.phanquyen,
                roles=roles,
                role_name=role_name,
                quyen_mo_rong=u.quyen_mo_rong,
                role_level_name=role_level_name,
                active=bool(u.active),
                ngay_insert=u.ngay_insert,
                ngay_update=u.ngay_update,
                note=u.note
            )
        )

    return UserListResponse(items=items, total=total)


def get_user_by_id(db: Session, user_id: int) -> UserItemResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    all_levels = db.scalars(select(RoleLevel)).all()
    levels_map = {str(lvl.id): lvl.tenquyen for lvl in all_levels if lvl.tenquyen}
    roles, role_name, role_level_name = resolve_role_info(levels_map, user.phanquyen, user.quyen_mo_rong)

    return UserItemResponse(
        id=user.id,
        username=user.user_name1,
        full_name=user.full_name,
        email=user.email,
        manv=user.manv,
        phanquyen=user.phanquyen,
        roles=roles,
        role_name=role_name,
        quyen_mo_rong=user.quyen_mo_rong,
        role_level_name=role_level_name,
        active=bool(user.active),
        ngay_insert=user.ngay_insert,
        ngay_update=user.ngay_update,
        note=user.note
    )


def create_user(db: Session, data: UserCreate, actor: str) -> UserItemResponse:
    clean_username = data.username.strip().lower()

    # Check reserved admin name
    if clean_username == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên người dùng 'admin' là tên hệ thống dự phòng, không thể tạo mới."
        )

    # Check username duplicate
    existing_user = db.scalar(
        select(User).where(func.lower(User.user_name1) == clean_username)
    )
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên đăng nhập '{data.username}' đã tồn tại trong hệ thống."
        )

    # Check email duplicate if provided
    if data.email and data.email.strip():
        existing_email = db.scalar(
            select(User).where(func.lower(User.email) == data.email.strip().lower())
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{data.email}' đã được liên kết với một tài khoản khác."
            )

    now = datetime.now()
    target_phanquyen = format_roles_to_phanquyen(data.roles, data.phanquyen)
    new_user = User(
        user_name1=clean_username,
        pass_=data.password.strip(),
        full_name=data.full_name.strip(),
        email=data.email.strip() if data.email else None,
        manv=data.manv.strip() if data.manv else None,
        phanquyen=target_phanquyen,
        quyen_mo_rong=data.quyen_mo_rong or "0",
        active=data.active,
        ngay_insert=now
    )
    db.add(new_user)
    db.flush()

    # Audit log
    log_content = (
        f"Insert_user: User={clean_username} - Full Name={data.full_name} - "
        f"Email={data.email} - MANV={data.manv} - Phân quyền={target_phanquyen} - "
        f"Quyền mở rộng={data.quyen_mo_rong} - Active={data.active}"
    )
    log_admin_action(db, "Admin", "Insert_user", actor, log_content)
    db.commit()
    db.refresh(new_user)

    return get_user_by_id(db, new_user.id)


def update_user(db: Session, user_id: int, data: UserUpdate, actor: str) -> UserItemResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    # Check email duplicate if changed
    if data.email and data.email.strip():
        clean_email = data.email.strip().lower()
        existing_email = db.scalar(
            select(User).where(func.lower(User.email) == clean_email, User.id != user_id)
        )
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{data.email}' đã được liên kết với một tài khoản khác."
            )

    now = datetime.now()
    target_phanquyen = format_roles_to_phanquyen(data.roles, data.phanquyen)
    user.full_name = data.full_name.strip()
    user.email = data.email.strip() if data.email else None
    user.manv = data.manv.strip() if data.manv else None
    user.phanquyen = target_phanquyen
    user.quyen_mo_rong = data.quyen_mo_rong or "0"
    user.active = data.active
    user.ngay_update = now

    log_content = (
        f"Update_user: User={user.user_name1} - Full Name={data.full_name} - "
        f"Email={data.email} - MANV={data.manv} - Phân quyền={target_phanquyen} - "
        f"Quyền mở rộng={data.quyen_mo_rong} - Active={data.active}"
    )
    log_admin_action(db, "Admin", "Update_user", actor, log_content)
    db.commit()
    db.refresh(user)

    return get_user_by_id(db, user.id)


def reset_user_password(db: Session, user_id: int, new_password: str, actor: str) -> None:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    user.pass_ = new_password.strip()
    user.ngay_update = datetime.now()

    log_content = f"Reset Pass: *********** - User: {user.user_name1}"
    log_admin_action(db, "Admin", "Reset Pass", actor, log_content)
    db.commit()


def toggle_user_active(db: Session, user_id: int, active: bool, actor: str) -> UserItemResponse:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng.")

    user.active = active
    user.ngay_update = datetime.now()

    action_label = "Kích hoạt" if active else "Khóa tài khoản"
    log_content = f"{action_label}: User={user.user_name1} (active={active})"
    log_admin_action(db, "Admin", "Toggle_Active", actor, log_content)
    db.commit()
    db.refresh(user)

    return get_user_by_id(db, user.id)
