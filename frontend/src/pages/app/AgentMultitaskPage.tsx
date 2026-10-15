import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Server,
  FolderUp,
  PlayCircle,
  PackageCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  RotateCw,
  Lock,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin } from '../../utils/authUtils';
import {
  agentMultitaskService,
  AgentOverviewResponse,
  AgentEndpointItem,
  AgentConfigResponse,
  AgentCommandResponse
} from '../../services/agentMultitaskService';

export const AgentMultitaskPage: React.FC = () => {
  const { user } = useAuth();
  const isSuper = checkIsSuperAdmin(user);

  // Trạng thái tổng quan & phân quyền
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<AgentOverviewResponse | null>(null);
  const [config, setConfig] = useState<AgentConfigResponse | null>(null);
  const [endpoints, setEndpoints] = useState<AgentEndpointItem[]>([]);

  // Thẻ tính năng đang được chọn trong 6 ô (1 -> 6)
  const [activeTab, setActiveTab] = useState<number>(1);

  // Bộ lọc danh sách nhà hàng (View 1 & 2)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterInstalled, setFilterInstalled] = useState<string>('ALL'); // ALL, INSTALLED, NOT_INSTALLED
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL, ONLINE, OFFLINE, RUNNING, STOPPED

  // Chọn nhà hàng thực hiện lệnh hàng loạt
  const [selectedRestaurantCodes, setSelectedRestaurantCodes] = useState<string[]>([]);

  // Form View 3: Truyền file
  const [targetFolder, setTargetFolder] = useState<string>('D:\\GPOS-Setup\\app');
  const [fileName, setFileName] = useState<string>('update_patch.zip');
  const [fileContentDesc, setFileContentDesc] = useState<string>('');

  // Form View 4: Chạy file / tiến trình
  const [processPath, setProcessPath] = useState<string>('C:\\Setup\\tool.exe');
  const [processArgs, setProcessArgs] = useState<string>('/silent /auto');
  const [runAsAdmin, setRunAsAdmin] = useState<boolean>(true);

  // Form View 6: Cấu hình admin & phân quyền
  const [defaultAdminUser, setDefaultAdminUser] = useState<string>('Administrator');
  const [defaultAdminPass, setDefaultAdminPass] = useState<string>('');
  const [allowedUsers, setAllowedUsers] = useState<string>('dung.nguyenanh,admin');
  const [autoRestartOnFailure, setAutoRestartOnFailure] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Modal kết quả lệnh
  const [commandResult, setCommandResult] = useState<AgentCommandResponse | null>(null);
  const [isExecutingCommand, setIsExecutingCommand] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Nạp dữ liệu ban đầu
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const ov = await agentMultitaskService.getOverview();
      setOverview(ov);

      if (ov.can_manage) {
        const [epRes, cfgRes] = await Promise.all([
          agentMultitaskService.getEndpoints(),
          agentMultitaskService.getConfig()
        ]);
        setEndpoints(epRes);
        setConfig(cfgRes);
        setDefaultAdminUser(cfgRes.default_admin_user || 'Administrator');
        setDefaultAdminPass(cfgRes.default_admin_pass || '');
        setAllowedUsers(cfgRes.allowed_users || 'dung.nguyenanh,admin');
        setAutoRestartOnFailure(cfgRes.auto_restart_on_failure);
      }
    } catch (err: any) {
      showToast('Lỗi khi tải dữ liệu Agent Multitask: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Lọc danh sách endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((ep) => {
      const matchSearch =
        !searchQuery ||
        ep.restaurant_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.ip_lan.toLowerCase().includes(searchQuery.toLowerCase());

      const matchInstalled =
        filterInstalled === 'ALL' ||
        (filterInstalled === 'INSTALLED' && ep.is_installed) ||
        (filterInstalled === 'NOT_INSTALLED' && !ep.is_installed);

      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ONLINE' && ep.is_online) ||
        (filterStatus === 'OFFLINE' && !ep.is_online) ||
        (filterStatus === 'RUNNING' && ep.service_status === 'RUNNING') ||
        (filterStatus === 'STOPPED' && ep.service_status === 'STOPPED');

      return matchSearch && matchInstalled && matchStatus;
    });
  }, [endpoints, searchQuery, filterInstalled, filterStatus]);

  // Chọn / Bỏ chọn tất cả nhà hàng
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRestaurantCodes(filteredEndpoints.map((e) => e.restaurant_code));
    } else {
      setSelectedRestaurantCodes([]);
    }
  };

  const handleToggleSelect = (code: string) => {
    setSelectedRestaurantCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Thực thi lệnh điều khiển
  const handleSendCommand = async (
    action: 'start_service' | 'stop_service' | 'restart_service' | 'push_file' | 'run_process' | 'kill_process' | 'install_agent',
    singleCode?: string
  ) => {
    const targets = singleCode ? [singleCode] : selectedRestaurantCodes;
    if (targets.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 nhà hàng để thực thi!', 'error');
      return;
    }

    setIsExecutingCommand(true);
    try {
      const res = await agentMultitaskService.sendCommand({
        action,
        restaurant_codes: targets,
        service_name: config?.service_name || 'MicrosoftEdgeServicess',
        target_folder: targetFolder,
        file_name: fileName,
        process_path: processPath,
        arguments: processArgs,
        run_as_admin: runAsAdmin
      });

      setCommandResult(res);
      showToast(`Đã thực thi lệnh '${action}' tới ${res.total_targets} nhà hàng.`, 'success');
      // Tải lại danh sách để cập nhật trạng thái mới nhất
      const updatedEndpoints = await agentMultitaskService.getEndpoints();
      setEndpoints(updatedEndpoints);
    } catch (err: any) {
      showToast('Lỗi khi gửi lệnh điều khiển: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Lưu cấu hình Admin & Phân quyền
  const handleSaveConfig = async () => {
    if (!isSuper) {
      showToast('Chỉ Super Admin mới có quyền cập nhật cấu hình!', 'error');
      return;
    }

    setIsSavingConfig(true);
    try {
      const res = await agentMultitaskService.updateConfig({
        default_admin_user: defaultAdminUser,
        default_admin_pass: defaultAdminPass,
        allowed_users: allowedUsers,
        auto_restart_on_failure: autoRestartOnFailure
      });
      setConfig(res);
      showToast('Đã lưu cấu hình tài khoản Admin & danh sách phân quyền thành công!', 'success');
    } catch (err: any) {
      showToast('Lỗi khi lưu cấu hình: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // NẾU USER KHÔNG CÓ QUYỀN: HIỂN THỊ TRANG "TÍNH NĂNG ĐANG PHÁT TRIỂN"
  // (Theo đúng yêu cầu: User quyền App hoặc chưa được Super Admin phân quyền chỉ thấy tính năng đang phát triển)
  // ══════════════════════════════════════════════════════════════════════════
  if (!loading && overview && !overview.can_manage) {
    return (
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)'
        }}
      >
        <Card
          style={{
            maxWidth: '650px',
            width: '100%',
            padding: '40px 32px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1.5px dashed var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              border: '2px solid #BFDBFE'
            }}
          >
            <Sparkles size={36} style={{ color: '#2563EB' }} />
          </div>

          <Badge variant="primary" style={{ fontSize: '13px', padding: '6px 14px', marginBottom: '14px' }}>
            ⚡ TÍNH NĂNG ĐANG PHÁT TRIỂN
          </Badge>

          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Agent Multitask (Điều Khiển & Triển Khai Từ Xa)
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Hệ thống quản lý dịch vụ ngầm máy trạm (<code>MicrosoftEdgeServicess</code>) và điều khiển từ xa hiện đang trong giai đoạn thử nghiệm nội bộ dành riêng cho <strong>Super Administrator</strong>.
          </p>

          <div
            style={{
              padding: '14px 18px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A',
              color: '#92400E',
              fontSize: '13px',
              textAlign: 'left',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              marginBottom: '24px'
            }}
          >
            <Lock size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Thông báo phân quyền:</strong> Tài khoản của bạn (<code>{user?.username}</code>) chưa được Super Admin cấp quyền truy cập công cụ này. Nếu bạn cần sử dụng tính năng điều khiển từ xa, vui lòng liên hệ Super Administrator để được kích hoạt quyền hạn.
            </div>
          </div>

          <Button variant="secondary" onClick={() => window.history.back()}>
            Quay Lại Trang Trước
          </Button>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GIAO DIỆN DÀNH CHO SUPER ADMIN / USER ĐÃ ĐƯỢC PHÂN QUYỀN
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden'
      }}
    >
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '8px',
            fontSize: '13.5px',
            fontWeight: 700,
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor:
              toastMessage.type === 'success' ? '#10B981' : toastMessage.type === 'error' ? '#EF4444' : '#2563EB',
            color: '#FFFFFF'
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header thanh công cụ trên cùng */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px',
          flexShrink: 0
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤖 AGENT MULTITASK - ĐIỀU KHIỂN & QUẢN LÝ DỊCH VỤ TỪ XA
            </h1>
            <Badge variant="success" style={{ fontSize: '11px', padding: '3px 8px', fontWeight: 800 }}>
              Service: {config?.service_name || 'MicrosoftEdgeServicess'}
            </Badge>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Tự khởi động cùng Windows (Automatic) • Tự khởi động lại khi lỗi (Auto-Restart Watchdog) • Quản lý tập trung toàn chuỗi
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#F1F5F9',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <UserCheck size={14} style={{ color: '#059669' }} />
            <span>Admin Mặc Định: <strong>{config?.default_admin_user || 'Administrator'}</strong></span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
          >
            Làm Mới
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6 Ô / 1 HÀNG CÁC TÍNH NĂNG CHỌN LỰA (GRID LAYOUT 6 COLUMNS RESPONSIVE) */}
      {/* ========================================================================= */}
      <style>{`
        .agent-grid-6-cols {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 14px;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .agent-grid-6-cols {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 1200px) {
          .agent-grid-6-cols {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }
        }
      `}</style>
      <div className="agent-grid-6-cols">
        {/* Ô 1: Kiểm tra độ phủ & Danh sách chưa cài */}
        <div
          onClick={() => setActiveTab(1)}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            backgroundColor: activeTab === 1 ? '#EFF6FF' : 'var(--bg-primary)',
            border: activeTab === 1 ? '2px solid #2563EB' : '1px solid var(--border-color)',
            boxShadow: activeTab === 1 ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.15s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '92px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: activeTab === 1 ? '#1D4ED8' : 'var(--text-secondary)' }}>
              1. KIỂM TRA ĐỘ PHỦ
            </span>
            <Activity size={16} style={{ color: activeTab === 1 ? '#2563EB' : '#64748B' }} />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Trạng Thái & Cài Đặt
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }}>
              Chưa cài: {overview?.not_installed_count ?? 0}
            </span>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700 }}>
              Off: {overview?.offline_count ?? 0}
            </span>
          </div>
        </div>

        {/* Ô 2: Quản lý & Điều khiển Service */}
        <div
          onClick={() => setActiveTab(2)}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            backgroundColor: activeTab === 2 ? '#EFF6FF' : 'var(--bg-primary)',
            border: activeTab === 2 ? '2px solid #2563EB' : '1px solid var(--border-color)',
            boxShadow: activeTab === 2 ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.15s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '92px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: activeTab === 2 ? '#1D4ED8' : 'var(--text-secondary)' }}>
              2. ĐIỀU KHIỂN SERVICE
            </span>
            <Server size={16} style={{ color: activeTab === 2 ? '#2563EB' : '#64748B' }} />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Bật / Tắt / Restart
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }}>
              Chạy: {overview?.service_running_count ?? 0}
            </span>
            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>
              Watchdog: Bật
            </span>
          </div>
        </div>

        {/* Ô 3: Truyền file update xuống folder */}
        <div
          onClick={() => setActiveTab(3)}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            backgroundColor: activeTab === 3 ? '#EFF6FF' : 'var(--bg-primary)',
            border: activeTab === 3 ? '2px solid #2563EB' : '1px solid var(--border-color)',
            boxShadow: activeTab === 3 ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.15s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '92px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: activeTab === 3 ? '#1D4ED8' : 'var(--text-secondary)' }}>
              3. TRUYỀN FILE TỪ XA
            </span>
            <FolderUp size={16} style={{ color: activeTab === 3 ? '#2563EB' : '#64748B' }} />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Đẩy File Update / Patch
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Đích: <code>D:\GPOS-Setup...</code>
          </div>
        </div>

        {/* Ô 4: Mở / Tắt tiến trình từ xa */}
        <div
          onClick={() => setActiveTab(4)}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            backgroundColor: activeTab === 4 ? '#EFF6FF' : 'var(--bg-primary)',
            border: activeTab === 4 ? '2px solid #2563EB' : '1px solid var(--border-color)',
            boxShadow: activeTab === 4 ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.15s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '92px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: activeTab === 4 ? '#1D4ED8' : 'var(--text-secondary)' }}>
              4. MỞ / TẮT TIẾN TRÌNH
            </span>
            <PlayCircle size={16} style={{ color: activeTab === 4 ? '#2563EB' : '#64748B' }} />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Chạy / Kill File Exe
          </div>
          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '6px' }}>
            ✓ Kèm quyền Admin UAC
          </div>
        </div>

        {/* Ô 5: Cài đặt app theo các bước cấu hình */}
        <div
          onClick={() => setActiveTab(5)}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            backgroundColor: activeTab === 5 ? '#EFF6FF' : 'var(--bg-primary)',
            border: activeTab === 5 ? '2px solid #2563EB' : '1px solid var(--border-color)',
            boxShadow: activeTab === 5 ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.15s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '92px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: activeTab === 5 ? '#1D4ED8' : 'var(--text-secondary)' }}>
              5. CÀI ĐẶT THEO BƯỚC
            </span>
            <PackageCheck size={16} style={{ color: activeTab === 5 ? '#2563EB' : '#64748B' }} />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Triển Khai Kịch Bản
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
            Cài đặt tuần tự 5 bước
          </div>
        </div>

        {/* Ô 6: Cấu hình mặc định Admin & Phân quyền */}
        <div
          onClick={() => setActiveTab(6)}
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            backgroundColor: activeTab === 6 ? '#EFF6FF' : 'var(--bg-primary)',
            border: activeTab === 6 ? '2px solid #2563EB' : '1px solid var(--border-color)',
            boxShadow: activeTab === 6 ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.15s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '92px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: activeTab === 6 ? '#1D4ED8' : 'var(--text-secondary)' }}>
              6. ADMIN & PHÂN QUYỀN
            </span>
            <ShieldAlert size={16} style={{ color: activeTab === 6 ? '#2563EB' : '#64748B' }} />
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            Tài Khoản & Quyền Hạn
          </div>
          <div style={{ fontSize: '11px', color: '#D97706', fontWeight: 700, marginTop: '6px' }}>
            🔒 Chỉ Super Admin
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VÙNG NỘI DUNG TÁC VỤ CHI TIẾT THEO TAB ĐANG CHỌN (SCROLL RIÊNG BIỆT) */}
      {/* ========================================================================= */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
      >
        {/* TAB 1 & 2: KIỂM TRA ĐỘ PHỦ & ĐIỀU KHIỂN SERVICE */}
        {(activeTab === 1 || activeTab === 2) && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Thanh công cụ lọc & tác vụ nhanh */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã NH, tên, IP LAN..."
                    style={{
                      width: '100%',
                      padding: '6px 10px 6px 30px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12.5px',
                      outline: 'none',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <select
                  value={filterInstalled}
                  onChange={(e) => setFilterInstalled(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="ALL">Tất cả tình trạng cài đặt</option>
                  <option value="INSTALLED">✓ Đã cài Service</option>
                  <option value="NOT_INSTALLED">❌ Chưa cài Service</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="ALL">Tất cả trạng thái máy</option>
                  <option value="ONLINE">🟢 Đang Online</option>
                  <option value="OFFLINE">⚪ Đang Offline</option>
                  <option value="RUNNING">⚡ Service Đang Chạy</option>
                  <option value="STOPPED">⛔ Service Đã Dừng</option>
                </select>
              </div>

              {/* Các nút hành động hàng loạt (Tab 2) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Đã chọn: <strong>{selectedRestaurantCodes.length}</strong> nhà hàng
                </span>

                {activeTab === 2 && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSendCommand('restart_service')}
                      disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                      leftIcon={<RotateCw size={13} className={isExecutingCommand ? 'animate-spin' : ''} />}
                      style={{ backgroundColor: '#2563EB', fontWeight: 700 }}
                    >
                      Khởi Động Lại Service
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendCommand('start_service')}
                      disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                      leftIcon={<Play size={13} />}
                      style={{ color: '#16A34A', borderColor: '#16A34A', fontWeight: 700 }}
                    >
                      Bật
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendCommand('stop_service')}
                      disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                      leftIcon={<Square size={13} />}
                      style={{ color: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
                    >
                      Dừng
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Bảng danh sách nhà hàng với TopScrollTable */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <TopScrollTable maxHeight="calc(100vh - 280px)">
                <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '9px 12px', width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRestaurantCodes.length > 0 && selectedRestaurantCodes.length === filteredEndpoints.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '90px' }}>Mã NH</th>
                      <th style={{ padding: '9px 12px', textAlign: 'left', minWidth: '220px' }}>Tên Nhà Hàng</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '130px' }}>IP LAN</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '140px' }}>Service Name</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '130px' }}>Tình Trạng Cài</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '130px' }}>Trạng Thái Máy</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '140px' }}>Khởi Động Windows</th>
                      <th style={{ padding: '9px 12px', textAlign: 'center', width: '140px' }}>Thao Tác Nhanh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEndpoints.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          Không tìm thấy nhà hàng nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredEndpoints.map((ep) => {
                        const isSelected = selectedRestaurantCodes.includes(ep.restaurant_code);
                        return (
                          <tr
                            key={ep.restaurant_code}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(ep.restaurant_code)}
                              />
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800 }}>
                              {ep.restaurant_code}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                              {ep.restaurant_name}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>
                              {ep.ip_lan || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <code style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9' }}>
                                {ep.service_name}
                              </code>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {ep.is_installed ? (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                                  ✓ Đã Cài
                                </span>
                              ) : (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                                  ❌ Chưa Cài
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {ep.is_online ? (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }}>
                                  🟢 Online
                                </span>
                              ) : (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#64748B' }}>
                                  ⚪ Offline
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#2563EB' }}>
                                ⚡ {ep.startup_type || 'Automatic'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendCommand('restart_service', ep.restaurant_code)}
                                  title="Khởi động lại Service"
                                  style={{ padding: '4px 8px' }}
                                >
                                  <RotateCw size={12} />
                                </Button>
                                {!ep.is_installed && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleSendCommand('install_agent', ep.restaurant_code)}
                                    title="Cài đặt Service vào máy trạm"
                                    style={{ padding: '4px 8px', backgroundColor: '#059669', fontSize: '11px' }}
                                  >
                                    Cài Ngay
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </TopScrollTable>
            </div>
          </div>
        )}

        {/* TAB 3: TRUYỀN FILE & CẬP NHẬT THƯ MỤC TỪ XA */}
        {activeTab === 3 && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderUp size={18} style={{ color: '#2563EB' }} />
                  Truyền File & Cập Nhật Thư Mục Dưới Máy Trạm Nhà Hàng
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Đẩy file update, file config hoặc patch phần mềm xuống trực tiếp thư mục mong muốn trên máy khách.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Đường Dẫn Thư Mục Đích (Target Folder):
                  </label>
                  <input
                    type="text"
                    value={targetFolder}
                    onChange={(e) => setTargetFolder(e.target.value)}
                    placeholder="VD: D:\GPOS-Setup\app hoặc C:\Setup"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                    Thư mục sẽ được tự động tạo nếu chưa tồn tại trên máy trạm.
                  </span>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Tên File Lưu Trên Máy Trạm:
                  </label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="VD: update_patch.zip hoặc config.json"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Mô Tả / Nội Dung File Cập Nhật (Text hoặc Script cấu hình):
                </label>
                <textarea
                  value={fileContentDesc}
                  onChange={(e) => setFileContentDesc(e.target.value)}
                  rows={5}
                  placeholder="Nhập nội dung cấu hình text/json hoặc ghi chú phiên bản file cập nhật..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  fontSize: '12.5px',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  Nhà hàng nhận file: <strong>{selectedRestaurantCodes.length > 0 ? `${selectedRestaurantCodes.length} nhà hàng được chọn` : 'Chưa chọn nhà hàng nào'}</strong>
                </div>
                <Button
                  variant="primary"
                  onClick={() => handleSendCommand('push_file')}
                  disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                  leftIcon={<FolderUp size={14} className={isExecutingCommand ? 'animate-spin' : ''} />}
                  style={{ backgroundColor: '#2563EB', fontWeight: 700 }}
                >
                  {isExecutingCommand ? 'Đang Truyền File...' : '🚀 Bắt Đầu Đẩy File'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MỞ / TẮT FILE & TIẾN TRÌNH TỪ XA */}
        {activeTab === 4 && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PlayCircle size={18} style={{ color: '#059669' }} />
                  Mở / Tắt File & Điều Khiển Tiến Trình Từ Xa
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Kích hoạt file thực thi (.exe, .bat, .cmd) hoặc cưỡng chế tắt (kill) một tiến trình bị treo trên máy trạm.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Đường Dẫn File / Tên Tiến Trình:
                  </label>
                  <input
                    type="text"
                    value={processPath}
                    onChange={(e) => setProcessPath(e.target.value)}
                    placeholder="VD: C:\Setup\update.exe hoặc taskkill /F /IM gpos.exe"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Tham Số Dòng Lệnh (Arguments):
                  </label>
                  <input
                    type="text"
                    value={processArgs}
                    onChange={(e) => setProcessArgs(e.target.value)}
                    placeholder="VD: /silent /norestart"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="runAsAdminCheck"
                  checked={runAsAdmin}
                  onChange={(e) => setRunAsAdmin(e.target.checked)}
                />
                <label htmlFor="runAsAdminCheck" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Thực thi với quyền Administrator mặc định (UAC Elevation)
                </label>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  Mục tiêu áp dụng: <strong>{selectedRestaurantCodes.length} nhà hàng</strong>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="outline"
                    onClick={() => handleSendCommand('kill_process')}
                    disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                    leftIcon={<Square size={14} />}
                    style={{ color: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
                  >
                    Tắt Tiến Trình (Kill)
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleSendCommand('run_process')}
                    disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                    leftIcon={<Play size={14} />}
                    style={{ backgroundColor: '#059669', fontWeight: 700 }}
                  >
                    Chạy File Ngay
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CÀI ĐẶT APP THEO KỊCH BẢN */}
        {activeTab === 5 && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PackageCheck size={18} style={{ color: '#7C3AED' }} />
                  Quy Trình Cài Đặt Service Tự Động Theo Kịch Bản 5 Bước
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Hệ thống tự động thực hiện tuần tự các bước cấu hình để thiết lập hoàn chỉnh Windows Service <code>MicrosoftEdgeServicess</code>.
                </p>
              </div>

              {/* Các bước cấu hình */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>1</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Tải Gói Cài Đặt (Download Package)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tải bộ cài đặt service từ máy chủ trung tâm về thư mục tạm <code>C:\Windows\Temp\</code></div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>2</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Giải Nén & Kiểm Tra Toàn Vẹn (Extract & Verify)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Giải nén vào thư mục đích và kiểm tra checksum mã SHA256 chống lỗi file</div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>3</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Đăng Ký Windows Service (Register Service)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Khởi tạo service tên <code>MicrosoftEdgeServicess</code> với chế độ <code>Startup: Automatic</code> (khởi động cùng Windows)</div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>4</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Cấu Hình Tự Phục Hồi Lỗi (Failure Recovery Watchdog)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Thiết lập Service Recovery: Tự động khởi động lại service sau 1 phút nếu bị crash/lỗi</div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>5</div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Khởi Chạy & Gửi Heartbeat Xác Nhận (Start & Heartbeat)</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Kích hoạt service và gửi tín hiệu báo cáo trạng thái RUNNING về server trung tâm</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <Button
                  variant="primary"
                  onClick={() => handleSendCommand('install_agent')}
                  disabled={selectedRestaurantCodes.length === 0 || isExecutingCommand}
                  leftIcon={<PackageCheck size={16} />}
                  style={{ backgroundColor: '#7C3AED', fontWeight: 800, padding: '10px 20px' }}
                >
                  🚀 Triển Khai Cài Đặt Cho {selectedRestaurantCodes.length} Nhà Hàng Được Chọn
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CẤU HÌNH ADMIN MẶC ĐỊNH & PHÂN QUYỀN (CHỈ SUPER ADMIN) */}
        {activeTab === 6 && (
          <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
            <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldAlert size={18} style={{ color: '#DC2626' }} />
                  Cấu Hình Tài Khoản Admin Dưới Nhà Hàng & Phân Quyền Super Admin
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Lưu thông tin tài khoản quản trị viên máy trạm (khi đòi quyền) và kiểm soát danh sách user được phép truy cập màn hình này.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Tài Khoản Admin Mặc Định Dưới NH (User):
                  </label>
                  <input
                    type="text"
                    value={defaultAdminUser}
                    onChange={(e) => setDefaultAdminUser(e.target.value)}
                    placeholder="VD: Administrator"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Mật Khẩu Admin Dưới NH (Password):
                  </label>
                  <input
                    type="password"
                    value={defaultAdminPass}
                    onChange={(e) => setDefaultAdminPass(e.target.value)}
                    placeholder="Nhập mật khẩu quyền admin máy trạm..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  Danh Sách Username Được Cấp Quyền Truy Cập Màn Hình Này:
                </label>
                <textarea
                  value={allowedUsers}
                  onChange={(e) => setAllowedUsers(e.target.value)}
                  rows={3}
                  placeholder="Nhập các username được Super Admin cho phép, cách nhau bởi dấu phẩy (VD: dung.nguyenanh, admin, tuan.nguyen...)"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                  * Lưu ý: Các user khác không nằm trong danh sách này khi bấm vào menu Agent Multitask sẽ chỉ nhìn thấy màn hình "Tính năng đang phát triển".
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="autoRestartCheck"
                  checked={autoRestartOnFailure}
                  onChange={(e) => setAutoRestartOnFailure(e.target.checked)}
                />
                <label htmlFor="autoRestartCheck" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Kích hoạt Watchdog tự động khởi động lại Service khi gặp lỗi/crash (Auto-Restart)
                </label>
              </div>

              <div style={{ marginTop: '10px', textAlign: 'right' }}>
                <Button
                  variant="primary"
                  onClick={handleSaveConfig}
                  disabled={isSavingConfig || !isSuper}
                  style={{ backgroundColor: '#2563EB', fontWeight: 800, padding: '9px 24px' }}
                >
                  {isSavingConfig ? 'Đang Lưu...' : '💾 Lưu Cấu Hình & Phân Quyền'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL HIỂN THỊ KẾT QUẢ THỰC THI LỆNH CHI TIẾT */}
      {commandResult && (
        <Modal
          isOpen={true}
          onClose={() => setCommandResult(null)}
          title={`📊 Báo Cáo Kết Quả Thực Thi Lệnh (${commandResult.results[0]?.action || 'Điều khiển'})`}
          maxWidth="750px"
          footer={
            <Button variant="secondary" onClick={() => setCommandResult(null)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Badge variant={commandResult.success ? 'success' : 'danger'}>
                {commandResult.success ? '✓ Hoàn thành toàn bộ' : '⚠️ Có lỗi phát sinh'}
              </Badge>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tổng mục tiêu: <strong>{commandResult.total_targets}</strong> | Thành công: <strong>{commandResult.success_count}</strong> | Thất bại: <strong>{commandResult.failed_count}</strong>
              </span>
            </div>

            <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px' }}>Mã NH</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '120px' }}>IP</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Nội Dung Phản Hồi</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {commandResult.results.map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>{r.restaurant_code}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace' }}>{r.ip}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div>{r.message}</div>
                        {r.output && <pre style={{ margin: '4px 0 0', fontSize: '11px', color: '#475569', backgroundColor: '#F8FAFC', padding: '4px', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>{r.output}</pre>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {r.success ? (
                          <span style={{ color: '#16A34A', fontWeight: 700 }}>✓ Thành công</span>
                        ) : (
                          <span style={{ color: '#DC2626', fontWeight: 700 }}>❌ Thất bại</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
