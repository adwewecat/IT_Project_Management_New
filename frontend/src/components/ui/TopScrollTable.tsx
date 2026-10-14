import React, { useRef, useEffect, useState, useCallback } from 'react';

interface TopScrollTableProps {
  children: React.ReactNode;
  maxHeight?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * TopScrollTable: Component bọc bảng dữ liệu tuân thủ quy tắc bất di bất dịch của dự án:
 * 1. Cung cấp thanh cuộn ngang (Scroll X) ngay kế trên đầu/tiêu đề bảng khi bảng quá rộng vượt màn hình.
 * 2. Giúp kỹ thuật viên / người dùng không cần phải cuộn chuột xuống tít đáy trang mới thấy thanh kéo qua trái/phải.
 * 3. Đồng bộ hai chiều mượt mà giữa thanh cuộn trên và vùng hiển thị dữ liệu bên dưới.
 */
export const TopScrollTable: React.FC<TopScrollTableProps> = ({
  children,
  maxHeight = 'calc(100vh - 280px)',
  className,
  style
}) => {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState<number>(0);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  const measureWidth = useCallback(() => {
    if (bottomScrollRef.current) {
      const scrollW = bottomScrollRef.current.scrollWidth;
      const clientW = bottomScrollRef.current.clientWidth;
      setContentWidth(scrollW);
      setHasOverflow(scrollW > clientW + 2);
    }
  }, []);

  useEffect(() => {
    measureWidth();
    const ro = new ResizeObserver(() => {
      measureWidth();
    });
    if (bottomScrollRef.current) {
      ro.observe(bottomScrollRef.current);
      if (bottomScrollRef.current.firstElementChild) {
        ro.observe(bottomScrollRef.current.firstElementChild);
      }
    }
    window.addEventListener('resize', measureWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureWidth);
    };
  }, [measureWidth]);

  const handleTopScroll = () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (bottomScrollRef.current && topScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  const handleBottomScroll = () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  };

  return (
    <div style={{ width: '100%', position: 'relative', ...style }} className={className}>
      {/* Thanh cuộn ngang phụ ở đỉnh bảng - Chỉ hiện khi bảng bị tràn ngang (overflowX) */}
      {hasOverflow && (
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            width: '100%',
            height: '12px',
            backgroundColor: '#F1F5F9',
            borderTop: '1px solid var(--border-color, #E2E8F0)',
            borderBottom: '1px solid var(--border-color, #E2E8F0)',
            position: 'sticky',
            top: 0,
            zIndex: 15
          }}
          title="Thanh cuộn ngang phụ ở đỉnh bảng (Kéo để xem các cột bên phải/trái mà không cần cuộn xuống đáy)"
        >
          <div style={{ width: `${contentWidth}px`, height: '1px' }} />
        </div>
      )}

      {/* Khung chứa bảng dữ liệu chính */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        style={{
          overflowX: 'auto',
          maxHeight: maxHeight !== 'none' ? (maxHeight || 'calc(100vh - 280px)') : undefined,
          overflowY: maxHeight !== 'none' ? 'auto' : undefined,
          width: '100%',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {children}
      </div>
    </div>
  );
};
