import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Card } from '../components/ui/Card';
import { hasNewScreenAccess, isMobileDevice } from '../utils/authUtils';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      let savedUser: any = null;
      try {
        savedUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      } catch {
        savedUser = null;
      }
      const isMobile = isMobileDevice();
      const hasMobilePermission = hasNewScreenAccess(savedUser, 'mobile_dedicated_view');
      if (isMobile && hasMobilePermission) {
        navigate('/mobile', { replace: true });
      } else {
        navigate('/restaurants', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        username: username.trim(),
        password,
        remember_me: rememberMe,
      });

      // Lấy thông tin user vừa lưu để kiểm tra thiết bị & quyền Mobile
      let loggedUser: any = null;
      try {
        loggedUser = JSON.parse(localStorage.getItem('user_info') || '{}');
      } catch {
        loggedUser = null;
      }
      const isMobile = isMobileDevice();
      const hasMobilePermission = hasNewScreenAccess(loggedUser, 'mobile_dedicated_view');

      if (isMobile && hasMobilePermission) {
        sessionStorage.removeItem('prefer_desktop');
        navigate('/mobile', { replace: true });
        return;
      }

      // Chuyển hướng toàn bộ user vào trang danh sách nhà hàng đầu tiên
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const target = (from && from !== '/dashboard' && from !== '/login') ? from : '/restaurants';
      navigate(target, { replace: true });
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại dịch vụ Backend.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-secondary)',
    padding: '20px',
  };

  const formBoxStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '28px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  };

  const formStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const footerTextStyle: React.CSSProperties = {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  };

  return (
    <div style={containerStyle}>
      <div style={formBoxStyle}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img
            src="/ggg_logo.png"
            alt="Golden Gate Restaurant Group"
            style={{ height: '46px', width: 'auto', objectFit: 'contain' }}
          />
        </div>
        <div style={headerStyle}>
          <h1 style={titleStyle}>Đăng Nhập Hệ Thống</h1>
          <p style={subtitleStyle}>Sử dụng tài khoản nội bộ IT để truy cập</p>
        </div>

        <Card padding="lg">
          {errorMsg && (
            <div style={{ marginBottom: '18px' }}>
              <Alert type="error" message={errorMsg} />
            </div>
          )}

          <form onSubmit={handleSubmit} style={formStyle}>
            <Input
              label="Tên đăng nhập"
              placeholder="VD: dung.nguyenanh hoặc admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              leftIcon={<User size={18} />}
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
            />

            <Input
              label="Mật khẩu"
              placeholder="Nhập mật khẩu của bạn"
              type="password"
              showPasswordToggle
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={18} />}
              autoComplete="current-password"
              disabled={isSubmitting}
            />

            <div style={rowStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', width: '15px', height: '15px', cursor: 'pointer' }}
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              style={{ width: '100%', marginTop: '6px' }}
            >
              Đăng Nhập
            </Button>
          </form>
        </Card>

        <p style={footerTextStyle}>
          &copy; 2026 IT Department
        </p>
      </div>
    </div>
  );
};
