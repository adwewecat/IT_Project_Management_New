from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PersonalTaskItem(BaseModel):
    id: int
    username: str
    noi_dung: str
    images: Optional[str] = None
    files: Optional[str] = None
    trang_thai: str = "PENDING"  # 'PENDING' | 'COMPLETED'
    ngay_tao: Optional[str] = None
    ngay_hoan_thanh: Optional[str] = None
    sort_order: int = 0
    active: bool = True


class PersonalTaskCreate(BaseModel):
    noi_dung: str = Field(..., min_length=1, description="Nội dung công việc cần làm")
    images: Optional[str] = Field(None, description="JSON array các url ảnh")
    files: Optional[str] = Field(None, description="JSON array các url file")


class PersonalTaskBatchCreate(BaseModel):
    tasks: List[str] = Field(..., description="Danh sách các dòng công việc cần tạo hàng loạt")


class PersonalTaskUpdate(BaseModel):
    noi_dung: Optional[str] = None
    trang_thai: Optional[str] = None  # 'PENDING' | 'COMPLETED'
    images: Optional[str] = None
    files: Optional[str] = None


class PersonalTaskListResponse(BaseModel):
    items: List[PersonalTaskItem]
    total_pending: int = 0
    total_completed: int = 0


class AITaskExtractRequest(BaseModel):
    text_content: Optional[str] = Field(None, description="Văn bản danh sách công việc cần tách")
    image_base64: Optional[str] = Field(None, description="Ảnh base64 (hoặc url) cần OCR/trích xuất công việc")
    ai_key: Optional[str] = Field(None, description="Google Gemini API Key nếu có")
