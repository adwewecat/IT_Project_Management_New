import React from 'react';
import { RefreshCw, Save } from 'lucide-react';
import {
  Hotline3cxConfig,
  Hotline3cxConfigUpdate,
} from '../../../types/hotline3cxAuto';
import { Button } from '../../ui/Button';

export interface ConfigTabProps {
  config: Hotline3cxConfig | null;
  configForm: Hotline3cxConfigUpdate;
  loadingConfig: boolean;
  savingConfig: boolean;
  onConfigFormChange: React.Dispatch<React.SetStateAction<Hotline3cxConfigUpdate>>;
  onSaveConfig: (e: React.FormEvent) => void;
}

export const ConfigTab: React.FC<ConfigTabProps> = ({
  config,
  configForm,
  loadingConfig,
  savingConfig,
  onConfigFormChange,
  onSaveConfig,
}) => {
  if (loadingConfig) {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
            Khi quy trình Playwright gặp sự cố sau 3 lần thử lại, hệ thống sẽ gửi email kèm ảnh chụp lỗi đến danh sách này.
          </div>
        </div>

        {/* Nút lưu cấu hình */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
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
    </div>
  );
};
