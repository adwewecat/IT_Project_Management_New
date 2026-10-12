from __future__ import annotations

import os
import shutil
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_app_or_admin, require_admin
from app.schemas.auth import UserInfo
from app.schemas.pm_bo import (
    PMSoftwareItem,
    PMSoftwareCreate,
    PMSoftwareUpdate,
    SoftwareVersionItem,
    SoftwareVersionCreate,
    SoftwareVersionUpdate,
    SoftwareVersionSyncDatePayload,
    BrandPrintStandardItem,
    BrandPrintStandardCreate,
    BrandPrintStandardUpdate,
)
from app.services import pm_bo_service
from app.services.log_service import LogService

router = APIRouter(prefix="/pm-bo", tags=["Quản Lý PM / BO & Phiên Bản Phần Mềm"])

UPLOAD_VERSIONS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/software_versions"))
os.makedirs(UPLOAD_VERSIONS_DIR, exist_ok=True)



# =========================================================================
# 1. TAB 1: PHẦN MỀM & PM PHỤ TRÁCH (ALLAPP_PM)
# =========================================================================

@router.get("/softwares", response_model=List[PMSoftwareItem])
def list_pm_softwares(
    search: Optional[str] = Query(None, description="Tìm kiếm phần mềm, tên PM, email, sđt..."),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Lấy danh sách các phần mềm cùng PM quản lý phần mềm đó."""
    return pm_bo_service.get_pm_softwares(db=db, search=search)


@router.post("/softwares", response_model=PMSoftwareItem, status_code=status.HTTP_201_CREATED)
def create_pm_software(
    payload: PMSoftwareCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Thêm mới phần mềm và PM phụ trách."""
    res = pm_bo_service.create_pm_software(
        db=db,
        payload=payload,
        current_username=current_user.username,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="INSERT",
            mo_ta=f"Thêm phần mềm PM/BO: {payload.ten_phan_mem}",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.put("/softwares/{item_id}", response_model=PMSoftwareItem)
def update_pm_software(
    item_id: int,
    payload: PMSoftwareUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Cập nhật thông tin phần mềm và PM phụ trách."""
    try:
        res = pm_bo_service.update_pm_software(
            db=db,
            item_id=item_id,
            payload=payload,
            current_username=current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                hanh_dong="UPDATE",
                mo_ta=f"Cập nhật phần mềm PM/BO (ID={item_id}): {payload.ten_phan_mem or ''}",
                current_user=current_user,
            )
        except Exception:
            pass
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/softwares/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pm_software(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Xóa phần mềm khỏi danh sách PM/BO."""
    ok = pm_bo_service.delete_pm_software(db=db, item_id=item_id, current_username=current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy phần mềm.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="DELETE",
            mo_ta=f"Xóa phần mềm PM/BO (ID={item_id})",
            current_user=current_user,
        )
    except Exception:
        pass
    return None


# =========================================================================
# 2. TAB 2: PHIÊN BẢN PHẦN MỀM (SOFTWARE_VERSIONS)
# =========================================================================

@router.get("/versions", response_model=List[SoftwareVersionItem])
def list_software_versions(
    search: Optional[str] = Query(None, description="Tìm kiếm phần mềm, version, ghi chú..."),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Lấy danh sách phiên bản các phần mềm (KDS, CO, SO, GPOS-CO-SO, GPOS-KDS...) kèm ngày update."""
    return pm_bo_service.get_software_versions(db=db, search=search)


@router.post("/versions", response_model=SoftwareVersionItem, status_code=status.HTTP_201_CREATED)
def create_software_version(
    payload: SoftwareVersionCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """Thêm mới theo dõi phiên bản phần mềm (Chỉ Admin và Super Admin)."""
    res = pm_bo_service.create_software_version(
        db=db,
        payload=payload,
        current_username=current_user.username,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="INSERT",
            mo_ta=f"Thêm phiên bản phần mềm: {payload.ten_phan_mem} (ver {payload.phien_ban_moi})",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.put("/versions/{item_id}", response_model=SoftwareVersionItem)
def update_software_version(
    item_id: int,
    payload: SoftwareVersionUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """Cập nhật phiên bản phần mềm, ngày update, nội dung và hình ảnh (Chỉ Admin và Super Admin)."""
    try:
        res = pm_bo_service.update_software_version(
            db=db,
            item_id=item_id,
            payload=payload,
            current_username=current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                hanh_dong="UPDATE",
                mo_ta=f"Cập nhật phiên bản phần mềm (ID={item_id}): {res.ten_phan_mem} (ver {res.phien_ban_moi})",
                current_user=current_user,
            )
        except Exception:
            pass
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/versions/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_software_version(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """Xóa phần mềm khỏi danh sách phiên bản (Chỉ Admin và Super Admin)."""
    ok = pm_bo_service.delete_software_version(db=db, item_id=item_id, current_username=current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi phiên bản.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="DELETE",
            mo_ta=f"Xóa phiên bản phần mềm (ID={item_id})",
            current_user=current_user,
        )
    except Exception:
        pass
    return None


@router.post("/versions/sync-date", response_model=List[SoftwareVersionItem])
def sync_software_version_dates(
    payload: SoftwareVersionSyncDatePayload,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """Đồng bộ / sao chép ngày update cho tất cả các phần mềm trong hệ thống (Chỉ Admin và Super Admin)."""
    res = pm_bo_service.sync_software_version_dates(
        db=db,
        target_date=payload.ngay_update,
        current_username=current_user.username,
        exclude_id=payload.exclude_id,
        target_ids=payload.target_ids,
        target_names=payload.target_names,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="SYNC",
            mo_ta=f"Đồng bộ ngày update cho {len(res)} phiên bản phần mềm sang {payload.ngay_update}",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.post("/versions/upload-image")
async def upload_version_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """
    Tải lên hình ảnh minh họa cho phiên bản phần mềm (lưu vào uploads/software_versions/).
    Chỉ Admin và Super Admin có quyền tải lên.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_name = file.filename or "image.png"
    safe_name = f"ver_{timestamp}_{original_name.replace(' ', '_')}"
    image_path = os.path.join(UPLOAD_VERSIONS_DIR, safe_name)

    with open(image_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="INSERT",
            mo_ta=f"Tải lên ảnh phiên bản phần mềm: {safe_name}",
            current_user=current_user,
        )
    except Exception:
        pass

    return {
        "status": "ok",
        "url": f"/uploads/software_versions/{safe_name}",
        "filename": safe_name,
    }



# =========================================================================
# 3. TAB 3: CHUẨN HÓA IN TỪNG BRAND (BRAND_PRINT_STANDARDS)
# =========================================================================

@router.get("/print-standards", response_model=List[BrandPrintStandardItem])
def list_brand_print_standards(
    search: Optional[str] = Query(None, description="Tìm kiếm brand, tiêu đề, nội dung..."),
    loai_in: Optional[str] = Query(None, description="Lọc theo loại in (Chuẩn hóa in Dcorp (RK7) / Chuẩn hóa in KDS / Cả hai)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Lấy danh sách chuẩn hóa in của từng Brand."""
    return pm_bo_service.get_brand_print_standards(db=db, search=search, loai_in=loai_in)


@router.post("/print-standards", response_model=BrandPrintStandardItem, status_code=status.HTTP_201_CREATED)
def create_brand_print_standard(
    payload: BrandPrintStandardCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Thêm mới thông tin chuẩn hóa in của Brand."""
    res = pm_bo_service.create_brand_print_standard(
        db=db,
        payload=payload,
        current_username=current_user.username,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="INSERT",
            mo_ta=f"Thêm chuẩn hóa in Brand: {payload.brand_code or ''} - {payload.tieu_de or ''}",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.put("/print-standards/{item_id}", response_model=BrandPrintStandardItem)
def update_brand_print_standard(
    item_id: int,
    payload: BrandPrintStandardUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Cập nhật thông tin chuẩn hóa in của Brand."""
    try:
        res = pm_bo_service.update_brand_print_standard(
            db=db,
            item_id=item_id,
            payload=payload,
            current_username=current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                hanh_dong="UPDATE",
                mo_ta=f"Cập nhật chuẩn hóa in Brand (ID={item_id}): {res.brand_code or ''}",
                current_user=current_user,
            )
        except Exception:
            pass
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/print-standards/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand_print_standard(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Xóa thông tin chuẩn hóa in của Brand."""
    ok = pm_bo_service.delete_brand_print_standard(db=db, item_id=item_id, current_username=current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi chuẩn hóa in.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            hanh_dong="DELETE",
            mo_ta=f"Xóa chuẩn hóa in Brand (ID={item_id})",
            current_user=current_user,
        )
    except Exception:
        pass
    return None

