import React, { useState } from 'react';
import { Users, ShieldCheck } from 'lucide-react';
import { UsersPage } from './UsersPage';
import { RolesPage } from './RolesPage';

export const UserManagementHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  const containerStyle: React.CSSProperties = {
    width: '100%',
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  };

  const tabsNavStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    borderBottom: '2px solid var(--border-color)',
    marginBottom: '20px',
  };

  const getTabButtonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: isActive ? 700 : 500,
    color: isActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
    backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
    marginBottom: '-2px',
    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Quản Lý Người Dùng & Phân Quyền</h1>
        <p style={subtitleStyle}>
          Quản trị tài khoản nội bộ và thiết lập ma trận phân quyền chi tiết (Database Test: 172.16.20.103)
        </p>
      </div>

      {/* Tabs Switcher */}
      <div style={tabsNavStyle}>
        <button
          type="button"
          style={getTabButtonStyle(activeTab === 'users')}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} style={{ color: activeTab === 'users' ? 'var(--color-primary)' : 'inherit' }} />
          <span>Danh Sách Người Dùng</span>
        </button>

        <button
          type="button"
          style={getTabButtonStyle(activeTab === 'roles')}
          onClick={() => setActiveTab('roles')}
        >
          <ShieldCheck size={16} style={{ color: activeTab === 'roles' ? 'var(--color-primary)' : 'inherit' }} />
          <span>Nhóm Quyền & Phân Quyền Chi Tiết</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' ? <UsersPage /> : <RolesPage />}
    </div>
  );
};
