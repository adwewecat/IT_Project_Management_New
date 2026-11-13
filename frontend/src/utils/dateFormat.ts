/**
 * Bộ tiện ích chuẩn hóa và hiển thị Ngày / Tháng / Thời gian thống nhất toàn hệ thống.
 * Quy chuẩn chung:
 * - State nội bộ, API & Query Params: giữ nguyên chuẩn ISO (`YYYY-MM-DD`, `YYYY-MM`, `YYYY-MM-DDTHH:mm`) để tương thích 100% SQL Server / Backend.
 * - Hiển thị & nhập liệu cho người dùng: 100% theo chuẩn Việt Nam (`dd-mm-yyyy`, `dd-mm`, `mm-yyyy`, `dd-mm-yyyy HH:mm` 24h) — tuyệt đối không dùng `mm-dd` hay `mm/dd/yyyy`.
 */

export interface ParsedDateResult {
  isValid: boolean;
  /** Chuỗi ISO YYYY-MM-DD (hoặc '' nếu input rỗng) */
  iso?: string;
  /** Chuỗi hiển thị DD-MM-YYYY (hoặc '' nếu input rỗng) */
  display?: string;
  /** Thông báo lỗi tiếng Việt nếu không hợp lệ */
  error?: string;
}

export interface ParsedMonthResult {
  isValid: boolean;
  /** Chuỗi ISO YYYY-MM (hoặc '' nếu input rỗng) */
  iso?: string;
  /** Chuỗi hiển thị MM-YYYY (hoặc '' nếu input rỗng) */
  display?: string;
  /** Thông báo lỗi tiếng Việt nếu không hợp lệ */
  error?: string;
}

/** Đệm số thành 2 chữ số ('1' -> '01') */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Kiểm tra ngày/tháng/năm dương lịch có tồn tại thực tế hay không (tránh 30/02, 31/04...) */
export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return (
    check.getUTCFullYear() === year &&
    check.getUTCMonth() + 1 === month &&
    check.getUTCDate() === day
  );
}

/**
 * Phân tích chuỗi ngày nhập vào (hỗ trợ DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DDMMYYYY, YYYY-MM-DD)
 * Trả về cả chuẩn ISO (`YYYY-MM-DD`) lẫn chuẩn hiển thị (`DD-MM-YYYY`).
 * Luôn ưu tiên hiểu `XX-XX-YYYY` là `Ngày-Tháng-Năm`, không chấp nhận kiểu Mỹ `MM-DD-YYYY`.
 */
export function parseDateToIso(rawValue?: string | null): ParsedDateResult {
  const s = (rawValue || '').trim();
  if (!s) {
    return { isValid: true, iso: '', display: '' };
  }

  // Trường hợp 1: Định dạng ISO đứng đầu bằng năm 4 chữ số: YYYY-MM-DD hoặc YYYY/MM/DD (kể cả có time phía sau)
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidCalendarDate(year, month, day)) {
      return {
        isValid: false,
        error: 'Ngày không tồn tại trong lịch hoặc sai định dạng (dd-mm-yyyy).',
      };
    }
    const yyyy = String(year);
    const mm = pad2(month);
    const dd = pad2(day);
    return {
      isValid: true,
      iso: `${yyyy}-${mm}-${dd}`,
      display: `${dd}-${mm}-${yyyy}`,
    };
  }

  // Trường hợp 2: Định dạng Việt Nam có dấu phân cách: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (month > 12 && day >= 1 && day <= 12) {
      return {
        isValid: false,
        error: `Sai thứ tự Ngày-Tháng: vui lòng nhập theo dd-mm-yyyy (ví dụ: ${pad2(month)}-${pad2(day)}-${year}).`,
      };
    }
    if (!isValidCalendarDate(year, month, day)) {
      return {
        isValid: false,
        error: 'Ngày không tồn tại trong lịch (nhập đúng dạng dd-mm-yyyy).',
      };
    }
    const yyyy = String(year);
    const mm = pad2(month);
    const dd = pad2(day);
    return {
      isValid: true,
      iso: `${yyyy}-${mm}-${dd}`,
      display: `${dd}-${mm}-${yyyy}`,
    };
  }

  // Trường hợp 3: Nhập liền 8 chữ số DDMMYYYY (VD: 13112026)
  const compactMatch = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compactMatch) {
    const day = Number(compactMatch[1]);
    const month = Number(compactMatch[2]);
    const year = Number(compactMatch[3]);
    if (!isValidCalendarDate(year, month, day)) {
      return {
        isValid: false,
        error: 'Ngày không tồn tại trong lịch (8 số liền dạng ddmmyyyy).',
      };
    }
    const yyyy = String(year);
    const mm = pad2(month);
    const dd = pad2(day);
    return {
      isValid: true,
      iso: `${yyyy}-${mm}-${dd}`,
      display: `${dd}-${mm}-${yyyy}`,
    };
  }

  return {
    isValid: false,
    error: 'Định dạng không hợp lệ. Vui lòng nhập theo dd-mm-yyyy (VD: 13-11-2026).',
  };
}

