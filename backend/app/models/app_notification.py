from datetime import datetime
from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime, Boolean
from app.core.database import Base

class AppNotification(Base):
    __tablename__ = "APP_THONGBAO_LUUY"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tieu_de = Column(Unicode(255), nullable=False)
    danh_muc = Column(Unicode(100), nullable=False, default="Lưu ý chung")
    muc_do = Column(Unicode(50), nullable=False, default="Quan trọng")
    noi_dung = Column(UnicodeText, nullable=False)
    images = Column(UnicodeText, nullable=True)  # JSON array of base64/url images
    files = Column(UnicodeText, nullable=True)   # JSON array of files
    is_pinned = Column(Boolean, default=False)
    nguoi_tao = Column(Unicode(100), nullable=True)
    nguoi_update = Column(Unicode(100), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.now)
    ngay_update = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    active = Column(Boolean, default=True)

