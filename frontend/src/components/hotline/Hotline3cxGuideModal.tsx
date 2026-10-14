import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Star,
  Copy,
  Check,
  Download,
  Settings,
  Save,
  AlertTriangle,
  PhoneCall,
  Play,
  Monitor,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { hotlineService } from '../../services/hotlineService';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import { copyToClipboard } from '../../utils/clipboard';

interface Hotline3cxGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Hotline3cxGuideModal: React.FC<Hotline3cxGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const isSuperAdmin = checkIsDungOrSuperAdmin(user);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPwaUrl, setCopiedPwaUrl] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Trạng thái thử nghiệm cuộc gọi
  const [testResLoading, setTestResLoading] = useState(false);
  const [testNonResLoading, setTestNonResLoading] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const loginUrl = 'https://ggg.ringbot.co:5001/#/login';
  const effectiveBaseUrl = serverUrl || window.location.origin;
  const currentUsername = (user?.username || '').trim();
  const [customAgent, setCustomAgent] = useState(() => {
    return localStorage.getItem('hotline_my_agent_id') || currentUsername;
  });

  useEffect(() => {
    const saved = localStorage.getItem('hotline_my_agent_id');
    if (saved) {
      setCustomAgent(saved);
    } else if (user?.username) {
      setCustomAgent(user.username.trim());
    }
  }, [user?.username]);

  const handleCustomAgentChange = (val: string) => {
    setCustomAgent(val);
    if (val.trim()) {
      localStorage.setItem('hotline_my_agent_id', val.trim());
    }
  };

  const effectiveAgent = customAgent.trim() || currentUsername;
  const activePwaUrl = effectiveAgent
    ? `${effectiveBaseUrl}/api/v1/hotline/3cx-webhook?Number=%CallerNumber%&Agent=${encodeURIComponent(effectiveAgent)}`
    : `${effectiveBaseUrl}/api/v1/hotline/3cx-webhook?Number=%CallerNumber%`;

  const handleCopyLink = async () => {
    await copyToClipboard(loginUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPwaUrl = async () => {
    await copyToClipboard(activePwaUrl);
    setCopiedPwaUrl(true);
    setTimeout(() => setCopiedPwaUrl(false), 2500);
  };

  // Giả lập cuộc gọi Nhà Hàng
  const handleTestRestaurantCall = async () => {
    setTestResLoading(true);
    setTestFeedback(null);
    try {
      await hotlineService.simulateCall('4391', 'Ashima Nguyễn Trãi (Thử nghiệm)', effectiveAgent);
      setTestFeedback('✅ Đã gửi cuộc gọi giả lập Nhà Hàng! Hãy quan sát chuông reo và popup VNC/KDS.');
      setTimeout(() => setTestFeedback(null), 6000);
    } catch (err: any) {
      setTestFeedback(`❌ Lỗi gửi cuộc gọi thử: ${err?.message || err}`);
    } finally {
      setTestResLoading(false);
    }
  };

  // Giả lập cuộc gọi Nội bộ / Máy nhánh
  const handleTestInternalCall = async () => {
    setTestNonResLoading(true);
    setTestFeedback(null);
    try {
      await hotlineService.simulateCall('8345', `Cuộc gọi thử nghiệm máy ${effectiveAgent}`, effectiveAgent);
      setTestFeedback('✅ Đã gửi cuộc gọi giả lập Nội Bộ! Hãy quan sát chuông reo và popup thông báo đích danh.');
      setTimeout(() => setTestFeedback(null), 6000);
    } catch (err: any) {
      setTestFeedback(`❌ Lỗi gửi cuộc gọi thử: ${err?.message || err}`);
    } finally {
      setTestNonResLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      hotlineService
        .getAgentConfig()
        .then((res) => {
          setServerUrl(res.server_url || window.location.origin);
        })
        .catch(() => {
          setServerUrl(window.location.origin);
        });
    }
  }, [isOpen]);

  const handleSaveServerUrl = async () => {
    if (!serverUrl.trim()) return;
    setIsSavingUrl(true);
    try {
      await hotlineService.updateAgentConfig(serverUrl.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Lỗi lưu Server URL:', err);
      alert('Không thể lưu cấu hình Server URL. Vui lòng thử lại.');
    } finally {
      setIsSavingUrl(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Star size={20} fill="#F59E0B" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Kết Nối Cuộc Gọi 3CX Hotline Với Hệ Thống
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Tự động bắt cuộc gọi Hotline reo chuông và popup điều khiển VNC/KDS từ xa
            </div>
          </div>
        </div>
      }
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <a
            href={loginUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: '#2563EB',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} /> Mở Trang Web 3CX
          </a>
          <Button variant="secondary" onClick={onClose}>
            Đã Hiểu & Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13.5px', lineHeight: 1.5 }}>
        
        {/* Banner giới thiệu */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            fontSize: '13px',
          }}
        >
          🎉 <strong>Hướng dẫn nhận diện cuộc gọi:</strong> Quý Kỹ thuật viên có thể chọn <strong>Lựa chọn 1</strong> (Cài 3CX PWA không cần .bat - Khuyên dùng) hoặc <strong>Lựa chọn 2</strong> (Tải ứng dụng Client Agent chạy trực tiếp trên Windows).
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* LỰA CHỌN 1: 3CX PWA NATIVE (30 GIÂY - KHUYÊN DÙNG NHẤT) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div style={{ border: '1px solid #BBF7D0', borderRadius: '10px', padding: '14px', backgroundColor: '#F0FDF4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <span style={{ fontWeight: 700, color: '#166534', fontSize: '14.5px' }}>
              Lựa chọn 1: Cấu hình trực tiếp trên 3CX PWA (Khuyên dùng - 30 Giây)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Bước 1 */}
            <div style={{ display: 'flex', gap: '10px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #DCFCE7' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Cài ứng dụng 3CX (PWA) trên máy tính của bạn
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '4px' }}>
                  Mở Google Chrome truy cập trang tổng đài 3CX:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', width: 'fit-content', marginBottom: '4px' }}>
                  <code style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>{loginUrl}</code>
                  <button type="button" onClick={handleCopyLink} title="Sao chép link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedLink ? '#10B981' : 'var(--text-secondary)' }}>
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>
                  👉 Nhìn góc phải thanh địa chỉ URL của Chrome, bấm icon <strong>Install App 💻 (Cài đặt ứng dụng 3CX)</strong>.
                </div>
              </div>
            </div>

            {/* Bước 2 */}
            <div style={{ display: 'flex', gap: '10px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #DCFCE7' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Mở Cài đặt Tích hợp (Integration) trên 3CX PWA
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '12px', lineHeight: 1.5 }}>
                  Trong ứng dụng 3CX PWA vừa cài đặt: Bấm biểu tượng <strong>`...` (More)</strong> ở góc trái ➔ <strong>Settings</strong> ➔ <strong>Integration</strong>.
                </div>
              </div>
            </div>

            {/* Bước 3 */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1.5px solid #86EFAC' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#15803D', fontSize: '13.5px', marginBottom: '4px' }}>
                  Dán Đường Dẫn Đích Danh Vào 3CX (Custom Contact URL)
                </div>

                <div style={{ color: '#166534', fontSize: '12.5px', marginBottom: '8px', lineHeight: 1.5 }}>
                  Tích chọn <strong>"Auto launch a Custom Contact URL using variables"</strong>, sau đó dán đường dẫn đích danh của bạn vào:
                </div>

                {/* Ô định danh tài khoản */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1D4ED8', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span>👤 <strong>Định danh Kỹ thuật viên (Agent):</strong></span>
                  <input
                    type="text"
                    value={customAgent}
                    onChange={(e) => handleCustomAgentChange(e.target.value)}
                    placeholder="Username hoặc Số máy nhánh (vd 8740)"
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #93C5FD',
                      fontSize: '12.5px',
                      color: '#1E40AF',
                      fontWeight: 700,
                      width: '230px',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                  <span style={{ color: '#2563EB', fontSize: '11.5px' }}>(Điền Username hoặc số máy nhánh 3CX, ví dụ: <strong>8740</strong>)</span>
                </div>

                {/* Box URL Copy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1.5px solid #16A34A', width: 'fit-content', maxWidth: '100%', marginBottom: '8px' }}>
                  <code style={{ fontSize: '12.5px', color: '#15803D', fontWeight: 700, wordBreak: 'break-all' }}>
                    {activePwaUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyPwaUrl}
                    title="Sao chép URL"
                    style={{
                      background: '#16A34A',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      padding: '5px 12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {copiedPwaUrl ? <Check size={14} /> : <Copy size={14} />}
                    {copiedPwaUrl ? 'Đã sao chép!' : 'Sao Chép URL'}
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.5, marginBottom: '8px' }}>
                  • <strong>Notify When (Khi nào kích hoạt):</strong> Chọn <strong>Ringing</strong> (khi chuông reo).<br />
                  • Bấm <strong>Save (Lưu)</strong> trên 3CX PWA là hoàn tất!
                </div>

                {/* KHU VỰC TEST THỬ NGHIỆM */}
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    marginTop: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#1E40AF', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Play size={14} color="#2563EB" /> 🧪 THỬ NGHIỆM CHUÔNG REO & POPUP TRỰC TIẾP TRÊN MÁY NÀY:
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      type="button"
                      disabled={testResLoading}
                      onClick={handleTestRestaurantCall}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <PhoneCall size={13} />
                      {testResLoading ? 'Đang gửi...' : '1. Thử Cuộc Gọi Nhà Hàng (Mở VNC/KDS)'}
                    </button>

                    <button
                      type="button"
                      disabled={testNonResLoading}
                      onClick={handleTestInternalCall}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <PhoneCall size={13} />
                      {testNonResLoading ? 'Đang gửi...' : '2. Thử Cuộc Gọi Nội Bộ (Bung Popup Đích Danh)'}
                    </button>
                  </div>

                  {testFeedback && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        backgroundColor: testFeedback.startsWith('✅') ? '#DCFCE7' : '#FEE2E2',
                        color: testFeedback.startsWith('✅') ? '#15803D' : '#DC2626',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {testFeedback}
                    </div>
                  )}
                </div>

                {/* Hộp lưu ý cấp quyền pop-up */}
                <div style={{ padding: '8px 10px', borderRadius: '6px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '11.5px', color: '#92400E', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} color="#D97706" /> Lưu ý: Cấp quyền Pop-up cho 3CX PWA
                  </div>
                  Trên cửa sổ 3CX PWA, bấm icon cài đặt trang web bên trái URL ➔ Chọn <strong>Pop-ups and redirects: Allow (Cho phép)</strong> để khi có cuộc gọi trình duyệt tự bung popup kết nối.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* LỰA CHỌN 2: ỨNG DỤNG CLIENT AGENT WINDOWS */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div style={{ border: '1px solid #CBD5E1', borderRadius: '10px', padding: '14px', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Monitor size={18} color="#2563EB" />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14.5px' }}>
              Lựa chọn 2: Ứng dụng Client Agent Windows (Đã sửa sạch lỗi Font)
            </span>
          </div>

          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '10px' }}>
            Bắt thông báo Windows Toast của 3CX PWA. Có sẵn launcher chạy ẩn ngầm không mở màn hình đen:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <a
              href={hotlineService.getDownloadAgentUrl(effectiveAgent)}
              download="3CX_Hotline_Client_Agent.zip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '13px',
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Download size={15} /> Tải 3CX Client Agent (.zip)
            </a>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              (Đã nhúng sẵn Server URL & Định danh KTV: <strong>{effectiveAgent}</strong>)
            </span>
          </div>

          <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.7, backgroundColor: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div>• <strong>Chạy xem tiến trình:</strong> Nhấp đúp vào file <code>Run_3CX_Hotline_Agent.bat</code> (Mở màn hình console theo dõi kết nối trực tiếp)</div>
            <div>• <strong>Chạy ngầm tàng hình (Không hiện CMD):</strong> Nhấp đúp vào file <code>Run_Silent_Agent.vbs</code></div>
            <div>• <strong>Khởi động lại / Làm sạch:</strong> Nhấp đúp vào file <code>Khoi_Dong_Lai_Agent.bat</code></div>
            <div>• <strong>Dừng toàn bộ tiến trình:</strong> Nhấp đúp vào file <code>Dung_Toan_Bo_Agent.bat</code></div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* KHUNG CẤU HÌNH SERVER URL DÀNH CHO SUPER ADMIN */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {isSuperAdmin && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400E', fontWeight: 700, fontSize: '13px' }}>
              <Settings size={15} /> Cấu hình Server URL nhúng sẵn cho toàn bộ hệ thống (Super Admin)
            </div>
            <div style={{ fontSize: '12px', color: '#78350F' }}>
              Server URL này sẽ được tự động nhúng vào gói cài đặt Agent để Kỹ thuật viên tải về mở chạy ngay mà không cần cấu hình thêm:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="vd: http://14.161.33.122:5001"
                style={{
                  flex: 1,
                  minWidth: '260px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D97706',
                  fontSize: '12.5px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#1F2937',
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveServerUrl}
                isLoading={isSavingUrl}
                leftIcon={<Save size={13} />}
                style={{ backgroundColor: '#D97706', borderColor: '#D97706', fontWeight: 600 }}
              >
                Lưu Server URL
              </Button>
              {saveSuccess && (
                <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Đã lưu thành công!
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
