import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  Wrench,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Save,
  Loader2,
  Check,
  Server,
  Monitor,
  HelpCircle,
  FileArchive,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  downloadScrcpyPackage,
  downloadScrcpyWinServerPackage,
  downloadVncScrcpyReg,
  downloadVncScrcpyRegWinServer,
  getVncConfig,
  updateVncConfig,
} from '../../services/restaurantService';
import { useAuth } from '../../contexts/AuthContext';

interface VncSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VncSetupModal: React.FC<VncSetupModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const normalizedUser = (user?.username || '').trim().toLowerCase();
  const canConfigVnc = !!user?.is_super_admin || ['dung.nguyenanh', 'admin'].includes(normalizedUser);

  // Tab chuyển đổi: Bản chuẩn (Máy trạm Win 10/11) vs Bản Windows Server
  const [activeTab, setActiveTab] = useState<'STANDARD' | 'WINSERVER'>('STANDARD');

  const [downloadedReg, setDownloadedReg] = useState(false);
  const [downloadedScrcpy, setDownloadedScrcpy] = useState(false);
  const [downloadedServerReg, setDownloadedServerReg] = useState(false);
  const [downloadedServerScrcpy, setDownloadedServerScrcpy] = useState(false);

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

  // Tải bản chuẩn cho Win 10 / 11
  const handleDownloadReg = async () => {
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

  // Tải bản chuyên dụng cho Windows Server
  const handleDownloadServerReg = async () => {
    if (canConfigVnc) {
      try {
        await updateVncConfig(vncPassword);
      } catch (err) {
        console.error('Failed to sync vnc password to server:', err);
      }
    }
    downloadVncScrcpyRegWinServer(vncPassword);
    localStorage.setItem('vnc_default_password', vncPassword);
    setDownloadedServerReg(true);
  };

  const handleDownloadServerScrcpy = (fileType: 'zip' | 'rar' = 'zip') => {
    downloadScrcpyWinServerPackage(fileType);
    setDownloadedServerScrcpy(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài Đặt & Cấu Hình Kết Nối VNC / KDS"
      maxWidth="720px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="primary" onClick={onClose}>
            Đã Hiểu & Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Tab Navigation: Chuẩn vs WinServer */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('STANDARD')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'STANDARD' ? '1px solid #2563EB' : '1px solid var(--border-color)',
              backgroundColor: activeTab === 'STANDARD' ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-secondary)',
              color: activeTab === 'STANDARD' ? '#2563EB' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Monitor size={16} />
            Bản Chuẩn (Win 10 / 11 / Máy Trạm)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WINSERVER')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'WINSERVER' ? '1px solid #7C3AED' : '1px solid var(--border-color)',
              backgroundColor: activeTab === 'WINSERVER' ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-secondary)',
              color: activeTab === 'WINSERVER' ? '#8B5CF6' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Server size={16} />
            Bản Windows Server / RDP (Server 2012+)
          </button>
        </div>

        {/* =========================================================================
            TAB 1: BẢN CHUẨN (MÁY TRẠM WIN 10 / 11 / VMWARE - GIỮ NGUYÊN 100%)
            ========================================================================= */}
        {activeTab === 'STANDARD' && (
          <>
            {/* Important Notice */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              <Wrench size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#2563EB' }} />
              <div>
                <strong>Vì sao cần cài đặt?</strong> Trình duyệt web chạy trong môi trường bảo mật nghiêm ngặt nên không thể tự động mở phần mềm máy tính (TightVNC / Scrcpy) nếu hệ điều hành Windows chưa được đăng ký giao thức (<code style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', padding: '1px 4px', borderRadius: '3px' }}>vnc://</code> và <code style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', padding: '1px 4px', borderRadius: '3px' }}>scrcpy://</code>).
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
          </>
        )}

        {/* =========================================================================
            TAB 2: BẢN CHUYÊN DỤNG CHO WINDOWS SERVER / RDP (SERVER 2012 / 2016 / 2019 / 2022)
            ========================================================================= */}
        {activeTab === 'WINSERVER' && (
          <>
            {/* Notice đặc thù Windows Server */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 14px',
                backgroundColor: 'rgba(124, 58, 237, 0.08)',
                border: '1px solid rgba(124, 58, 237, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              <Server size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#7C3AED' }} />
              <div>
                <strong style={{ color: '#7C3AED' }}>Vì sao Win Server 2012 bấm vào không phản ứng gì?</strong>
                <br />
                Do môi trường Windows Server và Remote Desktop (RDP) không có card đồ họa vật lý (GPU) và dịch vụ âm thanh (Windows Audio) thường bị vô hiệu hóa, nên bản Scrcpy tiêu chuẩn bị treo ngầm khi gọi DirectX 11 / WASAPI.
                <br />
                <strong>Giải pháp đã tối ưu:</strong> Sử dụng cờ <code style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>--render-driver=software --no-audio</code> (render hoàn toàn bằng CPU) kèm bộ điều hướng <code style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>kds_connect_server.bat</code> giữ cửa sổ báo lỗi rõ ràng nếu có sự cố mạng.
              </div>
            </div>

            {/* Step 1 WinServer: Registry Setup */}
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
                      backgroundColor: '#7C3AED',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}
                  >
                    1
                  </span>
                  Đăng Ký Giao Thức Windows Server (File Registry Chuyên Dụng)
                </div>
                {downloadedServerReg && (
                  <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <CheckCircle size={14} /> Đã tải xuống
                  </span>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                Đăng ký giao thức <code style={{ backgroundColor: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px' }}>scrcpy://</code> và <code style={{ backgroundColor: 'var(--bg-primary)', padding: '1px 4px', borderRadius: '3px' }}>vnc://</code> điều hướng trực tiếp qua kịch bản tối ưu cho Windows Server mà không bị lỗi cấp quyền PowerShell hay chớp tắt cửa sổ.
              </p>

              {/* Password config field - nếu là admin */}
              {canConfigVnc && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #DDD6FE',
                  }}
                >
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Key size={14} style={{ color: '#7C3AED' }} /> Mật khẩu VNC đồng bộ:
                    <span style={{ fontFamily: 'monospace', color: '#7C3AED', fontSize: '13px' }}>{vncPassword}</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    File registry sẽ tự động chèn mật khẩu này vào TightVNC để đăng nhập 1 chạm.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download size={15} />}
                  onClick={handleDownloadServerReg}
                  style={{
                    backgroundColor: '#7C3AED',
                    borderColor: '#7C3AED',
                  }}
                >
                  Tải File vnc_scrcpy_protocol_winserver.reg
                </Button>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  👉 Sau khi tải về: Click đúp chuột vào file &rarr; Chọn <strong>Yes</strong> &rarr; <strong>OK</strong>.
                </span>
              </div>
            </div>

            {/* Step 2 WinServer: Scrcpy WinServer Package */}
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
                  Cài Đặt Bộ Công Cụ Scrcpy WinServer (~6.2 MB)
                </div>
                {downloadedServerScrcpy && (
                  <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <CheckCircle size={14} /> Đã tải xuống
                  </span>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                Đã được tích hợp sẵn file thực thi <code style={{ fontWeight: 600 }}>kds_connect_server.bat</code> và công cụ kiểm tra kết nối <code style={{ fontWeight: 600 }}>test_kds_server.bat</code>.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FileArchive size={15} />}
                  onClick={() => handleDownloadServerScrcpy('zip')}
                  style={{
                    backgroundColor: '#0D9488',
                    borderColor: '#0D9488',
                  }}
                >
                  Tải Gói .ZIP (Khuyên dùng - Windows Server tự mở được)
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Download size={15} />}
                  onClick={() => handleDownloadServerScrcpy('rar')}
                >
                  Tải Bản .RAR (~6.1 MB)
                </Button>
              </div>

              <div
                style={{
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  📂 Hướng dẫn cài đặt vào Windows Server:
                </div>
                1. Mở file nén vừa tải về và giải nén toàn bộ vào thư mục: <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>C:\scrcpy</strong>
                <br />
                2. Kiểm tra các file phải nằm trực tiếp trong thư mục:
                <div style={{ margin: '4px 0 4px 12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  + <code style={{ color: '#059669', fontWeight: 700 }}>C:\scrcpy\kds_connect_server.bat</code> (Kịch bản kết nối tự động)<br />
                  + <code style={{ color: '#2563EB', fontWeight: 700 }}>C:\scrcpy\test_kds_server.bat</code> (Công cụ kiểm tra nhanh)<br />
                  + <code>C:\scrcpy\scrcpy.exe</code> &amp; <code>C:\scrcpy\adb.exe</code>
                </div>
                3. <strong>Kiểm tra thử nghiệm:</strong> Bạn có thể click đúp chuột vào <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>test_kds_server.bat</code>, gõ thử IP KDS (ví dụ: <code style={{ fontFamily: 'monospace' }}>10.8.160.31</code>) để kiểm tra kết nối ngay trên màn hình Server.
              </div>
            </div>

            {/* Step 3 WinServer: Lưu ý bổ sung cho Windows Server 2012 */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <HelpCircle size={20} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Lưu ý kỹ thuật cho Windows Server 2012 / 2012 R2:</strong>
                <br />
                - <strong>Gói Visual C++:</strong> Nếu Scrcpy báo lỗi thiếu file <code>MSVCP140.dll</code> hoặc <code>VCRUNTIME140.dll</code>, hãy cài đặt gói miễn phí <em>Visual C++ Redistributable (x64)</em> của Microsoft trên server.
                <br />
                - <strong>TightVNC:</strong> Vẫn cài đặt vào thư mục mặc định <code style={{ fontFamily: 'monospace' }}>C:\Program Files\TightVNC\tvnviewer.exe</code> để xem màn hình POS và PC Quản Lý.
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
