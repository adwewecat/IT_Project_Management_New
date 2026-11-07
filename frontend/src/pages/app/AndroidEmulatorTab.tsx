import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  RefreshCw,
  ArrowLeft,
  MoreHorizontal,
  ClipboardList,
  BookOpen,
  QrCode,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  EyeOff,
  Smartphone,
  Monitor,
  Zap,
  FileSpreadsheet,
  Check,
  X,
  Copy,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Eye,
  Settings,
  Server,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Globe,
  ExternalLink,
  Send,
  Utensils,
  AlertTriangle
} from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import {
  ImageServerConfig,
  UpdateImageServerConfigRequest,
  TestImageServerConnectionResponse
} from '../../services/mongoService';
import { Button } from '../../components/ui/Button';
import { RestaurantItem } from '../../types/restaurant';
import { mongoService, LockedTableItem, CheckDishImageResult, CheckMenuImagesResponse, MenuGroupsCoDetailResponse, GlobalImageSearchResultItem } from '../../services/mongoService';

export interface AndroidEmulatorTabProps {
  selectedRestaurant: RestaurantItem | null;
  connectedHost: string;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export type TableStatus = 'EMPTY' | 'OCCUPIED' | 'BILL_PRINTED' | 'ORDERING' | 'RESERVED';

export type MenuSuperType = 'alacarte' | 'buffet' | 'drink' | 'all';

// Helper kiểm tra và chuẩn hóa IP kết nối MongoDB máy trạm (loại bỏ dải gateway có chữ 'x' như 10.8.153.x)
const getValidMongoHost = (rawHost?: string | null): string => {
  if (!rawHost) return '';
  const clean = rawHost.split(':')[0].trim();
  if (!clean || clean.toLowerCase().includes('x')) return '';
  return clean;
};

// Món ăn trong thực đơn POS
export interface DishItem {
  id: string;
  name: string;
  menuCode?: string; // Mã menu sở hữu (vd: '115', '102')
  price: number; // > 0: Alacarte, = 0: Buffet
  group: string; // Tên nhóm (vd: 'Combo', 'ALC.GÀ RÁN NHẬT BẢN', 'ALC.Mỳ'...)
  groupCode?: string; // Mã nhóm (vd: 'CK_ALC001_1')
  isDrink?: boolean;
  rk7Code: string | number;
  sapCode: string;
  imageUrl?: string;
  srcImg?: string;
  urlImgQr?: string;
  localImageUrl?: string;
  localFileName?: string;
  matchRule?: string;
  isSpecialCard?: boolean;
  isHidden?: boolean; // Cờ đánh dấu món đang ẩn trên POS
  hideInCo?: boolean; // Món bị ẩn trên kênh Khách (CO)
  hideInSo?: boolean; // Món bị ẩn trên kênh Phục Vụ (SO)
  hideInQr?: boolean; // Món bị ẩn trên kênh QR Order (QR_ORDER)
  isCo?: boolean; // Món thuộc kênh CO
}

// Hàm chuẩn hóa tiếng Việt bỏ dấu, đưa về chữ thường
export const removeVietnameseTones = (str: string): string => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

// Món trong đơn order của bàn
export interface OrderLineItem {
  id: string;
  dishId: string;
  name: string;
  quantity: number;
  price: number;
  rk7Code: string | number;
  sapCode: string;
  status: 'new' | 'sent' | 'served';
}

// Thông tin bàn
export interface PosTableData {
  id: string;
  name: string;
  hallId: string | number;
  hallName: string;
  capacity: number;
  status: TableStatus;
  selectedCategoryName?: string;
  selectedCategoryCode?: string;
  serverName?: string;
  guestCount?: number;
  orderItems: OrderLineItem[];
  openTimeStr?: string;
  durationMinutes?: number;
}

// Hạng mục order cần chọn (Được đọc từ RESTAURANT_CATEGORY - chỗ ẩn hiện menu)
export interface OrderCategoryOption {
  id: string;
  name: string;
  code: string;
  description?: string;
}

// Thực đơn fallback mẫu (dùng khi chưa kết nối MongoDB)
const FALLBACK_DISHES_DATA: DishItem[] = [
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
    id: 'CB-02',
    name: 'COMBO RÔM RẢ',
    price: 180556,
    group: 'Combo',
    rk7Code: '33371',
    sapCode: '65003643',
    imageUrl: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop'
  },
  {
    id: 'CB-03',
    name: 'Combo No Nê',
    price: 137963,
    group: 'Combo',
    rk7Code: '33339',
    sapCode: '65003603',
    imageUrl: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop'
  }
];

// Danh mục mặc định (chỉ gồm 1 hạng mục Alacarte)
const DEFAULT_CATEGORIES: OrderCategoryOption[] = [
  {
    id: 'cat-alc',
    name: 'Alacarte',
    code: 'CKHCM_oc_ALC'
  }
];

