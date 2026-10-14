import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Shield, KeyRound, Sun, Moon, Menu, X as CloseIcon, Headphones, PhoneCall, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useHotline } from '../../contexts/HotlineContext';
import { Button } from '../ui/Button';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

export interface HeaderProps {
  mobileSidebarOpen?: boolean;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mobileSidebarOpen = false,
  onToggleMobileSidebar,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    isHotlineActive,
    toggleHotlineDuty,
    missedHotlineCount,
    openMissedCallsModal,
    openGuideModal,
    canAccessHotline,
  } = useHotline();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const headerStyle: React.CSSProperties = {
    height: '64px',
    backgroundColor: 'var(--bg-primary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  };

  const brandStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontWeight: 700,
    fontSize: '17px',
    color: 'var(--text-primary)',
    textDecoration: 'none',
    cursor: 'pointer',
  };

  const userSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  };

  const userInfoStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    lineHeight: 1.2,
  };

  const roleBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: '2px',
  };

  return (
    <header style={headerStyle} className="header-container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="mobile-sidebar-toggle-btn"
          aria-label="Menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {mobileSidebarOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/restaurants" style={brandStyle}>
          <img
            src="/ggg_logo.png"
            alt="Golden Gate Restaurant Group"
            className="header-brand-logo"
            style={{ height: '38px', width: 'auto', objectFit: 'contain', display: 'block' }}
          />
          <span
            className="brand-version-badge"
            style={{
              fontSize: '11px',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary-text)',
              border: '1px solid var(--color-primary)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontWeight: 600,
            }}
          >
            v2.0 New
          </span>
        </Link>
      </div>

      <div style={userSectionStyle} className="header-user-section">
        {/* Cụm Điều Khiển Hotline 3CX Toàn Ứng Dụng (Chỉ hiển thị cho người có quyền trực) */}
        {canAccessHotline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px' }} className="header-hotline-controls">
            {/* Nút BẬT/TẮT Hotline */}
            <button
              type="button"
              onClick={toggleHotlineDuty}
              className="header-hotline-toggle-btn"
              title={isHotlineActive ? 'Nghe Hotline đang BẬT (Toàn hệ thống) - Nhấn để TẮT' : 'Nghe Hotline đang TẮT - Nhấn để BẬT'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 11px',
                borderRadius: 'var(--radius-full)',
                border: isHotlineActive ? '1px solid #10B981' : '1px solid var(--border-color)',
                backgroundColor: isHotlineActive ? '#ECFDF5' : 'var(--bg-secondary)',
                color: isHotlineActive ? '#065F46' : 'var(--text-secondary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isHotlineActive ? '0 0 8px rgba(16, 185, 129, 0.35)' : 'none',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isHotlineActive ? '#10B981' : '#9CA3AF',
                  boxShadow: isHotlineActive ? '0 0 6px #10B981' : 'none',
                  display: 'inline-block',
                }}
              />
              <Headphones size={14} style={{ color: isHotlineActive ? '#059669' : 'currentColor' }} />
              <span className="header-hotline-text">Hotline: {isHotlineActive ? 'BẬT' : 'TẮT'}</span>
            </button>

            {/* Nút Cuộc Gọi Hotline (Badge) */}
            <button
              type="button"
              onClick={openMissedCallsModal}
              className="header-hotline-calls-btn"
              title="Mở Quản Lý Cuộc Gọi Hotline (Cuộc gọi nhỡ & Lịch sử đã nghe 3 ngày gần nhất)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 10px',
                borderRadius: 'var(--radius-full)',
                border: missedHotlineCount > 0 ? '1px solid #FCA5A5' : '1px solid var(--border-color)',
                backgroundColor: missedHotlineCount > 0 ? '#FEF2F2' : 'var(--bg-secondary)',
                color: missedHotlineCount > 0 ? '#DC2626' : 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <PhoneCall size={14} style={{ color: missedHotlineCount > 0 ? '#EF4444' : 'var(--text-secondary)' }} />
              <span className="header-hotline-text">Cuộc Gọi</span>
              {missedHotlineCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {missedHotlineCount}
                </span>
              )}
            </button>

            {/* Nút Hướng Dẫn & Cấu Hình 3CX */}
            <button
              type="button"
              onClick={openGuideModal}
              className="header-hotline-guide-btn"
              title="Cấu hình 3CX & Hướng Dẫn Nhận Cuộc Gọi Tự Động"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '34px',
                padding: '0 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <HelpCircle size={14} style={{ color: 'var(--color-primary)' }} />
              <span className="header-hotline-text">Cấu hình 3CX</span>
            </button>
          </div>
        )}

        {user && (
          <div style={userInfoStyle} className="header-user-info">
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user.full_name || user.username}
            </span>
            <span style={roleBadgeStyle}>
              <Shield size={12} style={{ color: 'var(--color-primary)' }} />
              {(user.role_name || `Quyền ${user.phanquyen}`)
                .replace(/super\s*admin\s*(\(root\s*tối\s*cao\))?/gi, 'Quản trị viên')
                .replace(/\(root\s*tối\s*cao\)/gi, '')
                .trim()}
            </span>
          </div>
        )}

        {/* Nút chuyển đổi Dark / Light Mode */}
        <button
          type="button"
          onClick={toggleTheme}
          className="header-theme-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            height: '34px',
            padding: '0 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all var(--transition-fast)',
          }}
          title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} color="#F5B800" />
              <span className="header-theme-text">Sáng</span>
            </>
          ) : (
            <>
              <Moon size={16} color="#64748B" />
              <span className="header-theme-text">Tối</span>
            </>
          )}
        </button>

        {user && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPasswordModalOpen(true)}
            leftIcon={<KeyRound size={15} />}
            title="Đổi mật khẩu cá nhân"
            className="header-action-btn"
          >
            <span className="header-btn-text">Đổi Mật Khẩu</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut size={15} />}
          title="Đăng xuất khỏi hệ thống"
          className="header-action-btn"
        >
          <span className="header-btn-text">Đăng Xuất</span>
        </Button>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        username={user?.username}
      />
    </header>
  );
};
