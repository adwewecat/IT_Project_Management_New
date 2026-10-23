import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  Plus,
  Edit2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Check,
  Layers,
  ChefHat,
  Server,
  Star,
  Clock,
  History,
  TableProperties,
  Info,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { getRestaurants } from '../../services/restaurantService';
import {
  mongoService,
  AppParamItem,
  MongoCandidateStatus,
  KdsItemDish,
  KdsItemsResponse,
  MasterDataSyncLogResponse,
} from '../../services/mongoService';
import { RestaurantItem } from '../../types/restaurant';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin, checkIsAdmin, checkIsAppRole } from '../../utils/authUtils';
// Metadata cho các tham số trọng yếu chuẩn của hệ thống POS / G-ORDER
export interface KnownParamMeta {
  paramName: string;
  defaultNote?: string;
  category: string;
  priority: number; // 1: Cần thiết nhất (hiển thị trên đầu), 2: Quan trọng, 3: Phụ/Ít dùng
}

export const KNOWN_APP_PARAMS: Record<string, KnownParamMeta> = {
  SHOW_KDS: {
    paramName: 'Hiển thị KDS Bếp',
    defaultNote: 'Bật/Tắt màn hình hiển thị KDS điều phối món nhà bếp',
    category: 'KDS / Bếp',
    priority: 1,
  },
  CONFIG_NEW_QR_ORDER: {
    paramName: 'Hệ thống QR Order Mới',
    defaultNote: 'Value = 1 thì chạy QR-order mới, Value = 0 thì chạy QR-order cũ hoặc ko cấu hình',
    category: 'QR Order & CO',
    priority: 1,
  },
  AUTO_PRINT_QR_CODE: {
    paramName: 'Tự động in mã QR Code',
    defaultNote: 'Có cấu hình và value = 1 thì in QR code, value != 1 thì không in QR code (theo máy in thanh toán)',
    category: 'QR Order & CO',
    priority: 1,
  },
  FUNC_BOOKING: {
    paramName: 'Chức năng Đặt Bàn (Booking)',
    defaultNote: 'Hiển thị / Bật tính năng đặt bàn trước trên ứng dụng',
    category: 'Vận Hành & Đặt Bàn',
    priority: 1,
  },
  FUNC_CALL_SERVICE: {
    paramName: 'Nút Gọi Nhân Viên trên CO',
    defaultNote: 'Hiển thị nút gọi Nhân Viên phục vụ trên máy khách (Customer Order)',
    category: 'QR Order & CO',
    priority: 1,
  },
  FUNC_SHOW_CANCEL_ITEM: {
    paramName: 'Ẩn / Hiện chức năng Trả Món',
    defaultNote: 'Cho phép hoặc ẩn hiện nút hủy món, trả món trên giao diện order',
    category: 'Vận Hành & Đặt Bàn',
    priority: 1,
  },
  FUNC_SHOW_CO_PAY: {
    paramName: 'Thanh toán trên máy CO',
    defaultNote: 'Ẩn / Hiện tính năng thanh toán trực tiếp trên thiết bị khách hàng (CO)',
    category: 'QR Order & CO',
    priority: 1,
  },
  PASSWORD_EXIT_TABLE: {
    paramName: 'Mật khẩu thoát bàn Order',
    defaultNote: 'Mật khẩu xác thực của nhân viên để thoát bàn trên tablet/CO',
    category: 'Bảo Mật & Phân Quyền',
    priority: 1,
  },
  ROLE_UNLOCK_ORDER: {
    paramName: 'Quyền mở khóa bàn Order',
    defaultNote: 'Phân quyền vai trò nhân viên được phép mở khóa bàn đang phục vụ',
    category: 'Bảo Mật & Phân Quyền',
    priority: 1,
  },
  CONFIG_COOKING: {
    paramName: 'Thời gian chế biến món KDS',
    defaultNote: 'Cấu hình thời gian chế biến món ăn chuẩn trên KDS',
    category: 'KDS / Bếp',
    priority: 1,
  },
  PRINT_BILL_AFTER_PAY: {
    paramName: 'Tự động in Bill sau thanh toán',
    defaultNote: 'Tự động in hóa đơn thanh toán sau khi hoàn tất giao dịch',
    category: 'Thu Ngân & Hóa Đơn',
    priority: 1,
  },
  ALTER_CO_MENU_ITEM: {
    paramName: 'Đổi món trên thực đơn CO',
    defaultNote: 'Cho phép chỉnh sửa, thay thế món ăn trên giao diện CO',
    category: 'QR Order & CO',
    priority: 2,
  },
  BF_PENDING_DISH: {
    paramName: 'Món chờ Buffet (Pending Dish)',
    defaultNote: 'Cấu hình giữ món hoặc chờ chế biến trong danh sách buffet',
    category: 'Vận Hành & Đặt Bàn',
    priority: 2,
  },
  CONFIG_LINK_CTKM: {
    paramName: 'Link Chương Trình Khuyến Mãi',
    defaultNote: 'Đường dẫn liên kết hiển thị chương trình khuyến mãi trên CO',
    category: 'QR Order & CO',
    priority: 2,
  },
  AUTO_MERGE_ORDER: {
    paramName: 'Tự động gộp Order',
    defaultNote: 'Tự động gộp các order trùng bàn thành một order duy nhất',
    category: 'Vận Hành & Đặt Bàn',
    priority: 2,
  },
  ENABLE_FAST_PAYMENT: {
    paramName: 'Thanh toán nhanh (Fast Pay)',
    defaultNote: 'Bật tính năng thanh toán 1 chạm nhanh tại quầy thu ngân',
    category: 'Thu Ngân & Hóa Đơn',
    priority: 2,
  },
  SHOW_PRICE_ON_ORDER: {
    paramName: 'Hiển thị giá món trên Order',
    defaultNote: 'Hiển thị giá tiền của từng món trên thiết bị gọi món',
    category: 'QR Order & CO',
    priority: 2,
  },
  TABLET_LAYOUT_MODE: {
    paramName: 'Chế độ giao diện Tablet',
    defaultNote: 'Cấu hình bố cục hiển thị menu ngang/dọc trên máy tính bảng',
    category: 'Giao Diện & Tablet',
    priority: 3,
  },
  ALLOW_PRINT_TEMP_BILL: {
    paramName: 'Cho phép in tạm tính',
    defaultNote: 'Bật quyền in phiếu tạm tính trước khi thanh toán',
    category: 'Thu Ngân & Hóa Đơn',
    priority: 2,
  },
  NOTIFY_NEW_ORDER_SOUND: {
    paramName: 'Âm thanh thông báo Order mới',
    defaultNote: 'Phát chuông thông báo khi có món mới được gửi xuống bếp/bar',
    category: 'KDS / Bếp',
    priority: 2,
  },
  FUNC_SHOW_NOTE: {
    paramName: 'Hiển thị ghi chú trên CD',
    defaultNote: 'Cấu hình hiển thị ghi chú món ăn trên màn hình khách hàng (Customer Display)',
    category: 'Giao Diện & Tablet',
    priority: 1,
  },
  FUNC_SHOW_PAYMENT_QR_ORDER: {
    paramName: 'Thanh toán QR Order',
    defaultNote: 'Cho phép hiển thị phương thức thanh toán QR Order trên máy khách',
    category: 'QR Order & CO',
    priority: 1,
  },
  FUNC_SHOW_UPDATE_ROLE: {
    paramName: 'Phân quyền vai trò User',
    defaultNote: 'User được phép phân quyền theo vai trò: Nhận booking, thanh toán, gửi nhân viên, cập nhật tipping',
    category: 'Bảo Mật & Phân Quyền',
    priority: 1,
  },
  ROLE_SETUP_SHOW_HIDE_ITEM: {
    paramName: 'Quyền Ẩn / Hiện món',
    defaultNote: 'Cấu hình User được phép Ẩn hoặc Hiện món ăn trên order',
    category: 'Bảo Mật & Phân Quyền',
    priority: 1,
  },
  FUNC_SHOW_TOTAL_MONEY: {
    paramName: 'Hiển thị tổng tiền',
    defaultNote: 'Hiển thị tổng số tiền trên màn hình order',
    category: 'Thu Ngân & Hóa Đơn',
    priority: 2,
  },
  FUNC_SHOW_VOUCHER: {
    paramName: 'Hiển thị Voucher ưu đãi',
    defaultNote: 'Hiển thị áp dụng Voucher / Mã giảm giá trên order',
    category: 'Thu Ngân & Hóa Đơn',
    priority: 2,
  },
  FW_SUBMIT_FOR_LESS_THAN_THREE_GUEST: {
    paramName: 'Gửi món dưới 3 khách',
    defaultNote: 'Cấu hình lượt gọi món khi bàn có dưới 3 khách',
    category: 'Vận Hành & Đặt Bàn',
    priority: 2,
  },
  FW_SUBMIT_FOR_ROUND_DEFAULT: {
    paramName: 'Lượt gọi món mặc định',
    defaultNote: 'Các lượt gọi cách nhau bằng dấu *, ví dụ cấu hình 3 lượt gọi lần lượt tối đa là 3,2,1',
    category: 'Vận Hành & Đặt Bàn',
    priority: 2,
  },
  HOT_TIP: {
    paramName: 'Số tiền Tip gợi ý',
    defaultNote: 'Số tiền gợi ý tipping cho nhân viên phục vụ',
    category: 'Thu Ngân & Hóa Đơn',
    priority: 2,
  },
  ALLOW_HIDE_ITEM_GROUP: {
    paramName: 'Quyền thấy món đang hiện',
    defaultNote: 'Cấu hình User có thể thấy được các món đang hiện trên giao diện',
    category: 'Bảo Mật & Phân Quyền',
    priority: 2,
  },
};

export const getParamDisplayName = (param: AppParamItem): string => {
  if (param.paramName && param.paramName.trim() && param.paramName.trim() !== param.paramCode) {
    return param.paramName.trim();
  }
  const known = KNOWN_APP_PARAMS[param.paramCode];
  if (known) {
    return known.paramName;
  }
  if (param.note && param.note.trim() && param.note.trim() !== param.paramCode) {
    return param.note.trim();
  }
  return param.paramCode;
};

export const getStandardParamDisplay = (std: { param_code: string; param_name?: string; note?: string }) => {
  const pCode = (std.param_code || '').trim().toUpperCase();
  const rawName = (std.param_name || '').trim();
  const rawNote = (std.note || '').trim();

  let displayName = pCode;
  const known = KNOWN_APP_PARAMS[pCode];

  if (known) {
    displayName = known.paramName;
  } else if (rawName && rawName.toUpperCase() !== pCode) {
    displayName = rawName;
  } else if (rawNote && rawNote.toUpperCase() !== pCode) {
    displayName = rawNote;
  }

  let displayNote = '—';
  if (rawNote && rawNote.toUpperCase() !== pCode && rawNote !== displayName) {
    displayNote = rawNote;
  } else if (known?.defaultNote) {
    displayNote = known.defaultNote;
  }

  return { displayName, displayNote };
};

