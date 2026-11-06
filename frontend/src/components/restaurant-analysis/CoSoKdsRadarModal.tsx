import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, RefreshCw, Search, CheckCircle2, AlertTriangle, 
  Flame, ArrowRight, Printer, Copy, Check, Info
} from 'lucide-react';
import { 
  mongoService, 
  CoSoKdsOrderFlowItem, 
  CoSoKdsOrderFlowResponse 
} from '../../services/mongoService';

interface CoSoKdsRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  ipSubnet: string;
  mongoHost: string;
  mongoPort: number;
}

export const CoSoKdsRadarModal: React.FC<CoSoKdsRadarModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  ipSubnet,
  mongoHost,
  mongoPort
}) => {
  const [filterDate, setFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterFromTime, setFilterFromTime] = useState<string>('');
  const [filterToTime, setFilterToTime] = useState<string>('');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [dishQuery, setDishQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL'); // 'ALL' | 'CO' | 'SO'
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // 'ALL' | 'DELAYED' | 'ON_TIME' | 'COOKING'
  
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<CoSoKdsOrderFlowResponse | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [soiTarget, setSoiTarget] = useState<CoSoKdsOrderFlowItem | null>(null);

  const loadOrderFlow = useCallback(async () => {
    if (!mongoHost) return;
    setLoading(true);
    try {
      const res = await mongoService.getCoSoKdsOrderFlow({
        host: mongoHost,
        port: mongoPort,
        table: tableNumber.trim() || undefined,
        date: filterDate,
        query: dishQuery.trim() || undefined,
        source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        from_time: filterFromTime.trim() || undefined,
        to_time: filterToTime.trim() || undefined,
      });
      setData(res);
    } catch (err: unknown) {
      console.error('Lỗi khi tra cứu nhật ký luồng đơn:', err);
    } finally {
      setLoading(false);
    }
  }, [mongoHost, mongoPort, tableNumber, filterDate, dishQuery, sourceFilter, filterFromTime, filterToTime]);

  useEffect(() => {
    if (isOpen) {
      loadOrderFlow();
    }
  }, [isOpen, loadOrderFlow]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (soiTarget) {
          setSoiTarget(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, soiTarget]);

  const filteredDishes = useMemo(() => {
    if (!data || !data.dishes) return [];
    return data.dishes.filter((dish) => {
      if (sourceFilter !== 'ALL' && dish.source !== sourceFilter) return false;
      if (statusFilter === 'DELAYED' && !dish.is_delayed) return false;
      if (statusFilter === 'ON_TIME' && (dish.is_delayed || dish.status === 'COOKING')) return false;
      if (statusFilter === 'COOKING' && dish.status !== 'COOKING') return false;
      if (tableNumber.trim()) {
        const qTable = tableNumber.trim().toLowerCase();
        const matchTable = dish.table_number?.toLowerCase().includes(qTable) || dish.table_name?.toLowerCase().includes(qTable);
        if (!matchTable) return false;
      }
      if (dishQuery.trim()) {
        const q = dishQuery.trim().toLowerCase();
        const matchName = dish.dish_name?.toLowerCase().includes(q);
        const matchSap = dish.sap_code?.toLowerCase().includes(q);
        const matchRk = dish.rk7_code?.toLowerCase().includes(q);
        if (!matchName && !matchSap && !matchRk) return false;
      }
      return true;
    });
  }, [data, sourceFilter, statusFilter, tableNumber, dishQuery]);

  const handleCopyReport = () => {
    if (filteredDishes.length === 0) return;
    let text = `BÁO CÁO NHẬT KÝ & RADAR LUỒNG ĐƠN HÀNG (${restaurantName} - Ngày: ${filterDate})\n`;
    text += `Tra cứu lúc: ${new Date().toLocaleString('vi-VN')} | Kết nối: ${mongoHost}:${mongoPort}\n`;
    text += `------------------------------------------------------------------------------------------------------------------------\n`;
    text += `BÀN | NGUỒN | TÊN MÓN | SAP | RK7 | LINE COOK | GIỜ GỬI | POS NHẬN | KDS XONG | SO BƯNG | THỰC TẾ | SLA | TRẠNG THÁI\n`;
    text += `------------------------------------------------------------------------------------------------------------------------\n`;
    filteredDishes.forEach((d) => {
      const src = d.source === 'CO' ? 'Tablet CO' : 'Staff SO';
      const st = d.is_delayed ? 'Trễ SLA' : d.status === 'DONE' || d.status === 'DELIVERED' ? 'Kịp Giờ' : 'Đang Làm';
      text += `${d.table_name || d.table_number} | ${src} | ${d.dish_name} | ${d.sap_code || '—'} | ${d.rk7_code || '—'} | ${d.line_cook || '—'} | ${d.time_co_sent || '—'} | ${d.time_pos_received || '—'} | ${d.time_kds_completed || '—'} | ${d.time_so_delivered || '—'} | ${d.elapsed_minutes}p | ${d.sla_minutes}p | ${st}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: '#FFFFFF',
        width: '100%',
        maxWidth: 1320,
        height: '92vh',
        borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #E2E8F0'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#F5B800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 'bold'
            }}>
              <Flame size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                TRA CỨU NHẬT KÝ & RADAR TRUY VẾT LUỒNG ĐƠN HÀNG (CO - SO - KDS)
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                  Hợp Nhất 2 Trong 1
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Nhà hàng: <strong>{restaurantName}</strong> ({ipSubnet}) — Máy chủ MongoDB: <strong>{mongoHost}:{mongoPort}</strong>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#64748B',
              padding: 6,
              borderRadius: 6
            }}
            title="Đóng (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 10
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
              Ngày Kiểm Tra:
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                Từ Giờ:
              </label>
              <input
                type="text"
                value={filterFromTime}
                onChange={(e) => setFilterFromTime(e.target.value)}
                placeholder="10:00"
                style={{ width: 65, padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
                Đến Giờ:
              </label>
              <input
                type="text"
                value={filterToTime}
                onChange={(e) => setFilterToTime(e.target.value)}
                placeholder="22:30"
                style={{ width: 65, padding: '6px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
              Bàn Ăn:
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="VD: 01, B2, DL01..."
              style={{
                width: 105,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600
              }}
              onKeyDown={(e) => e.key === 'Enter' && loadOrderFlow()}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
              Món Ăn / Mã SAP / RK7:
            </label>
            <input
              type="text"
              value={dishQuery}
              onChange={(e) => setDishQuery(e.target.value)}
              placeholder="VD: Ba chỉ bò, 60038417, 33140..."
              style={{
                width: 190,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5
              }}
              onKeyDown={(e) => e.key === 'Enter' && loadOrderFlow()}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
              Nguồn Order:
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <option value="ALL">Tất cả nguồn (CO + SO)</option>
              <option value="CO">Tablet CO (Khách gọi tại bàn)</option>
              <option value="SO">Staff SO (Phục vụ gọi)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '3px' }}>
              Trạng Thái:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DELAYED">⚠️ Quá hạn SLA (Trễ)</option>
              <option value="ON_TIME">✅ Kịp giờ / Hoàn tất</option>
              <option value="COOKING">🍳 Đang chế biến</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <button
              onClick={loadOrderFlow}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: '#F5B800',
                color: '#000',
                fontWeight: 700,
                fontSize: 12.5,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Đang Tra Cứu...' : 'Tra Cứu & Quét Luồng'}
            </button>

            <button
              onClick={handleCopyReport}
              disabled={filteredDishes.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Sao chép toàn bộ bảng đối soát logs KDS & luồng đơn vào clipboard để gửi nhóm hỗ trợ"
            >
              {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
              {copied ? 'Đã Sao Chép!' : 'Sao Chép Báo Cáo'}
            </button>
          </div>
        </div>

        {/* 5-Stage Visual Workflow Pipeline */}
        <div style={{
          padding: '8px 20px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          fontSize: 11.5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#3B82F6', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>1</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Khách (CO) / Phục Vụ (SO)</span>
            <span style={{ color: '#64748B', fontSize: 10.5 }}>submitOrder()</span>
          </div>
          <ArrowRight size={13} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366F1', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>2</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Máy Chủ POS R-Keeper</span>
            <span style={{ color: '#64748B', fontSize: 10.5 }}>G_ORDER</span>
          </div>
          <ArrowRight size={13} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#0EA5E9', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>3</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>MQTT Broker (1883)</span>
            <span style={{ color: '#64748B', fontSize: 10.5 }}>Topic LineCook</span>
          </div>
          <ArrowRight size={13} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>4</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Màn Hình KDS Bếp</span>
            <span style={{ color: '#64748B', fontSize: 10.5 }}>TTS &amp; SubmitDish</span>
          </div>
          <ArrowRight size={13} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10 }}>5</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Phục Vụ Bưng Ra (SO)</span>
            <span style={{ color: '#64748B', fontSize: 10.5 }}>DeliveredDishItem</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#64748B' }}>
              <RefreshCw size={28} className="animate-spin" color="#F5B800" />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Đang dò tìm luồng đơn &amp; đối soát logs KDS...</div>
            </div>
          ) : filteredDishes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748B' }}>
              <Search size={32} color="#CBD5E1" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Không tìm thấy món ăn nào khớp với bộ lọc tra cứu</div>
              <div style={{ fontSize: 12 }}>Hãy kiểm tra lại số bàn, từ giờ - đến giờ hoặc từ khóa tìm kiếm món.</div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 35 }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 75 }}>Bàn</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 85 }}>Nguồn</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Món Ăn / Mã SAP / RK7</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 45 }}>SL</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 110 }}>Quầy Bếp</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 85 }}>Giờ Gửi (CO/SO)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 80 }}>POS Nhận</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 85 }}>Ra Bếp (Done)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 80 }}>Bưng Ra (SO)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 110 }}>Lệnh In KDS</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 90 }}>Thực Tế / SLA</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 95 }}>Trạng Thái</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 85 }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDishes.map((dish, idx) => (
                    <tr
                      key={dish.dish_id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: dish.is_delayed ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#1E293B' }}>
                        {dish.table_name || dish.table_number}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          borderRadius: 4,
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: dish.source === 'CO' ? '#EFF6FF' : '#F5F3FF',
                          color: dish.source === 'CO' ? '#1D4ED8' : '#7C3AED',
                          border: dish.source === 'CO' ? '1px solid #BFDBFE' : '1px solid #DDD6FE'
                        }}>
                          {dish.source === 'CO' ? 'Tablet CO' : 'Staff SO'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {dish.dish_name}
                          {dish.is_delayed && (
                            <span title={`Trễ SLA: ${dish.elapsed_minutes}/${dish.sla_minutes} phút`} style={{ color: '#DC2626' }}>
                              <AlertTriangle size={13} />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 8, marginTop: 1 }}>
                          {dish.sap_code && <span>SAP: <strong style={{ color: '#334155' }}>{dish.sap_code}</strong></span>}
                          {dish.rk7_code && <span>RK7: <strong style={{ color: '#334155' }}>{dish.rk7_code}</strong></span>}
                          {dish.note && <span style={{ color: '#D97706', fontStyle: 'italic' }}>({dish.note})</span>}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                        {dish.quantity}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#334155', fontWeight: 600 }}>
                        {dish.line_cook || 'Bếp Chung'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#1E40AF', fontFamily: 'monospace', fontSize: 11 }}>
                        {dish.time_co_sent || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>
                        {dish.time_pos_received || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#15803D', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
                        {dish.time_kds_completed || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#2563EB', fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>
                        {dish.time_so_delivered || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {dish.print_status === 'PRINTED' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10.5,
                            fontWeight: 600,
                            background: '#DCFCE7',
                            color: '#15803D',
                            border: '1px solid #BBF7D0'
                          }}>
                            <Printer size={11} /> {dish.printer_name || 'Đã in'}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: 10.5 }}>⏳ Chờ in</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 800, color: dish.is_delayed ? '#DC2626' : '#15803D' }}>
                          {dish.elapsed_minutes}p
                        </span>
                        <span style={{ color: '#64748B', fontSize: 10.5 }}> / {dish.sla_minutes}p</span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {dish.is_delayed ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: '#FEE2E2', color: '#B91C1C' }}>
                            Trễ {dish.elapsed_minutes - dish.sla_minutes}p
                          </span>
                        ) : dish.status === 'DONE' || dish.status === 'DELIVERED' ? (
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: '#DCFCE7', color: '#15803D' }}>
                            Kịp Giờ
                          </span>
                        ) : (
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: '#E0F2FE', color: '#0369A1' }}>
                            Đang Làm
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSoiTarget(dish)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: 4,
                            border: '1px solid #0284C7',
                            background: '#E0F2FE',
                            color: '#0369A1',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3
                          }}
                          title="Soi chi tiết toàn bộ luồng 5 chặng của món này"
                        >
                          <Search size={11} /> Soi Món
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 20px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748B'
        }}>
          <div>
            Tổng bản ghi: <strong>{filteredDishes.length}</strong> món | Trễ SLA: <strong style={{ color: '#DC2626' }}>{filteredDishes.filter(d => d.is_delayed).length}</strong> món | Đang làm: <strong>{filteredDishes.filter(d => d.status === 'COOKING').length}</strong> món
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Phím tắt: <strong>Esc</strong> để đóng</span>
            <button
              onClick={onClose}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>
          </div>
        </div>

        {/* POPUP CON: SOI MÓN & TRUY VẾT LUỒNG CHẶNG CHI TIẾT */}
        {soiTarget && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20
          }}>
            <div style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: 720,
              borderRadius: 10,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              border: '1px solid #CBD5E1',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Header popup soi món */}
              <div style={{
                padding: '12px 18px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Search size={16} color="#0369A1" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                      CHI TIẾT TRUY VẾT LUỒNG MÓN: {soiTarget.dish_name}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>
                      Vị trí: <strong>{soiTarget.table_name || soiTarget.table_number}</strong> | Đơn: <strong>{soiTarget.order_id}</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSoiTarget(null)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
                >
                  <X size={18} color="#64748B" />
                </button>
              </div>

              {/* Body popup soi món */}
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* General Info Card */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  padding: 12,
                  background: '#F1F5F9',
                  borderRadius: 8,
                  fontSize: 12
                }}>
                  <div>
                    <span style={{ color: '#64748B' }}>Nguồn Gọi Món:</span>
                    <div style={{ fontWeight: 700, color: soiTarget.source === 'CO' ? '#1D4ED8' : '#7C3AED', marginTop: 2 }}>
                      {soiTarget.source === 'CO' ? '📱 Tablet CO (Khách tự gọi)' : '🧑‍🍳 Staff SO (Nhân viên phục vụ)'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Quầy Bếp Tiếp Nhận:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {soiTarget.line_cook || 'Bếp Nóng'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Mã Món / SAP / RK7:</span>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {soiTarget.sap_code} / {soiTarget.rk7_code}
                    </div>
                  </div>
                </div>

                {/* 5-Stage Step-by-Step Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={14} color="#0284C7" />
                    Lưu Vết 5 Mốc Thời Gian Thực Tế:
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 12, background: '#FFFFFF' }}>
                      <span style={{ color: '#475569' }}>1. Khách / Phục Vụ bấm gửi món (CO/SO):</span>
                      <strong style={{ color: '#1E40AF', fontFamily: 'monospace' }}>{soiTarget.time_co_sent || '—'}</strong>
                    </div>

                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 12, background: '#FAFAFA' }}>
                      <span style={{ color: '#475569' }}>2. Máy chủ POS R-Keeper tiếp nhận &amp; ghi nhận DB:</span>
                      <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{soiTarget.time_pos_received || '—'}</strong>
                    </div>

                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 12, background: '#FFFFFF' }}>
                      <span style={{ color: '#475569' }}>3. MQTT phát sóng &amp; Màn hình KDS Bếp nhận lệnh:</span>
                      <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{soiTarget.time_kds_received || '—'}</strong>
                    </div>

                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 12, background: '#FAFAFA' }}>
                      <span style={{ color: '#475569' }}>4. Đầu bếp hoàn thành chế biến &amp; bấm Done trên KDS:</span>
                      <strong style={{ color: '#15803D', fontFamily: 'monospace' }}>{soiTarget.time_kds_completed || 'Đang chế biến'}</strong>
                    </div>

                    <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12, background: '#FFFFFF' }}>
                      <span style={{ color: '#475569' }}>5. Phục vụ nhận cảnh báo SO &amp; bưng ra bàn cho khách:</span>
                      <strong style={{ color: '#2563EB', fontFamily: 'monospace' }}>{soiTarget.time_so_delivered || 'Chờ bưng món'}</strong>
                    </div>
                  </div>
                </div>

                {/* SLA Assessment */}
                <div style={{
                  padding: 10,
                  borderRadius: 8,
                  border: soiTarget.is_delayed ? '1px solid #FECACA' : '1px solid #BBF7D0',
                  background: soiTarget.is_delayed ? '#FEF2F2' : '#F0FDF4',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {soiTarget.is_delayed ? <AlertTriangle size={18} color="#DC2626" /> : <CheckCircle2 size={18} color="#16A34A" />}
                  <div>
                    <strong>Đánh giá SLA: </strong>
                    {soiTarget.is_delayed 
                      ? `Thời gian chế biến ${soiTarget.elapsed_minutes} phút, vượt chuẩn SLA quy định (${soiTarget.sla_minutes} phút) -> Trễ ${soiTarget.elapsed_minutes - soiTarget.sla_minutes} phút.`
                      : `Thời gian chế biến ${soiTarget.elapsed_minutes} phút, đạt chuẩn SLA quy định (${soiTarget.sla_minutes} phút).`}
                  </div>
                </div>

              </div>

              {/* Footer popup soi món */}
              <div style={{
                padding: '10px 18px',
                background: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setSoiTarget(null)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Đóng Chi Tiết
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
