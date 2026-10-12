from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.schemas.auth import UserInfo
from app.schemas.logs import (
    LogListResponse,
    LogCreateRequest,
    LogItemResponse,
    LogPurgeRequest,
    LogPurgeResponse,
)
from app.services.log_service import log_service
from app.services.auth_service import is_super_admin_user, is_admin_user

router = APIRouter(prefix="/logs", tags=["Báo Cáo Logs Tập Trung"])


@router.get("", response_model=LogListResponse)
def get_centralized_logs(
    nhom_quyen: Optional[str] = Query(None, description="Nhóm logs: APP, INVENTORY, HELPDESK, QUAN_TRI, ALL"),
    man_hinh: Optional[str] = Query(None, description="Lọc theo màn hình"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm trong nội dung, hành động, user"),
    user_thuchien: Optional[str] = Query(None, description="Lọc theo người thực hiện"),
    start_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(50, ge=1, le=200, description="Số dòng mỗi trang"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Truy vấn báo cáo logs tập trung:
    - Nếu chỉ có quyền app thì chỉ xem được nhóm APP.
    - Nếu quyền inventory thì chỉ xem được nhóm INVENTORY.
    - Nếu quyền helpdesk thì chỉ xem được nhóm HELPDESK.
    - Quản trị và Super Admin thì xem được tất cả các nhóm.
    """
    return log_service.get_logs(
        db=db,
        current_user=current_user,
        nhom_quyen=nhom_quyen,
        man_hinh=man_hinh,
        search=search,
        user_thuchien=user_thuchien,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )


@router.get("/user-permission")
def get_user_log_permissions(
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy danh sách nhóm logs mà user hiện tại được phép truy cập và nhóm mặc định."""
    allowed_groups, default_group = log_service.get_user_allowed_groups(current_user)
    is_admin = is_admin_user(current_user)
    is_super = is_super_admin_user(current_user)

    return {
        "username": current_user.username,
        "allowed_groups": allowed_groups,
        "default_group": default_group,
        "can_view_all": is_admin or is_super,
        "is_super_admin": is_super,
    }


@router.post("", response_model=Optional[LogItemResponse])
def create_centralized_log(
    payload: LogCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Tạo bản ghi log mới vào LOGS__New.
    Nếu user là Super Admin thao tác thì tự động bỏ qua không lưu logs.
    """
    client_ip = request.client.host if request.client else None
    user_name = current_user.username or "UNKNOWN"
    user_role = str(current_user.phanquyen or "")

    entry = log_service.record_log(
        db=db,
        nhom_quyen=payload.nhom_quyen,
        man_hinh=payload.man_hinh,
        hanh_dong=payload.hanh_dong or "ACTION",
        noi_dung=payload.noi_dung or "",
        user_thuchien=user_name,
        user_role=user_role,
        ip_client=client_ip,
        status=payload.status or "SUCCESS",
        du_lieu_cu=payload.du_lieu_cu,
        du_lieu_moi=payload.du_lieu_moi,
        current_user=current_user,
    )

    if entry is None:
        return None

    return LogItemResponse.model_validate(entry)


@router.post("/purge", response_model=LogPurgeResponse)
def purge_old_logs(
    payload: LogPurgeRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """
    Dọn dẹp logs cũ hơn N năm (mặc định 3 năm) để tối ưu dung lượng DB.
    Chỉ Quản trị viên (Admin / Super Admin) mới có quyền thực thi.
    """
    try:
        deleted = log_service.purge_old_logs(db=db, years=payload.years)
        return LogPurgeResponse(
            success=True,
            deleted_count=deleted,
            message=f"Đã dọn dẹp thành công {deleted} bản ghi log cũ hơn {payload.years} năm.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi dọn dẹp logs cũ: {str(e)}",
        )
