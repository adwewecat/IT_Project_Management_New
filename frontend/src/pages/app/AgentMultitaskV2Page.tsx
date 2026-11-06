import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  Server,
  FileText,
  Terminal,
  Upload,
  RefreshCw,
  Monitor,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  FolderOpen,
  ArrowRight,
  Search,
  Wifi,
  X,
  Sliders,
  FileCode,
  FileArchive,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { BatchPushModal } from '../../components/agent-multitask/BatchPushModal';
import {
  agentMultitaskV2Service,
  SftpFileItem,
  SftpServerConfig,
  CheckRestaurantConnectionResponse,
  RestaurantFolderFileItem
} from '../../services/agentMultitaskV2Service';
import { getRestaurants } from '../../services/restaurantService';

interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'error' | 'warn' | 'cmd';
  title: string;
  details?: string;
}

export const AgentMultitaskV2Page: React.FC = () => {
  const { user } = useAuth();
  const isAuthorized = checkIsDungOrSuperAdmin(user);

  // ── 1. SFTP STATE ──
  const [sftpConfig, setSftpConfig] = useState<SftpServerConfig>({
    host: '10.28.1.150',
    port: 22,
    username: 'f_hcm',
    remote_path: '/home/dung.na/Support',
    fallback_path: '/home/f_hcm/Support'
  });
  const [sftpFiles, setSftpFiles] = useState<SftpFileItem[]>([]);
  const [activeSftpPath, setActiveSftpPath] = useState<string>('/home/dung.na/Support');
  const [loadingSftp, setLoadingSftp] = useState<boolean>(false);
  const [selectedSftpFile, setSelectedSftpFile] = useState<SftpFileItem | null>(null);
  const [sftpSearchQuery, setSftpSearchQuery] = useState<string>('');
  const [showSftpConfigModal, setShowSftpConfigModal] = useState<boolean>(false);
  const [tempSftpPath, setTempSftpPath] = useState<string>('/home/dung.na/Support');

  // ── 2. NHÀ HÀNG & THƯ MỤC ĐÍCH STATE ──
  const [restaurantList, setRestaurantList] = useState<Array<{ id: number; name: string; rk7_code?: string; ip: string }>>([]);
  const [selectedRestaurantCode, setSelectedRestaurantCode] = useState<string>('');
  const [restaurantSearchQuery, setRestaurantSearchQuery] = useState<string>('');
  const [isRestaurantDropdownOpen, setIsRestaurantDropdownOpen] = useState<boolean>(false);
  const restaurantDropdownRef = useRef<HTMLDivElement>(null);
  const [targetIp, setTargetIp] = useState<string>('10.8.160.11');
  const [targetFolder, setTargetFolder] = useState<string>('D:\\GPOS-Setup\\');
  const [checkingConnection, setCheckingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<CheckRestaurantConnectionResponse | null>(null);

  // Helper xóa dấu tiếng Việt hỗ trợ tìm kiếm nhanh
  const removeVietnameseTones = (str: string): string => {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  // Nhà hàng đang được chọn hiện tại
  const selectedRestaurant = useMemo(() => {
    return restaurantList.find(
      (r) => r.rk7_code === selectedRestaurantCode || String(r.id) === selectedRestaurantCode
    );
  }, [restaurantList, selectedRestaurantCode]);

  // Danh sách nhà hàng được lọc theo ô tìm kiếm
  const filteredRestaurantList = useMemo(() => {
    if (!restaurantSearchQuery.trim()) return restaurantList;
    const q = removeVietnameseTones(restaurantSearchQuery.trim());
    return restaurantList.filter((r) => {
      const nameClean = removeVietnameseTones(r.name || '');
      const codeClean = (String(r.rk7_code || '') + ' ' + String(r.id || '')).toLowerCase();
      const ipClean = (r.ip || '').toLowerCase();
      return nameClean.includes(q) || codeClean.includes(q) || ipClean.includes(q);
    });
  }, [restaurantList, restaurantSearchQuery]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        restaurantDropdownRef.current &&
        !restaurantDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRestaurantDropdownOpen(false);
        setRestaurantSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ── 3. TÙY CHỌN TRUYỀN FILE ──
  const [autoExtract, setAutoExtract] = useState<boolean>(true);
  const [executeAfterPush, setExecuteAfterPush] = useState<boolean>(false);
  const [runModeAfterPush, setRunModeAfterPush] = useState<'SILENT' | 'INTERACTIVE'>('SILENT');
  const [forceUnlockSingle, setForceUnlockSingle] = useState<boolean>(true);
  const [pushingFile, setPushingFile] = useState<boolean>(false);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);

  // ── 4. THƯ MỤC NHÀ HÀNG STATE ──
  const [restaurantFiles, setRestaurantFiles] = useState<RestaurantFolderFileItem[]>([]);
  const [folderExistsOnRestaurant, setFolderExistsOnRestaurant] = useState<boolean>(false);
  const [loadingRestaurantFiles, setLoadingRestaurantFiles] = useState<boolean>(false);
  const [executingActionFile, setExecutingActionFile] = useState<string | null>(null);

  // ── 5. MODAL XEM NỘI DUNG TEXT / LOG ──
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>('');

  // ── 6. CONSOLE LOGS STATE ──
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      title: 'Khởi tạo hệ thống Agent Multitask 2',
      details: 'Sẵn sàng kết nối SFTP 10.28.1.150:22 và điều khiển trạm nhà hàng từ xa.'
    }
  ]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Thêm log vào console
  const addLog = (type: 'info' | 'success' | 'error' | 'warn' | 'cmd', title: string, details?: string) => {
    const entry: ConsoleLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      title,
      details
    };
    setConsoleLogs((prev) => [...prev, entry]);
  };

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // Load danh sách nhà hàng và quét SFTP khi mở trang
  useEffect(() => {
    if (!isAuthorized) return;

    // Load nhà hàng
    getRestaurants({ page_size: 1000 })
      .then((res) => {
        const list = (res.items || []).map((r) => ({
          id: r.id,
          name: r.res || `Nhà Hàng ${r.id}`,
          rk7_code: r.rk7 || '',
          ip: r.ip || ''
        }));
        setRestaurantList(list);
      })
      .catch((err) => console.warn('Lỗi nạp danh sách nhà hàng:', err));

    // Lấy config SFTP & Quét danh sách file
    handleFetchSftpFiles();
  }, [isAuthorized]);

  // Quét danh sách file SFTP
  const handleFetchSftpFiles = async (customPath?: string) => {
    setLoadingSftp(true);
    const path = customPath || sftpConfig.remote_path;
    addLog('info', `Đang kết nối SFTP ${sftpConfig.host}:${sftpConfig.port}...`, `Thư mục quét: ${path}`);
    try {
      const res = await agentMultitaskV2Service.listSftpFiles({
        host: sftpConfig.host,
        port: sftpConfig.port,
        username: sftpConfig.username,
        remote_path: path
      });
      if (res.success) {
        setSftpFiles(res.files);
        setActiveSftpPath(res.active_path);
        addLog('success', `SFTP quét thành công: ${res.total_files} file`, `Thư mục hoạt động: ${res.active_path}`);
      } else {
        addLog('warn', `Phản hồi SFTP: ${res.message}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi kết nối SFTP';
      addLog('error', 'Lỗi kết nối SFTP Server', msg);
    } finally {
      setLoadingSftp(false);
    }
  };

  // Upload file lên SFTP
  const handleUploadFileToSftp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    addLog('info', `Đang tải file '${file.name}' lên SFTP...`, `Kích thước: ${(file.size / 1024).toFixed(1)} KB`);
    try {
      const res = await agentMultitaskV2Service.uploadFileToSftp(file, activeSftpPath);
      if (res.success) {
        addLog('success', `Đã tải lên SFTP thành công: ${res.filename}`, res.message);
        handleFetchSftpFiles(activeSftpPath);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi upload SFTP';
      addLog('error', `Lỗi tải file '${file.name}' lên SFTP`, msg);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Khi chọn nhà hàng từ dropdown: Tự động dò tìm Máy Chủ SQL Server online (100% Agent-less)
  const handleSelectRestaurant = async (val: string) => {
    setSelectedRestaurantCode(val);
    const found = restaurantList.find((r) => r.rk7_code === val || String(r.id) === val);
    if (found && found.ip) {
      const baseIp = found.ip.trim().replace(/\.x$/i, '').replace(/\.1$/i, '');
      const defaultHost = `${baseIp}.11`;
      setTargetIp(defaultHost);
      addLog('info', `Đã chọn nhà hàng: ${found.name}`, `Dải IP: ${found.ip} -> Đang tự động dò tìm Máy Chủ SQL Online...`);

      setCheckingConnection(true);
      try {
        const res = await agentMultitaskV2Service.checkRestaurantConnection(defaultHost);
        setConnectionStatus(res);
        if (res.online_sql_ip) {
          setTargetIp(res.online_sql_ip);
          addLog('success', `Đã phát hiện Máy Chủ SQL Online: ${res.online_sql_ip} (${res.sql_server_name || ''})`, res.message);
          handleListRestaurantFolder(res.online_sql_ip, targetFolder);
        } else if (res.is_online) {
          addLog('success', `Trạm ${defaultHost} ONLINE`, res.message);
          handleListRestaurantFolder(defaultHost, targetFolder);
        } else {
          addLog('warn', `Trạm ${defaultHost}: ${res.message}`);
        }
      } catch (err: any) {
        addLog('warn', `Kiểm tra trạm ${defaultHost}`, err?.message || 'Không thể kết nối');
      } finally {
        setCheckingConnection(false);
      }
    }
  };

  // Kiểm tra kết nối máy trạm (Hoàn toàn Agent-less qua SQL Server chi nhánh)
  const handleCheckConnection = async () => {
    const cleanIp = targetIp.trim();
    if (!cleanIp) {
      addLog('warn', 'Vui lòng nhập địa chỉ IP máy trạm nhà hàng cần kết nối');
      return;
    }
    setCheckingConnection(true);
    addLog('cmd', `Kiểm tra tín hiệu trạm ${cleanIp}...`);
    try {
      const res = await agentMultitaskV2Service.checkRestaurantConnection(cleanIp);
      setConnectionStatus(res);
      if (res.is_online) {
        const methodDesc = res.sql_ok
          ? 'SQL Trực Tiếp'
          : `Máy Chủ Nhà Hàng (${res.online_sql_ip || res.relay_host || ''})`;
        addLog('success', `Máy trạm ${cleanIp} ONLINE (${methodDesc})`, res.message);
        // Tự động quét luôn thư mục đích
        handleListRestaurantFolder(cleanIp, targetFolder);
      } else {
        addLog('warn', `Trạm ${cleanIp}: ${res.message}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi kiểm tra kết nối';
      addLog('error', `Lỗi kết nối trạm ${cleanIp}`, msg);
    } finally {
      setCheckingConnection(false);
    }
  };

  // Quét danh sách file trong thư mục máy trạm nhà hàng
  const handleListRestaurantFolder = async (ipToScan?: string, folderToScan?: string) => {
    const ip = (ipToScan || targetIp).trim();
    const folder = (folderToScan || targetFolder).trim();
    if (!ip || !folder) return;

    setLoadingRestaurantFiles(true);
    addLog('info', `Đang quét thư mục nhà hàng '${folder}' trên ${ip}...`);
    try {
      const res = await agentMultitaskV2Service.listRestaurantFolder(ip, folder);
      setFolderExistsOnRestaurant(res.folder_exists);
      setRestaurantFiles(res.files);
      if (res.success) {
        const methodText = res.scan_method === 'LAN_RELAY' ? ' (qua Máy Chủ Nhà Hàng)' : '';
        addLog('success', `Thư mục '${folder}': ${res.total_files} file${methodText}`, res.message);
      } else {
        addLog('warn', `Thư mục '${folder}': ${res.message}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi quét thư mục';
      addLog('error', `Lỗi quét thư mục '${folder}' trên ${ip}`, msg);
    } finally {
      setLoadingRestaurantFiles(false);
    }
  };

  // Dán nhanh đường dẫn thư mục đích
  const handlePasteTargetFolder = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim().replace(/^"|"$/g, '');
        setTargetFolder(clean);
        addLog('info', `Đã dán đường dẫn từ Clipboard: ${clean}`);
      }
    } catch (err) {
      addLog('warn', 'Không thể đọc clipboard tự động, bạn có thể dán thủ công bằng Ctrl+V vào ô nhập');
    }
  };

  // Truyền file từ SFTP xuống nhà hàng
  const handlePushFile = async (fileToPush?: SftpFileItem) => {
    const targetFile = fileToPush || selectedSftpFile;
    if (!targetFile) {
      addLog('warn', 'Vui lòng chọn 1 file từ danh sách SFTP Server để truyền xuống nhà hàng');
      return;
    }
    const cleanIp = targetIp.trim();
    const cleanFolder = targetFolder.trim();
    if (!cleanIp || !cleanFolder) {
      addLog('warn', 'Vui lòng nhập đầy đủ IP máy trạm và đường dẫn thư mục đích');
      return;
    }

    setPushingFile(true);
    addLog('cmd', `Bắt đầu truyền '${targetFile.filename}' xuống ${cleanIp}:${cleanFolder}...`, `Dung lượng: ${targetFile.size_formatted}`);
    try {
      const res = await agentMultitaskV2Service.pushFileToRestaurant({
        target_ip: cleanIp,
        target_folder: cleanFolder,
        filename: targetFile.filename,
        remote_sftp_path: activeSftpPath,
        auto_extract: autoExtract,
        execute_after_push: executeAfterPush,
        run_mode: runModeAfterPush,
        force_unlock: forceUnlockSingle
      });

      if (res.success) {
        const channelNote = res.delivery_channel === 'LAN_RELAY' ? ' [Máy Chủ Nhà Hàng]' : '';
        addLog('success', `Đã truyền thành công '${targetFile.filename}'${channelNote} (${res.elapsed_ms}ms)`, res.message);
        if (res.execution_output) {
          addLog('info', 'Kết quả tự động thực thi sau khi truyền:', res.execution_output);
        }
        // Quét lại thư mục trạm để cập nhật danh sách
        handleListRestaurantFolder(cleanIp, cleanFolder);
      } else {
        addLog('error', `Lỗi truyền file '${targetFile.filename}'`, res.message);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi truyền file';
      addLog('error', `Lỗi truyền file '${targetFile.filename}' xuống trạm`, msg);
    } finally {
      setPushingFile(false);
    }
  };

  // Thực thi thao tác từ xa trên máy trạm
  const handleExecuteRemoteAction = async (
    filename: string,
    actionType: 'RUN_SCRIPT' | 'LAUNCH_APP' | 'EXTRACT_ARCHIVE' | 'OPEN_DOCUMENT' | 'DELETE_FILE' | 'READ_TEXT',
    runMode: 'SILENT' | 'INTERACTIVE' = 'SILENT',
    args: string = ''
  ) => {
    const cleanIp = targetIp.trim();
    const cleanFolder = targetFolder.trim();
    if (!cleanIp || !cleanFolder) {
      addLog('warn', 'Chưa có IP máy trạm hoặc thư mục đích');
      return;
    }

    setExecutingActionFile(filename);
    const actionLabels: Record<string, string> = {
      RUN_SCRIPT: runMode === 'INTERACTIVE' ? 'Chạy kịch bản (Hiện Desktop)' : 'Chạy kịch bản (Ngầm)',
      LAUNCH_APP: 'Khởi chạy ứng dụng',
      EXTRACT_ARCHIVE: 'Giải nén file nén',
      OPEN_DOCUMENT: 'Mở tài liệu trên màn hình người dùng',
      READ_TEXT: 'Đọc nội dung log/text',
      DELETE_FILE: 'Xóa file'
    };

    addLog('cmd', `[Thực thi từ xa] ${actionLabels[actionType] || actionType}: ${filename}`, `Target: ${cleanIp}:${cleanFolder}\\${filename}`);

    try {
      const res = await agentMultitaskV2Service.executeRemoteAction({
        target_ip: cleanIp,
        target_folder: cleanFolder,
        filename,
        action_type: actionType,
        run_mode: runMode,
        arguments: args
      });

      if (res.success) {
        addLog('success', `Hoàn tất ${actionLabels[actionType] || actionType} (${res.elapsed_ms}ms)`, res.message);
        if (actionType === 'READ_TEXT') {
          setPreviewFilename(filename);
          setPreviewContent(res.output || res.message);
        } else if (res.output && res.output !== res.message) {
          addLog('info', 'Chi tiết Output:', res.output);
        }
        // Nếu là xóa hoặc giải nén, quét lại thư mục
        if (actionType === 'DELETE_FILE' || actionType === 'EXTRACT_ARCHIVE') {
          handleListRestaurantFolder(cleanIp, cleanFolder);
        }
      } else {
        addLog('error', `Lỗi ${actionLabels[actionType] || actionType}`, res.message + (res.output ? `\nOutput: ${res.output}` : ''));
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi thực thi';
      addLog('error', `Lỗi thực thi từ xa trên ${filename}`, msg);
    } finally {
      setExecutingActionFile(null);
    }
  };

  // Sao chép logs console
  const handleCopyLogs = () => {
    const text = consoleLogs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.title}${l.details ? `\n  ${l.details}` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    addLog('info', 'Đã sao chép toàn bộ nhật ký console vào Clipboard');
  };

  // ── PHÒNG VỆ BẢO MẬT: NẾU KHÔNG PHẢI SUPER ADMIN HOẶC dung.nguyenanh ──
  if (!isAuthorized) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', backgroundColor: 'var(--bg-primary)', minHeight: '80vh' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '32px', borderRadius: '12px', border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
          <AlertTriangle size={48} color="#dc2626" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#991b1b', marginBottom: '8px' }}>
            Khu Vực Hạn Chế Truy Cập
          </h2>
          <p style={{ fontSize: '13px', color: '#b91c1c', lineHeight: 1.6 }}>
            Tính năng <strong>Agent Multitask 2</strong> hiện tại đang trong giai đoạn thử nghiệm chuyên sâu và tạm thời <strong>chỉ dành riêng cho tài khoản dung.nguyenanh và Super Admin</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Lọc file SFTP theo từ khóa
  const filteredSftpFiles = sftpFiles.filter((f) =>
    f.filename.toLowerCase().includes(sftpSearchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 65px)',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-secondary)',
        padding: '12px 16px',
        boxSizing: 'border-box',
        gap: '12px'
      }}
    >
      {/* ── HEADER THANH TIÊU ĐỀ & TRẠNG THÁI ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          padding: '10px 16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Agent Multitask 2
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca'
                }}
              >
                Super Admin Only
              </span>
              <span
                style={{
                  fontSize: '11px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                SFTP 10.28.1.150:22 & Remote Execution
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Truyền file từ xa xuống trạm nhà hàng, tự dán đường dẫn & thực thi script .bat / .exe / .doc / giải nén zip không cần Ultraviewer
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => handleFetchSftpFiles(activeSftpPath)}
            disabled={loadingSftp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: loadingSftp ? 'not-allowed' : 'pointer'
            }}
          >
            <RefreshCw size={13} className={loadingSftp ? 'animate-spin' : ''} />
            <span>Làm Mới SFTP</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSftpConfigModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#f8fafc',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Sliders size={13} />
            <span>Cấu Hình SFTP</span>
          </button>
        </div>
      </div>

      {/* ── BỐ CỤC CHÍNH 2 CỘT (FLEX 1, MINHEIGHT 0) ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          flex: 1,
          minHeight: 0
        }}
      >
        {/* ════════════════════════════════════════════════════════════════
            CỘT TRÁI: KHO LƯU TRỮ FILE TẬP TRUNG SFTP SERVER (10.28.1.150)
            ════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          {/* Header SFTP */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} color="#F5B800" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Kho File SFTP: <code style={{ color: '#854D0E' }}>{activeSftpPath}</code>
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                ({sftpFiles.length} file)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleUploadFileToSftp}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                title="Tải file từ máy tính bạn lên thư mục SFTP"
              >
                <Upload size={12} />
                <span>+ Tải Lên SFTP</span>
              </button>
            </div>
          </div>

          {/* Ô tìm kiếm file SFTP */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm file theo tên, đuôi file (.bat, .exe, .zip...)..."
                value={sftpSearchQuery}
                onChange={(e) => setSftpSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Bảng danh sách file SFTP */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 2, borderBottom: '1px solid #cbd5e1' }}>
                <tr>
                  <th style={{ padding: '6px 10px', width: '30px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '6px 10px', color: '#0f172a' }}>Tên File</th>
                  <th style={{ padding: '6px 10px', width: '90px', textAlign: 'right', color: '#475569' }}>Dung Lượng</th>
                  <th style={{ padding: '6px 10px', width: '130px', color: '#475569' }}>Ngày Cập Nhật</th>
                  <th style={{ padding: '6px 10px', width: '95px', textAlign: 'center', color: '#0f172a' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSftpFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      {loadingSftp ? 'Đang kết nối SFTP và quét file...' : 'Không có file nào trong thư mục này.'}
                    </td>
                  </tr>
                ) : (
                  filteredSftpFiles.map((file, idx) => {
                    const isSelected = selectedSftpFile?.filename === file.filename;
                    const isScript = file.file_type === 'script';
                    const isExe = file.file_type === 'executable';
                    const isArchive = file.file_type === 'archive';

                    return (
                      <tr
                        key={file.filename}
                        onClick={() => setSelectedSftpFile(file)}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          backgroundColor: isSelected ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                          cursor: 'pointer',
                          transition: 'background-color 0.1s ease'
                        }}
                      >
                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '6px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isScript ? (
                              <Terminal size={14} color="#059669" />
                            ) : isExe ? (
                              <FileCode size={14} color="#0284c7" />
                            ) : isArchive ? (
                              <FileArchive size={14} color="#d97706" />
                            ) : (
                              <FileText size={14} color="#64748b" />
                            )}
                            <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#047857' : '#0f172a' }}>
                              {file.filename}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', fontSize: '11.5px' }}>
                          {file.size_formatted}
                        </td>
                        <td style={{ padding: '6px 10px', color: '#64748b', fontSize: '11px' }}>
                          {file.modified_time}
                        </td>
                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSftpFile(file);
                              handlePushFile(file);
                            }}
                            disabled={pushingFile}
                            style={{
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '4px',
                              border: isSelected ? '1px solid #047857' : '1px solid #D9A300',
                              backgroundColor: isSelected ? '#059669' : '#F5B800',
                              color: isSelected ? '#ffffff' : '#000000',
                              cursor: pushingFile ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="Truyền file này ngay xuống nhà hàng"
                          >
                            <span>Truyền</span>
                            <ArrowRight size={10} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer SFTP file được chọn */}
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--border-color)',
              backgroundColor: '#f8fafc',
              fontSize: '12px',
              color: '#334155',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              {selectedSftpFile ? (
                <span>
                  Đang chọn: <strong style={{ color: '#047857' }}>{selectedSftpFile.filename}</strong> ({selectedSftpFile.size_formatted})
                </span>
              ) : (
                <span style={{ color: '#64748b' }}>Chưa chọn file nguồn từ SFTP</span>
              )}
            </div>
            {selectedSftpFile && (
              <button
                type="button"
                onClick={() => handlePushFile(selectedSftpFile)}
                disabled={pushingFile}
                style={{
                  padding: '5px 12px',
                  borderRadius: '5px',
                  border: 'none',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: pushingFile ? 'not-allowed' : 'pointer'
                }}
              >
                {pushingFile ? 'Đang truyền...' : 'Truyền File Này Ngay ➔'}
              </button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            CỘT PHẢI: MỤC TIÊU NHÀ HÀNG & THAO TÁC ĐIỀU KHIỂN TỪ XA
            ════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0
          }}
        >
          {/* KHUNG CẤU HÌNH NHÀ HÀNG MỤC TIÊU & ĐƯỜNG DẪN */}
          <div
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              padding: '12px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={15} color="#0284c7" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  Máy Trạm Nhà Hàng Mục Tiêu
                </span>
              </div>

              {connectionStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px' }}>
                  {connectionStatus.is_online ? (
                    <span style={{
                      color: '#047857',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#ECFDF5',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #A7F3D0'
                    }}>
                      <CheckCircle2 size={13} />
                      <span>
                        {connectionStatus.sql_ok
                          ? `Online SQL Trực Tiếp (${connectionStatus.latency_ms}ms)`
                          : `Online Máy Chủ (${connectionStatus.relay_host || connectionStatus.online_sql_ip || ''})`}
                      </span>
                    </span>
                  ) : (
                    <span style={{
                      color: '#dc2626',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: '#FEF2F2',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #FECACA'
                    }}>
                      <XCircle size={13} />
                      <span>Không kết nối được</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Smart Banner: Gợi ý trạm SQL Server Online nếu trạm mục tiêu chưa mở SQL */}
            {connectionStatus && connectionStatus.online_sql_ip && connectionStatus.online_sql_ip !== targetIp.trim() && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF9C3',
                  border: '1px solid #FDE047',
                  fontSize: '11.5px',
                  color: '#854D0E',
                  gap: '8px'
                }}
              >
                <span>
                  💡 Trạm <strong>{targetIp}</strong> không cài SQL Server. Máy Chủ Nhà Hàng <strong>{connectionStatus.online_sql_ip}</strong> ({connectionStatus.sql_server_name || 'Online'}) đang mở cổng 1433 sẵn sàng!
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (connectionStatus.online_sql_ip) {
                      setTargetIp(connectionStatus.online_sql_ip);
                      addLog('info', `Đã chuyển sang Máy Chủ SQL: ${connectionStatus.online_sql_ip}`);
                      handleListRestaurantFolder(connectionStatus.online_sql_ip, targetFolder);
                    }
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    border: '1px solid #CA8A04',
                    backgroundColor: '#F5B800',
                    color: '#000000',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Chuyển Sang {connectionStatus.online_sql_ip}
                </button>
              </div>
            )}

            {/* Dòng 1: Tìm kiếm & Chọn Nhà Hàng (Searchable Combobox) + Nhập IP Trạm Mục Tiêu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: '8px', alignItems: 'start' }}>
              {/* Cột 1: Ô Chọn Nhà Hàng Tích Hợp Tìm Kiếm Trực Tiếp (Searchable Combobox) */}
              <div ref={restaurantDropdownRef} style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    border: isRestaurantDropdownOpen ? '1.5px solid #F5B800' : '1px solid var(--border-color)',
                    borderRadius: '5px',
                    backgroundColor: 'var(--bg-primary)',
                    boxShadow: isRestaurantDropdownOpen ? '0 0 0 2px rgba(245, 184, 0, 0.2)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Search size={13} style={{ position: 'absolute', left: '8px', color: isRestaurantDropdownOpen ? '#d97706' : '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder={
                      selectedRestaurant
                        ? `[${selectedRestaurant.rk7_code || selectedRestaurant.id}] ${selectedRestaurant.name} (${selectedRestaurant.ip})`
                        : restaurantList.length > 0
                        ? `-- Chọn hoặc gõ tìm Nhà Hàng (${restaurantList.length}) --`
                        : 'Đang tải danh sách nhà hàng...'
                    }
                    value={
                      isRestaurantDropdownOpen
                        ? restaurantSearchQuery
                        : selectedRestaurant
                        ? `[${selectedRestaurant.rk7_code || selectedRestaurant.id}] ${selectedRestaurant.name} (${selectedRestaurant.ip})`
                        : ''
                    }
                    onChange={(e) => {
                      setRestaurantSearchQuery(e.target.value);
                      if (!isRestaurantDropdownOpen) setIsRestaurantDropdownOpen(true);
                    }}
                    onFocus={(e) => {
                      setIsRestaurantDropdownOpen(true);
                      e.target.select();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsRestaurantDropdownOpen(false);
                        setRestaurantSearchQuery('');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '5px 48px 5px 26px',
                      fontSize: '12px',
                      fontWeight: selectedRestaurant && !isRestaurantDropdownOpen ? 600 : 400,
                      borderRadius: '5px',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      boxSizing: 'border-box',
                      cursor: 'text'
                    }}
                  />

                  {/* Nút Xóa / Clear */}
                  {(selectedRestaurant || restaurantSearchQuery) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRestaurantCode('');
                        setRestaurantSearchQuery('');
                        setIsRestaurantDropdownOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        right: '24px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: '#94a3b8',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Xóa lựa chọn nhà hàng"
                    >
                      <X size={12} />
                    </button>
                  )}

                  {/* Nút Mở / Đóng Dropdown */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRestaurantDropdownOpen((prev) => !prev);
                    }}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Mở danh sách nhà hàng"
                  >
                    <ChevronDown
                      size={14}
                      style={{
                        transform: isRestaurantDropdownOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  </button>
                </div>

                {/* Sub-row hiển thị thông tin trạm đang chọn (đồng bộ chiều cao hàng với Cột 2) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '18px', padding: '0 2px' }}>
                  {selectedRestaurant ? (
                    <span style={{ fontSize: '11px', color: '#0369a1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 <strong>{selectedRestaurant.name}</strong> ({selectedRestaurant.ip})
                    </span>
                  ) : (
                    <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                      Gõ tìm theo mã, tên hoặc dải IP để chọn trạm
                    </span>
                  )}
                  <span style={{ fontSize: '10.5px', color: '#64748b', flexShrink: 0, marginLeft: '6px' }}>
                    {restaurantList.length} NH
                  </span>
                </div>

                {/* Menu Dropdown Danh Sách Kết Quả */}
                {isRestaurantDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '34px',
                      left: 0,
                      right: 0,
                      minWidth: '400px',
                      maxHeight: '280px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000
                    }}
                  >
                    {/* Header thông tin trong dropdown */}
                    <div
                      style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: '#f8fafc',
                        padding: '5px 10px',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '11px',
                        color: '#64748b',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 600,
                        zIndex: 1
                      }}
                    >
                      <span>
                        {restaurantSearchQuery.trim()
                          ? `Tìm thấy ${filteredRestaurantList.length} / ${restaurantList.length} nhà hàng`
                          : `Tất cả nhà hàng (${restaurantList.length})`}
                      </span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Bấm để chọn</span>
                    </div>

                    {/* Danh sách nhà hàng */}
                    {filteredRestaurantList.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                        Không tìm thấy nhà hàng nào với từ khóa "{restaurantSearchQuery}"
                      </div>
                    ) : (
                      filteredRestaurantList.map((r) => {
                        const isSelected = selectedRestaurantCode === (r.rk7_code || String(r.id));
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              handleSelectRestaurant(r.rk7_code || String(r.id));
                              setIsRestaurantDropdownOpen(false);
                              setRestaurantSearchQuery('');
                            }}
                            style={{
                              padding: '7px 10px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              borderBottom: '1px solid #f1f5f9',
                              backgroundColor: isSelected ? '#FEF9C3' : '#ffffff',
                              borderLeft: isSelected ? '3px solid #F5B800' : '3px solid transparent',
                              transition: 'background-color 0.1s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = '#ffffff';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: isSelected ? '#854D0E' : '#0369a1',
                                  backgroundColor: isSelected ? '#FDE047' : '#e0f2fe',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {r.rk7_code || r.id}
                              </span>
                              <span style={{ fontWeight: isSelected ? 700 : 500, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.name}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', whiteSpace: 'nowrap' }}>
                              {r.ip}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Cột 2: IP Trạm & Phím Chuyển Nhanh .11, .12, .41 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="IP máy trạm (VD: 10.8.222.11)"
                  value={targetIp}
                  onChange={(e) => setTargetIp(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    borderRadius: '5px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Phím chuyển trạm nhanh .11, .12, .41 */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Trạm:</span>
                  {(['11', '12', '41'] as const).map((tail) => {
                    const baseIp = targetIp.trim().replace(/\.\d+$/, '');
                    const candIp = baseIp ? `${baseIp}.${tail}` : '';
                    const isActive = targetIp.trim().endsWith(`.${tail}`);
                    const stationInfo = connectionStatus?.available_stations?.find(s => s.ip.endsWith(`.${tail}`));
                    const dot = stationInfo?.sql_ok ? '🟢' : stationInfo?.ping_ok ? '🟡' : '';

                    return (
                      <button
                        key={tail}
                        type="button"
                        onClick={() => {
                          if (baseIp) {
                            setTargetIp(candIp);
                            addLog('info', `Chuyển trạm mục tiêu sang .${tail}: ${candIp}`);
                            handleListRestaurantFolder(candIp, targetFolder);
                          }
                        }}
                        style={{
                          padding: '1px 6px',
                          fontSize: '10.5px',
                          fontWeight: isActive ? 700 : 500,
                          borderRadius: '4px',
                          border: isActive ? '1px solid #F5B800' : '1px solid var(--border-color)',
                          backgroundColor: isActive ? '#FEF9C3' : 'var(--bg-secondary)',
                          color: isActive ? '#854D0E' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title={tail === '11' ? 'Máy POS 1 / Server (.11)' : tail === '12' ? 'Máy POS 2 (.12)' : 'PC Quản Lý / KDS (.41)'}
                      >
                        {dot && <span style={{ fontSize: '8px' }}>{dot}</span>}
                        <span>.{tail} {tail === '11' ? 'Server' : tail === '12' ? 'POS 2' : 'QL/Bếp'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cột 3: Nút Kiểm Tra Kết Nối */}
              <div>
                <button
                  type="button"
                  onClick={handleCheckConnection}
                  disabled={checkingConnection}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: '1px solid #D9A300',
                    backgroundColor: '#F5B800',
                    color: '#000000',
                    cursor: checkingConnection ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {checkingConnection ? <RefreshCw size={13} className="spin" /> : <Wifi size={13} />}
                  <span>{checkingConnection ? 'Đang ktra...' : 'Ktra Kết Nối'}</span>
                </button>
              </div>
            </div>

            {/* Dòng 2: Ô Nhập/Dán Thư Mục Đích Trên Máy Trạm */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>
                  Thư mục đích dưới nhà hàng (Tự dán đường dẫn bất kỳ vào đây):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={handlePasteTargetFolder}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Dán Clipboard
                  </button>
                  <button
                    type="button"
                    onClick={() => handleListRestaurantFolder()}
                    disabled={loadingRestaurantFiles}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Quét Thư Mục
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="D:\GPOS-Setup\ hoặc D:\GPOS-Setup\app..."
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: '1.5px solid #F5B800',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Nút gợi ý thư mục phổ biến 1-chạm */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Gợi ý nhanh:</span>
                {['D:\\GPOS-Setup\\', 'D:\\GPOS-Setup\\app', 'D:\\GPOS-Setup\\app\\img\\menu'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => {
                      setTargetFolder(f);
                      handleListRestaurantFolder(targetIp, f);
                    }}
                    style={{
                      padding: '2px 6px',
                      fontSize: '10.5px',
                      borderRadius: '4px',
                      border: targetFolder === f ? '1px solid #F5B800' : '1px solid var(--border-color)',
                      backgroundColor: targetFolder === f ? '#FEF9C3' : 'var(--bg-secondary)',
                      color: targetFolder === f ? '#854D0E' : 'var(--text-secondary)',
                      fontWeight: targetFolder === f ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Dòng 3: Tùy chọn truyền & Nút hành động truyền lớn */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '6px',
                borderTop: '1px dashed #e2e8f0',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#334155' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoExtract}
                    onChange={(e) => setAutoExtract(e.target.checked)}
                  />
                  <span>Tự động giải nén (nếu là .zip/.rar)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={executeAfterPush}
                    onChange={(e) => setExecuteAfterPush(e.target.checked)}
                  />
                  <span>Tự động chạy sau khi truyền</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#b45309', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={forceUnlockSingle}
                    onChange={(e) => setForceUnlockSingle(e.target.checked)}
                  />
                  <span>Chép đè file đang chạy (Hot-Swap)</span>
                </label>

                {executeAfterPush && (
                  <select
                    value={runModeAfterPush}
                    onChange={(e) => setRunModeAfterPush(e.target.value as 'SILENT' | 'INTERACTIVE')}
                    style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="SILENT">Chạy Ngầm (Silent)</option>
                    <option value="INTERACTIVE">Hiện Desktop (Interactive)</option>
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d97706',
                    backgroundColor: '#F5B800',
                    color: '#000000',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Mở hộp thoại truyền file hàng loạt xuống nhiều nhà hàng theo danh sách IP (Paste từ Excel, dấu phẩy, enter...)"
                >
                  <Zap size={14} />
                  <span>TRUYỀN HÀNG LOẠT (PASTE IP)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePushFile()}
                  disabled={pushingFile || !selectedSftpFile}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: selectedSftpFile ? '#059669' : '#cbd5e1',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: pushingFile || !selectedSftpFile ? 'not-allowed' : 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {pushingFile ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>
                    {pushingFile
                      ? 'Đang truyền xuống nhà hàng...'
                      : selectedSftpFile
                      ? `TRUYỀN FILE '${selectedSftpFile.filename}' XUỐNG NHÀ HÀNG`
                      : 'CHỌN FILE TỪ SFTP ĐỂ TRUYỀN'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* KHUNG DANH SÁCH FILE ĐANG CÓ TẠI NHÀ HÀNG & ĐIỀU KHIỂN TỪ XA */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {/* Header thư mục trạm */}
            <div
              style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FolderOpen size={15} color="#d97706" />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                  File Tại Thư Mục Nhà Hàng: <code style={{ color: '#b45309' }}>{targetFolder}</code>
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  ({restaurantFiles.length} file)
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleListRestaurantFolder()}
                disabled={loadingRestaurantFiles}
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  cursor: loadingRestaurantFiles ? 'not-allowed' : 'pointer'
                }}
              >
                {loadingRestaurantFiles ? 'Đang quét...' : 'Làm Mới Thư Mục'}
              </button>
            </div>

            {/* Bảng danh sách file tại trạm */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '11.5px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 2, borderBottom: '1px solid #cbd5e1' }}>
                  <tr>
                    <th style={{ padding: '6px 8px', width: '25px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '6px 8px', color: '#0f172a' }}>Tên File</th>
                    <th style={{ padding: '6px 8px', width: '80px', textAlign: 'right', color: '#475569' }}>Dung Lượng</th>
                    <th style={{ padding: '6px 8px', width: '120px', color: '#475569' }}>Ngày Sửa</th>
                    <th style={{ padding: '6px 8px', width: '240px', textAlign: 'center', color: '#0f172a' }}>Thao Tác Từ Xa</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurantFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                        {loadingRestaurantFiles
                          ? 'Đang kiểm tra thư mục máy trạm...'
                          : folderExistsOnRestaurant
                          ? 'Thư mục hiện tại chưa có file nào.'
                          : `Thư mục '${targetFolder}' chưa có trên máy trạm (sẽ tự động tạo khi truyền file).`}
                      </td>
                    </tr>
                  ) : (
                    restaurantFiles.map((file, idx) => {
                      const isActing = executingActionFile === file.filename;
                      const isScript = file.file_type === 'script';
                      const isExe = file.file_type === 'executable';
                      const isArchive = file.file_type === 'archive';
                      const isDoc = file.file_type === 'document';

                      return (
                        <tr
                          key={file.filename}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                          }}
                        >
                          <td style={{ padding: '5px 8px', textAlign: 'center', color: '#94a3b8', fontSize: '10.5px' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '5px 8px', fontWeight: 600, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isActing && <RefreshCw size={11} className="animate-spin" color="#0284c7" />}
                              <span>{file.filename}</span>
                            </div>
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                            {file.size_formatted}
                          </td>
                          <td style={{ padding: '5px 8px', color: '#64748b', fontSize: '10.5px' }}>
                            {file.modified_time}
                          </td>
                          <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {/* THAO TÁC SCRIPT (.bat, .cmd, .ps1) */}
                              {isScript && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteRemoteAction(file.filename, 'RUN_SCRIPT', 'SILENT')}
                                    disabled={Boolean(executingActionFile)}
                                    title="Chạy kịch bản ẩn ngầm 100% không ảnh hưởng màn hình thu ngân"
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #059669',
                                      backgroundColor: '#f0fdf4',
                                      color: '#047857',
                                      cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    ▶️ Ngầm
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExecuteRemoteAction(file.filename, 'RUN_SCRIPT', 'INTERACTIVE')}
                                    disabled={Boolean(executingActionFile)}
                                    title="Kích hoạt hiện cửa sổ CMD trên màn hình Desktop của nhà hàng (tự đóng sau khi xong)"
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--text-primary)',
                                      cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    🖥️ Hiện Desktop
                                  </button>
                                </>
                              )}

                              {/* THAO TÁC EXE */}
                              {isExe && (
                                <button
                                  type="button"
                                  onClick={() => handleExecuteRemoteAction(file.filename, 'LAUNCH_APP')}
                                  disabled={Boolean(executingActionFile)}
                                  title="Khởi chạy ứng dụng này từ xa trên máy trạm"
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  🚀 Khởi Chạy
                                </button>
                              )}

                              {/* THAO TÁC ARCHIVE (ZIP, RAR, 7Z) */}
                              {isArchive && (
                                <button
                                  type="button"
                                  onClick={() => handleExecuteRemoteAction(file.filename, 'EXTRACT_ARCHIVE')}
                                  disabled={Boolean(executingActionFile)}
                                  title="Giải nén file nén này trực tiếp vào thư mục hiện tại"
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: '1px solid #d97706',
                                    backgroundColor: '#fffbeb',
                                    color: '#b45309',
                                    cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  📦 Giải Nén
                                </button>
                              )}

                              {/* THAO TÁC DOCUMENT (TXT, DOC, PDF) */}
                              {isDoc && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteRemoteAction(file.filename, 'OPEN_DOCUMENT')}
                                    disabled={Boolean(executingActionFile)}
                                    title="Mở tài liệu này trực tiếp trên màn hình Desktop của người dùng nhà hàng"
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #7c3aed',
                                      backgroundColor: '#f5f3ff',
                                      color: '#6d28d9',
                                      cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    📄 Mở Desktop
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleExecuteRemoteAction(file.filename, 'READ_TEXT')}
                                    disabled={Boolean(executingActionFile)}
                                    title="Xem nhanh 100 dòng đầu file text/log trên Web Tool"
                                    style={{
                                      padding: '2px 6px',
                                      fontSize: '10.5px',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: '1px solid #64748b',
                                      backgroundColor: '#f8fafc',
                                      color: '#334155',
                                      cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                    }}
                                  >
                                    👁️ Đọc Log
                                  </button>
                                </>
                              )}

                              {/* NÚT XÓA FILE */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Bạn có chắc chắn muốn xóa file '${file.filename}' khỏi máy trạm nhà hàng?`)) {
                                    handleExecuteRemoteAction(file.filename, 'DELETE_FILE');
                                  }
                                }}
                                disabled={Boolean(executingActionFile)}
                                title="Xóa file này khỏi máy trạm"
                                style={{
                                  padding: '2px 5px',
                                  fontSize: '10.5px',
                                  borderRadius: '4px',
                                  border: '1px solid #fecaca',
                                  backgroundColor: '#fff5f5',
                                  color: '#dc2626',
                                  cursor: executingActionFile ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <Trash2 size={11} />
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
      </div>

      {/* ── KHỐI DƯỚI: LIVE EXECUTION CONSOLE / NHẬT KÝ THỰC THI TRỰC TIẾP ── */}
      <div
        style={{
          height: '150px',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        <div
          style={{
            padding: '6px 12px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} color="#38bdf8" />
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#f8fafc' }}>
              Nhật Ký Thực Thi Từ Xa Trực Tiếp (Live Console)
            </span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              ({consoleLogs.length} dòng)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleCopyLogs}
              style={{
                padding: '2px 8px',
                fontSize: '10.5px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid #475569',
                backgroundColor: '#334155',
                color: '#f1f5f9',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Copy size={10} />
              <span>Copy Log</span>
            </button>
            <button
              type="button"
              onClick={() => setConsoleLogs([])}
              style={{
                padding: '2px 8px',
                fontSize: '10.5px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid #475569',
                backgroundColor: '#334155',
                color: '#f1f5f9',
                cursor: 'pointer'
              }}
            >
              Xóa Màn Hình
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 12px',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '11.5px',
            lineHeight: 1.5,
            color: '#e2e8f0'
          }}
        >
          {consoleLogs.map((log) => {
            const color =
              log.type === 'success'
                ? '#4ade80'
                : log.type === 'error'
                ? '#f87171'
                : log.type === 'warn'
                ? '#facc15'
                : log.type === 'cmd'
                ? '#38bdf8'
                : '#cbd5e1';

            return (
              <div key={log.id} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                <span style={{ color: '#64748b', marginRight: '6px' }}>[{log.timestamp}]</span>
                <span style={{ color, fontWeight: 700, marginRight: '6px' }}>
                  [{log.type.toUpperCase()}]
                </span>
                <span style={{ color: '#f8fafc' }}>{log.title}</span>
                {log.details && (
                  <div style={{ color: '#94a3b8', paddingLeft: '20px', whiteSpace: 'pre-wrap' }}>
                    {log.details}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={consoleBottomRef} />
        </div>
      </div>

      {/* ── MODAL CẤU HÌNH SFTP ── */}
      {showSftpConfigModal && (
        <Modal
          isOpen={showSftpConfigModal}
          onClose={() => setShowSftpConfigModal(false)}
          title="Cấu Hình Kết Nối SFTP Server Trung Tâm"
          maxWidth="550px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="secondary" onClick={() => setShowSftpConfigModal(false)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSftpConfig((prev) => ({ ...prev, remote_path: tempSftpPath }));
                  setShowSftpConfigModal(false);
                  handleFetchSftpFiles(tempSftpPath);
                }}
              >
                Lưu & Quét Thư Mục
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '10px', color: '#0369a1' }}>
              Server lưu trữ file trung tâm qua giao thức SFTP (SSH File Transfer Protocol) phục vụ điều khiển và truyền file từ xa xuống nhà hàng.
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Địa Chỉ Server (Host / IP):</label>
              <input
                type="text"
                value={sftpConfig.host}
                disabled
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Cổng (Port):</label>
                <input
                  type="text"
                  value={sftpConfig.port}
                  disabled
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Tài Khoản (Username):</label>
                <input
                  type="text"
                  value={sftpConfig.username}
                  disabled
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px' }}>Thư Mục Lưu Trữ File (Remote Path):</label>
              <input
                type="text"
                value={tempSftpPath}
                onChange={(e) => setTempSftpPath(e.target.value)}
                placeholder="/home/dung.na/Support hoặc /home/f_hcm/Support"
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #0284c7', fontFamily: 'monospace' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setTempSftpPath('/home/dung.na/Support')}
                  style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                >
                  /home/dung.na/Support
                </button>
                <button
                  type="button"
                  onClick={() => setTempSftpPath('/home/f_hcm/Support')}
                  style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                >
                  /home/f_hcm/Support
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL XEM NỘI DUNG LOG / FILE TEXT ── */}
      {previewContent !== null && (
        <Modal
          isOpen={previewContent !== null}
          onClose={() => setPreviewContent(null)}
          title={`Nội Dung File: ${previewFilename}`}
          maxWidth="750px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>Đọc 100 dòng đầu file văn bản/log từ xa</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(previewContent || '');
                    alert('Đã sao chép nội dung vào Clipboard!');
                  }}
                >
                  Sao Chép Nội Dung
                </Button>
                <Button variant="primary" onClick={() => setPreviewContent(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          }
        >
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontSize: '11.5px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}
          >
            {previewContent || '(File trống)'}
          </div>
        </Modal>
      )}
      {/* ── MODAL TRUYỀN HÀNG LOẠT THEO DANH SÁCH IP ── */}
      <BatchPushModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        selectedFile={selectedSftpFile}
        sftpFiles={sftpFiles}
        defaultTargetFolder={targetFolder}
        onSuccess={() => {
          handleListRestaurantFolder(targetIp, targetFolder);
        }}
      />
    </div>
  );
};

export default AgentMultitaskV2Page;
