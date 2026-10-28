import React, { useState, useEffect } from 'react';
import { Settings, Shield, CheckCircle2, AlertTriangle, Eye, EyeOff, RefreshCw, ExternalLink } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { webmailService, SystemEmailConfig } from '../../services/webmailService';

interface WebmailConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: SystemEmailConfig) => void;
}

export const WebmailConfigModal: React.FC<WebmailConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<SystemEmailConfig>({
    account_name: 'Mail Chung IT Application',
    email_address: 'ss.it.application@ggg.com.vn',
    email_password: '',
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_use_tls: true,
    default_to: '',
    default_cc: 'hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    graph_api: { status: string; message: string };
    smtp: { status: string; message: string };
    overall_status: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setTestResult(null);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await webmailService.getConfig();
      setConfig(data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể tải cấu hình email hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setErrorMessage('');
    try {
      const result = await webmailService.testConnection();
      setTestResult(result);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Lỗi khi kiểm tra kết nối email.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updated = await webmailService.updateConfig(config);
      setConfig(updated);
      setSuccessMessage('Đã lưu cấu hình email hệ thống thành công!');
      if (onConfigSaved) onConfigSaved(updated);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="720px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={20} style={{ color: '#D97706' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cấu Hình Hệ Thống Mail Chung &amp; SMTP
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Chỉ Quản trị viên cao cấp (dung.nguyenanh hoặc Super Admin) mới có quyền chỉnh sửa
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button
            variant="outline"
            onClick={handleTestConnection}
            isLoading={testing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={testing ? 'spin' : ''} />
            <span>Kiểm Tra Kết Nối</span>
          </Button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Đóng
            </Button>
            <Button variant="primary" onClick={handleSave} isLoading={saving}>
              Lưu Thay Đổi
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ padding: '4px 0', fontSize: '13px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
            <div>Đang tải thông số cấu hình email...</div>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {errorMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10B981',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12.5px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Banner bảo mật & phân quyền */}
            <div
              style={{
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={20} style={{ color: '#D97706', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Phân Quyền Sử Dụng Webmail</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Mặc định chỉ Admin thấy. Để cấp quyền cho nhóm khác (IT App, Helpdesk...), hãy vào bảng phân quyền.
                  </div>
                </div>
              </div>
              <a
                href="/admin/users"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#2563EB',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Nhóm quyền</span>
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Thông tin tài khoản Office 365 */}
            <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              1. Tài Khoản Email Dùng Chung (Office 365 / Exchange)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Tên hiển thị hòm thư:
                </label>
                <input
                  type="text"
                  value={config.account_name}
                  onChange={(e) => setConfig({ ...config, account_name: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Ví dụ: Mail Chung IT Application"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Địa chỉ email đăng nhập:
                </label>
                <input
                  type="email"
                  value={config.email_address}
                  onChange={(e) => setConfig({ ...config, email_address: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="ss.it.application@ggg.com.vn"
                  required
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Mật khẩu tài khoản email:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={config.email_password || ''}
                    onChange={(e) => setConfig({ ...config, email_password: e.target.value })}
                    className="input-field"
                    style={{ width: '100%', boxSizing: 'border-box', paddingRight: '40px', fontFamily: 'monospace' }}
                    placeholder={config.is_password_masked ? '🔒 Bị ẩn theo phân quyền' : 'Nhập mật khẩu mới nếu muốn đổi'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Cấu hình máy chủ gửi thư SMTP */}
            <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              2. Máy Chủ Gửi Thư SMTP (Outbound Mail Server)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Máy chủ SMTP:
                </label>
                <input
                  type="text"
                  value={config.smtp_host}
                  onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Cổng (Port):
                </label>
                <input
                  type="number"
                  value={config.smtp_port}
                  onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value, 10) || 587 })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Bảo mật TLS:
                </label>
                <select
                  value={config.smtp_use_tls ? '1' : '0'}
                  onChange={(e) => setConfig({ ...config, smtp_use_tls: e.target.value === '1' })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                >
                  <option value="1">Bật STARTTLS (TLS 1.2)</option>
                  <option value="0">Không bật</option>
                </select>
              </div>
            </div>

            {/* Mặc định To & CC */}
            <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              3. Người Nhận &amp; CC Mặc Định Khi Soạn Thư Mới
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  To mặc định (phân cách dấu chấm phẩy ; - để trống nếu không cố định):
                </label>
                <input
                  type="text"
                  value={config.default_to}
                  onChange={(e) => setConfig({ ...config, default_to: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="Ví dụ: it.support@ggg.com.vn"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  CC mặc định (tự động điền vào ô CC khi bất kỳ ai bấm Soạn mail):
                </label>
                <input
                  type="text"
                  value={config.default_cc}
                  onChange={(e) => setConfig({ ...config, default_cc: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;"
                  required
                />
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  * Các mail này sẽ luôn được tự động thêm vào danh sách CC khi người dùng mở form soạn thư (họ vẫn có thể xóa bớt nếu cần).
                </div>
              </div>
            </div>

            {/* Kết quả kiểm tra kết nối nếu có */}
            {testResult && (
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '10px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>
                  Kết Quả Kiểm Thử Kết Nối Trực Tiếp:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {testResult.graph_api.status === 'SUCCESS' ? (
                      <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                    )}
                    <span>
                      <b>Microsoft Graph API (Đọc thư):</b> {testResult.graph_api.message}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {testResult.smtp.status === 'SUCCESS' ? (
                      <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                    )}
                    <span>
                      <b>SMTP Office 365 (Gửi thư):</b> {testResult.smtp.message}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
};
