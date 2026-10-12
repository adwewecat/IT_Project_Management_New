from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LogItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nhom_quyen: str
    man_hinh: str
    hanh_dong: Optional[str] = None
    noi_dung: Optional[str] = None
    du_lieu_cu: Optional[str] = None
    du_lieu_moi: Optional[str] = None
    user_thuchien: str
    user_role: Optional[str] = None
    ip_client: Optional[str] = None
    status: Optional[str] = "SUCCESS"
    created_at: datetime


class LogGroupStats(BaseModel):
    total_all: int = 0
    total_app: int = 0
    total_inventory: int = 0
    total_helpdesk: int = 0
    total_quan_tri: int = 0


class LogListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[LogItemResponse]
    stats: LogGroupStats
    user_allowed_groups: List[str]  # ['APP'], ['INVENTORY'], ['HELPDESK'], or ['APP', 'INVENTORY', 'HELPDESK', 'QUAN_TRI']
    default_group: str  # 'APP', 'INVENTORY', 'HELPDESK', 'ALL'


class LogCreateRequest(BaseModel):
    nhom_quyen: str
    man_hinh: str
    hanh_dong: Optional[str] = None
    noi_dung: Optional[str] = None
    du_lieu_cu: Optional[str] = None
    du_lieu_moi: Optional[str] = None
    status: Optional[str] = "SUCCESS"


class LogPurgeRequest(BaseModel):
    years: int = 3


class LogPurgeResponse(BaseModel):
    success: bool
    deleted_count: int
    message: str
