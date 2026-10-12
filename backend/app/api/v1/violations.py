import os
import uuid
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_super_admin_or_dung
from app.schemas.auth import UserInfo
from app.schemas.violation import (
    ViolationCreate,
    ViolationBatchCreate,
    ViolationUpdate,
    ViolationResponse,
    ViolationListResponse,
    LeaveLogCreate,
    LeaveLogUpdate,
    LeaveLogResponse,
    LeaveLogListResponse,
    LeaveTypeCreate,
    LeaveTypeUpdate,
    LeaveTypeResponse,
)
from app.services import violation_service
from app.services.log_service import LogService

router = APIRouter(prefix="/violations", tags=["Quản Trị Vi Phạm & Nghỉ Phép"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/violations"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ================= GHI NHẬN LỖI VI PHẠM =================

@router.get("", response_model=ViolationListResponse)
def list_violations(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    username: Optional[str] = Query(None),
    loai_saipham: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Danh sách lỗi sai phạm trong quá trình làm việc."""
    return violation_service.get_violations(
        db=db,
        month=month,
        year=year,
        username=username,
        loai_saipham=loai_saipham,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ViolationResponse, status_code=status.HTTP_201_CREATED)
def create_violation(
    payload: ViolationCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Tạo ghi nhận lỗi sai phạm mới."""
    res = violation_service.create_violation(
        db=db,
        payload=payload,
        current_username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="CHI_NHANH_LOI",
        hanh_dong="INSERT",
        mo_ta=f"Ghi nhận lỗi sai phạm: {payload.username} - {payload.tieu_de or payload.loai_saipham}",
        current_user=current_user
    )
    return res


@router.post("/batch", response_model=List[ViolationResponse], status_code=status.HTTP_201_CREATED)
def create_violations_batch(
    payload: ViolationBatchCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Tạo ghi nhận vi phạm cho nhiều nhân viên (cả team hoặc nhóm chọn lọc) cùng lúc."""
    res = violation_service.create_violations_batch(
        db=db,
        payload=payload,
        current_username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="CHI_NHANH_LOI",
        hanh_dong="INSERT",
        mo_ta=f"Ghi nhận vi phạm hàng loạt cho {len(payload.usernames)} nhân viên: {payload.tieu_de or payload.loai_saipham}",
        current_user=current_user
    )
    return res


@router.put("/{violation_id}", response_model=ViolationResponse)
def update_violation(
    violation_id: int,
    payload: ViolationUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Cập nhật thông tin sai phạm."""
    try:
        res = violation_service.update_violation(
            db=db,
            violation_id=violation_id,
            payload=payload,
            current_username=current_user.username,
        )
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="CHI_NHANH_LOI",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật lỗi sai phạm ID {violation_id}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{violation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_violation(
    violation_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Xóa bản ghi sai phạm."""
    ok = violation_service.delete_violation(db, violation_id, current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi.")
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="CHI_NHANH_LOI",
        hanh_dong="DELETE",
        mo_ta=f"Xóa bản ghi sai phạm ID {violation_id}",
        current_user=current_user
    )
    return None


@router.post("/upload")
async def upload_violation_files(
    files: List[UploadFile] = File(...),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Upload ảnh & tệp chứng cứ sai phạm."""
    uploaded_urls = []
    for file in files:
        if not file.filename:
            continue
        unique_name = f"{uuid.uuid4().hex[:12]}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_urls.append(f"/uploads/violations/{unique_name}")
    return {"urls": uploaded_urls}


# ================= GHI NHẬN NGHỈ PHÉP, VỀ SỚM =================

@router.get("/leaves", response_model=LeaveLogListResponse)
def list_leaves(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    username: Optional[str] = Query(None),
    leave_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Danh sách ngày nghỉ phép, xin về sớm."""
    return violation_service.get_leave_logs(
        db=db,
        month=month,
        year=year,
        username=username,
        leave_type=leave_type,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.post("/leaves", response_model=LeaveLogResponse, status_code=status.HTTP_201_CREATED)
def create_leave(
    payload: LeaveLogCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Tạo ghi nhận ngày nghỉ phép, về sớm."""
    res = violation_service.create_leave_log(
        db=db,
        payload=payload,
        current_username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="NGHI_PHEP",
        hanh_dong="INSERT",
        mo_ta=f"Ghi nhận nghỉ phép/về sớm: {payload.username} ({payload.leave_type})",
        current_user=current_user
    )
    return res


@router.put("/leaves/{leave_id}", response_model=LeaveLogResponse)
def update_leave(
    leave_id: int,
    payload: LeaveLogUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Cập nhật ghi nhận nghỉ phép."""
    try:
        res = violation_service.update_leave_log(
            db=db,
            leave_id=leave_id,
            payload=payload,
            current_username=current_user.username,
        )
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="NGHI_PHEP",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật ghi nhận nghỉ phép ID {leave_id}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/leaves/{leave_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Xóa ghi nhận nghỉ phép."""
    ok = violation_service.delete_leave_log(db, leave_id, current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi.")
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="NGHI_PHEP",
        hanh_dong="DELETE",
        mo_ta=f"Xóa ghi nhận nghỉ phép ID {leave_id}",
        current_user=current_user
    )
    return None


# ================= CẤU HÌNH LOẠI NGHỈ PHÉP (LEAVE TYPES) =================

@router.get("/leave-types", response_model=List[LeaveTypeResponse])
def get_leave_types(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Lấy danh sách các loại ghi nhận nghỉ phép."""
    return violation_service.get_leave_types(db=db, include_inactive=include_inactive)


@router.post("/leave-types", response_model=LeaveTypeResponse, status_code=status.HTTP_201_CREATED)
def create_leave_type(
    payload: LeaveTypeCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Tạo mới một loại ghi nhận nghỉ phép."""
    try:
        res = violation_service.create_leave_type(db=db, payload=payload, current_username=current_user.username)
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="NGHI_PHEP",
            hanh_dong="INSERT",
            mo_ta=f"Thêm loại nghỉ phép: {payload.name} ({payload.code})",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/leave-types/{type_id}", response_model=LeaveTypeResponse)
def update_leave_type(
    type_id: int,
    payload: LeaveTypeUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Chỉnh sửa thông tin loại ghi nhận nghỉ phép."""
    try:
        res = violation_service.update_leave_type(db=db, type_id=type_id, payload=payload, current_username=current_user.username)
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="NGHI_PHEP",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật loại nghỉ phép ID {type_id}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/leave-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Xóa / Vô hiệu hóa một loại ghi nhận nghỉ phép."""
    ok = violation_service.delete_leave_type(db, type_id=type_id, current_username=current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy loại ghi nhận.")
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="NGHI_PHEP",
        hanh_dong="DELETE",
        mo_ta=f"Vô hiệu hóa loại nghỉ phép ID {type_id}",
        current_user=current_user
    )
    return None

