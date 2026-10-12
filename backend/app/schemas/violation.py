from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ViolationBase(BaseModel):
    nguoi_saipham: str  # Username
    ho_ten: Optional[str] = None
    noidung: str
    loai_saipham: Optional[str] = "other"  # miss_mail, late_processing, wrong_action, other
    date_saipham: Optional[datetime] = None
    giaitrinh: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None


class ViolationCreate(ViolationBase):
    pass


class ViolationBatchCreate(BaseModel):
    nguoi_saiphams: List[str]  # Danh sách username nhân viên vi phạm
    noidung: str
    loai_saipham: Optional[str] = "other"
    date_saipham: Optional[datetime] = None
    giaitrinh: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None


class ViolationUpdate(BaseModel):
    ho_ten: Optional[str] = None
    noidung: Optional[str] = None
    loai_saipham: Optional[str] = None
    date_saipham: Optional[datetime] = None
    giaitrinh: Optional[str] = None
    trangthai: Optional[bool] = None
    images: Optional[str] = None
    files: Optional[str] = None


class ViolationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nguoi_saipham: Optional[str] = None
    ho_ten: Optional[str] = None
    noidung: Optional[str] = None
    loai_saipham: Optional[str] = None
    date_saipham: Optional[datetime] = None
    giaitrinh: Optional[str] = None
    trangthai: Optional[bool] = False
    images: Optional[str] = None
    files: Optional[str] = None
    date_insert: Optional[datetime] = None
    date_update: Optional[datetime] = None
    user_insert: Optional[str] = None
    user_update: Optional[str] = None
    active: Optional[bool] = True


class ViolationListResponse(BaseModel):
    items: List[ViolationResponse]
    total: int


class LeaveLogBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    leave_type: str  # annual_leave, half_day, early_leave, unpaid_leave, other
    start_time: datetime
    end_time: Optional[datetime] = None
    reason: Optional[str] = None
    note: Optional[str] = None


class LeaveLogCreate(LeaveLogBase):
    pass


class LeaveLogUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    leave_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    reason: Optional[str] = None
    note: Optional[str] = None


class LeaveLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    full_name: Optional[str] = None
    leave_type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    reason: Optional[str] = None
    note: Optional[str] = None
    user_insert: Optional[str] = None
    date_insert: Optional[datetime] = None
    active: Optional[bool] = True


class LeaveLogListResponse(BaseModel):
    items: List[LeaveLogResponse]
    total: int


class LeaveTypeBase(BaseModel):
    code: str
    name: str
    color: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


class LeaveTypeCreate(BaseModel):
    code: Optional[str] = None
    name: str
    color: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True


class LeaveTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class LeaveTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    color: Optional[str] = None
    sort_order: Optional[int] = 0
    is_active: Optional[bool] = True

