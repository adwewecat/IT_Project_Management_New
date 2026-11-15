import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Calendar,
  Users,
  Settings,
  History,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import {
  Hotline3cxConfig,
  Hotline3cxConfigUpdate,
  Hotline3cxMember,
  Hotline3cxMemberCreate,
  Hotline3cxScheduleDay,
  Hotline3cxSyncLog,
  ScheduleDayUpsertItem,
  ShiftCode,
} from '../../types/hotline3cxAuto';
import { hotline3cxAutoService } from '../../services/hotline3cxAutoService';
import {
  extractApiErrorMessage,
  getMondayOfIso,
  addDaysToIso,
} from './hotline3cx/hotline3cxHelpers';
import { ScheduleTab } from './hotline3cx/ScheduleTab';
import { MembersTab } from './hotline3cx/MembersTab';
import { ConfigTab } from './hotline3cx/ConfigTab';
import { LogsTab } from './hotline3cx/LogsTab';
import { ApplyNowConfirmModal } from './hotline3cx/ApplyNowConfirmModal';
import { ApplyMonthModal } from './hotline3cx/ApplyMonthModal';
import { ScreenshotLightboxModal } from './hotline3cx/ScreenshotLightboxModal';
import {
  formatDateDDMMYYYY,
  getTodayIsoDate,
  getCurrentIsoMonth,
} from '../../utils/dateFormat';

