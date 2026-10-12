import apiClient from './api';
import {
  PMSoftwareItem,
  PMSoftwareCreatePayload,
  PMSoftwareUpdatePayload,
  SoftwareVersionItem,
  SoftwareVersionCreatePayload,
  SoftwareVersionUpdatePayload,
  SoftwareVersionSyncDatePayload,
  BrandPrintStandardItem,
  BrandPrintStandardCreatePayload,
  BrandPrintStandardUpdatePayload,
} from '../types/pmBo';

export const pmBoService = {
  // =========================================================================
  // 1. TAB 1: PHẦN MỀM & PM PHỤ TRÁCH (ALLAPP_PM)
  // =========================================================================
  async getPmSoftwares(search?: string): Promise<PMSoftwareItem[]> {
    const response = await apiClient.get<PMSoftwareItem[]>('/pm-bo/softwares', {
      params: { search: search?.trim() || undefined },
    });
    return response.data;
  },

  async createPmSoftware(payload: PMSoftwareCreatePayload): Promise<PMSoftwareItem> {
    const response = await apiClient.post<PMSoftwareItem>('/pm-bo/softwares', payload);
    return response.data;
  },

  async updatePmSoftware(id: number, payload: PMSoftwareUpdatePayload): Promise<PMSoftwareItem> {
    const response = await apiClient.put<PMSoftwareItem>(`/pm-bo/softwares/${id}`, payload);
    return response.data;
  },

  async deletePmSoftware(id: number): Promise<void> {
    await apiClient.delete(`/pm-bo/softwares/${id}`);
  },

  // =========================================================================
  // 2. TAB 2: THEO DÕI PHIÊN BẢN PHẦN MỀM (SOFTWARE_VERSIONS)
  // =========================================================================
  async getSoftwareVersions(search?: string): Promise<SoftwareVersionItem[]> {
    const response = await apiClient.get<SoftwareVersionItem[]>('/pm-bo/versions', {
      params: { search: search?.trim() || undefined },
    });
    return response.data;
  },

  async createSoftwareVersion(payload: SoftwareVersionCreatePayload): Promise<SoftwareVersionItem> {
    const response = await apiClient.post<SoftwareVersionItem>('/pm-bo/versions', payload);
    return response.data;
  },

  async updateSoftwareVersion(id: number, payload: SoftwareVersionUpdatePayload): Promise<SoftwareVersionItem> {
    const response = await apiClient.put<SoftwareVersionItem>(`/pm-bo/versions/${id}`, payload);
    return response.data;
  },

  async deleteSoftwareVersion(id: number): Promise<void> {
    await apiClient.delete(`/pm-bo/versions/${id}`);
  },

  async syncSoftwareVersionDates(payload: SoftwareVersionSyncDatePayload): Promise<SoftwareVersionItem[]> {
    const response = await apiClient.post<SoftwareVersionItem[]>('/pm-bo/versions/sync-date', payload);
    return response.data;
  },

  async uploadVersionImage(file: File): Promise<{ url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ status: string; url: string; filename: string }>(
      '/pm-bo/versions/upload-image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  // =========================================================================
  // 3. TAB 3: CHUẨN HÓA IN TỪNG BRAND (BRAND_PRINT_STANDARDS)
  // =========================================================================
  async getBrandPrintStandards(search?: string, loaiIn?: string): Promise<BrandPrintStandardItem[]> {
    const response = await apiClient.get<BrandPrintStandardItem[]>('/pm-bo/print-standards', {
      params: {
        search: search?.trim() || undefined,
        loai_in: loaiIn !== 'ALL' ? loaiIn : undefined,
      },
    });
    return response.data;
  },

  async createBrandPrintStandard(payload: BrandPrintStandardCreatePayload): Promise<BrandPrintStandardItem> {
    const response = await apiClient.post<BrandPrintStandardItem>('/pm-bo/print-standards', payload);
    return response.data;
  },

  async updateBrandPrintStandard(id: number, payload: BrandPrintStandardUpdatePayload): Promise<BrandPrintStandardItem> {
    const response = await apiClient.put<BrandPrintStandardItem>(`/pm-bo/print-standards/${id}`, payload);
    return response.data;
  },

  async deleteBrandPrintStandard(id: number): Promise<void> {
    await apiClient.delete(`/pm-bo/print-standards/${id}`);
  },
};
