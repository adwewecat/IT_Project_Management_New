# -*- coding: utf-8 -*-
"""
Dịch vụ Webmail & Soạn Email Tập Trung cho Hệ Thống IT Project Management.
Tích hợp:
- Microsoft Graph API (OAuth2 ROPC) để lấy danh sách email đến, email chưa đọc, đánh dấu đã đọc, tải file đính kèm.
- SMTP Office365 (TLS 1.2) để gửi email trực tiếp từ web kèm tệp đính kèm (tối đa 4MB) và chữ ký cá nhân hóa.
- Quản trị cấu hình email hệ thống (chỉ dung.nguyenanh và Super Admin).
- Quản lý chữ ký cá nhân hóa theo từng user đăng nhập chuẩn Golden Gate Restaurant Group.
"""

import os
import re
import json
import base64
import time
import logging
import smtplib
import ssl
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email.mime.image import MIMEImage
from email import encoders
from email.header import Header
from email.utils import formataddr
from typing import List, Dict, Any, Optional, Tuple
import httpx
from sqlalchemy import select, desc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.webmail import SystemEmailConfig, UserEmailSignature, WebmailSentLog
from app.models.user import User

logger = logging.getLogger(__name__)

# Giới hạn kích thước file đính kèm tối đa: 4MB (4 * 1024 * 1024 bytes)
MAX_ATTACHMENT_SIZE_BYTES = 4 * 1024 * 1024

# Bộ nhớ đệm token truy cập Microsoft Graph API
_TOKEN_CACHE: Dict[str, Any] = {
    "access_token": None,
    "expires_at": 0,
    "email": None
}

VN_TZ = timezone(timedelta(hours=7))


def format_iso_to_vn(dt_str: Optional[str]) -> str:
    """Chuyển chuỗi ISO 8601 UTC từ Microsoft Graph sang định dạng ngày giờ Việt Nam (UTC+7)."""
    if not dt_str:
        return ""
    try:
        # Chuẩn hóa Z thành +00:00
        clean_str = dt_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        vn_dt = dt.astimezone(VN_TZ)
        return vn_dt.strftime("%d/%m/%Y %H:%M:%S")
    except Exception:
        return dt_str


def get_default_golden_gate_signature_html(
    full_name: str,
    job_title: str = "IT Application Specialist",
    department: str = "GOLDEN GATE GROUP – SOUTH BRANCH",
    address: str = "7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh",
    office_phone: str = "028 7300 9000 (ext: 8740)",
    mobile: str = "039 749 5772",
    email: str = "dung.nguyenanh@ggg.com.vn",
    website: str = "www.ggg.com.vn"
) -> str:
    """Tạo mẫu chữ ký chuẩn của Golden Gate Restaurant Group theo đúng thiết kế Outlook trong hình ảnh."""
    return f"""
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333; line-height: 1.4; margin-top: 25px;">
  <p style="margin: 0 0 16px 0; color: #555555; font-size: 13px;">Thanks &amp; Best regards,</p>
  
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
    <tr>
      <td style="padding-bottom: 12px;" colspan="5">
        <img src="https://itdept.ggg.com.vn/ggg_logo.png" alt="Golden Gate Restaurant Group" width="160" style="display: block; border: 0;" onerror="this.src='/ggg_logo.png';" />
      </td>
    </tr>
    <tr>
      <td colspan="5">
        <div style="font-weight: 800; color: #c58315; font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          {department}
        </div>
        <div style="font-weight: 700; color: #222222; font-size: 14px; margin-bottom: 2px;">
          {full_name}
        </div>
        <div style="color: #666666; font-size: 12.5px; margin-bottom: 14px;">
          {job_title}
        </div>
      </td>
    </tr>
    <tr>
      <td style="border-top: 1px solid #e0e0e0; padding-top: 10px;" colspan="5">
        <table cellpadding="3" cellspacing="0" border="0" style="font-size: 12px; color: #333333; border-collapse: collapse;">
          <tr>
            <td style="font-weight: 700; color: #c58315; width: 22px; vertical-align: top;">A</td>
            <td style="color: #444444; vertical-align: top; max-width: 320px; line-height: 1.4;">
              7th Floor Gigamall, 240-242 Pham Van Dong<br />Hiep Binh Chanh, Thu Duc, Ho Chi Minh
            </td>
            <td style="width: 35px;">&nbsp;</td>
            <td style="font-weight: 700; color: #c58315; width: 22px; vertical-align: top;">M</td>
            <td style="color: #444444; vertical-align: top;">
              <a href="tel:{mobile}" style="color: #333333; text-decoration: none;">{mobile}</a>
            </td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">T</td>
            <td style="color: #444444; vertical-align: top;">{office_phone}</td>
            <td>&nbsp;</td>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">E</td>
            <td style="vertical-align: top;">
              <a href="mailto:{email}" style="color: #0066cc; text-decoration: underline;">{email}</a>
            </td>
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">W</td>
            <td style="vertical-align: top;">
              <a href="http://{website}" target="_blank" style="color: #0066cc; text-decoration: underline;">{website}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
"""


