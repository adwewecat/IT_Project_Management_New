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
};

