import apiClient from './api';

export interface CandidateResult {
  ip: string;
  mongo_open: boolean;
  mosquitto_open: boolean;
}

export interface MongoMosquittoItem {
  restaurant_id: number;
  sap_code: string;
  restaurant_name: string;
  brand_name?: string;
  subnet: string;
  representative_ip: string;
  candidate_results: CandidateResult[];
  mongo_ok: boolean;
  mongo_status: string;
  mosquitto_ok: boolean;
  mosquitto_status: string;
  is_ok: boolean;
  status_label: string;
  note: string;
}

export interface MongoMosquittoSummary {
  scan_date: string;
  scan_time: string;
  duration_seconds: number;
  total_restaurants_active: number;
  total_excluded: number;
  total_scanned: number;
  total_ok: number;
  total_error: number;
  items: MongoMosquittoItem[];
  error_items: MongoMosquittoItem[];
  email_sent: boolean;
  email_status: string;
  message: string;
}

export interface MongoMosquittoConfig {
  email_recipients?: string;
  has_email_notification?: boolean;
  mongo_port?: number;
  mosquitto_port?: number;
  socket_timeout?: number;
}

export const mongoMosquittoService = {
  async getResults(): Promise<MongoMosquittoSummary> {
    const res = await apiClient.get<MongoMosquittoSummary>('/mongo-mosquitto/results');
    return res.data;
  },

  async triggerScan(): Promise<MongoMosquittoSummary> {
    const res = await apiClient.post<MongoMosquittoSummary>('/mongo-mosquitto/scan', null, {
      timeout: 120000, // 2 phút cho quét 300+ nhà hàng
    });
    return res.data;
  },

  async triggerScanErrors(): Promise<MongoMosquittoSummary> {
    const res = await apiClient.post<MongoMosquittoSummary>('/mongo-mosquitto/scan-errors', null, {
      timeout: 60000, // 1 phút cho quét các nhà hàng bị lỗi
    });
    return res.data;
  },

  async triggerScanSingle(sapCode: string): Promise<{ summary: MongoMosquittoSummary; item: MongoMosquittoItem; message: string }> {
    const res = await apiClient.post<{ summary: MongoMosquittoSummary; item: MongoMosquittoItem; message: string }>(
      `/mongo-mosquitto/scan-single/${encodeURIComponent(sapCode)}`,
      null,
      { timeout: 15000 }
    );
    return res.data;
  },

  async getConfig(): Promise<MongoMosquittoConfig> {
    const res = await apiClient.get<MongoMosquittoConfig>('/mongo-mosquitto/config');
    return res.data;
  },

  async updateConfig(payload: MongoMosquittoConfig): Promise<{ status: string; message: string; config: MongoMosquittoConfig }> {
    const res = await apiClient.post<{ status: string; message: string; config: MongoMosquittoConfig }>('/mongo-mosquitto/config', payload);
    return res.data;
  },
};
