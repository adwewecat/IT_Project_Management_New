from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SystemIncident(Base):
    __tablename__ = "GHINHAN_SUCO_HETHONG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tieude: Mapped[str] = mapped_column(Unicode(250), nullable=False)
    he_thong: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    muc_do: Mapped[Optional[str]] = mapped_column(Unicode(50), default="Cao", nullable=True)
    thoi_gian_bat_dau: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    thoi_gian_ket_thuc: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    thoi_gian_gian_doan_phut: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    noi_dung: Mapped[str] = mapped_column(UnicodeText, nullable=False)
    nguyen_nhan: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    bien_phap_khac_phuc: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    trang_thai: Mapped[str] = mapped_column(Unicode(50), default="DANG_XU_LY", nullable=False)
    nguoi_ghi_nhan: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    nguoi_xu_ly: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ghi_chu_tien_do: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    images: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    files: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
