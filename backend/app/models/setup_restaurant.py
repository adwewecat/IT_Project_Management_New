from datetime import datetime
from typing import Optional, List
from sqlalchemy import Unicode, UnicodeText, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ListSetupNhNew(Base):
    __tablename__ = "LIST_SETUP_NH_NEW"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    TEN_NH: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NGAY_DUKIEN_KHAITRUONG: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    IT_PHUTRACH: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    AM_PHUTRACH: Mapped[Optional[str]] = mapped_column(Unicode(250), nullable=True)
    NOTE_THEM: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    TRANGTHAI: Mapped[Optional[str]] = mapped_column(Unicode(250), default="Mới - Đang Setup", nullable=True)
    BRAND: Mapped[Optional[str]] = mapped_column(Unicode(50), default="GGG", nullable=True)
    NGAY_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    NGAY_UPDATE: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
    ReviewStatus: Mapped[Optional[str]] = mapped_column(Unicode(20), nullable=True)
    ReviewNote: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    ReviewedBy: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ReviewedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    checklist_details: Mapped[List["ChecklistSetupNhNewDetail"]] = relationship(
        "ChecklistSetupNhNewDetail",
        back_populates="restaurant",
        cascade="all, delete-orphan",
        order_by="ChecklistSetupNhNewDetail.STT"
    )


class ChecklistSetupNhNewMaster(Base):
    __tablename__ = "CHECKLIST_SETUP_NH_NEW"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    NOIDUNG: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    GHICHU: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NHOM: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    STT: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)
    NGAY_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    NGAY_UPDATE: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class ChecklistSetupNhNewDetail(Base):
    __tablename__ = "CHECKLIST_SETUP_NH_NEW_DETAIL"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ID_NH_NEW: Mapped[int] = mapped_column(Integer, ForeignKey("LIST_SETUP_NH_NEW.id", ondelete="CASCADE"), nullable=False)
    STT: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    NOIDUNG: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NHOM: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    NGAY_INSERT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, nullable=True)
    GHICHU: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    HOANTHANH: Mapped[Optional[str]] = mapped_column(Unicode(10), nullable=True)
    NGAY_HOANTHANH: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    USER_HOANTHANH: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True, nullable=True)

    # Relationships
    restaurant: Mapped["ListSetupNhNew"] = relationship("ListSetupNhNew", back_populates="checklist_details")

    @property
    def is_completed(self) -> bool:
        """
        Checklist item is completed if USER_HOANTHANH is set or ACTIVE == False.
        """
        return bool(self.USER_HOANTHANH and self.USER_HOANTHANH.strip()) or (self.ACTIVE is False)
