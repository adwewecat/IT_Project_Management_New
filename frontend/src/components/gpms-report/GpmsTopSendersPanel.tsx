import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Search, Send, Users } from 'lucide-react';
import { GpmsSenderStat } from '../../types/gpmsReport';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface GpmsTopSendersPanelProps {
  senders: GpmsSenderStat[];
  anonymousCount: number;
  includeAnonymous: boolean;
  onToggleAnonymous: () => void;
  activeSender?: string;
  onSelectSender: (username?: string) => void;
  onInspectSender: (sender: GpmsSenderStat) => void;
}

const RANK_COLORS = ['#F59E0B', '#94A3B8', '#D97706', '#3B82F6', '#6366F1'];

export const GpmsTopSendersPanel: React.FC<GpmsTopSendersPanelProps> = ({
  senders,
  anonymousCount,
  includeAnonymous,
  onToggleAnonymous,
  activeSender,
  onSelectSender,
  onInspectSender,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [extraVisibleCount, setExtraVisibleCount] = useState(30);

  const maxTotal = useMemo(
    () => Math.max(1, senders[0]?.total || 1),
    [senders]
  );

  const topFive = useMemo(() => senders.slice(0, 5), [senders]);

  const filteredRemaining = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = q ? senders : senders.slice(5);
    if (!q) return base;
    return base.filter(
      (s) =>
        s.username.toLowerCase().includes(q) ||
        (s.full_name || '').toLowerCase().includes(q)
    );
  }, [senders, searchQuery]);

  const renderSenderRow = (sender: GpmsSenderStat, rank: number) => {
    const isSelected = activeSender?.toLowerCase() === sender.username.toLowerCase();
    const widthPct = Math.max(2, (sender.total / maxTotal) * 100);
    const accent = rank <= 5 ? RANK_COLORS[rank - 1] : '#0EA5E9';

    return (
      <div
        key={`${sender.username}-${rank}`}
        className={`gpms-interactive-row ${isSelected ? 'is-active' : ''}`}
        onClick={() => onSelectSender(isSelected ? undefined : sender.username)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span
              style={{
                minWidth: '24px',
                height: '22px',
                padding: '0 6px',
                borderRadius: '7px',
                backgroundColor: rank <= 3 ? accent : 'var(--bg-secondary)',
                color: rank <= 3 ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              #{rank}
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`${sender.full_name} (${sender.username})`}
              >
                {sender.full_name && sender.full_name !== sender.username
                  ? `${sender.full_name} (${sender.username})`
                  : sender.username}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {sender.total.toLocaleString('vi-VN')}
            </span>
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-muted)', minWidth: '42px', textAlign: 'right' }}>
              {sender.percentage.toFixed(1)}%
            </span>
            <button
              type="button"
              title="Xem ticket do user này gửi"
              onClick={(e) => {
                e.stopPropagation();
                onInspectSender(sender);
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

        <div className="gpms-bar-track">
          <div
            className="gpms-bar-fill"
            style={{
              width: `${widthPct}%`,
              background: `linear-gradient(90deg, ${accent}, var(--color-primary))`,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <section className="gpms-panel gpms-stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Send size={17} style={{ color: 'var(--color-primary)' }} />
            <span>1. Top 5 User Gửi Yêu Cầu Nhiều Nhất</span>
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Thống kê theo Người tạo ({senders.length.toLocaleString('vi-VN')} tài khoản gửi) • Bấm để lọc chéo
          </p>
        </div>

        {anonymousCount > 0 && (
          <button
            type="button"
            className={`gpms-pill-btn ${!includeAnonymous ? 'is-active' : ''}`}
            onClick={onToggleAnonymous}
            title="Bật/tắt tài khoản Anonymous khỏi bảng xếp hạng người gửi"
          >
            {includeAnonymous ? <EyeOff size={13} /> : <Users size={13} />}
            <span>
              {includeAnonymous
                ? `Ẩn Anonymous (${anonymousCount.toLocaleString('vi-VN')})`
                : `Đang ẩn Anonymous (${anonymousCount.toLocaleString('vi-VN')})`}
            </span>
          </button>
        )}
      </div>

      {topFive.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Không có người gửi nào khớp bộ lọc hiện tại.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {topFive.map((s, idx) => renderSenderRow(s, idx + 1))}
        </div>
      )}

      {senders.length > 5 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setExpanded((v) => !v);
              setExtraVisibleCount(30);
            }}
            leftIcon={expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          >
            {expanded
              ? 'Thu gọn chỉ xem Top 5'
              : `Mở rộng xem thêm (${(senders.length - 5).toLocaleString('vi-VN')} user khác)`}
          </Button>
          <Badge variant="neutral">Tổng {senders.length.toLocaleString('vi-VN')} người gửi</Badge>
        </div>
      )}

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setExtraVisibleCount(30);
              }}
              placeholder="Tìm tên nhà hàng, mã đơn vị hoặc username người gửi..."
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
              gap: '4px',
              paddingRight: '4px',
            }}
          >
            {filteredRemaining.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                Không tìm thấy người gửi phù hợp.
              </div>
            ) : (
              filteredRemaining
                .slice(0, extraVisibleCount)
                .map((s, idx) => renderSenderRow(s, searchQuery.trim() ? idx + 1 : idx + 6))
            )}
            {filteredRemaining.length > extraVisibleCount && (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6px' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setExtraVisibleCount((c) => c + 50)}
                >
                  Tải thêm ({filteredRemaining.length - extraVisibleCount} user còn lại)
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
