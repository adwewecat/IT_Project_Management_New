from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class PIMRequestBase(BaseModel):
    id_yeu_cau: str
    chuoi: Optional[str] = None
    ten_menu: Optional[str] = None
    mo_ta: Optional[str] = None
    thoi_gian_thuc_hien: Optional[datetime] = None
    link_yeu_cau: Optional[str] = None
    trang_thai_thuc_hien: Optional[str] = "chưa hoàn thành"
    user_thuc_hien: Optional[str] = None
    user_hoan_thanh: Optional[str] = None
    user_update: Optional[str] = None
    thoi_gian_hoan_thanh: Optional[datetime] = None
    thoi_gian_update: Optional[datetime] = None
    so: Optional[str] = "chưa hoàn thành"
    gui_mail: Optional[str] = "chưa hoàn thành"


class PIMRequestOut(PIMRequestBase):
    id: int
    ngay_insert: Optional[datetime] = None

    class Config:
        from_attributes = True


class PIMStatusUpdate(BaseModel):
    trang_thai_thuc_hien: Optional[str] = None # 'hoàn thành', 'chưa hoàn thành'
    so: Optional[str] = None # 'hoàn thành', 'chưa hoàn thành'
    gui_mail: Optional[str] = None # 'hoàn thành', 'chưa hoàn thành'


class PIMAssignUpdate(BaseModel):
    user_thuc_hien: str


class PIMUserBase(BaseModel):
    ten_user: str
    ho_ten: Optional[str] = None
    email: Optional[str] = None
    thu_tu: int
    active: Optional[bool] = True


class PIMUserCreate(PIMUserBase):
    pass


class PIMUserUpdate(BaseModel):
    ten_user: Optional[str] = None
    ho_ten: Optional[str] = None
    email: Optional[str] = None
    thu_tu: Optional[int] = None
    active: Optional[bool] = None


class PIMUserOut(PIMUserBase):
    id: int
    ngay_tao: Optional[datetime] = None

    class Config:
        from_attributes = True


class PIMLogOut(BaseModel):
    id: int
    id_yeu_cau: str
    hanh_dong: str
    noi_dung: Optional[str] = None
    user_thuc_hien: Optional[str] = None
    thoi_gian: Optional[datetime] = None

    class Config:
        from_attributes = True


class PIMSyncResponse(BaseModel):
    total_scanned: int
    inserted: int
    updated: int
    message: str


class PIMConfigOut(BaseModel):
    sso_username: str
    sso_password: str
    ngay_cap_nhat: Optional[datetime] = None
    user_cap_nhat: Optional[str] = None

    class Config:
        from_attributes = True


class PIMConfigUpdate(BaseModel):
    sso_username: str
    sso_password: str


class PIMTestLoginResponse(BaseModel):
    success: bool
    message: str


class PIMScheduleOut(BaseModel):
    id: int
    time_1: str
    time_2: str
    time_3: str
    is_active: bool
    last_run: Optional[datetime] = None
    last_status: Optional[str] = None
    ngay_cap_nhat: Optional[datetime] = None
    user_cap_nhat: Optional[str] = None

    class Config:
        from_attributes = True


class PIMScheduleUpdate(BaseModel):
    time_1: str
    time_2: str
    time_3: str
    is_active: Optional[bool] = True


