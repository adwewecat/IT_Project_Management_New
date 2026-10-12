import api from './api';

export interface OvernightDeviceItem {
  id: number;
  scan_date: string;
  scan_time: string;
  restaurant_id?: number;
  sap_code?: string;
  rk7_code?: string;
  restaurant_name?: string;
  ip_gateway?: string;
  subnet?: string;
  email?: string;
  overnight_devices: string;
  device_count: number;
  summary_line?: string;
  raw_details?: Record<string, string>;
  col_restaurant?: string;
  col_devices?: string;
  col_kds?: string;
  col_pos_pc?: string;
  col_email?: string;
  device_items?: string[];
  kds_items?: string[];
  pos_pc_items?: string[];
}

export interface OvernightDevicesResponse {
  success: boolean;
  date: string;
  total_restaurants: number;
  total_devices: number;
  items: OvernightDeviceItem[];
  formatted_report: string;
  excel_table_tsv?: string;
}

export const overnightDevicesService = {
  getDevices: async (date?: string, search?: string): Promise<OvernightDevicesResponse> => {
    const res = await api.get<OvernightDevicesResponse>('/overnight-devices', {
      params: { date, search }
    });
    return res.data;
  },

  getScanDates: async (): Promise<string[]> => {
    const res = await api.get<string[]>('/overnight-devices/dates');
    return res.data;
  },

  triggerScanNow: async (): Promise<any> => {
    const res = await api.post('/overnight-devices/scan');
    return res.data;
  },

  sendEmail: async (scanDate?: string, recipients?: string[]): Promise<any> => {
    const res = await api.post('/overnight-devices/send-email', {
      scan_date: scanDate,
      recipients: recipients
    });
    return res.data;
  }
};