def embed_inline_images(html_content: str) -> Tuple[str, List[Tuple[str, bytes, str, str]]]:
    """
    Xử lý tất cả các hình ảnh trong email (bao gồm logo Golden Gate và ảnh base64 hoặc URL):
    - Chuyển đổi các hình ảnh sang dạng Inline Embedded CID Attachment (Content-ID).
    - Giúp Outlook, Gmail, Apple Mail hiển thị ảnh trực tiếp 100% mà KHÔNG bị chặn bảo mật (không báo [X] download pictures).
    Trả về: (html_mới, danh_sách_ảnh_inline [(cid, image_bytes, subtype, filename)])
    """
    inline_images: List[Tuple[str, bytes, str, str]] = []
    cid_counter = 0

    # 1. Xử lý logo Golden Gate ggg_logo.png
    pattern_logo = re.compile(r'(https?://[^"\'>]*)?/ggg_logo\.png', re.IGNORECASE)
    if pattern_logo.search(html_content):
        html_content = pattern_logo.sub('cid:ggg_logo_img', html_content)

    if 'cid:ggg_logo_img' in html_content:
        # Tìm đường dẫn file ggg_logo.png thực tế trong dự án
        current_dir = os.path.dirname(os.path.abspath(__file__))
        logo_candidates = [
            os.path.join(os.path.dirname(os.path.dirname(current_dir)), "static", "ggg_logo.png"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))), "frontend", "public", "ggg_logo.png"),
            os.path.join(current_dir, "..", "..", "static", "ggg_logo.png"),
        ]
        for lp in logo_candidates:
            if os.path.exists(lp):
                try:
                    with open(lp, "rb") as f:
                        logo_data = f.read()
                    inline_images.append(("ggg_logo_img", logo_data, "png", "ggg_logo.png"))
                    break
                except Exception as e:
                    logger.warning(f"Không thể đọc file logo tại {lp}: {e}")

    # 2. Xử lý ảnh base64 do người dùng dán vào từ clipboard
    pattern_base64 = re.compile(r'src=["\']data:image/([a-zA-Z0-9]+);base64,([a-zA-Z0-9+/=]+)["\']', re.IGNORECASE)
    def repl_b64(m):
        nonlocal cid_counter
        img_type = m.group(1).lower()
        b64_str = m.group(2)
        cid = f"inline_img_{cid_counter}"
        cid_counter += 1
        try:
            raw_bytes = base64.b64decode(b64_str)
            inline_images.append((cid, raw_bytes, img_type, f"{cid}.{img_type}"))
            return f'src="cid:{cid}"'
        except Exception:
            return m.group(0)

    html_content = pattern_base64.sub(repl_b64, html_content)

    # 3. Xử lý ảnh URL http/https bên ngoài để tránh Outlook chặn tải ảnh từ Internet
    pattern_http = re.compile(r'src=["\'](https?://[^"\']+\.(?:png|jpg|jpeg|gif|webp))["\']', re.IGNORECASE)
    def repl_http(m):
        nonlocal cid_counter
        img_url = m.group(1)
        if "ggg_logo.png" in img_url.lower():
            return 'src="cid:ggg_logo_img"'
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(img_url)
                if resp.status_code == 200 and len(resp.content) <= 3 * 1024 * 1024:
                    cid = f"inline_img_{cid_counter}"
                    cid_counter += 1
                    ext = img_url.split(".")[-1].split("?")[0].lower()
                    if ext == "jpg":
                        ext = "jpeg"
                    inline_images.append((cid, resp.content, ext, f"{cid}.{ext}"))
                    return f'src="cid:{cid}"'
        except Exception:
            pass
        return m.group(0)

    html_content = pattern_http.sub(repl_http, html_content)

    return html_content, inline_images


