import apiClient from './api';

export interface LogItem {
  id: number;
  nhom_quyen: string;
  man_hinh: string;
  hanh_dong?: string;
  noi_dung?: string;
  du_lieu_cu?: string;
  du_lieu_moi?: string;
  user_thuchien: string;
  user_role?: string;
  ip_client?: string;
  status: string;
  created_at: string;
}

export interface LogGroupStats {
  total_all: number;
  total_app: number;
  total_inventory: number;
  total_helpdesk: number;
  total_quan_tri: number;
}

export interface LogListResponse {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: LogItem[];
  stats: LogGroupStats;
  user_allowed_groups: string[];
  default_group: string;
}

export interface LogFilterParams {
  nhom_quyen?: string;
  man_hinh?: string;
  search?: string;
  user_thuchien?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface UserLogPermissionsResponse {
  username: string;
  allowed_groups: string[];
  default_group: string;
  can_view_all: boolean;
  is_super_admin: boolean;
}

export interface LogPurgeResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

export const logService = {
  getLogs: async (params: LogFilterParams): Promise<LogListResponse> => {
    const res = await apiClient.get<LogListResponse>('/logs', { params });
    return res.data;
  },

  getUserLogPermissions: async (): Promise<UserLogPermissionsResponse> => {
    const res = await apiClient.get<UserLogPermissionsResponse>('/logs/user-permission');
    return res.data;
  },

  purgeOldLogs: async (years: number = 3): Promise<LogPurgeResponse> => {
    const res = await apiClient.post<LogPurgeResponse>('/logs/purge', { years });
    return res.data;
  }
};
