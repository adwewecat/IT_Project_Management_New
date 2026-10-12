export interface SetupRestaurant {
  id: number;
  ten_nh?: string | null;
  ngay_dukien_khaitruong?: string | null;
  it_phutrach?: string | null;
  am_phutrach?: string | null;
  note_them?: string | null;
  trangthai?: string | null;
  brand?: string | null;
  active?: number | null;
  created_at?: string | null;
  total_checklist: number;
  completed_checklist: number;
  progress_percent: number;
  can_complete: boolean;
  ReviewStatus?: 'ok' | 'fail' | null;
  ReviewNote?: string | null;
  ReviewedBy?: string | null;
  ReviewedAt?: string | null;
  total_groups?: number;
  completed_groups?: number;
  total_tasks?: number;
  completed_tasks?: number;

  // Uppercase fallback
  TEN_NH?: string | null;
  NGAY_DUKIEN_KHAITRUONG?: string | null;
  IT_PHUTRACH?: string | null;
  AM_PHUTRACH?: string | null;
  NOTE_THEM?: string | null;
  TRANGTHAI?: string | null;
  BRAND?: string | null;
}

export interface SetupRestaurantCreate {
  ten_nh: string;
  ngay_dukien_khaitruong?: string | null;
  it_phutrach?: string | null;
  am_phutrach?: string | null;
  note_them?: string | null;
  brand?: string | null;
}

export interface SetupRestaurantUpdate {
  ten_nh?: string;
  ngay_dukien_khaitruong?: string | null;
  it_phutrach?: string | null;
  am_phutrach?: string | null;
  note_them?: string | null;
  trangthai?: string;
  brand?: string | null;
}

export interface SetupRestaurantListResponse {
  items: SetupRestaurant[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ChecklistItem {
  id: number;
  id_nh_new?: number;
  ID_NH_NEW?: number;
  id_checklist?: number | null;
  nhom?: string | null;
  NHOM?: string | null;
  ten_checklist: string;
  NOIDUNG?: string | null;
  user_hoanthanh?: string | null;
  USER_HOANTHANH?: string | null;
  ngay_hoanthanh?: string | null;
  NGAY_HOANTHANH?: string | null;
  active?: number | boolean | null;
  note?: string | null;
  GHICHU?: string | null;
  is_completed: boolean;
}

export interface ChecklistGroup {
  nhom: string;
  group_name?: string;
  total: number;
  total_items?: number;
  completed: number;
  completed_items?: number;
  items: ChecklistItem[];
  is_completed?: boolean;
  completed_date?: string | null;
  completed_by?: string | null;
  note?: string | null;
}

export interface RestaurantChecklistResponse {
  restaurant?: SetupRestaurant;
  restaurant_id?: number;
  restaurant_name?: string;
  trangthai?: string;
  total_items: number;
  completed_items: number;
  progress_percent: number;
  groups: ChecklistGroup[];
  total_groups?: number;
  completed_groups?: number;
  group_progress_percent?: number;
}

export interface ChecklistItemUpdate {
  is_completed: boolean;
  note?: string | null;
}

export interface ChecklistUpdateResult {
  success: boolean;
  item: ChecklistItem;
  restaurant_status: string;
}

export interface ChecklistItemCreatePayload {
  nhom: string;
  noidung: string;
  ghichu?: string | null;
  save_to_master?: boolean;
}

export interface ChecklistMasterItem {
  id: number;
  stt?: number | null;
  nhom: string;
  noidung: string;
  ghichu?: string | null;
  active: boolean;
}

export interface ChecklistMasterGroup {
  nhom: string;
  total_tasks: number;
  tasks: ChecklistMasterItem[];
}

export interface ChecklistMasterResponse {
  total_groups: number;
  total_tasks: number;
  groups: ChecklistMasterGroup[];
}

export interface ChecklistMasterItemCreatePayload {
  nhom: string;
  noidung: string;
  ghichu?: string | null;
  stt?: number | null;
}

export interface ChecklistMasterItemUpdatePayload {
  nhom?: string | null;
  noidung?: string | null;
  ghichu?: string | null;
  stt?: number | null;
}

export interface ChecklistMasterGroupUpdatePayload {
  old_nhom: string;
  new_nhom: string;
}

