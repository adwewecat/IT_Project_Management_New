import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  KeyRound,
  RefreshCw,
  Save,
  Users,
  Search,
  PlusCircle,
  Eye,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { RoleItem, RoleCreatePayload, PermissionDetailItem } from '../../types/role';
import { roleService } from '../../services/roleService';
import { useAuth } from '../../contexts/AuthContext';
import { checkIsSuperAdmin } from '../../utils/authUtils';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';

const BASE_LABELS: Record<string, { label: string; module: string }> = {
  // DS Nhà Hàng: Thông Tin Cơ Bản
  res: { label: 'Tên Nhà Hàng (res)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  trangthai: { label: 'Trạng Thái Hoạt Động (trangthai)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  sdt_nh: { label: 'Số Điện Thoại (sdt_nh)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  email_nh: { label: 'Email Nhà Hàng (email)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  address: { label: 'Địa Chỉ (address)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  region: { label: 'Khu Vực (region)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  brand: { label: 'Thương Hiệu (brand)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  note_nh: { label: 'Ghi Chú (note)', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  ngay_khaitruong: { label: 'Ngày Khai Trương', module: 'DS Nhà Hàng: Thông Tin Cơ Bản' },

  // DS Nhà Hàng: Mã SAP & Kế Toán
  sap: { label: 'Mã SAP (sap)', module: 'DS Nhà Hàng: Mã SAP & Kế Toán' },
  coscenter: { label: 'Cost Center (coscenter)', module: 'DS Nhà Hàng: Mã SAP & Kế Toán' },
  rk7: { label: 'Mã POS RK7 (rk7)', module: 'DS Nhà Hàng: Mã SAP & Kế Toán' },
  oracale: { label: 'Oracle (oracale)', module: 'DS Nhà Hàng: Mã SAP & Kế Toán' },
  sap_old: { label: 'Mã SAP Cũ (sap_old)', module: 'DS Nhà Hàng: Mã SAP & Kế Toán' },
  don_gia: { label: 'Đơn Giá (don_gia)', module: 'DS Nhà Hàng: Mã SAP & Kế Toán' },

  // DS Nhà Hàng: Remote & Máy Trạm
  ip_lan: { label: 'IP Nội Bộ LAN (ip)', module: 'DS Nhà Hàng: Remote & Máy Trạm' },
  teamview_pc: { label: 'TeamViewer PC', module: 'DS Nhà Hàng: Remote & Máy Trạm' },
  teamview_pos11: { label: 'TeamViewer POS 11', module: 'DS Nhà Hàng: Remote & Máy Trạm' },
  teamview_pos12: { label: 'TeamViewer POS 12', module: 'DS Nhà Hàng: Remote & Máy Trạm' },
  rustdesk_pos11: { label: 'RustDesk POS 11', module: 'DS Nhà Hàng: Remote & Máy Trạm' },
  rustdesk_pos12: { label: 'RustDesk POS 12', module: 'DS Nhà Hàng: Remote & Máy Trạm' },

  // DS Nhà Hàng: Hạ Tầng Mạng & FTTH
  ipwan: { label: 'Hạ Tầng IP WAN (ip_wan)', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  user_ftth: { label: 'Tài Khoản FTTH', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  pass_ftth: { label: 'Mật Khẩu FTTH', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  ngay_online_ftth: { label: 'Ngày Online FTTH', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  thanhtoan_ftth: { label: 'Hình Thức Thanh Toán FTTH', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  dk_truyenthong: { label: 'ĐK Truyền Thông', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  pass_mail: { label: 'Mật Khẩu Mail Nhà Hàng', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  pass_ou_ko_sys: { label: 'Mật Khẩu OU (Không sys)', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  ext: { label: 'Số Máy Lẻ (EXT Nhà Hàng)', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  sys_sales: { label: 'Sys Sales', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  ftth: { label: 'Đường Truyền FTTH (Nhóm gộp)', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  sys: { label: 'Server POS / Pass OU Sys (Nhóm gộp)', module: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },

  // Văn Phòng: Máy Photo & Ext
  code_photo: { label: 'Mã Máy Photo', module: 'Văn Phòng: Máy Photo & Ext' },
  ext_rsc: { label: 'Số Máy Nhánh Ext RSC Văn Phòng', module: 'Văn Phòng: Máy Photo & Ext' },

  // Hệ Thống: Dịch Vụ Máy Trạm & Điều Khiển Từ Xa (Chỉ Super Admin mới thấy dòng này để phân quyền)
  agent_multitask: { label: 'Quyền Quản Lý & Điều Khiển Agent Multitask', module: 'Hệ Thống: Dịch Vụ Máy Trạm & Điều Khiển Từ Xa' },

  // Màn Hình & Phân Hệ Mới (Mặc định chỉ Admin thấy, Admin có thể phân quyền cho nhóm khác khi cần)
  remote_desktop_lab: { label: 'Màn Hình: Thay Thế Remote (Remote Desktop Lab)', module: 'Màn Hình & Phân Hệ Mới' },
};

const PRESET_MODULE_OPTIONS = [
  { value: 'DS Nhà Hàng: Thông Tin Cơ Bản', label: 'DS Nhà Hàng: Thông Tin Cơ Bản' },
  { value: 'DS Nhà Hàng: Mã SAP & Kế Toán', label: 'DS Nhà Hàng: Mã SAP & Kế Toán' },
  { value: 'DS Nhà Hàng: Remote & Máy Trạm', label: 'DS Nhà Hàng: Remote & Máy Trạm' },
  { value: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH', label: 'DS Nhà Hàng: Hạ Tầng Mạng & FTTH' },
  { value: 'Văn Phòng: Máy Photo & Ext', label: 'Văn Phòng: Máy Photo & Ext' },
  { value: 'Màn Hình & Phân Hệ Mới', label: 'Màn Hình & Phân Hệ Mới' },
  { value: 'Hệ Thống: Dịch Vụ Máy Trạm & Điều Khiển Từ Xa', label: 'Hệ Thống: Dịch Vụ Máy Trạm & Điều Khiển Từ Xa' },
  { value: 'Cột Tùy Biến Bổ Sung', label: 'Cột Tùy Biến Bổ Sung' },
];

interface FeatureRow {
  baseKey: string;
  label: string;
  moduleGroup: string;
  viewPerm?: PermissionDetailItem;
  updatePerm?: PermissionDetailItem;
  insertPerm?: PermissionDetailItem;
}

export const RolesPage: React.FC = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected role for permission matrix
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const isSuperAdminUser = checkIsSuperAdmin(user);
  const isSuperAdminRole = selectedRole?.id === 1 || selectedRole?.tenquyen?.toUpperCase() === 'ADMINISTRATOR';
  const [permissions, setPermissions] = useState<PermissionDetailItem[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permSaving, setPermSaving] = useState(false);

  // Search permissions query
  const [searchPerm, setSearchPerm] = useState('');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleItem | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState<RoleCreatePayload>({
    tenquyen: '',
    noidung: '',
    active: true,
  });

  const [editForm, setEditForm] = useState<{ noidung: string; active: boolean }>({
    noidung: '',
    active: true,
  });

  const [customForm, setCustomForm] = useState({
    columnKey: '',
    columnLabel: '',
    moduleGroup: 'DS Nhà Hàng: Thông Tin Cơ Bản',
    createView: true,
    createUpdate: true,
    createInsert: false,
    applyAllRoles: true,
    createDbColumn: true,
    dbDataType: 'NVARCHAR(255)',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Visible roles: Normal users (roles 1, 2, 3, 4) DO NOT see Super Admin (Administrator)
  const visibleRoles = useMemo(() => {
    return roles.filter((r) => isSuperAdminUser ? true : (r.id !== 1 && r.tenquyen?.toUpperCase() !== 'ADMINISTRATOR'));
  }, [roles, isSuperAdminUser]);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await roleService.getRoles();
      setRoles(data);
      const available = data.filter((r) => isSuperAdminUser ? true : (r.id !== 1 && r.tenquyen?.toUpperCase() !== 'ADMINISTRATOR'));
      if (available.length > 0 && !selectedRole) {
        selectRoleForPermissions(available[0]);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể tải danh sách nhóm quyền.',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectRoleForPermissions = async (r: RoleItem) => {
    setSelectedRole(r);
    setPermLoading(true);
    try {
      const res = await roleService.getRolePermissions(r.id);
      setPermissions(res.permissions);
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể tải chi tiết phân quyền.',
      });
    } finally {
      setPermLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  // Handle Create Role
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.tenquyen.trim()) {
      setAlertInfo({ type: 'error', message: 'Tên nhóm quyền không được để trống.' });
      return;
    }
    setFormLoading(true);
    try {
      const created = await roleService.createRole(createForm);
      setAlertInfo({ type: 'success', message: `Đã tạo thành công nhóm quyền: ${created.tenquyen}` });
      setIsCreateOpen(false);
      setCreateForm({ tenquyen: '', noidung: '', active: true });
      await loadRoles();
      selectRoleForPermissions(created);
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.detail || 'Tạo nhóm quyền thất bại.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Open Edit Role Modal
  const openEditModal = (r: RoleItem) => {
    setEditRole(r);
    setEditForm({
      noidung: r.noidung || '',
      active: r.active,
    });
    setIsEditOpen(true);
  };

  // Handle Edit Role Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole) return;
    setFormLoading(true);
    try {
      const updated = await roleService.updateRole(editRole.id, editForm);
      setAlertInfo({ type: 'success', message: `Đã cập nhật nhóm quyền: ${updated.tenquyen}` });
      setIsEditOpen(false);
      loadRoles();
      if (selectedRole?.id === updated.id) {
        setSelectedRole(updated);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.detail || 'Cập nhật nhóm quyền thất bại.' });
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Add Custom Column Permission (automatically generates view_ and update_)
  const handleAddCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const colKey = customForm.columnKey.trim().toLowerCase();
    const colLabel = customForm.columnLabel.trim();

    if (!colKey || !colLabel) {
      setAlertInfo({ type: 'error', message: 'Vui lòng nhập đầy đủ Mã cột và Tên hiển thị.' });
      return;
    }

    if (!customForm.createView && !customForm.createUpdate && !customForm.createInsert) {
      setAlertInfo({ type: 'error', message: 'Vui lòng chọn ít nhất một loại quyền (Xem hoặc Cập nhật).' });
      return;
    }

    setFormLoading(true);
    try {
      const targetId = customForm.applyAllRoles ? null : selectedRole?.id || null;

      // Pass create_db_column on the first created permission call
      let dbColCreated = false;

      if (customForm.createView) {
        await roleService.addCustomPermission({
          chucnang: `view_${colKey}`,
          action_label: `Xem ${colLabel} (${colKey})`,
          module_group: customForm.moduleGroup,
          target_role_id: targetId,
          create_db_column: customForm.createDbColumn,
          db_data_type: customForm.dbDataType,
        });
        dbColCreated = true;
      }

      if (customForm.createUpdate) {
        await roleService.addCustomPermission({
          chucnang: `update_${colKey}`,
          action_label: `Cập nhật ${colLabel}`,
          module_group: customForm.moduleGroup,
          target_role_id: targetId,
          create_db_column: !dbColCreated ? customForm.createDbColumn : false,
          db_data_type: customForm.dbDataType,
        });
        dbColCreated = true;
      }

      if (customForm.createInsert) {
        await roleService.addCustomPermission({
          chucnang: `insert_${colKey}`,
          action_label: `Thêm mới ${colLabel}`,
          module_group: customForm.moduleGroup,
          target_role_id: targetId,
          create_db_column: !dbColCreated ? customForm.createDbColumn : false,
          db_data_type: customForm.dbDataType,
        });
      }

      setAlertInfo({
        type: 'success',
        message: `Đã thêm thành công cột mới "${colLabel}" (Mã: ${colKey})${customForm.createDbColumn ? ' vào CSDL SQL Server và ' : ' '}vào hệ thống phân quyền!`,
      });
      setIsAddCustomOpen(false);
      setCustomForm({
        columnKey: '',
        columnLabel: '',
        moduleGroup: 'DS Nhà Hàng: Thông Tin Cơ Bản',
        createView: true,
        createUpdate: true,
        createInsert: false,
        applyAllRoles: true,
        createDbColumn: true,
        dbDataType: 'NVARCHAR(255)',
      });

      if (selectedRole) {
        selectRoleForPermissions(selectedRole);
      }
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Không thể thêm cột mới.',
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Toggle single permission checkbox (with support for syncing insertPerm alongside updatePerm)
  const handleTogglePermission = (chucnang?: string, extraChucnang?: string) => {
    if (!chucnang || isSuperAdminRole) return;
    setPermissions((prev) => {
      const target = prev.find((p) => p.chucnang === chucnang);
      const nextActive = target ? !target.active : true;
      return prev.map((p) => {
        if (p.chucnang === chucnang || (extraChucnang && p.chucnang === extraChucnang)) {
          return { ...p, active: nextActive };
        }
        return p;
      });
    });
  };

  // Bulk toggle column type (all view, or all update) for a module
  const handleToggleColumnTypeForModule = (moduleGroup: string, type: 'view' | 'update' | 'insert', makeActive: boolean) => {
    if (isSuperAdminRole) return;
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module_group === moduleGroup) {
          if (p.chucnang.startsWith(`${type}_`)) {
            return { ...p, active: makeActive };
          }
          if (type === 'update' && p.chucnang.startsWith('insert_')) {
            return { ...p, active: makeActive };
          }
        }
        return p;
      })
    );
  };

  // Bulk toggle all currently visible items in search
  const handleToggleVisibleType = (type: 'view' | 'update' | 'all', makeActive: boolean) => {
    if (isSuperAdminRole) return;
    const visibleKeys = new Set(
      filteredFeatureRows.flatMap((row) => {
        const keys: string[] = [];
        if (type === 'all' || type === 'view') {
          if (row.viewPerm) keys.push(row.viewPerm.chucnang);
        }
        if (type === 'all' || type === 'update') {
          if (row.updatePerm) keys.push(row.updatePerm.chucnang);
          if (row.insertPerm) keys.push(row.insertPerm.chucnang);
        }
        if (type === 'all') {
          if (row.insertPerm) keys.push(row.insertPerm.chucnang);
        }
        return keys;
      })
    );

    setPermissions((prev) =>
      prev.map((p) => (visibleKeys.has(p.chucnang) ? { ...p, active: makeActive } : p))
    );
  };

  // Save Permissions Matrix
  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setPermSaving(true);
    try {
      const res = await roleService.updateRolePermissions(selectedRole.id, permissions);
      setPermissions(res.permissions);
      setAlertInfo({
        type: 'success',
        message: `Đã lưu thành công cấu hình phân quyền cho nhóm: ${selectedRole.tenquyen}`,
      });
    } catch (err: any) {
      setAlertInfo({
        type: 'error',
        message: err.response?.data?.detail || 'Lưu phân quyền thất bại.',
      });
    } finally {
      setPermSaving(false);
    }
  };

  // Group raw permissions into structured FeatureRows (Pairing View & Update & Insert)
  const allFeatureRows = useMemo<FeatureRow[]>(() => {
    const map = new Map<string, FeatureRow>();

    for (const p of permissions) {
      let baseKey = p.chucnang;
      let actionType: 'view' | 'update' | 'insert' = 'view';

      if (p.chucnang.startsWith('view_')) {
        baseKey = p.chucnang.substring(5);
        actionType = 'view';
      } else if (p.chucnang.startsWith('update_')) {
        baseKey = p.chucnang.substring(7);
        actionType = 'update';
      } else if (p.chucnang.startsWith('insert_')) {
        baseKey = p.chucnang.substring(7);
        actionType = 'insert';
      }

      if (!map.has(baseKey)) {
        const info = BASE_LABELS[baseKey];
        const label = info ? info.label : (p.action_label ? p.action_label.replace(/^(Xem|Cập nhật|Thêm mới)\s+/i, '') : baseKey);
        const moduleGroup = p.module_group || (info ? info.module : 'Cột Bổ Sung / Tùy Biến');

        map.set(baseKey, {
          baseKey,
          label,
          moduleGroup,
        });
      }

      const row = map.get(baseKey)!;
      if (actionType === 'view') row.viewPerm = p;
      else if (actionType === 'update') row.updatePerm = p;
      else if (actionType === 'insert') row.insertPerm = p;
    }

    return Array.from(map.values());
  }, [permissions]);

  // Filter feature rows by search query
  const filteredFeatureRows = useMemo(() => {
    // NGUYÊN TẮC BẤT DI BẤT DỊCH: Quyền Agent Multitask CHỈ Super Admin mới thấy dòng này để phân quyền!
    // Các tài khoản khác kể cả Admin thường khi vào xem phân quyền thì HOÀN TOÀN ẨN dòng này để tránh lộ!
    const availableRows = isSuperAdminUser
      ? allFeatureRows
      : allFeatureRows.filter(
          (r) =>
            r.baseKey !== 'agent_multitask' &&
            !r.moduleGroup.includes('Agent Multitask') &&
            !r.moduleGroup.includes('Dịch Vụ Máy Trạm')
        );

    if (!searchPerm.trim()) return availableRows;
    const term = searchPerm.trim().toLowerCase();
    return availableRows.filter(
      (r) =>
        r.label.toLowerCase().includes(term) ||
        r.baseKey.toLowerCase().includes(term) ||
        r.moduleGroup.toLowerCase().includes(term)
    );
  }, [allFeatureRows, searchPerm, isSuperAdminUser]);

  // Group filtered feature rows by moduleGroup
  const groupedFeatureRows = useMemo(() => {
    return filteredFeatureRows.reduce<Record<string, FeatureRow[]>>((acc, row) => {
      if (!acc[row.moduleGroup]) acc[row.moduleGroup] = [];
      acc[row.moduleGroup].push(row);
      return acc;
    }, {});
  }, [filteredFeatureRows]);

  const totalPermissionsCount = permissions.length;
  const activePermissionsCount = isSuperAdminRole ? totalPermissionsCount : permissions.filter((p) => p.active).length;
  const activeColumnsCount = isSuperAdminRole ? allFeatureRows.length : allFeatureRows.filter(
    (r) => (r.viewPerm?.active || r.updatePerm?.active)
  ).length;

  return (
    <div>
      {/* Alert notification */}
      {alertInfo && (
        <div style={{ marginBottom: '18px' }}>
          <Alert
            type={alertInfo.type}
            message={alertInfo.message}
            onClose={() => setAlertInfo(null)}
          />
        </div>
      )}

      {/* Main Grid: Left is Roles List, Right is Permissions Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 350px) 1fr', gap: '20px' }}>
        {/* LEFT: Roles list */}
        <div>
          <Card padding="none" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Nhóm Quyền
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={loadRoles}
                  isLoading={loading}
                  leftIcon={<RefreshCw size={12} />}
                  title="Tải lại"
                >
                  Tải lại
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  leftIcon={<Plus size={14} />}
                >
                  Thêm Nhóm
                </Button>
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {visibleRoles.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Đang nạp danh sách nhóm quyền từ CSDL test...
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visibleRoles.map((r) => {
                    const isSelected = selectedRole?.id === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => selectRoleForPermissions(r)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                          backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: isSelected ? 'var(--color-primary-text)' : 'var(--text-primary)',
                            }}
                          >
                            {r.tenquyen}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Badge variant={r.active ? 'success' : 'neutral'}>
                              {r.active ? 'Hoạt động' : 'Tạm khóa'}
                            </Badge>
                            {r.id !== 1 && r.tenquyen?.toUpperCase() !== 'ADMINISTRATOR' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(r);
                                }}
                                title="Sửa nhóm quyền"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--text-muted)',
                                  padding: '2px',
                                  display: 'flex',
                                }}
                              >
                                <Edit2 size={14} />
                              </button>
                            ) : (
                              <span title="Nhóm được bảo vệ bất biến" style={{ color: 'var(--color-primary-text)', display: 'flex' }}>
                                <Lock size={13} />
                              </span>
                            )}
                          </div>
                        </div>

                        {r.noidung && (
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {r.noidung}
                          </p>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          <span>Mã nhóm: #{r.id}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={12} /> {r.user_count} tài khoản
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT: Permissions Matrix in Clean Table Rows */}
        <div>
          <Card padding="none" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Ma Trận Phân Quyền Chi Tiết (1 Dòng / Cột)
                  </h3>
                  {selectedRole && (
                    <Badge variant={isSuperAdminRole ? 'success' : 'primary'}>
                      {isSuperAdminRole
                        ? `Toàn Quyền Hệ Thống (${totalPermissionsCount}/${totalPermissionsCount})`
                        : `${activePermissionsCount} / ${totalPermissionsCount} quyền (${activeColumnsCount} / ${allFeatureRows.length} cột đã bật)`}
                    </Badge>
                  )}
                </div>
                {selectedRole && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {isSuperAdminRole ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                        ★ Nhóm Administrator: Luôn có toàn quyền mặc định và được bảo vệ bất biến
                      </span>
                    ) : (
                      <>
                        Đang cấu hình cho nhóm: <strong>{selectedRole.tenquyen}</strong> (Mã #{selectedRole.id})
                      </>
                    )}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isSuperAdminUser && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setIsAddCustomOpen(true)}
                    leftIcon={<PlusCircle size={15} />}
                    title="Bổ sung cột mới trong danh sách nhà hàng hoặc tính năng mới"
                  >
                    + Thêm Cột / Chức Năng
                  </Button>
                )}

                {selectedRole && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSavePermissions}
                    isLoading={permSaving}
                    disabled={isSuperAdminRole}
                    leftIcon={isSuperAdminRole ? <Lock size={16} /> : <Save size={16} />}
                    title={isSuperAdminRole ? "Nhóm Administrator luôn có toàn quyền và được bảo vệ bất biến" : "Lưu Phân Quyền"}
                  >
                    {isSuperAdminRole ? "Được Bảo Vệ (Toàn Quyền)" : "Lưu Phân Quyền"}
                  </Button>
                )}
              </div>
            </div>

            {/* Search Filter Toolbar */}
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ width: '380px' }}>
                <Input
                  placeholder="Tìm theo tên cột (VD: res, sap, sdt, rk7, teamview, ftth...)"
                  leftIcon={<Search size={16} />}
                  value={searchPerm}
                  onChange={(e) => setSearchPerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Hiển thị: <strong>{filteredFeatureRows.length}</strong> cột
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleVisibleType('view', true)}
                  disabled={isSuperAdminRole}
                  leftIcon={<Eye size={13} />}
                  title="Bật tất cả quyền XEM cho các cột đang hiển thị"
                >
                  Bật Xem
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleVisibleType('update', true)}
                  disabled={isSuperAdminRole}
                  leftIcon={<Check size={13} />}
                  title="Bật tất cả quyền CẬP NHẬT cho các cột đang hiển thị"
                >
                  Bật Cập Nhật
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleVisibleType('all', false)}
                  disabled={isSuperAdminRole}
                  leftIcon={<X size={13} />}
                  title="Tắt tất cả quyền cho các cột đang hiển thị"
                >
                  Bỏ Chọn
                </Button>
              </div>
            </div>

            {/* Matrix Body: 1 ROW PER COLUMN/FEATURE */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {isSuperAdminRole && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-primary-subtle)',
                    border: '1px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <Shield size={24} color="var(--color-primary-text)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: 'var(--color-primary-text)', fontSize: '14px', display: 'block' }}>
                      Nhóm Administrator là Nhóm Quản Trị Hệ Thống - Được Bảo Vệ Bất Biến
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Nhóm này mặc định sở hữu 100% quyền hạn trên mọi tính năng và dữ liệu của toàn bộ hệ thống. Quyền của Administrator không thể bị hạ cấp, chỉnh sửa hoặc can thiệp bởi bất kỳ ai.
                    </span>
                  </div>
                </div>
              )}

              {permLoading ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Đang tải ma trận phân quyền từ bảng dbo.PHANQUYEN_DETAIL...
                </p>
              ) : !selectedRole ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Vui lòng chọn một nhóm quyền ở cột bên trái để thiết lập quyền.
                </p>
              ) : Object.keys(groupedFeatureRows).length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Không tìm thấy cột hoặc chức năng nào khớp với từ khóa "{searchPerm}".
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {Object.entries(groupedFeatureRows).map(([moduleGroup, rows]) => {
                    const viewCount = rows.filter((r) => r.viewPerm?.active).length;
                    const updateCount = rows.filter((r) => r.updatePerm?.active).length;

                    return (
                      <div
                        key={moduleGroup}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          backgroundColor: 'var(--bg-primary)',
                        }}
                      >
                        {/* Group Header */}
                        <div
                          style={{
                            backgroundColor: 'var(--bg-secondary)',
                            padding: '10px 16px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {moduleGroup}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'var(--color-primary-subtle)',
                                border: '1px solid var(--color-primary)',
                                color: 'var(--color-primary-text)',
                                fontWeight: 600,
                              }}
                            >
                              {rows.length} cột ({viewCount} Xem / {updateCount} Sửa)
                            </span>
                          </div>

                          {!isSuperAdminRole && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleColumnTypeForModule(moduleGroup, 'view', viewCount < rows.length)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                {viewCount < rows.length ? 'Bật tất cả Xem' : 'Tắt tất cả Xem'}
                              </button>
                              <span style={{ color: 'var(--border-color-dark)' }}>|</span>
                              <button
                                type="button"
                                onClick={() => handleToggleColumnTypeForModule(moduleGroup, 'update', updateCount < rows.length)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                }}
                              >
                                {updateCount < rows.length ? 'Bật tất cả Sửa' : 'Tắt tất cả Sửa'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Table Layout: 1 Row per Column with Checkboxes */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr
                              style={{
                                backgroundColor: 'var(--bg-primary)',
                                borderBottom: '1px solid var(--border-color)',
                                color: 'var(--text-muted)',
                                fontSize: '11px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              <th style={{ padding: '8px 16px', textAlign: 'left', width: '38%' }}>
                                Cột / Chức Năng
                              </th>
                              <th style={{ padding: '8px 12px', textAlign: 'left', width: '22%' }}>
                                Mã Cột Trong DB
                              </th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', width: '20%' }}>
                                Xem (View)
                              </th>
                              <th style={{ padding: '8px 12px', textAlign: 'center', width: '20%' }}>
                                Cập Nhật (Update)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => {
                              const isRowViewActive = isSuperAdminRole ? true : !!row.viewPerm?.active;
                              const isRowUpdateActive = isSuperAdminRole ? true : !!row.updatePerm?.active;

                              return (
                                <tr
                                  key={row.baseKey}
                                  style={{
                                    borderBottom: '1px solid var(--border-color)',
                                    backgroundColor:
                                      isRowViewActive || isRowUpdateActive
                                        ? 'var(--color-primary-subtle)'
                                        : 'transparent',
                                    transition: 'background-color var(--transition-fast)',
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isRowViewActive && !isRowUpdateActive) {
                                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isRowViewActive && !isRowUpdateActive) {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                  }}
                                >
                                  {/* Column Label */}
                                  <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {row.label}
                                  </td>

                                  {/* DB Column Name */}
                                  <td style={{ padding: '10px 12px' }}>
                                    <code
                                      style={{
                                        fontSize: '11px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        padding: '2px 6px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)',
                                      }}
                                    >
                                      {row.baseKey}
                                    </code>
                                  </td>

                                  {/* View Checkbox */}
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {row.viewPerm ? (
                                      <label
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          cursor: isSuperAdminRole ? 'not-allowed' : 'pointer',
                                          padding: '4px 10px',
                                          borderRadius: 'var(--radius-sm)',
                                          backgroundColor: isRowViewActive ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                          color: isRowViewActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                                          fontWeight: isRowViewActive ? 700 : 500,
                                          border: '1px solid var(--border-color)',
                                          transition: 'all var(--transition-fast)',
                                          userSelect: 'none',
                                          opacity: isSuperAdminRole ? 0.9 : 1,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isRowViewActive}
                                          disabled={isSuperAdminRole}
                                          onChange={() => handleTogglePermission(row.viewPerm?.chucnang)}
                                          style={{
                                            accentColor: 'var(--color-primary-text)',
                                            width: '15px',
                                            height: '15px',
                                            cursor: isSuperAdminRole ? 'not-allowed' : 'pointer',
                                          }}
                                        />
                                        <span>Xem</span>
                                      </label>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>

                                  {/* Update Checkbox */}
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    {row.updatePerm ? (
                                      <label
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          cursor: isSuperAdminRole ? 'not-allowed' : 'pointer',
                                          padding: '4px 10px',
                                          borderRadius: 'var(--radius-sm)',
                                          backgroundColor: isRowUpdateActive ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                          color: isRowUpdateActive ? 'var(--color-primary-text)' : 'var(--text-secondary)',
                                          fontWeight: isRowUpdateActive ? 700 : 500,
                                          border: '1px solid var(--border-color)',
                                          transition: 'all var(--transition-fast)',
                                          userSelect: 'none',
                                          opacity: isSuperAdminRole ? 0.9 : 1,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isRowUpdateActive}
                                          disabled={isSuperAdminRole}
                                          onChange={() => handleTogglePermission(row.updatePerm?.chucnang, row.insertPerm?.chucnang)}
                                          style={{
                                            accentColor: 'var(--color-primary-text)',
                                            width: '15px',
                                            height: '15px',
                                            cursor: isSuperAdminRole ? 'not-allowed' : 'pointer',
                                          }}
                                        />
                                        <span>Cập Nhật</span>
                                      </label>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Thêm nhóm quyền mới */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => !formLoading && setIsCreateOpen(false)}
        title="Thêm Nhóm Quyền Mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)} disabled={formLoading}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleCreateSubmit} isLoading={formLoading}>
              Tạo Nhóm Quyền
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Input
            label="Tên nhóm quyền (VIẾT HOA) *"
            placeholder="VD: HELPDESK_HCM"
            value={createForm.tenquyen}
            onChange={(e) => setCreateForm({ ...createForm, tenquyen: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Mô tả diễn giải"
            placeholder="VD: Quyền đặc thù cho Helpdesk khu vực HCM"
            value={createForm.noidung || ''}
            onChange={(e) => setCreateForm({ ...createForm, noidung: e.target.value })}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(e) => setCreateForm({ ...createForm, active: e.target.checked })}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span>Kích hoạt nhóm quyền ngay</span>
          </label>
        </form>
      </Modal>

      {/* Modal: Sửa nhóm quyền */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => !formLoading && setIsEditOpen(false)}
        title={`Chỉnh Sửa Nhóm: ${editRole?.tenquyen}`}
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
          <Input
            label="Mô tả diễn giải"
            value={editForm.noidung}
            onChange={(e) => setEditForm({ ...editForm, noidung: e.target.value })}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={editForm.active}
              onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span>Đang hoạt động (Active)</span>
          </label>
        </form>
      </Modal>

      {/* Modal: Thêm Cột Mới / Chức Năng Bổ Sung */}
      <Modal
        isOpen={isAddCustomOpen}
        onClose={() => !formLoading && setIsAddCustomOpen(false)}
        title="Thêm Cột Trong Bảng Nhà Hàng / Quyền Mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddCustomOpen(false)} disabled={formLoading}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleAddCustomSubmit} isLoading={formLoading}>
              Tạo Cột Mới
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Hệ thống sẽ tự động tạo 1 dòng tương ứng với 2 quyền <strong>Xem (view_...)</strong> và <strong>Cập nhật (update_...)</strong> cho cột này.
          </p>

          <Input
            label="Mã cột trong CSDL (VD: rustdesk_pos13, camera_ip, dien_tich...) *"
            placeholder="VD: rustdesk_pos13"
            value={customForm.columnKey}
            onChange={(e) => setCustomForm({ ...customForm, columnKey: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Tên hiển thị tiếng Việt (VD: RustDesk POS 13, Camera Nhà Hàng...) *"
            placeholder="VD: RustDesk POS 13"
            value={customForm.columnLabel}
            onChange={(e) => setCustomForm({ ...customForm, columnLabel: e.target.value })}
            required
          />

          <Select
            label="Nhóm phân hệ"
            value={customForm.moduleGroup}
            onChange={(e) => setCustomForm({ ...customForm, moduleGroup: e.target.value })}
            options={PRESET_MODULE_OPTIONS}
          />

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={customForm.createDbColumn}
                onChange={(e) => setCustomForm({ ...customForm, createDbColumn: e.target.checked })}
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span>Tự động tạo cột này vào bảng dbo.RESTAURANT trong SQL Server (nếu chưa có)</span>
            </label>

            {customForm.createDbColumn && (
              <Select
                label="Kiểu dữ liệu trong CSDL SQL Server"
                value={customForm.dbDataType}
                onChange={(e) => setCustomForm({ ...customForm, dbDataType: e.target.value })}
                options={[
                  { value: 'NVARCHAR(255)', label: 'NVARCHAR(255) - Văn bản tiếng Việt có dấu (Khuyên dùng)' },
                  { value: 'VARCHAR(100)', label: 'VARCHAR(100) - Mã / IP / Số điện thoại / Không dấu' },
                  { value: 'INT', label: 'INT - Số nguyên' },
                  { value: 'DECIMAL(18,2)', label: 'DECIMAL(18,2) - Số tiền / Số thập phân' },
                  { value: 'DATE', label: 'DATE - Ngày (YYYY-MM-DD)' },
                  { value: 'DATETIME', label: 'DATETIME - Ngày & Giờ' },
                  { value: 'BIT', label: 'BIT - Đúng / Sai (Checkbox 0/1)' },
                  { value: 'NVARCHAR(MAX)', label: 'NVARCHAR(MAX) - Ghi chú dài / Văn bản lớn' },
                ]}
              />
            )}
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Tự động khởi tạo các loại quyền:
            </span>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={customForm.createView}
                  onChange={(e) => setCustomForm({ ...customForm, createView: e.target.checked })}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span>Quyền Xem (view_{customForm.columnKey || '...'})</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={customForm.createUpdate}
                  onChange={(e) => setCustomForm({ ...customForm, createUpdate: e.target.checked })}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                <span>Quyền Cập Nhật (update_{customForm.columnKey || '...'})</span>
              </label>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={customForm.applyAllRoles}
              onChange={(e) => setCustomForm({ ...customForm, applyAllRoles: e.target.checked })}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <span>Tự động áp dụng cột này cho tất cả các nhóm quyền</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};
