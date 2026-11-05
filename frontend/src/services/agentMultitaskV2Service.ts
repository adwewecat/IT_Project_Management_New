import api from './api';

export interface SftpServerConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  remote_path: string;
  fallback_path: string;
}

export interface SftpFileItem {
  filename: string;
  size_bytes: number;
  size_formatted: string;
  modified_time: string;
  is_dir: boolean;
  file_ext: string;
  file_type: 'script' | 'executable' | 'archive' | 'document' | 'image' | 'other';
}

export interface SftpListFilesResponse {
  success: boolean;
  message: string;
  active_path: string;
  host: string;
  port: number;
  files: SftpFileItem[];
  total_files: number;
  total_size_bytes: number;
}

export interface CheckRestaurantConnectionResponse {
  target_ip: string;
  is_online: boolean;
  ping_ok: boolean;
  sql_ok: boolean;
  sql_server_name?: string;
  xp_cmdshell_ready: boolean;
  message: string;
  latency_ms: number;
}

export interface RestaurantFolderFileItem {
  filename: string;
  size_bytes: number;
  size_formatted: string;
  modified_time: string;
  is_dir: boolean;
  file_ext: string;
  file_type: string;
}

export interface RestaurantFolderListResponse {
  success: boolean;
  message: string;
  target_ip: string;
  target_folder: string;
  folder_exists: boolean;
  files: RestaurantFolderFileItem[];
  total_files: number;
}

export interface PushFileToRestaurantRequest {
  target_ip: string;
  target_folder: string;
  filename: string;
  remote_sftp_path?: string;
  overwrite?: boolean;
  auto_extract?: boolean;
  execute_after_push?: boolean;
  run_mode?: 'SILENT' | 'INTERACTIVE';
}

export interface PushFileToRestaurantResponse {
  success: boolean;
  message: string;
  target_ip: string;
  target_folder: string;
  filename: string;
  size_bytes: number;
  elapsed_ms: number;
  execution_output?: string;
}

export interface ExecuteRemoteActionRequest {
  target_ip: string;
  target_folder: string;
  filename: string;
  action_type: 'RUN_SCRIPT' | 'LAUNCH_APP' | 'EXTRACT_ARCHIVE' | 'OPEN_DOCUMENT' | 'DELETE_FILE' | 'READ_TEXT';
  run_mode?: 'SILENT' | 'INTERACTIVE';
  arguments?: string;
  destination_folder?: string;
}

export interface ExecuteRemoteActionResponse {
  success: boolean;
  message: string;
  action_type: string;
  target_ip: string;
  target_file: string;
  output: string;
  exit_code: number;
  elapsed_ms: number;
}

class AgentMultitaskV2Service {
  /** Lấy cấu hình SFTP Server trung tâm */
  async getSftpConfig(): Promise<SftpServerConfig> {
    const res = await api.get<SftpServerConfig>('/agent-multitask-v2/sftp/config');
    return res.data;
  }

  /** Quét danh sách file trong thư mục SFTP Server */
  async listSftpFiles(params?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    remote_path?: string;
  }): Promise<SftpListFilesResponse> {
    const res = await api.post<SftpListFilesResponse>('/agent-multitask-v2/sftp/list-files', params || {});
    return res.data;
  }

  /** Tải file từ máy tính lên thư mục SFTP Server */
  async uploadFileToSftp(file: File, targetPath?: string): Promise<{ success: boolean; message: string; filename: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);
    if (targetPath) {
      formData.append('target_path', targetPath);
    }
    const res = await api.post('/agent-multitask-v2/sftp/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  }

  /** Kiểm tra tín hiệu kết nối máy trạm nhà hàng */
  async checkRestaurantConnection(targetIp: string, sqlPort: number = 1433): Promise<CheckRestaurantConnectionResponse> {
    const res = await api.post<CheckRestaurantConnectionResponse>('/agent-multitask-v2/restaurant/check-connection', {
      target_ip: targetIp,
      sql_port: sqlPort
    });
    return res.data;
  }

  /** Quét danh sách file trong thư mục máy trạm nhà hàng */
  async listRestaurantFolder(targetIp: string, targetFolder: string = 'D:\\Support', sqlPort: number = 1433): Promise<RestaurantFolderListResponse> {
    const res = await api.post<RestaurantFolderListResponse>('/agent-multitask-v2/restaurant/list-folder', {
      target_ip: targetIp,
      target_folder: targetFolder,
      sql_port: sqlPort
    });
    return res.data;
  }

  /** Truyền 1 file từ SFTP Server xuống thư mục máy trạm nhà hàng */
  async pushFileToRestaurant(payload: PushFileToRestaurantRequest): Promise<PushFileToRestaurantResponse> {
    const res = await api.post<PushFileToRestaurantResponse>('/agent-multitask-v2/restaurant/push-file', payload);
    return res.data;
  }

  /** Thực thi thao tác từ xa trên máy trạm nhà hàng */
  async executeRemoteAction(payload: ExecuteRemoteActionRequest): Promise<ExecuteRemoteActionResponse> {
    const res = await api.post<ExecuteRemoteActionResponse>('/agent-multitask-v2/restaurant/execute-action', payload);
    return res.data;
  }
}

export const agentMultitaskV2Service = new AgentMultitaskV2Service();
export default agentMultitaskV2Service;

