import React, { useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import { formatMonthMMYYYY, parseMonthToIso } from '../../utils/dateFormat';

export interface MonthInputProps {
  /** Giá trị tháng ISO `YYYY-MM` (VD: `2026-11`) */
  value?: string;
  /** Callback phát ra tháng chuẩn ISO `YYYY-MM` */
  onChange: (isoMonth: string) => void;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}

/**
 * Ô chọn tháng hiển thị `mm-yyyy` (VD: `11-2026`), thay thế `<input type="month">`
 * để tránh trình duyệt hiển thị tiếng Anh `November 2026` hoặc `MM/YYYY` gây nhầm lẫn.
 */
export const MonthInput: React.FC<MonthInputProps> = ({
  value = '',
  onChange,
  disabled = false,
  placeholder = 'mm-yyyy',
  compact = true,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [displayText, setDisplayText] = useState(() => formatMonthMMYYYY(value, ''));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hiddenMonthRef = useRef<HTMLInputElement>(null);
  const lastEmittedRef = useRef<string | null>(null);

  useEffect(() => {
    const parsed = parseMonthToIso(value);
    const norm = parsed.isValid ? parsed.iso || '' : '';
    if (isFocused && lastEmittedRef.current !== null && norm === lastEmittedRef.current) {
      return;
    }
    lastEmittedRef.current = null;
    if (parsed.isValid) {
      setDisplayText(parsed.display || '');
      setErrorMsg(null);
    }
  }, [value, isFocused]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayText(raw);
    if (!raw.trim()) {
      setErrorMsg(null);
      return;
    }
    const parsed = parseMonthToIso(raw);
    if (parsed.isValid && parsed.iso) {
      setErrorMsg(null);
      lastEmittedRef.current = parsed.iso;
      onChange(parsed.iso);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = displayText.trim();
    if (!trimmed) {
      // Nếu rỗng, khôi phục về value hợp lệ gần nhất
      setDisplayText(formatMonthMMYYYY(value, ''));
      setErrorMsg(null);
      return;
    }
    const parsed = parseMonthToIso(trimmed);
    if (parsed.isValid && parsed.iso) {
      setErrorMsg(null);
      if (parsed.display) setDisplayText(parsed.display);
      lastEmittedRef.current = parsed.iso;
      onChange(parsed.iso);
    } else {
      setErrorMsg(parsed.error || 'Nhập tháng dạng mm-yyyy');
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoMonth = e.target.value; // YYYY-MM
    if (!isoMonth) return;
    setDisplayText(formatMonthMMYYYY(isoMonth, isoMonth));
    setErrorMsg(null);
    lastEmittedRef.current = isoMonth;
    onChange(isoMonth);
  };

  const openPicker = () => {
    if (disabled || !hiddenMonthRef.current) return;
    try {
      if (typeof hiddenMonthRef.current.showPicker === 'function') {
        hiddenMonthRef.current.showPicker();
      } else {
        hiddenMonthRef.current.focus();
        hiddenMonthRef.current.click();
      }
    } catch {
      hiddenMonthRef.current.focus();
      hiddenMonthRef.current.click();
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <input
          type="text"
          inputMode="numeric"
          value={displayText}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          title="Nhập tháng theo định dạng mm-yyyy (VD: 11-2026)"
          style={{
            width: compact ? '122px' : '150px',
            height: compact ? '34px' : '38px',
            padding: '0 30px 0 10px',
            borderRadius: '6px',
            border: `1px solid ${errorMsg ? '#DC2626' : isFocused ? 'var(--border-focus, #F59E0B)' : 'var(--border-color)'}`,
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
            boxSizing: 'border-box',
            ...style,
          }}
        />
        {!disabled && (
          <input
            ref={hiddenMonthRef}
            type="month"
            value={value}
            onChange={handlePickerChange}
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: '6px',
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          title="Chọn tháng (hiển thị mm-yyyy)"
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #64748b)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: '3px',
          }}
        >
          <Calendar size={14} />
        </button>
      </div>
      {errorMsg && (
        <span style={{ fontSize: '11px', color: '#DC2626' }}>{errorMsg}</span>
      )}
    </div>
  );
};
