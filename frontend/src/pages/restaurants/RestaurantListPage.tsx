import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Search,
  Plus,
  Download,
  Edit2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Mail,
  Monitor,
  Wrench,
  ClipboardList,
  X,
  Phone,
  PhoneCall,
  Smartphone,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MultiSelect, MultiSelectOption } from '../../components/ui/MultiSelect';
import { Alert } from '../../components/ui/Alert';
import { RestaurantItem } from '../../types/restaurant';
import { copyToClipboard } from '../../utils/clipboard';
import {
  getRestaurants,
  exportRestaurantsExcel,
  getFilterOptions,
} from '../../services/restaurantService';
import { RestaurantDetailModal } from '../../components/restaurants/RestaurantDetailModal';
import { useNavigate } from 'react-router-dom';
import { RestaurantFormModal } from '../../components/restaurants/RestaurantFormModal';
import { BrandRegionModal } from '../../components/restaurants/BrandRegionModal';
import { VncKdsModal } from '../../components/restaurants/VncKdsModal';
import { VncSetupModal } from '../../components/restaurants/VncSetupModal';
import { hotlineService } from '../../services/hotlineService';
import { useHotline } from '../../contexts/HotlineContext';
import { RestaurantAuditLogsModal } from '../../components/restaurants/RestaurantAuditLogsModal';
import { RestaurantSoftwareVersionsModal } from '../../components/restaurants/RestaurantSoftwareVersionsModal';
import { DailyPendingTasksModal } from '../../components/dashboard/DailyPendingTasksModal';
import { dashboardService, PendingSummaryResponse } from '../../services/dashboardService';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin, checkIsAdmin, checkIsAppRole, checkIsDungOrSuperAdmin, hasNewScreenAccess, isMobileDevice } from '../../utils/authUtils';

const TRANG_THAI_OPTIONS: MultiSelectOption[] = [
  {
    value: 'ON',
    label: 'Hoạt động (ON)',
    badgeBg: '#DCFCE7',
    badgeColor: '#166534',
    badgeBorder: '#86EFAC',
  },
  {
    value: 'OFF',
    label: 'Ngừng hoạt động (OFF)',
    badgeBg: '#FEE2E2',
    badgeColor: '#991B1B',
    badgeBorder: '#FCA5A5',
  },
  {
    value: 'NEW',
    label: 'Nhà hàng mới (NEW)',
    badgeBg: '#DBEAFE',
    badgeColor: '#1E40AF',
    badgeBorder: '#93C5FD',
  },
];

