import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Plus,
  Play,
  Settings,
  Trash2,
  Star,
  X
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { RestaurantItem } from '../../types/restaurant';
import { UserInfo } from '../../types/auth';
import {
  mongoService,
  MongoMachineStatus,
  MongoInspectPairResponse,
  MongoTransferExecuteResponse
} from '../../services/mongoService';

interface MongoDbTransferTaskProps {
  selectedRestaurant?: RestaurantItem | null;
  restaurants: RestaurantItem[];
  user: UserInfo | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  onRefresh?: () => void;
}

export const MongoDbTransferTask: React.FC<MongoDbTransferTaskProps> = ({
  selectedRestaurant,
  showToast
}) => {
  // Machine Scanning State
  const [scanning, setScanning] = useState<boolean>(false);
  const [machines, setMachines] = useState<MongoMachineStatus[]>([]);
  const [subnet, setSubnet] = useState<string>('');
  const [customIp, setCustomIp] = useState<string>('');
  const [extraIps, setExtraIps] = useState<string[]>([]);

  // Default IP Tails (Quét cho tất cả nhà hàng)
  const [defaultTails, setDefaultTails] = useState<string[]>(['11', '12', '41']);
  const [showDefaultTailsModal, setShowDefaultTailsModal] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);
  const [newDefaultTail, setNewDefaultTail] = useState<string>('');

  // Selection Pair State
  const [sourceIp, setSourceIp] = useState<string>('');
  const [destIp, setDestIp] = useState<string>('');

  // Inspection State
  const [inspecting, setInspecting] = useState<boolean>(false);
  const [inspectData, setInspectData] = useState<MongoInspectPairResponse | null>(null);

  // Transfer Options State
  const [cleanActionLog, setCleanActionLog] = useState<boolean>(true);
  const [cleanActionLogBk, setCleanActionLogBk] = useState<boolean>(true);
  const [cleanKitchenActionLog, setCleanKitchenActionLog] = useState<boolean>(true);
  const [dropDestExisting, setDropDestExisting] = useState<boolean>(true);
  const [selectedDbs, setSelectedDbs] = useState<string[]>(['G_ORDER', 'G_KITCHEN']);

  // Transfer Execution State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<MongoTransferExecuteResponse | null>(null);
  const [showDetailLogs, setShowDetailLogs] = useState<boolean>(false);

  // Tải danh sách đuôi IP mặc định từ server
  const loadTransferSettings = async () => {
    try {
      const res = await mongoService.getTransferSettings();
      if (res.default_tails && res.default_tails.length > 0) {
        setDefaultTails(res.default_tails);
      }
    } catch (err: any) {
      console.error('Không thể tải cấu hình IP quét chuyển DB:', err);
    }
  };

  useEffect(() => {
    loadTransferSettings();
  }, []);

  // Scan machines in restaurant
  const handleScanMachines = async (overrideExtraIps?: string[]) => {
    const targetIp = selectedRestaurant?.ip || selectedRestaurant?.ip_wan || '10.8.0.11';
    setScanning(true);
    try {
      const res = await mongoService.scanTransferMachines({
        restaurant_id: selectedRestaurant?.id,
        target_ip: targetIp,
        extra_ips: overrideExtraIps || extraIps
      });
      setMachines(res.machines);
      setSubnet(res.subnet);

      // Auto select source machine if not set
      const onlineMachines = res.machines.filter((m) => m.connected);
      if (!sourceIp && onlineMachines.length > 0) {
        // Prefer machine that has databases
        const withDbs = onlineMachines.find((m) => m.databases.length > 0);
        if (withDbs) {
          setSourceIp(withDbs.ip);
        } else {
          setSourceIp(onlineMachines[0].ip);
        }
      }
      showToast(`Đã quét xong ${res.machines.length} máy trong nhà hàng!`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi quét máy MongoDB: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setScanning(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleScanMachines();
  }, [selectedRestaurant?.id, selectedRestaurant?.ip]);

  // Inspect pair whenever source or destination changes
  useEffect(() => {
    if (sourceIp && destIp && sourceIp !== destIp) {
      handleInspectPair(sourceIp, destIp);
    } else {
      setInspectData(null);
    }
  }, [sourceIp, destIp]);

  const handleInspectPair = async (src: string, dst: string) => {
    setInspecting(true);
    try {
      const res = await mongoService.inspectTransferPair({
        source_ip: src,
        dest_ip: dst
      });
      setInspectData(res);
      // Pre-select source databases
      if (res.source && res.source.databases.length > 0) {
        setSelectedDbs(res.source.databases.map((d) => d.name));
      }
    } catch (err: any) {
      showToast('Lỗi khi kiểm tra đối chiếu máy nguồn & đích: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setInspecting(false);
    }
  };

  // Helper phân tích IP hoặc đuôi IP
  const parseTailOrIp = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const tailMatch = trimmed.match(/^\.?(\d{1,3})$/);
    if (tailMatch) {
      return {
        tail: tailMatch[1],
        fullIp: subnet ? `${subnet}${tailMatch[1]}` : trimmed
      };
    }
    const fullIpMatch = trimmed.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.)(\d{1,3})$/);
    if (fullIpMatch) {
      return {
        tail: fullIpMatch[2],
        fullIp: trimmed
      };
    }
    return {
      tail: trimmed.split('.').pop() || trimmed,
      fullIp: trimmed
    };
  };

  // 1. Thêm IP tạm thời (chỉ cho nhà hàng hiện tại, không lưu vào gốc)
  const handleAddTemporaryIp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseTailOrIp(customIp);
    if (!parsed) return;
    const ipToAdd = parsed.fullIp;
    if (extraIps.includes(ipToAdd)) {
      showToast(`IP ${ipToAdd} đã có trong danh sách tạm thời!`, 'info');
      return;
    }
    const updated = [...extraIps, ipToAdd];
    setExtraIps(updated);
    setCustomIp('');
    handleScanMachines(updated);
    showToast(`Đã thêm tạm thời IP ${ipToAdd} (chỉ quét cho nhà này)`, 'success');
  };

  const handleRemoveTemporaryIp = (ipToRemove: string) => {
    const updated = extraIps.filter((ip) => ip !== ipToRemove);
    setExtraIps(updated);
    handleScanMachines(updated);
    showToast(`Đã gỡ IP tạm thời ${ipToRemove}`, 'info');
  };

  // 2. Thêm IP làm Mặc định (lưu vào hệ thống để mọi nhà sau này đều quét)
  const handleAddDefaultTail = async (tailInput?: string) => {
    const raw = tailInput || customIp;
    const parsed = parseTailOrIp(raw);
    if (!parsed) return;
    const tail = parsed.tail;
    if (defaultTails.includes(tail)) {
      showToast(`Đuôi IP .${tail} đã là mặc định cho tất cả nhà hàng rồi!`, 'info');
      return;
    }
    setSavingSettings(true);
    try {
      const nextTails = [...defaultTails, tail];
      const res = await mongoService.saveTransferSettings(nextTails);
      setDefaultTails(res.default_tails);
      setCustomIp('');
      showToast(`Đã lưu .${tail} làm IP mặc định! Tất cả nhà hàng sau này đều sẽ quét IP này.`, 'success');
      handleScanMachines();
    } catch (err: any) {
      showToast('Lỗi khi lưu IP mặc định: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveDefaultTail = async (tailToRemove: string) => {
    const nextTails = defaultTails.filter((t) => t !== tailToRemove);
    if (nextTails.length === 0) {
      showToast('Phải giữ ít nhất 1 IP mặc định!', 'info');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await mongoService.saveTransferSettings(nextTails);
      setDefaultTails(res.default_tails);
      showToast(`Đã gỡ đuôi IP .${tailToRemove} khỏi danh sách mặc định`, 'info');
      handleScanMachines();
    } catch (err: any) {
      showToast('Lỗi khi cập nhật IP mặc định: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleResetDefaultTails = async () => {
    setSavingSettings(true);
    try {
      const res = await mongoService.saveTransferSettings(['11', '12', '41']);
      setDefaultTails(res.default_tails);
      showToast('Đã khôi phục danh sách IP mặc định về gốc (.11, .12, .41)', 'success');
      handleScanMachines();
    } catch (err: any) {
      showToast('Lỗi khi khôi phục IP mặc định: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleStartTransfer = async () => {
    setShowConfirmModal(false);
    setExecuting(true);
    setExecutionResult(null);
    try {
      const res = await mongoService.executeTransferDatabases({
        source_ip: sourceIp,
        dest_ip: destIp,
        selected_databases: selectedDbs,
        clean_action_log: cleanActionLog,
        clean_action_log_bk: cleanActionLogBk,
        clean_kitchen_action_log: cleanKitchenActionLog,
        drop_dest_existing: dropDestExisting
      });
      setExecutionResult(res);
      if (res.success) {
        showToast(res.message, 'success');
        // Refresh inspection
        handleInspectPair(sourceIp, destIp);
        handleScanMachines();
      } else {
        showToast('Chuyển database không thành công: ' + res.message, 'error');
      }
    } catch (err: any) {
      showToast('Lỗi khi thực thi chuyển database: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setExecuting(false);
    }
  };

  const onlineMachines = machines.filter((m) => m.connected);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* ── HEADER CARD ── */}
      <Card>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <Badge variant="primary">GPOS Migration</Badge>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScanMachines()}
                disabled={scanning || executing}
                leftIcon={<RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />}
              >
                {scanning ? 'Đang quét...' : 'Quét lại các máy'}
              </Button>
            </div>
          </div>

          {/* Subnet & Restaurant Info Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '12.5px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span>
                Nhà hàng: <strong>{selectedRestaurant?.res || 'Chưa chọn'}</strong> (SAP: <strong>{selectedRestaurant?.sap || '—'}</strong>, RK7: <strong>{selectedRestaurant?.rk7 || '—'}</strong>)
              </span>
              <span>
                Dải mạng LAN: <strong style={{ fontFamily: 'monospace', color: '#0284C7' }}>{subnet}*</strong>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>IP Quét mặc định:</span>
                <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {defaultTails.map((t) => (
                    <span
                      key={t}
                      style={{
                        padding: '1px 6px',
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        border: '1px solid #BAE6FD'
                      }}
                    >
                      .{t}
                    </span>
                  ))}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDefaultTailsModal(true)}
                  title="Quản lý danh sách IP mặc định quét cho mọi nhà hàng"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    textDecoration: 'underline'
                  }}
                >
                  <Settings size={12} /> Cấu hình
                </button>
              </div>
              <span>
                Số máy kết nối MongoDB OK: <strong style={{ color: onlineMachines.length > 0 ? '#15803D' : '#DC2626' }}>{onlineMachines.length} / {machines.length} máy</strong>
              </span>
            </div>

            {/* Custom IP Input với 2 tùy chọn: Tạm thời vs Mặc định */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder={`Nhập đuôi IP (VD: 45) hoặc full IP`}
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTemporaryIp();
                  }
                }}
                style={{
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  width: '210px'
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleAddTemporaryIp()}
                disabled={!customIp.trim() || scanning}
                title="Thêm IP chỉ để quét cho nhà hàng hiện tại, không lưu vào gốc"
                leftIcon={<Plus size={12} />}
              >
                + Tạm thời
              </Button>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => handleAddDefaultTail()}
                disabled={!customIp.trim() || savingSettings || scanning}
                title="Lưu IP này thành IP mặc định để tất cả nhà hàng sau này đều quét"
                leftIcon={<Star size={12} />}
                style={{ backgroundColor: '#D97706', borderColor: '#B45309', color: '#FFFFFF' }}
              >
                ★ Lưu Mặc Định
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ── BƯỚC 1: DANH SÁCH MÁY TRẠM & CHỌN MÁY NGUỒN / ĐÍCH ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Máy Nguồn Card */}
        <Card>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #93C5FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#1D4ED8'
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                  Máy Nguồn (Máy cũ / Cần lấy Data)
                </div>
              </div>
              <Badge variant="primary">SOURCE</Badge>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Chọn máy tính đang lưu database MongoDB cần sao chép sang máy khác:
            </div>

            <select
              value={sourceIp}
              onChange={(e) => setSourceIp(e.target.value)}
              disabled={executing}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #93C5FD',
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                color: '#1E3A8A'
              }}
            >
              <option value="">-- Chọn máy nguồn --</option>
              {onlineMachines.map((m) => (
                <option key={m.ip} value={m.ip}>
                  {m.ip} (Ping: {m.ping_ms}ms) — [DB: {m.databases.join(', ') || 'Trống'}]
                </option>
              ))}
            </select>

            {/* Thông tin nhanh máy nguồn */}
            {sourceIp && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Địa chỉ IP: <strong>{sourceIp}:27017</strong></span>
                  <span style={{ color: '#0369A1' }}>Trạng thái: <strong>KẾT NỐI OK</strong></span>
                </div>
                {inspectData?.source && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0369A1' }}>
                    <span>Tổng số DB: <strong>{inspectData.source.databases.length}</strong></span>
                    <span>Tổng dung lượng: <strong>{inspectData.source.total_size_mb} MB</strong></span>
                    <span>Tổng bản ghi: <strong>{inspectData.source.total_docs.toLocaleString()}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Máy Đích Card */}
        <Card>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#15803D'
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                  Máy Đích (Máy mới / Cần nhận Data)
                </div>
              </div>
              <Badge variant="success">DESTINATION</Badge>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Chọn máy tính mới cài lại Windows/MongoDB để nạp toàn bộ database:
            </div>

            <select
              value={destIp}
              onChange={(e) => setDestIp(e.target.value)}
              disabled={executing}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1.5px solid #86EFAC',
                backgroundColor: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                color: '#14532D'
              }}
            >
              <option value="">-- Chọn máy đích --</option>
              {onlineMachines.map((m) => (
                <option key={m.ip} value={m.ip} disabled={m.ip === sourceIp}>
                  {m.ip} (Ping: {m.ping_ms}ms) — {m.ip === sourceIp ? '(Trùng máy nguồn)' : `[DB: ${m.databases.join(', ') || 'Trống'}]`}
                </option>
              ))}
            </select>

            {/* Thông tin nhanh máy đích */}
            {destIp && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Địa chỉ IP: <strong>{destIp}:27017</strong></span>
                  <span style={{ color: '#15803D' }}>Trạng thái: <strong>KẾT NỐI OK</strong></span>
                </div>
                {inspectData?.dest && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803D' }}>
                    <span>Database hiện có: <strong>{inspectData.dest.databases.map((d) => d.name).join(', ') || 'Chưa có DB nào'}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Grid danh sách tất cả các máy đã dò */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
          Tình trạng kết nối MongoDB trên các IP trong nhà hàng ({machines.length} máy):
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
          {machines.map((m) => {
            const isSource = m.ip === sourceIp;
            const isDest = m.ip === destIp;
            return (
              <div
                key={m.ip}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: m.connected ? '#FFFFFF' : '#F8FAFC',
                  border: isSource
                    ? '2px solid #2563EB'
                    : isDest
                    ? '2px solid #16A34A'
                    : `1px solid ${m.connected ? '#E2E8F0' : '#CBD5E1'}`,
                  boxShadow: isSource || isDest ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px', color: m.connected ? '#0F172A' : '#94A3B8' }}>
                    {m.ip}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {extraIps.includes(m.ip) && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          border: '1px solid #FCD34D',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        title="IP tạm thời (chỉ quét cho nhà hàng hiện tại)"
                      >
                        Tạm thời
                        <button
                          type="button"
                          onClick={() => handleRemoveTemporaryIp(m.ip)}
                          title="Gỡ IP tạm thời này"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#B45309',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            lineHeight: 1
                          }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    )}
                    <Badge variant={m.connected ? 'success' : 'neutral'}>
                      {m.connected ? `${m.ping_ms}ms` : 'OFFLINE'}
                    </Badge>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {m.connected ? (
                    <div>
                      DB: <strong>{m.databases.join(', ') || '(Chưa có DB)'}</strong>
                    </div>
                  ) : (
                    <div>{m.error || 'Port đóng'}</div>
                  )}
                </div>

                {m.connected && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={() => setSourceIp(m.ip)}
                      style={{
                        flex: 1,
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isSource ? '#2563EB' : '#EFF6FF',
                        color: isSource ? '#FFFFFF' : '#1D4ED8',
                        border: '1px solid #93C5FD',
                        cursor: 'pointer'
                      }}
                    >
                      {isSource ? '✓ Máy Nguồn' : 'Chọn Nguồn'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestIp(m.ip)}
                      disabled={isSource}
                      style={{
                        flex: 1,
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: isDest ? '#16A34A' : '#F0FDF4',
                        color: isDest ? '#FFFFFF' : '#15803D',
                        border: '1px solid #86EFAC',
                        cursor: isSource ? 'not-allowed' : 'pointer',
                        opacity: isSource ? 0.5 : 1
                      }}
                    >
                      {isDest ? '✓ Máy Đích' : 'Chọn Đích'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BƯỚC 2: KIỂM TRA ĐỐI CHIẾU & CẢNH BÁO XUNG ĐỘT ── */}
      {inspecting && (
        <Card>
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px', color: '#0284C7' }} />
            Đang dò tìm và kiểm tra cơ sở dữ liệu trên cả 2 máy ({sourceIp} &amp; {destIp})...
          </div>
        </Card>
      )}

      {inspectData && !inspecting && (
        <Card>
          <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#B45309'
                }}
              >
                3
              </div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                Kiểm Tra Đối Chiếu Dữ Liệu &amp; Cấu Hình Tối Ưu
              </h4>
            </div>

            {/* Cảnh Báo Nếu Có Trùng Lặp Database Trên Máy Đích */}
            {inspectData.has_conflicts ? (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <AlertTriangle size={22} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '13.5px' }}>
                    ⚠️ CẢNH BÁO QUAN TRỌNG: Máy đích ({destIp}) đã có sẵn database trùng tên!
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#B91C1C', lineHeight: '1.45' }}>
                    Các database đã tồn tại trên máy đích: <strong>{inspectData.conflicting_databases.join(', ')}</strong>.
                    Khi thực hiện chuyển đổi, toàn bộ dữ liệu cũ của các database này trên máy đích sẽ bị <strong>XÓA SẠCH HOÀN TOÀN</strong> và ghi đè bằng dữ liệu từ máy nguồn ({sourceIp}).
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#F0FDF4',
                  border: '1.5px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <CheckCircle2 size={20} color="#16A34A" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '12.5px', color: '#15803D', fontWeight: 600 }}>
                  Máy đích ({destIp}) hoàn toàn sạch sẽ, chưa có database trùng lặp. Sẵn sàng nhận dữ liệu an toàn.
                </div>
              </div>
            )}

            {/* Khối Tối Ưu Hóa ACTION_LOG */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800, color: '#92400E' }}>
                  <Zap size={16} color="#D97706" />
                  <span>Tối ưu hóa dung lượng: Xóa bảng ACTION_LOG trước khi chuyển</span>
                </div>
                <Badge variant="warning">
                  Tiết kiệm: ~{(inspectData.action_log_savings_mb / 1024).toFixed(2)} GB ({inspectData.action_log_savings_mb.toLocaleString()} MB)
                </Badge>
              </div>

              <div style={{ fontSize: '12px', color: '#78350F', lineHeight: '1.45' }}>
                Bảng <code>ACTION_LOG</code> và <code>ACTION_LOG_BK</code> chỉ lưu lịch sử thao tác cũ, chiếm tới 80% - 95% dung lượng database (hàng triệu dòng).
                Xóa sạch dữ liệu bảng này trước khi chuyển sẽ giúp quá trình sao chép diễn ra siêu tốc (vài giây thay vì 30 phút), không gây nghẽn mạng LAN nhà hàng.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cleanActionLog}
                    onChange={(e) => setCleanActionLog(e.target.checked)}
                    disabled={executing}
                  />
                  <span>
                    <strong>Xóa sạch bảng ACTION_LOG trong G_ORDER</strong> trên máy nguồn trước khi chuyển (Khuyến nghị bật)
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cleanActionLogBk}
                    onChange={(e) => setCleanActionLogBk(e.target.checked)}
                    disabled={executing}
                  />
                  <span>
                    <strong>Xóa sạch bảng ACTION_LOG_BK trong G_ORDER</strong> trên máy nguồn (nếu có)
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#1E293B', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cleanKitchenActionLog}
                    onChange={(e) => setCleanKitchenActionLog(e.target.checked)}
                    disabled={executing}
                  />
                  <span>
                    <strong>Xóa sạch bảng ACTION_LOG trong G_KITCHEN</strong> trên máy nguồn (nếu có)
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#DC2626', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dropDestExisting}
                    onChange={(e) => setDropDestExisting(e.target.checked)}
                    disabled={executing}
                  />
                  <span>
                    <strong>Xóa bỏ database trùng tên trên máy đích ({destIp})</strong> trước khi nạp dữ liệu mới
                  </span>
                </label>
              </div>
            </div>

            {/* Chi Tiết Các Database Trên Máy Nguồn Sẽ Được Chuyển */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Chọn các Database cần chuyển từ máy nguồn sang máy đích:
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', width: '40px', textAlign: 'center' }}>Chuyển</th>
                      <th style={{ padding: '8px 12px' }}>Tên Database</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Số Collections</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Tổng Bản Ghi</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Dung Lượng Gốc</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Bản Ghi Action Log</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Dung Lượng Sau Tối Ưu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectData.source.databases.map((d) => {
                      const isSelected = selectedDbs.includes(d.name);
                      const estDSize = Math.max(0, d.data_size_mb - d.action_log_size_mb - d.action_log_bk_size_mb);
                      const totalLogs = d.action_log_docs + d.action_log_bk_docs;
                      const estDocs = Math.max(0, d.estimated_docs - (cleanActionLog ? d.action_log_docs : 0) - (cleanActionLogBk ? d.action_log_bk_docs : 0));

                      return (
                        <tr key={d.name} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: isSelected ? '#FFFFFF' : '#F8FAFC' }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDbs([...selectedDbs, d.name]);
                                } else {
                                  setSelectedDbs(selectedDbs.filter((n) => n !== d.name));
                                }
                              }}
                              disabled={executing}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>
                              {d.name}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            {d.collections_count}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                            {d.estimated_docs.toLocaleString()}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748B' }}>
                            {d.data_size_mb.toLocaleString()} MB
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#D97706', fontWeight: 700 }}>
                            {totalLogs > 0 ? `${totalLogs.toLocaleString()} dòng (~${(d.action_log_size_mb + d.action_log_bk_size_mb).toFixed(1)} MB)` : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#15803D', fontWeight: 800 }}>
                            ~{estDSize.toFixed(1)} MB ({estDocs.toLocaleString()} docs)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px' }}>
              <Button
                variant="primary"
                size="lg"
                disabled={executing || selectedDbs.length === 0 || !sourceIp || !destIp || sourceIp === destIp}
                onClick={() => setShowConfirmModal(true)}
                leftIcon={<Play size={16} />}
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                  padding: '10px 24px',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                }}
              >
                {executing ? 'Đang Thực Hiện Chuyển...' : 'Bắt Đầu Chuyển Database'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── BƯỚC 4: TIẾN TRÌNH & KẾT QUẢ SAU KHI CHUYỂN ── */}
      {executing && (
        <Card>
          <div style={{ padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <RefreshCw size={36} className="animate-spin" color="#2563EB" />
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B' }}>
              Đang thực hiện chuyển toàn bộ Database từ {sourceIp} sang {destIp}...
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '600px', lineHeight: '1.5' }}>
              Hệ thống đang tiến hành: Dọn dẹp bảng Action Log nguồn ➔ Xóa DB cũ trên máy đích ➔ Sao chép từng collection và phục hồi toàn bộ Index ➔ Đối soát dữ liệu. Vui lòng không đóng trình duyệt!
            </div>
          </div>
        </Card>
      )}

      {executionResult && (
        <Card>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner Kết Quả Tổng Thể */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                backgroundColor: executionResult.success ? '#F0FDF4' : '#FEF2F2',
                border: `1.5px solid ${executionResult.success ? '#86EFAC' : '#FCA5A5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {executionResult.success ? (
                  <CheckCircle2 size={26} color="#16A34A" />
                ) : (
                  <AlertTriangle size={26} color="#DC2626" />
                )}
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: executionResult.success ? '#15803D' : '#991B1B' }}>
                    {executionResult.success ? '✅ Chuyển Database Thành Công Hoàn Toàn!' : '❌ Quá Trình Chuyển Database Bị Lỗi'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: executionResult.success ? '#166534' : '#B91C1C' }}>
                    {executionResult.message}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge variant={executionResult.success ? 'success' : 'danger'}>
                  Thời gian: {executionResult.total_duration_seconds}s
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetailLogs(!showDetailLogs)}
                >
                  {showDetailLogs ? 'Ẩn nhật ký chi tiết' : 'Xem nhật ký chi tiết'}
                </Button>
              </div>
            </div>

            {/* Bảng Đối Soát Sau Chuyển Đổi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Kết quả đối soát số lượng bản ghi giữa Máy Nguồn ({sourceIp}) và Máy Đích ({destIp}):
              </div>

              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px' }}>Tên Database</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Số Collections Đích</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Bản Ghi Máy Nguồn</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Bản Ghi Máy Đích</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Tình Trạng Khớp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executionResult.verification_results.map((v) => (
                      <tr key={v.database} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 800, fontFamily: 'monospace' }}>
                          {v.database}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {v.dest_collections ?? '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {v.source_docs.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                          {v.dest_docs.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          {v.match ? (
                            <Badge variant="success">✅ Khớp 100%</Badge>
                          ) : (
                            <Badge variant="warning">Chênh lệch nhẹ</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Chi Tiết Nhật Ký Các Bước Thực Hiện */}
            {showDetailLogs && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}>
                  📜 Nhật ký thực thi chi tiết (Execution Logs):
                </div>
                {executionResult.logs.map((l, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', lineHeight: '1.4' }}>
                    <span style={{ color: '#64748B' }}>[{l.timestamp}]</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          l.status === 'SUCCESS'
                            ? '#4ADE80'
                            : l.status === 'WARNING'
                            ? '#FBBF24'
                            : l.status === 'ERROR'
                            ? '#F87171'
                            : '#38BDF8'
                      }}
                    >
                      [{l.step}]
                    </span>
                    <span>{l.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── MODAL XÁC NHẬN CHUYỂN DATABASE ── */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Xác Nhận Chuyển Toàn Bộ Database MongoDB"
          maxWidth="620px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}
            >
              <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#991B1B', lineHeight: '1.45' }}>
                <strong>Cảnh báo quan trọng:</strong> Hành động này sẽ chuyển toàn bộ dữ liệu các database đã chọn từ máy nguồn sang máy đích.
                Nếu máy đích đã có database cũ trùng tên, các database đó sẽ bị <strong>XÓA SẠCH VÀ THAY THẾ</strong>.
              </div>
            </div>

            <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>Máy nguồn (Source): <strong style={{ color: '#1D4ED8' }}>{sourceIp}:27017</strong></div>
              <div>Máy đích (Destination): <strong style={{ color: '#15803D' }}>{destIp}:27017</strong></div>
              <div>Các Database sẽ chuyển: <strong>{selectedDbs.join(', ')}</strong></div>
              <div>Xóa Action Log nguồn để giảm tải: <strong>{cleanActionLog ? 'CÓ (Khuyến nghị)' : 'KHÔNG'}</strong></div>
              <div>Xóa database cũ trên máy đích: <strong>{dropDestExisting ? 'CÓ (Xóa & nạp lại)' : 'KHÔNG'}</strong></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px' }}>
              <Button variant="outline" size="sm" onClick={() => setShowConfirmModal(false)}>
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartTransfer}
                style={{ backgroundColor: '#DC2626', color: '#FFFFFF', fontWeight: 700 }}
              >
                Xác Nhận &amp; Bắt Đầu Chuyển
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL QUẢN LÝ ĐUÔI IP MẶC ĐỊNH CHO TẤT CẢ NHÀ HÀNG ── */}
      {showDefaultTailsModal && (
        <Modal
          isOpen={showDefaultTailsModal}
          onClose={() => setShowDefaultTailsModal(false)}
          title="⚙️ Quản Lý Đuôi IP Quét Mặc Định (Chuyển DB)"
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Các đuôi IP trong danh sách này sẽ được hệ thống <strong>tự động quét trên mọi nhà hàng</strong> khi mở chức năng Chuyển Database.
              (Mặc định hệ thống gồm: <strong>.11, .12, .41</strong>).
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                Danh sách đuôi IP đang áp dụng ({defaultTails.length}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {defaultTails.map((tail) => {
                  const isBase = ['11', '12', '41'].includes(tail);
                  return (
                    <div
                      key={tail}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        backgroundColor: isBase ? '#F1F5F9' : '#FEF3C7',
                        border: `1px solid ${isBase ? '#CBD5E1' : '#FCD34D'}`,
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: isBase ? '#334155' : '#92400E'
                      }}
                    >
                      <span>.{tail}</span>
                      <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748B' }}>
                        {isBase ? '(Gốc)' : '(Tùy chỉnh)'}
                      </span>
                      {!isBase && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDefaultTail(tail)}
                          title={`Xóa đuôi .${tail} khỏi danh sách mặc định`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#DC2626',
                            cursor: 'pointer',
                            padding: '0 2px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Input thêm đuôi IP mới */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <input
                type="text"
                placeholder="Nhập đuôi IP mới (VD: 45 hoặc .45)"
                value={newDefaultTail}
                onChange={(e) => setNewDefaultTail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newDefaultTail.trim()) {
                      handleAddDefaultTail(newDefaultTail);
                      setNewDefaultTail('');
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (newDefaultTail.trim()) {
                    handleAddDefaultTail(newDefaultTail);
                    setNewDefaultTail('');
                  }
                }}
                disabled={!newDefaultTail.trim() || savingSettings}
                leftIcon={<Plus size={13} />}
                style={{ backgroundColor: '#D97706', borderColor: '#B45309', color: '#FFFFFF' }}
              >
                Thêm Mặc Định
              </Button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaultTails}
                disabled={savingSettings}
                style={{ color: '#64748B', fontSize: '12px' }}
              >
                Khôi phục về gốc (.11, .12, .41)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDefaultTailsModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

