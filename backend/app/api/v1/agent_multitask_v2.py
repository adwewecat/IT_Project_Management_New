# -*- coding: utf-8 -*-
"""
Router API cho phân hệ Agent Multitask 2 (Truyền file SFTP & Thực thi từ xa)
Được bảo vệ nghiêm ngặt: CHỈ dành riêng cho dung.nguyenanh và Super Admin.
"""

import time
import io
import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse

from app.api.deps import require_super_admin_or_dung
from app.schemas.auth import UserInfo
from app.schemas.agent_multitask_v2 import (
    SftpServerConfig,
    SftpListFilesRequest,
    SftpListFilesResponse,
    CheckRestaurantConnectionRequest,
    CheckRestaurantConnectionResponse,
    RestaurantFolderListRequest,
    RestaurantFolderListResponse,
    PushFileToRestaurantRequest,
    PushFileToRestaurantResponse,
    ExecuteRemoteActionRequest,
    ExecuteRemoteActionResponse
)
from app.services import agent_multitask_v2_service

logger = logging.getLogger("AgentMultitaskV2API")
router = APIRouter(prefix="/agent-multitask-v2", tags=["Agent Multitask 2"])


@router.get("/sftp/config", response_model=SftpServerConfig)
def get_sftp_config(
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Lấy thông tin cấu hình SFTP Server trung tâm.
    Chỉ tài khoản dung.nguyenanh và Super Admin mới có quyền truy cập.
    """
    return SftpServerConfig(
        host=agent_multitask_v2_service.DEFAULT_SFTP_HOST,
        port=agent_multitask_v2_service.DEFAULT_SFTP_PORT,
        username=agent_multitask_v2_service.DEFAULT_SFTP_USER,
        password=agent_multitask_v2_service.DEFAULT_SFTP_PASS,
        remote_path=agent_multitask_v2_service.DEFAULT_PRIMARY_PATH,
        fallback_path=agent_multitask_v2_service.DEFAULT_FALLBACK_PATH
    )


@router.post("/sftp/list-files", response_model=SftpListFilesResponse)
def list_sftp_files(
    payload: SftpListFilesRequest,
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Quét và liệt kê danh sách file từ thư mục SFTP Server tập trung.
    """
    try:
        res = agent_multitask_v2_service.list_sftp_files(
            host=payload.host,
            port=payload.port,
            username=payload.username,
            password=payload.password,
            remote_path=payload.remote_path
        )
        return res
    except Exception as ex:
        logger.error(f"Lỗi quét danh sách file SFTP: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi kết nối SFTP Server: {str(ex)}"
        )


@router.post("/sftp/upload-file")
async def upload_file_to_sftp(
    file: UploadFile = File(...),
    target_path: Optional[str] = Form(None),
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Tải file từ máy tính người dùng lên thư mục lưu trữ SFTP Server.
    """
    try:
        content = await file.read()
        res = agent_multitask_v2_service.upload_file_to_sftp(
            file_bytes=content,
            filename=file.filename or "uploaded_file.bin",
            target_path=target_path
        )
        return res
    except Exception as ex:
        logger.error(f"Lỗi tải file lên SFTP: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi tải file lên SFTP: {str(ex)}"
        )


@router.post("/restaurant/check-connection", response_model=CheckRestaurantConnectionResponse)
def check_restaurant_connection(
    payload: CheckRestaurantConnectionRequest,
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Kiểm tra tín hiệu kết nối tới máy trạm nhà hàng (Ping, SQL Server port 1433, xp_cmdshell).
    """
    try:
        return agent_multitask_v2_service.check_restaurant_connection(
            target_ip=payload.target_ip,
            sql_port=payload.sql_port
        )
    except Exception as ex:
        logger.error(f"Lỗi kiểm tra kết nối máy trạm {payload.target_ip}: {ex}")
        return CheckRestaurantConnectionResponse(
            target_ip=payload.target_ip,
            is_online=False,
            ping_ok=False,
            sql_ok=False,
            message=f"Lỗi kiểm tra kết nối: {ex}"
        )


@router.post("/restaurant/list-folder", response_model=RestaurantFolderListResponse)
def list_restaurant_folder(
    payload: RestaurantFolderListRequest,
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Liệt kê danh sách các file đang có thực tế tại thư mục máy trạm nhà hàng.
    """
    try:
        return agent_multitask_v2_service.list_restaurant_folder_files(
            target_ip=payload.target_ip,
            target_folder=payload.target_folder,
            sql_port=payload.sql_port
        )
    except Exception as ex:
        logger.error(f"Lỗi truy vấn thư mục trạm {payload.target_ip}: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi truy vấn thư mục nhà hàng: {str(ex)}"
        )


@router.post("/restaurant/push-file", response_model=PushFileToRestaurantResponse)
def push_file_to_restaurant(
    payload: PushFileToRestaurantRequest,
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Truyền 1 file từ SFTP Server 10.28.1.150 xuống thư mục máy trạm nhà hàng.
    Tự động tạo thư mục nếu chưa có.
    Hỗ trợ tùy chọn tự động giải nén hoặc tự động thực thi sau khi truyền.
    """
    try:
        return agent_multitask_v2_service.push_file_to_restaurant(
            target_ip=payload.target_ip,
            filename=payload.filename,
            target_folder=payload.target_folder,
            remote_sftp_path=payload.remote_sftp_path,
            overwrite=payload.overwrite,
            auto_extract=payload.auto_extract,
            execute_after_push=payload.execute_after_push,
            run_mode=payload.run_mode
        )
    except Exception as ex:
        logger.error(f"Lỗi truyền file {payload.filename} xuống {payload.target_ip}: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi truyền file xuống nhà hàng: {str(ex)}"
        )


@router.post("/restaurant/execute-action", response_model=ExecuteRemoteActionResponse)
def execute_remote_action(
    payload: ExecuteRemoteActionRequest,
    current_user: UserInfo = Depends(require_super_admin_or_dung)
):
    """
    Thực thi thao tác từ xa trên máy trạm nhà hàng:
    - RUN_SCRIPT: Chạy file .bat, .cmd, .ps1 (ngầm hoặc hiện cửa sổ Desktop).
    - LAUNCH_APP: Khởi chạy file .exe.
    - EXTRACT_ARCHIVE: Giải nén file .zip, .rar, .7z.
    - OPEN_DOCUMENT: Mở file .txt, .doc, .docx, .pdf trên màn hình người dùng.
    - READ_TEXT: Đọc 100 dòng đầu file text/log.
    - DELETE_FILE: Xóa file khỏi máy trạm.
    """
    try:
        return agent_multitask_v2_service.execute_remote_action(
            target_ip=payload.target_ip,
            target_folder=payload.target_folder,
            filename=payload.filename,
            action_type=payload.action_type,
            run_mode=payload.run_mode,
            arguments=payload.arguments,
            destination_folder=payload.destination_folder
        )
    except Exception as ex:
        logger.error(f"Lỗi thực thi {payload.action_type} trên {payload.target_ip}: {ex}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi thực thi từ xa: {str(ex)}"
        )


@router.get("/download-temp/{token}")
def download_temp_file(token: str):
    """
    Endpoint tải file tạm cho máy trạm nhà hàng khi truyền các file lớn (>3MB).
    Tự động hết hạn sau 10 phút.
    """
    clean_token = token.strip()
    entry = agent_multitask_v2_service.TEMP_FILE_CACHE.get(clean_token)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File không tồn tại hoặc phiên tải đã hết hạn")

    f_bytes, filename, expire_ts = entry
    if time.time() > expire_ts:
        agent_multitask_v2_service.TEMP_FILE_CACHE.pop(clean_token, None)
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Phiên tải file đã hết hạn")

    return StreamingResponse(
        io.BytesIO(f_bytes),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

