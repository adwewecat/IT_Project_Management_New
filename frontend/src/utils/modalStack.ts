import { useEffect, useRef, useState } from 'react';

export interface ModalStackItem {
  id: string;
  onClose: () => void;
  requestedZIndex?: number;
  calculatedZIndex: number;
}

// Ngăn xếp (Stack - LIFO) lưu trữ toàn bộ các popup/modal đang mở trên hệ thống
const modalStack: ModalStackItem[] = [];

let isListenerAttached = false;

/**
 * Listener phím Escape toàn cục ở CAPTURE PHASE.
 * Bắt sự kiện ngay từ cửa ngõ cao nhất (window) để:
 * 1. Chỉ đóng DUY NHẤT popup/modal ở đỉnh stack (modal trên cùng).
 * 2. Ngăn chặn triệt để (stopPropagation & stopImmediatePropagation) không cho sự kiện Escape
 *    lan tới bất kỳ modal nào khác bên dưới trong cùng một lượt nhấn.
 */
const handleGlobalEscapeKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    if (modalStack.length > 0) {
      // Lấy modal trên cùng (phần tử cuối cùng trong stack)
      const topModal = modalStack[modalStack.length - 1];

      // Chặn toàn bộ sự kiện Escape
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Gọi hàm onClose của modal trên cùng
      topModal.onClose();
    }
  }
};

const attachListenerIfNeeded = () => {
  if (!isListenerAttached && typeof window !== 'undefined') {
    // Sử dụng capture phase = true để đón sự kiện trước mọi event listener khác
    window.addEventListener('keydown', handleGlobalEscapeKeyDown, true);
    isListenerAttached = true;
  }
};

const detachListenerIfEmpty = () => {
  if (isListenerAttached && modalStack.length === 0 && typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleGlobalEscapeKeyDown, true);
    isListenerAttached = false;
  }
};

const updateBodyScroll = () => {
  if (typeof document === 'undefined') return;
  if (modalStack.length > 0) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }
};

/**
 * Đăng ký modal vào ngăn xếp.
 * Tự động tính toán z-index sao cho modal mở sau luôn có z-index cao hơn modal trước tối thiểu 20 đơn vị.
 */
export const registerModal = (
  id: string,
  onClose: () => void,
  requestedZIndex?: number
): number => {
  const existingIndex = modalStack.findIndex((item) => item.id === id);
  if (existingIndex !== -1) {
    modalStack[existingIndex].onClose = onClose;
    if (requestedZIndex !== undefined) {
      modalStack[existingIndex].requestedZIndex = requestedZIndex;
    }
    return modalStack[existingIndex].calculatedZIndex;
  }

  // Tìm z-index cao nhất của các modal đang mở trước đó
  const maxPreviousZIndex = modalStack.reduce(
    (max, item) => Math.max(max, item.calculatedZIndex),
    980
  );

  const calculatedZIndex =
    requestedZIndex !== undefined
      ? Math.max(requestedZIndex, maxPreviousZIndex + 20)
      : Math.max(1000, maxPreviousZIndex + 20);

  modalStack.push({
    id,
    onClose,
    requestedZIndex,
    calculatedZIndex,
  });

  attachListenerIfNeeded();
  updateBodyScroll();

  return calculatedZIndex;
};

/**
 * Cập nhật hàm onClose của modal khi re-render
 */
export const updateModalCloseHandler = (id: string, onClose: () => void) => {
  const item = modalStack.find((m) => m.id === id);
  if (item) {
    item.onClose = onClose;
  }
};

/**
 * Hủy đăng ký modal khỏi ngăn xếp khi đóng hoặc unmount
 */
export const unregisterModal = (id: string) => {
  const index = modalStack.findIndex((item) => item.id === id);
  if (index !== -1) {
    modalStack.splice(index, 1);
  }
  updateBodyScroll();
  detachListenerIfEmpty();
};

/**
 * Hook quản lý ngăn xếp modal (LIFO) cho component Modal & các popup/lightbox.
 * Trả về zIndex an toàn đảm bảo hiển thị đúng thứ tự chồng lớp.
 */
export const useModalStack = (
  isOpen: boolean,
  onClose: () => void,
  requestedZIndex?: number
): number => {
  const idRef = useRef<string>('');
  if (!idRef.current) {
    idRef.current = `modal_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  }

  const [effectiveZIndex, setEffectiveZIndex] = useState<number>(() => {
    if (isOpen) {
      return registerModal(idRef.current, onClose, requestedZIndex);
    }
    return requestedZIndex ?? 1000;
  });

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const id = idRef.current;
    if (isOpen) {
      const calculatedZIndex = registerModal(
        id,
        () => onCloseRef.current(),
        requestedZIndex
      );
      setEffectiveZIndex((prev) => (prev === calculatedZIndex ? prev : calculatedZIndex));
    } else {
      unregisterModal(id);
    }

    return () => {
      unregisterModal(id);
    };
  }, [isOpen, requestedZIndex]);

  useEffect(() => {
    if (isOpen) {
      updateModalCloseHandler(idRef.current, () => onCloseRef.current());
    }
  }, [isOpen, onClose]);

  return effectiveZIndex;
};
