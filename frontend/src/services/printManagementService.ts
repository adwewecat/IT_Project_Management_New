import api from './api';

export interface PrinterItem {
  PrinterName: string;
  QueueStatus: string;
  JobsInQueue: number;
  ServerName?: string;
  DriverName?: string;
  PortName?: string;
  IsDefault?: boolean;
  Shared?: boolean;
}

export interface PrintStationInfo {
  endpoint_id: number;
  restaurant_code: string;
  restaurant_name: string;
  ip_lan: string;
  machine_name?: string;
  is_online: boolean;
  is_installed: boolean;
  service_status: string;
  printers_updated_at?: string;
  printers: PrinterItem[];
  total_printers: number;
  jammed_printers_count: number;
}

export interface PrintManagementResponse {
  restaurant_code: string;
  restaurant_name?: string;
  stations: PrintStationInfo[];
  selected_station?: PrintStationInfo;
  message?: string;
}

export const printManagementService = {
  /**
   * Lấy danh sách máy in & hàng đợi in của nhà hàng (các máy trạm đã cài Agent)
   */
  async getPrintManagement(restaurantCode: string, ipLan?: string): Promise<PrintManagementResponse> {
    const params: Record<string, string> = { restaurant_code: restaurantCode };
    if (ipLan) {
      params.ip_lan = ipLan;
    }
    const response = await api.get<PrintManagementResponse>('/agent-multitask/print-management', { params });
    return response.data;
  },

  /**
   * Gửi lệnh yêu cầu máy trạm quét và gửi lại thông tin máy in thời gian thực (realtime)
   */
  async refreshStationPrinters(restaurantCode: string, ipLan: string): Promise<{ status: string; message: string; immediate?: boolean; task_id?: number }> {
    const response = await api.post('/agent-multitask/print-management/refresh', {
      restaurant_code: restaurantCode,
      ip_lan: ipLan,
    });
    return response.data;
  },

  /**
   * Khởi động lại Spooler và xóa sạch các lệnh in bị kẹt trong hàng đợi máy trạm
   */
  async clearStationPrintSpooler(restaurantCode: string, ipLan: string): Promise<{ status: string; message: string; immediate?: boolean; task_id?: number }> {
    const response = await api.post('/agent-multitask/print-management/clear-spooler', {
      restaurant_code: restaurantCode,
      ip_lan: ipLan,
    });
    return response.data;
  },

  /**
   * Theo dõi trạng thái hoàn tất của tác vụ quét / dọn spooler
   */
  async getTaskStatus(taskId: number): Promise<any> {
    const response = await api.get(`/agent-multitask/task-status/${taskId}`);
    return response.data;
  }
};
