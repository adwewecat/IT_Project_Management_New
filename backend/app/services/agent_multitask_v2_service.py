# -*- coding: utf-8 -*-
"""
================================================================================
SERVICE PHÂN HỆ AGENT MULTITASK 2 (HỖ TRỢ TỪ XA QUA SFTP & THỰC THI FILE TỪ XA)
================================================================================
Tính năng:
1. Kết nối SFTP Server tập trung (10.28.1.150:22 - f_hcm) liệt kê, upload và tải file.
2. Truyền file từ SFTP xuống bất kỳ máy trạm nhà hàng (nhập/dán đường dẫn tùy ý).
3. Hỗ trợ đầy đủ các thao tác từ xa:
   - Chạy kịch bản .bat, .cmd, .ps1 (chạy ngầm hoặc chạy hiện cửa sổ Desktop).
   - Khởi chạy ứng dụng .exe.
   - Giải nén file nén .zip, .rar, .7z.
   - Mở file tài liệu .txt, .doc, .docx, .pdf trên màn hình người dùng nhà hàng.
   - Đọc nội dung file log/text từ xa.
   - Xóa file/dọn dẹp từ xa.
4. Tương thích 100% với các máy trạm qua SQL Server xp_cmdshell và Client Agent.
Dành riêng cho dung.nguyenanh và Super Admin.
================================================================================
"""

import os
import io
import time
import uuid
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
    elif ext in [".txt", ".log", ".doc", ".docx", ".xls", ".xlsx", ".pdf", ".rtf", ".csv", ".json", ".xml", ".ini", ".conf"]:
        return ext, "document"
    elif ext in [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".ico", ".webp"]:
        return ext, "image"
    else:
        return ext, "other"


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
                except Exception as e_fb:
                    # Nếu cả 2 đều chưa có, tự động tạo thư mục fallback
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
            # Bỏ qua các mục ẩn . và ..
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

        # Sắp xếp: file script và executable lên đầu, sau đó theo tên
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

        # Kiểm tra xem dest_dir có tồn tại không, nếu không chuyển sang fallback
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


def check_restaurant_connection(
    target_ip: str,
    sql_port: int = 1433
) -> CheckRestaurantConnectionResponse:
    """
    Kiểm tra tín hiệu kết nối tới máy trạm nhà hàng qua Ping socket và SQL Server port 1433.
    """
    clean_ip = target_ip.strip()
    if not clean_ip:
        return CheckRestaurantConnectionResponse(
            target_ip=clean_ip,
            is_online=False,
            ping_ok=False,
            sql_ok=False,
            message="Chưa nhập địa chỉ IP máy trạm nhà hàng"
        )

    t0 = time.time()
    # 1. Kiểm tra Ping TCP Socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2.0)
    res_sock = sock.connect_ex((clean_ip, sql_port))
    sock.close()
    latency = round((time.time() - t0) * 1000, 1)

    if res_sock != 0:
        return CheckRestaurantConnectionResponse(
            target_ip=clean_ip,
            is_online=False,
            ping_ok=False,
            sql_ok=False,
            message=f"Không thể kết nối tới {clean_ip}:{sql_port} (Port đóng hoặc trạm offline)",
            latency_ms=latency
        )

    # 2. Kiểm tra SQL Server & xp_cmdshell
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

                # Thử bật xp_cmdshell nếu chưa bật
                try:
                    cur.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                    cur.execute("EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;")
                    xp_cmdshell_ready = True
                except Exception:
                    # Kiểm tra lại xem có chạy được xp_cmdshell không
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
            message=f"Kết nối thành công tới SQL Server {sql_server_name or clean_ip} ({latency}ms). xp_cmdshell: {'Sẵn sàng' if xp_cmdshell_ready else 'Chưa cấp phép'}",
            latency_ms=latency
        )
    except Exception as e_sql:
        return CheckRestaurantConnectionResponse(
            target_ip=clean_ip,
            is_online=True,
            ping_ok=True,
            sql_ok=False,
            message=f"Port {sql_port} mở nhưng không thể đăng nhập SQL Server rk7/rk7: {e_sql}",
            latency_ms=latency
        )


def _exec_powershell_on_restaurant(
    target_ip: str,
    powershell_code: str,
    sql_port: int = 1433,
    timeout_sec: int = 30
) -> List[str]:
    """
    Thực thi một đoạn mã PowerShell an toàn trên máy trạm nhà hàng qua SQL Server xp_cmdshell.
    Tự động mã hóa Base64 UTF-16LE (-EncodedCommand) để triệt tiêu 100% lỗi cú pháp và quote dấu ngoặc.
    """
    clean_ip = target_ip.strip()
    conn_str = f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={clean_ip},{sql_port};DATABASE=master;UID=rk7;PWD=rk7;TrustServerCertificate=yes;"

    enc = base64.b64encode(powershell_code.encode("utf-16le")).decode("ascii")
    output_lines: List[str] = []

    with pyodbc.connect(conn_str, timeout=timeout_sec, autocommit=True) as conn:
        with conn.cursor() as cur:
            # Đảm bảo xp_cmdshell được kích hoạt
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
                    # Lọc bỏ các thẻ CLIXML progress rác của PowerShell
                    if not line.startswith("<") and not line.startswith("#<") and "System.Management.Automation" not in line:
                        output_lines.append(line)

    return output_lines


