export interface ViolationItem {
  id: number;
  nguoi_saipham: string;
  ho_ten?: string | null;
  noidung: string;
  loai_saipham?: string | null; // miss_mail, late_processing, wrong_action, other
  date_saipham?: string | null;
  giaitrinh?: string | null;
  trangthai: boolean;
  images?: string | null;
  files?: string | null;
  date_insert?: string | null;
  date_update?: string | null;
  user_insert?: string | null;
  user_update?: string | null;
  active?: boolean;
}

export interface ViolationListResponse {
  items: ViolationItem[];
  total: number;
}

export interface ViolationCreatePayload {
  nguoi_saipham: string;
  ho_ten?: string | null;
  noidung: string;
  loai_saipham: string;
  date_saipham?: string | null;
  giaitrinh?: string | null;
  images?: string | null;
  files?: string | null;
}

export interface ViolationBatchCreatePayload {
  nguoi_saiphams: string[];
  ho_ten?: string | null;
  noidung: string;
  loai_saipham: string;
  date_saipham?: string | null;
  giaitrinh?: string | null;
  images?: string | null;
  files?: string | null;
}

export interface LeaveLogItem {
  id: number;
  username: string;
  full_name?: string | null;
  leave_type: string; // annual_leave, half_day_morning, half_day_afternoon, half_day, early_leave, unpaid_leave, other
  start_time: string;
  end_time?: string | null;
  reason?: string | null;
  note?: string | null;
  user_insert?: string | null;
  date_insert?: string | null;
  active?: boolean;
}

export interface LeaveLogListResponse {
  items: LeaveLogItem[];
  total: number;
}

export interface LeaveLogCreatePayload {
  username: string;
  full_name?: string | null;
  leave_type: string;
  start_time: string;
  end_time?: string | null;
  reason?: string | null;
  note?: string | null;
}

export interface LeaveTypeItem {
  id: number;
  code: string;
  name: string;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface LeaveTypeCreatePayload {
  code?: string;
  name: string;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
}

