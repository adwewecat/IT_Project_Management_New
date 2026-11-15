import axios from 'axios';

/**
 * Trích xuất thông báo lỗi chi tiết từ Axios Error response của FastAPI backend.
 * Hỗ trợ:
 * - Chuỗi detail đơn giản: `detail: "Lỗi..."`
 * - Danh sách ValidationError của Pydantic: `detail: [{loc: [...], msg: "...", type: "..."}]`
 * - Object detail: `{ message: "..." }`
 * - Fallback về error.message hoặc String(err)
 */
export function extractApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item: any) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const loc = Array.isArray(item.loc) ? item.loc.slice(-1)[0] : '';
            const msg = item.msg || item.message || JSON.stringify(item);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(item);
        })
        .join('; ');
    }
    if (detail && typeof detail === 'object') {
      return (detail as any).message || (detail as any).msg || JSON.stringify(detail);
    }
    const dataMessage = err.response?.data?.message;
    if (typeof dataMessage === 'string') {
      return dataMessage;
    }
    if (err.message) {
      return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

/** Tính ngày Thứ Hai của tuần chứa chuỗi ngày ISO `YYYY-MM-DD` (UTC an toàn) */
export function getMondayOfIso(isoStr: string): string {
  const parts = isoStr.split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const day = dt.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setUTCDate(dt.getUTCDate() + diff);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Cộng hoặc trừ ngày từ chuỗi ngày ISO `YYYY-MM-DD` (UTC an toàn) */
export function addDaysToIso(isoStr: string, days: number): string {
  const parts = isoStr.split('-').map(Number);
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
    dt.getUTCDate()
  ).padStart(2, '0')}`;
}
