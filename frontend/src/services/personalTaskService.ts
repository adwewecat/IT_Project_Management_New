import apiClient from './api';
import {
  PersonalTaskItem,
  PersonalTaskCreatePayload,
  PersonalTaskUpdatePayload,
  PersonalTaskListResponse,
  AITaskExtractRequest,
  TaskFileAttachment,
  UploadFilesResult,
} from '../types/personalTask';

export const personalTaskService = {
  // Lấy danh sách công việc cá nhân
  async getTasks(params: {
    tab?: 'pending' | 'completed';
    from_date?: string;
    to_date?: string;
    search?: string;
    limit?: number;
  } = {}): Promise<PersonalTaskListResponse> {
    const response = await apiClient.get<PersonalTaskListResponse>('/personal-tasks', {
      params: {
        tab: params.tab || 'pending',
        from_date: params.from_date || undefined,
        to_date: params.to_date || undefined,
        search: params.search?.trim() || undefined,
        limit: params.limit || 500,
      },
    });
    return response.data;
  },

  // Tạo mới một công việc
  async createTask(payload: PersonalTaskCreatePayload): Promise<PersonalTaskItem> {
    const response = await apiClient.post<PersonalTaskItem>('/personal-tasks', payload);
    return response.data;
  },

  // Tạo hàng loạt công việc
  async batchCreateTasks(tasks: string[]): Promise<PersonalTaskItem[]> {
    const response = await apiClient.post<PersonalTaskItem[]>('/personal-tasks/batch', { tasks });
    return response.data;
  },

  // Cập nhật công việc
  async updateTask(id: number, payload: PersonalTaskUpdatePayload): Promise<PersonalTaskItem> {
    const response = await apiClient.put<PersonalTaskItem>(`/personal-tasks/${id}`, payload);
    return response.data;
  },

  // Hoàn thành / Mở lại công việc
  async toggleTask(id: number): Promise<PersonalTaskItem> {
    const response = await apiClient.post<PersonalTaskItem>(`/personal-tasks/${id}/toggle`);
    return response.data;
  },

  // Xóa công việc
  async deleteTask(id: number): Promise<void> {
    await apiClient.delete(`/personal-tasks/${id}`);
  },

  // Bóc tách text hoặc ảnh thành danh sách công việc (bằng regex hoặc Gemini AI)
  async extractTasksAI(payload: AITaskExtractRequest): Promise<string[]> {
    const response = await apiClient.post<string[]>('/personal-tasks/extract-ai', payload);
    return response.data;
  },

  // Upload hình ảnh và tệp đính kèm đa định dạng (hỗ trợ cả lặp mảng url và truy cập chi tiết .files)
  async uploadFiles(files: File[]): Promise<UploadFilesResult> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await apiClient.post<{ urls: string[]; files: TaskFileAttachment[] }>(
      '/personal-tasks/upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    const urls = response.data?.urls || [];
    const fileList = response.data?.files || [];
    const result = Object.assign([...urls], {
      urls,
      files: fileList,
    });
    return result as unknown as UploadFilesResult;
  },
};
