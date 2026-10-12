from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., description="Tên đăng nhập")
    password: str = Field(..., description="Mật khẩu")
    remember_me: Optional[bool] = Field(default=False, description="Ghi nhớ đăng nhập")


class UserInfo(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    manv: Optional[str] = None
    phanquyen: Optional[str] = None
    roles: List[str] = Field(default_factory=list, description="Danh sách các nhóm quyền (admin, app, helpdesk, inventory)")
    role_name: Optional[str] = None
    quyen_mo_rong: Optional[str] = None
    is_super_admin: bool = Field(default=False, description="Chỉ duy nhất tài khoản admin/admin9528077 mới là Super Admin")
    permissions: Dict[str, bool] = Field(default_factory=dict)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserInfo


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Mật khẩu hiện tại")
    new_password: str = Field(..., min_length=4, max_length=100, description="Mật khẩu mới")
    confirm_password: Optional[str] = Field(None, description="Xác nhận mật khẩu mới")