/**
 * Định dạng giá trị ngày sang chuẩn `dd-mm-yyyy`.
 * Không dùng `new Date("YYYY-MM-DD")` trực tiếp trên chuỗi date-only để tránh lệch múi giờ UTC.
 */
export function formatDateDDMMYYYY(
  value?: string | Date | null,
  fallback = ''
): string {
  if (value === null || value === undefined) return fallback;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    return `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}-${value.getFullYear()}`;
  }

  const s = String(value).trim();
  if (!s) return fallback;

  // Chuỗi có phần ISO date ở đầu: YYYY-MM-DD... hoặc YYYY/MM/DD...
  const isoPrefix = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|T|\s)/);
  if (isoPrefix) {
    const year = Number(isoPrefix[1]);
    const month = Number(isoPrefix[2]);
    const day = Number(isoPrefix[3]);
    if (isValidCalendarDate(year, month, day)) {
      return `${pad2(day)}-${pad2(month)}-${year}`;
    }
  }

  // Chuỗi đã ở dạng DD-MM-YYYY hoặc DD/MM/YYYY hoặc DD.MM.YYYY
  const dmyPrefix = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:$|\s)/);
  if (dmyPrefix) {
    const day = Number(dmyPrefix[1]);
    const month = Number(dmyPrefix[2]);
    const year = Number(dmyPrefix[3]);
    if (isValidCalendarDate(year, month, day)) {
      return `${pad2(day)}-${pad2(month)}-${year}`;
    }
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return `${pad2(parsed.getDate())}-${pad2(parsed.getMonth() + 1)}-${parsed.getFullYear()}`;
  }

  return s;
}

/**
 * Định dạng rút gọn ngày-tháng sang chuẩn `dd-mm` (VD: '2026-11-01' -> '01-11').
 * Dùng cho các badge, pill, biểu đồ ngắn gọn thay thế `.slice(5)` vốn bị ngược thành `mm-dd`.
 */
export function formatDateDDMM(
  value?: string | Date | null,
  fallback = ''
): string {
  if (value === null || value === undefined) return fallback;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    return `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}`;
  }

  const s = String(value).trim();
  if (!s) return fallback;

  const full = formatDateDDMMYYYY(s, '');
  const match = full.match(/^(\d{2})-(\d{2})-\d{4}$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }

  // Trường hợp đặc biệt chỉ truyền 'MM-DD' hoặc 'MM/DD' không năm (hiếm)
  return s;
}

/**
 * Định dạng ngày + giờ 24h sang chuẩn `dd-mm-yyyy HH:mm` (hoặc kèm giây `dd-mm-yyyy HH:mm:ss`).
 * Với chuỗi naive ISO từ Backend (không có hậu tố 'Z' hoặc múi giờ), giữ nguyên số giờ hệ thống trả về.
 */
