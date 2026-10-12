from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class Violation(Base):
    """Bảng ghi nhận lỗi trong quá trình làm việc (Miss mail, xử lý trễ, làm sai việc...)"""
    __tablename__ = "GHINHAN_SAIPHAM"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    NGUOI_SAIPHAMM: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)  # Username
    HO_TEN: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    NOIDUNG: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    LOAI_SAIPHAM: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)  # miss_mail, late_processing, wrong_action, other
    DATE_SAIPHAM: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    GIAITRINH: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    TRANGTHAI: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    IMAGES: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    FILES: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    DATE_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    DATE_UPDATE: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    USER_INSERT: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    USER_UPDATE: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)

    @property
    def nguoi_saipham(self) -> Optional[str]:
        return self.NGUOI_SAIPHAMM

    @property
    def ho_ten(self) -> Optional[str]:
        return self.HO_TEN

    @property
    def noidung(self) -> Optional[str]:
        return self.NOIDUNG

    @property
    def loai_saipham(self) -> Optional[str]:
        return self.LOAI_SAIPHAM

    @property
    def date_saipham(self) -> Optional[datetime]:
        return self.DATE_SAIPHAM

    @property
    def giaitrinh(self) -> Optional[str]:
        return self.GIAITRINH

    @property
    def trangthai(self) -> Optional[bool]:
        return self.TRANGTHAI

    @property
    def images(self) -> Optional[str]:
        return self.IMAGES

    @property
    def files(self) -> Optional[str]:
        return self.FILES

    @property
    def date_insert(self) -> Optional[datetime]:
        return self.DATE_INSERT

    @property
    def date_update(self) -> Optional[datetime]:
        return self.DATE_UPDATE

    @property
    def user_insert(self) -> Optional[str]:
        return self.USER_INSERT

    @property
    def user_update(self) -> Optional[str]:
        return self.USER_UPDATE

    @property
    def active(self) -> Optional[bool]:
        return self.ACTIVE


class StaffLeaveLog(Base):
    """Bảng ghi nhận ngày nghỉ phép, xin về sớm"""
    __tablename__ = "STAFF_LEAVE_LOGS"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    USERNAME: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    FULL_NAME: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    LEAVE_TYPE: Mapped[str] = mapped_column(Unicode(50), nullable=False)  # annual_leave, half_day, early_leave, unpaid_leave, other
    START_TIME: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    END_TIME: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    REASON: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NOTE: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    USER_INSERT: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    DATE_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)

    @property
    def username(self) -> str:
        return self.USERNAME

    @property
    def full_name(self) -> Optional[str]:
        return self.FULL_NAME

    @property
    def leave_type(self) -> str:
        return self.LEAVE_TYPE

    @property
    def start_time(self) -> datetime:
        return self.START_TIME

    @property
    def end_time(self) -> Optional[datetime]:
        return self.END_TIME

    @property
    def reason(self) -> Optional[str]:
        return self.REASON

    @property
    def note(self) -> Optional[str]:
        return self.NOTE

    @property
    def user_insert(self) -> Optional[str]:
        return self.USER_INSERT

    @property
    def date_insert(self) -> Optional[datetime]:
        return self.DATE_INSERT

    @property
    def active(self) -> Optional[bool]:
        return self.ACTIVE


class StaffLeaveType(Base):
    """Bảng cấu hình các loại ghi nhận nghỉ phép, xin về sớm"""
    __tablename__ = "STAFF_LEAVE_TYPES"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    CODE: Mapped[str] = mapped_column(Unicode(50), unique=True, nullable=False)
    NAME: Mapped[str] = mapped_column(Unicode(150), nullable=False)
    COLOR: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    SORT_ORDER: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    IS_ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    DATE_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
    DATE_UPDATE: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    USER_INSERT: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    USER_UPDATE: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)

    @property
    def code(self) -> str:
        return self.CODE

    @property
    def name(self) -> str:
        return self.NAME

    @property
    def color(self) -> Optional[str]:
        return self.COLOR

    @property
    def sort_order(self) -> Optional[int]:
        return self.SORT_ORDER

    @property
    def is_active(self) -> Optional[bool]:
        return self.IS_ACTIVE


