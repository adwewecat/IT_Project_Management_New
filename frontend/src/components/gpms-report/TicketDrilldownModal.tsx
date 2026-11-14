import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TopScrollTable } from '../ui/TopScrollTable';
import { gpmsReportService } from '../../services/gpmsReportService';
import { GpmsFilterState, GpmsTicketDetailItem } from '../../types/gpmsReport';
import { formatDateTimeDDMMYYYY } from '../../utils/dateFormat';

interface TicketDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filters: GpmsFilterState;
}

const SLA_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'danger' | 'neutral' }> = {
  ht_dung_han: { label: 'HT đúng hạn', variant: 'success' },
  ht_tre_han: { label: 'HT trễ hạn', variant: 'warning' },
  chua_ht_chua_tre: { label: 'Chưa HT (chưa trễ)', variant: 'info' },
  chua_ht_tre_han: { label: 'Chưa HT (trễ hạn)', variant: 'danger' },
  da_huy: { label: 'Đã hủy', variant: 'neutral' },
};

export const TicketDrilldownModal: React.FC<TicketDrilldownModalProps> = ({
  isOpen,
  onClose,
  title,
  filters,
}) => {
  const [items, setItems] = useState<GpmsTicketDetailItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [appliedSearch, setAppliedSearch] = useState(filters.search || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSearchInput(filters.search || '');
      setAppliedSearch(filters.search || '');
    }
  }, [isOpen, filters.search]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    gpmsReportService
      .getTicketDetails({ ...filters, search: appliedSearch }, page, pageSize)
      .then((res) => {
        if (!active) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, filters, appliedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1160px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <FileText size={19} style={{ color: 'var(--color-primary)' }} />
          <span>{title}</span>
          <Badge variant="primary">{total.toLocaleString('vi-VN')} ticket</Badge>
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Trang {page}/{totalPages} • Tổng {total.toLocaleString('vi-VN')} công việc
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight size={14} />}
            >
              Sau
            </Button>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Đóng
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
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
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1);
                  setAppliedSearch(searchInput);
                }
              }}
              placeholder="Tìm mã nhiệm vụ, tiêu đề, người tạo, người xử lý, DMCV rồi nhấn Enter..."
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
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setPage(1);
              setAppliedSearch(searchInput);
            }}
          >
            Tìm kiếm
          </Button>
        </div>

        <TopScrollTable maxHeight="56vh">
          <table
            style={{
              width: '100%',
              minWidth: '1040px',
              borderCollapse: 'collapse',
              fontSize: '12.5px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                {['Mã nhiệm vụ', 'Nhiệm vụ', 'Tiêu chí SLA', 'Phân loại', 'Người tạo', 'Người xử lý', 'Vùng', 'DMCV Cấp 1 / 2', 'Ngày YCHT', 'Ngày HTTT'].map((h) => (
                  <th
                    key={h}
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '9px 10px',
                      textAlign: 'left',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--border-color)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải danh sách ticket chi tiết...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có công việc nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                items.map((t, idx) => {
                  const slaMeta = SLA_LABELS[t.sla_status] || { label: t.status, variant: 'neutral' as const };
                  return (
                    <tr
                      key={`${t.code}-${idx}`}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-primary)',
                      }}
                    >
                      <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11.5px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {t.code}
                      </td>
                      <td style={{ padding: '8px 10px', maxWidth: '240px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {t.title || '—'}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <Badge variant={slaMeta.variant}>{slaMeta.label}</Badge>
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {t.phan_loai}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.creator}</div>
                        {t.creator_name && t.creator_name !== t.creator && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.creator_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.assignee}</div>
                        {t.assignee_name && t.assignee_name !== t.assignee && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.assignee_name}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        <Badge variant={t.region === 'NAM' ? 'warning' : 'info'}>
                          {t.region === 'NAM' ? 'Miền Nam' : 'Miền Bắc'}
                        </Badge>
                      </td>
                      <td style={{ padding: '8px 10px', maxWidth: '180px' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.dmcv1}</div>
                        {t.dmcv2 && t.dmcv2 !== t.dmcv1 && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.dmcv2}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatDateTimeDDMMYYYY(t.ycht_iso, { fallback: '—' })}
                      </td>
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                        {formatDateTimeDDMMYYYY(t.httt_iso, { fallback: '—' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TopScrollTable>
      </div>
    </Modal>
  );
};
