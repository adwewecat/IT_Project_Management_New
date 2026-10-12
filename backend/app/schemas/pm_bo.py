from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# =========================================================================
# 1. TAB 1: PHẦN MỀM & PM PHỤ TRÁCH (ALLAPP_PM)
# =========================================================================

class PMSoftwareItem(BaseModel):
    id: int
    project_name: str = Field(..., description="Tên phần mềm phụ trách")
    pm_project: Optional[str] = None
    pm_name: Optional[str] = None
    pm_phone: Optional[str] = None
    pm_email: Optional[str] = None
    note_them: Optional[str] = None
    ngay_trienkhai: Optional[str] = None
    ngay_update: Optional[str] = None
    active: bool = True


class PMSoftwareCreate(BaseModel):
    project_name: str = Field(..., min_length=1, description="Tên phần mềm phụ trách")
    pm_name: Optional[str] = Field(None, description="Tên PM / BO quản lý")
    pm_phone: Optional[str] = Field(None, description="Số điện thoại")
    pm_email: Optional[str] = Field(None, description="Email")
    note_them: Optional[str] = Field(None, description="Ghi chú thêm")


class PMSoftwareUpdate(BaseModel):
    project_name: Optional[str] = None
    pm_name: Optional[str] = None
    pm_phone: Optional[str] = None
    pm_email: Optional[str] = None
    note_them: Optional[str] = None


# =========================================================================
# 2. TAB 2: PHIÊN BẢN PHẦN MỀM (SOFTWARE_VERSIONS)
# =========================================================================

class SoftwareVersionItem(BaseModel):
    id: int
    phan_mem: str = Field(..., description="Tên phần mềm (KDS, CO, SO, GPOS-CO-SO, GPOS-KDS...)")
    phien_ban: str = Field(..., description="Phiên bản phần mềm (VD: v2.4.0)")
    ngay_update: Optional[str] = None
    noi_dung_update: Optional[str] = None
    hinh_anh: Optional[str] = None
    ghi_chu: Optional[str] = None
    nguoi_update: Optional[str] = None
    active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SoftwareVersionCreate(BaseModel):
    phan_mem: str = Field(..., min_length=1, description="Tên phần mềm")
    phien_ban: str = Field(..., min_length=1, description="Phiên bản")
    ngay_update: Optional[datetime] = None
    noi_dung_update: Optional[str] = None
    hinh_anh: Optional[str] = None
    ghi_chu: Optional[str] = None
    sync_all_dates: Optional[bool] = Field(False, description="Đồng bộ ngày update này cho tất cả phần mềm còn lại")


class SoftwareVersionUpdate(BaseModel):
    phan_mem: Optional[str] = None
    phien_ban: Optional[str] = None
    ngay_update: Optional[datetime] = None
    noi_dung_update: Optional[str] = None
    hinh_anh: Optional[str] = None
    ghi_chu: Optional[str] = None
    sync_all_dates: Optional[bool] = Field(False, description="Đồng bộ ngày update này cho tất cả phần mềm còn lại")


class SoftwareVersionSyncDatePayload(BaseModel):
    ngay_update: datetime = Field(..., description="Ngày update cần áp dụng cho các phần mềm")
    source_software: Optional[str] = Field(None, description="Tên phần mềm nguồn (nếu có)")
    exclude_id: Optional[int] = Field(None, description="ID bỏ qua không cần cập nhật")
    target_ids: Optional[List[int]] = Field(None, description="Danh sách ID các phần mềm cần cập nhật")
    target_names: Optional[List[str]] = Field(None, description="Danh sách tên các phần mềm cần cập nhật")


# =========================================================================
# 3. TAB 3: CHUẨN HÓA IN TỪNG BRAND (BRAND_PRINT_STANDARDS)
# =========================================================================

class BrandPrintStandardItem(BaseModel):
    id: int
    brand_name: str
    loai_in: str
    tieu_de: Optional[str] = None
    ghi_chu: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None
    nguoi_tao: Optional[str] = None
    nguoi_update: Optional[str] = None
    ngay_tao: Optional[str] = None
    ngay_update: Optional[str] = None
    active: bool = True


class BrandPrintStandardCreate(BaseModel):
    brand_name: str = Field(..., min_length=1, description="Tên Brand")
    loai_in: str = Field(..., min_length=1, description="Loại in (Chuẩn hóa in Dcorp (RK7) / Chuẩn hóa in KDS / Cả hai)")
    tieu_de: Optional[str] = Field(None, description="Tiêu đề quy chuẩn in")
    ghi_chu: Optional[str] = Field(None, description="Ghi chú chi tiết quy chuẩn")
    images: Optional[str] = Field(None, description="JSON array các url ảnh")
    files: Optional[str] = Field(None, description="JSON array các url file")


class BrandPrintStandardUpdate(BaseModel):
    brand_name: Optional[str] = None
    loai_in: Optional[str] = None
    tieu_de: Optional[str] = None
    ghi_chu: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None

