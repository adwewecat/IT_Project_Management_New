import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  showPasswordToggle = false,
  type = 'text',
  id,
  style,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const actualType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const inputWrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: leftIcon ? '0 12px 0 38px' : showPasswordToggle ? '0 40px 0 12px' : props.disabled ? '0 34px 0 12px' : '0 12px',
    backgroundColor: props.disabled ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary)',
    color: props.disabled ? 'var(--text-secondary, #64748b)' : 'var(--text-primary)',
    border: props.disabled ? '1px dashed var(--border-color, #cbd5e1)' : `1px solid ${error ? 'var(--color-error)' : isFocused ? 'var(--border-focus)' : 'var(--border-color)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '14px',
    cursor: props.disabled ? 'not-allowed' : 'text',
    boxShadow: isFocused ? `0 0 0 3px ${error ? 'rgba(220, 38, 38, 0.15)' : 'var(--border-focus-shadow)'}` : 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    opacity: props.disabled ? 0.8 : 1,
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '12px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  };

  const toggleButtonStyle: React.CSSProperties = {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  };

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={inputId} style={labelStyle}>{label}</label>}
      <div style={inputWrapperStyle}>
        {leftIcon && <span style={iconStyle}>{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={actualType}
          style={inputStyle}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {showPasswordToggle && (
          <button
            type="button"
            style={toggleButtonStyle}
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {props.disabled && !showPasswordToggle && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              color: 'var(--text-muted, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
            title="Chỉ đọc (Không có quyền chỉnh sửa)"
          >
            <Lock size={14} />
          </span>
        )}
      </div>
      {error ? (
        <span style={{ fontSize: '12px', color: 'var(--color-error)', fontWeight: 500 }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
