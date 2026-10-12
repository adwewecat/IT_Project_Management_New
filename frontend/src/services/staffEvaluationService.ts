import apiClient from './api';
import {
  StaffConfigItem,
  EvaluationReportResponse,
} from '../types/staffEvaluation';

export const staffEvaluationService = {
  async getEvaluationConfig(): Promise<StaffConfigItem[]> {
    const res = await apiClient.get<StaffConfigItem[]>('/staff-evaluations/config');
    return res.data;
  },

  async getCandidates(): Promise<StaffConfigItem[]> {
    const res = await apiClient.get<StaffConfigItem[]>('/staff-evaluations/candidates');
    return res.data;
  },

  async saveEvaluationConfig(usernames: string[]): Promise<StaffConfigItem[]> {
    const res = await apiClient.post<StaffConfigItem[]>('/staff-evaluations/config', {
      usernames,
    });
    return res.data;
  },

  async getReport(month?: number, year?: number): Promise<EvaluationReportResponse> {
    const res = await apiClient.get<EvaluationReportResponse>('/staff-evaluations/report', {
      params: { month, year },
    });
    return res.data;
  },

  async exportExcel(month?: number, year?: number, username?: string): Promise<Blob> {
    const res = await apiClient.get('/staff-evaluations/export-excel', {
      params: { month, year, username: username !== 'ALL' ? username : undefined },
      responseType: 'blob',
    });
    return res.data;
  },
};
