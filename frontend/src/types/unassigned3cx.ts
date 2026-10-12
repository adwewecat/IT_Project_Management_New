export interface UnassignedTicketItem {
  ticket_id: string;
  ticket_title: string;
  creator: string;
  created_at: string;
  due_date: string;
  status: string;
  assignee_status: string;
  url: string;
  source_type?: 'TICKET' | 'GPROCESS' | string;
  scanned_at?: string;
}

export interface UnassignedAuditResponse {
  scan_date: string;
  scanned_at?: string | null;
  total_unassigned: number;
  items: UnassignedTicketItem[];
}

export interface UnassignedSsoConfig {
  sso_username: string;
  has_password: boolean;
  email_recipients: string;
}
