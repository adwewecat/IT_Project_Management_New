from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class IncidentBase(BaseModel):
    noidung: str
    restaurant_id: Optional[int] = None
    restaurant_name: Optional[str] = None
    sap_code: Optional[str] = None
    rk7_code: Optional[str] = None
    ip_address: Optional[str] = None
    assign_type: Optional[str] = "LEADER"  # "LEADER" or "INDIVIDUAL"
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    date_loi: Optional[datetime] = None
    images: Optional[str] = None
    files: Optional[str] = None
    is_private: Optional[bool] = True


class IncidentCreate(IncidentBase):
    pass


class IncidentAssign(BaseModel):
    assigned_to: str
    assigned_name: Optional[str] = None


class IncidentProgressUpdate(BaseModel):
    note: str


class IncidentStatusUpdate(BaseModel):
    trangthai: bool
    note: Optional[str] = None


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    appname: Optional[str] = None
    noidung: Optional[str] = None
    trangthai: Optional[bool] = False
    date_insert: Optional[datetime] = None
    date_loi: Optional[datetime] = None
    user_insert: Optional[str] = None
    active: Optional[bool] = True
    is_private: Optional[bool] = True

    restaurant_id: Optional[int] = None
    restaurant_name: Optional[str] = None
    sap_code: Optional[str] = None
    rk7_code: Optional[str] = None
    ip_address: Optional[str] = None

    assign_type: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None

    progress_notes: Optional[str] = None
    images: Optional[str] = None
    files: Optional[str] = None

    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    date_update: Optional[datetime] = None
    user_update: Optional[str] = None


class IncidentListResponse(BaseModel):
    items: List[IncidentResponse]
    total: int
    uncompleted_count: int
    completed_count: int
