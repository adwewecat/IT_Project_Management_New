import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Shield,
  Server,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ListChecks,
  FileText,
  Database,
  Store,
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DbConfigModal } from '../components/admin/DbConfigModal';
import { PersonalTaskManager } from '../components/dashboard/PersonalTaskManager';
import { DailyPendingTasksModal } from '../components/dashboard/DailyPendingTasksModal';
import { dashboardService, PendingSummaryResponse } from '../services/dashboardService';
import apiClient from '../services/api';

interface HealthData {
  status: string;
  app_name: string;
  database: {
    server: string;
    port?: number;
    name?: string;
    user?: string;
    connected: boolean;
  };
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDbConfigOpen, setIsDbConfigOpen] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'tasks'>('overview');

  // Pending summary state
  const [pendingSummary, setPendingSummary] = useState<PendingSummaryResponse | null>(null);
  const [loadingPending, setLoadingPending] = useState(false);
  const [viewScope, setViewScope] = useState<'my' | 'total'>('my');
  const [showDailyPopup, setShowDailyPopup] = useState<boolean>(false);

  const rawRoles = user?.roles || (user?.phanquyen ? user.phanquyen.split(',').map((s) => s.trim().toLowerCase()) : []);
  const isSuperAdmin = !!(
    user?.is_super_admin ||
    user?.username?.toLowerCase() === 'dung.nguyenanh' ||
    user?.username?.toLowerCase() === 'admin' ||
    user?.username?.toLowerCase() === 'administrator' ||
    String(user?.phanquyen || '').trim() === '0'
  );
  const isAdmin = isSuperAdmin || rawRoles.includes('admin') || rawRoles.includes('1') || user?.phanquyen === '1';
  const isDungOrSuperAdmin = isSuperAdmin || user?.username?.toLowerCase() === 'dung.nguyenanh';
  const isAppRole = rawRoles.some((r) => r === '2' || r === 'app') || user?.phanquyen === '2';
  const canViewAppPending = isAppRole || isAdmin || isDungOrSuperAdmin;
  const shouldShowDailyNotice = isAppRole || isDungOrSuperAdmin || isSuperAdmin;

  const loadPendingSummary = () => {
    if (!canViewAppPending) return;
    setLoadingPending(true);
    dashboardService
      .getPendingSummary()
      .then((res) => {
        setPendingSummary(res);
        if (res.is_admin) {
          setViewScope('total');
        }

        // Tự động kiểm tra popup nhiệm vụ đầu ngày cho User App, dung.nguyenanh và Super Admin
        if (shouldShowDailyNotice) {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          const currentUsername = (user?.username || 'anonymous').toLowerCase().trim();
          const storageKey = `daily_pending_popup_${currentUsername}_${todayStr}`;
          const hasSeenToday = localStorage.getItem(storageKey);

          const isPrivileged = isDungOrSuperAdmin || isSuperAdmin;
          const pendingCount = isPrivileged
            ? ((res.items?.checklist?.total || 0) +
               (res.items?.memo?.total || 0) +
               (res.items?.pim?.total || 0) +
               (res.items?.projects?.total || 0) +
               (res.items?.setup_nh?.total || 0) +
               (res.items?.incidents?.total || 0))
            : ((res.items?.checklist?.my || 0) +
               (res.items?.memo?.my || 0) +
               (res.items?.pim?.my || 0) +
               (res.items?.projects?.my || 0) +
               (res.items?.setup_nh?.my || 0) +
               (res.items?.incidents?.my || 0));

          if (!hasSeenToday && pendingCount > 0) {
            setShowDailyPopup(true);
          }
        }
      })
      .catch((err) => console.error('Lỗi tải pending summary:', err))
      .finally(() => setLoadingPending(false));
  };

  const handleCloseDailyPopup = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentUsername = (user?.username || 'anonymous').toLowerCase().trim();
    const storageKey = `daily_pending_popup_${currentUsername}_${todayStr}`;
    localStorage.setItem(storageKey, 'true');
    setShowDailyPopup(false);
  };


  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const resp = await apiClient.get<HealthData>('/../health');
      setHealth(resp.data);
    } catch {
      setHealth(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    loadPendingSummary();
  }, []);

  const pendingCards = [
    {
      key: 'checklist',
      title: 'Checklist Các Công Việc',
      count: viewScope === 'my' ? (pendingSummary?.items?.checklist?.my ?? 0) : (pendingSummary?.items?.checklist?.total ?? 0),
      myCount: pendingSummary?.items?.checklist?.my ?? 0,
      totalCount: pendingSummary?.items?.checklist?.total ?? 0,
      unit: 'đợt',
      icon: <ListChecks size={22} style={{ color: 'var(--color-primary-hover)' }} />,
      link: '/app/checklists',
      desc: 'Đợt checklist đang thực hiện',
    },
    {
      key: 'memo',
      title: 'Memo',
      count: viewScope === 'my' ? (pendingSummary?.items?.memo?.my ?? 0) : (pendingSummary?.items?.memo?.total ?? 0),
      myCount: pendingSummary?.items?.memo?.my ?? 0,
      totalCount: pendingSummary?.items?.memo?.total ?? 0,
      unit: 'memo',
      icon: <FileText size={22} style={{ color: 'var(--color-primary-hover)' }} />,
      link: '/app/memo',
      desc: 'Memo chờ setup / chưa public',
    },
    {
      key: 'pim',
      title: 'PIM',
      count: viewScope === 'my' ? (pendingSummary?.items?.pim?.my ?? 0) : (pendingSummary?.items?.pim?.total ?? 0),
      myCount: pendingSummary?.items?.pim?.my ?? 0,
      totalCount: pendingSummary?.items?.pim?.total ?? 0,
      unit: 'yêu cầu',
      icon: <Database size={22} style={{ color: 'var(--color-primary-hover)' }} />,
      link: '/pim',
      desc: 'Yêu cầu PIM chưa hoàn thành',
    },
    {
      key: 'projects',
      title: 'Quản Lý Dự Án',
      count: viewScope === 'my' ? (pendingSummary?.items?.projects?.my ?? 0) : (pendingSummary?.items?.projects?.total ?? 0),
      myCount: pendingSummary?.items?.projects?.my ?? 0,
      totalCount: pendingSummary?.items?.projects?.total ?? 0,
      unit: 'dự án',
      icon: <Briefcase size={22} style={{ color: '#2563EB' }} />,
      link: '/app/projects',
      desc: 'Dự án đang triển khai / chưa xong',
    },
    {
      key: 'setup_nh',
      title: 'Setup NH mới',
      count: viewScope === 'my' ? (pendingSummary?.items?.setup_nh?.my ?? 0) : (pendingSummary?.items?.setup_nh?.total ?? 0),
      myCount: pendingSummary?.items?.setup_nh?.my ?? 0,
      totalCount: pendingSummary?.items?.setup_nh?.total ?? 0,
      unit: 'nhà hàng',
      icon: <Store size={22} style={{ color: 'var(--color-primary-hover)' }} />,
      link: '/app/setup-restaurants',
      desc: 'Nhà hàng đang setup chưa xong',
    },
    {
      key: 'incidents',
      title: 'Báo Cáo Sự cố',
      count: viewScope === 'my' ? (pendingSummary?.items?.incidents?.my ?? 0) : (pendingSummary?.items?.incidents?.total ?? 0),
      myCount: pendingSummary?.items?.incidents?.my ?? 0,
      totalCount: pendingSummary?.items?.incidents?.total ?? 0,
      unit: 'sự vụ',
      icon: <AlertTriangle size={22} style={{ color: '#DC2626' }} />,
      link: '/app/incidents',
      desc: 'Sự vụ đang chờ xử lý',
    },
  ];

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  };

  const badgePrimaryStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-primary-subtle)',
    color: 'var(--color-primary-text)',
    border: '1px solid var(--color-primary)',
    fontSize: '12px',
    fontWeight: 600,
  };

  const statusSuccessBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-success-bg)',
    color: 'var(--color-success-text)',
    border: '1px solid var(--color-success-border)',
    fontSize: '12px',
    fontWeight: 600,
  };

  const infoRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-color)',
    fontSize: '14px',
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Welcome Banner */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Xin chào, {user?.full_name || user?.username}!
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Đăng nhập thành công vào Hệ thống Golden Gate Restaurant Group - IT Miền Nam.
            </p>
          </div>
          {(user?.is_super_admin || user?.username?.toLowerCase() === 'admin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={checkHealth}
              isLoading={isChecking}
              leftIcon={<RefreshCw size={14} />}
            >
              Làm mới kết nối
            </Button>
          )}
        </div>

        {/* Tab switcher for dung.nguyenanh and Super Admin */}
        {isDungOrSuperAdmin && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              backgroundColor: 'var(--bg-secondary, #F8F9FA)',
              padding: '4px',
              borderRadius: 'var(--radius-lg, 8px)',
              border: '1px solid var(--border-color, #E5E7EB)',
              marginTop: '16px',
              width: 'fit-content',
            }}
          >
            <button
              type="button"
              onClick={() => setDashboardTab('overview')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-md, 6px)',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: dashboardTab === 'overview' ? 'var(--color-primary, #F5B800)' : 'transparent',
                color: 'var(--text-primary)',
                boxShadow: dashboardTab === 'overview' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Server size={15} />
              <span>Tổng Quan Hệ Thống</span>
            </button>

            <button
              type="button"
              onClick={() => setDashboardTab('tasks')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: 'var(--radius-md, 6px)',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: dashboardTab === 'tasks' ? 'var(--color-primary, #F5B800)' : 'transparent',
                color: 'var(--text-primary)',
                boxShadow: dashboardTab === 'tasks' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              <UserCheck size={15} />
              <span>Công Việc Cá Nhân (dung.nguyenanh & Admin)</span>
            </button>
          </div>
        )}
      </div>

      {dashboardTab === 'tasks' ? (
        <PersonalTaskManager />
      ) : (
        <>
          {/* Section: Các Mục Đang Chờ Xử Lý / Chưa Hoàn Thành (Quyền App & Quản Trị) */}
          {canViewAppPending && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                padding: '20px',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              {/* Header của Section */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--color-primary-subtle)',
                        border: '1px solid var(--color-primary)',
                        color: 'var(--color-primary-text)',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Quyền App & Quản Trị
                    </span>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Các Mục Đang Chờ Xử Lý (Chưa Làm Xong)
                    </h2>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Theo dõi tiến độ các đầu việc chưa hoàn tất cần xử lý theo thời gian thực
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {pendingSummary?.is_admin && (
                    <div
                      style={{
                        display: 'flex',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '3px',
                        borderRadius: '8px',
                        gap: '2px',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setViewScope('total')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: viewScope === 'total' ? 700 : 500,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: viewScope === 'total' ? 'var(--bg-card)' : 'transparent',
                          color: viewScope === 'total' ? 'var(--text-primary)' : 'var(--text-muted)',
                          boxShadow: viewScope === 'total' ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        Toàn hệ thống
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewScope('my')}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: viewScope === 'my' ? 700 : 500,
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: viewScope === 'my' ? 'var(--bg-card)' : 'transparent',
                          color: viewScope === 'my' ? 'var(--text-primary)' : 'var(--text-muted)',
                          boxShadow: viewScope === 'my' ? 'var(--shadow-sm)' : 'none',
                        }}
                      >
                        Việc của tôi
                      </button>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDailyPopup(true)}
                    leftIcon={<Bell size={13} color="var(--color-primary-hover)" />}
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      borderColor: '#FCD34D',
                      backgroundColor: '#FFFBEA',
                      color: '#92400E',
                    }}
                    title="Xem popup các nhiệm vụ tồn đọng cần xử lý trong ngày"
                  >
                    Nhiệm vụ trong ngày
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPendingSummary}
                    isLoading={loadingPending}
                    leftIcon={<RefreshCw size={13} />}
                    style={{ fontSize: '12px' }}
                  >
                    Làm mới
                  </Button>
                </div>
              </div>

              {/* Grid 5 Cards: Checklist test, Memo, PIM, Setup NH, Báo Cáo Sự cố */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  marginTop: '16px',
                }}
              >
                {pendingCards.map((card) => {
                  const hasPending = card.count > 0;
                  return (
                    <div
                      key={card.key}
                      onClick={() => navigate(card.link)}
                      style={{
                        padding: '16px',
                        borderRadius: '10px',
                        backgroundColor: hasPending ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                        border: hasPending ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 184, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {card.icon}
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              color: hasPending ? 'var(--color-primary-text)' : 'var(--text-muted)',
                              backgroundColor: hasPending ? 'var(--color-primary-subtle)' : 'var(--bg-card)',
                              border: hasPending ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                              padding: '2px 7px',
                              borderRadius: '10px',
                            }}
                          >
                            {card.unit}
                          </span>
                        </div>

                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {card.title} :{' '}
                          <span
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: hasPending ? 'var(--color-primary)' : 'var(--text-muted)',
                            }}
                          >
                            {card.count}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {card.desc}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '12px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11.5px',
                          color: hasPending ? 'var(--color-primary-text)' : 'var(--text-muted)',
                          fontWeight: 600,
                        }}
                      >
                        <span>
                          {pendingSummary?.is_admin && viewScope === 'total'
                            ? `Của tôi: ${card.myCount}`
                            : hasPending ? 'Cần xử lý' : 'Đã xong'}
                        </span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={gridStyle}>
            {/* User Profile Card */}
            <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck size={22} color="var(--color-primary-text)" />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Thông Tin Tài Khoản
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Dữ liệu từ dbo.LIST_USER
              </span>
            </div>
          </div>

          <div>
            <div style={infoRowStyle}>
              <span style={{ color: 'var(--text-secondary)' }}>Tên đăng nhập:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{user?.username}</strong>
            </div>
            <div style={infoRowStyle}>
              <span style={{ color: 'var(--text-secondary)' }}>Họ và tên:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user?.full_name || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={{ color: 'var(--text-secondary)' }}>Mã nhân viên (MANV):</span>
              <span style={{ color: 'var(--text-primary)' }}>{user?.manv || '—'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
              <span style={{ color: 'var(--text-primary)' }}>{user?.email || '—'}</span>
            </div>
            <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Nhóm quyền:</span>
              <span style={badgePrimaryStyle}>
                <Shield size={12} />
                {user?.role_name}
              </span>
            </div>
          </div>
        </Card>

        {/* Database & System Status Card (CHỈ DUY NHẤT ROOT SUPER ADMIN admin MỚI THẤY) */}
        {(user?.is_super_admin || user?.username?.toLowerCase() === 'admin') && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Server size={22} color="var(--color-primary-text)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Kết Nối Máy Chủ Test
                  </h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    SQL Server ODBC Driver 18
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsDbConfigOpen(true)}
                leftIcon={<Sliders size={14} />}
              >
                Cấu hình máy chủ DB
              </Button>
            </div>

            <div>
              <div style={infoRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Server Test:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {health?.database.server || '172.16.20.103'}
                </strong>
              </div>
              <div style={infoRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Cổng port / DB:</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {health?.database.port || 1433} / {health?.database.name || 'ITDEPT'}
                </span>
              </div>
              <div style={infoRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Tài khoản kết nối DB:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  {health?.database.user || 'itapp'}
                </span>
              </div>
              <div style={infoRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Trạng thái kết nối DB:</span>

                {health?.database.connected ? (
                  <span style={statusSuccessBadgeStyle}>
                    <CheckCircle2 size={12} /> Đã kết nối thành công
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>
                    Đang kiểm tra...
                  </span>
                )}
              </div>
              <div style={infoRowStyle}>
                <span style={{ color: 'var(--text-secondary)' }}>Backend Framework:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  Python 3.14 + FastAPI
                </span>
              </div>
              <div style={{ ...infoRowStyle, borderBottom: 'none' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Frontend Framework:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                  React 19 + TypeScript + Vite
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  )}

      {/* Modal Cấu hình DB cho Super Admin */}
      <DbConfigModal
        isOpen={isDbConfigOpen}
        onClose={() => setIsDbConfigOpen(false)}
        onSuccess={checkHealth}
      />

      {/* Modal Thông Báo Nhiệm Vụ Đầu Ngày (User App, dung.nguyenanh & Super Admin) */}
      <DailyPendingTasksModal
        isOpen={showDailyPopup}
        onClose={handleCloseDailyPopup}
        summary={pendingSummary}
        userName={user?.username}
        fullName={user?.full_name}
        isPrivilegedUser={isDungOrSuperAdmin || isSuperAdmin}
        onNavigate={(path) => navigate(path)}
      />
    </div>
  );
};

