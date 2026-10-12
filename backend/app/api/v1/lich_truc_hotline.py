from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserInfo, MessageResponse
from app.schemas.lich_truc_hotline import (
    LichTrucMonthResponse,
    LichTrucUploadPayload,
)
from app.services.lich_truc_hotline_service import (
    get_hotline_schedule,
    get_available_months,
    save_hotline_image,
    delete_hotline_schedule,
)
from app.api.deps import get_current_user, require_admin
from app.services.auth_service import is_admin_user
from app.services.log_service import LogService

router = APIRouter(prefix="/hotline", tags=["Lịch Trực Hotline"])


def check_hotline_access(user: UserInfo) -> tuple[bool, bool]:
    """
    Kiểm tra quyền truy cập lịch trực hotline:
    - Admin (0, 1) và Inventory (4): Xem được cả 2 nhóm (Helpdesk & App).
    - Helpdesk (3): Chỉ xem được Helpdesk.
    - App (2): Chỉ xem được IT App.
    Trả về (can_helpdesk, can_app).
    """
    roles = [r.lower() for r in (user.roles or [])]
    phanquyen = str(user.phanquyen or "").strip().lower()

    # Admin hoặc SuperAdmin: xem được tất cả
    if is_admin_user(user):
        return True, True

    # Inventory: xem được cả 2 nhóm trực
    if "inventory" in roles or "inv" in roles or phanquyen in ["4", "inventory"] or "inventory" in phanquyen:
        return True, True

    can_help = "helpdesk" in roles or phanquyen in ["3", "helpdesk"] or "helpdesk" in phanquyen
    can_app = "app" in roles or phanquyen in ["2", "app"] or "app" in phanquyen

    return can_help, can_app


@router.get(
    "/schedule",
    response_model=LichTrucMonthResponse,
    summary="Lấy lịch trực hotline theo tháng",
    description="Hiển thị hình ảnh lịch trực hotline được phân quyền (Helpdesk chỉ thấy Helpdesk, App chỉ thấy App, Inventory & Admin thấy cả 2)."
)
def api_get_schedule(
    month: Optional[str] = Query(None, description="Tháng cần xem (1 - 12)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    can_help, can_app = check_hotline_access(current_user)
    if not can_help and not can_app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập vào phân hệ Lịch Trực Hotline."
        )

    if not month or not month.strip():
        month = str(datetime.now().month)
    
    month_clean = month.strip()
    schedule = get_hotline_schedule(db, month_clean)

    # Lọc dữ liệu theo đúng phân quyền người dùng
    if not can_help:
        schedule["helpdesk"] = None
        schedule["helpdesk_months"] = []
    if not can_app:
        schedule["app"] = None
        schedule["app_months"] = []

    # Danh sách các tháng khả dụng theo quyền
    visible_months = []
    if can_help:
        visible_months.extend(schedule.get("helpdesk_months", []))
    if can_app:
        visible_months.extend(schedule.get("app_months", []))
    schedule["available_months"] = sorted(list(set(visible_months)), key=lambda x: int(x) if x.isdigit() else 0)

    return schedule


@router.get(
    "/available-months",
    response_model=List[str],
    summary="Danh sách các tháng có lịch trực",
    description="Trả về danh sách các tháng có lịch trực theo nhóm quyền của người dùng."
)
def api_get_available_months(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    can_help, can_app = check_hotline_access(current_user)
    if not can_help and not can_app:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập vào phân hệ Lịch Trực Hotline."
        )

    if can_help and can_app:
        return get_available_months(db)
    elif can_help:
        return get_available_months(db, "HELP")
    else:
        return get_available_months(db, "APP")


@router.post(
    "/upload",
    response_model=LichTrucMonthResponse,
    summary="Thêm hoặc cập nhật hình ảnh lịch trực (Admin)",
    description="Chỉ tài khoản Admin mới có quyền tải lên / dán hình ảnh lịch trực cho Helpdesk hoặc IT App."
)
@router.post(
    "/upload-image",
    response_model=LichTrucMonthResponse,
    summary="Thêm hoặc cập nhật hình ảnh lịch trực - Alias (Admin)",
    description="Alias route tương thích với frontend /hotline/upload-image"
)
def api_upload_schedule_image(
    payload: LichTrucUploadPayload,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    if not payload.thang or not payload.thang.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chọn tháng áp dụng lịch trực."
        )
    if not payload.team or not payload.team.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chỉ định nhóm trực (HELP hoặc APP)."
        )
    has_single = bool(payload.image_data and payload.image_data.strip())
    has_multiple = bool(payload.images_data and len(payload.images_data) > 0)
    if not has_single and not has_multiple:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Danh sách hình ảnh không được để trống."
        )

    try:
        updated_schedule = save_hotline_image(
            db=db,
            thang=payload.thang,
            team=payload.team,
            image_data=payload.image_data,
            images_data=payload.images_data,
            current_username=current_user.username
        )
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="LICH_TRUC_HOTLINE",
            hanh_dong="UPDATE",
            noi_dung=f"Cập nhật lịch trực hotline tháng {payload.thang} (Nhóm: {payload.team})",
            user_thuchien=current_user.username,
            current_user=current_user
        )
        return updated_schedule
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )


@router.delete(
    "/schedule",
    response_model=MessageResponse,
    summary="Xóa lịch trực hotline theo tháng và nhóm (Admin)",
    description="Chỉ tài khoản Admin mới có quyền xóa lịch trực."
)
def api_delete_schedule(
    month: str = Query(..., description="Tháng cần xóa (1 - 12)"),
    team: str = Query(..., description="Nhóm trực (HELP hoặc APP)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    success = delete_hotline_schedule(
        db=db,
        thang=month,
        team=team,
        current_username=current_user.username
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy lịch trực của nhóm {team} trong tháng {month}."
        )

    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="LICH_TRUC_HOTLINE",
        hanh_dong="DELETE",
        noi_dung=f"Xóa lịch trực hotline tháng {month} (Nhóm: {team})",
        user_thuchien=current_user.username,
        current_user=current_user
    )

    return MessageResponse(message=f"Đã xóa thành công lịch trực của nhóm {team} trong tháng {month}.")


@router.delete(
    "/schedule/{month}/{team}",
    response_model=MessageResponse,
    summary="Xóa lịch trực hotline theo path param (Admin)",
    description="Alias route tương thích với frontend /hotline/schedule/{month}/{team}"
)
def api_delete_schedule_by_path(
    month: str,
    team: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    return api_delete_schedule(month=month, team=team, db=db, current_user=current_user)
