# -*- coding: utf-8 -*-
"""
Pydantic v2 schemas cho phân hệ Tự Động Phân Hàng Đợi Trực Hotline 3CX.
Định nghĩa cấu trúc dữ liệu cho:
- Danh mục nhân sự (Hotline3cxMember)
- Lịch phân line theo ngày/tuần/tháng (Hotline3cxSchedule)
- Cấu hình kết nối portal 3CX (Hotline3cxConfig - bảo mật, ẩn password)
- Kế hoạch phân ca trực đã tính toán (ResolvedShiftPlan)
- Nhật ký đồng bộ Playwright (Hotline3cxSyncLog)
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

# Định nghĩa các loại chế độ phân ca và mã ca trực
ShiftMode = Literal["AUTO", "WEEKDAY", "WEEKEND"]
ShiftCode = Literal["MORNING", "EVENING", "MORNING_BACKUP", "EVENING_BACKUP"]
ExecutionMode = Literal["DIRECT", "RELAY"]


# ==============================================================================
# 1. SCHEMAS CHO DANH MỤC NHÂN SỰ (MEMBERS)
# ==============================================================================


class HotlineMemberBase(BaseModel):
    """Schema cơ bản cho nhân sự trực hotline 3CX."""

    ext_line: str = Field(..., description="Số máy nhánh 3CX (VD: 8740)")
    full_name: str = Field(..., description="Họ và tên nhân sự")
    department: Optional[str] = Field(default="", description="Phòng ban (VD: HCM IT DEPT)")
    is_active: bool = Field(default=True, description="Trạng thái hoạt động")
    sort_order: int = Field(default=0, description="Thứ tự hiển thị")


class HotlineMemberCreate(HotlineMemberBase):
    """Schema tạo mới nhân sự trực hotline."""

    pass


class HotlineMemberUpdate(BaseModel):
    """Schema cập nhật nhân sự trực hotline."""

    ext_line: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class HotlineMemberOut(HotlineMemberBase):
    """Schema trả về thông tin nhân sự trực hotline."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ==============================================================================
# 2. SCHEMAS CHO LỊCH TRỰC (SCHEDULES) & BULK ACTIONS
# ==============================================================================


class ScheduleDayUpsertItem(BaseModel):
    """Dữ liệu cập nhật hoặc thêm mới lịch trực theo ngày."""

    duty_date: date
    shift_mode: ShiftMode = "AUTO"
    morning_lines: List[str] = Field(default_factory=list, description="Line trực ca sáng ngày thường")
    evening_lines: List[str] = Field(default_factory=list, description="Line trực ca chiều ngày thường")
    weekend_lines: List[str] = Field(
        default_factory=list, description="Line trực cuối tuần (sáng hoặc full)"
    )
    weekend_evening_override: List[str] = Field(
        default_factory=list, description="Line trực ca chiều cuối tuần (nếu chỉ định riêng)"
    )
    morning_backup_time: Optional[str] = Field(
        default=None, description="Giờ hẹn cập nhật Manual Backup Ca Sáng (HH:mm 24h)"
    )
    morning_backup_lines: List[str] = Field(
        default_factory=list, description="Danh sách line Backup Ca Sáng"
    )
    evening_backup_time: Optional[str] = Field(
        default=None, description="Giờ hẹn cập nhật Manual Backup Ca Tối (HH:mm 24h)"
    )
    evening_backup_lines: List[str] = Field(
        default_factory=list, description="Danh sách line Backup Ca Tối (Chính 1 / Phụ 2)"
    )
    note: Optional[str] = Field(default=None, description="Ghi chú ngày trực")


class ScheduleDayItem(ScheduleDayUpsertItem):
    """Dữ liệu hiển thị một ngày trong lưới lịch trực (đã bổ sung thông tin computed)."""

    id: Optional[int] = None
    weekday_label: str = Field(default="", description="Tên thứ trong tuần (Thứ Hai, Thứ Ba...)")
    effective_mode: str = Field(
        default="WEEKDAY", description="Chế độ phân ca thực tế (WEEKDAY / WEEKEND)"
    )
    is_weekend: bool = Field(default=False, description="Có phải T7 hoặc CN không")
    is_custom_holiday: bool = Field(
        default=False, description="Ngày được khai báo trong danh mục Ngày Lễ Riêng hay không"
    )
    holiday_name: Optional[str] = Field(
        default=None, description="Tên ngày lễ riêng (nếu có)"
    )
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None


