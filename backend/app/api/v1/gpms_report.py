# -*- coding: utf-8 -*-
"""
API Endpoints cho phân hệ Báo Cáo GPMS.
Prefix: /gpms-report
Tuân thủ Rule 10 (Mặc định Admin & Super Admin, các nhóm khác cần phân quyền gpms_report / view_gpms_report / update_gpms_report).
"""

from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.gpms_report import GpmsReportBatch
from app.schemas.auth import UserInfo
from app.schemas.gpms_report import (
    GpmsBatchItem,
    GpmsBatchListResponse,
    GpmsDashboardResponse,
    GpmsRegionConfigResponse,
    GpmsRegionConfigSavePayload,
    GpmsTicketListResponse,
)
from app.services import gpms_report_service
from app.services.auth_service import is_admin_user
from app.services.log_service import LogService

router = APIRouter(prefix="/gpms-report", tags=["Báo Cáo GPMS"])


def require_gpms_report_view(
    current_user: UserInfo = Depends(get_current_user),
) -> UserInfo:
    """Cho phép Admin/Super Admin hoặc user được cấp quyền xem/dùng Báo Cáo GPMS."""
    if is_admin_user(current_user):
        return current_user
    perms = getattr(current_user, "permissions", None) or {}
    if (
        perms.get("gpms_report")
        or perms.get("view_gpms_report")
        or perms.get("update_gpms_report")
    ):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn chưa được cấp quyền xem màn hình Báo Cáo GPMS.",
    )


def require_gpms_report_update(
    current_user: UserInfo = Depends(get_current_user),
) -> UserInfo:
    """Cho phép Admin/Super Admin hoặc user được cấp quyền cập nhật/cấu hình Báo Cáo GPMS."""
    if is_admin_user(current_user):
        return current_user
    perms = getattr(current_user, "permissions", None) or {}
    if perms.get("update_gpms_report") or perms.get("gpms_report"):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn chưa được cấp quyền tải lên hoặc cấu hình dữ liệu Báo Cáo GPMS.",
    )


def _to_batch_item(batch: GpmsReportBatch) -> GpmsBatchItem:
    return GpmsBatchItem(
        id=batch.id,
        report_name=batch.report_name,
        file_name=batch.file_name,
        period_label=batch.period_label,
        export_at=batch.export_at,
        total_rows=batch.total_rows,
        unique_senders=batch.unique_senders,
        unique_receivers=batch.unique_receivers,
        source_type=batch.source_type,
        uploaded_by=batch.uploaded_by,
        uploaded_at=batch.uploaded_at,
    )


def _resolve_target_batch(
    db: Session,
    batch_id: Optional[int],
    username: Optional[str],
) -> GpmsReportBatch:
    batch: Optional[GpmsReportBatch] = None
    if batch_id is not None:
        batch = db.get(GpmsReportBatch, batch_id)
        if batch is None or not batch.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy kỳ báo cáo GPMS được chọn.",
            )
        return batch

    batch = db.scalar(
        select(GpmsReportBatch)
        .where(GpmsReportBatch.is_active == True)  # noqa: E712
        .order_by(desc(GpmsReportBatch.id))
        .limit(1)
    )
    if batch is None:
        batch = gpms_report_service.ensure_initial_batch_if_empty(db, uploaded_by=username)

    if batch is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chưa có dữ liệu Báo Cáo GPMS. Vui lòng tải lên file Excel ChiTietCongViec từ GPMS.",
        )
    return batch


@router.get("/batches", response_model=GpmsBatchListResponse)
def list_batches(
    auto_seed: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_view),
):
    """Lấy danh sách các kỳ báo cáo GPMS đã nạp kèm danh sách file Excel trong thư mục REPORT/."""
    if auto_seed:
        gpms_report_service.ensure_initial_batch_if_empty(db, uploaded_by=current_user.username)
    rows = gpms_report_service.list_gpms_batches(db)
    available_files = gpms_report_service.list_available_report_files()
    return GpmsBatchListResponse(
        items=[_to_batch_item(b) for b in rows],
        available_report_files=available_files,
    )


@router.post("/upload", response_model=GpmsBatchItem, status_code=status.HTTP_201_CREATED)
async def upload_report_excel(
    file: UploadFile = File(...),
    report_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_update),
):
    """Tải lên file Excel báo cáo GPMS (.xlsx) để phân tích và lưu vào SQL Server."""
    filename = (file.filename or "").strip()
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng chọn đúng định dạng file Excel (.xlsx) xuất từ GPMS.",
        )

    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File tải lên bị rỗng.",
        )

    try:
        batch = gpms_report_service.save_gpms_batch_from_bytes(
            db=db,
            file_bytes=raw_bytes,
            filename=filename,
            report_name=report_name,
            source_type="UPLOAD",
            uploaded_by=current_user.username,
        )
    except ValueError as ex:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ex))
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi đọc file Excel GPMS: {ex}",
        )

    LogService.record_log(
        db=db,
        nhom_quyen="QUAN_TRI",
        man_hinh="BAO_CAO_GPMS",
        hanh_dong="CREATE",
        mo_ta=f"Nạp Báo Cáo GPMS '{batch.report_name}' ({batch.total_rows} ticket)",
        current_user=current_user,
    )
    return _to_batch_item(batch)


