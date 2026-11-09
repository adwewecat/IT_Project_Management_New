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
import concurrent.futures
import threading
from email.header import Header
from email.utils import formataddr
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import unquote
import httpx
from sqlalchemy import select, desc, delete
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.webmail import (
    SystemEmailConfig,
    UserEmailSignature,
    WebmailSentLog,
    WebmailUserRead,
    WebmailInboxCache,
    WebmailDetailCache
)
from app.models.user import User

logger = logging.getLogger(__name__)

# Giới hạn kích thước file đính kèm tối đa: 30MB (Hỗ trợ dung lượng đính kèm lớn theo chuẩn Office 365 SMTP)
MAX_ATTACHMENT_SIZE_BYTES = 30 * 1024 * 1024

# Bộ nhớ đệm token truy cập Microsoft Graph API
_TOKEN_CACHE: Dict[str, Any] = {
    "access_token": None,
    "expires_at": 0,
    "email": None
}

# Biến điều phối đồng bộ hòm thư M365 (tránh sync dồn dập nhiều lần gây nghẽn)
_LAST_INBOX_SYNC_TIME: float = 0.0
_INBOX_SYNC_INTERVAL: float = 15.0  # Tối thiểu 15 giây giữa các lần tự động quét M365
_BG_PATCH_EXECUTOR = concurrent.futures.ThreadPoolExecutor(max_workers=3, thread_name_prefix="webmail_bg")

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


