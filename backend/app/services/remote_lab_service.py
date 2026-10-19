"""
Service Quản Lý Phiên Remote Lab Độc Lập (Web-based Remote Desktop qua WebSocket & Canvas)
Mục đích: Cầu nối chuyển tiếp (Relay Hub) 2 chiều giữa Viewer Web (Trình duyệt) và Agent (Máy trạm / KDS).
Hoàn toàn độc lập với các phân hệ khác để dễ thử nghiệm, cách ly hoặc gỡ bỏ khi cần.
"""

from __future__ import annotations
import asyncio
import json
import logging
import time
import uuid
from datetime import datetime
from typing import Dict, Optional, Any, List
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.models.agent_multitask import AgentMultitaskEndpoint

logger = logging.getLogger(__name__)


class RemoteSession:
    """Đại diện cho một phiên Remote Desktop đang hoạt động."""

    def __init__(
        self,
        session_id: str,
        target_type: str,  # 'workstation' (Windows) hoặc 'kds' (Android)
        restaurant_code: str,
        target_ip: str,
        device_name: str,
        created_by: str = "admin",
        fps_limit: int = 15,
        quality: int = 65
    ):
        self.session_id = session_id
        self.target_type = target_type
        self.restaurant_code = restaurant_code
        self.target_ip = target_ip
        self.device_name = device_name
        self.created_by = created_by
        self.created_at = datetime.now()
        self.last_active = datetime.now()

        # Cấu hình stream
        self.fps_limit = fps_limit
        self.quality = quality

        # WebSockets
        self.agent_ws: Optional[WebSocket] = None
        self.viewer_ws: Optional[WebSocket] = None

        # Trạng thái & Thống kê
        self.status = "WAITING_AGENT"  # WAITING_AGENT, CONNECTED, DISCONNECTED
        self.screen_width = 1920
        self.screen_height = 1080
        self.total_frames = 0
        self.total_bytes = 0
        self.last_ping_ms = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Chuyển đổi session thành dictionary để trả về giao diện."""
        return {
            "session_id": self.session_id,
            "target_type": self.target_type,
            "restaurant_code": self.restaurant_code,
            "target_ip": self.target_ip,
            "device_name": self.device_name,
            "created_by": self.created_by,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "status": self.status,
            "has_agent": self.agent_ws is not None,
            "has_viewer": self.viewer_ws is not None,
            "screen_width": self.screen_width,
            "screen_height": self.screen_height,
            "fps_limit": self.fps_limit,
            "quality": self.quality,
            "total_frames": self.total_frames,
            "total_bytes_mb": round(self.total_bytes / (1024 * 1024), 2),
            "last_ping_ms": self.last_ping_ms,
        }


class RemoteLabService:
    """Bộ điều phối tập trung các phiên Remote Lab."""

    # Lưu trữ các session đang mở trong bộ nhớ RAM
    _sessions: Dict[str, RemoteSession] = {}

    @classmethod
    def create_session(
        cls,
        target_type: str,
        restaurant_code: str,
        target_ip: str,
        device_name: str,
        created_by: str = "admin",
        fps_limit: int = 15,
        quality: int = 65
    ) -> RemoteSession:
        """Tạo một phiên Remote mới và sinh mã session_id duy nhất."""
        session_id = f"rem_{uuid.uuid4().hex[:12]}"
        session = RemoteSession(
            session_id=session_id,
            target_type=target_type,
            restaurant_code=restaurant_code,
            target_ip=target_ip,
            device_name=device_name,
            created_by=created_by,
            fps_limit=fps_limit,
            quality=quality
        )
        cls._sessions[session_id] = session
        logger.info(
            "Đã khởi tạo Remote Session '%s' cho thiết bị %s (%s, IP: %s)",
            session_id, device_name, target_type, target_ip
        )
        return session

    @classmethod
    def get_session(cls, session_id: str) -> Optional[RemoteSession]:
        """Lấy thông tin phiên remote theo session_id."""
        return cls._sessions.get(session_id)

    @classmethod
    def list_sessions(cls) -> List[Dict[str, Any]]:
        """Lấy danh sách tất cả các phiên remote đang hoạt động."""
        cls._cleanup_stale_sessions()
        return [s.to_dict() for s in cls._sessions.values()]

    @classmethod
    def terminate_session(cls, session_id: str, reason: str = "User closed") -> bool:
        """Đóng và dọn dẹp một phiên remote."""
        session = cls._sessions.pop(session_id, None)
        if not session:
            return False

        session.status = "DISCONNECTED"
        # Báo cho 2 đầu đóng socket nếu còn mở
        close_tasks = []
        if session.agent_ws:
            try:
                close_tasks.append(session.agent_ws.send_text(json.dumps({"type": "session_terminated", "reason": reason})))
            except Exception:
                pass
        if session.viewer_ws:
            try:
                close_tasks.append(session.viewer_ws.send_text(json.dumps({"type": "session_terminated", "reason": reason})))
            except Exception:
                pass

        logger.info("Đã hủy Remote Session '%s' (Lý do: %s)", session_id, reason)
        return True

    @classmethod
    def _cleanup_stale_sessions(cls):
        """Tự động dọn dẹp các session không còn kết nối hoặc quá 2 giờ không có hoạt động."""
        now = datetime.now()
        stale_ids = []
        for sid, s in cls._sessions.items():
            diff_hours = (now - s.last_active).total_seconds() / 3600
            if diff_hours > 2 and not s.agent_ws and not s.viewer_ws:
                stale_ids.append(sid)

        for sid in stale_ids:
            cls._sessions.pop(sid, None)

    @classmethod
    def get_available_endpoints(cls, db: Session) -> List[Dict[str, Any]]:
        """Lấy danh sách các máy trạm có thể Remote từ bảng AgentMultitaskEndpoint."""
        try:
            endpoints = db.query(AgentMultitaskEndpoint).order_by(
                AgentMultitaskEndpoint.is_online.desc(),
                AgentMultitaskEndpoint.restaurant_code.asc(),
                AgentMultitaskEndpoint.ip_lan.asc()
            ).all()

            results = []
            for ep in endpoints:
                results.append({
                    "id": ep.id,
                    "restaurant_code": ep.restaurant_code,
                    "restaurant_name": ep.restaurant_name,
                    "ip_lan": ep.ip_lan,
                    "machine_name": ep.machine_name,
                    "service_status": ep.service_status,
                    "is_online": bool(ep.is_online),
                    "device_type": ep.device_type or "RESTAURANT",
                    "last_heartbeat": ep.last_heartbeat.strftime("%Y-%m-%d %H:%M:%S") if ep.last_heartbeat else None,
                })
            return results
        except Exception as e:
            logger.error("Lỗi khi lấy danh sách endpoints: %s", e)
            return []

    # =========================================================================
    # XỬ LÝ WEBSOCKET RELAY CỰC NHANH (FAST MEMORY RELAY)
    # =========================================================================

    @classmethod
    async def handle_agent_connection(cls, websocket: WebSocket, session_id: str):
        """Xử lý kết nối từ Client Agent (Máy trạm hoặc ADB Proxy)."""
        session = cls.get_session(session_id)
        if not session:
            await websocket.close(code=4004, reason="Session not found")
            return

        await websocket.accept()
        session.agent_ws = websocket
        session.last_active = datetime.now()
        if session.viewer_ws:
            session.status = "CONNECTED"
            # Báo cho Viewer biết Agent đã sẵn sàng
            try:
                await session.viewer_ws.send_text(json.dumps({
                    "type": "agent_connected",
                    "session_id": session_id,
                    "fps": session.fps_limit,
                    "quality": session.quality
                }))
            except Exception:
                pass
        else:
            session.status = "WAITING_VIEWER"

        logger.info("Agent đã kết nối vào Remote Session '%s'", session_id)

        try:
            while True:
                message = await websocket.receive()
                session.last_active = datetime.now()

                # Nếu nhận binary bytes -> Frame ảnh JPEG từ Agent
                if "bytes" in message and message["bytes"]:
                    raw_bytes = message["bytes"]
                    session.total_frames += 1
                    session.total_bytes += len(raw_bytes)

                    # Chuyển tiếp ngay lập tức sang Viewer nếu Viewer đang kết nối
                    if session.viewer_ws:
                        try:
                            await session.viewer_ws.send_bytes(raw_bytes)
                        except Exception as e_send:
                            logger.debug("Lỗi relay bytes sang viewer: %s", e_send)

                # Nếu nhận text JSON -> Thông tin kích thước màn hình / ping / logs từ Agent
                elif "text" in message and message["text"]:
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type")
                        if msg_type == "screen_info":
                            session.screen_width = data.get("width", session.screen_width)
                            session.screen_height = data.get("height", session.screen_height)
                            if session.viewer_ws:
                                await session.viewer_ws.send_text(json.dumps({
                                    "type": "screen_info",
                                    "width": session.screen_width,
                                    "height": session.screen_height
                                }))
                        elif msg_type == "pong":
                            if session.viewer_ws:
                                await session.viewer_ws.send_text(message["text"])
                        elif msg_type == "status_log":
                            if session.viewer_ws:
                                await session.viewer_ws.send_text(message["text"])
                    except Exception:
                        pass

        except WebSocketDisconnect:
            logger.info("Agent ngắt kết nối khỏi session '%s'", session_id)
        except Exception as e:
            logger.warning("Agent connection error trong session '%s': %s", session_id, e)
        finally:
            session.agent_ws = None
            session.status = "WAITING_AGENT"
            if session.viewer_ws:
                try:
                    await session.viewer_ws.send_text(json.dumps({
                        "type": "agent_disconnected",
                        "session_id": session_id,
                        "message": "Máy trạm Agent đã ngắt kết nối tạm thời."
                    }))
                except Exception:
                    pass

    @classmethod
    async def handle_viewer_connection(cls, websocket: WebSocket, session_id: str):
        """Xử lý kết nối từ Web Browser Viewer (Kỹ thuật viên IT)."""
        session = cls.get_session(session_id)
        if not session:
            await websocket.close(code=4004, reason="Session not found")
            return

        await websocket.accept()
        session.viewer_ws = websocket
        session.last_active = datetime.now()

        if session.agent_ws:
            session.status = "CONNECTED"
            # Báo cho Viewer biết Agent đã kết nối
            await websocket.send_text(json.dumps({
                "type": "session_ready",
                "session_id": session_id,
                "target_type": session.target_type,
                "device_name": session.device_name,
                "target_ip": session.target_ip,
                "width": session.screen_width,
                "height": session.screen_height,
                "fps": session.fps_limit,
                "quality": session.quality,
                "agent_online": True
            }))
        else:
            session.status = "WAITING_AGENT"
            await websocket.send_text(json.dumps({
                "type": "waiting_agent",
                "session_id": session_id,
                "target_type": session.target_type,
                "device_name": session.device_name,
                "target_ip": session.target_ip,
                "message": "Đang chờ kết nối từ Agent máy trạm...",
                "agent_online": False
            }))

        logger.info("Viewer Web đã kết nối vào Remote Session '%s'", session_id)

        try:
            while True:
                # Nhận lệnh điều khiển từ Browser Viewer (JSON: chuột, bàn phím, cấu hình)
                text_data = await websocket.receive_text()
                session.last_active = datetime.now()

                # Relay chuyển tiếp trực tiếp sang Agent để thực thi trên Win32 / ADB
                if session.agent_ws:
                    try:
                        await session.agent_ws.send_text(text_data)
                    except Exception as e_relay:
                        logger.debug("Lỗi relay lệnh sang agent: %s", e_relay)

                # Đồng thời cập nhật ping / config nếu là lệnh quản lý
                try:
                    data = json.loads(text_data)
                    msg_type = data.get("type")
                    if msg_type == "ping":
                        client_time = data.get("time", 0)
                        # Trả lại pong ngay cho Viewer để đo RTT
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "time": client_time,
                            "server_time": time.time() * 1000
                        }))
                    elif msg_type == "config":
                        if "fps" in data:
                            session.fps_limit = int(data["fps"])
                        if "quality" in data:
                            session.quality = int(data["quality"])
                except Exception:
                    pass

        except WebSocketDisconnect:
            logger.info("Viewer Web ngắt kết nối khỏi session '%s'", session_id)
        except Exception as e:
            logger.warning("Viewer connection error trong session '%s': %s", session_id, e)
        finally:
            session.viewer_ws = None
            if session.agent_ws:
                try:
                    await session.agent_ws.send_text(json.dumps({
                        "type": "viewer_disconnected",
                        "session_id": session_id
                    }))
                except Exception:
                    pass
