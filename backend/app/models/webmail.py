# -*- coding: utf-8 -*-
"""
Model dữ liệu cho phân hệ Webmail & Soạn Email Tập Trung.
Bao gồm:
- SystemEmailConfig: Cấu hình tài khoản email dùng chung (ss.it.application@ggg.com.vn) & thông số SMTP.
- UserEmailSignature: Cấu hình chữ ký email theo từng user đăng nhập.
- WebmailSentLog: Nhật ký lưu vết các email đã gửi thành công/thất bại từ giao diện web.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional
from sqlalchemy import Integer, Unicode, UnicodeText, DateTime, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class SystemEmailConfig(Base):
    """Bảng cấu hình email dùng chung hệ thống và thiết lập máy chủ SMTP/OAuth."""
    __tablename__ = "SYSTEM_EMAIL_CONFIG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_name: Mapped[str] = mapped_column(Unicode(100), default="Mail Chung IT Application", nullable=False)
    email_address: Mapped[str] = mapped_column(Unicode(255), default="ss.it.application@ggg.com.vn", nullable=False)
    email_password: Mapped[str] = mapped_column(Unicode(255), default="He110@app8888", nullable=False)
    smtp_host: Mapped[str] = mapped_column(Unicode(255), default="smtp.office365.com", nullable=False)
    smtp_port: Mapped[int] = mapped_column(Integer, default=587, nullable=False)
    smtp_use_tls: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_to: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    default_cc: Mapped[str] = mapped_column(
        Unicode(500), 
        default="hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;", 
        nullable=False
    )
    client_id: Mapped[str] = mapped_column(
        Unicode(255), 
        default="d3590ed6-52b3-4102-aeff-aad2292ab01c", 
        nullable=False
    )
    updated_by: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)


class UserEmailSignature(Base):
    """Bảng lưu trữ thông tin và chữ ký email tùy biến theo từng user đăng nhập."""
    __tablename__ = "USER_EMAIL_SIGNATURE"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(Unicode(100), nullable=False, unique=True, index=True)
    full_name: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    job_title: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    department: Mapped[Optional[str]] = mapped_column(
        Unicode(255), 
        default="GOLDEN GATE GROUP – SOUTH BRANCH", 
        nullable=True
    )
    office_address: Mapped[Optional[str]] = mapped_column(
        Unicode(500), 
        default="7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh", 
        nullable=True
    )
    office_phone: Mapped[Optional[str]] = mapped_column(
        Unicode(100), 
        default="028 7300 9000 (ext: 8740)", 
        nullable=True
    )
    mobile: Mapped[Optional[str]] = mapped_column(Unicode(100), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(Unicode(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(Unicode(255), default="www.ggg.com.vn", nullable=True)
    signature_html: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    use_custom_html: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)


class WebmailSentLog(Base):
    """Bảng lưu vết lịch sử gửi email trực tiếp từ webmail để kiểm soát và truy vết."""
    __tablename__ = "WEBMAIL_SENT_LOG"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sender_username: Mapped[str] = mapped_column(Unicode(100), nullable=False, index=True)
    from_email: Mapped[str] = mapped_column(Unicode(255), nullable=False)
    to_emails: Mapped[str] = mapped_column(UnicodeText, nullable=False)
    cc_emails: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(Unicode(500), nullable=True)
    body_preview: Mapped[Optional[str]] = mapped_column(Unicode(1000), nullable=True)
    attachments_info: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="SUCCESS", nullable=False)
    error_message: Mapped[Optional[str]] = mapped_column(UnicodeText, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)


class WebmailUserRead(Base):
    """Bảng lưu vết trạng thái ĐÃ ĐỌC của từng user đối với từng email trong hòm thư dùng chung."""
    __tablename__ = "WEBMAIL_USER_READ"
    __table_args__ = {"schema": "dbo"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(Unicode(100), nullable=False, index=True)
    message_id: Mapped[str] = mapped_column(Unicode(255), nullable=False, index=True)
    read_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)

