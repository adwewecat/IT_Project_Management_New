import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, Flame, Ban, Timer } from 'lucide-react';
import { GpmsSlaStatusKey, GpmsSlaSummary } from '../../types/gpmsReport';
import { useAnimatedNumber } from './useAnimatedNumber';
import { Badge } from '../ui/Badge';

interface GpmsSlaDonutPanelProps {
  sla: GpmsSlaSummary;
  activeSlaFilter?: string;
  onSelectSlaFilter: (statusKey?: GpmsSlaStatusKey) => void;
  onInspectTickets: (statusKey: GpmsSlaStatusKey, label: string) => void;
}

interface SlaItemConfig {
  key: GpmsSlaStatusKey;
  label: string;
  color: string;
  softBg: string;
  icon: React.ReactNode;
}

const SLA_ITEMS: SlaItemConfig[] = [
  {
    key: 'ht_dung_han',
    label: 'Hoàn thành đúng hạn',
    color: '#10B981',
    softBg: 'rgba(16, 185, 129, 0.12)',
    icon: <CheckCircle2 size={15} style={{ color: '#10B981' }} />,
  },
  {
    key: 'ht_tre_han',
    label: 'Hoàn thành trễ hạn',
    color: '#F59E0B',
    softBg: 'rgba(245, 158, 11, 0.14)',
    icon: <Clock size={15} style={{ color: '#F59E0B' }} />,
  },
  {
    key: 'chua_ht_chua_tre',
    label: 'Chưa hoàn thành chưa trễ hạn',
    color: '#3B82F6',
    softBg: 'rgba(59, 130, 246, 0.12)',
    icon: <Timer size={15} style={{ color: '#3B82F6' }} />,
  },
  {
    key: 'chua_ht_tre_han',
    label: 'Chưa hoàn thành trễ hạn',
    color: '#EF4444',
    softBg: 'rgba(239, 68, 68, 0.12)',
    icon: <Flame size={15} style={{ color: '#EF4444' }} />,
  },
  {
    key: 'da_huy',
    label: 'Đã hủy',
    color: '#64748B',
    softBg: 'rgba(100, 116, 139, 0.14)',
    icon: <Ban size={15} style={{ color: '#64748B' }} />,
  },
];

