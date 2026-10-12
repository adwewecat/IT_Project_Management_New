from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LichTrucItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thang: str
    team: str
    noidung: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: List[str] = []
    is_image: bool = True
    user_insert: Optional[str] = None
    ngay_insert: Optional[datetime] = None


class LichTrucMonthResponse(BaseModel):
    thang: str
    helpdesk: Optional[LichTrucItem] = None
    app: Optional[LichTrucItem] = None
    available_months: List[str] = []
    helpdesk_months: List[str] = []
    app_months: List[str] = []


class LichTrucUploadPayload(BaseModel):
    thang: str
    team: str
    image_data: Optional[str] = None
    images_data: Optional[List[str]] = None

