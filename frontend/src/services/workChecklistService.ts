import apiClient from './api';
import {
  ChecklistTemplate,
  ChecklistTemplateCreatePayload,
  ChecklistTemplateUpdatePayload,
  ChecklistTemplateItem,
  ChecklistRun,
  ChecklistRunCreatePayload,
  ChecklistRunUpdatePayload,
  ChecklistRunItem,
  ChecklistRunDetailResponse,
  ChecklistRunListResponse,
  AppUserOption,
} from '../types/workChecklist';

export const workChecklistService = {
  // --- Templates (Sườn) ---
  async getTemplates(search?: string): Promise<ChecklistTemplate[]> {
    const response = await apiClient.get<ChecklistTemplate[]>('/work-checklists/templates', {
      params: { search: search?.trim() || undefined },
    });
    return response.data;
  },

  async getTemplateDetail(templateId: number): Promise<ChecklistTemplate> {
    const response = await apiClient.get<ChecklistTemplate>(`/work-checklists/templates/${templateId}`);
    return response.data;
  },

  async createTemplate(payload: ChecklistTemplateCreatePayload): Promise<ChecklistTemplate> {
    const response = await apiClient.post<ChecklistTemplate>('/work-checklists/templates', payload);
    return response.data;
  },

  async updateTemplate(templateId: number, payload: ChecklistTemplateUpdatePayload): Promise<ChecklistTemplate> {
    const response = await apiClient.put<ChecklistTemplate>(`/work-checklists/templates/${templateId}`, payload);
    return response.data;
  },

  async deleteTemplate(templateId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/work-checklists/templates/${templateId}`);
    return response.data;
  },

  async addTemplateItem(templateId: number, payload: { nhom?: string; tieu_de: string; huong_dan?: string; stt?: number }): Promise<ChecklistTemplateItem> {
    const response = await apiClient.post<ChecklistTemplateItem>(`/work-checklists/templates/${templateId}/items`, payload);
    return response.data;
  },

  async batchAddTemplateItems(templateId: number, payload: { nhom?: string; raw_text?: string; items?: string[] }): Promise<ChecklistTemplateItem[]> {
    const response = await apiClient.post<ChecklistTemplateItem[]>(`/work-checklists/templates/${templateId}/items/batch`, payload);
    return response.data;
  },

  async deleteTemplateItem(itemId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/work-checklists/templates/items/${itemId}`);
    return response.data;
  },

  // --- Template Excel Import / Export ---
  async downloadSampleTemplate(): Promise<Blob> {
    const response = await apiClient.get('/work-checklists/templates/sample-template', {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportTemplatesExcel(templateIds?: number[]): Promise<Blob> {
    const params: Record<string, any> = {};
    if (templateIds && templateIds.length > 0) {
      params.template_ids = templateIds.join(',');
    }
    const response = await apiClient.get('/work-checklists/templates/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  async importTemplatesExcel(file: File): Promise<{ success: boolean; templates_count: number; items_count: number; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/work-checklists/templates/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // --- App Users ---
  async getAppUsers(): Promise<AppUserOption[]> {
    const response = await apiClient.get<AppUserOption[]>('/work-checklists/app-users');
    return response.data;
  },

  // --- Runs (Đợt Checklist) ---
  async getRuns(params: {
    search?: string;
    template_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
  } = {}): Promise<ChecklistRunListResponse> {
    const response = await apiClient.get<ChecklistRunListResponse>('/work-checklists/runs', {
      params: {
        search: params.search?.trim() || undefined,
        template_id: params.template_id || undefined,
        status: params.status || undefined,
        from_date: params.from_date || undefined,
        to_date: params.to_date || undefined,
        page: params.page || 1,
        page_size: params.page_size || 20,
      },
    });
    return response.data;
  },

  async exportRunsExcel(params: {
    search?: string;
    template_id?: number;
    status?: string;
    from_date?: string;
    to_date?: string;
  } = {}): Promise<void> {
    const response = await apiClient.get('/work-checklists/runs/export-excel', {
      params: {
        search: params.search?.trim() || undefined,
        template_id: params.template_id || undefined,
        status: params.status || undefined,
        from_date: params.from_date || undefined,
        to_date: params.to_date || undefined,
      },
      responseType: 'blob',
    });

    // Extract filename or default
    let filename = `Thong_Ke_Checklist_Test_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes("filename*=")) {
      const match = disposition.match(/filename\*=UTF-8''(.+)/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async exportRunDetailExcel(runId: number): Promise<void> {
    const response = await apiClient.get(`/work-checklists/runs/${runId}/export-excel`, {
      responseType: 'blob',
    });

    let filename = `Checklist_Test_${runId}.xlsx`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes("filename*=")) {
      const match = disposition.match(/filename\*=UTF-8''(.+)/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      }
    }

    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getRunDetail(runId: number): Promise<ChecklistRunDetailResponse> {
    const response = await apiClient.get<ChecklistRunDetailResponse>(`/work-checklists/runs/${runId}`);
    return response.data;
  },

  async createRun(payload: ChecklistRunCreatePayload): Promise<ChecklistRun> {
    const response = await apiClient.post<ChecklistRun>('/work-checklists/runs', payload);
    return response.data;
  },

  async updateRun(runId: number, payload: ChecklistRunUpdatePayload): Promise<ChecklistRun> {
    const response = await apiClient.put<ChecklistRun>(`/work-checklists/runs/${runId}`, payload);
    return response.data;
  },

  async deleteRun(runId: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/work-checklists/runs/${runId}`);
    return response.data;
  },

  async updateRunItem(
    itemId: number,
    payload: { trang_thai?: string; ghi_chu_ket_qua?: string; images?: string[] }
  ): Promise<ChecklistRunItem> {
    const response = await apiClient.put<ChecklistRunItem>(`/work-checklists/runs/items/${itemId}`, payload);
    return response.data;
  },

  async addCustomItemToRun(
    runId: number,
    tieu_de: string,
    nhom?: string,
    huong_dan?: string
  ): Promise<ChecklistRunItem> {
    const response = await apiClient.post<ChecklistRunItem>(`/work-checklists/runs/${runId}/items/custom`, null, {
      params: {
        tieu_de,
        nhom: nhom || 'Phát sinh thêm',
        huong_dan: huong_dan || undefined,
      },
    });
    return response.data;
  },
};

