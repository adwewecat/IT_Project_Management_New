export interface DBConfigData {
  server: string;
  port: number;
  db_name: string;
  trusted_connection: boolean;
  db_user?: string | null;
  db_password?: string;
  has_password?: boolean;
  odbc_driver: string;


  trust_server_certificate: string;
  is_connected: boolean;
}

export interface DBTestConnectionPayload {
  server: string;
  port: number;
  db_name: string;
  trusted_connection: boolean;
  db_user?: string;
  db_password?: string;
  odbc_driver?: string;
  trust_server_certificate?: string;
}

export interface DBTestConnectionResult {
  success: boolean;
  message: string;
  error_detail?: string | null;
}

export interface DBConfigUpdatePayload {
  server: string;
  port: number;
  db_name: string;
  trusted_connection: boolean;
  db_user?: string;
  db_password?: string;
  odbc_driver?: string;
  trust_server_certificate?: string;
}

export interface DBConfigUpdateResult {
  success: boolean;
  message: string;
  is_connected: boolean;
}
