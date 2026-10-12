import apiClient from './api';
import {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectMember,
  MemberCreate,
  MemberTask,
  TaskCreate,
  ProjectActivityLog,
  ImportResult
} from '../types/project';

export const projectService = {
  // 1. Get projects
  getProjects: async (status?: string, search?: string): Promise<Project[]> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await apiClient.get<Project[]>('/projects', { params });
    return response.data;
  },

  // 2. Get project detail
  getProjectDetail: async (id: number): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },

  // 3. Create project
  createProject: async (payload: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects', payload);
    return response.data;
  },

  // 4. Update project
  updateProject: async (id: number, payload: ProjectUpdate): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}`, payload);
    return response.data;
  },

  // 4b. Update project description & attachments
  updateProjectDescription: async (id: number, payload: { Description?: string | null; Images?: string | null; Files?: string | null }): Promise<Project> => {
    const response = await apiClient.put<Project>(`/projects/${id}/description`, payload);
    return response.data;
  },

  // 4c. Upload files & pasted images
  uploadFiles: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const response = await apiClient.post<{ urls: string[] }>('/projects/upload-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.urls;
  },

  // 5. Delete project
  deleteProject: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/projects/${id}`);
    return response.data;
  },

  // 6. Add member
  addMember: async (projectId: number, payload: MemberCreate): Promise<ProjectMember> => {
    const response = await apiClient.post<ProjectMember>(`/projects/${projectId}/members`, payload);
    return response.data;
  },

  // 7. Delete member
  deleteMember: async (memberId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/projects/members/${memberId}`);
    return response.data;
  },

  // 8. Add task
  addTask: async (memberId: number, payload: TaskCreate): Promise<MemberTask> => {
    const response = await apiClient.post<MemberTask>(`/projects/members/${memberId}/tasks`, payload);
    return response.data;
  },

  // 9. Delete task
  deleteTask: async (taskId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/projects/tasks/${taskId}`);
    return response.data;
  },

  // 10. Toggle task done/undone
  toggleTask: async (taskId: number, done: boolean): Promise<{
    success: boolean;
    task: MemberTask;
    member_completed_at: string | null;
    project_status: string;
  }> => {
    const response = await apiClient.post(`/projects/tasks/${taskId}/toggle`, { done });
    return response.data;
  },

  // 10.1. Review task (OK / Fail / Reset) - Admin & Super Admin only
  reviewTask: async (
    taskId: number,
    payload: { review_status?: string | null; review_note?: string | null }
  ): Promise<MemberTask> => {
    const response = await apiClient.put<MemberTask>(`/projects/tasks/${taskId}/review`, payload);
    return response.data;
  },

  // 10.2. Bulk toggle tasks
  bulkToggleTasks: async (taskIds: number[], done: boolean): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> => {
    const response = await apiClient.post('/projects/tasks/bulk-toggle', { task_ids: taskIds, done });
    return response.data;
  },

  // 10.3. Toggle all tasks of a project
  toggleAllProjectTasks: async (projectId: number, done: boolean): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> => {
    const response = await apiClient.post(`/projects/${projectId}/toggle-all`, { done });
    return response.data;
  },

  // 10.4. Toggle all tasks of a member
  toggleAllMemberTasks: async (memberId: number, done: boolean): Promise<{
    success: boolean;
    count: number;
    message: string;
  }> => {
    const response = await apiClient.post(`/projects/members/${memberId}/toggle-all`, { done });
    return response.data;
  },

  // 11. Activity logs with filters
  getActivityLogs: async (params?: {
    limit?: number;
    project_id?: number;
    action_by?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ProjectActivityLog[]> => {
    const cleanParams: Record<string, any> = { limit: params?.limit || 200 };
    if (params?.project_id) cleanParams.project_id = params.project_id;
    if (params?.action_by?.trim()) cleanParams.action_by = params.action_by.trim();
    if (params?.start_date) cleanParams.start_date = params.start_date;
    if (params?.end_date) cleanParams.end_date = params.end_date;

    const response = await apiClient.get<ProjectActivityLog[]>('/projects/activity-logs', {
      params: cleanParams
    });
    return response.data;
  },

  // 12. Export Excel (all, single project, or multiple selected projects)
  exportExcel: async (projectId?: number, projectIds?: number[]): Promise<Blob> => {
    const params: Record<string, any> = {};
    if (projectIds && projectIds.length > 0) {
      params.project_ids = projectIds.join(',');
    } else if (projectId) {
      params.project_id = projectId;
    }
    const response = await apiClient.get('/projects/export', {
      params,
      responseType: 'blob'
    });
    return response.data;
  },

  // 13. Download sample template
  downloadSampleTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get('/projects/sample-template', {
      responseType: 'blob'
    });
    return response.data;
  },

  // 14. Import Excel
  importExcel: async (file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ImportResult>('/projects/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // 15. ALLAPP_PM (Ứng Dụng & PM Phụ Trách)
  getAppPmList: async (): Promise<import('../types/project').AppPmItem[]> => {
    const response = await apiClient.get<import('../types/project').AppPmItem[]>('/projects/app-pm');
    return response.data;
  },

  createAppPm: async (payload: import('../types/project').AppPmCreate): Promise<import('../types/project').AppPmItem> => {
    const response = await apiClient.post<import('../types/project').AppPmItem>('/projects/app-pm', payload);
    return response.data;
  },

  updateAppPm: async (id: number, payload: import('../types/project').AppPmUpdate): Promise<import('../types/project').AppPmItem> => {
    const response = await apiClient.put<import('../types/project').AppPmItem>(`/projects/app-pm/${id}`, payload);
    return response.data;
  },

  deleteAppPm: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/projects/app-pm/${id}`);
    return response.data;
  },

  // 16. Quick assign task directly
  quickAssignTask: async (payload: import('../types/project').QuickAssignTaskRequest): Promise<import('../types/project').QuickAssignResult> => {
    const response = await apiClient.post<import('../types/project').QuickAssignResult>('/projects/quick-assign', payload);
    return response.data;
  },

  // 17. Get Team App members
  getTeamMembers: async (): Promise<import('../types/project').TeamMemberItem[]> => {
    const response = await apiClient.get<import('../types/project').TeamMemberItem[]>('/projects/team-members');
    return response.data;
  },

  // 18. Upload task attachment
  uploadAttachment: async (file: File): Promise<import('../types/project').UploadAttachmentResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<import('../types/project').UploadAttachmentResult>(
      '/projects/upload-attachment',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    return response.data;
  }
};


