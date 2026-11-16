# -*- coding: utf-8 -*-
"""
Models SQLAlchemy cho phân hệ Tự Động Phân Hàng Đợi Trực Hotline 3CX:
- Hotline3cxMember (HOTLINE_3CX_MEMBERS): Danh mục nhân sự trực tổng đài và line nội bộ 3CX.
- Hotline3cxSchedule (HOTLINE_3CX_SCHEDULES): Lịch phân line trực hotline theo ngày (ca sáng, ca chiều, cuối tuần).
- Hotline3cxSyncLog (HOTLINE_3CX_SYNC_LOGS): Nhật ký đồng bộ Playwright vào portal 3CX.
- Hotline3cxConfig (HOTLINE_3CX_CONFIG): Cấu hình singleton tham số kết nối 3CX, giờ kích hoạt và email cảnh báo.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, Integer, Unicode, UnicodeText
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Hotline3cxMember(Base):
    """
    Bảng danh mục nhân sự & máy nhánh (line) trực hotline 3CX.
    Lưu trữ số máy nhánh (ext_line), họ tên và trạng thái hoạt động.
    """

    __tablename__ = "HOTLINE_3CX_MEMBERS"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ext_line: Mapped[str] = mapped_column(Unicode(20), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(Unicode(200), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(Unicode(100), default="", nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )


class Hotline3cxSchedule(Base):
    """
    Bảng lưu lịch gán line trực hotline 3CX theo ngày.
    Hỗ trợ chế độ AUTO (tự nhận diện T2-T6 vs T7-CN), WEEKDAY hoặc WEEKEND.
    Các trường JSON lưu mảng số máy nhánh (VD: '["8740", "8741"]').
    """

    __tablename__ = "HOTLINE_3CX_SCHEDULES"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    duty_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False, index=True)
    shift_mode: Mapped[str] = mapped_column(Unicode(20), default="AUTO", nullable=False)
    morning_lines_json: Mapped[str] = mapped_column(UnicodeText, default="[]", nullable=False)
    evening_lines_json: Mapped[str] = mapped_column(UnicodeText, default="[]", nullable=False)
    weekend_lines_json: Mapped[str] = mapped_column(UnicodeText, default="[]", nullable=False)
    weekend_evening_override_json: Mapped[str] = mapped_column(
        UnicodeText, default="[]", nullable=False
    )
    note: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )


class Hotline3cxSyncLog(Base):
    """
    Bảng ghi nhận nhật ký từng phiên đồng bộ line trực vào Portal 3CX bằng Playwright.
    Ghi nhận trạng thái (SUCCESS / FAILED / SKIPPED / DRY_RUN), đường dẫn ảnh chụp màn hình và lỗi nếu có.
    """

    __tablename__ = "HOTLINE_3CX_SYNC_LOGS"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    duty_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_code: Mapped[str] = mapped_column(Unicode(20), nullable=False)
    queue_name: Mapped[str] = mapped_column(Unicode(150), nullable=False)
    applied_lines_json: Mapped[str] = mapped_column(UnicodeText, default="[]", nullable=False)
    status: Mapped[str] = mapped_column(Unicode(20), nullable=False)
    is_dry_run: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    triggered_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    screenshot_path: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Hotline3cxConfig(Base):
    """
    Bảng cấu hình singleton (id=1) cho phân hệ tự động trực Hotline 3CX.
    Lưu URL Portal 3CX, tài khoản đăng nhập, mật khẩu mã hóa và danh sách hàng đợi cần cấu hình.
    """

    __tablename__ = "HOTLINE_3CX_CONFIG"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    portal_url: Mapped[str] = mapped_column(
        Unicode(500), default="https://ggg.ringbot.co:5001/#/login", nullable=False
    )
    username: Mapped[str] = mapped_column(Unicode(100), default="8740", nullable=False)
    password_enc: Mapped[str] = mapped_column(Unicode(500), default="", nullable=False)
    day_queue_name: Mapped[str] = mapped_column(
        Unicode(150), default="IT HCM App Day", nullable=False
    )
    night_queue_name: Mapped[str] = mapped_column(
        Unicode(150), default="IT HCM App Night", nullable=False
    )
    morning_time: Mapped[str] = mapped_column(Unicode(10), default="06:00", nullable=False)
    evening_time: Mapped[str] = mapped_column(Unicode(10), default="16:29", nullable=False)
    alert_emails: Mapped[str] = mapped_column(
        Unicode(1000), default="dung.nguyenanh@ggg.com.vn", nullable=False
    )
    execution_mode: Mapped[str] = mapped_column(
        Unicode(20), default="DIRECT", nullable=False
    )
    relay_token: Mapped[Optional[str]] = mapped_column(Unicode(120), nullable=True)
    relay_worker_name: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    relay_last_ip: Mapped[Optional[str]] = mapped_column(Unicode(60), nullable=True)
    relay_last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )


class Hotline3cxRelayTask(Base):
    """
    Hàng đợi tác vụ cho 3CX Sync Relay Worker (Phương án 2 khi máy chủ web bị tường lửa DC chặn cổng 5001).
    Lưu trạng thái PENDING / RUNNING / SUCCESS / DRY_RUN / FAILED / TIMEOUT và kế hoạch JSON cần đồng bộ.
    """

    __tablename__ = "HOTLINE_3CX_RELAY_TASKS"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    duty_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    shift_code: Mapped[str] = mapped_column(Unicode(20), nullable=False)
    queue_name: Mapped[str] = mapped_column(Unicode(150), nullable=False)
    is_dry_run: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    triggered_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    plan_json: Mapped[str] = mapped_column(UnicodeText, nullable=False)
    status: Mapped[str] = mapped_column(Unicode(20), default="PENDING", nullable=False, index=True)
    worker_name: Mapped[Optional[str]] = mapped_column(Unicode(150), nullable=True)
    sync_log_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    error_message: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class Hotline3cxHoliday(Base):
    """
    Bảng danh mục Ngày Lễ Riêng (ngày nghỉ lễ phát sinh / đột xuất / lễ công ty không theo lịch nhà nước).
    Các ngày trong bảng này sẽ tự động chạy theo chế độ ngày lễ (Night 0007: 06:00 Chính-Phụ -> 16:29 tự đảo)
    và được bảo vệ khi sao chép tuần hoặc áp dụng mẫu tháng.
    """

    __tablename__ = "HOTLINE_3CX_HOLIDAYS"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    holiday_date: Mapped[date] = mapped_column(Date, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Unicode(250), default="", nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
