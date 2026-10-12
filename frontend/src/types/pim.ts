export interface PIMRequest {
  id: number;
  id_yeu_cau: string;
  chuoi?: string | null;
  ten_menu?: string | null;
  mo_ta?: string | null;
  thoi_gian_thuc_hien?: string | null;
  link_yeu_cau?: string | null;
  ngay_insert?: string | null;
  trang_thai_thuc_hien?: string | null;
  user_thuc_hien?: string | null;
  user_hoan_thanh?: string | null;
  user_update?: string | null;
  thoi_gian_hoan_thanh?: string | null;
  thoi_gian_update?: string | null;
  so?: string | null;
  gui_mail?: string | null;
}

export interface PIMUserThucHien {
  id: number;
  ten_user: string;
  ho_ten?: string | null;
  email?: string | null;
  thu_tu: number;
  active: boolean;
  ngay_tao?: string | null;
}

export interface PIMLog {
  id: number;
  id_yeu_cau: string;
  hanh_dong: string;
  noi_dung?: string | null;
  user_thuc_hien?: string | null;
  thoi_gian?: string | null;
}

export interface PIMSyncResponse {
  total_scanned: number;
  inserted: number;
  updated: number;
  message: string;
}

export interface PIMFilterParams {
  from_date?: string;
  to_date?: string;
  user_thuc_hien?: string;
  user_update?: string;
  search?: string;
  limit?: number;
}

export interface PIMUserCreatePayload {
  ten_user: string;
  ho_ten?: string;
  email?: string;
  thu_tu: number;
  active?: boolean;
}

export interface PIMUserUpdatePayload {
  ten_user?: string;
  ho_ten?: string;
  email?: string;
  thu_tu?: number;
  active?: boolean;
}

export interface PIMConfig {
  sso_username: string;
  sso_password: string;
  ngay_cap_nhat?: string | null;
  user_cap_nhat?: string | null;
}

export interface PIMConfigUpdatePayload {
  sso_username: string;
  sso_password: string;
}

export interface PIMTestLoginResponse {
  success: boolean;
  message: string;
}

export interface PIMSchedule {
  id: number;
  time_1: string;
  time_2: string;
  time_3: string;
  is_active: boolean;
  last_run?: string | null;
  last_status?: string | null;
  ngay_cap_nhat?: string | null;
  user_cap_nhat?: string | null;
}

export interface PIMScheduleUpdatePayload {
  time_1: string;
  time_2: string;
  time_3: string;
  is_active: boolean;
}

