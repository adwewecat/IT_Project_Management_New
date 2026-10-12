import apiClient from './api';
import {
  UnassignedAuditResponse,
  UnassignedSsoConfig,
} from '../types/unassigned3cx';

export const unassigned3cxService = {
  async getScanDates(): Promise<string[]> {
    const res = await apiClient.get<string[]>('/unassigned-3cx/dates');
    return res.data;
  },

  async getAuditData(targetDate?: string): Promise<UnassignedAuditResponse> {
    const res = await apiClient.get<UnassignedAuditResponse>('/unassigned-3cx/audit', {
      params: targetDate ? { target_date: targetDate } : undefined,
    });
    return res.data;
  },

  async triggerScan(maxPages: number = 10): Promise<UnassignedAuditResponse> {
    const res = await apiClient.post<UnassignedAuditResponse>('/unassigned-3cx/scan', null, {
      params: { max_pages: maxPages },
      timeout: 180000, // 3 phút để Playwright login SSO và cào dữ liệu GPMS
    });
    return res.data;
  },

  async sendEmailReport(recipients: string, targetDate?: string): Promise<{ status: string; message: string }> {
    const res = await apiClient.post<{ status: string; message: string }>('/unassigned-3cx/send-email', {
      recipients,
      target_date: targetDate,
    }, {
      timeout: 60000,
    });
    return res.data;
  },

  async getSsoConfig(): Promise<UnassignedSsoConfig> {
    const res = await apiClient.get<UnassignedSsoConfig>('/unassigned-3cx/sso-config');
    return res.data;
  },

  async saveSsoConfig(payload: {
    sso_username: string;
    sso_password: string;
    email_recipients?: string;
  }): Promise<{ status: string; message: string }> {
    const res = await apiClient.post<{ status: string; message: string }>('/unassigned-3cx/sso-config', payload);
    return res.data;
  },
};
