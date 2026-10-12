import apiClient from './api';
import { UserItem, UserCreatePayload, UserUpdatePayload, UserListResponse } from '../types/user';

export const userService = {
  async getUsers(params?: { search?: string; phanquyen?: string; active?: boolean; skip?: number; limit?: number }): Promise<UserListResponse> {
    const response = await apiClient.get<UserListResponse>('/users', { params });
    return response.data;
  },

  async getUser(id: number): Promise<UserItem> {
    const response = await apiClient.get<UserItem>(`/users/${id}`);
    return response.data;
  },

  async createUser(payload: UserCreatePayload): Promise<UserItem> {
    const response = await apiClient.post<UserItem>('/users', payload);
    return response.data;
  },

  async updateUser(id: number, payload: UserUpdatePayload): Promise<UserItem> {
    const response = await apiClient.put<UserItem>(`/users/${id}`, payload);
    return response.data;
  },

  async resetPassword(id: number, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      new_password: newPassword,
    });
    return response.data;
  },

  async toggleStatus(id: number, active: boolean): Promise<UserItem> {
    const response = await apiClient.patch<UserItem>(`/users/${id}/toggle-status`, { active });
    return response.data;
  },
};
