import apiClient from './api';
import {
  PrPoDoItem,
  PrPoDoCreate,
  PrPoDoUpdate,
  PrPoDoListResponse,
  PrPoDoFilterParams,
} from '../types/prPoDo';

export const prPoDoService = {
  /**
   * Lấy danh sách PR-PO-DO có lọc, tìm kiếm, phân trang và thống kê
   */
  async getList(params?: PrPoDoFilterParams): Promise<PrPoDoListResponse> {
    const res = await apiClient.get<PrPoDoListResponse>('/pr-po-do', { params });
    return res.data;
  },

  /**
   * Thêm nhanh dòng chứng từ mới
   */
  async create(payload: PrPoDoCreate): Promise<PrPoDoItem> {
    const res = await apiClient.post<PrPoDoItem>('/pr-po-do', payload);
    return res.data;
  },

  /**
   * Cập nhật inline từng ô (Autosave khi blur)
   */
  async update(id: number, payload: PrPoDoUpdate): Promise<PrPoDoItem> {
    const res = await apiClient.patch<PrPoDoItem>(`/pr-po-do/${id}`, payload);
    return res.data;
  },

  /**
   * Xóa dòng chứng từ (soft delete)
   */
  async delete(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/pr-po-do/${id}`);
    return res.data;
  },

  /**
   * Lấy danh sách 50 dòng đã xóa gần đây
   */
  async getDeletedList(search?: string): Promise<PrPoDoItem[]> {
    const res = await apiClient.get<PrPoDoItem[]>('/pr-po-do/deleted', {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  /**
   * Khôi phục dòng chứng từ đã xóa
   */
  async restore(id: number): Promise<PrPoDoItem> {
    const res = await apiClient.post<PrPoDoItem>(`/pr-po-do/${id}/restore`);
    return res.data;
  },

  /**
   * Xuất danh sách ra file Excel .xlsx
   */
  async exportExcel(params?: PrPoDoFilterParams): Promise<Blob> {
    const res = await apiClient.get('/pr-po-do/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },
};
