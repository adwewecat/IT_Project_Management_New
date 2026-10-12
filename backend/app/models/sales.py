from typing import Optional
from datetime import datetime, date
from sqlalchemy import Unicode, Integer, Boolean, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CheckSalesDaily(Base):
    __tablename__ = "SO_LIEU_CHECK_SALES_DAILY"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    dvcs: Mapped[Optional[str]] = mapped_column("DVCS", Unicode(50), nullable=True)
    ten_nhahang: Mapped[Optional[str]] = mapped_column("TEN_NHAHANG", Unicode(250), nullable=True)
    tongtien_nh: Mapped[Optional[str]] = mapped_column("TONGTIEN_NH", Unicode(100), nullable=True)
    tongtien_sv: Mapped[Optional[str]] = mapped_column("TONGTIEN_SV", Unicode(100), nullable=True)
    sl_khach_nh: Mapped[Optional[str]] = mapped_column("SL_KHACH_NH", Unicode(50), nullable=True)
    sl_khach_sv: Mapped[Optional[str]] = mapped_column("SL_KHACH_SV", Unicode(50), nullable=True)
    ngay_sale: Mapped[Optional[date]] = mapped_column("NGAY_SALE", Date, nullable=True)
    active: Mapped[Optional[bool]] = mapped_column("ACTIVE", Boolean, default=True, nullable=True)
    note: Mapped[Optional[str]] = mapped_column("NOTE", Unicode(250), nullable=True)
    trangthai: Mapped[Optional[str]] = mapped_column("TRANGTHAI", Unicode(50), nullable=True)
    ip_nhahang: Mapped[Optional[str]] = mapped_column("IP_NHAHANG", Unicode(50), nullable=True)
    lan1_ketnoi_nh: Mapped[Optional[str]] = mapped_column("LAN1_KETNOI_NH", Unicode(50), nullable=True)
    thoigian_lay_sale_lan1: Mapped[Optional[datetime]] = mapped_column("THOIGIAN_LAY_SALE_LAN1", DateTime, nullable=True)
    thoigian_lay_sale_lan2: Mapped[Optional[datetime]] = mapped_column("THOIGIAN_LAY_SALE_LAN2", DateTime, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column("CREATED_AT", DateTime, default=datetime.now, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column("UPDATED_AT", DateTime, default=datetime.now, onupdate=datetime.now, nullable=True)


class TotalSalesDaily(Base):
    __tablename__ = "TOTAL_SALES_DAILY"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ngay: Mapped[Optional[datetime]] = mapped_column("NGAY", DateTime, nullable=True)
    total_sale: Mapped[Optional[str]] = mapped_column("TOTAL_SALE", Unicode(250), nullable=True)
    total_tc: Mapped[Optional[str]] = mapped_column("TOTAL_TC", Unicode(250), nullable=True)
    active: Mapped[Optional[bool]] = mapped_column("ACTIVE", Boolean, default=True, nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column("CREATED_AT", DateTime, default=datetime.now, nullable=True)
