import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Check } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  allowClear?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = '-- Chọn --',
  searchPlaceholder = 'Gõ để tìm nhanh...',
  disabled = false,
  error,
  allowClear = true,
  id,
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Normalize string for Vietnamese diacritics-insensitive search
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const normalizedSearch = normalize(searchTerm);
    return options.filter(
      (opt) =>
        normalize(opt.label).includes(normalizedSearch) ||
        normalize(opt.value).includes(normalizedSearch)
    );
  }, [options, searchTerm]);

  const selectedOption = options.find((opt) => opt.value === value);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    position: 'relative',
    ...style,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  };

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    height: '40px',
    padding: '0 12px',
    backgroundColor: disabled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
    color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
    border: `1px solid ${error ? 'var(--color-error)' : isOpen ? 'var(--color-primary)' : 'var(--border-color)'}`,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    transition: 'all var(--transition-fast)',
    opacity: disabled ? 0.6 : 1,
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-lg)',
    zIndex: 1050,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'fadeIn 0.15s ease-in-out',
  };

  const searchBoxStyle: React.CSSProperties = {
    padding: '8px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const searchInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: '13px',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
  };

  const listStyle: React.CSSProperties = {
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '4px 0',
    margin: 0,
    listStyle: 'none',
  };

  const getOptionStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
    color: isSelected ? 'var(--color-primary-text)' : 'var(--text-primary)',
    fontWeight: isSelected ? 600 : 400,
    transition: 'background-color var(--transition-fast)',
  });

  return (
    <div ref={containerRef} style={containerStyle} id={id}>
      {label && <label style={labelStyle}>{label}</label>}

      {/* Select Trigger */}
      <div
        style={triggerStyle}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginRight: '8px',
          }}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {allowClear && value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              style={{
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              title="Xóa lựa chọn"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            style={{
              color: 'var(--text-secondary)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--transition-fast)',
            }}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={dropdownStyle}>
          {/* Search Box */}
          <div style={searchBoxStyle}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={searchInputStyle}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options List */}
          <ul style={listStyle}>
            {/* Clear option if allowed */}
            {allowClear && (
              <li
                style={getOptionStyle(value === '')}
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                onMouseEnter={(e) =>
                  value !== '' && (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')
                }
                onMouseLeave={(e) =>
                  value !== '' && (e.currentTarget.style.backgroundColor = 'transparent')
                }
              >
                <span>{placeholder}</span>
                {value === '' && <Check size={14} />}
              </li>
            )}

            {filteredOptions.length === 0 ? (
              <li
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}
              >
                Không tìm thấy kết quả
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    style={getOptionStyle(isSelected)}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    onMouseEnter={(e) =>
                      !isSelected &&
                      (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')
                    }
                    onMouseLeave={(e) =>
                      !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
