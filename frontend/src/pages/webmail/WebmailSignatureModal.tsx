import React, { useState, useEffect, useRef } from 'react';
import {
  PenTool,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bold,
  Italic,
  Underline,
  Link as LinkIcon,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { webmailService, UserEmailSignature } from '../../services/webmailService';

interface WebmailSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureSaved?: (signatureHtml: string) => void;
}

export const WebmailSignatureModal: React.FC<WebmailSignatureModalProps> = ({
  isOpen,
  onClose,
  onSignatureSaved,
}) => {
  const [signature, setSignature] = useState<UserEmailSignature | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  // Mẫu chuẩn Golden Gate mặc định nếu người dùng muốn chèn nhanh
  const getDefaultSignatureTemplate = (
    fullName: string = '',
    username: string = '',
    jobTitle: string = 'IT Application Specialist',
    mobile: string = '039 749 5772'
  ) => {
    const displayName = fullName || username || 'Nguyễn Anh Dũng (Mr)';
    const displayEmail = username ? `${username}@ggg.com.vn` : 'dung.nguyenanh@ggg.com.vn';

    return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333; line-height: 1.4; margin-top: 20px;">
  <p style="margin: 0 0 16px 0; color: #555555; font-size: 13px;">Thanks &amp; Best regards,</p>
  
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
    <tr>
      <td style="padding-bottom: 12px;" colspan="5">
        <img src="https://itdept.ggg.com.vn/ggg_logo.png" alt="Golden Gate Restaurant Group" width="160" style="display: block; border: 0;" onerror="this.src='/ggg_logo.png';" />
      </td>
    </tr>
    <tr>
      <td colspan="5">
        <div style="font-weight: 800; color: #c58315; font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          GOLDEN GATE GROUP – SOUTH BRANCH
        </div>
        <div style="font-weight: 700; color: #222222; font-size: 14px; margin-bottom: 2px;">
          ${displayName}
        </div>
        <div style="color: #666666; font-size: 12.5px; margin-bottom: 14px;">
          ${jobTitle}
        </div>
      </td>
    </tr>
    <tr>
      <td style="border-top: 1px solid #e0e0e0; padding-top: 10px;" colspan="5">
        <table cellpadding="3" cellspacing="0" border="0" style="font-size: 12px; color: #333333; border-collapse: collapse;">
          <tr>
            <td style="font-weight: 700; color: #c58315; width: 22px; vertical-align: top;">A</td>
            <td style="color: #444444; vertical-align: top; max-width: 320px; line-height: 1.4;">
              7th Floor Gigamall, 240-242 Pham Van Dong<br />Hiep Binh Chanh, Thu Duc, Ho Chi Minh
            </td>
            <td style="width: 35px;">&nbsp;</td>
            <td style="font-weight: 700; color: #c58315; width: 22px; vertical-align: top;">M</td>
            <td style="color: #444444; vertical-align: top;">
              <a href="tel:${mobile}" style="color: #333333; text-decoration: none;">${mobile}</a>
            </td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">T</td>
            <td style="color: #444444; vertical-align: top;">028 7300 9000 (ext: 8740)</td>
            <td>&nbsp;</td>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">E</td>
            <td style="vertical-align: top;">
              <a href="mailto:${displayEmail}" style="color: #0066cc; text-decoration: underline;">${displayEmail}</a>
            </td>
          </tr>
          <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">W</td>
            <td style="vertical-align: top;">
              <a href="http://www.ggg.com.vn" target="_blank" style="color: #0066cc; text-decoration: underline;">www.ggg.com.vn</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`;
  };

  // Nạp chữ ký của user từ backend khi mở modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      loadSignature();
    }
  }, [isOpen]);

  const loadSignature = async () => {
    setLoading(true);
    try {
      const data = await webmailService.getSignature();
      setSignature(data);

      setTimeout(() => {
        if (editorRef.current) {
          if (data.signature_html && data.signature_html.trim()) {
            editorRef.current.innerHTML = data.signature_html;
          } else {
            // Khởi tạo mẫu mặc định chuẩn Golden Gate
            editorRef.current.innerHTML = getDefaultSignatureTemplate(
              data.full_name,
              data.username,
              data.job_title,
              data.mobile
            );
          }
        }
      }, 50);
    } catch (err: any) {
      console.error('Lỗi tải chữ ký:', err);
      // Nếu API lỗi tạm thời, vẫn cho phép mở khung để user tự do dán chữ ký vào
      if (editorRef.current) {
        editorRef.current.innerHTML = getDefaultSignatureTemplate();
      }
    } finally {
      setLoading(false);
    }
  };

  // Các thao tác định dạng cơ bản
  const formatText = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleTextColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const handleInsertLink = () => {
    const url = prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url && url !== 'https://') {
      document.execCommand('createLink', false, url);
    }
  };

  // Nút chèn lại mẫu chuẩn Golden Gate
  const handleInsertDefaultTemplate = () => {
    if (window.confirm('Bạn có muốn chèn lại mẫu chữ ký chuẩn Golden Gate vào khung soạn thảo không?')) {
      if (editorRef.current) {
        editorRef.current.innerHTML = getDefaultSignatureTemplate(
          signature?.full_name,
          signature?.username,
          signature?.job_title,
          signature?.mobile
        );
        editorRef.current.focus();
      }
    }
  };

  // Nút xóa trắng toàn bộ khung để dán chữ ký mới từ Outlook
  const handleClearEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p><br></p>';
      editorRef.current.focus();
    }
  };

  // Xử lý lưu chữ ký
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentHtml = editorRef.current?.innerHTML || '';

    if (!currentHtml || currentHtml === '<p><br></p>') {
      setErrorMessage('Nội dung chữ ký đang trống. Vui lòng dán chữ ký từ Outlook hoặc nhập nội dung chữ ký.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload: Partial<UserEmailSignature> = {
        signature_html: currentHtml,
        use_custom_html: true,
      };

      const updated = await webmailService.updateSignature(payload);
      setSignature(updated);
      setSuccessMessage('Đã lưu chữ ký cá nhân của bạn thành công! Mỗi khi soạn email mới, chữ ký này sẽ được tự động gắn vào cuối email.');

      if (onSignatureSaved) {
        onSignatureSaved(updated.signature_html || currentHtml);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể lưu chữ ký. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const toolbarBtnStyle: React.CSSProperties = {
    padding: '5px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="860px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <PenTool size={18} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cài Đặt Chữ Ký Email Của Tôi
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Chữ ký lưu riêng theo tài khoản ({signature?.username || 'Bạn'}) và tự động gắn vào cuối email khi soạn
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Đóng
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={saving}>
            Lưu Chữ Ký Của Tôi
          </Button>
        </div>
      }
    >
      <div style={{ padding: '2px 0', fontSize: '13px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
            <div>Đang tải chữ ký của bạn...</div>
          </div>
        ) : (
          <div>
            {/* Thông báo lỗi */}
            {errorMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '12px',
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

            {/* Thông báo thành công */}
            {successMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#10B981',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '12px',
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

            {/* Hướng dẫn sao chép & dán thông minh từ Outlook */}
            <div
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontSize: '18px', lineHeight: 1 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div>
                  <strong>Cách cài đặt cực kỳ đơn giản:</strong> Mở Outlook hoặc email có chữ ký của bạn,{' '}
                  <span style={{ color: '#2563EB', fontWeight: 700 }}>bôi đen toàn bộ chữ ký</span> rồi nhấn{' '}
                  <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '12px', fontWeight: 600 }}>Ctrl + C</kbd>.{' '}
                  Sau đó click chuột vào khung bên dưới và nhấn{' '}
                  <kbd style={{ backgroundColor: '#FFFFFF', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '12px', fontWeight: 600 }}>Ctrl + V</kbd>.
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  ✨ Hệ thống sẽ <strong>tự động giữ nguyên 100% định dạng</strong> (màu vàng Golden Gate, in đậm, bảng cột, link email/web, logo...). Bạn cũng có thể click trực tiếp vào chữ trong khung để sửa số điện thoại, sửa tên nhanh chóng.
                </div>
              </div>
            </div>

            {/* Thanh công cụ định dạng & hành động nhanh */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderBottom: 'none',
                borderRadius: '8px 8px 0 0',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '6px',
              }}
            >
              {/* Định dạng văn bản */}
              <button
                type="button"
                onClick={() => formatText('bold')}
                title="In đậm (Bold)"
                style={toolbarBtnStyle}
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => formatText('italic')}
                title="In nghiêng (Italic)"
                style={toolbarBtnStyle}
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={() => formatText('underline')}
                title="Gạch chân (Underline)"
                style={toolbarBtnStyle}
              >
                <Underline size={14} />
              </button>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

              {/* Màu chữ nhanh */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span
                  onClick={() => handleTextColor('#c58315')}
                  style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: '#c58315', cursor: 'pointer', border: '1px solid #b45309' }}
                  title="Vàng Golden Gate (#c58315)"
                />
                <span
                  onClick={() => handleTextColor('#222222')}
                  style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: '#222222', cursor: 'pointer', border: '1px solid #000' }}
                  title="Đen (#222222)"
                />
                <span
                  onClick={() => handleTextColor('#0066cc')}
                  style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: '#0066cc', cursor: 'pointer', border: '1px solid #004499' }}
                  title="Xanh liên kết (#0066cc)"
                />
                <span
                  onClick={() => handleTextColor('#666666')}
                  style={{ width: '14px', height: '14px', borderRadius: '3px', backgroundColor: '#666666', cursor: 'pointer', border: '1px solid #444' }}
                  title="Xám (#666666)"
                />
              </div>

              <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 4px' }} />

              <button
                type="button"
                onClick={handleInsertLink}
                title="Chèn / Sửa liên kết (URL)"
                style={toolbarBtnStyle}
              >
                <LinkIcon size={14} />
              </button>

              <button
                type="button"
                onClick={() => formatText('removeFormat')}
                title="Xóa định dạng đang chọn"
                style={toolbarBtnStyle}
              >
                <RotateCcw size={14} />
              </button>

              <div style={{ flex: 1 }} />

              {/* Các nút hành động phụ trợ */}
              <button
                type="button"
                onClick={handleInsertDefaultTemplate}
                title="Khôi phục lại mẫu chuẩn Golden Gate ban đầu"
                style={{
                  ...toolbarBtnStyle,
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#D97706',
                  backgroundColor: 'rgba(217, 119, 6, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '5px',
                }}
              >
                <Sparkles size={13} />
                <span>Dán Mẫu Chuẩn Golden Gate</span>
              </button>

              <button
                type="button"
                onClick={handleClearEditor}
                title="Xóa sạch khung để bấm Ctrl+V dán chữ ký mới từ Outlook"
                style={{
                  ...toolbarBtnStyle,
                  gap: '4px',
                  fontSize: '12px',
                  color: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  padding: '4px 10px',
                  borderRadius: '5px',
                }}
              >
                <Trash2 size={13} />
                <span>Xóa trắng để dán lại</span>
              </button>
            </div>

            {/* Khung Soạn Thảo / Dán Chữ Ký WYSIWYG */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                color: '#222222',
                border: '1px solid var(--border-color)',
                borderRadius: '0 0 8px 8px',
                padding: '18px 22px',
                minHeight: '280px',
                maxHeight: '440px',
                overflowY: 'auto',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.04)',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  outline: 'none',
                  minHeight: '240px',
                }}
              />
            </div>

            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic', display: 'flex', justifyContent: 'space-between' }}>
              <span>* Nội dung hiển thị trong khung trên chính là nội dung sẽ được tự động gắn vào cuối email của bạn.</span>
              <span>Hỗ trợ ảnh logo, bảng biểu, màu sắc &amp; font chữ.</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
