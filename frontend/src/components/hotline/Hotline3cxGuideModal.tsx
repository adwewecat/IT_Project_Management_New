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

  const [activeTab, setActiveTab] = useState<'pwa' | 'extension' | 'webhook'>('pwa');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPwaUrl, setCopiedPwaUrl] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
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
  const webhookUrl = `${effectiveBaseUrl}/api/v1/hotline/3cx-webhook`;

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

  const handleCopyWebhook = async () => {
    await copyToClipboard(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
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
      maxWidth="760px"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px', lineHeight: 1.5 }}>
        {/* Bộ nút chuyển đổi Tab giải pháp */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: 'var(--bg-secondary)',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: activeTab === 'pwa' ? 700 : 500,
              backgroundColor: activeTab === 'pwa' ? '#16A34A' : 'transparent',
              color: activeTab === 'pwa' ? '#FFFFFF' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            📱 Tự Cài 3CX PWA (30 Giây - Không Cần .bat)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: activeTab === 'webhook' ? 700 : 500,
              backgroundColor: activeTab === 'webhook' ? '#2563EB' : 'transparent',
              color: activeTab === 'webhook' ? '#FFFFFF' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            ⚡ Webhook PBX Server (Quản Trị Viên)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('extension')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12.5px',
              fontWeight: activeTab === 'extension' ? 700 : 500,
              backgroundColor: activeTab === 'extension' ? '#4B5563' : 'transparent',
              color: activeTab === 'extension' ? '#FFFFFF' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            🔧 Tool Bổ Trợ (Extension / Agent)
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* NỘI DUNG TAB 1: 3CX PWA NATIVE INTEGRATION (30 GIÂY - KHÔNG .BAT) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'pwa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              🎉 <strong>100% Không cần chạy file .bat:</strong> Mỗi User chỉ cần cài ứng dụng <strong>3CX (PWA)</strong> trên máy mình và dán 1 dòng URL vào mục Cài đặt của 3CX. Khi có cuộc gọi reo chuông, 3CX tự động báo về hệ thống Web ngay lập tức!
            </div>

            {/* Bước 1 */}
            <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Bước 1: Cài ứng dụng 3CX (PWA) trên máy tính của bạn
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
                  Mở Google Chrome truy cập trang tổng đài 3CX và đăng nhập máy nhánh:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: 'fit-content', marginBottom: '6px' }}>
                  <code style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>{loginUrl}</code>
                  <button type="button" onClick={handleCopyLink} title="Sao chép link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedLink ? '#10B981' : 'var(--text-secondary)' }}>
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ color: '#059669', fontSize: '12.5px', fontWeight: 600 }}>
                  👉 Nhìn góc phải thanh địa chỉ URL của Chrome, bấm icon <strong>Install App 💻 (Cài đặt ứng dụng 3CX)</strong>.
                </div>
              </div>
            </div>

            {/* Bước 2 */}
            <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Bước 2: Mở Cài đặt Tích hợp (Integration) trên 3CX PWA
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Trong ứng dụng 3CX PWA vừa cài đặt:
                </div>
                <div style={{ color: 'var(--text-primary)', fontSize: '12.5px', marginTop: '4px', lineHeight: 1.6 }}>
                  1. Bấm vào biểu tượng <strong>`...` (More)</strong> ở thanh menu góc bên trái.<br />
                  2. Chọn <strong>Settings (Cài đặt)</strong> ➔ Chọn mục <strong>Integration (Tích hợp)</strong>.
                </div>
              </div>
            </div>

            {/* Bước 3 */}
            <div style={{ display: 'flex', gap: '12px', padding: '14px 16px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#15803D', fontSize: '14px', marginBottom: '6px' }}>
                  Bước 3: Dán Đường Dẫn Đích Danh Vào 3CX (Custom Contact URL)
                </div>

                <div style={{ color: '#166534', fontSize: '13px', marginBottom: '8px', lineHeight: 1.5 }}>
                  Trong 3CX PWA (mục Integration), tích chọn <strong>"Auto launch a Custom Contact URL using variables"</strong>, sau đó dán đường dẫn đích danh của bạn vào:
                </div>

                {/* Ô định danh tài khoản */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1D4ED8', marginBottom: '10px', flexWrap: 'wrap' }}>
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
                  <span style={{ color: '#2563EB', fontSize: '11.5px' }}>(Có thể điền Username hoặc số máy nhánh 3CX, ví dụ: <strong>8740</strong>)</span>
                </div>

                {/* Box URL Copy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1.5px solid #16A34A', width: 'fit-content', maxWidth: '100%', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <code style={{ fontSize: '13px', color: '#15803D', fontWeight: 700, wordBreak: 'break-all' }}>
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
                      padding: '6px 12px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    {copiedPwaUrl ? <Check size={14} /> : <Copy size={14} />}
                    {copiedPwaUrl ? 'Đã sao chép!' : 'Sao Chép URL'}
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: '#166534', lineHeight: 1.6, marginBottom: '12px' }}>
                  • <strong>Notify When (Khi nào kích hoạt):</strong> Chọn <strong>Ringing</strong> (khi chuông reo).<br />
                  • Bấm <strong>Save (Lưu)</strong> trên 3CX PWA là hoàn tất cài đặt!
                </div>

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* KHU VỰC TEST THỬ NGHIỆM CHUÔNG & POPUP 1-CHẠM TRỰC TIẾP */}
                {/* ══════════════════════════════════════════════════════════════ */}
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#EFF6FF',
                    border: '1.5px solid #93C5FD',
                    marginTop: '8px',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E40AF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Play size={15} color="#2563EB" /> 🧪 THỬ NGHIỆM CHUÔNG REO & POPUP TRỰC TIẾP TRÊN MÁY NÀY:
                  </div>
                  <div style={{ fontSize: '12px', color: '#3B82F6', marginBottom: '10px' }}>
                    Bấm các nút dưới đây để kiểm tra hệ thống có tự động reo chuông và bung popup đích danh cho tài khoản <strong>{effectiveAgent}</strong> hay không:
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={testResLoading}
                      onClick={handleTestRestaurantCall}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <PhoneCall size={14} />
                      {testResLoading ? 'Đang gửi...' : '1. Thử Cuộc Gọi Nhà Hàng (Mở VNC/KDS)'}
                    </button>

                    <button
                      type="button"
                      disabled={testNonResLoading}
                      onClick={handleTestInternalCall}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <PhoneCall size={14} />
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

                {/* Hộp lưu ý quan trọng cho máy mới */}
                <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '12px', color: '#92400E', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} color="#D97706" /> 💡 2 ĐIỀU KIỆN ĐỂ TRÌNH DUYỆT TỰ BUNG POPUP KHI CÓ CUỘC GỌI:
                  </div>
                  1. <strong>Cấp quyền Pop-up cho 3CX PWA</strong>: Trên cửa sổ 3CX PWA (<code>{loginUrl}</code>), bấm icon bên trái thanh địa chỉ URL ➔ Site settings ➔ Chọn <strong>Pop-ups and redirects: Allow (Cho phép)</strong>.<br />
                  2. <strong>Mỗi Kỹ Thuật Viên Dùng Link Riêng</strong>: URL trên gắn mã <code>&Agent={effectiveAgent}</code>. Điện thoại máy nào reo thì chỉ máy người đó hiện popup, người cùng ca trực không bị làm phiền!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* NỘI DUNG TAB 2: WEBHOOK 3CX PBX (ZERO INSTALL - TỐT NHẤT) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'webhook' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              🌟 <strong>Giải pháp chuẩn doanh nghiệp (Khuyên dùng nhất):</strong> Cấu hình trực tiếp trên Máy chủ Tổng đài 3CX PBX. <strong>Máy tính của nhân viên không cần cài đặt bất kỳ phần mềm nào</strong>, cuộc gọi tự động đẩy về hệ thống Web 24/7!
            </div>

            <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Đăng nhập 3CX Management Console (Quyền Admin tổng đài)
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Truy cập trang quản trị 3CX của công ty: <code>https://ggg.ringbot.co:5001</code> với tài khoản Quản trị viên (PBX Admin).
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '3px' }}>
                  Cấu hình CRM Integration / Server-side Webhook
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                  Vào mục <strong>Settings (Cài đặt) ➔ CRM ➔ Server Side CRM Integration</strong> (hoặc Call Flow Webhook) và điền URL sau:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', width: 'fit-content', maxWidth: '100%' }}>
                  <code style={{ fontSize: '12.5px', color: '#16A34A', fontWeight: 700, wordBreak: 'break-all' }}>{webhookUrl}</code>
                  <button type="button" onClick={handleCopyWebhook} title="Sao chép Webhook URL" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedWebhook ? '#10B981' : 'var(--text-secondary)' }}>
                    {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  👉 Method: <strong>POST</strong> hoặc <strong>GET</strong>. Tham số: <code>Number</code> (Số điện thoại), <code>CallType</code> (Inbound / Missed).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* NỘI DUNG TAB 3: CÁC TOOL BỔ TRỢ (CHROME EXTENSION & AGENT WINDOWS) */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'extension' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* LỰA CHỌN 1: CHROME EXTENSION */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '15px' }}>🌐</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                  Lựa chọn 1: Tiện ích mở rộng Google Chrome (Không cần .bat)
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                Chạy trực tiếp trên trình duyệt Chrome. Mỗi khi có cuộc gọi reo trên tab 3CX Web Client, extension tự động báo về Server mà không cần mở cửa sổ console đen:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <a
                  href={hotlineService.getDownloadExtensionUrl()}
                  download="3CX_Chrome_Extension.zip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={14} /> Tải Tiện Ích Chrome Extension (.zip)
                </a>
                <a
                  href={hotlineService.getDownloadUserscriptUrl()}
                  download="3cx_hotline_userscript.user.js"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#4B5563',
                    color: '#FFFFFF',
                    fontWeight: 600,
                    fontSize: '12.5px',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={14} /> Tải Userscript (.js)
                </a>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                👉 <strong>Cách cài:</strong> Mở <code>chrome://extensions</code> ➔ Bật <strong>Developer mode</strong> ➔ Chọn <strong>Load unpacked</strong> chỉ vào thư mục vừa giải nén.
              </div>
            </div>

            {/* LỰA CHỌN 2: WINDOWS AGENT */}
            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '15px' }}>💻</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                  Lựa chọn 2: Ứng dụng Client Agent Windows (Đã sửa sạch lỗi Font)
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '8px' }}>
                Bắt thông báo Windows Toast của 3CX PWA. Có sẵn launcher chạy ẩn ngầm không mở màn hình đen:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <a
                  href={hotlineService.getDownloadAgentUrl(user?.username)}
                  download="3CX_Hotline_Client_Agent.zip"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    textDecoration: 'none',
                  }}
                >
                  <Download size={14} /> Tải 3CX Client Agent (.zip)
                </a>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                • <strong>Chạy ngầm tàng hình (Không hiện CMD):</strong> Nhấp đúp vào file <code>Run_Silent_Agent.vbs</code><br />
                • <strong>Chạy xem tiến trình:</strong> Nhấp đúp vào file <code>Run_3CX_Hotline_Agent.bat</code>
              </div>
            </div>
          </div>
        )}

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
              Server URL này sẽ được tự động nhúng vào Chrome Extension, Userscript và file Agent để toàn bộ User tải về sử dụng ngay:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="vd: http://192.168.1.50:8000 hoặc https://itpm.ggg.com.vn"
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
