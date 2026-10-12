from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class HotlineCallLog(Base):
    __tablename__ = "HOTLINE_CALL_LOGS"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ext: Mapped[str] = mapped_column(Unicode(50), nullable=False)  # Số máy lẻ EXT (ví dụ: '1172')
    caller_raw_text: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)  # Text gốc từ 3CX PWA
    restaurant_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    restaurant_name: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    restaurant_sap: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    restaurant_rk7: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    restaurant_ip: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    call_status: Mapped[str] = mapped_column(Unicode(50), default="MISSED")  # 'ACTIVE', 'ANSWERED', 'BUSY', 'MISSED'
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False)  # True nếu đã gọi lại / xử lý xong (Done)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    duty_user: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
