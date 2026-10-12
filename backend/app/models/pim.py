from typing import Optional
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime, Text, UnicodeText, Unicode
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PIMRequest(Base):
    __tablename__ = "PIM"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_yeu_cau: Mapped[str] = mapped_column(Unicode(50), nullable=False, unique=True)
    chuoi: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    ten_menu: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    mo_ta: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    thoi_gian_thuc_hien: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    link_yeu_cau: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    ngay_insert: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    trang_thai_thuc_hien: Mapped[Optional[str]] = mapped_column(Unicode(50), default="chưa hoàn thành", nullable=True)
    user_thuc_hien: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    user_hoan_thanh: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    user_update: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    thoi_gian_hoan_thanh: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    thoi_gian_update: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    so: Mapped[Optional[str]] = mapped_column(Unicode(50), default="chưa hoàn thành", nullable=True)
    gui_mail: Mapped[Optional[str]] = mapped_column(Unicode(50), default="chưa hoàn thành", nullable=True)


class PIMUserThucHien(Base):
    __tablename__ = "PIM_USER_THUCHIEN"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ten_user: Mapped[str] = mapped_column(Unicode(50), nullable=False, unique=True)
    ho_ten: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    thu_tu: Mapped[int] = mapped_column(Integer, nullable=False)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
    ngay_tao: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)


class PIMLog(Base):
    __tablename__ = "PIM_LOG"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_yeu_cau: Mapped[str] = mapped_column(Unicode(50), nullable=False, index=True)
    hanh_dong: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    noi_dung: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    user_thuc_hien: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    thoi_gian: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)


class PIMConfig(Base):
    __tablename__ = "PIM_CONFIG"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sso_username: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    sso_password: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    ngay_cap_nhat: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    user_cap_nhat: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)


class PIMSchedule(Base):
    __tablename__ = "PIM_SCHEDULE"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    time_1: Mapped[str] = mapped_column(Unicode(10), default="03:00", nullable=False)
    time_2: Mapped[str] = mapped_column(Unicode(10), default="12:00", nullable=False)
    time_3: Mapped[str] = mapped_column(Unicode(10), default="16:30", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_run: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_status: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    ngay_cap_nhat: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    user_cap_nhat: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)


