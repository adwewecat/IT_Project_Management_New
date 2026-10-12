from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field

# --- Template Schemas ---
class ChecklistTemplateItemSchema(BaseModel):
    id: int
    template_id: int
    nhom: Optional[str] = None
    tieu_de: str
    huong_dan: Optional[str] = None
    stt: int = 0
    active: bool = True

    class Config:
        from_attributes = True

class ChecklistTemplateSchema(BaseModel):
    id: int
    ten_suon: str
    ma_suon: Optional[str] = None
    danh_muc: Optional[str] = "Vận hành"
    mo_ta: Optional[str] = None
    nguoi_tao: Optional[str] = None
    sla_days: int = 5
    ngay_tao: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    active: bool = True
    total_items: int = 0
    items: List[ChecklistTemplateItemSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True

class ChecklistTemplateCreate(BaseModel):
    ten_suon: str = Field(..., min_length=1, max_length=255)
    ma_suon: Optional[str] = None
    danh_muc: Optional[str] = "Vận hành"
    mo_ta: Optional[str] = None
    sla_days: Optional[int] = 5
    items: Optional[List[dict]] = Field(default_factory=list)

class ChecklistTemplateUpdate(BaseModel):
    ten_suon: Optional[str] = None
    ma_suon: Optional[str] = None
    danh_muc: Optional[str] = None
    mo_ta: Optional[str] = None
    sla_days: Optional[int] = None

class ChecklistTemplateItemCreate(BaseModel):
    nhom: Optional[str] = "Chung"
    tieu_de: str = Field(..., min_length=1)
    huong_dan: Optional[str] = None
    stt: Optional[int] = 0

class ChecklistTemplateItemBatchCreate(BaseModel):
    nhom: Optional[str] = "Chung"
    raw_text: Optional[str] = None
    items: Optional[List[str]] = None


# --- Run / Instance Schemas ---
class ChecklistRunItemSchema(BaseModel):
    id: int
    run_id: int
    stt: int = 0
    nhom: Optional[str] = None
    tieu_de: str
    huong_dan: Optional[str] = None
    trang_thai: str = "PENDING"  # 'PENDING', 'PASSED', 'FAILED', 'NA'
    ghi_chu_ket_qua: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    nguoi_hoan_thanh: Optional[str] = None
    ngay_hoan_thanh: Optional[datetime] = None
    active: bool = True

    class Config:
        from_attributes = True

class ChecklistRunItemUpdate(BaseModel):
    trang_thai: Optional[str] = None
    ghi_chu_ket_qua: Optional[str] = None
    images: Optional[List[str]] = None

class ChecklistRunSchema(BaseModel):
    id: int
    template_id: int
    ten_dot: str
    ten_suon: Optional[str] = None
    version_note: Optional[str] = None
    ghi_chu: Optional[str] = None
    nguoi_thuc_hien: Optional[str] = None
    nguoi_tao: Optional[str] = None
    trang_thai: str = "Đang thực hiện"
    sla_days: int = 5
    han_chot_sla: Optional[datetime] = None
    sla_status: Optional[str] = "IN_TIME"  # 'IN_TIME', 'WARNING', 'OVERDUE', 'COMPLETED_ON_TIME', 'COMPLETED_LATE'
    sla_text: Optional[str] = None
    ngay_bat_dau: Optional[datetime] = None
    ngay_hoan_thanh: Optional[datetime] = None
    ngay_tao: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    active: bool = True
    
    # Progress counters
    total_items: int = 0
    passed_items: int = 0
    failed_items: int = 0
    pending_items: int = 0
    progress_percent: int = 0

    class Config:
        from_attributes = True

class ChecklistRunCreate(BaseModel):
    template_id: int
    ten_dot: Optional[str] = None
    version_note: str = Field(..., min_length=1, description="Nội dung version để note lại (ví dụ: v2.4.1.18)")
    ghi_chu: Optional[str] = None
    nguoi_thuc_hien: Optional[str] = None
    sla_days: Optional[int] = 5

class ChecklistRunUpdate(BaseModel):
    ten_dot: Optional[str] = None
    version_note: Optional[str] = None
    ghi_chu: Optional[str] = None
    nguoi_thuc_hien: Optional[str] = None
    trang_thai: Optional[str] = None
    sla_days: Optional[int] = None
    han_chot_sla: Optional[datetime] = None

class ChecklistRunDetailResponse(BaseModel):
    run: ChecklistRunSchema
    items: List[ChecklistRunItemSchema] = Field(default_factory=list)
    groups: List[str] = Field(default_factory=list)

class ChecklistRunStatsSchema(BaseModel):
    total_runs: int = 0
    unique_versions: int = 0
    completed_runs: int = 0
    total_items: int = 0
    passed_items: int = 0
    failed_items: int = 0
    avg_progress: int = 0

class AppUserOptionSchema(BaseModel):
    username: str
    full_name: str
    email: Optional[str] = None
    phanquyen: Optional[str] = None

class ChecklistRunListResponse(BaseModel):
    total: int
    page: int = 1
    page_size: int = 20
    stats: Optional[ChecklistRunStatsSchema] = None
    items: List[ChecklistRunSchema] = Field(default_factory=list)

