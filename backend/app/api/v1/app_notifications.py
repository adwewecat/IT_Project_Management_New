from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.app_notification import (
    AppNotificationItem,
    AppNotificationCreate,
    AppNotificationUpdate,
    AppNotificationListResponse,
)
from app.services import app_notification_service
from app.services.log_service import LogService

router = APIRouter(prefix="/app-notifications", tags=["Thông Báo & Lưu Ý Quyền App"])


def check_is_app_or_dung_or_superadmin(user: UserInfo) -> bool:
    """Kiểm tra người dùng có quyền xem: Quyền App, dung.nguyenanh, hoặc Super Admin/Admin"""
    username = user.username.lower()
    if user.is_super_admin or username in ("admin", "administrator", "dung.nguyenanh"):
        return True
    pq = str(user.phanquyen or "").strip().lower()
    if pq in ("0", "1", "2") or "app" in pq or "admin" in pq:
        return True
    roles = [str(r).lower() for r in (user.roles or [])]
    if any(r in ("admin", "app", "0", "1", "2") for r in roles):
        return True
    return False


def check_is_dung_or_superadmin(user: UserInfo) -> bool:
    """Kiểm tra người dùng có quyền quản trị (Thêm/Sửa/Xóa): dung.nguyenanh hoặc Super Admin"""
    username = user.username.lower()
    if user.is_super_admin or username in ("admin", "administrator", "dung.nguyenanh"):
        return True
    pq = str(user.phanquyen or "").strip().lower()
    if pq in ("0", "1") or "admin" in pq:
        return True
    roles = [str(r).lower() for r in (user.roles or [])]
    if "admin" in roles:
        return True
    return False


def require_app_or_dung_or_superadmin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if not check_is_app_or_dung_or_superadmin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Màn hình thông báo này chỉ dành cho người dùng quyền App, Quản trị viên và dung.nguyenanh.",
        )
    return current_user


def require_dung_or_superadmin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if not check_is_dung_or_superadmin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên và user dung.nguyenanh mới có quyền thêm, sửa, xóa hoặc ghim thông báo lưu ý.",
        )
    return current_user


@router.get("", response_model=AppNotificationListResponse)
def list_notifications(
    search: Optional[str] = Query(None, description="Tìm kiếm tiêu đề, nội dung, danh mục, người tạo"),
    category: Optional[str] = Query(None, description="Lọc theo danh mục"),
    priority: Optional[str] = Query(None, description="Lọc theo mức độ (Khẩn cấp, Quan trọng, Bình thường)"),
    pinned_only: bool = Query(False, description="Chỉ lấy thông báo đã ghim"),
    limit: int = Query(200, ge=1, le=1000, description="Giới hạn số lượng (mặc định 200)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_dung_or_superadmin),
):
    """Xem danh sách thông báo và lưu ý cho team App."""
    return app_notification_service.get_notifications(
        db=db,
        search=search,
        category=category,
        priority=priority,
        pinned_only=pinned_only,
        limit=limit,
    )


@router.post("", response_model=AppNotificationItem, status_code=status.HTTP_201_CREATED)
def create_notification(
    payload: AppNotificationCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Tạo thông báo lưu ý mới (chỉ dung.nguyenanh hoặc Super Admin)."""
    res = app_notification_service.create_notification(
        db=db,
        payload=payload,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="THONG_BAO_LUU_Y",
        hanh_dong="INSERT",
        mo_ta=f'Tạo thông báo lưu ý mới: "{payload.title}"',
        current_user=current_user
    )
    return res


@router.put("/{notif_id}", response_model=AppNotificationItem)
def update_notification(
    notif_id: int,
    payload: AppNotificationUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Cập nhật thông báo lưu ý (chỉ dung.nguyenanh hoặc Super Admin)."""
    res = app_notification_service.update_notification(
        db=db,
        notif_id=notif_id,
        payload=payload,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="THONG_BAO_LUU_Y",
        hanh_dong="UPDATE",
        mo_ta=f"Cập nhật thông báo lưu ý ID {notif_id}",
        current_user=current_user
    )
    return res


@router.delete("/{notif_id}")
def delete_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Xóa thông báo lưu ý (chỉ dung.nguyenanh hoặc Super Admin)."""
    app_notification_service.delete_notification(
        db=db,
        notif_id=notif_id,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="THONG_BAO_LUU_Y",
        hanh_dong="DELETE",
        mo_ta=f"Xóa thông báo lưu ý ID {notif_id}",
        current_user=current_user
    )
    return {"success": True, "message": f"Đã xóa thông báo #{notif_id}"}


@router.post("/{notif_id}/toggle-pin", response_model=AppNotificationItem)
def toggle_pin_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Ghim hoặc Bỏ ghim thông báo lên đầu trang."""
    res = app_notification_service.toggle_pin(
        db=db,
        notif_id=notif_id,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="THONG_BAO_LUU_Y",
        hanh_dong="UPDATE",
        mo_ta=f"Thay đổi trạng thái ghim thông báo ID {notif_id}",
        current_user=current_user
    )
    return res
