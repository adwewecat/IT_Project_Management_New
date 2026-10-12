import apiClient from './api';
import {
  SetupRestaurant,
  SetupRestaurantCreate,
  SetupRestaurantUpdate,
  SetupRestaurantListResponse,
  RestaurantChecklistResponse,
  ChecklistItemUpdate,
  ChecklistUpdateResult,
  ChecklistItemCreatePayload,
  ChecklistMasterResponse,
  ChecklistMasterItem,
  ChecklistMasterItemCreatePayload,
  ChecklistMasterItemUpdatePayload,
  ChecklistMasterGroupUpdatePayload,
} from '../types/setupRestaurant';

export const setupRestaurantService = {
  // 1. Get paginated list of setup restaurants
  getRestaurants: async (
    status?: string,
    search?: string,
    itPhutrach?: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SetupRestaurantListResponse> => {
    const params: Record<string, any> = { page, page_size: pageSize };
    if (status && status !== 'all') params.status = status;
    if (search) params.search = search;
    if (itPhutrach && itPhutrach !== 'all') params.it_phutrach = itPhutrach;

    const response = await apiClient.get<SetupRestaurantListResponse>('/setup-restaurants', { params });
    return response.data;
  },

  // 2. Get IT App users for assignment
  getItUsers: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/setup-restaurants/it-users');
    return response.data;
  },

  // 2.1 Get next round-robin IT user for setup
  getNextItSetup: async (): Promise<{ status: string; next_it: string; next_it_name: string; user_list: any[] }> => {
    const response = await apiClient.get('/setup-restaurants/next-it-setup');
    return response.data;
  },

  // 3. Get restaurant detail
  getRestaurantDetail: async (id: number): Promise<SetupRestaurant> => {
    const response = await apiClient.get<SetupRestaurant>(`/setup-restaurants/${id}`);
    return response.data;
  },

  // 4. Create new setup restaurant (auto clones 83 checklist items)
  createRestaurant: async (payload: SetupRestaurantCreate): Promise<SetupRestaurant> => {
    const response = await apiClient.post<SetupRestaurant>('/setup-restaurants', payload);
    return response.data;
  },

  // 5. Update restaurant info
  updateRestaurant: async (id: number, payload: SetupRestaurantUpdate): Promise<SetupRestaurant> => {
    const response = await apiClient.put<SetupRestaurant>(`/setup-restaurants/${id}`, payload);
    return response.data;
  },

  // 6. Delete restaurant
  deleteRestaurant: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/setup-restaurants/${id}`);
    return response.data;
  },

  // 7. Get restaurant checklist detail
  getChecklist: async (id: number): Promise<RestaurantChecklistResponse> => {
    const response = await apiClient.get<RestaurantChecklistResponse>(`/setup-restaurants/${id}/checklist`);
    return response.data;
  },

  // 8. Update / Toggle checklist item
  updateChecklistItem: async (detailId: number, payload: ChecklistItemUpdate): Promise<ChecklistUpdateResult> => {
    const response = await apiClient.put<ChecklistUpdateResult>(`/setup-restaurants/checklist/${detailId}`, payload);
    return response.data;
  },

  // 8b. Bulk update / toggle checklist items (all in tab or group)
  bulkToggleChecklist: async (
    restaurantId: number,
    payload: {
      is_completed: boolean;
      group_name?: string;
      item_ids?: number[];
      completed_date?: string | null;
      note?: string | null;
    }
  ): Promise<{ success: boolean; updated_count: number; restaurant_status: string; message: string }> => {
    const response = await apiClient.put<{
      success: boolean;
      updated_count: number;
      restaurant_status: string;
      message: string;
    }>(`/setup-restaurants/${restaurantId}/checklist/bulk-toggle`, payload);
    return response.data;
  },

  // 9. Export checklist to Excel
  exportChecklistExcel: async (id: number, restaurantName: string): Promise<void> => {
    const response = await apiClient.get(`/setup-restaurants/${id}/checklist/export`, {
      responseType: 'blob',
    });
    if (response.data?.type === 'application/json') {
      const text = await response.data.text();
      let msg = 'Lỗi khi xuất file Excel';
      try {
        const errObj = JSON.parse(text);
        msg = errObj.detail || msg;
      } catch {}
      throw new Error(msg);
    }
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    const cleanName = (restaurantName || 'Nha_Hang').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_');
    link.download = `Checklist_Setup_${cleanName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 10. Review restaurant (Admin & Super Admin)
  reviewRestaurant: async (
    id: number,
    payload: { review_status?: string | null; review_note?: string | null }
  ): Promise<SetupRestaurant> => {
    const response = await apiClient.put<SetupRestaurant>(`/setup-restaurants/${id}/review`, payload);
    return response.data;
  },

  // 11. Add checklist item (Admin & Super Admin)
  addChecklistItem: async (
    restaurantId: number,
    payload: ChecklistItemCreatePayload
  ): Promise<{ success: boolean; item: any; restaurant_status: string; message: string }> => {
    const response = await apiClient.post(`/setup-restaurants/${restaurantId}/checklist`, payload);
    return response.data;
  },

  // 12. Delete checklist item (Admin & Super Admin)
  deleteChecklistItem: async (
    detailId: number
  ): Promise<{ success: boolean; restaurant_status: string; message: string }> => {
    const response = await apiClient.delete(`/setup-restaurants/checklist/${detailId}`);
    return response.data;
  },

  // 13. Download checklist Excel template
  downloadChecklistTemplateExcel: async (): Promise<void> => {
    const response = await apiClient.get('/setup-restaurants/checklist/template-excel', {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'Mau_Import_Checklist_Setup.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  // 14. Import checklist items from Excel (Admin & Super Admin)
  importChecklistExcel: async (
    restaurantId: number,
    file: File,
    saveToMaster: boolean = false
  ): Promise<{
    success: boolean;
    imported_count: number;
    groups_count: number;
    groups: string[];
    restaurant_status: string;
    message: string;
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('save_to_master', String(saveToMaster));

    const response = await apiClient.post(
      `/setup-restaurants/${restaurantId}/checklist/import-excel`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // 15. Get master checklist template for SOP reference
  getMasterChecklist: async (): Promise<ChecklistMasterResponse> => {
    const response = await apiClient.get<ChecklistMasterResponse>('/setup-restaurants/checklist-master');
    return response.data;
  },

  // 16. Create a new step in master checklist (Admin / Super Admin)
  createMasterItem: async (payload: ChecklistMasterItemCreatePayload): Promise<ChecklistMasterItem> => {
    const response = await apiClient.post<ChecklistMasterItem>('/setup-restaurants/checklist-master', payload);
    return response.data;
  },

  // 17. Update a step in master checklist (Admin / Super Admin)
  updateMasterItem: async (itemId: number, payload: ChecklistMasterItemUpdatePayload): Promise<ChecklistMasterItem> => {
    const response = await apiClient.put<ChecklistMasterItem>(`/setup-restaurants/checklist-master/${itemId}`, payload);
    return response.data;
  },

  // 18. Delete a step from master checklist (Admin / Super Admin)
  deleteMasterItem: async (itemId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/setup-restaurants/checklist-master/${itemId}`);
    return response.data;
  },

  // 19. Rename a master group (Admin / Super Admin)
  updateMasterGroup: async (payload: ChecklistMasterGroupUpdatePayload): Promise<{ success: boolean; updated_count: number; message: string }> => {
    const response = await apiClient.put<{ success: boolean; updated_count: number; message: string }>('/setup-restaurants/checklist-master/group', payload);
    return response.data;
  },
};

