import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RotateCcw,
  UserPlus,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { SsoBulkImportModal } from '../../components/sso/SsoBulkImportModal';
import { SsoBatchPasteModal } from '../../components/sso/SsoBatchPasteModal';
import { SsoBatchAssignModal } from '../../components/sso/SsoBatchAssignModal';
import {
  ssoManagementService,
} from '../../services/ssoManagementService';
import { copyToClipboard } from '../../utils/clipboard';
import {
  SSOConfigResponse,
} from '../../types/ssoManagement';

const DEFAULT_NCC_CLIENTS = [
  'Hệ thống GChecklist',
  'PoPortal_Hệ thống đặt hàng Hồ Chí Minh',
  'Hệ thống E-Bidding',
  'SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete',
];
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

  // --- Modals State ---
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);
  const [isBatchPasteModalOpen, setIsBatchPasteModalOpen] = useState<boolean>(false);
  const [batchPasteAction, setBatchPasteAction] = useState<'change_pass' | 'lock'>('change_pass');
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState<boolean>(false);

  // --- Create NCC User Modal State ---
  const [isCreateNccModalOpen, setIsCreateNccModalOpen] = useState<boolean>(false);
  const [inputNccUsername, setInputNccUsername] = useState<string>('');
  const [inputNccEmail, setInputNccEmail] = useState<string>('');
  const [inputNccPhone, setInputNccPhone] = useState<string>('0908119345');
  const [creatingNccUser, setCreatingNccUser] = useState<boolean>(false);
  const [nccConfiguredClients, setNccConfiguredClients] = useState<string[]>(DEFAULT_NCC_CLIENTS);
  const [showNccPermissionsAccordion, setShowNccPermissionsAccordion] = useState<boolean>(false);
  const [nccNewClientInput, setNccNewClientInput] = useState<string>('');
  const [nccDuplicatePrompt, setNccDuplicatePrompt] = useState<{
    open: boolean;
    phone: string;
    message: string;
  } | null>(null);

  // --- NCC Creation Result Modal ---
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

    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Lỗi khi tạo User NCC';
      showToast(msg, 'error');
    } finally {
      setCreatingNccUser(false);
    }
  };

  // Copy password của User NCC (tương thích cả HTTP IP nội bộ và HTTPS)
  const handleCopyNccPassword = async () => {
    if (!nccResultData?.password) return;
    const ok = await copyToClipboard(nccResultData.password);
    if (!ok) {
      showToast('Không thể sao chép mật khẩu vào clipboard!', 'error');
      return;
    }
    setCopiedNccPass(true);
    showToast('Đã sao chép mật khẩu User NCC!', 'success');
    setTimeout(() => setCopiedNccPass(false), 3000);
  };

  // Copy template tin nhắn gửi cho Đối tác / User NCC
  const handleCopyNccTemplate = async () => {
    if (!nccResultData) return;
    const txt = `Hệ thống SSO/IAM đã tạo:\n- Username: ${nccResultData.userName}\n- Mật khẩu: ${nccResultData.password}\n- Email: ${nccResultData.email}`;
    const ok = await copyToClipboard(txt);
    if (!ok) {
      showToast('Không thể sao chép nội dung vào clipboard!', 'error');
      return;
    }
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
            backgroundColor: toast.type === 'success' ? 'var(--color-success)' : toast.type === 'error' ? 'var(--color-error)' : 'var(--text-primary)',
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
            backgroundColor: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={22} style={{ color: 'var(--color-warning-text)', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning-text)', fontSize: '14px' }}>
                Bạn chưa cấu hình tài khoản SSO cho tài khoản đăng nhập này ({user?.username})
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-warning-text)', marginTop: '2px' }}>
                Mỗi tài khoản đăng nhập vào hệ thống sẽ lưu thông tin SSO riêng biệt. Vui lòng bấm cấu hình để lưu tài khoản SSO của bạn trước khi tra cứu trên IAM.
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsConfigModalOpen(true)}
          >
            Cấu Hình Ngay
          </Button>
        </div>
      )}


      {/* Action Toolbar & Feature Hub Section */}
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
            backgroundColor: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              CÔNG CỤ XỬ LÝ TÀI KHOẢN SSO & IAM:
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <Button
              variant="primary"
              onClick={() => {
                setBatchPasteAction('change_pass');
                setIsBatchPasteModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontWeight: 700,
              }}
            >
              <Sparkles size={15} />
              <span>⚡ Tính Năng Mở Rộng</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsBulkImportModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontWeight: 600,
              }}
            >
              <FileSpreadsheet size={15} />
              <span>📁 Import Excel</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleOpenCreateNccModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontWeight: 600,
              }}
            >
              <UserPlus size={15} />
              <span>+ Thêm User NCC</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsBatchAssignModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={15} />
              <span>🛡️ Phân Quyền User</span>
            </Button>
          </div>
        </div>

        {/* 4 Feature Hub Cards */}
        <div
          style={{
            padding: '24px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '18px',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          {/* Card 1: Tính Năng Mở Rộng */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Tính Năng Mở Rộng
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Dán danh sách Text / Copy-Paste nhanh
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--color-primary)',
                  }}
                >
                  Xử lý nhanh
                </span>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>• <strong>Đổi Mật Khẩu Hàng Loạt</strong>: Tự động sinh password ngẫu nhiên đạt chuẩn IAM &ge; 9 ký tự (hoa, thường, số, ký tự đặc biệt) và tự động mở khóa tài khoản.</div>
                <div style={{ marginTop: '4px' }}>• <strong>Khóa Tài Khoản Hàng Loạt</strong>: Tự động khóa nhanh (Lockout Enabled = TRUE, Failed = 4, Lockout End = ngày hiện tại).</div>
                <div style={{ marginTop: '4px' }}>• Hỗ trợ copy 1-chạm từng pass, copy toàn bộ danh sách, xuất file Excel (.xlsx).</div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => {
                setBatchPasteAction('change_pass');
                setIsBatchPasteModalOpen(true);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 700,
              }}
            >
              <span>Mở Tính Năng Mở Rộng</span>
              <ArrowRight size={15} />
            </Button>
          </div>

          {/* Card 2: Import Excel */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Import File Excel
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Mẫu Excel chuẩn 10 cột tiện lợi
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  5 tác vụ
                </span>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>• Dùng chung <strong>1 template Excel 10 cột</strong> cho toàn bộ 5 nghiệp vụ SSO/IAM.</div>
                <div style={{ marginTop: '4px' }}>• <strong>5 Tác vụ</strong>: 1. Tạo mới tài khoản (chống trùng) | 2. Update Pass & Mở khóa | 3. Khóa tài khoản | 4. Phân quyền User & Clients | 5. Cập nhật thông tin (Email mới, SĐT mới, Loại tài khoản mới).</div>
                <div style={{ marginTop: '4px' }}>• Thanh tiến độ chi tiết, dừng tiến trình và thử lại dòng lỗi linh hoạt.</div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsBulkImportModalOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <span>Mở Import File Excel</span>
              <ArrowRight size={15} />
            </Button>
          </div>

          {/* Card 3: Thêm User NCC */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Thêm User Đối Tác NCC
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Tự động hóa Playwright + Tự tăng SĐT
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  Đối tác NCC
                </span>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>• Tự động khởi tạo tài khoản Local (User Type = 0) cho Nhà Cung Cấp.</div>
                <div style={{ marginTop: '4px' }}>• <strong>Tự động tăng số điện thoại (+2)</strong> tránh trùng lặp dữ liệu trên IAM.</div>
                <div style={{ marginTop: '4px' }}>• <strong>Tự động gán 4 quyền mặc định NCC</strong>: GChecklist, PoPortal, E-Bidding, SSO OTP Client.</div>
                <div style={{ marginTop: '4px' }}>• Sinh mật khẩu ngẫu nhiên an toàn và tạo sẵn mẫu tin nhắn gửi đối tác.</div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleOpenCreateNccModal}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <span>+ Thêm Mới User NCC</span>
              <ArrowRight size={15} />
            </Button>
          </div>

          {/* Card 4: Phân Quyền User */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Phân Quyền User & Clients
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Quyền mặc định + List tài khoản
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  Hàng loạt
                </span>
              </div>

              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>• Chọn bộ quyền mẫu: <strong>4 quyền NCC</strong> hoặc <strong>14 quyền GGG nội bộ</strong>.</div>
                <div style={{ marginTop: '4px' }}>• Tùy chọn linh hoạt bật/tắt từng checkbox quyền client theo nhu cầu.</div>
                <div style={{ marginTop: '4px' }}>• Dán danh sách tài khoản (Username, Email hoặc SĐT) để phân quyền đồng loạt.</div>
                <div style={{ marginTop: '4px' }}>• Báo cáo kết quả chi tiết từng dòng kèm nút tải file Excel (.xlsx).</div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsBatchAssignModalOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
              }}
            >
              <span>Mở Phân Quyền User</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </div>
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
                <strong>0 - Local</strong>
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
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                      textDecoration: 'underline',
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
                                backgroundColor: 'var(--color-primary-light)',
                                color: 'var(--text-primary)',
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
                border: '1px solid var(--border-color)',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '19px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '1px',
                }}
              >
                {nccResultData?.password}
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCopyNccPassword}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
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
              style={{ minWidth: '110px' }}
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

        }}
      />

      {/* Modal Xử Lý Hàng Loạt Dạng Paste (Đổi Pass / Khóa TK) */}
      <SsoBatchPasteModal
        isOpen={isBatchPasteModalOpen}
        onClose={() => setIsBatchPasteModalOpen(false)}
        initialAction={batchPasteAction}
        onSuccess={() => {

        }}
      />
      {/* --- MODAL PHÂN QUYỀN USER & CLIENTS HÀNG LOẠT --- */}
      <SsoBatchAssignModal
        isOpen={isBatchAssignModalOpen}
        onClose={() => setIsBatchAssignModalOpen(false)}
      />
    </div>
  );
};
export default SsoManagementPage;
