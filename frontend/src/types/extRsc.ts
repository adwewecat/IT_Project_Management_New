export interface ExtRscItem {
  id: number;
  nhanvien?: string | null;
  email?: string | null;
  manv?: string | null;
  so_ext?: string | null;
  phongban?: string | null;
  note?: string | null;
  ngay_insert?: string | null;
  user_insert?: string | null;
  ngay_update?: string | null;
  user_update?: string | null;
  active?: boolean;
}

export interface ExtRscCreate {
  nhanvien: string;
  email?: string;
  manv?: string;
  so_ext?: string;
  phongban?: string;
  note?: string;
}

export interface ExtRscUpdate {
  nhanvien?: string;
  email?: string;
  manv?: string;
  so_ext?: string;
  phongban?: string;
  note?: string;
  active?: boolean;
}

export interface ExtRscListResponse {
  items: ExtRscItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ExtRscFilterParams {
  search?: string;
  page?: number;
  page_size?: number;
}
