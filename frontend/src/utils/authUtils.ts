import { UserInfo } from '../types/auth';

/**
 * Checks if the user has Super Admin privileges.
 * Matches:
 * - user.is_super_admin === true
 * - username is 'admin', 'administrator', or 'dung.nguyenanh'
 * - phanquyen is '0'
 * - role_name contains 'super admin'
 */
export const checkIsSuperAdmin = (user?: UserInfo | null): boolean => {
  if (!user) return false;
  if (user.is_super_admin) return true;
  const username = (user.username || '').toLowerCase().trim();
  if (['admin', 'administrator', 'dung.nguyenanh'].includes(username)) return true;
  const pq = String(user.phanquyen || '').trim();
  if (pq === '0') return true;
  const roleName = (user.role_name || '').toLowerCase();
  if (roleName.includes('super admin') || roleName.includes('supper admin') || roleName.includes('superadmin')) return true;
  const rawRoles = (user.roles || []).map(r => String(r).toLowerCase().trim());
  return rawRoles.some(r => r.includes('super') || r.includes('supper') || r === '0');
};

/**
 * Checks if the user has Admin privileges (Super Admin or Admin role).
 * Matches:
 * - Super Admin
 * - phanquyen is '1' or contains '1'
 * - roles contains 'admin' or '1'
 */
export const checkIsAdmin = (user?: UserInfo | null): boolean => {
  if (!user) return false;
  if (checkIsSuperAdmin(user)) return true;
  const pq = String(user.phanquyen || '').trim().toLowerCase();
  if (pq === '1' || pq === '0') return true;
  const rawRoles = user.roles || (user.phanquyen ? user.phanquyen.split(',').map(s => s.trim().toLowerCase()) : []);
  if (rawRoles.includes('admin') || rawRoles.includes('1')) return true;
  const parts = pq.split(',').map(s => s.trim());
  return parts.includes('1') || parts.includes('admin');
};

/**
 * Checks if the user belongs to IT Application team (Quyen App) or has Admin rights.
 * Matches:
 * - Admin / Super Admin
 * - roles contains 'app' or '2'
 * - phanquyen is '2' or contains '2' or 'app'
 */
export const checkIsAppRole = (user?: UserInfo | null): boolean => {
  if (!user) return false;
  if (checkIsAdmin(user)) return true;
  const rawRoles = (user.roles || (user.phanquyen ? user.phanquyen.split(',').map(s => s.trim().toLowerCase()) : [])).map(r => String(r).toLowerCase().trim());
  if (rawRoles.some(r => r === '2' || r === 'app' || r.includes('app') || r.includes('application'))) return true;
  const pq = String(user.phanquyen || '').trim().toLowerCase();
  if (pq === '2' || pq === 'app' || pq.includes('app') || pq.includes('application')) return true;
  const roleName = String(user.role_name || '').toLowerCase();
  if (roleName.includes('app') || roleName.includes('application')) return true;
  const parts = pq.split(',').map(s => s.trim());
  return parts.some(p => p === '2' || p === 'app' || p.includes('app') || p.includes('application'));
};

/**
 * Checks if the user belongs to IT Helpdesk team or has Admin rights.
 * Matches:
 * - Admin / Super Admin
 * - roles contains 'helpdesk' or '3'
 * - phanquyen is '3' or contains '3' or 'helpdesk'
 */
export const checkIsHelpdeskRole = (user?: UserInfo | null): boolean => {
  if (!user) return false;
  if (checkIsAdmin(user)) return true;
  const rawRoles = user.roles || (user.phanquyen ? user.phanquyen.split(',').map(s => s.trim().toLowerCase()) : []);
  if (rawRoles.some(r => r === '3' || r === 'helpdesk')) return true;
  const pq = String(user.phanquyen || '').trim().toLowerCase();
  if (pq === '3' || pq === 'helpdesk') return true;
  const parts = pq.split(',').map(s => s.trim());
  return parts.includes('3') || parts.includes('helpdesk');
};

/**
 * Checks if the user belongs to Inventory (Kiem ke) or has Admin rights.
 * Matches:
 * - Admin / Super Admin
 * - roles contains 'inventory', 'inv', or '4'
 * - phanquyen is '4' or contains '4' or 'inventory'
 */
export const checkIsInventoryRole = (user?: UserInfo | null): boolean => {
  if (!user) return false;
  if (checkIsAdmin(user)) return true;
  const rawRoles = user.roles || (user.phanquyen ? user.phanquyen.split(',').map(s => s.trim().toLowerCase()) : []);
  if (rawRoles.some(r => r === '4' || r === 'inventory' || r === 'inv')) return true;
  const pq = String(user.phanquyen || '').trim().toLowerCase();
  if (pq === '4' || pq === 'inventory' || pq === 'inv') return true;
  const parts = pq.split(',').map(s => s.trim());
  return parts.includes('4') || parts.includes('inventory') || parts.includes('inv');
};

/**
 * Checks if the user is user dung.nguyenanh or Super Admin.
 */
export const checkIsDungOrSuperAdmin = (user?: UserInfo | null): boolean => {
  if (!user) return false;
  return checkIsSuperAdmin(user) || (user.username || '').toLowerCase().trim() === 'dung.nguyenanh';
};

/**
 * Quy tắc bất di bất dịch về màn hình mới (New Screen Access Rule):
 * - Mặc định: Chỉ Admin (và Super Admin) mới có quyền thấy trên Sidebar và truy cập vào Route.
 * - Nhóm quyền / User khác chỉ thấy và truy cập được khi đã được Admin phân quyền
 *   (thông qua bảng dbo.PHANQUYEN_DETAIL hoặc permissions dict từ server).
 *
 * @param user Đối tượng người dùng hiện tại
 * @param screenKey Mã định danh chức năng/màn hình mới (VD: 'remote_desktop_lab', ...)
 */
export const hasNewScreenAccess = (user?: UserInfo | null, screenKey?: string): boolean => {
  if (!user) return false;
  // Super Admin hoặc Admin luôn có toàn quyền truy cập mặc định
  if (checkIsAdmin(user) || checkIsSuperAdmin(user)) return true;
  if (!screenKey) return false;

  const cleanKey = screenKey.trim().toLowerCase();
  const perms = user.permissions || {};
  return Boolean(
    perms[cleanKey] ||
    perms[`view_${cleanKey}`] ||
    perms[`access_${cleanKey}`]
  );
};
