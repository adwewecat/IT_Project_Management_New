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
  ChevronRight,
  ChefHat,
  EyeOff
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { RestaurantItem } from '../../types/restaurant';
import { mongoService, LockedTableItem } from '../../services/mongoService';

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
  price: number; // > 0: Alacarte, = 0: Buffet
  group: string; // Tên nhóm (vd: 'Combo', 'ALC.GÀ RÁN NHẬT BẢN', 'ALC.Mỳ'...)
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



  // Quản lý tải ảnh trực tuyến từ Cloud Gateway (Chống lag & xử lý lỗi ảnh vỡ)
  // 'hover': chỉ tải khi trỏ chuột vào món (Mặc định - siêu mượt, chống lag)


  // Ô tìm kiếm điều hướng món ăn (Jump to dish search - Theo RK7, SAP, Tên có/không dấu)
  const [dishJumpQuery, setDishJumpQuery] = useState<string>('');
  const [isJumpSearchFocused, setIsJumpSearchFocused] = useState<boolean>(false);
  const [highlightedDishId, setHighlightedDishId] = useState<string | null>(null);
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
      // a. Lấy danh sách món ẩn từ getDishShowHide
      const hiddenDishSet = new Set<string>();
      try {
        const showHideRes = await mongoService.getDishShowHide(cleanHost, 27017);
        if (showHideRes && showHideRes.hidden_dishes) {
          showHideRes.hidden_dishes.forEach((hd) => {
            if (hd.item_code) hiddenDishSet.add(String(hd.item_code).trim());
            if (hd.sap_code) hiddenDishSet.add(String(hd.sap_code).trim());
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
          const isHidden = hiddenDishSet.has(rk7Str) || hiddenDishSet.has(sapStr) || it.is_so === false;

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
            uniqueDishMap.set(dedupKey, {
              id: `${it.menu_code || ''}_${it.group_code || ''}_${rk7Str || sapStr || it.name}_${idx}`,
              name: it.name,
              price: it.price || 0,
              group: groupClean,
              isDrink,
              rk7Code: rk7Str,
              sapCode: sapStr,
              imageUrl: it.image_url || undefined,
              srcImg: it.src_img || undefined,
              urlImgQr: it.url_img_qr || undefined,
              isHidden
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
  const handleConfirmCategory = (cat: OrderCategoryOption) => {
    setSelectedCategory(cat);
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

                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isCatSelected ? '#ffffff' : '#ea580c',
                      backgroundColor: isCatSelected ? '#ea580c' : '#fff7ed',
                      border: `1px solid ${isCatSelected ? '#ea580c' : '#fed7aa'}`,
                      padding: '2px 12px',
                      borderRadius: '4px'
                    }}
                  >
                    {isCatSelected ? 'Đang chọn' : 'Bấm để chọn'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Nút hành động căn giữa */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '10px' }}>
          <Button
            variant="secondary"
            onClick={() => setCurrentView('table_map')}
          >
            Hủy bỏ
          </Button>
          <Button
            variant="primary"
            onClick={() => handleConfirmCategory(selectedCategory)}
            rightIcon={<ChevronRight size={16} />}
          >
            Vào Menu Gọi Món ({selectedCategory.name})
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
          {/* Các Tabs chính: Tất cả • Alacarte (giá > 0) • Buffet (giá = 0) • Đồ uống */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            return (
              <button
                key={grp}
                type="button"
                onClick={() => setActiveGroup(grp)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: isGroupActive ? 800 : 600,
                  backgroundColor: isGroupActive ? '#ea580c' : '#ffffff',
                  color: isGroupActive ? '#ffffff' : '#374151',
                  border: isGroupActive ? '1px solid #ea580c' : '1px solid #d1d5db',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {grp}
              </button>
            );
          })}
        </div>

        {/* Hàng 3: Tiêu đề Nhóm Món đang chọn & Số lượng món */}
        <div style={{ padding: '12px 16px 6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
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

              // Kiểm tra món có link hình ảnh không (chỉ kiểm tra link, không load hình để tránh lag đơ)
              const hasImageLink = Boolean(
                (dish.urlImgQr && dish.urlImgQr.trim()) ||
                (dish.imageUrl && dish.imageUrl.trim())
              );

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

                  {/* Hàng dưới: Mã RK7, Mã SAP nhỏ xíu + Chữ "Có hình" / "Không hình" */}
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
                    {/* Mã RK7 & SAP nhỏ nhỏ phía dưới */}
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

                    {/* Chỉ xem có link hình không thì hiện lại chữ Có hình / Không hình theo đúng yêu cầu */}
                    {hasImageLink ? (
                      <span
                        style={{
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#059669',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '11px',
                          fontWeight: 700,
                          lineHeight: 1.2
                        }}
                        title={dish.urlImgQr || dish.imageUrl || 'Món có link hình'}
                      >
                        Có hình
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          color: '#9ca3af',
                          borderRadius: '4px',
                          padding: '2px 7px',
                          fontSize: '11px',
                          fontWeight: 500,
                          lineHeight: 1.2
                        }}
                      >
                        Không hình
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
          </div>
  );
};

export default AndroidEmulatorTab;
