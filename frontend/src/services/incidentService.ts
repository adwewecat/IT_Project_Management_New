import apiClient from './api';
import {
  IncidentItem,
  IncidentListResponse,
  IncidentCreatePayload,
  IncidentAssignee,
} from '../types/incident';

export const incidentService = {
  async getIncidents(params: {
    tab: 'pending' | 'completed';
    search?: string;
    from_date?: string;
    to_date?: string;
    user_insert?: string;
    assigned_to?: string;
    restaurant_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<IncidentListResponse> {
    const res = await apiClient.get<IncidentListResponse>('/incidents', { params });
    return res.data;
  },

  async getIncidentDetail(id: number): Promise<IncidentItem> {
    const res = await apiClient.get<IncidentItem>(`/incidents/${id}`);
    return res.data;
  },

  async createIncident(payload: IncidentCreatePayload): Promise<IncidentItem> {
    const res = await apiClient.post<IncidentItem>('/incidents', payload);
    return res.data;
  },

  async uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const res = await apiClient.post<{ urls: string[] }>('/incidents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data.urls;
  },

  async getAssignees(): Promise<IncidentAssignee[]> {
    const res = await apiClient.get<IncidentAssignee[]>('/incidents/assignees');
    return res.data;
  },

  async assignIncident(id: number, assigned_to: string, assigned_name?: string): Promise<IncidentItem> {
    const res = await apiClient.post<IncidentItem>(`/incidents/${id}/assign`, {
      assigned_to,
      assigned_name,
    });
    return res.data;
  },

  async addProgressNote(id: number, note: string): Promise<IncidentItem> {
    const res = await apiClient.post<IncidentItem>(`/incidents/${id}/progress`, { note });
    return res.data;
  },

  async updateStatus(id: number, trangthai: boolean, note?: string): Promise<IncidentItem> {
    const res = await apiClient.post<IncidentItem>(`/incidents/${id}/status`, {
      trangthai,
      note,
    });
    return res.data;
  },

  async deleteIncident(id: number): Promise<void> {
    await apiClient.delete(`/incidents/${id}`);
  },
};
