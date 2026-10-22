import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderUp,
  PackageCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  Square,
  RotateCw,
  UserCheck,
  Sparkles,
  Download,
  Plus,
  Settings,
  Monitor,
  Edit,
  Trash2,
  Terminal,
  BookmarkPlus,
  Save,
  Package,
  Layers,
  FileCode,
  History,
  Eye,
  Copy,
  Check,
  FileText,
  Lock,
  Unlock,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin, checkIsDungOrSuperAdmin } from '../../utils/authUtils';
import {
  agentMultitaskService,
  AgentOverviewResponse,
  AgentEndpointItem,
  AgentConfigResponse,
  AgentCommandResponse,
  AgentScriptTemplateItem,
  AgentPackageTemplateItem,
  DeployStepItem,
  AgentLogItem
} from '../../services/agentMultitaskService';

// Danh sách mẫu kịch bản dự phòng mặc định
const DEFAULT_SCRIPT_TEMPLATES: AgentScriptTemplateItem[] = [
  {
    id: 1,
    template_name: 'Update iPOS TCH',
    folder_hint: 'Update ipos TCH IT NEW',
    file_name: 'Update iPOS TCH.bat',
    arguments: '',
    run_as_admin: true,
    description: 'Kịch bản cập nhật hệ thống iPOS TCH tự động'
  },
  {
    id: 2,
    template_name: 'Khởi Động Lại GPOS Service',
    folder_hint: 'GPOS-Setup',
    file_name: 'RestartService.bat',
    arguments: '',
    run_as_admin: true,
    description: 'Khởi động lại toàn bộ dịch vụ GPOS tại trạm'
  }
];

