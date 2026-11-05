import api from './api';

export interface ManagedAPIItem {
  id: number;
  api_code: string;
  api_name: string;
  endpoint_path: string;
  alias_path?: string | null;
  method: string;
  description?: string | null;
  is_enabled: boolean;
  require_api_key: boolean;
  api_key?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  // Thống kê & chống spam 24h
  requests_24h?: number;
  total_requests?: number;
  last_requested_at?: string | null;
  last_client_ip?: string | null;
  is_high_traffic?: boolean;
}

export interface ManagedAPIListResponse {
  success: boolean;
  total: number;
  items: ManagedAPIItem[];
}

export interface ManagedAPILogItem {
  id: number;
  api_code: string;
  endpoint_called?: string | null;
  client_ip?: string | null;
  method: string;
  status_code: number;
  response_time_ms?: number | null;
  user_agent?: string | null;
  query_params?: string | null;
  requested_at: string;
}

export interface ManagedAPILogListResponse {
  success: boolean;
  api_code: string;
  total_in_24h: number;
  items: ManagedAPILogItem[];
}

export interface ManagedAPICreatePayload {
  api_code: string;
  api_name: string;
  endpoint_path: string;
  alias_path?: string;
  method: string;
  description?: string;
  is_enabled: boolean;
  require_api_key: boolean;
  api_key?: string;
}

export interface ManagedAPIUpdatePayload {
  api_name?: string;
  endpoint_path?: string;
  alias_path?: string;
  method?: string;
  description?: string;
  is_enabled?: boolean;
  require_api_key?: boolean;
  api_key?: string;
}

export const managedApiService = {
  async getApis(): Promise<ManagedAPIListResponse> {
    const res = await api.get<ManagedAPIListResponse>('/managed-apis');
    return res.data;
  },

  async getApiLogs(apiCode: string, limit: number = 50, hours: number = 24): Promise<ManagedAPILogListResponse> {
    const res = await api.get<ManagedAPILogListResponse>(`/managed-apis/${apiCode}/logs`, {
      params: { limit, hours }
    });
    return res.data;
  },

  async createApi(data: ManagedAPICreatePayload): Promise<ManagedAPIItem> {
    const res = await api.post<ManagedAPIItem>('/managed-apis', data);
    return res.data;
  },

  async updateApi(id: number, data: ManagedAPIUpdatePayload): Promise<ManagedAPIItem> {
    const res = await api.put<ManagedAPIItem>(`/managed-apis/${id}`, data);
    return res.data;
  },

  async toggleApi(id: number, isEnabled: boolean): Promise<ManagedAPIItem> {
    const res = await api.patch<ManagedAPIItem>(`/managed-apis/${id}/toggle`, { is_enabled: isEnabled });
    return res.data;
  },

  async deleteApi(id: number): Promise<void> {
    await api.delete(`/managed-apis/${id}`);
  }
};
