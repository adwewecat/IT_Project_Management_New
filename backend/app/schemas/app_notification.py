from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

class AppNotificationItem(BaseModel):
    id: int
    tieu_de: str
    danh_muc: str
    muc_do: str
    noi_dung: str
    images: List[str] = Field(default_factory=list)
    files: List[Any] = Field(default_factory=list)
    is_pinned: bool = False
    nguoi_tao: Optional[str] = None
    nguoi_update: Optional[str] = None
    ngay_tao: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    active: bool = True

    class Config:
        from_attributes = True

class AppNotificationCreate(BaseModel):
    tieu_de: str = Field(..., min_length=1, max_length=255)
    danh_muc: Optional[str] = Field(default="Lưu ý chung")
    muc_do: Optional[str] = Field(default="Quan trọng")
    noi_dung: str = Field(..., min_length=1)
    images: Optional[List[str]] = Field(default_factory=list)
    files: Optional[List[Any]] = Field(default_factory=list)
    is_pinned: Optional[bool] = False

class AppNotificationUpdate(BaseModel):
    tieu_de: Optional[str] = None
    danh_muc: Optional[str] = None
    muc_do: Optional[str] = None
    noi_dung: Optional[str] = None
    images: Optional[List[str]] = None
    files: Optional[List[Any]] = None
    is_pinned: Optional[bool] = None

class AppNotificationListResponse(BaseModel):
    total: int
    pinned_count: int = 0
    categories: List[str] = Field(default_factory=list)
    items: List[AppNotificationItem] = Field(default_factory=list)