@router.post("/import-folder", response_model=GpmsBatchItem, status_code=status.HTTP_201_CREATED)
def import_from_report_folder(
    filename: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_update),
):
    """Nạp nhanh file Excel đang nằm sẵn trong thư mục REPORT/ của hệ thống."""
    try:
        batch = gpms_report_service.import_report_from_folder(
            db=db,
            filename=filename,
            uploaded_by=current_user.username,
        )
    except FileNotFoundError as ex:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ex))
    except ValueError as ex:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ex))

    LogService.record_log(
        db=db,
        nhom_quyen="QUAN_TRI",
        man_hinh="BAO_CAO_GPMS",
        hanh_dong="CREATE",
        mo_ta=f"Nạp Báo Cáo GPMS từ thư mục REPORT/: {batch.file_name} ({batch.total_rows} ticket)",
        current_user=current_user,
    )
    return _to_batch_item(batch)


@router.delete("/batches/{batch_id}", status_code=status.HTTP_200_OK)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_update),
):
    """Xóa một kỳ báo cáo GPMS khỏi danh sách."""
    ok = gpms_report_service.delete_gpms_batch(db, batch_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy kỳ báo cáo cần xóa.")
    LogService.record_log(
        db=db,
        nhom_quyen="QUAN_TRI",
        man_hinh="BAO_CAO_GPMS",
        hanh_dong="DELETE",
        mo_ta=f"Xóa kỳ Báo Cáo GPMS ID={batch_id}",
        current_user=current_user,
    )
    return {"success": True, "id": batch_id}


@router.get("/analytics", response_model=GpmsDashboardResponse)
def get_gpms_analytics(
    batch_id: Optional[int] = Query(None),
    ref_mode: str = Query("export", pattern="^(export|now)$"),
    include_anonymous: bool = Query(True),
    include_unassigned_dmcv: bool = Query(True),
    sla_status: Optional[str] = Query(None),
    sender: Optional[str] = Query(None),
    receiver: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    phan_loai: Optional[str] = Query(None),
    dmcv1: Optional[str] = Query(None),
    dmcv2: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_view),
):
    """Tính toán toàn bộ 6 bảng/biểu đồ phân tích GPMS kèm lọc chéo đa chiều tức thì."""
    batch = _resolve_target_batch(db, batch_id, current_user.username)
    tickets = gpms_report_service._get_cached_batch_tickets(batch)
    south_usernames, _ = gpms_report_service.get_south_usernames(db)

    analytics = gpms_report_service.compute_gpms_analytics(
        tickets=tickets,
        export_at=batch.export_at,
        south_usernames=south_usernames,
        ref_mode=ref_mode,
        include_anonymous=include_anonymous,
        include_unassigned_dmcv=include_unassigned_dmcv,
        sla_status_filter=sla_status,
        sender_filter=sender,
        receiver_filter=receiver,
        region_filter=region,
        phan_loai_filter=phan_loai,
        dmcv1_filter=dmcv1,
        dmcv2_filter=dmcv2,
        search=search,
    )

    return GpmsDashboardResponse(
        batch=_to_batch_item(batch),
        south_usernames=south_usernames,
        **analytics,
    )


@router.get("/tickets", response_model=GpmsTicketListResponse)
def get_gpms_ticket_details(
    batch_id: Optional[int] = Query(None),
    ref_mode: str = Query("export", pattern="^(export|now)$"),
    include_anonymous: bool = Query(True),
    include_unassigned_dmcv: bool = Query(True),
    sla_status: Optional[str] = Query(None),
    sender: Optional[str] = Query(None),
    receiver: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    phan_loai: Optional[str] = Query(None),
    dmcv1: Optional[str] = Query(None),
    dmcv2: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_view),
):
    """Truy xuất danh sách ticket chi tiết phục vụ xem sâu (drill-down) từ mọi biểu đồ."""
    batch = _resolve_target_batch(db, batch_id, current_user.username)
    tickets = gpms_report_service._get_cached_batch_tickets(batch)
    south_usernames, _ = gpms_report_service.get_south_usernames(db)

    res = gpms_report_service.filter_ticket_details(
        tickets=tickets,
        export_at=batch.export_at,
        south_usernames=south_usernames,
        ref_mode=ref_mode,
        include_anonymous=include_anonymous,
        include_unassigned_dmcv=include_unassigned_dmcv,
        sla_status_filter=sla_status,
        sender_filter=sender,
        receiver_filter=receiver,
        region_filter=region,
        phan_loai_filter=phan_loai,
        dmcv1_filter=dmcv1,
        dmcv2_filter=dmcv2,
        search=search,
        page=page,
        page_size=page_size,
    )
    return GpmsTicketListResponse(**res)


@router.get("/region-config", response_model=GpmsRegionConfigResponse)
def get_region_config(
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_view),
):
    """Lấy danh sách User được cấu hình thuộc Miền Nam và toàn bộ danh sách User ứng viên."""
    data = gpms_report_service.get_south_config_with_candidates(db, batch_id=batch_id)
    return GpmsRegionConfigResponse(**data)


@router.put("/region-config", response_model=GpmsRegionConfigResponse)
def update_region_config(
    payload: GpmsRegionConfigSavePayload,
    batch_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_gpms_report_update),
):
    """Lưu cấu hình danh sách User Miền Nam (các user khác tự động xếp vào Miền Bắc)."""
    saved_users, _ = gpms_report_service.save_south_usernames(
        db=db,
        usernames=payload.usernames,
        full_names=payload.full_names,
        updated_by=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="QUAN_TRI",
        man_hinh="BAO_CAO_GPMS",
        hanh_dong="UPDATE",
        mo_ta=f"Cập nhật cấu hình {len(saved_users)} User thuộc Miền Nam",
        current_user=current_user,
    )
    data = gpms_report_service.get_south_config_with_candidates(db, batch_id=batch_id)
    return GpmsRegionConfigResponse(**data)
