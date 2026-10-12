from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserInfo, MessageResponse
from app.schemas.code_photo import (
    CodePhotoItem,
    CodePhotoCreate,
    CodePhotoUpdate,
    CodePhotoListResponse,
    CodePhotoStats,
)
from app.services.code_photo_service import (
    get_code_photo_list,
    get_code_photo_stats,
    create_code_photo,
    update_code_photo,
    delete_code_photo,
    check_email_exists,
    export_code_photo_excel,
)
from app.api.deps import get_current_user
from app.services.auth_service import is_admin_user
from app.services.log_service import LogService

router = APIRouter(prefix="/code-photo", tags=["Helpdesk - Code Photo"])


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
        detail="Bạn không có quyền truy cập vào danh mục Code Photo."
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
        detail="Chỉ nhóm quyền Helpdesk hoặc Quản trị viên mới có quyền thêm/sửa/xóa Code Photo."
    )


@router.get(
    "",
    response_model=CodePhotoListResponse,
    summary="Lấy danh sách Code Photo",
    description="Truy vấn danh sách mã máy photo có bộ lọc hiện trạng (ON/OFF/ALL), tìm kiếm và phân trang."
)
def api_get_code_photo_list(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên, Email, Pass Code, Mã NV, Bộ phận"),
    hientrang: Optional[str] = Query(None, description="Lọc theo hiện trạng: ALL, ON, OFF"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(50, ge=10, le=200, description="Số dòng mỗi trang"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_read(current_user)
    return get_code_photo_list(
        db=db,
        search=search,
        hientrang=hientrang,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/stats",
    response_model=CodePhotoStats,
    summary="Thống kê số lượng Code Photo",
    description="Lấy tổng số lượng, số mã ON và số mã OFF."
)
def api_get_code_photo_stats(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_read(current_user)
    return get_code_photo_stats(db=db)


@router.post(
    "",
    response_model=CodePhotoItem,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới Code Photo",
    description="Cấp mã code máy photocopy cho nhân viên mới."
)
def api_create_code_photo(
    payload: CodePhotoCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_write(current_user)
    if check_email_exists(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' đã được cấp Code Photo trước đó trong hệ thống!"
        )

    res = create_code_photo(
        db=db,
        payload=payload,
        username=current_user.username,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="INSERT",
            mo_ta=f"Tạo mới Code Photo: {payload.name or ''} ({payload.email or payload.manv or ''})",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.put(
    "/{item_id}",
    response_model=CodePhotoItem,
    summary="Cập nhật Code Photo",
    description="Chỉnh sửa thông tin Code Photo (Đổi mật khẩu, chuyển hiện trạng ON/OFF, v.v.)."
)
def api_update_code_photo(
    item_id: int,
    payload: CodePhotoUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_write(current_user)
    if payload.email and check_email_exists(db, payload.email, exclude_id=item_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' đã trùng với nhân viên khác trong hệ thống Code Photo!"
        )

    updated = update_code_photo(
        db=db,
        item_id=item_id,
        payload=payload,
        username=current_user.username,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Code Photo có ID {item_id}."
        )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật Code Photo (ID={item_id}): {updated.name or ''} ({updated.email or ''})",
            current_user=current_user,
        )
    except Exception:
        pass
    return updated


@router.delete(
    "/{item_id}",
    response_model=MessageResponse,
    summary="Xóa Code Photo",
    description="Xóa Code Photo của nhân viên khỏi hệ thống."
)
def api_delete_code_photo(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_write(current_user)
    success = delete_code_photo(
        db=db,
        item_id=item_id,
        username=current_user.username,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy Code Photo có ID {item_id}."
        )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="DELETE",
            mo_ta=f"Xóa Code Photo (ID={item_id})",
            current_user=current_user,
        )
    except Exception:
        pass
    return MessageResponse(message="Đã xóa Code Photo thành công.")


@router.get(
    "/export",
    summary="Xuất danh sách Code Photo ra file Excel (.xlsx)",
    description="Xuất danh sách Code Photo theo bộ lọc hiện trạng và tìm kiếm."
)
def api_export_code_photo_excel(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Tên, Email, Pass Code, Mã NV, Bộ phận"),
    hientrang: Optional[str] = Query(None, description="Lọc theo hiện trạng: ALL, ON, OFF"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_helpdesk_read(current_user)
    excel_stream = export_code_photo_excel(db=db, search=search, hientrang=hientrang)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Danh_Sach_Code_Photo_{timestamp}.xlsx"

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
