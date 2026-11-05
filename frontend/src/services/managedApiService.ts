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
}

export interface ManagedAPIListResponse {
  success: boolean;
  total: number;
  items: ManagedAPIItem[];
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

  async createApi(data: ManagedAPICreatePayload): Promise<ManagedAPIItem> {
    const res = await api.post<ManagedAPIItem>('/managed-apis', data);
    return res.data;
  },

  async updateApi(id: number, data: ManagedAPIUpdatePayload): Promise<ManagedAPIItem> {
    const res = await api.put<ManagedAPIItem>(`/managed-apis/${id}`, data);
    return res.data;
  },

  async toggleApi(id: number, is_enabled: boolean): Promise<ManagedAPIItem> {
    const res = await api.patch<ManagedAPIItem>(`/managed-apis/${id}/toggle`, { is_enabled });
    return res.data;
  },

  async deleteApi(id: number): Promise<void> {
    await api.delete(`/managed-apis/${id}`);
  }
};

