import apiClient from './api';
import { LoginCredentials, TokenResponse, UserInfo, ChangePasswordPayload, MessageResponse } from '../types/auth';

export const authService = {
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>('/auth/login', credentials);
    return response.data;
  },

  async getMe(): Promise<UserInfo> {
    const response = await apiClient.get<UserInfo>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors on logout API
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_info');
    }
  },

  async changePassword(payload: ChangePasswordPayload): Promise<MessageResponse> {
    const response = await apiClient.post<MessageResponse>('/auth/change-password', payload);
    return response.data;
  },
};