export const getParamCategory = (paramCode: string): string => {
  return KNOWN_APP_PARAMS[paramCode]?.category || 'Khác';
};

export const getParamPriority = (paramCode: string): number => {
  return KNOWN_APP_PARAMS[paramCode]?.priority || 99;
};

export const getMachineInfo = (ip: string) => {
  const lastOctet = ip ? ip.split('.').pop() || '' : '';
  if (lastOctet === '11') {
    return {
      title: 'Thu Ngân 1 (POS 1)',
      shortTitle: 'Thu Ngân .11',
      description: 'Máy tính thu ngân chính của nhà hàng',
      role: 'POS / Thu Ngân',
      icon: '💻',
      color: '#2563EB',
      bgColor: '#EFF6FF',
    };
  }
  if (lastOctet === '12') {
    return {
      title: 'Thu Ngân 2 (POS 2)',
      shortTitle: 'Thu Ngân .12',
      description: 'Máy tính thu ngân phụ của nhà hàng',
      role: 'POS / Thu Ngân',
      icon: '💻',
      color: '#0891B2',
      bgColor: '#ECFEFF',
    };
  }
  if (lastOctet === '41') {
    return {
      title: 'PC Quản Lý (Server)',
      shortTitle: 'PC Quản Lý .41',
      description: 'Máy tính văn phòng / Quản lý nhà hàng',
      role: 'Quản Lý / Server',
      icon: '🖥️',
      color: '#7C3AED',
      bgColor: '#F5F3FF',
    };
  }
  return {
    title: `Máy Trạm IP .${lastOctet}`,
    shortTitle: `IP .${lastOctet}`,
    description: `Máy chủ dịch vụ MongoDB (${ip})`,
    role: 'Máy trạm',
    icon: '🖧',
    color: '#4B5563',
    bgColor: '#F3F4F6',
  };
};

