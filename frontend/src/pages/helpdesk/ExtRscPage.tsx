import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneCall,
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
  FileText
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ExtRscItem, ExtRscCreate } from '../../types/extRsc';
import { extRscService } from '../../services/extRscService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { checkIsAdmin, checkIsHelpdeskRole } from '../../utils/authUtils';

export const ExtRscPage: React.FC = () => {
  const { user } = useAuth();

  // Role check
  const isAdmin = checkIsAdmin(user);
  const isHelpdesk = checkIsHelpdeskRole(user);
  const canEdit = isAdmin || isHelpdesk;

  // Data states
  const [items, setItems] = useState<ExtRscItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [search, setSearch] = useState<string>('');

  // Loading & notification states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form modal state (Create / Edit)
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    item: ExtRscItem | null;
  }>({
    isOpen: false,
    mode: 'create',
    item: null,
  });

  const [formData, setFormData] = useState<ExtRscCreate>({
    nhanvien: '',
    email: '',
    manv: '',
    so_ext: '',
    phongban: '',
    note: '',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: ExtRscItem | null;
  }>({
    isOpen: false,
    item: null,
  });
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await extRscService.getList({
        search: search.trim() || undefined,
        page,
        page_size: pageSize,
      });
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải danh bạ EXT RSC.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, pageSize, loadData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      nhanvien: '',
      email: '',
      manv: '',
      so_ext: '',
      phongban: '',
      note: '',
    });
    setFormModal({ isOpen: true, mode: 'create', item: null });
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ExtRscItem) => {
    setFormData({
      nhanvien: item.nhanvien || '',
      email: item.email || '',
      manv: item.manv || '',
      so_ext: item.so_ext || '',
      phongban: item.phongban || '',
      note: item.note || '',
    });
    setFormModal({ isOpen: true, mode: 'edit', item });
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nhanvien.trim()) {
      setAlert({ type: 'error', message: 'Vui lòng nhập tên nhân viên.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (formModal.mode === 'create') {
        await extRscService.create(formData);
        setAlert({ type: 'success', message: 'Thêm số máy nhánh EXT RSC thành công!' });
      } else if (formModal.item) {
        await extRscService.update(formModal.item.id, formData);
        setAlert({ type: 'success', message: 'Cập nhật số máy nhánh EXT RSC thành công!' });
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
      await extRscService.delete(deleteModal.item.id);
      setDeleteModal({ isOpen: false, item: null });
      setAlert({ type: 'success', message: 'Đã xóa số máy nhánh EXT RSC thành công.' });
      loadData();
    } catch (err: any) {
      setAlert({
        type: 'error',
        message: err?.response?.data?.detail || 'Xóa số máy nhánh thất bại.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await extRscService.exportExcel(search.trim() || undefined);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Danh_Sach_EXT_RSC_${new Date().toISOString().split('T')[0]}.xlsx`;
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
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PhoneCall size={26} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Danh Bạ EXT RSC
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Quản lý số máy nhánh điện thoại nội bộ văn phòng RSC & các chi nhánh Golden Gate
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
              Thêm Số EXT
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

      {/* Filter & Search Bar */}
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
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Tổng số: <strong style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()}</strong> máy nhánh
          </div>

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
              placeholder="Tìm theo Tên, Email, Số EXT, Phòng ban..."
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
                <th style={{ width: '50px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  #
                </th>
                <th style={{ width: '110px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Số EXT
                </th>
                <th style={{ minWidth: '240px', padding: '12px 12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Tên Nhân Viên
                </th>
                <th style={{ minWidth: '200px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Email
                </th>
                <th style={{ width: '120px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Mã NV
                </th>
                <th style={{ minWidth: '160px', padding: '12px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Phòng Ban
                </th>
                <th style={{ minWidth: '180px', padding: '12px 12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Ghi Chú
                </th>
                {canEdit && (
                  <th style={{ width: '100px', padding: '12px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    Thao Tác
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
                    <p style={{ margin: 0 }}>Đang tải danh bạ máy nhánh...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600 }}>
                      Không tìm thấy số máy nhánh nào phù hợp.
                    </p>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      Bạn có thể thử tìm kiếm với từ khóa khác hoặc bấm "Thêm Số EXT" mới.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((r, index) => {
                  const rowNumber = (page - 1) * pageSize + index + 1;
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
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '10px' }}>
                        {rowNumber}
                      </td>

                      {/* Số EXT */}
                      <td style={{ textAlign: 'center', padding: '10px' }}>
                        {r.so_ext ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '13px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(217, 119, 6, 0.12)',
                              color: '#d97706',
                              border: '1px solid rgba(217, 119, 6, 0.3)',
                            }}
                          >
                            <PhoneCall size={12} />
                            {r.so_ext}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có</span>
                        )}
                      </td>

                      {/* Tên Nhân Viên */}
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.nhanvien || '--'}
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

                      {/* Mã NV */}
                      <td style={{ textAlign: 'center', padding: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {r.manv || '--'}
                      </td>

                      {/* Phòng Ban */}
                      <td style={{ padding: '10px' }}>
                        {r.phongban ? (
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
                            {r.phongban}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>

                      {/* Ghi Chú */}
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
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
                              title="Chỉnh sửa thông tin"
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
                              title="Xóa số máy nhánh"
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
            <strong>{Math.min(page * pageSize, total)}</strong> trên tổng số <strong>{total.toLocaleString()}</strong> máy nhánh
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
        title={formModal.mode === 'create' ? 'Thêm Mới Số Máy Nhánh EXT RSC' : 'Chỉnh Sửa Số Máy Nhánh EXT RSC'}
        maxWidth="540px"
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
              {isSubmitting ? 'Đang Lưu...' : formModal.mode === 'create' ? 'Tạo Số EXT' : 'Lưu Thay Đổi'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitForm} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Tên Nhân Viên <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                required
                value={formData.nhanvien}
                onChange={(e) => setFormData((prev) => ({ ...prev, nhanvien: e.target.value }))}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Số Máy Nhánh (EXT)
              </label>
              <div style={{ position: 'relative' }}>
                <PhoneCall size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={formData.so_ext || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, so_ext: e.target.value }))}
                  placeholder="VD: 7042, 7043..."
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

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Email Công Ty
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={formData.email || ''}
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
              Phòng Ban
            </label>
            <div style={{ position: 'relative' }}>
              <Building size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={formData.phongban || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, phongban: e.target.value }))}
                placeholder="VD: IT, HR, Kế Toán, MKT, CTH AMM Dept..."
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
              Ghi Chú / Vị Trí
            </label>
            <div style={{ position: 'relative' }}>
              <FileText size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <textarea
                rows={2}
                value={formData.note || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="VD: VP HCM, VP CẦN THƠ, Tầng 3..."
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
        title="Xác Nhận Xóa Số EXT"
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
              Bạn có chắc chắn muốn xóa số máy nhánh của {deleteModal.item?.nhanvien}?
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Số EXT: <strong>{deleteModal.item?.so_ext || '(Chưa có số)'}</strong> | Phòng ban: {deleteModal.item?.phongban || '(Trống)'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
