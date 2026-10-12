from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserInfo, MessageResponse
from app.schemas.theodoi_pr_po_do import (
    PrPoDoItem,
    PrPoDoCreate,
    PrPoDoUpdate,
    PrPoDoListResponse,
)
from app.services.theodoi_pr_po_do_service import (
    get_pr_po_do_list,
    create_pr_po_do,
    update_pr_po_do,
    delete_pr_po_do,
    get_deleted_pr_po_do_list,
    restore_pr_po_do,
    export_pr_po_do_excel,
)
from app.api.deps import get_current_user
from app.services.auth_service import is_admin_user
from app.services.log_service import LogService

router = APIRouter(prefix="/pr-po-do", tags=["Theo Dõi PR - PO - DO"])


def verify_pr_po_do_permission(user: UserInfo):
    """
    Kiểm tra quyền truy cập vào phân hệ Theo Dõi PR - PO - DO.
    """
    if is_admin_user(user):
        return True

    roles = [r.lower() for r in (user.roles or [])]
    phanquyen = str(user.phanquyen or "").strip().lower()

    if "inventory" in roles or "inv" in roles or phanquyen in ["4", "inventory"] or "inventory" in phanquyen:
        return True
    if "helpdesk" in roles or phanquyen in ["3", "helpdesk"] or "helpdesk" in phanquyen:
        return True
    if "app" in roles or phanquyen in ["2", "app"] or "app" in phanquyen:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền truy cập vào phân hệ Theo Dõi PR - PO - DO."
    )


@router.get(
    "",
    response_model=PrPoDoListResponse,
    summary="Lấy danh sách chứng từ PR-PO-DO",
    description="Truy vấn danh sách đơn mua sắm/giao nhận có phân trang, bộ lọc loại/trạng thái và thống kê."
)
def api_get_pr_po_do_list(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Số, Nội dung, Ghi chú"),
    loai: Optional[str] = Query(None, description="Lọc theo loại: ALL, PR, PO, DO"),
    trangthai: Optional[str] = Query(None, description="Lọc trạng thái: ALL, PENDING, BU, FC, MD, DONE"),
    sort_by_date: str = Query("desc", description="Sắp xếp theo ngày: desc hoặc asc"),
    page: int = Query(1, ge=1, description="Trang hiện tại"),
    page_size: int = Query(50, ge=10, le=200, description="Số dòng mỗi trang"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    return get_pr_po_do_list(
        db=db,
        search=search,
        loai=loai,
        trangthai=trangthai,
        sort_by_date=sort_by_date,
        page=page,
        page_size=page_size
    )


@router.post(
    "",
    response_model=PrPoDoItem,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo dòng chứng từ mới",
    description="Thêm nhanh một dòng đơn PR/PO/DO mới trên bảng tính."
)
def api_create_pr_po_do(
    payload: PrPoDoCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    res = create_pr_po_do(db=db, payload=payload)
    LogService.record_log(
        db=db,
        nhom_quyen="INVENTORY",
        man_hinh="THEO_DOI_PR_PO_DO",
        hanh_dong="INSERT",
        mo_ta=f"Tạo dòng chứng từ mới {payload.loai or ''} - Số: {payload.so_pr_po_do or ''}",
        current_user=current_user
    )
    return res


@router.get(
    "/deleted",
    response_model=List[PrPoDoItem],
    summary="Danh sách 50 dòng đã xóa gần đây",
    description="Hiển thị danh sách tối đa 50 chứng từ đã bị xóa gần nhất để người dùng kiểm tra hoặc khôi phục."
)
def api_get_deleted_pr_po_do_list(
    search: Optional[str] = Query(None, description="Tìm kiếm theo Số, Nội dung, Ghi chú"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    return get_deleted_pr_po_do_list(db=db, search=search, limit=50)


@router.post(
    "/{item_id}/restore",
    response_model=PrPoDoItem,
    summary="Khôi phục dòng chứng từ đã xóa",
    description="Phục hồi chứng từ đã bị xóa về lại danh sách hoạt động."
)
def api_restore_pr_po_do(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    restored = restore_pr_po_do(db=db, item_id=item_id)
    if not restored:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chứng từ đã xóa có ID {item_id} để khôi phục."
        )
    LogService.record_log(
        db=db,
        nhom_quyen="INVENTORY",
        man_hinh="THEO_DOI_PR_PO_DO",
        hanh_dong="UPDATE",
        mo_ta=f"Khôi phục chứng từ ID {item_id}",
        current_user=current_user
    )
    return restored


@router.patch(
    "/{item_id}",
    response_model=PrPoDoItem,
    summary="Cập nhật inline từng ô chứng từ (Autosave)",
    description="Chỉnh sửa trực tiếp từng ô dữ liệu như trên bảng tính Google Sheets."
)
def api_update_pr_po_do(
    item_id: int,
    payload: PrPoDoUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    updated = update_pr_po_do(db=db, item_id=item_id, payload=payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy bản ghi chứng từ có ID {item_id}."
        )
    LogService.record_log(
        db=db,
        nhom_quyen="INVENTORY",
        man_hinh="THEO_DOI_PR_PO_DO",
        hanh_dong="UPDATE",
        mo_ta=f"Cập nhật chứng từ ID {item_id}",
        current_user=current_user
    )
    return updated


@router.delete(
    "/{item_id}",
    response_model=MessageResponse,
    summary="Xóa dòng chứng từ",
    description="Xóa chứng từ khỏi bảng theo dõi."
)
def api_delete_pr_po_do(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    success = delete_pr_po_do(db=db, item_id=item_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy bản ghi chứng từ có ID {item_id}."
        )
    LogService.record_log(
        db=db,
        nhom_quyen="INVENTORY",
        man_hinh="THEO_DOI_PR_PO_DO",
        hanh_dong="DELETE",
        mo_ta=f"Xóa chứng từ ID {item_id}",
        current_user=current_user
    )
    return MessageResponse(message=f"Đã xóa thành công chứng từ ID {item_id}.")


@router.get(
    "/export",
    summary="Xuất danh sách PR-PO-DO ra file Excel",
    description="Tải về file Excel chứa danh sách các đơn theo đúng điều kiện tìm kiếm và bộ lọc hiện tại."
)
def api_export_pr_po_do_excel(
    search: Optional[str] = Query(None),
    loai: Optional[str] = Query(None),
    trangthai: Optional[str] = Query(None),
    sort_by_date: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    verify_pr_po_do_permission(current_user)
    excel_stream = export_pr_po_do_excel(
        db=db,
        search=search,
        loai=loai,
        trangthai=trangthai,
        sort_by_date=sort_by_date
    )
    filename = f"Theo_Doi_PR_PO_DO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
