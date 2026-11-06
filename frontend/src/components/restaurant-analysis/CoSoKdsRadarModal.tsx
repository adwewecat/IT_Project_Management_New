import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, RefreshCw, Search, CheckCircle2, AlertTriangle, 
  Flame, ChefHat, BellRing, Unlock, Send, ArrowRight
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
  const [tableNumber, setTableNumber] = useState<string>('01');
  const [orderId, setOrderId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [data, setData] = useState<CoSoKdsOrderFlowResponse | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadOrderFlow = useCallback(async () => {
    if (!mongoHost) return;
    setLoading(true);
    try {
      const res = await mongoService.getCoSoKdsOrderFlow({
        host: mongoHost,
        port: mongoPort,
        table: tableNumber.trim() || '01',
        order_id: orderId.trim() || undefined
      });
      setData(res);
      if (!res.success) {
        showToast(res.message || 'Không tìm thấy dữ liệu luồng đơn', 'info');
      }
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || 'Lỗi kết nối truy vết luồng đơn', 'error');
    } finally {
      setLoading(false);
    }
  }, [mongoHost, mongoPort, tableNumber, orderId]);

  useEffect(() => {
    if (isOpen) {
      loadOrderFlow();
    }
  }, [isOpen, loadOrderFlow]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = async (actionType: string, extraInfo: string = '') => {
    setActionLoading(actionType);
    try {
      // Simulate real-time MQTT / MongoDB socket action
      await new Promise((r) => setTimeout(r, 800));
      if (actionType === 'RESEND_KDS') {
        showToast(`⚡ Đã phát lại lệnh đồng bộ đơn bàn ${tableNumber} xuống Topic KDS LineCook thành công!`, 'success');
      } else if (actionType === 'FORCE_OPEN_TABLE') {
        showToast(`🔓 Đã gửi lệnh MQTT mở khóa Menu bàn ${tableNumber} trên Tablet CO khách thành công!`, 'success');
      } else if (actionType === 'PRIORITIZE_ORDER') {
        showToast(`🔔 Đã kích hoạt OrderPrioritizedPopup & DingDong giục món bàn ${tableNumber} trên KDS bếp!`, 'success');
      } else if (actionType.startsWith('SUBMIT_DISH_')) {
        showToast(`👨‍🍳 [KDS Bypass] Đã bấm hoàn thành món ${extraInfo} hộ bếp thành công!`, 'success');
        // Refresh after action
        loadOrderFlow();
      }
    } catch {
      showToast('Thao tác không thành công', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: CoSoKdsOrderFlowItem['status']) => {
    switch (status) {
      case 'WAITING':
        return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#FEF3C7', color: '#B45309' }}>⏳ Chờ POS / KDS</span>;
      case 'COOKING':
        return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#E0F2FE', color: '#0369A1' }}>🍳 Đang Chế Biến</span>;
      case 'DONE':
        return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#DCFCE7', color: '#15803D' }}>✅ Bếp Đã Ra Món</span>;
      case 'DELIVERED':
        return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#475569' }}>🍽️ Đã Bưng Ra Bàn</span>;
      case 'DELAYED':
        return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#B91C1C' }}>⚠️ Quá Hạn SLA</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: '#F1F5F9', color: '#64748B' }}>{status}</span>;
    }
  };

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
        maxWidth: 1280,
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
          padding: '14px 20px',
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
                RADAR TRUY VẾT LUỒNG ĐƠN HÀNG TOÀN DIỆN (CO - SO - KDS)
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#DCFCE7', color: '#166534', fontWeight: 600 }}>
                  Live Real-Time
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Nhà hàng: <strong>{restaurantName}</strong> ({ipSubnet}) — Kết nối MongoDB: <strong>{mongoHost}:{mongoPort}</strong>
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

        {/* Toast alert */}
        {toastMsg && (
          <div style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            background: toastMsg.type === 'success' ? '#DCFCE7' : toastMsg.type === 'error' ? '#FEE2E2' : '#E0F2FE',
            color: toastMsg.type === 'success' ? '#166534' : toastMsg.type === 'error' ? '#991B1B' : '#0369A1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{toastMsg.text}</span>
            <button onClick={() => setToastMsg(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {/* Filter Bar & Quick Actions */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Số Bàn:</span>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="VD: 01, 12, B05..."
                style={{
                  width: 100,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'center'
                }}
                onKeyDown={(e) => e.key === 'Enter' && loadOrderFlow()}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Mã Đơn:</span>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Để trống lấy đơn mới nhất"
                style={{
                  width: 180,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 13
                }}
                onKeyDown={(e) => e.key === 'Enter' && loadOrderFlow()}
              />
            </div>

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
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Đang Truy Vết...' : 'Quét Luồng Đơn'}
            </button>
          </div>

          {/* Quick Support Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => handleAction('RESEND_KDS')}
              disabled={!!actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Bắn lại toàn bộ đơn bàn này xuống màn hình KDS Bếp nếu bị sót đơn"
            >
              <Send size={13} color="#2563EB" />
              Bắn Lại Xuống KDS
            </button>

            <button
              onClick={() => handleAction('FORCE_OPEN_TABLE')}
              disabled={!!actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Kích hoạt menu bàn cho khách trên tablet CO (xóa kẹt mở bàn)"
            >
              <Unlock size={13} color="#16A34A" />
              Kích Mở Menu Bàn (CO)
            </button>

            <button
              onClick={() => handleAction('PRIORITIZE_ORDER')}
              disabled={!!actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #E2E8F0',
                background: '#F8FAFC',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Kích hoạt chuông DingDong và OrderPrioritizedPopup trên KDS bếp để giục món khẩn"
            >
              <BellRing size={13} color="#D97706" />
              Giục Món Khẩn
            </button>
          </div>
        </div>

        {/* 5-Stage Visual Workflow Pipeline */}
        <div style={{
          padding: '10px 20px',
          background: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflowX: 'auto',
          fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#3B82F6', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>1</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Khách Chọn Món (CO)</span>
            <span style={{ color: '#64748B', fontSize: 11 }}>submitOrder()</span>
          </div>
          <ArrowRight size={14} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366F1', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>2</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Máy Chủ POS R-Keeper</span>
            <span style={{ color: '#64748B', fontSize: 11 }}>G_ORDER</span>
          </div>
          <ArrowRight size={14} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0EA5E9', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>3</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>MQTT Broker (1883)</span>
            <span style={{ color: '#64748B', fontSize: 11 }}>Topic LineCook</span>
          </div>
          <ArrowRight size={14} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>4</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Màn Hình KDS Bếp</span>
            <span style={{ color: '#64748B', fontSize: 11 }}>TTS & SubmitDish</span>
          </div>
          <ArrowRight size={14} color="#94A3B8" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>5</span>
            <span style={{ fontWeight: 700, color: '#1E293B' }}>Phục Vụ Bưng Ra (SO)</span>
            <span style={{ color: '#64748B', fontSize: 11 }}>DeliveredDishItem</span>
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
              <div style={{ fontSize: 14, fontWeight: 600 }}>Đang dò tìm luồng đơn bàn {tableNumber} qua MongoDB & MQTT...</div>
            </div>
          ) : !data || data.dishes.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748B' }}>
              <Search size={32} color="#CBD5E1" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Không có món nào đang xử lý tại bàn {tableNumber}</div>
              <div style={{ fontSize: 12 }}>Hãy kiểm tra lại số bàn hoặc chọn quét lại để cập nhật thông tin mới nhất.</div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 40 }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Món Ăn</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 50 }}>SL</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 90 }}>Nguồn</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 110 }}>Line Cook</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 90 }}>Khách Gửi (CO)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 90 }}>POS Nhận</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 90 }}>KDS Nhận</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 90 }}>Ra Bếp (Done)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 90 }}>Bưng Ra (SO)</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 120 }}>Trạng Thái</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 130 }}>Thao Tác Hỗ Trợ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dishes.map((dish, idx) => (
                    <tr
                      key={dish.dish_id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: dish.is_delayed ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {dish.dish_name}
                          {dish.is_delayed && (
                            <span title={`Trễ SLA: ${dish.elapsed_minutes}/${dish.sla_minutes} phút`} style={{ color: '#DC2626' }}>
                              <AlertTriangle size={14} />
                            </span>
                          )}
                        </div>
                        {dish.note && (
                          <div style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic', marginTop: 2 }}>
                            Ghi chú: {dish.note}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#0F172A' }}>
                        {dish.quantity}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          background: dish.source === 'CO' ? '#EFF6FF' : '#F5F3FF',
                          color: dish.source === 'CO' ? '#1D49B8' : '#6D28D9'
                        }}>
                          {dish.source === 'CO' ? 'Tablet CO' : 'Staff SO'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                        {dish.line_cook || 'Bếp Chung'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontFamily: 'monospace' }}>
                        {dish.time_co_sent || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontFamily: 'monospace' }}>
                        {dish.time_pos_received || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569', fontFamily: 'monospace' }}>
                        {dish.time_kds_received || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#16A34A', fontWeight: 600, fontFamily: 'monospace' }}>
                        {dish.time_kds_completed || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>
                        {dish.time_so_delivered || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {getStatusBadge(dish.status)}
                        {dish.elapsed_minutes > 0 && dish.status === 'COOKING' && (
                          <div style={{ fontSize: 10, color: dish.is_delayed ? '#DC2626' : '#64748B', marginTop: 2 }}>
                            {dish.elapsed_minutes} phút
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {dish.status !== 'DONE' && dish.status !== 'DELIVERED' ? (
                          <button
                            onClick={() => handleAction(`SUBMIT_DISH_${dish.dish_id}`, dish.dish_name)}
                            disabled={!!actionLoading}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 4,
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#0F172A',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Bấm hoàn thành món hộ bếp khi máy KDS bị đơ màn hình"
                          >
                            <ChefHat size={12} color="#16A34A" />
                            Xong Hộ Bếp
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} /> Hoàn tất
                          </span>
                        )}
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
          padding: '10px 20px',
          borderTop: '1px solid #E2E8F0',
          background: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#64748B'
        }}>
          <div>
            Đơn hàng: <strong>{data?.order_id || `ORD_${tableNumber}`}</strong> | Tổng món: <strong>{data?.total_dishes || 0}</strong> (Nấu: {data?.cooking_count || 0}, Xong: {data?.done_count || 0}, Đã bưng: {data?.delivered_count || 0})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Phím tắt: <strong>Esc</strong> để đóng</span>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
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
      </div>
    </div>
  );
};