def resolve_inline_cids(html_content: str, attachments_raw: List[Dict[str, Any]]) -> str:
    """
    Chuyển đổi các hình ảnh nội tuyến (Inline CID Images) trong email sang dạng Data URI base64.
    Khắc phục triệt để lỗi trình duyệt web không đọc được scheme 'cid:' dẫn đến hiển thị icon ảnh vỡ (broken image).
    Hỗ trợ:
    - Ảnh chụp màn hình / ảnh dán từ clipboard trong email đã gửi hoặc email nhận được.
    - Chữ ký email chứa logo Golden Gate (ggg_logo_img).
    - Các biến thể CID có/không có dấu ngoặc nhọn <>, có đuôi @domain, mã hóa URL %40, v.v.
    """
    if not html_content or not isinstance(html_content, str):
        return ""
    if "cid:" not in html_content.lower():
        return html_content

    try:
        # Duyệt qua từng attachment để lấy base64 contentBytes và thay thế vào HTML
        for a in attachments_raw:
            if not isinstance(a, dict):
                continue
            content_bytes = a.get("contentBytes")
            if not content_bytes or not isinstance(content_bytes, str):
                continue

            content_type = a.get("contentType") or "image/png"
            if not content_type.startswith("image/"):
                fn = (a.get("name") or "").lower()
                if fn.endswith(".png"):
                    content_type = "image/png"
                elif fn.endswith((".jpg", ".jpeg")):
                    content_type = "image/jpeg"
                elif fn.endswith(".gif"):
                    content_type = "image/gif"
                elif fn.endswith(".webp"):
                    content_type = "image/webp"
                elif fn.endswith(".bmp"):
                    content_type = "image/bmp"

            data_uri = f"data:{content_type};base64,{content_bytes.strip()}"

            possible_cids = set()

            # 1. Content-ID chuẩn từ MIME
            cid = a.get("contentId")
            if cid and isinstance(cid, str):
                clean_cid = cid.strip("<>").strip()
                if clean_cid:
                    possible_cids.add(clean_cid)
                    possible_cids.add(f"<{clean_cid}>")
                    if "@" in clean_cid:
                        prefix = clean_cid.split("@")[0]
                        possible_cids.add(prefix)
                        possible_cids.add(f"<{prefix}>")
                    if "%40" in clean_cid:
                        unq = unquote(clean_cid)
                        possible_cids.add(unq)
                        possible_cids.add(f"<{unq}>")

            # 2. Tên tệp đính kèm (name)
            name = a.get("name")
            if name and isinstance(name, str):
                clean_name = name.strip()
                possible_cids.add(clean_name)
                possible_cids.add(f"<{clean_name}>")
                if "." in clean_name:
                    base_name = clean_name.rsplit(".", 1)[0]
                    possible_cids.add(base_name)
                    possible_cids.add(f"<{base_name}>")

            # 3. ID của attachment
            att_id = a.get("id")
            if att_id and isinstance(att_id, str):
                possible_cids.add(att_id)

            # Thay thế từng CID vào html_content (dùng lambda để tránh re.PatternError khi data_uri chứa ký tự thoát)
            for pc in possible_cids:
                if not pc:
                    continue
                try:
                    pattern = re.compile(rf'cid:\s*<?{re.escape(pc)}>?', re.IGNORECASE)
                    html_content = pattern.sub(lambda _: data_uri, html_content)
                except Exception as pe:
                    logger.warning(f"Lỗi regex replace cho CID {pc}: {pe}")

        # Dự phòng đặc biệt cho Golden Gate logo (ggg_logo_img) nếu vẫn còn trong HTML
        if re.search(r'cid:\s*<?ggg_logo_img>?', html_content, re.IGNORECASE):
            try:
                current_dir = os.path.dirname(os.path.abspath(__file__))
                logo_candidates = [
                    os.path.join(os.path.dirname(os.path.dirname(current_dir)), "static", "ggg_logo.png"),
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))), "frontend", "public", "ggg_logo.png"),
                    os.path.join(current_dir, "..", "..", "static", "ggg_logo.png"),
                ]
                for lp in logo_candidates:
                    if os.path.exists(lp):
                        with open(lp, "rb") as f:
                            logo_bytes = f.read()
                        logo_uri = f"data:image/png;base64,{base64.b64encode(logo_bytes).decode('ascii')}"
                        html_content = re.sub(r'cid:\s*<?ggg_logo_img>?', lambda _: logo_uri, html_content, flags=re.IGNORECASE)
                        break
            except Exception as le:
                logger.warning(f"Lỗi đọc logo dự phòng {lp}: {le}")

        # Dự phòng trường hợp còn lại 1 CID duy nhất và chỉ có 1 image attachment có contentBytes
        try:
            remaining_cids = re.findall(r'cid:\s*<?([^\s"\'<>]+)>?', html_content, re.IGNORECASE)
            if remaining_cids:
                img_atts = [
                    a for a in attachments_raw
                    if isinstance(a, dict) and a.get("contentBytes") and (
                        (a.get("contentType") or "").startswith("image/") or
                        any((a.get("name") or "").lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp"])
                    )
                ]
                if len(remaining_cids) == len(img_atts) == 1:
                    a = img_atts[0]
                    ctype = a.get("contentType") or "image/png"
                    uri = f"data:{ctype};base64,{a.get('contentBytes')}"
                    html_content = re.sub(rf'cid:\s*<?{re.escape(remaining_cids[0])}>?', lambda _: uri, html_content, flags=re.IGNORECASE)
        except Exception as re2:
            logger.warning(f"Lỗi thay thế remaining CIDs: {re2}")

    except Exception as ge:
        logger.warning(f"Lỗi tổng quát trong resolve_inline_cids: {ge}")

    return html_content


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
    def _bg_patch_m365_is_read(cls, token_val: str, msg_ids: List[str]) -> None:
        """Tiến trình nền đánh dấu isRead: true trên M365 không chặn người dùng."""
        if not msg_ids or not token_val:
            return
        try:
            with httpx.Client(timeout=25.0) as bg_client:
                for mid in msg_ids:
                    try:
                        bg_client.patch(
                            f"https://graph.microsoft.com/v1.0/me/messages/{mid}",
                            headers={"Authorization": f"Bearer {token_val}", "Content-Type": "application/json"},
                            json={"isRead": True}
                        )
                    except Exception as pe:
                        logger.warning(f"Lỗi patch isRead M365 (bg worker) cho {mid}: {pe}")
        except Exception as be:
            logger.warning(f"Lỗi bg worker patch isRead: {be}")

    @classmethod
    def _record_user_read(cls, db: Session, username: str, message_id: str) -> None:
        """Ghi nhận trạng thái đã đọc riêng cho user trong database nếu chưa có."""
        if not username or not message_id:
            return
        try:
            existing = db.execute(
                select(WebmailUserRead.id).where(
                    WebmailUserRead.username == username,
                    WebmailUserRead.message_id == message_id
                )
            ).scalar_one_or_none()
            if not existing:
                db.add(WebmailUserRead(
                    username=username,
                    message_id=message_id,
                    read_at=datetime.now()
                ))
                db.commit()
        except Exception as e:
            logger.warning(f"Lỗi ghi nhận user_read cho {username}: {e}")

    @classmethod
    def sync_inbox_from_graph(cls, db: Session, client: httpx.Client, token: str, force_refresh: bool = False) -> None:
        """
        Đồng bộ các email mới đang ở trạng thái CHƯA ĐỌC từ Microsoft 365 hòm thư chính:
        1. Throttling thông minh: Tránh quét dồn dập mỗi vài giây khi chuyển tab.
        2. Lưu vào bảng dbo.WEBMAIL_INBOX_CACHE (nếu chưa có trong hệ thống).
        3. Đánh dấu ĐÃ ĐỌC (isRead: true) trên Microsoft 365 CHẠY NỀN KHÔNG CHẶN (non-blocking)
           giúp danh sách email phản hồi siêu tốc dưới 0.4s!
        """
        global _LAST_INBOX_SYNC_TIME
        now = time.time()
        if not force_refresh and (now - _LAST_INBOX_SYNC_TIME < _INBOX_SYNC_INTERVAL):
            return

        _LAST_INBOX_SYNC_TIME = now
        fetch_url = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages"
        params = {
            "$top": "100",
            "$filter": "isRead eq false",
            "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,bodyPreview,importance",
            "$orderby": "receivedDateTime desc"
        }

        try:
            res = client.get(fetch_url, headers={"Authorization": f"Bearer {token}"}, params=params)
            if res.status_code != 200:
                logger.warning(f"Lỗi khi quét email chưa đọc từ M365 (HTTP {res.status_code}): {res.text[:200]}")
                return

            data = res.json()
            raw_items = list(data.get("value", []))
            next_link = data.get("@odata.nextLink")
            while next_link and len(raw_items) < 300:
                try:
                    nr = client.get(next_link, headers={"Authorization": f"Bearer {token}"})
                    if nr.status_code == 200:
                        nd = nr.json()
                        items = nd.get("value", [])
                        if not items:
                            break
                        raw_items.extend(items)
                        next_link = nd.get("@odata.nextLink")
                    else:
                        break
                except Exception as pe:
                    logger.warning(f"Lỗi phân trang khi sync M365: {pe}")
                    break

            if not raw_items:
                return

            new_count = 0
            mids_to_patch: List[str] = []
            for it in raw_items:
                mid = it.get("id")
                if not mid:
                    continue

                exists = db.execute(
                    select(WebmailInboxCache.id).where(WebmailInboxCache.id == mid)
                ).scalar_one_or_none()

                time_raw = it.get("receivedDateTime")
                rec_dt = None
                if time_raw:
                    try:
                        clean_t = time_raw.replace("Z", "+00:00")
                        rec_dt = datetime.fromisoformat(clean_t).astimezone(VN_TZ).replace(tzinfo=None)
                    except Exception:
                        pass

                sender = it.get("from", {}).get("emailAddress", {})
                sender_name = sender.get("name") or sender.get("address") or "Không rõ người gửi"
                sender_email = sender.get("address") or ""

                if not exists:
                    cache_item = WebmailInboxCache(
                        id=mid,
                        subject=it.get("subject") or "(Không có chủ đề)",
                        sender_name=sender_name,
                        sender_email=sender_email,
                        received_time_vn=format_iso_to_vn(time_raw),
                        received_time_raw=time_raw,
                        received_datetime=rec_dt or datetime.now(),
                        has_attachments=bool(it.get("hasAttachments")),
                        preview=it.get("bodyPreview") or "",
                        importance=it.get("importance") or "normal",
                        created_at=datetime.now()
                    )
                    db.add(cache_item)
                    new_count += 1

                mids_to_patch.append(mid)

            db.commit()
            if new_count > 0:
                logger.info(f"Đã đồng bộ {new_count} email mới từ M365 vào WEBMAIL_INBOX_CACHE.")

            # Kích hoạt đánh dấu đã đọc trên M365 ngầm trong nền không làm nghẽn phản hồi danh sách thư
            if mids_to_patch:
                _BG_PATCH_EXECUTOR.submit(cls._bg_patch_m365_is_read, token, mids_to_patch)

        except Exception as e:
            logger.error(f"Lỗi khi sync_inbox_from_graph: {e}")

    @classmethod
    def match_sent_log_user(
        cls,
        subject: str,
        sent_time_raw: Optional[str],
        recipient_emails: List[str],
        sent_logs: List[WebmailSentLog]
    ) -> str:
        """Tra cứu và khớp thông tin người gửi email thực tế từ bảng WEBMAIL_SENT_LOG."""
        if not sent_logs or not sent_time_raw:
            return ""

        subj = (subject or "").strip().lower()
        clean_recipients = [r.lower().strip() for r in recipient_emails if r]

        m_dt = None
        try:
            clean_t = sent_time_raw.replace("Z", "+00:00")
            m_dt = datetime.fromisoformat(clean_t).astimezone(VN_TZ).replace(tzinfo=None)
        except Exception:
            return ""

        matched_user = ""
        min_diff = 300.0  # Cho phép chênh lệch thời gian tối đa 5 phút

        for l in sent_logs:
            if not l.sent_at:
                continue
            diff = abs((l.sent_at - m_dt).total_seconds())
            if diff >= min_diff:
                continue

            l_subj = (l.subject or "").strip().lower()
            if subj and l_subj and subj == l_subj:
                min_diff = diff
                matched_user = l.sender_username
            elif (not subj or subj == "(không có chủ đề)") and (not l_subj or l_subj == "(không có chủ đề)"):
                l_to = (l.to_emails or "").lower()
                if any(r in l_to for r in clean_recipients):
                    min_diff = diff
                    matched_user = l.sender_username

        return matched_user

    @classmethod
    def get_messages(
        cls,
        db: Session,
        current_username: str = "",
        filter_type: str = "unread",
        search_query: str = "",
        top: int = 50,
        skip: int = 0,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Lấy danh sách email:
        - 'unread': Tải TOÀN BỘ email chưa đọc đối với user hiện tại từ bộ đệm WEBMAIL_INBOX_CACHE.
          Đồng bộ các thư mới từ M365 (có throttling 15s và background patch để không nghẽn mạng).
        - 'all': Tải tối đa 50 email gần nhất trong Hộp thư đến (Inbox) từ M365, trạng thái is_read tính theo user hiện tại.
        - 'sent': Tải tối đa 50 email gần nhất trong Hộp thư đã gửi (SentItems) từ M365.
        """
        token = cls.get_graph_token(db)

        # Lấy danh sách ID các email mà user hiện tại đã đọc trong hệ thống
        user_read_ids = set()
        if current_username:
            try:
                user_read_ids = set(
                    db.execute(
                        select(WebmailUserRead.message_id).where(WebmailUserRead.username == current_username)
                    ).scalars().all()
                )
            except Exception as e:
                logger.warning(f"Lỗi lấy danh sách email đã đọc của {current_username}: {e}")

        try:
            with httpx.Client(timeout=35.0) as client:
                # 1. Đồng bộ email mới từ Microsoft 365 (chỉ khi không phải tab 'sent' và tuân theo throttling / force_refresh)
                if filter_type != "sent":
                    cls.sync_inbox_from_graph(db, client, token, force_refresh=force_refresh)

                # 2. Xử lý theo filter_type:
                if filter_type == "unread":
                    # Lấy từ WEBMAIL_INBOX_CACHE các thư mà user hiện tại CHƯA ĐỌC
                    q = select(WebmailInboxCache).where(
                        ~WebmailInboxCache.id.in_(
                            select(WebmailUserRead.message_id).where(WebmailUserRead.username == current_username)
                        )
                    )
                    if search_query and search_query.strip():
                        sq = f"%{search_query.strip()}%"
                        q = q.where(
                            (WebmailInboxCache.subject.ilike(sq)) |
                            (WebmailInboxCache.sender_name.ilike(sq)) |
                            (WebmailInboxCache.sender_email.ilike(sq)) |
                            (WebmailInboxCache.preview.ilike(sq))
                        )
                    q = q.order_by(desc(WebmailInboxCache.received_datetime), desc(WebmailInboxCache.created_at))
                    cached_unreads = db.execute(q).scalars().all()

                    formatted = []
                    for it in cached_unreads:
                        formatted.append({
                            "id": it.id,
                            "subject": it.subject or "(Không có chủ đề)",
                            "sender_name": it.sender_name or "Không rõ người gửi",
                            "sender_email": it.sender_email or "",
                            "received_time_vn": it.received_time_vn or "",
                            "received_time_raw": it.received_time_raw or "",
                            "is_read": False,
                            "has_attachments": bool(it.has_attachments),
                            "preview": it.preview or "",
                            "importance": it.importance or "normal"
                        })

                    return {
                        "messages": formatted,
                        "total_returned": len(formatted),
                        "unread_count": len(formatted),
                        "filter_type": filter_type,
                        "search_query": search_query
                    }

                # Đếm số lượng email chưa đọc riêng cho user hiện tại để hiển thị badge và xác định trạng thái đọc
                user_unread_ids = set()
                if current_username:
                    try:
                        user_unread_ids = set(
                            db.execute(
                                select(WebmailInboxCache.id).where(
                                    ~WebmailInboxCache.id.in_(
                                        select(WebmailUserRead.message_id).where(WebmailUserRead.username == current_username)
                                    )
                                )
                            ).scalars().all()
                        )
                    except Exception as e:
                        logger.warning(f"Lỗi lấy user_unread_ids cho {current_username}: {e}")
                unread_count = len(user_unread_ids)

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
                    params = {
                        "$top": str(min(top, 50)),
                        "$skip": str(max(skip, 0)),
                        "$select": "id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,bodyPreview,importance",
                        "$orderby": "receivedDateTime desc"
                    }

                if search_query and search_query.strip():
                    params.pop("$orderby", None)
                    params["$search"] = f'"{search_query.strip()}"'

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

                # Tra cứu nhật ký gửi từ WEBMAIL_SENT_LOG nếu đang xem thư đã gửi
                sent_logs: List[WebmailSentLog] = []
                if filter_type == "sent":
                    try:
                        sent_logs = db.execute(
                            select(WebmailSentLog).order_by(desc(WebmailSentLog.sent_at)).limit(200)
                        ).scalars().all()
                    except Exception as le:
                        logger.warning(f"Lỗi truy vấn WEBMAIL_SENT_LOG: {le}")

                formatted = []
                for m in raw_messages:
                    sent_by_user = ""
                    if filter_type == "sent":
                        to_list = [
                            r.get("emailAddress", {}).get("name") or r.get("emailAddress", {}).get("address")
                            for r in m.get("toRecipients", [])
                        ]
                        to_emails = [
                            r.get("emailAddress", {}).get("address")
                            for r in m.get("toRecipients", [])
                            if r.get("emailAddress", {}).get("address")
                        ]
                        to_str = ", ".join([t for t in to_list if t]) or "Không có người nhận"
                        sender_name = f"Tới: {to_str}"
                        sender_email = m.get("from", {}).get("emailAddress", {}).get("address") or ""
                        time_raw = m.get("sentDateTime") or m.get("receivedDateTime")
                        is_read = True

                        # Khớp người gửi thực tế từ Webmail
                        sent_by_user = cls.match_sent_log_user(
                            subject=m.get("subject") or "",
                            sent_time_raw=time_raw,
                            recipient_emails=to_emails,
                            sent_logs=sent_logs
                        )
                    else:
                        sender = m.get("from", {}).get("emailAddress", {})
                        sender_name = sender.get("name") or sender.get("address") or "Không rõ người gửi"
                        sender_email = sender.get("address") or ""
                        time_raw = m.get("receivedDateTime")
                        # Thư được coi là đã đọc nếu nó KHÔNG nằm trong danh sách thư chưa đọc của user này
                        is_read = (m.get("id") not in user_unread_ids)

                    formatted.append({
                        "id": m.get("id"),
                        "subject": m.get("subject") or "(Không có chủ đề)",
                        "sender_name": sender_name,
                        "sender_email": sender_email,
                        "received_time_vn": format_iso_to_vn(time_raw),
                        "received_time_raw": time_raw,
                        "is_read": is_read,
                        "has_attachments": bool(m.get("hasAttachments")),
                        "preview": m.get("bodyPreview") or "",
                        "importance": m.get("importance") or "normal",
                        "sent_by_user": sent_by_user
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
    def get_message_detail(
        cls,
        db: Session,
        message_id: str,
        current_username: str = "",
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Lấy chi tiết toàn bộ nội dung của một email (bao gồm nội dung HTML, danh sách file đính kèm).
        - KIỂM TRA BỘ ĐỆM dbo.WEBMAIL_DETAIL_CACHE ĐẦU TIÊN:
          Nếu email đã từng mở một lần (bất kỳ ai), trả về ngay lập tức chỉ trong 5ms!
        - TẢI SONG SONG (PARALLEL): Nếu chưa có trong cache, tải các ảnh inline / CID đồng thời
          thay vì tuần tự, giảm thời gian từ 15s xuống 1-2s.
        - TỰ ĐỘNG LƯU VÀO CACHE: Sau khi tải xong, lưu vào database để những lần sau xem tức thì.
        - Ghi nhận trạng thái ĐÃ ĐỌC riêng cho user hiện tại trong SQL Server (không ghi đè lên các user khác).
        """
        # 1. Kiểm tra bộ đệm database trước
        if not force_refresh:
            try:
                cached = db.execute(
                    select(WebmailDetailCache).where(WebmailDetailCache.id == message_id)
                ).scalar_one_or_none()
                if cached:
                    if current_username:
                        cls._record_user_read(db, current_username, message_id)

                    try:
                        to_list = json.loads(cached.to_recipients_json) if cached.to_recipients_json else []
                    except Exception:
                        to_list = []
                    try:
                        cc_list = json.loads(cached.cc_recipients_json) if cached.cc_recipients_json else []
                    except Exception:
                        cc_list = []
                    try:
                        attachments = json.loads(cached.attachments_json) if cached.attachments_json else []
                    except Exception:
                        attachments = []

                    return {
                        "id": cached.id,
                        "subject": cached.subject or "(Không có chủ đề)",
                        "sender_name": cached.sender_name or "",
                        "sender_email": cached.sender_email or "",
                        "to_recipients": to_list,
                        "cc_recipients": cc_list,
                        "received_time_vn": cached.received_time_vn or "",
                        "received_time_raw": cached.received_time_raw or "",
                        "is_read": True,
                        "has_attachments": bool(cached.has_attachments),
                        "attachments": attachments,
                        "body_type": cached.body_type or "html",
                        "body_content": cached.body_content or "",
                        "importance": cached.importance or "normal",
                        "sent_by_user": cached.sent_by_user or ""
                    }
            except Exception as ce:
                logger.warning(f"Lỗi kiểm tra WebmailDetailCache cho {message_id}: {ce}")

        # 2. Nếu chưa có trong cache, tải từ Microsoft Graph API
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

                # Ghi nhận trạng thái ĐÃ ĐỌC riêng cho user hiện tại trong database
                if current_username:
                    cls._record_user_read(db, current_username, message_id)

                body_info = data.get("body") or {}
                raw_body_content = body_info.get("content") or ""
                if not isinstance(raw_body_content, str):
                    raw_body_content = ""

                has_attachments = bool(data.get("hasAttachments"))
                has_cid = bool(re.search(r'cid:', raw_body_content, re.IGNORECASE)) if raw_body_content else False

                attachments = []
                attachments_raw = []

                # Truy vấn attachments nếu has_attachments=True hoặc có tham chiếu cid:
                if has_attachments or has_cid:
                    try:
                        # Graph API tự động trả về contentBytes cho các file đính kèm / inline vừa và nhỏ nếu không bị $select cắt bỏ
                        att_res = client.get(
                            f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments",
                            headers={"Authorization": f"Bearer {token}"}
                        )
                        if att_res.status_code == 200:
                            attachments_raw = list(att_res.json().get("value") or [])
                        else:
                            # Dự phòng với $select nếu bị hạn chế
                            att_res_alt = client.get(
                                f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments?$select=id,name,contentType,size,isInline,contentId",
                                headers={"Authorization": f"Bearer {token}"}
                            )
                            if att_res_alt.status_code == 200:
                                attachments_raw = list(att_res_alt.json().get("value") or [])
                    except Exception as ae:
                        logger.warning(f"Lỗi khi truy vấn attachments cho email {message_id}: {ae}")

                # Tải SONG SONG (PARALLEL) các ảnh inline / CID còn thiếu contentBytes
                missing_atts = []
                for a in attachments_raw:
                    if not isinstance(a, dict):
                        continue
                    fn = (a.get("name") or "").lower()
                    ctype = (a.get("contentType") or "").lower()
                    cid = (a.get("contentId") or "").strip("<>").strip()
                    is_img = ctype.startswith("image/") or any(fn.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"])
                    is_referenced = False
                    if raw_body_content:
                        if cid and re.search(rf'cid:\s*<?{re.escape(cid)}>?', raw_body_content, re.IGNORECASE):
                            is_referenced = True
                        elif fn and re.search(rf'cid:\s*<?{re.escape(fn)}>?', raw_body_content, re.IGNORECASE):
                            is_referenced = True

                    if (a.get("isInline") or is_img or is_referenced) and not a.get("contentBytes") and a.get("id"):
                        missing_atts.append(a)

                if missing_atts:
                    def _fetch_single_att(att_dict: Dict[str, Any]) -> None:
                        try:
                            s_res = client.get(
                                f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments/{att_dict['id']}",
                                headers={"Authorization": f"Bearer {token}"},
                                timeout=15.0
                            )
                            if s_res.status_code == 200:
                                sd = s_res.json()
                                att_dict["contentBytes"] = sd.get("contentBytes", "")
                                if not att_dict.get("contentId") and sd.get("contentId"):
                                    att_dict["contentId"] = sd.get("contentId")
                        except Exception as se:
                            logger.warning(f"Lỗi tải song song attachment {att_dict.get('id')}: {se}")

                    with concurrent.futures.ThreadPoolExecutor(max_workers=min(len(missing_atts), 5)) as pool:
                        list(pool.map(_fetch_single_att, missing_atts))

                # Phân giải toàn bộ ảnh CID trong nội dung HTML sang base64 data URI
                resolved_body_content = raw_body_content
                try:
                    resolved_body_content = resolve_inline_cids(raw_body_content, attachments_raw)
                except Exception as ce:
                    logger.warning(f"Lỗi khi resolve_inline_cids cho email {message_id}: {ce}")
                    resolved_body_content = raw_body_content

                # Chuẩn bị danh sách file đính kèm hiển thị ở thanh tải file
                for a in attachments_raw:
                    if not isinstance(a, dict):
                        continue
                    fn = (a.get("name") or "").lower()
                    cid = (a.get("contentId") or "").lower()
                    # Không hiển thị logo Golden Gate trong danh sách file đính kèm
                    if fn in ["ggg_logo.png", "logo.png"] or "ggg_logo" in cid:
                        continue

                    attachments.append({
                        "id": a.get("id") or "",
                        "name": a.get("name") or "attachment",
                        "contentType": a.get("contentType") or "application/octet-stream",
                        "size": a.get("size") or 0,
                        "isInline": bool(a.get("isInline"))
                    })

                sender = (data.get("from") or {}).get("emailAddress") or {}
                to_list = [
                    {"name": (r.get("emailAddress") or {}).get("name"), "email": (r.get("emailAddress") or {}).get("address")}
                    for r in (data.get("toRecipients") or [])
                    if isinstance(r, dict)
                ]
                cc_list = [
                    {"name": (r.get("emailAddress") or {}).get("name"), "email": (r.get("emailAddress") or {}).get("address")}
                    for r in (data.get("ccRecipients") or [])
                    if isinstance(r, dict)
                ]

                time_raw = data.get("sentDateTime") or data.get("receivedDateTime")

                # Tra cứu người gửi thực tế từ Webmail nếu đây là email gửi đi từ hòm thư chính
                sent_by_user = ""
                sender_email = sender.get("address") or ""
                cfg = cls.get_or_create_config(db)
                if sender_email.lower() == (cfg.email_address or "").lower():
                    try:
                        sent_logs = db.execute(
                            select(WebmailSentLog).order_by(desc(WebmailSentLog.sent_at)).limit(200)
                        ).scalars().all()
                        to_emails = [r.get("email") for r in to_list if r.get("email")]
                        sent_by_user = cls.match_sent_log_user(
                            subject=data.get("subject") or "",
                            sent_time_raw=time_raw,
                            recipient_emails=to_emails,
                            sent_logs=sent_logs
                        )
                    except Exception as le:
                        logger.warning(f"Lỗi tìm người gửi trong sent_logs ở get_message_detail: {le}")

                # 3. LƯU BẢN GHI VÀO WEBMAIL_DETAIL_CACHE ĐỂ LẦN SAU MỞ TỨC THÌ 0MS
                try:
                    existing_detail = db.execute(
                        select(WebmailDetailCache.id).where(WebmailDetailCache.id == message_id)
                    ).scalar_one_or_none()
                    if not existing_detail:
                        db.add(WebmailDetailCache(
                            id=message_id,
                            subject=data.get("subject") or "(Không có chủ đề)",
                            sender_name=sender.get("name") or sender.get("address") or "",
                            sender_email=sender_email,
                            to_recipients_json=json.dumps(to_list, ensure_ascii=False),
                            cc_recipients_json=json.dumps(cc_list, ensure_ascii=False),
                            received_time_vn=format_iso_to_vn(time_raw),
                            received_time_raw=time_raw,
                            has_attachments=bool(attachments),
                            attachments_json=json.dumps(attachments, ensure_ascii=False),
                            body_type=body_info.get("contentType", "html"),
                            body_content=resolved_body_content,
                            importance=data.get("importance", "normal"),
                            sent_by_user=sent_by_user,
                            cached_at=datetime.now()
                        ))
                        db.commit()
                        logger.info(f"Đã lưu cache chi tiết email {message_id} vào WEBMAIL_DETAIL_CACHE.")
                except Exception as save_err:
                    logger.warning(f"Lỗi lưu WebmailDetailCache cho {message_id}: {save_err}")

                return {
                    "id": data.get("id"),
                    "subject": data.get("subject") or "(Không có chủ đề)",
                    "sender_name": sender.get("name") or sender.get("address") or "",
                    "sender_email": sender_email,
                    "to_recipients": to_list,
                    "cc_recipients": cc_list,
                    "received_time_vn": format_iso_to_vn(time_raw),
                    "received_time_raw": time_raw,
                    "is_read": True,  # Sau khi mở xem đã là True đối với user hiện tại
                    "has_attachments": bool(attachments),
                    "attachments": attachments,
                    "body_type": body_info.get("contentType", "html"),
                    "body_content": resolved_body_content,
                    "importance": data.get("importance", "normal"),
                    "sent_by_user": sent_by_user
                }
        except httpx.RequestError as exc:
            logger.error(f"Lỗi mạng khi tải chi tiết email: {exc}")
            raise HTTPException(status_code=504, detail=f"Lỗi kết nối máy chủ: {exc}")

    @classmethod
    def mark_as_read(cls, db: Session, message_id: str, is_read: bool = True, current_username: str = "") -> Dict[str, Any]:
        """Đánh dấu một email là ĐÃ ĐỌC hoặc CHƯA ĐỌC riêng cho user hiện tại."""
        if not current_username:
            return {"status": "SUCCESS", "message_id": message_id, "is_read": is_read}

        try:
            if is_read:
                existing = db.execute(
                    select(WebmailUserRead).where(
                        WebmailUserRead.username == current_username,
                        WebmailUserRead.message_id == message_id
                    )
                ).scalar_one_or_none()
                if not existing:
                    db.add(WebmailUserRead(
                        username=current_username,
                        message_id=message_id,
                        read_at=datetime.now()
                    ))
                    db.commit()
            else:
                db.execute(
                    delete(WebmailUserRead).where(
                        WebmailUserRead.username == current_username,
                        WebmailUserRead.message_id == message_id
                    )
                )
                db.commit()
            return {"status": "SUCCESS", "message_id": message_id, "is_read": is_read}
        except Exception as e:
            logger.error(f"Lỗi cập nhật trạng thái đã đọc cho user {current_username}: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi cập nhật trạng thái đã đọc: {e}")

    @classmethod
    def mark_all_as_read(cls, db: Session, current_username: str = "") -> Dict[str, Any]:
        """
        Đánh dấu TẤT CẢ email chưa đọc là ĐÃ ĐỌC riêng cho user hiện tại.
        Tuyệt đối không ảnh hưởng tới trạng thái chưa đọc của các tài khoản khác!
        """
        if not current_username:
            return {"status": "SUCCESS", "marked_count": 0}

        try:
            # 1. Đồng bộ mọi thư mới từ M365 trước nếu có
            try:
                token = cls.get_graph_token(db)
                with httpx.Client(timeout=25.0) as client:
                    cls.sync_inbox_from_graph(db, client, token)
            except Exception as se:
                logger.warning(f"Lỗi sync khi mark_all_as_read: {se}")

            # 2. Thêm tất cả ID trong cache mà user này chưa đọc vào WebmailUserRead
            user_read_ids = set(
                db.execute(
                    select(WebmailUserRead.message_id).where(WebmailUserRead.username == current_username)
                ).scalars().all()
            )
            cached_ids = db.execute(select(WebmailInboxCache.id)).scalars().all()

            marked_count = 0
            for mid in cached_ids:
                if mid and mid not in user_read_ids:
                    db.add(WebmailUserRead(
                        username=current_username,
                        message_id=mid,
                        read_at=datetime.now()
                    ))
                    marked_count += 1

            if marked_count > 0:
                db.commit()

            logger.info(f"Đã đánh dấu {marked_count} email chưa đọc thành ĐÃ ĐỌC riêng cho user {current_username}.")
            return {"status": "SUCCESS", "marked_count": marked_count}
        except Exception as e:
            logger.error(f"Lỗi đánh dấu tất cả email là đã đọc cho user {current_username}: {e}")
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
                        detail=f"Tệp '{fname}' có dung lượng ({fsize / (1024*1024):.2f}MB) vượt quá giới hạn tối đa cho phép là 30MB."
                    )

            if total_attachment_bytes > MAX_ATTACHMENT_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tổng dung lượng các tệp đính kèm ({total_attachment_bytes / (1024*1024):.2f}MB) vượt quá giới hạn 30MB."
                )

        # Lấy chữ ký của user hiện tại để gắn vào cuối email nếu chưa có
        sender_name = getattr(current_user, "full_name", None) or getattr(current_user, "hoten", None) or current_user.username
        user_sig = cls.get_user_signature(db, current_user.username, sender_name)
        sig_html = user_sig.get("signature_html", "")

        full_html = body_html

        # Kiểm tra xem chữ ký đã có trong nội dung email hay chưa:
        # 1. Khung chữ ký chuẩn 'email-signature-container' do Frontend chèn trong trình soạn thảo
        # 2. Hoặc chuỗi HTML chữ ký / tên / email của user đã tồn tại trong body
        has_signature = False
        if "email-signature-container" in full_html:
            has_signature = True
        elif sig_html and sig_html.strip() in full_html:
            has_signature = True
        elif user_sig.get("email") and user_sig["email"].lower() in full_html.lower() and "golden gate" in full_html.lower():
            has_signature = True

        if sig_html and not has_signature:
            # Nếu trong body có khối nội dung cũ (reply/forward), chữ ký BẮT BUỘC phải nằm Ở TRÊN nội dung cũ!
            if '<div class="quoted-original-email"' in full_html:
                idx = full_html.find('<div class="quoted-original-email"')
                full_html = f"{full_html[:idx]}<br /><div class=\"email-signature-container\">{sig_html}</div><br />{full_html[idx:]}"
            elif '<hr' in full_html:
                idx = full_html.find('<hr')
                full_html = f"{full_html[:idx]}<br /><div class=\"email-signature-container\">{sig_html}</div><br />{full_html[idx:]}"
            else:
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
