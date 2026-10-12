from typing import Optional
from datetime import datetime
from sqlalchemy import Unicode, UnicodeText, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Region(Base):
    __tablename__ = "REGION"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ma_tinhthanh: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ten_tinhthanh: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    bienso: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    timkiem: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)


class Brand(Base):
    __tablename__ = "BRAND"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mabrand: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    tenbrand: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    ngay_insert: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    user_them: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
