import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Mail,
  Key,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  Phone,
  MapPin,
  LogOut,
  Monitor,
  RefreshCw,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRestaurants } from '../../services/restaurantService';
import { RestaurantItem } from '../../types/restaurant';
import { KdsRoleUserModal } from '../app/KdsQuayModals';
import { RestaurantDetailModal } from '../../components/restaurants/RestaurantDetailModal';
import { Modal } from '../../components/ui/Modal';
import { copyToClipboard } from '../../utils/clipboard';

export const MobileRestaurantPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Expanded card state: set of restaurant IDs
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Quick Action popup state
  const [quickActionsRestaurant, setQuickActionsRestaurant] = useState<RestaurantItem | null>(null);

  // Copied feedback: map of fieldKey -> boolean
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // KDS Role User Modal state
  const [kdsModalOpen, setKdsModalOpen] = useState<boolean>(false);
  const [selectedKdsRestaurant, setSelectedKdsRestaurant] = useState<RestaurantItem | null>(null);

  // Full Restaurant Detail Modal state
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedDetailRestaurant, setSelectedDetailRestaurant] = useState<RestaurantItem | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const toastTimeoutRef = useRef<any>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ msg, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Execute search when debounced search term changes
  useEffect(() => {
    if (!debouncedSearch) {
      setRestaurants([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setHasSearched(true);

    getRestaurants({
      search: debouncedSearch,
      page_size: 30,
      page: 1,
    })
      .then((res) => {
        if (isMounted) {
          setRestaurants(res.items || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          showToast('Lỗi khi tra cứu nhà hàng: ' + (err.message || 'Không có phản hồi'), 'error');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch]);

  // Toggle card expansion
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Copy text to clipboard with toast
  const handleCopy = (text: string | null | undefined, key: string, label: string) => {
    if (!text) {
      showToast(`Không có ${label} để sao chép!`, 'info');
      return;
    }
    copyToClipboard(text);
    setCopiedKey(key);
    showToast(`Đã sao chép ${label}!`, 'success');
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Open KDS config modal
  const handleOpenKdsModal = (res: RestaurantItem) => {
    setSelectedKdsRestaurant(res);
    setKdsModalOpen(true);
  };

  // Permission helpers
  const perms = user?.permissions || {};
  const isSuperAdmin = !!user?.is_super_admin || (user?.username || '').toLowerCase() === 'admin' || (user?.username || '').toLowerCase() === 'dung.nguyenanh' || user?.phanquyen === '0';
  const isAdmin = isSuperAdmin || user?.phanquyen === '1' || (user?.roles || []).includes('admin');

  const canViewPassOu = isSuperAdmin || isAdmin || Boolean(perms['view_sys'] || perms['view_pass_ou_ko_sys'] || perms['pass_ou_ko_sys']);
  const canViewCostCenter = isSuperAdmin || isAdmin || Boolean(perms['view_coscenter'] || perms['coscenter']);
  const canViewIpLan = isSuperAdmin || isAdmin || Boolean(perms['view_ip_lan'] || perms['view_ip'] || perms['ip']);
  const canViewIpWan = isSuperAdmin || isAdmin || Boolean(perms['view_ipwan'] || perms['ipwan']);
  const canViewFtth = isSuperAdmin || isAdmin || Boolean(perms['view_ftth'] || perms['ftth']);
  const canViewRemote = isSuperAdmin || isAdmin || Boolean(perms['view_teamview_pc'] || perms['view_teamview_pos11'] || perms['view_rustdesk_pos11']);

  // Format subnet (e.g. 10.8.160.11 -> 10.8.160)
  const getSubnet = (ip?: string | null): string => {
    if (!ip) return '';
    const match = ip.trim().match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : '';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. HEADER DÀNH RIÊNG CHO MOBILE PORTAL */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: '#1E293B',
          borderBottom: '1px solid #334155',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '14px',
              boxShadow: '0 2px 4px rgba(217,119,6,0.3)',
            }}
          >
            G
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '14px', color: '#F8FAFC' }}>
                Golden Gate
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Mobile
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>
              {user?.full_name || user?.username} ({user?.role_name || 'Nhân viên'})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Nút chuyển sang Web Desktop */}
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem('prefer_desktop', 'true');
              navigate('/restaurants');
            }}
            title="Chuyển sang giao diện Web Desktop"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#334155',
              color: '#E2E8F0',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              touchAction: 'manipulation',
              minHeight: '34px',
            }}
          >
            <Monitor size={14} color="#38BDF8" />
            <span>Desktop</span>
          </button>

          {/* Nút Đăng Xuất */}
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất khỏi hệ thống"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#7F1D1D',
              color: '#FCA5A5',
              border: '1px solid #991B1B',
              borderRadius: '6px',
              width: '34px',
              height: '34px',
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. Ô SEARCH DUY NHẤT (TỐI GIẢN THEO YÊU CẦU) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'sticky',
          top: '53px',
          zIndex: 30,
          backgroundColor: '#0F172A',
          padding: '12px 14px 10px 14px',
          borderBottom: '1px solid #1E293B',
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {loading ? (
              <RefreshCw size={18} className="animate-spin" color="#38BDF8" />
            ) : (
              <Search size={18} />
            )}
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã SAP, tên nhà hàng, IP, RK7..."
            autoFocus
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '12px 38px 12px 38px',
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1.5px solid #334155',
              borderRadius: '10px',
              fontSize: '15px',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#0284C7';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#334155';
            }}
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3. NỘI DUNG CHÍNH: KẾT QUẢ TÌM KIẾM THEO CHIỀU DỌC */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          padding: '12px 14px 40px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* TRẠNG THÁI CHƯA TÌM KIẾM (TỐI GIẢN - KHÔNG HIỆN TRƯỚC NHÀ HÀNG) */}
        {!hasSearched && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '48px 16px',
              gap: '12px',
              color: '#64748B',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38BDF8',
              }}
            >
              <Search size={28} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#E2E8F0' }}>
              Tra Cứu Nhanh Nhà Hàng
            </div>
            <div style={{ fontSize: '12.5px', color: '#94A3B8', maxWidth: '300px', lineHeight: '1.5' }}>
              Vui lòng nhập mã SAP, tên nhà hàng, IP hoặc mã RK7 vào ô tìm kiếm ở trên để xem thông tin và cấu hình KDS.
            </div>
          </div>
        )}

        {/* TRẠNG THÁI ĐANG TÌM KIẾM */}
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '30px 16px',
              fontSize: '13px',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={16} className="animate-spin" />
            <span>Đang tra cứu dữ liệu...</span>
          </div>
        )}

        {/* TRẠNG THÁI KHÔNG TÌM THẤY KẾT QUẢ */}
        {hasSearched && !loading && restaurants.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 16px',
              backgroundColor: '#1E293B',
              borderRadius: '12px',
              border: '1px dashed #334155',
              color: '#94A3B8',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Info size={28} color="#F59E0B" />
            <div style={{ fontWeight: 600, color: '#F1F5F9' }}>
              Không tìm thấy nhà hàng nào
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>
              Không có kết quả phù hợp với từ khóa "{debouncedSearch}". Vui lòng thử lại với từ khóa khác.
            </div>
          </div>
        )}

        {/* DANH SÁCH NHÀ HÀNG THEO CHIỀU DỌC (ƯU TIÊN 4 DÒNG CHÍNH) */}
        {restaurants.map((item) => {
          const isExpanded = expandedIds.has(item.id);
          const subnet = getSubnet(item.ip);
          const passOuValue = item.pass_ou_ko_sys || item.sys_sales;

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#1E293B',
                borderRadius: '12px',
                border: '1.5px solid #334155',
                padding: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                position: 'relative',
              }}
            >
              {/* ───────────────────────────────────────────────────────── */}
              {/* DÒNG 1: TÊN NHÀ HÀNG : 5096 Ashima Forest Thiso Mai Chí Thọ (RK7: 1013) 10.8.160.x */}
              {/* ───────────────────────────────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                  Tên Nhà Hàng :
                </div>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 800,
                    color: '#F8FAFC',
                    lineHeight: '1.35',
                  }}
                >
                  {item.sap ? (
                    <span
                      style={{
                        backgroundColor: '#D97706',
                        color: '#FFFFFF',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        marginRight: '6px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {item.sap}
                    </span>
                  ) : null}
                  <span>{item.res || 'Chưa cập nhật tên'}</span>
                  {item.rk7 ? (
                    <span
                      style={{
                        color: '#38BDF8',
                        fontSize: '12px',
                        fontWeight: 700,
                        marginLeft: '6px',
                      }}
                    >
                      (RK7: {item.rk7})
                    </span>
                  ) : null}
                  {subnet ? (
                    <span
                      style={{
                        backgroundColor: '#0F172A',
                        color: '#34D399',
                        border: '1px solid #065F46',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        marginLeft: '6px',
                      }}
                    >
                      {subnet}.x
                    </span>
                  ) : null}
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────── */}
              {/* DÒNG 2: EMAIL (NHỎ LẠI) */}
              {/* ───────────────────────────────────────────────────────── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#0F172A',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 }}>
                  <Mail size={13} color="#38BDF8" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#94A3B8', flexShrink: 0 }}>Email:</span>
                  <span
                    style={{
                      fontSize: '11.5px',
                      color: item.email ? '#F1F5F9' : '#64748B',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}
                  >
                    {item.email || '—'}
                  </span>
                </div>

                {item.email && (
                  <button
                    type="button"
                    onClick={() => handleCopy(item.email, `email_${item.id}`, 'Email')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedKey === `email_${item.id}` ? '#4ADE80' : '#38BDF8',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      touchAction: 'manipulation',
                    }}
                  >
                    {copiedKey === `email_${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>

              {/* ───────────────────────────────────────────────────────── */}
              {/* DÒNG 3: MẬT KHẨU OU (KHÔNG SYS) - HIỆN TRỰC TIẾP, KHÔNG ẨN */}
              {/* ───────────────────────────────────────────────────────── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#0F172A',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 }}>
                  <Key size={13} color="#F59E0B" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#94A3B8', flexShrink: 0 }}>
                    Mật khẩu OU (Không sys):
                  </span>

                  {!canViewPassOu ? (
                    <span style={{ fontSize: '11px', color: '#EF4444', fontWeight: 600 }}>
                      🔒 Bị ẩn theo phân quyền
                    </span>
                  ) : !passOuValue ? (
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>—</span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        color: '#FDE047',
                        fontWeight: 700,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {passOuValue}
                    </span>
                  )}
                </div>

                {canViewPassOu && passOuValue && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleCopy(passOuValue, `pass_${item.id}`, 'Mật khẩu OU')}
                      title="Sao chép mật khẩu OU"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: copiedKey === `pass_${item.id}` ? '#4ADE80' : '#F59E0B',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {copiedKey === `pass_${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>

              {/* ───────────────────────────────────────────────────────── */}
              {/* DÒNG 4: NÚT XỬ LÝ NHANH (MỞ POPUP CÁC CHỨC NĂNG) */}
              {/* ───────────────────────────────────────────────────────── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '1px' }}>
                <button
                  type="button"
                  onClick={() => setQuickActionsRestaurant(item)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    backgroundColor: '#0284C7',
                    color: '#FFFFFF',
                    border: '1px solid #0369A1',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                    touchAction: 'manipulation',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0369A1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#0284C7';
                  }}
                >
                  <Sliders size={13} />
                  <span>⚡ Xử lý nhanh</span>
                </button>
              </div>

              {/* ───────────────────────────────────────────────────────── */}
              {/* DÒNG 5: XEM CHI TIẾT... (TOGGLE SHOW/HIDE THÔNG TIN CÒN THIẾU) */}
              {/* ───────────────────────────────────────────────────────── */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 0',
                    touchAction: 'manipulation',
                  }}
                >
                  <span>{isExpanded ? 'Thu gọn chi tiết ▲' : 'Xem chi tiết... ▼'}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {/* KHỐI NỘI DUNG MỞ RỘNG (CHỈ SHOW KHI BẤM XEM CHI TIẾT) */}
                {isExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginTop: '10px',
                      padding: '10px',
                      backgroundColor: '#0F172A',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      fontSize: '12px',
                    }}
                  >
                    {/* Mã SAP & RK7 & Cost Center */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <span style={{ color: '#94A3B8' }}>Mã SAP: </span>
                        <strong style={{ color: '#F1F5F9', fontFamily: 'monospace' }}>
                          {item.sap || '—'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8' }}>Mã RK7: </span>
                        <strong style={{ color: '#38BDF8', fontFamily: 'monospace' }}>
                          {item.rk7 || '—'}
                        </strong>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <span style={{ color: '#94A3B8' }}>Cost Center / Oracle: </span>
                        <strong style={{ color: '#F1F5F9', fontFamily: 'monospace' }}>
                          {!canViewCostCenter ? '🔒 Bị ẩn theo phân quyền' : item.coscenter || item.oracale || '—'}
                        </strong>
                      </div>
                    </div>

                    {/* IP LAN & IP WAN */}
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div>
                          <span style={{ color: '#94A3B8' }}>IP LAN (Máy POS 11): </span>
                          <strong style={{ color: '#34D399', fontFamily: 'monospace' }}>
                            {!canViewIpLan ? '🔒 Bị ẩn theo phân quyền' : item.ip || '—'}
                          </strong>
                        </div>
                        {canViewIpLan && item.ip && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.ip, `ip_${item.id}`, 'IP LAN')}
                            style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', padding: '2px' }}
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{ color: '#94A3B8' }}>IP WAN: </span>
                          <strong style={{ color: '#A78BFA', fontFamily: 'monospace' }}>
                            {!canViewIpWan ? '🔒 Bị ẩn theo phân quyền' : item.ip_wan || '—'}
                          </strong>
                        </div>
                        {canViewIpWan && item.ip_wan && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.ip_wan, `ipwan_${item.id}`, 'IP WAN')}
                            style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer', padding: '2px' }}
                          >
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Remote TeamViewer / RustDesk */}
                    {canViewRemote && (
                      <div style={{ borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                        <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: '2px' }}>
                          Remote Máy Trạm:
                        </div>
                        {item.teamview_pos11 || item.rustdesk_pos11 ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#E2E8F0', fontSize: '11.5px' }}>
                              POS 11: TV {item.teamview_pos11 || '—'} | Rust {item.rustdesk_pos11 || '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.rustdesk_pos11 || item.teamview_pos11, `pos11_${item.id}`, 'Remote POS 11')}
                              style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer' }}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : null}

                        {item.teamview_pos12 || item.rustdesk_pos12 ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#E2E8F0', fontSize: '11.5px' }}>
                              POS 12: TV {item.teamview_pos12 || '—'} | Rust {item.rustdesk_pos12 || '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.rustdesk_pos12 || item.teamview_pos12, `pos12_${item.id}`, 'Remote POS 12')}
                              style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer' }}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : null}

                        {item.teamview_pc ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#E2E8F0', fontSize: '11.5px' }}>
                              PC Quản Lý: TV {item.teamview_pc}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(item.teamview_pc, `pc_${item.id}`, 'Remote PC Quản Lý')}
                              style={{ background: 'none', border: 'none', color: '#38BDF8', cursor: 'pointer' }}
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* FTTH */}
                    <div style={{ borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                      <span style={{ color: '#94A3B8' }}>Hạ tầng FTTH: </span>
                      <strong style={{ color: '#FDE047' }}>
                        {!canViewFtth
                          ? '🔒 Bị ẩn theo phân quyền'
                          : `${item.user_ftth || '—'} / ${item.pass_ftth || '—'}`}
                      </strong>
                    </div>

                    {/* Số điện thoại & Địa chỉ */}
                    {(item.sdt_nh || item.address) && (
                      <div style={{ borderTop: '1px dashed #334155', paddingTop: '6px' }}>
                        {item.sdt_nh && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <Phone size={12} color="#4ADE80" />
                            <a
                              href={`tel:${item.sdt_nh}`}
                              style={{ color: '#4ADE80', fontWeight: 600, textDecoration: 'none' }}
                            >
                              {item.sdt_nh} (Bấm gọi)
                            </a>
                          </div>
                        )}
                        {item.address && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#94A3B8', fontSize: '11.5px' }}>
                            <MapPin size={12} color="#94A3B8" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{item.address}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nút mở xem toàn bộ chi tiết chuyên sâu */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDetailRestaurant(item);
                        setDetailModalOpen(true);
                      }}
                      style={{
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px',
                        borderRadius: '6px',
                        backgroundColor: '#334155',
                        color: '#E2E8F0',
                        border: '1px solid #475569',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                      }}
                    >
                      <ExternalLink size={13} color="#38BDF8" />
                      <span>Xem toàn bộ thông tin chi tiết nhà hàng ➔</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. MODAL POPUP: TÍNH NĂNG XỬ LÝ NHANH CHO NHÀ HÀNG */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {quickActionsRestaurant && (
        <Modal
          isOpen={!!quickActionsRestaurant}
          onClose={() => setQuickActionsRestaurant(null)}
          title={`⚡ Xử Lý Nhanh: ${quickActionsRestaurant.sap || ''} ${quickActionsRestaurant.res}`}
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '2px' }}>
              Chọn nghiệp vụ xử lý nhanh cho nhà hàng này:
            </div>

            {/* Chức năng 1: Cấu hình KDS & Phân quyền */}
            <button
              type="button"
              onClick={() => {
                const target = quickActionsRestaurant;
                setQuickActionsRestaurant(null);
                handleOpenKdsModal(target);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: '#F0F9FF',
                border: '1.5px solid #0284C7',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#0284C7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sliders size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#0369A1', fontWeight: 800, fontSize: '12px' }}>
                  ⚡ Cấu Hình Phân Quyền &amp; Bật / Tắt KDS Toàn Nhà Hàng
                </div>
                <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
                  Bật/tắt KDS master, tắt hết món không cho ẩn, phân quyền nhân viên
                </div>
              </div>
            </button>

            {/* Chức năng 2: Xem chi tiết toàn bộ hồ sơ nhà hàng */}
            <button
              type="button"
              onClick={() => {
                const target = quickActionsRestaurant;
                setQuickActionsRestaurant(null);
                setSelectedDetailRestaurant(target);
                setDetailModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ width: '30px', height: '30px', borderRadius: '6px', backgroundColor: '#475569', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ExternalLink size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#1E293B', fontWeight: 700, fontSize: '12px' }}>
                  Xem Chi Tiết Đầy Đủ Nhà Hàng
                </div>
                <div style={{ color: '#64748B', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>
                  IP LAN/WAN, FTTH, TeamViewer, RustDesk, Cost Center...
                </div>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 5. MODAL CẤU HÌNH PHÂN QUYỀN & BẬT/TẮT KDS TOÀN NHÀ HÀNG */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedKdsRestaurant && (
        <KdsRoleUserModal
          isOpen={kdsModalOpen}
          onClose={() => {
            setKdsModalOpen(false);
            setSelectedKdsRestaurant(null);
          }}
          host={selectedKdsRestaurant.ip || ''}
          restaurantId={selectedKdsRestaurant.id}
          port={27017}
          restaurantCode={selectedKdsRestaurant.rk7 || selectedKdsRestaurant.sap || ''}
          paramCode="ROLE_SETUP_CONFIG_COOKING"
          title={`Cấu Hình KDS: ${selectedKdsRestaurant.sap || ''} ${selectedKdsRestaurant.res || ''}`}
          showToast={showToast}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 5. MODAL CHI TIẾT NHÀ HÀNG ĐẦY ĐỦ */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {selectedDetailRestaurant && (
        <RestaurantDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedDetailRestaurant(null);
          }}
          restaurant={selectedDetailRestaurant}
          canEdit={false}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 6. TOAST PHẢN HỒI NHANH */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor:
              toast.type === 'success'
                ? '#15803D'
                : toast.type === 'error'
                ? '#DC2626'
                : '#0284C7',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '25px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            maxWidth: '90%',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toast.type === 'success' ? <Check size={16} /> : <Info size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

export default MobileRestaurantPage;
