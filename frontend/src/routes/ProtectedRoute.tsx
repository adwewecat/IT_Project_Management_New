import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { checkIsAdmin, hasNewScreenAccess } from '../utils/authUtils';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Yêu cầu quyền cụ thể đối với màn hình mới (Mặc định Admin có toàn quyền, các role khác phải được Admin cấp) */
  requiredPermission?: string;
  /** Giới hạn chỉ riêng tài khoản Quản trị viên (Admin & Super Admin) */
  adminOnly?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  adminOnly = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
          gap: '12px',
        }}
      >
        <span
          style={{
            width: '32px',
            height: '32px',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Đang xác thực phiên làm việc...
        </span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Kiểm tra nếu route chỉ dành riêng cho Admin
  if (adminOnly && !checkIsAdmin(user)) {
    return (
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            padding: '36px 28px',
            borderRadius: '16px',
            border: '1.5px dashed var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#EF4444',
            }}
          >
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Khu Vực Dành Riêng Cho Quản Trị Viên (Admin)
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            Chức năng này hiện chỉ dành riêng cho tài khoản Quản trị viên (Admin). Tài khoản của bạn chưa được cấp quyền truy cập.
          </p>
          <Link
            to="/restaurants"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-primary-text, #111827)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            <Home size={16} />
            <span>Về Danh Sách Nhà Hàng</span>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Quy tắc màn hình mới: Mặc định chỉ Admin thấy & truy cập.
  // Người dùng khác chỉ truy cập được khi đã được Admin phân quyền trong dbo.PHANQUYEN_DETAIL.
  if (requiredPermission && !hasNewScreenAccess(user, requiredPermission)) {
    return (
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '560px',
            width: '100%',
            padding: '36px 28px',
            borderRadius: '16px',
            border: '1.5px dashed var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(245, 184, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#D97706',
            }}
          >
            <ShieldAlert size={36} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            🔒 Giới Hạn Truy Cập Theo Phân Quyền
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
            Màn hình này đang trong giai đoạn quản trị hoặc phân quyền thử nghiệm. Theo quy tắc hệ thống, mặc định chỉ <strong>Quản trị viên (Admin)</strong> mới có quyền truy cập. Nếu bạn cần sử dụng tính năng này, vui lòng liên hệ Admin để được cấp quyền trong mục <em>Quản Lý Phân Quyền</em>.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              <span>Quay lại</span>
            </button>
            <Link
              to="/restaurants"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-text, #111827)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
              }}
            >
              <Home size={16} />
              <span>Về Danh Sách Nhà Hàng</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
