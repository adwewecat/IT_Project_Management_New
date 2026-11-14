import React, { useEffect, useMemo, useState } from 'react';
import { Check, MapPin, Plus, Search, UserCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { GpmsSouthUserCandidate } from '../../types/gpmsReport';

interface SouthRegionConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: GpmsSouthUserCandidate[];
  initialSelected: string[];
  onSave: (usernames: string[], fullNames: Record<string, string>) => Promise<void>;
  saving?: boolean;
}

export const SouthRegionConfigModal: React.FC<SouthRegionConfigModalProps> = ({
  isOpen,
  onClose,
  candidates,
  initialSelected,
  onSave,
  saving = false,
}) => {
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'selected' | 'gpms'>('all');
  const [customUsername, setCustomUsername] = useState('');
  const [extraCandidates, setExtraCandidates] = useState<GpmsSouthUserCandidate[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSet(new Set(initialSelected.map((u) => u.trim().toLowerCase()).filter(Boolean)));
      setSearchQuery('');
      setViewMode('all');
      setCustomUsername('');
      setExtraCandidates([]);
    }
  }, [isOpen, initialSelected]);

  const mergedCandidates = useMemo(() => {
    const map = new Map<string, GpmsSouthUserCandidate>();
    for (const c of candidates) {
      map.set(c.username.toLowerCase(), c);
    }
    for (const ec of extraCandidates) {
      const k = ec.username.toLowerCase();
      if (!map.has(k)) {
        map.set(k, ec);
      }
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      const aSel = selectedSet.has(a.username.toLowerCase()) ? 1 : 0;
      const bSel = selectedSet.has(b.username.toLowerCase()) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel;
      if (a.ticket_count !== b.ticket_count) return b.ticket_count - a.ticket_count;
      return a.username.localeCompare(b.username);
    });
    return arr;
  }, [candidates, extraCandidates, selectedSet]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return mergedCandidates.filter((c) => {
      const ulow = c.username.toLowerCase();
      if (viewMode === 'selected' && !selectedSet.has(ulow)) return false;
      if (viewMode === 'gpms' && c.ticket_count <= 0) return false;
      if (!q) return true;
      return (
        ulow.includes(q) ||
        (c.full_name || '').toLowerCase().includes(q)
      );
    });
  }, [mergedCandidates, searchQuery, viewMode, selectedSet]);

  const toggleUser = (username: string) => {
    const ulow = username.trim().toLowerCase();
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(ulow)) {
        next.delete(ulow);
      } else {
        next.add(ulow);
      }
      return next;
    });
  };

  const handleAddCustom = () => {
    const clean = customUsername.trim();
    if (!clean) return;
    const ulow = clean.toLowerCase();
    setExtraCandidates((prev) => [
      ...prev,
      {
        username: clean,
        full_name: clean,
        source: 'CONFIG',
        ticket_count: 0,
        is_south: true,
      },
    ]);
    setSelectedSet((prev) => new Set(prev).add(ulow));
    setCustomUsername('');
  };

  const handleSave = async () => {
    const fullNames: Record<string, string> = {};
    for (const c of mergedCandidates) {
      fullNames[c.username.toLowerCase()] = c.full_name || c.username;
    }
    await onSave(Array.from(selectedSet), fullNames);
  };

  const southCount = selectedSet.size;
  const gpmsCount = mergedCandidates.filter((c) => c.ticket_count > 0).length;
  const northCount = Math.max(0, gpmsCount - mergedCandidates.filter((c) => c.ticket_count > 0 && selectedSet.has(c.username.toLowerCase())).length);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="720px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={19} style={{ color: '#F59E0B' }} />
          <span>Cấu Hình User Nhận Yêu Cầu — Miền Nam</span>
        </div>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<UserCheck size={16} />}
          >
            Lưu Cấu Hình ({southCount} User Miền Nam)
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            Những User được tích chọn sẽ tính vào <strong style={{ color: 'var(--text-primary)' }}>Miền Nam</strong>,
            tất cả User xử lý còn lại tự động tính vào <strong style={{ color: 'var(--text-primary)' }}>Miền Bắc</strong>.
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <Badge variant="warning">Miền Nam: {southCount} user</Badge>
            <Badge variant="info">Miền Bắc (kỳ): {northCount} user</Badge>
          </div>
        </div>

        {/* Tìm kiếm & Bộ lọc */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search
              size={15}
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
              placeholder="Tìm nhanh theo username hoặc họ tên..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`gpms-pill-btn ${viewMode === 'all' ? 'is-active' : ''}`}
              onClick={() => setViewMode('all')}
            >
              Tất cả ({mergedCandidates.length})
            </button>
            <button
              type="button"
              className={`gpms-pill-btn ${viewMode === 'gpms' ? 'is-active' : ''}`}
              onClick={() => setViewMode('gpms')}
            >
              Có ticket kỳ này ({gpmsCount})
            </button>
            <button
              type="button"
              className={`gpms-pill-btn ${viewMode === 'selected' ? 'is-active' : ''}`}
              onClick={() => setViewMode('selected')}
            >
              Đã chọn ({southCount})
            </button>
          </div>
        </div>

        {/* Thêm nhanh username nếu chưa có trong danh sách */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={customUsername}
            onChange={(e) => setCustomUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustom();
              }
            }}
            placeholder="Nhập thêm username GPMS (VD: huy.ld) nếu chưa xuất hiện..."
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddCustom}
            disabled={!customUsername.trim()}
            leftIcon={<Plus size={14} />}
          >
            Thêm User
          </Button>
          {southCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedSet(new Set())}
            >
              Bỏ chọn hết
            </Button>
          )}
        </div>

        {/* Danh sách checkbox có cuộn riêng */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-primary)',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredCandidates.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Không tìm thấy nhân sự phù hợp với điều kiện lọc.
            </div>
          ) : (
            filteredCandidates.map((item) => {
              const ulow = item.username.toLowerCase();
              const checked = selectedSet.has(ulow);
              return (
                <div
                  key={ulow}
                  onClick={() => toggleUser(item.username)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: checked ? 'var(--color-primary-subtle)' : 'transparent',
                    border: checked ? '1px solid var(--color-primary)' : '1px solid transparent',
                    transition: 'background-color 140ms ease, border-color 140ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        backgroundColor: checked ? 'var(--color-primary)' : 'var(--bg-card)',
                        border: checked ? '1px solid var(--color-primary)' : '1px solid var(--border-color-dark)',
                        color: '#111827',
                      }}
                    >
                      {checked && <Check size={12} strokeWidth={3} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.full_name && item.full_name !== item.username
                          ? `${item.full_name} (${item.username})`
                          : item.username}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {item.ticket_count > 0 && (
                      <Badge variant="neutral">{item.ticket_count.toLocaleString('vi-VN')} ticket</Badge>
                    )}
                    <Badge variant={checked ? 'warning' : 'neutral'}>
                      {checked ? 'Miền Nam' : 'Miền Bắc'}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};
