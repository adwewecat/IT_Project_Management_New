from __future__ import annotations
import os
import zipfile
import io
import json
import logging
import shutil
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.models.agent_multitask import (
    AgentMultitaskLog,
    AgentMultitaskEndpoint,
    AgentMultitaskConfig
)
from app.schemas.agent_multitask import (
    AgentConfigResponse,
    AgentConfigUpdateRequest,
    AgentEndpointItem,
    AgentEndpointCreateRequest,
    AgentEndpointUpdateRequest,
    AgentOverviewResponse,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentHeartbeatRequest,
    AgentLogItem,
    AgentScriptTemplateItem,
    AgentScriptTemplateCreate,
    AgentScriptTemplateUpdate
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


@router.put("/endpoint/{id}", response_model=AgentEndpointItem)
def update_endpoint(
    id: int,
    payload: AgentEndpointUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Cập nhật thông tin máy trạm / thiết bị (Tên thiết bị, Hostname máy, Mã, IP, Phân loại, User phụ trách, Ghi chú).
    """
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền chỉnh sửa thông tin thiết bị Agent Multitask."
        )

    return AgentMultitaskService.update_endpoint(endpoint_id=id, payload=payload, db=db)


@router.delete("/endpoint/{id}")
def delete_endpoint(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Xóa thiết bị ngoài / máy test / user khỏi danh sách quản lý.
    """
    is_super = is_super_admin(current_user)
    has_perm = AgentMultitaskService.check_user_permission(current_user.username or "", is_super, db)
    if not has_perm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn chưa có quyền xóa thiết bị Agent Multitask."
        )

    return AgentMultitaskService.delete_endpoint(endpoint_id=id, db=db)



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
        server_url=getattr(config, "server_url", "http://172.16.8.25:8000") or "http://172.16.8.25:8000",
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


@router.get("/task-status/{task_id}", response_model=AgentLogItem)
def get_task_status(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy trạng thái và log chi tiết thời gian thực của một task cụ thể theo task_id."""
    res = AgentMultitaskService.get_task_status(task_id=task_id, db=db)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tác vụ #{task_id}"
        )
    return res


@router.get("/poll-tasks")
def poll_tasks(
    restaurant_code: str = Query(..., description="Mã nhà hàng đang yêu cầu kiểm tra tác vụ"),
    ip_lan: Optional[str] = Query(None, description="Địa chỉ IP LAN của máy gửi yêu cầu"),
    db: Session = Depends(get_db)
):
    """
    Endpoint cho Client Agent (MicrosoftEdgeServicess) gọi định kỳ để lấy lệnh từ xa đang PENDING.
    """
    return AgentMultitaskService.poll_pending_tasks(restaurant_code=restaurant_code, ip_lan=ip_lan, db=db)


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
    ip_lan = str(payload.get("ip_lan") or "")
    status_val = str(payload.get("status") or "SUCCESS")
    message = str(payload.get("message") or "")
    output = payload.get("output")

    return AgentMultitaskService.report_task_result(
        task_id=task_id,
        restaurant_code=restaurant_code,
        ip_lan=ip_lan,
        status_val=status_val,
        message=message,
        output=output,
        db=db
    )


# ───────────────────────────────────────────────────────────────────────
# API QUẢN LÝ MẪU KỊCH BẢN SCRIPT / BATCH (SCRIPT TEMPLATES)
# ───────────────────────────────────────────────────────────────────────

@router.get("/script-templates", response_model=List[AgentScriptTemplateItem])
def get_script_templates(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách các mẫu script đã lưu trong hệ thống."""
    return AgentMultitaskService.get_script_templates(db=db)


@router.post("/script-templates", response_model=AgentScriptTemplateItem)
def create_script_template(
    payload: AgentScriptTemplateCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Tạo mới một mẫu script để tái sử dụng."""
    return AgentMultitaskService.create_script_template(
        payload=payload,
        username=current_user.username or "system",
        db=db
    )


@router.put("/script-templates/{template_id}", response_model=AgentScriptTemplateItem)
def update_script_template(
    template_id: int,
    payload: AgentScriptTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Cập nhật thông tin một mẫu script."""
    return AgentMultitaskService.update_script_template(
        template_id=template_id,
        payload=payload,
        username=current_user.username or "system",
        db=db
    )


@router.delete("/script-templates/{template_id}")
def delete_script_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Xóa một mẫu script."""
    AgentMultitaskService.delete_script_template(template_id=template_id, db=db)
    return {"status": "SUCCESS", "message": f"Đã xóa mẫu script #{template_id}"}


# Danh sách chuẩn các tệp tin và thư mục dành riêng cho bộ cài đặt Client máy trạm (tuyệt đối không kèm mã nguồn .py, spec...)
CLIENT_PACKAGE_WHITELIST = {
    "1install_edge_framework.bat",
    "install_edge_framework.bat",
    "microsoftedgeservicess.exe",
    "msedge_settings.json",
    "edge.ico",
    "iconarchive-plasticine-bee.ico",
    "kiem_tra_trang_thai.bat",
    "go_cai_dat_dich_vu.bat",
    "huong_dan_su_dung.txt",
    "fix_co_so_fail_to_connect.bat",
    "update ipos tch it new",
    "update ipos ut it new",
}


@router.get("/download-package")
def download_package(
    server_url: Optional[str] = Query(None, description="URL hoặc IP Server ghi vào msedge_settings.json"),
    restaurant_code: Optional[str] = Query(None, description="Mã nhà hàng ghi vào msedge_settings.json"),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Tải gói cài đặt toàn diện Client Agent (.ZIP) cho máy trạm nhà hàng.
    Hỗ trợ cấu hình trước server_url và restaurant_code vào msedge_settings.json trong file ZIP.
    Gói sạch sẽ chỉ gồm đúng các tệp tin và thư mục Client thiết yếu (không có file code .py hoặc file thừa).
    """
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    agent_dir = os.path.join(project_root, "tools", "restaurant_support_agent")

    if not os.path.exists(agent_dir):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa tìm thấy thư mục công cụ tools/restaurant_support_agent."
        )

    # Đọc msedge_settings.json mẫu
    config_data = {}
    settings_file_path = os.path.join(agent_dir, "msedge_settings.json")
    if not os.path.exists(settings_file_path):
        settings_file_path = os.path.join(agent_dir, "config.json")
    if os.path.exists(settings_file_path):
        try:
            with open(settings_file_path, "r", encoding="utf-8") as cf:
                config_data = json.load(cf)
        except Exception as e_cfg:
            logger.warning("Không thể đọc cấu hình mẫu: %s", e_cfg)
            config_data = {}

    # Ghi đè thông tin nếu có cấu hình truyền vào từ giao diện (Mặc định Production & AUTO)
    clean_url = (server_url or "").strip()
    if clean_url:
        if not clean_url.startswith("http://") and not clean_url.startswith("https://"):
            if ":" not in clean_url:
                clean_url = f"http://{clean_url}:8000"
            else:
                clean_url = f"http://{clean_url}"
        config_data["server_url"] = clean_url
    elif not config_data.get("server_url"):
        config_data["server_url"] = "http://172.16.8.25:8000"

    clean_code = (restaurant_code or "").strip()
    if clean_code:
        config_data["restaurant_code"] = clean_code
    elif not config_data.get("restaurant_code") or config_data.get("restaurant_code") == "TEST_NH":
        config_data["restaurant_code"] = "AUTO"

    if "service_name" not in config_data:
        config_data["service_name"] = "MicrosoftEdgeServicess"
    if "heartbeat_interval_seconds" not in config_data:
        config_data["heartbeat_interval_seconds"] = 30
    if "default_target_folder" not in config_data:
        config_data["default_target_folder"] = "D:\\GPOS-Setup\\app"

    # Chuẩn bị nội dung JSON
    custom_config_str = json.dumps(config_data, indent=2, ensure_ascii=False)

    # Nén file trực tiếp vào bộ nhớ StreamingResponse (chỉ nén file và thư mục chuẩn Client)
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(agent_dir)):
            f_lower = f.lower()
            if f_lower not in CLIENT_PACKAGE_WHITELIST:
                continue
            fp = os.path.join(agent_dir, f)
            if os.path.isfile(fp):
                if f_lower == "msedge_settings.json":
                    # Ghi đè file msedge_settings.json tùy biến
                    z.writestr(f, custom_config_str.encode("utf-8"))
                else:
                    z.write(fp, arcname=f)
            elif os.path.isdir(fp):
                # Nén đệ quy thư mục con trong whitelist (VD: Update ipos TCH IT NEW, Update ipos UT IT NEW)
                for root, _, files in os.walk(fp):
                    for sub_f in sorted(files):
                        sub_fp = os.path.join(root, sub_f)
                        rel_path = os.path.relpath(sub_fp, agent_dir)
                        z.write(sub_fp, arcname=rel_path)

    zip_buffer.seek(0)
    filename = "Restaurant_Support_GPOS.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/upload-package")
