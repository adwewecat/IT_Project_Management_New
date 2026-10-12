from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SoftwareVersion(Base):
    __tablename__ = "SOFTWARE_VERSIONS"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    phan_mem: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    phien_ban: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    ngay_update: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    noi_dung_update: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    nguoi_update: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    hinh_anh: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    ghi_chu: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

