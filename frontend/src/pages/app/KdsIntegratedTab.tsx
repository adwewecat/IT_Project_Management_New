import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChefHat,
  Clock,
  Layers,
  Search,
  RefreshCw,
  Power,
  Printer,
  Monitor,
  AlertTriangle,
  PlusCircle,
  ArrowRightLeft,
  Trash2,
  Save,
  Info,
  Bell,
  Flame,
  Utensils,
  BarChart3,
  Copy,
  Check,
  CheckSquare,
  Square,
  RotateCcw,
  Filter,
  CheckCheck,
  ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { RestaurantItem } from '../../types/restaurant';
import {
  mongoService,
  KdsItemDish,
  KdsItemsResponse,
  KdsPlaceItem
} from '../../services/mongoService';

// Import các Modal KDS nghiệp vụ có sẵn
import {
  KdsAddQuayModal,
  KdsQuayListModal,
  KdsRoleUserModal,
  ModalCreateFoodControl,
  KdsTransferQuayModal,
  KdsLogsModal,
  KdsAddDishModal,
  KdsDeleteCookingConfigModal
} from './KdsQuayModals';
import { KdsKitchenIntakeModal } from './KdsKitchenIntakeModal';
import { BatchRoleUserModal } from './BatchRoleUserModal';
import { PrintManagementModal } from '../../components/mongodb/PrintManagementModal';
import { VncKdsModal } from '../../components/restaurants/VncKdsModal';

interface KdsIntegratedTabProps {
  selectedRestaurant: RestaurantItem | null;
  connectedHost: string;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  restaurants?: RestaurantItem[];
}

// Kiểu dữ liệu Phiếu Gọi Món trên Màn Hình KDS
interface KitchenTicketDish {
  id: string;
  code: string;
  name: string;
  quantity: number;
  station: string;
  placeId?: number;
  note?: string;
  isDone: boolean;
  doneAt?: string;
  targetMinutes: number;
}

interface KitchenTicket {
  ticketId: string;
  tableNumber: string;
  orderTime: string; // HH:mm:ss
  createdAtTimestamp: number;
  dishes: KitchenTicketDish[];
  isPrioritized?: boolean;
}

