export interface RamLimitAuditItem {
  id?: number;
  scan_date: string;
  restaurant_id: number;
  sap_code?: string;
  restaurant_name: string;
  subnet: string;
  ip_gateway?: string;

  // SQL (.41)
  sql_ip: string;
  sql_connected: boolean;
  sql_max_memory_mb?: number | null;
  sql_is_limited_2gb: boolean;
  sql_is_limited_4gb?: boolean;
  sql_fixed?: boolean;
  sql_status: string;

  // Mongo (.41, .11, .12)
  mongo_ip?: string | null;
  mongo_port_open?: boolean;
  mongo_connected: boolean;
  mongo_cache_size_gb?: number | null;
  mongo_is_limited_6gb: boolean;
  mongo_fixed?: boolean;
  mongo_status: string;

  // Summary
  summary_note?: string;
  created_at?: string;
  is_excluded?: boolean;
  has_custom_ram?: boolean;
  custom_sql_gb?: number | null;
  custom_mongo_gb?: number | null;
  target_sql_gb?: number;
  target_mongo_gb?: number;
}

export interface RamCustomConfigItem {
  restaurant_id: number;
  sap_code?: string;
  restaurant_name?: string;
  sql_limit_gb: number;
  mongo_limit_gb: number;
  updated_at: string;
}

export interface RamLimitRemoveBatchRequest {
  scope: 'unlimited_only' | 'all_active' | 'custom' | 'custom_only';
  restaurant_ids?: number[];
  recipients?: string[];
  send_email?: boolean;
}

export interface RamLimitTargetConfig {
  sql_limit_gb: number;
  mongo_limit_gb: number;
  sql_port?: number;
  sql_user?: string;
  sql_password?: string;
  mongo_port?: number;
  updated_at?: string;
}

export interface RamLimitAuditResponse {
  scan_date?: string;
  total: number;
  items: RamLimitAuditItem[];
  target_sql_gb?: number;
  target_mongo_gb?: number;
}

export interface RamLimitScanNowResponse {
  scan_date: string;
  scan_time: string;
  total_scanned: number;
  target_sql_gb?: number;
  target_mongo_gb?: number;
  sql_limited: number;
  sql_unlimited: number;
  sql_offline: number;
  mongo_limited: number;
  mongo_unlimited: number;
  mongo_closed_port: number;
  items: RamLimitAuditItem[];
  message: string;
}

export interface RamLimitBatchApplyRequest {
  scope: 'unlimited_only' | 'all_active' | 'custom';
  restaurant_ids?: number[];
  recipients?: string[];
  send_email?: boolean;
  skip_tch?: boolean;
  exclude_keywords?: string[];
  target_sql_gb?: number;
  target_mongo_gb?: number;
}

export interface RamLimitExcludeConfigResponse {
  skip_tch: boolean;
  exclude_keywords: string[];
}

export interface RamLimitBatchApplyResponse {
  scan_date: string;
  scan_time: string;
  total_processed: number;
  target_sql_gb?: number;
  target_mongo_gb?: number;
  sql_fixed: number;
  sql_already_ok: number;
  mongo_fixed: number;
  mongo_already_ok: number;
  email_sent: boolean;
  email_error?: string | null;
  recipients: string[];
  message: string;
  items: RamLimitAuditItem[];
}

export interface RamLimitEmailConfigResponse {
  recipients: string[];
  message?: string;
}

export interface RamLimitSendEmailResponse {
  status: string;
  recipients: string[];
  message: string;
}
