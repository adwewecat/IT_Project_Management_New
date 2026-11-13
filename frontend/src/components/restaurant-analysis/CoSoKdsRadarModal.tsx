import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  Tablet,
  Smartphone,
  ChefHat,
  ArrowRight,
  Copy,
  Check,
  Printer,
  Eye,
  X,
  History,
  Layers
} from 'lucide-react';
import { Button } from '../ui/Button';
import { TopScrollTable } from '../ui/TopScrollTable';
import { DateInput } from '../ui/DateInput';
import {
  mongoService,
  CoSoKdsOrderFlowResponse,
  CoSoKdsOrderFlowItem,
  KdsDishHistoryResponse
} from '../../services/mongoService';

interface CoSoKdsRadarModalProps {
  host?: string;
  port?: number;
  mongoHost?: string;
  mongoPort?: number;
  restaurantName?: string;
  ipSubnet?: string;
  inline?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface TableGroupSummary {
  tableNumber: string;
  tableName: string;
  latestTimeStr: string;
  latestTimestampMs: number;
  orderDateStr: string;
  totalDishes: number;
  totalQuantity: number;
  cookingCount: number;
  doneCount: number;
  delayedCount: number;
  sources: string[];
  dishes: CoSoKdsOrderFlowItem[];
}

export const CoSoKdsRadarModal: React.FC<CoSoKdsRadarModalProps> = ({
  host: propHost,
  port: propPort,
  mongoHost,
  mongoPort,
  restaurantName,
  showToast
}) => {
  const host = (propHost || mongoHost || '').trim();
  const port = propPort || mongoPort || 27017;
  const notify = useCallback(
    (msg: string, type?: 'success' | 'error' | 'info') => {
      if (showToast) showToast(msg, type);
    },
    [showToast]
  );
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [fromTime, setFromTime] = useState<string>('');
  const [toTime, setToTime] = useState<string>('');
  const [tableInput, setTableInput] = useState<string>('');
  const [queryInput, setQueryInput] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'CO' | 'SO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DELAYED' | 'COOKING' | 'DONE'>('ALL');

  const [loading, setLoading] = useState<boolean>(false);
  const [flowData, setFlowData] = useState<CoSoKdsOrderFlowResponse | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Bàn đang được focus (bấm vào bàn nào thì chỉ hiển thị các món trong bàn đó)
  // Giá trị '__ALL__' nghĩa là xem tất cả các bàn (tự động bật khi người dùng tìm theo món)
  const [focusedTable, setFocusedTable] = useState<string>('');

  // State cho Modal "Soi Món" (5 chặng lượt order + Lịch sử & Cấu hình KDS toàn nhà hàng của món đó)
  const [inspectDish, setInspectDish] = useState<CoSoKdsOrderFlowItem | null>(null);
  const [dishHistoryData, setDishHistoryData] = useState<KdsDishHistoryResponse | null>(null);
  const [loadingDishHistory, setLoadingDishHistory] = useState<boolean>(false);

  const fetchOrderFlow = useCallback(
    async (
      customTable?: string,
      customQuery?: string,
      customDate?: string,
      customSource?: string,
      customFrom?: string,
      customTo?: string
    ) => {
      if (!host) return;
      setLoading(true);
      try {
        const qVal = (customQuery !== undefined ? customQuery : queryInput).trim();
        const tVal = (customTable !== undefined ? customTable : tableInput).trim();
        const res = await mongoService.getCoSoKdsOrderFlow({
          host,
          port,
          table: tVal || undefined,
          date: customDate !== undefined ? customDate : filterDate,
          query: qVal || undefined,
          source: customSource !== undefined ? customSource : sourceFilter,
          from_time: (customFrom !== undefined ? customFrom : fromTime).trim() || undefined,
          to_time: (customTo !== undefined ? customTo : toTime).trim() || undefined
        });
        setFlowData(res);
        if (res.effective_date && res.effective_date !== filterDate && customDate === undefined) {
          setFilterDate(res.effective_date);
        }
      } catch (err: any) {
        notify(err?.response?.data?.detail || 'Lỗi khi truy vết luồng đơn hàng CO-SO-KDS', 'error');
      } finally {
        setLoading(false);
      }
    },
    [host, port, tableInput, filterDate, queryInput, sourceFilter, fromTime, toTime, notify]
  );

  useEffect(() => {
    fetchOrderFlow();
  }, [host, port]);

  // Gom nhóm các bàn order gần nhất (sắp xếp theo thời gian order mới nhất giảm dần)
  const tableGroups = useMemo<TableGroupSummary[]>(() => {
    const allDishes = flowData?.dishes || [];
    const map = new Map<string, TableGroupSummary>();

    for (const d of allDishes) {
      if (statusFilter === 'DELAYED' && !d.is_delayed) continue;
      if (statusFilter === 'COOKING' && d.status !== 'COOKING' && d.status !== 'WAITING') continue;
      if (statusFilter === 'DONE' && d.status !== 'DONE' && d.status !== 'DELIVERED') continue;

      const tCode = (d.table_number || '-').trim();
      const tName = d.table_name || (tCode !== '-' ? `Bàn ${tCode}` : 'Bàn -');
      const ts = d.submit_timestamp_ms || 0;
      const timeStr = d.time_co_sent || d.time_kds_completed || '--:--:--';

      let grp = map.get(tCode);
      if (!grp) {
        grp = {
          tableNumber: tCode,
          tableName: tName,
          latestTimeStr: timeStr,
          latestTimestampMs: ts,
          orderDateStr: d.order_date || filterDate,
          totalDishes: 0,
          totalQuantity: 0,
          cookingCount: 0,
          doneCount: 0,
          delayedCount: 0,
          sources: [],
          dishes: []
        };
        map.set(tCode, grp);
      }

      grp.dishes.push(d);
      grp.totalDishes += 1;
      grp.totalQuantity += d.quantity || 1;
      if (!d.time_kds_completed && (d.status === 'COOKING' || d.status === 'WAITING' || d.status === 'DELAYED')) {
        grp.cookingCount += 1;
      } else {
        grp.doneCount += 1;
      }
      if (d.is_delayed) {
        grp.delayedCount += 1;
      }
      if (d.source && !grp.sources.includes(d.source)) {
        grp.sources.push(d.source);
      }
      if (ts > grp.latestTimestampMs) {
        grp.latestTimestampMs = ts;
        grp.latestTimeStr = timeStr;
        if (d.order_date) grp.orderDateStr = d.order_date;
      }
    }

    const list = Array.from(map.values());
    list.sort((a, b) => b.latestTimestampMs - a.latestTimestampMs);
    return list;
  }, [flowData, statusFilter, filterDate]);

  // Tự động chọn bàn order gần nhất khi danh sách bàn thay đổi (hoặc mở toàn bộ nếu đang tìm theo tên món)
  useEffect(() => {
    if (queryInput.trim()) {
      setFocusedTable('__ALL__');
      return;
    }
    if (tableGroups.length > 0) {
      const exists = focusedTable === '__ALL__' || tableGroups.some((g) => g.tableNumber === focusedTable);
      if (!focusedTable || !exists) {
        setFocusedTable(tableGroups[0].tableNumber);
      }
    } else {
      setFocusedTable('');
    }
  }, [tableGroups, queryInput]);

  // Danh sách món hiển thị ở bảng chi tiết bên dưới (theo bàn đang focus hoặc toàn bộ khi tìm món)
  const displayedDishes = useMemo(() => {
    if (focusedTable === '__ALL__') {
      return tableGroups.flatMap((g) => g.dishes);
    }
    const activeGroup = tableGroups.find((g) => g.tableNumber === focusedTable);
    return activeGroup ? activeGroup.dishes : [];
  }, [tableGroups, focusedTable]);

  const activeTableSummary = useMemo(() => {
    if (focusedTable === '__ALL__') return null;
    return tableGroups.find((g) => g.tableNumber === focusedTable) || null;
  }, [tableGroups, focusedTable]);

  // Mở modal Soi Món & gọi API lấy lịch sử + cấu hình KDS của món đó
  const handleOpenInspectDish = async (dish: CoSoKdsOrderFlowItem) => {
    setInspectDish(dish);
    setDishHistoryData(null);
    const codeToInspect = (dish.rk7_code || dish.sap_code || dish.dish_name || '').trim();
    if (!host || !codeToInspect) return;

    setLoadingDishHistory(true);
    try {
      const res = await mongoService.getKdsDishHistory({
        host,
        port,
        item_code: dish.rk7_code || codeToInspect,
        sap_code: dish.sap_code || undefined,
        dish_name: dish.dish_name || undefined
      });
      setDishHistoryData(res);
    } catch {
      // Không chặn hiển thị 5 chặng nếu API lịch sử phụ gặp lỗi
    } finally {
      setLoadingDishHistory(false);
    }
  };

  const handleCopyReport = () => {
    if (displayedDishes.length === 0) return;
    const scopeTitle = activeTableSummary
      ? `${activeTableSummary.tableName} (Order gần nhất: ${activeTableSummary.latestTimeStr})`
      : `Toàn bộ (${tableGroups.length} bàn)`;
    let text = `BÁO CÁO ĐỐI SOÁT LUỒNG ORDER & NHẬT KÝ KDS (${restaurantName || host} - Ngày: ${filterDate} - Phạm vi: ${scopeTitle})\n`;
    text += `-------------------------------------------------------------------------------------------------------------------------------------\n`;
    text += `BÀN | NGUỒN | TÊN MÓN | MÃ SAP | MÃ RK7 | SL | QUẦY BẾP | GIỜ GỬI | POS NHẬN | RA BẾP (DONE) | BƯNG RA (SO) | LỆNH IN | THỰC TẾ/SLA | TRẠNG THÁI\n`;
    text += `-------------------------------------------------------------------------------------------------------------------------------------\n`;
    displayedDishes.forEach((d) => {
      text += `${d.table_name || d.table_number} | ${d.source} | ${d.dish_name} | ${d.sap_code || '-'} | ${d.rk7_code || '-'} | x${d.quantity} | ${d.line_cook || '-'} | ${d.time_co_sent || '-'} | ${d.time_pos_received || '-'} | ${d.time_kds_completed || 'Chưa Done'} | ${d.time_so_delivered || '-'} | ${d.printer_name || d.print_status || '-'} | ${d.actual_minutes ?? d.elapsed_minutes}p/${d.sla_minutes}p | ${d.is_delayed ? 'TRỄ SLA' : 'Kịp giờ'}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    notify('Đã sao chép bảng đối soát luồng Order & KDS vào Clipboard!', 'success');
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Khung Bộ Lọc & Thanh Công Cụ */}
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary-text)',
                flexShrink: 0
              }}
            >
              <ChefHat size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  TRUY VẾT LUỒNG ORDER &amp; NHẬT KÝ KDS (CO - SO - KDS)
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    border: '1px solid var(--color-primary)'
                  }}
                >
                  Dữ Liệu Thực Tế 100% — Focus Theo Bàn &amp; Soi Món
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Nhà hàng: <strong style={{ color: 'var(--text-primary)' }}>{restaurantName || host}</strong> — Máy chủ MongoDB: <code>{host}:{port}</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fetchOrderFlow(tableInput, queryInput, filterDate, sourceFilter, fromTime, toTime)}
              isLoading={loading}
              leftIcon={<Search size={14} />}
            >
              Tra Cứu &amp; Quét Luồng
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyReport}
              disabled={displayedDishes.length === 0}
              leftIcon={copiedReport ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            >
              {copiedReport ? 'Đã Sao Chép!' : 'Sao Chép Báo Cáo'}
            </Button>
          </div>
        </div>

        {/* Hàng Ô Lọc Chi Tiết */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
            gap: '8px',
            alignItems: 'end',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-color)'
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Ngày Kiểm Tra:
            </label>
            <DateInput
              value={filterDate}
              onChange={(val) => {
                setFilterDate(val);
                fetchOrderFlow(tableInput, queryInput, val, sourceFilter, fromTime, toTime);
              }}
              compact
              containerStyle={{ width: '100%' }}
              style={{ height: '32px', fontSize: '12px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Từ Giờ:
            </label>
            <input
              type="text"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
              placeholder="VD: 10:00"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Đến Giờ:
            </label>
            <input
              type="text"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              placeholder="VD: 22:30"
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Lọc Nhanh Bàn Ăn:
            </label>
            <input
              type="text"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrderFlow(tableInput, queryInput, filterDate, sourceFilter, fromTime, toTime)}
              placeholder="VD: B1, C5, A3..."
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Tìm &amp; Soi Theo Món Ăn / Mã SAP / RK7:
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchOrderFlow(tableInput, queryInput, filterDate, sourceFilter, fromTime, toTime)}
                placeholder="Nhập tên món, mã SAP hoặc RK7 để soi món trên toàn nhà hàng..."
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: queryInput.trim() ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                  fontSize: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              {queryInput.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQueryInput('');
                    fetchOrderFlow(tableInput, '', filterDate, sourceFilter, fromTime, toTime);
                  }}
                  title="Xóa tìm kiếm món, quay về chế độ xem theo bàn"
                >
                  Xóa
                </Button>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Nguồn Order:
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => {
                const v = e.target.value as 'ALL' | 'CO' | 'SO';
                setSourceFilter(v);
                fetchOrderFlow(tableInput, queryInput, filterDate, v, fromTime, toTime);
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}
            >
              <option value="ALL">Tất cả nguồn (CO + SO)</option>
              <option value="CO">📱 Tablet Bàn (CO)</option>
              <option value="SO">🧑‍🍳 Máy Phục Vụ (SO)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Trạng Thái Món:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontWeight: 600
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COOKING">🔥 Đang chế biến (Chưa Done)</option>
              <option value="DONE">✅ Đã ra món / Đã bưng</option>
              <option value="DELAYED">⚠️ Trễ SLA (&gt; Chuẩn)</option>
            </select>
          </div>
        </div>
      </div>

      {/* KHỐI 1: DANH SÁCH CÁC BÀN ORDER GẦN NHẤT (BẤM VÀO BÀN ĐỂ FOCUS XEM CÁC MÓN TRONG BÀN ĐÓ) */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)' }}>
              🍽️ Danh Sách Các Bàn Order Gần Nhất ({tableGroups.length} bàn)
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
              — Bấm chọn vào bàn để soi danh sách các món trong bàn đó
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {queryInput.trim() && displayedDishes.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenInspectDish(displayedDishes[0])}
                leftIcon={<History size={13} />}
              >
                Soi Lịch Sử &amp; Cấu Hình KDS Món &quot;{queryInput.trim()}&quot;
              </Button>
            )}
            <button
              type="button"
              onClick={() => setFocusedTable(focusedTable === '__ALL__' ? (tableGroups[0]?.tableNumber || '') : '__ALL__')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: focusedTable === '__ALL__' ? '1.5px solid var(--color-primary)' : '1px solid var(--border-color)',
                backgroundColor: focusedTable === '__ALL__' ? 'var(--color-primary)' : 'var(--bg-secondary)',
                color: focusedTable === '__ALL__' ? 'var(--color-primary-text)' : 'var(--text-primary)'
              }}
            >
              {focusedTable === '__ALL__'
                ? `Đang xem gộp tất cả bàn (${flowData?.total_dishes || 0} món)`
                : `Xem gộp tất cả ${tableGroups.length} bàn (${flowData?.total_dishes || 0} món)`}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <RefreshCw size={16} className="animate-spin" style={{ display: 'inline', marginRight: '6px' }} />
            Đang phân tích danh sách bàn order gần nhất từ MongoDB...
          </div>
        ) : tableGroups.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            Không có bàn nào phát sinh đơn hàng khớp bộ lọc trong ngày {filterDate}.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: '8px',
              maxHeight: '195px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}
          >
            {tableGroups.map((grp, idx) => {
              const isSelected = focusedTable === grp.tableNumber;
              return (
                <button
                  key={grp.tableNumber}
                  type="button"
                  onClick={() => setFocusedTable(grp.tableNumber)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? 'var(--color-primary-subtle)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', width: '100%' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {idx === 0 && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-primary-text)',
                            fontWeight: 800
                          }}
                        >
                          MỚI NHẤT
                        </span>
                      )}
                      {grp.tableName}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {grp.latestTimeStr}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span>
                      Tổng: <strong style={{ color: 'var(--text-primary)' }}>{grp.totalDishes} món</strong> (SL: {grp.totalQuantity})
                    </span>
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {grp.sources.join('+')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {grp.cookingCount > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-primary-subtle)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--color-primary)'
                        }}
                      >
                        🔥 {grp.cookingCount} đang nấu
                      </span>
                    )}
                    {grp.doneCount > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-success-bg)',
                          color: 'var(--color-success)'
                        }}
                      >
                        ✓ {grp.doneCount} xong
                      </span>
                    )}
                    {grp.delayedCount > 0 && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-danger-bg)',
                          color: 'var(--color-danger)'
                        }}
                      >
                        ⚠ {grp.delayedCount} trễ
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* KHỐI 2: BẢNG CHI TIẾT CÁC MÓN TRONG BÀN ĐANG FOCUS (HOẶC KẾT QUẢ TÌM THEO MÓN) */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}
      >
        {/* Thanh trạng thái Bàn đang Focus + Sơ đồ 5 chặng */}
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-text)',
                  fontSize: '12px',
                  fontWeight: 800
                }}
              >
                {activeTableSummary
                  ? `Đang Focus: ${activeTableSummary.tableName} (${activeTableSummary.totalDishes} món — Order lúc ${activeTableSummary.latestTimeStr})`
                  : queryInput.trim()
                  ? `Kết quả soi món "${queryInput.trim()}" trên toàn nhà hàng (${displayedDishes.length} lượt gọi)`
                  : `Tất cả các bàn (${displayedDishes.length} món)`}
              </span>
              {flowData?.message && (
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {flowData.message}
                </span>
              )}
            </div>

            {activeTableSummary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
                <span>
                  Đang nấu: <strong>{activeTableSummary.cookingCount}</strong>
                </span>
                <span>•</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  Đã xong: {activeTableSummary.doneCount}
                </span>
                <span>•</span>
                <span style={{ color: activeTableSummary.delayedCount > 0 ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: 700 }}>
                  Trễ SLA: {activeTableSummary.delayedCount}
                </span>
              </div>
            )}
          </div>

          {/* Sơ đồ 5 chặng luồng dữ liệu */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '11px',
              paddingTop: '6px',
              borderTop: '1px dashed var(--border-color)'
            }}
          >
            {[
              { step: '1', label: 'Khách (CO) / Phục Vụ (SO)', sub: 'submitOrder()' },
              { step: '2', label: 'Máy Chủ POS R-Keeper', sub: 'G_ORDER' },
              { step: '3', label: 'MQTT Broker (1883)', sub: 'Topic LineCook' },
              { step: '4', label: 'Màn Hình KDS Bếp', sub: 'G_KITCHEN (Done)' },
              { step: '5', label: 'Phục Vụ Bưng Ra (SO)', sub: 'ORDER_DELIVERY_LOG' }
            ].map((st, i, arr) => (
              <React.Fragment key={st.step}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-primary)',
                      color: 'var(--color-primary-text)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '10px'
                    }}
                  >
                    {st.step}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{st.label}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>({st.sub})</span>
                </div>
                {i < arr.length - 1 && <ArrowRight size={12} color="var(--text-muted)" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Bảng Dữ Liệu */}
        <TopScrollTable maxHeight="480px">
          <table style={{ width: '100%', minWidth: '1240px', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}
              >
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '40px' }}>#</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '80px' }}>Bàn</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '85px' }}>Nguồn</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', minWidth: '220px' }}>Món Ăn / Mã SAP / RK7</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '45px' }}>SL</th>
                <th style={{ padding: '9px 10px', textAlign: 'left', width: '150px' }}>Quầy Bếp</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '90px' }}>Giờ Gửi (CO/SO)</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '85px' }}>POS Nhận</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '95px' }}>Ra Bếp (Done)</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '95px' }}>Bưng Ra (SO)</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '145px' }}>Lệnh In KDS</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '95px' }}>Thực Tế / SLA</th>
                <th style={{ padding: '9px 8px', textAlign: 'center', width: '110px' }}>Trạng Thái</th>
                <th style={{ padding: '9px 10px', textAlign: 'center', width: '90px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ display: 'inline', marginRight: '8px' }} />
                    Đang truy vết luồng đơn hàng &amp; nhật ký KDS thực tế từ MongoDB...
                  </td>
                </tr>
              ) : displayedDishes.length === 0 ? (
                <tr>
                  <td colSpan={14} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Không có món ăn nào khớp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                displayedDishes.map((dish, idx) => {
                  const isLate = dish.is_delayed;
                  const isCooking = !dish.time_kds_completed && (dish.status === 'COOKING' || dish.status === 'WAITING' || dish.status === 'DELAYED');
                  return (
                    <tr
                      key={`${dish.dish_id}_${idx}`}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: isLate
                          ? 'var(--color-danger-bg)'
                          : idx % 2 === 0
                          ? 'var(--bg-card)'
                          : 'var(--bg-secondary)'
                      }}
                    >
                      <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span
                          onClick={() => setFocusedTable(dish.table_number)}
                          title="Bấm để focus vào bàn này"
                          style={{
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            border: '1px solid var(--color-primary)',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer'
                          }}
                        >
                          {dish.table_name || `Bàn ${dish.table_number}`}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            backgroundColor: dish.source === 'CO' ? 'var(--color-primary-subtle)' : 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: dish.source === 'CO' ? '1px solid var(--color-primary)' : '1px solid var(--border-color)'
                          }}
                        >
                          {dish.source === 'CO' ? <Tablet size={11} /> : <Smartphone size={11} />}
                          {dish.source === 'CO' ? 'Tablet CO' : 'Staff SO'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          <Utensils size={12} color="var(--text-secondary)" />
                          <span>{dish.dish_name}</span>
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          SAP: <strong>{dish.sap_code || '—'}</strong> • RK7: <strong>{dish.rk7_code || '—'}</strong>
                          {dish.note && (
                            <span style={{ marginLeft: '6px', color: 'var(--text-primary)', fontWeight: 700 }}>
                              • Ghi chú: {dish.note}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800, color: 'var(--text-primary)' }}>
                        x{dish.quantity}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {dish.is_unassigned ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--color-danger-bg)',
                              color: 'var(--color-danger)',
                              fontSize: '11px',
                              fontWeight: 700
                            }}
                            title="Lúc order món chưa gán quầy cụ thể trong CONFIG_COOKING"
                          >
                            ⚠️ {dish.line_cook}
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--text-primary)'
                            }}
                          >
                            {dish.line_cook || 'Bếp KDS'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {dish.time_co_sent || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {dish.time_pos_received || '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: dish.time_kds_completed ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                        {dish.time_kds_completed || '🔥 Đang nấu'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: dish.time_so_delivered ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                        {dish.time_so_delivered || '⏳ Chờ bưng'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        {dish.print_status === 'PRINTED' || dish.time_kds_completed ? (
                          <span
                            title={dish.print_message || ''}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              backgroundColor: dish.print_status === 'NO_PRINTER' ? 'var(--bg-secondary)' : 'var(--color-success-bg)',
                              color: dish.print_status === 'NO_PRINTER' ? 'var(--text-secondary)' : 'var(--color-success)'
                            }}
                          >
                            <Printer size={11} />
                            {dish.printer_name || (dish.print_status === 'NO_PRINTER' ? 'Chưa gán máy in' : 'Đã in KDS')}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            ⏳ Chờ Done
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 800 }}>
                        <span style={{ color: isLate ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {dish.actual_minutes ?? dish.elapsed_minutes}p
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> / {dish.sla_minutes}p</span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {isLate ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              backgroundColor: 'var(--color-danger-bg)',
                              color: 'var(--color-danger)'
                            }}
                          >
                            <AlertTriangle size={11} /> Trễ SLA
                          </span>
                        ) : isCooking ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              backgroundColor: 'var(--color-primary-subtle)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--color-primary)'
                            }}
                          >
                            <Clock size={11} /> Đang làm
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              backgroundColor: 'var(--color-success-bg)',
                              color: 'var(--color-success)'
                            }}
                          >
                            <CheckCircle2 size={11} /> Kịp Giờ
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenInspectDish(dish)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-primary)',
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Soi chi tiết 5 chặng, cấu hình quầy bếp KDS và toàn bộ lịch sử gọi món này"
                        >
                          <Eye size={12} /> Soi Món
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </TopScrollTable>
      </div>

      {/* MODAL CON: SOI CHI TIẾT MÓN ĂN (5 CHẶNG LUỒNG ORDER + ĐỐI SOÁT CẤU HÌNH & LỊCH SỬ MÓN KDS TOÀN NHÀ HÀNG) */}
      {inspectDish && (
        <div
          onClick={() => setInspectDish(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '880px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
          >
            {/* Header Modal Soi Món */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--text-primary)" />
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Soi Chi Tiết Món Ăn &amp; Lịch Sử KDS: {inspectDish.dish_name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectDish(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Modal Soi Món */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
              {/* Thông tin lượt order đang chọn */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Bàn đang xem:</span>{' '}
                  <strong>{inspectDish.table_name || `Bàn ${inspectDish.table_number}`}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Nguồn Order:</span>{' '}
                  <strong>{inspectDish.source === 'CO' ? 'Tablet Bàn (CO)' : 'Máy Phục Vụ (SO)'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Mã SAP / RK7:</span>{' '}
                  <strong>{inspectDish.sap_code || '—'} / {inspectDish.rk7_code || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Quầy Bếp:</span>{' '}
                  <strong>{inspectDish.line_cook}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Máy In KDS:</span>{' '}
                  <strong>{inspectDish.printer_name || 'Chưa gán máy in'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Thời Gian Nấu / SLA:</span>{' '}
                  <strong style={{ color: inspectDish.is_delayed ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {inspectDish.actual_minutes ?? inspectDish.elapsed_minutes}p / {inspectDish.sla_minutes}p
                  </strong>
                </div>
              </div>

              {/* Timeline 5 chặng của lượt order này */}
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  1. Hành Trình 5 Chặng Của Lượt Order Này ({inspectDish.table_name || `Bàn ${inspectDish.table_number}`})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                  {[
                    {
                      step: 'Chặng 1: Gửi Order',
                      time: inspectDish.time_co_sent || '--:--:--',
                      desc: inspectDish.source === 'CO' ? 'Tablet CO gọi submitOrder()' : 'Nhân viên SO bấm gửi bếp',
                      ok: !!inspectDish.time_co_sent
                    },
                    {
                      step: 'Chặng 2: POS R-Keeper',
                      time: inspectDish.time_pos_received || '--:--:--',
                      desc: 'Đồng bộ đơn vào G_ORDER',
                      ok: !!inspectDish.time_pos_received
                    },
                    {
                      step: 'Chặng 3: MQTT -> KDS',
                      time: inspectDish.time_kds_received || '--:--:--',
                      desc: `Đẩy xuống ${inspectDish.line_cook}`,
                      ok: !!inspectDish.time_kds_received
                    },
                    {
                      step: 'Chặng 4: Bếp Bấm Done',
                      time: inspectDish.time_kds_completed || 'Chưa Done',
                      desc: inspectDish.time_kds_completed
                        ? `Hoàn thành & in [${inspectDish.printer_name || 'KDS'}]`
                        : 'Món đang nằm trên màn hình KDS',
                      ok: !!inspectDish.time_kds_completed
                    },
                    {
                      step: 'Chặng 5: Bưng Ra Bàn',
                      time: inspectDish.time_so_delivered || 'Chờ bưng ra',
                      desc: inspectDish.time_so_delivered
                        ? 'Đã giao món tới bàn khách'
                        : 'Chờ nhân viên phục vụ xác nhận',
                      ok: !!inspectDish.time_so_delivered
                    }
                  ].map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: s.ok ? '1px solid var(--border-color)' : '1px dashed var(--border-color)',
                        backgroundColor: s.ok ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>{s.step}</span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: s.ok ? 'var(--color-success)' : 'var(--text-secondary)'
                          }}
                        >
                          {s.time}
                        </span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Đối soát cấu hình KDS hiện tại & Lịch sử các bàn đã gọi món này */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  2. Đối Soát Cấu Hình KDS Hiện Tại &amp; Lịch Sử Các Bàn Đã Gọi Món Này
                </div>

                {loadingDishHistory ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={16} className="animate-spin" style={{ display: 'inline', marginRight: '6px' }} />
                    Đang đối soát cấu hình CONFIG_COOKING và lịch sử gọi món trên toàn nhà hàng...
                  </div>
                ) : dishHistoryData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Thẻ chẩn đoán cấu hình hiện tại */}
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor:
                          dishHistoryData.is_in_config_cooking && (dishHistoryData.current_place_ids || []).length > 0
                            ? 'var(--color-success-bg)'
                            : 'var(--color-danger-bg)',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {dishHistoryData.is_in_config_cooking && (dishHistoryData.current_place_ids || []).length > 0
                          ? `✅ Cấu hình hiện tại trong CONFIG_COOKING: Đã gán vào [${(dishHistoryData.current_place_names || []).join(', ')}] (Chuẩn nấu: ${dishHistoryData.current_config_minutes} phút)`
                          : `⚠️ Cảnh báo cấu hình: Món này hiện CHƯA gán quầy cụ thể trong CONFIG_COOKING (Nhóm: ${dishHistoryData.current_group_name || 'Chưa có'})`}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {dishHistoryData.smart_analysis || dishHistoryData.message}
                      </div>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', marginTop: '2px' }}>
                        <span>Tổng số lần gọi: <strong>{dishHistoryData.total_timeline_orders}</strong></span>
                      </div>
                    </div>

                    {/* Bảng lịch sử các bàn đã gọi món này */}
                    {dishHistoryData.timeline && dishHistoryData.timeline.length > 0 && (
                      <div
                        style={{
                          maxHeight: '220px',
                          overflowY: 'auto',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0 }}>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Bàn</th>
                              <th style={{ padding: '6px 8px', textAlign: 'left' }}>Quầy Bếp Lúc Order</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Giờ Order</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Giờ Done</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Máy In</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Thực Tế / Chuẩn</th>
                              <th style={{ padding: '6px 8px', textAlign: 'center' }}>Trạng Thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dishHistoryData.timeline.map((hItem, hIdx) => (
                              <tr key={`${hItem.id}_${hIdx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 800 }}>{hItem.table_name}</td>
                                <td style={{ padding: '6px 8px' }}>{hItem.place_name}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{hItem.order_time}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{hItem.done_time}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center' }}>{hItem.printer_name || '—'}</td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700 }}>
                                  {hItem.actual_minutes}p / {hItem.config_minutes}p
                                </td>
                                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: hItem.delay_minutes > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                  {hItem.status_label}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Không có thêm lịch sử phụ cho món này.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const q = inspectDish.rk7_code || inspectDish.sap_code || inspectDish.dish_name;
                    setQueryInput(q);
                    setInspectDish(null);
                    fetchOrderFlow(tableInput, q, filterDate, sourceFilter, fromTime, toTime);
                  }}
                >
                  Lọc Tất Cả Bàn Gọi Món Này
                </Button>
                <Button variant="primary" size="sm" onClick={() => setInspectDish(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
