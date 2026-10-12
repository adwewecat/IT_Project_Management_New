from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CodePhotoItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    hientrang: Optional[str] = "ON"
    manv: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    pass_code: Optional[str] = None
    cmnd_sdt: Optional[str] = None
    cty: Optional[str] = None
    donvi: Optional[str] = None
    bophan: Optional[str] = None
    chucdanh: Optional[str] = None
    code_dept: Optional[str] = None
    note: Optional[str] = None
    ngay_insert: Optional[datetime] = None
    user_insert: Optional[str] = None
    ngay_update: Optional[datetime] = None
    user_update: Optional[str] = None
    active: Optional[bool] = True


class CodePhotoCreate(BaseModel):
    hientrang: Optional[str] = "ON"
    manv: Optional[str] = None
    name: Optional[str] = None
    email: str
    pass_code: Optional[str] = None
    cmnd_sdt: Optional[str] = None
    bophan: Optional[str] = None
    chucdanh: Optional[str] = None
    code_dept: Optional[str] = None
    note: Optional[str] = None


class CodePhotoUpdate(BaseModel):
    hientrang: Optional[str] = None
    manv: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    pass_code: Optional[str] = None
    cmnd_sdt: Optional[str] = None
    bophan: Optional[str] = None
    chucdanh: Optional[str] = None
    code_dept: Optional[str] = None
    note: Optional[str] = None
    active: Optional[bool] = None


class CodePhotoStats(BaseModel):
    total: int = 0
    total_on: int = 0
    total_off: int = 0


class CodePhotoListResponse(BaseModel):
    items: List[CodePhotoItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: CodePhotoStats