export function formatDateTimeDDMMYYYY(
  value?: string | Date | null,
  options?: {
    includeSeconds?: boolean;
    fallback?: string;
    separator?: string;
  }
): string {
  const includeSeconds = options?.includeSeconds ?? false;
  const fallback = options?.fallback ?? '';
  const separator = options?.separator ?? ' ';

  if (value === null || value === undefined) return fallback;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    const datePart = `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}-${value.getFullYear()}`;
    const timePart = includeSeconds
      ? `${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`
      : `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
    return `${datePart}${separator}${timePart}`;
  }

  const s = String(value).trim();
  if (!s) return fallback;

  // Chuỗi naive ISO: YYYY-MM-DD[T ]HH:mm(:ss)? (không có Z hoặc +/-offset ở cuối)
  const naiveMatch = s.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\.\d+)?$/
  );
  if (naiveMatch) {
    const year = Number(naiveMatch[1]);
    const month = Number(naiveMatch[2]);
    const day = Number(naiveMatch[3]);
    const hh = pad2(Number(naiveMatch[4]));
    const mm = pad2(Number(naiveMatch[5]));
    const ss = naiveMatch[6] !== undefined ? pad2(Number(naiveMatch[6])) : '00';
    if (isValidCalendarDate(year, month, day)) {
      const datePart = `${pad2(day)}-${pad2(month)}-${year}`;
      const timePart = includeSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
      return `${datePart}${separator}${timePart}`;
    }
  }

  // Nếu có Z hoặc offset múi giờ -> parse Date sang local time
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    // Kiểm tra xem chuỗi có chứa phần giờ hay chỉ là ngày
    if (!/[T\s]\d{1,2}:\d{2}/.test(s)) {
      return formatDateDDMMYYYY(s, fallback);
    }
    return formatDateTimeDDMMYYYY(parsed, options);
  }

  return formatDateDDMMYYYY(s, fallback);
}

/**
 * Định dạng giờ + ngày ngắn gọn (`HH:mm dd-mm-yyyy`) thường dùng cho badge hoàn thành / lịch sử.
 */
export function formatTimeDateDDMMYYYY(
  value?: string | Date | null,
  fallback = ''
): string {
  const formatted = formatDateTimeDDMMYYYY(value, { fallback: '' });
  if (!formatted) return fallback;
  const parts = formatted.split(' ');
  if (parts.length === 2) {
    return `${parts[1]} ${parts[0]}`;
  }
  return formatted;
}

/**
 * Định dạng tháng từ ISO `YYYY-MM` sang `mm-yyyy` (VD: '2026-11' -> '11-2026').
 */
export function formatMonthMMYYYY(value?: string | null, fallback = ''): string {
  const s = (value || '').trim();
  if (!s) return fallback;

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    if (month >= 1 && month <= 12) {
      return `${pad2(month)}-${year}`;
    }
  }

  const mmyyyyMatch = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (mmyyyyMatch) {
    const month = Number(mmyyyyMatch[1]);
    const year = Number(mmyyyyMatch[2]);
    if (month >= 1 && month <= 12) {
      return `${pad2(month)}-${year}`;
    }
  }

  return s;
}

/**
 * Phân tích chuỗi tháng nhập vào (`MM-YYYY`, `MM/YYYY`, `YYYY-MM`, `MMYYYY`) -> `{ iso: 'YYYY-MM', display: 'MM-YYYY' }`.
 */
export function parseMonthToIso(rawValue?: string | null): ParsedMonthResult {
  const s = (rawValue || '').trim();
  if (!s) return { isValid: true, iso: '', display: '' };

  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    if (year < 1900 || year > 2100 || month < 1 || month > 12) {
      return { isValid: false, error: 'Tháng/Năm không hợp lệ (nhập dạng mm-yyyy).' };
    }
    return {
      isValid: true,
      iso: `${year}-${pad2(month)}`,
      display: `${pad2(month)}-${year}`,
    };
  }

  const myMatch = s.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (myMatch) {
    const month = Number(myMatch[1]);
    const year = Number(myMatch[2]);
    if (year < 1900 || year > 2100 || month < 1 || month > 12) {
      return { isValid: false, error: 'Tháng/Năm không hợp lệ (nhập dạng mm-yyyy, VD: 11-2026).' };
    }
    return {
      isValid: true,
      iso: `${year}-${pad2(month)}`,
      display: `${pad2(month)}-${year}`,
    };
  }

  const compactMatch = s.match(/^(\d{2})(\d{4})$/);
  if (compactMatch) {
    const month = Number(compactMatch[1]);
    const year = Number(compactMatch[2]);
    if (year < 1900 || year > 2100 || month < 1 || month > 12) {
      return { isValid: false, error: 'Tháng/Năm không hợp lệ (6 số mmyyyy).' };
    }
    return {
      isValid: true,
      iso: `${year}-${pad2(month)}`,
      display: `${pad2(month)}-${year}`,
    };
  }

  return {
    isValid: false,
    error: 'Định dạng tháng không hợp lệ. Vui lòng nhập mm-yyyy (VD: 11-2026).',
  };
}

/** Lấy ngày hôm nay theo giờ máy người dùng dạng ISO `YYYY-MM-DD` */
export function getTodayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Lấy tháng hiện tại theo giờ máy người dùng dạng ISO `YYYY-MM` */
export function getCurrentIsoMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

/** Định dạng giờ chuẩn 24h theo locale Việt Nam (`HH:mm:ss` hoặc `HH:mm`) */
export function formatTime24hVN(value: Date | string = new Date(), withSeconds = true): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString('vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

/** Định dạng ngày chuẩn `dd-mm-yyyy` bằng separator `-` từ các hàm `.toLocaleDateString` cũ */
export function formatDateVN(value?: string | Date | null, fallback = ''): string {
  return formatDateDDMMYYYY(value, fallback);
}

/** Chuyển mọi chuỗi ngày ISO `YYYY-MM-DD` xuất hiện trong thông báo văn bản sang `dd-mm-yyyy` */
export function formatIsoDatesInText(text?: string | null): string {
  if (!text) return '';
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_m, y, m, d) =>
    isValidCalendarDate(Number(y), Number(m), Number(d)) ? `${d}-${m}-${y}` : _m
  );
}
