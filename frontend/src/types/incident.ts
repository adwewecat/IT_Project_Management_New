export interface IncidentItem {
  id: number;
  appname?: string | null;
  noidung?: string | null;
  trangthai: boolean;
  date_insert?: string | null;
  date_loi?: string | null;
  user_insert?: string | null;
  active?: boolean;
  is_private?: boolean | null;

  restaurant_id?: number | null;
  restaurant_name?: string | null;
  sap_code?: string | null;
  rk7_code?: string | null;
  ip_address?: string | null;

  assign_type?: 'LEADER' | 'INDIVIDUAL' | string | null;
  assigned_to?: string | null;
  assigned_name?: string | null;

  progress_notes?: string | null;
  images?: string | null;
  files?: string | null;

  resolved_at?: string | null;
  resolved_by?: string | null;
  date_update?: string | null;
  user_update?: string | null;
}

export interface IncidentListResponse {
  items: IncidentItem[];
  total: number;
  uncompleted_count: number;
  completed_count: number;
}

export interface IncidentCreatePayload {
  noidung: string;
  restaurant_id?: number | null;
  restaurant_name?: string | null;
  sap_code?: string | null;
  rk7_code?: string | null;
  ip_address?: string | null;
  assign_type: 'LEADER' | 'INDIVIDUAL';
  assigned_to?: string | null;
  assigned_name?: string | null;
  date_loi?: string | null;
  images?: string | null;
  files?: string | null;
  is_private?: boolean;
}

export interface IncidentAssignee {
  username: string;
  full_name: string;
  phanquyen?: string | null;
  is_app_team: boolean;
}
