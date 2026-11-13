import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AlertOctagon,
  Search,
  RotateCcw,
  Download,
  Plus,
  RefreshCw,
  Eye,
  Server,
  Edit3,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';
import { SystemIncidentItem, SystemIncidentStats as StatsType } from '../../types/systemIncident';
import { systemIncidentService } from '../../services/systemIncidentService';
import { SystemOutageStats } from './SystemOutageStats';
import { CreateSystemOutageModal } from './CreateSystemOutageModal';
import { SystemOutageDetailModal } from './SystemOutageDetailModal';
import { useAuth } from '../../contexts/AuthContext';

const SYSTEM_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất Cả Hệ Thống' },
  { value: 'Mạng / VPN Datacenter', label: 'Mạng / VPN Datacenter' },
  { value: 'Hệ thống ERP / SAP', label: 'Hệ thống ERP / SAP' },
  { value: 'Hệ thống POS / RK7', label: 'Hệ thống POS / RK7' },
  { value: 'App Golden Spoon', label: 'App Golden Spoon' },
  { value: 'Cổng Thanh Toán (VNPay, Momo, ZaloPay)', label: 'Cổng Thanh Toán' },
  { value: 'Hệ thống Hóa Đơn Điện Tử', label: 'Hóa Đơn Điện Tử' },
  { value: 'Server Database & Dịch vụ Cloud', label: 'Server & Cloud' },
  { value: 'Email & Office 365', label: 'Email & O365' },
  { value: 'Hệ thống khác', label: 'Hệ thống khác' },
];

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất Cả Trạng Thái' },
  { value: 'DANG_XU_LY', label: '⏳ Đang Xử Lý' },
  { value: 'DA_KHAC_PHUC', label: '✅ Đã Khắc Phục' },
  { value: 'THEO_DOI', label: '🔍 Đang Theo Dõi' },
];