def list_restaurant_folder_files(
    target_ip: str,
    target_folder: str = "D:\\Support",
    sql_port: int = 1433
) -> RestaurantFolderListResponse:
    """
    Quét danh sách các file đang có thực tế tại thư mục máy trạm nhà hàng.
    """
    clean_ip = target_ip.strip()
    clean_folder = target_folder.strip().rstrip("\\/")

    ps_code = f"""
$folder = "{clean_folder}"
if (Test-Path -LiteralPath $folder) {{
    Write-Output "FOLDER_EXISTS|1"
    Get-ChildItem -LiteralPath $folder -File -ErrorAction SilentlyContinue | ForEach-Object {{
        $ext = $_.Extension
        $len = $_.Length
        $mod = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        Write-Output "ITEM|$($_.Name)|$len|$mod"
    }}
}} else {{
    Write-Output "FOLDER_EXISTS|0"
}}
"""
    try:
        lines = _exec_powershell_on_restaurant(clean_ip, ps_code, sql_port)
        folder_exists = False
        files: List[RestaurantFolderFileItem] = []

        for line in lines:
            if line.startswith("FOLDER_EXISTS|"):
                folder_exists = (line.split("|")[1] == "1")
            elif line.startswith("ITEM|"):
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

        msg = f"Đã quét thành công {len(files)} tệp tin tại thư mục '{clean_folder}'" if folder_exists else f"Thư mục '{clean_folder}' chưa tồn tại dưới máy trạm (sẽ được tự động tạo khi truyền file)"

        return RestaurantFolderListResponse(
            success=True,
            message=msg,
            target_ip=clean_ip,
            target_folder=clean_folder,
            folder_exists=folder_exists,
            files=files,
            total_files=len(files)
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
            total_files=0
        )


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
    """
    Tải file từ SFTP Server 10.28.1.150 và truyền trực tiếp xuống thư mục máy trạm nhà hàng.
    Tự động tạo thư mục nếu chưa có.
    Hỗ trợ tự động giải nén (nếu là file zip) và tự động thực thi sau khi truyền.
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

    # 2. Truyền file xuống máy trạm nhà hàng
    # Với file <= 3MB: Nén base64 và đẩy thẳng qua PowerShell chunking (Không cần mở cổng HTTP download!)
    if file_size <= 3 * 1024 * 1024:
        b64_content = base64.b64encode(file_bytes).decode("ascii")
        ps_push = f"""
$folder = "{clean_folder}"
if (-not (Test-Path -LiteralPath $folder)) {{
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}}
$dest = "{dest_path}"
$b64 = "{b64_content}"
$bytes = [Convert]::FromBase64String($b64)
[IO.File]::WriteAllBytes($dest, $bytes)

if (Test-Path -LiteralPath $dest) {{
    $len = (Get-Item -LiteralPath $dest).Length
    Write-Output "PUSH_RESULT|SUCCESS|$len"
}} else {{
    Write-Output "PUSH_RESULT|FAILED|0|File not saved"
}}
"""
        lines = _exec_powershell_on_restaurant(clean_ip, ps_push, sql_port)
    else:
        # Với file lớn > 3MB: Lưu vào TEMP_FILE_CACHE và cho máy trạm tải qua HTTP endpoint nội bộ
        token = str(uuid.uuid4())
        # Cache trong 10 phút
        TEMP_FILE_CACHE[token] = (file_bytes, clean_file, time.time() + 600)

        # Lấy IP local của server trung tâm để máy trạm download
        server_ip = "172.16.8.25"
        dl_url = f"http://{server_ip}:8000/api/v1/agent-multitask-v2/download-temp/{token}"

        ps_push = f"""
