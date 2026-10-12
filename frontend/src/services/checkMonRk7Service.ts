import apiClient from './api';
import {
  BrandItem,
  SapCheckResponse,
  SelectorCheckResponse,
  BrandMenuResponse
} from '../types/checkMonRk7';

export const checkMonRk7Service = {
  // 1. Lấy danh sách Brand có menu trên RK7
  getBrands: async (): Promise<BrandItem[]> => {
    const response = await apiClient.get<BrandItem[]>('/check-mon-rk7/brands');
    return response.data;
  },

  // 2. Check món đã đẩy từ SAP xuống RK7 chưa
  checkSap: async (sapCodes: string[]): Promise<SapCheckResponse> => {
    const response = await apiClient.post<SapCheckResponse>('/check-mon-rk7/check-sap', {
      sap_codes: sapCodes
    });
    return response.data;
  },

  // 3. Check món nằm trong Selector nào của Brand nào
  checkSelector: async (sapCodes: string[]): Promise<SelectorCheckResponse> => {
    const response = await apiClient.post<SelectorCheckResponse>('/check-mon-rk7/check-selector', {
      sap_codes: sapCodes
    });
    return response.data;
  },

  // 4. Lấy toàn bộ thực đơn theo Brand
  getBrandMenu: async (brandGuid: string): Promise<BrandMenuResponse> => {
    const response = await apiClient.get<BrandMenuResponse>(`/check-mon-rk7/brand-menu/${brandGuid}`);
    return response.data;
  },

  // 5. Xuất file Excel kết quả check SAP -> RK7
  exportSapCheck: async (sapCodes: string[]): Promise<void> => {
    const response = await apiClient.post('/check-mon-rk7/export-sap', {
      sap_codes: sapCodes
    }, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'Ket_Qua_Check_SAP_RK7.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 6. Xuất file Excel kết quả check Selector POS
  exportSelectorCheck: async (sapCodes: string[]): Promise<void> => {
    const response = await apiClient.post('/check-mon-rk7/export-selector', {
      sap_codes: sapCodes
    }, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'Ket_Qua_Check_Selector_POS.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 7. Xuất file Excel toàn bộ Menu của Brand
  exportBrandMenu: async (brandGuid: string, brandName: string): Promise<void> => {
    const response = await apiClient.get(`/check-mon-rk7/brand-menu/${brandGuid}/export`, {
      responseType: 'blob'
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Menu_POS_${brandName.replace(/\s+/g, '_')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};
