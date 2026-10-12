import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.v1.auth import get_current_user
from app.models.user import User
from app.services.mongo_mosquitto_service import mongo_mosquitto_service
from app.services.log_service import LogService

router = APIRouter(prefix="/mongo-mosquitto", tags=["Mongo Mosquitto Audit"])


class ConfigUpdateRequest(BaseModel):
    email_recipients: Optional[str] = None
    has_email_notification: Optional[bool] = True
    mongo_port: Optional[int] = 27017
    mosquitto_port: Optional[int] = 1883
    socket_timeout: Optional[float] = 0.8


@router.get("/results")
async def get_results(current_user: User = Depends(get_current_user)):
    """Lấy kết quả kiểm tra MongoDB & Mosquitto mới nhất."""
    return mongo_mosquitto_service.get_latest_results()


@router.post("/scan")
async def trigger_scan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kích hoạt quét toàn bộ nhà hàng kiểm tra MongoDB & Mosquitto Broker."""
    try:
        cfg = mongo_mosquitto_service.get_config()
        recipients = cfg.get("email_recipients")
        res = await asyncio.to_thread(
            mongo_mosquitto_service.scan_all_restaurants,
            email_recipients=recipients
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="SYS",
                hanh_dong="SCAN",
                mo_ta="Kích hoạt quét toàn bộ nhà hàng kiểm tra MongoDB & Mosquitto",
                current_user=current_user,
            )
        except Exception:
            pass
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-errors")
async def trigger_scan_errors(current_user: User = Depends(get_current_user)):
    """Chỉ quét lại các nhà hàng hiện đang bị LỖI trong kết quả kiểm tra gần nhất."""
    try:
        res = await asyncio.to_thread(
            mongo_mosquitto_service.scan_error_restaurants
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-single/{sap_code}")
async def trigger_scan_single(sap_code: str, current_user: User = Depends(get_current_user)):
    """Quét lại riêng 1 nhà hàng cụ thể theo mã SAP."""
    try:
        res = await asyncio.to_thread(
            mongo_mosquitto_service.scan_single_restaurant,
            sap_code=sap_code
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_config(current_user: User = Depends(get_current_user)):
    """Lấy cấu hình kiểm tra."""
    return mongo_mosquitto_service.get_config()


@router.post("/config")
async def update_config(
    req: ConfigUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cập nhật cấu hình email và thông số."""
    cfg = mongo_mosquitto_service.get_config()
    if req.email_recipients is not None:
        cfg["email_recipients"] = req.email_recipients.strip()
    if req.has_email_notification is not None:
        cfg["has_email_notification"] = req.has_email_notification
    if req.mongo_port is not None:
        cfg["mongo_port"] = req.mongo_port
    if req.mosquitto_port is not None:
        cfg["mosquitto_port"] = req.mosquitto_port
    if req.socket_timeout is not None:
        cfg["socket_timeout"] = req.socket_timeout

    mongo_mosquitto_service.save_config(cfg)
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="SYS",
            hanh_dong="UPDATE",
            mo_ta="Cập nhật cấu hình kiểm tra MongoDB & Mosquitto",
            current_user=current_user,
        )
    except Exception:
        pass
    return {"status": "success", "message": "Đã lưu cấu hình thành công", "config": cfg}
