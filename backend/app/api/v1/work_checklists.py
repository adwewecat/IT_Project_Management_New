import urllib.parse
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.work_checklist import (
    ChecklistTemplateSchema,
    ChecklistTemplateCreate,
    ChecklistTemplateUpdate,
    ChecklistTemplateItemSchema,
    ChecklistTemplateItemCreate,
    ChecklistTemplateItemBatchCreate,
    ChecklistRunSchema,
    ChecklistRunCreate,
    ChecklistRunUpdate,
    ChecklistRunItemSchema,
    ChecklistRunItemUpdate,
    ChecklistRunDetailResponse,
    ChecklistRunListResponse,
    AppUserOptionSchema,
)
from app.services import work_checklist_service
from app.services.log_service import LogService

router = APIRouter(prefix="/work-checklists", tags=["Checklist Các Công Việc"])


def check_admin_or_superadmin(user: UserInfo):
    """Kiểm tra quyền: Chỉ Admin (phanquyen=1) hoặc Super Admin (phanquyen=0 / dung.nguyenanh) mới được phép."""
    roles = [r.lower() for r in (user.roles or [])]
    pq = str(user.phanquyen or "").strip()
    username = (user.username or "").lower()
    is_admin = (
        user.is_super_admin
        or username in ("admin", "administrator", "dung.nguyenanh")
        or pq in ("0", "1")
        or "admin" in roles
        or "superadmin" in roles
        or "super admin" in roles
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản Quản Trị Viên (Admin) mới có quyền thực hiện thao tác này."
        )


# ==========================================
# 1. APP USERS (ĐỂ GÁN VIỆC CHO USER APP)
# ==========================================

@router.get("/app-users", response_model=List[AppUserOptionSchema])
def list_app_users(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy danh sách các user app / IT để gán quyền phụ trách kiểm thử."""
    return work_checklist_service.get_app_users(db)


# ==========================================
# 2. TEMPLATES (SƯỜN CHECKLIST)
# ==========================================

@router.get("/templates", response_model=List[ChecklistTemplateSchema])
def list_templates(
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên sườn, danh mục"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy danh sách các sườn checklist mẫu."""
    return work_checklist_service.get_templates(db=db, search=search)


@router.get("/templates/sample-template")
def download_sample_template(
    current_user: UserInfo = Depends(get_current_user),
):
    """Tải file Excel mẫu 3 cột chuẩn (Mẹ, Cấp 2, Cấp 3)."""
    stream, filename = work_checklist_service.generate_template_sample_excel()
    encoded = urllib.parse.quote(filename)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"}
    )


@router.get("/templates/export")
def export_templates(
    template_ids: Optional[str] = Query(None, description="Danh sách ID mẫu cách nhau bởi dấu phẩy"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Xuất các Checklist Mẫu ra file Excel theo chuẩn 3 cột: Mẹ, Cấp 2, Cấp 3."""
    ids = [int(i.strip()) for i in template_ids.split(",") if i.strip().isdigit()] if template_ids else None
    stream, filename = work_checklist_service.export_templates_excel(db, ids)
    encoded = urllib.parse.quote(filename)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"}
    )


@router.post("/templates/import")
async def import_templates(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Nhập hàng loạt Checklist Mẫu từ file Excel 3 cột (Mẹ, Cấp 2, Cấp 3)."""
    if not file.filename or not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File không hợp lệ! Vui lòng tải lên file Excel định dạng .xlsx"
        )
    contents = await file.read()
    try:
        author = current_user.full_name or current_user.username
        res = work_checklist_service.import_templates_from_excel(db, contents, author)
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="CHECKLIST_CONG_VIEC",
            hanh_dong="IMPORT",
            noi_dung=f"Import file Excel checklist mẫu '{file.filename}': {res.get('message', '')}",
            user_thuchien=current_user.username,
            current_user=current_user
        )
        return res
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lỗi khi đọc file Excel: {str(e)}"
        )


