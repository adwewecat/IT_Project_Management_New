import api from './api';
import {
  RamLimitAuditItem,
  RamLimitAuditResponse,
  RamLimitScanNowResponse,
  RamLimitBatchApplyRequest,
  RamLimitBatchApplyResponse,
  RamLimitEmailConfigResponse,
  RamLimitSendEmailResponse,
  RamLimitExcludeConfigResponse,
  RamLimitTargetConfig,
  RamCustomConfigItem,
  RamLimitRemoveBatchRequest
} from '../types/ramLimit';

export const ramLimitAuditService = {
  getScanDates: async (): Promise<string[]> => {
    const res = await api.get<string[]>('/jobs/ram-limit-audit/dates');
    return res.data;
  },

  getAuditLogs: async (scanDate?: string): Promise<RamLimitAuditResponse> => {
    const res = await api.get<RamLimitAuditResponse>('/jobs/ram-limit-audit', {
      params: { scan_date: scanDate }
    });
    return res.data;
  },

  getTargetConfig: async (): Promise<RamLimitTargetConfig> => {
    const res = await api.get<RamLimitTargetConfig>('/jobs/ram-limit-audit/target-config');
    return res.data;
  },

  saveTargetConfig: async (payload: {
    sql_limit_gb: number;
    mongo_limit_gb: number;
    sql_port?: number;
    sql_user?: string;
    sql_password?: string;
    mongo_port?: number;
  }): Promise<{ config: RamLimitTargetConfig; message: string }> => {
    const res = await api.put<{ config: RamLimitTargetConfig; message: string }>('/jobs/ram-limit-audit/target-config', payload);
    return res.data;
  },

  triggerScanNow: async (payload?: {
    skip_tch?: boolean;
    exclude_keywords?: string[];
    target_sql_gb?: number;
    target_mongo_gb?: number;
  }): Promise<RamLimitScanNowResponse> => {
    const res = await api.post<RamLimitScanNowResponse>('/jobs/ram-limit-audit/scan-now', payload, {
      timeout: 300000 // 5 phút (300 giây) để quét mạng nội bộ toàn bộ nhà hàng
    });
    return res.data;
  },

  getExcludeConfig: async (): Promise<RamLimitExcludeConfigResponse> => {
    const res = await api.get<RamLimitExcludeConfigResponse>('/jobs/ram-limit-audit/exclude-config');
    return res.data;
  },

  saveExcludeConfig: async (payload: { skip_tch: boolean; exclude_keywords: string[] }): Promise<{ config: RamLimitExcludeConfigResponse; message: string }> => {
    const res = await api.put<{ config: RamLimitExcludeConfigResponse; message: string }>('/jobs/ram-limit-audit/exclude-config', payload);
    return res.data;
  },

  batchApplyRamLimits: async (payload: RamLimitBatchApplyRequest): Promise<RamLimitBatchApplyResponse> => {
    const res = await api.post<RamLimitBatchApplyResponse>('/jobs/ram-limit-audit/batch-apply', payload, {
      timeout: 300000 // 5 phút (300 giây) cho xử lý hàng loạt qua mạng
    });
    return res.data;
  },

  scanSingleRestaurant: async (restaurantId: number, targetSqlGb?: number, targetMongoGb?: number): Promise<RamLimitAuditItem> => {
    const res = await api.post<RamLimitAuditItem>(`/jobs/ram-limit-audit/scan-single/${restaurantId}`, null, {
      params: {
        target_sql_gb: targetSqlGb,
        target_mongo_gb: targetMongoGb
      },
      timeout: 30000 // 30 giây cho quét 1 nhà hàng
    });
    return res.data;
  },

  applySingleRamLimit: async (restaurantId: number, targetSqlGb?: number, targetMongoGb?: number, saveAsCustom?: boolean): Promise<RamLimitAuditItem> => {
    const res = await api.post<RamLimitAuditItem>(`/jobs/ram-limit-audit/apply-single/${restaurantId}`, null, {
      params: {
        target_sql_gb: targetSqlGb,
        target_mongo_gb: targetMongoGb,
        save_as_custom: Boolean(saveAsCustom)
      },
      timeout: 30000 // 30 giây cho xử lý 1 nhà hàng
    });
    return res.data;
  },

  getCustomConfigs: async (): Promise<Record<string, RamCustomConfigItem>> => {
    const res = await api.get<Record<string, RamCustomConfigItem>>('/jobs/ram-limit-audit/custom-configs');
    return res.data;
  },

  deleteCustomConfig: async (restaurantId: number): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete<{ success: boolean; message: string }>(`/jobs/ram-limit-audit/custom-configs/${restaurantId}`);
    return res.data;
  },

  removeSingleRamLimit: async (restaurantId: number): Promise<RamLimitAuditItem> => {
    const res = await api.post<RamLimitAuditItem>(`/jobs/ram-limit-audit/remove-limits-single/${restaurantId}`, null, {
      timeout: 30000 // 30 giây
    });
    return res.data;
  },

  removeBatchRamLimits: async (payload: RamLimitRemoveBatchRequest): Promise<any> => {
    const res = await api.post('/jobs/ram-limit-audit/remove-limits-batch', payload, {
      timeout: 300000 // 5 phút
    });
    return res.data;
  },

  getEmailConfig: async (): Promise<RamLimitEmailConfigResponse> => {
    const res = await api.get<RamLimitEmailConfigResponse>('/jobs/ram-limit-audit/email-config');
    return res.data;
  },

  saveEmailConfig: async (recipients: string[]): Promise<RamLimitEmailConfigResponse> => {
    const res = await api.put<RamLimitEmailConfigResponse>('/jobs/ram-limit-audit/email-config', {
      recipients
    });
    return res.data;
  },

  sendEmailReport: async (scanDate?: string, recipients?: string[], targetSqlGb?: number, targetMongoGb?: number): Promise<RamLimitSendEmailResponse> => {
    const res = await api.post<RamLimitSendEmailResponse>('/jobs/ram-limit-audit/send-email', {
      scan_date: scanDate,
      recipients,
      target_sql_gb: targetSqlGb,
      target_mongo_gb: targetMongoGb
    }, {
      timeout: 60000 // 60 giây khi gửi email
    });
    return res.data;
  }
};
