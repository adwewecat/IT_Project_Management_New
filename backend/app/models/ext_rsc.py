from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime, Boolean
from app.core.database import Base


class ExtRsc(Base):
    __tablename__ = "EXT_RSC"

    id = Column(Integer, primary_key=True, index=True)
    nhanvien = Column(Unicode(255), nullable=True)
    email = Column(Unicode(255), nullable=True)
    manv = Column(Unicode(50), nullable=True)
    so_ext = Column(Unicode(50), nullable=True)
    phongban = Column(Unicode(255), nullable=True)
    note = Column(UnicodeText, nullable=True)
    ngay_insert = Column(DateTime, nullable=True)
    user_insert = Column(Unicode(50), nullable=True)
    ngay_update = Column(DateTime, nullable=True)
    user_update = Column(Unicode(50), nullable=True)
    active = Column(Boolean, default=True)
