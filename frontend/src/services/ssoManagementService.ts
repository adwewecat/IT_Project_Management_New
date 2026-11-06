import apiClient from './api';
import {
  SSOConfigResponse,
  SSOConfigRequest,
  SSOTestLoginResponse,
  SSOSearchUserResponse,
  SSOChangePasswordRequest,
  SSOChangePasswordResponse,
  SSOAssignClientsRequest,
  SSOAssignClientsResponse,
  SSOCreateNCCUserRequest,
  SSOCreateNCCUserResponse,
  SSOBulkParseResponse,
  SSOBulkProcessItemRequest,
  SSOBulkProcessItemResponse,
  SSOQuickProcessItemRequest,
  SSOQuickProcessItemResponse,
  SSOBatchExportItem,
} from '../types/ssoManagement';

export const ssoManagementService = {
  async getConfig(): Promise<SSOConfigResponse> {
    const res = await apiClient.get<SSOConfigResponse>('/sso/config');
    return res.data;
  },

  async saveConfig(payload: SSOConfigRequest): Promise<SSOConfigResponse> {
    const res = await apiClient.post<SSOConfigResponse>('/sso/config', payload);
    return res.data;
  },

  async testLogin(): Promise<SSOTestLoginResponse> {
    const res = await apiClient.post<SSOTestLoginResponse>('/sso/test-login');
    return res.data;
  },

  async searchUsers(search: string): Promise<SSOSearchUserResponse> {
    const res = await apiClient.post<SSOSearchUserResponse>('/sso/search-users', { search });
    return res.data;
  },

  async changePassword(payload: SSOChangePasswordRequest): Promise<SSOChangePasswordResponse> {
    const res = await apiClient.post<SSOChangePasswordResponse>('/sso/change-password', payload);
    return res.data;
  },

  async assignDefaultClients(payload: SSOAssignClientsRequest): Promise<SSOAssignClientsResponse> {
    const res = await apiClient.post<SSOAssignClientsResponse>('/sso/assign-default-clients', payload);
    return res.data;
  },

  async createNCCUser(payload: SSOCreateNCCUserRequest): Promise<SSOCreateNCCUserResponse> {
    const res = await apiClient.post<SSOCreateNCCUserResponse>('/sso/create-ncc-user', payload);
    return res.data;
  },

  async downloadBulkTemplate(): Promise<void> {
    const res = await apiClient.get('/sso/bulk-template', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Mau_Import_SSO_IAM.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async parseExcel(file: File): Promise<SSOBulkParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<SSOBulkParseResponse>('/sso/parse-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async processBulkItem(payload: SSOBulkProcessItemRequest): Promise<SSOBulkProcessItemResponse> {
    const res = await apiClient.post<SSOBulkProcessItemResponse>('/sso/bulk-process-item', payload);
    return res.data;
  },

  async quickProcessItem(payload: SSOQuickProcessItemRequest): Promise<SSOQuickProcessItemResponse> {
    const res = await apiClient.post<SSOQuickProcessItemResponse>('/sso/quick-process-item', payload);
    return res.data;
  },

  async exportBatchResults(action: 'change_pass' | 'lock' | 'assign_permissions', items: SSOBatchExportItem[]): Promise<void> {
    const res = await apiClient.post('/sso/export-batch-results', { action, items }, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    const nowStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    link.setAttribute('download', `Ket_Qua_SSO_${action}_${nowStr}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
