import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, AlertTriangle, ArrowRight, 
  Layers, Server, Radio, ShieldAlert, Check
} from 'lucide-react';
import { 
  mongoService
} from '../../services/mongoService';
import { formatTime24hVN } from '../../utils/dateFormat';

interface CoSoKdsTwoStepSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  ipSubnet: string;
  mongoHost: string;
  mongoPort: number;
  restaurantId?: number;
  inline?: boolean;
}

type SyncStepState = 'IDLE' | 'STEP1_RUNNING' | 'STEP1_DONE' | 'STEP2_RUNNING' | 'COMPLETED' | 'ERROR';

export const CoSoKdsTwoStepSyncModal: React.FC<CoSoKdsTwoStepSyncModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  ipSubnet,
  mongoHost,
  mongoPort,
  restaurantId,
  inline = false
}) => {
  const [syncMode, setSyncMode] = useState<'FULL_TWO_STEP' | 'SO_ONLY' | 'CO_ONLY'>('FULL_TWO_STEP');
  const [stepState, setStepState] = useState<SyncStepState>('IDLE');
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleStartSequentialSync = async () => {
    if (!mongoHost) return;
    setStepState('IDLE');
    setErrorMsg(null);
    setLogMessages([
      `[${formatTime24hVN()}] Bắt đầu quy trình đồng bộ TUẦN TỰ Menu & Giá tại ${restaurantName}...`,
      `[${formatTime24hVN()}] Máy chủ mục tiêu: ${mongoHost}:${mongoPort}`
    ]);

    try {
      // ══════════════════════════════════════════════════════════════
      // BƯỚC 1: ĐỒNG BỘ POS -> SO (syncRK)
      // ══════════════════════════════════════════════════════════════
      if (syncMode === 'FULL_TWO_STEP' || syncMode === 'SO_ONLY') {
        setStepState('STEP1_RUNNING');
        setLogMessages((prev) => [
          ...prev,
          `[${formatTime24hVN()}] ⏳ [TUẦN TỰ - BƯỚC 1/2] Đang kích hoạt lệnh syncRK kéo dữ liệu thực đơn & giá từ POS RK7 vào máy chủ SO...`
        ]);

        // Thực thi riêng Bước 1
        const resStep1 = await mongoService.postCoSoKdsSyncTwoStep({
          host: mongoHost,
          port: mongoPort,
          restaurant_id: restaurantId,
          sync_mode: 'SO_ONLY'
        });

        if (!resStep1.step1_so_success) {
          // BƯỚC 1 LỖI: DỪNG NGAY LẬP TỨC! TUYỆT ĐỐI KHÔNG CHẠY BƯỚC 2
          setStepState('ERROR');
          setErrorMsg(resStep1.step1_so_message || 'Bước 1 thất bại khi đồng bộ SO từ POS');
          setLogMessages((prev) => [
            ...prev,
            `[${formatTime24hVN()}] ❌ BƯỚC 1 THẤT BẠI: ${resStep1.step1_so_message}`,
            `[${formatTime24hVN()}] ⛔ ĐÃ DỪNG TOÀN BỘ TIẾN TRÌNH: Do Bước 1 chưa thành công, hệ thống TUYỆT ĐỐI KHÔNG chạy Bước 2 để tránh sai lệch dữ liệu giá trên Tablet CO!`
          ]);
          return;
        }

        // Bước 1 thành công
        setStepState('STEP1_DONE');
        setLogMessages((prev) => [
          ...prev,
          `[${formatTime24hVN()}] ✅ BƯỚC 1 HOÀN TẤT 100%: ${resStep1.step1_so_message}`,
          `[${formatTime24hVN()}] ⏩ Chờ 0.8 giây kiểm tra toàn vẹn trước khi chuyển sang Bước 2...`
        ]);

        if (syncMode === 'SO_ONLY') {
          setStepState('COMPLETED');
          return;
        }

        // Delay ngắn để đảm bảo hoàn toàn tuần tự
        await new Promise((r) => setTimeout(r, 800));
      }

      // ══════════════════════════════════════════════════════════════
      // BƯỚC 2: PHÁT SÓNG MQTT ÉP TABLET CO CẬP NHẬT CACHE
      // ══════════════════════════════════════════════════════════════
      if (syncMode === 'FULL_TWO_STEP' || syncMode === 'CO_ONLY') {
        setStepState('STEP2_RUNNING');
        setLogMessages((prev) => [
          ...prev,
          `[${formatTime24hVN()}] ⏳ [TUẦN TỰ - BƯỚC 2/2] Bắt đầu phát sóng MQTT broadcast tới các Tablet CO yêu cầu xóa cache SQLite...`
        ]);

        // Thực thi riêng Bước 2
        const resStep2 = await mongoService.postCoSoKdsSyncTwoStep({
          host: mongoHost,
          port: mongoPort,
          restaurant_id: restaurantId,
          sync_mode: 'CO_ONLY'
        });

        if (!resStep2.step2_co_success) {
          setStepState('ERROR');
          setErrorMsg(resStep2.step2_co_message || 'Lỗi khi phát sóng MQTT tới Tablet CO');
          setLogMessages((prev) => [
            ...prev,
            `[${formatTime24hVN()}] ⚠️ BƯỚC 2 GẶP SỰ CỐ: ${resStep2.step2_co_message}`
          ]);
          return;
        }

        setStepState('COMPLETED');
        setLogMessages((prev) => [
          ...prev,
          `[${formatTime24hVN()}] ✅ BƯỚC 2 HOÀN TẤT: Đã phát sóng thông báo tới ${resStep2.total_co_notified} Tablet CO!`,
          `[${formatTime24hVN()}] 🎉 QUY TRÌNH ĐỒNG BỘ TUẦN TỰ 2 LỚP ĐÃ HOÀN TẤT THÀNH CÔNG!`
        ]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStepState('ERROR');
      setErrorMsg(error.message || 'Lỗi ngoại lệ khi thực thi đồng bộ');
      setLogMessages((prev) => [
        ...prev,
        `[${formatTime24hVN()}] ❌ Lỗi hệ thống: ${error.message || 'Không xác định'}`
      ]);
    }
  };

  const isRunning = stepState === 'STEP1_RUNNING' || stepState === 'STEP2_RUNNING';

  return (
    <div style={inline ? { width: '100%' } : {
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
        background: 'var(--bg-card)',
        width: '100%',
        maxWidth: inline ? '100%' : 880,
        borderRadius: 'var(--radius-lg)',
        boxShadow: inline ? 'var(--shadow-sm)' : 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        maxHeight: inline ? 'none' : '92vh'
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-text)',
              fontWeight: 'bold'
            }}>
              <Layers size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                ĐỒNG BỘ MENU SO &gt;&gt; CO (QUY TRÌNH TUẦN TỰ 2 LỚP)
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-success-bg)', color: 'var(--color-success-text)', fontWeight: 700 }}>
                  Tuần Tự 100%
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Nhà hàng: <strong>{restaurantName}</strong> ({ipSubnet}) — Máy chủ: <strong>{mongoHost}:{mongoPort}</strong>
              </div>
            </div>
          </div>
          {!inline && (
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
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Important Principle Banner */}
          <div style={{
            padding: '10px 14px',
            background: '#FEF3C7',
            borderRadius: 8,
            border: '1px solid #FCD34D',
            fontSize: 12,
            color: '#92400E',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8
          }}>
            <ShieldAlert size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Quy tắc tuần tự bắt buộc:</strong> Quá trình đồng bộ chạy <em>hoàn toàn theo tuần tự</em>. Hệ thống sẽ kéo dữ liệu từ POS R-Keeper vào app SO phục vụ trước (Bước 1). <strong>Chỉ khi Bước 1 hoàn thành 100% thành công</strong>, hệ thống mới tự động chuyển sang Bước 2 (phát sóng MQTT ép Tablet CO cập nhật giá mới) để tuyệt đối tránh tình trạng chạy song song gây sai lệch giá!
            </div>
          </div>

          {/* Sequential 2-Step Visual Flow Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            background: '#F8FAFC',
            borderRadius: 10,
            border: '1px solid #E2E8F0'
          }}>
            {/* Step 1 Card */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: stepState === 'STEP1_RUNNING' ? '2px solid #F59E0B' : stepState === 'STEP1_DONE' || stepState === 'COMPLETED' ? '2px solid #10B981' : stepState === 'ERROR' ? '2px solid #EF4444' : '1px solid #CBD5E1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Server size={18} color="#6366F1" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>BƯỚC 1: POS ➔ SO</span>
                </div>
                {stepState === 'STEP1_RUNNING' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} className="animate-spin" /> Đang chạy...
                  </span>
                )}
                {(stepState === 'STEP1_DONE' || stepState === 'COMPLETED') && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={14} /> Xong 100%
                  </span>
                )}
                {stepState === 'ERROR' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>❌ Lỗi</span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
                Gửi lệnh <code>syncRK</code> kéo bảng giá &amp; menu mới nhất từ POS RK7 vào máy chủ SO.
              </div>
            </div>

            {/* Sequential Connector */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: 4 }}>
                TUẦN TỰ
              </span>
              <ArrowRight size={20} color={stepState === 'STEP1_DONE' || stepState === 'COMPLETED' ? '#10B981' : '#94A3B8'} />
            </div>

            {/* Step 2 Card */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: stepState === 'STEP2_RUNNING' ? '2px solid #3B82F6' : stepState === 'COMPLETED' ? '2px solid #10B981' : '1px solid #CBD5E1',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              opacity: (syncMode === 'FULL_TWO_STEP' && (stepState === 'IDLE' || stepState === 'STEP1_RUNNING')) ? 0.65 : 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Radio size={18} color="#0EA5E9" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0F172A' }}>BƯỚC 2: SO ➔ CO (TABLET)</span>
                </div>
                {syncMode === 'FULL_TWO_STEP' && (stepState === 'IDLE' || stepState === 'STEP1_RUNNING') && (
                  <span style={{ fontSize: 11, color: '#64748B' }}>⏳ Chờ Bước 1</span>
                )}
                {stepState === 'STEP2_RUNNING' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={12} className="animate-spin" /> Đang phát sóng...
                  </span>
                )}
                {stepState === 'COMPLETED' && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Check size={14} /> Hoàn tất
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
                Phát sóng MQTT ép tất cả máy tính bảng CO xóa cache SQLite và nạp menu/giá mới.
              </div>
            </div>
          </div>

          {/* Sync Mode Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>
              Phương Thức Đồng Bộ:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <label style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: syncMode === 'FULL_TWO_STEP' ? '2px solid #F5B800' : '1px solid #CBD5E1',
                background: syncMode === 'FULL_TWO_STEP' ? '#FFFBEB' : '#FFFFFF',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="FULL_TWO_STEP"
                    disabled={isRunning}
                    checked={syncMode === 'FULL_TWO_STEP'}
                    onChange={() => setSyncMode('FULL_TWO_STEP')}
                  />
                  <span style={{ fontWeight: 800, fontSize: 12.5, color: '#0F172A' }}>2 Lớp Tuần Tự (SO ➔ CO)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', paddingLeft: 22 }}>Khuyên dùng: Bước 1 xong mới sang Bước 2.</span>
              </label>

              <label style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: syncMode === 'SO_ONLY' ? '2px solid #F5B800' : '1px solid #CBD5E1',
                background: syncMode === 'SO_ONLY' ? '#FFFBEB' : '#FFFFFF',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="SO_ONLY"
                    disabled={isRunning}
                    checked={syncMode === 'SO_ONLY'}
                    onChange={() => setSyncMode('SO_ONLY')}
                  />
                  <span style={{ fontWeight: 800, fontSize: 12.5, color: '#0F172A' }}>Chỉ Đồng Bộ SO (Bước 1)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', paddingLeft: 22 }}>Chỉ kéo menu từ POS RK7 vào máy chủ SO.</span>
              </label>

              <label style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: syncMode === 'CO_ONLY' ? '2px solid #F5B800' : '1px solid #CBD5E1',
                background: syncMode === 'CO_ONLY' ? '#FFFBEB' : '#FFFFFF',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="CO_ONLY"
                    disabled={isRunning}
                    checked={syncMode === 'CO_ONLY'}
                    onChange={() => setSyncMode('CO_ONLY')}
                  />
                  <span style={{ fontWeight: 800, fontSize: 12.5, color: '#0F172A' }}>Chỉ Ép Tablet CO (Bước 2)</span>
                </div>
                <span style={{ fontSize: 11, color: '#64748B', paddingLeft: 22 }}>Bắn MQTT ép các Tablet CO xóa cache nạp lại.</span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartSequentialSync}
            disabled={isRunning}
            style={{
              padding: '11px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#F5B800',
              color: '#000',
              fontWeight: 800,
              fontSize: 13.5,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <RefreshCw size={17} className={isRunning ? 'animate-spin' : ''} />
            {isRunning ? 'Đang Thực Thi Tuần Tự Từng Bước...' : '⚡ Bắt Đầu Ép Đồng Bộ Tuần Tự Menu & Giá Toàn Nhà Hàng'}
          </button>

          {/* Error Alert if Step 1 failed */}
          {errorMsg && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #FECACA',
              background: '#FEF2F2',
              color: '#991B1B',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertTriangle size={18} color="#DC2626" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Live Progress Logs */}
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
        {!inline && (
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
              disabled={isRunning}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#334155',
                fontSize: 12,
                fontWeight: 600,
                cursor: isRunning ? 'not-allowed' : 'pointer'
              }}
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
