from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class JobScheduleConfig(BaseModel):
    schedule_type: str = Field(default="daily", description="daily, interval, weekly, custom_cron")
    time: Optional[str] = Field(default="06:00", description="Khung giờ 1 (HH:mm)")
    time_2: Optional[str] = Field(default=None, description="Khung giờ 2 (HH:mm)")
    time_3: Optional[str] = Field(default=None, description="Khung giờ 3 (HH:mm)")
    interval_minutes: Optional[int] = Field(default=30, description="Interval in minutes if interval type")
    days_of_week: Optional[List[int]] = Field(default=[1, 2, 3, 4, 5, 6, 7], description="1=T2 ... 7=CN")
    cron_expression: str = Field(default="0 6 * * *", description="Cron expression")
    human_readable: str = Field(default="Hàng ngày lúc 06:00", description="Human readable description")

class JobItem(BaseModel):
    job_id: str
    job_name: str
    category: str
    category_name: str
    description: str
    source_reference: str
    is_enabled: bool = True
    status: str = "idle"  # idle, running, success, failed
    schedule: JobScheduleConfig
    has_email_notification: bool = False
    email_recipients: Optional[str] = None
    last_run_at: Optional[str] = None
    next_run_at: Optional[str] = None
    last_duration: Optional[float] = None
    last_status: Optional[str] = None
    total_runs: int = 0
    success_runs: int = 0
    failed_runs: int = 0
    is_hidden: bool = False
    restricted_to_dung: bool = False

class JobRunLog(BaseModel):
    id: str
    job_id: str
    job_name: str
    started_at: str
    finished_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    status: str = "success"  # success, failed, running
    message: str
    details: Optional[str] = None
    triggered_by: str = "manual"  # manual, scheduler

class JobUpdateScheduleRequest(BaseModel):
    schedule_type: str = "daily"
    time: Optional[str] = "06:00"
    time_2: Optional[str] = None
    time_3: Optional[str] = None
    interval_minutes: Optional[int] = 30
    days_of_week: Optional[List[int]] = [1, 2, 3, 4, 5, 6, 7]
    cron_expression: Optional[str] = None
    email_recipients: Optional[str] = None

class JobUpdateEmailRequest(BaseModel):
    email_recipients: Optional[str] = None

class JobToggleRequest(BaseModel):
    is_enabled: bool

class JobToggleHideRequest(BaseModel):
    is_hidden: bool

class JobRunResponse(BaseModel):
    success: bool
    message: str
    job_id: str
    log: JobRunLog

class JobDashboardStats(BaseModel):
    total_jobs: int
    active_jobs: int
    disabled_jobs: int
    running_jobs: int
    categories_count: Dict[str, int]
    upcoming_jobs: List[Dict[str, Any]]
