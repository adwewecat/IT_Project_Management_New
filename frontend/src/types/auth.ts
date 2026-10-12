export interface UserInfo {
  id: number;
  username: string;
  full_name?: string | null;
  email?: string | null;
  manv?: string | null;
  phanquyen?: string | null;
  roles?: string[];
  role_name?: string | null;
  quyen_mo_rong?: string | null;
  is_super_admin?: boolean;
  permissions: Record<string, boolean>;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

export interface LoginCredentials {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface AuthContextType {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password?: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}