export interface Hotline3cxDutyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'schedule' | 'members' | 'config' | 'logs';
  initialOpenApplyConfirm?: boolean;
  onSyncTriggered?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Hotline3cxDutyModal: React.FC<Hotline3cxDutyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'schedule',
  initialOpenApplyConfirm = false,
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

  // Áp dụng mẫu tháng modal state
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

  // Theo dõi trạng thái mở modal lần trước để tránh tải lại lịch khi chuyển tab
  const wasOpenRef = useRef<boolean>(false);

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

  // Load members
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const data = await hotline3cxAutoService.getMembers();
      setMembers(data);
    } catch (err: unknown) {
      notify(`Không thể tải danh sách nhân sự: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [notify]);

  // Load schedules for the given Monday week
  const fetchSchedules = useCallback(
    async (mondayIso: string) => {
      setLoadingSchedules(true);
      try {
        const sundayIso = addDaysToIso(mondayIso, 6);
        const data = await hotline3cxAutoService.getSchedules(mondayIso, sundayIso);
        setSchedules(data);
        setHasUnsavedChanges(false);
      } catch (err: unknown) {
        notify(`Không thể tải lịch trực tuần: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Không thể tải cấu hình 3CX: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Không thể tải nhật ký đồng bộ: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setLoadingLogs(false);
    }
  }, [notify]);

  // Khi modal mở từ đóng -> mở: nạp dữ liệu ban đầu
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveTab(initialTab);
      fetchMembers();
      fetchSchedules(currentMonday);
      if (initialOpenApplyConfirm) {
        setApplyNowDate(getTodayIsoDate());
        setShowApplyNowModal(true);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialTab, initialOpenApplyConfirm, currentMonday, fetchMembers, fetchSchedules]);

  // Khi người dùng chuyển tab: chỉ nạp dữ liệu của tab đích nếu chưa có (KHÔNG nạp lại schedules để giữ unsaved edits)
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'config') {
      fetchConfig();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'members') {
      fetchMembers();
    }
    // LƯU Ý: Không gọi fetchSchedules ở đây để tránh làm mất các thay đổi chưa lưu của người dùng ở Tab 1!
  }, [isOpen, activeTab, fetchConfig, fetchLogs, fetchMembers]);

  // Khi người dùng đổi tuần (currentMonday): chỉ fetch khi modal đang mở
  useEffect(() => {
    if (!isOpen) return;
    fetchSchedules(currentMonday);
  }, [isOpen, currentMonday, fetchSchedules]);

  // Active members memo
  const activeMembers = useMemo(() => {
    return members.filter((m) => m.is_active).sort((a, b) => a.sort_order - b.sort_order);
  }, [members]);

  const memberMap = useMemo(() => {
    const map = new Map<string, Hotline3cxMember>();
    members.forEach((m) => map.set(m.ext_line, m));
    return map;
  }, [members]);

  // Navigation handlers for week with unsaved changes guard
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

  const handleGoToThisWeek = () => {
    const todayMon = getMondayOfIso(getTodayIsoDate());
    if (todayMon === currentMonday) return;
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm(
        'Bạn có thay đổi chưa lưu trong tuần này! Chuyển tuần khác sẽ làm mất các chỉnh sửa chưa lưu. Tiếp tục?'
      );
      if (!confirmLeave) return;
    }
    setCurrentMonday(todayMon);
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
      notify(`Lỗi khi lưu lịch trực: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(
        `Đã sao chép toàn bộ lịch trực từ tuần trước sang tuần ${formatDateDDMMYYYY(currentMonday)}!`,
        'success'
      );
    } catch (err: unknown) {
      notify(`Lỗi khi sao chép tuần trước: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi khi áp dụng mẫu tháng: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi kích hoạt chạy thử: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi khi đồng bộ vào 3CX: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi khi thêm nhân sự: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi khi cập nhật nhân sự: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi khi xóa nhân sự: ${extractApiErrorMessage(err)}`, 'error');
    }
  };

  const handleToggleMemberActive = async (m: Hotline3cxMember) => {
    try {
      await hotline3cxAutoService.updateMember(m.id, {
        is_active: !m.is_active,
      });
      fetchMembers();
    } catch (err: unknown) {
      notify(`Lỗi đổi trạng thái: ${extractApiErrorMessage(err)}`, 'error');
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
      notify(`Lỗi khi lưu cấu hình: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

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
            <ScheduleTab
              schedules={schedules}
              loadingSchedules={loadingSchedules}
              savingSchedules={savingSchedules}
              cloningWeek={cloningWeek}
              executingDryRun={executingDryRun}
              hasUnsavedChanges={hasUnsavedChanges}
              currentMonday={currentMonday}
              activeMembers={activeMembers}
              memberMap={memberMap}
              onNavigateWeek={handleNavigateWeek}
              onJumpToWeek={handleJumpToWeek}
              onGoToThisWeek={handleGoToThisWeek}
              onClonePreviousWeek={handleClonePreviousWeek}
              onOpenApplyMonthModal={() => setShowApplyMonthModal(true)}
              onSaveSchedules={handleSaveSchedules}
              onQuickDryRun={handleQuickDryRun}
              onOpenApplyNowModal={() => {
                setApplyNowDate(getTodayIsoDate());
                setShowApplyNowModal(true);
              }}
              onUpdateScheduleRow={handleUpdateScheduleRow}
            />
          )}

          {/* ══ TAB 2: THÀNH VIÊN TRỰC ══ */}
          {activeTab === 'members' && (
            <MembersTab
              members={members}
              loadingMembers={loadingMembers}
              savingMember={savingMember}
              editingMemberId={editingMemberId}
              editingMemberForm={editingMemberForm}
              newMemberForm={newMemberForm}
              onNewMemberFormChange={setNewMemberForm}
              onEditingMemberFormChange={setEditingMemberForm}
              onCreateMember={handleCreateMember}
              onStartEditMember={handleStartEditMember}
              onCancelEditMember={() => setEditingMemberId(null)}
              onSaveEditMember={handleSaveEditMember}
              onDeleteMember={handleDeleteMember}
              onToggleMemberActive={handleToggleMemberActive}
            />
          )}

          {/* ══ TAB 3: CẤU HÌNH 3CX & EMAIL ══ */}
          {activeTab === 'config' && (
            <ConfigTab
              config={config}
              configForm={configForm}
              loadingConfig={loadingConfig}
              savingConfig={savingConfig}
              onConfigFormChange={setConfigForm}
              onSaveConfig={handleSaveConfig}
            />
          )}

          {/* ══ TAB 4: LỊCH SỬ THỰC THI & ẢNH ══ */}
          {activeTab === 'logs' && (
            <LogsTab
              logs={logs}
              loadingLogs={loadingLogs}
              onRefreshLogs={fetchLogs}
              onViewScreenshot={(screenshotPath) => {
                const cleanUrl = screenshotPath.startsWith('/') ? screenshotPath : `/${screenshotPath}`;
                setSelectedScreenshotUrl(cleanUrl);
              }}
            />
          )}
        </div>
      </Modal>

      {/* ══ LIGHTBOX MODAL XEM ẢNH CHỤP PLAYWRIGHT ══ */}
      {selectedScreenshotUrl && (
        <ScreenshotLightboxModal
          imageUrl={selectedScreenshotUrl}
          onClose={() => setSelectedScreenshotUrl(null)}
        />
      )}

      {/* ══ MODAL XÁC NHẬN "ÁP DỤNG CA NGAY" (BẢO VỆ 2 LỚP AN TOÀN) ══ */}
      {showApplyNowModal && (
        <ApplyNowConfirmModal
          isOpen={showApplyNowModal}
          onClose={() => setShowApplyNowModal(false)}
          applyDate={applyNowDate}
          onApplyDateChange={(val) => setApplyNowDate(val || getTodayIsoDate())}
          applyShift={applyNowShift}
          onApplyShiftChange={setApplyNowShift}
          executing={executingApplyNow}
          onConfirm={handleConfirmApplyNow}
        />
      )}

      {/* ══ MODAL "ÁP DỤNG MẪU CHO CẢ THÁNG" ══ */}
      {showApplyMonthModal && (
        <ApplyMonthModal
          isOpen={showApplyMonthModal}
          onClose={() => setShowApplyMonthModal(false)}
          targetMonth={targetMonth}
          onTargetMonthChange={(m) => setTargetMonth(m || getCurrentIsoMonth())}
          overwrite={overwriteMonth}
          onOverwriteChange={setOverwriteMonth}
          applying={applyingMonth}
          onConfirm={handleApplyMonthTemplate}
        />
      )}
    </>
  );
};
