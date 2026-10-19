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
  Play,
  Square,
  Copy,
  Check,
  Terminal,
  Activity,
  ArrowLeft,
  Settings,
  HelpCircle,
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

  // Tra cứu & Ping tín hiệu Nhà hàng (chuẩn VncKdsModal)
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

  // Bộ lọc
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'online' | 'restaurant' | 'kds'>('all');

  // Tab chọn loại Remote
  const [remoteMode, setRemoteMode] = useState<'workstation' | 'kds'>('workstation');

  // Form kết nối thủ công
  const [customRestaurantCode, setCustomRestaurantCode] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [customDeviceName, setCustomDeviceName] = useState<string>('');
  const [customFps, setCustomFps] = useState<number>(15);
  const [customQuality, setCustomQuality] = useState<number>(65);

  // Phiên remote đang chạy
  const [currentSession, setCurrentSession] = useState<RemoteSessionInfo | null>(null);
  const [isAgentConnected, setIsAgentConnected] = useState<boolean>(false);
  const [pingMs, setPingMs] = useState<number>(0);
  const [streamFps, setStreamFps] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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
    setCustomRestaurantCode(r.sap || r.res || 'TEST');
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

  // Xử lý khi click vào ô thiết bị
  const handleCardClick = (item: { suffix: string; label: string; protocol: 'vnc' | 'scrcpy' }) => {
    const isOnline = item.protocol === 'vnc' ? vncResults[item.suffix] === true : kdsResults[item.suffix] === true;
    const ip = ipPrefix + item.suffix;
    if (!isOnline) {
      showToast(`Thiết bị ${item.label} (${ip}) đang OFFLINE, chưa phản hồi tín hiệu!`, 'warning');
      return;
    }
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

  // Mở ứng dụng truyền thống (vnc:// hoặc scrcpy://)
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
    const resCode = selectedRestaurant?.sap || selectedRestaurant?.res || customRestaurantCode || 'NH';
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

  // Lọc danh sách máy trạm
  const filteredEndpoints = endpoints.filter((ep) => {
    const kw = searchKeyword.toLowerCase().trim();
    const matchKw =
      !kw ||
      ep.restaurant_code.toLowerCase().includes(kw) ||
      ep.restaurant_name.toLowerCase().includes(kw) ||
      ep.ip_lan.toLowerCase().includes(kw) ||
      (ep.machine_name && ep.machine_name.toLowerCase().includes(kw));

    if (!matchKw) return false;

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
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflowY: 'auto' }}>
          {/* Card Hướng Dẫn & Giới Thiệu Lab */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <HelpCircle size={22} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '3px' }}>
                  Tại sao sử dụng giải pháp Web-based Remote thay thế TightVNC & Scrcpy?
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  • <b>Không cần cài VNC Viewer hay Scrcpy trên máy IT</b>: Điều khiển trực tiếp 100% trên giao diện Web.<br />
                  • <b>Vượt qua tường lửa / NAT</b>: Máy trạm kết nối Outbound lên Server qua WebSocket, IT ở bất kỳ đâu cũng điều khiển được.<br />
                  • <b>Tiếp sóng KDS Bếp qua ADB LAN</b>: Không cần mở port mạng của Android TV Box.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setRemoteMode('workstation')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: remoteMode === 'workstation' ? 'var(--color-primary)' : 'var(--bg-primary)',
                  color: remoteMode === 'workstation' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <Monitor size={16} />
                <span>Remote Máy Trạm Windows</span>
              </button>
              <button
                type="button"
                onClick={() => setRemoteMode('kds')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: remoteMode === 'kds' ? 'var(--color-primary)' : 'var(--bg-primary)',
                  color: remoteMode === 'kds' ? '#fff' : 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <Tv size={16} />
                <span>Remote KDS Bếp (Android)</span>
              </button>
            </div>
          </div>

          {/* 3. KHỐI TRA CỨU TÍN HIỆU & ĐIỀU KHIỂN NHÀ HÀNG (GRID CARD CHUẨN POPUP VNC/KDS) */}
          <div
            style={{
              padding: '18px 22px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              marginBottom: '18px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Header của Khối */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(26, 115, 232, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: VNC_COLOR
                  }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Kiểm Tra Tín Hiệu & Kết Nối Thiết Bị Nhà Hàng</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: '#DEF7EC',
                        color: '#059669'
                      }}
                    >
                      Chuẩn Lưới Card Popup
                    </span>
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
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
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    color: '#059669',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '12px'
                  }}
                  title="Tự động mở phiên và kích hoạt worker trên chính máy này"
                >
                  <Zap size={14} />
                  <span>Kích Hoạt Máy Này (127.0.0.1)</span>
                </button>
              </div>
            </div>

            {/* Thanh tìm kiếm Nhà Hàng & Nhập IP Prefix */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '14px',
                position: 'relative'
              }}
            >
              {/* Ô 1: Tìm kiếm Nhà Hàng */}
              <div style={{ flex: '2 1 280px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Tìm Kiếm Nhà Hàng (Mã SAP / Tên / RK7)
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
                    placeholder="Gõ mã NH (VD: 5166, 1015) hoặc tên (VD: Cloud Pot, Gogi...)"
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
              <div style={{ flex: '1 1 180px' }}>
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
                  padding: '8px 18px',
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
            </div>

            {/* Thông tin IP Prefix hướng dẫn click */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                marginBottom: '16px'
              }}
            >
              <Monitor size={16} style={{ color: VNC_COLOR, flexShrink: 0 }} />
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                IP Prefix: <strong style={{ fontFamily: 'monospace', color: VNC_COLOR }}>{ipPrefix}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '10px', fontSize: '12px' }}>
                  👉 Click vào ô <b>ONLINE</b> để kết nối (Hỗ trợ cả Web Canvas siêu tốc và TightVNC / Scrcpy)
                </span>
              </div>
            </div>

            {/* LƯỚI CARD 1: VNC / AGENT — PC / POS (.41, .11, .12) */}
            <div style={{ marginBottom: '18px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: VNC_COLOR,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Monitor size={15} /> VNC / AGENT — PC / POS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '12px 8px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isOnline ? VNC_COLOR : 'var(--border-color)'}`,
                        backgroundColor: isOnline ? `${VNC_COLOR}12` : 'var(--bg-secondary)',
                        cursor: isOnline ? 'pointer' : 'default',
                        opacity: isPending ? 0.6 : isOnline ? 1 : 0.5,
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        boxSizing: 'border-box'
                      }}
                      title={
                        isOnline
                          ? `Click để kết nối tới ${ip}`
                          : isPending
                          ? `Đang kiểm tra ${ip}...`
                          : `${ip} — Ngoại tuyến (OFFLINE)`
                      }
                    >
                      {/* Huy hiệu Agent nếu IP đã có Service */}
                      {hasAgent && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            backgroundColor: '#10B981',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                          title="Máy này đã cài Agent Service"
                        >
                          <Zap size={9} /> AGENT
                        </div>
                      )}

                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isPending ? '#9CA3AF' : isOnline ? VNC_COLOR : '#9CA3AF',
                          color: '#fff',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        {isPending ? <Loader2 size={16} className="spin" /> : <Monitor size={16} />}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, color: isOnline ? VNC_COLOR : 'var(--text-muted)' }}>
                        .{item.suffix}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: isPending ? 'var(--bg-primary)' : isOnline ? '#DEF7EC' : '#F3F4F6',
                          color: isPending ? 'var(--text-muted)' : isOnline ? '#059669' : '#9CA3AF',
                        }}
                      >
                        {isPending ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LƯỚI CARD 2: SCRCPY / ADB — KDS (MÀN HÌNH BẾP) (.31 -> .38) */}
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: KDS_COLOR,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Tv size={15} /> Scrcpy / ADB — KDS (Màn Hình Bếp Android)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
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
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '10px 6px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${isOnline ? KDS_COLOR : 'var(--border-color)'}`,
                        backgroundColor: isOnline ? `${KDS_COLOR}10` : 'var(--bg-secondary)',
                        cursor: isOnline ? 'pointer' : 'default',
                        opacity: isPending ? 0.6 : isOnline ? 1 : 0.5,
                        transition: 'all 0.15s ease',
                        boxSizing: 'border-box'
                      }}
                      title={
                        isOnline
                          ? `Click để kết nối KDS ${ip}`
                          : isPending
                          ? `Đang kiểm tra ${ip}...`
                          : `${ip} — Ngoại tuyến (OFFLINE)`
                      }
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isPending ? '#9CA3AF' : isOnline ? KDS_COLOR : '#9CA3AF',
                          color: '#fff',
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        {isPending ? <Loader2 size={14} className="spin" /> : <Tv size={14} />}
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: isOnline ? KDS_COLOR : 'var(--text-muted)' }}>
                        .{item.suffix}
                      </div>
                      <div
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          backgroundColor: isPending ? 'var(--bg-primary)' : isOnline ? '#DEF7EC' : '#F3F4F6',
                          color: isPending ? 'var(--text-muted)' : isOnline ? '#059669' : '#9CA3AF',
                        }}
                      >
                        {isPending ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hộp kiến trúc: Giải đáp trực tiếp băn khoăn "Không cần cài Agent cho toàn bộ máy!" */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <HelpCircle size={20} style={{ color: '#2563EB', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                <b style={{ color: '#2563EB' }}>💡 Kiến trúc linh hoạt: Bạn KHÔNG BẮT BUỘC phải cài Agent cho toàn bộ 3 máy trạm (.11, .12, .41)!</b>
                <div style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>
                  • <b>Máy chưa cài Agent</b>: Vẫn kết nối 100% bằng <b>TightVNC (`vnc://`)</b> hoặc <b>Scrcpy (`scrcpy://`)</b> 1 chạm như cũ, không làm gián đoạn công việc.<br />
                  • <b>Máy đã cài Agent (VD: POS 1.1)</b>: Điều khiển trực tiếp siêu tốc trên Web Canvas mà không cần cài thêm VNC Viewer trên máy tính của bạn.<br />
                  • <b>Mô hình Gateway LAN</b>: Chỉ cần 1 máy chính trong nhà hàng cài service, máy đó có thể làm cầu nối tiếp sóng điều khiển KDS Android (.31-.38) và các máy POS khác trong mạng LAN!
                </div>
              </div>
            </div>
          </div>

          {/* Form Nhập Nhanh Địa Chỉ IP */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '13.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={16} />
              <span>Kết Nối Nhanh Theo Địa Chỉ IP (Lab Tùy Biến)</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>Mã Nhà Hàng</label>
                <input
                  type="text"
                  placeholder="VD: 101, 102, TEST"
                  value={customRestaurantCode}
                  onChange={(e) => setCustomRestaurantCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: '1 1 180px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>
                  Địa Chỉ IP {remoteMode === 'kds' ? 'KDS Bếp (.31, .32...)' : 'Máy Trạm (.11, .12...)'}
                </label>
                <input
                  type="text"
                  placeholder="VD: 192.168.254.11 hoặc 127.0.0.1"
                  value={customIp}
                  onChange={(e) => setCustomIp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ flex: '1 1 160px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>Tên Thiết Bị (Gợi Nhớ)</label>
                <input
                  type="text"
                  placeholder="VD: Máy Thu Ngân 01"
                  value={customDeviceName}
                  onChange={(e) => setCustomDeviceName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ width: '110px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>FPS Tối Đa</label>
                <select
                  value={customFps}
                  onChange={(e) => setCustomFps(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value={10}>10 FPS (Tiết kiệm)</option>
                  <option value={15}>15 FPS (Chuẩn)</option>
                  <option value={20}>20 FPS (Mượt)</option>
                  <option value={30}>30 FPS (Cao cấp)</option>
                </select>
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>Chất Lượng Ảnh</label>
                <select
                  value={customQuality}
                  onChange={(e) => setCustomQuality(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value={35}>35% (Rất nhẹ)</option>
                  <option value={50}>50% (Tiêu chuẩn)</option>
                  <option value={65}>65% (Cân bằng)</option>
                  <option value={80}>80% (Sắc nét)</option>
                  <option value={90}>90% (Cực nét)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleStartRemote(
                    remoteMode,
                    customRestaurantCode || 'MANUAL',
                    customIp,
                    customDeviceName || `${customRestaurantCode} (${customIp})`
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  height: '37px'
                }}
              >
                <Play size={16} />
                <span>Bắt Đầu Remote</span>
              </button>
            </div>
          </div>

          {/* Thanh Toolbar Tìm Kiếm Danh Sách Máy Trạm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                />
                <input
                  type="text"
                  placeholder="Tìm theo Mã NH, Tên nhà hàng, IP LAN..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 34px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Bộ lọc loại thiết bị */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: filterType === 'all' ? 'var(--color-primary-subtle)' : 'transparent',
                    color: filterType === 'all' ? 'var(--color-primary-text)' : 'var(--text-primary)',
                    fontWeight: filterType === 'all' ? 700 : 500,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  Tất Cả ({endpoints.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('online')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: filterType === 'online' ? 'var(--color-primary-subtle)' : 'transparent',
                    color: filterType === 'online' ? 'var(--color-primary-text)' : 'var(--text-primary)',
                    fontWeight: filterType === 'online' ? 700 : 500,
                    fontSize: '12.5px',
                    cursor: 'pointer'
                  }}
                >
                  🟢 Đang Online ({endpoints.filter((e) => e.is_online).length})
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={loadInitialData}
              disabled={loadingEndpoints}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loadingEndpoints ? 'spin' : ''} />
              <span>Làm Mới</span>
            </button>
          </div>

          {/* Bảng Danh Sách Máy Trạm Sẵn Có */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              overflowY: 'auto'
            }}
          >
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
                  <th style={{ padding: '10px 14px', width: '90px' }}>Mã NH</th>
                  <th style={{ padding: '10px 14px' }}>Tên Nhà Hàng / Thiết Bị</th>
                  <th style={{ padding: '10px 14px', width: '140px' }}>IP LAN</th>
                  <th style={{ padding: '10px 14px', width: '130px' }}>Trạng Thái</th>
                  <th style={{ padding: '10px 14px', width: '160px' }}>Heartbeat Gần Nhất</th>
                  <th style={{ padding: '10px 14px', width: '160px', textAlign: 'center' }}>Thao Tác Remote</th>
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
                  filteredEndpoints.map((ep) => (
                    <tr
                      key={ep.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '10px 14px', fontWeight: 700 }}>{ep.restaurant_code}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{ep.restaurant_name}</div>
                        {ep.machine_name && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Máy: {ep.machine_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600 }}>{ep.ip_lan}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
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
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {ep.last_heartbeat || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
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
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--color-primary)',
                              color: '#fff',
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            <Monitor size={13} />
                            <span>Remote POS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // Tự động suy ra IP KDS Bếp (.31) nếu chọn máy trạm .11
                              const ipParts = ep.ip_lan.split('.');
                              let kdsIp = ep.ip_lan;
                              if (ipParts.length === 4) {
                                ipParts[3] = '31';
                                kdsIp = ipParts.join('.');
                              }
                              handleStartRemote(
                                'kds',
                                ep.restaurant_code,
                                kdsIp,
                                `${ep.restaurant_code} - KDS Bếp (${kdsIp})`
                              )
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              color: '#2563EB',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}
                          >
                            <Tv size={13} />
                            <span>KDS .31</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

                {/* NÚT TỰ ĐỘNG KÍCH HOẠT 1 CLICK - KHÔNG CẦN GÕ LỆNH */}
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

                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '12px', textAlign: 'left', lineHeight: 1.5 }}>
                  • <b>Máy trạm nhà hàng</b>: Service <code>MicrosoftEdgeServicess</code> sẽ tự động nhận lệnh ngầm và stream về web.<br />
                  • <b>Chạy thủ công tại máy trạm</b>: Chỉ cần click đúp file <code>Chay_Thu_Nghiem_Remote_Lab.bat</code> (tự động nhận session).
                </div>

                {/* Khung lệnh 1 chạm dự phòng */}
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

                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Hoặc chạy trực tiếp Python: <br />
                  <code style={{ color: '#F1F5F9' }}>
                    python remote_worker.py --server http://127.0.0.1:8000 --session {currentSession.session_id}
                  </code>
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

            {/* Lựa chọn 1: Web Canvas Remote (Công nghệ mới) */}
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Zap size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>1. Điều Khiển Trực Tiếp Trên Trình Duyệt (Web Canvas)</span>
                  <span style={{ fontSize: '10px', backgroundColor: '#10B981', color: '#fff', padding: '1px 6px', borderRadius: '8px' }}>MỚI</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Không cần cài VNC Viewer hay Scrcpy trên máy tính IT. Điều khiển mượt mà ngay trên tab trình duyệt hiện tại.
                </div>
              </div>
            </div>

            {/* Lựa chọn 2: Mở ứng dụng truyền thống */}
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
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#64748B',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ExternalLink size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                  2. Mở Ứng Dụng Truyền Thống ({connectTarget.protocol.toUpperCase()} Client)
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {connectTarget.protocol === 'vnc'
                    ? `Kích hoạt TightVNC Viewer qua URL protocol: vnc://${connectTarget.ip}`
                    : `Kích hoạt Scrcpy qua URL protocol: scrcpy://${connectTarget.ip}`}
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
