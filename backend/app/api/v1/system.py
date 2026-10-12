import logging
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import require_super_admin
from app.core.config import settings, save_database_config_to_env
from app.core.database import test_db_connection, reload_db_engine, test_custom_connection
from app.schemas.auth import UserInfo
from app.schemas.system import (
    DBConfigResponse,
    DBTestConnectionRequest,
    DBTestConnectionResponse,
    DBConfigUpdateRequest
)

logger = logging.getLogger("app.system")

router = APIRouter(prefix="/system", tags=["System Configuration"])


@router.get("/db-config", response_model=DBConfigResponse)
def get_db_configuration(
    current_user: UserInfo = Depends(require_super_admin)
):
    """
    Lấy thông tin cấu hình kết nối Database hiện tại.
    """
    is_connected = test_db_connection()
    return DBConfigResponse(
        server=settings.DB_SERVER,
        port=settings.DB_PORT,
        db_name=settings.DB_NAME,
        trusted_connection=settings.DB_TRUSTED_CONNECTION,
        db_user=settings.DB_USER or "itapp",
        db_password=settings.DB_PASSWORD or "",
        has_password=bool(settings.DB_PASSWORD),
        odbc_driver=settings.ODBC_DRIVER,
        trust_server_certificate=settings.DB_TRUST_SERVER_CERTIFICATE,
        is_connected=is_connected
    )




@router.post("/test-db-connection", response_model=DBTestConnectionResponse)
def test_database_connection(
    payload: DBTestConnectionRequest,
    current_user: UserInfo = Depends(require_super_admin)
):
    """
    Kiểm tra thử thông số kết nối Database trước khi lưu.
    """
    # Nếu SQL Auth mà không nhập password, kiểm tra xem có dùng password hiện tại không
    db_password = payload.db_password
    if not payload.trusted_connection and not db_password and payload.db_user == settings.DB_USER:
        db_password = settings.DB_PASSWORD

    success, message = test_custom_connection(
        server=payload.server,
        port=payload.port,
        db_name=payload.db_name,
        trusted_connection=payload.trusted_connection,
        db_user=payload.db_user or "",
        db_password=db_password or "",
        odbc_driver=payload.odbc_driver or settings.ODBC_DRIVER,
        trust_server_certificate=payload.trust_server_certificate or "yes"
    )

    return DBTestConnectionResponse(
        success=success,
        message="Kết nối cơ sở dữ liệu thành công!" if success else "Không thể kết nối tới cơ sở dữ liệu.",
        error_detail=None if success else message
    )


@router.put("/db-config")
def update_database_configuration(
    payload: DBConfigUpdateRequest,
    current_user: UserInfo = Depends(require_super_admin)
):
    """
    Cập nhật cấu hình Database:
    1. Kiểm tra kết nối trước
    2. Lưu cấu hình vào file backend/.env
    3. Tải lại SQLAlchemy engine trong bộ nhớ runtime
    """
    db_password = payload.db_password
    if not payload.trusted_connection and not db_password and payload.db_user == settings.DB_USER:
        db_password = settings.DB_PASSWORD

    # Test connection first to prevent saving bad configuration
    success, error_msg = test_custom_connection(
        server=payload.server,
        port=payload.port,
        db_name=payload.db_name,
        trusted_connection=payload.trusted_connection,
        db_user=payload.db_user or "",
        db_password=db_password or "",
        odbc_driver=payload.odbc_driver or settings.ODBC_DRIVER,
        trust_server_certificate=payload.trust_server_certificate or "yes"
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kiểm tra kết nối thất bại: {error_msg}. Cấu hình chưa được lưu."
        )

    # Save to .env and settings in-memory
    save_database_config_to_env(
        server=payload.server,
        port=payload.port,
        db_name=payload.db_name,
        trusted_connection=payload.trusted_connection,
        db_user=payload.db_user or "",
        db_password=db_password or "",
        odbc_driver=payload.odbc_driver or settings.ODBC_DRIVER,
        trust_server_certificate=payload.trust_server_certificate or "yes"
    )

    # Reload SQLAlchemy engine runtime
    reconnected = reload_db_engine()

    logger.info("Super Admin '%s' đã cập nhật cấu hình DB thành công: %s:%s (DB: %s)", current_user.username, payload.server, payload.port, payload.db_name)

    return {
        "success": True,
        "message": f"Cập nhật cấu hình máy chủ DB thành công ({payload.server}:{payload.port} / {payload.db_name})!",
        "is_connected": reconnected
    }
