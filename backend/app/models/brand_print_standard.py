from datetime import datetime
from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime, Boolean
from app.core.database import Base

class BrandPrintStandard(Base):
    __tablename__ = "BRAND_PRINT_STANDARDS"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    brand_name = Column(Unicode(100), nullable=False, index=True)
    loai_in = Column(Unicode(100), nullable=False)  # 'Chuẩn hóa in Dcorp (RK7)', 'Chuẩn hóa in KDS', 'Cả hai'
    tieu_de = Column(Unicode(255), nullable=True)
    ghi_chu = Column(UnicodeText, nullable=True)
    images = Column(UnicodeText, nullable=True)  # JSON array of image URLs
    files = Column(UnicodeText, nullable=True)   # JSON array of file URLs
    nguoi_tao = Column(Unicode(100), nullable=True)
    nguoi_update = Column(Unicode(100), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.now)
    ngay_update = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    active = Column(Boolean, default=True)

