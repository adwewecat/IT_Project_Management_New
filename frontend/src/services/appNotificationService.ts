import apiClient from './api';
import {
  AppNotificationItem,
  AppNotificationCreatePayload,
  AppNotificationUpdatePayload,
  AppNotificationListResponse,
} from '../types/appNotification';

export const appNotificationService = {
  // Lấy danh sách thông báo và lưu ý
  async getNotifications(params: {
    search?: string;
    category?: string;
    priority?: string;
    pinned_only?: boolean;
    limit?: number;
  } = {}): Promise<AppNotificationListResponse> {
    const response = await apiClient.get<AppNotificationListResponse>('/app-notifications', {
      params: {
        search: params.search?.trim() || undefined,
        category: params.category || undefined,
        priority: params.priority || undefined,
        pinned_only: params.pinned_only || undefined,
        limit: params.limit || 200,
      },
    });
    return response.data;
  },

  // Tạo thông báo lưu ý mới
  async createNotification(payload: AppNotificationCreatePayload): Promise<AppNotificationItem> {
    const response = await apiClient.post<AppNotificationItem>('/app-notifications', payload);
    return response.data;
  },

  // Cập nhật thông báo
  async updateNotification(
    id: number,
    payload: AppNotificationUpdatePayload
  ): Promise<AppNotificationItem> {
    const response = await apiClient.put<AppNotificationItem>(`/app-notifications/${id}`, payload);
    return response.data;
  },

  // Xóa thông báo
  async deleteNotification(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/app-notifications/${id}`
    );
    return response.data;
  },

  // Ghim hoặc bỏ ghim
  async togglePin(id: number): Promise<AppNotificationItem> {
    const response = await apiClient.post<AppNotificationItem>(
      `/app-notifications/${id}/toggle-pin`
    );
    return response.data;
  },
};
