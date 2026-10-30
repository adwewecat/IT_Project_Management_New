import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  RefreshCw,
  ExternalLink,
  Users,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Shield,
  Plus,
  Trash2,
  Check,
  Key,
  Calendar,
  Download,
  Upload,
  Image,
  Layers,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  PIMRequest,
  PIMUserThucHien,
  PIMLog,
  PIMFilterParams
} from '../../types/pim';
import { pimService } from '../../services/pimService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { checkIsSuperAdmin, checkIsAdmin } from '../../utils/authUtils';

export const PimPage: React.FC = () => {
  const { user } = useAuth();

  // Role detection
  const isSuperAdmin = checkIsSuperAdmin(user);
  const isAdmin = checkIsAdmin(user);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'logs'>('pending');

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data states
  const [pendingRequests, setPendingRequests] = useState<PIMRequest[]>([]);
  const [completedRequests, setCompletedRequests] = useState<PIMRequest[]>([]);
  const [logs, setLogs] = useState<PIMLog[]>([]);
  const [roundRobinUsers, setRoundRobinUsers] = useState<PIMUserThucHien[]>([]);

  // Filter states: Tab 1 (Pending)
  const [pendingFilters, setPendingFilters] = useState<PIMFilterParams>({
    from_date: '',
    to_date: '',
    user_thuc_hien: '',
    search: '',
  });

  // Filter states: Tab 2 (Completed)
  const [completedFilters, setCompletedFilters] = useState<PIMFilterParams>({
    from_date: '',
    to_date: '',
    user_thuc_hien: '',
    user_update: '',
    search: '',
    limit: 100,
  });

  // Filter states: Tab 3 (Logs)
  const [logFilters, setLogFilters] = useState<PIMFilterParams>({
    from_date: '',
    to_date: '',
    user_thuc_hien: '',
    search: '',
    limit: 50,
  });

  // Modal: Manage Round Robin Users
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserFullName, setNewUserFullName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserOrder, setNewUserOrder] = useState<number>(1);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);

  // Modal: Reassign user (Admin only)
  const [assignModalOpen, setAssignModalOpen] = useState<boolean>(false);
  const [selectedRequestToAssign, setSelectedRequestToAssign] = useState<PIMRequest | null>(null);
  const [assignedUserName, setAssignedUserName] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Modal: Manage PIM Credentials (Super Admin only)
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [configUsername, setConfigUsername] = useState<string>('');
  const [configPassword, setConfigPassword] = useState<string>('');
  const [configLastUpdated, setConfigLastUpdated] = useState<string | null>(null);
  const [configLastUser, setConfigLastUser] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(false);
  const [isTestingLogin, setIsTestingLogin] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [testLoginAlert, setTestLoginAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal: Update Status & SO (Accessible to all PIM users, Admin can reassign user)
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [selectedRequestForStatus, setSelectedRequestForStatus] = useState<PIMRequest | null>(null);
  const [modalTrangThai, setModalTrangThai] = useState<string>('chưa hoàn thành');
  const [modalSO, setModalSO] = useState<string>('chưa hoàn thành');
  const [modalGuiMail, setModalGuiMail] = useState<string>('chưa hoàn thành');
  const [modalAssignee, setModalAssignee] = useState<string>('');
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewInitialIndex, setPreviewInitialIndex] = useState<number>(0);
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const setupFileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenImagePreview = (images: string[], initialIndex: number = 0, title: string = '') => {
    if (!images || images.length === 0) return;
    setPreviewImages(images);
    setPreviewInitialIndex(initialIndex);
    setPreviewTitle(title);
  };

  const handleCloseImagePreview = () => {
    setPreviewImages([]);
    setPreviewInitialIndex(0);
    setPreviewTitle('');
  };

  useEffect(() => {
    if (previewImages.length > 0 && previewInitialIndex >= 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`pim-preview-img-card-${previewInitialIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [previewImages, previewInitialIndex]);
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false);

  // Modal: Schedule settings (Admin & Super Admin)
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);
  const [scheduleTime1, setScheduleTime1] = useState<string>('03:00');
  const [scheduleTime2, setScheduleTime2] = useState<string>('12:00');
  const [scheduleTime3, setScheduleTime3] = useState<string>('16:30');
  const [scheduleIsActive, setScheduleIsActive] = useState<boolean>(true);
  const [scheduleLastRun, setScheduleLastRun] = useState<string | null>(null);
  const [scheduleLastStatus, setScheduleLastStatus] = useState<string | null>(null);
  const [scheduleLastUpdated, setScheduleLastUpdated] = useState<string | null>(null);
  const [scheduleLastUser, setScheduleLastUser] = useState<string | null>(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState<boolean>(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleAlert, setScheduleAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Top horizontal scroll synchronization - Tab 1 (Chưa Hoàn Thành)
  const topScrollPendingRef = useRef<HTMLDivElement>(null);
  const bottomScrollPendingRef = useRef<HTMLDivElement>(null);
  const pendingTableRef = useRef<HTMLTableElement>(null);
  const [pendingTableScrollWidth, setPendingTableScrollWidth] = useState<number>(0);
  const [showTopScrollPending, setShowTopScrollPending] = useState<boolean>(false);
  const isSyncingPendingTop = useRef(false);
  const isSyncingPendingBottom = useRef(false);

  const handleTopScrollPending = () => {
    if (isSyncingPendingTop.current) {
      isSyncingPendingTop.current = false;
      return;
    }
    if (bottomScrollPendingRef.current && topScrollPendingRef.current) {
      isSyncingPendingBottom.current = true;
      bottomScrollPendingRef.current.scrollLeft = topScrollPendingRef.current.scrollLeft;
    }
  };

  const handleBottomScrollPending = () => {
    if (isSyncingPendingBottom.current) {
      isSyncingPendingBottom.current = false;
      return;
    }
    if (topScrollPendingRef.current && bottomScrollPendingRef.current) {
      isSyncingPendingTop.current = true;
      topScrollPendingRef.current.scrollLeft = bottomScrollPendingRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (bottomScrollPendingRef.current && pendingTableRef.current) {
        const scrollW = pendingTableRef.current.scrollWidth;
        const clientW = bottomScrollPendingRef.current.clientWidth;
        setPendingTableScrollWidth(scrollW);
        setShowTopScrollPending(scrollW > clientW);
      }
    };
    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);
    const ro = new ResizeObserver(() => checkOverflow());
    if (bottomScrollPendingRef.current) ro.observe(bottomScrollPendingRef.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [pendingRequests, isLoading, activeTab]);

  // Top horizontal scroll synchronization - Tab 2 (Đã Hoàn Thành)
  const topScrollCompletedRef = useRef<HTMLDivElement>(null);
  const bottomScrollCompletedRef = useRef<HTMLDivElement>(null);
  const completedTableRef = useRef<HTMLTableElement>(null);
  const [completedTableScrollWidth, setCompletedTableScrollWidth] = useState<number>(0);
  const [showTopScrollCompleted, setShowTopScrollCompleted] = useState<boolean>(false);
  const isSyncingCompletedTop = useRef(false);
  const isSyncingCompletedBottom = useRef(false);

  const handleTopScrollCompleted = () => {
    if (isSyncingCompletedTop.current) {
      isSyncingCompletedTop.current = false;
      return;
    }
    if (bottomScrollCompletedRef.current && topScrollCompletedRef.current) {
      isSyncingCompletedBottom.current = true;
      bottomScrollCompletedRef.current.scrollLeft = topScrollCompletedRef.current.scrollLeft;
    }
  };

  const handleBottomScrollCompleted = () => {
    if (isSyncingCompletedBottom.current) {
      isSyncingCompletedBottom.current = false;
      return;
    }
    if (topScrollCompletedRef.current && bottomScrollCompletedRef.current) {
      isSyncingCompletedTop.current = true;
      topScrollCompletedRef.current.scrollLeft = bottomScrollCompletedRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const checkOverflow = () => {
      if (bottomScrollCompletedRef.current && completedTableRef.current) {
        const scrollW = completedTableRef.current.scrollWidth;
        const clientW = bottomScrollCompletedRef.current.clientWidth;
        setCompletedTableScrollWidth(scrollW);
        setShowTopScrollCompleted(scrollW > clientW);
      }
    };
    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);
    const ro = new ResizeObserver(() => checkOverflow());
    if (bottomScrollCompletedRef.current) ro.observe(bottomScrollCompletedRef.current);
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [completedRequests, isLoading, activeTab]);

  // Color mapping for users to easily distinguish team members
  const getUserBadgeStyle = (username?: string | null) => {
    if (!username) {
      return { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' };
    }
    const clean = username.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (clean.includes('quyen')) {
      return { bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' }; // Hồng sen / Rose
    }
    if (clean.includes('hung')) {
      return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }; // Xanh dương / Blue
    }
    if (clean.includes('duy')) {
      return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' }; // Xanh lục / Emerald
    }
    if (clean.includes('thuc')) {
      return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }; // Cam vàng / Amber
    }
    if (clean.includes('tram')) {
      return { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' }; // Tím / Violet
    }

    // Palette for other users
    const palette = [
      { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' }, // Cyan
      { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' }, // Green
      { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' }, // Orange
      { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' }, // Purple
      { bg: '#FDF4FF', text: '#A21CAF', border: '#F5D0FE' }, // Fuchsia
      { bg: '#F8FAFC', text: '#334155', border: '#E2E8F0' }, // Slate
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  };

  const renderUserBadge = (username?: string | null) => {
    if (!username) {
      return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa gán</span>;
    }
    const style = getUserBadgeStyle(username);
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: style.bg,
          color: style.text,
          border: `1px solid ${style.border}`,
          whiteSpace: 'nowrap'
        }}
      >
        {username}
      </span>
    );
  };

  // Helper date formatter
  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return dateStr;
    }
  };

  const formatFullDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch {
      return dateStr;
    }
  };

  // Load round robin users
  const loadRoundRobinUsers = useCallback(async () => {
    try {
      const users = await pimService.getRoundRobinUsers();
      setRoundRobinUsers(users);
      if (users.length > 0) {
        setNewUserOrder(Math.max(...users.map(u => u.thu_tu)) + 1);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách nhân sự xoay vòng:', err);
    }
  }, []);

  // Load Tab 1: Pending Requests
  const loadPendingRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cleanParams: PIMFilterParams = {};
      if (pendingFilters.from_date) cleanParams.from_date = pendingFilters.from_date;
      if (pendingFilters.to_date) cleanParams.to_date = pendingFilters.to_date;
      if (pendingFilters.user_thuc_hien) cleanParams.user_thuc_hien = pendingFilters.user_thuc_hien;
      if (pendingFilters.search) cleanParams.search = pendingFilters.search.trim();

      const data = await pimService.getPendingRequests(cleanParams);
      setPendingRequests(data);
    } catch (err: any) {
      console.error('Lỗi tải PIM chưa hoàn thành:', err);
      setErrorMessage(err.response?.data?.detail || 'Không thể tải danh sách PIM chưa hoàn thành.');
    } finally {
      setIsLoading(false);
    }
  }, [pendingFilters]);

  // Load Tab 2: Completed Requests
  const loadCompletedRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cleanParams: PIMFilterParams = { limit: completedFilters.limit || 100 };
      if (completedFilters.from_date) cleanParams.from_date = completedFilters.from_date;
      if (completedFilters.to_date) cleanParams.to_date = completedFilters.to_date;
      if (completedFilters.user_thuc_hien) cleanParams.user_thuc_hien = completedFilters.user_thuc_hien;
      if (completedFilters.user_update) cleanParams.user_update = completedFilters.user_update;
      if (completedFilters.search) cleanParams.search = completedFilters.search.trim();

      const data = await pimService.getCompletedRequests(cleanParams);
      setCompletedRequests(data);
    } catch (err: any) {
      console.error('Lỗi tải PIM đã hoàn thành:', err);
      setErrorMessage(err.response?.data?.detail || 'Không thể tải danh sách PIM đã hoàn thành.');
    } finally {
      setIsLoading(false);
    }
  }, [completedFilters]);

  // Load Tab 3: Logs
  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const cleanParams: PIMFilterParams = { limit: logFilters.limit || 50 };
      if (logFilters.from_date) cleanParams.from_date = logFilters.from_date;
      if (logFilters.to_date) cleanParams.to_date = logFilters.to_date;
      if (logFilters.user_thuc_hien) cleanParams.user_thuc_hien = logFilters.user_thuc_hien;
      if (logFilters.search) cleanParams.search = logFilters.search.trim();

      const data = await pimService.getPimLogs(cleanParams);
      setLogs(data);
    } catch (err: any) {
      console.error('Lỗi tải nhật ký thao tác:', err);
      setErrorMessage(err.response?.data?.detail || 'Không thể tải nhật ký thao tác.');
    } finally {
      setIsLoading(false);
    }
  }, [logFilters]);

  // Initial load
  useEffect(() => {
    loadRoundRobinUsers();
  }, [loadRoundRobinUsers]);

  // Switch tabs & trigger load
  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingRequests();
    } else if (activeTab === 'completed') {
      loadCompletedRequests();
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab, loadPendingRequests, loadCompletedRequests, loadLogs]);

  // Trigger sync
  const handleSyncPim = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await pimService.syncPim();
      setSuccessMessage(`Đồng bộ hoàn tất: Đã quét ${result.total_scanned} yêu cầu | Thêm mới: ${result.inserted} | Cập nhật: ${result.updated}`);
      // Refresh current tab
      if (activeTab === 'pending') loadPendingRequests();
      else if (activeTab === 'completed') loadCompletedRequests();
      else loadLogs();
    } catch (err: any) {
      console.error('Lỗi đồng bộ PIM:', err);
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setErrorMessage('Quá trình đồng bộ từ máy chủ PIM mất nhiều thời gian. Hệ thống vẫn đang xử lý ngầm, vui lòng đợi ít giây rồi bấm tải lại.');
      } else {
        setErrorMessage(err.response?.data?.detail || err.message || 'Lỗi trong quá trình quét dữ liệu PIM.');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle status (khi bấm "Mở lại" ở tab Đã Hoàn Thành)
  const handleToggleStatus = async (item: PIMRequest) => {
    try {
      await pimService.updateRequestStatus(item.id, {
        trang_thai_thuc_hien: 'chưa hoàn thành',
        so: 'chưa hoàn thành',
        gui_mail: 'chưa hoàn thành'
      });
      setSuccessMessage(`Đã mở lại yêu cầu #${item.id_yeu_cau} về trạng thái chưa hoàn thành!`);
      if (activeTab === 'pending') loadPendingRequests();
      else loadCompletedRequests();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể cập nhật trạng thái thực hiện.');
    }
  };

  // Open Reassign Modal (Admin only)
  const openAssignModal = (req: PIMRequest) => {
    setSelectedRequestToAssign(req);
    setAssignedUserName(req.user_thuc_hien || '');
    setAssignModalOpen(true);
  };

  // Submit Reassign
  const handleConfirmAssign = async () => {
    if (!selectedRequestToAssign || !assignedUserName) return;
    setIsAssigning(true);
    try {
      await pimService.assignRequestUser(selectedRequestToAssign.id, assignedUserName);
      setSuccessMessage(`Đã điều chuyển yêu cầu #${selectedRequestToAssign.id_yeu_cau} cho nhân sự: ${assignedUserName}!`);
      setAssignModalOpen(false);
      setSelectedRequestToAssign(null);
      loadPendingRequests();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Lỗi khi điều chuyển nhân sự.');
    } finally {
      setIsAssigning(false);
    }
  };

  // Create Round Robin User (Admin only)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    setIsSavingUser(true);
    try {
      await pimService.createRoundRobinUser({
        ten_user: newUserName.trim(),
        ho_ten: newUserFullName.trim() || undefined,
        email: newUserEmail.trim() || undefined,
        thu_tu: newUserOrder,
        active: true,
      });
      setNewUserName('');
      setNewUserFullName('');
      setNewUserEmail('');
      await loadRoundRobinUsers();
      setSuccessMessage('Thêm nhân sự xoay vòng thành công!');
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể thêm nhân sự.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // Toggle user active status (Admin only)
  const handleToggleUserActive = async (u: PIMUserThucHien) => {
    try {
      await pimService.updateRoundRobinUser(u.id, { active: !u.active });
      await loadRoundRobinUsers();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể thay đổi trạng thái nhân sự.');
    }
  };

  // Delete user from round robin (Admin only)
  const handleDeleteUser = async (u: PIMUserThucHien) => {
    if (!window.confirm(`Bạn có chắc muốn xóa "${u.ten_user}" khỏi danh sách xoay vòng?`)) return;
    try {
      await pimService.deleteRoundRobinUser(u.id);
      await loadRoundRobinUsers();
      setSuccessMessage(`Đã xóa "${u.ten_user}" khỏi danh sách xoay vòng.`);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể xóa nhân sự.');
    }
  };

  // Open Config Modal (Super Admin only)
  const openConfigModal = async () => {
    setConfigModalOpen(true);
    setIsLoadingConfig(true);
    setTestLoginAlert(null);
    try {
      const cfg = await pimService.getPimConfig();
      setConfigUsername(cfg.sso_username);
      setConfigPassword(cfg.sso_password);
      setConfigLastUpdated(cfg.ngay_cap_nhat || null);
      setConfigLastUser(cfg.user_cap_nhat || null);
    } catch (err: any) {
      setTestLoginAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể tải cấu hình tài khoản PIM.'
      });
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Test credentials (Super Admin only)
  const handleTestLogin = async () => {
    if (!configUsername.trim() || !configPassword.trim()) {
      setTestLoginAlert({ type: 'error', message: 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.' });
      return;
    }
    setIsTestingLogin(true);
    setTestLoginAlert(null);
    try {
      const res = await pimService.testPimLogin({
        sso_username: configUsername.trim(),
        sso_password: configPassword.trim(),
      });
      setTestLoginAlert({
        type: res.success ? 'success' : 'error',
        message: res.message
      });
    } catch (err: any) {
      setTestLoginAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Lỗi khi kiểm tra đăng nhập.'
      });
    } finally {
      setIsTestingLogin(false);
    }
  };

  // Save config (Super Admin only)
  const handleSaveConfig = async () => {
    if (!configUsername.trim() || !configPassword.trim()) {
      setTestLoginAlert({ type: 'error', message: 'Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.' });
      return;
    }
    setIsSavingConfig(true);
    setTestLoginAlert(null);
    try {
      const cfg = await pimService.updatePimConfig({
        sso_username: configUsername.trim(),
        sso_password: configPassword.trim(),
      });
      setConfigLastUpdated(cfg.ngay_cap_nhat || null);
      setConfigLastUser(cfg.user_cap_nhat || null);
      setSuccessMessage('Đã cập nhật thông tin tài khoản đăng nhập SSO / PIM thành công!');
      setConfigModalOpen(false);
    } catch (err: any) {
      setTestLoginAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể lưu cấu hình tài khoản.'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Helper parse danh sách URL hình ảnh setup
  const parseSetupImages = useCallback((raw?: string | null): string[] => {
    if (!raw || !raw.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((u: any) => typeof u === 'string' && u.trim());
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
    } catch {
      if (raw.trim().startsWith('/uploads/') || raw.trim().startsWith('http') || raw.trim().startsWith('data:image/')) {
        return [raw.trim()];
      }
      if (raw.includes(',') || raw.includes(';')) {
        const split = raw.split(/[,;]/).map(s => s.trim()).filter(Boolean);
        if (split.length > 0) return split;
      }
    }
    return [];
  }, []);

  // Xử lý upload file ảnh setup
  const handleUploadSetupFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name));
    if (validFiles.length === 0) {
      setErrorMessage('Vui lòng chọn hoặc dán tệp hình ảnh hợp lệ (.png, .jpg, .webp)!');
      return;
    }
    setIsUploadingImages(true);
    try {
      const res = await pimService.uploadSetupImages(validFiles);
      if (res.urls && res.urls.length > 0) {
        setModalImages(prev => [...prev, ...res.urls]);
        setSuccessMessage(`Đã đính kèm ${res.urls.length} hình ảnh setup thành công!`);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Lỗi tải ảnh lên hệ thống.');
    } finally {
      setIsUploadingImages(false);
      if (setupFileInputRef.current) setupFileInputRef.current.value = '';
    }
  };

  // Bắt sự kiện Paste Clipboard (Ctrl + V)
  const handlePasteSetupImages = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      await handleUploadSetupFiles(pastedFiles);
    }
  };

  // Lắng nghe sự kiện Paste (Ctrl + V) toàn cục khi Modal Cập Nhật Trạng Thái đang mở
  // Người dùng chỉ cần nhấn Ctrl+V ở bất kỳ đâu trên màn hình là hệ thống lập tức dán ảnh setup,
  // không cần phải click vào ô đính kèm hoặc bị bật cửa sổ chọn file
  useEffect(() => {
    if (!statusModalOpen) return;

    const handleGlobalWindowPaste = (e: ClipboardEvent) => {
      // Nếu con trỏ đang ở ô input text hoặc textarea khác thì bỏ qua
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            let namedFile = file;
            if (file.name === 'image.png' || !file.name) {
              const now = new Date();
              const timeStr = `${now.getHours()}h${now.getMinutes()}p${now.getSeconds()}s`;
              namedFile = new File([file], `Ảnh_setup_${timeStr}.png`, { type: file.type });
            }
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        handleUploadSetupFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handleGlobalWindowPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalWindowPaste);
    };
  }, [statusModalOpen]);

  // Gỡ ảnh khỏi danh sách
  const handleRemoveSetupImage = (idxToRemove: number) => {
    setModalImages(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Open Status & SO Update Modal (Available for all users)
  const openStatusModal = (item: PIMRequest) => {
    setSelectedRequestForStatus(item);
    setModalTrangThai(item.trang_thai_thuc_hien === 'hoàn thành' ? 'hoàn thành' : 'chưa hoàn thành');
    setModalSO(item.so === 'hoàn thành' ? 'hoàn thành' : 'chưa hoàn thành');
    setModalGuiMail(item.gui_mail === 'hoàn thành' ? 'hoàn thành' : 'chưa hoàn thành');
    setModalAssignee(item.user_thuc_hien || '');
    setModalImages(parseSetupImages(item.hinh_anh_setup));
    setStatusModalOpen(true);
  };

  // Save Status & SO Update
  const handleSaveStatusModal = async () => {
    if (!selectedRequestForStatus) return;
    setIsSavingStatus(true);
    try {
      if (isAdmin && modalAssignee && modalAssignee !== (selectedRequestForStatus.user_thuc_hien || '')) {
        await pimService.assignRequestUser(selectedRequestForStatus.id, modalAssignee);
      }
      await pimService.updateRequestStatus(selectedRequestForStatus.id, {
        trang_thai_thuc_hien: modalTrangThai,
        so: modalSO,
        gui_mail: modalGuiMail,
        hinh_anh_setup: modalImages.length > 0 ? JSON.stringify(modalImages) : '',
      });
      setSuccessMessage(`Đã cập nhật trạng thái yêu cầu #${selectedRequestForStatus.id_yeu_cau} thành công!`);
      setStatusModalOpen(false);
      if (activeTab === 'pending') loadPendingRequests();
      else if (activeTab === 'completed') loadCompletedRequests();
      else loadLogs();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Không thể cập nhật trạng thái.');
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Open Schedule Modal (Admin & Super Admin)
  const openScheduleModal = async () => {
    setScheduleModalOpen(true);
    setIsLoadingSchedule(true);
    setScheduleAlert(null);
    try {
      const sched = await pimService.getPimSchedule();
      setScheduleTime1(sched.time_1 || '03:00');
      setScheduleTime2(sched.time_2 || '12:00');
      setScheduleTime3(sched.time_3 || '16:30');
      setScheduleIsActive(sched.is_active);
      setScheduleLastRun(sched.last_run || null);
      setScheduleLastStatus(sched.last_status || null);
      setScheduleLastUpdated(sched.ngay_cap_nhat || null);
      setScheduleLastUser(sched.user_cap_nhat || null);
    } catch (err: any) {
      setScheduleAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể tải cấu hình lịch quét PIM.'
      });
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  // Save Schedule (Admin & Super Admin)
  const handleSaveSchedule = async () => {
    if (!scheduleTime1.trim() || !scheduleTime2.trim() || !scheduleTime3.trim()) {
      setScheduleAlert({ type: 'error', message: 'Vui lòng điền đủ 3 mốc thời gian quét (HH:MM).' });
      return;
    }
    setIsSavingSchedule(true);
    setScheduleAlert(null);
    try {
      const sched = await pimService.updatePimSchedule({
        time_1: scheduleTime1.trim(),
        time_2: scheduleTime2.trim(),
        time_3: scheduleTime3.trim(),
        is_active: scheduleIsActive,
      });
      setScheduleLastUpdated(sched.ngay_cap_nhat || null);
      setScheduleLastUser(sched.user_cap_nhat || null);
      setSuccessMessage('Đã cập nhật lịch quét PIM tự động (3 lần/ngày) thành công!');
      setScheduleModalOpen(false);
    } catch (err: any) {
      setScheduleAlert({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể lưu cấu hình lịch quét.'
      });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handle Export Excel theo bộ lọc hiện tại
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      let params: PIMFilterParams & { tab?: string } = {};
      let filenameTab = 'Tat_Ca';

      if (activeTab === 'pending') {
        params = {
          tab: 'pending',
          from_date: pendingFilters.from_date || undefined,
          to_date: pendingFilters.to_date || undefined,
          user_thuc_hien: pendingFilters.user_thuc_hien || undefined,
          search: pendingFilters.search?.trim() || undefined,
        };
        filenameTab = 'Chua_Hoan_Thanh';
      } else if (activeTab === 'completed') {
        params = {
          tab: 'completed',
          from_date: completedFilters.from_date || undefined,
          to_date: completedFilters.to_date || undefined,
          user_thuc_hien: completedFilters.user_thuc_hien || undefined,
          user_update: completedFilters.user_update?.trim() || undefined,
          search: completedFilters.search?.trim() || undefined,
        };
        filenameTab = 'Da_Hoan_Thanh';
      } else {
        params = { tab: 'all' };
      }

      const blob = await pimService.exportPimExcel(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.setAttribute('download', `Danh_Sach_PIM_${filenameTab}_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccessMessage('Xuất dữ liệu PIM ra file Excel thành công!');
    } catch (err: any) {
      console.error('Lỗi xuất file Excel:', err);
      setErrorMessage(err.response?.data?.detail || err.message || 'Lỗi khi xuất file Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Dropdown options for filtering by user_thuc_hien
  const userFilterOptions = [
    { value: '', label: 'Tất cả người thực hiện' },
    ...roundRobinUsers.map(u => ({ value: u.ten_user, label: u.ten_user }))
  ];

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      {/* ================= HEADER ================= */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-subtle)',
              border: '1px solid var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={20} style={{ color: 'var(--color-primary-text)' }} />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Quản Lý Yêu Cầu PIM
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
            Phân hệ IT APP • Theo dõi tiến độ, trạng thái SO và điều phối xoay vòng yêu cầu PIM tự động
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Config PIM Credentials (Super Admin only) */}
          {isSuperAdmin && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Key size={16} />}
              onClick={openConfigModal}
            >
              Tài Khoản PIM
            </Button>
          )}

          {/* Manage users (Admin only) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Users size={16} />}
              onClick={() => {
                loadRoundRobinUsers();
                setUserModalOpen(true);
              }}
            >
              Nhân Sự Xoay Vòng
            </Button>
          )}

          {/* Schedule Settings (Admin & Super Admin) */}
          {isAdmin && (
            <Button
              variant="outline"
              size="md"
              leftIcon={<Calendar size={16} />}
              onClick={openScheduleModal}
            >
              Lịch Quét Tự Động
            </Button>
          )}

          {/* Export Excel */}
          <Button
            variant="outline"
            size="md"
            isLoading={isExporting}
            leftIcon={<Download size={16} />}
            onClick={handleExportExcel}
            title="Xuất danh sách PIM ra file Excel theo bộ lọc hiện tại"
          >
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </Button>

          {/* Sync Button */}
          <Button
            variant="primary"
            size="md"
            isLoading={isSyncing}
            leftIcon={<RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />}
            onClick={handleSyncPim}
          >
            {isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ PIM'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
        </div>
      )}

      {successMessage && (
        <div style={{ marginBottom: '16px' }}>
          <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
        </div>
      )}

      {/* ================= TABS SWITCHER ================= */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid var(--border-color)',
        marginBottom: '20px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'pending' ? 700 : 500,
            color: activeTab === 'pending' ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            backgroundColor: activeTab === 'pending' ? 'var(--color-primary-subtle)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pending' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <Clock size={16} style={{ color: activeTab === 'pending' ? 'var(--color-primary)' : 'inherit' }} />
          <span>PIM Chưa Hoàn Thành</span>
          {pendingRequests.length > 0 && (
            <Badge variant="warning">{pendingRequests.length}</Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'completed' ? 700 : 500,
            color: activeTab === 'completed' ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            backgroundColor: activeTab === 'completed' ? 'var(--color-primary-subtle)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'completed' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <CheckCircle2 size={16} style={{ color: activeTab === 'completed' ? 'var(--color-success)' : 'inherit' }} />
          <span>PIM Đã Hoàn Thành (100 gần nhất)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'logs' ? 700 : 500,
            color: activeTab === 'logs' ? 'var(--color-primary-text)' : 'var(--text-secondary)',
            backgroundColor: activeTab === 'logs' ? 'var(--color-primary-subtle)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '3px solid var(--color-primary)' : '3px solid transparent',
            marginBottom: '-2px',
            borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          <RotateCcw size={16} style={{ color: activeTab === 'logs' ? 'var(--color-primary)' : 'inherit' }} />
          <span>Nhật Ký Thao Tác (50 gần nhất)</span>
        </button>
      </div>

      {/* ================= TAB 1: CHƯA HOÀN THÀNH ================= */}
      {activeTab === 'pending' && (
        <div>
          {/* Filters Bar */}
          <Card style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              alignItems: 'end'
            }}>
              <Input
                label="Từ ngày yêu cầu"
                type="date"
                value={pendingFilters.from_date || ''}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, from_date: e.target.value }))}
              />
              <Input
                label="Đến ngày yêu cầu"
                type="date"
                value={pendingFilters.to_date || ''}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, to_date: e.target.value }))}
              />
              <Select
                label="Người thực hiện"
                options={userFilterOptions}
                value={pendingFilters.user_thuc_hien || ''}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, user_thuc_hien: e.target.value }))}
              />
              <Input
                label="Tìm kiếm nhanh"
                placeholder="ID yêu cầu, chuỗi, mô tả..."
                leftIcon={<Search size={16} />}
                value={pendingFilters.search || ''}
                onChange={(e) => setPendingFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setPendingFilters({ from_date: '', to_date: '', user_thuc_hien: '', search: '' });
                  }}
                >
                  Đặt Lại
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={loadPendingRequests}
                >
                  Lọc
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  isLoading={isExporting}
                  leftIcon={<Download size={16} />}
                  onClick={handleExportExcel}
                  title="Xuất file Excel danh sách PIM chưa hoàn thành theo bộ lọc"
                >
                  Xuất Excel
                </Button>
              </div>
            </div>
          </Card>

          {/* Pending Table */}
          <Card style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Thanh cuộn ngang ở trên (Đồng bộ với bảng dữ liệu) */}
            {showTopScrollPending && (
              <div
                ref={topScrollPendingRef}
                onScroll={handleTopScrollPending}
                className="top-scrollbar"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  width: '100%',
                  height: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
                title="Kéo để cuộn ngang xem các cột bên phải"
              >
                <div style={{ width: `${pendingTableScrollWidth}px`, height: '1px' }} />
              </div>
            )}

            <div
              ref={bottomScrollPendingRef}
              onScroll={handleBottomScrollPending}
              style={{ overflowX: 'auto', width: '100%' }}
            >
              <table
                ref={pendingTableRef}
                style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '45px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '100px' }}>ID Yêu Cầu</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '130px' }}>Chuỗi</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, minWidth: '220px' }}>Mô Tả</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, minWidth: '150px' }}>Thời gian PD gửi tới IT</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '80px', textAlign: 'center' }}>Link PIM</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '140px' }}>Người Thực Hiện</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '120px', textAlign: 'center' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '100px', textAlign: 'center' }}>SO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '110px', textAlign: 'center' }}>Gửi Mail NH</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '130px' }}>Ngày Nhận</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(0,0,0,0.2)',
                              borderTopColor: 'var(--text-primary)',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              display: 'inline-block',
                            }}
                          />
                          <span>Đang tải danh sách PIM chưa hoàn thành...</span>
                        </div>
                      </td>
                    </tr>
                  ) : pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Không có yêu cầu PIM nào chưa hoàn thành theo bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => openStatusModal(item)}
                        title="Bấm vào dòng để cập nhật Trạng thái & SO"
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                          transition: 'background-color var(--transition-fast)',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)';
                        }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.id_yeu_cau}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.chuoi || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: '300px', wordBreak: 'break-word' }}>
                          <div>{item.mo_ta || '-'}</div>
                          {(() => {
                            const imgs = parseSetupImages(item.hinh_anh_setup);
                            if (imgs.length === 0) return null;
                            return (
                              <div style={{ marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenImagePreview(imgs, 0, `Yêu cầu #${item.id_yeu_cau} - ${item.chuoi || ''}: ${item.mo_ta || ''}`);
                                  }}
                                  title="Nhấp để xem danh sách ảnh chụp file Excel setup món (cuộn dọc xem tất cả ảnh)"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: '#F3E8FF',
                                    color: '#7E22CE',
                                    border: '1px solid #D8B4FE',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Image size={12} />
                                  <span>📷 Ảnh setup ({imgs.length})</span>
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                          {formatDateTime(item.thoi_gian_thuc_hien)}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.link_yeu_cau ? (
                            <a
                              href={item.link_yeu_cau}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--color-primary-subtle)',
                                color: 'var(--color-primary-text)',
                                border: '1px solid var(--color-primary)',
                                textDecoration: 'none'
                              }}
                              title="Mở liên kết PIM"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {renderUserBadge(item.user_thuc_hien)}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssignModal(item);
                                }}
                                title="Admin: Đổi người thực hiện"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-primary-hover)',
                                  cursor: 'pointer',
                                  padding: '2px 4px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Shield size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.trang_thai_thuc_hien === 'hoàn thành' ? (
                            <Badge variant="success" icon={<Check size={12} />}>
                              HT
                            </Badge>
                          ) : (
                            <Badge variant="warning" icon={<Clock size={12} />}>
                              Chưa HT
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.so === 'hoàn thành' ? (
                            <Badge variant="success" icon={<Check size={12} />}>
                              HT
                            </Badge>
                          ) : (
                            <Badge variant="warning" icon={<Clock size={12} />}>
                              Chưa HT
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.gui_mail === 'hoàn thành' ? (
                            <Badge variant="success" icon={<Check size={12} />}>
                              HT
                            </Badge>
                          ) : (
                            <Badge variant="warning" icon={<Clock size={12} />}>
                              Chưa HT
                            </Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                          {formatDateTime(item.ngay_insert)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 2: ĐÃ HOÀN THÀNH ================= */}
      {activeTab === 'completed' && (
        <div>
          {/* Filters Bar */}
          <Card style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              alignItems: 'end'
            }}>
              <Input
                label="Từ ngày yêu cầu"
                type="date"
                value={completedFilters.from_date || ''}
                onChange={(e) => setCompletedFilters(prev => ({ ...prev, from_date: e.target.value }))}
              />
              <Input
                label="Đến ngày yêu cầu"
                type="date"
                value={completedFilters.to_date || ''}
                onChange={(e) => setCompletedFilters(prev => ({ ...prev, to_date: e.target.value }))}
              />
              <Select
                label="Người thực hiện"
                options={userFilterOptions}
                value={completedFilters.user_thuc_hien || ''}
                onChange={(e) => setCompletedFilters(prev => ({ ...prev, user_thuc_hien: e.target.value }))}
              />
              <Input
                label="Người cập nhật / HT"
                placeholder="Nhập tên..."
                value={completedFilters.user_update || ''}
                onChange={(e) => setCompletedFilters(prev => ({ ...prev, user_update: e.target.value }))}
              />
              <Input
                label="Tìm kiếm nhanh"
                placeholder="ID, chuỗi, mô tả..."
                leftIcon={<Search size={16} />}
                value={completedFilters.search || ''}
                onChange={(e) => setCompletedFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setCompletedFilters({ from_date: '', to_date: '', user_thuc_hien: '', user_update: '', search: '', limit: 100 });
                  }}
                >
                  Đặt Lại
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={loadCompletedRequests}
                >
                  Lọc
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  isLoading={isExporting}
                  leftIcon={<Download size={16} />}
                  onClick={handleExportExcel}
                  title="Xuất file Excel danh sách PIM đã hoàn thành theo bộ lọc"
                >
                  Xuất Excel
                </Button>
              </div>
            </div>
          </Card>

          {/* Completed Table */}
          <Card style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Thanh cuộn ngang ở trên (Đồng bộ với bảng dữ liệu) */}
            {showTopScrollCompleted && (
              <div
                ref={topScrollCompletedRef}
                onScroll={handleTopScrollCompleted}
                className="top-scrollbar"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  width: '100%',
                  height: '12px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
                title="Kéo để cuộn ngang xem các cột bên phải"
              >
                <div style={{ width: `${completedTableScrollWidth}px`, height: '1px' }} />
              </div>
            )}

            <div
              ref={bottomScrollCompletedRef}
              onScroll={handleBottomScrollCompleted}
              style={{ overflowX: 'auto', width: '100%' }}
            >
              <table
                ref={completedTableRef}
                style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}
              >
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '45px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '100px' }}>ID Yêu Cầu</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '130px' }}>Chuỗi</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, minWidth: '250px' }}>Mô Tả</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, minWidth: '150px' }}>Thời gian PD gửi tới IT</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '135px' }}>Thời Gian HT</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '130px' }}>Người Thực Hiện</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '130px' }}>Người HT / Update</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '90px', textAlign: 'center' }}>SO</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '110px', textAlign: 'center' }}>Gửi Mail NH</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '80px', textAlign: 'center' }}>Link</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '100px', textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(0,0,0,0.2)',
                              borderTopColor: 'var(--text-primary)',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              display: 'inline-block',
                            }}
                          />
                          <span>Đang tải danh sách PIM đã hoàn thành...</span>
                        </div>
                      </td>
                    </tr>
                  ) : completedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có yêu cầu PIM nào đã hoàn thành theo bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    completedRequests.map((item, idx) => (
                      <tr
                        key={item.id}
                        onClick={() => openStatusModal(item)}
                        title="Bấm vào dòng để xem chi tiết hoặc cập nhật Trạng thái & SO"
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                          transition: 'background-color var(--transition-fast)',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)';
                        }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {item.id_yeu_cau}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.chuoi || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: '320px', wordBreak: 'break-word' }}>
                          <div>{item.mo_ta || '-'}</div>
                          {(() => {
                            const imgs = parseSetupImages(item.hinh_anh_setup);
                            if (imgs.length === 0) return null;
                            return (
                              <div style={{ marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenImagePreview(imgs, 0, `Yêu cầu #${item.id_yeu_cau} - ${item.chuoi || ''}: ${item.mo_ta || ''}`);
                                  }}
                                  title="Nhấp để xem danh sách ảnh chụp file Excel setup món (cuộn dọc xem tất cả ảnh)"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: '#F3E8FF',
                                    color: '#7E22CE',
                                    border: '1px solid #D8B4FE',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  <Image size={12} />
                                  <span>📷 Ảnh setup ({imgs.length})</span>
                                </button>
                              </div>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                          {formatDateTime(item.thoi_gian_thuc_hien)}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--color-success)' }}>
                          {formatDateTime(item.thoi_gian_hoan_thanh || item.thoi_gian_update)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {renderUserBadge(item.user_thuc_hien)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="success">{item.user_hoan_thanh || item.user_update || '-'}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.so === 'hoàn thành' ? (
                            <Badge variant="success">HT</Badge>
                          ) : (
                            <Badge variant="neutral">Chưa HT</Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.gui_mail === 'hoàn thành' ? (
                            <Badge variant="success">HT</Badge>
                          ) : (
                            <Badge variant="neutral">Chưa HT</Badge>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {item.link_yeu_cau ? (
                            <a
                              href={item.link_yeu_cau}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--color-primary-subtle)',
                                color: 'var(--color-primary-text)',
                                border: '1px solid var(--color-primary)',
                                textDecoration: 'none'
                              }}
                              title="Mở liên kết PIM"
                            >
                              <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            title="Chuyển lại về trạng thái chưa hoàn thành"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(item);
                            }}
                          >
                            Mở lại
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ================= TAB 3: NHẬT KÝ THAO TÁC ================= */}
      {activeTab === 'logs' && (
        <div>
          {/* Filters Bar */}
          <Card style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              alignItems: 'end'
            }}>
              <Input
                label="Từ ngày thao tác"
                type="date"
                value={logFilters.from_date || ''}
                onChange={(e) => setLogFilters(prev => ({ ...prev, from_date: e.target.value }))}
              />
              <Input
                label="Đến ngày thao tác"
                type="date"
                value={logFilters.to_date || ''}
                onChange={(e) => setLogFilters(prev => ({ ...prev, to_date: e.target.value }))}
              />
              <Input
                label="Người thực hiện"
                placeholder="Nhập tên user..."
                value={logFilters.user_thuc_hien || ''}
                onChange={(e) => setLogFilters(prev => ({ ...prev, user_thuc_hien: e.target.value }))}
              />
              <Input
                label="Tìm kiếm nội dung / ID"
                placeholder="ID yêu cầu, nội dung..."
                leftIcon={<Search size={16} />}
                value={logFilters.search || ''}
                onChange={(e) => setLogFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setLogFilters({ from_date: '', to_date: '', user_thuc_hien: '', search: '', limit: 50 });
                  }}
                >
                  Đặt Lại
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={loadLogs}
                >
                  Lọc
                </Button>
              </div>
            </div>
          </Card>

          {/* Logs Table */}
          <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '45px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '150px' }}>Thời Gian</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '110px' }}>ID Yêu Cầu</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '180px' }}>Hành Động</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, minWidth: '300px' }}>Nội Dung Chi Tiết</th>
                    <th style={{ padding: '12px 14px', fontWeight: 600, width: '150px' }}>User Thực Hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid rgba(0,0,0,0.2)',
                              borderTopColor: 'var(--text-primary)',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              display: 'inline-block',
                            }}
                          />
                          <span>Đang tải nhật ký thao tác...</span>
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Chưa có nhật ký thao tác nào theo bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    logs.map((lg, idx) => (
                      <tr
                        key={lg.id}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                        }}
                      >
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>
                          {formatFullDateTime(lg.thoi_gian)}
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {lg.id_yeu_cau}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <Badge variant="primary">{lg.hanh_dong}</Badge>
                        </td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                          {lg.noi_dung || '-'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {renderUserBadge(lg.user_thuc_hien)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ================= MODAL: QUẢN LÝ NHÂN SỰ XOAY VÒNG (ADMIN ONLY) ================= */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Quản Lý Danh Sách Nhân Sự PIM Xoay Vòng"
        maxWidth="680px"
      >
        <div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Hệ thống tự động phân bổ luân phiên các yêu cầu PIM mới quét được cho các nhân sự đang ở trạng thái <strong>Hoạt động</strong> theo đúng thứ tự.
          </p>

          {/* Form thêm nhân sự mới */}
          <Card style={{ padding: '16px', marginBottom: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Thêm Nhân Sự Vào Danh Sách</h4>
            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <Input
                  label="Tên hiển thị / User *"
                  placeholder="VD: Quyên, Hùng..."
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
                <Input
                  label="Họ và tên"
                  placeholder="VD: Nguyễn Thị Quyên"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                />
                <Input
                  label="Email"
                  placeholder="quyen.nguyen@ggg.com.vn"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
                <Input
                  label="Thứ tự xoay vòng"
                  type="number"
                  min={1}
                  required
                  value={newUserOrder}
                  onChange={(e) => setNewUserOrder(parseInt(e.target.value) || 1)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingUser}
                  leftIcon={<Plus size={14} />}
                >
                  Thêm Nhân Sự
                </Button>
              </div>
            </form>
          </Card>

          {/* Table danh sách nhân sự */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px', width: '60px', textAlign: 'center' }}>Thứ tự</th>
                  <th style={{ padding: '10px' }}>Tên User</th>
                  <th style={{ padding: '10px' }}>Họ Tên / Email</th>
                  <th style={{ padding: '10px', width: '110px', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ padding: '10px', width: '70px', textAlign: 'center' }}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {roundRobinUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Chưa có nhân sự nào trong danh sách.
                    </td>
                  </tr>
                ) : (
                  roundRobinUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>
                        {u.thu_tu}
                      </td>
                      <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.ten_user}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                        <div>{u.ho_ten || '-'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email || ''}</div>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleUserActive(u)}
                          style={{
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title="Bấm để bật / tắt trạng thái tham gia xoay vòng"
                        >
                          {u.active ? (
                            <Badge variant="success">Hoạt động</Badge>
                          ) : (
                            <Badge variant="neutral">Tạm ngưng</Badge>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--color-error)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Xóa nhân sự"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* ================= MODAL: ĐIỀU CHUYỂN NGƯỜI THỰC HIỆN (ADMIN ONLY) ================= */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Admin Điều Chuyển Người Thực Hiện"
        maxWidth="480px"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAssignModalOpen(false)}
              disabled={isAssigning}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmAssign}
              isLoading={isAssigning}
            >
              Xác Nhận Điều Chuyển
            </Button>
          </>
        }
      >
        {selectedRequestToAssign && (
          <div>
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '13px'
            }}>
              <div><strong>ID Yêu Cầu:</strong> #{selectedRequestToAssign.id_yeu_cau}</div>
              <div><strong>Chuỗi:</strong> {selectedRequestToAssign.chuoi || '-'}</div>
              <div><strong>Mô tả:</strong> {selectedRequestToAssign.mo_ta || '-'}</div>
              <div style={{ marginTop: '4px' }}>
                <strong>Người thực hiện hiện tại:</strong>{' '}
                <Badge variant="warning">{selectedRequestToAssign.user_thuc_hien || 'Chưa gán'}</Badge>
              </div>
            </div>

            <Select
              label="Chọn Nhân Sự Mới Để Bàn Giao *"
              options={[
                { value: '', label: '-- Chọn nhân sự --' },
                ...roundRobinUsers.map(u => ({ value: u.ten_user, label: `${u.ten_user}${u.ho_ten ? ` (${u.ho_ten})` : ''}` }))
              ]}
              value={assignedUserName}
              onChange={(e) => setAssignedUserName(e.target.value)}
            />

            <div style={{ marginTop: '12px' }}>
              <Input
                label="Hoặc nhập tên nhân sự khác"
                placeholder="Nhập tên user thực hiện..."
                value={assignedUserName}
                onChange={(e) => setAssignedUserName(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL: CẤU HÌNH TÀI KHOẢN PIM (SUPER ADMIN ONLY) ================= */}
      {isSuperAdmin && (
        <Modal
          isOpen={configModalOpen}
          onClose={() => setConfigModalOpen(false)}
          title="Cấu Hình Tài Khoản Đăng Nhập SSO / PIM"
          maxWidth="520px"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setConfigModalOpen(false)}
                disabled={isSavingConfig || isTestingLogin}
              >
                Đóng
              </Button>
              <Button
                variant="outline"
                onClick={handleTestLogin}
                isLoading={isTestingLogin}
                disabled={isSavingConfig || !configUsername || !configPassword}
                leftIcon={<CheckCircle2 size={16} />}
              >
                Kiểm Tra Đăng Nhập
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                isLoading={isSavingConfig}
                disabled={isTestingLogin || !configUsername || !configPassword}
                leftIcon={<Check size={16} />}
              >
                Lưu Cấu Hình
              </Button>
            </>
          }
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Badge variant="primary">Quản Trị Hệ Thống</Badge>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Tài khoản SSO dùng để đồng bộ dữ liệu PIM tự động
              </span>
            </div>

            {testLoginAlert && (
              <div style={{ marginBottom: '16px' }}>
                <Alert type={testLoginAlert.type} message={testLoginAlert.message} />
              </div>
            )}

            {isLoadingConfig ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Đang tải thông tin cấu hình...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Input
                  label="Tài khoản SSO (Email đăng nhập) *"
                  type="email"
                  placeholder="VD: dung.nguyenanh@ggg.com.vn"
                  required
                  value={configUsername}
                  onChange={(e) => setConfigUsername(e.target.value)}
                />

                <Input
                  label="Mật khẩu SSO *"
                  showPasswordToggle={true}
                  placeholder="Nhập mật khẩu..."
                  required
                  value={configPassword}
                  onChange={(e) => setConfigPassword(e.target.value)}
                />

                {(configLastUpdated || configLastUser) && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}>
                    {configLastUpdated && (
                      <div>Cập nhật gần nhất: <strong>{formatFullDateTime(configLastUpdated)}</strong></div>
                    )}
                    {configLastUser && (
                      <div style={{ marginTop: '2px' }}>Người thực hiện: <strong>{configLastUser}</strong></div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CÀI ĐẶT LỊCH QUÉT PIM TỰ ĐỘNG (ADMIN & SUPER ADMIN) ================= */}
      {isAdmin && (
        <Modal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          title="Cài Đặt Lịch Quét PIM Tự Động (3 lần / ngày)"
          maxWidth="520px"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setScheduleModalOpen(false)}
                disabled={isSavingSchedule}
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSchedule}
                isLoading={isSavingSchedule}
                leftIcon={<Check size={16} />}
              >
                Lưu Cấu Hình Lịch
              </Button>
            </>
          }
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Badge variant="primary">Quản Trị Viên</Badge>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Tự động kiểm tra ID yêu cầu PIM mới theo 3 mốc giờ mỗi ngày
              </span>
            </div>

            {scheduleAlert && (
              <div style={{ marginBottom: '16px' }}>
                <Alert type={scheduleAlert.type} message={scheduleAlert.message} />
              </div>
            )}

            {isLoadingSchedule ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Đang tải cấu hình lịch quét...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                      Trạng Thái Lịch Tự Động
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {scheduleIsActive ? 'Đang bật quét tự động mỗi ngày' : 'Tạm ngưng quét tự động'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleIsActive(!scheduleIsActive)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {scheduleIsActive ? (
                      <Badge variant="success">Đang Bật</Badge>
                    ) : (
                      <Badge variant="neutral">Đang Tắt</Badge>
                    )}
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                    3 Mốc Thời Gian Quét Hàng Ngày (Định dạng 24h: HH:MM)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <Input
                      label="Lần 1 (Sáng sớm)"
                      type="time"
                      value={scheduleTime1}
                      onChange={(e) => setScheduleTime1(e.target.value)}
                    />
                    <Input
                      label="Lần 2 (Trưa)"
                      type="time"
                      value={scheduleTime2}
                      onChange={(e) => setScheduleTime2(e.target.value)}
                    />
                    <Input
                      label="Lần 3 (Chiều)"
                      type="time"
                      value={scheduleTime3}
                      onChange={(e) => setScheduleTime3(e.target.value)}
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Mặc định gợi ý: <strong>03:00</strong> (3h sáng) • <strong>12:00</strong> (12h00 trưa) • <strong>16:30</strong> (16h30 chiều)
                  </div>
                </div>

                {(scheduleLastRun || scheduleLastStatus || scheduleLastUpdated) && (
                  <div style={{
                    backgroundColor: 'var(--bg-secondary)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6'
                  }}>
                    {scheduleLastRun && (
                      <div>Lần quét gần nhất: <strong>{formatFullDateTime(scheduleLastRun)}</strong></div>
                    )}
                    {scheduleLastStatus && (
                      <div>Kết quả lần gần nhất: <strong>{scheduleLastStatus}</strong></div>
                    )}
                    {scheduleLastUpdated && (
                      <div style={{ marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
                        Cấu hình sửa lần cuối bởi <strong>{scheduleLastUser || 'Hệ thống'}</strong> lúc <strong>{formatFullDateTime(scheduleLastUpdated)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ================= MODAL: CẬP NHẬT TRẠNG THÁI & SO (CHO TẤT CẢ USER) ================= */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Cập Nhật Trạng Thái Yêu Cầu #${selectedRequestForStatus?.id_yeu_cau}`}
        maxWidth="540px"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setStatusModalOpen(false)}
              disabled={isSavingStatus}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveStatusModal}
              isLoading={isSavingStatus}
              leftIcon={<Check size={16} />}
            >
              Lưu Cập Nhật
            </Button>
          </>
        }
      >
        {selectedRequestForStatus && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Thông tin tóm tắt */}
            <div style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>ID Yêu Cầu:</strong>{' '}
                  <span style={{ color: 'var(--color-primary-text)', fontWeight: 700 }}>
                    #{selectedRequestForStatus.id_yeu_cau}
                  </span>
                </div>
                {selectedRequestForStatus.link_yeu_cau && (
                  <a
                    href={selectedRequestForStatus.link_yeu_cau}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: 'var(--color-primary-hover)',
                      textDecoration: 'none',
                      fontWeight: 600
                    }}
                  >
                    <span>Mở link PIM</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div><strong>Chuỗi:</strong> {selectedRequestForStatus.chuoi || '-'}</div>
              <div><strong>Mô tả:</strong> {selectedRequestForStatus.mo_ta || '-'}</div>
              <div><strong>Thời gian yêu cầu:</strong> {formatDateTime(selectedRequestForStatus.thoi_gian_thuc_hien)}</div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px dashed var(--border-color)'
              }}>
                <div>
                  <strong>Người thực hiện:</strong>{' '}
                  {renderUserBadge(selectedRequestForStatus.user_thuc_hien)}
                </div>
                {selectedRequestForStatus.user_update && (
                  <div>
                    <strong>Người vừa update:</strong>{' '}
                    <Badge variant="neutral">{selectedRequestForStatus.user_update}</Badge>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                      ({formatDateTime(selectedRequestForStatus.thoi_gian_update)})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Nút thao tác nhanh */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{
                fontSize: '12px',
                color: '#92400E',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>💡</span>
                <span>Chỉ chuyển qua tab <strong>Đã Hoàn Thành</strong> khi <strong>cả 3 mục đều Hoàn Thành</strong>.</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalTrangThai('hoàn thành');
                  setModalSO('hoàn thành');
                  setModalGuiMail('hoàn thành');
                }}
                style={{
                  background: 'none',
                  border: '1px dashed var(--color-success-border)',
                  color: 'var(--color-success)',
                  backgroundColor: 'var(--color-success-bg)',
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={14} />
                <span>Hoàn thành cả 3 (Trạng thái + SO + Gửi mail)</span>
              </button>
            </div>

            {/* Lựa chọn Trạng Thái Thực Hiện */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                1. Trạng Thái Thực Hiện *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalTrangThai('chưa hoàn thành')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${modalTrangThai === 'chưa hoàn thành' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    backgroundColor: modalTrangThai === 'chưa hoàn thành' ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: modalTrangThai === 'chưa hoàn thành' ? 700 : 500,
                    color: 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Clock size={18} style={{ color: modalTrangThai === 'chưa hoàn thành' ? 'var(--color-primary-hover)' : 'var(--text-muted)' }} />
                  <span>Chưa Hoàn Thành</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTrangThai('hoàn thành')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${modalTrangThai === 'hoàn thành' ? 'var(--color-success)' : 'var(--border-color)'}`,
                    backgroundColor: modalTrangThai === 'hoàn thành' ? 'var(--color-success-bg)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: modalTrangThai === 'hoàn thành' ? 700 : 500,
                    color: modalTrangThai === 'hoàn thành' ? 'var(--color-success-text)' : 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: modalTrangThai === 'hoàn thành' ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <span>Hoàn Thành</span>
                </button>
              </div>
            </div>

            {/* Lựa chọn Trạng Thái SO */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                2. Trạng Thái SO *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalSO('chưa hoàn thành')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${modalSO === 'chưa hoàn thành' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    backgroundColor: modalSO === 'chưa hoàn thành' ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: modalSO === 'chưa hoàn thành' ? 700 : 500,
                    color: 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Clock size={18} style={{ color: modalSO === 'chưa hoàn thành' ? 'var(--color-primary-hover)' : 'var(--text-muted)' }} />
                  <span>Chưa Hoàn Thành</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalSO('hoàn thành')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${modalSO === 'hoàn thành' ? 'var(--color-success)' : 'var(--border-color)'}`,
                    backgroundColor: modalSO === 'hoàn thành' ? 'var(--color-success-bg)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: modalSO === 'hoàn thành' ? 700 : 500,
                    color: modalSO === 'hoàn thành' ? 'var(--color-success-text)' : 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: modalSO === 'hoàn thành' ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <span>Hoàn Thành</span>
                </button>
              </div>
            </div>

            {/* Lựa chọn Gửi Mail Thông Báo Nhà Hàng */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                3. Gửi Mail Thông Báo Nhà Hàng *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalGuiMail('chưa hoàn thành')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${modalGuiMail === 'chưa hoàn thành' ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    backgroundColor: modalGuiMail === 'chưa hoàn thành' ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: modalGuiMail === 'chưa hoàn thành' ? 700 : 500,
                    color: 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Clock size={18} style={{ color: modalGuiMail === 'chưa hoàn thành' ? 'var(--color-primary-hover)' : 'var(--text-muted)' }} />
                  <span>Chưa Hoàn Thành</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalGuiMail('hoàn thành')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${modalGuiMail === 'hoàn thành' ? 'var(--color-success)' : 'var(--border-color)'}`,
                    backgroundColor: modalGuiMail === 'hoàn thành' ? 'var(--color-success-bg)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: modalGuiMail === 'hoàn thành' ? 700 : 500,
                    color: modalGuiMail === 'hoàn thành' ? 'var(--color-success-text)' : 'var(--text-primary)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <CheckCircle2 size={18} style={{ color: modalGuiMail === 'hoàn thành' ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <span>Hoàn Thành</span>
                </button>
              </div>
            </div>

            {/* Bước 4 (Chèn mới): Đính kèm hình ảnh chụp file Excel món setup */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  4. Hình Ảnh Chụp File Excel Món Setup (Đính Kèm Hoặc Paste Ctrl+V)
                </label>
                {modalImages.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#7E22CE', fontWeight: 600 }}>
                      Đã đính kèm: {modalImages.length} hình ảnh
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenImagePreview(modalImages, 0, selectedRequestForStatus ? `Yêu cầu #${selectedRequestForStatus.id_yeu_cau} - ${selectedRequestForStatus.chuoi || ''}` : 'Hình ảnh setup')}
                      style={{
                        fontSize: '11px',
                        color: '#7E22CE',
                        fontWeight: 700,
                        backgroundColor: '#F3E8FF',
                        border: '1px solid #D8B4FE',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Image size={11} />
                      <span>Xem &amp; lướt tất cả ({modalImages.length})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Vùng Dropzone / Pastezone */}
              <div
                tabIndex={0}
                onPaste={handlePasteSetupImages}
                style={{
                  border: '2px dashed #CBD5E1',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F8FAFC',
                  padding: '16px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#7C3AED')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#CBD5E1')}
              >
                <input
                  type="file"
                  ref={setupFileInputRef}
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleUploadSetupFiles(e.target.files);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#EDE9FE',
                    color: '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isUploadingImages ? <RefreshCw size={20} className="spin-animation" /> : <Upload size={20} />}
                  </div>

                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#7C3AED' }}>
                      {isUploadingImages ? 'Đang tải ảnh lên hệ thống...' : '⚡ Nhấn Ctrl+V bất kỳ lúc nào để dán ảnh (không cần click)'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Hệ thống tự động nhận ảnh chụp màn hình từ Clipboard khi cửa sổ này đang mở
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setupFileInputRef.current?.click();
                    }}
                    disabled={isUploadingImages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'all 0.15s ease',
                      marginTop: '2px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#7C3AED';
                      e.currentTarget.style.color = '#7C3AED';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                  >
                    <Image size={14} color="#7C3AED" />
                    <span>Hoặc bấm vào đây để chọn ảnh từ máy tính</span>
                  </button>
                </div>
              </div>

              {/* Danh sách ảnh đã đính kèm */}
              {modalImages.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)'
                }}>
                  {modalImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'relative',
                        width: '84px',
                        height: '84px',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Ảnh setup ${idx + 1}`}
                        onClick={() => handleOpenImagePreview(modalImages, idx, selectedRequestForStatus ? `Yêu cầu #${selectedRequestForStatus.id_yeu_cau} - ${selectedRequestForStatus.chuoi || ''}` : 'Hình ảnh setup')}
                        title="Bấm để phóng to và lướt xem tất cả ảnh setup"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          cursor: 'zoom-in'
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSetupImage(idx);
                        }}
                        title="Gỡ ảnh này"
                        style={{
                          position: 'absolute',
                          top: '3px',
                          right: '3px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lựa chọn Người Phụ Trách Thực Hiện (Admin) */}
            {isAdmin && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                  5. Người Phụ Trách Thực Hiện (Dành Cho Quản Trị Viên)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Select
                    options={[
                      { value: '', label: '-- Chọn nhân sự xoay vòng --' },
                      ...roundRobinUsers.map(u => ({ value: u.ten_user, label: `${u.ten_user}${u.ho_ten ? ` (${u.ho_ten})` : ''}` }))
                    ]}
                    value={modalAssignee}
                    onChange={(e) => setModalAssignee(e.target.value)}
                  />
                  <Input
                    placeholder="Hoặc nhập tên khác..."
                    value={modalAssignee}
                    onChange={(e) => setModalAssignee(e.target.value)}
                  />
                </div>
                {modalAssignee !== (selectedRequestForStatus.user_thuc_hien || '') && (
                  <div style={{ fontSize: '12px', color: 'var(--color-primary-text)', marginTop: '6px' }}>
                    * Người thực hiện sẽ đổi từ <strong>{selectedRequestForStatus.user_thuc_hien || 'Chưa gán'}</strong> thành <strong>{modalAssignee}</strong> khi lưu.
                  </div>
                )}
              </div>
            )}

            {/* Thông báo ghi nhận người update */}
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              color: '#1E40AF',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              Khi bạn bấm <strong>Lưu Cập Nhật</strong>, hệ thống sẽ tự động cập nhật bạn (<strong>{user?.username}</strong>) là người vừa update dòng này và ghi vào Nhật Ký Thao Tác (Logs).
            </div>
          </div>
        )}
      </Modal>

      {/* ================= MODAL XEM HÌNH ẢNH SETUP (LƯỚT CUỘN XEM TẤT CẢ ẢNH) ================= */}
      {previewImages.length > 0 && (
        <Modal
          isOpen={previewImages.length > 0}
          onClose={handleCloseImagePreview}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Image size={17} color="#7E22CE" />
                <span>Danh Sách Hình Ảnh Setup ({previewImages.length} ảnh)</span>
              </span>
              {previewTitle && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    maxWidth: '550px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={previewTitle}
                >
                  • {previewTitle}
                </span>
              )}
            </div>
          }
          maxWidth="1050px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>💡 <strong>Hướng dẫn:</strong> Lăn chuột (hoặc vuốt màn hình) để <strong>lướt cuộn xuống xem lần lượt tất cả {previewImages.length} ảnh</strong>. Nhấn <strong>Esc</strong> hoặc nút Đóng để thoát.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" size="sm" onClick={handleCloseImagePreview}>
                  Đóng ({previewImages.length} ảnh)
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto', padding: '4px 6px' }}>
            {/* Quick jump navigation strip if > 1 image */}
            {previewImages.length > 1 && (
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '8px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={13} color="#7C3AED" />
                  <span>Chuyển nhanh ảnh ({previewImages.length}):</span>
                </span>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                  {previewImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`pim-preview-img-card-${idx}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      title={`Cuộn nhanh đến Ảnh ${idx + 1}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#1E293B',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`thumb-${idx + 1}`}
                        style={{ width: '16px', height: '16px', objectFit: 'cover', borderRadius: '2px' }}
                      />
                      <span>Ảnh {idx + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List of images stacked vertically for continuous scrolling */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {previewImages.map((imgUrl, idx) => (
                <div
                  key={idx}
                  id={`pim-preview-img-card-${idx}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      padding: '2px 4px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#1E293B',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: '#7C3AED',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 800
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span>Ảnh {idx + 1} / {previewImages.length}</span>
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={imgUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #BFDBFE',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>Mở tab mới</span>
                      </a>
                      <a
                        href={imgUrl}
                        download={`anh_setup_pim_${idx + 1}.png`}
                        style={{
                          textDecoration: 'none',
                          padding: '4px 10px',
                          borderRadius: '4px',
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Download size={12} />
                        <span>Tải về</span>
                      </a>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1'
                    }}
                  >
                    <img
                      src={imgUrl}
                      alt={`Ảnh setup ${idx + 1}`}
                      loading="lazy"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};


