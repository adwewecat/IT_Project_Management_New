from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, field_validator


def _parse_flexible_datetime(v: Any) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, date):
        return datetime.combine(v, datetime.min.time())
    if isinstance(v, str):
        s = v.strip()
        if not s or s.lower() in ("null", "none", "yyyy-mm-dd"):
            return None
        try:
            # Handle YYYY-MM-DD prefix even if extra text or duplicated time is attached
            date_part = s[:10]
            if len(date_part) == 10 and date_part[4] == '-' and date_part[7] == '-':
                return datetime.strptime(date_part, "%Y-%m-%d")
            return datetime.fromisoformat(s)
        except Exception:
            return None
    return v


class ChecklistItemOut(BaseModel):
    id: int
    ID_NH_NEW: int
    STT: Optional[int] = None
    NOIDUNG: Optional[str] = None
    NHOM: Optional[str] = None
    GHICHU: Optional[str] = None
    is_completed: bool = False
    NGAY_HOANTHANH: Optional[datetime] = None
    USER_HOANTHANH: Optional[str] = None

    # Frontend-friendly alias fields
    ten_checklist: Optional[str] = None
    nhom: Optional[str] = None
    note: Optional[str] = None
    user_hoanthanh: Optional[str] = None
    ngay_hoanthanh: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ChecklistItemUpdate(BaseModel):
    is_completed: Optional[bool] = None
    GHICHU: Optional[str] = None
    note: Optional[str] = None


class ChecklistBulkUpdateRequest(BaseModel):
    is_completed: bool = True
    group_name: Optional[str] = None
    item_ids: Optional[List[int]] = None
    completed_date: Optional[datetime] = None
    note: Optional[str] = None


class ChecklistItemCreate(BaseModel):
    nhom: str
    noidung: str
    ghichu: Optional[str] = None
    save_to_master: Optional[bool] = False


class ChecklistGroup(BaseModel):
    group_name: str
    total_items: int
    completed_items: int
    items: List[ChecklistItemOut]

    # Frontend-friendly alias fields
    nhom: Optional[str] = None
    total: Optional[int] = None
    completed: Optional[int] = None

    # Quản lý theo Mục lớn
    is_completed: bool = False
    completed_date: Optional[datetime] = None
    completed_by: Optional[str] = None
    note: Optional[str] = None


class RestaurantChecklistResponse(BaseModel):
    restaurant_id: int
    restaurant_name: str
    it_phutrach: Optional[str] = None
    am_phutrach: Optional[str] = None
    ngay_dukien_khaitruong: Optional[datetime] = None
    trangthai: str
    total_items: int
    completed_items: int
    progress_percent: float
    is_all_completed: bool
    groups: List[ChecklistGroup]
    restaurant: Optional["SetupRestaurantOut"] = None
    total_groups: int = 0
    completed_groups: int = 0
    group_progress_percent: float = 0.0


class SetupRestaurantBase(BaseModel):
    # Lowercase fields
    ten_nh: Optional[str] = None
    ngay_dukien_khaitruong: Optional[datetime] = None
    it_phutrach: Optional[str] = None
    am_phutrach: Optional[str] = None
    note_them: Optional[str] = None
    brand: Optional[str] = "GGG"

    # Uppercase fields
    TEN_NH: Optional[str] = None
    NGAY_DUKIEN_KHAITRUONG: Optional[datetime] = None
    IT_PHUTRACH: Optional[str] = None
    AM_PHUTRACH: Optional[str] = None
    NOTE_THEM: Optional[str] = None
    BRAND: Optional[str] = "GGG"

    @field_validator("ngay_dukien_khaitruong", "NGAY_DUKIEN_KHAITRUONG", mode="before")
    @classmethod
    def validate_ngay_dukien(cls, v: Any) -> Optional[datetime]:
        return _parse_flexible_datetime(v)

    def get_ten_nh(self) -> str:
        return (self.ten_nh or self.TEN_NH or "").strip()

    def get_ngay_dukien_khaitruong(self) -> Optional[datetime]:
        return self.ngay_dukien_khaitruong or self.NGAY_DUKIEN_KHAITRUONG

    def get_it_phutrach(self) -> Optional[str]:
        val = self.it_phutrach or self.IT_PHUTRACH
        return val.strip() if val else None

    def get_am_phutrach(self) -> Optional[str]:
        val = self.am_phutrach or self.AM_PHUTRACH
        return val.strip() if val else None

    def get_note_them(self) -> Optional[str]:
        val = self.note_them or self.NOTE_THEM
        return val.strip() if val else None

    def get_brand(self) -> str:
        val = self.brand or self.BRAND or "GGG"
        return val.strip()


class SetupRestaurantCreate(SetupRestaurantBase):
    pass


