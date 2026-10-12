export interface CodePhotoItem {
  id: number;
  hientrang?: string | null;
  manv?: string | null;
  name?: string | null;
  email?: string | null;
  pass_code?: string | null;
  cmnd_sdt?: string | null;
  cty?: string | null;
  donvi?: string | null;
  bophan?: string | null;
  chucdanh?: string | null;
  code_dept?: string | null;
  note?: string | null;
  ngay_insert?: string | null;
  user_insert?: string | null;
  ngay_update?: string | null;
  user_update?: string | null;
  active?: boolean;
}

export interface CodePhotoCreate {
  hientrang?: string;
  manv?: string;
  name?: string;
  email: string;
  pass_code?: string;
  cmnd_sdt?: string;
  bophan?: string;
  chucdanh?: string;
  code_dept?: string;
  note?: string;
}

export interface CodePhotoUpdate {
  hientrang?: string;
  manv?: string;
  name?: string;
  email?: string;
  pass_code?: string;
  cmnd_sdt?: string;
  bophan?: string;
  chucdanh?: string;
  code_dept?: string;
  note?: string;
  active?: boolean;
}

export interface CodePhotoStats {
  total: number;
  total_on: number;
  total_off: number;
}

export interface CodePhotoListResponse {
  items: CodePhotoItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  stats: CodePhotoStats;
}

export interface CodePhotoFilterParams {
  search?: string;
  hientrang?: string;
  page?: number;
  page_size?: number;
}
