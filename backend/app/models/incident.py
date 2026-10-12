from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Incident(Base):
    __tablename__ = "GHINHAN_SUVU"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    APPNAME: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    NOIDUNG: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    TRANGTHAI: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    DATE_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    DATE_LOI: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    USER_INSERT: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    IS_PRIVATE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)

    # Chi tiết nhà hàng
    RESTAURANT_ID: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    RESTAURANT_NAME: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    SAP_CODE: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    RK7_CODE: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    IP_ADDRESS: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)

    # Phân công & xử lý
    ASSIGN_TYPE: Mapped[Optional[str]] = mapped_column(Unicode(50), default="LEADER", nullable=True)
    ASSIGNED_TO: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ASSIGNED_NAME: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)

    # Tiến độ & đính kèm
    PROGRESS_NOTES: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    IMAGES: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    FILES: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)

    # Chốt hoàn thành
    RESOLVED_AT: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    RESOLVED_BY: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    DATE_UPDATE: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    USER_UPDATE: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)

