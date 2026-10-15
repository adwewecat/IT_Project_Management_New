from __future__ import annotations
import os
import zipfile
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.agent_multitask import (
    AgentConfigResponse,
    AgentConfigUpdateRequest,
    AgentEndpointItem,
    AgentEndpointCreateRequest,
    AgentOverviewResponse,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentHeartbeatRequest,
    AgentLogItem
)
from app.services.agent_multitask_service import AgentMultitaskService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent-multitask", tags=["Agent Multitask"])


def is_super_admin(user: UserInfo) -> bool:
    """Kiểm tra user có quyền Super Admin hay không."""
    if user.is_super_admin:
        return True
    u = (user.username or "").strip().lower()
    if u in ["admin", "administrator", "dung.nguyenanh"]:
        return True
    if str(user.phanquyen or "").strip() == "0":
        return True
    role = (user.role_name or "").lower()
    return "super admin" in role or "supper admin" in role


@router.get("/overview", response_model=AgentOverviewResponse)
def get_overview(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy tổng quan tình trạng dịch vụ MicrosoftEdgeServicess & quyền truy cập."""
    is_super = is_super_admin(current_user)
    return AgentMultitaskService.get_overview(
        username=current_user.username or "",
        is_super_admin=is_super,
        db=db
    )


@router.get("/endpoints", response_model=List[AgentEndpointItem])
def get_endpoints(
    status_filter: Optional[str] = Query(None, description="Trạng thái ONLINE, OFFLINE, RUNNING, STOPPED"),
    installed_filter: Optional[str] = Query(None, description="Tình trạng cài đặt INSTALLED, NOT_INSTALLED"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã, tên nhà hàng, IP"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Lấy danh sách các nhà hàng kèm trạng thái service.
    Nếu người dùng chưa được phân quyền, chặn truy cập dữ liệu máy trạm.
    """
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa được cấp quyền sử dụng tính năng Agent Multitask."
        )

    return AgentMultitaskService.get_endpoints(
        status_filter=status_filter,
        installed_filter=installed_filter,
        search=search,
        db=db
    )


@router.post("/endpoint", response_model=AgentEndpointItem)
def create_endpoint(
    payload: AgentEndpointCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Thêm mới máy ngoài (Laptop HO, máy IT, server phụ...) hoặc máy user quản lý từ xa.
    """
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền thêm thiết bị vào Agent Multitask."
        )

    return AgentMultitaskService.create_endpoint(payload=payload, db=db)


@router.get("/config", response_model=AgentConfigResponse)
def get_config(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy cấu hình Agent Multitask & thông tin user/pass admin mặc định."""
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa được cấp quyền cấu hình Agent Multitask."
        )

    config = AgentMultitaskService.get_or_create_config(db)
    return AgentConfigResponse(
        id=config.id,
        service_name=config.service_name,
        default_admin_user=config.default_admin_user,
        default_admin_pass=config.default_admin_pass,
        allowed_users=config.allowed_users,
        auto_restart_on_failure=config.auto_restart_on_failure,
        startup_type=config.startup_type,
        heartbeat_interval_sec=config.heartbeat_interval_sec,
        nguoi_cap_nhat=config.nguoi_cap_nhat,
        ngay_cap_nhat=config.ngay_cap_nhat
    )


@router.post("/config", response_model=AgentConfigResponse)
def update_config(
    payload: AgentConfigUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Cập nhật cấu hình Agent & phân quyền user cụ thể (CHỈ SUPER ADMIN)."""
    if not is_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Super Admin mới có quyền cập nhật cấu hình và phân quyền Agent Multitask."
        )

    return AgentMultitaskService.update_config(
        payload=payload,
        username=current_user.username or "super_admin",
        db=db
    )


@router.post("/command", response_model=AgentCommandResponse)
def execute_command(
    payload: AgentCommandRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Thực thi lệnh điều khiển từ xa:
    - Bật/Tắt/Khởi động lại service MicrosoftEdgeServicess
    - Truyền file update xuống folder chỉ định
    - Chạy/Tắt tiến trình trên máy khách
    - Cài đặt app theo các bước cấu hình
    """
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền gửi lệnh điều khiển từ xa."
        )

    return AgentMultitaskService.execute_command(
        payload=payload,
        current_username=current_user.username or "admin",
        db=db
    )


@router.post("/heartbeat")
def heartbeat(
    payload: AgentHeartbeatRequest,
    db: Session = Depends(get_db)
):
    """Endpoint nhận heartbeat từ Service MicrosoftEdgeServicess dưới máy trạm nhà hàng."""
    return AgentMultitaskService.process_heartbeat(payload=payload, db=db)


@router.get("/logs", response_model=List[AgentLogItem])
def get_logs(
    restaurant_code: Optional[str] = Query(None, description="Lọc theo mã nhà hàng"),
    limit: int = Query(100, ge=1, le=1000, description="Số lượng log tối đa"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách nhật ký các thao tác điều khiển từ xa."""
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền xem logs Agent Multitask."
        )

    return AgentMultitaskService.get_logs(restaurant_code=restaurant_code, limit=limit, db=db)


@router.get("/poll-tasks")
def poll_tasks(
    restaurant_code: str = Query(..., description="Mã nhà hàng đang yêu cầu kiểm tra tác vụ"),
    db: Session = Depends(get_db)
):
    """
    Endpoint cho Client Agent (MicrosoftEdgeServicess) gọi định kỳ để lấy lệnh từ xa đang PENDING.
    """
    return AgentMultitaskService.poll_pending_tasks(restaurant_code=restaurant_code, db=db)


@router.post("/report-task-result")
def report_task_result(
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Endpoint cho Client Agent báo cáo kết quả thực thi lệnh về Server.
    """
    task_id = int(payload.get("task_id") or 0)
    restaurant_code = str(payload.get("restaurant_code") or "")
    status_val = str(payload.get("status") or "SUCCESS")
    message = str(payload.get("message") or "")
    output = payload.get("output")

    return AgentMultitaskService.report_task_result(
        task_id=task_id,
        restaurant_code=restaurant_code,
        status_val=status_val,
        message=message,
        output=output,
        db=db
    )


@router.get("/download-package")
def download_package(
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Tải gói cài đặt toàn diện Client Agent (.ZIP) cho máy trạm nhà hàng.
    """
    # Đường dẫn thư mục tools/restaurant_support_agent
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    agent_dir = os.path.join(project_root, "tools", "restaurant_support_agent")
    zip_path = os.path.join(project_root, "tools", "Restaurant_Support_Agent_Full.zip")

    # Tự động nén lại nếu zip chưa có hoặc có file mới
    if os.path.exists(agent_dir):
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for f in os.listdir(agent_dir):
                fp = os.path.join(agent_dir, f)
                if os.path.isfile(fp):
                    z.write(fp, arcname=f)

    if not os.path.exists(zip_path) or os.path.getsize(zip_path) < 100:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa tìm thấy gói cài đặt Restaurant_Support_Agent_Full.zip."
        )

    return FileResponse(
        path=zip_path,
        filename="Restaurant_Support_Agent_Full.zip",
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=Restaurant_Support_Agent_Full.zip"}
    )
