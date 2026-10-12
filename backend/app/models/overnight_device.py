from datetime import datetime, date
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class OvernightDeviceLog(Base):
    __tablename__ = "OVERNIGHT_DEVICES_LOG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    scan_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    restaurant_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    sap_code: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    rk7_code: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    restaurant_name: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    ip_gateway: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    subnet: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    overnight_devices: Mapped[str] = mapped_column(Unicode(500), nullable=False)
    device_count: Mapped[int] = mapped_column(Integer, default=0)
    raw_details: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    summary_line: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)