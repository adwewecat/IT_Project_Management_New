import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, RefreshCw, Search, Smartphone, Tablet, Monitor, 
  CheckCircle2, XCircle, AlertTriangle, Battery, BatteryCharging,
  Wifi, Filter, ArrowDownWideNarrow, Layers
} from 'lucide-react';
import { 
  mongoService, 
  CoSoKdsDeviceItem, 
  CoSoKdsDeviceFleetResponse 
} from '../../services/mongoService';

interface CoSoKdsDeviceFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  ipSubnet: string;
  mongoHost: string;
  mongoPort: number;
  restaurantId?: number;
  inline?: boolean;
}

export const CoSoKdsDeviceFleetModal: React.FC<CoSoKdsDeviceFleetModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  ipSubnet,
  mongoHost,
  mongoPort,
  restaurantId,
  inline = false
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<CoSoKdsDeviceFleetResponse | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL'); // 'ALL' | 'CO' | 'SO' | 'KDS'
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // 'ALL' | 'ONLINE' | 'OUTDATED' | 'OFFLINE'
  const [sortBy, setSortBy] = useState<'ORDER_TIME_DESC' | 'TABLE_ASC' | 'VERSION_ASC'>('ORDER_TIME_DESC');

  const loadDeviceFleet = useCallback(async () => {
    if (!mongoHost) return;
    setLoading(true);
    try {
      const res = await mongoService.getCoSoKdsDeviceFleet({
        host: mongoHost,
        port: mongoPort,
        restaurant_id: restaurantId
      });
      setData(res);
    } catch (err: unknown) {
      console.error('Error fetching device fleet:', err);
    } finally {
      setLoading(false);
    }
  }, [mongoHost, mongoPort, restaurantId]);

  useEffect(() => {
    if (isOpen) {
      loadDeviceFleet();
    }
  }, [isOpen, loadDeviceFleet]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredAndSortedDevices = useMemo(() => {
    if (!data || !data.devices) return [];
    const list = data.devices.filter((device: CoSoKdsDeviceItem) => {
      if (filterType !== 'ALL' && device.device_type !== filterType) return false;
      if (filterStatus === 'ONLINE' && !device.is_online) return false;
      if (filterStatus === 'OFFLINE' && device.is_online) return false;
      if (filterStatus === 'OUTDATED' && !device.is_outdated) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchName = device.device_name?.toLowerCase().includes(q);
        const matchModel = device.device_model?.toLowerCase().includes(q);
        const matchUid = device.unique_device_id?.toLowerCase().includes(q);
        const matchTable = device.table_code?.toLowerCase().includes(q);
        const matchIp = device.ip_address?.toLowerCase().includes(q);
        const matchVersion = device.app_version?.toLowerCase().includes(q);
        if (!matchName && !matchModel && !matchUid && !matchTable && !matchIp && !matchVersion) return false;
      }
      return true;
    });

    // Sắp xếp
    list.sort((a, b) => {
      if (sortBy === 'ORDER_TIME_DESC') {
        const timeA = a.last_order_time || '00:00:00';
        const timeB = b.last_order_time || '00:00:00';
        return timeB.localeCompare(timeA); // Muộn nhất lên trước
      }
      if (sortBy === 'TABLE_ASC') {
        const tA = a.table_code || a.device_name || '';
        const tB = b.table_code || b.device_name || '';
        return tA.localeCompare(tB);
      }
      return a.app_version.localeCompare(b.app_version);
    });

    return list;
  }, [data, filterType, filterStatus, searchKeyword, sortBy]);

  if (!isOpen) return null;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'CO':
        return <Tablet size={16} color="#2563EB" />;
      case 'SO':
        return <Smartphone size={16} color="#7C3AED" />;
      case 'KDS':
        return <Monitor size={16} color="#16A34A" />;
      default:
        return <Smartphone size={16} color="#64748B" />;
    }
  };

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
        maxWidth: inline ? '100%' : 1300,
        height: inline ? 'auto' : '92vh',
        minHeight: inline ? 420 : undefined,
        borderRadius: 'var(--radius-lg)',
        boxShadow: inline ? 'var(--shadow-sm)' : 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-color)'
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
              <Wifi size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                QUẢN LÝ TABLET NHÀ HÀNG
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--color-success-bg)', color: 'var(--color-success-text)', fontWeight: 700 }}>
                  Đã Gom Phiên &amp; Sắp Xếp Order Mới Nhất
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Nhà hàng: <strong>{restaurantName}</strong> ({ipSubnet}) {data?.message ? `— ${data.message}` : '— Nhận diện thiết bị duy nhất: CO, SO, KDS'}
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

        {/* Filters and Controls */}
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 9 }} />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo model, ID máy, bàn, IP..."
                style={{
                  width: 240,
                  padding: '5px 10px 5px 30px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12.5
                }}
              />
            </div>

            {/* Filter by Device Type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={13} color="#64748B" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                <option value="ALL">Tất cả thiết bị ({data?.total_devices || 0})</option>
                <option value="CO">Tablet CO ({data?.total_co || 0})</option>
                <option value="SO">Staff SO ({data?.total_so || 0})</option>
                <option value="KDS">Màn Hình KDS ({data?.total_kds || 0})</option>
              </select>
            </div>

            {/* Filter by Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '5px 8px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ONLINE">🟢 Đang Online</option>
              <option value="OFFLINE">🔴 Offline / Mất kết nối</option>
              <option value="OUTDATED">⚠️ Bản App Cũ Cần Cập Nhật</option>
            </select>

            {/* Sort by Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowDownWideNarrow size={13} color="#2563EB" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: '1px solid #93C5FD',
                  background: '#EFF6FF',
                  color: '#1E40AF',
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                <option value="ORDER_TIME_DESC">⏱️ Giờ Order Mới Nhất (Muộn nhất lên trước)</option>
                <option value="TABLE_ASC">🍽️ Sắp xếp theo Tên Bàn</option>
                <option value="VERSION_ASC">📱 Sắp xếp theo Phiên Bản App</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {data?.outdated_count ? (
              <span style={{
                padding: '3px 8px',
                borderRadius: 5,
                background: '#FEF3C7',
                color: '#B45309',
                fontSize: 11.5,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}>
                <AlertTriangle size={13} /> {data.outdated_count} máy chạy app cũ
              </span>
            ) : null}

            <button
              onClick={loadDeviceFleet}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#F5B800',
                color: '#000',
                fontWeight: 700,
                fontSize: 12,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Đang Quét...' : 'Làm Mới'}
            </button>
          </div>
        </div>

        {/* Table View */}
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
              <div style={{ fontSize: 14, fontWeight: 600 }}>Đang nhận diện thiết bị duy nhất &amp; đối soát phiên...</div>
            </div>
          ) : filteredAndSortedDevices.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748B' }}>
              <Search size={32} color="#CBD5E1" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Không tìm thấy thiết bị nào khớp bộ lọc</div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 35 }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 90 }}>Loại Máy</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 75 }}>Bàn Ăn</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#1E40AF', width: 120, background: '#EFF6FF' }}>
                      ⏱️ Giờ Order Mới Nhất
                    </th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Model Thiết Bị (Phần Cứng)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 130 }}>ID Thiết Bị Duy Nhất</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 105 }}>Địa Chỉ IP</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 110 }}>Phiên Bản App</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 85 }}>Pin / Nguồn</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 95 }}>Tín Hiệu</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Ghi Chú &amp; Phiên Đã Gom</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedDevices.map((device, idx) => (
                    <tr
                      key={device.id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: !device.is_online ? '#FEF2F2' : device.is_outdated ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                      }}
                    >
                      <td style={{ padding: '8px 12px', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0F172A' }}>
                          {getDeviceIcon(device.device_type)}
                          <span style={{ fontSize: 11.5 }}>
                            {device.device_type === 'CO' ? 'Tablet CO' : device.device_type === 'SO' ? 'Staff SO' : 'KDS Bếp'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 800, color: '#1E293B' }}>
                        {device.table_code ? `Bàn ${device.table_code}` : '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', background: '#F8FAFC' }}>
                        <strong style={{ color: '#1D4ED8', fontFamily: 'monospace', fontSize: 12 }}>
                          {device.last_order_time || '—'}
                        </strong>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>
                          {device.device_model || device.device_name}
                        </div>
                        {device.line_cook && (
                          <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>{device.line_cook}</div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#334155' }}>
                        {device.unique_device_id || device.id}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#475569' }}>
                        {device.ip_address || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 4,
                            fontSize: 10.5,
                            fontWeight: 700,
                            background: device.is_outdated ? '#FEE2E2' : '#DCFCE7',
                            color: device.is_outdated ? '#B91C1C' : '#15803D',
                            fontFamily: 'monospace'
                          }}>
                            {device.app_version}
                          </span>
                          {device.is_outdated && (
                            <span title={`Khuyên dùng bản mới nhất: ${device.latest_version}`} style={{ color: '#DC2626' }}>
                              <AlertTriangle size={12} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {device.battery_level !== undefined && device.battery_level !== null ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: device.battery_level < 20 ? '#DC2626' : '#334155' }}>
                            {device.battery_level >= 95 ? <BatteryCharging size={13} color="#16A34A" /> : <Battery size={13} />}
                            <span>{device.battery_level}%</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: 11 }}>Nguồn AC</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {device.is_online ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                            <CheckCircle2 size={12} /> Online
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                            <XCircle size={12} /> Offline
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#64748B', fontSize: 11 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{device.note || '—'}</span>
                          {device.session_count && device.session_count > 1 ? (
                            <span style={{
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: '#F1F5F9',
                              color: '#475569',
                              fontSize: 10,
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}>
                              <Layers size={10} /> Đã gộp {device.session_count} phiên
                            </span>
                          ) : null}
                        </div>
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
            Thiết bị duy nhất: <strong>{filteredAndSortedDevices.length}</strong> máy (Online: {data?.online_count || 0}, Bản cũ: {data?.outdated_count || 0}) — <em>Sắp xếp: Bàn mở/order mới nhất luôn ở đầu</em>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Bản chuẩn: CO <strong>v1.6.91</strong> | SO <strong>v2.4.107</strong> | KDS <strong>v1.4.51</strong></span>
            {!inline && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
