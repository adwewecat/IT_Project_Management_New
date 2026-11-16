# -*- coding: utf-8 -*-
"""
FastAPI Router cho phân hệ Tự Động Phân Hàng Đợi Trực Hotline 3CX (/api/v1/hotline-3cx-auto).
Cung cấp các API quản lý:
- Danh mục nhân sự hotline (CRUD)
- Lịch phân line theo ngày/tuần/tháng (Lấy, Lưu hàng loạt, Nhân bản tuần, Áp dụng tháng)
- Cấu hình hệ thống 3CX & Email cảnh báo (Bảo mật, ẩn mật khẩu)
- Kích hoạt chạy thử nghiệm (dry-run) và áp dụng trực tiếp (apply-now)
- Nhật ký đồng bộ và ảnh chụp màn hình

Bảo vệ phân quyền: Chỉ Quản trị viên (Super Admin) và tài khoản dung.nguyenanh.
Tương thích 100% Python 3.10 trên server production.
"""

from __future__ import annotations

import json
from datetime import date, timedelta
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.api.deps import require_super_admin_or_dung
from app.core.database import get_db
from app.models.hotline_3cx_auto import Hotline3cxSyncLog
from app.schemas.hotline_3cx_auto import (
    ApplyMonthTemplateRequest,
    ApplyNowRequest,
    CloneWeekRequest,
    Hotline3cxConfigOut,
    Hotline3cxConfigUpdate,
    Hotline3cxSyncLogOut,
    HotlineHolidayBatchCreateRequest,
    HotlineHolidayItem,
    HotlineMemberCreate,
    HotlineMemberOut,
    HotlineMemberUpdate,
    RelayHeartbeatIn,
    RelayHeartbeatOut,
    RelayNextTaskOut,
    RelayReportOut,
    ScheduleBulkSaveRequest,
    ScheduleDayItem,
)
from app.services.hotline_3cx_auto_service import (
    apply_week_template_to_month,
    claim_next_relay_task,
    clone_previous_week_schedules,
    create_member,
    delete_holiday,
    delete_member,
    ensure_seeded_data,
    get_public_config,
    get_schedules_range,
    get_week_monday,
    list_holidays,
    list_members,
    list_sync_logs,
    record_relay_heartbeat,
    regenerate_relay_token,
    report_relay_task_result,
    run_shift_sync,
    update_config,
    update_member,
    upsert_holidays_batch,
    upsert_schedules,
    verify_relay_token,
)
from app.services.hotline_3cx_relay_package import build_relay_package_zip_bytes

router = APIRouter(prefix="/hotline-3cx-auto", tags=["Hotline 3CX Auto"])


def check_is_dung_or_super_admin(current_user) -> bool:
    """
    Kiểm tra xem người dùng có phải là Super Admin hoặc tài khoản dung.nguyenanh hay không.
    Đồng bộ logic bảo mật với jobs.py.
    """
    username = (getattr(current_user, "username", "") or "").lower().strip()
    is_super = (
        getattr(current_user, "is_super_admin", False)
        or username in ["admin", "administrator", "dung.nguyenanh"]
    )
    pq = str(getattr(current_user, "phanquyen", "") or "").strip()
    return is_super or username == "dung.nguyenanh" or pq == "0"


def require_hotline_access(
    current_user=Depends(require_super_admin_or_dung),
):
    """Dependency xác thực người dùng có quyền quản trị tính năng Hotline 3CX Auto."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên hoặc user dung.nguyenanh mới có quyền truy cập.",
        )
    return current_user


def serialize_sync_log(log: Hotline3cxSyncLog) -> Hotline3cxSyncLogOut:
    """
    Chuyển đổi ORM Hotline3cxSyncLog sang schema Hotline3cxSyncLogOut an toàn.
    Chuyển applied_lines_json thành danh sách List[dict] chuẩn schema Pydantic.
    """
    applied_lines_list: List[dict] = []
    if log.applied_lines_json:
        try:
            parsed = json.loads(log.applied_lines_json)
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict):
                        applied_lines_list.append(item)
                    elif isinstance(item, str):
                        applied_lines_list.append({"ext_line": item})
                    else:
                        applied_lines_list.append({"value": str(item)})
        except Exception:
            applied_lines_list = []

    return Hotline3cxSyncLogOut(
        id=log.id,
        duty_date=log.duty_date,
        shift_code=log.shift_code,
        queue_name=log.queue_name,
        applied_lines=applied_lines_list,
        status=log.status,
        is_dry_run=bool(log.is_dry_run),
        triggered_by=log.triggered_by,
        error_message=log.error_message,
        screenshot_path=log.screenshot_path,
        started_at=log.started_at,
        finished_at=log.finished_at,
    )


# ==============================================================================
# 1. API QUẢN LÝ NHÂN SỰ HOTLINE (MEMBERS)
# ==============================================================================


@router.get("/members", response_model=List[HotlineMemberOut])
def get_members(
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Lấy danh sách toàn bộ nhân sự trực Hotline 3CX.
    Tự động seed 7 nhân sự mặc định nếu cơ sở dữ liệu chưa có dữ liệu.
    """
    ensure_seeded_data(db)
    return list_members(db, active_only=False)


