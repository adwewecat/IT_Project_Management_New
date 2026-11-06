# -*- coding: utf-8 -*-
"""
Schemas cho phân hệ Agent Multitask 2 (Hỗ trợ từ xa, truyền file qua SFTP & thực thi file từ xa)
Dành riêng cho dung.nguyenanh và Super Admin.
"""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class SftpServerConfig(BaseModel):
    """Cấu hình kết nối SFTP Server lưu trữ file tập trung."""
    host: str = Field(default="10.28.1.150", description="IP hoặc Hostname SFTP Server")
    port: int = Field(default=22, description="Cổng SSH/SFTP")
    username: str = Field(default="f_hcm", description="Tên đăng nhập SFTP")
    password: Optional[str] = Field(default="GP05@St0o4E", description="Mật khẩu SFTP (hoặc mask nếu trả về frontend)")
    remote_path: str = Field(default="/home/dung.na/Support", description="Đường dẫn thư mục chứa file cần truyền")
    fallback_path: str = Field(default="/home/f_hcm/Support", description="Đường dẫn thư mục dự phòng")


class SftpFileItem(BaseModel):
    """Thông tin 1 file trong thư mục SFTP Server."""
    filename: str
    size_bytes: int
    size_formatted: str
    modified_time: str
    is_dir: bool = False
    file_ext: str = ""
    file_type: str = "other"  # script, executable, archive, document, image, other


class SftpListFilesRequest(BaseModel):
    """Yêu cầu quét danh sách file trên SFTP Server."""
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    remote_path: Optional[str] = None


class SftpListFilesResponse(BaseModel):
    """Kết quả quét danh sách file trên SFTP Server."""
    success: bool
    message: str
    active_path: str
    host: str
    port: int
    files: List[SftpFileItem] = []
    total_files: int = 0
    total_size_bytes: int = 0


class CheckRestaurantConnectionRequest(BaseModel):
    """Kiểm tra tín hiệu kết nối tới máy trạm nhà hàng."""
    target_ip: str
    sql_port: int = 1433


class CheckRestaurantConnectionResponse(BaseModel):
    """Kết quả kiểm tra kết nối máy trạm (Hoàn toàn Agent-less qua SQL Server)."""
    target_ip: str
    is_online: bool
    ping_ok: bool
    sql_ok: bool
    sql_server_name: Optional[str] = None
    xp_cmdshell_ready: bool = False
    message: str
    latency_ms: float = 0.0
    connection_method: Optional[str] = "SQL_DIRECT"  # SQL_DIRECT, LAN_RELAY, FAILED
    relay_host: Optional[str] = None
    online_sql_ip: Optional[str] = None
    available_stations: Optional[List[Dict[str, Any]]] = None


class RestaurantFolderListRequest(BaseModel):
    """Yêu cầu liệt kê các file đang có trong thư mục nhà hàng."""
    target_ip: str
    target_folder: str = "D:\\GPOS-Setup"
    sql_port: int = 1433


class RestaurantFolderFileItem(BaseModel):
    """Thông tin 1 file trong thư mục máy trạm nhà hàng."""
    filename: str
    size_bytes: int
    size_formatted: str
    modified_time: str
    is_dir: bool = False
    file_ext: str = ""
    file_type: str = "other"


class RestaurantFolderListResponse(BaseModel):
    """Kết quả liệt kê file trong thư mục nhà hàng."""
    success: bool
    message: str
    target_ip: str
    target_folder: str
    folder_exists: bool
    files: List[RestaurantFolderFileItem] = []
    total_files: int = 0
    scan_method: Optional[str] = "SQL_DIRECT"  # SQL_DIRECT, LAN_RELAY, AGENT_SERVICE


class PushFileToRestaurantRequest(BaseModel):
    """Yêu cầu truyền file từ SFTP xuống thư mục nhà hàng."""
    target_ip: str
    target_folder: str = "D:\\GPOS-Setup"
    filename: str
    remote_sftp_path: Optional[str] = None
    overwrite: bool = True
    auto_extract: bool = False
    execute_after_push: bool = False
    run_mode: str = "SILENT"  # SILENT hoặc INTERACTIVE


class PushFileToRestaurantResponse(BaseModel):
    """Kết quả truyền file xuống nhà hàng."""
    success: bool
    message: str
    target_ip: str
    target_folder: str
    filename: str
    size_bytes: int = 0
    elapsed_ms: float = 0.0
    execution_output: Optional[str] = None
    delivery_channel: Optional[str] = "SQL_DIRECT"  # SQL_DIRECT, LAN_RELAY, AGENT_SERVICE


class ExecuteRemoteActionRequest(BaseModel):
    """Yêu cầu thực thi thao tác từ xa trên máy trạm nhà hàng."""
    target_ip: str
    target_folder: str = "D:\\GPOS-Setup"
    filename: str
    action_type: str  # RUN_SCRIPT, LAUNCH_APP, EXTRACT_ARCHIVE, OPEN_DOCUMENT, DELETE_FILE, READ_TEXT
    run_mode: str = "SILENT"  # SILENT (ngầm) hoặc INTERACTIVE (hiện trên màn hình)
    arguments: Optional[str] = ""
    destination_folder: Optional[str] = None  # Dùng khi giải nén


class ExecuteRemoteActionResponse(BaseModel):
    """Kết quả thực thi thao tác từ xa."""
    success: bool
    message: str
    action_type: str
    target_ip: str
    target_file: str
    output: str = ""
    exit_code: int = 0
    elapsed_ms: float = 0.0

