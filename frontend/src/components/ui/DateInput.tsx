import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Lock, X } from 'lucide-react';
import { formatDateDDMMYYYY, parseDateToIso } from '../../utils/dateFormat';

export interface DateValidationResult {
  isValid: boolean;
  /** Giá trị chuẩn ISO `YYYY-MM-DD` (dùng cho state / backend API) */
  normalized?: string;
  /** Giá trị hiển thị chuẩn Việt Nam `DD-MM-YYYY` */
  display?: string;
  error?: string;
}

/**
 * Kiểm tra & phân tích chuỗi ngày (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DDMMYYYY, YYYY-MM-DD).
 * Tuyệt đối không diễn giải theo kiểu Mỹ MM-DD-YYYY để tránh nhập nhầm ngày tháng.
 */
export function parseAndValidateDate(val: string): DateValidationResult {
  const res = parseDateToIso(val);
  return {
    isValid: res.isValid,
    normalized: res.iso,
    display: res.display,
    error: res.error,
  };
}

export interface DateInputProps {
  label?: React.ReactNode;
  /** Giá trị truyền vào thường là ISO YYYY-MM-DD (hoặc YYYY-MM-DDTHH:mm:ss) */
  value?: string;
  /** Callback phát ra giá trị chuẩn ISO `YYYY-MM-DD` hoặc `''` để tương thích SQL/API */
  onChange: (value: string) => void;
  /** Callback khi người dùng hoàn tất (blur / chọn lịch / xóa) với giá trị ISO `YYYY-MM-DD` hoặc `''` */
  onBlurValue?: (isoValue: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  min?: string;
  max?: string;
  /** Chế độ thu gọn cho thanh công cụ filter hoặc ô bảng inline */
  compact?: boolean;
  /** Ẩn nút X xóa nhanh (hữu ích cho ô bảng siêu hẹp) */
  hideClear?: boolean;
  /** Style cho container bọc ngoài (VD: width: '145px' trong toolbar flex) */
  containerStyle?: React.CSSProperties;
  /** Style tùy biến cho phần thẻ input */
  style?: React.CSSProperties;
  className?: string;
  title?: string;
}

/**
 * Ô nhập ngày thống nhất toàn hệ thống:
 * - Giao diện LUÔN hiển thị & cho phép nhập theo chuẩn Việt Nam `dd-mm-yyyy` (VD: `13-11-2026`).
 * - Hỗ trợ gõ nhanh `13-11-2026`, `13/11/2026`, `13.11.2026`, `13112026` hoặc chọn từ Popup Lịch.
 * - Nội bộ và API vẫn nhận `YYYY-MM-DD` để giữ nguyên 100% logic lọc & lưu Database.
 */
export const DateInput: React.FC<DateInputProps> = ({
  label,
  value = '',
  onChange,
  onBlurValue,
  error: externalError,
  helperText,
  placeholder = 'dd-mm-yyyy',
  disabled = false,
  required = false,
  id,
  name,
  min,
  max,
  compact = false,
  hideClear = false,
  containerStyle,
  style,
  className,
  title,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [displayText, setDisplayText] = useState<string>(() => formatDateDDMMYYYY(value, ''));
  const textInputRef = useRef<HTMLInputElement>(null);
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  // Ghi nhớ giá trị ISO cuối cùng component tự emit & prop value trước đó
  // (giúp ô bảng onBlurValue lưu async không bị giật về giá trị cũ khi blur)
  const lastEmittedIsoRef = useRef<string | null>(null);
  const prevPropValueRef = useRef<string>(value);

  const inputId =
    id ||
    (typeof label === 'string' && label.trim()
      ? `date-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : undefined);

  // Đồng bộ prop `value` từ bên ngoài -> text hiển thị `dd-mm-yyyy`
  useEffect(() => {
    const propChanged = value !== prevPropValueRef.current;
    prevPropValueRef.current = value;
    if (!propChanged) return;

    const incoming = (value || '').trim();
    const parsedIncoming = parseDateToIso(incoming);
    const normalizedIncoming = parsedIncoming.isValid ? parsedIncoming.iso || '' : '';

    if (
      isFocused &&
      lastEmittedIsoRef.current !== null &&
      normalizedIncoming === lastEmittedIsoRef.current
    ) {
      return;
    }
    lastEmittedIsoRef.current = null;

    if (!incoming) {
      setDisplayText('');
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
      return;
    }

    if (parsedIncoming.isValid && parsedIncoming.display) {
      setDisplayText(parsedIncoming.display);
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
    } else {
      // Nếu parent giữ chuỗi chưa chuẩn, hiển thị nguyên chuỗi để người dùng sửa
      setDisplayText(incoming);
    }
  }, [value, isFocused]);

  const validateRange = (iso: string): string | null => {
    if (!iso) return null;
    if (min) {
      const minRes = parseDateToIso(min);
      if (minRes.isValid && minRes.iso && iso < minRes.iso) {
        return `Ngày tối thiểu là ${minRes.display || formatDateDDMMYYYY(minRes.iso)}`;
      }
    }
    if (max) {
      const maxRes = parseDateToIso(max);
      if (maxRes.isValid && maxRes.iso && iso > maxRes.iso) {
        return `Ngày tối đa là ${maxRes.display || formatDateDDMMYYYY(maxRes.iso)}`;
      }
    }
    return null;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayText(raw);

    if (!raw.trim()) {
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
      lastEmittedIsoRef.current = '';
      onChange('');
      return;
    }

    const res = parseDateToIso(raw);
    if (res.isValid && res.iso) {
      const rangeErr = validateRange(res.iso);
      if (rangeErr) {
        setInternalError(rangeErr);
        textInputRef.current?.setCustomValidity(rangeErr);
        return;
      }
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
      lastEmittedIsoRef.current = res.iso;
      onChange(res.iso);
    } else {
      // Chỉ gắn customValidity để ngăn submit form khi nhập dở/sai; chưa bắn onChange rác lên filter API
      textInputRef.current?.setCustomValidity(res.error || 'Sai định dạng dd-mm-yyyy');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = displayText.trim();
    if (!trimmed) {
      setDisplayText('');
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
      lastEmittedIsoRef.current = '';
      onBlurValue?.('');
      return;
    }

    const res = parseDateToIso(trimmed);
    if (res.isValid && res.iso) {
      const rangeErr = validateRange(res.iso);
      if (rangeErr) {
        setInternalError(rangeErr);
        textInputRef.current?.setCustomValidity(rangeErr);
        return;
      }
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
      if (res.display && res.display !== displayText) {
        setDisplayText(res.display);
      }
      lastEmittedIsoRef.current = res.iso;
      onChange(res.iso);
      onBlurValue?.(res.iso);
    } else {
      const msg = res.error || 'Định dạng không hợp lệ (nhập dd-mm-yyyy).';
      setInternalError(msg);
      textInputRef.current?.setCustomValidity(msg);
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedIso = e.target.value; // Chrome/Firefox date picker luôn phát ra YYYY-MM-DD
    if (!pickedIso) {
      setDisplayText('');
      setInternalError(null);
      textInputRef.current?.setCustomValidity('');
      lastEmittedIsoRef.current = '';
      onChange('');
      onBlurValue?.('');
      return;
    }

    const rangeErr = validateRange(pickedIso);
    if (rangeErr) {
      setInternalError(rangeErr);
      textInputRef.current?.setCustomValidity(rangeErr);
      return;
    }

    const formattedDisplay = formatDateDDMMYYYY(pickedIso, pickedIso);
    setDisplayText(formattedDisplay);
    setInternalError(null);
    textInputRef.current?.setCustomValidity('');
    lastEmittedIsoRef.current = pickedIso;
    onChange(pickedIso);
    onBlurValue?.(pickedIso);
  };

  const openNativePicker = () => {
    if (disabled || !hiddenDateRef.current) return;
    try {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    } catch {
      hiddenDateRef.current.focus();
      hiddenDateRef.current.click();
    }
  };

  const handleClear = () => {
    if (disabled) return;
    setDisplayText('');
    setInternalError(null);
    textInputRef.current?.setCustomValidity('');
    lastEmittedIsoRef.current = '';
    onChange('');
    onBlurValue?.('');
  };

  const activeError = externalError || internalError;

  // Chuẩn hóa giá trị YYYY-MM-DD nạp cho input type="date" ẩn của trình duyệt
  const parsedCurrent = parseDateToIso(displayText || value);
  const pickerIsoValue = parsedCurrent.isValid && parsedCurrent.iso ? parsedCurrent.iso : '';

  const showClearBtn = Boolean(displayText && !disabled && !hideClear);
  const rightPad = disabled ? (compact ? '26px' : '34px') : showClearBtn ? (compact ? '46px' : '58px') : (compact ? '28px' : '38px');

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '4px' : '6px',
        width: compact ? 'auto' : '100%',
        ...containerStyle,
      }}
    >
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: compact ? '12px' : '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {label}
          {required && <span style={{ color: '#EF4444', marginLeft: '3px' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
        <input
          ref={textInputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          value={displayText}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          title={title || 'Nhập theo định dạng Ngày-Tháng-Năm (dd-mm-yyyy), VD: 13-11-2026'}
          style={{
            width: '100%',
            height: compact ? '34px' : '40px',
            padding: `0 ${rightPad} 0 ${compact ? '10px' : '12px'}`,
            backgroundColor: disabled ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary)',
            color: disabled ? 'var(--text-secondary, #64748b)' : 'var(--text-primary)',
            border: disabled
              ? '1px dashed var(--border-color, #cbd5e1)'
              : `1px solid ${activeError ? 'var(--color-error, #DC2626)' : isFocused ? 'var(--border-focus, #F59E0B)' : 'var(--border-color, #cbd5e1)'}`,
            borderRadius: 'var(--radius-md, 6px)',
            outline: 'none',
            fontSize: compact ? '12.5px' : '14px',
            cursor: disabled ? 'not-allowed' : 'text',
            boxShadow: isFocused
              ? `0 0 0 3px ${activeError ? 'rgba(220, 38, 38, 0.15)' : 'var(--border-focus-shadow, rgba(245, 158, 11, 0.15))'}`
              : 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            opacity: disabled ? 0.8 : 1,
            boxSizing: 'border-box',
            ...style,
          }}
        />

        {/* Input calendar ẩn giữ vai trò mở popup chọn ngày theo lịch */}
        {!disabled && (
          <input
            ref={hiddenDateRef}
            type="date"
            value={pickerIsoValue}
            min={min}
            max={max}
            onChange={handlePickerChange}
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: compact ? '6px' : '10px',
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Các nút thao tác bên phải */}
        <div
          style={{
            position: 'absolute',
            right: compact ? '6px' : '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          {showClearBtn && (
            <button
              type="button"
              onClick={handleClear}
              title="Xóa ngày"
              aria-label="Xóa ngày"
              tabIndex={-1}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '4px',
              }}
            >
              <X size={compact ? 12 : 14} />
            </button>
          )}

          {disabled ? (
            <span
              title="Trường bị khóa"
              style={{
                color: 'var(--text-muted, #94a3b8)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
            >
              <Lock size={compact ? 12 : 14} />
            </span>
          ) : (
            <button
              type="button"
              onClick={openNativePicker}
              title="Chọn ngày từ lịch (hiển thị dd-mm-yyyy)"
              aria-label="Mở lịch chọn ngày"
              tabIndex={-1}
              style={{
                background: 'none',
                border: 'none',
                color: isFocused ? 'var(--color-primary, #F59E0B)' : 'var(--text-muted, #64748b)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px',
                borderRadius: '4px',
              }}
            >
              <Calendar size={compact ? 14 : 16} />
            </button>
          )}
        </div>
      </div>

      {activeError ? (
        <span style={{ fontSize: '12px', color: 'var(--color-error, #DC2626)', fontWeight: 500 }}>
          {activeError}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{helperText}</span>
      ) : null}
    </div>
  );
};
