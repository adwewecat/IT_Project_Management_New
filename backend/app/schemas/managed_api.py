from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class ManagedAPIBase(BaseModel):
    api_code: str = Field(..., description="Mã định danh API duy nhất (slug)")
    api_name: str = Field(..., description="Tên hiển thị của API")
    endpoint_path: str = Field(..., description="Đường dẫn API chính")
    alias_path: Optional[str] = Field(None, description="Đường dẫn API phụ (alias)")
    method: str = Field("GET", description="Phương thức HTTP (GET, POST, PUT, DELETE)")
    description: Optional[str] = Field(None, description="Mô tả chức năng API")
    is_enabled: bool = Field(True, description="Trạng thái bật/tắt của API")
    require_api_key: bool = Field(False, description="Có yêu cầu API Key bảo mật hay không")
    api_key: Optional[str] = Field(None, description="Khóa API Key (nếu có)")


class ManagedAPICreate(ManagedAPIBase):
    pass


class ManagedAPIUpdate(BaseModel):
    api_name: Optional[str] = None
    endpoint_path: Optional[str] = None
    alias_path: Optional[str] = None
    method: Optional[str] = None
    description: Optional[str] = None
    is_enabled: Optional[bool] = None
    require_api_key: Optional[bool] = None
    api_key: Optional[str] = None


class ManagedAPIToggle(BaseModel):
    is_enabled: bool = Field(..., description="Trạng thái Bật (True) hoặc Tắt (False)")


class ManagedAPIItem(ManagedAPIBase):
    id: int
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ManagedAPIListResponse(BaseModel):
    success: bool = True
    total: int
    items: List[ManagedAPIItem]

