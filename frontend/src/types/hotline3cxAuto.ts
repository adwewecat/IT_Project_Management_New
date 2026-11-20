/**
 * Type definitions cho phân hệ Tự Động Phân Hàng Đợi Trực Hotline 3CX.
 * Tương thích chuẩn Pydantic v2 backend (/api/v1/hotline-3cx-auto).
 */

export type ShiftMode = 'AUTO' | 'WEEKDAY' | 'WEEKEND';
export type ShiftCode = 'MORNING' | 'EVENING' | 'MORNING_BACKUP' | 'EVENING_BACKUP';
export type ExecutionMode = 'DIRECT' | 'RELAY';

/** Bản ghi nhân sự trực hotline 3CX */
export interface Hotline3cxMember {
  id: number;
  ext_line: string;
  full_name: string;
  department?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Hotline3cxMemberCreate {
  ext_line: string;
  full_name: string;
  department?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface Hotline3cxMemberUpdate {
  ext_line?: string;
  full_name?: string;
  department?: string;
  is_active?: boolean;
  sort_order?: number;
}

/** Dữ liệu cập nhật hoặc thêm mới lịch trực theo ngày */
export interface ScheduleDayUpsertItem {
  duty_date: string; // ISO YYYY-MM-DD
  shift_mode: ShiftMode;
  morning_lines: string[];
  evening_lines: string[];
  weekend_lines: string[];
  weekend_evening_override: string[];
  morning_backup_time?: string | null;
  morning_backup_lines?: string[];
  evening_backup_time?: string | null;
  evening_backup_lines?: string[];
  note?: string | null;
}

/** Dữ liệu hiển thị một ngày trong lưới lịch trực (kèm computed properties) */
export interface Hotline3cxScheduleDay extends ScheduleDayUpsertItem {
  id?: number;
  weekday_label: string;
  effective_mode: string; // 'WEEKDAY' | 'WEEKEND'
  is_weekend: boolean;
  is_custom_holiday?: boolean;
  holiday_name?: string | null;
  updated_by?: string | null;
  updated_at?: string | null;
}

/** Bản ghi Ngày Lễ Riêng (không theo lịch nhà nước) */
export interface Hotline3cxHoliday {
  id: number;
  holiday_date: string; // ISO YYYY-MM-DD
  name: string;
  weekday_label?: string;
  weekend_lines?: string[];
  created_by?: string | null;
  created_at?: string | null;
}

export interface HotlineHolidayBatchCreateRequest {
  start_date: string; // ISO YYYY-MM-DD
  end_date?: string; // ISO YYYY-MM-DD
  name: string;
  weekend_lines?: string[];
}

export interface ScheduleBulkSaveRequest {
  days: ScheduleDayUpsertItem[];
}

export interface CloneWeekRequest {
  target_week_start: string; // ISO YYYY-MM-DD (Thứ Hai)
}

export interface ApplyMonthTemplateRequest {
  year: number;
  month: number;
  template_days: ScheduleDayUpsertItem[];
  overwrite_existing: boolean;
}

/** Cấu hình portal 3CX và email cảnh báo (mật khẩu bị ẩn an toàn) */
export interface Hotline3cxConfig {
  portal_url: string;
  username: string;
  has_password: boolean;
  day_queue_name: string;
  night_queue_name: string;
  morning_time: string;
  evening_time: string;
  alert_emails: string;
  execution_mode?: ExecutionMode;
  relay_token?: string | null;
  relay_worker_name?: string | null;
  relay_last_ip?: string | null;
  relay_last_seen_at?: string | null;
  relay_online?: boolean;
  updated_at?: string | null;
}

export interface Hotline3cxConfigUpdate {
  portal_url?: string;
  username?: string;
  password?: string;
  day_queue_name?: string;
  night_queue_name?: string;
  morning_time?: string;
  evening_time?: string;
  alert_emails?: string;
  execution_mode?: ExecutionMode;
}

export interface ApplyNowRequest {
  duty_date?: string; // ISO YYYY-MM-DD
  shift_code?: ShiftCode;
  dry_run?: boolean;
  force_direct?: boolean;
}

export interface AppliedLineItem {
  ext_line?: string;
  skill_group?: string | null;
  [key: string]: unknown;
}

/** Nhật ký đồng bộ Playwright vào portal 3CX */
export interface Hotline3cxSyncLog {
  id: number;
  duty_date: string; // ISO YYYY-MM-DD
  shift_code: string;
  queue_name: string;
  applied_lines: AppliedLineItem[];
  status: string; // 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'DRY_RUN'
  is_dry_run: boolean;
  triggered_by?: string | null;
  error_message?: string | null;
  screenshot_path?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}
