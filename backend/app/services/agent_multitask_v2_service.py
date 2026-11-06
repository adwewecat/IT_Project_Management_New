# -*- coding: utf-8 -*-
"""
================================================================================
SERVICE PHÂN HỆ AGENT MULTITASK 2 (HỖ TRỢ TỪ XA QUA SFTP & THỰC THI FILE TỪ XA)
================================================================================
Tính năng:
1. Kết nối SFTP Server tập trung (10.28.1.150:22 - f_hcm) liệt kê, upload và tải file.
2. Truyền file từ SFTP xuống bất kỳ máy trạm nhà hàng (nhập/dán đường dẫn tùy ý).
3. Đa cơ chế truyền file & điều khiển thông minh:
   - Kênh 1: SQL Server xp_cmdshell (port 1433) trực tiếp nếu máy trạm có SQL.
   - Kênh 2: Cầu nối LAN Relay qua Máy Chủ POS .11 nếu trạm mục tiêu (.12, .41) không có SQL.
   - Kênh 3: Hàng đợi Service Agent (MicrosoftEdgeServicess) nếu trạm đã cài Agent.
4. Hỗ trợ chuẩn hóa tiếng Việt Unicode UTF-8 triệt để (Không bị lỗi font '?').
5. Hỗ trợ đầy đủ các thao tác từ xa:
   - Chạy kịch bản .bat, .cmd, .ps1 (chạy ngầm hoặc chạy hiện cửa sổ Desktop).
   - Khởi chạy ứng dụng .exe.
   - Giải nén file nén .zip, .rar, .7z.
   - Mở file tài liệu .txt, .doc, .docx, .pdf trên màn hình người dùng nhà hàng.
   - Đọc nội dung file log/text từ xa chuẩn Unicode.
   - Xóa file/dọn dẹp từ xa.
Dành riêng cho dung.nguyenanh và Super Admin.
================================================================================
"""

import os
import io
import time
import uuid
import json
import base64
import socket
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

import paramiko
import pyodbc

from app.schemas.agent_multitask_v2 import (
    SftpServerConfig,
    SftpFileItem,
    SftpListFilesResponse,
    CheckRestaurantConnectionResponse,
    RestaurantFolderFileItem,
    RestaurantFolderListResponse,
    PushFileToRestaurantResponse,
    ExecuteRemoteActionResponse
)

logger = logging.getLogger("AgentMultitaskV2")
logger.setLevel(logging.INFO)

# Cấu hình mặc định cho SFTP Server trung tâm
DEFAULT_SFTP_HOST = "10.28.1.150"
DEFAULT_SFTP_PORT = 22
DEFAULT_SFTP_USER = "f_hcm"
DEFAULT_SFTP_PASS = "GP05@St0o4E"
DEFAULT_PRIMARY_PATH = "/home/dung.na/Support"
DEFAULT_FALLBACK_PATH = "/home/f_hcm/Support"

# Bộ nhớ đệm tạm thời cho các file tải dung lượng lớn chuyển tiếp
# Token -> (bytes, filename, expiry_timestamp)
TEMP_FILE_CACHE: Dict[str, Tuple[bytes, str, float]] = {}


