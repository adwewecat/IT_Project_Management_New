import React from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { MonthInput } from '../../ui/MonthInput';

export interface ApplyMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMonth: string;
  onTargetMonthChange: (val: string) => void;
  overwrite: boolean;
  onOverwriteChange: (val: boolean) => void;
  applying: boolean;
  onConfirm: () => void;
}

export const ApplyMonthModal: React.FC<ApplyMonthModalProps> = ({
  isOpen,
  onClose,
  targetMonth,
  onTargetMonthChange,
  overwrite,
  onOverwriteChange,
  applying,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !applying && onClose()}
      title="Áp Dụng Mẫu 7 Ngày Cho Toàn Bộ Tháng"
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Hệ thống sẽ lấy lịch 7 ngày (Thứ Hai đến Chủ Nhật) của tuần hiện tại làm mẫu và điền vào toàn bộ các ngày tương ứng trong tháng được chọn.
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
            Tháng Mục Tiêu (mm-yyyy) *
          </label>
          <MonthInput
            value={targetMonth}
            onChange={(m) => onTargetMonthChange(m)}
            placeholder="mm-yyyy"
          />
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <input
            type="checkbox"
            checked={overwrite}
            onChange={(e) => onOverwriteChange(e.target.checked)}
          />
          <span>Ghi đè lên các ngày đã có cấu hình riêng trong tháng</span>
        </label>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={applying}
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={applying}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {applying ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <ArrowRight size={13} />
            )}
            <span>Thực Hiện Áp Dụng</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
