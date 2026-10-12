from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ExtRscItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nhanvien: Optional[str] = None
    email: Optional[str] = None
    manv: Optional[str] = None
    so_ext: Optional[str] = None
    phongban: Optional[str] = None
    note: Optional[str] = None
    ngay_insert: Optional[datetime] = None
    user_insert: Optional[str] = None
    ngay_update: Optional[datetime] = None
    user_update: Optional[str] = None
    active: Optional[bool] = True


class ExtRscCreate(BaseModel):
    nhanvien: str
    email: Optional[str] = None
    manv: Optional[str] = None
    so_ext: Optional[str] = None
    phongban: Optional[str] = None
    note: Optional[str] = None


class ExtRscUpdate(BaseModel):
    nhanvien: Optional[str] = None
    email: Optional[str] = None
    manv: Optional[str] = None
    so_ext: Optional[str] = None
    phongban: Optional[str] = None
    note: Optional[str] = None
    active: Optional[bool] = None


class ExtRscListResponse(BaseModel):
    items: List[ExtRscItem]
    total: int
    page: int
    page_size: int
    total_pages: int
