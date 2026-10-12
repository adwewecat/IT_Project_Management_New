import asyncio
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.schemas.job import (
    JobItem, JobRunLog, JobUpdateScheduleRequest,
    JobToggleRequest, JobRunResponse, JobDashboardStats,
    JobUpdateEmailRequest, JobToggleHideRequest
)
from app.services.job_scheduler_service import job_scheduler_service
from app.services.ram_limit_audit_service import ram_limit_audit_service
from app.services.restaurant_audit_service import restaurant_audit_service
from app.api.deps import require_super_admin_or_dung

router = APIRouter(prefix="/jobs", tags=["Jobs & Scheduler"])

def check_is_dung_or_super_admin(current_user) -> bool:
    username = (getattr(current_user, "username", "") or "").lower().strip()
    is_super = getattr(current_user, "is_super_admin", False) or username in ["admin", "administrator", "dung.nguyenanh"]
    pq = str(getattr(current_user, "phanquyen", "") or "").strip()
    return is_super or username == "dung.nguyenanh" or pq == "0"

@router.get("", response_model=List[JobItem])
def get_jobs(current_user = Depends(require_super_admin_or_dung)):
    """Lấy danh sách tất cả các tác vụ ngầm (Chỉ Super Admin & Dung)."""
    jobs = job_scheduler_service.get_all_jobs()
    if not check_is_dung_or_super_admin(current_user):
        jobs = [j for j in jobs if j.category != "dung_utility" and not j.restricted_to_dung and not j.is_hidden]
    return jobs

