import apiClient from './api';
import {
  PIMRequest,
  PIMUserThucHien,
  PIMLog,
  PIMSyncResponse,
  PIMFilterParams,
  PIMUserCreatePayload,
  PIMUserUpdatePayload,
  PIMConfig,
  PIMConfigUpdatePayload,
  PIMTestLoginResponse,
  PIMSchedule,
  PIMScheduleUpdatePayload,
} from '../types/pim';

export const pimService = {
  // Lấy danh sách PIM chưa hoàn thành
  async getPendingRequests(params?: PIMFilterParams): Promise<PIMRequest[]> {
    const res = await apiClient.get<PIMRequest[]>('/pim/pending', { params });
    return res.data;
  },

  // Lấy danh sách PIM đã hoàn thành (mặc định 100 dòng mới nhất)
  async getCompletedRequests(params?: PIMFilterParams): Promise<PIMRequest[]> {
    const res = await apiClient.get<PIMRequest[]>('/pim/completed', { params });
    return res.data;
  },

  // Lấy danh sách nhật ký thao tác (mặc định 50 dòng mới nhất)
  async getPimLogs(params?: PIMFilterParams): Promise<PIMLog[]> {
    const res = await apiClient.get<PIMLog[]>('/pim/logs', { params });
    return res.data;
  },

  // Đồng bộ PIM (quét 4 màn hình + lịch sử duyệt, đặt timeout 120s)
  async syncPim(): Promise<PIMSyncResponse> {
    const res = await apiClient.post<PIMSyncResponse>('/pim/sync', {}, { timeout: 120000 });
    return res.data;
  },

  // Cập nhật trạng thái thực hiện, SO hoặc Gửi mail
  async updateRequestStatus(
    pimId: number,
    data: { trang_thai_thuc_hien?: string; so?: string; gui_mail?: string }
  ): Promise<PIMRequest> {
    const res = await apiClient.put<PIMRequest>(`/pim/${pimId}/status`, data);
    return res.data;
  },

  // Admin điều chuyển người thực hiện
  async assignRequestUser(pimId: number, user_thuc_hien: string): Promise<PIMRequest> {
    const res = await apiClient.put<PIMRequest>(`/pim/${pimId}/assign`, { user_thuc_hien });
    return res.data;
  },

  // Lấy danh sách nhân sự xoay vòng
  async getRoundRobinUsers(): Promise<PIMUserThucHien[]> {
    const res = await apiClient.get<PIMUserThucHien[]>('/pim/users');
    return res.data;
  },

  // Admin thêm nhân sự xoay vòng
  async createRoundRobinUser(payload: PIMUserCreatePayload): Promise<PIMUserThucHien> {
    const res = await apiClient.post<PIMUserThucHien>('/pim/users', payload);
    return res.data;
  },

  // Admin cập nhật nhân sự xoay vòng (thứ tự, bật/tắt active, v.v.)
  async updateRoundRobinUser(
    userId: number,
    payload: PIMUserUpdatePayload
  ): Promise<PIMUserThucHien> {
    const res = await apiClient.put<PIMUserThucHien>(`/pim/users/${userId}`, payload);
    return res.data;
  },

  // Admin xóa nhân sự xoay vòng
  async deleteRoundRobinUser(userId: number): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/pim/users/${userId}`);
    return res.data;
  },

  // Super Admin lấy thông tin cấu hình tài khoản SSO / PIM
  async getPimConfig(): Promise<PIMConfig> {
    const res = await apiClient.get<PIMConfig>('/pim/config');
    return res.data;
  },

  // Super Admin cập nhật cấu hình tài khoản SSO / PIM
  async updatePimConfig(payload: PIMConfigUpdatePayload): Promise<PIMConfig> {
    const res = await apiClient.put<PIMConfig>('/pim/config', payload);
    return res.data;
  },

  // Kiểm tra đăng nhập thử nghiệm SSO / PIM
  async testPimLogin(payload: PIMConfigUpdatePayload): Promise<PIMTestLoginResponse> {
    const res = await apiClient.post<PIMTestLoginResponse>('/pim/config/test', payload, { timeout: 30000 });
    return res.data;
  },

  // Admin / Super Admin lấy cấu hình lịch quét PIM tự động (3 lần/ngày)
  async getPimSchedule(): Promise<PIMSchedule> {
    const res = await apiClient.get<PIMSchedule>('/pim/schedule');
    return res.data;
  },

  // Admin / Super Admin cập nhật cấu hình lịch quét PIM tự động (3 lần/ngày)
  async updatePimSchedule(payload: PIMScheduleUpdatePayload): Promise<PIMSchedule> {
    const res = await apiClient.put<PIMSchedule>('/pim/schedule', payload);
    return res.data;
  },

  // Xuất file Excel danh sách PIM theo bộ lọc hiện tại
  async exportPimExcel(params: PIMFilterParams & { tab?: string; trang_thai_thuc_hien?: string; so?: string; gui_mail?: string } = {}): Promise<Blob> {
    const res = await apiClient.get('/pim/export/excel', {
      params,
      responseType: 'blob'
    });
    return res.data;
  },
};

