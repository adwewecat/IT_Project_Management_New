from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, model_validator


class SystemIncidentCreate(BaseModel):
    tieude: Optional[str] = Field(None, description="Tiêu đề sự cố hệ thống")
    tieu_de: Optional[str] = Field(None, description="Tiêu đề sự cố hệ thống (alias)")
    he_thong: Optional[str] = Field(None, description="Hệ thống/Dịch vụ bị ảnh hưởng")
    muc_do: Optional[str] = Field("Cao", description="Mức độ ảnh hưởng: Khẩn cấp / Cao / Trung bình / Thấp")
    thoi_gian_bat_dau: datetime = Field(..., description="Thời gian phát sinh sự cố")
    thoi_gian_ket_thuc: Optional[datetime] = Field(None, description="Thời gian khắc phục xong")
    noi_dung: Optional[str] = Field(None, description="Mô tả chi tiết hiện tượng sự cố")
    nguyen_nhan: Optional[str] = Field(None, description="Nguyên nhân ban đầu hoặc đã xác định")
    bien_phap_khac_phuc: Optional[str] = Field(None, description="Biện pháp xử lý / phòng ngừa")
    trang_thai: Optional[str] = Field("DANG_XU_LY", description="Trạng thái: DANG_XU_LY, DA_KHAC_PHUC, THEO_DOI")
    nguoi_xu_ly: Optional[str] = Field(None, description="Người hoặc Team phụ trách xử lý")
    images: Optional[str] = Field(None, description="JSON string danh sách URL ảnh")
    files: Optional[str] = Field(None, description="JSON string danh sách URL tệp đính kèm")
    note: Optional[str] = Field(None, description="Ghi chú bước xử lý ban đầu")

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            val = values.get("tieude") or values.get("tieu_de") or ""
            values["tieude"] = str(val).strip()
            values["tieu_de"] = str(val).strip()
            if not values.get("noi_dung") or not str(values.get("noi_dung")).strip():
                values["noi_dung"] = values["tieude"]
        return values


class SystemIncidentUpdate(BaseModel):
    tieude: Optional[str] = None
    tieu_de: Optional[str] = None
    he_thong: Optional[str] = None
    muc_do: Optional[str] = None
    thoi_gian_bat_dau: Optional[datetime] = None
    thoi_gian_ket_thuc: Optional[datetime] = None
    noi_dung: Optional[str] = None
    nguyen_nhan: Optional[str] = None
    bien_phap_khac_phuc: Optional[str] = None
    trang_thai: Optional[str] = None
    nguoi_xu_ly: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def validate_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            val = values.get("tieude") or values.get("tieu_de")
            if val is not None:
                values["tieude"] = str(val).strip()
                values["tieu_de"] = str(val).strip()
        return values


class SystemIncidentProgressAdd(BaseModel):
    note: str = Field(..., min_length=1, description="Nội dung tiến độ xử lý mới")
    images: Optional[str] = None
    files: Optional[str] = None
    status: Optional[str] = None
    thoi_gian_ket_thuc: Optional[datetime] = None
    nguyen_nhan: Optional[str] = None
    bien_phap_khac_phuc: Optional[str] = None


class SystemIncidentResponse(BaseModel):
    id: int
    tieude: str
    tieu_de: Optional[str] = None
    he_thong: Optional[str] = None
    muc_do: Optional[str] = None
    thoi_gian_bat_dau: Optional[str] = None
    thoi_gian_ket_thuc: Optional[str] = None
    thoi_gian_gian_doan_phut: Optional[int] = None
    thoi_gian_gian_doan_text: Optional[str] = None
    noi_dung: str
    nguyen_nhan: Optional[str] = None
    bien_phap_khac_phuc: Optional[str] = None
    trang_thai: str
    nguoi_ghi_nhan: Optional[str] = None
    nguoi_xu_ly: Optional[str] = None
    ghi_chu_tien_do: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    resolved_at: Optional[str] = None
    resolved_by: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_tieu_de(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if not values.get("tieu_de"):
                values["tieu_de"] = values.get("tieude")
        elif hasattr(values, "tieude") and not getattr(values, "tieu_de", None):
            try:
                setattr(values, "tieu_de", getattr(values, "tieude"))
            except Exception:
                pass
        return values


class SystemIncidentStats(BaseModel):
    total: int = 0
    dang_xu_ly: int = 0
    da_khac_phuc: int = 0
    theo_doi: int = 0
    total_downtime_minutes: int = 0
    total_downtime_hours: float = 0.0
    by_system: Dict[str, int] = {}
    by_severity: Dict[str, int] = {}


class SystemIncidentListResponse(BaseModel):
    items: List[SystemIncidentResponse]
    total: int
    stats: SystemIncidentStats

