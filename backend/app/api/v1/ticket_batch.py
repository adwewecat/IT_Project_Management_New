import asyncio
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/ticket-batch", tags=["ticket-batch"])


class SsoConfigRequest(BaseModel):
    sso_username: str
    sso_password: str  # plain text, sẽ được base64 trước khi lưu
    email_recipients: Optional[str] = ""


class BatchRunRequest(BaseModel):
    ticket_ids: List[str]
    all_tickets: List[dict]
    timesheet_data: Optional[dict] = None


@router.get("/config")
async def get_config(current_user: User = Depends(get_current_user)):
    """Lấy cấu hình SSO đã lưu (password ẩn đi)."""
    from app.services.ticket_batch_service import load_config
    cfg = load_config()
    return {
        "sso_username": cfg.get("sso_username", ""),
        "has_password": bool(cfg.get("sso_password_b64", "")),
        "email_recipients": cfg.get("email_recipients", ""),
        "last_run_at": cfg.get("last_run_at"),
        "last_run_status": cfg.get("last_run_status"),
    }


@router.post("/config")
async def save_config_endpoint(
    body: SsoConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lưu cấu hình SSO."""
    from app.services.ticket_batch_service import load_config, save_config, _encode_password, clear_session
    cfg = load_config()
    cfg["sso_username"] = body.sso_username.strip()
    if body.sso_password.strip():
        cfg["sso_password_b64"] = _encode_password(body.sso_password.strip())
    if body.email_recipients is not None:
        cfg["email_recipients"] = body.email_recipients.strip()
    save_config(cfg)
    clear_session()
    try:
        from app.services.log_service import LogService
        LogService.record_log(
            db=db,
            nhom_quyen="SYS",
            hanh_dong="UPDATE",
            mo_ta=f"Cấu hình tài khoản đóng ticket hàng loạt SSO: {body.sso_username.strip()}",
            current_user=current_user,
        )
    except Exception:
        pass
    return {"status": "success", "message": "Đã lưu cấu hình SSO thành công."}


@router.get("/latest-history")
async def get_latest_history_endpoint(current_user: User = Depends(get_current_user)):
    """Lấy kết quả lần quét và xử lý gần nhất (cả manual và auto cron)."""
    from app.services.ticket_batch_service import load_latest_history
    history = load_latest_history()
    return history or {
        "last_scanned_at": None,
        "last_run_at": None,
        "run_mode": None,
        "sso_username": "",
        "total_items": 0,
        "ticket_count": 0,
        "gprocess_count": 0,
        "timesheet_summary": {},
        "items": [],
        "summary": None
    }


@router.post("/preview")
async def preview_tickets_endpoint(current_user: User = Depends(get_current_user)):
    """Bước 1-4: Login SSO và lấy danh sách ticket để review."""
    from app.services.ticket_batch_service import preview_tickets, format_friendly_error
    try:
        result = await preview_tickets()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ImportError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=format_friendly_error(e))


import logging

logger = logging.getLogger(__name__)


@router.post("/run")
async def run_batch_close_endpoint(
    body: BatchRunRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bước 5-6: Thực hiện đóng các ticket đã chọn."""
    from app.services.ticket_batch_service import run_batch_close, format_friendly_error
    try:
        result = await run_batch_close(
            ticket_ids_to_process=body.ticket_ids,
            all_tickets=body.all_tickets,
            timesheet_data=body.timesheet_data
        )
        try:
            from app.services.log_service import LogService
            LogService.record_log(
                db=db,
                nhom_quyen="SYS",
                hanh_dong="EXECUTE",
                mo_ta=f"Thực hiện đóng ticket SSO hàng loạt: {len(body.ticket_ids)} tickets",
                current_user=current_user,
            )
        except Exception:
            pass
        return result
    except ValueError as e:
        logger.warning(f"[TICKET_BATCH] ValueError trong run endpoint: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[TICKET_BATCH] Lỗi hệ thống trong run endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=format_friendly_error(e))
