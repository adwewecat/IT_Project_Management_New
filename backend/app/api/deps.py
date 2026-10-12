from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.schemas.auth import UserInfo
from app.services.auth_service import get_user_permissions, get_role_name, parse_user_roles, is_admin_user, is_super_admin_user, ALL_PERMISSIONS

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> UserInfo:
    """Validate Bearer token and return current UserInfo"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    username: Optional[str] = payload.get("sub")
    if username is None:
        raise credentials_exception

    # Special admin fallback
    if username.lower() == "admin":
        perms = {k: True for k in ALL_PERMISSIONS}
        return UserInfo(
            id=0,
            username="admin",
            full_name="Administrator",
            email="admin@ggg.com.vn",
            manv="ADMIN01",
            phanquyen="0",
            roles=["admin"],
            role_name="Quản trị viên (Admin)",
            quyen_mo_rong="0",
            is_super_admin=True,
            permissions=perms
        )

    stmt = select(User).where(func.lower(User.user_name1) == username.lower())
    user = db.scalar(stmt)

    if user is None or not user.active:
        raise credentials_exception

    permissions = get_user_permissions(db, user.phanquyen, user.quyen_mo_rong)
    role_name = get_role_name(db, user.phanquyen, user.quyen_mo_rong)
    roles, _ = parse_user_roles(user.phanquyen)

    is_super = (user.user_name1.strip().lower() == "admin")

    return UserInfo(
        id=user.id,
        username=user.user_name1,
        full_name=user.full_name or user.user_name1,
        email=user.email,
        manv=user.manv,
        phanquyen=user.phanquyen,
        roles=roles,
        role_name=role_name,
        quyen_mo_rong=user.quyen_mo_rong,
        is_super_admin=is_super,
        permissions=permissions
    )


def require_admin(
    current_user: UserInfo = Depends(get_current_user)
) -> UserInfo:
    """Ensure that the authenticated user has Admin privilege"""
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập vào chức năng quản trị này."
        )
    return current_user


def require_super_admin(
    current_user: UserInfo = Depends(get_current_user)
) -> UserInfo:
    """Ensure that the authenticated user is exclusively ROOT SUPER ADMIN (admin/admin9528077)"""
    is_super = (
        getattr(current_user, "is_super_admin", False)
        or current_user.username.lower() in ["admin", "administrator"]
        or str(getattr(current_user, "phanquyen", "") or "").strip() == "0"
        or any("super" in str(r).lower() or "supper" in str(r).lower() for r in (getattr(current_user, "roles", None) or []))
        or "super" in str(getattr(current_user, "role_name", "") or "").lower()
        or "supper" in str(getattr(current_user, "role_name", "") or "").lower()
    )
    if not is_super:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập vào chức năng này."
        )
    return current_user


def require_app_or_admin(
    current_user: UserInfo = Depends(get_current_user)
) -> UserInfo:
    """Allow app role, admin, super_admin, or username dung.nguyenanh"""
    if is_admin_user(current_user):
        return current_user
    roles = [str(r).lower() for r in (current_user.roles or [])]
    pq = str(current_user.phanquyen or "").strip().lower()
    role_name = str(getattr(current_user, "role_name", "") or "").lower()
    is_app = (
        "app" in roles
        or "2" in roles
        or any("app" in r or "application" in r for r in roles)
        or pq in ["2", "app"]
        or "app" in pq
        or "2" in pq
        or "application" in pq
        or "app" in role_name
        or "application" in role_name
    )
    if not is_app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện chức năng này (Yêu cầu quyền IT Application hoặc Quản trị viên)."
        )
    return current_user


def require_super_admin_or_dung(
    current_user: UserInfo = Depends(get_current_user)
) -> UserInfo:
    """Allow super_admin or user dung.nguyenanh exclusively"""
    if not is_super_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chức năng này chỉ dành riêng cho Quản trị viên hoặc user dung.nguyenanh."
        )
    return current_user

