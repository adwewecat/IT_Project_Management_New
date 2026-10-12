from typing import Optional, List
from datetime import datetime
import urllib.parse
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin
from app.schemas.auth import UserInfo
from app.schemas.setup_restaurant import (
    SetupRestaurantCreate,
    SetupRestaurantUpdate,
    SetupRestaurantOut,
    SetupRestaurantReviewRequest,
    SetupRestaurantListResponse,
    RestaurantChecklistResponse,
    ChecklistItemOut,
    ChecklistItemUpdate,
    ChecklistItemCreate,
    ChecklistBulkUpdateRequest,
    NextItSetupRestaurantResponse,
    ChecklistMasterResponse,
    ChecklistMasterItemOut,
    ChecklistMasterItemCreate,
    ChecklistMasterItemUpdate,
    ChecklistMasterGroupUpdate,
)
from app.services.setup_restaurant_service import (
    get_setup_restaurants,
    get_setup_restaurant_by_id,
    create_setup_restaurant,
    update_setup_restaurant,
    delete_setup_restaurant,
    review_setup_restaurant,
    get_restaurant_checklist,
    update_checklist_item,
    bulk_update_checklist_items,
    add_checklist_item,
    delete_checklist_item,
    export_restaurant_checklist_excel,
    generate_checklist_template_excel,
    import_checklist_from_excel,
    get_next_it_setup_restaurant,
    get_master_checklist,
    create_master_checklist_item,
    update_master_checklist_item,
    delete_master_checklist_item,
    update_master_checklist_group,
)
from app.services.memo_service import get_app_users
from app.services.auth_service import is_admin_user
from app.services.log_service import log_service

router = APIRouter(prefix="/setup-restaurants", tags=["App - Setup Nhà Hàng Mới"])


def _is_admin_user(user: UserInfo) -> bool:
    return is_admin_user(user)


