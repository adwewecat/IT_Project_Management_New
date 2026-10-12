from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


class PrPoDoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    loai: Optional[str] = None
    so: Optional[str] = None
    noidung: Optional[str] = None
    ngay_them: Optional[date] = None
    ngay_insert: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    trangthai: Optional[str] = "BU"
    ghichu: Optional[str] = None


class PrPoDoCreate(BaseModel):
    so: Optional[str] = None
    noidung: Optional[str] = None
    loai: Optional[str] = None
    trangthai: Optional[str] = "BU"
    ghichu: Optional[str] = None
    ngay_them: Optional[date] = None


class PrPoDoUpdate(BaseModel):
    so: Optional[str] = None
    noidung: Optional[str] = None
    loai: Optional[str] = None
    trangthai: Optional[str] = None
    ghichu: Optional[str] = None
    ngay_them: Optional[date] = None


class PrPoDoStats(BaseModel):
    total: int = 0
    total_bu: int = 0
    total_fc: int = 0
    total_md: int = 0
    total_done: int = 0
    total_deleted: int = 0


class PrPoDoListResponse(BaseModel):
    items: List[PrPoDoItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: PrPoDoStats
