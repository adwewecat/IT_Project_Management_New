import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ChecklistTemplate, AppUserOption } from '../../types/workChecklist';
import { workChecklistService } from '../../services/workChecklistService';
import { useAuth } from '../../contexts/AuthContext';

interface CreateChecklistRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (runId: number) => void;
  templates: ChecklistTemplate[];
}

export const CreateChecklistRunModal: React.FC<CreateChecklistRunModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  templates,
}) => {
  const { user } = useAuth();

  const [selectedTemplateId, setSelectedTemplateId] = useState<number>(0);
  const [versionNote, setVersionNote] = useState('');
  const [tenDot, setTenDot] = useState('');
  const [nguoiThucHien, setNguoiThucHien] = useState('');
  const [slaDays, setSlaDays] = useState<number>(5);
  const [ghiChu, setGhiChu] = useState('');
  const [appUsers, setAppUsers] = useState<AppUserOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (templates.length > 0) {
        setSelectedTemplateId(templates[0].id);
        setSlaDays(templates[0].sla_days || 5);
      } else {
        setSlaDays(5);
      }
      setVersionNote('');
      setTenDot('');
      setNguoiThucHien(user?.username || '');
      setGhiChu('');
      setErrorMsg(null);

      // Load danh sách user app để Admin gán việc
      workChecklistService.getAppUsers().then((res) => {
        setAppUsers(res);
      }).catch((err) => {
        console.error('Lỗi tải danh sách app users:', err);
      });
    }
  }, [isOpen, templates, user]);

  // Tự động cập nhật tên đợt khi chọn sườn hoặc gõ version note
  const handleVersionChange = (val: string) => {
    setVersionNote(val);
    const tmpl = templates.find((t) => t.id === selectedTemplateId);
    if (tmpl) {
      setTenDot(`${tmpl.ten_suon} - ${val}`.trim());
    }
  };

  const handleTemplateChange = (tmplId: number) => {
    setSelectedTemplateId(tmplId);
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setTenDot(`${tmpl.ten_suon}${versionNote ? ` - ${versionNote}` : ''}`.trim());
      setSlaDays(tmpl.sla_days || 5);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateId) {
      setErrorMsg('Vui lòng chọn một sườn checklist!');
      return;
    }

    if (!versionNote.trim()) {
      setErrorMsg('Vui lòng nhập nội dung Version để note lại (Ví dụ: v2.4.1.18 Build 16/09)!');
      return;
    }

    if (!nguoiThucHien.trim()) {
      setErrorMsg('Vui lòng chọn User App phụ trách kiểm thử để gán việc!');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await workChecklistService.createRun({
        template_id: selectedTemplateId,
        ten_dot: tenDot.trim() || undefined,
        version_note: versionNote.trim(),
        nguoi_thuc_hien: nguoiThucHien.trim(),
        sla_days: Number(slaDays) || 5,
        ghi_chu: ghiChu.trim() || undefined,
      });

      onSuccess(created.id);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi tạo đợt checklist:', err);
      setErrorMsg(err?.response?.data?.detail || 'Không thể tạo đợt checklist. Vui lòng thử lại!');
    } finally {
      setSubmitting(false);
    }
  };

  const currentTmpl = templates.find((t) => t.id === selectedTemplateId);

  const getDeadlinePreview = () => {
    const d = new Date();
    d.setDate(d.getDate() + (Number(slaDays) || 5));
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListChecks size={20} style={{ color: 'var(--color-primary)' }} />
          <span>Khởi Tạo Đợt Checklist Công Việc Mới</span>
        </div>
      }
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              color: '#B91C1C',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Chọn Sườn Checklist */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Chọn Sườn Checklist <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(Number(e.target.value))}
            required
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              backgroundColor: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.ten_suon} ({tmpl.total_items} mục kiểm tra)
              </option>
            ))}
          </select>
          {currentTmpl && currentTmpl.mo_ta && (
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0 0', fontStyle: 'italic' }}>
              ℹ️ {currentTmpl.mo_ta}
            </p>
          )}
        </div>

        {/* 2. Nhập Version / Ghi chú bản test */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Nội Dung Version Cần Note Lại <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={versionNote}
            onChange={(e) => handleVersionChange(e.target.value)}
            placeholder="Ví dụ: v2.4.1.18 Build 16/09/2026 hoặc Menu Tết 2026 v1.0..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '2px solid var(--color-primary)',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: 'var(--color-primary-subtle)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '3px', display: 'block' }}>
            💡 Ghi rõ số hiệu phiên bản phần mềm, mã build hoặc bản cập nhật để dễ dàng thống kê và truy xuất sau này
          </span>
        </div>

        {/* 3. Tên Đợt Checklist */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Tên Đợt Kiểm Tra
          </label>
          <input
            type="text"
            value={tenDot}
            onChange={(e) => setTenDot(e.target.value)}
            placeholder="Tự động theo sườn và version..."
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13.5px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 4. Gán cho User App phụ trách */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Gán Cho User App Phụ Trách Kiểm Thử <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={nguoiThucHien}
              onChange={(e) => setNguoiThucHien(e.target.value)}
              required
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '13.5px',
                backgroundColor: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="">-- Chọn User App được giao việc --</option>
              {appUsers.map((u) => (
                <option key={u.username} value={u.username}>
                  {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                </option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '3px', display: 'block' }}>
            👤 Chọn tài khoản User App để giao nhiệm vụ kiểm tra version này
          </span>
        </div>

        {/* 5. Thiết lập SLA Hoàn thành */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: '#F9FAFB',
            borderRadius: '8px',
            border: '1px solid #E5E7EB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Clock size={16} style={{ color: 'var(--color-primary-hover)' }} />
              <span>Thời Hạn SLA Hoàn Thành <span style={{ color: '#DC2626' }}>*</span></span>
            </label>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#92400E',
                backgroundColor: '#FFFBEA',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #FCD34D',
              }}
            >
              Hạn chót dự kiến: {getDeadlinePreview()}
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {[1, 3, 5, 7, 10, 14].map((days) => {
              const isSelected = Number(slaDays) === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setSlaDays(days)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--color-primary)' : '#fff',
                    color: isSelected ? '#111827' : '#4B5563',
                    border: isSelected ? '1.5px solid var(--color-primary-hover)' : '1px solid #D1D5DB',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {days} ngày {currentTmpl?.sla_days === days ? '(Mặc định)' : ''}
                </button>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12.5px', color: '#4B5563' }}>Số ngày khác:</span>
              <input
                type="number"
                min={1}
                max={365}
                value={slaDays}
                onChange={(e) => setSlaDays(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '65px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12.5px', color: '#6B7280' }}>ngày</span>
            </div>
          </div>
          <span style={{ fontSize: '11.5px', color: '#6B7280', marginTop: '6px', display: 'block' }}>
            ⏱️ Hệ thống sẽ tự động tính hạn chót và cảnh báo trạng thái: Còn hạn (Xanh), Sắp hết hạn (Vàng), Quá hạn (Đỏ)
          </span>
        </div>

        {/* 6. Ghi chú mục đích */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Ghi Chú Mục Đích / Yêu Cầu Test
          </label>
          <textarea
            rows={3}
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Ghi chú thêm về môi trường test, các tính năng trọng tâm cần chú ý..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '13.5px',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '10px',
            paddingTop: '16px',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy Bỏ
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#111827',
              fontWeight: 600,
              border: 'none',
            }}
          >
            {submitting ? 'Đang Khởi Tạo...' : 'Giao Việc & Tạo Đợt Test'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
