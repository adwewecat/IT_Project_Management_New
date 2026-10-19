"""
Router API Phân Hệ Thử Nghiệm: 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab)
Cung cấp WebSocket Endpoint và REST API quản lý phiên Remote độc lập hoàn toàn.
"""

from __future__ import annotations
import logging
import socket
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, WebSocket, status, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.models.agent_multitask import AgentMultitaskEndpoint, AgentMultitaskLog
from app.services.remote_lab_service import RemoteLabService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/remote-lab", tags=["Remote Lab"])


def resolve_server_url(request: Request, client_server_url: Optional[str] = None, target_ip: Optional[str] = None) -> str:
    """Xác định URL Server chính xác nhất để Agent máy trạm kết nối WebSocket."""
    if client_server_url and client_server_url.strip():
        url = client_server_url.strip().rstrip('/')
        clean_target = (target_ip or '').strip().lower()
        if clean_target not in ('127.0.0.1', 'localhost', ''):
            if '127.0.0.1' in url or 'localhost' in url:
                try:
                    lan_ip = socket.gethostbyname(socket.gethostname())
                    if lan_ip and lan_ip != '127.0.0.1':
                        url = url.replace('127.0.0.1', lan_ip).replace('localhost', lan_ip)
                except Exception:
                    pass
        return url

    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    scheme = "https" if request.url.scheme == "https" else "http"
    if host:
        url = f"{scheme}://{host}"
        clean_target = (target_ip or '').strip().lower()
        if clean_target not in ('127.0.0.1', 'localhost', ''):
            if '127.0.0.1' in host or 'localhost' in host:
                try:
                    lan_ip = socket.gethostbyname(socket.gethostname())
                    if lan_ip and lan_ip != '127.0.0.1':
                        port_part = f":{host.split(':')[1]}" if ":" in host else ":8000"
                        url = f"{scheme}://{lan_ip}{port_part}"
                except Exception:
                    pass
        return url

    try:
        lan_ip = socket.gethostbyname(socket.gethostname())
        return f"http://{lan_ip}:8000"
    except Exception:
        return "http://127.0.0.1:8000"


class CreateRemoteSessionRequest(BaseModel):
    """Payload yêu cầu khởi tạo phiên Remote."""
    target_type: str = Field("workstation", description="'workstation' hoặc 'kds'")
    restaurant_code: str = Field(..., description="Mã nhà hàng")
    target_ip: str = Field(..., description="Địa chỉ IP LAN của máy hoặc KDS")
    device_name: Optional[str] = Field("", description="Tên gợi nhớ thiết bị")
    fps_limit: int = Field(15, ge=5, le=30, description="Giới hạn FPS (5-30)")
    quality: int = Field(65, ge=20, le=95, description="Chất lượng nén ảnh JPEG (20-95)")
    server_url: Optional[str] = Field(None, description="URL Backend mà máy trạm sẽ kết nối")


