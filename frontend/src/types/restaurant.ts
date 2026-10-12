export interface RestaurantItem {
  id: number;
  res?: string | null;
  sap?: string | null;
  coscenter?: string | null;
  rk7?: string | null;
  sap_old?: string | null;
  oracale?: string | null;
  don_gia?: string | null;
  
  // Địa điểm & Liên hệ
  address?: string | null;
  region?: string | null;
  brand?: string | null;
  sdt_nh?: string | null;
  email?: string | null;
  
  // Trạng thái & Ngày
  trangthai?: string | null;
  status?: string | null;
  active?: boolean | null;
  ngay_khaitruong?: string | null;

  // Mạng & Remote
  ip?: string | null;
  ip_wan?: string | null;
  teamview_pc?: string | null;
  teamview_pos11?: string | null;
  teamview_pos12?: string | null;
  rustdesk_pos11?: string | null;
  rustdesk_pos12?: string | null;

  // Đường truyền & Dịch vụ văn phòng
  pass_ou_ko_sys?: string | null;
  user_ftth?: string | null;
  pass_ftth?: string | null;
  thanhtoan_ftth?: string | null;
  ngay_online_ftth?: string | null;
  dk_truyenthong?: string | null;
  pass_mail?: string | null;
  ext?: string | null;
  sys_sales?: string | null;

  // Ghi chú & Tìm kiếm
  note?: string | null;
  timkiem?: string | null;

  // Nhật ký
  ngay_insert?: string | null;
  user_insert?: string | null;
  ngay_update?: string | null;
  user_update?: string | null;

  // Mở rộng động
  [key: string]: any;
}

export interface RestaurantListResponse {
  items: RestaurantItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RestaurantFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  region?: string;
  brand?: string;
  trangthai?: string;
  sort_by?: string;
  sort_order?: string;
}

export interface RestaurantOptionsResponse {
  regions: string[];
  brands: string[];
  trangthai_options: string[];
}

export interface BrandItem {
  id: number;
  mabrand?: string | null;
  tenbrand: string;
  active: boolean;
  ngay_insert?: string | null;
  user_them?: string | null;
}

export interface BrandCreate {
  tenbrand: string;
  mabrand?: string;
}

export interface RegionItem {
  id: number;
  ma_tinhthanh?: string | null;
  ten_tinhthanh: string;
  bienso?: string | null;
  active: boolean;
}

export interface RegionCreate {
  ten_tinhthanh: string;
  ma_tinhthanh?: string;
  bienso?: string;
}

export interface RestaurantAuditLogItem {
  id: number;
  manhinh?: string | null;
  chucnang?: string | null;
  user_thuchien?: string | null;
  noidung?: string | null;
  ngay_insert?: string | null;
}

export interface RestaurantAuditLogsResponse {
  items: RestaurantAuditLogItem[];
  total: number;
}

export interface RestaurantAuditLogsParams {
  from_date?: string;
  to_date?: string;
  action_type?: string;
  user_thuchien?: string;
  search?: string;
  limit?: number;
}

