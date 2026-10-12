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

