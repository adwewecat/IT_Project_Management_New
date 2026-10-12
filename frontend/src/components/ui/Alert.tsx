import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface AlertProps {
  type?: 'error' | 'success';
  message: any;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'error',
  message,
}) => {
  const isError = type === 'error';

  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    lineHeight: '1.4',
    backgroundColor: isError ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
    color: isError ? 'var(--color-error-text)' : 'var(--color-success-text)',
    border: `1px solid ${isError ? 'var(--color-error-border)' : 'var(--color-success-border)'}`,
  };

  const getSafeMessage = (): string => {
    if (!message) return '';
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) {
      return message
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const field = item.loc ? item.loc[item.loc.length - 1] : '';
            const msg = item.msg || JSON.stringify(item);
            return field ? `${field}: ${msg}` : msg;
          }
          return String(item);
        })
        .join('; ');
    }
    if (typeof message === 'object') {
      return (message as any).detail || (message as any).message || JSON.stringify(message);
    }
    return String(message);
  };

  return (
    <div style={style} role="alert">
      {isError ? (
        <AlertCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
      ) : (
        <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
      )}
      <span style={{ flex: 1 }}>{getSafeMessage()}</span>
    </div>
  );
};
