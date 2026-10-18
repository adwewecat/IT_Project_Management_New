import React, { useState, useEffect } from 'react';
import {
  Calendar,
  RefreshCw,
  ChefHat,
  BellRing,
  BarChart3,
  Copy,
  Check,
  Info,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { TopScrollTable } from '../../components/ui/TopScrollTable';
import {
  mongoService,
  KdsKitchenIntakeAnalysisResponse
} from '../../services/mongoService';

interface KdsKitchenIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  host: string;
  port?: number;
  restaurantName?: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const KdsKitchenIntakeModal: React.FC<KdsKitchenIntakeModalProps> = ({
  isOpen,
  onClose,
  host,
  port = 27017,
  restaurantName = '',
  showToast
}) => {
  // Khoảng ngày mặc định: Hôm nay
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<KdsKitchenIntakeAnalysisResponse | null>(null);
  const [displayMode, setDisplayMode] = useState<'both' | 'dishes' | 'batches'>('both');
  const [activeSubTab, setActiveSubTab] = useState<'places' | 'dates' | 'hours'>('places');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Tính số ngày chênh lệch giữa start và end
  const getDaySpan = (s: string, e: string): number => {
    try {
      const dt1 = new Date(s);
      const dt2 = new Date(e);
      const diffTime = dt2.getTime() - dt1.getTime();
      return Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    } catch {
      return 1;
    }
  };

  const daySpan = getDaySpan(startDate, endDate);
  const isExceededMaxDays = daySpan > 5;

  useEffect(() => {
    if (isOpen && host) {
      handleAnalyze(startDate, endDate);
    }
  }, [isOpen, host]);

  if (!isOpen) return null;

  // Xử lý các phím tắt chọn nhanh ngày
  const handleQuickSelect = (days: number, isYesterday: boolean = false) => {
    const now = new Date();
    if (isYesterday) {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
      handleAnalyze(yStr, yStr);
      return;
    }
    const end = now.toISOString().split('T')[0];
    const startObj = new Date(now);
    startObj.setDate(startObj.getDate() - (days - 1));
    const start = startObj.toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
    handleAnalyze(start, end);
  };

  const handleAnalyze = async (s: string = startDate, e: string = endDate) => {
    if (!host) {
      showToast('Chưa xác định IP MongoDB của nhà hàng!', 'error');
      return;
    }
    const span = getDaySpan(s, e);
    if (span <= 0) {
      showToast('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc!', 'error');
      return;
    }
    if (span > 5) {
      showToast('Tối đa chỉ được chọn phân tích trong phạm vi 5 ngày!', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await mongoService.analyzeKdsKitchenIntake({
        host,
        port,
        start_date: s,
        end_date: e
      });
      setAnalysisData(res);
      showToast(res.message || `Đã phân tích xong ${res.total_dishes.toLocaleString()} món vào bếp.`, 'success');
    } catch (err: any) {
      showToast(
        'Lỗi khi phân tích món vào bếp KDS: ' + (err.response?.data?.detail || err.message),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Sao chép báo cáo tóm tắt
  const handleCopySummary = () => {
    if (!analysisData) return;
    let t = `📊 BÁO CÁO TỔNG HỢP MÓN VÀ LƯỢT VÀO BẾP KDS\n`;
    t += `Nhà hàng: ${restaurantName || host} (${host}:${port})\n`;
    t += `Thời gian: ${analysisData.start_date} -> ${analysisData.end_date} (${analysisData.total_days} ngày)\n`;
    t += `--------------------------------------------------------\n`;
    t += `🍲 TỔNG SỐ MÓN ORDER VÀO BẾP: ${analysisData.total_dishes.toLocaleString()} món\n`;
    t += `🛎️ TỔNG SỐ LƯỢT BẤM GỬI BẾP: ${analysisData.total_batches.toLocaleString()} lượt\n`;
    t += `⚖️ TRUNG BÌNH MÓN / LƯỢT: ${analysisData.avg_dishes_per_batch} món/lượt\n`;
    t += `--------------------------------------------------------\n`;
    t += `PHÂN BỔ THEO QUẦY BẾP:\n`;
    analysisData.by_places.forEach((p) => {
      t += `- ${p.place_name}: ${p.total_dishes.toLocaleString()} món (${p.percentage}%) | ${p.total_batches.toLocaleString()} lượt (TB ${p.avg_dishes_per_batch} món/lượt)\n`;
    });
    t += `--------------------------------------------------------\n`;
    t += `PHÂN BỔ THEO NGÀY:\n`;
    analysisData.by_dates.forEach((d) => {
      t += `- Ngày ${d.date}: ${d.total_dishes.toLocaleString()} món | ${d.total_batches.toLocaleString()} lượt (TB ${d.avg_dishes_per_batch} món/lượt)\n`;
    });
    t += `\n(Xuất lúc: ${new Date().toLocaleString('vi-VN')} từ Hệ Thống IT GG Management)`;

    navigator.clipboard.writeText(t);
    setCopiedText(true);
    showToast('Đã sao chép báo cáo tổng hợp vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 Phân Tích Tổng Số Món & Lượt Order Vào Bếp (KDS Intake)"
      maxWidth="1100px"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
            <span>Nguồn dữ liệu: <strong>{analysisData?.source_collection || 'G_KITCHEN.LOG_DISH_FINISH_ITEM & DISH_KDS'}</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {analysisData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                leftIcon={copiedText ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                style={{ fontWeight: 600 }}
              >
                {copiedText ? 'Đã Sao Chép Báo Cáo' : 'Sao Chép Báo Cáo (Zalo/Mail)'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onClose}>
              Đóng [Esc]
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        {/* Banner Giới Thiệu & Chọn Thời Gian */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-secondary, #F8FAFC)',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Thông tin trạm và ghi chú nghiệp vụ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                🏪 {restaurantName || 'Nhà hàng'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                MongoDB KDS: <strong>{host}:{port}</strong>
              </span>
            </div>

            {/* Cảnh báo tối đa 5 ngày */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: '6px',
                backgroundColor: isExceededMaxDays ? '#FEF2F2' : '#EFF6FF',
                color: isExceededMaxDays ? '#DC2626' : '#1D4ED8',
                border: `1px solid ${isExceededMaxDays ? '#FCA5A5' : '#BFDBFE'}`,
                fontSize: '11.5px',
                fontWeight: 600
              }}
            >
              <Info size={13} />
              <span>Phạm vi: {daySpan} ngày (Quy định: tối đa 5 ngày)</span>
            </div>
          </div>

          {/* Dải điều khiển chọn ngày & nút phân tích */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            {/* Bộ chọn Date Picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Từ Ngày:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Đến Ngày:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary, #fff)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Nút Phân Tích */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAnalyze(startDate, endDate)}
                disabled={loading || isExceededMaxDays}
                leftIcon={loading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                style={{
                  backgroundColor: '#D97706',
                  borderColor: '#B45309',
                  fontWeight: 700,
                  marginLeft: '4px'
                }}
              >
                {loading ? 'Đang Phân Tích...' : '⚡ Bắt Đầu Phân Tích'}
              </Button>
            </div>

            {/* Các phím chọn nhanh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => handleQuickSelect(1, false)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card, #fff)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Hôm Nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(1, true)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card, #fff)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Hôm Qua
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(2, false)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card, #fff)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                2 Ngày
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(3, false)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card, #fff)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                3 Ngày
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect(5, false)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: '1px solid #F59E0B',
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  cursor: 'pointer'
                }}
              >
                5 Ngày (Max)
              </button>
            </div>
          </div>
        </div>

        {/* Thống kê Tổng Hợp (Metric Summary Cards) */}
        {analysisData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {/* Card 1: Tổng số món (Theo Món) */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-card, #fff)',
                border: '1.5px solid #F59E0B',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ChefHat size={24} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                  Tổng Món Order Vào Bếp
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#D97706', lineHeight: 1.2 }}>
                  {analysisData.total_dishes.toLocaleString()}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>món</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  (Chế độ: <strong>Theo Món</strong>)
                </div>
              </div>
            </div>

            {/* Card 2: Tổng số lượt (Theo Lượt) */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-card, #fff)',
                border: '1.5px solid #3B82F6',
                boxShadow: '0 2px 6px rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <BellRing size={24} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                  Tổng Số Lượt Bấm Gửi Bếp
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB', lineHeight: 1.2 }}>
                  {analysisData.total_batches.toLocaleString()}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>lượt</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  (Chế độ: <strong>Theo Lượt</strong> - 1 đợt gửi = 1 lượt)
                </div>
              </div>
            </div>

            {/* Card 3: Trung bình món / lượt */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-card, #fff)',
                border: '1.5px solid #10B981',
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <BarChart3 size={24} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                  Trung Bình Món / Lượt Gửi
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', lineHeight: 1.2 }}>
                  {analysisData.avg_dishes_per_batch}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>món/lượt</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  (Tỷ suất tải món mỗi đợt)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thanh Điều Hướng: Chế Độ Hiển Thị & Sub Tabs */}
        {analysisData && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            {/* Sub Tabs: Phân rã theo Quầy / Ngày / Khung Giờ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setActiveSubTab('places')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: activeSubTab === 'places' ? 700 : 500,
                  backgroundColor: activeSubTab === 'places' ? '#D97706' : 'transparent',
                  color: activeSubTab === 'places' ? '#FFFFFF' : 'var(--text-primary)',
                  border: activeSubTab === 'places' ? '1px solid #B45309' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={14} />
                <span>Theo Quầy Bếp ({analysisData.by_places.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('dates')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: activeSubTab === 'dates' ? 700 : 500,
                  backgroundColor: activeSubTab === 'dates' ? '#D97706' : 'transparent',
                  color: activeSubTab === 'dates' ? '#FFFFFF' : 'var(--text-primary)',
                  border: activeSubTab === 'dates' ? '1px solid #B45309' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Calendar size={14} />
                <span>Theo Ngày ({analysisData.by_dates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSubTab('hours')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: activeSubTab === 'hours' ? 700 : 500,
                  backgroundColor: activeSubTab === 'hours' ? '#D97706' : 'transparent',
                  color: activeSubTab === 'hours' ? '#FFFFFF' : 'var(--text-primary)',
                  border: activeSubTab === 'hours' ? '1px solid #B45309' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={14} />
                <span>Theo Khung Giờ (24h)</span>
              </button>
            </div>

            {/* Toggle Chế Độ Hiển Thị Cột: Theo Món / Theo Lượt / Cả Hai */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-secondary, #F1F5F9)', padding: '3px', borderRadius: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, padding: '0 6px' }}>Hiển thị:</span>
              <button
                type="button"
                onClick={() => setDisplayMode('both')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: displayMode === 'both' ? 700 : 500,
                  backgroundColor: displayMode === 'both' ? 'var(--bg-card, #fff)' : 'transparent',
                  color: displayMode === 'both' ? '#D97706' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: displayMode === 'both' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                📊 Cả Hai
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('dishes')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: displayMode === 'dishes' ? 700 : 500,
                  backgroundColor: displayMode === 'dishes' ? 'var(--bg-card, #fff)' : 'transparent',
                  color: displayMode === 'dishes' ? '#D97706' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: displayMode === 'dishes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🍲 Theo Món
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('batches')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: displayMode === 'batches' ? 700 : 500,
                  backgroundColor: displayMode === 'batches' ? 'var(--bg-card, #fff)' : 'transparent',
                  color: displayMode === 'batches' ? '#2563EB' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: displayMode === 'batches' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🛎️ Theo Lượt
              </button>
            </div>
          </div>
        )}

        {/* Nội dung Bảng Dữ Liệu Theo Tab */}
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto', color: '#D97706' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Đang truy vấn và tính toán dữ liệu món vào bếp KDS...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Đang đối soát LOG_DISH_FINISH_ITEM &amp; DISH_KDS từ MongoDB {host}
            </div>
          </div>
        ) : !analysisData ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ChefHat size={36} style={{ margin: '0 auto 10px auto', opacity: 0.4 }} />
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>Chưa có dữ liệu phân tích</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Vui lòng chọn ngày và bấm nút <strong>"⚡ Bắt Đầu Phân Tích"</strong> ở trên
            </div>
          </div>
        ) : (
          <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            {/* SUB TAB 1: BẢNG PHÂN BỔ THEO QUẦY BẾP (PLACES) */}
            {activeSubTab === 'places' && (
              <TopScrollTable>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary, #F9FAFB)', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>Tên Quầy Bếp (Place)</th>
                      {(displayMode === 'both' || displayMode === 'dishes') && (
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#D97706', textAlign: 'right' }}>
                          🍲 Số Món (Theo Món)
                        </th>
                      )}
                      {(displayMode === 'both' || displayMode === 'batches') && (
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB', textAlign: 'right' }}>
                          🛎️ Số Lượt Gửi (Theo Lượt)
                        </th>
                      )}
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                        ⚖️ TB Món/Lượt
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', width: '220px' }}>
                        Tỷ Lệ Món (% Toàn Nhà Hàng)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.by_places.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Không có món nào order vào quầy bếp trong khoảng thời gian này
                        </td>
                      </tr>
                    ) : (
                      analysisData.by_places.map((p, idx) => (
                        <tr
                          key={p.place_id ?? `unassigned_${idx}`}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #FAFAFA)',
                            transition: 'background-color 0.1s'
                          }}
                        >
                          <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '9px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '14px' }}>🍳</span>
                              <span>{p.place_name}</span>
                              {p.place_id !== null && (
                                <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                                  #{p.place_id}
                                </span>
                              )}
                            </div>
                          </td>
                          {(displayMode === 'both' || displayMode === 'dishes') && (
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#D97706', fontSize: '13px' }}>
                              {p.total_dishes.toLocaleString()} món
                            </td>
                          )}
                          {(displayMode === 'both' || displayMode === 'batches') && (
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#2563EB', fontSize: '13px' }}>
                              {p.total_batches.toLocaleString()} lượt
                            </td>
                          )}
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            {p.avg_dishes_per_batch} món/lượt
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '8px', borderRadius: '4px', backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${Math.min(100, p.percentage)}%`,
                                    height: '100%',
                                    backgroundColor: idx === 0 ? '#D97706' : idx === 1 ? '#F59E0B' : '#3B82F6',
                                    borderRadius: '4px'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 700, width: '42px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                {p.percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {analysisData.by_places.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--bg-secondary, #F3F4F6)', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                        <td colSpan={2} style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>
                          🏆 TỔNG CỘNG TOÀN BỘ NHÀ HÀNG:
                        </td>
                        {(displayMode === 'both' || displayMode === 'dishes') && (
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#D97706', fontSize: '14px' }}>
                            {analysisData.total_dishes.toLocaleString()} món
                          </td>
                        )}
                        {(displayMode === 'both' || displayMode === 'batches') && (
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#2563EB', fontSize: '14px' }}>
                            {analysisData.total_batches.toLocaleString()} lượt
                          </td>
                        )}
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontSize: '13px' }}>
                          {analysisData.avg_dishes_per_batch} món/lượt
                        </td>
                        <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          100%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </TopScrollTable>
            )}

            {/* SUB TAB 2: BẢNG PHÂN BỔ THEO NGÀY (DATES) */}
            {activeSubTab === 'dates' && (
              <TopScrollTable>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary, #F9FAFB)', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>Ngày</th>
                      {(displayMode === 'both' || displayMode === 'dishes') && (
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#D97706', textAlign: 'right' }}>
                          🍲 Số Món (Theo Món)
                        </th>
                      )}
                      {(displayMode === 'both' || displayMode === 'batches') && (
                        <th style={{ padding: '10px 14px', fontWeight: 700, color: '#2563EB', textAlign: 'right' }}>
                          🛎️ Số Lượt Gửi (Theo Lượt)
                        </th>
                      )}
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                        ⚖️ TB Món / Lượt Gửi
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Đánh Giá
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.by_dates.map((d, idx) => (
                      <tr
                        key={d.date}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: idx % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #FAFAFA)'
                        }}
                      >
                        <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '9px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          📅 {d.date}
                        </td>
                        {(displayMode === 'both' || displayMode === 'dishes') && (
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#D97706', fontSize: '13px' }}>
                            {d.total_dishes.toLocaleString()} món
                          </td>
                        )}
                        {(displayMode === 'both' || displayMode === 'batches') && (
                          <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 800, color: '#2563EB', fontSize: '13px' }}>
                            {d.total_batches.toLocaleString()} lượt
                          </td>
                        )}
                        <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                          {d.avg_dishes_per_batch} món/lượt
                        </td>
                        <td style={{ padding: '9px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {d.total_dishes > 0 ? (
                            <span style={{ color: '#059669', fontWeight: 600 }}>✓ Có phát sinh order</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>— Không phát sinh</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {analysisData.by_dates.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--bg-secondary, #F3F4F6)', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                        <td colSpan={2} style={{ padding: '10px 14px', color: 'var(--text-primary)' }}>
                          🏆 TỔNG CỘNG ({analysisData.total_days} NGÀY):
                        </td>
                        {(displayMode === 'both' || displayMode === 'dishes') && (
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#D97706', fontSize: '14px' }}>
                            {analysisData.total_dishes.toLocaleString()} món
                          </td>
                        )}
                        {(displayMode === 'both' || displayMode === 'batches') && (
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: '#2563EB', fontSize: '14px' }}>
                            {analysisData.total_batches.toLocaleString()} lượt
                          </td>
                        )}
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#059669', fontSize: '13px' }}>
                          {analysisData.avg_dishes_per_batch} món/lượt
                        </td>
                        <td style={{ padding: '10px 14px' }} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </TopScrollTable>
            )}

            {/* SUB TAB 3: BẢNG PHÂN BỔ THEO KHUNG GIỜ (HOURS) */}
            {activeSubTab === 'hours' && (
              <TopScrollTable>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary, #F9FAFB)', borderBottom: '2px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)', width: '140px' }}>Khung Giờ</th>
                      {(displayMode === 'both' || displayMode === 'dishes') && (
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#D97706', textAlign: 'right', width: '130px' }}>
                          🍲 Số Món
                        </th>
                      )}
                      {(displayMode === 'both' || displayMode === 'batches') && (
                        <th style={{ padding: '8px 12px', fontWeight: 700, color: '#2563EB', textAlign: 'right', width: '130px' }}>
                          🛎️ Số Lượt Gửi
                        </th>
                      )}
                      <th style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Phân Bổ Tải Bếp (Biểu Đồ)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.by_hours.map((h) => {
                      const maxDishes = Math.max(1, ...analysisData.by_hours.map((x) => x.total_dishes));
                      const pct = Math.round((h.total_dishes / maxDishes) * 100);
                      const isPeak = (h.hour >= 11 && h.hour <= 13) || (h.hour >= 18 && h.hour <= 20);
                      return (
                        <tr
                          key={h.hour}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: isPeak ? 'rgba(217, 119, 6, 0.04)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span>⏰</span>
                              <span>{h.hour_label}</span>
                              {isPeak && <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 700 }}>[Cao điểm]</span>}
                            </span>
                          </td>
                          {(displayMode === 'both' || displayMode === 'dishes') && (
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: h.total_dishes > 0 ? '#D97706' : 'var(--text-muted)' }}>
                              {h.total_dishes.toLocaleString()}
                            </td>
                          )}
                          {(displayMode === 'both' || displayMode === 'batches') && (
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: h.total_batches > 0 ? '#2563EB' : 'var(--text-muted)' }}>
                              {h.total_batches.toLocaleString()}
                            </td>
                          )}
                          <td style={{ padding: '7px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '7px', borderRadius: '4px', backgroundColor: 'var(--border-color)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    backgroundColor: isPeak ? '#D97706' : '#3B82F6',
                                    borderRadius: '4px'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', width: '30px', textAlign: 'right' }}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TopScrollTable>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