export const KdsIntegratedTab: React.FC<KdsIntegratedTabProps> = ({
  selectedRestaurant,
  connectedHost,
  onToast,
  restaurants = []
}) => {
  // ── 1. ĐIỀU HƯỚNG SUB-TAB KDS ──
  // live_kds: Màn hình trực quan KDS & Giả lập bếp
  // analytics_logs: Tra cứu nhật ký & Phân tích món vào bếp
  // places_accounts: Quản lý Quầy Bếp & Phân quyền tài khoản
  // cooking_sla: Cấu hình món ăn & Thời gian nấu SLA (CONFIG_COOKING)
  const [subTab, setSubTab] = useState<'live_kds' | 'analytics_logs' | 'places_accounts' | 'cooking_sla'>('live_kds');

  // ── 2. TRẠNG THÁI KẾT NỐI & HOST ──
  const [targetHost, setTargetHost] = useState<string>(connectedHost || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [kdsData, setKdsData] = useState<KdsItemsResponse | null>(null);
  const [places, setPlaces] = useState<KdsPlaceItem[]>([]);
  const [printers, setPrinters] = useState<string[]>([]);
  const [kdsMasterEnabled, setKdsMasterEnabled] = useState<boolean>(true);
  const [togglingMaster, setTogglingMaster] = useState<boolean>(false);
  const [showKdsGuide, setShowKdsGuide] = useState<boolean>(false);

  // Đồng bộ targetHost khi connectedHost từ bên ngoài thay đổi
  useEffect(() => {
    if (connectedHost && !targetHost) {
      setTargetHost(connectedHost);
    }
  }, [connectedHost, targetHost]);

  // Tự động gợi ý các IP trạm nhà hàng (.41 PC QL, .42 Bếp, .11 POS1, .12 POS2)
  const ipPrefix = useMemo(() => {
    const rawIp = targetHost || connectedHost || selectedRestaurant?.ip || '';
    const parts = rawIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.`;
    }
    return '';
  }, [targetHost, connectedHost, selectedRestaurant]);

  // ── 3. TRẠNG THÁI MODALS ──
  const [showAddQuayModal, setShowAddQuayModal] = useState<boolean>(false);
  const [showQuayListModal, setShowQuayListModal] = useState<boolean>(false);
  const [showRoleUserModal, setShowRoleUserModal] = useState<boolean>(false);
  const [showCreateFoodControlModal, setShowCreateFoodControlModal] = useState<boolean>(false);
  const [showTransferQuayModal, setShowTransferQuayModal] = useState<boolean>(false);
  const [transferFromPlaceId, setTransferFromPlaceId] = useState<number | null>(null);
  const [transferSelectedDishes, setTransferSelectedDishes] = useState<string[]>([]);
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(false);
  const [showAddDishModal, setShowAddDishModal] = useState<boolean>(false);
  const [showDeleteCookingModal, setShowDeleteCookingModal] = useState<boolean>(false);
  const [showBatchRoleModal, setShowBatchRoleModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showVncModal, setShowVncModal] = useState<boolean>(false);

  // ── 4. TẢI DỮ LIỆU KDS (CONFIG_COOKING & PLACES) ──
  const fetchKdsAllData = useCallback(async (hostOverride?: string) => {
    const hostToUse = hostOverride || targetHost || connectedHost;
    if (!hostToUse) {
      onToast('Chưa chọn IP MongoDB nhà hàng!', 'error');
      return;
    }
    setLoading(true);
    try {
      // Tải song song danh sách món và quầy
      const [itemsRes, placesRes] = await Promise.allSettled([
        mongoService.getKdsItems(hostToUse, 27017),
        mongoService.getKdsPlaces(hostToUse, 27017)
      ]);

      if (itemsRes.status === 'fulfilled') {
        setKdsData(itemsRes.value);
        if (itemsRes.value.kds_master_status !== undefined) {
          setKdsMasterEnabled(itemsRes.value.kds_master_status === 1);
        } else if (itemsRes.value.kds_master_enabled !== undefined) {
          setKdsMasterEnabled(itemsRes.value.kds_master_enabled);
        }
      } else {
        console.warn('Lỗi tải KDS Items:', itemsRes.reason);
      }

      if (placesRes.status === 'fulfilled') {
        setPlaces(placesRes.value.places || []);
        setPrinters(placesRes.value.printers || []);
      } else {
        console.warn('Lỗi tải KDS Places:', placesRes.reason);
      }
    } catch (err: any) {
      onToast('Lỗi khi tải dữ liệu KDS: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  }, [targetHost, connectedHost, onToast]);

  // Tự động tải dữ liệu lần đầu khi có host
  useEffect(() => {
    if (targetHost || connectedHost) {
      fetchKdsAllData(targetHost || connectedHost);
    }
  }, [targetHost, connectedHost, fetchKdsAllData]);

  // ── 5. BẬT / TẮT KDS MASTER (SHOW_KDS) ──
  const handleToggleMaster = async () => {
    const hostToUse = targetHost || connectedHost;
    if (!hostToUse) {
      onToast('Chưa kết nối IP MongoDB nhà hàng!', 'error');
      return;
    }
    const newStatus = kdsMasterEnabled ? 0 : 1;
    const confirmMsg = newStatus === 1
      ? 'Bạn có chắc chắn muốn BẬT HOÀN TOÀN KDS cho nhà hàng này không?\n\n- Toàn bộ thiết bị KDS & luồng đẩy món xuống bếp sẽ kích hoạt lại bình thường.'
      : '⚠️ CẢNH BÁO QUAN TRỌNG:\nBạn có chắc chắn muốn TẮT HOÀN TOÀN KDS cho nhà hàng này không?\n\n- Toàn bộ thiết bị KDS & luồng đẩy món xuống bếp sẽ NGỪNG hoạt động!';
    if (!window.confirm(confirmMsg)) return;

    setTogglingMaster(true);
    try {
      const res = await mongoService.toggleKdsMasterStatus(hostToUse, newStatus, 27017);
      setKdsMasterEnabled(newStatus === 1);
      onToast(res.message || `Đã chuyển trạng thái KDS Master sang: ${newStatus === 1 ? 'BẬT' : 'TẮT'}`, 'success');
    } catch (err: any) {
      onToast('Lỗi khi đổi trạng thái KDS: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setTogglingMaster(false);
    }
  };

  // ── 6. ĐỒNG NHẤT NHÓM BẾP THEO QUẦY BẾP (1-CHẠM) ──
  const [isSyncingGroups, setIsSyncingGroups] = useState<boolean>(false);
  const handleSyncGroups = async () => {
    const hostToUse = targetHost || connectedHost;
    if (!hostToUse) {
      onToast('Chưa kết nối IP MongoDB!', 'error');
      return;
    }
    if (!window.confirm('⚡ ĐỒNG NHẤT NHÓM BẾP THEO QUẦY BẾP (1 CHẠM)\n\n' +
      'Hệ thống sẽ tự động quét tất cả món trong CONFIG_COOKING:\n' +
      '- Món thuộc quầy nào sẽ được cập nhật nhóm bếp (groupTypeKds) theo tên quầy đó.\n' +
      '- Tự động gỡ bỏ món rác không quầy/không máy in khỏi KDS.\n\n' +
      'Bạn có chắc chắn muốn thực hiện ngay?')) {
      return;
    }
    setIsSyncingGroups(true);
    try {
      const res = await mongoService.syncKdsGroupsByQuays(hostToUse);
      onToast(res.message, 'success');
      fetchKdsAllData(hostToUse);
    } catch (err: any) {
      onToast('Lỗi khi đồng nhất nhóm bếp: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSyncingGroups(false);
    }
  };

  // ── 7. LOGIC CHO SUB-TAB 1: LIVE KDS SCREEN SIMULATION ──
  const [liveTickets, setLiveTickets] = useState<KitchenTicket[]>([
    {
      ticketId: 'TK-101',
      tableNumber: 'BÀN 01',
      orderTime: '12:05:10',
      createdAtTimestamp: Date.now() - 3 * 60 * 1000 - 15 * 1000, // 3 phút 15 giây trước
      isPrioritized: false,
      dishes: [
        { id: 'd1', code: '6001201', name: 'Ba Chỉ Bò Mỹ Nướng Sốt Galbi', quantity: 2, station: 'Bếp Nướng', targetMinutes: 5, isDone: false, note: 'Gấp' },
        { id: 'd2', code: '6001204', name: 'Dẻ Sườn Bò Wagyu Rút Xương', quantity: 1, station: 'Bếp Nướng', targetMinutes: 7, isDone: false, note: 'Ít tiêu' },
        { id: 'd3', code: '6003011', name: 'Lẩu Nấm Thượng Hạng (Nước Lẩu)', quantity: 1, station: 'Bếp Lẩu', targetMinutes: 5, isDone: true, doneAt: '12:08:00' }
      ]
    },
    {
      ticketId: 'TK-102',
      tableNumber: 'BÀN 08',
      orderTime: '11:58:30',
      createdAtTimestamp: Date.now() - 11 * 60 * 1000 - 45 * 1000, // 11 phút 45 giây trước (Quá hạn SLA)
      isPrioritized: true,
      dishes: [
        { id: 'd4', code: '6002015', name: 'Gà Xiên Nướng Kiểu Nhật Yakitori', quantity: 3, station: 'Bếp Nướng', targetMinutes: 8, isDone: false, note: 'Ưu tiên bàn VIP' },
        { id: 'd5', code: '6004022', name: 'Khoai Tây Chiên Lắc Phô Mai', quantity: 1, station: 'Bếp Chiên', targetMinutes: 5, isDone: false },
        { id: 'd6', code: '6005018', name: 'Trà Đào Cam Sả Tươi Mát', quantity: 2, station: 'Quầy Bar', targetMinutes: 4, isDone: true, doneAt: '12:01:20' }
      ]
    },
    {
      ticketId: 'TK-103',
      tableNumber: 'VIP 02',
      orderTime: '12:02:40',
      createdAtTimestamp: Date.now() - 6 * 60 * 1000 - 20 * 1000, // 6 phút 20 giây trước (Cảnh báo vàng)
      isPrioritized: false,
      dishes: [
        { id: 'd7', code: '6001208', name: 'Thăn Ngoại Bò Úc Ướp Muối Biển', quantity: 2, station: 'Bếp Nướng', targetMinutes: 6, isDone: false },
        { id: 'd8', code: '6002340', name: 'Nấm Kim Châm & Rau Tổng Hợp', quantity: 2, station: 'Bếp Lạnh', targetMinutes: 3, isDone: false, note: 'Rửa sạch' },
        { id: 'd9', code: '6003450', name: 'Mì Udon Xào Bò Bằm Teriyaki', quantity: 1, station: 'Bếp Nóng', targetMinutes: 7, isDone: false }
      ]
    }
  ]);

  // Bộ đếm thời gian thực chạy từng giây
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Bộ lọc cho Live KDS Screen
  const [liveQuayFilter, setLiveQuayFilter] = useState<string>('ALL');
  const [liveStatusFilter, setLiveStatusFilter] = useState<'ALL' | 'WAITING' | 'OVERDUE' | 'DONE'>('ALL');
  const [liveSearchQuery, setLiveSearchQuery] = useState<string>('');

  // Âm thanh / Dingdong giục món hoặc hoàn thành món
  const playSoundAlert = (type: 'dingdong' | 'done') => {
    try {
      if ('speechSynthesis' in window && type === 'dingdong') {
        const utter = new SpeechSynthesisUtterance('Ding Dong! Bàn đang giục món gấp!');
        utter.lang = 'vi-VN';
        utter.rate = 1.1;
        window.speechSynthesis.speak(utter);
      }
      // Dùng Web Audio API tạo âm thanh chuông beep vui tai
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (type === 'dingdong') {
          osc.frequency.setValueAtTime(880, ctx.currentTime); // Note A5
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // Note E5
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
        } else {
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          osc.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.1); // C6
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        }
      }
    } catch {
      // Ignored if browser blocks audio
    }
  };

  // Thao tác SubmitDish (Xong món hộ bếp - KDS Bypass)
  const handleDoneDish = (ticketId: string, dishId: string) => {
    setLiveTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId !== ticketId) return t;
        return {
          ...t,
          dishes: t.dishes.map((d) => {
            if (d.id !== dishId) return d;
            const now = new Date();
            const doneTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            return { ...d, isDone: true, doneAt: doneTime };
          })
        };
      })
    );
    playSoundAlert('done');
    onToast('🍳 Bếp đã xác nhận XONG MÓN (SubmitDish)! Đã đồng bộ đến màn hình phục vụ SO.', 'success');
  };

  // Thao tác Recall (Hoàn tác món)
  const handleRecallDish = (ticketId: string, dishId: string) => {
    setLiveTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId !== ticketId) return t;
        return {
          ...t,
          dishes: t.dishes.map((d) => {
            if (d.id !== dishId) return d;
            return { ...d, isDone: false, doneAt: undefined };
          })
        };
      })
    );
    onToast('↩️ Đã hoàn tác món về trạng thái đang chế biến.', 'info');
  };

  // Thao tác Done cả phiếu bàn
  const handleDoneEntireTicket = (ticketId: string) => {
    setLiveTickets((prev) =>
      prev.map((t) => {
        if (t.ticketId !== ticketId) return t;
        const now = new Date();
        const doneTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        return {
          ...t,
          dishes: t.dishes.map((d) => ({ ...d, isDone: true, doneAt: d.doneAt || doneTime }))
        };
      })
    );
    playSoundAlert('done');
    onToast('✅ Đã hoàn tất TOÀN BỘ MÓN của phiếu bàn!', 'success');
  };

  // Thao tác Giục món khẩn (DingDong / OrderPrioritizedPopup)
  const handleRushOrder = (ticketId: string, tableNumber: string) => {
    setLiveTickets((prev) =>
      prev.map((t) => (t.ticketId === ticketId ? { ...t, isPrioritized: true } : t))
    );
    playSoundAlert('dingdong');
    onToast(`🔔 ĐÃ BẮN LỆNH GIỤC MÓN KHẨN CHO ${tableNumber}! KDS hiển thị popup ưu tiên đỏ và phát chuông cảnh báo.`, 'info');
  };

  // Thêm một phiếu order mẫu mới
  const handleAddSampleTicket = () => {
    const tableId = `BÀN ${Math.floor(Math.random() * 25) + 1}`;
    const now = new Date();
    const orderTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newTicket: KitchenTicket = {
      ticketId: `TK-${Date.now().toString().slice(-4)}`,
      tableNumber: tableId,
      orderTime,
      createdAtTimestamp: Date.now(),
      isPrioritized: false,
      dishes: [
        { id: `d_${Date.now()}_1`, code: '6001201', name: 'Ba Chỉ Bò Mỹ Nướng Sốt Galbi', quantity: 2, station: 'Bếp Nướng', targetMinutes: 5, isDone: false },
        { id: `d_${Date.now()}_2`, code: '6003011', name: 'Lẩu Nấm Thượng Hạng', quantity: 1, station: 'Bếp Lẩu', targetMinutes: 6, isDone: false, note: 'Khách yêu cầu không ớt' },
        { id: `d_${Date.now()}_3`, code: '6005018', name: 'Trà Chanh Nhiệt Đới', quantity: 2, station: 'Quầy Bar', targetMinutes: 3, isDone: false }
      ]
    };
    setLiveTickets((prev) => [newTicket, ...prev]);
    onToast(`➕ Đã tạo thêm Phiếu Order mới cho ${tableId} để mô phỏng điều phối KDS.`, 'success');
  };

  // ── 8. LOGIC CHO SUB-TAB 4: CONFIG_COOKING & DISH SLA SETTINGS ──
  const [cookingSearch, setCookingSearch] = useState<string>('');
  const [cookingQuayFilter, setCookingQuayFilter] = useState<string>('ALL');
  const [editingCookingItem, setEditingCookingItem] = useState<{ [dishCode: string]: number }>({});
  const [savingDishCode, setSavingDishCode] = useState<string | null>(null);
  const [selectedCookingDishes, setSelectedCookingDishes] = useState<string[]>([]);

  // Danh sách món sau khi lọc tìm kiếm và quầy
  const filteredCookingDishes = useMemo(() => {
    if (!kdsData?.items) return [];
    return kdsData.items.filter((item) => {
      // Lọc theo quầy
      if (cookingQuayFilter !== 'ALL') {
        const hasQuay = item.quays?.includes(cookingQuayFilter) || item.group_type_kds === cookingQuayFilter;
        if (!hasQuay) return false;
      }
      // Lọc theo từ khóa tìm kiếm
      if (cookingSearch.trim()) {
        const q = cookingSearch.toLowerCase().trim();
        const nameMatch = (item.menu_item_name || '').toLowerCase().includes(q);
        const sapMatch = (item.sap_code || '').toLowerCase().includes(q);
        const rkMatch = (item.menu_item_code || '').toLowerCase().includes(q);
        return nameMatch || sapMatch || rkMatch;
      }
      return true;
    });
  }, [kdsData?.items, cookingQuayFilter, cookingSearch]);

  // Kiểm tra cảnh báo quầy mồ côi
  const orphanAccount = useMemo(() => {
    if (!kdsData?.accounts_summary) return null;
    return kdsData.accounts_summary.find((a) => a.is_orphan || a.account_id.startsWith('orphan_')) || null;
  }, [kdsData?.accounts_summary]);

  // Lưu nhanh thời gian nấu SLA inline
  const handleSaveCookingTime = async (dish: KdsItemDish) => {
    const hostToUse = targetHost || connectedHost;
    if (!hostToUse) {
      onToast('Chưa chọn IP MongoDB!', 'error');
      return;
    }
    const newMinutes = editingCookingItem[dish.menu_item_code];
    if (newMinutes === undefined || isNaN(newMinutes) || newMinutes < 0) {
      onToast('Vui lòng nhập số phút hợp lệ (>= 0)!', 'error');
      return;
    }
    setSavingDishCode(dish.menu_item_code);
    try {
      await mongoService.updateKdsCookingTime({
        host: hostToUse,
        port: 27017,
        menu_item_code: dish.menu_item_code,
        single_cooking_time: newMinutes
      });
      onToast(`Đã lưu thời gian nấu ${newMinutes} phút cho món: ${dish.menu_item_name || dish.menu_item_code}`, 'success');
      // Cập nhật state nội bộ
      if (kdsData?.items) {
        setKdsData({
          ...kdsData,
          items: kdsData.items.map((it) =>
            it.menu_item_code === dish.menu_item_code
              ? { ...it, single_cooking_time: newMinutes }
              : it
          )
        });
      }
    } catch (err: any) {
      onToast('Lỗi cập nhật thời gian nấu: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingDishCode(null);
    }
  };

  // Chọn tất cả món đang hiển thị
  const handleToggleSelectAllDishes = () => {
    if (selectedCookingDishes.length === filteredCookingDishes.length) {
      setSelectedCookingDishes([]);
    } else {
      setSelectedCookingDishes(filteredCookingDishes.map((d) => d.menu_item_code));
    }
  };

  // Chọn 1 món
  const handleToggleSelectDish = (dishCode: string) => {
    setSelectedCookingDishes((prev) =>
      prev.includes(dishCode) ? prev.filter((c) => c !== dishCode) : [...prev, dishCode]
    );
  };

  // ── 9. GIAO DIỆN CHÍNH ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HEADER BAR: THÔNG TIN NHÀ HÀNG, IP KDS & CÁC CÔNG CỤ ĐIỀU KHIỂN ĐỈNH */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Card style={{ padding: '14px 18px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Thông tin nhà hàng & IP KDS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ChefHat size={22} color="#D97706" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  {selectedRestaurant?.res || 'KDS NHÀ BẾP & ĐIỀU PHỐI MÓN'}
                </span>
                {selectedRestaurant?.sap && (
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600 }}>
                    SAP: {selectedRestaurant.sap}
                  </span>
                )}
                {selectedRestaurant?.rk7 && (
                  <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600 }}>
                    RK7: {selectedRestaurant.rk7}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '12px', color: '#64748B' }}>
                <span>Máy Chủ KDS Mongo:</span>
                <input
                  type="text"
                  value={targetHost}
                  onChange={(e) => setTargetHost(e.target.value)}
                  placeholder="10.x.x.41"
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    color: '#0F172A',
                    width: '130px'
                  }}
                />
                {/* Nút gợi ý nhanh trạm .41, .42, .11 */}
                {ipPrefix && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {['41', '42', '11'].map((suffix) => {
                      const candidateIp = `${ipPrefix}${suffix}`;
                      const isActive = targetHost === candidateIp;
                      return (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => {
                            setTargetHost(candidateIp);
                            fetchKdsAllData(candidateIp);
                          }}
                          style={{
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: isActive ? '1px solid #D97706' : '1px solid #E2E8F0',
                            backgroundColor: isActive ? '#FEF3C7' : '#F8FAFC',
                            color: isActive ? '#92400E' : '#475569',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer'
                          }}
                        >
                          .{suffix}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fetchKdsAllData()}
                  disabled={loading}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#2563EB',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                    fontSize: '11.5px',
                    marginLeft: '4px'
                  }}
                  title="Tải lại toàn bộ dữ liệu KDS"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Công cụ trạng thái Master, In ấn & Điều khiển từ xa */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Switch KDS Master Status */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 12px',
              borderRadius: '8px',
              backgroundColor: kdsMasterEnabled ? '#ECFDF5' : '#FEF2F2',
              border: kdsMasterEnabled ? '1px solid #A7F3D0' : '1px solid #FECACA'
            }}>
              <Power size={15} color={kdsMasterEnabled ? '#059669' : '#DC2626'} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#64748B' }}>
                  KDS Master (SHOW_KDS)
                </span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: kdsMasterEnabled ? '#065F46' : '#991B1B' }}>
                  {kdsMasterEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMaster}
                disabled={togglingMaster}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: kdsMasterEnabled ? '#DC2626' : '#059669',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: '4px',
                  transition: 'all 0.15s ease'
                }}
              >
                {togglingMaster ? '...' : kdsMasterEnabled ? 'Tắt KDS' : 'Bật KDS'}
              </button>
            </div>

            {/* Quản lý máy in bếp Port 9100 */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPrintModal(true)}
              leftIcon={<Printer size={14} color="#2563EB" />}
              style={{ borderColor: '#93C5FD', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}
              title="Quản lý và kiểm tra kết nối các máy in nhiệt bếp Port 9100"
            >
              Máy In Bếp (9100)
            </Button>

            {/* Điều khiển từ xa VNC / Scrcpy KDS */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowVncModal(true)}
              leftIcon={<Monitor size={14} color="#7C3AED" />}
              style={{ borderColor: '#DDD6FE', backgroundColor: '#F5F3FF', color: '#6D28D9', fontWeight: 700 }}
              title="Mở màn hình điều khiển từ xa VNC máy chủ hoặc Scrcpy tablet KDS"
            >
              VNC / Scrcpy KDS
            </Button>

            {/* Nút Xem sổ tay KDS */}
            <button
              type="button"
              onClick={() => setShowKdsGuide(!showKdsGuide)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: showKdsGuide ? '#F1F5F9' : '#FFFFFF',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Xem giải thích cơ chế Role 2 vs 3, Food Control, placeParent và quy trình Done món"
            >
              <Info size={14} color="#2563EB" />
              <span>{showKdsGuide ? 'Ẩn Sổ Tay' : '📖 Sổ Tay KDS'}</span>
            </button>
          </div>
        </div>

        {/* CẨM NANG & SỔ TAY KDS EXPANDABLE */}
        {showKdsGuide && (
          <div style={{
            marginTop: '14px',
            padding: '14px 16px',
            borderRadius: '8px',
            backgroundColor: '#F8FAFC',
            border: '1.5px solid #CBD5E1',
            fontSize: '12px',
            lineHeight: 1.6,
            color: '#334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '13px', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={16} color="#D97706" /> SỔ TAY CƠ CHẾ HOẠT ĐỘNG &amp; THÔNG SỐ KDS GOLDEN GATE
              </span>
              <button
                type="button"
                onClick={() => setShowKdsGuide(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
              >
                Đóng [×]
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#D97706' }}>👑 1. Role 2 (Food Control) vs Role 3 (Quầy Phụ):</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  Role 2 là trạm điều phối tổng, quan sát tiến độ toàn bộ các quầy con trong danh sách <code>listPlace</code>. Khi Food Control bấm Done, món ở quầy phụ tự động Done theo. Role 3 là quầy chế biến trực tiếp (Bếp Nóng, Lạnh, Nướng...), chỉ thấy món thuộc quầy mình.
                </p>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#2563EB' }}>🔗 2. placeParent = "101" &amp; Sảnh phục vụ:</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  Mã <code>101</code> là accId của Food Control. Các quầy con mang <code>placeParent: "101"</code> sẽ chịu sự đồng bộ tiến độ từ Food Control. <code>hallPlanIds</code> chứa danh sách các tầng/khu vực nhận order.
                </p>
              </div>
              <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                <strong style={{ color: '#059669' }}>⚡ 3. Đồng Bộ &amp; Máy In Bếp:</strong>
                <p style={{ margin: '4px 0 0 0' }}>
                  Khi order gửi từ Tablet CO hoặc SO, POS lưu vào <code>G_ORDER</code>, gửi MQTT broker tới KDS hiển thị và phát lệnh in nhiệt Port 9100 đến các quầy bếp tương ứng.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUB-TABS NAVIGATION: 4 PHÂN HỆ CHUYÊN BIỆT CỦA KDS                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        borderBottom: '2px solid #E2E8F0',
        paddingBottom: '0px',
        backgroundColor: '#FFFFFF',
        borderRadius: '8px 8px 0 0',
        padding: '6px 12px 0 12px'
      }}>
        <button
          type="button"
          onClick={() => setSubTab('live_kds')}
          style={{
            padding: '9px 16px',
            fontSize: '13.5px',
            fontWeight: subTab === 'live_kds' ? 700 : 500,
            color: subTab === 'live_kds' ? '#D97706' : '#64748B',
            borderBottom: subTab === 'live_kds' ? '3px solid #D97706' : '3px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Flame size={16} color={subTab === 'live_kds' ? '#D97706' : '#64748B'} />
          <span>1. Màn Hình KDS &amp; Điều Phối Bếp (Live Screen)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('analytics_logs')}
          style={{
            padding: '9px 16px',
            fontSize: '13.5px',
            fontWeight: subTab === 'analytics_logs' ? 700 : 500,
            color: subTab === 'analytics_logs' ? '#4338CA' : '#64748B',
            borderBottom: subTab === 'analytics_logs' ? '3px solid #4338CA' : '3px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={16} color={subTab === 'analytics_logs' ? '#4338CA' : '#64748B'} />
          <span>2. Tra Cứu Logs &amp; Thống Kê Bếp (Logs &amp; Analytics)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('places_accounts')}
          style={{
            padding: '9px 16px',
            fontSize: '13.5px',
            fontWeight: subTab === 'places_accounts' ? 700 : 500,
            color: subTab === 'places_accounts' ? '#059669' : '#64748B',
            borderBottom: subTab === 'places_accounts' ? '3px solid #059669' : '3px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Layers size={16} color={subTab === 'places_accounts' ? '#059669' : '#64748B'} />
          <span>3. Quản Lý Quầy Bếp &amp; Phân Quyền (Places &amp; Accounts)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('cooking_sla')}
          style={{
            padding: '9px 16px',
            fontSize: '13.5px',
            fontWeight: subTab === 'cooking_sla' ? 700 : 500,
            color: subTab === 'cooking_sla' ? '#2563EB' : '#64748B',
            borderBottom: subTab === 'cooking_sla' ? '3px solid #2563EB' : '3px solid transparent',
            marginBottom: '-2px',
            backgroundColor: 'transparent',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Utensils size={16} color={subTab === 'cooking_sla' ? '#2563EB' : '#64748B'} />
          <span>4. Cấu Hình Món &amp; Thời Gian Nấu SLA (CONFIG_COOKING)</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 1: MÀN HÌNH TRỰC QUAN KDS (LIVE KDS SCREEN & GIẢ LẬP ĐIỀU PHỐI) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'live_kds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Thanh công cụ lọc & thao tác nhanh trên màn hình bếp */}
          <Card style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              {/* Bộ lọc Quầy Bếp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Filter size={14} /> Quầy:
                </span>
                {['ALL', 'Bếp Nướng', 'Bếp Lẩu', 'Bếp Nóng', 'Bếp Lạnh', 'Bếp Chiên', 'Quầy Bar'].map((qName) => {
                  const isSel = liveQuayFilter === qName;
                  return (
                    <button
                      key={qName}
                      type="button"
                      onClick={() => setLiveQuayFilter(qName)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: isSel ? '1px solid #D97706' : '1px solid #CBD5E1',
                        backgroundColor: isSel ? '#D97706' : '#F8FAFC',
                        color: isSel ? '#FFFFFF' : '#334155',
                        fontSize: '11.5px',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {qName === 'ALL' ? 'Tất cả quầy' : qName}
                    </button>
                  );
                })}
              </div>

              {/* Bộ lọc trạng thái & Thao tác thêm phiếu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Trạng thái:</span>
                  <select
                    value={liveStatusFilter}
                    onChange={(e: any) => setLiveStatusFilter(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A'
                    }}
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="WAITING">Đang chờ nấu</option>
                    <option value="OVERDUE">Quá hạn SLA (&gt;10p)</option>
                    <option value="DONE">Đã hoàn thành (Done)</option>
                  </select>
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={liveSearchQuery}
                    onChange={(e) => setLiveSearchQuery(e.target.value)}
                    placeholder="Tìm bàn / tên món..."
                    style={{
                      padding: '4px 8px 4px 26px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      width: '160px'
                    }}
                  />
                </div>

                {/* Nút giả lập thêm phiếu order mới */}
                <Button
                  size="sm"
                  onClick={handleAddSampleTicket}
                  leftIcon={<PlusCircle size={14} />}
                  style={{ backgroundColor: '#059669', color: '#fff', fontWeight: 700 }}
                  title="Thêm một phiếu order mẫu để thử nghiệm tính năng điều phối KDS"
                >
                  + Phiếu Order Mẫu
                </Button>
              </div>
            </div>
          </Card>

          {/* Grid hiển thị các Thẻ Phiếu Gọi Món (Kitchen Ticket Cards) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '14px',
            alignItems: 'stretch'
          }}>
            {liveTickets
              .filter((ticket) => {
                if (liveSearchQuery.trim()) {
                  const q = liveSearchQuery.toLowerCase().trim();
                  const matchTable = ticket.tableNumber.toLowerCase().includes(q);
                  const matchDish = ticket.dishes.some((d) => d.name.toLowerCase().includes(q));
                  if (!matchTable && !matchDish) return false;
                }
                if (liveQuayFilter !== 'ALL') {
                  const hasStationDish = ticket.dishes.some((d) => d.station === liveQuayFilter);
                  if (!hasStationDish) return false;
                }
                const hasPending = ticket.dishes.some((d) => !d.isDone);
                const elapsedSec = Math.floor((nowTimestamp - ticket.createdAtTimestamp) / 1000);
                if (liveStatusFilter === 'WAITING' && !hasPending) return false;
                if (liveStatusFilter === 'OVERDUE' && (!hasPending || elapsedSec < 10 * 60)) return false;
                if (liveStatusFilter === 'DONE' && hasPending) return false;
                return true;
              })
              .map((ticket) => {
                const elapsedSec = Math.max(0, Math.floor((nowTimestamp - ticket.createdAtTimestamp) / 1000));
                const elapsedMin = Math.floor(elapsedSec / 60);
                const elapsedRemainderSec = elapsedSec % 60;
                const formattedTime = `${String(elapsedMin).padStart(2, '0')}:${String(elapsedRemainderSec).padStart(2, '0')}`;

                // Trạng thái SLA
                const isOverdue = elapsedMin >= 10;
                const isWarning = elapsedMin >= 5 && elapsedMin < 10;
                const allDone = ticket.dishes.every((d) => d.isDone);

                return (
                  <div
                    key={ticket.ticketId}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '10px',
                      border: ticket.isPrioritized
                        ? '2px solid #EF4444'
                        : isOverdue && !allDone
                        ? '2px solid #DC2626'
                        : '1px solid #E2E8F0',
                      boxShadow: ticket.isPrioritized || (isOverdue && !allDone)
                        ? '0 4px 12px rgba(220, 38, 38, 0.15)'
                        : '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header Phiếu Bếp */}
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: ticket.isPrioritized
                        ? '#FEF2F2'
                        : allDone
                        ? '#F0FDF4'
                        : isOverdue
                        ? '#FFF1F2'
                        : isWarning
                        ? '#FFFBEB'
                        : '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: 900,
                          color: ticket.isPrioritized ? '#B91C1C' : '#0F172A',
                          letterSpacing: '0.02em'
                        }}>
                          {ticket.tableNumber}
                        </span>
                        {ticket.isPrioritized && (
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#DC2626',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 800
                          }}>
                            GIỤC KHẨN
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Đồng hồ đếm thời gian thực */}
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: 800,
                          backgroundColor: allDone
                            ? '#DCFCE7'
                            : isOverdue
                            ? '#FEE2E2'
                            : isWarning
                            ? '#FEF3C7'
                            : '#E0E7FF',
                          color: allDone
                            ? '#166534'
                            : isOverdue
                            ? '#991B1B'
                            : isWarning
                            ? '#92400E'
                            : '#3730A3'
                        }}>
                          {allDone ? '✓ ĐÃ RA HẾT' : `⏱ ${formattedTime}`}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRushOrder(ticket.ticketId, ticket.tableNumber)}
                          style={{
                            border: 'none',
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                            padding: '4px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Bắn lệnh giục món khẩn (DingDong / Pop-up đỏ) xuống KDS"
                        >
                          <Bell size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Danh sách món ăn trong phiếu */}
                    <div style={{ padding: '10px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {ticket.dishes.map((dish) => {
                        return (
                          <div
                            key={dish.id}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '6px',
                              backgroundColor: dish.isDone ? '#F8FAFC' : '#FFFFFF',
                              border: dish.isDone ? '1px dashed #CBD5E1' : '1px solid #E2E8F0',
                              opacity: dish.isDone ? 0.65 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 800,
                                  color: '#059669',
                                  backgroundColor: '#ECFDF5',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {dish.quantity}x
                                </span>
                                <span style={{
                                  fontSize: '12.5px',
                                  fontWeight: 700,
                                  color: dish.isDone ? '#64748B' : '#0F172A',
                                  textDecoration: dish.isDone ? 'line-through' : 'none'
                                }}>
                                  {dish.name}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', fontSize: '11px', color: '#64748B' }}>
                                <span style={{ padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontWeight: 600 }}>
                                  {dish.station}
                                </span>
                                {dish.note && (
                                  <span style={{ color: '#D97706', fontWeight: 600 }}>
                                    ★ {dish.note}
                                  </span>
                                )}
                                {dish.isDone && dish.doneAt && (
                                  <span style={{ color: '#059669', fontWeight: 600 }}>
                                    (Done: {dish.doneAt})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Nút hành động từng món */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                              {dish.isDone ? (
                                <button
                                  type="button"
                                  onClick={() => handleRecallDish(ticket.ticketId, dish.id)}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#FFFFFF',
                                    color: '#475569',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title="Hoàn tác món về trạng thái đang nấu"
                                >
                                  <RotateCcw size={11} /> Hoàn tác
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDoneDish(ticket.ticketId, dish.id)}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '5px',
                                    border: 'none',
                                    backgroundColor: '#059669',
                                    color: '#FFFFFF',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 1px 2px rgba(5,150,105,0.2)'
                                  }}
                                  title="Xác nhận xong món hộ bếp (KDS Bypass / SubmitDish)"
                                >
                                  <Check size={13} /> Xong Món
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer Thao Tác Cả Phiếu */}
                    <div style={{
                      padding: '8px 14px',
                      backgroundColor: '#F8FAFC',
                      borderTop: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Giờ gọi: {ticket.orderTime}
                      </span>
                      {!allDone && (
                        <button
                          type="button"
                          onClick={() => handleDoneEntireTicket(ticket.ticketId)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '5px',
                            border: '1px solid #10B981',
                            backgroundColor: '#ECFDF5',
                            color: '#065F46',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCheck size={13} color="#059669" />
                          <span>Done Toàn Phiếu</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 2: TRA CỨU LOGS & THỐNG KÊ BẾP (LOGS & ANALYTICS)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'analytics_logs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 2 Khung Nghiệp Vụ Chính: Logs Chi Tiết & Phân Tích Món Vào Bếp */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {/* Khung 1: Logs Order & Ra Món */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} color="#4338CA" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                      1. Tra Cứu Logs KDS (Order &amp; Ra Món)
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Bảng G_KITCHEN.LOG_DISH_FINISH_ITEM &amp; G_ORDER
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  Truy vết chi tiết từng món: thời điểm khách gọi trên tablet/SO, giờ lệnh tới KDS bếp, thời điểm nhân viên bếp thực tế bấm DONE, thời gian thực tế so với chuẩn SLA và trạng thái lệnh in nhiệt.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowLogsModal(true)}
                leftIcon={<Clock size={14} />}
                style={{ backgroundColor: '#4338CA', color: '#FFFFFF', fontWeight: 700 }}
              >
                Mở Tra Cứu Logs KDS Chi Tiết ➔
              </Button>
            </div>

            {/* Khung 2: Phân Tích Món Vào Bếp */}
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={18} color="#D97706" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                      2. Phân Tích Món &amp; Lượt Vào Bếp
                    </h3>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Thống kê tải bếp 1 ngày hoặc 2-5 ngày liên tiếp
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  Thống kê tổng số lượng món và số lượt gửi vào bếp theo từng khung giờ cao điểm (Trưa 11h-13h, Tối 18h-20h), giúp quản lý nhà hàng đánh giá áp lực chế biến và phân bổ nhân sự hợp lý.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowIntakeModal(true)}
                leftIcon={<BarChart3 size={14} />}
                style={{ backgroundColor: '#D97706', color: '#FFFFFF', fontWeight: 700 }}
              >
                Mở Phân Tích Món Vào Bếp ➔
              </Button>
            </div>
          </div>

          {/* Bảng Thống Kê Hiệu Suất SLA Thời Gian Nấu Theo Quầy Bếp */}
          <Card style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#059669" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Thống Kê Cấu Hình SLA &amp; Thời Gian Chế Biến Theo Quầy Bếp
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Tổng số món trong bếp: <strong>{kdsData?.items?.length || 0} món</strong>
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Quầy Bếp (Line Cook)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Số Món Quản Lý</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Thời Gian SLA Trung Bình</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Phân Bố Món Nhanh (&lt;5p)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Phân Bố Món Lâu (&gt;10p)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {(kdsData?.accounts_summary || []).map((acc) => {
                    const quayDishes = (kdsData?.items || []).filter(
                      (it) => it.quays?.includes(acc.account_name) || it.group_type_kds === acc.account_name
                    );
                    const avgTime = quayDishes.length
                      ? Math.round(quayDishes.reduce((sum, d) => sum + (d.single_cooking_time || 0), 0) / quayDishes.length)
                      : 0;
                    const fastCount = quayDishes.filter((d) => (d.single_cooking_time || 0) <= 5).length;
                    const slowCount = quayDishes.filter((d) => (d.single_cooking_time || 0) >= 10).length;

                    return (
                      <tr key={acc.account_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0F172A' }}>
                          {acc.account_name}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#F1F5F9', fontWeight: 700, color: '#334155' }}>
                            {quayDishes.length} món
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                          ~{avgTime} phút / món
                        </td>
                        <td style={{ padding: '9px 12px', color: '#059669', fontWeight: 600 }}>
                          {fastCount} món ({quayDishes.length ? Math.round((fastCount / quayDishes.length) * 100) : 0}%)
                        </td>
                        <td style={{ padding: '9px 12px', color: '#DC2626', fontWeight: 600 }}>
                          {slowCount} món ({quayDishes.length ? Math.round((slowCount / quayDishes.length) * 100) : 0}%)
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: acc.role === 1 ? '#FEF3C7' : '#ECFDF5',
                            color: acc.role === 1 ? '#92400E' : '#065F46'
                          }}>
                            {acc.role === 1 ? 'Food Control' : 'Line Cook Chuẩn'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 3: QUẢN LÝ QUẦY BẾP & PHÂN QUYỀN (PLACES & ACCOUNTS)        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'places_accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Thanh tác vụ quản trị quầy & tài khoản */}
          <Card style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#059669" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  Quản Trị Quầy Bếp (CONFIG_KDS) &amp; Tài Khoản Trạm (ACCOUNT)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Nút Thêm Quầy */}
                <Button
                  size="sm"
                  onClick={() => setShowAddQuayModal(true)}
                  leftIcon={<PlusCircle size={14} />}
                  style={{ backgroundColor: '#059669', color: '#FFFFFF', fontWeight: 700 }}
                >
                  + Thêm Quầy Bếp
                </Button>

                {/* Nút Quản Lý Quầy & Đồng Bộ */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQuayListModal(true)}
                  leftIcon={<Layers size={14} color="#2563EB" />}
                  style={{ borderColor: '#93C5FD', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}
                >
                  Quản Lý Quầy &amp; Tên HOA
                </Button>

                {/* Nút Khởi Tạo Food Control */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateFoodControlModal(true)}
                  leftIcon={<ChefHat size={14} color="#D97706" />}
                  style={{ borderColor: '#FCD34D', backgroundColor: '#FFFBEB', color: '#92400E', fontWeight: 700 }}
                >
                  👑 Khởi Tạo Food Control
                </Button>

                {/* Nút Phân Quyền & Đổi Pass KDS */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRoleUserModal(true)}
                  leftIcon={<ShieldCheck size={14} color="#7C3AED" />}
                  style={{ borderColor: '#DDD6FE', backgroundColor: '#F5F3FF', color: '#6D28D9', fontWeight: 700 }}
                >
                  🔑 Phân Quyền &amp; Mật Khẩu
                </Button>

                {/* Nút Phân Quyền Hàng Loạt */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBatchRoleModal(true)}
                  style={{ borderColor: '#F59E0B', color: '#92400E', backgroundColor: '#FEF3C7', fontWeight: 700 }}
                >
                  ⚡ Phân Quyền Hàng Loạt
                </Button>

                {/* Nút Đồng Bộ Nhóm Bếp Theo Quầy */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncGroups}
                  disabled={isSyncingGroups}
                  leftIcon={<RefreshCw size={14} className={isSyncingGroups ? 'animate-spin' : ''} />}
                  style={{ borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700 }}
                >
                  {isSyncingGroups ? 'Đang đồng bộ...' : 'Đồng Nhất Nhóm Bếp (1-Chạm)'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Bảng 1: Danh Sách Quầy Bếp (places trong CONFIG_KDS) */}
          <Card style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                Danh Sách Quầy Bếp (CONFIG_KDS.places)
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Tổng cộng: <strong>{places.length} quầy</strong>
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Mã Quầy (ID)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Tên Quầy</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Mã Ký Hiệu</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Máy In Bếp</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Sảnh Phục Vụ (Halls)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Số Món Đang Gán</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Food Control</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map((place) => {
                    const assignedDishCount = (kdsData?.items || []).filter(
                      (it) => it.place_ids?.includes(place.id) || it.quays?.includes(place.name)
                    ).length;

                    return (
                      <tr key={place.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#475569' }}>
                          #{place.id}
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0F172A' }}>
                          {place.name}
                        </td>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', color: '#64748B' }}>
                          {place.place_code || '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', fontSize: '11px', fontFamily: 'monospace' }}>
                            {place.printer || 'Chưa gán máy in'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: '11px', color: '#64748B' }}>
                          {place.hall_plan_ids?.length ? `Sảnh [${place.hall_plan_ids.join(', ')}]` : 'Tất cả sảnh'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#065F46', fontWeight: 700, fontSize: '11.5px' }}>
                            {assignedDishCount} món
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {place.is_in_food_control ? (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', fontWeight: 700, fontSize: '11px' }}>
                              ✓ Thuộc FC
                            </span>
                          ) : (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: '11px' }}>
                              Độc lập
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferFromPlaceId(place.id);
                              setShowTransferQuayModal(true);
                            }}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#2563EB',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <ArrowRightLeft size={11} /> Chuyển món
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Bảng 2: Danh Sách Tài Khoản KDS (ACCOUNT - G_KITCHEN) */}
          <Card style={{ padding: '16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                Danh Sách Tài Khoản Trạm Bếp (G_KITCHEN.ACCOUNT)
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Hiển thị mật khẩu trực tiếp (không che) phục vụ kỹ thuật hỗ trợ nhanh
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Tên Tài Khoản</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Mật Khẩu Trạm</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Tên Đầy Đủ / Quầy</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Vai Trò (Role)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Danh Sách Quầy (listPlace)</th>
                    <th style={{ padding: '8px 12px', fontWeight: 700, color: '#475569' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(kdsData?.accounts_summary || []).map((acc) => {
                    const isFc = acc.role === 1 || acc.account_name.toLowerCase().includes('food control');
                    return (
                      <tr key={acc.account_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                          {acc.account_id}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              backgroundColor: '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              color: '#B91C1C',
                              fontSize: '12px'
                            }}>
                              {acc.acc_pass || '(trống)'}
                            </span>
                            {acc.acc_pass && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(acc.acc_pass || '');
                                  onToast(`Đã copy pass của ${acc.account_id}`, 'success');
                                }}
                                style={{ border: 'none', background: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                title="Sao chép mật khẩu"
                              >
                                <Copy size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#334155' }}>
                          {acc.account_name}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isFc ? '#FEF3C7' : '#EFF6FF',
                            color: isFc ? '#92400E' : '#1D4ED8'
                          }}>
                            {isFc ? 'Role 1 / 2 (Food Control)' : 'Role 3 (Line Cook / Quầy Phụ)'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: '11.5px', color: '#64748B' }}>
                          {acc.place_ids?.length ? `ID: ${acc.place_ids.join(', ')}` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <button
                            type="button"
                            onClick={() => setShowRoleUserModal(true)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#7C3AED',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Đổi Pass / Phân Quyền
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUB-TAB 4: CẤU HÌNH MÓN ĂN & THỜI GIAN NẤU SLA (CONFIG_COOKING)      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {subTab === 'cooking_sla' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Banner cảnh báo phát hiện quầy mồ côi (nếu có) */}
          {orphanAccount && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              fontSize: '12.5px',
              color: '#92400E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Cảnh báo dữ liệu Quầy KDS:</strong> Phát hiện có món ăn đang trỏ vào Quầy chưa khai báo hoặc đã bị xóa dưới nhà hàng (Place #{orphanAccount.place_ids?.join(', ')}).
                  <div style={{ fontSize: '11.5px', marginTop: '2px', opacity: 0.9 }}>
                    Bạn có thể bấm nút bên phải để gom chuyển toàn bộ các món này sang Quầy chuẩn để tránh lỗi hiển thị trên KDS.
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setTransferFromPlaceId(orphanAccount.place_ids?.[0] ?? null);
                  setShowTransferQuayModal(true);
                }}
                leftIcon={<ArrowRightLeft size={14} />}
                style={{ backgroundColor: '#D97706', color: '#FFFFFF', fontWeight: 700 }}
              >
                Gom Chuyển Quầy Mồ Côi Ngay ➔
              </Button>
            </div>
          )}

          {/* Quick Filters theo Quầy Bếp (accounts_summary) */}
          <Card style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={14} color="#059669" /> Quầy Bếp:
              </span>
              <button
                type="button"
                onClick={() => setCookingQuayFilter('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: cookingQuayFilter === 'ALL' ? '1px solid #059669' : '1px solid #CBD5E1',
                  backgroundColor: cookingQuayFilter === 'ALL' ? '#059669' : '#F8FAFC',
                  color: cookingQuayFilter === 'ALL' ? '#FFFFFF' : '#334155',
                  fontSize: '11.5px',
                  fontWeight: cookingQuayFilter === 'ALL' ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                Tất cả quầy ({kdsData?.items?.length || 0})
              </button>
              {(kdsData?.accounts_summary || []).map((acc) => {
                const isSel = cookingQuayFilter === acc.account_name;
                const isOrphan = Boolean(acc.is_orphan || acc.account_id.startsWith('orphan_'));
                return (
                  <button
                    key={acc.account_id}
                    type="button"
                    onClick={() => setCookingQuayFilter(isSel ? 'ALL' : acc.account_name)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      border: isOrphan
                        ? (isSel ? '1.5px solid #D97706' : '1.5px solid #F59E0B')
                        : (isSel ? '1px solid #059669' : '1px solid #CBD5E1'),
                      backgroundColor: isOrphan
                        ? (isSel ? '#D97706' : '#FEF3C7')
                        : (isSel ? '#059669' : '#F8FAFC'),
                      color: isOrphan
                        ? (isSel ? '#FFFFFF' : '#92400E')
                        : (isSel ? '#FFFFFF' : '#334155'),
                      fontSize: '11.5px',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isOrphan && <AlertTriangle size={11} />}
                    <span>{acc.account_name}</span>
                    <span style={{
                      padding: '1px 5px',
                      borderRadius: '8px',
                      backgroundColor: isSel ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                      fontSize: '10.5px',
                      fontWeight: 700
                    }}>
                      {acc.dish_count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Thanh Công Cụ Quản Lý Món Bếp (Thêm món, Chuyển quầy, Xóa) */}
          <Card style={{ padding: '12px 16px', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Ô tìm kiếm món */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={cookingSearch}
                    onChange={(e) => setCookingSearch(e.target.value)}
                    placeholder="Tìm tên món, SAP, RK7..."
                    style={{
                      padding: '5px 8px 5px 28px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      width: '220px'
                    }}
                  />
                </div>

                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Hiển thị: <strong>{filteredCookingDishes.length}</strong> / {kdsData?.items?.length || 0} món
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Nút Thêm Món Vào KDS */}
                <Button
                  size="sm"
                  onClick={() => setShowAddDishModal(true)}
                  leftIcon={<PlusCircle size={14} />}
                  style={{ backgroundColor: '#059669', color: '#FFFFFF', fontWeight: 700 }}
                  title="Thêm món mới vào hệ thống KDS (gán quầy bếp và cấu hình thời gian chế biến)"
                >
                  + Thêm Món Vào KDS
                </Button>

                {/* Nút Chuyển Quầy Nhiều Món */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTransferSelectedDishes(selectedCookingDishes);
                    setShowTransferQuayModal(true);
                  }}
                  disabled={selectedCookingDishes.length === 0}
                  leftIcon={<ArrowRightLeft size={14} />}
                  style={{ borderColor: '#93C5FD', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}
                >
                  Chuyển Quầy ({selectedCookingDishes.length})
                </Button>

                {/* Nút Xóa Cấu Hình KDS */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteCookingModal(true)}
                  disabled={selectedCookingDishes.length === 0}
                  leftIcon={<Trash2 size={14} color="#DC2626" />}
                  style={{ borderColor: '#FECACA', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 700 }}
                >
                  Xóa Cấu Hình ({selectedCookingDishes.length})
                </Button>
              </div>
            </div>
          </Card>

          {/* Bảng dữ liệu CONFIG_COOKING bọc trong TopScrollTable (Tuân thủ Quy tắc 8) */}
          <TopScrollTable maxHeight="calc(100vh - 360px)">
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{
                  backgroundColor: '#F8FAFC',
                  borderBottom: '2px solid #E2E8F0',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={handleToggleSelectAllDishes}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {selectedCookingDishes.length > 0 && selectedCookingDishes.length === filteredCookingDishes.length ? (
                        <CheckSquare size={16} color="#059669" />
                      ) : (
                        <Square size={16} color="#94A3B8" />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '40px' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '90px' }}>Mã SAP</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '90px' }}>Mã RK7</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', minWidth: '220px' }}>Tên Món Ăn</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '140px' }}>Quầy Phụ Trách</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '130px' }}>Nhóm Bếp</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '160px' }}>SLA Nấu (Phút)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', width: '110px' }}>Giá GPOS</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#475569', width: '100px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredCookingDishes.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                      <Utensils size={32} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                      <div>Không tìm thấy món ăn nào phù hợp với điều kiện lọc!</div>
                    </td>
                  </tr>
                ) : (
                  filteredCookingDishes.map((dish, idx) => {
                    const isSelected = selectedCookingDishes.includes(dish.menu_item_code);
                    const currentMinutes = editingCookingItem[dish.menu_item_code] !== undefined
                      ? editingCookingItem[dish.menu_item_code]
                      : (dish.single_cooking_time ?? 0);
                    const isModified = editingCookingItem[dish.menu_item_code] !== undefined &&
                      editingCookingItem[dish.menu_item_code] !== dish.single_cooking_time;
                    const isSaving = savingDishCode === dish.menu_item_code;

                    return (
                      <tr
                        key={dish.menu_item_code}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          backgroundColor: isSelected ? '#F0FDF4' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                        }}
                      >
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectDish(dish.menu_item_code)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            {isSelected ? <CheckSquare size={16} color="#059669" /> : <Square size={16} color="#CBD5E1" />}
                          </button>
                        </td>
                        <td style={{ padding: '8px 10px', color: '#94A3B8', fontSize: '11px' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                          {dish.sap_code || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                          {dish.menu_item_code}
                        </td>
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0F172A' }}>
                          {dish.menu_item_name || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            fontWeight: 700,
                            fontSize: '11.5px'
                          }}>
                            {dish.quays?.join(', ') || 'Chưa gán quầy'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '11.5px', color: '#64748B' }}>
                          {dish.group_type_kds || '—'}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {/* Ô nhập thời gian nấu SLA inline */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={currentMinutes}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setEditingCookingItem((prev) => ({
                                  ...prev,
                                  [dish.menu_item_code]: isNaN(val) ? 0 : val
                                }));
                              }}
                              style={{
                                width: '56px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                border: isModified ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                                backgroundColor: isModified ? '#EFF6FF' : '#FFFFFF',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                textAlign: 'center'
                              }}
                            />
                            <span style={{ fontSize: '11px', color: '#64748B' }}>phút</span>
                            {isModified && (
                              <button
                                type="button"
                                onClick={() => handleSaveCookingTime(dish)}
                                disabled={isSaving}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  backgroundColor: '#059669',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                                title="Lưu thời gian nấu mới"
                              >
                                <Save size={12} /> {isSaving ? '...' : 'Lưu'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                          {(dish.final_price || dish.price_order) ? `${(dish.final_price || dish.price_order)!.toLocaleString('vi-VN')} đ` : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferSelectedDishes([dish.menu_item_code]);
                              setShowTransferQuayModal(true);
                            }}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#2563EB',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              fontWeight: 600,
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px'
                            }}
                            title="Chuyển món sang quầy khác"
                          >
                            <ArrowRightLeft size={12} /> Đổi quầy
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </TopScrollTable>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* KHAI BÁO CÁC MODAL KDS TOÀN DIỆN                                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. Modal Thêm Quầy Bếp Mới */}
      <KdsAddQuayModal
        isOpen={showAddQuayModal}
        onClose={() => setShowAddQuayModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        availablePrinters={printers}
        hasFoodControl={Boolean(places.some((p) => p.is_in_food_control))}
        onSuccess={() => fetchKdsAllData()}
        showToast={onToast}
      />

      {/* 2. Modal Quản Lý Danh Sách Quầy */}
      <KdsQuayListModal
        isOpen={showQuayListModal}
        onClose={() => setShowQuayListModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        places={places}
        printers={printers}
        onOpenAddQuay={() => {
          setShowQuayListModal(false);
          setShowAddQuayModal(true);
        }}
        onRefresh={() => fetchKdsAllData()}
        showToast={onToast}
      />

      {/* 3. Modal Phân Quyền & Đổi Pass KDS */}
      <KdsRoleUserModal
        isOpen={showRoleUserModal}
        onClose={() => setShowRoleUserModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        restaurantId={selectedRestaurant?.id}
        restaurantCode={selectedRestaurant?.sap || selectedRestaurant?.rk7 || undefined}
        title="Phân Quyền &amp; Đổi Mật Khẩu KDS"
        showToast={onToast}
      />

      {/* 4. Modal Khởi Tạo Food Control */}
      <ModalCreateFoodControl
        isOpen={showCreateFoodControlModal}
        onClose={() => setShowCreateFoodControlModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        restaurantName={selectedRestaurant?.res || ''}
        defaultPrinters={printers}
        existingPlacesCount={places.length}
        onSuccess={() => fetchKdsAllData()}
        onToast={onToast}
      />

      {/* 5. Modal Chuyển Quầy Món Ăn */}
      <KdsTransferQuayModal
        isOpen={showTransferQuayModal}
        onClose={() => setShowTransferQuayModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        places={places}
        initialFromPlaceId={transferFromPlaceId}
        selectedDishCodes={transferSelectedDishes.length > 0 ? transferSelectedDishes : undefined}
        dishItems={kdsData?.items || []}
        onSuccess={() => {
          setSelectedCookingDishes([]);
          fetchKdsAllData();
        }}
        showToast={onToast}
      />

      {/* 6. Modal Tra Cứu Logs KDS Chi Tiết */}
      <KdsLogsModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        restaurantName={selectedRestaurant?.res || ''}
        showToast={onToast}
      />

      {/* 7. Modal Phân Tích Món & Lượt Vào Bếp (Kitchen Intake) */}
      <KdsKitchenIntakeModal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        restaurantName={selectedRestaurant?.res || ''}
        showToast={onToast}
      />

      {/* 8. Modal Thêm Món Vào KDS */}
      <KdsAddDishModal
        isOpen={showAddDishModal}
        onClose={() => setShowAddDishModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        places={places}
        onSuccess={() => fetchKdsAllData()}
        showToast={onToast}
      />

      {/* 9. Modal Xóa Cấu Hình Nấu Món KDS */}
      <KdsDeleteCookingConfigModal
        isOpen={showDeleteCookingModal}
        onClose={() => setShowDeleteCookingModal(false)}
        host={targetHost || connectedHost}
        port={27017}
        dishes={(kdsData?.items || []).filter((d) => selectedCookingDishes.includes(d.menu_item_code))}
        onSuccess={() => {
          setSelectedCookingDishes([]);
          fetchKdsAllData();
        }}
        showToast={onToast}
      />

      {/* 10. Modal Phân Quyền Hàng Loạt */}
      <BatchRoleUserModal
        isOpen={showBatchRoleModal}
        onClose={() => setShowBatchRoleModal(false)}
        restaurants={restaurants}
        showToast={(msg, type) => onToast(msg, type || 'info')}
        defaultParamCode="ROLE_SETUP_CONFIG_COOKING"
        selectedRestaurant={selectedRestaurant}
      />

      {/* 11. Modal Quản Lý Máy In Bếp (Port 9100) */}
      <PrintManagementModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        restaurantCode={selectedRestaurant?.sap || selectedRestaurant?.rk7 || ''}
        restaurantName={selectedRestaurant?.res || ''}
        defaultIpLan={targetHost || connectedHost}
      />

      {/* 12. Modal Điều Khiển Từ Xa VNC KDS */}
      <VncKdsModal
        isOpen={showVncModal}
        onClose={() => setShowVncModal(false)}
        restaurantName={selectedRestaurant?.res || ''}
        ipPrefix={ipPrefix}
      />
    </div>
  );
};
