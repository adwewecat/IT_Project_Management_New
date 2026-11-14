export type GpmsRefMode = 'export' | 'now';

export type GpmsSlaStatusKey =
  | 'ht_dung_han'
  | 'ht_tre_han'
  | 'chua_ht_chua_tre'
  | 'chua_ht_tre_han'
  | 'da_huy';

export interface GpmsBatchItem {
  id: number;
  report_name: string;
  file_name: string;
  period_label?: string | null;
  export_at?: string | null;
  total_rows: number;
  unique_senders: number;
  unique_receivers: number;
  source_type: string;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface GpmsBatchListResponse {
  items: GpmsBatchItem[];
  available_report_files: string[];
}

export interface GpmsSlaSummary {
  total: number;
  ht_dung_han: number;
  ht_tre_han: number;
  chua_ht_chua_tre: number;
  chua_ht_tre_han: number;
  da_huy: number;
  overdue_ycht: number;
  on_time_ycht: number;
  cancelled: number;
  on_time_rate: number;
  overdue_rate: number;
  completion_rate: number;
}

export interface GpmsSenderStat {
  username: string;
  full_name: string;
  total: number;
  percentage: number;
  ht_dung_han: number;
  ht_tre_han: number;
  chua_ht_chua_tre: number;
  chua_ht_tre_han: number;
  da_huy: number;
}

export interface GpmsReceiverStat {
  username: string;
  full_name: string;
  region: 'NAM' | 'BAC' | string;
  total: number;
  percentage: number;
  overdue_ycht: number;
  on_time_ycht: number;
  cancelled: number;
  ht_dung_han: number;
  ht_tre_han: number;
  chua_ht_chua_tre: number;
  chua_ht_tre_han: number;
  da_huy: number;
  on_time_rate: number;
}

export interface GpmsRegionStat {
  region: 'NAM' | 'BAC' | string;
  label: string;
  total: number;
  percentage: number;
  user_count: number;
  overdue_ycht: number;
  on_time_ycht: number;
  cancelled: number;
  ht_dung_han: number;
  ht_tre_han: number;
  chua_ht_chua_tre: number;
  chua_ht_tre_han: number;
  da_huy: number;
  on_time_rate: number;
  users: GpmsReceiverStat[];
}

export interface GpmsRegionComparison {
  nam: GpmsRegionStat;
  bac: GpmsRegionStat;
}

export interface GpmsCategoryStat {
  name: string;
  total: number;
  percentage: number;
  overdue_ycht: number;
  on_time_ycht: number;
  cancelled: number;
  ht_dung_han: number;
  ht_tre_han: number;
  chua_ht_chua_tre: number;
  chua_ht_tre_han: number;
  da_huy: number;
}

export interface GpmsDmcv2ChildStat {
  name: string;
  total: number;
  percentage: number;
  overdue_ycht: number;
  on_time_ycht: number;
  cancelled: number;
}

export interface GpmsDmcv1Stat extends GpmsCategoryStat {
  top_children: GpmsDmcv2ChildStat[];
}

export interface GpmsDashboardResponse {
  batch: GpmsBatchItem;
  ref_mode: GpmsRefMode;
  ref_datetime_iso: string;
  anonymous_count: number;
  unassigned_dmcv_count: number;
  south_usernames: string[];
  sla_summary: GpmsSlaSummary;
  senders: GpmsSenderStat[];
  receivers: GpmsReceiverStat[];
  regions: GpmsRegionComparison;
  phan_loai_list: GpmsCategoryStat[];
  dmcv1_list: GpmsDmcv1Stat[];
  dmcv2_list: GpmsCategoryStat[];
}

export interface GpmsTicketDetailItem {
  code: string;
  title: string;
  status: string;
  sla_status: GpmsSlaStatusKey | string;
  loai: string;
  phan_loai: string;
  creator: string;
  creator_name: string;
  creator_dept: string;
  assignee: string;
  assignee_name: string;
  region: 'NAM' | 'BAC' | string;
  dmcv1: string;
  dmcv2: string;
  priority: string;
  created_iso: string;
  ycht_iso: string;
  httt_iso: string;
}

export interface GpmsTicketListResponse {
  total: number;
  page: number;
  page_size: number;
  items: GpmsTicketDetailItem[];
}

export interface GpmsSouthUserCandidate {
  username: string;
  full_name: string;
  source: 'GPMS' | 'SYSTEM' | 'CONFIG' | string;
  ticket_count: number;
  is_south: boolean;
}

export interface GpmsRegionConfigResponse {
  south_usernames: string[];
  candidates: GpmsSouthUserCandidate[];
  updated_at?: string | null;
}

export interface GpmsFilterState {
  batchId?: number;
  refMode: GpmsRefMode;
  includeAnonymous: boolean;
  includeUnassignedDmcv: boolean;
  slaStatus?: string;
  sender?: string;
  receiver?: string;
  region?: 'NAM' | 'BAC' | '';
  phanLoai?: string;
  dmcv1?: string;
  dmcv2?: string;
  search?: string;
}
