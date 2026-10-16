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
  Trash2,
  Terminal,
  BookmarkPlus,
  Save,
  Package,
  Layers,
  FileCode
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
  AgentCommandResponse,
  AgentScriptTemplateItem,
  DeployStepItem
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
  const [deployTargetFolder, setDeployTargetFolder] = useState<string>('C:\\ABC');
  const [deployFileName, setDeployFileName] = useState<string>('Restaurant_Support_Agent_Full.zip');
  const [deployPackageSource, setDeployPackageSource] = useState<'SERVER_BUILTIN' | 'UPLOAD' | 'CLIENT_EXISTING'>('SERVER_BUILTIN');
  const [deployAutoExtract, setDeployAutoExtract] = useState<boolean>(true);
  const [deployUploadedBase64, setDeployUploadedBase64] = useState<string>('');
  const [deployUploadedFileName, setDeployUploadedFileName] = useState<string>('');
  const [deploySteps, setDeploySteps] = useState<DeployStepItem[]>([
    {
      step_number: 1,
      step_name: 'Sửa config.json (server_url & restaurant_code)',
      step_type: 'MODIFY_FILE',
      file_path: 'config.json',
      modify_mode: 'JSON_KEY_VALUE',
      json_modifications: {
        server_url: 'http://172.16.20.47:8000',
        restaurant_code: '4454'
      }
    },
    {
      step_number: 2,
      step_name: 'Cài đặt và khởi chạy Windows Service',
      step_type: 'RUN_SCRIPT',
      file_path: 'Cai_Dat_Dich_Vu_Windows.bat',
      arguments: '',
      run_as_admin: true,
      wait_for_completion: true
    }
  ]);
  const [newJsonKey, setNewJsonKey] = useState<string>('');
  const [newJsonVal, setNewJsonVal] = useState<string>('');
  const [activeJsonStepIndex, setActiveJsonStepIndex] = useState<number | null>(null);

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
        // Tải mẫu kịch bản
        loadScriptTemplates();
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

  // Áp dụng mẫu chuẩn triển khai mới cho Feature 2
  const handleApplyStandardDeployPreset = () => {
    setDeployTargetFolder('C:\\ABC');
    setDeployFileName('Restaurant_Support_Agent_Full.zip');
    setDeployPackageSource('SERVER_BUILTIN');
    setDeployAutoExtract(true);
    const targetCode = selectedEndpoints.length > 0 ? selectedEndpoints[0].restaurant_code : '4454';
    setDeploySteps([
      {
        step_number: 1,
        step_name: 'Sửa config.json (server_url & restaurant_code)',
        step_type: 'MODIFY_FILE',
        file_path: 'config.json',
        modify_mode: 'JSON_KEY_VALUE',
        json_modifications: {
          server_url: 'http://172.16.20.47:8000',
          restaurant_code: targetCode
        }
      },
      {
        step_number: 2,
        step_name: 'Cài đặt và khởi chạy Windows Service',
        step_type: 'RUN_SCRIPT',
        file_path: 'Cai_Dat_Dich_Vu_Windows.bat',
        arguments: '',
        run_as_admin: true,
        wait_for_completion: true
      }
    ]);
    showToast(`Đã nạp mẫu chuẩn triển khai Agent (Mã NH: ${targetCode})!`, 'success');
  };

  // Thêm một bước thực thi mới (Bước 3, 4...)
  const handleAddDeployStep = (type: 'MODIFY_FILE' | 'RUN_SCRIPT' | 'DELETE_FILE') => {
    const nextNum = deploySteps.length + 1;
    let newStep: DeployStepItem;
    if (type === 'MODIFY_FILE') {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Chỉnh sửa file`,
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
        step_name: `Bước ${nextNum}: Chạy file script`,
        step_type: 'RUN_SCRIPT',
        file_path: 'Kiem_Tra_Trang_Thai.bat',
        arguments: '',
        run_as_admin: true,
        wait_for_completion: true
      };
    } else {
      newStep = {
        step_number: nextNum,
        step_name: `Bước ${nextNum}: Dọn dẹp file tạm`,
        step_type: 'DELETE_FILE',
        file_path: 'Restaurant_Support_Agent_Full.zip'
      };
    }
    setDeploySteps([...deploySteps, newStep]);
  };

  // Xóa một bước thực thi
  const handleRemoveDeployStep = (index: number) => {
    const updated = deploySteps.filter((_, idx) => idx !== index).map((s, idx) => ({
      ...s,
      step_number: idx + 1
    }));
    setDeploySteps(updated);
  };

  // Cập nhật trường của một bước
  const handleUpdateDeployStep = (index: number, fields: Partial<DeployStepItem>) => {
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

  // Xử lý tải file ZIP lên từ máy tính
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast('Dung lượng file vượt quá 50MB, vui lòng chọn file nhỏ hơn!', 'error');
      return;
    }
    setDeployUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || '';
      setDeployUploadedBase64(base64Data);
      showToast(`Đã nạp file '${file.name}' (${(file.size / 1024 / 1024).toFixed(2)} MB)!`, 'success');
    };
    reader.readAsDataURL(file);
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

    setIsExecutingCommand(true);
    try {
      const targetCodes = Array.from(new Set(targets.map((t) => t.restaurant_code)));
      const targetIps = targets.map((t) => t.ip_lan).filter(Boolean);
      const res = await agentMultitaskService.sendCommand({
        action,
        restaurant_codes: targetCodes,
        target_ip: singleEndpoint ? singleEndpoint.ip_lan : (targetIps.length === 1 ? targetIps[0] : undefined),
        target_ips: targetIps,
        service_name: config?.service_name || 'MicrosoftEdgeServicess',
        target_folder: action === 'deploy_package' ? deployTargetFolder : targetFolder,
        file_name: action === 'run_relative_script' ? scriptFileName : (action === 'deploy_package' ? (deployPackageSource === 'UPLOAD' ? deployUploadedFileName : deployFileName) : fileName),
        file_content_base64: action === 'deploy_package' ? (deployPackageSource === 'UPLOAD' ? deployUploadedBase64 : undefined) : fileContentDesc,
        process_path: processPath,
        arguments: action === 'run_relative_script' ? scriptArgs : processArgs,
        run_as_admin: runAsAdmin,
        folder_hint: action === 'run_relative_script' ? scriptFolderHint : undefined,
        run_mode: action === 'run_relative_script' ? scriptRunMode : 'interactive',
        run_hidden: action === 'run_relative_script' ? scriptRunMode === 'hidden' : false,
        auto_extract: action === 'deploy_package' ? deployAutoExtract : undefined,
        steps: action === 'deploy_package' ? deploySteps : undefined
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
  // HELPER: BỘ CHỌN THIẾT BỊ ĐÍCH TRONG CÁC MODAL HÀNH ĐỘNG
  // ══════════════════════════════════════════════════════════════════════════
  const renderTargetDevicePicker = () => (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: selectedEndpoints.length === 0 ? '#FEF2F2' : 'var(--bg-secondary)',
        border: `1px solid ${selectedEndpoints.length === 0 ? '#FECACA' : 'var(--border-color)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
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
        <div>
          🎯 Thiết Bị Thực Thi:{' '}
          {selectedEndpoints.length > 0 ? (
            <strong style={{ color: '#059669' }}>
              {selectedEndpoints.length} máy đã chọn: {selectedEndpoints.map((e) => e.machine_name || e.ip_lan).join(', ')}
            </strong>
          ) : (
            <strong style={{ color: '#DC2626' }}>
              ⚠️ Chưa chọn máy nào (chọn máy bên dưới để tiếp tục)
            </strong>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {filteredEndpoints.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allIds = filteredEndpoints.map((e) => e.id).filter(Boolean) as number[];
                setSelectedEndpointIds(allIds);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              Chọn tất cả ({filteredEndpoints.length} máy)
            </button>
          )}
          {selectedEndpoints.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedEndpointIds([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0
              }}
            >
              Bỏ chọn
            </button>
          )}
        </div>
      </div>

      {selectedEndpoints.length === 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            style={{
              width: '100%',
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              backgroundColor: '#FFFFFF',
              fontSize: '13px',
              color: '#1E293B',
              fontWeight: 600
            }}
            value=""
            onChange={(e) => {
              const id = Number(e.target.value);
              if (id) {
                setSelectedEndpointIds([id]);
              }
            }}
          >
            <option value="">👉 Nhấp vào đây để chọn máy đích muốn thực thi...</option>
            {endpoints.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.restaurant_name ? `${ep.restaurant_name} (${ep.restaurant_code})` : ep.machine_name || 'Thiết bị'} - {ep.machine_name || ep.ip_lan} ({ep.ip_lan}) - {ep.is_online ? '🟢 Online' : '⚪ Offline'}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

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

          {/* NÚT TRUYỀN GÓI & THỰC THI ĐA BƯỚC (FEATURE 2 TRỌNG TÂM) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenActionModal('DEPLOY_PACKAGE')}
            leftIcon={<Package size={14} style={{ color: '#D97706' }} />}
            style={{ fontWeight: 800, borderColor: '#D97706', color: '#D97706', backgroundColor: '#FFFBEB' }}
          >
            📦 Truyền Gói & Chạy Kịch Bản
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

                          {/* Nút Khởi Chạy Script / Batch Nhanh 1 Chạm */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (ep.id) setSelectedEndpointIds([ep.id]);
                              setActiveActionModal('RELATIVE_SCRIPT');
                            }}
                            title="Khởi chạy file script/batch (.bat, .cmd, .exe) từ xa trên máy này"
                            style={{ padding: '4px 7px', color: '#059669', borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }}
                          >
                            <Terminal size={12} />
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

            {/* Lưới 7 thẻ hành động (Grid 2 cột) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '12px'
              }}
            >
              {/* Thẻ 1: Khởi Chạy File Script / Batch Từ Xa (Tự Tìm Folder / File) */}
              <div
                onClick={() => handleOpenActionModal('RELATIVE_SCRIPT')}
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
                    backgroundColor: '#059669',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Terminal size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065F46' }}>
                    1. Khởi Chạy File & Script Từ Xa
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px', lineHeight: 1.4 }}>
                    Tự động tìm kiếm thông minh thư mục & file (.bat, .exe...) trên mọi ổ đĩa (C, D...) để khởi chạy từ xa.
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Truyền Gói Cài & Thực Thi Đa Bước (Feature 2 Trọng Tâm) */}
              <div
                onClick={() => handleOpenActionModal('DEPLOY_PACKAGE')}
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
                  <Package size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#92400E' }}>
                    2. Truyền Gói Cài & Thực Thi Đa Bước
                  </div>
                  <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', lineHeight: 1.4 }}>
                    Truyền folder/file zip xuống ổ C hoặc D, tự giải nén, sửa file config và chạy script tuần tự theo yêu cầu.
                  </div>
                </div>
              </div>

              {/* Thẻ 3: Điều Khiển Service Từ Xa */}
              <div
                onClick={() => handleOpenActionModal('SERVICE')}
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
                    3. Điều Khiển Service Máy Trạm
                  </div>
                  <div style={{ fontSize: '12px', color: '#1D4ED8', marginTop: '4px', lineHeight: 1.4 }}>
                    Bật, tắt, khởi động lại service MicrosoftEdgeServicess từ xa hàng loạt hoặc đơn lẻ.
                  </div>
                </div>
              </div>

              {/* Thẻ 4: Truyền File & Thư Mục Từ Xa */}
              <div
                onClick={() => handleOpenActionModal('PUSH_FILE')}
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
                    4. Truyền File & Cập Nhật Thư Mục
                  </div>
                  <div style={{ fontSize: '12px', color: '#B45309', marginTop: '4px', lineHeight: 1.4 }}>
                    Đẩy file cài đặt, bản vá cập nhật hoặc config xuống trực tiếp thư mục (D:\GPOS-Setup...).
                  </div>
                </div>
              </div>

              {/* Thẻ 5: Mở / Tắt Tiến Trình & File Exe */}
              <div
                onClick={() => handleOpenActionModal('PROCESS')}
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
                    5. Mở / Tắt Tiến Trình & File Exe
                  </div>
                  <div style={{ fontSize: '12px', color: '#0284C7', marginTop: '4px', lineHeight: 1.4 }}>
                    Kích hoạt file thực thi hoặc cưỡng chế tắt (kill) tiến trình bị đơ/treo với quyền Admin UAC.
                  </div>
                </div>
              </div>

              {/* Thẻ 6: Cài Đặt Theo Kịch Bản 5 Bước */}
              <div
                onClick={() => handleOpenActionModal('INSTALL')}
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
                    6. Cài Đặt Tuần Tự Theo Kịch Bản
                  </div>
                  <div style={{ fontSize: '12px', color: '#6D28D9', marginTop: '4px', lineHeight: 1.4 }}>
                    Quy trình tự động hóa 5 bước tải package, giải nén, đăng ký Windows Service & Watchdog.
                  </div>
                </div>
              </div>

              {/* Thẻ 7: Kiểm Tra Độ Phủ & Máy Offline */}
              <div
                onClick={() => {
                  setIsFeaturesModalOpen(false);
                  setFilterStatus('OFFLINE');
                  showToast('Đang lọc danh sách các máy đang Offline / Chưa kết nối!', 'info');
                }}
                style={{
                  border: '1.5px solid #CFFAFE',
                  backgroundColor: '#ECFEFF',
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
                    backgroundColor: '#0891B2',
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
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#155E75' }}>
                    7. Kiểm Tra Độ Phủ & Cài Đặt
                  </div>
                  <div style={{ fontSize: '12px', color: '#0E7490', marginTop: '4px', lineHeight: 1.4 }}>
                    Lọc nhanh danh sách nhà hàng & máy trạm chưa cài đặt, đang offline hoặc đã sẵn sàng.
                  </div>
                </div>
              </div>

              {/* Thẻ 8: Cấu Hình Admin & Phân Quyền */}
              <div
                onClick={() => handleOpenActionModal('CONFIG')}
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
                    7. Cấu Hình Admin & Phân Quyền
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
                disabled={selectedEndpoints.length === 0 || isExecutingCommand || !scriptFileName.trim()}
                leftIcon={<Play size={14} className={isExecutingCommand ? 'animate-spin' : ''} />}
                style={{ backgroundColor: '#059669', fontWeight: 800 }}
              >
                {isExecutingCommand ? 'Đang Khởi Chạy...' : '🚀 Bắt Đầu Khởi Chạy'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Box hướng dẫn thông minh */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '12.5px',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '3px' }}>
                💡 Cơ Chế Tìm Kiếm Tương Đối & Chạy Tự Động:
              </div>
              <div>
                Hệ thống sẽ tự động quét thông minh trên <strong>tất cả các ổ đĩa (C:, D:, E:...)</strong> của máy trạm nhà hàng để tìm chính xác thư mục và tên file được chỉ định, sau đó tự động thiết lập thư mục làm việc (Working Directory / CWD) và khởi chạy file với quyền Administrator ngầm.
              </div>
            </div>

            {/* Bộ chọn máy đích */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {renderTargetDevicePicker()}
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

              {/* Danh sách các card mẫu */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #059669' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(5, 150, 105, 0.08)' : 'var(--bg-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontWeight: 700, fontSize: '12.5px', color: isSelected ? '#059669' : 'var(--text-primary)' }}>
                          ⚡ {tmpl.template_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        📂 {tmpl.folder_hint} \ {tmpl.file_name}
                      </div>

                      {tmpl.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tmpl.description}
                        </div>
                      )}
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

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Tham Số Dòng Lệnh (Arguments - Tùy chọn):
              </label>
              <input
                type="text"
                value={scriptArgs}
                onChange={(e) => setScriptArgs(e.target.value)}
                placeholder="VD: /silent hoặc /auto hoặc để trống"
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

            {/* Checkbox tùy chọn & Chế độ chạy */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={runAsAdmin}
                  onChange={(e) => setRunAsAdmin(e.target.checked)}
                />
                <span>Chạy với quyền Administrator (UAC)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'default', color: '#059669', fontWeight: 600 }}>
                <CheckCircle size={14} />
                <span>Tự động đặt CWD về thư mục chứa file</span>
              </label>
            </div>

            {/* Chế độ chạy: Hiện cửa sổ (Tự tắt) hoặc Chạy ngầm 100% */}
            <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>⚡ Chế Độ Khởi Chạy:</span>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  File văn bản (.txt, .docx...) tự mở bằng phần mềm tương ứng không để lại CMD
                </span>
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
      {/* 5.6. MODAL: TRUYỀN GÓI CÀI & THỰC THI ĐA BƯỚC (FEATURE 2) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeActionModal === 'DEPLOY_PACKAGE' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveActionModal(null)}
          title="📦 Truyền Gói Cài / File Nén & Thực Thi Đa Bước (Tự Giải Nén, Sửa Config, Chạy Script)"
          maxWidth="840px"
          footer={
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Đã cấu hình: <strong style={{ color: 'var(--color-primary)' }}>{deploySteps.length}</strong> bước tuần tự
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={() => setActiveActionModal(null)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleSendCommand('deploy_package')}
                  disabled={selectedEndpoints.length === 0 || isExecutingCommand || !deployTargetFolder.trim() || deploySteps.length === 0}
                  leftIcon={<Play size={14} className={isExecutingCommand ? 'animate-spin' : ''} />}
                  style={{ backgroundColor: '#D97706', fontWeight: 800 }}
                >
                  {isExecutingCommand ? 'Đang Triển Khai...' : '🚀 Bắt Đầu Triển Khai & Thực Thi'}
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Box hướng dẫn & Nút nạp mẫu chuẩn */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                color: '#92400E',
                fontSize: '12.5px',
                lineHeight: 1.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ fontWeight: 700, marginBottom: '3px' }}>
                  💡 Quy Trình Tự Động Hóa Đa Bước (Sequential Pipeline):
                </div>
                <div>
                  Hệ thống truyền file/folder nén (.zip) xuống máy trạm tại <strong>ổ C hoặc D</strong>, tự động giải nén, sau đó tuần tự thực thi từng bước: <strong>Bước 1</strong> mở file sửa config theo yêu cầu &rarr; <strong>Bước 2</strong> chạy file script batch &rarr; <strong>Bước 3..N</strong> có thể tự thêm không giới hạn.
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyStandardDeployPreset}
                leftIcon={<Sparkles size={13} />}
                style={{
                  backgroundColor: '#D97706',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  whiteSpace: 'nowrap'
                }}
              >
                ⚡ Nạp Mẫu Chuẩn (Test VMware)
              </Button>
            </div>

            {/* Bộ chọn máy đích */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {renderTargetDevicePicker()}
            </div>

            {/* Khối 1: Cấu hình Gói Cài & Thư Mục Đích */}
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
                <span>1. Cấu Hình Gói File & Thư Mục Đích (Ổ C hoặc D)</span>
              </div>

              {/* Lựa chọn nguồn gói */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div
                  onClick={() => {
                    setDeployPackageSource('SERVER_BUILTIN');
                    setDeployFileName('Restaurant_Support_Agent_Full.zip');
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: deployPackageSource === 'SERVER_BUILTIN' ? '2px solid #D97706' : '1px solid var(--border-color)',
                    backgroundColor: deployPackageSource === 'SERVER_BUILTIN' ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: deployPackageSource === 'SERVER_BUILTIN' ? '#D97706' : 'var(--text-primary)' }}>
                    🟢 Gói Chuẩn Server
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Restaurant_Support_Agent_Full.zip (10.3 MB)
                  </div>
                </div>

                <div
                  onClick={() => setDeployPackageSource('UPLOAD')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: deployPackageSource === 'UPLOAD' ? '2px solid #D97706' : '1px solid var(--border-color)',
                    backgroundColor: deployPackageSource === 'UPLOAD' ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: deployPackageSource === 'UPLOAD' ? '#D97706' : 'var(--text-primary)' }}>
                    📁 Tải File Lên (Upload)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Chọn file .zip, .rar từ máy tính của bạn
                  </div>
                </div>

                <div
                  onClick={() => setDeployPackageSource('CLIENT_EXISTING')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: deployPackageSource === 'CLIENT_EXISTING' ? '2px solid #D97706' : '1px solid var(--border-color)',
                    backgroundColor: deployPackageSource === 'CLIENT_EXISTING' ? 'rgba(217, 119, 6, 0.08)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 700, color: deployPackageSource === 'CLIENT_EXISTING' ? '#D97706' : 'var(--text-primary)' }}>
                    🖥️ Đã Có Trên Máy Trạm
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Sử dụng file có sẵn trong ổ C / D
                  </div>
                </div>
              </div>

              {/* Nếu chọn Upload file từ máy */}
              {deployPackageSource === 'UPLOAD' && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '8px 12px', borderRadius: '6px', border: '1px dashed #D97706' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Chọn file nén hoặc file gói từ máy tính *:
                  </label>
                  <input
                    type="file"
                    accept=".zip,.rar,.tar,.gz,.bin"
                    onChange={handleFileUpload}
                    style={{ fontSize: '12px' }}
                  />
                  {deployUploadedFileName && (
                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, display: 'block', marginTop: '3px' }}>
                      ✓ Đã chọn: {deployUploadedFileName}
                    </span>
                  )}
                </div>
              )}

              {/* Đường dẫn thư mục đích trên máy trạm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Thư Mục Đích Tại Máy Trạm (Ổ C hoặc D) *:
                  </label>
                  <input
                    type="text"
                    value={deployTargetFolder}
                    onChange={(e) => setDeployTargetFolder(e.target.value)}
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
                    {['C:\\ABC', 'D:\\ABC', 'D:\\GPOS-Setup', 'C:\\Setup'].map((path) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => setDeployTargetFolder(path)}
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: deployTargetFolder === path ? '#FEF3C7' : 'var(--bg-primary)',
                          color: deployTargetFolder === path ? '#92400E' : 'var(--text-secondary)',
                          cursor: 'pointer',
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
                    Tên File Gói Cài Đặt *:
                  </label>
                  <input
                    type="text"
                    value={deployPackageSource === 'UPLOAD' ? deployUploadedFileName : deployFileName}
                    onChange={(e) => setDeployFileName(e.target.value)}
                    disabled={deployPackageSource === 'UPLOAD'}
                    placeholder="VD: Restaurant_Support_Agent_Full.zip"
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
                      onChange={(e) => setDeployAutoExtract(e.target.checked)}
                    />
                    <span style={{ fontWeight: 600, color: '#D97706' }}>Tự động giải nén file nén (ZIP / RAR / 7Z / TAR...) vào thư mục đích</span>
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

                {/* Các nút thêm bước mới */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('MODIFY_FILE')}
                    leftIcon={<FileCode size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#059669', borderColor: '#10B981' }}
                  >
                    + Bước Sửa File
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('RUN_SCRIPT')}
                    leftIcon={<Play size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#2563EB', borderColor: '#3B82F6' }}
                  >
                    + Bước Chạy Script
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddDeployStep('DELETE_FILE')}
                    leftIcon={<Trash2 size={12} />}
                    style={{ fontSize: '11px', padding: '3px 8px', color: '#DC2626', borderColor: '#EF4444' }}
                  >
                    + Bước Xóa File
                  </Button>
                </div>
              </div>

              {/* Danh sách từng bước dạng thẻ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {deploySteps.map((step, idx) => {
                  const isModify = step.step_type === 'MODIFY_FILE';
                  const isScript = step.step_type === 'RUN_SCRIPT' || step.step_type === 'RUN_COMMAND';

                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '10px 12px',
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
                              backgroundColor: isModify ? '#059669' : (isScript ? '#2563EB' : '#DC2626'),
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
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isModify ? '#ECFDF5' : (isScript ? '#EFF6FF' : '#FEF2F2'),
                              color: isModify ? '#065F46' : (isScript ? '#1E40AF' : '#991B1B')
                            }}
                          >
                            {isModify ? '📝 SỬA FILE' : (isScript ? '⚡ CHẠY SCRIPT' : '🗑️ XÓA FILE')}
                          </span>

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
                        </div>
                      </div>

                      {/* CHI TIẾT BƯỚC: SỬA FILE */}
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
                                  </div>
                                ))}

                                {/* Thêm key mới */}
                                {activeJsonStepIndex === idx ? (
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
                                  placeholder="VD: http://192.168.254.1:8000 (Để trống nếu muốn điền nội dung bên phải)"
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
                                  Thay thế bằng (hoặc Điền vào file):
                                </label>
                                <input
                                  type="text"
                                  value={step.replace_text || ''}
                                  onChange={(e) => handleUpdateDeployStep(idx, { replace_text: e.target.value })}
                                  placeholder="VD: tôi đã đến đây"
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
                                placeholder="VD: tôi đã đến đây"
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

                      {/* CHI TIẾT BƯỚC: CHẠY SCRIPT */}
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
                                placeholder="Cai_Dat_Dich_Vu_Windows.bat"
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
                                Tham số truyền vào (Arguments):
                              </label>
                              <input
                                type="text"
                                value={step.arguments || ''}
                                onChange={(e) => handleUpdateDeployStep(idx, { arguments: e.target.value })}
                                placeholder="VD: /silent hoặc để trống"
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  fontSize: '12px',
                                  backgroundColor: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '2px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={step.run_as_admin ?? true}
                                onChange={(e) => handleUpdateDeployStep(idx, { run_as_admin: e.target.checked })}
                              />
                              <span>Quyền Administrator (UAC)</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={step.wait_for_completion ?? true}
                                onChange={(e) => handleUpdateDeployStep(idx, { wait_for_completion: e.target.checked })}
                              />
                              <span>Chờ hoàn tất và ghi nhận kết quả (Exit Code)</span>
                            </label>
                          </div>
                        </div>
                      )}

                      {/* CHI TIẾT BƯỚC: XÓA FILE */}
                      {!isModify && !isScript && (
                        <div style={{ paddingTop: '4px', borderTop: '1px dashed var(--border-color)' }}>
                          <label style={{ fontSize: '11.5px', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                            Đường dẫn file hoặc thư mục cần xóa:
                          </label>
                          <input
                            type="text"
                            value={step.file_path || ''}
                            onChange={(e) => handleUpdateDeployStep(idx, { file_path: e.target.value })}
                            placeholder="Restaurant_Support_Agent_Full.zip"
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {renderTargetDevicePicker()}

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
    </div>
  );
};
