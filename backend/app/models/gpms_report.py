# -*- coding: utf-8 -*-
"""
Models SQLAlchemy cho phân hệ Báo Cáo GPMS:
- GpmsReportBatch: Lưu trữ các kỳ/file Excel báo cáo GPMS đã nạp kèm payload nén phục vụ phân tích đa chiều tức thì.
- GpmsRegionConfig: Cấu hình danh sách User người xử lý thuộc khu vực Miền Nam (các user khác tự động tính vào Miền Bắc).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class GpmsReportBatch(Base):
    """Bảng lưu trữ các đợt import file Excel báo cáo chi tiết công việc GPMS."""

    __tablename__ = "GPMS_REPORT_BATCHES"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    report_name: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    file_name: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    period_label: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    export_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    total_rows: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_senders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unique_receivers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    source_type: Mapped[str] = mapped_column(Unicode(30), default="UPLOAD", nullable=False)
    # Lưu JSON danh sách ticket đã nén gzip + base64 ASCII (tương thích VARCHAR(MAX) MSSQL, không phụ thuộc file ổ đĩa)
    payload_gzip_b64: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class GpmsRegionConfig(Base):
    """Bảng cấu hình User nhận yêu cầu thuộc Miền Nam (toàn bộ user còn lại thuộc Miền Bắc)."""

    __tablename__ = "GPMS_REGION_CONFIG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(Unicode(100), nullable=False, unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    region: Mapped[str] = mapped_column(Unicode(20), default="NAM", nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
