import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-primary)',
          color: '#111827',
          border: '1px solid var(--color-primary)',
          fontWeight: 600,
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          fontWeight: 500,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color-dark)',
          fontWeight: 500,
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-error-bg)',
          color: 'var(--color-error-text)',
          border: '1px solid var(--color-error-border)',
          fontWeight: 600,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '6px 12px', fontSize: '13px', height: '32px' };
      case 'lg':
        return { padding: '12px 24px', fontSize: '16px', height: '48px' };
      case 'md':
      default:
        return { padding: '9px 18px', fontSize: '14px', height: '40px' };
    }
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: 'var(--radius-md)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.65 : 1,
    transition: 'all var(--transition-fast)',
    boxShadow: variant === 'primary' ? 'var(--shadow-sm)' : 'none',
    ...getSizeStyles(),
    ...getVariantStyles(),
    ...style,
  };

  return (
    <button
      style={baseStyle}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          if (variant === 'primary') {
            e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
            e.currentTarget.style.borderColor = 'var(--color-primary-hover)';
          } else if (variant === 'secondary' || variant === 'outline') {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          } else if (variant === 'danger') {
            e.currentTarget.style.backgroundColor = '#B91C1C';
            e.currentTarget.style.borderColor = '#991B1B';
            e.currentTarget.style.color = '#FFFFFF';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          const defaultStyles = getVariantStyles();
          e.currentTarget.style.backgroundColor = (style?.backgroundColor as string) || (defaultStyles.backgroundColor as string);
          e.currentTarget.style.borderColor = (style?.borderColor as string) || (defaultStyles.border as string).split(' ')[2] || 'transparent';
          e.currentTarget.style.color = (style?.color as string) || (defaultStyles.color as string);
        }
      }}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(0,0,0,0.2)',
            borderTopColor: 'var(--text-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            display: 'inline-block',
          }}
        />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
