import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Edit2,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { UserItem, UserCreatePayload, UserUpdatePayload } from '../../types/user';
import { RoleItem } from '../../types/role';
import { userService } from '../../services/userService';
import { roleService } from '../../services/roleService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';

const SYSTEM_ROLES = [
  {
    id: 'admin',
    value: '1',
    label: 'Quản trị viên (Admin)',
    shortLabel: 'Admin',
    description: 'Toàn quyền quản trị hệ thống & phân quyền',
    badgeVariant: 'danger' as const,
  },
  {
    id: 'app',
    value: '2',
    label: 'IT Application (Quyền App)',
    shortLabel: 'IT Application',
    description: 'Memo, PIM, Dự án, Setup NH Mới, Check Món RK7...',
    badgeVariant: 'info' as const,
  },
  {
    id: 'helpdesk',
    value: '3',
    label: 'IT Helpdesk (Hỗ trợ IT)',
    shortLabel: 'IT Helpdesk',
    description: 'Hỗ trợ kỹ thuật nhà hàng & văn phòng (EXT RSC, Code Photo)...',
    badgeVariant: 'primary' as const,
  },
  {
    id: 'inventory',
    value: 'inventory',
    label: 'Quyền Inventory (Kiểm kê)',
    shortLabel: 'Quyền Inventory',
    description: 'Theo Dõi PR - PO - DO, kiểm kê và quản lý vật tư thiết bị...',
    badgeVariant: 'success' as const,
  },
];

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả nhóm quyền' },
  { value: 'admin', label: 'Quản trị viên (Admin)' },
  { value: 'app', label: 'IT Application (Quyền App)' },
  { value: 'helpdesk', label: 'IT Helpdesk (Hỗ trợ IT)' },
  { value: 'inventory', label: 'Quyền Inventory (Kiểm kê)' },
];

