import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PMSoftwareItem } from '../../types/pmBo';
import { pmBoService } from '../../services/pmBoService';

interface PmSoftwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editItem?: PMSoftwareItem | null;
}

export const PmSoftwareModal: React.FC<PmSoftwareModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const isEditing = !!editItem;

  const [projectName, setProjectName] = useState('');
  const [pmName, setPmName] = useState('');
  const [pmPhone, setPmPhone] = useState('');
  const [pmEmail, setPmEmail] = useState('');
  const [ngayTrienKhai, setNgayTrienKhai] = useState('');
  const [noteThem, setNoteThem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setProjectName(editItem.project_name || '');
        setPmName(editItem.pm_name || '');
        setPmPhone(editItem.pm_phone || '');
        setPmEmail(editItem.pm_email || '');
        setNgayTrienKhai(editItem.ngay_trienkhai ? editItem.ngay_trienkhai.slice(0, 10) : '');
        setNoteThem(editItem.note_them || '');
      } else {
        setProjectName('');
        setPmName('');
        setPmPhone('');
        setPmEmail('');
        setNgayTrienKhai('');
        setNoteThem('');
      }
      setErrorMsg(null);
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      setErrorMsg('Vui lòng nhập tên phần mềm / dự án phụ trách!');
      return;
    }

    if (!pmName.trim()) {
      setErrorMsg('Vui lòng nhập tên PM / Quản lý phụ trách!');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && editItem) {
        await pmBoService.updatePmSoftware(editItem.id, {
          project_name: projectName.trim(),
          pm_name: pmName.trim(),
          pm_phone: pmPhone.trim() || undefined,
          pm_email: pmEmail.trim() || undefined,
          ngay_trienkhai: ngayTrienKhai ? `${ngayTrienKhai}T00:00:00` : undefined,
          note_them: noteThem.trim() || undefined,
        });
      } else {
        await pmBoService.createPmSoftware({
          project_name: projectName.trim(),
          pm_name: pmName.trim(),
          pm_phone: pmPhone.trim() || undefined,
          pm_email: pmEmail.trim() || undefined,
          ngay_trienkhai: ngayTrienKhai ? `${ngayTrienKhai}T00:00:00` : undefined,
          note_them: noteThem.trim() || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu thông tin PM phần mềm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Cập Nhật PM Phụ Trách Phần Mềm' : 'Thêm Mới Phần Mềm & PM Phụ Trách'}
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
            {submitting ? 'Đang Lưu...' : isEditing ? 'Cập Nhật' : 'Thêm Phần Mềm'}
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
            <Briefcase size={15} style={{ color: 'var(--color-primary-hover, #DDA600)' }} />
            <span>Tên Phần Mềm Phụ Trách</span>
            <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Ví dụ: SAP, CO/SO, QR Code Order, KDS, App Golden Spoon..."
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 600,
            }}
            required
          />
        </div>

        {/* Tên PM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} style={{ color: 'var(--text-secondary)' }} />
            <span>Tên PM Quản Lý / Phụ Trách</span>
            <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <input
            type="text"
            value={pmName}
            onChange={(e) => setPmName(e.target.value)}
            placeholder="Ví dụ: Nguyễn Thị Mai Hương, Trần Văn A..."
            style={{
              padding: '9px 12px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid var(--border-color, #CBD5E1)',
              backgroundColor: 'var(--bg-primary, #FFFFFF)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
            required
          />
        </div>

        {/* Số điện thoại & Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={15} style={{ color: 'var(--color-success, #16A34A)' }} />
              <span>Số Điện Thoại</span>
            </label>
            <input
              type="text"
              value={pmPhone}
              onChange={(e) => setPmPhone(e.target.value)}
              placeholder="0983xxxxxx"
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={15} style={{ color: 'var(--text-secondary)' }} />
              <span>Email</span>
            </label>
            <input
              type="email"
              value={pmEmail}
              onChange={(e) => setPmEmail(e.target.value)}
              placeholder="pm.name@ggg.com.vn"
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
        </div>

        {/* Ngày triển khai */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
            <span>Ngày Bắt Đầu Triển Khai / Áp Dụng</span>
          </label>
          <input
            type="date"
            value={ngayTrienKhai}
            onChange={(e) => setNgayTrienKhai(e.target.value)}
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

        {/* Ghi chú thêm */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} style={{ color: '#64748B' }} />
            <span>Ghi Chú Thêm</span>
          </label>
          <textarea
            rows={3}
            value={noteThem}
            onChange={(e) => setNoteThem(e.target.value)}
            placeholder="Ghi chú về phạm vi quản lý, đầu mối liên hệ thay thế khi vắng mặt..."
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
      </form>
    </Modal>
  );
};
