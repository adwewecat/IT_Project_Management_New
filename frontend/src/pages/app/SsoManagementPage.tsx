import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  User,
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  Plus,
  Trash2,
  Building2,
  Users,
  RotateCcw,
  UserPlus,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import { SsoBulkImportModal } from '../../components/sso/SsoBulkImportModal';
import {
  ssoManagementService,
} from '../../services/ssoManagementService';
import {
  SSOConfigResponse,
  IAMUserItem,
} from '../../types/ssoManagement';

const DEFAULT_14_CLIENTS = [
  'Chatbot cho hệ thống GPMS và G-Office (Phân quyền người dùng)',
  'Client Gương Thần API (Phân quyền người dùng)',
  'Client Gương Thần App (Phân quyền người dùng)',
  'Hệ thống G-Office ( Phân quyền người dùng)',
  'Hệ thống Quick Ticket',
  'Hệ thống GChecklist',
  'GStars_App_RM_PROD - Client dự án Gstars APP cho RM - PROD',
  'GStars_Web_RM_PROD - Webadmin dự án GStars App RM - PROD',
  'G Survey hệ thống khảo sát',
  'Hệ thống G-PMS',
  'Gstar Mobile App Client - Donot delete',
  'GHERO_Hệ thống Ghero',
  'ggg_sso_pim_created_date_19102021',
  'SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete',
];

const DEFAULT_NCC_CLIENTS = [
  'Hệ thống GChecklist',
  'PoPortal_Hệ thống đặt hàng Hồ Chí Minh',
  'Hệ thống E-Bidding',
  'SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete',
];


// Helper tạo mật khẩu ngẫu nhiên đạt chuẩn
const generateSecurePassword = (length = 10): string => {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = '@#$!%&*';

  const getRandom = (chars: string) => chars[Math.floor(Math.random() * chars.length)];

  const u = getRandom(uppers);
  const l = getRandom(lowers);
  const d = getRandom(digits);
  const s = getRandom(specials);

  const all = uppers + lowers + digits + specials;
  let remaining = '';
  for (let i = 0; i < Math.max(length - 4, 4); i++) {
    remaining += getRandom(all);
  }

  const combined = (u + l + d + s + remaining).split('');
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join('');
};

