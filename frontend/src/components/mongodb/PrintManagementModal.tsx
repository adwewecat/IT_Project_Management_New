import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Printer,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Clock,
  Wifi,
  WifiOff,
  Trash2,
  Cpu
} from 'lucide-react';
import {
  printManagementService,
  PrintStationInfo
} from '../../services/printManagementService';
import { useModalStack } from '../../utils/modalStack';
import { TopScrollTable } from '../ui/TopScrollTable';

interface PrintManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantCode: string;
  restaurantName?: string;
  defaultIpLan?: string;
}

export const PrintManagementModal: React.FC<PrintManagementModalProps> = ({
  isOpen,
  onClose,
  restaurantCode,
  restaurantName,
  defaultIpLan,
}) => {
  // Đăng ký Modal Stack LIFO theo quy chuẩn dự án (Escape đóng modal trên cùng)
  useModalStack(isOpen, onClose);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [clearingSpooler, setClearingSpooler] = useState<boolean>(false);
  const [stations, setStations] = useState<PrintStationInfo[]>([]);
  const [selectedStationIp, setSelectedStationIp] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 1. Tải thông tin Print Management từ Backend
  const loadPrintManagement = useCallback(async (preferredIp?: string) => {
    if (!restaurantCode) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await printManagementService.getPrintManagement(restaurantCode, preferredIp || defaultIpLan);
      setStations(data.stations || []);

      // Xác định trạm được chọn
      if (data.stations && data.stations.length > 0) {
        if (preferredIp && data.stations.some(s => s.ip_lan === preferredIp)) {
          setSelectedStationIp(preferredIp);
        } else if (selectedStationIp && data.stations.some(s => s.ip_lan === selectedStationIp)) {
          // Giữ nguyên trạm đang chọn
        } else if (data.selected_station) {
          setSelectedStationIp(data.selected_station.ip_lan);
        } else {
          setSelectedStationIp(data.stations[0].ip_lan);
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi tải thông tin Print Management:', err);
      setStatusMessage({
        text: err?.response?.data?.detail || 'Không thể tải thông tin máy in. Vui lòng thử lại.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [restaurantCode, defaultIpLan, selectedStationIp]);

  // Gọi khi mở modal
  useEffect(() => {
    if (isOpen) {
      loadPrintManagement(defaultIpLan);
    } else {
      setSearchTerm('');
      setStatusMessage(null);
    }
  }, [isOpen, restaurantCode, defaultIpLan]);

  // Trạm hiện tại đang được chọn
  const currentStation = useMemo(() => {
    return stations.find(s => s.ip_lan === selectedStationIp) || stations[0];
  }, [stations, selectedStationIp]);

  // 2. Xử lý quét thời gian thực (Realtime Refresh) từ máy trạm
  const handleRealtimeRefresh = async () => {
    if (!currentStation || !currentStation.ip_lan) return;
    setRefreshing(true);
    setStatusMessage({
      text: `Đang gửi lệnh yêu cầu máy trạm ${currentStation.ip_lan} quét lại máy in...`,
      type: 'info'
    });

    try {
      const res = await printManagementService.refreshStationPrinters(
        currentStation.restaurant_code,
        currentStation.ip_lan
      );

      const taskId = res.task_id;
      if (taskId) {
        // Polling kiểm tra kết quả task sau 2-4 giây
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const taskInfo = await printManagementService.getTaskStatus(taskId);
            if (taskInfo && taskInfo.result_status === 'SUCCESS') {
              clearInterval(interval);
              setRefreshing(false);
              setStatusMessage({
                text: 'Đã nhận dữ liệu máy in mới nhất từ máy trạm thành công!',
                type: 'success'
              });
              await loadPrintManagement(currentStation.ip_lan);
            } else if (taskInfo && taskInfo.result_status === 'FAILED') {
              clearInterval(interval);
              setRefreshing(false);
              setStatusMessage({
                text: `Máy trạm báo lỗi: ${taskInfo.result_message || 'Thất bại'}`,
                type: 'error'
              });
            } else if (attempts >= 10) {
              clearInterval(interval);
              setRefreshing(false);
              setStatusMessage({
                text: 'Lệnh đã gửi tới máy trạm. Máy trạm sẽ tự động cập nhật khi Agent hoàn thành.',
                type: 'info'
              });
              await loadPrintManagement(currentStation.ip_lan);
            }
          } catch {
            if (attempts >= 6) {
              clearInterval(interval);
              setRefreshing(false);
              await loadPrintManagement(currentStation.ip_lan);
            }
          }
        }, 1500);
      } else {
        setRefreshing(false);
        await loadPrintManagement(currentStation.ip_lan);
      }
    } catch (err: any) {
      setRefreshing(false);
      setStatusMessage({
        text: err?.response?.data?.detail || 'Lỗi khi gửi lệnh quét máy in.',
        type: 'error'
      });
    }
  };

  // 3. Xử lý Khởi động lại Spooler và Xóa sạch các lệnh in bị kẹt
  const handleClearSpooler = async () => {
    if (!currentStation || !currentStation.ip_lan) return;
    if (!window.confirm(`Bạn có chắc chắn muốn khởi động lại dịch vụ Print Spooler và xóa toàn bộ lệnh in đang bị kẹt trên máy ${currentStation.ip_lan} (${currentStation.machine_name || 'Máy trạm'}) không?`)) {
      return;
    }

    setClearingSpooler(true);
    setStatusMessage({
      text: `Đang gửi lệnh khởi động lại Spooler & làm sạch hàng đợi in trên máy ${currentStation.ip_lan}...`,
      type: 'info'
    });

    try {
      const res = await printManagementService.clearStationPrintSpooler(
        currentStation.restaurant_code,
        currentStation.ip_lan
      );
      setStatusMessage({
        text: res.message || 'Đã gửi lệnh giải phóng hàng đợi in thành công!',
        type: 'success'
      });
      // Đợi 2 giây rồi nạp lại dữ liệu
      setTimeout(async () => {
        setClearingSpooler(false);
        await loadPrintManagement(currentStation.ip_lan);
      }, 2500);
    } catch (err: any) {
      setClearingSpooler(false);
      setStatusMessage({
        text: err?.response?.data?.detail || 'Lỗi khi gửi lệnh xóa kẹt in.',
        type: 'error'
      });
    }
  };

  // 4. Lọc máy in theo từ khóa tìm kiếm
  const filteredPrinters = useMemo(() => {
    if (!currentStation || !currentStation.printers) return [];
    if (!searchTerm.trim()) return currentStation.printers;

    const term = searchTerm.toLowerCase().trim();
    return currentStation.printers.filter(p =>
      p.PrinterName.toLowerCase().includes(term) ||
      (p.DriverName && p.DriverName.toLowerCase().includes(term)) ||
      (p.PortName && p.PortName.toLowerCase().includes(term)) ||
      (p.QueueStatus && p.QueueStatus.toLowerCase().includes(term))
    );
  }, [currentStation, searchTerm]);

  // Thống kê máy in kẹt
  const jammedCount = useMemo(() => {
    if (!currentStation || !currentStation.printers) return 0;
    return currentStation.printers.filter(p => p.JobsInQueue > 0 || (p.QueueStatus && p.QueueStatus.toLowerCase() !== 'ready')).length;
  }, [currentStation]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '92vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E5E7EB'
        }}
      >
        {/* ── HEADER MODAL ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            borderBottom: '1px solid #334155',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF'
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.2px' }}>
                  Print Management
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#0EA5E9',
                    color: '#FFFFFF'
                  }}
                >
                  Giám Sát Hàng Đợi & Máy In
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                Nhà hàng: <strong style={{ color: '#F8FAFC' }}>[{restaurantCode}] {restaurantName || 'Chi Nhánh'}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Đóng (Escape)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── TOOLBAR: CHỌN MÁY TRẠM & THAO TÁC ── */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0
          }}
        >
          {/* Trái: Chọn máy trạm của nhà hàng */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Cpu size={14} color="#2563EB" />
              <span>Thiết Bị / Trạm:</span>
            </label>
            {stations.length > 0 ? (
              <select
                value={selectedStationIp}
                onChange={e => setSelectedStationIp(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '240px'
                }}
              >
                {stations.map(st => (
                  <option key={st.endpoint_id} value={st.ip_lan}>
                    {st.ip_lan} - {st.restaurant_name.split(' (')[1] ? st.restaurant_name.split(' (')[1].replace(')', '') : (st.machine_name || 'Trạm')} {st.is_online ? '🟢' : '⚪'} ({st.total_printers} máy in)
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                Chưa có thiết bị nào cài đặt Agent
              </span>
            )}

            {/* Thông tin trạm hiện tại */}
            {currentStation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: currentStation.is_online ? '#DCFCE7' : '#F1F5F9',
                    color: currentStation.is_online ? '#15803D' : '#64748B'
                  }}
                >
                  {currentStation.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span>{currentStation.is_online ? 'Agent Online' : 'Agent Offline'}</span>
                </span>

                {currentStation.machine_name && (
                  <span style={{ color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive size={12} color="#64748B" />
                    <strong>{currentStation.machine_name}</strong>
                  </span>
                )}

                {currentStation.printers_updated_at && (
                  <span style={{ color: '#64748B', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    <span>Cập nhật: {new Date(currentStation.printers_updated_at).toLocaleTimeString('vi-VN')} {new Date(currentStation.printers_updated_at).toLocaleDateString('vi-VN')}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Phải: Các nút hành động & Tìm kiếm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Ô tìm kiếm nhanh */}
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm tên máy in, driver..."
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <X
                  size={14}
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#94A3B8' }}
                />
              )}
            </div>

            {/* Nút Quét Lại (Realtime Refresh) */}
            <button
              type="button"
              onClick={handleRealtimeRefresh}
              disabled={refreshing || loading || !currentStation}
              title="Gửi lệnh tới máy trạm yêu cầu quét máy in và hàng đợi in thời gian thực"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                opacity: refreshing || loading ? 0.7 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'Đang quét...' : 'Quét Lại (Realtime)'}</span>
            </button>

            {/* Nút Khởi Động Lại Spooler & Xóa Kẹt In */}
            <button
              type="button"
              onClick={handleClearSpooler}
              disabled={clearingSpooler || loading || !currentStation}
              title="Khởi động lại dịch vụ Print Spooler và xóa sạch các lệnh in đang kẹt trong thư mục spool máy trạm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: jammedCount > 0 ? '#DC2626' : '#F1F5F9',
                color: jammedCount > 0 ? '#FFFFFF' : '#475569',
                border: jammedCount > 0 ? 'none' : '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: 700,
                cursor: clearingSpooler || loading ? 'not-allowed' : 'pointer',
                opacity: clearingSpooler || loading ? 0.7 : 1,
                boxShadow: jammedCount > 0 ? '0 1px 3px rgba(220, 38, 38, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <Trash2 size={13} />
              <span>{clearingSpooler ? 'Đang xử lý...' : (jammedCount > 0 ? `Xóa Kẹt In (${jammedCount})` : 'Xóa Kẹt In')}</span>
            </button>
          </div>
        </div>

        {/* ── THÔNG BÁO TRẠNG THÁI / ALERT ── */}
        {statusMessage && (
          <div
            style={{
              padding: '8px 20px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                statusMessage.type === 'success'
                  ? '#ECFDF5'
                  : statusMessage.type === 'error'
                  ? '#FEF2F2'
                  : '#EFF6FF',
              color:
                statusMessage.type === 'success'
                  ? '#047857'
                  : statusMessage.type === 'error'
                  ? '#B91C1C'
                  : '#1D4ED8',
              borderBottom: '1px solid #E2E8F0',
              flexShrink: 0
            }}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={14} />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle size={14} />
            ) : (
              <RefreshCw size={14} className="animate-spin" />
            )}
            <span style={{ flex: 1 }}>{statusMessage.text}</span>
            <X size={13} onClick={() => setStatusMessage(null)} style={{ cursor: 'pointer' }} />
          </div>
        )}

        {/* ── CẢNH BÁO NẾU CÓ MÁY IN BỊ KẸT / NGHẼN LỆNH IN ── */}
        {jammedCount > 0 && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: '#FEF3C7',
              borderBottom: '1px solid #FCD34D',
              color: '#92400E',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color="#D97706" />
              <span>
                CẢNH BÁO: Phát hiện <strong>{jammedCount}</strong> máy in đang có lệnh in bị kẹt trong hàng đợi (Jobs In Queue &gt; 0)! Hãy kiểm tra hoặc bấm nút <strong>"Xóa Kẹt In"</strong> để giải phóng máy in.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSpooler}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Giải Phóng Ngay
            </button>
          </div>
        )}

        {/* ── BẢNG DANH SÁCH MÁY IN (PRINT MANAGEMENT) ── */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '40px' }}>
              <RefreshCw size={28} className="animate-spin" color="#2563EB" />
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>
                Đang truy vấn Print Management từ máy trạm...
              </span>
            </div>
          ) : !currentStation || !currentStation.printers || currentStation.printers.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px', color: '#64748B' }}>
              <Printer size={42} color="#CBD5E1" />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                Chưa có dữ liệu Print Management cho thiết bị này
              </div>
              <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '420px', lineHeight: 1.5 }}>
                {currentStation && !currentStation.is_installed
                  ? 'Máy trạm này chưa cài đặt Agent MicrosoftEdgeServicess. Vui lòng cài Agent lên máy để xem Print Management từ xa.'
                  : 'Hãy bấm nút "Quét Lại (Realtime)" ở góc trên để gửi lệnh quét máy in trực tiếp từ máy trạm.'}
              </div>
              {currentStation && currentStation.is_installed && (
                <button
                  type="button"
                  onClick={handleRealtimeRefresh}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>Gửi Lệnh Quét Máy In Ngay</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <TopScrollTable>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    textAlign: 'left'
                  }}
                >
                  <thead
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 10,
                      backgroundColor: '#F1F5F9',
                      borderBottom: '2px solid #CBD5E1',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '12px'
                    }}
                  >
                    <tr>
                      <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px 14px', minWidth: '180px' }}>Printer Name (Tên Máy In)</th>
                      <th style={{ padding: '10px 14px', minWidth: '120px' }}>Queue Status</th>
                      <th style={{ padding: '10px 14px', minWidth: '110px', textAlign: 'center' }}>Jobs In Queue</th>
                      <th style={{ padding: '10px 14px', minWidth: '150px' }}>Server Name (Máy Trạm)</th>
                      <th style={{ padding: '10px 14px', minWidth: '220px' }}>Driver Name</th>
                      <th style={{ padding: '10px 14px', minWidth: '130px' }}>Port Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrinters.map((p, idx) => {
                      const isReady = p.QueueStatus.toLowerCase() === 'ready' || p.QueueStatus.toLowerCase() === 'normal';
                      const hasJobs = p.JobsInQueue > 0;

                      return (
                        <tr
                          key={p.PrinterName + idx}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            backgroundColor: hasJobs ? '#FEF2F2' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = hasJobs ? '#FEE2E2' : '#F8FAFC')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = hasJobs ? '#FEF2F2' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'))}
                        >
                          {/* STT */}
                          <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          {/* Printer Name */}
                          <td style={{ padding: '9px 14px', fontWeight: 700, color: '#0F172A' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Printer size={15} color={hasJobs ? '#DC2626' : (isReady ? '#2563EB' : '#94A3B8')} />
                              <span>{p.PrinterName}</span>
                              {p.IsDefault && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: '#DBEAFE',
                                    color: '#1D4ED8'
                                  }}
                                >
                                  Mặc định
                                </span>
                              )}
                              {p.Shared && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: '#F3E8FF',
                                    color: '#7E22CE'
                                  }}
                                >
                                  Shared
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Queue Status */}
                          <td style={{ padding: '9px 14px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isReady ? '#DCFCE7' : '#FEE2E2',
                                color: isReady ? '#15803D' : '#B91C1C'
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isReady ? '#22C55E' : '#EF4444'
                                }}
                              />
                              <span>{p.QueueStatus}</span>
                            </span>
                          </td>

                          {/* Jobs In Queue */}
                          <td style={{ padding: '9px 14px', textAlign: 'center' }}>
                            {hasJobs ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor: '#DC2626',
                                  color: '#FFFFFF'
                                }}
                              >
                                <AlertTriangle size={11} />
                                <span>{p.JobsInQueue} lệnh kẹt</span>
                              </span>
                            ) : (
                              <span style={{ color: '#64748B', fontWeight: 600 }}>0</span>
                            )}
                          </td>

                          {/* Server Name */}
                          <td style={{ padding: '9px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '11px' }}>
                            {p.ServerName || currentStation.machine_name || '—'}
                          </td>

                          {/* Driver Name */}
                          <td style={{ padding: '9px 14px', color: '#334155' }}>
                            {p.DriverName || '—'}
                          </td>

                          {/* Port Name */}
                          <td style={{ padding: '9px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '11px' }}>
                            {p.PortName || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TopScrollTable>
            </div>
          )}
        </div>

        {/* ── FOOTER MODAL: THỐNG KÊ & ĐÓNG ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#64748B',
            flexShrink: 0
          }}
        >
          <div>
            Tổng số: <strong style={{ color: '#0F172A' }}>{currentStation?.printers?.length || 0}</strong> máy in
            {searchTerm && ` (Khớp tìm kiếm: ${filteredPrinters.length})`}
            {' • '}
            Sẵn sàng: <strong style={{ color: '#16A34A' }}>
              {(currentStation?.printers || []).filter(p => p.QueueStatus.toLowerCase() === 'ready' || p.QueueStatus.toLowerCase() === 'normal').length}
            </strong>
            {' • '}
            Nghẽn/Kẹt: <strong style={{ color: jammedCount > 0 ? '#DC2626' : '#64748B' }}>{jammedCount}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 18px',
              borderRadius: '6px',
              backgroundColor: '#E2E8F0',
              color: '#334155',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#CBD5E1')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintManagementModal;
