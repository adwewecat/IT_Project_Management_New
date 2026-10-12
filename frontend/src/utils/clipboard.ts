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
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Dam bao textarea khong lam lech trang va vo hinh
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-999999px';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!successful;
  } catch (fallbackErr) {
    console.error('Khong the copy vao clipboard qua fallback:', fallbackErr);
    return false;
  }
}
