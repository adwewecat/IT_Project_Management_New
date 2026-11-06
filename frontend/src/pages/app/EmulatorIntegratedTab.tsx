import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Smartphone,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  Check,
  Search,
  QrCode,
  CreditCard,
  ChefHat,
  Clock,
  Bell,
  Utensils,
  Users,
  ArrowRightLeft,
  Image as ImageIcon,
  Send,
  Settings,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { RestaurantItem } from '../../types/restaurant';
import {
  mongoService,
  LockedTableItem,
  CheckDishImageResult,
  CheckMenuImagesResponse,
  GlobalImageSearchResultItem,
  UpdateImageServerConfigRequest,
  TestImageServerConnectionResponse
} from '../../services/mongoService';
import {
  DishItem,
  removeVietnameseTones,
  OrderLineItem,
  PosTableData,
  MenuSuperType
} from './AndroidEmulatorTab';

export interface EmulatorIntegratedTabProps {
  selectedRestaurant: RestaurantItem | null;
  connectedHost: string;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

// Giỏ hàng gọi món của Tablet Khách (CO)
export interface CoCartItem {
  id: string;
  dish: DishItem;
  quantity: number;
  notes: string;
  priority?: boolean;
}

// Món ăn bếp vừa làm xong chờ nhân viên phục vụ bưng ra bàn (SO)
export interface DeliveredDishItem {
  id: string;
  tableName: string;
  dishName: string;
  quantity: number;
  lineCook: string;
  doneTime: string;
  waitMinutes: number;
  status: 'waiting' | 'served';
}

// Helper chuẩn hóa Host MongoDB
const getValidMongoHost = (rawHost?: string | null): string => {
  if (!rawHost) return '';
  const clean = rawHost.split(':')[0].trim();
  if (!clean || clean.toLowerCase().includes('x')) return '';
  return clean;
};

// Dữ liệu fallback thực đơn mẫu
const FALLBACK_DISHES: DishItem[] = [
  {
    id: 'GA-01',
    name: 'Gà xù truyền thống',
    price: 32407,
    group: 'ALC.GÀ RÁN NHẬT BẢN',
    rk7Code: '10101',
    sapCode: 'M0101',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop'
  },
  {
    id: 'GA-02',
    name: 'Gà xù xốt cheese miso',
    price: 37037,
    group: 'ALC.GÀ RÁN NHẬT BẢN',
    rk7Code: '10102',
    sapCode: 'M0102',
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop'
  },
  {
    id: 'CB-01',
    name: 'COMBO RỦ RÊ',
    price: 143519,
    group: 'Combo',
    rk7Code: '33370',
    sapCode: '65003642',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop'
  },
  {
    id: 'BF-01',
    name: 'Ba chỉ bò Mỹ nướng sốt Tare (Buffet)',
    price: 0,
    group: 'Buffet Nướng Thượng Hạng',
    rk7Code: '20101',
    sapCode: 'B0101',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop'
  },
  {
    id: 'BF-02',
    name: 'Dẻ sườn bò sốt King BBQ (Buffet)',
    price: 0,
    group: 'Buffet Nướng Thượng Hạng',
    rk7Code: '20102',
    sapCode: 'B0102',
    imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop'
  },
  {
    id: 'NUOC-01',
    name: 'Trà trái cây nhiệt đới đào sả',
    price: 39000,
    group: 'Đồ Uống & Tráng Miệng',
    isDrink: true,
    rk7Code: '50101',
    sapCode: 'D0101',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop'
  }
];

// Danh sách bàn ban đầu
const INITIAL_TABLES: PosTableData[] = [
  { id: 'B1', name: 'B1', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  {
    id: 'B2',
    name: 'B2',
    hallId: '1',
    hallName: 'Tầng 1',
    capacity: 4,
    status: 'OCCUPIED',
    guestCount: 3,
    openTimeStr: '11:15',
    durationMinutes: 42,
    serverName: 'Nguyễn Văn Nam',
    orderItems: [
      { id: 'ord-1', dishId: 'GA-01', name: 'Gà xù truyền thống', quantity: 2, price: 32407, rk7Code: '10101', sapCode: 'M0101', status: 'served' },
      { id: 'ord-2', dishId: 'CB-01', name: 'COMBO RỦ RÊ', quantity: 1, price: 143519, rk7Code: '33370', sapCode: '65003642', status: 'sent' }
    ]
  },
  { id: 'B3', name: 'B3', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  { id: 'B4', name: 'B4', hallId: '1', hallName: 'Tầng 1', capacity: 6, status: 'EMPTY', orderItems: [] },
  { id: 'B5', name: 'B5', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'BILL_PRINTED', guestCount: 4, orderItems: [] },
  { id: 'VIP1', name: 'VIP 1', hallId: '2', hallName: 'Tầng 2 (VIP)', capacity: 10, status: 'EMPTY', orderItems: [] },
  { id: 'VIP2', name: 'VIP 2', hallId: '2', hallName: 'Tầng 2 (VIP)', capacity: 8, status: 'EMPTY', orderItems: [] }
];

export const EmulatorIntegratedTab: React.FC<EmulatorIntegratedTabProps> = ({
  selectedRestaurant,
  connectedHost,
  onToast
}) => {
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  // ── 3 CHẾ ĐỘ HOẠT ĐỘNG CHÍNH ──
  // 'co_customer': Tablet Khách Order | 'so_staff': Máy Nhân Viên Phục Vụ | 'image_center': Trung Tâm Xử Lý Ảnh
  const [activeMode, setActiveMode] = useState<'co_customer' | 'so_staff' | 'image_center'>('co_customer');

  // Phân hệ con của SO: 'table_map' (Sơ đồ bàn) | 'menu_order' (Menu POS) | 'delivered_dishes' (Món chờ bưng)
  const [soSubTab, setSoSubTab] = useState<'table_map' | 'menu_order' | 'delivered_dishes'>('table_map');

  // ── DỮ LIỆU CHUNG (SHARED STATE) ──
  const [tables, setTables] = useState<PosTableData[]>(INITIAL_TABLES);
  const [activeTableId, setActiveTableId] = useState<string>('B2');
  const [selectedHall, setSelectedHall] = useState<string>('Tầng 1');
  const [dishes, setDishes] = useState<DishItem[]>(FALLBACK_DISHES);
  const [loadingDishes, setLoadingDishes] = useState<boolean>(false);
  const [activeSuperType, setActiveSuperType] = useState<MenuSuperType>('all');
  const [activeGroup, setActiveGroup] = useState<string>('Tất cả nhóm');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // ── GIỎ HÀNG TABLET KHÁCH (CO) ──
  const [coCart, setCoCart] = useState<CoCartItem[]>([]);
  const [submittingCoOrder, setSubmittingCoOrder] = useState<boolean>(false);

  // ── MÓN CHỜ BƯNG (SO DELIVERED DISHES) ──
  const [deliveredDishes, setDeliveredDishes] = useState<DeliveredDishItem[]>([
    {
      id: 'del-1',
      tableName: 'Bàn B2',
      dishName: 'Ba chỉ bò Mỹ nướng sốt Tare',
      quantity: 2,
      lineCook: 'Quầy Nướng',
      doneTime: '11:38:15',
      waitMinutes: 3,
      status: 'waiting'
    },
    {
      id: 'del-2',
      tableName: 'Bàn B2',
      dishName: 'Trà trái cây nhiệt đới đào sả',
      quantity: 3,
      lineCook: 'Quầy Bar / Nước',
      doneTime: '11:40:02',
      waitMinutes: 1,
      status: 'waiting'
    }
  ]);

  // ── MODALS KHÁCH CO & PHỤC VỤ SO ──
  const [selectedDishDetail, setSelectedDishDetail] = useState<DishItem | null>(null);
  const [dishDetailQuantity, setDishDetailQuantity] = useState<number>(1);
  const [selectedDishNotes, setSelectedDishNotes] = useState<string[]>([]);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState<boolean>(false);
  const [showCallStaffModal, setShowCallStaffModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showTableActionModal, setShowTableActionModal] = useState<boolean>(false);
  const [tableActionType, setTableActionType] = useState<'open' | 'move' | 'merge' | 'bill'>('open');
  const [targetMoveTableId, setTargetMoveTableId] = useState<string>('');
  const [openGuestCount, setOpenGuestCount] = useState<number>(4);
  const [openServerName, setOpenServerName] = useState<string>('Nhân viên GGG');

  // ── PHÂN HỆ XỬ LÝ & ĐỐI SOÁT HÌNH ẢNH (TÍCH HỢP TỪ TAB 3) ──
  const [checkedDishImagesMap, setCheckedDishImagesMap] = useState<Record<string, CheckDishImageResult>>({});
  const [checkingDishId, setCheckingDishId] = useState<string | null>(null);
  const [checkingAllMenu, setCheckingAllMenu] = useState<boolean>(false);
  const [menuImagesSummary, setMenuImagesSummary] = useState<CheckMenuImagesResponse | null>(null);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // Jump search
  const [dishJumpQuery, setDishJumpQuery] = useState<string>('');
  const [highlightedDishId, setHighlightedDishId] = useState<string | null>(null);

  // SFTP Tra cứu toàn máy chủ (192.168.201.116)
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState<boolean>(false);
  const [globalSearchKeyword, setGlobalSearchKeyword] = useState<string>('');
  const [globalSearchRoot] = useState<string>('/opt/gpos/gmonitor/resources/menu');
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalImageSearchResultItem[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState<boolean>(false);
  const [globalSearchMessage, setGlobalSearchMessage] = useState<string>('');
  const [copiedGlobalPath, setCopiedGlobalPath] = useState<string | null>(null);

  // Đẩy & kiểm tra file dưới nhà hàng D:\GPOS-Setuppp\img\menu
  const [restaurantTargetFolder] = useState<string>('D:\\GPOS-Setup\\app\\img\\menu');
  const [restaurantFileStatus, setRestaurantFileStatus] = useState<Record<string, { exists: boolean; size: number }>>({});
  const [checkingRestaurantFiles, setCheckingRestaurantFiles] = useState<boolean>(false);
  const [pushingFileKey, setPushingFileKey] = useState<string | null>(null);
  const [bulkPushing, setBulkPushing] = useState<boolean>(false);

  // Cấu hình Image Server SFTP
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<UpdateImageServerConfigRequest>({
    server_type: 'SSH_SFTP',
    host: '192.168.201.116',
    port: 22,
    username: 'dung.na',
    password: '',
    remote_dir: '/opt/gpos/gmonitor/resources/menu',
    standard_prefix: '/resources/menu/'
  });
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestImageServerConnectionResponse | null>(null);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // Bàn đang chọn hiện tại
  const currentTable = useMemo(() => {
    return tables.find((t) => t.id === activeTableId) || tables[0];
  }, [tables, activeTableId]);

  // Sảnh bàn duy nhất
  const uniqueHalls = useMemo(() => {
    const s = new Set<string>();
    tables.forEach((t) => s.add(t.hallName));
    return Array.from(s);
  }, [tables]);

  // Bàn thuộc sảnh đang chọn
  const currentHallTables = useMemo(() => {
    return tables.filter((t) => t.hallName === selectedHall);
  }, [tables, selectedHall]);

  // ── ĐỒNG BỘ MONGODB NHÀ HÀNG (BÀN & MÓN THỰC TẾ) ──
  const syncWithMongo = useCallback(async (isManual: boolean = false) => {
    const raw = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) {
      if (isManual && onToastRef.current) {
        onToastRef.current('Chưa xác định IP kết nối MongoDB máy trạm nhà hàng!', 'info');
      }
      return;
    }

    try {
      setLoadingDishes(true);

      // 1. Tải thực đơn món từ MongoDB
      const res = await mongoService.loadMenuSoCoItems({
        host: cleanHost,
        search_all: true
      });

      if (res && res.items && res.items.length > 0) {
        const uniqueDishMap = new Map<string, DishItem>();
        res.items.forEach((it, idx) => {
          const rk7Str = String(it.rk7_code || '').trim();
          const sapStr = String(it.sap_code || '').trim();
          const groupClean = it.group_name ? it.group_name.trim() : 'Món Khác';
          const isDrink =
            it.level === 0 ||
            groupClean.toLowerCase().includes('uống') ||
            groupClean.toLowerCase().includes('nước') ||
            groupClean.toLowerCase().includes('bia') ||
            groupClean.toLowerCase().includes('giải khát');

          const dedupKey = `${groupClean.toLowerCase()}___${rk7Str.toLowerCase()}___${sapStr.toLowerCase()}___${(it.name || '').trim().toLowerCase()}___${it.price || 0}`;
          if (!uniqueDishMap.has(dedupKey)) {
            uniqueDishMap.set(dedupKey, {
              id: `${it.menu_code || ''}_${it.group_code || ''}_${rk7Str || sapStr || it.name}_${idx}`,
              name: it.name,
              menuCode: it.menu_code || '',
              price: it.price || 0,
              group: groupClean,
              groupCode: it.group_code || '',
              isDrink,
              rk7Code: rk7Str,
              sapCode: sapStr,
              imageUrl: it.image_url || undefined,
              srcImg: it.src_img || undefined,
              urlImgQr: it.url_img_qr || undefined,
              isHidden: it.is_so === false,
              isCo: it.is_co ?? it.group_is_co
            });
          }
        });

        const loaded = Array.from(uniqueDishMap.values());
        if (loaded.length > 0) setDishes(loaded);
      }

      // 2. Tải danh sách bàn từ MongoDB
      const reportRes = await mongoService.getTableReport({
        restaurant_id: selectedRestaurant?.id,
        host: cleanHost,
        split_by_hall: true
      });

      if (reportRes && reportRes.items && reportRes.items.length > 0) {
        let lockedTablesMap = new Map<string, LockedTableItem>();
        try {
          const lockRes = await mongoService.getLockedTables(cleanHost, 27017, selectedRestaurant?.id);
          if (lockRes && lockRes.locked_tables) {
            lockRes.locked_tables.forEach((lt) => {
              const k = (lt.table_name || '').trim().toLowerCase();
              if (k) lockedTablesMap.set(k, lt);
            });
          }
        } catch (e) {
          // ignore
        }

        const newTables: PosTableData[] = [];
        reportRes.items.forEach((item, hIdx) => {
          const hId = item.hall_id ?? (hIdx + 1);
          const hName = item.hall_name || `Khu ${hId}`;
          const tNames = item.table_names && item.table_names.length > 0
            ? item.table_names
            : (item.tables_sample ? item.tables_sample.split(',').map((s) => s.trim()).filter(Boolean) : []);

          tNames.forEach((tName) => {
            const cleanKey = tName.trim().toLowerCase();
            const lock = lockedTablesMap.get(cleanKey);
            newTables.push({
              id: tName,
              name: tName,
              hallId: hId,
              hallName: hName,
              capacity: tName.toLowerCase().includes('vip') ? 8 : 4,
              status: lock ? 'OCCUPIED' : 'EMPTY',
              serverName: lock?.locked_by_user_name || undefined,
              orderItems: []
            });
          });
        });

        if (newTables.length > 0) {
          setTables(newTables);
          if (!newTables.some((t) => t.hallName === selectedHall)) {
            setSelectedHall(newTables[0].hallName);
          }
        }
      }

      if (isManual && onToastRef.current) {
        onToastRef.current(`Đã đồng bộ thực tế từ MongoDB ${cleanHost}!`, 'success');
      }
    } catch (err) {
      console.warn('Lỗi đồng bộ MongoDB:', err);
      if (isManual && onToastRef.current) {
        onToastRef.current('Không kết nối được MongoDB trạm nhà hàng!', 'error');
      }
    } finally {
      setLoadingDishes(false);
    }
  }, [connectedHost, selectedRestaurant, selectedHall]);

  // Tự động nạp khi khởi tạo
  useEffect(() => {
    const cleanHost = getValidMongoHost(connectedHost || selectedRestaurant?.ip);
    if (cleanHost) {
      syncWithMongo(false);
    }
  }, [connectedHost, selectedRestaurant, syncWithMongo]);

  // Lọc món theo SuperType & Nhóm
  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    dishes.forEach((d) => {
      if (activeSuperType === 'all') s.add(d.group);
      else if (activeSuperType === 'alacarte' && d.price > 0 && !d.isDrink) s.add(d.group);
      else if (activeSuperType === 'buffet' && d.price === 0 && !d.isDrink) s.add(d.group);
      else if (activeSuperType === 'drink' && d.isDrink) s.add(d.group);
    });
    const list = Array.from(s);
    return ['Tất cả nhóm', ...list];
  }, [dishes, activeSuperType]);

  const displayedDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // SuperType
      if (activeSuperType === 'alacarte' && (dish.price === 0 || dish.isDrink)) return false;
      if (activeSuperType === 'buffet' && (dish.price > 0 || dish.isDrink)) return false;
      if (activeSuperType === 'drink' && !dish.isDrink) return false;

      // Group
      if (activeGroup !== 'Tất cả nhóm' && dish.group !== activeGroup) return false;

      // Search text
      if (menuSearch.trim()) {
        const q = menuSearch.trim().toLowerCase();
        const qNorm = removeVietnameseTones(menuSearch.trim());
        const matchName = dish.name.toLowerCase().includes(q) || removeVietnameseTones(dish.name).includes(qNorm);
        const matchRk7 = String(dish.rk7Code || '').toLowerCase().includes(q);
        const matchSap = String(dish.sapCode || '').toLowerCase().includes(q);
        if (!matchName && !matchRk7 && !matchSap) return false;
      }
      return true;
    });
  }, [dishes, activeSuperType, activeGroup, menuSearch]);

  // ── THAO TÁC GIỎ HÀNG KHÁCH (CO CART) ──
  const handleAddDishToCart = (dish: DishItem) => {
    setCoCart((prev) => {
      const idx = prev.findIndex((it) => it.dish.id === dish.id);
      if (idx >= 0) {
        return prev.map((it, i) => (i === idx ? { ...it, quantity: it.quantity + 1 } : it));
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          dish,
          quantity: 1,
          notes: ''
        }
      ];
    });
    if (onToastRef.current) {
      onToastRef.current(`Đã thêm "${dish.name}" vào giỏ gọi món!`, 'success');
    }
  };

  const handleUpdateCartQty = (dishId: string, delta: number) => {
    setCoCart((prev) => {
      return prev
        .map((it) => {
          if (it.dish.id === dishId) {
            const nextQty = it.quantity + delta;
            return nextQty > 0 ? { ...it, quantity: nextQty } : null;
          }
          return it;
        })
        .filter(Boolean) as CoCartItem[];
    });
  };

  const handleRemoveFromCart = (dishId: string) => {
    setCoCart((prev) => prev.filter((it) => it.dish.id !== dishId));
  };

  // Tính tổng tiền giỏ hàng CO
  const coCartSubtotal = useMemo(() => {
    return coCart.reduce((sum, it) => sum + it.quantity * it.dish.price, 0);
  }, [coCart]);

  // Gửi gọi món CO (submitOrder)
  const handleSubmitCoOrder = () => {
    if (coCart.length === 0) {
      if (onToastRef.current) onToastRef.current('Giỏ hàng chưa có món nào để gọi bếp!', 'error');
      return;
    }

    setSubmittingCoOrder(true);
    setTimeout(() => {
      // 1. Chuyển món từ cart vào orderItems của bàn
      const newOrderItems: OrderLineItem[] = coCart.map((it) => ({
        id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dishId: it.dish.id,
        name: it.dish.name,
        quantity: it.quantity,
        price: it.dish.price,
        rk7Code: it.dish.rk7Code,
        sapCode: it.dish.sapCode,
        status: 'sent'
      }));

      setTables((prev) =>
        prev.map((t) => {
          if (t.id !== activeTableId) return t;
          return {
            ...t,
            status: 'OCCUPIED',
            openTimeStr: t.openTimeStr || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            durationMinutes: t.durationMinutes || 1,
            guestCount: t.guestCount || 2,
            orderItems: [...t.orderItems, ...newOrderItems]
          };
        })
      );

      // 2. Thêm món vào danh sách món chờ bưng (SO DeliveredDishes) để phục vụ thấy
      const newDelivered: DeliveredDishItem[] = coCart.map((it, idx) => ({
        id: `del-${Date.now()}-${idx}`,
        tableName: currentTable.name,
        dishName: it.dish.name,
        quantity: it.quantity,
        lineCook: it.dish.group.toLowerCase().includes('nướng') ? 'Quầy Nướng' : 'Bếp Chính',
        doneTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        waitMinutes: 1,
        status: 'waiting' as const
      }));
      setDeliveredDishes((prev) => [...newDelivered, ...prev]);

      // Xóa giỏ hàng
      setCoCart([]);
      setSubmittingCoOrder(false);

      if (onToastRef.current) {
        onToastRef.current(`🚀 Đã gửi ${newOrderItems.length} món cho ${currentTable.name} tới Bếp & Bar thành công!`, 'success');
      }
    }, 600);
  };

  // Giục món khẩn
  const handleRushOrder = () => {
    if (onToastRef.current) {
      onToastRef.current(`🔔 Đã phát chuông DingDong giục món cho ${currentTable.name} lên KDS Bếp!`, 'success');
    }
  };

  // Gọi nhân viên phục vụ
  const handleCallStaff = (requestType: string) => {
    setShowCallStaffModal(false);
    if (onToastRef.current) {
      onToastRef.current(`🙋 Đã gửi yêu cầu "${requestType}" của ${currentTable.name} tới nhân viên phục vụ!`, 'success');
    }
  };

  // Hoàn tất thanh toán CO-Pay
  const handleConfirmPayment = () => {
    setShowPaymentModal(false);
    // Trả bàn về trạng thái EMPTY
    setTables((prev) =>
      prev.map((t) => (t.id === activeTableId ? { ...t, status: 'EMPTY', orderItems: [], guestCount: undefined } : t))
    );
    setCoCart([]);
    if (onToastRef.current) {
      onToastRef.current(`💳 Thanh toán thành công! ${currentTable.name} đã được trả về trạng thái trống.`, 'success');
    }
  };

  // ── THAO TÁC NHÂN VIÊN PHỤC VỤ (SO OPERATIONS) ──
  const handleOpenNewTable = () => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== activeTableId) return t;
        return {
          ...t,
          status: 'OCCUPIED',
          guestCount: openGuestCount,
          serverName: openServerName,
          openTimeStr: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: 1
        };
      })
    );
    setShowTableActionModal(false);
    if (onToastRef.current) {
      onToastRef.current(`Đã mở ${currentTable.name} với ${openGuestCount} khách!`, 'success');
    }
  };

  const handleMoveTable = () => {
    if (!targetMoveTableId || targetMoveTableId === activeTableId) {
      if (onToastRef.current) onToastRef.current('Vui lòng chọn bàn đích khác với bàn hiện tại!', 'error');
      return;
    }
    const sourceTable = currentTable;
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === sourceTable.id) {
          return { ...t, status: 'EMPTY', orderItems: [], guestCount: undefined };
        }
        if (t.id === targetMoveTableId) {
          return {
            ...t,
            status: 'OCCUPIED',
            guestCount: sourceTable.guestCount || 4,
            serverName: sourceTable.serverName,
            openTimeStr: sourceTable.openTimeStr,
            orderItems: [...t.orderItems, ...sourceTable.orderItems]
          };
        }
        return t;
      })
    );
    setActiveTableId(targetMoveTableId);
    setShowTableActionModal(false);
    if (onToastRef.current) {
      onToastRef.current(`Đã chuyển toàn bộ đơn từ ${sourceTable.name} sang ${targetMoveTableId}!`, 'success');
    }
  };

  const handlePrintBillPre = () => {
    setTables((prev) =>
      prev.map((t) => (t.id === activeTableId ? { ...t, status: 'BILL_PRINTED' } : t))
    );
    setShowTableActionModal(false);
    if (onToastRef.current) {
      onToastRef.current(`Đã in hóa đơn tạm tính cho ${currentTable.name}!`, 'success');
    }
  };

  const handleAcknowledgeDelivered = (item: DeliveredDishItem) => {
    setDeliveredDishes((prev) => prev.map((d) => (d.id === item.id ? { ...d, status: 'served' } : d)));
    if (onToastRef.current) {
      onToastRef.current(`✅ Đã bưng "${item.dishName}" ra ${item.tableName}!`, 'success');
    }
  };

  // ── PHÂN HỆ XỬ LÝ HÌNH ẢNH (IMAGE PROCESSING) ──
  const handleCheckSingleDish = async (dish: DishItem) => {
    setCheckingDishId(dish.id);
    try {
      const res = await mongoService.checkSingleDishImage({
        raw_path: dish.imageUrl || dish.srcImg || '',
        dish_name: dish.name,
        rk7_code: String(dish.rk7Code || ''),
        sap_code: dish.sapCode
      });
      setCheckedDishImagesMap((prev) => ({ ...prev, [dish.id]: res }));
      if (onToastRef.current) {
        onToastRef.current(
          res.is_match
            ? `✓ Ảnh món "${dish.name}" khớp 100% với SFTP Server!`
            : `⚠ Ảnh món "${dish.name}" bị sai lệch: ${res.message || 'Không tìm thấy file'}`,
          res.is_match ? 'success' : 'error'
        );
      }
    } catch (e) {
      if (onToastRef.current) onToastRef.current(`Không kiểm tra được ảnh cho "${dish.name}"!`, 'error');
    } finally {
      setCheckingDishId(null);
    }
  };

  const handleCheckAllMenuImages = async () => {
    const raw = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP kết nối MongoDB máy trạm!', 'error');
      return;
    }
    if (dishes.length === 0) return;
    setCheckingAllMenu(true);
    try {
      const items = dishes.map((d) => ({
        dish_id: d.id,
        rk7_code: String(d.rk7Code || ''),
        sap_code: d.sapCode,
        name: d.name,
        current_image_url: d.imageUrl || d.srcImg
      }));

      const res = await mongoService.checkMenuDishImages({
        host: cleanHost,
        menu_code: dishes[0]?.menuCode || 'default',
        dishes: items
      });

      setMenuImagesSummary(res);
      const newMap: Record<string, CheckDishImageResult> = {};
      if (res.results) {
        res.results.forEach((r) => {
          if (r.dish_id) newMap[r.dish_id] = r;
        });
      }
      setCheckedDishImagesMap((prev) => ({ ...prev, ...newMap }));

      const mismatchedCount = (res.not_found_count || 0) + (res.prefix_mismatch_count || 0) + (res.case_mismatch_count || 0);
      if (onToastRef.current) {
        onToastRef.current(`Đã kiểm tra ${res.total_dishes} món: ${res.match_count} khớp, ${mismatchedCount} sai lệch!`, 'success');
      }
    } catch (e) {
      if (onToastRef.current) onToastRef.current('Lỗi khi kiểm tra toàn bộ ảnh thực đơn!', 'error');
    } finally {
      setCheckingAllMenu(false);
    }
  };

  const handleScanRestaurantFiles = async () => {
    const raw = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP máy trạm nhà hàng!', 'error');
      return;
    }
    setCheckingRestaurantFiles(true);
    try {
      const fileNames = dishes.map((d) => d.localFileName || `${d.sapCode || d.rk7Code}.jpg`).filter(Boolean);
      const res = await mongoService.checkRestaurantFiles({
        target_ip: cleanHost,
        target_folder: restaurantTargetFolder,
        filenames: fileNames
      });
      if (res && res.results) {
        setRestaurantFileStatus(res.results);
        const existingCount = Object.values(res.results).filter((f) => f.exists).length;
        if (onToastRef.current) {
          onToastRef.current(`Đã quét thư mục ${restaurantTargetFolder} trên ${cleanHost}: ${existingCount}/${fileNames.length} file tồn tại!`, 'success');
        }
      }
    } catch (e) {
      if (onToastRef.current) onToastRef.current('Không quét được thư mục ảnh trên máy trạm nhà hàng!', 'error');
    } finally {
      setCheckingRestaurantFiles(false);
    }
  };

  const handleSyncSingleDish = async (dish: DishItem) => {
    const raw = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP máy trạm nhà hàng!', 'error');
      return;
    }
    setPushingFileKey(dish.id);
    try {
      const res = await mongoService.pushImageToRestaurant({
        target_ip: cleanHost,
        target_folder: restaurantTargetFolder,
        remote_source_path: dish.imageUrl || '',
        filename: dish.localFileName || `${dish.sapCode || dish.rk7Code}.jpg`
      });
      if (res.success) {
        if (onToastRef.current) onToastRef.current(`Đã đẩy ảnh cho món "${dish.name}" xuống máy trạm thành công!`, 'success');
      } else {
        if (onToastRef.current) onToastRef.current(`Lỗi đẩy ảnh: ${res.message}`, 'error');
      }
    } catch (e) {
      if (onToastRef.current) onToastRef.current(`Lỗi kết nối khi đẩy ảnh món "${dish.name}"!`, 'error');
    } finally {
      setPushingFileKey(null);
    }
  };

  const handleBulkPush = async () => {
    const raw = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP máy trạm nhà hàng!', 'error');
      return;
    }
    setBulkPushing(true);
    try {
      const filesToPush = dishes
        .filter((d) => d.imageUrl && (!restaurantFileStatus[d.localFileName || ''] || !restaurantFileStatus[d.localFileName || ''].exists))
        .map((d) => ({
          remote_source_path: d.imageUrl || '',
          filename: d.localFileName || `${d.sapCode || d.rk7Code}.jpg`
        }));

      if (filesToPush.length === 0) {
        if (onToastRef.current) onToastRef.current('Toàn bộ file ảnh đã có sẵn dưới trạm!', 'info');
        setBulkPushing(false);
        return;
      }

      const res = await mongoService.bulkPushImagesToRestaurant({
        target_ip: cleanHost,
        target_folder: restaurantTargetFolder,
        items: filesToPush
      });

      if (onToastRef.current) {
        onToastRef.current(`Đã đẩy hàng loạt: ${res.total_success}/${res.total_requested} file ảnh xuống máy trạm!`, 'success');
      }
    } catch (e) {
      if (onToastRef.current) onToastRef.current('Lỗi khi đẩy hàng loạt file ảnh!', 'error');
    } finally {
      setBulkPushing(false);
    }
  };

  const handleExportExcel = async () => {
    const raw = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP trạm nhà hàng!', 'error');
      return;
    }
    setExportingExcel(true);
    try {
      const items = dishes.map((d) => ({
        dish_id: d.id,
        rk7_code: String(d.rk7Code || ''),
        sap_code: d.sapCode,
        name: d.name,
        current_image_url: d.imageUrl || d.srcImg
      }));
      const res = await mongoService.exportMismatchedDishesExcel({
        host: cleanHost,
        menu_code: dishes[0]?.menuCode || 'default',
        restaurant_name: selectedRestaurant?.res || undefined,
        dishes: items
      });
      // Tải blob
      const url = window.URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename || 'Doi_Soat_Hinh_Anh.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      if (onToastRef.current) onToastRef.current('Đã xuất file Excel danh sách đối soát hình ảnh!', 'success');
    } catch (e) {
      if (onToastRef.current) onToastRef.current('Lỗi khi xuất file Excel!', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  // Tra cứu ảnh toàn máy chủ SFTP
  const handleGlobalSearch = async () => {
    if (!globalSearchKeyword.trim()) return;
    setGlobalSearchLoading(true);
    setGlobalSearchMessage('');
    try {
      const res = await mongoService.searchGlobalServerImages({
        keyword: globalSearchKeyword.trim(),
        search_root: globalSearchRoot,
        limit: 50
      });
      setGlobalSearchResults(res.results || []);
      setGlobalSearchMessage(res.keyword ? `Tìm thấy ${res.results?.length || 0} file ảnh.` : '');
    } catch (e) {
      setGlobalSearchMessage('Lỗi tra cứu ảnh trên máy chủ SFTP.');
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  // Cấu hình Image Server SFTP
  const handleOpenConfigModal = async () => {
    setShowConfigModal(true);
    try {
      const cfg = await mongoService.getImageServerConfig();
      if (cfg) {
        setConfigForm({
          server_type: cfg.server_type || 'SSH_SFTP',
          host: cfg.host || '192.168.201.116',
          port: cfg.port || 22,
          username: cfg.username || 'dung.na',
          remote_dir: cfg.remote_dir || '/opt/gpos/gmonitor/resources/menu',
          standard_prefix: cfg.standard_prefix || '/resources/menu/'
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await mongoService.testImageServerConnection({
        server_type: configForm.server_type || 'SSH_SFTP',
        host: configForm.host,
        port: configForm.port,
        username: configForm.username,
        password: configForm.password || '',
        remote_dir: configForm.remote_dir
      });
      setTestResult(res);
      if (onToastRef.current) {
        onToastRef.current(res.success ? '✓ Kết nối SFTP Server thành công!' : `✕ Lỗi kết nối SFTP: ${res.message}`, res.success ? 'success' : 'error');
      }
    } catch (e) {
      if (onToastRef.current) onToastRef.current('Lỗi kiểm tra kết nối SFTP Server!', 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await mongoService.saveImageServerConfig(configForm);
      setShowConfigModal(false);
      if (onToastRef.current) onToastRef.current('Đã lưu cấu hình máy chủ ảnh SFTP thành công!', 'success');
    } catch (e) {
      if (onToastRef.current) onToastRef.current('Lỗi lưu cấu hình SFTP!', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Jump to dish
  const handleJumpToDish = (dish: DishItem) => {
    setHighlightedDishId(dish.id);
    setDishJumpQuery('');
    setTimeout(() => {
      const el = document.getElementById(`dish-card-${dish.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightedDishId(null), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '650px' }}>
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* HEADER TAB 4: THÔNG TIN TRẠM & CHỌN CHẾ ĐỘ HOẠT ĐỘNG           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
              {selectedRestaurant?.res || 'Chuỗi Nhà Hàng Golden Gate'}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontWeight: 700
              }}
            >
              Mã RK7: {selectedRestaurant?.rk7_code || '---'}
            </span>
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#dcfce7',
                color: '#166534',
                fontWeight: 700
              }}
            >
              IP: {connectedHost || selectedRestaurant?.ip || '10.8.x.11'}
            </span>
          </div>

          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            ({tables.length} bàn | {dishes.length} món trong menu)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncWithMongo(true)}
            leftIcon={loadingDishes ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          >
            Đồng bộ MongoDB
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenConfigModal}
            leftIcon={<Settings size={13} />}
          >
            Cấu hình SFTP
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* THANH ĐIỀU HƯỚNG 3 CHẾ ĐỘ LỚN (MODE SELECTOR)                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          backgroundColor: '#f8fafc',
          padding: '6px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Chế độ 1: CO Tablet */}
        <button
          type="button"
          onClick={() => setActiveMode('co_customer')}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: activeMode === 'co_customer' ? '2px solid #ea580c' : '1px solid transparent',
            backgroundColor: activeMode === 'co_customer' ? '#ffffff' : 'transparent',
            boxShadow: activeMode === 'co_customer' ? '0 2px 6px rgba(234, 88, 12, 0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Smartphone size={20} color={activeMode === 'co_customer' ? '#ea580c' : '#64748b'} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: activeMode === 'co_customer' ? '#ea580c' : '#334155' }}>
              1. Giả Lập Khách Chọn Món (CO Tablet)
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Gọi món submitOrder(), giục món, QR Pay, giỏ hàng
            </div>
          </div>
        </button>

        {/* Chế độ 2: SO Staff */}
        <button
          type="button"
          onClick={() => setActiveMode('so_staff')}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: activeMode === 'so_staff' ? '2px solid #059669' : '1px solid transparent',
            backgroundColor: activeMode === 'so_staff' ? '#ffffff' : 'transparent',
            boxShadow: activeMode === 'so_staff' ? '0 2px 6px rgba(5, 150, 105, 0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={20} color={activeMode === 'so_staff' ? '#059669' : '#64748b'} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: activeMode === 'so_staff' ? '#059669' : '#334155' }}>
              2. Giả Lập Máy Phục Vụ (Staff Order SO)
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Sơ đồ bàn, mở/đổi/ghép bàn, in bill tạm, bưng món
            </div>
          </div>
        </button>

        {/* Chế độ 3: Image Center */}
        <button
          type="button"
          onClick={() => setActiveMode('image_center')}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            border: activeMode === 'image_center' ? '2px solid #2563eb' : '1px solid transparent',
            backgroundColor: activeMode === 'image_center' ? '#ffffff' : 'transparent',
            boxShadow: activeMode === 'image_center' ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ImageIcon size={20} color={activeMode === 'image_center' ? '#2563eb' : '#64748b'} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: activeMode === 'image_center' ? '#2563eb' : '#334155' }}>
              3. Trung Tâm Xử Lý & Đối Soát Ảnh
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Kiểm tra SFTP, đẩy ảnh xuống trạm, xuất Excel
            </div>
          </div>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 1. NỘI DUNG CHẾ ĐỘ 1: TABLET KHÁCH CHỌN MÓN (CO TABLET)         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeMode === 'co_customer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>
          {/* CỘT TRÁI: GIAO DIỆN TABLET CO CỦA KHÁCH */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            {/* Top Bar Tablet Khách: Logo, Chọn Bàn, Giục Món, Gọi Phục Vụ, Thanh Toán */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingBottom: '12px',
                borderBottom: '1px solid #f1f5f9'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    backgroundColor: '#ea580c',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Utensils size={15} />
                  <span>{currentTable.name}</span>
                </div>

                <select
                  value={activeTableId}
                  onChange={(e) => setActiveTableId(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer'
                  }}
                  title="Đổi sang bàn khác"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Bàn {t.name} ({t.hallName} - {t.status})
                    </option>
                  ))}
                </select>

                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  👥 {currentTable.guestCount || 2} Khách | ⏱️ {currentTable.durationMinutes || 25} phút
                </span>
              </div>

              {/* 4 Nút tương tác khách: Giục Món Khẩn | Gọi Nhân Viên | Món Đã Gọi | Thanh Toán */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRushOrder}
                  leftIcon={<Bell size={13} color="#ea580c" />}
                  style={{ color: '#ea580c', borderColor: '#fdba74' }}
                >
                  Giục Món Khẩn
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCallStaffModal(true)}
                  leftIcon={<Users size={13} />}
                >
                  Gọi Nhân Viên
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOrderHistoryModal(true)}
                  leftIcon={<Clock size={13} />}
                >
                  Món Đã Gọi ({currentTable.orderItems.length})
                </Button>

                <Button
                  size="sm"
                  onClick={() => setShowPaymentModal(true)}
                  leftIcon={<CreditCard size={13} />}
                  style={{ backgroundColor: '#F5B800', color: '#0F172A', fontWeight: 700 }}
                >
                  CO-Pay (QR)
                </Button>
              </div>
            </div>

            {/* Thanh Phân Loại Menu: Tất Cả / Alacarte / Buffet 0đ / Đồ Uống */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {(['all', 'alacarte', 'buffet', 'drink'] as MenuSuperType[]).map((st) => {
                  const label =
                    st === 'all'
                      ? 'Tất Cả Món'
                      : st === 'alacarte'
                      ? 'Thực Đơn Alacarte'
                      : st === 'buffet'
                      ? 'Buffet (Món 0đ)'
                      : 'Đồ Uống & Tráng Miệng';
                  const isAct = activeSuperType === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setActiveSuperType(st)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: isAct ? 700 : 500,
                        backgroundColor: isAct ? '#1e293b' : '#f1f5f9',
                        color: isAct ? '#ffffff' : '#475569',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Ô tìm kiếm món */}
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  placeholder="Tìm món, mã SAP, RK7..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Thanh cuộn nhóm món ngang */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                paddingBottom: '4px'
              }}
            >
              {availableGroups.map((grp) => {
                const isAct = activeGroup === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setActiveGroup(grp)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      fontWeight: isAct ? 700 : 500,
                      backgroundColor: isAct ? '#ea580c' : '#ffffff',
                      color: isAct ? '#ffffff' : '#334155',
                      border: isAct ? '1px solid #ea580c' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>

            {/* Lưới các món ăn CO */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
                maxHeight: '520px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {displayedDishes.map((dish) => {
                const isHighlighted = highlightedDishId === dish.id;
                const cartEntry = coCart.find((c) => c.dish.id === dish.id);
                const hasCheck = checkedDishImagesMap[dish.id];

                return (
                  <div
                    key={dish.id}
                    id={`dish-card-${dish.id}`}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: isHighlighted
                        ? '2px solid #F5B800'
                        : cartEntry
                        ? '1.5px solid #ea580c'
                        : '1px solid #e2e8f0',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isHighlighted ? '0 0 12px rgba(245, 184, 0, 0.4)' : '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Ảnh món */}
                    <div
                      style={{
                        position: 'relative',
                        height: '115px',
                        backgroundColor: '#f1f5f9',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedDishDetail(dish);
                        setDishDetailQuantity(1);
                        setSelectedDishNotes([]);
                      }}
                    >
                      {dish.imageUrl ? (
                        <img
                          src={dish.imageUrl}
                          alt={dish.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#94a3b8'
                          }}
                        >
                          <Utensils size={32} />
                        </div>
                      )}

                      {/* Badge giá 0đ hoặc Buffet */}
                      {dish.price === 0 && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                        >
                          Buffet 0đ
                        </span>
                      )}

                      {/* Nút check SFTP nhanh ngay trên ảnh */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckSingleDish(dish);
                        }}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          backgroundColor: hasCheck ? (hasCheck.is_match ? '#dcfce7' : '#fee2e2') : 'rgba(0,0,0,0.6)',
                          color: hasCheck ? (hasCheck.is_match ? '#166534' : '#991b1b') : '#ffffff',
                          border: 'none',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="Kiểm tra file ảnh trên SFTP Server 192.168.201.116"
                      >
                        {checkingDishId === dish.id ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : hasCheck ? (
                          hasCheck.is_match ? <Check size={10} /> : <AlertTriangle size={10} />
                        ) : (
                          <ImageIcon size={10} />
                        )}
                        <span>{hasCheck ? (hasCheck.is_match ? 'Khớp' : 'Lỗi ảnh') : 'Check SFTP'}</span>
                      </button>
                    </div>

                    {/* Thông tin món */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.3,
                          height: '34px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}
                        title={dish.name}
                      >
                        {dish.name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          SAP: {dish.sapCode || '---'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: dish.price === 0 ? '#059669' : '#ea580c' }}>
                          {dish.price === 0 ? '0 đ' : `${dish.price.toLocaleString()} đ`}
                        </span>
                      </div>

                      {/* Nút hành động thêm vào giỏ */}
                      <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                        {cartEntry ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: '#fef2f2',
                              borderRadius: '6px',
                              padding: '2px 6px',
                              border: '1px solid #fecaca'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(dish.id, -1)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '3px'
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#dc2626' }}>
                              {cartEntry.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(dish.id, 1)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#dc2626',
                                cursor: 'pointer',
                                padding: '3px'
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddDishToCart(dish)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#f8fafc',
                              color: '#0f172a',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <Plus size={13} />
                            <span>Gọi món</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: GIỎ HÀNG GỌI MÓN CO (CART DRAWER) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} color="#ea580c" />
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Giỏ Gọi Món ({coCart.length})
                </span>
              </div>
              {coCart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoCart([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Xóa tất cả
                </button>
              )}
            </div>

            {/* Danh sách món trong giỏ */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '340px',
                overflowY: 'auto',
                minHeight: '160px'
              }}
            >
              {coCart.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '30px 10px',
                    color: '#94a3b8',
                    gap: '8px',
                    textAlign: 'center'
                  }}
                >
                  <ShoppingBag size={32} />
                  <span style={{ fontSize: '13px' }}>Chưa có món nào được chọn. Hãy bấm "+ Gọi món" bên trái!</span>
                </div>
              ) : (
                coCart.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                        {item.dish.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.dish.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {item.dish.price === 0 ? '0 đ' : `${(item.dish.price * item.quantity).toLocaleString()} đ`}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.dish.id, -1)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Minus size={11} />
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 800 }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.dish.id, 1)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tính tiền tạm tính */}
            <div
              style={{
                borderTop: '1px solid #f1f5f9',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Tạm tính ({coCart.length} món):</span>
                <span>{coCartSubtotal.toLocaleString()} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Thuế VAT (8%):</span>
                <span>{Math.round(coCartSubtotal * 0.08).toLocaleString()} đ</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0f172a',
                  borderTop: '1px dashed #e2e8f0',
                  paddingTop: '6px'
                }}
              >
                <span>Tổng gọi đợt này:</span>
                <span style={{ color: '#ea580c' }}>
                  {Math.round(coCartSubtotal * 1.08).toLocaleString()} đ
                </span>
              </div>
            </div>

            {/* Nút gửi order (submitOrder) */}
            <button
              type="button"
              disabled={coCart.length === 0 || submittingCoOrder}
              onClick={handleSubmitCoOrder}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: coCart.length === 0 ? '#cbd5e1' : '#F5B800',
                color: coCart.length === 0 ? '#64748b' : '#0F172A',
                border: 'none',
                fontSize: '14px',
                fontWeight: 800,
                cursor: coCart.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: coCart.length > 0 ? '0 2px 6px rgba(245, 184, 0, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {submittingCoOrder ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>GỬI GỌI MÓN (submitOrder)</span>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 2. NỘI DUNG CHẾ ĐỘ 2: MÁY PHỤC VỤ (STAFF ORDER SO)              */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeMode === 'so_staff' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Thanh chuyển đổi tác vụ SO: Sơ đồ bàn | Menu POS | Món chờ bưng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSoSubTab('table_map')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: soSubTab === 'table_map' ? 700 : 500,
                  backgroundColor: soSubTab === 'table_map' ? '#059669' : '#f1f5f9',
                  color: soSubTab === 'table_map' ? '#ffffff' : '#334155',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                1. Sơ Đồ Bàn Theo Khu ({tables.length} bàn)
              </button>

              <button
                type="button"
                onClick={() => setSoSubTab('menu_order')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: soSubTab === 'menu_order' ? 700 : 500,
                  backgroundColor: soSubTab === 'menu_order' ? '#059669' : '#f1f5f9',
                  color: soSubTab === 'menu_order' ? '#ffffff' : '#334155',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                2. Menu Gọi Món Phục Vụ (Bàn {currentTable.name})
              </button>

              <button
                type="button"
                onClick={() => setSoSubTab('delivered_dishes')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: soSubTab === 'delivered_dishes' ? 700 : 500,
                  backgroundColor: soSubTab === 'delivered_dishes' ? '#059669' : '#f1f5f9',
                  color: soSubTab === 'delivered_dishes' ? '#ffffff' : '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>3. Bảng Món Chờ Bưng (KDS Done)</span>
                {deliveredDishes.filter((d) => d.status === 'waiting').length > 0 && (
                  <span
                    style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: '#ef4444',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800
                    }}
                  >
                    {deliveredDishes.filter((d) => d.status === 'waiting').length}
                  </span>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTableActionType('open');
                  setShowTableActionModal(true);
                }}
                leftIcon={<Users size={13} />}
              >
                Mở Bàn Mới
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTableActionType('move');
                  setShowTableActionModal(true);
                }}
                leftIcon={<ArrowRightLeft size={13} />}
              >
                Đổi / Ghép Bàn
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintBillPre}
                leftIcon={<FileSpreadsheet size={13} />}
              >
                In Tạm Tính
              </Button>
            </div>
          </div>

          {/* SUB-TAB 1: SƠ ĐỒ BÀN */}
          {soSubTab === 'table_map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Chọn Sảnh */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {uniqueHalls.map((hall) => {
                  const isAct = selectedHall === hall;
                  return (
                    <button
                      key={hall}
                      type="button"
                      onClick={() => setSelectedHall(hall)}
                      style={{
                        padding: '6px 18px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: isAct ? 700 : 500,
                        backgroundColor: isAct ? '#1e3a5f' : '#f1f5f9',
                        color: isAct ? '#ffffff' : '#334155',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {hall}
                    </button>
                  );
                })}
              </div>

              {/* Lưới các thẻ bàn */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '12px'
                }}
              >
                {currentHallTables.map((table) => {
                  const isSelected = table.id === activeTableId;
                  const isOccupied = table.status === 'OCCUPIED';
                  const isBillPrinted = table.status === 'BILL_PRINTED';

                  return (
                    <div
                      key={table.id}
                      onClick={() => setActiveTableId(table.id)}
                      style={{
                        height: '130px',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        border: isSelected
                          ? '2px solid #059669'
                          : isOccupied
                          ? '2px solid #ea580c'
                          : isBillPrinted
                          ? '2px solid #2563eb'
                          : '1px solid #cbd5e1',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 2px 8px rgba(5, 150, 105, 0.2)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          Bàn {table.name}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            backgroundColor: isOccupied ? '#fef3c7' : isBillPrinted ? '#dbeafe' : '#f1f5f9',
                            color: isOccupied ? '#92400e' : isBillPrinted ? '#1e40af' : '#64748b'
                          }}
                        >
                          {table.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {isOccupied ? (
                          <>
                            <div>👥 Khách: {table.guestCount || 4} người</div>
                            <div>🍽️ Đã gọi: {table.orderItems.length} món</div>
                          </>
                        ) : (
                          <div>Sức chứa: {table.capacity} khách</div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {table.serverName ? `NV: ${table.serverName}` : 'Chưa gán NV'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTableId(table.id);
                            setSoSubTab('menu_order');
                          }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Vào Menu
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: MENU GỌI MÓN POS */}
          {soSubTab === 'menu_order' && (
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '14px', alignItems: 'start' }}>
              {/* Cột trái: Đơn món hiện tại của bàn */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Đơn Món: Bàn {currentTable.name}
                  </span>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                    {currentTable.orderItems.length} món
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '360px', overflowY: 'auto' }}>
                  {currentTable.orderItems.length === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Bàn này chưa có món nào trong đơn.
                    </div>
                  ) : (
                    currentTable.orderItems.map((it) => (
                      <div
                        key={it.id}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{it.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            SL: {it.quantity} | {it.price === 0 ? '0 đ' : `${(it.price * it.quantity).toLocaleString()} đ`}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: it.status === 'served' ? '#dcfce7' : '#fef3c7',
                            color: it.status === 'served' ? '#166534' : '#92400e',
                            fontWeight: 700
                          }}
                        >
                          {it.status === 'served' ? 'Đã bưng' : 'Đã gửi bếp'}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800 }}>
                  <span>Tổng tiền bàn:</span>
                  <span style={{ color: '#059669' }}>
                    {currentTable.orderItems.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString()} đ
                  </span>
                </div>
              </div>

              {/* Cột phải: Lưới món ăn phục vụ chọn thêm */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    Chọn món nhanh cho {currentTable.name}
                  </span>
                  <div style={{ width: '220px' }}>
                    <input
                      type="text"
                      placeholder="Tìm món, mã RK7..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                    gap: '10px',
                    maxHeight: '440px',
                    overflowY: 'auto'
                  }}
                >
                  {displayedDishes.slice(0, 30).map((dish) => (
                    <div
                      key={dish.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', height: '32px', overflow: 'hidden' }}>
                        {dish.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                          {dish.price === 0 ? '0 đ' : `${dish.price.toLocaleString()} đ`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            // Thêm trực tiếp vào đơn bàn
                            setTables((prev) =>
                              prev.map((t) => {
                                if (t.id !== activeTableId) return t;
                                return {
                                  ...t,
                                  status: 'OCCUPIED',
                                  orderItems: [
                                    ...t.orderItems,
                                    {
                                      id: `so-${Date.now()}`,
                                      dishId: dish.id,
                                      name: dish.name,
                                      quantity: 1,
                                      price: dish.price,
                                      rk7Code: dish.rk7Code,
                                      sapCode: dish.sapCode,
                                      status: 'sent'
                                    }
                                  ]
                                };
                              })
                            );
                            if (onToastRef.current) {
                              onToastRef.current(`Đã thêm "${dish.name}" vào đơn của ${currentTable.name}!`, 'success');
                            }
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          + Thêm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: BẢNG MÓN CHỜ BƯNG */}
          {soSubTab === 'delivered_dishes' && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ChefHat size={18} color="#059669" />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Danh Sách Món Bếp KDS Vừa Bấm Hoàn Thành (Cần Phục Vụ Bưng Ra Bàn)
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Tự động cập nhật thời gian thực từ MQTT / KDS
                </span>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Bàn Ăn</th>
                      <th style={{ padding: '8px 12px' }}>Món Ăn</th>
                      <th style={{ padding: '8px 12px' }}>Số Lượng</th>
                      <th style={{ padding: '8px 12px' }}>Quầy Bếp Xong</th>
                      <th style={{ padding: '8px 12px' }}>Giờ Xong</th>
                      <th style={{ padding: '8px 12px' }}>Chờ Bưng</th>
                      <th style={{ padding: '8px 12px' }}>Thao Tác Phục Vụ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredDishes.map((del) => (
                      <tr
                        key={del.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: del.status === 'served' ? '#f8fafc' : '#ffffff'
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>
                          {del.tableName}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{del.dishName}</td>
                        <td style={{ padding: '8px 12px' }}>{del.quantity}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{del.lineCook}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{del.doneTime}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: del.waitMinutes > 2 ? '#fee2e2' : '#dcfce7',
                              color: del.waitMinutes > 2 ? '#991b1b' : '#166534',
                              fontWeight: 700
                            }}
                          >
                            {del.waitMinutes} phút
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {del.status === 'served' ? (
                            <span style={{ color: '#059669', fontWeight: 700 }}>✓ Đã bưng</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcknowledgeDelivered(del)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                backgroundColor: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              ✅ Xác Nhận Đã Bưng
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* 3. NỘI DUNG CHẾ ĐỘ 3: TRUNG TÂM XỬ LÝ & ĐỐI SOÁT ẢNH (TAB 3)    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeMode === 'image_center' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Thanh công cụ Xử lý ảnh: Check All / Tra Cứu Toàn Cục / Quét Trạm / Đẩy Hàng Loạt / Xuất Excel */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCheckAllMenuImages}
                leftIcon={checkingAllMenu ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                Kiểm Tra Toàn Bộ Ảnh Menu ({dishes.length} món)
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowGlobalSearchModal(true)}
                leftIcon={<Search size={13} />}
              >
                Tra Cứu Ảnh Toàn Máy Chủ SFTP
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleScanRestaurantFiles}
                leftIcon={checkingRestaurantFiles ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              >
                Quét Thư Mục Máy Trạm (D:\GPOS-Setup)
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkPush}
                leftIcon={bulkPushing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              >
                Đẩy Hàng Loạt Ảnh Lỗi Xuống Trạm
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                leftIcon={exportingExcel ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />}
              >
                Xuất Excel Đối Soát
              </Button>
            </div>

            {/* Jump to dish */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Nhảy tới món:</span>
              <input
                type="text"
                placeholder="Gõ tên, SAP, RK7..."
                value={dishJumpQuery}
                onChange={(e) => setDishJumpQuery(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  width: '160px'
                }}
              />
              {dishJumpQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const match = dishes.find(
                      (d) =>
                        d.name.toLowerCase().includes(dishJumpQuery.toLowerCase()) ||
                        String(d.sapCode || '').toLowerCase().includes(dishJumpQuery.toLowerCase()) ||
                        String(d.rk7Code || '').toLowerCase().includes(dishJumpQuery.toLowerCase())
                    );
                    if (match) handleJumpToDish(match);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#1e293b',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Tìm
                </button>
              )}
            </div>
          </div>

          {/* Thẻ Thống Kê Tổng Quan Ảnh */}
          {menuImagesSummary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                backgroundColor: '#ffffff',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{menuImagesSummary.total_dishes}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Tổng số món kiểm tra</div>
              </div>
              <div style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>{menuImagesSummary.match_count}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Ảnh khớp 100% trên SFTP</div>
              </div>
              <div style={{ textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>
                  {(menuImagesSummary.not_found_count || 0) + (menuImagesSummary.prefix_mismatch_count || 0) + (menuImagesSummary.case_mismatch_count || 0)}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Ảnh sai khác / lỗi tên file</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563eb' }}>
                  {Object.keys(restaurantFileStatus).length > 0
                    ? `${Object.values(restaurantFileStatus).filter((f) => f.exists).length}/${dishes.length}`
                    : 'Chưa quét'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Đã có trên ổ D: trạm</div>
              </div>
            </div>
          )}

          {/* Bảng Chi Tiết Đối Soát Hình Ảnh Thực Đơn */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ padding: '10px 14px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                Bảng Đối Soát Món Ăn & Hình Ảnh SFTP (Máy Chủ 192.168.201.116)
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Thư mục đích trạm: <code>{restaurantTargetFolder}</code>
              </span>
            </div>

            <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 5, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '8px 12px', width: '50px' }}>STT</th>
                    <th style={{ padding: '8px 12px' }}>Tên Món Ăn</th>
                    <th style={{ padding: '8px 12px', width: '90px' }}>Mã SAP</th>
                    <th style={{ padding: '8px 12px', width: '80px' }}>Mã RK7</th>
                    <th style={{ padding: '8px 12px', width: '130px' }}>Nhóm Món</th>
                    <th style={{ padding: '8px 12px', width: '90px' }}>Giá Bán</th>
                    <th style={{ padding: '8px 12px' }}>Trạng Thái SFTP</th>
                    <th style={{ padding: '8px 12px', width: '110px' }}>Ổ D: Máy Trạm</th>
                    <th style={{ padding: '8px 12px', width: '160px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedDishes.map((dish, idx) => {
                    const checkResult = checkedDishImagesMap[dish.id];
                    const isMatched = checkResult?.is_match;
                    const rFile = restaurantFileStatus[dish.localFileName || `${dish.sapCode || dish.rk7Code}.jpg`];

                    return (
                      <tr
                        key={dish.id}
                        id={`dish-table-row-${dish.id}`}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: highlightedDishId === dish.id ? '#fef3c7' : '#ffffff'
                        }}
                      >
                        <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{idx + 1}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a' }}>
                          {dish.name}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{dish.sapCode || '---'}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{dish.rk7Code || '---'}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{dish.group}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: dish.price === 0 ? '#059669' : '#0f172a' }}>
                          {dish.price === 0 ? '0 đ' : `${dish.price.toLocaleString()} đ`}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {checkResult ? (
                            isMatched ? (
                              <span style={{ color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckCircle2 size={13} /> Khớp 100%
                              </span>
                            ) : (
                              <span style={{ color: '#dc2626', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={13} /> {checkResult.message || 'Sai file'}
                              </span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa check</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {rFile ? (
                            rFile.exists ? (
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ Đã có</span>
                            ) : (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>✕ Thiếu</span>
                            )
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Chưa quét</span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleCheckSingleDish(dish)}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                              title="Check SFTP"
                            >
                              Check
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSyncSingleDish(dish)}
                              disabled={pushingFileKey === dish.id}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                              title="Đẩy file ảnh xuống máy trạm"
                            >
                              {pushingFileKey === dish.id ? 'Đang đẩy...' : 'Đẩy trạm'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: XEM CHI TIẾT MÓN ĂN CO                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {selectedDishDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDishDetail(null)}
          title={`Chi Tiết Món Ăn: ${selectedDishDetail.name}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                height: '180px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedDishDetail.imageUrl ? (
                <img
                  src={selectedDishDetail.imageUrl}
                  alt={selectedDishDetail.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Utensils size={48} color="#94a3b8" />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{selectedDishDetail.name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  SAP: {selectedDishDetail.sapCode || '---'} | RK7: {selectedDishDetail.rk7Code || '---'}
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: selectedDishDetail.price === 0 ? '#059669' : '#ea580c' }}>
                {selectedDishDetail.price === 0 ? '0 đ' : `${selectedDishDetail.price.toLocaleString()} đ`}
              </div>
            </div>

            {/* Tùy chọn gia vị / ghi chú */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Ghi chú cho bếp:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Không cay', 'Ít ngọt', 'Không hành', 'Cho đá riêng', 'Ưu tiên lên trước', 'Nhiều sốt'].map((n) => {
                  const has = selectedDishNotes.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setSelectedDishNotes((prev) => (has ? prev.filter((x) => x !== n) : [...prev, n]));
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        border: has ? '1px solid #ea580c' : '1px solid #cbd5e1',
                        backgroundColor: has ? '#fff7ed' : '#ffffff',
                        color: has ? '#ea580c' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {has ? `✓ ${n}` : `+ ${n}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Số lượng */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700 }}>Số lượng gọi:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDishDetailQuantity((q) => Math.max(1, q - 1))}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  -
                </button>
                <span style={{ fontSize: '15px', fontWeight: 800 }}>{dishDetailQuantity}</span>
                <button
                  type="button"
                  onClick={() => setDishDetailQuantity((q) => q + 1)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                const dish = selectedDishDetail;
                setCoCart((prev) => {
                  const idx = prev.findIndex((c) => c.dish.id === dish.id);
                  if (idx >= 0) {
                    return prev.map((c, i) => (i === idx ? { ...c, quantity: c.quantity + dishDetailQuantity } : c));
                  }
                  return [
                    ...prev,
                    {
                      id: `cart-${Date.now()}`,
                      dish,
                      quantity: dishDetailQuantity,
                      notes: selectedDishNotes.join(', ')
                    }
                  ];
                });
                setSelectedDishDetail(null);
                if (onToastRef.current) {
                  onToastRef.current(`Đã thêm ${dishDetailQuantity}x "${dish.name}" vào giỏ gọi món!`, 'success');
                }
              }}
              style={{ backgroundColor: '#F5B800', color: '#0F172A', fontWeight: 800, marginTop: '8px' }}
            >
              Thêm Vào Giỏ Gọi Món
            </Button>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: MÓN ĐÃ GỌI CỦA BÀN (ORDER HISTORY)                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showOrderHistoryModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowOrderHistoryModal(false)}
          title={`Danh Sách Món Đã Gọi: ${currentTable.name}`}
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
              <span>Thời gian mở bàn: {currentTable.openTimeStr || '11:15'} ({currentTable.durationMinutes || 25} phút trước)</span>
              <span>Tổng số món: {currentTable.orderItems.length}</span>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Tên Món Ăn</th>
                    <th style={{ padding: '8px 12px', width: '70px' }}>Số Lượng</th>
                    <th style={{ padding: '8px 12px', width: '90px' }}>Đơn Giá</th>
                    <th style={{ padding: '8px 12px', width: '100px' }}>Thành Tiền</th>
                    <th style={{ padding: '8px 12px', width: '120px' }}>Tiến Độ Bếp</th>
                    <th style={{ padding: '8px 12px', width: '90px' }}>Giục Món</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTable.orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        Chưa có món nào được gửi vào bếp.
                      </td>
                    </tr>
                  ) : (
                    currentTable.orderItems.map((it) => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.name}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 800 }}>{it.quantity}</td>
                        <td style={{ padding: '8px 12px' }}>{it.price === 0 ? '0 đ' : `${it.price.toLocaleString()} đ`}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#ea580c' }}>
                          {it.price === 0 ? '0 đ' : `${(it.price * it.quantity).toLocaleString()} đ`}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: it.status === 'served' ? '#dcfce7' : '#fef3c7',
                              color: it.status === 'served' ? '#166534' : '#92400e',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                          >
                            {it.status === 'served' ? 'Đã bưng ra bàn' : 'Đang nấu / KDS'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (onToastRef.current) {
                                onToastRef.current(`🔔 Đã giục món "${it.name}" lên KDS Bếp!`, 'success');
                              }
                            }}
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#fff7ed',
                              color: '#ea580c',
                              border: '1px solid #fdba74',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Giục
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: GỌI NHÂN VIÊN PHỤC VỤ (CALL STAFF)                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showCallStaffModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCallStaffModal(false)}
          title={`Gọi Nhân Viên Phục Vụ: ${currentTable.name}`}
          maxWidth="450px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
              Chọn nhu cầu bạn cần hỗ trợ:
            </span>
            {[
              '💧 Mang thêm nước lọc / đá',
              '🧻 Mang thêm khăn lạnh / khăn giấy',
              '🥩 Đổi vỉ nướng / tiếp thêm than',
              '🥢 Lấy thêm bát đĩa / đũa thìa',
              '🧾 Yêu cầu kiểm tra hóa đơn',
              '❓ Cần nhân viên tới bàn tư vấn'
            ].map((req) => (
              <button
                key={req}
                type="button"
                onClick={() => handleCallStaff(req)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  textAlign: 'left',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {req}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: THANH TOÁN QR CO-PAY                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showPaymentModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPaymentModal(false)}
          title={`Thanh Toán Trực Tuyến CO-Pay: ${currentTable.name}`}
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Quét mã QR bằng App Ngân hàng hoặc Ví MoMo / VNPay để thanh toán:
            </div>

            <div
              style={{
                width: '180px',
                height: '180px',
                backgroundColor: '#f8fafc',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <QrCode size={110} color="#1e293b" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>VNPay / MoMo Auto QR</span>
            </div>

            <div style={{ width: '100%', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Tổng tiền món:</span>
                <span>{currentTable.orderItems.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()} đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>Thuế VAT (8%):</span>
                <span>
                  {Math.round(currentTable.orderItems.reduce((s, i) => s + i.price * i.quantity, 0) * 0.08).toLocaleString()} đ
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#ea580c',
                  borderTop: '1px solid #e2e8f0',
                  paddingTop: '6px',
                  marginTop: '6px'
                }}
              >
                <span>Tổng thanh toán:</span>
                <span>
                  {Math.round(currentTable.orderItems.reduce((s, i) => s + i.price * i.quantity, 0) * 1.08).toLocaleString()} đ
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleConfirmPayment}
              style={{ width: '100%', backgroundColor: '#16a34a', color: '#ffffff', fontWeight: 800 }}
            >
              Xác Nhận Đã Thanh Toán (Giải Phóng Bàn)
            </Button>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: THAO TÁC BÀN SO (MỞ / ĐỔI / GHÉP BÀN)                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showTableActionModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowTableActionModal(false)}
          title={`Thao Tác Bàn Ăn: ${currentTable.name}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {tableActionType === 'open' && (
              <>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Thiết lập mở bàn mới cho khách vào:
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Số lượng khách:</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={openGuestCount}
                    onChange={(e) => setOpenGuestCount(Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Tên nhân viên phục vụ:</label>
                  <input
                    type="text"
                    value={openServerName}
                    onChange={(e) => setOpenServerName(e.target.value)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <Button variant="primary" onClick={handleOpenNewTable} style={{ backgroundColor: '#059669', color: '#ffffff' }}>
                  Xác Nhận Mở Bàn
                </Button>
              </>
            )}

            {tableActionType === 'move' && (
              <>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Chuyển toàn bộ order từ <strong>Bàn {currentTable.name}</strong> sang bàn khác:
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700 }}>Chọn bàn đích:</label>
                  <select
                    value={targetMoveTableId}
                    onChange={(e) => setTargetMoveTableId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Chọn bàn trống mục tiêu --</option>
                    {tables
                      .filter((t) => t.id !== currentTable.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Bàn {t.name} ({t.hallName} - {t.status})
                        </option>
                      ))}
                  </select>
                </div>
                <Button variant="primary" onClick={handleMoveTable} style={{ backgroundColor: '#059669', color: '#ffffff' }}>
                  Xác Nhận Đổi Bàn
                </Button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: TRA CỨU ẢNH TOÀN MÁY CHỦ SFTP                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showGlobalSearchModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowGlobalSearchModal(false)}
          title="Tra Cứu Vị Trí Ảnh Toàn Máy Chủ SFTP (192.168.201.116)"
          maxWidth="750px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Nhập từ khóa tên file ảnh (vd: bo_my, king, cha_ca)..."
                value={globalSearchKeyword}
                onChange={(e) => setGlobalSearchKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <Button
                variant="primary"
                onClick={handleGlobalSearch}
                leftIcon={globalSearchLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                Tra cứu
              </Button>
            </div>

            {globalSearchMessage && (
              <span style={{ fontSize: '12px', color: '#64748b' }}>{globalSearchMessage}</span>
            )}

            <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '6px 10px' }}>Tên File</th>
                    <th style={{ padding: '6px 10px' }}>Đường Dẫn SFTP Server</th>
                    <th style={{ padding: '6px 10px', width: '90px' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {globalSearchResults.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                        Chưa có kết quả tra cứu.
                      </td>
                    </tr>
                  ) : (
                    globalSearchResults.map((res, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 600 }}>{res.filename}</td>
                        <td style={{ padding: '6px 10px', color: '#64748b', wordBreak: 'break-all' }}>{res.full_path}</td>
                        <td style={{ padding: '6px 10px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(res.full_path);
                              setCopiedGlobalPath(res.full_path);
                              setTimeout(() => setCopiedGlobalPath(null), 2000);
                            }}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: copiedGlobalPath === res.full_path ? '#dcfce7' : '#ffffff',
                              color: copiedGlobalPath === res.full_path ? '#166534' : '#334155',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            {copiedGlobalPath === res.full_path ? 'Đã copy' : 'Copy path'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 7: CẤU HÌNH MÁY CHỦ ẢNH SFTP                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showConfigModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowConfigModal(false)}
          title="Cấu Hình Kết Nối Image Server SFTP (192.168.201.116)"
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>Host SFTP:</label>
              <input
                type="text"
                value={configForm.host}
                onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Port:</label>
                <input
                  type="number"
                  value={configForm.port}
                  onChange={(e) => setConfigForm({ ...configForm, port: Number(e.target.value) })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700 }}>Username:</label>
                <input
                  type="text"
                  value={configForm.username}
                  onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700 }}>Thư mục ảnh từ xa (Remote Dir):</label>
              <input
                type="text"
                value={configForm.remote_dir}
                onChange={(e) => setConfigForm({ ...configForm, remote_dir: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {testResult && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
                  color: testResult.success ? '#166534' : '#991b1b',
                  fontSize: '12px'
                }}
              >
                {testResult.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px' }}>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                leftIcon={testingConnection ? <Loader2 size={13} className="animate-spin" /> : undefined}
              >
                Kiểm tra kết nối
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                leftIcon={savingConfig ? <Loader2 size={13} className="animate-spin" /> : undefined}
                style={{ backgroundColor: '#F5B800', color: '#0F172A', fontWeight: 700 }}
              >
                Lưu Cấu Hình
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmulatorIntegratedTab;
