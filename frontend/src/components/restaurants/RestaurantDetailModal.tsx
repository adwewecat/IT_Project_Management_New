import React, { useState, useEffect, startTransition } from 'react';
import {
  Store,
  Network,
  Wifi,
  Copy,
  Check,
  Edit2,
  Clock,
  Monitor,
  AlertTriangle,
  AlertCircle,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RestaurantItem } from '../../types/restaurant';
import { IncidentItem } from '../../types/incident';
import { incidentService } from '../../services/incidentService';
import { mongoService, MongoConnectionCheckResponse } from '../../services/mongoService';
import { VncKdsModal } from './VncKdsModal';
import { CreateIncidentModal } from '../incidents/CreateIncidentModal';
import { IncidentDetailModal } from '../incidents/IncidentDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import { copyToClipboard } from '../../utils/clipboard';
import { checkIsSuperAdmin, checkIsAdmin, checkIsAppRole } from '../../utils/authUtils';

interface RestaurantDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: RestaurantItem | null;
  onEdit?: (restaurant: RestaurantItem) => void;
  canEdit?: boolean;
}

export const RestaurantDetailModal: React.FC<RestaurantDetailModalProps> = ({
  isOpen,
  onClose,
  restaurant,
  onEdit,
  canEdit = true,
}) => {
  const { user } = useAuth();
  const canAccessMongo = checkIsAppRole(user) || checkIsAdmin(user) || checkIsSuperAdmin(user);
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [vncDetailOpen, setVncDetailOpen] = useState(false);
  const [createIncidentOpen, setCreateIncidentOpen] = useState(false);

  // MongoDB checking state
  const [isCheckingMongo, setIsCheckingMongo] = useState(false);
  const [mongoModalOpen, setMongoModalOpen] = useState(false);
  const [mongoCheckResult, setMongoCheckResult] = useState<MongoConnectionCheckResponse | null>(null);
  const [mongoCheckError, setMongoCheckError] = useState<string | null>(null);
  const [selectedMongoHost, setSelectedMongoHost] = useState<string>('');

  const handleCheckMongo = async () => {
    if (!restaurant) return;
    setIsCheckingMongo(true);
    setMongoModalOpen(true);
    setMongoCheckResult(null);
    setMongoCheckError(null);
    setSelectedMongoHost('');
    try {
      const res = await mongoService.checkConnection(restaurant.id, restaurant.ip);
      setMongoCheckResult(res);
      const openIps = (res.candidates || []).filter(c => c.status === 'OPEN').map(c => c.ip);
      if (openIps.length > 0) {
        setSelectedMongoHost(openIps[0]);
      }
      if (!res.is_connected) {
        setMongoCheckError(
          res.error_message ||
            'Nhà hàng chưa mở POS hoặc chưa được cài MongoDB hoặc chưa cài file bin kết nối IP, Vui lòng check lại cho Nhà này'
        );
      }
    } catch (err: any) {
      setMongoCheckError(
        'Không thể thực hiện kiểm tra kết nối: ' + (err.response?.data?.detail || err.message)
      );
    } finally {
      setIsCheckingMongo(false);
    }
  };

  const [pendingIncidents, setPendingIncidents] = useState<IncidentItem[]>([]);
  const [showPendingListModal, setShowPendingListModal] = useState(false);
  const [selectedIncidentForDetail, setSelectedIncidentForDetail] = useState<IncidentItem | null>(null);

  // Quyền ghi nhận sự vụ: app, admin, super_admin
  const rawRoles = user?.roles || (user?.phanquyen ? user.phanquyen.split(',').map((s) => s.trim().toLowerCase()) : []);
  const isSuperAdmin = !!user?.is_super_admin || user?.username?.toLowerCase() === 'admin' || user?.phanquyen === '0';
  const isAdmin = isSuperAdmin || rawRoles.includes('admin') || rawRoles.includes('1') || user?.phanquyen === '1' || user?.username?.toLowerCase() === 'dung.nguyenanh';
  const isAppRole = isAdmin || rawRoles.includes('app') || rawRoles.includes('2') || user?.phanquyen === '2';
  const canRecordIncident = isAppRole || isAdmin || isSuperAdmin;

  const loadPendingIncidents = async () => {
    if (!restaurant?.id || !canRecordIncident) return;
    try {
      const data = await incidentService.getIncidents({
        tab: 'pending',
        restaurant_id: restaurant.id,
      });
      setPendingIncidents(data.items);
    } catch (err) {
      console.error('Failed to load restaurant incidents', err);
    }
  };

  useEffect(() => {
    if (isOpen && restaurant?.id && canRecordIncident) {
      // Dùng startTransition để modal render ngay lập tức,
      // sau đó mới load incidents như 1 low-priority update
      startTransition(() => {
        loadPendingIncidents();
      });
    } else {
      setPendingIncidents([]);
    }
  }, [isOpen, restaurant?.id, canRecordIncident]);

  if (!restaurant) return null;

  // Định dạng chuỗi thông tin vắn tắt theo công thức: Mã SAP + Tên nhà hàng + (Mã RK7) + (IP)
  // Ví dụ: 4389 Ashima Tú Xương (RK7: 35) 10.8.46.1
  const restaurantSummaryParts: string[] = [];
  if (restaurant.sap && restaurant.sap.trim()) restaurantSummaryParts.push(restaurant.sap.trim());
  if (restaurant.res && restaurant.res.trim()) restaurantSummaryParts.push(restaurant.res.trim());
  if (restaurant.rk7 && restaurant.rk7.trim()) {
    restaurantSummaryParts.push(`(RK7: ${restaurant.rk7.trim()})`);
  }
  if (restaurant.ip && restaurant.ip.trim()) restaurantSummaryParts.push(restaurant.ip.trim());
  const restaurantSummary = restaurantSummaryParts.join(' ');

  const handleCopy = async (text: string, key: string) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const formatDisplayDate = (d: string | null | undefined): string => {
    if (!d) return '—';
    const clean = d.trim();
    if (!clean || clean === '—') return '—';
    const [datePart, timePart] = clean.includes('T') ? clean.split('T') : clean.split(' ');
    let formattedDate = datePart;
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, day] = datePart.split('-');
      formattedDate = `${day}/${m}/${y}`;
    }
    if (timePart && !timePart.startsWith('00:00:00')) {
      return `${formattedDate} ${timePart.slice(0, 5)}`;
    }
    return formattedDate;
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid var(--border-color)',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
    width: '100%',
    overflow: 'hidden',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    minWidth: 0,
  };

  const copyableBoxStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-primary)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-color)',
    minWidth: 0,
    boxSizing: 'border-box',
    width: '100%',
    overflow: 'hidden',
  };

  // Ánh xạ quyền xem theo cột DB
  const VIEW_PERMISSION_MAP: Record<string, string[]> = {
    res: ['view_res'],
    trangthai: ['view_trangthai'],
    status: ['view_status'],
    sap: ['view_sap'],
    rk7: ['view_rk7'],
    ip: ['view_ip_lan', 'view_ip'],
    ip_wan: ['view_ipwan', 'view_ip_wan'],
    pass_ou_ko_sys: ['view_pass_ou_ko_sys', 'view_sys'],
    sys_sales: ['view_sys_sales', 'view_sys'],
    user_ftth: ['view_user_ftth', 'view_ftth'],
    pass_ftth: ['view_pass_ftth', 'view_ftth'],
    thanhtoan_ftth: ['view_thanhtoan_ftth', 'view_ftth'],
    ngay_online_ftth: ['view_ngay_online_ftth', 'view_ftth'],
    pass_mail: ['view_pass_mail'],
    code_photo: ['view_code_photo'],
    ext: ['view_ext', 'view_ext_rsc'],
    teamview_pc: ['view_teamview_pc'],
    teamview_pos11: ['view_teamview_pos11'],
    teamview_pos12: ['view_teamview_pos12'],
    rustdesk_pos11: ['view_rustdesk_pos11'],
    rustdesk_pos12: ['view_rustdesk_pos12'],
    sdt_nh: ['view_sdt_nh'],
    email: ['view_email_nh', 'view_email'],
    address: ['view_address'],
    region: ['view_region'],
    brand: ['view_brand'],
    note: ['view_note_nh', 'view_note'],
    ngay_khaitruong: ['view_ngay_khaitruong'],
    coscenter: ['view_coscenter'],
    sap_old: ['view_sap_old'],
    oracale: ['view_oracale'],
    don_gia: ['view_don_gia'],
    dk_truyenthong: ['view_dk_truyenthong'],
  };

  const BASE_COLUMNS = ['res', 'sap', 'rk7', 'coscenter', 'sdt_nh', 'email', 'ip', 'region', 'brand', 'trangthai'];

  const canViewField = (fieldKey: string): boolean => {
    if (isSuperAdmin || isAdmin) return true;
    if (BASE_COLUMNS.includes(fieldKey)) return true;
    if (!user?.permissions) return false;
    const perms = VIEW_PERMISSION_MAP[fieldKey] || [`view_${fieldKey}`];
    return perms.some((p) => !!user.permissions?.[p]);
  };

  const renderCopyableField = (label: string, value: string | null | undefined, key: string, fieldKey?: string) => {
    const k = fieldKey || key;
    const allowed = canViewField(k);

    if (!allowed) {
      return (
        <div style={fieldStyle}>
          <span style={labelStyle}>{label}</span>
          <div
            style={{
              ...copyableBoxStyle,
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
            }}
            title="Tài khoản của bạn không có quyền xem trường này (bị ẩn theo phân quyền)"
          >
            <span style={{ fontSize: '12px', fontStyle: 'italic', display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#9CA3AF' }}>
              <Lock size={12} color="#9CA3AF" /> Bị ẩn theo phân quyền
            </span>
          </div>
        </div>
      );
    }

    if (!value) {
      return (
        <div style={fieldStyle}>
          <span style={labelStyle}>{label}</span>
          <span style={{ ...valueStyle, color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
        </div>
      );
    }

    const isCopied = copiedKey === key;

    return (
      <div style={fieldStyle}>
        <span style={labelStyle}>{label}</span>
        <button
          type="button"
          onClick={() => handleCopy(value, key)}
          style={{
            ...copyableBoxStyle,
            backgroundColor: isCopied ? '#ECFDF5' : 'var(--bg-primary)',
            borderColor: isCopied ? '#10B981' : 'var(--border-color)',
            cursor: 'pointer',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            transition: 'all 0.15s ease',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            if (!isCopied) {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle)';
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isCopied) {
              e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }
          }}
          title={isCopied ? 'Đã sao chép' : `${value} (Nhấp để sao chép)`}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: isCopied ? '#059669' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
              minWidth: 0,
            }}
          >
            {value}
          </span>
          <span style={{ color: isCopied ? '#10B981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '6px' }}>
            {isCopied ? <Check size={14} /> : <Copy size={14} />}
          </span>
        </button>
      </div>
    );
  };

  const renderStandardField = (label: string, value: React.ReactNode, fieldKey?: string) => {
    const allowed = fieldKey ? canViewField(fieldKey) : true;

    if (!allowed) {
      return (
        <div style={fieldStyle}>
          <span style={labelStyle}>{label}</span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#9CA3AF',
              fontSize: '12px',
              fontStyle: 'italic',
              fontWeight: 500,
              backgroundColor: 'var(--bg-secondary)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed var(--border-color)',
              width: 'fit-content'
            }}
            title="Tài khoản của bạn không có quyền xem trường này (bị ẩn theo phân quyền)"
          >
            <Lock size={12} color="#9CA3AF" />
            <span>Bị ẩn theo phân quyền</span>
          </span>
        </div>
      );
    }

    return (
      <div style={fieldStyle}>
        <span style={labelStyle}>{label}</span>
        {value ? (
          typeof value === 'string' ? (
            <span style={valueStyle} title={value}>{value}</span>
          ) : (
            value
          )
        ) : (
          <span style={{ ...valueStyle, color: 'var(--text-muted)', fontWeight: 400 }}>—</span>
        )}
      </div>
    );
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '16px' }}>
          <span>
            Chi Tiết Nhà Hàng:{' '}
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              {restaurantSummary || restaurant.res || 'N/A'}
            </span>
          </span>
          {restaurantSummary && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(restaurantSummary, 'title_summary');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: copiedKey === 'title_summary' ? '#ECFDF5' : 'var(--bg-secondary)',
                border: `1px solid ${copiedKey === 'title_summary' ? '#10B981' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-sm)',
                color: copiedKey === 'title_summary' ? '#059669' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={copiedKey === 'title_summary' ? 'Đã sao chép!' : 'Sao chép thông tin nhà hàng'}
            >
              {copiedKey === 'title_summary' ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === 'title_summary' ? 'Đã chép' : 'Chép'}</span>
            </button>
          )}
        </div>
      }
      maxWidth="860px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {canRecordIncident && (
              <Button
                variant="secondary"
                style={{
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  borderColor: '#FCA5A5',
                  fontWeight: 600,
                }}
                leftIcon={<AlertTriangle size={16} />}
                onClick={() => setCreateIncidentOpen(true)}
              >
                Ghi Nhận Sự Vụ
              </Button>
            )}

            {canRecordIncident && pendingIncidents.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPendingListModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: 'var(--radius-md)',
                  color: '#B45309',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDE68A')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FEF3C7')}
                title="Nhấn để xem danh sách sự vụ chưa xử lý"
              >
                <AlertCircle size={15} color="#D97706" />
                <span>⚠️ Đang có {pendingIncidents.length} sự vụ chưa xử lý</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                leftIcon={<Edit2 size={16} />}
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit(restaurant);
                }}
              >
                Chỉnh Sửa
              </Button>
            )}
          </div>
        </div>
      }

    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Banner Tổng quan */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {restaurantSummary || restaurant.res || 'Chưa đặt tên'}
              </span>
              {restaurantSummary && (
                <button
                  type="button"
                  onClick={() => handleCopy(restaurantSummary, 'banner_summary')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: copiedKey === 'banner_summary' ? '#10B981' : 'var(--text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title={copiedKey === 'banner_summary' ? 'Đã sao chép' : 'Sao chép thông tin vắn tắt'}
                >
                  {copiedKey === 'banner_summary' ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
                </button>
              )}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Mã SAP: <strong>{restaurant.sap || '—'}</strong> | Mã RK7: <strong>{restaurant.rk7 || '—'}</strong> | Cost Center: <strong>{restaurant.coscenter || '—'}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(() => {
              const s = (restaurant.trangthai || 'ON').trim().toUpperCase();
              if (s === 'ON') {
                return <Badge variant="success">Hoạt động (ON)</Badge>;
              }
              if (s === 'NEW') {
                return <Badge variant="info">Nhà hàng mới (NEW)</Badge>;
              }
              return <Badge variant="danger">Ngừng hoạt động (OFF)</Badge>;
            })()}
            {restaurant.brand && <Badge variant="primary">{restaurant.brand}</Badge>}
            {restaurant.region && <Badge variant="neutral">{restaurant.region}</Badge>}

            {/* Nút MongoDB Dò Tìm Kết Nối (Chỉ hiển thị cho Quyền App, Admin, Super Admin) */}
            {canAccessMongo && (
              <button
                type="button"
                onClick={handleCheckMongo}
                disabled={isCheckingMongo}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '1.5px solid #10B981',
                  cursor: isCheckingMongo ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(16, 185, 129, 0.2)',
                }}
                title="Dò tìm và kết nối MongoDB nhà hàng (quét cổng 27017 trên .11, .12, .41)"
              >
                <Database size={13} className={isCheckingMongo ? 'spin-animation' : ''} />
                <span>{isCheckingMongo ? 'Đang dò...' : 'MongoDB'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Thông Tin Chung */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <Store size={16} /> Thông Tin Chung &amp; Liên Hệ
          </div>
          <div style={gridStyle}>
            {renderCopyableField('Mã SAP', restaurant.sap, 'sap', 'sap')}
            {renderCopyableField('Cost Center', restaurant.coscenter, 'coscenter', 'coscenter')}
            {renderCopyableField('Mã RK7', restaurant.rk7, 'rk7', 'rk7')}
            {renderCopyableField('Tên Nhà Hàng', restaurant.res, 'res', 'res')}
            {renderStandardField('Thương hiệu', restaurant.brand, 'brand')}
            {renderStandardField('Khu vực', restaurant.region, 'region')}
            {renderStandardField('Trạng thái hoạt động', (
              <div>
                {(() => {
                  const s = (restaurant.trangthai || 'ON').trim().toUpperCase();
                  if (s === 'ON') return <Badge variant="success">Hoạt động (ON)</Badge>;
                  if (s === 'NEW') return <Badge variant="info">Nhà hàng mới (NEW)</Badge>;
                  return <Badge variant="danger">Ngừng hoạt động (OFF)</Badge>;
                })()}
              </div>
            ), 'trangthai')}
            {renderStandardField('Địa chỉ', restaurant.address, 'address')}
            {renderCopyableField('Số điện thoại NH', restaurant.sdt_nh, 'sdt_nh', 'sdt_nh')}
            {renderCopyableField('Email liên hệ', restaurant.email, 'email', 'email')}
            {renderStandardField('Ngày khai trương', formatDisplayDate(restaurant.ngay_khaitruong), 'ngay_khaitruong')}
            {renderCopyableField('SAP Cũ', restaurant.sap_old, 'sap_old', 'sap_old')}
            {renderCopyableField('Oracle Code', restaurant.oracale, 'oracale', 'oracale')}
            {renderStandardField('Đơn giá', restaurant.don_gia, 'don_gia')}
            {renderStandardField('Ghi chú', restaurant.note, 'note')}
          </div>
        </div>

        {/* 2. Mạng & Điều Khiển Từ Xa (Remote) */}
        <div style={sectionStyle}>
          <div style={{ ...sectionHeaderStyle, justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Network size={16} /> Mạng &amp; Điều Khiển Từ Xa (Remote)
            </span>
            {(() => {
              const ip = restaurant.ip;
              if (!ip) return null;
              const clean = ip.replace(/[^0-9.]/g, '.').replace(/\.+$/, '');
              const parts = clean.split('.');
              const prefix = parts.length >= 3 ? parts.slice(0, 3).join('.') + '.' : '';
              if (!prefix) return null;
              const hasSap = !!restaurant.sap && restaurant.sap.trim().toLowerCase() !== 'khong phai nh';
              const hasRk7 = !!restaurant.rk7 && restaurant.rk7.trim().toLowerCase() !== 'khong phai nh';
              const isOn = !!restaurant.trangthai && ['ON', 'NEW'].includes(restaurant.trangthai.trim().toUpperCase());
              const enabled = hasSap && hasRk7 && isOn;
              return (
                <button
                  type="button"
                  onClick={() => enabled && setVncDetailOpen(true)}
                  disabled={!enabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: enabled ? '#1a73e8' : '#d1d5db',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: enabled ? 'pointer' : 'default',
                    opacity: enabled ? 1 : 0.5,
                  }}
                  title={enabled ? 'Kết nối VNC / KDS' : 'Không khả dụng'}
                >
                  <Monitor size={14} /> VNC / KDS
                </button>
              );
            })()}
          </div>
          <div style={gridStyle}>
            {renderCopyableField('IP LAN', restaurant.ip, 'ip', 'ip')}
            {renderCopyableField('IP WAN', restaurant.ip_wan, 'ip_wan', 'ip_wan')}
            {renderCopyableField('TeamViewer PC', restaurant.teamview_pc, 'teamview_pc', 'teamview_pc')}
            {renderCopyableField('TeamViewer POS 1.1', restaurant.teamview_pos11, 'teamview_pos11', 'teamview_pos11')}
            {renderCopyableField('TeamViewer POS 1.2', restaurant.teamview_pos12, 'teamview_pos12', 'teamview_pos12')}
            {renderCopyableField('RustDesk POS 1.1', restaurant.rustdesk_pos11, 'rustdesk_pos11', 'rustdesk_pos11')}
            {renderCopyableField('RustDesk POS 1.2', restaurant.rustdesk_pos12, 'rustdesk_pos12', 'rustdesk_pos12')}
          </div>
        </div>

        {/* 3. Đường Truyền & Dịch Vụ Văn Phòng */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <Wifi size={16} /> Đường Truyền FTTH &amp; Dịch Vụ Văn Phòng
          </div>
          <div style={gridStyle}>
            {renderCopyableField('Tài khoản FTTH', restaurant.user_ftth, 'user_ftth', 'user_ftth')}
            {renderCopyableField('Mật khẩu FTTH', restaurant.pass_ftth, 'pass_ftth', 'pass_ftth')}
            {renderStandardField('Ngày online FTTH', formatDisplayDate(restaurant.ngay_online_ftth), 'ngay_online_ftth')}
            {renderStandardField('Thanh toán FTTH', restaurant.thanhtoan_ftth, 'thanhtoan_ftth')}
            {renderStandardField('ĐK truyền thông', restaurant.dk_truyenthong, 'dk_truyenthong')}
            {renderCopyableField('Mật khẩu Mail NH', restaurant.pass_mail, 'pass_mail', 'pass_mail')}
            {renderCopyableField('Mật khẩu OU (Không sys)', restaurant.pass_ou_ko_sys, 'pass_ou_ko_sys', 'pass_ou_ko_sys')}
            {renderCopyableField('Số máy lẻ (EXT)', restaurant.ext, 'ext', 'ext')}
            {renderStandardField('Sys Sales', restaurant.sys_sales, 'sys_sales')}
          </div>
        </div>

        {/* 4. Nhật Ký Hệ Thống */}
        <div style={{ ...sectionStyle, marginBottom: 0 }}>
          <div style={sectionHeaderStyle}>
            <Clock size={16} /> Nhật Ký Hệ Thống
          </div>
          <div style={gridStyle}>
            <div style={fieldStyle}>
              <span style={labelStyle}>Người tạo</span>
              <span style={valueStyle}>{restaurant.user_insert || '—'}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Ngày tạo</span>
              <span style={valueStyle}>{formatDisplayDate(restaurant.ngay_insert)}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Người cập nhật cuối</span>
              <span style={valueStyle}>{restaurant.user_update || '—'}</span>
            </div>
            <div style={fieldStyle}>
              <span style={labelStyle}>Ngày cập nhật cuối</span>
              <span style={valueStyle}>{formatDisplayDate(restaurant.ngay_update)}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>

    {/* VNC/KDS Modal (mở từ detail) */}
    {restaurant.ip && (() => {
      const clean = restaurant.ip.replace(/[^0-9.]/g, '.').replace(/\.+$/, '');
      const parts = clean.split('.');
      const prefix = parts.length >= 3 ? parts.slice(0, 3).join('.') + '.' : '';
      return prefix ? (
        <VncKdsModal
          isOpen={vncDetailOpen}
          onClose={() => setVncDetailOpen(false)}
          restaurantName={restaurant.res || 'N/A'}
          ipPrefix={prefix}
        />
      ) : null;
    })()}

    {/* Ghi nhận sự vụ modal */}
    <CreateIncidentModal
      isOpen={createIncidentOpen}
      onClose={() => setCreateIncidentOpen(false)}
      restaurant={restaurant}
      onSuccess={loadPendingIncidents}
    />

    {/* Modal Danh Sách Sự Vụ Chưa Xử Lý Của Nhà Hàng */}
    <Modal
      isOpen={showPendingListModal}
      onClose={() => setShowPendingListModal(false)}
      title={`Sự Vụ Chưa Xử Lý - ${restaurant.res || restaurant.sap}`}
      maxWidth="680px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" onClick={() => setShowPendingListModal(false)}>
            Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '60vh', overflowY: 'auto' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Nhà hàng hiện có <strong>{pendingIncidents.length}</strong> sự vụ chưa hoàn thành. Bấm vào sự vụ để xem chi tiết hoặc cập nhật tiến độ.
        </div>
        {pendingIncidents.map((inc) => (
          <div
            key={inc.id}
            onClick={() => {
              setSelectedIncidentForDetail(inc);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
              fontSize: '12px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>#{inc.id}</span>
                {inc.is_private ? (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 600 }}>
                    🔒 Riêng tư
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', backgroundColor: '#F3F4F6', color: '#4B5563' }}>
                    🌐 Công khai
                  </span>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                {inc.date_insert ? new Date(inc.date_insert).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </div>

            <div style={{ color: 'var(--text-primary)', marginBottom: '6px', lineHeight: 1.4, fontWeight: 500 }}>
              {inc.noidung}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
              <span>Người tạo: <strong>{inc.user_insert || '—'}</strong></span>
              <span>Người xử lý: <strong style={{ color: inc.assigned_to ? 'var(--color-primary)' : 'inherit' }}>{inc.assigned_name || inc.assigned_to || 'Chưa phân công'}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </Modal>

    {/* Modal xem chi tiết sự vụ từ popup */}
    {selectedIncidentForDetail && (
      <IncidentDetailModal
        isOpen={!!selectedIncidentForDetail}
        onClose={() => setSelectedIncidentForDetail(null)}
        incident={selectedIncidentForDetail}
        onUpdated={() => {
          loadPendingIncidents();
          if (selectedIncidentForDetail) {
            incidentService.getIncidentDetail(selectedIncidentForDetail.id).then((fresh) => {
              setSelectedIncidentForDetail(fresh);
            });
          }
        }}
      />
    )}

    {/* Modal Dò Tìm & Kiểm Tra Kết Nối MongoDB */}
    {mongoModalOpen && (
      <Modal
        isOpen={mongoModalOpen}
        onClose={() => setMongoModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Kiểm Tra Kết Nối MongoDB Nhà Hàng</span>
          </div>
        }
        maxWidth="540px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckMongo}
              isLoading={isCheckingMongo}
              leftIcon={<RefreshCw size={14} />}
            >
              Dò lại
            </Button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" size="sm" onClick={() => setMongoModalOpen(false)}>
                Đóng
              </Button>
              {mongoCheckResult?.is_connected && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ExternalLink size={14} />}
                  onClick={() => {
                    const chosenHost = selectedMongoHost || mongoCheckResult.connected_ip;
                    setMongoModalOpen(false);
                    onClose();
                    navigate(`/app/restaurant-mongodb?restaurantId=${restaurant?.id}&host=${chosenHost}`);
                  }}
                >
                  Vào Quản Lý MongoDB ({selectedMongoHost || mongoCheckResult.connected_ip})
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {restaurant?.res}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Mã SAP: <strong>{restaurant?.sap || '—'}</strong> | Dải mạng Subnet:{' '}
              <strong style={{ fontFamily: 'monospace' }}>
                {mongoCheckResult?.subnet ? `${mongoCheckResult.subnet}x` : restaurant?.ip ? `${restaurant.ip.split('.').slice(0, 3).join('.')}.x` : '—'}
              </strong>
            </div>
          </div>

          {/* Loading state */}
          {isCheckingMongo && (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <RefreshCw size={28} className="spin-animation" style={{ color: 'var(--color-primary)', margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                Đang dò tìm MongoDB trên các địa chỉ IP (.11, .12, .41)...
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Kiểm tra cổng TCP 27017
              </div>
            </div>
          )}

          {/* Prompt when multiple MongoDB servers are open */}
          {!isCheckingMongo && mongoCheckResult && mongoCheckResult.candidates.filter(c => c.status === 'OPEN').length > 1 && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FFFBEA',
                border: '1.5px solid #FCD34D',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: '#92400E' }}>
                <strong>Phát hiện {mongoCheckResult.candidates.filter(c => c.status === 'OPEN').length} máy chủ MongoDB đang mở!</strong> Vui lòng click chọn IP máy bạn muốn kết nối bên dưới:
              </div>
            </div>
          )}

          {/* Result list */}
          {!isCheckingMongo && mongoCheckResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                KẾT QUẢ QUÉT CỔNG PORT 27017:
              </div>
              {mongoCheckResult.candidates.map((c) => {
                const isOpen = c.status === 'OPEN';
                const isSelected = isOpen && selectedMongoHost === c.ip;
                const machineLabel = c.ip.endsWith('.11') ? 'Máy Thu Ngân 11' : c.ip.endsWith('.12') ? 'Máy Thu Ngân 12' : c.ip.endsWith('.41') ? 'Máy PC Quản Lý 41' : 'Máy POS';

                return (
                  <div
                    key={c.ip}
                    onClick={() => {
                      if (isOpen) setSelectedMongoHost(c.ip);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--color-primary)' : `1.5px solid ${isOpen ? '#A7F3D0' : '#E5E7EB'}`,
                      backgroundColor: isSelected ? '#FFFBEA' : (isOpen ? '#ECFDF5' : '#F9FAFB'),
                      cursor: isOpen ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 8px rgba(245, 184, 0, 0.2)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isOpen ? (
                        <input
                          type="radio"
                          name="selectedMongoHost"
                          checked={selectedMongoHost === c.ip}
                          onChange={() => setSelectedMongoHost(c.ip)}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : (
                        <XCircle size={18} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: isOpen ? '#065F46' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{c.ip}:{c.port} ➔ {isOpen ? 'OPEN ✅' : 'CLOSED'}</span>
                          {isOpen && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>({machineLabel})</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: isOpen ? '#047857' : 'var(--text-muted)' }}>
                          {c.message}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <Badge variant="warning">Đang chọn kết nối</Badge>
                    ) : isOpen ? (
                      <Badge variant="success">Hoạt động (Click để chọn)</Badge>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Success Banner */}
          {!isCheckingMongo && mongoCheckResult?.is_connected && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ECFDF5',
                border: '1px solid #10B981',
                color: '#065F46',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} color="#059669" />
              <span>Đang chọn kết nối tới: <strong>{selectedMongoHost || mongoCheckResult.connected_ip}:27017</strong>. Bấm nút dưới để truy cập.</span>
            </div>
          )}

          {/* Error Banner when all candidate IPs failed */}
          {!isCheckingMongo && mongoCheckError && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                color: '#991B1B',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>{mongoCheckError}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    )}
    </>
  );
};
