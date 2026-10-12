import apiClient from './api';

export interface PendingItemSummary {
  key: string;
  title: string;
  my: number;
  total: number;
  badge: number;
  link: string;
  unit: string;
}

export interface PendingSummaryResponse {
  is_admin: boolean;
  is_super_admin: boolean;
  username: string;
  aliases: string[];
  items: {
    checklist: PendingItemSummary;
    memo: PendingItemSummary;
    pim: PendingItemSummary;
    setup_nh: PendingItemSummary;
    incidents: PendingItemSummary;
    projects?: PendingItemSummary;
  };
}

export const dashboardService = {
  async getPendingSummary(): Promise<PendingSummaryResponse> {
    const response = await apiClient.get<PendingSummaryResponse>('/dashboard/pending-summary');
    return response.data;
  },
};
