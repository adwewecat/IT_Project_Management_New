export interface RoleItem {
  id: number;
  tenquyen?: string | null;
  noidung?: string | null;
  active: boolean;
  user_count: number;
}

export interface RoleCreatePayload {
  tenquyen: string;
  noidung?: string;
  active: boolean;
}

export interface RoleUpdatePayload {
  noidung?: string;
  active: boolean;
}

export interface PermissionDetailItem {
  id?: number | null;
  chucnang: string;
  active: boolean;
  module_group?: string | null;
  action_label?: string | null;
}

export interface RoleWithPermissions {
  role: RoleItem;
  permissions: PermissionDetailItem[];
}

export interface AddCustomPermissionPayload {
  chucnang: string;
  module_group: string;
  action_label: string;
  target_role_id?: number | null;
  create_db_column?: boolean;
  db_data_type?: string;
}

