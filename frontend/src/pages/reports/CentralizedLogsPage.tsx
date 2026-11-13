import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Trash2,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { DateInput } from '../../components/ui/DateInput';
import {
  logService,
  LogItem,
  UserLogPermissionsResponse
} from '../../services/logService';
import {
  checkIsAdmin,
  checkIsSuperAdmin,
  checkIsInventoryRole,
  checkIsHelpdeskRole
} from '../../utils/authUtils';

export const CentralizedLogsPage: React.FC = () => {
  const { user } = useAuth();

  // Permission & Group state
  const isSuperAdmin = checkIsSuperAdmin(user);
  const isAdmin = checkIsAdmin(user);
  const canViewAll = isAdmin || isSuperAdmin;

  // Selected Log Group ('ALL', 'APP', 'INVENTORY', 'HELPDESK', 'QUAN_TRI')
  const [selectedGroup, setSelectedGroup] = useState<string>('APP');
  const [userPerms, setUserPerms] = useState<UserLogPermissionsResponse | null>(null);

  // Filter state
  const [search, setSearch] = useState<string>('');
  const [manHinh, setManHinh] = useState<string>('');
  const [userThuchien, setUserThuchien] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Data state
  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modal detail state
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  // Purge modal state (Admin only)
  const [showPurgeModal, setShowPurgeModal] = useState<boolean>(false);
  const [purgeYears, setPurgeYears] = useState<number>(3);
  const [purging, setPurging] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Tải thông tin phân quyền truy cập logs của user
  useEffect(() => {
    const fetchPerms = async () => {
      try {
        const perms = await logService.getUserLogPermissions();
        setUserPerms(perms);

        // Đặt nhóm mặc định theo quyền của user
        if (perms.can_view_all) {
          setSelectedGroup('ALL');
        } else if (perms.default_group) {
          setSelectedGroup(perms.default_group);
        } else {
          setSelectedGroup('APP');
        }
      } catch (err) {
        console.error('Lỗi lấy phân quyền logs:', err);
        // Fallback kiểm tra client-side
        if (canViewAll) {
          setSelectedGroup('ALL');
        } else if (checkIsInventoryRole(user)) {
          setSelectedGroup('INVENTORY');
        } else if (checkIsHelpdeskRole(user)) {
          setSelectedGroup('HELPDESK');
        } else {
          setSelectedGroup('APP');
        }
      }
    };
    fetchPerms();
  }, [user]);

  // 2. Tải dữ liệu logs
  const fetchLogs = async (overrideGroup?: string, overridePage?: number) => {
    setLoading(true);
    const grp = overrideGroup !== undefined ? overrideGroup : selectedGroup;
    const p = overridePage !== undefined ? overridePage : page;

    try {
      const res = await logService.getLogs({
        nhom_quyen: grp === 'ALL' ? undefined : grp,
        man_hinh: manHinh || undefined,
        search: search || undefined,
        user_thuchien: userThuchien || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page: p,
        page_size: pageSize
      });

      setLogs(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      console.error('Lỗi tải logs:', err);
      showToast('Lỗi khi tải danh sách logs: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedGroup, page, pageSize]);

  // Handle group change with permission verification
  const handleGroupChange = (newGroup: string) => {
    // Nếu không phải admin và nhóm này không nằm trong allowed_groups thì chặn
    if (!canViewAll) {
      const allowed = userPerms?.allowed_groups || ['APP'];
      if (!allowed.includes(newGroup)) {
        showToast(`Tài khoản của bạn chỉ có quyền xem logs nhóm: ${allowed.join(', ')}`, 'info');
        return;
      }
    }
    setSelectedGroup(newGroup);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(undefined, 1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setManHinh('');
    setUserThuchien('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    fetchLogs(undefined, 1);
  };

  // Quick date filters
  const applyQuickDate = (type: 'today' | '7days' | '30days' | 'all') => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'today') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else if (type === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(formatDate(past));
      setEndDate(formatDate(now));
    } else {
      setStartDate('');
      setEndDate('');
    }
    setPage(1);
  };

  // Handle purge old logs
  const handleExecutePurge = async () => {
    setPurging(true);
    try {
      const res = await logService.purgeOldLogs(purgeYears);
      setShowPurgeModal(false);
      showToast(res.message, 'success');
      fetchLogs();
    } catch (err: any) {
      showToast('Lỗi dọn dẹp logs: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setPurging(false);
    }
  };

  // Helper check if an option in dropdown is enabled
  const isGroupAllowed = (grp: string) => {
    if (canViewAll) return true;
    const allowed = userPerms?.allowed_groups || ['APP'];
    return allowed.includes(grp);
  };

  // Color mapping helper
  const getGroupBadge = (nhom: string) => {
    const upper = (nhom || '').toUpperCase();
    if (upper === 'APP') {
      return <Badge variant="primary">📱 APP</Badge>;
    }
    if (upper === 'INVENTORY') {
      return <Badge variant="warning">📦 INVENTORY</Badge>;
    }
    if (upper === 'HELPDESK') {
      return <Badge variant="info">🎧 HELPDESK</Badge>;
    }
    if (upper === 'QUAN_TRI') {
      return <Badge variant="neutral">🛡️ QUẢN TRỊ</Badge>;
    }
    return <Badge variant="neutral">{nhom}</Badge>;
  };

  return (
    <div className="page-container-fullheight" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'hidden' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: toastMessage.type === 'success' ? '#15803D' : toastMessage.type === 'error' ? '#DC2626' : '#2563EB',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* ── HEADER CARD ── */}
      <Card style={{ flexShrink: 0 }}>
        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  border: '1.5px solid #93C5FD',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB'
                }}
              >
                <FileText size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Báo Cáo Logs Tập Trung
                  </h2>
                  <Badge variant="primary">LOGS__New</Badge>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {canViewAll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPurgeModal(true)}
                  leftIcon={<Trash2 size={13} color="#DC2626" />}
                  style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                >
                  Dọn dẹp logs cũ (&gt; 3 năm)
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchLogs()}
                disabled={loading}
                leftIcon={<RefreshCw size={13} className={loading ? 'animate-spin' : ''} />}
              >
                {loading ? 'Đang tải...' : 'Làm mới'}
              </Button>
            </div>
          </div>

          {/* ── DROPDOWN CHỌN NHÓM LOGS (TRỌNG TÂM THEO YÊU CẦU CỦA USER) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              padding: '12px 18px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="#2563EB" />
                Chọn Nhóm Logs Hiển Thị:
              </label>

              {/* DROPDOWN CHÍNH THEO YÊU CẦU */}
              <select
                value={selectedGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '2px solid #2563EB',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: '#1E3A8A',
                  cursor: 'pointer',
                  minWidth: '280px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.1)'
                }}
              >
                {/* 1. Tất cả nhóm (Chỉ Admin / Super Admin) */}
                <option value="ALL" disabled={!canViewAll}>
                  {canViewAll ? '🌐 Tất Cả Các Nhóm Logs' : '🌐 Tất Cả Các Nhóm (🔒 Chỉ Quản Trị)'}
                </option>

                {/* 2. Nhóm APP */}
                <option
                  value="APP"
                  disabled={!isGroupAllowed('APP')}
                >
                  {isGroupAllowed('APP')
                    ? '📱 Nhóm APP (Memo, PIM, Setup NH, GPOS, SSO...)'
                    : '📱 Nhóm APP (🔒 Không có quyền)'}
                </option>

                {/* 3. Nhóm INVENTORY */}
                <option
                  value="INVENTORY"
                  disabled={!isGroupAllowed('INVENTORY')}
                >
                  {isGroupAllowed('INVENTORY')
                    ? '📦 Nhóm INVENTORY (Kho, NCC, PR/PO/DO...)'
                    : '📦 Nhóm INVENTORY (🔒 Không có quyền)'}
                </option>

                {/* 4. Nhóm HELPDESK */}
                <option
                  value="HELPDESK"
                  disabled={!isGroupAllowed('HELPDESK')}
                >
                  {isGroupAllowed('HELPDESK')
                    ? '🎧 Nhóm HELPDESK (Chuyển DB, Fix CPU, Reset pass, Mở khóa bàn...)'
                    : '🎧 Nhóm HELPDESK (🔒 Không có quyền)'}
                </option>

                {/* 5. Nhóm QUẢN TRỊ */}
                <option
                  value="QUAN_TRI"
                  disabled={!isGroupAllowed('QUAN_TRI')}
                >
                  {isGroupAllowed('QUAN_TRI')
                    ? '🛡️ Nhóm QUẢN TRỊ (Phân quyền, Users, Job Scheduler...)'
                    : '🛡️ Nhóm QUẢN TRỊ (🔒 Không có quyền)'}
                </option>
              </select>

              {!canViewAll && (
                <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} color="#D97706" />
                  Bạn đang ở quyền <strong>{user?.role_name || user?.phanquyen || 'App'}</strong> nên các nhóm khác được làm mờ theo phân quyền.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <span>Tổng số bản ghi: <strong style={{ color: '#2563EB', fontSize: '15px' }}>{total.toLocaleString()}</strong> dòng</span>
            </div>
          </div>
        </div>
      </Card>


      {/* ── BỘ LỌC TÌM KIẾM ── */}
      <Card>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {/* Search input */}
            <div style={{ flex: '2 1 240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm nội dung, hành động, module, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}
              />
              <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            </div>

            {/* Filter màn hình */}
            <div style={{ flex: '1 1 160px' }}>
              <input
                type="text"
                placeholder="Màn hình (VD: MEMO, PIM, SSO...)"
                value={manHinh}
                onChange={(e) => setManHinh(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Filter user thực hiện */}
            <div style={{ flex: '1 1 140px' }}>
              <input
                type="text"
                placeholder="User thực hiện..."
                value={userThuchien}
                onChange={(e) => setUserThuchien(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}
              />
            </div>

            {/* Từ ngày */}
            <div style={{ flex: '1 1 130px' }}>
              <DateInput
                value={startDate}
                onChange={setStartDate}
                compact
                containerStyle={{ width: '100%' }}
                style={{ height: '32px', fontSize: '13px' }}
              />
            </div>

            {/* Đến ngày */}
            <div style={{ flex: '1 1 130px' }}>
              <DateInput
                value={endDate}
                onChange={setEndDate}
                compact
                containerStyle={{ width: '100%' }}
                style={{ height: '32px', fontSize: '13px' }}
              />
            </div>

            <Button type="submit" variant="primary" size="sm" leftIcon={<Search size={13} />}>
              Tìm kiếm
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
              Đặt lại
            </Button>
          </form>

          {/* Quick Date Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
            <span style={{ color: '#64748B', fontWeight: 600 }}>Khoảng thời gian:</span>
            <button
              type="button"
              onClick={() => applyQuickDate('today')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11.5px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer'
              }}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => applyQuickDate('7days')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11.5px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer'
              }}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => applyQuickDate('30days')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11.5px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer'
              }}
            >
              30 ngày qua
            </button>
            <button
              type="button"
              onClick={() => applyQuickDate('all')}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11.5px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer'
              }}
            >
              Tất cả thời gian
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#64748B' }}>Dòng/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* ── BẢNG DỮ LIỆU LOGS ── */}
      <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <TopScrollTable maxHeight="100%">
          <table style={{ width: '100%', minWidth: '1080px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#F8FAFC' }}>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid var(--border-color)', color: '#475569' }}>
                <th style={{ padding: '10px 12px', width: '50px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>STT</th>
                <th style={{ padding: '10px 12px', width: '160px', backgroundColor: '#F8FAFC' }}>Thời Gian</th>
                <th style={{ padding: '10px 12px', width: '130px', backgroundColor: '#F8FAFC' }}>Nhóm Quyền</th>
                <th style={{ padding: '10px 12px', width: '160px', backgroundColor: '#F8FAFC' }}>Màn Hình / Phân Hệ</th>
                <th style={{ padding: '10px 12px', width: '130px', backgroundColor: '#F8FAFC' }}>Hành Động</th>
                <th style={{ padding: '10px 12px', backgroundColor: '#F8FAFC' }}>Nội Dung Thao Tác</th>
                <th style={{ padding: '10px 12px', width: '140px', backgroundColor: '#F8FAFC' }}>Người Thực Hiện</th>
                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>Trạng Thái</th>
                <th style={{ padding: '10px 12px', width: '80px', textAlign: 'center', backgroundColor: '#F8FAFC' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px' }} color="#2563EB" />
                    <div>Đang tải dữ liệu logs...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                    <Info size={24} style={{ margin: '0 auto 8px' }} color="#94A3B8" />
                    <div>Không tìm thấy bản ghi logs nào phù hợp với điều kiện tìm kiếm.</div>
                  </td>
                </tr>
              ) : (
                logs.map((item, idx) => {
                  const stt = (page - 1) * pageSize + idx + 1;
                  const dateStr = item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '—';
                  const isSuccess = (item.status || 'SUCCESS').toUpperCase() === 'SUCCESS';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: idx % 2 === 0 ? 'var(--bg-primary)' : '#FAFBFD',
                        transition: 'background-color 0.1s'
                      }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                        {stt}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '12px', color: '#334155' }}>
                        {dateStr}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {getGroupBadge(item.nhom_quyen)}
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1E293B', fontSize: '12.5px' }}>
                        {item.man_hinh}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#334155', fontSize: '11.5px', fontWeight: 600 }}>
                          {item.hanh_dong || 'ACTION'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#334155', maxWidth: '380px', lineHeight: '1.4' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.noi_dung || ''}>
                          {item.noi_dung || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#2563EB', fontFamily: 'monospace' }}>
                        {item.user_thuchien}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <Badge variant={isSuccess ? 'success' : 'danger'}>
                          {item.status || 'SUCCESS'}
                        </Badge>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(item)}
                          title="Xem chi tiết log"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#2563EB',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600
                          }}
                        >
                          <Eye size={12} /> Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TopScrollTable>

        {/* Phân trang */}
        <div
          style={{
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '13px',
            flexShrink: 0,
          }}
        >
          <div style={{ color: '#64748B' }}>
            Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng cộng <strong>{total.toLocaleString()}</strong> bản ghi)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              leftIcon={<ChevronLeft size={13} />}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              rightIcon={<ChevronRight size={13} />}
            >
              Trang sau
            </Button>
          </div>
        </div>
      </Card>

      {/* ── MODAL CHI TIẾT LOG ── */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Chi Tiết Bản Ghi Log #${selectedLog.id}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px' }}>
              <div>
                <span style={{ color: '#64748B' }}>Thời gian:</span>
                <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {new Date(selectedLog.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Nhóm quyền:</span>
                <div>{getGroupBadge(selectedLog.nhom_quyen)}</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Màn hình / Module:</span>
                <div style={{ fontWeight: 700, color: '#1E293B' }}>{selectedLog.man_hinh}</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Hành động:</span>
                <div style={{ fontWeight: 700 }}>{selectedLog.hanh_dong || 'ACTION'}</div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Người thực hiện:</span>
                <div style={{ fontWeight: 700, color: '#2563EB', fontFamily: 'monospace' }}>
                  {selectedLog.user_thuchien} {selectedLog.user_role ? `(${selectedLog.user_role})` : ''}
                </div>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Trạng thái:</span>
                <div>
                  <Badge variant={selectedLog.status === 'SUCCESS' ? 'success' : 'danger'}>
                    {selectedLog.status || 'SUCCESS'}
                  </Badge>
                </div>
              </div>
            </div>

            {selectedLog.ip_client && (
              <div>
                <span style={{ color: '#64748B' }}>IP Máy Client:</span>
                <strong style={{ fontFamily: 'monospace', marginLeft: '6px' }}>{selectedLog.ip_client}</strong>
              </div>
            )}

            <div>
              <span style={{ fontWeight: 700, color: '#334155' }}>Nội dung chi tiết:</span>
              <div
                style={{
                  marginTop: '4px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.5',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {selectedLog.noi_dung || '(Không có nội dung chi tiết)'}
              </div>
            </div>

            {selectedLog.du_lieu_cu && (
              <div>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>Dữ liệu cũ:</span>
                <pre
                  style={{
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}
                >
                  {selectedLog.du_lieu_cu}
                </pre>
              </div>
            )}

            {selectedLog.du_lieu_moi && (
              <div>
                <span style={{ fontWeight: 700, color: '#15803D' }}>Dữ liệu mới:</span>
                <pre
                  style={{
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}
                >
                  {selectedLog.du_lieu_moi}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL DỌN DẸP LOGS CŨ (> 3 NĂM) ── */}
      {showPurgeModal && (
        <Modal
          isOpen={showPurgeModal}
          onClose={() => setShowPurgeModal(false)}
          title="🧹 Dọn Dẹp Logs Cũ Hệ Thống"
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', lineHeight: '1.45' }}>
              <strong>Lưu ý bảo trì:</strong> Thao tác này sẽ xóa vĩnh viễn các bản ghi logs trong bảng <strong>LOGS__New</strong> có thời gian lưu trữ lớn hơn số năm được chọn nhằm tối ưu dung lượng DB.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 700 }}>Xóa các logs đã lưu trữ lâu hơn:</label>
              <select
                value={purgeYears}
                onChange={(e) => setPurgeYears(Number(e.target.value))}
                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
              >
                <option value={1}>1 năm trước</option>
                <option value={2}>2 năm trước</option>
                <option value={3}>3 năm trước (Khuyến nghị chuẩn hệ thống)</option>
                <option value={5}>5 năm trước</option>
              </select>
            </div>

            <div style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.5' }}>
              💡 Hệ thống cũng đã tích hợp tác vụ chạy ngầm định kỳ <strong>'Tự Động Dọn Dẹp Logs Cũ (Sau 3 Năm)'</strong> trong Job Scheduler, tự động thực thi vào lúc 03:00 Chủ Nhật hàng tuần.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setShowPurgeModal(false)} disabled={purging}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecutePurge}
                disabled={purging}
                leftIcon={purging ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                style={{ backgroundColor: '#DC2626', borderColor: '#B91C1C' }}
              >
                {purging ? 'Đang dọn dẹp...' : 'Xác nhận dọn dẹp'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
