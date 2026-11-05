import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, ExternalLink, RefreshCw, Code, CheckCircle, Info } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboard';

interface RestaurantNccApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NccItem {
  sap: string;
  ten_nh: string;
  ip_wan: string;
}

export const RestaurantNccApiModal: React.FC<RestaurantNccApiModalProps> = ({ isOpen, onClose }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<NccItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewFormat, setPreviewFormat] = useState<'object' | 'array'>('object');

  // Tính toán Base URL API
  const backendHost = window.location.hostname || 'localhost';
  const apiBase = `${window.location.protocol}//${backendHost}:8000/api/v1`;
  const primaryApiUrl = `${apiBase}/restaurants/ncc`;
  const aliasApiUrl = `${apiBase}/partner/restaurants`;
  const arrayApiUrl = `${apiBase}/restaurants/ncc?format=array`;

  // Tải dữ liệu xem trước khi mở modal
  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }
  }, [isOpen]);

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(primaryApiUrl);
      if (res.ok) {
        const json = await res.json();
        setTotalCount(json.total || 0);
        setPreviewData(json.data || []);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (url: string, key: string) => {
    await copyToClipboard(url);
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔗 Link API Thông Tin Nhà Hàng Cho Nhà Cung Cấp (NCC)" maxWidth="780px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
        
        {/* Banner tóm tắt yêu cầu */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <CheckCircle size={18} style={{ color: '#16a34a', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#166534', marginBottom: '3px' }}>
              API Cung Cấp Dữ Liệu Cho Nhà Cung Cấp (NCC) Tự Động Kết Nối
            </div>
            <div style={{ color: '#15803d', lineHeight: 1.5 }}>
              • <strong>Thông tin trả về:</strong> <code>Mã SAP</code>, <code>Tên Nhà Hàng</code>, <code>IP WAN</code>.<br />
              • <strong>Điều kiện nghiệp vụ:</strong> Trạng thái nhà hàng đang hoạt động <code>trangthai = 'ON'</code> (không lấy <code>OFF</code> hay <code>NEW</code>), và Mã SAP <code>phải có đúng 4 chữ số</code> (tự động loại bỏ mọi mã tạm hoặc không phải 4 số).
            </div>
          </div>
        </div>

        {/* Khối 1: Link API chính */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              1. Link API Chính Thức (Định dạng JSON Object)
            </span>
            <span style={{ fontSize: '11px', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Khuyến nghị gửi cho NCC
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={primaryApiUrl}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                color: '#0f172a'
              }}
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={copiedLink === 'primary' ? <Check size={14} /> : <Copy size={14} />}
              onClick={() => handleCopy(primaryApiUrl, 'primary')}
              style={{ minWidth: '100px' }}
            >
              {copiedLink === 'primary' ? 'Đã chép!' : 'Sao chép'}
            </Button>
            <a href={primaryApiUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" title="Mở trên tab mới">
                <ExternalLink size={14} />
              </Button>
            </a>
          </div>
        </div>

        {/* Khối 2: Link API Mảng thuần túy (Nếu NCC thích mảng) */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              2. Link API Mảng Thuần Túy (Raw JSON Array)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
              Dành cho NCC parse thẳng mảng []
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={arrayApiUrl}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                color: '#0f172a'
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={copiedLink === 'array' ? <Check size={14} /> : <Copy size={14} />}
              onClick={() => handleCopy(arrayApiUrl, 'array')}
              style={{ minWidth: '100px' }}
            >
              {copiedLink === 'array' ? 'Đã chép!' : 'Sao chép'}
            </Button>
            <a href={arrayApiUrl} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm" title="Mở trên tab mới">
                <ExternalLink size={14} />
              </Button>
            </a>
          </div>
        </div>

        {/* Khối 3: Tham số tra cứu mở rộng */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', backgroundColor: '#f8fafc' }}>
          <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
            <Info size={15} style={{ color: '#0ea5e9' }} />
            <span>Các tham số tùy chọn NCC có thể truyền thêm:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: 1.6, color: '#475569' }}>
            <li><code>?sap=4008</code>: Tra cứu riêng chính xác 1 nhà hàng theo mã SAP 4 chữ số.</li>
            <li><code>?search=Gogi</code>: Tìm kiếm nhanh theo tên nhà hàng hoặc mã SAP.</li>
            <li><code>?format=array</code>: Trả về trực tiếp mảng JSON thay vì object.</li>
            <li>Link Alias dự phòng: <code>{aliasApiUrl}</code>.</li>
          </ul>
        </div>

        {/* Khối 4: Xem trước dữ liệu thực tế */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f1f5f9',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={16} style={{ color: '#0ea5e9' }} />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                Dữ Liệu Thực Tế ({totalCount} nhà hàng thỏa mãn điều kiện)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                variant={previewFormat === 'object' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewFormat('object')}
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                Object
              </Button>
              <Button
                variant={previewFormat === 'array' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewFormat('array')}
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                Array []
              </Button>
              <Button variant="secondary" size="sm" onClick={loadPreview} isLoading={isLoading} title="Tải lại">
                <RefreshCw size={13} />
              </Button>
            </div>
          </div>

          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              fontFamily: 'Consolas, monospace',
              fontSize: '12px',
              padding: '12px',
              lineHeight: 1.5
            }}
          >
            {isLoading ? (
              <div style={{ color: '#94a3b8' }}>Đang tải dữ liệu thực tế từ database...</div>
            ) : previewFormat === 'array' ? (
              <pre style={{ margin: 0 }}>
                {JSON.stringify(previewData.slice(0, 5), null, 2)}
                {previewData.length > 5 && `\n\n// ... và ${previewData.length - 5} nhà hàng khác`}
              </pre>
            ) : (
              <pre style={{ margin: 0 }}>
                {JSON.stringify(
                  {
                    success: true,
                    total: totalCount,
                    filter: {
                      trangthai: 'ON',
                      sap_condition: 'Mã SAP đúng 4 chữ số'
                    },
                    data: previewData.slice(0, 5)
                  },
                  null,
                  2
                )}
                {previewData.length > 5 && `\n\n// ... và ${previewData.length - 5} nhà hàng khác trong mảng data`}
              </pre>
            )}
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <Button variant="secondary" onClick={onClose}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
};
