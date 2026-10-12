import apiClient from './api';
import {
  SystemIncidentItem,
  SystemIncidentListResponse,
  SystemIncidentCreateParams,
  SystemIncidentUpdateParams,
  SystemIncidentProgressParams,
  SystemIncidentFilterParams,
} from '../types/systemIncident';

export const systemIncidentService = {
  // Lấy danh sách hệ thống dùng cho tìm kiếm & combobox
  async getSystems(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/incidents/system-outages/systems');
    return response.data;
  },

  // Lấy danh sách sự cố diện rộng kèm thống kê
  async getSystemIncidents(params: SystemIncidentFilterParams = {}): Promise<SystemIncidentListResponse> {
    const response = await apiClient.get<SystemIncidentListResponse>('/incidents/system-outages', {
      params,
    });
    return response.data;
  },

  // Chi tiết sự cố
  async getSystemIncidentDetail(id: number): Promise<SystemIncidentItem> {
    const response = await apiClient.get<SystemIncidentItem>(`/incidents/system-outages/${id}`);
    return response.data;
  },

  // Tạo mới sự cố
  async createSystemIncident(payload: SystemIncidentCreateParams): Promise<SystemIncidentItem> {
    const response = await apiClient.post<SystemIncidentItem>('/incidents/system-outages', payload);
    return response.data;
  },

  // Cập nhật thông tin sự cố
  async updateSystemIncident(id: number, payload: SystemIncidentUpdateParams): Promise<SystemIncidentItem> {
    const response = await apiClient.put<SystemIncidentItem>(`/incidents/system-outages/${id}`, payload);
    return response.data;
  },

  // Ghi nhận thêm tiến độ xử lý
  async addSystemIncidentProgress(id: number, payload: SystemIncidentProgressParams): Promise<SystemIncidentItem> {
    const response = await apiClient.post<SystemIncidentItem>(`/incidents/system-outages/${id}/progress`, payload);
    return response.data;
  },

  // Xuất file Excel
  async exportExcel(params: SystemIncidentFilterParams = {}): Promise<Blob> {
    const response = await apiClient.get('/incidents/system-outages/export/excel', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  // Upload tệp tin / hình ảnh
  async uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await apiClient.post<{ urls: string[] }>('/incidents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.urls;
  },
};
