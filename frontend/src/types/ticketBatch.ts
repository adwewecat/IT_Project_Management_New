// Ticket Batch Types

export interface TicketBatchConfig {
  sso_username: string;
  has_password: boolean;
  email_recipients: string;
  last_run_at: string | null;
  last_run_status: string | null;
}

export interface TicketItem {
  ticket_id: string;
  ticket_name: string;
  created_by: string;
  assignee: string;
  due_date: string;
  url: string;
  source_type?: 'TICKET' | 'GPROCESS' | string;
  status?: string;
}

export interface TicketPreviewResult {
  status: string;
  sso_username: string;
  tickets: TicketItem[];
  total_tickets: number;
  ticket_count?: number;
  gprocess_count?: number;
  timesheet_summary: Record<string, number>; // {"2026-09-01": 8.0, ...}
  message: string;
}


export interface TicketBatchRunResult {
  status: string;
  duration_seconds: number;
  total_processed: number;
  success_count: number;
  failed_count: number;
  skipped_count: number;
  results: TicketCloseResult[];
  email_sent: boolean;
  message: string;
}

export interface TicketCloseResult {
  ticket_id: string;
  ticket_name?: string;
  status: 'success' | 'error' | 'skipped';
  day_used?: string;
  category_used?: string;
  remaining_after?: number;
  reason?: string;
  message?: string;
  error_details?: string | null;
}

export interface TicketHistoryItem {
  ticket_id: string;
  ticket_name: string;
  source_type?: 'TICKET' | 'GPROCESS' | string;
  created_by: string;
  assignee: string;
  due_date: string;
  url: string;
  status?: string;
  execution_status: 'pending' | 'success' | 'error' | 'failed' | 'skipped' | string;
  execution_message?: string;
  error_details?: string | null;
  execution_time?: string | null;
}

export interface TicketBatchHistory {
  has_data: boolean;
  last_scanned_at?: string | null;
  last_run_at?: string | null;
  run_mode?: 'manual' | 'auto';
  sso_username?: string;
  total_items?: number;
  ticket_count?: number;
  gprocess_count?: number;
  timesheet_summary?: Record<string, number>;
  items?: TicketHistoryItem[];
  summary?: {
    status?: string;
    duration_seconds?: number;
    total_processed?: number;
    success_count?: number;
    failed_count?: number;
    skipped_count?: number;
    message?: string;
  };
  message?: string;
}
