import apiClient from './api';
import {
  ApplyMonthTemplateRequest,
  ApplyNowRequest,
  Hotline3cxConfig,
  Hotline3cxConfigUpdate,
  Hotline3cxHoliday,
  Hotline3cxMember,
  Hotline3cxMemberCreate,
  Hotline3cxMemberUpdate,
  Hotline3cxScheduleDay,
  Hotline3cxSyncLog,
  HotlineHolidayBatchCreateRequest,
  ScheduleDayUpsertItem,
} from '../types/hotline3cxAuto';

export const hotline3cxAutoService = {
  /** Lấy danh sách toàn bộ nhân sự trực Hotline 3CX */
  async getMembers(): Promise<Hotline3cxMember[]> {
    const res = await apiClient.get<Hotline3cxMember[]>('/hotline-3cx-auto/members');
    return res.data;
  },

  /** Thêm mới nhân sự trực Hotline */
  async createMember(data: Hotline3cxMemberCreate): Promise<Hotline3cxMember> {
    const res = await apiClient.post<Hotline3cxMember>('/hotline-3cx-auto/members', data);
    return res.data;
  },

  /** Cập nhật nhân sự trực Hotline */
  async updateMember(id: number, data: Hotline3cxMemberUpdate): Promise<Hotline3cxMember> {
    const res = await apiClient.put<Hotline3cxMember>(`/hotline-3cx-auto/members/${id}`, data);
    return res.data;
  },

  /** Xóa nhân sự trực Hotline */
  async deleteMember(id: number): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/hotline-3cx-auto/members/${id}`);
    return res.data;
  },

  /** Lấy danh sách lịch trực theo khoảng ngày (mặc định tuần hiện tại T2-CN) */
  async getSchedules(startDate?: string, endDate?: string): Promise<Hotline3cxScheduleDay[]> {
    const res = await apiClient.get<Hotline3cxScheduleDay[]>('/hotline-3cx-auto/schedules', {
      params: {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
      },
    });
    return res.data;
  },

  /** Lưu hàng loạt lịch trực nhiều ngày */
  async saveSchedules(days: ScheduleDayUpsertItem[]): Promise<Hotline3cxScheduleDay[]> {
    const res = await apiClient.put<Hotline3cxScheduleDay[]>('/hotline-3cx-auto/schedules', { days });
    return res.data;
  },

  /** Sao chép lịch trực của tuần liền trước sang tuần mục tiêu */
  async clonePreviousWeek(targetWeekStart: string): Promise<Hotline3cxScheduleDay[]> {
    const res = await apiClient.post<Hotline3cxScheduleDay[]>('/hotline-3cx-auto/schedules/clone-week', {
      target_week_start: targetWeekStart,
    });
    return res.data;
  },

  /** Áp dụng mẫu lịch 7 ngày cho toàn bộ các ngày trong tháng */
  async applyMonthTemplate(
    payload: ApplyMonthTemplateRequest
  ): Promise<{ success: boolean; applied_days: number }> {
    const res = await apiClient.post<{ success: boolean; applied_days: number }>(
      '/hotline-3cx-auto/schedules/apply-month',
      payload
    );
    return res.data;
  },

  /** Lấy danh sách Ngày Lễ Riêng (tùy chọn lọc theo năm) */
  async getHolidays(year?: number): Promise<Hotline3cxHoliday[]> {
    const res = await apiClient.get<Hotline3cxHoliday[]>('/hotline-3cx-auto/holidays', {
      params: year ? { year } : undefined,
    });
    return res.data;
  },

  /** Thêm hoặc cập nhật 1 ngày lễ hoặc khoảng ngày lễ riêng */
  async addHolidays(payload: HotlineHolidayBatchCreateRequest): Promise<Hotline3cxHoliday[]> {
    const res = await apiClient.post<Hotline3cxHoliday[]>('/hotline-3cx-auto/holidays', payload);
    return res.data;
  },

  /** Xóa một Ngày Lễ Riêng theo ID */
  async deleteHoliday(holidayId: number): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(
      `/hotline-3cx-auto/holidays/${holidayId}`
    );
    return res.data;
  },

  /** Lấy cấu hình hệ thống 3CX và email cảnh báo */
  async getConfig(): Promise<Hotline3cxConfig> {
    const res = await apiClient.get<Hotline3cxConfig>('/hotline-3cx-auto/config');
    return res.data;
  },

  /** Cập nhật cấu hình hệ thống 3CX và email cảnh báo */
  async updateConfig(payload: Hotline3cxConfigUpdate): Promise<Hotline3cxConfig> {
    const res = await apiClient.put<Hotline3cxConfig>('/hotline-3cx-auto/config', payload);
    return res.data;
  },

  /** Chạy thử nghiệm quy trình đồng bộ ca trực (dry_run = true, timeout 180s) */
  async dryRun(payload?: ApplyNowRequest): Promise<Hotline3cxSyncLog> {
    const res = await apiClient.post<Hotline3cxSyncLog>(
      '/hotline-3cx-auto/dry-run',
      { ...payload, dry_run: true },
      { timeout: 180000 }
    );
    return res.data;
  },

  /** Đồng bộ trực tiếp vào portal 3CX thật (dry_run = false, timeout 180s) */
  async applyNow(payload?: ApplyNowRequest): Promise<Hotline3cxSyncLog> {
    const res = await apiClient.post<Hotline3cxSyncLog>(
      '/hotline-3cx-auto/apply-now',
      { ...payload, dry_run: false },
      { timeout: 180000 }
    );
    return res.data;
  },

  /** Lấy danh sách nhật ký đồng bộ Hotline 3CX */
  async getLogs(limit: number = 50): Promise<Hotline3cxSyncLog[]> {
    const res = await apiClient.get<Hotline3cxSyncLog[]>('/hotline-3cx-auto/logs', {
      params: { limit },
    });
    return res.data;
  },

  /** Tạo mới Relay Token bảo mật */
  async regenerateRelayToken(): Promise<Hotline3cxConfig> {
    const res = await apiClient.post<Hotline3cxConfig>('/hotline-3cx-auto/relay/regenerate-token');
    return res.data;
  },

  /** Tải về file ZIP bộ cài 3CX Sync Relay Worker đã nhúng sẵn URL & Token */
  async downloadRelayPackage(serverUrl?: string): Promise<Blob> {
    const res = await apiClient.get<Blob>('/hotline-3cx-auto/relay/download-package', {
      params: serverUrl && serverUrl.trim() ? { server_url: serverUrl.trim() } : undefined,
      responseType: 'blob',
    });
    return res.data;
  },
};
