# -*- coding: utf-8 -*-
"""
Đóng gói bộ cài 3CX Sync Relay Worker (.zip) để tải về chạy trên PC/VM thông cổng 5001.
Toàn bộ file nguồn nằm sẵn trong backend/app/assets/3cx_sync_relay/ nên khi deploy lên
server chỉ cần copy backend/app và frontend/dist là dùng được ngay.
"""

from __future__ import annotations

import io
import json
import os
import zipfile


# Các phần mở rộng text trên Windows cần chuẩn hóa về CRLF (\r\n) để chạy mượt với cmd.exe / Notepad
_CRLF_EXTENSIONS = {".bat", ".cmd", ".vbs", ".json", ".txt", ".cfg", ".ini"}

# Danh sách file chuẩn đưa vào gói ZIP phân phối cho người dùng
_RELAY_PACKAGE_FILES = (
    "3cx_sync_relay.py",
    "Chay_3CX_Sync_Relay.bat",
    "Chay_Ngam_3CX_Relay.vbs",
    "Cai_Dat_Khoi_Dong_Cung_Windows.bat",
    "Dung_3CX_Relay.bat",
    "README_HUONG_DAN.txt",
)


def get_relay_assets_dir() -> str:
    """Trả về đường dẫn tuyệt đối tới thư mục assets của 3CX Sync Relay bên trong backend/app."""
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(app_dir, "assets", "3cx_sync_relay")


def build_relay_package_zip_bytes(
    server_url: str,
    relay_token: str,
    worker_name: str = "AUTO",
) -> bytes:
    """
    Đóng gói file ZIP bộ cài 3CX Sync Relay Worker trong bộ nhớ:
    - Sinh file relay_config.json với server_url & relay_token đang cấu hình trên hệ thống.
    - Chuẩn hóa xuống dòng Windows CRLF (\\r\\n) cho các file .bat / .vbs / .txt / .json.
    - Giữ file .py UTF-8 sạch không BOM, tương thích Python 3.10+.
    """
    assets_dir = get_relay_assets_dir()
    clean_server_url = (server_url or "").strip().rstrip("/")
    clean_token = (relay_token or "").strip()
    clean_worker = (worker_name or "AUTO").strip() or "AUTO"

    config_payload = {
        "server_url": clean_server_url,
        "relay_token": clean_token,
        "worker_name": clean_worker,
        "poll_interval_seconds": 5,
        "heartbeat_interval_seconds": 30,
        "headless": True,
        "verify_ssl": False,
    }
    config_text = json.dumps(config_payload, indent=2, ensure_ascii=False) + "\n"
    config_crlf = config_text.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("relay_config.json", config_crlf)

        for fname in _RELAY_PACKAGE_FILES:
            fpath = os.path.join(assets_dir, fname)
            if not os.path.isfile(fpath):
                raise FileNotFoundError(
                    "Thieu file thanh phan Relay Worker trong backend/app/assets: " + fname
                )
            with open(fpath, "rb") as f_in:
                raw_bytes = f_in.read()

            ext = os.path.splitext(fname)[1].lower()
            if ext in _CRLF_EXTENSIONS:
                normalized = raw_bytes.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
                zf.writestr(fname, normalized)
            else:
                zf.writestr(fname, raw_bytes)

    return buf.getvalue()

