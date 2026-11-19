import React from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { Hotline3cxSyncLog } from '../../../types/hotline3cxAuto';
import {
  formatDateDDMMYYYY,
  formatDateTimeDDMMYYYY,
} from '../../../utils/dateFormat';

export interface LogsTabProps {
  logs: Hotline3cxSyncLog[];
  loadingLogs: boolean;
  onRefreshLogs: () => void;
  onViewScreenshot: (screenshotPath: string) => void;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  logs,
  loadingLogs,
  onRefreshLogs,
  onViewScreenshot,
}) => {
  return (
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
                          onClick={() => onViewScreenshot(log.screenshot_path || '')}
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
  );
};
