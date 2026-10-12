import React, { useState, useEffect } from 'react';
import { Download, CheckCircle, Wrench, Key, Eye, EyeOff, ShieldCheck, Save, Loader2, Check } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { downloadScrcpyPackage, downloadVncScrcpyReg, getVncConfig, updateVncConfig } from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';

interface VncSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VncSetupModal: React.FC<VncSetupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const normalizedUser = (user?.username || '').trim().toLowerCase();
  const canConfigVnc = !!user?.is_super_admin || ['dung.nguyenanh', 'admin'].includes(normalizedUser);

  const [downloadedReg, setDownloadedReg] = useState(false);
  const [downloadedScrcpy, setDownloadedScrcpy] = useState(false);
  const [vncPassword, setVncPassword] = useState<string>(
    () => localStorage.getItem('vnc_default_password') || '1234a@'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tải mật khẩu VNC cấu hình từ hệ thống backend khi mở modal
  useEffect(() => {
    if (isOpen) {
      getVncConfig()
        .then((res) => {
          if (res?.default_password) {
            setVncPassword(res.default_password);
            localStorage.setItem('vnc_default_password', res.default_password);
          }
        })
        .catch((err) => {
          console.warn('Could not load central vnc-config:', err);
        });
    }
  }, [isOpen]);

  const handleSavePassword = async () => {
    if (!vncPassword.trim()) {
      alert('Vui lòng nhập mật khẩu VNC.');
      return;
    }
    try {
      setIsSavingPassword(true);
      await updateVncConfig(vncPassword.trim());
      localStorage.setItem('vnc_default_password', vncPassword.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể lưu mật khẩu. Vui lòng thử lại.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleResetDefault = async () => {
    const def = '1234a@';
    setVncPassword(def);
    try {
      setIsSavingPassword(true);
      await updateVncConfig(def);
      localStorage.setItem('vnc_default_password', def);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      console.error('Reset password error:', err);
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleDownloadReg = async () => {
    // Nếu là admin hoặc dung.nguyenanh và có thay đổi mật khẩu chưa lưu, tự lưu lên server
    if (canConfigVnc) {
      try {
        await updateVncConfig(vncPassword);
      } catch (err) {
        console.error('Failed to sync vnc password to server:', err);
      }
    }
    downloadVncScrcpyReg(vncPassword);
    localStorage.setItem('vnc_default_password', vncPassword);
    setDownloadedReg(true);
  };

  const handleDownloadScrcpy = () => {
    downloadScrcpyPackage();
    setDownloadedScrcpy(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài Đặt & Cấu Hình Kết Nối VNC / KDS"
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="primary" onClick={onClose}>
            Đã Hiểu & Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Important Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 14px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: '#1E40AF',
            lineHeight: 1.5,
          }}
        >
          <Wrench size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#2563EB' }} />
          <div>
            <strong>Vì sao cần cài đặt?</strong> Trình duyệt web chạy trong môi trường bảo mật nghiêm ngặt nên không thể tự động mở phần mềm máy tính (TightVNC / Scrcpy) nếu hệ điều hành Windows chưa được đăng ký giao thức (<code style={{ backgroundColor: '#DBEAFE', padding: '1px 4px', borderRadius: '3px' }}>vnc://</code> và <code style={{ backgroundColor: '#DBEAFE', padding: '1px 4px', borderRadius: '3px' }}>scrcpy://</code>).
            <br />
            <strong>Thao tác này chỉ cần thực hiện 1 LẦN DUY NHẤT trên mỗi máy tính!</strong>
          </div>
        </div>

        {/* Step 1: Registry Setup */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#1a73e8',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                1
              </span>
              Đăng Ký Giao Thức Windows (File Registry)
            </div>
            {downloadedReg && (
              <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle size={14} /> Đã tải xuống
              </span>
            )}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
            File này đăng ký các giao thức kết nối cho Windows và thiết lập chính sách cho Google Chrome / Microsoft Edge tự động mở mà không hiện thông báo hỏi lại.
          </p>

          {/* Password config field - CHỈ HIỂN THỊ VỚI admin VÀ dung.nguyenanh */}
          {canConfigVnc && (
            <div
              style={{
                marginBottom: '14px',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #93C5FD',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Key size={14} style={{ color: '#1a73e8' }} /> Cấu Hình Mật Khẩu VNC Hệ Thống:
                  <span style={{ fontSize: '10px', color: '#059669', backgroundColor: '#DEF7EC', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <ShieldCheck size={12} /> Quản trị viên ({normalizedUser})
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleResetDefault}
                  disabled={isSavingPassword}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1a73e8',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Đặt lại về mặc định (1234a@)
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={vncPassword}
                    onChange={(e) => {
                      setVncPassword(e.target.value);
                      localStorage.setItem('vnc_default_password', e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSavePassword();
                      }
                    }}
                    placeholder="Nhập mật khẩu VNC..."
                    style={{
                      width: '100%',
                      padding: '6px 32px 6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={isSavingPassword ? <Loader2 size={14} className="spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
                  onClick={handleSavePassword}
                  disabled={isSavingPassword}
                  style={{
                    backgroundColor: saveSuccess ? '#059669' : undefined,
                    borderColor: saveSuccess ? '#059669' : undefined,
                  }}
                >
                  {isSavingPassword ? 'Đang lưu...' : saveSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Mật Khẩu'}
                </Button>
              </div>

              <div style={{ marginTop: '6px', fontSize: '11px', color: saveSuccess ? '#059669' : 'var(--text-muted)', fontWeight: saveSuccess ? 600 : 400 }}>
                {saveSuccess
                  ? '✅ Đã lưu mật khẩu mới lên hệ thống máy chủ! Toàn bộ người dùng khác khi tải file .reg sẽ tự động dùng mật khẩu này.'
                  : '💡 Nhập mật khẩu mới rồi bấm "Lưu Mật Khẩu" để cập nhật cho toàn hệ thống.'}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Download size={15} />}
              onClick={handleDownloadReg}
            >
              Tải File vnc_scrcpy_protocol.reg
            </Button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              👉 Sau khi tải về: <strong>Click đúp chuột vào file</strong> &rarr; Chọn <strong>Yes</strong> &rarr; <strong>OK</strong>.
            </span>
          </div>
        </div>

        {/* Step 2: Scrcpy Setup */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#6f42c1',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
              >
                2
              </span>
              Cài Đặt Bộ Công Cụ Scrcpy (KDS Màn Hình Bếp)
            </div>
            {downloadedScrcpy && (
              <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                <CheckCircle size={14} /> Đã tải xuống
              </span>
            )}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
            Bộ công cụ ADB và Scrcpy giúp kết nối và điều khiển từ xa các màn hình hiển thị KDS (.31 &rarr; .38) tại nhà hàng.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download size={15} />}
              onClick={handleDownloadScrcpy}
            >
              Tải Bộ Cài Đặt scrcpy.rar (~6.1 MB)
            </Button>
          </div>

          <div
            style={{
              fontSize: '12px',
              backgroundColor: 'var(--bg-primary)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            <strong>Hướng dẫn giải nén chuẩn:</strong>
            <br />
            1. Mở file <code style={{ fontWeight: 600 }}>scrcpy.rar</code> vừa tải về.
            <br />
            2. Giải nén toàn bộ thư mục vào đúng vị trí: <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>C:\scrcpy</strong>
            <br />
            3. Đảm bảo đường dẫn chính xác là: <code style={{ fontFamily: 'monospace' }}>C:\scrcpy\scrcpy.exe</code> và <code style={{ fontFamily: 'monospace' }}>C:\scrcpy\adb.exe</code> (không lồng thêm thư mục cấp con).
          </div>
        </div>

        {/* Step 3: TightVNC Note */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#059669',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            3
          </span>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Phần mềm TightVNC (PC / POS):</strong> Để xem màn hình PC Quản Lý (.41) hoặc máy POS (.11, .12), máy tính của bạn cần được cài sẵn TightVNC tại đường dẫn mặc định <code style={{ fontFamily: 'monospace' }}>C:\Program Files\TightVNC\tvnviewer.exe</code> (mật khẩu kết nối được tự động điền sẵn).
          </div>
        </div>
      </div>
    </Modal>
  );
};
