import React, { useState, useEffect } from 'react';
import {
  ListChecks,
  Search,
  Plus,
  MessageSquare,
  Check,
  X,
  RefreshCw,
  User,
  Calendar,
  FileSpreadsheet,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ChecklistRunDetailResponse, ChecklistRunItem } from '../../types/workChecklist';
import { workChecklistService } from '../../services/workChecklistService';
import { personalTaskService } from '../../services/personalTaskService';
import { useModalStack } from '../../utils/modalStack';

interface ChecklistRunDetailModalProps {
  runId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const ChecklistRunDetailModal: React.FC<ChecklistRunDetailModalProps> = ({
  runId,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { user } = useAuth();
  const rawRoles = (user?.role_name || user?.phanquyen || '').toLowerCase();
  const isSuperAdmin = !!user?.is_super_admin || rawRoles.includes('super admin') || rawRoles.includes('supper admin') || rawRoles.includes('superadmin') || user?.phanquyen === '0' || user?.username?.toLowerCase() === 'dung.nguyenanh';
  const isAdmin = isSuperAdmin || rawRoles.includes('admin') || rawRoles.includes('1') || user?.phanquyen === '1';

  const [data, setData] = useState<ChecklistRunDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Filters
  const [activeGroup, setActiveGroup] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'passed' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Item inline note / image editing
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemNoteInput, setItemNoteInput] = useState('');
  const [itemImages, setItemImages] = useState<string[]>([]);
  const [savingItem, setSavingItem] = useState(false);

  // Add custom item modal inside run
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customGroup, setCustomGroup] = useState('Phát sinh thêm');

  // Lightbox
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const lightboxZIndex = useModalStack(Boolean(lightboxImg), () => setLightboxImg(null));

