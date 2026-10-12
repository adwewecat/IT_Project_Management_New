import apiClient from './api';
import {
  MemoItem,
  MemoCreate,
  MemoUpdate,
  MemoGiaHan,
  MemoStats,
  MemoListResponse,
  NextItSetupResponse,
  AppUserOption,
  UploadImageResponse,
  RoundRobinConfigResponse,
  MemoTemplateBrandItem,
  MemoTemplateDataResponse,
  MemoTemplateBrandUpsert,
} from '../types/memo';

export interface MemoFilterParams {
  search?: string;
  trangthai?: string;
  it_setup?: string;
  giahan?: string;
  tungay?: string;
  denngay?: string;
  page?: number;
  page_size?: number;
}

export const memoService = {
  /**
   * Lấy danh sách Memo kèm phân trang, tìm kiếm và thống kê
   */
  async getList(params?: MemoFilterParams): Promise<MemoListResponse> {
    const res = await apiClient.get<MemoListResponse>('/memo', { params });
    return res.data;
  },

  /**
   * Lấy riêng số liệu thống kê Memo
   */
  async getStats(): Promise<MemoStats> {
    const res = await apiClient.get<MemoStats>('/memo/stats');
    return res.data;
  },

  /**
   * Lấy chi tiết một Memo
   */
  async getById(id: number): Promise<MemoItem> {
    const res = await apiClient.get<MemoItem>(`/memo/${id}`);
    return res.data;
  },

  /**
   * Gợi ý người setup tiếp theo theo vòng tròn Round-Robin
   */
  async getNextItSetup(): Promise<NextItSetupResponse> {
    const res = await apiClient.get<NextItSetupResponse>('/memo/next-it-setup');
    return res.data;
  },

  /**
   * Lấy danh sách nhân sự IT App
   */
  async getAppUsers(): Promise<AppUserOption[]> {
    const res = await apiClient.get<AppUserOption[]>('/memo/app-users');
    return res.data;
  },

  /**
   * Tạo mới một Memo
   */
  async create(payload: MemoCreate): Promise<MemoItem> {
    const res = await apiClient.post<MemoItem>('/memo', payload);
    return res.data;
  },

  /**
   * Kiểm tra nhanh trùng mã Memo (real-time khi nhập vào ô Mã Memo)
   */
  async checkMemoCode(code: string, excludeId?: number): Promise<{
    exists: boolean;
    ma_memo?: string;
    memo_id?: number;
    it_setup?: string;
    subject_mail?: string;
    ngay_tiepnhan?: string;
    message?: string;
  }> {
    const res = await apiClient.get('/memo/check-code', {
      params: {
        code: code.trim(),
        exclude_id: excludeId,
      },
    });
    return res.data;
  },

  /**
   * Cập nhật thông tin Memo
   */
  async update(id: number, payload: MemoUpdate): Promise<MemoItem> {
    const res = await apiClient.put<MemoItem>(`/memo/${id}`, payload);
    return res.data;
  },

  /**
   * Gia hạn Memo
   */
  async giaHan(id: number, payload: MemoGiaHan): Promise<MemoItem> {
    const res = await apiClient.post<MemoItem>(`/memo/${id}/gia-han`, payload);
    return res.data;
  },

  /**
   * Xóa mềm Memo
   */
  async delete(id: number): Promise<{ message: string }> {
    const res = await apiClient.delete<{ message: string }>(`/memo/${id}`);
    return res.data;
  },

  /**
   * Xuất danh sách Memo ra file Excel
   */
  async exportExcel(params?: MemoFilterParams): Promise<Blob> {
    const res = await apiClient.get('/memo/export', {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Upload file đính kèm Memo
   */
  async uploadFile(file: File): Promise<{ status: string; filename: string; original_name: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/memo/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Upload ảnh hướng dẫn setup
   */
  async uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<UploadImageResponse>('/memo/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Đường dẫn tải file đính kèm
   */
  getFileDownloadUrl(filename: string): string {
    return `/api/v1/memo/download-file/${encodeURIComponent(filename)}`;
  },

  /**
   * Lấy cấu hình danh sách IT tham gia xoay vòng Memo
   */
  async getRoundRobinConfig(): Promise<RoundRobinConfigResponse> {
    const res = await apiClient.get<RoundRobinConfigResponse>('/memo/round-robin-config');
    return res.data;
  },

  /**
   * Cập nhật danh sách IT tham gia xoay vòng Memo (Admin only)
   */
  async updateRoundRobinConfig(activeUsernames: string[]): Promise<RoundRobinConfigResponse> {
    const res = await apiClient.put<RoundRobinConfigResponse>('/memo/round-robin-config', {
      active_usernames: activeUsernames,
    });
    return res.data;
  },

  /**
   * Đánh giá Memo (Admin & Super Admin)
   */
  async review(
    id: number,
    payload: { review_status?: string | null; review_note?: string | null }
  ): Promise<MemoItem> {
    const res = await apiClient.put<MemoItem>(`/memo/${id}/review`, payload);
    return res.data;
  },

  /**
   * ==========================================
   * Template Mẫu Gửi Mail Memo Services
   * ==========================================
   */

  /**
   * Lấy toàn bộ dữ liệu cấu hình Template Mẫu
   */
  async getTemplateData(): Promise<MemoTemplateDataResponse> {
    const res = await apiClient.get<MemoTemplateDataResponse>('/memo/template/data');
    return res.data;
  },

  /**
   * Cập nhật TO emails (Admin)
   */
  async updateTemplateTo(toEmails: string): Promise<{ status: string; to_emails: string }> {
    const res = await apiClient.put('/memo/template/to', { to_emails: toEmails });
    return res.data;
  },

  /**
   * Cập nhật Base CC emails (Admin)
   */
  async updateTemplateBaseCc(baseCcEmails: string): Promise<{ status: string; base_cc_emails: string }> {
    const res = await apiClient.put('/memo/template/base-cc', { base_cc_emails: baseCcEmails });
    return res.data;
  },

  /**
   * Cập nhật link SharePoint BM MKT (Admin)
   */
  async updateTemplateLink(mktLink: string): Promise<{ status: string; mkt_link: string }> {
    const res = await apiClient.put('/memo/template/link', { mkt_link: mktLink });
    return res.data;
  },

  /**
   * Cập nhật nội dung Email Body mẫu (Admin)
   */
  async updateTemplateBody(emailBody: string): Promise<{ status: string; email_body: string }> {
    const res = await apiClient.put('/memo/template/body', { email_body: emailBody });
    return res.data;
  },

  /**
   * Thêm hoặc cập nhật nhãn hàng / BM (Admin)
   */
  async upsertTemplateBrand(payload: MemoTemplateBrandUpsert): Promise<{ status: string; brand: MemoTemplateBrandItem }> {
    const res = await apiClient.post('/memo/template/brand', payload);
    return res.data;
  },

  /**
   * Xóa nhãn hàng khỏi Template (Admin)
   */
  async deleteTemplateBrand(brandId: number): Promise<{ status: string; message: string }> {
    const res = await apiClient.delete(`/memo/template/brand/${brandId}`);
    return res.data;
  },

  /**
   * Đồng bộ BM MKT từ file Excel (Admin)
   */
  async syncBmExcel(file: File): Promise<{ status: string; total_updated: number; brands: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/memo/template/sync-bm-excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Đồng bộ BM MKT từ bảng copy text/dòng (Admin)
   */
  async syncBmText(text: string): Promise<{ status: string; total_updated: number; brands: any[] }> {
    const res = await apiClient.post('/memo/template/sync-bm-text', { text });
    return res.data;
  },
};