class WebmailService:
    """Lớp xử lý nghiệp vụ Webmail dùng chung."""

    @classmethod
    def get_or_create_config(cls, db: Session) -> SystemEmailConfig:
        """Lấy cấu hình hệ thống email từ SQL Server. Nếu chưa có thì khởi tạo bản ghi mặc định."""
        config = db.execute(select(SystemEmailConfig)).scalar_one_or_none()
        if not config:
            config = SystemEmailConfig(
                account_name="Mail Chung IT Application",
                email_address="ss.it.application@ggg.com.vn",
                email_password="He110@app8888",
                smtp_host="smtp.office365.com",
                smtp_port=587,
                smtp_use_tls=True,
                default_to="",
                default_cc="hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;",
                client_id="d3590ed6-52b3-4102-aeff-aad2292ab01c",
                updated_by="system",
                updated_at=datetime.now()
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    @classmethod
    def get_config_dict(cls, db: Session, is_admin: bool = False) -> Dict[str, Any]:
        """Lấy thông tin cấu hình dưới dạng dictionary. Che mật khẩu nếu không phải Super Admin / dung.nguyenanh."""
        cfg = cls.get_or_create_config(db)
        return {
            "id": cfg.id,
            "account_name": cfg.account_name,
            "email_address": cfg.email_address,
            "email_password": cfg.email_password if is_admin else "🔒 Bị ẩn theo phân quyền",
            "is_password_masked": not is_admin,
            "smtp_host": cfg.smtp_host,
            "smtp_port": cfg.smtp_port,
            "smtp_use_tls": cfg.smtp_use_tls,
            "default_to": cfg.default_to or "",
            "default_cc": cfg.default_cc or "",
            "client_id": cfg.client_id,
            "updated_by": cfg.updated_by,
            "updated_at": cfg.updated_at.strftime("%d/%m/%Y %H:%M:%S") if cfg.updated_at else ""
        }

    @classmethod
    def update_config(cls, db: Session, data: Dict[str, Any], current_user: User) -> Dict[str, Any]:
        """Cập nhật cấu hình email hệ thống (chỉ Super Admin hoặc dung.nguyenanh)."""
        cfg = cls.get_or_create_config(db)
        if "account_name" in data and data["account_name"]:
            cfg.account_name = str(data["account_name"]).strip()
        if "email_address" in data and data["email_address"]:
            cfg.email_address = str(data["email_address"]).strip()
        
        # Chỉ cập nhật mật khẩu nếu người dùng truyền mật khẩu thực (không phải chuỗi che 🔒)
        new_pass = data.get("email_password")
        if new_pass and "🔒" not in str(new_pass) and str(new_pass).strip():
            cfg.email_password = str(new_pass).strip()

        if "smtp_host" in data and data["smtp_host"]:
            cfg.smtp_host = str(data["smtp_host"]).strip()
        if "smtp_port" in data and data["smtp_port"]:
            cfg.smtp_port = int(data["smtp_port"])
        if "smtp_use_tls" in data:
            cfg.smtp_use_tls = bool(data["smtp_use_tls"])
        if "default_to" in data:
            cfg.default_to = str(data["default_to"]).strip() if data["default_to"] else ""
        if "default_cc" in data:
            cfg.default_cc = str(data["default_cc"]).strip() if data["default_cc"] else ""
        if "client_id" in data and data["client_id"]:
            cfg.client_id = str(data["client_id"]).strip()

        cfg.updated_by = current_user.username
        cfg.updated_at = datetime.now()
        db.commit()
        db.refresh(cfg)

        # Xóa cache token để lấy lại token mới nếu đổi thông tin
        _TOKEN_CACHE["access_token"] = None
        _TOKEN_CACHE["expires_at"] = 0

        logger.info(f"User {current_user.username} đã cập nhật cấu hình Webmail thành công.")
        return cls.get_config_dict(db, is_admin=True)

    @classmethod
    def get_graph_token(cls, db: Session, force_refresh: bool = False) -> str:
        """Lấy Bearer Token Microsoft Graph API qua cơ chế ROPC (Resource Owner Password Credentials)."""
        cfg = cls.get_or_create_config(db)
        now = time.time()

        # Kiểm tra token trong cache nếu còn hạn trên 60 giây
        if not force_refresh and _TOKEN_CACHE["access_token"] and _TOKEN_CACHE["expires_at"] > now + 60:
            if _TOKEN_CACHE["email"] == cfg.email_address:
                return _TOKEN_CACHE["access_token"]

        token_url = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"
        payload = {
            "client_id": cfg.client_id,
            "scope": "https://graph.microsoft.com/.default offline_access",
            "grant_type": "password",
            "username": cfg.email_address,
            "password": cfg.email_password
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                res = client.post(token_url, data=payload)
                if res.status_code != 200:
                    err_text = res.text
                    logger.error(f"Lỗi lấy Graph API token (HTTP {res.status_code}): {err_text}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Không thể xác thực tài khoản Microsoft với Office 365: {res.status_code} - {err_text[:200]}"
                    )
                data = res.json()
                token = data.get("access_token")
                expires_in = int(data.get("expires_in", 3600))

                _TOKEN_CACHE["access_token"] = token
                _TOKEN_CACHE["expires_at"] = now + expires_in
                _TOKEN_CACHE["email"] = cfg.email_address
                return token
        except httpx.RequestError as exc:
            logger.error(f"Lỗi kết nối tới Microsoft Token Endpoint: {exc}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Lỗi kết nối tới Microsoft OAuth Identity: {exc}"
            )

    @classmethod
    def test_connection(cls, db: Session) -> Dict[str, Any]:
        """Kiểm tra toàn diện kết nối Microsoft Graph API và cổng gửi thư SMTP."""
        cfg = cls.get_or_create_config(db)
        results = {
            "graph_api": {"status": "PENDING", "message": ""},
            "smtp": {"status": "PENDING", "message": ""},
            "overall_status": "SUCCESS"
        }

        # 1. Kiểm tra Graph API Token & Đọc hòm thư
        try:
            token = cls.get_graph_token(db, force_refresh=True)
            with httpx.Client(timeout=25.0) as client:
                res = client.get(
                    "https://graph.microsoft.com/v1.0/me/mailFolders/inbox",
                    headers={"Authorization": f"Bearer {token}"}
                )
                if res.status_code == 200:
                    inbox_info = res.json()
                    total_count = inbox_info.get("totalItemCount", 0)
                    unread_count = inbox_info.get("unreadItemCount", 0)
                    results["graph_api"]["status"] = "SUCCESS"
                    results["graph_api"]["message"] = (
                        f"Kết nối Microsoft Graph API thành công! "
                        f"Hộp thư: {cfg.email_address} (Tổng số: {total_count}, Chưa đọc: {unread_count})"
                    )
                else:
                    results["graph_api"]["status"] = "FAILED"
                    results["graph_api"]["message"] = f"Lỗi truy vấn hòm thư (HTTP {res.status_code}): {res.text[:200]}"
                    results["overall_status"] = "WARNING"
        except Exception as e:
            results["graph_api"]["status"] = "FAILED"
            results["graph_api"]["message"] = f"Lỗi xác thực Graph API: {e}"
            results["overall_status"] = "FAILED"

        # 2. Kiểm tra SMTP Đăng nhập
        try:
            context = ssl.create_default_context()
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.maximum_version = ssl.TLSVersion.TLSv1_2

            with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=20) as server:
                server.ehlo()
                if cfg.smtp_use_tls:
                    server.starttls(context=context)
                    server.ehlo()
                server.login(cfg.email_address, cfg.email_password)
                results["smtp"]["status"] = "SUCCESS"
                results["smtp"]["message"] = (
                    f"Kết nối máy chủ gửi thư SMTP ({cfg.smtp_host}:{cfg.smtp_port}) "
                    f"thành công với giao thức TLS 1.2!"
                )
        except Exception as e:
            results["smtp"]["status"] = "FAILED"
            results["smtp"]["message"] = f"Lỗi kết nối máy chủ SMTP: {e}"
            results["overall_status"] = "FAILED"

        return results

    @classmethod
    def get_messages(
        cls,
        db: Session,
        filter_type: str = "unread",
        search_query: str = "",
        top: int = 50,
        skip: int = 0
    ) -> Dict[str, Any]:
        """
        Lấy danh sách email từ Microsoft Graph API:
        - 'unread': Tải TOÀN BỘ email chưa đọc trong hòm thư (lặp qua các trang đến khi hết).
        - 'all': Chỉ tải tối đa 50 email gần nhất trong Hộp thư đến (Inbox).
        - 'sent': Chỉ tải tối đa 50 email gần nhất trong Hộp thư đã gửi (SentItems).
        """
        token = cls.get_graph_token(db)
        
        # Chọn thư mục theo filter_type: sentitems hoặc inbox
        if filter_type == "sent":
            url = "https://graph.microsoft.com/v1.0/me/mailFolders/sentitems/messages"
            params: Dict[str, Any] = {
                "$top": "50",
                "$skip": str(max(skip, 0)),
                "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,bodyPreview,importance",
                "$orderby": "sentDateTime desc"
            }
        else:
            url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
            top_limit = 100 if filter_type == "unread" else min(top, 50)
            params = {
                "$top": str(top_limit),
                "$skip": str(max(skip, 0)),
                "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,importance",
                "$orderby": "receivedDateTime desc"
            }
            if filter_type == "unread":
                params["$filter"] = "isRead eq false"

        # Tìm kiếm theo từ khóa nếu có
        if search_query and search_query.strip():
            params.pop("$orderby", None)
            params["$search"] = f'"{search_query.strip()}"'

        try:
            with httpx.Client(timeout=35.0) as client:
                res = client.get(url, headers={"Authorization": f"Bearer {token}"}, params=params)
                if res.status_code != 200:
                    err_msg = res.text
                    logger.error(f"Lỗi truy vấn danh sách email Graph API: {res.status_code} - {err_msg}")
                    raise HTTPException(
                        status_code=res.status_code,
                        detail=f"Lỗi tải danh sách email: {err_msg[:200]}"
                    )
                data = res.json()
                raw_messages = list(data.get("value", []))

                # Đối với thư chưa đọc: Nếu có nhiều hơn 1 trang, load HẾT toàn bộ email chưa đọc
                if filter_type == "unread":
                    next_link = data.get("@odata.nextLink")
                    while next_link and len(raw_messages) < 500:
                        try:
                            next_res = client.get(next_link, headers={"Authorization": f"Bearer {token}"})
                            if next_res.status_code == 200:
                                next_data = next_res.json()
                                items = next_data.get("value", [])
                                if not items:
                                    break
                                raw_messages.extend(items)
                                next_link = next_data.get("@odata.nextLink")
                            else:
                                break
                        except Exception as page_err:
                            logger.warning(f"Lỗi khi tải trang tiếp theo của email chưa đọc: {page_err}")
                            break

                # Lấy số lượng email chưa đọc trong Inbox để hiển thị badge
                unread_count = 0
                try:
                    folder_res = client.get(
                        "https://graph.microsoft.com/v1.0/me/mailFolders/inbox?$select=unreadItemCount,totalItemCount",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    if folder_res.status_code == 200:
                        f_info = folder_res.json()
                        unread_count = f_info.get("unreadItemCount", 0)
                except Exception:
                    pass

                formatted = []
                for m in raw_messages:
                    if filter_type == "sent":
                        to_list = [
                            r.get("emailAddress", {}).get("name") or r.get("emailAddress", {}).get("address")
                            for r in m.get("toRecipients", [])
                        ]
                        to_str = ", ".join([t for t in to_list if t]) or "Không có người nhận"
                        sender_name = f"Tới: {to_str}"
                        sender_email = m.get("from", {}).get("emailAddress", {}).get("address") or ""
                        time_raw = m.get("sentDateTime") or m.get("receivedDateTime")
                    else:
                        sender = m.get("from", {}).get("emailAddress", {})
                        sender_name = sender.get("name") or sender.get("address") or "Không rõ người gửi"
                        sender_email = sender.get("address") or ""
                        time_raw = m.get("receivedDateTime")

                    formatted.append({
                        "id": m.get("id"),
                        "subject": m.get("subject") or "(Không có chủ đề)",
                        "sender_name": sender_name,
                        "sender_email": sender_email,
                        "received_time_vn": format_iso_to_vn(time_raw),
                        "received_time_raw": time_raw,
                        "is_read": bool(m.get("isRead")),
                        "has_attachments": bool(m.get("hasAttachments")),
                        "preview": m.get("bodyPreview") or "",
                        "importance": m.get("importance") or "normal"
                    })

                return {
                    "messages": formatted,
                    "total_returned": len(formatted),
                    "unread_count": unread_count,
                    "filter_type": filter_type,
                    "search_query": search_query
                }
        except httpx.RequestError as exc:
            logger.error(f"Lỗi mạng khi tải email: {exc}")
            raise HTTPException(status_code=504, detail=f"Lỗi kết nối khi tải danh sách email: {exc}")

    @classmethod
    def get_message_detail(cls, db: Session, message_id: str) -> Dict[str, Any]:
        """
        Lấy chi tiết toàn bộ nội dung của một email (bao gồm nội dung HTML, danh sách file đính kèm).
        Tự động đánh dấu email này là ĐÃ ĐỌC (isRead: true) để tránh load lại lần 2 theo đúng yêu cầu người dùng!
        """
        token = cls.get_graph_token(db)
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}"

        try:
            with httpx.Client(timeout=35.0) as client:
                res = client.get(
                    url,
                    headers={"Authorization": f"Bearer {token}"},
                    params={
                        "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,body,importance"
                    }
                )
                if res.status_code != 200:
                    raise HTTPException(status_code=res.status_code, detail=f"Không thể tải chi tiết email: {res.text[:200]}")
                data = res.json()

                # Tự động đánh dấu là đã đọc trên máy chủ nếu email đang ở trạng thái chưa đọc
                if not data.get("isRead"):
                    try:
                        client.patch(
                            url,
                            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                            json={"isRead": True}
                        )
                        logger.info(f"Đã tự động đánh dấu email {message_id} là ĐÃ ĐỌC trên máy chủ mail.")
                    except Exception as pe:
                        logger.warning(f"Không thể cập nhật isRead cho email {message_id}: {pe}")

                # Lấy danh sách file đính kèm nếu email có file
                attachments = []
                if data.get("hasAttachments"):
                    att_res = client.get(
                        f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments?$select=id,name,contentType,size,isInline",
                        headers={"Authorization": f"Bearer {token}"}
                    )
                    if att_res.status_code == 200:
                        for a in att_res.json().get("value", []):
                            attachments.append({
                                "id": a.get("id"),
                                "name": a.get("name") or "attachment",
                                "contentType": a.get("contentType") or "application/octet-stream",
                                "size": a.get("size") or 0,
                                "isInline": bool(a.get("isInline"))
                            })

                sender = data.get("from", {}).get("emailAddress", {})
                to_list = [
                    {"name": r.get("emailAddress", {}).get("name"), "email": r.get("emailAddress", {}).get("address")}
                    for r in data.get("toRecipients", [])
                ]
                cc_list = [
                    {"name": r.get("emailAddress", {}).get("name"), "email": r.get("emailAddress", {}).get("address")}
                    for r in data.get("ccRecipients", [])
                ]

                body_info = data.get("body", {})
                time_raw = data.get("sentDateTime") or data.get("receivedDateTime")

                return {
                    "id": data.get("id"),
                    "subject": data.get("subject") or "(Không có chủ đề)",
                    "sender_name": sender.get("name") or sender.get("address") or "",
                    "sender_email": sender.get("address") or "",
                    "to_recipients": to_list,
                    "cc_recipients": cc_list,
                    "received_time_vn": format_iso_to_vn(time_raw),
                    "received_time_raw": time_raw,
                    "is_read": True,  # Sau khi load đã là True
                    "has_attachments": bool(data.get("hasAttachments")),
                    "attachments": attachments,
                    "body_type": body_info.get("contentType", "html"),
                    "body_content": body_info.get("content", ""),
                    "importance": data.get("importance", "normal")
                }
        except httpx.RequestError as exc:
            logger.error(f"Lỗi mạng khi tải chi tiết email: {exc}")
            raise HTTPException(status_code=504, detail=f"Lỗi kết nối máy chủ: {exc}")

    @classmethod
    def mark_as_read(cls, db: Session, message_id: str, is_read: bool = True) -> Dict[str, Any]:
        """Đánh dấu một email là ĐÃ ĐỌC hoặc CHƯA ĐỌC."""
        token = cls.get_graph_token(db)
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}"

        try:
            with httpx.Client(timeout=20.0) as client:
                res = client.patch(
                    url,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"isRead": is_read}
                )
                if res.status_code not in (200, 204):
                    raise HTTPException(status_code=res.status_code, detail=f"Lỗi cập nhật trạng thái: {res.text[:200]}")
                return {"status": "SUCCESS", "message_id": message_id, "is_read": is_read}
        except httpx.RequestError as exc:
            raise HTTPException(status_code=504, detail=f"Lỗi mạng: {exc}")

    @classmethod
    def mark_all_as_read(cls, db: Session) -> Dict[str, Any]:
        """
        Đánh dấu TẤT CẢ email chưa đọc trong Hộp thư đến là ĐÃ ĐỌC (tương tự nút trong Outlook).
        """
        token = cls.get_graph_token(db)
        fetch_url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
        params = {
            "$top": "100",
            "$filter": "isRead eq false",
            "$select": "id"
        }

        marked_count = 0
        try:
            with httpx.Client(timeout=45.0) as client:
                res = client.get(fetch_url, headers={"Authorization": f"Bearer {token}"}, params=params)
                if res.status_code == 200:
                    items = res.json().get("value", [])
                    for it in items:
                        mid = it.get("id")
                        try:
                            client.patch(
                                f"https://graph.microsoft.com/v1.0/me/messages/{mid}",
                                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                                json={"isRead": True}
                            )
                            marked_count += 1
                        except Exception:
                            pass
            logger.info(f"Đã đánh dấu {marked_count} email chưa đọc thành ĐÃ ĐỌC.")
            return {"status": "SUCCESS", "marked_count": marked_count}
        except Exception as e:
            logger.error(f"Lỗi đánh dấu tất cả email là đã đọc: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi đánh dấu tất cả email: {e}")

    @classmethod
    def get_attachment_content(cls, db: Session, message_id: str, attachment_id: str) -> Dict[str, Any]:
        """Tải dữ liệu nhị phân hoặc chuỗi base64 của file đính kèm."""
        token = cls.get_graph_token(db)
        url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments/{attachment_id}"

        try:
            with httpx.Client(timeout=45.0) as client:
                res = client.get(url, headers={"Authorization": f"Bearer {token}"})
                if res.status_code != 200:
                    raise HTTPException(status_code=res.status_code, detail="Không tìm thấy tệp đính kèm.")
                data = res.json()
                return {
                    "id": data.get("id"),
                    "name": data.get("name") or "attachment",
                    "contentType": data.get("contentType") or "application/octet-stream",
                    "size": data.get("size") or 0,
                    "contentBytes": data.get("contentBytes", "")  # Base64 string
                }
        except httpx.RequestError as exc:
            raise HTTPException(status_code=504, detail=f"Lỗi mạng: {exc}")

    # ==========================================
    # QUẢN LÝ CHỮ KÝ THEO USER ĐĂNG NHẬP
    # ==========================================

    @classmethod
    def get_user_signature(cls, db: Session, username: str, user_display_name: str = "") -> Dict[str, Any]:
        """Lấy chữ ký email của user hiện tại. Nếu chưa từng cấu hình, khởi tạo mẫu Golden Gate mặc định."""
        sig = db.execute(
            select(UserEmailSignature).where(UserEmailSignature.username == username)
        ).scalar_one_or_none()

        if not sig:
            # Tạo bản ghi chữ ký mặc định với thông tin chuẩn Golden Gate
            clean_name = user_display_name or username
            default_html = get_default_golden_gate_signature_html(
                full_name=clean_name,
                job_title="IT Application Specialist",
                department="GOLDEN GATE GROUP – SOUTH BRANCH",
                address="7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh",
                office_phone="028 7300 9000 (ext: 8740)",
                mobile="039 749 5772",
                email=f"{username}@ggg.com.vn",
                website="www.ggg.com.vn"
            )
            sig = UserEmailSignature(
                username=username,
                full_name=clean_name,
                job_title="IT Application Specialist",
                department="GOLDEN GATE GROUP – SOUTH BRANCH",
                office_address="7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh",
                office_phone="028 7300 9000 (ext: 8740)",
                mobile="039 749 5772",
                email=f"{username}@ggg.com.vn",
                website="www.ggg.com.vn",
                signature_html=default_html,
                use_custom_html=False,
                updated_at=datetime.now()
            )
            db.add(sig)
            db.commit()
            db.refresh(sig)

        return {
            "id": sig.id,
            "username": sig.username,
            "full_name": sig.full_name or "",
            "job_title": sig.job_title or "",
            "department": sig.department or "",
            "office_address": sig.office_address or "",
            "office_phone": sig.office_phone or "",
            "mobile": sig.mobile or "",
            "email": sig.email or "",
            "website": sig.website or "",
            "signature_html": sig.signature_html or "",
            "use_custom_html": bool(sig.use_custom_html),
            "updated_at": sig.updated_at.strftime("%d/%m/%Y %H:%M:%S") if sig.updated_at else ""
        }

    @classmethod
    def update_user_signature(cls, db: Session, username: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Cập nhật chữ ký email của user hiện tại."""
        sig = db.execute(
            select(UserEmailSignature).where(UserEmailSignature.username == username)
        ).scalar_one_or_none()

        if not sig:
            sig = UserEmailSignature(username=username)
            db.add(sig)

        if "full_name" in data:
            sig.full_name = str(data["full_name"]).strip()
        if "job_title" in data:
            sig.job_title = str(data["job_title"]).strip()
        if "department" in data:
            sig.department = str(data["department"]).strip()
        if "office_address" in data:
            sig.office_address = str(data["office_address"]).strip()
        if "office_phone" in data:
            sig.office_phone = str(data["office_phone"]).strip()
        if "mobile" in data:
            sig.mobile = str(data["mobile"]).strip()
        if "email" in data:
            sig.email = str(data["email"]).strip()
        if "website" in data:
            sig.website = str(data["website"]).strip()
        if "use_custom_html" in data:
            sig.use_custom_html = bool(data["use_custom_html"])

        # Nếu người dùng gửi mã HTML chữ ký (từ việc copy/paste hoặc sửa trực tiếp trong trình soạn thảo)
        if "signature_html" in data and data["signature_html"] is not None:
            sig.signature_html = data["signature_html"]
            sig.use_custom_html = True
        elif not sig.signature_html:
            # Tự sinh lại HTML chuẩn theo các trường thông tin cập nhật nếu chưa có
            sig.signature_html = get_default_golden_gate_signature_html(
                full_name=sig.full_name or username,
                job_title=sig.job_title or "IT Application Specialist",
                department=sig.department or "GOLDEN GATE GROUP – SOUTH BRANCH",
                address=sig.office_address or "7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh",
                office_phone=sig.office_phone or "028 7300 9000 (ext: 8740)",
                mobile=sig.mobile or "039 749 5772",
                email=sig.email or f"{username}@ggg.com.vn",
                website=sig.website or "www.ggg.com.vn"
            )

        sig.updated_at = datetime.now()
        db.commit()
        db.refresh(sig)
        return cls.get_user_signature(db, username)

    # ==========================================
    # SOẠN & GỬI EMAIL TỪ GIAO DIỆN WEB
    # ==========================================

    @classmethod
    def send_email(
        cls,
        db: Session,
        current_user: User,
        to_recipients: List[str],
        cc_recipients: List[str],
        subject: str,
        body_html: str,
        files: Optional[List[Tuple[str, bytes, str]]] = None  # (filename, file_bytes, content_type)
    ) -> Dict[str, Any]:
        """
        Gửi email trực tiếp từ web qua SMTP Office 365 với TLS 1.2:
        - Tự động kiểm tra dung lượng file (tối đa 4MB).
        - Gửi tới các danh sách To và Cc.
        - Ghi nhật ký vào WEBMAIL_SENT_LOG.
        """
        cfg = cls.get_or_create_config(db)

        # Chuẩn hóa danh sách người nhận
        clean_to = [t.strip() for t in to_recipients if t and "@" in t.strip()]
        clean_cc = [c.strip() for c in cc_recipients if c and "@" in c.strip()]

        if not clean_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng nhập ít nhất một địa chỉ email người nhận hợp lệ (To)."
            )

        # Kiểm tra dung lượng từng file và tổng dung lượng
        total_attachment_bytes = 0
        attachments_info = []

        if files:
            for fname, fbytes, ctype in files:
                fsize = len(fbytes)
                total_attachment_bytes += fsize
                attachments_info.append({"name": fname, "size": fsize, "type": ctype})
                if fsize > MAX_ATTACHMENT_SIZE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Tệp '{fname}' có dung lượng ({fsize / (1024*1024):.2f}MB) vượt quá giới hạn tối đa cho phép là 4MB."
                    )

            if total_attachment_bytes > MAX_ATTACHMENT_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tổng dung lượng các tệp đính kèm ({total_attachment_bytes / (1024*1024):.2f}MB) vượt quá giới hạn 4MB."
                )

        # Lấy chữ ký của user hiện tại để gắn vào cuối email nếu chưa có
        sender_name = getattr(current_user, "full_name", None) or getattr(current_user, "hoten", None) or current_user.username
        user_sig = cls.get_user_signature(db, current_user.username, sender_name)
        sig_html = user_sig.get("signature_html", "")

        full_html = body_html
        if sig_html and sig_html.strip() not in full_html:
            full_html = f"""{full_html}
<br /><br />
<div class="email-signature-container">
  {sig_html}
</div>"""

        # Bọc toàn bộ nội dung email vào cấu trúc HTML hoàn chỉnh có meta charset=utf-8
        if "<html" not in full_html.lower():
            full_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta charset="utf-8" />
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 13.5px; color: #111827; line-height: 1.5;">
  {full_html}
</body>
</html>"""

        # Xử lý toàn bộ hình ảnh sang dạng Inline Embedded Attachment (CID) tránh bị Outlook chặn tải
        full_html, inline_images = embed_inline_images(full_html)

        # Xây dựng MIME Message với tiêu chuẩn UTF-8 đầy đủ cho From và Subject
        msg = MIMEMultipart("mixed")
        msg["From"] = formataddr((str(Header(sender_name, "utf-8")), cfg.email_address))
        msg["To"] = ", ".join(clean_to)
        if clean_cc:
            msg["Cc"] = ", ".join(clean_cc)
        msg["Subject"] = Header(subject.strip() if subject else "(Không có chủ đề)", "utf-8")

        # Tạo container multipart/related để chứa nội dung HTML và các hình ảnh inline (CID)
        msg_related = MIMEMultipart("related")

        # Phần thân HTML với bộ mã UTF-8
        body_part = MIMEText(full_html, "html", "utf-8")
        msg_related.attach(body_part)

        # Đính kèm tất cả các ảnh inline vào container related
        for cid, img_data, img_subtype, img_filename in inline_images:
            try:
                img_part = MIMEImage(img_data, _subtype=img_subtype)
                img_part.add_header("Content-ID", f"<{cid}>")
                img_part.add_header("Content-Disposition", "inline", filename=img_filename)
                msg_related.attach(img_part)
                logger.info(f"Đã đính kèm ảnh inline CID <{cid}> ({img_filename}) vào email.")
            except Exception as ie:
                logger.warning(f"Lỗi khi đính kèm inline image {cid}: {ie}")

        # Gắn container related vào thư gốc
        msg.attach(msg_related)

        # Đính kèm file nếu có
        if files:
            for fname, fbytes, ctype in files:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(fbytes)
                encoders.encode_base64(part)
                # Xử lý tên file có dấu theo chuẩn RFC 2231
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=("utf-8", "", fname)
                )
                msg.attach(part)

        all_recipients = clean_to + clean_cc
        sent_status = "SUCCESS"
        error_msg = None

        logger.info(f"Đang gửi email từ {current_user.username} ({cfg.email_address}) tới: {', '.join(all_recipients)}")

        try:
            context = ssl.create_default_context()
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.maximum_version = ssl.TLSVersion.TLSv1_2

            with smtplib.SMTP(cfg.smtp_host, cfg.smtp_port, timeout=35) as server:
                server.ehlo()
                if cfg.smtp_use_tls:
                    server.starttls(context=context)
                    server.ehlo()
                server.login(cfg.email_address, cfg.email_password)
                server.sendmail(cfg.email_address, all_recipients, msg.as_string())

            logger.info(f"Gửi email thành công tới: {', '.join(all_recipients)}")
        except Exception as e:
            sent_status = "FAILED"
            error_msg = str(e)
            logger.error(f"Lỗi khi gửi email: {error_msg}")

        # Ghi nhật ký vào database
        try:
            sent_log = WebmailSentLog(
                sender_username=current_user.username,
                from_email=cfg.email_address,
                to_emails="; ".join(clean_to),
                cc_emails="; ".join(clean_cc),
                subject=subject,
                body_preview=body_html[:300].replace("<", " ").replace(">", " ") if body_html else "",
                attachments_info=json.dumps(attachments_info, ensure_ascii=False),
                status=sent_status,
                error_message=error_msg,
                sent_at=datetime.now()
            )
            db.add(sent_log)
            db.commit()
        except Exception as dbe:
            logger.warning(f"Không thể ghi nhật ký WEBMAIL_SENT_LOG: {dbe}")

        if sent_status == "FAILED":
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi gửi email: {error_msg}"
            )

        return {
            "status": "SUCCESS",
            "message": f"Email đã được gửi thành công tới: {', '.join(all_recipients)}",
            "to": clean_to,
            "cc": clean_cc,
            "attachments_count": len(attachments_info)
        }

    @classmethod
    def get_sent_logs(cls, db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """Lấy danh sách nhật ký gửi email gần đây."""
        logs = db.execute(
            select(WebmailSentLog).order_by(desc(WebmailSentLog.sent_at)).limit(limit)
        ).scalars().all()

        results = []
        for l in logs:
            atts = []
            if l.attachments_info:
                try:
                    atts = json.loads(l.attachments_info)
                except Exception:
                    pass
            results.append({
                "id": l.id,
                "sender_username": l.sender_username,
                "from_email": l.from_email,
                "to_emails": l.to_emails,
                "cc_emails": l.cc_emails or "",
                "subject": l.subject or "(Không có chủ đề)",
                "body_preview": l.body_preview or "",
                "attachments": atts,
                "status": l.status,
                "error_message": l.error_message or "",
                "sent_at_vn": l.sent_at.strftime("%d/%m/%Y %H:%M:%S") if l.sent_at else ""
            })
        return results
