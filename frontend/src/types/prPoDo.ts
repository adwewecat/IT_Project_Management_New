export interface PrPoDoItem {
  id: number;
  loai?: string | null;
  so?: string | null;
  noidung?: string | null;
  ngay_them?: string | null;
  ngay_insert?: string | null;
  ngay_update?: string | null;
  trangthai?: string | null;
  ghichu?: string | null;
}

export interface PrPoDoCreate {
  so?: string;
  noidung?: string;
  loai?: string;
  trangthai?: string;
  ghichu?: string;
  ngay_them?: string;
}

export interface PrPoDoUpdate {
  so?: string;
  noidung?: string;
  loai?: string;
  trangthai?: string;
  ghichu?: string;
  ngay_them?: string;
}

export interface PrPoDoStats {
  total: number;
  total_bu: number;
  total_fc: number;
  total_md: number;
  total_done: number;
  total_deleted?: number;
}

export interface PrPoDoListResponse {
  items: PrPoDoItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  stats: PrPoDoStats;
}

export interface PrPoDoFilterParams {
  search?: string;
  loai?: string;
  trangthai?: string;
  sort_by_date?: string;
  page?: number;
  page_size?: number;
}
