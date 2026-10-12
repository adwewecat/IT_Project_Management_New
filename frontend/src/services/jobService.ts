import api from './api';
import {
  JobItem,
  JobDashboardStats,
  JobRunLog,
  JobUpdateScheduleRequest,
  RestaurantAuditResult,
  RestaurantAuditConfig
} from '../types/job';

export const jobService = {
  getJobs: async (): Promise<JobItem[]> => {
    const response = await api.get<JobItem[]>('/jobs');
    return response.data;
  },

  getDashboardStats: async (): Promise<JobDashboardStats> => {
    const response = await api.get<JobDashboardStats>('/jobs/dashboard');
    return response.data;
  },

  runJobDryRun: async (jobId: string): Promise<{ success: boolean; message: string; log: JobRunLog }> => {
    const response = await api.post<{ success: boolean; message: string; log: JobRunLog }>(`/jobs/${jobId}/run`, {}, { timeout: 120000 });
    return response.data;
  },

  toggleJob: async (jobId: string, isEnabled: boolean): Promise<JobItem> => {
    const response = await api.put<JobItem>(`/jobs/${jobId}/toggle`, { is_enabled: isEnabled });
    return response.data;
  },

  toggleHideJob: async (jobId: string, isHidden: boolean): Promise<JobItem> => {
    const response = await api.patch<JobItem>(`/jobs/${jobId}/hide`, { is_hidden: isHidden });
    return response.data;
  },

  updateSchedule: async (jobId: string, data: JobUpdateScheduleRequest): Promise<JobItem> => {
    const response = await api.put<JobItem>(`/jobs/${jobId}/schedule`, data);
    return response.data;
  },

  updateEmailRecipients: async (jobId: string, emailRecipients: string): Promise<JobItem> => {
    const response = await api.put<JobItem>(`/jobs/${jobId}/email`, { email_recipients: emailRecipients });
    return response.data;
  },

  getJobLogs: async (jobId: string, limit = 50): Promise<JobRunLog[]> => {
    const response = await api.get<JobRunLog[]>(`/jobs/${jobId}/logs`, { params: { limit } });
    return response.data;
  },

  getAllLogs: async (limit = 100): Promise<JobRunLog[]> => {
    const response = await api.get<JobRunLog[]>('/jobs/logs/all', { params: { limit } });
    return response.data;
  },

  getRestaurantAuditLatest: async (): Promise<RestaurantAuditResult | null> => {
    const response = await api.get<RestaurantAuditResult | null>('/jobs/restaurant-audit/latest');
    return response.data;
  },

  scanRestaurantAudit: async (): Promise<RestaurantAuditResult> => {
    const response = await api.post<RestaurantAuditResult>('/jobs/restaurant-audit/scan', {}, { timeout: 180000 });
    return response.data;
  },

  sendRestaurantAuditEmail: async (recipients: string[]): Promise<any> => {
    const response = await api.post('/jobs/restaurant-audit/send-email', { recipients }, { timeout: 60000 });
    return response.data;
  },

  getRestaurantAuditConfig: async (): Promise<RestaurantAuditConfig> => {
    const response = await api.get<RestaurantAuditConfig>('/jobs/restaurant-audit/config');
    return response.data;
  },

  saveRestaurantAuditConfig: async (config: { excluded_keywords: string[] }): Promise<RestaurantAuditConfig> => {
    const response = await api.post<RestaurantAuditConfig>('/jobs/restaurant-audit/config', config);
    return response.data;
  }
};

