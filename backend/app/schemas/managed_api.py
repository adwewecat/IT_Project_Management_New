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

    # Thống kê lượt request & chống spam
    requests_24h: int = Field(0, description="Số lượt gọi trong 24 giờ qua")
    total_requests: int = Field(0, description="Tổng số lượt gọi từ trước đến nay")
    last_requested_at: Optional[datetime] = Field(None, description="Thời điểm gọi gần nhất")
    last_client_ip: Optional[str] = Field(None, description="Địa chỉ IP gọi gần nhất")
    is_high_traffic: bool = Field(False, description="Cảnh báo tần suất cao / nghi vấn spam (> 500 req/24h)")

    model_config = {"from_attributes": True}


class ManagedAPIListResponse(BaseModel):
    success: bool = True
    total: int
    items: List[ManagedAPIItem]


class ManagedAPILogItem(BaseModel):
    id: int
    api_code: str
    endpoint_called: Optional[str] = None
    client_ip: Optional[str] = None
    method: str = "GET"
    status_code: int = 200
    response_time_ms: Optional[int] = 0
    user_agent: Optional[str] = None
    query_params: Optional[str] = None
    requested_at: datetime

    model_config = {"from_attributes": True}


class ManagedAPILogListResponse(BaseModel):
    success: bool = True
    api_code: str
    total_in_24h: int
    items: List[ManagedAPILogItem]