// Danh sách bàn ban đầu (fallback)
const INITIAL_TABLES: PosTableData[] = [
  { id: 'A1', name: 'A1', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  { id: 'A2', name: 'A2', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  { id: 'A3', name: 'A3', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  { id: 'A5', name: 'A5', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  { id: 'A6', name: 'A6', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  { id: 'B1', name: 'B1', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] },
  {
    id: 'B2',
    name: 'Bàn B2',
    hallId: '1',
    hallName: 'Tầng 1',
    capacity: 4,
    status: 'OCCUPIED',
    selectedCategoryName: 'Alacarte',
    selectedCategoryCode: 'CKHCM_oc_ALC',
    guestCount: 2,
    openTimeStr: '19:10',
    durationMinutes: 25,
    orderItems: [
      {
        id: 'ord-1',
        dishId: 'GA-01',
        name: 'Gà xù truyền thống',
        quantity: 1.0,
        price: 32407,
        rk7Code: '10101',
        sapCode: 'M0101',
        status: 'served'
      },
      {
        id: 'ord-2',
        dishId: 'GA-02',
        name: 'Gà xù xốt cheese miso',
        quantity: 1.0,
        price: 37037,
        rk7Code: '10102',
        sapCode: 'M0102',
        status: 'served'
      }
    ]
  },
  { id: 'B3', name: 'B3', hallId: '1', hallName: 'Tầng 1', capacity: 4, status: 'EMPTY', orderItems: [] }
];

export const AndroidEmulatorTab: React.FC<AndroidEmulatorTabProps> = ({
  selectedRestaurant,
  connectedHost,
  onToast
}) => {
  // Ref lưu onToast để tránh bị trigger render lặp
  const onToastRef = useRef(onToast);
  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  // Ref theo dõi host đã đồng bộ để tuyệt đối không gọi lặp lại
  const syncedHostRef = useRef<string>('');

  // Xác thực quyền cấu hình FTP/SSH máy chủ ảnh (chỉ Super Admin hoặc dung.nguyenanh)
  const { user } = useAuth();
  const canConfigImageServer = checkIsDungOrSuperAdmin(user);

  // State cho Modal Cấu hình máy chủ hình ảnh FTP/SSH
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [configLoading, setConfigLoading] = useState<boolean>(false);
  const [configSaving, setConfigSaving] = useState<boolean>(false);
  const [configTesting, setConfigTesting] = useState<boolean>(false);
  const [serverConfig, setServerConfig] = useState<ImageServerConfig | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<TestImageServerConnectionResponse | null>(null);

  // State quản lý Modal Chọn Món Đồng Bộ Ảnh Server (5 Cột + Checkbox + Multi-Search)
  const [showSyncSelectionModal, setShowSyncSelectionModal] = useState<boolean>(false);
  const [syncSelectionStep, setSyncSelectionStep] = useState<1 | 2>(1);
  const [syncSearchQuery, setSyncSearchQuery] = useState<string>('');
  const [selectedFixKeys, setSelectedFixKeys] = useState<Set<string>>(new Set());

  // State Tra Cứu Vị Trí Ảnh Toàn Máy Chủ Server (192.168.201.116)
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState<boolean>(false);
  const [globalSearchKeyword, setGlobalSearchKeyword] = useState<string>('');
  const [globalQuickInput, setGlobalQuickInput] = useState<string>('');
  const [globalSearchRoot, setGlobalSearchRoot] = useState<string>('/opt/gpos/gmonitor/resources');
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalImageSearchResultItem[]>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState<boolean>(false);
  const [globalSearchMessage, setGlobalSearchMessage] = useState<string>('');
  const [globalSearchElapsed, setGlobalSearchElapsed] = useState<number | null>(null);
  const [copiedGlobalPath, setCopiedGlobalPath] = useState<string | null>(null);

  // Quản lý truyền & kiểm tra ảnh dưới nhà hàng (Phương án 2)
  const [restaurantTargetIp, setRestaurantTargetIp] = useState<string>('');
  const [restaurantTargetFolder, setRestaurantTargetFolder] = useState<string>('D:\\GPOS-Setup\\app\\img\\menu');
  const [restaurantFileStatus, setRestaurantFileStatus] = useState<Record<string, { exists: boolean; size: number }>>({});
  const [checkingRestaurantFiles, setCheckingRestaurantFiles] = useState<boolean>(false);
  const [pushingFileKey, setPushingFileKey] = useState<string | null>(null);
  const [bulkPushing, setBulkPushing] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState<UpdateImageServerConfigRequest>({
    server_type: 'SSH_SFTP',
    host: '192.168.201.116',
    port: 22,
    username: 'dung.na',
    password: '',
    remote_dir: '/opt/gpos/gmonitor/resources/menu',
    standard_prefix: '/resources/menu/'
  });

  // ── Flow View State: 'table_map' | 'select_category' | 'menu_order' ──
  const [currentView, setCurrentView] = useState<'table_map' | 'select_category' | 'menu_order'>('table_map');

  // Danh sách bàn
  const [tables, setTables] = useState<PosTableData[]>(INITIAL_TABLES);
  const [selectedHall, setSelectedHall] = useState<string>('Tầng 1');
  const [activeTableId, setActiveTableId] = useState<string>('B2');

  // Hạng mục order lấy từ RESTAURANT_CATEGORY (Ẩn hiện menu)
  const [categories, setCategories] = useState<OrderCategoryOption[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<OrderCategoryOption>(DEFAULT_CATEGORIES[0]);

  // Danh sách món ăn thực tế (đọc từ MongoDB loadMenuSoCoItems)
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [loadingDishes, setLoadingDishes] = useState<boolean>(false);

  // Màn hình Menu (View 3):
  // 3 Loại Menu: Alacarte (>0) | Buffet (=0) | Đồ uống
  const [activeSuperType, setActiveSuperType] = useState<MenuSuperType>('alacarte');
  const [activeGroup, setActiveGroup] = useState<string>('Combo');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // ── Chế độ thực đơn: 'SO' (Staff Order) | 'CO' (Customer Order) ──
  const [orderMode, setOrderMode] = useState<'SO' | 'CO'>('SO');

  // Thông tin cấu hình nhóm hiển thị CO (theo File 2: CO_FILE_2.xlsx & MongoDB)
  const [coDetail, setCoDetail] = useState<MenuGroupsCoDetailResponse | null>(null);
  const [loadingCoDetail, setLoadingCoDetail] = useState<boolean>(false);
  const [selectedMissingGroupCodes, setSelectedMissingGroupCodes] = useState<Set<string>>(new Set());
  const [manualGroupInput, setManualGroupInput] = useState<string>('');
  // Mặc định ẩn khung chi tiết nhóm CO để giao diện gọn gàng, người dùng bấm icon mới mở ra
  const [isCoGroupsBarExpanded, setIsCoGroupsBarExpanded] = useState<boolean>(false);

  // Quản lý kiểm tra hình ảnh món với máy chủ 192.168.201.116
  const [checkedDishImagesMap, setCheckedDishImagesMap] = useState<Record<string, CheckDishImageResult>>({});
  const [checkingDishId, setCheckingDishId] = useState<string | null>(null);
  const [checkingAllMenu, setCheckingAllMenu] = useState<boolean>(false);
  const [syncingImages, setSyncingImages] = useState<boolean>(false);
  const [menuImagesSummary, setMenuImagesSummary] = useState<CheckMenuImagesResponse | null>(null);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // Quản lý sao chép thông báo kiểm tra ảnh và đường dẫn (phục vụ gửi người xử lý)
  const [copiedCheckDishId, setCopiedCheckDishId] = useState<string | null>(null);
  const [copiedFileDishId, setCopiedFileDishId] = useState<string | null>(null);



  // Quản lý tải ảnh trực tuyến từ Cloud Gateway (Chống lag & xử lý lỗi ảnh vỡ)
  // 'hover': chỉ tải khi trỏ chuột vào món (Mặc định - siêu mượt, chống lag)


  // Ô tìm kiếm điều hướng món ăn (Jump to dish search - Theo RK7, SAP, Tên có/không dấu)
  const [dishJumpQuery, setDishJumpQuery] = useState<string>('');
  const [isJumpSearchFocused, setIsJumpSearchFocused] = useState<boolean>(false);
  const [highlightedDishId, setHighlightedDishId] = useState<string | null>(null);
  const [previewDish, setPreviewDish] = useState<DishItem | null>(null);
  const [jumpSearchError, setJumpSearchError] = useState<string | null>(null);
  const jumpSearchContainerRef = useRef<HTMLDivElement | null>(null);

  // Đóng dropdown gợi ý khi click ra ngoài
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (jumpSearchContainerRef.current && !jumpSearchContainerRef.current.contains(e.target as Node)) {
        setIsJumpSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, []);

  // Bàn đang được chọn
  const currentTable = useMemo(() => {
    return tables.find((t) => t.id === activeTableId) || tables[0];
  }, [tables, activeTableId]);

  // Format tiền tệ
  const formatMoney = (val?: number) => {
    if (val === undefined || val === null) return '0 đ';
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' đ';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. TẢI DANH MỤC MENU TỪ RESTAURANT_CATEGORY & getMenuSoCoCategories
  // (Đồng nhất 100% với Tác vụ 3 Xử lý SO/CO)
  // ─────────────────────────────────────────────────────────────────────────
  const loadMenuCategoriesFromMongo = useCallback(async (targetHost?: string) => {
    const raw = targetHost || connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) return;
    try {
      // Ưu tiên getMenuSoCoCategories giống Tác vụ 3 để lấy danh mục và số lượng nhóm/món chính xác
      try {
        const soRes = await mongoService.getMenuSoCoCategories(cleanHost);
        if (soRes && soRes.menus && soRes.menus.length > 0) {
          const mapped: OrderCategoryOption[] = soRes.menus.map((m) => {
            let displayName = m.name;
            const match = m.name.match(/^(.*?)\s*\((.*?)\)$/);
            if (match) {
              displayName = match[1].trim();
            }
            if (!displayName || displayName.toLowerCase() === 'main menu') {
              displayName = 'Alacarte';
            }
            const coCount = m.co_group_count ?? m.group_count ?? 0;
            const totalCount = m.group_count || 0;
            const groupDesc = coCount > 0 && coCount < totalCount
              ? `${coCount} nhóm CO (${totalCount} tổng)`
              : `${totalCount} nhóm món`;
            return {
              id: String(m.id || m.code),
              name: displayName,
              code: m.code,
              description: `Mã menu: ${m.code} • ${groupDesc} • ${m.dish_count || 0} món`
            };
          });
          if (mapped.length > 0) {
            setCategories(mapped);
            setSelectedCategory(mapped[0]);
            return;
          }
        }
      } catch (errSo) {
        console.warn('Lỗi getMenuSoCoCategories, thử getMenuShowHide:', errSo);
      }

      // Fallback: getMenuShowHide
      const res = await mongoService.getMenuShowHide(cleanHost, 27017);
      if (res && res.menus && res.menus.length > 0) {
        // Chỉ lấy các menu đang mở cho kênh SO (Staff Order: show_in_so !== false)
        const soMenus = res.menus.filter((m) => m.show_in_so !== false);
        const menusToUse = soMenus.length > 0 ? soMenus : res.menus;

        const mapped: OrderCategoryOption[] = menusToUse.map((m) => {
          let displayName = m.name;
          let displayCode = m.code || m.sap_code || '';

          // Tách tên và mã từ chuỗi nếu có dạng "Alacarte (CKHCM_oc_ALC)"
          const match = m.name.match(/^(.*?)\s*\((.*?)\)$/);
          if (match) {
            displayName = match[1].trim();
            // Lưu mã menu gốc (m.code = '172') để nạp đúng món
            displayCode = m.code || match[2].trim();
          }

          return {
            id: String(m.id),
            name: displayName,
            code: displayCode,
            description: m.subtitle || undefined
          };
        });

        if (mapped.length > 0) {
          setCategories(mapped);
          setSelectedCategory(mapped[0]);
        }
      }
    } catch (e) {
      console.warn('Không tải được RESTAURANT_CATEGORY từ MongoDB:', e);
    }
  }, [connectedHost, selectedRestaurant?.ip]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. TẢI TOÀN BỘ MÓN ĂN THỰC TẾ & ĐỐI CHIẾU MÓN ẨN TỪ MONGODB
  // (Đồng nhất 100% với Tác vụ 3 Xử lý SO/CO ManageMenuSoCoTask)
  // ─────────────────────────────────────────────────────────────────────────
  const loadDishesFromMongo = useCallback(async (targetHost?: string) => {
    const raw = targetHost || connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(raw);
    if (!cleanHost) return;
    setLoadingDishes(true);
    try {
      // a. Lấy chi tiết món ẩn từ getDishShowHide (lưu map để biết ẩn ở CO, SO hay QR_ORDER)
      const showHideDetailMap = new Map<string, { show_in_co: boolean; show_in_so: boolean; show_in_qr_order: boolean; is_hidden: boolean }>();
      const hiddenDishSet = new Set<string>();
      try {
        const showHideRes = await mongoService.getDishShowHide(cleanHost, 27017);
        if (showHideRes) {
          const allDishes = [
            ...(showHideRes.hidden_dishes || []),
            ...(showHideRes.visible_dishes || [])
          ];
          allDishes.forEach((hd) => {
            const detail = {
              show_in_co: hd.show_in_co,
              show_in_so: hd.show_in_so,
              show_in_qr_order: hd.show_in_qr_order,
              is_hidden: hd.is_hidden
            };
            if (hd.item_code) {
              const codeStr = String(hd.item_code).trim();
              showHideDetailMap.set(codeStr, detail);
              if (hd.is_hidden) hiddenDishSet.add(codeStr);
            }
            if (hd.sap_code) {
              const sapStr = String(hd.sap_code).trim();
              showHideDetailMap.set(sapStr, detail);
              if (hd.is_hidden) hiddenDishSet.add(sapStr);
            }
          });
        }
      } catch (e) {
        console.warn('Lỗi getDishShowHide:', e);
      }

      // b. Lấy danh sách menu codes từ getMenuSoCoCategories để nạp chính xác
      let menuCodesToLoad: string[] = [];
      try {
        const catRes = await mongoService.getMenuSoCoCategories(cleanHost);
        if (catRes && catRes.menus && catRes.menus.length > 0) {
          menuCodesToLoad = catRes.menus.map((m) => m.code);
        }
      } catch (e) {
        console.warn('Lỗi getMenuSoCoCategories trong loadDishes:', e);
      }

      // c. Tải toàn bộ món ăn thực tế từ loadMenuSoCoItems (giống Tab 1 ManageMenuSoCoTask)
      const res = await mongoService.loadMenuSoCoItems({
        host: cleanHost,
        menu_codes: menuCodesToLoad.length > 0 ? menuCodesToLoad : undefined,
        search_all: true
      });

      if (res && res.items && res.items.length > 0) {
        // Khử trùng lặp (Deduplicate) món ăn: loại bỏ các bản ghi trùng lặp do quét qua nhiều menu cache
        const uniqueDishMap = new Map<string, DishItem>();

        res.items.forEach((it, idx) => {
          const rk7Str = String(it.rk7_code || '').trim();
          const sapStr = String(it.sap_code || '').trim();

          const sh = showHideDetailMap.get(rk7Str) || (sapStr ? showHideDetailMap.get(sapStr) : undefined);
          let hideInCo = false;
          let hideInSo = false;
          let hideInQr = false;

          if (sh) {
            hideInCo = !sh.show_in_co;
            hideInSo = !sh.show_in_so;
            hideInQr = !sh.show_in_qr_order;
          } else {
            if (it.is_co === false || it.group_is_co === false) hideInCo = true;
            if (it.is_so === false) hideInSo = true;
          }

          const isHidden = hideInCo || hideInSo || hideInQr || (sh ? sh.is_hidden : false) || hiddenDishSet.has(rk7Str) || hiddenDishSet.has(sapStr);

          const groupClean = it.group_name ? it.group_name.trim() : 'Món Khác';
          const isDrink =
            it.level === 0 ||
            groupClean.toLowerCase().includes('uống') ||
            groupClean.toLowerCase().includes('nước') ||
            groupClean.toLowerCase().includes('bia') ||
            groupClean.toLowerCase().includes('giải khát');

          // Khóa phân biệt duy nhất theo: nhóm + mã RK7 + mã SAP + tên món + giá
          const dedupKey = `${groupClean.toLowerCase()}___${rk7Str.toLowerCase()}___${sapStr.toLowerCase()}___${(it.name || '').trim().toLowerCase()}___${it.price || 0}`;

          if (!uniqueDishMap.has(dedupKey)) {
            const rawImgUrl = it.image_url || it.url_img_qr || '';
            const bestOnlineImg = (rawImgUrl.startsWith('http://') || rawImgUrl.startsWith('https://'))
              ? rawImgUrl
              : (it.src_img && (it.src_img.startsWith('http://') || it.src_img.startsWith('https://')))
              ? it.src_img
              : it.image_url || undefined;

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
              imageUrl: bestOnlineImg,
              srcImg: it.src_img || undefined,
              urlImgQr: it.url_img_qr || undefined,
              isHidden,
              hideInCo,
              hideInSo,
              hideInQr,
              isCo: it.is_co ?? it.group_is_co
            });
          }
        });

        const loadedDishes = Array.from(uniqueDishMap.values());
        if (loadedDishes.length > 0) {
          setDishes(loadedDishes);
          return loadedDishes;
        }
      } else {
        // Nếu không có dữ liệu trả về từ MongoDB thì chỉ dùng fallback khi trước đó chưa có món nào
        setDishes((prev) => (prev.length > 0 ? prev : FALLBACK_DISHES_DATA));
      }
    } catch (err) {
      console.warn('Không tải được thực đơn từ loadMenuSoCoItems:', err);
      setDishes((prev) => (prev.length > 0 ? prev : FALLBACK_DISHES_DATA));
    } finally {
      setLoadingDishes(false);
    }
    return null;
  }, [connectedHost, selectedRestaurant?.ip]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ĐỒNG BỘ BÀN TỪ MONGODB (CHỈ BẬT TOAST KHI BẤM THỦ CÔNG)
  // ─────────────────────────────────────────────────────────────────────────
  const syncWithMongo = useCallback(async (isManual: boolean = false) => {
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const targetHost = getValidMongoHost(rawHost);
    if (!targetHost) {
      if (isManual && onToastRef.current) {
        onToastRef.current('Chưa xác định IP kết nối MongoDB máy trạm nhà hàng!', 'info');
      }
      return;
    }

    try {
      // Tải danh mục menu và món ăn song song
      await Promise.all([
        loadMenuCategoriesFromMongo(targetHost),
        loadDishesFromMongo(targetHost)
      ]);

      // Gọi getTableReport với split_by_hall=True
      const reportRes = await mongoService.getTableReport({
        restaurant_id: selectedRestaurant?.id,
        host: targetHost,
        split_by_hall: true
      });

      if (reportRes && reportRes.items && reportRes.items.length > 0) {
        let lockedTablesMap = new Map<string, LockedTableItem>();
        try {
          const lockRes = await mongoService.getLockedTables(targetHost, 27017, selectedRestaurant?.id);
          if (lockRes && lockRes.locked_tables) {
            lockRes.locked_tables.forEach((lt) => {
              const k = (lt.table_name || '').trim().toLowerCase();
              if (k) lockedTablesMap.set(k, lt);
            });
          }
        } catch (e) {
          // ignore lock error
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
            const isOccupied = !!lock;

            newTables.push({
              id: tName,
              name: tName,
              hallId: hId,
              hallName: hName,
              capacity: tName.toLowerCase().includes('vip') ? 8 : 4,
              status: isOccupied ? 'OCCUPIED' : 'EMPTY',
              serverName: lock?.locked_by_user_name || undefined,
              orderItems: []
            });
          });
        });

        if (newTables.length > 0) {
          setTables(newTables);
          // Tự động chọn sảnh đầu tiên nếu sảnh hiện tại không tồn tại
          if (!newTables.some((t) => t.hallName === selectedHall)) {
            setSelectedHall(newTables[0].hallName);
          }

          // CHỈ hiện toast khi người dùng bấm nút thủ công! Không hiện khi tự động nạp.
          if (isManual && onToastRef.current) {
            onToastRef.current(`Đã đồng bộ ${newTables.length} bàn & thực đơn thực tế từ MongoDB!`, 'success');
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi đồng bộ MongoDB:', e);
      if (isManual && onToastRef.current) {
        onToastRef.current('Không kết nối được MongoDB trạm nhà hàng!', 'error');
      }
    }
  }, [connectedHost, selectedRestaurant?.ip, selectedRestaurant?.id, selectedHall, loadMenuCategoriesFromMongo, loadDishesFromMongo]);

  // Tự động đồng bộ một lần khi host hoặc restaurant thay đổi (KHÔNG LẶP, KHÔNG TOAST)
  useEffect(() => {
    const validHost = getValidMongoHost(connectedHost || selectedRestaurant?.ip);
    if (validHost && validHost !== syncedHostRef.current) {
      syncedHostRef.current = validHost;
      syncWithMongo(false); // isManual = false -> Im lặng, không toast
    }
  }, [connectedHost, selectedRestaurant?.ip, syncWithMongo]);

  // Danh sách các khu vực sảnh duy nhất
  const uniqueHalls = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => set.add(t.hallName));
    return Array.from(set);
  }, [tables]);

  // Lọc bàn theo khu vực sảnh đang chọn (Image 1)
  const currentHallTables = useMemo(() => {
    return tables.filter((t) => t.hallName === selectedHall);
  }, [tables, selectedHall]);

    // Tải chi tiết nhóm CO (File 2) cho Menu đang chọn
  const fetchCoGroupsDetail = useCallback(async (menuCode: string) => {
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(rawHost);
    if (!cleanHost || !menuCode) return;
    setLoadingCoDetail(true);
    try {
      const res = await mongoService.getMenuGroupsCo({
        host: cleanHost,
        port: 27017,
        menu_code: menuCode
      });
      setCoDetail(res);
      setSelectedMissingGroupCodes(new Set());
    } catch (err) {
      console.warn('Lỗi tải nhóm CO chi tiết:', err);
    } finally {
      setLoadingCoDetail(false);
    }
  }, [connectedHost, selectedRestaurant?.ip]);

  // Tự động nạp nhóm CO khi chuyển sang chế độ CO hoặc khi selectedCategory thay đổi
  useEffect(() => {
    if (orderMode === 'CO' && selectedCategory.code) {
      fetchCoGroupsDetail(selectedCategory.code);
    }
  }, [orderMode, selectedCategory.code, fetchCoGroupsDetail]);

  // Bản đồ tra cứu mã nhóm (group code) cho từng tên nhóm món
  const groupCodeMap = useMemo(() => {
    const map = new Map<string, string>();
    dishes.forEach((d) => {
      if (d.group && d.groupCode && !map.has(d.group)) {
        map.set(d.group, d.groupCode);
      }
    });
    if (coDetail && coDetail.so_groups) {
      coDetail.so_groups.forEach((g) => {
        if (g.name && g.code && !map.has(g.name)) {
          map.set(g.name, g.code);
        }
      });
    }
    return map;
  }, [dishes, coDetail]);

  // Kiểm tra hình ảnh 1 món trên máy chủ ảnh 192.168.201.116
  const handleCheckSingleDish = async (dish: DishItem) => {
    setCheckingDishId(dish.id);
    try {
      const rawPath = dish.srcImg || dish.imageUrl || '';
      const res = await mongoService.checkSingleDishImage({
        raw_path: rawPath,
        dish_name: dish.name,
        rk7_code: String(dish.rk7Code || ''),
        sap_code: dish.sapCode || ''
      });
      setCheckedDishImagesMap((prev) => ({
        ...prev,
        [dish.id]: res
      }));
      if (onToastRef.current) {
        if (res.status === 'MATCH') {
          onToastRef.current(`Khớp 100%: ${res.server_filename}`, 'success');
        } else if (res.is_fixable) {
          onToastRef.current(res.message, 'info');
        } else {
          onToastRef.current(res.message, 'error');
        }
      }
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi kiểm tra hình ảnh: ' + (err.response?.data?.detail || err.message), 'error');
      }
    } finally {
      setCheckingDishId(null);
    }
  };

  // Copy thông báo kết quả kiểm tra hình ảnh server (để gửi cho người xử lý)
  const handleCopyCheckMessage = async (e: React.MouseEvent, dish: DishItem, message: string) => {
    e.stopPropagation();
    if (!message) return;

    // Shift+Click: chỉ copy nội dung thông báo lỗi thuần
    // Click thường: copy đầy đủ ngữ cảnh [Tên món (RK7 - SAP)] + Thông báo lỗi
    const rk7Str = dish.rk7Code ? `RK7: ${dish.rk7Code}` : '';
    const sapStr = dish.sapCode ? `SAP: ${dish.sapCode}` : '';
    const codes = [rk7Str, sapStr].filter(Boolean).join(' - ');
    const textToCopy = e.shiftKey
      ? message
      : `[${dish.name}${codes ? ` (${codes})` : ''}] ${message}`;

    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedCheckDishId(dish.id);
      setTimeout(() => {
        setCopiedCheckDishId((prev) => (prev === dish.id ? null : prev));
      }, 1500);
      if (onToastRef.current) {
        onToastRef.current(`Đã copy: ${textToCopy}`, 'success');
      }
    }
  };

  // Copy đường dẫn file ảnh trong DB
  const handleCopyFilePath = async (e: React.MouseEvent, dish: DishItem, filePath: string) => {
    e.stopPropagation();
    if (!filePath) return;

    const ok = await copyToClipboard(filePath);
    if (ok) {
      setCopiedFileDishId(dish.id);
      setTimeout(() => {
        setCopiedFileDishId((prev) => (prev === dish.id ? null : prev));
      }, 1500);
      if (onToastRef.current) {
        onToastRef.current(`Đã copy đường dẫn: ${filePath}`, 'success');
      }
    }
  };

  // Kiểm tra toàn bộ hình ảnh của các món thuộc Menu hiện tại
  const handleCheckAllMenuImages = async () => {
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(rawHost);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP kết nối MongoDB máy trạm!', 'error');
      return;
    }

    setCheckingAllMenu(true);
    try {
      const res = await mongoService.checkMenuDishImages({
        host: cleanHost,
        port: 27017,
        menu_code: selectedCategory.code,
        dishes: dishes.map((d) => ({
          id: d.id,
          name: d.name,
          rk7_code: d.rk7Code,
          sap_code: d.sapCode,
          src_img: d.srcImg || '',
          image_url: d.imageUrl || '',
          url_img_qr: d.urlImgQr || ''
        }))
      });

      setMenuImagesSummary(res);

      const newMap: Record<string, CheckDishImageResult> = {};
      res.results.forEach((r) => {
        if (r.dish_id) {
          newMap[r.dish_id] = r;
        }
      });
      setCheckedDishImagesMap((prev) => ({ ...prev, ...newMap }));

      const totalMismatches = (res.case_mismatch_count || 0) + (res.not_found_count || 0) + (res.no_image_count || 0);
      if (totalMismatches > 0) {
        // Tự động mở Popup chọn món đồng bộ theo yêu cầu người dùng
        setSyncSelectionStep(1);
        setSyncSearchQuery('');
        setSelectedFixKeys(new Set());
        setShowSyncSelectionModal(true);
        if (onToastRef.current) {
          if (res.fixable_count > 0) {
            onToastRef.current(
              `Đã check ${res.total_dishes} món: Có ${res.fixable_count} món lệch chữ có thể đồng bộ, ${res.not_found_count} món server chưa có ảnh!`,
              'info'
            );
          } else {
            onToastRef.current(
              `Đã check ${res.total_dishes} món: Có ${res.not_found_count} món server /opt/gpos/gmonitor/resources/menu chưa có ảnh!`,
              'info'
            );
          }
        }
      } else {
        if (onToastRef.current) {
          onToastRef.current(
            `Tuyệt vời! Toàn bộ ${res.total_dishes} món đều khớp 100% với ảnh trong /opt/gpos/gmonitor/resources/menu!`,
            'success'
          );
        }
      }
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi kiểm tra ảnh menu: ' + (err.response?.data?.detail || err.message), 'error');
      }
    } finally {
      setCheckingAllMenu(false);
    }
  };

  // Đồng nhất 1 món: Cập nhật tên hình từ server về MongoDB nhà hàng
  const handleSyncSingleDish = async (dish: DishItem, targetPath: string) => {
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(rawHost);
    if (!cleanHost) return;

    try {
      const res = await mongoService.syncDishImagesToMongo({
        host: cleanHost,
        port: 27017,
        fixes: [
          {
            rk7_code: String(dish.rk7Code || ''),
            sap_code: dish.sapCode || '',
            dish_name: dish.name || '',
            target_image_path: targetPath
          }
        ]
      });

      if (onToastRef.current) {
        onToastRef.current(res.message, 'success');
      }

      setDishes((prev) =>
        prev.map((d) =>
          d.id === dish.id
            ? {
                ...d,
                srcImg: targetPath,
                imageUrl: targetPath
              }
            : d
        )
      );

      setCheckedDishImagesMap((prev) => ({
        ...prev,
        [dish.id]: {
          status: 'MATCH',
          is_match: true,
          is_fixable: false,
          message: 'Khớp hoàn toàn 100% cả tên hình và đường dẫn /resources/menu/',
          given_path: targetPath,
          given_filename: targetPath.replace('/resources/menu/', ''),
          given_prefix: '/resources/menu/',
          server_filename: targetPath.replace('/resources/menu/', ''),
          suggested_fix_path: targetPath
        }
      }));
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi đồng nhất: ' + (err.response?.data?.detail || err.message), 'error');
      }
    }
  };

  // Mở popup cấu hình máy chủ ảnh
  const handleOpenConfigModal = async () => {
    if (!canConfigImageServer) {
      if (onToastRef.current) {
        onToastRef.current('Chỉ tài khoản Super Admin hoặc dung.nguyenanh mới có quyền cấu hình kết nối FTP/SSH!', 'error');
      }
      return;
    }
    setShowConfigModal(true);
    setConfigLoading(true);
    setTestResult(null);
    try {
      const data = await mongoService.getImageServerConfig();
      setServerConfig(data);
      setConfigForm({
        server_type: data.server_type || 'SSH_SFTP',
        host: data.host || '',
        port: data.port || 22,
        username: data.username || '',
        password: data.password || '',
        remote_dir: data.remote_dir || '',
        standard_prefix: data.standard_prefix || '/resources/menu/'
      });
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi tải cấu hình máy chủ ảnh: ' + (err.response?.data?.detail || err.message), 'error');
      }
    } finally {
      setConfigLoading(false);
    }
  };

  // Test kết nối tới máy chủ ảnh (Read-Only)
  const handleTestConnection = async () => {
    setConfigTesting(true);
    setTestResult(null);
    try {
      const res = await mongoService.testImageServerConnection({
        server_type: configForm.server_type,
        host: configForm.host,
        port: Number(configForm.port),
        username: configForm.username,
        password: configForm.password,
        remote_dir: configForm.remote_dir
      });
      setTestResult(res);
      if (onToastRef.current) {
        onToastRef.current(res.message, res.success ? 'success' : 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message;
      setTestResult({
        success: false,
        total_files: 0,
        message: msg
      });
      if (onToastRef.current) {
        onToastRef.current('Kiểm tra kết nối thất bại: ' + msg, 'error');
      }
    } finally {
      setConfigTesting(false);
    }
  };

  // Lưu cấu hình máy chủ ảnh
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const saved = await mongoService.saveImageServerConfig({
        ...configForm,
        port: Number(configForm.port)
      });
      setServerConfig(saved);
      if (onToastRef.current) {
        onToastRef.current('Đã lưu cấu hình máy chủ hình ảnh thành công!', 'success');
      }
      setShowConfigModal(false);
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi lưu cấu hình: ' + (err.response?.data?.detail || err.message), 'error');
      }
    } finally {
      setConfigSaving(false);
    }
  };

  // Khóa định danh duy nhất cho từng món ăn (Deduplication: 1 món = 1 mã RK7/SAP = 1 hình)
  const getDishDedupKey = (item: { rk7_code?: string; sap_code?: string; name?: string }): string => {
    const rk7 = String(item.rk7_code || '').trim();
    const sap = String(item.sap_code || '').trim();
    const name = String(item.name || '').trim().toLowerCase();

    if (rk7 && rk7 !== '-' && rk7 !== '0') {
      if (sap && sap !== '-' && sap !== '0') {
        return `rk7_${rk7}__sap_${sap}`;
      }
      return `rk7_${rk7}`;
    }
    if (sap && sap !== '-' && sap !== '0') {
      return `sap_${sap}__name_${name}`;
    }
    return `name_${name}`;
  };

  const getFixItemKey = (item: { dish_id?: string; rk7_code?: string; sap_code?: string; name?: string }): string => {
    return getDishDedupKey(item);
  };

  // Danh sách các món bị sai lệch / chưa có ảnh trên server
  // ĐÃ KHỬ TRÙNG LẶP: Mỗi món (cùng mã RK7 hoặc cùng mã SAP) CHỈ HIỂN THỊ 1 DÒNG DUY NHẤT
  // Sắp xếp: Món có ảnh trên server lên trước
  const mismatchedItems = useMemo(() => {
    if (!menuImagesSummary || !menuImagesSummary.results) return [];
    const list = menuImagesSummary.results.filter((r) => !r.is_match);

    // Gom nhóm khử trùng lặp theo getDishDedupKey
    const seen = new Map<string, typeof list[0] & { all_dish_ids: string[] }>();
    list.forEach((item) => {
      const key = getDishDedupKey(item);
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { ...item, all_dish_ids: item.dish_id ? [item.dish_id] : [] });
      } else {
        if (item.dish_id && !existing.all_dish_ids.includes(item.dish_id)) {
          existing.all_dish_ids.push(item.dish_id);
        }
        if ((!existing.sap_code || existing.sap_code === '-') && item.sap_code && item.sap_code !== '-') {
          existing.sap_code = item.sap_code;
        }
        if ((!existing.given_path || existing.given_path === '-') && item.given_path && item.given_path !== '-') {
          existing.given_path = item.given_path;
        }
        if (!existing.is_fixable && item.is_fixable) {
          existing.is_fixable = true;
          existing.suggested_fix_path = item.suggested_fix_path;
          existing.server_filename = item.server_filename;
          existing.status = item.status;
          existing.message = item.message;
        }
      }
    });

    const uniqueList = Array.from(seen.values());

    return uniqueList.sort((a, b) => {
      // Ưu tiên 1: Các món có ảnh trên server (is_fixable hoặc có server_filename) lên đầu bảng
      const aHas = (a.is_fixable || Boolean(a.server_filename)) ? 1 : 0;
      const bHas = (b.is_fixable || Boolean(b.server_filename)) ? 1 : 0;
      if (aHas !== bHas) {
        return bHas - aHas;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [menuImagesSummary]);

  // Các món CÓ THỂ ĐỒNG BỘ: Chỉ những món thực sự có ảnh trên server /opt/gpos/gmonitor/resources/menu
  const fixableItems = useMemo(() => {
    return mismatchedItems.filter((r) => r.is_fixable && r.suggested_fix_path);
  }, [mismatchedItems]);

  // Bộ lọc tìm kiếm đa năng (hỗ trợ 1 hoặc nhiều mã SAP, RK7, Tên món phân cách bởi phẩy, chấm phẩy, khoảng trắng, xuống dòng)
  const filteredMismatchedItems = useMemo(() => {
    const query = syncSearchQuery.trim();
    if (!query) return mismatchedItems;

    let tokens: string[] = [];
    if (/[,;\n\r]/.test(query)) {
      tokens = query
        .split(/[,;\n\r]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    } else {
      const parts = query.split(/\s+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1 && parts.every((p) => /^[a-zA-Z0-9_\-]+$/.test(p))) {
        tokens = parts;
      } else {
        tokens = [query];
      }
    }

    if (tokens.length === 0) return mismatchedItems;
    const normalizedTokens = tokens.map((t) => removeVietnameseTones(t).toLowerCase());

    return mismatchedItems.filter((item) => {
      const rk7 = String(item.rk7_code || '').toLowerCase();
      const sap = String(item.sap_code || '').toLowerCase();
      const nameNorm = removeVietnameseTones(item.name || '').toLowerCase();

      return normalizedTokens.some(
        (tok) => rk7.includes(tok) || sap.includes(tok) || nameNorm.includes(tok)
      );
    });
  }, [mismatchedItems, syncSearchQuery]);

  // Các món trong danh sách lọc có thể tích chọn đồng bộ
  const fixableInFiltered = useMemo(() => {
    return filteredMismatchedItems.filter((it) => it.is_fixable);
  }, [filteredMismatchedItems]);

  const isAllFilteredSelected =
    fixableInFiltered.length > 0 &&
    fixableInFiltered.every((it) => selectedFixKeys.has(getFixItemKey(it)));

  const handleToggleSelectAllFiltered = () => {
    setSelectedFixKeys((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        fixableInFiltered.forEach((it) => next.delete(getFixItemKey(it)));
      } else {
        fixableInFiltered.forEach((it) => next.add(getFixItemKey(it)));
      }
      return next;
    });
  };

  const handleToggleSingleItem = (item: CheckDishImageResult) => {
    if (!item.is_fixable) {
      if (onToastRef.current) {
        onToastRef.current(`Món "${item.name}" server /opt/gpos/gmonitor/resources/menu chưa có ảnh nên không thể đồng bộ!`, 'info');
      }
      return;
    }
    const key = getFixItemKey(item);
    setSelectedFixKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleClearAllSelection = () => {
    setSelectedFixKeys(new Set());
  };

  // Thực thi đồng bộ các món đã được người dùng tích chọn
  const executeSyncSelectedImages = async () => {
    if (selectedFixKeys.size === 0) return;
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(rawHost);
    if (!cleanHost) return;

    const selectedItems = fixableItems.filter((it) => selectedFixKeys.has(getFixItemKey(it)));
    if (selectedItems.length === 0) return;

    setSyncingImages(true);
    try {
      const fixes = selectedItems.map((item) => ({
        rk7_code: String(item.rk7_code || ''),
        sap_code: item.sap_code || '',
        dish_name: item.name || '',
        target_image_path: item.suggested_fix_path
      }));

      const res = await mongoService.syncDishImagesToMongo({
        host: cleanHost,
        port: 27017,
        fixes,
        menu_code: selectedCategory.code,
        menu_name: selectedCategory.name,
        restaurant_name: selectedRestaurant?.name || ''
      });

      if (onToastRef.current) {
        onToastRef.current(res.message, 'success');
      }

      setShowSyncSelectionModal(false);
      setSyncSelectionStep(1);

      await loadDishesFromMongo(cleanHost);

      setCheckedDishImagesMap((prev) => {
        const updated = { ...prev };
        selectedItems.forEach((it) => {
          const ids = (it as any).all_dish_ids || (it.dish_id ? [it.dish_id] : []);
          ids.forEach((did: string) => {
            updated[did] = {
              ...it,
              dish_id: did,
              status: 'MATCH' as const,
              is_match: true,
              is_fixable: false,
              message: `Đã đồng nhất thành công theo server: ${it.suggested_fix_path}`
            };
          });

          // Đồng bộ tất cả các món trên bàn/thực đơn có cùng mã RK7 hoặc mã SAP
          const rk7 = String(it.rk7_code || '').trim();
          const sap = String(it.sap_code || '').trim();
          const name = String(it.name || '').trim().toLowerCase();
          Object.keys(updated).forEach((did) => {
            const entry = updated[did];
            if (
              (rk7 && String(entry.rk7_code || '').trim() === rk7) ||
              (sap && sap !== '-' && String(entry.sap_code || '').trim() === sap) ||
              (name && String(entry.name || '').trim().toLowerCase() === name)
            ) {
              updated[did] = {
                ...entry,
                status: 'MATCH' as const,
                is_match: true,
                is_fixable: false,
                message: `Đã đồng nhất thành công theo server: ${it.suggested_fix_path}`
              };
            }
          });
        });
        return updated;
      });

      setMenuImagesSummary((prev) => {
        if (!prev) return null;
        const syncedRk7s = new Set(selectedItems.map((it) => String(it.rk7_code || '').trim()).filter(Boolean));
        const syncedSaps = new Set(selectedItems.map((it) => String(it.sap_code || '').trim()).filter((s) => s && s !== '-'));
        const syncedNames = new Set(selectedItems.map((it) => String(it.name || '').trim().toLowerCase()).filter(Boolean));

        const updatedResults = prev.results.map((r) => {
          const rk7 = String(r.rk7_code || '').trim();
          const sap = String(r.sap_code || '').trim();
          const name = String(r.name || '').trim().toLowerCase();

          const isSynced =
            (rk7 && syncedRk7s.has(rk7)) ||
            (sap && sap !== '-' && syncedSaps.has(sap)) ||
            (name && syncedNames.has(name));

          if (isSynced) {
            const matchingFix = selectedItems.find((it) =>
              (rk7 && String(it.rk7_code || '').trim() === rk7) ||
              (sap && sap !== '-' && String(it.sap_code || '').trim() === sap) ||
              (name && String(it.name || '').trim().toLowerCase() === name)
            );
            const targetPath = matchingFix?.suggested_fix_path || r.suggested_fix_path;
            return {
              ...r,
              status: 'MATCH' as const,
              is_match: true,
              is_fixable: false,
              message: `Đã đồng nhất thành công theo server: ${targetPath}`
            };
          }
          return r;
        });

        const remainingFixable = updatedResults.filter((r) => r.is_fixable).length;
        return {
          ...prev,
          match_count: updatedResults.filter((r) => r.is_match).length,
          case_mismatch_count: updatedResults.filter((r) => r.status === 'CASE_MISMATCH').length,
          prefix_mismatch_count: updatedResults.filter((r) => r.status === 'PREFIX_MISMATCH').length,
          fixable_count: remainingFixable,
          results: updatedResults
        };
      });

      setSelectedFixKeys(new Set());
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi khi đồng nhất hình ảnh: ' + (err.response?.data?.detail || err.message), 'error');
      }
    } finally {
      setSyncingImages(false);
    }
  };

  // Tra cứu vị trí hình ảnh trên toàn bộ máy chủ qua SSH
  const handleExecuteGlobalSearch = async (kw?: string, root?: string) => {
    const query = (kw !== undefined ? kw : globalSearchKeyword).trim();
    if (!query) {
      if (onToastRef.current) onToastRef.current('Vui lòng nhập tên file, mã SAP, RK7 hoặc từ khóa cần tìm', 'info');
      return;
    }
    setGlobalSearchLoading(true);
    setGlobalSearchMessage('');
    try {
      const res = await mongoService.searchGlobalServerImages({
        keyword: query,
        search_root: root || globalSearchRoot,
        limit: 40
      });
      const foundList = res.results || [];
      setGlobalSearchResults(foundList);
      setGlobalSearchMessage(res.message);
      setGlobalSearchElapsed(res.elapsed_ms);
      if (!foundList || foundList.length === 0) {
        if (onToastRef.current) onToastRef.current(`Không tìm thấy file nào khớp với "${query}" trên server`, 'info');
      } else {
        // Tự động kiểm tra xem các file này đã có trong thư mục nhà hàng chưa
        handleCheckRestaurantFiles(undefined, undefined, foundList.map((r) => r.filename));
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err.message || 'Lỗi tra cứu máy chủ';
      setGlobalSearchMessage(errMsg);
      if (onToastRef.current) onToastRef.current(`Lỗi tra cứu: ${errMsg}`, 'error');
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  // Kiểm tra danh sách file đã tồn tại trong thư mục máy trạm nhà hàng chưa (Phương án 2)
  const handleCheckRestaurantFiles = async (
    targetIp?: string,
    targetFolder?: string,
    filesToCheck?: string[]
  ) => {
    const defaultHost = getValidMongoHost(connectedHost) || selectedRestaurant?.ip || '';
    const ip = (targetIp || restaurantTargetIp || defaultHost || '').trim();
    const folder = (targetFolder || restaurantTargetFolder || 'D:\\GPOS-Setup\\app\\img\\menu').trim();
    const filenames = filesToCheck || globalSearchResults.map((r) => r.filename);

    if (!ip || filenames.length === 0) return;

    if (!restaurantTargetIp) setRestaurantTargetIp(ip);

    setCheckingRestaurantFiles(true);
    try {
      const res = await mongoService.checkRestaurantFiles({
        target_ip: ip,
        target_folder: folder,
        filenames: filenames
      });
      if (res && res.results) {
        setRestaurantFileStatus((prev) => ({ ...prev, ...res.results }));
      }
    } catch (err: any) {
      console.warn('Lỗi kiểm tra file tại nhà hàng:', err);
    } finally {
      setCheckingRestaurantFiles(false);
    }
  };

  // Truyền 1 file hình ảnh từ server xuống nhà hàng (Phương án 2)
  const handlePushImageToRestaurant = async (item: GlobalImageSearchResultItem) => {
    const defaultHost = getValidMongoHost(connectedHost) || selectedRestaurant?.ip || '';
    const ip = (restaurantTargetIp || defaultHost || '').trim();
    const folder = (restaurantTargetFolder || 'D:\\GPOS-Setup\\app\\img\\menu').trim();

    if (!ip) {
      if (onToastRef.current) onToastRef.current('Vui lòng nhập IP máy trạm nhà hàng cần truyền ảnh', 'error');
      return;
    }

    setPushingFileKey(item.filename);
    try {
      const res = await mongoService.pushImageToRestaurant({
        target_ip: ip,
        target_folder: folder,
        remote_source_path: item.full_path,
        filename: item.filename,
        relative_url: item.relative_url,
        gateway_url: item.gateway_url,
        overwrite: true
      });

      if (res.success) {
        if (onToastRef.current) onToastRef.current(res.message || `Đã truyền thành công ${item.filename} xuống nhà hàng`, 'success');
        setRestaurantFileStatus((prev) => ({
          ...prev,
          [item.filename]: { exists: true, size: res.size_bytes }
        }));
      } else {
        if (onToastRef.current) onToastRef.current(res.message || `Lỗi truyền file ${item.filename}`, 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi truyền file xuống nhà hàng';
      if (onToastRef.current) onToastRef.current(msg, 'error');
    } finally {
      setPushingFileKey(null);
    }
  };

  // Truyền tất cả các file đã tìm thấy xuống nhà hàng
  const handleBulkPushAllFoundImages = async () => {
    const defaultHost = getValidMongoHost(connectedHost) || selectedRestaurant?.ip || '';
    const ip = (restaurantTargetIp || defaultHost || '').trim();
    const folder = (restaurantTargetFolder || 'D:\\GPOS-Setup\\app\\img\\menu').trim();

    if (!ip) {
      if (onToastRef.current) onToastRef.current('Vui lòng nhập IP máy trạm nhà hàng cần truyền ảnh', 'error');
      return;
    }

    if (globalSearchResults.length === 0) {
      if (onToastRef.current) onToastRef.current('Không có file ảnh nào để truyền', 'info');
      return;
    }

    setBulkPushing(true);
    try {
      const items = globalSearchResults.map((r) => ({
        remote_source_path: r.full_path,
        filename: r.filename,
        relative_url: r.relative_url,
        gateway_url: r.gateway_url
      }));

      const res = await mongoService.bulkPushImagesToRestaurant({
        target_ip: ip,
        target_folder: folder,
        items: items,
        overwrite: true
      });

      if (res.success) {
        if (onToastRef.current) onToastRef.current(res.message || `Đã truyền thành công ${res.total_success} file xuống nhà hàng`, 'success');
        setRestaurantFileStatus((prev) => {
          const updated = { ...prev };
          (res.results || []).forEach((r) => {
            if (r.success) {
              updated[r.filename] = { exists: true, size: r.size_bytes };
            }
          });
          return updated;
        });
      } else {
        if (onToastRef.current) onToastRef.current(res.message || 'Truyền file xuống nhà hàng thất bại', 'error');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Lỗi truyền file xuống nhà hàng';
      if (onToastRef.current) onToastRef.current(msg, 'error');
    } finally {
      setBulkPushing(false);
    }
  };

  // Mở popup tra cứu toàn server và tự động tìm nếu có từ khóa
  const handleOpenGlobalSearch = (initialKeyword: string | number = '') => {
    let cleanKw = String(initialKeyword ?? '').trim();
    if (cleanKw.includes('/')) {
      cleanKw = cleanKw.split('/').pop() || cleanKw;
    }
    const defaultHost = getValidMongoHost(connectedHost) || selectedRestaurant?.ip || '';
    if (defaultHost && !restaurantTargetIp) {
      setRestaurantTargetIp(defaultHost);
    }
    setGlobalSearchKeyword(cleanKw);
    setGlobalQuickInput(cleanKw);
    setShowGlobalSearchModal(true);
    if (cleanKw) {
      handleExecuteGlobalSearch(cleanKw);
    }
  };

  const handleCopyGlobalItem = (text: string, label: string) => {
    copyToClipboard(text);
    setCopiedGlobalPath(text);
    if (onToastRef.current) onToastRef.current(`Đã sao chép ${label}!`, 'success');
    setTimeout(() => setCopiedGlobalPath(null), 2000);
  };

  // Xuất file Excel các món bị sai link hoặc tên hình ảnh của ĐÚNG MENU ĐƯỢC CHỌN (theo chuẩn File 3 Customer_Menu)
  const handleExportMismatchedExcel = async () => {
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(rawHost);
    if (!cleanHost) {
      if (onToastRef.current) onToastRef.current('Chưa xác định IP kết nối MongoDB máy trạm!', 'error');
      return;
    }

    if (!selectedCategory?.code) {
      if (onToastRef.current) onToastRef.current('Vui lòng chọn một menu để xuất đối soát hình ảnh!', 'info');
      return;
    }

    setExportingExcel(true);
    try {
      const { blob, filename, mismatchedCount } = await mongoService.exportMismatchedDishesExcel({
        host: cleanHost,
        port: 27017,
        menu_code: selectedCategory.code,
        menu_name: selectedCategory.name,
        restaurant_name: selectedRestaurant?.name || '',
        dishes: dishes.map((d: DishItem) => ({
          id: d.id,
          name: d.name,
          rk7_code: d.rk7Code,
          sap_code: d.sapCode,
          src_img: d.srcImg || '',
          image_url: d.imageUrl || '',
          url_img_qr: d.urlImgQr || ''
        }))
      });

      // Tạo URL download file Excel trực tiếp trên trình duyệt
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (onToastRef.current) {
        if (mismatchedCount > 0) {
          onToastRef.current(
            `Đã xuất thành công ${mismatchedCount} món sai link/tên ảnh của menu "${selectedCategory.name}" ra file Excel (${filename})!`,
            'success'
          );
        } else {
          onToastRef.current(
            `Tuyệt vời! Toàn bộ món của menu "${selectedCategory.name}" đều khớp ảnh chuẩn trên server (0 món lệch).`,
            'info'
          );
        }
      }
    } catch (err: any) {
      console.error('Lỗi xuất Excel món sai ảnh:', err);
      let detailMsg = err.message || 'Lỗi không xác định';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          detailMsg = parsed.detail || text;
        } catch {
          // fallback
        }
      } else if (err.response?.data?.detail) {
        detailMsg = err.response.data.detail;
      }
      if (onToastRef.current) {
        onToastRef.current('Lỗi xuất file Excel đối soát ảnh: ' + detailMsg, 'error');
      }
    } finally {
      setExportingExcel(false);
    }
  };


  // Thêm nhanh các nhóm SO chưa có lên CO
  const handleBulkAddMissingGroupsToCo = async (groupCodes: string[]) => {
    if (groupCodes.length === 0) return;
    const rawHost = connectedHost || selectedRestaurant?.ip;
    const cleanHost = getValidMongoHost(rawHost);
    if (!cleanHost) return;

    if (!confirm(`Đưa ${groupCodes.length} nhóm này lên cấu hình hiển thị CO cho Menu "${selectedCategory.name}"?`)) {
      return;
    }

    try {
      const res = await mongoService.bulkSyncMenuGroupsCo({
        host: cleanHost,
        port: 27017,
        menu_code: selectedCategory.code,
        group_codes: groupCodes,
        action: 'ADD',
        update_file2: true
      });

      if (onToastRef.current) {
        onToastRef.current(res.message, 'success');
      }

      await fetchCoGroupsDetail(selectedCategory.code);
      await loadDishesFromMongo(cleanHost);
    } catch (err: any) {
      if (onToastRef.current) {
        onToastRef.current('Lỗi thêm nhóm lên CO: ' + (err.response?.data?.detail || err.message), 'error');
      }
    }
  };

  // Thêm mã nhóm thủ công vào CO
  const handleAddManualGroupToCo = async () => {
    const code = manualGroupInput.trim();
    if (!code) return;
    const codes = code.split(/[\s,;\n]+/).filter(Boolean);
    if (codes.length === 0) return;
    await handleBulkAddMissingGroupsToCo(codes);
    setManualGroupInput('');
  };

  // Click vào bàn trên Sơ đồ bàn -> Mở Bước 2: Chọn Hạng Mục Order
  const handleSelectTableFromMap = (table: PosTableData) => {
    setActiveTableId(table.id);

    // Tự động kiểm tra nếu thực đơn chưa nạp đủ hoặc đang là dữ liệu mẫu fallback (<= 5 món), lập tức nạp từ MongoDB
    const validHost = getValidMongoHost(connectedHost || selectedRestaurant?.ip);
    if (validHost && dishes.length <= 5) {
      loadDishesFromMongo(validHost);
    }

    // Nếu bàn đã có order và đã chọn loại menu thì vào thẳng Menu
    if (table.orderItems.length > 0 && table.selectedCategoryCode) {
      setCurrentView('menu_order');
    } else {
      // Hiện ra màn hình Chọn Hạng Mục Order (Image 2)
      setCurrentView('select_category');
    }
  };

  // Xác nhận Hạng Mục Order -> Vào Màn hình Thực Đơn Menu (Image 3)
  const handleConfirmCategory = (cat: OrderCategoryOption, mode: 'SO' | 'CO' = 'SO') => {
    setSelectedCategory(cat);
    setOrderMode(mode);
    // Cập nhật thông tin cho bàn
    setTables((prev) =>
      prev.map((t) =>
        t.id === activeTableId
          ? {
              ...t,
              selectedCategoryName: cat.name,
              selectedCategoryCode: cat.code,
              status: t.status === 'EMPTY' ? 'ORDERING' : t.status
            }
          : t
      )
    );

    // Tự động kiểm tra nếu thực đơn chưa nạp đủ hoặc đang là dữ liệu mẫu fallback (<= 5 món), lập tức nạp từ MongoDB
    const validHost = getValidMongoHost(connectedHost || selectedRestaurant?.ip);
    if (validHost && dishes.length <= 5) {
      loadDishesFromMongo(validHost);
    }

    if (mode === 'CO') {
      fetchCoGroupsDetail(cat.code);
    }

    // Nếu chọn Buffet và nhà hàng có món 0đ thì ưu tiên tab Buffet, ngược lại Alacarte
    if (hasBuffetDishes && (cat.code.toLowerCase().includes('bf') || cat.name.toLowerCase().includes('buffet'))) {
      setActiveSuperType('buffet');
    } else {
      setActiveSuperType('alacarte');
    }

    // Chuyển sang màn hình Menu Gọi Món
    setCurrentView('menu_order');
  };

  // Kiểm tra xem thực đơn có món Buffet (giá = 0đ và không phải đồ uống) hay không
  const hasBuffetDishes = useMemo(() => {
    return dishes.some((d) => d.price === 0 && !d.isDrink);
  }, [dishes]);

  // Nếu thực đơn không có món 0đ mà đang chọn tab buffet thì tự động chuyển về alacarte
  useEffect(() => {
    if (!hasBuffetDishes && activeSuperType === 'buffet') {
      setActiveSuperType('alacarte');
    }
  }, [hasBuffetDishes, activeSuperType]);

  // ── LOGIC LỌC THỰC ĐƠN MÓN THEO: TẤT CẢ / ALACARTE / BUFFET / ĐỒ UỐNG ──
  // - Tất cả ('all'): hiển thị toàn bộ món ăn trong thực đơn
  // - Alacarte: món giá > 0 (không phải đồ uống, trừ khi món đó nằm trong nhóm Combo)
  // - Buffet: món giá = 0 và không phải đồ uống
  // - Đồ uống: các món có isDrink = true
  const filteredDishesBySuperType = useMemo(() => {
    return dishes.filter((dish) => {
      if (activeSuperType === 'all') {
        return true;
      }
      if (activeSuperType === 'alacarte') {
        if (dish.isDrink && dish.group.toLowerCase() !== 'combo') return false;
        return dish.price > 0;
      }
      if (activeSuperType === 'buffet') {
        return dish.price === 0 && !dish.isDrink;
      }
      if (activeSuperType === 'drink') {
        return !!dish.isDrink;
      }
      return true;
    });
  }, [dishes, activeSuperType]);

  // Danh sách các nhóm món duy nhất tồn tại trong Loại Menu hiện tại
  const availableGroupsInSuperType = useMemo(() => {
    const grpSet = new Set<string>();
    filteredDishesBySuperType.forEach((d) => grpSet.add(d.group));
    const list = Array.from(grpSet);

    // Đưa nhóm 'Combo' lên đầu tiên nếu có
    return list.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      if (aLower === 'combo') return -1;
      if (bLower === 'combo') return 1;
      return a.localeCompare(b);
    });
  }, [filteredDishesBySuperType]);

  // Đảm bảo activeGroup luôn hợp lệ khi đổi tab Alacarte / Buffet / Đồ uống
  useEffect(() => {
    if (availableGroupsInSuperType.length > 0) {
      if (!availableGroupsInSuperType.includes(activeGroup)) {
        // Ưu tiên chọn 'Combo' nếu có, nếu không thì lấy nhóm đầu tiên
        const comboGroup = availableGroupsInSuperType.find((g) => g.toLowerCase() === 'combo');
        setActiveGroup(comboGroup || availableGroupsInSuperType[0]);
      }
    }
  }, [availableGroupsInSuperType, activeGroup]);

  // Danh sách món cuối cùng hiển thị trên lưới:
  // Lọc theo Nhóm món đang chọn + Từ khóa tìm kiếm
  const displayedDishes = useMemo(() => {
    return filteredDishesBySuperType.filter((dish) => {
      // Lọc theo nhóm
      if (activeGroup && dish.group !== activeGroup) {
        return false;
      }
      // Lọc theo từ khóa tìm kiếm
      if (menuSearch.trim()) {
        const q = menuSearch.trim().toLowerCase();
        const qNorm = removeVietnameseTones(menuSearch.trim());
        const mName = dish.name.toLowerCase().includes(q) || removeVietnameseTones(dish.name).includes(qNorm);
        const mRk7 = String(dish.rk7Code || '').toLowerCase().includes(q);
        const mSap = String(dish.sapCode || '').toLowerCase().includes(q);
        if (!mName && !mRk7 && !mSap) return false;
      }
      return true;
    });
  }, [filteredDishesBySuperType, activeGroup, menuSearch]);

  // ── LOGIC TÌM KIẾM ĐIỀU HƯỚNG TỚI 1 MÓN ĂN (JUMP TO DISH) ──
  // Hỗ trợ tìm theo mã RK7, SAP, Tên món (không dấu hoặc có dấu, không phân biệt hoa thường)
  const jumpSuggestions = useMemo(() => {
    const q = dishJumpQuery.trim();
    if (!q) return [];
    const qNorm = removeVietnameseTones(q);
    const qLower = q.toLowerCase();

    const seen = new Set<string>();
    const results: DishItem[] = [];

    for (const dish of dishes) {
      const rk7 = String(dish.rk7Code || '').toLowerCase();
      const sap = String(dish.sapCode || '').toLowerCase();
      const nameLower = (dish.name || '').toLowerCase();
      const nameNorm = removeVietnameseTones(dish.name || '');

      const isMatch =
        rk7.includes(qLower) ||
        sap.includes(qLower) ||
        nameLower.includes(qLower) ||
        nameNorm.includes(qNorm);

      if (isMatch) {
        // Đảm bảo không trùng lặp dòng gợi ý
        const dedupKey = `${dish.name.trim().toLowerCase()}___${dish.group.trim().toLowerCase()}___${dish.rk7Code}___${dish.sapCode}___${dish.price}`;
        if (!seen.has(dedupKey)) {
          seen.add(dedupKey);
          results.push(dish);
          if (results.length >= 8) break;
        }
      }
    }

    return results;
  }, [dishes, dishJumpQuery]);

  const handleJumpToDish = (targetDish: DishItem) => {
    if (!targetDish) return;

    // 1. Xác định Loại Menu (SuperType) của món: drink | buffet | alacarte
    const targetSuperType: MenuSuperType = targetDish.isDrink
      ? 'drink'
      : targetDish.price === 0
      ? 'buffet'
      : 'alacarte';

    setActiveSuperType(targetSuperType);
    setActiveGroup(targetDish.group);
    setDishJumpQuery(''); // Xóa ô tìm kiếm sau khi trỏ tới món
    setMenuSearch(''); // Xóa bộ lọc text để toàn bộ món trong nhóm hiển thị
    setHighlightedDishId(targetDish.id);
    setIsJumpSearchFocused(false);
    setJumpSearchError(null);

    // 2. Tự động cuộn mượt tới vị trí card món ăn
    setTimeout(() => {
      const el = document.getElementById(`dish-card-${targetDish.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    // 3. Tự động tắt viền highlight sau 4 giây
    setTimeout(() => {
      setHighlightedDishId((prev) => (prev === targetDish.id ? null : prev));
    }, 4000);
  };

  const handleJumpSearchSubmit = () => {
    const q = dishJumpQuery.trim();
    if (!q) return;

    if (jumpSuggestions.length === 0) {
      setJumpSearchError(`Không tìm thấy món nào với từ khóa "${q}"`);
      setTimeout(() => setJumpSearchError(null), 3000);
      return;
    }

    // Ưu tiên khớp chính xác mã RK7, SAP hoặc Tên
    const qNorm = removeVietnameseTones(q);
    const exactMatch = jumpSuggestions.find(
      (d) =>
        String(d.rk7Code || '').trim().toLowerCase() === q.toLowerCase() ||
        String(d.sapCode || '').trim().toLowerCase() === q.toLowerCase() ||
        removeVietnameseTones(d.name) === qNorm ||
        d.name.trim().toLowerCase() === q.toLowerCase()
    );

    const selectedDish = exactMatch || jumpSuggestions[0];
    handleJumpToDish(selectedDish);
  };

  // Thêm món vào đơn của bàn
  const handleAddDishToOrder = (dish: DishItem) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== activeTableId) return t;

        const existingIdx = t.orderItems.findIndex((it) => it.dishId === dish.id);
        let updatedItems: OrderLineItem[] = [];

        if (existingIdx >= 0) {
          updatedItems = t.orderItems.map((it, idx) =>
            idx === existingIdx ? { ...it, quantity: it.quantity + 1.0 } : it
          );
        } else {
          updatedItems = [
            ...t.orderItems,
            {
              id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              dishId: dish.id,
              name: dish.name,
              quantity: 1.0,
              price: dish.price,
              rk7Code: dish.rk7Code,
              sapCode: dish.sapCode,
              status: 'new'
            }
          ];
        }

        return {
          ...t,
          status: 'ORDERING',
          orderItems: updatedItems
        };
      })
    );

    if (onToastRef.current) {
      onToastRef.current(`Đã thêm "${dish.name}" vào ${currentTable.name}`, 'success');
    }
  };

  // Cập nhật số lượng món (+ / -)
  const handleUpdateQuantity = (dishId: string, delta: number) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== activeTableId) return t;
        const updated = t.orderItems
          .map((it) => {
            if (it.dishId === dishId) {
              const newQty = it.quantity + delta;
              return newQty > 0 ? { ...it, quantity: Number(newQty.toFixed(1)) } : null;
            }
            return it;
          })
          .filter(Boolean) as OrderLineItem[];

        return { ...t, orderItems: updated };
      })
    );
  };

  // Xóa món khỏi đơn
  const handleRemoveOrderItem = (dishId: string) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== activeTableId) return t;
        return {
          ...t,
          orderItems: t.orderItems.filter((it) => it.dishId !== dishId)
        };
      })
    );
  };

  // Gửi order cho bàn (nút cam [GỬI ORDER])
  const handleSendOrder = () => {
    if (!currentTable.orderItems || currentTable.orderItems.length === 0) {
      if (onToastRef.current) onToastRef.current('Chưa có món nào trong đơn để gửi bếp!', 'error');
      return;
    }

    setTables((prev) =>
      prev.map((t) => {
        if (t.id !== activeTableId) return t;
        return {
          ...t,
          status: 'OCCUPIED',
          openTimeStr: t.openTimeStr || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          durationMinutes: t.durationMinutes || 1,
          orderItems: t.orderItems.map((it) => ({ ...it, status: 'served' }))
        };
      })
    );

    if (onToastRef.current) {
      onToastRef.current(`Đã gửi ${currentTable.orderItems.length} món cho ${currentTable.name} tới Bếp & Bar thành công!`, 'success');
    }
  };

  // Tính tổng tiền đơn hàng hiện tại
  const orderSubtotal = useMemo(() => {
    if (!currentTable || !currentTable.orderItems) return 0;
    return currentTable.orderItems.reduce((sum, it) => sum + it.quantity * it.price, 0);
  }, [currentTable]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MÀN HÌNH 1: SƠ ĐỒ BÀN THEO KHU (KHỚP 100% ẢNH 1 CỦA NGƯỜI DÙNG)
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentView === 'table_map') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '600px' }}>
        {/* Thanh Header Sảnh: Nút chọn sảnh (Ảnh 1: Nút "Tầng 1" màu xanh đậm) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {uniqueHalls.map((hall) => {
              const isSelected = selectedHall === hall;
              return (
                <button
                  key={hall}
                  type="button"
                  onClick={() => setSelectedHall(hall)}
                  style={{
                    backgroundColor: isSelected ? '#1e3a5f' : '#f3f4f6',
                    color: isSelected ? '#ffffff' : '#374151',
                    border: isSelected ? '1px solid #1e3a5f' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 22px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {hall}
                </button>
              );
            })}
          </div>

          {/* Nút đồng bộ lại dữ liệu MongoDB */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Nhà hàng: <strong>{selectedRestaurant?.res || 'Chuỗi Nhà Hàng GGG'}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncWithMongo(true)}
              leftIcon={<RefreshCw size={14} />}
            >
              Đồng bộ MongoDB
            </Button>
          </div>
        </div>

        {/* Tiêu đề "Danh sách bàn" ở giữa 2 đường kẻ ngang thanh lịch (Khớp Ảnh 1) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '10px 0',
            position: 'relative'
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <h2
            style={{
              padding: '0 24px',
              fontSize: '20px',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.3px'
            }}
          >
            Danh sách bàn
          </h2>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        {/* Lưới các thẻ bàn (Khớp Ảnh 1: Hình chữ nhật bo góc, Tên góc trên trái, icon ghế 4 góc dưới phải) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px'
          }}
        >
          {currentHallTables.map((table) => {
            const hasOrder = table.orderItems.length > 0;
            const isOccupied = table.status === 'OCCUPIED' || hasOrder;

            return (
              <div
                key={table.id}
                onClick={() => handleSelectTableFromMap(table)}
                style={{
                  height: '140px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: isOccupied ? '2px solid #ea580c' : '1px solid #d1d5db',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1e3a5f';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isOccupied ? '#ea580c' : '#d1d5db';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
              >
                {/* Góc trên bên trái: Tên bàn to rõ (Ảnh 1: A1, A2, A3...) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827' }}>
                    {table.name}
                  </div>

                  {/* Nhãn có khách nếu bàn đang phục vụ */}
                  {isOccupied && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#fff1f2',
                        color: '#e11d48',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #fecdd3'
                      }}
                    >
                      Đang phục vụ ({table.orderItems.length} món)
                    </span>
                  )}
                </div>

                {/* Góc dưới bên phải: Icon ghế + số lượng khách (Ảnh 1: 🪑 4) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#4b5563',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    {/* Icon ghế ngồi thiết kế tối giản chuẩn POS */}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      <rect x="5" y="11" width="14" height="6" rx="2" />
                      <path d="M7 17v4M17 17v4" />
                    </svg>
                    <span>{table.capacity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MÀN HÌNH 2: CHỌN HẠNG MỤC ORDER (DÀN NGANG CĂN GIỮA NHƯ SƠ ĐỒ BÀN)
  // ── ĐƯỢC LOAD TRỰC TIẾP TỪ RESTAURANT_CATEGORY (ẨN HIỆN MENU), KHÔNG HIỆN NHÂN VIÊN ──
  // ═══════════════════════════════════════════════════════════════════════════
  if (currentView === 'select_category') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px 20px',
          maxWidth: '1200px',
          margin: '0 auto',
          minHeight: '520px'
        }}
      >
        {/* Nút quay lại sơ đồ bàn & tiêu đề bàn đang mở */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setCurrentView('table_map')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Quay lại sơ đồ bàn
          </button>

          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e3a5f' }}>
            Đang mở bàn: <strong>{currentTable.name}</strong> ({currentTable.hallName})
          </div>
        </div>

        {/* Tiêu đề "Loại Menu" căn giữa với 2 đường kẻ mảnh như sơ đồ bàn */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '16px 0 10px 0',
            position: 'relative'
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <h2
            style={{
              padding: '0 24px',
              fontSize: '22px',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <span>Loại Menu</span>
            <span
              style={{
                color: '#800000',
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: '18px'
              }}
            >
              (Nếu muốn KH chọn menu theo nhu cầu)
            </span>
          </h2>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        {/* Các thẻ lựa chọn Loại Menu: DÀN NGANG CĂN GIỮA NHƯ DANH SÁCH SƠ ĐỒ BÀN */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '20px',
            margin: '20px 0 30px 0'
          }}
        >
          {categories.map((cat) => {
            const isCatSelected = selectedCategory.code === cat.code;
            return (
              <div
                key={cat.id}
                onClick={() => handleConfirmCategory(cat)}
                style={{
                  width: '270px',
                  minHeight: '140px',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  border: isCatSelected ? '2px solid #ea580c' : '1px solid #d1d5db',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: isCatSelected ? '0 4px 12px rgba(234, 88, 12, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ea580c';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = isCatSelected ? '#ea580c' : '#d1d5db';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = isCatSelected ? '0 4px 12px rgba(234, 88, 12, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
              >
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: isCatSelected ? '#ea580c' : '#111827',
                      letterSpacing: '-0.2px',
                      marginBottom: '4px'
                    }}
                  >
                    {cat.name}
                  </div>
                  {cat.code && (
                    <div
                      style={{
                        fontSize: '15px',
                        color: '#4b5563',
                        fontWeight: 600
                      }}
                    >
                      ({cat.code})
                    </div>
                  )}
                  {cat.description && (
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                      {cat.description}
                    </div>
                  )}
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', width: '100%' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmCategory(cat, 'SO');
                      }}
                      style={{
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#fffbeb',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Vào gọi món thực đơn chế độ Staff Order (SO)"
                    >
                      <Smartphone size={13} />
                      <span>Vào SO</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmCategory(cat, 'CO');
                      }}
                      style={{
                        padding: '6px 4px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#ecfdf5',
                        color: '#047857',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Vào quản lý thực đơn Customer Order (CO) - Check hình & Nhóm"
                    >
                      <Monitor size={13} />
                      <span>Vào CO</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nút hành động căn giữa: 2 chế độ SO và CO */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => setCurrentView('table_map')}
          >
            Hủy bỏ
          </Button>

          <Button
            variant="outline"
            onClick={() => handleConfirmCategory(selectedCategory, 'SO')}
            leftIcon={<Smartphone size={15} color="#b45309" />}
            style={{
              borderColor: '#f59e0b',
              color: '#b45309',
              backgroundColor: '#fffbeb',
              fontWeight: 700
            }}
          >
            📱 Vào Menu SO ({selectedCategory.name})
          </Button>

          <Button
            variant="primary"
            onClick={() => handleConfirmCategory(selectedCategory, 'CO')}
            leftIcon={<Monitor size={15} color="#ffffff" />}
            style={{
              backgroundColor: '#059669',
              borderColor: '#059669',
              fontWeight: 700
            }}
          >
            🖥️ Vào Menu CO ({selectedCategory.name})
          </Button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MÀN HÌNH 3: MENU GỌI MÓN POS (KHỚP 100% ẢNH 3 & ĐỒNG BỘ 100% TÁC VỤ 3)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: '0px',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        minHeight: '680px',
        overflow: 'hidden'
      }}
    >
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* CỘT TRÁI: THÔNG TIN BÀN & DANH SÁCH MÓN ĐÃ ORDER (KHỚP ẢNH 3)     */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderRight: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
      >
        {/* Top bar cột trái: Nút quay lại ←, Tên bàn B2, icon ••• */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <button
            type="button"
            onClick={() => setCurrentView('table_map')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
            title="Quay lại sơ đồ bàn"
          >
            <ArrowLeft size={22} color="#111827" />
          </button>

          <div style={{ fontSize: '18px', fontWeight: 800, color: '#111827' }}>
            {currentTable.name}
          </div>

          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
            title="Tùy chọn khác"
          >
            <MoreHorizontal size={22} color="#111827" />
          </button>
        </div>

        {/* Thanh 4 nút chức năng: [Kiểm đồ], [Ra món], [In QRCode], [GỬI ORDER] (Ảnh 3) */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid #e5e7eb',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Nút 1: Kiểm đồ */}
          <button
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
              fontWeight: 600
            }}
          >
            <ClipboardList size={18} color="#ea580c" />
            <span>Kiểm đồ</span>
          </button>

          {/* Nút 2: Ra món */}
          <button
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
              fontWeight: 600
            }}
          >
            <BookOpen size={18} color="#ea580c" />
            <span>Ra món</span>
          </button>

          {/* Nút 3: In QRCode */}
          <button
            type="button"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '8px 4px',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#374151',
              fontWeight: 600
            }}
          >
            <QrCode size={18} color="#4b5563" />
            <span>In QRCode</span>
          </button>

          {/* Nút 4: GỬI ORDER (Nút cam nổi bật to rõ như Ảnh 3) */}
          <button
            type="button"
            onClick={handleSendOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 4px',
              backgroundColor: '#f97316',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              color: '#ffffff',
              fontWeight: 800,
              letterSpacing: '0.3px',
              boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)'
            }}
          >
            GỬI ORDER
          </button>
        </div>

        {/* Danh sách các món đã order (Khớp Ảnh 3: "1.0 x Gà xù truyền thống   32,407 đ") */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {currentTable.orderItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#9ca3af' }}>
              <ChefHat size={36} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Chưa có món nào được chọn</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Bấm vào thực đơn bên phải để thêm món</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentTable.orderItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #f3f4f6'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                      {item.quantity.toFixed(1)} x
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {item.name}
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 400 }}>
                        RK7: {item.rk7Code} | SAP: {item.sapCode}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                      {formatMoney(item.quantity * item.price)}
                    </span>

                    {/* Nút tăng/giảm/xóa */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.dishId, -1)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.dishId, 1)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveOrderItem(item.dishId)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          border: 'none',
                          background: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tổng tiền thanh toán tạm tính dưới chân cột trái */}
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Tạm tính ({currentTable.orderItems.length} món):</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{formatMoney(orderSubtotal)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #d1d5db', paddingTop: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>TỔNG CỘNG:</span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#ea580c' }}>{formatMoney(orderSubtotal)}</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* CỘT PHẢI: THỰC ĐƠN GỌI MÓN (KHỚP 100% ẢNH 3 & ĐỒNG BỘ MONGODB)   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: '#f9fafb'
        }}
      >
        {/* Hàng 1: 3 Tab Loại Menu chính: Alacarte | Buffet | Đồ uống + Ô tìm kiếm */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#ffffff'
          }}
        >
          {/* Trái: Switch 2 Chế Độ SO / CO & Các Tabs chính Tất cả • Alacarte • Buffet • Đồ uống */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Thanh chuyển chế độ SO (Staff Order) và CO (Customer Order) */}
            <div
              style={{
                display: 'inline-flex',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                padding: '2px',
                backgroundColor: '#f1f5f9'
              }}
            >
              <button
                type="button"
                onClick={() => setOrderMode('SO')}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: orderMode === 'SO' ? '#ffffff' : 'transparent',
                  color: orderMode === 'SO' ? '#d97706' : '#64748b',
                  boxShadow: orderMode === 'SO' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Kênh Staff Order (SO) - Menu nhân viên gọi món"
              >
                <Smartphone size={13} />
                <span>Kênh SO</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderMode('CO');
                  if (selectedCategory.code) {
                    fetchCoGroupsDetail(selectedCategory.code);
                  }
                }}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: orderMode === 'CO' ? '#ffffff' : 'transparent',
                  color: orderMode === 'CO' ? '#059669' : '#64748b',
                  boxShadow: orderMode === 'CO' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Kênh Customer Order (CO) - Quản lý nhóm & kiểm tra link hình ảnh với máy chủ 192.168.201.116"
              >
                <Monitor size={13} />
                <span>Kênh CO (Khách)</span>
              </button>
            </div>
            {/* Tab: Tất cả */}
            <button
              type="button"
              onClick={() => setActiveSuperType('all')}
              style={{
                padding: '12px 6px',
                fontSize: '15px',
                fontWeight: activeSuperType === 'all' ? 800 : 500,
                color: activeSuperType === 'all' ? '#ea580c' : '#374151',
                borderBottom: activeSuperType === 'all' ? '3px solid #ea580c' : '3px solid transparent',
                backgroundColor: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Tất cả ({dishes.length})
            </button>

            {/* Tab: Alacarte */}
            <button
              type="button"
              onClick={() => setActiveSuperType('alacarte')}
              style={{
                padding: '12px 6px',
                fontSize: '15px',
                fontWeight: activeSuperType === 'alacarte' ? 800 : 500,
                color: activeSuperType === 'alacarte' ? '#ea580c' : '#374151',
                borderBottom: activeSuperType === 'alacarte' ? '3px solid #ea580c' : '3px solid transparent',
                backgroundColor: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Alacarte
            </button>

            {/* Tab: Buffet - CHỈ HIỂN THỊ KHI MENU CÓ MÓN 0Đ */}
            {hasBuffetDishes && (
              <button
                type="button"
                onClick={() => setActiveSuperType('buffet')}
                style={{
                  padding: '12px 6px',
                  fontSize: '15px',
                  fontWeight: activeSuperType === 'buffet' ? 800 : 500,
                  color: activeSuperType === 'buffet' ? '#ea580c' : '#374151',
                  borderBottom: activeSuperType === 'buffet' ? '3px solid #ea580c' : '3px solid transparent',
                  backgroundColor: 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Buffet
              </button>
            )}

            {/* Tab: Đồ uống */}
            <button
              type="button"
              onClick={() => setActiveSuperType('drink')}
              style={{
                padding: '12px 6px',
                fontSize: '15px',
                fontWeight: activeSuperType === 'drink' ? 800 : 500,
                color: activeSuperType === 'drink' ? '#ea580c' : '#374151',
                borderBottom: activeSuperType === 'drink' ? '3px solid #ea580c' : '3px solid transparent',
                backgroundColor: 'transparent',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Đồ uống
            </button>
          </div>

          {/* Phải: Nút Làm Mới Thực Đơn MongoDB & Ô TÌM KIẾM MÓN ĂN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => {
                const validHost = getValidMongoHost(connectedHost || selectedRestaurant?.ip);
                if (validHost) {
                  loadDishesFromMongo(validHost);
                  if (onToastRef.current) {
                    onToastRef.current(`Đang nạp lại thực đơn từ MongoDB ${validHost}...`, 'info');
                  }
                } else if (onToastRef.current) {
                  onToastRef.current('Chưa xác định IP kết nối MongoDB máy trạm!', 'info');
                }
              }}
              disabled={loadingDishes}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid #fed7aa',
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                fontSize: '12px',
                fontWeight: 700,
                cursor: loadingDishes ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Làm mới thực đơn trực tiếp từ MongoDB trạm nhà hàng"
            >
              <RefreshCw size={13} className={loadingDishes ? 'animate-spin' : ''} />
              Làm Mới ({dishes.length} món)
            </button>

            {/* Ô TÌM KIẾM MÓN ĂN DUY NHẤT - TRỎ TỚI MÓN & NHÓM TƯƠNG ỨNG HOẶC LỌC MÓN */}
            <div
              ref={jumpSearchContainerRef}
              style={{
                position: 'relative',
                width: '320px',
                maxWidth: '420px'
              }}
            >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: isJumpSearchFocused ? '1.5px solid #ea580c' : '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                boxShadow: isJumpSearchFocused ? '0 0 0 2px rgba(234,88,12,0.15)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ padding: '0 8px', color: isJumpSearchFocused ? '#ea580c' : '#9ca3af', display: 'flex', alignItems: 'center' }}>
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Tìm món (mã RK7, SAP, Tên có/không dấu)..."
                value={dishJumpQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setDishJumpQuery(val);
                  setMenuSearch(val);
                  setIsJumpSearchFocused(true);
                  setJumpSearchError(null);
                }}
                onFocus={() => setIsJumpSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleJumpSearchSubmit();
                  } else if (e.key === 'Escape') {
                    setIsJumpSearchFocused(false);
                  }
                }}
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: '13px',
                  padding: '7px 4px 7px 0',
                  backgroundColor: 'transparent'
                }}
              />
              {dishJumpQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setDishJumpQuery('');
                    setMenuSearch('');
                    setJumpSearchError(null);
                  }}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: '0 6px',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px'
                  }}
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={handleJumpSearchSubmit}
                style={{
                  border: 'none',
                  borderLeft: '1px solid #e5e7eb',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  padding: '0 14px',
                  height: '34px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
                title="Bấm để trỏ tới món và nhóm tương ứng"
              >
                Tìm
              </button>
            </div>

            {/* Thông báo không tìm thấy (nếu có) */}
            {jumpSearchError && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '12px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  zIndex: 50,
                  boxShadow: '0 4px 6px rgba(0,0,0,0.08)'
                }}
              >
                ⚠️ {jumpSearchError}
              </div>
            )}

            {/* Dropdown danh sách gợi ý món ăn (đã khử trùng lặp) */}
            {isJumpSearchFocused && dishJumpQuery.trim() && jumpSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 60,
                  maxHeight: '340px',
                  overflowY: 'auto'
                }}
              >
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: '#6b7280', backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                  Gợi ý ({jumpSuggestions.length} món) - Bấm để trỏ tới món:
                </div>
                {jumpSuggestions.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleJumpToDish(item)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'background-color 0.1s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff7ed';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            backgroundColor: item.isDrink ? '#dbeafe' : item.price === 0 ? '#dcfce7' : '#ffedd5',
                            color: item.isDrink ? '#1e40af' : item.price === 0 ? '#166534' : '#9a3412',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontWeight: 700,
                            fontSize: '10px'
                          }}
                        >
                          {item.isDrink ? 'Đồ uống' : item.price === 0 ? 'Buffet' : 'Alacarte'}
                        </span>
                        <span>Nhóm: <strong>{item.group}</strong></span>
                        <span>RK7: <strong>{item.rk7Code}</strong></span>
                        <span>SAP: <strong>{item.sapCode}</strong></span>
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: item.price === 0 ? '#059669' : '#ea580c', whiteSpace: 'nowrap' }}>
                      {item.price === 0 ? 'Buffet (0 đ)' : formatMoney(item.price)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

        {/* ═════════════════════════════════════════════════════════════════ */}
        {/* THANH THÔNG TIN CẤU HÌNH NHÓM HIỂN THỊ CO (THEO FILE 2 & MONGO)   */}
        {/* HIỂN THỊ KHI CHỌN CHẾ ĐỘ CO: MÃ LOẠI, TÊN MENU, NHÓM CO & NHÓM SO THIẾU */}
        {/* ═════════════════════════════════════════════════════════════════ */}
        {orderMode === 'CO' && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderBottom: '1.5px solid #e2e8f0',
              padding: '10px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {/* Header CO: Mã Loại Menu, Tên Menu, Tóm Tắt & Nút Check Toàn Bộ Ảnh */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <FileSpreadsheet size={15} color="#059669" />
                  <span>Cấu Hình CO (File 2):</span>
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px' }}>
                  Mã loại: {selectedCategory.code}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#ecfdf5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
                  Tên menu: {selectedCategory.name}
                </span>
                {coDetail && (
                  <button
                    type="button"
                    onClick={() => setIsCoGroupsBarExpanded(!isCoGroupsBarExpanded)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: isCoGroupsBarExpanded ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                      backgroundColor: isCoGroupsBarExpanded ? '#eff6ff' : '#ffffff',
                      color: isCoGroupsBarExpanded ? '#1d4ed8' : '#475569',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={isCoGroupsBarExpanded ? 'Bấm để ẩn khung chi tiết nhóm CO & SO' : 'Bấm để hiển thị chi tiết nhóm CO & SO'}
                  >
                    {isCoGroupsBarExpanded ? <EyeOff size={12} color="#1d4ed8" /> : <Eye size={12} color="#475569" />}
                    <span>({coDetail.co_group_codes.length} nhóm CO • {coDetail.so_groups.length} nhóm SO)</span>
                    {isCoGroupsBarExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              {/* Action Buttons: Check Toàn Bộ Ảnh Server & Đồng Nhất */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCheckAllMenuImages}
                  disabled={checkingAllMenu}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: checkingAllMenu ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title="So khớp toàn bộ link hình của Menu này với máy chủ ảnh 192.168.201.116"
                >
                  <Search size={13} className={checkingAllMenu ? 'animate-spin' : ''} />
                  <span>{checkingAllMenu ? 'Đang check toàn bộ...' : '🔍 Check Toàn Bộ Ảnh Server (Menu này)'}</span>
                </button>

                {menuImagesSummary && mismatchedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSyncSelectionStep(1);
                      setShowSyncSelectionModal(true);
                    }}
                    disabled={syncingImages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #10b981',
                      backgroundColor: '#ecfdf5',
                      color: '#047857',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      cursor: syncingImages ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    title="Mở danh sách các món bị lệch hoặc server chưa có ảnh để xem và đồng bộ về MongoDB"
                  >
                    <Zap size={13} color="#059669" />
                    <span>
                      {fixableItems.length > 0
                        ? `⚡ Chọn Món Đồng Bộ (${fixableItems.length} món)`
                        : `📋 Xem ${mismatchedItems.length} Món Chưa Có Ảnh`}
                    </span>
                  </button>
                )}

{/* Nút Xuất Excel Các Món Sai Ảnh Của Đúng Menu Đang Chọn (Theo Chuẩn File 3) */}
                {/* Ô tra cứu vị trí ảnh toàn server & các thư mục khác */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#f8fafc',
                    padding: '2px 4px 2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #0284c7'
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 700, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Globe size={12} />
                    Tra cứu ảnh server:
                  </span>
                  <input
                    type="text"
                    value={globalQuickInput}
                    onChange={(e) => setGlobalQuickInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleOpenGlobalSearch(globalQuickInput);
                      }
                    }}
                    placeholder="Nhập tên ảnh, SAP, RK7..."
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      width: '160px',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleOpenGlobalSearch(globalQuickInput)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title="Tra cứu toàn bộ server xem ảnh đang nằm ở thư mục nào"
                  >
                    <Search size={11} />
                    <span>Tìm</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportMismatchedExcel}
                  disabled={exportingExcel}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: '1px solid #16a34a',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: exportingExcel ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title={`Xuất file Excel các món bị sai link hoặc tên hình ảnh của riêng menu "${selectedCategory.name}" theo đúng 38 cột chuẩn File 3`}
                >
                  <FileSpreadsheet size={13} className={exportingExcel ? 'animate-spin' : ''} />
                  <span>{exportingExcel ? 'Đang xuất Excel...' : '📊 Xuất Excel Món Sai Ảnh'}</span>
                </button>

                {canConfigImageServer && (
                  <button
                    type="button"
                    onClick={handleOpenConfigModal}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d97706',
                      backgroundColor: '#fffbeb',
                      color: '#b45309',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}
                    title="Cấu hình kết nối & tài khoản máy chủ hình ảnh FTP/SSH (Chỉ Super Admin & dung.nguyenanh)"
                  >
                    <Settings size={13} />
                    <span>⚙️ Cấu Hình Máy Chủ Ảnh</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCoGroupsBarExpanded(!isCoGroupsBarExpanded)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: isCoGroupsBarExpanded ? '1px solid #93c5fd' : '1px solid #cbd5e1',
                    backgroundColor: isCoGroupsBarExpanded ? '#eff6ff' : '#ffffff',
                    color: isCoGroupsBarExpanded ? '#1d4ed8' : '#475569',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title={isCoGroupsBarExpanded ? 'Bấm để ẩn khung nhóm CO' : 'Bấm để xem/chỉnh sửa nhóm CO & nhóm SO chưa lên CO'}
                >
                  {isCoGroupsBarExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{isCoGroupsBarExpanded ? 'Ẩn Nhóm CO' : 'Xem Nhóm CO'}</span>
                  {isCoGroupsBarExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {/* Chi tiết 2 khối: Nhóm hiển thị CO & Nhóm SO chưa đưa lên CO */}
            {isCoGroupsBarExpanded && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}
              >
                {/* Khối 1: Danh sách nhóm đang hiển thị trên CO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#047857', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} color="#059669" />
                    <span>Nhóm Hiển Thị Trên CO ({coDetail?.co_group_codes.length || 0} nhóm):</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                      maxHeight: '85px',
                      overflowY: 'auto',
                      padding: '4px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '4px'
                    }}
                  >
                    {coDetail && coDetail.co_group_codes.length > 0 ? (
                      coDetail.co_group_codes.map((code) => {
                        const soMatch = coDetail.so_groups.find((g) => g.code === code);
                        const titleText = soMatch ? `${code} - ${soMatch.name}` : code;
                        return (
                          <span
                            key={code}
                            style={{
                              fontSize: '10.5px',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              backgroundColor: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              borderRadius: '3px',
                              padding: '1px 6px',
                              whiteSpace: 'nowrap'
                            }}
                            title={titleText}
                          >
                            {code}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {loadingCoDetail ? 'Đang tải nhóm CO...' : 'Chưa có nhóm nào trên CO'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Khối 2: Nhóm có trên SO nhưng CHƯA hiển thị trên CO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  {(() => {
                    const missingGroups = (coDetail?.so_groups || []).filter((g) => !g.is_co);
                    const allSelected = missingGroups.length > 0 && missingGroups.every((g) => selectedMissingGroupCodes.has(g.code));

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: missingGroups.length > 0 ? '#b45309' : '#15803d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap size={13} color={missingGroups.length > 0 ? '#d97706' : '#16a34a'} />
                            <span>Nhóm SO Chưa Lên CO ({missingGroups.length} nhóm):</span>
                          </div>

                          {missingGroups.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (allSelected) {
                                    setSelectedMissingGroupCodes(new Set());
                                  } else {
                                    setSelectedMissingGroupCodes(new Set(missingGroups.map((g) => g.code)));
                                  }
                                }}
                                style={{
                                  fontSize: '10.5px',
                                  color: '#1e40af',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                                <span>{allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleBulkAddMissingGroupsToCo(Array.from(selectedMissingGroupCodes))}
                                disabled={selectedMissingGroupCodes.size === 0}
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  backgroundColor: selectedMissingGroupCodes.size > 0 ? '#10b981' : '#e2e8f0',
                                  color: selectedMissingGroupCodes.size > 0 ? '#ffffff' : '#94a3b8',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  cursor: selectedMissingGroupCodes.size > 0 ? 'pointer' : 'not-allowed'
                                }}
                              >
                                + Đưa Lên CO ({selectedMissingGroupCodes.size})
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Danh sách checkbox nhóm thiếu & Ô nhập tay */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            maxHeight: '85px',
                            overflowY: 'auto',
                            padding: '4px',
                            backgroundColor: '#fffbeb',
                            borderRadius: '4px',
                            border: '1px solid #fef3c7'
                          }}
                        >
                          {missingGroups.length > 0 ? (
                            missingGroups.map((grp) => {
                              const isChecked = selectedMissingGroupCodes.has(grp.code);
                              return (
                                <label
                                  key={grp.code}
                                  style={{
                                    fontSize: '10.5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    backgroundColor: isChecked ? '#fde68a' : '#ffffff',
                                    border: `1px solid ${isChecked ? '#f59e0b' : '#fde68a'}`,
                                    borderRadius: '3px',
                                    padding: '1px 6px',
                                    cursor: 'pointer',
                                    userSelect: 'none'
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const next = new Set(selectedMissingGroupCodes);
                                      if (e.target.checked) next.add(grp.code);
                                      else next.delete(grp.code);
                                      setSelectedMissingGroupCodes(next);
                                    }}
                                    style={{ margin: 0, cursor: 'pointer' }}
                                  />
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#92400e' }}>{grp.code}</span>
                                  <span style={{ color: '#451a03' }}>({grp.name})</span>
                                </label>
                              );
                            })
                          ) : (
                            <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, padding: '4px 2px' }}>
                              ✅ Tuyệt vời! 100% nhóm SO đã có trên CO.
                            </div>
                          )}
                        </div>

                        {/* Nhập mã nhóm thủ công (Thêm tay) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <input
                            type="text"
                            value={manualGroupInput}
                            onChange={(e) => setManualGroupInput(e.target.value)}
                            placeholder="Hoặc nhập mã nhóm thêm tay (vd: CK_ALC009_1)..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddManualGroupToCo();
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '3px 8px',
                              fontSize: '11px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              outline: 'none',
                              fontFamily: 'monospace'
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleAddManualGroupToCo}
                            disabled={!manualGroupInput.trim()}
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: manualGroupInput.trim() ? '#d97706' : '#e2e8f0',
                              color: manualGroupInput.trim() ? '#ffffff' : '#94a3b8',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: manualGroupInput.trim() ? 'pointer' : 'not-allowed'
                            }}
                          >
                            + Thêm Mã
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hàng 2: Thanh Nhóm Món (Category/Subgroup tabs - Tự động xuống dòng 2, 3... nếu danh sách dài) */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#f3f4f6',
            borderBottom: '1px solid #e5e7eb',
            maxHeight: '140px',
            overflowY: 'auto'
          }}
        >
          {availableGroupsInSuperType.map((grp) => {
            const isGroupActive = activeGroup === grp;
            const grpCode = groupCodeMap.get(grp);
            return (
              <button
                key={grp}
                type="button"
                onClick={() => setActiveGroup(grp)}
                style={{
                  padding: orderMode === 'SO' && grpCode ? '4px 12px' : '7px 14px',
                  borderRadius: '4px',
                  backgroundColor: isGroupActive ? '#ea580c' : '#ffffff',
                  color: isGroupActive ? '#ffffff' : '#374151',
                  border: isGroupActive ? '1px solid #ea580c' : '1px solid #d1d5db',
                  cursor: 'pointer',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: isGroupActive ? 800 : 600 }}>
                  {grp}
                </div>
                {orderMode === 'SO' && grpCode && (
                  <div
                    style={{
                      fontSize: '10px',
                      color: isGroupActive ? 'rgba(255,255,255,0.9)' : '#6b7280',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      marginTop: '1px'
                    }}
                    title={`Mã nhóm: ${grpCode}`}
                  >
                    {grpCode}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Hàng 3: Tiêu đề Nhóm Món đang chọn & Số lượng món */}
        <div style={{ padding: '12px 16px 6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#111827',
                  margin: 0,
                  letterSpacing: '-0.2px'
                }}
              >
                {activeGroup}
              </h3>
              {orderMode === 'SO' && groupCodeMap.get(activeGroup) && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4b5563',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    padding: '2px 7px',
                    fontFamily: 'monospace'
                  }}
                  title="Mã nhóm trên hệ thống"
                >
                  Mã: {groupCodeMap.get(activeGroup)}
                </span>
              )}
            </div>
            {loadingDishes && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#ea580c', fontWeight: 600 }}>
                <RefreshCw size={12} className="animate-spin" /> Đang tải...
              </span>
            )}
          </div>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
            {displayedDishes.length} món
            {displayedDishes.some((d) => d.isHidden) && (
              <span style={{ color: '#dc2626', marginLeft: '6px', fontWeight: 700 }}>
                (gồm {displayedDishes.filter((d) => d.isHidden).length} món ẩn)
              </span>
            )}
          </span>
        </div>

        {/* Hàng 4: Lưới Thẻ Món Ăn (Dish Cards Grid - ĐẦY ĐỦ CÁC MÓN KỂ CẢ ẨN) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 16px 20px 16px',
            display: 'grid',
            gridTemplateColumns: orderMode === 'CO' ? 'repeat(auto-fill, minmax(215px, 1fr))' : 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '12px',
            alignContent: 'start'
          }}
        >
          {loadingDishes && displayedDishes.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: '#6b7280' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#ea580c' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#374151' }}>Đang nạp thực đơn từ MongoDB nhà hàng...</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Đồng bộ danh mục món ăn & trạng thái ẩn/hiện</div>
            </div>
          ) : displayedDishes.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Không tìm thấy món nào trong nhóm này</div>
            </div>
          ) : (
            displayedDishes.map((dish) => {
              const isSpecial = !!dish.isSpecialCard;
              const isHidden = !!dish.isHidden;
              const isHighlighted = highlightedDishId === dish.id;

              // ══════════════════════════════════════════════════════════════
              // KÊNH CO (KHÁCH): HIỂN THỊ HÌNH ẢNH NHƯ TAB 4 (KHÔNG CÓ NÚT GỌI MÓN)
              // KÈM THEO CHI TIẾT ẨN/HIỆN THEO KÊNH (CO, SO, QR_ORDER) & CHECK HÌNH
              // ══════════════════════════════════════════════════════════════
              if (orderMode === 'CO') {
                // 1. URL online thực tế để hiển thị ảnh trên thẻ (ưu tiên link HTTP/HTTPS Gateway CDN)
                const displayImgUrl =
                  (dish.imageUrl && (dish.imageUrl.startsWith('http://') || dish.imageUrl.startsWith('https://')))
                    ? dish.imageUrl
                    : (dish.urlImgQr && (dish.urlImgQr.startsWith('http://') || dish.urlImgQr.startsWith('https://')))
                    ? dish.urlImgQr
                    : (dish.srcImg && (dish.srcImg.startsWith('http://') || dish.srcImg.startsWith('https://')))
                    ? dish.srcImg
                    : '';

                // 2. Đường dẫn file cấu hình phục vụ kiểm tra SFTP, máy trạm và sao chép
                const fileImg = dish.srcImg || dish.localFileName || (dish.imageUrl && !dish.imageUrl.startsWith('http') ? dish.imageUrl : '') || '';
                const serverCheck = checkedDishImagesMap[dish.id];

                return (
                  <div
                    key={dish.id}
                    id={`dish-card-${dish.id}`}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      border: isHighlighted
                        ? '2px solid #ea580c'
                        : isHidden
                        ? '1.5px dashed #f87171'
                        : '1px solid #e2e8f0',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: isHighlighted
                        ? '0 0 0 4px rgba(234, 88, 12, 0.35), 0 8px 20px rgba(234, 88, 12, 0.25)'
                        : '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      if (!isHighlighted) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isHighlighted) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                      }
                    }}
                  >
                    {/* Badge Món vừa tìm khi được Jump tới */}
                    {isHighlighted && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: '#ea580c',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          whiteSpace: 'nowrap',
                          zIndex: 30
                        }}
                      >
                        🎯 Món vừa tìm!
                      </div>
                    )}

                    {/* ẢNH MÓN ĂN (TRÊN ĐỈNH THẺ) */}
                    <div
                      style={{
                        position: 'relative',
                        height: '120px',
                        backgroundColor: '#f1f5f9',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (displayImgUrl) {
                          setPreviewDish(dish);
                        } else if (!serverCheck) {
                          handleCheckSingleDish(dish);
                        }
                      }}
                    >
                      {displayImgUrl ? (
                        <img
                          src={displayImgUrl}
                          alt={dish.name}
                          loading="lazy"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement?.querySelector('.co-img-fallback');
                            if (fb) (fb as HTMLElement).style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="co-img-fallback"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: displayImgUrl ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          color: '#94a3b8'
                        }}
                      >
                        <Utensils size={32} />
                      </div>

                      {/* Badge top-left: Buffet 0đ hoặc Alacarte */}
                      {dish.price === 0 ? (
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
                            fontWeight: 700,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            zIndex: 5
                          }}
                        >
                          Buffet 0đ
                        </span>
                      ) : (
                        <span
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            backgroundColor: '#475569',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            zIndex: 5
                          }}
                        >
                          Alacarte
                        </span>
                      )}

                      {/* Nút check SFTP nhanh top-right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckSingleDish(dish);
                        }}
                        disabled={checkingDishId === dish.id}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          padding: '3px 7px',
                          borderRadius: '4px',
                          backgroundColor: serverCheck
                            ? (serverCheck.status === 'MATCH'
                                ? '#dcfce7'
                                : serverCheck.status === 'CASE_MISMATCH'
                                ? '#fef3c7'
                                : '#fee2e2')
                            : 'rgba(0,0,0,0.65)',
                          color: serverCheck
                            ? (serverCheck.status === 'MATCH'
                                ? '#166534'
                                : serverCheck.status === 'CASE_MISMATCH'
                                ? '#b45309'
                                : '#991b1b')
                            : '#ffffff',
                          border: 'none',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: checkingDishId === dish.id ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                          zIndex: 5
                        }}
                        title="Kiểm tra file ảnh trên SFTP Server 192.168.201.116"
                      >
                        {checkingDishId === dish.id ? (
                          <RefreshCw size={10} className="animate-spin" />
                        ) : serverCheck ? (
                          serverCheck.status === 'MATCH' ? (
                            <Check size={10} />
                          ) : (
                            <AlertTriangle size={10} />
                          )
                        ) : (
                          <Search size={10} />
                        )}
                        <span>
                          {serverCheck
                            ? (serverCheck.status === 'MATCH'
                                ? 'Khớp'
                                : serverCheck.status === 'CASE_MISMATCH'
                                ? 'Lệch chữ'
                                : 'Lỗi ảnh')
                            : 'Check SFTP'}
                        </span>
                      </button>
                    </div>

                    {/* THÔNG TIN MÓN & TRẠNG THÁI ẨN / HIỆN THEO KÊNH */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      {/* Tên món */}
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0f172a',
                          lineHeight: 1.3,
                          minHeight: '34px',
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

                      {/* Giá & RK7 / SAP */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.2 }}>
                          <span>RK7: <strong>{dish.rk7Code || '—'}</strong></span>
                          <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                          <span>SAP: <strong>{dish.sapCode || '—'}</strong></span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: dish.price === 0 ? '#059669' : '#ea580c' }}>
                          {dish.price === 0 ? 'Buffet (0đ)' : formatMoney(dish.price)}
                        </span>
                      </div>

                      {/* CÁC NHÃN ẨN MÓN THEO KÊNH: CO, SO, QR_ORDER */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', margin: '2px 0' }}>
                        {dish.hideInCo && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Món đang bị cài đặt ẩn trên kênh Tablet Khách (CO)"
                          >
                            <EyeOff size={9} /> Ẩn CO
                          </span>
                        )}
                        {dish.hideInSo && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Món đang bị cài đặt ẩn trên kênh Máy Phục Vụ (SO)"
                          >
                            <EyeOff size={9} /> Ẩn SO
                          </span>
                        )}
                        {dish.hideInQr && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              backgroundColor: '#f3e8ff',
                              color: '#7e22ce',
                              border: '1px solid #d8b4fe',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Món đang bị cài đặt ẩn trên kênh Gọi Món QR (QR_ORDER)"
                          >
                            <EyeOff size={9} /> Ẩn QR
                          </span>
                        )}
                        {!dish.hideInCo && !dish.hideInSo && !dish.hideInQr && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 600,
                              color: '#16a34a',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #bbf7d0',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Món đang hiển thị đầy đủ trên mọi kênh (CO, SO, QR)"
                          >
                            <Check size={9} /> Hiện đủ (CO, SO, QR)
                          </span>
                        )}
                      </div>

                      {/* KHUNG KIỂM TRA HÌNH ẢNH (2 DÒNG: FILE & SERVER) */}
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '5px 7px',
                          fontSize: '10.5px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          overflow: 'hidden',
                          marginTop: 'auto'
                        }}
                      >
                        {/* Dòng 1: Hình trên file (Bấm để copy đường dẫn ảnh) */}
                        <div
                          onClick={(e) => {
                            if (fileImg) {
                              handleCopyFilePath(e, dish, fileImg);
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            overflow: 'hidden',
                            cursor: fileImg ? 'pointer' : 'default',
                            borderRadius: '3px',
                            padding: '1px 2px'
                          }}
                          title={fileImg ? `Bấm để copy đường dẫn ảnh: ${fileImg}` : 'Chưa có cấu hình ảnh'}
                        >
                          <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>📁 File:</span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              color: fileImg ? '#0f172a' : '#94a3b8',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: fileImg ? 600 : 400,
                              flex: 1
                            }}
                          >
                            {fileImg || '(Chưa cấu hình)'}
                          </span>
                          {fileImg && (
                            <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }}>
                              {copiedFileDishId === dish.id ? (
                                <Check size={9} color="#16a34a" />
                              ) : (
                                <Copy size={8} style={{ opacity: 0.45 }} />
                              )}
                            </span>
                          )}
                        </div>

                        {/* Dòng 2: Hình trên server (Bấm badge để copy thông báo gửi người xử lý) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>🌐 Server:</span>

                          {!serverCheck ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCheckSingleDish(dish);
                              }}
                              disabled={checkingDishId === dish.id}
                              style={{
                                padding: '1px 6px',
                                fontSize: '10px',
                                fontWeight: 700,
                                borderRadius: '3px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                color: '#2563eb',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Bấm để kiểm tra ảnh trên máy chủ 192.168.201.116 (không tự load trước)"
                            >
                              {checkingDishId === dish.id ? (
                                <RefreshCw size={10} className="animate-spin" />
                              ) : (
                                <Search size={10} />
                              )}
                              <span>Check hình</span>
                            </button>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              {/* Badge thông báo trạng thái */}
                              <button
                                type="button"
                                onClick={(e) => handleCopyCheckMessage(e, dish, serverCheck.message)}
                                title={`Bấm để copy thông báo gửi người xử lý (Shift+Click: chỉ copy nội dung lỗi):\n[${dish.name} - RK7: ${dish.rk7Code || '—'}] ${serverCheck.message}`}
                                style={{
                                  color:
                                    serverCheck.status === 'MATCH'
                                      ? '#15803d'
                                      : serverCheck.status === 'CASE_MISMATCH'
                                      ? '#b45309'
                                      : serverCheck.is_fixable
                                      ? '#c2410c'
                                      : '#dc2626',
                                  backgroundColor:
                                    serverCheck.status === 'MATCH'
                                      ? '#dcfce7'
                                      : serverCheck.status === 'CASE_MISMATCH'
                                      ? '#fef3c7'
                                      : serverCheck.is_fixable
                                      ? '#ffedd5'
                                      : '#fee2e2',
                                  border: `1px solid ${
                                    serverCheck.status === 'MATCH'
                                      ? '#bbf7d0'
                                      : serverCheck.status === 'CASE_MISMATCH'
                                      ? '#fde68a'
                                      : serverCheck.is_fixable
                                      ? '#fed7aa'
                                      : '#fecaca'
                                  }`,
                                  borderRadius: '3px',
                                  padding: '1px 5px',
                                  fontWeight: 700,
                                  fontSize: '9.5px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span>
                                  {serverCheck.status === 'MATCH'
                                    ? '✅ Khớp'
                                    : serverCheck.status === 'CASE_MISMATCH'
                                    ? '⚠️ Lệch chữ'
                                    : serverCheck.status === 'NO_IMAGE'
                                    ? 'Chưa có ảnh'
                                    : '❌ Không có'}
                                </span>
                                {copiedCheckDishId === dish.id ? (
                                  <Check size={9} color="#16a34a" />
                                ) : (
                                  <Copy size={9} style={{ opacity: 0.65 }} />
                                )}
                              </button>

                              {/* Nút kiểm tra lại hình ảnh */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckSingleDish(dish);
                                }}
                                disabled={checkingDishId === dish.id}
                                title="Kiểm tra lại hình ảnh món này trên server 192.168.201.116"
                                style={{
                                  padding: '1px 3px',
                                  borderRadius: '3px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  color: '#475569',
                                  cursor: checkingDishId === dish.id ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  lineHeight: 1
                                }}
                              >
                                <RefreshCw
                                  size={9}
                                  className={checkingDishId === dish.id ? 'animate-spin' : ''}
                                />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Dòng 3a: Nút Tra cứu toàn server nếu NOT_FOUND */}
                        {serverCheck && serverCheck.status === 'NOT_FOUND' && (
                          <div style={{ marginTop: '3px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenGlobalSearch(dish.srcImg || dish.name || String(dish.rk7Code || ''));
                              }}
                              title="Tra cứu toàn server xem ảnh món này đang nằm ở thư mục nào"
                              style={{
                                width: '100%',
                                padding: '2px 4px',
                                fontSize: '9px',
                                fontWeight: 600,
                                borderRadius: '3px',
                                border: '1px solid #fed7aa',
                                backgroundColor: '#fff7ed',
                                color: '#c2410c',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px'
                              }}
                            >
                              <Search size={9} />
                              <span>Tìm vị trí trên server</span>
                            </button>
                          </div>
                        )}

                        {/* Dòng 3b: Nút Đồng nhất link chuẩn */}
                        {serverCheck && serverCheck.is_fixable && (
                          <div style={{ marginTop: '3px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSyncSingleDish(dish, serverCheck.suggested_fix_path);
                              }}
                              style={{
                                width: '100%',
                                padding: '2.5px 5px',
                                fontSize: '9.5px',
                                fontWeight: 700,
                                borderRadius: '3px',
                                border: '1px solid #10b981',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                              title={`Đồng nhất theo server: ${serverCheck.suggested_fix_path}`}
                            >
                              <Zap size={10} color="#059669" />
                              <span>⚡ Đồng nhất link chuẩn</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // ══════════════════════════════════════════════════════════════
              // KÊNH SO (STAFF ORDER): GIAO DIỆN COMPACT ĐỂ GỌI MÓN VÀO BÀN
              // ══════════════════════════════════════════════════════════════
              return (
                <div
                  key={dish.id}
                  id={`dish-card-${dish.id}`}
                  onClick={() => handleAddDishToOrder(dish)}
                  style={{
                    minHeight: '85px',
                    borderRadius: '8px',
                    backgroundColor: isHighlighted ? '#fff7ed' : isSpecial ? '#539e55' : isHidden ? '#fafafa' : '#ffffff',
                    color: isSpecial ? '#ffffff' : '#111827',
                    border: isHighlighted
                      ? '3px solid #ea580c'
                      : isSpecial
                      ? '1px solid #458747'
                      : isHidden
                      ? '1.5px dashed #f87171'
                      : '1px solid #d1d5db',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    boxShadow: isHighlighted
                      ? '0 0 0 4px rgba(234, 88, 12, 0.35), 0 8px 20px rgba(234, 88, 12, 0.25)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                    position: 'relative',
                    transform: isHighlighted ? 'scale(1.02)' : 'none',
                    zIndex: isHighlighted ? 10 : 1,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isHighlighted) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isHighlighted) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                    }
                  }}
                >
                  {/* Badge Món vừa tìm khi được Jump tới */}
                  {isHighlighted && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#ea580c',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        whiteSpace: 'nowrap',
                        zIndex: 20
                      }}
                    >
                      🎯 Món vừa tìm!
                    </div>
                  )}

                  {/* Tên món + Tag Đang Ẩn nếu có */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          lineHeight: '1.25',
                          flex: 1
                        }}
                      >
                        {dish.name}
                      </div>

                      {/* Dấu/Note nhỏ màu đỏ nếu món đang bị ẩn trên POS */}
                      {isHidden && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '4px',
                            padding: '1px 5px',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            flexShrink: 0
                          }}
                          title="Món này đang được cài đặt ẩn trên POS"
                        >
                          <EyeOff size={10} /> Ẩn
                        </span>
                      )}
                    </div>

                    {/* Giá tiền */}
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: isSpecial ? '#ffffff' : dish.price === 0 ? '#059669' : '#ea580c'
                      }}
                    >
                      {dish.price === 0 ? 'Buffet (0 đ)' : formatMoney(dish.price)}
                    </div>
                  </div>

                  {/* Hàng dưới: RK7 & SAP + Cờ Ẩn SO */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      borderTop: `1px dashed ${isSpecial ? 'rgba(255,255,255,0.3)' : '#e5e7eb'}`,
                      paddingTop: '6px',
                      marginTop: '6px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: isSpecial ? 'rgba(255,255,255,0.85)' : '#6b7280',
                        lineHeight: '1.2'
                      }}
                    >
                      <div>RK7: <strong>{dish.rk7Code}</strong></div>
                      <div>SAP: <strong>{dish.sapCode}</strong></div>
                    </div>

                    {dish.hideInSo && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: '4px',
                          padding: '1px 5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                        title="Món này đang được ẩn trên kênh Staff Order (SO)"
                      >
                        <EyeOff size={10} /> Ẩn SO
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>



      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL CHỌN MÓN ĐỒNG BỘ LINK ẢNH TỪ SERVER (5 CỘT + CHECKBOX + SEARCH) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showSyncSelectionModal && (
        <Modal
          isOpen={showSyncSelectionModal}
          onClose={() => {
            if (!syncingImages) {
              setShowSyncSelectionModal(false);
              setSyncSelectionStep(1);
            }
          }}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#059669" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                {syncSelectionStep === 1
                  ? 'Chọn Món Đồng Bộ Link Ảnh Từ Server Về MongoDB'
                  : 'Xác Nhận Cập Nhật Đồng Bộ Link Ảnh Vào MongoDB'}
              </span>
            </div>
          }
          maxWidth="980px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', flexWrap: 'wrap' }}>
              {syncSelectionStep === 1 ? (
                <>
                  <div style={{ fontSize: '12px', color: '#475569' }}>
                    Đã chọn: <strong style={{ color: '#047857', fontSize: '13px' }}>{selectedFixKeys.size}</strong> / {fixableItems.length} món
                    {syncSearchQuery && (
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>
                        (Đang hiển thị {filteredMismatchedItems.length} món)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowSyncSelectionModal(false)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#f8fafc',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={() => setSyncSelectionStep(2)}
                      disabled={selectedFixKeys.size === 0}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: selectedFixKeys.size > 0 ? '#059669' : '#cbd5e1',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: selectedFixKeys.size > 0 ? 'pointer' : 'not-allowed',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }}
                    >
                      <span>Tiếp Tục Đồng Bộ ({selectedFixKeys.size} món)</span>
                      <span>→</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setSyncSelectionStep(1)}
                    disabled={syncingImages}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: syncingImages ? 'not-allowed' : 'pointer'
                    }}
                  >
                    ← Quay Lại Chọn Tiếp
                  </button>
                  <button
                    type="button"
                    onClick={executeSyncSelectedImages}
                    disabled={syncingImages || selectedFixKeys.size === 0}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: syncingImages ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    {syncingImages ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    <span>⚡ XÁC NHẬN ĐỒNG BỘ ({selectedFixKeys.size} MÓN) VÀO MONGODB</span>
                  </button>
                </>
              )}
            </div>
          }
        >
          {syncSelectionStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Thẻ thông tin Menu & Hướng dẫn */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#166534',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}
              >
                <div>
                  Menu: <strong>{selectedCategory.name}</strong> (Mã: <code>{selectedCategory.code}</code>) • Tổng số món cần kiểm tra: <strong style={{ color: '#dc2626' }}>{mismatchedItems.length} món</strong>
                  {fixableItems.length > 0 ? (
                    <span style={{ marginLeft: '8px', color: '#15803d', fontWeight: 600 }}>
                      (Có {fixableItems.length} món có ảnh trên server để đồng bộ)
                    </span>
                  ) : (
                    <span style={{ marginLeft: '8px', color: '#dc2626', fontWeight: 600 }}>
                      (Server /opt/gpos/gmonitor/resources/menu chưa có ảnh cho các món này)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#15803d' }}>
                  💡 <em>Link ảnh server chỉ lấy trong /opt/gpos/gmonitor/resources/menu.</em>
                </div>
              </div>

              {/* Thanh tìm kiếm đa năng & nút chọn nhanh */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={syncSearchQuery}
                    onChange={(e) => setSyncSearchQuery(e.target.value)}
                    placeholder="🔍 Tìm kiếm (1 hoặc nhiều mã SAP, RK7, Tên món cách nhau bởi dấu phẩy, khoảng trắng, xuống dòng)..."
                    style={{
                      width: '100%',
                      padding: '6px 28px 6px 30px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                  />
                  {syncSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setSyncSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '7px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Xóa tìm kiếm"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllFiltered}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: '1px solid #bbf7d0',
                      backgroundColor: isAllFilteredSelected ? '#dcfce7' : '#ffffff',
                      color: '#15803d',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={isAllFilteredSelected ? 'Bỏ chọn các món đang hiển thị' : 'Chọn tất cả các món đang hiển thị'}
                  >
                    {isAllFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                    <span>{isAllFilteredSelected ? 'Bỏ chọn hiển thị' : `Chọn tất cả có ảnh (${fixableInFiltered.length})`}</span>
                  </button>

                  {selectedFixKeys.size > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllSelection}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                      title="Bỏ chọn toàn bộ các món"
                    >
                      Bỏ chọn tất cả ({selectedFixKeys.size})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenGlobalSearch(syncSearchQuery)}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: '1px solid #0284c7',
                      backgroundColor: '#f0f9ff',
                      color: '#0369a1',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Mở popup tra cứu vị trí ảnh trên toàn bộ các thư mục khác của server"
                  >
                    <Globe size={13} />
                    <span>Tra cứu toàn server</span>
                  </button>
                </div>
              </div>

              {/* Bảng danh sách 5 cột món sai link hình ảnh */}
              <div
                style={{
                  maxHeight: '380px',
                  overflowY: 'auto',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 5, borderBottom: '1px solid #cbd5e1' }}>
                    <tr>
                      <th style={{ padding: '6px 8px', width: '36px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={handleToggleSelectAllFiltered}
                          title="Chọn / Bỏ chọn toàn bộ món đang hiển thị"
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '6px 8px', width: '90px', color: '#475569' }}>Mã SAP</th>
                      <th style={{ padding: '6px 8px', width: '80px', color: '#475569' }}>Mã RK7</th>
                      <th style={{ padding: '6px 8px', color: '#0f172a' }}>TÊN MÓN</th>
                      <th style={{ padding: '6px 8px', color: '#c2410c' }}>Link Hình Của File (DB)</th>
                      <th style={{ padding: '6px 8px', color: '#047857' }}>/opt/gpos/gmonitor/resources/menu</th>
                      <th style={{ padding: '6px 8px', width: '95px', textAlign: 'center', color: '#475569' }}>Phân Loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMismatchedItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                          {syncSearchQuery
                            ? 'Không tìm thấy món ăn nào khớp với từ khóa tìm kiếm.'
                            : 'Không có món nào bị lệch hình ảnh cần đồng bộ.'}
                        </td>
                      </tr>
                    ) : (
                      filteredMismatchedItems.map((item, idx) => {
                        const key = getFixItemKey(item);
                        const isSelected = selectedFixKeys.has(key);
                        const canSync = Boolean(item.is_fixable && item.suggested_fix_path);
                        return (
                          <tr
                            key={key}
                            onClick={() => handleToggleSingleItem(item)}
                            style={{
                              borderBottom: '1px solid #e2e8f0',
                              backgroundColor: isSelected ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                              cursor: canSync ? 'pointer' : 'default',
                              opacity: canSync ? 1 : 0.85,
                              transition: 'background-color 0.1s ease'
                            }}
                          >
                            <td style={{ padding: '5px 8px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                              {canSync ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSingleItem(item)}
                                  style={{ cursor: 'pointer' }}
                                />
                              ) : (
                                <input
                                  type="checkbox"
                                  disabled
                                  checked={false}
                                  style={{ opacity: 0.3, cursor: 'not-allowed' }}
                                  title="server /opt/gpos/gmonitor/resources/menu chưa có ảnh nên không thể đồng bộ"
                                />
                              )}
                            </td>
                            <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#475569' }}>
                              {item.sap_code || '—'}
                            </td>
                            <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b' }}>
                              {item.rk7_code || '—'}
                            </td>
                            <td style={{ padding: '5px 8px', fontWeight: 600, color: '#0f172a' }}>
                              {item.name}
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                fontFamily: 'monospace',
                                color: '#c2410c',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={item.given_path}
                            >
                              {item.given_filename || item.given_path || '—'}
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                fontFamily: 'monospace',
                                maxWidth: '240px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={canSync ? (item.server_filename || item.suggested_fix_path) : 'Thư mục /opt/gpos/gmonitor/resources/menu chưa có ảnh cho món này'}
                            >
                              {canSync ? (
                                <span style={{ color: '#047857', fontWeight: 700 }}>
                                  {item.server_filename || item.suggested_fix_path?.split('/').pop() || item.suggested_fix_path}
                                </span>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '11px' }}>
                                    Không có
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenGlobalSearch(item.given_filename || item.name || String(item.rk7_code || ''));
                                    }}
                                    title="Tra cứu toàn server xem ảnh này đang nằm ở thư mục nào"
                                    style={{
                                      padding: '1px 5px',
                                      fontSize: '10px',
                                      borderRadius: '3px',
                                      border: '1px solid #fed7aa',
                                      backgroundColor: '#fff7ed',
                                      color: '#c2410c',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '2px'
                                    }}
                                  >
                                    <Search size={10} />
                                    <span>Tìm vị trí</span>
                                  </button>
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                              {item.status === 'CASE_MISMATCH' ? (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: '#fef3c7',
                                    color: '#b45309',
                                    border: '1px solid #fde68a'
                                  }}
                                >
                                  ⚠️ Lệch chữ
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca'
                                  }}
                                  title="server /opt/gpos/gmonitor/resources/menu chưa có ảnh"
                                >
                                  ❌ Chưa có ảnh
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Bước 2: Xác nhận an toàn trước khi thực thi */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '12px',
                  color: '#991b1b',
                  fontSize: '12px'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px' }}>
                  🚨 XÁC NHẬN ĐỒNG BỘ {selectedFixKeys.size} MÓN ĐÃ CHỌN VÀO MONGODB
                </div>
                <div>
                  Bạn đang chuẩn bị cập nhật đường dẫn hình ảnh chuẩn từ máy chủ ảnh cho <strong>{selectedFixKeys.size} món</strong> thuộc Menu <strong>{selectedCategory.name}</strong>.
                </div>
                <div style={{ marginTop: '4px', color: '#b91c1c' }}>
                  ⚠️ <strong>Cơ chế tự động:</strong> Do mỗi món ăn chỉ có 1 hình ảnh duy nhất, hệ thống sẽ tự động cập nhật tất cả các vị trí trùng mã SAP, mã RK7 hoặc cùng tên trên toàn bộ database nhà hàng (kể cả ở các menu khác).
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Danh Sách {selectedFixKeys.size} Món Sẽ Được Đồng Bộ:
                </div>
                <div
                  style={{
                    maxHeight: '260px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                    fontSize: '11px'
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 2 }}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '5px 8px', width: '30px' }}>#</th>
                        <th style={{ padding: '5px 8px', width: '90px' }}>Mã SAP</th>
                        <th style={{ padding: '5px 8px', width: '80px' }}>Mã RK7</th>
                        <th style={{ padding: '5px 8px' }}>Tên Món</th>
                        <th style={{ padding: '5px 8px' }}>Link Chuẩn (Server)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixableItems
                        .filter((it) => selectedFixKeys.has(getFixItemKey(it)))
                        .map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '4px 8px', color: '#64748b' }}>{idx + 1}</td>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{item.sap_code || '—'}</td>
                            <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontWeight: 600 }}>{item.rk7_code || '—'}</td>
                            <td style={{ padding: '4px 8px', fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                            <td style={{ padding: '4px 8px', color: '#047857', fontWeight: 700, fontFamily: 'monospace' }}>
                              {item.suggested_fix_path}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL CẤU HÌNH KẾT NỐI & USER MÁY CHỦ ẢNH (FTP / SSH) */}
      {/* Chỉ Super Admin hoặc dung.nguyenanh mới có quyền truy cập */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showConfigModal && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={18} color="#d97706" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cấu Hình Kết Nối & User Máy Chủ Ảnh (FTP / SSH)
              </span>
            </div>
          }
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={configTesting || configSaving || configLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: '1px solid #3b82f6',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: (configTesting || configLoading) ? 'not-allowed' : 'pointer'
                }}
              >
                {configTesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                <span>{configTesting ? 'Đang kiểm tra...' : '🔌 Kiểm Tra Kết Nối'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={configSaving || configLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: (configSaving || configLoading) ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}
                >
                  {configSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{configSaving ? 'Đang lưu...' : '💾 Lưu Cấu Hình'}</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
            {/* Hộp cảnh báo phân quyền */}
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <Lock size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#d97706' }} />
              <div>
                <strong>Quyền Hạn Đặc Quyền:</strong> Chỉ tài khoản <strong>dung.nguyenanh</strong> và <strong>Super Admin</strong> mới có quyền xem mật khẩu, cấu hình kết nối và user FTP/SSH này.
                <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                  Hệ thống chỉ đọc (Read-Only) để so khớp file, tuyệt đối không chỉnh sửa gì trên máy chủ ảnh.
                </div>
              </div>
            </div>

            {configLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
                <div>Đang tải cấu hình máy chủ ảnh...</div>
              </div>
            ) : (
              <>
                {/* Loại kết nối */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Giao Thức / Loại Kết Nối *
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="server_type"
                        value="SSH_SFTP"
                        checked={configForm.server_type === 'SSH_SFTP'}
                        onChange={() => setConfigForm({ ...configForm, server_type: 'SSH_SFTP', port: 22 })}
                      />
                      <span>SSH / SFTP (Linux - Port 22 mặc định)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="server_type"
                        value="FTP"
                        checked={configForm.server_type === 'FTP'}
                        onChange={() => setConfigForm({ ...configForm, server_type: 'FTP', port: 21 })}
                      />
                      <span>FTP Server (Port 21 mặc định)</span>
                    </label>
                  </div>
                </div>

                {/* Host & Port */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Địa Chỉ Host / IP Máy Chủ *
                    </label>
                    <input
                      type="text"
                      value={configForm.host}
                      onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                      placeholder="vd: 192.168.201.116"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Cổng (Port) *
                    </label>
                    <input
                      type="number"
                      value={configForm.port}
                      onChange={(e) => setConfigForm({ ...configForm, port: Number(e.target.value) || 22 })}
                      placeholder="22"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                </div>

                {/* User & Password */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Tài Khoản (Username) *
                    </label>
                    <input
                      type="text"
                      value={configForm.username}
                      onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                      placeholder="vd: dung.na"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Mật Khẩu *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={configForm.password || ''}
                        onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                        placeholder="Nhập mật khẩu máy chủ..."
                        style={{
                          width: '100%',
                          padding: '7px 34px 7px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px'
                        }}
                        title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remote Directory & Standard Prefix */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Đường Dẫn Thư Mục Hình Ảnh Trên Máy Chủ *
                  </label>
                  <input
                    type="text"
                    value={configForm.remote_dir}
                    onChange={(e) => setConfigForm({ ...configForm, remote_dir: e.target.value })}
                    placeholder="/opt/gpos/gmonitor/resources/menu"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Thư mục chứa các file ảnh món (.jpg, .png) trên máy chủ remote.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tiền Tố Đường Dẫn Chuẩn (Standard Prefix) *
                  </label>
                  <input
                    type="text"
                    value={configForm.standard_prefix}
                    onChange={(e) => setConfigForm({ ...configForm, standard_prefix: e.target.value })}
                    placeholder="/resources/menu/"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Đường dẫn tương đối chuẩn lưu trên MongoDB (mặc định: <code>/resources/menu/</code>).
                  </div>
                </div>

                {/* Thông tin cập nhật lần cuối */}
                {serverConfig && serverConfig.updated_at && (
                  <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                    Lần cập nhật cuối: <strong>{serverConfig.updated_at}</strong> {serverConfig.updated_by ? `bởi ${serverConfig.updated_by}` : ''}
                  </div>
                )}

                {/* Kết quả kiểm tra kết nối */}
                {testResult && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: testResult.success ? '#ecfdf5' : '#fef2f2',
                      border: `1px solid ${testResult.success ? '#a7f3d0' : '#fecaca'}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: testResult.success ? '#065f46' : '#991b1b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {testResult.success ? (
                      <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                    )}
                    <div>
                      <strong>{testResult.message}</strong>
                      {testResult.latency_ms !== null && testResult.latency_ms !== undefined && (
                        <span style={{ marginLeft: '6px', color: testResult.success ? '#047857' : '#b91c1c' }}>
                          ({testResult.latency_ms} ms)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL TRA CỨU VỊ TRÍ ẢNH TOÀN MÁY CHỦ SERVER (192.168.201.116) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {showGlobalSearchModal && (
        <Modal
          isOpen={showGlobalSearchModal}
          onClose={() => setShowGlobalSearchModal(false)}
          maxWidth="1100px"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} color="#0284c7" />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tra Cứu Vị Trí Ảnh Toàn Server (192.168.201.116) & Truyền Xuống Nhà Hàng
              </span>
            </div>
          }
          footer={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                {globalSearchElapsed !== null && (
                  <span>
                    ⚡ Thời gian tìm kiếm: <strong>{globalSearchElapsed}ms</strong> • Kết quả: <strong>{globalSearchResults.length} vị trí</strong>
                  </span>
                )}
                {restaurantTargetIp && (
                  <span style={{ marginLeft: '12px', color: '#0369a1', fontWeight: 600 }}>
                    🏠 Máy trạm NH: {restaurantTargetIp} ({restaurantTargetFolder})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowGlobalSearchModal(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Khung cấu hình mục tiêu Nhà Hàng (Phương án 2: Kéo từ Server truyền xuống NH) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '11.5px'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#0f172a' }}>
                <Server size={13} color="#0284c7" />
                <span>Mục tiêu Nhà Hàng:</span>
              </div>

              {/* Ô IP Máy Trạm */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#475569', fontSize: '11px' }}>IP Trạm:</span>
                <input
                  type="text"
                  value={restaurantTargetIp}
                  onChange={(e) => setRestaurantTargetIp(e.target.value)}
                  placeholder="10.8.x.41 hoặc 11..."
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    width: '120px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    backgroundColor: '#ffffff'
                  }}
                  title="IP máy trạm nhà hàng (thường là .41, .11 hoặc IP POS)"
                />
              </div>

              {/* Ô Thư Mục Lưu Trữ */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '220px' }}>
                <span style={{ color: '#475569', fontSize: '11px' }}>Thư mục:</span>
                <input
                  type="text"
                  value={restaurantTargetFolder}
                  onChange={(e) => setRestaurantTargetFolder(e.target.value)}
                  placeholder="D:\GPOS-Setup\app\img\menu"
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    width: '100%',
                    fontFamily: 'monospace',
                    backgroundColor: '#ffffff'
                  }}
                  title="Thư mục lưu trữ hình ảnh trên máy trạm nhà hàng (mặc định D:\GPOS-Setup\app\img\menu)"
                />
              </div>

              {/* Nút Kiểm tra lại sự tồn tại dưới NH */}
              <button
                type="button"
                onClick={() => handleCheckRestaurantFiles()}
                disabled={checkingRestaurantFiles || globalSearchResults.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: checkingRestaurantFiles || globalSearchResults.length === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Kiểm tra lại xem các file trong danh sách bên dưới đã có trong thư mục nhà hàng chưa"
              >
                <RefreshCw size={11} className={checkingRestaurantFiles ? 'animate-spin' : ''} />
                <span>{checkingRestaurantFiles ? 'Đang ktra...' : 'Ktra dưới NH'}</span>
              </button>

              {/* Nút Truyền hàng loạt xuống nhà hàng */}
              {globalSearchResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkPushAllFoundImages}
                  disabled={bulkPushing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '5px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: bulkPushing ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                  title={`Truyền tất cả ${globalSearchResults.length} file ảnh tìm thấy xuống ${restaurantTargetFolder}`}
                >
                  <Send size={11} className={bulkPushing ? 'animate-spin' : ''} />
                  <span>{bulkPushing ? 'Đang truyền...' : `Truyền tất cả (${globalSearchResults.length} file)`}</span>
                </button>
              )}
            </div>

            {/* Thanh công cụ tìm kiếm */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={globalSearchKeyword}
                  onChange={(e) => setGlobalSearchKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleExecuteGlobalSearch();
                    }
                  }}
                  placeholder="Nhập tên file (vd: asm-chao-nhat.jpg, cachinhv), mã SAP, RK7 hoặc từ khóa..."
                  style={{
                    width: '100%',
                    padding: '8px 30px 8px 32px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #0284c7',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 2px rgba(2, 132, 199, 0.08)'
                  }}
                />
                {globalSearchKeyword && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearchKeyword('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      padding: 0
                    }}
                    title="Xóa từ khóa"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Lựa chọn thư mục tìm kiếm */}
              <select
                value={globalSearchRoot}
                onChange={(e) => {
                  setGlobalSearchRoot(e.target.value);
                  if (globalSearchKeyword.trim()) {
                    handleExecuteGlobalSearch(globalSearchKeyword, e.target.value);
                  }
                }}
                style={{
                  padding: '8px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  color: '#334155',
                  cursor: 'pointer'
                }}
                title="Chọn phạm vi thư mục cần tìm kiếm trên máy chủ"
              >
                <option value="/opt/gpos/gmonitor/resources">Tất cả thư mục (/resources - Khuyên dùng)</option>
                <option value="/opt/gpos/gmonitor/resources/co-food-item">Thư mục món ăn (/co-food-item)</option>
                <option value="/opt/gpos/gmonitor/resources/menu">Thư mục menu (/menu)</option>
                <option value="/opt/gpos/gmonitor/resources/co-category">Thư mục danh mục (/co-category)</option>
                <option value="/opt/gpos">Toàn bộ máy chủ (/opt/gpos)</option>
              </select>

              <button
                type="button"
                onClick={() => handleExecuteGlobalSearch()}
                disabled={globalSearchLoading}
                style={{
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  cursor: globalSearchLoading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
                }}
              >
                {globalSearchLoading ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                <span>{globalSearchLoading ? 'Đang tìm...' : 'Tìm Kiếm'}</span>
              </button>
            </div>

            {/* Thông báo kết quả / gợi ý */}
            {globalSearchMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: globalSearchResults.length > 0 ? '#f0fdf4' : '#fffbeb',
                  border: `1px solid ${globalSearchResults.length > 0 ? '#bbf7d0' : '#fde68a'}`,
                  color: globalSearchResults.length > 0 ? '#15803d' : '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {globalSearchResults.length > 0 ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{globalSearchMessage}</span>
              </div>
            )}

            {/* Bảng kết quả tìm kiếm */}
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                backgroundColor: '#ffffff'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 5, borderBottom: '1px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '6px 8px', width: '32px', textAlign: 'center', color: '#64748b' }}>#</th>
                    <th style={{ padding: '6px 8px', width: '170px', color: '#0f172a' }}>TÊN FILE</th>
                    <th style={{ padding: '6px 8px', color: '#475569' }}>THƯ MỤC LƯU TRỮ SERVER</th>
                    <th style={{ padding: '6px 8px', width: '90px', textAlign: 'center', color: '#475569' }}>PHÂN LOẠI</th>
                    <th style={{ padding: '6px 8px', width: '120px', textAlign: 'center', color: '#0369a1' }}>DƯỚI NHÀ HÀNG</th>
                    <th style={{ padding: '6px 8px', width: '220px', textAlign: 'center', color: '#475569' }}>HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {globalSearchResults.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                        {globalSearchLoading
                          ? 'Đang tìm kiếm vị trí file trên server 192.168.201.116 qua lệnh find SSH...'
                          : globalSearchKeyword
                          ? 'Không tìm thấy file hình ảnh nào khớp với từ khóa tìm kiếm trên server.'
                          : 'Nhập tên file, mã món hoặc từ khóa rồi bấm Tìm Kiếm để tra cứu vị trí file.'}
                      </td>
                    </tr>
                  ) : (
                    globalSearchResults.map((res, idx) => {
                      const isPathCopied = copiedGlobalPath === res.full_path;
                      const isRelCopied = copiedGlobalPath === res.relative_url;
                      return (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                          }}
                        >
                          <td style={{ padding: '6px 8px', textAlign: 'center', color: '#64748b' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>{res.filename}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyGlobalItem(res.filename, 'tên file')}
                                title="Sao chép tên file"
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  cursor: 'pointer',
                                  color: '#64748b',
                                  padding: '1px'
                                }}
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: '6px 8px',
                              fontFamily: 'monospace',
                              color: '#475569',
                              maxWidth: '260px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={res.directory}
                          >
                            <span style={{ color: '#0f172a', fontWeight: 500 }}>{res.directory}</span>
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor:
                                  res.folder_type === 'menu'
                                    ? '#dcfce7'
                                    : res.folder_type === 'co-food-item'
                                    ? '#e0e7ff'
                                    : '#f1f5f9',
                                color:
                                  res.folder_type === 'menu'
                                    ? '#15803d'
                                    : res.folder_type === 'co-food-item'
                                    ? '#4338ca'
                                    : '#475569'
                              }}
                            >
                              {res.folder_type}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '6px 8px',
                              fontFamily: 'monospace',
                              color: '#0369a1',
                              fontWeight: 600,
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={res.relative_url}
                          >
                            {res.relative_url}
                          </td>
                          {/* Cột trạng thái file dưới nhà hàng */}
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            {(() => {
                              const restStatus = restaurantFileStatus[res.filename];
                              if (checkingRestaurantFiles && !restStatus) {
                                return (
                                  <span style={{ fontSize: '10px', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <RefreshCw size={10} className="animate-spin" />
                                    <span>Ktra...</span>
                                  </span>
                                );
                              }
                              if (restStatus?.exists) {
                                return (
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      backgroundColor: '#dcfce7',
                                      color: '#15803d',
                                      border: '1px solid #bbf7d0',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={`Đã có trong ${restaurantTargetFolder} (${restStatus.size} bytes)`}
                                  >
                                    🟢 Đã có ({restStatus.size > 0 ? `${Math.round(restStatus.size / 1024)}KB` : 'OK'})
                                  </span>
                                );
                              }
                              return (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    backgroundColor: '#f1f5f9',
                                    color: '#64748b',
                                    border: '1px solid #e2e8f0',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={`Chưa có trong ${restaurantTargetFolder}`}
                                >
                                  ⚪ Chưa có
                                </span>
                              );
                            })()}
                          </td>

                          {/* Cột hành động: Copy, Xem ảnh & Truyền xuống Nhà Hàng */}
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              {/* Nút truyền xuống nhà hàng */}
                              {(() => {
                                const restStatus = restaurantFileStatus[res.filename];
                                const isPushing = pushingFileKey === res.filename;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handlePushImageToRestaurant(res)}
                                    disabled={isPushing}
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '10.5px',
                                      fontWeight: 700,
                                      borderRadius: '4px',
                                      border: restStatus?.exists ? '1px solid #cbd5e1' : '1px solid #0284c7',
                                      backgroundColor: isPushing ? '#f1f5f9' : restStatus?.exists ? '#ffffff' : '#0284c7',
                                      color: isPushing ? '#94a3b8' : restStatus?.exists ? '#0369a1' : '#ffffff',
                                      cursor: isPushing ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                    }}
                                    title={restStatus?.exists ? `File đã có, bấm để ghi đè lại file từ server xuống ${restaurantTargetFolder}` : `Truyền file này từ server xuống ${restaurantTargetFolder}`}
                                  >
                                    {isPushing ? (
                                      <>
                                        <RefreshCw size={10} className="animate-spin" />
                                        <span>Đang gửi...</span>
                                      </>
                                    ) : restStatus?.exists ? (
                                      <>
                                        <RefreshCw size={10} />
                                        <span>Ghi đè NH</span>
                                      </>
                                    ) : (
                                      <>
                                        <Send size={10} />
                                        <span>Truyền xuống NH</span>
                                      </>
                                    )}
                                  </button>
                                );
                              })()}

                              <button
                                type="button"
                                onClick={() => handleCopyGlobalItem(res.relative_url, 'đường dẫn tương đối')}
                                title="Sao chép đường dẫn tương đối (vd: /resources/...)"
                                style={{
                                  padding: '2px 5px',
                                  fontSize: '10px',
                                  borderRadius: '3px',
                                  border: '1px solid #bae6fd',
                                  backgroundColor: isRelCopied ? '#dcfce7' : '#f0f9ff',
                                  color: isRelCopied ? '#15803d' : '#0369a1',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                {isRelCopied ? <Check size={10} /> : <Copy size={10} />}
                                <span>{isRelCopied ? 'Đã copy' : 'Copy'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyGlobalItem(res.full_path, 'đường dẫn đầy đủ trên server')}
                                title="Sao chép full path trên server (vd: /opt/gpos/...)"
                                style={{
                                  padding: '2px 5px',
                                  fontSize: '10px',
                                  borderRadius: '3px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: isPathCopied ? '#dcfce7' : '#ffffff',
                                  color: isPathCopied ? '#15803d' : '#475569',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                {isPathCopied ? <Check size={10} /> : <Copy size={10} />}
                                <span>{isPathCopied ? 'Đã copy' : 'Full path'}</span>
                              </button>

                              {res.gateway_url && (
                                <a
                                  href={res.gateway_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Xem ảnh qua Gateway Cloud"
                                  style={{
                                    padding: '2px 5px',
                                    borderRadius: '3px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#2563eb',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
            {/* Modal Xem Ảnh Lớn Khi Click Vào Thẻ Món CO */}
      {previewDish && (
        <Modal
          isOpen={!!previewDish}
          onClose={() => setPreviewDish(null)}
          title={`Chi Tiết Hình Ảnh: ${previewDish.name}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            {(() => {
              const previewUrl =
                (previewDish.imageUrl && (previewDish.imageUrl.startsWith('http://') || previewDish.imageUrl.startsWith('https://')))
                  ? previewDish.imageUrl
                  : (previewDish.urlImgQr && (previewDish.urlImgQr.startsWith('http://') || previewDish.urlImgQr.startsWith('https://')))
                  ? previewDish.urlImgQr
                  : '';
              return previewUrl ? (
                <div style={{ width: '100%', maxHeight: '360px', overflow: 'hidden', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img
                    src={previewUrl}
                    alt={previewDish.name}
                    style={{ maxWidth: '100%', maxHeight: '360px', objectFit: 'contain' }}
                  />
                </div>
              ) : (
                <div style={{ padding: '40px', color: '#94a3b8', textAlign: 'center' }}>
                  <Utensils size={48} style={{ margin: '0 auto 8px auto' }} />
                  <div>Món này chưa có ảnh online trực tiếp</div>
                </div>
              );
            })()}

            <div style={{ width: '100%', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}>RK7: <strong>{previewDish.rk7Code || '—'}</strong> | SAP: <strong>{previewDish.sapCode || '—'}</strong></span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: previewDish.price === 0 ? '#059669' : '#ea580c' }}>
                  {previewDish.price === 0 ? 'Buffet (0đ)' : formatMoney(previewDish.price)}
                </span>
              </div>
              <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all' }}>
                File cấu hình: <code style={{ backgroundColor: '#ffffff', padding: '1px 4px', borderRadius: '3px', border: '1px solid #cbd5e1' }}>{previewDish.srcImg || previewDish.imageUrl || '—'}</code>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default AndroidEmulatorTab;