  const handleExportExcel = async () => {
    if (!runId) return;
    setIsExportingExcel(true);
    try {
      await workChecklistService.exportRunDetailExcel(runId);
    } catch (err) {
      console.error('Lỗi xuất file Excel:', err);
      alert('Không thể xuất file Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const loadData = async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const res = await workChecklistService.getRunDetail(runId);
      setData(res);
    } catch (err) {
      console.error('Lỗi tải chi tiết đợt checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && runId) {
      loadData();
      setActiveGroup('ALL');
      setStatusFilter('all');
      setSearchQuery('');
      setEditingItemId(null);
    }
  }, [isOpen, runId]);

  const handleToggleStatus = async (item: ChecklistRunItem, newStatus: 'PASSED' | 'FAILED' | 'PENDING') => {
    try {
      const finalStatus = item.trang_thai === newStatus ? 'PENDING' : newStatus;
      await workChecklistService.updateRunItem(item.id, { trang_thai: finalStatus });
      await loadData();
      onRefresh();
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái mục:', err);
    }
  };

  const handleStartEditNote = (item: ChecklistRunItem) => {
    setEditingItemId(item.id);
    setItemNoteInput(item.ghi_chu_ket_qua || '');
    setItemImages(item.images || []);
  };

  const handleSaveItemNote = async (itemId: number) => {
    setSavingItem(true);
    try {
      await workChecklistService.updateRunItem(itemId, {
        ghi_chu_ket_qua: itemNoteInput.trim(),
        images: itemImages,
      });
      setEditingItemId(null);
      await loadData();
    } catch (err) {
      console.error('Lỗi lưu ghi chú mục:', err);
    } finally {
      setSavingItem(false);
    }
  };

  // Dán ảnh chụp màn hình lỗi (Ctrl + V)
  const handlePasteImage = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.indexOf('image') !== -1) {
        const file = it.getAsFile();
        if (file) {
          personalTaskService.uploadFiles([file]).then((urls) => {
            if (urls && urls.length > 0) {
              setItemImages((prev) => [...prev, ...urls]);
            }
          });
          e.preventDefault();
        }
      }
    }
  };

  const handleAddCustomItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runId || !customTitle.trim()) return;

    try {
      await workChecklistService.addCustomItemToRun(runId, customTitle.trim(), customGroup.trim());
      setIsAddCustomOpen(false);
      setCustomTitle('');
      await loadData();
      onRefresh();
    } catch (err) {
      console.error('Lỗi thêm mục phát sinh:', err);
    }
  };

  if (!isOpen || !data) return null;

  const { run, items, groups } = data;

  // Lọc items
  const filteredItems = items.filter((it) => {
    // Lọc theo nhóm
    if (activeGroup !== 'ALL' && it.nhom !== activeGroup) return false;

    // Lọc theo trạng thái
    if (statusFilter === 'pending' && it.trang_thai !== 'PENDING') return false;
    if (statusFilter === 'passed' && it.trang_thai !== 'PASSED') return false;
    if (statusFilter === 'failed' && it.trang_thai !== 'FAILED') return false;

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchTitle = it.tieu_de.toLowerCase().includes(q);
      const matchNote = (it.ghi_chu_ket_qua || '').toLowerCase().includes(q);
      const matchGroup = (it.nhom || '').toLowerCase().includes(q);
      if (!matchTitle && !matchNote && !matchGroup) return false;
    }

    return true;
  });

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListChecks size={20} style={{ color: 'var(--color-primary)' }} />
            <span>Tiến Độ & Chi Tiết Đợt Checklist Công Việc</span>
          </div>
        }
        maxWidth="950px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Summary Card */}
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: 'var(--color-primary-subtle)',
              borderRadius: '10px',
              border: '1.5px solid var(--color-primary)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #F59E0B',
                      color: '#92400E',
                      fontSize: '11.5px',
                      fontWeight: 700,
                    }}
                  >
                    {run.ten_suon}
                  </span>

                  {run.version_note && (
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--color-primary)',
                        color: '#111827',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      VERSION: {run.version_note}
                    </span>
                  )}

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: run.trang_thai === 'Hoàn thành' ? '#F0FDF4' : '#F3F4F6',
                      border: run.trang_thai === 'Hoàn thành' ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                      color: run.trang_thai === 'Hoàn thành' ? '#166534' : '#4B5563',
                      fontSize: '11.5px',
                      fontWeight: 600,
                    }}
                  >
                    ● {run.trang_thai}
                  </span>

                  {/* SLA Badge */}
                  <span
                    style={{
                      padding: '2px 9px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor:
                        run.sla_status === 'OVERDUE' || run.sla_status === 'COMPLETED_LATE'
                          ? '#FEF2F2'
                          : run.sla_status === 'WARNING'
                          ? '#FFFBEA'
                          : '#F0FDF4',
                      border:
                        run.sla_status === 'OVERDUE' || run.sla_status === 'COMPLETED_LATE'
                          ? '1px solid #FCA5A5'
                          : run.sla_status === 'WARNING'
                          ? '1px solid #FCD34D'
                          : '1px solid #86EFAC',
                      color:
                        run.sla_status === 'OVERDUE' || run.sla_status === 'COMPLETED_LATE'
                          ? '#DC2626'
                          : run.sla_status === 'WARNING'
                          ? '#D97706'
                          : '#16A34A',
                    }}
                  >
                    <Clock size={12} />
                    <span>SLA: {run.sla_days || 5} ngày ({run.sla_text || 'Đúng hạn'})</span>
                  </span>
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
                  {run.ten_dot}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6B7280', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={13} />
                    <span>Tester: <strong>{run.nguoi_thuc_hien || 'Chưa phân công'}</strong></span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    <span>Bắt đầu: {run.ngay_bat_dau ? new Date(run.ngay_bat_dau).toLocaleDateString('vi-VN') : '—'}</span>
                  </span>
                  {run.han_chot_sla && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={13} style={{ color: run.sla_status === 'OVERDUE' ? '#DC2626' : '#6B7280' }} />
                      <span>
                        Hạn chót SLA:{' '}
                        <strong style={{ color: run.sla_status === 'OVERDUE' ? '#DC2626' : '#111827' }}>
                          {new Date(run.han_chot_sla).toLocaleDateString('vi-VN')}{' '}
                          {new Date(run.han_chot_sla).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </span>
                    </span>
                  )}
                  {run.ghi_chu && (
                    <span style={{ fontStyle: 'italic', color: '#4B5563' }}>
                      ({run.ghi_chu})
                    </span>
                  )}
                </div>
              </div>

              {/* Tiến độ % Box */}
              <div style={{ textAlign: 'right', minWidth: '160px' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: run.progress_percent === 100 ? '#16A34A' : '#111827' }}>
                  {run.progress_percent}%
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  Đạt <strong style={{ color: '#16A34A' }}>{run.passed_items}</strong> / {run.total_items} mục
                  {run.failed_items > 0 && <span style={{ color: '#DC2626', marginLeft: '4px' }}>({run.failed_items} lỗi)</span>}
                </div>

                {/* Thanh Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginTop: '6px',
                  }}
                >
                  <div
                    style={{
                      width: `${run.progress_percent}%`,
                      height: '100%',
                      backgroundColor: run.progress_percent === 100 ? '#16A34A' : 'var(--color-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group Filter Tabs (ALL + Nhóm con) */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveGroup('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeGroup === 'ALL' ? 'var(--color-primary)' : '#F3F4F6',
                color: activeGroup === 'ALL' ? '#111827' : '#4B5563',
                whiteSpace: 'nowrap',
              }}
            >
              Tất Cả Mục ({items.length})
            </button>
            {groups.map((grp) => {
              const grpTotal = items.filter((i) => i.nhom === grp).length;
              const grpDone = items.filter((i) => i.nhom === grp && i.trang_thai === 'PASSED').length;
              const isGrpAllDone = grpDone === grpTotal && grpTotal > 0;

              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => setActiveGroup(grp)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeGroup === grp ? 'var(--color-primary)' : '#F3F4F6',
                    color: activeGroup === grp ? '#111827' : '#4B5563',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{grp}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      backgroundColor: isGrpAllDone ? '#DCFCE7' : 'rgba(0,0,0,0.06)',
                      color: isGrpAllDone ? '#166534' : '#6B7280',
                    }}
                  >
                    {grpDone}/{grpTotal}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Bar & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm mục kiểm tra..."
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#fff',
                  outline: 'none',
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chưa test</option>
                <option value="passed">Đạt (Passed)</option>
                <option value="failed">Lỗi (Failed)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <FileSpreadsheet size={14} style={{ color: '#16A34A' }} />
                <span>{isExportingExcel ? 'Đang Xuất Excel...' : 'Xuất Báo Cáo Excel'}</span>
              </Button>

              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsAddCustomOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Plus size={14} />
                  <span>+ Thêm Mục Phát Sinh</span>
                </Button>
              )}

              <Button
                variant="secondary"
                size="sm"
                onClick={loadData}
                disabled={loading}
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Form thêm mục phát sinh */}
          {isAddCustomOpen && (
            <form
              onSubmit={handleAddCustomItem}
              style={{
                padding: '12px 14px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1.5px dashed var(--color-primary)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Nhập nội dung mục kiểm tra phát sinh..."
                style={{
                  flex: '2 1 260px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                }}
              />
              <input
                type="text"
                value={customGroup}
                onChange={(e) => setCustomGroup(e.target.value)}
                placeholder="Tên nhóm mục..."
                style={{
                  flex: '1 1 140px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                }}
              />
              <Button type="submit" size="sm" style={{ backgroundColor: 'var(--color-primary)', color: '#111827', fontWeight: 600 }}>
                Thêm Mục
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddCustomOpen(false)}>
                Đóng
              </Button>
            </form>
          )}

          {/* Danh Sách Mục Checklist */}
          <div
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              overflow: 'hidden',
              maxHeight: '480px',
              overflowY: 'auto',
            }}
          >
            {filteredItems.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280', fontSize: '13.5px' }}>
                Không tìm thấy mục checklist nào phù hợp bộ lọc.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredItems.map((item) => {
                  const isPassed = item.trang_thai === 'PASSED';
                  const isFailed = item.trang_thai === 'FAILED';
                  const isEditingThis = editingItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F3F4F6',
                        backgroundColor: isPassed ? '#FAFAF8' : isFailed ? '#FEF2F2' : '#FFFFFF',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        {/* Checkbox / Action Buttons */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                          {/* Nút Đạt */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'PASSED')}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: isPassed ? '2px solid #16A34A' : '1.5px solid #D1D5DB',
                              backgroundColor: isPassed ? '#16A34A' : '#FFFFFF',
                              color: isPassed ? '#FFFFFF' : '#9CA3AF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginTop: '2px',
                              transition: 'all 0.15s',
                            }}
                            title={isPassed ? 'Bỏ đánh dấu Đạt' : 'Đánh dấu ĐẠT (Passed)'}
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>

                          {/* Nút Lỗi */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item, 'FAILED')}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: isFailed ? '2px solid #DC2626' : '1.5px solid #D1D5DB',
                              backgroundColor: isFailed ? '#DC2626' : '#FFFFFF',
                              color: isFailed ? '#FFFFFF' : '#9CA3AF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginTop: '2px',
                              transition: 'all 0.15s',
                            }}
                            title={isFailed ? 'Bỏ đánh dấu Lỗi' : 'Đánh dấu LỖI (Failed)'}
                          >
                            <X size={16} strokeWidth={3} />
                          </button>

                          {/* Nội dung mục */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              {item.nhom && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#4B5563',
                                  }}
                                >
                                  {item.nhom}
                                </span>
                              )}

                              {isPassed && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  ✓ ĐẠT
                                </span>
                              )}
                              {isFailed && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  ✗ LỖI
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: isPassed ? '#4B5563' : isFailed ? '#991B1B' : '#111827',
                                textDecoration: isPassed ? 'none' : 'none',
                                marginTop: '3px',
                                lineHeight: 1.4,
                              }}
                            >
                              {item.tieu_de}
                            </div>

                            {item.huong_dan && (
                              <div style={{ fontSize: '12.5px', color: '#6B7280', marginTop: '2px' }}>
                                ℹ️ {item.huong_dan}
                              </div>
                            )}

                            {/* Ghi chú kết quả & hình ảnh nếu có */}
                            {item.ghi_chu_ket_qua && (
                              <div
                                style={{
                                  marginTop: '6px',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isFailed ? '#FEE2E2' : '#F9FAFB',
                                  border: isFailed ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                  fontSize: '12.5px',
                                  color: isFailed ? '#991B1B' : '#374151',
                                }}
                              >
                                <strong>Ghi chú kết quả:</strong> {item.ghi_chu_ket_qua}
                              </div>
                            )}

                            {/* Thumbnails ảnh đính kèm */}
                            {item.images && item.images.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                {item.images.map((img, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    onClick={() => setLightboxImg(img)}
                                    style={{
                                      width: '60px',
                                      height: '45px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      border: '1px solid #D1D5DB',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <img src={img} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Meta tester & time */}
                            {item.nguoi_hoan_thanh && (
                              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                Đã test bởi <strong>{item.nguoi_hoan_thanh}</strong> lúc{' '}
                                {item.ngay_hoan_thanh ? new Date(item.ngay_hoan_thanh).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Button Note / Ghi chú */}
                        <div style={{ flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => (isEditingThis ? setEditingItemId(null) : handleStartEditNote(item))}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: item.ghi_chu_ket_qua ? 'var(--color-primary-subtle)' : '#fff',
                              color: item.ghi_chu_ket_qua ? '#92400E' : '#4B5563',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <MessageSquare size={13} />
                            <span>{item.ghi_chu_ket_qua ? 'Sửa Note' : '+ Note / Ảnh'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Khung Soạn Thảo Note & Dán Ảnh */}
                      {isEditingThis && (
                        <div
                          onPaste={handlePasteImage}
                          style={{
                            marginTop: '10px',
                            padding: '12px',
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1.5px solid var(--color-primary)',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                            Ghi Chú Kết Quả Test / Báo Lỗi:
                          </div>
                          <textarea
                            rows={2}
                            value={itemNoteInput}
                            onChange={(e) => setItemNoteInput(e.target.value)}
                            placeholder="Nhập nguyên nhân lỗi hoặc ghi chú test chi tiết..."
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid #D1D5DB',
                              fontSize: '13px',
                              boxSizing: 'border-box',
                            }}
                          />

                          {/* Vùng dán ảnh Ctrl+V */}
                          <div
                            tabIndex={0}
                            style={{
                              border: '1px dashed #D1D5DB',
                              borderRadius: '6px',
                              padding: '8px',
                              marginTop: '8px',
                              textAlign: 'center',
                              backgroundColor: '#FAFAFA',
                              fontSize: '12px',
                              color: '#6B7280',
                            }}
                          >
                            💡 Nhấn <kbd style={{ padding: '1px 4px', background: '#E5E7EB', borderRadius: '3px' }}>Ctrl + V</kbd> để dán ảnh chụp màn hình lỗi vào đây
                          </div>

                          {/* Thumbnails preview */}
                          {itemImages.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                              {itemImages.map((img, i) => (
                                <div key={i} style={{ position: 'relative', width: '70px', height: '50px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #D1D5DB' }}>
                                  <img src={img} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <button
                                    type="button"
                                    onClick={() => setItemImages((prev) => prev.filter((_, idx) => idx !== i))}
                                    style={{
                                      position: 'absolute',
                                      top: '2px',
                                      right: '2px',
                                      backgroundColor: 'rgba(220,38,38,0.85)',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '18px',
                                      height: '18px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                            <Button size="sm" variant="secondary" onClick={() => setEditingItemId(null)}>
                              Hủy
                            </Button>
                            <Button
                              size="sm"
                              disabled={savingItem}
                              onClick={() => handleSaveItemNote(item.id)}
                              style={{ backgroundColor: 'var(--color-primary)', color: '#111827', fontWeight: 600 }}
                            >
                              {savingItem ? 'Đang Lưu...' : 'Lưu Ghi Chú'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #E5E7EB' }}>
            <Button variant="primary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: lightboxZIndex,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <button
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImg}
            alt="Enlarged"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
