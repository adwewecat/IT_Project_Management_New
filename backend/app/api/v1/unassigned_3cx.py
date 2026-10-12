import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.unassigned_3cx_service import unassigned_3cx_service
from app.services.ticket_batch_service import format_friendly_error, load_config, save_config, _encode_password, clear_session
from app.services.log_service import LogService

router = APIRouter(prefix="/unassigned-3cx", tags=["unassigned-3cx"])


class EmailReportRequest(BaseModel):
    recipients: str
    target_date: Optional[str] = None


class SsoConfigRequest(BaseModel):
    sso_username: str
    sso_password: str
    email_recipients: Optional[str] = ""


@router.get("/dates")
async def get_scan_dates(current_user: User = Depends(get_current_user)):
    """Lấy danh sách các ngày quét đã có."""
    return unassigned_3cx_service.get_scan_dates()


@router.get("/audit")
async def get_audit_data(
    target_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user)
):
    """Lấy kết quả rà soát nhiệm vụ 3CX chưa gán người xử lý theo ngày."""
    return unassigned_3cx_service.get_audit_items_by_date(target_date)


@router.post("/scan")
async def trigger_scan(
    max_pages: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kích hoạt quét trực tiếp trên GPMS."""
    try:
        res = await unassigned_3cx_service.scan_unassigned_tickets(max_pages=max_pages)
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="SYS",
                hanh_dong="SCAN",
                mo_ta=f"Kích hoạt quét nhiệm vụ 3CX chưa gán trên GPMS ({max_pages} trang)",
                current_user=current_user,
            )
        except Exception:
            pass
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=format_friendly_error(e))


@router.post("/send-email")
async def send_email_report(
    body: EmailReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi email báo cáo danh sách ticket chưa gán."""
    try:
        res = unassigned_3cx_service.send_report_email(
            recipients=body.recipients,
            target_date=body.target_date
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="SYS",
                hanh_dong="SEND_MAIL",
                mo_ta=f"Gửi email báo cáo nhiệm vụ 3CX chưa gán ngày {body.target_date or 'hôm nay'} tới {body.recipients}",
                current_user=current_user,
            )
        except Exception:
            pass
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi gửi email: {str(e)}")


@router.get("/sso-config")
async def get_sso_config(current_user: User = Depends(get_current_user)):
    """Lấy cấu hình SSO."""
    cfg = load_config()
    return {
        "sso_username": cfg.get("sso_username", ""),
        "has_password": bool(cfg.get("sso_password_b64", "")),
        "email_recipients": cfg.get("email_recipients", "")
    }


@router.post("/sso-config")
async def save_sso_config(
    body: SsoConfigRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lưu cấu hình SSO."""
    cfg = load_config()
    cfg["sso_username"] = body.sso_username.strip()
    if body.sso_password.strip():
        cfg["sso_password_b64"] = _encode_password(body.sso_password.strip())
    if body.email_recipients is not None:
        cfg["email_recipients"] = body.email_recipients.strip()
    save_config(cfg)
    clear_session()
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="SYS",
            hanh_dong="UPDATE",
            mo_ta=f"Cấu hình tài khoản SSO cho nhiệm vụ 3CX: {body.sso_username.strip()}",
            current_user=current_user,
        )
    except Exception:
        pass
    return {"status": "success", "message": "Đã lưu cấu hình SSO thành công."}
