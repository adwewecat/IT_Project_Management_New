import apiClient, { API_BASE_URL } from './api';
import {
  HotlineStatus,
  HotlineMissedCallsResponse,
  HotlineAnsweredCallsResponse,
  HotlineCallData,
  HotlinePermissionsConfig,
  HotlinePermissionsResponse,
  HotlineUserPermissionCheck,
  LichTrucMonthResponse,
  LichTrucUploadPayload,
} from '../types/hotline';

export const hotlineService = {
  // Lấy trạng thái phân hệ trực hotline
  getStatus: async (username?: string): Promise<HotlineStatus> => {
    const res = await apiClient.get<HotlineStatus>('/hotline/status', {
      params: username ? { username } : {},
    });
    return res.data;
  },

  // Bật/tắt chế độ trực hotline
  toggleDuty: async (active: boolean, dutyUser?: string): Promise<{ success: boolean; is_active: boolean; status: HotlineStatus }> => {
    const res = await apiClient.post('/hotline/toggle-duty', {
      active,
      duty_user: dutyUser,
    });
    return res.data;
  },

  // Kết thúc cuộc gọi hiện tại
  endCurrentCall: async (callId?: number): Promise<{ success: boolean }> => {
    const res = await apiClient.post('/hotline/end-call', null, {
      params: { call_id: callId },
    });
    return res.data;
  },

  // Lấy danh sách cuộc gọi nhỡ / bận (Tab 1)
  getMissedCalls: async (unresolvedOnly = true, limit = 50, username?: string, allAgents = false): Promise<HotlineMissedCallsResponse> => {
    const res = await apiClient.get<HotlineMissedCallsResponse>('/hotline/missed-calls', {
      params: {
        unresolved_only: unresolvedOnly,
        limit,
        ...(username ? { username } : {}),
        ...(allAgents ? { all_agents: true } : {}),
      },
    });
    return res.data;
  },

  // Lấy danh sách lịch sử các cuộc gọi tới đã nghe (Tab 2)
  getAnsweredCalls: async (limit = 100, username?: string, allAgents = false): Promise<HotlineAnsweredCallsResponse> => {
    const res = await apiClient.get<HotlineAnsweredCallsResponse>('/hotline/answered-calls', {
      params: {
        limit,
        ...(username ? { username } : {}),
        ...(allAgents ? { all_agents: true } : {}),
      },
    });
    return res.data;
  },

  // Đánh dấu 1 cuộc gọi là đã nghe (khi mở kết nối VNC/KDS hoặc xác nhận nghe máy)
  markCallAnswered: async (callId: number, dutyUser?: string): Promise<{ success: boolean; call_id: number }> => {
    const res = await apiClient.post(`/hotline/answered-calls/${callId}/mark`, null, {
      params: dutyUser ? { duty_user: dutyUser } : {},
    });
    return res.data;
  },

  // Đánh dấu 1 cuộc gọi nhỡ là Done
  resolveMissedCall: async (callId: number): Promise<{ success: boolean; call_id: number }> => {
    const res = await apiClient.post(`/hotline/missed-calls/${callId}/resolve`);
    return res.data;
  },

  // Đóng hàng loạt tất cả cuộc gọi nhỡ (Check All)
  resolveAllMissedCalls: async (): Promise<{ success: boolean; resolved_count: number }> => {
    const res = await apiClient.post('/hotline/missed-calls/resolve-all');
    return res.data;
  },

  // Giả lập cuộc gọi đến (Test simulation)
  simulateCall: async (ext: string, callerRawText?: string, dutyUser?: string, isBusy = false, isMissed = false): Promise<{ success: boolean; simulated_call: HotlineCallData }> => {
    const res = await apiClient.post('/hotline/simulate-call', {
      ext,
      caller_raw_text: callerRawText,
      duty_user: dutyUser,
      is_busy: isBusy,
      is_missed: isMissed,
    });
    return res.data;
  },

  // ══════════════════════════════════════════════════════════════
  // CÁC HÀM PHÂN QUYỀN TRỰC HOTLINE
  // ══════════════════════════════════════════════════════════════
  getPermissions: async (): Promise<HotlinePermissionsResponse> => {
    const res = await apiClient.get<HotlinePermissionsResponse>('/hotline/permissions');
    return res.data;
  },

  savePermissions: async (payload: HotlinePermissionsConfig): Promise<{ success: boolean; config: HotlinePermissionsConfig }> => {
    const res = await apiClient.post('/hotline/permissions', payload);
    return res.data;
  },

  checkUserPermission: async (username?: string, roles?: string, isSuperAdmin = false): Promise<HotlineUserPermissionCheck> => {
    const res = await apiClient.get<HotlineUserPermissionCheck>('/hotline/check-permission', {
      params: { username, roles, is_super_admin: isSuperAdmin },
    });
    return res.data;
  },


  // Kết nối luồng Server-Sent Events (SSE) nhận cuộc gọi thời gian thực
  connectEvents: (
    onIncomingCall: (callData: HotlineCallData) => void,
    onMissedCall?: (callData: HotlineCallData) => void,
    onCallEnded?: (data: any) => void,
    onMissedCallResolved?: (data: any) => void
  ): (() => void) => {
    const eventsUrl = `${API_BASE_URL}/hotline/events`;
    const eventSource = new EventSource(eventsUrl);

    eventSource.addEventListener('incoming_call', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.data) {
          onIncomingCall(parsed.data);
        }
      } catch (err) {
        console.error('Lỗi parse event incoming_call:', err);
      }
    });

    eventSource.addEventListener('missed_call', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.data && onMissedCall) {
          onMissedCall(parsed.data);
        }
      } catch (err) {
        console.error('Lỗi parse event missed_call:', err);
      }
    });

    eventSource.addEventListener('call_ended', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (onCallEnded) {
          onCallEnded(parsed.data);
        }
      } catch (err) {
        console.error('Lỗi parse event call_ended:', err);
      }
    });

    eventSource.addEventListener('missed_call_resolved', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (onMissedCallResolved) {
          onMissedCallResolved(parsed.data);
        }
      } catch (err) {
        console.error('Lỗi parse event missed_call_resolved:', err);
      }
    });

    eventSource.addEventListener('call_answered', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (onCallEnded) {
          onCallEnded(parsed.data);
        }
      } catch (err) {
        console.error('Lỗi parse event call_answered:', err);
      }
    });

    eventSource.addEventListener('unlisted_call', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        if (parsed.data) {
          onIncomingCall(parsed.data);
        }
      } catch (err) {
        console.error('Lỗi parse event unlisted_call:', err);
      }
    });

    eventSource.addEventListener('all_missed_calls_resolved', () => {
      if (onMissedCallResolved) {
        onMissedCallResolved({ all: true });
      }
    });

    eventSource.onerror = (err) => {
      console.warn('Hotline SSE connection error (tự động thử lại):', err);
    };

    return () => {
      eventSource.close();
    };
  },

  // ══════════════════════════════════════════════════════════════
  // CÁC HÀM LỊCH TRỰC HOTLINE (Dành cho HotlineSchedulePage)
  // ══════════════════════════════════════════════════════════════
  getSchedule: async (month?: string): Promise<LichTrucMonthResponse> => {
    const res = await apiClient.get<LichTrucMonthResponse>('/hotline/schedule', {
      params: { month },
    });
    return res.data;
  },

  uploadImage: async (payload: LichTrucUploadPayload): Promise<LichTrucMonthResponse> => {
    const res = await apiClient.post<LichTrucMonthResponse>('/hotline/upload-image', payload);
    return res.data;
  },

  deleteSchedule: async (thang: string, team: string): Promise<any> => {
    const res = await apiClient.delete(`/hotline/schedule/${thang}/${team}`);
    return res.data;
  },

  // Link tải file 3CX Hotline Client Agent (.zip) cho máy tính cá nhân
  getDownloadAgentUrl: (): string => {
    return `${API_BASE_URL}/hotline/download-agent`;
  },

  // Link tải Google Chrome Extension (.zip)
  getDownloadExtensionUrl: (): string => {
    return `${API_BASE_URL}/hotline/download-extension`;
  },

  // Link tải Tampermonkey Userscript (.js)
  getDownloadUserscriptUrl: (): string => {
    return `${API_BASE_URL}/hotline/download-userscript`;
  },

  getAgentConfig: async (): Promise<{ server_url: string; is_custom: boolean }> => {
    const res = await apiClient.get<{ server_url: string; is_custom: boolean }>('/hotline/agent-config');
    return res.data;
  },

  updateAgentConfig: async (serverUrl: string): Promise<{ success: boolean; server_url: string }> => {
    const res = await apiClient.post<{ success: boolean; server_url: string }>('/hotline/agent-config', { server_url: serverUrl });
    return res.data;
  },
};
