from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, UserInfo, MessageResponse, ChangePasswordRequest
from app.services.auth_service import login, change_user_password
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Đăng nhập hệ thống",
    description="Xác thực tài khoản bằng username và password, trả về JWT Access Token và thông tin phân quyền."
)
def api_login(
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    return login(
        db=db,
        username=payload.username,
        password=payload.password,
        remember_me=bool(payload.remember_me)
    )


@router.get(
    "/me",
    response_model=UserInfo,
    summary="Thông tin người dùng hiện tại",
    description="Lấy thông tin tài khoản và danh sách quyền hạn dựa trên Bearer Token đã xác thực."
)
def api_get_me(
    current_user: UserInfo = Depends(get_current_user)
):
    return current_user


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Đăng xuất khỏi hệ thống",
    description="Hủy phiên đăng nhập của người dùng."
)
def api_logout(
    current_user: UserInfo = Depends(get_current_user)
):
    return MessageResponse(
        success=True,
        message=f"Tài khoản {current_user.username} đã đăng xuất thành công."
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Đổi mật khẩu người dùng",
    description="Cho phép người dùng đã đăng nhập tự thay đổi mật khẩu của chính mình bằng cách cung cấp mật khẩu cũ và mật khẩu mới."
)
def api_change_password(
    payload: ChangePasswordRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return change_user_password(
        db=db,
        username=current_user.username,
        current_password=payload.current_password,
        new_password=payload.new_password,
        confirm_password=payload.confirm_password
    )
