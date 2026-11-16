import React from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarHeart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Play,
  RefreshCw,
  Save,
  X,
  Zap,
} from 'lucide-react';
import {
  Hotline3cxMember,
  Hotline3cxScheduleDay,
  ShiftMode,
} from '../../../types/hotline3cxAuto';
import { DateInput } from '../../ui/DateInput';
import { MemberSelectDropdown } from './MemberSelectDropdown';
import { addDaysToIso, getMondayOfIso } from './hotline3cxHelpers';
import { formatDateDDMMYYYY, getTodayIsoDate } from '../../../utils/dateFormat';

export interface ScheduleTabProps {
  schedules: Hotline3cxScheduleDay[];
  loadingSchedules: boolean;
  savingSchedules: boolean;
  cloningWeek: boolean;
  executingDryRun: boolean;
  hasUnsavedChanges: boolean;
  currentMonday: string;
  activeMembers: Hotline3cxMember[];
  memberMap: Map<string, Hotline3cxMember>;
  onNavigateWeek: (offsetDays: number) => void;
  onJumpToWeek: (isoVal: string) => void;
  onGoToThisWeek: () => void;
  onClonePreviousWeek: () => void;
  onOpenApplyMonthModal: () => void;
  holidaysCount: number;
  onOpenHolidayManagerModal: () => void;
  onQuickToggleHoliday: (day: Hotline3cxScheduleDay) => void;
  onSaveSchedules: () => void;
  onQuickDryRun: () => void;
  onOpenApplyNowModal: () => void;
  onUpdateScheduleRow: (
    dutyDate: string,
    updater: (prev: Hotline3cxScheduleDay) => Hotline3cxScheduleDay
  ) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  schedules,
  loadingSchedules,
  savingSchedules,
  cloningWeek,
  executingDryRun,
  hasUnsavedChanges,
  currentMonday,
  activeMembers,
  memberMap,
  onNavigateWeek,
  onJumpToWeek,
  onGoToThisWeek,
  onClonePreviousWeek,
  onOpenApplyMonthModal,
  holidaysCount,
  onOpenHolidayManagerModal,
  onQuickToggleHoliday,
  onSaveSchedules,
  onQuickDryRun,
  onOpenApplyNowModal,
  onUpdateScheduleRow,
}) => {
  const sundayOfCurrentWeek = addDaysToIso(currentMonday, 6);
  const isThisWeek = currentMonday === getMondayOfIso(getTodayIsoDate());

  return (
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
            onClick={() => onNavigateWeek(-7)}
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
            onClick={onGoToThisWeek}
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: isThisWeek ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-card)',
              color: isThisWeek ? '#2563eb' : 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            Tuần Này
          </button>

          <button
            type="button"
            onClick={() => onNavigateWeek(7)}
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
              onChange={onJumpToWeek}
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
            onClick={onClonePreviousWeek}
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
            onClick={onOpenApplyMonthModal}
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
            onClick={onOpenHolidayManagerModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: '#dc2626',
              cursor: 'pointer',
            }}
            title="Chọn ngày nào là Ngày Lễ Riêng (nghỉ lễ đột xuất / không theo lịch nhà nước)"
          >
            <CalendarHeart size={13} />
            <span>Ngày Lễ Riêng ({holidaysCount})</span>
          </button>

          <button
            type="button"
            onClick={onSaveSchedules}
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
                const isCustomHoliday = Boolean(day.is_custom_holiday);
                const isEffectiveWeekend =
                  day.shift_mode === 'WEEKEND' ||
                  (day.shift_mode === 'AUTO' && (isWeekendDay || isCustomHoliday));
                const isHolidayMode =
                  (isCustomHoliday && day.shift_mode !== 'WEEKDAY') ||
                  (!isWeekendDay && day.shift_mode === 'WEEKEND');
                const hasCustomOverride =
                  day.weekend_evening_override && day.weekend_evening_override.length > 0;

                return (
                  <tr
                    key={day.duty_date}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isHolidayMode
                        ? 'rgba(239, 68, 68, 0.04)'
                        : isWeekendDay
                          ? 'rgba(245, 158, 11, 0.03)'
                          : 'transparent',
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
                          backgroundColor: isHolidayMode
                            ? 'rgba(239, 68, 68, 0.12)'
                            : isWeekendDay
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(59, 130, 246, 0.1)',
                          color: isHolidayMode
                            ? '#dc2626'
                            : isWeekendDay
                              ? '#d97706'
                              : '#2563eb',
                        }}
                      >
                        {isHolidayMode ? '🎉 Ngày Lễ' : isWeekendDay ? 'Cuối tuần' : 'T2–T6'}
                      </span>
                      {isCustomHoliday && day.holiday_name && (
                        <div
                          style={{
                            marginTop: '3px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: '#dc2626',
                            lineHeight: 1.25,
                          }}
                        >
                          {day.holiday_name}
                        </div>
                      )}
                    </td>

                    {/* Cột 2: Chế độ ngày (AUTO / WEEKDAY / WEEKEND) + Nút Ngày Lễ nhanh */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                      <select
                        value={day.shift_mode}
                        onChange={(e) => {
                          const val = e.target.value as ShiftMode;
                          onUpdateScheduleRow(day.duty_date, (prev) => ({
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
                        <option value="AUTO">
                          {isCustomHoliday ? 'Tự Động (Đang là Ngày Lễ)' : 'Tự Động (T2–T6/T7–CN)'}
                        </option>
                        <option value="WEEKDAY">Ngày Thường (T2–T6)</option>
                        <option value="WEEKEND">Ngày Lễ / Cuối Tuần</option>
                      </select>

                      {isCustomHoliday ? (
                        <button
                          type="button"
                          onClick={() => onQuickToggleHoliday(day)}
                          style={{
                            marginTop: '6px',
                            width: '100%',
                            padding: '3px 6px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                          title="Xóa ngày này khỏi danh sách Ngày Lễ Riêng"
                        >
                          ✕ Bỏ Ngày Lễ
                        </button>
                      ) : (
                        !isWeekendDay && (
                          <button
                            type="button"
                            onClick={() => onQuickToggleHoliday(day)}
                            style={{
                              marginTop: '6px',
                              width: '100%',
                              padding: '3px 6px',
                              fontSize: '10.5px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: '1px solid rgba(245, 158, 11, 0.45)',
                              backgroundColor: 'rgba(245, 158, 11, 0.08)',
                              color: '#b45309',
                              cursor: 'pointer',
                            }}
                            title="Đánh dấu ngày này là Ngày Lễ Riêng"
                          >
                            🎉 Đặt Ngày Lễ
                          </button>
                        )
                      )}
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
                                      onUpdateScheduleRow(day.duty_date, (prev) => ({
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
                                onUpdateScheduleRow(day.duty_date, (prev) => ({
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
                          <MemberSelectDropdown
                            value={day.evening_lines?.[0] || ''}
                            onChange={(val) => {
                              const slot2 = day.evening_lines?.[1] || '';
                              const newLines = val ? (slot2 ? [val, slot2] : [val]) : (slot2 ? ['', slot2] : []);
                              onUpdateScheduleRow(day.duty_date, (prev) => ({
                                ...prev,
                                evening_lines: newLines,
                              }));
                            }}
                            activeMembers={activeMembers}
                            labelPrefix="1 (Chính):"
                            labelColor="#2563eb"
                          />

                          <MemberSelectDropdown
                            value={day.evening_lines?.[1] || ''}
                            onChange={(val) => {
                              const slot1 = day.evening_lines?.[0] || '';
                              const newLines = slot1 ? (val ? [slot1, val] : [slot1]) : (val ? ['', val] : []);
                              onUpdateScheduleRow(day.duty_date, (prev) => ({
                                ...prev,
                                evening_lines: newLines,
                              }));
                            }}
                            activeMembers={activeMembers}
                            labelPrefix="2 (Phụ):"
                            labelColor="#d97706"
                          />
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
                            <div style={{ flex: 1 }}>
                              <MemberSelectDropdown
                                value={day.weekend_lines?.[0] || ''}
                                onChange={(val) => {
                                  const slot2 = day.weekend_lines?.[1] || '';
                                  const newLines = val ? (slot2 ? [val, slot2] : [val]) : (slot2 ? ['', slot2] : []);
                                  onUpdateScheduleRow(day.duty_date, (prev) => ({
                                    ...prev,
                                    weekend_lines: newLines,
                                  }));
                                }}
                                activeMembers={activeMembers}
                                labelPrefix="Chính 06:00 (1):"
                                labelColor="#059669"
                              />
                            </div>

                            <div style={{ flex: 1 }}>
                              <MemberSelectDropdown
                                value={day.weekend_lines?.[1] || ''}
                                onChange={(val) => {
                                  const slot1 = day.weekend_lines?.[0] || '';
                                  const newLines = slot1 ? (val ? [slot1, val] : [slot1]) : (val ? ['', val] : []);
                                  onUpdateScheduleRow(day.duty_date, (prev) => ({
                                    ...prev,
                                    weekend_lines: newLines,
                                  }));
                                }}
                                activeMembers={activeMembers}
                                labelPrefix="Phụ 06:00 (2):"
                                labelColor="#d97706"
                              />
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
                                  onUpdateScheduleRow(day.duty_date, (prev) => ({
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
                                    onUpdateScheduleRow(day.duty_date, (prev) => ({
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
                                <div style={{ flex: 1 }}>
                                  <MemberSelectDropdown
                                    value={day.weekend_evening_override?.[0] || ''}
                                    onChange={(val) => {
                                      const slot2 = day.weekend_evening_override?.[1] || '';
                                      onUpdateScheduleRow(day.duty_date, (prev) => ({
                                        ...prev,
                                        weekend_evening_override: [val, slot2],
                                      }));
                                    }}
                                    activeMembers={activeMembers}
                                    placeholder="16:29 Chính (1)"
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <MemberSelectDropdown
                                    value={day.weekend_evening_override?.[1] || ''}
                                    onChange={(val) => {
                                      const slot1 = day.weekend_evening_override?.[0] || '';
                                      onUpdateScheduleRow(day.duty_date, (prev) => ({
                                        ...prev,
                                        weekend_evening_override: [slot1, val],
                                      }));
                                    }}
                                    activeMembers={activeMembers}
                                    placeholder="16:29 Phụ (2)"
                                  />
                                </div>
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
            onClick={onQuickDryRun}
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
            onClick={onOpenApplyNowModal}
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
            onClick={onSaveSchedules}
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
  );
};