export const RestaurantMongoPage: React.FC = () => {
  const { user } = useAuth();
  const canAccessMongo = checkIsAppRole(user) || checkIsAdmin(user) || checkIsSuperAdmin(user);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Redirect unauthorized users
  useEffect(() => {
    if (user && !canAccessMongo) {
      navigate('/restaurants', { replace: true });
    }
  }, [user, canAccessMongo, navigate]);

  const restaurantIdParam = searchParams.get('restaurantId');
  const hostParam = searchParams.get('host');

  // Restaurant list & selected
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);
  const [currentHost, setCurrentHost] = useState<string>(hostParam || '');
  const [currentPort] = useState<number>(27017);

  // Scanning state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanCandidates, setScanCandidates] = useState<MongoCandidateStatus[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [showHostSelectModal, setShowHostSelectModal] = useState<boolean>(false);

  // GPOS Table Selection: null (Overview) | 'APP_PARAM' | 'KDS_ITEMS' | 'MASTER_DATA_SYNC_LOG'
  const [selectedTable, setSelectedTable] = useState<'APP_PARAM' | 'KDS_ITEMS' | 'MASTER_DATA_SYNC_LOG' | null>(null);

  // GPOS: APP_PARAM state
  const [paramsList, setParamsList] = useState<AppParamItem[]>([]);
  const [loadingParams, setLoadingParams] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<number>(-1);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // GPOS: Check Item KDS state
  const [kdsData, setKdsData] = useState<KdsItemsResponse | null>(null);
  const [loadingKds, setLoadingKds] = useState<boolean>(false);
  const [kdsSearchInput, setKdsSearchInput] = useState<string>('');
  const [kdsSearchQuery, setKdsSearchQuery] = useState<string>('');
  const [kdsPriceFilter, setKdsPriceFilter] = useState<string>('ALL');
  const [kdsGroupFilter, setKdsGroupFilter] = useState<string>('ALL');
  const [kdsQuayFilter, setKdsQuayFilter] = useState<string>('ALL');

  // KDS: Chỉnh sửa thời gian chế biến món (CONFIG_COOKING)
  const [editingKdsItem, setEditingKdsItem] = useState<KdsItemDish | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editSeconds, setEditSeconds] = useState<number>(0);
  const [savingCookingTime, setSavingCookingTime] = useState<boolean>(false);

  // GPOS: MASTER_DATA_SYNC_LOG state
  const [syncLogData, setSyncLogData] = useState<MasterDataSyncLogResponse | null>(null);
  const [loadingSyncLog, setLoadingSyncLog] = useState<boolean>(false);
  const [syncDbName, setSyncDbName] = useState<string>('G_ORDER');
  const [syncSearchInput, setSyncSearchInput] = useState<string>('');
  const [syncSearchQuery, setSyncSearchQuery] = useState<string>('');
  const [syncFromDate, setSyncFromDate] = useState<string>('');
  const [syncToDate, setSyncToDate] = useState<string>('');
  const [syncLimit, setSyncLimit] = useState<number>(200);

  // Helper to remove Vietnamese tones for accent-insensitive search
  const removeVietnameseTones = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .toLowerCase()
      .trim();
  };

  const handleKdsSearch = () => {
    setKdsSearchQuery(kdsSearchInput.trim());
  };

  const handleKdsResetSearch = () => {
    setKdsSearchInput('');
    setKdsSearchQuery('');
  };

  const handleSyncSearch = () => {
    setSyncSearchQuery(syncSearchInput.trim());
    if (currentHost) {
      loadSyncLogs(currentHost, syncDbName, syncSearchInput.trim(), syncFromDate, syncToDate, syncLimit);
    }
  };

  const handleSyncResetSearch = () => {
    setSyncSearchInput('');
    setSyncSearchQuery('');
    setSyncFromDate('');
    setSyncToDate('');
    if (currentHost) {
      loadSyncLogs(currentHost, syncDbName, '', '', '', syncLimit);
    }
  };



  // Starred / Prioritized Param Codes (persisted in localStorage)
  const STARRED_PARAMS_KEY = 'mongo_app_param_starred_codes';
  const [starredParams, setStarredParams] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('mongo_app_param_starred_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [onlyStarred, setOnlyStarred] = useState<boolean>(false);

  const toggleStarParam = (code: string) => {
    setStarredParams((prev) => {
      let next: string[];
      if (prev.includes(code)) {
        next = prev.filter((c) => c !== code);
        showToast(`Đã bỏ đánh sao ưu tiên cho '${code}'`, 'success');
      } else {
        next = [code, ...prev];
        showToast(`Đã đánh sao ưu tiên: '${code}' sẽ được đưa lên đầu bảng`, 'success');
      }
      try {
        localStorage.setItem(STARRED_PARAMS_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Lỗi khi lưu tham số ưu tiên:', e);
      }
      return next;
    });
  };

  // Toast / notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Modal Edit Param
  const [editingParam, setEditingParam] = useState<AppParamItem | null>(null);
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormType, setEditFormType] = useState<'FUNCTION' | 'CONFIG'>('FUNCTION');
  const [editFormStatus, setEditFormStatus] = useState<number>(1);
  const [editFormValue, setEditFormValue] = useState<string>('');
  const [editFormNote, setEditFormNote] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Modal Create Param
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newParamCode, setNewParamCode] = useState<string>('');
  const [newParamName, setNewParamName] = useState<string>('');
  const [newParamType, setNewParamType] = useState<'FUNCTION' | 'CONFIG'>('FUNCTION');
  const [newParamStatus, setNewParamStatus] = useState<number>(1);
  const [newParamValue, setNewParamValue] = useState<string>('');
  const [newParamNote, setNewParamNote] = useState<string>('');
  const [isSavingCreate, setIsSavingCreate] = useState<boolean>(false);

  // 1. Load restaurants list on mount
  useEffect(() => {
    getRestaurants({ page_size: 1000 })
      .then((res: any) => {
        const items: RestaurantItem[] = res.items || [];
        setRestaurants(items);
        if (restaurantIdParam) {
          const found = items.find((r: RestaurantItem) => String(r.id) === String(restaurantIdParam));
          if (found) {
            setSelectedRestaurant(found);
            triggerScan(found, hostParam || undefined);
          }
        }
      })
      .catch((err: any) => console.error('Lỗi khi tải danh sách nhà hàng:', err));
  }, [restaurantIdParam]);

  // 2. Perform connection scan if restaurant is selected
  const triggerScan = async (rest: RestaurantItem, preferredHost?: string) => {
    setIsScanning(true);
    setScanError(null);
    setScanCandidates([]);
    setShowHostSelectModal(false);

    try {
      const res = await mongoService.checkConnection(rest.id, rest.ip);
      setScanCandidates(res.candidates);
      const openCandidates = res.candidates.filter((c) => c.status === 'OPEN');

      if (res.is_connected && openCandidates.length > 0) {
        if (openCandidates.length === 1) {
          // Chỉ có duy nhất 1 máy mở MongoDB -> Kết nối trực tiếp
          const chosenHost = openCandidates[0].ip;
          setCurrentHost(chosenHost);
          setSearchParams({ restaurantId: String(rest.id), host: chosenHost });
          const info = getMachineInfo(chosenHost);
          showToast(`Đã kết nối thành công tới ${info.title} (${chosenHost}:27017)`, 'success');
        } else {
          // Có từ 2 máy trở lên (.11, .12, .41) cùng mở MongoDB
          if (preferredHost && openCandidates.some((c) => c.ip === preferredHost)) {
            // Nếu người dùng đã chọn máy trước đó hoặc từ URL
            setCurrentHost(preferredHost);
            setSearchParams({ restaurantId: String(rest.id), host: preferredHost });
            const info = getMachineInfo(preferredHost);
            showToast(`Đã kết nối tới ${info.title} (${preferredHost}:27017)`, 'success');
          } else {
            // KHÔNG TỰ ĐỘNG CHỌN SẴN: Mở modal để người dùng chủ động chọn máy cần kết nối
            setCurrentHost('');
            setShowHostSelectModal(true);
            showToast(`Phát hiện ${openCandidates.length} máy cùng mở MongoDB (.11, .12, .41). Vui lòng chọn máy để kết nối!`, 'info');
          }
        }
      } else {
        setCurrentHost('');
        setScanError(
          res.error_message ||
            'Nhà hàng chưa mở POS hoặc chưa được cài MongoDB hoặc chưa cài file bin kết nối IP, Vui lòng check lại cho Nhà này'
        );
      }
    } catch (err: any) {
      setScanError(
        'Không thể kết nối máy chủ để dò tìm MongoDB: ' + (err.response?.data?.detail || err.message)
      );
    } finally {
      setIsScanning(false);
    }
  };

  // Switch between discovered open MongoDB hosts
  const handleSwitchHost = (newHost: string) => {
    setCurrentHost(newHost);
    setShowHostSelectModal(false);
    if (selectedRestaurant) {
      setSearchParams({ restaurantId: String(selectedRestaurant.id), host: newHost });
    }
    const info = getMachineInfo(newHost);
    showToast(`Đã chuyển kết nối sang ${info.title} (${newHost}:27017)`, 'success');
  };

  // If currentHost changes, load APP_PARAM, Check Item KDS, and MASTER_DATA_SYNC_LOG
  useEffect(() => {
    if (currentHost) {
      loadParams(currentHost);
      loadKdsItems(currentHost);
      loadSyncLogs(currentHost);
    }
  }, [currentHost]);

  // Handle restaurant select change
  const handleSelectRestaurant = (rId: string) => {
    const r = restaurants.find((item) => String(item.id) === rId);
    if (r) {
      setSelectedRestaurant(r);
      triggerScan(r);
    }
  };

  // Load APP_PARAM from GPOS (G_ORDER)
  const loadParams = async (host: string) => {
    setLoadingParams(true);
    try {
      const data = await mongoService.getAppParams(host, currentPort);
      setParamsList(data);
    } catch (err: any) {
      showToast('Lỗi khi tải bảng APP_PARAM: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingParams(false);
    }
  };

  // Load Check Item KDS from GPOS / KDS
  const loadKdsItems = async (host: string) => {
    setLoadingKds(true);
    try {
      const data = await mongoService.getKdsItems(host, currentPort);
      setKdsData(data);
    } catch (err: any) {
      showToast('Lỗi khi tải dữ liệu Check Item KDS: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingKds(false);
    }
  };

  // Load MASTER_DATA_SYNC_LOG
  const loadSyncLogs = async (
    host: string,
    dbName: string = syncDbName,
    search?: string,
    fromDate?: string,
    toDate?: string,
    limit: number = syncLimit
  ) => {
    setLoadingSyncLog(true);
    try {
      const data = await mongoService.getMasterDataSyncLogs(
        host,
        currentPort,
        dbName,
        search !== undefined ? search : syncSearchQuery,
        fromDate !== undefined ? fromDate : syncFromDate,
        toDate !== undefined ? toDate : syncToDate,
        limit
      );
      setSyncLogData(data);
    } catch (err: any) {
      showToast('Lỗi khi tải nhật ký MASTER_DATA_SYNC_LOG: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingSyncLog(false);
    }
  };

  // Format currency VNĐ
  const formatVND = (val?: number | null) => {
    if (val === undefined || val === null || val === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  // Dynamic KDS Group list for filtering
  const kdsGroups = useMemo(() => {
    if (!kdsData?.items) return [];
    const groupSet = new Set<string>();
    kdsData.items.forEach((it) => {
      if (it.group_type_kds) groupSet.add(it.group_type_kds);
    });
    return Array.from(groupSet).sort();
  }, [kdsData]);

  // Filtered KDS items (supports accent-insensitive dish name, dish code, SAP code, and Quầy filter)
  const filteredKdsItems = useMemo(() => {
    if (!kdsData?.items) return [];
    const rawQ = kdsSearchQuery.trim().toLowerCase();
    const cleanQ = removeVietnameseTones(kdsSearchQuery);

    return kdsData.items.filter((item) => {
      if (kdsPriceFilter !== 'ALL' && item.price_status !== kdsPriceFilter) return false;
      if (kdsGroupFilter !== 'ALL' && item.group_type_kds !== kdsGroupFilter) return false;

      // Filter by Quầy / Bộ phận bếp
      if (kdsQuayFilter !== 'ALL') {
        const qClean = removeVietnameseTones(kdsQuayFilter);
        const matchQuay = (item.quays || []).some((q) => removeVietnameseTones(q).includes(qClean));
        let matchAcc = false;
        if (!matchQuay && kdsData.accounts_summary) {
          const itemPlaces = new Set(item.place_ids || []);
          matchAcc = kdsData.accounts_summary.some(
            (a) => removeVietnameseTones(a.account_name).includes(qClean) && a.place_ids.some((p) => itemPlaces.has(p))
          );
        }
        if (!matchQuay && !matchAcc) return false;
      }

      if (rawQ) {
        const code = (item.menu_item_code || '').toLowerCase();
        const sap = (item.sap_code || '').toLowerCase();
        const nameRaw = (item.menu_item_name || '').toLowerCase();
        const nameClean = removeVietnameseTones(item.menu_item_name || '');
        const quaysRaw = (item.quays || []).join(' ').toLowerCase();

        const matchCode = code.includes(rawQ);
        const matchSap = sap.includes(rawQ);
        const matchNameWithAccent = nameRaw.includes(rawQ);
        const matchNameNoAccent = nameClean.includes(cleanQ);
        const matchQuays = quaysRaw.includes(rawQ);

        if (!matchCode && !matchSap && !matchNameWithAccent && !matchNameNoAccent && !matchQuays) {
          return false;
        }
      }
      return true;
    });
  }, [kdsData, kdsSearchQuery, kdsPriceFilter, kdsGroupFilter, kdsQuayFilter]);

  // Handle Open Edit Cooking Time Modal
  const handleOpenEditCookingTime = (item: KdsItemDish) => {
    setEditingKdsItem(item);
    const totalSecs = item.single_cooking_time || 0;
    setEditMinutes(Math.floor(totalSecs / 60));
    setEditSeconds(totalSecs % 60);
  };

  // Handle Save Cooking Time
  const handleSaveCookingTime = async () => {
    if (!editingKdsItem || !currentHost) return;
    const newTotalSeconds = Math.max(0, (Number(editMinutes) || 0) * 60 + (Number(editSeconds) || 0));
    setSavingCookingTime(true);
    try {
      const res = await mongoService.updateKdsCookingTime({
        host: currentHost,
        port: currentPort,
        menu_item_code: editingKdsItem.menu_item_code,
        single_cooking_time: newTotalSeconds,
        sap_code: editingKdsItem.sap_code,
      });
      showToast(res.message || 'Cập nhật thời gian chế biến món thành công!', 'success');

      // Update local state in kdsData immediately
      setKdsData((prev) => {
        if (!prev) return prev;
        const updatedItems = prev.items.map((it) => {
          if (it.menu_item_code === editingKdsItem.menu_item_code) {
            return {
              ...it,
              single_cooking_time: newTotalSeconds,
              cooking_time_display: res.cooking_time_display || (newTotalSeconds > 0 ? `${newTotalSeconds}s` : '0s'),
            };
          }
          return it;
        });
        const configuredCount = updatedItems.filter((it) => (it.single_cooking_time || 0) > 0).length;
        return {
          ...prev,
          items: updatedItems,
          configured_time_count: configuredCount,
        };
      });

      setEditingKdsItem(null);
    } catch (err: any) {
      showToast('Lỗi khi cập nhật thời gian chế biến: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingCookingTime(false);
    }
  };




  // Filtered and Sorted APP_PARAM (Starred items float to the top, then essential operational params, then A-Z)
  const filteredParams = useMemo(() => {
    const list = paramsList.filter((p) => {
      if (onlyStarred && !starredParams.includes(p.paramCode)) return false;
      if (typeFilter !== 'ALL' && p.paramType !== typeFilter) return false;
      if (statusFilter !== -1 && p.status !== statusFilter) return false;
      
      // Filter by Category / Group
      if (categoryFilter === 'ESSENTIAL') {
        const isEssential = getParamPriority(p.paramCode) === 1 || starredParams.includes(p.paramCode);
        if (!isEssential) return false;
      } else if (categoryFilter !== 'ALL') {
        if (getParamCategory(p.paramCode) !== categoryFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = removeVietnameseTones(searchQuery.trim());
        const code = (p.paramCode || '').toLowerCase();
        const name = removeVietnameseTones(getParamDisplayName(p));
        const note = removeVietnameseTones(p.note || '');
        const val = (p.value || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !note.includes(q) && !val.includes(q)) return false;
      }
      return true;
    });

    // Sắp xếp ưu tiên:
    // 1. Dòng người dùng đánh sao (⭐) lên trên đầu
    // 2. Tham số cốt lõi hay cấu hình (Cần thiết / Priority 1)
    // 3. Tham số quan trọng (Priority 2)
    // 4. Các tham số còn lại theo alphabet A-Z
    return [...list].sort((a, b) => {
      const aStarred = starredParams.includes(a.paramCode);
      const bStarred = starredParams.includes(b.paramCode);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;

      const aPrio = getParamPriority(a.paramCode);
      const bPrio = getParamPriority(b.paramCode);
      if (aPrio !== bPrio) return aPrio - bPrio;

      return (a.paramCode || '').localeCompare(b.paramCode || '');
    });
  }, [paramsList, searchQuery, typeFilter, statusFilter, categoryFilter, onlyStarred, starredParams]);

  // Open Edit Modal
  const openEditModal = (param: AppParamItem) => {
    setEditingParam(param);
    setEditFormName(getParamDisplayName(param));
    setEditFormType(param.paramType === 'CONFIG' ? 'CONFIG' : 'FUNCTION');
    setEditFormStatus(param.status);
    setEditFormValue(param.value || '');
    setEditFormNote(param.note || '');
  };

  // Handle Save Edit
  const handleSaveEdit = async () => {
    if (!editingParam || !currentHost) return;
    setIsSavingEdit(true);
    try {
      await mongoService.updateAppParam(editingParam.paramCode, {
        host: currentHost,
        port: currentPort,
        paramName: editFormName.trim() || undefined,
        paramType: editFormType,
        status: editFormStatus,
        value: editFormValue,
        note: editFormNote,
      });
      showToast(`Đã cập nhật thành công tham số '${editingParam.paramCode}'`, 'success');
      setEditingParam(null);
      loadParams(currentHost);
    } catch (err: any) {
      showToast('Lỗi khi cập nhật: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Save Create
  const handleSaveCreate = async () => {
    if (!newParamCode.trim() || !currentHost) {
      showToast('Vui lòng nhập mã tham số Param Code', 'error');
      return;
    }
    setIsSavingCreate(true);
    try {
      await mongoService.createAppParam({
        host: currentHost,
        port: currentPort,
        paramCode: newParamCode.trim().toUpperCase(),
        paramName: newParamName.trim() || undefined,
        paramType: newParamType,
        status: newParamStatus,
        value: newParamValue,
        note: newParamNote,
      });
      showToast(`Đã thêm mới tham số '${newParamCode.trim().toUpperCase()}' thành công`, 'success');
      setShowCreateModal(false);
      setNewParamCode('');
      setNewParamName('');
      setNewParamValue('');
      setNewParamNote('');
      loadParams(currentHost);
    } catch (err: any) {
      showToast('Lỗi khi thêm mới: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingCreate(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '50px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor:
              toast.type === 'success'
                ? '#10B981'
                : toast.type === 'info'
                ? '#2563EB'
                : '#EF4444',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : toast.type === 'info' ? (
            <Info size={18} />
          ) : (
            <XCircle size={18} />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header & Restaurant Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/restaurants')}
            leftIcon={<ArrowLeft size={16} />}
          >
            Quay lại
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(selectedRestaurant ? `/app/mongo-analysis?restaurantId=${selectedRestaurant.id}` : '/app/mongo-analysis')}
            style={{
              borderColor: '#059669',
              color: '#065F46',
              backgroundColor: '#ECFDF5',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <TableProperties size={15} />
            <span>Phân Tích &amp; Báo Cáo Bàn</span>
          </Button>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={24} style={{ color: 'var(--color-primary)' }} />
              Quản Lý MongoDB Nhà Hàng
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Dò tìm IP tự động, tra cứu &amp; cấu hình các tham số vận hành Tablet Order và Bếp KDS
            </p>
          </div>
        </div>

        {/* Restaurant selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ minWidth: '320px' }}>
            <select
              value={selectedRestaurant?.id || ''}
              onChange={(e) => handleSelectRestaurant(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="">-- Chọn Nhà Hàng Để Kết Nối MongoDB --</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.sap ? `[${r.sap}] ` : ''}{r.res} {r.ip ? `(IP: ${r.ip})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedRestaurant && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerScan(selectedRestaurant)}
              isLoading={isScanning}
              leftIcon={<RefreshCw size={14} />}
              title="Dò lại cổng 27017 trên các IP .11, .12, .41"
            >
              Dò lại
            </Button>
          )}
        </div>
      </div>

      {/* Info Banner if a restaurant is selected */}
      {selectedRestaurant && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedRestaurant.res}
                </span>
                {selectedRestaurant.brand && <Badge variant="primary">{selectedRestaurant.brand}</Badge>}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mã SAP: <strong>{selectedRestaurant.sap || '—'}</strong> | Mã RK7: <strong>{selectedRestaurant.rk7 || '—'}</strong> | IP Gateway: <strong>{selectedRestaurant.ip || '—'}</strong>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* If multiple MongoDB instances are open, allow user to actively switch host */}
              {scanCandidates.filter((c) => c.status === 'OPEN').length > 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 10px',
                    backgroundColor: '#FEF3C7',
                    border: '1.5px solid #F59E0B',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ⚡ Đổi máy ({scanCandidates.filter((c) => c.status === 'OPEN').length} máy mở):
                  </span>
                  {scanCandidates
                    .filter((c) => c.status === 'OPEN')
                    .map((c) => {
                      const isSelected = currentHost === c.ip;
                      const info = getMachineInfo(c.ip);
                      return (
                        <button
                          key={c.ip}
                          type="button"
                          onClick={() => handleSwitchHost(c.ip)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--color-primary)' : '1px solid #D1D5DB',
                            backgroundColor: isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                            color: isSelected ? 'var(--color-primary)' : '#374151',
                            boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                          title={`Chuyển phân tích sang ${info.title} (${c.ip}:27017)`}
                        >
                          <span>{info.icon}</span>
                          <span>{info.shortTitle}</span>
                          {isSelected && <CheckCircle2 size={13} color="var(--color-primary)" />}
                        </button>
                      );
                    })}
                  <button
                    type="button"
                    onClick={() => setShowHostSelectModal(true)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#B45309',
                      fontSize: '11px',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontWeight: 700,
                      padding: '2px 4px',
                      marginLeft: '2px',
                    }}
                    title="Mở bảng lựa chọn chi tiết tất cả các máy"
                  >
                    Xem tất cả
                  </button>
                </div>
              )}

              {currentHost ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    backgroundColor: '#ECFDF5',
                    border: '1.5px solid #10B981',
                    borderRadius: 'var(--radius-md)',
                    color: '#065F46',
                    fontWeight: 700,
                    fontSize: '13px',
                  }}
                >
                  <Server size={16} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', lineHeight: 1.2 }}>
                      {getMachineInfo(currentHost).title}
                    </span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#059669' }}>
                      {currentHost}:{currentPort}
                    </span>
                  </div>
                  <CheckCircle2 size={15} color="#10B981" />
                </div>
              ) : isScanning ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={15} className="spin-animation" />
                  <span>Đang quét dải IP (.11, .12, .41)...</span>
                </div>
              ) : (
                <Badge variant="danger">Chưa kết nối MongoDB</Badge>
              )}

              {selectedRestaurant && (
                <button
                  type="button"
                  title="Quét lại các IP (.11, .12, .41)"
                  disabled={isScanning}
                  onClick={() => triggerScan(selectedRestaurant, currentHost)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: isScanning ? 'not-allowed' : 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <RefreshCw size={13} className={isScanning ? 'spin-animation' : ''} />
                  <span>Quét lại</span>
                </button>
              )}
            </div>
          </div>

          {/* If scan failed, display exact required error message */}
          {scanError && (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                color: '#991B1B',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ fontSize: '14px' }}>{scanError}</strong>
                  {scanCandidates.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px' }}>
                      {scanCandidates.map((c) => (
                        <span
                          key={c.ip}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: c.status === 'OPEN' ? '#D1FAE5' : '#FEE2E2',
                            color: c.status === 'OPEN' ? '#065F46' : '#B91C1C',
                            border: `1px solid ${c.status === 'OPEN' ? '#6EE7B7' : '#FCA5A5'}`,
                            fontFamily: 'monospace',
                            fontWeight: 600,
                          }}
                        >
                          {c.ip}:{c.port} ➔ {c.status === 'OPEN' ? 'OPEN ✅' : 'CLOSED ❌'} ({c.message})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Khối Lựa Chọn Máy Chủ MongoDB khi nhà hàng có từ 2 máy cùng mở cổng 27017 */}
      {selectedRestaurant && !isScanning && !scanError && !currentHost && scanCandidates.filter((c) => c.status === 'OPEN').length > 1 && (
        <Card style={{ border: '2px solid #3B82F6', backgroundColor: '#F8FAFC' }}>
          <div style={{ padding: '6px 2px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1D4ED8',
                  fontSize: '22px',
                  flexShrink: 0,
                }}
              >
                ⚡
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1E3A8A' }}>
                  Phát hiện {scanCandidates.filter((c) => c.status === 'OPEN').length} máy chủ cùng mở MongoDB tại {selectedRestaurant.res}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: 1.5 }}>
                  Nhà hàng đang có nhiều máy trạm cùng chạy dịch vụ MongoDB (cổng 27017). Vui lòng <strong>chủ động bấm chọn máy</strong> bạn muốn kết nối để xem bảng tham số và phân tích dữ liệu:
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {scanCandidates.map((c) => {
                const info = getMachineInfo(c.ip);
                const isOpen = c.status === 'OPEN';
                return (
                  <div
                    key={c.ip}
                    style={{
                      border: isOpen ? '1.5px solid #93C5FD' : '1px solid #E2E8F0',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isOpen ? '#FFFFFF' : '#F1F5F9',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                      boxShadow: isOpen ? '0 4px 12px rgba(59, 130, 246, 0.08)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{info.icon}</span>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {info.title}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: isOpen ? '#ECFDF5' : '#FEE2E2',
                            color: isOpen ? '#047857' : '#991B1B',
                            border: `1px solid ${isOpen ? '#A7F3D0' : '#FECACA'}`,
                          }}
                        >
                          {isOpen ? '🟢 ĐANG MỞ (27017)' : '⚪ CLOSED'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {info.description}
                      </div>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                        IP: {c.ip}:{c.port}
                      </div>
                    </div>

                    <div>
                      {isOpen ? (
                        <Button
                          variant="primary"
                          size="sm"
                          style={{ width: '100%', fontWeight: 700 }}
                          onClick={() => handleSwitchHost(c.ip)}
                        >
                          🚀 Kết Nối Máy Này ({info.shortTitle})
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          style={{ width: '100%', opacity: 0.5 }}
                        >
                          Không có service
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Unified GPOS Section */}
      {currentHost && (
        <>
          {/* GPOS Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary-text)',
                  fontWeight: 700,
                  fontSize: '15px',
                }}
              >
                <Layers size={18} />
                <span>Hệ Thống Dữ Liệu GPOS Nhà Hàng</span>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  3 Bảng Chức Năng
                </span>
              </div>
            </div>

            {selectedTable === null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    loadParams(currentHost);
                    loadKdsItems(currentHost);
                    loadSyncLogs(currentHost);
                  }}
                  isLoading={loadingParams || loadingKds || loadingSyncLog}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Làm mới tất cả
                </Button>
              </div>
            )}
          </div>

          {/* GPOS OVERVIEW: 3 CARDS (APP_PARAM, Check Item KDS & MASTER_DATA_SYNC_LOG) */}
          {selectedTable === null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Card>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Danh Sách Các Bảng GPOS &amp; KDS
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Chọn bảng chức năng bên dưới để tra cứu chi tiết, cấu hình tham số, đối chiếu giá món hoặc kiểm tra nhật ký đồng bộ Master Data
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {/* CARD 1: APP_PARAM */}
                  <div
                    onClick={() => setSelectedTable('APP_PARAM')}
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary-text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Layers size={24} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            APP_PARAM
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Cấu hình tham số hệ thống &amp; điều phối vận hành Tablet Order
                          </p>
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--color-primary-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {loadingParams ? 'Đang tải...' : `${paramsList.length} docs`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Kiểu: FUNCTION, CONFIG</span>
                      <span style={{ color: 'var(--color-primary-text)', fontWeight: 700 }}>Mở bảng APP_PARAM →</span>
                    </div>
                  </div>

                  {/* CARD 2: Check Item KDS */}
                  <div
                    onClick={() => setSelectedTable('KDS_ITEMS')}
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '10px',
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <ChefHat size={24} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                            Check Item KDS
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Danh mục món, Quầy bếp, thời gian chế biến &amp; đối chiếu giá bán GPOS
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {loadingKds ? 'Đang tải...' : `${kdsData?.total ?? 0} món`}
                        </span>
                        {kdsData && kdsData.accounts_summary && kdsData.accounts_summary.length > 0 && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#F3F4F6',
                              color: '#374151',
                              border: '1px solid #E5E7EB',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {kdsData.accounts_summary.length} Quầy bếp
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Chuẩn KDS: CONFIG_COOKING &amp; ACCOUNT</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>Mở bảng Check Item KDS →</span>
                    </div>
                  </div>

                  {/* CARD 3: MASTER_DATA_SYNC_LOG */}
                  <div
                    onClick={() => {
                      setSelectedTable('MASTER_DATA_SYNC_LOG');
                      if (!syncLogData && currentHost) {
                        loadSyncLogs(currentHost);
                      }
                    }}
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '10px',
                            backgroundColor: '#EFF6FF',
                            color: '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <History size={24} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            MASTER_DATA_SYNC_LOG
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Theo dõi thời gian &amp; trạng thái đồng bộ Master Data xuống POS
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {loadingSyncLog ? 'Đang tải...' : `${syncLogData?.total_records ?? '3,500+'} logs`}
                        </span>
                        {syncLogData?.latest_sync_time && (
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: syncLogData.latest_sync_status?.toUpperCase() === 'SUCCESS' ? '#ECFDF5' : '#FEF3C7',
                              color: syncLogData.latest_sync_status?.toUpperCase() === 'SUCCESS' ? '#047857' : '#B45309',
                              border: `1px solid ${syncLogData.latest_sync_status?.toUpperCase() === 'SUCCESS' ? '#A7F3D0' : '#FCD34D'}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Gần nhất: {syncLogData.latest_sync_time.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Nguồn: G_ORDER (3,500+) &amp; G_KITCHEN</span>
                      <span style={{ color: '#2563EB', fontWeight: 700 }}>Xem nhật ký đồng bộ →</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}


          {/* VIEW: BẢNG APP_PARAM */}
          {selectedTable === 'APP_PARAM' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTable(null)}
                  leftIcon={<ArrowLeft size={14} />}
                >
                  Quay lại danh sách bảng
                </Button>
                <span style={{ color: 'var(--text-muted)' }}>/</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  APP_PARAM
                </span>
              </div>
              {/* Toolbar: Search, Filters, Add Button */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                      <Search
                        size={16}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                      />
                      <input
                        type="text"
                        placeholder="Tìm kiếm Param Code, Tên Param, Diễn giải, Giá trị..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 36px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {/* Filter Nhóm Nghiệp Vụ */}
                    <div style={{ minWidth: '175px' }}>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: categoryFilter === 'ESSENTIAL' ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                          backgroundColor: categoryFilter === 'ESSENTIAL' ? '#EFF6FF' : 'var(--bg-primary)',
                          color: categoryFilter === 'ESSENTIAL' ? 'var(--color-primary)' : 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: categoryFilter === 'ESSENTIAL' ? 700 : 500,
                        }}
                      >
                        <option value="ALL">Tất cả Nhóm nghiệp vụ</option>
                        <option value="ESSENTIAL">⭐ Cần Thiết / Thường Sửa</option>
                        <option value="KDS / Bếp">🍳 KDS / Bếp</option>
                        <option value="QR Order & CO">📱 QR Order & CO</option>
                        <option value="Vận Hành & Đặt Bàn">🛎️ Vận Hành & Đặt Bàn</option>
                        <option value="Thu Ngân & Hóa Đơn">💳 Thu Ngân & Hóa Đơn</option>
                        <option value="Bảo Mật & Phân Quyền">🔒 Bảo Mật & Phân Quyền</option>
                        <option value="Giao Diện & Tablet">📱 Giao Diện & Tablet</option>
                        <option value="Khác">⚙️ Khác</option>
                      </select>
                    </div>

                    {/* Filter Kiểu */}
                    <div style={{ minWidth: '130px' }}>
                      <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="ALL">Tất cả Kiểu</option>
                        <option value="FUNCTION">FUNCTION</option>
                        <option value="CONFIG">CONFIG</option>
                      </select>
                    </div>

                      {/* Filter Trạng Thái */}
                      <div style={{ minWidth: '140px' }}>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: 500,
                          }}
                        >
                          <option value="-1">Tất cả trạng thái</option>
                          <option value="1">🟢 Bật (1)</option>
                          <option value="0">🔴 Tắt (0)</option>
                        </select>
                      </div>

                      {/* Lọc Chỉ Dòng Đã Đánh Sao */}
                      <button
                        type="button"
                        onClick={() => setOnlyStarred((prev) => !prev)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: onlyStarred ? '1.5px solid #F59E0B' : '1px solid var(--border-color)',
                          backgroundColor: onlyStarred ? '#FEF3C7' : 'var(--bg-primary)',
                          color: onlyStarred ? '#92400E' : 'var(--text-secondary)',
                          fontSize: '13px',
                          fontWeight: onlyStarred ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          whiteSpace: 'nowrap',
                        }}
                        title="Bấm để lọc chỉ xem các dòng đã đánh sao ưu tiên"
                      >
                        <Star size={14} fill={onlyStarred ? '#F59E0B' : 'none'} color={onlyStarred ? '#D97706' : 'currentColor'} />
                        <span>Đã đánh sao ({starredParams.length})</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadParams(currentHost)}
                        isLoading={loadingParams}
                        leftIcon={<RefreshCw size={14} />}
                      >
                        Làm mới
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowCreateModal(true)}
                        leftIcon={<Plus size={16} />}
                      >
                        Thêm Mới Param
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Table APP_PARAM */}
                <Card>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Cấu Hình Param (Bảng APP_PARAM)
                      </h3>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Hiển thị <strong>{filteredParams.length}</strong> / {paramsList.length} tham số
                        {starredParams.length > 0 && (
                          <span style={{ marginLeft: '8px', color: '#B45309', fontWeight: 600 }}>
                            (★ {starredParams.length} dòng ưu tiên trên đầu)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <TopScrollTable maxHeight="calc(100vh - 280px)">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 8px', width: '44px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }} title="Đánh sao để ưu tiên dòng lên trên đầu">
                            <Star size={15} fill="#F59E0B" color="#D97706" style={{ verticalAlign: 'middle' }} />
                          </th>
                          <th style={{ padding: '10px 12px', width: '210px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Param Code</th>
                          <th style={{ padding: '10px 12px', width: '210px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Tên Param</th>
                          <th style={{ padding: '10px 12px', width: '110px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Kiểu</th>
                          <th style={{ padding: '10px 12px', width: '110px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Trạng Thái</th>
                          <th style={{ padding: '10px 12px', width: '240px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Giá Trị Cấu Hình</th>
                          <th style={{ padding: '10px 12px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Diễn Giải Nghiệp Vụ</th>
                          <th style={{ padding: '10px 12px', width: '85px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingParams ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px' }} />
                              <div>Đang tải dữ liệu từ MongoDB {currentHost}:27017...</div>
                            </td>
                          </tr>
                        ) : filteredParams.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              Không tìm thấy tham số nào phù hợp với bộ lọc.
                            </td>
                          </tr>
                        ) : (
                        filteredParams.map((p) => {
                          const isStarred = starredParams.includes(p.paramCode);
                          const isEssential = getParamPriority(p.paramCode) === 1;
                          const displayName = getParamDisplayName(p);
                          const categoryName = getParamCategory(p.paramCode);
                          return (
                            <tr
                              key={p.paramCode}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: isStarred ? '#FFFDF0' : 'transparent',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isStarred ? '#FFFBEA' : 'var(--bg-secondary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isStarred ? '#FFFDF0' : 'transparent')}
                            >
                              {/* Cột Đánh Sao Ưu Tiên */}
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => toggleStarParam(p.paramCode)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'transform 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                  title={isStarred ? 'Bỏ đánh sao ưu tiên' : 'Đánh sao để ưu tiên dòng này lên đầu bảng'}
                                >
                                  {isStarred ? (
                                    <Star size={16} fill="#F59E0B" color="#D97706" />
                                  ) : (
                                    <Star size={16} color="#9CA3AF" />
                                  )}
                                </button>
                              </td>

                              {/* Param Code */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-text)' }}>
                                    {p.paramCode}
                                  </span>
                                  {isStarred && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        backgroundColor: '#FEF3C7',
                                        color: '#92400E',
                                        border: '1px solid #FCD34D',
                                        borderRadius: '4px',
                                        padding: '1px 5px',
                                        lineHeight: 1.2,
                                      }}
                                      title="Dòng này được đánh sao ưu tiên lên trên đầu bảng"
                                    >
                                      ★ Ưu tiên
                                    </span>
                                  )}
                                  {!isStarred && isEssential && (
                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        backgroundColor: '#EFF6FF',
                                        color: '#1E40AF',
                                        border: '1px solid #BFDBFE',
                                        borderRadius: '4px',
                                        padding: '1px 5px',
                                        lineHeight: 1.2,
                                      }}
                                      title="Tham số trọng yếu thường dùng để cấu hình"
                                    >
                                      Cần thiết
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(p.paramCode, p.paramCode)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: copiedCode === p.paramCode ? '#10B981' : 'var(--text-muted)',
                                      padding: '2px',
                                    }}
                                    title="Sao chép Param Code"
                                  >
                                    {copiedCode === p.paramCode ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </td>

                              {/* Cột Tên Param (Mới) */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                  {displayName}
                                </div>
                                {categoryName !== 'Khác' && (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      fontSize: '10px',
                                      fontWeight: 500,
                                      color: 'var(--text-muted)',
                                      backgroundColor: 'var(--bg-secondary)',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      marginTop: '2px',
                                      border: '1px solid var(--border-color)',
                                    }}
                                  >
                                    {categoryName}
                                  </span>
                                )}
                              </td>

                            {/* Kiểu (FUNCTION / CONFIG) */}
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: p.paramType === 'CONFIG' ? '#EFF6FF' : '#FDF4FF',
                                  color: p.paramType === 'CONFIG' ? '#1D4ED8' : '#A21CAF',
                                  border: `1px solid ${p.paramType === 'CONFIG' ? '#BFDBFE' : '#F5D0FE'}`,
                                }}
                              >
                                {p.paramType}
                              </span>
                            </td>

                            {/* Trạng Thái */}
                            <td style={{ padding: '10px 12px' }}>
                              {p.status === 1 ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: '#ECFDF5',
                                    color: '#065F46',
                                    border: '1px solid #A7F3D0',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                  Bật (1)
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: '#FEF2F2',
                                    color: '#991B1B',
                                    border: '1px solid #FECACA',
                                  }}
                                >
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                                  Tắt (0)
                                </span>
                              )}
                            </td>

                            {/* Giá Trị Cấu Hình */}
                            <td style={{ padding: '10px 12px' }}>
                              <div
                                style={{
                                  fontFamily: 'monospace',
                                  fontSize: '12px',
                                  backgroundColor: 'var(--bg-secondary)',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  maxWidth: '300px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  border: '1px solid var(--border-color)',
                                }}
                                title={p.value}
                              >
                                {p.value !== undefined && p.value !== '' ? p.value : <em style={{ color: 'var(--text-muted)' }}>[rỗng]</em>}
                              </div>
                            </td>

                            {/* Diễn Giải Nghiệp Vụ */}
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                              {p.note || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                            </td>

                            {/* Thao Tác */}
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(p)}
                                leftIcon={<Edit2 size={13} />}
                                style={{ padding: '4px 8px' }}
                              >
                                Sửa
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                      )}
                    </tbody>
                  </table>
                </TopScrollTable>
              </Card>
            </div>
          )}

          {/* VIEW: CHECK ITEM KDS */}
          {selectedTable === 'KDS_ITEMS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Navigation Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTable(null)}
                    leftIcon={<ArrowLeft size={14} />}
                  >
                    Quay lại danh sách bảng
                  </Button>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ChefHat size={16} color="#059669" />
                    Check Item KDS
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadKdsItems(currentHost)}
                  isLoading={loadingKds}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Làm mới
                </Button>
              </div>

              {/* Summary Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <Card>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG MÓN KDS</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {kdsData?.total ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Bảng CONFIG_COOKING
                  </div>
                </Card>

                <Card>
                  <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>ĐÃ CÀI TG CHẾ BIẾN</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                    {kdsData?.configured_time_count ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Món có thời gian &gt; 0s
                  </div>
                </Card>

                <Card>
                  <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>KHỚP GIÁ CÁC BẢNG</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>
                    {kdsData?.match_price_count ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Đồng nhất DISH_CACHE &amp; SHOW_HIDE
                  </div>
                </Card>

                <Card style={{ backgroundColor: (kdsData?.diff_price_count || 0) > 0 ? '#FFFBEB' : 'var(--bg-primary)', borderColor: (kdsData?.diff_price_count || 0) > 0 ? '#FCD34D' : 'var(--border-color)' }}>
                  <div style={{ fontSize: '12px', color: (kdsData?.diff_price_count || 0) > 0 ? '#B45309' : 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {(kdsData?.diff_price_count || 0) > 0 && <AlertTriangle size={14} color="#D97706" />}
                    CHÊNH LỆCH GIÁ
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: (kdsData?.diff_price_count || 0) > 0 ? '#B45309' : 'var(--text-primary)', marginTop: '4px' }}>
                    {kdsData?.diff_price_count ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: (kdsData?.diff_price_count || 0) > 0 ? '#92400E' : 'var(--text-secondary)', marginTop: '2px' }}>
                    Cần đối chiếu kiểm tra lại giá
                  </div>
                </Card>

                <Card>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>CHƯA CÓ GIÁ (0đ)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {kdsData?.no_price_count ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Món buffet / gia vị / chưa gán giá
                  </div>
                </Card>
              </div>

              {/* Quầy Bếp (ACCOUNT - G_KITCHEN) Quick Filters */}
              {kdsData?.accounts_summary && kdsData.accounts_summary.length > 0 && (
                <Card style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={15} color="var(--color-primary)" />
                      Quầy Bếp (ACCOUNT):
                    </span>
                    <button
                      type="button"
                      onClick={() => setKdsQuayFilter('ALL')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: kdsQuayFilter === 'ALL' ? 700 : 500,
                        backgroundColor: kdsQuayFilter === 'ALL' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                        color: kdsQuayFilter === 'ALL' ? '#000' : 'var(--text-primary)',
                        border: kdsQuayFilter === 'ALL' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Tất cả quầy ({kdsData.total})
                    </button>
                    {kdsData.accounts_summary.map((acc) => {
                      const isSelected = kdsQuayFilter === acc.account_name;
                      return (
                        <button
                          key={acc.account_id}
                          type="button"
                          onClick={() => setKdsQuayFilter(isSelected ? 'ALL' : acc.account_name)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 500,
                            backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--bg-secondary)',
                            color: isSelected ? '#000' : 'var(--text-primary)',
                            border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span>{acc.account_name}</span>
                            <span
                              style={{
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: isSelected ? 'rgba(0,0,0,0.15)' : 'var(--bg-primary)',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {acc.dish_count} món
                            </span>
                          </span>
                          {acc.acc_pass !== undefined && acc.acc_pass !== null && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 500,
                              opacity: 0.75,
                              fontFamily: 'monospace',
                              letterSpacing: '0.02em',
                            }}>
                              {acc.account_id} / pass: {acc.acc_pass || '(trống)'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Filter Toolbar */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
                    {/* Search Form with Dedicated Search Button */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleKdsSearch();
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '320px' }}
                    >
                      <div style={{ position: 'relative', flex: 1 }}>
                        <Search
                          size={16}
                          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                        />
                        <input
                          type="text"
                          placeholder="Nhập Mã món hoặc Tên món (hỗ trợ không dấu, VD: bo, wagyu, suon)..."
                          value={kdsSearchInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setKdsSearchInput(val);
                            if (!val.trim()) {
                              setKdsSearchQuery('');
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleKdsSearch();
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 34px 8px 36px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                          }}
                        />
                        {kdsSearchInput && (
                          <button
                            type="button"
                            onClick={handleKdsResetSearch}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Xóa từ khóa tìm kiếm"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        leftIcon={<Search size={14} />}
                        title="Bấm để tìm kiếm mã món hoặc tên món không dấu"
                      >
                        Tìm kiếm
                      </Button>
                    </form>

                    {/* Quầy Bếp (ACCOUNT) Dropdown filter */}
                    <div style={{ minWidth: '180px' }}>
                      <select
                        value={kdsQuayFilter}
                        onChange={(e) => setKdsQuayFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="ALL">Tất cả Quầy Bếp</option>
                        {kdsData?.accounts_summary?.map((acc) => (
                          <option key={acc.account_id} value={acc.account_name}>
                            {acc.account_name} ({acc.dish_count} món)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Price status filter */}
                    <div style={{ minWidth: '180px' }}>
                      <select
                        value={kdsPriceFilter}
                        onChange={(e) => setKdsPriceFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="ALL">Tất cả trạng thái giá</option>
                        <option value="DIFF">⚠️ Chênh lệch giá ({kdsData?.diff_price_count ?? 0})</option>
                        <option value="MATCH">✅ Khớp giá ({kdsData?.match_price_count ?? 0})</option>
                        <option value="NO_PRICE">⚪ Chưa có giá ({kdsData?.no_price_count ?? 0})</option>
                      </select>
                    </div>

                    {/* KDS Group filter */}
                    <div style={{ minWidth: '160px' }}>
                      <select
                        value={kdsGroupFilter}
                        onChange={(e) => setKdsGroupFilter(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <option value="ALL">Tất cả nhóm Bếp</option>
                        {kdsGroups.map((grp) => (
                          <option key={grp} value={grp}>
                            {grp}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Active search keyword indicator */}
                {kdsSearchQuery && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Đang tìm kiếm từ khóa:</span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-primary-subtle)',
                        color: 'var(--color-primary-text)',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      "{kdsSearchQuery}"
                      <button
                        type="button"
                        onClick={handleKdsResetSearch}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'currentColor',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Bỏ lọc từ khóa"
                      >
                        <XCircle size={13} />
                      </button>
                    </span>
                    <span>(Tìm thấy <strong>{filteredKdsItems.length}</strong> món)</span>
                  </div>
                )}
              </Card>


              {/* KDS Dishes Table */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Danh Sách Món Bếp KDS &amp; Đối Chiếu Giá
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Hiển thị <strong>{filteredKdsItems.length}</strong> / {kdsData?.total ?? 0} món
                    </span>
                  </div>
                </div>

                <TopScrollTable maxHeight="calc(100vh - 280px)">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 10px', width: '50px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>STT</th>
                        <th style={{ padding: '10px 12px', width: '130px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Mã Món</th>
                        <th style={{ padding: '10px 12px', width: '130px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Mã SAP</th>
                        <th style={{ padding: '10px 12px', minWidth: '220px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Tên Món Ăn</th>
                        <th style={{ padding: '10px 12px', width: '120px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Nhóm Bếp</th>
                        <th style={{ padding: '10px 12px', minWidth: '160px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Quầy Bếp (ACCOUNT)</th>
                        <th style={{ padding: '10px 12px', width: '150px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>TG Chế Biến KDS</th>
                        <th style={{ padding: '10px 12px', width: '130px', textAlign: 'right', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Giá Bán</th>
                        <th style={{ padding: '10px 12px', minWidth: '260px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Đối Chiếu Giá Giữa Các Bảng</th>
                        <th style={{ padding: '10px 10px', width: '100px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingKds ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px' }} />
                            <div>Đang tải dữ liệu KDS &amp; đối chiếu giá từ MongoDB {currentHost}:27017...</div>
                          </td>
                        </tr>
                      ) : filteredKdsItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            Không tìm thấy món nào phù hợp với điều kiện tìm kiếm.
                          </td>
                        </tr>
                      ) : (
                        filteredKdsItems.map((item, idx) => {
                          const isDiff = item.price_status === 'DIFF';
                          const hasTime = item.single_cooking_time > 0;
                          return (
                            <tr
                              key={item.menu_item_code + '_' + idx}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: isDiff ? '#FFFDF5' : 'transparent',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isDiff ? '#FFFBEB' : 'var(--bg-secondary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isDiff ? '#FFFDF5' : 'transparent')}
                            >
                              {/* STT */}
                              <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {idx + 1}
                              </td>

                              {/* Mã Món */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-text)' }}>
                                    {item.menu_item_code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(item.menu_item_code, `code_${item.menu_item_code}`)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: copiedCode === `code_${item.menu_item_code}` ? '#10B981' : 'var(--text-muted)',
                                      padding: '2px',
                                    }}
                                    title="Sao chép Mã món"
                                  >
                                    {copiedCode === `code_${item.menu_item_code}` ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </td>

                              {/* Mã SAP */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.sap_code ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border-color)',
                                      }}
                                    >
                                      {item.sap_code}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(item.sap_code!, `sap_${item.sap_code}`)}
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        color: copiedCode === `sap_${item.sap_code}` ? '#10B981' : 'var(--text-muted)',
                                        padding: '2px',
                                      }}
                                      title="Sao chép Mã SAP"
                                    >
                                      {copiedCode === `sap_${item.sap_code}` ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                )}
                              </td>

                              {/* Tên Món */}
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {item.menu_item_name}
                                </span>
                              </td>

                              {/* Nhóm Bếp */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.group_type_kds ? (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: '1px solid #E5E7EB',
                                    }}
                                  >
                                    {item.group_type_kds}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                )}
                              </td>

                              {/* Quầy Bếp (ACCOUNT) */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.quays && item.quays.length > 0 ? (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {item.quays.map((q, qIdx) => {
                                      const qUp = q.toUpperCase();
                                      const isThit = qUp.includes('THỊT') || qUp.includes('THIT');
                                      const isHaiSan = qUp.includes('HẢI SẢN') || qUp.includes('HAI SAN');
                                      const isFoodControl = qUp.includes('FOOD') || qUp.includes('CONTROL');
                                      const isParent = isFoodControl && !isThit && !isHaiSan;

                                      let bg = 'var(--bg-secondary)';
                                      let color = 'var(--text-secondary)';
                                      let border = 'var(--border-color)';
                                      let fontSize = '11px';

                                      if (isParent) {
                                        // Food control / supervisor — style nhỏ hơn, ít nổi bật hơn
                                        bg = '#F3F4F6';
                                        color = '#6B7280';
                                        border = '#D1D5DB';
                                        fontSize = '10px';
                                      } else if (isThit && !isHaiSan) {
                                        bg = '#FEF2F2';
                                        color = '#991B1B';
                                        border = '#FCA5A5';
                                      } else if (isHaiSan) {
                                        bg = '#F0F9FF';
                                        color = '#0369A1';
                                        border = '#BAE6FD';
                                      } else {
                                        bg = '#FFF7ED';
                                        color = '#92400E';
                                        border = '#FED7AA';
                                      }

                                      return (
                                        <span
                                          key={qIdx}
                                          style={{
                                            display: 'inline-block',
                                            padding: isParent ? '1px 6px' : '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: fontSize,
                                            fontWeight: isParent ? 500 : 600,
                                            backgroundColor: bg,
                                            color: color,
                                            border: `1px solid ${border}`,
                                          }}
                                        >
                                          {q}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Chưa phân quầy</span>
                                )}
                              </td>

                              {/* Thời Gian Chế Biến */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCookingTime(item)}
                                  title="Nhấn để chỉnh sửa nhanh thời gian chế biến món này"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    backgroundColor: hasTime ? '#ECFDF5' : 'var(--bg-secondary)',
                                    color: hasTime ? '#047857' : 'var(--text-muted)',
                                    border: hasTime ? '1px solid #A7F3D0' : '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}
                                >
                                  <Clock size={13} />
                                  <span>{hasTime ? item.cooking_time_display : 'Chưa cài (0s)'}</span>
                                  <Edit2 size={11} style={{ opacity: 0.6, marginLeft: '2px' }} />
                                </button>
                              </td>

                              {/* Giá Bán */}
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    color: (item.final_price || 0) > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                                  }}
                                >
                                  {formatVND(item.final_price)}
                                </span>
                              </td>

                              {/* Đối Chiếu Giá */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.price_status === 'MATCH' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      backgroundColor: '#F0FDF4',
                                      color: '#166534',
                                      border: '1px solid #BBF7D0',
                                    }}
                                  >
                                    <Check size={12} /> Khớp giá
                                  </span>
                                )}
                                {item.price_status === 'DIFF' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        backgroundColor: '#FEF3C7',
                                        color: '#B45309',
                                        border: '1px solid #FCD34D',
                                        width: 'fit-content',
                                      }}
                                    >
                                      <AlertTriangle size={12} color="#D97706" /> Lệch giá giữa các bảng
                                    </span>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {item.price_order !== undefined && item.price_order !== null && (
                                        <span>DISH_CACHE: <strong>{formatVND(item.price_order)}</strong></span>
                                      )}
                                      {item.price_show_hide !== undefined && item.price_show_hide !== null && (
                                        <span>SHOW_HIDE: <strong>{formatVND(item.price_show_hide)}</strong></span>
                                      )}
                                      {item.price_out_of_dish !== undefined && item.price_out_of_dish !== null && (
                                        <span>OUT_OF_DISH: <strong>{formatVND(item.price_out_of_dish)}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {item.price_status === 'NO_PRICE' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--text-muted)',
                                      border: '1px solid var(--border-color)',
                                    }}
                                  >
                                    Chưa có giá
                                  </span>
                                )}
                              </td>

                              {/* Thao Tác */}
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenEditCookingTime(item)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    padding: '4px 8px',
                                    fontWeight: 600,
                                  }}
                                  title={`Sửa thời gian chế biến món ${item.menu_item_name}`}
                                >
                                  <Edit2 size={12} />
                                  <span>Sửa TG</span>
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </TopScrollTable>
              </Card>
            </div>
          )}

          {/* VIEW: MASTER_DATA_SYNC_LOG */}
          {selectedTable === 'MASTER_DATA_SYNC_LOG' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Navigation Bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTable(null)}
                    leftIcon={<ArrowLeft size={14} />}
                  >
                    Quay lại danh sách bảng
                  </Button>
                  <span style={{ color: 'var(--text-muted)' }}>/</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <History size={16} color="var(--color-primary)" />
                    MASTER_DATA_SYNC_LOG
                  </span>

                  {/* Database Switcher: G_ORDER vs G_KITCHEN */}
                  <div style={{ display: 'inline-flex', padding: '2px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginLeft: '8px' }}>
                    {(syncLogData?.available_dbs || ['G_ORDER', 'G_KITCHEN']).map((db) => {
                      const isActive = syncDbName === db;
                      return (
                        <button
                          key={db}
                          type="button"
                          onClick={() => {
                            setSyncDbName(db);
                            if (currentHost) {
                              loadSyncLogs(currentHost, db, syncSearchQuery, syncFromDate, syncToDate, syncLimit);
                            }
                          }}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: isActive ? 700 : 500,
                            backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
                            color: isActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                            boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Database size={12} />
                          {db} {db === 'G_ORDER' ? '(Chính)' : '(Bếp)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentHost) {
                      loadSyncLogs(currentHost, syncDbName, syncSearchQuery, syncFromDate, syncToDate, syncLimit);
                    }
                  }}
                  isLoading={loadingSyncLog}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Làm mới
                </Button>
              </div>

              {/* Summary Stat Cards */}
              {(() => {
                const latestItem = syncLogData?.items?.[0];
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    <Card>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>LẦN ĐỒNG BỘ GẦN NHẤT</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                        {syncLogData?.latest_sync_time || '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: (syncLogData?.latest_sync_status || '').includes('SUCCESS') ? '#16A34A' : '#D97706', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                        <CheckCircle2 size={13} />
                        {syncLogData?.latest_sync_status || (latestItem ? `${latestItem.time_ago || ''} (${latestItem.log_mess})` : 'Chưa có bản ghi')}
                      </div>
                    </Card>

                    <Card>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>HẠNG MỤC MỚI ĐỒNG BỘ</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary-text)', marginTop: '4px', fontFamily: 'monospace' }}>
                        {latestItem?.collection || '—'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        TG xử lý: <strong>{latestItem?.total_time_display || '—'}</strong>
                      </div>
                    </Card>

                    <Card>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>TỔNG BẢN GHI LOGS TRONG DB</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                        {syncLogData?.total_records?.toLocaleString() ?? 0}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Database: <strong>{syncDbName}</strong>
                      </div>
                    </Card>

                    <Card>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>BẢN GHI ĐANG HIỂN THỊ</div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                        {syncLogData?.returned_records ?? 0} dòng
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Sắp xếp: Mới nhất trước (Date giảm dần)
                      </div>
                    </Card>
                  </div>
                );
              })()}

              {/* Filter Toolbar */}
              <Card>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSyncSearch();
                  }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                      <Search
                        size={16}
                        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                      />
                      <input
                        type="text"
                        placeholder="Tìm theo tên bảng (MENU_ITEMS, RESTAURANT...), trạng thái (SUCCESS)..."
                        value={syncSearchInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSyncSearchInput(val);
                          if (!val.trim()) {
                            setSyncSearchQuery('');
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 34px 8px 36px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                      {syncSearchInput && (
                        <button
                          type="button"
                          onClick={handleSyncResetSearch}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Xóa từ khóa tìm kiếm"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>

                    {/* From Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Từ ngày:</span>
                      <input
                        type="date"
                        value={syncFromDate}
                        onChange={(e) => setSyncFromDate(e.target.value)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {/* To Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Đến ngày:</span>
                      <input
                        type="date"
                        value={syncToDate}
                        onChange={(e) => setSyncToDate(e.target.value)}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                        }}
                      />
                    </div>

                    {/* Limit selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Số dòng:</span>
                      <select
                        value={syncLimit}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSyncLimit(val);
                          if (currentHost) {
                            loadSyncLogs(currentHost, syncDbName, syncSearchQuery, syncFromDate, syncToDate, val);
                          }
                        }}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        <option value={100}>100 dòng</option>
                        <option value={200}>200 dòng gần nhất</option>
                        <option value={500}>500 dòng</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={<Search size={14} />}
                    >
                      Lọc dữ liệu
                    </Button>

                    {(syncSearchInput || syncFromDate || syncToDate) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSyncResetSearch}
                        leftIcon={<XCircle size={14} />}
                      >
                        Đặt lại
                      </Button>
                    )}
                  </div>
                </form>

                {/* Filter tags if active */}
                {(syncSearchQuery || syncFromDate || syncToDate) && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    <span>Đang lọc:</span>
                    {syncSearchQuery && (
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--color-primary-subtle)', color: 'var(--color-primary-text)', fontWeight: 600 }}>
                        Từ khóa: "{syncSearchQuery}"
                      </span>
                    )}
                    {syncFromDate && (
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        Từ: {syncFromDate}
                      </span>
                    )}
                    {syncToDate && (
                      <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        Đến: {syncToDate}
                      </span>
                    )}
                  </div>
                )}
              </Card>

              {/* Sync Logs Table */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Nhật Ký Đồng Bộ Dữ Liệu ({syncDbName}.MASTER_DATA_SYNC_LOG)
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Hiển thị <strong>{syncLogData?.returned_records ?? 0}</strong> / {syncLogData?.total_records?.toLocaleString() ?? 0} bản ghi
                    </span>
                  </div>
                </div>

                <TopScrollTable maxHeight="calc(100vh - 280px)">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 10px', width: '50px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>STT</th>
                        <th style={{ padding: '10px 12px', minWidth: '180px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Thời Gian Đồng Bộ</th>
                        <th style={{ padding: '10px 12px', minWidth: '180px', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Hạng Mục / Bảng Đồng Bộ</th>
                        <th style={{ padding: '10px 12px', width: '160px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Trạng Thái Kết Quả</th>
                        <th style={{ padding: '10px 12px', width: '150px', textAlign: 'right', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>Thời Gian Xử Lý</th>
                        <th style={{ padding: '10px 12px', width: '120px', textAlign: 'center', position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>ID Bản Ghi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSyncLog ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px' }} />
                            <div>Đang tải nhật ký đồng bộ từ MongoDB {currentHost}:27017...</div>
                          </td>
                        </tr>
                      ) : !syncLogData?.items || syncLogData.items.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            Không tìm thấy bản ghi đồng bộ nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        syncLogData.items.map((log, idx) => {
                          const isSuccess = (log.log_mess || '').toUpperCase().includes('SUCCESS');
                          return (
                            <tr
                              key={log.id ? String(log.id) : idx}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              {/* STT */}
                              <td style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {idx + 1}
                              </td>

                              {/* Thời Gian Đồng Bộ */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                    {log.date_formatted}
                                  </span>
                                  {log.time_ago && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {log.time_ago}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Hạng Mục / Bảng Đồng Bộ */}
                              <td style={{ padding: '10px 12px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    backgroundColor: 'var(--color-primary-subtle)',
                                    color: 'var(--color-primary-text)',
                                    border: '1px solid var(--border-color)',
                                  }}
                                >
                                  {log.collection}
                                </span>
                              </td>

                              {/* Trạng Thái Kết Quả */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                {isSuccess ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 10px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      backgroundColor: '#F0FDF4',
                                      color: '#166534',
                                      border: '1px solid #BBF7D0',
                                    }}
                                  >
                                    <CheckCircle2 size={13} color="#16A34A" />
                                    {log.log_mess}
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 10px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: 700,
                                      backgroundColor: '#FEF2F2',
                                      color: '#991B1B',
                                      border: '1px solid #FCA5A5',
                                    }}
                                  >
                                    <XCircle size={13} color="#DC2626" />
                                    {log.log_mess}
                                  </span>
                                )}
                              </td>

                              {/* Thời Gian Xử Lý */}
                              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'monospace' }}>
                                  {log.total_time_display}
                                </span>
                              </td>

                              {/* ID Bản Ghi */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                                  {log.id !== undefined && log.id !== null ? `#${log.id}` : '—'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </TopScrollTable>
              </Card>
            </div>
          )}
        </>
      )}


      {/* Empty State when no restaurant is selected */}
      {!selectedRestaurant && (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Database size={56} style={{ color: 'var(--color-primary)', margin: '0 auto 16px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Chưa Chọn Nhà Hàng
            </h3>
            <p style={{ maxWidth: '480px', margin: '0 auto 20px', fontSize: '14px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              Vui lòng chọn một nhà hàng từ thanh chọn phía trên hoặc truy cập từ nút <strong>MongoDB</strong> trong màn hình Chi Tiết Nhà Hàng để hệ thống tự động dò tìm IP kết nối.
            </p>
          </div>
        </Card>
      )}

      {/* ================= MODAL CHỈNH SỬA PARAM ================= */}
      {editingParam && (
        <Modal
          isOpen={true}
          onClose={() => setEditingParam(null)}
          title={`Chỉnh Sửa Tham Số: ${editingParam.paramCode}`}
          maxWidth="600px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setEditingParam(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveEdit} isLoading={isSavingEdit}>
                Lưu Thay Đổi
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Param Code (Readonly) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Param Code
              </label>
              <input
                type="text"
                value={editingParam.paramCode}
                disabled
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Tên Param */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Tên Param (Tên gọi tiếng Việt dễ hiểu)
              </label>
              <input
                type="text"
                value={editFormName}
                onChange={(e) => setEditFormName(e.target.value)}
                placeholder="VD: Hiển thị KDS Bếp, Tự động in QR Code..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              />
            </div>

            {/* Kiểu (Chỉ FUNCTION hoặc CONFIG) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Kiểu Tham Số <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={editFormType}
                  onChange={(e) => setEditFormType(e.target.value as 'FUNCTION' | 'CONFIG')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="FUNCTION">FUNCTION</option>
                  <option value="CONFIG">CONFIG</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Chỉ được chọn FUNCTION hoặc CONFIG
                </span>
              </div>

              {/* Trạng Thái */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Trạng Thái <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={editFormStatus}
                  onChange={(e) => setEditFormStatus(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="1">🟢 Bật (1 - Hoạt động)</option>
                  <option value="0">🔴 Tắt (0 - Vô hiệu)</option>
                </select>
              </div>
            </div>

            {/* Giá Trị Cấu Hình */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Giá Trị Cấu Hình (Value)
              </label>
              <textarea
                rows={3}
                value={editFormValue}
                onChange={(e) => setEditFormValue(e.target.value)}
                placeholder="Nhập giá trị cấu hình..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Diễn Giải Nghiệp Vụ */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Diễn Giải Nghiệp Vụ (Note)
              </label>
              <textarea
                rows={3}
                value={editFormNote}
                onChange={(e) => setEditFormNote(e.target.value)}
                placeholder="Nhập mô tả ý nghĩa, công dụng tham số..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL THÊM MỚI PARAM ================= */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Thêm Mới Tham Số Bảng APP_PARAM"
          maxWidth="600px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleSaveCreate} isLoading={isSavingCreate}>
                Thêm Mới
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Param Code */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Param Code <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newParamCode}
                onChange={(e) => setNewParamCode(e.target.value)}
                placeholder="VD: PASSWORD_EXIT_TABLE, SHOW_KDS..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                }}
              />
            </div>

            {/* Tên Param */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Tên Param (Tên gọi tiếng Việt dễ hiểu)
              </label>
              <input
                type="text"
                value={newParamName}
                onChange={(e) => setNewParamName(e.target.value)}
                placeholder="VD: Hiển thị KDS Bếp, Tự động in QR Code..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              />
            </div>

            {/* Kiểu (Chỉ FUNCTION hoặc CONFIG) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Kiểu Tham Số <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={newParamType}
                  onChange={(e) => setNewParamType(e.target.value as 'FUNCTION' | 'CONFIG')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="FUNCTION">FUNCTION</option>
                  <option value="CONFIG">CONFIG</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Chỉ được chọn FUNCTION hoặc CONFIG
                </span>
              </div>

              {/* Trạng Thái */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Trạng Thái <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <select
                  value={newParamStatus}
                  onChange={(e) => setNewParamStatus(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <option value="1">🟢 Bật (1 - Hoạt động)</option>
                  <option value="0">🔴 Tắt (0 - Vô hiệu)</option>
                </select>
              </div>
            </div>

            {/* Giá Trị Cấu Hình */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Giá Trị Cấu Hình (Value)
              </label>
              <textarea
                rows={3}
                value={newParamValue}
                onChange={(e) => setNewParamValue(e.target.value)}
                placeholder="Nhập giá trị cấu hình..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              />
            </div>

            {/* Diễn Giải Nghiệp Vụ */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Diễn Giải Nghiệp Vụ (Note)
              </label>
              <textarea
                rows={3}
                value={newParamNote}
                onChange={(e) => setNewParamNote(e.target.value)}
                placeholder="Nhập diễn giải nghiệp vụ cho tham số..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Chỉnh Sửa Thời Gian Chế Biến Món Bếp (CONFIG_COOKING - G_KITCHEN) */}
      {editingKdsItem && (
        <Modal
          isOpen={true}
          onClose={() => setEditingKdsItem(null)}
          title="⏱️ Cài Đặt Thời Gian Chế Biến Món Bếp (KDS)"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setEditingKdsItem(null)} disabled={savingCookingTime}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveCookingTime}
                disabled={savingCookingTime}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {savingCookingTime && <RefreshCw size={14} className="spin-animation" />}
                <span>{savingCookingTime ? 'Đang lưu...' : 'Lưu Thời Gian'}</span>
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Dish Info Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingKdsItem.menu_item_name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary-text)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  G_KITCHEN.CONFIG_COOKING
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mã Món: </span>
                  <strong style={{ fontFamily: 'monospace' }}>{editingKdsItem.menu_item_code}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mã SAP: </span>
                  <strong style={{ fontFamily: 'monospace' }}>{editingKdsItem.sap_code || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Nhóm KDS: </span>
                  <strong>{editingKdsItem.group_type_kds || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Hiện tại: </span>
                  <span style={{ fontWeight: 700, color: editingKdsItem.single_cooking_time > 0 ? '#047857' : 'var(--text-muted)' }}>
                    {editingKdsItem.single_cooking_time > 0 ? `${editingKdsItem.cooking_time_display} (${editingKdsItem.single_cooking_time}s)` : 'Chưa cài (0s)'}
                  </span>
                </div>
              </div>

              {editingKdsItem.quays && editingKdsItem.quays.length > 0 && (
                <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Quầy chế biến:</span>
                  {editingKdsItem.quays.map((q, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {q}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Input Phút & Giây */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Thiết Lập Thời Gian Chế Biến:
              </label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Số Phút</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        padding: '10px 42px 10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '16px',
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      phút
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-muted)', paddingTop: '16px' }}>:</div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Số Giây</div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={editSeconds}
                      onChange={(e) => setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                      style={{
                        width: '100%',
                        padding: '10px 42px 10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1.5px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '16px',
                        fontWeight: 700,
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'var(--text-muted)' }}>
                      giây
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Seconds Summary */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#166534',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Tổng thời gian lưu vào DB (singleCookingTime):</span>
                <strong>
                  {((Number(editMinutes) || 0) * 60) + (Number(editSeconds) || 0)} giây
                  {((Number(editMinutes) || 0) * 60 + (Number(editSeconds) || 0)) === 0 && ' (Hủy cài đặt / 0s)'}
                </strong>
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Chọn Nhanh Mốc Thời Gian Phổ Biến:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                  { label: '0s (Hủy cài)', m: 0, s: 0, danger: true },
                  { label: '3 phút', m: 3, s: 0 },
                  { label: '5 phút', m: 5, s: 0 },
                  { label: '7 phút', m: 7, s: 0 },
                  { label: '10 phút', m: 10, s: 0 },
                  { label: '15 phút', m: 15, s: 0 },
                  { label: '20 phút', m: 20, s: 0 },
                  { label: '25 phút', m: 25, s: 0 },
                  { label: '30 phút', m: 30, s: 0 },
                ].map((preset, pIdx) => {
                  const isCurrent = editMinutes === preset.m && editSeconds === preset.s;
                  return (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setEditMinutes(preset.m);
                        setEditSeconds(preset.s);
                      }}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isCurrent
                          ? '1.5px solid var(--color-primary)'
                          : preset.danger
                          ? '1px solid #FCA5A5'
                          : '1px solid var(--border-color)',
                        backgroundColor: isCurrent
                          ? 'var(--color-primary-subtle)'
                          : preset.danger
                          ? '#FEF2F2'
                          : 'var(--bg-secondary)',
                        color: isCurrent
                          ? 'var(--color-primary)'
                          : preset.danger
                          ? '#DC2626'
                          : 'var(--text-primary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              💡 Thời gian chế biến sẽ được lưu trực tiếp vào collection <code>CONFIG_COOKING</code> trên MongoDB máy POS nhà hàng ({currentHost}:27017) và áp dụng đồng bộ ngay lập tức cho màn hình Bếp KDS.
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL CHỦ ĐỘNG CHỌN MÁY CHỦ MONGODB ================= */}
      {showHostSelectModal && selectedRestaurant && (
        <Modal
          isOpen={true}
          onClose={() => setShowHostSelectModal(false)}
          title={`Chọn Máy Chủ MongoDB - ${selectedRestaurant.res}`}
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowHostSelectModal(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #BFDBFE',
                borderRadius: 'var(--radius-md)',
                color: '#1E40AF',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              <strong>⚡ Phát hiện nhiều máy cùng mở MongoDB tại nhà hàng:</strong>
              <div style={{ marginTop: '4px', color: '#1E3A8A' }}>
                Hệ thống dò quét dải IP nội bộ và phát hiện các máy dưới đây đều đang chạy dịch vụ MongoDB (Port 27017).
                Vui lòng <strong>chủ động chọn máy</strong> bạn muốn kết nối để xem bảng tham số và phân tích dữ liệu:
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scanCandidates.map((c) => {
                const info = getMachineInfo(c.ip);
                const isOpen = c.status === 'OPEN';
                const isCurrent = currentHost === c.ip;
                return (
                  <div
                    key={c.ip}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: isCurrent
                        ? '2px solid #10B981'
                        : isOpen
                        ? '1.5px solid var(--border-color)'
                        : '1px dashed #E5E7EB',
                      backgroundColor: isCurrent
                        ? '#F0FDF4'
                        : isOpen
                        ? 'var(--bg-primary)'
                        : '#F9FAFB',
                      transition: 'all 0.15s ease',
                      boxShadow: isCurrent ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          backgroundColor: isOpen ? info.bgColor : '#F3F4F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px',
                          flexShrink: 0,
                        }}
                      >
                        {info.icon}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {info.title}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              backgroundColor: isOpen ? '#D1FAE5' : '#FEE2E2',
                              color: isOpen ? '#065F46' : '#991B1B',
                              border: `1px solid ${isOpen ? '#6EE7B7' : '#FCA5A5'}`,
                            }}
                          >
                            {isOpen ? '🟢 ĐANG MỞ (27017)' : '⚪ CLOSED (Không mở)'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {info.description} • IP: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{c.ip}:{c.port}</strong>
                        </div>
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            fontSize: '13px',
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>Đang kết nối</span>
                        </div>
                      ) : isOpen ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSwitchHost(c.ip)}
                        >
                          Kết Nối Máy Này
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          style={{ opacity: 0.5 }}
                        >
                          Không khả dụng
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}
    </div>

  );
};
