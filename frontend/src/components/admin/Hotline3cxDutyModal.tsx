import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Users,
  Settings,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Play,
  Zap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DateInput } from '../ui/DateInput';
import { MonthInput } from '../ui/MonthInput';
import {
  Hotline3cxConfig,
  Hotline3cxConfigUpdate,
  Hotline3cxMember,
  Hotline3cxMemberCreate,
  Hotline3cxScheduleDay,
  Hotline3cxSyncLog,
  ScheduleDayUpsertItem,
  ShiftCode,
  ShiftMode,
} from '../../types/hotline3cxAuto';
import { hotline3cxAutoService } from '../../services/hotline3cxAutoService';
import {
  formatDateDDMMYYYY,
  formatDateTimeDDMMYYYY,
  getTodayIsoDate,
  getCurrentIsoMonth,
} from '../../utils/dateFormat';

export interface Hotline3cxDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'schedule' | 'members' | 'config' | 'logs';
  onSyncTriggered?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

/** Tính ngày Thứ Hai của tuần chứa chuỗi ngày ISO `YYYY-MM-DD` (UTC an toàn) */
function getMondayOfIso(isoStr: string): string {
  const parts = isoStr.split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Cộng hoặc trừ ngày từ chuỗi ngày ISO `YYYY-MM-DD` (UTC an toàn) */
function addDaysToIso(isoStr: string, days: number): string {
  const parts = isoStr.split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

export const Hotline3cxDutyModal: React.FC<Hotline3cxDutyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'schedule',
  onSyncTriggered,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'members' | 'config' | 'logs'>(initialTab);

  // ── Tab 1: Schedules State ──
  const [currentMonday, setCurrentMonday] = useState<string>(() => getMondayOfIso(getTodayIsoDate()));
  const [schedules, setSchedules] = useState<Hotline3cxScheduleDay[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(false);
  const [savingSchedules, setSavingSchedules] = useState<boolean>(false);
  const [cloningWeek, setCloningWeek] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Áp dụng mẫu tháng
  const [showApplyMonthModal, setShowApplyMonthModal] = useState<boolean>(false);
  const [targetMonth, setTargetMonth] = useState<string>(() => getCurrentIsoMonth());
  const [overwriteMonth, setOverwriteMonth] = useState<boolean>(true);
  const [applyingMonth, setApplyingMonth] = useState<boolean>(false);

  // ── Tab 2: Members State ──
  const [members, setMembers] = useState<Hotline3cxMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingMemberForm, setEditingMemberForm] = useState<Partial<Hotline3cxMember>>({});
  const [newMemberForm, setNewMemberForm] = useState<Hotline3cxMemberCreate>({
    ext_line: '',
    full_name: '',
    department: 'HCM IT DEPT',
    is_active: true,
    sort_order: 10,
  });
  const [savingMember, setSavingMember] = useState<boolean>(false);

  // ── Tab 3: Config State ──
  const [config, setConfig] = useState<Hotline3cxConfig | null>(null);
  const [configForm, setConfigForm] = useState<Hotline3cxConfigUpdate>({});
  const [loadingConfig, setLoadingConfig] = useState<boolean>(false);
  const [savingConfig, setSavingConfig] = useState<boolean>(false);

  // ── Tab 4: Logs State ──
  const [logs, setLogs] = useState<Hotline3cxSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);

  // ── Action: Apply Now Modal State (Bảo vệ 2 lớp an toàn) ──
  const [showApplyNowModal, setShowApplyNowModal] = useState<boolean>(false);
  const [applyNowDate, setApplyNowDate] = useState<string>(() => getTodayIsoDate());
  const [applyNowShift, setApplyNowShift] = useState<ShiftCode>('MORNING');
  const [executingApplyNow, setExecutingApplyNow] = useState<boolean>(false);
  const [executingDryRun, setExecutingDryRun] = useState<boolean>(false);

  // Toast wrapper
  const notify = useCallback(
    (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      if (showToast) {
        showToast(msg, type);
      } else {
        alert(msg);
      }
    },
    [showToast]
  );

  // Sync initial tab when modal opens or initialTab prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load members on mount or when modal opens
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await hotline3cxAutoService.getMembers();
      setMembers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Không thể tải danh sách nhân sự: ${msg}`, 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [notify]);

  // Load schedules for the current Monday week
  const fetchSchedules = useCallback(
    async (mondayIso: string) => {
      setLoadingSchedules(true);
      try {
        const sundayIso = addDaysToIso(mondayIso, 6);
        const data = await hotline3cxAutoService.getSchedules(mondayIso, sundayIso);
        setSchedules(data);
        setHasUnsavedChanges(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        notify(`Không thể tải lịch trực tuần: ${msg}`, 'error');
      } finally {
        setLoadingSchedules(false);
      }
    },
    [notify]
  );

  // Load config
  const fetchConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const data = await hotline3cxAutoService.getConfig();
      setConfig(data);
      setConfigForm({
        portal_url: data.portal_url,
        username: data.username,
        password: '',
        day_queue_name: data.day_queue_name,
        night_queue_name: data.night_queue_name,
        morning_time: data.morning_time,
        evening_time: data.evening_time,
        alert_emails: data.alert_emails,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Không thể tải cấu hình 3CX: ${msg}`, 'error');
    } finally {
      setLoadingConfig(false);
    }
  }, [notify]);

  // Load logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await hotline3cxAutoService.getLogs(50);
      setLogs(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Không thể tải nhật ký đồng bộ: ${msg}`, 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, [notify]);

  // Effect fetch data according to active tab
  useEffect(() => {
    if (!isOpen) return;
    fetchMembers();
  }, [isOpen, fetchMembers]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'schedule') {
      fetchSchedules(currentMonday);
    } else if (activeTab === 'members') {
      fetchMembers();
    } else if (activeTab === 'config') {
      fetchConfig();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [isOpen, activeTab, currentMonday, fetchSchedules, fetchMembers, fetchConfig, fetchLogs]);

  // Active members memo
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.is_active).sort((a, b) => a.sort_order - b.sort_order);
  }, [members]);

  const memberMap = useMemo(() => {
    const map = new Map<string, Hotline3cxMember>();
    members.forEach((m) => map.set(m.ext_line, m));
    return map;
  }, [members]);

  // Navigation handlers for week
  const handleNavigateWeek = (offsetDays: number) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa lưu trong tuần này! Chuyển tuần khác sẽ làm mất các chỉnh sửa chưa lưu. Tiếp tục?'
      );
      if (!confirmLeave) return;
    }
    const nextMonday = addDaysToIso(currentMonday, offsetDays);
    setCurrentMonday(nextMonday);
  };

  const handleJumpToWeek = (isoVal: string) => {
    if (!isoVal) return;
    const targetMonday = getMondayOfIso(isoVal);
    if (targetMonday !== currentMonday) {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm(
          'Bạn có thay đổi chưa lưu trong tuần này! Chuyển tuần khác sẽ làm mất các chỉnh sửa chưa lưu. Tiếp tục?'
        );
        if (!confirmLeave) return;
      }
      setCurrentMonday(targetMonday);
    }
  };

  // Schedule row update helpers
  const handleUpdateScheduleRow = (
    dutyDate: string,
    updater: (prev: Hotline3cxScheduleDay) => Hotline3cxScheduleDay
  ) => {
    setSchedules((prevList) =>
      prevList.map((day) => {
        if (day.duty_date === dutyDate) {
          return updater(day);
        }
        return day;
      })
    );
    setHasUnsavedChanges(true);
  };

  // Save schedules
  const handleSaveSchedules = async () => {
    setSavingSchedules(true);
    try {
      const payload: ScheduleDayUpsertItem[] = schedules.map((d) => ({
        duty_date: d.duty_date,
        shift_mode: d.shift_mode,
        morning_lines: d.morning_lines || [],
        evening_lines: d.evening_lines || [],
        weekend_lines: d.weekend_lines || [],
        weekend_evening_override: d.weekend_evening_override || [],
        note: d.note || null,
      }));
      const updated = await hotline3cxAutoService.saveSchedules(payload);
      setSchedules(updated);
      setHasUnsavedChanges(false);
      notify('Đã lưu thành công lịch trực tuần!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi lưu lịch trực: ${msg}`, 'error');
    } finally {
      setSavingSchedules(false);
    }
  };

  // Clone previous week
  const handleClonePreviousWeek = async () => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa lưu. Sao chép từ tuần trước sẽ ghi đè lên các thay đổi này. Tiếp tục?'
      );
      if (!confirmLeave) return;
    }
    setCloningWeek(true);
    try {
      const updated = await hotline3cxAutoService.clonePreviousWeek(currentMonday);
      setSchedules(updated);
      setHasUnsavedChanges(false);
      notify(`Đã sao chép toàn bộ lịch trực từ tuần trước sang tuần ${formatDateDDMMYYYY(currentMonday)}!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi sao chép tuần trước: ${msg}`, 'error');
    } finally {
      setCloningWeek(false);
    }
  };

  // Apply 7-day template to month
  const handleApplyMonthTemplate = async () => {
    if (!targetMonth) {
      notify('Vui lòng chọn tháng áp dụng (mm-yyyy)', 'error');
      return;
    }
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    setApplyingMonth(true);
    try {
      const templateDays: ScheduleDayUpsertItem[] = schedules.map((d) => ({
        duty_date: d.duty_date,
        shift_mode: d.shift_mode,
        morning_lines: d.morning_lines || [],
        evening_lines: d.evening_lines || [],
        weekend_lines: d.weekend_lines || [],
        weekend_evening_override: d.weekend_evening_override || [],
        note: d.note || null,
      }));

      const res = await hotline3cxAutoService.applyMonthTemplate({
        year,
        month,
        template_days: templateDays,
        overwrite_existing: overwriteMonth,
      });

      setShowApplyMonthModal(false);
      notify(
        `Áp dụng mẫu thành công cho ${res.applied_days} ngày trong tháng ${monthStr}-${yearStr}!`,
        'success'
      );
      // Reload current schedules
      fetchSchedules(currentMonday);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi áp dụng mẫu tháng: ${msg}`, 'error');
    } finally {
      setApplyingMonth(false);
    }
  };

  // Dry-run handler
  const handleQuickDryRun = async () => {
    setExecutingDryRun(true);
    notify('Đang chạy thử nghiệm Playwright (không lưu vào 3CX portal)...', 'info');
    try {
      const log = await hotline3cxAutoService.dryRun({
        duty_date: getTodayIsoDate(),
      });
      if (log.status === 'SUCCESS' || log.status === 'DRY_RUN') {
        notify(
          `Chạy thử thành công! Hàng đợi: ${log.queue_name}, Số line: ${log.applied_lines?.length || 0}`,
          'success'
        );
      } else if (log.status === 'SKIPPED') {
        notify(`Bỏ qua ca trực: ${log.error_message || 'Không có line nào cần gán'}`, 'info');
      } else {
        notify(`Chạy thử thất bại: ${log.error_message || 'Lỗi không xác định'}`, 'error');
      }
      setActiveTab('logs');
      fetchLogs();
      if (onSyncTriggered) onSyncTriggered();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi kích hoạt chạy thử: ${msg}`, 'error');
    } finally {
      setExecutingDryRun(false);
    }
  };

  // Apply Now confirmation execute handler
  const handleConfirmApplyNow = async () => {
    setExecutingApplyNow(true);
    try {
      const log = await hotline3cxAutoService.applyNow({
        duty_date: applyNowDate,
        shift_code: applyNowShift,
      });
      setShowApplyNowModal(false);

      if (log.status === 'SUCCESS') {
        notify(
          `Áp dụng thành công vào cổng 3CX! Hàng đợi: ${log.queue_name}, đã cập nhật ${log.applied_lines?.length || 0} line trực.`,
          'success'
        );
      } else if (log.status === 'SKIPPED') {
        notify(`Đã bỏ qua ca trực: ${log.error_message || 'Không có cấu hình line'}`, 'info');
      } else {
        notify(`Đồng bộ thất bại: ${log.error_message || 'Có lỗi xảy ra'}`, 'error');
      }
      setActiveTab('logs');
      fetchLogs();
      if (onSyncTriggered) onSyncTriggered();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi đồng bộ vào 3CX: ${msg}`, 'error');
    } finally {
      setExecutingApplyNow(false);
    }
  };

  // Member CRUD handlers
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.ext_line.trim() || !newMemberForm.full_name.trim()) {
      notify('Vui lòng nhập đầy đủ Số máy nhánh 3CX và Họ tên nhân sự', 'error');
      return;
    }
    setSavingMember(true);
    try {
      await hotline3cxAutoService.createMember({
        ext_line: newMemberForm.ext_line.trim(),
        full_name: newMemberForm.full_name.trim(),
        department: (newMemberForm.department || '').trim(),
        is_active: newMemberForm.is_active ?? true,
        sort_order: Number(newMemberForm.sort_order) || 10,
      });
      setNewMemberForm({
        ext_line: '',
        full_name: '',
        department: 'HCM IT DEPT',
        is_active: true,
        sort_order: 10,
      });
      notify('Thêm nhân sự mới thành công!', 'success');
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi thêm nhân sự: ${msg}`, 'error');
    } finally {
      setSavingMember(false);
    }
  };

  const handleStartEditMember = (m: Hotline3cxMember) => {
    setEditingMemberId(m.id);
    setEditingMemberForm({
      ext_line: m.ext_line,
      full_name: m.full_name,
      department: m.department,
      is_active: m.is_active,
      sort_order: m.sort_order,
    });
  };

  const handleSaveEditMember = async (id: number) => {
    setSavingMember(true);
    try {
      await hotline3cxAutoService.updateMember(id, editingMemberForm);
      setEditingMemberId(null);
      setEditingMemberForm({});
      notify('Cập nhật nhân sự thành công!', 'success');
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi cập nhật nhân sự: ${msg}`, 'error');
    } finally {
      setSavingMember(false);
    }
  };

  const handleDeleteMember = async (id: number, name: string) => {
    const confirmDel = window.confirm(`Bạn có chắc chắn muốn xóa nhân sự "${name}" khỏi danh mục trực?`);
    if (!confirmDel) return;
    try {
      await hotline3cxAutoService.deleteMember(id);
      notify(`Đã xóa nhân sự "${name}"`, 'success');
      fetchMembers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi xóa nhân sự: ${msg}`, 'error');
    }
  };

  // Config save handler
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const payload: Hotline3cxConfigUpdate = {
        portal_url: configForm.portal_url?.trim(),
        username: configForm.username?.trim(),
        day_queue_name: configForm.day_queue_name?.trim(),
        night_queue_name: configForm.night_queue_name?.trim(),
        morning_time: configForm.morning_time?.trim(),
        evening_time: configForm.evening_time?.trim(),
        alert_emails: configForm.alert_emails?.trim(),
      };
      if (configForm.password && configForm.password.trim()) {
        payload.password = configForm.password.trim();
      }
      const updated = await hotline3cxAutoService.updateConfig(payload);
      setConfig(updated);
      setConfigForm((prev) => ({ ...prev, password: '' }));
      notify('Đã lưu cấu hình 3CX & đồng bộ lịch tác vụ Scheduler thành công!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notify(`Lỗi khi lưu cấu hình: ${msg}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const sundayOfCurrentWeek = useMemo(() => addDaysToIso(currentMonday, 6), [currentMonday]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: '#2563eb',
              }}
            >
              <Users size={18} />
            </span>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Tự Động Phân Hàng Đợi Trực Hotline 3CX
              </div>
              <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                Quản lý lịch trực tuần, ca sáng/chiều/cuối tuần, tài khoản portal 3CX & nhật ký đồng bộ
              </div>
            </div>
          </div>
        }
        maxWidth="1160px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
          {/* ══ 4-TAB NAVIGATION HEADER ══ */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'schedule' ? 700 : 500,
                color: activeTab === 'schedule' ? '#2563eb' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'schedule' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Calendar size={15} />
              <span>Lịch Trực Tuần / Tháng</span>
              {hasUnsavedChanges && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                  }}
                  title="Có thay đổi chưa lưu"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'members' ? 700 : 500,
                color: activeTab === 'members' ? '#2563eb' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'members' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={15} />
              <span>Thành Viên Trực ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('config')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'config' ? 700 : 500,
                color: activeTab === 'config' ? '#2563eb' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'config' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Settings size={15} />
              <span>Cấu Hình 3CX & Email</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: activeTab === 'logs' ? 700 : 500,
                color: activeTab === 'logs' ? '#2563eb' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'logs' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <History size={15} />
              <span>Lịch Sử Thực Thi & Ảnh</span>
            </button>
          </div>

          {/* ══ TAB 1: LỊCH TRỰC TUẦN / THÁNG ══ */}
          {activeTab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Toolbar điều hướng tuần & công cụ sao chép */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {/* Bộ điều hướng tuần */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleNavigateWeek(-7)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                    title="Xem tuần liền trước (-7 ngày)"
                  >
                    <ChevronLeft size={14} />
                    <span>Tuần Trước</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const todayMon = getMondayOfIso(getTodayIsoDate());
                      if (todayMon !== currentMonday) {
                        setCurrentMonday(todayMon);
                      }
                    }}
                    style={{
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor:
                        currentMonday === getMondayOfIso(getTodayIsoDate())
                          ? 'rgba(37, 99, 235, 0.12)'
                          : 'var(--bg-card)',
                      color:
                        currentMonday === getMondayOfIso(getTodayIsoDate())
                          ? '#2563eb'
                          : 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Tuần Này
                  </button>

                  <button
                    type="button"
                    onClick={() => handleNavigateWeek(7)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                    title="Xem tuần tiếp theo (+7 ngày)"
                  >
                    <span>Tuần Sau</span>
                    <ChevronRight size={14} />
                  </button>

                  {/* Nhảy trực tiếp đến tuần bất kỳ */}
                  <div style={{ width: '145px' }}>
                    <DateInput
                      compact
                      hideClear
                      value={currentMonday}
                      onChange={handleJumpToWeek}
                      placeholder="Chọn ngày xem tuần"
                    />
                  </div>

                  <span
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginLeft: '6px',
                    }}
                  >
                    {formatDateDDMMYYYY(currentMonday)} → {formatDateDDMMYYYY(sundayOfCurrentWeek)}
                  </span>
                </div>

                {/* Các nút sao chép & thao tác lịch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleClonePreviousWeek}
                    disabled={cloningWeek}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      color: '#2563eb',
                      cursor: cloningWeek ? 'not-allowed' : 'pointer',
                      opacity: cloningWeek ? 0.7 : 1,
                    }}
                    title="Sao chép toàn bộ lịch tuần trước sang tuần này"
                  >
                    {cloningWeek ? (
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Copy size={13} />
                    )}
                    <span>Sao Chép Tuần Trước → Tuần Này</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowApplyMonthModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #10b981',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      color: '#059669',
                      cursor: 'pointer',
                    }}
                    title="Áp dụng mẫu 7 ngày của tuần này cho toàn bộ các ngày trong tháng"
                  >
                    <Calendar size={13} />
                    <span>Áp Dụng Mẫu Cho Cả Tháng</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSchedules}
                    disabled={savingSchedules || !hasUnsavedChanges}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: hasUnsavedChanges ? '#2563eb' : 'var(--border-color)',
                      color: hasUnsavedChanges ? '#fff' : 'var(--text-muted)',
                      cursor: hasUnsavedChanges && !savingSchedules ? 'pointer' : 'not-allowed',
                      boxShadow: hasUnsavedChanges ? '0 1px 3px rgba(37, 99, 235, 0.3)' : 'none',
                    }}
                  >
                    {savingSchedules ? (
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Save size={13} />
                    )}
                    <span>Lưu Lịch Trực</span>
                  </button>
                </div>
              </div>

              {/* Lưới 7 ngày (Thứ 2 -> Chủ Nhật) */}
              <div
                style={{
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {loadingSchedules ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '40px',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                    }}
                  >
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang tải lịch trực tuần...</span>
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottom: '2px solid var(--border-color)',
                        }}
                      >
                        <th style={{ padding: '10px 12px', width: '130px', fontWeight: 700 }}>
                          Thứ & Ngày
                        </th>
                        <th style={{ padding: '10px 12px', width: '135px', fontWeight: 700 }}>
                          Chế Độ Ngày
                        </th>
                        <th style={{ padding: '10px 12px', width: '250px', fontWeight: 700 }}>
                          <div>Ca Sáng 06:00 (Day 0006)</div>
                          <div style={{ fontSize: '10.5px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                            T2–T6 Song Song (Skill 1)
                          </div>
                        </th>
                        <th style={{ padding: '10px 12px', width: '230px', fontWeight: 700 }}>
                          <div>Ca Tối 16:29 (Night 0007)</div>
                          <div style={{ fontSize: '10.5px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                            T2–T6: 1 (Chính) / 2 (Phụ)
                          </div>
                        </th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>
                          <div>T7–CN / Lễ (Night 0007: 06:00 → 16:29 Tự Đảo)</div>
                          <div style={{ fontSize: '10.5px', fontWeight: 400, color: 'var(--text-secondary)' }}>
                            06:00 Chính(1)-Phụ(2) → 16:29 Tự đảo Phụ(1)-Chính(2)
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((day) => {
                        const isWeekendDay = day.is_weekend;
                        const isEffectiveWeekend =
                          day.shift_mode === 'WEEKEND' || (day.shift_mode === 'AUTO' && isWeekendDay);
                        const hasCustomOverride =
                          day.weekend_evening_override && day.weekend_evening_override.length > 0;

                        return (
                          <tr
                            key={day.duty_date}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: isWeekendDay ? 'rgba(245, 158, 11, 0.03)' : 'transparent',
                            }}
                          >
                            {/* Cột 1: Thứ & Ngày */}
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {day.weekday_label || 'Thứ'}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {formatDateDDMMYYYY(day.duty_date)}
                              </div>
                              <span
                                style={{
                                  display: 'inline-block',
                                  marginTop: '4px',
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                  backgroundColor: isWeekendDay
                                    ? 'rgba(245, 158, 11, 0.12)'
                                    : 'rgba(59, 130, 246, 0.1)',
                                  color: isWeekendDay ? '#d97706' : '#2563eb',
                                }}
                              >
                                {isWeekendDay ? 'Cuối tuần' : 'T2–T6'}
                              </span>
                            </td>

                            {/* Cột 2: Chế độ ngày (AUTO / WEEKDAY / WEEKEND) */}
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <select
                                value={day.shift_mode}
                                onChange={(e) => {
                                  const val = e.target.value as ShiftMode;
                                  handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                    ...prev,
                                    shift_mode: val,
                                  }));
                                }}
                                style={{
                                  width: '100%',
                                  padding: '5px 8px',
                                  fontSize: '11.5px',
                                  borderRadius: '5px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'var(--bg-primary)',
                                  color: 'var(--text-primary)',
                                }}
                              >
                                <option value="AUTO">Tự Động (T2–T6/T7–CN)</option>
                                <option value="WEEKDAY">Ngày Thường (T2–T6)</option>
                                <option value="WEEKEND">Ngày Lễ / Cuối Tuần</option>
                              </select>
                            </td>

                            {/* Cột 3: Ca Sáng 06:00 (Day Queue 0006 — Song Song) */}
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              {isEffectiveWeekend ? (
                                <div
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '5px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-muted)',
                                    fontSize: '11px',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  Không chạy Day (Chỉ chạy Night 0007)
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {/* Danh sách pill đã chọn */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {(day.morning_lines || []).map((line) => {
                                      const m = memberMap.get(line);
                                      return (
                                        <span
                                          key={line}
                                          style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '2px 7px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: '4px',
                                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                            color: '#2563eb',
                                            border: '1px solid rgba(37, 99, 235, 0.2)',
                                          }}
                                        >
                                          <span>
                                            {line} {m ? m.full_name : ''}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                                ...prev,
                                                morning_lines: (prev.morning_lines || []).filter(
                                                  (x) => x !== line
                                                ),
                                              }));
                                            }}
                                            style={{
                                              border: 'none',
                                              background: 'none',
                                              color: '#ef4444',
                                              cursor: 'pointer',
                                              padding: 0,
                                              display: 'flex',
                                              alignItems: 'center',
                                            }}
                                            title="Xóa khỏi ca sáng"
                                          >
                                            <X size={11} />
                                          </button>
                                        </span>
                                      );
                                    })}
                                    {(!day.morning_lines || day.morning_lines.length === 0) && (
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          color: 'var(--text-muted)',
                                          fontStyle: 'italic',
                                        }}
                                      >
                                        Chưa chọn line nào
                                      </span>
                                    )}
                                  </div>

                                  {/* Thêm nhanh từ active members */}
                                  <select
                                    value=""
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (!val) return;
                                      if (!(day.morning_lines || []).includes(val)) {
                                        handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                          ...prev,
                                          morning_lines: [...(prev.morning_lines || []), val],
                                        }));
                                      }
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'var(--bg-primary)',
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    <option value="">+ Thêm nhân sự ca sáng...</option>
                                    {activeMembers
                                      .filter((m) => !(day.morning_lines || []).includes(m.ext_line))
                                      .map((m) => (
                                        <option key={m.id} value={m.ext_line}>
                                          {m.ext_line} — {m.full_name}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              )}
                            </td>

                            {/* Cột 4: Ca Tối 16:29 (Night Queue 0007 — Chính 1 / Phụ 2) */}
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              {isEffectiveWeekend ? (
                                <div
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '5px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-muted)',
                                    fontSize: '11px',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  Theo cột Cuối tuần / Lễ bên phải
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  {/* Slot 1: Chính */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        color: '#2563eb',
                                        minWidth: '55px',
                                      }}
                                    >
                                      1 (Chính):
                                    </span>
                                    <select
                                      value={day.evening_lines?.[0] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const slot2 = day.evening_lines?.[1] || '';
                                        const newLines = val ? (slot2 ? [val, slot2] : [val]) : (slot2 ? ['', slot2] : []);
                                        handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                          ...prev,
                                          evening_lines: newLines,
                                        }));
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                      }}
                                    >
                                      <option value="">-- Chưa chọn --</option>
                                      {activeMembers.map((m) => (
                                        <option key={m.id} value={m.ext_line}>
                                          {m.ext_line} — {m.full_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Slot 2: Phụ */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        color: '#d97706',
                                        minWidth: '55px',
                                      }}
                                    >
                                      2 (Phụ):
                                    </span>
                                    <select
                                      value={day.evening_lines?.[1] || ''}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const slot1 = day.evening_lines?.[0] || '';
                                        const newLines = slot1 ? (val ? [slot1, val] : [slot1]) : (val ? ['', val] : []);
                                        handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                          ...prev,
                                          evening_lines: newLines,
                                        }));
                                      }}
                                      style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        fontSize: '11px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                      }}
                                    >
                                      <option value="">-- Chưa chọn --</option>
                                      {activeMembers.map((m) => (
                                        <option key={m.id} value={m.ext_line}>
                                          {m.ext_line} — {m.full_name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Cột 5: T7–CN / Lễ (Night 0007: 06:00 Chính-Phụ -> 16:29 Tự Đảo) */}
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              {!isEffectiveWeekend ? (
                                <div
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: '5px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-muted)',
                                    fontSize: '11px',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  (Áp dụng khi chế độ là Cuối tuần / Lễ)
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {/* Slot 06:00 Chính & Phụ */}
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {/* Chính 06:00 (Skill 1) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          color: '#059669',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Chính 06:00 (1):
                                      </span>
                                      <select
                                        value={day.weekend_lines?.[0] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const slot2 = day.weekend_lines?.[1] || '';
                                          const newLines = val ? (slot2 ? [val, slot2] : [val]) : (slot2 ? ['', slot2] : []);
                                          handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                            ...prev,
                                            weekend_lines: newLines,
                                          }));
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: '4px 6px',
                                          fontSize: '11px',
                                          borderRadius: '4px',
                                          border: '1px solid var(--border-color)',
                                          backgroundColor: 'var(--bg-primary)',
                                          color: 'var(--text-primary)',
                                        }}
                                      >
                                        <option value="">-- Chưa chọn --</option>
                                        {activeMembers.map((m) => (
                                          <option key={m.id} value={m.ext_line}>
                                            {m.ext_line} — {m.full_name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Phụ 06:00 (Skill 2) */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                                      <span
                                        style={{
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          color: '#d97706',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Phụ 06:00 (2):
                                      </span>
                                      <select
                                        value={day.weekend_lines?.[1] || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const slot1 = day.weekend_lines?.[0] || '';
                                          const newLines = slot1 ? (val ? [slot1, val] : [slot1]) : (val ? ['', val] : []);
                                          handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                            ...prev,
                                            weekend_lines: newLines,
                                          }));
                                        }}
                                        style={{
                                          flex: 1,
                                          padding: '4px 6px',
                                          fontSize: '11px',
                                          borderRadius: '4px',
                                          border: '1px solid var(--border-color)',
                                          backgroundColor: 'var(--bg-primary)',
                                          color: 'var(--text-primary)',
                                        }}
                                      >
                                        <option value="">-- Chưa chọn --</option>
                                        {activeMembers.map((m) => (
                                          <option key={m.id} value={m.ext_line}>
                                            {m.ext_line} — {m.full_name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  {/* Preview tự đảo 16:29 hoặc override riêng */}
                                  {!hasCustomOverride ? (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '6px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        fontSize: '11px',
                                      }}
                                    >
                                      <span style={{ color: '#047857' }}>
                                        ⚡ <strong>16:29 Tự Đảo:</strong>{' '}
                                        {day.weekend_lines?.[1] || 'Phụ'} (Skill 1) ↔{' '}
                                        {day.weekend_lines?.[0] || 'Chính'} (Skill 2)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                            ...prev,
                                            weekend_evening_override: [
                                              prev.weekend_lines?.[1] || '',
                                              prev.weekend_lines?.[0] || '',
                                            ],
                                          }));
                                        }}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#2563eb',
                                          cursor: 'pointer',
                                          fontSize: '10.5px',
                                          textDecoration: 'underline',
                                        }}
                                      >
                                        Tùy chỉnh ca 16:29 riêng
                                      </button>
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        padding: '6px',
                                        borderRadius: '4px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.06)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                        }}
                                      >
                                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#dc2626' }}>
                                          Tùy chỉnh riêng cho ca 16:29 (Không tự đảo):
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                              ...prev,
                                              weekend_evening_override: [],
                                            }));
                                          }}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#2563eb',
                                            cursor: 'pointer',
                                            fontSize: '10.5px',
                                            textDecoration: 'underline',
                                          }}
                                        >
                                          Quay lại chế độ tự đảo
                                        </button>
                                      </div>
                                      <div style={{ display: 'flex', gap: '6px' }}>
                                        <select
                                          value={day.weekend_evening_override?.[0] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const slot2 = day.weekend_evening_override?.[1] || '';
                                            handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                              ...prev,
                                              weekend_evening_override: [val, slot2],
                                            }));
                                          }}
                                          style={{
                                            flex: 1,
                                            padding: '3px 6px',
                                            fontSize: '10.5px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                          }}
                                        >
                                          <option value="">16:29 Chính (1)</option>
                                          {activeMembers.map((m) => (
                                            <option key={m.id} value={m.ext_line}>
                                              {m.ext_line} — {m.full_name}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          value={day.weekend_evening_override?.[1] || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const slot1 = day.weekend_evening_override?.[0] || '';
                                            handleUpdateScheduleRow(day.duty_date, (prev) => ({
                                              ...prev,
                                              weekend_evening_override: [slot1, val],
                                            }));
                                          }}
                                          style={{
                                            flex: 1,
                                            padding: '3px 6px',
                                            fontSize: '10.5px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                          }}
                                        >
                                          <option value="">16:29 Phụ (2)</option>
                                          {activeMembers.map((m) => (
                                            <option key={m.id} value={m.ext_line}>
                                              {m.ext_line} — {m.full_name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Action buttons footer inside Tab 1 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {hasUnsavedChanges ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#ef4444',
                        fontWeight: 600,
                      }}
                    >
                      <AlertCircle size={14} />
                      <span>Có thay đổi chưa lưu trên bảng lịch!</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <CheckCircle2 size={14} color="#10b981" />
                      <span>Lịch trực tuần hiện tại đã được đồng bộ với cơ sở dữ liệu.</span>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleQuickDryRun}
                    disabled={executingDryRun}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: '1px solid #2563eb',
                      backgroundColor: 'rgba(37, 99, 235, 0.08)',
                      color: '#2563eb',
                      cursor: executingDryRun ? 'not-allowed' : 'pointer',
                      opacity: executingDryRun ? 0.7 : 1,
                    }}
                    title="Chạy mô phỏng Playwright mở portal 3CX nhưng không bấm Save"
                  >
                    {executingDryRun ? (
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Play size={13} />
                    )}
                    <span>Chạy Thử (Không Lưu)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setApplyNowDate(getTodayIsoDate());
                      setShowApplyNowModal(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#d97706',
                      color: '#fff',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(217, 119, 6, 0.3)',
                    }}
                    title="Đồng bộ trực tiếp ca trực được chọn vào portal 3CX thật"
                  >
                    <Zap size={13} />
                    <span>Áp Dụng Ca Ngay...</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSchedules}
                    disabled={savingSchedules || !hasUnsavedChanges}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: hasUnsavedChanges ? '#2563eb' : 'var(--border-color)',
                      color: hasUnsavedChanges ? '#fff' : 'var(--text-muted)',
                      cursor: hasUnsavedChanges && !savingSchedules ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {savingSchedules ? (
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Save size={13} />
                    )}
                    <span>Lưu Toàn Bộ Lịch</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB 2: THÀNH VIÊN TRỰC ══ */}
          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Form thêm mới thành viên */}
              <form
                onSubmit={handleCreateMember}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Line 3CX (Ext) *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 8740"
                    value={newMemberForm.ext_line}
                    onChange={(e) =>
                      setNewMemberForm((prev) => ({ ...prev, ext_line: e.target.value }))
                    }
                    style={{
                      width: '110px',
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '180px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Họ và Tên Nhân Sự *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: NGUYEN VAN A"
                    value={newMemberForm.full_name}
                    onChange={(e) =>
                      setNewMemberForm((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '160px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Phòng Ban
                  </label>
                  <input
                    type="text"
                    placeholder="HCM IT DEPT"
                    value={newMemberForm.department}
                    onChange={(e) =>
                      setNewMemberForm((prev) => ({ ...prev, department: e.target.value }))
                    }
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '80px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Thứ Tự
                  </label>
                  <input
                    type="number"
                    value={newMemberForm.sort_order}
                    onChange={(e) =>
                      setNewMemberForm((prev) => ({ ...prev, sort_order: Number(e.target.value) }))
                    }
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '16px' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={savingMember}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {savingMember ? (
                      <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Plus size={14} />
                    )}
                    <span>Thêm Thành Viên</span>
                  </Button>
                </div>
              </form>

              {/* Bảng danh sách thành viên */}
              <div
                style={{
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {loadingMembers ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '40px',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                    }}
                  >
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang tải danh sách nhân sự...</span>
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottom: '2px solid var(--border-color)',
                        }}
                      >
                        <th style={{ padding: '10px 12px', width: '80px', fontWeight: 700 }}>
                          Thứ Tự
                        </th>
                        <th style={{ padding: '10px 12px', width: '120px', fontWeight: 700 }}>
                          Số Máy Nhánh
                        </th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Họ và Tên</th>
                        <th style={{ padding: '10px 12px', width: '180px', fontWeight: 700 }}>
                          Phòng Ban
                        </th>
                        <th style={{ padding: '10px 12px', width: '130px', fontWeight: 700 }}>
                          Trạng Thái
                        </th>
                        <th
                          style={{
                            padding: '10px 12px',
                            width: '120px',
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        >
                          Thao Tác
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => {
                        const isEditing = editingMemberId === m.id;
                        return (
                          <tr
                            key={m.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              opacity: m.is_active ? 1 : 0.6,
                            }}
                          >
                            {/* Thứ tự */}
                            <td style={{ padding: '8px 12px' }}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={editingMemberForm.sort_order ?? m.sort_order}
                                  onChange={(e) =>
                                    setEditingMemberForm((prev) => ({
                                      ...prev,
                                      sort_order: Number(e.target.value),
                                    }))
                                  }
                                  style={{
                                    width: '60px',
                                    padding: '4px 6px',
                                    fontSize: '11.5px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                  }}
                                />
                              ) : (
                                <span style={{ fontWeight: 600 }}>{m.sort_order}</span>
                              )}
                            </td>

                            {/* Máy nhánh */}
                            <td style={{ padding: '8px 12px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingMemberForm.ext_line ?? m.ext_line}
                                  onChange={(e) =>
                                    setEditingMemberForm((prev) => ({
                                      ...prev,
                                      ext_line: e.target.value,
                                    }))
                                  }
                                  style={{
                                    width: '90px',
                                    padding: '4px 6px',
                                    fontSize: '11.5px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    color: '#2563eb',
                                  }}
                                >
                                  {m.ext_line}
                                </span>
                              )}
                            </td>

                            {/* Họ tên */}
                            <td style={{ padding: '8px 12px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingMemberForm.full_name ?? m.full_name}
                                  onChange={(e) =>
                                    setEditingMemberForm((prev) => ({
                                      ...prev,
                                      full_name: e.target.value,
                                    }))
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    fontSize: '11.5px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                  }}
                                />
                              ) : (
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {m.full_name}
                                </span>
                              )}
                            </td>

                            {/* Phòng ban */}
                            <td style={{ padding: '8px 12px' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingMemberForm.department ?? m.department}
                                  onChange={(e) =>
                                    setEditingMemberForm((prev) => ({
                                      ...prev,
                                      department: e.target.value,
                                    }))
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    fontSize: '11.5px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                  }}
                                />
                              ) : (
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {m.department || '—'}
                                </span>
                              )}
                            </td>

                            {/* Trạng thái hoạt động */}
                            <td style={{ padding: '8px 12px' }}>
                              {isEditing ? (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingMemberForm.is_active ?? m.is_active}
                                    onChange={(e) =>
                                      setEditingMemberForm((prev) => ({
                                        ...prev,
                                        is_active: e.target.checked,
                                      }))
                                    }
                                  />
                                  <span style={{ fontSize: '11.5px' }}>Đang hoạt động</span>
                                </label>
                              ) : (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await hotline3cxAutoService.updateMember(m.id, {
                                        is_active: !m.is_active,
                                      });
                                      fetchMembers();
                                    } catch (err: unknown) {
                                      const msg = err instanceof Error ? err.message : String(err);
                                      notify(`Lỗi đổi trạng thái: ${msg}`, 'error');
                                    }
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: m.is_active
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : 'rgba(239, 68, 68, 0.12)',
                                    color: m.is_active ? '#059669' : '#dc2626',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                  }}
                                >
                                  {m.is_active ? (
                                    <>
                                      <CheckCircle2 size={12} />
                                      <span>Hoạt động</span>
                                    </>
                                  ) : (
                                    <>
                                      <X size={12} />
                                      <span>Tạm tắt</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </td>

                            {/* Thao tác Sửa / Xóa */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditMember(m.id)}
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      borderRadius: '4px',
                                      border: 'none',
                                      backgroundColor: '#2563eb',
                                      color: '#fff',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingMemberId(null)}
                                    style={{
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      borderRadius: '4px',
                                      border: '1px solid var(--border-color)',
                                      backgroundColor: 'var(--bg-primary)',
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditMember(m)}
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      color: '#2563eb',
                                      cursor: 'pointer',
                                      padding: '2px',
                                    }}
                                    title="Chỉnh sửa thông tin"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMember(m.id, m.full_name)}
                                    style={{
                                      border: 'none',
                                      background: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '2px',
                                    }}
                                    title="Xóa nhân sự"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ══ TAB 3: CẤU HÌNH 3CX & EMAIL ══ */}
          {activeTab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {loadingConfig ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '40px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Đang tải cấu hình cổng 3CX...</span>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveConfig}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    backgroundColor: 'var(--bg-primary)',
                    padding: '18px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {/* Nhóm cổng 3CX portal */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        URL Cổng 3CX Web Portal *
                      </label>
                      <input
                        type="url"
                        value={configForm.portal_url || ''}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, portal_url: e.target.value }))
                        }
                        placeholder="https://ggg.ringbot.co:5001/#/login"
                        required
                        style={{
                          padding: '7px 10px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tài Khoản Đăng Nhập 3CX (Username) *
                      </label>
                      <input
                        type="text"
                        value={configForm.username || ''}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="VD: 8740"
                        required
                        style={{
                          padding: '7px 10px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Mật Khẩu 3CX (Password)
                    </label>
                    <input
                      type="password"
                      value={configForm.password || ''}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                      placeholder={
                        config?.has_password
                          ? 'Đã lưu an toàn trong hệ thống — chỉ nhập mật khẩu mới nếu muốn thay đổi'
                          : 'Chưa có mật khẩu — vui lòng nhập mật khẩu cổng 3CX'
                      }
                      style={{
                        padding: '7px 10px',
                        fontSize: '12.5px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {config?.has_password ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>
                          ✓ Hệ thống đã lưu trữ mật khẩu đã mã hóa an toàn.
                        </span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>
                          ⚠ Chưa có mật khẩu portal 3CX. Playwright sẽ không thể đăng nhập!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tên 2 hàng đợi */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tên Hàng Đợi Ca Sáng (Day Queue) *
                      </label>
                      <input
                        type="text"
                        value={configForm.day_queue_name || ''}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, day_queue_name: e.target.value }))
                        }
                        placeholder="IT HCM App Day"
                        required
                        style={{
                          padding: '7px 10px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Tên Hàng Đợi Ca Tối / Cuối Tuần (Night Queue) *
                      </label>
                      <input
                        type="text"
                        value={configForm.night_queue_name || ''}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, night_queue_name: e.target.value }))
                        }
                        placeholder="IT HCM App Night"
                        required
                        style={{
                          padding: '7px 10px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Giờ chạy ca sáng & ca chiều */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Giờ Chạy Ca Sáng (HH:mm 24h) *
                      </label>
                      <input
                        type="text"
                        value={configForm.morning_time || ''}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, morning_time: e.target.value }))
                        }
                        placeholder="06:00"
                        required
                        style={{
                          padding: '7px 10px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Giờ Chạy Ca Chiều (HH:mm 24h) *
                      </label>
                      <input
                        type="text"
                        value={configForm.evening_time || ''}
                        onChange={(e) =>
                          setConfigForm((prev) => ({ ...prev, evening_time: e.target.value }))
                        }
                        placeholder="16:29"
                        required
                        style={{
                          padding: '7px 10px',
                          fontSize: '12.5px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Email cảnh báo khi lỗi */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Danh Sách Email Nhận Cảnh Báo Khi Lỗi (phân cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      value={configForm.alert_emails || ''}
                      onChange={(e) =>
                        setConfigForm((prev) => ({ ...prev, alert_emails: e.target.value }))
                      }
                      placeholder="dung.nguyenanh@ggg.com.vn"
                      style={{
                        padding: '7px 10px',
                        fontSize: '12.5px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Khi quy trình Playwright gặp sự cố sau 3 lần thử lại, hệ thống sẽ gửi email kèm ảnh chụp lỗi đến danh sách này.
                    </div>
                  </div>

                  {/* Nút lưu cấu hình */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={savingConfig}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 20px',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    >
                      {savingConfig ? (
                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Save size={14} />
                      )}
                      <span>Lưu Cấu Hình</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ══ TAB 4: LỊCH SỬ THỰC THI & ẢNH ══ */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Hiển thị 50 lượt đồng bộ tự động và chạy thử gần nhất:
                </span>
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={loadingLogs}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw
                    size={13}
                    style={{ animation: loadingLogs ? 'spin 1s linear infinite' : 'none' }}
                  />
                  <span>Tải Lại Nhật Ký</span>
                </button>
              </div>

              <div
                style={{
                  maxHeight: '52vh',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                }}
              >
                {loadingLogs ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '40px',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                    }}
                  >
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang tải nhật ký đồng bộ...</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '13px',
                    }}
                  >
                    Chưa có nhật ký đồng bộ nào được ghi nhận.
                  </div>
                ) : (
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '12px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                          backgroundColor: 'var(--bg-secondary)',
                          borderBottom: '2px solid var(--border-color)',
                        }}
                      >
                        <th style={{ padding: '10px 12px', width: '130px', fontWeight: 700 }}>
                          Thời Gian (24h)
                        </th>
                        <th style={{ padding: '10px 12px', width: '100px', fontWeight: 700 }}>
                          Ngày Trực
                        </th>
                        <th style={{ padding: '10px 12px', width: '100px', fontWeight: 700 }}>
                          Ca Trực
                        </th>
                        <th style={{ padding: '10px 12px', width: '150px', fontWeight: 700 }}>
                          Hàng Đợi
                        </th>
                        <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line Áp Dụng</th>
                        <th style={{ padding: '10px 12px', width: '110px', fontWeight: 700 }}>
                          Trạng Thái
                        </th>
                        <th style={{ padding: '10px 12px', width: '100px', fontWeight: 700 }}>
                          Kích Hoạt
                        </th>
                        <th
                          style={{
                            padding: '10px 12px',
                            width: '100px',
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        >
                          Ảnh Chụp
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        let statusColor = '#059669';
                        let statusBg = 'rgba(16, 185, 129, 0.12)';
                        let statusLabel = 'Thành công';

                        if (log.status === 'FAILED') {
                          statusColor = '#dc2626';
                          statusBg = 'rgba(239, 68, 68, 0.12)';
                          statusLabel = 'Thất bại';
                        } else if (log.status === 'SKIPPED') {
                          statusColor = '#d97706';
                          statusBg = 'rgba(245, 158, 11, 0.12)';
                          statusLabel = 'Bỏ qua (Rỗng)';
                        } else if (log.is_dry_run) {
                          statusColor = '#2563eb';
                          statusBg = 'rgba(37, 99, 235, 0.12)';
                          statusLabel = 'Chạy thử';
                        }

                        return (
                          <tr
                            key={log.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                            }}
                          >
                            {/* Thời gian */}
                            <td style={{ padding: '8px 12px', fontSize: '11.5px' }}>
                              {log.started_at ? formatDateTimeDDMMYYYY(log.started_at) : '—'}
                            </td>

                            {/* Ngày trực */}
                            <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                              {formatDateDDMMYYYY(log.duty_date)}
                            </td>

                            {/* Ca trực */}
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  backgroundColor:
                                    log.shift_code === 'MORNING'
                                      ? 'rgba(59, 130, 246, 0.1)'
                                      : 'rgba(139, 92, 246, 0.1)',
                                  color: log.shift_code === 'MORNING' ? '#2563eb' : '#7c3aed',
                                }}
                              >
                                {log.shift_code === 'MORNING' ? 'Sáng 06:00' : 'Chiều 16:29'}
                              </span>
                            </td>

                            {/* Hàng đợi */}
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                              {log.queue_name || '—'}
                            </td>

                            {/* Line áp dụng */}
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {(log.applied_lines || []).map((it, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      fontSize: '10.5px',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      backgroundColor: 'var(--bg-primary)',
                                      border: '1px solid var(--border-color)',
                                    }}
                                  >
                                    <span>{it.ext_line || String(it)}</span>
                                    {it.skill_group && (
                                      <span style={{ color: '#d97706', fontSize: '9.5px' }}>
                                        ({it.skill_group})
                                      </span>
                                    )}
                                  </span>
                                ))}
                                {(!log.applied_lines || log.applied_lines.length === 0) && (
                                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>
                                    (Không có line)
                                  </span>
                                )}
                              </div>
                              {log.error_message && (
                                <div
                                  style={{
                                    marginTop: '4px',
                                    fontSize: '11px',
                                    color: '#dc2626',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  Lỗi: {log.error_message}
                                </div>
                              )}
                            </td>

                            {/* Trạng thái */}
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  backgroundColor: statusBg,
                                  color: statusColor,
                                }}
                              >
                                {statusLabel}
                              </span>
                            </td>

                            {/* Kích hoạt */}
                            <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {log.triggered_by || 'Scheduler'}
                            </td>

                            {/* Ảnh chụp màn hình */}
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {log.screenshot_path ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const p = log.screenshot_path || '';
                                    const cleanUrl = p.startsWith('/') ? p : `/${p}`;
                                    setSelectedScreenshotUrl(cleanUrl);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    borderRadius: '4px',
                                    border: '1px solid #3b82f6',
                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                    color: '#2563eb',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Eye size={12} />
                                  <span>Xem Ảnh</span>
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ══ LIGHTBOX MODAL XEM ẢNH CHỤP PLAYWRIGHT ══ */}
      {selectedScreenshotUrl && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedScreenshotUrl(null)}
          title="Ảnh Chụp Màn Hình Cổng 3CX (Playwright Screenshot)"
          maxWidth="980px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                Đường dẫn ảnh: <code>{selectedScreenshotUrl}</code>
              </span>
              <a
                href={selectedScreenshotUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: '#2563eb',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <span>Mở tab mới</span>
                <ExternalLink size={13} />
              </a>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#111827',
                borderRadius: '8px',
                padding: '8px',
                maxHeight: '70vh',
                overflow: 'auto',
              }}
            >
              <img
                src={selectedScreenshotUrl}
                alt="3CX Portal Screenshot"
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL XÁC NHẬN "ÁP DỤNG CA NGAY" (BẢO VỆ 2 LỚP AN TOÀN) ══ */}
      {showApplyNowModal && (
        <Modal
          isOpen={true}
          onClose={() => !executingApplyNow && setShowApplyNowModal(false)}
          title="Xác Nhận Áp Dụng Ca Trực Vào 3CX Portal Ngay Lập Tức"
          maxWidth="560px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Warning banner */}
            <div
              style={{
                display: 'flex',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                border: '1px solid rgba(217, 119, 6, 0.3)',
                color: '#b45309',
                fontSize: '12.5px',
                lineHeight: 1.5,
              }}
            >
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
              <div>
                <strong>LƯU Ý QUAN TRỌNG:</strong> Thao tác này sẽ mở trình duyệt Playwright, đăng nhập cổng 3CX thật, xóa danh sách nhân sự hiện tại trong hàng đợi và <strong>LƯU NGAY LẬP TỨC</strong> danh sách line theo lịch đã thiết lập.
              </div>
            </div>

            {/* Chọn Ngày và Ca */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Ngày Trực Áp Dụng (dd-mm-yyyy) *
                </label>
                <DateInput
                  value={applyNowDate}
                  onChange={(val) => setApplyNowDate(val || getTodayIsoDate())}
                  placeholder="Chọn ngày trực"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Ca Trực Cần Áp Dụng *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setApplyNowShift('MORNING')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: applyNowShift === 'MORNING' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                      backgroundColor: applyNowShift === 'MORNING' ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                      Ca Sáng (06:00)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Day Queue: T2–T6 Song Song
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApplyNowShift('EVENING')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '4px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: applyNowShift === 'EVENING' ? '2px solid #7c3aed' : '1px solid var(--border-color)',
                      backgroundColor: applyNowShift === 'EVENING' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#7c3aed' }}>
                      Ca Chiều / Tối (16:29)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Night Queue: Chính (1) / Phụ (2)
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setShowApplyNowModal(false)}
                disabled={executingApplyNow}
              >
                Hủy Bỏ
              </Button>
              <button
                type="button"
                onClick={handleConfirmApplyNow}
                disabled={executingApplyNow}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  cursor: executingApplyNow ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)',
                }}
              >
                {executingApplyNow ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang Đồng Bộ Portal 3CX (vui lòng chờ)...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>Xác Nhận Áp Dụng Ngay Vào 3CX</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL "ÁP DỤNG MẪU CHO CẢ THÁNG" ══ */}
      {showApplyMonthModal && (
        <Modal
          isOpen={true}
          onClose={() => !applyingMonth && setShowApplyMonthModal(false)}
          title="Áp Dụng Mẫu 7 Ngày Cho Toàn Bộ Tháng"
          maxWidth="500px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Hệ thống sẽ lấy lịch 7 ngày (Thứ Hai đến Chủ Nhật) của tuần hiện tại làm mẫu và điền vào toàn bộ các ngày tương ứng trong tháng được chọn.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Tháng Mục Tiêu (mm-yyyy) *
              </label>
              <MonthInput
                value={targetMonth}
                onChange={(m) => setTargetMonth(m || getCurrentIsoMonth())}
                placeholder="mm-yyyy"
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
              }}
            >
              <input
                type="checkbox"
                checked={overwriteMonth}
                onChange={(e) => setOverwriteMonth(e.target.checked)}
              />
              <span>Ghi đè lên các ngày đã có cấu hình riêng trong tháng</span>
            </label>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setShowApplyMonthModal(false)}
                disabled={applyingMonth}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleApplyMonthTemplate}
                disabled={applyingMonth}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {applyingMonth ? (
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <ArrowRight size={13} />
                )}
                <span>Thực Hiện Áp Dụng</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
