from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class RestaurantItem(BaseModel):
    id: int
    res: Optional[str] = None
    sap: Optional[str] = None
    coscenter: Optional[str] = None
    rk7: Optional[str] = None
    sap_old: Optional[str] = None
    oracale: Optional[str] = None
    don_gia: Optional[str] = None
    
    address: Optional[str] = None
    region: Optional[str] = None
    brand: Optional[str] = None
    sdt_nh: Optional[str] = None
    email: Optional[str] = None
    
    trangthai: Optional[str] = None
    status: Optional[str] = None
    active: Optional[Any] = None
    ngay_khaitruong: Optional[Any] = None

    ip: Optional[str] = None
    ip_wan: Optional[str] = None
    teamview_pc: Optional[str] = None
    teamview_pos11: Optional[str] = None
    teamview_pos12: Optional[str] = None
    rustdesk_pos11: Optional[str] = None
    rustdesk_pos12: Optional[str] = None

    pass_ou_ko_sys: Optional[str] = None
    user_ftth: Optional[str] = None
    pass_ftth: Optional[str] = None
    thanhtoan_ftth: Optional[str] = None
    ngay_online_ftth: Optional[Any] = None
    dk_truyenthong: Optional[str] = None
    pass_mail: Optional[str] = None
    ext: Optional[str] = None
    sys_sales: Optional[str] = None

    note: Optional[str] = None
    timkiem: Optional[str] = None

    ngay_insert: Optional[Any] = None
    user_insert: Optional[str] = None
    ngay_update: Optional[Any] = None
    user_update: Optional[str] = None


    # Danh sách các quyền mà user hiện tại có đối với nhà hàng này
    can_update: bool = True

    model_config = {"from_attributes": True}


class RestaurantListResponse(BaseModel):
    items: List[RestaurantItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    # Danh sách cột được phép xem theo quyền của user
    allowed_view_columns: List[str] = []
    # Danh sách cột được phép sửa theo quyền của user
    allowed_update_columns: List[str] = []


class RestaurantCreate(BaseModel):
    res: str = Field(..., description="Tên nhà hàng")
    sap: Optional[str] = ""
    coscenter: Optional[str] = ""
    rk7: Optional[str] = ""
    sap_old: Optional[str] = ""
    oracale: Optional[str] = ""
    don_gia: Optional[str] = ""
    
    address: Optional[str] = ""
    region: Optional[str] = ""
    brand: Optional[str] = ""
    sdt_nh: Optional[str] = ""
    email: Optional[str] = ""
    
    trangthai: Optional[str] = "ON"
    status: Optional[str] = ""
    ngay_khaitruong: Optional[str] = ""

    ip: Optional[str] = ""
    ip_wan: Optional[str] = ""
    teamview_pc: Optional[str] = ""
    teamview_pos11: Optional[str] = ""
    teamview_pos12: Optional[str] = ""
    rustdesk_pos11: Optional[str] = ""
    rustdesk_pos12: Optional[str] = ""

    pass_ou_ko_sys: Optional[str] = ""
    user_ftth: Optional[str] = ""
    pass_ftth: Optional[str] = ""
    thanhtoan_ftth: Optional[str] = ""
    ngay_online_ftth: Optional[str] = ""
    dk_truyenthong: Optional[str] = ""
    pass_mail: Optional[str] = ""
    ext: Optional[str] = ""
    sys_sales: Optional[str] = ""
    note: Optional[str] = ""


class RestaurantUpdate(BaseModel):
    res: Optional[str] = None
    sap: Optional[str] = None
    coscenter: Optional[str] = None
    rk7: Optional[str] = None
    sap_old: Optional[str] = None
    oracale: Optional[str] = None
    don_gia: Optional[str] = None
    
    address: Optional[str] = None
    region: Optional[str] = None
    brand: Optional[str] = None
    sdt_nh: Optional[str] = None
    email: Optional[str] = None
    
    trangthai: Optional[str] = None
    status: Optional[str] = None
    active: Optional[str] = None
    ngay_khaitruong: Optional[str] = None

    ip: Optional[str] = None
    ip_wan: Optional[str] = None
    teamview_pc: Optional[str] = None
    teamview_pos11: Optional[str] = None
    teamview_pos12: Optional[str] = None
    rustdesk_pos11: Optional[str] = None
    rustdesk_pos12: Optional[str] = None

    pass_ou_ko_sys: Optional[str] = None
    user_ftth: Optional[str] = None
    pass_ftth: Optional[str] = None
    thanhtoan_ftth: Optional[str] = None
    ngay_online_ftth: Optional[str] = None
    dk_truyenthong: Optional[str] = None
    pass_mail: Optional[str] = None
    ext: Optional[str] = None
    sys_sales: Optional[str] = None
    note: Optional[str] = None


class RestaurantOptionsResponse(BaseModel):
    regions: List[str]
    brands: List[str]
    statuses: List[str]


class BrandItem(BaseModel):
    id: int
    mabrand: Optional[str] = None
    tenbrand: str
    active: bool = True
    ngay_insert: Optional[Any] = None
    user_them: Optional[str] = None

    model_config = {"from_attributes": True}


class BrandCreate(BaseModel):
    tenbrand: str = Field(..., min_length=1, max_length=250, description="Tên thương hiệu")
    mabrand: Optional[str] = Field(default=None, max_length=100, description="Mã thương hiệu")


class RegionItem(BaseModel):
    id: int
    ma_tinhthanh: Optional[str] = None
    ten_tinhthanh: str
    bienso: Optional[str] = None
    active: bool = True

    model_config = {"from_attributes": True}


class RegionCreate(BaseModel):
    ten_tinhthanh: str = Field(..., min_length=1, max_length=250, description="Tên tỉnh/thành hoặc khu vực")
    ma_tinhthanh: Optional[str] = Field(default=None, max_length=100, description="Mã tỉnh/thành")
    bienso: Optional[str] = Field(default=None, max_length=100, description="Biển số xe")


class RestaurantAuditLogItem(BaseModel):
    id: int
    manhinh: Optional[str] = "RESTAURANT"
    chucnang: Optional[str] = None
    user_thuchien: Optional[str] = None
    noidung: Optional[str] = None
    ngay_insert: Optional[str] = None

    model_config = {"from_attributes": True}


class RestaurantAuditLogsResponse(BaseModel):
    items: List[RestaurantAuditLogItem]
    total: int

# Schema phục vụ API cho Nhà Cung Cấp (NCC) / Đối tác tự động lấy thông tin nhà hàng
class RestaurantNCCItem(BaseModel):
    ma_sap: str = Field(..., description="Mã SAP nhà hàng (đúng 4 chữ số)")
    ten_nha_hang: str = Field(..., description="Tên nhà hàng")
    ip_wan: str = Field("", description="Địa chỉ IP WAN của nhà hàng")


class RestaurantNCCResponse(BaseModel):
    success: bool = True
    total: int = Field(..., description="Tổng số nhà hàng thỏa mãn điều kiện (ON và SAP 4 chữ số)")
    filter: Dict[str, Any] = Field(default_factory=dict, description="Bộ lọc đã áp dụng")
    data: List[RestaurantNCCItem] = Field(..., description="Danh sách thông tin nhà hàng")
