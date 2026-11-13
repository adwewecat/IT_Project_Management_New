import React, { useState, useEffect } from 'react';
import {
  Code,
  Tag,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { SoftwareVersionItem } from '../../types/pmBo';
import { pmBoService } from '../../services/pmBoService';

interface SoftwareVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: SoftwareVersionItem | null;
  defaultSoftware?: string;
}

const COMMON_SOFTWARES = [
  'KDS',
  'CO',
  'SO',
  'GPOS-CO-SO',
  'GPOS-KDS',
  'GPOS',
  'PIM',
  'SAP',
];

export const SoftwareVersionModal: React.FC<SoftwareVersionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
  defaultSoftware,
}) => {
  const isEditing = !!editItem;

  const [phanMem, setPhanMem] = useState('KDS');
  const [customPhanMem, setCustomPhanMem] = useState('');
  const [phienBan, setPhienBan] = useState('');
  const [ngayUpdate, setNgayUpdate] = useState('');
  const [noiDungUpdate, setNoiDungUpdate] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        if (COMMON_SOFTWARES.includes(editItem.phan_mem)) {
          setPhanMem(editItem.phan_mem);
          setCustomPhanMem('');
        } else {
          setPhanMem('Khác');
          setCustomPhanMem(editItem.phan_mem);
        }
        setPhienBan(editItem.phien_ban || '');
        setNgayUpdate(editItem.ngay_update ? editItem.ngay_update.slice(0, 10) : '');
        setNoiDungUpdate(editItem.noi_dung_update || '');
        setGhiChu(editItem.ghi_chu || '');
      } else {
        const initial = defaultSoftware || 'KDS';
        if (COMMON_SOFTWARES.includes(initial)) {
          setPhanMem(initial);
          setCustomPhanMem('');
        } else {
          setPhanMem('Khác');
          setCustomPhanMem(initial);
        }
        setPhienBan('');
        const today = new Date().toISOString().slice(0, 10);
        setNgayUpdate(today);
        setNoiDungUpdate('');
        setGhiChu('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, editItem, defaultSoftware]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalSoftware = phanMem === 'Khác' ? customPhanMem.trim() : phanMem;
    if (!finalSoftware) {
      setErrorMsg('Vui lòng chọn hoặc nhập tên phần mềm!');
      return;
    }

    if (!phienBan.trim()) {
      setErrorMsg('Vui lòng nhập phiên bản (version)!');
      return;
    }

    if (!ngayUpdate) {
      setErrorMsg('Vui lòng chọn ngày update phiên bản!');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && editItem) {
        await pmBoService.updateSoftwareVersion(editItem.id, {
          phan_mem: finalSoftware,
          phien_ban: phienBan.trim(),
          ngay_update: `${ngayUpdate}T00:00:00`,
          noi_dung_update: noiDungUpdate.trim() || undefined,
          ghi_chu: ghiChu.trim() || undefined,
        });
      } else {
        await pmBoService.createSoftwareVersion({
          phan_mem: finalSoftware,
          phien_ban: phienBan.trim(),
          ngay_update: `${ngayUpdate}T00:00:00`,
          noi_dung_update: noiDungUpdate.trim() || undefined,
          ghi_chu: ghiChu.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin phiên bản phần mềm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Cập Nhật Phiên Bản Phần Mềm ${editItem?.phan_mem}` : 'Thêm / Cập Nhật Phiên Bản Phần Mềm'}
      maxWidth="600px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Hủy Bỏ
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            leftIcon={<CheckCircle2 size={16} />}
          >
            {submitting ? 'Đang Lưu...' : isEditing ? 'Lưu Thay Đổi' : 'Lưu Phiên Bản'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FEE2E2',
              border: '1px solid #F87171',
              borderRadius: 'var(--radius-md, 6px)',
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

        {/* Tên phần mềm */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Code size={15} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
            <span>Tên Phần Mềm</span>
            <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <select
            value={phanMem}
            onChange={(e) => setPhanMem(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {COMMON_SOFTWARES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="Khác">-- Phần mềm khác --</option>
          </select>

          {phanMem === 'Khác' && (
            <input
              type="text"
              value={customPhanMem}
              onChange={(e) => setCustomPhanMem(e.target.value)}
              placeholder="Nhập tên phần mềm khác..."
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '13px',
                marginTop: '4px',
              }}
              required
            />
          )}
        </div>

        {/* Phiên bản & Ngày Update */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={15} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
              <span>Phiên Bản (Version)</span>
              <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              value={phienBan}
              onChange={(e) => setPhienBan(e.target.value)}
              placeholder="Ví dụ: v2.4.0, 3.1.2..."
              style={{
                padding: '8px 10px',
                borderRadius: 'var(--radius-md, 6px)',
                border: '1px solid var(--border-color, #CBD5E1)',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 700,
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
              <span>Ngày Update</span>
              <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <DateInput
              value={ngayUpdate}
              onChange={setNgayUpdate}
              required
              style={{ height: '38px', fontSize: '13px', fontWeight: 600 }}
            />
          </div>
        </div>

        {/* Nội dung update / Changelog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} style={{ color: 'var(--text-secondary)' }} />
            <span>Nội Dung Cập Nhật / Changelog</span>
          </label>
          <textarea
            rows={4}
            value={noiDungUpdate}
            onChange={(e) => setNoiDungUpdate(e.target.value)}
            placeholder="Mô tả các tính năng mới, bản vá lỗi, cải thiện hiệu năng trong phiên bản này..."
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Ghi chú */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Ghi Chú Triển Khai / Lưu Ý
          </label>
          <input
            type="text"
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            placeholder="Ghi chú áp dụng cho nhà hàng nào hoặc toàn bộ hệ thống..."
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>
      </form>
    </Modal>
  );
};
