import React, { useRef, useState } from 'react';
import { Calendar, Lock, X } from 'lucide-react';

export interface DateValidationResult {
  isValid: boolean;
  normalized?: string; // YYYY-MM-DD
  error?: string;
}

/**
 * Kiểm tra và chuẩn hóa chuỗi ngày tháng
 * Hỗ trợ các định dạng:
 * - YYYY-MM-DD hoặc YYYY/MM/DD
 * - DD/MM/YYYY hoặc DD-MM-YYYY
 */
export function parseAndValidateDate(val: string): DateValidationResult {
  const trimmed = val ? String(val).trim() : '';
  if (!trimmed) {
    return { isValid: true, normalized: '' };
  }

  // Bỏ phần giờ nếu có (ví dụ "2026-09-14 00:00:00")
  const dateOnly = trimmed.split(' ')[0];

  // Regex patterns
  const ymdRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
  const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;

  let year: number;
  let month: number;
  let day: number;

  const ymdMatch = dateOnly.match(ymdRegex);
  const dmyMatch = dateOnly.match(dmyRegex);

  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    return {
      isValid: false,
      error: 'Sai định dạng ngày. Vui lòng nhập YYYY-MM-DD hoặc DD/MM/YYYY (ví dụ: 2026-09-14 hoặc 14/09/2026)',
    };
  }

  // Kiểm tra phạm vi năm
  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      error: `Năm ${year} không hợp lệ (hỗ trợ từ năm 1900 đến 2100)`,
    };
  }

  // Kiểm tra phạm vi tháng
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: `Tháng ${month} không hợp lệ (phải từ 1 đến 12)`,
    };
  }

  // Kiểm tra ngày tối đa của tháng (có tính năm nhuận)
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const maxDays = daysInMonth[month - 1];

  if (day < 1 || day > maxDays) {
    return {
      isValid: false,
      error: `Ngày ${day} không hợp lệ trong tháng ${month}/${year} (tối đa ${maxDays} ngày)`,
    };
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    isValid: true,
    normalized: `${year}-${mm}-${dd}`,
  };
}

export interface DateInputProps {
  label?: React.ReactNode;
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export const DateInput: React.FC<DateInputProps> = ({
  label,
  value = '',
  onChange,
  error: externalError,
  helperText,
  placeholder = 'YYYY-MM-DD hoặc DD/MM/YYYY',
  disabled = false,
  required = false,
  id,
  style,
}) => {
  const [internalError, setInternalError] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const hiddenPickerRef = useRef<HTMLInputElement>(null);

  // Error hiển thị ưu tiên lỗi từ bên ngoài, sau đó là lỗi tự validate
  const displayError = externalError || internalError;

  // Lấy giá trị ISO YYYY-MM-DD cho date picker native
  const getPickerIsoValue = (val: string): string => {
    const res = parseAndValidateDate(val);
    return res.isValid && res.normalized ? res.normalized : '';
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    // Nếu người dùng xóa trống thì xóa lỗi
    if (!newVal.trim()) {
      setInternalError('');
      return;
    }

    // Nếu đã gõ đủ độ dài của một ngày (ít nhất 8 ký tự ví dụ 2026-1-1), thực hiện validate tạm
    if (newVal.trim().length >= 8) {
      const check = parseAndValidateDate(newVal);
      if (!check.isValid) {
        setInternalError(check.error || 'Sai định dạng ngày');
      } else {
        setInternalError('');
      }
    } else {
      setInternalError('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value || !value.trim()) {
      setInternalError('');
      return;
    }

    const check = parseAndValidateDate(value);
    if (!check.isValid) {
      setInternalError(check.error || 'Sai định dạng ngày');
    } else {
      setInternalError('');
      // Tự động chuẩn hóa về YYYY-MM-DD nếu hợp lệ
      if (check.normalized && check.normalized !== value) {
        onChange(check.normalized);
      }
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickedVal = e.target.value; // YYYY-MM-DD từ native picker
    if (pickedVal) {
      onChange(pickedVal);
      setInternalError('');
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInternalError('');
    if (hiddenPickerRef.current) {
      hiddenPickerRef.current.value = '';
    }
  };

  const openDatePicker = () => {
    if (disabled || !hiddenPickerRef.current) return;
    const picker = hiddenPickerRef.current as any;
    try {
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.click();
      }
    } catch {
      try {
        picker.click();
      } catch {
        // Fallback
      }
    }
  };

  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {label}
        </label>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width: '100%',
            height: '40px',
            padding: disabled ? '0 34px 0 12px' : value ? '0 62px 0 12px' : '0 38px 0 12px',
            backgroundColor: disabled ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary)',
            color: disabled ? 'var(--text-secondary, #64748b)' : 'var(--text-primary)',
            border: disabled
              ? '1px dashed var(--border-color, #cbd5e1)'
              : `1px solid ${displayError ? 'var(--color-error, #dc2626)' : isFocused ? 'var(--border-focus, #3b82f6)' : 'var(--border-color)'}`,
            borderRadius: 'var(--radius-md, 6px)',
            outline: 'none',
            fontSize: '14px',
            cursor: disabled ? 'not-allowed' : 'text',
            boxShadow: isFocused
              ? `0 0 0 3px ${displayError ? 'rgba(220, 38, 38, 0.15)' : 'var(--border-focus-shadow, rgba(59, 130, 246, 0.15))'}`
              : 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            opacity: disabled ? 0.8 : 1,
          }}
        />

        {/* Nút Clear nhanh (khi có giá trị và không bị disable) */}
        {!disabled && value && (
          <button
            type="button"
            onClick={handleClear}
            title="Xóa ngày"
            style={{
              position: 'absolute',
              right: '34px',
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '50%',
            }}
          >
            <X size={14} />
          </button>
        )}

        {/* Icon Ổ Khóa khi disabled */}
        {disabled && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              color: 'var(--text-muted, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
            title="Trường này chỉ đọc, không có quyền sửa"
          >
            <Lock size={15} />
          </span>
        )}

        {/* Nút Lịch & Date picker native ẩn */}
        {!disabled && (
          <div
            style={{
              position: 'absolute',
              right: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={openDatePicker}
              title="Bấm để chọn ngày từ lịch"
              style={{
                background: 'none',
                border: 'none',
                color: isFocused ? 'var(--color-primary, #2563eb)' : 'var(--text-muted, #64748b)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '4px',
                transition: 'color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #f1f5f9)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Calendar size={17} />
            </button>

            {/* Hidden native input date */}
            <input
              ref={hiddenPickerRef}
              type="date"
              tabIndex={-1}
              value={getPickerIsoValue(value)}
              onChange={handlePickerChange}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: '32px',
                height: '32px',
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </div>

      {/* Thông báo lỗi định dạng */}
      {displayError && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-error, #dc2626)',
            marginTop: '2px',
            lineHeight: 1.3,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          ⚠️ {displayError}
        </span>
      )}

      {/* Helper text khi không có lỗi */}
      {!displayError && helperText && (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