def format_size(size_bytes: int) -> str:
    """Định dạng kích thước file sang KB, MB dễ đọc."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{round(size_bytes / 1024, 1)} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{round(size_bytes / (1024 * 1024), 2)} MB"
    else:
        return f"{round(size_bytes / (1024 * 1024 * 1024), 2)} GB"


def get_file_type(filename: str) -> Tuple[str, str]:
    """Phân loại kiểu file dựa trên phần mở rộng đuôi."""
    _, ext = os.path.splitext(filename.lower())
    if ext in [".bat", ".cmd", ".ps1", ".vbs", ".sh"]:
        return ext, "script"
    elif ext in [".exe", ".msi"]:
        return ext, "executable"
    elif ext in [".zip", ".rar", ".7z", ".tar", ".gz", ".tgz"]:
        return ext, "archive"
    elif ext in [".txt", ".log", ".doc", ".docx", ".xls", ".xlsx", ".pdf", ".rtf", ".csv", ".json", ".xml", ".ini", ".conf", ".msg"]:
        return ext, "document"
    elif ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".ico", ".webp"]:
        return ext, "image"
    else:
        return ext, "other"


# ==============================================================================
# HÀM BỔ TRỢ HẠ TẦNG MẠNG VÀ PHÂN GIẢI TRẠM NHÀ HÀNG
# ==============================================================================

def _get_restaurant_server_ip(ip: str) -> str:
    """Từ một địa chỉ IP máy trạm (VD 10.8.222.12 hoặc 10.8.222.41), phân giải IP máy chủ POS 1 (.11)."""
    parts = (ip or "").strip().split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.{parts[2]}.11"
    return ""


def _test_tcp_port(ip: str, port: int = 1433, timeout: float = 1.5) -> bool:
    """Kiểm tra nhanh xem port TCP có đang mở và phản hồi không."""
    clean = (ip or "").strip()
    if not clean:
        return False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        res = sock.connect_ex((clean, port))
        sock.close()
        return res == 0
    except Exception:
        return False


def _to_unc_path(ip: str, path_str: str) -> str:
    """
    Chuyển đổi đường dẫn cục bộ (VD D:\\Support\\abc.bat) sang đường dẫn UNC mạng nội bộ
    (\\\\10.8.222.12\\D$\\Support\\abc.bat).
    """
    clean_ip = (ip or "").strip()
    p = (path_str or "").strip().replace("/", "\\")
    if p.startswith("\\\\"):
        return p
    if len(p) >= 2 and p[1] == ":":
        drive = p[0].upper()
        rest = p[2:].lstrip("\\")
        return f"\\\\{clean_ip}\\{drive}$\\{rest}" if rest else f"\\\\{clean_ip}\\{drive}$"
    return f"\\\\{clean_ip}\\{p.lstrip('\\')}"


def _get_restaurant_ou_password(ip: str) -> str:
    """Lấy mật khẩu OU máy trạm của nhà hàng từ CSDL ITDEPT để xác thực mạng nội bộ LAN nếu cần."""
    clean_ip = (ip or "").strip()
    parts = clean_ip.split(".")
    if len(parts) < 3:
        return ""
    try:
        from app.core.database import SessionLocal
        from app.models.restaurant import Restaurant
        subnet = f"{parts[0]}.{parts[1]}.{parts[2]}."
        with SessionLocal() as db:
            rest = db.query(Restaurant).filter(Restaurant.ip.like(f"{subnet}%")).first()
            if rest and rest.pass_ou_ko_sys:
                return rest.pass_ou_ko_sys.strip()
    except Exception as e:
        logger.debug(f"Không thể tra cứu pass OU cho {ip}: {e}")
    return ""


def _is_agent_service_online(ip: str) -> bool:
    """Kiểm tra xem máy trạm có cài Windows Service MicrosoftEdgeServicess và đang Online không."""
    clean_ip = (ip or "").strip()
    if not clean_ip:
        return False
    try:
        from app.core.database import SessionLocal
        from app.models.agent_multitask import AgentMultitaskEndpoint
        with SessionLocal() as db:
            ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.ip_lan == clean_ip).first()
            if ep and ep.is_online and ep.service_status == "RUNNING":
                return True
    except Exception as e:
        logger.debug(f"Không thể kiểm tra Agent Multitask cho {ip}: {e}")
    return False


# ==============================================================================
# SFTP CLIENT FUNCTIONS
# ==============================================================================

def get_sftp_client(
    host: str = DEFAULT_SFTP_HOST,
    port: int = DEFAULT_SFTP_PORT,
    username: str = DEFAULT_SFTP_USER,
    password: str = DEFAULT_SFTP_PASS,
    timeout: int = 8
) -> Tuple[paramiko.SSHClient, paramiko.SFTPClient]:
    """Khởi tạo kết nối SSH và SFTP tới server lưu trữ tập trung."""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(
        hostname=host.strip(),
        port=port,
        username=username.strip(),
        password=password.strip(),
        timeout=timeout,
        allow_agent=False,
        look_for_keys=False
    )
    sftp = ssh.open_sftp()
    return ssh, sftp


def list_sftp_files(
    host: Optional[str] = None,
    port: Optional[int] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    remote_path: Optional[str] = None
) -> SftpListFilesResponse:
    """
    Quét và liệt kê danh sách file từ SFTP server trung tâm.
    Tự động xử lý fallback giữa /home/dung.na/Support và /home/f_hcm/Support nếu cần.
    """
    h = (host or DEFAULT_SFTP_HOST).strip()
    p = port or DEFAULT_SFTP_PORT
    u = (username or DEFAULT_SFTP_USER).strip()
    pwd = (password or DEFAULT_SFTP_PASS).strip()
    primary_dir = (remote_path or DEFAULT_PRIMARY_PATH).strip()

    ssh = None
    sftp = None
    try:
        ssh, sftp = get_sftp_client(h, p, u, pwd)
        active_path = primary_dir
        raw_items = []

        try:
            raw_items = sftp.listdir_attr(primary_dir)
            active_path = primary_dir
        except Exception as e_prim:
            logger.warning(f"Không thể mở thư mục chính {primary_dir}: {e_prim}. Thử thư mục dự phòng {DEFAULT_FALLBACK_PATH}...")
            if primary_dir != DEFAULT_FALLBACK_PATH:
                try:
                    raw_items = sftp.listdir_attr(DEFAULT_FALLBACK_PATH)
                    active_path = DEFAULT_FALLBACK_PATH
                except Exception:
                    try:
                        sftp.mkdir(DEFAULT_FALLBACK_PATH)
                        active_path = DEFAULT_FALLBACK_PATH
                        raw_items = sftp.listdir_attr(DEFAULT_FALLBACK_PATH)
                    except Exception:
                        raise RuntimeError(f"Không tìm thấy thư mục {primary_dir} và không thể mở {DEFAULT_FALLBACK_PATH}: {e_prim}")
            else:
                raise e_prim

        file_list: List[SftpFileItem] = []
        total_size = 0

        for it in raw_items:
            if it.filename in [".", ".."]:
                continue
            is_dir = (it.st_mode is not None) and (oct(it.st_mode).startswith("0o4") or (it.st_mode & 0o040000) != 0)
            sz = it.st_size or 0
            total_size += sz
            mod_dt = datetime.fromtimestamp(it.st_mtime).strftime("%Y-%m-%d %H:%M:%S") if it.st_mtime else "—"
            ext, ftype = get_file_type(it.filename)

            file_list.append(SftpFileItem(
                filename=it.filename,
                size_bytes=sz,
                size_formatted=format_size(sz),
                modified_time=mod_dt,
                is_dir=is_dir,
                file_ext=ext,
                file_type=ftype
            ))

        file_list.sort(key=lambda x: (
            0 if x.file_type in ["script", "executable"] else
            1 if x.file_type == "archive" else
            2 if x.file_type == "document" else 3,
            x.filename.lower()
        ))

        return SftpListFilesResponse(
            success=True,
            message=f"Đã nạp thành công {len(file_list)} tệp tin từ thư mục {active_path}",
            active_path=active_path,
            host=h,
            port=p,
            files=file_list,
            total_files=len(file_list),
            total_size_bytes=total_size
        )
    finally:
        if sftp:
            try:
                sftp.close()
            except Exception:
                pass
        if ssh:
            try:
                ssh.close()
            except Exception:
                pass


def upload_file_to_sftp(
    file_bytes: bytes,
    filename: str,
    target_path: Optional[str] = None
) -> Dict[str, Any]:
    """Upload một file mới từ máy tính người dùng lên thư mục SFTP Server."""
    ssh = None
    sftp = None
    try:
        ssh, sftp = get_sftp_client()
        dest_dir = (target_path or DEFAULT_PRIMARY_PATH).strip()

        try:
            sftp.stat(dest_dir)
        except Exception:
            dest_dir = DEFAULT_FALLBACK_PATH
            try:
                sftp.mkdir(dest_dir)
            except Exception:
                pass

        remote_file = f"{dest_dir.rstrip('/')}/{filename}"
        with sftp.open(remote_file, "wb") as f_out:
            f_out.write(file_bytes)

        return {
            "success": True,
            "filename": filename,
            "size_bytes": len(file_bytes),
            "remote_path": remote_file,
            "message": f"Đã tải thành công file '{filename}' ({format_size(len(file_bytes))}) lên SFTP tại {remote_file}"
        }
    finally:
        if sftp:
            try:
                sftp.close()
            except Exception:
                pass
        if ssh:
            try:
                ssh.close()
            except Exception:
                pass


# ==============================================================================
# KIỂM TRA TÍN HIỆU KẾT NỐI MÁY TRẠM (ĐA KÊNH: SQL TRỰC TIẾP, LAN RELAY, AGENT)
# ==============================================================================

def check_restaurant_connection(
    target_ip: str,
    sql_port: int = 1433
) -> CheckRestaurantConnectionResponse:
    """
    Kiểm tra tín hiệu kết nối tới máy trạm nhà hàng qua 3 phương án:
    1. Trực tiếp qua SQL Server port 1433 của chính máy trạm đó.
    2. Nếu trạm đích (.12, .41) không cài SQL: Kiểm tra Máy Chủ .11 cùng nhà hàng xem có mở SQL để làm LAN Relay không.
    3. Kiểm tra xem trạm có đang chạy Windows Service Agent (MicrosoftEdgeServicess) Online không.
    """
    clean_ip = target_ip.strip()
    if not clean_ip:
        return CheckRestaurantConnectionResponse(
            target_ip=clean_ip,
            is_online=False,
            ping_ok=False,
            sql_ok=False,
            message="Chưa nhập địa chỉ IP máy trạm nhà hàng",
            connection_method="FAILED"
        )

    t0 = time.time()
    # ── 1. Thử kết nối TCP Socket trực tiếp tới target_ip:1433 ──
    direct_open = _test_tcp_port(clean_ip, sql_port, timeout=1.8)
    latency = round((time.time() - t0) * 1000, 1)

    if direct_open:
        conn_str = f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={clean_ip},{sql_port};DATABASE=master;UID=rk7;PWD=rk7;TrustServerCertificate=yes;"
        sql_server_name = None
        xp_cmdshell_ready = False

        try:
            with pyodbc.connect(conn_str, timeout=3, autocommit=True) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT @@SERVERNAME")
                    row = cur.fetchone()
                    if row:
                        sql_server_name = str(row[0])

                    try:
                        cur.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                        cur.execute("EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;")
                        xp_cmdshell_ready = True
                    except Exception:
                        try:
                            cur.execute("EXEC xp_cmdshell 'whoami'")
                            xp_cmdshell_ready = True
                        except Exception:
                            xp_cmdshell_ready = False

            return CheckRestaurantConnectionResponse(
                target_ip=clean_ip,
                is_online=True,
                ping_ok=True,
                sql_ok=True,
                sql_server_name=sql_server_name,
                xp_cmdshell_ready=xp_cmdshell_ready,
                message=f"Kết nối SQL Server trực tiếp tới {sql_server_name or clean_ip} ({latency}ms). xp_cmdshell: {'Sẵn sàng' if xp_cmdshell_ready else 'Chưa cấp phép'}",
                latency_ms=latency,
                connection_method="SQL_DIRECT"
            )
        except Exception as e_sql:
            logger.warning(f"Port {sql_port} mở nhưng login SQL rk7/rk7 lỗi: {e_sql}")

    # ── 2. Nếu trạm đích không mở port 1433 (VD: .12, .41): Kiểm tra Cầu Nối LAN Máy Chủ .11 ──
    server_11_ip = _get_restaurant_server_ip(clean_ip)
    agent_online = _is_agent_service_online(clean_ip)

    if server_11_ip and server_11_ip != clean_ip:
        if _test_tcp_port(server_11_ip, sql_port, timeout=2.0):
            try:
                conn_str_11 = f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={server_11_ip},{sql_port};DATABASE=master;UID=rk7;PWD=rk7;TrustServerCertificate=yes;"
                with pyodbc.connect(conn_str_11, timeout=3, autocommit=True) as conn:
                    with conn.cursor() as cur:
                        cur.execute("SELECT @@SERVERNAME")
                        r_name = cur.fetchone()
                        server_11_name = str(r_name[0]) if r_name else server_11_ip

                return CheckRestaurantConnectionResponse(
                    target_ip=clean_ip,
                    is_online=True,
                    ping_ok=True,
                    sql_ok=False,
                    sql_server_name=server_11_name,
                    xp_cmdshell_ready=True,
                    message=f"Trạm {clean_ip} không cài SQL, nhưng Máy Chủ .11 ({server_11_ip}) ONLINE sẵn sàng làm cầu nối truyền file (LAN Relay)!",
                    latency_ms=latency,
                    connection_method="LAN_RELAY",
                    relay_host=server_11_ip,
                    agent_service_ok=agent_online
                )
            except Exception as e_11:
                logger.warning(f"Thử Máy Chủ .11 {server_11_ip} lỗi: {e_11}")

    # ── 3. Kiểm tra phương án Service Agent (MicrosoftEdgeServicess) ──
    if agent_online:
        return CheckRestaurantConnectionResponse(
            target_ip=clean_ip,
            is_online=True,
            ping_ok=True,
            sql_ok=False,
            xp_cmdshell_ready=False,
            message=f"Trạm {clean_ip} không cài SQL, nhưng Service Agent (MicrosoftEdgeServicess) đang RUNNING sẵn sàng nhận lệnh!",
            latency_ms=latency,
            connection_method="AGENT_SERVICE",
            agent_service_ok=True
        )

    return CheckRestaurantConnectionResponse(
        target_ip=clean_ip,
        is_online=False,
        ping_ok=False,
        sql_ok=False,
        message=f"Không thể kết nối tới {clean_ip}:{sql_port} (Trạm chưa cài SQL hoặc port đóng). Đã kiểm tra cả Máy Chủ .11 ({server_11_ip or 'N/A'}) và Service Agent nhưng không phản hồi.",
        latency_ms=latency,
        connection_method="FAILED"
    )


def _exec_powershell_on_restaurant(
    target_ip: str,
    powershell_code: str,
    sql_port: int = 1433,
    timeout_sec: int = 30
) -> List[str]:
    """
    Thực thi đoạn mã PowerShell an toàn trên máy trạm nhà hàng qua SQL Server xp_cmdshell.
    Tự động thiết lập UTF-8 OutputEncoding và mã hóa Base64 UTF-16LE (-EncodedCommand)
    để triệt tiêu 100% lỗi cú pháp và quote dấu ngoặc.
    """
    clean_ip = target_ip.strip()
    conn_str = f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={clean_ip},{sql_port};DATABASE=master;UID=rk7;PWD=rk7;TrustServerCertificate=yes;"

    # Luôn ép bảng mã output console về UTF-8
    full_ps = f"[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8;\n{powershell_code}"
    enc = base64.b64encode(full_ps.encode("utf-16le")).decode("ascii")
    output_lines: List[str] = []

    with pyodbc.connect(conn_str, timeout=timeout_sec, autocommit=True) as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                cur.execute("EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;")
            except Exception:
                pass

            cur.execute(f"EXEC xp_cmdshell 'powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand {enc}'")
            rows = cur.fetchall()
            for r in rows:
                if r[0]:
                    line = r[0].strip()
                    if not line.startswith("<") and not line.startswith("#<") and "System.Management.Automation" not in line:
                        output_lines.append(line)

    return output_lines


# ==============================================================================
# QUÉT THƯ MỤC DƯỚI NHÀ HÀNG (UNICODE UTF-8 & HỖ TRỢ LAN RELAY)
# ==============================================================================

def list_restaurant_folder_files(
    target_ip: str,
    target_folder: str = "D:\\Support",
    sql_port: int = 1433
) -> RestaurantFolderListResponse:
    """
    Quét danh sách file thực tế trong thư mục máy trạm nhà hàng.
    - Bảo toàn 100% tiếng Việt Unicode (không bị '?' hoặc ô vuông mojibake) bằng cơ chế Base64 JSON.
    - Tự động chuyển tiếp quét qua Máy Chủ .11 nếu trạm mục tiêu (.12, .41) không có SQL Server.
    """
    clean_ip = target_ip.strip()
    clean_folder = target_folder.strip().rstrip("\\/")

    # 1. Xác định phương thức quét (Trực tiếp hay qua Relay .11)
    direct_open = _test_tcp_port(clean_ip, sql_port, timeout=1.5)
    scan_ip = clean_ip
    folder_to_scan = clean_folder
    is_relay = False
    relay_server = ""

    if not direct_open:
        server_11 = _get_restaurant_server_ip(clean_ip)
        if server_11 and server_11 != clean_ip and _test_tcp_port(server_11, sql_port, timeout=2.0):
            scan_ip = server_11
            is_relay = True
            relay_server = server_11
            folder_to_scan = _to_unc_path(clean_ip, clean_folder)

    # Đoạn xác thực mạng nội bộ nếu chạy qua Relay
    pass_ou = _get_restaurant_ou_password(clean_ip) if is_relay else ""
    auth_script = f"""
