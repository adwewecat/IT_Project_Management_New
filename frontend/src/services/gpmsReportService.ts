import apiClient from './api';
import {
  GpmsBatchItem,
  GpmsBatchListResponse,
  GpmsDashboardResponse,
  GpmsFilterState,
  GpmsRegionConfigResponse,
  GpmsTicketListResponse,
} from '../types/gpmsReport';

function buildQueryParams(filters: GpmsFilterState): Record<string, any> {
  const params: Record<string, any> = {
    ref_mode: filters.refMode,
    include_anonymous: filters.includeAnonymous,
    include_unassigned_dmcv: filters.includeUnassignedDmcv,
  };
  if (filters.batchId) params.batch_id = filters.batchId;
  if (filters.slaStatus) params.sla_status = filters.slaStatus;
  if (filters.sender) params.sender = filters.sender;
  if (filters.receiver) params.receiver = filters.receiver;
  if (filters.region) params.region = filters.region;
  if (filters.phanLoai) params.phan_loai = filters.phanLoai;
  if (filters.dmcv1) params.dmcv1 = filters.dmcv1;
  if (filters.dmcv2) params.dmcv2 = filters.dmcv2;
  if (filters.search && filters.search.trim()) params.search = filters.search.trim();
  return params;
}

export const gpmsReportService = {
  async listBatches(autoSeed = true): Promise<GpmsBatchListResponse> {
    const res = await apiClient.get<GpmsBatchListResponse>('/gpms-report/batches', {
      params: { auto_seed: autoSeed },
    });
    return res.data;
  },

  async uploadReportExcel(file: File, reportName?: string): Promise<GpmsBatchItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (reportName && reportName.trim()) {
      formData.append('report_name', reportName.trim());
    }
    const res = await apiClient.post<GpmsBatchItem>('/gpms-report/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data;
  },

  async importFromFolder(filename?: string): Promise<GpmsBatchItem> {
    const res = await apiClient.post<GpmsBatchItem>('/gpms-report/import-folder', null, {
      params: filename ? { filename } : undefined,
      timeout: 120000,
    });
    return res.data;
  },

  async deleteBatch(batchId: number): Promise<void> {
    await apiClient.delete(`/gpms-report/batches/${batchId}`);
  },

  async getAnalytics(filters: GpmsFilterState): Promise<GpmsDashboardResponse> {
    const res = await apiClient.get<GpmsDashboardResponse>('/gpms-report/analytics', {
      params: buildQueryParams(filters),
    });
    return res.data;
  },

  async getTicketDetails(
    filters: GpmsFilterState,
    page = 1,
    pageSize = 30
  ): Promise<GpmsTicketListResponse> {
    const res = await apiClient.get<GpmsTicketListResponse>('/gpms-report/tickets', {
      params: {
        ...buildQueryParams(filters),
        page,
        page_size: pageSize,
      },
    });
    return res.data;
  },

  async getRegionConfig(batchId?: number): Promise<GpmsRegionConfigResponse> {
    const res = await apiClient.get<GpmsRegionConfigResponse>('/gpms-report/region-config', {
      params: batchId ? { batch_id: batchId } : undefined,
    });
    return res.data;
  },

  async saveRegionConfig(
    usernames: string[],
    fullNames: Record<string, string>,
    batchId?: number
  ): Promise<GpmsRegionConfigResponse> {
    const res = await apiClient.put<GpmsRegionConfigResponse>(
      '/gpms-report/region-config',
      { usernames, full_names: fullNames },
      { params: batchId ? { batch_id: batchId } : undefined }
    );
    return res.data;
  },
};
