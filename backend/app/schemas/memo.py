from typing import Optional, List, Any
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, field_validator


class MemoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ma_memo: Optional[str] = None
    subject_mail: Optional[str] = None
    ngay_batdau: Optional[date] = None
    ngay_ketthuc: Optional[date] = None
    it_setup: Optional[str] = None
    giahan: Optional[str] = "0"
    ngay_tiepnhan: Optional[datetime] = None
    trangthai: Optional[str] = "0"
    hoanthanh: Optional[str] = None
    nguoi_gui: Optional[str] = None
    huong_dan: Optional[str] = None
    noidung_mail: Optional[str] = None
    ten_file_memo: Optional[str] = None
    note: Optional[str] = None
    ngay_insert: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    active: Optional[bool] = True
    ReviewStatus: Optional[str] = None
    ReviewNote: Optional[str] = None
    ReviewedBy: Optional[str] = None
    ReviewedAt: Optional[datetime] = None
    ma_tua: Optional[str] = None


class MemoReviewRequest(BaseModel):
    review_status: Optional[str] = None  # 'ok', 'fail', or None
    review_note: Optional[str] = None


class MemoCreate(BaseModel):
    ma_memo: str
    subject_mail: Optional[str] = None
    ngay_batdau: Optional[date] = None
    ngay_ketthuc: Optional[date] = None
    it_setup: Optional[str] = None
    ma_tua: Optional[str] = None
    giahan: Optional[str] = "0"
    ngay_tiepnhan: Optional[datetime] = None
    trangthai: Optional[str] = "0"
    nguoi_gui: Optional[str] = None
    huong_dan: Optional[str] = None
    noidung_mail: Optional[str] = None
    ten_file_memo: Optional[str] = None
    note: Optional[str] = None

    @field_validator("ngay_batdau", "ngay_ketthuc", mode="before")
    @classmethod
    def parse_empty_date(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v

    @field_validator("ngay_tiepnhan", mode="before")
    @classmethod
    def parse_empty_datetime(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v


class MemoUpdate(BaseModel):
    ma_memo: Optional[str] = None
    subject_mail: Optional[str] = None
    ngay_batdau: Optional[date] = None
    ngay_ketthuc: Optional[date] = None
    it_setup: Optional[str] = None
    ma_tua: Optional[str] = None
    giahan: Optional[str] = None
    ngay_tiepnhan: Optional[datetime] = None
    trangthai: Optional[str] = None
    hoanthanh: Optional[str] = None
    nguoi_gui: Optional[str] = None
    huong_dan: Optional[str] = None
    noidung_mail: Optional[str] = None
    ten_file_memo: Optional[str] = None
    note: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("ngay_batdau", "ngay_ketthuc", mode="before")
    @classmethod
    def parse_empty_date(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v

    @field_validator("ngay_tiepnhan", mode="before")
    @classmethod
    def parse_empty_datetime(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v


class MemoGiaHan(BaseModel):
    ma_memo: Optional[str] = None
    subject_mail: Optional[str] = None
    ngay_batdau: Optional[date] = None
    ngay_ketthuc: Optional[date] = None
    it_setup: Optional[str] = None
    ma_tua: Optional[str] = None
    ngay_tiepnhan: Optional[datetime] = None
    trangthai: Optional[str] = "0"
    nguoi_gui: Optional[str] = None
    huong_dan: Optional[str] = None
    noidung_mail: Optional[str] = None
    ten_file_memo: Optional[str] = None
    note: Optional[str] = None

    @field_validator("ngay_batdau", "ngay_ketthuc", mode="before")
    @classmethod
    def parse_empty_date(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v

    @field_validator("ngay_tiepnhan", mode="before")
    @classmethod
    def parse_empty_datetime(cls, v: Any) -> Any:
        if v == "" or v is None:
            return None
        return v


class MemoStats(BaseModel):
    total: int = 0
    cho_setup: int = 0
    da_setup_nhap: int = 0
    da_public: int = 0
    gia_han: int = 0
    bo_sung: int = 0


class MemoListResponse(BaseModel):
    items: List[MemoItem]
    total: int
    page: int
    page_size: int
    stats: MemoStats


class NextItSetupResponse(BaseModel):
    status: str = "ok"
    next_user: str
    user_list: List[str]
    next_ma_tua: Optional[str] = None
    is_reclaimed: bool = False
    reclaimed_reason: Optional[str] = None


class UploadImageResponse(BaseModel):
    status: str = "ok"
    url: str
    filename: str


class RoundRobinUserItem(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    is_active: bool = True


class RoundRobinConfigResponse(BaseModel):
    users: List[RoundRobinUserItem]
    total: int
    active_count: int


class RoundRobinConfigUpdate(BaseModel):
    active_usernames: List[str]


# ---------------------------------------------------------------------------
# Memo Template Schemas
# ---------------------------------------------------------------------------

class MemoTemplateBrandItem(BaseModel):
    id: int
    brand_name: str
    bm_emails: str = ""
    full_cc_emails: str = ""
    active: bool = True


class MemoTemplateDataResponse(BaseModel):
    to_emails: str
    base_cc_emails: str
    mkt_link: str
    email_body: str
    brands: List[MemoTemplateBrandItem]
    all_bm_emails: str = ""
    all_brands_cc_emails: str = ""


class MemoTemplateToUpdate(BaseModel):
    to_emails: str


class MemoTemplateBaseCcUpdate(BaseModel):
    base_cc_emails: str


class MemoTemplateLinkUpdate(BaseModel):
    mkt_link: str


class MemoTemplateBodyUpdate(BaseModel):
    email_body: str


class MemoTemplateBrandUpsert(BaseModel):
    id: Optional[int] = None
    brand_name: str
    bm_emails: str
    active: Optional[bool] = True


class MemoTemplateSyncTextRequest(BaseModel):
    text: str

