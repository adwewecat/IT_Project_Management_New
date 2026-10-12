export interface UserItem {
  id: number;
  username: string;
  full_name?: string | null;
  email?: string | null;
  manv?: string | null;
  phanquyen?: string | null;
  roles?: string[];
  role_name?: string | null;
  quyen_mo_rong?: string | null;
  role_level_name?: string | null;
  active: boolean;
  ngay_insert?: string | null;
  ngay_update?: string | null;
  note?: string | null;
}

export interface UserCreatePayload {
  username: string;
  password: string;
  full_name: string;
  email?: string;
  manv?: string;
  phanquyen?: string;
  roles?: string[];
  quyen_mo_rong?: string;
  active: boolean;
}

export interface UserUpdatePayload {
  full_name: string;
  email?: string;
  manv?: string;
  phanquyen?: string;
  roles?: string[];
  quyen_mo_rong?: string;
  active: boolean;
}

export interface UserListResponse {
  items: UserItem[];
  total: number;
}
