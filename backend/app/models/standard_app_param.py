from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, Integer, Unicode, UnicodeText, DateTime
from app.core.database import Base

class StandardAppParam(Base):
    __tablename__ = "STANDARD_APP_PARAMS"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    param_code = Column(Unicode(100), unique=True, index=True, nullable=False)
    param_name = Column(Unicode(255), nullable=False)
    param_type = Column(Unicode(50), nullable=False, default="FUNCTION")  # FUNCTION | CONFIG
    status = Column(Integer, nullable=False, default=1)                   # 1: Bật, 0: Tắt
    param_value = Column(Unicode(2000), nullable=True, default="")
    note = Column(UnicodeText, nullable=True)
    category = Column(Unicode(100), nullable=True)
    priority = Column(Integer, default=0)
    nguoi_tao = Column(Unicode(100), nullable=True)
    nguoi_update = Column(Unicode(100), nullable=True)
    ngay_tao = Column(DateTime, default=datetime.now)
    ngay_update = Column(DateTime, default=datetime.now, onupdate=datetime.now)
