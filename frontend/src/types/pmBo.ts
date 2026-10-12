export interface PMSoftwareItem {
  id: number;
  project_name: string;
  pm_project?: string | null;
  pm_name?: string | null;
  pm_phone?: string | null;
  pm_email?: string | null;
  note_them?: string | null;
  ngay_trienkhai?: string | null;
  ngay_update?: string | null;
  active: boolean;
}

export interface PMSoftwareCreatePayload {
  project_name: string;
  pm_name?: string;
  pm_phone?: string;
  pm_email?: string;
  note_them?: string;
  ngay_trienkhai?: string;
  active?: boolean;
}

export interface PMSoftwareUpdatePayload {
  project_name?: string;
  pm_name?: string;
  pm_phone?: string;
  pm_email?: string;
  note_them?: string;
  ngay_trienkhai?: string;
  active?: boolean;
}

export interface SoftwareVersionItem {
  id: number;
  phan_mem: string;
  phien_ban: string;
  ngay_update?: string | null;
  noi_dung_update?: string | null;
  hinh_anh?: string | null;
  nguoi_update?: string | null;
  ghi_chu?: string | null;
  active: boolean;
}

export interface SoftwareVersionCreatePayload {
  phan_mem: string;
  phien_ban: string;
  ngay_update?: string;
  noi_dung_update?: string;
  hinh_anh?: string;
  ghi_chu?: string;
  active?: boolean;
  sync_all_dates?: boolean;
}

export interface SoftwareVersionUpdatePayload {
  phan_mem?: string;
  phien_ban?: string;
  ngay_update?: string;
  noi_dung_update?: string;
  hinh_anh?: string;
  ghi_chu?: string;
  active?: boolean;
  sync_all_dates?: boolean;
}

export interface SoftwareVersionSyncDatePayload {
  ngay_update: string;
  source_software?: string;
  exclude_id?: number;
  target_ids?: number[];
  target_names?: string[];
}

export interface BrandPrintStandardItem {
  id: number;
  brand_name: string;
  loai_in: string; // 'Chuẩn hóa in Dcorp (RK7)' | 'Chuẩn hóa in KDS' | 'Cả hai'
  tieu_de?: string | null;
  ghi_chu?: string | null;
  images?: string | null;
  files?: string | null;
  nguoi_tao?: string | null;
  nguoi_update?: string | null;
  ngay_tao?: string | null;
  ngay_update?: string | null;
  active: boolean;
}

export interface BrandPrintStandardCreatePayload {
  brand_name: string;
  loai_in: string;
  tieu_de?: string;
  ghi_chu?: string;
  images?: string;
  files?: string;
}

export interface BrandPrintStandardUpdatePayload {
  brand_name?: string;
  loai_in?: string;
  tieu_de?: string;
  ghi_chu?: string;
  images?: string;
  files?: string;
}

