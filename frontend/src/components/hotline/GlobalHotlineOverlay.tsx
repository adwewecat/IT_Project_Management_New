import React from 'react';
import { PhoneCall, X, AlertTriangle, Monitor, CheckCircle, Info } from 'lucide-react';
import { useHotline } from '../../contexts/HotlineContext';
import { HotlineMissedCallsModal } from '../restaurants/HotlineMissedCallsModal';
import { VncKdsModal } from '../restaurants/VncKdsModal';
import { Hotline3cxGuideModal } from './Hotline3cxGuideModal';

export const GlobalHotlineOverlay: React.FC = () => {
  const {
    incomingCall,
    dismissIncomingCall,
    isMissedCallsModalOpen,
    closeMissedCallsModal,
    isGuideModalOpen,
    closeGuideModal,
    vncModalOpen,
    vncRestaurantName,
    vncIpPrefix,
    openVncModal,
    closeVncModal,
    setMissedHotlineCount,
    hotlineToast,
    setHotlineToast,
  } = useHotline();

  return (
    <>
      {/* 1. THANH BANNER THÔNG BÁO CUỘC GỌI ĐẾN (HIỂN THỊ NỔI BẬT TRÊN ĐẦU MỌI MÀN HÌNH) */}
      {incomingCall && (
        <div
          style={{
            position: 'fixed',
            top: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            minWidth: 'min(380px, calc(100vw - 20px))',
            maxWidth: 'calc(100vw - 20px)',
            boxSizing: 'border-box',
            padding: '10px 18px',
            borderRadius: '10px',
            backgroundColor: incomingCall.restaurant ? '#EFF6FF' : '#FEF3C7',
            border: incomingCall.restaurant ? '2px solid #2563EB' : '2px solid #D97706',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            animation: 'hotlineSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: incomingCall.restaurant ? '#2563EB' : '#D97706',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'hotlinePulse 1.2s infinite',
              }}
            >
              <PhoneCall size={17} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: incomingCall.restaurant ? '#1E40AF' : '#92400E' }}>
                Đang có cuộc gọi đến: Máy nhánh {incomingCall.ext}
                {incomingCall.caller_raw_text ? ` (${incomingCall.caller_raw_text})` : ''}
              </div>
              <div style={{ fontSize: '12px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {incomingCall.restaurant ? (
                  <span style={{ color: '#1E40AF', fontWeight: 600 }}>
                    🏪 {incomingCall.restaurant.res || incomingCall.restaurant_name}
                  </span>
                ) : (
                  (() => {
                    const text = `${incomingCall.caller_raw_text || ''} ${incomingCall.restaurant_name || ''} ${incomingCall.ext || ''}`.toLowerCase();
                    const isInternal = ['it dept', 'its', 'it support', 'helpdesk', 'tram', 'dung', 'bao', 'nội bộ', 'hcm its', 'hn its', 'hr dept', 'acc dept'].some(k => text.includes(k));
                    return isInternal ? (
                      <span
                        style={{
                          backgroundColor: '#4338CA',
                          color: '#FFFFFF',
                          padding: '1px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        🏢 Cuộc gọi nội bộ / Đồng nghiệp
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#B45309',
                          color: '#FFFFFF',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                        }}
                      >
                        ⚠️ Người dùng không nằm trong danh sách Nhà Hàng
                      </span>
                    );
                  })()
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {incomingCall.restaurant && (
              <button
                type="button"
                onClick={() => {
                  const r = incomingCall.restaurant!;
                  const prefix = r.ip_prefix || '';
                  const title = r.modal_title || r.res || 'Kết Nối Từ Xa';
                  openVncModal(title, prefix);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.4)',
                }}
              >
                <Monitor size={14} /> Mở Kết Nối VNC/KDS
              </button>
            )}

            <button
              type="button"
              onClick={dismissIncomingCall}
              title="Đóng thông báo này"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 1.1 MODAL POPUP TRUNG TÂM KHI CÓ CUỘC GỌI NỘI BỘ / THỬ NGHIỆM ĐẾN (KHÔNG PHẢI NHÀ HÀNG) */}
      {incomingCall && !incomingCall.restaurant && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              position: 'relative',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px 26px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              textAlign: 'center',
              border: '2px solid #F59E0B',
              animation: 'hotlineSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Nút đóng nhanh (X) ở góc phải modal */}
            <button
              type="button"
              onClick={dismissIncomingCall}
              title="Đóng thông báo"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {/* Icon chuông reo */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                animation: 'hotlinePulse 1.1s infinite',
                border: '3px solid #FDE68A',
              }}
            >
              <PhoneCall size={32} />
            </div>

            <div style={{ fontSize: '13px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              🔴 ĐANG CÓ CUỘC GỌI ĐẾN (ĐÍCH DANH)
            </div>

            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Máy Nhánh: {incomingCall.ext}
            </div>

            <div style={{ fontSize: '14px', color: '#475569', marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', lineHeight: 1.5 }}>
              <div>👤 <strong>Người gọi:</strong> {incomingCall.caller_raw_text || 'Chưa rõ danh tính'}</div>
              {incomingCall.duty_user && (
                <div style={{ marginTop: '4px', color: '#2563EB', fontWeight: 600 }}>
                  🎯 <strong>Kỹ thuật viên tiếp nhận:</strong> {incomingCall.duty_user}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#B45309' }}>
                ⚠️ Số này không thuộc danh bạ Nhà Hàng (Cuộc gọi nội bộ / Thử nghiệm)
              </div>
            </div>

            {/* Các nút hành động */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('hotline_filter_restaurant', { detail: { keyword: incomingCall.ext } }));
                  dismissIncomingCall();
                }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                🔍 Tìm Trong Danh Sách NH
              </button>

              <button
                type="button"
                onClick={dismissIncomingCall}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✕ Đã Nghe & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL QUẢN LÝ CUỘC GỌI NHỠ & LỊCH SỬ ĐÃ NGHE (2 TAB) */}
      <HotlineMissedCallsModal
        isOpen={isMissedCallsModalOpen}
        onClose={closeMissedCallsModal}
        onOpenVnc={(restaurantName, ipPrefix) => {
          openVncModal(restaurantName, ipPrefix);
        }}
        onCountChange={(newCount) => {
          setMissedHotlineCount(newCount);
        }}
      />

      {/* 3. MODAL KẾT NỐI TỪ XA VNC / KDS */}
      <VncKdsModal
        isOpen={vncModalOpen}
        onClose={closeVncModal}
        restaurantName={vncRestaurantName}
        ipPrefix={vncIpPrefix}
      />

      {/* 4. MODAL HƯỚNG DẪN CÀI ĐẶT 3CX (PWA) */}
      <Hotline3cxGuideModal
        isOpen={isGuideModalOpen}
        onClose={closeGuideModal}
      />

      {/* 4. TOAST THÔNG BÁO GÓC TRÊN BÊN PHẢI */}
      {hotlineToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            maxWidth: '420px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor:
              hotlineToast.type === 'success'
                ? '#ECFDF5'
                : hotlineToast.type === 'warning'
                ? '#FEF3C7'
                : '#EFF6FF',
            border:
              hotlineToast.type === 'success'
                ? '1px solid #10B981'
                : hotlineToast.type === 'warning'
                ? '1px solid #F59E0B'
                : '1px solid #3B82F6',
            color:
              hotlineToast.type === 'success'
                ? '#065F46'
                : hotlineToast.type === 'warning'
                ? '#92400E'
                : '#1E40AF',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: 1.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            animation: 'hotlineSlideUp 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hotlineToast.type === 'success' ? (
              <CheckCircle size={17} style={{ color: '#10B981', flexShrink: 0 }} />
            ) : hotlineToast.type === 'warning' ? (
              <AlertTriangle size={17} style={{ color: '#D97706', flexShrink: 0 }} />
            ) : (
              <Info size={17} style={{ color: '#2563EB', flexShrink: 0 }} />
            )}
            <span>{hotlineToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setHotlineToast(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'currentColor',
              cursor: 'pointer',
              padding: '2px',
              opacity: 0.7,
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes hotlinePulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.85; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes hotlineSlideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes hotlineSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};
