import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { GlobalHotlineOverlay } from '../hotline/GlobalHotlineOverlay';

export const MainLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Tự động đóng sidebar drawer trên mobile khi chuyển trang
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)' }}>
      <Header
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)', position: 'relative' }}>
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main
          className="app-main-content"
          style={{
            flex: 1,
            padding: '24px',
            minWidth: 0,
            overflowX: 'auto',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Phân hệ Hotline 3CX Toàn Ứng Dụng: Tự động popup kết nối VNC/KDS khi có cuộc gọi nhà hàng, thông báo khi có line ngoài */}
      <GlobalHotlineOverlay />
    </div>
  );
};