@router.post("/members", response_model=HotlineMemberOut)
def create_new_member(
    payload: HotlineMemberCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Thêm mới một nhân sự trực Hotline 3CX."""
    return create_member(db, payload)


@router.put("/members/{member_id}", response_model=HotlineMemberOut)
def update_existing_member(
    member_id: int,
    payload: HotlineMemberUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Cập nhật thông tin nhân sự trực Hotline 3CX theo ID."""
    updated = update_member(db, member_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy nhân sự yêu cầu.",
        )
    return updated


@router.delete("/members/{member_id}")
def delete_existing_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Xóa một nhân sự trực Hotline 3CX khỏi hệ thống."""
    deleted = delete_member(db, member_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy nhân sự yêu cầu.",
        )
    return {"success": True}


# ==============================================================================
# 2. API QUẢN LÝ LỊCH TRỰC (SCHEDULES)
# ==============================================================================


@router.get("/schedules", response_model=List[ScheduleDayItem])
def get_schedules(
    start_date: Optional[date] = Query(None, description="Ngày bắt đầu (ISO YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Ngày kết thúc (ISO YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Lấy danh sách lịch trực theo khoảng ngày.
    Mặc định nếu không truyền tham số: Trả về tuần hiện tại (Thứ Hai đến Chủ Nhật).
    """
    monday = get_week_monday(date.today())
    eff_start = start_date or monday
    eff_end = end_date or (eff_start + timedelta(days=6))

    if eff_start > eff_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày bắt đầu không được lớn hơn ngày kết thúc.",
        )

    return get_schedules_range(db, eff_start, eff_end)


