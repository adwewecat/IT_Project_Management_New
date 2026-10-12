from typing import Optional
from datetime import datetime
from sqlalchemy import Integer, Boolean, DateTime, UnicodeText, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class LichTrucHotline(Base):
    __tablename__ = "LICHTRUC_HOTLINE"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    THANG: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    NOIDUNG: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NGAY_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    USER_INSERT: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    TEAM: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
