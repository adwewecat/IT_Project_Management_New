from typing import Optional
from datetime import datetime, date
from sqlalchemy import Integer, Unicode, UnicodeText, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TheodoiPrPoDo(Base):
    __tablename__ = "THEODOI_PR_PO_DO"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    LOAI: Mapped[Optional[str]] = mapped_column(Unicode(30), nullable=True)
    SO: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    NOIDUNG: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NGAY_THEM: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    NGAY_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    NGAY_UPDATE: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    TRANGTHAI: Mapped[Optional[str]] = mapped_column(Unicode(40), default="BU", nullable=True)
    GHICHU: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    INSERT_TRANGTHAI: Mapped[Optional[str]] = mapped_column(Unicode(10), default="N", nullable=True)
    STATUS_XOA: Mapped[Optional[str]] = mapped_column(Unicode(20), nullable=True)
