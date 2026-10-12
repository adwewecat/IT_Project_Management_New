export interface SystemIncidentItem {
  id: number;
  tieude: string;
  he_thong?: string | null;
  muc_do?: string | null;
  thoi_gian_bat_dau?: string | null;
  thoi_gian_ket_thuc?: string | null;
  thoi_gian_gian_doan_phut?: number | null;
  thoi_gian_gian_doan_text?: string | null;
  noi_dung: string;
  nguyen_nhan?: string | null;
  bien_phap_khac_phuc?: string | null;
  trang_thai: 'DANG_XU_LY' | 'DA_KHAC_PHUC' | 'THEO_DOI' | string;
  nguoi_ghi_nhan?: string | null;
  nguoi_xu_ly?: string | null;
  ghi_chu_tien_do?: string | null;
  images?: string | null;
  files?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface SystemIncidentStats {
  total: number;
  dang_xu_ly: number;
  da_khac_phuc: number;
  theo_doi: number;
  total_downtime_minutes: number;
  total_downtime_hours: number;
  by_system: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface SystemIncidentListResponse {
  items: SystemIncidentItem[];
  total: number;
  stats: SystemIncidentStats;
}

export interface SystemIncidentCreateParams {
  tieude: string;
  he_thong?: string;
  muc_do?: string;
  thoi_gian_bat_dau: string;
  thoi_gian_ket_thuc?: string;
  noi_dung: string;
  nguyen_nhan?: string;
  bien_phap_khac_phuc?: string;
  trang_thai?: string;
  nguoi_xu_ly?: string;
  images?: string;
  files?: string;
  note?: string;
}

export interface SystemIncidentUpdateParams {
  tieude?: string;
  he_thong?: string;
  muc_do?: string;
  thoi_gian_bat_dau?: string;
  thoi_gian_ket_thuc?: string | null;
  noi_dung?: string;
  nguyen_nhan?: string | null;
  bien_phap_khac_phuc?: string | null;
  trang_thai?: string;
  nguoi_xu_ly?: string | null;
  images?: string | null;
  files?: string | null;
}

export interface SystemIncidentProgressParams {
  note: string;
  images?: string;
  files?: string;
  status?: string;
  thoi_gian_ket_thuc?: string;
  nguyen_nhan?: string;
  bien_phap_khac_phuc?: string;
}

export interface SystemIncidentFilterParams {
  search?: string;
  month?: string;
  from_date?: string;
  to_date?: string;
  system_name?: string;
  status?: string;
  limit?: number;
  offset?: number;
}
