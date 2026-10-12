export interface ChecklistTemplateItem {
  id: number;
  template_id: number;
  nhom?: string | null;
  tieu_de: string;
  huong_dan?: string | null;
  stt: number;
  active: boolean;
}

export interface ChecklistTemplate {
  id: number;
  ten_suon: string;
  ma_suon?: string | null;
  danh_muc?: string | null;
  mo_ta?: string | null;
  nguoi_tao?: string | null;
  sla_days?: number;
  ngay_tao?: string | null;
  ngay_update?: string | null;
  active: boolean;
  total_items: number;
  items: ChecklistTemplateItem[];
}

export interface ChecklistTemplateCreatePayload {
  ten_suon: string;
  ma_suon?: string;
  danh_muc?: string;
  mo_ta?: string;
  sla_days?: number;
  items?: Array<{
    nhom?: string;
    tieu_de: string;
    huong_dan?: string;
    stt?: number;
  }>;
}

export interface ChecklistTemplateUpdatePayload {
  ten_suon?: string;
  ma_suon?: string;
  danh_muc?: string;
  mo_ta?: string;
  sla_days?: number;
}

export interface ChecklistRunItem {
  id: number;
  run_id: number;
  stt: number;
  nhom?: string | null;
  tieu_de: string;
  huong_dan?: string | null;
  trang_thai: 'PENDING' | 'PASSED' | 'FAILED' | 'NA' | string;
  ghi_chu_ket_qua?: string | null;
  images: string[];
  nguoi_hoan_thanh?: string | null;
  ngay_hoan_thanh?: string | null;
  active: boolean;
}

export interface ChecklistRun {
  id: number;
  template_id: number;
  ten_dot: string;
  ten_suon?: string | null;
  version_note?: string | null;
  ghi_chu?: string | null;
  nguoi_thuc_hien?: string | null;
  nguoi_tao?: string | null;
  trang_thai: string;
  sla_days?: number;
  han_chot_sla?: string | null;
  sla_status?: 'IN_TIME' | 'WARNING' | 'OVERDUE' | 'COMPLETED_ON_TIME' | 'COMPLETED_LATE' | string;
  sla_text?: string | null;
  ngay_bat_dau?: string | null;
  ngay_hoan_thanh?: string | null;
  ngay_tao?: string | null;
  ngay_update?: string | null;
  active: boolean;
  total_items: number;
  passed_items: number;
  failed_items: number;
  pending_items: number;
  progress_percent: number;
}

export interface ChecklistRunCreatePayload {
  template_id: number;
  ten_dot?: string;
  version_note: string;
  ghi_chu?: string;
  nguoi_thuc_hien?: string;
  sla_days?: number;
}

export interface ChecklistRunUpdatePayload {
  ten_dot?: string;
  version_note?: string;
  ghi_chu?: string;
  nguoi_thuc_hien?: string;
  trang_thai?: string;
  sla_days?: number;
  han_chot_sla?: string | null;
}

export interface ChecklistRunDetailResponse {
  run: ChecklistRun;
  items: ChecklistRunItem[];
  groups: string[];
}

export interface ChecklistRunStats {
  total_runs: number;
  unique_versions: number;
  completed_runs: number;
  total_items: number;
  passed_items: number;
  failed_items: number;
  avg_progress: number;
}

export interface AppUserOption {
  username: string;
  full_name: string;
  email?: string | null;
  phanquyen?: string | null;
}

export interface ChecklistRunListResponse {
  total: number;
  page: number;
  page_size: number;
  stats?: ChecklistRunStats | null;
  items: ChecklistRun[];
}

