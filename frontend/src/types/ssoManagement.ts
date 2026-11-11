export interface SSOConfigResponse {
  configured: boolean;
  sso_username?: string;
  last_status?: string;
  last_tested_at?: string;
  message?: string;
}

export interface SSOConfigRequest {
  sso_username: string;
  sso_password: string;
}

export interface SSOTestLoginResponse {
  success: boolean;
  message: string;
  sso_username?: string;
}

export interface IAMUserItem {
  user_id: string;
  user_name: string;
  email?: string;
  phone_number?: string;
  lock_enable?: string;
  user_type?: string;
  edit_url?: string;
}

export interface SSOSearchUserResponse {
  success: boolean;
  message: string;
  items: IAMUserItem[];
  total: number;
  has_more?: boolean;
}

export interface SSOChangePasswordRequest {
  user_id: string;
  custom_password?: string;
}

export interface SSOChangePasswordResponse {
  success: boolean;
  message: string;
  new_password?: string;
  is_ldap?: boolean;
  user_name?: string;
}

export interface SSOAssignClientsRequest {
  user_id: string;
  client_names?: string[];
}

export interface SSOAssignClientsResponse {
  success: boolean;
  message: string;
  assigned_clients: string[];
  total_assigned: number;
}

export interface SSOCreateNCCUserRequest {
  user_name: string;
  email: string;
  phone_number: string;
  auto_resolve_phone?: boolean;
  client_names?: string[];
}

export interface SSOCreateNCCUserResponse {
  success: boolean;
  message: string;
  user_name?: string;
  email?: string;
  phone_number?: string;
  user_id?: string;
  new_password?: string;
  assigned_clients?: string[];
  is_duplicate_phone?: boolean;
}



export interface SSOBulkRowItem {
  user_name?: string;
  email?: string;
  user_type?: string;
  phone_number?: string;
  pass_word?: string;
  trang_thai?: string;
  update_quyen?: string;
  new_email?: string;
  new_phone?: string;
  new_user_type?: string;
}

export interface SSOBulkParseResponse {
  success: boolean;
  message: string;
  rows: SSOBulkRowItem[];
  total_rows: number;
}

export type SSOBulkActionType = 'create' | 'update_pass' | 'lock' | 'update_permissions' | 'update_info';

export interface SSOBulkProcessItemRequest {
  action: SSOBulkActionType;
  user_name?: string;
  email?: string;
  user_type?: string;
  phone_number?: string;
  pass_word?: string;
  trang_thai?: string;
  update_quyen?: string;
  new_email?: string;
  new_phone?: string;
  new_user_type?: string;
}

export interface SSOBulkProcessItemResponse {
  success: boolean;
  user_name?: string;
  email?: string;
  action: string;
  message: string;
  detail?: string;
  new_password?: string;
  assigned_clients?: string[];
  is_ldap?: boolean;
}

export interface SSOBulkRowProgress extends SSOBulkRowItem {
  id: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  resultMessage?: string;
  newPassword?: string;
  assignedClients?: string[];
}


export interface SSOQuickProcessItemRequest {
  action: 'change_pass' | 'lock' | 'assign_permissions';
  query: string;
  custom_password?: string;
  clients?: string[];
}

export interface SSOQuickProcessItemResponse {
  success: boolean;
  query: string;
  action: string;
  match_type?: string;
  user_id?: string;
  user_name?: string;
  email?: string;
  phone_number?: string;
  new_password?: string;
  assigned_clients?: string[];
  message: string;
  detail?: string;
  is_ldap?: boolean;
}

export interface SSOBatchExportItem {
  query: string;
  match_type?: string;
  user_name?: string;
  email?: string;
  phone_number?: string;
  new_password?: string;
  assigned_clients?: string;
  status: 'success' | 'error';
  message?: string;
}

export interface SSOQuickRowProgress {
  id: string;
  query: string;
  match_type?: string;
  user_name?: string;
  email?: string;
  phone_number?: string;
  new_password?: string;
  assigned_clients?: string[];
  status: 'idle' | 'processing' | 'success' | 'error';
  message?: string;
  detail?: string;
}
