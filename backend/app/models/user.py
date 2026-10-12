from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, String, Boolean, DateTime, Text, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class User(Base):
    __tablename__ = "LIST_USER"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_name1: Mapped[str] = mapped_column(Unicode(50), nullable=False, index=True)
    pass_: Mapped[str] = mapped_column("pass", Unicode(200), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    manv: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ngay_insert: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ngay_update: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    note: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    phanquyen: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    quyen_mo_rong: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)


class PermissionDetail(Base):
    __tablename__ = "PHANQUYEN_DETAIL"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_quyen: Mapped[str] = mapped_column(Unicode(50), nullable=False, index=True)
    chucnang: Mapped[str] = mapped_column(Unicode(250), nullable=False)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)


class RoleLevel(Base):
    __tablename__ = "LV_QUYEN"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tenquyen: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    noidung: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    capbac: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    ghichu: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    active: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
