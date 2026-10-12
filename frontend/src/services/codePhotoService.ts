import apiClient from './api';
import {
  CodePhotoItem,
  CodePhotoCreate,
  CodePhotoUpdate,
  CodePhotoStats,
  CodePhotoListResponse,
  CodePhotoFilterParams,
} from '../types/codePhoto';

export const codePhotoService = {
  /**
   * Lấy danh sách Code Photo có bộ lọc hiện trạng, tìm kiếm và phân trang
   */
  async getList(params?: CodePhotoFilterParams): Promise<CodePhotoListResponse> {
    const res = await apiClient.get<CodePhotoListResponse>('/code-photo', { params });
    return res.data;
  },

  /**
   * Lấy thống kê số lượng Code Photo
   */
  async getStats(): Promise<CodePhotoStats> {
    const res = await apiClient.get<CodePhotoStats>('/code-photo/stats');
    return res.data;
  },

  /**
   * Cấp mã Code Photo mới
   */
  async create(payload: CodePhotoCreate): Promise<CodePhotoItem> {
    const res = await apiClient.post<CodePhotoItem>('/code-photo', payload);
    return res.data;
  },

  /**
   * Cập nhật thông tin Code Photo
   */
  async update(id: number, payload: CodePhotoUpdate): Promise<CodePhotoItem> {
    const res = await apiClient.put<CodePhotoItem>(`/code-photo/${id}`, payload);
    return res.data;
  },

  /**
   * Xóa Code Photo
   */
  async delete(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/code-photo/${id}`);
    return res.data;
  },

  /**
   * Xuất danh sách ra file Excel .xlsx
   */
  async exportExcel(params?: CodePhotoFilterParams): Promise<Blob> {
    const res = await apiClient.get('/code-photo/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};
