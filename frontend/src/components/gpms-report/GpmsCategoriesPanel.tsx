import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Eye, FolderTree, Layers, Search } from 'lucide-react';
import { GpmsCategoryStat, GpmsDmcv1Stat } from '../../types/gpmsReport';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface GpmsCategoriesPanelProps {
  phanLoaiList: GpmsCategoryStat[];
  dmcv1List: GpmsDmcv1Stat[];
  unassignedDmcvCount: number;
  includeUnassignedDmcv: boolean;
  onToggleUnassignedDmcv: () => void;
  activePhanLoai?: string;
  activeDmcv1?: string;
  activeDmcv2?: string;
  onSelectPhanLoai: (name?: string) => void;
  onSelectDmcv1: (name?: string) => void;
  onSelectDmcv2: (dmcv1Name: string, dmcv2Name?: string) => void;
  onInspectCategory: (filterPatch: { phanLoai?: string; dmcv1?: string; dmcv2?: string }, title: string) => void;
}

const PL_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6'];
const COLOR_OVERDUE = '#EF4444';
const COLOR_ON_TIME = '#10B981';
const COLOR_CANCEL = '#64748B';

export const GpmsCategoriesPanel: React.FC<GpmsCategoriesPanelProps> = ({
  phanLoaiList,
  dmcv1List,
  unassignedDmcvCount,
  includeUnassignedDmcv,
  onToggleUnassignedDmcv,
  activePhanLoai,
  activeDmcv1,
  activeDmcv2,
  onSelectPhanLoai,
  onSelectDmcv1,
  onSelectDmcv2,
  onInspectCategory,
}) => {
  const [dmcvExpanded, setDmcvExpanded] = useState(false);
  const [dmcvSearch, setDmcvSearch] = useState('');
  const [openAccordionDmcv1, setOpenAccordionDmcv1] = useState<string | null>(null);

  const maxPlTotal = useMemo(() => Math.max(1, phanLoaiList[0]?.total || 1), [phanLoaiList]);

  const filteredDmcv1 = useMemo(() => {
    const q = dmcvSearch.trim().toLowerCase();
    if (!q) return dmcv1List;
    return dmcv1List.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.top_children.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [dmcv1List, dmcvSearch]);

  const maxDmcvTotal = useMemo(() => Math.max(1, filteredDmcv1[0]?.total || 1), [filteredDmcv1]);
  const visibleDmcv1 = useMemo(
    () => (dmcvExpanded || dmcvSearch.trim() ? filteredDmcv1 : filteredDmcv1.slice(0, 7)),
    [filteredDmcv1, dmcvExpanded, dmcvSearch]
  );

  return (
    <div className="gpms-grid-2col">
      {/* 5. Phân loại theo cột Phân loại */}
      <section className="gpms-panel gpms-stagger-5" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Layers size={17} style={{ color: '#6366F1' }} />
            <span>5. Phân Loại Theo Cột Phân Loại Công Việc</span>
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Tổng hợp theo 3CX, G-Ticket, G-Process, Routine, PRPO, Quick-Ticket... • Bấm để lọc chéo
          </p>
        </div>

        {phanLoaiList.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Không có dữ liệu phân loại khớp bộ lọc.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {phanLoaiList.map((item, idx) => {
              const isSelected = activePhanLoai === item.name;
              const accent = PL_COLORS[idx % PL_COLORS.length];
              const barW = Math.max(2, (item.total / maxPlTotal) * 100);
              const safeT = Math.max(1, item.total);

              return (
                <div
                  key={item.name}
                  className={`gpms-interactive-row ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectPhanLoai(isSelected ? undefined : item.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ color: COLOR_OVERDUE, fontWeight: 600 }}>{item.overdue_ycht.toLocaleString('vi-VN')} trễ</span>
                      <span style={{ color: COLOR_ON_TIME, fontWeight: 600 }}>{item.on_time_ycht.toLocaleString('vi-VN')} đúng</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{item.total.toLocaleString('vi-VN')}</strong>
                      <span style={{ color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
                        {item.percentage.toFixed(1)}%
                      </span>
                      <button
                        type="button"
                        title={`Xem ticket thuộc ${item.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectCategory({ phanLoai: item.name }, `Phân loại: ${item.name}`);
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

                  {/* Thanh tỷ trọng có 3 màu sức khỏe */}
                  <div className="gpms-bar-track" style={{ height: '10px' }}>
                    <div style={{ width: `${barW}%`, height: '100%', display: 'flex', borderRadius: '999px', overflow: 'hidden' }}>
                      {item.overdue_ycht > 0 && (
                        <div style={{ width: `${(item.overdue_ycht / safeT) * 100}%`, backgroundColor: COLOR_OVERDUE }} />
                      )}
                      {item.on_time_ycht > 0 && (
                        <div style={{ width: `${(item.on_time_ycht / safeT) * 100}%`, backgroundColor: COLOR_ON_TIME }} />
                      )}
                      {item.cancelled > 0 && (
                        <div style={{ width: `${(item.cancelled / safeT) * 100}%`, backgroundColor: COLOR_CANCEL }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Phân loại theo Danh Mục Công Việc (DMCV Cấp 1 -> Cấp 2) */}
      <section className="gpms-panel gpms-stagger-5" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <FolderTree size={17} style={{ color: '#0EA5E9' }} />
              <span>6. Phân Loại Theo Danh Mục Công Việc (DMCV)</span>
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {dmcv1List.length} nhóm DMCV cấp 1 • Bấm mũi tên để mở nhánh DMCV cấp 2
            </p>
          </div>

          {unassignedDmcvCount > 0 && (
            <button
              type="button"
              className={`gpms-pill-btn ${!includeUnassignedDmcv ? 'is-active' : ''}`}
              onClick={onToggleUnassignedDmcv}
            >
              {includeUnassignedDmcv
                ? `Ẩn "Chưa gắn DMCV" (${unassignedDmcvCount.toLocaleString('vi-VN')})`
                : `Đang ẩn "Chưa gắn DMCV"`}
            </button>
          )}
        </div>

        {/* Tìm kiếm DMCV cấp 1 / cấp 2 (>10 danh mục bắt buộc có tìm kiếm) */}
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
            value={dmcvSearch}
            onChange={(e) => setDmcvSearch(e.target.value)}
            placeholder="Tìm danh mục công việc (cấp 1 hoặc cấp 2)..."
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
            maxHeight: dmcvExpanded || dmcvSearch.trim() ? '410px' : 'none',
            overflowY: dmcvExpanded || dmcvSearch.trim() ? 'auto' : 'visible',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            paddingRight: '4px',
          }}
        >
          {visibleDmcv1.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Không tìm thấy danh mục công việc phù hợp.
            </div>
          ) : (
            visibleDmcv1.map((d1) => {
              const isSelected = activeDmcv1 === d1.name;
              const isTreeOpen = openAccordionDmcv1 === d1.name || isSelected;
              const barW = Math.max(2, (d1.total / maxDmcvTotal) * 100);
              const hasChildren = d1.top_children && d1.top_children.length > 0 && d1.name !== 'Chưa gắn DMCV';

              return (
                <div
                  key={d1.name}
                  style={{
                    borderRadius: '10px',
                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid transparent',
                    backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                  }}
                >
                  <div
                    className="gpms-interactive-row"
                    style={{ backgroundColor: 'transparent', border: 'none' }}
                    onClick={() => onSelectDmcv1(isSelected ? undefined : d1.name)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenAccordionDmcv1((cur) => (cur === d1.name ? null : d1.name));
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: '2px',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)',
                              display: 'inline-flex',
                            }}
                            title="Mở nhanh DMCV cấp 2"
                          >
                            {isTreeOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: d1.name === 'Chưa gắn DMCV' ? 'var(--text-muted)' : 'var(--text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={d1.name}
                        >
                          {d1.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexShrink: 0 }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{d1.total.toLocaleString('vi-VN')}</strong>
                        <span style={{ color: 'var(--text-muted)', minWidth: '40px', textAlign: 'right' }}>
                          {d1.percentage.toFixed(1)}%
                        </span>
                        <button
                          type="button"
                          title={`Xem ticket thuộc DMCV ${d1.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectCategory({ dmcv1: d1.name }, `DMCV: ${d1.name}`);
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

                    <div className="gpms-bar-track" style={{ height: '8px' }}>
                      <div
                        className="gpms-bar-fill"
                        style={{
                          width: `${barW}%`,
                          background: d1.name === 'Chưa gắn DMCV'
                            ? '#94A3B8'
                            : 'linear-gradient(90deg, #0EA5E9, #6366F1)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Nhánh con DMCV Cấp 2 */}
                  {hasChildren && isTreeOpen && (
                    <div
                      style={{
                        margin: '2px 10px 8px 26px',
                        paddingLeft: '10px',
                        borderLeft: '2px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {d1.top_children.map((c2) => {
                        const isChildSel = activeDmcv1 === d1.name && activeDmcv2 === c2.name;
                        return (
                          <div
                            key={c2.name}
                            onClick={() =>
                              onSelectDmcv2(d1.name, isChildSel ? undefined : c2.name)
                            }
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              padding: '4px 8px',
                              borderRadius: '7px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              backgroundColor: isChildSel ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                              border: isChildSel ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                            }}
                          >
                            <span style={{ color: 'var(--text-primary)', fontWeight: isChildSel ? 700 : 500 }}>
                              ↳ {c2.name}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                              <span style={{ color: COLOR_OVERDUE, fontSize: '11px', fontWeight: 600 }}>
                                {c2.overdue_ycht} trễ
                              </span>
                              <strong style={{ color: 'var(--text-primary)' }}>{c2.total.toLocaleString('vi-VN')}</strong>
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                ({c2.percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {filteredDmcv1.length > 7 && !dmcvSearch.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDmcvExpanded((v) => !v)}
              leftIcon={dmcvExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            >
              {dmcvExpanded
                ? 'Thu gọn DMCV'
                : `Mở rộng xem thêm (${filteredDmcv1.length - 7} danh mục khác)`}
            </Button>
            <Badge variant="neutral">{filteredDmcv1.length} nhóm DMCV cấp 1</Badge>
          </div>
        )}
      </section>
    </div>
  );
};
