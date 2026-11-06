import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, 
  Layers, Smartphone, Server, Radio
} from 'lucide-react';
import { 
  mongoService, 
  CoSoKdsTwoStepSyncResponse 
} from '../../services/mongoService';

interface CoSoKdsTwoStepSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  ipSubnet: string;
  mongoHost: string;
  mongoPort: number;
  restaurantId?: number;
}

export const CoSoKdsTwoStepSyncModal: React.FC<CoSoKdsTwoStepSyncModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  ipSubnet,
  mongoHost,
  mongoPort,
  restaurantId
}) => {
  const [syncMode, setSyncMode] = useState<'FULL_TWO_STEP' | 'SO_ONLY' | 'CO_ONLY'>('FULL_TWO_STEP');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<CoSoKdsTwoStepSyncResponse | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);

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

  const handleStartSync = async () => {
    if (!mongoHost) return;
    setLoading(true);
    setResult(null);
    setLogMessages([
      `[${new Date().toLocaleTimeString()}] Bắt đầu quy trình đồng bộ menu & giá nhà hàng ${restaurantName}...`,
      `[${new Date().toLocaleTimeString()}] Kết nối máy chủ MongoDB & MQTT: ${mongoHost}:${mongoPort}`
    ]);

    try {
      if (syncMode === 'FULL_TWO_STEP' || syncMode === 'SO_ONLY') {
        setLogMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] >> Bước 1: Gửi lệnh syncRK kéo dữ liệu Menu/Giá mới nhất từ POS R-Keeper vào máy chủ SO...`
        ]);
      }

      const res = await mongoService.postCoSoKdsSyncTwoStep({
        host: mongoHost,
        port: mongoPort,
        restaurant_id: restaurantId,
        sync_mode: syncMode
      });

      setResult(res);

      if (res.step1_so_success) {
        setLogMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ✅ Bước 1 thành công: ${res.step1_so_message}`
        ]);
      } else {
        setLogMessages((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ⚠️ Bước 1 gặp sự cố: ${res.step1_so_message}`
        ]);
      }

      if (syncMode === 'FULL_TWO_STEP' || syncMode === 'CO_ONLY') {
        if (res.step2_co_success) {
          setLogMessages((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Bước 2 thành công: ${res.step2_co_message} (Đã phát lệnh tới ${res.total_co_notified} Tablet CO)`
          ]);
        } else {
          setLogMessages((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ⚠️ Bước 2 gặp sự cố: ${res.step2_co_message}`
          ]);
        }
      }

      setLogMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] 🎉 Hoàn tất quy trình đồng bộ trong ${res.elapsed_ms.toFixed(1)}ms!`
      ]);
    } catch (err: unknown) {
      const error = err as Error;
      setLogMessages((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Lỗi thực thi đồng bộ: ${error.message || 'Không xác định'}`
      ]);
    } finally {
      setLoading(false);
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
        maxWidth: 860,
        borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
        maxHeight: '90vh'
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
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                ÉP ĐỒNG BỘ MENU & GIÁ TOÀN NHÀ HÀNG (QUY TRÌNH 2 LỚP: SO ➔ CO)
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Nhà hàng: <strong>{restaurantName}</strong> ({ipSubnet}) — Máy chủ: <strong>{mongoHost}:{mongoPort}</strong>
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

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Explanation Banner */}
          <div style={{
            padding: '12px 16px',
            background: '#EFF6FF',
            borderRadius: 8,
            border: '1px solid #BFDBFE',
            fontSize: 12.5,
            color: '#1E3A8A',
            lineHeight: 1.5
          }}>
            <strong>💡 Quy tắc vận hành chuẩn Golden Gate:</strong> App CO (Customer Order trên máy tính bảng) không thể tự tải giá mới trực tiếp từ POS R-Keeper. Menu và giá mới <em>bắt buộc phải qua app SO (Staff Order) để đồng bộ trước (syncRK)</em>, sau đó hệ thống mới phát sóng MQTT ép toàn bộ máy tính bảng CO xóa SQLite cache và nạp giá mới!
          </div>

          {/* 2-Step Architecture Diagram */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto 1fr',
            alignItems: 'center',
            gap: 10,
            padding: '14px',
            background: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0'
          }}>
            {/* Box 1: POS RK7 */}
            <div style={{ padding: 12, background: '#FFFFFF', borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Server size={24} color="#6366F1" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>POS R-Keeper</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Gốc Menu & Giá</div>
            </div>

            <div style={{ textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', marginBottom: 2 }}>Bước 1: syncRK</div>
              <ArrowRight size={18} color="#2563EB" />
            </div>

            {/* Box 2: Staff Order (SO) */}
            <div style={{ padding: 12, background: '#FFFFFF', borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Smartphone size={24} color="#F59E0B" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>App Staff Order (SO)</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>cache.sqlite máy chủ</div>
            </div>

            <div style={{ textAlign: 'center', color: '#64748B' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', marginBottom: 2 }}>Bước 2: MQTT</div>
              <ArrowRight size={18} color="#16A34A" />
            </div>

            {/* Box 3: Customer Order (CO) */}
            <div style={{ padding: 12, background: '#FFFFFF', borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Radio size={24} color="#10B981" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Tablet CO Các Bàn</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Ép nạp SQLite cache</div>
            </div>
          </div>

          {/* Sync Mode Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
              Chọn Phương Thức Đồng Bộ:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <label style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: syncMode === 'FULL_TWO_STEP' ? '2px solid #F5B800' : '1px solid #CBD5E1',
                background: syncMode === 'FULL_TWO_STEP' ? '#FFFBEB' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="FULL_TWO_STEP"
                    checked={syncMode === 'FULL_TWO_STEP'}
                    onChange={() => setSyncMode('FULL_TWO_STEP')}
                  />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>2 Lớp Chuẩn (SO ➔ CO)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', paddingLeft: 22 }}>Khuyên dùng: Chuẩn hóa 100% menu & giá toàn nhà hàng.</span>
              </label>

              <label style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: syncMode === 'SO_ONLY' ? '2px solid #F5B800' : '1px solid #CBD5E1',
                background: syncMode === 'SO_ONLY' ? '#FFFBEB' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="SO_ONLY"
                    checked={syncMode === 'SO_ONLY'}
                    onChange={() => setSyncMode('SO_ONLY')}
                  />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>Chỉ Đồng Bộ SO (Bước 1)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', paddingLeft: 22 }}>Kéo menu từ POS RK7 vào app SO phục vụ.</span>
              </label>

              <label style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: syncMode === 'CO_ONLY' ? '2px solid #F5B800' : '1px solid #CBD5E1',
                background: syncMode === 'CO_ONLY' ? '#FFFBEB' : '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="CO_ONLY"
                    checked={syncMode === 'CO_ONLY'}
                    onChange={() => setSyncMode('CO_ONLY')}
                  />
                  <span style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>Chỉ Ép Tablet CO (Bước 2)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', paddingLeft: 22 }}>Bắn MQTT yêu cầu tất cả CO xóa cache nạp lại.</span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartSync}
            disabled={loading}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#F5B800',
              color: '#000',
              fontWeight: 700,
              fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Đang Thực Hiện Đồng Bộ Toàn Nhà Hàng...' : '⚡ Bắt Đầu Ép Đồng Bộ Menu & Giá Toàn Nhà Hàng'}
          </button>

          {/* Result Status Cards if completed */}
          {result && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12
            }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: result.step1_so_success ? '1px solid #86EFAC' : '1px solid #FECACA',
                background: result.step1_so_success ? '#F0FDF4' : '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {result.step1_so_success ? <CheckCircle2 size={20} color="#16A34A" /> : <AlertTriangle size={20} color="#DC2626" />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>Bước 1: SO Đồng Bộ POS</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{result.step1_so_message}</div>
                </div>
              </div>

              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: result.step2_co_success ? '1px solid #86EFAC' : '1px solid #FECACA',
                background: result.step2_co_success ? '#F0FDF4' : '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}>
                {result.step2_co_success ? <CheckCircle2 size={20} color="#16A34A" /> : <AlertTriangle size={20} color="#DC2626" />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0F172A' }}>Bước 2: Tablet CO Nạp Cache</div>
                  <div style={{ fontSize: 11, color: '#475569' }}>{result.step2_co_message} (Đã báo {result.total_co_notified} máy)</div>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Log Console */}
          {logMessages.length > 0 && (
            <div style={{
              background: '#0F172A',
              color: '#F8FAFC',
              padding: 12,
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 12,
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              {logMessages.map((msg, idx) => (
                <div key={idx}>{msg}</div>
              ))}
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
          justifyContent: 'flex-end',
          gap: 10
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
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
  );
};
