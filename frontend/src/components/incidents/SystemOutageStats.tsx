import React from 'react';
import {
  AlertOctagon,
  Clock,
  CheckCircle2,
  Timer,
  Server,
  Calendar,
} from 'lucide-react';
import { SystemIncidentStats } from '../../types/systemIncident';
import { MonthInput } from '../ui/MonthInput';

interface SystemOutageStatsProps {
  stats: SystemIncidentStats;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const SystemOutageStats: React.FC<SystemOutageStatsProps> = ({
  stats,
  selectedMonth,
  onMonthChange,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 18px',
        backgroundColor: 'var(--bg-secondary, #F8FAFC)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-color, #E2E8F0)',
        marginBottom: '16px',
      }}
    >
      {/* Top row: Title + Month Selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertOctagon size={16} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Thống Kê Tình Trạng Lỗi Diện Rộng & Gián Đoạn Hệ Thống
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Theo dõi tổng số vụ, tiến độ xử lý và tổng thời lượng gián đoạn dịch vụ
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Calendar size={14} />
            <span>Kỳ Thống Kê:</span>
          </label>
          <MonthInput
            value={selectedMonth}
            onChange={onMonthChange}
            compact
            style={{ height: '34px', fontSize: '13px', fontWeight: 600 }}
          />
          {selectedMonth && (
            <button
              type="button"
              onClick={() => onMonthChange('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Xem Tất Cả
            </button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: Tổng số */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary, #F3F4F6)',
              color: '#4B5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertOctagon size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tổng Sự Cố
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', lineHeight: 1.2 }}>
              {stats.total} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>vụ</span>
            </div>
          </div>
        </div>

        {/* Card 2: Đang xử lý */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid #FCD34D',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: 600, textTransform: 'uppercase' }}>
              Đang Xử Lý / Theo Dõi
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#B45309', lineHeight: 1.2 }}>
              {stats.dang_xu_ly + stats.theo_doi}{' '}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#D97706' }}>vụ</span>
            </div>
          </div>
        </div>

        {/* Card 3: Đã khắc phục */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>
              Đã Khắc Phục
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857', lineHeight: 1.2 }}>
              {stats.da_khac_phuc}{' '}
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#059669' }}>vụ</span>
            </div>
          </div>
        </div>

        {/* Card 4: Tổng Downtime */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md, 8px)',
            backgroundColor: 'var(--bg-primary, #FFFFFF)',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary, #F3F4F6)',
              color: '#4B5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Timer size={20} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Tổng Gián Đoạn (Downtime)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#6D28D9', lineHeight: 1.2 }}>
              {stats.total_downtime_hours}{' '}
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
                giờ ({stats.total_downtime_minutes}p)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown by system pills */}
      {Object.keys(stats.by_system).length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Server size={13} />
            <span>Phân bố hệ thống:</span>
          </span>
          {Object.entries(stats.by_system).map(([sysName, count]) => (
            <span
              key={sysName}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-primary, #FFFFFF)',
                border: '1px solid var(--border-color, #CBD5E1)',
                color: 'var(--text-primary)',
              }}
            >
              {sysName}: <strong style={{ color: '#DC2626' }}>{count}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
