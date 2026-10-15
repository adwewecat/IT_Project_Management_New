import api from './api';

export interface AgentConfigResponse {
  id: number;
  service_name: string;
  default_admin_user?: string;
  default_admin_pass?: string;
  allowed_users?: string;
  auto_restart_on_failure: boolean;
  startup_type: string;
  heartbeat_interval_sec: number;
  nguoi_cap_nhat?: string;
  ngay_cap_nhat?: string;
}

export interface AgentConfigUpdateRequest {
  service_name?: string;
  default_admin_user?: string;
  default_admin_pass?: string;
  allowed_users?: string;
  auto_restart_on_failure?: boolean;
  startup_type?: string;
  heartbeat_interval_sec?: number;
}

export interface AgentEndpointItem {
  id?: number;
  restaurant_id?: number;
  restaurant_code: string;
  restaurant_name: string;
  ip_lan: string;
  machine_name?: string;
  service_name: string;
  service_status: string; // RUNNING, STOPPED, NOT_INSTALLED, UNKNOWN
  is_installed: boolean;
  is_online: boolean;
  startup_type: string;
  agent_version?: string;
  os_info?: string;
  last_heartbeat?: string;
  last_action?: string;
  last_error?: string;
  updated_at?: string;
}

export interface AgentOverviewResponse {
  total_restaurants: number;
  installed_count: number;
  not_installed_count: number;
  online_count: number;
  offline_count: number;
  service_running_count: number;
  service_stopped_count: number;
  service_name: string;
  can_manage: boolean;
  is_super_admin: boolean;
}

export interface AgentCommandRequest {
  action: 'start_service' | 'stop_service' | 'restart_service' | 'push_file' | 'run_process' | 'kill_process' | 'install_agent';
  restaurant_codes: string[];
  target_ip?: string;
  service_name?: string;
  target_folder?: string;
  file_name?: string;
  file_content_base64?: string;
  process_path?: string;
  arguments?: string;
  run_as_admin?: boolean;
  install_script_steps?: any[];
}

export interface AgentCommandResultItem {
  restaurant_code: string;
  ip: string;
  action: string;
  success: boolean;
  message: string;
  output?: string;
  timestamp: string;
}

export interface AgentCommandResponse {
  success: boolean;
  total_targets: number;
  success_count: number;
  failed_count: number;
  results: AgentCommandResultItem[];
}

export interface AgentLogItem {
  id: number;
  restaurant_code: string;
  machine_ip: string;
  action_type: string;
  command_payload?: string;
  result_status: string;
  result_message?: string;
  created_by: string;
  created_at: string;
}

export const agentMultitaskService = {
  getOverview: async (): Promise<AgentOverviewResponse> => {
    const res = await api.get('/agent-multitask/overview');
    return res.data;
  },

  getEndpoints: async (params?: {
    status_filter?: string;
    installed_filter?: string;
    search?: string;
  }): Promise<AgentEndpointItem[]> => {
    const res = await api.get('/agent-multitask/endpoints', { params });
    return res.data;
  },

  getConfig: async (): Promise<AgentConfigResponse> => {
    const res = await api.get('/agent-multitask/config');
    return res.data;
  },

  updateConfig: async (payload: AgentConfigUpdateRequest): Promise<AgentConfigResponse> => {
    const res = await api.post('/agent-multitask/config', payload);
    return res.data;
  },

  sendCommand: async (payload: AgentCommandRequest): Promise<AgentCommandResponse> => {
    const res = await api.post('/agent-multitask/command', payload);
    return res.data;
  },

  getLogs: async (restaurant_code?: string, limit = 100): Promise<AgentLogItem[]> => {
    const res = await api.get('/agent-multitask/logs', {
      params: { restaurant_code, limit }
    });
    return res.data;
  },

  downloadAgentPackage: async (): Promise<void> => {
    const res = await api.get('/agent-multitask/download-package', {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Restaurant_Support_Agent_Full.zip');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
