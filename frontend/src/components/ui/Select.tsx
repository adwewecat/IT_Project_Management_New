import React, { forwardRef, useState } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  helperText,
  options,
  id,
  style,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const selectId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

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

  const selectStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    backgroundColor: props.disabled ? 'var(--bg-secondary, #f8fafc)' : 'var(--bg-primary)',
    color: props.disabled ? 'var(--text-secondary, #64748b)' : 'var(--text-primary)',
    border: props.disabled ? '1px dashed var(--border-color, #cbd5e1)' : `1px solid ${error ? 'var(--color-error)' : isFocused ? 'var(--border-focus)' : 'var(--border-color)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    fontSize: '14px',
    boxShadow: isFocused ? `0 0 0 3px ${error ? 'rgba(220, 38, 38, 0.15)' : 'var(--border-focus-shadow)'}` : 'none',
    transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.8 : 1,
    ...style,
  };

  return (
    <div style={containerStyle}>
      {label && <label htmlFor={selectId} style={labelStyle}>{label}</label>}
      <select
        ref={ref}
        id={selectId}
        style={selectStyle}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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

Select.displayName = 'Select';
