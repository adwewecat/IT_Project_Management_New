/**
 * Sao chep van ban vao clipboard an toan va tuong thich moi moi truong
 * (hoat dong tot tren ca HTTPS, localhost va HTTP qua dia chi IP may chu noi bo)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Thu dung Clipboard API hien dai neu moi truong ho tro (HTTPS hoac localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText that bai, chuyen sang fallback execCommand:', err);
    }
  }

  // 2. Fallback dung textarea + document.execCommand('copy') - tuong thich 100% khi truy cap qua HTTP IP
  const prevActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  let textArea: HTMLTextAreaElement | null = null;
  try {
    textArea = document.createElement('textarea');
    textArea.value = text;
    // Dam bao textarea khong lam lech trang, khong gay cuon man hinh va tuong thich trong Modal
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '1px';
    textArea.style.height = '1px';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    try {
      textArea.focus({ preventScroll: true });
    } catch {
      textArea.focus();
    }
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    return !!successful;
  } catch (fallbackErr) {
    console.error('Khong the copy vao clipboard qua fallback:', fallbackErr);
    return false;
  } finally {
    if (textArea && textArea.parentNode) {
      textArea.parentNode.removeChild(textArea);
    }
    if (prevActive && document.contains(prevActive)) {
      try {
        prevActive.focus({ preventScroll: true });
      } catch {
        // Bo qua neu element cu khong focus lai duoc
      }
    }
  }
}
