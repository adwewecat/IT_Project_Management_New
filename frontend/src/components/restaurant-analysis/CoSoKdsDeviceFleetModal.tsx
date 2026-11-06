import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, RefreshCw, Search, Smartphone, Tablet, Monitor, 
  CheckCircle2, XCircle, AlertTriangle, Battery, BatteryCharging,
  Wifi, Filter
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
}

export const CoSoKdsDeviceFleetModal: React.FC<CoSoKdsDeviceFleetModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  ipSubnet,
  mongoHost,
  mongoPort,
  restaurantId
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<CoSoKdsDeviceFleetResponse | null>(null);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL'); // 'ALL' | 'CO' | 'SO' | 'KDS'
  const [filterStatus, setFilterStatus] = useState<string>('ALL'); // 'ALL' | 'ONLINE' | 'OUTDATED' | 'OFFLINE'

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

  const filteredDevices = useMemo(() => {
    if (!data || !data.devices) return [];
    return data.devices.filter((device: CoSoKdsDeviceItem) => {
      if (filterType !== 'ALL' && device.device_type !== filterType) return false;
      if (filterStatus === 'ONLINE' && !device.is_online) return false;
      if (filterStatus === 'OFFLINE' && device.is_online) return false;
      if (filterStatus === 'OUTDATED' && !device.is_outdated) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchName = device.device_name?.toLowerCase().includes(q);
        const matchTable = device.table_code?.toLowerCase().includes(q);
        const matchIp = device.ip_address?.toLowerCase().includes(q);
        const matchVersion = device.app_version?.toLowerCase().includes(q);
        if (!matchName && !matchTable && !matchIp && !matchVersion) return false;
      }
      return true;
    });
  }, [data, filterType, filterStatus, searchKeyword]);

  if (!isOpen) return null;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'CO':
        return <Tablet size={16} color="#2563EB" />;
      case 'SO':
        return <Smartphone size={16} color="#D97706" />;
      case 'KDS':
        return <Monitor size={16} color="#16A34A" />;
      default:
        return <Smartphone size={16} color="#64748B" />;
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
        maxWidth: 1200,
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
              <Wifi size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
                BẢN ĐỒ GIÁM SÁT SỨC KHỎE THIẾT BỊ TOÀN NHÀ HÀNG (DEVICE FLEET)
              </div>
              <div style={{ fontSize: 12, color: '#64748B' }}>
                Nhà hàng: <strong>{restaurantName}</strong> ({ipSubnet}) — Quét thiết bị: <strong>CO, SO, KDS</strong>
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

        {/* Filters and Controls */}
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
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo tên thiết bị, bàn, IP..."
                style={{
                  width: 220,
                  padding: '6px 10px 6px 30px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 13
                }}
              />
            </div>

            {/* Filter by Device Type */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Filter size={14} color="#64748B" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #CBD5E1',
                  fontSize: 12.5,
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
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid #CBD5E1',
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ONLINE">🟢 Đang Online</option>
              <option value="OFFLINE">🔴 Offline / Mất kết nối</option>
              <option value="OUTDATED">⚠️ Bản App Cũ Cần Cập Nhật</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {data?.outdated_count ? (
              <span style={{
                padding: '4px 10px',
                borderRadius: 6,
                background: '#FEF3C7',
                color: '#B45309',
                fontSize: 12,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <AlertTriangle size={14} /> Có {data.outdated_count} máy chạy app cũ
              </span>
            ) : null}

            <button
              onClick={loadDeviceFleet}
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
              {loading ? 'Đang Quét...' : 'Làm Mới Thiết Bị'}
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
              <div style={{ fontSize: 14, fontWeight: 600 }}>Đang quét tình trạng thiết bị toàn nhà hàng...</div>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#64748B' }}>
              <Search size={32} color="#CBD5E1" />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>Không tìm thấy thiết bị nào khớp bộ lọc</div>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 40 }}>#</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Loại Thiết Bị</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Tên Thiết Bị / Vị Trí</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 90 }}>Mã Bàn</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155', width: 120 }}>IP Thiết Bị</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 140 }}>Phiên Bản App</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 100 }}>Pin / Nguồn</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#334155', width: 110 }}>Tín Hiệu</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#334155' }}>Ghi Chú Nghiệp Vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((device, idx) => (
                    <tr
                      key={device.id || idx}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        background: !device.is_online ? '#FEF2F2' : device.is_outdated ? '#FFFBEB' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                      }}
                    >
                      <td style={{ padding: '10px 14px', color: '#64748B' }}>{idx + 1}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0F172A' }}>
                          {getDeviceIcon(device.device_type)}
                          <span>
                            {device.device_type === 'CO' ? 'Tablet CO' : device.device_type === 'SO' ? 'Staff SO' : 'KDS Bếp'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{device.device_name}</div>
                        {device.line_cook && (
                          <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>{device.line_cook}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1E293B' }}>
                        {device.table_code || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#475569' }}>
                        {device.ip_address || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background: device.is_outdated ? '#FEE2E2' : '#DCFCE7',
                            color: device.is_outdated ? '#B91C1C' : '#15803D',
                            fontFamily: 'monospace'
                          }}>
                            {device.app_version}
                          </span>
                          {device.is_outdated && (
                            <span title={`Khuyên dùng bản mới nhất: ${device.latest_version}`} style={{ color: '#DC2626' }}>
                              <AlertTriangle size={13} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {device.battery_level !== undefined && device.battery_level !== null ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: device.battery_level < 20 ? '#DC2626' : '#334155' }}>
                            {device.battery_level >= 95 ? <BatteryCharging size={14} color="#16A34A" /> : <Battery size={14} />}
                            <span>{device.battery_level}%</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>Nguồn AC</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {device.is_online ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                            <CheckCircle2 size={13} /> Online
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                            <XCircle size={13} /> Mất Kết Nối
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748B', fontSize: 11.5 }}>
                        {device.note || (device.last_seen ? `Thấy lúc ${device.last_seen}` : '—')}
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
            Hiển thị: <strong>{filteredDevices.length}</strong> / {data?.total_devices || 0} thiết bị (Online: {data?.online_count || 0}, Cũ: {data?.outdated_count || 0})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Bản chuẩn GGG: CO <strong>v1.6.91</strong> | SO <strong>v2.4.107</strong> | KDS <strong>v1.4.51</strong></span>
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
