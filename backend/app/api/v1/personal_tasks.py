from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.personal_task import (
    PersonalTaskItem,
    PersonalTaskCreate,
    PersonalTaskBatchCreate,
    PersonalTaskUpdate,
    PersonalTaskListResponse,
    AITaskExtractRequest,
)
from app.services import personal_task_service

router = APIRouter(prefix="/personal-tasks", tags=["Công Việc Cá Nhân"])


def require_dung_or_superadmin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    """Chỉ cho phép tài khoản dung.nguyenanh hoặc Super Admin."""
    username_lower = current_user.username.lower()
    is_super = bool(
        current_user.is_super_admin or
        username_lower in ("admin", "administrator", "dung.nguyenanh") or
        str(current_user.phanquyen or "").strip() == "0"
    )
    if not is_super:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Khu vực công việc cá nhân chỉ dành riêng cho Quản trị viên và user dung.nguyenanh."
        )
    return current_user


@router.get("", response_model=PersonalTaskListResponse)
def get_personal_tasks(
    tab: str = Query("pending", description="'pending' hoặc 'completed'"),
    from_date: Optional[str] = Query(None, description="Từ ngày hoàn thành (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày hoàn thành (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Tìm kiếm nội dung công việc"),
    limit: int = Query(500, ge=1, le=1000, description="Mặc định 500 dòng gần nhất"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Lấy danh sách công việc cá nhân (Cần làm hoặc Đã hoàn thành)."""
    return personal_task_service.get_personal_tasks(
        db=db,
        username=current_user.username,
        tab=tab,
        from_date=from_date,
        to_date=to_date,
        search=search,
        limit=limit,
    )


@router.post("", response_model=PersonalTaskItem, status_code=status.HTTP_201_CREATED)
def create_personal_task(
    payload: PersonalTaskCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Thêm một công việc cá nhân mới."""
    return personal_task_service.create_personal_task(
        db=db,
        username=current_user.username,
        payload=payload,
    )


@router.post("/batch", response_model=List[PersonalTaskItem], status_code=status.HTTP_201_CREATED)
def batch_create_personal_tasks(
    payload: PersonalTaskBatchCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Thêm hàng loạt nhiều dòng công việc cá nhân từ danh sách đã tách."""
    return personal_task_service.batch_create_personal_tasks(
        db=db,
        username=current_user.username,
        task_lines=payload.tasks,
    )


@router.post("/extract-ai", response_model=List[str])
def extract_tasks_ai(
    payload: AITaskExtractRequest,
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Chuyển đổi hình ảnh hoặc 1 list văn bản thành từng dòng công việc riêng biệt (sử dụng A.I Key hoặc thuật toán bóc tách)."""
    return personal_task_service.extract_tasks_from_text_or_ai(payload)


@router.put("/{task_id}", response_model=PersonalTaskItem)
def update_personal_task(
    task_id: int,
    payload: PersonalTaskUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Cập nhật nội dung hoặc trạng thái công việc cá nhân."""
    try:
        return personal_task_service.update_personal_task(
            db=db,
            username=current_user.username,
            task_id=task_id,
            payload=payload,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{task_id}/toggle", response_model=PersonalTaskItem)
def toggle_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Chuyển đổi trạng thái Hoàn thành / Mở lại công việc."""
    try:
        return personal_task_service.toggle_task_status(
            db=db,
            username=current_user.username,
            task_id=task_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_dung_or_superadmin),
):
    """Xóa công việc cá nhân."""
    ok = personal_task_service.delete_personal_task(
        db=db,
        username=current_user.username,
        task_id=task_id,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc để xóa.")
    return None
