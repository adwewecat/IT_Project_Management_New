import apiClient from './api';
import {
  ExtRscItem,
  ExtRscCreate,
  ExtRscUpdate,
  ExtRscListResponse,
  ExtRscFilterParams,
} from '../types/extRsc';

export const extRscService = {
  /**
   * Lấy danh sách số máy nhánh EXT RSC có tìm kiếm và phân trang
   */
  async getList(params?: ExtRscFilterParams): Promise<ExtRscListResponse> {
    const res = await apiClient.get<ExtRscListResponse>('/ext-rsc', { params });
    return res.data;
  },

  /**
   * Thêm mới số máy nhánh
   */
  async create(payload: ExtRscCreate): Promise<ExtRscItem> {
    const res = await apiClient.post<ExtRscItem>('/ext-rsc', payload);
    return res.data;
  },

  /**
   * Cập nhật thông tin số máy nhánh
   */
  async update(id: number, payload: ExtRscUpdate): Promise<ExtRscItem> {
    const res = await apiClient.put<ExtRscItem>(`/ext-rsc/${id}`, payload);
    return res.data;
  },

  /**
   * Xóa số máy nhánh
   */
  async delete(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/ext-rsc/${id}`);
    return res.data;
  },

  /**
   * Xuất danh sách ra file Excel .xlsx
   */
  async exportExcel(search?: string): Promise<Blob> {
    const res = await apiClient.get('/ext-rsc/export', {
      params: search ? { search } : undefined,
      responseType: 'blob',
    });
    return res.data;
  },
};
