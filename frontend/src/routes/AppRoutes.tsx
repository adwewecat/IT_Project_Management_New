import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { UserManagementHub } from '../pages/admin/UserManagementHub';
import { RestaurantListPage } from '../pages/restaurants/RestaurantListPage';
import { RestaurantAuditLogsPage } from '../pages/restaurants/RestaurantAuditLogsPage';
import { PimPage } from '../pages/pim/PimPage';
import { HotlineSchedulePage } from '../pages/hotline/HotlineSchedulePage';
import { TheodoiPrPoDoPage } from '../pages/inventory/TheodoiPrPoDoPage';
import { ExtRscPage } from '../pages/helpdesk/ExtRscPage';
import { CodePhotoPage } from '../pages/helpdesk/CodePhotoPage';
import { MemoPage } from '../pages/app/MemoPage';
import { ProjectManagementPage } from '../pages/app/ProjectManagementPage';
import { SetupRestaurantPage } from '../pages/app/SetupRestaurantPage';
import { CheckMonRk7Page } from '../pages/app/CheckMonRk7Page';
import { JobManagementPage } from '../pages/admin/JobManagementPage';
import { IncidentListPage } from '../pages/app/IncidentListPage';
import { ViolationAndLeavePage } from '../pages/admin/ViolationAndLeavePage';
import { StaffEvaluationReportPage } from '../pages/reports/StaffEvaluationReportPage';
import { CentralizedLogsPage } from '../pages/reports/CentralizedLogsPage';
import { AppAnnouncementPage } from '../pages/app/AppAnnouncementPage';
import { WorkChecklistPage } from '../pages/app/WorkChecklistPage';
import { RestaurantMongoPage } from '../pages/app/RestaurantMongoPage';
import { RestaurantMongoAnalysisPage } from '../pages/app/RestaurantMongoAnalysisPage';
import { SsoManagementPage } from '../pages/app/SsoManagementPage';
import { AgentMultitaskPage } from '../pages/app/AgentMultitaskPage';
import { AgentMultitaskV2Page } from '../pages/app/AgentMultitaskV2Page';
import { MobileRestaurantPage } from '../pages/mobile/MobileRestaurantPage';
import { WebmailPage } from '../pages/webmail/WebmailPage';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../contexts/AuthContext';
import { hasNewScreenAccess, isMobileDevice } from '../utils/authUtils';

/**
 * Điều hướng trang chủ thông minh:
 * Nếu người dùng truy cập từ điện thoại (mobile) và có quyền Mobile Portal
 * mà không có cờ prefer_desktop -> Tự động chuyển thẳng vào /mobile.
 */
