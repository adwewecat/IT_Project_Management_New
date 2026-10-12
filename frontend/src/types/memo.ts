export interface MemoItem {
  id: number;
  ma_memo?: string | null;
  subject_mail?: string | null;
  ngay_batdau?: string | null;
  ngay_ketthuc?: string | null;
  it_setup?: string | null;
  giahan?: string | null;
  ngay_tiepnhan?: string | null;
  trangthai?: string | null;
  hoanthanh?: string | null;
  nguoi_gui?: string | null;
  huong_dan?: string | null;
  noidung_mail?: string | null;
  ten_file_memo?: string | null;
  note?: string | null;
  ngay_insert?: string | null;
  ngay_update?: string | null;
  active?: boolean;
  ReviewStatus?: 'ok' | 'fail' | null;
  ReviewNote?: string | null;
  ReviewedBy?: string | null;
  ReviewedAt?: string | null;
  ma_tua?: string | null;
}

export interface MemoCreate {
  ma_memo: string;
  subject_mail?: string;
  ngay_batdau?: string;
  ngay_ketthuc?: string;
  it_setup?: string;
  ma_tua?: string;
  giahan?: string;
  ngay_tiepnhan?: string;
  trangthai?: string;
  nguoi_gui?: string;
  huong_dan?: string;
  noidung_mail?: string;
  ten_file_memo?: string;
  note?: string;
}

export interface MemoUpdate {
  ma_memo?: string;
  subject_mail?: string;
  ngay_batdau?: string;
  ngay_ketthuc?: string;
  it_setup?: string;
  ma_tua?: string;
  giahan?: string;
  ngay_tiepnhan?: string;
  trangthai?: string;
  hoanthanh?: string;
  nguoi_gui?: string;
  huong_dan?: string;
  noidung_mail?: string;
  ten_file_memo?: string;
  note?: string;
  active?: boolean;
}

export interface MemoGiaHan {
  ma_memo?: string;
  subject_mail?: string;
  ngay_batdau?: string;
  ngay_ketthuc?: string;
  it_setup?: string;
  ma_tua?: string;
  ngay_tiepnhan?: string;
  trangthai?: string;
  nguoi_gui?: string;
  huong_dan?: string;
  noidung_mail?: string;
  ten_file_memo?: string;
  note?: string;
}

export interface MemoStats {
  total: number;
  cho_setup: number;
  da_setup_nhap: number;
  da_public: number;
  gia_han: number;
  bo_sung?: number;
}

export interface MemoListResponse {
  items: MemoItem[];
  total: number;
  page: number;
  page_size: number;
  stats: MemoStats;
}

export interface NextItSetupResponse {
  status: string;
  next_user: string;
  user_list: string[];
  next_ma_tua?: string;
  is_reclaimed?: boolean;
  reclaimed_reason?: string;
}

export interface AppUserOption {
  id: number;
  username: string;
  full_name: string;
  label: string;
}

export interface UploadImageResponse {
  status: string;
  url: string;
  filename: string;
}

export interface RoundRobinUserItem {
  id: number;
  username: string;
  full_name?: string | null;
  is_active: boolean;
}

export interface RoundRobinConfigResponse {
  users: RoundRobinUserItem[];
  total: number;
  active_count: number;
}

export interface RoundRobinConfigUpdate {
  active_usernames: string[];
}

export interface MemoTemplateBrandItem {
  id: number;
  brand_name: string;
  bm_emails: string;
  full_cc_emails: string;
  active: boolean;
}

export interface MemoTemplateDataResponse {
  to_emails: string;
  base_cc_emails: string;
  mkt_link: string;
  email_body: string;
  brands: MemoTemplateBrandItem[];
  all_bm_emails: string;
  all_brands_cc_emails: string;
}

export interface MemoTemplateBrandUpsert {
  id?: number;
  brand_name: string;
  bm_emails: string;
  active?: boolean;
}

