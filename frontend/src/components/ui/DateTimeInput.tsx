import React from 'react';
import { Clock } from 'lucide-react';
import { DateInput } from './DateInput';
import { formatDateDDMMYYYY, parseDateToIso } from '../../utils/dateFormat';

export interface DateTimeInputProps {
  label?: React.ReactNode;
  /** Giá trị ISO datetime `YYYY-MM-DDTHH:mm` hoặc `''` */
  value?: string;
  /** Callback phát ra `YYYY-MM-DDTHH:mm` hoặc `''` */
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  containerStyle?: React.CSSProperties;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

/**
 * Ô nhập Ngày + Giờ 24h thay thế `<input type="datetime-local">`:
 * - Phần ngày LUÔN hiển thị và nhập dạng `dd-mm-yyyy` qua `DateInput`.
 * - Phần giờ chọn 24h (`00`..`23` : `00`..`59`), hoàn toàn không bị hiển thị AM/PM kiểu Mỹ.
 * - Phát ra chuỗi ISO chuẩn `YYYY-MM-DDTHH:mm` để Backend xử lý không đổi.
 */
export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  label,
  value = '',
  onChange,
  disabled = false,
  required = false,
  helperText,
  containerStyle,
}) => {
  // Tách phần ngày (YYYY-MM-DD) và giờ (HH, mm) từ chuỗi ISO
  const raw = (value || '').trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
  const datePart = match ? match[1] : '';
  const hourPart = match?.[2] || '08';
  const minutePart = match?.[3] || '00';

  const emitCombined = (nextDate: string, nextHour: string, nextMin: string) => {
    const cleanDate = (nextDate || '').trim();
    if (!cleanDate) {
      onChange('');
      return;
    }
    const parsed = parseDateToIso(cleanDate);
    if (parsed.isValid && parsed.iso) {
      onChange(`${parsed.iso}T${nextHour}:${nextMin}`);
    }
  };

  const selectStyle: React.CSSProperties = {
    height: '38px',
    width: '46px',
    minWidth: '44px',
    padding: '0 2px',
    borderRadius: 'var(--radius-md, 6px)',
    border: '1px solid var(--border-color, #cbd5e1)',
    backgroundColor: disabled ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    outline: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', ...containerStyle }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {label}
          {required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
        </label>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', width: '100%' }}>
        <div style={{ flex: '1 1 125px', minWidth: '120px' }}>
          <DateInput
            value={datePart}
            onChange={(nextIsoDate) => emitCombined(nextIsoDate, hourPart, minutePart)}
            disabled={disabled}
            required={required}
            placeholder="dd-mm-yyyy"
            title={`Ngày chọn (dd-mm-yyyy): ${datePart ? formatDateDDMMYYYY(datePart) : ''}`}
          />
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            flexShrink: 0,
          }}
          title="Chọn giờ theo định dạng 24h (HH:mm)"
        >
          <Clock size={13} style={{ color: 'var(--text-muted, #64748b)', flexShrink: 0 }} />
          <select
            aria-label="Giờ (24h)"
            value={hourPart}
            disabled={disabled || !datePart}
            onChange={(e) => emitCombined(datePart, e.target.value, minutePart)}
            style={selectStyle}
          >
            {HOURS_24.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
          <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>:</span>
          <select
            aria-label="Phút"
            value={minutePart}
            disabled={disabled || !datePart}
            onChange={(e) => emitCombined(datePart, hourPart, e.target.value)}
            style={selectStyle}
          >
            {MINUTES_60.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {helperText && (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{helperText}</span>
      )}
    </div>
  );
};