export const AgentMultitaskPage: React.FC = () => {
  const { user } = useAuth();
  const isSuper = checkIsSuperAdmin(user);
  // Chỉ Super Admin hoặc dung.nguyenanh mới có quyền thay đổi file mã nguồn và cấu hình bộ chuẩn
  const canModifyPackageTemplate = checkIsDungOrSuperAdmin(user);
  const [searchParams] = useSearchParams();

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
    'RELATIVE_SCRIPT' | 'SERVICE' | 'PUSH_FILE' | 'PROCESS' | 'INSTALL' | 'CONFIG' | 'DEPLOY_PACKAGE' | null
  >(null);

  // ── FEATURE 2: TRUYỀN GÓI CÀI & THỰC THI ĐA BƯỚC (DEPLOY_PACKAGE) ──
  const [deployTargetFolder, setDeployTargetFolder] = useState<string>('D:\\GPOS-Setup\\app');
  const [deployFileName, setDeployFileName] = useState<string>('');
  const [deployAutoExtract, setDeployAutoExtract] = useState<boolean>(true);
  const [deployUploadedFileName, setDeployUploadedFileName] = useState<string>('');
  const [deploySteps, setDeploySteps] = useState<DeployStepItem[]>([]);
  const [newJsonKey, setNewJsonKey] = useState<string>('');
  const [newJsonVal, setNewJsonVal] = useState<string>('');
  const [activeJsonStepIndex, setActiveJsonStepIndex] = useState<number | null>(null);

  // ── THƯ VIỆN BỘ CHUẨN GÓI CÀI & THỰC THI ĐA BƯỚC (PACKAGE RECIPES / TEMPLATES) ──
  const [packageTemplates, setPackageTemplates] = useState<AgentPackageTemplateItem[]>([]);
  const [selectedPackageTemplateId, setSelectedPackageTemplateId] = useState<number | null>(null);
  const [isSavePackageModalOpen, setIsSavePackageModalOpen] = useState<boolean>(false);
  const [savePackageName, setSavePackageName] = useState<string>('');
  const [savePackageDesc, setSavePackageDesc] = useState<string>('');
  const [isSavingPackageTemplate, setIsSavingPackageTemplate] = useState<boolean>(false);
  const [deletingPackageTemplateId, setDeletingPackageTemplateId] = useState<number | null>(null);
  const [stepUploadProgress, setStepUploadProgress] = useState<Record<number, number>>({});
  const [uploadingStepIdx, setUploadingStepIdx] = useState<number | null>(null);


  // ── LỰA CHỌN MÁY TRẠM ĐÍCH CỤ THỂ TRONG DẢI IP NHÀ HÀNG (.x) ──
  const [subnetTargetRoles, setSubnetTargetRoles] = useState<{
    pos11: boolean;
    pos12: boolean;
    pc41: boolean;
    customSuffix: string;
  }>({
    pos11: true,
    pos12: false,
    pc41: false,
    customSuffix: ''
  });

  // Form Khởi Chạy Script / Batch Từ Xa (Tự Tìm Folder / File)
  const [scriptFolderHint, setScriptFolderHint] = useState<string>('Update ipos TCH IT NEW');
  const [scriptFileName, setScriptFileName] = useState<string>('Update iPOS TCH.bat');
  const [scriptArgs, setScriptArgs] = useState<string>('');
  const [scriptRunMode, setScriptRunMode] = useState<'interactive' | 'hidden'>('interactive');

  // Thư Viện Mẫu Kịch Bản Script / Batch (Script Templates Library)
  const [scriptTemplates, setScriptTemplates] = useState<AgentScriptTemplateItem[]>(DEFAULT_SCRIPT_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(1);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState<boolean>(false);
  const [saveTemplateName, setSaveTemplateName] = useState<string>('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);

  // Modal Thêm Thiết Bị / User Ngoài
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState<boolean>(false);
  const [addCode, setAddCode] = useState<string>('');
  const [addName, setAddName] = useState<string>('');
  const [addIp, setAddIp] = useState<string>('');
  const [addMachineName, setAddMachineName] = useState<string>('');
  const [addDeviceType, setAddDeviceType] = useState<string>('EXTERNAL'); // RESTAURANT, EXTERNAL, USER
  const [addUserAssigned, setAddUserAssigned] = useState<string>('');
  const [addNotes, setAddNotes] = useState<string>('');
  const [addAdminUser, setAddAdminUser] = useState<string>('');
  const [addAdminPass, setAddAdminPass] = useState<string>('');
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
  const [editAdminUser, setEditAdminUser] = useState<string>('');
  const [editAdminPass, setEditAdminPass] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Lựa Chọn Thực Thi Dưới Quyền User App / Admin Mặc Định (Giải Quyết Access Denied)
  const [useAdminUser, setUseAdminUser] = useState<boolean>(false);
  const [customAdminUser, setCustomAdminUser] = useState<string>('Administrator');
  const [customAdminPass, setCustomAdminPass] = useState<string>('');

  // Modal Tải Gói Cài Đặt (.ZIP) Kèm Cấu Hình IP & Mã Trạm Trực Tiếp
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [downloadServerUrl, setDownloadServerUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return 'http://172.16.8.25:8000';
  });
  const [downloadRestaurantCode, setDownloadRestaurantCode] = useState<string>('AUTO');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);


  // Bộ lọc danh sách thiết bị
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // ALL, ONLINE, OFFLINE, RUNNING, STOPPED
  const [filterDeviceType, setFilterDeviceType] = useState<string>('ALL'); // ALL, RESTAURANT, EXTERNAL, USER
  const [filterRole, setFilterRole] = useState<string>('ALL'); // ALL, SERVER_11, POS_12, PC_41, SUBNET, OTHER

  // Danh sách ID thiết bị đang được chọn (hỗ trợ tích chọn từng máy độc lập trong cùng 1 nhà hàng)
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<number[]>([]);
  // Từ khóa tìm kiếm nhanh thiết bị trong popup modal (tuân thủ quy tắc dropdown > 10 dòng phải có ô search)
  const [modalDeviceSearchQuery, setModalDeviceSearchQuery] = useState<string>('');

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

  // ── STATE THEO DÕI TIẾN TRÌNH THỰC THI THỜI GIAN THỰC (LIVE EXECUTION TRACKER) ──
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  const [trackingTaskIds, setTrackingTaskIds] = useState<number[]>([]);
  const [trackingLogs, setTrackingLogs] = useState<Record<number, AgentLogItem>>({});
  const [isTrackingPolling, setIsTrackingPolling] = useState<boolean>(false);
  const [trackingAction, setTrackingAction] = useState<string>('');
  const [trackingTargets, setTrackingTargets] = useState<Array<{ code: string; ip: string; name?: string }>>([]);
  const [trackingElapsedSeconds, setTrackingElapsedSeconds] = useState<number>(0);
  const [copiedTaskId, setCopiedTaskId] = useState<number | null>(null);

  // ── STATE MODAL NHẬT KÝ THỰC THI TỔNG QUAN (EXECUTION LOGS HISTORY) ──
  const [isLogsHistoryModalOpen, setIsLogsHistoryModalOpen] = useState<boolean>(false);
  const [logsHistoryList, setLogsHistoryList] = useState<AgentLogItem[]>([]);
  const [logsHistoryLoading, setLogsHistoryLoading] = useState<boolean>(false);
  const [selectedDetailLog, setSelectedDetailLog] = useState<AgentLogItem | null>(null);
  const [logsSearchFilter, setLogsSearchFilter] = useState<string>('');
  const [logsStatusFilter, setLogsStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED' | 'PENDING'>('ALL');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Polling theo dõi trạng thái tiến trình thực thi của các task_ids
  useEffect(() => {
    if (!isTrackingPolling || trackingTaskIds.length === 0) return;

    const secTimer = setInterval(() => {
      setTrackingElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const pollTaskStatus = async () => {
      try {
        const fetchPromises = trackingTaskIds.map(async (tid) => {
          try {
            const logItem = await agentMultitaskService.getTaskStatus(tid);
            return { tid, logItem };
          } catch {
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);

        setTrackingLogs((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r && r.logItem) {
              next[r.tid] = r.logItem;
            }
          }
          return next;
        });

        // Chỉ dừng polling nếu:
        // 1. Toàn bộ trackingTaskIds đều đã có bản ghi từ server
        // 2. Không có bản ghi nào còn ở trạng thái PENDING hoặc RUNNING (đang xử lý ngầm)
        const validResults = results.filter((r) => r && r.logItem);
        const hasAllResults = validResults.length === trackingTaskIds.length;
        const anyInProgress = validResults.some(
          (r) => r!.logItem.result_status === 'PENDING' || r!.logItem.result_status === 'RUNNING'
        );

        if (hasAllResults && !anyInProgress && validResults.length > 0) {
          setIsTrackingPolling(false);
          // Tự động nạp lại danh sách máy
          agentMultitaskService.getEndpoints().then((eps) => setEndpoints(eps)).catch(() => {});
        }
      } catch {
        // Tiếp tục thử lần sau
      }
    };

    pollTaskStatus();
    const pollInterval = setInterval(pollTaskStatus, 1500);

    const timeoutTimer = setTimeout(() => {
      setIsTrackingPolling(false);
    }, 90000);

    return () => {
      clearInterval(secTimer);
      clearInterval(pollInterval);
      clearTimeout(timeoutTimer);
    };
  }, [isTrackingPolling, trackingTaskIds]);

  // Nạp dữ liệu ban đầu và thiết lập tự động làm mới ngầm mỗi 10 giây (Auto-polling)
  useEffect(() => {
    loadAllData();

    const intervalTimer = setInterval(() => {
      // Tải ngầm danh sách endpoints và overview để cập nhật trạng thái Online/Offline theo thời gian thực
      Promise.all([
        agentMultitaskService.getEndpoints(),
        agentMultitaskService.getOverview()
      ])
        .then(([updatedEndpoints, updatedOverview]) => {
          setEndpoints(updatedEndpoints);
          setOverview(updatedOverview);
        })
        .catch(() => {
          // Bỏ qua lỗi ngầm khi poll
        });
    }, 10000);

    return () => clearInterval(intervalTimer);
  }, []);

  // Tự động mở modal triển khai nếu nhận được tham số action=deploy_agent từ URL
  useEffect(() => {
    const act = searchParams.get('action');
    const autoOpen = searchParams.get('auto_open_deploy');
    if (act === 'deploy_agent' || autoOpen === 'agent') {
      setActiveActionModal('DEPLOY_PACKAGE');
      const targetResCode = searchParams.get('restaurant_code') || searchParams.get('code');
      if (targetResCode && endpoints.length > 0) {
        const found = endpoints.filter((e) => e.restaurant_code.toLowerCase() === targetResCode.toLowerCase());
        if (found.length > 0) {
          setSelectedEndpointIds(found.map((e) => e.id).filter(Boolean) as number[]);
        }
      }
    }
  }, [searchParams, endpoints.length]);

  // Tải danh sách mẫu kịch bản script đã lưu
  const loadScriptTemplates = async () => {
    try {
      const tmpls = await agentMultitaskService.getScriptTemplates();
      if (tmpls && tmpls.length > 0) {
        setScriptTemplates(tmpls);
      } else {
        setScriptTemplates(DEFAULT_SCRIPT_TEMPLATES);
      }
    } catch {
      // Giữ nguyên danh sách hiện tại nếu có lỗi mạng
    }
  };

  // Tải danh sách bộ chuẩn gói cài đặt đa bước đã lưu
  const loadPackageTemplates = async () => {
    try {
      const list = await agentMultitaskService.getPackageTemplates();
      setPackageTemplates(list || []);
    } catch (err) {
      console.error('Lỗi tải danh sách bộ chuẩn gói cài:', err);
    }
  };

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
        setCustomAdminUser(cfgRes.default_admin_user || 'Administrator');
        setCustomAdminPass(cfgRes.default_admin_pass || '');
        setAllowedUsers(cfgRes.allowed_users || 'dung.nguyenanh,admin');
        setAutoRestartOnFailure(cfgRes.auto_restart_on_failure);
        // Tải mẫu kịch bản script & bộ chuẩn gói cài đa bước
        loadScriptTemplates();
        loadPackageTemplates();
      }
    } catch (err: any) {
      showToast('Lỗi khi tải dữ liệu Agent Multitask: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Xác định vai trò chuẩn của máy dựa vào địa chỉ IP (.41 là PC Quản Lý, không phải KDS)
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
      return { role: 'PC_41', label: 'PC Quản Lý (.41)', badgeColor: '#059669' };
    }
    if (tail === 'x') {
      return { role: 'SUBNET', label: 'Dải IP Nhà Hàng', badgeColor: '#64748B' };
    }
    if (tail === '1') {
      return { role: 'SUBNET', label: 'Router Gateway .1', badgeColor: '#64748B' };
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
      // Bỏ qua các nhà hàng/kho có chữ "Kho " trong tên
      const resNameLower = (ep.restaurant_name || '').toLowerCase();
      if (resNameLower.startsWith('kho ') || resNameLower.includes(' kho ') || resNameLower.includes('kho ')) {
        return false;
      }

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
        (filterRole === 'SUBNET'
          ? (roleInfo.role === 'SUBNET' || !ep.is_installed)
          : roleInfo.role === filterRole);

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

  // Xác định xem một địa chỉ IP có phải là dạng subnet/dải mạng không
  const isSubnetIp = (ip?: string) => {
    if (!ip) return false;
    const clean = ip.trim();
    return clean.endsWith('.x') || clean.endsWith('.0') || clean.endsWith('.1') || clean.includes('/24') || getMachineRole(clean).role === 'SUBNET';
  };

  // Trích xuất tiền tố subnet (ví dụ: "10.8.153.x" -> "10.8.153.", "10.8.153.1" -> "10.8.153.")
  const getSubnetPrefix = (ip: string) => {
    const clean = ip.trim();
    const parts = clean.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.`;
    }
    return clean.replace(/\.x$/i, '') + '.';
  };

  // Kiểm tra trong danh sách máy đang chọn có máy nào thuộc dải subnet không
  const hasSubnetEndpoint = useMemo(() => {
    return selectedEndpoints.some((ep) => isSubnetIp(ep.ip_lan));
  }, [selectedEndpoints]);

  // Đếm số lượng nhà hàng/endpoint có IP dạng dải
  const subnetEndpointsCount = useMemo(() => {
    return selectedEndpoints.filter((ep) => isSubnetIp(ep.ip_lan)).length;
  }, [selectedEndpoints]);

  // Phân giải danh sách máy đích thực tế (Concrete Targets) từ selectedEndpoints + subnetTargetRoles
  const resolvedConcreteTargets = useMemo(() => {
    const result: Array<{
      endpointId?: number;
      code: string;
      name: string;
      ip: string;
      originalIp: string;
      roleLabel: string;
      isOnline: boolean;
    }> = [];

    // Lấy danh sách đuôi tùy chỉnh người dùng nhập (nếu có)
    const customTails = subnetTargetRoles.customSuffix
      .split(/[\s,;]+/)
      .map((s) => s.trim().replace(/^\./, ''))
      .filter((s) => /^\d+$/.test(s));

    for (const ep of selectedEndpoints) {
      const origIp = (ep.ip_lan || '').trim();
      if (!origIp) continue;

      if (isSubnetIp(origIp)) {
        const prefix = getSubnetPrefix(origIp);
        const rolesToAdd: Array<{ tail: string; roleLabel: string }> = [];

        if (subnetTargetRoles.pos11) {
          rolesToAdd.push({ tail: '11', roleLabel: 'Máy Chủ / POS 1 (.11)' });
        }
        if (subnetTargetRoles.pos12) {
          rolesToAdd.push({ tail: '12', roleLabel: 'Thu Ngân 2 (.12)' });
        }
        if (subnetTargetRoles.pc41) {
          rolesToAdd.push({ tail: '41', roleLabel: 'PC Quản Lý (.41)' });
        }
        for (const cTail of customTails) {
          rolesToAdd.push({ tail: cTail, roleLabel: `Trạm .${cTail}` });
        }

        // Nếu người dùng bỏ tick hết (không chọn trạm nào), fallback mặc định vào .11
        if (rolesToAdd.length === 0) {
          rolesToAdd.push({ tail: '11', roleLabel: 'Máy Chủ / POS 1 (.11) (Mặc định)' });
        }

        for (const r of rolesToAdd) {
          const concreteIp = `${prefix}${r.tail}`;
          result.push({
            endpointId: ep.id,
            code: ep.restaurant_code,
            name: ep.restaurant_name || ep.machine_name || ep.restaurant_code,
            ip: concreteIp,
            originalIp: origIp,
            roleLabel: r.roleLabel,
            isOnline: ep.is_online
          });
        }
      } else {
        // IP cụ thể (đã có trạm rõ ràng)
        const roleInfo = getMachineRole(origIp);
        result.push({
          endpointId: ep.id,
          code: ep.restaurant_code,
          name: ep.restaurant_name || ep.machine_name || origIp,
          ip: origIp,
          originalIp: origIp,
          roleLabel: roleInfo.label,
          isOnline: ep.is_online
        });
      }
    }

    return result;
  }, [selectedEndpoints, subnetTargetRoles]);

  // Mở modal tác vụ kèm tự động chọn máy nếu danh sách lọc hoặc hệ thống chỉ có 1 máy
  const handleOpenActionModal = (
    modalType: 'RELATIVE_SCRIPT' | 'SERVICE' | 'PUSH_FILE' | 'PROCESS' | 'INSTALL' | 'CONFIG' | 'DEPLOY_PACKAGE'
  ) => {
    setIsFeaturesModalOpen(false);
    if (selectedEndpointIds.length === 0) {
      if (filteredEndpoints.length === 1 && filteredEndpoints[0].id) {
        setSelectedEndpointIds([filteredEndpoints[0].id]);
      } else if (endpoints.length === 1 && endpoints[0].id) {
        setSelectedEndpointIds([endpoints[0].id]);
      }
    }
    setActiveActionModal(modalType);
  };



  // ── CÁC HÀM XỬ LÝ BỘ CHUẨN GÓI CÀI & CÁC BƯỚC TUẦN TỰ (PACKAGE TEMPLATES) ──

  // Chọn một Bộ Chuẩn từ dropdown để nạp toàn bộ cấu hình và file đính kèm đã lưu
  const handleSelectPackageTemplate = (tmplId: number | null) => {
    setSelectedPackageTemplateId(tmplId);
    if (!tmplId) {
      return;
    }
    const found = packageTemplates.find((t) => t.id === tmplId);
    if (found) {
      setDeployTargetFolder(found.target_folder || 'D:\\GPOS-Setup\\app');
      setDeployAutoExtract(found.auto_extract ?? true);
      setDeployFileName(found.package_file_name || '');
      setDeployUploadedFileName(found.package_file_name || '');
      // Nạp danh sách các bước đã lưu kèm file đính kèm
      setDeploySteps(found.steps || []);
      showToast(`✓ Đã nạp Bộ Chuẩn: '${found.template_name}' (${(found.steps || []).length} bước) kèm file đính kèm sẵn sàng!`, 'success');
    }
  };

  // Mở modal lưu bộ chuẩn mới (chỉ Super Admin hoặc dung.nguyenanh)
  const handleOpenSavePackageModal = () => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền lưu Bộ Chuẩn!', 'error');
      return;
    }
    setSavePackageName('');
    setSavePackageDesc('');
    setIsSavePackageModalOpen(true);
  };

  // Xác nhận lưu Bộ Chuẩn mới vào cơ sở dữ liệu
  const handleConfirmSaveNewPackage = async () => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền tạo mới Bộ Chuẩn!', 'error');
      return;
    }
    const name = savePackageName.trim();
    if (!name) {
      showToast('Vui lòng nhập tên cho Bộ Chuẩn!', 'error');
      return;
    }
    setIsSavingPackageTemplate(true);
    try {
      const created = await agentMultitaskService.createPackageTemplate({
        template_name: name,
        description: savePackageDesc.trim() || undefined,
        target_folder: deployTargetFolder,
        package_file_name: deployUploadedFileName || deployFileName,
        auto_extract: deployAutoExtract,
        steps: deploySteps
      });
      showToast(`Đã lưu Bộ Chuẩn '${name}' thành công!`, 'success');
      setIsSavePackageModalOpen(false);
      await loadPackageTemplates();
      setSelectedPackageTemplateId(created.id);
    } catch (err: any) {
      showToast('Lỗi lưu Bộ Chuẩn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingPackageTemplate(false);
    }
  };

  // Cập nhật đè lên Bộ Chuẩn đang chọn (chỉ Super Admin hoặc dung.nguyenanh)
  const handleUpdateCurrentPackageTemplate = async () => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền cập nhật Bộ Chuẩn!', 'error');
      return;
    }
    if (!selectedPackageTemplateId) {
      handleOpenSavePackageModal();
      return;
    }
    const curr = packageTemplates.find((t) => t.id === selectedPackageTemplateId);
    if (!curr) return;

    setIsSavingPackageTemplate(true);
    try {
      await agentMultitaskService.updatePackageTemplate(selectedPackageTemplateId, {
        template_name: curr.template_name,
        description: curr.description,
        target_folder: deployTargetFolder,
        package_file_name: deployUploadedFileName || deployFileName,
        auto_extract: deployAutoExtract,
        steps: deploySteps
      });
      showToast(`Đã cập nhật Bộ Chuẩn '${curr.template_name}' thành công!`, 'success');
      await loadPackageTemplates();
    } catch (err: any) {
      showToast('Lỗi cập nhật Bộ Chuẩn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingPackageTemplate(false);
    }
  };

  // Xóa một Bộ Chuẩn (chỉ Super Admin hoặc dung.nguyenanh)
  const handleDeletePackageTemplate = async (tmplId: number) => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền xóa Bộ Chuẩn!', 'error');
      return;
    }
    const curr = packageTemplates.find((t) => t.id === tmplId);
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Bộ Chuẩn '${curr?.template_name || tmplId}' không?`)) {
      return;
    }
    setDeletingPackageTemplateId(tmplId);
    try {
      await agentMultitaskService.deletePackageTemplate(tmplId);
      showToast('Đã xóa Bộ Chuẩn thành công!', 'success');
      if (selectedPackageTemplateId === tmplId) {
        setSelectedPackageTemplateId(null);
      }
      await loadPackageTemplates();
    } catch (err: any) {
      showToast('Lỗi xóa Bộ Chuẩn: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDeletingPackageTemplateId(null);
    }
  };

  // Thêm một bước thực thi mới (hỗ trợ đầy đủ: PUSH_FILE, EXTRACT_FILE, MODIFY_FILE, RUN_SCRIPT, DELETE_FILE)
  const handleAddDeployStep = (type: 'PUSH_FILE' | 'EXTRACT_FILE' | 'MODIFY_FILE' | 'RUN_SCRIPT' | 'DELETE_FILE') => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền thêm/sửa bước trong quy trình!', 'error');
      return;
    }
    const nextNum = deploySteps.length + 1;
    let newStep: DeployStepItem;
    if (type === 'PUSH_FILE') {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Copy file đính kèm vào thư mục đích`,
        step_type: 'PUSH_FILE',
        target_folder: 'C:\\abc',
        file_name: '',
        storage_file_name: '',
        file_size_mb: 0,
        download_url: '',
        auto_extract: false,
        is_uploaded: false
      };
    } else if (type === 'EXTRACT_FILE') {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Copy file nén & giải nén vào thư mục`,
        step_type: 'EXTRACT_FILE',
        target_folder: 'D:\\gpos',
        file_name: '',
        storage_file_name: '',
        file_size_mb: 0,
        download_url: '',
        auto_extract: true,
        is_uploaded: false
      };
    } else if (type === 'MODIFY_FILE') {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Chỉnh sửa file config`,
        step_type: 'MODIFY_FILE',
        file_path: 'config.json',
        modify_mode: 'JSON_KEY_VALUE',
        json_modifications: {
          note: 'Cap nhat bo sung'
        }
      };
    } else if (type === 'RUN_SCRIPT') {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Chạy file trong thư mục mới giải nén`,
        step_type: 'RUN_SCRIPT',
        file_path: 'Kiem_Tra_Trang_Thai.bat',
        folder_path: 'D:\\gpos',
        working_directory: 'D:\\gpos',
        arguments: '',
        run_as_admin: true,
        wait_for_completion: true,
        run_mode: 'interactive',
        run_hidden: false
      };
    } else {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Dọn dẹp file tạm`,
        step_type: 'DELETE_FILE',
        file_path: 'temp.zip'
      };
    }
    setDeploySteps([...deploySteps, newStep]);
  };

  // Xóa một bước thực thi
  const handleRemoveDeployStep = (index: number) => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền xóa bước trong quy trình!', 'error');
      return;
    }
    const updated = deploySteps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      step_number: idx + 1
    }));
    setDeploySteps(updated);
  };

  // Cập nhật trường của một bước
  const handleUpdateDeployStep = (index: number, fields: Partial<DeployStepItem>) => {
    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền chỉnh sửa bước!', 'error');
      return;
    }
    setDeploySteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...fields };
      return copy;
    });
  };

  // Cập nhật key-value trong json_modifications của bước
  const handleSetJsonKeyValue = (stepIndex: number, key: string, value: string) => {
    if (!key.trim()) return;
    setDeploySteps((prev) => {
      const copy = [...prev];
      const step = copy[stepIndex];
      const currentMods = { ...(step.json_modifications || {}) };
      currentMods[key.trim()] = value;
      copy[stepIndex] = { ...step, json_modifications: currentMods };
      return copy;
    });
    setNewJsonKey('');
    setNewJsonVal('');
    setActiveJsonStepIndex(null);
  };

  // Xóa một key trong json_modifications của bước
  const handleDeleteJsonKey = (stepIndex: number, key: string) => {
    setDeploySteps((prev) => {
      const copy = [...prev];
      const step = copy[stepIndex];
      const currentMods = { ...(step.json_modifications || {}) };
      delete currentMods[key];
      copy[stepIndex] = { ...step, json_modifications: currentMods };
      return copy;
    });
  };

  // Xử lý tải file đính kèm riêng cho từng bước (lưu giữ lại vĩnh viễn trên server)
  const handleStepFileUpload = async (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canModifyPackageTemplate) {
      showToast('🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền thay đổi file mã nguồn của bộ chuẩn!', 'error');
      e.target.value = '';
      return;
    }

    // Giới hạn 500MB
    const MAX_SIZE = 500 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('Dung lượng file vượt quá giới hạn 500MB, vui lòng chọn file nhỏ hơn!', 'error');
      e.target.value = '';
      return;
    }

    const fileSizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
    setUploadingStepIdx(stepIndex);
    setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: 0 }));

    try {
      showToast(`Bắt đầu tải file '${file.name}' (${fileSizeMb} MB) lên máy chủ...`, 'info');
      const res = await agentMultitaskService.uploadPackageFile(file, (progress) => {
        setStepUploadProgress((prev) => ({ ...prev, [stepIndex]: progress.percent }));
      });
      if (res.success) {
        setDeploySteps((prev) => {
          const copy = [...prev];
          const curr = copy[stepIndex];
          copy[stepIndex] = {
            ...curr,
            file_name: res.file_name,
            storage_file_name: res.file_name,
            file_size_mb: fileSizeMb,
            download_url: res.download_url || `/api/v1/agent-multitask/download-package-file/${res.file_name}`,
            is_uploaded: true,
            file_path: res.file_name
          };
          return copy;
        });
        showToast(res.message || `Đã tải lên máy chủ file '${res.file_name}' (${fileSizeMb} MB) thành công!`, 'success');
      } else {
        showToast('Tải file lên máy chủ thất bại!', 'error');
      }
    } catch (err: any) {
      console.error('Lỗi upload file bước:', err);
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi khi tải file lên máy chủ.';
      showToast(`Tải file thất bại: ${errMsg}`, 'error');
    } finally {
      setUploadingStepIdx(null);
      e.target.value = '';
    }
  };

  // Thực thi lệnh điều khiển từ xa
  const handleSendCommand = async (
    action: 'start_service' | 'stop_service' | 'restart_service' | 'push_file' | 'run_process' | 'kill_process' | 'install_agent' | 'run_relative_script' | 'deploy_package',
    singleEndpoint?: AgentEndpointItem
  ) => {
    const targets = singleEndpoint ? [singleEndpoint] : selectedEndpoints;
    if (targets.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 thiết bị để thực thi lệnh!', 'error');
      return;
    }

    if (action === 'deploy_package') {
      if (uploadingStepIdx !== null) {
        showToast('File đang được tải lên máy chủ, vui lòng đợi hoàn tất trước khi bấm Bắt Đầu!', 'info');
        return;
      }

      // Kiểm tra các bước PUSH_FILE hoặc EXTRACT_FILE đã có file đính kèm chưa
      for (let i = 0; i < deploySteps.length; i++) {
        const s = deploySteps[i];
        if (s.step_type === 'PUSH_FILE' || s.step_type === 'EXTRACT_FILE') {
          if (!s.file_name && !s.download_url && !s.storage_file_name) {
            showToast(`Bước ${i + 1} (${s.step_name || 'Truyền file'}) chưa có file đính kèm! Vui lòng tải file lên trước khi triển khai.`, 'error');
            return;
          }
        }
      }

      // Nếu không có bước nào (truyền file thuần túy) thì bắt buộc phải có file
      if (deploySteps.length === 0 && !deployUploadedFileName && !deployFileName) {
        showToast('Vui lòng nhập tên gói hoặc thêm ít nhất một bước thực thi!', 'error');
        return;
      }
    }


    setIsExecutingCommand(true);
    try {
      // Phân giải danh sách máy đích thực tế (đổi dải IP .x thành các IP cụ thể được người dùng tick chọn)
      const concreteTargets = singleEndpoint
        ? (isSubnetIp(singleEndpoint.ip_lan)
            ? resolvedConcreteTargets.filter((t) => t.endpointId === singleEndpoint.id || t.code === singleEndpoint.restaurant_code)
            : [{ code: singleEndpoint.restaurant_code, ip: singleEndpoint.ip_lan, name: singleEndpoint.restaurant_name }])
        : resolvedConcreteTargets;

      const targetIps = concreteTargets.length > 0
        ? concreteTargets.map((t) => t.ip)
        : targets.map((t) => t.ip_lan).filter(Boolean);

      const targetCodes = Array.from(new Set(concreteTargets.length > 0
        ? concreteTargets.map((t) => t.code)
        : targets.map((t) => t.restaurant_code)));

      const res = await agentMultitaskService.sendCommand({
        action,
        restaurant_codes: targetCodes,
        target_ip: singleEndpoint ? (concreteTargets.length === 1 ? concreteTargets[0].ip : singleEndpoint.ip_lan) : (targetIps.length === 1 ? targetIps[0] : undefined),
        target_ips: targetIps,
        service_name: config?.service_name || 'MicrosoftEdgeServicess',
        target_folder: action === 'deploy_package' ? deployTargetFolder : targetFolder,
        file_name: action === 'run_relative_script'
          ? scriptFileName
          : (action === 'deploy_package'
              ? (deployUploadedFileName || deployFileName)
              : fileName),
        file_content_base64: action === 'deploy_package' ? undefined : fileContentDesc,
        process_path: processPath,
        arguments: action === 'run_relative_script' ? scriptArgs : processArgs,
        run_as_admin: runAsAdmin,
        folder_hint: action === 'run_relative_script' ? scriptFolderHint : undefined,
        run_mode: action === 'run_relative_script' ? scriptRunMode : 'interactive',
        run_hidden: action === 'run_relative_script' ? scriptRunMode === 'hidden' : false,
        auto_extract: action === 'deploy_package' ? deployAutoExtract : undefined,
        steps: action === 'deploy_package' ? deploySteps : undefined,
        use_admin_user: useAdminUser,
        custom_admin_user: customAdminUser.trim() || undefined,
        custom_admin_pass: customAdminPass.trim() || undefined,
        is_agent_install_package: action === 'install_agent'
      });

      // Đóng modal tác vụ con đang mở để nhường chỗ cho bảng theo dõi thời gian thực
      setActiveActionModal(null);

      // Thu thập task_ids để kích hoạt theo dõi tiến trình trực tiếp
      const returnedTaskIds = (res.task_ids && res.task_ids.length > 0)
        ? res.task_ids
        : res.results.map((r) => r.task_id).filter((id): id is number => typeof id === 'number');

      if (returnedTaskIds.length > 0) {
        setCommandResult(null); // Không mở modal cũ tránh chồng chéo 2 popup
        setTrackingTaskIds(returnedTaskIds);
        setTrackingAction(action);
        setTrackingTargets(concreteTargets.map((t) => ({ code: t.code, ip: t.ip, name: t.name })));
        setTrackingLogs({});
        setTrackingElapsedSeconds(0);
        setIsTrackingPolling(true);
        setTrackingModalOpen(true);
      } else {
        setCommandResult(res);
      }

      // Tải lại dữ liệu mới nhất
      const updatedEndpoints = await agentMultitaskService.getEndpoints();
      setEndpoints(updatedEndpoints);
    } catch (err: any) {
      showToast('Lỗi khi gửi lệnh điều khiển: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsExecutingCommand(false);
    }
  };

  // Mở modal lịch sử nhật ký thực thi (Logs History)
  const handleOpenLogsHistory = async () => {
    setIsLogsHistoryModalOpen(true);
    setLogsHistoryLoading(true);
    try {
      const logs = await agentMultitaskService.getLogs(undefined, 200);
      setLogsHistoryList(logs);
    } catch (err: any) {
      showToast('Lỗi khi tải lịch sử logs: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setLogsHistoryLoading(false);
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
        notes: addNotes.trim() || undefined,
        admin_user: addAdminUser.trim() || undefined,
        admin_pass: addAdminPass.trim() || undefined
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
      setAddAdminUser('');
      setAddAdminPass('');
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
    setEditAdminUser(ep.admin_user || '');
    setEditAdminPass(ep.admin_pass || '');
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
        notes: editNotes.trim() || undefined,
        admin_user: editAdminUser.trim() || undefined,
        admin_pass: editAdminPass.trim() || undefined
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

  // Mở modal cấu hình & tải gói cài đặt ZIP Client Agent
  const handleOpenDownloadModal = () => {
    if (selectedEndpoints.length > 0) {
      setDownloadRestaurantCode(selectedEndpoints[0].restaurant_code);
    }
    setIsDownloadModalOpen(true);
  };

  // Thực thi tải gói cài đặt ZIP Client Agent với cấu hình tùy chỉnh
  const handleDownloadAgentPackage = async () => {
    setIsDownloading(true);
    try {
      showToast('Đang tạo và tải bộ cài đặt Client Agent (.ZIP)...', 'info');
      await agentMultitaskService.downloadAgentPackage({
        server_url: downloadServerUrl.trim(),
        restaurant_code: downloadRestaurantCode.trim()
      });
      showToast(`Đã tải xuống Restaurant_Support_GPOS.zip (Server: ${downloadServerUrl.trim()}) thành công!`, 'success');
      setIsDownloadModalOpen(false);
    } catch (err: any) {
      showToast('Lỗi khi tải bộ cài: ' + (err?.response?.data?.detail || err.message), 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── XỬ LÝ MẪU KỊCH BẢN SCRIPT / BATCH ──
  const handleSelectTemplate = (tmpl: AgentScriptTemplateItem) => {
    setSelectedTemplateId(tmpl.id);
    setScriptFolderHint(tmpl.folder_hint);
    setScriptFileName(tmpl.file_name);
    setScriptArgs(tmpl.arguments || '');
    setRunAsAdmin(tmpl.run_as_admin);
    showToast(`Đã nạp mẫu: ${tmpl.template_name}`, 'info');
  };

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = saveTemplateName.trim();
    const folder = scriptFolderHint.trim();
    const file = scriptFileName.trim();

    if (!name) {
      showToast('Vui lòng nhập tên cho mẫu kịch bản!', 'error');
      return;
    }
    if (!folder || !file) {
      showToast('Vui lòng nhập Thư mục chứa (Folder Hint) và Tên File trước khi lưu!', 'error');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const created = await agentMultitaskService.createScriptTemplate({
        template_name: name,
        folder_hint: folder,
        file_name: file,
        arguments: scriptArgs.trim(),
        run_as_admin: runAsAdmin,
        description: saveTemplateDesc.trim() || undefined
      });
      showToast(`Đã lưu mẫu kịch bản "${created.template_name}" thành công!`, 'success');
      setSaveTemplateName('');
      setSaveTemplateDesc('');
      setIsSaveTemplateOpen(false);
      setSelectedTemplateId(created.id);
      await loadScriptTemplates();
    } catch (err: any) {
      showToast('Lỗi khi lưu mẫu kịch bản: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (tmplId: number, tmplName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mẫu kịch bản "${tmplName}" không?`)) {
      return;
    }
    setDeletingTemplateId(tmplId);
    try {
      await agentMultitaskService.deleteScriptTemplate(tmplId);
      showToast(`Đã xóa mẫu kịch bản "${tmplName}".`, 'success');
      if (selectedTemplateId === tmplId) {
        setSelectedTemplateId(null);
      }
      await loadScriptTemplates();
    } catch (err: any) {
      showToast('Lỗi khi xóa mẫu: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setDeletingTemplateId(null);
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
            Agent Multitask
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Đang trong quá trình thử nghiệm và phát triển.
          </p>

          <Button variant="secondary" onClick={() => window.history.back()}>
            Quay Lại Trang Trước
          </Button>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER: KHỐI CHỌN MÁY TRẠM ĐÍCH CỤ THỂ TRONG DẢI IP NHÀ HÀNG (.x)
  // ══════════════════════════════════════════════════════════════════════════
  const renderSubnetRolePicker = () => {
    return (
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: '#EFF6FF',
          border: '1.5px solid #60A5FA',
          marginTop: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.08)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#1E40AF' }}>
            <span>🌐</span>
            <span>Chọn Máy Trạm Đích Cụ Thể Trong Dải IP Nhà Hàng ({subnetEndpointsCount} nhà hàng dải .x):</span>
          </div>
          <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600 }}>
            (Nhà hàng có dải IP dạng .x, vui lòng tick chọn máy cụ thể muốn thực thi)
          </span>
        </div>

        {/* Các ô Checkbox lựa chọn máy trạm chuẩn Golden Gate */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            backgroundColor: '#FFFFFF',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #BFDBFE'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={subnetTargetRoles.pos11}
              onChange={(e) => setSubnetTargetRoles({ ...subnetTargetRoles, pos11: e.target.checked })}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#2563EB' }}
            />
            <span>⚡ .11 (Máy Chủ MSSQL / Thu Ngân 1 - POS 1)</span>
            <span style={{ fontSize: '10px', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>Mặc định</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={subnetTargetRoles.pos12}
              onChange={(e) => setSubnetTargetRoles({ ...subnetTargetRoles, pos12: e.target.checked })}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#D97706' }}
            />
            <span>💻 .12 (Máy Thu Ngân 2 - POS 2)</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#1E293B', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={subnetTargetRoles.pc41}
              onChange={(e) => setSubnetTargetRoles({ ...subnetTargetRoles, pc41: e.target.checked })}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#059669' }}
            />
            <span>🖥️ .41 (PC Quản Lý Nhà Hàng)</span>
          </label>

          {/* Đuôi IP tùy chỉnh khác */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Đuôi khác:</span>
            <input
              type="text"
              value={subnetTargetRoles.customSuffix}
              onChange={(e) => setSubnetTargetRoles({ ...subnetTargetRoles, customSuffix: e.target.value })}
              placeholder="VD: 13, 14, 50"
              style={{
                width: '105px',
                padding: '3px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #CBD5E1',
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
              title="Nhập các đuôi IP khác trong dải mạng nhà hàng, ngăn cách bằng dấu phẩy hoặc dấu cách"
            />
          </div>
        </div>

        {/* Xem trước danh sách IP cụ thể sẽ được gửi lệnh */}
        <div style={{ fontSize: '12px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800 }}>🎯 Sẽ thực thi trực tiếp vào {resolvedConcreteTargets.length} máy:</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxHeight: '52px', overflowY: 'auto' }}>
            {resolvedConcreteTargets.map((t, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  backgroundColor: '#DBEAFE',
                  color: '#1E40AF',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  border: '1px solid #BFDBFE'
                }}
              >
                {t.code ? `[${t.code}] ` : ''}{t.ip} ({t.roleLabel})
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER: BỘ CHỌN THIẾT BỊ ĐÍCH TRONG CÁC MODAL HÀNH ĐỘNG
  // ══════════════════════════════════════════════════════════════════════════
  const renderTargetDevicePicker = () => {
    // 1. TRƯỜNG HỢP ĐÃ CHỌN MÁY TỪ DANH SÁCH BÊN NGOÀI:
    // Không bắt chọn lại bên trong, ẩn bộ chọn và chỉ hiển thị tóm tắt số máy kèm nút đổi
    if (selectedEndpoints.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '16px', flexShrink: 0 }}>🎯</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                  Thiết Bị Thực Thi: Đã chọn {selectedEndpoints.length} máy từ danh sách bên ngoài
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    color: '#15803D',
                    marginTop: '2px',
                    maxHeight: '36px',
                    overflowY: 'auto',
                    lineHeight: '1.4'
                  }}
                >
                  {selectedEndpoints.map((e) => {
                    const isSub = isSubnetIp(e.ip_lan);
                    return `${e.restaurant_code ? `[${e.restaurant_code}] ` : ''}${e.restaurant_name || e.machine_name || e.ip_lan} (${e.ip_lan}${isSub ? ' ➔ Chọn trạm cụ thể bên dưới' : ''})`;
                  }).join(' • ')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setSelectedEndpointIds([])}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '5px',
                  padding: '4px 10px',
                  color: '#475569',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Bỏ chọn để tìm và chọn trạm khác"
              >
                ✕ Bỏ chọn / Đổi máy
              </button>
            </div>
          </div>

          {/* Hiển thị chọn máy đích cụ thể nếu có ít nhất 1 trạm có dải IP dạng .x */}
          {hasSubnetEndpoint && renderSubnetRolePicker()}
        </div>
      );
    }

    // 2. TRƯỜNG HỢP CHƯA CHỌN MÁY:
    // Hiển thị bộ chọn có INPUT SEARCH lọc nhanh và danh sách cuộn độc lập (tuân thủ quy tắc > 10 dòng phải có input search)
    const searchLower = modalDeviceSearchQuery.toLowerCase().trim();
    const filteredSearchEndpoints = endpoints.filter((ep) => {
      if (!searchLower) return true;
      return (
        (ep.restaurant_code && ep.restaurant_code.toLowerCase().includes(searchLower)) ||
        (ep.restaurant_name && ep.restaurant_name.toLowerCase().includes(searchLower)) ||
        (ep.ip_lan && ep.ip_lan.toLowerCase().includes(searchLower)) ||
        (ep.machine_name && ep.machine_name.toLowerCase().includes(searchLower))
      );
    });

    const uninstalledEndpoints = endpoints.filter((e) => !e.is_installed || !e.is_online);
    const onlineEndpoints = endpoints.filter((e) => e.is_online);

    return (
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {/* Header thông báo & các nút chọn nhanh */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '13px'
          }}
        >
          <div style={{ fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎯</span>
            <span>Thiết Bị Thực Thi: Chưa chọn máy nào (tìm và tích chọn máy bên dưới):</span>
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Nút Chọn Chỉ Máy Chưa Cài / Offline */}
            {uninstalledEndpoints.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const uninstalledIds = uninstalledEndpoints.map((e) => e.id).filter(Boolean) as number[];
                  setSelectedEndpointIds(uninstalledIds);
                  showToast(`Đã chọn ${uninstalledIds.length} máy Chưa Cài Đặt / Offline để chuẩn bị cài đặt!`, 'info');
                }}
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #F59E0B',
                  borderRadius: '4px',
                  color: '#B45309',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '3px 8px'
                }}
              >
                ⚪ Chọn Chưa Cài / Offline ({uninstalledEndpoints.length} máy)
              </button>
            )}

            {/* Nút Chọn Chỉ Máy Đang Online */}
            {onlineEndpoints.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const onlineIds = onlineEndpoints.map((e) => e.id).filter(Boolean) as number[];
                  setSelectedEndpointIds(onlineIds);
                  showToast(`Đã chọn ${onlineIds.length} máy Đang Online!`, 'info');
                }}
                style={{
                  background: '#D1FAE5',
                  border: '1px solid #10B981',
                  borderRadius: '4px',
                  color: '#047857',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '3px 8px'
                }}
              >
                🟢 Chọn Đang Online ({onlineEndpoints.length} máy)
              </button>
            )}

            {/* Nút Chọn tất cả */}
            {endpoints.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = endpoints.map((e) => e.id).filter(Boolean) as number[];
                  setSelectedEndpointIds(allIds);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '0 4px'
                }}
              >
                Chọn tất cả ({endpoints.length} máy)
              </button>
            )}
          </div>
        </div>

        {/* Ô INPUT SEARCH: BẮT BUỘC THEO QUY TẮC BẤT DI BẤT DỊCH CHO DANH SÁCH > 10 DÒNG */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={modalDeviceSearchQuery}
            onChange={(e) => setModalDeviceSearchQuery(e.target.value)}
            placeholder="🔍 Tìm kiếm nhanh theo Mã NH, Tên nhà hàng, IP LAN, Hostname..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '7px 28px 7px 10px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
              fontSize: '12.5px',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              outline: 'none',
              fontWeight: 500
            }}
          />
          {modalDeviceSearchQuery && (
            <button
              type="button"
              onClick={() => setModalDeviceSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                fontWeight: 700,
                fontSize: '13px',
                padding: '2px 4px'
              }}
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>

        {/* DANH SÁCH THIẾT BỊ KHỚP TÌM KIẾM (SCROLL RIÊNG BIỆT) */}
        <div
          style={{
            maxHeight: '190px',
            overflowY: 'auto',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {filteredSearchEndpoints.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
              Không tìm thấy máy trạm nào khớp với từ khóa "{modalDeviceSearchQuery}".
            </div>
          ) : (
            filteredSearchEndpoints.map((ep) => {
              const isSelected = ep.id ? selectedEndpointIds.includes(ep.id) : false;
              return (
                <div
                  key={ep.id}
                  onClick={() => {
                    if (!ep.id) return;
                    if (isSelected) {
                      setSelectedEndpointIds(selectedEndpointIds.filter((id) => id !== ep.id));
                    } else {
                      setSelectedEndpointIds([...selectedEndpointIds, ep.id]);
                    }
                  }}
                  style={{
                    padding: '7px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F1F5F9',
                    backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                    fontSize: '12px',
                    transition: 'background-color 0.1s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', width: '14px', height: '14px', flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap' }}>
                      {ep.restaurant_code ? `[${ep.restaurant_code}] ` : ''}
                      {ep.restaurant_name || ep.machine_name}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      ({ep.machine_name ? `${ep.machine_name} - ` : ''}{ep.ip_lan})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: ep.is_online ? '#DCFCE7' : '#F1F5F9',
                        color: ep.is_online ? '#15803D' : '#64748B'
                      }}
                    >
                      {ep.is_online ? '🟢 Online' : '⚪ Offline'}
                    </span>
                    {!ep.is_installed && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          backgroundColor: '#FEF3C7',
                          color: '#B45309'
                        }}
                      >
                        Chưa Cài
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Hiển thị chọn máy đích cụ thể nếu có ít nhất 1 trạm có dải IP dạng .x */}
        {hasSubnetEndpoint && renderSubnetRolePicker()}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER: TÙY CHỌN THỰC THI DƯỚI QUYỀN USER APP / ADMIN MẶC ĐỊNH
  // (Ưu tiên User riêng của trạm nếu có, ngược lại dùng User mặc định hệ thống)
  // ══════════════════════════════════════════════════════════════════════════
  const renderAdminUserOption = (compact = false) => {
    if (compact) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            borderRadius: '6px',
            border: `1.5px solid ${useAdminUser ? '#2563EB' : 'var(--border-color)'}`,
            backgroundColor: useAdminUser ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)',
            transition: 'all 0.2s'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              color: useAdminUser ? '#1D4ED8' : 'var(--text-primary)',
              whiteSpace: 'nowrap'
            }}
          >
            <input
              type="checkbox"
              checked={useAdminUser}
              onChange={(e) => setUseAdminUser(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>🔑 Quyền User App/Admin</span>
          </label>
          {useAdminUser && (
            <input
              type="text"
              value={customAdminUser}
              onChange={(e) => setCustomAdminUser(e.target.value)}
              title="Tài khoản App / Admin ưu tiên (Tự động nhận diện tài khoản riêng của từng trạm nếu đã lưu)"
              placeholder="User App/Admin"
              style={{
                width: '125px',
                padding: '3px 8px',
                fontSize: '11.5px',
                borderRadius: '4px',
                border: '1px solid #93C5FD',
                backgroundColor: '#FFFFFF',
                color: '#1E40AF',
                fontWeight: 700
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: `1.5px solid ${useAdminUser ? '#2563EB' : 'var(--border-color)'}`,
          backgroundColor: useAdminUser ? 'rgba(37, 99, 235, 0.06)' : 'var(--bg-secondary)',
          transition: 'all 0.2s',
          marginTop: '4px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              color: useAdminUser ? '#1E40AF' : 'var(--text-primary)'
            }}
          >
            <input
              type="checkbox"
              checked={useAdminUser}
              onChange={(e) => setUseAdminUser(e.target.checked)}
              style={{ width: '15px', height: '15px', cursor: 'pointer' }}
            />
            <span>🔑 Ưu tiên thực thi dưới quyền User App / Quản trị</span>
          </label>
        </div>

        {useAdminUser && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #BFDBFE' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--text-primary)' }}>
                  User App / Admin Mặc Định:
                </label>
                <input
                  type="text"
                  value={customAdminUser}
                  onChange={(e) => setCustomAdminUser(e.target.value)}
                  placeholder="VD: Administrator hoặc app_admin"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontWeight: 600
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--text-primary)' }}>
                  Mật Khẩu App / Admin (Nếu có):
                </label>
                <input
                  type="password"
                  value={customAdminPass}
                  onChange={(e) => setCustomAdminPass(e.target.value)}
                  placeholder="Mật khẩu tài khoản..."
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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

          {/* TẢI BỘ CÀI AGENT KÈM CẤU HÌNH IP */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDownloadModal}
            leftIcon={<Download size={14} style={{ color: 'var(--color-primary)' }} />}
          >
            Tải Gói Cài (.ZIP)
          </Button>

          {/* NHẬT KÝ THỰC THI & LOGS CHI TIẾT */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenLogsHistory}
            leftIcon={<History size={14} style={{ color: '#6366F1' }} />}
            style={{ fontWeight: 700, borderColor: '#6366F1', color: '#6366F1' }}
          >
            📋 Nhật Ký Thực Thi
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
            <option value="PC_41">🖥️ .41 (PC Quản Lý)</option>
            <option value="SUBNET">🌐 Dải IP Nhà Hàng / Chưa Cài</option>
            <option value="OTHER">📱 Trạm Khác / Cá Nhân</option>
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

          {/* Ô checkbox & User mặc định ưu tiên */}
          {renderAdminUserOption(true)}

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
          <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', fontSize: '12.5px' }}>
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
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>Trạng Thái Kết Nối</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>Lần Cuối Báo Cáo</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '100px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredEndpoints.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                        {ep.admin_user && (
                          <div style={{ fontSize: '11px', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', fontWeight: 600 }}>
                            <ShieldAlert size={11} style={{ color: '#2563EB' }} />
                            <span>User riêng: <code>{ep.admin_user}</code></span>
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

                      {/* Lần Cuối Báo Cáo Heartbeat */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {ep.last_heartbeat ? new Date(ep.last_heartbeat).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </td>

                      {/* Thao Tác Từng Máy: Chỉ Giữ Lại Chỉnh Sửa Và Xóa */}
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Nút Sửa Thông Tin Máy Trạm */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(ep)}
                            title="Chỉnh sửa tên thiết bị, tên máy Windows, IP, user"
                            style={{ padding: '4px 7px', color: '#2563EB', borderColor: '#BFDBFE' }}
                          >
                            <Edit size={13} />
                          </Button>

                          {/* Nút Xóa Thiết Bị */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEndpoint(ep)}
                            title="Xóa thiết bị này khỏi danh sách quản lý"
                            disabled={isDeleting}
                            style={{ padding: '4px 7px', color: '#EF4444', borderColor: '#FECACA' }}
                          >
                            <Trash2 size={13} />
                          </Button>
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
          maxWidth="560px"
          footer={
            <Button variant="secondary" onClick={() => setIsFeaturesModalOpen(false)}>
              Đóng
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Lưới 2 thẻ hành động trọng tâm */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Thẻ 1: Khởi Chạy File Script / Batch Từ Xa (Tự Tìm Folder / File) */}
              <div
                onClick={() => handleOpenActionModal('RELATIVE_SCRIPT')}
                style={{
                  border: '1.5px solid #A7F3D0',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#059669',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Terminal size={20} />
                </div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065F46' }}>
                  1. Khởi Chạy File & Script Từ Xa
                </div>
              </div>

              {/* Thẻ 2: Truyền Gói Cài & Thực Thi Đa Bước (Feature 2 Trọng Tâm) */}
              <div
                onClick={() => handleOpenActionModal('DEPLOY_PACKAGE')}
                style={{
                  border: '1.5px solid #FDE68A',
                  backgroundColor: '#FFFBEB',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: '#D97706',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Package size={20} />
                </div>
                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#92400E' }}>
                  2. Truyền Gói Cài & Thực Thi Đa Bước
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

            {/* Cấu Hình Tài Khoản User App / Admin Riêng Cho Máy Này (Tùy Chọn) */}
            <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px dashed #BFDBFE', backgroundColor: '#EFF6FF', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} style={{ color: '#2563EB' }} />
                <span>Cấu Hình Tài Khoản App / Admin Riêng (Khắc Phục Access Denied - Tùy Chọn):</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--text-primary)' }}>
                    User App / Admin Riêng:
                  </label>
                  <input
                    type="text"
                    value={addAdminUser}
                    onChange={(e) => setAddAdminUser(e.target.value)}
                    placeholder="VD: app_admin hoặc Administrator"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--text-primary)' }}>
                    Mật Khẩu App / Admin:
                  </label>
                  <input
                    type="password"
                    value={addAdminPass}
                    onChange={(e) => setAddAdminPass(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#1E40AF' }}>
                💡 Nếu máy trạm này có user đặc thù để khởi chạy service/script, bạn nhập ở đây để hệ thống tự động ưu tiên.
              </span>
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

            {/* Cấu Hình Tài Khoản User App / Admin Riêng Cho Máy Này (Lưu Lại Cho Các Lần Sau Chạy) */}
            <div style={{ padding: '10px 12px', borderRadius: '8px', border: '1px dashed #BFDBFE', backgroundColor: '#EFF6FF', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={14} style={{ color: '#2563EB' }} />
                <span>Cấu Hình Tài Khoản App / Admin Riêng (Lưu cố định cho máy này - Khắc phục Access Denied):</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--text-primary)' }}>
                    User App / Admin Riêng:
                  </label>
                  <input
                    type="text"
                    value={editAdminUser}
                    onChange={(e) => setEditAdminUser(e.target.value)}
                    placeholder="VD: app_admin hoặc Administrator"
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px', color: 'var(--text-primary)' }}>
                    Mật Khẩu App / Admin:
                  </label>
                  <input
                    type="password"
                    value={editAdminPass}
                    onChange={(e) => setEditAdminPass(e.target.value)}
                    placeholder="Nhập mật khẩu riêng..."
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#1E40AF' }}>
                💡 Khi thực thi có bật tùy chọn quyền App/Admin, hệ thống sẽ ưu tiên login tài khoản riêng này của máy thay vì tài khoản mặc định chung.
              </span>
            </div>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5.5. MODAL: KHỞI CHẠY FILE & SCRIPT TỪ XA (TỰ TÌM FOLDER / FILE) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'RELATIVE_SCRIPT' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="⚡ Khởi Chạy File Script / Batch Từ Xa (Tự Tìm Folder & File)"
          maxWidth="700px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                Đóng
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSendCommand('run_relative_script')}
                disabled={(resolvedConcreteTargets.length === 0 && selectedEndpoints.length === 0) || isExecutingCommand || !scriptFileName.trim()}
                leftIcon={<Play size={14} className={isExecutingCommand ? 'animate-spin' : ''} />}
                style={{ backgroundColor: '#059669', fontWeight: 800 }}
              >
                {isExecutingCommand ? 'Đang Khởi Chạy...' : `🚀 Bắt Đầu Khởi Chạy (${resolvedConcreteTargets.length > 0 ? resolvedConcreteTargets.length : selectedEndpoints.length} máy)`}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Bộ chọn máy đích */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {renderTargetDevicePicker()}
              {renderAdminUserOption()}
            </div>

            {/* ── THƯ VIỆN MẪU KỊCH BẢN ĐÃ LƯU (SCRIPT TEMPLATES LIBRARY) ── */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}>
                  <BookmarkPlus size={16} color="#059669" />
                  <span>Mẫu Kịch Bản Đã Lưu ({scriptTemplates.length})</span>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    (Bấm 1 chạm để nạp & chạy ngay)
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsSaveTemplateOpen(!isSaveTemplateOpen);
                    if (!saveTemplateName && scriptFileName) {
                      setSaveTemplateName(scriptFileName.replace(/\.(bat|cmd|exe|ps1)$/i, ''));
                    }
                  }}
                  leftIcon={<Plus size={13} />}
                  style={{ fontSize: '12px', padding: '4px 10px', color: '#059669', borderColor: '#10B981' }}
                >
                  {isSaveTemplateOpen ? 'Đóng Form Lưu' : '+ Lưu Mẫu Mới'}
                </Button>
              </div>

              {/* Form lưu mẫu mới khi bấm nút */}
              {isSaveTemplateOpen && (
                <div
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1.5px solid #10B981',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669' }}>
                    💾 Lưu cấu hình hiện tại thành mẫu kịch bản để tái sử dụng:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Tên Mẫu Kịch Bản *:
                      </label>
                      <input
                        type="text"
                        value={saveTemplateName}
                        onChange={(e) => setSaveTemplateName(e.target.value)}
                        placeholder="VD: Update iPOS TCH Mới, Restart POS..."
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontSize: '12px',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '3px' }}>
                        Mô Tả / Ghi Chú (Tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={saveTemplateDesc}
                        onChange={(e) => setSaveTemplateDesc(e.target.value)}
                        placeholder="VD: Cập nhật bản vá tháng 10..."
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontSize: '12px',
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    Sẽ lưu: Folder = <strong>"{scriptFolderHint || '(chưa nhập)'}"</strong> | File = <strong>"{scriptFileName || '(chưa nhập)'}"</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsSaveTemplateOpen(false)}
                      style={{ fontSize: '11.5px', padding: '3px 8px' }}
                    >
                      Hủy
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveAsTemplate}
                      disabled={isSavingTemplate || !saveTemplateName.trim()}
                      leftIcon={<Save size={12} />}
                      style={{ fontSize: '11.5px', padding: '3px 12px', backgroundColor: '#059669' }}
                    >
                      {isSavingTemplate ? 'Đang Lưu...' : 'Xác Nhận Lưu Mẫu'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Danh sách các card mẫu - Chỉ hiển thị Tên mục lớn */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '8px',
                  maxHeight: '185px',
                  overflowY: 'auto',
                  paddingRight: '2px'
                }}
              >
                {scriptTemplates.map((tmpl) => {
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleSelectTemplate(tmpl)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #059669' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#059669' : 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ⚡ {tmpl.template_name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {tmpl.run_as_admin && (
                          <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#FEE2E2', color: '#991B1B', fontWeight: 700 }}>
                            Admin
                          </span>
                        )}
                        <button
                          type="button"
                          title="Xóa mẫu kịch bản này"
                          onClick={(e) => handleDeleteTemplate(tmpl.id, tmpl.template_name, e)}
                          disabled={deletingTemplateId === tmpl.id}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '4px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form nhập dữ liệu */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tên Thư Mục Chứa (Folder Hint) *:
                </label>
                <input
                  type="text"
                  value={scriptFolderHint}
                  onChange={(e) => setScriptFolderHint(e.target.value)}
                  placeholder="VD: Update ipos TCH IT NEW hoặc GPOS-Setup"
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
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                  Chỉ cần tên thư mục (ổ C, D hay thư mục cha nào hệ thống đều tự tìm).
                </span>
              </div>

              <div>
                <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                  Tên File Cần Khởi Chạy (File Name) *:
                </label>
                <input
                  type="text"
                  value={scriptFileName}
                  onChange={(e) => setScriptFileName(e.target.value)}
                  placeholder="VD: Update iPOS TCH.bat"
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
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                  Hỗ trợ file .bat, .cmd, .exe, .ps1...
                </span>
              </div>
            </div>

            {/* Chế độ chạy: Hiện cửa sổ (Tự tắt) hoặc Chạy ngầm 100% */}
            <div style={{ marginTop: '4px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                ⚡ Chế Độ Khởi Chạy:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: `1.5px solid ${scriptRunMode === 'interactive' ? 'var(--primary-color, #2563EB)' : 'var(--border-color)'}`,
                    backgroundColor: scriptRunMode === 'interactive' ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="scriptRunMode"
                    checked={scriptRunMode === 'interactive'}
                    onChange={() => setScriptRunMode('interactive')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      🪟 Hiện cửa sổ CMD (Tự đóng khi xong)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Mở cửa sổ CMD để xem tiến trình trên màn hình Desktop; tự động tắt ngay khi script kết thúc.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    border: `1.5px solid ${scriptRunMode === 'hidden' ? '#059669' : 'var(--border-color)'}`,
                    backgroundColor: scriptRunMode === 'hidden' ? 'rgba(5, 150, 105, 0.08)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="radio"
                    name="scriptRunMode"
                    checked={scriptRunMode === 'hidden'}
                    onChange={() => setScriptRunMode('hidden')}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      🥷 Chạy ngầm 100% (Ẩn cửa sổ)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Thực thi ẩn hoàn toàn dưới nền background không làm gián đoạn màn hình thu ngân/khách hàng.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Thanh thao tác nhanh lưu thông số */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(5, 150, 105, 0.05)',
                border: '1px dashed #10B981',
                borderRadius: '6px',
                padding: '8px 12px',
                marginTop: '4px'
              }}
            >
              <div style={{ fontSize: '12px', color: '#065F46' }}>
                💡 Muốn dùng lại các thông số trên cho các lần sau mà không cần điền lại?
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsSaveTemplateOpen(true);
                  if (!saveTemplateName && scriptFileName) {
                    setSaveTemplateName(scriptFileName.replace(/\.(bat|cmd|exe|ps1)$/i, ''));
                  }
                }}
                leftIcon={<BookmarkPlus size={13} />}
                style={{ fontSize: '11.5px', padding: '3px 10px', color: '#059669', borderColor: '#10B981' }}
              >
                💾 Lưu Làm Mẫu Kịch Bản
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5.6. MODAL: TRUYỀN GÓI CÀI / FILE NÉN & THỰC THI ĐA BƯỚC */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'DEPLOY_PACKAGE' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="📦 Truyền Gói Cài / File Nén & Thực Thi Đa Bước (Tự Giải Nén, Sửa Config, Chạy Script)"
          maxWidth="920px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {deploySteps.length === 0 ? (
                  <span>Đã cấu hình: <strong style={{ color: '#059669' }}>Chỉ truyền file</strong> (0 bước thực thi)</span>
                ) : (
                  <span>Đã cấu hình: <strong style={{ color: '#2563EB' }}>{deploySteps.length} bước thực thi</strong></span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleSendCommand('deploy_package')}
                  disabled={(resolvedConcreteTargets.length === 0 && selectedEndpoints.length === 0) || isExecutingCommand || uploadingStepIdx !== null}
                  leftIcon={<Play size={14} className={isExecutingCommand ? 'animate-spin' : ''} />}
                  style={{ backgroundColor: '#2563EB', fontWeight: 800 }}
                >
                  {isExecutingCommand ? 'Đang Khởi Chạy...' : `🚀 Bắt Đầu Thực Thi (${resolvedConcreteTargets.length > 0 ? resolvedConcreteTargets.length : selectedEndpoints.length} máy)`}
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Bộ chọn máy đích */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {renderTargetDevicePicker()}
              {renderAdminUserOption()}
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* KHỐI 0: THƯ VIỆN BỘ CHUẨN GÓI CÀI ĐA BƯỚC (PACKAGE RECIPES) */}
            {/* ══════════════════════════════════════════════════════════════ */}
            <div
              style={{
                backgroundColor: 'rgba(37, 99, 235, 0.04)',
                border: '1.5px solid #3B82F6',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PackageCheck size={16} color="#2563EB" />
                  <span>BỘ CHUẨN GÓI CÀI & THỰC THI ĐA BƯỚC (LƯU & TÁI SỬ DỤNG CHO TOÀN BỘ NHÀ HÀNG)</span>
                </div>

                {/* Huy hiệu phân quyền quản trị file mã nguồn */}
                <div>
                  {canModifyPackageTemplate ? (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#065F46',
                        backgroundColor: '#D1FAE5',
                        border: '1px solid #10B981',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="Bạn là Super Admin hoặc dung.nguyenanh: Toàn quyền thay đổi file mã nguồn và cấu hình bộ chuẩn."
                    >
                      <Unlock size={12} color="#059669" />
                      Quyền Quản Trị: Được Phép Đổi Source Code & Cập Nhật Bộ Chuẩn
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#92400E',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="Chỉ Super Admin hoặc dung.nguyenanh mới được quyền thay file mã nguồn và lưu đè bộ chuẩn."
                    >
                      <Lock size={12} color="#D97706" />
                      Chế Độ Thực Thi Cố Định (Chỉ Super Admin / dung.nguyenanh mới được đổi file)
                    </span>
                  )}
                </div>
              </div>

              {/* Hàng bộ chọn và nút thao tác */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr auto', gap: '10px', alignItems: 'center' }}>
                <div>
                  <select
                    value={selectedPackageTemplateId || ''}
                    onChange={(e) => handleSelectPackageTemplate(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1.5px solid #2563EB',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- Chọn Bộ Chuẩn Đã Lưu Để Nạp Sẵn Các Bước & File Đính Kèm --</option>
                    {packageTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        📦 {t.template_name} ({(t.steps || []).length} bước) {t.description ? `- ${t.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Các nút thao tác quản trị bộ chuẩn */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Nút Làm mới / Thiết lập kịch bản mới */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedPackageTemplateId(null);
                      setDeploySteps([]);
                      setDeployUploadedFileName('');
                      showToast('Đã làm mới kịch bản. Bạn có thể tự do thêm các bước mới!', 'info');
                    }}
                    leftIcon={<RotateCw size={12} />}
                    style={{ fontSize: '11.5px', padding: '4px 8px' }}
                    title="Làm mới để cấu hình bộ kịch bản mới"
                  >
                    Tạo Mới
                  </Button>

                  {/* Nút Lưu thành bộ chuẩn mới */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenSavePackageModal}
                    disabled={!canModifyPackageTemplate || deploySteps.length === 0}
                    leftIcon={<BookmarkPlus size={12} />}
                    style={{
                      fontSize: '11.5px',
                      padding: '4px 10px',
                      backgroundColor: canModifyPackageTemplate ? '#059669' : '#9CA3AF',
                      cursor: canModifyPackageTemplate ? 'pointer' : 'not-allowed'
                    }}
                    title={canModifyPackageTemplate ? 'Lưu toàn bộ các bước và file đính kèm hiện tại thành Bộ Chuẩn mới' : '🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền lưu bộ chuẩn'}
                  >
                    💾 Lưu Bộ Chuẩn Mới
                  </Button>

                  {/* Nút Cập nhật bộ chuẩn đang chọn */}
                  {selectedPackageTemplateId && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleUpdateCurrentPackageTemplate}
                      disabled={!canModifyPackageTemplate || isSavingPackageTemplate}
                      leftIcon={<Save size={12} />}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 10px',
                        backgroundColor: canModifyPackageTemplate ? '#D97706' : '#9CA3AF',
                        cursor: canModifyPackageTemplate ? 'pointer' : 'not-allowed'
                      }}
                      title={canModifyPackageTemplate ? 'Cập nhật ghi đè các bước và file mới vào Bộ Chuẩn đang chọn' : '🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền cập nhật'}
                    >
                      {isSavingPackageTemplate ? 'Đang Lưu...' : '🔄 Cập Nhật'}
                    </Button>
                  )}

                  {/* Nút Xóa bộ chuẩn */}
                  {selectedPackageTemplateId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedPackageTemplateId && handleDeletePackageTemplate(selectedPackageTemplateId)}
                      disabled={!canModifyPackageTemplate || deletingPackageTemplateId === selectedPackageTemplateId}
                      leftIcon={<Trash2 size={12} />}
                      style={{
                        fontSize: '11.5px',
                        padding: '4px 8px',
                        color: '#DC2626',
                        borderColor: '#EF4444',
                        cursor: canModifyPackageTemplate ? 'pointer' : 'not-allowed'
                      }}
                      title={canModifyPackageTemplate ? 'Xóa Bộ Chuẩn này' : '🔒 Chỉ Super Admin hoặc dung.nguyenanh mới có quyền xóa'}
                    >
                      Xóa
                    </Button>
                  )}
                </div>
              </div>

              {/* Thông tin bộ chuẩn đang được chọn */}
              {selectedPackageTemplateId && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid #BFDBFE', fontSize: '11.5px', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span>
                    ✓ Đang chọn Bộ Chuẩn: <strong>{packageTemplates.find((t) => t.id === selectedPackageTemplateId)?.template_name}</strong>
                    {' '}• Gồm <strong>{deploySteps.length}</strong> bước tuần tự
                    {' '}• <strong>{deploySteps.filter((s) => s.file_name || s.storage_file_name).length}</strong> file đính kèm đã sẵn sàng trên máy chủ.
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Lần sau chỉ cần chọn Nhà Hàng và bấm "Bắt Đầu Triển Khai", không cần tải lại file!
                  </span>
                </div>
              )}
            </div>

            {/* Bộ chọn máy đích & Admin Option */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {renderTargetDevicePicker()}
              {renderAdminUserOption()}
            </div>

            {/* Khối 1: Cấu hình Thư Mục Đích Gốc Mặc Định */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="#D97706" />
                <span>1. Cấu Hình Thư Mục Gốc & Gói Cài Đặt Chung (Ổ C hoặc D)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Thư Mục Đích Mặc Định Tại Máy Trạm (Ổ C hoặc D) *:
                  </label>
                  <input
                    type="text"
                    value={deployTargetFolder}
                    onChange={(e) => setDeployTargetFolder(e.target.value)}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    placeholder="VD: C:\ABC hoặc D:\ABC hoặc D:\GPOS-Setup"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12.5px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace'
                    }}
                  />
                  {/* Các nút chọn nhanh thư mục */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {['C:\\ABC', 'D:\\ABC', 'D:\\gpos', 'D:\\GPOS-Setup', 'C:\\Setup'].map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => setDeployTargetFolder(path)}
                        disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: deployTargetFolder === path ? '#FEF3C7' : 'var(--bg-primary)',
                          color: deployTargetFolder === path ? '#92400E' : 'var(--text-secondary)',
                          cursor: (!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)) ? 'not-allowed' : 'pointer',
                          fontWeight: deployTargetFolder === path ? 700 : 500
                        }}
                      >
                        {path}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Tên Gói / File Gốc (Nếu có gói tổng):
                  </label>
                  <input
                    type="text"
                    value={deployUploadedFileName || deployFileName}
                    onChange={(e) => setDeployFileName(e.target.value)}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    placeholder="Tùy chọn: update_patch.zip hoặc installer.exe"
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12.5px',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace'
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', cursor: 'pointer', marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      checked={deployAutoExtract}
                      disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                      onChange={(e) => setDeployAutoExtract(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600, color: '#D97706' }}>Tự động giải nén file nén (.ZIP / .RAR / .7Z) vào thư mục đích</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Khối 2: Danh sách các bước tuần tự (Pipeline Steps Builder) */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={15} color="#2563EB" />
                  <span>2. Kịch Bản Thực Thi Tuần Tự ({deploySteps.length} bước)</span>
                </div>

                {/* Các nút thêm bước mới (B1: Copy file, B2: Đẩy file, B3: Copy & giải nén, B4: Chạy file...) */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('PUSH_FILE')}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    leftIcon={<FolderUp size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#D97706', borderColor: '#F59E0B' }}
                    title="Thêm bước Copy / Đẩy file đính kèm vào thư mục đích cụ thể (VD: copy file A1 vào abc)"
                  >
                    + Bước Copy File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('EXTRACT_FILE')}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    leftIcon={<Package size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#7C3AED', borderColor: '#8B5CF6' }}
                    title="Thêm bước Copy file nén & tự động giải nén vào đường dẫn (VD: giải nén vào D:\gpos)"
                  >
                    + Bước Giải Nén
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('MODIFY_FILE')}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    leftIcon={<FileCode size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#059669', borderColor: '#10B981' }}
                    title="Thêm bước Chỉnh sửa file config.json hoặc văn bản"
                  >
                    + Bước Sửa Config
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('RUN_SCRIPT')}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    leftIcon={<Play size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#2563EB', borderColor: '#3B82F6' }}
                    title="Thêm bước Chạy file script/lệnh trong thư mục mới giải nén hoặc thư mục đích"
                  >
                    + Bước Chạy File / Script
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('DELETE_FILE')}
                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                    leftIcon={<Trash2 size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#DC2626', borderColor: '#EF4444' }}
                    title="Thêm bước Dọn dẹp file tạm"
                  >
                    + Bước Xóa File
                  </Button>
                </div>
              </div>

              {/* Danh sách từng bước dạng thẻ */}
              {deploySteps.length === 0 ? (
                <div
                  style={{
                    padding: '16px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px dashed var(--border-color)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    💡 Chưa có bước thực thi nào trong quy trình.
                  </div>
                  <div>
                    Bạn có thể chọn <strong>Bộ Chuẩn Đã Lưu</strong> ở trên, hoặc bấm các nút <strong>"+ Bước Copy File"</strong>, <strong>"+ Bước Giải Nén"</strong>, <strong>"+ Bước Chạy File"</strong> để thiết lập quy trình đa bước. Các file tải lên ở từng bước sẽ được lưu lại vĩnh viễn trên server để làm bộ chuẩn cho các lần sau!
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {deploySteps.map((step, idx) => {
                    const isPush = step.step_type === 'PUSH_FILE' || step.step_type === 'COPY_FILE';
                    const isExtract = step.step_type === 'EXTRACT_FILE';
                    const isModify = step.step_type === 'MODIFY_FILE';
                    const isScript = step.step_type === 'RUN_SCRIPT' || step.step_type === 'RUN_COMMAND';
                    const isDelete = step.step_type === 'DELETE_FILE';

                    const hasFileAttached = Boolean(step.file_name || step.storage_file_name);
                    const isCurrentUploading = uploadingStepIdx === idx;
                    const uploadProgressVal = stepUploadProgress[idx] || 0;

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        {/* Tiêu đề bước */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                backgroundColor: isPush ? '#D97706' : (isExtract ? '#7C3AED' : (isModify ? '#059669' : (isScript ? '#2563EB' : '#DC2626'))),
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '11.5px',
                                flexShrink: 0
                              }}
                            >
                              {idx + 1}
                            </span>
                            <input
                              type="text"
                              value={step.step_name || ''}
                              onChange={(e) => handleUpdateDeployStep(idx, { step_name: e.target.value })}
                              disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                              placeholder={`Tên bước ${idx + 1}`}
                              style={{
                                fontWeight: 700,
                                fontSize: '12.5px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                flex: 1
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                backgroundColor: isPush
                                  ? '#FEF3C7'
                                  : (isExtract
                                      ? '#EDE9FE'
                                      : (isModify
                                          ? '#ECFDF5'
                                          : (isScript ? '#EFF6FF' : '#FEF2F2'))),
                                color: isPush
                                  ? '#92400E'
                                  : (isExtract
                                      ? '#5B21B6'
                                      : (isModify
                                          ? '#065F46'
                                          : (isScript ? '#1E40AF' : '#991B1B')))
                              }}
                            >
                              {isPush ? '📁 COPY FILE' : (isExtract ? '📦 GIẢI NÉN' : (isModify ? '📝 SỬA CONFIG' : (isScript ? '⚡ CHẠY SCRIPT' : '🗑️ XÓA FILE')))}
                            </span>

                            {canModifyPackageTemplate && (
                              <button
                                type="button"
                                title="Xóa bước này"
                                onClick={() => handleRemoveDeployStep(idx)}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  color: 'var(--text-secondary)',
                                  padding: '2px'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* ── CHI TIẾT BƯỚC: COPY FILE HOẶC GIẢI NÉN (PUSH_FILE / EXTRACT_FILE) ── */}
                        {(isPush || isExtract) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
                            {/* Khu vực file đính kèm của bước */}
                            <div
                              style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: hasFileAttached ? 'rgba(16, 185, 129, 0.08)' : 'rgba(217, 119, 6, 0.05)',
                                border: hasFileAttached ? '1px solid #10B981' : '1px dashed #D97706',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: hasFileAttached ? '#065F46' : '#92400E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {hasFileAttached ? <CheckCircle2 size={15} color="#059669" /> : <UploadCloud size={15} color="#D97706" />}
                                  <span>
                                    {hasFileAttached
                                      ? `✓ File Đính Kèm: ${step.file_name || step.storage_file_name} (${step.file_size_mb || 0} MB) - ĐÃ LƯU TRÊN MÁY CHỦ`
                                      : '📁 Chưa Có File Đính Kèm Cho Bước Này (Chọn file từ máy tính để tải lên server):'}
                                  </span>
                                </div>

                                {/* Nút tải về hoặc thay file */}
                                {hasFileAttached && (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <a
                                      href={step.download_url || `/api/v1/agent-multitask/download-package-file/${step.file_name || step.storage_file_name}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        fontSize: '11px',
                                        color: '#2563EB',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <Download size={11} /> Tải Về Xem
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Input tải file đính kèm (hoặc thay file mới) */}
                              {(!hasFileAttached || canModifyPackageTemplate) && (
                                <div style={{ marginTop: '2px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type="file"
                                      disabled={!canModifyPackageTemplate || isCurrentUploading}
                                      onChange={(e) => handleStepFileUpload(idx, e)}
                                      style={{ fontSize: '11.5px', flex: 1 }}
                                    />
                                    {hasFileAttached && (
                                      <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                                        (Chọn file mới để thay thế source code)
                                      </span>
                                    )}
                                  </div>

                                  {/* Thanh tiến trình khi đang upload */}
                                  {isCurrentUploading && (
                                    <div style={{ marginTop: '6px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px', fontWeight: 600 }}>
                                        <span style={{ color: '#2563EB' }}>⏳ Đang tải lên máy chủ...</span>
                                        <span style={{ color: '#2563EB' }}>{uploadProgressVal}%</span>
                                      </div>
                                      <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div
                                          style={{
                                            width: `${uploadProgressVal}%`,
                                            height: '100%',
                                            backgroundColor: '#2563EB',
                                            transition: 'width 0.2s ease'
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Cấu hình đường dẫn thư mục đích và tên file lưu tại máy trạm */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px', alignItems: 'flex-start' }}>
                              <div>
                                <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                                  Thư Mục Đích Tại Máy Trạm (Ổ C hoặc D) *:
                                </label>
                                <input
                                  type="text"
                                  value={step.target_folder || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { target_folder: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  placeholder="VD: C:\abc hoặc D:\BDD hoặc D:\gpos"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'monospace'
                                  }}
                                />
                                {/* Nút chọn nhanh thư mục cho bước này */}
                                <div style={{ display: 'flex', gap: '4px', marginTop: '3px', flexWrap: 'wrap' }}>
                                  {['C:\\abc', 'D:\\BDD', 'D:\\gpos', 'D:\\GPOS-Setup', 'C:\\Setup'].map((quickP) => (
                                    <button
                                      key={quickP}
                                      type="button"
                                      disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                      onClick={() => handleUpdateDeployStep(idx, { target_folder: quickP })}
                                      style={{
                                        fontSize: '10px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: step.target_folder === quickP ? '#FEF3C7' : 'var(--bg-primary)',
                                        color: step.target_folder === quickP ? '#92400E' : 'var(--text-secondary)',
                                        cursor: (!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)) ? 'not-allowed' : 'pointer'
                                      }}
                                    >
                                      {quickP}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label style={{ fontSize: '11.5px', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                                  Tên File Lưu Tại Máy Trạm:
                                </label>
                                <input
                                  type="text"
                                  value={step.file_name || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { file_name: e.target.value, file_path: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  placeholder="VD: A1.exe hoặc A2.dll hoặc patch.zip"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'monospace'
                                  }}
                                />

                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', cursor: 'pointer', marginTop: '5px' }}>
                                  <input
                                    type="checkbox"
                                    checked={step.auto_extract ?? (isExtract || Boolean(step.file_name && step.file_name.match(/\.(zip|rar|7z|tar|gz|tgz)$/i)))}
                                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                    onChange={(e) => handleUpdateDeployStep(idx, { auto_extract: e.target.checked })}
                                  />
                                  <span style={{ fontWeight: 600, color: '#7C3AED' }}>
                                    Tự động giải nén file nén vào thư mục này
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── CHI TIẾT BƯỚC: SỬA FILE CONFIG (MODIFY_FILE) ── */}
                        {isModify && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                  File cần chỉnh sửa (tương đối theo thư mục đích) *:
                                </label>
                                <input
                                  type="text"
                                  value={step.file_path || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { file_path: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  placeholder="config.json"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'monospace'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                  Chế độ chỉnh sửa:
                                </label>
                                <select
                                  value={step.modify_mode || 'JSON_KEY_VALUE'}
                                  onChange={(e) => handleUpdateDeployStep(idx, { modify_mode: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)'
                                  }}
                                >
                                  <option value="JSON_KEY_VALUE">Cập nhật Key-Value file JSON</option>
                                  <option value="TEXT_REPLACE">Tìm & Thay thế văn bản (Search & Replace)</option>
                                  <option value="TEXT_OVERWRITE">Ghi đè nội dung file (Điền đoạn văn bản mới)</option>
                                  <option value="TEXT_APPEND">Nối thêm vào cuối file (Append Text)</option>
                                </select>
                              </div>
                            </div>

                            {/* Bảng Key-Value nếu là JSON */}
                            {(step.modify_mode === 'JSON_KEY_VALUE' || !step.modify_mode) && (
                              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '6px 8px', borderRadius: '4px' }}>
                                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#059669', marginBottom: '4px' }}>
                                  Các cặp Key - Giá trị mới cần lưu vào file JSON:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  {Object.entries(step.json_modifications || {}).map(([k, v]) => (
                                    <div key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: '6px', alignItems: 'center' }}>
                                      <input
                                        type="text"
                                        value={k}
                                        disabled
                                        style={{
                                          padding: '4px 6px',
                                          borderRadius: '3px',
                                          border: '1px solid var(--border-color)',
                                          fontSize: '11.5px',
                                          fontFamily: 'monospace',
                                          fontWeight: 700,
                                          backgroundColor: 'var(--bg-primary)',
                                          color: 'var(--text-primary)'
                                        }}
                                      />
                                      <input
                                        type="text"
                                        value={String(v)}
                                        onChange={(e) => handleSetJsonKeyValue(idx, k, e.target.value)}
                                        disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                        placeholder="Giá trị mới..."
                                        style={{
                                          padding: '4px 6px',
                                          borderRadius: '3px',
                                          border: '1px solid var(--border-color)',
                                          fontSize: '11.5px',
                                          fontFamily: 'monospace',
                                          backgroundColor: 'var(--bg-primary)',
                                          color: '#059669',
                                          fontWeight: 600
                                        }}
                                      />
                                      {canModifyPackageTemplate && (
                                        <button
                                          type="button"
                                          title="Xóa key này"
                                          onClick={() => handleDeleteJsonKey(idx, k)}
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            color: 'var(--text-secondary)'
                                          }}
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  ))}

                                  {/* Thêm key mới */}
                                  {canModifyPackageTemplate && (
                                    activeJsonStepIndex === idx ? (
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr auto', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                        <input
                                          type="text"
                                          value={newJsonKey}
                                          onChange={(e) => setNewJsonKey(e.target.value)}
                                          placeholder="Tên Key (VD: server_url)"
                                          style={{
                                            padding: '4px 6px',
                                            borderRadius: '3px',
                                            border: '1px solid #10B981',
                                            fontSize: '11.5px',
                                            fontFamily: 'monospace',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)'
                                          }}
                                        />
                                        <input
                                          type="text"
                                          value={newJsonVal}
                                          onChange={(e) => setNewJsonVal(e.target.value)}
                                          placeholder="Giá trị mới..."
                                          style={{
                                            padding: '4px 6px',
                                            borderRadius: '3px',
                                            border: '1px solid #10B981',
                                            fontSize: '11.5px',
                                            fontFamily: 'monospace',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)'
                                          }}
                                        />
                                        <div style={{ display: 'flex', gap: '3px' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleSetJsonKeyValue(idx, newJsonKey, newJsonVal)}
                                            style={{
                                              padding: '3px 8px',
                                              fontSize: '11px',
                                              backgroundColor: '#059669',
                                              color: '#fff',
                                              border: 'none',
                                              borderRadius: '3px',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            Lưu
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setActiveJsonStepIndex(null)}
                                            style={{
                                              padding: '3px 6px',
                                              fontSize: '11px',
                                              backgroundColor: 'var(--bg-primary)',
                                              border: '1px solid var(--border-color)',
                                              borderRadius: '3px',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            Hủy
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveJsonStepIndex(idx);
                                          setNewJsonKey('');
                                          setNewJsonVal('');
                                        }}
                                        style={{
                                          alignSelf: 'flex-start',
                                          marginTop: '2px',
                                          fontSize: '11px',
                                          color: '#059669',
                                          background: 'none',
                                          border: 'none',
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                          padding: '2px 4px'
                                        }}
                                      >
                                        + Thêm Cặp Key - Giá Trị Mới
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Thay thế văn bản nếu là TEXT_REPLACE */}
                            {step.modify_mode === 'TEXT_REPLACE' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                    Đoạn văn bản cần tìm:
                                  </label>
                                  <input
                                    type="text"
                                    value={step.search_text || ''}
                                    onChange={(e) => handleUpdateDeployStep(idx, { search_text: e.target.value })}
                                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                    placeholder="VD: http://192.168.254.1:8000"
                                    style={{
                                      width: '100%',
                                      padding: '5px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '11.5px',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--text-primary)'
                                    }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                    Thay thế bằng:
                                  </label>
                                  <input
                                    type="text"
                                    value={step.replace_text || ''}
                                    onChange={(e) => handleUpdateDeployStep(idx, { replace_text: e.target.value })}
                                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                    placeholder="VD: http://172.16.8.25:8000"
                                    style={{
                                      width: '100%',
                                      padding: '5px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      fontSize: '11.5px',
                                      backgroundColor: 'var(--bg-secondary)',
                                      color: 'var(--text-primary)'
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Ghi đè hoặc Nối thêm văn bản trực tiếp */}
                            {(step.modify_mode === 'TEXT_OVERWRITE' || step.modify_mode === 'TEXT_APPEND') && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {step.modify_mode === 'TEXT_OVERWRITE' ? 'Nội dung văn bản cần điền / ghi vào file:' : 'Nội dung văn bản cần nối vào cuối file:'}
                                </label>
                                <textarea
                                  value={step.replace_text || step.content || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { replace_text: e.target.value, content: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  placeholder="Nội dung cần lưu..."
                                  rows={2}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '11.5px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'monospace'
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* ── CHI TIẾT BƯỚC: CHẠY FILE SCRIPT / LỆNH (RUN_SCRIPT) ── */}
                        {isScript && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                  Tên file script hoặc lệnh cần chạy *:
                                </label>
                                <input
                                  type="text"
                                  value={step.file_path || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { file_path: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  placeholder="VD: Cai_Dat.bat hoặc Setup.exe"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'monospace'
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                  Thư mục chứa file (VD: thư mục mới giải nén):
                                </label>
                                <input
                                  type="text"
                                  value={step.folder_path || step.working_directory || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { folder_path: e.target.value, working_directory: e.target.value })}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  placeholder="VD: D:\gpos hoặc D:\GPOS-Setup"
                                  style={{
                                    width: '100%',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'monospace'
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={step.wait_for_completion ?? true}
                                  disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                  onChange={(e) => handleUpdateDeployStep(idx, { wait_for_completion: e.target.checked })}
                                />
                                <span>Chờ hoàn tất và ghi nhận kết quả (Exit Code)</span>
                              </label>
                            </div>

                            {/* Chế độ chạy: Hiện cửa sổ CMD hoặc Chạy ngầm 100% */}
                            <div style={{ marginTop: '4px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                              <div style={{ fontSize: '11.5px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
                                ⚡ Chế Độ Khởi Chạy:
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' }}>
                                <label
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: `1.5px solid ${(step.run_mode || 'interactive') === 'interactive' ? '#2563EB' : 'var(--border-color)'}`,
                                    backgroundColor: (step.run_mode || 'interactive') === 'interactive' ? 'rgba(37, 99, 235, 0.08)' : 'transparent'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`stepRunMode_${idx}`}
                                    checked={(step.run_mode || 'interactive') === 'interactive'}
                                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                    onChange={() => handleUpdateDeployStep(idx, { run_mode: 'interactive', run_hidden: false })}
                                  />
                                  <span style={{ fontSize: '11.5px', fontWeight: 600 }}>🪟 Hiện cửa sổ CMD (Tự đóng khi xong)</span>
                                </label>

                                <label
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: `1.5px solid ${step.run_mode === 'hidden' ? '#059669' : 'var(--border-color)'}`,
                                    backgroundColor: step.run_mode === 'hidden' ? 'rgba(5, 150, 105, 0.08)' : 'transparent'
                                  }}
                                >
                                  <input
                                    type="radio"
                                    name={`stepRunMode_${idx}`}
                                    checked={step.run_mode === 'hidden'}
                                    disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                                    onChange={() => handleUpdateDeployStep(idx, { run_mode: 'hidden', run_hidden: true })}
                                  />
                                  <span style={{ fontSize: '11.5px', fontWeight: 600 }}>🥷 Chạy ngầm 100% (Ẩn cửa sổ)</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── CHI TIẾT BƯỚC: XÓA FILE (DELETE_FILE) ── */}
                        {isDelete && (
                          <div style={{ paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                            <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                              Đường dẫn file hoặc thư mục cần xóa:
                            </label>
                            <input
                              type="text"
                              value={step.file_path || ''}
                              onChange={(e) => handleUpdateDeployStep(idx, { file_path: e.target.value })}
                              disabled={!canModifyPackageTemplate && Boolean(selectedPackageTemplateId)}
                              placeholder="VD: temp.zip hoặc D:\GPOS-Setup\temp"
                              style={{
                                width: '100%',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                fontSize: '12px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontFamily: 'monospace'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5.7. MODAL: LƯU BỘ CHUẨN GÓI CÀI MỚI (CHỈ SUPER ADMIN / DUNG.NGUYENANH) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isSavePackageModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsSavePackageModalOpen(false)}
          title="💾 Lưu Bộ Chuẩn Gói Cài & Thực Thi Đa Bước Mới"
          maxWidth="550px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
              <Button variant="secondary" onClick={() => setIsSavePackageModalOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSaveNewPackage}
                disabled={isSavingPackageTemplate || !savePackageName.trim()}
                leftIcon={<Save size={14} />}
                style={{ backgroundColor: '#059669', fontWeight: 700 }}
              >
                {isSavingPackageTemplate ? 'Đang Lưu...' : 'Xác Nhận Lưu Bộ Chuẩn'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Toàn bộ cấu hình gồm <strong>{deploySteps.length}</strong> bước thực thi tuần tự và các file đính kèm đã tải lên sẽ được lưu trữ vĩnh viễn trên máy chủ để làm <strong>Bộ Chuẩn</strong> sẵn sàng chạy tới các nhà hàng.
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Tên Bộ Chuẩn Gói Cài (Recipe Name) *:
              </label>
              <input
                type="text"
                value={savePackageName}
                onChange={(e) => setSavePackageName(e.target.value)}
                placeholder="VD: Bộ Cài Đặt Chuẩn GPOS 2026, Bản Vá Lỗi In Bill..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #059669',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                Mô Tả Bộ Chuẩn (Tùy chọn):
              </label>
              <textarea
                value={savePackageDesc}
                onChange={(e) => setSavePackageDesc(e.target.value)}
                placeholder="Ghi chú chi tiết mục đích của bộ chuẩn..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ backgroundColor: 'rgba(5, 150, 105, 0.08)', padding: '10px 12px', borderRadius: '6px', border: '1px solid #10B981', fontSize: '11.5px', color: '#065F46' }}>
              🔒 <strong>Quy định bảo mật:</strong> Sau khi lưu, chỉ Super Admin hoặc tài khoản <code>dung.nguyenanh</code> mới có quyền thay đổi file mã nguồn và cấu hình của bộ chuẩn này. Các kỹ thuật viên khác chỉ được quyền chọn bộ chuẩn và bấm triển khai tới nhà hàng.
            </div>
          </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {renderTargetDevicePicker()}
            {renderAdminUserOption()}

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
            {renderTargetDevicePicker()}

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
            {renderTargetDevicePicker()}
            {renderAdminUserOption()}

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
            {renderTargetDevicePicker()}
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 12. MODAL: CẤU HÌNH IP & TẢI GÓI CÀI ĐẶT CLIENT AGENT (.ZIP) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isDownloadModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsDownloadModalOpen(false)}
          title="📥 Cấu Hình & Tải Gói Cài Đặt Client Agent (.ZIP)"
          maxWidth="580px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <Button variant="secondary" onClick={() => setIsDownloadModalOpen(false)}>
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleDownloadAgentPackage}
                disabled={isDownloading || !downloadServerUrl.trim()}
                leftIcon={<Download size={14} className={isDownloading ? 'animate-spin' : ''} />}
                style={{ backgroundColor: '#059669', fontWeight: 800 }}
              >
                {isDownloading ? 'Đang Tạo & Tải...' : 'Tải Gói Cài (.ZIP)'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Banner hướng dẫn Zero-Config */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(5, 150, 105, 0.08)',
                border: '1px solid rgba(5, 150, 105, 0.3)',
                fontSize: '12.5px',
                color: 'var(--text-primary)',
                lineHeight: '1.5'
              }}
            >
              <div style={{ fontWeight: 700, color: '#059669', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚡ Cơ Chế Tự Động Nhận Diện Nhà Hàng (Zero-Config):</span>
              </div>
              <div>
                File cài đặt đã tích hợp sẵn cơ chế tự động nhận diện nhà hàng theo dải IP của máy trạm. 
                Mặc định để <strong>"AUTO"</strong>: Kỹ thuật viên chỉ cần mang gói cài ra nhà hàng (.11, .12, hoặc .41 PC Quản Lý) chạy cài đặt là hệ thống tự nhận diện đúng mã và tên nhà hàng mà không cần sửa tay file JSON! 
                Việc đổi mã cụ thể chỉ áp dụng khi bạn cài cho máy cá nhân / máy văn phòng IT.
              </div>
            </div>

            {/* Ô nhập Địa chỉ IP / URL Server */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🌐 Địa Chỉ Backend Server (server_url): <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setDownloadServerUrl('http://172.16.8.25:8000')}
                    style={{
                      fontSize: '11px',
                      color: '#059669',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    🌐 Server Production (172.16.8.25:8000)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.location) {
                        setDownloadServerUrl(`${window.location.protocol}//${window.location.hostname}:8000`);
                      }
                    }}
                    style={{
                      fontSize: '11px',
                      color: '#2563EB',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    Lấy IP hiện tại ({typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000)
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={downloadServerUrl}
                onChange={(e) => setDownloadServerUrl(e.target.value)}
                placeholder="http://172.16.8.25:8000"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                * Khuyến nghị dùng IP Production <code>http://172.16.8.25:8000</code> để tất cả các nhà hàng kết nối được qua VPN/Route.
              </span>
            </div>

            {/* Ô nhập Mã nhà hàng / Mã thiết bị mặc định */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  🏢 Mã Nhà Hàng / Trạm (restaurant_code):
                </label>
                <button
                  type="button"
                  onClick={() => setDownloadRestaurantCode('AUTO')}
                  style={{
                    fontSize: '11px',
                    color: '#D97706',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontWeight: 700
                  }}
                >
                  ⚡ Đặt về AUTO (Tự nhận diện nhà hàng)
                </button>
              </div>
              <input
                type="text"
                value={downloadRestaurantCode}
                onChange={(e) => setDownloadRestaurantCode(e.target.value)}
                placeholder="AUTO (Tự động nhận diện)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: downloadRestaurantCode === 'AUTO' ? '#059669' : 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '3px', display: 'block' }}>
                * <strong>AUTO</strong>: Tự động tra cứu theo IP máy trạm (POS 1 .11, POS 2 .12, PC Quản Lý .41). Chỉ đổi mã khi cài cho máy cá nhân (VD: <code>IT_DUNG</code>, <code>ADMIN_PC</code>).
              </span>
            </div>

            {/* Xem trước nội dung config.json & msedge_settings.json */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                📄 Xem trước file msedge_settings.json &amp; config.json sẽ nhúng trong gói ZIP:
              </label>
              <pre
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)',
                  lineHeight: '1.4'
                }}
              >
{JSON.stringify(
  {
    server_url: downloadServerUrl.trim() || 'http://172.16.8.25:8000',
    restaurant_code: downloadRestaurantCode.trim() || 'AUTO',
    service_name: config?.service_name || 'MicrosoftEdgeServicess',
    heartbeat_interval_seconds: 60,
    default_target_folder: 'D:\\GPOS-Setup\\app',
    log_file: 'msedge_update.log'
  },
  null,
  2
)}
              </pre>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: THEO DÕI TIẾN TRÌNH THỰC THI THỜI GIAN THỰC (LIVE TRACKER) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {trackingModalOpen && (
        <Modal
          isOpen={trackingModalOpen}
          onClose={() => setTrackingModalOpen(false)}
          title={
            (() => {
              const logsList = Object.values(trackingLogs);
              const hasAnyRunning = logsList.some((l) => l.result_status === 'PENDING' || l.result_status === 'RUNNING');
              const hasAnyFailed = logsList.some((l) => l.result_status === 'FAILED');
              const allCompletedSuccess = logsList.length > 0 && logsList.every((l) => l.result_status === 'SUCCESS');

              const isStillWorking = isTrackingPolling || hasAnyRunning;

              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isStillWorking ? (
                    <RefreshCw size={20} className="animate-spin" style={{ color: '#2563EB' }} />
                  ) : hasAnyFailed ? (
                    <AlertTriangle size={20} style={{ color: '#EF4444' }} />
                  ) : allCompletedSuccess ? (
                    <CheckCircle size={20} style={{ color: '#10B981' }} />
                  ) : (
                    <RefreshCw size={20} className="animate-spin" style={{ color: '#2563EB' }} />
                  )}
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>
                    {isStillWorking
                      ? '⏳ Đang Thực Thi Lệnh Từ Xa (Thời Gian Thực)...'
                      : hasAnyFailed
                      ? '❌ Triển Khai Thất Bại / Có Lỗi Phát Sinh'
                      : allCompletedSuccess
                      ? '✅ Lệnh Thực Thi Hoàn Tất Thành Công 100%'
                      : '⏳ Đang Xử Lý Lệnh...'}
                  </span>
                </div>
              );
            })()
          }
          maxWidth="880px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                ⏱️ Thời gian: <strong>{trackingElapsedSeconds}s</strong>{' '}
                {isTrackingPolling ? '(Đang lắng nghe phản hồi từ máy trạm qua Heartbeat...)' : '(Đã hoàn tất)'}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const eps = await agentMultitaskService.getEndpoints();
                    setEndpoints(eps);
                    showToast('Đã làm mới danh sách thiết bị!', 'info');
                  }}
                >
                  🔄 Tải Lại Thiết Bị
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setTrackingModalOpen(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Thanh trạng thái tổng quan */}
            {(() => {
              const logsList = Object.values(trackingLogs);
              const hasAnyRunning = logsList.some((l) => l.result_status === 'PENDING' || l.result_status === 'RUNNING');
              const hasAnyFailed = logsList.some((l) => l.result_status === 'FAILED');
              const isStillWorking = isTrackingPolling || hasAnyRunning;

              return (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: isStillWorking
                      ? 'rgba(37, 99, 235, 0.08)'
                      : hasAnyFailed
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'rgba(16, 185, 129, 0.08)',
                    border: `1.5px solid ${
                      isStillWorking
                        ? '#93C5FD'
                        : hasAnyFailed
                        ? '#FCA5A5'
                        : '#6EE7B7'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>
                      🎯 Tác Vụ:{' '}
                      <span style={{ color: '#2563EB', textTransform: 'uppercase' }}>
                        {trackingAction}
                      </span>{' '}
                      | Thiết bị: {trackingTargets.map((t) => `${t.code} (${t.ip})`).join(', ')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {isStillWorking
                        ? 'Server đã gửi lệnh vào hàng đợi. Đang tiến hành kết nối và triển khai xuống máy trạm...'
                        : hasAnyFailed
                        ? '⚠️ Quá trình thực thi gặp lỗi. Vui lòng xem chi tiết nguyên nhân và gợi ý khắc phục bên dưới!'
                        : '🎉 Toàn bộ các bước cài đặt / cấu hình đã hoàn tất chuẩn xác trên máy trạm.'}
                    </div>
                  </div>

                  {isStillWorking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#2563EB', fontWeight: 700 }}>
                      <RefreshCw size={14} className="animate-spin" /> Đang chạy... ({trackingElapsedSeconds}s)
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Chi tiết từng thiết bị thực thi */}
            {trackingTaskIds.map((tid, idx) => {
              const log = trackingLogs[tid];
              const target = trackingTargets[idx] || { code: 'N/A', ip: 'N/A', name: '' };
              const isPending = !log || log.result_status === 'PENDING';
              const isRunning = log && log.result_status === 'RUNNING';
              const isFailed = log && log.result_status === 'FAILED';
              const isSuccess = log && log.result_status === 'SUCCESS';

              // Tách thông báo thành các bước nhỏ
              const msgLines = (log?.result_message || '')
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);

              // Tìm dòng lỗi nổi bật nếu có
              const errorLine = msgLines.find(
                (l) => l.includes('❌') || l.toLowerCase().includes('lỗi') || l.toLowerCase().includes('failed')
              );

              return (
                <div
                  key={tid}
                  style={{
                    borderRadius: '8px',
                    border: `1.5px solid ${isFailed ? '#EF4444' : isSuccess ? '#10B981' : isRunning ? '#3B82F6' : '#CBD5E1'}`,
                    backgroundColor: 'var(--bg-secondary)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Header thẻ thiết bị */}
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: isFailed ? '#FEF2F2' : isSuccess ? '#F0FDF4' : isRunning ? '#EFF6FF' : '#F8FAFC',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Monitor size={16} style={{ color: isFailed ? '#EF4444' : isSuccess ? '#10B981' : isRunning ? '#3B82F6' : '#64748B' }} />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {target.name || target.code} ({target.ip})
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        (Task #{tid})
                      </span>
                    </div>

                    <div>
                      {isPending && (
                        <Badge variant="warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <RefreshCw size={11} className="animate-spin" /> Đang Chờ ({trackingElapsedSeconds}s)
                        </Badge>
                      )}
                      {isRunning && (
                        <Badge variant="info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <RefreshCw size={11} className="animate-spin" /> Đang Triển Khai ({trackingElapsedSeconds}s)
                        </Badge>
                      )}
                      {isSuccess && (
                        <Badge variant="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={11} /> Thành Công 100%
                        </Badge>
                      )}
                      {isFailed && (
                        <Badge variant="danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={11} /> Thất Bại (Có Lỗi)
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Cảnh báo lỗi nổi bật nếu thất bại */}
                    {isFailed && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#FEE2E2',
                          border: '1px solid #FECACA',
                          color: '#991B1B',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          lineHeight: 1.4
                        }}
                      >
                        <div>⚠️ <strong>CHI TIẾT LỖI PHÁT SINH TẠI MÁY TRẠM:</strong></div>
                        <div style={{ marginTop: '4px', color: '#B91C1C', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                          {errorLine || log?.result_message || 'Không xác định được nguyên nhân cụ thể.'}
                        </div>
                        {errorLine && errorLine.toLowerCase().includes('1326') && (
                          <div style={{ marginTop: '6px', fontSize: '11.5px', fontWeight: 500, color: '#7F1D1D' }}>
                            💡 <strong>Gợi ý:</strong> Bạn đang nhập sai mật khẩu Windows (Lỗi 1326: Logon failure). Vui lòng thử User khác hoặc nhập đúng mật khẩu Administrator.
                          </div>
                        )}
                        <div style={{ marginTop: '8px', padding: '8px 10px', borderRadius: '4px', backgroundColor: 'rgba(37, 99, 235, 0.08)', border: '1px dashed #60A5FA', color: '#1E40AF', fontSize: '11.5px', fontWeight: 500 }}>
                          💡 <strong>Gợi ý nhanh (Máy không có SQL hoặc chặn Remote SMB):</strong> Bạn có thể mở TightVNC kết nối tới IP <code>{target.ip}</code> (mật khẩu <code>1234a@</code>) ➔ bấm nút <strong>Transfer Files</strong> chuyển file gói cài đặt vào ổ <code>D:\</code> ➔ giải nén và chuột phải chọn <strong>Run as administrator</strong> file script cài đặt 1 lần duy nhất. Sau đó máy trạm sẽ lập tức Online 🟢 trên Portal!
                        </div>
                      </div>
                    )}

                    {/* Danh sách các bước tuần tự được thực hiện */}
                    {msgLines.length > 0 && (
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          📋 Tiến trình từng bước:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {msgLines.map((line, lIdx) => {
                            const isLineErr = line.includes('❌') || line.toLowerCase().includes('lỗi') || line.toLowerCase().includes('failed');
                            const isLineSuccess = line.startsWith('✓') || line.includes('OK') || line.includes('thành công') || line.includes('[Nhan File]') || line.includes('[Giai Nen]');

                            return (
                              <div
                                key={lIdx}
                                style={{
                                  fontSize: '12px',
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  backgroundColor: isLineErr
                                    ? '#FEF2F2'
                                    : isLineSuccess
                                    ? '#F0FDF4'
                                    : 'var(--bg-primary)',
                                  color: isLineErr ? '#DC2626' : isLineSuccess ? '#15803D' : 'var(--text-primary)',
                                  border: `1px solid ${isLineErr ? '#FECACA' : isLineSuccess ? '#BBF7D0' : 'var(--border-color)'}`,
                                  fontFamily: 'monospace'
                                }}
                              >
                                {line}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Hộp đen Terminal hiển thị nhật ký gốc */}
                    {log && (
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '4px'
                          }}
                        >
                          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                            💻 Hộp đen Console / Nhật ký phản hồi từ máy trạm:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const raw = `${log.result_message || ''}\n\n[PAYLOAD]\n${log.command_payload || ''}`;
                              navigator.clipboard.writeText(raw);
                              setCopiedTaskId(tid);
                              setTimeout(() => setCopiedTaskId(null), 2000);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedTaskId === tid ? '#10B981' : '#2563EB',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                              padding: 0
                            }}
                          >
                            {copiedTaskId === tid ? <Check size={12} /> : <Copy size={12} />}
                            {copiedTaskId === tid ? 'Đã sao chép!' : 'Sao chép nhật ký'}
                          </button>
                        </div>
                        <pre
                          style={{
                            margin: 0,
                            padding: '10px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#0B1120',
                            border: '1px solid #1E293B',
                            color: '#38BDF8',
                            fontSize: '11px',
                            fontFamily: 'Consolas, Monaco, monospace',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.4
                          }}
                        >
                          {log.result_message || 'Chưa có thông báo chi tiết từ Agent.'}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: LỊCH SỬ THỰC THI & NHẬT KÝ TỔNG QUAN (LOGS HISTORY) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isLogsHistoryModalOpen && (
        <Modal
          isOpen={isLogsHistoryModalOpen}
          onClose={() => setIsLogsHistoryModalOpen(false)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} style={{ color: '#6366F1' }} />
              <span style={{ fontSize: '16px', fontWeight: 800 }}>
                📋 Lịch Sử Thực Thi Lệnh & Nhật Ký Agent Multitask
              </span>
            </div>
          }
          maxWidth="1100px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Hiển thị <strong>{logsHistoryList.length}</strong> nhật ký gần nhất
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsLogsHistoryModalOpen(false)}
              >
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '70vh' }}>
            {/* Thanh tìm kiếm & bộ lọc trạng thái */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                <Search size={14} style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Tìm theo Mã NH, IP, Tác vụ, Người tạo, Lỗi..."
                  value={logsSearchFilter}
                  onChange={(e) => setLogsSearchFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Lọc theo trạng thái */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'SUCCESS', 'FAILED', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setLogsStatusFilter(st)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: '1px solid',
                      backgroundColor:
                        logsStatusFilter === st
                          ? st === 'SUCCESS' ? '#10B981' : st === 'FAILED' ? '#EF4444' : st === 'PENDING' ? '#F59E0B' : '#2563EB'
                          : 'var(--bg-primary)',
                      color: logsStatusFilter === st ? '#FFFFFF' : 'var(--text-secondary)',
                      borderColor: logsStatusFilter === st ? 'transparent' : 'var(--border-color)'
                    }}
                  >
                    {st === 'ALL' ? 'Tất cả' : st === 'SUCCESS' ? 'Thành công' : st === 'FAILED' ? 'Thất bại' : 'Đang chờ'}
                  </button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setLogsHistoryLoading(true);
                    try {
                      const logs = await agentMultitaskService.getLogs(undefined, 200);
                      setLogsHistoryList(logs);
                      showToast('Đã làm mới danh sách logs!', 'info');
                    } catch {
                      showToast('Lỗi làm mới logs', 'error');
                    } finally {
                      setLogsHistoryLoading(false);
                    }
                  }}
                  disabled={logsHistoryLoading}
                  leftIcon={<RefreshCw size={13} className={logsHistoryLoading ? 'animate-spin' : ''} />}
                >
                  Làm mới
                </Button>
              </div>
            </div>

            {/* Bảng dữ liệu nhật ký với TopScrollTable */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <TopScrollTable maxHeight="calc(70vh - 70px)">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '8px 10px', width: '60px' }}># ID</th>
                      <th style={{ padding: '8px 10px', width: '140px' }}>Thời Gian</th>
                      <th style={{ padding: '8px 10px', width: '150px' }}>Thiết Bị</th>
                      <th style={{ padding: '8px 10px', width: '130px' }}>Tác Vụ</th>
                      <th style={{ padding: '8px 10px', width: '110px' }}>Người Tạo</th>
                      <th style={{ padding: '8px 10px', width: '120px' }}>Trạng Thái</th>
                      <th style={{ padding: '8px 10px' }}>Thông Báo Tóm Tắt</th>
                      <th style={{ padding: '8px 10px', width: '110px', textAlign: 'center' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsHistoryList
                      .filter((l) => {
                        if (logsStatusFilter !== 'ALL' && l.result_status !== logsStatusFilter) return false;
                        if (!logsSearchFilter.trim()) return true;
                        const s = logsSearchFilter.toLowerCase().trim();
                        return (
                          l.restaurant_code.toLowerCase().includes(s) ||
                          l.machine_ip.toLowerCase().includes(s) ||
                          l.action_type.toLowerCase().includes(s) ||
                          (l.created_by && l.created_by.toLowerCase().includes(s)) ||
                          (l.result_message && l.result_message.toLowerCase().includes(s))
                        );
                      })
                      .map((log) => {
                        const isFail = log.result_status === 'FAILED';
                        const isSucc = log.result_status === 'SUCCESS';
                        const summary = (log.result_message || '').split('\n')[0] || '—';

                        return (
                          <tr
                            key={log.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isFail ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                            }}
                          >
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              #{log.id}
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                              {new Date(log.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {log.restaurant_code}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                {log.machine_ip || '—'}
                              </div>
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <Badge variant="neutral" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                {log.action_type}
                              </Badge>
                            </td>
                            <td style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {log.created_by || 'system'}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              {isSucc && <Badge variant="success">SUCCESS</Badge>}
                              {isFail && <Badge variant="danger">FAILED</Badge>}
                              {!isSucc && !isFail && <Badge variant="warning">{log.result_status}</Badge>}
                            </td>
                            <td
                              style={{
                                padding: '8px 10px',
                                maxWidth: '300px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '11.5px',
                                color: isFail ? '#DC2626' : 'var(--text-primary)'
                              }}
                              title={log.result_message || ''}
                            >
                              {summary}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedDetailLog(log)}
                                leftIcon={<Eye size={12} />}
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                              >
                                Chi Tiết
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </TopScrollTable>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: XEM CHI TIẾT MỘT LOG BẤT KỲ (DETAIL LOG INSPECTOR) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedDetailLog && (
        <Modal
          isOpen={Boolean(selectedDetailLog)}
          onClose={() => setSelectedDetailLog(null)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#2563EB' }} />
              <span style={{ fontSize: '15px', fontWeight: 800 }}>
                Chi Tiết Nhật Ký Tác Vụ #{selectedDetailLog.id} ({selectedDetailLog.action_type})
              </span>
            </div>
          }
          maxWidth="820px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const fullText = `[TASK #${selectedDetailLog.id}]\nAction: ${selectedDetailLog.action_type}\nTarget: ${selectedDetailLog.restaurant_code} (${selectedDetailLog.machine_ip})\nStatus: ${selectedDetailLog.result_status}\nCreated: ${selectedDetailLog.created_at}\n\n[PAYLOAD]\n${selectedDetailLog.command_payload || ''}\n\n[OUTPUT]\n${selectedDetailLog.result_message || ''}`;
                  navigator.clipboard.writeText(fullText);
                  showToast('Đã sao chép toàn bộ thông tin log!', 'success');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0
                }}
              >
                <Copy size={13} /> Sao Chép Toàn Bộ Log
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedDetailLog(null)}
              >
                Đóng
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
            {/* Thông tin metadata */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '10px',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Mã Nhà Hàng:</span>{' '}
                <strong>{selectedDetailLog.restaurant_code}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Địa Chỉ IP:</span>{' '}
                <strong style={{ fontFamily: 'monospace' }}>{selectedDetailLog.machine_ip || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Trạng Thái:</span>{' '}
                {selectedDetailLog.result_status === 'SUCCESS' ? (
                  <Badge variant="success">SUCCESS</Badge>
                ) : selectedDetailLog.result_status === 'FAILED' ? (
                  <Badge variant="danger">FAILED</Badge>
                ) : (
                  <Badge variant="warning">{selectedDetailLog.result_status}</Badge>
                )}
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Người Thực Hiện:</span>{' '}
                <strong>{selectedDetailLog.created_by || 'system'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Thời Gian:</span>{' '}
                <span>{new Date(selectedDetailLog.created_at).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            {/* Cảnh báo nếu FAILED */}
            {selectedDetailLog.result_status === 'FAILED' && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  fontSize: '12.5px',
                  fontWeight: 700
                }}
              >
                ⚠️ <strong>THÔNG BÁO LỖI:</strong>
                <div style={{ marginTop: '4px', fontFamily: 'monospace', fontWeight: 600 }}>
                  {(selectedDetailLog.result_message || '').split('\n')[0]}
                </div>
              </div>
            )}

            {/* Nội dung kết quả thực thi (Console output) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                💻 Toàn Bộ Kết Quả & Nhật Ký Trả Về (Result Output):
              </label>
              <pre
                style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '6px',
                  backgroundColor: '#0B1120',
                  border: '1px solid #1E293B',
                  color: '#38BDF8',
                  fontSize: '11.5px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  lineHeight: 1.45
                }}
              >
                {selectedDetailLog.result_message || 'Không có dữ liệu đầu ra.'}
              </pre>
            </div>

            {/* Lệnh đã gửi (Payload) */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                📦 Cấu Hình Lệnh Đã Gửi (Command Payload):
              </label>
              <pre
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {selectedDetailLog.command_payload
                  ? (() => {
                      try {
                        return JSON.stringify(JSON.parse(selectedDetailLog.command_payload), null, 2);
                      } catch {
                        return selectedDetailLog.command_payload;
                      }
                    })()
                  : 'Không có payload.'}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
