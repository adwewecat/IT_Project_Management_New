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
  inline?: boolean;
}

export const PrintManagementModal: React.FC<PrintManagementModalProps> = ({
  isOpen,
  onClose,
  restaurantCode,
  restaurantName,
  defaultIpLan,
  inline = false,
}) => {
  // Đăng ký Modal Stack LIFO theo quy chuẩn dự án (Escape đóng modal trên cùng)
  useModalStack(isOpen && !inline, onClose);

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [clearingSpooler, setClearingSpooler] = useState<boolean>(false);
  const [stations, setStations] = useState<PrintStationInfo[]>([]);
  const [selectedStationIp, setSelectedStationIp] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 1. Tải thông tin Print Management từ Backend (Tự động quét trực tiếp máy đang kết nối MongoDB không cần Agent)
  const loadPrintManagement = useCallback(async (preferredIp?: string) => {
    const targetIp = (preferredIp || defaultIpLan || '').trim();
    if (!restaurantCode && !targetIp) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await printManagementService.getPrintManagement(restaurantCode || '', targetIp || undefined);
      setStations(data.stations || []);

      if (data.stations && data.stations.length > 0) {
        if (preferredIp && data.stations.some(s => s.ip_lan === preferredIp)) {
          setSelectedStationIp(preferredIp);
        } else if (targetIp && data.stations.some(s => s.ip_lan === targetIp)) {
          setSelectedStationIp(targetIp);
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

  // Gọi khi mở modal hoặc khi đổi máy kết nối MongoDB (defaultIpLan)
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

  // Khi người dùng đổi trạm trên dropdown, nếu trạm đó chưa có dữ liệu máy in thì tự động quét trực tiếp
  const handleStationChange = async (newIp: string) => {
    setSelectedStationIp(newIp);
    const targetSt = stations.find(s => s.ip_lan === newIp);
    if (!targetSt || targetSt.total_printers === 0) {
      await loadPrintManagement(newIp);
    }
  };

  // 2. Xử lý quét thời gian thực (Realtime Refresh) từ máy đang chọn (Ưu tiên Agent-less trực tiếp)
  const handleRealtimeRefresh = async () => {
    const targetIp = currentStation?.ip_lan || defaultIpLan || '';
    if (!targetIp) return;

    setRefreshing(true);
    setStatusMessage({
      text: `Đang quét trực tiếp danh sách máy in & hàng đợi in trên máy ${targetIp}...`,
      type: 'info'
    });

    try {
      const res = await printManagementService.refreshStationPrinters(
        currentStation?.restaurant_code || restaurantCode || '',
        targetIp
      );

      // Nếu quét trực tiếp Agent-less trả kết quả ngay lập tức
      if (res.immediate) {
        setRefreshing(false);
        await loadPrintManagement(targetIp);
        setStatusMessage({
          text: res.message || `Đã cập nhật trực tiếp danh sách máy in từ máy ${targetIp} thành công!`,
          type: 'success'
        });
        return;
      }

      const taskId = res.task_id;
      if (taskId) {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const taskInfo = await printManagementService.getTaskStatus(taskId);
            if (taskInfo && taskInfo.result_status === 'SUCCESS') {
              clearInterval(interval);
              setRefreshing(false);
              await loadPrintManagement(targetIp);
              setStatusMessage({
                text: 'Đã nhận dữ liệu máy in mới nhất từ máy trạm thành công!',
                type: 'success'
              });
            } else if (taskInfo && taskInfo.result_status === 'FAILED') {
              clearInterval(interval);
              setRefreshing(false);
              setStatusMessage({
                text: `Máy trạm báo lỗi: ${taskInfo.result_message || 'Thất bại'}`,
                type: 'error'
              });
            } else if (attempts >= 8) {
              clearInterval(interval);
              setRefreshing(false);
              await loadPrintManagement(targetIp);
              setStatusMessage({
                text: 'Đã làm mới dữ liệu máy in từ máy trạm.',
                type: 'info'
              });
            }
          } catch {
            if (attempts >= 5) {
              clearInterval(interval);
              setRefreshing(false);
              await loadPrintManagement(targetIp);
            }
          }
        }, 1500);
      } else {
        setRefreshing(false);
        await loadPrintManagement(targetIp);
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
    if (!window.confirm(`Bạn có chắc chắn muốn khởi động lại dịch vụ Print Spooler và xóa toàn bộ lệnh in đang bị kẹt trên máy ${currentStation.ip_lan} (${currentStation.machine_name || 'Máy chủ'}) không?`)) {
      return;
    }

    setClearingSpooler(true);
    setStatusMessage({
      text: `Đang khởi động lại Print Spooler & làm sạch hàng đợi in trên máy ${currentStation.ip_lan}...`,
      type: 'info'
    });

    try {
      const res = await printManagementService.clearStationPrintSpooler(
        currentStation.restaurant_code || restaurantCode || '',
        currentStation.ip_lan
      );

      if (res.immediate) {
        setClearingSpooler(false);
        await loadPrintManagement(currentStation.ip_lan);
        setStatusMessage({
          text: res.message || 'Đã giải phóng hàng đợi in trực tiếp thành công!',
          type: 'success'
        });
        return;
      }

      setStatusMessage({
        text: res.message || 'Đã gửi lệnh giải phóng hàng đợi in thành công!',
        type: 'success'
      });
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

  // Kiểm tra trạng thái máy in có sẵn sàng không
  const isPrinterReady = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s === 'ready' || s === 'normal' || s.startsWith('ready ');
  };

  // Thống kê máy in kẹt / lỗi
  const jammedCount = useMemo(() => {
    if (!currentStation || !currentStation.printers) return 0;
    return currentStation.printers.filter(p => p.JobsInQueue > 0 || !isPrinterReady(p.QueueStatus)).length;
  }, [currentStation]);

  if (!isOpen) return null;

  const isAgentlessDirect = Boolean(currentStation?.service_status?.startsWith('AGENTLESS'));

  return (
    <div
      style={inline ? { width: '100%' } : {
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
          maxWidth: inline ? '100%' : '1100px',
          maxHeight: inline ? 'none' : '92vh',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: inline ? 'var(--shadow-sm)' : 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* ── HEADER MODAL ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderBottom: '1px solid var(--border-color)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary-text)'
              }}
            >
              <Printer size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.2px', color: 'var(--text-primary)' }}>
                  Giám Sát Máy In
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-primary-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--color-primary)'
                  }}
                >
                  Hàng Đợi &amp; Máy In KDS/POS
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Nhà hàng: <strong style={{ color: 'var(--text-primary)' }}>{restaurantCode ? `[${restaurantCode}] ` : ''}{restaurantName || 'Chi Nhánh'}</strong>
                {defaultIpLan && (
                  <span>
                    {' • '}Máy đang trỏ MongoDB: <strong style={{ color: 'var(--text-primary)' }}>{defaultIpLan}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {!inline && (
            <button
              type="button"
              onClick={onClose}
              title="Đóng (Escape)"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* ── TOOLBAR: CHỌN MÁY TRẠM & THAO TÁC ── */}
        <div
          style={{
            padding: '12px 20px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
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
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Cpu size={14} style={{ color: 'var(--text-primary)' }} />
              <span>Máy Chủ / Trạm:</span>
            </label>
            {stations.length > 0 ? (
              <select
                value={selectedStationIp}
                onChange={e => handleStationChange(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: '240px'
                }}
              >
                {stations.map(st => (
                  <option key={`${st.endpoint_id}_${st.ip_lan}`} value={st.ip_lan}>
                    {st.ip_lan} — {st.machine_name || 'Máy chủ'} ({st.total_printers} máy in)
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                {defaultIpLan ? `Máy đích: ${defaultIpLan}` : 'Chưa tìm thấy trạm kết nối'}
              </span>
            )}

            {/* Thông tin trạm hiện tại */}
            {currentStation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: currentStation.is_online ? 'var(--color-success-bg)' : 'var(--bg-hover)',
                    color: currentStation.is_online ? 'var(--color-success)' : 'var(--text-secondary)',
                    border: `1px solid ${currentStation.is_online ? 'var(--color-success)' : 'var(--border-color)'}`
                  }}
                >
                  {currentStation.is_online ? <Wifi size={12} /> : <WifiOff size={12} />}
                  <span>
                    {isAgentlessDirect
                      ? 'Trực tiếp (Không cần Agent)'
                      : (currentStation.is_online ? 'Agent Online' : 'Chưa kết nối')}
                  </span>
                </span>

                {currentStation.machine_name && (
                  <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <HardDrive size={12} style={{ color: 'var(--text-muted)' }} />
                    <strong style={{ color: 'var(--text-primary)' }}>{currentStation.machine_name}</strong>
                  </span>
                )}

                {currentStation.printers_updated_at && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm tên máy in, quầy KDS, driver..."
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchTerm && (
                <X
                  size={14}
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                />
              )}
            </div>

            {/* Nút Quét Lại (Realtime Refresh) */}
            <button
              type="button"
              onClick={handleRealtimeRefresh}
              disabled={refreshing || loading || (!currentStation && !defaultIpLan)}
              title="Quét trực tiếp danh sách máy in & hàng đợi in từ máy chủ MongoDB đang kết nối"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-primary-text)',
                border: '1px solid var(--color-primary)',
                fontSize: '12px',
                fontWeight: 800,
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
              title="Khởi động lại dịch vụ Print Spooler và xóa sạch các lệnh in đang kẹt trong thư mục spool"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: jammedCount > 0 ? 'var(--color-danger)' : 'var(--bg-card)',
                color: jammedCount > 0 ? 'var(--text-inverse)' : 'var(--text-primary)',
                border: `1px solid ${jammedCount > 0 ? 'var(--color-danger)' : 'var(--border-color)'}`,
                fontSize: '12px',
                fontWeight: 700,
                cursor: clearingSpooler || loading ? 'not-allowed' : 'pointer',
                opacity: clearingSpooler || loading ? 0.7 : 1,
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
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor:
                statusMessage.type === 'success'
                  ? 'var(--color-success-bg)'
                  : statusMessage.type === 'error'
                  ? 'var(--color-danger-bg)'
                  : 'var(--color-primary-subtle)',
              color:
                statusMessage.type === 'success'
                  ? 'var(--color-success)'
                  : statusMessage.type === 'error'
                  ? 'var(--color-danger)'
                  : 'var(--text-primary)',
              borderBottom: '1px solid var(--border-color)',
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
              backgroundColor: 'var(--color-danger-bg)',
              borderBottom: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>
                CẢNH BÁO: Phát hiện <strong>{jammedCount}</strong> máy in đang có lệnh in chờ/kẹt hoặc trạng thái bất thường! Hãy kiểm tra hoặc bấm nút <strong>"Xóa Kẹt In"</strong> để giải phóng Spooler.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSpooler}
              style={{
                backgroundColor: 'var(--color-danger)',
                color: 'var(--text-inverse)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
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
              <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                Đang quét trực tiếp danh sách máy in từ máy chủ MongoDB ({defaultIpLan || selectedStationIp})...
              </span>
            </div>
          ) : !currentStation || !currentStation.printers || currentStation.printers.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px', color: 'var(--text-secondary)' }}>
              <Printer size={42} style={{ color: 'var(--text-muted)' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Chưa tìm thấy dữ liệu máy in trên thiết bị này
              </div>
              <div style={{ fontSize: '12px', textAlign: 'center', maxWidth: '460px', lineHeight: 1.5 }}>
                Hãy bấm nút <strong>"Quét Lại (Realtime)"</strong> để hệ thống truy vấn trực tiếp danh sách máy in từ Windows Print Spooler và cấu hình MongoDB KDS trên máy đang kết nối ({currentStation?.ip_lan || defaultIpLan || 'Máy chủ'}).
              </div>
              <button
                type="button"
                onClick={handleRealtimeRefresh}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-text)',
                  border: '1px solid var(--color-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} />
                <span>Quét Trực Tiếp Máy In Ngay</span>
              </button>
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
                      backgroundColor: 'var(--bg-secondary)',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontWeight: 800,
                      fontSize: '12px'
                    }}
                  >
                    <tr>
                      <th style={{ padding: '10px 12px', width: '40px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px 14px', minWidth: '180px' }}>Printer Name (Tên Máy In)</th>
                      <th style={{ padding: '10px 14px', minWidth: '120px' }}>Queue Status</th>
                      <th style={{ padding: '10px 14px', minWidth: '110px', textAlign: 'center' }}>Jobs In Queue</th>
                      <th style={{ padding: '10px 14px', minWidth: '150px' }}>Server Name (Máy Chủ)</th>
                      <th style={{ padding: '10px 14px', minWidth: '240px' }}>Driver Name / Quầy KDS</th>
                      <th style={{ padding: '10px 14px', minWidth: '130px' }}>Port Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrinters.map((p, idx) => {
                      const isReady = isPrinterReady(p.QueueStatus);
                      const hasJobs = p.JobsInQueue > 0;
                      const isKdsPrinter = Boolean(p.DriverName && (p.DriverName.includes('[KDS:') || p.DriverName.includes('KDS Quầy:')));

                      return (
                        <tr
                          key={p.PrinterName + idx}
                          style={{
                            borderBottom: '1px solid var(--border-light)',
                            backgroundColor: hasJobs ? 'var(--color-danger-bg)' : 'var(--bg-card)',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = hasJobs ? 'var(--color-danger-bg)' : 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = hasJobs ? 'var(--color-danger-bg)' : 'var(--bg-card)')}
                        >
                          {/* STT */}
                          <td style={{ padding: '9px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {idx + 1}
                          </td>

                          {/* Printer Name */}
                          <td style={{ padding: '9px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <Printer size={15} style={{ color: hasJobs ? 'var(--color-danger)' : (isReady ? 'var(--text-primary)' : 'var(--text-muted)') }} />
                              <span>{p.PrinterName}</span>
                              {isKdsPrinter && (
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--color-primary-subtle)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--color-primary)'
                                  }}
                                >
                                  KDS
                                </span>
                              )}
                              {p.IsDefault && (
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)'
                                  }}
                                >
                                  Mặc định
                                </span>
                              )}
                              {p.Shared && (
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)'
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
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: isReady ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                                color: isReady ? 'var(--color-success)' : 'var(--color-danger)'
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isReady ? 'var(--color-success)' : 'var(--color-danger)'
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
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor: 'var(--color-danger)',
                                  color: 'var(--text-inverse)'
                                }}
                              >
                                <AlertTriangle size={11} />
                                <span>{p.JobsInQueue} lệnh kẹt</span>
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>0</span>
                            )}
                          </td>

                          {/* Server Name */}
                          <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px' }}>
                            {p.ServerName || currentStation.machine_name || '—'}
                          </td>

                          {/* Driver Name */}
                          <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: isKdsPrinter ? 700 : 400 }}>
                            {p.DriverName || '—'}
                          </td>

                          {/* Port Name */}
                          <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '11px' }}>
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
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            flexShrink: 0
          }}
        >
          <div>
            Tổng số: <strong style={{ color: 'var(--text-primary)' }}>{currentStation?.printers?.length || 0}</strong> máy in
            {searchTerm && ` (Khớp tìm kiếm: ${filteredPrinters.length})`}
            {' • '}
            Sẵn sàng: <strong style={{ color: 'var(--color-success)' }}>
              {(currentStation?.printers || []).filter(p => isPrinterReady(p.QueueStatus)).length}
            </strong>
            {' • '}
            Nghẽn/Cảnh báo: <strong style={{ color: jammedCount > 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>{jammedCount}</strong>
          </div>

          {!inline && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 18px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
            >
              Đóng
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrintManagementModal;
