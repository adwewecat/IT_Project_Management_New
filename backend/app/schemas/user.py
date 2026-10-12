import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50, description="Tên đăng nhập")
    password: str = Field(..., min_length=4, max_length=100, description="Mật khẩu")
    full_name: str = Field(..., max_length=200, description="Họ và tên")
    email: Optional[str] = Field(default=None, max_length=200, description="Email công việc")
    manv: Optional[str] = Field(default=None, max_length=100, description="Mã nhân viên")
    phanquyen: Optional[str] = Field(default="2", description="Nhóm quyền (1: Admin, 2: App, 3: Helpdesk, inventory: Inventory hoặc chuỗi ghép)")
    roles: Optional[List[str]] = Field(default=None, description="Danh sách mã nhóm quyền được chọn (admin, app, helpdesk, inventory)")
    quyen_mo_rong: Optional[str] = Field(default="0", description="ID nhóm quyền trong LV_QUYEN")
    active: bool = Field(default=True, description="Trạng thái hoạt động")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v = v.strip()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Định dạng email không hợp lệ (Ví dụ: user@ggg.com.vn)")
        return v.lower()

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Tên đăng nhập phải có ít nhất 2 ký tự.")
        if " " in v:
            raise ValueError("Tên đăng nhập không được chứa khoảng trắng.")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 4:
            raise ValueError("Mật khẩu phải có ít nhất 4 ký tự.")
        return v


class UserUpdate(BaseModel):
    full_name: str = Field(..., max_length=200, description="Họ và tên")
    email: Optional[str] = Field(default=None, max_length=200, description="Email công việc")
    manv: Optional[str] = Field(default=None, max_length=100, description="Mã nhân viên")
    phanquyen: Optional[str] = Field(default=None, description="Nhóm quyền (1: Admin, 2: App, 3: Helpdesk, inventory: Inventory hoặc chuỗi ghép)")
    roles: Optional[List[str]] = Field(default=None, description="Danh sách mã nhóm quyền được chọn (admin, app, helpdesk, inventory)")
    quyen_mo_rong: Optional[str] = Field(default="0", description="ID nhóm quyền trong LV_QUYEN")
    active: bool = Field(default=True, description="Trạng thái hoạt động")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        v = v.strip()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Định dạng email không hợp lệ (Ví dụ: user@ggg.com.vn)")
        return v.lower()


class UserResetPassword(BaseModel):
    new_password: str = Field(..., min_length=4, max_length=100, description="Mật khẩu mới")


class UserToggleStatus(BaseModel):
    active: bool = Field(..., description="Trạng thái hoạt động mới")


class UserItemResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    manv: Optional[str] = None
    phanquyen: Optional[str] = None
    roles: List[str] = Field(default_factory=list, description="Danh sách mã nhóm quyền chuẩn hóa")
    role_name: Optional[str] = None
    quyen_mo_rong: Optional[str] = None
    role_level_name: Optional[str] = None
    active: bool
    ngay_insert: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    note: Optional[str] = None


class UserListResponse(BaseModel):
    items: List[UserItemResponse]
    total: int
