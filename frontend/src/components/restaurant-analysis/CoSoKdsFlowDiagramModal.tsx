import React, { useEffect } from 'react';
import { 
  X, Smartphone, Tablet, Server, Radio, Monitor, ChefHat, 
  CheckCircle2, ArrowDown, BellRing, Sparkles
} from 'lucide-react';

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
        maxWidth: 1060,
        height: '92vh',
        borderRadius: 12,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid #CBD5E1'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                LƯU ĐỒ LUỒNG GỌI MÓN THỜI GIAN THỰC (CO ➔ POS ➔ MQTT ➔ KDS ➔ SO)
                {restaurantName && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '2px 8px', borderRadius: 4 }}>
                    {restaurantName}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748B' }}>
                Lưu đồ tuần tự trực quan từ lúc khách/phục vụ bấm order đến khi món ra bàn
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

        {/* Content Body: Visual Flowchart */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Flowchart Step 1: Khởi Tạo Order (CO hoặc SO) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 820,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14
            }}>
              {/* Branch 1A: Tablet CO */}
              <div style={{
                background: '#EFF6FF',
                border: '2px solid #3B82F6',
                borderRadius: 10,
                padding: '12px 16px',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Tablet size={18} color="#1D4ED8" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#1D4ED8' }}>1A. KHÁCH TỰ GỌI TRÊN TABLET CO</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#1E3A8A', lineHeight: 1.5 }}>
                  Khách ngồi tại bàn chọn món trên máy tính bảng <strong>Tablet CO</strong> (app <code>vn.com.ggg.customerorder</code>), chọn số lượng &amp; ghi chú món (ít đá, không cay...).
                </div>
              </div>

              {/* Branch 1B: Staff SO */}
              <div style={{
                background: '#FAF5FF',
                border: '2px solid #8B5CF6',
                borderRadius: 10,
                padding: '12px 16px',
                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Smartphone size={18} color="#6D28D9" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#6D28D9' }}>1B. PHỤC VỤ GỌI TRÊN MÁY SO</span>
                </div>
                <div style={{ fontSize: 11.5, color: '#581C87', lineHeight: 1.5 }}>
                  Nhân viên phục vụ đến tận bàn ghi nhận order bằng thiết bị cầm tay <strong>Staff SO</strong> (app <code>com.ggg.stafforder</code>) và bấm xác nhận gửi món.
                </div>
              </div>
            </div>

            {/* Connecting Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '2px 8px', borderRadius: 10 }}>
                Giao thức: HTTP REST POST submitOrder()
              </div>
              <ArrowDown size={20} color="#64748B" />
            </div>
          </div>

          {/* Flowchart Step 2: Máy Chủ POS R-Keeper Ghi Nhận */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 820,
              background: '#FFFFFF',
              border: '2px solid #6366F1',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 2px 4px rgba(99, 102, 241, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Server size={18} color="#4F46E5" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#4F46E5' }}>2. MÁY CHỦ POS R-KEEPER TIẾP NHẬN &amp; LƯU ĐƠN</span>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', background: '#EEF2FF', color: '#4F46E5', borderRadius: 4 }}>
                  Database G_ORDER
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#334155', lineHeight: 1.5 }}>
                Máy chủ POS tại nhà hàng tiếp nhận yêu cầu, gán mã <code>order_id</code>, ghi nhận thời gian gửi vào MongoDB <code>G_ORDER.ORDER</code>, đồng thời chia món theo từng quầy bếp chế biến.
              </div>
            </div>

            {/* Connecting Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '2px 8px', borderRadius: 10 }}>
                Phát sóng ngay lập tức qua MQTT Broker (Port 1883)
              </div>
              <ArrowDown size={20} color="#0284C7" />
            </div>
          </div>

          {/* Flowchart Step 3: MQTT Broker Điều Phối Tức Thời */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 820,
              background: '#F0F9FF',
              border: '2px solid #0EA5E9',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 2px 4px rgba(14, 165, 233, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Radio size={18} color="#0284C7" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#0284C7' }}>3. MQTT BROKER (103.7.43.216:1883) ĐIỀU PHỐI TIN NHẮN TỨC THÌ</span>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', background: '#E0F2FE', color: '#0369A1', borderRadius: 4 }}>
                  Topic /ggg/restaurant/order
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#0C4A6E', lineHeight: 1.5 }}>
                Hệ thống publish gói tin món vào topic nhà hàng. Các máy tính bảng KDS bếp đang trực tuyến subscribe topic sẽ nhận được món ngay trong <strong>0.2 giây</strong> mà không cần reload trang!
              </div>
            </div>

            {/* Connecting Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 10 }}>
                KDS nhận theo từng Quầy Bếp (LineCook)
              </div>
              <ArrowDown size={20} color="#D97706" />
            </div>
          </div>

          {/* Flowchart Step 4: KDS Bếp Nhận Món & TTS */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 820,
              background: '#FFFBEB',
              border: '2px solid #F59E0B',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Monitor size={18} color="#D97706" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#D97706' }}>4. MÀN HÌNH KDS BẾP (LINECOOK BẾP NÓNG, LẠNH, NƯỚNG)</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', background: '#FEF3C7', color: '#B45309', borderRadius: 4 }}>
                    <BellRing size={11} style={{ display: 'inline', marginRight: 2 }} /> Chuông DingDong &amp; Google TTS
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: '#78350F', lineHeight: 1.5 }}>
                • KDS phát âm thanh chuông <strong>DingDong</strong> + kích hoạt giọng nói Google Cloud TTS <strong>đọc to tên món</strong> bằng tiếng Việt để đầu bếp biết ngay mà không cần nhìn màn hình.<br />
                • Thẻ món xuất hiện trên KDS và bắt đầu <strong>đếm ngược thời gian SLA</strong> (thường từ 10 - 15 phút).
              </div>
            </div>

            {/* Connecting Arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: 10 }}>
                Đầu bếp làm xong bấm SubmitDish()
              </div>
              <ArrowDown size={20} color="#16A34A" />
            </div>
          </div>

          {/* Flowchart Step 5: Bếp Bấm Done & SO Nhận Báo Bưng Món */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '100%',
              maxWidth: 820,
              background: '#F0FDF4',
              border: '2px solid #10B981',
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChefHat size={18} color="#15803D" />
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#15803D' }}>5. HOÀN THÀNH CHẾ BIẾN ➔ BÁO APP SO BƯNG RA BÀN CHO KHÁCH</span>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', background: '#DCFCE7', color: '#166534', borderRadius: 4 }}>
                  DeliveredDishItem
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#14532D', lineHeight: 1.5 }}>
                • Đầu bếp làm xong, chạm tay vào thẻ món trên màn hình KDS ➔ Gửi sự kiện <code>SubmitDish()</code> hoàn thành.<br />
                • POS nhận trạng thái Done ➔ Bắn tin báo về <strong>App SO của nhân viên phục vụ</strong>: Điện thoại SO rung chuông thông báo <em>"Món X của Bàn Y đã xong, vui lòng bưng ra bàn!"</em>.<br />
                • Nhân viên phục vụ đón đĩa món từ quầy bếp, bưng tới bàn giao cho khách và bấm xác nhận hoàn tất trên app SO!
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div style={{
            maxWidth: 820,
            margin: '6px auto 0',
            padding: '10px 16px',
            background: '#F8FAFC',
            borderRadius: 8,
            border: '1px solid #E2E8F0',
            fontSize: 12,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={16} color="#16A34A" />
            <span>Toàn bộ chu trình từ lúc khách bấm chọn món đến khi bếp nhận và phục vụ bưng ra diễn ra khép kín, được đo đếm mốc thời gian từng giây phục vụ đối soát!</span>
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
          <div>Lưu đồ chuẩn gọi món hệ thống GGG (CO - SO - KDS)</div>
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
