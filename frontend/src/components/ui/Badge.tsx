import React from 'react';

export interface BadgeProps {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  icon,
  style,
  className,
}) => {
  const getStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary-subtle)',
          color: 'var(--color-primary-text)',
          border: '1px solid var(--color-primary)',
        };
      case 'success':
        return {
          backgroundColor: 'var(--color-success-bg)',
          color: 'var(--color-success-text)',
          border: '1px solid var(--color-success-border)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-error-bg)',
          color: 'var(--color-error-text)',
          border: '1px solid var(--color-error-border)',
        };
      case 'info':
        return {
          backgroundColor: 'var(--color-info-bg)',
          color: 'var(--color-info-text)',
          border: '1px solid var(--color-info-border)',
        };
      case 'warning':
        return {
          backgroundColor: 'var(--color-warning-bg)',
          color: 'var(--color-warning-text)',
          border: '1px solid var(--color-warning-border)',
        };
      case 'neutral':
      default:
        return {
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)',
        };
    }
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: 'var(--radius-full)',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    ...getStyles(),
    ...style,
  };

  return (
    <span className={className} style={badgeStyle}>
      {icon}
      {children}
    </span>
  );
};
