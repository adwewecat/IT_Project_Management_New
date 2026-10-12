from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class StaffConfigItem(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    is_active: bool
    sort_order: int


class StaffConfigSavePayload(BaseModel):
    usernames: List[str]


class EvaluationCriteriaDetail(BaseModel):
    memo_ok: int = 0
    memo_fail: int = 0  # Quá 5 ngày chưa đóng HOẶC fail
    pim_ok: int = 0
    pim_fail: int = 0  # Quá 3 ngày chưa đóng
    setup_ok: int = 0
    setup_fail: int = 0  # Checklist fail
    violation_count: int = 0  # Miss mail, trễ, sai việc
    project_ok: int = 0
    project_late: int = 0  # Trễ deadline


class StaffEvaluationSummary(BaseModel):
    username: str
    full_name: str
    total_tasks: int = 0
    correct_tasks: int = 0
    wrong_tasks: int = 0
    late_tasks: int = 0
    correct_rate: float = 0.0
    wrong_rate: float = 0.0
    late_rate: float = 0.0
    details: EvaluationCriteriaDetail


class MonthTeamEvaluation(BaseModel):
    month: int
    year: int
    label: str
    total_tasks: int = 0
    correct_tasks: int = 0
    wrong_tasks: int = 0
    late_tasks: int = 0
    correct_rate: float = 0.0
    wrong_rate: float = 0.0
    late_rate: float = 0.0
    staff_summaries: List[StaffEvaluationSummary] = []


class EvaluationReportResponse(BaseModel):
    current_month: MonthTeamEvaluation
    prev_month_1: MonthTeamEvaluation
    prev_month_2: MonthTeamEvaluation
    evaluated_staff_list: List[Dict[str, str]]