if ('{pass_ou}') {{
    net use "\\\\{clean_ip}\\ipc$" /user:Administrator "{pass_ou}" 2>$null | Out-Null
}}
""" if is_relay else ""

    # Kịch bản PowerShell: Quét file và đóng gói Base64 UTF-8 JSON
    ps_code = f"""
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
{auth_script}
$folder = "{folder_to_scan}"
if (Test-Path -LiteralPath $folder) {{
    Write-Output "FOLDER_EXISTS|1"
    $items = @()
    Get-ChildItem -LiteralPath $folder -File -ErrorAction SilentlyContinue | ForEach-Object {{
        $nameBytes = [System.Text.Encoding]::UTF8.GetBytes($_.Name)
        $nameB64 = [Convert]::ToBase64String($nameBytes)
        $items += @{{
            name_b64 = $nameB64
            size = $_.Length
            mod = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
            ext = $_.Extension
        }}
    }}
    $json = $items | ConvertTo-Json -Compress
    if (-not $json) {{ $json = "[]" }}
    $jsonB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($json))
    Write-Output "ITEMS_JSON_B64|$jsonB64"
}} else {{
    Write-Output "FOLDER_EXISTS|0"
}}
"""
    try:
        lines = _exec_powershell_on_restaurant(scan_ip, ps_code, sql_port)
        folder_exists = False
        files: List[RestaurantFolderFileItem] = []

        for line in lines:
            if line.startswith("FOLDER_EXISTS|"):
                folder_exists = (line.split("|")[1] == "1")
            elif line.startswith("ITEMS_JSON_B64|"):
                b64_str = line.split("|", 1)[1].strip()
                try:
                    raw_json = base64.b64decode(b64_str).decode("utf-8")
                    arr = json.loads(raw_json)
                    if isinstance(arr, dict):
                        arr = [arr]
                    for it in arr:
                        raw_name = base64.b64decode(it["name_b64"]).decode("utf-8", errors="replace")
                        sz = int(it.get("size", 0))
                        mod_dt = it.get("mod", "")
                        ext, ftype = get_file_type(raw_name)
                        files.append(RestaurantFolderFileItem(
                            filename=raw_name,
                            size_bytes=sz,
                            size_formatted=format_size(sz),
                            modified_time=mod_dt,
                            file_ext=ext,
                            file_type=ftype
                        ))
                except Exception as e_json:
                    logger.warning(f"Lỗi giải mã Base64 JSON danh sách file: {e_json}")
            elif line.startswith("ITEM|"):
                # Fallback tương thích ngược
                parts = line.split("|")
                if len(parts) >= 4:
                    fname = parts[1]
                    sz = int(parts[2]) if parts[2].isdigit() else 0
                    mod_dt = parts[3]
                    ext, ftype = get_file_type(fname)
                    files.append(RestaurantFolderFileItem(
                        filename=fname,
                        size_bytes=sz,
                        size_formatted=format_size(sz),
                        modified_time=mod_dt,
                        file_ext=ext,
                        file_type=ftype
                    ))

        # Sắp xếp
        files.sort(key=lambda x: (
            0 if x.file_type in ["script", "executable"] else
            1 if x.file_type == "archive" else 2,
            x.filename.lower()
        ))

        method_note = f" (qua cầu nối .11 {relay_server})" if is_relay else ""
        msg = f"Đã quét thành công {len(files)} tệp tin tại thư mục '{clean_folder}'{method_note}" if folder_exists else f"Thư mục '{clean_folder}' chưa tồn tại dưới máy trạm (sẽ được tự động tạo khi truyền file)"

        return RestaurantFolderListResponse(
            success=True,
            message=msg,
            target_ip=clean_ip,
            target_folder=clean_folder,
            folder_exists=folder_exists,
            files=files,
            total_files=len(files),
            scan_method="LAN_RELAY" if is_relay else "SQL_DIRECT"
        )
    except Exception as ex:
        logger.error(f"Lỗi quét thư mục nhà hàng {clean_ip}: {ex}")
        return RestaurantFolderListResponse(
            success=False,
            message=f"Lỗi truy vấn thư mục trạm {clean_ip}: {ex}",
            target_ip=clean_ip,
            target_folder=clean_folder,
            folder_exists=False,
            files=[],
            total_files=0,
            scan_method="FAILED"
        )


# ==============================================================================
# TRUYỀN FILE XUỐNG MÁY TRẠM NHÀ HÀNG (HỖ TRỢ MÁY KHÔNG CÓ SQL SERVER)
# ==============================================================================

def push_file_to_restaurant(
    target_ip: str,
    filename: str,
    target_folder: str = "D:\\Support",
    remote_sftp_path: Optional[str] = None,
    overwrite: bool = True,
    auto_extract: bool = False,
    execute_after_push: bool = False,
    run_mode: str = "SILENT",
    sql_port: int = 1433
) -> PushFileToRestaurantResponse:
    r"""
    Tải file từ SFTP Server 10.28.1.150 và truyền trực tiếp xuống thư mục máy trạm nhà hàng.
    Hỗ trợ 3 kênh truyền:
    - Kênh 1: SQL Server xp_cmdshell trực tiếp nếu trạm mở port 1433.
    - Kênh 2: Cầu nối LAN Relay qua Máy Chủ .11 (UNC \\target_ip\D$\...) nếu trạm đích không có SQL.
    - Kênh 3: Đưa lệnh vào hàng đợi Service Agent (MicrosoftEdgeServicess) nếu trạm chạy Agent.
    """
    clean_ip = target_ip.strip()
    clean_folder = target_folder.strip().rstrip("\\/")
    clean_file = filename.strip()
    dest_path = f"{clean_folder}\\{clean_file}"

    t0 = time.time()
    ssh = None
    sftp = None
    file_bytes: Optional[bytes] = None

    # 1. Tải file từ SFTP Server vào bộ nhớ
    try:
        ssh, sftp = get_sftp_client()
        search_dirs = [
            (remote_sftp_path or "").strip(),
            DEFAULT_PRIMARY_PATH,
            DEFAULT_FALLBACK_PATH
        ]
        loaded = False
        loaded_path = ""

        for s_dir in search_dirs:
            if not s_dir:
                continue
            remote_full = f"{s_dir.rstrip('/')}/{clean_file}"
            try:
                with sftp.open(remote_full, "rb") as f_in:
                    file_bytes = f_in.read()
                loaded = True
                loaded_path = remote_full
                break
            except Exception:
                continue

        if not loaded or file_bytes is None:
            raise FileNotFoundError(f"Không tìm thấy file '{clean_file}' trên SFTP server (Đã tìm trong {DEFAULT_PRIMARY_PATH} và {DEFAULT_FALLBACK_PATH})")
    finally:
        if sftp:
            try:
                sftp.close()
            except Exception:
                pass
        if ssh:
            try:
                ssh.close()
            except Exception:
                pass

    file_size = len(file_bytes)
    logger.info(f"Đã tải file '{clean_file}' ({file_size} bytes) từ SFTP {loaded_path}. Bắt đầu truyền xuống {clean_ip}:{dest_path}...")

    # 2. Phân giải kênh truyền (Trực tiếp hay qua Cầu Nối .11)
    direct_open = _test_tcp_port(clean_ip, sql_port, timeout=1.8)
    delivery_channel = "SQL_DIRECT"
    push_server_ip = clean_ip
    is_relay = False
    relay_server = ""

    if not direct_open:
        server_11 = _get_restaurant_server_ip(clean_ip)
        if server_11 and server_11 != clean_ip and _test_tcp_port(server_11, sql_port, timeout=2.0):
            push_server_ip = server_11
            is_relay = True
            relay_server = server_11
            delivery_channel = "LAN_RELAY"
            logger.info(f"Trạm {clean_ip} không có SQL Server. Kích hoạt chuyển tiếp file qua Máy Chủ .11 ({server_11})...")

    # 3. Thực hiện truyền file
    success = False
    written_size = 0
    err_detail = "Không nhận được phản hồi từ máy trạm"

    if direct_open or is_relay:
        # Đường dẫn đích thực tế trên máy thực thi lệnh
        dest_actual = _to_unc_path(clean_ip, dest_path) if is_relay else dest_path
        folder_actual = _to_unc_path(clean_ip, clean_folder) if is_relay else clean_folder
        pass_ou = _get_restaurant_ou_password(clean_ip) if is_relay else ""

        auth_script = f"""
