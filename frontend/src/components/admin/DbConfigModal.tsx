import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Play,
  Save,
  ShieldCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { systemService } from '../../services/systemService';
import { DBConfigData } from '../../types/system';

interface DbConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DbConfigModal: React.FC<DbConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [server, setServer] = useState('172.16.20.103');
  const [port, setPort] = useState(1433);
  const [dbName, setDbName] = useState('ITDEPT');
  const [trustedConnection, setTrustedConnection] = useState(false);
  const [dbUser, setDbUser] = useState('itapp');
  const [dbPassword, setDbPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [odbcDriver, setOdbcDriver] = useState('ODBC Driver 18 for SQL Server');
  const [trustServerCert, setTrustServerCert] = useState('yes');

  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    error_detail?: string | null;
  } | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      setSaveError(null);
      setShowPassword(false);
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const cfg: DBConfigData = await systemService.getDbConfig();
      setServer(cfg.server || '172.16.20.103');
      setPort(cfg.port || 1433);
      setDbName(cfg.db_name || 'ITDEPT');
      // Default to false (SQL User/Pass) unless explicitly trusted
      setTrustedConnection(cfg.trusted_connection ?? false);
      setDbUser(cfg.db_user || 'itapp');
      setDbPassword(cfg.db_password || '');
      setOdbcDriver(cfg.odbc_driver || 'ODBC Driver 18 for SQL Server');
      setTrustServerCert(cfg.trust_server_certificate || 'yes');
    } catch {
      // Keep defaults
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSaveError(null);
    try {
      const res = await systemService.testDbConnection({
        server: server.trim(),
        port: Number(port),
        db_name: dbName.trim(),
        trusted_connection: trustedConnection,
        db_user: dbUser.trim(),
        db_password: dbPassword,
        odbc_driver: odbcDriver.trim(),
        trust_server_certificate: trustServerCert.trim(),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Lỗi kiểm tra kết nối',
        error_detail: err.response?.data?.detail || err.message || 'Không thể gửi yêu cầu',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    try {
      await systemService.updateDbConfig({
        server: server.trim(),
        port: Number(port),
        db_name: dbName.trim(),
        trusted_connection: trustedConnection,
        db_user: dbUser.trim(),
        db_password: dbPassword,
        odbc_driver: odbcDriver.trim(),
        trust_server_certificate: trustServerCert.trim(),
      });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || err.message || 'Lỗi khi lưu cấu hình máy chủ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cấu Hình Kết Nối Máy Chủ SQL Server"
      maxWidth="620px"
    >
      {isLoadingConfig ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
          Đang nạp cấu hình hệ thống...
        </div>
      ) : (
        <form onSubmit={handleSaveConfig}>
          {/* Security Notice */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: 'var(--color-primary-subtle)',
              border: '1px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '18px',
              fontSize: '13px',
              color: 'var(--color-primary-text)',
            }}
          >
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span>
              Chức năng dành cho <strong>Quản Trị Viên</strong>. Cấu hình được lưu vào <code>.env</code> và kết nối lại ngay.
            </span>
          </div>

          {/* Test connection result banner */}
          {testResult && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: testResult.success ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                border: `1px solid ${testResult.success ? 'var(--color-success-border)' : 'var(--color-error-border)'}`,
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                fontSize: '13px',
                color: testResult.success ? 'var(--color-success-text)' : 'var(--color-error)',
              }}
            >
              {testResult.success ? (
                <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{testResult.message}</div>
                {testResult.error_detail && (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                    }}
                  >
                    {testResult.error_detail}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save error banner */}
          {saveError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                fontSize: '13px',
                color: 'var(--color-error)',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Không thể lưu cấu hình</div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>{saveError}</div>
              </div>
            </div>
          )}

          {/* Server IP & Port Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <Input
              label="Địa Chỉ Máy Chủ (Server IP / Hostname)"
              placeholder="VD: 172.16.20.103"
              value={server}
              onChange={(e) => setServer(e.target.value)}
              required
              leftIcon={<Server size={16} />}
            />
            <Input
              label="Cổng Port"
              type="number"
              placeholder="1433"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              required
            />
          </div>

          {/* Database Name */}
          <div style={{ marginBottom: '16px' }}>
            <Input
              label="Tên Database (Catalog)"
              placeholder="VD: ITDEPT"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              required
              leftIcon={<Database size={16} />}
            />
          </div>

          {/* DB User & DB Password Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
            <Input
              label="Tài Khoản Kết Nối (User / UID)"
              placeholder="VD: itapp"
              value={dbUser}
              onChange={(e) => {
                setDbUser(e.target.value);
                setTrustedConnection(false);
              }}
              required
              leftIcon={<User size={16} />}
            />
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Mật Khẩu Kết Nối (Password / PWD)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu (VD: GGGroup@123!)"
                  value={dbPassword}
                  onChange={(e) => {
                    setDbPassword(e.target.value);
                    setTrustedConnection(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 40px 9px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color var(--transition-fast)',
                  }}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Authentication Mode Selection */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={trustedConnection}
                onChange={(e) => setTrustedConnection(e.target.checked)}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>Sử dụng Windows Authentication (Trusted Connection) thay cho User/Password</span>
            </label>
          </div>

          {/* Driver & Certificate (Advanced) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <Input
              label="ODBC Driver"
              value={odbcDriver}
              onChange={(e) => setOdbcDriver(e.target.value)}
              required
            />
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Bỏ qua SSL Cert
              </label>
              <select
                value={trustServerCert}
                onChange={(e) => setTrustServerCert(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="yes">yes (Bỏ qua)</option>
                <option value="no">no (Xác thực)</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              isLoading={isTesting}
              leftIcon={<Play size={15} />}
            >
              Kiểm Tra Kết Nối Thử
            </Button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                leftIcon={<Save size={16} />}
              >
                Lưu & Áp Dụng
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
