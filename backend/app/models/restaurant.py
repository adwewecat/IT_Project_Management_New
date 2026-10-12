from typing import Optional
from datetime import datetime, date
from sqlalchemy import Unicode, UnicodeText, Integer, Boolean, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Restaurant(Base):
    __tablename__ = "RESTAURANT"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    res: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)  # Tên nhà hàng
    sap: Mapped[Optional[str]] = mapped_column(Unicode(40), nullable=True)
    coscenter: Mapped[Optional[str]] = mapped_column(Unicode(40), nullable=True)
    rk7: Mapped[Optional[str]] = mapped_column(Unicode(40), nullable=True)
    sap_old: Mapped[Optional[str]] = mapped_column(Unicode(10), nullable=True)
    oracale: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    don_gia: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    
    # Địa điểm & Liên hệ
    address: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    region: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    brand: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    sdt_nh: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    
    # Trạng thái & Ngày
    trangthai: Mapped[Optional[str]] = mapped_column(Unicode(10), default="ON", nullable=True)  # ON / OFF
    status: Mapped[Optional[str]] = mapped_column(Unicode(20), nullable=True)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    ngay_khaitruong: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Mạng & Remote
    ip: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)  # IP LAN
    ip_wan: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    teamview_pc: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    teamview_pos11: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    teamview_pos12: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    rustdesk_pos11: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    rustdesk_pos12: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)

    # Đường truyền & Dịch vụ văn phòng
    pass_ou_ko_sys: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    user_ftth: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    pass_ftth: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    thanhtoan_ftth: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    ngay_online_ftth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    dk_truyenthong: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    pass_mail: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ext: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    sys_sales: Mapped[Optional[str]] = mapped_column(Unicode(10), nullable=True)

    # Ghi chú & Tìm kiếm
    note: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    timkiem: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)

    # Nhật ký
    ngay_insert: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    user_insert: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ngay_update: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    user_update: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
