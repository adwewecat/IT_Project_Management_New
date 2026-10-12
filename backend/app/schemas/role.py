from typing import Optional, List
from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    tenquyen: str = Field(..., min_length=2, max_length=50, description="Tên nhóm quyền (UPPERCASE)")
    noidung: Optional[str] = Field(default=None, max_length=250, description="Mô tả nhóm quyền")
    active: bool = Field(default=True, description="Trạng thái hoạt động")


class RoleUpdate(BaseModel):
    noidung: Optional[str] = Field(default=None, max_length=250, description="Mô tả nhóm quyền")
    active: bool = Field(default=True, description="Trạng thái hoạt động")


class RoleItemResponse(BaseModel):
    id: int
    tenquyen: Optional[str] = None
    noidung: Optional[str] = None
    active: bool
    user_count: int = 0


class PermissionDetailItem(BaseModel):
    id: Optional[int] = None
    chucnang: str
    active: bool
    module_group: Optional[str] = None
    action_label: Optional[str] = None


class RoleWithPermissionsResponse(BaseModel):
    role: RoleItemResponse
    permissions: List[PermissionDetailItem]


class UpdateRolePermissionsRequest(BaseModel):
    permissions: List[PermissionDetailItem]


class AddCustomPermissionRequest(BaseModel):
    chucnang: str = Field(..., min_length=2, max_length=100, description="Mã quyền, vd: view_address, update_sap")
    module_group: str = Field(default="Danh Sách Nhà Hàng", max_length=100, description="Tên nhóm phân hệ")
    action_label: str = Field(..., min_length=2, max_length=200, description="Tên hiển thị diễn giải")
    target_role_id: Optional[int] = Field(default=None, description="Nếu có thì chỉ thêm cho nhóm này, nếu None thì thêm cho tất cả nhóm")
    create_db_column: bool = Field(default=False, description="Tự động tạo cột vào bảng CSDL dbo.RESTAURANT nếu chưa có")
    db_data_type: Optional[str] = Field(default="NVARCHAR(255)", description="Kiểu dữ liệu trong CSDL nếu tạo cột")
