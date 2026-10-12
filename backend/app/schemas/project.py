from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    TaskName: str


class TaskCreate(TaskBase):
    pass


class TaskOut(TaskBase):
    TaskID: int
    MemberID: int
    Done: bool
    CompletedAt: Optional[datetime] = None
    LastChangedBy: Optional[str] = None
    LastChangedAt: Optional[datetime] = None
    Attachment: Optional[str] = None
    ReviewStatus: Optional[str] = None
    ReviewNote: Optional[str] = None
    ReviewedBy: Optional[str] = None
    ReviewedAt: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TaskToggleRequest(BaseModel):
    done: bool


class BulkTaskToggleRequest(BaseModel):
    task_ids: List[int]
    done: bool = True


class ToggleAllRequest(BaseModel):
    done: bool = True


class TaskReviewRequest(BaseModel):
    review_status: Optional[str] = None  # 'ok', 'fail', or None (reset)
    review_note: Optional[str] = None


class MemberBase(BaseModel):
    MemberName: str
    MemberCode: Optional[str] = None


class MemberCreate(MemberBase):
    pass


class MemberOut(MemberBase):
    MemberID: int
    ProjectID: int
    CompletedAt: Optional[datetime] = None
    tasks: List[TaskOut] = []

    model_config = ConfigDict(from_attributes=True)


class ProjectBase(BaseModel):
    ProjectName: str
    Deadline: Optional[date] = None
    ProjectCode: Optional[str] = None
    Description: Optional[str] = None
    Images: Optional[str] = None
    Files: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    ProjectName: Optional[str] = None
    Deadline: Optional[date] = None
    Status: Optional[str] = None
    ProjectCode: Optional[str] = None
    Description: Optional[str] = None
    Images: Optional[str] = None
    Files: Optional[str] = None


class ProjectDescriptionUpdate(BaseModel):
    Description: Optional[str] = None
    Images: Optional[str] = None
    Files: Optional[str] = None


class ProjectOut(ProjectBase):
    ProjectID: int
    Status: str
    DescriptionUpdatedAt: Optional[datetime] = None
    DescriptionUpdatedBy: Optional[str] = None
    members: List[MemberOut] = []
    total_tasks: int = 0
    done_tasks: int = 0
    progress_percent: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class ActivityLogOut(BaseModel):
    LogID: int
    ProjectID: int
    ProjectName: Optional[str] = None
    MemberID: Optional[int] = None
    TaskID: Optional[int] = None
    ActionTime: datetime
    ActionBy: str
    ActionType: str
    Message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectImportResult(BaseModel):
    success: bool
    projects_count: int = 0
    members_count: int = 0
    tasks_count: int = 0
    message: str
    errors: List[str] = []


class AppPmItem(BaseModel):
    id: int
    project_name: str
    pm_project: Optional[str] = None
    ngay_trienkhai: Optional[datetime] = None
    ngay_update: Optional[datetime] = None
    note_them: Optional[str] = None
    active: bool = True

    model_config = ConfigDict(from_attributes=True)


class AppPmCreate(BaseModel):
    project_name: str
    pm_project: Optional[str] = None
    note_them: Optional[str] = None


class AppPmUpdate(BaseModel):
    project_name: Optional[str] = None
    pm_project: Optional[str] = None
    note_them: Optional[str] = None
    active: Optional[bool] = None


class QuickAssignTaskRequest(BaseModel):
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    member_id: Optional[int] = None
    member_name: Optional[str] = None
    task_name: str
    deadline: Optional[date] = None
    attachment: Optional[str] = None


class TeamMemberItem(BaseModel):
    id: int
    username: str
    full_name: str
    label: str
    role_name: Optional[str] = "Team IT App"


