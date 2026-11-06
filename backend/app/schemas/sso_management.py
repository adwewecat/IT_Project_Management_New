from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class SSOConfigRequest(BaseModel):
    sso_username: str = Field(..., description="Tên đăng nhập hoặc email SSO (ví dụ dung.nguyenanh@ggg.com.vn)")
    sso_password: str = Field(..., description="Mật khẩu tài khoản SSO")


class SSOConfigResponse(BaseModel):
    configured: bool
    sso_username: Optional[str] = None
    last_status: Optional[str] = None
    last_tested_at: Optional[datetime] = None
    message: Optional[str] = None


class SSOTestLoginResponse(BaseModel):
    success: bool
    message: str
    sso_username: Optional[str] = None


class SSOSearchUserRequest(BaseModel):
    search: str = Field(..., description="Từ khóa tìm kiếm (username, email, SĐT, mã nhân viên)")


class IAMUserItem(BaseModel):
    user_id: str
    user_name: str
    email: Optional[str] = ""
    phone_number: Optional[str] = ""
    lock_enable: Optional[str] = ""
    user_type: Optional[str] = ""
    edit_url: Optional[str] = ""


class SSOSearchUserResponse(BaseModel):
    success: bool
    message: str
    items: List[IAMUserItem] = []
    total: int = 0
    has_more: bool = False


class SSOChangePasswordRequest(BaseModel):
    user_id: str = Field(..., description="ID / GUID của user trên IAM")
    custom_password: Optional[str] = Field(None, description="Mật khẩu tùy chọn hoặc bỏ trống để tự tạo mật khẩu ngẫu nhiên đạt chuẩn")


class SSOChangePasswordResponse(BaseModel):
    success: bool
    message: str
    new_password: Optional[str] = None
    is_ldap: bool = False
    user_name: Optional[str] = None


class SSOAssignClientsRequest(BaseModel):
    user_id: str = Field(..., description="ID / GUID của user trên IAM")
    client_names: Optional[List[str]] = Field(None, description="Danh sách tên các client cần phân quyền (nếu để trống sẽ dùng 14 client mặc định)")


class SSOAssignClientsResponse(BaseModel):
    success: bool
    message: str
    assigned_clients: List[str] = []
    total_assigned: int = 0


class SSOCreateNCCUserRequest(BaseModel):
    user_name: str = Field(..., description="Tên đăng nhập (User Name)")
    email: str = Field(..., description="Email của user NCC")
    phone_number: str = Field(..., description="Số điện thoại của user (mặc định 0908119345)")
    auto_resolve_phone: bool = Field(False, description="Nếu trùng số điện thoại, tự động tăng số để tìm số khả dụng")
    client_names: Optional[List[str]] = Field(None, description="Danh sách các client cần phân quyền cho user NCC")


class SSOCreateNCCUserResponse(BaseModel):
    success: bool
    message: str
    user_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    user_id: Optional[str] = None
    new_password: Optional[str] = None
    assigned_clients: List[str] = []
    is_duplicate_phone: bool = False



class SSOBulkRowItem(BaseModel):
    user_name: Optional[str] = ""
    email: Optional[str] = ""
    user_type: Optional[str] = "0"
    phone_number: Optional[str] = ""
    pass_word: Optional[str] = ""
    trang_thai: Optional[str] = ""
    update_quyen: Optional[str] = ""
    new_email: Optional[str] = ""
    new_phone: Optional[str] = ""
    new_user_type: Optional[str] = ""


class SSOBulkParseResponse(BaseModel):
    success: bool
    message: str
    rows: List[SSOBulkRowItem] = []
    total_rows: int = 0


class SSOBulkProcessItemRequest(BaseModel):
    action: str = Field(..., description="1 trong 5: create, update_pass, lock, update_permissions, update_info")
    user_name: Optional[str] = ""
    email: Optional[str] = ""
    user_type: Optional[str] = "0"
    phone_number: Optional[str] = ""
    pass_word: Optional[str] = ""
    trang_thai: Optional[str] = ""
    update_quyen: Optional[str] = ""
    new_email: Optional[str] = ""
    new_phone: Optional[str] = ""
    new_user_type: Optional[str] = ""


class SSOBulkProcessItemResponse(BaseModel):
    success: bool
    user_name: Optional[str] = ""
    email: Optional[str] = ""
    action: str
    message: str
    detail: Optional[str] = None
    new_password: Optional[str] = None
    assigned_clients: List[str] = []
    is_ldap: bool = False
