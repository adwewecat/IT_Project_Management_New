import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  HelpCircle,
  ExternalLink,
  Download,
  Copy,
  Check,
  CheckCircle2,
  PhoneCall,
  Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

interface HotlineWebSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: string;
  onOpenSimulator?: () => void;
}

export const HotlineWebSetupGuideModal: React.FC<HotlineWebSetupGuideModalProps> = ({
  isOpen,
  onClose,
  currentUser = '',
  onOpenSimulator,
}) => {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Link cài đặt 1-Click Userscript từ backend
  const userJsUrl = `${API_BASE_URL}/hotline/tampermonkey.user.js?duty_user=${encodeURIComponent(currentUser || '')}`;
  const tampermonkeyStoreUrl =
    'https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo';

  const rawScriptCode = `// ==UserScript==
// @name         3CX Web Hotline Auto-Sync
// @namespace    http://ggg.com.vn/
// @version      2.1
// @description  Tu dong bat cuoc goi tu 3CX Web va dong bo len IT Project Management
// @match        https://ggg.ringbot.co:5001/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';
    const SERVER_URL = "${API_BASE_URL}/hotline/call-event";
    const DUTY_USER = "${currentUser || ''}";

    let lastKey = "", lastTime = 0;
    setInterval(() => {
        try {
            const body = document.body ? document.body.innerText : "";
            const isRing = /incoming call|cuộc gọi đến|ringing/i.test(body) ||
                document.querySelector("button[title*='Answer'], button[title*='Trả lời'], .call-btn-answer");
            if (!isRing) return;

            const matches = body.match(/\\b(\\d{2,12})\\b/g) || [];
            const ext = matches.find(m => m.length >= 2 && m.length <= 6 && m !== "5001");
            if (ext) {
                const now = Date.now();
                if (ext !== lastKey || (now - lastTime > 6000)) {
                    lastKey = ext;
                    lastTime = now;
                    GM_xmlhttpRequest({
                        method: "POST",
                        url: SERVER_URL,
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify({
                            ext: ext,
                            caller_raw_text: "3CX Web (" + ext + ")",
                            duty_user: DUTY_USER,
                            is_busy: false
                        })
                    });
                }
            }
        } catch (e) {}
    }, 500);
})();`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(rawScriptCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
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
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HelpCircle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Hướng Dẫn Kết Nối 3CX Web Trực Hotline (2 Bước Nhanh)
            </div>
            <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>
              Thiết lập cho trình duyệt Chrome để tự động nhận cuộc gọi — 100% trên Web, không cần cài phần mềm!
            </div>
          </div>
        </div>
      }
      maxWidth="780px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenSimulator && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<PhoneCall size={14} color="#D97706" />}
                onClick={() => {
                  onClose();
                  onOpenSimulator();
                }}
              >
                Mở Giả Lập Kiểm Thử
              </Button>
            )}
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              style={{
                fontSize: '12px',
                color: '#6B7280',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {showCode ? 'Ẩn mã script nâng cao' : 'Xem mã script kỹ thuật'}
            </button>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Đã Hiểu &amp; Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: 1.6 }}>
        {/* Banner tóm tắt */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Sparkles size={20} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#166534', fontSize: '14px' }}>
              Dành riêng cho máy tính của bạn ({currentUser ? `Line: ${currentUser}` : 'Kỹ thuật viên'})
            </strong>
            <p style={{ margin: '4px 0 0 0', color: '#15803D', fontSize: '12.5px' }}>
              Mỗi kỹ thuật viên chỉ cần thao tác <strong>2 bước bên dưới (chỉ làm 1 lần duy nhất)</strong>.
              Khi nhà hàng gọi vào tài khoản 3CX của bạn, web sẽ reo chuông và <strong>tự động mở popup VNC/KDS</strong> của nhà hàng đó lên màn hình!
            </p>
          </div>
        </div>

        {/* Khối Bước 1 */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#2563EB',
                color: '#FFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              1
            </span>
            <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
              Bước 1: Cài tiện ích Tampermonkey trên Google Chrome (Nếu máy chưa có)
            </strong>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Tiện ích này giúp trình duyệt Chrome tự động đọc số máy lẻ nhà hàng khi 3CX Web reo chuông và báo cho hệ thống.
          </p>
          <div>
            <a
              href={tampermonkeyStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#2563EB',
                color: '#FFF',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              <ExternalLink size={15} />
              Mở Trang Cài Đặt Tampermonkey Trên Chrome Web Store
            </a>
            <span style={{ marginLeft: '12px', fontSize: '12px', color: '#6B7280' }}>
              (Bấm <strong>&quot;Add to Chrome / Thêm vào Chrome&quot;</strong> $\rightarrow$ Xác nhận)
            </span>
          </div>
        </div>

        {/* Khối Bước 2 */}
        <div
          style={{
            border: '2px solid #3B82F6',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            backgroundColor: '#EFF6FF',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#1D4ED8',
                color: '#FFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              2
            </span>
            <strong style={{ fontSize: '14px', color: '#1E3A8A' }}>
              Bước 2: Bấm 1-Click Cài Đặt Tự Động Kết Nối 3CX
            </strong>
          </div>
          <p style={{ margin: 0, color: '#1E40AF' }}>
            Sau khi máy đã có Tampermonkey, bạn chỉ cần bấm nút bên dưới. Trình duyệt sẽ tự động bật trang cài đặt của Tampermonkey với nút <strong>&quot;Install / Cài đặt&quot;</strong>.
          </p>
          <div>
            <a
              href={userJsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#16A34A',
                color: '#FFF',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '13.5px',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.3)',
              }}
            >
              <Download size={16} />
              ⚡ Bấm Vào Đây Để Cài Đặt Tự Động (1-Click Install)
            </a>
          </div>
          <div style={{ fontSize: '12px', color: '#1E40AF', marginTop: '2px' }}>
            👉 <em>Trên trang vừa mở ra, chỉ cần click chuột vào nút <strong>&quot;Cài đặt / Install&quot;</strong> là xong 100%!</em>
          </div>
        </div>

        {/* Khối Bước 3: Hoàn thành */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={20} color="#16A34A" />
          <div style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
            <strong>Bước 3 (Hoàn thành):</strong> Mở tab 3CX Web tại{' '}
            <a
              href="https://ggg.ringbot.co:5001"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563EB', fontWeight: 600 }}
            >
              https://ggg.ringbot.co:5001
            </a>{' '}
            và gạt công tắc <strong>Trực Hotline: BẬT</strong> trên web IT. Mỗi khi có cuộc gọi tới, hệ thống sẽ tự động bắt và kết nối ngay!
          </div>
        </div>

        {/* Khối xem mã script nâng cao (nếu muốn xem) */}
        {showCode && (
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              backgroundColor: '#1E293B',
              color: '#E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>
                Mã nguồn Userscript (Dành cho ai muốn sao chép thủ công):
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  backgroundColor: '#334155',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
              >
                {copied ? <Check size={12} color="#4ADE80" /> : <Copy size={12} />}
                {copied ? 'Đã sao chép!' : 'Sao chép mã'}
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: '11px',
                fontFamily: 'monospace',
                maxHeight: '140px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {rawScriptCode}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};
