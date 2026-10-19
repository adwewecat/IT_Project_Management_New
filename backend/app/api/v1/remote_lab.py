"""
Router API Phân Hệ Thử Nghiệm: 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab)
Cung cấp WebSocket Endpoint và REST API quản lý phiên Remote độc lập hoàn toàn.
"""

from __future__ import annotations
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, WebSocket, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.services.remote_lab_service import RemoteLabService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/remote-lab", tags=["Remote Lab"])


class CreateRemoteSessionRequest(BaseModel):
    """Payload yêu cầu khởi tạo phiên Remote."""
    target_type: str = Field("workstation", description="'workstation' hoặc 'kds'")
    restaurant_code: str = Field(..., description="Mã nhà hàng")
    target_ip: str = Field(..., description="Địa chỉ IP LAN của máy hoặc KDS")
    device_name: Optional[str] = Field("", description="Tên gợi nhớ thiết bị")
    fps_limit: int = Field(15, ge=5, le=30, description="Giới hạn FPS (5-30)")
    quality: int = Field(65, ge=20, le=95, description="Chất lượng nén ảnh JPEG (20-95)")


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
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """Khởi tạo một phiên Remote mới độc lập."""
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

    return {
        "status": "SUCCESS",
        "message": f"Đã tạo phiên Remote cho {dev_name}",
        "session": session.to_dict()
    }


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