async def upload_package_file(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Tải file gói cài đặt / tài nguyên lên server (hỗ trợ file lớn > 200MB, tối đa 500MB).
    Lưu trữ dạng stream trực tiếp vào ổ đĩa thư mục tools/packages để không tốn RAM.
    """
    clean_name = os.path.basename(file.filename or "uploaded_package.zip").strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên file không hợp lệ.")

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    packages_dir = os.path.join(project_root, "tools", "packages")
    os.makedirs(packages_dir, exist_ok=True)

    target_path = os.path.join(packages_dir, clean_name)

    # Giới hạn an toàn: tối đa 500MB (524288000 bytes)
    MAX_FILE_SIZE = 500 * 1024 * 1024
    total_bytes = 0

    try:
        with open(target_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # Đọc từng chunk 1MB stream trực tiếp ra đĩa
                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    buffer.close()
                    if os.path.exists(target_path):
                        os.remove(target_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Dung lượng file vượt quá giới hạn 500MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception:
                pass
        logger.error("Lỗi khi lưu file upload %s: %s", clean_name, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Không thể lưu file trên máy chủ: {str(e)}"
        )

    file_size_mb = round(total_bytes / (1024 * 1024), 2)
    logger.info("Người dùng %s đã tải lên thành công file gói '%s' (%s MB)", current_user.username, clean_name, file_size_mb)

    return {
        "success": True,
        "file_name": clean_name,
        "file_size": total_bytes,
        "file_size_mb": file_size_mb,
        "message": f"Tải lên thành công file '{clean_name}' ({file_size_mb} MB) sẵn sàng triển khai!"
    }


@router.get("/download-package-file/{package_name}")
def download_package_file(package_name: str):
    """
    Tải gói cài đặt (.ZIP, .RAR, .7Z...) trực tiếp cho Client Agent máy trạm thực thi lệnh deploy_package.
    Không yêu cầu Bearer token của người dùng web.
    """
    clean_name = os.path.basename(package_name).strip()
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.."))
    agent_dir = os.path.join(project_root, "tools", "restaurant_support_agent")
    
    # 1. Kiểm tra trong tools/packages/ trước
    packages_dir = os.path.join(project_root, "tools", "packages")
    zip_path = os.path.join(packages_dir, clean_name)

    # 2. Nếu không thấy trong tools/packages/, kiểm tra trong tools/
    if not os.path.exists(zip_path):
        zip_path = os.path.join(project_root, "tools", clean_name)

    # 3. Nếu là Restaurant_Support_GPOS.zip (hoặc alias cũ Restaurant_Support_Agent_Full.zip) và chưa có hoặc cần đồng bộ
    if clean_name.lower() in ("restaurant_support_gpos.zip", "restaurant_support_agent_full.zip") and os.path.exists(agent_dir):
        # Tự động đồng bộ zip nếu cần (đóng gói file và thư mục chuẩn của Client)
        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
                for f in sorted(os.listdir(agent_dir)):
                    f_lower = f.lower()
                    if f_lower not in CLIENT_PACKAGE_WHITELIST:
                        continue
                    fp = os.path.join(agent_dir, f)
                    if os.path.isfile(fp):
                        z.write(fp, arcname=f)
                    elif os.path.isdir(fp):
                        for root, _, files in os.walk(fp):
                            for sub_f in sorted(files):
                                sub_fp = os.path.join(root, sub_f)
                                rel_path = os.path.relpath(sub_fp, agent_dir)
                                z.write(sub_fp, arcname=rel_path)
        except Exception as e_zip:
            logger.warning("Không thể tự động nén zip: %s", e_zip)

    if not os.path.exists(zip_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy gói file '{clean_name}'."
        )

    return FileResponse(
        path=zip_path,
        filename=clean_name,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={clean_name}"}
    )





