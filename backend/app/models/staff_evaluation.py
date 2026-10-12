from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class StaffEvaluationConfig(Base):
    """Bảng lưu danh sách nhân viên được cấu hình đánh giá (thêm, bớt, lưu lại)"""
    __tablename__ = "STAFF_EVALUATION_CONFIG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    CONFIG_KEY: Mapped[str] = mapped_column(Unicode(100), default="EVALUATED_STAFF", nullable=False)
    USERNAME: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    FULL_NAME: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    IS_ACTIVE: Mapped[Optional[bool]] = mapped_column(Boolean, default=True)
    SORT_ORDER: Mapped[Optional[int]] = mapped_column(Integer, default=0)
    UPDATED_BY: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    UPDATED_AT: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now)
