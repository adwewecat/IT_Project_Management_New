import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Plus,
  Download,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  PrPoDoItem,
  PrPoDoCreate,
  PrPoDoStats,
  PrPoDoFilterParams
} from '../../types/prPoDo';
import { prPoDoService } from '../../services/prPoDoService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { DateInput } from '../../components/ui/DateInput';
import {
  checkIsAdmin,
  checkIsInventoryRole,
  checkIsHelpdeskRole,
  checkIsAppRole,
} from '../../utils/authUtils';

export const TheodoiPrPoDoPage: React.FC = () => {
  const { user } = useAuth();

  // Role detection
  const isAdmin = checkIsAdmin(user);
  const isInventory = checkIsInventoryRole(user);
  const isHelpdesk = checkIsHelpdeskRole(user);
  const isApp = checkIsAppRole(user);

  const canEdit = isAdmin || isInventory || isHelpdesk || isApp;

  // Data states
  const [items, setItems] = useState<PrPoDoItem[]>([]);
  const [stats, setStats] = useState<PrPoDoStats>({
    total: 0,
    total_bu: 0,
    total_fc: 0,
    total_md: 0,
    total_done: 0,
  });
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [loaiFilter, setLoaiFilter] = useState<string>('ALL');
  const [trangThaiFilter, setTrangThaiFilter] = useState<string>('PENDING'); // Mặc định xem các đơn đang xử lý
  const [sortByDate, setSortByDate] = useState<string>('desc');

  // Loading & Feedback states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [savingCellId, setSavingCellId] = useState<string | null>(null);
  const [savedSuccessCellId, setSavedSuccessCellId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New row inline state
  const [showNewRow, setShowNewRow] = useState<boolean>(false);
  const [newRowData, setNewRowData] = useState<PrPoDoCreate>({
    so: '',
    noidung: '',
    loai: '',
    trangthai: 'BU',
    ghichu: '',
    ngay_them: new Date().toISOString().split('T')[0],
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: PrPoDoItem | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Helper auto detect loai
  const detectLoai = (soStr: string): string => {
    const clean = soStr.trim();
    if (clean.length < 2) return '';
    const prefix = clean.substring(0, 2);
    if (['11', '12', '13', '14'].includes(prefix)) return 'PR';
    if (['41', '42', '43', '44'].includes(prefix)) return 'PO';
    if (['00', '49'].includes(prefix)) return 'DO';
    return '';
  };

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (trangThaiFilter === 'DELETED') {
        const deletedList = await prPoDoService.getDeletedList(search.trim() || undefined);
        let filtered = deletedList;
        if (loaiFilter !== 'ALL') {
          filtered = filtered.filter(
            (item) => (item.loai || '').toUpperCase() === loaiFilter.toUpperCase()
          );
        }
        setItems(filtered);
        setTotal(filtered.length);
        setTotalPages(1);
      } else {
        const params: PrPoDoFilterParams = {
          search: search.trim() || undefined,
          loai: loaiFilter !== 'ALL' ? loaiFilter : undefined,
          trangthai: trangThaiFilter !== 'ALL' ? trangThaiFilter : undefined,
          sort_by_date: sortByDate,
          page,
          page_size: pageSize,
        };

        const res = await prPoDoService.getList(params);
        setItems(res.items);
        setTotal(res.total);
        setTotalPages(res.total_pages);
        setStats(res.stats);
      }
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải danh sách PR-PO-DO.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, loaiFilter, trangThaiFilter, sortByDate, page, pageSize]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loaiFilter, trangThaiFilter, sortByDate, page, pageSize, loadData]);

  // Handle cell blur / save
  const handleCellBlur = async (
    item: PrPoDoItem,
    field: 'so' | 'noidung' | 'trangthai' | 'ghichu' | 'ngay_them',
    newValue: string
  ) => {
    const oldValue = (item[field] as string) || '';
    if (oldValue === newValue) return;

    const cellKey = `${item.id}-${field}`;
    setSavingCellId(cellKey);

    try {
      const payload: any = { [field]: newValue };
      if (field === 'so') {
        const detected = detectLoai(newValue);
        if (detected) {
          payload.loai = detected;
        }
      }

      const updated = await prPoDoService.update(item.id, payload);

      // Update in local state
      setItems((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, ...updated } : r))
      );

      // Flash success indicator
      setSavedSuccessCellId(cellKey);
      setTimeout(() => {
        setSavedSuccessCellId(null);
      }, 1500);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || `Lỗi lưu ô ${field}. Vui lòng thử lại.`,
      });
    } finally {
      setSavingCellId(null);
    }
  };

  // Handle Add New Row
  const handleSaveNewRow = async () => {
    if (!newRowData.so?.trim() && !newRowData.noidung?.trim()) {
      setAlert({ type: 'error', message: 'Vui lòng nhập Số hoặc Nội dung đơn để tạo dòng mới.' });
      return;
    }

    setIsCreating(true);
    try {
      const detectedLoai = detectLoai(newRowData.so || '');
      const payload = {
        ...newRowData,
        loai: newRowData.loai || detectedLoai || undefined,
      };

      const created = await prPoDoService.create(payload);

      // Prepend to items list
      setItems((prev) => [created, ...prev]);
      setTotal((prev) => prev + 1);

      // Reset new row
      setNewRowData({
        so: '',
        noidung: '',
        loai: '',
        trangthai: 'BU',
        ghichu: '',
        ngay_them: new Date().toISOString().split('T')[0],
      });
      setShowNewRow(false);

      setAlert({ type: 'success', message: 'Đã thêm thành công dòng đơn mới!' });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Thêm đơn mới thất bại.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;

    setIsDeleting(true);
    try {
      await prPoDoService.delete(deleteModal.item.id);
      setItems((prev) => prev.filter((r) => r.id !== deleteModal.item!.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        total_deleted: (prev.total_deleted || 0) + 1,
      }));
      setDeleteModal({ isOpen: false, item: null });
      setAlert({ type: 'success', message: 'Đã xóa chứng từ thành công.' });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Xóa chứng từ thất bại.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Restore
  const handleRestore = async (item: PrPoDoItem) => {
    try {
      await prPoDoService.restore(item.id);
      setItems((prev) => prev.filter((r) => r.id !== item.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        total_deleted: Math.max(0, (prev.total_deleted || 1) - 1),
      }));
      setAlert({
        type: 'success',
        message: `Đã khôi phục thành công chứng từ ${item.so ? '#' + item.so : ''}!`,
      });
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Khôi phục chứng từ thất bại.',
      });
    }
  };

  // Handle Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await prPoDoService.exportExcel({
        search: search.trim() || undefined,
        loai: loaiFilter !== 'ALL' ? loaiFilter : undefined,
        trangthai: trangThaiFilter !== 'ALL' ? trangThaiFilter : undefined,
        sort_by_date: sortByDate,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Theo_Doi_PR_PO_DO_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setAlert({ type: 'error', message: 'Xuất file Excel thất bại.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Status color badge helper
  const getStatusBadgeStyle = (tt?: string | null): { bg: string; color: string; border: string } => {
    switch ((tt || '').toUpperCase()) {
      case 'DONE':
        return { bg: '#ecfdf5', color: '#16a34a', border: '#bbf7d0' };
      case 'FC':
        return { bg: '#FFFBEA', color: '#D97706', border: '#FCD34D' };
      case 'MD':
        return { bg: '#F8F9FA', color: '#4B5563', border: '#E5E7EB' };
      case 'BU':
      default:
        return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    }
  };

  // Loai color badge helper
  const getLoaiBadgeStyle = (loai?: string | null): { bg: string; color: string } => {
    switch ((loai || '').toUpperCase()) {
      case 'PR':
        return { bg: '#dbeafe', color: '#1d4ed8' };
      case 'PO':
        return { bg: '#fef3c7', color: '#b45309' };
      case 'DO':
        return { bg: '#dcfce7', color: '#15803d' };
      default:
        return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Alert Notification */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary-subtle)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Theo Dõi PR - PO - DO
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Bảng tính theo dõi và cập nhật tiến độ các đơn mua sắm, nhận hàng IT (Tương tác trực tiếp như Google Sheets)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canEdit && trangThaiFilter !== 'DELETED' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowNewRow((prev) => !prev)}
            >
              <Plus size={16} style={{ marginRight: '6px' }} />
              {showNewRow ? 'Đóng Dòng Mới' : 'Thêm Dòng Mới'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            <Download size={15} style={{ marginRight: '6px' }} />
            {isExporting ? 'Đang Xuất...' : 'Xuất Excel'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Total */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: trangThaiFilter === 'ALL' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
          }}
          onClick={() => { setTrangThaiFilter('ALL'); setPage(1); }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ClipboardList size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tổng Số Đơn
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stats.total.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* BU */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: trangThaiFilter === 'BU' ? '2px solid #d97706' : '1px solid var(--border-color)',
          }}
          onClick={() => { setTrangThaiFilter('BU'); setPage(1); }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#fffbeb',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase' }}>
              Chờ Duyệt (BU)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#d97706' }}>
              {stats.total_bu.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* FC */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: trangThaiFilter === 'FC' ? '2px solid #D97706' : '1px solid var(--border-color)',
          }}
          onClick={() => { setTrangThaiFilter('FC'); setPage(1); }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEA',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#D97706', textTransform: 'uppercase' }}>
              Kế Toán (FC)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>
              {stats.total_fc.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* MD */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: trangThaiFilter === 'MD' ? '2px solid #4B5563' : '1px solid var(--border-color)',
          }}
          onClick={() => { setTrangThaiFilter('MD'); setPage(1); }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#F8F9FA',
              color: '#4B5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4B5563', textTransform: 'uppercase' }}>
              BGĐ Duyệt (MD)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#4B5563' }}>
              {stats.total_md.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* DONE */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: trangThaiFilter === 'DONE' ? '2px solid #16a34a' : '1px solid var(--border-color)',
          }}
          onClick={() => { setTrangThaiFilter('DONE'); setPage(1); }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>
              Hoàn Thành (DONE)
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>
              {stats.total_done.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* DELETED */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: trangThaiFilter === 'DELETED' ? '2px solid #ef4444' : '1px solid var(--border-color)',
          }}
          onClick={() => { setTrangThaiFilter('DELETED'); setPage(1); }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>
              Đã Xóa
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
              {(stats.total_deleted || 0).toLocaleString()}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card padding="sm" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginRight: '6px' }}>
              Trạng thái:
            </span>
            {[
              { id: 'PENDING', label: 'Đang Xử Lý' },
              { id: 'ALL', label: 'Tất Cả' },
              { id: 'BU', label: 'BU' },
              { id: 'FC', label: 'FC' },
              { id: 'MD', label: 'MD' },
              { id: 'DONE', label: 'DONE' },
              { id: 'DELETED', label: `Đã Xóa (${stats.total_deleted || 0})` },
            ].map((t) => {
              const isSelected = trangThaiFilter === t.id;
              const isDeletedTab = t.id === 'DELETED';
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTrangThaiFilter(t.id);
                    setPage(1);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: isSelected
                      ? (isDeletedTab ? '1px solid #ef4444' : '1px solid var(--color-primary)')
                      : '1px solid transparent',
                    backgroundColor: isSelected
                      ? (isDeletedTab ? '#fee2e2' : 'var(--color-primary-subtle)')
                      : 'transparent',
                    color: isSelected
                      ? (isDeletedTab ? '#b91c1c' : 'var(--color-primary)')
                      : (isDeletedTab ? '#ef4444' : 'var(--text-secondary)'),
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isDeletedTab && <Trash2 size={13} />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Right Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Loại filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Loại:
              </span>
              <select
                value={loaiFilter}
                onChange={(e) => {
                  setLoaiFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <option value="ALL">Tất cả Loại</option>
                <option value="PR">PR (Đơn yêu cầu)</option>
                <option value="PO">PO (Đơn đặt hàng)</option>
                <option value="DO">DO (Đơn giao nhận)</option>
              </select>
            </div>

            {/* Sắp xếp ngày */}
            <button
              type="button"
              onClick={() => setSortByDate((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
              title="Đổi chiều sắp xếp theo ngày"
            >
              <ArrowUpDown size={14} />
              <span>{sortByDate === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}</span>
            </button>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '260px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm Số, Nội dung, Ghi chú..."
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Banner for DELETED view */}
      {trangThaiFilter === 'DELETED' && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#991b1b',
            fontSize: '13px',
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>
            Đang hiển thị tối đa <strong>50 chứng từ đã xóa gần nhất</strong>. Bạn có thể sử dụng ô tìm kiếm để tra cứu và bấm nút <strong>"Khôi phục"</strong> ở cột thao tác nếu lỡ xóa nhầm.
          </span>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <Card padding="none" style={{ overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'left',
            }}
          >
            {/* Sticky Header */}
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-color)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <th style={{ width: '48px', padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  #
                </th>
                <th style={{ width: '80px', padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Loại
                </th>
                <th style={{ width: '150px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Số Đơn
                </th>
                <th style={{ minWidth: '400px', padding: '12px 12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Nội Dung Mua Sắm / Đơn Hàng
                </th>
                <th style={{ width: '130px', padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Ngày Tạo
                </th>
                <th style={{ width: '120px', padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Trạng Thái
                </th>
                <th style={{ minWidth: '240px', padding: '12px 12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Ghi Chú
                </th>
                {canEdit && (
                  <th style={{ width: trangThaiFilter === 'DELETED' ? '110px' : '65px', padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {trangThaiFilter === 'DELETED' ? 'Khôi Phục' : 'Xóa'}
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {/* ================= DÒNG THÊM MỚI NHANH (INLINE NEW ROW) ================= */}
              {showNewRow && canEdit && trangThaiFilter !== 'DELETED' && (
                <tr
                  style={{
                    backgroundColor: '#fefce8',
                    borderBottom: '2px dashed #facc15',
                  }}
                >
                  <td style={{ textAlign: 'center', color: '#ca8a04', fontWeight: 700, verticalAlign: 'middle' }}>
                    Mới
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        ...getLoaiBadgeStyle(newRowData.loai || detectLoai(newRowData.so || '')),
                      }}
                    >
                      {newRowData.loai || detectLoai(newRowData.so || '') || 'Tự động'}
                    </span>
                  </td>
                  <td style={{ padding: '6px 8px', verticalAlign: 'middle' }}>
                    <input
                      type="text"
                      placeholder="VD: 1100030286..."
                      value={newRowData.so || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const detected = detectLoai(val);
                        setNewRowData((prev) => ({
                          ...prev,
                          so: val,
                          loai: detected || prev.loai,
                        }));
                      }}
                      style={{
                        width: '100%',
                        minHeight: '44px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #facc15',
                        backgroundColor: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', verticalAlign: 'middle' }}>
                    <textarea
                      rows={2}
                      placeholder="Nhập nội dung đơn hàng/mua sắm..."
                      value={newRowData.noidung || ''}
                      onChange={(e) => setNewRowData((prev) => ({ ...prev, noidung: e.target.value }))}
                      style={{
                        width: '100%',
                        minHeight: '52px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #facc15',
                        backgroundColor: '#ffffff',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        display: 'block',
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <DateInput
                      compact
                      hideClear
                      value={newRowData.ngay_them || ''}
                      onChange={(val) => setNewRowData((prev) => ({ ...prev, ngay_them: val }))}
                      containerStyle={{ width: '134px', margin: '0 auto' }}
                      style={{
                        height: '36px',
                        fontSize: '12px',
                        textAlign: 'center',
                        borderColor: '#facc15',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <select
                      value={newRowData.trangthai || 'BU'}
                      onChange={(e) => setNewRowData((prev) => ({ ...prev, trangthai: e.target.value }))}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #facc15',
                        backgroundColor: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        minHeight: '36px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="BU">BU</option>
                      <option value="FC">FC</option>
                      <option value="MD">MD</option>
                      <option value="DONE">DONE</option>
                    </select>
                  </td>
                  <td style={{ padding: '6px 8px', verticalAlign: 'middle' }}>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú..."
                      value={newRowData.ghichu || ''}
                      onChange={(e) => setNewRowData((prev) => ({ ...prev, ghichu: e.target.value }))}
                      style={{
                        width: '100%',
                        minHeight: '52px',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        border: '1px solid #facc15',
                        backgroundColor: '#ffffff',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        display: 'block',
                        boxSizing: 'border-box',
                      }}
                    />
                  </td>
                  <td style={{ textAlign: 'center', padding: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveNewRow}
                        disabled={isCreating}
                        style={{ padding: '4px 8px', height: '32px' }}
                        title="Lưu dòng này"
                      >
                        <Check size={15} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowNewRow(false);
                          setNewRowData({
                            so: '',
                            noidung: '',
                            loai: '',
                            trangthai: 'BU',
                            ghichu: '',
                            ngay_them: new Date().toISOString().split('T')[0],
                          });
                        }}
                        style={{ padding: '4px 8px', height: '32px', color: '#ef4444', borderColor: '#fca5a5' }}
                        title="Hủy bỏ / Đóng dòng mới"
                      >
                        <X size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Loading State */}
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                    <p style={{ margin: 0 }}>Đang tải dữ liệu bảng tính...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600 }}>
                      Không tìm thấy chứng từ nào khớp với bộ lọc hiện tại.
                    </p>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      Bạn có thể xóa bớt từ khóa tìm kiếm hoặc chọn chuyển tab trạng thái khác.
                    </p>
                  </td>
                </tr>
              ) : (
                /* Data Rows */
                items.map((r, index) => {
                  const rowNumber = (page - 1) * pageSize + index + 1;
                  const loaiStyle = getLoaiBadgeStyle(r.loai);
                  const statusStyle = getStatusBadgeStyle(r.trangthai);
                  const isDeleted = trangThaiFilter === 'DELETED';

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                        transition: 'background-color 0.12s',
                        opacity: isDeleted ? 0.9 : 1,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)')
                      }
                    >
                      {/* STT */}
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', verticalAlign: 'middle' }}>
                        {rowNumber}
                      </td>

                      {/* LOẠI */}
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: loaiStyle.bg,
                            color: loaiStyle.color,
                            display: 'inline-block',
                          }}
                        >
                          {r.loai || '--'}
                        </span>
                      </td>

                      {/* SỐ */}
                      <td style={{ padding: '6px 8px', position: 'relative', verticalAlign: 'middle' }}>
                        <input
                          type="text"
                          defaultValue={r.so || ''}
                          onBlur={(e) => handleCellBlur(r, 'so', e.target.value)}
                          disabled={!canEdit || isDeleted}
                          style={{
                            width: '100%',
                            minHeight: '44px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                            color: isDeleted ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isDeleted ? 'line-through' : 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            if (!isDeleted) {
                              e.target.style.borderColor = 'var(--color-primary)';
                              e.target.style.backgroundColor = 'var(--bg-card)';
                            }
                          }}
                        />
                        {savingCellId === `${r.id}-so` && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <RefreshCw size={13} className="animate-spin" />
                          </span>
                        )}
                        {savedSuccessCellId === `${r.id}-so` && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: '#16a34a',
                            }}
                          >
                            <Check size={14} />
                          </span>
                        )}
                      </td>

                      {/* NỘI DUNG (Multi-line textarea with increased height) */}
                      <td style={{ padding: '6px 8px', position: 'relative', verticalAlign: 'middle' }}>
                        <textarea
                          rows={2}
                          defaultValue={r.noidung || ''}
                          onBlur={(e) => handleCellBlur(r, 'noidung', e.target.value)}
                          disabled={!canEdit || isDeleted}
                          placeholder="Nội dung đơn hàng/mua sắm..."
                          style={{
                            width: '100%',
                            minHeight: '52px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                            display: 'block',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            if (!isDeleted) {
                              e.target.style.borderColor = 'var(--color-primary)';
                              e.target.style.backgroundColor = 'var(--bg-card)';
                            }
                          }}
                        />
                        {savingCellId === `${r.id}-noidung` && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '12px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <RefreshCw size={13} className="animate-spin" />
                          </span>
                        )}
                        {savedSuccessCellId === `${r.id}-noidung` && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '12px',
                              color: '#16a34a',
                            }}
                          >
                            <Check size={14} />
                          </span>
                        )}
                      </td>

                      {/* NGÀY TẠO */}
                      <td style={{ textAlign: 'center', padding: '6px 8px', verticalAlign: 'middle' }}>
                        <DateInput
                          compact
                          hideClear
                          value={r.ngay_them || ''}
                          onChange={() => {}}
                          onBlurValue={(isoVal) => handleCellBlur(r, 'ngay_them', isoVal)}
                          disabled={!canEdit || isDeleted}
                          containerStyle={{ width: '126px', margin: '0 auto' }}
                          style={{
                            height: '34px',
                            fontSize: '12px',
                            textAlign: 'center',
                            borderColor: 'transparent',
                            backgroundColor: 'transparent',
                          }}
                        />
                      </td>

                      {/* TRẠNG THÁI */}
                      <td style={{ textAlign: 'center', padding: '6px 8px', verticalAlign: 'middle' }}>
                        <select
                          value={(r.trangthai || 'BU').toUpperCase()}
                          onChange={(e) => handleCellBlur(r, 'trangthai', e.target.value)}
                          disabled={!canEdit || isDeleted}
                          style={{
                            padding: '6px 8px',
                            minHeight: '34px',
                            borderRadius: '6px',
                            border: `1px solid ${statusStyle.border}`,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: canEdit && !isDeleted ? 'pointer' : 'default',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        >
                          <option value="BU">BU</option>
                          <option value="FC">FC</option>
                          <option value="MD">MD</option>
                          <option value="DONE">DONE</option>
                        </select>
                      </td>

                      {/* GHI CHÚ (Multi-line textarea with increased height) */}
                      <td style={{ padding: '6px 8px', position: 'relative', verticalAlign: 'middle' }}>
                        <textarea
                          rows={2}
                          defaultValue={r.ghichu || ''}
                          placeholder="Thêm ghi chú..."
                          onBlur={(e) => handleCellBlur(r, 'ghichu', e.target.value)}
                          disabled={!canEdit || isDeleted}
                          style={{
                            width: '100%',
                            minHeight: '52px',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            outline: 'none',
                            display: 'block',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            if (!isDeleted) {
                              e.target.style.borderColor = 'var(--color-primary)';
                              e.target.style.backgroundColor = 'var(--bg-card)';
                            }
                          }}
                        />
                        {savedSuccessCellId === `${r.id}-ghichu` && (
                          <span
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '12px',
                              color: '#16a34a',
                            }}
                          >
                            <Check size={14} />
                          </span>
                        )}
                      </td>

                      {/* THAO TÁC (XÓA / KHÔI PHỤC) */}
                      {canEdit && (
                        <td style={{ textAlign: 'center', padding: '6px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {isDeleted ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(r)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#16a34a',
                                borderColor: '#86efac',
                                backgroundColor: '#f0fdf4',
                                fontSize: '12px',
                                padding: '4px 8px',
                                height: '28px',
                              }}
                              title="Khôi phục lại chứng từ này"
                            >
                              <RotateCcw size={13} />
                              Khôi phục
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteModal({ isOpen: true, item: r })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '4px',
                                transition: 'color 0.15s',
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = '#ef4444')}
                              onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                              title="Xóa đơn này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer: Pagination & Stats */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {trangThaiFilter === 'DELETED' ? (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Hiển thị <strong>{items.length}</strong> đơn đã xóa gần đây nhất (tối đa 50 đơn)
            </div>
          ) : (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Hiển thị <strong>{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> -{' '}
              <strong>{Math.min(page * pageSize, total)}</strong> trên tổng số <strong>{total.toLocaleString()}</strong> đơn
            </div>
          )}

          {trangThaiFilter !== 'DELETED' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số dòng/trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Pagination Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                <span style={{ fontSize: '13px', padding: '0 8px', color: 'var(--text-secondary)' }}>
                  Trang <strong>{page}</strong> / {totalPages || 1}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ================= MODAL: XÁC NHẬN XÓA ================= */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        title="Xác Nhận Xóa Đơn"
        maxWidth="460px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="outline"
              onClick={() => setDeleteModal({ isOpen: false, item: null })}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang Xóa...' : 'Xác Nhận Xóa'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Bạn có chắc chắn muốn xóa đơn #{deleteModal.item?.so || deleteModal.item?.id}?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Nội dung: {deleteModal.item?.noidung || '(Không có nội dung)'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
