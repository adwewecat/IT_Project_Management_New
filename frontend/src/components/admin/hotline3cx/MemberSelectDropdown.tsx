import React from 'react';
import { Hotline3cxMember } from '../../../types/hotline3cxAuto';

export interface MemberSelectDropdownProps {
  value: string;
  onChange: (val: string) => void;
  activeMembers: Hotline3cxMember[];
  placeholder?: string;
  labelPrefix?: string;
  labelColor?: string;
  containerStyle?: React.CSSProperties;
  selectStyle?: React.CSSProperties;
  disabled?: boolean;
}

export const MemberSelectDropdown: React.FC<MemberSelectDropdownProps> = ({
  value,
  onChange,
  activeMembers,
  placeholder = '-- Chưa chọn --',
  labelPrefix,
  labelColor = '#2563eb',
  containerStyle,
  selectStyle,
  disabled = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        ...containerStyle,
      }}
    >
      {labelPrefix && (
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            color: labelColor,
            whiteSpace: 'nowrap',
            minWidth: '55px',
          }}
        >
          {labelPrefix}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          flex: 1,
          padding: '4px 6px',
          fontSize: '11px',
          borderRadius: '4px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          ...selectStyle,
        }}
      >
        <option value="">{placeholder}</option>
        {activeMembers.map((m) => (
          <option key={m.id} value={m.ext_line}>
            {m.ext_line} — {m.full_name}
          </option>
        ))}
      </select>
    </div>
  );
};
