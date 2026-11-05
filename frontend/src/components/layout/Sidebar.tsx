import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Calendar,
  Shield,
  Users,
  Layers,
  FileText,
  Database,
  Briefcase,
  Store as StoreIcon,
  CheckSquare,
  Package,
  ClipboardList,
  Headphones,
  PhoneCall,
  Printer,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Award,
  Bell,
  ListChecks,
  KeyRound,
  ScrollText,
  Cpu,
  Zap,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardService, PendingSummaryResponse } from '../../services/dashboardService';
import {
  checkIsSuperAdmin,
  checkIsAdmin,
  checkIsDungOrSuperAdmin,
  checkIsAppRole,
  checkIsHelpdeskRole,
  checkIsInventoryRole,
  hasNewScreenAccess,
} from '../../utils/authUtils';

export interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const location = useLocation();

  const [pendingData, setPendingData] = useState<PendingSummaryResponse | null>(null);

  const isSuperAdmin = checkIsSuperAdmin(user);
  const isAdmin = checkIsAdmin(user);
  const isDungOrSuperAdmin = checkIsDungOrSuperAdmin(user);
  const isAppRole = checkIsAppRole(user);
  const isInventoryRole = checkIsInventoryRole(user);
  const isHelpdeskRole = checkIsHelpdeskRole(user);

  // Quyền truy cập Agent Multitask: CHỈ Super Admin mới thấy trên Sidebar, tài khoản khác chỉ thấy khi đã được Super Admin phân quyền
  const canAccessAgentMultitask = isSuperAdmin || Boolean(user?.permissions?.['agent_multitask'] || user?.permissions?.['view_agent_multitask']);
  // Agent Multitask 2: Tạm thời CHỈ riêng dung.nguyenanh và Super Admin mới thấy
  const canAccessAgentMultitask2 = isDungOrSuperAdmin;


  // Trạng thái đóng / mở cho từng nhóm đặc thù
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    admin: location.pathname.startsWith('/admin') || isDungOrSuperAdmin,
    app: location.pathname.startsWith('/pim') || location.pathname.startsWith('/app') || location.pathname.startsWith('/memo'),
    inventory: location.pathname.startsWith('/inventory'),
    helpdesk: location.pathname.startsWith('/helpdesk'),
  });

  useEffect(() => {
    if (user && (isAppRole || isDungOrSuperAdmin || isAdmin)) {
      dashboardService.getPendingSummary()
        .then(setPendingData)
        .catch((err) => console.error('Lỗi lấy pending summary:', err));
    }
  }, [user, location.pathname, isAppRole, isDungOrSuperAdmin, isAdmin]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setOpenGroups((prev) => ({ ...prev, admin: true }));
    }
    if (location.pathname.startsWith('/pim') || location.pathname.startsWith('/app') || location.pathname.startsWith('/memo')) {
      setOpenGroups((prev) => ({ ...prev, app: true }));
    }
    if (location.pathname.startsWith('/inventory')) {
      setOpenGroups((prev) => ({ ...prev, inventory: true }));
    }
    if (location.pathname.startsWith('/helpdesk')) {
      setOpenGroups((prev) => ({ ...prev, helpdesk: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const sidebarStyle: React.CSSProperties = {
    width: '250px',
    backgroundColor: 'var(--bg-primary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'sticky',
    top: '64px',
    height: 'calc(100vh - 64px)',
    zIndex: 50,
  };

  const navListStyle: React.CSSProperties = {
    listStyle: 'none',
    padding: '10px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    margin: 0,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
    color: 'var(--text-secondary)',
    letterSpacing: '0.06em',
    padding: '8px 10px 3px',
  };

  const getLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '9px',
    padding: '6.5px 10px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13.5px',
    fontWeight: isActive ? 800 : 600,
    color: isActive ? 'var(--color-primary-text)' : 'var(--text-primary)',
    backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
    borderLeft: isActive ? '4px solid var(--color-primary)' : '4px solid transparent',
    transition: 'all var(--transition-fast)',
    textDecoration: 'none',
  });

  const getSubLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8.5px 12px 8.5px 36px',
    borderRadius: 'var(--radius-md)',
    fontSize: '13.5px',
    fontWeight: isActive ? 800 : 700,
    color: isActive ? 'var(--color-primary-text)' : 'var(--text-primary)',
    backgroundColor: isActive ? 'var(--color-primary-subtle)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
    transition: 'all var(--transition-fast)',
    textDecoration: 'none',
  });

  const groupHeaderStyle = (isOpen: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14.5px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    backgroundColor: isOpen ? 'var(--bg-secondary)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all var(--transition-fast)',
  });

  const renderPendingBadge = (count?: number, tooltip?: string) => {
    if (!count || count <= 0) return null;
    return (
      <span
        style={{
          backgroundColor: '#F5B800',
          color: '#111827',
          fontSize: '11px',
          fontWeight: 800,
          borderRadius: '10px',
          padding: '1px 6px',
          minWidth: '18px',
          textAlign: 'center',
          lineHeight: '16px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
          flexShrink: 0,
        }}
        title={tooltip}
      >
        {count}
      </span>
    );
  };

  const totalAppPending = (
    (pendingData?.items?.memo?.badge || 0) +
    (pendingData?.items?.pim?.badge || 0) +
    (pendingData?.items?.projects?.badge || 0) +
    (pendingData?.items?.setup_nh?.badge || 0) +
    (pendingData?.items?.checklist?.badge || 0) +
    (pendingData?.items?.incidents?.badge || 0)
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
        />
      )}
      <aside
        style={sidebarStyle}
        className={`app-sidebar ${mobileOpen ? 'mobile-open' : 'mobile-closed'}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('a')) {
            onCloseMobile?.();
          }
        }}
      >
        <div className="sidebar-scroll-container" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <ul style={navListStyle}>
        {/* ================= PHẦN 1: MÀN HÌNH TẤT CẢ CÁC QUYỀN DÙNG CHUNG ================= */}
        <li style={sectionTitleStyle}>Chức Năng Dùng Chung</li>

        {/* 1. Tổng Quan */}
        <li>
          <NavLink
            to="/dashboard"
            className="sidebar-interactive-item"
            style={({ isActive }) => getLinkStyle(isActive)}
          >
            <LayoutDashboard size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Tổng Quan</span>
          </NavLink>
        </li>

        {/* 2. Danh Sách Nhà Hàng */}
        <li>
          <NavLink
            to="/restaurants"
            end
            className="sidebar-interactive-item"
            style={({ isActive }) => getLinkStyle(isActive)}
          >
            <Store size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Danh Sách Nhà Hàng</span>
          </NavLink>
        </li>

        {/* 3. Lịch Trực Hotline */}
        <li>
          <NavLink
            to="/hotline"
            className="sidebar-interactive-item"
            style={({ isActive }) => getLinkStyle(isActive)}
          >
            <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Lịch Trực Hotline</span>
          </NavLink>
        </li>

        {/* 4. Hệ Thống Webmail & Soạn Mail Tập Trung (Phân quyền webmail) */}
        {hasNewScreenAccess(user, 'webmail') && (
          <li>
            <NavLink
              to="/webmail"
              className="sidebar-interactive-item"
              style={({ isActive }) => getLinkStyle(isActive)}
            >
              <Mail size={18} style={{ color: '#D97706' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Webmail & Soạn Mail</span>
                <span
                  style={{
                    backgroundColor: '#D97706',
                    color: '#FFFFFF',
                    fontSize: '9.5px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '10px',
                  }}
                >
                  MAIL
                </span>
              </div>
            </NavLink>
          </li>
        )}

        {/* ================= PHẦN 2: PHÂN HỆ ĐẶC THÙ THEO QUYỀN (GOM NHÓM COLLAPSIBLE) ================= */}
        <li style={{ ...sectionTitleStyle, marginTop: '10px' }}>Phân Hệ Nghiệp Vụ</li>

        {/* 1. Nhóm Quản Trị Hệ Thống (Chỉ Admin & SuperAdmin hoặc dung.nguyenanh) */}
        {(isAdmin || isDungOrSuperAdmin) && (
          <li>
            <button
              type="button"
              className="sidebar-interactive-item"
              style={groupHeaderStyle(openGroups.admin)}
              onClick={() => toggleGroup('admin')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield size={18} style={{ color: 'var(--color-primary)' }} />
                <span>Quản Trị Hệ Thống</span>
              </div>
              {openGroups.admin ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openGroups.admin && (
              <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {isAdmin && (
                  <li>
                    <NavLink
                      to="/admin/users"
                      className="sidebar-sub-item"
                      style={({ isActive }) => getSubLinkStyle(isActive)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={15} />
                        <span>Người Dùng & Quyền</span>
                      </div>
                    </NavLink>
                  </li>
                )}

                {isSuperAdmin && (
                  <li>
                    <NavLink
                      to="/admin/jobs"
                      className="sidebar-sub-item"
                      style={({ isActive }) => getSubLinkStyle(isActive)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={15} />
                        <span>Tác Vụ Ngầm (Scheduler)</span>
                      </div>
                    </NavLink>
                  </li>
                )}

                {isDungOrSuperAdmin && (
                  <li>
                    <NavLink
                      to="/admin/violations-leaves"
                      className="sidebar-sub-item"
                      style={({ isActive }) => getSubLinkStyle(isActive)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertOctagon size={15} style={{ color: '#EF4444' }} />
                        <span>Ghi Nhận Lỗi & Nghỉ Phép</span>
                      </div>
                    </NavLink>
                  </li>
                )}

                {/* Phân hệ mới: Agent Multitask 2 (Tạm thời chỉ dung.nguyenanh và Super Admin) */}
                {canAccessAgentMultitask2 && (
                  <li>
                    <NavLink
                      to="/app/agent-multitask-2"
                      className="sidebar-sub-item"
                      style={({ isActive }) => getSubLinkStyle(isActive)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={15} style={{ color: '#0ea5e9' }} />
                        <span>Agent Multitask 2</span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7'
                          }}
                        >
                          MỚI
                        </span>
                      </div>
                    </NavLink>
                  </li>
                )}
              </ul>
            )}
          </li>
        )}

        {/* 2. Nhóm Quyền App (App Support + Admin/SuperAdmin + dung.nguyenanh) */}
        {(isAppRole || isDungOrSuperAdmin) && (
          <li>
            <button
              type="button"
              className="sidebar-interactive-item"
              style={groupHeaderStyle(openGroups.app)}
              onClick={() => toggleGroup('app')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={18} />
                <span>Quyền App</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!openGroups.app && renderPendingBadge(totalAppPending, `Tổng cộng ${totalAppPending} việc chưa hoàn thành`)}
                {openGroups.app ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </button>

            {openGroups.app && (
              <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <li>
                  <NavLink
                    to="/app/announcements"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={15} style={{ color: 'var(--color-primary-hover)' }} />
                      <span>Thông Báo & Lưu Ý</span>
                    </div>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/memo"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={15} />
                      <span>Quản Lý Memo</span>
                    </div>
                    {renderPendingBadge(pendingData?.items?.memo?.badge, `Còn ${pendingData?.items?.memo?.badge} memo chưa xong`)}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/pim"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Database size={15} />
                      <span>PIM</span>
                    </div>
                    {renderPendingBadge(pendingData?.items?.pim?.badge, `Còn ${pendingData?.items?.pim?.badge} yêu cầu PIM chưa xong`)}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/projects"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Briefcase size={15} />
                      <span>Quản Lý Dự Án</span>
                    </div>
                    {renderPendingBadge(pendingData?.items?.projects?.badge, `Còn ${pendingData?.items?.projects?.badge} dự án đang thực hiện`)}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/setup-restaurants"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <StoreIcon size={15} />
                      <span>Setup NH Mới</span>
                    </div>
                    {renderPendingBadge(pendingData?.items?.setup_nh?.badge, `Còn ${pendingData?.items?.setup_nh?.badge} nhà hàng setup chưa xong`)}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/check-mon-rk7"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckSquare size={15} />
                      <span>Check Món RK7</span>
                    </div>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/checklists"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ListChecks size={15} style={{ color: 'var(--color-primary-hover)' }} />
                      <span>Checklist Các Công Việc</span>
                    </div>
                    {renderPendingBadge(pendingData?.items?.checklist?.badge, `Còn ${pendingData?.items?.checklist?.badge} đợt checklist đang thực hiện`)}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/incidents"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={15} style={{ color: '#EF4444' }} />
                      <span>Báo Cáo Sự Vụ</span>
                    </div>
                    {renderPendingBadge(pendingData?.items?.incidents?.badge, `Còn ${pendingData?.items?.incidents?.badge} sự vụ chưa xử lý`)}
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/mongo-analysis"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Database size={15} style={{ color: '#059669' }} />
                      <span>Phân Tích MongoDB</span>
                    </div>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/app/sso-management"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <KeyRound size={15} style={{ color: 'var(--color-primary-hover)' }} />
                      <span>Xử Lý SSO</span>
                    </div>
                  </NavLink>
                </li>
                {canAccessAgentMultitask && (
                  <li>
                    <NavLink
                      to="/app/agent-multitask"
                      className="sidebar-sub-item"
                      style={({ isActive }) => getSubLinkStyle(isActive)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Cpu size={15} style={{ color: 'var(--color-primary)' }} />
                        <span>Agent Multitask</span>
                      </div>
                    </NavLink>
                  </li>
                )}
              </ul>
            )}
          </li>
        )}

        {/* 3. Nhóm Quyền Inventory (Inventory + Admin/SuperAdmin) */}
        {isInventoryRole && (
          <li>
            <button
              type="button"
              className="sidebar-interactive-item"
              style={groupHeaderStyle(openGroups.inventory)}
              onClick={() => toggleGroup('inventory')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Package size={18} />
                <span>Quyền Inventory</span>
              </div>
              {openGroups.inventory ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openGroups.inventory && (
              <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <li>
                  <NavLink
                    to="/inventory/pr-po-do"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ClipboardList size={15} />
                      <span>Theo Dõi PR - PO - DO</span>
                    </div>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        )}

        {/* 4. Nhóm Quyền Helpdesk (Helpdesk + Admin/SuperAdmin) */}
        {isHelpdeskRole && (
          <li>
            <button
              type="button"
              className="sidebar-interactive-item"
              style={groupHeaderStyle(openGroups.helpdesk)}
              onClick={() => toggleGroup('helpdesk')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Headphones size={18} />
                <span>Quyền Helpdesk</span>
              </div>
              {openGroups.helpdesk ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {openGroups.helpdesk && (
              <ul style={{ listStyle: 'none', padding: '4px 0', margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <li>
                  <NavLink
                    to="/helpdesk/ext-rsc"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PhoneCall size={15} />
                      <span>EXT RSC</span>
                    </div>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/helpdesk/code-photo"
                    className="sidebar-sub-item"
                    style={({ isActive }) => getSubLinkStyle(isActive)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Printer size={15} />
                      <span>Code Photo</span>
                    </div>
                  </NavLink>
                </li>
              </ul>
            )}
          </li>
        )}

        {/* ================= PHẦN DƯỚI CÙNG: BÁO CÁO HỆ THỐNG ================= */}
        <li style={{ ...sectionTitleStyle, marginTop: '12px' }}>Báo Cáo & Nhật Ký</li>
        <li>
          <NavLink
            to="/reports/centralized-logs"
            className="sidebar-interactive-item"
            style={({ isActive }) => getLinkStyle(isActive)}
          >
            <ScrollText size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Báo Cáo Logs Tập Trung</span>
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/restaurants/logs"
            className="sidebar-interactive-item"
            style={({ isActive }) => getLinkStyle(isActive)}
          >
            <ClipboardList size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Báo Cáo Logs Nhà Hàng</span>
          </NavLink>
        </li>
        {isDungOrSuperAdmin && (
          <li>
            <NavLink
              to="/reports/staff-evaluation"
              className="sidebar-interactive-item"
              style={({ isActive }) => getLinkStyle(isActive)}
            >
              <Award size={18} style={{ color: '#F59E0B' }} />
              <span>Báo Cáo Đánh Giá Team App</span>
            </NavLink>
          </li>
        )}
      </ul>
    </div>

    {/* ================= PHẦN DƯỚI CÙNG THANH NAV: IT MIỀN NAM ================= */}
    <div
      style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          boxShadow: '0 0 8px var(--color-primary)',
        }}
      />
      <span
        style={{
          fontSize: '15px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        IT Miền Nam
      </span>
    </div>
  </aside>
  </>
);
};
