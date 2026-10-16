import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
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
  Sparkles,
  Download,
  Plus,
  Settings,
  Monitor,
  Edit,
  Trash2
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

  // ══════════════════════════════════════════════════════════════════════════
  // TRẠNG THÁI DỮ LIỆU TỔNG QUAN & DANH SÁCH THIẾT BỊ
  // ══════════════════════════════════════════════════════════════════════════
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<AgentOverviewResponse | null>(null);
  const [config, setConfig] = useState<AgentConfigResponse | null>(null);
  const [endpoints, setEndpoints] = useState<AgentEndpointItem[]>([]);

  // Modal Tính Năng Tổng Hợp (Gom gọn như KDS Features popup)
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState<boolean>(false);

  // Modal Chi Tiết Từng Công Cụ (khi người dùng bấm vào card trong popup)
  const [activeActionModal, setActiveActionModal] = useState<
    'SERVICE' | 'PUSH_FILE' | 'PROCESS' | 'INSTALL' | 'CONFIG' | null
  >(null);

  // Modal Thêm Thiết Bị / User Ngoài
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState<boolean>(false);
  const [addCode, setAddCode] = useState<string>('');
  const [addName, setAddName] = useState<string>('');
  const [addIp, setAddIp] = useState<string>('');
  const [addMachineName, setAddMachineName] = useState<string>('');
  const [addDeviceType, setAddDeviceType] = useState<string>('EXTERNAL'); // RESTAURANT, EXTERNAL, USER
  const [addUserAssigned, setAddUserAssigned] = useState<string>('');
  const [addNotes, setAddNotes] = useState<string>('');
  const [isAddingDevice, setIsAddingDevice] = useState<boolean>(false);

  // Modal Chỉnh Sửa Thiết Bị / Tên Máy Trạm
  const [editingEndpoint, setEditingEndpoint] = useState<AgentEndpointItem | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const [editIp, setEditIp] = useState<string>('');
  const [editMachineName, setEditMachineName] = useState<string>('');
  const [editDeviceType, setEditDeviceType] = useState<string>('EXTERNAL'); // RESTAURANT, EXTERNAL, USER
  const [editUserAssigned, setEditUserAssigned] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);


  // Bộ lọc danh sách thiết bị
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL, ONLINE, OFFLINE, RUNNING, STOPPED
  const [filterDeviceType, setFilterDeviceType] = useState<string>('ALL'); // ALL, RESTAURANT, EXTERNAL, USER
  const [filterRole, setFilterRole] = useState<string>('ALL'); // ALL, SERVER_11, POS_12, KDS_41, OTHER

  // Danh sách ID thiết bị đang được chọn (hỗ trợ tích chọn từng máy độc lập trong cùng 1 nhà hàng)
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<number[]>([]);

  // Form Truyền File Cập Nhật (Push File)
  const [targetFolder, setTargetFolder] = useState<string>('D:\\GPOS-Setup\\app');
  const [fileName, setFileName] = useState<string>('update_patch.zip');
  const [fileContentDesc, setFileContentDesc] = useState<string>('');

  // Form Mở / Tắt Tiến Trình (Run / Kill Process)
  const [processPath, setProcessPath] = useState<string>('C:\\Setup\\tool.exe');
  const [processArgs, setProcessArgs] = useState<string>('/silent /auto');
  const [runAsAdmin, setRunAsAdmin] = useState<boolean>(true);

  // Form Cấu Hình Admin & Phân Quyền
  const [defaultAdminUser, setDefaultAdminUser] = useState<string>('Administrator');
  const [defaultAdminPass, setDefaultAdminPass] = useState<string>('');
  const [allowedUsers, setAllowedUsers] = useState<string>('dung.nguyenanh,admin');
  const [autoRestartOnFailure, setAutoRestartOnFailure] = useState<boolean>(true);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Modal kết quả lệnh & Toast thông báo
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

  // Xác định vai trò chuẩn của máy dựa vào địa chỉ IP
  const getMachineRole = (ip: string) => {
    if (!ip) return { role: 'OTHER', label: 'Chưa có IP', badgeColor: '#64748B' };
    const clean = ip.trim();
    const tail = clean.split('.').pop()?.toLowerCase();
    if (tail === '11') {
      return { role: 'SERVER_11', label: 'Máy Chủ / POS 1 (.11)', badgeColor: '#2563EB' };
    }
    if (tail === '12') {
      return { role: 'POS_12', label: 'Thu Ngân 2 (.12)', badgeColor: '#D97706' };
    }
    if (tail === '41') {
      return { role: 'KDS_41', label: 'Trạm Bếp KDS (.41)', badgeColor: '#059669' };
    }
    if (tail === 'x') {
      return { role: 'OTHER', label: 'Dải IP Nhà Hàng', badgeColor: '#64748B' };
    }
    if (tail === '1') {
      return { role: 'OTHER', label: 'Router Gateway .1', badgeColor: '#64748B' };
    }
    return { role: 'OTHER', label: `Trạm .${tail}`, badgeColor: '#475569' };
  };

  // Tách danh sách mã tìm kiếm (hỗ trợ dán nhiều mã ngăn cách bởi dấu phẩy, dấu cách, chấm phẩy, tab hoặc xuống dòng từ Excel)
  const searchTokens = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchQuery
      .split(/[\s,;\n\r\t]+/)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
  }, [searchQuery]);

  // Xử lý khi người dùng dán (paste) hàng loạt mã nhà hàng (từ Excel, Notepad, tin nhắn...)
  const handlePasteSearch = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && /[\n\r,;\t]/.test(pastedText)) {
      e.preventDefault();
      const rawCodes = pastedText
        .split(/[\s,;\n\r\t]+/)
        .map((c) => c.trim())
        .filter(Boolean);

      const uniqueCodes = Array.from(new Set(rawCodes));
      const formatted = uniqueCodes.join(', ');
      setSearchQuery(formatted);

      // Tự động tìm và tích chọn tất cả các máy tương ứng với danh sách mã vừa dán
      const codeSet = new Set(uniqueCodes.map((c) => c.toLowerCase()));
      const matched = endpoints.filter((ep) =>
        codeSet.has(ep.restaurant_code.toLowerCase())
      );
      const matchedIds = matched.map((ep) => ep.id ?? 0).filter((id) => id > 0);

      if (matchedIds.length > 0) {
        setSelectedEndpointIds(matchedIds);
        showToast(
          `Đã nhận diện ${uniqueCodes.length} mã và tự động tích chọn ${matchedIds.length} máy!`,
          'success'
        );
      } else {
        showToast(`Đã nhận diện ${uniqueCodes.length} mã nhà hàng trong ô tìm kiếm.`, 'info');
      }
    }
  };

  // Lọc danh sách endpoints
  const filteredEndpoints = useMemo(() => {
    const isMultiCode = searchTokens.length > 1;
    const tokenSet = isMultiCode ? new Set(searchTokens) : null;

    return endpoints.filter((ep) => {
      let matchSearch = true;
      if (searchTokens.length === 1) {
        const q = searchTokens[0];
        matchSearch =
          ep.restaurant_code.toLowerCase().includes(q) ||
          ep.restaurant_name.toLowerCase().includes(q) ||
          ep.ip_lan.toLowerCase().includes(q) ||
          Boolean(ep.machine_name?.toLowerCase().includes(q)) ||
          Boolean(ep.user_assigned?.toLowerCase().includes(q)) ||
          Boolean(ep.notes?.toLowerCase().includes(q));
      } else if (isMultiCode && tokenSet) {
        // Nếu dán nhiều mã: Khớp mã nhà hàng chính xác hoặc nằm trong danh sách mã đã dán
        const epCode = ep.restaurant_code.toLowerCase();
        matchSearch =
          tokenSet.has(epCode) ||
          searchTokens.some(
            (t) =>
              epCode === t ||
              epCode.startsWith(t) ||
              ep.restaurant_name.toLowerCase().includes(t) ||
              ep.ip_lan.toLowerCase().includes(t)
          );
      }

      const matchStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'ONLINE' && ep.is_online) ||
        (filterStatus === 'OFFLINE' && !ep.is_online) ||
        (filterStatus === 'RUNNING' && ep.service_status === 'RUNNING') ||
        (filterStatus === 'STOPPED' && ep.service_status === 'STOPPED');

      const matchDeviceType =
        filterDeviceType === 'ALL' ||
        (ep.device_type || 'RESTAURANT') === filterDeviceType;

      const roleInfo = getMachineRole(ep.ip_lan);
      const matchRole =
        filterRole === 'ALL' ||
        roleInfo.role === filterRole;

      return matchSearch && matchStatus && matchDeviceType && matchRole;
    });
  }, [endpoints, searchTokens, filterStatus, filterDeviceType, filterRole]);

  // Chọn / Bỏ chọn tất cả máy trong danh sách đang lọc
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = filteredEndpoints.map((e) => e.id ?? 0).filter((id) => id > 0);
      setSelectedEndpointIds(allIds);
    } else {
      setSelectedEndpointIds([]);
    }
  };

  const handleToggleSelect = (id?: number) => {
    if (!id) return;
    setSelectedEndpointIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Lấy danh sách các đối tượng endpoint đang được chọn
  const selectedEndpoints = useMemo(() => {
    return endpoints.filter((ep) => ep.id && selectedEndpointIds.includes(ep.id));
  }, [endpoints, selectedEndpointIds]);

  // Thực thi lệnh điều khiển từ xa
  const handleSendCommand = async (
    action: 'start_service' | 'stop_service' | 'restart_service' | 'push_file' | 'run_process' | 'kill_process' | 'install_agent',
    singleEndpoint?: AgentEndpointItem
  ) => {
    const targets = singleEndpoint ? [singleEndpoint] : selectedEndpoints;
    if (targets.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 thiết bị để thực thi lệnh!', 'error');
      return;
    }

    setIsExecutingCommand(true);
    try {
      const targetCodes = targets.map((t) => t.restaurant_code);
      const res = await agentMultitaskService.sendCommand({
        action,
        restaurant_codes: targetCodes,
        target_ip: singleEndpoint ? singleEndpoint.ip_lan : undefined,
        service_name: config?.service_name || 'MicrosoftEdgeServicess',
        target_folder: targetFolder,
        file_name: fileName,
        file_content_base64: fileContentDesc,
        process_path: processPath,
        arguments: processArgs,
        run_as_admin: runAsAdmin
      });

      setCommandResult(res);
      showToast(`Đã gửi lệnh '${action}' tới ${res.total_targets} thiết bị thành công.`, 'success');
      // Đóng modal tác vụ con nếu đang mở
      setActiveActionModal(null);
      // Tải lại dữ liệu mới nhất
      const updatedEndpoints = await agentMultitaskService.getEndpoints();
      setEndpoints(updatedEndpoints);
    } catch (err: any) {
      showToast('Lỗi khi gửi lệnh điều khiển: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Thêm mới máy ngoài / user quản trị từ xa
  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCode.trim() || !addName.trim() || !addIp.trim()) {
      showToast('Vui lòng nhập đầy đủ Mã, Tên thiết bị và Địa chỉ IP!', 'error');
      return;
    }

    setIsAddingDevice(true);
    try {
      await agentMultitaskService.createEndpoint({
        restaurant_code: addCode.trim(),
        restaurant_name: addName.trim(),
        ip_lan: addIp.trim(),
        machine_name: addMachineName.trim() || undefined,
        device_type: addDeviceType,
        user_assigned: addUserAssigned.trim() || undefined,
        notes: addNotes.trim() || undefined
      });

      showToast(`Đã thêm thiết bị '${addName}' thành công!`, 'success');
      setIsAddDeviceModalOpen(false);
      // Reset form
      setAddCode('');
      setAddName('');
      setAddIp('');
      setAddMachineName('');
      setAddUserAssigned('');
      setAddNotes('');
      // Nạp lại danh sách
      await loadAllData();
    } catch (err: any) {
      showToast('Lỗi khi thêm thiết bị: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsAddingDevice(false);
    }
  };

  // Mở modal chỉnh sửa thông tin thiết bị / máy trạm
  const handleOpenEditModal = (ep: AgentEndpointItem) => {
    setEditingEndpoint(ep);
    setEditName(ep.restaurant_name || '');
    setEditCode(ep.restaurant_code || '');
    setEditIp(ep.ip_lan || '');
    setEditMachineName(ep.machine_name || '');
    setEditDeviceType(ep.device_type || 'EXTERNAL');
    setEditUserAssigned(ep.user_assigned || '');
    setEditNotes(ep.notes || '');
  };

  // Lưu chỉnh sửa thông tin thiết bị / máy trạm
  const handleSaveEditEndpoint = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingEndpoint?.id) return;
    if (!editName.trim()) {
      showToast('Vui lòng nhập tên thiết bị / mô tả máy.', 'error');
      return;
    }
    if (!editCode.trim()) {
      showToast('Vui lòng nhập mã định danh thiết bị.', 'error');
      return;
    }
    if (!editIp.trim()) {
      showToast('Vui lòng nhập địa chỉ IP LAN/WAN.', 'error');
      return;
    }

    setIsSavingEdit(true);
    try {
      await agentMultitaskService.updateEndpoint(editingEndpoint.id, {
        restaurant_name: editName.trim(),
        restaurant_code: editCode.trim(),
        ip_lan: editIp.trim(),
        machine_name: editMachineName.trim() || undefined,
        device_type: editDeviceType as any,
        user_assigned: editUserAssigned.trim() || undefined,
        notes: editNotes.trim() || undefined
      });

      showToast(`Đã cập nhật thông tin thiết bị "${editName.trim()}" thành công!`, 'success');
      setEditingEndpoint(null);
      await loadAllData();
    } catch (err: any) {
      showToast('Lỗi khi cập nhật thiết bị: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Xóa thiết bị ngoài / máy test / user
  const handleDeleteEndpoint = async (ep: AgentEndpointItem) => {
    if (!ep.id) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thiết bị "${ep.restaurant_name}" (${ep.restaurant_code} - ${ep.ip_lan}) khỏi hệ thống?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await agentMultitaskService.deleteEndpoint(ep.id);
      showToast(`Đã xóa thiết bị "${ep.restaurant_name}" thành công!`, 'success');
      if (editingEndpoint?.id === ep.id) {
        setEditingEndpoint(null);
      }
      await loadAllData();
    } catch (err: any) {
      showToast('Lỗi khi xóa thiết bị: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsDeleting(false);
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
      showToast('Đã lưu cấu hình tài khoản Admin & phân quyền thành công!', 'success');
      setActiveActionModal(null);
    } catch (err: any) {
      showToast('Lỗi khi lưu cấu hình: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Tải gói cài đặt ZIP Client Agent
  const handleDownloadAgentPackage = async () => {
    try {
      showToast('Đang tải bộ cài đặt Client Agent (.ZIP)...', 'info');
      await agentMultitaskService.downloadAgentPackage();
      showToast('Đã tải xuống Restaurant_Support_Agent_Full.zip thành công!', 'success');
    } catch (err: any) {
      showToast('Lỗi khi tải bộ cài: ' + (err?.response?.data?.detail || err.message), 'error');
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // NẾU USER KHÔNG CÓ QUYỀN: HIỂN THỊ TRANG "TÍNH NĂNG ĐANG PHÁT TRIỂN"
  // (Người dùng quyền App hoặc chưa được Super Admin phân quyền chỉ thấy trang này)
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
  // GIAO DIỆN CHÍNH (SINGLE-SCREEN VIEWPORT, TOP TOOLBAR & SCROLL TABLE)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '14px 20px',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        overflow: 'hidden'
      }}
    >
      {/* Toast thông báo nhanh */}
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. HEADER THANH CÔNG CỤ TRÊN CÙNG */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '10px',
          flexShrink: 0
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '19px',
                fontWeight: 900,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🤖 AGENT MULTITASK - ĐIỀU KHIỂN & HỖ TRỢ TỪ XA
            </h1>
            <Badge variant="success" style={{ fontSize: '11px', padding: '2px 8px', fontWeight: 800 }}>
              Service: MicrosoftEdgeServicess
            </Badge>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Hỗ trợ đa máy trạm (.11 Server/POS 1, .12 POS 2, .41 KDS) & Máy ngoài • Auto-Start • Watchdog phục hồi
          </div>
        </div>

        {/* CÁC NÚT HÀNH ĐỘNG TRỌNG TÂM */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* NÚT POPUP CÁC TÍNH NĂNG GOM GỌN (THEO CHUẨN KDS POPUP CỦA USER) */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsFeaturesModalOpen(true)}
            leftIcon={<Settings size={15} />}
            style={{
              backgroundColor: '#2563EB',
              fontWeight: 800,
              boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
            }}
          >
            ⚙️ Các Tính Năng Hỗ Trợ ▾
          </Button>

          {/* NÚT THÊM MÁY / USER NGOÀI */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddDeviceModalOpen(true)}
            leftIcon={<Plus size={14} style={{ color: '#059669' }} />}
            style={{ fontWeight: 700, borderColor: '#059669', color: '#059669' }}
          >
            ➕ Thêm Máy / User Ngoài
          </Button>

          {/* TẢI BỘ CÀI AGENT */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAgentPackage}
            leftIcon={<Download size={14} style={{ color: 'var(--color-primary)' }} />}
          >
            Tải Gói Cài (.ZIP)
          </Button>

          {/* LÀM MỚI DỮ LIỆU */}
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. THANH BỘ LỌC TÌM KIẾM & THAO TÁC HÀNG LOẠT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '10px',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
          {/* Ô tìm kiếm từ khóa & Hỗ trợ dán hàng loạt từ Excel */}
          <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '380px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onPaste={handlePasteSearch}
              placeholder="Tìm hoặc dán nhiều mã NH (Excel, phẩy, cách)..."
              title="Hỗ trợ dán hàng loạt mã nhà hàng từ Excel (copy cột mã), dấu phẩy, cách hoặc xuống dòng"
              style={{
                width: '100%',
                padding: '6px 28px 6px 30px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '12.5px',
                outline: 'none',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedEndpointIds([]);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: 700,
                  padding: '2px 4px'
                }}
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nút tích chọn hàng loạt nhanh khi dán nhiều mã */}
          {searchTokens.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const matchedIds = filteredEndpoints.map((ep) => ep.id ?? 0).filter((id) => id > 0);
                setSelectedEndpointIds(matchedIds);
                showToast(`Đã tích chọn ${matchedIds.length} máy theo ${searchTokens.length} mã đã dán!`, 'success');
              }}
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '5px 10px',
                borderColor: '#2563EB',
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                whiteSpace: 'nowrap'
              }}
            >
              ☑️ Tích chọn ({filteredEndpoints.length} máy)
            </Button>
          )}

          {/* Dropdown Lọc Loại Thiết Bị */}
          <select
            value={filterDeviceType}
            onChange={(e) => setFilterDeviceType(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '12.5px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="ALL">Tất cả loại thiết bị</option>
            <option value="RESTAURANT">🏢 Máy Nhà Hàng</option>
            <option value="EXTERNAL">💻 Máy Ngoài / Văn Phòng</option>
            <option value="USER">👤 Thiết Bị Cá Nhân User</option>
          </select>

          {/* Dropdown Lọc Vai Trò Trạm (.11, .12, .41) */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '12.5px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          >
            <option value="ALL">Tất cả vai trò trạm</option>
            <option value="SERVER_11">⚡ .11 (Máy Chủ / POS 1)</option>
            <option value="POS_12">💻 .12 (Thu Ngân 2)</option>
            <option value="KDS_41">🍳 .41 (Trạm Bếp KDS)</option>
            <option value="OTHER">🖥️ Trạm Khác</option>
          </select>

          {/* Dropdown Lọc Trạng Thái Máy */}
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
            <option value="RUNNING">⚡ Service RUNNING</option>
            <option value="STOPPED">⛔ Service STOPPED</option>
          </select>
        </div>

        {/* Thao tác hàng loạt nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Đã chọn: <strong style={{ color: 'var(--color-primary)' }}>{selectedEndpointIds.length}</strong> / {filteredEndpoints.length} máy
          </span>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSendCommand('restart_service')}
            disabled={selectedEndpointIds.length === 0 || isExecutingCommand}
            leftIcon={<RotateCw size={13} className={isExecutingCommand ? 'animate-spin' : ''} />}
            style={{ backgroundColor: '#2563EB', fontWeight: 700 }}
          >
            Restart Service
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendCommand('start_service')}
            disabled={selectedEndpointIds.length === 0 || isExecutingCommand}
            leftIcon={<Play size={13} />}
            style={{ color: '#16A34A', borderColor: '#16A34A', fontWeight: 700 }}
          >
            Bật
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSendCommand('stop_service')}
            disabled={selectedEndpointIds.length === 0 || isExecutingCommand}
            leftIcon={<Square size={13} />}
            style={{ color: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
          >
            Dừng
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. BẢNG DỮ LIỆU ĐA MÁY TRẠM & THIẾT BỊ NGOÀI (SCROLL RIÊNG BIỆT) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}
      >
        <TopScrollTable maxHeight="calc(100vh - 225px)">
          <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-color)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}
              >
                <th style={{ padding: '8px 10px', width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={
                      selectedEndpointIds.length > 0 &&
                      selectedEndpointIds.length === filteredEndpoints.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Mã Đ.Danh</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', minWidth: '220px' }}>Tên Thiết Bị / Nhà Hàng</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '190px' }}>IP LAN & Vai Trò Trạm</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '160px' }}>Phân Loại & User</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '120px' }}>Tình Trạng Cài</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '120px' }}>Trạng Thái Kết Nối</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>Khởi Động Win</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>Lần Cuối Báo Cáo</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>Thao Tác Nhanh</th>
              </tr>
            </thead>
            <tbody>
              {filteredEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Không tìm thấy thiết bị nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredEndpoints.map((ep) => {
                  const isSelected = ep.id ? selectedEndpointIds.includes(ep.id) : false;
                  const roleInfo = getMachineRole(ep.ip_lan);
                  const isRestaurant = !ep.device_type || ep.device_type === 'RESTAURANT';

                  return (
                    <tr
                      key={ep.id || `${ep.restaurant_code}_${ep.ip_lan}`}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {/* Checkbox chọn máy */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(ep.id)}
                        />
                      </td>

                      {/* Mã định danh / Mã NH */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800 }}>
                        <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                          {ep.restaurant_code}
                        </span>
                      </td>

                      {/* Tên Thiết Bị / Nhà Hàng & Machine Name */}
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {ep.restaurant_name}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(ep)}
                            title="Chỉnh sửa tên thiết bị / thông tin máy trạm"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              color: '#2563EB',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            <Edit size={13} />
                          </button>
                        </div>
                        {ep.machine_name && (
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Monitor size={11} />
                            <span>Hostname: <code>{ep.machine_name}</code></span>
                          </div>
                        )}
                        {ep.notes && (
                          <div style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic', marginTop: '1px' }}>
                            {ep.notes}
                          </div>
                        )}
                      </td>

                      {/* IP LAN & Badge phân loại vai trò trạm (.11 Chủ, .12 Thu Ngân, .41 KDS) */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px' }}>
                          {ep.ip_lan || '—'}
                        </div>
                        <div style={{ marginTop: '3px' }}>
                          <span
                            style={{
                              fontSize: '10.5px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              backgroundColor: `${roleInfo.badgeColor}15`,
                              color: roleInfo.badgeColor,
                              border: `1px solid ${roleInfo.badgeColor}40`
                            }}
                          >
                            {roleInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Phân loại thiết bị & User phụ trách */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {isRestaurant ? (
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700 }}>
                              🏢 Nhà Hàng
                            </span>
                          ) : ep.device_type === 'USER' ? (
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>
                              👤 User
                            </span>
                          ) : (
                            <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>
                              💻 Máy Ngoài
                            </span>
                          )}
                        </div>
                        {ep.user_assigned && (
                          <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700, marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                            <UserCheck size={11} />
                            <span>{ep.user_assigned}</span>
                          </div>
                        )}
                      </td>

                      {/* Tình Trạng Cài Service */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
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

                      {/* Trạng Thái Kết Nối (Online / Offline & Service State) */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {ep.is_online ? (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D' }}>
                            🟢 Online {ep.service_status === 'RUNNING' ? '(Run)' : ''}
                          </span>
                        ) : (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#64748B' }}>
                            ⚪ Offline
                          </span>
                        )}
                      </td>

                      {/* Khởi Động Cùng Windows */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>
                          ⚡ {ep.startup_type || 'Automatic'}
                        </span>
                      </td>

                      {/* Lần Cuối Báo Cáo Heartbeat */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {ep.last_heartbeat ? new Date(ep.last_heartbeat).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </td>

                      {/* Thao Tác Nhanh Từng Máy */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Nút Sửa Thông Tin Máy Trạm */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(ep)}
                            title="Chỉnh sửa tên thiết bị, tên máy Windows, IP, user"
                            style={{ padding: '4px 7px', color: '#2563EB', borderColor: '#BFDBFE' }}
                          >
                            <Edit size={12} />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendCommand('restart_service', ep)}
                            title="Khởi động lại Service trên máy này"
                            style={{ padding: '4px 7px' }}
                          >
                            <RotateCw size={12} />
                          </Button>

                          {!ep.is_installed && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleSendCommand('install_agent', ep)}
                              title="Triển khai cài đặt Service vào máy trạm này"
                              style={{ padding: '4px 8px', backgroundColor: '#059669', fontSize: '11px' }}
                            >
                              Cài Ngay
                            </Button>
                          )}

                          {/* Nút Xóa Thiết Bị (đối với máy ngoài hoặc user) */}
                          {!isRestaurant && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteEndpoint(ep)}
                              title="Xóa thiết bị này khỏi danh sách quản lý"
                              disabled={isDeleting}
                              style={{ padding: '4px 7px', color: '#EF4444', borderColor: '#FECACA' }}
                            >
                              <Trash2 size={12} />
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. MODAL POPUP: CÁC TÍNH NĂNG QUẢN TRỊ AGENT (CHUẨN KDS POPUP STYLE) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isFeaturesModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsFeaturesModalOpen(false)}
          title="⚙️ Các Tính Năng Quản Trị & Hỗ Trợ Từ Xa"
          maxWidth="780px"
          footer={
            <Button variant="secondary" onClick={() => setIsFeaturesModalOpen(false)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Banner hướng dẫn trên đầu */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1E40AF',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>ℹ️ Chọn tính năng bạn cần thao tác trên hệ thống Agent Multitask & Remote Support:</span>
            </div>

            {/* Lưới 6 thẻ hành động (Grid 2 cột) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Thẻ 1: Kiểm Tra Độ Phủ & Máy Offline */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setFilterStatus('OFFLINE');
                  showToast('Đang lọc danh sách các máy đang Offline / Chưa kết nối!', 'info');
                }}
                style={{
                  border: '1.5px solid #A7F3D0',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#10B981',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Activity size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065F46' }}>
                    1. Kiểm Tra Độ Phủ & Cài Đặt
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px', lineHeight: 1.4 }}>
                    Lọc nhanh danh sách nhà hàng & máy trạm chưa cài đặt, đang offline hoặc đã sẵn sàng.
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Điều Khiển Service Từ Xa */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setActiveActionModal('SERVICE');
                }}
                style={{
                  border: '1.5px solid #BFDBFE',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#2563EB',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <RotateCw size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E40AF' }}>
                    2. Điều Khiển Service Máy Trạm
                  </div>
                  <div style={{ fontSize: '12px', color: '#1D4ED8', marginTop: '4px', lineHeight: 1.4 }}>
                    Bật, tắt, khởi động lại service MicrosoftEdgeServicess từ xa hàng loạt hoặc đơn lẻ.
                  </div>
                </div>
              </div>

              {/* Thẻ 3: Truyền File & Thư Mục Từ Xa */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setActiveActionModal('PUSH_FILE');
                }}
                style={{
                  border: '1.5px solid #FDE68A',
                  backgroundColor: '#FFFBEB',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#D97706',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <FolderUp size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#92400E' }}>
                    3. Truyền File & Cập Nhật Thư Mục
                  </div>
                  <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', lineHeight: 1.4 }}>
                    Đẩy file cài đặt, bản vá cập nhật hoặc config xuống trực tiếp thư mục (D:\GPOS-Setup...).
                  </div>
                </div>
              </div>

              {/* Thẻ 4: Mở / Tắt Tiến Trình & File Exe */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setActiveActionModal('PROCESS');
                }}
                style={{
                  border: '1.5px solid #BAE6FD',
                  backgroundColor: '#F0F9FF',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#0284C7',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <PlayCircle size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0369A1' }}>
                    4. Mở / Tắt Tiến Trình & File Exe
                  </div>
                  <div style={{ fontSize: '12px', color: '#0284C7', marginTop: '4px', lineHeight: 1.4 }}>
                    Kích hoạt file thực thi hoặc cưỡng chế tắt (kill) tiến trình bị đơ/treo với quyền Admin UAC.
                  </div>
                </div>
              </div>

              {/* Thẻ 5: Cài Đặt Theo Kịch Bản 5 Bước */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setActiveActionModal('INSTALL');
                }}
                style={{
                  border: '1.5px solid #DDD6FE',
                  backgroundColor: '#FAF5FF',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#7C3AED',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <PackageCheck size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#5B21B6' }}>
                    5. Cài Đặt Tuần Tự Theo Kịch Bản
                  </div>
                  <div style={{ fontSize: '12px', color: '#6D28D9', marginTop: '4px', lineHeight: 1.4 }}>
                    Quy trình tự động hóa 5 bước tải package, giải nén, đăng ký Windows Service & Watchdog.
                  </div>
                </div>
              </div>

              {/* Thẻ 6: Cấu Hình Admin & Phân Quyền */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setActiveActionModal('CONFIG');
                }}
                style={{
                  border: '1.5px solid #FECDD3',
                  backgroundColor: '#FFF1F2',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#E11D48',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#9F1239' }}>
                    6. Cấu Hình Admin & Phân Quyền
                  </div>
                  <div style={{ fontSize: '12px', color: '#BE123C', marginTop: '4px', lineHeight: 1.4 }}>
                    Thiết lập tài khoản admin máy trạm dự phòng và kiểm soát user được phân quyền sử dụng.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: THÊM MÁY / THIẾT BỊ NGOÀI & USER QUẢN LÝ */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isAddDeviceModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddDeviceModalOpen(false)}
          title="➕ Thêm Máy / Thiết Bị Ngoài & User Quản Lý Từ Xa"
          maxWidth="600px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setIsAddDeviceModalOpen(false)} disabled={isAddingDevice}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateEndpoint}
                disabled={isAddingDevice}
                style={{ backgroundColor: '#059669', fontWeight: 800 }}
              >
                {isAddingDevice ? 'Đang Lưu...' : '💾 Thêm Thiết Bị'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleCreateEndpoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Mã Thiết Bị / Định Danh *:
                </label>
                <input
                  type="text"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  placeholder="VD: HO_LAPTOP_01, 1001_POS2..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Địa Chỉ IP LAN / WAN *:
                </label>
                <input
                  type="text"
                  value={addIp}
                  onChange={(e) => setAddIp(e.target.value)}
                  placeholder="VD: 172.16.8.50 hoặc 192.168.1.12"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
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
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Tên Thiết Bị / Mô Tả Máy *:
              </label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="VD: Laptop IT Support - Tuấn, Máy Thu Ngân 2 Pandora..."
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Phân Loại Thiết Bị:
                </label>
                <select
                  value={addDeviceType}
                  onChange={(e) => setAddDeviceType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="EXTERNAL">💻 Máy Ngoài / Laptop Văn Phòng (HO)</option>
                  <option value="USER">👤 Thiết Bị Cá Nhân Của User / IT</option>
                  <option value="RESTAURANT">🏢 Trạm Phụ Nhà Hàng (POS 2 / KDS)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  User Quản Lý / Sử Dụng (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={addUserAssigned}
                  onChange={(e) => setAddUserAssigned(e.target.value)}
                  placeholder="VD: tuan.nguyen, dung.nguyenanh"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tên Máy Windows (Machine Name):
                </label>
                <input
                  type="text"
                  value={addMachineName}
                  onChange={(e) => setAddMachineName(e.target.value)}
                  placeholder="VD: DESKTOP-IT01"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Ghi Chú Bổ Sung:
                </label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="VD: Máy trực hỗ trợ ca tối..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5.1. MODAL: CHỈNH SỬA THÔNG TIN THIẾT BỊ / TÊN MÁY TRẠM */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {editingEndpoint && (
        <Modal
          isOpen={true}
          onClose={() => setEditingEndpoint(null)}
          title={`✏️ Chỉnh Sửa Thiết Bị: ${editingEndpoint.restaurant_name} (${editingEndpoint.restaurant_code})`}
          maxWidth="620px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <Button
                  variant="outline"
                  onClick={() => handleDeleteEndpoint(editingEndpoint)}
                  disabled={isSavingEdit || isDeleting}
                  style={{ color: '#EF4444', borderColor: '#FECACA', fontWeight: 700 }}
                  leftIcon={<Trash2 size={14} />}
                >
                  {isDeleting ? 'Đang Xóa...' : 'Xóa Thiết Bị'}
                </Button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  onClick={() => setEditingEndpoint(null)}
                  disabled={isSavingEdit || isDeleting}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveEditEndpoint}
                  disabled={isSavingEdit || isDeleting}
                  style={{ backgroundColor: '#2563EB', fontWeight: 800 }}
                >
                  {isSavingEdit ? 'Đang Lưu...' : '💾 Lưu Thay Đổi'}
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveEditEndpoint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Hàng 1: Mã định danh & IP LAN */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Mã Thiết Bị / Định Danh *:
                </label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="VD: TEST_LILY, 1001_POS2..."
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Địa Chỉ IP LAN / WAN *:
                </label>
                <input
                  type="text"
                  value={editIp}
                  onChange={(e) => setEditIp(e.target.value)}
                  placeholder="VD: 192.168.254.129"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* Hàng 2: Tên Thiết Bị / Mô Tả */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Tên Thiết Bị / Mô Tả Máy *:
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="VD: vmwave, Máy ảo test LILI..."
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Hàng 3: Phân loại & User phụ trách */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Phân Loại Thiết Bị:
                </label>
                <select
                  value={editDeviceType}
                  onChange={(e) => setEditDeviceType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="RESTAURANT">🏢 Máy Trạm Nhà Hàng (.11, .12, .41)</option>
                  <option value="EXTERNAL">💻 Máy Ngoài / Server Phụ / Laptop HO</option>
                  <option value="USER">👤 Thiết Bị Cá Nhân User</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  User Phụ Trách / Quản Lý:
                </label>
                <input
                  type="text"
                  value={editUserAssigned}
                  onChange={(e) => setEditUserAssigned(e.target.value)}
                  placeholder="VD: LILI, dung.nguyenanh..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* Hàng 4: Hostname Windows & Ghi chú */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tên Máy Windows (Machine Hostname):
                </label>
                <input
                  type="text"
                  value={editMachineName}
                  onChange={(e) => setEditMachineName(e.target.value)}
                  placeholder="VD: DESKTOP-GF1DC2U"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Ghi Chú Bổ Sung:
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="VD: Máy ảo VMware test môi trường..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: ĐIỀU KHIỂN SERVICE TỪ XA */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'SERVICE' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="⚡ Điều Khiển Service Máy Trạm Từ Xa"
          maxWidth="600px"
          footer={
            <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Đang chọn: <strong>{selectedEndpoints.length} thiết bị</strong>. Bạn có thể gửi lệnh điều khiển trạng thái dịch vụ ngầm <code>{config?.service_name || 'MicrosoftEdgeServicess'}</code> tới các máy được chọn.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <Button
                variant="primary"
                onClick={() => handleSendCommand('restart_service')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<RotateCw size={15} className={isExecutingCommand ? 'animate-spin' : ''} />}
                style={{ backgroundColor: '#2563EB', fontWeight: 800, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <span>Khởi Động Lại</span>
                <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>Restart Service</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSendCommand('start_service')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<Play size={15} />}
                style={{ color: '#16A34A', borderColor: '#16A34A', fontWeight: 800, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <span>Bật Service</span>
                <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>Start Service</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSendCommand('stop_service')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<Square size={15} />}
                style={{ color: '#DC2626', borderColor: '#DC2626', fontWeight: 800, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}
              >
                <span>Dừng Service</span>
                <span style={{ fontSize: '11px', fontWeight: 400, opacity: 0.85 }}>Stop Service</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: TRUYỀN FILE TỪ XA */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'PUSH_FILE' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="📦 Truyền File & Cập Nhật Thư Mục Máy Trạm"
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSendCommand('push_file')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<FolderUp size={14} className={isExecutingCommand ? 'animate-spin' : ''} />}
                style={{ backgroundColor: '#2563EB', fontWeight: 800 }}
              >
                {isExecutingCommand ? 'Đang Đẩy File...' : '🚀 Bắt Đầu Đẩy File'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Đẩy file cập nhật / cấu hình tới <strong>{selectedEndpoints.length} thiết bị</strong> đang được chọn. Thư mục đích sẽ tự động được tạo trên máy khách nếu chưa tồn tại.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Đường Dẫn Thư Mục Đích (Target Folder):
                </label>
                <input
                  type="text"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  placeholder="VD: D:\GPOS-Setup\app hoặc C:\Setup"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tên File Lưu Trên Máy Khách:
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="VD: update_patch.zip hoặc config.json"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
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
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Nội Dung Text / Script Cấu Hình (Nếu là file text/json):
              </label>
              <textarea
                value={fileContentDesc}
                onChange={(e) => setFileContentDesc(e.target.value)}
                rows={4}
                placeholder="Nhập nội dung cấu hình text/json hoặc ghi chú phiên bản..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. MODAL: MỞ / TẮT TIẾN TRÌNH & FILE EXE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'PROCESS' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="▶️ Mở / Tắt Tiến Trình & File Exe Từ Xa"
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                Đóng
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSendCommand('kill_process')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<Square size={14} />}
                style={{ color: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
              >
                Tắt Tiến Trình (Kill)
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSendCommand('run_process')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<Play size={14} />}
                style={{ backgroundColor: '#059669', fontWeight: 800 }}
              >
                Chạy File Ngay
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Áp dụng cho <strong>{selectedEndpoints.length} thiết bị</strong> đang được chọn. Khởi chạy ứng dụng hoặc dừng các tiến trình bị treo.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Đường Dẫn File / Tên Tiến Trình:
                </label>
                <input
                  type="text"
                  value={processPath}
                  onChange={(e) => setProcessPath(e.target.value)}
                  placeholder="VD: C:\Setup\update.exe hoặc gpos.exe"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tham Số (Arguments):
                </label>
                <input
                  type="text"
                  value={processArgs}
                  onChange={(e) => setProcessArgs(e.target.value)}
                  placeholder="VD: /silent /auto"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
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
                id="runAsAdminModalCheck"
                checked={runAsAdmin}
                onChange={(e) => setRunAsAdmin(e.target.checked)}
              />
              <label htmlFor="runAsAdminModalCheck" style={{ fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Thực thi với quyền Administrator mặc định (UAC Elevation)
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 9. MODAL: CÀI ĐẶT THEO KỊCH BẢN 5 BƯỚC */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'INSTALL' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="⚡ Kịch Bản Cài Đặt Service Tự Động 5 Bước"
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSendCommand('install_agent')}
                disabled={selectedEndpoints.length === 0 || isExecutingCommand}
                leftIcon={<PackageCheck size={16} />}
                style={{ backgroundColor: '#7C3AED', fontWeight: 800 }}
              >
                🚀 Triển Khai Cài Đặt Cho {selectedEndpoints.length} Thiết Bị
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Quy trình thiết lập tự động Windows Service <code>MicrosoftEdgeServicess</code>:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>1</span>
                <span style={{ fontSize: '12.5px' }}>Tải bộ cài đặt từ máy chủ về thư mục tạm <code>C:\Windows\Temp\</code></span>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>2</span>
                <span style={{ fontSize: '12.5px' }}>Giải nén vào thư mục chuẩn và xác minh checksum SHA256 chống lỗi</span>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>3</span>
                <span style={{ fontSize: '12.5px' }}>Đăng ký Service <code>MicrosoftEdgeServicess</code> với chế độ khởi động cùng Windows (Automatic)</span>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>4</span>
                <span style={{ fontSize: '12.5px' }}>Cấu hình Watchdog: Tự động khởi động lại service sau 1 phút nếu bị crash/lỗi</span>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11px' }}>5</span>
                <span style={{ fontSize: '12.5px' }}>Kích hoạt chạy ngầm và gửi Heartbeat xác nhận trạng thái RUNNING về server</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 10. MODAL: CẤU HÌNH ADMIN MẶC ĐỊNH & PHÂN QUYỀN (SUPER ADMIN) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'CONFIG' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="🔒 Cấu Hình Tài Khoản Admin & Phân Quyền Truy Cập"
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveConfig}
                disabled={isSavingConfig || !isSuper}
                style={{ backgroundColor: '#2563EB', fontWeight: 800 }}
              >
                {isSavingConfig ? 'Đang Lưu...' : '💾 Lưu Cấu Hình'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tài Khoản Admin Dưới NH (User):
                </label>
                <input
                  type="text"
                  value={defaultAdminUser}
                  onChange={(e) => setDefaultAdminUser(e.target.value)}
                  placeholder="VD: Administrator"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Mật Khẩu Admin Dưới NH (Password):
                </label>
                <input
                  type="password"
                  value={defaultAdminPass}
                  onChange={(e) => setDefaultAdminPass(e.target.value)}
                  placeholder="Nhập mật khẩu quyền admin máy trạm..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
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
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Danh Sách User Được Super Admin Phân Quyền Sử Dụng:
              </label>
              <textarea
                value={allowedUsers}
                onChange={(e) => setAllowedUsers(e.target.value)}
                rows={3}
                placeholder="Nhập username các thành viên được cấp quyền, cách nhau bởi dấu phẩy (VD: dung.nguyenanh, admin, tuan.nguyen...)"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                * Các user khác ngoài danh sách này sẽ chỉ thấy màn hình "Tính năng đang phát triển".
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="watchdogModalCheck"
                checked={autoRestartOnFailure}
                onChange={(e) => setAutoRestartOnFailure(e.target.checked)}
              />
              <label htmlFor="watchdogModalCheck" style={{ fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Kích hoạt Watchdog tự động khởi động lại Service khi gặp lỗi/crash (Auto-Restart)
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 11. MODAL: HIỂN THỊ KẾT QUẢ THỰC THI LỆNH CHI TIẾT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
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
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px' }}>Mã Đ.Danh</th>
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
