from typing import Optional
from pydantic import BaseModel, Field


class DBConfigResponse(BaseModel):
    server: str
    port: int
    db_name: str
    trusted_connection: bool
    db_user: Optional[str] = None
    db_password: Optional[str] = None
    has_password: bool = False
    odbc_driver: str

    trust_server_certificate: str
    is_connected: bool



class DBTestConnectionRequest(BaseModel):
    server: str = Field(..., description="Địa chỉ máy chủ SQL Server (IP hoặc Hostname)")
    port: int = Field(1433, description="Cổng port kết nối SQL Server")
    db_name: str = Field(..., description="Tên Database (ví dụ: ITDEPT)")
    trusted_connection: bool = Field(True, description="Sử dụng Windows Authentication")
    db_user: Optional[str] = Field(None, description="Tên đăng nhập SQL Server nếu không dùng Trusted")
    db_password: Optional[str] = Field(None, description="Mật khẩu SQL Server nếu không dùng Trusted")
    odbc_driver: Optional[str] = Field("ODBC Driver 18 for SQL Server", description="Tên ODBC Driver")
    trust_server_certificate: Optional[str] = Field("yes", description="Bỏ qua kiểm tra chứng chỉ SSL")


class DBTestConnectionResponse(BaseModel):
    success: bool
    message: str
    error_detail: Optional[str] = None


class DBConfigUpdateRequest(BaseModel):
    server: str = Field(..., description="Địa chỉ máy chủ SQL Server mới")
    port: int = Field(1433, description="Cổng port kết nối SQL Server mới")
    db_name: str = Field(..., description="Tên Database mới")
    trusted_connection: bool = Field(True, description="Sử dụng Windows Authentication")
    db_user: Optional[str] = Field(None, description="Tên đăng nhập SQL Server nếu không dùng Trusted")
    db_password: Optional[str] = Field(None, description="Mật khẩu SQL Server mới (nếu để trống giữ nguyên mật khẩu cũ)")
    odbc_driver: Optional[str] = Field("ODBC Driver 18 for SQL Server", description="Tên ODBC Driver")
    trust_server_certificate: Optional[str] = Field("yes", description="Bỏ qua kiểm tra chứng chỉ SSL")