@router.get("/templates/{template_id}", response_model=ChecklistTemplateSchema)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy chi tiết sườn checklist và danh sách các mục nhỏ."""
    return work_checklist_service.get_template_detail(db=db, template_id=template_id)


@router.post("/templates", response_model=ChecklistTemplateSchema, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: ChecklistTemplateCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Tạo mới một sườn checklist mẫu (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    tpl = work_checklist_service.create_template(
        db=db,
        payload=payload,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="INSERT",
        noi_dung=f"Tạo sườn checklist mẫu #{tpl.id}: '{payload.ten_suon}' (Mã: {payload.ma_suon or '-'})",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return tpl


@router.put("/templates/{template_id}", response_model=ChecklistTemplateSchema)
def update_template(
    template_id: int,
    payload: ChecklistTemplateUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Cập nhật thông tin sườn checklist (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    tpl = work_checklist_service.update_template(
        db=db,
        template_id=template_id,
        payload=payload,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="UPDATE",
        noi_dung=f"Cập nhật sườn checklist #{template_id}: '{payload.ten_suon or ''}'",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return tpl


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Xóa sườn checklist mẫu (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    work_checklist_service.delete_template(db=db, template_id=template_id)
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="DELETE",
        noi_dung=f"Xóa sườn checklist #{template_id}",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return {"success": True, "message": f"Đã xóa sườn #{template_id}"}


@router.post("/templates/{template_id}/items", response_model=ChecklistTemplateItemSchema, status_code=status.HTTP_201_CREATED)
def add_template_item(
    template_id: int,
    payload: ChecklistTemplateItemCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Thêm một mục nhỏ vào sườn checklist (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    return work_checklist_service.add_template_item(
        db=db,
        template_id=template_id,
        payload=payload,
    )


@router.post("/templates/{template_id}/items/batch", response_model=List[ChecklistTemplateItemSchema], status_code=status.HTTP_201_CREATED)
def batch_add_template_items(
    template_id: int,
    payload: ChecklistTemplateItemBatchCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Thêm nhiều mục vào sườn checklist (tách dòng từ danh sách text) (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    return work_checklist_service.batch_add_template_items(
        db=db,
        template_id=template_id,
        payload=payload,
    )


@router.delete("/templates/items/{item_id}")
def delete_template_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Xóa một mục nhỏ khỏi sườn checklist (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    work_checklist_service.delete_template_item(db=db, item_id=item_id)
    return {"success": True, "message": f"Đã xóa mục #{item_id}"}


# ==========================================
# 3. RUNS (CÁC ĐỢT CHECKLIST TEST HỆ THỐNG)
# ==========================================

@router.get("/runs", response_model=ChecklistRunListResponse)
def list_runs(
    search: Optional[str] = Query(None, description="Tìm kiếm tên đợt, version, người làm"),
    template_id: Optional[int] = Query(None, description="Lọc theo sườn checklist"),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái"),
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy danh sách các đợt checklist test hệ thống và thống kê tổng hợp."""
    return work_checklist_service.get_runs(
        db=db,
        search=search,
        template_id=template_id,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size,
    )


@router.get("/runs/export-excel")
def export_runs_excel_endpoint(
    search: Optional[str] = Query(None),
    template_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Xuất file Excel danh sách đợt checklist và thống kê version theo thời gian."""
    stream, filename = work_checklist_service.export_runs_excel(
        db=db,
        search=search,
        template_id=template_id,
        status_filter=status,
        from_date=from_date,
        to_date=to_date,
    )
    encoded_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.get("/runs/{run_id}", response_model=ChecklistRunDetailResponse)
def get_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy chi tiết một đợt checklist test và toàn bộ các mục kiểm tra con."""
    return work_checklist_service.get_run_detail(db=db, run_id=run_id)


@router.get("/runs/{run_id}/export-excel")
def export_single_run_excel(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Xuất file Excel chi tiết kết quả một đợt checklist test hệ thống."""
    stream, filename = work_checklist_service.export_run_detail_excel(db=db, run_id=run_id)
    encoded_filename = urllib.parse.quote(filename)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post("/runs", response_model=ChecklistRunSchema, status_code=status.HTTP_201_CREATED)
def create_run(
    payload: ChecklistRunCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Tạo một đợt checklist mới từ sườn mẫu (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    run = work_checklist_service.create_run(
        db=db,
        payload=payload,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="INSERT",
        noi_dung=f"Tạo đợt chạy checklist #{run.id}: '{payload.ten_dot}' (Version: {payload.version_test or '-'})",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return run


@router.put("/runs/{run_id}", response_model=ChecklistRunSchema)
def update_run(
    run_id: int,
    payload: ChecklistRunUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Cập nhật thông tin đợt checklist (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    run = work_checklist_service.update_run(
        db=db,
        run_id=run_id,
        payload=payload,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="UPDATE",
        noi_dung=f"Cập nhật đợt checklist #{run_id}: {payload.ten_dot or ''}",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return run


@router.delete("/runs/{run_id}")
def delete_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Xóa một đợt checklist (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    work_checklist_service.delete_run(db=db, run_id=run_id)
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="DELETE",
        noi_dung=f"Xóa đợt checklist #{run_id}",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return {"success": True, "message": f"Đã xóa đợt checklist #{run_id}"}


@router.put("/runs/items/{item_id}", response_model=ChecklistRunItemSchema)
def update_run_item(
    item_id: int,
    payload: ChecklistRunItemUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Cập nhật trạng thái (Đạt/Lỗi/Pending), ghi chú hoặc ảnh của một mục (Dành cho User App và Admin)."""
    res = work_checklist_service.update_run_item(
        db=db,
        item_id=item_id,
        status_val=payload.trang_thai,
        note=payload.ghi_chu_ket_qua,
        images=payload.images,
        username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="UPDATE",
        noi_dung=f"Cập nhật kết quả mục checklist run #{item_id}: Trạng thái '{payload.trang_thai}'",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return res


@router.post("/runs/{run_id}/items/custom", response_model=ChecklistRunItemSchema, status_code=status.HTTP_201_CREATED)
def add_custom_item_to_run(
    run_id: int,
    tieu_de: str = Query(..., min_length=1),
    nhom: Optional[str] = Query("Phát sinh thêm"),
    huong_dan: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Thêm một mục phát sinh riêng biệt vào đợt checklist đang làm (Chỉ Admin / Super Admin)."""
    check_admin_or_superadmin(current_user)
    res = work_checklist_service.add_custom_item_to_run(
        db=db,
        run_id=run_id,
        tieu_de=tieu_de,
        nhom=nhom,
        huong_dan=huong_dan,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="CHECKLIST_CONG_VIEC",
        hanh_dong="INSERT",
        noi_dung=f"Thêm mục phát sinh vào đợt checklist #{run_id}: '{tieu_de}'",
        user_thuchien=current_user.username,
        current_user=current_user
    )
    return res
