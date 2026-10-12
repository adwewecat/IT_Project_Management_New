import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  Plus,
  Download,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Mail,
  Building,
  Hash,
  KeyRound,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  Layers
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  CodePhotoItem,
  CodePhotoCreate,
  CodePhotoStats,
} from '../../types/codePhoto';
import { codePhotoService } from '../../services/codePhotoService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';

export const CodePhotoPage: React.FC = () => {
  const { user } = useAuth();

  // Role check
  const rawRoles = user?.roles || (user?.phanquyen ? user.phanquyen.split(',').map(s => s.trim().toLowerCase()) : []);
  const isSuperAdmin = !!user?.is_super_admin || user?.username?.toLowerCase() === 'admin';
  const isAdmin = isSuperAdmin || rawRoles.includes('admin') || rawRoles.includes('1') || user?.phanquyen === '1' || user?.phanquyen === '0';
  const isHelpdesk = rawRoles.includes('helpdesk') || rawRoles.includes('3') || user?.phanquyen === '3';
  const canEdit = isAdmin || isHelpdesk;

  // Data states
  const [items, setItems] = useState<CodePhotoItem[]>([]);
  const [stats, setStats] = useState<CodePhotoStats>({
    total: 0,
    total_on: 0,
    total_off: 0,
  });
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [hientrangFilter, setHientrangFilter] = useState<string>('ALL');

  // Loading & notification states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form modal state (Create / Edit)
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item: CodePhotoItem | null;
  }>({
    isOpen: false,
    mode: 'create',
    item: null,
  });

  const [formData, setFormData] = useState<CodePhotoCreate>({
    hientrang: 'ON',
    manv: '',
    name: '',
    email: '',
    pass_code: '',
    cmnd_sdt: '',
    bophan: '',
    chucdanh: '',
    code_dept: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: CodePhotoItem | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await codePhotoService.getList({
        search: search.trim() || undefined,
        hientrang: hientrangFilter !== 'ALL' ? hientrangFilter : undefined,
        page,
        page_size: pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setStats(res.stats);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải danh sách Code Photo.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, hientrangFilter, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, hientrangFilter, page, pageSize, loadData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      hientrang: 'ON',
      manv: '',
      name: '',
      email: '',
      pass_code: '',
      cmnd_sdt: '',
      bophan: '',
      chucdanh: '',
      code_dept: '',
      note: '',
    });
    setFormModal({ isOpen: true, mode: 'create', item: null });
  };

  // Open Edit Modal
  const handleOpenEdit = (item: CodePhotoItem) => {
    setFormData({
      hientrang: (item.hientrang || 'ON').toUpperCase(),
      manv: item.manv || '',
      name: item.name || '',
      email: item.email || '',
      pass_code: item.pass_code || '',
      cmnd_sdt: item.cmnd_sdt || '',
      bophan: item.bophan || '',
      chucdanh: item.chucdanh || '',
      code_dept: item.code_dept || '',
      note: item.note || '',
    });
    setFormModal({ isOpen: true, mode: 'edit', item });
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim()) {
      setAlert({ type: 'error', message: 'Vui lòng nhập Email của nhân viên.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (formModal.mode === 'create') {
        await codePhotoService.create(formData);
        setAlert({ type: 'success', message: 'Cấp Code Photo mới thành công!' });
      } else if (formModal.item) {
        await codePhotoService.update(formModal.item.id, formData);
        setAlert({ type: 'success', message: 'Cập nhật Code Photo thành công!' });
      }
      setFormModal({ isOpen: false, mode: 'create', item: null });
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Lưu thông tin thất bại.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteModal.item) return;
    setIsDeleting(true);
    try {
      await codePhotoService.delete(deleteModal.item.id);
      setDeleteModal({ isOpen: false, item: null });
      setAlert({ type: 'success', message: 'Đã xóa Code Photo thành công.' });
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Xóa Code Photo thất bại.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await codePhotoService.exportExcel({
        search: search.trim() || undefined,
        hientrang: hientrangFilter !== 'ALL' ? hientrangFilter : undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Danh_Sach_Code_Photo_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setAlert({ type: 'error', message: 'Xuất file Excel thất bại.' });
    } finally {
      setIsExporting(false);
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

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Printer size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Quản Lý Code Photo
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Cấp phát và quản lý mật khẩu mã in ấn / photocopy cho CBNV Golden Gate Restaurant Group
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
            >
              <Plus size={16} style={{ marginRight: '6px' }} />
              Thêm Code Photo
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

      {/* Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
            border: hientrangFilter === 'ALL' ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
          }}
          onClick={() => { setHientrangFilter('ALL'); setPage(1); }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Printer size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Tổng Số Mã
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stats.total.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* ON */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: hientrangFilter === 'ON' ? '2px solid #16a34a' : '1px solid var(--border-color)',
          }}
          onClick={() => { setHientrangFilter('ON'); setPage(1); }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#ecfdf5',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>
              Đang Kích Hoạt (ON)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>
              {stats.total_on.toLocaleString()}
            </div>
          </div>
        </Card>

        {/* OFF */}
        <Card
          padding="sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            cursor: 'pointer',
            border: hientrangFilter === 'OFF' ? '2px solid #ef4444' : '1px solid var(--border-color)',
          }}
          onClick={() => { setHientrangFilter('OFF'); setPage(1); }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#fef2f2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>
              Tạm Dừng (OFF)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>
              {stats.total_off.toLocaleString()}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginRight: '4px' }}>
              Trạng thái:
            </span>
            {[
              { id: 'ALL', label: `Tất Cả (${stats.total})` },
              { id: 'ON', label: `Đang Bật (${stats.total_on})` },
              { id: 'OFF', label: `Tạm Tắt (${stats.total_off})` },
            ].map((t) => {
              const isSelected = hientrangFilter === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setHientrangFilter(t.id);
                    setPage(1);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: '320px' }}>
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
              placeholder="Tìm theo Tên, Email, Pass Code, Mã NV..."
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
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
      </Card>

      {/* Table Container */}
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
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-color)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                }}
              >
                <th style={{ width: '48px', padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  #
                </th>
                <th style={{ width: '90px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Hiện Trạng
                </th>
                <th style={{ width: '100px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Mã NV
                </th>
                <th style={{ minWidth: '180px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Tên Nhân Viên
                </th>
                <th style={{ minWidth: '190px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Email
                </th>
                <th style={{ width: '100px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Pass Code
                </th>
                <th style={{ width: '120px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  CMND / SĐT
                </th>
                <th style={{ minWidth: '130px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Bộ Phận
                </th>
                <th style={{ minWidth: '140px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Chức Danh
                </th>
                <th style={{ width: '90px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Code Dept
                </th>
                <th style={{ minWidth: '140px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Ghi Chú
                </th>
                {canEdit && (
                  <th style={{ width: '90px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Thao Tác
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 12 : 11} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                    <p style={{ margin: 0 }}>Đang tải danh sách Code Photo...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 12 : 11} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600 }}>
                      Không tìm thấy Code Photo nào khớp với bộ lọc.
                    </p>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      Bạn có thể thử xóa bớt từ khóa tìm kiếm hoặc chọn tab trạng thái khác.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((r, index) => {
                  const rowNumber = (page - 1) * pageSize + index + 1;
                  const isON = (r.hientrang || '').toUpperCase() === 'ON';

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                        transition: 'background-color 0.12s',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                      onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          index % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)')
                      }
                    >
                      {/* STT */}
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '10px 8px' }}>
                        {rowNumber}
                      </td>

                      {/* Hiện Trạng */}
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: isON ? '#ecfdf5' : '#fef2f2',
                            color: isON ? '#16a34a' : '#ef4444',
                            border: `1px solid ${isON ? '#bbf7d0' : '#fecaca'}`,
                          }}
                        >
                          {isON ? 'ON' : 'OFF'}
                        </span>
                      </td>

                      {/* Mã NV */}
                      <td style={{ textAlign: 'center', padding: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {r.manv || '--'}
                      </td>

                      {/* Tên Nhân Viên */}
                      <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.name || '--'}
                      </td>

                      {/* Email */}
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                        {r.email ? (
                          <a
                            href={`mailto:${r.email}`}
                            style={{ color: 'var(--color-primary-text)', textDecoration: 'none' }}
                          >
                            {r.email}
                          </a>
                        ) : (
                          '--'
                        )}
                      </td>

                      {/* Pass Code */}
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        {r.pass_code ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(37, 99, 235, 0.1)',
                              color: '#2563eb',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <KeyRound size={12} />
                            {r.pass_code}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>--</span>
                        )}
                      </td>

                      {/* CMND / SĐT */}
                      <td style={{ textAlign: 'center', padding: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {r.cmnd_sdt || '--'}
                      </td>

                      {/* Bộ Phận */}
                      <td style={{ padding: '10px' }}>
                        {r.bophan ? (
                          <span
                            style={{
                              fontSize: '12px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {r.bophan}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>

                      {/* Chức Danh */}
                      <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                        {r.chucdanh || '--'}
                      </td>

                      {/* Code Dept */}
                      <td style={{ textAlign: 'center', padding: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {r.code_dept || '--'}
                      </td>

                      {/* Ghi Chú */}
                      <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {r.note || '--'}
                      </td>

                      {/* Thao Tác */}
                      {canEdit && (
                        <td style={{ textAlign: 'center', padding: '10px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(r)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '5px',
                                borderRadius: '4px',
                                transition: 'all 0.15s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.color = 'var(--color-primary)';
                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title="Chỉnh sửa Code Photo"
                            >
                              <Edit2 size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteModal({ isOpen: true, item: r })}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '5px',
                                borderRadius: '4px',
                                transition: 'all 0.15s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.color = '#ef4444';
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.color = 'var(--text-muted)';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title="Xóa Code Photo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Pagination */}
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
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Hiển thị <strong>{items.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> -{' '}
            <strong>{Math.min(page * pageSize, total)}</strong> trên tổng số <strong>{total.toLocaleString()}</strong> mã
          </div>

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
        </div>
      </Card>

      {/* ================= MODAL: THÊM MỚI / CHỈNH SỬA ================= */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, mode: 'create', item: null })}
        title={formModal.mode === 'create' ? 'Cấp Mã Code Photo Mới' : 'Chỉnh Sửa Code Photo'}
        maxWidth="620px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              variant="outline"
              onClick={() => setFormModal({ isOpen: false, mode: 'create', item: null })}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitForm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang Lưu...' : formModal.mode === 'create' ? 'Cấp Mã Photo' : 'Lưu Thay Đổi'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Hiện Trạng <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.hientrang || 'ON'}
                onChange={(e) => setFormData((prev) => ({ ...prev, hientrang: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontWeight: 600,
                }}
              >
                <option value="ON">ON (Đang hoạt động)</option>
                <option value="OFF">OFF (Tạm dừng / Đã nghỉ)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Pass Code (Mã In)
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.pass_code || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pass_code: e.target.value }))}
                  placeholder="VD: 80971, 84854..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Tên Nhân Viên
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nhập họ và tên nhân viên..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Mã Nhân Viên
              </label>
              <div style={{ position: 'relative' }}>
                <Hash size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.manv || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manv: e.target.value }))}
                  placeholder="VD: 1073006..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Email Công Ty <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="VD: name@ggg.com.vn..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                CMND / Số Điện Thoại
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.cmnd_sdt || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cmnd_sdt: e.target.value }))}
                  placeholder="VD: 0932835884..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Bộ Phận
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.bophan || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bophan: e.target.value }))}
                  placeholder="VD: IT, MKT..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Chức Danh
              </label>
              <input
                type="text"
                value={formData.chucdanh || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, chucdanh: e.target.value }))}
                placeholder="VD: Nhân viên hỗ trợ..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Code Dept
              </label>
              <div style={{ position: 'relative' }}>
                <Layers size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.code_dept || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code_dept: e.target.value }))}
                  placeholder="VD: 7, 10..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Ghi Chú
            </label>
            <div style={{ position: 'relative' }}>
              <FileText size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <textarea
                rows={2}
                value={formData.note || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Nhập ghi chú thêm..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* ================= MODAL: XÁC NHẬN XÓA ================= */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        title="Xác Nhận Xóa Code Photo"
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
              Bạn có chắc chắn muốn xóa Code Photo của {deleteModal.item?.name || deleteModal.item?.email}?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Pass Code: <strong>{deleteModal.item?.pass_code || '(Không có)'}</strong> | Email: {deleteModal.item?.email}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
