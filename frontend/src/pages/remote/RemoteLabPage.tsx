/**
 * Màn hình Thử Nghiệm: 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab)
 * Hoàn toàn độc lập với các phân hệ khác (RestaurantListPage, VncSetupModal, VncKdsModal...)
 * Dễ dàng cách ly, gỡ bỏ hoặc tích hợp vào web chính thức khi hoàn thiện.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Monitor,
  Tv,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  Maximize2,
  Minimize2,
  Camera,
  Square,
  Copy,
  Check,
  Terminal,
  Activity,
  ArrowLeft,
  Zap,
  Loader2,
  ExternalLink,
  Building2,
  X
} from 'lucide-react';
import {
  remoteLabService,
  RemoteEndpoint,
  RemoteSessionInfo
} from '../../services/remoteLabService';
import { pingVnc, pingKds, getRestaurants } from '../../services/restaurantService';
import { RestaurantItem } from '../../types/restaurant';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

// Hằng số danh sách thiết bị chuẩn Nhà Hàng (Chuẩn như VncKdsModal)
const VNC_ITEMS = [
  { suffix: '41', label: 'PC QL', protocol: 'vnc' as const },
  { suffix: '11', label: 'POS 1.1', protocol: 'vnc' as const },
  { suffix: '12', label: 'POS 1.2', protocol: 'vnc' as const },
];

const KDS_ITEMS = [
  { suffix: '31', label: 'KDS 1', protocol: 'scrcpy' as const },
  { suffix: '32', label: 'KDS 2', protocol: 'scrcpy' as const },
  { suffix: '33', label: 'KDS 3', protocol: 'scrcpy' as const },
  { suffix: '34', label: 'KDS 4', protocol: 'scrcpy' as const },
  { suffix: '35', label: 'KDS 5', protocol: 'scrcpy' as const },
  { suffix: '36', label: 'KDS 6', protocol: 'scrcpy' as const },
  { suffix: '37', label: 'KDS 7', protocol: 'scrcpy' as const },
  { suffix: '38', label: 'KDS 8', protocol: 'scrcpy' as const },
];

const VNC_COLOR = '#1a73e8';
const KDS_COLOR = '#6f42c1';

// Helper trích xuất 3 octet đầu của IP (VD: "10.8.159.11" -> "10.8.159.")
const getIpPrefix = (ip: string | null | undefined): string => {
  if (!ip) return '';
  const clean = ip.replace(/[^0-9.]/g, '.').replace(/\.+$/, '');
  const parts = clean.split('.');
  if (parts.length >= 3) {
    return parts.slice(0, 3).join('.') + '.';
  }
  return '';
};

export const RemoteLabPage: React.FC = () => {
  // Toast thông báo độc lập
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Danh sách máy & phiên
  const [endpoints, setEndpoints] = useState<RemoteEndpoint[]>([]);
  const [loadingEndpoints, setLoadingEndpoints] = useState<boolean>(false);
  const [, setActiveSessions] = useState<RemoteSessionInfo[]>([]);

  // Tra cứu & Ping tín hiệu Nhà hàng (dùng chung cho cả Lưới Card và lọc Bảng Danh Sách)
  const [restaurantSearch, setRestaurantSearch] = useState<string>('');
  const [restaurantSuggestions, setRestaurantSuggestions] = useState<RestaurantItem[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantItem | null>(null);
  const [isSearchingRes, setIsSearchingRes] = useState<boolean>(false);
  const [showResDropdown, setShowResDropdown] = useState<boolean>(false);

  // IP Prefix và kết quả Ping
  const [ipPrefix, setIpPrefix] = useState<string>('10.8.159.'); // Mặc định như trong ảnh yêu cầu
  const [vncResults, setVncResults] = useState<Record<string, boolean>>({});
  const [kdsResults, setKdsResults] = useState<Record<string, boolean>>({});
  const [vncLoading, setVncLoading] = useState<boolean>(false);
  const [kdsLoading, setKdsLoading] = useState<boolean>(false);

  // Modal chọn phương thức kết nối khi bấm vào thiết bị Online
  const [connectTarget, setConnectTarget] = useState<{
    suffix: string;
    label: string;
    protocol: 'vnc' | 'scrcpy';
    ip: string;
    isOnline: boolean;
    hasAgent: boolean;
  } | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

  // Bộ lọc tab danh sách máy trạm
  const [filterType, setFilterType] = useState<'all' | 'online' | 'restaurant' | 'kds'>('all');

  // Cấu hình chất lượng & FPS khi remote
  const [customFps, setCustomFps] = useState<number>(15);
  const [customQuality, setCustomQuality] = useState<number>(65);

  // Phiên remote đang chạy
  const [currentSession, setCurrentSession] = useState<RemoteSessionInfo | null>(null);
  const [isAgentConnected, setIsAgentConnected] = useState<boolean>(false);
  const [isRetryingAgent, setIsRetryingAgent] = useState<boolean>(false);
  const [pingMs, setPingMs] = useState<number>(0);
  const [streamFps, setStreamFps] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

  // Trạng thái Agent máy trạm và Task kích hoạt (Live Status Tracker)
  const [agentStatus, setAgentStatus] = useState<{
    is_online: boolean;
    seconds_since_heartbeat?: number | null;
    last_heartbeat?: string | null;
    service_status?: string;
    machine_name?: string | null;
    agent_version?: string | null;
    latest_task?: {
      task_id: number;
      status: string;
      message?: string | null;
      created_at?: string | null;
    } | null;
    is_worker_connected: boolean;
  } | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  // Tham chiếu DOM & WebSocket
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(Date.now());
  const pingIntervalRef = useRef<number | null>(null);

  // Kích thước màn hình gốc của Remote
  const [remoteResolution, setRemoteResolution] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080
  });

  // Tải danh sách endpoints và active sessions
  const loadInitialData = useCallback(async () => {
    try {
      setLoadingEndpoints(true);
      const [eps, sessions] = await Promise.all([
        remoteLabService.getEndpoints(),
        remoteLabService.listSessions()
      ]);
      setEndpoints(eps);
      setActiveSessions(sessions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách thiết bị';
      showToast(msg, 'error');
    } finally {
      setLoadingEndpoints(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Tự động kích hoạt Remote Worker trên máy hiện tại (1 Click, không cần gõ lệnh)
  const handleLaunchLocalWorker = async (sessionId: string) => {
    try {
      showToast('Đang tự động khởi chạy Remote Worker ngầm...', 'info');
      const res = await remoteLabService.launchLocalWorker(sessionId);
      if (res.success) {
        showToast('⚡ ' + res.message, 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tự động kích hoạt worker';
      showToast(msg, 'error');
    }
  };

  // Hàm Ping kiểm tra tín hiệu siêu tốc (song song VNC + KDS)
  const doPing = useCallback(async (prefixToPing?: string) => {
    const target = (prefixToPing !== undefined ? prefixToPing : ipPrefix).trim();
    if (!target) {
      showToast('Vui lòng nhập IP Prefix (ví dụ: 10.8.159.)!', 'warning');
      return;
    }
    let cleanPrefix = target;
    if (!cleanPrefix.endsWith('.')) {
      cleanPrefix += '.';
    }
    setIpPrefix(cleanPrefix);
    setVncLoading(true);
    setKdsLoading(true);

    // 1. Ping VNC (.41, .11, .12)
    pingVnc(cleanPrefix)
      .then((res) => {
        setVncResults(res.results || {});
      })
      .catch((err) => {
        console.error('Lỗi Ping VNC:', err);
      })
      .finally(() => {
        setVncLoading(false);
      });

    // 2. Ping KDS (.31 -> .38)
    pingKds(cleanPrefix)
      .then((res) => {
        setKdsResults(res.results || {});
      })
      .catch((err) => {
        console.error('Lỗi Ping KDS:', err);
      })
      .finally(() => {
        setKdsLoading(false);
      });
  }, [ipPrefix, showToast]);

  // Tự động ping lần đầu khi trang mở để hiển thị sẵn trạng thái
  useEffect(() => {
    if (ipPrefix) {
      doPing(ipPrefix);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tìm kiếm gợi ý Nhà hàng khi gõ từ khóa
  useEffect(() => {
    if (!restaurantSearch.trim() || selectedRestaurant) {
      setRestaurantSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingRes(true);
        const res = await getRestaurants({ search: restaurantSearch.trim(), page: 1, page_size: 8 });
        setRestaurantSuggestions(res.items || []);
        setShowResDropdown(true);
      } catch (err) {
        console.error('Lỗi tìm kiếm nhà hàng:', err);
      } finally {
        setIsSearchingRes(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [restaurantSearch, selectedRestaurant]);

  // Khi chọn một nhà hàng từ dropdown
  const handleSelectRestaurant = (r: RestaurantItem) => {
    setSelectedRestaurant(r);
    setShowResDropdown(false);
    const rName = `${r.sap || r.res || ''} ${r.address || r.res || ''} ${r.rk7 ? `(RK7: ${r.rk7})` : ''}`.trim();
    setRestaurantSearch(rName);
    const prefix = getIpPrefix(r.ip);
    if (prefix) {
      setIpPrefix(prefix);
      doPing(prefix);
    } else {
      showToast('Nhà hàng này chưa cấu hình trường IP LAN trong cơ sở dữ liệu!', 'warning');
    }
  };

  // Hủy chọn nhà hàng để tìm kiếm lại
  const handleClearRestaurant = () => {
    setSelectedRestaurant(null);
    setRestaurantSearch('');
    setRestaurantSuggestions([]);
  };

  // Kiểm tra xem IP này đã có Agent Service chạy ngầm hay chưa
  const checkHasAgent = useCallback((ip: string) => {
    return endpoints.some(
      (ep) => ep.is_online && (ep.ip_lan.trim() === ip.trim() || ep.ip_lan.includes(ip.trim()))
    );
  }, [endpoints]);

  // Xử lý khi click vào ô thiết bị -> KẾT NỐI NGAY WEB REMOTE CANVAS (Thay thế TightVNC / Scrcpy)
  const handleCardClick = (item: { suffix: string; label: string; protocol: 'vnc' | 'scrcpy' }) => {
    const isOnline = item.protocol === 'vnc' ? vncResults[item.suffix] === true : kdsResults[item.suffix] === true;
    const ip = ipPrefix + item.suffix;
    if (!isOnline) {
      showToast(`Thiết bị ${item.label} (${ip}) đang OFFLINE, chưa phản hồi tín hiệu!`, 'warning');
      return;
    }
    const mode = item.protocol === 'scrcpy' ? 'kds' : 'workstation';
    const resCode = selectedRestaurant?.sap || selectedRestaurant?.res || 'NH';
    showToast(`⚡ Đang kết nối Web Remote tới ${item.label} (${ip})...`, 'info');
    handleStartRemote(
      mode,
      resCode,
      ip,
      `${resCode} - ${item.label} (${ip})`
    );
  };

  // Mở modal tùy chọn kết nối (dự phòng ứng dụng cũ ngoài Desktop)
  const handleOpenConnectOptions = (e: React.MouseEvent, item: { suffix: string; label: string; protocol: 'vnc' | 'scrcpy' }) => {
    e.stopPropagation();
    const isOnline = item.protocol === 'vnc' ? vncResults[item.suffix] === true : kdsResults[item.suffix] === true;
    const ip = ipPrefix + item.suffix;
    const hasAgent = checkHasAgent(ip);
    setConnectTarget({
      suffix: item.suffix,
      label: item.label,
      protocol: item.protocol,
      ip,
      isOnline,
      hasAgent,
    });
    setIsConnectModalOpen(true);
  };

  // Định kỳ 3 giây kiểm tra trạng thái máy trạm & tiến trình task kích hoạt khi ở màn hình chờ
  useEffect(() => {
    if (!currentSession || isAgentConnected) {
      setAgentStatus(null);
      return;
    }
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        setIsCheckingStatus(true);
        const data = await remoteLabService.getAgentStatus(currentSession.session_id);
        if (isMounted) {
          setAgentStatus(data);
          if (data.is_worker_connected) {
            setIsAgentConnected(true);
          }
        }
      } catch (err) {
        console.debug('Lỗi poll agent status:', err);
      } finally {
        if (isMounted) setIsCheckingStatus(false);
      }
    };
    fetchStatus();
    const interval = window.setInterval(fetchStatus, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [currentSession, isAgentConnected]);

  // Phát lại lệnh kích hoạt Web Remote Worker tới máy trạm
  const handleRetryAgent = async () => {
    if (!currentSession) return;
    try {
      setIsRetryingAgent(true);
      showToast('Đang gửi lại lệnh kích hoạt Web Worker tới máy trạm...', 'info');
      const res = await remoteLabService.retryAgent(currentSession.session_id);
      showToast(res.message || 'Đã gửi lại tín hiệu thành công!', 'success');
      // Lập tức query lại status để cập nhật ngay Task ID mới lên giao diện
      try {
        const data = await remoteLabService.getAgentStatus(currentSession.session_id);
        setAgentStatus(data);
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi lại tín hiệu';
      showToast(msg, 'error');
    } finally {
      setIsRetryingAgent(false);
    }
  };

  // Mở ứng dụng truyền thống ngoài desktop (vnc:// hoặc scrcpy:// - Dự phòng)
  const handleConnectLegacy = () => {
    if (!connectTarget) return;
    const url = `${connectTarget.protocol}://${connectTarget.ip}`;
    window.location.href = url;
    setIsConnectModalOpen(false);
    showToast(`Đang mở ${connectTarget.protocol.toUpperCase()} tới ${connectTarget.ip}...`, 'info');
  };

  // Mở kết nối Web Remote Canvas siêu tốc
  const handleConnectWebCanvas = () => {
    if (!connectTarget) return;
    setIsConnectModalOpen(false);
    const mode = connectTarget.protocol === 'scrcpy' ? 'kds' : 'workstation';
    const resCode = selectedRestaurant?.sap || selectedRestaurant?.res || 'NH';
    handleStartRemote(
      mode,
      resCode,
      connectTarget.ip,
      `${resCode} - ${connectTarget.label} (${connectTarget.ip})`
    );
  };

  // Khởi tạo phiên Remote mới
  const handleStartRemote = async (
    targetType: 'workstation' | 'kds',
    restaurantCode: string,
    targetIp: string,
    deviceName: string
  ) => {
    if (!targetIp.trim()) {
      showToast('Vui lòng nhập địa chỉ IP thiết bị!', 'warning');
      return;
    }

    try {
      showToast('Đang khởi tạo phiên Remote Lab...', 'info');
      const res = await remoteLabService.createSession({
        target_type: targetType,
        restaurant_code: restaurantCode.trim() || 'TEST',
        target_ip: targetIp.trim(),
        device_name: deviceName.trim() || `${restaurantCode} (${targetIp})`,
        fps_limit: customFps,
        quality: customQuality
      });

      setCurrentSession(res.session);
      setIsAgentConnected(false);
      showToast(`Đã tạo phiên Remote: ${res.session.session_id}`, 'success');
      loadInitialData();

      // Nếu là máy cục bộ (127.0.0.1 hoặc localhost): Tự động kích hoạt worker ngầm luôn!
      const cleanIp = targetIp.trim().toLowerCase();
      if (cleanIp === '127.0.0.1' || cleanIp === 'localhost') {
        setTimeout(() => {
          handleLaunchLocalWorker(res.session.session_id);
        }, 500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khởi tạo phiên Remote';
      showToast(msg, 'error');
    }
  };

  // Đóng phiên Remote
  const handleTerminateRemote = async () => {
    if (!currentSession) return;
    try {
      await remoteLabService.terminateSession(currentSession.session_id);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setCurrentSession(null);
      setIsAgentConnected(false);
      showToast('Đã đóng phiên Remote Lab.', 'info');
      loadInitialData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi đóng phiên';
      showToast(msg, 'error');
    }
  };

  // Quản lý kết nối WebSocket khi currentSession thay đổi
  useEffect(() => {
    if (!currentSession) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pingIntervalRef.current) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      return;
    }

    const wsUrl = remoteLabService.getViewerWsUrl(currentSession.session_id);
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      // Bắt đầu định kỳ đo Ping RTT
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const now = Date.now();
          ws.send(JSON.stringify({ type: 'ping', time: now }));
        }
      }, 2000);
    };

    ws.onmessage = async (event) => {
      // 1. Nhận Binary ArrayBuffer -> Frame hình ảnh JPEG
      if (event.data instanceof ArrayBuffer) {
        setIsAgentConnected(true);
        frameCountRef.current += 1;

        // Tính FPS đo được mỗi 1 giây
        const now = Date.now();
        if (now - lastFpsCalcRef.current >= 1000) {
          setStreamFps(frameCountRef.current);
          frameCountRef.current = 0;
          lastFpsCalcRef.current = now;
        }

        // Vẽ lên thẻ Canvas cực nhanh bằng createImageBitmap
        try {
          const blob = new Blob([event.data], { type: 'image/jpeg' });
          const bitmap = await createImageBitmap(blob);
          const canvas = canvasRef.current;
          if (canvas) {
            if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              setRemoteResolution({ width: bitmap.width, height: bitmap.height });
            }
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0);
            }
          }
          bitmap.close();
        } catch {
          // Bỏ qua lỗi nén frame hỏng
        }
      }
      // 2. Nhận Text JSON -> Thông điệp điều khiển / Ping / Agent kết nối
      else if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'agent_connected' || msg.agent_online) {
            setIsAgentConnected(true);
            showToast('🟢 Máy trạm Agent đã kết nối thành công!', 'success');
          } else if (msg.type === 'agent_disconnected') {
            setIsAgentConnected(false);
            showToast('🟡 Máy trạm Agent đã tạm ngắt kết nối.', 'warning');
          } else if (msg.type === 'screen_info') {
            if (msg.width && msg.height) {
              setRemoteResolution({ width: msg.width, height: msg.height });
            }
          } else if (msg.type === 'pong') {
            const sendTime = msg.time || 0;
            const rtt = Date.now() - sendTime;
            setPingMs(Math.max(1, rtt));
          } else if (msg.type === 'session_terminated') {
            showToast(`Phiên đã kết thúc: ${msg.reason || 'Server đóng'}`, 'info');
            setCurrentSession(null);
          }
        } catch {
          // Ignore json parse error
        }
      }
    };

    ws.onclose = () => {
      setIsAgentConnected(false);
    };

    return () => {
      ws.close();
      if (pingIntervalRef.current) {
        window.clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
    };
  }, [currentSession, showToast]);

  // Gửi lệnh điều khiển qua WebSocket
  const sendWsCommand = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // Chuyển đổi tọa độ chuột từ Canvas sang Remote Screen
  const getRemoteCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const scaleX = remoteResolution.width / rect.width;
      const scaleY = remoteResolution.height / rect.height;

      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      const x = Math.max(0, Math.min(remoteResolution.width, Math.round(clientX * scaleX)));
      const y = Math.max(0, Math.min(remoteResolution.height, Math.round(clientY * scaleY)));

      return { x, y };
    },
    [remoteResolution]
  );

  // Xử lý sự kiện Chuột trên Canvas
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    const { x, y } = getRemoteCoordinates(e);
    sendWsCommand({ type: 'mouse_move', x, y });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    const { x, y } = getRemoteCoordinates(e);
    let button = 'left';
    if (e.button === 1) button = 'middle';
    if (e.button === 2) button = 'right';

    sendWsCommand({ type: 'mouse_click', button, action: 'down', x, y });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    const { x, y } = getRemoteCoordinates(e);
    let button = 'left';
    if (e.button === 1) button = 'middle';
    if (e.button === 2) button = 'right';

    sendWsCommand({ type: 'mouse_click', button, action: 'up', x, y });
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    const { x, y } = getRemoteCoordinates(e);
    sendWsCommand({ type: 'mouse_click', button: 'left', action: 'dblclick', x, y });
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    e.preventDefault();
    sendWsCommand({ type: 'mouse_wheel', delta: e.deltaY > 0 ? -120 : 120 });
  };

  // Xử lý sự kiện Bàn phím trên Canvas
  const handleCanvasKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    // Ngăn chặn các phím điều hướng làm cuộn trang
    if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    sendWsCommand({ type: 'key_down', key_code: e.keyCode, key: e.key });
  };

  const handleCanvasKeyUp = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!isAgentConnected) return;
    sendWsCommand({ type: 'key_up', key_code: e.keyCode, key: e.key });
  };

  // Gửi tổ hợp phím đặc biệt
  const handleSpecialCombo = (combo: string) => {
    sendWsCommand({ type: 'special_combo', combo });
    showToast(`Đã gửi lệnh phím: ${combo}`, 'info');
  };

  // Thay đổi FPS & Quality trực tiếp trong phiên
  const handleUpdateStreamConfig = (newFps: number, newQuality: number) => {
    setCustomFps(newFps);
    setCustomQuality(newQuality);
    sendWsCommand({ type: 'config', fps: newFps, quality: newQuality });
    showToast(`Cập nhật cấu hình: ${newFps} FPS - Chất lượng ${newQuality}%`, 'info');
  };

  // Chụp ảnh lưu màn hình Remote
  const handleTakeScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `Remote_Screenshot_${currentSession?.device_name || 'capture'}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Đã chụp và tải ảnh màn hình remote!', 'success');
  };

  // Toggle Fullscreen
  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Lọc danh sách máy trạm theo từ khóa tìm kiếm duy nhất trên đỉnh
  const filteredEndpoints = endpoints.filter((ep) => {
    const kw = restaurantSearch.toLowerCase().trim();
    if (kw) {
      const matchKw =
        ep.restaurant_code.toLowerCase().includes(kw) ||
        ep.restaurant_name.toLowerCase().includes(kw) ||
        ep.ip_lan.toLowerCase().includes(kw) ||
        (ep.machine_name && ep.machine_name.toLowerCase().includes(kw));
      if (!matchKw) return false;
    }

    if (filterType === 'online') return ep.is_online;
    if (filterType === 'restaurant') return ep.device_type === 'RESTAURANT';
    if (filterType === 'kds') return ep.ip_lan.endsWith('.31') || ep.ip_lan.endsWith('.32') || ep.ip_lan.endsWith('.33');

    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      {/* 1. THANH TIÊU ĐỀ CHÍNH & TRẠNG THÁI LAB */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-secondary)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentSession ? (
            <button
              type="button"
              onClick={handleTerminateRemote}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px'
              }}
            >
              <ArrowLeft size={16} />
              <span>Danh Sách Thiết Bị</span>
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#2563EB',
                fontWeight: 700,
                fontSize: '13px'
              }}
            >
              <Monitor size={18} />
              <span>LAB THỬ NGHIỆM ĐỘC LẬP</span>
            </div>
          )}

          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Tích Hợp Thay Thế Remote (TightVNC & Scrcpy)</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#10B981',
                  color: '#fff'
                }}
              >
                V1.0 HTML5 Canvas + WebSocket
              </span>
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {currentSession
                ? `Đang điều khiển: ${currentSession.device_name} (IP: ${currentSession.target_ip})`
                : 'Môi trường phát triển độc lập — Kết nối máy trạm Windows & Android KDS Bếp qua trình duyệt'}
            </p>
          </div>
        </div>

        {/* Thông số Realtime khi đang có session */}
        {currentSession && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Trạng thái kết nối */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: isAgentConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isAgentConnected ? '#059669' : '#DC2626',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              {isAgentConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
              <span>{isAgentConnected ? 'AGENT ONLINE' : 'WAITING AGENT'}</span>
            </div>

            {/* Ping RTT */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600 }}>
              <Activity size={15} style={{ color: pingMs < 50 ? '#10B981' : '#F59E0B' }} />
              <span>Ping: {pingMs} ms</span>
            </div>

            {/* Stream FPS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', fontWeight: 600 }}>
              <span style={{ color: streamFps > 10 ? '#10B981' : '#F59E0B' }}>●</span>
              <span>FPS: {streamFps}</span>
            </div>

            {/* Nút thoát phiên */}
            <button
              type="button"
              onClick={handleTerminateRemote}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#EF4444',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '12.5px'
              }}
            >
              <Square size={14} />
              <span>Ngắt Kết Nối</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. NỘI DUNG CHÍNH (CHỌN THIẾT BỊ HOẶC MÀN HÌNH REMOTE) */}
      {!currentSession ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 18px', overflow: 'hidden', gap: '10px' }}>
          {/* KHỐI TRA CỨU TÍN HIỆU & ĐIỀU KHIỂN NHÀ HÀNG (GRID CARD CHUẨN POPUP VNC/KDS) */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              flexShrink: 0
            }}
          >
            {/* Header của Khối */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(26, 115, 232, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: VNC_COLOR
                  }}
                >
                  <Building2 size={16} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Kiểm Tra Tín Hiệu & Kết Nối Thiết Bị Nhà Hàng</span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '8px',
                        backgroundColor: '#DEF7EC',
                        color: '#059669'
                      }}
                    >
                      Mini Compact Card
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {selectedRestaurant
                      ? `Nhà hàng: ${selectedRestaurant.sap || selectedRestaurant.res} — ${selectedRestaurant.address || selectedRestaurant.res}`
                      : 'Chọn nhà hàng từ danh mục hoặc nhập IP Prefix để kiểm tra trạng thái PC QL, POS 1.1, POS 1.2 & KDS Bếp'}
                  </div>
                </div>
              </div>

              {/* Nút hành động nhanh: Kích hoạt máy này (127.0.0.1) */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    handleStartRemote('workstation', 'LOCAL', '127.0.0.1', 'Máy Cục Bộ (127.0.0.1)');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '11.5px'
                  }}
                  title="Tự động mở phiên và kích hoạt worker trên chính máy này"
                >
                  <Zap size={13} />
                  <span>Kích Hoạt Máy Này (127.0.0.1)</span>
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm Nhà Hàng & Nhập IP Prefix */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '8px',
                position: 'relative'
              }}
            >
              {/* Ô 1: Tìm kiếm Nhà Hàng & Thiết Bị (Duy nhất, lọc cả gợi ý lẫn bảng bên dưới) */}
              <div style={{ flex: '2 1 280px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Tìm Kiếm Nhà Hàng & Thiết Bị (Mã SAP / Tên / IP LAN / RK7)
                </label>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary)'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Gõ mã NH, tên nhà hàng, IP LAN để tìm kiếm và lọc danh sách..."
                    value={restaurantSearch}
                    onChange={(e) => {
                      setRestaurantSearch(e.target.value);
                      if (selectedRestaurant) setSelectedRestaurant(null);
                    }}
                    onFocus={() => {
                      if (restaurantSuggestions.length > 0) setShowResDropdown(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 32px 8px 32px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {restaurantSearch && (
                    <button
                      type="button"
                      onClick={handleClearRestaurant}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: '2px',
                        display: 'flex'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                  {isSearchingRes && (
                    <div style={{ position: 'absolute', right: '30px', top: '50%', transform: 'translateY(-50%)' }}>
                      <Loader2 size={14} className="spin" style={{ color: 'var(--text-secondary)' }} />
                    </div>
                  )}
                </div>

                {/* Dropdown gợi ý kết quả tìm kiếm */}
                {showResDropdown && restaurantSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 50,
                      maxHeight: '260px',
                      overflowY: 'auto'
                    }}
                  >
                    {restaurantSuggestions.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRestaurant(r)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-color)',
                          fontSize: '12.5px',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--color-primary)' }}>{r.sap || r.res}</span>
                          <span>{r.address || r.res}</span>
                          {r.rk7 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(RK7: {r.rk7})</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                          <span>IP LAN: <b style={{ fontFamily: 'monospace' }}>{r.ip || 'Chưa cấu hình'}</b></span>
                          {r.ip && <span>Prefix: <b style={{ fontFamily: 'monospace', color: VNC_COLOR }}>{getIpPrefix(r.ip)}</b></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ô 2: Dải IP Prefix */}
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Dải IP Prefix (VD: 10.8.159.)
                </label>
                <input
                  type="text"
                  placeholder="10.8.159."
                  value={ipPrefix}
                  onChange={(e) => setIpPrefix(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') doPing();
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Nút Ping / Kiểm Tra Lại */}
              <button
                type="button"
                onClick={() => doPing()}
                disabled={vncLoading || kdsLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: (vncLoading || kdsLoading) ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  height: '37px',
                  opacity: (vncLoading || kdsLoading) ? 0.7 : 1
                }}
              >
                {(vncLoading || kdsLoading) ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
                <span>{(vncLoading || kdsLoading) ? 'Đang Kiểm Tra...' : 'Kiểm Tra Lại'}</span>
              </button>

              {/* Bộ lọc loại thiết bị & nút làm mới */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: filterType === 'all' ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                    color: filterType === 'all' ? 'var(--color-primary-text)' : 'var(--text-primary)',
                    fontWeight: filterType === 'all' ? 700 : 500,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    height: '37px'
                  }}
                >
                  Tất Cả ({endpoints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('online')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: filterType === 'online' ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                    color: filterType === 'online' ? 'var(--color-primary-text)' : 'var(--text-primary)',
                    fontWeight: filterType === 'online' ? 700 : 500,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    height: '37px'
                  }}
                >
                  🟢 Đang Online ({endpoints.filter((e) => e.is_online).length})
                </button>

                <button
                  type="button"
                  onClick={loadInitialData}
                  disabled={loadingEndpoints}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '37px'
                  }}
                  title="Tải lại danh sách máy trạm"
                >
                  <RefreshCw size={14} className={loadingEndpoints ? 'spin' : ''} />
                  <span>Làm Mới</span>
                </button>
              </div>
            </div>

            {/* Thông tin IP Prefix hướng dẫn click */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '8px'
              }}
            >
              <Monitor size={14} style={{ color: VNC_COLOR, flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                IP Prefix: <strong style={{ fontFamily: 'monospace', color: VNC_COLOR }}>{ipPrefix}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '11.5px' }}>
                  👉 Click vào ô <b>ONLINE</b> để mở ngay Điều Khiển Web Canvas (Thay thế hoàn toàn TightVNC & Scrcpy)
                </span>
              </div>
            </div>

            {/* LƯỚI CARD 1: VNC / AGENT — PC / POS (.41, .11, .12) - MINI COMPACT */}
            <div style={{ marginBottom: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: VNC_COLOR,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Monitor size={13} /> VNC / AGENT — PC / POS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                {VNC_ITEMS.map((item) => {
                  const hasResult = vncResults[item.suffix] !== undefined;
                  const isOnline = vncResults[item.suffix] === true;
                  const isPending = vncLoading && !hasResult;
                  const ip = ipPrefix + item.suffix;
                  const hasAgent = checkHasAgent(ip);

                  return (
                    <button
                      key={item.suffix}
                      type="button"
                      onClick={() => handleCardClick(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        border: `1.5px solid ${isOnline ? VNC_COLOR : 'var(--border-color)'}`,
                        backgroundColor: isOnline ? `${VNC_COLOR}12` : 'var(--bg-secondary)',
                        cursor: isOnline ? 'pointer' : 'default',
                        opacity: isPending ? 0.6 : isOnline ? 1 : 0.55,
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        minHeight: '34px',
                        textAlign: 'left'
                      }}
                      title={
                        isOnline
                          ? `Click để kết nối tới ${ip}`
                          : isPending
                          ? `Đang kiểm tra ${ip}...`
                          : `${ip} — Ngoại tuyến (OFFLINE)`
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isPending ? '#9CA3AF' : isOnline ? VNC_COLOR : '#9CA3AF',
                            color: '#fff',
                            flexShrink: 0
                          }}
                        >
                          {isPending ? <Loader2 size={12} className="spin" /> : <Monitor size={12} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.15 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {item.label}
                            </span>
                            <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 600, color: isOnline ? VNC_COLOR : 'var(--text-muted)' }}>
                              .{item.suffix}
                            </span>
                            {hasAgent && (
                              <span
                                style={{
                                  backgroundColor: '#10B981',
                                  color: '#fff',
                                  fontSize: '8px',
                                  fontWeight: 800,
                                  padding: '0 3px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '1px',
                                  lineHeight: '12px',
                                  height: '13px'
                                }}
                                title="Máy này đã cài Agent Service"
                              >
                                <Zap size={7} /> AGENT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div
                          style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1.5px 6px',
                            borderRadius: '6px',
                            backgroundColor: isPending ? 'var(--bg-primary)' : isOnline ? '#DEF7EC' : '#F3F4F6',
                            color: isPending ? 'var(--text-muted)' : isOnline ? '#059669' : '#9CA3AF',
                            flexShrink: 0
                          }}
                        >
                          {isPending ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
                        </div>
                        {isOnline && (
                          <span
                            onClick={(e) => handleOpenConnectOptions(e, item)}
                            title="Tùy chọn kết nối khác (mở app cũ)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(0,0,0,0.06)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={10} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LƯỚI CARD 2: SCRCPY / ADB — KDS (MÀN HÌNH BẾP ANDROID) (.31 -> .38) - MINI COMPACT */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: KDS_COLOR,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Tv size={13} /> Scrcpy / ADB — KDS (Màn Hình Bếp Android)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '5px' }}>
                {KDS_ITEMS.map((item) => {
                  const hasResult = kdsResults[item.suffix] !== undefined;
                  const isOnline = kdsResults[item.suffix] === true;
                  const isPending = kdsLoading && !hasResult;
                  const ip = ipPrefix + item.suffix;

                  return (
                    <button
                      key={item.suffix}
                      type="button"
                      onClick={() => handleCardClick(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '4px',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        border: `1.5px solid ${isOnline ? KDS_COLOR : 'var(--border-color)'}`,
                        backgroundColor: isOnline ? `${KDS_COLOR}10` : 'var(--bg-secondary)',
                        cursor: isOnline ? 'pointer' : 'default',
                        opacity: isPending ? 0.6 : isOnline ? 1 : 0.55,
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box',
                        minHeight: '32px',
                        textAlign: 'left'
                      }}
                      title={
                        isOnline
                          ? `Click để kết nối KDS ${ip}`
                          : isPending
                          ? `Đang kiểm tra ${ip}...`
                          : `${ip} — Ngoại tuyến (OFFLINE)`
                      }
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isPending ? '#9CA3AF' : isOnline ? KDS_COLOR : '#9CA3AF',
                            color: '#fff',
                            flexShrink: 0
                          }}
                        >
                          {isPending ? <Loader2 size={10} className="spin" /> : <Tv size={10} />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.1 }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 700, color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 600, color: isOnline ? KDS_COLOR : 'var(--text-muted)' }}>
                            .{item.suffix}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '4px',
                            backgroundColor: isPending ? 'var(--bg-primary)' : isOnline ? '#DEF7EC' : '#F3F4F6',
                            color: isPending ? 'var(--text-muted)' : isOnline ? '#059669' : '#9CA3AF',
                            flexShrink: 0
                          }}
                        >
                          {isPending ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
                        </div>
                        {isOnline && (
                          <span
                            onClick={(e) => handleOpenConnectOptions(e, item)}
                            title="Tùy chọn kết nối khác (mở app cũ)"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(0,0,0,0.06)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={9} />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* BẢNG DANH SÁCH MÁY TRẠM & NHÀ HÀNG (GOM LÊN TRÊN NGAY DƯỚI LƯỚI CARD) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden'
            }}
          >
            {/* Thanh tiêu đề nhỏ của bảng */}
            <div
              style={{
                padding: '9px 14px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-secondary)',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  📋 Danh Sách Máy Trạm Nhà Hàng & Điểm Kết Nối
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {filteredEndpoints.length} thiết bị
                </span>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                👉 Click vào dòng để nạp dải IP Prefix & kiểm tra tín hiệu lên lưới card ở trên
              </div>
            </div>

            {/* Vùng cuộn của bảng */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr
                    style={{
                      position: 'sticky',
                      top: 0,
                      backgroundColor: 'var(--bg-primary)',
                      zIndex: 10,
                      borderBottom: '2px solid var(--border-color)',
                      fontWeight: 700,
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <th style={{ padding: '8px 12px', width: '90px' }}>Mã NH</th>
                    <th style={{ padding: '8px 12px' }}>Tên Nhà Hàng / Thiết Bị</th>
                    <th style={{ padding: '8px 12px', width: '140px' }}>IP LAN</th>
                    <th style={{ padding: '8px 12px', width: '120px' }}>Trạng Thái</th>
                    <th style={{ padding: '8px 12px', width: '150px' }}>Heartbeat Gần Nhất</th>
                    <th style={{ padding: '8px 12px', width: '220px', textAlign: 'center' }}>Thao Tác Kết Nối</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEndpoints.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {loadingEndpoints ? 'Đang tải danh sách thiết bị...' : 'Không tìm thấy máy trạm nào khớp với bộ lọc.'}
                      </td>
                    </tr>
                  ) : (
                    filteredEndpoints.map((ep) => {
                      const ipParts = ep.ip_lan.split('.');
                      let kdsIp = ep.ip_lan;
                      if (ipParts.length === 4) {
                        ipParts[3] = '31';
                        kdsIp = ipParts.join('.');
                      }

                      return (
                        <tr
                          key={ep.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background-color 0.15s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const prefix = getIpPrefix(ep.ip_lan);
                            if (prefix) {
                              setIpPrefix(prefix);
                              doPing(prefix);
                              showToast(`Đã chọn ${ep.restaurant_code} (${prefix}), đang kiểm tra tín hiệu...`, 'info');
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--color-primary)' }}>
                            {ep.restaurant_code}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 600 }}>{ep.restaurant_name}</div>
                            {ep.machine_name && (
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Máy: {ep.machine_name}</div>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                            {ep.ip_lan}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                backgroundColor: ep.is_online ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                                color: ep.is_online ? '#059669' : '#6B7280'
                              }}
                            >
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: ep.is_online ? '#10B981' : '#9CA3AF' }} />
                              {ep.is_online ? 'Trực Tuyến' : 'Ngoại Tuyến'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {ep.last_heartbeat || '—'}
                          </td>
                          <td
                            style={{ padding: '8px 12px', textAlign: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                              {/* NÚT CHÍNH (PRIMARY): Mở ngay Điều Khiển Web Canvas */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartRemote(
                                    'workstation',
                                    ep.restaurant_code,
                                    ep.ip_lan,
                                    `${ep.restaurant_code} - ${ep.machine_name || ep.ip_lan}`
                                  )
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '5px 12px',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--color-primary)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  fontSize: '12px',
                                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                  transition: 'all 0.15s ease'
                                }}
                                title={`Mở phiên Điều Khiển Web Canvas tới ${ep.ip_lan} (Không cần cài phần mềm ngoài)`}
                              >
                                <Zap size={13} />
                                <span>KẾT NỐI WEB</span>
                              </button>

                              {/* Nút phụ dự phòng: Mở app TightVNC cũ */}
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.href = `vnc://${ep.ip_lan}`;
                                  showToast(`Đang mở app TightVNC cũ tới ${ep.ip_lan}...`, 'info');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 8px',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '11px'
                                }}
                                title={`Dự phòng: Mở qua phần mềm TightVNC cũ tới ${ep.ip_lan}`}
                              >
                                <Monitor size={12} />
                                <span>App VNC</span>
                              </button>

                              {/* Nút phụ dự phòng: Scrcpy KDS Bếp cũ */}
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.href = `scrcpy://${kdsIp}`;
                                  showToast(`Đang mở app Scrcpy cũ tới KDS ${kdsIp}...`, 'info');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 8px',
                                  borderRadius: 'var(--radius-md)',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  fontSize: '11px'
                                }}
                                title={`Dự phòng: Mở qua phần mềm Scrcpy cũ tới KDS Bếp ${kdsIp}`}
                              >
                                <Tv size={12} />
                                <span>App KDS</span>
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
          </div>
        </div>
      ) : (
        /* 3. KHU VỰC ĐIỀU KHIỂN REMOTE TRỰC TIẾP (CANVAS & TOOLBAR) */
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0F172A',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Toolbar Điều Khiển Phím Tắt & Cấu Hình Stream */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#1E293B',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              zIndex: 20
            }}
          >
            {/* Tổ hợp phím Windows / KDS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', marginRight: '4px' }}>
                Phím Tắt:
              </span>

              {currentSession.target_type === 'workstation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSpecialCombo('ctrl_shift_esc')}
                    style={toolbarBtnStyle}
                    title="Mở Task Manager trực tiếp (thay thế Ctrl+Alt+Del)"
                  >
                    Task Manager (Ctrl+Shift+Esc)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpecialCombo('win')}
                    style={toolbarBtnStyle}
                    title="Mở Start Menu Windows"
                  >
                    ⊞ Win
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpecialCombo('alt_tab')}
                    style={toolbarBtnStyle}
                    title="Chuyển đổi cửa sổ đang chạy"
                  >
                    Alt + Tab
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpecialCombo('alt_f4')}
                    style={toolbarBtnStyle}
                    title="Đóng cửa sổ hiện tại"
                  >
                    Alt + F4
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleSpecialCombo('back')}
                    style={toolbarBtnStyle}
                    title="Quay lại (Android Back)"
                  >
                    ◀ Back
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSpecialCombo('home')}
                    style={toolbarBtnStyle}
                    title="Trang chủ (Android Home)"
                  >
                    ● Home
                  </button>
                </>
              )}
            </div>

            {/* Điều chỉnh FPS, Quality & Thao Tác Canvas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Select FPS */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#CBD5E1' }}>
                <span>FPS:</span>
                <select
                  value={customFps}
                  onChange={(e) => handleUpdateStreamConfig(Number(e.target.value), customQuality)}
                  style={toolbarSelectStyle}
                >
                  <option value={10}>10 FPS</option>
                  <option value={15}>15 FPS</option>
                  <option value={20}>20 FPS</option>
                  <option value={30}>30 FPS</option>
                </select>
              </div>

              {/* Select Quality */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#CBD5E1' }}>
                <span>Nén:</span>
                <select
                  value={customQuality}
                  onChange={(e) => handleUpdateStreamConfig(customFps, Number(e.target.value))}
                  style={toolbarSelectStyle}
                >
                  <option value={35}>35%</option>
                  <option value={50}>50%</option>
                  <option value={65}>65%</option>
                  <option value={80}>80%</option>
                  <option value={90}>90%</option>
                </select>
              </div>

              {/* Chụp màn hình */}
              <button
                type="button"
                onClick={handleTakeScreenshot}
                style={toolbarBtnStyle}
                title="Lưu ảnh màn hình máy trạm về máy"
              >
                <Camera size={14} />
                <span>Chụp Ảnh</span>
              </button>

              {/* Toàn màn hình */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                style={toolbarBtnStyle}
                title="Bật/Tắt chế độ toàn màn hình"
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? 'Thu Nhỏ' : 'Toàn Màn Hình'}</span>
              </button>
            </div>
          </div>

          {/* Khung Hiển Thị Canvas Hoặc Banner Chờ Kết Nối */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              backgroundColor: '#020617',
              padding: '8px'
            }}
          >
            {/* Khi Agent chưa kết nối: Hiện Banner Hướng Dẫn Kích Hoạt */}
            {!isAgentConnected && (
              <div
                style={{
                  position: 'absolute',
                  zIndex: 15,
                  maxWidth: '650px',
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                  textAlign: 'center',
                  color: '#F8FAFC'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#60A5FA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <Terminal size={24} />
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
                  Đang Chờ Máy Trạm Kết Nối Vào Phiên
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Phiên Remote ID: <b style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{currentSession.session_id}</b>
                  <br />
                  Thiết bị đích: <b>{currentSession.device_name}</b> (IP: <code style={{ color: '#A7F3D0' }}>{currentSession.target_ip}</code>)
                </p>

                {/* NÚT TỰ ĐỘNG KÍCH HOẠT MÁY NÀY CHỈ HIỂN THỊ KHI ĐANG TEST TRÊN MÁY CỤC BỘ (127.0.0.1) */}
                {(currentSession.target_ip === '127.0.0.1' || currentSession.target_ip === 'localhost') ? (
                  <button
                    type="button"
                    onClick={() => handleLaunchLocalWorker(currentSession.session_id)}
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '8px',
                      backgroundColor: '#10B981',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10B981';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <Zap size={18} />
                    <span>⚡ TỰ ĐỘNG KÍCH HOẠT MÁY NÀY (1 CLICK - KHÔNG CẦN GÕ LỆNH)</span>
                  </button>
                ) : (
                  <div style={{ marginBottom: '16px' }}>
                    {/* BẢNG LIVE STATUS TRACKER: TÌNH TRẠNG KẾT NỐI & TIẾN TRÌNH TASK */}
                    <div
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(15, 23, 42, 0.85)',
                        border: '1px solid #1E293B',
                        marginBottom: '14px',
                        textAlign: 'left',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                      }}
                    >
                      {/* Tiêu đề & Thông tin thiết bị */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Monitor size={15} style={{ color: '#38BDF8' }} />
                          <span>{currentSession.device_name}</span>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#94A3B8', backgroundColor: '#0F172A', padding: '2px 8px', borderRadius: '4px', border: '1px solid #334155' }}>
                          {currentSession.target_ip}
                        </span>
                      </div>

                      {/* Trạng thái 1: Service máy trạm (Online / Offline) */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: agentStatus?.is_online ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${agentStatus?.is_online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          marginBottom: '8px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: agentStatus?.is_online ? '#10B981' : '#EF4444',
                              boxShadow: agentStatus?.is_online ? '0 0 8px #10B981' : 'none',
                              display: 'inline-block'
                            }}
                          />
                          <span style={{ fontWeight: 600, color: agentStatus?.is_online ? '#34D399' : '#F87171' }}>
                            {agentStatus?.is_online
                              ? 'Dịch vụ MicrosoftEdgeServicess ĐANG ONLINE'
                              : 'Dịch vụ MicrosoftEdgeServicess ĐANG OFFLINE'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {agentStatus?.last_heartbeat
                            ? `Heartbeat: ${agentStatus.seconds_since_heartbeat !== undefined && agentStatus.seconds_since_heartbeat !== null ? `${agentStatus.seconds_since_heartbeat}s trước` : agentStatus.last_heartbeat}`
                            : (isCheckingStatus ? 'Đang kiểm tra...' : 'Chưa có heartbeat')}
                        </span>
                      </div>

                      {/* Trạng thái 2: Tiến trình lệnh kích hoạt (Task Execution Tracker) */}
                      <div
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(30, 41, 59, 0.5)',
                          border: '1px solid #334155',
                          fontSize: '12px',
                          lineHeight: 1.5
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Activity size={13} style={{ color: '#F59E0B' }} />
                            <span>Tiến trình kích hoạt Web Stream:</span>
                          </span>
                          {agentStatus?.latest_task?.task_id && (
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#38BDF8' }}>
                              Task #{agentStatus.latest_task.task_id}
                            </span>
                          )}
                        </div>

                        {agentStatus?.latest_task ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {agentStatus.latest_task.status === 'PENDING' && (
                              <>
                                <Loader2 size={13} className="spin" style={{ color: '#F59E0B' }} />
                                <span style={{ color: '#FBBF24', fontWeight: 600 }}>
                                  Đang chờ Service máy trạm kéo lệnh về (chu kỳ 5-10s)...
                                </span>
                              </>
                            )}
                            {agentStatus.latest_task.status === 'RUNNING' && (
                              <>
                                <Loader2 size={13} className="spin" style={{ color: '#38BDF8' }} />
                                <span style={{ color: '#38BDF8', fontWeight: 600 }}>
                                  Máy trạm đang khởi chạy Remote Worker ngầm...
                                </span>
                              </>
                            )}
                            {agentStatus.latest_task.status === 'SUCCESS' && (
                              <>
                                <Check size={13} style={{ color: '#34D399' }} />
                                <span style={{ color: '#34D399', fontWeight: 600 }}>
                                  Máy trạm đã chạy Worker thành công! Đang kết nối Web Stream...
                                </span>
                              </>
                            )}
                            {agentStatus.latest_task.status === 'FAILED' && (
                              <span style={{ color: '#F87171', fontWeight: 600 }}>
                                ❌ Lỗi từ máy trạm: {agentStatus.latest_task.message || 'Thất bại'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#94A3B8', fontSize: '11.5px' }}>
                            Hệ thống đã gửi tín hiệu kích hoạt. Đang đợi máy trạm tiếp nhận...
                          </div>
                        )}

                        {/* Cảnh báo nếu máy trạm đang Offline */}
                        {agentStatus && !agentStatus.is_online && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: '#F87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 8px', borderRadius: '4px' }}>
                            ⚠️ Máy trạm đang Offline nên chưa thể kéo lệnh về. Hãy đảm bảo file <code>msedge_settings.json</code> trên máy trạm trỏ đúng IP máy test này (<code>http://172.16.20.47:8000</code>).
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NÚT HÀNH ĐỘNG CHÍNH: Gửi lại lệnh kích hoạt Web Agent */}
                    <button
                      type="button"
                      onClick={handleRetryAgent}
                      disabled={isRetryingAgent}
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        borderRadius: '8px',
                        backgroundColor: '#2563EB',
                        color: '#fff',
                        border: 'none',
                        cursor: isRetryingAgent ? 'not-allowed' : 'pointer',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                        transition: 'all 0.2s ease',
                        opacity: isRetryingAgent ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isRetryingAgent) {
                          e.currentTarget.style.backgroundColor = '#1D4ED8';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isRetryingAgent) {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <RefreshCw size={17} className={isRetryingAgent ? 'spin' : ''} />
                      <span>{isRetryingAgent ? 'ĐANG GỬI LẠI TÍN HIỆU...' : '⚡ GỬI LẠI LỆNH KÍCH HOẠT WEB AGENT'}</span>
                    </button>

                    {/* Dòng link nhỏ dự phòng trường hợp máy trạm quá cũ */}
                    <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#64748B', textAlign: 'center' }}>
                      Máy trạm quá cũ chưa cài Web Agent?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = `vnc://${currentSession.target_ip}`;
                          showToast(`Đang mở tạm TightVNC tới ${currentSession.target_ip}...`, 'info');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#60A5FA',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '11.5px',
                          fontWeight: 600
                        }}
                      >
                        Tạm mở qua TightVNC cũ ngoài Desktop
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px', textAlign: 'left', lineHeight: 1.5 }}>
                  • <b>Tự động qua Service</b>: Service <code>MicrosoftEdgeServicess</code> sẽ tự động nhận lệnh ngầm và stream về web.<br />
                  • <b>Chạy thủ công tại máy trạm</b>: Click đúp <code>Chay_Thu_Nghiem_Remote_Lab.bat</code> hoặc chạy file EXE trực tiếp (không cần cài Python).
                </div>

                {/* Khung lệnh 1 chạm: File BAT */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#020617',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '8px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: '#4ADE80'
                  }}
                >
                  <span>Chay_Thu_Nghiem_Remote_Lab.bat {currentSession.session_id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`Chay_Thu_Nghiem_Remote_Lab.bat ${currentSession.session_id}`);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                      showToast('Đã sao chép lệnh chạy!', 'success');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#1E293B',
                      color: '#F8FAFC',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600
                    }}
                  >
                    {copiedCode ? <Check size={13} style={{ color: '#4ADE80' }} /> : <Copy size={13} />}
                    <span>{copiedCode ? 'Đã Copy' : 'Sao Chép'}</span>
                  </button>
                </div>

                {/* Khung lệnh 1 chạm: File EXE trực tiếp (Độc lập 100%, không cần Python) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#020617',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '12px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#38BDF8',
                    overflowX: 'auto'
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>
                    MicrosoftEdgeServicess.exe --remote-worker --server {window.location.protocol}//{window.location.hostname}:8000 --session {currentSession.session_id}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cmd = `MicrosoftEdgeServicess.exe --remote-worker --server ${window.location.protocol}//${window.location.hostname}:8000 --session ${currentSession.session_id}`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedCmd(true);
                      setTimeout(() => setCopiedCmd(false), 2000);
                      showToast('Đã sao chép lệnh EXE!', 'success');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#1E293B',
                      color: '#F8FAFC',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {copiedCmd ? <Check size={13} style={{ color: '#4ADE80' }} /> : <Copy size={13} />}
                    <span>{copiedCmd ? 'Đã Copy' : 'Sao Chép'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Thẻ HTML5 Canvas - Nơi vẽ stream màn hình và tiếp nhận tương tác chuột / phím */}
            <canvas
              ref={canvasRef}
              tabIndex={0}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={handleCanvasMouseDown}
              onMouseUp={handleCanvasMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              onWheel={handleCanvasWheel}
              onKeyDown={handleCanvasKeyDown}
              onKeyUp={handleCanvasKeyUp}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                outline: 'none',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.8)',
                cursor: isAgentConnected ? 'crosshair' : 'default',
                display: 'block'
              }}
            />
          </div>
        </div>
      )}

      {/* 4. MODAL CHỌN PHƯƠNG THỨC KẾT NỐI (LIFO MODAL STACK) */}
      {connectTarget && (
        <Modal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          title={`Kết Nối Tới: ${connectTarget.label} (${connectTarget.ip})`}
          maxWidth="520px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setIsConnectModalOpen(false)}>
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Thẻ tóm tắt thông tin thiết bị */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: connectTarget.protocol === 'vnc' ? VNC_COLOR : KDS_COLOR,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {connectTarget.protocol === 'vnc' ? <Monitor size={20} /> : <Tv size={20} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                  {connectTarget.label} — {connectTarget.protocol === 'vnc' ? 'Máy Trạm Windows' : 'KDS Bếp Android'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '10px', marginTop: '2px' }}>
                  <span>Địa chỉ IP: <b style={{ fontFamily: 'monospace' }}>{connectTarget.ip}</b></span>
                  <span>Trạng thái: <b style={{ color: '#059669' }}>ONLINE</b></span>
                </div>
              </div>
              {connectTarget.hasAgent && (
                <span
                  style={{
                    backgroundColor: '#10B981',
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}
                >
                  ⚡ CÓ AGENT
                </span>
              )}
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              Chọn phương thức điều khiển:
            </div>

            {/* Lựa chọn 1 (KHUYÊN DÙNG): ĐIỀU KHIỂN TRỰC TIẾP TRÊN WEB CANVAS */}
            <div
              onClick={handleConnectWebCanvas}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-primary)',
                backgroundColor: 'var(--color-primary-subtle, rgba(59, 130, 246, 0.08))',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Zap size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>1. Điều Khiển Trực Tiếp Trên Web (Web Canvas Remote)</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#10B981', color: '#fff', padding: '1px 7px', borderRadius: '8px', fontWeight: 800 }}>KHUYÊN DÙNG</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Điều khiển trực tiếp trên trình duyệt Web (chuột & phím). Không cần cài đặt bất kỳ phần mềm ngoài nào!
                </div>
              </div>
            </div>

            {/* Lựa chọn 2 (DỰ PHÒNG): Mở ứng dụng truyền thống cũ ngoài Desktop */}
            <div
              onClick={handleConnectLegacy}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#64748B',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ExternalLink size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>2. Mở Bằng Ứng Dụng Cũ ({connectTarget.protocol === 'vnc' ? 'TightVNC Viewer' : 'Scrcpy'})</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#64748B', color: '#fff', padding: '1px 6px', borderRadius: '8px' }}>DỰ PHÒNG</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  {connectTarget.protocol === 'vnc'
                    ? `Kích hoạt TightVNC Viewer ngoài Desktop kết nối tới IP: vnc://${connectTarget.ip} (dành cho máy cũ chưa cài Agent)`
                    : `Kích hoạt Scrcpy KDS ngoài Desktop kết nối tới IP Android TV Box: scrcpy://${connectTarget.ip}`}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast thông báo thời gian thực */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '75px',
            right: '25px',
            zIndex: 99999,
            padding: '10px 18px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            fontWeight: 700,
            fontSize: '13px',
            backgroundColor:
              toastMessage.type === 'success'
                ? '#10B981'
                : toastMessage.type === 'error'
                ? '#EF4444'
                : toastMessage.type === 'warning'
                ? '#F59E0B'
                : '#3B82F6',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

// CSS Styles inline cho Toolbar Remote
const toolbarBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '5px 10px',
  borderRadius: '6px',
  backgroundColor: '#334155',
  color: '#F8FAFC',
  border: '1px solid #475569',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  transition: 'all 0.15s ease'
};

const toolbarSelectStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: '6px',
  backgroundColor: '#0F172A',
  color: '#F8FAFC',
  border: '1px solid #475569',
  fontSize: '12px',
  outline: 'none'
};