class HotlineHolidayItem(BaseModel):
    """Thông tin một ngày lễ riêng trong danh mục ngày lễ hotline."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    holiday_date: date
    name: str = ""
    weekday_label: str = ""
    weekend_lines: List[str] = Field(default_factory=list)
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None


class HotlineHolidayBatchCreateRequest(BaseModel):
    """Yêu cầu thêm một ngày lễ hoặc một khoảng ngày lễ liên tiếp (kèm nhân sự 06:00 tuỳ chọn)."""

    start_date: date
    end_date: Optional[date] = None
    name: str = Field(default="", max_length=250)
    weekend_lines: List[str] = Field(default_factory=list)


class ScheduleBulkSaveRequest(BaseModel):
    """Yêu cầu lưu hàng loạt lịch trực nhiều ngày."""

    days: List[ScheduleDayUpsertItem]


class CloneWeekRequest(BaseModel):
    """Yêu cầu sao chép lịch trực từ tuần trước sang tuần mục tiêu."""

    target_week_start: date = Field(..., description="Ngày Thứ Hai của tuần mục tiêu")


class ApplyMonthTemplateRequest(BaseModel):
    """Yêu cầu áp dụng mẫu lịch 7 ngày cho toàn bộ các ngày trong tháng."""

    year: int
    month: int
    template_days: List[ScheduleDayUpsertItem] = Field(
        ..., description="Danh sách cấu hình mẫu cho 7 ngày T2-CN"
    )
    overwrite_existing: bool = Field(
        default=True, description="Có ghi đè các ngày đã có cấu hình trong tháng hay không"
    )


# ==============================================================================
# 3. SCHEMAS CHO CẤU HÌNH HỆ THỐNG (CONFIG - AN TOÀN BẢO MẬT)
# ==============================================================================


class Hotline3cxConfigOut(BaseModel):
    """
    Schema trả về cấu hình công khai cho frontend.
    TUYỆT ĐỐI KHÔNG chứa password hay password_enc, chỉ trả has_password=True/False.
    """

    model_config = ConfigDict(from_attributes=True)

    portal_url: str
    username: str
    has_password: bool = Field(
        ..., description="Cho biết hệ thống đã có mật khẩu (từ DB hoặc .env fallback) hay chưa"
    )
    day_queue_name: str
    night_queue_name: str
    morning_time: str
    evening_time: str
    alert_emails: str
    execution_mode: str = "DIRECT"
    relay_token: Optional[str] = None
    relay_worker_name: Optional[str] = None
    relay_last_ip: Optional[str] = None
    relay_last_seen_at: Optional[datetime] = None
    relay_online: bool = False
    updated_at: Optional[datetime] = None


class Hotline3cxConfigUpdate(BaseModel):
    """Schema cập nhật cấu hình hệ thống trực Hotline 3CX."""

    portal_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = Field(
        default=None, description="Mật khẩu mới (nếu rỗng hoặc None thì giữ nguyên mật khẩu cũ)"
    )
    day_queue_name: Optional[str] = None
    night_queue_name: Optional[str] = None
    morning_time: Optional[str] = None
    evening_time: Optional[str] = None
    alert_emails: Optional[str] = None
    execution_mode: Optional[ExecutionMode] = None


class ApplyNowRequest(BaseModel):
    """Yêu cầu kích hoạt chạy đồng bộ ngay lập tức."""

    duty_date: Optional[date] = None
    shift_code: Optional[ShiftCode] = None
    dry_run: bool = Field(
        default=False, description="Chạy thử nghiệm không click Save trong portal 3CX"
    )


# ==============================================================================
# 4. SCHEMAS CHO KẾ HOẠCH PHÂN CA ĐÃ GIẢI MÃ (RESOLVED SHIFT PLAN)
# ==============================================================================


class ResolvedUserAssignment(BaseModel):
    """Một nhân sự được phân vào hàng đợi kèm cấu hình Skill Group (nếu có)."""

    ext_line: str
    skill_group: Optional[str] = Field(
        default=None, description="Nhóm kỹ năng (VD: '1', '2'...) hoặc None nếu không dùng"
    )


class ResolvedShiftPlan(BaseModel):
    """Kế hoạch phân bổ nhân sự vào hàng đợi 3CX hoàn chỉnh sau khi xử lý quy tắc nghiệp vụ."""

    duty_date: date
    shift_code: ShiftCode
    effective_mode: str = Field(..., description="WEEKDAY hoặc WEEKEND")
    queue_name: str = Field(..., description="Tên hàng đợi 3CX đích (Day Queue hoặc Night Queue)")
    use_skill_group: bool = Field(..., description="Có thiết lập Skill Group hay không")
    entries: List[ResolvedUserAssignment] = Field(
        default_factory=list, description="Danh sách line và skill group tương ứng"
    )
    should_skip: bool = Field(
        default=False, description="Đánh dấu bỏ qua đồng bộ nếu không có line trực nào"
    )
    skip_reason: Optional[str] = Field(
        default=None, description="Lý do bỏ qua đồng bộ nếu should_skip=True"
    )


# ==============================================================================
# 5. SCHEMAS CHO NHẬT KÝ ĐỒNG BỘ (SYNC LOGS)
# ==============================================================================


class Hotline3cxSyncLogOut(BaseModel):
    """Nhật ký đồng bộ Playwright vào portal 3CX."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    duty_date: date
    shift_code: str
    queue_name: str
    applied_lines: List[dict] = Field(default_factory=list)
    status: str
    is_dry_run: bool
    triggered_by: Optional[str] = None
    error_message: Optional[str] = None
    screenshot_path: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


# ==============================================================================
# 6. SCHEMAS CHO 3CX SYNC RELAY WORKER
# ==============================================================================


class RelayHeartbeatIn(BaseModel):
    """Thông tin heartbeat gửi từ Relay Worker trên PC văn phòng."""

    worker_name: str = Field(default="3CX-Relay-PC", max_length=150)
    can_reach_3cx: bool = True
    last_probe_error: Optional[str] = None


class RelayHeartbeatOut(BaseModel):
    """Phản hồi heartbeat cho Relay Worker."""

    ok: bool = True
    server_time: datetime
    execution_mode: str


class RelayTaskPayload(BaseModel):
    """Payload tác vụ đầy đủ giao cho Relay Worker thực thi Playwright cục bộ."""

    task_id: int
    duty_date: date
    shift_code: str
    queue_name: str
    is_dry_run: bool
    portal_url: str
    username: str
    password: str
    plan: ResolvedShiftPlan


class RelayNextTaskOut(BaseModel):
    """Phản hồi endpoint GET /relay/next-task."""

    has_task: bool
    task: Optional[RelayTaskPayload] = None


class RelayReportOut(BaseModel):
    """Phản hồi sau khi Relay Worker nộp kết quả thực thi."""

    success: bool
    task_id: int
    sync_log_id: Optional[int] = None
    screenshot_path: Optional[str] = None
