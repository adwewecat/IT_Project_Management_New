import React from 'react';
import { X } from 'lucide-react';
import { useModalStack } from '../../utils/modalStack';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '560px',
  zIndex,
}) => {
  // Quản lý thứ tự ngăn xếp modal (LIFO) & z-index tự động
  const effectiveZIndex = useModalStack(isOpen, onClose, zIndex);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: effectiveZIndex,
  };

  const modalContainerStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-color)',
    boxShadow: 'var(--shadow-lg)',
    width: '100%',
    maxWidth,
    maxHeight: 'min(92vh, calc(100vh - 32px))',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color var(--transition-fast)',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
  };

  const footerStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  };

  return (
    <div style={overlayStyle} className="app-modal-overlay">
      <div style={modalContainerStyle} className="app-modal-container">
        <div style={headerStyle} className="app-modal-header">
          <div style={titleStyle} className="app-modal-title">{title}</div>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            aria-label="Đóng (Esc)"
            title="Đóng (Esc)"
            className="app-modal-close-btn"
          >
            <X size={20} />
          </button>
        </div>

        <div style={bodyStyle} className="app-modal-body">{children}</div>

        {footer && <div style={footerStyle} className="app-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};
