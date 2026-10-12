export interface SapCheckItem {
  sap_code: string;
  ten_mon: string | null;
  rk7_ident: number | null;
  rk7_code: number | null;
  don_vi_tinh: string | null;
  nhom_menu: string | null;
  status_code: string | null;
  item_type: string | null;
}

export interface SapCheckResponse {
  items: SapCheckItem[];
  total_input: number;
  found_count: number;
  missing_count: number;
  missing_codes: string[];
}

export interface SelectorCheckItem {
  sap_code: string | null;
  brand: string | null;
  nhom_pos: string | null;
  item_ident: number | null;
  rk7_code: number | null;
  ten_mon: string | null;
  don_vi: string | null;
  ten_don_gia: string | null;
  gia: number | null;
}

export interface SelectorCheckResponse {
  items: SelectorCheckItem[];
  total_input: number;
  found_count: number;
  missing_count: number;
  missing_codes: string[];
}

export interface BrandItem {
  guid: string;
  name: string;
  display_name: string;
  total_items: number;
}

export interface BrandMenuResponse {
  brand_guid: string;
  brand_name: string;
  total_items: number;
  items: SelectorCheckItem[];
}
