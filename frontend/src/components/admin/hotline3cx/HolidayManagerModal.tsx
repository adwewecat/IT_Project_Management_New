import React, { useState, useEffect } from 'react';
import { CalendarHeart, ExternalLink, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { DateInput } from '../../ui/DateInput';
import { MemberSelectDropdown } from './MemberSelectDropdown';
import {
  Hotline3cxHoliday,
  Hotline3cxMember,
  HotlineHolidayBatchCreateRequest,
} from '../../../types/hotline3cxAuto';
import { formatDateDDMMYYYY, getTodayIsoDate } from '../../../utils/dateFormat';

export interface HolidayManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartDate?: string;
  holidays: Hotline3cxHoliday[];
  loading: boolean;
  saving: boolean;
  activeMembers: Hotline3cxMember[];
  memberMap: Map<string, Hotline3cxMember>;
  onAddHolidays: (payload: HotlineHolidayBatchCreateRequest) => Promise<boolean>;
  onDeleteHoliday: (holidayId: number) => Promise<void>;
  onJumpToWeek: (isoDate: string) => void;
}

export const HolidayManagerModal: React.FC<HolidayManagerModalProps> = ({
  isOpen,
  onClose,
  initialStartDate,
  holidays,
  loading,
  saving,
  activeMembers,
  memberMap,
  onAddHolidays,
  onDeleteHoliday,
  onJumpToWeek,
}) => {
  const [startDate, setStartDate] = useState<string>(() => initialStartDate || getTodayIsoDate());
  const [endDate, setEndDate] = useState<string>(() => initialStartDate || getTodayIsoDate());
  const [holidayName, setHolidayName] = useState<string>('');
  const [primaryLine, setPrimaryLine] = useState<string>('');
  const [backupLine, setBackupLine] = useState<string>('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const seedDate = initialStartDate || getTodayIsoDate();
      setStartDate(seedDate);
      setEndDate(seedDate);
      setHolidayName('');
      setPrimaryLine('');
      setBackupLine('');
    }
  }, [isOpen, initialStartDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;
    const effectiveEnd = endDate && endDate >= startDate ? endDate : startDate;
    const lines: string[] = [];
    if (primaryLine) lines.push(primaryLine);
    if (backupLine && backupLine !== primaryLine) lines.push(backupLine);

    const ok = await onAddHolidays({
      start_date: startDate,
      end_date: effectiveEnd,
      name: holidayName.trim() || 'Nghỉ lễ riêng',
      weekend_lines: lines,
    });
    if (ok) {
      setHolidayName('');
    }
  };

  const handleDeleteClick = async (id: number) => {
    setDeletingId(id);
    try {
      await onDeleteHoliday(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && deletingId === null && onClose()}
      title="Quản Lý Ngày Lễ Riêng (Áp Dụng Chế Độ Trực T7–CN / Lễ)"
      maxWidth="760px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            fontSize: '12px',
            color: 'var(--text-primary)',
            lineHeight: 1.45,
          }}
        >
          Các ngày được thêm tại đây (lễ công ty, nghỉ bù đột xuất không theo lịch Nhà nước) sẽ tự động chạy theo chế độ <strong>Ngày Lễ / Cuối Tuần (Night 0007: 06:00 Chính-Phụ → 16:29 tự đảo)</strong> và <strong>không bị ghi đè mất</strong> khi Sao chép tuần hay Áp dụng mẫu cả tháng.
        </div>

        {/* Form khai báo ngày lễ riêng */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: '160px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Từ ngày (dd-mm-yyyy) *
              </label>
              <DateInput
                compact
                hideClear
                value={startDate}
                onChange={(v) => {
                  setStartDate(v);
                  if (!endDate || (v && endDate < v)) {
                    setEndDate(v);
                  }
                }}
              />
            </div>

            <div style={{ width: '160px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Đến ngày (nếu nhiều ngày)
              </label>
              <DateInput
                compact
                value={endDate}
                onChange={(v) => setEndDate(v || startDate)}
              />
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                Tên / Ghi chú ngày lễ
              </label>
              <input
                type="text"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                placeholder="VD: Ngày thành lập công ty, Nghỉ bù lễ..."
                maxLength={250}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Tùy chọn gán sẵn người trực lễ 06:00 */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '6px',
              borderTop: '1px dashed var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap', minWidth: '280px' }}>
              <div style={{ flex: 1, minWidth: '170px' }}>
                <MemberSelectDropdown
                  value={primaryLine}
                  onChange={setPrimaryLine}
                  activeMembers={activeMembers}
                  labelPrefix="Chính 06:00:"
                  labelColor="#059669"
                  placeholder="(Chỉnh sau trên lưới)"
                />
              </div>
              <div style={{ flex: 1, minWidth: '170px' }}>
                <MemberSelectDropdown
                  value={backupLine}
                  onChange={setBackupLine}
                  activeMembers={activeMembers}
                  labelPrefix="Phụ 06:00:"
                  labelColor="#d97706"
                  placeholder="(Chỉnh sau trên lưới)"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={saving || !startDate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              {saving ? (
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Plus size={14} />
              )}
              <span>Lưu Ngày Lễ</span>
            </Button>
          </div>
        </form>

        {/* Bảng danh sách các ngày lễ đã khai báo */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-card)',
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '28px',
                color: 'var(--text-secondary)',
                fontSize: '12.5px',
              }}
            >
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Đang tải danh sách ngày lễ...</span>
            </div>
          ) : holidays.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '28px',
                color: 'var(--text-muted)',
                fontSize: '12.5px',
              }}
            >
              <CalendarHeart size={22} />
              <span>Chưa có Ngày Lễ Riêng nào được khai báo.</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <th style={{ padding: '8px 10px', width: '140px', fontWeight: 700 }}>Ngày Lễ</th>
                  <th style={{ padding: '8px 10px', fontWeight: 700 }}>Tên / Ghi chú</th>
                  <th style={{ padding: '8px 10px', width: '210px', fontWeight: 700 }}>Ca Trực 06:00 (16:29 Đảo)</th>
                  <th style={{ padding: '8px 10px', width: '125px', fontWeight: 700, textAlign: 'right' }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((hol) => {
                  const assignedLines = hol.weekend_lines || [];
                  return (
                    <tr key={hol.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#dc2626' }}>
                          {formatDateDDMMYYYY(hol.holiday_date)}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          {hol.weekday_label || ''}
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', color: 'var(--text-primary)' }}>
                        {hol.name || 'Nghỉ lễ riêng'}
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        {assignedLines.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                            {assignedLines.slice(0, 2).map((line, idx) => {
                              const m = memberMap.get(line);
                              return (
                                <span
                                  key={`${line}-${idx}`}
                                  style={{
                                    color: idx === 0 ? '#059669' : '#d97706',
                                    fontWeight: 600,
                                  }}
                                >
                                  {idx === 0 ? 'Chính:' : 'Phụ:'} {line} {m ? m.full_name : ''}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Chưa gán (xếp ở lưới tuần)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              onJumpToWeek(hol.holiday_date);
                              onClose();
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '4px 7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: '1px solid #3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.08)',
                              color: '#2563eb',
                              cursor: 'pointer',
                            }}
                            title="Nhảy tới tuần chứa ngày lễ này"
                          >
                            <ExternalLink size={11} />
                            <span>Xem</span>
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === hol.id}
                            onClick={() => handleDeleteClick(hol.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '4px 7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              color: '#dc2626',
                              cursor: deletingId === hol.id ? 'not-allowed' : 'pointer',
                            }}
                            title="Xóa ngày lễ riêng này"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose} disabled={saving || deletingId !== null}>
            Đóng
          </Button>
        </div>
      </div>
    </Modal>
  );
};