export const GpmsSlaDonutPanel: React.FC<GpmsSlaDonutPanelProps> = ({
  sla,
  activeSlaFilter,
  onSelectSlaFilter,
  onInspectTickets,
}) => {
  const [hoveredKey, setHoveredKey] = useState<GpmsSlaStatusKey | null>(null);
  const animatedTotal = useAnimatedNumber(sla.total);

  const segments = useMemo(() => {
    const radius = 78;
    const circumference = 2 * Math.PI * radius;
    const total = Math.max(1, sla.total);
    let cumulative = 0;

    return SLA_ITEMS.map((cfg) => {
      const value = sla[cfg.key] || 0;
      const pct = sla.total > 0 ? (value / total) * 100 : 0;
      const segLength = sla.total > 0 ? (value / total) * circumference : 0;
      const dashArray = `${segLength} ${Math.max(0, circumference - segLength)}`;
      const rotation = (cumulative / total) * 360 - 90;
      cumulative += value;

      return {
        ...cfg,
        value,
        pct,
        radius,
        circumference,
        dashArray,
        rotation,
      };
    });
  }, [sla]);

  const focusedSegment =
    segments.find((s) => s.key === hoveredKey) ||
    segments.find((s) => s.key === activeSlaFilter) ||
    null;

  return (
    <section className="gpms-panel gpms-stagger-1">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '14px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            3. Thống Kê Chung Ticket Theo 5 Tiêu Chí SLA & YCHT
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Di chuột vào vòng tròn để soi tỷ trọng • Bấm vào tiêu chí để lọc toàn bộ báo cáo
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Badge variant="success">Đúng hạn YCHT: {sla.on_time_rate}%</Badge>
          <Badge variant="danger">Trễ hạn YCHT: {sla.overdue_rate}%</Badge>
          <Badge variant="info">Hoàn thành: {sla.completion_rate}%</Badge>
        </div>
      </div>

      <div className="gpms-sla-layout">
        {/* SVG Donut Ring có chuyển động mượt */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="210"
            height="210"
            viewBox="0 0 210 210"
            role="img"
            aria-label="Biểu đồ 5 tiêu chí SLA GPMS"
          >
            <circle
              cx="105"
              cy="105"
              r="78"
              fill="none"
              stroke="var(--bg-secondary)"
              strokeWidth="22"
            />
            {segments.map((seg) => {
              if (seg.value <= 0) return null;
              const isSelected = activeSlaFilter === seg.key;
              const isHovered = hoveredKey === seg.key;
              const isDimmed = Boolean(
                (hoveredKey && hoveredKey !== seg.key) ||
                (!hoveredKey && activeSlaFilter && activeSlaFilter !== seg.key)
              );

              return (
                <circle
                  key={seg.key}
                  cx="105"
                  cy="105"
                  r={seg.radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={isHovered || isSelected ? 27 : 22}
                  strokeDasharray={seg.dashArray}
                  strokeLinecap="butt"
                  transform={`rotate(${seg.rotation} 105 105)`}
                  className={`gpms-donut-segment ${isSelected ? 'is-active' : ''}`}
                  style={{
                    opacity: isDimmed ? 0.35 : 1,
                    ['--gpms-circ' as string]: `${seg.circumference}`,
                    ['--gpms-offset' as string]: '0',
                  }}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() =>
                    onSelectSlaFilter(activeSlaFilter === seg.key ? undefined : seg.key)
                  }
                />
              );
            })}
          </svg>

          {/* Tâm vòng tròn hiển thị số động theo hover/select */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              textAlign: 'center',
              padding: '0 40px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: focusedSegment ? focusedSegment.color : 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                maxWidth: '118px',
                lineHeight: 1.25,
              }}
            >
              {focusedSegment ? focusedSegment.label : 'Tổng Ticket'}
            </span>
            <span
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.15,
                marginTop: '2px',
              }}
            >
              {(focusedSegment ? focusedSegment.value : animatedTotal).toLocaleString('vi-VN')}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {focusedSegment
                ? `${focusedSegment.pct.toFixed(1)}%`
                : `Đúng hạn ${sla.on_time_rate}%`}
            </span>
          </div>
        </div>

        {/* Danh sách 5 tiêu chí tương tác */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {segments.map((seg) => {
            const isSelected = activeSlaFilter === seg.key;
            return (
              <div
                key={seg.key}
                className={`gpms-interactive-row ${isSelected ? 'is-active' : ''}`}
                onMouseEnter={() => setHoveredKey(seg.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() =>
                  onSelectSlaFilter(isSelected ? undefined : seg.key)
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '8px',
                        backgroundColor: seg.softBg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {seg.icon}
                    </span>
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {seg.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {seg.value.toLocaleString('vi-VN')}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        minWidth: '48px',
                        textAlign: 'right',
                        color: seg.color,
                      }}
                    >
                      {seg.pct.toFixed(1)}%
                    </span>
                    <button
                      type="button"
                      title={`Xem chi tiết ${seg.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectTickets(seg.key, seg.label);
                      }}
                      style={{
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-secondary)',
                        borderRadius: '7px',
                        padding: '4px 7px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                      }}
                    >
                      <Eye size={13} />
                      <span className="gpms-hide-xs">Chi tiết</span>
                    </button>
                  </div>
                </div>

                <div className="gpms-bar-track">
                  <div
                    className="gpms-bar-fill"
                    style={{
                      width: `${Math.max(seg.value > 0 ? 1.5 : 0, seg.pct)}%`,
                      backgroundColor: seg.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