$folder = "{clean_folder}"
if (-not (Test-Path -LiteralPath $folder)) {{
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
}}
$dest = "{dest_path}"
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {{$true}}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls
try {{
    (New-Object System.Net.WebClient).DownloadFile('{dl_url}', $dest)
    if (Test-Path -LiteralPath $dest) {{
        $len = (Get-Item -LiteralPath $dest).Length
        Write-Output "PUSH_RESULT|SUCCESS|$len"
    }} else {{
        Write-Output "PUSH_RESULT|FAILED|0|File not found after download"
    }}
}} catch {{
    Write-Output "PUSH_RESULT|FAILED|0|$($_.Exception.Message)"
}}
"""
        lines = _exec_powershell_on_restaurant(clean_ip, ps_push, sql_port, timeout_sec=120)

    # 3. Phân tích kết quả truyền file
    success = False
    written_size = 0
    err_detail = "Không nhận được phản hồi từ máy trạm"

    for line in lines:
        if line.startswith("PUSH_RESULT|"):
            parts = line.split("|")
            if len(parts) >= 3 and parts[1] == "SUCCESS":
                success = True
                written_size = int(parts[2]) if parts[2].isdigit() else file_size
                break
            elif len(parts) >= 4:
                err_detail = parts[3]

    elapsed = round((time.time() - t0) * 1000, 1)

    if not success:
        return PushFileToRestaurantResponse(
            success=False,
            message=f"Lỗi truyền file xuống nhà hàng {clean_ip}: {err_detail}",
            target_ip=clean_ip,
            target_folder=clean_folder,
            filename=clean_file,
            size_bytes=0,
            elapsed_ms=elapsed
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

    return PushFileToRestaurantResponse(
        success=True,
        message=f"Đã truyền thành công file '{clean_file}' ({format_size(written_size)}) xuống '{dest_path}' ({elapsed}ms)",
        target_ip=clean_ip,
        target_folder=clean_folder,
        filename=clean_file,
        size_bytes=written_size,
        elapsed_ms=elapsed,
        execution_output=exec_output
    )


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
    - READ_TEXT: Đọc 100 dòng đầu file text/log.
    - DELETE_FILE: Xóa file khỏi máy trạm.
    """
    clean_ip = target_ip.strip()
    clean_folder = target_folder.strip().rstrip("\\/")
    clean_file = filename.strip()
    full_path = f"{clean_folder}\\{clean_file}"
    clean_args = (arguments or "").strip()

    t0 = time.time()
    act = action_type.upper().strip()

    # ── 1. CHẠY KỊCH BẢN (.bat, .cmd, .ps1) ──
    if act == "RUN_SCRIPT":
        is_interactive = (run_mode.upper() == "INTERACTIVE")
        if is_interactive:
            # Hiện cửa sổ tương tác trên màn hình Desktop của người dùng nhà hàng qua Scheduled Task Interactive
            ps_script = f"""
$fullPath = "{full_path}"
$dir = "{clean_folder}"
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
$cmdArg = "/c start cmd.exe /c `"call `"`"$fullPath`"`" $argsStr & echo. & echo ========================================== & echo DA HOAN TAT KICH BAN TU XA & echo Cua so se tu dong dong sau 5 giay... & timeout /t 5 >nul`""
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
            # Chạy ngầm 100% (Silent / Background), ghi output trả về
            ps_script = f"""
$fullPath = "{full_path}"
$dir = "{clean_folder}"
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
        ps_script = f"""
$fullPath = "{full_path}"
$dir = "{clean_folder}"
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
        dest_extract = (destination_folder or clean_folder).strip().rstrip("\\/")
        ps_script = f"""
$fullPath = "{full_path}"
$dest = "{dest_extract}"

if (-not (Test-Path -LiteralPath $dest)) {{
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
}}

try {{
    if ($fullPath.ToLower().EndsWith(".zip")) {{
        Expand-Archive -LiteralPath $fullPath -DestinationPath $dest -Force -ErrorAction Stop
        Write-Output "ACTION_RES|SUCCESS|0|Da giai nen ZIP thanh cong vao '$dest'"
    }} else {{
        # Try tar for other archives
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
$fullPath = "{full_path}"
$dir = "{clean_folder}"

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

    # ── 5. ĐỌC NỘI DUNG TEXT / LOG ──
    elif act == "READ_TEXT":
        ps_script = f"""
$fullPath = "{full_path}"
if (Test-Path -LiteralPath $fullPath) {{
    $content = Get-Content -LiteralPath $fullPath -TotalCount 100 -Encoding UTF8 -ErrorAction SilentlyContinue | Out-String
    Write-Output "ACTION_RES|SUCCESS|0|$content"
}} else {{
    Write-Output "ACTION_RES|FAILED|1|File khong ton tai tren may tram"
}}
"""

    # ── 6. XÓA FILE KHỎI MÁY TRẠM ──
    elif act == "DELETE_FILE":
        ps_script = f"""
$fullPath = "{full_path}"
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
        lines = _exec_powershell_on_restaurant(clean_ip, ps_script, sql_port)
        elapsed = round((time.time() - t0) * 1000, 1)

        success = False
        exit_code = 0
        message = ""
        output_data = "\n".join(lines)

        for line in lines:
            if line.startswith("ACTION_RES|"):
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

