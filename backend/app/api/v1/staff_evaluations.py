import io
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_super_admin_or_dung
from app.schemas.auth import UserInfo
from app.schemas.staff_evaluation import (
    StaffConfigItem,
    StaffConfigSavePayload,
    EvaluationReportResponse,
)
from app.services import staff_evaluation_service
from app.services.log_service import LogService

router = APIRouter(prefix="/staff-evaluations", tags=["Báo Cáo Đánh Giá Nhân Viên"])


@router.get("/config", response_model=List[StaffConfigItem])
def get_evaluation_config(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Lấy danh sách nhân viên được cấu hình đánh giá."""
    return staff_evaluation_service.get_evaluated_staff_configs(db)


@router.get("/candidates", response_model=List[StaffConfigItem])
def get_evaluation_candidates(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Lấy danh sách tất cả nhân sự Team App từ dbo.LIST_USER để chọn đưa vào nhóm đánh giá."""
    return staff_evaluation_service.get_staff_candidates(db)


@router.post("/config", response_model=List[StaffConfigItem])
def save_evaluation_config(
    payload: StaffConfigSavePayload,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Lưu danh sách nhân viên đánh giá (thêm bớt và lưu lại)."""
    res = staff_evaluation_service.save_evaluated_staff_configs(
        db=db,
        usernames=payload.usernames,
        current_username=current_user.username,
    )
    LogService.record_log(
        db=db,
        nhom_quyen="HELPDESK",
        man_hinh="DANH_GIA_NHAN_VIEN",
        hanh_dong="UPDATE",
        mo_ta=f"Cấu hình danh sách {len(payload.usernames)} nhân sự đánh giá",
        current_user=current_user
    )
    return res


@router.get("/report", response_model=EvaluationReportResponse)
def get_report(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Lấy dữ liệu báo cáo đánh giá tháng hiện tại và 2 tháng trước (Báo cáo 1 & Báo cáo 2)."""
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    return staff_evaluation_service.get_full_evaluation_report(
        db=db,
        target_year=target_year,
        target_month=target_month,
    )


@router.get("/export-excel")
def export_excel(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100),
    username: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin_or_dung),
):
    """Xuất file Excel báo cáo chi tiết theo tháng (All hoặc theo user)."""
    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    excel_buffer = staff_evaluation_service.export_evaluation_excel(
        db=db,
        target_year=target_year,
        target_month=target_month,
        selected_username=username,
    )

    filename = f"BaoCao_DanhGia_TeamApp_{target_month:02d}_{target_year}.xlsx"
    return Response(
        content=excel_buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
