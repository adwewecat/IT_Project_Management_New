export interface StaffConfigItem {
  id: number;
  username: string;
  full_name?: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface EvaluationCriteriaDetail {
  memo_ok: number;
  memo_fail: number;
  pim_ok: number;
  pim_fail: number;
  setup_ok: number;
  setup_fail: number;
  violation_count: number;
  project_ok: number;
  project_late: number;
}

export interface StaffEvaluationSummary {
  username: string;
  full_name: string;
  total_tasks: number;
  correct_tasks: number;
  wrong_tasks: number;
  late_tasks: number;
  correct_rate: number;
  wrong_rate: number;
  late_rate: number;
  details: EvaluationCriteriaDetail;
}

export interface MonthTeamEvaluation {
  month: number;
  year: number;
  label: string;
  total_tasks: number;
  correct_tasks: number;
  wrong_tasks: number;
  late_tasks: number;
  correct_rate: number;
  wrong_rate: number;
  late_rate: number;
  staff_summaries: StaffEvaluationSummary[];
}

export interface EvaluationReportResponse {
  current_month: MonthTeamEvaluation;
  prev_month_1: MonthTeamEvaluation;
  prev_month_2: MonthTeamEvaluation;
  evaluated_staff_list: Array<{ username: string; full_name: string }>;
}
