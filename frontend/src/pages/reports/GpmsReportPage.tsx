import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Clock,
  Compass,
  Eye,
  Filter,
  FolderInput,
  MapPin,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsAdmin } from '../../utils/authUtils';
import { formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import { gpmsReportService } from '../../services/gpmsReportService';
import {
  GpmsBatchItem,
  GpmsDashboardResponse,
  GpmsFilterState,
  GpmsRegionConfigResponse,
  GpmsSlaStatusKey,
} from '../../types/gpmsReport';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { GpmsSlaDonutPanel } from '../../components/gpms-report/GpmsSlaDonutPanel';
import { GpmsTopSendersPanel } from '../../components/gpms-report/GpmsTopSendersPanel';
import { GpmsStackedReceiverChart } from '../../components/gpms-report/GpmsStackedReceiverChart';
import { GpmsRegionComparisonPanel } from '../../components/gpms-report/GpmsRegionComparisonPanel';
import { GpmsCategoriesPanel } from '../../components/gpms-report/GpmsCategoriesPanel';
import { SouthRegionConfigModal } from '../../components/gpms-report/SouthRegionConfigModal';
import { TicketDrilldownModal } from '../../components/gpms-report/TicketDrilldownModal';
import './gpmsReportAnimations.css';

const SLA_LABEL_MAP: Record<string, string> = {
  ht_dung_han: 'Hoàn thành đúng hạn',
  ht_tre_han: 'Hoàn thành trễ hạn',
  chua_ht_chua_tre: 'Chưa HT chưa trễ hạn',
  chua_ht_tre_han: 'Chưa HT trễ hạn',
  da_huy: 'Đã hủy',
};

export const GpmsReportPage: React.FC = () => {
  const { user } = useAuth();
  const canUpdate =
    checkIsAdmin(user) ||
    Boolean(user?.permissions?.update_gpms_report) ||
    Boolean(user?.permissions?.gpms_report);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [batches, setBatches] = useState<GpmsBatchItem[]>([]);
  const [availableReportFiles, setAvailableReportFiles] = useState<string[]>([]);
  const [dashboard, setDashboard] = useState<GpmsDashboardResponse | null>(null);

  const [filters, setFilters] = useState<GpmsFilterState>({
    refMode: 'export',
    includeAnonymous: true,
    includeUnassignedDmcv: true,
    region: '',
    search: '',
  });
  const [searchDraft, setSearchDraft] = useState('');

  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cấu hình User Miền Nam
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [regionConfigData, setRegionConfigData] = useState<GpmsRegionConfigResponse | null>(null);
  const [regionSaving, setRegionSaving] = useState(false);

  // Xem danh sách Ticket chi tiết
  const [drilldownState, setDrilldownState] = useState<{
    isOpen: boolean;
    title: string;
    filters: GpmsFilterState;
  }>({
    isOpen: false,
    title: '',
    filters: {
      refMode: 'export',
      includeAnonymous: true,
      includeUnassignedDmcv: true,
    },
  });

  // Xác nhận xóa kỳ báo cáo (dùng UI Modal thay cho window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<GpmsBatchItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBatchesAndDashboard = useCallback(async (currentFilters: GpmsFilterState) => {
    setLoading(true);
    try {
      const batchRes = await gpmsReportService.listBatches(true);
      setBatches(batchRes.items);
      setAvailableReportFiles(batchRes.available_report_files || []);

      if (batchRes.items.length === 0) {
        setDashboard(null);
        return;
      }

      const targetBatchId =
        currentFilters.batchId && batchRes.items.some((b) => b.id === currentFilters.batchId)
          ? currentFilters.batchId
          : batchRes.items[0].id;

      const analytics = await gpmsReportService.getAnalytics({
        ...currentFilters,
        batchId: targetBatchId,
      });
      setDashboard(analytics);
      if (!currentFilters.batchId) {
        setFilters((prev) => ({ ...prev, batchId: targetBatchId }));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể tải dữ liệu Báo Cáo GPMS.';
      setBanner({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAnalyticsOnly = useCallback(async (nextFilters: GpmsFilterState) => {
    setLoading(true);
    try {
      const analytics = await gpmsReportService.getAnalytics(nextFilters);
      setDashboard(analytics);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Không thể cập nhật thống kê.';
      setBanner({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatchesAndDashboard(filters);
    // Chỉ nạp lần đầu khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilterPatch = (patch: Partial<GpmsFilterState>) => {
    const next: GpmsFilterState = { ...filters, ...patch };
    setFilters(next);
    refreshAnalyticsOnly(next);
  };

  const resetAllCrossFilters = () => {
    setSearchDraft('');
    const next: GpmsFilterState = {
      batchId: filters.batchId,
      refMode: filters.refMode,
      includeAnonymous: filters.includeAnonymous,
      includeUnassignedDmcv: filters.includeUnassignedDmcv,
      region: '',
      search: '',
    };
    setFilters(next);
    refreshAnalyticsOnly(next);
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    setBanner(null);
    try {
      const created = await gpmsReportService.uploadReportExcel(file);
      setBanner({
        type: 'success',
        message: `Đã nạp thành công "${created.file_name}" (${created.total_rows.toLocaleString('vi-VN')} ticket).`,
      });
      const nextFilters: GpmsFilterState = { ...filters, batchId: created.id };
      setFilters(nextFilters);
      await loadBatchesAndDashboard(nextFilters);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Lỗi khi nạp file Excel GPMS.';
      setBanner({ type: 'error', message: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleImportFromFolder = async () => {
    setUploading(true);
    setBanner(null);
    try {
      const created = await gpmsReportService.importFromFolder(availableReportFiles[0]);
      setBanner({
        type: 'success',
        message: `Đã đồng bộ "${created.file_name}" từ thư mục REPORT/ (${created.total_rows.toLocaleString('vi-VN')} ticket).`,
      });
      const nextFilters: GpmsFilterState = { ...filters, batchId: created.id };
      setFilters(nextFilters);
      await loadBatchesAndDashboard(nextFilters);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Lỗi nạp file từ thư mục REPORT/.';
      setBanner({ type: 'error', message: msg });
    } finally {
      setUploading(false);
    }
  };

  const handleOpenSouthConfig = async () => {
    try {
      const data = await gpmsReportService.getRegionConfig(filters.batchId);
      setRegionConfigData(data);
      setRegionModalOpen(true);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể tải danh sách cấu hình Miền Nam.',
      });
    }
  };

  const handleSaveSouthConfig = async (
    usernames: string[],
    fullNames: Record<string, string>
  ) => {
    setRegionSaving(true);
    try {
      const updated = await gpmsReportService.saveRegionConfig(
        usernames,
        fullNames,
        filters.batchId
      );
      setRegionConfigData(updated);
      setRegionModalOpen(false);
      setBanner({
        type: 'success',
        message: `Đã lưu ${updated.south_usernames.length} User thuộc Miền Nam. Bảng thống kê Nam / Bắc đã được cập nhật.`,
      });
      await refreshAnalyticsOnly(filters);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.response?.data?.detail || 'Không thể lưu cấu hình Miền Nam.',
      });
    } finally {
      setRegionSaving(false);
    }
  };

  const handleConfirmDeleteBatch = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gpmsReportService.deleteBatch(deleteTarget.id);
      setDeleteTarget(null);
      setBanner({
        type: 'success',
        message: `Đã xóa kỳ báo cáo "${deleteTarget.report_name}".`,
      });
      const clearedFilters: GpmsFilterState = { ...filters, batchId: undefined };
      setFilters(clearedFilters);
      await loadBatchesAndDashboard(clearedFilters);
    } catch (err: any) {
      setBanner({
        type: 'error',
        message: err?.response?.data?.detail || 'Lỗi khi xóa kỳ báo cáo.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const openDrilldown = (overridePatch: Partial<GpmsFilterState>, title: string) => {
    setDrilldownState({
      isOpen: true,
      title,
      filters: { ...filters, ...overridePatch },
    });
  };

  const activeCrossFilterChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (filters.slaStatus) {
    activeCrossFilterChips.push({
      key: 'sla',
      label: `SLA: ${SLA_LABEL_MAP[filters.slaStatus] || filters.slaStatus}`,
      clear: () => applyFilterPatch({ slaStatus: undefined }),
    });
  }
  if (filters.sender) {
    activeCrossFilterChips.push({
      key: 'sender',
      label: `Người gửi: ${filters.sender}`,
      clear: () => applyFilterPatch({ sender: undefined }),
    });
  }
  if (filters.receiver) {
    activeCrossFilterChips.push({
      key: 'receiver',
      label: `Người xử lý: ${filters.receiver}`,
      clear: () => applyFilterPatch({ receiver: undefined }),
    });
  }
  if (filters.region) {
    activeCrossFilterChips.push({
      key: 'region',
      label: `Vùng: ${filters.region === 'NAM' ? 'Miền Nam' : 'Miền Bắc'}`,
      clear: () => applyFilterPatch({ region: '' }),
    });
  }
  if (filters.phanLoai) {
    activeCrossFilterChips.push({
      key: 'phanLoai',
      label: `Phân loại: ${filters.phanLoai}`,
      clear: () => applyFilterPatch({ phanLoai: undefined }),
    });
  }
  if (filters.dmcv1) {
    activeCrossFilterChips.push({
      key: 'dmcv1',
      label: `DMCV 1: ${filters.dmcv1}`,
      clear: () => applyFilterPatch({ dmcv1: undefined, dmcv2: undefined }),
    });
  }
  if (filters.dmcv2) {
    activeCrossFilterChips.push({
      key: 'dmcv2',
      label: `DMCV 2: ${filters.dmcv2}`,
      clear: () => applyFilterPatch({ dmcv2: undefined }),
    });
  }
  if (filters.search) {
    activeCrossFilterChips.push({
      key: 'search',
      label: `Từ khóa: "${filters.search}"`,
      clear: () => {
        setSearchDraft('');
        applyFilterPatch({ search: '' });
      },
    });
  }

  return (
    <div className="gpms-page-shell">
      {/* Thanh tiêu đề & điều khiển chính */}
      <div
        className="gpms-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                backgroundColor: 'var(--color-primary-subtle)',
                border: '1px solid var(--color-primary)',
                color: 'var(--color-primary-text)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BarChart3 size={21} />
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Báo Cáo GPMS
                </h1>
                {dashboard && (
                  <>
                    <Badge variant="primary">
                      {dashboard.batch.period_label || 'Kỳ GPMS'}
                    </Badge>
                    <Badge variant="neutral">
                      Xuất file: {formatDateTimeDDMMYYYY(dashboard.batch.export_at, { fallback: '—' })}
                    </Badge>
                  </>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                Phân tích tương tác tiến độ YCHT, Top Người Gửi/Nhận, Vùng Nam/Bắc, Phân loại & Danh mục công việc
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              style={{ display: 'none' }}
              onChange={handleUploadFile}
            />

            {canUpdate && (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  leftIcon={<Upload size={15} />}
                >
                  Tải File Excel (.xlsx)
                </Button>

                {availableReportFiles.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={uploading}
                    onClick={handleImportFromFolder}
                    leftIcon={<FolderInput size={15} />}
                    title={`Nạp lại file ${availableReportFiles[0]} từ thư mục REPORT/`}
                  >
                    Nạp từ REPORT/
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleOpenSouthConfig}
                  leftIcon={<Settings2 size={15} />}
                >
                  Cấu Hình User Miền Nam
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => refreshAnalyticsOnly(filters)}
              leftIcon={<RefreshCw size={14} className={loading ? 'spin' : undefined} />}
            >
              Làm mới
            </Button>
          </div>
        </div>

        {/* Hàng công cụ kỳ báo cáo + Mốc tính SLA + Tìm kiếm nhanh */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '10px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* Chọn kỳ báo cáo */}
          {batches.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: '0 1 420px', maxWidth: '100%', minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                Kỳ dữ liệu:
              </span>
              <select
                value={filters.batchId || batches[0]?.id || ''}
                onChange={(e) => {
                  const idNum = Number(e.target.value);
                  if (idNum) {
                    applyFilterPatch({ batchId: idNum });
                  }
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  flex: '1 1 180px',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.report_name} ({b.total_rows.toLocaleString('vi-VN')} ticket — {formatDateTimeDDMMYYYY(b.export_at, { fallback: 'Mới nạp' })})
                  </option>
                ))}
              </select>

              {canUpdate && dashboard && batches.length > 1 && (
                <button
                  type="button"
                  title="Xóa kỳ báo cáo đang chọn"
                  onClick={() => setDeleteTarget(dashboard.batch)}
                  style={{
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: '#EF4444',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}

          {/* Chọn Vùng Miền phân tích ngay trên thanh công cụ (Tất cả / Miền Nam / Miền Bắc) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} style={{ color: '#F59E0B' }} />
              Vùng miền:
            </span>
            <button
              type="button"
              className={`gpms-pill-btn ${!filters.region ? 'is-active' : ''}`}
              onClick={() => applyFilterPatch({ region: '' })}
            >
              Tất cả vùng
            </button>
            <button
              type="button"
              className={`gpms-pill-btn ${filters.region === 'NAM' ? 'is-active' : ''}`}
              onClick={() => applyFilterPatch({ region: filters.region === 'NAM' ? '' : 'NAM' })}
              title="Chỉ phân tích toàn bộ 6 bảng theo các User thuộc Miền Nam"
            >
              <MapPin size={12} />
              <span>
                Miền Nam ({dashboard?.south_usernames.length || 0} user)
              </span>
            </button>
            <button
              type="button"
              className={`gpms-pill-btn ${filters.region === 'BAC' ? 'is-active' : ''}`}
              onClick={() => applyFilterPatch({ region: filters.region === 'BAC' ? '' : 'BAC' })}
              title="Chỉ phân tích toàn bộ 6 bảng theo các User thuộc Miền Bắc"
            >
              <Compass size={12} />
              <span>Miền Bắc</span>
            </button>
          </div>

          {/* Mốc so sánh trễ hạn YCHT */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} />
              Mốc tính trễ YCHT:
            </span>
            <button
              type="button"
              className={`gpms-pill-btn ${filters.refMode === 'export' ? 'is-active' : ''}`}
              onClick={() => applyFilterPatch({ refMode: 'export' })}
            >
              Theo ngày xuất file
            </button>
            <button
              type="button"
              className={`gpms-pill-btn ${filters.refMode === 'now' ? 'is-active' : ''}`}
              onClick={() => applyFilterPatch({ refMode: 'now' })}
            >
              Thời gian thực (Hiện tại)
            </button>
          </div>

          {/* Ô tìm kiếm chéo toàn bộ báo cáo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flex: '1 1 240px', maxWidth: '380px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '9px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    applyFilterPatch({ search: searchDraft });
                  }
                }}
                placeholder="Lọc nhanh mã, nội dung, user, DMCV (Enter)..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 10px 6px 28px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                }}
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => applyFilterPatch({ search: searchDraft })}
            >
              Lọc
            </Button>
          </div>
        </div>

        {/* Thanh hiển thị các bộ lọc chéo đang bật */}
        {activeCrossFilterChips.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '10px',
              backgroundColor: 'var(--color-primary-subtle)',
              border: '1px solid var(--color-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Filter size={13} />
                Đang lọc chéo:
              </span>
              {activeCrossFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 9px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-color-dark)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>{chip.label}</span>
                  <X size={12} />
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openDrilldown({}, 'Danh sách Ticket theo bộ lọc đang chọn')}
                leftIcon={<Eye size={14} />}
              >
                Xem Ticket chi tiết ({dashboard?.sla_summary.total.toLocaleString('vi-VN') || 0})
              </Button>
              <Button size="sm" variant="outline" onClick={resetAllCrossFilters}>
                Xóa tất cả lọc
              </Button>
            </div>
          </div>
        )}
      </div>

      {banner && (
        <Alert
          type={banner.type}
          message={banner.message}
          onClose={() => setBanner(null)}
        />
      )}

      {/* Trạng thái rỗng khi chưa nạp file */}
      {!loading && !dashboard && (
        <div
          className="gpms-panel"
          style={{
            padding: '44px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <BarChart3 size={42} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Chưa Có Dữ Liệu Báo Cáo GPMS
          </h2>
          <p style={{ margin: 0, maxWidth: '520px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Tải lên file Excel <code>ChiTietCongViec_*.xlsx</code> xuất từ GPMS hoặc nạp nhanh trực tiếp từ thư mục <code>REPORT/</code> để xem toàn bộ biểu đồ tương tác.
          </p>
          {canUpdate && (
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload size={16} />}
              >
                Chọn File Excel GPMS (.xlsx)
              </Button>
              {availableReportFiles.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleImportFromFolder}
                  leftIcon={<FolderInput size={16} />}
                >
                  Nạp {availableReportFiles[0]}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Nội dung 6 phân tích tương tác chính */}
      {dashboard && (
        <>
          {/* Tiêu chí 3: Thống kê chung Ticket theo 5 tiêu chí SLA */}
          <GpmsSlaDonutPanel
            sla={dashboard.sla_summary}
            activeSlaFilter={filters.slaStatus}
            onSelectSlaFilter={(statusKey) => applyFilterPatch({ slaStatus: statusKey })}
            onInspectTickets={(statusKey: GpmsSlaStatusKey, label: string) =>
              openDrilldown({ slaStatus: statusKey }, `Ticket: ${label}`)
            }
          />

          {/* Tiêu chí 1 & Tiêu chí 2: Top 5 Người Gửi & Top 5 Người Nhận (1 cột 3 màu) */}
          <div className="gpms-grid-2col">
            <GpmsTopSendersPanel
              senders={dashboard.senders}
              anonymousCount={dashboard.anonymous_count}
              includeAnonymous={filters.includeAnonymous}
              onToggleAnonymous={() =>
                applyFilterPatch({ includeAnonymous: !filters.includeAnonymous })
              }
              activeSender={filters.sender}
              onSelectSender={(username) => applyFilterPatch({ sender: username })}
              onInspectSender={(senderItem) =>
                openDrilldown(
                  { sender: senderItem.username },
                  `Yêu cầu gửi bởi: ${senderItem.full_name} (${senderItem.username})`
                )
              }
            />

            <GpmsStackedReceiverChart
              receivers={dashboard.receivers}
              activeReceiver={filters.receiver}
              onSelectReceiver={(username) => applyFilterPatch({ receiver: username })}
              onInspectReceiver={(recItem) =>
                openDrilldown(
                  { receiver: recItem.username },
                  `Ticket xử lý bởi: ${recItem.full_name} (${recItem.username})`
                )
              }
            />
          </div>

          {/* Tiêu chí 4: Thống kê theo Vùng Miền Nam / Bắc */}
          <GpmsRegionComparisonPanel
            regions={dashboard.regions}
            activeRegion={filters.region}
            activeReceiver={filters.receiver}
            canConfigure={canUpdate}
            onSelectRegion={(reg) => applyFilterPatch({ region: reg || '' })}
            onSelectReceiver={(username) => applyFilterPatch({ receiver: username })}
            onInspectRegion={(reg, title) => openDrilldown({ region: reg }, title)}
            onOpenSouthConfig={handleOpenSouthConfig}
          />

          {/* Tiêu chí 5 & Tiêu chí 6: Phân loại công việc & Danh mục công việc (DMCV) */}
          <GpmsCategoriesPanel
            phanLoaiList={dashboard.phan_loai_list}
            dmcv1List={dashboard.dmcv1_list}
            unassignedDmcvCount={dashboard.unassigned_dmcv_count}
            includeUnassignedDmcv={filters.includeUnassignedDmcv}
            onToggleUnassignedDmcv={() =>
              applyFilterPatch({ includeUnassignedDmcv: !filters.includeUnassignedDmcv })
            }
            activePhanLoai={filters.phanLoai}
            activeDmcv1={filters.dmcv1}
            activeDmcv2={filters.dmcv2}
            onSelectPhanLoai={(name) => applyFilterPatch({ phanLoai: name })}
            onSelectDmcv1={(name) => applyFilterPatch({ dmcv1: name, dmcv2: undefined })}
            onSelectDmcv2={(dmcv1Name, dmcv2Name) =>
              applyFilterPatch({ dmcv1: dmcv1Name, dmcv2: dmcv2Name })
            }
            onInspectCategory={(patch, title) => openDrilldown(patch, title)}
          />
        </>
      )}

      {/* Modal cấu hình User Miền Nam */}
      <SouthRegionConfigModal
        isOpen={regionModalOpen}
        onClose={() => setRegionModalOpen(false)}
        candidates={regionConfigData?.candidates || []}
        initialSelected={regionConfigData?.south_usernames || dashboard?.south_usernames || []}
        onSave={handleSaveSouthConfig}
        saving={regionSaving}
      />

      {/* Modal xem chi tiết danh sách Ticket theo từng chiều lọc */}
      <TicketDrilldownModal
        isOpen={drilldownState.isOpen}
        onClose={() => setDrilldownState((s) => ({ ...s, isOpen: false }))}
        title={drilldownState.title}
        filters={drilldownState.filters}
      />

      {/* Modal xác nhận xóa kỳ báo cáo */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="460px"
        title="Xác Nhận Xóa Kỳ Báo Cáo GPMS"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Hủy
            </Button>
            <Button variant="danger" onClick={handleConfirmDeleteBatch} isLoading={deleting}>
              Xác Nhận Xóa
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
          Bạn có chắc muốn xóa kỳ báo cáo <strong>{deleteTarget?.report_name}</strong> ({deleteTarget?.file_name})?
        </p>
      </Modal>
    </div>
  );
};
