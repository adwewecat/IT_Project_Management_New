import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Star,
  Copy,
  Check,
  Download,
  Settings,
  Save,
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

  const loginUrl = 'https://ggg.ringbot.co:5001/#/login';
  const effectiveBaseUrl = serverUrl || window.location.origin;
  const pwaIntegrationUrl = `${effectiveBaseUrl}/api/v1/hotline/3cx-webhook?Number=%CallerNumber%`;
  const webhookUrl = `${effectiveBaseUrl}/api/v1/hotline/3cx-webhook`;

  const handleCopyLink = async () => {
    await copyToClipboard(loginUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPwaUrl = async () => {
    await copyToClipboard(pwaIntegrationUrl);
    setCopiedPwaUrl(true);
    setTimeout(() => setCopiedPwaUrl(false), 2500);
  };

  const handleCopyWebhook = async () => {
    await copyToClipboard(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
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
            <div style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFF', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#15803D', marginBottom: '3px' }}>
                  Bước 3: Dán đường dẫn kết nối vào ô Custom Contact URL
                </div>
                <div style={{ color: '#166534', fontSize: '13px', marginBottom: '8px' }}>
                  Tích chọn <strong>"Auto launch a Custom Contact URL using variables"</strong>, sau đó dán URL sau:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '6px', backgroundColor: '#FFFFFF', border: '1px solid #86EFAC', width: 'fit-content', maxWidth: '100%' }}>
                  <code style={{ fontSize: '12.5px', color: '#15803D', fontWeight: 700, wordBreak: 'break-all' }}>{pwaIntegrationUrl}</code>
                  <button
                    type="button"
                    onClick={handleCopyPwaUrl}
                    title="Sao chép URL"
                    style={{
                      background: '#16A34A',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {copiedPwaUrl ? <Check size={13} /> : <Copy size={13} />}
                    {copiedPwaUrl ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#166534', marginTop: '8px', lineHeight: 1.5 }}>
                  • <strong>Notify When (Khi nào kích hoạt):</strong> Chọn <strong>Ringing</strong> (khi chuông reo) hoặc <strong>Connected</strong> (khi nghe máy).<br />
                  • Bấm <strong>Save (Lưu)</strong> là hoàn tất! Không cần chạy thêm bất cứ file nào.
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
                  href={hotlineService.getDownloadAgentUrl()}
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
