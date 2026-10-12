import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

export interface StaffOption {
  username: string;
  full_name: string;
  is_app_team?: boolean;
}

interface SearchableStaffSelectProps {
  staffList: StaffOption[];
  value: string;
  onChange: (username: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export const SearchableStaffSelect: React.FC<SearchableStaffSelectProps> = ({
  staffList,
  value,
  onChange,
  placeholder = '-- Chọn nhân viên Team App --',
  disabled = false,
  label,
  required = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return staffList;
    const term = searchTerm.trim().toLowerCase();
    return staffList.filter(
      (s) =>
        s.username.toLowerCase().includes(term) ||
        (s.full_name && s.full_name.toLowerCase().includes(term))
    );
  }, [staffList, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}

      {/* Input search nhanh thành viên */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 10px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm theo tên hoặc username..."
          disabled={disabled}
          style={{
            border: 'none',
            background: 'none',
            outline: 'none',
            fontSize: '12px',
            color: 'var(--text-primary)',
            width: '100%',
          }}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '12px',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown danh sách nhân viên đã được lọc */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        style={{
          width: '100%',
          padding: '7px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {filteredStaff.map((s) => (
          <option key={s.username} value={s.username}>
            {s.full_name} ({s.username})
          </option>
        ))}
        {filteredStaff.length === 0 && (
          <option value="" disabled>
            Không tìm thấy nhân viên phù hợp
          </option>
        )}
      </select>
    </div>
  );
};
