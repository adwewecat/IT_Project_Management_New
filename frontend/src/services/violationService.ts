import apiClient from './api';
import {
  ViolationItem,
  ViolationListResponse,
  ViolationCreatePayload,
  ViolationBatchCreatePayload,
  LeaveLogItem,
  LeaveLogListResponse,
  LeaveLogCreatePayload,
  LeaveTypeItem,
  LeaveTypeCreatePayload,
} from '../types/violation';

export const violationService = {
  // Violations
  async getViolations(params: {
    month?: number;
    year?: number;
    username?: string;
    loai_saipham?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<ViolationListResponse> {
    const res = await apiClient.get<ViolationListResponse>('/violations', { params });
    return res.data;
  },

  async createViolation(payload: ViolationCreatePayload): Promise<ViolationItem> {
    const res = await apiClient.post<ViolationItem>('/violations', payload);
    return res.data;
  },

  async createViolationsBatch(payload: ViolationBatchCreatePayload): Promise<ViolationItem[]> {
    const res = await apiClient.post<ViolationItem[]>('/violations/batch', payload);
    return res.data;
  },

  async updateViolation(id: number, payload: Partial<ViolationCreatePayload> & { trangthai?: boolean }): Promise<ViolationItem> {
    const res = await apiClient.put<ViolationItem>(`/violations/${id}`, payload);
    return res.data;
  },

  async deleteViolation(id: number): Promise<void> {
    await apiClient.delete(`/violations/${id}`);
  },

  async uploadFiles(files: File[]): Promise<string[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const res = await apiClient.post<{ urls: string[] }>('/violations/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.urls;
  },

  // Leaves
  async getLeaves(params: {
    month?: number;
    year?: number;
    username?: string;
    leave_type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<LeaveLogListResponse> {
    const res = await apiClient.get<LeaveLogListResponse>('/violations/leaves', { params });
    return res.data;
  },

  async createLeave(payload: LeaveLogCreatePayload): Promise<LeaveLogItem> {
    const res = await apiClient.post<LeaveLogItem>('/violations/leaves', payload);
    return res.data;
  },

  async updateLeave(id: number, payload: Partial<LeaveLogCreatePayload>): Promise<LeaveLogItem> {
    const res = await apiClient.put<LeaveLogItem>(`/violations/leaves/${id}`, payload);
    return res.data;
  },

  async deleteLeave(id: number): Promise<void> {
    await apiClient.delete(`/violations/leaves/${id}`);
  },

  // Leave Types Configuration
  async getLeaveTypes(includeInactive: boolean = false): Promise<LeaveTypeItem[]> {
    const res = await apiClient.get<LeaveTypeItem[]>('/violations/leave-types', {
      params: { include_inactive: includeInactive },
    });
    return res.data;
  },

  async createLeaveType(payload: LeaveTypeCreatePayload): Promise<LeaveTypeItem> {
    const res = await apiClient.post<LeaveTypeItem>('/violations/leave-types', payload);
    return res.data;
  },

  async updateLeaveType(id: number, payload: Partial<LeaveTypeCreatePayload>): Promise<LeaveTypeItem> {
    const res = await apiClient.put<LeaveTypeItem>(`/violations/leave-types/${id}`, payload);
    return res.data;
  },

  async deleteLeaveType(id: number): Promise<void> {
    await apiClient.delete(`/violations/leave-types/${id}`);
  },
};

