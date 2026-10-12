export interface JobScheduleConfig {
  schedule_type: 'daily' | 'interval' | 'weekly' | 'custom_cron' | string;
  time?: string;
  time_2?: string;
  time_3?: string;
  interval_minutes?: number;
  days_of_week?: number[];
  cron_expression: string;
  human_readable: string;
}

export interface JobItem {
  job_id: string;
  job_name: string;
  category: 'sync_data' | 'reconcile' | 'report' | 'monitor' | 'utility' | string;
  category_name: string;
  description: string;
  source_reference: string;
  is_enabled: boolean;
  status: 'idle' | 'running' | 'success' | 'failed';
  schedule: JobScheduleConfig;
  has_email_notification?: boolean;
  email_recipients?: string | null;
  last_run_at: string | null;
  next_run_at: string | null;
  last_duration: number | null;
  last_status: string | null;
  total_runs: number;
  success_runs: number;
  failed_runs: number;
  is_hidden?: boolean;
  restricted_to_dung?: boolean;
}

export interface JobRunLog {
  id: string;
  job_id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  status: 'running' | 'success' | 'failed';
  message: string;
  details?: string | null;
  triggered_by: string;
}

export interface JobDashboardStats {
  total_jobs: number;
  active_jobs: number;
  disabled_jobs: number;
  running_jobs: number;
  categories_count: Record<string, number>;
  upcoming_jobs: Array<{
    job_id: string;
    job_name: string;
    next_run: string | null;
    schedule_human: string;
  }>;
}

export interface JobUpdateScheduleRequest {
  schedule_type: string;
  time?: string;
  time_2?: string;
  time_3?: string;
  interval_minutes?: number;
  days_of_week?: number[];
  cron_expression?: string;
  email_recipients?: string | null;
}

export interface RestaurantAuditItem {
  id: number;
  sap: string;
  res: string;
  brand?: string;
  coscenter: string;
  rk7: string;
  ngay_khaitruong: string;
  raw_nkt?: string | null;
  trangthai: string;
  ip: string;
  raw_ip?: string;
  matched_keyword?: string;
  missing_fields: string[];
  is_missing: boolean;
  is_up: boolean;
  ping_status: string;
  category: 'need_reminder' | 'skipped_offline' | 'valid' | 'excluded';
  conclusion: string;
  reminder_text: string;
}

export interface RestaurantAuditResult {
  target_time: string;
  total_scanned: number;
  need_reminder_count: number;
  skipped_offline_count: number;
  valid_count: number;
  excluded_count?: number;
  excluded_keywords?: string[];
  need_reminder_items: RestaurantAuditItem[];
  skipped_offline_items: RestaurantAuditItem[];
  valid_items: RestaurantAuditItem[];
  excluded_items?: RestaurantAuditItem[];
  all_items: RestaurantAuditItem[];
  reminder_text_all: string;
}

export interface RestaurantAuditConfig {
  excluded_keywords: string[];
  default_keywords?: string[];
}

