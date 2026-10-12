import apiClient from './api';
import {
  RoleItem,
  RoleCreatePayload,
  RoleUpdatePayload,
  RoleWithPermissions,
  PermissionDetailItem,
} from '../types/role';

export const roleService = {
  async getRoles(): Promise<RoleItem[]> {
    const response = await apiClient.get<RoleItem[]>('/roles');
    return response.data;
  },

  async getRole(id: number): Promise<RoleItem> {
    const response = await apiClient.get<RoleItem>(`/roles/${id}`);
    return response.data;
  },

  async createRole(payload: RoleCreatePayload): Promise<RoleItem> {
    const response = await apiClient.post<RoleItem>('/roles', payload);
    return response.data;
  },

  async updateRole(id: number, payload: RoleUpdatePayload): Promise<RoleItem> {
    const response = await apiClient.put<RoleItem>(`/roles/${id}`, payload);
    return response.data;
  },

  async getRolePermissions(id: number): Promise<RoleWithPermissions> {
    const response = await apiClient.get<RoleWithPermissions>(`/roles/${id}/permissions`);
    return response.data;
  },

  async updateRolePermissions(id: number, permissions: PermissionDetailItem[]): Promise<RoleWithPermissions> {
    const response = await apiClient.put<RoleWithPermissions>(`/roles/${id}/permissions`, {
      permissions,
    });
    return response.data;
  },

  async addCustomPermission(payload: import('../types/role').AddCustomPermissionPayload): Promise<PermissionDetailItem> {
    const response = await apiClient.post<PermissionDetailItem>('/roles/permissions/add-custom', payload);
    return response.data;
  },
};

