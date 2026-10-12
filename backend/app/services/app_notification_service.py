import json
from datetime import datetime
from typing import Optional, List, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from fastapi import HTTPException, status

from app.models.app_notification import AppNotification
from app.schemas.app_notification import (
    AppNotificationItem,
    AppNotificationCreate,
    AppNotificationUpdate,
    AppNotificationListResponse,
)

def _safe_json_loads(data: Optional[str]) -> List[Any]:
    if not data:
        return []
    try:
        parsed = json.loads(data)
        if isinstance(parsed, list):
            return parsed
        return []
    except Exception:
        return []

def _to_item(record: AppNotification) -> AppNotificationItem:
    return AppNotificationItem(
        id=record.id,
        tieu_de=record.tieu_de,
        danh_muc=record.danh_muc or "Lưu ý chung",
        muc_do=record.muc_do or "Quan trọng",
        noi_dung=record.noi_dung,
        images=_safe_json_loads(record.images),
        files=_safe_json_loads(record.files),
        is_pinned=bool(record.is_pinned),
        nguoi_tao=record.nguoi_tao,
        nguoi_update=record.nguoi_update,
        ngay_tao=record.ngay_tao,
        ngay_update=record.ngay_update,
        active=bool(record.active),
    )

def get_notifications(
    db: Session,
    search: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    pinned_only: bool = False,
    limit: int = 200,
) -> AppNotificationListResponse:
    query = db.query(AppNotification).filter(AppNotification.active == True)

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(AppNotification.tieu_de).like(term),
                func.lower(AppNotification.noi_dung).like(term),
                func.lower(AppNotification.danh_muc).like(term),
                func.lower(AppNotification.nguoi_tao).like(term),
            )
        )

    if category and category.strip() and category.strip().lower() != "all":
        query = query.filter(AppNotification.danh_muc == category.strip())

    if priority and priority.strip() and priority.strip().lower() != "all":
        query = query.filter(AppNotification.muc_do == priority.strip())

    if pinned_only:
        query = query.filter(AppNotification.is_pinned == True)

    # Order by is_pinned first, then newest
    records = (
        query.order_by(desc(AppNotification.is_pinned), desc(AppNotification.ngay_tao))
        .limit(limit)
        .all()
    )

    items = [_to_item(r) for r in records]
    pinned_count = sum(1 for i in items if i.is_pinned)

    # Get all distinct categories
    all_cats = (
        db.query(AppNotification.danh_muc)
        .filter(AppNotification.active == True)
        .distinct()
        .all()
    )
    categories = sorted(list({c[0] for c in all_cats if c[0]}))

    return AppNotificationListResponse(
        total=len(items),
        pinned_count=pinned_count,
        categories=categories,
        items=items,
    )

def create_notification(
    db: Session,
    payload: AppNotificationCreate,
    username: str,
) -> AppNotificationItem:
    images_str = json.dumps(payload.images or [], ensure_ascii=False) if payload.images else None
    files_str = json.dumps(payload.files or [], ensure_ascii=False) if payload.files else None

    record = AppNotification(
        tieu_de=payload.tieu_de.strip(),
        danh_muc=payload.danh_muc.strip() if payload.danh_muc else "Lưu ý chung",
        muc_do=payload.muc_do.strip() if payload.muc_do else "Quan trọng",
        noi_dung=payload.noi_dung.strip(),
        images=images_str,
        files=files_str,
        is_pinned=bool(payload.is_pinned),
        nguoi_tao=username,
        nguoi_update=username,
        ngay_tao=datetime.now(),
        ngay_update=datetime.now(),
        active=True,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_item(record)

def update_notification(
    db: Session,
    notif_id: int,
    payload: AppNotificationUpdate,
    username: str,
) -> AppNotificationItem:
    record = db.query(AppNotification).filter(AppNotification.id == notif_id, AppNotification.active == True).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo lưu ý.")

    if payload.tieu_de is not None:
        record.tieu_de = payload.tieu_de.strip()
    if payload.danh_muc is not None:
        record.danh_muc = payload.danh_muc.strip()
    if payload.muc_do is not None:
        record.muc_do = payload.muc_do.strip()
    if payload.noi_dung is not None:
        record.noi_dung = payload.noi_dung.strip()
    if payload.images is not None:
        record.images = json.dumps(payload.images, ensure_ascii=False)
    if payload.files is not None:
        record.files = json.dumps(payload.files, ensure_ascii=False)
    if payload.is_pinned is not None:
        record.is_pinned = bool(payload.is_pinned)

    record.nguoi_update = username
    record.ngay_update = datetime.now()

    db.commit()
    db.refresh(record)
    return _to_item(record)

def delete_notification(
    db: Session,
    notif_id: int,
    username: str,
) -> bool:
    record = db.query(AppNotification).filter(AppNotification.id == notif_id, AppNotification.active == True).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo lưu ý.")

    record.active = False
    record.nguoi_update = username
    record.ngay_update = datetime.now()
    db.commit()
    return True

def toggle_pin(
    db: Session,
    notif_id: int,
    username: str,
) -> AppNotificationItem:
    record = db.query(AppNotification).filter(AppNotification.id == notif_id, AppNotification.active == True).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy thông báo lưu ý.")

    record.is_pinned = not bool(record.is_pinned)
    record.nguoi_update = username
    record.ngay_update = datetime.now()
    db.commit()
    db.refresh(record)
    return _to_item(record)
