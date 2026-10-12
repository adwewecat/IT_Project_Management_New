import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Tv, RefreshCw, Loader2, Wrench } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { pingVnc, pingKds } from '../../services/restaurantService';
import { VncSetupModal } from './VncSetupModal';

interface VncKdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  ipPrefix: string; // e.g. "10.8.152."
}

const VNC_ITEMS = [
  { suffix: '41', label: 'PC QL', protocol: 'vnc' },
  { suffix: '11', label: 'POS 1.1', protocol: 'vnc' },
  { suffix: '12', label: 'POS 1.2', protocol: 'vnc' },
];

const KDS_ITEMS = [
  { suffix: '31', label: 'KDS 1', protocol: 'scrcpy' },
  { suffix: '32', label: 'KDS 2', protocol: 'scrcpy' },
  { suffix: '33', label: 'KDS 3', protocol: 'scrcpy' },
  { suffix: '34', label: 'KDS 4', protocol: 'scrcpy' },
  { suffix: '35', label: 'KDS 5', protocol: 'scrcpy' },
  { suffix: '36', label: 'KDS 6', protocol: 'scrcpy' },
  { suffix: '37', label: 'KDS 7', protocol: 'scrcpy' },
  { suffix: '38', label: 'KDS 8', protocol: 'scrcpy' },
];

const VNC_COLOR = '#1a73e8';
const KDS_COLOR = '#6f42c1';

export const VncKdsModal: React.FC<VncKdsModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  ipPrefix,
}) => {
  const [vncResults, setVncResults] = useState<Record<string, boolean>>({});
  const [kdsResults, setKdsResults] = useState<Record<string, boolean>>({});
  const [vncLoading, setVncLoading] = useState(false);
  const [kdsLoading, setKdsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  const loading = vncLoading || kdsLoading;

  const doPing = useCallback(async () => {
    if (!ipPrefix) return;
    setVncLoading(true);
    setKdsLoading(true);
    setError(null);

    // 1. Check VNC (PC/POS) - resolves almost instantly (< 0.2s)
    pingVnc(ipPrefix)
      .then((vncData) => {
        setVncResults(vncData.results || {});
      })
      .catch((err: any) => {
        console.error('Ping VNC error:', err);
      })
      .finally(() => {
        setVncLoading(false);
      });

    // 2. Check KDS screens in parallel
    pingKds(ipPrefix)
      .then((kdsData) => {
        setKdsResults(kdsData.results || {});
      })
      .catch((err: any) => {
        console.error('Ping KDS error:', err);
      })
      .finally(() => {
        setKdsLoading(false);
      });
  }, [ipPrefix]);

  useEffect(() => {
    if (isOpen && ipPrefix) {
      setVncResults({});
      setKdsResults({});
      doPing();
    }
  }, [isOpen, ipPrefix, doPing]);

  const handleConnect = (suffix: string, protocol: string) => {
    const ip = ipPrefix + suffix;
    window.location.href = `${protocol}://${ip}`;
  };

  const renderItem = (
    item: { suffix: string; label: string; protocol: string },
    results: Record<string, boolean>,
    isLoadingGroup: boolean,
    color: string,
    icon: React.ReactNode
  ) => {
    const hasResult = results[item.suffix] !== undefined;
    const isOnline = results[item.suffix] === true;
    const isPending = isLoadingGroup && !hasResult;

    return (
      <button
        key={item.suffix}
        type="button"
        onClick={() => isOnline && handleConnect(item.suffix, item.protocol)}
        disabled={!isOnline}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '10px 6px',
          borderRadius: 'var(--radius-md)',
          border: `2px solid ${isOnline ? color : 'var(--border-color)'}`,
          backgroundColor: isOnline ? `${color}10` : 'var(--bg-secondary)',
          cursor: isOnline ? 'pointer' : 'default',
          opacity: isPending ? 0.6 : isOnline ? 1 : 0.45,
          transition: 'all 0.15s ease',
          minWidth: 0,
        }}
        title={isOnline ? `Kết nối ${item.protocol}://${ipPrefix}${item.suffix}` : isPending ? `Đang kiểm tra ${ipPrefix}${item.suffix}...` : `${ipPrefix}${item.suffix} — Offline`}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isPending ? '#9CA3AF' : isOnline ? color : '#9CA3AF',
            color: '#fff',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isPending ? <Loader2 size={14} className="spin" /> : icon}
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: isOnline ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
          {item.label}
        </div>
        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: isOnline ? color : 'var(--text-muted)' }}>
          .{item.suffix}
        </div>
        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: isOnline ? '#DEF7EC' : '#F3F4F6',
            color: isOnline ? '#059669' : '#9CA3AF',
          }}
        >
          {isPending ? '...' : isOnline ? 'ONLINE' : 'OFFLINE'}
        </div>
      </button>
    );
  };

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Kết Nối Từ Xa — ${restaurantName}`}
      maxWidth="580px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button
            variant="secondary"
            leftIcon={loading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
            onClick={doPing}
            disabled={loading}
          >
            {loading ? (vncLoading && kdsLoading ? 'Đang kiểm tra...' : vncLoading ? 'Đang kiểm tra VNC...' : 'Đang kiểm tra KDS...') : 'Kiểm tra lại'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* IP Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <Monitor size={18} style={{ color: VNC_COLOR, flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            IP Prefix: <strong style={{ fontFamily: 'monospace' }}>{ipPrefix}</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '12px' }}>
              Click vào ô ONLINE để kết nối
            </span>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* Row 1: VNC PC/POS */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: VNC_COLOR, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={14} /> VNC — PC / POS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {VNC_ITEMS.map((item) =>
              renderItem(item, vncResults, vncLoading, VNC_COLOR, <Monitor size={14} />)
            )}
          </div>
        </div>

        {/* Row 2: KDS */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: KDS_COLOR, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Tv size={14} /> Scrcpy — KDS (Màn Hình Bếp)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {KDS_ITEMS.map((item) =>
              renderItem(item, kdsResults, kdsLoading, KDS_COLOR, <Tv size={14} />)
            )}
          </div>
        </div>

        {/* Setup Helper Footer */}
        <div
          style={{
            marginTop: '4px',
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            💡 Chưa kết nối được? Cần chạy file cấu hình Windows hoặc giải nén Scrcpy.
          </div>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Wrench size={14} />}
            onClick={() => setSetupModalOpen(true)}
          >
            Hướng Dẫn & Cài Đặt
          </Button>
        </div>
      </div>
    </Modal>

    {/* Setup & Download Guide Modal */}
    <VncSetupModal
      isOpen={setupModalOpen}
      onClose={() => setSetupModalOpen(false)}
    />
    </>
  );
};