export const RestaurantListPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = checkIsSuperAdmin(user);
  const isAdmin = checkIsAdmin(user);
  const isDungOrSuperAdmin = checkIsDungOrSuperAdmin(user);
  const isAppRole = checkIsAppRole(user);
  const shouldShowDailyNotice = isAppRole || isDungOrSuperAdmin || isSuperAdmin;
  const hasExtendedPermission = !!user?.quyen_mo_rong && user?.quyen_mo_rong !== '0';
  const canManageBrandRegion = isAdmin || hasExtendedPermission;

  // Tự động chuyển hướng sang Mobile Portal nếu người dùng truy cập từ điện thoại và có quyền
  useEffect(() => {
    const isMobile = isMobileDevice();
    const hasMobilePortal = hasNewScreenAccess(user, 'mobile_dedicated_view');
    const preferDesktop = typeof window !== 'undefined' && sessionStorage.getItem('prefer_desktop') === 'true';

    if (isMobile && hasMobilePortal && !preferDesktop) {
      navigate('/mobile', { replace: true });
    }
  }, [user, navigate]);

  // 3CX Hotline Call Alert
  const {
    latestNonRestaurantCall,
    dismissNonRestaurantCall,
    openMissedCallsModal,
    missedHotlineCount,
  } = useHotline();

  // Daily Pending Tasks Popup (User App, dung.nguyenanh & Super Admin)
  const [showDailyPopup, setShowDailyPopup] = useState<boolean>(false);
  const [pendingSummary, setPendingSummary] = useState<PendingSummaryResponse | null>(null);

  useEffect(() => {
    if (!shouldShowDailyNotice) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentUsername = (user?.username || 'anonymous').toLowerCase().trim();
    const storageKey = `daily_pending_popup_${currentUsername}_${todayStr}`;
    const hasSeenToday = localStorage.getItem(storageKey);

    if (hasSeenToday) return;

    dashboardService
      .getPendingSummary()
      .then((res) => {
        setPendingSummary(res);
        const isPrivileged = isDungOrSuperAdmin || isSuperAdmin;
        const pendingCount = isPrivileged
          ? ((res.items?.checklist?.total || 0) +
             (res.items?.memo?.total || 0) +
             (res.items?.pim?.total || 0) +
             (res.items?.setup_nh?.total || 0) +
             (res.items?.incidents?.total || 0))
          : ((res.items?.checklist?.my || 0) +
             (res.items?.memo?.my || 0) +
             (res.items?.pim?.my || 0) +
             (res.items?.setup_nh?.my || 0) +
             (res.items?.incidents?.my || 0));

        if (pendingCount > 0) {
          setShowDailyPopup(true);
        }
      })
      .catch((err) => console.error('Lỗi tải pending summary cho popup:', err));
  }, [shouldShowDailyNotice, user?.username, isDungOrSuperAdmin, isSuperAdmin]);

  const handleCloseDailyPopup = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentUsername = (user?.username || 'anonymous').toLowerCase().trim();
    const storageKey = `daily_pending_popup_${currentUsername}_${todayStr}`;
    localStorage.setItem(storageKey, 'true');
    setShowDailyPopup(false);
  };

  // Modals state
  const [brandRegionModalOpen, setBrandRegionModalOpen] = useState<boolean>(false);

  // Data state
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Filter state (Mặc định hiển thị tất cả Nhà Hàng)
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedTrangThai, setSelectedTrangThai] = useState<string[]>([]);

  // Master data options for Create/Edit Modal
  const [regions, setRegions] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Loading & error state
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantItem | null>(null);
  const [logsModalOpen, setLogsModalOpen] = useState<boolean>(false);

  // Copy notification state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // VNC/KDS modal state
  const [vncModalOpen, setVncModalOpen] = useState<boolean>(false);
  const [vncRestaurantName, setVncRestaurantName] = useState<string>('');
  const [vncIpPrefix, setVncIpPrefix] = useState<string>('');
  const [vncSetupOpen, setVncSetupOpen] = useState<boolean>(false);
  const [softwareVersionsModalOpen, setSoftwareVersionsModalOpen] = useState<boolean>(false);



  // Top horizontal scroll synchronization
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const tableRef = React.useRef<HTMLTableElement>(null);

  const [tableScrollWidth, setTableScrollWidth] = useState<number>(0);
  const [showTopScroll, setShowTopScroll] = useState<boolean>(false);

  const isSyncingTop = React.useRef(false);
  const isSyncingBottom = React.useRef(false);

  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (bottomScrollRef.current && topScrollRef.current) {
      isSyncingBottom.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topScrollRef.current && bottomScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  // Check table horizontal overflow whenever data, page, or window dimensions change
  useEffect(() => {
    const checkOverflow = () => {
      if (bottomScrollRef.current && tableRef.current) {
        const scrollW = tableRef.current.scrollWidth;
        const clientW = bottomScrollRef.current.clientWidth;
        setTableScrollWidth(scrollW);
        setShowTopScroll(scrollW > clientW);
      }
    };

    // Run check initially and after small layout delay
    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);

    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });

    if (bottomScrollRef.current) {
      resizeObserver.observe(bottomScrollRef.current);
    }
    if (tableRef.current) {
      resizeObserver.observe(tableRef.current);
    }

    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkOverflow);
    };
  }, [restaurants, isLoading]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch region & brand options for create/edit modal
  const fetchOptions = useCallback(async () => {
    try {
      const data = await getFilterOptions();
      setRegions(data.regions || []);
      setBrands(data.brands || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Fetch restaurant list
  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRestaurants({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        trangthai: selectedTrangThai.length > 0 ? selectedTrangThai.join(',') : undefined,
        sort_by: 'res',
        sort_order: 'asc',
      });
      setRestaurants(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || 'Không thể tải danh sách nhà hàng. Vui lòng thử lại sau.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedTrangThai]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Handle Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const blob = await exportRestaurantsExcel({
        search: debouncedSearch || undefined,
        trangthai: selectedTrangThai.length > 0 ? selectedTrangThai.join(',') : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Danh_Sach_Nha_Hang_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Xuất file Excel thất bại.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Copy IP
  const handleCopyIp = async (e: React.MouseEvent, ip: string, id: number) => {
    e.stopPropagation();
    if (!ip) return;
    const ok = await copyToClipboard(ip);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // VNC/KDS: extract IP prefix (first 3 octets + dot) e.g. "10.8.152." from "10.8.152.x"
  const getIpPrefix = (ip: string | null | undefined): string => {
    if (!ip) return '';
    const clean = ip.replace(/[^0-9.]/g, '.').replace(/\.+$/, '');
    const parts = clean.split('.');
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('.') + '.';
    }
    return '';
  };

  // Check if VNC button should be enabled for a restaurant
  const isVncEnabled = (r: RestaurantItem): boolean => {
    const hasSap = !!r.sap && r.sap.trim().toLowerCase() !== 'khong phai nh';
    const hasRk7 = !!r.rk7 && r.rk7.trim().toLowerCase() !== 'khong phai nh';
    const isOn = !!r.trangthai && ['ON', 'NEW'].includes(r.trangthai.trim().toUpperCase());
    const hasIp = !!getIpPrefix(r.ip);
    return hasSap && hasRk7 && isOn && hasIp;
  };

  const handleOpenVnc = (e: React.MouseEvent, r: RestaurantItem) => {
    e.stopPropagation();
    const prefix = getIpPrefix(r.ip);
    if (!prefix) return;
    const formattedTitle = `${r.sap ? r.sap + ' ' : ''}${r.res || ''}${r.rk7 ? ' (RK7: ' + r.rk7 + ')' : ''}${r.ip ? ' ' + r.ip : ''}`.trim();
    setVncRestaurantName(formattedTitle);
    setVncIpPrefix(prefix);
    setVncModalOpen(true);
  };

  // Đóng Modal VNC/KDS
  const handleCloseVncModal = () => {
    setVncModalOpen(false);
    hotlineService.endCurrentCall().catch(() => {});
  };

  // Lắng nghe sự kiện tự động lọc nhà hàng khi có cuộc gọi tới từ Global Hotline
  useEffect(() => {
    const handleHotlineFilter = (e: any) => {
      if (e.detail && e.detail.keyword) {
        setSearch(e.detail.keyword);
        setDebouncedSearch(e.detail.keyword);
        setPage(1);
      }
    };
    window.addEventListener('hotline_filter_restaurant', handleHotlineFilter);
    return () => {
      window.removeEventListener('hotline_filter_restaurant', handleHotlineFilter);
    };
  }, []);

  return (
    <div className="page-container-fullheight" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflow: 'hidden' }}>
      {/* Banner thông báo và nút chuyển về Mobile Portal nếu đang xem trên điện thoại */}
      {isMobileDevice() && hasNewScreenAccess(user, 'mobile_dedicated_view') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#0284C7',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Smartphone size={16} />
            <span>Đang xem bản Web máy tính trên điện thoại</span>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('prefer_desktop');
              navigate('/mobile');
            }}
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0284C7',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            📱 Về Mobile Portal
          </button>
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-text)',
            }}
          >
            <Store size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Danh Sách Nhà Hàng
              </h1>
              <button
                type="button"
                onClick={() => setSoftwareVersionsModalOpen(true)}
                title="Xem phiên bản phần mềm hệ thống (KDS, CO, SO, GPOS-CO-SO, GPOS KDS)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  border: '1.5px solid #F59E0B',
                  color: '#B45309',
                  fontSize: '14px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(245, 158, 11, 0.25)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FDE68A';
                  e.currentTarget.style.transform = 'scale(1.12)';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(245, 158, 11, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FEF3C7';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(245, 158, 11, 0.25)';
                }}
              >
                !
              </button>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
              Quản lý danh sách nhà hàng, IP LAN, mã SAP, RK7 và hỗ trợ từ xa VNC / KDS
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="mobile-action-grid" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
            className="mobile-action-primary mobile-action-btn"
            onClick={() => {
              setEditingRestaurant(null);
              setFormModalOpen(true);
            }}
          >
            + Thêm Nhà Hàng
          </Button>
          {canManageBrandRegion && (
            <Button
              variant="secondary"
              leftIcon={<Layers size={16} />}
              className="mobile-action-btn"
              onClick={() => setBrandRegionModalOpen(true)}
              title="Quản lý và thêm mới Thương hiệu, Khu vực (Tỉnh/Thành)"
            >
              Thương Hiệu & Khu Vực
            </Button>
          )}
          <Button
            variant="secondary"
            leftIcon={<Download size={16} />}
            className="mobile-action-btn"
            onClick={handleExportExcel}
            isLoading={isExporting}
          >
            Xuất Excel
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Wrench size={15} />}
            className="mobile-action-btn"
            onClick={() => setVncSetupOpen(true)}
            title="Tải bộ cài Scrcpy (KDS) và file cấu hình Registry Windows"
          >
            Cài Đặt VNC / KDS
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ClipboardList size={16} />}
            className="mobile-action-btn"
            onClick={() => setLogsModalOpen(true)}
            title="Xem báo cáo logs thêm mới và chỉnh sửa nhà hàng"
          >
            Báo Cáo Logs
          </Button>
        </div>
      </div>

      {/* Thông Báo Cuộc Gọi Tới Từ Người Dùng Không Phải Nhà Hàng (Được chỉ định vị trí trên trang) */}
      {latestNonRestaurantCall && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 18px',
            backgroundColor: latestNonRestaurantCall.call_status === 'INCOMING' ? '#FEF2F2' : '#FFFBEB',
            border: latestNonRestaurantCall.call_status === 'INCOMING' ? '1.5px solid #FCA5A5' : '1.5px solid #FDE68A',
            borderLeft: latestNonRestaurantCall.call_status === 'INCOMING' ? '6px solid #EF4444' : '6px solid #F59E0B',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
            marginBottom: '4px',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: latestNonRestaurantCall.call_status === 'INCOMING' ? '#FEE2E2' : '#FEF3C7',
                color: latestNonRestaurantCall.call_status === 'INCOMING' ? '#DC2626' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <PhoneCall
                size={20}
                style={{
                  animation: latestNonRestaurantCall.call_status === 'INCOMING' ? 'pulse 1s infinite' : 'none',
                }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: latestNonRestaurantCall.call_status === 'INCOMING' ? '#EF4444' : '#F59E0B',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {latestNonRestaurantCall.call_status === 'INCOMING' ? '🔴 Đang Đổ Chuông' : '⚠️ Cuộc Gọi Nhỡ'}
                </span>
                <span
                  style={{
                    backgroundColor: '#F3F4F6',
                    color: '#1F2937',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  #{latestNonRestaurantCall.ext}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {latestNonRestaurantCall.caller_raw_text || `Máy nhánh ${latestNonRestaurantCall.ext}`}
                </span>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  🏢 Cuộc gọi nội bộ / Không thuộc danh mục Nhà Hàng
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                {latestNonRestaurantCall.created_at && (
                  <span>Thời gian: {latestNonRestaurantCall.created_at} • </span>
                )}
                <span>(Người dùng này không thuộc cơ sở dữ liệu Nhà Hàng nên không tự động mở kết nối từ xa VNC/KDS)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {missedHotlineCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={openMissedCallsModal}
                style={{
                  color: '#DC2626',
                  borderColor: '#FCA5A5',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                Xem Cuộc Gọi Nhỡ ({missedHotlineCount})
              </Button>
            )}
            <button
              onClick={dismissNonRestaurantCall}
              title="Ẩn thông báo này"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                color: '#9CA3AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card style={{ padding: '12px 16px' }} className="mobile-filter-card">
        <div
          className="mobile-filter-stack"
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
          }}
        >
          {/* Trang Thai MultiSelect */}
          <div className="mobile-filter-item" style={{ width: '260px', minWidth: '220px', flexShrink: 0 }}>
            <MultiSelect
              label="Trạng Thái Hoạt Động"
              values={selectedTrangThai}
              onChange={(vals) => {
                setSelectedTrangThai(vals);
                setPage(1);
              }}
              options={TRANG_THAI_OPTIONS}
              placeholder="Tất Cả Trạng Thái"
              allLabel="Tất Cả Trạng Thái"
            />
          </div>

          {/* Search Input - Highlighted & Expanded */}
          <div className="mobile-filter-item" style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--color-primary-subtle, #FFFBEA)',
                      color: 'var(--color-primary-hover, #D97706)',
                    }}
                  >
                    <Search size={13} strokeWidth={2.5} />
                  </span>
                  <span>Tìm Kiếm Nhanh</span>
                </label>
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{
                      fontSize: '11px',
                      color: '#DC2626',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                    title="Xóa nhanh từ khóa tìm kiếm"
                  >
                    <X size={12} />
                    Xóa tìm kiếm
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    color: search ? 'var(--color-primary-hover, #D97706)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    pointerEvents: 'none',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <Search size={16} strokeWidth={2.2} />
                </span>
                <input
                  type="text"
                  placeholder="Nhập tên nhà hàng, mã SAP, RK7, Oracle, IP, địa chỉ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: search ? '0 36px 0 38px' : '0 14px 0 38px',
                    backgroundColor: '#FFFDF5',
                    color: 'var(--text-primary)',
                    border: '2px solid var(--color-primary, #F5B800)',
                    borderRadius: 'var(--radius-md, 8px)',
                    outline: 'none',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    boxShadow: '0 0 0 3px rgba(245, 184, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(245, 184, 0, 0.28), 0 2px 6px rgba(245, 184, 0, 0.15)';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245, 184, 0, 0.16), 0 1px 3px rgba(0, 0, 0, 0.05)';
                    e.currentTarget.style.backgroundColor = '#FFFDF5';
                  }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                      padding: 0,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#E2E8F0';
                      e.currentTarget.style.color = '#1E293B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1F5F9';
                      e.currentTarget.style.color = '#64748B';
                    }}
                    title="Xóa tìm kiếm"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert type="error" message={error} />
      )}

      {/* Main Table Card */}
      <Card style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }} className="mobile-table-card">
        {/* Mobile horizontal swipe indicator */}
        <div className="mobile-swipe-hint">
          <span>👉 Vuốt ngang bảng để xem đủ các cột: IP LAN, SĐT, Email, Trạng thái...</span>
        </div>

        {/* Thanh cuộn ngang ở trên (Đồng bộ với bảng dữ liệu) */}
        {showTopScroll && (
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
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
            title="Kéo để cuộn ngang danh sách nhà hàng"
          >
            <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
          </div>
        )}

        <div
          ref={bottomScrollRef}
          onScroll={handleBottomScroll}
          className="table-responsive-container"
          style={{
            overflowX: 'auto',
            overflowY: 'auto',
            flex: 1,
            minHeight: 0,
            width: '100%',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <table
            ref={tableRef}
            style={{
              width: '100%',
              minWidth: '1220px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                }}
              >
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '50px', textAlign: 'center' }}>VNC</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '90px' }}>Mã SAP</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '80px' }}>RK7</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', minWidth: '180px' }}>Tên Nhà Hàng</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '135px' }}>IP LAN</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '110px' }}>Cost Center</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '130px' }}>Số Điện Thoại</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '190px' }}>Email Nhà Hàng</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '85px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', width: '60px', textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}
                  >
                    Đang tải dữ liệu nhà hàng...
                  </td>
                </tr>
              ) : restaurants.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}
                  >
                    Không tìm thấy nhà hàng nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                restaurants.map((r) => {
                  const isCopied = copiedId === r.id;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        setSelectedRestaurant(r);
                        setDetailModalOpen(true);
                      }}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'background-color var(--transition-fast)',
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      {/* VNC */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const enabled = isVncEnabled(r);
                          return (
                            <button
                              type="button"
                              onClick={(e) => enabled && handleOpenVnc(e, r)}
                              disabled={!enabled}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: enabled ? '#1a73e8' : '#d1d5db',
                                color: '#fff',
                                cursor: enabled ? 'pointer' : 'default',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: enabled ? 1 : 0.5,
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              }}
                              title={enabled ? `Kết nối VNC/KDS — ${r.res}` : 'Không khả dụng'}
                              onMouseEnter={(e) => { if (enabled) { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(26,115,232,0.4)'; }}}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                              <Monitor size={15} />
                            </button>
                          );
                        })()}
                      </td>

                      {/* Mã SAP */}
                      <td
                        style={{
                          padding: '12px 14px',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {r.sap?.includes('cần bổ sung mã đúng') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>
                              {r.sap.replace(/\s*\(cần bổ sung mã đúng\)/i, '')}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                                fontWeight: 600,
                              }}
                              title={r.sap}
                            >
                              ⚠️ Cần bổ sung mã đúng
                            </span>
                          </div>
                        ) : (
                          r.sap || '—'
                        )}
                      </td>

                      {/* Mã RK7 */}
                      <td
                        style={{
                          padding: '12px 14px',
                          fontFamily: 'monospace',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {r.rk7?.includes('cần bổ sung mã đúng') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>
                              {r.rk7.replace(/\s*\(cần bổ sung mã đúng\)/i, '')}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                                fontWeight: 600,
                              }}
                              title={r.rk7}
                            >
                              ⚠️ Cần bổ sung mã đúng
                            </span>
                          </div>
                        ) : (
                          r.rk7 || '—'
                        )}
                      </td>

                      {/* Tên Nhà Hàng */}
                      <td style={{ padding: '12px 14px' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {r.res || 'Chưa đặt tên'}
                        </div>
                        {r.address && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              maxWidth: '250px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={r.address}
                          >
                            {r.address}
                          </div>
                        )}
                      </td>

                      {/* IP LAN */}
                      <td style={{ padding: '12px 14px' }}>
                        {r.ip ? (
                          <button
                            type="button"
                            onClick={(e) => handleCopyIp(e, r.ip!, r.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: isCopied ? '#ECFDF5' : 'var(--bg-secondary)',
                              padding: '3px 9px',
                              borderRadius: 'var(--radius-sm)',
                              border: `1px solid ${isCopied ? '#10B981' : 'var(--border-color)'}`,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              if (!isCopied) {
                                e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isCopied) {
                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                              }
                            }}
                            title={isCopied ? 'Đã sao chép IP!' : 'Nhấp vào ô để sao chép IP'}
                          >
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '13px', color: isCopied ? '#059669' : 'var(--text-primary)' }}>
                              {r.ip}
                            </span>
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                color: isCopied ? '#10B981' : 'var(--text-muted)',
                              }}
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            </span>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Cost Center */}
                      <td
                        style={{
                          padding: '12px 14px',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {r.coscenter?.includes('cần bổ sung mã đúng') ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>
                              {r.coscenter.replace(/\s*\(cần bổ sung mã đúng\)/i, '')}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                color: '#b45309',
                                backgroundColor: '#fef3c7',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #fde68a',
                                width: 'fit-content',
                                fontWeight: 600,
                              }}
                              title={r.coscenter}
                            >
                              ⚠️ Cần bổ sung mã đúng
                            </span>
                          </div>
                        ) : (
                          r.coscenter || '—'
                        )}
                      </td>

                      {/* Số Điện Thoại */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {r.sdt_nh ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                            }}
                          >
                            <Phone size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span>{r.sdt_nh}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Email Nhà Hàng */}
                      <td style={{ padding: '12px 14px' }}>
                        {r.email ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              maxWidth: '220px',
                            }}
                            title={r.email}
                          >
                            <Mail size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {r.email}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Trạng Thái */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {r.status && r.status.trim().toUpperCase() === 'OFF' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              border: '1px solid #fca5a5',
                            }}
                            title="Đã đánh dấu ngừng hoạt động (OFF)"
                          >
                            ĐÃ ẨN (OFF)
                          </span>
                        ) : (
                          (() => {
                            const s = (r.trangthai || 'ON').trim().toUpperCase();
                            if (s === 'ON') {
                              return <Badge variant="success">ON</Badge>;
                            }
                            if (s === 'NEW') {
                              return <Badge variant="info">NEW</Badge>;
                            }
                            return <Badge variant="danger">OFF</Badge>;
                          })()
                        )}
                      </td>

                      {/* Thao Tác */}
                      <td
                        style={{
                          padding: '12px 14px',
                          textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRestaurant(r);
                              setFormModalOpen(true);
                            }}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Chỉnh sửa thông tin nhà hàng"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          className="mobile-pagination-container"
          style={{
            padding: '8px 16px',
            flexShrink: 0,
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
            <span>
              | Tổng cộng <strong>{total}</strong> nhà hàng
              {total > 0 && ` (Trang ${page}/${totalPages})`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ChevronLeft size={15} />}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </Button>

            <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>
              {page} / {totalPages}
            </span>

            <Button
              variant="secondary"
              size="sm"
              rightIcon={<ChevronRight size={15} />}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>

      {/* Restaurant Detail Modal */}
      <RestaurantDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        restaurant={selectedRestaurant}
        onEdit={(rest) => {
          setEditingRestaurant(rest);
          setFormModalOpen(true);
        }}
        canEdit={true}
      />

      {/* Restaurant Form Modal (Create / Edit) */}
      <RestaurantFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        restaurant={editingRestaurant}
        regionOptions={regions}
        brandOptions={brands}
        onSaved={() => {
          fetchRestaurants();
        }}
      />

      {/* Brand & Region Management Modal (Admin / Extended permission) */}
      {canManageBrandRegion && (
        <BrandRegionModal
          isOpen={brandRegionModalOpen}
          onClose={() => setBrandRegionModalOpen(false)}
          onUpdated={() => {
            fetchOptions();
          }}
        />
      )}

      {/* VNC/KDS Connection Modal */}
      <VncKdsModal
        isOpen={vncModalOpen}
        onClose={handleCloseVncModal}
        restaurantName={vncRestaurantName}
        ipPrefix={vncIpPrefix}
      />



      {/* VNC/KDS Setup Guide Modal */}
      <VncSetupModal
        isOpen={vncSetupOpen}
        onClose={() => setVncSetupOpen(false)}
      />

      {/* Restaurant Audit Logs Modal */}
      <RestaurantAuditLogsModal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
      />

      {/* Modal Thông Báo Nhiệm Vụ Đầu Ngày (User App, dung.nguyenanh & Super Admin) */}
      <DailyPendingTasksModal
        isOpen={showDailyPopup}
        onClose={handleCloseDailyPopup}
        summary={pendingSummary}
        userName={user?.username}
        fullName={user?.full_name}
        isPrivilegedUser={isDungOrSuperAdmin || isSuperAdmin}
        onNavigate={(path) => navigate(path)}
      />
      {/* Modal Phiên Bản Phần Mềm Hệ Thống (KDS, CO, SO, GPOS-CO-SO, GPOS KDS) */}
      <RestaurantSoftwareVersionsModal
        isOpen={softwareVersionsModalOpen}
        onClose={() => setSoftwareVersionsModalOpen(false)}
      />
    </div>
  );
};
