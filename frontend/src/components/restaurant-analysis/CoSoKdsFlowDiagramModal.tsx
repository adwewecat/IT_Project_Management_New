import React, { useEffect } from 'react';
import { X, Network, Smartphone, Server, Radio, Monitor, Tablet } from 'lucide-react';

interface CoSoKdsFlowDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
}

export const CoSoKdsFlowDiagramModal: React.FC<CoSoKdsFlowDiagramModalProps> = ({
  isOpen,
  onClose,
  restaurantName
}) => {
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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: '#FFFFFF',
        width: '100%',
        maxWidth: 1100,
        height: '90vh',
        borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #CBD5E1'
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
              <Network size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                BẢN ĐỒ LUỒNG DỮ LIỆU & GIAO THỨC LIÊN KẾT GIỮA CO - SO - KDS
                {restaurantName && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>
                    {restaurantName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Hệ sinh thái: Tablet CO Khách | Máy Staff SO Phục Vụ | KDS Bếp | Máy Chủ POS R-Keeper | MQTT Broker
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

        {/* Content Body: Visual Architecture & Sequence Flow */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Top 5 Participating Entities */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 12,
            background: '#F1F5F9',
            padding: 14,
            borderRadius: 10,
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Tablet size={24} color="#2563EB" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Khách Hàng (CO)</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Tablet Bàn vn.com.ggg</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Smartphone size={24} color="#D97706" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Phục Vụ (SO)</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>Staff Order / Tablet POS</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Monitor size={24} color="#16A34A" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Nhà Bếp (KDS)</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>LineCook Flutter App</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Server size={24} color="#4F46E5" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Server Nhà Hàng</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>POS RK7 / MongoDB</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #CBD5E1', textAlign: 'center' }}>
              <Radio size={24} color="#0284C7" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>MQTT Broker</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>103.7.43.216:1883</div>
            </div>
          </div>

          {/* Sequence Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Stage 1 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#3B82F6', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>1</span>
                GIAI ĐOẠN 1: MỞ BÀN & ĐỒNG BỘ TRẠNG THÁI
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                • Nhân viên dùng <strong>App SO</strong> mở bàn (checkinBooking / openTable).<br />
                • POS ghi nhận bàn mở $\rightarrow$ Bắn lệnh MQTT kích hoạt Menu trên <strong>Tablet CO</strong> của bàn tương ứng để khách bắt đầu gọi món.
              </div>
            </div>

            {/* Stage 2 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#6366F1', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>2</span>
                GIAI ĐOẠN 2: GỌI MÓN & ĐIỀU PHỐI BẾP (LINE COOK DISPATCHING)
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                • Khách bấm gọi món trên CO: Gọi API <code>submitOrder()</code> gửi danh sách món lên POS.<br />
                • POS ghi nhận vào <code>G_ORDER</code> và Publish gói tin món vào Topic MQTT của nhà hàng.<br />
                • Màn hình KDS Bếp nhận món theo từng <strong>LineCook</strong> (Bếp Nóng, Bếp Lạnh, Bếp Nướng...).<br />
                • KDS kích hoạt Google Cloud TTS đọc to tên món bằng giọng nói + phát chuông <code>DingDong</code> + đếm ngược thời gian SLA.
              </div>
            </div>

            {/* Stage 3 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>3</span>
                GIAI ĐOẠN 3: GIỤC MÓN & ƯU TIÊN KHẨN CẤP
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                • Khách bấm "Giục ra món" trên Tablet CO hoặc Nhân viên giục trên SO: Bắn bản tin khẩn <em>"Bàn %s giục ra món %s"</em>.<br />
                • Màn hình KDS bật popup đỏ <code>OrderPrioritizedPopup</code> và nháy cảnh báo đỏ trên thẻ món.<br />
                • App SO của nhân viên quản lý khu vực nhận cảnh báo rung để chuẩn bị ra đón món.
              </div>
            </div>

            {/* Stage 4 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#10B981', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>4</span>
                GIAI ĐOẠN 4: HOÀN THÀNH CHẾ BIẾN & BƯNG RA BÀN
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                • Bếp trưởng bấm xong trên KDS: Gọi hàm <code>SubmitDish()</code> $\rightarrow$ Phát chuông xong món.<br />
                • POS nhận trạng thái hoàn thành $\rightarrow$ Bắn MQTT báo <strong>App SO</strong> hiện danh sách món cần bưng (<code>DeliveredDishItem</code>).<br />
                • Phục vụ bưng món ra bàn cho khách và xác nhận hoàn tất giao món trên máy SO.
              </div>
            </div>

            {/* Stage 5 */}
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#8B5CF6', color: '#FFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>5</span>
                GIAI ĐOẠN 5: THANH TOÁN TẠI BÀN (CO-PAY) & ĐÓNG BÀN
              </div>
              <div style={{ padding: '12px 16px', fontSize: 12.5, color: '#334155', lineHeight: 1.6 }}>
                • Khách bấm thanh toán tại bàn trên Tablet CO $\rightarrow$ App gọi <code>createPaymentQRCode()</code> sinh mã VNPAY / Momo / Thẻ.<br />
                • Sau khi thanh toán thành công, gọi <code>submitPrintBillVAT()</code> phát lệnh in hóa đơn VAT tại quầy thu ngân và khóa bàn.
              </div>
            </div>

          </div>
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
          <div>Sơ đồ chuẩn kiến trúc phân tán GGG (CO - SO - KDS Flow)</div>
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
