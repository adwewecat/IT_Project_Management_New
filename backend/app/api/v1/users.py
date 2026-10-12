from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserInfo, MessageResponse
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResetPassword,
    UserToggleStatus,
    UserItemResponse,
    UserListResponse,
)
from app.services.user_service import (
    get_users,
    get_user_by_id,
    create_user,
    update_user,
    reset_user_password,
    toggle_user_active,
)
from app.api.deps import require_admin

router = APIRouter(prefix="/users", tags=["Users Management"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="Danh sách người dùng",
    description="Lấy danh sách người dùng hệ thống có phân trang và bộ lọc tìm kiếm. Yêu cầu quyền Admin."
)
def api_get_users(
    search: Optional[str] = Query(None, description="Tìm kiếm theo username, họ tên, email, manv"),
    phanquyen: Optional[str] = Query(None, description="Lọc theo nhóm quyền (1, 2, 3,...)"),
    active: Optional[bool] = Query(None, description="Lọc theo trạng thái hoạt động"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return get_users(db, search=search, phanquyen=phanquyen, active=active, skip=skip, limit=limit)


@router.post(
    "",
    response_model=UserItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm người dùng mới",
    description="Tạo mới tài khoản người dùng và lưu vào dbo.LIST_USER. Yêu cầu quyền Admin."
)
def api_create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return create_user(db, payload, actor=admin.username)


@router.get(
    "/{user_id}",
    response_model=UserItemResponse,
    summary="Chi tiết người dùng",
    description="Lấy thông tin chi tiết một người dùng theo ID."
)
def api_get_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return get_user_by_id(db, user_id)


@router.put(
    "/{user_id}",
    response_model=UserItemResponse,
    summary="Cập nhật thông tin người dùng",
    description="Cập nhật họ tên, email, manv, nhóm quyền và trạng thái. Yêu cầu quyền Admin."
)
def api_update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return update_user(db, user_id, payload, actor=admin.username)


@router.post(
    "/{user_id}/reset-password",
    response_model=MessageResponse,
    summary="Reset / Đổi mật khẩu",
    description="Đổi mật khẩu cho người dùng. Yêu cầu quyền Admin."
)
def api_reset_password(
    user_id: int,
    payload: UserResetPassword,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    reset_user_password(db, user_id, payload.new_password, actor=admin.username)
    return MessageResponse(
        success=True,
        message="Mật khẩu của người dùng đã được cập nhật thành công."
    )


@router.patch(
    "/{user_id}/toggle-status",
    response_model=UserItemResponse,
    summary="Khóa hoặc Mở khóa tài khoản",
    description="Chuyển đổi trạng thái active của người dùng."
)
def api_toggle_status(
    user_id: int,
    payload: UserToggleStatus,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return toggle_user_active(db, user_id, payload.active, actor=admin.username)
