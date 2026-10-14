import apiClient from './api';

export interface MailMemoStatusResponse {
  email_account: string;
  folder_name: string;
  scan_keyword: string;
  desktop_connected: boolean;
  agent_online?: boolean;
  agent_info?: any;
  last_scan_at: string | null;
  total_imported: number;
  recent_items: Array<{
    memo_id: number;
    memo_code: string;
    total_sub?: number;
    ten_memo: string;
    nguoi_yeu_cau: string;
    it_setup: string;
    imported_at: string;
    received_time: string;
    link_salesforce?: string;
  }>;
  total_history: number;
}

export interface MailMemoScanResponse {
  success: boolean;
  message: string;
  total_found: number;
  total_imported: number;
  total_skipped: number;
  new_items: Array<any>;
  skipped_items: Array<any>;
  source?: 'local_agent' | 'server';
}

export interface LocalAgentStatus {
  online: boolean;
  connected?: boolean;
  account?: string;
  folder?: string;
  message?: string;
}

export const mailMemoService = {
  async getStatus(): Promise<MailMemoStatusResponse> {
    const res = await apiClient.get<MailMemoStatusResponse>('/mail-memo/status');
    return res.data;
  },

  async triggerScan(maxItems: number = 400): Promise<MailMemoScanResponse> {
    const res = await apiClient.post<MailMemoScanResponse>('/mail-memo/scan', null, {
      params: { max_items: maxItems },
      timeout: 120000,
    });
    return { ...res.data, source: 'server' };
  },

  async importFromAgent(items: any[]): Promise<MailMemoScanResponse> {
    const res = await apiClient.post<MailMemoScanResponse>('/mail-memo/import-from-agent', {
      items,
    });
    return { ...res.data, source: 'local_agent' };
  },

  activeAgentUrl: 'http://127.0.0.1:18890',

  /**
   * Kiểm tra xem Local Outlook Agent trên máy tính cá nhân (hỗ trợ cả 127.0.0.1, localhost và cổng 18890, 18899) có đang bật không.
   */
  async checkLocalAgent(): Promise<LocalAgentStatus> {
    const candidateHosts = ['127.0.0.1', 'localhost'];
    const candidatePorts = [18890, 18899];
    for (const host of candidateHosts) {
      for (const port of candidatePorts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const res = await fetch(`http://${host}:${port}/status`, {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            this.activeAgentUrl = `http://${host}:${port}`;
            return {
              online: true,
              connected: Boolean(data.connected),
              account: data.account,
              folder: data.folder,
            };
          }
        } catch {
          // Thử tiếp host hoặc cổng kế tiếp
        }
      }
    }
    return { online: false };
  },

  /**
   * Quét thông minh:
   * 1. Ưu tiên gọi qua Server Relay (Server ra lệnh cho Agent đang Online quét và trả kết quả về Web).
   * 2. Hoàn toàn không bị Chrome chặn Private Network Access hay CORS loopback.
   * 3. Fallback thử gọi trực tiếp Local Agent nếu người dùng chạy trên localhost.
   */
  async smartScan(maxItems: number = 400): Promise<MailMemoScanResponse> {
    try {
      return await this.triggerScan(maxItems);
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message;
      // Nếu Server báo lỗi (chưa có agent hoặc lỗi kết nối), thử gọi trực tiếp local agent
      try {
        const agentStatus = await this.checkLocalAgent();
        if (agentStatus.online) {
          const scanRes = await fetch(`${this.activeAgentUrl}/scan?max_items=${maxItems}`, {
            method: 'GET',
          });
          if (scanRes.ok) {
            const scanData = await scanRes.json();
            if (scanData.success) {
              const serverRes = await this.importFromAgent(scanData.items || []);
              return {
                ...serverRes,
                source: 'local_agent',
                message: `[Local Agent] Đã đọc ${scanData.total_found} email từ Outlook máy bạn. ${serverRes.message}`,
              };
            }
          }
        }
      } catch {
        // Bỏ qua lỗi local fallback
      }
      throw new Error(detail || 'Không thể quét Outlook: Vui lòng kiểm tra file Chay_Outlook_Agent.bat trên máy tính cá nhân của bạn!');
    }
  },

  /**
   * Tải gói ZIP trọn bộ Agent cài đặt cho máy cá nhân (kèm file cài schedule tự động)
   */
  async downloadAgentPackage(): Promise<void> {
    const res = await apiClient.get('/mail-memo/download-agent', {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Outlook_Memo_Agent_Full.zip');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

