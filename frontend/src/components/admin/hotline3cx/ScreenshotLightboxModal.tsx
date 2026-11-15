import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '../../ui/Modal';

export interface ScreenshotLightboxModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ScreenshotLightboxModal: React.FC<ScreenshotLightboxModalProps> = ({
  imageUrl,
  onClose,
}) => {
  if (!imageUrl) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Ảnh Chụp Màn Hình Cổng 3CX (Playwright Screenshot)"
      maxWidth="980px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
            Đường dẫn ảnh: <code>{imageUrl}</code>
          </span>
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#2563eb',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>Mở tab mới</span>
            <ExternalLink size={13} />
          </a>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#111827',
            borderRadius: '8px',
            padding: '8px',
            maxHeight: '70vh',
            overflow: 'auto',
          }}
        >
          <img
            src={imageUrl}
            alt="3CX Portal Screenshot"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '4px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
        </div>
      </div>
    </Modal>
  );
};
