import React, { useMemo, useState } from 'react';
import { Compass, Eye, MapPin, Search, Settings2 } from 'lucide-react';
import { GpmsReceiverStat, GpmsRegionComparison, GpmsRegionStat } from '../../types/gpmsReport';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface GpmsRegionComparisonPanelProps {
  regions: GpmsRegionComparison;
  activeRegion?: 'NAM' | 'BAC' | '';
  activeReceiver?: string;
  canConfigure: boolean;
  onSelectRegion: (region?: 'NAM' | 'BAC') => void;
  onSelectReceiver: (username?: string) => void;
  onInspectRegion: (region: 'NAM' | 'BAC', label: string) => void;
  onOpenSouthConfig: () => void;
}

const COLOR_OVERDUE = '#EF4444';
const COLOR_ON_TIME = '#10B981';
const COLOR_CANCEL = '#64748B';

export const GpmsRegionComparisonPanel: React.FC<GpmsRegionComparisonPanelProps> = ({
  regions,
  activeRegion,
  activeReceiver,
  canConfigure,
  onSelectRegion,
  onSelectReceiver,
  onInspectRegion,
  onOpenSouthConfig,
}) => {
  const [searchNam, setSearchNam] = useState('');
  const [searchBac, setSearchBac] = useState('');

  const filterUsers = (users: GpmsReceiverStat[], q: string) => {
    const clean = q.trim().toLowerCase();
    if (!clean) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(clean) ||
        (u.full_name || '').toLowerCase().includes(clean)
    );
  };

  const namUsers = useMemo(
    () => filterUsers(regions.nam.users, searchNam),
    [regions.nam.users, searchNam]
  );
  const bacUsers = useMemo(
    () => filterUsers(regions.bac.users, searchBac),
    [regions.bac.users, searchBac]
  );

  const renderRegionCard = (
    stat: GpmsRegionStat,
    filteredUsers: GpmsReceiverStat[],
    searchVal: string,
    onSearchChange: (val: string) => void,
    isSouth: boolean
  ) => {
    const isSelectedRegion = activeRegion === stat.region;
    const accent = isSouth ? '#F59E0B' : '#3B82F6';
    const maxUserTotal = Math.max(1, stat.users[0]?.total || 1);

    return (
      <div
        style={{
          borderRadius: '12px',
          border: isSelectedRegion ? `2px solid ${accent}` : '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-primary)',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: 0,
        }}
      >
        {/* Header Vùng Miền */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                backgroundColor: isSouth ? 'rgba(245, 158, 11, 0.14)' : 'rgba(59, 130, 246, 0.14)',
                color: accent,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSouth ? <MapPin size={17} /> : <Compass size={17} />}
            </span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {stat.user_count} User nhận yêu cầu • Tỷ trọng {stat.percentage.toFixed(1)}%
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`gpms-pill-btn ${isSelectedRegion ? 'is-active' : ''}`}
              onClick={() => onSelectRegion(isSelectedRegion ? undefined : (stat.region as 'NAM' | 'BAC'))}
            >
              {isSelectedRegion ? 'Đang lọc vùng này' : 'Lọc vùng'}
            </button>
            <button
              type="button"
              title={`Xem toàn bộ ticket ${stat.label}`}
              onClick={() => onInspectRegion(stat.region as 'NAM' | 'BAC', `Ticket thuộc ${stat.label}`)}
              style={{
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                borderRadius: '999px',
                padding: '5px 9px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <Eye size={13} />
              <span>Ticket</span>
            </button>
          </div>
        </div>

        {/* Thống kê tổng vùng + 3 chỉ số */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
            padding: '10px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng Ticket</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {stat.total.toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đúng hạn YCHT</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: COLOR_ON_TIME }}>
              {stat.on_time_ycht.toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Trễ hạn YCHT</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: COLOR_OVERDUE }}>
              {stat.overdue_ycht.toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đúng hạn %</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: accent }}>
              {stat.on_time_rate}%
            </div>
          </div>
        </div>

        {/* Lời nhắc cấu hình nếu Miền Nam chưa chọn ai */}
        {isSouth && stat.users.length === 0 && (
          <div
            style={{
              flex: 1,
              padding: '24px 16px',
              borderRadius: '10px',
              border: '1px dashed var(--border-color-dark)',
              backgroundColor: 'var(--bg-card)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Chưa có User nào được gán vào <strong>Miền Nam</strong>. Toàn bộ nhân sự đang được tính sang Miền Bắc.
            </span>
            {canConfigure && (
              <Button
                size="sm"
                variant="primary"
                onClick={onOpenSouthConfig}
                leftIcon={<Settings2 size={14} />}
              >
                Chọn User Miền Nam ngay
              </Button>
            )}
          </div>
        )}

        {/* Tìm kiếm trong danh sách user của vùng nếu > 8 user */}
        {stat.users.length > 8 && (
          <div style={{ position: 'relative' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '9px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Tìm nhanh trong ${stat.users.length} user ${stat.label}...`}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '6px 10px 6px 28px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
          </div>
        )}

        {/* Danh sách User nhận yêu cầu thuộc vùng (scroll độc lập) */}
        {stat.users.length > 0 && (
          <div
            style={{
              maxHeight: '290px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              paddingRight: '4px',
            }}
          >
            {filteredUsers.map((u) => {
              const isUserSel = activeReceiver?.toLowerCase() === u.username.toLowerCase();
              const barW = Math.max(2, (u.total / maxUserTotal) * 100);
              const safeT = Math.max(1, u.total);
              return (
                <div
                  key={u.username}
                  className={`gpms-interactive-row ${isUserSel ? 'is-active' : ''}`}
                  style={{ padding: '7px 9px' }}
                  onClick={() => onSelectReceiver(isUserSel ? undefined : u.username)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {u.full_name !== u.username ? `${u.full_name} (${u.username})` : u.username}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', flexShrink: 0 }}>
                      <span style={{ color: COLOR_OVERDUE, fontWeight: 700 }}>{u.overdue_ycht} trễ</span>
                      <span style={{ color: COLOR_ON_TIME, fontWeight: 700 }}>{u.on_time_ycht} đúng</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{u.total.toLocaleString('vi-VN')}</strong>
                    </div>
                  </div>
                  <div className="gpms-bar-track" style={{ height: '7px' }}>
                    <div style={{ width: `${barW}%`, height: '100%', display: 'flex', borderRadius: '999px', overflow: 'hidden' }}>
                      {u.overdue_ycht > 0 && (
                        <div style={{ width: `${(u.overdue_ycht / safeT) * 100}%`, backgroundColor: COLOR_OVERDUE }} />
                      )}
                      {u.on_time_ycht > 0 && (
                        <div style={{ width: `${(u.on_time_ycht / safeT) * 100}%`, backgroundColor: COLOR_ON_TIME }} />
                      )}
                      {u.cancelled > 0 && (
                        <div style={{ width: `${(u.cancelled / safeT) * 100}%`, backgroundColor: COLOR_CANCEL }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="gpms-panel gpms-stagger-4" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} style={{ color: '#F59E0B' }} />
            <span>4. Thống Kê Theo Vùng Miền (Miền Nam vs Miền Bắc)</span>
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Hiển thị danh sách User nhận yêu cầu theo từng miền • Người dùng thuộc Miền Nam được cấu hình riêng, còn lại thuộc Miền Bắc
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge variant="warning">Miền Nam: {regions.nam.percentage.toFixed(1)}%</Badge>
          <Badge variant="info">Miền Bắc: {regions.bac.percentage.toFixed(1)}%</Badge>
          {canConfigure && (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenSouthConfig}
              leftIcon={<Settings2 size={15} />}
            >
              Cấu Hình User Miền Nam
            </Button>
          )}
        </div>
      </div>

      {/* Thanh so sánh tỷ trọng 2 miền trực quan */}
      <div
        style={{
          height: '12px',
          width: '100%',
          borderRadius: '999px',
          overflow: 'hidden',
          display: 'flex',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          style={{
            width: `${regions.nam.percentage}%`,
            background: 'linear-gradient(90deg, #F59E0B, #D97706)',
            transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title={`Miền Nam: ${regions.nam.total.toLocaleString('vi-VN')} ticket (${regions.nam.percentage.toFixed(1)}%)`}
        />
        <div
          style={{
            width: `${regions.bac.percentage}%`,
            background: 'linear-gradient(90deg, #3B82F6, #2563EB)',
            transition: 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          title={`Miền Bắc: ${regions.bac.total.toLocaleString('vi-VN')} ticket (${regions.bac.percentage.toFixed(1)}%)`}
        />
      </div>

      <div className="gpms-grid-2col">
        {renderRegionCard(regions.nam, namUsers, searchNam, setSearchNam, true)}
        {renderRegionCard(regions.bac, bacUsers, searchBac, setSearchBac, false)}
      </div>
    </section>
  );
};
