import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Users,
  Check,
  Search,
  Save,
  RefreshCw,
  Info,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { hotlineService } from '../../services/hotlineService';
import {
  HotlinePermissionsConfig,
  HotlineAvailableUser,
  HotlineAvailableRole,
} from '../../types/hotline';

interface HotlinePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const HotlinePermissionsModal: React.FC<HotlinePermissionsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data from backend
  const [config, setConfig] = useState<HotlinePermissionsConfig>({
    enabled_roles: ['admin', 'helpdesk'],
    allowed_users: ['dung.nguyenanh', 'admin'],
    allow_all: false,
  });
  const [availableUsers, setAvailableUsers] = useState<HotlineAvailableUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<HotlineAvailableRole[]>([
    { code: 'admin', label: 'Quản trị viên (Admin)' },
    { code: 'helpdesk', label: 'IT Helpdesk (Hỗ trợ IT)' },
    { code: 'app', label: 'IT Application (Quyền App)' },
    { code: 'inventory', label: 'Quyền Inventory (Kiểm kê)' },
  ]);

  // Search filter for users
  const [userSearch, setUserSearch] = useState<string>('');

  const fetchPermissionsData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await hotlineService.getPermissions();
      setConfig(data.config || {
        enabled_roles: ['admin', 'helpdesk'],
        allowed_users: ['dung.nguyenanh', 'admin'],
        allow_all: false,
      });
      setAvailableUsers(data.available_users || []);
      if (data.available_roles && data.available_roles.length > 0) {
        setAvailableRoles(data.available_roles);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Không thể tải cấu hình phân quyền hotline.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchPermissionsData();
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  }, [isOpen, fetchPermissionsData]);

  // Toggle role in enabled_roles
  const handleToggleRole = (roleCode: string) => {
    setConfig((prev) => {
      const current = prev.enabled_roles || [];
      const exists = current.includes(roleCode);
      const updated = exists ? current.filter((r) => r !== roleCode) : [...current, roleCode];
      return { ...prev, enabled_roles: updated };
    });
  };

  // Toggle user in allowed_users
  const handleToggleUser = (username: string) => {
    const clean = username.trim().toLowerCase();
    setConfig((prev) => {
      const current = (prev.allowed_users || []).map((u) => u.trim().toLowerCase());
      const exists = current.includes(clean);
      const updated = exists
        ? (prev.allowed_users || []).filter((u) => u.trim().toLowerCase() !== clean)
        : [...(prev.allowed_users || []), username];
      return { ...prev, allowed_users: updated };
    });
  };

  // Check all / uncheck all filtered users
  const handleSelectAllFilteredUsers = () => {
    const filteredUsernames = filteredUsers.map((u) => u.username);
    setConfig((prev) => {
      const currentSet = new Set((prev.allowed_users || []).map((u) => u.toLowerCase()));
      filteredUsernames.forEach((u) => currentSet.add(u.toLowerCase()));
      return { ...prev, allowed_users: Array.from(currentSet) };
    });
  };

  const handleClearAllFilteredUsers = () => {
    const filteredSet = new Set(filteredUsers.map((u) => u.username.toLowerCase()));
    setConfig((prev) => {
      const updated = (prev.allowed_users || []).filter((u) => !filteredSet.has(u.toLowerCase()));
      return { ...prev, allowed_users: updated };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await hotlineService.savePermissions(config);
      if (res.success) {
        setSuccessMsg('Đã lưu cấu hình phân quyền Trực Hotline 3CX thành công!');
        if (onSaved) onSaved();
        setTimeout(() => {
          setSuccessMsg(null);
        }, 3000);
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Lưu cấu hình phân quyền thất bại.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered users by keyword
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return availableUsers;
    return availableUsers.filter((u) => {
      const name = (u.full_name || '').toLowerCase();
      const user = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || user.includes(q) || email.includes(q);
    });
  }, [availableUsers, userSearch]);

  const allowedUsernamesLower = useMemo(() => {
    return new Set((config.allowed_users || []).map((u) => u.trim().toLowerCase()));
  }, [config.allowed_users]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="780px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-primary)' }}>
              Cài Đặt & Phân Quyền Trực Hotline 3CX
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Chỉ định nhóm quyền và tài khoản nhân viên được phép hiển thị nút Trực Hotline & tiếp nhận cuộc gọi
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Đã cấp quyền: <strong>{config.enabled_roles?.length || 0}</strong> nhóm,{' '}
            <strong>{config.allowed_users?.length || 0}</strong> nhân viên
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Đóng
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || saving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {saving ? <RefreshCw size={15} className="spin-animation" /> : <Save size={15} />}
              <span>{saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Banner Lưu ý Super Admin */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
          }}
        >
          <Info size={18} color="#2563EB" style={{ flexShrink: 0 }} />
          <span>
            <strong>Quy tắc tối cao:</strong> Super Admin và tài khoản <strong>dung.nguyenanh</strong> luôn có toàn quyền trực hotline và quản lý cấu hình phân quyền này.
          </span>
        </div>

        {/* Thông báo kết quả */}
        {successMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#059669',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#DC2626',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Tùy chọn Mở Quyền Cho Tất Cả */}
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '10px',
            border: config.allow_all ? '1px solid #10B981' : '1px solid var(--border-color)',
            backgroundColor: config.allow_all ? 'rgba(16, 185, 129, 0.06)' : 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
              Mở quyền Trực Hotline cho toàn bộ nhân viên (Public)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Khi bật, bất kỳ tài khoản nào đăng nhập vào hệ thống cũng sẽ thấy nút & nhận cuộc gọi trực hotline
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfig((prev) => ({ ...prev, allow_all: !prev.allow_all }))}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: config.allow_all ? '#10B981' : 'var(--border-color)',
              color: config.allow_all ? '#FFFFFF' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s',
            }}
          >
            {config.allow_all ? <Check size={14} /> : null}
            <span>{config.allow_all ? 'ĐANG BẬT' : 'ĐANG TẮT'}</span>
          </button>
        </div>

        {/* KHỐI 1: NHÓM QUYỀN (ROLES) */}
        <div style={{ opacity: config.allow_all ? 0.45 : 1, pointerEvents: config.allow_all ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Shield size={16} color="#3B82F6" />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              1. Nhóm Quyền Được Phép Trực Hotline (Theo Vai Trò)
            </h3>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Tất cả nhân viên thuộc các nhóm quyền được tích chọn bên dưới sẽ tự động thấy nút Trực Hotline
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px',
            }}
          >
            {availableRoles.map((role) => {
              const isChecked = (config.enabled_roles || []).includes(role.code);
              return (
                <div
                  key={role.code}
                  onClick={() => handleToggleRole(role.code)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isChecked ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                    backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      border: isChecked ? '1px solid #2563EB' : '1px solid var(--border-color)',
                      backgroundColor: isChecked ? '#2563EB' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                      {role.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Mã: <code>{role.code}</code>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* KHỐI 2: WHITELIST NHÂN VIÊN CỤ THỂ */}
        <div style={{ opacity: config.allow_all ? 0.45 : 1, pointerEvents: config.allow_all ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} color="#10B981" />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                2. Cấp Quyền Cho Từng Nhân Viên Cụ Thể (Whitelist)
              </h3>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllFilteredUsers}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <UserCheck size={12} />
                <span>Chọn tất cả</span>
              </button>
              <button
                type="button"
                onClick={handleClearAllFilteredUsers}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <UserX size={12} />
                <span>Bỏ chọn</span>
              </button>
            </div>
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Áp dụng cho nhân viên không thuộc nhóm trên hoặc tài khoản đặc cách trực hotline
          </p>

          {/* Ô tìm kiếm nhân viên */}
          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Tìm theo họ tên, username (@dung.nguyenanh) hoặc email..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Danh sách người dùng */}
          <div
            style={{
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-primary)',
            }}
          >
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <RefreshCw size={18} className="spin-animation" style={{ marginBottom: '6px' }} />
                <div>Đang tải danh sách nhân viên...</div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Không tìm thấy nhân viên nào khớp với từ khóa tìm kiếm.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredUsers.map((u, idx) => {
                  const usernameLower = (u.username || '').trim().toLowerCase();
                  const isChecked = allowedUsernamesLower.has(usernameLower);
                  const isImmuneAdmin = ['dung.nguyenanh', 'admin', 'administrator'].includes(usernameLower);

                  return (
                    <div
                      key={u.id || idx}
                      onClick={() => !isImmuneAdmin && handleToggleUser(u.username)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: idx < filteredUsers.length - 1 ? '1px solid var(--border-color)' : 'none',
                        backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isImmuneAdmin ? 'default' : 'pointer',
                        userSelect: 'none',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isChecked || isImmuneAdmin ? '1px solid #10B981' : '1px solid var(--border-color)',
                            backgroundColor: isChecked || isImmuneAdmin ? '#10B981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          {(isChecked || isImmuneAdmin) && <Check size={12} strokeWidth={3} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{u.full_name || u.username}</span>
                            {isImmuneAdmin && (
                              <Badge variant="warning">
                                Super Admin
                              </Badge>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            @{u.username} {u.email ? `• ${u.email}` : ''}
                          </div>
                        </div>
                      </div>

                      {u.phanquyen && (
                        <Badge variant="neutral">
                          Quyền: {u.phanquyen}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