@router.put("/schedules", response_model=List[ScheduleDayItem])
def save_schedules_bulk(
    payload: ScheduleBulkSaveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Lưu hàng loạt cấu hình lịch trực cho nhiều ngày."""
    if not payload.days:
        return []

    username = getattr(current_user, "username", "Admin")
    upsert_schedules(db, payload.days, updated_by=username)

    min_date = min(d.duty_date for d in payload.days)
    max_date = max(d.duty_date for d in payload.days)
    return get_schedules_range(db, min_date, max_date)


@router.post("/schedules/clone-week", response_model=List[ScheduleDayItem])
def clone_week_schedule(
    payload: CloneWeekRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Sao chép lịch trực của tuần liền trước sang tuần mục tiêu.
    Trả về danh sách 7 ngày của tuần mục tiêu sau khi đã sao chép.
    """
    username = getattr(current_user, "username", "Admin")
    clone_previous_week_schedules(db, payload.target_week_start, updated_by=username)

    t_monday = get_week_monday(payload.target_week_start)
    t_sunday = t_monday + timedelta(days=6)
    return get_schedules_range(db, t_monday, t_sunday)


@router.post("/schedules/apply-month")
def apply_month_template(
    payload: ApplyMonthTemplateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Áp dụng mẫu lịch 7 ngày (Thứ 2 - Chủ Nhật) cho toàn bộ các ngày trong tháng được chỉ định.
    """
    username = getattr(current_user, "username", "Admin")
    count = apply_week_template_to_month(
        db=db,
        year=payload.year,
        month=payload.month,
        template_days=payload.template_days,
        updated_by=username,
        overwrite_existing=payload.overwrite_existing,
    )
    return {"success": True, "applied_days": count}


# ==============================================================================
# 2B. API DANH MỤC NGÀY LỄ RIÊNG (CUSTOM HOLIDAYS)
# ==============================================================================


@router.get("/holidays", response_model=List[HotlineHolidayItem])
def get_holidays(
    year: Optional[int] = Query(None, ge=2020, le=2100, description="Lọc theo năm"),
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Lấy danh sách Ngày Lễ Riêng (tùy chọn lọc theo năm)."""
    return list_holidays(db, year=year)


@router.post("/holidays", response_model=List[HotlineHolidayItem])
def add_holidays(
    payload: HotlineHolidayBatchCreateRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Thêm hoặc cập nhật 1 ngày lễ hoặc một khoảng ngày lễ liên tiếp."""
    username = getattr(current_user, "username", "Admin")
    try:
        return upsert_holidays_batch(db, payload, created_by=username)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.delete("/holidays/{holiday_id}")
def remove_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Xóa một Ngày Lễ Riêng theo ID."""
    ok = delete_holiday(db, holiday_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy ngày lễ ID={holiday_id}.",
        )
    return {"success": True}


# ==============================================================================
# 3. API CẤU HÌNH HỆ THỐNG 3CX (CONFIG)
# ==============================================================================


@router.get("/config", response_model=Hotline3cxConfigOut)
def get_config(
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Lấy thông tin cấu hình cổng 3CX và email cảnh báo.
    Mật khẩu luôn được che giấu an toàn, chỉ trả về cờ has_password.
    """
    return get_public_config(db)


@router.put("/config", response_model=Hotline3cxConfigOut)
def update_system_config(
    payload: Hotline3cxConfigUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Cập nhật cấu hình cổng 3CX và email cảnh báo.
    Đồng bộ cấu hình giờ chạy và email sang Job Scheduler (job_auto_sync_3cx_hotline_duty) nếu có.
    """
    update_config(db, payload)

    # Đồng bộ thông số giờ chạy và email nhận tin sang Job Scheduler service
    try:
        from app.services.job_scheduler_service import job_scheduler_service

        job_id = "job_auto_sync_3cx_hotline_duty"
        if hasattr(job_scheduler_service, "_jobs") and job_id in job_scheduler_service._jobs:
            job = job_scheduler_service._jobs[job_id]
            sched = job.setdefault("schedule", {})
            if payload.morning_time:
                sched["time"] = payload.morning_time
            if payload.evening_time:
                sched["time_2"] = payload.evening_time
            if payload.alert_emails is not None:
                cleaned_emails = (payload.alert_emails or "").strip()
                job["email_recipients"] = cleaned_emails
                job["has_email_notification"] = bool(cleaned_emails)
            job_scheduler_service._save_config()
    except Exception:
        # Scheduler có thể chưa nạp, không chặn việc cập nhật cấu hình DB
        pass

    return get_public_config(db)


# ==============================================================================
# 4. API ĐỒNG BỘ THỰC TẾ & CHẠY THỬ NGHIỆM (DRY-RUN / APPLY-NOW)
# ==============================================================================


@router.post("/dry-run", response_model=Hotline3cxSyncLogOut)
async def dry_run_sync(
    payload: Optional[ApplyNowRequest] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Kích hoạt chạy thử nghiệm quy trình đồng bộ ca trực Hotline 3CX (dry_run=True).
    Hệ thống sẽ tính toán kế hoạch, mở portal 3CX, điền thông tin nhưng KHÔNG bấm nút Save.
    """
    username = getattr(current_user, "username", "Admin")
    d_date = payload.duty_date if payload else None
    s_code = payload.shift_code if payload else None

    log = await run_shift_sync(
        db,
        duty_date=d_date,
        shift_code=s_code,
        triggered_by=username,
        dry_run=True,
        allow_retry=False,
    )
    return serialize_sync_log(log)


@router.post("/apply-now", response_model=Hotline3cxSyncLogOut)
async def apply_now_sync(
    payload: Optional[ApplyNowRequest] = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """
    Kích hoạt đồng bộ trực tiếp ca trực Hotline 3CX vào hàng đợi portal (dry_run=False).
    Thực hiện xóa danh sách cũ và cập nhật danh sách nhân sự trực mới vào hàng đợi 3CX thật.
    """
    username = getattr(current_user, "username", "Admin")
    d_date = payload.duty_date if payload else None
    s_code = payload.shift_code if payload else None

    log = await run_shift_sync(
        db,
        duty_date=d_date,
        shift_code=s_code,
        triggered_by=username,
        dry_run=False,
        allow_retry=False,
    )
    return serialize_sync_log(log)


# ==============================================================================
# 5. API NHẬT KÝ ĐỒNG BỘ (SYNC LOGS)
# ==============================================================================


@router.get("/logs", response_model=List[Hotline3cxSyncLogOut])
def get_sync_logs(
    limit: int = Query(50, ge=1, le=200, description="Số lượng bản ghi tối đa"),
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Lấy danh sách nhật ký đồng bộ Hotline 3CX mới nhất."""
    logs = list_sync_logs(db, limit=limit)
    return [serialize_sync_log(log) for log in logs]


# ==============================================================================
# 6. API RELAY WORKER & TAI GOI CAI DAT (PHUONG AN 2)
# ==============================================================================


def _extract_client_ip(request: Request) -> str:
    """Trích xuất IP máy trạm (hỗ trợ qua reverse proxy IIS X-Forwarded-For)."""
    xff = (request.headers.get("X-Forwarded-For") or "").strip()
    if xff:
        return xff.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return ""


def require_relay_auth(
    x_relay_token: Optional[str] = Header(default=None, alias="X-Relay-Token"),
    db: Session = Depends(get_db),
) -> None:
    """Dependency xác thực X-Relay-Token cho các endpoint của 3CX Relay Worker."""
    if not verify_relay_token(db, x_relay_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Relay-Token không hợp lệ hoặc đã bị thu hồi.",
        )


@router.post("/relay/regenerate-token", response_model=Hotline3cxConfigOut)
def regen_relay_token(
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Tạo mới Relay Token bảo mật (vô hiệu hóa token cũ)."""
    return regenerate_relay_token(db)


@router.get("/relay/download-package")
def download_relay_package(
    request: Request,
    server_url: Optional[str] = Query(
        None, description="URL gốc của Server Web (mặc định tự suy từ request)"
    ),
    db: Session = Depends(get_db),
    current_user=Depends(require_hotline_access),
):
    """Đóng gói và tải về bộ cài 3CX Sync Relay Worker (.zip) đã nhúng sẵn URL Server và Relay Token."""
    cfg = get_public_config(db)
    base_url = (server_url or str(request.base_url)).strip().rstrip("/")
    zip_bytes = build_relay_package_zip_bytes(
        server_url=base_url,
        relay_token=cfg.relay_token or "",
    )
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=3CX_Sync_Relay_Worker.zip",
        },
    )


@router.post("/relay/heartbeat", response_model=RelayHeartbeatOut)
def relay_heartbeat(
    request: Request,
    payload: Optional[RelayHeartbeatIn] = None,
    db: Session = Depends(get_db),
    _auth=Depends(require_relay_auth),
):
    """Nhận tín hiệu Heartbeat từ Relay Worker trên PC văn phòng."""
    from datetime import datetime

    worker_name = payload.worker_name if payload else "3CX-Relay-PC"
    cfg = record_relay_heartbeat(
        db,
        worker_name=worker_name,
        client_ip=_extract_client_ip(request),
    )
    return RelayHeartbeatOut(
        ok=True,
        server_time=datetime.now(),
        execution_mode=(cfg.execution_mode or "DIRECT").upper(),
    )


@router.get("/relay/next-task", response_model=RelayNextTaskOut)
def relay_next_task(
    request: Request,
    worker_name: str = Query(default="3CX-Relay-PC", max_length=150),
    db: Session = Depends(get_db),
    _auth=Depends(require_relay_auth),
):
    """Relay Worker poll để nhận nguyên tử (atomic claim) 1 tác vụ PENDING cũ nhất."""
    claimed = claim_next_relay_task(
        db,
        worker_name=worker_name,
        client_ip=_extract_client_ip(request),
    )
    if not claimed:
        return RelayNextTaskOut(has_task=False, task=None)
    return RelayNextTaskOut(has_task=True, task=claimed)


@router.post("/relay/tasks/{task_id}/report", response_model=RelayReportOut)
async def relay_report_task(
    task_id: int,
    status_val: str = Form(..., alias="status"),
    worker_name: str = Form(default="3CX-Relay-PC"),
    applied_lines_json: str = Form(default="[]"),
    error_message: str = Form(default=""),
    screenshot: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    _auth=Depends(require_relay_auth),
):
    """Nhận kết quả thực thi và ảnh PNG chụp màn hình từ Relay Worker."""
    img_bytes: Optional[bytes] = None
    if screenshot is not None:
        img_bytes = await screenshot.read()

    try:
        task, saved_url = report_relay_task_result(
            db,
            task_id=task_id,
            status_str=status_val,
            worker_name=worker_name,
            applied_lines_json=applied_lines_json,
            error_message=error_message,
            screenshot_bytes=img_bytes,
        )
    except ValueError as ve:
        msg = str(ve)
        if "Không tìm thấy" in msg:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    return RelayReportOut(
        success=True,
        task_id=task.id,
        sync_log_id=task.sync_log_id,
        screenshot_path=saved_url,
    )