const IndexRedirect: React.FC = () => {
  const { user } = useAuth();
  const preferDesktop = typeof window !== 'undefined' && sessionStorage.getItem('prefer_desktop') === 'true';
  const isMobile = isMobileDevice();
  const hasMobilePortal = hasNewScreenAccess(user, 'mobile_dedicated_view');

  if (isMobile && hasMobilePortal && !preferDesktop) {
    return <Navigate to="/mobile" replace />;
  }
  return <Navigate to="/restaurants" replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Giao diện dành riêng cho điện thoại (Mobile Portal - Phân quyền mobile_dedicated_view) */}
      <Route
        path="/mobile"
        element={
          <ProtectedRoute requiredPermission="mobile_dedicated_view">
            <MobileRestaurantPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="restaurants" element={<RestaurantListPage />} />
        <Route path="restaurants/logs" element={<RestaurantAuditLogsPage />} />
        <Route path="restaurant-logs" element={<Navigate to="/restaurants/logs" replace />} />
        <Route path="hotline" element={<HotlineSchedulePage />} />
        {/* Phân hệ Quản Trị Hệ Thống - Yêu cầu quyền Admin */}
        <Route
          path="admin/users"
          element={
            <ProtectedRoute adminOnly>
              <UserManagementHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/jobs"
          element={
            <ProtectedRoute adminOnly>
              <JobManagementPage />
            </ProtectedRoute>
          }
        />
        <Route path="jobs" element={<Navigate to="/admin/jobs" replace />} />
        <Route
          path="admin/violations-leaves"
          element={
            <ProtectedRoute adminOnly>
              <ViolationAndLeavePage />
            </ProtectedRoute>
          }
        />
        <Route path="violations-leaves" element={<Navigate to="/admin/violations-leaves" replace />} />
        <Route path="reports/staff-evaluation" element={<StaffEvaluationReportPage />} />
        <Route path="staff-evaluation" element={<Navigate to="/reports/staff-evaluation" replace />} />
        <Route path="reports/centralized-logs" element={<CentralizedLogsPage />} />
        <Route path="reports/logs" element={<Navigate to="/reports/centralized-logs" replace />} />
        <Route path="logs" element={<Navigate to="/reports/centralized-logs" replace />} />
        <Route path="pim" element={<PimPage />} />
        <Route path="app/memo" element={<MemoPage />} />
        <Route path="memo" element={<Navigate to="/app/memo" replace />} />
        <Route path="app/projects" element={<ProjectManagementPage />} />
        <Route path="projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="project-manager" element={<Navigate to="/app/projects" replace />} />
        <Route path="app/setup-restaurants" element={<SetupRestaurantPage />} />
        <Route path="setup-restaurants" element={<Navigate to="/app/setup-restaurants" replace />} />
        <Route path="app/check-mon-rk7" element={<CheckMonRk7Page />} />
        <Route path="check-mon-rk7" element={<Navigate to="/app/check-mon-rk7" replace />} />
        <Route path="check_mon_rk7" element={<Navigate to="/app/check-mon-rk7" replace />} />
        <Route path="app/incidents" element={<IncidentListPage />} />
        <Route path="incidents" element={<Navigate to="/app/incidents" replace />} />
        <Route path="app/pm-bo" element={<Navigate to="/app/projects" replace />} />
        <Route path="pm-bo" element={<Navigate to="/app/projects" replace />} />
        <Route path="app/announcements" element={<AppAnnouncementPage />} />
        <Route path="announcements" element={<Navigate to="/app/announcements" replace />} />
        <Route path="app/notifications" element={<Navigate to="/app/announcements" replace />} />
        <Route path="notifications" element={<Navigate to="/app/announcements" replace />} />
        <Route path="app/checklists" element={<WorkChecklistPage />} />
        <Route path="app/work-checklists" element={<Navigate to="/app/checklists" replace />} />
        <Route path="checklists" element={<Navigate to="/app/checklists" replace />} />
        <Route path="app/restaurant-mongodb" element={<RestaurantMongoPage />} />
        <Route path="restaurant-mongodb" element={<Navigate to="/app/restaurant-mongodb" replace />} />
        <Route path="app/mongo-analysis" element={<RestaurantMongoAnalysisPage />} />
        <Route path="mongo-analysis" element={<Navigate to="/app/mongo-analysis" replace />} />
        <Route path="app/restaurant-mongo-analysis" element={<Navigate to="/app/mongo-analysis" replace />} />
        <Route path="app/sso-management" element={<SsoManagementPage />} />
        <Route path="sso-management" element={<Navigate to="/app/sso-management" replace />} />
        <Route path="app/sso" element={<Navigate to="/app/sso-management" replace />} />
        <Route path="sso" element={<Navigate to="/app/sso-management" replace />} />
        
        {/* Màn hình mới: Agent Multitask (Mặc định chỉ Admin, phân quyền khi cần) */}
        <Route
          path="app/agent-multitask"
          element={
            <ProtectedRoute requiredPermission="agent_multitask">
              <AgentMultitaskPage />
            </ProtectedRoute>
          }
        />
        <Route path="agent-multitask" element={<Navigate to="/app/agent-multitask" replace />} />
        <Route path="app/multitask" element={<Navigate to="/app/agent-multitask" replace />} />
        <Route path="multitask" element={<Navigate to="/app/agent-multitask" replace />} />

        {/* Màn hình mới: Agent Multitask 2 (Tạm thời chỉ dung.nguyenanh và Super Admin) */}
        <Route
          path="app/agent-multitask-2"
          element={
            <ProtectedRoute requiredPermission="agent_multitask_2" adminOnly>
              <AgentMultitaskV2Page />
            </ProtectedRoute>
          }
        />
        <Route path="agent-multitask-2" element={<Navigate to="/app/agent-multitask-2" replace />} />
        <Route path="app/multitask-2" element={<Navigate to="/app/agent-multitask-2" replace />} />
        <Route path="multitask-2" element={<Navigate to="/app/agent-multitask-2" replace />} />

        {/* Màn hình mới: Webmail & Soạn Email Tập Trung (Phân quyền webmail) */}
        <Route
          path="webmail"
          element={
            <ProtectedRoute requiredPermission="webmail">
              <WebmailPage />
            </ProtectedRoute>
          }
        />
        <Route path="app/webmail" element={<Navigate to="/webmail" replace />} />


        <Route path="inventory/pr-po-do" element={<TheodoiPrPoDoPage />} />
        <Route path="helpdesk/ext-rsc" element={<ExtRscPage />} />
        <Route path="helpdesk/code-photo" element={<CodePhotoPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/restaurants" replace />} />
    </Routes>
  );
};