@router.get("", response_model=SetupRestaurantListResponse)
def get_restaurants_endpoint(
    status_filter: Optional[str] = Query(None, alias="status", description="'Mới - Đang Setup', 'Đã Hoàn Thành', hoặc 'all'"),
    search: Optional[str] = Query(None, description="Tìm theo tên nhà hàng, AM, IT hoặc ghi chú"),
    it_phutrach: Optional[str] = Query(None, description="Lọc theo tên IT phụ trách"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    return get_setup_restaurants(
        db=db,
        status_filter=status_filter,
        search=search,
        it_phutrach=it_phutrach,
        page=page,
        page_size=page_size
    )


@router.get("/it-users")
def get_it_users_endpoint(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách tài khoản IT App để chọn IT phụ trách"""
    return get_app_users(db)


@router.get("/next-it-setup", response_model=NextItSetupRestaurantResponse)
def get_next_it_setup_endpoint(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy thông tin nhân sự IT xoay vòng (Round-Robin) tiếp theo cho nhà hàng setup mới"""
    return get_next_it_setup_restaurant(db)


@router.post("", response_model=SetupRestaurantOut, status_code=status.HTTP_201_CREATED)
def create_restaurant_endpoint(
    payload: SetupRestaurantCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    is_admin = _is_admin_user(current_user)
    res = create_setup_restaurant(db, payload, current_user.username, is_admin=is_admin)
    log_service.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="SETUP_RESTAURANT",
        hanh_dong="CREATE",
        noi_dung=f"Tạo mới nhà hàng setup: {res.ten_nh} (Brand: {res.brand}, IT phụ trách: {res.it_phutrach})",
        user_thuchien=current_user.username,
        current_user=current_user,
    )
    return res


@router.get("/checklist-master", response_model=ChecklistMasterResponse)
def get_master_checklist_endpoint(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy checklist chuẩn Master (SOP tham khảo) phân theo từng mục lớn để tra cứu."""
    return get_master_checklist(db)


@router.post("/checklist-master", response_model=ChecklistMasterItemOut, status_code=status.HTTP_201_CREATED)
def create_master_checklist_item_endpoint(
    payload: ChecklistMasterItemCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Quản trị viên và Super Admin mới có quyền thêm hạng mục Sổ tay SOP")
    try:
        res = create_master_checklist_item(db, payload)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="CREATE_SOP_ITEM",
            noi_dung=f"Thêm bước mới vào Sổ tay SOP [{res.nhom}]: {res.noidung}",
            user_thuchien=current_user.username,
            current_user=current_user,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi thêm bước SOP: {str(e)}")


@router.put("/checklist-master/group")
def update_master_checklist_group_endpoint(
    payload: ChecklistMasterGroupUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Quản trị viên và Super Admin mới có quyền đổi tên nhóm Sổ tay SOP")
    try:
        updated_count = update_master_checklist_group(db, payload.old_nhom, payload.new_nhom)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="UPDATE_SOP_GROUP",
            noi_dung=f"Đổi tên mục lớn Sổ tay SOP: '{payload.old_nhom}' -> '{payload.new_nhom}' ({updated_count} bước)",
            user_thuchien=current_user.username,
            current_user=current_user,
        )
        return {"success": True, "updated_count": updated_count, "message": f"Đã đổi tên mục lớn thành công ({updated_count} bước)!"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi đổi tên nhóm SOP: {str(e)}")


@router.put("/checklist-master/{item_id}", response_model=ChecklistMasterItemOut)
def update_master_checklist_item_endpoint(
    item_id: int,
    payload: ChecklistMasterItemUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Quản trị viên và Super Admin mới có quyền sửa hạng mục Sổ tay SOP")
    try:
        res = update_master_checklist_item(db, item_id, payload)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="UPDATE_SOP_ITEM",
            noi_dung=f"Sửa bước Sổ tay SOP #{item_id} [{res.nhom}]: {res.noidung}",
            user_thuchien=current_user.username,
            current_user=current_user,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi cập nhật bước SOP: {str(e)}")


@router.delete("/checklist-master/{item_id}")
def delete_master_checklist_item_endpoint(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if not _is_admin_user(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chỉ Quản trị viên và Super Admin mới có quyền xóa hạng mục Sổ tay SOP")
    try:
        delete_master_checklist_item(db, item_id)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="DELETE_SOP_ITEM",
            noi_dung=f"Xóa bước Sổ tay SOP #{item_id}",
            user_thuchien=current_user.username,
            current_user=current_user,
        )
        return {"success": True, "message": "Đã xóa bước SOP thành công!"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi xóa bước SOP: {str(e)}")


@router.get("/{res_id}", response_model=SetupRestaurantOut)
def get_restaurant_detail_endpoint(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    res = get_setup_restaurant_by_id(db, res_id)
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng mới tương ứng")
    return res


@router.put("/{res_id}", response_model=SetupRestaurantOut)
def update_restaurant_endpoint(
    res_id: int,
    payload: SetupRestaurantUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        is_admin = _is_admin_user(current_user)
        res = update_setup_restaurant(db, res_id, payload, current_user.username, is_admin=is_admin)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="UPDATE",
            noi_dung=f"Cập nhật thông tin setup nhà hàng: {res.ten_nh} (Trạng thái: {res.trangthai})",
            user_thuchien=current_user.username,
            current_user=current_user,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{res_id}")
def delete_restaurant_endpoint(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    old_res = get_setup_restaurant_by_id(db, res_id)
    ten_nh = old_res.ten_nh if old_res else f"ID {res_id}"
    success = delete_setup_restaurant(db, res_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhà hàng mới tương ứng")
    log_service.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="SETUP_RESTAURANT",
        hanh_dong="DELETE",
        noi_dung=f"Xóa nhà hàng setup: {ten_nh}",
        user_thuchien=current_user.username,
        current_user=current_user,
    )
    return {"success": True, "message": "Đã xóa nhà hàng thành công"}


@router.get("/{res_id}/checklist", response_model=RestaurantChecklistResponse)
def get_checklist_endpoint(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        return get_restaurant_checklist(db, res_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/checklist/{detail_id}")
def update_checklist_item_endpoint(
    detail_id: int,
    payload: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        updated_item, new_status = update_checklist_item(db, detail_id, payload, current_user.username)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật task checklist #{detail_id} -> {'Hoàn thành' if payload.is_completed else 'Chưa xong'}",
            current_user=current_user,
        )
        return {
            "success": True,
            "item": updated_item,
            "restaurant_status": new_status
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{res_id}/checklist/bulk-toggle")
def bulk_toggle_checklist_endpoint(
    res_id: int,
    payload: ChecklistBulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Đánh dấu hoàn thành hoặc bỏ hoàn thành hàng loạt task trong checklist nhà hàng:
    - Nếu group_name được truyền (VD: 'RK7-MANAGER'), chỉ cập nhật các mục trong nhóm đó.
    - Nếu group_name là None hoặc 'ALL', cập nhật toàn bộ checklist nhà hàng.
    """
    try:
        updated_count, new_status = bulk_update_checklist_items(
            db,
            res_id,
            is_completed=payload.is_completed,
            username=current_user.username,
            group_name=payload.group_name,
            item_ids=payload.item_ids,
            completed_date=payload.completed_date,
            note=payload.note
        )
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật hàng loạt {updated_count} tasks checklist nhà hàng ID {res_id}",
            current_user=current_user,
        )
        return {
            "success": True,
            "updated_count": updated_count,
            "restaurant_status": new_status,
            "message": f"Đã cập nhật {updated_count} hạng mục checklist thành công!"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{res_id}/checklist", status_code=status.HTTP_201_CREATED)
def add_checklist_item_endpoint(
    res_id: int,
    payload: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """
    Thêm task / hạng mục mới vào checklist nhà hàng (dành riêng cho Admin / Super Admin).
    Có thể thêm vào nhóm lớn có sẵn hoặc tạo nhóm lớn mới.
    """
    try:
        new_item, new_status = add_checklist_item(db, res_id, payload, current_user.username)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="INSERT",
            mo_ta=f"Thêm task checklist mới cho nhà hàng ID {res_id}: {payload.noidung}",
            current_user=current_user,
        )
        return {
            "success": True,
            "item": new_item,
            "restaurant_status": new_status,
            "message": "Đã thêm hạng mục checklist thành công!"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi thêm hạng mục checklist: {str(e)}")


@router.get("/checklist/template-excel")
def download_checklist_template_endpoint():
    """
    Tải file Excel mẫu để import công việc / task vào checklist.
    """
    excel_stream, filename = generate_checklist_template_excel()
    quoted_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quoted_filename}",
            "Access-Control-Expose-Headers": "Content-Disposition"
        }
    )


@router.delete("/checklist/{detail_id}")
def delete_checklist_item_endpoint(
    detail_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """
    Xóa hạng mục checklist khỏi nhà hàng (dành riêng cho Admin / Super Admin).
    """
    try:
        success, new_status = delete_checklist_item(db, detail_id, current_user.username)
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="DELETE",
            mo_ta=f"Xóa task checklist ID {detail_id}",
            current_user=current_user,
        )
        return {
            "success": True,
            "restaurant_status": new_status,
            "message": "Đã xóa hạng mục checklist thành công!"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xóa hạng mục checklist: {str(e)}")


@router.post("/{res_id}/checklist/import-excel")
async def import_checklist_excel_endpoint(
    res_id: int,
    file: UploadFile = File(...),
    save_to_master: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """
    Import file Excel để thêm nhanh nhiều task/nhóm vào checklist nhà hàng (Admin / Super Admin only).
    """
    if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ file Excel có định dạng .xlsx hoặc .xls")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File tải lên không có dữ liệu (file rỗng)")

    try:
        result = import_checklist_from_excel(
            db=db,
            res_id=res_id,
            file_bytes=content,
            save_to_master=save_to_master,
            username=current_user.username
        )
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="IMPORT",
            mo_ta=f"Import checklist từ Excel ({file.filename}) cho nhà hàng ID {res_id}",
            current_user=current_user,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi import file Excel checklist: {str(e)}")


@router.get("/{res_id}/checklist/export")
def export_checklist_excel_endpoint(
    res_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        excel_stream, filename = export_restaurant_checklist_excel(db, res_id)
        quoted_filename = urllib.parse.quote(filename)
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=\"checklist_setup.xlsx\"; filename*=UTF-8''{quoted_filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi xuất file Excel: {str(e)}")


@router.put("/{res_id}/review", response_model=SetupRestaurantOut)
def review_setup_restaurant_endpoint(
    res_id: int,
    payload: SetupRestaurantReviewRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """
    Đánh giá nhà hàng mới (OK / Fail / Reset) - Dành riêng cho Quản trị viên & Super Admin
    """
    try:
        reviewer_name = current_user.full_name or current_user.username
        res = review_setup_restaurant(
            db,
            res_id=res_id,
            review_status=payload.review_status,
            review_note=payload.review_note,
            username=reviewer_name
        )
        log_service.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="SETUP_RESTAURANT",
            hanh_dong="UPDATE",
            mo_ta=f"Đánh giá setup nhà hàng ID {res_id}: {payload.review_status} (Ghi chú: {payload.review_note or 'Không'})",
            current_user=current_user,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đánh giá nhà hàng mới: {str(e)}")