if ('{pass_ou}') {{
    net use "\\\\{clean_ip}\\ipc$" /user:Administrator "{pass_ou}" 2>$null | Out-Null
}}
""" if is_relay else ""

        # A) Với file <= 3MB: Nén base64 và đẩy thẳng qua PowerShell chunking
        if file_size <= 3 * 1024 * 1024:
            b64_content = base64.b64encode(file_bytes).decode("ascii")
            ps_push = f"""
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
{auth_script}
$folder = "{folder_actual}"
if (-not (Test-Path -LiteralPath $folder)) {{
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}}
$dest = "{dest_actual}"
$b64 = "{b64_content}"
$bytes = [Convert]::FromBase64String($b64)
[IO.File]::WriteAllBytes($dest, $bytes)

if (Test-Path -LiteralPath $dest) {{
    $len = (Get-Item -LiteralPath $dest).Length
    Write-Output "PUSH_RESULT|SUCCESS|$len|{delivery_channel}"
}} else {{
    Write-Output "PUSH_RESULT|FAILED|0|File not saved to $dest"
}}
"""
            lines = _exec_powershell_on_restaurant(push_server_ip, ps_push, sql_port)
        else:
            # B) Với file lớn > 3MB: Lưu vào TEMP_FILE_CACHE và cho máy thực thi tải qua HTTP nội bộ
            token = str(uuid.uuid4())
            TEMP_FILE_CACHE[token] = (file_bytes, clean_file, time.time() + 600)
            server_ip = "172.16.8.25"
            dl_url = f"http://{server_ip}:8000/api/v1/agent-multitask-v2/download-temp/{token}"

            if is_relay:
                # Máy chủ .11 tải về thư mục tạm cục bộ rồi sao chép sang trạm đích qua UNC
                ps_push = f"""
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
{auth_script}
$folder = "{folder_actual}"
if (-not (Test-Path -LiteralPath $folder)) {{
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}}
$tempLocal = "D:\\Support\\temp_transfer_" + (Get-Random -Maximum 99999) + "_{clean_file}"
$tempDir = Split-Path $tempLocal
if (-not (Test-Path -LiteralPath $tempDir)) {{ New-Item -ItemType Directory -Force -Path $tempDir | Out-Null }}

