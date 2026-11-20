import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Play,
  RefreshCw,
  Settings,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  Hotline3cxConfig,
  Hotline3cxSyncLog,
  ShiftCode,
} from '../../../types/hotline3cxAuto';
import {
  formatDateDDMMYYYY,
  formatDateTimeDDMMYYYY,
} from '../../../utils/dateFormat';

export interface LogsTabProps {
  logs: Hotline3cxSyncLog[];
  loadingLogs: boolean;
  config: Hotline3cxConfig | null;
  executingAction: boolean;
  cancellingId: number | null;
  cancellingAll: boolean;
  onRefreshLogs: () => void;
  onViewScreenshot: (screenshotPath: string) => void;
  onOpenApplyNowModal: () => void;
  onRunDirectNowToday: () => void;
  onApplyLogRow: (dutyDate: string, shiftCode: ShiftCode, forceDirect?: boolean) => void;
  onCancelLog: (logId: number) => void;
  onCancelAllPending: () => void;
  onGoToConfigTab: () => void;
}

const VALID_SHIFTS = new Set<string>(['MORNING', 'EVENING', 'MORNING_BACKUP', 'EVENING_BACKUP']);

// Định dạng thời gian đã chờ/đã chạy từ started_at (trả về VD: "45 giây" hoặc "12 phút")
function formatElapsedDuration(startedAt?: string | null): string {
  if (!startedAt) return 'vài giây';
  const parsed = new Date(startedAt).getTime();
  if (Number.isNaN(parsed)) return 'vài giây';
  const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSec < 60) return `${diffSec} giây`;
  const mins = Math.floor(diffSec / 60);
  const remSec = diffSec % 60;
  return remSec > 0 && mins < 5 ? `${mins} phút ${remSec}s` : `${mins} phút`;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  loadingLogs,
  config,
  executingAction,
  cancellingId,
  cancellingAll,
  onRefreshLogs,
  onViewScreenshot,
  onOpenApplyNowModal,
  onRunDirectNowToday,
  onApplyLogRow,
  onCancelLog,
  onCancelAllPending,
  onGoToConfigTab,
}) => {
  const isRelayMode = (config?.execution_mode || 'DIRECT').toUpperCase() === 'RELAY';
  const isRelayOnline = Boolean(config?.relay_online);
  const workerName = config?.relay_worker_name || 'Chưa kết nối Worker nào';
  const lastSeenStr = config?.relay_last_seen_at
    ? formatDateTimeDDMMYYYY(config.relay_last_seen_at)
    : 'Chưa từng nhận tín hiệu';

  const pendingLogs = logs.filter((l) => l.status === 'PENDING' || l.status === 'RUNNING');
  const pendingCount = pendingLogs.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Banner chẩn đoán trạng thái kết nối Relay / Hàng chờ */}
      {config && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: isRelayMode
              ? isRelayOnline
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : '1px solid rgba(220, 38, 38, 0.35)'
              : '1px solid rgba(37, 99, 235, 0.3)',
            backgroundColor: isRelayMode
              ? isRelayOnline
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(239, 68, 68, 0.08)'
              : 'rgba(37, 99, 235, 0.07)',
            fontSize: '12px',
            lineHeight: 1.45,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: '280px' }}>
            {isRelayMode ? (
              isRelayOnline ? (
                <CheckCircle2 size={17} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <AlertTriangle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              )
            ) : (
              <Play size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}

            <div>
              {isRelayMode ? (
                isRelayOnline ? (
                  <>
                    <div style={{ fontWeight: 700, color: '#047857' }}>
                      Chế độ RELAY — Worker "{workerName}" đang ONLINE
                      {config.relay_last_ip ? ` (${config.relay_last_ip})` : ''}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                      Nhận tín hiệu gần nhất lúc <strong>{lastSeenStr}</strong>. Các lệnh "Chờ Relay" sẽ được Worker nhận và thực thi tự động mỗi 5 giây.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, color: '#b91c1c' }}>
                      Chế độ RELAY — Worker hiện đang OFFLINE ({workerName})
                    </div>
                    <div style={{ color: '#7f1d1d', fontSize: '11.5px' }}>
                      Lần cuối thấy Worker: <strong>{lastSeenStr}</strong>.{' '}
                      {pendingCount > 0
                        ? `Đang có ${pendingCount} lệnh bị kẹt ở "Chờ Relay" vì chưa có PC Relay chạy 3cx_sync_relay.py nhận việc (sẽ tự báo lỗi sau 15 phút).`
                        : 'Nếu tạo lệnh ngay bây giờ qua Relay, lệnh sẽ nằm chờ tới khi PC trạm bật lại Relay Worker.'}{' '}
                      Bạn có thể bấm <strong>"⚡ Chạy Trực Tiếp Ngay (Direct)"</strong> bên dưới để test chạy trực tiếp từ Server ngay lập tức.
                    </div>
                  </>
                )
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: '#1d4ed8' }}>
                    Chế độ DIRECT — Server tự chạy Playwright trực tiếp (không qua hàng chờ Relay)
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                    Mọi thao tác "Áp Dụng Ngay" sẽ thực thi đồng bộ tức thì vào cổng 3CX và trả kết quả ngay.
                  </div>
                </>
              )}
            </div>
          </div>

          {isRelayMode && !isRelayOnline && (
            <button
              type="button"
              onClick={onGoToConfigTab}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #dc2626',
                backgroundColor: '#fff',
                color: '#b91c1c',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Mở tab Cấu Hình 3CX & Email để xem/tải lại Relay Worker"
            >
              <Settings size={13} />
              <span>Cấu Hình Relay</span>
            </button>
          )}
        </div>
      )}

      {/* Thanh công cụ Áp Dụng Ngay & Hủy Hàng Chờ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Hiển thị 50 lượt đồng bộ gần nhất{pendingCount > 0 ? ` (${pendingCount} đang chờ/chạy)` : ''}:
        </span>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={onOpenApplyNowModal}
            disabled={executingAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#d97706',
              color: '#fff',
              cursor: executingAction ? 'not-allowed' : 'pointer',
              opacity: executingAction ? 0.7 : 1,
            }}
            title="Chọn ngày/ca và kích hoạt áp dụng ngay vào cổng 3CX"
          >
            <Zap size={13} />
            <span>Áp Dụng Ca Ngay...</span>
          </button>

          <button
            type="button"
            onClick={onRunDirectNowToday}
            disabled={executingAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid #2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#1d4ed8',
              cursor: executingAction ? 'not-allowed' : 'pointer',
              opacity: executingAction ? 0.7 : 1,
            }}
            title="Bỏ qua hàng chờ Relay, chạy trực tiếp ca hiện tại hôm nay ngay từ Server để kiểm tra kết nối & lỗi thực tế"
          >
            {executingAction ? (
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Play size={13} />
            )}
            <span>Chạy Trực Tiếp Ngay (Direct)</span>
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onCancelAllPending}
              disabled={cancellingAll}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 11px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #dc2626',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#dc2626',
                cursor: cancellingAll ? 'not-allowed' : 'pointer',
              }}
              title="Hủy toàn bộ các lệnh đang đứng chờ Relay / đang chạy"
            >
              <XCircle size={13} />
              <span>{cancellingAll ? 'Đang Hủy...' : `Hủy Chờ (${pendingCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefreshLogs}
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
      </div>

      {/* Bảng danh sách nhật ký */}
      <div
        style={{
          maxHeight: '50vh',
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
                <th style={{ padding: '10px 12px', width: '125px', fontWeight: 700 }}>
                  Thời Gian (24h)
                </th>
                <th style={{ padding: '10px 12px', width: '95px', fontWeight: 700 }}>
                  Ngày Trực
                </th>
                <th style={{ padding: '10px 12px', width: '100px', fontWeight: 700 }}>
                  Ca Trực
                </th>
                <th style={{ padding: '10px 12px', width: '140px', fontWeight: 700 }}>
                  Hàng Đợi
                </th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Line Áp Dụng & Chẩn Đoán</th>
                <th style={{ padding: '10px 12px', width: '110px', fontWeight: 700 }}>
                  Trạng Thái
                </th>
                <th style={{ padding: '10px 12px', width: '95px', fontWeight: 700 }}>
                  Kích Hoạt
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    width: '175px',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                >
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                let statusColor = '#059669';
                let statusBg = 'rgba(16, 185, 129, 0.12)';
                let statusLabel = 'Thành công';

                if (log.status === 'PENDING') {
                  statusColor = '#b45309';
                  statusBg = 'rgba(245, 158, 11, 0.16)';
                  statusLabel = log.is_dry_run ? 'Chờ Relay (Thử)' : 'Chờ Relay';
                } else if (log.status === 'RUNNING') {
                  statusColor = '#1d4ed8';
                  statusBg = 'rgba(59, 130, 246, 0.16)';
                  statusLabel = log.is_dry_run ? 'Relay chạy thử...' : 'Relay đang chạy...';
                } else if (log.status === 'FAILED') {
                  statusColor = '#dc2626';
                  statusBg = 'rgba(239, 68, 68, 0.12)';
                  statusLabel = 'Thất bại';
                } else if (log.status === 'CANCELLED') {
                  statusColor = '#4b5563';
                  statusBg = 'rgba(107, 114, 128, 0.14)';
                  statusLabel = 'Đã hủy';
                } else if (log.status === 'SKIPPED') {
                  statusColor = '#d97706';
                  statusBg = 'rgba(245, 158, 11, 0.12)';
                  statusLabel = 'Bỏ qua (Rỗng)';
                } else if (log.is_dry_run) {
                  statusColor = '#2563eb';
                  statusBg = 'rgba(37, 99, 235, 0.12)';
                  statusLabel = 'Chạy thử';
                }

                const elapsedText =
                  log.status === 'PENDING' || log.status === 'RUNNING'
                    ? formatElapsedDuration(log.started_at)
                    : '';
                const canReapplyShift = VALID_SHIFTS.has((log.shift_code || '').toUpperCase());
                const rowShift = (log.shift_code || 'MORNING').toUpperCase() as ShiftCode;
                const isPendingOrRunning = log.status === 'PENDING' || log.status === 'RUNNING';

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
                      {(() => {
                        let shiftBg = 'rgba(139, 92, 246, 0.1)';
                        let shiftColor = '#7c3aed';
                        let shiftLabel = 'Chiều 16:29';
                        if (log.shift_code === 'MORNING') {
                          shiftBg = 'rgba(59, 130, 246, 0.1)';
                          shiftColor = '#2563eb';
                          shiftLabel = 'Sáng 06:00';
                        } else if (log.shift_code === 'MORNING_BACKUP') {
                          shiftBg = 'rgba(13, 148, 136, 0.12)';
                          shiftColor = '#0f766e';
                          shiftLabel = 'Backup Sáng';
                        } else if (log.shift_code === 'EVENING_BACKUP') {
                          shiftBg = 'rgba(217, 119, 6, 0.14)';
                          shiftColor = '#b45309';
                          shiftLabel = 'Backup Tối';
                        }
                        return (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: shiftBg,
                              color: shiftColor,
                            }}
                          >
                            {shiftLabel}
                          </span>
                        );
                      })()}
                    </td>

                    {/* Hàng đợi */}
                    <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>
                      {log.queue_name || '—'}
                    </td>

                    {/* Line áp dụng & Chẩn đoán */}
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

                      {/* Lý do chờ trực quan cho PENDING / RUNNING */}
                      {log.status === 'PENDING' && (
                        <div
                          style={{
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: isRelayMode && !isRelayOnline ? '#b91c1c' : '#b45309',
                            fontWeight: 500,
                          }}
                        >
                          <Clock size={11} style={{ flexShrink: 0 }} />
                          <span>
                            {isRelayMode
                              ? isRelayOnline
                                ? `Đang chờ Relay Worker "${workerName}" nhận lệnh (Online • đã chờ ${elapsedText}).`
                                : `Đang chờ Relay Worker "${workerName}" nhưng Worker ĐANG OFFLINE (đã chờ ${elapsedText}/15 phút).`
                              : `Đang chờ xử lý trong hàng chờ (đã chờ ${elapsedText}).`}
                          </span>
                        </div>
                      )}

                      {log.status === 'RUNNING' && (
                        <div
                          style={{
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: '#1d4ed8',
                            fontWeight: 500,
                          }}
                        >
                          <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                          <span>
                            Relay Worker "{workerName}" đang mở cổng 3CX để đồng bộ (đã chạy {elapsedText})...
                          </span>
                        </div>
                      )}

                      {log.error_message && (
                        <div
                          style={{
                            marginTop: '4px',
                            fontSize: '11px',
                            color: log.status === 'CANCELLED' ? '#6b7280' : '#dc2626',
                            wordBreak: 'break-word',
                          }}
                        >
                          {log.status === 'CANCELLED' ? log.error_message : `Lỗi: ${log.error_message}`}
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
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>

                    {/* Kích hoạt */}
                    <td style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {log.triggered_by || 'Scheduler'}
                    </td>

                    {/* Thao tác */}
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          gap: '4px',
                        }}
                      >
                        {log.screenshot_path && (
                          <button
                            type="button"
                            onClick={() => onViewScreenshot(log.screenshot_path || '')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: '1px solid #3b82f6',
                              backgroundColor: 'rgba(59, 130, 246, 0.08)',
                              color: '#2563eb',
                              cursor: 'pointer',
                            }}
                            title="Xem ảnh chụp màn hình 3CX"
                          >
                            <Eye size={11} />
                            <span>Ảnh</span>
                          </button>
                        )}

                        {canReapplyShift && (
                          <button
                            type="button"
                            onClick={() =>
                              onApplyLogRow(log.duty_date, rowShift, isPendingOrRunning || isRelayMode)
                            }
                            disabled={executingAction}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: '1px solid #d97706',
                              backgroundColor: 'rgba(217, 119, 6, 0.1)',
                              color: '#b45309',
                              cursor: executingAction ? 'not-allowed' : 'pointer',
                              opacity: executingAction ? 0.65 : 1,
                            }}
                            title={
                              isRelayMode
                                ? 'Chạy trực tiếp ca này ngay từ Server (bỏ qua hàng chờ Relay) để áp dụng & kiểm tra lỗi tức thì'
                                : 'Áp dụng lại ca trực này ngay lập tức'
                            }
                          >
                            <Zap size={11} />
                            <span>{isRelayMode ? 'Direct' : 'Áp dụng'}</span>
                          </button>
                        )}

                        {isPendingOrRunning && (
                          <button
                            type="button"
                            onClick={() => onCancelLog(log.id)}
                            disabled={cancellingId === log.id}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '3px 7px',
                              fontSize: '11px',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: '1px solid #dc2626',
                              backgroundColor: 'rgba(239, 68, 68, 0.08)',
                              color: '#dc2626',
                              cursor: cancellingId === log.id ? 'not-allowed' : 'pointer',
                            }}
                            title="Hủy lệnh đang chờ Relay này"
                          >
                            <XCircle size={11} />
                            <span>{cancellingId === log.id ? '...' : 'Hủy'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
