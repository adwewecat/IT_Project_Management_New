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
  Hotline3cxHoliday,
  Hotline3cxMember,
  Hotline3cxMemberCreate,
  Hotline3cxScheduleDay,
  Hotline3cxSyncLog,
  HotlineHolidayBatchCreateRequest,
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
import { HolidayManagerModal } from './hotline3cx/HolidayManagerModal';
import { ScreenshotLightboxModal } from './hotline3cx/ScreenshotLightboxModal';
import {
  formatDateDDMMYYYY,
  getTodayIsoDate,
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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Quản lý Ngày Lễ Riêng modal state
  const [holidays, setHolidays] = useState<Hotline3cxHoliday[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState<boolean>(false);
  const [savingHolidays, setSavingHolidays] = useState<boolean>(false);
  const [showHolidayModal, setShowHolidayModal] = useState<boolean>(false);
  const [holidayModalInitialDate, setHolidayModalInitialDate] = useState<string | undefined>(
    undefined
  );

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
  const [regeneratingToken, setRegeneratingToken] = useState<boolean>(false);
  const [downloadingPackage, setDownloadingPackage] = useState<boolean>(false);

  // ── Tab 4: Logs State ──
  const [logs, setLogs] = useState<Hotline3cxSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [selectedScreenshotUrl, setSelectedScreenshotUrl] = useState<string | null>(null);
  const [cancellingLogId, setCancellingLogId] = useState<number | null>(null);
  const [cancellingAllLogs, setCancellingAllLogs] = useState<boolean>(false);

  // ── Action: Apply Now Modal State (Bảo vệ 2 lớp an toàn) ──
  const [showApplyNowModal, setShowApplyNowModal] = useState<boolean>(false);
  const [applyNowDate, setApplyNowDate] = useState<string>(() => getTodayIsoDate());
  const [applyNowShift, setApplyNowShift] = useState<ShiftCode>('MORNING');
  const [applyNowForceDirect, setApplyNowForceDirect] = useState<boolean>(false);
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

  // Đồng bộ metadata Ngày Lễ Riêng lên lưới tuần hiện tại mà KHÔNG làm mất các chỉnh sửa chưa lưu
  const syncHolidaysOntoSchedules = useCallback(
    (
      holList: Hotline3cxHoliday[],
      forceWeekendAssign?: { dates: Set<string>; lines: string[] }
    ) => {
      const holMap = new Map<string, Hotline3cxHoliday>();
      holList.forEach((h) => holMap.set(h.holiday_date, h));

      setSchedules((prev) =>
        prev.map((d) => {
          const matched = holMap.get(d.duty_date);
          const isHol = Boolean(matched);
          const nextMode =
            d.shift_mode === 'WEEKDAY' || d.shift_mode === 'WEEKEND'
              ? d.shift_mode
              : isHol || d.is_weekend
                ? 'WEEKEND'
                : 'WEEKDAY';

          const shouldUpdateLines =
            forceWeekendAssign &&
            forceWeekendAssign.dates.has(d.duty_date) &&
            forceWeekendAssign.lines.length > 0;

          return {
            ...d,
            is_custom_holiday: isHol,
            holiday_name: matched ? matched.name : null,
            effective_mode: nextMode,
            weekend_lines: shouldUpdateLines ? [...forceWeekendAssign.lines] : d.weekend_lines,
          };
        })
      );
    },
    []
  );

  // Load danh mục Ngày Lễ Riêng
  const fetchHolidays = useCallback(async () => {
    setLoadingHolidays(true);
    try {
      const data = await hotline3cxAutoService.getHolidays();
      setHolidays(data);
      syncHolidaysOntoSchedules(data);
    } catch (err: unknown) {
      notify(`Không thể tải danh sách ngày lễ: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setLoadingHolidays(false);
    }
  }, [notify, syncHolidaysOntoSchedules]);

  // Load config (hỗ trợ silent polling cho banner trạng thái Relay ở Tab Logs)
  const fetchConfig = useCallback(
    async (silent: boolean = false) => {
      if (!silent) {
        setLoadingConfig(true);
      }
      try {
        const data = await hotline3cxAutoService.getConfig();
        setConfig(data);
        if (!silent) {
          setConfigForm((prev) => ({
            portal_url: data.portal_url,
            username: data.username,
            password: prev.password || '',
            day_queue_name: data.day_queue_name,
            night_queue_name: data.night_queue_name,
            morning_time: data.morning_time,
            evening_time: data.evening_time,
            alert_emails: data.alert_emails,
            execution_mode: data.execution_mode || 'DIRECT',
          }));
        }
      } catch (err: unknown) {
        if (!silent) {
          notify(`Không thể tải cấu hình 3CX: ${extractApiErrorMessage(err)}`, 'error');
        }
      } finally {
        if (!silent) {
          setLoadingConfig(false);
        }
      }
    },
    [notify]
  );

  // Load logs (hỗ trợ silent polling cho Relay Worker đang chạy)
  const fetchLogs = useCallback(
    async (silent: boolean = false) => {
      if (!silent) {
        setLoadingLogs(true);
      }
      try {
        const data = await hotline3cxAutoService.getLogs(50);
        setLogs(data);
      } catch (err: unknown) {
        if (!silent) {
          notify(`Không thể tải nhật ký đồng bộ: ${extractApiErrorMessage(err)}`, 'error');
        }
      } finally {
        if (!silent) {
          setLoadingLogs(false);
        }
      }
    },
    [notify]
  );

  // Khi modal mở từ đóng -> mở: nạp dữ liệu ban đầu
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setActiveTab(initialTab);
      setApplyNowForceDirect(false);
      fetchMembers();
      fetchHolidays();
      fetchSchedules(currentMonday);
      fetchConfig(true);
      if (initialOpenApplyConfirm) {
        setApplyNowDate(getTodayIsoDate());
        setShowApplyNowModal(true);
      }
    }
    wasOpenRef.current = isOpen;
  }, [
    isOpen,
    initialTab,
    initialOpenApplyConfirm,
    currentMonday,
    fetchMembers,
    fetchHolidays,
    fetchSchedules,
    fetchConfig,
  ]);

  // Khi người dùng chuyển tab: chỉ nạp dữ liệu của tab đích nếu chưa có (KHÔNG nạp lại schedules để giữ unsaved edits)
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'config') {
      fetchConfig(false);
    } else if (activeTab === 'logs') {
      fetchLogs();
      fetchConfig(true);
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

  // Tự động cập nhật nhật ký mỗi 3 giây khi đang có tác vụ Relay ở trạng thái PENDING / RUNNING
  useEffect(() => {
    if (!isOpen || activeTab !== 'logs') return;
    const hasActiveRelay = logs.some((l) => l.status === 'PENDING' || l.status === 'RUNNING');
    if (!hasActiveRelay) return;
    const timer = window.setInterval(() => {
      fetchLogs(true);
      fetchConfig(true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isOpen, activeTab, logs, fetchLogs, fetchConfig]);

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

  // Kiểm tra định dạng giờ hẹn 24h HH:mm (cho phép rỗng nếu không hẹn)
  const isValidOptionalHHMM = (raw?: string | null): boolean => {
    const txt = (raw || '').trim();
    if (!txt) return true;
    const match = /^(\d{1,2}):(\d{2})$/.exec(txt);
    if (!match) return false;
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  // Save schedules
  const handleSaveSchedules = async () => {
    for (const d of schedules) {
      if (!isValidOptionalHHMM(d.morning_backup_time)) {
        notify(
          `Giờ hẹn Ca Sáng Backup ngày ${formatDateDDMMYYYY(d.duty_date)} không hợp lệ ("${d.morning_backup_time}"). Vui lòng nhập định dạng 24h HH:mm (VD: 11:30).`,
          'error'
        );
        return;
      }
      if (!isValidOptionalHHMM(d.evening_backup_time)) {
        notify(
          `Giờ hẹn Ca Tối Backup ngày ${formatDateDDMMYYYY(d.duty_date)} không hợp lệ ("${d.evening_backup_time}"). Vui lòng nhập định dạng 24h HH:mm (VD: 20:00).`,
          'error'
        );
        return;
      }
    }

    setSavingSchedules(true);
    try {
      const payload: ScheduleDayUpsertItem[] = schedules.map((d) => ({
        duty_date: d.duty_date,
        shift_mode: d.shift_mode,
        morning_lines: d.morning_lines || [],
        evening_lines: d.evening_lines || [],
        weekend_lines: d.weekend_lines || [],
        weekend_evening_override: d.weekend_evening_override || [],
        morning_backup_time: (d.morning_backup_time || '').trim() || null,
        morning_backup_lines: (d.morning_backup_lines || []).filter(Boolean),
        evening_backup_time: (d.evening_backup_time || '').trim() || null,
        evening_backup_lines: (d.evening_backup_lines || []).filter(Boolean),
        note: d.note || null,
      }));
      const updated = await hotline3cxAutoService.saveSchedules(payload);
      setSchedules(updated);
      setHasUnsavedChanges(false);
      notify('Đã lưu thành công lịch trực tuần và lịch hẹn Backup Manual!', 'success');
    } catch (err: unknown) {
      notify(`Lỗi khi lưu lịch trực: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setSavingSchedules(false);
    }
  };

  // Thêm Ngày Lễ Riêng (giữ nguyên các chỉnh sửa chưa lưu trên lưới)
  const handleAddHolidays = async (payload: HotlineHolidayBatchCreateRequest): Promise<boolean> => {
    setSavingHolidays(true);
    try {
      const created = await hotline3cxAutoService.addHolidays(payload);
      const updatedAll = await hotline3cxAutoService.getHolidays();
      setHolidays(updatedAll);
      syncHolidaysOntoSchedules(updatedAll, {
        dates: new Set(created.map((h) => h.holiday_date)),
        lines: payload.weekend_lines || [],
      });
      notify(`Đã lưu ${created.length} ngày lễ riêng thành công!`, 'success');
      return true;
    } catch (err: unknown) {
      notify(`Lỗi khi lưu ngày lễ: ${extractApiErrorMessage(err)}`, 'error');
      return false;
    } finally {
      setSavingHolidays(false);
    }
  };

  // Xóa Ngày Lễ Riêng theo ID (giữ nguyên các chỉnh sửa chưa lưu khác)
  const handleDeleteHoliday = async (holidayId: number): Promise<void> => {
    try {
      const targetHol = holidays.find((h) => h.id === holidayId);
      await hotline3cxAutoService.deleteHoliday(holidayId);
      const updatedAll = await hotline3cxAutoService.getHolidays();
      setHolidays(updatedAll);
      if (targetHol) {
        setSchedules((prev) =>
          prev.map((d) =>
            d.duty_date === targetHol.holiday_date && !d.is_weekend && d.shift_mode === 'WEEKEND'
              ? { ...d, shift_mode: 'AUTO' }
              : d
          )
        );
      }
      syncHolidaysOntoSchedules(updatedAll);
      notify('Đã xóa ngày lễ riêng thành công!', 'success');
    } catch (err: unknown) {
      notify(`Lỗi khi xóa ngày lễ: ${extractApiErrorMessage(err)}`, 'error');
    }
  };

  // Bật / Bỏ nhanh Ngày Lễ từ từng dòng trong lưới tuần
  const handleQuickToggleHoliday = async (day: Hotline3cxScheduleDay) => {
    if (day.is_custom_holiday) {
      let targetHol = holidays.find((h) => h.holiday_date === day.duty_date);
      if (!targetHol) {
        const fresh = await hotline3cxAutoService.getHolidays();
        setHolidays(fresh);
        targetHol = fresh.find((h) => h.holiday_date === day.duty_date);
      }
      if (targetHol) {
        await handleDeleteHoliday(targetHol.id);
      }
    } else {
      setHolidayModalInitialDate(day.duty_date);
      setShowHolidayModal(true);
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
      } else if (log.status === 'PENDING' || log.status === 'RUNNING') {
        notify(
          `Đã gửi lệnh chạy thử tới Relay Worker (Hàng đợi: ${log.queue_name}). Trạng thái sẽ tự cập nhật khi Worker hoàn tất!`,
          'info'
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

  // Hàm dùng chung thực thi áp dụng ca trực ngay (từ Modal xác nhận, bảng Lịch hoặc tab Nhật Ký)
  const executeApplyShift = async (opts: {
    dutyDate?: string;
    shiftCode?: ShiftCode;
    forceDirect?: boolean;
    closeConfirmModal?: boolean;
  }) => {
    setExecutingApplyNow(true);
    try {
      const log = await hotline3cxAutoService.applyNow({
        duty_date: opts.dutyDate,
        shift_code: opts.shiftCode,
        force_direct: Boolean(opts.forceDirect),
      });
      if (opts.closeConfirmModal) {
        setShowApplyNowModal(false);
      }

      if (log.status === 'SUCCESS') {
        notify(
          `Áp dụng thành công vào cổng 3CX! Hàng đợi: ${log.queue_name}, đã cập nhật ${log.applied_lines?.length || 0} line trực.`,
          'success'
        );
      } else if (log.status === 'PENDING' || log.status === 'RUNNING') {
        notify(
          `Đã đẩy lệnh áp dụng vào hàng đợi 3CX Relay Worker (${log.queue_name}). Hệ thống sẽ tự động cập nhật kết quả và ảnh chụp!`,
          'info'
        );
      } else if (log.status === 'SKIPPED') {
        notify(`Đã bỏ qua ca trực: ${log.error_message || 'Không có cấu hình line'}`, 'info');
      } else {
        notify(`Đồng bộ thất bại: ${log.error_message || 'Có lỗi xảy ra'}`, 'error');
      }
      setActiveTab('logs');
      fetchLogs();
      fetchConfig(true);
      if (onSyncTriggered) onSyncTriggered();
    } catch (err: unknown) {
      notify(`Lỗi khi đồng bộ vào 3CX: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setExecutingApplyNow(false);
    }
  };

  // Apply Now confirmation execute handler
  const handleConfirmApplyNow = async () => {
    await executeApplyShift({
      dutyDate: applyNowDate,
      shiftCode: applyNowShift,
      forceDirect: applyNowForceDirect,
      closeConfirmModal: true,
    });
  };

  // Quick apply for a single shift directly from a table row (Ca Sáng, Ca Tối, Backup Sáng, Backup Tối)
  const handleQuickApplyShift = async (dutyDate: string, shiftCode: ShiftCode) => {
    if (hasUnsavedChanges) {
      try {
        setSavingSchedules(true);
        await hotline3cxAutoService.saveSchedules(schedules);
        setHasUnsavedChanges(false);
      } catch (saveErr) {
        notify(`Không thể lưu lịch trước khi áp dụng: ${extractApiErrorMessage(saveErr)}`, 'error');
        return;
      } finally {
        setSavingSchedules(false);
      }
    }

    await executeApplyShift({
      dutyDate,
      shiftCode,
      forceDirect: false,
    });
  };

  // Chạy trực tiếp ngay từ Server (Direct, bỏ qua hàng chờ Relay) cho ca hiện tại hôm nay
  const handleRunDirectNowToday = async () => {
    const defaultShift: ShiftCode = new Date().getHours() < 12 ? 'MORNING' : 'EVENING';
    await executeApplyShift({
      dutyDate: getTodayIsoDate(),
      shiftCode: defaultShift,
      forceDirect: true,
    });
  };

  // Hủy 1 lệnh đang kẹt Chờ Relay trong tab Nhật Ký
  const handleCancelSyncLog = async (logId: number) => {
    setCancellingLogId(logId);
    try {
      await hotline3cxAutoService.cancelSyncLog(logId);
      notify('Đã hủy lệnh đang chờ Relay!', 'info');
      fetchLogs(true);
    } catch (err: unknown) {
      notify(`Không thể hủy lệnh #${logId}: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setCancellingLogId(null);
    }
  };

  // Hủy toàn bộ các lệnh đang Chờ Relay / Đang chạy
  const handleCancelAllPendingLogs = async () => {
    setCancellingAllLogs(true);
    try {
      const res = await hotline3cxAutoService.cancelAllPendingLogs();
      notify(`Đã hủy ${res.cancelled_count || 0} lệnh đang chờ Relay.`, 'info');
      fetchLogs(true);
    } catch (err: unknown) {
      notify(`Không thể hủy hàng chờ: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setCancellingAllLogs(false);
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
        execution_mode: configForm.execution_mode || 'DIRECT',
      };
      if (configForm.password && configForm.password.trim()) {
        payload.password = configForm.password.trim();
      }
      const updated = await hotline3cxAutoService.updateConfig(payload);
      setConfig(updated);
      setConfigForm((prev) => ({ ...prev, password: '', execution_mode: updated.execution_mode || 'DIRECT' }));
      notify('Đã lưu cấu hình 3CX & đồng bộ lịch tác vụ Scheduler thành công!', 'success');
    } catch (err: unknown) {
      notify(`Lỗi khi lưu cấu hình: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Tạo mới Relay Token bảo mật
  const handleRegenerateRelayToken = async () => {
    const confirmRegen = window.confirm(
      'Tạo Relay Token mới sẽ làm token cũ ngừng hoạt động (bạn cần tải lại bộ cài hoặc cập nhật relay_config.json trên PC Relay). Tiếp tục?'
    );
    if (!confirmRegen) return;
    setRegeneratingToken(true);
    try {
      const updated = await hotline3cxAutoService.regenerateRelayToken();
      setConfig(updated);
      notify('Đã tạo Relay Token mới thành công!', 'success');
    } catch (err: unknown) {
      notify(`Lỗi khi tạo Relay Token mới: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setRegeneratingToken(false);
    }
  };

  // Tải file ZIP bộ cài 3CX Sync Relay Worker
  const handleDownloadRelayPackage = async (serverUrl: string) => {
    setDownloadingPackage(true);
    try {
      const blob = await hotline3cxAutoService.downloadRelayPackage(serverUrl);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = '3CX_Sync_Relay_Worker.zip';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      notify('Đã tải gói 3CX_Sync_Relay_Worker.zip thành công!', 'success');
    } catch (err: unknown) {
      notify(`Lỗi tải gói Relay Worker: ${extractApiErrorMessage(err)}`, 'error');
    } finally {
      setDownloadingPackage(false);
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
        maxWidth="1480px"
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
              executingDryRun={executingDryRun}
              hasUnsavedChanges={hasUnsavedChanges}
              currentMonday={currentMonday}
              activeMembers={activeMembers}
              memberMap={memberMap}
              onNavigateWeek={handleNavigateWeek}
              onJumpToWeek={handleJumpToWeek}
              onGoToThisWeek={handleGoToThisWeek}
              holidaysCount={holidays.length}
              onOpenHolidayManagerModal={() => {
                setHolidayModalInitialDate(undefined);
                setShowHolidayModal(true);
                fetchHolidays();
              }}
              onQuickToggleHoliday={handleQuickToggleHoliday}
              onSaveSchedules={handleSaveSchedules}
              onQuickDryRun={handleQuickDryRun}
              onOpenApplyNowModal={() => {
                setApplyNowDate(getTodayIsoDate());
                setShowApplyNowModal(true);
              }}
              onQuickApplyShift={handleQuickApplyShift}
              executingApplyNow={executingApplyNow}
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
              regeneratingToken={regeneratingToken}
              downloadingPackage={downloadingPackage}
              onConfigFormChange={setConfigForm}
              onSaveConfig={handleSaveConfig}
              onRefreshConfig={fetchConfig}
              onRegenerateToken={handleRegenerateRelayToken}
              onDownloadRelayPackage={handleDownloadRelayPackage}
            />
          )}

          {/* ══ TAB 4: LỊCH SỬ THỰC THI & ẢNH ══ */}
          {activeTab === 'logs' && (
            <LogsTab
              logs={logs}
              loadingLogs={loadingLogs}
              config={config}
              executingAction={executingApplyNow}
              cancellingId={cancellingLogId}
              cancellingAll={cancellingAllLogs}
              onRefreshLogs={() => {
                fetchLogs(false);
                fetchConfig(true);
              }}
              onViewScreenshot={(screenshotPath) => {
                const cleanUrl = screenshotPath.startsWith('/') ? screenshotPath : `/${screenshotPath}`;
                setSelectedScreenshotUrl(cleanUrl);
              }}
              onOpenApplyNowModal={() => {
                setApplyNowDate(getTodayIsoDate());
                setApplyNowShift(new Date().getHours() < 12 ? 'MORNING' : 'EVENING');
                setShowApplyNowModal(true);
              }}
              onRunDirectNowToday={handleRunDirectNowToday}
              onApplyLogRow={(dutyDate, shiftCode, forceDirect) =>
                executeApplyShift({
                  dutyDate,
                  shiftCode,
                  forceDirect: Boolean(forceDirect),
                })
              }
              onCancelLog={handleCancelSyncLog}
              onCancelAllPending={handleCancelAllPendingLogs}
              onGoToConfigTab={() => setActiveTab('config')}
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
          executionMode={config?.execution_mode}
          relayOnline={config?.relay_online}
          forceDirect={applyNowForceDirect}
          onForceDirectChange={setApplyNowForceDirect}
          executing={executingApplyNow}
          onConfirm={handleConfirmApplyNow}
        />
      )}

      {/* ══ MODAL QUẢN LÝ NGÀY LỄ RIÊNG ══ */}
      {showHolidayModal && (
        <HolidayManagerModal
          isOpen={showHolidayModal}
          onClose={() => setShowHolidayModal(false)}
          initialStartDate={holidayModalInitialDate}
          holidays={holidays}
          loading={loadingHolidays}
          saving={savingHolidays}
          activeMembers={activeMembers}
          memberMap={memberMap}
          onAddHolidays={handleAddHolidays}
          onDeleteHoliday={handleDeleteHoliday}
          onJumpToWeek={handleJumpToWeek}
        />
      )}
    </>
  );
};