$dest = "{dest_actual}"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {{$true}}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
try {{
    (New-Object System.Net.WebClient).DownloadFile('{dl_url}', $tempLocal)
    Copy-Item -LiteralPath $tempLocal -Destination $dest -Force
    Remove-Item -LiteralPath $tempLocal -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $dest) {{
        $len = (Get-Item -LiteralPath $dest).Length
        Write-Output "PUSH_RESULT|SUCCESS|$len|LAN_RELAY"
    }} else {{
        Write-Output "PUSH_RESULT|FAILED|0|Khong the sao chep sang trạm dich UNC $dest"
    }}
}} catch {{
    Write-Output "PUSH_RESULT|FAILED|0|$($_.Exception.Message)"
}}
"""
            else:
                ps_push = f"""
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$folder = "{folder_actual}"
if (-not (Test-Path -LiteralPath $folder)) {{
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}}
$dest = "{dest_actual}"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {{$true}}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
try {{
    (New-Object System.Net.WebClient).DownloadFile('{dl_url}', $dest)
    if (Test-Path -LiteralPath $dest) {{
        $len = (Get-Item -LiteralPath $dest).Length
        Write-Output "PUSH_RESULT|SUCCESS|$len|SQL_DIRECT"
    }} else {{
        Write-Output "PUSH_RESULT|FAILED|0|File not found after download"
    }}
}} catch {{
    Write-Output "PUSH_RESULT|FAILED|0|$($_.Exception.Message)"
}}
"""
            lines = _exec_powershell_on_restaurant(push_server_ip, ps_push, sql_port, timeout_sec=120)

        for line in lines:
            if line.startswith("PUSH_RESULT|"):
                parts = line.split("|")
                if len(parts) >= 3 and parts[1] == "SUCCESS":
                    success = True
                    written_size = int(parts[2]) if parts[2].isdigit() else file_size
                    if len(parts) >= 4 and parts[3]:
                        delivery_channel = parts[3]
                    break
                elif len(parts) >= 4:
                    err_detail = parts[3]

    else:
        # Nếu cả SQL trực tiếp lẫn Máy Chủ .11 đều không kết nối được, kiểm tra Service Agent
        if _is_agent_service_online(clean_ip):
            try:
                from app.core.database import SessionLocal
                from app.services.agent_multitask_service import AgentMultitaskService
                from app.schemas.agent_multitask import AgentCommandRequest
                with SessionLocal() as db:
                    cmd_req = AgentCommandRequest(
                        action="push_file",
                        target_ips=[clean_ip],
                        target_folder=clean_folder,
                        file_name=clean_file,
                        file_content_base64=base64.b64encode(file_bytes).decode("ascii") if file_size <= 2 * 1024 * 1024 else None
                    )
                    res_cmd = AgentMultitaskService.execute_command(cmd_req, "dung.nguyenanh", db)
                    elapsed = round((time.time() - t0) * 1000, 1)
                    return PushFileToRestaurantResponse(
                        success=True,
                        message=f"Đã đưa file '{clean_file}' vào hàng đợi Service Agent ({clean_ip}). Agent sẽ tự động kéo file về thư mục '{clean_folder}' ngay khi tiếp nhận.",
                        target_ip=clean_ip,
                        target_folder=clean_folder,
                        filename=clean_file,
                        size_bytes=file_size,
                        elapsed_ms=elapsed,
                        delivery_channel="AGENT_SERVICE"
                    )
            except Exception as e_agent:
                err_detail = f"Lỗi gửi lệnh qua Service Agent: {e_agent}"
        else:
            err_detail = f"Không thể kết nối tới {clean_ip}:1433 (máy chưa cài SQL) và không tìm thấy Máy Chủ .11 ({_get_restaurant_server_ip(clean_ip)}) hoặc Service Agent Online."

    elapsed = round((time.time() - t0) * 1000, 1)

    if not success:
        return PushFileToRestaurantResponse(
            success=False,
            message=f"Lỗi truyền file xuống nhà hàng {clean_ip}: {err_detail}",
            target_ip=clean_ip,
            target_folder=clean_folder,
            filename=clean_file,
            size_bytes=0,
            elapsed_ms=elapsed,
            delivery_channel=delivery_channel
        )

    # 4. Tự động giải nén nếu có cờ auto_extract hoặc file là .zip
    exec_output = None
    _, f_type = get_file_type(clean_file)

    if auto_extract and f_type == "archive":
        logger.info(f"Tự động giải nén file '{clean_file}' tại '{clean_folder}'...")
        res_ext = execute_remote_action(
            target_ip=clean_ip,
            target_folder=clean_folder,
            filename=clean_file,
            action_type="EXTRACT_ARCHIVE",
            sql_port=sql_port
        )
        exec_output = f"[Giải Nén]: {res_ext.message}"

    elif execute_after_push:
        logger.info(f"Tự động thực thi file '{clean_file}' (run_mode={run_mode})...")
        action = "RUN_SCRIPT" if f_type == "script" else "LAUNCH_APP" if f_type == "executable" else "OPEN_DOCUMENT"
        res_act = execute_remote_action(
            target_ip=clean_ip,
            target_folder=clean_folder,
            filename=clean_file,
            action_type=action,
            run_mode=run_mode,
            sql_port=sql_port
        )
        exec_output = f"[Thực Thi]: {res_act.message} | {res_act.output}"

    channel_name = f" qua Cầu Nối .11 ({relay_server})" if is_relay else ""
    return PushFileToRestaurantResponse(
        success=True,
        message=f"Đã truyền thành công file '{clean_file}' ({format_size(written_size)}) xuống '{dest_path}'{channel_name} ({elapsed}ms)",
        target_ip=clean_ip,
        target_folder=clean_folder,
        filename=clean_file,
        size_bytes=written_size,
        elapsed_ms=elapsed,
        execution_output=exec_output,
        delivery_channel=delivery_channel
    )


# ==============================================================================
# BỘ CÔNG CỤ ĐIỀU KHIỂN & THỰC THI TỪ XA
# ==============================================================================

def execute_remote_action(
    target_ip: str,
    target_folder: str,
    filename: str,
    action_type: str,
    run_mode: str = "SILENT",
    arguments: Optional[str] = "",
    destination_folder: Optional[str] = None,
    sql_port: int = 1433
) -> ExecuteRemoteActionResponse:
    """
    Thực thi thao tác từ xa trên máy trạm nhà hàng:
    - RUN_SCRIPT: Chạy file .bat, .cmd, .ps1 (ngầm hoặc hiện cửa sổ interactive Desktop).
    - LAUNCH_APP: Khởi chạy file .exe.
    - EXTRACT_ARCHIVE: Giải nén file .zip, .rar, .7z.
    - OPEN_DOCUMENT: Mở tài liệu trên màn hình người dùng nhà hàng.
    - READ_TEXT: Đọc 100 dòng đầu file text/log chuẩn Unicode Base64 UTF-8.
    - DELETE_FILE: Xóa file khỏi máy trạm.
    """
    clean_ip = target_ip.strip()
    clean_folder = target_folder.strip().rstrip("\\/")
    clean_file = filename.strip()
    full_path = f"{clean_folder}\\{clean_file}"
    clean_args = (arguments or "").strip()

    t0 = time.time()
    act = action_type.upper().strip()

    # 1. Phân giải máy thực thi lệnh (Trực tiếp hay qua Relay .11)
    direct_open = _test_tcp_port(clean_ip, sql_port, timeout=1.5)
    exec_server_ip = clean_ip
    is_relay = False

    if not direct_open:
        server_11 = _get_restaurant_server_ip(clean_ip)
        if server_11 and server_11 != clean_ip and _test_tcp_port(server_11, sql_port, timeout=2.0):
            exec_server_ip = server_11
            is_relay = True

    pass_ou = _get_restaurant_ou_password(clean_ip) if is_relay else ""
    auth_script = f"""
