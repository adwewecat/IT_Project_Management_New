import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Database,
  Search,
  RefreshCw,
  Server,
  Layers,
  FileSpreadsheet,
  Copy,
  Check,
  Download,
  Eye,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
  Building2,
  TableProperties,
  X,
  Unlock,
  Lock,
  Wrench,
  UserCheck,
  FileText,
  Calendar,
  Clock,
  Code,
  CreditCard,
  Receipt,
  Ticket,
  User,
  ExternalLink,
  AlertTriangle,
  ChefHat,
  XCircle,
  Edit2,
  ArrowRight,
  SlidersHorizontal,
  Store,
  HelpCircle,
  Save,
  UtensilsCrossed,
  Printer,
  PlusCircle,
  Cpu,
  Mail,
  Info,
  ShieldCheck,
  Power,
  ArrowRightLeft,
  Zap,
  Settings,
  LayoutGrid
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { getRestaurants } from '../../services/restaurantService';
import { FixCpuMongoTask } from './FixCpuMongoTask';
import { MongoDbTransferTask } from './MongoDbTransferTask';
import { MongoDbParamManagementTask } from './MongoDbParamManagementTask';
import { ManageMenuSoCoTask } from './ManageMenuSoCoTask';
import {
  KdsAddQuayModal,
  KdsQuayListModal,
  KdsRoleUserModal,
  ModalCreateFoodControl,
  KdsTransferQuayModal,
  KdsLogsModal
} from './KdsQuayModals';
import { BatchRoleUserModal } from './BatchRoleUserModal';
import { AndroidEmulatorTab } from './AndroidEmulatorTab';

import {
  mongoService,
  TableReportItem,
  RestaurantLockStatusResponse,
  ActionLogSessionItem,
  ActionLogSessionDetailResponse,
  TabletUserItem,
  TabletUsersResponse,
  KdsItemsResponse,
  KdsItemDish,
  KdsPlaceItem,
  KdsMasterStatusResponse,
  RestaurantGposInfoResponse,
  DishShowHideItem,
  DishShowHideListResponse,
  MenuShowHideItem,
  MenuShowHideListResponse,
  MongoCandidateStatus
} from '../../services/mongoService';




import { RestaurantItem } from '../../types/restaurant';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin, checkIsAdmin, checkIsAppRole } from '../../utils/authUtils';

