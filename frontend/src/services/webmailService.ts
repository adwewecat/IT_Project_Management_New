import apiClient from './api';

export interface SystemEmailConfig {
  id?: number;
  account_name: string;
  email_address: string;
  email_password?: string;
  is_password_masked?: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  default_to: string;
  default_cc: string;
  client_id?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface WebmailRecipient {
  name?: string;
  email: string;
}

export interface WebmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

export interface WebmailMessageItem {
  id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  received_time_vn: string;
  received_time_raw?: string;
  is_read: boolean;
  has_attachments: boolean;
  preview: string;
  importance: string;
  sent_by_user?: string;
}

export interface WebmailMessageDetail {
  id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  to_recipients: WebmailRecipient[];
  cc_recipients: WebmailRecipient[];
  received_time_vn: string;
  received_time_raw?: string;
  is_read: boolean;
  has_attachments: boolean;
  attachments: WebmailAttachment[];
  body_type: string;
  body_content: string;
  importance: string;
  sent_by_user?: string;
}

export interface UserEmailSignature {
  id?: number;
  username: string;
  full_name?: string;
  job_title?: string;
  department?: string;
  office_address?: string;
  office_phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  signature_html?: string;
  use_custom_html?: boolean;
  updated_at?: string;
}

export interface WebmailSentLogItem {
  id: number;
  sender_username: string;
  from_email: string;
  to_emails: string;
  cc_emails?: string;
  subject?: string;
  body_preview?: string;
  attachments?: Array<{ name: string; size: number; type: string }>;
  status: string;
  error_message?: string;
  sent_at_vn: string;
}

export const webmailService = {
  // Cấu hình hệ thống
  async getConfig(): Promise<SystemEmailConfig> {
    const res = await apiClient.get<SystemEmailConfig>('/webmail/config');
    return res.data;
  },

  async updateConfig(data: Partial<SystemEmailConfig>): Promise<SystemEmailConfig> {
    const res = await apiClient.put<SystemEmailConfig>('/webmail/config', data);
    return res.data;
  },

  async testConnection(): Promise<{
    graph_api: { status: string; message: string };
    smtp: { status: string; message: string };
    overall_status: string;
  }> {
    const res = await apiClient.post('/webmail/test-connection');
    return res.data;
  },

  // Danh sách email & Hộp thư đến
  async getMessages(
    filterType: 'unread' | 'all' | 'sent' = 'unread',
    search = '',
    top = 50,
    skip = 0,
    forceRefresh = false
  ): Promise<{
    messages: WebmailMessageItem[];
    total_returned: number;
    unread_count: number;
    filter_type: string;
    search_query: string;
  }> {
    const res = await apiClient.get('/webmail/messages', {
      params: { filter_type: filterType, search, top, skip, force_refresh: forceRefresh }
    });
    return res.data;
  },

  async getMessageDetail(messageId: string, forceRefresh = false): Promise<WebmailMessageDetail> {
    const res = await apiClient.get<WebmailMessageDetail>(
      `/webmail/messages/${encodeURIComponent(messageId)}`,
      { params: { force_refresh: forceRefresh } }
    );
    return res.data;
  },

  async markAsRead(messageId: string, isRead = true): Promise<void> {
    await apiClient.post(`/webmail/messages/${encodeURIComponent(messageId)}/read`, { is_read: isRead });
  },

  async markAllAsRead(): Promise<{ status: string; marked_count: number }> {
    const res = await apiClient.post('/webmail/mark-all-read');
    return res.data;
  },

  async downloadAttachment(messageId: string, attachmentId: string, filename: string): Promise<void> {
    const res = await apiClient.get(
      `/webmail/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`,
      { responseType: 'blob' }
    );
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Chữ ký cá nhân hóa
  async getSignature(): Promise<UserEmailSignature> {
    const res = await apiClient.get<UserEmailSignature>('/webmail/signature');
    return res.data;
  },

  async updateSignature(data: Partial<UserEmailSignature>): Promise<UserEmailSignature> {
    const res = await apiClient.put<UserEmailSignature>('/webmail/signature', data);
    return res.data;
  },

  // Soạn & gửi email
  async sendEmail(formData: FormData): Promise<{
    status: string;
    message: string;
    to: string[];
    cc: string[];
    attachments_count: number;
  }> {
    const res = await apiClient.post('/webmail/send', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  // Nhật ký đã gửi
  async getSentLogs(limit = 50): Promise<WebmailSentLogItem[]> {
    const res = await apiClient.get<WebmailSentLogItem[]>('/webmail/sent-logs', {
      params: { limit }
    });
    return res.data;
  }
};