export const SystemOutageListTab: React.FC = () => {
  const { user } = useAuth();

  // Kiểm tra quyền: Chỉ IT Application (app / 2) hoặc Quản trị viên (admin / 0 / 1) mới có quyền thêm/sửa sự cố hệ thống
  const hasOutagePermission = useMemo(() => {
    if (!user) return false;
    if (user.is_super_admin) return true;
    const uname = (user.username || '').toLowerCase().trim();
    if (['admin', 'administrator', 'dung.nguyenanh'].includes(uname)) return true;
    const roles = (user.roles || []).map((r) => String(r).toLowerCase().trim());
    const pq = String(user.phanquyen || '').toLowerCase().trim();
    const roleName = String(user.role_name || '').toLowerCase().trim();

    const isAdmin = roles.includes('admin') || ['0', '1'].includes(pq) || roleName.includes('admin');
    if (isAdmin) return true;

    const isApp =
      roles.includes('app') ||
      roles.includes('2') ||
      roles.some((r) => r.includes('app') || r.includes('application')) ||
      pq === '2' ||
      pq.includes('app') ||
      roleName.includes('app') ||
      roleName.includes('application');
    return isApp;
  }, [user]);

  const [incidents, setIncidents] = useState<SystemIncidentItem[]>([]);
  const [stats, setStats] = useState<StatsType>({
    total: 0,
    dang_xu_ly: 0,
    da_khac_phuc: 0,
    theo_doi: 0,
    total_downtime_minutes: 0,
    total_downtime_hours: 0,
    by_system: {},
    by_severity: {},
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterSystem, setFilterSystem] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<SystemIncidentItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SystemIncidentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Set default month to current month on initial mount
  useEffect(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(ym);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await systemIncidentService.getSystemIncidents({
        search: searchTerm.trim() || undefined,
        month: selectedMonth || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        system_name: filterSystem !== 'ALL' ? filterSystem : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
        limit: 500,
      });
      setIncidents(data.items);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load system incidents', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedMonth, fromDate, toDate, filterSystem, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setFilterSystem('ALL');
    setFilterStatus('ALL');
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const blob = await systemIncidentService.exportExcel({
        search: searchTerm.trim() || undefined,
        month: selectedMonth || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        system_name: filterSystem !== 'ALL' ? filterSystem : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_Cao_Su_Co_He_Thong_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Xuất file Excel thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenDetail = (item: SystemIncidentItem) => {
    setSelectedIncident(item);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (item: SystemIncidentItem) => {
    setEditingIncident(item);
    setIsEditOpen(true);
  };

  const handleIncidentUpdated = () => {
    loadData();
    if (selectedIncident) {
      systemIncidentService.getSystemIncidentDetail(selectedIncident.id).then((fresh) => {
        setSelectedIncident(fresh);
      });
    }
  };

  // Dynamic system options
  const [systemList, setSystemList] = useState<string[]>([]);

  useEffect(() => {
    systemIncidentService
      .getSystems()
      .then((res) => {
        if (res && res.length > 0) {
          setSystemList(res);
        }
      })
      .catch((e) => console.warn('Failed to load systems for filter:', e));
  }, []);

  const getSeverityBadge = (sev?: string | null) => {
    switch (sev) {
      case 'Cả Nước':
      case 'Khẩn cấp':
        return (
          <span style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #F87171', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            🔴 Cả Nước
          </span>
        );
      case 'Miền Nam':
      case 'Cao':
        return (
          <span style={{ backgroundColor: '#FFEDD5', color: '#C2410C', border: '1px solid #FB923C', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            🟠 Miền Nam
          </span>
        );
      case '1 số user / Nhà hàng':
      case 'Trung bình':
      case 'Thấp':
        return (
          <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #93C5FD', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            🔵 1 số user / Nhà hàng
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {sev || 'Chung'}
          </span>
        );
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'DA_KHAC_PHUC':
        return (
          <span style={{ backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
            Đã Khắc Phục
          </span>
        );
      case 'THEO_DOI':
        return (
          <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
            Đang Theo Dõi
          </span>
        );
      default:
        return (
          <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
            Đang Xử Lý
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Nhật Ký Sự Cố Toàn Hệ Thống / Lỗi Diện Rộng
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            ({incidents.length} bản ghi)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={15} />}
            style={{
              backgroundColor: hasOutagePermission ? '#DC2626' : '#94A3B8',
              borderColor: hasOutagePermission ? '#B91C1C' : '#64748B',
            }}
            title={
              !hasOutagePermission
                ? `Tài khoản (${user?.role_name || user?.username || ''}) không có quyền thêm sự cố. Yêu cầu quyền IT Application hoặc Admin.`
                : undefined
            }
          >
            + Ghi Nhận Lỗi Diện Rộng
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            disabled={exporting}
            leftIcon={<Download size={14} />}
          >
            {exporting ? 'Đang Xuất...' : 'Xuất Báo Cáo Excel'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            disabled={loading}
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Làm Mới
          </Button>
        </div>
      </div>

      {/* Monthly & Time Statistics Bar */}
      <SystemOutageStats
        stats={stats}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {/* Filter Bar */}
      <div
        style={{
          padding: '12px 14px',
          backgroundColor: 'var(--bg-primary, #FFFFFF)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--border-color, #E2E8F0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
          {/* Tìm kiếm */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              TÌM KIẾM NHANH (CÓ HOẶC KHÔNG DẤU)
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tiêu đề, nội dung lỗi, hệ thống, người xử lý..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #CBD5E1)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Từ ngày */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              TỪ NGÀY
            </label>
            <DateInput
              value={fromDate}
              onChange={setFromDate}
              compact
              containerStyle={{ width: '142px' }}
              style={{ height: '32px', fontSize: '12px' }}
            />
          </div>

          {/* Đến ngày */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              ĐẾN NGÀY
            </label>
            <DateInput
              value={toDate}
              onChange={setToDate}
              compact
              containerStyle={{ width: '142px' }}
              style={{ height: '32px', fontSize: '12px' }}
            />
          </div>

          {/* Hệ thống */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              HỆ THỐNG
            </label>
            <select
              value={filterSystem}
              onChange={(e) => setFilterSystem(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
              }}
            >
              <option value="ALL">Tất Cả Hệ Thống</option>
              {systemList.length > 0
                ? systemList.map((sys) => (
                    <option key={sys} value={sys}>
                      {sys}
                    </option>
                  ))
                : SYSTEM_FILTER_OPTIONS.filter((o) => o.value !== 'ALL').map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
            </select>
          </div>

          {/* Trạng thái */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
              TRẠNG THÁI
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #CBD5E1)',
                fontSize: '12px',
              }}
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetFilters}
            leftIcon={<RotateCcw size={13} />}
          >
            Đặt Lại
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div
        style={{
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: 'var(--radius-md, 8px)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-primary, #FFFFFF)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', fontSize: '12px', fontWeight: 700 }}>
                <th style={{ padding: '10px 12px', width: '70px', textAlign: 'center' }}>MÃ ID</th>
                <th style={{ padding: '10px 12px', width: '135px' }}>THỜI GIAN BẮT ĐẦU</th>
                <th style={{ padding: '10px 12px', width: '170px' }}>HỆ THỐNG</th>
                <th style={{ padding: '10px 12px', width: '140px', textAlign: 'center' }}>PHẠM VI ẢNH HƯỞNG</th>
                <th style={{ padding: '10px 14px' }}>TIÊU ĐỀ & NỘI DUNG SỰ CỐ</th>
                <th style={{ padding: '10px 12px', width: '130px', textAlign: 'center' }}>GIÁN ĐOẠN</th>
                <th style={{ padding: '10px 12px', width: '110px', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '10px 12px', width: '130px' }}>PHỤ TRÁCH</th>
                <th style={{ padding: '10px 12px', width: '90px', textAlign: 'center' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                    <div>Đang tải danh sách sự cố diện rộng...</div>
                  </td>
                </tr>
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <AlertOctagon size={32} style={{ margin: '0 auto 8px', color: '#94A3B8' }} />
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Chưa có sự cố toàn hệ thống nào được ghi nhận</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Bấm nút <strong>"+ Ghi Nhận Lỗi Diện Rộng"</strong> ở trên để tạo sự cố mới
                    </div>
                  </td>
                </tr>
              ) : (
                incidents.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border-color, #E2E8F0)',
                      transition: 'background-color 0.15s ease',
                      backgroundColor: item.muc_do === 'Khẩn cấp' && item.trang_thai === 'DANG_XU_LY' ? '#FFF5F5' : 'transparent',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        item.muc_do === 'Khẩn cấp' && item.trang_thai === 'DANG_XU_LY' ? '#FFF5F5' : 'transparent')
                    }
                  >
                    {/* ID */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>
                      #SYS-{item.id}
                    </td>

                    {/* Bắt đầu */}
                    <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>
                        {item.thoi_gian_bat_dau ? item.thoi_gian_bat_dau.slice(11, 16) : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatDateDDMMYYYY(item.thoi_gian_bat_dau, '—')}
                      </div>
                    </td>

                    {/* Hệ thống */}
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(item.he_thong || 'Hệ thống khác')
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                          .map((sys, idx) => (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#1D4ED8',
                                backgroundColor: '#EFF6FF',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #BFDBFE',
                              }}
                            >
                              <Server size={11} />
                              <span>{sys}</span>
                            </span>
                          ))}
                      </div>
                    </td>

                    {/* Mức độ */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {getSeverityBadge(item.muc_do)}
                    </td>

                    {/* Tiêu đề & Nội dung */}
                    <td style={{ padding: '10px 14px' }}>
                      <div
                        onClick={() => handleOpenDetail(item)}
                        style={{
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          marginBottom: '2px',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.tieude}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.noi_dung}
                      </div>
                    </td>

                    {/* Gián đoạn (Downtime) */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: item.trang_thai === 'DA_KHAC_PHUC' ? '#047857' : '#DC2626',
                          backgroundColor: item.trang_thai === 'DA_KHAC_PHUC' ? '#ECFDF5' : '#FEF2F2',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {item.thoi_gian_gian_doan_text || '0 phút'}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {getStatusBadge(item.trang_thai)}
                    </td>

                    {/* Người phụ trách */}
                    <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.nguoi_xu_ly || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Note: {item.nguoi_ghi_nhan || ''}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDetail(item)}
                          leftIcon={<Eye size={13} />}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Xem
                        </Button>
                        {hasOutagePermission && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            leftIcon={<Edit3 size={13} />}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              color: '#B45309',
                              borderColor: '#FDE68A',
                              backgroundColor: '#FEF3C7',
                            }}
                            title="Chỉnh sửa thông tin sự cố"
                          >
                            Sửa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <CreateSystemOutageModal
        isOpen={isCreateOpen || isEditOpen}
        incidentToEdit={isEditOpen ? editingIncident : null}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
          setEditingIncident(null);
        }}
        onSuccess={() => {
          loadData();
          if (selectedIncident && editingIncident && selectedIncident.id === editingIncident.id) {
            systemIncidentService.getSystemIncidentDetail(editingIncident.id).then((fresh) => {
              setSelectedIncident(fresh);
            });
          }
        }}
      />

      {/* Detail Modal */}
      <SystemOutageDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        incident={selectedIncident}
        onUpdated={handleIncidentUpdated}
        onEdit={handleOpenEdit}
      />
    </div>
  );
};
