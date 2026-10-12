import React, { useState, useEffect } from 'react';
import { Layers, AlertCircle, Clock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ChecklistTemplate } from '../../types/workChecklist';
import { workChecklistService } from '../../services/workChecklistService';

interface ChecklistTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: ChecklistTemplate | null;
}

const TEMPLATE_CATEGORIES = [
  'Vận hành',
  'Hạ Tầng',
  'Test',
  'Khác',
];

export const ChecklistTemplateModal: React.FC<ChecklistTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const isEditing = Boolean(editItem);

  const [tenSuon, setTenSuon] = useState('');
  const [danhMuc, setDanhMuc] = useState(TEMPLATE_CATEGORIES[0]);
  const [moTa, setMoTa] = useState('');
  const [slaDays, setSlaDays] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setTenSuon(editItem.ten_suon);
        setDanhMuc(editItem.danh_muc || TEMPLATE_CATEGORIES[0]);
        setMoTa(editItem.mo_ta || '');
        setSlaDays(editItem.sla_days || 5);
      } else {
        setTenSuon('');
        setDanhMuc(TEMPLATE_CATEGORIES[0]);
        setMoTa('');
        setSlaDays(5);
      }
      setErrorMsg(null);
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenSuon.trim()) {
      setErrorMsg('Vui lòng nhập tên sườn checklist!');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && editItem) {
        await workChecklistService.updateTemplate(editItem.id, {
          ten_suon: tenSuon.trim(),
          danh_muc: danhMuc,
          mo_ta: moTa.trim() || undefined,
          sla_days: Number(slaDays) || 5,
        });
      } else {
        await workChecklistService.createTemplate({
          ten_suon: tenSuon.trim(),
          danh_muc: danhMuc,
          mo_ta: moTa.trim() || undefined,
          sla_days: Number(slaDays) || 5,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu sườn checklist:', err);
      setErrorMsg(err?.response?.data?.detail || 'Không thể lưu sườn checklist.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} style={{ color: 'var(--color-primary)' }} />
          <span>{isEditing ? 'Chỉnh Sửa Sườn Checklist Mẫu' : 'Thêm Sườn Checklist Mẫu Mới'}</span>
        </div>
      }
      maxWidth="550px"
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

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Tên Sườn Checklist <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={tenSuon}
            onChange={(e) => setTenSuon(e.target.value)}
            placeholder="Ví dụ: Checklist Test version co/so/gpos hoặc Checklist Test món..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Phân Loại / Danh Mục
          </label>
          <select
            value={danhMuc}
            onChange={(e) => setDanhMuc(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              backgroundColor: '#fff',
              outline: 'none',
            }}
          >
            {TEMPLATE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* SLA Mặc định */}
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
              <span>SLA Mặc Định Hoàn Thành (Số Ngày)</span>
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
              Mặc định: {slaDays} ngày
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
                    padding: '5px 12px',
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
                  {days} ngày
                </button>
              );
            })}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12.5px', color: '#4B5563' }}>Tự nhập:</span>
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
            💡 Khi tạo đợt checklist chọn sườn này, hệ thống sẽ tự động gán SLA mặc định này (người tạo có thể tùy chỉnh lại).
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Mô Tả Quy Chuẩn Của Sườn
          </label>
          <textarea
            rows={3}
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            placeholder="Mô tả mục đích và phạm vi áp dụng của sườn checklist này..."
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
            {submitting ? 'Đang Lưu...' : isEditing ? 'Cập Nhật Sườn' : 'Tạo Sườn Mới'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