if ('{pass_ou}') {{
    net use "\\\\{clean_ip}\\ipc$" /user:Administrator "{pass_ou}" 2>$null | Out-Null
}}
""" if is_relay else ""

    path_actual = _to_unc_path(clean_ip, full_path) if is_relay else full_path
    folder_actual = _to_unc_path(clean_ip, clean_folder) if is_relay else clean_folder

    # ── 1. CHẠY KỊCH BẢN (.bat, .cmd, .ps1) ──
    if act == "RUN_SCRIPT":
        is_interactive = (run_mode.upper() == "INTERACTIVE")
        if is_interactive and not is_relay:
            ps_script = f"""
$fullPath = "{path_actual}"
$dir = "{folder_actual}"
$argsStr = "{clean_args}"

$u = (Get-CimInstance Win32_ComputerSystem).UserName
if (-not $u) {{
    $line = (quser 2>$null | Select-String 'Active' | Out-String).Trim()
    if ($line) {{
        $u = (($line -replace '^>', '').Trim() -split '\\s+')[0]
    }}
}}
if (-not $u) {{ $u = 'Users' }}

$taskName = "IT_RemoteInteractive_" + (Get-Random -Maximum 99999)
$cmdArg = "/c start cmd.exe /c `"call `"`"$fullPath`"`" $argsStr & echo. & echo ========================================== & echo DA HOAN TAT KICH BAN TU XA & echo Cua so se tu dong dong sau 3 giay... & timeout /t 3 >nul`""
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $cmdArg -WorkingDirectory $dir
$principal = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest

try {{
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 2
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
    Write-Output "ACTION_RES|SUCCESS|0|Da kich hoat cua so tuong tac tren man hinh User ($u) thanh cong"
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""
        else:
            # Chạy ngầm (Silent / Background)
            if is_relay:
                ps_script = f"""
{auth_script}
try {{
    $cmd = "cmd.exe /c call `"{path_actual}`" {clean_args}"
    $res = (Get-WmiObject -List -ComputerName "{clean_ip}" -Namespace "root\\cimv2" | Where-Object {{ $_.Name -eq "Win32_Process" }}).Create($cmd, "D:\\Support")
    if ($res.ReturnValue -eq 0) {{
        Write-Output "ACTION_RES|SUCCESS|0|Da khoi chay kịch ban qua WMI LAN Relay (PID: $($res.ProcessId))"
    }} else {{
        Write-Output "ACTION_RES|FAILED|$($res.ReturnValue)|WMI Error: $($res.ReturnValue)"
    }}
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""
            else:
                ps_script = f"""
$fullPath = "{path_actual}"
$dir = "{folder_actual}"
$argsStr = "{clean_args}"

try {{
    $p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c call `"`"$fullPath`"`" $argsStr" -WorkingDirectory $dir -Wait -PassThru -WindowStyle Hidden
    Write-Output "ACTION_RES|SUCCESS|$($p.ExitCode)|Da thuc thi ngam thanh cong (ExitCode: $($p.ExitCode))"
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""

    # ── 2. KHỞI CHẠY ỨNG DỤNG (.exe) ──
    elif act == "LAUNCH_APP":
        if is_relay:
            ps_script = f"""
{auth_script}
try {{
    $cmd = "`"{path_actual}`" {clean_args}"
    $res = (Get-WmiObject -List -ComputerName "{clean_ip}" -Namespace "root\\cimv2" | Where-Object {{ $_.Name -eq "Win32_Process" }}).Create($cmd)
    if ($res.ReturnValue -eq 0) {{
        Write-Output "ACTION_RES|SUCCESS|0|Da khoi chay ung dung tu xa qua WMI LAN Relay (PID: $($res.ProcessId))"
    }} else {{
        Write-Output "ACTION_RES|FAILED|$($res.ReturnValue)|WMI Error: $($res.ReturnValue)"
    }}
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""
        else:
            ps_script = f"""
$fullPath = "{path_actual}"
$dir = "{folder_actual}"
$argsStr = "{clean_args}"

try {{
    $p = Start-Process -FilePath $fullPath -ArgumentList $argsStr -WorkingDirectory $dir -PassThru
    Write-Output "ACTION_RES|SUCCESS|0|Da khoi chay ung dung '$($p.ProcessName)' thanh cong (PID: $($p.Id))"
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""

    # ── 3. GIẢI NÉN FILE NÉN (.zip, .rar, .7z) ──
    elif act == "EXTRACT_ARCHIVE":
        dest_raw = (destination_folder or clean_folder).strip().rstrip("\\/")
        dest_extract = _to_unc_path(clean_ip, dest_raw) if is_relay else dest_raw
        ps_script = f"""
{auth_script}
$fullPath = "{path_actual}"
$dest = "{dest_extract}"

if (-not (Test-Path -LiteralPath $dest)) {{
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}}

try {{
    if ($fullPath.ToLower().EndsWith(".zip")) {{
        Expand-Archive -LiteralPath $fullPath -DestinationPath $dest -Force -ErrorAction Stop
        Write-Output "ACTION_RES|SUCCESS|0|Da giai nen ZIP thanh cong vao '$dest'"
    }} else {{
        tar -xf "$fullPath" -C "$dest"
        Write-Output "ACTION_RES|SUCCESS|0|Da giai nen file thanh cong vao '$dest' bang tar"
    }}
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""

    # ── 4. MỞ FILE TÀI LIỆU TRÊN MÀN HÌNH USER (.txt, .doc, .docx, .pdf...) ──
    elif act == "OPEN_DOCUMENT":
        ps_script = f"""
$fullPath = "{path_actual}"
$dir = "{folder_actual}"

$u = (Get-CimInstance Win32_ComputerSystem).UserName
if (-not $u) {{
    $line = (quser 2>$null | Select-String 'Active' | Out-String).Trim()
    if ($line) {{
        $u = (($line -replace '^>', '').Trim() -split '\\s+')[0]
    }}
}}
if (-not $u) {{ $u = 'Users' }}

$taskName = "IT_DocOpen_" + (Get-Random -Maximum 99999)
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c start `"`" `"`"$fullPath`"`"" -WorkingDirectory $dir
$principal = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest

try {{
    Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Force | Out-Null
    Start-ScheduledTask -TaskName $taskName
    Start-Sleep -Seconds 1
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
    Write-Output "ACTION_RES|SUCCESS|0|Da mo tai lieu tren man hinh Desktop cua nguoi dung ($u)"
}} catch {{
    Write-Output "ACTION_RES|FAILED|1|$($_.Exception.Message)"
}}
"""

    # ── 5. ĐỌC NỘI DUNG TEXT / LOG (CHUẨN UNICODE UTF-8 BASE64) ──
    elif act == "READ_TEXT":
        ps_script = f"""
{auth_script}
$fullPath = "{path_actual}"
if (Test-Path -LiteralPath $fullPath) {{
    try {{
        $lines = Get-Content -LiteralPath $fullPath -TotalCount 100 -Encoding UTF8 -ErrorAction Stop
        $text = $lines -join "`r`n"
        $b64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($text))
        Write-Output "ACTION_RES_B64|SUCCESS|0|$b64"
    }} catch {{
        $rawBytes = [System.IO.File]::ReadAllBytes($fullPath)
        $b64 = [Convert]::ToBase64String($rawBytes)
        Write-Output "ACTION_RES_B64|SUCCESS|0|$b64"
    }}
}} else {{
    Write-Output "ACTION_RES|FAILED|1|File khong ton tai tren may tram"
}}
"""

    # ── 6. XÓA FILE KHỎI MÁY TRẠM ──
    elif act == "DELETE_FILE":
        ps_script = f"""
{auth_script}
$fullPath = "{path_actual}"
if (Test-Path -LiteralPath $fullPath) {{
    Remove-Item -LiteralPath $fullPath -Force -Recurse -ErrorAction Stop
    Write-Output "ACTION_RES|SUCCESS|0|Da xoa file '$fullPath' khoi may tram"
}} else {{
    Write-Output "ACTION_RES|SUCCESS|0|File khong con ton tai tren may tram"
}}
"""
    else:
        return ExecuteRemoteActionResponse(
            success=False,
            message=f"Hành động '{act}' không được hỗ trợ",
            action_type=act,
            target_ip=clean_ip,
            target_file=full_path,
            output="",
            exit_code=1,
            elapsed_ms=0.0
        )

    try:
        lines = _exec_powershell_on_restaurant(exec_server_ip, ps_script, sql_port)
        elapsed = round((time.time() - t0) * 1000, 1)

        success = False
        exit_code = 0
        message = ""
        output_data = "\n".join(lines)

        for line in lines:
            if line.startswith("ACTION_RES_B64|"):
                parts = line.split("|", 3)
                if len(parts) >= 4:
                    success = (parts[1] == "SUCCESS")
                    exit_code = int(parts[2]) if parts[2].isdigit() else 0
                    b64_str = parts[3]
                    try:
                        decoded_text = base64.b64decode(b64_str).decode("utf-8", errors="replace")
                        message = decoded_text
                        output_data = decoded_text
                    except Exception:
                        message = b64_str
                    break
            elif line.startswith("ACTION_RES|"):
                parts = line.split("|", 3)
                if len(parts) >= 4:
                    success = (parts[1] == "SUCCESS")
                    exit_code = int(parts[2]) if parts[2].isdigit() else 0
                    message = parts[3]
                    break

        if not message:
            message = output_data if success else "Thực thi hoàn tất nhưng không nhận được thông báo"

        return ExecuteRemoteActionResponse(
            success=success,
            message=message,
            action_type=act,
            target_ip=clean_ip,
            target_file=full_path,
            output=output_data,
            exit_code=exit_code,
            elapsed_ms=elapsed
        )
    except Exception as ex:
        elapsed = round((time.time() - t0) * 1000, 1)
        logger.error(f"Lỗi thực thi {act} trên {clean_ip}: {ex}")
        return ExecuteRemoteActionResponse(
            success=False,
            message=f"Lỗi thực thi từ xa: {ex}",
            action_type=act,
            target_ip=clean_ip,
            target_file=full_path,
            output=str(ex),
            exit_code=1,
            elapsed_ms=elapsed
        )