class SetupRestaurantUpdate(BaseModel):
    # Lowercase fields
    ten_nh: Optional[str] = None
    ngay_dukien_khaitruong: Optional[datetime] = None
    it_phutrach: Optional[str] = None
    am_phutrach: Optional[str] = None
    note_them: Optional[str] = None
    trangthai: Optional[str] = None
    brand: Optional[str] = None

    # Uppercase fields
    TEN_NH: Optional[str] = None
    NGAY_DUKIEN_KHAITRUONG: Optional[datetime] = None
    IT_PHUTRACH: Optional[str] = None
    AM_PHUTRACH: Optional[str] = None
    NOTE_THEM: Optional[str] = None
    TRANGTHAI: Optional[str] = None
    BRAND: Optional[str] = None

    @field_validator("ngay_dukien_khaitruong", "NGAY_DUKIEN_KHAITRUONG", mode="before")
    @classmethod
    def validate_ngay_dukien_update(cls, v: Any) -> Optional[datetime]:
        return _parse_flexible_datetime(v)

    def get_ten_nh(self) -> Optional[str]:
        val = self.ten_nh if self.ten_nh is not None else self.TEN_NH
        return val.strip() if val is not None else None

    def get_ngay_dukien_khaitruong(self) -> Optional[datetime]:
        return self.ngay_dukien_khaitruong if self.ngay_dukien_khaitruong is not None else self.NGAY_DUKIEN_KHAITRUONG

    def get_it_phutrach(self) -> Optional[str]:
        val = self.it_phutrach if self.it_phutrach is not None else self.IT_PHUTRACH
        return val.strip() if val is not None else None

    def get_am_phutrach(self) -> Optional[str]:
        val = self.am_phutrach if self.am_phutrach is not None else self.AM_PHUTRACH
        return val.strip() if val is not None else None

    def get_note_them(self) -> Optional[str]:
        val = self.note_them if self.note_them is not None else self.NOTE_THEM
        return val.strip() if val is not None else None

    def get_trangthai(self) -> Optional[str]:
        return self.trangthai if self.trangthai is not None else self.TRANGTHAI

    def get_brand(self) -> Optional[str]:
        val = self.brand if self.brand is not None else self.BRAND
        return val.strip() if val is not None else None


class NextItSetupRestaurantResponse(BaseModel):
    status: str
    next_it: str
    next_it_name: str
    user_list: List[Dict[str, Any]]


class SetupRestaurantOut(BaseModel):
    id: int

    # Lowercase fields (used in frontend)
    ten_nh: Optional[str] = None
    ngay_dukien_khaitruong: Optional[datetime] = None
    it_phutrach: Optional[str] = None
    am_phutrach: Optional[str] = None
    note_them: Optional[str] = None
    trangthai: Optional[str] = None
    brand: Optional[str] = "GGG"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Uppercase fields (backward-compatible)
    TEN_NH: Optional[str] = None
    NGAY_DUKIEN_KHAITRUONG: Optional[datetime] = None
    IT_PHUTRACH: Optional[str] = None
    AM_PHUTRACH: Optional[str] = None
    NOTE_THEM: Optional[str] = None
    TRANGTHAI: Optional[str] = None
    BRAND: Optional[str] = "GGG"
    NGAY_INSERT: Optional[datetime] = None
    NGAY_UPDATE: Optional[datetime] = None

    ReviewStatus: Optional[str] = None
    ReviewNote: Optional[str] = None
    ReviewedBy: Optional[str] = None
    ReviewedAt: Optional[datetime] = None
    total_checklist: int = 0
    completed_checklist: int = 0
    progress_percent: float = 0.0
    can_complete: bool = False
    total_groups: int = 0
    completed_groups: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0

    model_config = ConfigDict(from_attributes=True)


class SetupRestaurantReviewRequest(BaseModel):
    review_status: Optional[str] = None  # 'ok', 'fail', or None
    review_note: Optional[str] = None


class SetupRestaurantListResponse(BaseModel):
    items: List[SetupRestaurantOut]
    total: int
    page: int
    page_size: int
    total_in_progress: int
    total_completed: int


class ChecklistMasterItemOut(BaseModel):
    id: int
    stt: Optional[int] = None
    nhom: str
    noidung: str
    ghichu: Optional[str] = None
    active: bool = True


class ChecklistMasterGroupOut(BaseModel):
    nhom: str
    total_tasks: int
    tasks: List[ChecklistMasterItemOut]


class ChecklistMasterResponse(BaseModel):
    total_groups: int
    total_tasks: int
    groups: List[ChecklistMasterGroupOut]


class ChecklistMasterItemCreate(BaseModel):
    nhom: str
    noidung: str
    ghichu: Optional[str] = None
    stt: Optional[int] = None


class ChecklistMasterItemUpdate(BaseModel):
    nhom: Optional[str] = None
    noidung: Optional[str] = None
    ghichu: Optional[str] = None
    stt: Optional[int] = None


class ChecklistMasterGroupUpdate(BaseModel):
    old_nhom: str
    new_nhom: str


RestaurantChecklistResponse.model_rebuild()
