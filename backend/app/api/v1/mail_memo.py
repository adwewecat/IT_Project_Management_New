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
AGENT_TOOL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "tools", "outlook_agent")
ZIP_FILE_PATH = os.path.join(AGENT_TOOL_DIR, "Outlook_Memo_Agent_Full.zip")


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
    Kích hoạt quét hòm thư Outlook và tự động import Memo vào database.
    (Chỉ dung.nguyenanh hoặc Super Admin)
    """
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ dung.nguyenanh hoặc Super Admin mới có quyền thực hiện.")
    res = mail_memo_service.scan_and_import_memos(max_items=max_items)
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("message", "Lỗi quét mail Memo"))
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

    os.makedirs(AGENT_TOOL_DIR, exist_ok=True)
    files_to_zip = [
        "outlook_agent.py",
        "agent_config.json",
        "Chay_Outlook_Agent.bat",
        "Chay_Ngam.vbs",
        "Cai_Dat_Tu_Dong_Schedule.bat",
        "Go_Cai_Dat_Schedule.bat",
        "Huong_Dan_Su_Dung.txt"
    ]
    with zipfile.ZipFile(ZIP_FILE_PATH, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files_to_zip:
            fp = os.path.join(AGENT_TOOL_DIR, f)
            if os.path.exists(fp):
                z.write(fp, arcname=f)

    return FileResponse(
        path=ZIP_FILE_PATH,
        filename="Outlook_Memo_Agent_Full.zip",
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=Outlook_Memo_Agent_Full.zip"}
    )


