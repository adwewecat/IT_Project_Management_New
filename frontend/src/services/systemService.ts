import apiClient from './api';
import {
  DBConfigData,
  DBTestConnectionPayload,
  DBTestConnectionResult,
  DBConfigUpdatePayload,
  DBConfigUpdateResult
} from '../types/system';

export const systemService = {
  async getDbConfig(): Promise<DBConfigData> {
    const response = await apiClient.get<DBConfigData>('/system/db-config');
    return response.data;
  },

  async testDbConnection(payload: DBTestConnectionPayload): Promise<DBTestConnectionResult> {
    const response = await apiClient.post<DBTestConnectionResult>('/system/test-db-connection', payload);
    return response.data;
  },

  async updateDbConfig(payload: DBConfigUpdatePayload): Promise<DBConfigUpdateResult> {
    const response = await apiClient.put<DBConfigUpdateResult>('/system/db-config', payload);
    return response.data;
  },
};
