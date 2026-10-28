import React, { useState, useEffect } from 'react';
import { PenTool, CheckCircle2, AlertTriangle, RefreshCw, Eye, Code, FileText } from 'lucide-react';
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
  const [signature, setSignature] = useState<UserEmailSignature>({
    username: '',
    full_name: '',
    job_title: 'IT Application Specialist',
    department: 'GOLDEN GATE GROUP – SOUTH BRANCH',
    office_address: '7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh',
    office_phone: '028 7300 9000 (ext: 8740)',
    mobile: '039 749 5772',
    email: '',
    website: 'www.ggg.com.vn',
    signature_html: '',
    use_custom_html: false,
  });

  const [mode, setMode] = useState<'form' | 'html'>('form');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadSignature();
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  const loadSignature = async () => {
    setLoading(true);
    try {
      const data = await webmailService.getSignature();
      setSignature(data);
      if (data.use_custom_html) {
        setMode('html');
      } else {
        setMode('form');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể tải chữ ký của bạn.');
    } finally {
      setLoading(false);
    }
  };

  // Tạo HTML xem trước dựa trên các trường thông tin form
  const generatePreviewHtml = (): string => {
    if (signature.use_custom_html && signature.signature_html) {
      return signature.signature_html;
    }
    return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #333333; line-height: 1.4; margin-top: 15px;">
  <p style="margin: 0 0 14px 0; color: #555555; font-size: 13px;">Thanks &amp; Best regards,</p>
  
  <table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; font-family: Arial, Helvetica, sans-serif;">
    <tr>
      <td style="padding-bottom: 10px;">
        <img src="/ggg_logo.png" alt="Golden Gate Restaurant Group" width="160" style="display: block; border: 0;" />
      </td>
    </tr>
    <tr>
      <td>
        <div style="font-weight: 800; color: #c58315; font-size: 13.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
          ${signature.department || 'GOLDEN GATE GROUP – SOUTH BRANCH'}
        </div>
        <div style="font-weight: 700; color: #222222; font-size: 14px; margin-bottom: 2px;">
          ${signature.full_name || signature.username || 'Họ và Tên'}
        </div>
        <div style="color: #666666; font-size: 12.5px; margin-bottom: 10px;">
          ${signature.job_title || 'IT Application Specialist'}
        </div>
      </td>
    </tr>
    <tr>
      <td style="border-top: 1px solid #e0e0e0; padding-top: 8px;">
        <table cellpadding="2" cellspacing="0" border="0" style="font-size: 12px; color: #444444;">
          <tr>
            <td style="font-weight: 700; color: #c58315; width: 20px; vertical-align: top;">A</td>
            <td style="color: #444444;">${signature.office_address || '7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">T</td>
            <td style="color: #444444;">${signature.office_phone || '028 7300 9000 (ext: 8740)'}</td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">M</td>
            <td style="color: #444444;"><a href="tel:${signature.mobile || '039 749 5772'}" style="color: #444444; text-decoration: none;">${signature.mobile || '039 749 5772'}</a></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">E</td>
            <td><a href="mailto:${signature.email || signature.username + '@ggg.com.vn'}" style="color: #0066cc; text-decoration: underline;">${signature.email || signature.username + '@ggg.com.vn'}</a></td>
          </tr>
          <tr>
            <td style="font-weight: 700; color: #c58315; vertical-align: top;">W</td>
            <td><a href="http://${signature.website || 'www.ggg.com.vn'}" target="_blank" style="color: #0066cc; text-decoration: underline;">${signature.website || 'www.ggg.com.vn'}</a></td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>
`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload: Partial<UserEmailSignature> = {
        full_name: signature.full_name,
        job_title: signature.job_title,
        department: signature.department,
        office_address: signature.office_address,
        office_phone: signature.office_phone,
        mobile: signature.mobile,
        email: signature.email,
        website: signature.website,
        use_custom_html: mode === 'html',
        signature_html: mode === 'html' ? signature.signature_html : generatePreviewHtml(),
      };

      const updated = await webmailService.updateSignature(payload);
      setSignature(updated);
      setSuccessMessage('Đã lưu chữ ký cá nhân của bạn thành công! Mỗi khi soạn thư mới, chữ ký này sẽ được tự động thêm vào.');
      if (onSignatureSaved) {
        onSignatureSaved(updated.signature_html || '');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể lưu chữ ký.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="840px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PenTool size={20} style={{ color: '#D97706' }} />
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Cài Đặt Chữ Ký Email Của Tôi
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Chữ ký được lưu riêng theo từng tài khoản ({signature.username}) và tự động chèn vào cuối mỗi email khi soạn
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
      <div style={{ padding: '4px 0', fontSize: '13px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px' }} />
            <div>Đang tải chữ ký của bạn...</div>
          </div>
        ) : (
          <div>
            {errorMessage && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  marginBottom: '14px',
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
                  marginBottom: '14px',
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

            {/* Chế độ nhập liệu: Form chuẩn Golden Gate hoặc Code HTML */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <button
                type="button"
                onClick={() => setMode('form')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  backgroundColor: mode === 'form' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                  color: mode === 'form' ? '#FFFFFF' : 'var(--text-primary)',
                }}
              >
                <FileText size={14} />
                <span>Mẫu Chuẩn Golden Gate (Khuyên Dùng)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('html')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  backgroundColor: mode === 'html' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                  color: mode === 'html' ? '#FFFFFF' : 'var(--text-primary)',
                }}
              >
                <Code size={14} />
                <span>Tùy Biến Mã HTML Riêng</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '18px' }}>
              {/* Cột trái: Nhập thông tin */}
              <div>
                {mode === 'form' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                        Họ và tên hiển thị (kèm danh xưng nếu có):
                      </label>
                      <input
                        type="text"
                        value={signature.full_name || ''}
                        onChange={(e) => setSignature({ ...signature, full_name: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        placeholder="Ví dụ: Nguyễn Anh Dũng (Mr)"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                        Chức vụ / Vị trí công tác:
                      </label>
                      <input
                        type="text"
                        value={signature.job_title || ''}
                        onChange={(e) => setSignature({ ...signature, job_title: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        placeholder="Ví dụ: IT Application Team Leader"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                        Bộ phận / Chi nhánh:
                      </label>
                      <input
                        type="text"
                        value={signature.department || ''}
                        onChange={(e) => setSignature({ ...signature, department: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        placeholder="GOLDEN GATE GROUP – SOUTH BRANCH"
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                          Điện thoại di động (M):
                        </label>
                        <input
                          type="text"
                          value={signature.mobile || ''}
                          onChange={(e) => setSignature({ ...signature, mobile: e.target.value })}
                          className="input-field"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          placeholder="039 749 5772"
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                          Điện thoại cơ quan (T):
                        </label>
                        <input
                          type="text"
                          value={signature.office_phone || ''}
                          onChange={(e) => setSignature({ ...signature, office_phone: e.target.value })}
                          className="input-field"
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          placeholder="028 7300 9000 (ext: 8740)"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                        Email cá nhân hiển thị (E):
                      </label>
                      <input
                        type="email"
                        value={signature.email || ''}
                        onChange={(e) => setSignature({ ...signature, email: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        placeholder="dung.nguyenanh@ggg.com.vn"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '3px' }}>
                        Địa chỉ văn phòng (A):
                      </label>
                      <input
                        type="text"
                        value={signature.office_address || ''}
                        onChange={(e) => setSignature({ ...signature, office_address: e.target.value })}
                        className="input-field"
                        style={{ width: '100%', boxSizing: 'border-box' }}
                        placeholder="7th Floor Gigamall, 240-242 Pham Van Dong..."
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Mã nguồn HTML chữ ký email:
                    </label>
                    <textarea
                      rows={14}
                      value={signature.signature_html || ''}
                      onChange={(e) => setSignature({ ...signature, signature_html: e.target.value, use_custom_html: true })}
                      className="input-field"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace',
                        fontSize: '11.5px',
                        lineHeight: 1.4,
                      }}
                      placeholder="Dán mã HTML chữ ký email tại đây..."
                    />
                  </div>
                )}
              </div>

              {/* Cột phải: Xem trước trực tiếp */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  <Eye size={15} style={{ color: '#D97706' }} />
                  <span>Xem Trước Hiển Thị Thời Gian Thực:</span>
                </div>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#222222',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    minHeight: '280px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                    overflowX: 'auto',
                  }}
                  dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                />

                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                  * Mỗi lần bạn mở modal "Soạn thư mới", chữ ký trên sẽ tự động được gắn ở dưới cùng của nội dung email.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
