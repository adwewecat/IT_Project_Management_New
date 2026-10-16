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
  device_type?: string; // RESTAURANT, EXTERNAL, USER
  user_assigned?: string;
  notes?: string;
  last_heartbeat?: string;
  last_action?: string;
  last_error?: string;
  updated_at?: string;
}

export interface AgentEndpointCreateRequest {
  restaurant_code: string;
  restaurant_name: string;
  ip_lan: string;
  machine_name?: string;
  device_type?: string; // RESTAURANT, EXTERNAL, USER
  user_assigned?: string;
  notes?: string;
}

export interface AgentEndpointUpdateRequest {
  restaurant_code?: string;
  restaurant_name?: string;
  ip_lan?: string;
  machine_name?: string;
  device_type?: string; // RESTAURANT, EXTERNAL, USER
  user_assigned?: string;
  notes?: string;
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

export interface DeployStepItem {
  step_number?: number;
  step_name?: string;
  step_type: 'MODIFY_FILE' | 'RUN_SCRIPT' | 'RUN_COMMAND' | 'DELETE_FILE' | string;
  file_path?: string;
  relative_path?: string;
  // Cho Modify file
  modify_mode?: 'JSON_KEY_VALUE' | 'TEXT_REPLACE' | 'TEXT_OVERWRITE' | 'TEXT_APPEND' | string;
  json_modifications?: Record<string, any>;
  text_replacements?: Array<{ search: string; replace: string }>;
  search_text?: string;
  replace_text?: string;
  content?: string;
  // Cho Run script
  arguments?: string;
  run_as_admin?: boolean;
  wait_for_completion?: boolean;
}

export interface AgentCommandRequest {
  action: 'start_service' | 'stop_service' | 'restart_service' | 'push_file' | 'run_process' | 'kill_process' | 'install_agent' | 'run_relative_script' | 'deploy_package';
  restaurant_codes: string[];
  target_ip?: string;
  target_ips?: string[];
  service_name?: string;
  target_folder?: string;
  file_name?: string;
  file_content_base64?: string;
  process_path?: string;
  arguments?: string;
  run_as_admin?: boolean;
  folder_hint?: string;
  working_directory?: string;
  run_mode?: 'interactive' | 'hidden';
  run_hidden?: boolean;
  install_script_steps?: any[];
  auto_extract?: boolean;
  download_url?: string;
  steps?: DeployStepItem[];
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

  createEndpoint: async (payload: AgentEndpointCreateRequest): Promise<AgentEndpointItem> => {
    const res = await api.post('/agent-multitask/endpoint', payload);
    return res.data;
  },

  updateEndpoint: async (id: number, payload: AgentEndpointUpdateRequest): Promise<AgentEndpointItem> => {
    const res = await api.put(`/agent-multitask/endpoint/${id}`, payload);
    return res.data;
  },

  deleteEndpoint: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await api.delete(`/agent-multitask/endpoint/${id}`);
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
  },

  // ── QUẢN LÝ MẪU KỊCH BẢN SCRIPT / BATCH ──
  getScriptTemplates: async (): Promise<AgentScriptTemplateItem[]> => {
    const res = await api.get('/agent-multitask/script-templates');
    return res.data;
  },

  createScriptTemplate: async (payload: AgentScriptTemplateCreate): Promise<AgentScriptTemplateItem> => {
    const res = await api.post('/agent-multitask/script-templates', payload);
    return res.data;
  },

  updateScriptTemplate: async (id: number, payload: AgentScriptTemplateUpdate): Promise<AgentScriptTemplateItem> => {
    const res = await api.put(`/agent-multitask/script-templates/${id}`, payload);
    return res.data;
  },

  deleteScriptTemplate: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await api.delete(`/agent-multitask/script-templates/${id}`);
    return res.data;
  }
};

export interface AgentScriptTemplateItem {
  id: number;
  template_name: string;
  folder_hint: string;
  file_name: string;
  arguments?: string;
  run_as_admin: boolean;
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AgentScriptTemplateCreate {
  template_name: string;
  folder_hint: string;
  file_name: string;
  arguments?: string;
  run_as_admin?: boolean;
  description?: string;
}

export interface AgentScriptTemplateUpdate {
  template_name?: string;
  folder_hint?: string;
  file_name?: string;
  arguments?: string;
  run_as_admin?: boolean;
  description?: string;
}

