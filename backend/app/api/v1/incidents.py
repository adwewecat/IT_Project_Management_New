import os
import uuid
import shutil
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.api.deps import get_current_user, require_app_or_admin, require_admin
from app.schemas.auth import UserInfo
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentAssign,
    IncidentProgressUpdate,
    IncidentStatusUpdate,
    IncidentResponse,
    IncidentListResponse,
)
from app.schemas.system_incident import (
    SystemIncidentCreate,
    SystemIncidentUpdate,
    SystemIncidentProgressAdd,
    SystemIncidentResponse,
    SystemIncidentListResponse,
)
from app.services import incident_service, system_incident_service
from app.services.log_service import LogService

router = APIRouter(prefix="/incidents", tags=["Sự Vụ Nhà Hàng"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/incidents"))
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("", response_model=IncidentListResponse)
def list_incidents(
    tab: str = Query("pending", description="'pending' hoặc 'completed'"),
    search: Optional[str] = Query(None, description="Tìm kiếm không dấu/có dấu"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    user_insert: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    restaurant_id: Optional[int] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Lấy danh sách sự vụ nhà hàng theo tab 'pending' hoặc 'completed' (tối đa 200 bản ghi tab đã xong)."""
    is_super_admin = bool(
        current_user.is_super_admin or
        current_user.username.lower() in ("admin", "administrator", "dung.nguyenanh") or
        current_user.phanquyen == "0"
    )
    return incident_service.get_incidents(
        db=db,
        tab=tab,
        search=search,
        from_date=from_date,
        to_date=to_date,
        user_insert=user_insert,
        assigned_to=assigned_to,
        restaurant_id=restaurant_id,
        current_username=current_user.username,
        is_super_admin=is_super_admin,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Ghi nhận sự vụ nhà hàng mới."""
    res = incident_service.create_incident(
        db=db,
        payload=payload,
        current_username=current_user.username,
        current_user_fullname=current_user.full_name or current_user.username,
    )
    try:
        nh_label = str(payload.restaurant_name or payload.sap_code or payload.restaurant_id or "")
        noidung_snippet = (payload.noidung or "")[:80]
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="BAO_CAO_SU_VU",
            hanh_dong="INSERT",
            mo_ta=f"Tạo sự vụ nhà hàng {nh_label}: {noidung_snippet}",
            current_user=current_user
        )
    except Exception as e_log:
        logger.warning(f"Lỗi ghi log tạo sự vụ: {e_log}")
    return res


@router.post("/upload")
async def upload_incident_files(
    files: List[UploadFile] = File(...),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Upload hình ảnh và tệp đính kèm cho sự vụ."""
    uploaded_urls = []
    for file in files:
        if not file.filename:
            continue
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex[:12]}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_urls.append(f"/uploads/incidents/{unique_name}")
    return {"urls": uploaded_urls}


@router.get("/assignees")
def get_assignees(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Danh sách nhân viên Team App đã được gom nhóm cấu hình phục vụ phân công & ghi nhận lỗi/nghỉ phép."""
    from app.models.staff_evaluation import StaffEvaluationConfig
    configs = db.scalars(
        select(StaffEvaluationConfig)
        .where(StaffEvaluationConfig.CONFIG_KEY == "EVALUATED_STAFF", StaffEvaluationConfig.IS_ACTIVE == True)
        .order_by(StaffEvaluationConfig.SORT_ORDER, StaffEvaluationConfig.id)
    ).all()
    if configs:
        return [
            {
                "username": c.USERNAME,
                "full_name": c.FULL_NAME or c.USERNAME,
                "is_app_team": True,
            }
            for c in configs
        ]

    # Dự phòng nếu chưa cấu hình: chỉ lấy user có quyền App
    users = db.scalars(
        select(User)
        .where(User.active == True)
        .order_by(User.full_name)
    ).all()
    results = []
    for u in users:
        pq = str(u.phanquyen or "").lower()
        if "2" in pq or "app" in pq:
            results.append({
                "username": u.user_name1,
                "full_name": u.full_name or u.user_name1,
                "phanquyen": u.phanquyen,
                "is_app_team": True,
            })
    return results


# =========================================================================
# LỖI TOÀN HỆ THỐNG / LỖI DIỆN RỘNG (SYSTEM OUTAGES)
# =========================================================================

@router.get("/system-outages", response_model=SystemIncidentListResponse)
def list_system_outages(
    search: Optional[str] = Query(None, description="Tìm kiếm không dấu/có dấu"),
    month: Optional[str] = Query(None, description="Lọc theo tháng (YYYY-MM)"),
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    system_name: Optional[str] = Query(None, description="Hệ thống bị ảnh hưởng"),
    status: Optional[str] = Query(None, description="Trạng thái: DANG_XU_LY, DA_KHAC_PHUC, THEO_DOI"),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Lấy danh sách sự cố diện rộng kèm thống kê theo tháng / thời gian."""
    return system_incident_service.get_system_incidents(
        db=db,
        search=search,
        month=month,
        from_date=from_date,
        to_date=to_date,
        system_name=system_name,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.post("/system-outages", response_model=SystemIncidentResponse, status_code=status.HTTP_201_CREATED)
def create_system_outage(
    payload: SystemIncidentCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Ghi nhận sự cố toàn hệ thống / lỗi diện rộng mới."""
    res = system_incident_service.create_system_incident(
        db=db,
        payload=payload,
        current_username=current_user.username,
        current_fullname=current_user.full_name or current_user.username,
    )
    try:
        title_text = getattr(payload, "tieude", None) or getattr(payload, "tieu_de", None) or getattr(res, "tieude", "")
        sys_text = payload.he_thong or "Toàn hệ thống"
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="BAO_CAO_SU_VU",
            hanh_dong="INSERT",
            mo_ta=f'Ghi nhận sự cố hệ thống: "{title_text}" (Hệ thống: {sys_text})',
            current_user=current_user
        )
    except Exception as e_log:
        logger.warning(f"Lỗi ghi log tạo sự cố hệ thống: {e_log}")
    return res

@router.get("/system-outages/systems", response_model=List[str])
def list_outage_systems(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Lấy danh sách các hệ thống/dịch vụ dùng cho tìm kiếm và combobox."""
    return system_incident_service.get_distinct_systems(db=db)


@router.get("/system-outages/export/excel")
def export_system_outages_excel(
    search: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    system_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Xuất báo cáo sự cố hệ thống ra file Excel .xlsx."""
    excel_stream = system_incident_service.export_system_incidents_excel(
        db=db,
        search=search,
        month=month,
        from_date=from_date,
        to_date=to_date,
        system_name=system_name,
        status=status,
    )
    from datetime import datetime
    file_name = f"Bao_Cao_Su_Co_He_Thong_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={file_name}"}
    )


@router.get("/system-outages/{incident_id}", response_model=SystemIncidentResponse)
def get_system_outage_detail(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Chi tiết sự cố hệ thống."""
    item = system_incident_service.get_system_incident_by_id(db, incident_id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố hệ thống.")
    return system_incident_service.to_system_incident_response(item)


@router.put("/system-outages/{incident_id}", response_model=SystemIncidentResponse)
def update_system_outage(
    incident_id: int,
    payload: SystemIncidentUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Cập nhật thông tin sự cố hệ thống."""
    try:
        res = system_incident_service.update_system_incident(
            db=db,
            incident_id=incident_id,
            payload=payload,
            current_username=current_user.username,
            current_fullname=current_user.full_name or current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="BAO_CAO_SU_VU",
                hanh_dong="UPDATE",
                mo_ta=f"Cập nhật sự cố hệ thống ID {incident_id}",
                current_user=current_user
            )
        except Exception as e_log:
            logger.warning(f"Lỗi ghi log cập nhật sự cố hệ thống: {e_log}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/system-outages/{incident_id}/progress", response_model=SystemIncidentResponse)
def add_system_outage_progress(
    incident_id: int,
    payload: SystemIncidentProgressAdd,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Ghi chú thêm tiến độ xử lý sự cố hệ thống (kèm hình ảnh Ctrl+V hoặc file)."""
    try:
        res = system_incident_service.add_system_incident_progress(
            db=db,
            incident_id=incident_id,
            payload=payload,
            current_username=current_user.username,
            current_fullname=current_user.full_name or current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="BAO_CAO_SU_VU",
                hanh_dong="UPDATE",
                mo_ta=f"Thêm ghi chú tiến độ sự cố hệ thống ID {incident_id}",
                current_user=current_user
            )
        except Exception as e_log:
            logger.warning(f"Lỗi ghi log tiến độ sự cố hệ thống: {e_log}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/system-outages/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system_outage(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """Xóa sự cố hệ thống (Chỉ dành cho Admin)."""
    ok = system_incident_service.delete_system_incident(db, incident_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự cố hệ thống.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="BAO_CAO_SU_VU",
            hanh_dong="DELETE",
            mo_ta=f"Xóa sự cố hệ thống ID {incident_id}",
            current_user=current_user
        )
    except Exception as e_log:
        logger.warning(f"Lỗi ghi log xóa sự cố hệ thống: {e_log}")
    return None


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_detail(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Xem chi tiết sự vụ."""
    inc = incident_service.get_incident_by_id(db, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự vụ.")
    return incident_service.to_incident_response(inc)


@router.post("/{incident_id}/assign", response_model=IncidentResponse)
def assign_incident(
    incident_id: int,
    payload: IncidentAssign,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Phân công nhân sự xử lý sự vụ (Leader / Admin phân công)."""
    # Chỉ Admin, Super Admin hoặc chính user được giao mới được phân công
    roles = [str(r).lower() for r in (current_user.roles or [])]
    is_admin = getattr(current_user, "is_super_admin", False) or current_user.username.lower() in ["admin", "dung.nguyenanh"] or "admin" in roles or str(current_user.phanquyen or "") in ["0", "1"]
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên mới có quyền phân công nhân sự."
        )

    try:
        res = incident_service.assign_incident(
            db=db,
            incident_id=incident_id,
            payload=payload,
            current_username=current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="BAO_CAO_SU_VU",
                hanh_dong="UPDATE",
                mo_ta=f"Phân công sự vụ ID {incident_id} cho {payload.assigned_to or 'chưa phân công'}",
                current_user=current_user
            )
        except Exception as e_log:
            logger.warning(f"Lỗi ghi log phân công: {e_log}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{incident_id}/progress", response_model=IncidentResponse)
def add_progress_note(
    incident_id: int,
    payload: IncidentProgressUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Ghi chú thêm tiến độ xử lý."""
    try:
        res = incident_service.add_progress_note(
            db=db,
            incident_id=incident_id,
            payload=payload,
            current_username=current_user.username,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="BAO_CAO_SU_VU",
                hanh_dong="UPDATE",
                mo_ta=f"Cập nhật tiến độ xử lý sự vụ ID {incident_id}",
                current_user=current_user
            )
        except Exception as e_log:
            logger.warning(f"Lỗi ghi log tiến độ sự vụ: {e_log}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{incident_id}/status", response_model=IncidentResponse)
def update_status(
    incident_id: int,
    payload: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Chuyển trạng thái sang Đã hoàn thành hoặc Mở lại."""
    try:
        res = incident_service.update_incident_status(
            db=db,
            incident_id=incident_id,
            payload=payload,
            current_username=current_user.username,
        )
        st_text = "Đã hoàn thành" if payload.trangthai else "Mở lại"
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="HELPDESK",
                man_hinh="BAO_CAO_SU_VU",
                hanh_dong="UPDATE",
                mo_ta=f"Cập nhật trạng thái sự vụ ID {incident_id} -> {st_text}",
                current_user=current_user
            )
        except Exception as e_log:
            logger.warning(f"Lỗi ghi log trạng thái sự vụ: {e_log}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin),
):
    """Xóa sự vụ (Chỉ dành cho Admin)."""
    ok = incident_service.delete_incident(db, incident_id, current_user.username)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy sự vụ.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            man_hinh="BAO_CAO_SU_VU",
            hanh_dong="DELETE",
            mo_ta=f"Xóa sự vụ ID {incident_id}",
            current_user=current_user
        )
    except Exception as e_log:
        logger.warning(f"Lỗi ghi log xóa sự vụ: {e_log}")
    return None
