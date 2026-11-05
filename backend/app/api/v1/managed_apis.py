from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.managed_api import (
    ManagedAPIItem,
    ManagedAPIListResponse,
    ManagedAPICreate,
    ManagedAPIUpdate,
    ManagedAPIToggle
)
from app.services import managed_api_service

router = APIRouter(prefix="/managed-apis", tags=["Managed APIs"])


@router.get("", response_model=ManagedAPIListResponse, summary="Lấy danh sách các API đang được quản lý")
def list_apis(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    items = managed_api_service.list_managed_apis(db)
    return {
        "success": True,
        "total": len(items),
        "items": items
    }


@router.post("", response_model=ManagedAPIItem, status_code=status.HTTP_201_CREATED, summary="Thêm mới một API vào hệ thống quản lý")
def create_api(
    data: ManagedAPICreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        return managed_api_service.create_managed_api(db, data, current_user.username)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{api_id}", response_model=ManagedAPIItem, summary="Cập nhật cấu hình của một API")
def update_api(
    api_id: int,
    data: ManagedAPIUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    updated = managed_api_service.update_managed_api(db, api_id, data, current_user.username)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy cấu hình API.")
    return updated


@router.patch("/{api_id}/toggle", response_model=ManagedAPIItem, summary="Bật hoặc Tắt API nhanh chóng")
def toggle_api(
    api_id: int,
    data: ManagedAPIToggle,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    updated = managed_api_service.toggle_managed_api(db, api_id, data.is_enabled, current_user.username)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy cấu hình API.")
    return updated


@router.delete("/{api_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Xóa một API khỏi danh sách quản lý")
def delete_api(
    api_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    success = managed_api_service.delete_managed_api(db, api_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy cấu hình API.")
    return None