const parseUserRoleCodes = (u: UserItem): string[] => {
  if (u.roles && u.roles.length > 0) return u.roles;
  if (!u.phanquyen) return [];
  const parts = u.phanquyen.split(',').map((s) => s.trim().toLowerCase());
  const codes: string[] = [];
  parts.forEach((p) => {
    if ((p === '1' || p === 'admin') && !codes.includes('admin')) codes.push('admin');
    else if ((p === '2' || p === 'app') && !codes.includes('app')) codes.push('app');
    else if ((p === '3' || p === 'helpdesk') && !codes.includes('helpdesk')) codes.push('helpdesk');
    else if ((p === '4' || p === 'inventory' || p === 'inv') && !codes.includes('inventory')) codes.push('inventory');
    else if (p && !codes.includes(p)) codes.push(p);
  });
  return codes;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatErrorMessage = (detail: any, defaultMsg = 'Đã có lỗi xảy ra.'): string => {
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const field = item.loc ? item.loc[item.loc.length - 1] : '';
          const msg = item.msg || JSON.stringify(item);
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('; ');
  }
  if (typeof detail === 'object') {
    return detail.message || detail.detail || JSON.stringify(detail);
  }
  return String(detail);
};

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('active');

  // Notifications
  const [alertInfo, setAlertInfo] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});

  // Multi-role states
  const [createSelectedRoles, setCreateSelectedRoles] = useState<string[]>(['helpdesk']);
  const [editSelectedRoles, setEditSelectedRoles] = useState<string[]>([]);

  // Form states
  const [createForm, setCreateForm] = useState<UserCreatePayload>({
    username: '',
    password: '',
    full_name: '',
    email: '',
    manv: '',
    phanquyen: '3',
    quyen_mo_rong: '0',
    active: true,
  });

  const [editForm, setEditForm] = useState<UserUpdatePayload>({
    full_name: '',
    email: '',
    manv: '',
    phanquyen: '3',
    quyen_mo_rong: '0',
    active: true,
  });

  const [newPassword, setNewPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const toggleCreateRole = (roleId: string) => {
    setCreateSelectedRoles((prev) => {
      const exists = prev.includes(roleId);
      const next = exists ? prev.filter((r) => r !== roleId) : [...prev, roleId];
      if (createErrors.roles && next.length > 0) {
        setCreateErrors((errs) => ({ ...errs, roles: '' }));
      }
      return next;
    });
  };

  const toggleEditRole = (roleId: string) => {
    setEditSelectedRoles((prev) => {
      const exists = prev.includes(roleId);
      const next = exists ? prev.filter((r) => r !== roleId) : [...prev, roleId];
      if (editErrors.roles && next.length > 0) {
        setEditErrors((errs) => ({ ...errs, roles: '' }));
      }
      return next;
    });
  };

  const renderRoleBadges = (u: UserItem) => {
    const codes = parseUserRoleCodes(u);
    if (codes.length === 0) {
      return <Badge variant="neutral">{u.role_name || 'Chưa phân nhóm'}</Badge>;
    }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {codes.map((code) => {
          const matched = SYSTEM_ROLES.find((r) => r.id === code || r.value === code);
          if (matched) {
            return (
              <Badge key={code} variant={matched.badgeVariant}>
                {matched.shortLabel}
              </Badge>
            );
          }
          return (
            <Badge key={code} variant="neutral">
              {code}
            </Badge>
          );
        })}
      </div>
    );
  };

  // Fetch roles list for dropdown
  const loadRoles = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data);
    } catch {
      // Ignore
    }
  };

  // Fetch users with filters
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const activeParam = filterActive === 'all' ? undefined : filterActive === 'active';
      const res = await userService.getUsers({
        search: searchTerm || undefined,
        phanquyen: filterRole || undefined,
        active: activeParam,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: formatErrorMessage(err.response?.data?.detail, 'Không thể tải danh sách người dùng.'),
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterRole, filterActive]);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  // Open Create Modal
  const openCreateModal = () => {
    setModalError(null);
    setCreateErrors({});
    setCreateSelectedRoles(['helpdesk']);
    setCreateForm({
      username: '',
      password: '',
      full_name: '',
      email: '',
      manv: '',
      phanquyen: '3',
      quyen_mo_rong: '0',
      active: true,
    });
    setIsCreateOpen(true);
  };

  // Handle Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    const errors: Record<string, string> = {};

    const cleanUser = createForm.username.trim();
    const cleanPass = createForm.password.trim();
    const cleanName = createForm.full_name.trim();
    const cleanEmail = (createForm.email || '').trim();

    if (!cleanUser) {
      errors.username = 'Tên đăng nhập không được để trống.';
    } else if (cleanUser.length < 2) {
      errors.username = 'Tên đăng nhập phải có tối thiểu 2 ký tự.';
    } else if (/\s/.test(cleanUser)) {
      errors.username = 'Tên đăng nhập viết liền, không chứa khoảng trắng.';
    }

    if (!cleanPass) {
      errors.password = 'Mật khẩu không được để trống.';
    } else if (cleanPass.length < 4) {
      errors.password = 'Mật khẩu phải có tối thiểu 4 ký tự.';
    }

    if (!cleanName) {
      errors.full_name = 'Họ và tên không được để trống.';
    }

    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Định dạng Email không hợp lệ (Ví dụ: ten.nguyen@ggg.com.vn).';
    }

    if (createSelectedRoles.length === 0) {
      errors.roles = 'Vui lòng chọn ít nhất 1 nhóm quyền cho người dùng.';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      setModalError('Vui lòng kiểm tra và sửa các thông tin có lỗi bên dưới.');
      return;
    }
    setCreateErrors({});

    setFormLoading(true);
    try {
      const canonicalRoles = createSelectedRoles.map((r) => {
        const matched = SYSTEM_ROLES.find((sr) => sr.id === r || sr.value === r);
        return matched ? matched.value : r;
      });
      await userService.createUser({
        ...createForm,
        username: cleanUser,
        password: cleanPass,
        full_name: cleanName,
        email: cleanEmail || undefined,
        manv: (createForm.manv || '').trim() || undefined,
        roles: canonicalRoles,
        phanquyen: canonicalRoles.join(','),
      });

      // Tạo thành công: giữ nguyên ở trang người dùng & quyền, thông báo thành công và load lại bảng
      setAlertInfo({ type: 'success', message: `Đã tạo thành công tài khoản: ${cleanUser} (${cleanName})` });
      setIsCreateOpen(false);
      setCreateSelectedRoles(['helpdesk']);
      setCreateForm({
        username: '',
        password: '',
        full_name: '',
        email: '',
        manv: '',
        phanquyen: '3',
        quyen_mo_rong: '0',
        active: true,
      });
      loadUsers();
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err.response?.data?.detail, 'Thêm người dùng thất bại.');
      setModalError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u: UserItem) => {
    setModalError(null);
    setEditErrors({});
    setSelectedUser(u);
    const parsed = parseUserRoleCodes(u);
    setEditSelectedRoles(parsed.length > 0 ? parsed : ['helpdesk']);
    setEditForm({
      full_name: u.full_name || '',
      email: u.email || '',
      manv: u.manv || '',
      phanquyen: u.phanquyen || '3',
      quyen_mo_rong: u.quyen_mo_rong || '0',
      active: u.active,
    });
    setIsEditOpen(true);
  };

  // Handle Update User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!selectedUser) return;
    const errors: Record<string, string> = {};

    const cleanName = editForm.full_name.trim();
    const cleanEmail = (editForm.email || '').trim();

    if (!cleanName) {
      errors.full_name = 'Họ và tên không được để trống.';
    }

    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Định dạng Email không hợp lệ (Ví dụ: ten.nguyen@ggg.com.vn).';
    }

    if (editSelectedRoles.length === 0) {
      errors.roles = 'Vui lòng chọn ít nhất 1 nhóm quyền cho người dùng.';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      setModalError('Vui lòng kiểm tra và sửa các thông tin có lỗi bên dưới.');
      return;
    }
    setEditErrors({});

    setFormLoading(true);
    try {
      const canonicalRoles = editSelectedRoles.map((r) => {
        const matched = SYSTEM_ROLES.find((sr) => sr.id === r || sr.value === r);
        return matched ? matched.value : r;
      });
      await userService.updateUser(selectedUser.id, {
        ...editForm,
        full_name: cleanName,
        email: cleanEmail || undefined,
        manv: (editForm.manv || '').trim() || undefined,
        roles: canonicalRoles,
        phanquyen: canonicalRoles.join(','),
      });
      setAlertInfo({ type: 'success', message: `Đã cập nhật thông tin người dùng: ${selectedUser.username}` });
      setIsEditOpen(false);
      loadUsers();
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err.response?.data?.detail, 'Cập nhật thất bại.');
      setModalError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Open Reset Pass Modal
  const openResetPassModal = (u: UserItem) => {
    setModalError(null);
    setResetErrors({});
    setSelectedUser(u);
    setNewPassword('');
    setIsResetPassOpen(true);
  };

  // Handle Reset Pass
  const handleResetPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!selectedUser) return;
    const errors: Record<string, string> = {};

    const cleanPass = newPassword.trim();
    if (!cleanPass) {
      errors.password = 'Mật khẩu mới không được để trống.';
    } else if (cleanPass.length < 4) {
      errors.password = 'Mật khẩu mới phải có tối thiểu 4 ký tự.';
    }

    if (Object.keys(errors).length > 0) {
      setResetErrors(errors);
      setModalError('Vui lòng kiểm tra lại mật khẩu bên dưới.');
      return;
    }
    setResetErrors({});

    setFormLoading(true);
    try {
      await userService.resetPassword(selectedUser.id, cleanPass);
      setAlertInfo({ type: 'success', message: `Đã đổi mật khẩu cho tài khoản: ${selectedUser.username}` });
      setIsResetPassOpen(false);
    } catch (err: any) {
      const errorMsg = formatErrorMessage(err.response?.data?.detail, 'Đổi mật khẩu thất bại.');
      setModalError(errorMsg);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (u: UserItem) => {
    const actionText = u.active ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản "${u.username}" không?`)) {
      return;
    }
    try {
      await userService.toggleStatus(u.id, !u.active);
      setAlertInfo({ type: 'success', message: `Đã ${actionText} thành công tài khoản: ${u.username}` });
      loadUsers();
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.detail || 'Thao tác thất bại.' });
    }
  };

  // Lọc chỉ hiển thị các nhóm quyền mở rộng đang Hoạt động (active) khi tạo mới
  const createRoleOptions = useMemo(() => [
    { value: '0', label: '0 - Mặc định (Không gán)' },
    ...roles
      .filter((r) => r.active)
      .map((r) => ({ value: String(r.id), label: `${r.id} - ${r.tenquyen || 'Nhóm ' + r.id}` })),
  ], [roles]);

  // Khi chỉnh sửa: Chỉ hiển thị các nhóm đang Hoạt động; nếu user đang giữ nhóm bị khóa thì hiển thị kèm nhãn (Tạm khóa)
  const editRoleOptions = useMemo(() => [
    { value: '0', label: '0 - Mặc định (Không gán)' },
    ...roles
      .filter((r) => r.active || String(r.id) === String(editForm.quyen_mo_rong))
      .map((r) => ({
        value: String(r.id),
        label: `${r.id} - ${r.tenquyen || 'Nhóm ' + r.id}${!r.active ? ' (Tạm khóa)' : ''}`,
      })),
  ], [roles, editForm.quyen_mo_rong]);

  return (
    <div className="page-container-fullheight" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflow: 'hidden' }}>
      {/* Alert notification */}
      {alertInfo && (
        <div style={{ flexShrink: 0 }}>
          <Alert
            type={alertInfo.type}
            message={alertInfo.message}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}

      {/* Top Toolbar */}
      <Card style={{ flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Search and Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div style={{ width: '280px' }}>
              <Input
                placeholder="Tìm tên, user, email, manv..."
                leftIcon={<Search size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ width: '190px' }}>
              <Select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                options={ROLE_FILTER_OPTIONS}
              />
            </div>

            <div style={{ width: '170px' }}>
              <Select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                options={[
                  { value: 'active', label: 'Đang hoạt động (On)' },
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'inactive', label: 'Đã bị khóa (Off)' },
                ]}
              />
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={loadUsers}
              isLoading={loading}
              leftIcon={<RefreshCw size={14} />}
              title="Tải lại danh sách"
            >
              Tải lại
            </Button>
          </div>

          {/* Create Button */}
          <Button
            variant="primary"
            size="md"
            onClick={openCreateModal}
            leftIcon={<UserPlus size={16} />}
          >
            Thêm Người Dùng
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card padding="none" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-secondary)' }}>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                <th style={{ padding: '12px 16px', width: '50px' }}>ID</th>
                <th style={{ padding: '12px 16px' }}>Tên Đăng Nhập</th>
                <th style={{ padding: '12px 16px' }}>Họ Và Tên</th>
                <th style={{ padding: '12px 16px' }}>Mã NV</th>
                <th style={{ padding: '12px 16px' }}>Email</th>
                <th style={{ padding: '12px 16px' }}>Nhóm Quyền</th>
                <th style={{ padding: '12px 16px' }}>Quyền Mở Rộng</th>
                <th style={{ padding: '12px 16px', width: '110px' }}>Trạng Thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '140px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải danh sách người dùng từ SQL Server test...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không tìm thấy người dùng nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.id}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                      {u.full_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {u.manv || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {u.email || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {renderRoleBadges(u)}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                      {u.role_level_name ? (
                        <span style={{ fontWeight: 500 }}>{u.role_level_name}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Mặc định</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.active ? (
                        <Badge variant="success" icon={<CheckCircle2 size={12} />}>
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="danger">Đã khóa</Badge>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="Chỉnh sửa thông tin"
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            display: 'flex',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openResetPassModal(u)}
                          title="Đổi / Reset mật khẩu"
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px',
                            cursor: 'pointer',
                            color: 'var(--color-primary-text)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            display: 'flex',
                          }}
                        >
                          <Key size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          title={u.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px',
                            cursor: 'pointer',
                            color: u.active ? 'var(--color-error)' : 'var(--color-success)',
                            display: 'flex',
                          }}
                        >
                          {u.active ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span>Tổng số tài khoản: <strong>{total}</strong></span>
          <span>Dữ liệu từ bảng <code>dbo.LIST_USER</code> (Server Test 172.16.20.103)</span>
        </div>
      </Card>

      {/* Modal: Thêm người dùng mới */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !formLoading && setIsCreateOpen(false)}
        title="Thêm Người Dùng Mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={formLoading}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} isLoading={formLoading}>
              Lưu Người Dùng
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {modalError && <Alert type="error" message={modalError} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Tên đăng nhập *"
              placeholder="VD: nam.nguyen"
              value={createForm.username}
              onChange={(e) => {
                setCreateForm({ ...createForm, username: e.target.value });
                if (createErrors.username) setCreateErrors({ ...createErrors, username: '' });
              }}
              helperText="Tối thiểu 2 ký tự, viết liền không dấu cách"
              error={createErrors.username}
              required
            />
            <Input
              label="Mật khẩu *"
              type="password"
              placeholder="Nhập mật khẩu"
              showPasswordToggle
              value={createForm.password}
              onChange={(e) => {
                setCreateForm({ ...createForm, password: e.target.value });
                if (createErrors.password) setCreateErrors({ ...createErrors, password: '' });
              }}
              helperText="Tối thiểu 4 ký tự (ví dụ: 1234a@)"
              error={createErrors.password}
              required
            />
          </div>

          <Input
            label="Họ và tên *"
            placeholder="VD: Nguyễn Văn Nam"
            value={createForm.full_name}
            onChange={(e) => {
              setCreateForm({ ...createForm, full_name: e.target.value });
              if (createErrors.full_name) setCreateErrors({ ...createErrors, full_name: '' });
            }}
            helperText="Họ và tên đầy đủ của nhân sự"
            error={createErrors.full_name}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Mã nhân viên (MANV)"
              placeholder="VD: GGG1234"
              value={createForm.manv || ''}
              onChange={(e) => setCreateForm({ ...createForm, manv: e.target.value })}
              helperText="Mã nhân sự nội bộ (tùy chọn)"
            />
            <Input
              label="Email"
              type="email"
              placeholder="VD: nam.nguyen@ggg.com.vn"
              value={createForm.email || ''}
              onChange={(e) => {
                setCreateForm({ ...createForm, email: e.target.value });
                if (createErrors.email) setCreateErrors({ ...createErrors, email: '' });
              }}
              helperText="Định dạng chuẩn: name@domain.com (tùy chọn)"
              error={createErrors.email}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Phân nhóm quyền nghiệp vụ *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {SYSTEM_ROLES.map((role) => {
                const isChecked = createSelectedRoles.includes(role.id) || createSelectedRoles.includes(role.value);
                return (
                  <label
                    key={role.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: isChecked ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isChecked ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCreateRole(role.id)}
                      style={{ accentColor: 'var(--color-primary)', marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {role.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                        {role.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: createErrors.roles ? 'var(--color-error)' : 'var(--text-muted)',
                marginTop: '6px',
                fontWeight: createErrors.roles ? 500 : 400,
              }}
            >
              {createErrors.roles || '💡 Một tài khoản có thể được phân nhiều nhóm quyền cùng lúc (ví dụ: vừa Helpdesk vừa Inventory).'}
            </div>
          </div>

          <div>
            <Select
              label="Nhóm quyền mở rộng (Chi tiết quyền cột & hạ tầng)"
              value={createForm.quyen_mo_rong || '0'}
              onChange={(e) => setCreateForm({ ...createForm, quyen_mo_rong: e.target.value })}
              options={createRoleOptions}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span>Kích hoạt tài khoản ngay khi tạo</span>
          </label>
        </form>
      </Modal>

      {/* Modal: Chỉnh sửa người dùng */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => !formLoading && setIsEditOpen(false)}
        title={`Chỉnh Sửa Người Dùng: ${selectedUser?.username}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)} disabled={formLoading}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleEditSubmit} isLoading={formLoading}>
              Lưu Thay Đổi
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {modalError && <Alert type="error" message={modalError} />}
          <Input
            label="Họ và tên *"
            value={editForm.full_name}
            onChange={(e) => {
              setEditForm({ ...editForm, full_name: e.target.value });
              if (editErrors.full_name) setEditErrors({ ...editErrors, full_name: '' });
            }}
            helperText="Họ và tên đầy đủ của nhân sự"
            error={editErrors.full_name}
            required
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input
              label="Mã nhân viên (MANV)"
              value={editForm.manv || ''}
              onChange={(e) => setEditForm({ ...editForm, manv: e.target.value })}
              helperText="Mã nhân sự nội bộ (tùy chọn)"
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email || ''}
              onChange={(e) => {
                setEditForm({ ...editForm, email: e.target.value });
                if (editErrors.email) setEditErrors({ ...editErrors, email: '' });
              }}
              helperText="Định dạng chuẩn: name@domain.com (tùy chọn)"
              error={editErrors.email}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Phân nhóm quyền nghiệp vụ *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {SYSTEM_ROLES.map((role) => {
                const isChecked = editSelectedRoles.includes(role.id) || editSelectedRoles.includes(role.value);
                return (
                  <label
                    key={role.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: isChecked ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                      backgroundColor: isChecked ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleEditRole(role.id)}
                      style={{ accentColor: 'var(--color-primary)', marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {role.label}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
                        {role.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: editErrors.roles ? 'var(--color-error)' : 'var(--text-muted)',
                marginTop: '6px',
                fontWeight: editErrors.roles ? 500 : 400,
              }}
            >
              {editErrors.roles || '💡 Một tài khoản có thể được phân nhiều nhóm quyền cùng lúc (ví dụ: vừa Helpdesk vừa Inventory).'}
            </div>
          </div>

          <div>
            <Select
              label="Nhóm quyền mở rộng (Chi tiết quyền cột & hạ tầng)"
              value={editForm.quyen_mo_rong || '0'}
              onChange={(e) => setEditForm({ ...editForm, quyen_mo_rong: e.target.value })}
              options={editRoleOptions}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={editForm.active}
              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span>Tài khoản đang hoạt động (Active)</span>
          </label>
        </form>
      </Modal>

      {/* Modal: Đổi / Reset mật khẩu */}
      <Modal
        isOpen={isResetPassOpen}
        onClose={() => !formLoading && setIsResetPassOpen(false)}
        title={`Đổi Mật Khẩu: ${selectedUser?.username}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsResetPassOpen(false)} disabled={formLoading}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleResetPassSubmit} isLoading={formLoading}>
              Cập Nhật Mật Khẩu
            </Button>
          </>
        }
      >
        <form onSubmit={handleResetPassSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {modalError && <Alert type="error" message={modalError} />}
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Bạn đang cập nhật mật khẩu mới cho tài khoản <strong>{selectedUser?.username}</strong> ({selectedUser?.full_name}).
          </p>
          <Input
            label="Mật khẩu mới *"
            type="password"
            placeholder="Nhập mật khẩu mới"
            showPasswordToggle
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              if (resetErrors.password) setResetErrors({ ...resetErrors, password: '' });
            }}
            helperText="Yêu cầu tối thiểu 4 ký tự"
            error={resetErrors.password}
            required
            autoFocus
          />
        </form>
      </Modal>
    </div>
  );
};
