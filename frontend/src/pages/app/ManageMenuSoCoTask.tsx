import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Check,
  Plus,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRightLeft,
  Zap,
  CheckCircle2,
  Package,
  Globe,
  Upload,
  X
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { RestaurantItem } from '../../types/restaurant';
import { UserInfo } from '../../types/auth';
import {
  mongoService,
  MenuCategoryItem,
  DishMenuItem,
  ConflictItem,
  BulkAddDishRow,
  MenuSnapshotItem
} from '../../services/mongoService';

interface ManageMenuSoCoTaskProps {
  selectedRestaurant?: RestaurantItem | null;
  restaurants: RestaurantItem[];
  user: UserInfo | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  connectedHost?: string;
  openCandidates?: { ip: string; is_kds?: boolean; role_hint?: string }[];
  onSwitchMongoHost?: (host: string) => void;
  menuSyncTrigger?: number;
}

export const ManageMenuSoCoTask: React.FC<ManageMenuSoCoTaskProps> = ({
  selectedRestaurant,
  restaurants,
  user: _user,
  showToast,
  connectedHost,
  openCandidates,
  onSwitchMongoHost,
  menuSyncTrigger
}) => {
  const activeHost = connectedHost || selectedRestaurant?.ip || '';

  // ══════════════════════════════════════════════════════════════════════════
  // STATE: DANH SÁCH MENU & LỰA CHỌN MENU
  // ══════════════════════════════════════════════════════════════════════════
  const [menus, setMenus] = useState<MenuCategoryItem[]>([]);
  const [loadingMenus, setLoadingMenus] = useState<boolean>(false);
  const [selectedMenuCodes, setSelectedMenuCodes] = useState<string[]>([]);
  const [isMenuDropdownOpen, setIsMenuDropdownOpen] = useState<boolean>(false);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // ══════════════════════════════════════════════════════════════════════════
  // STATE: DANH SÁCH MÓN ĂN & TẢI DỮ LIỆU
  // ══════════════════════════════════════════════════════════════════════════
  const [dishItems, setDishItems] = useState<DishMenuItem[]>([]);
  const [loadingDishes, setLoadingDishes] = useState<boolean>(false);

  // ══════════════════════════════════════════════════════════════════════════
  // STATE: BỘ LỌC & TÌM KIẾM
  // ══════════════════════════════════════════════════════════════════════════
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchAllMenus, setSearchAllMenus] = useState<boolean>(false);
  const [filterLevel, setFilterLevel] = useState<string>('ALL'); // 'ALL' | '-1' (Thường) | '0' (Đồ uống)
  const [filterCoStatus, setFilterCoStatus] = useState<string>('ALL'); // 'ALL' | 'HAS_CO' | 'NO_CO'

  // Selected dish rows (checkboxes)
  const [selectedDishKeys, setSelectedDishKeys] = useState<Set<string>>(new Set());

  // Copy helper feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Đã sao chép: ${text}`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper remove tones
  const removeTones = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .toLowerCase()
      .trim();
  };

  // Click outside menu dropdown
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(e.target as Node)) {
        setIsMenuDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // ══════════════════════════════════════════════════════════════════════════
  // 1. TẢI DANH SÁCH MENU
  // ══════════════════════════════════════════════════════════════════════════
  const fetchMenus = async () => {
    if (!activeHost) return;
    setLoadingMenus(true);
    try {
      const res = await mongoService.getMenuSoCoCategories(activeHost);
      const mList = res.menus || [];
      setMenus(mList);

      // Mặc định chỉ chọn menu đầu tiên để tối ưu tốc độ, tránh tải toàn bộ menu gây lag/đơ
      setSelectedMenuCodes((prev) => {
        const validPrev = prev.filter((c) => mList.some((m) => m.code === c));
        if (validPrev.length > 0) {
          return validPrev;
        }
        return mList.length > 0 ? [mList[0].code] : [];
      });
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách menu:', err);
      showToast('Lỗi khi tải danh sách Menu: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingMenus(false);
    }
  };

  useEffect(() => {
    if (activeHost) {
      setSelectedMenuCodes([]); // Reset menu khi đổi máy trạm/nhà hàng khác để tự chọn menu đầu tiên của nhà đó
      fetchMenus();
    }
  }, [activeHost]);

  // ══════════════════════════════════════════════════════════════════════════
  // 2. TẢI CHI TIẾT MÓN ĂN
  // ══════════════════════════════════════════════════════════════════════════
  const fetchDishItems = async () => {
    if (!activeHost) return;
    if (!searchAllMenus && selectedMenuCodes.length === 0) {
      setDishItems([]);
      return;
    }

    setLoadingDishes(true);
    try {
      const res = await mongoService.loadMenuSoCoItems({
        host: activeHost,
        menu_codes: selectedMenuCodes,
        search_all: searchAllMenus
      });
      setDishItems(res.items || []);
      setSelectedDishKeys(new Set()); // reset selection
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách món:', err);
      showToast('Lỗi khi tải chi tiết món: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingDishes(false);
    }
  };

  useEffect(() => {
    if (activeHost && (selectedMenuCodes.length > 0 || searchAllMenus)) {
      fetchDishItems();
    }
  }, [activeHost, selectedMenuCodes, searchAllMenus]);

  // Tự động làm mới danh sách menu & món ăn khi vừa chạy "Đồng Bộ SO ➔ CO" xong
  useEffect(() => {
    if (menuSyncTrigger && menuSyncTrigger > 0 && activeHost) {
      fetchMenus();
      fetchDishItems();
    }
  }, [menuSyncTrigger]);

  // Phân tích từ khóa tìm kiếm: hỗ trợ cả tìm đơn lẻ & tìm hàng loạt nhiều mã SAP, RK7, Tên món
  const searchTokens = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return [];

    // 1. Phân tách theo dấu xuống dòng, dấu phẩy, chấm phẩy, tab
    if (/[\n\r,;\t]/.test(raw)) {
      return raw
        .split(/[\n\r,;\t]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }

    // 2. Nếu không có dấu ngăn cách đặc biệt nhưng là chuỗi nhiều mã số cách nhau bởi khoảng trắng
    // Ví dụ: "60030990 60023656" hoặc "33057 33162"
    const spaceParts = raw.split(/\s+/).filter(Boolean);
    if (spaceParts.length > 1 && spaceParts.every((p) => /^\d{3,10}$/.test(p))) {
      return spaceParts;
    }

    // 3. Tìm kiếm chuỗi văn bản thông thường
    return [raw];
  }, [searchQuery]);

  // Xử lý tự động chuyển đổi khi người dùng copy nhiều dòng từ Excel và Paste vào ô tìm kiếm
  const handlePasteSearch = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData('text');
    if (pasteText && (pasteText.includes('\n') || pasteText.includes('\r'))) {
      e.preventDefault();
      const tokens = pasteText
        .split(/[\r\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const joined = tokens.join(', ');
      setSearchQuery(joined);
    }
  };

  // Danh sách các món sau khi lọc client (Gom chung tìm đơn lẻ & tìm hàng loạt)
  const filteredDishes = useMemo(() => {
    let result = dishItems;

    // Lọc theo searchTokens (Hỗ trợ cả tìm đơn lẻ lẫn tìm hàng loạt nhiều mã)
    if (searchTokens.length > 0) {
      if (searchTokens.length === 1) {
        // TÌM ĐƠN LẺ: Tìm kiếm mờ linh hoạt không dấu / có dấu
        const q = removeTones(searchTokens[0]);
        result = result.filter((it) => {
          return (
            removeTones(it.name).includes(q) ||
            (it.rk7_code || '').includes(q) ||
            (it.sap_code || '').includes(q) ||
            removeTones(it.group_name).includes(q) ||
            removeTones(it.menu_name).includes(q)
          );
        });
      } else {
        // TÌM HÀNG LOẠT: Khớp nếu món thỏa mãn BẤT KỲ mã/tên nào trong danh sách
        const tokenMeta = searchTokens.map((t) => ({
          raw: t,
          norm: removeTones(t),
          isDigitCode: /^\d{3,10}$/.test(t)
        }));

        result = result.filter((it) => {
          const itRk7 = (it.rk7_code || '').trim();
          const itSap = (it.sap_code || '').trim();
          const itNameNorm = removeTones(it.name);
          const itGroupNorm = removeTones(it.group_name);
          const itMenuNorm = removeTones(it.menu_name);

          return tokenMeta.some(({ raw, norm, isDigitCode }) => {
            if (isDigitCode) {
              // Khớp chính xác mã RK7 / SAP hoặc khớp chuỗi con mã
              return itSap === raw || itRk7 === raw || itSap.includes(raw) || itRk7.includes(raw);
            }
            return (
              itNameNorm.includes(norm) ||
              itRk7.includes(raw) ||
              itSap.includes(raw) ||
              itGroupNorm.includes(norm) ||
              itMenuNorm.includes(norm)
            );
          });
        });
      }
    }

    // Lọc theo Level (Món ăn / Đồ uống)
    if (filterLevel !== 'ALL') {
      const lvl = parseInt(filterLevel, 10);
      result = result.filter((it) => it.level === lvl);
    }

    // Lọc theo trạng thái CO
    if (filterCoStatus === 'HAS_CO') {
      result = result.filter((it) => it.is_co);
    } else if (filterCoStatus === 'NO_CO') {
      result = result.filter((it) => !it.is_co);
    }

    return result;
  }, [dishItems, searchTokens, filterLevel, filterCoStatus]);

  // Thống kê đối chiếu các từ khóa tìm kiếm hàng loạt
  const bulkSearchSummary = useMemo(() => {
    if (searchTokens.length <= 1) return null;
    const foundTokens = new Set<string>();

    filteredDishes.forEach((d) => {
      const dSap = (d.sap_code || '').trim();
      const dRk7 = (d.rk7_code || '').trim();
      const dNameNorm = removeTones(d.name);

      searchTokens.forEach((t) => {
        const norm = removeTones(t);
        const isDigit = /^\d{3,10}$/.test(t);
        if (isDigit) {
          if (dSap === t || dRk7 === t || dSap.includes(t) || dRk7.includes(t)) {
            foundTokens.add(t);
          }
        } else {
          if (dNameNorm.includes(norm) || dSap.includes(t) || dRk7.includes(t)) {
            foundTokens.add(t);
          }
        }
      });
    });

    const notFound = searchTokens.filter((t) => !foundTokens.has(t));
    return {
      total: searchTokens.length,
      foundCount: foundTokens.size,
      notFound
    };
  }, [searchTokens, filteredDishes]);

  // Checkbox helpers
  const getDishKey = (it: DishMenuItem) => `${it.menu_code}___${it.group_code}___${it.rk7_code}`;

  const isAllSelected = useMemo(() => {
    if (filteredDishes.length === 0) return false;
    return filteredDishes.every((d) => selectedDishKeys.has(getDishKey(d)));
  }, [filteredDishes, selectedDishKeys]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDishKeys(new Set());
    } else {
      const newKeys = new Set(selectedDishKeys);
      filteredDishes.forEach((d) => newKeys.add(getDishKey(d)));
      setSelectedDishKeys(newKeys);
    }
  };

  const toggleSelectDish = (key: string) => {
    const newKeys = new Set(selectedDishKeys);
    if (newKeys.has(key)) {
      newKeys.delete(key);
    } else {
      newKeys.add(key);
    }
    setSelectedDishKeys(newKeys);
  };

  const selectedDishesList = useMemo(() => {
    return dishItems.filter((d) => selectedDishKeys.has(getDishKey(d)));
  }, [dishItems, selectedDishKeys]);

  // ══════════════════════════════════════════════════════════════════════════
  // GOM NHÓM MENU & NHÓM MÓN (MENU & GROUP HIERARCHY)
  // ══════════════════════════════════════════════════════════════════════════
  interface GroupHierarchyItem {
    group_code: string;
    group_name: string;
    level: number;
    dishes: DishMenuItem[];
  }

  interface MenuHierarchyItem {
    menu_code: string;
    menu_name: string;
    total_dishes: number;
    groups: GroupHierarchyItem[];
  }

  // Chế độ xem: 'grouped' (gom nhóm theo menu & nhóm món) hoặc 'flat' (bảng danh sách phẳng)
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedMenuCodes, setCollapsedMenuCodes] = useState<Set<string>>(new Set());
  // Mặc định tất cả các Nhóm Món đều THU GỌN (Set rỗng), người dùng cần xem nhóm nào thì click mở nhóm đó
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Tính toán cấu trúc gom nhóm Menu & Nhóm Món từ filteredDishes
  const groupedMenuHierarchy = useMemo<MenuHierarchyItem[]>(() => {
    const menuMap = new Map<string, {
      menu_code: string;
      menu_name: string;
      groupMap: Map<string, {
        group_code: string;
        group_name: string;
        level: number;
        dishes: DishMenuItem[];
      }>;
    }>();

    filteredDishes.forEach((d) => {
      const mCode = d.menu_code || 'DEFAULT';
      const mName = d.menu_name || (menus.find((m) => m.code === mCode)?.name) || `Menu ${mCode}`;

      if (!menuMap.has(mCode)) {
        menuMap.set(mCode, {
          menu_code: mCode,
          menu_name: mName,
          groupMap: new Map(),
        });
      }

      const mEntry = menuMap.get(mCode)!;
      const gCode = d.group_code || 'DEFAULT_GROUP';
      const gName = d.group_name || `Nhóm ${gCode}`;

      if (!mEntry.groupMap.has(gCode)) {
        mEntry.groupMap.set(gCode, {
          group_code: gCode,
          group_name: gName,
          level: d.level !== undefined ? d.level : -1,
          dishes: [],
        });
      }

      mEntry.groupMap.get(gCode)!.dishes.push(d);
    });

    const result: MenuHierarchyItem[] = [];
    menuMap.forEach((mEntry) => {
      const groups: GroupHierarchyItem[] = Array.from(mEntry.groupMap.values());
      const total_dishes = groups.reduce((acc, g) => acc + g.dishes.length, 0);
      result.push({
        menu_code: mEntry.menu_code,
        menu_name: mEntry.menu_name,
        total_dishes,
        groups,
      });
    });

    return result;
  }, [filteredDishes, menus]);

  // Đóng / mở 1 Menu. Khi thu gọn Menu thì đồng thời thu gọn luôn các nhóm con bên trong
  const toggleCollapseMenu = (menuCode: string) => {
    setCollapsedMenuCodes((prev) => {
      const next = new Set(prev);
      if (next.has(menuCode)) {
        next.delete(menuCode);
      } else {
        next.add(menuCode);
        // Thu gọn các nhóm con thuộc menu này
        setExpandedGroupKeys((prevExpanded) => {
          const nextExpanded = new Set(prevExpanded);
          const prefix = `${menuCode}___`;
          for (const k of nextExpanded) {
            if (k.startsWith(prefix)) {
              nextExpanded.delete(k);
            }
          }
          return nextExpanded;
        });
      }
      return next;
    });
  };

  // Đóng / mở 1 Nhóm Món
  const toggleGroupExpand = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Nút Mở Rộng Hết: Mở tất cả Menu VÀ Mở tất cả các nhóm con bên trong
  const expandAllGroupsAndMenus = () => {
    setCollapsedMenuCodes(new Set());
    const allGroupKeys = new Set<string>();
    groupedMenuHierarchy.forEach((m) => {
      m.groups.forEach((g) => {
        allGroupKeys.add(`${m.menu_code}___${g.group_code}`);
      });
    });
    setExpandedGroupKeys(allGroupKeys);
  };

  // Nút Thu Gọn Hết: Thu gọn triệt để tất cả Menu VÀ Thu gọn toàn bộ các nhóm con đang bung sẵn
  const collapseAllMenus = () => {
    setCollapsedMenuCodes(new Set(groupedMenuHierarchy.map((m) => m.menu_code)));
    setExpandedGroupKeys(new Set()); // Xóa sạch các nhóm đang bung
  };

  // Khi người dùng gõ tìm kiếm: tự động mở các nhóm có món phù hợp để tiện theo dõi
  useEffect(() => {
    if (searchQuery.trim() && groupedMenuHierarchy.length > 0) {
      const matchingKeys = new Set<string>();
      groupedMenuHierarchy.forEach((m) => {
        m.groups.forEach((g) => {
          matchingKeys.add(`${m.menu_code}___${g.group_code}`);
        });
      });
      setExpandedGroupKeys(matchingKeys);
      setCollapsedMenuCodes(new Set());
    } else if (!searchQuery.trim()) {
      // Khi xóa ô tìm kiếm -> trở về mặc định thu gọn các nhóm
      setExpandedGroupKeys(new Set());
    }
  }, [searchQuery]);

  const isMenuAllSelected = (menuItem: MenuHierarchyItem) => {
    const allDishKeys = menuItem.groups.flatMap((g) => g.dishes.map(getDishKey));
    if (allDishKeys.length === 0) return false;
    return allDishKeys.every((k) => selectedDishKeys.has(k));
  };

  const toggleSelectMenu = (menuItem: MenuHierarchyItem) => {
    const allDishKeys = menuItem.groups.flatMap((g) => g.dishes.map(getDishKey));
    const isAll = isMenuAllSelected(menuItem);
    const newKeys = new Set(selectedDishKeys);
    if (isAll) {
      allDishKeys.forEach((k) => newKeys.delete(k));
    } else {
      allDishKeys.forEach((k) => newKeys.add(k));
    }
    setSelectedDishKeys(newKeys);
  };

  const isGroupAllSelected = (groupItem: GroupHierarchyItem) => {
    const allDishKeys = groupItem.dishes.map(getDishKey);
    if (allDishKeys.length === 0) return false;
    return allDishKeys.every((k) => selectedDishKeys.has(k));
  };

  const toggleSelectGroup = (groupItem: GroupHierarchyItem) => {
    const allDishKeys = groupItem.dishes.map(getDishKey);
    const isAll = isGroupAllSelected(groupItem);
    const newKeys = new Set(selectedDishKeys);
    if (isAll) {
      allDishKeys.forEach((k) => newKeys.delete(k));
    } else {
      allDishKeys.forEach((k) => newKeys.add(k));
    }
    setSelectedDishKeys(newKeys);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TÍNH NĂNG: KÍCH HOẠT QUA CO (1 MÓN HOẶC HÀNG LOẠT)
  // ══════════════════════════════════════════════════════════════════════════
  const [activatingCo, setActivatingCo] = useState<boolean>(false);

  const handleActivateCoSingle = async (it: DishMenuItem) => {
    if (!activeHost) return;
    setActivatingCo(true);
    try {
      const res = await mongoService.activateDishesToCo({
        host: activeHost,
        items: [{
          rk7_code: it.rk7_code,
          name: it.name,
          sap_code: it.sap_code,
          price: it.price,
          image_url: it.image_url
        }]
      });
      showToast(res.message, 'success');
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi kích hoạt CO: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActivatingCo(false);
    }
  };

  const handleActivateCoBulk = async () => {
    if (!activeHost || selectedDishesList.length === 0) return;
    setActivatingCo(true);
    try {
      const itemsToAct = selectedDishesList.map((d) => ({
        rk7_code: d.rk7_code,
        name: d.name,
        sap_code: d.sap_code,
        price: d.price,
        image_url: d.image_url
      }));
      const res = await mongoService.activateDishesToCo({
        host: activeHost,
        items: itemsToAct
      });
      showToast(res.message, 'success');
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi kích hoạt CO hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setActivatingCo(false);
    }
  };

  const [deactivatingCo, setDeactivatingCo] = useState<boolean>(false);

  const handleDeactivateCoSingle = async (it: DishMenuItem) => {
    if (!activeHost) return;
    if (!confirm(`Bạn có chắc muốn tắt kích hoạt món "${it.name}" (Mã: ${it.rk7_code}) khỏi CO? Món này sẽ không hiển thị trên giao diện gọi món online CO nữa.`)) return;
    setDeactivatingCo(true);
    try {
      const res = await mongoService.deactivateDishesFromCo({
        host: activeHost,
        rk7_codes: [it.rk7_code]
      });
      showToast(res.message, 'success');
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi tắt kích hoạt CO: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDeactivatingCo(false);
    }
  };

  const handleDeactivateCoBulk = async () => {
    if (!activeHost || selectedDishesList.length === 0) return;
    const rk7List = Array.from(new Set(selectedDishesList.map((d) => d.rk7_code)));
    if (!confirm(`Bạn có chắc muốn tắt kích hoạt ${rk7List.length} món đã chọn khỏi CO?`)) return;
    setDeactivatingCo(true);
    try {
      const res = await mongoService.deactivateDishesFromCo({
        host: activeHost,
        rk7_codes: rk7List
      });
      showToast(res.message, 'success');
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi tắt kích hoạt CO hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDeactivatingCo(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // THÊM THẲNG MÓN MỚI VÀO NHÓM MÓN ĐANG MỞ
  // ══════════════════════════════════════════════════════════════════════════
  const [isAddDishToGroupOpen, setIsAddDishToGroupOpen] = useState<boolean>(false);
  const [targetGroupForAdd, setTargetGroupForAdd] = useState<{
    menuCode: string;
    groupCode: string;
    groupName: string;
    level: number;
  } | null>(null);
  const [newDishRk7, setNewDishRk7] = useState<string>('');
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishSap, setNewDishSap] = useState<string>('');
  const [newDishPrice, setNewDishPrice] = useState<number>(0);
  const [newDishSortOrder, setNewDishSortOrder] = useState<number>(1);
  const [newDishImg, setNewDishImg] = useState<string>('');
  const [newDishAutoCo, setNewDishAutoCo] = useState<boolean>(true);
  const [savingAddDishToGroup, setSavingAddDishToGroup] = useState<boolean>(false);

  const openAddDishToGroupModal = (
    menuCode: string,
    groupCode: string,
    groupName: string,
    level: number,
    existingCount: number = 0
  ) => {
    setTargetGroupForAdd({ menuCode, groupCode, groupName, level });
    setNewDishRk7('');
    setNewDishName('');
    setNewDishSap('');
    setNewDishPrice(0);
    setNewDishSortOrder(existingCount + 1);
    setNewDishImg('');
    setNewDishAutoCo(true);
    setIsAddDishToGroupOpen(true);
  };

  const handleSaveAddDishToGroup = async () => {
    if (!activeHost || !targetGroupForAdd) return;
    if (!newDishRk7.trim()) {
      showToast('Vui lòng nhập Mã RK7 của món', 'error');
      return;
    }
    if (!newDishName.trim()) {
      showToast('Vui lòng nhập Tên món', 'error');
      return;
    }

    setSavingAddDishToGroup(true);
    try {
      const res = await mongoService.bulkAddMenuDishes({
        host: activeHost,
        target_menu_codes: [targetGroupForAdd.menuCode],
        group_mode: 'existing',
        group_code: targetGroupForAdd.groupCode,
        group_name: targetGroupForAdd.groupName,
        level: targetGroupForAdd.level,
        items: [{
          rk7_code: newDishRk7.trim(),
          name: newDishName.trim(),
          sap_code: newDishSap.trim() || undefined,
          price: Number(newDishPrice) || 0,
          sort_order: Number(newDishSortOrder) || 1,
          image_url: newDishImg.trim() || undefined,
          level: targetGroupForAdd.level
        }]
      });

      if (newDishAutoCo) {
        try {
          await mongoService.activateDishesToCo({
            host: activeHost,
            items: [{
              rk7_code: newDishRk7.trim(),
              name: newDishName.trim(),
              sap_code: newDishSap.trim() || undefined,
              price: Number(newDishPrice) || 0,
              image_url: newDishImg.trim() || undefined
            }]
          });
        } catch {
          // ignore
        }
      }

      showToast(res.message || `Đã thêm món "${newDishName.trim()}" vào nhóm "${targetGroupForAdd.groupName}" thành công!`, 'success');
      setIsAddDishToGroupOpen(false);
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi khi thêm món vào nhóm: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingAddDishToGroup(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 5. MODAL: SỬA THÔNG TIN MÓN ĂN
  // ══════════════════════════════════════════════════════════════════════════
  const [editingDish, setEditingDish] = useState<DishMenuItem | null>(null);
  const [editRk7, setEditRk7] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editSap, setEditSap] = useState<string>('');
  const [editSort, setEditSort] = useState<number>(0);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editImg, setEditImg] = useState<string>('');
  const [editLevel, setEditLevel] = useState<number>(-1);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const openEditModal = (it: DishMenuItem) => {
    setEditingDish(it);
    setEditRk7(it.rk7_code);
    setEditName(it.name);
    setEditSap(it.sap_code || '');
    setEditSort(it.sort_order || 0);
    setEditPrice(it.price || 0);
    setEditImg(it.image_url || '');
    setEditLevel(it.level !== undefined ? it.level : -1);
  };

  const handleSaveEdit = async () => {
    if (!editingDish || !activeHost) return;
    if (!editName.trim() || !editRk7.trim()) {
      showToast('Tên món và mã RK7 không được để trống', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await mongoService.updateMenuDishItem({
        host: activeHost,
        menu_code: editingDish.menu_code,
        group_code: editingDish.group_code,
        original_rk7_code: editingDish.rk7_code,
        new_rk7_code: editRk7.trim(),
        new_name: editName.trim(),
        new_sap_code: editSap.trim(),
        new_sort_order: editSort,
        new_price: editPrice,
        new_image_url: editImg.trim(),
        new_level: editLevel
      });
      showToast(res.message, 'success');
      setEditingDish(null);
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi cập nhật món: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 6. MODAL: THÊM MÓN HÀNG LOẠT (GOOGLE SHEETS MATRIX STYLE)
  // ══════════════════════════════════════════════════════════════════════════
  const [isBulkAddOpen, setIsBulkAddOpen] = useState<boolean>(false);
  const [bulkAddTargetMenus, setBulkAddTargetMenus] = useState<string[]>([]);
  const [bulkAddGroupMode, setBulkAddGroupMode] = useState<'existing' | 'new'>('existing');
  const [bulkAddSelectedGroup, setBulkAddSelectedGroup] = useState<string>('');
  const [bulkAddNewGroupName, setBulkAddNewGroupName] = useState<string>('');
  const [bulkAddNewGroupLevel, setBulkAddNewGroupLevel] = useState<number>(-1);
  const [bulkAddPasteText, setBulkAddPasteText] = useState<string>('');
  const [bulkAddRows, setBulkAddRows] = useState<BulkAddDishRow[]>([]);
  const [savingBulkAdd, setSavingBulkAdd] = useState<boolean>(false);

  // Danh sách các nhóm theo từng Menu cụ thể
  const groupsByMenuCode = useMemo(() => {
    const map: Record<string, Array<{ code: string; name: string; level: number; count: number }>> = {};
    menus.forEach((m) => {
      map[m.code] = (m.groups && m.groups.length > 0)
        ? m.groups.map((g) => ({
            code: g.code,
            name: g.name,
            level: g.level ?? -1,
            count: g.count ?? 0
          }))
        : [];
    });
    dishItems.forEach((d) => {
      if (!map[d.menu_code]) {
        map[d.menu_code] = [];
      }
      const existing = map[d.menu_code].find((g) => g.code === d.group_code);
      if (!existing) {
        map[d.menu_code].push({
          code: d.group_code,
          name: d.group_name,
          level: d.level,
          count: 1
        });
      } else {
        if (existing.count === 0) {
          existing.count = 1;
        }
      }
    });
    return map;
  }, [menus, dishItems]);

  // Cấu hình nhóm riêng cho từng Menu được chọn
  const [bulkAddMenuGroupMap, setBulkAddMenuGroupMap] = useState<Record<string, {
    group_mode: 'existing' | 'new';
    group_code?: string;
    group_name: string;
    level: number;
  }>>({});

  const handleToggleMenuInBulkAdd = (menuCode: string) => {
    if (bulkAddTargetMenus.includes(menuCode)) {
      setBulkAddTargetMenus(bulkAddTargetMenus.filter((c) => c !== menuCode));
    } else {
      setBulkAddTargetMenus([...bulkAddTargetMenus, menuCode]);
      if (!bulkAddMenuGroupMap[menuCode]) {
        const groupsInMenu = (groupsByMenuCode[menuCode] && groupsByMenuCode[menuCode].length > 0)
          ? groupsByMenuCode[menuCode]
          : (menus.find((m) => m.code === menuCode)?.groups || []);
        const firstGroup = groupsInMenu[0];
        setBulkAddMenuGroupMap((prev) => ({
          ...prev,
          [menuCode]: firstGroup
            ? { group_mode: 'existing', group_code: firstGroup.code, group_name: firstGroup.name, level: firstGroup.level ?? -1 }
            : { group_mode: 'new', group_name: 'Nhóm Món Mới', level: -1 }
        }));
      }
    }
  };

  const handleChangeMenuGroupMode = (menuCode: string, mode: 'existing' | 'new') => {
    const groupsInMenu = (groupsByMenuCode[menuCode] && groupsByMenuCode[menuCode].length > 0)
      ? groupsByMenuCode[menuCode]
      : (menus.find((m) => m.code === menuCode)?.groups || []);
    const firstGroup = groupsInMenu[0];
    setBulkAddMenuGroupMap((prev) => ({
      ...prev,
      [menuCode]: {
        ...(prev[menuCode] || {}),
        group_mode: mode,
        group_code: mode === 'existing' ? (firstGroup?.code || '') : undefined,
        group_name: mode === 'existing' ? (firstGroup?.name || '') : (prev[menuCode]?.group_name || ''),
        level: mode === 'existing' ? (firstGroup?.level ?? -1) : (prev[menuCode]?.level ?? -1)
      }
    }));
  };

  const handleSelectExistingGroupForMenu = (menuCode: string, groupCode: string) => {
    const groupsInMenu = (groupsByMenuCode[menuCode] && groupsByMenuCode[menuCode].length > 0)
      ? groupsByMenuCode[menuCode]
      : (menus.find((m) => m.code === menuCode)?.groups || []);
    const grp = groupsInMenu.find((g) => g.code === groupCode);
    if (!grp) return;
    setBulkAddMenuGroupMap((prev) => ({
      ...prev,
      [menuCode]: {
        group_mode: 'existing',
        group_code: grp.code,
        group_name: grp.name,
        level: grp.level ?? -1
      }
    }));
  };

  const handleUpdateNewGroupNameForMenu = (menuCode: string, name: string) => {
    setBulkAddMenuGroupMap((prev) => ({
      ...prev,
      [menuCode]: {
        group_mode: 'new',
        group_code: undefined,
        group_name: name,
        level: prev[menuCode]?.level ?? -1
      }
    }));
  };

  const handleUpdateNewGroupLevelForMenu = (menuCode: string, lvl: number) => {
    setBulkAddMenuGroupMap((prev) => ({
      ...prev,
      [menuCode]: {
        ...(prev[menuCode] || { group_mode: 'new', group_name: '' }),
        level: lvl
      }
    }));
  };

  const handleApplyGroupToAllCheckedMenus = (sourceMenuCode: string, config: { group_mode: 'existing' | 'new'; group_code?: string; group_name: string; level: number }) => {
    const newMap = { ...bulkAddMenuGroupMap };
    bulkAddTargetMenus.forEach((mCode) => {
      if (mCode === sourceMenuCode) return;
      const groupsInM = (groupsByMenuCode[mCode] && groupsByMenuCode[mCode].length > 0)
        ? groupsByMenuCode[mCode]
        : (menus.find((m) => m.code === mCode)?.groups || []);
      if (config.group_mode === 'existing') {
        const match = groupsInM.find((g) => g.name.toLowerCase() === config.group_name.toLowerCase() || g.code === config.group_code);
        if (match) {
          newMap[mCode] = { group_mode: 'existing', group_code: match.code, group_name: match.name, level: match.level ?? -1 };
        } else {
          newMap[mCode] = { group_mode: 'new', group_name: config.group_name, level: config.level };
        }
      } else {
        newMap[mCode] = { group_mode: 'new', group_name: config.group_name, level: config.level };
      }
    });
    setBulkAddMenuGroupMap(newMap);
    showToast(`Đã đồng bộ cấu hình nhóm "${config.group_name}" cho tất cả menu đã chọn`, 'info');
  };

  // Danh sách các nhóm hiện có trong các menu được chọn
  const existingGroupsInMenus = useMemo(() => {
    const gMap: Map<string, { code: string; name: string; level: number; menuCodes: Set<string> }> = new Map();
    menus.forEach((m) => {
      (m.groups || []).forEach((g) => {
        if (!gMap.has(g.code)) {
          gMap.set(g.code, {
            code: g.code,
            name: g.name,
            level: g.level ?? -1,
            menuCodes: new Set([m.code])
          });
        } else {
          gMap.get(g.code)?.menuCodes.add(m.code);
        }
      });
    });
    dishItems.forEach((d) => {
      if (!gMap.has(d.group_code)) {
        gMap.set(d.group_code, {
          code: d.group_code,
          name: d.group_name,
          level: d.level,
          menuCodes: new Set([d.menu_code])
        });
      } else {
        gMap.get(d.group_code)?.menuCodes.add(d.menu_code);
      }
    });
    return Array.from(gMap.values());
  }, [menus, dishItems]);

  // Tự động nhận diện Level theo Nhóm món đã chọn (Level 0: Đồ uống/Nước, Level -1: Món ăn/Thường mặc định)
  const currentGroupLevel = useMemo(() => {
    if (bulkAddGroupMode === 'existing') {
      const found = existingGroupsInMenus.find((g) => g.code === bulkAddSelectedGroup);
      if (found) {
        if (found.level === 0) return 0;
        const norm = removeTones(found.name).toLowerCase();
        if (norm.includes('nuoc') || norm.includes('do uong') || norm.includes('drink') || norm.includes('giai khat') || norm.includes('bia') || norm.includes('ruou')) {
          return 0;
        }
        return -1;
      }
      return -1;
    } else {
      return bulkAddNewGroupLevel;
    }
  }, [bulkAddGroupMode, bulkAddSelectedGroup, existingGroupsInMenus, bulkAddNewGroupLevel]);

  // Phân tích văn bản copy-paste từ Excel/Google Sheets
  const handleParsePasteText = (text: string, overrideLevel?: number) => {
    setBulkAddPasteText(text);
    if (!text.trim()) {
      setBulkAddRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: BulkAddDishRow[] = [];
    const lvlToUse = overrideLevel !== undefined ? overrideLevel : currentGroupLevel;

    lines.forEach((line) => {
      // Tách theo Tab (\t) hoặc Phẩy (,) hoặc Chấm phẩy (;)
      const cols = line.split(/\t/).map((c) => c.trim());
      if (cols.length === 1) {
        // Thử tách theo dấu phẩy nếu không có tab
        const commaCols = line.split(',').map((c) => c.trim());
        if (commaCols.length > 1) {
          parseRow(commaCols, parsed, lvlToUse);
          return;
        }
      }
      parseRow(cols, parsed, lvlToUse);
    });

    setBulkAddRows(parsed);
  };

  const parseRow = (cols: string[], targetList: BulkAddDishRow[], defaultLvl: number) => {
    // Nếu là dòng tiêu đề chứa 'mã món' hay 'tên món' thì bỏ qua
    const firstColLower = (cols[0] || '').toLowerCase();
    if (firstColLower.includes('mã món') || firstColLower.includes('tên món') || firstColLower.includes('loại menu') || firstColLower.includes('mã rk7')) {
      return;
    }

    // Thứ tự 3 cột tiêu chuẩn theo yêu cầu:
    // Cột 0: Mã RK7 | Cột 1: Tên Món | Cột 2: Mã SAP
    let rk7 = cols[0] || '';
    let name = cols[1] || '';
    let sap = cols[2] || '';
    let sort = cols[3] && !isNaN(parseInt(cols[3], 10)) ? parseInt(cols[3], 10) : targetList.length + 1;
    let price = cols[4] ? parseFloat(cols[4].replace(/[^\d.]/g, '')) : 0;
    let img = cols[5] || '';
    // Level: Nếu user dán chỉ 3 cột (hoặc không có cột 6 hợp lệ), tự động nhận diện theo Nhóm món (defaultLvl: 0 nếu nước, -1 nếu thường)
    let lvl = cols[6] !== undefined && cols[6] !== '' && !isNaN(parseInt(cols[6], 10))
      ? parseInt(cols[6], 10)
      : defaultLvl;

    // Hỗ trợ nếu copy cả bảng mẫu có nhiều cột như file Excel cũ:
    // Cột 11: Mã món, Cột 12: Tên Món, Cột 14: Level, Cột 15: Thứ tự, Cột 16: Ảnh, Cột 17: SAP
    if (cols.length >= 15) {
      if (cols[11] && /^\d+$/.test(cols[11])) {
        rk7 = cols[11];
        name = cols[12] || '';
        lvl = cols[14] ? parseInt(cols[14], 10) : defaultLvl;
        sort = cols[15] ? parseInt(cols[15], 10) : targetList.length + 1;
        img = cols[16] || '';
        sap = cols[17] || '';
      }
    }

    if (rk7 && name) {
      targetList.push({
        rk7_code: rk7,
        name: name,
        sap_code: sap,
        sort_order: isNaN(sort) ? targetList.length + 1 : sort,
        price: isNaN(price) ? 0 : price,
        image_url: img,
        level: isNaN(lvl) ? defaultLvl : lvl
      });
    }
  };

  // Tự động đồng bộ Level của các món trong bảng preview khi người dùng đổi Nhóm món hoặc đổi Level nhóm
  useEffect(() => {
    if (bulkAddPasteText.trim()) {
      handleParsePasteText(bulkAddPasteText, currentGroupLevel);
    }
  }, [currentGroupLevel]);

  const openBulkAddModal = () => {
    // Nếu danh sách menu hiện tại chưa có thông tin groups (ví dụ nạp từ cache cũ), tự động tải lại
    if (menus.length > 0 && menus.some((m) => !m.groups || m.groups.length === 0)) {
      fetchMenus();
    }
    const initTarget = selectedMenuCodes.length > 0 ? selectedMenuCodes : (menus[0] ? [menus[0].code] : []);
    setBulkAddTargetMenus(initTarget);
    const initialMap: Record<string, { group_mode: 'existing' | 'new'; group_code?: string; group_name: string; level: number }> = {};
    initTarget.forEach((mCode) => {
      const gList = (groupsByMenuCode[mCode] && groupsByMenuCode[mCode].length > 0)
        ? groupsByMenuCode[mCode]
        : (menus.find((m) => m.code === mCode)?.groups || []);
      const first = gList[0];
      if (first) {
        initialMap[mCode] = { group_mode: 'existing', group_code: first.code, group_name: first.name, level: first.level ?? -1 };
      } else {
        initialMap[mCode] = { group_mode: 'new', group_name: 'Nhóm Món Mới', level: -1 };
      }
    });
    setBulkAddMenuGroupMap(initialMap);
    setBulkAddGroupMode('existing');
    setBulkAddSelectedGroup(existingGroupsInMenus[0]?.code || '');
    setBulkAddNewGroupName('');
    setBulkAddNewGroupLevel(-1);
    setBulkAddPasteText('');
    setBulkAddRows([]);
    setIsBulkAddOpen(true);
  };

  const handleSaveBulkAdd = async () => {
    if (!activeHost) return;
    if (bulkAddTargetMenus.length === 0) {
      showToast('Vui lòng chọn ít nhất một Menu đích để áp dụng', 'error');
      return;
    }

    let gName = '';
    let gCode: string | undefined = undefined;
    let gLevel = -1;

    if (bulkAddGroupMode === 'existing') {
      const found = existingGroupsInMenus.find((g) => g.code === bulkAddSelectedGroup);
      if (found) {
        gName = found.name;
        gCode = found.code;
        gLevel = found.level;
      }
    } else {
      gName = bulkAddNewGroupName.trim();
      gLevel = bulkAddNewGroupLevel;
    }

    if (bulkAddRows.length === 0) {
      showToast('Danh sách món trống! Vui lòng copy paste dữ liệu vào ô bảng tính', 'error');
      return;
    }

    // Đảm bảo tất cả món thêm vào đều được gán đúng Level theo nhóm (0 nếu nhóm nước, -1 nếu thường)
    const finalItems = bulkAddRows.map((r) => ({
      ...r,
      level: currentGroupLevel
    }));

    setSavingBulkAdd(true);
    try {
      const res = await mongoService.bulkAddMenuDishes({
        host: activeHost,
        target_menu_codes: bulkAddTargetMenus,
        group_mode: bulkAddGroupMode,
        group_code: gCode,
        group_name: gName,
        level: gLevel,
        items: finalItems,
        menu_group_map: bulkAddMenuGroupMap
      });

      if (res.warnings && res.warnings.length > 0) {
        showToast(`Thành công (${res.added_count} món). Lưu ý: ${res.warnings.join('; ')}`, 'info');
      } else {
        showToast(res.message, 'success');
      }

      setIsBulkAddOpen(false);
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi thêm món hàng loạt: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingBulkAdd(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 7. MODAL: CHUYỂN / NHÂN BẢN MÓN SANG NHÓM KHÁC
  // ══════════════════════════════════════════════════════════════════════════
  const [isMoveCloneOpen, setIsMoveCloneOpen] = useState<boolean>(false);
  const [moveCloneAction, setMoveCloneAction] = useState<'move' | 'clone'>('clone');
  const [moveTargetMenu, setMoveTargetMenu] = useState<string>('');
  const [moveTargetGroup, setMoveTargetGroup] = useState<string>('');
  const [processingMoveClone, setProcessingMoveClone] = useState<boolean>(false);

  const openMoveCloneModal = () => {
    if (selectedDishesList.length === 0) {
      showToast('Vui lòng chọn ít nhất một món để thực hiện chuyển hoặc nhân bản', 'info');
      return;
    }
    setMoveTargetMenu(selectedDishesList[0]?.menu_code || (menus[0]?.code || ''));
    setMoveTargetGroup(existingGroupsInMenus[0]?.code || '');
    setIsMoveCloneOpen(true);
  };

  const handleExecuteMoveClone = async () => {
    if (!activeHost || selectedDishesList.length === 0) return;
    if (!moveTargetMenu || !moveTargetGroup) {
      showToast('Vui lòng chọn Menu đích và Nhóm đích', 'error');
      return;
    }

    setProcessingMoveClone(true);
    try {
      const sourceList = selectedDishesList.map((d) => ({
        menu_code: d.menu_code,
        group_code: d.group_code,
        rk7_code: d.rk7_code
      }));

      const res = await mongoService.moveOrCloneMenuDishItems({
        host: activeHost,
        action: moveCloneAction,
        source_items: sourceList,
        target_menu_code: moveTargetMenu,
        target_group_code: moveTargetGroup
      });

      showToast(res.message, 'success');
      setIsMoveCloneOpen(false);
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi chuyển/nhân bản món: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setProcessingMoveClone(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 8. MODAL: XÓA MÓN HÀNG LOẠT (2 BƯỚC XÁC NHẬN)
  // ══════════════════════════════════════════════════════════════════════════
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteAllMenusOption, setDeleteAllMenusOption] = useState<boolean>(false);
  const [deletingDishes, setDeletingDishes] = useState<boolean>(false);

  const openDeleteModal = () => {
    if (selectedDishesList.length === 0) {
      showToast('Vui lòng chọn ít nhất một món cần xóa', 'info');
      return;
    }
    setDeleteStep(1);
    setDeleteAllMenusOption(false);
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!activeHost || selectedDishesList.length === 0) return;
    setDeletingDishes(true);
    try {
      const itemsToDel = selectedDishesList.map((d) => ({
        menu_code: d.menu_code,
        group_code: d.group_code,
        rk7_code: d.rk7_code
      }));

      const res = await mongoService.deleteMenuDishItems({
        host: activeHost,
        items: itemsToDel,
        delete_from_all_menus: deleteAllMenusOption
      });

      showToast(res.message, 'success');
      setIsDeleteModalOpen(false);
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi khi xóa món: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDeletingDishes(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 9. MODAL: CHECK LỖI XUNG ĐỘT (RK7 KHÁC TÊN / TÊN KHÁC RK7)
  // ══════════════════════════════════════════════════════════════════════════
  const [isConflictModalOpen, setIsConflictModalOpen] = useState<boolean>(false);
  const [loadingConflicts, setLoadingConflicts] = useState<boolean>(false);
  const [conflictTab, setConflictTab] = useState<'SAME_RK7' | 'SAME_NAME'>('SAME_RK7');
  const [sameRk7List, setSameRk7List] = useState<ConflictItem[]>([]);
  const [sameNameList, setSameNameList] = useState<ConflictItem[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<boolean>(false);

  // Form input đồng bộ xung đột
  const [selectedConflictItem, setSelectedConflictItem] = useState<ConflictItem | null>(null);
  const [unifiedRk7Input, setUnifiedRk7Input] = useState<string>('');
  const [unifiedNameInput, setUnifiedNameInput] = useState<string>('');

  const openConflictModal = async () => {
    if (!activeHost) return;
    setIsConflictModalOpen(true);
    setLoadingConflicts(true);
    setSelectedConflictItem(null);
    try {
      const res = await mongoService.checkMenuSoCoConflicts({
        host: activeHost,
        menu_codes: selectedMenuCodes,
        search_all: searchAllMenus
      });
      setSameRk7List(res.same_rk7_diff_name || []);
      setSameNameList(res.same_name_diff_rk7 || []);
      if ((res.same_rk7_diff_name || []).length === 0 && (res.same_name_diff_rk7 || []).length > 0) {
        setConflictTab('SAME_NAME');
      } else {
        setConflictTab('SAME_RK7');
      }
    } catch (err: any) {
      showToast('Lỗi kiểm tra xung đột: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingConflicts(false);
    }
  };

  const handleSelectConflictToResolve = (item: ConflictItem) => {
    setSelectedConflictItem(item);
    setUnifiedRk7Input(item.rk7_code || (item.distinct_values[0] || ''));
    setUnifiedNameInput(item.name || (item.distinct_values[0] || ''));
  };

  const handleExecuteResolveConflict = async () => {
    if (!activeHost || !selectedConflictItem) return;
    if (!unifiedNameInput.trim() || !unifiedRk7Input.trim()) {
      showToast('Vui lòng nhập đầy đủ Mã RK7 và Tên Món cần đồng bộ', 'error');
      return;
    }

    setResolvingConflict(true);
    try {
      const affectedRk7s = selectedConflictItem.type === 'same_name_diff_rk7'
        ? selectedConflictItem.distinct_values
        : [selectedConflictItem.rk7_code || ''];
      const affectedNames = selectedConflictItem.type === 'same_rk7_diff_name'
        ? selectedConflictItem.distinct_values
        : [selectedConflictItem.name || ''];

      const res = await mongoService.resolveMenuSoCoConflict({
        host: activeHost,
        conflict_type: selectedConflictItem.type,
        unified_rk7_code: unifiedRk7Input.trim(),
        unified_name: unifiedNameInput.trim(),
        affected_rk7_codes: affectedRk7s,
        affected_names: affectedNames
      });

      showToast(res.message, 'success');
      setSelectedConflictItem(null);
      // Tải lại danh sách xung đột & món ăn
      openConflictModal();
      fetchDishItems();
    } catch (err: any) {
      showToast('Lỗi đồng bộ xung đột: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setResolvingConflict(false);
    }
  };

  // Toggle xem chi tiết xung đột đối chiếu mã SAP
  const [expandedConflictKeys, setExpandedConflictKeys] = useState<Set<string>>(new Set());
  const toggleExpandConflict = (key: string) => {
    setExpandedConflictKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // 10. KHÔNG GIAN MENU TRUNG GIAN & ĐỒNG BỘ SANG NHÀ HÀNG KHÁC
  // ══════════════════════════════════════════════════════════════════════════
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false);
  const [snapshotsList, setSnapshotsList] = useState<MenuSnapshotItem[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState<boolean>(false);
  const [isSavingSnapshotView, setIsSavingSnapshotView] = useState<boolean>(false);
  const [snapshotNameInput, setSnapshotNameInput] = useState<string>('');
  const [snapshotMenuCodes, setSnapshotMenuCodes] = useState<string[]>([]);
  const [savingSnapshot, setSavingSnapshot] = useState<boolean>(false);

  // Triển khai Snapshot sang NH đích
  const [deployingSnapshot, setDeployingSnapshot] = useState<MenuSnapshotItem | null>(null);
  const [deployTargetRestId, setDeployTargetRestId] = useState<number | null>(null);
  const [deployMode, setDeployMode] = useState<'merge_update' | 'clean_overwrite'>('merge_update');
  const [deploySyncCo, setDeploySyncCo] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  // Đồng bộ trực tiếp giữa 2 nhà hàng
  const [isDirectSyncModalOpen, setIsDirectSyncModalOpen] = useState<boolean>(false);
  const [directSyncTargetRestId, setDirectSyncTargetRestId] = useState<number | null>(null);
  const [directSyncMode, setDirectSyncMode] = useState<'merge_update' | 'clean_overwrite'>('merge_update');
  const [directSyncMenuCodes, setDirectSyncMenuCodes] = useState<string[]>([]);
  const [directSyncSyncCo, setDirectSyncSyncCo] = useState<boolean>(true);
  const [isDirectSyncing, setIsDirectSyncing] = useState<boolean>(false);

  const fetchSnapshots = async () => {
    setLoadingSnapshots(true);
    try {
      const data = await mongoService.listMenuSnapshots();
      setSnapshotsList(data || []);
    } catch (err: any) {
      console.error('Lỗi lấy snapshots:', err);
      showToast('Lỗi khi tải danh sách snapshot: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingSnapshots(false);
    }
  };

  const openSnapshotModal = () => {
    setIsSnapshotModalOpen(true);
    setIsSavingSnapshotView(false);
    setDeployingSnapshot(null);
    fetchSnapshots();
  };

  const openSaveSnapshotForm = () => {
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const restName = selectedRestaurant?.res || selectedRestaurant?.sap || 'Nhà Hàng';
    setSnapshotNameInput(`Thực đơn ${restName} (${selectedRestaurant?.sap || 'SAP'}) - ${timeStr}`);
    setSnapshotMenuCodes(menus.map((m) => m.code));
    setIsSavingSnapshotView(true);
  };

  const handleSaveSnapshot = async () => {
    if (!activeHost) return;
    if (snapshotMenuCodes.length === 0) {
      showToast('Vui lòng chọn ít nhất một Menu để lưu snapshot', 'error');
      return;
    }
    setSavingSnapshot(true);
    try {
      const res = await mongoService.saveMenuSnapshot({
        host: activeHost,
        port: 27017,
        source_sap: selectedRestaurant?.sap || '',
        source_name: selectedRestaurant?.res || '',
        snapshot_name: snapshotNameInput.trim(),
        menu_codes: snapshotMenuCodes
      });
      showToast(res.message, 'success');
      setIsSavingSnapshotView(false);
      fetchSnapshots();
    } catch (err: any) {
      showToast('Lỗi khi lưu snapshot: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản snapshot "${name}" khỏi Không Gian Trung Gian?`)) return;
    try {
      const res = await mongoService.deleteMenuSnapshot(id);
      showToast(res.message, 'success');
      fetchSnapshots();
    } catch (err: any) {
      showToast('Lỗi khi xóa snapshot: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const handleOpenDeployDialog = (snap: MenuSnapshotItem) => {
    setDeployingSnapshot(snap);
    const otherRest = restaurants.find((r) => r.sap !== snap.source_sap && r.ip);
    setDeployTargetRestId(otherRest ? otherRest.id : null);
    setDeployMode('merge_update');
    setDeploySyncCo(true);
  };

  const handleExecuteDeploy = async () => {
    if (!deployingSnapshot) return;
    const targetRest = restaurants.find((r) => r.id === deployTargetRestId);
    if (!targetRest || !targetRest.ip) {
      showToast('Vui lòng chọn một Nhà Hàng Đích hợp lệ có địa chỉ IP', 'error');
      return;
    }
    setIsDeploying(true);
    try {
      const res = await mongoService.deployMenuSnapshot(deployingSnapshot.id, {
        target_host: targetRest.ip,
        target_port: 27017,
        target_sap: targetRest.sap || '',
        mode: deployMode,
        sync_co: deploySyncCo
      });
      showToast(res.message, 'success');
      setDeployingSnapshot(null);
    } catch (err: any) {
      showToast('Lỗi khi triển khai snapshot: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const openDirectSyncModal = () => {
    if (!activeHost) {
      showToast('Chưa kết nối máy chủ nhà hàng nguồn', 'error');
      return;
    }
    const otherRest = restaurants.find((r) => r.ip && r.ip !== activeHost);
    setDirectSyncTargetRestId(otherRest ? otherRest.id : null);
    setDirectSyncMode('merge_update');
    setDirectSyncMenuCodes(menus.map((m) => m.code));
    setDirectSyncSyncCo(true);
    setIsDirectSyncModalOpen(true);
  };

  const handleExecuteDirectSync = async () => {
    if (!activeHost) return;
    const targetRest = restaurants.find((r) => r.id === directSyncTargetRestId);
    if (!targetRest || !targetRest.ip) {
      showToast('Vui lòng chọn Nhà Hàng Đích có địa chỉ IP', 'error');
      return;
    }
    if (targetRest.ip === activeHost) {
      showToast('Nhà hàng đích trùng với nhà hàng nguồn hiện tại!', 'error');
      return;
    }
    if (directSyncMenuCodes.length === 0) {
      showToast('Vui lòng chọn ít nhất một Menu để đồng bộ', 'error');
      return;
    }

    setIsDirectSyncing(true);
    try {
      const res = await mongoService.directSyncMenu({
        source_host: activeHost,
        source_port: 27017,
        target_host: targetRest.ip,
        target_port: 27017,
        source_sap: selectedRestaurant?.sap || '',
        source_name: selectedRestaurant?.res || '',
        target_sap: targetRest.sap || '',
        target_name: targetRest.res || '',
        mode: directSyncMode,
        menu_codes: directSyncMenuCodes,
        sync_co: directSyncSyncCo
      });
      showToast(res.message, 'success');
      setIsDirectSyncModalOpen(false);
    } catch (err: any) {
      showToast('Lỗi khi đồng bộ trực tiếp: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsDirectSyncing(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER GIAO DIỆN CHÍNH
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 1. KHỐI ĐIỀU KHIỂN & BỘ CHỌN MENU */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Bar: Trạng thái & Chọn Máy Trạm Host */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
            {/* Machine Candidate Host Switching */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Badge variant="neutral">
                Host: <strong style={{ marginLeft: '4px' }}>{activeHost}:27017</strong>
              </Badge>
              {openCandidates && openCandidates.length > 1 && onSwitchMongoHost && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>Đổi máy:</span>
                  {openCandidates.map((c) => (
                    <button
                      key={c.ip}
                      type="button"
                      onClick={() => onSwitchMongoHost(c.ip)}
                      style={{
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: c.ip === activeHost ? '#2563EB' : '#D1D5DB',
                        backgroundColor: c.ip === activeHost ? '#EFF6FF' : '#FFFFFF',
                        color: c.ip === activeHost ? '#1D4ED8' : '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      {c.ip.split('.').pop()} {c.is_kds ? '(KDS)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>


          {/* Row 2: Bộ chọn Menu (Dropdown Multi-Select Checkboxes) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px', position: 'relative' }} ref={menuDropdownRef}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Chọn Menu:
              </label>

              {/* Dropdown Button */}
              <div
                onClick={() => setIsMenuDropdownOpen(!isMenuDropdownOpen)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  minHeight: '36px',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {searchAllMenus ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                      🌐 Đang chọn: TẤT CẢ MENU ({menus.length} menu)
                    </span>
                  ) : selectedMenuCodes.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>-- Chọn một hoặc nhiều Menu --</span>
                  ) : selectedMenuCodes.length === 1 ? (
                    (() => {
                      const m = menus.find((x) => x.code === selectedMenuCodes[0]);
                      return (
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>
                          {m ? `${m.name} - ${m.code}` : selectedMenuCodes[0]}
                        </span>
                      );
                    })()
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>
                      Đã chọn {selectedMenuCodes.length} / {menus.length} menu
                    </span>
                  )}
                </div>
                {isMenuDropdownOpen ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
              </div>

              {/* Dropdown Menu Popup with Checkboxes */}
              {isMenuDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    padding: '8px',
                    maxHeight: '320px',
                    overflowY: 'auto'
                  }}
                >
                  {/* Shortcut Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)', marginBottom: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMenuCodes(menus.map((m) => m.code));
                      }}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      ✓ Chọn tất cả ({menus.length})
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMenuCodes([]);
                      }}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      ✕ Bỏ chọn hết
                    </button>
                  </div>

                  {/* Menu Items List */}
                  {menus.map((m) => {
                    const isChecked = selectedMenuCodes.includes(m.code);
                    return (
                      <div
                        key={m.code}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isChecked) {
                            setSelectedMenuCodes(selectedMenuCodes.filter((c) => c !== m.code));
                          } else {
                            setSelectedMenuCodes([...selectedMenuCodes, m.code]);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#F0FDF4' : 'transparent',
                          transition: 'background-color 0.1s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent onClick
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: isChecked ? 700 : 500, color: isChecked ? '#065F46' : '#1F2937' }}>
                            {m.name} - {m.code}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '10px', color: '#6B7280', backgroundColor: '#E5E7EB', padding: '1px 5px', borderRadius: '4px' }}>
                            {m.dish_count} món ({m.group_count} nhóm)
                          </span>
                          {m.show_in_so && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '1px 4px', borderRadius: '3px' }}>
                              SO
                            </span>
                          )}
                          {m.show_in_co && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '1px 4px', borderRadius: '3px' }}>
                              CO
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Toggle Search All Menus */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: searchAllMenus ? '#DBEAFE' : '#FFFFFF',
                  color: searchAllMenus ? '#1D4ED8' : '#4B5563',
                  border: '1px solid',
                  borderColor: searchAllMenus ? '#3B82F6' : 'var(--border-color)'
                }}
              >
                <input
                  type="checkbox"
                  checked={searchAllMenus}
                  onChange={(e) => setSearchAllMenus(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Tìm trong TẤT CẢ Menu</span>
              </label>
            </div>

            {/* Reload Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchMenus();
                fetchDishItems();
              }}
              isLoading={loadingMenus || loadingDishes}
              disabled={loadingMenus || loadingDishes}
              leftIcon={<RefreshCw size={13} className={loadingMenus || loadingDishes ? 'animate-spin' : ''} />}
              style={{
                borderColor: '#2563EB',
                color: '#1D4ED8',
                fontWeight: 700,
                backgroundColor: '#EFF6FF',
                whiteSpace: 'nowrap',
              }}
              title="Làm mới lại danh sách menu và món ăn từ MongoDB sau khi app SO đồng bộ xong"
            >
              Làm Mới Dữ Liệu Thực Đơn
            </Button>
          </div>

          {/* Row 3: Thanh Tìm Kiếm, Bộ Lọc & Các Thao Tác Nghiệp Vụ Cân Đối Trên Cùng 1 Hàng */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
              width: '100%'
            }}
          >
            {/* Cụm Trái: Ô Tìm Kiếm Gọn Gàng & 2 Bộ Lọc */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Search Input Gọn Gàng */}
              <div style={{ position: 'relative', width: '270px', maxWidth: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onPaste={handlePasteSearch}
                  placeholder="Tìm món: Tên, mã RK7, SAP..."
                  title="Tìm 1 món hoặc dán danh sách hàng loạt nhiều mã RK7 / SAP / Tên món (hỗ trợ dán cột từ Excel, cách nhau bởi dấu phẩy, khoảng trắng)"
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: searchTokens.length > 1 ? '6px 70px 6px 30px' : searchQuery ? '6px 28px 6px 30px' : '6px 10px 6px 30px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: searchTokens.length > 1 ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                    outline: 'none',
                    backgroundColor: searchTokens.length > 1 ? '#F8FAFC' : '#FFFFFF',
                    fontWeight: searchTokens.length > 1 ? 600 : 400,
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                  }}
                />

                {/* Badge số lượng mã đang tìm hàng loạt */}
                {searchTokens.length > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      right: searchQuery ? '26px' : '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#DBEAFE',
                      color: '#1E40AF',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      pointerEvents: 'none'
                    }}
                  >
                    {searchTokens.length} mã
                  </span>
                )}

                {/* Nút X xóa nhanh tìm kiếm */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    title="Xóa tìm kiếm"
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#9CA3AF',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown Lọc Loại Menu (Level) */}
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 8px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '145px'
                }}
              >
                <option value="ALL">-- Tất cả loại món --</option>
                <option value="-1">Món ăn thường (Level -1)</option>
                <option value="0">Đồ uống (Level 0)</option>
              </select>

              {/* Dropdown Lọc Trạng Thái CO */}
              <select
                value={filterCoStatus}
                onChange={(e) => setFilterCoStatus(e.target.value)}
                style={{
                  height: '36px',
                  padding: '0 8px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer',
                  minWidth: '135px'
                }}
              >
                <option value="ALL">-- Trạng thái CO --</option>
                <option value="HAS_CO">✓ Đã có trên CO</option>
                <option value="NO_CO">Chưa có trên CO</option>
              </select>
            </div>

            {/* Cụm Phải: 4 Nút Thao Tác Nghiệp Vụ Thực Đơn (Giao diện tinh gọn, không icon) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={openConflictModal}
                style={{ borderColor: '#F59E0B', color: '#B45309', backgroundColor: '#FFFBEB', height: '36px', fontSize: '12px' }}
              >
                Check Lỗi Xung Đột
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={openBulkAddModal}
                style={{ backgroundColor: '#059669', borderColor: '#047857', height: '36px', fontSize: '12px' }}
              >
                + Thêm Món Hàng Loạt (Sheets)
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={openSnapshotModal}
                style={{ borderColor: '#8B5CF6', color: '#6D28D9', backgroundColor: '#F5F3FF', fontWeight: 600, height: '36px', fontSize: '12px' }}
                title="Quản lý và lưu trữ Snapshot thực đơn vào Không Gian Trung Gian máy chủ"
              >
                Không Gian Trung Gian
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={openDirectSyncModal}
                style={{ borderColor: '#3B82F6', color: '#1D4ED8', backgroundColor: '#EFF6FF', fontWeight: 600, height: '36px', fontSize: '12px' }}
                title="Đồng bộ toàn bộ thực đơn trực tiếp sang Nhà Hàng khác"
              >
                Đồng Bộ Sang NH Khác
              </Button>
            </div>
          </div>

          {/* Row 4: Floating Toolbar khi có chọn món (Checkbox) */}
          {selectedDishKeys.size > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                backgroundColor: '#EFF6FF',
                borderRadius: '6px',
                border: '1px solid #BFDBFE',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF' }}>
                  Đã chọn {selectedDishKeys.size} món:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDishKeys(new Set())}
                  style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Bỏ chọn
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleActivateCoBulk}
                  isLoading={activatingCo}
                  disabled={activatingCo}
                  leftIcon={<Zap size={13} color="#D97706" />}
                  style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B', color: '#B45309' }}
                >
                  Kích Hoạt ({selectedDishKeys.size}) Qua CO
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeactivateCoBulk}
                  isLoading={deactivatingCo}
                  disabled={deactivatingCo}
                  leftIcon={<X size={13} color="#DC2626" />}
                  style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626' }}
                >
                  Tắt CO ({selectedDishKeys.size})
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={openMoveCloneModal}
                  leftIcon={<ArrowRightLeft size={13} />}
                  style={{ borderColor: '#3B82F6', color: '#1D4ED8' }}
                >
                  Chuyển / Nhân Bản ({selectedDishKeys.size})
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={openDeleteModal}
                  leftIcon={<Trash2 size={13} />}
                >
                  Xóa ({selectedDishKeys.size}) Món
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 2. BẢNG DANH SÁCH MÓN ĂN (GOM NHÓM MENU & NHÓM MÓN / BẢNG PHẲNG) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header Card: Tiêu đề + Thống kê + Nút chuyển chế độ xem */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Danh Sách Món Ăn ({filteredDishes.length} / {dishItems.length} món)
              </span>
              {searchAllMenus && (
                <Badge variant="primary">🌐 Chế độ tìm kiếm tất cả Menu</Badge>
              )}
              <Badge variant="neutral">
                {groupedMenuHierarchy.length} Menu &bull; {groupedMenuHierarchy.reduce((acc, m) => acc + m.groups.length, 0)} Nhóm Món
              </Badge>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {viewMode === 'grouped' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAllGroupsAndMenus}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    📂 Mở Rộng Hết
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAllMenus}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    📁 Thu Gọn Hết
                  </Button>
                </>
              )}

              <Button
                variant={viewMode === 'grouped' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode(viewMode === 'grouped' ? 'flat' : 'grouped')}
                leftIcon={<Layers size={13} />}
                style={{ fontSize: '11px', fontWeight: 700 }}
              >
                {viewMode === 'grouped' ? '🗂️ Đang Gom Nhóm (Bấm để xem Bảng Phẳng)' : '📄 Bảng Phẳng (Bấm để Gom Nhóm Menu)'}
              </Button>
            </div>
          </div>

          {/* BẢN ĐỒ PHÂN BỐ TÌM KIẾM (SEARCH DISTRIBUTION MAP) KHI CÓ TỪ KHÓA TÌM KIẾM */}
          {searchQuery.trim() && filteredDishes.length > 0 && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                  🎯 {searchTokens.length > 1
                    ? `Tìm thấy ${filteredDishes.length} món cho ${bulkSearchSummary?.foundCount || 0}/${searchTokens.length} mã/từ khóa hàng loạt:`
                    : `Từ khóa "${searchQuery}" xuất hiện trong`}{' '}
                  {groupedMenuHierarchy.length} Menu & {groupedMenuHierarchy.reduce((acc, m) => acc + m.groups.length, 0)} Nhóm Món:
                </span>
                <span style={{ fontSize: '11px', color: '#15803D', fontWeight: 600 }}>
                  Tổng cộng {filteredDishes.length} món phù hợp
                </span>
              </div>

              {/* Danh sách chip các Nhóm & Menu chứa món tìm kiếm */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {groupedMenuHierarchy.map((m) =>
                  m.groups.map((g) => (
                    <div
                      key={`breadcrumb_${m.menu_code}_${g.group_code}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #86EFAC',
                        fontSize: '11px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#1E40AF' }}>📋 {m.menu_name}</span>
                      <span style={{ color: '#9CA3AF' }}>▸</span>
                      <span style={{ fontWeight: 600, color: '#047857' }}>📂 {g.group_name}</span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        padding: '1px 5px',
                        borderRadius: '10px'
                      }}>
                        {g.dishes.length} món
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Thông báo nếu có mã chưa tìm thấy trong menu hiện tại */}
              {bulkSearchSummary && bulkSearchSummary.notFound.length > 0 && (
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    fontSize: '11.5px',
                    color: '#991B1B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <span>
                    ⚠️ Chưa thấy trong menu này ({bulkSearchSummary.notFound.length}/{bulkSearchSummary.total} mã):{' '}
                    <strong>{bulkSearchSummary.notFound.join(', ')}</strong>
                  </span>
                  {!searchAllMenus && (
                    <button
                      type="button"
                      onClick={() => setSearchAllMenus(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      🌐 Bấm để tìm trong TẤT CẢ Menu
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dòng ghi chú nhỏ */}
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            Tip: Click vào mã RK7 hoặc SAP để copy 1 chạm. Bấm bút chì để sửa chi tiết món. Có thể tích checkbox chọn toàn bộ Nhóm hoặc toàn bộ Menu để thao tác hàng loạt.
          </div>

          {/* NỘI DUNG CHÍNH: LOADING HOẶC RỖNG HOẶC GOM NHÓM HOẶC BẢNG PHẲNG */}
          {loadingDishes ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              <div>Đang tải chi tiết món ăn từ MongoDB nhà hàng...</div>
            </div>
          ) : filteredDishes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              <div>Không có món ăn nào phù hợp với bộ lọc và tìm kiếm hiện tại.</div>
              {searchQuery.trim() && !searchAllMenus && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setSearchAllMenus(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    🌐 Bấm vào đây để quét trong TẤT CẢ Menu của nhà hàng
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'grouped' ? (
            /* ───────────────────────────────────────────────────────────── */
            /* CHẾ ĐỘ 1: GOM NHÓM MENU & NHÓM MÓN (HIERARCHY VIEW)           */
            /* ───────────────────────────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {groupedMenuHierarchy.map((m) => {
                const isMenuCollapsed = collapsedMenuCodes.has(m.menu_code);
                const isMenuSelected = isMenuAllSelected(m);

                return (
                  <div
                    key={`menu_section_${m.menu_code}`}
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* MENU HEADER */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#F1F5F9',
                        borderBottom: isMenuCollapsed ? 'none' : '1px solid #CBD5E1',
                        borderLeft: '5px solid #2563EB',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => toggleCollapseMenu(m.menu_code)}
                          title={isMenuCollapsed ? 'Mở rộng Menu' : 'Thu gọn Menu'}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#1E293B'
                          }}
                        >
                          {isMenuCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>

                        <input
                          type="checkbox"
                          checked={isMenuSelected}
                          onChange={() => toggleSelectMenu(m)}
                          title="Chọn tất cả món trong toàn bộ Menu này"
                          style={{ cursor: 'pointer' }}
                        />

                        <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                          📋 Menu: {m.menu_name}
                        </span>

                        <span style={{ fontSize: '11px', color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontFamily: 'Consolas, monospace', fontWeight: 600 }}>
                          Mã: {m.menu_code}
                        </span>

                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '2px 8px', borderRadius: '10px', border: '1px solid #C7D2FE' }}>
                          {m.groups.length} nhóm món
                        </span>

                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 8px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                          {m.total_dishes} món phù hợp
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCollapseMenu(m.menu_code)}
                        style={{
                          fontSize: '11px',
                          color: '#2563EB',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {isMenuCollapsed ? 'Mở rộng Menu ▼' : 'Thu gọn Menu ▲'}
                      </button>
                    </div>

                    {/* MENU BODY (DANH SÁCH CÁC NHÓM MÓN TRONG MENU) */}
                    {!isMenuCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {m.groups.map((g, gIdx) => {
                          const groupKey = `${m.menu_code}___${g.group_code}`;
                          const isGroupExpanded = expandedGroupKeys.has(groupKey);
                          const isGroupSelected = isGroupAllSelected(g);

                          return (
                            <div
                              key={`group_block_${groupKey}`}
                              style={{
                                borderTop: gIdx > 0 ? '1px solid #E2E8F0' : 'none'
                              }}
                            >
                              {/* GROUP HEADER BAR */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px 8px 16px',
                                  backgroundColor: isGroupExpanded ? '#F1F5F9' : '#F8FAFC',
                                  borderBottom: isGroupExpanded ? '1px solid #E2E8F0' : 'none',
                                  borderLeft: '4px solid #6366F1',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => toggleGroupExpand(groupKey)}
                                    title={isGroupExpanded ? 'Thu gọn Nhóm' : 'Mở rộng Nhóm'}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '2px 4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      color: isGroupExpanded ? '#4F46E5' : '#64748B'
                                    }}
                                  >
                                    {isGroupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>

                                  <input
                                    type="checkbox"
                                    checked={isGroupSelected}
                                    onChange={() => toggleSelectGroup(g)}
                                    title="Chọn tất cả món trong nhóm này"
                                    style={{ cursor: 'pointer' }}
                                  />

                                  <span
                                    onClick={() => toggleGroupExpand(groupKey)}
                                    title="Bấm để mở rộng / thu gọn nhóm món"
                                    style={{ fontWeight: 700, color: '#1E293B', fontSize: '12px', cursor: 'pointer' }}
                                  >
                                    📂 {g.group_name}
                                  </span>

                                  <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'Consolas, monospace' }}>
                                    ({g.group_code})
                                  </span>

                                  {g.level === 0 ? (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '1px 6px', borderRadius: '4px' }}>
                                      Đồ uống (0)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '1px 6px', borderRadius: '4px' }}>
                                      Món ăn (-1)
                                    </span>
                                  )}

                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 8px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                                    {g.dishes.length} món
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleGroupExpand(groupKey)}
                                  style={{
                                    fontSize: '11px',
                                    color: isGroupExpanded ? '#2563EB' : '#64748B',
                                    fontWeight: isGroupExpanded ? 600 : 400,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                >
                                  {isGroupExpanded ? 'Thu gọn nhóm ▲' : 'Mở rộng nhóm ▼'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openAddDishToGroupModal(m.menu_code, g.group_code, g.group_name, g.level, g.dishes.length)}
                                  title={`Thêm thẳng món mới vào nhóm "${g.group_name}"`}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#065F46',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Plus size={11} />
                                  + Thêm Món Vào Nhóm
                                </button>
                              </div>

                              {/* GROUP DISHES TABLE */}
                              {isGroupExpanded && (
                                <TopScrollTable>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#4B5563', position: 'sticky', top: 0, zIndex: 5 }}>
                                        <th style={{ padding: '7px 10px', width: '36px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                                          <input
                                            type="checkbox"
                                            checked={isGroupSelected}
                                            onChange={() => toggleSelectGroup(g)}
                                            style={{ cursor: 'pointer' }}
                                          />
                                        </th>
                                        <th style={{ padding: '7px 10px', width: '45px' }}>STT</th>
                                        <th style={{ padding: '7px 10px', width: '90px' }}>Loại</th>
                                        <th style={{ padding: '7px 10px', width: '90px' }}>Mã RK7</th>
                                        <th style={{ padding: '7px 10px', minWidth: '180px' }}>Tên Món</th>
                                        <th style={{ padding: '7px 10px', width: '100px' }}>Mã SAP</th>
                                        <th style={{ padding: '7px 10px', width: '60px', textAlign: 'center' }}>Thứ Tự</th>
                                        <th style={{ padding: '7px 10px', width: '90px', textAlign: 'right' }}>Giá (VNĐ)</th>
                                        <th style={{ padding: '7px 10px', width: '80px', textAlign: 'center' }}>Hình Ảnh</th>
                                        <th style={{ padding: '7px 10px', width: '70px', textAlign: 'center' }}>SO</th>
                                        <th style={{ padding: '7px 10px', width: '120px', textAlign: 'center' }}>CO</th>
                                        <th style={{ padding: '7px 10px', width: '110px', textAlign: 'center' }}>Thao Tác</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {g.dishes.map((it, dIdx) => {
                                        const dishKey = getDishKey(it);
                                        const isChecked = selectedDishKeys.has(dishKey);

                                        return (
                                          <tr
                                            key={dishKey}
                                            style={{
                                              borderBottom: '1px solid var(--border-color)',
                                              backgroundColor: isChecked ? '#EFF6FF' : dIdx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                              transition: 'background-color 0.1s ease'
                                            }}
                                          >
                                            {/* Checkbox */}
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelectDish(dishKey)}
                                                style={{ cursor: 'pointer' }}
                                              />
                                            </td>

                                            {/* STT */}
                                            <td style={{ padding: '7px 10px', color: '#6B7280', fontSize: '11px' }}>
                                              {dIdx + 1}
                                            </td>

                                            {/* Loại (Level) */}
                                            <td style={{ padding: '7px 10px' }}>
                                              {it.level === 0 ? (
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '2px 6px', borderRadius: '4px' }}>
                                                  Đồ uống (0)
                                                </span>
                                              ) : (
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>
                                                  Món ăn (-1)
                                                </span>
                                              )}
                                            </td>

                                            {/* Mã RK7 */}
                                            <td style={{ padding: '7px 10px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ fontWeight: 700, color: '#111827', fontFamily: 'Consolas, monospace' }}>
                                                  {it.rk7_code}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => copyToClipboard(it.rk7_code, `rk7_${dishKey}`)}
                                                  title="Sao chép mã RK7"
                                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: copiedKey === `rk7_${dishKey}` ? '#059669' : '#9CA3AF' }}
                                                >
                                                  {copiedKey === `rk7_${dishKey}` ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                              </div>
                                            </td>

                                            {/* Tên Món */}
                                            <td style={{ padding: '7px 10px' }}>
                                              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
                                                {it.name}
                                              </span>
                                            </td>

                                            {/* Mã SAP */}
                                            <td style={{ padding: '7px 10px' }}>
                                              {it.sap_code ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                  <span style={{ color: '#4B5563', fontFamily: 'Consolas, monospace', fontSize: '11px' }}>
                                                    {it.sap_code}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => copyToClipboard(it.sap_code, `sap_${dishKey}`)}
                                                    title="Sao chép mã SAP"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: copiedKey === `sap_${dishKey}` ? '#059669' : '#9CA3AF' }}
                                                  >
                                                    {copiedKey === `sap_${dishKey}` ? <Check size={11} /> : <Copy size={11} />}
                                                  </button>
                                                </div>
                                              ) : (
                                                <span style={{ color: '#9CA3AF' }}>—</span>
                                              )}
                                            </td>

                                            {/* Thứ tự */}
                                            <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                                              {it.sort_order}
                                            </td>

                                            {/* Giá */}
                                            <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                                              {it.price > 0 ? `${it.price.toLocaleString('vi-VN')} đ` : '0 đ'}
                                            </td>

                                            {/* Link Hình Ảnh */}
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                              {it.image_url ? (
                                                <span
                                                  title={it.image_url}
                                                  onClick={() => copyToClipboard(it.image_url, `img_${dishKey}`)}
                                                  style={{
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    color: '#2563EB',
                                                    backgroundColor: '#EFF6FF',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    textDecoration: 'underline'
                                                  }}
                                                >
                                                  Ảnh ...
                                                </span>
                                              ) : (
                                                <span style={{ color: '#9CA3AF', fontSize: '11px' }}>—</span>
                                              )}
                                            </td>

                                            {/* Cột SO */}
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>
                                                ✓ Có SO
                                              </span>
                                            </td>

                                            {/* Cột CO */}
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                              {it.is_co ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 5px', borderRadius: '4px' }}>
                                                    ✓ Có CO
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleDeactivateCoSingle(it)}
                                                    disabled={deactivatingCo}
                                                    title="Tắt kích hoạt món này khỏi CO (ẩn khỏi menu online CO)"
                                                    style={{
                                                      fontSize: '10px',
                                                      fontWeight: 600,
                                                      color: '#DC2626',
                                                      backgroundColor: '#FEF2F2',
                                                      border: '1px solid #FECACA',
                                                      padding: '2px 5px',
                                                      borderRadius: '4px',
                                                      cursor: 'pointer',
                                                      display: 'inline-flex',
                                                      alignItems: 'center',
                                                      gap: '2px'
                                                    }}
                                                  >
                                                    <X size={10} color="#DC2626" />
                                                    Tắt CO
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => handleActivateCoSingle(it)}
                                                  disabled={activatingCo}
                                                  title="Bấm để kích hoạt món này sang phần mềm CO với Kalo=100"
                                                  style={{
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    color: '#B45309',
                                                    backgroundColor: '#FEF3C7',
                                                    border: '1px solid #F59E0B',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                  }}
                                                >
                                                  <Zap size={10} color="#D97706" />
                                                  ⚡ Kích hoạt CO
                                                </button>
                                              )}
                                            </td>

                                            {/* Thao Tác (Sửa / Chuyển / Xóa) */}
                                            <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <button
                                                  type="button"
                                                  onClick={() => openEditModal(it)}
                                                  title="Chỉnh sửa thông tin món"
                                                  style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}
                                                >
                                                  <Edit2 size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDishKeys(new Set([dishKey]));
                                                    openMoveCloneModal();
                                                  }}
                                                  title="Chuyển / Nhân bản món"
                                                  style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}
                                                >
                                                  <ArrowRightLeft size={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setSelectedDishKeys(new Set([dishKey]));
                                                    openDeleteModal();
                                                  }}
                                                  title="Xóa món này"
                                                  style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </TopScrollTable>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────── */
            /* CHẾ ĐỘ 2: BẢNG DANH SÁCH PHẲNG (FLAT TABLE VIEW)              */
            /* ───────────────────────────────────────────────────────────── */
            <TopScrollTable>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#4B5563', position: 'sticky', top: 0, zIndex: 5 }}>
                    <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '8px 10px', width: '50px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>STT</th>
                    {searchAllMenus && (
                      <th style={{ padding: '8px 10px', minWidth: '150px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Menu (Tên - Mã)</th>
                    )}
                    <th style={{ padding: '8px 10px', minWidth: '130px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Nhóm Món</th>
                    <th style={{ padding: '8px 10px', width: '90px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Loại</th>
                    <th style={{ padding: '8px 10px', width: '90px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Mã RK7</th>
                    <th style={{ padding: '8px 10px', minWidth: '180px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Tên Món</th>
                    <th style={{ padding: '8px 10px', width: '100px', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Mã SAP</th>
                    <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Thứ Tự</th>
                    <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Giá (VNĐ)</th>
                    <th style={{ padding: '8px 10px', width: '80px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Hình Ảnh</th>
                    <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>SO</th>
                    <th style={{ padding: '8px 10px', width: '130px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>CO</th>
                    <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center', position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((it, idx) => {
                    const dishKey = getDishKey(it);
                    const isChecked = selectedDishKeys.has(dishKey);

                    return (
                      <tr
                        key={dishKey}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: isChecked ? '#EFF6FF' : idx % 2 === 0 ? '#FFFFFF' : '#FBFBFB',
                          transition: 'background-color 0.1s ease'
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectDish(dishKey)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>

                        {/* STT */}
                        <td style={{ padding: '8px 10px', color: '#6B7280', fontSize: '11px' }}>
                          {idx + 1}
                        </td>

                        {/* Menu Column (Khi chọn Search All) */}
                        {searchAllMenus && (
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '2px 6px', borderRadius: '4px' }}>
                              {it.menu_name}
                            </span>
                          </td>
                        )}

                        {/* Nhóm Món */}
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#1F2937' }}>{it.group_name}</span>
                            <span style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'Consolas, monospace' }}>
                              {it.group_code}
                            </span>
                          </div>
                        </td>

                        {/* Loại (Level) */}
                        <td style={{ padding: '8px 10px' }}>
                          {it.level === 0 ? (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#7E22CE', backgroundColor: '#F3E8FF', padding: '2px 6px', borderRadius: '4px' }}>
                              Đồ uống (0)
                            </span>
                          ) : (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>
                              Món ăn (-1)
                            </span>
                          )}
                        </td>

                        {/* Mã RK7 */}
                        <td style={{ padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#111827', fontFamily: 'Consolas, monospace' }}>
                              {it.rk7_code}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(it.rk7_code, `rk7_${dishKey}`)}
                              title="Sao chép mã RK7"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: copiedKey === `rk7_${dishKey}` ? '#059669' : '#9CA3AF' }}
                            >
                              {copiedKey === `rk7_${dishKey}` ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>

                        {/* Tên Món */}
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
                            {it.name}
                          </span>
                        </td>

                        {/* Mã SAP */}
                        <td style={{ padding: '8px 10px' }}>
                          {it.sap_code ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#4B5563', fontFamily: 'Consolas, monospace', fontSize: '11px' }}>
                                {it.sap_code}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(it.sap_code, `sap_${dishKey}`)}
                                title="Sao chép mã SAP"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: copiedKey === `sap_${dishKey}` ? '#059669' : '#9CA3AF' }}
                              >
                                {copiedKey === `sap_${dishKey}` ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>

                        {/* Thứ tự */}
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                          {it.sort_order}
                        </td>

                        {/* Giá */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#047857' }}>
                          {it.price > 0 ? `${it.price.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>

                        {/* Link Hình Ảnh */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {it.image_url ? (
                            <span
                              title={it.image_url}
                              onClick={() => copyToClipboard(it.image_url, `img_${dishKey}`)}
                              style={{
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: '#2563EB',
                                backgroundColor: '#EFF6FF',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textDecoration: 'underline'
                              }}
                            >
                              Ảnh ...
                            </span>
                          ) : (
                            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>—</span>
                          )}
                        </td>

                        {/* Cột SO */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', backgroundColor: '#D1FAE5', padding: '2px 6px', borderRadius: '4px' }}>
                            ✓ Có SO
                          </span>
                        </td>

                        {/* Cột CO */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          {it.is_co ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#1D4ED8', backgroundColor: '#DBEAFE', padding: '2px 6px', borderRadius: '4px' }}>
                                ✓ Có CO (100)
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeactivateCoSingle(it)}
                                disabled={deactivatingCo}
                                title="Tắt kích hoạt: Gỡ món này khỏi phần mềm CO"
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: '#DC2626',
                                  backgroundColor: '#FEE2E2',
                                  border: '1px solid #FCA5A5',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Tắt CO
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleActivateCoSingle(it)}
                              disabled={activatingCo}
                              title="Bấm để kích hoạt món này sang phần mềm CO với Kalo=100"
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#B45309',
                                backgroundColor: '#FEF3C7',
                                border: '1px solid #F59E0B',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <Zap size={10} color="#D97706" />
                              ⚡ Kích hoạt CO
                            </button>
                          )}
                        </td>

                        {/* Thao Tác (Sửa / Chuyển / Xóa) */}
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => openEditModal(it)}
                              title="Chỉnh sửa thông tin món"
                              style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDishKeys(new Set([dishKey]));
                                openMoveCloneModal();
                              }}
                              title="Chuyển / Nhân bản món"
                              style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#059669' }}
                            >
                              <ArrowRightLeft size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDishKeys(new Set([dishKey]));
                                openDeleteModal();
                              }}
                              title="Xóa món này"
                              style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TopScrollTable>
          )}
        </div>
      </Card>

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 3. MODAL: SỬA CHI TIẾT MÓN ĂN */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {editingDish && (
        <Modal
          isOpen={true}
          onClose={() => setEditingDish(null)}
          title={`Chỉnh Sửa Món Ăn: ${editingDish.name}`}
          maxWidth="650px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Mã RK7 (*)
                </label>
                <input
                  type="text"
                  value={editRk7}
                  onChange={(e) => setEditRk7(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Mã SAP
                </label>
                <input
                  type="text"
                  value={editSap}
                  onChange={(e) => setEditSap(e.target.value)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Tên Món Ăn (*)
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Giá Bán (VNĐ)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Thứ Tự Sắp Xếp (STT)
                </label>
                <input
                  type="number"
                  value={editSort}
                  onChange={(e) => setEditSort(parseInt(e.target.value, 10) || 0)}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Loại Menu (Level)
                </label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(parseInt(e.target.value, 10))}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', backgroundColor: '#FFFFFF' }}
                >
                  <option value={-1}>Menu món ăn thường (-1)</option>
                  <option value={0}>Menu đồ uống (0)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Link Hình Ảnh
                </label>
                <input
                  type="text"
                  value={editImg}
                  onChange={(e) => setEditImg(e.target.value)}
                  placeholder="/menu/ten-anh.jpg"
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setEditingDish(null)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={savingEdit}
                disabled={savingEdit}
              >
                Lưu Thay Đổi
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 4. MODAL: THÊM MÓN HÀNG LOẠT (GOOGLE SHEETS STYLE) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isBulkAddOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsBulkAddOpen(false)}
          title="Thêm Món Ăn Hàng Loạt Vào Menu (Dạng Bảng Tính Sheets)"
          maxWidth="1100px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '78vh', overflowY: 'auto' }}>
            {/* Hướng dẫn copy paste */}
            <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '12px', color: '#1E40AF' }}>
              <strong>📋 Hướng dẫn nhập liệu nhanh:</strong> Chỉ cần copy 3 cột từ Excel / Google Sheets và dán (Ctrl+V) vào ô bên dưới:
              <br />
              <code style={{ fontWeight: 700, fontSize: '12.5px' }}>Mã RK7 [Tab] Tên Món [Tab] Mã SAP</code>
              <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#1D4ED8' }}>
                💡 <em>Hệ thống tự động nhận diện Level theo Nhóm món đã chọn ở Bước 2 (Nhóm đồ uống / nước = <strong>Level 0</strong>, Nhóm món ăn = <strong>Level -1</strong> mặc định).</em>
              </div>
            </div>

            {/* 1. Chọn Menu Áp Dụng & Nhóm Món Tương Ứng (Dạng Danh Sách Dọc) */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  1. Chọn Menu Áp Dụng & Nhóm Món Tương Ứng (Đã chọn {bulkAddTargetMenus.length} / {menus.length} Menu):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkAddTargetMenus(menus.map(m => m.code));
                      const newMap: Record<string, any> = {};
                      menus.forEach(m => {
                        const gList = (groupsByMenuCode[m.code] && groupsByMenuCode[m.code].length > 0)
                          ? groupsByMenuCode[m.code]
                          : (m.groups || []);
                        const first = gList[0];
                        newMap[m.code] = first
                          ? { group_mode: 'existing', group_code: first.code, group_name: first.name, level: first.level ?? -1 }
                          : { group_mode: 'new', group_name: 'Nhóm Món Mới', level: -1 };
                      });
                      setBulkAddMenuGroupMap(newMap);
                    }}
                    style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Chọn tất cả Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkAddTargetMenus([]);
                      setBulkAddMenuGroupMap({});
                    }}
                    style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              {/* Danh Sách Dọc Các Menu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: '#F8FAFC' }}>
                {menus.map((m) => {
                  const isChecked = bulkAddTargetMenus.includes(m.code);
                  const groupsInMenu = (groupsByMenuCode[m.code] && groupsByMenuCode[m.code].length > 0)
                    ? groupsByMenuCode[m.code]
                    : (m.groups || []);
                  const currentConfig = bulkAddMenuGroupMap[m.code] || {
                    group_mode: 'existing',
                    group_code: groupsInMenu[0]?.code || '',
                    group_name: groupsInMenu[0]?.name || '',
                    level: groupsInMenu[0]?.level ?? -1
                  };

                  return (
                    <div
                      key={m.code}
                      style={{
                        borderRadius: '6px',
                        border: isChecked ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                        backgroundColor: isChecked ? '#EFF6FF' : '#FFFFFF',
                        padding: '8px 12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Dòng Menu Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleMenuInBulkAdd(m.code)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          <span style={{ fontWeight: 700, fontSize: '12.5px', color: isChecked ? '#1D4ED8' : '#1E293B' }}>
                            📋 {m.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'Consolas, monospace' }}>
                            ({m.code})
                          </span>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#0369A1', backgroundColor: '#E0F2FE', padding: '1px 6px', borderRadius: '4px' }}>
                            {groupsInMenu.length} nhóm có sẵn
                          </span>
                        </label>

                        {isChecked && currentConfig.group_mode === 'existing' && currentConfig.group_name && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: currentConfig.level === 0 ? '#7E22CE' : '#047857' }}>
                            Sẽ thêm vào: 📂 <strong>{currentConfig.group_name}</strong> ({currentConfig.level === 0 ? '🥤 Level 0' : '🍛 Level -1'})
                          </span>
                        )}
                      </div>

                      {/* Khi Menu được check: Sổ ngay bộ chọn nhóm món của Menu này */}
                      {isChecked && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #BFDBFE', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11.5px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: currentConfig.group_mode === 'existing' ? '#1D4ED8' : '#4B5563' }}>
                              <input
                                type="radio"
                                name={`group_mode_${m.code}`}
                                checked={currentConfig.group_mode === 'existing'}
                                onChange={() => handleChangeMenuGroupMode(m.code, 'existing')}
                              />
                              Chọn nhóm có sẵn trong menu này ({groupsInMenu.length})
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, color: currentConfig.group_mode === 'new' ? '#1D4ED8' : '#4B5563' }}>
                              <input
                                type="radio"
                                name={`group_mode_${m.code}`}
                                checked={currentConfig.group_mode === 'new'}
                                onChange={() => handleChangeMenuGroupMode(m.code, 'new')}
                              />
                              + Tạo nhóm mới cho menu này
                            </label>
                          </div>

                          {currentConfig.group_mode === 'existing' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <select
                                value={currentConfig.group_code || ''}
                                onChange={(e) => handleSelectExistingGroupForMenu(m.code, e.target.value)}
                                style={{
                                  flex: '1 1 320px',
                                  padding: '5px 8px',
                                  fontSize: '11.5px',
                                  borderRadius: '5px',
                                  border: '1px solid #93C5FD',
                                  backgroundColor: '#FFFFFF',
                                  outline: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  color: '#1E293B'
                                }}
                              >
                                {groupsInMenu.length === 0 ? (
                                  <option value="">-- Menu này chưa có nhóm nào (hãy chọn Tạo nhóm mới) --</option>
                                ) : (
                                  groupsInMenu.map((g) => (
                                    <option key={g.code} value={g.code}>
                                      📂 {g.name} (Mã: {g.code}) &bull; {g.level === 0 ? '🥤 Đồ uống (Level 0)' : '🍛 Món ăn (Level -1)'} [{g.count} món]
                                    </option>
                                  ))
                                )}
                              </select>

                              {bulkAddTargetMenus.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleApplyGroupToAllCheckedMenus(m.code, currentConfig)}
                                  title="Tìm và gán nhóm có cùng tên/loại sang tất cả các Menu đang được chọn khác"
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    color: '#2563EB',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #93C5FD',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ⚡ Gán nhóm này cho các Menu khác
                                </button>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                              <input
                                type="text"
                                value={currentConfig.group_name || ''}
                                onChange={(e) => handleUpdateNewGroupNameForMenu(m.code, e.target.value)}
                                placeholder="Nhập tên nhóm mới (VD: Món Mới Khai Trương, Tráng Miệng...)"
                                style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '5px', border: '1px solid #CBD5E1', outline: 'none' }}
                              />
                              <select
                                value={currentConfig.level ?? -1}
                                onChange={(e) => handleUpdateNewGroupLevelForMenu(m.code, parseInt(e.target.value, 10))}
                                style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '5px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', outline: 'none' }}
                              >
                                <option value={-1}>Món ăn (Level -1)</option>
                                <option value={0}>Đồ uống (Level 0)</option>
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ô Paste Dữ Liệu Kiểu Google Sheets */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  3. Dán (Paste) dữ liệu từ Excel / Google Sheets vào đây:
                </label>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                  Đã nhận diện: {bulkAddRows.length} món
                </span>
              </div>
              <textarea
                value={bulkAddPasteText}
                onChange={(e) => handleParsePasteText(e.target.value)}
                placeholder="Ví dụ dán 3 cột từ Excel:&#10;33162	Combo gà cơm onigiri	65003506&#10;33166	Cơm cà ri trứng	65003651"
                rows={5}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '11px',
                  fontFamily: 'Consolas, monospace',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  outline: 'none',
                  backgroundColor: '#F9FAFB'
                }}
              />
            </div>

            {/* Preview Bảng Danh Sách Món Sẽ Thêm */}
            {bulkAddRows.length > 0 && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Xem trước dữ liệu sẽ thêm ({bulkAddRows.length} món):
                </span>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '4px 8px', width: '30px' }}>#</th>
                        <th style={{ padding: '4px 8px', width: '70px' }}>Mã RK7</th>
                        <th style={{ padding: '4px 8px' }}>Tên Món</th>
                        <th style={{ padding: '4px 8px', width: '80px' }}>Mã SAP</th>
                        <th style={{ padding: '4px 8px', width: '50px' }}>STT</th>
                        <th style={{ padding: '4px 8px', width: '70px' }}>Giá</th>
                        <th style={{ padding: '4px 8px', width: '60px' }}>Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkAddRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td style={{ padding: '4px 8px', color: '#6B7280' }}>{i + 1}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 700, fontFamily: 'Consolas, monospace' }}>{r.rk7_code}</td>
                          <td style={{ padding: '4px 8px', fontWeight: 600 }}>{r.name}</td>
                          <td style={{ padding: '4px 8px', color: '#4B5563' }}>{r.sap_code || '—'}</td>
                          <td style={{ padding: '4px 8px' }}>{r.sort_order}</td>
                          <td style={{ padding: '4px 8px' }}>{r.price?.toLocaleString('vi-VN')} đ</td>
                          <td style={{ padding: '4px 8px' }}>{r.level === 0 ? 'Nước (0)' : 'Ăn (-1)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button variant="outline" size="sm" onClick={() => setIsBulkAddOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveBulkAdd}
                isLoading={savingBulkAdd}
                disabled={savingBulkAdd || bulkAddRows.length === 0}
                style={{ backgroundColor: '#059669', borderColor: '#047857' }}
              >
                Xác Nhận Thêm ({bulkAddRows.length}) Món Vào {bulkAddTargetMenus.length} Menu
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: CHUYỂN / NHÂN BẢN MÓN */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isMoveCloneOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsMoveCloneOpen(false)}
          title={`Chuyển / Nhân Bản (${selectedDishesList.length}) Món Ăn`}
          maxWidth="650px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="moveCloneAct"
                  checked={moveCloneAction === 'clone'}
                  onChange={() => setMoveCloneAction('clone')}
                />
                <span>📋 Nhân bản (Giữ nguyên ở nhóm cũ, chèn thêm vào nhóm mới)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="moveCloneAct"
                  checked={moveCloneAction === 'move'}
                  onChange={() => setMoveCloneAction('move')}
                />
                <span>⇄ Chuyển nhóm (Xóa khỏi nhóm cũ, chuyển sang nhóm mới)</span>
              </label>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Chọn Menu Đích:
              </label>
              <select
                value={moveTargetMenu}
                onChange={(e) => setMoveTargetMenu(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', outline: 'none' }}
              >
                {menus.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} - {m.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Chọn Nhóm Món Đích:
              </label>
              <select
                value={moveTargetGroup}
                onChange={(e) => setMoveTargetGroup(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', outline: 'none' }}
              >
                {existingGroupsInMenus.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.name} (Mã: {g.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setIsMoveCloneOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteMoveClone}
                isLoading={processingMoveClone}
                disabled={processingMoveClone}
              >
                Xác Nhận Thực Hiện
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: XÓA MÓN ĂN (2 BƯỚC XÁC NHẬN AN TOÀN) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDeleteModalOpen(false)}
          title={`Xác Nhận Xóa (${selectedDishesList.length}) Món Ăn (Bước ${deleteStep}/2)`}
          maxWidth="600px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {deleteStep === 1 ? (
              <>
                <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '12px' }}>
                  <strong>Cảnh báo an toàn:</strong> Bạn đang chuẩn bị xóa <strong>{selectedDishesList.length}</strong> món ăn đã chọn.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                    Phạm vi xóa:
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="delScope"
                      checked={!deleteAllMenusOption}
                      onChange={() => setDeleteAllMenusOption(false)}
                    />
                    <span>Chỉ xóa khỏi Menu và Nhóm hiện tại đang chọn</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="delScope"
                      checked={deleteAllMenusOption}
                      onChange={() => setDeleteAllMenusOption(true)}
                    />
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Xóa triệt để khỏi TẤT CẢ các Menu có chứa món này</span>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteStep(2)}
                  >
                    Tiếp Tục (Bước 2/2) ➔
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div style={{ padding: '12px 14px', borderRadius: '6px', backgroundColor: '#FEF2F2', border: '1.5px solid #EF4444', color: '#991B1B', fontSize: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 800 }}>⚠️ XÁC NHẬN LẦN CUỐI ĐỂ ĐẢM BẢO AN TOÀN:</p>
                  <p style={{ margin: 0 }}>
                    Thao tác này sẽ gỡ bỏ {selectedDishesList.length} món ăn khỏi cơ sở dữ liệu MongoDB của nhà hàng {deleteAllMenusOption ? '(trên toàn bộ Menu)' : '(trên Menu đã chọn)'}.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <Button variant="outline" size="sm" onClick={() => setDeleteStep(1)}>
                    Quay Lại
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleExecuteDelete}
                    isLoading={deletingDishes}
                    disabled={deletingDishes}
                    style={{ backgroundColor: '#DC2626' }}
                  >
                    Tôi Chắc Chắn Muốn Xóa Vĩnh Viễn
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 8. MODAL: CHECK LỖI XUNG ĐỘT (DISH CONFLICT RESOLVER) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isConflictModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsConflictModalOpen(false)}
          title="Kiểm Tra & Đồng Bộ Sai Lệch Mã RK7 / Tên Món"
          maxWidth="960px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Tabs chọn loại xung đột */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConflictTab('SAME_RK7')}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  borderBottom: conflictTab === 'SAME_RK7' ? '2px solid #2563EB' : '2px solid transparent',
                  color: conflictTab === 'SAME_RK7' ? '#1D4ED8' : '#6B7280',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                1. Cùng mã RK7 nhưng khác tên ({sameRk7List.length})
              </button>
              <button
                type="button"
                onClick={() => setConflictTab('SAME_NAME')}
                style={{
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  borderBottom: conflictTab === 'SAME_NAME' ? '2px solid #2563EB' : '2px solid transparent',
                  color: conflictTab === 'SAME_NAME' ? '#1D4ED8' : '#6B7280',
                  background: 'none',
                  cursor: 'pointer'
                }}
              >
                2. Cùng tên nhưng khác mã RK7 ({sameNameList.length})
              </button>
            </div>

            {loadingConflicts ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                <div>Đang quét toàn bộ cơ sở dữ liệu để tìm kiếm sai lệch...</div>
              </div>
            ) : conflictTab === 'SAME_RK7' ? (
              // TAB 1: CÙNG MÃ RK7 KHÁC TÊN
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sameRk7List.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#059669', backgroundColor: '#ECFDF5', borderRadius: '6px' }}>
                    <CheckCircle2 size={24} style={{ margin: '0 auto 6px' }} />
                    <strong>Tuyệt vời!</strong> Không có mã RK7 nào bị đặt tên khác nhau trong hệ thống.
                  </div>
                ) : (
                  sameRk7List.map((item) => {
                    const isExpanded = expandedConflictKeys.has(item.key);
                    return (
                      <div
                        key={item.key}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C', fontFamily: 'Consolas, monospace', backgroundColor: '#FEE2E2', padding: '2px 8px', borderRadius: '4px' }}>
                              Mã RK7: {item.rk7_code}
                            </span>
                            <span style={{ fontSize: '11px', color: '#6B7280' }}>
                              ({item.distinct_values.length} tên khác nhau)
                            </span>

                            {/* SAP Status Badge */}
                            {item.sap_status === 'SAME_SAP' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #F59E0B' }}>
                                ⚠️ Trùng mã SAP ({item.distinct_saps?.join(', ')})
                              </span>
                            )}
                            {item.sap_status === 'DIFF_SAP' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #93C5FD' }}>
                                ℹ️ Khác mã SAP ({item.distinct_saps?.join(', ')})
                              </span>
                            )}
                            {item.sap_status === 'PARTIAL_SAP' && (
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB' }}>
                                Có món thiếu SAP ({item.distinct_saps?.join(', ')})
                              </span>
                            )}
                            {item.sap_status === 'NO_SAP' && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                Chưa có mã SAP
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpandConflict(item.key)}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              {isExpanded ? '▴ Thu Gọn Chi Tiết' : '▾ Xem Chi Tiết SAP & Menu'}
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSelectConflictToResolve(item)}
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                            >
                              Xử lý đồng bộ
                            </Button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.distinct_values.map((v, i) => (
                            <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                              "{v}"
                            </span>
                          ))}
                        </div>

                        {/* Chi Tiết Mở Rộng: Bảng đối chiếu từng menu, nhóm, SAP, giá */}
                        {isExpanded && (
                          <div style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', color: '#4B5563', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 8px' }}>STT</th>
                                    <th style={{ padding: '6px 8px' }}>Mã RK7</th>
                                    <th style={{ padding: '6px 8px' }}>Mã SAP</th>
                                    <th style={{ padding: '6px 8px' }}>Tên Món Ăn</th>
                                    <th style={{ padding: '6px 8px' }}>Menu Áp Dụng</th>
                                    <th style={{ padding: '6px 8px' }}>Nhóm Món</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Giá (VNĐ)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(item.occurrences || []).map((occ, oIdx) => (
                                    <tr key={oIdx} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: oIdx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                                      <td style={{ padding: '6px 8px', color: '#9CA3AF' }}>{oIdx + 1}</td>
                                      <td style={{ padding: '6px 8px', fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#B91C1C' }}>
                                        {occ.rk7_code || item.rk7_code}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontFamily: 'Consolas, monospace', fontWeight: 600, color: occ.sap_code ? '#047857' : '#9CA3AF' }}>
                                        {occ.sap_code || '—'}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1F2937' }}>
                                        {occ.name || '—'}
                                      </td>
                                      <td style={{ padding: '6px 8px', color: '#4B5563' }}>
                                        {occ.menu_name ? `${occ.menu_name} (${occ.menu_code})` : occ.menu_code}
                                      </td>
                                      <td style={{ padding: '6px 8px', color: '#6B7280' }}>
                                        {occ.group_name || occ.group_code}
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                                        {occ.price ? `${occ.price.toLocaleString()} đ` : '0 đ'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // TAB 2: CÙNG TÊN KHÁC MÃ RK7
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sameNameList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#059669', backgroundColor: '#ECFDF5', borderRadius: '6px' }}>
                    <CheckCircle2 size={24} style={{ margin: '0 auto 6px' }} />
                    <strong>Tuyệt vời!</strong> Không có tên món nào bị gán nhiều mã RK7 khác nhau.
                  </div>
                ) : (
                  sameNameList.map((item) => {
                    const isExpanded = expandedConflictKeys.has(item.key);
                    return (
                      <div
                        key={item.key}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                              "{item.name}"
                            </span>
                            <span style={{ fontSize: '11px', color: '#6B7280' }}>
                              ({item.distinct_values.length} mã RK7 khác nhau)
                            </span>

                            {/* SAP Status Badge */}
                            {item.sap_status === 'SAME_SAP' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #F59E0B' }}>
                                ⚠️ Trùng mã SAP ({item.distinct_saps?.join(', ')})
                              </span>
                            )}
                            {item.sap_status === 'DIFF_SAP' && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #93C5FD' }}>
                                ℹ️ Khác mã SAP ({item.distinct_saps?.join(', ')})
                              </span>
                            )}
                            {item.sap_status === 'PARTIAL_SAP' && (
                              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB' }}>
                                Có món thiếu SAP ({item.distinct_saps?.join(', ')})
                              </span>
                            )}
                            {item.sap_status === 'NO_SAP' && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                                Chưa có mã SAP
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpandConflict(item.key)}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              {isExpanded ? '▴ Thu Gọn Chi Tiết' : '▾ Xem Chi Tiết SAP & Menu'}
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSelectConflictToResolve(item)}
                              style={{ fontSize: '11px', padding: '4px 10px' }}
                            >
                              Xử lý đồng bộ
                            </Button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.distinct_values.map((v, i) => (
                            <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontFamily: 'Consolas, monospace' }}>
                              RK7: {v}
                            </span>
                          ))}
                        </div>

                        {/* Chi Tiết Mở Rộng: Breakdown theo từng RK7 & Bảng đối chiếu */}
                        {isExpanded && (
                          <div style={{ marginTop: '6px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Cảnh Báo Trùng / Khác SAP */}
                            {item.sap_status === 'SAME_SAP' ? (
                              <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E', fontSize: '11px', lineHeight: '1.45' }}>
                                <strong>⚠️ CẢNH BÁO TRÙNG MÃ SAP:</strong> Cả {item.distinct_values.length} mã RK7 khác nhau này đều trỏ chung 1 mã SAP <strong>"{item.distinct_saps?.join(', ')}"</strong>. Đây là trường hợp 1 món ăn kế toán cấp 1 mã SAP nhưng bị tạo trùng nhiều mã RK7 khác nhau ở các Menu. Bạn nên dùng chức năng <strong>"Xử lý đồng bộ"</strong> để đưa về 1 mã RK7 duy nhất!
                              </div>
                            ) : item.sap_status === 'DIFF_SAP' ? (
                              <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '11px', lineHeight: '1.45' }}>
                                <strong>ℹ️ KHÁC MÃ SAP:</strong> Các mã RK7 này mang các mã SAP khác nhau ({item.distinct_saps?.join(', ')}). Vui lòng kiểm tra với phòng thực đơn/kế toán trước khi gộp để đảm bảo không gộp nhầm 2 món khác nhau có trùng tên.
                              </div>
                            ) : null}

                            {/* Tóm tắt từng mã RK7 */}
                            {item.rk7_breakdown && item.rk7_breakdown.length > 0 && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                                {item.rk7_breakdown.map((b) => (
                                  <div key={b.rk7_code} style={{ padding: '8px 10px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '11px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 800, color: '#1E40AF', fontFamily: 'Consolas, monospace' }}>
                                        RK7: {b.rk7_code}
                                      </span>
                                      <span style={{ fontWeight: 700, color: b.sap_codes.length > 0 && b.sap_codes[0] ? '#047857' : '#9CA3AF' }}>
                                        SAP: {b.sap_codes.join(', ') || '—'}
                                      </span>
                                    </div>
                                    <div style={{ color: '#4B5563', marginBottom: '2px' }}>
                                      <strong>Menu:</strong> {b.menus.join(', ') || '—'}
                                    </div>
                                    <div style={{ color: '#111827', fontWeight: 600 }}>
                                      <strong>Giá:</strong> {b.prices.map((p) => `${p.toLocaleString()} đ`).join(', ') || '0 đ'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Bảng chi tiết toàn bộ vị trí xuất hiện */}
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', color: '#4B5563', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 8px' }}>STT</th>
                                    <th style={{ padding: '6px 8px' }}>Mã RK7</th>
                                    <th style={{ padding: '6px 8px' }}>Mã SAP</th>
                                    <th style={{ padding: '6px 8px' }}>Tên Món Ăn</th>
                                    <th style={{ padding: '6px 8px' }}>Menu Áp Dụng</th>
                                    <th style={{ padding: '6px 8px' }}>Nhóm Món</th>
                                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Giá (VNĐ)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(item.occurrences || []).map((occ, oIdx) => (
                                    <tr key={oIdx} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: oIdx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                                      <td style={{ padding: '6px 8px', color: '#9CA3AF' }}>{oIdx + 1}</td>
                                      <td style={{ padding: '6px 8px', fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#1D4ED8' }}>
                                        {occ.rk7_code || item.rk7_code}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontFamily: 'Consolas, monospace', fontWeight: 600, color: occ.sap_code ? '#047857' : '#9CA3AF' }}>
                                        {occ.sap_code || '—'}
                                      </td>
                                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#1F2937' }}>
                                        {occ.name || '—'}
                                      </td>
                                      <td style={{ padding: '6px 8px', color: '#4B5563' }}>
                                        {occ.menu_name ? `${occ.menu_name} (${occ.menu_code})` : occ.menu_code}
                                      </td>
                                      <td style={{ padding: '6px 8px', color: '#6B7280' }}>
                                        {occ.group_name || occ.group_code}
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                                        {occ.price ? `${occ.price.toLocaleString()} đ` : '0 đ'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Khung Form Xử Lý Đồng Bộ Khi Bấm Chọn 1 Xung Đột */}
            {selectedConflictItem && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #F59E0B',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginTop: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>
                    ⚡ Đồng bộ về 1 món và 1 tên duy nhất cho: {selectedConflictItem.name || selectedConflictItem.rk7_code}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedConflictItem(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', display: 'block', marginBottom: '3px' }}>
                      Mã RK7 chuẩn:
                    </label>
                    <input
                      type="text"
                      value={unifiedRk7Input}
                      onChange={(e) => setUnifiedRk7Input(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #D97706', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', display: 'block', marginBottom: '3px' }}>
                      Tên món chuẩn duy nhất:
                    </label>
                    <input
                      type="text"
                      value={unifiedNameInput}
                      onChange={(e) => setUnifiedNameInput(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid #D97706', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <Button variant="outline" size="sm" onClick={() => setSelectedConflictItem(null)}>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExecuteResolveConflict}
                    isLoading={resolvingConflict}
                    disabled={resolvingConflict}
                    style={{ backgroundColor: '#D97706', borderColor: '#B45309' }}
                  >
                    Áp Dụng Đồng Bộ Toàn Bộ
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 9. MODAL: KHÔNG GIAN MENU TRUNG GIAN (SNAPSHOT MANAGEMENT) */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isSnapshotModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsSnapshotModalOpen(false);
            setIsSavingSnapshotView(false);
            setDeployingSnapshot(null);
          }}
          title="📦 Không Gian Menu Trung Gian (Snapshot & Đồng Bộ Xuyên Nhà Hàng)"
          maxWidth="980px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto' }}>
            {/* Banner Giới Thiệu */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#F5F3FF',
                border: '1px solid #DDD6FE',
                color: '#5B21B6',
                fontSize: '12px',
                lineHeight: '1.5',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <Package size={18} style={{ color: '#7C3AED', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Không Gian Trung Gian:</strong> Lưu trữ toàn bộ thực đơn (Menu, Nhóm, Món, CO, KDS) độc lập trên máy chủ trung tâm.
                Nhờ đó, bạn có thể chuyển thực đơn giữa các nhà hàng an toàn, không lo 2 nhà hàng bị nghẽn mạng WAN hoặc không thông IP với nhau!
              </div>
            </div>

            {/* VIEW A: FORM LƯU SNAPSHOT MỚI */}
            {isSavingSnapshotView ? (
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F9FAFB', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                    💾 Lưu Thực Đơn Nhà Hàng Hiện Tại Vào Không Gian Trung Gian
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setIsSavingSnapshotView(false)}>
                    Quay Lại Danh Sách
                  </Button>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Tên Bản Snapshot:
                  </label>
                  <input
                    type="text"
                    value={snapshotNameInput}
                    onChange={(e) => setSnapshotNameInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#4B5563' }}>
                  <div><strong>Nhà hàng nguồn:</strong> [{selectedRestaurant?.sap || 'N/A'}] {selectedRestaurant?.res || 'N/A'}</div>
                  <div><strong>Máy trạm Host:</strong> {activeHost}:27017</div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                      Chọn Menu Cần Lưu Vào Snapshot ({snapshotMenuCodes.length} / {menus.length}):
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setSnapshotMenuCodes(menus.map((m) => m.code))}
                        style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Chọn tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setSnapshotMenuCodes([])}
                        style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '6px', maxHeight: '180px', overflowY: 'auto', padding: '6px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    {menus.map((m) => {
                      const isChecked = snapshotMenuCodes.includes(m.code);
                      return (
                        <label
                          key={m.code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                            cursor: 'pointer',
                            fontSize: '11px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSnapshotMenuCodes(snapshotMenuCodes.filter((c) => c !== m.code));
                              } else {
                                setSnapshotMenuCodes([...snapshotMenuCodes, m.code]);
                              }
                            }}
                          />
                          <span style={{ fontWeight: isChecked ? 700 : 500, color: isChecked ? '#1E40AF' : '#374151' }}>
                            {m.name} - {m.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <Button variant="outline" size="sm" onClick={() => setIsSavingSnapshotView(false)}>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveSnapshot}
                    isLoading={savingSnapshot}
                    disabled={savingSnapshot || snapshotMenuCodes.length === 0}
                    style={{ backgroundColor: '#7C3AED', borderColor: '#6D28D9' }}
                    leftIcon={<Package size={14} />}
                  >
                    Xác Nhận Lưu Vào Trung Gian
                  </Button>
                </div>
              </div>
            ) : deployingSnapshot ? (
              // VIEW B: FORM TRIỂN KHAI SNAPSHOT SANG NHÀ HÀNG ĐÍCH
              <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #BBF7D0', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                    🚀 Triển Khai Thực Đơn Từ Snapshot Sang Nhà Hàng Đích
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setDeployingSnapshot(null)}>
                    Hủy Triển Khai
                  </Button>
                </div>

                <div style={{ fontSize: '12px', color: '#166534', backgroundColor: '#DCFCE7', padding: '8px 12px', borderRadius: '6px' }}>
                  <div><strong>Bản Snapshot:</strong> {deployingSnapshot.name}</div>
                  <div><strong>Nguồn:</strong> [{deployingSnapshot.source_sap}] {deployingSnapshot.source_name} • <strong>Quy mô:</strong> {deployingSnapshot.total_menus} menu, {deployingSnapshot.total_groups} nhóm, {deployingSnapshot.total_dishes} món</div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '4px' }}>
                    Chọn Nhà Hàng Đích Sẽ Nhận Thực Đơn:
                  </label>
                  <select
                    value={deployTargetRestId || ''}
                    onChange={(e) => setDeployTargetRestId(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1.5px solid #16A34A',
                      outline: 'none',
                      backgroundColor: '#FFFFFF'
                    }}
                  >
                    <option value="">-- Chọn Nhà Hàng Đích --</option>
                    {restaurants
                      .filter((r) => r.ip)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          [{r.sap || 'N/A'}] {r.res} • IP: {r.ip}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '6px' }}>
                    Chế Độ Triển Khai:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="deployMode"
                        checked={deployMode === 'merge_update'}
                        onChange={() => setDeployMode('merge_update')}
                      />
                      <span><strong>Gộp & Cập Nhật (Merge Update) - Khuyến nghị:</strong> Giữ nguyên các menu khác ở nhà hàng đích, chỉ cập nhật hoặc tạo mới các menu có trong snapshot.</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="deployMode"
                        checked={deployMode === 'clean_overwrite'}
                        onChange={() => setDeployMode('clean_overwrite')}
                      />
                      <span style={{ color: '#B91C1C' }}><strong>Ghi Đè Triệt Để (Clean Overwrite):</strong> Xóa sạch các menu có mã trùng ở nhà hàng đích rồi nạp lại snapshot.</span>
                    </label>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={deploySyncCo}
                    onChange={(e) => setDeploySyncCo(e.target.checked)}
                  />
                  <span>Đồng bộ toàn bộ danh mục món CO (CO_MENU_ITEM & ảnh món)</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <Button variant="outline" size="sm" onClick={() => setDeployingSnapshot(null)}>
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExecuteDeploy}
                    isLoading={isDeploying}
                    disabled={isDeploying || !deployTargetRestId}
                    style={{ backgroundColor: '#16A34A', borderColor: '#15803D' }}
                    leftIcon={<Globe size={14} />}
                  >
                    Bắt Đầu Triển Khai Sang Nhà Hàng Đích ➔
                  </Button>
                </div>
              </div>
            ) : (
              // VIEW C: DANH SÁCH SNAPSHOTS
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                    Danh Sách Snapshot Đã Lưu ({snapshotsList.length})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchSnapshots}
                      leftIcon={<RefreshCw size={13} style={{ animation: loadingSnapshots ? 'spin 1s linear infinite' : 'none' }} />}
                    >
                      Làm Mới
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={openSaveSnapshotForm}
                      disabled={!activeHost}
                      style={{ backgroundColor: '#7C3AED', borderColor: '#6D28D9' }}
                      leftIcon={<Upload size={14} />}
                    >
                      + Lưu Thực Đơn Nhà Hàng Hiện Tại
                    </Button>
                  </div>
                </div>

                {loadingSnapshots ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                    <div>Đang đọc dữ liệu từ Không Gian Trung Gian...</div>
                  </div>
                ) : snapshotsList.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <Package size={28} style={{ color: '#9CA3AF', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 600 }}>Chưa có bản Snapshot nào trong Không Gian Trung Gian</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Hãy bấm nút <strong>"+ Lưu Thực Đơn Nhà Hàng Hiện Tại"</strong> ở trên để sao lưu menu vào kho trung gian!
                    </div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-color)', color: '#4B5563', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>Tên Bản Snapshot</th>
                          <th style={{ padding: '8px 10px' }}>Nhà Hàng Nguồn</th>
                          <th style={{ padding: '8px 10px' }}>Quy Mô Thực Đơn</th>
                          <th style={{ padding: '8px 10px' }}>Thời Gian Lưu</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshotsList.map((snap) => (
                          <tr key={snap.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 700, color: '#111827' }}>{snap.name}</div>
                              <div style={{ fontSize: '10px', color: '#6B7280', fontFamily: 'Consolas, monospace' }}>ID: {snap.id}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 600, color: '#1E40AF' }}>[{snap.source_sap}] {snap.source_name}</div>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>IP: {snap.source_host}</div>
                            </td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <Badge variant="primary">{snap.total_menus} menu</Badge>
                                <Badge variant="neutral">{snap.total_groups} nhóm</Badge>
                                <Badge variant="success">{snap.total_dishes} món</Badge>
                              </div>
                            </td>
                            <td style={{ padding: '10px', fontSize: '11px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                              {snap.created_at}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenDeployDialog(snap)}
                                  style={{ backgroundColor: '#059669', fontSize: '11px', padding: '4px 10px' }}
                                  leftIcon={<Globe size={12} />}
                                >
                                  Triển Khai Sang NH Đích ➔
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                                  style={{ color: '#DC2626', borderColor: '#FECACA', fontSize: '11px', padding: '4px 8px' }}
                                  title="Xóa snapshot khỏi trung gian"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* 10. MODAL: ĐỒNG BỘ MENU TRỰC TIẾP GIỮA 2 NHÀ HÀNG */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isDirectSyncModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDirectSyncModalOpen(false)}
          title="🌐 Đồng Bộ Toàn Bộ Menu Trực Tiếp Sang Nhà Hàng Khác"
          maxWidth="700px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '12px',
                lineHeight: '1.45'
              }}
            >
              Hệ thống sẽ đồng bộ cấu trúc Menu từ nhà hàng hiện tại sang nhà hàng đích, đồng thời <strong>tự động tạo 1 bản sao lưu Snapshot</strong> vào Không Gian Trung Gian để bảo đảm an toàn dữ liệu.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#F9FAFB', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '2px' }}>
                  NHÀ HÀNG NGUỒN:
                </span>
                <div style={{ fontWeight: 700, color: '#111827' }}>
                  [{selectedRestaurant?.sap || 'N/A'}] {selectedRestaurant?.res || 'N/A'}
                </div>
                <div style={{ color: '#4B5563', fontSize: '11px' }}>IP: {activeHost}:27017</div>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: '2px' }}>
                  NHÀ HÀNG ĐÍCH (SẼ NHẬN MENU):
                </span>
                <select
                  value={directSyncTargetRestId || ''}
                  onChange={(e) => setDirectSyncTargetRestId(e.target.value ? Number(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #3B82F6',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <option value="">-- Chọn Nhà Hàng Đích --</option>
                  {restaurants
                    .filter((r) => r.ip && r.ip !== activeHost)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.sap || 'N/A'}] {r.res} • IP: {r.ip}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151' }}>
                  Menu Cần Đồng Bộ ({directSyncMenuCodes.length} / {menus.length}):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDirectSyncMenuCodes(menus.map((m) => m.code))}
                    style={{ fontSize: '11px', color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirectSyncMenuCodes([])}
                    style={{ fontSize: '11px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '6px', backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                {menus.map((m) => {
                  const isChecked = directSyncMenuCodes.includes(m.code);
                  return (
                    <label
                      key={m.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        backgroundColor: isChecked ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setDirectSyncMenuCodes(directSyncMenuCodes.filter((c) => c !== m.code));
                          } else {
                            setDirectSyncMenuCodes([...directSyncMenuCodes, m.code]);
                          }
                        }}
                      />
                      <span style={{ fontWeight: isChecked ? 700 : 500, color: isChecked ? '#1E40AF' : '#374151' }}>
                        {m.name} - {m.code}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Chế độ áp dụng tại nhà hàng đích:
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="directMode"
                    checked={directSyncMode === 'merge_update'}
                    onChange={() => setDirectSyncMode('merge_update')}
                  />
                  <span>Gộp & Cập Nhật (Merge Update)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="directMode"
                    checked={directSyncMode === 'clean_overwrite'}
                    onChange={() => setDirectSyncMode('clean_overwrite')}
                  />
                  <span style={{ color: '#DC2626' }}>Ghi Đè Triệt Để (Clean Overwrite)</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="outline" size="sm" onClick={() => setIsDirectSyncModalOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteDirectSync}
                isLoading={isDirectSyncing}
                disabled={isDirectSyncing || !directSyncTargetRestId || directSyncMenuCodes.length === 0}
                style={{ backgroundColor: '#2563EB', borderColor: '#1D4ED8' }}
                leftIcon={<Globe size={14} />}
              >
                Bắt Đầu Đồng Bộ Trực Tiếp
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* MODAL: THÊM THẲNG MÓN MỚI VÀO NHÓM MÓN ĐANG MỞ                   */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {isAddDishToGroupOpen && targetGroupForAdd && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddDishToGroupOpen(false)}
          title={`Thêm Món Mới Vào Nhóm: ${targetGroupForAdd.groupName}`}
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
            {/* Banner tóm tắt Menu & Nhóm */}
            <div style={{ padding: '10px 12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>Menu Đích:</span>
                <span style={{ fontWeight: 700, color: '#1E40AF', backgroundColor: '#DBEAFE', padding: '2px 8px', borderRadius: '4px' }}>
                  {targetGroupForAdd.menuCode}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#166534', fontWeight: 600 }}>Nhóm Món:</span>
                <span style={{ fontWeight: 700, color: '#065F46' }}>
                  {targetGroupForAdd.groupName} ({targetGroupForAdd.groupCode})
                </span>
              </div>
            </div>

            {/* Mã RK7 & Mã SAP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Mã RK7 <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={newDishRk7}
                  onChange={(e) => setNewDishRk7(e.target.value)}
                  placeholder="VD: 33162"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    fontFamily: 'Consolas, monospace',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Mã SAP (Không bắt buộc)
                </label>
                <input
                  type="text"
                  value={newDishSap}
                  onChange={(e) => setNewDishSap(e.target.value)}
                  placeholder="VD: 65003506"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    fontFamily: 'Consolas, monospace',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Tên Món Ăn */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Tên Món Ăn <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                placeholder="VD: Combo gà nướng phô mai"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Đơn Giá & Thứ Tự */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Đơn Giá (VNĐ)
                </label>
                <input
                  type="number"
                  value={newDishPrice}
                  onChange={(e) => setNewDishPrice(Number(e.target.value))}
                  min={0}
                  step={1000}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Thứ Tự Hiển Thị
                </label>
                <input
                  type="number"
                  value={newDishSortOrder}
                  onChange={(e) => setNewDishSortOrder(Number(e.target.value))}
                  min={1}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Link Hình Ảnh */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '4px' }}>
                Link Hình Ảnh (Tùy chọn)
              </label>
              <input
                type="text"
                value={newDishImg}
                onChange={(e) => setNewDishImg(e.target.value)}
                placeholder="VD: https://.../image.jpg"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Tùy chọn Tự kích hoạt CO */}
            <div style={{ padding: '8px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#92400E' }}>
                <input
                  type="checkbox"
                  checked={newDishAutoCo}
                  onChange={(e) => setNewDishAutoCo(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                ⚡ Tự động kích hoạt hiển thị món sang CO (Kalo = 100)
              </label>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddDishToGroupOpen(false)}
                disabled={savingAddDishToGroup}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveAddDishToGroup}
                isLoading={savingAddDishToGroup}
                disabled={savingAddDishToGroup || !newDishRk7.trim() || !newDishName.trim()}
                style={{ backgroundColor: '#059669', borderColor: '#047857' }}
                leftIcon={<Plus size={14} />}
              >
                Lưu & Thêm Món
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

