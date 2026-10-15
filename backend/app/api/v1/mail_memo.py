import os
import zipfile
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_super_admin_or_dung
from app.services.mail_memo_service import mail_memo_service

router = APIRouter(prefix="/mail-memo", tags=["Mail Memo - Quét Memo Từ Mail"])

AGENT_SHARED_SECRET = "dung_memo_agent_secret_2026"

def get_agent_source_dir() -> str:
    r"""
    Dò tìm thư mục chứa mã nguồn Agent trên máy chủ.
    Hỗ trợ tìm tại:
    1. tools/outlook_agent (Thư mục gốc repo)
    2. backend/tools/outlook_agent (Bên trong backend)
    3. backend/data/tools/outlook_agent
    4. D:\Setup\Outlook_Memo_Agent_Full
    """
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    project_root = os.path.dirname(backend_dir)
    candidates = [
        os.path.join(project_root, "tools", "outlook_agent"),
        os.path.join(backend_dir, "tools", "outlook_agent"),
        os.path.join(backend_dir, "data", "outlook_agent"),
        os.path.join(backend_dir, "data", "tools", "outlook_agent"),
        r"D:\Setup\Outlook_Memo_Agent_Full",
    ]
    for c in candidates:
        if os.path.exists(os.path.join(c, "outlook_agent.py")):
            return c
    return os.path.join(project_root, "tools", "outlook_agent")


def check_is_dung_or_super_admin(current_user) -> bool:
    username = (getattr(current_user, "username", "") or "").lower().strip()
    is_super = getattr(current_user, "is_super_admin", False) or username in ["admin", "administrator", "dung.nguyenanh"]
    pq = str(getattr(current_user, "phanquyen", "") or "").strip()
    return is_super or username == "dung.nguyenanh" or pq == "0"


@router.get("/status")
def get_mail_memo_status(current_user = Depends(require_super_admin_or_dung)):
    """Lấy trạng thái kết nối hòm thư Outlook và lịch sử quét gần nhất."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return mail_memo_service.get_status()


@router.post("/scan")
def trigger_scan_mail_memos(
    max_items: int = Query(400, ge=1, le=1000),
    current_user = Depends(require_super_admin_or_dung)
):
    """
    Kích hoạt quét hòm thư Outlook:
    Gửi lệnh cho Agent trên máy cá nhân đang Online quét và chờ kết quả.
    (Chỉ dung.nguyenanh hoặc Super Admin)
    """
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ dung.nguyenanh hoặc Super Admin mới có quyền thực hiện.")
    res = mail_memo_service.request_agent_scan(timeout_sec=35, max_items=max_items)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message", "Lỗi quét mail Memo qua Agent"))
    return res


class AgentImportRequest(BaseModel):
    items: List[dict]


@router.post("/import-from-agent")
def import_memos_from_agent(
    req: AgentImportRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Nhận danh sách Memo đã quét & bóc tách từ Local Agent chạy trên máy cá nhân
    và tiến hành kiểm tra trùng mã, gán round-robin IT rồi lưu vào DB Server.
    Chấp nhận xác thực qua:
    1. Header X-Agent-Secret (dành cho Task Scheduler chạy ngầm không cần mở web)
    2. Bearer Token của dung.nguyenanh hoặc Super Admin (dành cho Web browser)
    """
    x_secret = request.headers.get("X-Agent-Secret")
    if x_secret and x_secret.strip() == AGENT_SHARED_SECRET:
        pass
    else:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=403, detail="Yêu cầu phiên đăng nhập dung.nguyenanh hoặc Agent Secret hợp lệ.")
        token = auth_header.split(" ")[1]
        user = get_current_user(token=token, db=db)
        if not check_is_dung_or_super_admin(user):
            raise HTTPException(status_code=403, detail="Chỉ dung.nguyenanh hoặc Super Admin mới có quyền thực hiện.")

    res = mail_memo_service.process_and_import_parsed_items(req.items)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message", "Lỗi import Memo từ Agent"))
    return res


class AgentHeartbeatRequest(BaseModel):
    status: Optional[str] = "online"
    account: Optional[str] = None
    folder: Optional[str] = None
    computer_name: Optional[str] = None
    port: Optional[int] = 18890
    version: Optional[str] = "1.0"


@router.post("/heartbeat")
def agent_heartbeat(
    req: AgentHeartbeatRequest,
    request: Request
):
    """
    Nhận tín hiệu nhịp tim (heartbeat) định kỳ từ Local Agent máy cá nhân.
    """
    x_secret = request.headers.get("X-Agent-Secret")
    if not x_secret or x_secret.strip() != AGENT_SHARED_SECRET:
        raise HTTPException(status_code=403, detail="X-Agent-Secret không hợp lệ.")
    data = req.dict()
    data["client_ip"] = request.client.host if request.client else "unknown"
    return mail_memo_service.record_agent_poll(data, data["client_ip"])


class AgentPollRequest(BaseModel):
    account: Optional[str] = None
    computer_name: Optional[str] = None
    version: Optional[str] = "1.0"
    is_syncing: Optional[bool] = False


@router.post("/agent-poll")
def agent_poll_endpoint(
    req: AgentPollRequest,
    request: Request
):
    """
    Agent gọi định kỳ 2s/lần để báo hiệu Online và nhận lệnh quét từ Server nếu có.
    """
    x_secret = request.headers.get("X-Agent-Secret")
    if not x_secret or x_secret.strip() != AGENT_SHARED_SECRET:
        raise HTTPException(status_code=403, detail="X-Agent-Secret không hợp lệ.")
    client_ip = request.client.host if request.client else "unknown"
    return mail_memo_service.record_agent_poll(req.dict(), client_ip)


@router.get("/download-agent")
def download_outlook_agent(
    current_user = Depends(require_super_admin_or_dung)
):
    """
    Tải file ZIP trọn bộ Local Outlook Memo Agent dành cho máy cá nhân.
    Bao gồm mã nguồn agent, file chạy ngầm và file cài đặt tự động Task Scheduler.
    (Chỉ dung.nguyenanh hoặc Super Admin)
    """
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ dung.nguyenanh hoặc Super Admin mới có quyền tải.")

    agent_dir = get_agent_source_dir()
    os.makedirs(agent_dir, exist_ok=True)
    zip_path = os.path.join(agent_dir, "Outlook_Memo_Agent_Full.zip")

    files_to_zip = [
        "outlook_agent.py",
        "agent_config.json",
        "Chay_Outlook_Agent.bat",
        "Chay_Ngam.vbs",
        "Cai_Dat_Tu_Dong_Schedule.bat",
        "Go_Cai_Dat_Schedule.bat",
        "Huong_Dan_Su_Dung.txt"
    ]
    # Chỉ tái tạo ZIP nếu tìm thấy ít nhất 1 file nguồn rời
    existing_files = [f for f in files_to_zip if os.path.exists(os.path.join(agent_dir, f))]
    if existing_files:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
            for f in existing_files:
                z.write(os.path.join(agent_dir, f), arcname=f)

    if not os.path.exists(zip_path) or os.path.getsize(zip_path) < 500:
        raise HTTPException(
            status_code=404,
            detail="Gói cài đặt Outlook_Memo_Agent_Full.zip chưa được đưa lên máy chủ tại thư mục tools/outlook_agent."
        )

    return FileResponse(
        path=zip_path,
        filename="Outlook_Memo_Agent_Full.zip",
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=Outlook_Memo_Agent_Full.zip"}
    )