export const RestaurantMongoAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const canAccessMongo = checkIsAppRole(user) || checkIsAdmin(user) || checkIsSuperAdmin(user);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Quyền Super Admin hoặc dung.nguyenanh (quản lý email mặc định)
  const isPrivileged = useMemo(() => {
    if (!user) return false;
    const username = (user.username || '').toLowerCase().trim();
    return checkIsSuperAdmin(user) || username === 'dung.nguyenanh';
  }, [user]);

  // Cấu hình email nhận báo cáo mặc định
  const [defaultEmail, setDefaultEmail] = useState<string>('dung.nguyenanh@ggg.com.vn');
  const [isSavingEmail, setIsSavingEmail] = useState<boolean>(false);

  useEffect(() => {
    if (isPrivileged) {
      mongoService
        .getFixCpuConfig()
        .then((res) => {
          if (res.default_email) {
            setDefaultEmail(res.default_email);
          }
        })
        .catch((err) => {
          console.error('Lỗi khi tải cấu hình email fix cpu:', err);
        });
    }
  }, [isPrivileged]);

  // Redirect unauthorized
  useEffect(() => {
    if (user && !canAccessMongo) {
      navigate('/restaurants', { replace: true });
    }
  }, [user, canAccessMongo, navigate]);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveEmailConfig = async () => {
    if (!defaultEmail.trim()) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ', 'error');
      return;
    }
    setIsSavingEmail(true);
    try {
      await mongoService.saveFixCpuConfig(defaultEmail.trim());
      showToast('Đã lưu cấu hình email mặc định thành công!', 'success');
    } catch (err: any) {
      showToast('Lỗi khi lưu cấu hình email: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Active Main Tab: 'task_actions' | 'reports' | 'android_emulator'
  const [activeTab, setActiveTab] = useState<'task_actions' | 'reports' | 'android_emulator'>('task_actions');


  // Restaurant List (Only ON or NEW)
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [, setLoadingRestaurants] = useState<boolean>(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);

  // Searchable Combobox for Restaurants
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Connection state for selected restaurant
  const [connectedHost, setConnectedHost] = useState<string>('');
  const [availableCandidates, setAvailableCandidates] = useState<MongoCandidateStatus[]>([]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Danh sách các máy MongoDB đang hoạt động (status === 'OPEN')
  const openCandidates = useMemo(() => {
    return availableCandidates.filter((c) => c.status === 'OPEN');
  }, [availableCandidates]);

  // Ref theo dõi việc tự động switch sang host KDS (.41 / có CONFIG_COOKING) cho mỗi nhà hàng
  const hasAutoSwitchedKdsRef = useRef<string | null>(null);

  // Trạng thái toggle hiển thị giải thích chi tiết cho từng tác vụ (nhấn icon chấm than '!')
  const [taskHelpOpen, setTaskHelpOpen] = useState<Record<string, boolean>>({});
  const toggleTaskHelp = (taskId: string) => {
    setTaskHelpOpen((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Helper trả về nội dung giải thích chi tiết khi bấm nút chấm than (!) ở trên bộ chọn tác vụ
  const getTaskExplanation = (taskId: string) => {
    switch (taskId) {
      case 'clear_table_locks':
        return (
          <span>
            Xóa toàn bộ bản ghi giữ phiên trong <code>LOCK_ORDER</code>, reset danh sách <code>lstTgsUser</code> và gỡ cờ <code>lockOrder / locked / isLock</code> trong <code>ORDER</code> để nhân viên vào bàn lại bình thường.
          </span>
        );
      case 'unlock_tablet_users':
        return (
          <span>
            Khi tablet bị sập nguồn, văng app hoặc mất mạng, tài khoản nhân viên vẫn bị giữ trạng thái đăng nhập (<code>isLogin: true</code> trong collection EMPLOYEE). Chức năng này cho phép tìm kiếm, lọc và mở khóa ngay lập tức từng tài khoản hoặc toàn bộ để nhân viên đăng nhập lại tablet.
          </span>
        );
      case 'check_kds':
        return (
          <span>
            Tra cứu danh mục món KDS, quầy bếp (<code>ACCOUNT</code>), điều chỉnh thời gian chế biến món (<code>CONFIG_COOKING</code>) &amp; đối chiếu giá GPOS.
          </span>
        );
      case 'dish_show_hide':
        return (
          <span>
            Quản lý trạng thái món ăn / hiện trên các kênh bán hàng (Tablet CO, SO và QR Code Order). Chỉnh sửa độc lập từng kênh hoặc chuyển đổi hàng loạt.
          </span>
        );
      case 'menu_show_hide':
        return (
          <span>
            Lựa chọn ẩn hiện danh mục menu trên các thiết bị và cấu hình tự động ra món trên KDS (<code>autoDeliveryInSo</code>).
          </span>
        );
      case 'fix_full_cpu':
        return (
          <span>
            Quét toàn bộ IP (.11, .12, .41) của các nhà hàng ON/NEW, tạo index tối ưu cho <code>DISH_KDS</code>, <code>ORDER</code>, <code>CO_MENU_ITEM</code> để triệt tiêu COLLSCAN, giải phóng CPU 100% về &lt; 2%.
          </span>
        );
      case 'manage_menu_so_co':
        return (
          <span>
            Phân tích toàn bộ thực đơn trong database <code>G_ORDER</code> theo từng Menu và Nhóm món (kèm mã SAP, RK7, số thứ tự, giá, hình ảnh). Hỗ trợ tra cứu nhanh, tìm kiếm hàng loạt món, đối chiếu trạng thái <strong>SO &amp; CO</strong>, kích hoạt món sang CO với Kalo mặc định 100, thêm món hàng loạt theo định dạng bảng tính kiểu Google Sheets/Excel, chỉnh sửa chi tiết, chuyển/nhân bản món và phát hiện sai lệch mã RK7/Tên món.
          </span>
        );
      case 'transfer_database':
        return (
          <span>
            Hỗ trợ khi máy POS bị lỗi hoặc cài lại Win: quét các máy trạm trong nhà hàng (.11, .12, .41), kiểm tra kết nối, xóa dữ liệu bảng <code>ACTION_LOG</code> của G_ORDER để giảm dung lượng và chuyển toàn bộ database sang máy mới.
          </span>
        );
      case 'manage_app_params':
        return (
          <span>
            Tra cứu toàn bộ tham số trong bảng <code>APP_PARAM</code> (Database <code>G_ORDER</code>) của nhà hàng. Hỗ trợ xem chi tiết, lọc theo nhóm nghiệp vụ, đánh dấu sao ưu tiên, thêm mới tham số, sửa giá trị cấu hình, bật/tắt nhanh và xóa tham số an toàn.
          </span>
        );
      case 'check_action_logs':
        return (
          <span>
            Tra cứu lịch sử thao tác theo phiên (GUID), lọc ngày tránh quá tải, tìm theo Bàn / GUID, phân tích chi tiết timeline gọi món &amp; hệ thống.
          </span>
        );
      default:
        return selectedTask ? <span>{selectedTask.subtitle}</span> : null;
    }
  };

  // Helper remove Vietnamese tones
  const removeVietnameseTones = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
      .toLowerCase()
      .trim();
  };

  // Helper giải thích ý nghĩa nghiệp vụ của từng API / Action Name
  const explainActionName = (actionName: string): { meaning: string; badge: string; color: { bg: string; text: string; border: string } } => {
    const raw = (actionName || '').trim();
    const l = raw.toLowerCase();

    // 1. Tạo đơn / Mở bàn
    if (l.includes('/order/create') || l.includes('createorder')) {
      return {
        meaning: 'Tạo đơn mới / Mở bàn phục vụ',
        badge: 'Mở Bàn',
        color: { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }
      };
    }

    // 2. Gửi món từ khách (CO - Customer Order qua Tablet/QR)
    if (l.includes('/co/submit')) {
      return {
        meaning: 'Khách tự gửi order món (qua Tablet / QR)',
        badge: 'Khách Gọi Món',
        color: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }
      };
    }

    // 3. Bắn món vào bếp (SubmitSession)
    if (l === 'submitsession' || l.includes('/order/submit') || l.includes('submitsessionorder')) {
      return {
        meaning: 'Bắn đơn / Gửi món vào bếp chế biến',
        badge: 'Bắn Vào Bếp',
        color: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' }
      };
    }
    if (l === 'submitsessionreport') {
      return {
        meaning: 'Lưu log báo cáo lượt gửi món vào bếp',
        badge: 'Log Gửi Bếp',
        color: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' }
      };
    }

    // 4. Lấy chi tiết đơn bàn / pending
    if (l.includes('/order/{guid}') || l.includes('/order/get') || l.includes('/order/detail')) {
      return {
        meaning: 'Tải chi tiết bàn & danh sách món ăn',
        badge: 'Đọc Bàn',
        color: { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' }
      };
    }
    if (l.includes('/order/pending')) {
      return {
        meaning: 'Tra cứu món chờ xác nhận / giỏ hàng',
        badge: 'Món Chờ',
        color: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }
      };
    }

    // 5. Khách xem tổng quan đơn QR
    if (l.includes('order-overview') || l.includes('overview')) {
      return {
        meaning: 'Khách xem lại thực đơn & bill trên ĐT',
        badge: 'Xem Bill QR',
        color: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' }
      };
    }

    // 6. Đánh giá & Tip
    if (l.includes('rate-tip') || l.includes('rating') || l.includes('feedback')) {
      return {
        meaning: 'Khách gửi đánh giá phục vụ & tip cho NV',
        badge: 'Đánh Giá / Tip',
        color: { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' }
      };
    }

    // 7. Trạng thái QR Code
    if (l.includes('qr-code-status') || l.includes('qr-status')) {
      return {
        meaning: 'Kiểm tra trạng thái kích hoạt mã QR',
        badge: 'Ping QR',
        color: { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' }
      };
    }

    // 8. Tạm tính & In bill
    if (l.includes('pre-payment') || l.includes('prepayment') || l.includes('precheck') || l.includes('tamtinh') || l.includes('tam-tinh')) {
      return {
        meaning: 'In phiếu tạm tính cho khách kiểm tra',
        badge: 'In Tạm Tính',
        color: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' }
      };
    }
    if (l.includes('printbill') || l.includes('print-bill')) {
      return {
        meaning: 'In hóa đơn tính tiền tại bàn / quầy',
        badge: 'In Hóa Đơn',
        color: { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' }
      };
    }

    // 9. Thanh toán & Đóng đơn
    if (l.includes('payment') || l.includes('/pay') || l.includes('payorder')) {
      return {
        meaning: 'Thực hiện thanh toán đơn hàng (QR/SO/Tiền mặt)',
        badge: 'Thanh Toán',
        color: { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' }
      };
    }
    if (l.includes('/order/close') || l.includes('closeorder')) {
      return {
        meaning: 'Đóng bàn & hoàn tất phiên phục vụ',
        badge: 'Đóng Bàn',
        color: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' }
      };
    }

    // 10. Hủy món / Trả món
    if (l.includes('cancel') || l.includes('void') || l.includes('delete-item')) {
      return {
        meaning: 'Hủy món ăn / Trả lại món đã gọi',
        badge: 'Hủy Món',
        color: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' }
      };
    }

    // 11. Yêu cầu xuất VAT
    if (l.includes('take-tax') || l.includes('vat') || l.includes('invoice')) {
      return {
        meaning: 'Khách gửi yêu cầu xuất hóa đơn điện tử VAT',
        badge: 'Xuất VAT',
        color: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }
      };
    }

    // 12. Voucher & Khuyến mãi
    if (l.includes('voucher') || l.includes('promotion') || l.includes('coupon') || l.includes('discount')) {
      return {
        meaning: 'Áp dụng mã giảm giá, voucher khuyến mãi',
        badge: 'Ưu Đãi',
        color: { bg: '#FAF5FF', text: '#6B21A8', border: '#D8B4FE' }
      };
    }

    // 13. Thao tác bàn (Chuyển, Gộp, Tách)
    if (l.includes('move') || l.includes('change-table')) {
      return {
        meaning: 'Chuyển toàn bộ món sang bàn khác',
        badge: 'Chuyển Bàn',
        color: { bg: '#F0FDF4', text: '#047857', border: '#6EE7B7' }
      };
    }
    if (l.includes('merge')) {
      return {
        meaning: 'Gộp các bàn lại thành một hóa đơn',
        badge: 'Gộp Bàn',
        color: { bg: '#ECFDF5', text: '#059669', border: '#6EE7B7' }
      };
    }
    if (l.includes('split')) {
      return {
        meaning: 'Tách bàn / chia nhỏ hóa đơn',
        badge: 'Tách Bàn',
        color: { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5' }
      };
    }

    // 14. Khóa & Mở khóa bàn
    if (l.includes('unlock')) {
      return {
        meaning: 'Mở khóa bàn tablet đang bị chiếm giữ',
        badge: 'Mở Khóa',
        color: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
      };
    }
    if (l.includes('lock')) {
      return {
        meaning: 'Khóa phiên bàn (in tạm tính / giữ phiên)',
        badge: 'Khóa Bàn',
        color: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' }
      };
    }

    // 15. Minigame / Vòng quay
    if (l.includes('game') || l.includes('spin') || l.includes('wheel')) {
      return {
        meaning: 'Khách tham gia vòng quay / minigame nhận quà',
        badge: 'Minigame',
        color: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }
      };
    }

    // Default fallback
    return {
      meaning: 'Thao tác hệ thống / gọi API nghiệp vụ',
      badge: 'Hệ Thống',
      color: { bg: '#F9FAFB', text: '#4B5563', border: '#E5E7EB' }
    };
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (taskDropdownRef.current && !taskDropdownRef.current.contains(e.target as Node)) {
        setIsTaskDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // Load restaurants on mount (only ON / NEW)
  useEffect(() => {
    setLoadingRestaurants(true);
    getRestaurants({ page: 1, page_size: 1000, trangthai: 'ALL' })
      .then((res: any) => {
        const rawItems: RestaurantItem[] = res?.items || [];
        // Chỉ lấy các nhà hàng đang ON hoặc NEW, loại bỏ OFF
        const activeOnly = rawItems.filter((r) => {
          const st = (r.trangthai || '').toUpperCase().trim();
          return st === 'ON' || st === 'NEW' || !st;
        });
        activeOnly.sort((a, b) => (a.sap || '').localeCompare(b.sap || ''));
        setRestaurants(activeOnly);

        const ridParam = searchParams.get('restaurantId');
        if (ridParam) {
          const found = activeOnly.find((r) => String(r.id) === String(ridParam));
          if (found) {
            setSelectedRestaurant(found);
            connectMongo(found);
          }
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách nhà hàng:', err);
        // Fallback with page_size: 200
        getRestaurants({ page: 1, page_size: 200, trangthai: 'ALL' })
          .then((fallbackRes: any) => {
            const rawItems: RestaurantItem[] = fallbackRes?.items || [];
            const activeOnly = rawItems.filter((r) => {
              const st = (r.trangthai || '').toUpperCase().trim();
              return st === 'ON' || st === 'NEW' || !st;
            });
            activeOnly.sort((a, b) => (a.sap || '').localeCompare(b.sap || ''));
            setRestaurants(activeOnly);
          })
          .catch(() => {
            showToast('Không thể tải danh sách nhà hàng', 'error');
          });
      })
      .finally(() => setLoadingRestaurants(false));
  }, []);

  // Filtered restaurants in combobox
  const filteredRestaurants = useMemo(() => {
    if (!restaurantSearchQuery.trim()) {
      return restaurants.slice(0, 50);
    }
    const q = removeVietnameseTones(restaurantSearchQuery);
    return restaurants
      .filter((r) => {
        const nameClean = removeVietnameseTones(r.res || '');
        const sapClean = (r.sap || '').toLowerCase();
        const ipClean = (r.ip || '').toLowerCase();
        return nameClean.includes(q) || sapClean.includes(q) || ipClean.includes(q);
      })
      .slice(0, 60);
  }, [restaurants, restaurantSearchQuery]);

  // GPOS Version & Restaurant Info for Header
  const [restaurantGposInfo, setRestaurantGposInfo] = useState<RestaurantGposInfoResponse | null>(null);

  const fetchRestaurantGposInfo = async (host: string, restaurantId?: number) => {
    try {
      const res = await mongoService.getRestaurantGposInfo(host, 27017, restaurantId);
      setRestaurantGposInfo(res);
    } catch (err: any) {
      console.error('Lỗi khi tải thông tin GPOS nhà hàng:', err);
    }
  };

  // Connect to MongoDB of selected restaurant
  const connectMongo = async (rest: RestaurantItem, preferHost?: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const res = await mongoService.checkConnection(rest.id, rest.ip);
      const allCandidates = res.candidates || [];
      setAvailableCandidates(allCandidates);
      const openList = allCandidates.filter((c) => c.status === 'OPEN');

      if (res.is_connected && openList.length > 0) {
        let hostToUse = openList[0].ip;

        // Ưu tiên 1: preferHost nếu được chỉ định và đang OPEN
        if (preferHost && openList.some((c) => c.ip === preferHost)) {
          hostToUse = preferHost;
        }
        // Ưu tiên 2: Host đang kết nối nếu vẫn nằm trong danh sách OPEN
        else if (connectedHost && openList.some((c) => c.ip === connectedHost)) {
          hostToUse = connectedHost;
        }
        // Ưu tiên 3: Nếu đang ở tác vụ Check KDS, ưu tiên máy có cờ is_kds hoặc có KDS dishes hoặc đuôi .41/.42
        else if (selectedTaskId === 'check_kds') {
          const kdsCandidate = openList.find((c) => (c.is_kds && (c.kds_dish_count || 0) > 0) || c.ip.endsWith('.41') || c.ip.endsWith('.42'));
          if (kdsCandidate) {
            hostToUse = kdsCandidate.ip;
          }
        }

        setConnectedHost(hostToUse);
        setSearchParams({ restaurantId: String(rest.id), host: hostToUse });
        showToast(`Đã kết nối MongoDB thành công: ${hostToUse}:27017`, 'success');
        fetchRestaurantGposInfo(hostToUse, rest.id);
      } else {
        setConnectedHost('');
        setRestaurantGposInfo(null);
        setKdsData(null);
        setKdsPlaces([]);
        setAvailableCandidates([]);
        setSearchParams({ restaurantId: String(rest.id) });
        setConnectionError(
          res.error_message ||
            'Nhà hàng chưa mở POS hoặc chưa được cài MongoDB hoặc chưa cài file bin kết nối IP, Vui lòng check lại cho Nhà này'
        );
      }
    } catch (err: any) {
      setConnectedHost('');
      setRestaurantGposInfo(null);
      setKdsData(null);
      setKdsPlaces([]);
      setAvailableCandidates([]);
      setSearchParams({ restaurantId: String(rest.id) });
      setConnectionError('Lỗi kết nối máy chủ: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSwitchMongoHost = (newHost: string) => {
    if (!newHost || newHost === connectedHost) return;
    setConnectedHost(newHost);
    if (selectedRestaurant) {
      setSearchParams({ restaurantId: String(selectedRestaurant.id), host: newHost });
      fetchRestaurantGposInfo(newHost, selectedRestaurant.id);
    }
    showToast(`Đã chuyển kết nối MongoDB sang máy chủ: ${newHost}:27017`, 'info');
  };

  const getIpRoleLabel = (c: MongoCandidateStatus | string): string => {
    const ip = typeof c === 'string' ? c : c.ip;
    const isKds = typeof c === 'object' ? c.is_kds : false;
    const count = typeof c === 'object' ? (c.kds_dish_count || 0) : 0;
    const tail = ip.split('.').pop() || '';
    if (isKds && count > 0) {
      return `Máy Bếp / KDS (.${tail}) - ${count} món`;
    }
    if (tail === '41' || tail === '42') {
      return `Máy Bếp / KDS (.${tail})`;
    }
    if (tail === '11') {
      return 'Máy POS 1 (.11)';
    }
    if (tail === '12') {
      return 'Máy POS 2 (.12)';
    }
    return `Máy Trạm (.${tail})`;
  };

  const handleSelectRestaurant = (rest: RestaurantItem | null) => {
    setSelectedRestaurant(rest);
    setIsDropdownOpen(false);
    setRestaurantSearchQuery('');
    hasAutoSwitchedKdsRef.current = null;

    // Reset toàn bộ trạng thái kết nối & dữ liệu cũ để tránh nhầm lẫn dữ liệu nhà hàng trước
    setConnectedHost('');
    setRestaurantGposInfo(null);
    setAvailableCandidates([]);
    setConnectionError(null);
    setKdsData(null);
    setKdsPlaces([]);
    setTabletUsersData(null);
    setLockStatus(null);
    setSelectedKdsDishCodes([]);

    if (rest) {
      setSearchParams({ restaurantId: String(rest.id) });
      connectMongo(rest);
    } else {
      setSearchParams({});
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB 1: BÁO CÁO XÂY DỰNG RIÊNG (TABLE REPORT)
  // ══════════════════════════════════════════════════════════════════
  const [selectedReportType, setSelectedReportType] = useState<string>('table_report');
  const [splitByHall, setSplitByHall] = useState<boolean>(false);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);
  const [reportItems, setReportItems] = useState<TableReportItem[]>([]);
  const [reportFilterQuery, setReportFilterQuery] = useState<string>('');
  const [copiedRowIdx, setCopiedRowIdx] = useState<number | null>(null);
  const [copiedAllExcel, setCopiedAllExcel] = useState<boolean>(false);

  // Fetch Table Report
  const handleFetchTableReport = async () => {
    setLoadingReport(true);
    try {
      const params: any = {
        split_by_hall: splitByHall
      };
      if (selectedRestaurant) {
        params.restaurant_id = selectedRestaurant.id;
        if (connectedHost) params.host = connectedHost;
      }
      const res = await mongoService.getTableReport(params);
      setReportItems(res.items || []);
      const restCount = res.total_restaurants || 0;
      const totalTbls = res.total_tables_sum || 0;
      showToast(
        `Đã tải thành công dữ liệu bàn: ${restCount} nhà hàng, tổng cộng ${totalTbls} bàn ăn!`,
        'success'
      );
    } catch (err: any) {
      console.error('Lỗi khi tải báo cáo danh sách bàn:', err);
      showToast('Lỗi khi tải báo cáo bàn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  // Filter report items in table view
  const filteredReportItems = useMemo(() => {
    if (!reportFilterQuery.trim()) return reportItems;
    const q = removeVietnameseTones(reportFilterQuery);
    return reportItems.filter((it) => {
      const name = removeVietnameseTones(it.restaurant_name || '');
      const sap = (it.sap_code || '').toLowerCase();
      const ip = (it.mongo_ip || '').toLowerCase();
      const hall = removeVietnameseTones(it.hall_name || '');
      const sample = (it.tables_sample || '').toLowerCase();
      return (
        name.includes(q) ||
        sap.includes(q) ||
        ip.includes(q) ||
        hall.includes(q) ||
        sample.includes(q)
      );
    });
  }, [reportItems, reportFilterQuery]);

  // Total summary of filtered items
  const summaryStats = useMemo(() => {
    const totalTables = filteredReportItems.reduce((acc, it) => acc + (it.total_tables || 0), 0);
    const distinctRests = new Set(filteredReportItems.map((it) => it.restaurant_id)).size;
    return {
      distinctRests,
      totalRows: filteredReportItems.length,
      totalTables
    };
  }, [filteredReportItems]);

  // Copy full table to clipboard as TSV
  const handleCopyTableTSV = () => {
    if (filteredReportItems.length === 0) {
      showToast('Không có dữ liệu để sao chép', 'info');
      return;
    }
    const headers = [
      'STT',
      'Mã SAP Nhà Hàng',
      'Tên Nhà Hàng',
      'IP MongoDB',
      splitByHall ? 'Tổng Bàn (isCurrentRes: true)' : 'Số Bàn (isCurrentRes: true)',
      'Khu Vực / Tầng (HALL_PLAN)',
      'Danh Sách Mẫu Bàn'
    ];
    const rows = filteredReportItems.map((it, idx) => [
      idx + 1,
      it.sap_code || '',
      it.restaurant_name || '',
      it.mongo_ip || '',
      `${it.total_tables} bàn`,
      it.hall_name || '',
      it.tables_sample || ''
    ]);
    const tsvContent = [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsvContent);
    setCopiedAllExcel(true);
    showToast(`Đã sao chép ${filteredReportItems.length} dòng dạng bảng Excel!`, 'success');
    setTimeout(() => setCopiedAllExcel(false), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReportItems.length === 0) {
      showToast('Không có dữ liệu để xuất file', 'info');
      return;
    }
    const headers = [
      'STT',
      'Ma SAP',
      'Ten Nha Hang',
      'IP MongoDB',
      splitByHall ? 'Tong Ban' : 'So Ban',
      'Khu Vuc - Tang',
      'Danh Sach Mau Ban'
    ];
    const csvRows = filteredReportItems.map((it, idx) => [
      idx + 1,
      `"${(it.sap_code || '').replace(/"/g, '""')}"`,
      `"${(it.restaurant_name || '').replace(/"/g, '""')}"`,
      `"${(it.mongo_ip || '').replace(/"/g, '""')}"`,
      it.total_tables || 0,
      `"${(it.hall_name || '').replace(/"/g, '""')}"`,
      `"${(it.tables_sample || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Bao_Cao_Ban_MongoDB_${splitByHall ? 'Theo_Khu_Vuc' : 'Tong_Hop'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file báo cáo CSV thành công!', 'success');
  };

  // ══════════════════════════════════════════════════════════════════
  // TAB 3: XỬ LÝ TÁC VỤ (TASK ACTIONS)
  // ══════════════════════════════════════════════════════════════════
  const AVAILABLE_TASKS = useMemo(() => [
    {
      id: 'clear_table_locks',
      title: '1. Xóa Khóa Bàn Tablet (Giải Phóng User Chiếm Giữ & Khóa Treo Bàn)',
      subtitle: 'Xóa các bản ghi giữ phiên trong LOCK_ORDER, reset lstTgsUser và gỡ cờ lockOrder / locked / isLock trong ORDER',
      category: 'Tablet & Đơn Hàng',
      badge: 'Phổ biến',
      icon: 'Unlock'
    },
    {
      id: 'unlock_tablet_users',
      title: '2. Mở Khóa User Tablet (Giải Phóng User Báo Đang Đăng Nhập Ở Thiết Bị Khác)',
      subtitle: 'Quét và reset cờ isLogin trong EMPLOYEE, gỡ user khỏi LOCK_ORDER và lstTgsUser để nhân viên đăng nhập lại tablet bình thường',
      category: 'Tài Khoản & Tablet',
      badge: 'Mới',
      icon: 'UserCheck'
    },
    {
      id: 'manage_menu_so_co',
      title: '3. Xử lý SO/CO (Quản Lý Nhóm & Món Menu SO/CO, Thêm/Sửa/Xóa/Chuyển & Check Lỗi)',
      subtitle: 'Phân tích thực đơn nhà hàng theo Menu, Nhóm món, đối chiếu SO & CO, thêm hàng loạt dạng bảng tính, kiểm tra lệch mã RK7/Tên món và kích hoạt CO',
      category: 'Thực Đơn SO & CO',
      badge: 'SO/CO',
      icon: 'Layers'
    },
    {
      id: 'check_kds',
      title: '4. Check / xử lý KDS',
      subtitle: 'Tra cứu danh mục món KDS, quầy bếp (ACCOUNT), điều chỉnh thời gian chế biến món (CONFIG_COOKING) & đối chiếu giá GPOS',
      category: 'Bếp KDS & Món',
      badge: 'KDS',
      icon: 'ChefHat'
    },
    {
      id: 'dish_show_hide',
      title: '5. Cấu hình ẩn hiện món (QrOrder, CO, SO)',
      subtitle: 'Quản lý danh sách món ẩn / hiện, tìm kiếm theo tên món, điều chỉnh kênh ẩn (QrOrder, CO, SO) hoặc chuyển đổi hàng loạt',
      category: 'Món Ăn & Kênh Bán',
      badge: 'Món ăn',
      icon: 'UtensilsCrossed'
    },
    {
      id: 'menu_show_hide',
      title: '6. Cấu hình ẩn hiện menu (CO, SO, QrOrder, KDS Auto)',
      subtitle: 'Cấu hình hiển thị danh mục menu, mã SAP, mã RK7 và tính năng tự động ra món trên KDS (autoDeliveryInSo)',
      category: 'Menu & KDS Auto',
      badge: 'Menu',
      icon: 'SlidersHorizontal'
    },
    {
      id: 'fix_full_cpu',
      title: '7. Xử Lý Full CPU 100% (Tối Ưu Index Tránh Nghẽn Treo Máy Bếp KDS & POS)',
      subtitle: 'Quét toàn bộ IP (.11, .12, .41) của các nhà hàng ON/NEW, tạo index tối ưu cho DISH_KDS, ORDER, CO_MENU_ITEM để triệt tiêu COLLSCAN, giảm CPU về < 2%',
      category: 'Hệ Thống & Hiệu Năng',
      badge: 'Khẩn cấp',
      icon: 'Cpu'
    },
    {
      id: 'transfer_database',
      title: '8. Chuyển database MongoDB (Di Chuyển / Sao Chép Sang Máy Khác)',
      subtitle: 'Hỗ trợ khi máy POS lỗi/cài lại Win: quét IP các máy (.11, .12, .41), kiểm tra trùng lặp DB, xóa ACTION_LOG của G_ORDER để tối ưu dung lượng và chuyển toàn bộ database sang máy mới',
      category: 'Hạ Tầng & Di Chuyển',
      badge: 'Chuyển Data',
      icon: 'ArrowRightLeft'
    },
    {
      id: 'manage_app_params',
      title: '9. Xử Lý Param (Cấu Hình Bảng APP_PARAM)',
      subtitle: 'Quản lý toàn bộ danh sách tham số APP_PARAM trong MongoDB nhà hàng: hiển thị, lọc, thêm mới, sửa giá trị, bật/tắt và xóa tham số',
      category: 'Tham Số & Cấu Hình',
      badge: 'APP_PARAM',
      icon: 'Settings'
    },
    {
      id: 'check_action_logs',
      title: 'Checklogs MongoDB (Phân Tích Chi Tiết ACTION_LOG Theo Phiên GUID & Bàn)',
      subtitle: 'Tra cứu lịch sử thao tác theo phiên (GUID), lọc ngày tránh quá tải, tìm theo Bàn / GUID, phân tích chi tiết timeline gọi món & hệ thống',
      category: 'Nhật Ký & Kiểm Tra',
      badge: 'Tra cứu log',
      icon: 'FileText'
    }
  ], []);

  const renderHighlightedTitle = (t: { id: string; title: string }, isSelected: boolean = false) => {
    if (t.id === 'clear_table_locks') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#92400E' : 'var(--text-primary)' }}>
          1. Xóa{' '}
          <span
            style={{
              backgroundColor: '#FEF08A',
              color: '#854D0E',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #EAB308',
              boxShadow: '0 0 8px rgba(234, 179, 8, 0.45)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Khóa Bàn
          </span>{' '}
          Tablet (Giải Phóng User Chiếm Giữ & Khóa Treo Bàn)
        </span>
      );
    }
    if (t.id === 'unlock_tablet_users') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#1E40AF' : 'var(--text-primary)' }}>
          2. Mở Khóa{' '}
          <span
            style={{
              backgroundColor: '#BFDBFE',
              color: '#1D4ED8',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #3B82F6',
              boxShadow: '0 0 8px rgba(59, 130, 246, 0.45)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            User
          </span>{' '}
          Tablet (Giải Phóng User Báo Đang Đăng Nhập Ở Thiết Bị Khác)
        </span>
      );
    }
    if (t.id === 'manage_menu_so_co') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#1E40AF' : 'var(--text-primary)' }}>
          3.{' '}
          <span
            style={{
              backgroundColor: '#DBEAFE',
              color: '#1D4ED8',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #3B82F6',
              boxShadow: '0 0 6px rgba(59, 130, 246, 0.35)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Xử Lý SO/CO
          </span>{' '}
          (Thực Đơn, Món Ăn &amp; Bảng Tính)
        </span>
      );
    }
    if (t.id === 'check_kds') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#065F46' : 'var(--text-primary)' }}>
          4.{' '}
          <span
            style={{
              backgroundColor: '#D1FAE5',
              color: '#047857',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #10B981',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.35)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Check / xử lý KDS
          </span>
        </span>
      );
    }
    if (t.id === 'dish_show_hide') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#C2410C' : 'var(--text-primary)' }}>
          5. Cấu hình{' '}
          <span
            style={{
              backgroundColor: '#FFEDD5',
              color: '#C2410C',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #F97316',
              boxShadow: '0 0 6px rgba(249, 115, 22, 0.35)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Ẩn Hiện Món
          </span>{' '}
          (QrOrder, CO, SO)
        </span>
      );
    }
    if (t.id === 'menu_show_hide') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#6B21A8' : 'var(--text-primary)' }}>
          6. Cấu hình{' '}
          <span
            style={{
              backgroundColor: '#F3E8FF',
              color: '#7E22CE',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #A855F7',
              boxShadow: '0 0 6px rgba(168, 85, 247, 0.35)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Ẩn Hiện Menu
          </span>{' '}
          (CO, SO, QrOrder, KDS Auto)
        </span>
      );
    }
    if (t.id === 'fix_full_cpu') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#991B1B' : 'var(--text-primary)' }}>
          7. Xử Lý{' '}
          <span
            style={{
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #EF4444',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.45)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Full CPU 100%
          </span>{' '}
          (Tối Ưu Index Bếp & POS)
        </span>
      );
    }
    if (t.id === 'transfer_database') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#1E3A8A' : 'var(--text-primary)' }}>
          8.{' '}
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #3B82F6',
              boxShadow: '0 0 6px rgba(59, 130, 246, 0.35)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Chuyển Database
          </span>{' '}
          (Di Chuyển / Sao Chép Sang Máy Khác)
        </span>
      );
    }
    if (t.id === 'manage_app_params') {
      return (
        <span style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#92400E' : 'var(--text-primary)' }}>
          9.{' '}
          <span
            style={{
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              padding: '2px 7px',
              borderRadius: '5px',
              fontWeight: 900,
              fontSize: '13px',
              border: '1.5px solid #F59E0B',
              boxShadow: '0 0 6px rgba(245, 158, 11, 0.35)',
              display: 'inline-block',
              letterSpacing: '0.2px'
            }}
          >
            Xử Lý Param
          </span>{' '}
          (Cấu Hình Bảng APP_PARAM)
        </span>
      );
    }
    return (
      <span style={{ fontSize: '13px', fontWeight: isSelected ? 800 : 700, color: isSelected ? '#3730A3' : 'var(--text-primary)' }}>
        {t.title}
      </span>
    );
  };

  const renderTaskIcon = (taskId: string, isSelected: boolean) => {
    if (taskId === 'clear_table_locks') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#FDE68A' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Unlock size={14} color="#D97706" />
        </div>
      );
    }
    if (taskId === 'unlock_tablet_users') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#BFDBFE' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UserCheck size={14} color="#2563EB" />
        </div>
      );
    }
    if (taskId === 'manage_menu_so_co') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#BFDBFE' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Layers size={14} color="#1D4ED8" />
        </div>
      );
    }
    if (taskId === 'check_kds') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#A7F3D0' : '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ChefHat size={14} color="#059669" />
        </div>
      );
    }
    if (taskId === 'dish_show_hide') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#FED7AA' : '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <UtensilsCrossed size={14} color="#EA580C" />
        </div>
      );
    }
    if (taskId === 'menu_show_hide') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#E9D5FF' : '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SlidersHorizontal size={14} color="#9333EA" />
        </div>
      );
    }
    if (taskId === 'fix_full_cpu') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#FEE2E2' : '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Cpu size={14} color="#DC2626" />
        </div>
      );
    }
    if (taskId === 'transfer_database') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#BFDBFE' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ArrowRightLeft size={14} color="#2563EB" />
        </div>
      );
    }
    if (taskId === 'manage_app_params') {
      return (
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#FDE68A' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Settings size={14} color="#D97706" />
        </div>
      );
    }
    return (
      <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: isSelected ? '#C7D2FE' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <FileText size={14} color="#4F46E5" />
      </div>
    );
  };

  const [selectedTaskId, setSelectedTaskId] = useState<string>('clear_table_locks');
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>('');
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState<boolean>(false);
  const taskDropdownRef = useRef<HTMLDivElement>(null);

  const selectedTask = useMemo(() => {
    return AVAILABLE_TASKS.find((t) => t.id === selectedTaskId) || AVAILABLE_TASKS[0];
  }, [AVAILABLE_TASKS, selectedTaskId]);

  const filteredTasks = useMemo(() => {
    if (!taskSearchQuery.trim()) return AVAILABLE_TASKS;
    const q = removeVietnameseTones(taskSearchQuery);
    return AVAILABLE_TASKS.filter((t) => {
      const title = removeVietnameseTones(t.title);
      const sub = removeVietnameseTones(t.subtitle);
      const cat = removeVietnameseTones(t.category);
      return title.includes(q) || sub.includes(q) || cat.includes(q);
    });
  }, [AVAILABLE_TASKS, taskSearchQuery]);

  // Lock status state for Task 1
  const [lockStatus, setLockStatus] = useState<RestaurantLockStatusResponse | null>(null);
  const [loadingLockStatus, setLoadingLockStatus] = useState<boolean>(false);
  const [clearingLocks, setClearingLocks] = useState<boolean>(false);
  const [clearingSingleGuid, setClearingSingleGuid] = useState<string | null>(null);
  const [reopenPrePayment, setReopenPrePayment] = useState<boolean>(false);
  const [lockFilterQuery, setLockFilterQuery] = useState<string>('');
  const [lockDateScope, setLockDateScope] = useState<'today' | 'yesterday' | 'all' | 'custom'>('today');
  const [includeOvernight] = useState<boolean>(false);
  const [customLockDate] = useState<string>('');

  const fetchLockStatus = async (
    hostOverride?: string,
    scopeOverride?: 'today' | 'yesterday' | 'all' | 'custom',
    overnightOverride?: boolean,
    customDateOverride?: string
  ) => {
    const hostToUse = hostOverride || connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) {
      setLockStatus(null);
      return;
    }
    const scopeToUse = scopeOverride !== undefined ? scopeOverride : lockDateScope;
    const overnightToUse = overnightOverride !== undefined ? overnightOverride : includeOvernight;
    const dateToUse = customDateOverride !== undefined ? customDateOverride : customLockDate;

    setLoadingLockStatus(true);
    try {
      const res = await mongoService.getLockedTables(
        hostToUse,
        27017,
        selectedRestaurant?.id,
        scopeToUse,
        overnightToUse,
        dateToUse || undefined
      );
      setLockStatus(res);
      if (res.total_locked_tables > 0) {
        showToast(`Tìm thấy ${res.total_locked_tables} bàn bị khóa/chiếm giữ (${res.filter_date_str || scopeToUse})`, 'info');
      }
    } catch (err: any) {
      console.error('Lỗi khi quét khóa bàn:', err);
      showToast('Lỗi khi quét trạng thái khóa bàn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingLockStatus(false);
    }
  };

  // ── TASK 3: MỞ KHÓA USER TABLET (EMPLOYEE & LOCK_ORDER) ──────────────
  const [tabletUsersData, setTabletUsersData] = useState<TabletUsersResponse | null>(null);
  const [loadingTabletUsers, setLoadingTabletUsers] = useState<boolean>(false);
  const [unlockingUserCode, setUnlockingUserCode] = useState<string | null>(null);
  const [unlockingAllUsers, setUnlockingAllUsers] = useState<boolean>(false);

  const fetchTabletUsers = async (hostOverride?: string) => {
    const hostToUse = hostOverride || connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) {
      setTabletUsersData(null);
      return;
    }
    setLoadingTabletUsers(true);
    try {
      const res = await mongoService.getTabletUsers(
        hostToUse,
        27017,
        selectedRestaurant?.id,
        undefined,
        true
      );
      setTabletUsersData(res);
      if (res.total_logged_in > 0) {
        showToast(`Phát hiện ${res.total_logged_in} tài khoản đang có cờ đăng nhập (isLogin=true)`, 'info');
      }
    } catch (err: any) {
      console.error('Lỗi khi tải user tablet:', err);
      showToast('Lỗi khi tải user tablet: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingTabletUsers(false);
    }
  };

  const handleUnlockTabletUser = async (userCode?: string, userName?: string, unlockAll: boolean = false) => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) return;

    if (unlockAll) {
      if (!window.confirm('Bạn có chắc chắn muốn MỞ KHÓA TOÀN BỘ tài khoản nhân viên đang đăng nhập tablet?')) return;
      setUnlockingAllUsers(true);
    } else if (userCode) {
      setUnlockingUserCode(userCode);
    }

    try {
      const res = await mongoService.unlockTabletUser({
        host: hostToUse,
        port: 27017,
        restaurant_id: selectedRestaurant?.id,
        user_code: userCode,
        user_name: userName,
        unlock_all: unlockAll
      });
      if (res.success) {
        showToast(res.message, 'success');
        await fetchTabletUsers(hostToUse);
        if (selectedTaskId === 'clear_table_locks') {
          await fetchLockStatus(hostToUse);
        }
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      console.error('Lỗi khi mở khóa user:', err);
      showToast('Lỗi khi mở khóa user: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setUnlockingAllUsers(false);
      setUnlockingUserCode(null);
    }
  };

  // ── TASK 3: CHECK / XỬ LÝ KDS ──────────────────────────
  const [kdsData, setKdsData] = useState<KdsItemsResponse | null>(null);
  const [loadingKds, setLoadingKds] = useState<boolean>(false);
  const [kdsSearchInput, setKdsSearchInput] = useState<string>('');
  const [kdsSearchQuery, setKdsSearchQuery] = useState<string>('');
  const [kdsPriceFilter, setKdsPriceFilter] = useState<string>('ALL');
  const [kdsGroupFilter, setKdsGroupFilter] = useState<string>('ALL');
  const [kdsQuayFilter, setKdsQuayFilter] = useState<string>('ALL');
  const [editingKdsItem, setEditingKdsItem] = useState<KdsItemDish | null>(null);
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [editSeconds, setEditSeconds] = useState<number>(0);
  const [savingCookingTime, setSavingCookingTime] = useState<boolean>(false);
  const [copiedDishCode, setCopiedDishCode] = useState<string | null>(null);
  const [showKdsGuide, setShowKdsGuide] = useState<boolean>(false);
  const [kdsMasterStatus, setKdsMasterStatus] = useState<KdsMasterStatusResponse | null>(null);
  const [togglingKdsMaster, setTogglingKdsMaster] = useState<boolean>(false);

  const fetchKdsItems = async (hostOverride?: string) => {
    const hostToUse = hostOverride || connectedHost;
    if (!hostToUse) {
      setKdsData(null);
      setLoadingKds(false);
      return;
    }
    setLoadingKds(true);
    try {
      const data = await mongoService.getKdsItems(hostToUse, 27017);
      setKdsData(data);
      if (data.kds_master_status !== undefined) {
        setKdsMasterStatus({
          host: hostToUse,
          port: 27017,
          param_code: 'SHOW_KDS',
          param_name: 'SHOW_KDS',
          param_type: 'FUNCTION',
          status: data.kds_master_status,
          value: data.kds_master_status === 1 ? '1' : '0',
          is_enabled: !!data.kds_master_enabled,
          note: 'SHOW_KDS'
        });
      }
      fetchKdsPlaces(hostToUse);
    } catch (err: any) {
      console.error('Lỗi khi tải Check Item KDS:', err);
      showToast('Lỗi khi tải dữ liệu Check Item KDS: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingKds(false);
    }
  };

  const handleToggleKdsMaster = async () => {
    const hostToUse = connectedHost;
    if (!hostToUse) {
      showToast('Chưa xác định IP MongoDB của nhà hàng!', 'error');
      return;
    }
    const currentSt = kdsMasterStatus ? kdsMasterStatus.status : 1;
    const newSt = currentSt === 1 ? 0 : 1;
    const actionText = newSt === 1 ? 'BẬT HOÀN TOÀN' : 'TẮT HOÀN TOÀN';
    const confirmMsg = newSt === 1
      ? `Bạn có chắc chắn muốn BẬT HOÀN TOÀN KDS cho nhà hàng này không?\n\n- Tham số: SHOW_KDS (G_ORDER.APP_PARAM)\n- Sẽ cập nhật: status = 1, value = 1`
      : `⚠️ CẢNH BÁO QUAN TRỌNG:\nBạn có chắc chắn muốn TẮT HOÀN TOÀN KDS cho nhà hàng này không?\n\n- Toàn bộ thiết bị KDS & luồng đẩy món xuống bếp sẽ NGỪNG hoạt động!\n- Tham số: SHOW_KDS (G_ORDER.APP_PARAM) sẽ chuyển sang status = 0, value = 0`;
    if (!window.confirm(confirmMsg)) return;

    setTogglingKdsMaster(true);
    try {
      const res = await mongoService.toggleKdsMasterStatus(hostToUse, newSt, 27017);
      setKdsMasterStatus(res);
      showToast(res.message || `Đã ${actionText} KDS thành công!`, 'success');
      fetchKdsItems(hostToUse);
    } catch (err: any) {
      showToast('Lỗi khi đổi trạng thái SHOW_KDS: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setTogglingKdsMaster(false);
    }
  };

  // KDS Places & Printers state
  const [kdsPlaces, setKdsPlaces] = useState<KdsPlaceItem[]>([]);
  const [kdsPrinters, setKdsPrinters] = useState<string[]>([]);
  const [loadingKdsPlaces, setLoadingKdsPlaces] = useState<boolean>(false);

  const [showAddQuayModal, setShowAddQuayModal] = useState<boolean>(false);
  const [showQuayListModal, setShowQuayListModal] = useState<boolean>(false);
  const [showKdsRoleModal, setShowKdsRoleModal] = useState<boolean>(false);
  const [showShowHideRoleModal, setShowShowHideRoleModal] = useState<boolean>(false);
  const [showBatchRoleModal, setShowBatchRoleModal] = useState<boolean>(false);
  const [batchRoleParamCode, setBatchRoleParamCode] = useState<string>('ROLE_SETUP_SHOW_HIDE_ITEM');
  const [showCreateFoodControlModal, setShowCreateFoodControlModal] = useState<boolean>(false);

  // Modal: Chuyển toàn bộ hoặc 1 phần món giữa các Quầy Bếp (Transfer)
  const [showTransferQuayModal, setShowTransferQuayModal] = useState<boolean>(false);
  const [transferFromPlaceId, setTransferFromPlaceId] = useState<number | null>(null);

  // Modal: Tra cứu Logs KDS (Order từ CO/SO & Bấm Done Món)
  const [showKdsLogsModal, setShowKdsLogsModal] = useState<boolean>(false);

  // Kiểm tra xem nhà hàng đã có quầy / account Food Control chưa (nếu có rồi thì không cho tạo)
  const hasFoodControl = useMemo(() => {
    if (!kdsData?.accounts_summary || kdsData.accounts_summary.length === 0) return false;
    return kdsData.accounts_summary.some(
      (a) =>
        a.role === 2 ||
        String(a.account_id) === '101' ||
        removeVietnameseTones(a.account_name).includes('food control')
    );
  }, [kdsData?.accounts_summary]);

  // Modal: Gán món vào Quầy
  const [showAssignQuayModal, setShowAssignQuayModal] = useState<boolean>(false);
  const [assignTargetDishes, setAssignTargetDishes] = useState<KdsItemDish[]>([]);
  const [selectedPlaceIdsToAssign, setSelectedPlaceIdsToAssign] = useState<number[]>([]);
  const [assignMode, setAssignMode] = useState<'replace' | 'append'>('replace');
  const [savingAssignQuay, setSavingAssignQuay] = useState<boolean>(false);

  // Multi-selection for batch dish actions
  const [selectedKdsDishCodes, setSelectedKdsDishCodes] = useState<string[]>([]);

  const fetchKdsPlaces = async (hostOverride?: string) => {
    const hostToUse = hostOverride || connectedHost;
    if (!hostToUse) {
      setKdsPlaces([]);
      setKdsPrinters([]);
      setLoadingKdsPlaces(false);
      return;
    }
    setLoadingKdsPlaces(true);
    try {
      const data = await mongoService.getKdsPlaces(hostToUse, 27017);
      setKdsPlaces(data.places || []);
      setKdsPrinters(data.printers || []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách quầy KDS:', err);
    } finally {
      setLoadingKdsPlaces(false);
    }
  };

  const handleOpenAssignQuay = (dishes: KdsItemDish[]) => {
    setAssignTargetDishes(dishes);
    if (dishes.length === 1 && dishes[0].place_ids) {
      setSelectedPlaceIdsToAssign([...dishes[0].place_ids]);
    } else {
      setSelectedPlaceIdsToAssign([]);
    }
    setAssignMode('replace');
    setShowAssignQuayModal(true);
  };

  const handleSaveAssignQuay = async () => {
    const hostToUse = connectedHost || searchParams.get('host') || selectedRestaurant?.ip;
    if (!hostToUse) return;
    if (assignTargetDishes.length === 0) return;
    if (selectedPlaceIdsToAssign.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 quầy để gán', 'error');
      return;
    }

    setSavingAssignQuay(true);
    try {
      const codes = assignTargetDishes.map((d) => d.menu_item_code);
      const res = await mongoService.assignDishesToQuay({
        host: hostToUse,
        port: 27017,
        menu_item_codes: codes,
        place_ids: selectedPlaceIdsToAssign,
        mode: assignMode
      });
      showToast(res.message, 'success');
      setShowAssignQuayModal(false);
      setSelectedKdsDishCodes([]);
      fetchKdsItems(hostToUse);
      fetchKdsPlaces(hostToUse);
    } catch (err: any) {
      showToast('Lỗi khi gán quầy: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingAssignQuay(false);
    }
  };

  const handleOpenEditCookingTime = (item: KdsItemDish) => {
    setEditingKdsItem(item);
    const totalSecs = item.single_cooking_time || 0;
    setEditMinutes(Math.floor(totalSecs / 60));
    setEditSeconds(totalSecs % 60);
  };

  const handleSaveCookingTime = async () => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!editingKdsItem || !hostToUse) return;
    const newTotalSeconds = Math.max(0, (Number(editMinutes) || 0) * 60 + (Number(editSeconds) || 0));
    setSavingCookingTime(true);
    try {
      const res = await mongoService.updateKdsCookingTime({
        host: hostToUse,
        port: 27017,
        menu_item_code: editingKdsItem.menu_item_code,
        single_cooking_time: newTotalSeconds,
        sap_code: editingKdsItem.sap_code,
      });
      showToast(res.message || 'Cập nhật thời gian chế biến món thành công!', 'success');

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

  const handleKdsSearch = () => {
    setKdsSearchQuery(kdsSearchInput.trim());
  };

  const handleKdsResetSearch = () => {
    setKdsSearchInput('');
    setKdsSearchQuery('');
  };

  const kdsGroups = useMemo(() => {
    if (!kdsData?.items) return [];
    const groupSet = new Set<string>();
    kdsData.items.forEach((it) => {
      if (it.group_type_kds) groupSet.add(it.group_type_kds);
    });
    return Array.from(groupSet).sort();
  }, [kdsData]);

  const filteredKdsItems = useMemo(() => {
    if (!kdsData?.items) return [];
    const qClean = removeVietnameseTones(kdsSearchQuery);

    return kdsData.items.filter((item) => {
      if (kdsPriceFilter !== 'ALL' && item.price_status !== kdsPriceFilter) return false;
      if (kdsGroupFilter !== 'ALL' && item.group_type_kds !== kdsGroupFilter) return false;
      if (kdsQuayFilter !== 'ALL' && (!item.quays || !item.quays.includes(kdsQuayFilter))) return false;

      if (!qClean) return true;

      const codeMatch = (item.menu_item_code || '').toLowerCase().includes(qClean);
      const sapMatch = (item.sap_code || '').toLowerCase().includes(qClean);
      const nameMatch = removeVietnameseTones(item.menu_item_name || '').includes(qClean);
      const groupMatch = removeVietnameseTones(item.group_type_kds || '').includes(qClean);

      let matchQuay = false;
      if (item.quays && item.quays.length > 0) {
        matchQuay = item.quays.some((q) => removeVietnameseTones(q).includes(qClean));
      }

      let matchAcc = false;
      if (!matchQuay && kdsData.accounts_summary) {
        const itemPlaces = new Set(item.place_ids || []);
        matchAcc = kdsData.accounts_summary.some(
          (a) => removeVietnameseTones(a.account_name).includes(qClean) && a.place_ids.some((p) => itemPlaces.has(p))
        );
      }

      return codeMatch || sapMatch || nameMatch || groupMatch || matchQuay || matchAcc;
    });
  }, [kdsData, kdsSearchQuery, kdsPriceFilter, kdsGroupFilter, kdsQuayFilter]);

  const formatVND = (val?: number | null) => {
    if (val === undefined || val === null || val === 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  // ── CHECKLOGS MONGODB (ACTION_LOG) ──────────────────────────
  const [actionLogDate, setActionLogDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [actionLogSearch, setActionLogSearch] = useState<string>('');
  const [actionLogSessions, setActionLogSessions] = useState<ActionLogSessionItem[]>([]);
  const [loadingActionLogs, setLoadingActionLogs] = useState<boolean>(false);
  const [actionLogTotalSessions, setActionLogTotalSessions] = useState<number>(0);
  const [hideGameOnlySessions, setHideGameOnlySessions] = useState<boolean>(true);

  // Filter out pure GAME pings (no table, 0 amount, no orders)
  const displayActionLogSessions = useMemo(() => {
    if (!hideGameOnlySessions) return actionLogSessions;
    return actionLogSessions.filter((s) => {
      const isGameOnly =
        s.apps.length === 1 &&
        s.apps[0].toUpperCase() === 'GAME' &&
        (!s.table_name || s.table_name === '') &&
        (!s.total_amount || s.total_amount === 0) &&
        (!s.customer_name || s.customer_name === '') &&
        (!s.payment_method || s.payment_method === '');
      return !isGameOnly;
    });
  }, [actionLogSessions, hideGameOnlySessions]);

  // Detail Modal for a Session (GUID)
  const [selectedSessionGuid, setSelectedSessionGuid] = useState<string | null>(null);
  const [sessionDetailModalOpen, setSessionDetailModalOpen] = useState<boolean>(false);
  const [loadingSessionDetail, setLoadingSessionDetail] = useState<boolean>(false);
  const [sessionDetailData, setSessionDetailData] = useState<ActionLogSessionDetailResponse | null>(null);
  const [detailFilterQuery, setDetailFilterQuery] = useState<string>('');
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [hideGameActionsInModal, setHideGameActionsInModal] = useState<boolean>(true);

  const fetchActionLogSessions = async (hostOverride?: string) => {
    const hostToUse = hostOverride || connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) {
      setActionLogSessions([]);
      return;
    }
    setLoadingActionLogs(true);
    try {
      const res = await mongoService.getActionLogSessions(
        hostToUse,
        27017,
        actionLogDate,
        actionLogSearch.trim() || undefined,
        150
      );
      setActionLogSessions(res.items || []);
      setActionLogTotalSessions(res.total_sessions || 0);
      showToast(`Đã tải ${res.total_sessions} phiên nhật ký ngày ${res.date}`, 'success');
    } catch (err: any) {
      console.error('Lỗi khi tải Checklogs MongoDB:', err);
      showToast('Lỗi khi tải Checklogs: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingActionLogs(false);
    }
  };

  const handleOpenSessionDetail = async (guid: string) => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse || !guid) return;
    setSelectedSessionGuid(guid);
    setSessionDetailModalOpen(true);
    setLoadingSessionDetail(true);
    setSessionDetailData(null);
    setDetailFilterQuery('');
    setExpandedActionId(null);
    try {
      const res = await mongoService.getActionLogSessionDetail(hostToUse, 27017, guid);
      setSessionDetailData(res);
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết phiên:', err);
      showToast('Lỗi tải chi tiết phiên: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingSessionDetail(false);
    }
  };

  // Filtered detail actions inside modal
  const filteredDetailActions = useMemo(() => {
    if (!sessionDetailData?.actions) return [];
    let list = sessionDetailData.actions;
    if (hideGameActionsInModal) {
      list = list.filter((a) => {
        const app = (a.app_code || '').toUpperCase();
        const user = (a.user_code || '').toUpperCase();
        const act = (a.action_name || '').toLowerCase();
        const isGamePing = (app === 'GAME' || user === 'GAME') && act.includes('qr-code-status');
        return !isGamePing;
      });
    }
    if (!detailFilterQuery.trim()) return list;
    const q = detailFilterQuery.toLowerCase().trim();
    return list.filter((a) => {
      const exp = explainActionName(a.action_name);
      const actionName = (a.action_name || '').toLowerCase();
      const meaning = exp.meaning.toLowerCase();
      const badge = exp.badge.toLowerCase();
      const appCode = (a.app_code || '').toLowerCase();
      const userCode = (a.user_code || '').toLowerCase();
      const source = (a.source || '').toLowerCase();
      return (
        actionName.includes(q) ||
        meaning.includes(q) ||
        badge.includes(q) ||
        appCode.includes(q) ||
        userCode.includes(q) ||
        source.includes(q)
      );
    });
  }, [sessionDetailData, detailFilterQuery, hideGameActionsInModal]);

  // ── TASK 4: CẤU HÌNH ẨN HIỆN MÓN (SHOW_HIDE_ITEMS) ─────────────────────
  const [dishShowHideData, setDishShowHideData] = useState<DishShowHideListResponse | null>(null);
  const [loadingDishShowHide, setLoadingDishShowHide] = useState<boolean>(false);
  const [visibleDishSearch, setVisibleDishSearch] = useState<string>('');
  const [hiddenDishSearch, setHiddenDishSearch] = useState<string>('');
  const [localVisibleDishes, setLocalVisibleDishes] = useState<DishShowHideItem[]>([]);
  const [localHiddenDishes, setLocalHiddenDishes] = useState<DishShowHideItem[]>([]);
  const [hasDishChanges, setHasDishChanges] = useState<boolean>(false);
  const [savingDishes, setSavingDishes] = useState<boolean>(false);

  const fetchDishShowHide = async (hostOverride?: string) => {
    const hostToUse = hostOverride || connectedHost || searchParams.get('host') || selectedRestaurant?.ip;
    if (!hostToUse) {
      setDishShowHideData(null);
      setLocalVisibleDishes([]);
      setLocalHiddenDishes([]);
      return;
    }
    setLoadingDishShowHide(true);
    try {
      const res = await mongoService.getDishShowHide(hostToUse, 27017);
      setDishShowHideData(res);
      setLocalVisibleDishes(res.visible_dishes);
      setLocalHiddenDishes(res.hidden_dishes);
      setHasDishChanges(false);
      showToast(`Đã tải ${res.total_visible} món hiện và ${res.total_hidden} món ẩn`, 'info');
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách món ẩn/hiện:', err);
      showToast('Lỗi khi tải món ẩn/hiện: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingDishShowHide(false);
    }
  };

  const handleMoveToHidden = (dish: DishShowHideItem) => {
    setLocalVisibleDishes((prev) => prev.filter((d) => d.item_code !== dish.item_code));
    setLocalHiddenDishes((prev) => [
      {
        ...dish,
        is_hidden: true,
        show_in_co: false,
        show_in_so: false,
        show_in_qr_order: false
      },
      ...prev
    ]);
    setHasDishChanges(true);
  };

  const handleMoveToVisible = (dish: DishShowHideItem) => {
    setLocalHiddenDishes((prev) => prev.filter((d) => d.item_code !== dish.item_code));
    setLocalVisibleDishes((prev) => [
      {
        ...dish,
        is_hidden: false,
        show_in_co: true,
        show_in_so: true,
        show_in_qr_order: true
      },
      ...prev
    ]);
    setHasDishChanges(true);
  };

  const handleToggleDishChannel = (itemCode: string, channel: 'qr' | 'co' | 'so') => {
    setLocalHiddenDishes((prev) => {
      const updated = prev.map((d) => {
        if (d.item_code !== itemCode) return d;
        const newD = { ...d };
        if (channel === 'qr') newD.show_in_qr_order = !newD.show_in_qr_order;
        if (channel === 'co') newD.show_in_co = !newD.show_in_co;
        if (channel === 'so') newD.show_in_so = !newD.show_in_so;
        return newD;
      });

      // Nếu món có cả 3 kênh đều là TRUE (hiển thị hết), tự động chuyển sang Món Hiện!
      const target = updated.find((d) => d.item_code === itemCode);
      if (target && target.show_in_co && target.show_in_so && target.show_in_qr_order) {
        setTimeout(() => {
          handleMoveToVisible(target);
        }, 100);
      }

      return updated;
    });
    setHasDishChanges(true);
  };

  const handleSaveDishes = async () => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) return;
    setSavingDishes(true);
    try {
      const actions: any[] = [];
      localHiddenDishes.forEach((d) => {
        actions.push({
          item_code: d.item_code,
          name: d.name,
          price: d.price,
          sap_code: d.sap_code,
          is_hidden: true,
          show_in_co: d.show_in_co,
          show_in_so: d.show_in_so,
          show_in_qr_order: d.show_in_qr_order
        });
      });

      // Thêm các món được unhide (trước đó là hidden trong dishShowHideData)
      (dishShowHideData?.hidden_dishes || []).forEach((initialHidden) => {
        const stillInHidden = localHiddenDishes.some((d) => d.item_code === initialHidden.item_code);
        if (!stillInHidden) {
          actions.push({
            item_code: initialHidden.item_code,
            name: initialHidden.name,
            price: initialHidden.price,
            sap_code: initialHidden.sap_code,
            is_hidden: false,
            show_in_co: true,
            show_in_so: true,
            show_in_qr_order: true
          });
        }
      });

      const res = await mongoService.saveDishShowHide({
        host: hostToUse,
        port: 27017,
        restaurant_id: selectedRestaurant?.id,
        dishes: actions
      });

      if (res.success) {
        showToast(res.message, 'success');
        setHasDishChanges(false);
        fetchDishShowHide(hostToUse);
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu cấu hình ẩn/hiện món:', err);
      showToast('Lỗi khi lưu: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingDishes(false);
    }
  };

  // ── TASK 5: CẤU HÌNH ẨN HIỆN MENU (RESTAURANT_CATEGORY) ───────────────
  const [menuShowHideData, setMenuShowHideData] = useState<MenuShowHideListResponse | null>(null);
  const [loadingMenuShowHide, setLoadingMenuShowHide] = useState<boolean>(false);
  const [menuFilterKds, setMenuFilterKds] = useState<'ALL' | 'AUTO' | 'MANUAL'>('ALL');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [localMenus, setLocalMenus] = useState<MenuShowHideItem[]>([]);
  const [hasMenuChanges, setHasMenuChanges] = useState<boolean>(false);
  const [savingMenus, setSavingMenus] = useState<boolean>(false);
  const [showKdsExplainModal, setShowKdsExplainModal] = useState<boolean>(false);

  const fetchMenuShowHide = async (hostOverride?: string) => {
    const hostToUse = hostOverride || connectedHost || searchParams.get('host') || selectedRestaurant?.ip;
    if (!hostToUse) {
      setMenuShowHideData(null);
      setLocalMenus([]);
      return;
    }
    setLoadingMenuShowHide(true);
    try {
      const res = await mongoService.getMenuShowHide(hostToUse, 27017);
      setMenuShowHideData(res);
      setLocalMenus(res.menus);
      setHasMenuChanges(false);
      showToast(`Đã tải ${res.total} danh mục menu (${res.total_auto_kds} KDS tự động)`, 'info');
    } catch (err: any) {
      console.error('Lỗi khi tải danh mục menu:', err);
      showToast('Lỗi khi tải menu: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoadingMenuShowHide(false);
    }
  };

  const handleToggleMenuChannel = (id: number, channel: 'co' | 'so' | 'qr' | 'kds') => {
    setLocalMenus((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const newM = { ...m };
        if (channel === 'co') newM.show_in_co = !newM.show_in_co;
        if (channel === 'so') newM.show_in_so = !newM.show_in_so;
        if (channel === 'qr') newM.show_in_qr_order = !newM.show_in_qr_order;
        if (channel === 'kds') newM.auto_delivery_in_so = !newM.auto_delivery_in_so;
        return newM;
      })
    );
    setHasMenuChanges(true);
  };

  const handleBatchToggleKds = (enableAuto: boolean) => {
    setLocalMenus((prev) =>
      prev.map((m) => ({
        ...m,
        auto_delivery_in_so: enableAuto
      }))
    );
    setHasMenuChanges(true);
    showToast(enableAuto ? 'Đã bật Tự Động Ra Món KDS cho tất cả menu' : 'Đã tắt Tự Động Ra Món KDS cho tất cả menu', 'info');
  };

  const handleResetMenus = () => {
    if (menuShowHideData) {
      setLocalMenus(menuShowHideData.menus);
      setHasMenuChanges(false);
      showToast('Đã khôi phục cài đặt menu ban đầu', 'info');
    }
  };

  const handleSaveMenus = async () => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) return;
    setSavingMenus(true);
    try {
      const res = await mongoService.saveMenuShowHide({
        host: hostToUse,
        port: 27017,
        restaurant_id: selectedRestaurant?.id,
        menus: localMenus.map((m) => ({
          id: m.id,
          code: m.code,
          show_in_co: m.show_in_co,
          show_in_so: m.show_in_so,
          show_in_qr_order: m.show_in_qr_order,
          auto_delivery_in_so: m.auto_delivery_in_so
        }))
      });
      if (res.success) {
        showToast(res.message, 'success');
        setHasMenuChanges(false);
        fetchMenuShowHide(hostToUse);
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu menu:', err);
      showToast('Lỗi khi lưu menu: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingMenus(false);
    }
  };

  const filteredVisibleDishes = useMemo(() => {
    if (!visibleDishSearch.trim()) return localVisibleDishes;
    const q = removeVietnameseTones(visibleDishSearch);
    return localVisibleDishes.filter((d) => {
      return (
        removeVietnameseTones(d.name).includes(q) ||
        d.item_code.toLowerCase().includes(q) ||
        (d.sap_code && d.sap_code.toLowerCase().includes(q))
      );
    });
  }, [localVisibleDishes, visibleDishSearch]);

  const filteredHiddenDishes = useMemo(() => {
    if (!hiddenDishSearch.trim()) return localHiddenDishes;
    const q = removeVietnameseTones(hiddenDishSearch);
    return localHiddenDishes.filter((d) => {
      return (
        removeVietnameseTones(d.name).includes(q) ||
        d.item_code.toLowerCase().includes(q) ||
        (d.sap_code && d.sap_code.toLowerCase().includes(q))
      );
    });
  }, [localHiddenDishes, hiddenDishSearch]);

  const filteredMenus = useMemo(() => {
    let list = localMenus;
    if (menuFilterKds === 'AUTO') {
      list = list.filter((m) => m.auto_delivery_in_so);
    } else if (menuFilterKds === 'MANUAL') {
      list = list.filter((m) => !m.auto_delivery_in_so);
    }
    if (!menuSearchQuery.trim()) return list;
    const q = removeVietnameseTones(menuSearchQuery);
    return list.filter((m) => {
      const name = removeVietnameseTones(m.name);
      const sub = removeVietnameseTones(m.subtitle || '');
      const code = m.code.toLowerCase();
      const sap = (m.sap_code || '').toLowerCase();
      const rk7 = (m.rk7_code || '').toLowerCase();
      return name.includes(q) || sub.includes(q) || code.includes(q) || sap.includes(q) || rk7.includes(q);
    });
  }, [localMenus, menuFilterKds, menuSearchQuery]);

  useEffect(() => {
    if (activeTab === 'task_actions' && (connectedHost || selectedRestaurant)) {
      if (selectedTaskId === 'clear_table_locks') {
        fetchLockStatus();
      } else if (selectedTaskId === 'unlock_tablet_users') {
        fetchTabletUsers();
      } else if (selectedTaskId === 'check_kds') {
        fetchKdsItems();
        fetchKdsPlaces();
      } else if (selectedTaskId === 'dish_show_hide') {
        fetchDishShowHide();
      } else if (selectedTaskId === 'menu_show_hide') {
        fetchMenuShowHide();
      } else if (selectedTaskId === 'check_action_logs') {
        fetchActionLogSessions();
      }
    }
  }, [activeTab, selectedTaskId, connectedHost, selectedRestaurant]);

  // Tự động nhận diện & ưu tiên chuyển sang máy chủ KDS nếu phát hiện máy có CONFIG_COOKING hoặc .41/.42
  useEffect(() => {
    if (activeTab === 'task_actions' && selectedTaskId === 'check_kds' && openCandidates.length > 1 && selectedRestaurant) {
      const restKey = `${selectedRestaurant.id}_kds`;
      if (hasAutoSwitchedKdsRef.current === restKey) {
        return; // Đã xử lý cho nhà hàng này rồi, không tự động đảo lại nếu người dùng chủ động chọn
      }

      const currentCandidate = openCandidates.find((c) => c.ip === connectedHost);
      // Ưu tiên máy có KDS (c.is_kds và số món > 0) hoặc đuôi .41/.42
      const kdsCandidate = openCandidates.find(
        (c) => (c.is_kds && (c.kds_dish_count || 0) > 0) || c.ip.endsWith('.41') || c.ip.endsWith('.42')
      );

      // Nếu máy hiện tại không phải máy KDS (hoặc có 0 món) và có máy KDS chuyên dụng
      if (
        kdsCandidate &&
        kdsCandidate.ip !== connectedHost &&
        (!currentCandidate || !currentCandidate.is_kds || (currentCandidate.kds_dish_count || 0) === 0)
      ) {
        hasAutoSwitchedKdsRef.current = restKey;
        handleSwitchMongoHost(kdsCandidate.ip);
        showToast(
          `⚡ Đã tự động chọn máy chủ KDS (${kdsCandidate.ip}:27017 - Có ${kdsCandidate.kds_dish_count || 0} món cấu hình)`,
          'success'
        );
      }
    }
  }, [activeTab, selectedTaskId, openCandidates, connectedHost, selectedRestaurant]);


  const handleClearAllLocks = async () => {
    if (!selectedRestaurant && !connectedHost) {
      showToast('Vui lòng chọn Nhà Hàng trước khi thực hiện xóa khóa bàn', 'error');
      return;
    }
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) {
      showToast('Không xác định được IP kết nối của nhà hàng', 'error');
      return;
    }

    const restName = selectedRestaurant
      ? `${selectedRestaurant.sap ? '[' + selectedRestaurant.sap + '] ' : ''}${selectedRestaurant.res}`
      : hostToUse;
    const confirmMsg = `Bạn có chắc chắn muốn xóa TOÀN BỘ khóa bàn Tablet cho nhà hàng:\n👉 ${restName}\n\nTác vụ này sẽ:\n- Xóa sạch toàn bộ phiên khóa trong LOCK_ORDER\n- Reset danh sách user tablet đang chiếm giữ (lstTgsUser)\n- Gỡ bỏ các cờ khóa (lockOrder, locked, isLock) trong ORDER`;
    if (!window.confirm(confirmMsg)) return;

    setClearingLocks(true);
    try {
      const res = await mongoService.clearTableLocks({
        restaurant_id: selectedRestaurant?.id,
        host: hostToUse,
        port: 27017,
        reopen_pre_payment: reopenPrePayment
      });
      if (res.success) {
        showToast(res.message, 'success');
        await fetchLockStatus(hostToUse);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      console.error('Lỗi khi xóa khóa bàn:', err);
      showToast('Lỗi khi xóa khóa bàn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setClearingLocks(false);
    }
  };

  const handleClearSingleLock = async (guid: string, tableName: string) => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) return;

    if (!window.confirm(`Bạn có chắc muốn mở khóa riêng cho "${tableName}"?`)) return;

    setClearingSingleGuid(guid);
    try {
      const res = await mongoService.clearTableLocks({
        restaurant_id: selectedRestaurant?.id,
        host: hostToUse,
        port: 27017,
        guid: guid,
        table_name: tableName,
        reopen_pre_payment: reopenPrePayment
      });
      if (res.success) {
        showToast(res.message, 'success');
        await fetchLockStatus(hostToUse);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast('Lỗi khi mở khóa bàn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setClearingSingleGuid(null);
    }
  };

  // Filtered locked tables
  const filteredLockedTables = useMemo(() => {
    if (!lockStatus?.locked_tables) return [];
    if (!lockFilterQuery.trim()) return lockStatus.locked_tables;
    const q = removeVietnameseTones(lockFilterQuery);
    return lockStatus.locked_tables.filter((it) => {
      const tName = removeVietnameseTones(it.table_name || '');
      const uName = removeVietnameseTones(it.locked_by_user_name || '');
      const uCode = (it.locked_by_user_code || '').toLowerCase();
      const statusDesc = removeVietnameseTones(it.status_desc || '');
      const activeUsersStr = removeVietnameseTones(it.active_users.join(' '));
      return (
        tName.includes(q) ||
        uName.includes(q) ||
        uCode.includes(q) ||
        statusDesc.includes(q) ||
        activeUsersStr.includes(q)
      );
    });
  }, [lockStatus, lockFilterQuery]);

  // ── ĐỒNG BỘ TOÀN BỘ SO & CO (Theo yêu cầu: Đồng bộ SO trước, KDS cooking time, rồi CO sau) ──
  const [isSyncingAllSoCo, setIsSyncingAllSoCo] = useState<boolean>(false);
  const [menuSyncTrigger, setMenuSyncTrigger] = useState<number>(0);

  const handleSyncAllSoCo = async () => {
    const hostToUse = connectedHost || selectedRestaurant?.ip;
    if (!hostToUse) {
      showToast('Vui lòng chọn hoặc kết nối máy trạm MongoDB nhà hàng trước khi đồng bộ', 'error');
      return;
    }
    setIsSyncingAllSoCo(true);
    try {
      const res = await mongoService.syncAllSoCo(
        hostToUse,
        27017,
        selectedRestaurant?.sap || ''
      );
      showToast(res.message, 'success');
      // Kích hoạt reload trực tiếp danh sách món trong ManageMenuSoCoTask mà không cần F5 trang
      setMenuSyncTrigger((prev) => prev + 1);
      if (selectedRestaurant) {
        fetchRestaurantGposInfo(hostToUse, selectedRestaurant.id);
      }
    } catch (err: any) {
      console.error('Lỗi khi đồng bộ toàn bộ SO/CO:', err);
      showToast('Lỗi khi đồng bộ toàn bộ SO/CO: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSyncingAllSoCo(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '50px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#065F46' : toast.type === 'error' ? '#991B1B' : '#1E40AF',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Header & Restaurant Searchable Combobox */}
      <div
        style={{
          backgroundColor: 'var(--bg-card, #fff)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '18px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          {/* Title & Back */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/restaurants')}
              leftIcon={<ArrowLeft size={16} />}
            >
              Quay lại
            </Button>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={22} style={{ color: '#059669' }} />
                Phân Tích MongoDB Nhà Hàng
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Truy vấn danh sách bàn ăn, xuất báo cáo riêng và khảo sát các bảng dữ liệu trong <code>G_ORDER</code> &amp; <code>G_KITCHEN</code>
              </p>
            </div>
          </div>

          {/* Restaurant Info Header Box (G-pos Version CO/SO, RK7, Tên Nhà Hàng, Gpos Version KDS) */}
          {selectedRestaurant && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: '8px',
                padding: '6px 14px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                flexWrap: 'wrap'
              }}
            >
              {/* Tên Nhà Hàng */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Store size={15} style={{ color: '#0F766E' }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F766E' }}>
                  {restaurantGposInfo?.restaurant_name || selectedRestaurant.res}
                </span>
              </div>

              <div style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1' }} />

              {/* Mã RK7 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Mã RK7:</span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#0F172A',
                    backgroundColor: '#E2E8F0',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}
                >
                  {restaurantGposInfo?.rk7_code || selectedRestaurant.rk7 || selectedRestaurant.coscenter || '-'}
                </span>
              </div>

              <div style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1' }} />

              {/* G-POS Version CO/SO */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>G-pos Version CO/SO:</span>
                <span
                  title={
                    restaurantGposInfo?.menu_version_co
                      ? `GPOS Server: ${restaurantGposInfo.gpos_version_co_so || 'v2.4.154'} | Menu Sync CO: ${restaurantGposInfo.menu_version_co}`
                      : 'Phiên bản GPOS Server CO/SO (Staff Order)'
                  }
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#1E40AF',
                    backgroundColor: '#DBEAFE',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #BFDBFE',
                    cursor: 'default'
                  }}
                >
                  {restaurantGposInfo?.gpos_version_co_so || 'v2.4.154'}
                </span>
              </div>

              <div style={{ width: '1px', height: '18px', backgroundColor: '#CBD5E1' }} />

              {/* Gpos Version KDS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400E' }}>Gpos Version KDS:</span>
                <span
                  title="Phiên bản KDS GPOS Server"
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #FDE68A',
                    cursor: 'default'
                  }}
                >
                  {restaurantGposInfo?.gpos_version_kds || 'v1.0.45.1'}
                </span>
              </div>
            </div>
          )}

          {/* Searchable Combobox Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div ref={dropdownRef} style={{ position: 'relative', width: '360px' }}>
              <div
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary, #fff)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <Building2 size={16} color="#6B7280" />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: selectedRestaurant ? 'var(--text-primary)' : '#6B7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {selectedRestaurant
                      ? `${selectedRestaurant.sap ? `[${selectedRestaurant.sap}] ` : ''}${selectedRestaurant.res}`
                      : '-- Tất Cả Nhà Hàng (Dùng Cho Xuất Báo Cáo) --'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {selectedRestaurant && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRestaurant(null);
                      }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}
                      title="Bỏ chọn (Xuất tất cả)"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <ChevronDown size={16} color="#6B7280" />
                </div>
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '6px',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    overflow: 'hidden'
                  }}
                >
                  {/* Search inside dropdown */}
                  <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#F9FAFB' }}>
                    <div style={{ position: 'relative' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                      <input
                        type="text"
                        autoFocus
                        value={restaurantSearchQuery}
                        onChange={(e) => setRestaurantSearchQuery(e.target.value)}
                        placeholder="Nhập mã SAP, tên NH hoặc IP..."
                        style={{
                          width: '100%',
                          padding: '7px 10px 7px 30px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          outline: 'none',
                          backgroundColor: '#fff'
                        }}
                      />
                    </div>
                  </div>

                  {/* List Options */}
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {/* All option */}
                    <div
                      onClick={() => handleSelectRestaurant(null)}
                      style={{
                        padding: '9px 12px',
                        fontSize: '13px',
                        fontWeight: !selectedRestaurant ? 700 : 500,
                        backgroundColor: !selectedRestaurant ? '#ECFDF5' : 'transparent',
                        color: !selectedRestaurant ? '#065F46' : 'var(--text-primary)',
                        cursor: 'pointer',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>🌐 -- Tất Cả Nhà Hàng (Dùng Cho Xuất All) --</span>
                      {!selectedRestaurant && <Check size={14} color="#059669" />}
                    </div>

                    {filteredRestaurants.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
                        Không tìm thấy nhà hàng phù hợp
                      </div>
                    ) : (
                      filteredRestaurants.map((r) => {
                        const isSelected = selectedRestaurant?.id === r.id;
                        return (
                          <div
                            key={r.id}
                            onClick={() => handleSelectRestaurant(r)}
                            style={{
                              padding: '8px 12px',
                              fontSize: '12px',
                              fontWeight: isSelected ? 700 : 400,
                              backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                              color: isSelected ? '#1E40AF' : 'var(--text-primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 700, color: '#111827', marginRight: '6px' }}>
                                {r.sap ? `[${r.sap}]` : ''}
                              </span>
                              <span>{r.res}</span>
                              {r.ip && <span style={{ color: '#6B7280', marginLeft: '6px' }}>({r.ip})</span>}
                            </div>
                            {isSelected && <Check size={14} color="#2563EB" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Connect / Status Button */}
            {selectedRestaurant && (
              <Button
                variant={connectedHost ? 'outline' : 'primary'}
                size="sm"
                onClick={() => connectMongo(selectedRestaurant)}
                disabled={isConnecting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {isConnecting ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang kết nối...</span>
                  </>
                ) : connectedHost ? (
                  <>
                    <Server size={14} color="#059669" />
                    <span>Dò Lại ({connectedHost}:27017)</span>
                  </>
                ) : (
                  <>
                    <Server size={14} />
                    <span>Kết Nối MongoDB</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Selected Restaurant Status / Error Banner */}
        {selectedRestaurant && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>
                {selectedRestaurant.sap ? `[${selectedRestaurant.sap}] ` : ''}{selectedRestaurant.res}
              </span>
              <span style={{ color: '#6B7280' }}>|</span>
              <span style={{ color: '#4B5563' }}>IP Gateway: <strong>{selectedRestaurant.ip || '—'}</strong></span>
              <span style={{ color: '#6B7280' }}>|</span>
              <span style={{ color: '#4B5563' }}>Trạng Thái: <strong style={{ color: '#059669' }}>{selectedRestaurant.trangthai || 'ON'}</strong></span>
            </div>

            <div>
              {connectedHost ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {openCandidates.length > 1 ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Server size={13} color="#16A34A" />
                        <span>Chọn MongoDB ({openCandidates.length} máy ON):</span>
                      </span>
                      {openCandidates.map((c) => {
                        const isSel = c.ip === connectedHost;
                        return (
                          <button
                            key={c.ip}
                            type="button"
                            onClick={() => handleSwitchMongoHost(c.ip)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: isSel ? 800 : 600,
                              backgroundColor: isSel ? '#059669' : '#FFFFFF',
                              color: isSel ? '#FFFFFF' : '#1F2937',
                              border: isSel ? '1.5px solid #047857' : '1px solid #D1D5DB',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: isSel ? '0 1px 3px rgba(5, 150, 105, 0.3)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: isSel ? '#FFFFFF' : '#10B981' }} />
                            <span>{c.ip}</span>
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: isSel ? 'rgba(255,255,255,0.25)' : (c.is_kds || c.ip.endsWith('.41')) ? '#DCFCE7' : '#F3F4F6', color: isSel ? '#FFFFFF' : (c.is_kds || c.ip.endsWith('.41')) ? '#15803D' : '#6B7280' }}>
                              {getIpRoleLabel(c)}
                            </span>
                            {isSel && <Check size={12} color="#FFFFFF" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '16px', color: '#065F46', fontSize: '12px', fontWeight: 700 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                      <span>Đã kết nối MongoDB: {connectedHost}:27017</span>
                    </div>
                  )}
                </div>
              ) : isConnecting ? (
                <span style={{ fontSize: '12px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                  Đang dò tìm IP .41, .11, .12, .13, .14, .42...
                </span>
              ) : connectionError ? (
                <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                  ⚠️ {connectionError}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('task_actions')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'task_actions' ? 700 : 500,
            color: activeTab === 'task_actions' ? '#D97706' : '#6B7280',
            borderBottom: activeTab === 'task_actions' ? '3px solid #D97706' : '3px solid transparent',
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
          <Wrench size={16} />
          <span>Tab 1: Xử Lý Tác Vụ</span>
          {lockStatus && lockStatus.total_locked_tables > 0 && (
            <span
              style={{
                backgroundColor: '#EF4444',
                color: '#fff',
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 700
              }}
            >
              {lockStatus.total_locked_tables}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? 'var(--color-primary, #059669)' : '#6B7280',
            borderBottom: activeTab === 'reports' ? '3px solid var(--color-primary, #059669)' : '3px solid transparent',
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
          <FileSpreadsheet size={16} />
          <span>Tab 2: Báo Cáo Xây Dựng Riêng Cho Từng Nhà Hàng</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('android_emulator')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'android_emulator' ? 700 : 500,
            color: activeTab === 'android_emulator' ? 'var(--color-primary, #059669)' : '#6B7280',
            borderBottom: activeTab === 'android_emulator' ? '3px solid var(--color-primary, #059669)' : '3px solid transparent',
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
          <LayoutGrid size={16} />
          <span>Tab 3: Sơ Đồ Bàn Theo Khu (Restaurant Table Map)</span>
        </button>
      </div>


      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 2 CONTENT: BÁO CÁO XÂY DỰNG RIÊNG (DANH SÁCH BÀN) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Report Configuration & Filter Card */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                {/* Select Report Type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#4B5563', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Chọn Loại Báo Cáo:
                    </label>
                    <select
                      value={selectedReportType}
                      onChange={(e) => setSelectedReportType(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1.5px solid var(--border-color)',
                        backgroundColor: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#111827',
                        outline: 'none',
                        minWidth: '320px'
                      }}
                    >
                      <option value="table_report">🍽️ Báo Cáo Danh Sách Bàn Theo Nhà Hàng (TABLE &amp; HALL_PLAN)</option>
                    </select>
                  </div>

                  {/* Scope note */}
                  <div style={{ padding: '8px 12px', backgroundColor: '#F0FDF4', borderRadius: '6px', border: '1px solid #BBF7D0', fontSize: '12px', color: '#166534', marginTop: '16px' }}>
                    Phạm vi: <strong>{selectedRestaurant ? `[${selectedRestaurant.sap}] ${selectedRestaurant.res}` : 'Tất Cả Nhà Hàng Đang ON/NEW'}</strong>
                  </div>
                </div>

                {/* Right controls: Split checkbox & Run button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {/* Checkbox chia khu vực */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '8px 12px',
                      backgroundColor: splitByHall ? '#FFFBEB' : '#F9FAFB',
                      border: `1px solid ${splitByHall ? '#FCD34D' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={splitByHall}
                      onChange={(e) => setSplitByHall(e.target.checked)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: splitByHall ? '#92400E' : '#374151' }}>
                        Chia theo từng Khu Vực / Tầng (HALL_PLAN)
                      </span>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                        {splitByHall ? 'Tách mỗi khu vực 1 dòng riêng' : 'Gộp tổng số bàn của toàn nhà hàng'}
                      </div>
                    </div>
                  </label>

                  {/* Button Fetch Data */}
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleFetchTableReport}
                    disabled={loadingReport}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#059669',
                      borderColor: '#047857',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '8px 16px'
                    }}
                  >
                    {loadingReport ? (
                      <>
                        <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Đang Quét Dữ Liệu Bàn...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={15} />
                        <span>⚡ Lấy Dữ Liệu Báo Cáo</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Results Table Section */}
          <div
            style={{
              backgroundColor: 'var(--bg-card, #fff)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            {/* Table Toolbar */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                backgroundColor: '#F9FAFB'
              }}
            >
              {/* Left stats */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📊 Kết quả: <strong>{summaryStats.totalRows}</strong> dòng
                </span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>•</span>
                <span style={{ fontSize: '12px', color: '#4B5563' }}>
                  Nhà hàng: <strong>{summaryStats.distinctRests}</strong>
                </span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>•</span>
                <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>
                  Tổng số bàn ăn: <strong>{summaryStats.totalTables.toLocaleString()}</strong> bàn
                </span>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>•</span>
                <span style={{ fontSize: '11px', color: splitByHall ? '#92400E' : '#2563EB', fontWeight: 600 }}>
                  {splitByHall ? '🏷️ Đang chia theo khu vực' : '🏷️ Đang gộp toàn nhà hàng'}
                </span>
              </div>

              {/* Right search & export buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={reportFilterQuery}
                    onChange={(e) => setReportFilterQuery(e.target.value)}
                    placeholder="Lọc tên, SAP, bàn..."
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 28px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      outline: 'none',
                      backgroundColor: '#fff'
                    }}
                  />
                  {reportFilterQuery && (
                    <button
                      type="button"
                      onClick={() => setReportFilterQuery('')}
                      style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyTableTSV}
                  disabled={filteredReportItems.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  {copiedAllExcel ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                  <span>Sao Chép Excel</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={filteredReportItems.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={14} />
                  <span>Xuất CSV</span>
                </Button>
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto', maxHeight: '680px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: '#374151', width: '50px', textAlign: 'center' }}>STT</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#374151', minWidth: '240px' }}>Mã SAP &amp; Tên Nhà Hàng</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#374151', minWidth: '130px' }}>IP MongoDB</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#374151', minWidth: '130px', textAlign: 'center' }}>
                      {splitByHall ? 'Tổng Bàn (isCurrentRes: true)' : 'Số Bàn (isCurrentRes: true)'}
                    </th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#374151', minWidth: '160px' }}>Khu Vực / Tầng (HALL_PLAN)</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700, color: '#374151', minWidth: '320px' }}>Danh Sách Mẫu Bàn</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReport ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '50px 20px', textAlign: 'center', color: '#6B7280' }}>
                        <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Đang kết nối MongoDB và trích xuất dữ liệu bàn...</p>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9CA3AF' }}>Vui lòng chờ trong giây lát (hệ thống xử lý song song đa luồng siêu tốc).</p>
                      </td>
                    </tr>
                  ) : filteredReportItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center', color: '#6B7280' }}>
                        <TableProperties size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#374151' }}>Chưa có dữ liệu báo cáo</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
                          Vui lòng bấm nút <strong>"⚡ Lấy Dữ Liệu Báo Cáo"</strong> phía trên để truy vấn dữ liệu từ MongoDB nhà hàng.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReportItems.map((item, idx) => {
                      const isOffline = !!item.error;
                      return (
                        <tr
                          key={`${item.restaurant_id}_${item.hall_id ?? idx}`}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isOffline ? '#FEF2F2' : idx % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
                            transition: 'background-color 0.1s'
                          }}
                        >
                          {/* STT */}
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
                            {idx + 1}
                          </td>

                          {/* Mã SAP & Tên Nhà Hàng */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: '#E0E7FF',
                                  color: '#3730A3',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  fontFamily: 'monospace'
                                }}
                              >
                                {item.sap_code || '—'}
                              </span>
                              <span style={{ fontWeight: 600, color: '#111827' }}>
                                {item.restaurant_name}
                              </span>
                            </div>
                          </td>

                          {/* IP MongoDB */}
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: '#4B5563' }}>
                            {item.mongo_ip}
                          </td>

                          {/* Tổng Bàn */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            {isOffline ? (
                              <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600 }}>0 bàn</span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '12px',
                                  backgroundColor: item.total_tables > 0 ? '#ECFDF5' : '#F3F4F6',
                                  color: item.total_tables > 0 ? '#065F46' : '#6B7280',
                                  fontWeight: 700,
                                  fontSize: '13px'
                                }}
                              >
                                {item.total_tables} bàn
                              </span>
                            )}
                          </td>

                          {/* Khu Vực / Tầng */}
                          <td style={{ padding: '10px 14px' }}>
                            {isOffline ? (
                              <span style={{ color: '#9CA3AF' }}>—</span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: splitByHall ? '#FEF3C7' : '#EFF6FF',
                                  color: splitByHall ? '#92400E' : '#1E40AF',
                                  fontWeight: 600,
                                  fontSize: '12px'
                                }}
                              >
                                🏷️ {item.hall_name}
                              </span>
                            )}
                          </td>

                          {/* Danh Sách Mẫu Bàn */}
                          <td style={{ padding: '10px 14px' }}>
                            {isOffline ? (
                              <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: 500 }}>
                                ⚠️ {item.error}
                              </span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: '#374151',
                                    lineHeight: 1.5,
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {item.tables_sample || '—'}
                                </span>
                                {item.tables_sample && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.tables_sample);
                                      setCopiedRowIdx(idx);
                                      showToast(`Đã chép danh sách bàn của [${item.restaurant_name}]`, 'success');
                                      setTimeout(() => setCopiedRowIdx(null), 1500);
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: copiedRowIdx === idx ? '#059669' : '#9CA3AF',
                                      padding: '4px',
                                      flexShrink: 0
                                    }}
                                    title="Chép danh sách bàn"
                                  >
                                    {copiedRowIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                                  </button>
                                )}
                              </div>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 3 CONTENT: SƠ ĐỒ BÀN THEO KHU (STAFF ORDER / WAITER) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'android_emulator' && (
        <AndroidEmulatorTab
          selectedRestaurant={selectedRestaurant}
          connectedHost={connectedHost}
          onToast={showToast}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* TAB 1 CONTENT: XỬ LÝ TÁC VỤ */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'task_actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ══════════════════════════════════════════════════════════ */}
          {/* BỘ CHỌN TÁC VỤ CẦN XỬ LÝ (COMBOBOX TỪNG DÒNG + TÌM KIẾM) */}
          {/* ══════════════════════════════════════════════════════════ */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                {/* Left: Task Dropdown Selector */}
                <div style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '320px', maxWidth: '720px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Wrench size={13} color="#D97706" />
                    <span>Chọn Tác Vụ Cần Xử Lý:</span>
                  </label>

                  {/* Combobox Trigger Box & Nút Chấm Than Giải Thích Tác Vụ */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div ref={taskDropdownRef} style={{ position: 'relative', flex: 1 }}>
                      <div
                        onClick={() => setIsTaskDropdownOpen(!isTaskDropdownOpen)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: '#fff',
                          border: isTaskDropdownOpen ? '1.5px solid #D97706' : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          {renderTaskIcon(selectedTask.id, false)}
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {renderHighlightedTitle(selectedTask, false)}
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          color="#6B7280"
                          style={{
                            transform: isTaskDropdownOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.15s',
                            flexShrink: 0,
                            marginLeft: '8px'
                          }}
                        />
                      </div>

                      {/* Dropdown Menu (Hiển thị từng dòng tác vụ kèm search input) */}
                      {isTaskDropdownOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 100,
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Input search trong dropdown để nhập tìm kiếm tác vụ */}
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-color)', backgroundColor: '#F9FAFB' }}>
                            <div style={{ position: 'relative' }}>
                              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                              <input
                                type="text"
                                value={taskSearchQuery}
                                onChange={(e) => setTaskSearchQuery(e.target.value)}
                                placeholder="Nhập tên tác vụ, từ khóa (khóa bàn, logs, guid, tablet...)..."
                                autoFocus
                                style={{
                                  width: '100%',
                                  padding: '6px 10px 6px 30px',
                                  fontSize: '12px',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  outline: 'none'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>

                          {/* Danh sách từng dòng tác vụ */}
                          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                            {filteredTasks.length === 0 ? (
                              <div style={{ padding: '16px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>
                                Không tìm thấy tác vụ nào khớp với từ khóa "{taskSearchQuery}".
                              </div>
                            ) : (
                              filteredTasks.map((t) => {
                                const isSelected = selectedTaskId === t.id;
                                return (
                                  <div
                                    key={t.id}
                                    onClick={() => {
                                      setSelectedTaskId(t.id);
                                      setIsTaskDropdownOpen(false);
                                      setTaskSearchQuery('');
                                    }}
                                    style={{
                                      padding: '8px 14px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      gap: '12px',
                                      cursor: 'pointer',
                                      backgroundColor: isSelected ? '#FEF3C7' : 'transparent',
                                      borderBottom: '1px solid #F3F4F6',
                                      transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) e.currentTarget.style.backgroundColor = '#F9FAFB';
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                                      {renderTaskIcon(t.id, isSelected)}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {renderHighlightedTitle(t, isSelected)}
                                        {t.badge && (
                                          <span
                                            style={{
                                              fontSize: '10px',
                                              fontWeight: 700,
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                              backgroundColor:
                                                t.id === 'clear_table_locks'
                                                  ? '#FEF3C7'
                                                  : t.id === 'unlock_tablet_users'
                                                  ? '#EFF6FF'
                                                  : t.id === 'manage_menu_so_co'
                                                  ? '#DBEAFE'
                                                  : t.id === 'check_kds'
                                                  ? '#ECFDF5'
                                                  : t.id === 'dish_show_hide'
                                                  ? '#FFEDD5'
                                                  : t.id === 'menu_show_hide'
                                                  ? '#F3E8FF'
                                                  : '#EEF2FF',
                                              color:
                                                t.id === 'clear_table_locks'
                                                  ? '#92400E'
                                                  : t.id === 'unlock_tablet_users'
                                                  ? '#1D4ED8'
                                                  : t.id === 'manage_menu_so_co'
                                                  ? '#1E40AF'
                                                  : t.id === 'check_kds'
                                                  ? '#047857'
                                                  : t.id === 'dish_show_hide'
                                                  ? '#C2410C'
                                                  : t.id === 'menu_show_hide'
                                                  ? '#7E22CE'
                                                  : '#4338CA'
                                            }}
                                          >
                                            {t.badge}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {isSelected && <Check size={16} color="#D97706" style={{ flexShrink: 0 }} />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Nút Chấm Than Giải Thích Tác Vụ (Chuyển lên trên cạnh bộ chọn) */}
                    <button
                      type="button"
                      onClick={() => toggleTaskHelp(selectedTaskId)}
                      title={taskHelpOpen[selectedTaskId] ? 'Ẩn giải thích tác vụ' : 'Bấm để xem chi tiết giải thích tác vụ'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: taskHelpOpen[selectedTaskId] ? '#D97706' : '#FEF3C7',
                        color: taskHelpOpen[selectedTaskId] ? '#FFFFFF' : '#B45309',
                        border: '1.5px solid #F59E0B',
                        fontSize: '15px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      !
                    </button>

                    {/* Nút Đồng Bộ Toàn Bộ SO & CO (Theo yêu cầu: đặt cạnh nút chấm than) */}
                    <button
                      type="button"
                      onClick={handleSyncAllSoCo}
                      disabled={isSyncingAllSoCo || !connectedHost}
                      title="Đồng bộ toàn bộ: Đồng bộ SO trước (giá, tên, KDS cooking time), sau đó đồng bộ CO"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        height: '32px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        backgroundColor: isSyncingAllSoCo ? '#9CA3AF' : '#059669',
                        color: '#FFFFFF',
                        border: '1px solid #047857',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: (isSyncingAllSoCo || !connectedHost) ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        boxShadow: '0 1px 3px rgba(5, 150, 105, 0.25)',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <RefreshCw size={13} style={{ animation: isSyncingAllSoCo ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{isSyncingAllSoCo ? 'Đang đồng bộ...' : 'Đồng Bộ SO ➔ CO'}</span>
                    </button>
                  </div>

                  {/* Chi Tiết Giải Thích Tác Vụ (Hiển thị khi nhấn nút chấm than) */}
                  {taskHelpOpen[selectedTaskId] && (
                    <div
                      style={{
                        marginTop: '6px',
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        color: '#92400E',
                        fontSize: '12px',
                        lineHeight: '1.45',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <Info size={15} style={{ flexShrink: 0, color: '#D97706', marginTop: '2px' }} />
                      <div>
                        {getTaskExplanation(selectedTaskId)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Điều chỉnh Email Báo Cáo Mặc Định (Chỉ Super Admin & dung.nguyenanh) */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                  {isPrivileged && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>
                          <Mail size={12} color="#D97706" />
                          <span>Mail báo cáo mặc định:</span>
                        </label>
                        <input
                          type="email"
                          value={defaultEmail}
                          onChange={(e) => setDefaultEmail(e.target.value)}
                          placeholder="dung.nguyenanh@ggg.com.vn"
                          style={{
                            padding: '6px 10px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid #D97706',
                            outline: 'none',
                            width: '230px',
                            backgroundColor: '#FFFFFF',
                            color: '#1F2937',
                            fontWeight: 600
                          }}
                        />
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveEmailConfig}
                        isLoading={isSavingEmail}
                        disabled={isSavingEmail}
                        style={{
                          backgroundColor: '#D97706',
                          borderColor: '#B45309',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          height: '32px'
                        }}
                      >
                        Lưu Email
                      </Button>
                    </div>
                  )}

                  {selectedTaskId !== 'fix_full_cpu' && selectedTaskId !== 'transfer_database' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedTaskId === 'clear_table_locks') {
                          fetchLockStatus();
                        } else if (selectedTaskId === 'unlock_tablet_users') {
                          fetchTabletUsers();
                        } else if (selectedTaskId === 'check_kds') {
                          fetchKdsItems();
                        } else if (selectedTaskId === 'dish_show_hide') {
                          fetchDishShowHide();
                        } else if (selectedTaskId === 'menu_show_hide') {
                          fetchMenuShowHide();
                        } else if (selectedTaskId === 'check_action_logs') {
                          fetchActionLogSessions();
                        }
                      }}
                      leftIcon={<RefreshCw size={13} style={{ animation: (loadingLockStatus || loadingActionLogs || loadingTabletUsers || loadingKds || loadingDishShowHide || loadingMenuShowHide) ? 'spin 1s linear infinite' : 'none' }} />}
                      style={{ height: '32px' }}
                    >
                      Quét Lại
                    </Button>
                  )}
                </div>

              </div>
            </div>
          </Card>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TÁC VỤ 1: XÓA KHÓA BÀN TABLET */}
          {/* ══════════════════════════════════════════════════════════ */}
          {selectedTaskId === 'clear_table_locks' && (
            <>
              {/* Header Card: Tác Vụ 1 - Xóa Khóa Bàn Tablet */}
              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Restaurant Context Badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
                {selectedRestaurant ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Badge variant="primary">
                      {selectedRestaurant.sap ? `[${selectedRestaurant.sap}] ` : ''}{selectedRestaurant.res}
                    </Badge>
                    <Badge variant="neutral">
                      IP: {connectedHost || selectedRestaurant.ip || '—'}:27017
                    </Badge>
                  </div>
                ) : (
                  <Badge variant="warning">
                    ⚠️ Chưa chọn Nhà Hàng cụ thể
                  </Badge>
                )}
              </div>

              {/* Warning if no specific restaurant is selected */}
              {!selectedRestaurant && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Cần chọn Nhà Hàng cụ thể:</strong> Tác vụ tác động trực tiếp vào cơ sở dữ liệu nhà hàng. Vui lòng bấm vào ô <strong>"-- Tất Cả Nhà Hàng --"</strong> ở góc trên bên phải để tìm và chọn nhà hàng bạn cần xử lý.
                  </div>
                </div>
              )}



              {/* Date Scope Selector Bar */}
              {selectedRestaurant && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#2563EB" />
                      Lọc theo ngày:
                    </span>

                    {/* Button Today (Mặc định) */}
                    <button
                      type="button"
                      onClick={() => {
                        setLockDateScope('today');
                        fetchLockStatus(undefined, 'today', includeOvernight);
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: lockDateScope === 'today' ? 700 : 500,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: lockDateScope === 'today' ? '#2563EB' : '#CBD5E1',
                        backgroundColor: lockDateScope === 'today' ? '#EFF6FF' : '#FFF',
                        color: lockDateScope === 'today' ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>📅 Chỉ Hôm nay</span>
                      {lockDateScope === 'today' && (
                        <span style={{ fontSize: '10px', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          Ưu tiên
                        </span>
                      )}
                    </button>

                    {/* Button Yesterday */}
                    <button
                      type="button"
                      onClick={() => {
                        setLockDateScope('yesterday');
                        fetchLockStatus(undefined, 'yesterday', includeOvernight);
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: lockDateScope === 'yesterday' ? 700 : 500,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: lockDateScope === 'yesterday' ? '#2563EB' : '#CBD5E1',
                        backgroundColor: lockDateScope === 'yesterday' ? '#EFF6FF' : '#FFF',
                        color: lockDateScope === 'yesterday' ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>🕒 Hôm qua</span>
                    </button>

                    {/* Button All */}
                    <button
                      type="button"
                      onClick={() => {
                        setLockDateScope('all');
                        fetchLockStatus(undefined, 'all', includeOvernight);
                      }}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: lockDateScope === 'all' ? 700 : 500,
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: lockDateScope === 'all' ? '#2563EB' : '#CBD5E1',
                        backgroundColor: lockDateScope === 'all' ? '#EFF6FF' : '#FFF',
                        color: lockDateScope === 'all' ? '#1D4ED8' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>🌐 Tất cả ngày (Bao gồm đơn cũ & khóa rác)</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Phạm vi: <strong style={{ color: '#0F172A' }}>{lockStatus?.filter_date_str || (lockDateScope === 'today' ? 'Hôm nay' : lockDateScope)}</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons & Search Toolbar */}
              {selectedRestaurant && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '4px' }}>
                  {/* Left: Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    {/* Scan / Refresh Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchLockStatus()}
                      disabled={loadingLockStatus || clearingLocks}
                      leftIcon={<RefreshCw size={14} style={{ animation: loadingLockStatus ? 'spin 1s linear infinite' : 'none' }} />}
                    >
                      {loadingLockStatus ? 'Đang quét...' : 'Quét Lại Bàn Bị Khóa'}
                    </Button>

                    {/* Clear ALL Locks Button */}
                    <button
                      type="button"
                      onClick={handleClearAllLocks}
                      disabled={clearingLocks || loadingLockStatus}
                      style={{
                        padding: '6px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        backgroundColor: '#DC2626',
                        color: '#fff',
                        border: 'none',
                        cursor: clearingLocks ? 'not-allowed' : 'pointer',
                        opacity: clearingLocks ? 0.7 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(220,38,38,0.2)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!clearingLocks) e.currentTarget.style.backgroundColor = '#B91C1C';
                      }}
                      onMouseLeave={(e) => {
                        if (!clearingLocks) e.currentTarget.style.backgroundColor = '#DC2626';
                      }}
                    >
                      {clearingLocks ? (
                        <>
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Đang xóa khóa bàn...</span>
                        </>
                      ) : (
                        <>
                          <Unlock size={14} />
                          <span>Xóa Toàn Bộ Khóa Bàn Tablet ({lockStatus?.total_locked_tables || 0})</span>
                        </>
                      )}
                    </button>

                    {/* Reopen Pre-payment Checkbox */}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#4B5563', cursor: 'pointer', marginLeft: '6px' }}>
                      <input
                        type="checkbox"
                        checked={reopenPrePayment}
                        onChange={(e) => setReopenPrePayment(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Đồng thời mở lại bàn đang chờ thanh toán (chuyển status 2 ➔ 1)</span>
                    </label>
                  </div>

                  {/* Right: Filter Input */}
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      value={lockFilterQuery}
                      onChange={(e) => setLockFilterQuery(e.target.value)}
                      placeholder="Lọc tên bàn, user, mã..."
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Table of Locked Tables */}
          {selectedRestaurant && (
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TableProperties size={16} color="#4B5563" />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Danh Sách Bàn Đang Bị Khóa Hoặc Bị Chiếm Giữ
                    </span>
                    <Badge variant={filteredLockedTables.length > 0 ? 'warning' : 'neutral'}>
                      {filteredLockedTables.length} bàn
                    </Badge>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    Sau khi bấm xóa khóa, nhân viên trên Tablet chỉ cần <strong>vuốt kéo màn hình xuống (Pull to refresh)</strong> để cập nhật bàn.
                  </span>
                </div>

                {loadingLockStatus ? (
                  <div style={{ padding: '50px', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px', color: '#D97706' }} />
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Đang quét trạng thái khóa bàn từ MongoDB...</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>Kiểm tra collection LOCK_ORDER và ORDER tại {connectedHost || selectedRestaurant.ip}:27017</p>
                  </div>
                ) : !lockStatus?.is_connected ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
                    <AlertCircle size={32} style={{ marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Không thể kết nối MongoDB nhà hàng</p>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6B7280' }}>{lockStatus?.message || 'Vui lòng kiểm tra lại trạng thái mạng hoặc IP nhà hàng.'}</p>
                    <Button variant="outline" size="sm" onClick={() => fetchLockStatus()} style={{ marginTop: '12px' }}>
                      Thử lại
                    </Button>
                  </div>
                ) : filteredLockedTables.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      backgroundColor: '#ECFDF5',
                      borderRadius: '8px',
                      border: '1px solid #A7F3D0',
                      color: '#065F46'
                    }}
                  >
                    <CheckCircle2 size={36} color="#059669" style={{ marginBottom: '10px' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Tất Cả Các Bàn Đang Hoạt Động Bình Thường!</h3>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#047857' }}>
                      Không có bàn nào bị khóa phiên tablet trong <code>LOCK_ORDER</code> hoặc bị treo chiếm giữ. Nhân viên có thể vào order bình thường.
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F3F4F6', color: '#374151', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '10px 12px', width: '50px' }}>STT</th>
                          <th style={{ padding: '10px 12px', width: '110px' }}>Tên Bàn</th>
                          <th style={{ padding: '10px 12px', width: '160px' }}>Trạng Thái Đơn</th>
                          <th style={{ padding: '10px 12px' }}>User Tablet Đang Chiếm Giữ</th>
                          <th style={{ padding: '10px 12px', width: '180px' }}>Cờ Khóa Hệ Thống</th>
                          <th style={{ padding: '10px 12px', width: '150px' }}>Giờ Mở Bàn</th>
                          <th style={{ padding: '10px 12px', width: '130px', textAlign: 'center' }}>Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLockedTables.map((it, idx) => {
                          const isSingleClearing = clearingSingleGuid === it.guid;
                          return (
                            <tr
                              key={it.guid + idx}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA'
                              }}
                            >
                              <td style={{ padding: '10px 12px', color: '#6B7280' }}>{idx + 1}</td>

                              {/* Tên Bàn */}
                              <td style={{ padding: '10px 12px' }}>
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 800,
                                    color: '#1E293B',
                                    backgroundColor: '#F1F5F9',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1'
                                  }}
                                >
                                  {it.table_name}
                                </span>
                              </td>

                              {/* Trạng Thái Đơn */}
                              <td style={{ padding: '10px 12px' }}>
                                {it.status === 2 ? (
                                  <Badge variant="warning">
                                    {it.status_desc}
                                  </Badge>
                                ) : it.status === 3 ? (
                                  <Badge variant="neutral">
                                    {it.status_desc}
                                  </Badge>
                                ) : (
                                  <Badge variant="primary">
                                    {it.status_desc}
                                  </Badge>
                                )}
                              </td>

                              {/* User Tablet Đang Giữ */}
                              <td style={{ padding: '10px 12px' }}>
                                {it.locked_by_user_name || it.locked_by_user_code ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: '#7C3AED',
                                        backgroundColor: '#F5F3FF',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #DDD6FE'
                                      }}
                                    >
                                      {it.locked_by_user_name || 'User'}
                                      {it.locked_by_user_code ? ` (${it.locked_by_user_code})` : ''}
                                    </span>
                                    <Badge variant="neutral">
                                      LOCK_ORDER
                                    </Badge>
                                    <button
                                      type="button"
                                      onClick={() => handleUnlockTabletUser(it.locked_by_user_code || undefined, it.locked_by_user_name || undefined)}
                                      disabled={unlockingUserCode === (it.locked_by_user_code || it.locked_by_user_name)}
                                      style={{
                                        border: '1px solid #C7D2FE',
                                        backgroundColor: '#EEF2FF',
                                        color: '#4F46E5',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Mở khóa tài khoản nhân viên này khỏi tablet"
                                    >
                                      <Unlock size={11} />
                                      <span>
                                        {unlockingUserCode === (it.locked_by_user_code || it.locked_by_user_name)
                                          ? 'Đang mở...'
                                          : 'Mở User'}
                                      </span>
                                    </button>
                                  </div>
                                ) : it.active_users.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                    {it.active_users.map((u, uIdx) => (
                                      <div
                                        key={uIdx}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          backgroundColor: '#EFF6FF',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #DBEAFE'
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#1E40AF'
                                          }}
                                        >
                                          {u}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleUnlockTabletUser(u, u)}
                                          disabled={unlockingUserCode === u}
                                          style={{
                                            border: 'none',
                                            background: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            color: '#DC2626',
                                            display: 'flex',
                                            alignItems: 'center'
                                          }}
                                          title={`Mở khóa tài khoản ${u}`}
                                        >
                                          <Unlock size={10} />
                                        </button>
                                      </div>
                                    ))}
                                    <Badge variant="neutral">
                                      lstTgsUser
                                    </Badge>
                                  </div>
                                ) : (
                                  <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Khóa cờ hệ thống</span>
                                )}
                              </td>


                              {/* Cờ Khóa Hệ Thống */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {it.lock_order && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 5px', borderRadius: '3px' }}>
                                      lockOrder: true
                                    </span>
                                  )}
                                  {it.locked && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#D97706', backgroundColor: '#FEF3C7', padding: '1px 5px', borderRadius: '3px' }}>
                                      locked: {it.locked}
                                    </span>
                                  )}
                                  {it.is_lock && (
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEE2E2', padding: '1px 5px', borderRadius: '3px' }}>
                                      isLock: true
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Giờ Mở */}
                              <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: '11px' }}>
                                {it.open_time_str || '—'}
                              </td>

                              {/* Thao Tác: Mở Khóa Riêng Bàn Này */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleClearSingleLock(it.guid, it.table_name)}
                                  disabled={isSingleClearing || clearingLocks}
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    borderRadius: '5px',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    cursor: isSingleClearing ? 'not-allowed' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSingleClearing) {
                                      e.currentTarget.style.backgroundColor = '#DC2626';
                                      e.currentTarget.style.color = '#fff';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isSingleClearing) {
                                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                                      e.currentTarget.style.color = '#DC2626';
                                    }
                                  }}
                                >
                                  {isSingleClearing ? (
                                    <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
                                  ) : (
                                    <Unlock size={11} />
                                  )}
                                  <span>Mở Khóa</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}
          </>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TÁC VỤ 7: XỬ LÝ FULL CPU 100% */}
          {/* ══════════════════════════════════════════════════════════ */}
          {selectedTaskId === 'fix_full_cpu' && (
            <FixCpuMongoTask
              restaurants={restaurants}
              user={user}
              showToast={showToast}
              selectedRestaurant={selectedRestaurant}
              defaultEmail={defaultEmail}
            />
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TÁC VỤ 8: CHUYỂN DATABASE MONGODB */}
          {/* ══════════════════════════════════════════════════════════ */}
          {selectedTaskId === 'transfer_database' && (
            <MongoDbTransferTask
              selectedRestaurant={selectedRestaurant}
              restaurants={restaurants}
              user={user}
              showToast={showToast}
            />
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TÁC VỤ 9: XỬ LÝ PARAM (BẢNG APP_PARAM) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {selectedTaskId === 'manage_app_params' && (
            <MongoDbParamManagementTask
              selectedRestaurant={selectedRestaurant}
              restaurants={restaurants}
              user={user}
              showToast={showToast}
              connectedHost={connectedHost}
              openCandidates={openCandidates}
              onSwitchMongoHost={handleSwitchMongoHost}
            />
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TÁC VỤ: CHECKLOGS MONGODB (ACTION_LOG & ORDER_ACTION_LOG) */}
          {/* ══════════════════════════════════════════════════════════ */}
          {selectedTaskId === 'check_action_logs' && (
            <>
              {/* Header Card: Tác Vụ Checklogs MongoDB */}
              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Action Log Badge & Restaurant Context Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <Badge variant="primary">ACTION_LOG &amp; GUID</Badge>

                    {/* Restaurant Context Badge */}
                    {selectedRestaurant ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge variant="primary">
                          {selectedRestaurant.sap ? `[${selectedRestaurant.sap}] ` : ''}{selectedRestaurant.res}
                        </Badge>
                        <Badge variant="neutral">
                          IP: {connectedHost || selectedRestaurant.ip || '—'}:27017
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="warning">
                        ⚠️ Chưa chọn Nhà Hàng cụ thể
                      </Badge>
                    )}
                  </div>

                  {/* Warning if no restaurant */}
                  {!selectedRestaurant && (
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        color: '#92400E',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0 }} />
                      <div>
                        <strong>Cần chọn Nhà Hàng cụ thể:</strong> Để đọc ACTION_LOG của nhà hàng, vui lòng bấm vào ô <strong>"-- Tất Cả Nhà Hàng --"</strong> ở góc trên bên phải để tìm và chọn nhà hàng bạn cần kiểm tra log.
                      </div>
                    </div>
                  )}

                  {/* Filter Toolbar: Date Picker + Table/GUID Search + Load Button */}
                  {selectedRestaurant && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        backgroundColor: '#F9FAFB',
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {/* Left: Filters */}
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        {/* Chọn ngày lọc để đỡ quá tải */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} color="#4F46E5" />
                            <span>Chọn ngày lọc (Tránh quá tải):</span>
                          </label>
                          <input
                            type="date"
                            value={actionLogDate}
                            onChange={(e) => setActionLogDate(e.target.value)}
                            style={{
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 600,
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: '#fff',
                              outline: 'none',
                              color: '#111827'
                            }}
                          />
                        </div>

                        {/* Search by Table or GUID */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '260px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 700, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Search size={12} color="#4F46E5" />
                            <span>Tìm theo Bàn hoặc GUID:</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={actionLogSearch}
                              onChange={(e) => setActionLogSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') fetchActionLogSessions();
                              }}
                              placeholder="Nhập tên bàn (VD: A3, VIP1) hoặc GUID..."
                              style={{
                                width: '100%',
                                padding: '6px 10px 6px 30px',
                                fontSize: '12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: '#fff',
                                outline: 'none'
                              }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                            {actionLogSearch && (
                              <X
                                size={14}
                                onClick={() => {
                                  setActionLogSearch('');
                                }}
                                style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', cursor: 'pointer' }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Submit Button */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '18px' }}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => fetchActionLogSessions()}
                            disabled={loadingActionLogs}
                            leftIcon={<RefreshCw size={14} style={{ animation: loadingActionLogs ? 'spin 1s linear infinite' : 'none' }} />}
                          >
                            {loadingActionLogs ? 'Đang tải logs...' : 'Tải Nhật Ký Phiên'}
                          </Button>
                        </div>
                      </div>

                      {/* Right: Quick stats badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontSize: '11px', color: '#6B7280' }}>Tổng số phiên:</span>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: '#4F46E5' }}>
                            {actionLogTotalSessions || actionLogSessions.length} phiên (GUID)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Table of Action Log Sessions (Master 1 GUID làm gốc) */}
              {selectedRestaurant && (
                <Card>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TableProperties size={16} color="#4F46E5" />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Danh Sách Phiên Nhật Ký Theo Bàn (1 Dòng = 1 GUID Gốc)
                        </span>
                        <Badge variant={displayActionLogSessions.length > 0 ? 'primary' : 'neutral'}>
                          {displayActionLogSessions.length} / {actionLogTotalSessions || actionLogSessions.length} phiên
                        </Badge>
                      </div>

                      {/* GAME filter toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#4B5563',
                            cursor: 'pointer',
                            backgroundColor: '#F3F4F6',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid #E5E7EB',
                            userSelect: 'none'
                          }}
                          title="Ẩn các phiên chỉ có ping từ mini-game / QR tra cứu không có đơn hàng để tập trung vào nghiệp vụ bàn thực tế"
                        >
                          <input
                            type="checkbox"
                            checked={hideGameOnlySessions}
                            onChange={(e) => setHideGameOnlySessions(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>Ẩn log GAME / ping QR không có đơn</span>
                          {hideGameOnlySessions && actionLogSessions.length > displayActionLogSessions.length && (
                            <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 400 }}>
                              (Đã lọc {actionLogSessions.length - displayActionLogSessions.length} phiên rác)
                            </span>
                          )}
                        </label>

                        <span style={{ fontSize: '12px', color: '#6B7280' }}>
                          Nhấn <strong>"Chi Tiết"</strong> để đọc toàn bộ logs.
                        </span>
                      </div>
                    </div>

                    {loadingActionLogs ? (
                      <div style={{ padding: '50px', textAlign: 'center', color: '#6B7280' }}>
                        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px', color: '#4F46E5' }} />
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Đang truy vấn ACTION_LOG từ MongoDB...</p>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>Sử dụng index theo ngày {actionLogDate} để tối ưu tốc độ và không gây lag DB</p>
                      </div>
                    ) : displayActionLogSessions.length === 0 ? (
                      <div
                        style={{
                          padding: '40px 20px',
                          textAlign: 'center',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          color: '#4B5563'
                        }}
                      >
                        <FileText size={36} color="#9CA3AF" style={{ marginBottom: '10px' }} />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Không Có Dữ Liệu Nhật Ký Phù Hợp</h3>
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6B7280' }}>
                          Không tìm thấy phiên nào khớp với ngày {actionLogDate} {actionLogSearch ? `và từ khóa "${actionLogSearch}"` : ''}.
                          {hideGameOnlySessions && actionLogSessions.length > 0 && (
                            <span> (Có {actionLogSessions.length} phiên GAME rác đã bị ẩn, bỏ tick checkbox để xem).</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F3F4F6', color: '#374151', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '10px 10px', width: '40px', textAlign: 'center' }}>STT</th>
                              <th style={{ padding: '10px 10px', width: '90px' }}>Tên Bàn</th>
                              <th style={{ padding: '10px 10px', width: '100px' }}>Trạng Thái</th>
                              <th style={{ padding: '10px 10px', width: '110px', textAlign: 'right' }}>Số Tiền</th>
                              <th style={{ padding: '10px 10px', width: '140px' }}>Khách Hàng</th>
                              <th style={{ padding: '10px 10px', width: '150px' }}>Thanh Toán</th>
                              <th style={{ padding: '10px 10px', width: '80px', textAlign: 'center' }}>Xuất VAT?</th>
                              <th style={{ padding: '10px 10px', width: '80px', textAlign: 'center' }}>Voucher</th>
                              <th style={{ padding: '10px 10px', width: '110px' }}>Nhân Viên</th>
                              <th style={{ padding: '10px 10px', width: '100px' }}>Log & Apps</th>
                              <th style={{ padding: '10px 10px', width: '90px' }}>Giờ Gần Nhất</th>
                              <th style={{ padding: '10px 10px', width: '150px' }}>Mã GUID</th>
                              <th style={{ padding: '10px 10px', width: '90px', textAlign: 'center' }}>Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {displayActionLogSessions.map((s, idx) => {
                              return (
                                <tr
                                  key={s.guid + idx}
                                  className="interactive-table-row"
                                  style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA'
                                  }}
                                >
                                  {/* STT */}
                                  <td style={{ padding: '8px 10px', color: '#6B7280', textAlign: 'center' }}>{idx + 1}</td>

                                  {/* Tên Bàn */}
                                  <td style={{ padding: '8px 10px' }}>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        color: '#1E293B',
                                        backgroundColor: '#F1F5F9',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        border: '1px solid #CBD5E1',
                                        display: 'inline-block'
                                      }}
                                    >
                                      {s.table_name || '(Không có đơn)'}
                                    </span>
                                  </td>

                                  {/* Trạng Thái Đơn */}
                                  <td style={{ padding: '8px 10px' }}>
                                    {s.status === 1 ? (
                                      <Badge variant="primary">{s.status_desc || 'Đang mở'}</Badge>
                                    ) : s.status === 2 ? (
                                      <Badge variant="warning">{s.status_desc || 'Tạm tính'}</Badge>
                                    ) : s.status === 3 ? (
                                      <Badge variant="neutral">{s.status_desc || 'Đã đóng'}</Badge>
                                    ) : s.status === 4 ? (
                                      <Badge variant="danger">{s.status_desc || 'Đã hủy'}</Badge>
                                    ) : (
                                      <Badge variant="neutral">{s.status_desc || 'N/A'}</Badge>
                                    )}
                                  </td>

                                  {/* Tổng Tiền */}
                                  <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: s.total_amount && s.total_amount > 0 ? '#059669' : '#6B7280' }}>
                                    {s.total_amount ? `${Number(s.total_amount).toLocaleString()} đ` : '0 đ'}
                                  </td>

                                  {/* Khách Hàng */}
                                  <td style={{ padding: '8px 10px' }}>
                                    {s.customer_name ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <User size={12} color="#0284C7" />
                                        <span style={{ fontWeight: 600, color: '#0369A1', fontSize: '11px' }}>
                                          {s.customer_name}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#9CA3AF' }}>—</span>
                                    )}
                                  </td>

                                  {/* Thanh Toán (Hình thức + Giờ) */}
                                  <td style={{ padding: '8px 10px' }}>
                                    {s.payment_method ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                        <span style={{ fontWeight: 700, color: '#166534', fontSize: '11px' }}>
                                          {s.payment_method}
                                        </span>
                                        {s.paid_time_str && (
                                          <span style={{ fontSize: '10px', color: '#6B7280' }}>
                                            {s.paid_time_str.split(' ')[1]}
                                          </span>
                                        )}
                                      </div>
                                    ) : s.status === 3 ? (
                                      <span style={{ fontSize: '11px', color: '#6B7280' }}>Đã đóng</span>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600 }}>Chưa TT</span>
                                    )}
                                  </td>

                                  {/* Xuất VAT? */}
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    {s.take_tax ? (
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: '#ECFDF5',
                                          color: '#065F46',
                                          border: '1px solid #A7F3D0'
                                        }}
                                      >
                                        Có VAT
                                      </span>
                                    ) : (
                                      <span style={{ color: '#9CA3AF', fontSize: '11px' }}>Không</span>
                                    )}
                                  </td>

                                  {/* Voucher */}
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    {s.has_voucher ? (
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: '#FAF5FF',
                                          color: '#7E22CE',
                                          border: '1px solid #E9D5FF'
                                        }}
                                      >
                                        {s.voucher_count && s.voucher_count > 1 ? `${s.voucher_count} mã` : 'Có'}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#9CA3AF', fontSize: '11px' }}>—</span>
                                    )}
                                  </td>

                                  {/* Nhân Viên */}
                                  <td style={{ padding: '8px 10px', color: '#374151' }}>
                                    {s.waiter_name ? (
                                      <span style={{ fontWeight: 600, fontSize: '11px' }}>{s.waiter_name}</span>
                                    ) : (
                                      <span style={{ color: '#9CA3AF' }}>—</span>
                                    )}
                                  </td>

                                  {/* Số Log & Apps */}
                                  <td style={{ padding: '8px 10px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                      <span
                                        style={{
                                          fontSize: '10px',
                                          fontWeight: 700,
                                          padding: '1px 5px',
                                          borderRadius: '8px',
                                          backgroundColor: '#EEF2FF',
                                          color: '#4F46E5',
                                          width: 'fit-content'
                                        }}
                                      >
                                        {s.action_count} logs
                                      </span>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                                        {(s.apps || []).map((ap) => (
                                          <span
                                            key={ap}
                                            style={{
                                              fontSize: '9px',
                                              fontWeight: 600,
                                              padding: '1px 4px',
                                              borderRadius: '3px',
                                              backgroundColor: '#F3F4F6',
                                              color: '#4B5563'
                                            }}
                                          >
                                            {ap}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Giờ gần nhất */}
                                  <td style={{ padding: '8px 10px', color: '#4B5563', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <Clock size={11} color="#9CA3AF" />
                                      <span>{s.last_time_str ? s.last_time_str.split(' ')[1] : '—'}</span>
                                    </div>
                                  </td>

                                  {/* GUID */}
                                  <td style={{ padding: '8px 10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <code
                                        style={{
                                          fontSize: '10px',
                                          fontFamily: 'Consolas, monospace',
                                          color: '#4B5563',
                                          backgroundColor: '#F3F4F6',
                                          padding: '2px 4px',
                                          borderRadius: '3px'
                                        }}
                                        title={s.guid}
                                      >
                                        {s.guid.length > 14 ? s.guid.slice(0, 12) + '...' : s.guid}
                                      </code>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(s.guid);
                                          showToast('Đã copy GUID: ' + s.guid, 'info');
                                        }}
                                        style={{
                                          border: 'none',
                                          background: 'none',
                                          cursor: 'pointer',
                                          color: '#9CA3AF',
                                          padding: '2px'
                                        }}
                                        title="Copy toàn bộ GUID"
                                      >
                                        <Copy size={11} />
                                      </button>
                                    </div>
                                  </td>

                                  {/* Thao Tác: Xem Chi Tiết */}
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      className="table-action-btn"
                                      onClick={() => handleOpenSessionDetail(s.guid)}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        padding: '3px 7px'
                                      }}
                                    >
                                      <Eye size={12} />
                                      <span>Chi Tiết</span>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TÁC VỤ 3: MỞ KHÓA USER TABLET (EMPLOYEE & LOCK_ORDER) */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedTaskId === 'unlock_tablet_users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Warning if no restaurant */}
          {!selectedRestaurant && (
            <Card>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  color: '#92400E',
                  fontSize: '12px',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                <div>
                  <strong>Cần chọn Nhà Hàng cụ thể:</strong> Vui lòng bấm vào ô <strong>"-- Tất Cả Nhà Hàng --"</strong> ở góc trên bên phải để tìm và chọn nhà hàng bạn cần mở khóa tài khoản nhân viên.
                </div>
              </div>
            </Card>
          )}

          {/* Results section */}
          {selectedRestaurant && (
            <>
              {/* Table of Employees */}
              <Card>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <TableProperties size={16} color="#4F46E5" />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                        Danh Sách Tài Khoản Nhân Viên Tablet
                      </span>
                      {selectedRestaurant && (
                        <Badge variant="primary">
                          {selectedRestaurant.sap ? `[${selectedRestaurant.sap}] ` : ''}{selectedRestaurant.res}
                        </Badge>
                      )}
                      <Badge variant="neutral">
                        IP: {connectedHost || selectedRestaurant?.ip || '—'}:27017
                      </Badge>
                      {tabletUsersData && (
                        <>
                          <Badge variant="neutral">
                            {tabletUsersData.users.length} hiển thị / {tabletUsersData.total_employees.toLocaleString()} tổng nhân viên
                          </Badge>
                          {tabletUsersData.total_logged_in > 0 && (
                            <Badge variant="danger">
                              ⚠️ {tabletUsersData.total_logged_in} tài khoản có cờ đăng nhập
                            </Badge>
                          )}
                          {tabletUsersData.total_in_lock_order > 0 && (
                            <Badge variant="warning">
                              🔒 {tabletUsersData.total_in_lock_order} phiên LOCK_ORDER
                            </Badge>
                          )}
                        </>
                      )}
                    </div>

                    {/* Nút Mở Khóa Toàn Bộ & Nút Làm Mới */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchTabletUsers()}
                        disabled={loadingTabletUsers}
                        leftIcon={<RefreshCw size={13} className={loadingTabletUsers ? 'animate-spin' : ''} />}
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        title="Tải lại danh sách nhân viên từ MongoDB"
                      >
                        Làm mới
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnlockTabletUser(undefined, undefined, true)}
                        disabled={loadingTabletUsers || unlockingAllUsers || !tabletUsersData || tabletUsersData.total_logged_in === 0}
                        leftIcon={<Unlock size={14} />}
                        style={{
                          color: '#DC2626',
                          borderColor: '#FCA5A5',
                          backgroundColor: '#FEF2F2',
                          fontWeight: 700,
                          padding: '6px 14px',
                          fontSize: '12.5px',
                          boxShadow: '0 1px 2px rgba(220,38,38,0.1)'
                        }}
                        title="Reset toàn bộ tài khoản nhân viên đang giữ cờ đăng nhập về False"
                      >
                        {unlockingAllUsers ? 'Đang mở toàn bộ...' : `🔓 Mở Khóa Toàn Bộ (${tabletUsersData?.total_logged_in || 0})`}
                      </Button>
                    </div>
                  </div>

                  {loadingTabletUsers ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                      <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '8px', color: '#4F46E5' }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>Đang quét danh sách nhân viên từ MongoDB ({connectedHost}:27017)...</p>
                    </div>
                  ) : !tabletUsersData || tabletUsersData.users.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                      <CheckCircle2 size={32} color="#10B981" style={{ marginBottom: '8px' }} />
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                        Hiện không có tài khoản nhân viên nào bị kẹt trạng thái đăng nhập (isLogin = true)
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                            <th style={{ padding: '10px 12px', width: '40px' }}>#</th>
                            <th style={{ padding: '10px 12px', width: '120px' }}>Mã Nhân Viên</th>
                            <th style={{ padding: '10px 12px' }}>Họ Và Tên</th>
                            <th style={{ padding: '10px 12px', width: '220px' }}>Trạng Thái isLogin</th>
                            <th style={{ padding: '10px 12px', width: '220px' }}>Khóa Tablet (LOCK_ORDER)</th>
                            <th style={{ padding: '10px 12px', width: '160px', textAlign: 'center' }}>Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tabletUsersData.users.map((emp: TabletUserItem, idx: number) => {
                            const isUnlockingThis = unlockingUserCode === emp.code;
                            const hasTableLock = Boolean(emp.locked_tables && emp.locked_tables.length > 0);
                            return (
                              <tr
                                key={emp.code || idx}
                                style={{
                                  borderBottom: '1px solid var(--border-color)',
                                  backgroundColor: emp.is_login ? '#FDF4FF' : idx % 2 === 0 ? '#fff' : '#FAFAFA'
                                }}
                              >
                                <td style={{ padding: '10px 12px', color: '#94A3B8' }}>{idx + 1}</td>
                                
                                {/* Mã NV */}
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#1E293B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                                    {emp.code}
                                  </span>
                                </td>

                                {/* Họ tên */}
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0F172A' }}>
                                  {emp.name || <span style={{ color: '#94A3B8' }}>—</span>}
                                </td>

                                {/* Trạng thái isLogin */}
                                <td style={{ padding: '10px 12px' }}>
                                  {emp.is_login ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#FEE2E2',
                                        color: '#B91C1C',
                                        border: '1px solid #FCA5A5'
                                      }}
                                    >
                                      <Lock size={11} />
                                      <span>Đang đăng nhập (isLogin = true)</span>
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: '#F3F4F6',
                                        color: '#4B5563'
                                      }}
                                    >
                                      <span>Đã thoát (false)</span>
                                    </span>
                                  )}
                                </td>

                                {/* Khóa Tablet LOCK_ORDER */}
                                <td style={{ padding: '10px 12px' }}>
                                  {hasTableLock ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          color: '#7C3AED',
                                          backgroundColor: '#F5F3FF',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid #DDD6FE',
                                          width: 'fit-content'
                                        }}
                                      >
                                        Đang giữ bàn: {emp.locked_tables.join(', ')}
                                      </span>
                                      {emp.lock_order_guids && emp.lock_order_guids.length > 0 && (
                                        <code style={{ fontSize: '10px', color: '#6B7280' }}>
                                          {emp.lock_order_guids.join(', ')}
                                        </code>
                                      )}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#9CA3AF', fontSize: '11px' }}>Không giữ bàn nào</span>
                                  )}
                                </td>

                                {/* Thao tác mở khóa */}
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleUnlockTabletUser(emp.code, emp.name)}
                                    disabled={isUnlockingThis || (!emp.is_login && !hasTableLock)}
                                    leftIcon={<Unlock size={12} />}
                                    style={{
                                      fontSize: '11px',
                                      padding: '4px 8px',
                                      backgroundColor: emp.is_login ? '#4F46E5' : '#E0E7FF',
                                      color: emp.is_login ? '#fff' : '#4338CA',
                                      border: 'none',
                                      opacity: (!emp.is_login && !hasTableLock) ? 0.5 : 1
                                    }}
                                    title="Mở khóa tài khoản: Reset isLogin về false và xóa khỏi LOCK_ORDER"
                                  >
                                    {isUnlockingThis ? 'Đang mở...' : 'Mở Khóa User'}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TÁC VỤ 3: XỬ LÝ SO/CO */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedTaskId === 'manage_menu_so_co' && (
        <ManageMenuSoCoTask
          selectedRestaurant={selectedRestaurant}
          restaurants={restaurants}
          user={user}
          showToast={showToast}
          connectedHost={connectedHost}
          openCandidates={openCandidates}
          onSwitchMongoHost={handleSwitchMongoHost}
          menuSyncTrigger={menuSyncTrigger}
        />
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TÁC VỤ 4: CHECK / XỬ LÝ KDS */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedTaskId === 'check_kds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Banner (Thu gọn, nhỏ gọn vừa vặn) */}
          <Card>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowKdsGuide(!showKdsGuide)}
                    title="Xem giải thích chi tiết về Role 2 vs Role 3, Food Control, placeParent, hallPlanIds và cơ chế Done món"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: showKdsGuide ? '#DBEAFE' : '#EFF6FF',
                      color: '#1D4ED8',
                      border: '1px solid #93C5FD',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Info size={13} color="#2563EB" />
                    {showKdsGuide ? 'Ẩn giải thích KDS ▲' : 'ℹ️ Giải thích & Lưu ý KDS ▼'}
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    style={{ backgroundColor: '#059669', color: '#fff' }}
                    onClick={() => setShowAddQuayModal(true)}
                    leftIcon={<PlusCircle size={14} />}
                  >
                    + Thêm Quầy &amp; Account
                  </Button>

                  {/* Nút Chức năng Logs KDS (Order từ CO/SO & Bấm Done) */}
                  <Button
                    size="sm"
                    style={{
                      backgroundColor: '#4338CA',
                      color: '#fff',
                      borderColor: '#3730A3',
                      fontWeight: 700,
                      boxShadow: '0 1px 2px rgba(67, 56, 202, 0.2)'
                    }}
                    onClick={() => setShowKdsLogsModal(true)}
                    leftIcon={<Clock size={14} />}
                    title="Tra cứu lịch sử Order từ CO/SO vào KDS, thời gian bấm Done món và phân tích trễ món phục vụ khiếu nại nhà hàng"
                  >
                    📋 Logs KDS (Order &amp; Ra Món)
                  </Button>

                  {/* Nút Chuyển Món Giữa Các Quầy (Transfer) */}
                  <Button
                    size="sm"
                    variant="outline"
                    style={{
                      borderColor: '#3B82F6',
                      color: '#1D4ED8',
                      backgroundColor: '#EFF6FF',
                      fontWeight: 700
                    }}
                    onClick={() => {
                      setTransferFromPlaceId(null);
                      setShowTransferQuayModal(true);
                    }}
                    leftIcon={<ArrowRightLeft size={14} />}
                    title="Chuyển toàn bộ hoặc một số món chọn lọc từ Quầy Bếp này sang Quầy Bếp khác"
                  >
                    🔄 Chuyển Món Giữa Quầy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchKdsPlaces();
                      setShowQuayListModal(true);
                    }}
                    isLoading={loadingKdsPlaces}
                    leftIcon={<Printer size={14} color="#D97706" />}
                  >
                    Cấu Hình Quầy &amp; Máy In ({kdsPlaces.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKdsRoleModal(true)}
                    style={{ borderColor: '#BAE6FD', color: '#0284C7', backgroundColor: '#F0F9FF' }}
                    leftIcon={<ShieldCheck size={14} color="#0284C7" />}
                  >
                    Phân Quyền User KDS
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchRoleParamCode('ROLE_SETUP_CONFIG_COOKING');
                      setShowBatchRoleModal(true);
                    }}
                    style={{ borderColor: '#BAE6FD', color: '#0369A1', backgroundColor: '#E0F2FE', fontWeight: 700 }}
                    leftIcon={<Zap size={14} color="#0284C7" />}
                  >
                    ⚡ Phân Quyền Hàng Loạt (Nhiều NH)
                  </Button>

                  {/* Nút Bật / Tắt Hoàn Toàn KDS (SHOW_KDS) */}
                  <button
                    type="button"
                    disabled={togglingKdsMaster}
                    onClick={handleToggleKdsMaster}
                    title={
                      kdsMasterStatus && !kdsMasterStatus.is_enabled
                        ? 'KDS đang bị TẮT hoàn toàn (SHOW_KDS = 0). Bấm để Bật lại'
                        : 'KDS đang BẬT (SHOW_KDS = 1). Bấm để Tắt hoàn toàn'
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 13px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: kdsMasterStatus && !kdsMasterStatus.is_enabled ? '#FEF2F2' : '#F0FDF4',
                      color: kdsMasterStatus && !kdsMasterStatus.is_enabled ? '#DC2626' : '#15803D',
                      border: `1.5px solid ${kdsMasterStatus && !kdsMasterStatus.is_enabled ? '#FCA5A5' : '#86EFAC'}`,
                      cursor: togglingKdsMaster ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (kdsMasterStatus && !kdsMasterStatus.is_enabled) {
                        e.currentTarget.style.backgroundColor = '#DC2626';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#B91C1C';
                      } else {
                        e.currentTarget.style.backgroundColor = '#16A34A';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#15803D';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (kdsMasterStatus && !kdsMasterStatus.is_enabled) {
                        e.currentTarget.style.backgroundColor = '#FEF2F2';
                        e.currentTarget.style.color = '#DC2626';
                        e.currentTarget.style.borderColor = '#FCA5A5';
                      } else {
                        e.currentTarget.style.backgroundColor = '#F0FDF4';
                        e.currentTarget.style.color = '#15803D';
                        e.currentTarget.style.borderColor = '#86EFAC';
                      }
                    }}
                  >
                    {togglingKdsMaster ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Power size={13} />
                    )}
                    <span>
                      {kdsMasterStatus && !kdsMasterStatus.is_enabled
                        ? 'KDS: ĐANG TẮT (SHOW_KDS: 0)'
                        : 'KDS: ĐANG BẬT (SHOW_KDS: 1)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Hướng Dẫn & Giải Thích Chi Tiết Về KDS & Food Control */}
              {showKdsGuide && (
                <div
                  style={{
                    margin: '12px 0 16px 0',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    fontSize: '12.5px',
                    lineHeight: '1.6',
                    color: '#334155'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #E2E8F0', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#1E293B', fontSize: '13.5px' }}>
                      <span style={{ fontSize: '16px' }}>📖</span>
                      <span>SỔ TAY CƠ CHẾ HOẠT ĐỘNG &amp; THÔNG SỐ KDS GOLDEN GATE</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKdsGuide(false)}
                      style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Đóng [×]
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                    {/* Mục 1: Phân biệt Role */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 700, color: '#D97706', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>👑</span> 1. Ý nghĩa Role trong bảng ACCOUNT
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px' }}>
                        <li>
                          <strong style={{ color: '#D97706' }}>Role 2 (Food Control / Bếp Trưởng):</strong> Trạm điều phối tổng, có quyền xem tiến độ toàn bộ các quầy con nằm trong danh sách <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>listPlace</code>, gọi ra món, trả món và xác nhận hoàn thành (Done).
                        </li>
                        <li style={{ marginTop: '4px' }}>
                          <strong style={{ color: '#2563EB' }}>Role 3 (Sub-Station / Quầy Con):</strong> Các quầy chế biến thực tế (Bếp Nóng, Bếp Lạnh, Bar, Salad, Kho, Nướng...). Chỉ hiển thị các món thuộc quầy mình phụ trách.
                        </li>
                        <li style={{ marginTop: '4px', color: '#64748B' }}>
                          <em>Role 0 &amp; 1:</em> <strong>Role 0</strong> là Admin quản trị hệ thống; <strong>Role 1</strong> là trạm Runner / Waiter Expediter (màn hình điều phối phục vụ ra bàn sảnh).
                        </li>
                      </ul>
                    </div>

                    {/* Mục 2: placeParent & hallPlanIds */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 700, color: '#2563EB', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🔗</span> 2. placeParent = "101" &amp; hallPlanIds
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px' }}>
                        <li>
                          <strong>placeParent = "101":</strong> Mã <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>101</code> chính là <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>accId</code> của trạm <strong>Food Control</strong>. Việc quầy con mang <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>placeParent: "101"</code> giúp trạm con kết nối và chịu sự đồng bộ tiến độ từ Food Control.
                        </li>
                        <li style={{ marginTop: '4px' }}>
                          <strong>hallPlanIds (Sơ đồ khu vực/tầng):</strong> Danh sách mã các tầng/sảnh mà trạm nhận order (ví dụ: Tầng 1, Tầng 2, Ngoài trời...). Trạm Food Control thường quản lý tất cả các tầng (ví dụ 4 mã), trong khi một số quầy phụ có thể chỉ nhận 2 tầng. <em>Hệ thống khi tạo quầy mới tự động kế thừa đầy đủ sảnh từ Food Control để tránh sót order.</em>
                        </li>
                      </ul>
                    </div>

                    {/* Mục 3: Cơ chế Done món */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 700, color: '#059669', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span> 3. Cơ chế Done món Food Control &amp; Quầy Phụ
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px' }}>
                        <li>
                          Khi bấm <strong>Done (Hoàn Thành)</strong> trên màn hình Food Control: KDS sẽ cập nhật bản ghi món trong <code style={{ backgroundColor: '#F1F5F9', padding: '1px 4px', borderRadius: '3px' }}>DISH_KDS</code> sang trạng thái hoàn thành.
                        </li>
                        <li style={{ marginTop: '4px' }}>
                          Do các quầy phụ đọc cùng danh sách món đang chờ chế biến, <strong>món trên màn hình KDS phụ cũng sẽ lập tức biến mất / Done theo</strong>.
                        </li>
                        <li style={{ marginTop: '4px' }}>
                          Nếu bạn dùng tính năng <strong>"Bỏ khỏi FC"</strong> trong danh sách quầy, Food Control sẽ không quản lý quầy đó nữa, và quầy phụ sẽ vận hành độc lập, tự bấm Done tại quầy mà không phụ thuộc Food Control.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {!connectedHost && !selectedRestaurant && (
                <div
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FCD34D',
                    color: '#92400E',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Cần chọn Nhà Hàng cụ thể:</strong> Tác vụ tác động trực tiếp vào cơ sở dữ liệu nhà hàng. Vui lòng bấm vào ô <em>"-- Tất Cả Nhà Hàng --"</em> ở góc trên bên phải để tìm và chọn nhà hàng bạn cần xử lý.
                  </span>
                </div>
              )}
            </div>
          </Card>

          {(connectedHost || selectedRestaurant) && (
            <>
              {/* Quầy Bếp (ACCOUNT - G_KITCHEN) Quick Filters */}
              {kdsData?.accounts_summary && kdsData.accounts_summary.length > 0 && (
                <Card style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={15} color="#059669" />
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
                        backgroundColor: kdsQuayFilter === 'ALL' ? '#059669' : 'var(--bg-secondary)',
                        color: kdsQuayFilter === 'ALL' ? '#fff' : 'var(--text-primary)',
                        border: kdsQuayFilter === 'ALL' ? '1px solid #059669' : '1px solid var(--border-color)',
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
                            backgroundColor: isSelected ? '#059669' : 'var(--bg-secondary)',
                            color: isSelected ? '#fff' : 'var(--text-primary)',
                            border: isSelected ? '1px solid #059669' : '1px solid var(--border-color)',
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
                                backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-primary)',
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
                              opacity: 0.85,
                              fontFamily: 'monospace',
                              letterSpacing: '0.02em',
                            }}>
                              {acc.account_id} / pass: {acc.acc_pass || '(trống)'}
                            </span>
                          )}
                        </button>
                      );
                    })}

                    {kdsQuayFilter !== 'ALL' && (
                      <button
                        type="button"
                        onClick={() => {
                          const selectedAcc = kdsData.accounts_summary.find((a) => a.account_name === kdsQuayFilter);
                          setTransferFromPlaceId(selectedAcc ? Number(selectedAcc.account_id) : null);
                          setShowTransferQuayModal(true);
                        }}
                        style={{
                          marginLeft: 'auto',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          backgroundColor: '#2563EB',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Bấm để chuyển toàn bộ hoặc lọc món từ quầy ${kdsQuayFilter} sang quầy khác`}
                      >
                        <ArrowRightLeft size={13} />
                        <span>Chuyển Món Của Quầy [{kdsQuayFilter}] ➔</span>
                      </button>
                    )}
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
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #A7F3D0'
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Danh Sách Món Bếp KDS &amp; Đối Chiếu Giá
                    </h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Hiển thị <strong>{filteredKdsItems.length}</strong> / {kdsData?.total ?? 0} món
                    </span>
                  </div>

                  {selectedKdsDishCodes.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                        Đã chọn <strong>{selectedKdsDishCodes.length}</strong> món
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        style={{ backgroundColor: '#059669', color: '#fff' }}
                        onClick={() => {
                          const selectedDishes = (kdsData?.items || []).filter((d) => selectedKdsDishCodes.includes(d.menu_item_code));
                          handleOpenAssignQuay(selectedDishes);
                        }}
                        leftIcon={<Layers size={13} />}
                      >
                        Gán Quầy Hàng Loạt
                      </Button>
                      <Button
                        size="sm"
                        style={{ backgroundColor: '#2563EB', color: '#fff', fontWeight: 600 }}
                        onClick={() => {
                          setTransferFromPlaceId(null);
                          setShowTransferQuayModal(true);
                        }}
                        leftIcon={<ArrowRightLeft size={13} />}
                        title="Chuyển các món được chọn từ quầy hiện tại sang quầy bếp khác"
                      >
                        🔄 Chuyển Quầy ({selectedKdsDishCodes.length} món)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedKdsDishCodes([])}
                      >
                        Bỏ chọn
                      </Button>
                    </div>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 10px', width: '38px', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredKdsItems.length > 0 && selectedKdsDishCodes.length === filteredKdsItems.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedKdsDishCodes(filteredKdsItems.map((d) => d.menu_item_code));
                              } else {
                                setSelectedKdsDishCodes([]);
                              }
                            }}
                          />
                        </th>
                        <th style={{ padding: '10px 8px', width: '45px', textAlign: 'center' }}>STT</th>
                        <th style={{ padding: '10px 12px', width: '110px' }}>Mã Món</th>
                        <th style={{ padding: '10px 12px', width: '110px' }}>Mã SAP</th>
                        <th style={{ padding: '10px 12px', minWidth: '200px' }}>Tên Món Ăn</th>
                        <th style={{ padding: '10px 12px', width: '110px' }}>Nhóm Bếp</th>
                        <th style={{ padding: '10px 12px', minWidth: '150px' }}>Quầy Bếp (ACCOUNT)</th>
                        <th style={{ padding: '10px 12px', minWidth: '130px' }}>Máy In</th>
                        <th style={{ padding: '10px 12px', width: '130px', textAlign: 'center' }}>TG Chế Biến KDS</th>
                        <th style={{ padding: '10px 12px', width: '120px', textAlign: 'right' }}>Giá Bán</th>
                        <th style={{ padding: '10px 12px', minWidth: '220px' }}>Đối Chiếu Giá Giữa Các Bảng</th>
                        <th style={{ padding: '10px 10px', width: '160px', textAlign: 'center' }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingKds ? (
                        <tr>
                          <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', color: '#059669' }} />
                            <div>Đang tải dữ liệu KDS &amp; đối chiếu giá từ MongoDB {connectedHost}:27017...</div>
                          </td>
                        </tr>
                      ) : filteredKdsItems.length === 0 ? (
                        <tr>
                          <td colSpan={12} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                              Không tìm thấy món KDS nào trong bảng <code>CONFIG_COOKING</code> trên máy chủ <strong>{connectedHost}:27017</strong>.
                            </div>
                            {openCandidates.length > 1 && (
                              <div
                                style={{
                                  marginTop: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '10px 16px',
                                  borderRadius: '8px',
                                  backgroundColor: '#FEF3C7',
                                  border: '1.5px solid #F59E0B',
                                  color: '#92400E',
                                  flexWrap: 'wrap',
                                  justifyContent: 'center'
                                }}
                              >
                                <span style={{ fontWeight: 600 }}>💡 Nhà hàng này có máy chủ MongoDB khác. Bạn có muốn chuyển sang máy chủ KDS / Bếp?</span>
                                {openCandidates
                                  .filter((c) => c.ip !== connectedHost)
                                  .map((other) => (
                                    <Button
                                      key={other.ip}
                                      size="sm"
                                      style={{ backgroundColor: '#059669', color: '#fff' }}
                                      onClick={() => handleSwitchMongoHost(other.ip)}
                                      leftIcon={<Server size={13} />}
                                    >
                                      Chuyển sang {other.ip} ({other.role_hint || getIpRoleLabel(other)})
                                    </Button>
                                  ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredKdsItems.map((item, idx) => {
                          const isDiff = item.price_status === 'DIFF';
                          const hasTime = item.single_cooking_time > 0;
                          const isChecked = selectedKdsDishCodes.includes(item.menu_item_code);
                          return (
                            <tr
                              key={item.menu_item_code + '_' + idx}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: isChecked ? '#F0FDF4' : isDiff ? '#FFFDF5' : 'transparent',
                                transition: 'background-color 0.15s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isChecked ? '#DCFCE7' : isDiff ? '#FFFBEB' : '#F9FAFB')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isChecked ? '#F0FDF4' : isDiff ? '#FFFDF5' : 'transparent')}
                            >
                              {/* Checkbox */}
                              <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedKdsDishCodes((prev) => [...prev, item.menu_item_code]);
                                    } else {
                                      setSelectedKdsDishCodes((prev) => prev.filter((c) => c !== item.menu_item_code));
                                    }
                                  }}
                                />
                              </td>

                              {/* STT */}
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                                {idx + 1}
                              </td>

                              {/* Mã Món */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>
                                    {item.menu_item_code}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.menu_item_code);
                                      setCopiedDishCode(item.menu_item_code);
                                      showToast(`Đã chép mã món: ${item.menu_item_code}`, 'success');
                                      setTimeout(() => setCopiedDishCode(null), 1500);
                                    }}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: copiedDishCode === item.menu_item_code ? '#10B981' : 'var(--text-muted)',
                                      padding: '2px',
                                    }}
                                    title="Sao chép Mã món"
                                  >
                                    {copiedDishCode === item.menu_item_code ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                                  </button>
                                </div>
                              </td>

                              {/* Mã SAP */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.sap_code ? (
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
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                                )}
                              </td>

                              {/* Tên Món Ăn */}
                              <td style={{ padding: '10px 12px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {item.menu_item_name}
                                </div>
                                {item.note && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {item.note}
                                  </div>
                                )}
                              </td>

                              {/* Nhóm Bếp */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.group_type_kds ? (
                                  <span
                                    style={{
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      backgroundColor: '#F1F5F9',
                                      color: '#475569',
                                    }}
                                  >
                                    {item.group_type_kds}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                                )}
                              </td>

                              {/* Quầy Bếp (ACCOUNT) */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.quays && item.quays.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {item.quays.map((q, qIdx) => (
                                      <span
                                        key={qIdx}
                                        style={{
                                          padding: '2px 7px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          backgroundColor: '#EEF2FF',
                                          color: '#4338CA',
                                          border: '1px solid #C7D2FE',
                                        }}
                                      >
                                        {q}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                                    Chưa gán quầy
                                  </span>
                                )}
                              </td>

                              {/* Máy In Phụ Trách */}
                              <td style={{ padding: '10px 12px' }}>
                                {item.printers && item.printers.length > 0 ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {item.printers.map((prn, prnIdx) => (
                                      <span
                                        key={prnIdx}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '2px 8px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          backgroundColor: '#FEF3C7',
                                          color: '#B45309',
                                          border: '1px solid #FDE68A',
                                          letterSpacing: '0.2px'
                                        }}
                                      >
                                        <Printer size={12} color="#D97706" />
                                        {prn}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                                    Chưa gán máy in
                                  </span>
                                )}
                              </td>

                              {/* TG Chế Biến KDS (Nút click để mở popup chỉnh sửa) */}
                              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCookingTime(item)}
                                  title="Bấm để cài đặt thời gian chế biến món này (CONFIG_COOKING)"
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
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      fontSize: '11px',
                                      color: 'var(--text-muted)',
                                      backgroundColor: 'var(--bg-secondary)',
                                      border: '1px solid var(--border-color)',
                                    }}
                                  >
                                    Chưa có giá (0đ)
                                  </span>
                                )}
                              </td>

                              {/* Thao Tác */}
                              <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditCookingTime(item)}
                                    leftIcon={<Clock size={11} />}
                                    style={{ fontSize: '11px', padding: '3px 7px' }}
                                    title="Cài đặt thời gian chế biến món"
                                  >
                                    TG Bếp
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenAssignQuay([item])}
                                    leftIcon={<Layers size={11} color="#059669" />}
                                    style={{ fontSize: '11px', padding: '3px 7px', color: '#059669', borderColor: '#A7F3D0' }}
                                    title="Gán món vào quầy bếp KDS"
                                  >
                                    Gán Quầy
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TÁC VỤ 5: CẤU HÌNH ẨN HIỆN MÓN (SHOW_HIDE_ITEMS) */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedTaskId === 'dish_show_hide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Card (Thu gọn, nhỏ gọn vừa vặn) */}
          <Card>
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                {hasDishChanges && (
                  <span
                    style={{
                      backgroundColor: '#FEF3C7',
                      color: '#92400E',
                      border: '1px solid #F59E0B',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}
                  >
                    ⚠️ Có thay đổi chưa lưu
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShowHideRoleModal(true)}
                    style={{ borderColor: '#FDE68A', color: '#B45309', backgroundColor: '#FFFBEB', fontWeight: 600 }}
                    leftIcon={<ShieldCheck size={14} color="#D97706" />}
                  >
                    Phân Quyền User Ẩn/Hiện Món
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBatchRoleParamCode('ROLE_SETUP_SHOW_HIDE_ITEM');
                      setShowBatchRoleModal(true);
                    }}
                    style={{ borderColor: '#F59E0B', color: '#92400E', backgroundColor: '#FEF3C7', fontWeight: 700 }}
                    leftIcon={<Zap size={14} color="#D97706" />}
                  >
                    ⚡ Bật Tắt &amp; Phân Quyền Hàng Loạt (Nhiều NH)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDishShowHide()}
                    disabled={loadingDishShowHide}
                    leftIcon={<RefreshCw size={13} style={{ animation: loadingDishShowHide ? 'spin 1s linear infinite' : 'none' }} />}
                  >
                    Tải lại danh sách
                  </Button>
                </div>
              </div>
          </Card>

          {/* Two-Column Split Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '16px', alignItems: 'start' }}>
            {/* CỘT TRÁI: MÓN HIỆN */}
            <Card>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Header Cột Trái */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Món hiện ({localVisibleDishes.length})
                    </h4>
                  </div>
                  {/* Search Món Hiện */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder="Tìm món hiện ..."
                      value={visibleDishSearch}
                      onChange={(e) => setVisibleDishSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    />
                    {visibleDishSearch && (
                      <button
                        type="button"
                        onClick={() => setVisibleDishSearch('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh Sách Món Hiện Table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 90px 48px',
                      padding: '8px 12px',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '1px solid var(--border-color)',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: '#475569'
                    }}
                  >
                    <span>Món</span>
                    <span style={{ textAlign: 'right' }}>Giá</span>
                    <span style={{ textAlign: 'center' }}></span>
                  </div>

                  <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
                    {loadingDishShowHide ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', color: '#F97316' }} />
                        <div style={{ fontSize: '13px' }}>Đang tải danh sách món...</div>
                      </div>
                    ) : filteredVisibleDishes.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                        Không có món nào hiển thị.
                      </div>
                    ) : (
                      filteredVisibleDishes.map((dish) => (
                        <div
                          key={dish.item_code}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 90px 48px',
                            alignItems: 'center',
                            padding: '10px 12px',
                            borderBottom: '1px solid #F1F5F9',
                            fontSize: '13px',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          {/* Tên & Mã Món */}
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{dish.item_code}</strong> - {dish.name}
                            </span>
                            {dish.sap_code && (
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                SAP: {dish.sap_code}
                              </span>
                            )}
                          </div>

                          {/* Giá */}
                          <span style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                            {dish.price > 0 ? dish.price.toLocaleString('vi-VN') : '0'}
                          </span>

                          {/* Nút Chuyển Sang Món Ẩn (Mũi tên vàng tròn) */}
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveToHidden(dish)}
                              title="Chuyển sang danh sách Món Ẩn (tự động bật ẩn trên cả QrOrder, CO, SO)"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: '1.5px solid #F59E0B',
                                backgroundColor: '#FFFBEB',
                                color: '#D97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#F59E0B';
                                e.currentTarget.style.color = '#fff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#FFFBEB';
                                e.currentTarget.style.color = '#D97706';
                              }}
                            >
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* CỘT PHẢI: MÓN ẨN */}
            <Card>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Header Cột Phải */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Món ẩn ({localHiddenDishes.length})
                    </h4>
                  </div>
                  {/* Search Món Ẩn */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder="Tìm món ẩn ..."
                      value={hiddenDishSearch}
                      onChange={(e) => setHiddenDishSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    />
                    {hiddenDishSearch && (
                      <button
                        type="button"
                        onClick={() => setHiddenDishSearch('')}
                        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh Sách Món Ẩn Table */}
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '48px 1fr 70px 65px 65px 65px',
                      padding: '8px 10px',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '1px solid var(--border-color)',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: '#475569',
                      alignItems: 'center'
                    }}
                  >
                    <span></span>
                    <span>Món</span>
                    <span style={{ textAlign: 'right' }}>Giá</span>
                    <span style={{ textAlign: 'center' }}>QrOrder</span>
                    <span style={{ textAlign: 'center' }}>CO</span>
                    <span style={{ textAlign: 'center' }}>SO</span>
                  </div>

                  <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
                    {loadingDishShowHide ? (
                      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px', color: '#2563EB' }} />
                        <div style={{ fontSize: '13px' }}>Đang tải danh sách món ẩn...</div>
                      </div>
                    ) : filteredHiddenDishes.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                        Không có món nào đang ẩn.
                      </div>
                    ) : (
                      filteredHiddenDishes.map((dish) => {
                        const isQrHidden = !dish.show_in_qr_order;
                        const isCoHidden = !dish.show_in_co;
                        const isSoHidden = !dish.show_in_so;

                        return (
                          <div
                            key={dish.item_code}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '48px 1fr 70px 65px 65px 65px',
                              alignItems: 'center',
                              padding: '10px 10px',
                              borderBottom: '1px solid #F1F5F9',
                              fontSize: '13px',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {/* Nút Bỏ Ẩn (Mũi tên xanh tròn trái) */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveToVisible(dish)}
                                title="Bỏ ẩn món này (chuyển sang danh sách Món Hiện trên tất cả các kênh)"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  border: '1.5px solid #3B82F6',
                                  backgroundColor: '#EFF6FF',
                                  color: '#2563EB',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#3B82F6';
                                  e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                                  e.currentTarget.style.color = '#2563EB';
                                }}
                              >
                                <ArrowLeft size={16} />
                              </button>
                            </div>

                            {/* Tên & Mã Món */}
                            <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '6px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{dish.item_code}</strong> - {dish.name}
                              </span>
                              {dish.sap_code && (
                                <span style={{ fontSize: '11px', color: '#64748B' }}>
                                  SAP: {dish.sap_code}
                                </span>
                              )}
                            </div>

                            {/* Giá */}
                            <span style={{ textAlign: 'right', fontWeight: 600, color: '#334155' }}>
                              {dish.price > 0 ? dish.price.toLocaleString('vi-VN') : '0'}
                            </span>

                            {/* Switch QrOrder */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <div
                                onClick={() => handleToggleDishChannel(dish.item_code, 'qr')}
                                title={isQrHidden ? 'Đang ẨN trên QrOrder (Bấm để hiện)' : 'Đang HIỆN trên QrOrder (Bấm để ẩn)'}
                                style={{
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  backgroundColor: isQrHidden ? '#334155' : '#E2E8F0',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <div
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    transform: isQrHidden ? 'translateX(16px)' : 'translateX(0)',
                                    transition: 'transform 0.2s'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Switch CO */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <div
                                onClick={() => handleToggleDishChannel(dish.item_code, 'co')}
                                title={isCoHidden ? 'Đang ẨN trên CO (Bấm để hiện)' : 'Đang HIỆN trên CO (Bấm để ẩn)'}
                                style={{
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  backgroundColor: isCoHidden ? '#334155' : '#E2E8F0',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <div
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    transform: isCoHidden ? 'translateX(16px)' : 'translateX(0)',
                                    transition: 'transform 0.2s'
                                  }}
                                />
                              </div>
                            </div>

                            {/* Switch SO */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <div
                                onClick={() => handleToggleDishChannel(dish.item_code, 'so')}
                                title={isSoHidden ? 'Đang ẨN trên SO (Bấm để hiện)' : 'Đang HIỆN trên SO (Bấm để ẩn)'}
                                style={{
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '11px',
                                  backgroundColor: isSoHidden ? '#334155' : '#E2E8F0',
                                  padding: '2px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <div
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: '#fff',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    transform: isSoHidden ? 'translateX(16px)' : 'translateX(0)',
                                    transition: 'transform 0.2s'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom Save Button: Xác Nhận */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleSaveDishes}
              disabled={savingDishes}
              style={{
                backgroundColor: '#F97316',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 700,
                padding: '12px 50px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                if (!savingDishes) e.currentTarget.style.backgroundColor = '#EA580C';
              }}
              onMouseLeave={(e) => {
                if (!savingDishes) e.currentTarget.style.backgroundColor = '#F97316';
              }}
            >
              {savingDishes ? <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
              {savingDishes ? 'Đang lưu vào MongoDB...' : 'Xác nhận'}
            </button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TÁC VỤ 6: CẤU HÌNH ẨN HIỆN MENU (RESTAURANT_CATEGORY) */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedTaskId === 'menu_show_hide' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Main Card */}
          <Card>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Legend Switches Cards (Hai card giải thích trạng thái switch như hình chụp) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '14px' }}>
                {/* Legend 1: Green Active */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#F0FDF4',
                    border: '1.5px solid #86EFAC',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: '#16A34A',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transform: 'translateX(20px)'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#166534' }}>
                    <div>• Menu đang <strong>HIỂN THỊ</strong> trên thiết bị CO/SO/QRCode Order</div>
                    <div>• Menu được cấu hình <strong>TỰ ĐỘNG RA MÓN</strong> trên KDS</div>
                  </div>
                </div>

                {/* Legend 2: Grey Inactive */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: '#CBD5E1',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transform: 'translateX(0)'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.45, color: '#475569' }}>
                    <div>• Menu đang <strong>ẨN</strong> trên thiết bị CO/SO/QRCode Order</div>
                    <div>• Menu được cấu hình <strong>KHÔNG TỰ ĐỘNG RA MÓN</strong> trên KDS</div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs & Quick Action Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  backgroundColor: '#F8FAFC',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}
              >
                {/* Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setMenuFilterKds('ALL')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: menuFilterKds === 'ALL' ? '#3B82F6' : 'var(--border-color)',
                      backgroundColor: menuFilterKds === 'ALL' ? '#EFF6FF' : '#fff',
                      color: menuFilterKds === 'ALL' ? '#1D4ED8' : 'var(--text-secondary)'
                    }}
                  >
                    Tất cả menu ({localMenus.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuFilterKds('AUTO')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: menuFilterKds === 'AUTO' ? '#10B981' : 'var(--border-color)',
                      backgroundColor: menuFilterKds === 'AUTO' ? '#ECFDF5' : '#fff',
                      color: menuFilterKds === 'AUTO' ? '#047857' : 'var(--text-secondary)'
                    }}
                  >
                    Tự Động Ra Món KDS ({localMenus.filter((m) => m.auto_delivery_in_so).length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setMenuFilterKds('MANUAL')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: menuFilterKds === 'MANUAL' ? '#6B7280' : 'var(--border-color)',
                      backgroundColor: menuFilterKds === 'MANUAL' ? '#F1F5F9' : '#fff',
                      color: menuFilterKds === 'MANUAL' ? '#334155' : 'var(--text-secondary)'
                    }}
                  >
                    Không Tự Động KDS ({localMenus.filter((m) => !m.auto_delivery_in_so).length})
                  </button>
                </div>

                {/* Search Menu & Batch KDS Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                    <input
                      type="text"
                      placeholder="Tìm menu theo tên, mã..."
                      value={menuSearchQuery}
                      onChange={(e) => setMenuSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        outline: 'none',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchToggleKds(true)}
                    title="Gạt cờ Tự Động Ra Món KDS sang BẬT cho toàn bộ menu bên dưới"
                    style={{ fontSize: '11px', color: '#047857', borderColor: '#A7F3D0' }}
                  >
                    Bật KDS tất cả
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBatchToggleKds(false)}
                    title="Gạt cờ Tự Động Ra Món KDS sang TẮT cho toàn bộ menu bên dưới"
                    style={{ fontSize: '11px', color: '#475569' }}
                  >
                    Tắt KDS tất cả
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowKdsExplainModal(true)}
                    leftIcon={<HelpCircle size={14} />}
                    style={{ fontSize: '11px', color: '#4338CA', borderColor: '#C7D2FE', backgroundColor: '#EEF2FF' }}
                  >
                    Giải thích KDS
                  </Button>
                </div>
              </div>

              {/* Menu Cards Grid (2 Cột thẻ menu như màn hình chụp) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '14px' }}>
                {loadingMenuShowHide ? (
                  <div style={{ gridColumn: '1 / -1', padding: '50px', textAlign: 'center', color: '#6B7280' }}>
                    <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', color: '#7E22CE' }} />
                    <div>Đang tải danh sách menu từ MongoDB RESTAURANT_CATEGORY...</div>
                  </div>
                ) : filteredMenus.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                    Không tìm thấy danh mục menu nào phù hợp.
                  </div>
                ) : (
                  filteredMenus.map((m) => {
                    return (
                      <div
                        key={m.id + '_' + m.code}
                        style={{
                          backgroundColor: '#fff',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '16px 18px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        {/* Header: Mã - Tên Menu (Mã SAP) */}
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {m.id} - {m.name}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginTop: '3px' }}>
                            {m.subtitle || m.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            {m.sap_code && (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#047857', backgroundColor: '#ECFDF5', padding: '1px 6px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                SAP: {m.sap_code}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #C7D2FE' }}>
                              RK7: {m.rk7_code || m.code}
                            </span>
                          </div>
                        </div>

                        {/* 4 Switch Toggles: CO, SO, QrOrder, KDS */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            alignItems: 'center',
                            gap: '8px',
                            paddingTop: '10px',
                            borderTop: '1px solid #F1F5F9'
                          }}
                        >
                          {/* Toggle CO */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>CO</span>
                            <div
                              onClick={() => handleToggleMenuChannel(m.id, 'co')}
                              title={m.show_in_co ? 'Đang HIỆN trên CO' : 'Đang ẨN trên CO'}
                              style={{
                                width: '38px',
                                height: '22px',
                                borderRadius: '11px',
                                backgroundColor: m.show_in_co ? '#16A34A' : '#CBD5E1',
                                padding: '2px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: '#fff',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                  transform: m.show_in_co ? 'translateX(16px)' : 'translateX(0)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </div>
                          </div>

                          {/* Toggle SO */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>SO</span>
                            <div
                              onClick={() => handleToggleMenuChannel(m.id, 'so')}
                              title={m.show_in_so ? 'Đang HIỆN trên SO' : 'Đang ẨN trên SO'}
                              style={{
                                width: '38px',
                                height: '22px',
                                borderRadius: '11px',
                                backgroundColor: m.show_in_so ? '#16A34A' : '#CBD5E1',
                                padding: '2px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: '#fff',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                  transform: m.show_in_so ? 'translateX(16px)' : 'translateX(0)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </div>
                          </div>

                          {/* Toggle QrOrder */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>QrOrder</span>
                            <div
                              onClick={() => handleToggleMenuChannel(m.id, 'qr')}
                              title={m.show_in_qr_order ? 'Đang HIỆN trên QrOrder' : 'Đang ẨN trên QrOrder'}
                              style={{
                                width: '38px',
                                height: '22px',
                                borderRadius: '11px',
                                backgroundColor: m.show_in_qr_order ? '#16A34A' : '#CBD5E1',
                                padding: '2px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: '#fff',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                  transform: m.show_in_qr_order ? 'translateX(16px)' : 'translateX(0)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </div>
                          </div>

                          {/* Toggle KDS */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>KDS</span>
                            <div
                              onClick={() => handleToggleMenuChannel(m.id, 'kds')}
                              title={m.auto_delivery_in_so ? 'Menu TỰ ĐỘNG RA MÓN trên KDS' : 'Menu KHÔNG TỰ ĐỘNG RA MÓN trên KDS'}
                              style={{
                                width: '38px',
                                height: '22px',
                                borderRadius: '11px',
                                backgroundColor: m.auto_delivery_in_so ? '#16A34A' : '#CBD5E1',
                                padding: '2px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  backgroundColor: '#fff',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                  transform: m.auto_delivery_in_so ? 'translateX(16px)' : 'translateX(0)',
                                  transition: 'transform 0.2s'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Action Bar: Huỷ & Lưu Thay Đổi */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border-color)'
                }}
              >
                <button
                  type="button"
                  onClick={handleResetMenus}
                  disabled={!hasMenuChanges || savingMenus}
                  style={{
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '9px 28px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    cursor: hasMenuChanges ? 'pointer' : 'not-allowed',
                    opacity: hasMenuChanges ? 1 : 0.6
                  }}
                >
                  Huỷ
                </button>

                <button
                  type="button"
                  onClick={handleSaveMenus}
                  disabled={savingMenus}
                  style={{
                    backgroundColor: '#E0B56C',
                    color: '#1F2937',
                    fontSize: '14px',
                    fontWeight: 700,
                    padding: '9px 34px',
                    borderRadius: '6px',
                    border: '1px solid #C99E52',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(224, 181, 108, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {savingMenus ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                  {savingMenus ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </Card>

          {/* Modal Giải Thích Chi Tiết Tính Năng KDS */}
          {showKdsExplainModal && (
            <Modal
              isOpen={showKdsExplainModal}
              onClose={() => setShowKdsExplainModal(false)}
              title="💡 Giải Thích Ý Nghĩa Tính Năng Ra Món Trên KDS (autoDeliveryInSo)"
              maxWidth="650px"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px', lineHeight: 1.6 }}>
                <div style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                    1. Gạt BẬT (Xanh lá) - "Menu được cấu hình TỰ ĐỘNG RA MÓN trên KDS":
                  </div>
                  <div style={{ color: '#166534' }}>
                    Khi khách hàng hoặc nhân viên gọi món trên thiết bị <strong>CO (Customer Order) / SO (Staff Order) / QR Code Order</strong>, các món thuộc menu này sẽ <strong>tự động chuyển thẳng xuống màn hình bếp KDS để nấu ngay lập tức</strong> mà không cần nhân viên phải vào đơn để nhấn nút "Ra món" / "Bắn bếp" thủ công.
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#15803D' }}>
                      👉 <strong>Áp dụng cho:</strong> Menu Alacarte, đồ uống, khai vị, hoặc các món cần chế biến tức thì khi khách order.
                    </div>
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                    2. Gạt TẮT (Xám) - "Menu được cấu hình KHÔNG TỰ ĐỘNG RA MÓN trên KDS":
                  </div>
                  <div style={{ color: '#475569' }}>
                    Khi gọi món trên SO/CO/QR, món ăn chỉ được ghi nhận vào order của bàn chứ <strong>chưa đẩy ngay xuống bếp KDS</strong>. Món sẽ ở trạng thái chờ cho đến khi nhân viên phục vụ hoặc khách chủ động bấm "Yêu cầu ra món" theo từng đợt.
                    <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#64748B' }}>
                      👉 <strong>Áp dụng cho:</strong> Các set Buffet nhiều đợt, món nướng đợt sau, tráng miệng để tránh ra món dồn dập làm nguội thức ăn hoặc quá tải quầy bếp.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <Button variant="primary" size="sm" onClick={() => setShowKdsExplainModal(false)}>
                    Đã hiểu
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: ACTION LOG SESSION DETAIL (TIMELINE & ENRICHED DATA) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {sessionDetailModalOpen && (
        <Modal
          isOpen={sessionDetailModalOpen}
          onClose={() => setSessionDetailModalOpen(false)}
          title={`🔍 Chi Tiết Phiên Nhật Ký: Bàn ${sessionDetailData?.order_info?.tableName || selectedSessionGuid?.slice(0, 12)} (${sessionDetailData?.total_actions || 0} thao tác)`}
          maxWidth="1100px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {loadingSessionDetail ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: '#4F46E5' }} />
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Đang tải toàn bộ chi tiết thao tác của phiên...</p>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9CA3AF' }}>Truy vấn ACTION_LOG và ORDER_ACTION_LOG theo GUID {selectedSessionGuid}</p>
              </div>
            ) : !sessionDetailData ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#DC2626' }}>
                <AlertCircle size={32} style={{ marginBottom: '10px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Không tìm thấy chi tiết phiên này</p>
              </div>
            ) : (
              <>
                {/* 1. Session & Order Summary Banner */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {/* Bàn & Order ID */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Bàn & Mã Đơn POS:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                        {sessionDetailData.order_info?.tableName || 'N/A'}
                      </span>
                      {sessionDetailData.order_info?.orderId !== undefined && (
                        <Badge variant="neutral">Order #{sessionDetailData.order_info?.orderId}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Trạng thái đơn */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Trạng Thái Đơn:</span>
                    <div style={{ marginTop: '3px' }}>
                      <Badge variant={sessionDetailData.order_info?.status === 1 ? 'primary' : sessionDetailData.order_info?.status === 2 ? 'warning' : 'neutral'}>
                        {sessionDetailData.order_info?.statusDesc || (sessionDetailData.order_info ? `Trạng thái ${sessionDetailData.order_info?.status}` : 'Không có đơn')}
                      </Badge>
                    </div>
                  </div>

                  {/* Tổng tiền & Giảm giá */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Tổng Tiền Đơn:</span>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                      {sessionDetailData.order_info?.totalAmount ? `${Number(sessionDetailData.order_info.totalAmount).toLocaleString()} đ` : '0 đ'}
                    </div>
                  </div>

                  {/* Nhân viên phục vụ */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Nhân Viên Phục Vụ:</span>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginTop: '2px' }}>
                      {sessionDetailData.order_info?.waiter?.name || sessionDetailData.order_info?.waiter?.code || '—'}
                    </div>
                  </div>

                  {/* Giờ mở - Giờ đóng */}
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Thời Gian Mở / Đóng:</span>
                    <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                      {sessionDetailData.order_info?.openTimeStr ? sessionDetailData.order_info.openTimeStr.split(' ')[1] : '—'}
                      {' ➔ '}
                      {sessionDetailData.order_info?.closeTimeStr ? sessionDetailData.order_info.closeTimeStr.split(' ')[1] : 'Hiện tại'}
                    </div>
                  </div>

                  {/* Mã GUID */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Mã GUID Phiên:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <code style={{ fontSize: '11px', fontFamily: 'Consolas, monospace', backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '2px 6px', borderRadius: '4px' }}>
                        {sessionDetailData.guid}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(sessionDetailData.guid);
                          showToast('Đã copy GUID: ' + sessionDetailData.guid, 'info');
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6D28D9', padding: '2px' }}
                        title="Copy GUID"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. 4 Business Deep-Dive Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {/* Card 1: Thanh Toán */}
                  <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={15} color="#16A34A" />
                        <span>THANH TOÁN</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: sessionDetailData.payment_info?.is_paid ? '#DCFCE7' : '#FEF3C7',
                          color: sessionDetailData.payment_info?.is_paid ? '#15803D' : '#B45309',
                          border: sessionDetailData.payment_info?.is_paid ? '1px solid #86EFAC' : '1px solid #FDE68A'
                        }}
                      >
                        {sessionDetailData.payment_info?.is_paid ? 'ĐÃ THANH TOÁN' : 'CHƯA THANH TOÁN'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Số tiền thanh toán:</span>
                        <strong style={{ color: '#15803D', fontSize: '13px' }}>
                          {sessionDetailData.payment_info?.paid_amount
                            ? `${Number(sessionDetailData.payment_info.paid_amount).toLocaleString()} đ`
                            : sessionDetailData.order_info?.totalAmount
                            ? `${Number(sessionDetailData.order_info.totalAmount).toLocaleString()} đ`
                            : '0 đ'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Hình thức:</span>
                        <strong style={{ color: '#1F2937' }}>
                          {sessionDetailData.payment_info?.payment_method || '—'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Thời gian TT:</span>
                        <span style={{ color: '#374151', fontWeight: 600 }}>
                          {sessionDetailData.payment_info?.paid_time_str || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #BBF7D0', paddingTop: '4px', marginTop: '2px' }}>
                        <span style={{ color: '#6B7280', fontSize: '11px' }}>Kênh / In bill:</span>
                        <span style={{ color: '#374151', fontSize: '11px', fontWeight: 600 }}>
                          {sessionDetailData.payment_info?.channel || sessionDetailData.order_info?.createFrom || 'GPOS'} | In: {sessionDetailData.payment_info?.print_bill_from || (sessionDetailData.order_info?.printBillFrom === 2 ? 'Tablet' : 'POS')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Xuất Hóa Đơn VAT */}
                  <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Receipt size={15} color="#2563EB" />
                        <span>HÓA ĐƠN VAT</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: sessionDetailData.vat_info?.has_vat_request ? '#EFF6FF' : '#F1F5F9',
                          color: sessionDetailData.vat_info?.has_vat_request ? '#1D4ED8' : '#64748B',
                          border: sessionDetailData.vat_info?.has_vat_request ? '1px solid #BFDBFE' : '1px solid #CBD5E1'
                        }}
                      >
                        {sessionDetailData.vat_info?.has_vat_request ? 'CÓ XUẤT HĐ' : 'KHÔNG XUẤT'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Tiền thuế VAT:</span>
                        <strong style={{ color: '#1E293B' }}>
                          {sessionDetailData.vat_info?.vat_amount
                            ? `${Number(sessionDetailData.vat_info.vat_amount).toLocaleString()} đ`
                            : '0 đ'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Trạng thái HĐ:</span>
                        <span style={{ color: '#374151', fontWeight: 600 }}>
                          {sessionDetailData.vat_info?.vat_status_desc || (sessionDetailData.vat_info?.has_vat_request ? 'Yêu cầu xuất VAT' : 'Không')}
                        </span>
                      </div>

                      {/* E-Invoice Link Button */}
                      <div style={{ marginTop: '4px' }}>
                        {sessionDetailData.vat_info?.qr_vat_url ? (
                          <a
                            href={sessionDetailData.vat_info.qr_vat_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '5px',
                              backgroundColor: '#2563EB',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 600,
                              textDecoration: 'none',
                              width: '100%',
                              justifyContent: 'center'
                            }}
                          >
                            <ExternalLink size={12} />
                            <span>Mở Link Hóa Đơn Điện Tử</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic' }}>
                            Không có link HĐĐT trực tuyến
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Voucher & Khuyến Mãi */}
                  <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#6B21A8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Ticket size={15} color="#9333EA" />
                        <span>VOUCHER & ƯU ĐÃI</span>
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: (sessionDetailData.vouchers && sessionDetailData.vouchers.length > 0) ? '#F3E8FF' : '#F1F5F9',
                          color: (sessionDetailData.vouchers && sessionDetailData.vouchers.length > 0) ? '#7E22CE' : '#64748B',
                          border: (sessionDetailData.vouchers && sessionDetailData.vouchers.length > 0) ? '1px solid #D8B4FE' : '1px solid #CBD5E1'
                        }}
                      >
                        {sessionDetailData.vouchers && sessionDetailData.vouchers.length > 0
                          ? `${sessionDetailData.vouchers.length} mã áp dụng`
                          : 'Không dùng'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Tổng giảm giá:</span>
                        <strong style={{ color: '#9333EA', fontSize: '13px' }}>
                          {sessionDetailData.total_discount && sessionDetailData.total_discount > 0
                            ? `-${Number(sessionDetailData.total_discount).toLocaleString()} đ`
                            : '0 đ'}
                        </strong>
                      </div>

                      {/* Voucher List */}
                      {sessionDetailData.vouchers && sessionDetailData.vouchers.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '90px', overflowY: 'auto', marginTop: '2px' }}>
                          {sessionDetailData.vouchers.map((v, vIdx) => (
                            <div
                              key={vIdx}
                              style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#fff',
                                border: '1px solid #E9D5FF',
                                fontSize: '11px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700, color: '#6B21A8' }}>
                                  {v.code || v.name || 'Mã ưu đãi'}
                                </span>
                                {v.campaign_name && (
                                  <span style={{ fontSize: '10px', color: '#6B7280' }}>
                                    {v.campaign_name}
                                  </span>
                                )}
                              </div>
                              <span style={{ fontWeight: 700, color: '#DC2626' }}>
                                {v.discount_amount ? `-${Number(v.discount_amount).toLocaleString()} đ` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontStyle: 'italic', marginTop: '4px' }}>
                          Bàn không áp dụng mã voucher nào
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Thông Tin Khách Hàng */}
                  <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={15} color="#0284C7" />
                        <span>KHÁCH HÀNG</span>
                      </span>
                      {sessionDetailData.customer_info?.member_code && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#E0F2FE',
                            color: '#0369A1',
                            border: '1px solid #7DD3FC'
                          }}
                        >
                          THE GOLDEN SPOON
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Họ và tên:</span>
                        <strong style={{ color: '#0369A1' }}>
                          {sessionDetailData.customer_info?.name || 'Khách vãng lai'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Số điện thoại:</span>
                        <span style={{ color: '#374151', fontWeight: 600 }}>
                          {sessionDetailData.customer_info?.phone || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4B5563' }}>Mã hội viên:</span>
                        <span style={{ fontFamily: 'Consolas, monospace', color: '#0369A1', fontWeight: 700 }}>
                          {sessionDetailData.customer_info?.member_code || '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #BAE6FD', paddingTop: '4px', marginTop: '2px' }}>
                        <span style={{ color: '#6B7280', fontSize: '11px' }}>Số lượng khách:</span>
                        <span style={{ color: '#374151', fontSize: '11px', fontWeight: 600 }}>
                          {sessionDetailData.customer_info?.guest_count
                            ? `${sessionDetailData.customer_info.guest_count} khách (${sessionDetailData.customer_info.adult_count || 0} lớn, ${sessionDetailData.customer_info.child_count || 0} trẻ)`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Search Toolbar & Filter Inside Modal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                      <input
                        type="text"
                        value={detailFilterQuery}
                        onChange={(e) => setDetailFilterQuery(e.target.value)}
                        placeholder="Lọc hành động, app (CO, SO), user..."
                        style={{
                          width: '100%',
                          padding: '6px 10px 6px 30px',
                          fontSize: '12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          outline: 'none',
                          backgroundColor: '#fff'
                        }}
                      />
                    </div>

                    {/* Toggle GAME ping inside modal */}
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#4B5563',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      title="Ẩn các ping status định kỳ của app GAME trên QR code"
                    >
                      <input
                        type="checkbox"
                        checked={hideGameActionsInModal}
                        onChange={(e) => setHideGameActionsInModal(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Ẩn log GAME / ping QR status</span>
                    </label>
                  </div>

                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    Hiển thị <strong>{filteredDetailActions.length}</strong> / <strong>{sessionDetailData.total_actions}</strong> thao tác
                  </span>
                </div>

                {/* 3. Detailed Actions List / Table */}
                <div style={{ maxHeight: '480px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F1F5F9', zIndex: 2 }}>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: '#334155' }}>
                        <th style={{ padding: '8px 10px', width: '35px' }}>#</th>
                        <th style={{ padding: '8px 10px', width: '135px' }}>Thời Gian</th>
                        <th style={{ padding: '8px 10px', width: '65px' }}>App</th>
                        <th style={{ padding: '8px 10px', width: '75px' }}>User</th>
                        <th style={{ padding: '8px 10px', width: '230px' }}>Hành Động (Action Name)</th>
                        <th style={{ padding: '8px 10px' }}>Mô Tả Nghiệp Vụ (Ý Nghĩa)</th>
                        <th style={{ padding: '8px 10px', width: '70px', textAlign: 'right' }}>Thời Gian</th>
                        <th style={{ padding: '8px 10px', width: '75px', textAlign: 'center' }}>Dữ Liệu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDetailActions.map((act, aIdx) => {
                        const isExpanded = expandedActionId === act.id;
                        const hasData = Boolean(act.req_data || act.res_data);
                        const exp = explainActionName(act.action_name);
                        return (
                          <React.Fragment key={act.id + aIdx}>
                            <tr
                              className="interactive-table-row"
                              style={{
                                borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                                backgroundColor: isExpanded ? '#F8FAFC' : aIdx % 2 === 0 ? '#fff' : '#FAFAFA'
                              }}
                            >
                              <td style={{ padding: '8px 10px', color: '#94A3B8' }}>{aIdx + 1}</td>
                              
                              {/* Thời Gian */}
                              <td style={{ padding: '8px 10px', fontFamily: 'Consolas, monospace', fontSize: '11px', color: '#475569' }}>
                                {act.time_str || String(act.time)}
                              </td>

                              {/* App */}
                              <td style={{ padding: '8px 10px' }}>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    backgroundColor: act.source === 'ORDER_ACTION_LOG' ? '#FEF3C7' : '#EFF6FF',
                                    color: act.source === 'ORDER_ACTION_LOG' ? '#B45309' : '#1D4ED8',
                                    border: act.source === 'ORDER_ACTION_LOG' ? '1px solid #FDE68A' : '1px solid #BFDBFE'
                                  }}
                                >
                                  {act.app_code || 'SYS'}
                                </span>
                              </td>

                              {/* User */}
                              <td style={{ padding: '8px 10px', color: '#334155', fontWeight: 600 }}>
                                {act.user_code || <span style={{ color: '#94A3B8' }}>—</span>}
                              </td>

                              {/* Action Name */}
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'Consolas, monospace' }}>
                                    {act.action_name}
                                  </span>
                                  {act.source === 'ORDER_ACTION_LOG' && (
                                    <Badge variant="warning">ORDER_LOG</Badge>
                                  )}
                                </div>
                              </td>

                              {/* Mô Tả Nghiệp Vụ (Ý Nghĩa) */}
                              <td style={{ padding: '8px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: exp.color.bg,
                                      color: exp.color.text,
                                      border: `1px solid ${exp.color.border}`,
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {exp.badge}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#1E293B', fontWeight: 500 }}>
                                    {exp.meaning}
                                  </span>
                                </div>
                              </td>

                              {/* Total time ms */}
                              <td style={{ padding: '8px 10px', textAlign: 'right', color: act.total_time_ms && act.total_time_ms > 1000 ? '#DC2626' : '#475569' }}>
                                {act.total_time_ms !== null && act.total_time_ms !== undefined ? (
                                  <span style={{ fontWeight: act.total_time_ms > 1000 ? 700 : 500 }}>
                                    {act.total_time_ms} ms
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>

                              {/* Payload Toggle Button */}
                              <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                {hasData ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedActionId(isExpanded ? null : act.id)}
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: isExpanded ? '1px solid #C7D2FE' : '1px solid #E2E8F0',
                                      backgroundColor: isExpanded ? '#EEF2FF' : '#fff',
                                      color: isExpanded ? '#4338CA' : '#475569',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <Code size={11} />
                                    <span>{isExpanded ? 'Ẩn' : 'Payload'}</span>
                                  </button>
                                ) : (
                                  <span style={{ color: '#CBD5E1', fontSize: '11px' }}>—</span>
                                )}
                              </td>
                            </tr>

                            {/* Expanded Payload Viewer Row */}
                            {isExpanded && (
                              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)' }}>
                                <td colSpan={8} style={{ padding: '12px 14px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: act.res_data ? '1fr 1fr' : '1fr', gap: '12px' }}>
                                    {/* Request Data */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338CA' }}>
                                          Request Data (Dữ liệu gửi lên):
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const txt = typeof act.req_data === 'string' ? act.req_data : JSON.stringify(act.req_data, null, 2);
                                            navigator.clipboard.writeText(txt);
                                            showToast('Đã chép Request Data!', 'info');
                                          }}
                                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: '#4338CA', display: 'flex', alignItems: 'center', gap: '3px' }}
                                        >
                                          <Copy size={11} />
                                          <span>Chép</span>
                                        </button>
                                      </div>
                                      <pre
                                        style={{
                                          margin: 0,
                                          padding: '10px',
                                          borderRadius: '6px',
                                          backgroundColor: '#0F172A',
                                          color: '#38BDF8',
                                          fontSize: '11px',
                                          lineHeight: 1.4,
                                          maxHeight: '220px',
                                          overflowY: 'auto',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word'
                                        }}
                                      >
                                        {typeof act.req_data === 'string'
                                          ? (() => {
                                              try {
                                                return JSON.stringify(JSON.parse(act.req_data), null, 2);
                                              } catch {
                                                return act.req_data;
                                              }
                                            })()
                                          : JSON.stringify(act.req_data, null, 2)}
                                      </pre>
                                    </div>

                                    {/* Response Data */}
                                    {act.res_data && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                                            Response Data (Kết quả trả về):
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const txt = typeof act.res_data === 'string' ? act.res_data : JSON.stringify(act.res_data, null, 2);
                                              navigator.clipboard.writeText(txt);
                                              showToast('Đã chép Response Data!', 'info');
                                            }}
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}
                                          >
                                            <Copy size={11} />
                                            <span>Chép</span>
                                          </button>
                                        </div>
                                        <pre
                                          style={{
                                            margin: 0,
                                            padding: '10px',
                                            borderRadius: '6px',
                                            backgroundColor: '#0F172A',
                                            color: '#4ADE80',
                                            fontSize: '11px',
                                            lineHeight: 1.4,
                                            maxHeight: '220px',
                                            overflowY: 'auto',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word'
                                          }}
                                        >
                                          {typeof act.res_data === 'string'
                                            ? (() => {
                                                try {
                                                  return JSON.stringify(JSON.parse(act.res_data), null, 2);
                                                } catch {
                                                  return act.res_data;
                                                }
                                              })()
                                            : JSON.stringify(act.res_data, null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
              <Button variant="outline" size="sm" onClick={() => setSessionDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}



      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: CHỈNH SỬA THỜI GIAN CHẾ BIẾN MÓN (CONFIG_COOKING) */}
      {/* ══════════════════════════════════════════════════════════════ */}
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
                isLoading={savingCookingTime}
                leftIcon={<Clock size={16} />}
              >
                Lưu thời gian chế biến
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>
                {editingKdsItem.menu_item_name}
              </div>
              <div style={{ fontSize: '12px', color: '#15803D', marginTop: '3px', display: 'flex', gap: '12px' }}>
                <span>Mã món: <strong>{editingKdsItem.menu_item_code}</strong></span>
                {editingKdsItem.sap_code && <span>Mã SAP: <strong>{editingKdsItem.sap_code}</strong></span>}
                {editingKdsItem.group_type_kds && <span>Nhóm: <strong>{editingKdsItem.group_type_kds}</strong></span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Số Phút:
                </label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Số Giây:
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editSeconds}
                  onChange={(e) => setEditSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', fontSize: '12px', color: 'var(--text-secondary)' }}>
              💡 Tổng thời gian chế biến sẽ lưu vào collection <code>CONFIG_COOKING</code>: <strong>{Math.max(0, (Number(editMinutes) || 0) * 60 + (Number(editSeconds) || 0))} giây</strong>.
            </div>
          </div>
        </Modal>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: THÊM QUẦY VÀ ACCOUNT KDS MỚI (CÁCH LY STATE ĐỂ GÕ MƯỢT MÀ) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <KdsAddQuayModal
        isOpen={showAddQuayModal}
        onClose={() => setShowAddQuayModal(false)}
        host={connectedHost || ''}
        port={27017}
        availablePrinters={kdsPrinters}
        hasFoodControl={hasFoodControl}
        onSuccess={() => {
          if (connectedHost) {
            fetchKdsPlaces(connectedHost);
            fetchKdsItems(connectedHost);
          }
        }}
        showToast={showToast}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: CHUYỂN TOÀN BỘ HOẶC 1 PHẦN MÓN TỪ QUẦY BẾP NÀY SANG QUẦY BẾP KIA */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <KdsTransferQuayModal
        isOpen={showTransferQuayModal}
        onClose={() => setShowTransferQuayModal(false)}
        host={connectedHost || ''}
        port={27017}
        places={kdsPlaces}
        allDishes={kdsData?.items || []}
        preselectedDishCodes={selectedKdsDishCodes}
        initialFromPlaceId={transferFromPlaceId}
        onSuccess={() => {
          setSelectedKdsDishCodes([]);
          if (connectedHost) {
            fetchKdsPlaces(connectedHost);
            fetchKdsItems(connectedHost);
          }
        }}
        showToast={showToast}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: TRA CỨU LOGS KDS (ORDER TỪ CO/SO & BẤM DONE MÓN) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <KdsLogsModal
        isOpen={showKdsLogsModal}
        onClose={() => setShowKdsLogsModal(false)}
        host={connectedHost || ''}
        port={27017}
        restaurantName={restaurantGposInfo?.restaurant_name || selectedRestaurant?.res || undefined}
        showToast={showToast}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: TẠO BỔ SUNG QUẦY & ACCOUNT FOOD CONTROL (ROLE: 2) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <ModalCreateFoodControl
        isOpen={showCreateFoodControlModal}
        onClose={() => setShowCreateFoodControlModal(false)}
        host={connectedHost || searchParams.get('host') || selectedRestaurant?.ip || ''}
        port={27017}
        restaurantName={selectedRestaurant?.res || selectedRestaurant?.restaurant_name}
        defaultPrinters={kdsPrinters}
        existingPlacesCount={kdsPlaces.length}
        onSuccess={() => {
          const hostToUse = connectedHost || searchParams.get('host') || selectedRestaurant?.ip;
          if (hostToUse) {
            fetchKdsPlaces(hostToUse);
            fetchKdsItems(hostToUse);
          }
        }}
        onToast={showToast}
      />


      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: QUẢN LÝ QUẦY & MÁY IN / DRIVER NAME & XÓA QUẦY 2 BƯỚC */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <KdsQuayListModal
        isOpen={showQuayListModal}
        onClose={() => setShowQuayListModal(false)}
        host={connectedHost || searchParams.get('host') || selectedRestaurant?.ip || ''}
        port={27017}
        places={kdsPlaces}
        printers={kdsPrinters}
        onOpenAddQuay={() => setShowAddQuayModal(true)}
        onRefresh={() => {
          const hostToUse = connectedHost || searchParams.get('host') || selectedRestaurant?.ip;
          if (hostToUse) {
            fetchKdsPlaces(hostToUse);
            fetchKdsItems(hostToUse);
          }
        }}
        showToast={showToast}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: PHÂN QUYỀN USER CẤU HÌNH IN / KDS (ROLE_SETUP_CONFIG_COOKING) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <KdsRoleUserModal
        isOpen={showKdsRoleModal}
        onClose={() => setShowKdsRoleModal(false)}
        host={connectedHost || searchParams.get('host') || selectedRestaurant?.ip || ''}
        port={27017}
        restaurantCode={selectedRestaurant?.rk7_code || selectedRestaurant?.sap_code}
        paramCode="ROLE_SETUP_CONFIG_COOKING"
        showToast={showToast}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: PHÂN QUYỀN USER ẨN / HIỆN MÓN (ROLE_SETUP_SHOW_HIDE_ITEM) */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <KdsRoleUserModal
        isOpen={showShowHideRoleModal}
        onClose={() => setShowShowHideRoleModal(false)}
        host={connectedHost || searchParams.get('host') || selectedRestaurant?.ip || ''}
        port={27017}
        restaurantCode={selectedRestaurant?.rk7_code || selectedRestaurant?.sap_code}
        paramCode="ROLE_SETUP_SHOW_HIDE_ITEM"
        title="Cấu Hình Phân Quyền Ẩn / Hiện Món (ROLE_SETUP_SHOW_HIDE_ITEM)"
        showToast={showToast}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: BẬT TẮT & PHÂN QUYỀN HÀNG LOẠT NHIỀU NHÀ HÀNG */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <BatchRoleUserModal
        isOpen={showBatchRoleModal}
        onClose={() => setShowBatchRoleModal(false)}
        restaurants={restaurants}
        showToast={showToast}
        selectedRestaurant={selectedRestaurant}
        defaultParamCode={batchRoleParamCode}
      />

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: GÁN MÓN VÀO QUẦY BẾP */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAssignQuayModal && (
        <Modal
          isOpen={showAssignQuayModal}
          onClose={() => setShowAssignQuayModal(false)}
          title={`👨‍🍳 Gán Món Vào Quầy Bếp KDS (${assignTargetDishes.length} món)`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button variant="outline" onClick={() => setShowAssignQuayModal(false)} disabled={savingAssignQuay}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAssignQuay}
                isLoading={savingAssignQuay}
                leftIcon={<Layers size={16} />}
                style={{ backgroundColor: '#059669', color: '#fff' }}
              >
                Xác nhận gán quầy
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid var(--border-color)', maxHeight: '140px', overflowY: 'auto' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Danh sách món được gán:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {assignTargetDishes.map((d, dIdx) => (
                  <span
                    key={dIdx}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <strong>{d.menu_item_code}</strong>: {d.menu_item_name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Chọn Quầy Bếp Cần Gán (CONFIG_COOKING):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                {kdsPlaces.map((pl) => {
                  const isChecked = selectedPlaceIdsToAssign.includes(pl.id);
                  return (
                    <label
                      key={pl.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isChecked ? '1.5px solid #059669' : '1px solid var(--border-color)',
                        backgroundColor: isChecked ? '#ECFDF5' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlaceIdsToAssign((prev) => [...prev, pl.id]);
                          } else {
                            setSelectedPlaceIdsToAssign((prev) => prev.filter((id) => id !== pl.id));
                          }
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isChecked ? '#065F46' : 'var(--text-primary)' }}>
                          {pl.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Printer size={10} color="#D97706" />
                          <span>Máy in: <strong>{pl.printer || 'Chưa gán'}</strong></span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Chế độ gán quầy:
              </label>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="assignMode"
                    value="replace"
                    checked={assignMode === 'replace'}
                    onChange={() => setAssignMode('replace')}
                  />
                  <span><strong>Ghi đè</strong> (món chỉ thuộc các quầy được chọn ở trên)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="assignMode"
                    value="append"
                    checked={assignMode === 'append'}
                    onChange={() => setAssignMode('append')}
                  />
                  <span><strong>Thêm vào</strong> (giữ nguyên các quầy cũ, bổ sung thêm quầy mới)</span>
                </label>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
