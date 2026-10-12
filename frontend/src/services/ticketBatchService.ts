import api from './api';
import { TicketBatchConfig, TicketPreviewResult, TicketBatchRunResult, TicketBatchHistory } from '../types/ticketBatch';

export const ticketBatchService = {
  /** Lấy cấu hình SSO đã lưu */
  getConfig: async (): Promise<TicketBatchConfig> => {
    const res = await api.get('/ticket-batch/config');
    return res.data;
  },

  /** Lưu cấu hình SSO */
  saveConfig: async (params: {
    sso_username: string;
    sso_password: string;
    email_recipients?: string;
  }): Promise<{ status: string; message: string }> => {
    const res = await api.post('/ticket-batch/config', params);
    return res.data;
  },

  /** Preview: Login SSO → lấy danh sách ticket */
  preview: async (): Promise<TicketPreviewResult> => {
    const res = await api.post('/ticket-batch/preview', {}, {
      timeout: 720000, // 12 phút (gấp 4 lần 180s) để Playwright login và cào dữ liệu
    });
    return res.data;
  },

  /** Lấy lịch sử lần quét và xử lý gần nhất (tự động hoặc thủ công) */
  getLatestHistory: async (): Promise<TicketBatchHistory> => {
    const res = await api.get('/ticket-batch/latest-history');
    return res.data;
  },

  /** Run: Đóng các ticket đã chọn */
  run: async (params: {
    ticket_ids: string[];
    all_tickets: any[];
    timesheet_data?: Record<string, number> | null;
  }): Promise<TicketBatchRunResult> => {
    const res = await api.post('/ticket-batch/run', params, {
      timeout: 2400000, // 40 phút (gấp 4 lần 600s) để Playwright đóng từng ticket và gửi email
    });
    return res.data;
  },
};
