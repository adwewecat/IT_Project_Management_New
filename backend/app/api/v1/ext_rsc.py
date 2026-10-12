from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserInfo, MessageResponse
from app.schemas.ext_rsc import (
    ExtRscItem,
    ExtRscCreate,
    ExtRscUpdate,
    ExtRscListResponse,
)
from app.services.ext_rsc_service import (
    get_ext_rsc_list,
    create_ext_rsc,
    update_ext_rsc,
    delete_ext_rsc,
    export_ext_rsc_excel,
)
from app.api.deps import get_current_user
from app.services.auth_service import is_admin_user
from app.services.log_service import LogService

router = APIRouter(prefix="/ext-rsc", tags=["Helpdesk - EXT RSC"])


def verify_helpdesk_read(user: UserInfo):
    if is_admin_user(user):
        return True
    roles = [r.lower() for r in (user.roles or [])]
    phanquyen = str(user.phanquyen or "").strip().lower()

    if "helpdesk" in roles or phanquyen in ["3", "helpdesk"] or "helpdesk" in phanquyen:
        return True
    if "app" in roles or phanquyen in ["2", "app"] or "app" in phanquyen:
        return True
    if "inventory" in roles or "inv" in roles or phanquyen in ["4", "inventory"] or "inventory" in phanquyen:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền truy cập vào danh bạ EXT RSC."
    )


def verify_helpdesk_write(user: UserInfo):
    if is_admin_user(user):
        return True
    roles = [r.lower() for r in (user.roles or [])]
    phanquyen = str(user.phanquyen or "").strip().lower()

    if "helpdesk" in roles or phanquyen in ["3", "helpdesk"] or "helpdesk" in phanquyen:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Chỉ nhóm quyền Helpdesk hoặc Quản trị viên mới có quyền thêm/sửa/xóa số EXT."
    )


@router.get(
    "",
    response_model=ExtRscListResponse,
    summary="Lấy danh sách số máy nhánh EXT RSC",
    description="Truy vấn danh bạ EXT RSC có tìm kiếm và phân trang."
)
def api_get_ext_rsc_list(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên, Email, Số EXT, Mã NV, Phòng ban"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(50, ge=10, le=200, description="Số dòng mỗi trang"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_read(current_user)
    return get_ext_rsc_list(
        db=db,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.post(
    "",
    response_model=ExtRscItem,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới số máy nhánh EXT RSC",
    description="Thêm mới một số máy nhánh và thông tin nhân viên."
)
def api_create_ext_rsc(
    payload: ExtRscCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_write(current_user)
    res = create_ext_rsc(
        db=db,
        payload=payload,
        username=current_user.username,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="INSERT",
            mo_ta=f"Thêm số máy nhánh EXT RSC: {payload.so_ext or ''} - {payload.name or ''}",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.put(
    "/{item_id}",
    response_model=ExtRscItem,
    summary="Cập nhật số máy nhánh EXT RSC",
    description="Chỉnh sửa thông tin số máy nhánh EXT RSC."
)
def api_update_ext_rsc(
    item_id: int,
    payload: ExtRscUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_write(current_user)
    updated = update_ext_rsc(
        db=db,
        item_id=item_id,
        payload=payload,
        username=current_user.username,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy số EXT có ID {item_id}."
        )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật số máy nhánh EXT RSC (ID={item_id}): {updated.so_ext or ''} - {updated.name or ''}",
            current_user=current_user,
        )
    except Exception:
        pass
    return updated


@router.delete(
    "/{item_id}",
    response_model=MessageResponse,
    summary="Xóa số máy nhánh EXT RSC",
    description="Xóa số máy nhánh khỏi hệ thống."
)
def api_delete_ext_rsc(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_write(current_user)
    success = delete_ext_rsc(
        db=db,
        item_id=item_id,
        username=current_user.username,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy số EXT có ID {item_id}."
        )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="DELETE",
            mo_ta=f"Xóa số máy nhánh EXT RSC (ID={item_id})",
            current_user=current_user,
        )
    except Exception:
        pass
    return MessageResponse(message="Đã xóa số máy nhánh EXT RSC thành công.")


@router.get(
    "/export",
    summary="Xuất danh sách EXT RSC ra file Excel (.xlsx)",
    description="Xuất danh sách số máy nhánh theo từ khóa tìm kiếm hiện tại."
)
def api_export_ext_rsc_excel(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên, Email, Số EXT, Mã NV"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_read(current_user)
    excel_stream = export_ext_rsc_excel(db=db, search=search)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Danh_Sach_EXT_RSC_{timestamp}.xlsx"

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