@router.get("/endpoints")
def get_endpoints(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Lấy danh sách các máy trạm & thiết bị có sẵn để kết nối Remote."""
    return RemoteLabService.get_available_endpoints(db=db)


@router.post("/sessions/create")
def create_session(
    payload: CreateRemoteSessionRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """Khởi tạo một phiên Remote mới độc lập và tự động phát lệnh tới Agent máy trạm."""
    target_ip = payload.target_ip.strip()
    if not target_ip:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng cung cấp địa chỉ IP thiết bị.")

    dev_name = payload.device_name.strip() if payload.device_name else f"{payload.restaurant_code} ({target_ip})"

    session = RemoteLabService.create_session(
        target_type=payload.target_type,
        restaurant_code=payload.restaurant_code.strip(),
        target_ip=target_ip,
        device_name=dev_name,
        created_by=current_user.username or "admin",
        fps_limit=payload.fps_limit,
        quality=payload.quality
    )

    # Tự động gửi task PENDING tới Windows Service máy trạm với server_url chính xác
    eff_server_url = resolve_server_url(request, payload.server_url, target_ip)
    RemoteLabService.dispatch_agent_task(
        session=session,
        server_url=eff_server_url,
        db=db,
        action="start_remote_worker"
    )

    return {
        "status": "SUCCESS",
        "message": f"Đã tạo phiên Remote cho {dev_name}",
        "session": session.to_dict(),
        "server_url": eff_server_url
    }


@router.post("/sessions/{session_id}/retry-agent")
def retry_agent_task(
    session_id: str,
    request: Request,
    server_url: Optional[str] = Query(None, description="URL Backend"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """Phát lại lệnh kích hoạt Remote Worker tới Agent máy trạm."""
    session = RemoteLabService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên không tồn tại hoặc đã đóng.")
    eff_server_url = resolve_server_url(request, server_url, session.target_ip)
    task_id = RemoteLabService.dispatch_agent_task(
        session=session,
        server_url=eff_server_url,
        db=db,
        action="start_remote_worker"
    )
    return {
        "status": "SUCCESS",
        "message": f"Đã gửi lại tín hiệu kích hoạt Web Worker tới {session.target_ip}",
        "task_id": task_id,
        "server_url": eff_server_url
    }


@router.get("/sessions/{session_id}/agent-status")
def get_session_agent_status(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """Kiểm tra tình trạng online của máy trạm và trạng thái task kích hoạt Web Worker gần nhất."""
    session = RemoteLabService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên không tồn tại hoặc đã đóng.")

    # Tìm thông tin Endpoint máy trạm theo IP
    endpoint = db.query(AgentMultitaskEndpoint).filter(
        AgentMultitaskEndpoint.ip_lan == session.target_ip
    ).first()

    is_online = False
    last_hb_str = None
    seconds_ago = None
    if endpoint and endpoint.last_heartbeat:
        delta = datetime.now() - endpoint.last_heartbeat
        seconds_ago = int(delta.total_seconds())
        is_online = (seconds_ago <= 90) and (endpoint.service_status == "RUNNING")
        last_hb_str = endpoint.last_heartbeat.strftime("%H:%M:%S %d/%m/%Y")

    # Tìm task start_remote_worker gần nhất của IP này
    latest_task = db.query(AgentMultitaskLog).filter(
        AgentMultitaskLog.machine_ip == session.target_ip,
        AgentMultitaskLog.action_type == "start_remote_worker"
    ).order_by(AgentMultitaskLog.id.desc()).first()

    task_info = None
    if latest_task:
        task_info = {
            "task_id": latest_task.id,
            "status": latest_task.result_status,
            "message": latest_task.result_message,
            "created_at": latest_task.created_at.strftime("%H:%M:%S") if latest_task.created_at else None
        }

    return {
        "status": "SUCCESS",
        "session_id": session_id,
        "target_ip": session.target_ip,
        "is_online": is_online,
        "seconds_since_heartbeat": seconds_ago,
        "last_heartbeat": last_hb_str,
        "service_status": endpoint.service_status if endpoint else "UNKNOWN",
        "machine_name": endpoint.machine_name if endpoint else None,
        "agent_version": endpoint.agent_version if endpoint else None,
        "latest_task": task_info,
        "is_worker_connected": session.worker_ws is not None
    }


@router.get("/sessions/auto")
def get_or_create_auto_session(
    target_ip: Optional[str] = Query(None, description="IP thiết bị cần tự động kết nối")
) -> Dict[str, Any]:
    """
    Endpoint mở (không yêu cầu Bearer token) cho Client Agent hoặc Script Batch:
    Tự động nhận Session ID đang chờ kết nối gần nhất hoặc tự tạo phiên mới mà KHÔNG CẦN GÕ LỆNH!
    """
    session = RemoteLabService.get_or_create_auto_session(target_ip=target_ip)
    return {
        "status": "SUCCESS",
        "session_id": session.session_id,
        "session": session.to_dict()
    }


@router.post("/sessions/{session_id}/launch-local")
def launch_local_worker(
    session_id: str,
    server_url: Optional[str] = Query("http://127.0.0.1:8000", description="URL Backend"),
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Tự động kích hoạt Remote Worker chạy ngầm trên máy hiện tại (1 Click từ giao diện Web).
    Hoàn toàn không cần mở CMD, không cần gõ lệnh!
    """
    res = RemoteLabService.launch_local_worker(session_id=session_id, server_url=server_url or "http://127.0.0.1:8000")
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=res.get("message"))
    return res


@router.get("/sessions")
def list_sessions(
    current_user: UserInfo = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Lấy danh sách tất cả các phiên Remote đang mở."""
    return RemoteLabService.list_sessions()


@router.get("/sessions/{session_id}")
def get_session_detail(
    session_id: str,
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """Xem chi tiết và tình trạng phiên Remote theo session_id."""
    session = RemoteLabService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên Remote không tồn tại hoặc đã đóng.")
    return session.to_dict()


@router.post("/sessions/{session_id}/terminate")
def terminate_session(
    session_id: str,
    reason: Optional[str] = Query("Đóng bởi người dùng", description="Lý do đóng"),
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """Đóng phiên Remote an toàn."""
    success = RemoteLabService.terminate_session(session_id, reason=reason)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phiên không tìm thấy.")
    return {"status": "SUCCESS", "message": f"Đã kết thúc phiên {session_id}"}


# =========================================================================
# WEBSOCKET CHUYỂN TIẾP (RELAY) CHO VIEWER VÀ AGENT
# =========================================================================

@router.websocket("/ws/viewer/{session_id}")
async def websocket_viewer_endpoint(websocket: WebSocket, session_id: str):
    """
    Kênh WebSocket kết nối từ Trình duyệt (Viewer Web).
    Nhận: Stream hình ảnh nén (Binary ArrayBuffer).
    Gửi: Sự kiện bàn phím, con trỏ chuột, lệnh thay đổi FPS/Quality (JSON).
    """
    await RemoteLabService.handle_viewer_connection(websocket=websocket, session_id=session_id)


@router.websocket("/ws/agent/{session_id}")
async def websocket_agent_endpoint(websocket: WebSocket, session_id: str):
    """
    Kênh WebSocket kết nối từ Máy trạm Agent (Client Agent hoặc ADB Bridge).
    Gửi: Stream hình ảnh chụp Desktop / KDS (Binary JPEG bytes).
    Nhận: Lệnh thao tác chuột (click, move, wheel) & bàn phím để mô phỏng (Win32 SendInput / ADB input).
    """
    await RemoteLabService.handle_agent_connection(websocket=websocket, session_id=session_id)
