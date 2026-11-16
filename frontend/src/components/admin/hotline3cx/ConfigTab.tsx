import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Laptop,
  RefreshCw,
  Save,
  Server,
  Shield,
} from 'lucide-react';
import {
  ExecutionMode,
  Hotline3cxConfig,
  Hotline3cxConfigUpdate,
} from '../../../types/hotline3cxAuto';
import { formatDateTimeDDMMYYYY } from '../../../utils/dateFormat';
import { Button } from '../../ui/Button';

export interface ConfigTabProps {
  config: Hotline3cxConfig | null;
  configForm: Hotline3cxConfigUpdate;
  loadingConfig: boolean;
  savingConfig: boolean;
  regeneratingToken: boolean;
  downloadingPackage: boolean;
  onConfigFormChange: React.Dispatch<React.SetStateAction<Hotline3cxConfigUpdate>>;
  onSaveConfig: (e: React.FormEvent) => void;
  onRefreshConfig: () => void;
  onRegenerateToken: () => void;
  onDownloadRelayPackage: (serverUrl: string) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  configForm,
  loadingConfig,
  savingConfig,
  regeneratingToken,
  downloadingPackage,
  onConfigFormChange,
  onSaveConfig,
  onRefreshConfig,
  onRegenerateToken,
  onDownloadRelayPackage,
}) => {
  const [showToken, setShowToken] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [relayServerUrl, setRelayServerUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );

  if (loadingConfig && !config) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '40px',
          color: 'var(--text-secondary)',
          fontSize: '13px',
        }}
      >
        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Đang tải cấu hình cổng 3CX...</span>
      </div>
    );
  }

  const currentMode: ExecutionMode =
    (configForm.execution_mode || config?.execution_mode || 'DIRECT') as ExecutionMode;
  const savedMode: ExecutionMode = (config?.execution_mode || 'DIRECT') as ExecutionMode;
  const modeChanged = Boolean(config && currentMode !== savedMode);

  const handleCopyToken = async () => {
    if (!config?.relay_token) return;
    try {
      await navigator.clipboard.writeText(config.relay_token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 1800);
    } catch {
      setShowToken(true);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <form
        onSubmit={onSaveConfig}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-primary)',
          padding: '18px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Nhóm cổng 3CX portal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              URL Cổng 3CX Web Portal *
            </label>
            <input
              type="url"
              value={configForm.portal_url || ''}
              onChange={(e) =>
                onConfigFormChange((prev) => ({ ...prev, portal_url: e.target.value }))
              }
              placeholder="https://ggg.ringbot.co:5001/#/login"
              required
              style={{
                padding: '7px 10px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Tài Khoản Đăng Nhập 3CX (Username) *
            </label>
            <input
              type="text"
              value={configForm.username || ''}
              onChange={(e) =>
                onConfigFormChange((prev) => ({ ...prev, username: e.target.value }))
              }
              placeholder="VD: 8740"
              required
              style={{
                padding: '7px 10px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Password field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Mật Khẩu 3CX (Password)
          </label>
          <input
            type="password"
            value={configForm.password || ''}
            onChange={(e) =>
              onConfigFormChange((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder={
              config?.has_password
                ? 'Đã lưu an toàn trong hệ thống — chỉ nhập mật khẩu mới nếu muốn thay đổi'
                : 'Chưa có mật khẩu — vui lòng nhập mật khẩu cổng 3CX'
            }
            style={{
              padding: '7px 10px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {config?.has_password ? (
              <span style={{ color: '#059669', fontWeight: 600 }}>
                ✓ Hệ thống đã lưu trữ mật khẩu đã mã hóa an toàn.
              </span>
            ) : (
              <span style={{ color: '#dc2626', fontWeight: 600 }}>
                ⚠ Chưa có mật khẩu portal 3CX. Playwright sẽ không thể đăng nhập!
              </span>
            )}
          </div>
        </div>

        {/* Tên 2 hàng đợi */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Tên Hàng Đợi Ca Sáng (Day Queue) *
            </label>
            <input
              type="text"
              value={configForm.day_queue_name || ''}
              onChange={(e) =>
                onConfigFormChange((prev) => ({ ...prev, day_queue_name: e.target.value }))
              }
              placeholder="IT HCM App Day"
              required
              style={{
                padding: '7px 10px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Tên Hàng Đợi Ca Tối / Cuối Tuần (Night Queue) *
            </label>
            <input
              type="text"
              value={configForm.night_queue_name || ''}
              onChange={(e) =>
                onConfigFormChange((prev) => ({ ...prev, night_queue_name: e.target.value }))
              }
              placeholder="IT HCM App Night"
              required
              style={{
                padding: '7px 10px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Giờ chạy ca sáng & ca chiều */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Giờ Chạy Ca Sáng (HH:mm 24h) *
            </label>
            <input
              type="text"
              value={configForm.morning_time || ''}
              onChange={(e) =>
                onConfigFormChange((prev) => ({ ...prev, morning_time: e.target.value }))
              }
              placeholder="06:00"
              required
              style={{
                padding: '7px 10px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Giờ Chạy Ca Chiều (HH:mm 24h) *
            </label>
            <input
              type="text"
              value={configForm.evening_time || ''}
              onChange={(e) =>
                onConfigFormChange((prev) => ({ ...prev, evening_time: e.target.value }))
              }
              placeholder="16:29"
              required
              style={{
                padding: '7px 10px',
                fontSize: '12.5px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Email cảnh báo khi lỗi */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Danh Sách Email Nhận Cảnh Báo Khi Lỗi (phân cách bằng dấu phẩy)
          </label>
          <input
            type="text"
            value={configForm.alert_emails || ''}
            onChange={(e) =>
              onConfigFormChange((prev) => ({ ...prev, alert_emails: e.target.value }))
            }
            placeholder="dung.nguyenanh@ggg.com.vn"
            style={{
              padding: '7px 10px',
              fontSize: '12.5px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Khi quy trình Playwright gặp sự cố hoặc Relay Worker quá hạn 15 phút, hệ thống sẽ gửi email cảnh báo đến danh sách này.
          </div>
        </div>

        {/* Chọn chế độ thực thi (Chạy trực tiếp trên Server vs Qua 3CX Relay Worker) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Phương Thức Thực Thi Đồng Bộ 3CX
            </label>
            {modeChanged && (
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: '#d97706',
                  backgroundColor: 'rgba(245, 158, 11, 0.14)',
                  padding: '2px 7px',
                  borderRadius: '4px',
                }}
              >
                Chưa lưu thay đổi — bấm "Lưu Cấu Hình"
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() =>
                onConfigFormChange((prev) => ({ ...prev, execution_mode: 'DIRECT' }))
              }
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
                border:
                  currentMode === 'DIRECT'
                    ? '2px solid #2563eb'
                    : '1px solid var(--border-color)',
                backgroundColor:
                  currentMode === 'DIRECT'
                    ? 'rgba(37, 99, 235, 0.08)'
                    : 'var(--bg-card)',
              }}
            >
              <Server
                size={18}
                style={{
                  marginTop: '2px',
                  flexShrink: 0,
                  color: currentMode === 'DIRECT' ? '#2563eb' : 'var(--text-secondary)',
                }}
              />
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Chạy Trực Tiếp Trên Server
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Máy chủ backend tự mở Playwright (yêu cầu Server thông cổng mạng 5001).
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                onConfigFormChange((prev) => ({ ...prev, execution_mode: 'RELAY' }))
              }
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
                border:
                  currentMode === 'RELAY'
                    ? '2px solid #059669'
                    : '1px solid var(--border-color)',
                backgroundColor:
                  currentMode === 'RELAY'
                    ? 'rgba(5, 150, 105, 0.08)'
                    : 'var(--bg-card)',
              }}
            >
              <Laptop
                size={18}
                style={{
                  marginTop: '2px',
                  flexShrink: 0,
                  color: currentMode === 'RELAY' ? '#059669' : 'var(--text-secondary)',
                }}
              />
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Qua 3CX Relay Worker (PC Văn Phòng)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Server đẩy lệnh vào hàng đợi; PC/VM thông cổng 5001 thực thi &amp; gửi ảnh về.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Nút lưu cấu hình */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
          <Button
            type="submit"
            variant="primary"
            disabled={savingConfig}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {savingConfig ? (
              <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Save size={14} />
            )}
            <span>Lưu Cấu Hình</span>
          </Button>
        </div>
      </form>

      {/* Khối quản lý & tải gói 3CX Sync Relay Worker */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'var(--bg-primary)',
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: '#059669' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              3CX Sync Relay Worker (Phương Án 2 — PC Thông Cổng 5001)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '11.5px',
                fontWeight: 700,
                backgroundColor: config?.relay_online
                  ? 'rgba(16, 185, 129, 0.14)'
                  : 'rgba(107, 114, 128, 0.14)',
                color: config?.relay_online ? '#059669' : 'var(--text-secondary)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: config?.relay_online ? '#10b981' : '#9ca3af',
                }}
              />
              <span>
                {config?.relay_online ? 'Relay Đang Online' : 'Relay Ngoại Tuyến'}
              </span>
            </span>

            <button
              type="button"
              onClick={onRefreshConfig}
              disabled={loadingConfig}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              <RefreshCw
                size={12}
                style={{ animation: loadingConfig ? 'spin 1s linear infinite' : 'none' }}
              />
              <span>Kiểm Tra</span>
            </button>
          </div>
        </div>

        {/* Thông tin máy Worker kết nối gần nhất */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            fontSize: '11.5px',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Tên Máy Relay: </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {config?.relay_worker_name || '—'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>IP Kết Nối: </span>
            <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {config?.relay_last_ip || '—'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Tín Hiệu Cuối (24h): </span>
            <strong style={{ color: 'var(--text-primary)' }}>
              {config?.relay_last_seen_at
                ? formatDateTimeDDMMYYYY(config.relay_last_seen_at)
                : 'Chưa kết nối'}
            </strong>
          </div>
        </div>

        {/* Relay Token & Nút Tải Gói ZIP */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Mã Xác Thực Relay Token (X-Relay-Token)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type={showToken ? 'text' : 'password'}
                readOnly
                value={config?.relay_token || ''}
                style={{
                  flex: 1,
                  padding: '6px 9px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                title={showToken ? 'Ẩn Token' : 'Hiện Token'}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={handleCopyToken}
                title="Sao chép Relay Token"
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: copiedToken ? '#059669' : 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={onRegenerateToken}
                disabled={regeneratingToken}
                style={{
                  padding: '6px 10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {regeneratingToken ? 'Đang tạo...' : 'Tạo Mới'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
              URL Server Web Để Nhúng Vào Bộ Cài (.zip)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="url"
                value={relayServerUrl}
                onChange={(e) => setRelayServerUrl(e.target.value)}
                placeholder="http://172.16.8.25:5001"
                style={{
                  flex: 1,
                  padding: '6px 9px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                }}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={downloadingPackage}
                onClick={() => onDownloadRelayPackage(relayServerUrl)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                <Download size={14} />
                <span>{downloadingPackage ? 'Đang nén...' : 'Tải Bộ Cài Relay (.zip)'}</span>
              </Button>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Hướng dẫn nhanh: Tải gói <strong>3CX_Sync_Relay_Worker.zip</strong> về PC/VM văn phòng truy cập được{' '}
          <code>https://ggg.ringbot.co:5001</code>, giải nén và chạy{' '}
          <strong>Chay_3CX_Sync_Relay.bat</strong> (hoặc{' '}
          <strong>Cai_Dat_Khoi_Dong_Cung_Windows.bat</strong> để tự chạy ngầm khi mở máy).
        </div>
      </div>
    </div>
  );
};
