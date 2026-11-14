import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Search, UserCheck } from 'lucide-react';
import { GpmsReceiverStat } from '../../types/gpmsReport';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface GpmsStackedReceiverChartProps {
  receivers: GpmsReceiverStat[];
  activeReceiver?: string;
  onSelectReceiver: (username?: string) => void;
  onInspectReceiver: (receiver: GpmsReceiverStat) => void;
}

const COLOR_OVERDUE = '#EF4444';   // Đỏ: Trễ hạn YCHT
const COLOR_ON_TIME = '#10B981';   // Xanh ngọc: Chưa trễ hạn YCHT
const COLOR_CANCEL = '#64748B';    // Xám đá: Đã hủy

export const GpmsStackedReceiverChart: React.FC<GpmsStackedReceiverChartProps> = ({
  receivers,
  activeReceiver,
  onSelectReceiver,
  onInspectReceiver,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'overdue' | 'on_time_rate'>('total');
  const [hoveredUser, setHoveredUser] = useState<GpmsReceiverStat | null>(null);

  const sortedReceivers = useMemo(() => {
    const arr = [...receivers];
    arr.sort((a, b) => {
      if (sortBy === 'overdue') return b.overdue_ycht - a.overdue_ycht || b.total - a.total;
      if (sortBy === 'on_time_rate') return b.on_time_rate - a.on_time_rate || b.total - a.total;
      return b.total - a.total;
    });
    return arr;
  }, [receivers, sortBy]);

  const topFive = useMemo(() => sortedReceivers.slice(0, 5), [sortedReceivers]);
  const maxTopTotal = useMemo(
    () => Math.max(1, ...topFive.map((r) => r.total)),
    [topFive]
  );

  const filteredAll = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedReceivers;
    return sortedReceivers.filter(
      (r) =>
        r.username.toLowerCase().includes(q) ||
        (r.full_name || '').toLowerCase().includes(q)
    );
  }, [sortedReceivers, searchQuery]);

  const remainingList = useMemo(
    () => (searchQuery.trim() ? filteredAll : filteredAll.slice(5)),
    [filteredAll, searchQuery]
  );

  const maxAllTotal = useMemo(
    () => Math.max(1, ...sortedReceivers.map((r) => r.total)),
    [sortedReceivers]
  );

  return (
    <section className="gpms-panel gpms-stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Tiêu đề & chú thích 3 màu */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <UserCheck size={17} style={{ color: '#10B981' }} />
            <span>2. Top 5 User Nhận Nhiều Yêu Cầu Nhất (1 Cột 3 Màu YCHT)</span>
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Mỗi cột hiển thị 3 màu gộp: Trễ hạn YCHT • Chưa trễ hạn YCHT • Đã hủy
          </p>
        </div>

        {/* Sắp xếp nhanh */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`gpms-pill-btn ${sortBy === 'total' ? 'is-active' : ''}`}
            onClick={() => setSortBy('total')}
          >
            Tổng nhiều nhất
          </button>
          <button
            type="button"
            className={`gpms-pill-btn ${sortBy === 'overdue' ? 'is-active' : ''}`}
            onClick={() => setSortBy('overdue')}
          >
            Trễ YCHT cao
          </button>
          <button
            type="button"
            className={`gpms-pill-btn ${sortBy === 'on_time_rate' ? 'is-active' : ''}`}
            onClick={() => setSortBy('on_time_rate')}
          >
            % Đúng hạn
          </button>
        </div>
      </div>

      {/* Legend 3 màu cố định */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '8px 12px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          fontSize: '12px',
          fontWeight: 600,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: COLOR_OVERDUE }} />
          Trễ hạn YCHT (HT trễ + Chưa HT trễ)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: COLOR_ON_TIME }} />
          Chưa trễ hạn YCHT (HT đúng hạn + Chưa HT chưa trễ)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
          <span style={{ width: '11px', height: '11px', borderRadius: '3px', backgroundColor: COLOR_CANCEL }} />
          Đã hủy
        </span>
      </div>

      {/* Biểu đồ Cột Đứng 3 Màu Cho Top 5 */}
      {topFive.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Không có dữ liệu người xử lý khớp bộ lọc hiện tại.
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            padding: '12px 10px 8px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Floating Live Tooltip Banner khi di chuột vào cột */}
          <div
            style={{
              minHeight: '34px',
              marginBottom: '10px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            {hoveredUser ? (
              <>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {hoveredUser.full_name} ({hoveredUser.username}) •{' '}
                  <span style={{ color: hoveredUser.region === 'NAM' ? '#D97706' : '#2563EB' }}>
                    {hoveredUser.region === 'NAM' ? 'Miền Nam' : 'Miền Bắc'}
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontWeight: 600 }}>
                  <span style={{ color: COLOR_OVERDUE }}>
                    Trễ hạn YCHT: {hoveredUser.overdue_ycht.toLocaleString('vi-VN')}
                  </span>
                  <span style={{ color: COLOR_ON_TIME }}>
                    Chưa trễ YCHT: {hoveredUser.on_time_ycht.toLocaleString('vi-VN')}
                  </span>
                  <span style={{ color: COLOR_CANCEL }}>
                    Hủy: {hoveredUser.cancelled.toLocaleString('vi-VN')}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    Đúng hạn: {hoveredUser.on_time_rate}%
                  </span>
                </div>
              </>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                Di chuột vào từng cột để xem phân rã 3 màu • Bấm vào cột để lọc toàn bộ dashboard theo nhân sự
              </span>
            )}
          </div>

          {/* 5 Cột Stacked Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${topFive.length}, minmax(0, 1fr))`,
              gap: '8px',
              alignItems: 'end',
            }}
          >
            {topFive.map((user, idx) => {
              const totalPctHeight = Math.max(12, Math.round((user.total / maxTopTotal) * 165));
              const totalSafe = Math.max(1, user.total);
              const onTimeH = (user.on_time_ycht / totalSafe) * 100;
              const overdueH = (user.overdue_ycht / totalSafe) * 100;
              const cancelH = (user.cancelled / totalSafe) * 100;
              const isSelected = activeReceiver?.toLowerCase() === user.username.toLowerCase();

              return (
                <div
                  key={user.username}
                  className={`gpms-stacked-column-wrap ${isSelected ? 'is-active' : ''}`}
                  onMouseEnter={() => setHoveredUser(user)}
                  onMouseLeave={() => setHoveredUser(null)}
                  onClick={() => onSelectReceiver(isSelected ? undefined : user.username)}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {user.total.toLocaleString('vi-VN')}
                  </div>

                  {/* Vùng giữ chiều cao đồng nhất 170px để các cột neo đáy chuẩn xác */}
                  <div
                    style={{
                      height: '170px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      width: '100%',
                    }}
                  >
                    <div
                      className="gpms-stacked-pillar"
                      style={{
                        height: `${totalPctHeight}px`,
                        animationDelay: `${idx * 65}ms`,
                      }}
                    >
                      {/* Đáy: Xanh chưa trễ hạn YCHT */}
                      {user.on_time_ycht > 0 && (
                        <div
                          style={{
                            height: `${onTimeH}%`,
                            minHeight: '3px',
                            backgroundColor: COLOR_ON_TIME,
                            transition: 'height 360ms ease',
                          }}
                          title={`Chưa trễ hạn YCHT: ${user.on_time_ycht.toLocaleString('vi-VN')}`}
                        />
                      )}
                      {/* Giữa: Đỏ trễ hạn YCHT */}
                      {user.overdue_ycht > 0 && (
                        <div
                          style={{
                            height: `${overdueH}%`,
                            minHeight: '3px',
                            backgroundColor: COLOR_OVERDUE,
                            transition: 'height 360ms ease',
                          }}
                          title={`Trễ hạn YCHT: ${user.overdue_ycht.toLocaleString('vi-VN')}`}
                        />
                      )}
                      {/* Đỉnh: Xám Đã hủy */}
                      {user.cancelled > 0 && (
                        <div
                          style={{
                            height: `${cancelH}%`,
                            minHeight: '3px',
                            backgroundColor: COLOR_CANCEL,
                            transition: 'height 360ms ease',
                          }}
                          title={`Đã hủy: ${user.cancelled.toLocaleString('vi-VN')}`}
                        />
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', width: '100%', minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${user.full_name} (${user.username})`}
                    >
                      #{idx + 1} {user.username}
                    </div>
                    <div
                      style={{
                        fontSize: '10.5px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {user.on_time_rate}% đúng hạn
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nút mở rộng xem thêm danh sách tất cả User nhận yêu cầu */}
      {receivers.length > 5 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <Button
            size="sm"
            variant="outline"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => setExpanded((v) => !v)}
            leftIcon={expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          >
            {expanded
              ? 'Thu gọn danh sách Top 5'
              : `Mở rộng xem thêm (${receivers.length - 5} user khác)`}
          </Button>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Hiển thị Top 5 mặc định • Bấm để xem đủ {receivers.length} nhân sự
          </span>
        </div>
      )}

      {/* Vùng mở rộng danh sách các User còn lại vẫn dùng thanh 1 cột 3 màu */}
      {expanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px dashed var(--border-color)',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhanh trong toàn bộ User nhận yêu cầu..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '7px 12px 7px 32px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12.5px',
              }}
            />
          </div>

          <div
            style={{
              maxHeight: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px',
            }}
          >
            {remainingList.map((user, idx) => {
              const rank = searchQuery.trim() ? idx + 1 : idx + 6;
              const isSelected = activeReceiver?.toLowerCase() === user.username.toLowerCase();
              const barPctWidth = Math.max(2, (user.total / maxAllTotal) * 100);
              const totalSafe = Math.max(1, user.total);
              const overduePct = (user.overdue_ycht / totalSafe) * 100;
              const onTimePct = (user.on_time_ycht / totalSafe) * 100;
              const cancelPct = (user.cancelled / totalSafe) * 100;

              return (
                <div
                  key={user.username}
                  className={`gpms-interactive-row ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectReceiver(isSelected ? undefined : user.username)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <Badge variant="neutral">#{rank}</Badge>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {user.full_name !== user.username ? `${user.full_name} (${user.username})` : user.username}
                      </span>
                      <Badge variant={user.region === 'NAM' ? 'warning' : 'info'}>
                        {user.region === 'NAM' ? 'Nam' : 'Bắc'}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: COLOR_OVERDUE, fontWeight: 700 }} title="Trễ hạn YCHT">
                        {user.overdue_ycht.toLocaleString('vi-VN')} trễ
                      </span>
                      <span style={{ color: COLOR_ON_TIME, fontWeight: 700 }} title="Chưa trễ hạn YCHT">
                        {user.on_time_ycht.toLocaleString('vi-VN')} đúng
                      </span>
                      <span style={{ color: COLOR_CANCEL, fontWeight: 600 }} title="Đã hủy">
                        {user.cancelled.toLocaleString('vi-VN')} hủy
                      </span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {user.total.toLocaleString('vi-VN')}
                      </strong>
                      <button
                        type="button"
                        title="Xem chi tiết ticket"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectReceiver(user);
                        }}
                        style={{
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-secondary)',
                          borderRadius: '6px',
                          padding: '3px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Thanh 3 màu trên 1 hàng tỷ lệ theo tổng lớn nhất */}
                  <div className="gpms-bar-track" style={{ height: '11px' }}>
                    <div
                      style={{
                        width: `${barPctWidth}%`,
                        height: '100%',
                        display: 'flex',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      {user.overdue_ycht > 0 && (
                        <div style={{ width: `${overduePct}%`, backgroundColor: COLOR_OVERDUE }} />
                      )}
                      {user.on_time_ycht > 0 && (
                        <div style={{ width: `${onTimePct}%`, backgroundColor: COLOR_ON_TIME }} />
                      )}
                      {user.cancelled > 0 && (
                        <div style={{ width: `${cancelPct}%`, backgroundColor: COLOR_CANCEL }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
