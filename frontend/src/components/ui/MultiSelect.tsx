import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  badgeBg?: string;
  badgeColor?: string;
  badgeBorder?: string;
}

export interface MultiSelectProps {
  label?: React.ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  allLabel?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  style?: React.CSSProperties;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  values,
  onChange,
  options,
  placeholder = 'Tất Cả Trạng Thái',
  allLabel = 'Tất Cả Trạng Thái',
  disabled = false,
  error,
  id,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Đóng dropdown khi nhấn Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = (val: string) => {
    if (disabled) return;
    const exists = values.includes(val);
    let next: string[];
    if (exists) {
      next = values.filter((v) => v !== val);
    } else {
      next = [...values, val];
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  // Xác định text hiển thị trên Trigger
  const renderTriggerContent = () => {
    if (values.length === 0 || values.length === options.length) {
      return (
        <span style={{ color: values.length === 0 ? 'var(--text-secondary, #6B7280)' : 'var(--text-primary)' }}>
          {allLabel || placeholder}
        </span>
      );
    }

    if (values.length === 1) {
      const opt = options.find((o) => o.value === values[0]);
      if (!opt) return values[0];
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {opt.badgeBg ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: opt.badgeBg,
                color: opt.badgeColor || '#111827',
                border: opt.badgeBorder ? `1px solid ${opt.badgeBorder}` : 'none',
              }}
            >
              {opt.value}
            </span>
          ) : null}
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {opt.label}
          </span>
        </div>
      );
    }

    // Khi chọn từ 2 option trở lên
    const selectedOpts = options.filter((o) => values.includes(o.value));
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            border: '1px solid #FDE68A',
            flexShrink: 0,
          }}
        >
          Đã chọn: {values.length}
        </span>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={selectedOpts.map((o) => o.label).join(', ')}
        >
          {selectedOpts.map((o) => o.value).join(', ')}
        </span>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: '100%',
        position: 'relative',
        ...style,
      }}
    >
      {label && (
        <label
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{label}</span>
          {values.length > 0 && values.length < options.length && (
            <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 700 }}>
              ({values.length}/{options.length})
            </span>
          )}
        </label>
      )}

      {/* Select Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        style={{
          width: '100%',
          height: '40px',
          boxSizing: 'border-box',
          padding: '0 12px',
          backgroundColor: disabled ? 'var(--bg-secondary, #F3F4F6)' : 'var(--bg-primary, #FFFFFF)',
          border: `1px solid ${error ? 'var(--color-error, #EF4444)' : isOpen ? '#F5B800' : 'var(--border-color, #E5E7EB)'}`,
          borderRadius: 'var(--radius-md, 6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(245, 184, 0, 0.18)' : 'none',
          transition: 'all 0.15s ease',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {renderTriggerContent()}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginLeft: '6px' }}>
          {values.length > 0 && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              style={{
                cursor: 'pointer',
                color: 'var(--text-muted, #9CA3AF)',
                background: 'none',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                borderRadius: '4px',
              }}
              title="Đặt lại về Tất Cả Trạng Thái"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-secondary, #6B7280)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid var(--border-color, #E5E7EB)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
            zIndex: 1050,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header toolbar: Chọn tất cả / Bỏ chọn */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#F9FAFB',
              borderBottom: '1px solid #E5E7EB',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '2px 4px',
                borderRadius: '4px',
              }}
            >
              Chọn Tất Cả
            </button>
            <span style={{ color: '#D1D5DB' }}>|</span>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#4B5563',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '2px 4px',
                borderRadius: '4px',
              }}
            >
              Tất Cả Trạng Thái
            </button>
          </div>

          {/* Danh sách Options */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '4px 0' }}>
            {options.map((opt) => {
              const isChecked = values.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleToggle(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: isChecked ? '#FFFBEA' : 'transparent',
                    color: 'var(--text-primary, #111827)',
                    transition: 'background-color 0.12s ease',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked) e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: `1.5px solid ${isChecked ? '#F5B800' : '#D1D5DB'}`,
                        backgroundColor: isChecked ? '#F5B800' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        flexShrink: 0,
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {isChecked && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span style={{ fontWeight: isChecked ? 600 : 400 }}>{opt.label}</span>
                  </div>

                  {opt.badgeBg && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: opt.badgeBg,
                        color: opt.badgeColor || '#111827',
                        border: opt.badgeBorder ? `1px solid ${opt.badgeBorder}` : 'none',
                        flexShrink: 0,
                      }}
                    >
                      {opt.value}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <span style={{ fontSize: '12px', color: 'var(--color-error, #EF4444)', fontWeight: 500 }}>
          {error}
        </span>
      )}
    </div>
  );
};
