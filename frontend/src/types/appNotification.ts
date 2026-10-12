export interface AppNotificationItem {
  id: number;
  tieu_de: string;
  danh_muc: string;
  muc_do: string;
  noi_dung: string;
  images: string[];
  files: any[];
  is_pinned: boolean;
  nguoi_tao?: string | null;
  nguoi_update?: string | null;
  ngay_tao?: string | null;
  ngay_update?: string | null;
  active: boolean;
}

export interface AppNotificationCreatePayload {
  tieu_de: string;
  danh_muc?: string;
  muc_do?: string;
  noi_dung: string;
  images?: string[];
  files?: any[];
  is_pinned?: boolean;
}

export interface AppNotificationUpdatePayload {
  tieu_de?: string;
  danh_muc?: string;
  muc_do?: string;
  noi_dung?: string;
  images?: string[];
  files?: any[];
  is_pinned?: boolean;
}

export interface AppNotificationListResponse {
  total: number;
  pinned_count: number;
  categories: string[];
  items: AppNotificationItem[];
}
