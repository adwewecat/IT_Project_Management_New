from typing import List, Optional
from pydantic import BaseModel, Field


class SapCheckRequest(BaseModel):
    sap_codes: List[str] = Field(..., description="Danh sách các mã SAP cần kiểm tra")


class SapCheckItem(BaseModel):
    sap_code: str
    ten_mon: Optional[str] = None
    rk7_ident: Optional[int] = None
    rk7_code: Optional[int] = None
    don_vi_tinh: Optional[str] = None
    nhom_menu: Optional[str] = None
    status_code: Optional[str] = None
    item_type: Optional[str] = None


class SapCheckResponse(BaseModel):
    items: List[SapCheckItem]
    total_input: int
    found_count: int
    missing_count: int
    missing_codes: List[str]


class SelectorCheckRequest(BaseModel):
    sap_codes: List[str] = Field(..., description="Danh sách các mã SAP cần kiểm tra selector")


class SelectorCheckItem(BaseModel):
    sap_code: Optional[str] = None
    brand: Optional[str] = None
    nhom_pos: Optional[str] = None
    item_ident: Optional[int] = None
    rk7_code: Optional[int] = None
    ten_mon: Optional[str] = None
    don_vi: Optional[str] = None
    ten_don_gia: Optional[str] = None
    gia: Optional[float] = None


class SelectorCheckResponse(BaseModel):
    items: List[SelectorCheckItem]
    total_input: int
    found_count: int
    missing_count: int
    missing_codes: List[str]


class BrandItem(BaseModel):
    guid: str
    name: str
    display_name: str
    total_items: int


class BrandMenuResponse(BaseModel):
    brand_guid: str
    brand_name: str
    total_items: int
    items: List[SelectorCheckItem]
