import React from 'react';
import { RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { DateInput } from '../../ui/DateInput';
import { ShiftCode } from '../../../types/hotline3cxAuto';

export interface ApplyNowConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  applyDate: string;
  onApplyDateChange: (val: string) => void;
  applyShift: ShiftCode;
  onApplyShiftChange: (shift: ShiftCode) => void;
  executing: boolean;
  onConfirm: () => void;
}

export const ApplyNowConfirmModal: React.FC<ApplyNowConfirmModalProps> = ({
  isOpen,
  onClose,
  applyDate,
  onApplyDateChange,
  applyShift,
  onApplyShiftChange,
  executing,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !executing && onClose()}
      title="Xác Nhận Áp Dụng Ca Trực Vào 3CX Portal Ngay Lập Tức"
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Warning banner */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(217, 119, 6, 0.1)',
            border: '1px solid rgba(217, 119, 6, 0.3)',
            color: '#b45309',
            fontSize: '12.5px',
            lineHeight: 1.5,
          }}
        >
          <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
          <div>
            <strong>LƯU Ý QUAN TRỌNG:</strong> Thao tác này sẽ mở trình duyệt Playwright, đăng nhập cổng 3CX thật, xóa danh sách nhân sự hiện tại trong hàng đợi và <strong>LƯU NGAY LẬP TỨC</strong> danh sách line theo lịch đã thiết lập.
          </div>
        </div>

        {/* Chọn Ngày và Ca */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Ngày Trực Áp Dụng (dd-mm-yyyy) *
            </label>
            <DateInput
              value={applyDate}
              onChange={(val) => onApplyDateChange(val)}
              placeholder="Chọn ngày trực"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Ca Trực Cần Áp Dụng *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => onApplyShiftChange('MORNING')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: applyShift === 'MORNING' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                  backgroundColor: applyShift === 'MORNING' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                  Ca Sáng (06:00)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Day Queue: T2–T6 Song Song
                </div>
              </button>

              <button
                type="button"
                onClick={() => onApplyShiftChange('EVENING')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '4px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: applyShift === 'EVENING' ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                  backgroundColor: applyShift === 'EVENING' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed' }}>
                  Ca Chiều / Tối (16:29)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Night Queue: Chính (1) / Phụ (2)
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={executing}
          >
            Hủy Bỏ
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={executing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#fff',
              cursor: executing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
            }}
          >
            {executing ? (
              <>
                <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Đang Đồng Bộ Portal 3CX (vui lòng chờ)...</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>Xác Nhận Áp Dụng Ngay Vào 3CX</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
