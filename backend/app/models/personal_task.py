from datetime import datetime
from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime, Boolean
from app.core.database import Base

class PersonalTask(Base):
    __tablename__ = "CONGVIEC_CANHAN"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(Unicode(100), nullable=False, index=True)
    noi_dung = Column(UnicodeText, nullable=False)
    images = Column(UnicodeText, nullable=True)  # JSON array of image URLs
    files = Column(UnicodeText, nullable=True)   # JSON array of file URLs
    trang_thai = Column(Unicode(50), default="PENDING")  # 'PENDING', 'COMPLETED'
    ngay_tao = Column(DateTime, default=datetime.now)
    ngay_hoan_thanh = Column(DateTime, nullable=True)
    sort_order = Column(Integer, default=0)
    active = Column(Boolean, default=True)

