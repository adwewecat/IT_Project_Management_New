import { useEffect, useRef, useState } from 'react';

/**
 * Tạo hiệu ứng đếm số mượt mà (count-up) khi giá trị thống kê thay đổi,
 * tự động nhảy tức thì nếu trình duyệt bật chế độ prefers-reduced-motion.
 */
export function useAnimatedNumber(target: number, durationMs = 520): number {
  const [display, setDisplay] = useState<number>(target);
  const fromRef = useRef<number>(target);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || fromRef.current === target) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const startVal = fromRef.current;
    const delta = target - startVal;
    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const nextVal = Math.round(startVal + delta * eased);
      setDisplay(nextVal);
      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      fromRef.current = target;
    };
  }, [target, durationMs]);

  return display;
}
