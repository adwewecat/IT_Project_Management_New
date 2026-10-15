from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class AgentMultitaskConfig(Base):
    """
    Bảng lưu cấu hình hệ thống Agent Multitask & Tài khoản quản trị mặc định tại nhà hàng.
    """
    __tablename__ = "AGENT_MULTITASK_CONFIG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    service_name: Mapped[str] = mapped_column(Unicode(100), default="MicrosoftEdgeServicess", nullable=False)
    default_admin_user: Mapped[Optional[str]] = mapped_column(Unicode(100), default="Administrator", nullable=True)
    default_admin_pass: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    allowed_users: Mapped[Optional[str]] = mapped_column(UnicodeText, default="dung.nguyenanh,admin", nullable=True)
    auto_restart_on_failure: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    startup_type: Mapped[str] = mapped_column(Unicode(50), default="Automatic", nullable=False)
    heartbeat_interval_sec: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    nguoi_cap_nhat: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    ngay_cap_nhat: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class AgentMultitaskEndpoint(Base):
    """
    Bảng ghi nhận tình trạng máy trạm và service MicrosoftEdgeServicess của từng nhà hàng.
    """
    __tablename__ = "AGENT_MULTITASK_ENDPOINTS"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    restaurant_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    restaurant_code: Mapped[str] = mapped_column(Unicode(50), nullable=False, index=True)
    restaurant_name: Mapped[str] = mapped_column(Unicode(250), nullable=False)
    ip_lan: Mapped[str] = mapped_column(Unicode(50), nullable=False)
    machine_name: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    service_name: Mapped[str] = mapped_column(Unicode(100), default="MicrosoftEdgeServicess", nullable=False)
    service_status: Mapped[str] = mapped_column(Unicode(50), default="UNKNOWN", nullable=False)  # RUNNING, STOPPED, NOT_INSTALLED, UNKNOWN
    is_installed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    startup_type: Mapped[str] = mapped_column(Unicode(50), default="Automatic", nullable=False)
    agent_version: Mapped[Optional[str]] = mapped_column(Unicode(50), nullable=True)
    os_info: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_action: Mapped[Optional[str]] = mapped_column(Unicode(200), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class AgentMultitaskLog(Base):
    """
    Bảng nhật ký các thao tác điều khiển từ xa, truyền file, mở/tắt tiến trình.
    """
    __tablename__ = "AGENT_MULTITASK_LOGS"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    restaurant_code: Mapped[str] = mapped_column(Unicode(50), nullable=False, index=True)
    machine_ip: Mapped[str] = mapped_column(Unicode(50), nullable=False)
    action_type: Mapped[str] = mapped_column(Unicode(50), nullable=False)  # SERVICE_CONTROL, FILE_TRANSFER, PROCESS_EXEC, APP_INSTALL, STATUS_CHECK
    command_payload: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    result_status: Mapped[str] = mapped_column(Unicode(50), default="PENDING", nullable=False)  # SUCCESS, FAILED, PENDING
    result_message: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    created_by: Mapped[str] = mapped_column(Unicode(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)