export const SsoManagementPage: React.FC = () => {
  const { user } = useAuth();

  // --- SSO Config State ---
  const [ssoConfig, setSsoConfig] = useState<SSOConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [testingLogin, setTestingLogin] = useState<boolean>(false);

  // Config Modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [inputSsoUser, setInputSsoUser] = useState<string>('');
  const [inputSsoPass, setInputSsoPass] = useState<string>('');
  const [savingConfig, setSavingConfig] = useState<boolean>(false);
  const [showConfigPass, setShowConfigPass] = useState<boolean>(false);

  // --- Search State ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(false);
  const [userList, setUserList] = useState<IAMUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<IAMUserItem | null>(null);

  // --- Change Password Modal ---
  const [isChangePassModalOpen, setIsChangePassModalOpen] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(true);
  const [processingChangePass, setProcessingChangePass] = useState<boolean>(false);

  // --- Change Password Result Modal ---
  const [passResultModalOpen, setPassResultModalOpen] = useState<boolean>(false);
  const [passResultData, setPassResultData] = useState<{
    success: boolean;
    isLdap?: boolean;
    message: string;
    newPassword?: string;
    userName?: string;
    email?: string;
  } | null>(null);
  const [copiedPass, setCopiedPass] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);

  // --- Assign Clients Modal ---
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [assignTab, setAssignTab] = useState<'ggg' | 'ncc'>('ggg');
  const [gggClients, setGggClients] = useState<string[]>(DEFAULT_14_CLIENTS);
  const [selectedGggClients, setSelectedGggClients] = useState<string[]>(DEFAULT_14_CLIENTS);
  const [nccClients, setNccClients] = useState<string[]>(DEFAULT_NCC_CLIENTS);
  const [selectedNccClients, setSelectedNccClients] = useState<string[]>(DEFAULT_NCC_CLIENTS);
  const [customClientInput, setCustomClientInput] = useState<string>('');
  const [processingAssign, setProcessingAssign] = useState<boolean>(false);

  // --- Create NCC User Modal State ---
  const [isCreateNccModalOpen, setIsCreateNccModalOpen] = useState<boolean>(false);
  const [inputNccUsername, setInputNccUsername] = useState<string>('');
  const [inputNccEmail, setInputNccEmail] = useState<string>('');
  const [inputNccPhone, setInputNccPhone] = useState<string>('0908119345');
  const [creatingNccUser, setCreatingNccUser] = useState<boolean>(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);
  const [nccConfiguredClients, setNccConfiguredClients] = useState<string[]>(DEFAULT_NCC_CLIENTS);
  const [showNccPermissionsAccordion, setShowNccPermissionsAccordion] = useState<boolean>(false);
  const [nccNewClientInput, setNccNewClientInput] = useState<string>('');
  const [nccDuplicatePrompt, setNccDuplicatePrompt] = useState<{
    open: boolean;
    phone: string;
    message: string;
  } | null>(null);

  // --- NCC Creation Result Modal (Hiển thị User & Password mới) ---
  const [nccResultData, setNccResultData] = useState<{
    userName: string;
    email: string;
    phoneNumber: string;
    password: string;
    assignedClients: string[];
  } | null>(null);
  const [isNccResultModalOpen, setIsNccResultModalOpen] = useState<boolean>(false);
  const [copiedNccPass, setCopiedNccPass] = useState<boolean>(false);
  const [copiedNccTemplate, setCopiedNccTemplate] = useState<boolean>(false);

  // --- Toast notification ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);


  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Tải cấu hình SSO riêng của user
  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await ssoManagementService.getConfig();
      setSsoConfig(res);
      if (res.sso_username) {
        setInputSsoUser(res.sso_username);
      }
    } catch (err: any) {
      console.error('Lỗi tải cấu hình SSO:', err);
      showToast('Không thể tải trạng thái cấu hình SSO.', 'error');
    } finally {
      setLoadingConfig(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Kiểm tra đăng nhập lại
  const handleTestLogin = async () => {
    try {
      setTestingLogin(true);
      const res = await ssoManagementService.testLogin();
      if (res.success) {
        showToast(`Kết nối SSO thành công cho tài khoản ${res.sso_username}!`, 'success');
        setSsoConfig((prev) => prev ? { ...prev, last_status: 'SUCCESS', last_tested_at: new Date().toISOString() } : null);
      } else {
        showToast(res.message || 'Đăng nhập SSO thất bại.', 'error');
        setSsoConfig((prev) => prev ? { ...prev, last_status: 'FAILED', last_tested_at: new Date().toISOString() } : null);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi kiểm tra kết nối SSO';
      showToast(msg, 'error');
    } finally {
      setTestingLogin(false);
    }
  };

  // Lưu cấu hình SSO mới
  const handleSaveConfig = async () => {
    if (!inputSsoUser.trim() || !inputSsoPass.trim()) {
      showToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu SSO.', 'error');
      return;
    }
    try {
      setSavingConfig(true);
      const res = await ssoManagementService.saveConfig({
        sso_username: inputSsoUser.trim(),
        sso_password: inputSsoPass.trim(),
      });
      setSsoConfig(res);
      setIsConfigModalOpen(false);
      setInputSsoPass('');
      showToast(res.message || 'Đã lưu và kết nối tài khoản SSO thành công!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi lưu cấu hình SSO';
      showToast(msg, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Tìm kiếm User IAM
  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    if (!ssoConfig?.configured) {
      showToast('Vui lòng cấu hình tài khoản SSO trước khi tìm kiếm.', 'error');
      setIsConfigModalOpen(true);
      return;
    }
    const queryToSearch = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!queryToSearch) {
      showToast('Vui lòng nhập từ khóa tìm kiếm (Username, email, SĐT hoặc mã nhân viên).', 'info');
      return;
    }
    try {
      setSearching(true);
      setSelectedUser(null);
      const res = await ssoManagementService.searchUsers(queryToSearch);
      setUserList(res.items || []);
      setHasSearched(true);
      const more = !!res.has_more || (res.items && res.items.length >= 10);
      setHasMoreResults(more);
      if (more) {
        showToast('Danh sách nhiều hơn 10 user nên chỉ list ra 10 user đầu. Vui lòng nhập thêm thông tin để tìm chính xác.', 'info');
      } else if (res.items.length === 0) {
        showToast('Không tìm thấy tài khoản nào khớp với từ khóa.', 'info');
      } else {
        showToast(`Tìm thấy ${res.items.length} tài khoản phù hợp.`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi tìm kiếm trên IAM';
      showToast(msg, 'error');
    } finally {
      setSearching(false);
    }
  };

  // Mở modal Đổi Mật Khẩu
  const handleOpenChangePassModal = () => {
    if (!selectedUser) {
      showToast('Vui lòng chọn 1 tài khoản để đổi mật khẩu.', 'info');
      return;
    }
    setNewPasswordInput(generateSecurePassword(10));
    setShowNewPassword(true);
    setIsChangePassModalOpen(true);
  };

  // Xác nhận Đổi Mật Khẩu
  const handleConfirmChangePass = async () => {
    if (!selectedUser) return;
    try {
      setProcessingChangePass(true);
      const res = await ssoManagementService.changePassword({
        user_id: selectedUser.user_id,
        custom_password: newPasswordInput.trim() || undefined,
      });

      setIsChangePassModalOpen(false);
      setPassResultData({
        success: res.success,
        isLdap: res.is_ldap,
        message: res.message,
        newPassword: res.new_password,
        userName: res.user_name || selectedUser.user_name,
        email: selectedUser.email || '',
      });
      setCopiedPass(false);
      setCopiedTemplate(false);
      setPassResultModalOpen(true);

      if (res.success) {
        showToast('Đổi mật khẩu thành công!', 'success');
      } else if (res.is_ldap) {
        showToast('Tài khoản AD/LDAP - Không thể đổi pass trực tiếp.', 'info');
      } else {
        showToast(res.message || 'Đổi mật khẩu thất bại.', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi đổi mật khẩu';
      showToast(msg, 'error');
    } finally {
      setProcessingChangePass(false);
    }
  };

  // Mở modal Phân Quyền
  const handleOpenAssignModal = () => {
    if (!selectedUser) {
      showToast('Vui lòng chọn 1 tài khoản để phân quyền client.', 'info');
      return;
    }
    setCustomClientInput('');
    setIsAssignModalOpen(true);
  };

  // Thêm client tùy biến vào danh sách đang chọn
  const handleAddCustomClient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customClientInput.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên client cần bổ sung.', 'info');
      return;
    }

    if (assignTab === 'ggg') {
      if (gggClients.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        showToast('Client này đã có trong danh sách phân quyền GGG.', 'info');
        return;
      }
      setGggClients(prev => [...prev, trimmed]);
      setSelectedGggClients(prev => [...prev, trimmed]);
      setCustomClientInput('');
      showToast(`Đã bổ sung client "${trimmed}" vào danh sách GGG.`, 'success');
    } else {
      if (nccClients.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
        showToast('Client này đã có trong danh sách phân quyền Đối tác NCC.', 'info');
        return;
      }
      setNccClients(prev => [...prev, trimmed]);
      setSelectedNccClients(prev => [...prev, trimmed]);
      setCustomClientInput('');
      showToast(`Đã bổ sung client "${trimmed}" vào danh sách Đối tác NCC.`, 'success');
    }
  };

  // Xóa client khỏi danh sách
  const handleRemoveClient = (clientName: string) => {
    if (assignTab === 'ggg') {
      setGggClients(prev => prev.filter(c => c !== clientName));
      setSelectedGggClients(prev => prev.filter(c => c !== clientName));
    } else {
      setNccClients(prev => prev.filter(c => c !== clientName));
      setSelectedNccClients(prev => prev.filter(c => c !== clientName));
    }
  };

  // Toggle chọn / bỏ chọn 1 client
  const handleToggleClientCheck = (clientName: string) => {
    if (assignTab === 'ggg') {
      setSelectedGggClients(prev =>
        prev.includes(clientName) ? prev.filter(c => c !== clientName) : [...prev, clientName]
      );
    } else {
      setSelectedNccClients(prev =>
        prev.includes(clientName) ? prev.filter(c => c !== clientName) : [...prev, clientName]
      );
    }
  };

  // Chọn tất cả / Bỏ chọn tất cả
  const handleToggleSelectAll = () => {
    if (assignTab === 'ggg') {
      if (selectedGggClients.length === gggClients.length) {
        setSelectedGggClients([]);
      } else {
        setSelectedGggClients([...gggClients]);
      }
    } else {
      if (selectedNccClients.length === nccClients.length) {
        setSelectedNccClients([]);
      } else {
        setSelectedNccClients([...nccClients]);
      }
    }
  };

  // Đặt lại mặc định
  const handleResetDefaultClients = () => {
    if (assignTab === 'ggg') {
      setGggClients(DEFAULT_14_CLIENTS);
      setSelectedGggClients(DEFAULT_14_CLIENTS);
      showToast('Đã đặt lại 14 client mặc định cho User GGG.', 'info');
    } else {
      setNccClients(DEFAULT_NCC_CLIENTS);
      setSelectedNccClients(DEFAULT_NCC_CLIENTS);
      showToast('Đã đặt lại 3 client mặc định cho Đối tác NCC.', 'info');
    }
  };

  // Xác nhận Phân Quyền
  const handleConfirmAssignClients = async () => {
    if (!selectedUser) return;
    const targetClients = assignTab === 'ggg' ? selectedGggClients : selectedNccClients;
    if (targetClients.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 client để phân quyền.', 'error');
      return;
    }
    try {
      setProcessingAssign(true);
      const res = await ssoManagementService.assignDefaultClients({
        user_id: selectedUser.user_id,
        client_names: targetClients,
      });
      setIsAssignModalOpen(false);
      showToast(res.message || `Phân quyền thành công ${targetClients.length} client cho user!`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi phân quyền client';
      showToast(msg, 'error');
    } finally {
      setProcessingAssign(false);
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (!passResultData?.newPassword) return;
    navigator.clipboard.writeText(passResultData.newPassword);
    setCopiedPass(true);
    showToast('Đã sao chép mật khẩu vào clipboard!', 'success');
    setTimeout(() => setCopiedPass(false), 3000);
  };

  // Copy full message template to send to user
  const handleCopyTemplate = () => {
    if (!passResultData?.newPassword) return;
    const txt = `Hệ thống SSO/IAM đã tạo:\n- Username: ${passResultData.userName || selectedUser?.user_name}\n- Mật khẩu: ${passResultData.newPassword}\n- Email: ${passResultData.email || selectedUser?.email || ''}`;
    navigator.clipboard.writeText(txt);
    setCopiedTemplate(true);
    showToast('Đã sao chép toàn bộ tin nhắn gửi user!', 'success');
    setTimeout(() => setCopiedTemplate(false), 3000);
  };

  // Helper tính SĐT tiếp theo (+2)
  const getNextPhoneNumber = (currentPhone: string, step = 2): string => {
    const digits = currentPhone.replace(/\D/g, '');
    if (!digits) return '0908119345';
    try {
      const num = BigInt(digits) + BigInt(step);
      let nextStr = num.toString();
      if (digits.startsWith('0') && !nextStr.startsWith('0')) {
        nextStr = '0' + nextStr;
      }
      return nextStr;
    } catch {
      return '0908119345';
    }
  };

  // Mở modal Thêm User NCC
  const handleOpenCreateNccModal = () => {
    if (!ssoConfig?.configured) {
      showToast('Vui lòng cấu hình tài khoản SSO trước khi thêm User NCC.', 'error');
      setIsConfigModalOpen(true);
      return;
    }
    const lastPhone = localStorage.getItem('sso_ncc_last_phone');
    const initialPhone = lastPhone ? getNextPhoneNumber(lastPhone, 2) : '0908119345';
    setInputNccUsername('');
    setInputNccEmail('');
    setInputNccPhone(initialPhone);
    setNccDuplicatePrompt(null);
    setShowNccPermissionsAccordion(false);
    setIsCreateNccModalOpen(true);
  };

  // Thêm quyền client mới vào danh sách cấu hình NCC
  const handleAddNccClient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nccNewClientInput.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên client cần bổ sung.', 'info');
      return;
    }
    if (nccConfiguredClients.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Client này đã có trong danh sách phân quyền NCC.', 'info');
      return;
    }
    setNccConfiguredClients(prev => [...prev, trimmed]);
    setNccNewClientInput('');
    showToast(`Đã bổ sung quyền "${trimmed}" vào cấu hình NCC.`, 'success');
  };

  // Xóa quyền client khỏi cấu hình NCC
  const handleRemoveNccClient = (clientName: string) => {
    setNccConfiguredClients(prev => prev.filter(c => c !== clientName));
  };

  // Đặt lại quyền NCC mặc định
  const handleResetDefaultNccConfig = () => {
    setNccConfiguredClients(DEFAULT_NCC_CLIENTS);
    showToast('Đã đặt lại 4 quyền client mặc định cho NCC.', 'info');
  };

  // Thực hiện thêm User NCC (Playwright ngầm)
  const handleCreateNccUser = async (autoResolve = false) => {
    const username = inputNccUsername.trim();
    const email = inputNccEmail.trim();
    const phone = inputNccPhone.trim();

    if (!username) {
      showToast('Vui lòng nhập User Name.', 'error');
      return;
    }
    if (!email) {
      showToast('Vui lòng nhập Email.', 'error');
      return;
    }
    if (!phone) {
      showToast('Vui lòng nhập User Phone Number.', 'error');
      return;
    }

    try {
      setCreatingNccUser(true);
      const res = await ssoManagementService.createNCCUser({
        user_name: username,
        email: email,
        phone_number: phone,
        auto_resolve_phone: autoResolve,
        client_names: nccConfiguredClients,
      });

      if (!res.success) {
        if (res.is_duplicate_phone) {
          setNccDuplicatePrompt({
            open: true,
            phone: phone,
            message: res.message || 'Số điện thoại này đã tồn tại trên hệ thống IAM.',
          });
          showToast(res.message || 'Số điện thoại bị trùng trên IAM.', 'error');
        } else {
          showToast(res.message || 'Thêm User NCC thất bại.', 'error');
        }
        return;
      }

      // Thành công! Lưu lại SĐT đã dùng để lần tới tự động +2
      const finalPhone = res.phone_number || phone;
      localStorage.setItem('sso_ncc_last_phone', finalPhone);

      setIsCreateNccModalOpen(false);
      setNccDuplicatePrompt(null);

      // Mở modal kết quả cấp tài khoản NCC (hiển thị UserName, Password ngẫu nhiên, Quyền đã cấp)
      setNccResultData({
        userName: res.user_name || username,
        email: res.email || email,
        phoneNumber: finalPhone,
        password: res.new_password || '',
        assignedClients: res.assigned_clients && res.assigned_clients.length > 0 ? res.assigned_clients : nccConfiguredClients,
      });
      setCopiedNccPass(false);
      setCopiedNccTemplate(false);
      setIsNccResultModalOpen(true);

      showToast(res.message || `Đã thêm thành công User NCC "${username}" và cấp mật khẩu mới!`, 'success');

      // Tự động tìm kiếm tài khoản vừa tạo để hiển thị lên bảng
      setSearchQuery(username);
      handleSearch(undefined, username);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi tạo User NCC';
      showToast(msg, 'error');
    } finally {
      setCreatingNccUser(false);
    }
  };

  // Copy password của User NCC
  const handleCopyNccPassword = () => {
    if (!nccResultData?.password) return;
    navigator.clipboard.writeText(nccResultData.password);
    setCopiedNccPass(true);
    showToast('Đã sao chép mật khẩu User NCC!', 'success');
    setTimeout(() => setCopiedNccPass(false), 3000);
  };

  // Copy template tin nhắn gửi cho Đối tác / User NCC
  const handleCopyNccTemplate = () => {
    if (!nccResultData) return;
    const txt = `Hệ thống SSO/IAM đã tạo:\n- Username: ${nccResultData.userName}\n- Mật khẩu: ${nccResultData.password}\n- Email: ${nccResultData.email}`;
    navigator.clipboard.writeText(txt);
    setCopiedNccTemplate(true);
    showToast('Đã sao chép toàn bộ thông tin gửi đối tác!', 'success');
    setTimeout(() => setCopiedNccTemplate(false), 3000);
  };

  return (
    <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
      {/* Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            backgroundColor: toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#DC2626' : '#2563EB',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            maxWidth: '450px',
          }}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertCircle size={18} />}
          {toast.type === 'info' && <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(234, 179, 8, 0.15)',
                color: 'var(--color-primary-hover, #DDA600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Xử Lý Tài Khoản SSO & IAM
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tra cứu, mở khóa, đổi mật khẩu và phân quyền client hệ thống IAM (Golden Gate)
              </p>
            </div>
          </div>
        </div>

        {/* SSO Account Status Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            padding: '8px 16px',
            borderRadius: '10px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tài khoản SSO cá nhân:</span>
            {loadingConfig ? (
              <span style={{ color: 'var(--text-muted)' }}>Đang kiểm tra...</span>
            ) : ssoConfig?.configured ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{ssoConfig.sso_username}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: ssoConfig.last_status === 'SUCCESS' ? '#DCFCE7' : '#FEE2E2',
                    color: ssoConfig.last_status === 'SUCCESS' ? '#166534' : '#991B1B',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: ssoConfig.last_status === 'SUCCESS' ? '#16A34A' : '#DC2626',
                    }}
                  />
                  {ssoConfig.last_status === 'SUCCESS' ? 'Đã kết nối' : 'Cần kiểm tra lại'}
                </span>
              </div>
            ) : (
              <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={14} /> Chưa cấu hình
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {ssoConfig?.configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestLogin}
                disabled={testingLogin}
                title="Kiểm tra lại phiên đăng nhập SSO"
              >
                <RefreshCw size={13} className={testingLogin ? 'spin' : ''} />
                <span>{testingLogin ? 'Đang test...' : 'Kiểm Tra'}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setInputSsoUser(ssoConfig?.sso_username || '');
                setInputSsoPass('');
                setIsConfigModalOpen(true);
              }}
            >
              <Settings size={13} />
              <span>{ssoConfig?.configured ? 'Thay Đổi' : 'Cấu Hình SSO'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Warning Box if SSO is not configured */}
      {!loadingConfig && !ssoConfig?.configured && (
        <div
          style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #FCD34D',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} style={{ color: '#D97706', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#92400E', fontSize: '14px' }}>
                Bạn chưa cấu hình tài khoản SSO cho tài khoản đăng nhập này ({user?.username})
              </div>
              <div style={{ fontSize: '13px', color: '#B45309', marginTop: '2px' }}>
                Mỗi tài khoản đăng nhập vào hệ thống sẽ lưu thông tin SSO riêng biệt. Vui lòng bấm cấu hình để lưu tài khoản SSO của bạn trước khi tra cứu trên IAM.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsConfigModalOpen(true)}
            style={{ backgroundColor: '#D97706', color: '#fff', borderColor: '#D97706' }}
          >
            Cấu Hình Ngay
          </Button>
        </div>
      )}

      {/* Search Input Box */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '18px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 320px', minWidth: '240px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập tên đăng nhập, email, số điện thoại hoặc mã nhân viên (ví dụ: dung.nguyenanh, 000016)..."
              disabled={searching}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={searching || !ssoConfig?.configured}
            style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {searching ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Đang Tìm Trên IAM...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Tìm Kiếm User</span>
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Thông báo kết quả vượt quá 10 user */}
      {hasMoreResults && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '10px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
            <strong>Danh sách kết quả nhiều hơn 10 user nên hệ thống chỉ hiển thị 10 user đầu tiên.</strong>{' '}
            Vui lòng nhập thêm thông tin chi tiết (mã nhân viên, email, số điện thoại hoặc họ tên đầy đủ) để tìm kiếm chính xác tài khoản.
          </div>
        </div>
      )}

      {/* Action Toolbar & Table Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Action Toolbar Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: selectedUser ? 'var(--bg-secondary)' : 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            transition: 'background-color 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              DANH SÁCH USER IAM:
            </span>
            {selectedUser ? (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE',
                }}
              >
                Đang chọn: <strong>{selectedUser.user_name}</strong> {selectedUser.email && `(${selectedUser.email})`}
              </span>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                (Chọn 1 dòng trong bảng để thực hiện thao tác)
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <Button
              variant="primary"
              onClick={() => setIsBulkImportModalOpen(true)}
              style={{
                backgroundColor: '#7C3AED',
                borderColor: '#7C3AED',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <FileSpreadsheet size={15} />
              <span>📁 Import Xử Lý Hàng Loạt</span>
            </Button>

            <Button
              variant="primary"
              onClick={handleOpenCreateNccModal}
              style={{
                backgroundColor: '#16A34A',
                borderColor: '#16A34A',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <UserPlus size={15} />
              <span>+ Thêm User NCC</span>
            </Button>

            <Button
              variant="outline"
              disabled={!selectedUser || processingChangePass}
              onClick={handleOpenChangePassModal}
              style={{
                borderColor: selectedUser ? '#2563EB' : undefined,
                color: selectedUser ? '#2563EB' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <KeyRound size={15} />
              <span>1. Đổi Mật Khẩu (Change Pass)</span>
            </Button>

            <Button
              variant="primary"
              disabled={!selectedUser || processingAssign}
              onClick={handleOpenAssignModal}
              style={{
                backgroundColor: selectedUser ? '#059669' : undefined,
                borderColor: selectedUser ? '#059669' : undefined,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ShieldCheck size={15} />
              <span>2. Phân Quyền Client (GGG / NCC)</span>
            </Button>
          </div>
        </div>

        {/* Results Table */}
        <TopScrollTable maxHeight="520px">
          <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: 'var(--bg-secondary)' }}>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ width: '60px', padding: '12px 16px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)' }}>Chọn</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, backgroundColor: 'var(--bg-secondary)' }}>UserName</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, backgroundColor: 'var(--bg-secondary)' }}>Email</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, backgroundColor: 'var(--bg-secondary)' }}>Số Điện Thoại</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, backgroundColor: 'var(--bg-secondary)' }}>Khóa (Lock)</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, backgroundColor: 'var(--bg-secondary)' }}>Loại (Type)</th>
              </tr>
            </thead>
            <tbody>
              {searching ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block', color: 'var(--color-primary)' }} />
                    <div>Đang kết nối hệ thống IAM và tải danh sách user...</div>
                  </td>
                </tr>
              ) : userList.length > 0 ? (
                userList.map((item) => {
                  const isSelected = selectedUser?.user_id === item.user_id;
                  return (
                    <tr
                      key={item.user_id}
                      onClick={() => setSelectedUser(item)}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <input
                          type="radio"
                          name="selected_iam_user"
                          checked={isSelected}
                          onChange={() => setSelectedUser(item)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.user_name}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {item.email || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        {item.phone_number || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: item.lock_enable?.toLowerCase() === 'true' ? '#FEE2E2' : '#F3F4F6',
                            color: item.lock_enable?.toLowerCase() === 'true' ? '#DC2626' : '#6B7280',
                          }}
                        >
                          {item.lock_enable?.toLowerCase() === 'true' ? 'Đang Khóa' : 'Bình thường'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: item.user_type === 'AD' ? '#E0E7FF' : item.user_type === 'Empl' ? '#ECFDF5' : '#FEF3C7',
                            color: item.user_type === 'AD' ? '#3730A3' : item.user_type === 'Empl' ? '#065F46' : '#92400E',
                          }}
                        >
                          {item.user_type || 'Local'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {hasSearched ? (
                      <div>
                        <AlertCircle size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Không tìm thấy tài khoản nào</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Vui lòng kiểm tra lại từ khóa tìm kiếm (Username, Email, hoặc Mã nhân viên).
                        </div>
                      </div>
                    ) : (
                      <div>
                        <User size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                        <div style={{ fontWeight: 500 }}>Chưa có kết quả tìm kiếm</div>
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          Nhập từ khóa vào ô tìm kiếm ở trên và nhấn "Tìm Kiếm User".
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TopScrollTable>
      </div>

      {/* --- MODAL 1: CẤU HÌNH SSO CÁ NHÂN --- */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--color-primary)' }} />
            <span>Cấu Hình Tài Khoản SSO Cá Nhân ({user?.username})</span>
          </div>
        }
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Hệ thống lưu cấu hình SSO độc lập cho từng tài khoản đăng nhập (ví dụ: tài khoản <strong>{user?.username}</strong> lưu riêng, không dùng chung hay ảnh hưởng đến tài khoản khác).
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Tên đăng nhập / Email SSO *
            </label>
            <input
              type="text"
              value={inputSsoUser}
              onChange={(e) => setInputSsoUser(e.target.value)}
              placeholder="Ví dụ: dung.nguyenanh@ggg.com.vn"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Mật khẩu SSO *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfigPass ? 'text' : 'password'}
                value={inputSsoPass}
                onChange={(e) => setInputSsoPass(e.target.value)}
                placeholder="Nhập mật khẩu tài khoản SSO"
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfigPass(!showConfigPass)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showConfigPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Sau khi lưu, hệ thống sẽ tự động đăng nhập kiểm tra kết nối với https://sso.ggg.com.vn/
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" onClick={() => setIsConfigModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Đang Kiểm Tra & Lưu...</span>
                </>
              ) : (
                <span>Lưu & Kiểm Tra Đăng Nhập</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 2: XÁC NHẬN ĐỔI MẬT KHẨU --- */}
      <Modal
        isOpen={isChangePassModalOpen}
        onClose={() => !processingChangePass && setIsChangePassModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <KeyRound size={18} style={{ color: '#2563EB' }} />
            <span>Đổi Mật Khẩu Cho User: {selectedUser?.user_name}</span>
          </div>
        }
        maxWidth="540px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Thông tin user */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '8px', fontSize: '13px' }}>
            <div><strong>Tài khoản:</strong> {selectedUser?.user_name}</div>
            <div><strong>Email:</strong> {selectedUser?.email || '—'}</div>
            <div><strong>Loại tài khoản:</strong> {selectedUser?.user_type || 'Local'}</div>
          </div>

          {/* Hướng dẫn quy trình */}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Hệ thống sẽ tự động thực hiện:</div>
            <div>1. Đặt lại <strong>User Access Failed Count = 0</strong>.</div>
            <div>2. Xóa trắng thời gian khóa <strong>User Lockout End</strong>.</div>
            <div>3. Kiểm tra User Type: Nếu là tài khoản <strong>AD (1)</strong> thì hệ thống sẽ dừng và thông báo liên hệ Helpdesk đổi pass mail.</div>
            <div>4. Cập nhật mật khẩu mới đạt chuẩn bảo mật vào hệ thống IAM.</div>
          </div>

          {/* Ô nhập mật khẩu mới */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Mật khẩu mới dự kiến (Đạt chuẩn bảo mật):
              </label>
              <button
                type="button"
                onClick={() => setNewPasswordInput(generateSecurePassword(10))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={12} /> Tạo pass ngẫu nhiên khác
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu hoặc dùng mật khẩu ngẫu nhiên trên..."
                style={{
                  width: '100%',
                  padding: '9px 36px 9px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                }}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Yêu cầu: Ít nhất 8 ký tự, có ít nhất 1 số, 1 chữ hoa, 1 chữ thường và 1 ký tự đặc biệt.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" onClick={() => setIsChangePassModalOpen(false)} disabled={processingChangePass}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmChangePass}
              disabled={processingChangePass || !newPasswordInput.trim()}
              style={{ backgroundColor: '#2563EB', borderColor: '#2563EB' }}
            >
              {processingChangePass ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Đang Thao Tác Trên IAM...</span>
                </>
              ) : (
                <span>Tiến Hành Đổi Mật Khẩu</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 3: KẾT QUẢ ĐỔI MẬT KHẨU --- */}
      <Modal
        isOpen={passResultModalOpen}
        onClose={() => setPassResultModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {passResultData?.success ? (
              <CheckCircle2 size={20} style={{ color: '#059669' }} />
            ) : (
              <AlertTriangle size={20} style={{ color: '#D97706' }} />
            )}
            <span>{passResultData?.success ? 'Đổi Mật Khẩu Thành Công' : 'Thông Báo Từ Hệ Thống'}</span>
          </div>
        }
        maxWidth="540px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {passResultData?.isLdap ? (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertTriangle size={24} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: '14px' }}>
                  Tài Khoản Đồng Bộ Từ LDAP / Active Directory
                </div>
                <div style={{ fontSize: '13px', color: '#B45309', marginTop: '6px', lineHeight: 1.5 }}>
                  {passResultData.message}
                </div>
              </div>
            </div>
          ) : passResultData?.success ? (
            <>
              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  color: '#065F46',
                  fontSize: '13px',
                }}
              >
                Đã đặt lại <strong>Access Failed Count = 0</strong>, xóa thời gian khóa tài khoản và cập nhật mật khẩu mới thành công trên IAM cho user <strong>{passResultData.userName}</strong>.
              </div>

              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  MẬT KHẨU MỚI:
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: '#2563EB',
                      letterSpacing: '1px',
                    }}
                  >
                    {passResultData.newPassword}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCopyPassword}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedPass ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPass ? 'Đã Chép' : 'Sao Chép'}</span>
                  </Button>
                </div>
              </div>

              {/* Mẫu tin nhắn gửi cho user */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    MẪU TIN NHẮN GỬI CHO USER:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {copiedTemplate ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedTemplate ? 'Đã chép nội dung' : 'Sao chép tin nhắn'}</span>
                  </button>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.5,
                    fontFamily: 'monospace',
                    backgroundColor: 'var(--bg-card)',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {`Hệ thống SSO/IAM đã tạo:\n- Username: ${passResultData.userName || selectedUser?.user_name}\n- Mật khẩu: ${passResultData.newPassword}\n- Email: ${passResultData.email || selectedUser?.email || ''}`}
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '14px 16px',
                color: '#991B1B',
                fontSize: '13px',
              }}
            >
              {passResultData?.message || 'Có lỗi xảy ra trong quá trình đổi mật khẩu.'}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button variant="primary" onClick={() => setPassResultModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 4: PHÂN QUYỀN CLIENTS (GGG & NCC) --- */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => !processingAssign && setIsAssignModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: '#059669' }} />
            <span>Phân Quyền Client Cho User: {selectedUser?.user_name}</span>
          </div>
        }
        maxWidth="680px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* User info mini header */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Tài khoản: </span>
              <strong>{selectedUser?.user_name}</strong>
              {selectedUser?.email && <span style={{ color: 'var(--text-muted)' }}> ({selectedUser.email})</span>}
            </div>
            {selectedUser?.user_type && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  border: '1px solid #BFDBFE',
                }}
              >
                Loại: {selectedUser.user_type}
              </span>
            )}
          </div>

          {/* 2 Tabs: Phân quyền User GGG vs Đối tác NCC */}
          <div
            style={{
              display: 'flex',
              borderBottom: '2px solid var(--border-color)',
              gap: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => setAssignTab('ggg')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: assignTab === 'ggg' ? '#059669' : 'var(--text-secondary)',
                backgroundColor: assignTab === 'ggg' ? '#ECFDF5' : 'transparent',
                border: 'none',
                borderBottom: assignTab === 'ggg' ? '2px solid #059669' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.2s',
              }}
            >
              <Users size={16} />
              <span>1. Phân Quyền User GGG</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: assignTab === 'ggg' ? '#059669' : 'var(--border-color)',
                  color: assignTab === 'ggg' ? '#FFFFFF' : 'var(--text-muted)',
                }}
              >
                {selectedGggClients.length}/{gggClients.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAssignTab('ncc')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: assignTab === 'ncc' ? '#059669' : 'var(--text-secondary)',
                backgroundColor: assignTab === 'ncc' ? '#ECFDF5' : 'transparent',
                border: 'none',
                borderBottom: assignTab === 'ncc' ? '2px solid #059669' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.2s',
              }}
            >
              <Building2 size={16} />
              <span>2. Phân Quyền Đối Tác NCC</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: assignTab === 'ncc' ? '#059669' : 'var(--border-color)',
                  color: assignTab === 'ncc' ? '#FFFFFF' : 'var(--text-muted)',
                }}
              >
                {selectedNccClients.length}/{nccClients.length}
              </span>
            </button>
          </div>

          {/* Tab Description */}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {assignTab === 'ggg' ? (
              <span>
                Hệ thống sẽ tự động bật các client nội bộ Golden Gate (G-Office, Chatbot, GPMS, Quick Ticket, v.v.)
                cho user trên trang <strong>User & Clients</strong>.
              </span>
            ) : (
              <span>
                Hệ thống sẽ tự động phân quyền các cổng truy cập dành cho <strong>Đối Tác / Nhà Cung Cấp</strong> (PoPortal, E-Bidding, SSO IAM)
                trên trang <strong>User & Clients</strong>.
              </span>
            )}
          </div>

          {/* Ô Bổ sung phân quyền */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Bổ sung Client vào danh sách phân quyền (nếu cần):
            </div>
            <form onSubmit={handleAddCustomClient} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={customClientInput}
                onChange={(e) => setCustomClientInput(e.target.value)}
                placeholder="Nhập chính xác tên Client trên IAM (ví dụ: Tên_Hệ_Thống)..."
                disabled={processingAssign}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={processingAssign || !customClientInput.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
              >
                <Plus size={15} />
                <span>Bổ Sung</span>
              </Button>
            </form>
          </div>

          {/* Danh sách Client của Tab hiện tại */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* List Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                DANH SÁCH CLIENT CẦN BẬT ({assignTab === 'ggg' ? selectedGggClients.length : selectedNccClients.length} đã chọn):
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={processingAssign}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {(assignTab === 'ggg' ? selectedGggClients.length === gggClients.length : selectedNccClients.length === nccClients.length)
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
                <span style={{ color: 'var(--border-color)' }}>|</span>
                <button
                  type="button"
                  onClick={handleResetDefaultClients}
                  disabled={processingAssign}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Đặt lại mặc định</span>
                </button>
              </div>
            </div>

            {/* Scrollable Client Items */}
            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                padding: '6px',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {(assignTab === 'ggg' ? gggClients : nccClients).map((client, idx) => {
                const isSelected = assignTab === 'ggg' ? selectedGggClients.includes(client) : selectedNccClients.includes(client);
                const isDefault = assignTab === 'ggg' ? DEFAULT_14_CLIENTS.includes(client) : DEFAULT_NCC_CLIENTS.includes(client);

                return (
                  <div
                    key={client}
                    onClick={() => !processingAssign && handleToggleClientCheck(client)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid var(--border-color)' : '1px dashed transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      opacity: isSelected ? 1 : 0.65,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by row click
                        disabled={processingAssign}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                          wordBreak: 'break-word',
                        }}
                      >
                        {idx + 1}. {client}
                      </span>
                      {!isDefault && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            flexShrink: 0,
                          }}
                        >
                          Tự bổ sung
                        </span>
                      )}
                    </div>

                    {!isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveClient(client);
                        }}
                        disabled={processingAssign}
                        title="Xóa client này khỏi danh sách"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} disabled={processingAssign}>
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmAssignClients}
              disabled={processingAssign || (assignTab === 'ggg' ? selectedGggClients.length === 0 : selectedNccClients.length === 0)}
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              {processingAssign ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Đang Phân Quyền Trên IAM...</span>
                </>
              ) : (
                <span>
                  Tiến Hành Phân Quyền (
                  {assignTab === 'ggg' ? selectedGggClients.length : selectedNccClients.length} Client)
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 4. MODAL THÊM USER NCC */}
      <Modal
        isOpen={isCreateNccModalOpen}
        onClose={() => {
          if (!creatingNccUser) {
            setIsCreateNccModalOpen(false);
          }
        }}
        title="Thêm Mới Tài Khoản Đối Tác (User NCC)"
        maxWidth="660px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Note Banner */}
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(22, 163, 74, 0.08)',
              border: '1px solid rgba(22, 163, 74, 0.25)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#15803D',
            }}
          >
            <UserPlus size={18} style={{ flexShrink: 0 }} />
            <span>
              Tự động khởi tạo tài khoản Local trên IAM (0 - Local), kiểm tra trùng số điện thoại và phân 4 quyền hệ thống mặc định.
            </span>
          </div>

          {/* DUPLICATE PROMPT WARNING BOX */}
          {nccDuplicatePrompt?.open && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertCircle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '13px' }}>
                    Số điện thoại đã tồn tại trên IAM!
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '2px', lineHeight: '1.4' }}>
                    {nccDuplicatePrompt.message}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '4px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNccDuplicatePrompt(null)}
                  disabled={creatingNccUser}
                  style={{ fontSize: '12px', height: '36px' }}
                >
                  Tự Đổi Số Khác
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleCreateNccUser(true)}
                  disabled={creatingNccUser}
                  style={{
                    backgroundColor: '#DC2626',
                    borderColor: '#DC2626',
                    fontSize: '12px',
                    height: '36px',
                    color: '#ffffff',
                  }}
                >
                  {creatingNccUser ? (
                    <>
                      <RefreshCw size={13} className="spin" />
                      <span>Đang Tự Xử Lý...</span>
                    </>
                  ) : (
                    <span>⚡ Để Hệ Thống Tự Xử Lý</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Input Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* User Name */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                User Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={inputNccUsername}
                onChange={(e) => setInputNccUsername(e.target.value)}
                placeholder="Ví dụ: ncc_vinamilk, ncc_megadish..."
                disabled={creatingNccUser}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                Email <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="email"
                value={inputNccEmail}
                onChange={(e) => setInputNccEmail(e.target.value)}
                placeholder="Ví dụ: doitac@ncc.com.vn..."
                disabled={creatingNccUser}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                User Phone Number <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={inputNccPhone}
                onChange={(e) => {
                  setInputNccPhone(e.target.value);
                  if (nccDuplicatePrompt?.open) {
                    setNccDuplicatePrompt(null);
                  }
                }}
                placeholder="0908119345"
                disabled={creatingNccUser}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: nccDuplicatePrompt?.open ? '1.5px solid #EF4444' : '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                💡 Số điện thoại được tự động điền sẵn và nhảy số cho các lần tiếp theo. Bạn có thể tự chỉnh sửa nếu muốn.
              </span>
            </div>

            {/* Readonly info: Type & Failed Count */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '2px' }}>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Loại tài khoản (User Type):</span>{' '}
                <strong style={{ color: '#2563EB' }}>0 - Local</strong>
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>User Access Failed Count:</span>{' '}
                <strong style={{ color: 'var(--text-primary)' }}>0</strong>
              </div>
            </div>
          </div>

          {/* ACCORDION: Cấu hình quyền Client mặc định */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginTop: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setShowNccPermissionsAccordion(!showNccPermissionsAccordion)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-secondary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: '#16A34A' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Cấu hình quyền Client ({nccConfiguredClients.length} hệ thống được gán tự động)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ fontSize: '12px' }}>{showNccPermissionsAccordion ? 'Thu gọn' : 'Xem / Tùy chỉnh'}</span>
                {showNccPermissionsAccordion ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showNccPermissionsAccordion && (
              <div style={{ padding: '14px', backgroundColor: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Danh sách các Client sẽ tự động phân quyền sau khi tạo User:
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaultNccConfig}
                    disabled={creatingNccUser}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563EB',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Đặt lại 4 quyền mặc định</span>
                  </button>
                </div>

                {/* Clients list */}
                <div
                  style={{
                    maxHeight: '160px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {nccConfiguredClients.map((client, idx) => {
                    const isDefault = DEFAULT_NCC_CLIENTS.includes(client);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderBottom: idx === nccConfiguredClients.length - 1 ? 'none' : '1px solid var(--border-color)',
                          fontSize: '12.5px',
                          backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                          <Check size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                            {idx + 1}. {client}
                          </span>
                          {!isDefault && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor: '#FEF3C7',
                                color: '#92400E',
                                flexShrink: 0,
                              }}
                            >
                              Tự thêm
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveNccClient(client)}
                          disabled={creatingNccUser}
                          title="Xóa quyền này"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add new client row */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={nccNewClientInput}
                    onChange={(e) => setNccNewClientInput(e.target.value)}
                    placeholder="Nhập tên Client hệ thống muốn bổ sung..."
                    disabled={creatingNccUser}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNccClient();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '12.5px',
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddNccClient}
                    disabled={creatingNccUser || !nccNewClientInput.trim()}
                    style={{ fontSize: '12px' }}
                  >
                    <Plus size={13} />
                    <span>Thêm</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

            {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button
              variant="outline"
              onClick={() => setIsCreateNccModalOpen(false)}
              disabled={creatingNccUser}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={() => handleCreateNccUser(false)}
              disabled={creatingNccUser || !inputNccUsername.trim() || !inputNccEmail.trim() || !inputNccPhone.trim()}
              style={{ backgroundColor: '#16A34A', borderColor: '#16A34A', color: '#ffffff' }}
            >
              {creatingNccUser ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Đang Khởi Tạo Trên IAM...</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Thêm User NCC & Phân Quyền</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 5. MODAL KẾT QUẢ THÊM USER NCC (HIỂN THỊ USERNAME & PASSWORD) */}
      <Modal
        isOpen={isNccResultModalOpen}
        onClose={() => setIsNccResultModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={20} style={{ color: '#16A34A' }} />
            <span>Khởi Tạo Tài Khoản Đối Tác (NCC) Thành Công</span>
          </div>
        }
        maxWidth="580px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Success Banner */}
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              fontSize: '13px',
              color: '#065F46',
            }}
          >
            <ShieldCheck size={22} style={{ color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '3px' }}>
                Tài khoản đối tác đã sẵn sàng sử dụng!
              </div>
              <div>
                Đã khởi tạo tài khoản Local trên IAM, <strong>tắt User Lockout Enabled (không bị khóa tài khoản)</strong>, thiết lập mật khẩu mới ngẫu nhiên và phân quyền <strong>{nccResultData?.assignedClients.length || 4} hệ thống</strong> thành công.
              </div>
            </div>
          </div>

          {/* Account Details Box */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tên đăng nhập (Username):</span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '14px' }}>
                {nccResultData?.userName}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email:</span>
              <span style={{ color: 'var(--text-primary)' }}>{nccResultData?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Số điện thoại:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{nccResultData?.phoneNumber}</span>
            </div>
          </div>

          {/* Password Box */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              MẬT KHẨU MỚI (NGẪU NHIÊN ĐẠT CHUẨN BẢO MẬT):
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1.5px solid #93C5FD',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '19px',
                  fontWeight: 700,
                  color: '#2563EB',
                  letterSpacing: '1px',
                }}
              >
                {nccResultData?.password}
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCopyNccPassword}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#2563EB', borderColor: '#2563EB' }}
              >
                {copiedNccPass ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedNccPass ? 'Đã Chép' : 'Sao Chép Mật Khẩu'}</span>
              </Button>
            </div>
          </div>

          {/* Message Template to send partner/user */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                MẪU TIN NHẮN GỬI CHO ĐỐI TÁC / USER:
              </span>
              <button
                type="button"
                onClick={handleCopyNccTemplate}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#059669',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copiedNccTemplate ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedNccTemplate ? 'Đã chép nội dung' : 'Sao chép tin nhắn'}</span>
              </button>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-line',
                lineHeight: 1.5,
                fontFamily: 'monospace',
                backgroundColor: 'var(--bg-card)',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                maxHeight: '180px',
                overflowY: 'auto',
              }}
            >
              {nccResultData ? `Hệ thống SSO/IAM đã tạo:\n- Username: ${nccResultData.userName}\n- Mật khẩu: ${nccResultData.password}\n- Email: ${nccResultData.email}` : ''}
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button
              variant="primary"
              onClick={() => setIsNccResultModalOpen(false)}
              style={{ backgroundColor: '#16A34A', borderColor: '#16A34A', color: '#fff', minWidth: '110px' }}
            >
              Hoàn Tất / Đóng
            </Button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL 6: IMPORT XỬ LÝ HÀNG LOẠT --- */}
      <SsoBulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={() => {
          if (searchQuery.trim()) {
            handleSearch();
          }
        }}
      />
    </div>
  );
};
export default SsoManagementPage;
