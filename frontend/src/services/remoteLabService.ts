/**
 * Service API cho phân hệ thử nghiệm: 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab)
 * Độc lập hoàn toàn, dễ dàng gỡ bỏ hoặc tích hợp vào web chính thức khi hoàn thiện.
 */

import api from './api';

export interface RemoteEndpoint {
  id: number;
  restaurant_code: string;
  restaurant_name: string;
  ip_lan: string;
  machine_name?: string;
  service_status?: string;
  is_online: boolean;
  device_type: string;
  last_heartbeat?: string;
}

export interface RemoteSessionInfo {
  session_id: string;
  target_type: 'workstation' | 'kds';
  restaurant_code: string;
  target_ip: string;
  device_name: string;
  created_by: string;
  created_at: string;
  status: string;
  has_agent: boolean;
  has_viewer: boolean;
  screen_width: number;
  screen_height: number;
  fps_limit: number;
  quality: number;
  total_frames: number;
  total_bytes_mb: number;
  last_ping_ms: number;
}

export interface CreateSessionPayload {
  target_type: 'workstation' | 'kds';
  restaurant_code: string;
  target_ip: string;
  device_name?: string;
  fps_limit?: number;
  quality?: number;
  server_url?: string;
}

export const remoteLabService = {
  /** Lấy danh sách máy trạm & thiết bị từ CSDL */
  async getEndpoints(): Promise<RemoteEndpoint[]> {
    const res = await api.get<RemoteEndpoint[]>('/remote-lab/endpoints');
    return res.data;
  },

  /** Tạo một phiên remote mới */
  async createSession(payload: CreateSessionPayload): Promise<{ status: string; message: string; session: RemoteSessionInfo; server_url?: string }> {
    const loc = window.location;
    let serverUrl = payload.server_url;
    if (!serverUrl) {
      if (loc.port && (loc.port === '5173' || loc.port === '3000')) {
        serverUrl = `${loc.protocol}//${loc.hostname}:8000`;
      } else {
        serverUrl = `${loc.protocol}//${loc.host}`;
      }
    }
    const res = await api.post('/remote-lab/sessions/create', { ...payload, server_url: serverUrl });
    return res.data;
  },

  /** Phát lại lệnh kích hoạt Remote Worker tới máy trạm */
  async retryAgent(sessionId: string): Promise<{ status: string; message: string; server_url?: string }> {
    const loc = window.location;
    let serverUrl = '';
    if (loc.port && (loc.port === '5173' || loc.port === '3000')) {
      serverUrl = `${loc.protocol}//${loc.hostname}:8000`;
    } else {
      serverUrl = `${loc.protocol}//${loc.host}`;
    }
    const res = await api.post(`/remote-lab/sessions/${sessionId}/retry-agent`, null, {
      params: { server_url: serverUrl }
    });
    return res.data;
  },

  /** Lấy danh sách các phiên đang mở */
  async listSessions(): Promise<RemoteSessionInfo[]> {
    const res = await api.get<RemoteSessionInfo[]>('/remote-lab/sessions');
    return res.data;
  },

  /** Lấy chi tiết phiên */
  async getSessionDetail(sessionId: string): Promise<RemoteSessionInfo> {
    const res = await api.get<RemoteSessionInfo>(`/remote-lab/sessions/${sessionId}`);
    return res.data;
  },

  /** Kết thúc phiên */
  async terminateSession(sessionId: string, reason?: string): Promise<{ status: string; message: string }> {
    const res = await api.post(`/remote-lab/sessions/${sessionId}/terminate`, null, {
      params: { reason }
    });
    return res.data;
  },

  /** Tự động kích hoạt Remote Worker chạy ngầm trên máy hiện tại (1 Click, không cần gõ lệnh) */
  async launchLocalWorker(sessionId: string): Promise<{ success: boolean; message: string; pid?: number }> {
    const res = await api.post(`/remote-lab/sessions/${sessionId}/launch-local`);
    return res.data;
  },

  /** Tạo URL WebSocket kết nối tới Relay Server */
  getViewerWsUrl(sessionId: string): string {
    const loc = window.location;
    // Nếu chạy vite dev trên port 5173 -> proxy hoặc kết nối tới 8000
    const host = loc.hostname;
    const isHttps = loc.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';

    // Nếu chạy trực tiếp trên dev (port 5173 / 3000), kết nối thẳng tới backend port 8000
    if (loc.port && (loc.port === '5173' || loc.port === '3000')) {
      return `${wsProto}//${host}:8000/api/v1/remote-lab/ws/viewer/${sessionId}`;
    }

    // Nếu chạy production qua IIS / Nginx
    return `${wsProto}//${loc.host}/api/v1/remote-lab/ws/viewer/${sessionId}`;
  }
};
