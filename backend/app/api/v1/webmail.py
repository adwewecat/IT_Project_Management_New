# -*- coding: utf-8 -*-
"""
API Endpoints cho phân hệ Webmail & Soạn Email Tập Trung.
Prefix: /webmail
"""

import base64
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, is_super_admin_user
from app.schemas.auth import UserInfo
from app.services.webmail_service import WebmailService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webmail", tags=["Webmail"])


def check_is_dung_or_super_admin(user: UserInfo) -> bool:
    """Kiểm tra người dùng có phải là dung.nguyenanh hoặc Super Admin hay không."""
    if not user:
        return False
    if is_super_admin_user(user) or user.is_super_admin or str(user.phanquyen) == "0":
        return True
    uname = (user.username or "").lower().strip()
    return uname in ("dung.nguyenanh", "admin", "administrator")


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================

class SystemEmailConfigUpdate(BaseModel):
    account_name: Optional[str] = None
    email_address: Optional[str] = None
    email_password: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_use_tls: Optional[bool] = None
    default_to: Optional[str] = None
    default_cc: Optional[str] = None
    client_id: Optional[str] = None


class UserSignatureUpdate(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    office_address: Optional[str] = None
    office_phone: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    signature_html: Optional[str] = None
    use_custom_html: Optional[bool] = None


class MarkReadRequest(BaseModel):
    is_read: bool = True


# ==========================================
# CẤU HÌNH HỆ THỐNG EMAIL (ADMIN ONLY)
# ==========================================

@router.get("/config")
def get_system_email_config(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy thông tin cấu hình email hệ thống (chỉ dung.nguyenanh và Super Admin mới thấy mật khẩu thực)."""
    is_admin = check_is_dung_or_super_admin(current_user)
    return WebmailService.get_config_dict(db, is_admin=is_admin)


@router.put("/config")
def update_system_email_config(
    payload: SystemEmailConfigUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Cập nhật thông số email hệ thống (Chỉ dung.nguyenanh và Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên cao cấp (dung.nguyenanh hoặc Super Admin) mới có quyền chỉnh sửa cấu hình email hệ thống."
        )
    return WebmailService.update_config(db, payload.model_dump(exclude_unset=True), current_user)


@router.post("/test-connection")
def test_system_email_connection(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Kiểm tra kết nối Microsoft Graph API và cổng gửi thư SMTP."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên (dung.nguyenanh hoặc Super Admin) mới có quyền chạy kiểm thử kết nối email."
        )
    return WebmailService.test_connection(db)


# ==========================================
# HỘP THƯ ĐẾN & EMAIL CHƯA ĐỌC
# ==========================================

@router.get("/messages")
def get_inbox_messages(
    filter_type: str = Query("unread", pattern="^(unread|all|sent)$"),
    search: str = Query("", max_length=100),
    top: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Lấy danh sách thư từ Microsoft Graph API.
    Mặc định filter_type='unread' tải danh sách email chưa đọc lên cho user.
    """
    return WebmailService.get_messages(
        db=db,
        current_username=current_user.username,
        filter_type=filter_type,
        search_query=search,
        top=top,
        skip=skip
    )


@router.get("/messages/{message_id}")
def get_message_detail(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Xem chi tiết một email.
    Tự động đánh dấu email này là ĐÃ ĐỌC riêng cho user hiện tại trong database.
    """
    try:
        return WebmailService.get_message_detail(db, message_id, current_username=current_user.username)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Lỗi không mong muốn khi tải chi tiết email {message_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi đọc email: {str(e)}"
        )


@router.post("/messages/{message_id}/read")
def mark_message_read_state(
    message_id: str,
    payload: MarkReadRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Đánh dấu một email là đã đọc hoặc chưa đọc đối với user hiện tại."""
    return WebmailService.mark_as_read(db, message_id, payload.is_read, current_username=current_user.username)


@router.post("/mark-all-read")
def mark_all_messages_as_read(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Đánh dấu tất cả email chưa đọc trong hòm thư là ĐÃ ĐỌC riêng cho user hiện tại."""
    return WebmailService.mark_all_as_read(db, current_username=current_user.username)


@router.get("/messages/{message_id}/attachments/{attachment_id}")
def download_attachment(
    message_id: str,
    attachment_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Tải tệp đính kèm từ email."""
    data = WebmailService.get_attachment_content(db, message_id, attachment_id)
    content_bytes = base64.b64decode(data.get("contentBytes", ""))
    filename = data.get("name", "attachment")
    content_type = data.get("contentType", "application/octet-stream")

    return Response(
        content=content_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ==========================================
# CẤU HÌNH CHỮ KÝ THEO TỪNG USER
# ==========================================

@router.get("/signature")
def get_user_signature(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy chữ ký email của user hiện tại (tự động nạp mẫu Golden Gate nếu chưa có)."""
    return WebmailService.get_user_signature(
        db,
        current_user.username,
        user_display_name=current_user.full_name or current_user.username
    )


@router.put("/signature")
def update_user_signature(
    payload: UserSignatureUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Cập nhật chữ ký email của user hiện tại."""
    return WebmailService.update_user_signature(
        db,
        current_user.username,
        payload.model_dump(exclude_unset=True)
    )


# ==========================================
# SOẠN & GỬI EMAIL TỪ WEB (KÈM FILE TỐI ĐA 30MB)
# ==========================================

@router.post("/send")
async def send_webmail(
    to: str = Form(..., description="Danh sách email nhận, phân cách bởi dấu chấm phẩy hoặc phẩy"),
    cc: Optional[str] = Form("", description="Danh sách email CC"),
    subject: str = Form(..., description="Tiêu đề email"),
    body_html: str = Form(..., description="Nội dung email định dạng HTML"),
    files: Optional[List[UploadFile]] = File(None, description="Danh sách tệp đính kèm (hỗ trợ dung lượng lớn tối đa 30MB)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Soạn và gửi email trực tiếp từ Web:
    - To: địa chỉ người nhận.
    - CC: mặc định có hcm.it.appsupport@ggg.com.vn ; tuan.pham@ggg.com.vn ;, có thể thêm/bớt.
    - Đính kèm file tối đa 30MB (chuẩn Office 365).
    - Tự động chèn chữ ký theo user đang đăng nhập.
    """
    to_list = [t.strip() for t in to.replace(";", ",").split(",") if t.strip()]
    cc_list = [c.strip() for c in (cc or "").replace(";", ",").split(",") if c.strip()]

    file_tuples = []
    if files:
        for f in files:
            if f.filename:
                content = await f.read()
                file_tuples.append((f.filename, content, f.content_type or "application/octet-stream"))

    return WebmailService.send_email(
        db=db,
        current_user=current_user,
        to_recipients=to_list,
        cc_recipients=cc_list,
        subject=subject,
        body_html=body_html,
        files=file_tuples
    )


@router.get("/sent-logs")
def get_sent_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách nhật ký email đã gửi từ hệ thống webmail."""
    return WebmailService.get_sent_logs(db, limit=limit)