@router.patch("/{job_id}/hide", response_model=JobItem)
def toggle_hide_job(
    job_id: str,
    payload: JobToggleHideRequest,
    current_user = Depends(require_super_admin_or_dung)
):
    """Ẩn hoặc Bỏ ẩn một tác vụ (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ dung.nguyenanh hoặc Super Admin mới có quyền ẩn/bỏ ẩn tác vụ.")
    job = job_scheduler_service.set_job_hidden(job_id, payload.is_hidden)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ.")
    return job

@router.get("/ram-limit-audit/dates")
def get_ram_audit_dates(current_user = Depends(require_super_admin_or_dung)):
    """Lấy danh sách các ngày đã quét giới hạn RAM SQL/Mongo (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return ram_limit_audit_service.get_scan_dates()

@router.get("/ram-limit-audit")
def get_ram_audit_logs(scan_date: Optional[str] = None, current_user = Depends(require_super_admin_or_dung)):
    """Lấy kết quả kiểm tra giới hạn RAM SQL/Mongo theo ngày (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    items = ram_limit_audit_service.get_audit_logs(scan_date)
    return {
        "scan_date": scan_date,
        "total": len(items),
        "items": items
    }

from pydantic import BaseModel, Field

class RamLimitTargetConfigRequest(BaseModel):
    sql_limit_gb: float = Field(default=2.0, ge=0.5, le=64.0, description="Mức RAM chuẩn cho SQL Server (GB)")
    mongo_limit_gb: float = Field(default=6.0, ge=0.5, le=64.0, description="Mức RAM chuẩn cho MongoDB (GB)")
    sql_port: int = Field(default=1433, ge=1, le=65535, description="Port kết nối SQL Server")
    sql_user: str = Field(default="rk7", description="Tài khoản đăng nhập SQL Server")
    sql_password: str = Field(default="rk7", description="Mật khẩu đăng nhập SQL Server")
    mongo_port: int = Field(default=27017, ge=1, le=65535, description="Port kết nối MongoDB")

class RamLimitBatchApplyRequest(BaseModel):
    scope: str = Field(default="unlimited_only", description="unlimited_only | all_active | custom")
    restaurant_ids: Optional[List[int]] = None
    recipients: Optional[List[str]] = None
    send_email: bool = True
    skip_tch: Optional[bool] = None
    exclude_keywords: Optional[List[str]] = None
    target_sql_gb: Optional[float] = None
    target_mongo_gb: Optional[float] = None

class RamLimitRemoveBatchRequest(BaseModel):
    scope: str = Field(default="custom", description="custom | custom_only | all_active")
    restaurant_ids: Optional[List[int]] = None
    recipients: Optional[List[str]] = None
    send_email: bool = False

class RamLimitEmailConfigRequest(BaseModel):
    recipients: List[str]

class RamLimitExcludeConfigRequest(BaseModel):
    skip_tch: bool = True
    exclude_keywords: List[str] = ["TCH"]

class RamLimitScanRequest(BaseModel):
    skip_tch: Optional[bool] = None
    exclude_keywords: Optional[List[str]] = None
    target_sql_gb: Optional[float] = None
    target_mongo_gb: Optional[float] = None

class RamLimitSendEmailRequest(BaseModel):
    scan_date: Optional[str] = None
    recipients: Optional[List[str]] = None
    target_sql_gb: Optional[float] = None
    target_mongo_gb: Optional[float] = None

@router.get("/ram-limit-audit/target-config")
def get_ram_audit_target_config(current_user = Depends(require_super_admin_or_dung)):
    """Lấy cấu hình mức giới hạn RAM mục tiêu và thông số kết nối (SQL & Mongo) (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return ram_limit_audit_service.get_target_config()

@router.put("/ram-limit-audit/target-config")
def save_ram_audit_target_config(req: RamLimitTargetConfigRequest, current_user = Depends(require_super_admin_or_dung)):
    """Lưu cấu hình mức giới hạn RAM mục tiêu và thông số kết nối (SQL & Mongo) (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    saved = ram_limit_audit_service.save_target_config(
        sql_limit_gb=req.sql_limit_gb,
        mongo_limit_gb=req.mongo_limit_gb,
        sql_port=req.sql_port,
        sql_user=req.sql_user,
        sql_password=req.sql_password,
        mongo_port=req.mongo_port
    )
    return {
        "config": saved,
        "message": f"Đã lưu cấu hình mức RAM (SQL: {req.sql_limit_gb}GB, MongoDB: {req.mongo_limit_gb}GB) và thông số kết nối (SQL Port: {req.sql_port}, Mongo Port: {req.mongo_port}) thành công!"
    }

@router.post("/ram-limit-audit/scan-now")
async def scan_ram_limits_now(req: Optional[RamLimitScanRequest] = None, current_user = Depends(require_super_admin_or_dung)):
    """Kích hoạt quét kiểm tra giới hạn RAM SQL/Mongo ngay lập tức (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    skip_tch = req.skip_tch if req else None
    exclude_keywords = req.exclude_keywords if req else None
    target_sql_gb = req.target_sql_gb if req else None
    target_mongo_gb = req.target_mongo_gb if req else None
    res = await asyncio.to_thread(
        ram_limit_audit_service.scan_and_log_ram_limits,
        skip_tch=skip_tch,
        exclude_keywords=exclude_keywords,
        skip_network_if_excluded=True,
        target_sql_gb=target_sql_gb,
        target_mongo_gb=target_mongo_gb
    )
    return res

@router.post("/ram-limit-audit/batch-apply")
async def batch_apply_ram_limits(req: RamLimitBatchApplyRequest, current_user = Depends(require_super_admin_or_dung)):
    """Xử lý hàng loạt giới hạn RAM SQL & MongoDB và tự động gửi email báo cáo (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(
        ram_limit_audit_service.apply_ram_limits_batch,
        req.scope,
        req.restaurant_ids,
        req.recipients,
        req.send_email,
        req.skip_tch,
        req.exclude_keywords,
        req.target_sql_gb,
        req.target_mongo_gb
    )
    return res

@router.post("/ram-limit-audit/scan-single/{restaurant_id}")
async def scan_single_restaurant_ram_limit(
    restaurant_id: int,
    target_sql_gb: Optional[float] = None,
    target_mongo_gb: Optional[float] = None,
    current_user = Depends(require_super_admin_or_dung)
):
    """Quét kiểm tra giới hạn RAM cho 1 nhà hàng cụ thể (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(
        ram_limit_audit_service.scan_single_restaurant,
        restaurant_id,
        target_sql_gb,
        target_mongo_gb
    )
    return res

@router.get("/ram-limit-audit/custom-configs")
def get_ram_audit_custom_configs(current_user = Depends(require_super_admin_or_dung)):
    """Lấy danh sách các nhà hàng đang áp dụng cấu hình RAM riêng (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return ram_limit_audit_service.get_custom_configs()

@router.delete("/ram-limit-audit/custom-configs/{restaurant_id}")
def delete_ram_audit_custom_config(restaurant_id: int, current_user = Depends(require_super_admin_or_dung)):
    """Xóa cấu hình RAM riêng của 1 nhà hàng để trở về cấu hình mặc định (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    deleted = ram_limit_audit_service.delete_custom_config(restaurant_id)
    return {
        "success": deleted,
        "message": f"Đã xóa cấu hình RAM riêng cho nhà hàng ID {restaurant_id} thành công!" if deleted else "Không tìm thấy cấu hình riêng của nhà hàng này."
    }

@router.post("/ram-limit-audit/apply-single/{restaurant_id}")
async def apply_single_restaurant_ram_limit(
    restaurant_id: int,
    target_sql_gb: Optional[float] = None,
    target_mongo_gb: Optional[float] = None,
    save_as_custom: bool = False,
    current_user = Depends(require_super_admin_or_dung)
):
    """Xử lý giới hạn RAM SQL & Mongo cho 1 nhà hàng cụ thể (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(
        ram_limit_audit_service.apply_ram_limits_single,
        restaurant_id,
        target_sql_gb,
        target_mongo_gb,
        None,
        None,
        None,
        None,
        save_as_custom
    )
    return res

@router.post("/ram-limit-audit/remove-limits-single/{restaurant_id}")
async def remove_single_restaurant_ram_limit(
    restaurant_id: int,
    current_user = Depends(require_super_admin_or_dung)
):
    """Gỡ bỏ hoàn toàn giới hạn RAM SQL Server & MongoDB cho 1 nhà hàng cụ thể (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(
        ram_limit_audit_service.remove_ram_limits_single,
        restaurant_id
    )
    return res

@router.post("/ram-limit-audit/remove-limits-batch")
async def remove_batch_restaurant_ram_limits(
    req: RamLimitRemoveBatchRequest,
    current_user = Depends(require_super_admin_or_dung)
):
    """Gỡ bỏ hoàn toàn giới hạn RAM SQL Server & MongoDB hàng loạt (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(
        ram_limit_audit_service.remove_ram_limits_batch,
        req.scope,
        req.restaurant_ids,
        req.recipients,
        req.send_email
    )
    return res

@router.get("/ram-limit-audit/exclude-config")
def get_ram_audit_exclude_config(current_user = Depends(require_super_admin_or_dung)):
    """Lấy cấu hình loại trừ nhà hàng (TCH và danh sách từ khóa/mã SAP) (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return ram_limit_audit_service.get_exclude_config()

@router.put("/ram-limit-audit/exclude-config")
def save_ram_audit_exclude_config(req: RamLimitExcludeConfigRequest, current_user = Depends(require_super_admin_or_dung)):
    """Lưu cấu hình loại trừ nhà hàng (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    saved = ram_limit_audit_service.save_exclude_config(req.skip_tch, req.exclude_keywords)
    return {
        "config": saved,
        "message": "Đã lưu cấu hình danh sách nhà hàng loại trừ thành công!"
    }

@router.get("/ram-limit-audit/email-config")
def get_ram_audit_email_config(current_user = Depends(require_super_admin_or_dung)):
    """Lấy cấu hình email người nhận thông báo RAM audit (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return {"recipients": ram_limit_audit_service.get_email_config()}

@router.put("/ram-limit-audit/email-config")
def save_ram_audit_email_config(req: RamLimitEmailConfigRequest, current_user = Depends(require_super_admin_or_dung)):
    """Lưu cấu hình email người nhận thông báo RAM audit (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    saved = ram_limit_audit_service.save_email_config(req.recipients)
    return {"recipients": saved, "message": "Đã lưu cấu hình email nhận thông báo thành công!"}

@router.post("/ram-limit-audit/send-email")
async def send_ram_audit_email_report(req: RamLimitSendEmailRequest, current_user = Depends(require_super_admin_or_dung)):
    """Gửi email báo cáo kết quả kiểm tra RAM SQL/Mongo (Chỉ dung.nguyenanh hoặc Super Admin)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(
        ram_limit_audit_service.send_ram_audit_email,
        req.scan_date,
        req.recipients,
        None,
        req.target_sql_gb,
        req.target_mongo_gb
    )
    return res

@router.get("/dashboard", response_model=JobDashboardStats)
def get_dashboard_stats(current_user = Depends(require_super_admin_or_dung)):
    """Lấy thống kê tổng quan cho Dashboard tác vụ ngầm (Chỉ Super Admin)."""
    return job_scheduler_service.get_dashboard_stats()

class RestaurantAuditEmailRequest(BaseModel):
    recipients: List[str]

class RestaurantAuditConfigRequest(BaseModel):
    excluded_keywords: List[str]

@router.get("/restaurant-audit/config")
def get_restaurant_audit_config(current_user = Depends(require_super_admin_or_dung)):
    """Lấy danh sách cấu hình các nhà hàng/từ khóa loại bỏ mặc định (Chỉ Super Admin & Dung)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return restaurant_audit_service.get_config()

@router.post("/restaurant-audit/config")
def save_restaurant_audit_config(
    req: RestaurantAuditConfigRequest,
    current_user = Depends(require_super_admin_or_dung)
):
    """Cập nhật danh sách cấu hình các nhà hàng/từ khóa loại bỏ mặc định (Chỉ Super Admin & Dung)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return restaurant_audit_service.save_config(req.excluded_keywords)

@router.get("/restaurant-audit/latest")
def get_restaurant_audit_latest(current_user = Depends(require_super_admin_or_dung)):
    """Lấy kết quả rà soát thông tin nhà hàng mới nhất (Chỉ Super Admin & Dung)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    return restaurant_audit_service.get_latest_results()

@router.post("/restaurant-audit/scan")
async def scan_restaurant_audit(current_user = Depends(require_super_admin_or_dung)):
    """Chạy rà soát thông tin nhà hàng & ping router trực tiếp (Chỉ Super Admin & Dung)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    res = await asyncio.to_thread(restaurant_audit_service.audit_restaurants)
    return res

@router.post("/restaurant-audit/send-email")
async def send_restaurant_audit_email(
    req: RestaurantAuditEmailRequest,
    current_user = Depends(require_super_admin_or_dung)
):
    """Gửi email nhắc nhở bổ sung thông tin nhà hàng (Chỉ Super Admin & Dung)."""
    if not check_is_dung_or_super_admin(current_user):
        raise HTTPException(status_code=403, detail="Chỉ tài khoản dung.nguyenanh hoặc Super Admin mới có quyền truy cập.")
    latest = restaurant_audit_service.get_latest_results()
    if not latest:
        raise HTTPException(status_code=400, detail="Chưa có kết quả rà soát nào trong hệ thống. Vui lòng bấm 'Rà Soát Ngay' trước khi gửi email.")
    res = await asyncio.to_thread(restaurant_audit_service.send_audit_email, latest, req.recipients)
    return res

@router.post("/{job_id}/run", response_model=JobRunResponse)
async def run_job_dry_run(job_id: str, current_user = Depends(require_super_admin_or_dung)):
    """
    Kích hoạt chạy thử nghiệm tác vụ (Chỉ Super Admin).
    """
    user_name = getattr(current_user, "full_name", None) or getattr(current_user, "username", "Admin")
    log = await job_scheduler_service.trigger_job_dry_run(job_id, triggered_by=user_name)
    if not log:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ yêu cầu")
    return JobRunResponse(
        success=True,
        message=f"Đã kích hoạt chạy thử nghiệm an toàn cho tác vụ '{job_id}' thành công.",
        job_id=job_id,
        log=log
    )

@router.put("/{job_id}/toggle", response_model=JobItem)
def toggle_job(job_id: str, req: JobToggleRequest, current_user = Depends(require_super_admin_or_dung)):
    """Bật hoặc tắt trạng thái tự động của tác vụ (Chỉ Super Admin)."""
    job = job_scheduler_service.toggle_job(job_id, req)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ yêu cầu")
    return job

@router.put("/{job_id}/schedule", response_model=JobItem)
def update_schedule(job_id: str, req: JobUpdateScheduleRequest, current_user = Depends(require_super_admin_or_dung)):
    """Cập nhật cấu hình lịch chạy tự động (Chỉ Super Admin)."""
    job = job_scheduler_service.update_schedule(job_id, req)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ yêu cầu")
    return job

@router.put("/{job_id}/email", response_model=JobItem)
def update_email(job_id: str, req: JobUpdateEmailRequest, current_user = Depends(require_super_admin_or_dung)):
    """Cập nhật danh sách email nhận thông báo tự động (Chỉ Super Admin)."""
    job = job_scheduler_service.update_email(job_id, req.email_recipients)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ yêu cầu")
    return job

@router.get("/{job_id}/logs", response_model=List[JobRunLog])
def get_job_logs(job_id: str, limit: int = 50, current_user = Depends(require_super_admin_or_dung)):
    """Xem lịch sử thực thi của một tác vụ cụ thể (Chỉ Super Admin)."""
    return job_scheduler_service.get_job_logs(job_id=job_id, limit=limit)

@router.get("/logs/all", response_model=List[JobRunLog])
def get_all_logs(limit: int = 100, current_user = Depends(require_super_admin_or_dung)):
    """Xem toàn bộ nhật ký thực thi của tất cả các tác vụ (Chỉ Super Admin)."""
    return job_scheduler_service.get_job_logs(job_id=None, limit=limit)
