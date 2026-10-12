export interface HotlineRestaurant {
  id: number | null;
  res: string;
  sap: string;
  rk7: string;
  ip: string;
  ip_prefix: string;
  ext: string;
  brand: string;
  region: string;
  trangthai: string;
  modal_title: string;
}

export interface HotlineCallData {
  call_id: number;
  ext: string;
  caller_raw_text: string;
  restaurant?: HotlineRestaurant | null;
  restaurant_name?: string;
  call_status: 'ACTIVE' | 'BUSY' | 'MISSED' | 'ANSWERED';
  is_busy?: boolean;
  is_missed?: boolean;
  is_unlisted?: boolean;
  is_resolved?: boolean;
  duty_user?: string | null;
  created_at: string;
}

export interface HotlineStatus {
  scanner_running: boolean;
  active_subscribers: number;
  current_call: HotlineCallData | null;
  unresolved_missed_calls_count: number;
  latest_call_info?: {
    id: number;
    ext: string;
    caller_raw_text?: string | null;
    restaurant_id?: number | null;
    restaurant_name?: string | null;
    call_status: string;
    is_resolved: boolean;
    is_restaurant: boolean;
    duty_user?: string | null;
    created_at: string;
  } | null;
}

export interface HotlineMissedCallItem {
  id: number;
  ext: string;
  caller_raw_text?: string | null;
  restaurant_id?: number | null;
  restaurant_name: string;
  restaurant_sap?: string | null;
  restaurant_rk7?: string | null;
  restaurant_ip?: string | null;
  ip_prefix?: string;
  call_status: string;
  is_resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  duty_user?: string | null;
  created_at: string;
}

export interface HotlineMissedCallsResponse {
  total: number;
  items: HotlineMissedCallItem[];
}

export interface HotlineAnsweredCallsResponse {
  total: number;
  items: HotlineMissedCallItem[];
}

// ══════════════════════════════════════════════════════════════
// PHÂN QUYỀN TRỰC HOTLINE TYPES
// ══════════════════════════════════════════════════════════════
export interface HotlinePermissionsConfig {
  enabled_roles: string[];
  allowed_users: string[];
  allow_all: boolean;
}

export interface HotlineAvailableUser {
  id: number;
  username: string;
  full_name: string;
  email?: string | null;
  phanquyen?: string | null;
}

export interface HotlineAvailableRole {
  code: string;
  label: string;
}

export interface HotlinePermissionsResponse {
  config: HotlinePermissionsConfig;
  available_users: HotlineAvailableUser[];
  available_roles: HotlineAvailableRole[];
}

export interface HotlineUserPermissionCheck {
  can_access: boolean;
  can_manage: boolean;
}

// ══════════════════════════════════════════════════════════════
// LỊCH TRỰC HOTLINE TYPES (Dành cho HotlineSchedulePage)
// ══════════════════════════════════════════════════════════════
export interface LichTrucItem {
  id?: number;
  thang: string;
  team: string;
  noidung?: string | null;
  image_url?: string | null;
  image_urls?: string[];
  is_image?: boolean;
  images?: string[];
  ngay_insert?: string | null;
  user_insert?: string | null;
  [key: string]: any;
}

export interface LichTrucMonthResponse {
  thang?: string;
  current_month?: string;
  helpdesk_months?: string[];
  app_months?: string[];
  available_months?: string[];
  helpdesk?: LichTrucItem | null;
  app?: LichTrucItem | null;
  can_helpdesk?: boolean;
  can_app?: boolean;
}

export interface LichTrucUploadPayload {
  thang: string;
  team: string;
  images_data?: string[];
  image_data?: string;
}
