# -*- coding: utf-8 -*-
"""
Service nghiệp vụ cho phân hệ Báo Cáo GPMS:
- Đọc & phân tích file Excel xuất từ GPMS (ChiTietCongViec_*.xlsx) bằng openpyxl read_only.
- Nén & giải nén payload ticket lưu trong SQL Server (không phụ thuộc file ổ đĩa khi deploy).
- Phân loại SLA 5 trạng thái, tổng hợp Top Người Gửi / Người Nhận (3 màu YCHT),
  so sánh Vùng Miền (Nam / Bắc), Phân loại công việc và Danh mục công việc (DMCV cấp 1 -> cấp 2).
"""

from __future__ import annotations

import base64
import glob
import gzip
import json
import os
import re
from datetime import date, datetime, time
from io import BytesIO
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple, Union

import openpyxl
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.gpms_report import GpmsRegionConfig, GpmsReportBatch
from app.models.user import User

# Thứ tự các trường khi nén danh sách dict thành tuple gọn nhẹ trong DB
TICKET_FIELDS: Tuple[str, ...] = (
    "code",
    "title",
    "status",
    "loai",
    "phan_loai",
    "creator",
    "creator_name",
    "creator_dept",
    "assignee",
    "assignee_name",
    "dmcv1",
    "dmcv2",
    "priority",
    "created_iso",
    "ycht_iso",
    "httt_iso",
)

# Bộ đệm RAM theo (batch_id, total_rows, file_name) giúp lọc đa chiều < 30ms
_BATCH_MEMORY_CACHE: Dict[Tuple[int, int, str], List[Dict[str, str]]] = {}

# Tên cột chuẩn trên dòng Header Excel GPMS (hỗ trợ khớp linh hoạt nếu lệch vị trí)
HEADER_ALIASES: Dict[str, Tuple[str, ...]] = {
    "code": ("Mã nhiệm vụ",),
    "title": ("Nhiệm vụ",),
    "status": ("Trạng thái",),
    "loai": ("Loại công việc",),
    "phan_loai": ("Phân loại",),
    "creator": ("User người tạo",),
    "creator_name": ("Tên người tạo",),
    "creator_dept": ("Bộ phận/Nhà hàng người tạo", "Phòng ban/Thương hiệu người tạo"),
    "assignee": ("User người xử lý",),
    "assignee_name": ("Tên người xử lý",),
    "dmcv1": ("Tên DMCV cấp 1",),
    "dmcv2": ("Tên DMCV cấp 2",),
    "priority": ("Độ ưu tiên",),
    "created_date": ("Ngày tạo",),
    "created_time": ("Giờ tạo",),
    "ycht_date": ("Ngày YCHT",),
    "ycht_time": ("Giờ YCHT",),
    "httt_date": ("Ngày HTTT",),
    "httt_time": ("Giờ HTTT",),
}

DEFAULT_COL_INDEX: Dict[str, int] = {
    "code": 0,
    "title": 1,
    "status": 3,
    "loai": 7,
    "phan_loai": 8,
    "creator": 11,
    "creator_name": 13,
    "creator_dept": 17,
    "assignee": 18,
    "assignee_name": 20,
    "dmcv1": 28,
    "dmcv2": 29,
    "created_date": 36,
    "created_time": 37,
    "ycht_date": 38,
    "ycht_time": 39,
    "httt_date": 40,
    "httt_time": 41,
    "priority": 42,
}


def get_report_folder_path() -> str:
    """Xác định đường dẫn tuyệt đối tới thư mục REPORT/ ở gốc dự án."""
    # service file nằm tại backend/app/services/gpms_report_service.py -> lùi 3 cấp để ra gốc
    services_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(services_dir, "..", "..", ".."))
    return os.path.join(project_root, "REPORT")


def list_available_report_files() -> List[str]:
    """Liệt kê tên các file Excel .xlsx hiện có trong thư mục REPORT/."""
    report_dir = get_report_folder_path()
    if not os.path.isdir(report_dir):
        return []
    files = []
    for fp in glob.glob(os.path.join(report_dir, "*.xlsx")):
        name = os.path.basename(fp)
        if not name.startswith("~$"):
            files.append(name)
    files.sort(reverse=True)
    return files


def extract_export_datetime_from_filename(filename: str) -> Optional[datetime]:
    """
    Trích xuất ngày giờ xuất file từ tên file GPMS chuẩn:
    Ví dụ: ChiTietCongViec_Tháng_10_2026_NgayXuat_14112026_094720.xlsx -> 2026-11-14 09:47:20
    """
    if not filename:
        return None
    m = re.search(r"NgayXuat_(\d{2})(\d{2})(\d{4})_(\d{2})(\d{2})(\d{2})", filename, re.IGNORECASE)
    if not m:
        return None
    try:
        day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
        hour, minute, second = int(m.group(4)), int(m.group(5)), int(m.group(6))
        return datetime(year, month, day, hour, minute, second)
    except ValueError:
        return None


def extract_period_label(metadata_rows: List[Tuple[Any, ...]], filename: str) -> str:
    """Lấy nhãn kỳ báo cáo (ví dụ: Tháng 10-2026) từ dòng metadata hoặc tên file."""
    for row in metadata_rows:
        for cell in row:
            if not cell:
                continue
            txt = str(cell).strip()
            if txt.lower().startswith("tháng:") or txt.lower().startswith("thang:"):
                val = txt.split(":", 1)[1].strip()
                if val:
                    return f"Tháng {val}"
    m = re.search(r"Th[aá]ng[_ ](\d{1,2})[_-](\d{4})", filename, re.IGNORECASE)
    if m:
        return f"Tháng {m.group(1)}-{m.group(2)}"
    return "Báo cáo GPMS"


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def _parse_date_part(val: Any) -> Optional[Tuple[int, int, int, Optional[Tuple[int, int, int]]]]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return (val.year, val.month, val.day, (val.hour, val.minute, val.second))
    if isinstance(val, date):
        return (val.year, val.month, val.day, None)
    s = str(val).strip()
    if not s:
        return None
    # Hỗ trợ DD/MM/YYYY hoặc DD-MM-YYYY kèm giờ tùy chọn
    m_dmy = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$", s)
    if m_dmy:
        d, m, y = int(m_dmy.group(1)), int(m_dmy.group(2)), int(m_dmy.group(3))
        tm = None
        if m_dmy.group(4) is not None:
            tm = (int(m_dmy.group(4)), int(m_dmy.group(5) or 0), int(m_dmy.group(6) or 0))
        return (y, m, d, tm)
    m_ymd = re.match(r"^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$", s)
    if m_ymd:
        y, m, d = int(m_ymd.group(1)), int(m_ymd.group(2)), int(m_ymd.group(3))
        tm = None
        if m_ymd.group(4) is not None:
            tm = (int(m_ymd.group(4)), int(m_ymd.group(5) or 0), int(m_ymd.group(6) or 0))
        return (y, m, d, tm)
    return None


def _parse_time_part(val: Any) -> Optional[Tuple[int, int, int]]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return (val.hour, val.minute, val.second)
    if isinstance(val, time):
        return (val.hour, val.minute, val.second)
    s = str(val).strip()
    if not s:
        return None
    m = re.match(r"^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$", s)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3) or 0))
    return None


def combine_gpms_datetime_iso(date_val: Any, time_val: Any, default_end_of_day: bool = True) -> str:
    """Kết hợp Ngày + Giờ trong file GPMS thành chuỗi ISO YYYY-MM-DDTHH:MM:SS để so sánh nhanh."""
    dp = _parse_date_part(date_val)
    if not dp:
        return ""
    y, m, d, embedded_t = dp
    tp = _parse_time_part(time_val) or embedded_t
    if tp is None:
        hh, mm, ss = (23, 59, 59) if default_end_of_day else (0, 0, 0)
    else:
        hh, mm, ss = tp
    return f"{y:04d}-{m:02d}-{d:02d}T{hh:02d}:{mm:02d}:{ss:02d}"


def _resolve_column_map(header_row: Tuple[Any, ...]) -> Dict[str, int]:
    """Ánh xạ tên cột sang chỉ mục 0-based dựa trên dòng header, có fallback vị trí chuẩn."""
    normalized_lookup: Dict[str, int] = {}
    for idx, cell in enumerate(header_row):
        if cell is not None:
            normalized_lookup[str(cell).strip().lower()] = idx

    col_map: Dict[str, int] = {}
    for field_key, aliases in HEADER_ALIASES.items():
        found_idx: Optional[int] = None
        for alias in aliases:
            candidate = normalized_lookup.get(alias.lower())
            if candidate is not None:
                found_idx = candidate
                break
        if found_idx is None:
            found_idx = DEFAULT_COL_INDEX[field_key]
        col_map[field_key] = found_idx
    return col_map


def parse_gpms_excel_file(
    file_source: Union[str, bytes],
    original_filename: str = "GPMS_Report.xlsx",
) -> Dict[str, Any]:
    """
    Đọc file Excel báo cáo GPMS (hỗ trợ đường dẫn file hoặc bytes tải lên từ Web).
    Dùng chế độ read_only=True, data_only=True và luôn đóng workbook để tránh rò rỉ tài nguyên.
    """
    wb_input: Any = BytesIO(file_source) if isinstance(file_source, (bytes, bytearray)) else file_source
    wb = openpyxl.load_workbook(wb_input, read_only=True, data_only=True)
    try:
        ws = wb["Công việc"] if "Công việc" in wb.sheetnames else wb.active
        row_iter = ws.iter_rows(values_only=True)

        preview_rows: List[Tuple[Any, ...]] = []
        header_idx = -1
        for i in range(10):
            try:
                r = next(row_iter)
            except StopIteration:
                break
            preview_rows.append(r)
            if r:
                cells_lower = {str(c).strip().lower() for c in r if c is not None}
                if "mã nhiệm vụ" in cells_lower and "trạng thái" in cells_lower:
                    header_idx = i
                    break

        if header_idx < 0:
            raise ValueError("File Excel không đúng định dạng GPMS (thiếu cột 'Mã nhiệm vụ' hoặc 'Trạng thái').")

        header_row = preview_rows[header_idx]
        col_map = _resolve_column_map(header_row)

        # Kiểm tra xem dòng kế tiếp có phải dòng sub-header gộp ô hay đã là dữ liệu
        buffered_rows: List[Tuple[Any, ...]] = []
        try:
            next_r = next(row_iter)
            first_code = _clean_str(next_r[col_map["code"]]) if len(next_r) > col_map["code"] else ""
            first_status = _clean_str(next_r[col_map["status"]]) if len(next_r) > col_map["status"] else ""
            # Dòng sub-header trong mẫu GPMS để trống cả Mã nhiệm vụ và Trạng thái
            if first_code or first_status:
                buffered_rows.append(next_r)
        except StopIteration:
            pass

        period_label = extract_period_label(preview_rows[:header_idx], original_filename)
        export_at = extract_export_datetime_from_filename(original_filename)

        def _get(row_tuple: Tuple[Any, ...], key: str) -> Any:
            idx = col_map[key]
            return row_tuple[idx] if idx < len(row_tuple) else None

        tickets: List[Dict[str, str]] = []
        senders_set: Set[str] = set()
        receivers_set: Set[str] = set()

        def _consume_row(r: Tuple[Any, ...]) -> None:
            if not r:
                return
            code = _clean_str(_get(r, "code"))
            status = _clean_str(_get(r, "status"))
            if not code and not status:
                return
            creator = _clean_str(_get(r, "creator")) or "Anonymous"
            creator_name = _clean_str(_get(r, "creator_name")) or creator
            assignee = _clean_str(_get(r, "assignee")) or "(Chưa gán)"
            assignee_name = _clean_str(_get(r, "assignee_name")) or assignee
            dmcv1 = _clean_str(_get(r, "dmcv1")) or "Chưa gắn DMCV"
            raw_dmcv2 = _clean_str(_get(r, "dmcv2"))
            dmcv2 = raw_dmcv2 if raw_dmcv2 else ("Chưa gắn DMCV" if dmcv1 == "Chưa gắn DMCV" else "Chưa phân DMCV cấp 2")

            senders_set.add(creator.lower())
            receivers_set.add(assignee.lower())

            tickets.append({
                "code": code,
                "title": _clean_str(_get(r, "title")),
                "status": status or "Chưa hoàn thành",
                "loai": _clean_str(_get(r, "loai")) or "Khác",
                "phan_loai": _clean_str(_get(r, "phan_loai")) or "Chưa phân loại",
                "creator": creator,
                "creator_name": creator_name,
                "creator_dept": _clean_str(_get(r, "creator_dept")),
                "assignee": assignee,
                "assignee_name": assignee_name,
                "dmcv1": dmcv1,
                "dmcv2": dmcv2,
                "priority": _clean_str(_get(r, "priority")) or "Trung bình",
                "created_iso": combine_gpms_datetime_iso(_get(r, "created_date"), _get(r, "created_time"), default_end_of_day=False),
                "ycht_iso": combine_gpms_datetime_iso(_get(r, "ycht_date"), _get(r, "ycht_time"), default_end_of_day=True),
                "httt_iso": combine_gpms_datetime_iso(_get(r, "httt_date"), _get(r, "httt_time"), default_end_of_day=False),
            })

        for br in buffered_rows:
            _consume_row(br)
        for r in row_iter:
            _consume_row(r)

        if not tickets:
            raise ValueError("File Excel không có dòng dữ liệu công việc nào hợp lệ.")

        return {
            "period_label": period_label,
            "export_at": export_at,
            "total_rows": len(tickets),
            "unique_senders": len(senders_set),
            "unique_receivers": len(receivers_set),
            "tickets": tickets,
        }
    finally:
        wb.close()


def compress_tickets_payload(tickets: List[Dict[str, str]]) -> str:
    """Nén danh sách ticket dạng mảng vị trí + gzip + base64 để lưu SQL Server gọn nhẹ."""
    compact_rows = [[t.get(k, "") for k in TICKET_FIELDS] for t in tickets]
    raw_bytes = json.dumps(compact_rows, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    gz_bytes = gzip.compress(raw_bytes, compresslevel=6)
    return base64.b64encode(gz_bytes).decode("ascii")


def decompress_tickets_payload(payload_b64: str) -> List[Dict[str, str]]:
    """Giải nén payload từ SQL Server thành danh sách dict chuẩn."""
    if not payload_b64:
        return []
    gz_bytes = base64.b64decode(payload_b64.encode("ascii"))
    raw_json = gzip.decompress(gz_bytes).decode("utf-8")
    compact_rows = json.loads(raw_json)
    tickets: List[Dict[str, str]] = []
    field_count = len(TICKET_FIELDS)
    for row in compact_rows:
        item = {}
        for i in range(field_count):
            item[TICKET_FIELDS[i]] = row[i] if i < len(row) else ""
        tickets.append(item)
    return tickets


def classify_ticket_sla(
    status: str,
    ycht_iso: str,
    httt_iso: str,
    ref_dt: Union[datetime, str],
) -> str:
    """
    Phân loại ticket vào đúng 1 trong 5 tiêu chí SLA:
    - da_huy: Trạng thái là 'Đã hủy'
    - ht_dung_han: 'Đã hoàn thành' và HTTT <= YCHT
    - ht_tre_han: 'Đã hoàn thành' và HTTT > YCHT
    - chua_ht_tre_han: Chưa hoàn thành và mốc tham chiếu > YCHT
    - chua_ht_chua_tre: Chưa hoàn thành và mốc tham chiếu <= YCHT
    """
    st_lower = (status or "").strip().lower()
    if "hủy" in st_lower or "huy" in st_lower:
        return "da_huy"

    ref_iso = ref_dt.strftime("%Y-%m-%dT%H:%M:%S") if isinstance(ref_dt, datetime) else str(ref_dt or "")
    if "hoàn thành" in st_lower and not st_lower.startswith("chưa"):
        if httt_iso and ycht_iso:
            return "ht_dung_han" if httt_iso <= ycht_iso else "ht_tre_han"
        return "ht_dung_han"

    if ycht_iso and ref_iso > ycht_iso:
        return "chua_ht_tre_han"
    return "chua_ht_chua_tre"


def _empty_counters() -> Dict[str, int]:
    return {
        "total": 0,
        "ht_dung_han": 0,
        "ht_tre_han": 0,
        "chua_ht_chua_tre": 0,
        "chua_ht_tre_han": 0,
        "da_huy": 0,
    }


def _bump_counter(bucket: Dict[str, int], sla_key: str) -> None:
    bucket["total"] += 1
    bucket[sla_key] += 1


def _finalize_3color_metrics(c: Dict[str, int]) -> Dict[str, Any]:
    overdue_ycht = c["ht_tre_han"] + c["chua_ht_tre_han"]
    on_time_ycht = c["ht_dung_han"] + c["chua_ht_chua_tre"]
    cancelled = c["da_huy"]
    active_base = overdue_ycht + on_time_ycht
    on_time_rate = round((on_time_ycht / active_base * 100.0), 1) if active_base > 0 else 0.0
    return {
        "total": c["total"],
        "overdue_ycht": overdue_ycht,
        "on_time_ycht": on_time_ycht,
        "cancelled": cancelled,
        "ht_dung_han": c["ht_dung_han"],
        "ht_tre_han": c["ht_tre_han"],
        "chua_ht_chua_tre": c["chua_ht_chua_tre"],
        "chua_ht_tre_han": c["chua_ht_tre_han"],
        "da_huy": c["da_huy"],
        "on_time_rate": on_time_rate,
    }


def compute_gpms_analytics(
    tickets: List[Dict[str, str]],
    export_at: Optional[datetime],
    south_usernames: Iterable[str],
    ref_mode: str = "export",
    include_anonymous: bool = True,
    include_unassigned_dmcv: bool = True,
    sla_status_filter: Optional[str] = None,
    sender_filter: Optional[str] = None,
    receiver_filter: Optional[str] = None,
    region_filter: Optional[str] = None,
    phan_loai_filter: Optional[str] = None,
    dmcv1_filter: Optional[str] = None,
    dmcv2_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Tính toàn bộ chỉ số đa chiều cho Báo Cáo GPMS từ danh sách ticket đã nạp.
    Mọi chiều đều hỗ trợ lọc chéo (cross-filtering) đồng bộ theo thời gian thực.
    """
    ref_dt = export_at if (ref_mode == "export" and export_at is not None) else datetime.now()
    ref_iso = ref_dt.strftime("%Y-%m-%dT%H:%M:%S")
    south_set = {u.strip().lower() for u in south_usernames if u and u.strip()}

    s_filter_clean = sender_filter.strip().lower() if sender_filter and sender_filter.strip() else None
    r_filter_clean = receiver_filter.strip().lower() if receiver_filter and receiver_filter.strip() else None
    reg_filter_clean = region_filter.strip().upper() if region_filter and region_filter.strip() else None
    pl_filter_clean = phan_loai_filter.strip() if phan_loai_filter and phan_loai_filter.strip() else None
    d1_filter_clean = dmcv1_filter.strip() if dmcv1_filter and dmcv1_filter.strip() else None
    d2_filter_clean = dmcv2_filter.strip() if dmcv2_filter and dmcv2_filter.strip() else None
    sla_filter_clean = sla_status_filter.strip() if sla_status_filter and sla_status_filter.strip() else None
    q_clean = search.strip().lower() if search and search.strip() else None

    anonymous_count = 0
    unassigned_dmcv_count = 0

    sla_totals = _empty_counters()
    senders_map: Dict[str, Dict[str, Any]] = {}
    receivers_map: Dict[str, Dict[str, Any]] = {}
    phan_loai_map: Dict[str, Dict[str, int]] = {}
    dmcv1_map: Dict[str, Dict[str, Any]] = {}
    dmcv2_map: Dict[str, Dict[str, int]] = {}
    region_totals = {"NAM": _empty_counters(), "BAC": _empty_counters()}

    for t in tickets:
        creator = t["creator"]
        creator_lower = creator.lower()
        is_anon = creator_lower == "anonymous"
        is_unassigned_dmcv = t["dmcv1"] == "Chưa gắn DMCV"

        assignee = t["assignee"]
        assignee_lower = assignee.lower()
        region = "NAM" if assignee_lower in south_set else "BAC"

        sla_key = classify_ticket_sla(t["status"], t["ycht_iso"], t["httt_iso"], ref_iso)

        # Áp dụng các bộ lọc chéo (trừ toggle Anonymous/DMCV rỗng để đếm badge trước)
        if s_filter_clean and creator_lower != s_filter_clean:
            continue
        if r_filter_clean and assignee_lower != r_filter_clean:
            continue
        if reg_filter_clean in ("NAM", "BAC") and region != reg_filter_clean:
            continue
        if pl_filter_clean and t["phan_loai"] != pl_filter_clean:
            continue
        if d1_filter_clean and t["dmcv1"] != d1_filter_clean:
            continue
        if d2_filter_clean and t["dmcv2"] != d2_filter_clean:
            continue
        if sla_filter_clean:
            if sla_filter_clean == "overdue_ycht":
                if sla_key not in ("ht_tre_han", "chua_ht_tre_han"):
                    continue
            elif sla_filter_clean == "on_time_ycht":
                if sla_key not in ("ht_dung_han", "chua_ht_chua_tre"):
                    continue
            elif sla_key != sla_filter_clean:
                continue
        if q_clean:
            haystack = (
                f"{t['code']} {t['title']} {creator} {t['creator_name']} "
                f"{assignee} {t['assignee_name']} {t['phan_loai']} {t['dmcv1']} {t['dmcv2']}"
            ).lower()
            if q_clean not in haystack:
                continue

        if is_anon:
            anonymous_count += 1
        if is_unassigned_dmcv:
            unassigned_dmcv_count += 1

        if not include_anonymous and is_anon:
            continue
        if not include_unassigned_dmcv and is_unassigned_dmcv:
            continue

        # 1. Tổng SLA
        _bump_counter(sla_totals, sla_key)

        # 2. Người gửi yêu cầu (creator)
        s_entry = senders_map.get(creator_lower)
        if s_entry is None:
            s_entry = {
                "username": creator,
                "full_name": t["creator_name"] or creator,
                "counts": _empty_counters(),
            }
            senders_map[creator_lower] = s_entry
        _bump_counter(s_entry["counts"], sla_key)

        # 3. Người xử lý (assignee)
        r_entry = receivers_map.get(assignee_lower)
        if r_entry is None:
            r_entry = {
                "username": assignee,
                "full_name": t["assignee_name"] or assignee,
                "region": region,
                "counts": _empty_counters(),
            }
            receivers_map[assignee_lower] = r_entry
        _bump_counter(r_entry["counts"], sla_key)

        # 4. Vùng miền
        _bump_counter(region_totals[region], sla_key)

        # 5. Phân loại công việc
        pl_name = t["phan_loai"]
        pl_bucket = phan_loai_map.get(pl_name)
        if pl_bucket is None:
            pl_bucket = _empty_counters()
            phan_loai_map[pl_name] = pl_bucket
        _bump_counter(pl_bucket, sla_key)

        # 6. Danh mục công việc cấp 1 & cấp 2
        d1_name = t["dmcv1"]
        d2_name = t["dmcv2"]
        d1_entry = dmcv1_map.get(d1_name)
        if d1_entry is None:
            d1_entry = {"counts": _empty_counters(), "children": {}}
            dmcv1_map[d1_name] = d1_entry
        _bump_counter(d1_entry["counts"], sla_key)

        d2_child_bucket = d1_entry["children"].get(d2_name)
        if d2_child_bucket is None:
            d2_child_bucket = _empty_counters()
            d1_entry["children"][d2_name] = d2_child_bucket
        _bump_counter(d2_child_bucket, sla_key)

        d2_global = dmcv2_map.get(d2_name)
        if d2_global is None:
            d2_global = _empty_counters()
            dmcv2_map[d2_name] = d2_global
        _bump_counter(d2_global, sla_key)

    total_filtered = sla_totals["total"]

    # Định dạng SLA tổng hợp
    sla_metrics = _finalize_3color_metrics(sla_totals)
    completed_total = sla_totals["ht_dung_han"] + sla_totals["ht_tre_han"]
    active_non_cancel = max(1, total_filtered - sla_totals["da_huy"])
    sla_summary = {
        **sla_metrics,
        "overdue_rate": round((sla_metrics["overdue_ycht"] / active_non_cancel * 100.0), 1) if total_filtered > 0 else 0.0,
        "completion_rate": round((completed_total / active_non_cancel * 100.0), 1) if total_filtered > 0 else 0.0,
    }

    # Sắp xếp Top Senders
    senders_list: List[Dict[str, Any]] = []
    for entry in senders_map.values():
        c = entry["counts"]
        senders_list.append({
            "username": entry["username"],
            "full_name": entry["full_name"],
            "total": c["total"],
            "percentage": round((c["total"] / total_filtered * 100.0), 1) if total_filtered > 0 else 0.0,
            "ht_dung_han": c["ht_dung_han"],
            "ht_tre_han": c["ht_tre_han"],
            "chua_ht_chua_tre": c["chua_ht_chua_tre"],
            "chua_ht_tre_han": c["chua_ht_tre_han"],
            "da_huy": c["da_huy"],
        })
    senders_list.sort(key=lambda x: (-x["total"], x["username"].lower()))

    # Sắp xếp Top Receivers & chia vùng Nam / Bắc
    receivers_list: List[Dict[str, Any]] = []
    nam_users: List[Dict[str, Any]] = []
    bac_users: List[Dict[str, Any]] = []
    for entry in receivers_map.values():
        metrics = _finalize_3color_metrics(entry["counts"])
        item = {
            "username": entry["username"],
            "full_name": entry["full_name"],
            "region": entry["region"],
            "percentage": round((metrics["total"] / total_filtered * 100.0), 1) if total_filtered > 0 else 0.0,
            **metrics,
        }
        receivers_list.append(item)
        if entry["region"] == "NAM":
            nam_users.append(item)
        else:
            bac_users.append(item)

    receivers_list.sort(key=lambda x: (-x["total"], x["username"].lower()))
    nam_users.sort(key=lambda x: (-x["total"], x["username"].lower()))
    bac_users.sort(key=lambda x: (-x["total"], x["username"].lower()))

    def _build_region_stat(code: str, label: str, users_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        rm = _finalize_3color_metrics(region_totals[code])
        return {
            "region": code,
            "label": label,
            "percentage": round((rm["total"] / total_filtered * 100.0), 1) if total_filtered > 0 else 0.0,
            "user_count": len(users_list),
            **rm,
            "users": users_list,
        }

    regions = {
        "nam": _build_region_stat("NAM", "Miền Nam", nam_users),
        "bac": _build_region_stat("BAC", "Miền Bắc", bac_users),
    }

    # Phân loại công việc
    phan_loai_list: List[Dict[str, Any]] = []
    for name, c in phan_loai_map.items():
        m = _finalize_3color_metrics(c)
        phan_loai_list.append({
            "name": name,
            "percentage": round((m["total"] / total_filtered * 100.0), 1) if total_filtered > 0 else 0.0,
            **m,
        })
    phan_loai_list.sort(key=lambda x: (-x["total"], x["name"]))

    # DMCV cấp 1 (kèm top DMCV cấp 2 con)
    dmcv1_list: List[Dict[str, Any]] = []
    for name, d1_entry in dmcv1_map.items():
        m = _finalize_3color_metrics(d1_entry["counts"])
        d1_total = max(1, m["total"])
        children_formatted: List[Dict[str, Any]] = []
        for c_name, c_counts in d1_entry["children"].items():
            cm = _finalize_3color_metrics(c_counts)
            children_formatted.append({
                "name": c_name,
                "total": cm["total"],
                "percentage": round((cm["total"] / d1_total * 100.0), 1),
                "overdue_ycht": cm["overdue_ycht"],
                "on_time_ycht": cm["on_time_ycht"],
                "cancelled": cm["cancelled"],
            })
        children_formatted.sort(key=lambda x: (-x["total"], x["name"]))
        dmcv1_list.append({
            "name": name,
            "percentage": round((m["total"] / total_filtered * 100.0), 1) if total_filtered > 0 else 0.0,
            **m,
            "top_children": children_formatted[:15],
        })
    dmcv1_list.sort(key=lambda x: (-x["total"], x["name"]))

    # DMCV cấp 2 toàn cục (khi đã chọn DMCV1 hoặc xem tổng)
    dmcv2_list: List[Dict[str, Any]] = []
    for name, c in dmcv2_map.items():
        m = _finalize_3color_metrics(c)
        dmcv2_list.append({
            "name": name,
            "percentage": round((m["total"] / total_filtered * 100.0), 1) if total_filtered > 0 else 0.0,
            **m,
        })
    dmcv2_list.sort(key=lambda x: (-x["total"], x["name"]))

    return {
        "ref_mode": "export" if (ref_mode == "export" and export_at is not None) else "now",
        "ref_datetime_iso": ref_iso,
        "anonymous_count": anonymous_count,
        "unassigned_dmcv_count": unassigned_dmcv_count,
        "sla_summary": sla_summary,
        "senders": senders_list,
        "receivers": receivers_list,
        "regions": regions,
        "phan_loai_list": phan_loai_list,
        "dmcv1_list": dmcv1_list,
        "dmcv2_list": dmcv2_list,
    }


def filter_ticket_details(
    tickets: List[Dict[str, str]],
    export_at: Optional[datetime],
    south_usernames: Iterable[str],
    ref_mode: str = "export",
    include_anonymous: bool = True,
    include_unassigned_dmcv: bool = True,
    sla_status_filter: Optional[str] = None,
    sender_filter: Optional[str] = None,
    receiver_filter: Optional[str] = None,
    region_filter: Optional[str] = None,
    phan_loai_filter: Optional[str] = None,
    dmcv1_filter: Optional[str] = None,
    dmcv2_filter: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 30,
) -> Dict[str, Any]:
    """Lọc danh sách ticket chi tiết có phân trang phục vụ modal drill-down."""
    ref_dt = export_at if (ref_mode == "export" and export_at is not None) else datetime.now()
    ref_iso = ref_dt.strftime("%Y-%m-%dT%H:%M:%S")
    south_set = {u.strip().lower() for u in south_usernames if u and u.strip()}

    s_filter_clean = sender_filter.strip().lower() if sender_filter and sender_filter.strip() else None
    r_filter_clean = receiver_filter.strip().lower() if receiver_filter and receiver_filter.strip() else None
    reg_filter_clean = region_filter.strip().upper() if region_filter and region_filter.strip() else None
    pl_filter_clean = phan_loai_filter.strip() if phan_loai_filter and phan_loai_filter.strip() else None
    d1_filter_clean = dmcv1_filter.strip() if dmcv1_filter and dmcv1_filter.strip() else None
    d2_filter_clean = dmcv2_filter.strip() if dmcv2_filter and dmcv2_filter.strip() else None
    sla_filter_clean = sla_status_filter.strip() if sla_status_filter and sla_status_filter.strip() else None
    q_clean = search.strip().lower() if search and search.strip() else None

    matched: List[Dict[str, Any]] = []
    for t in tickets:
        creator = t["creator"]
        creator_lower = creator.lower()
        if not include_anonymous and creator_lower == "anonymous":
            continue
        if not include_unassigned_dmcv and t["dmcv1"] == "Chưa gắn DMCV":
            continue
        assignee_lower = t["assignee"].lower()
        region = "NAM" if assignee_lower in south_set else "BAC"
        sla_key = classify_ticket_sla(t["status"], t["ycht_iso"], t["httt_iso"], ref_iso)

        if s_filter_clean and creator_lower != s_filter_clean:
            continue
        if r_filter_clean and assignee_lower != r_filter_clean:
            continue
        if reg_filter_clean in ("NAM", "BAC") and region != reg_filter_clean:
            continue
        if pl_filter_clean and t["phan_loai"] != pl_filter_clean:
            continue
        if d1_filter_clean and t["dmcv1"] != d1_filter_clean:
            continue
        if d2_filter_clean and t["dmcv2"] != d2_filter_clean:
            continue
        if sla_filter_clean:
            if sla_filter_clean == "overdue_ycht":
                if sla_key not in ("ht_tre_han", "chua_ht_tre_han"):
                    continue
            elif sla_filter_clean == "on_time_ycht":
                if sla_key not in ("ht_dung_han", "chua_ht_chua_tre"):
                    continue
            elif sla_key != sla_filter_clean:
                continue
        if q_clean:
            haystack = (
                f"{t['code']} {t['title']} {creator} {t['creator_name']} "
                f"{t['assignee']} {t['assignee_name']} {t['phan_loai']} {t['dmcv1']} {t['dmcv2']}"
            ).lower()
            if q_clean not in haystack:
                continue

        matched.append({
            **t,
            "sla_status": sla_key,
            "region": region,
        })

    total = len(matched)
    start = max(0, (page - 1) * page_size)
    end = start + page_size
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": matched[start:end],
    }


def _get_cached_batch_tickets(batch: GpmsReportBatch) -> List[Dict[str, str]]:
    cache_key = (batch.id, batch.total_rows, batch.file_name)
    cached = _BATCH_MEMORY_CACHE.get(cache_key)
    if cached is not None:
        return cached
    tickets = decompress_tickets_payload(batch.payload_gzip_b64)
    # Giới hạn cache RAM tối đa 6 kỳ báo cáo gần nhất
    if len(_BATCH_MEMORY_CACHE) >= 6:
        oldest_key = next(iter(_BATCH_MEMORY_CACHE))
        _BATCH_MEMORY_CACHE.pop(oldest_key, None)
    _BATCH_MEMORY_CACHE[cache_key] = tickets
    return tickets


def save_gpms_batch_from_bytes(
    db: Session,
    file_bytes: bytes,
    filename: str,
    report_name: Optional[str] = None,
    source_type: str = "UPLOAD",
    uploaded_by: Optional[str] = None,
) -> GpmsReportBatch:
    """Phân tích file Excel và lưu thành một kỳ báo cáo mới vào SQL Server."""
    parsed = parse_gpms_excel_file(file_bytes, original_filename=filename)
    compressed = compress_tickets_payload(parsed["tickets"])
    clean_name = (report_name or "").strip()
    if not clean_name:
        clean_name = f"Báo Cáo GPMS — {parsed['period_label']}"

    batch = GpmsReportBatch(
        report_name=clean_name[:250],
        file_name=filename[:250],
        period_label=parsed["period_label"][:95],
        export_at=parsed["export_at"] or datetime.now(),
        total_rows=parsed["total_rows"],
        unique_senders=parsed["unique_senders"],
        unique_receivers=parsed["unique_receivers"],
        source_type=source_type,
        payload_gzip_b64=compressed,
        uploaded_by=uploaded_by,
        uploaded_at=datetime.now(),
        is_active=True,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    _BATCH_MEMORY_CACHE[(batch.id, batch.total_rows, batch.file_name)] = parsed["tickets"]
    return batch


def import_report_from_folder(
    db: Session,
    filename: Optional[str] = None,
    uploaded_by: Optional[str] = None,
) -> GpmsReportBatch:
    """Nạp file Excel từ thư mục REPORT/ của hệ thống vào cơ sở dữ liệu."""
    available = list_available_report_files()
    if not available:
        raise FileNotFoundError("Không tìm thấy file .xlsx nào trong thư mục REPORT/.")

    target_name = filename.strip() if filename and filename.strip() else available[0]
    if target_name not in available:
        raise FileNotFoundError(f"File '{target_name}' không tồn tại trong thư mục REPORT/.")

    full_path = os.path.join(get_report_folder_path(), target_name)
    with open(full_path, "rb") as f:
        raw_bytes = f.read()

    return save_gpms_batch_from_bytes(
        db=db,
        file_bytes=raw_bytes,
        filename=target_name,
        source_type="REPORT_FOLDER",
        uploaded_by=uploaded_by or "SYSTEM",
    )


def ensure_initial_batch_if_empty(db: Session, uploaded_by: Optional[str] = None) -> Optional[GpmsReportBatch]:
    """Tự động nạp file đầu tiên từ REPORT/ nếu DB chưa có kỳ báo cáo nào."""
    existing = db.scalar(
        select(GpmsReportBatch)
        .where(GpmsReportBatch.is_active == True)  # noqa: E712
        .order_by(desc(GpmsReportBatch.id))
        .limit(1)
    )
    if existing is not None:
        return existing
    if list_available_report_files():
        return import_report_from_folder(db, uploaded_by=uploaded_by)
    return None


def list_gpms_batches(db: Session) -> List[GpmsReportBatch]:
    """Liệt kê tất cả kỳ báo cáo GPMS đang hoạt động (mới nhất lên đầu)."""
    stmt = (
        select(GpmsReportBatch)
        .where(GpmsReportBatch.is_active == True)  # noqa: E712
        .order_by(desc(GpmsReportBatch.id))
    )
    return list(db.scalars(stmt).all())


def delete_gpms_batch(db: Session, batch_id: int) -> bool:
    """Xóa mềm một kỳ báo cáo GPMS."""
    batch = db.get(GpmsReportBatch, batch_id)
    if not batch or not batch.is_active:
        return False
    batch.is_active = False
    db.commit()
    _BATCH_MEMORY_CACHE.pop((batch.id, batch.total_rows, batch.file_name), None)
    return True


def get_south_usernames(db: Session) -> Tuple[List[str], Optional[datetime]]:
    """Lấy danh sách username được cấu hình thuộc Miền Nam."""
    rows = list(
        db.scalars(
            select(GpmsRegionConfig)
            .where(GpmsRegionConfig.region == "NAM")
            .order_by(GpmsRegionConfig.username)
        ).all()
    )
    usernames = [r.username.strip().lower() for r in rows if r.username and r.username.strip()]
    latest_dt = max((r.updated_at for r in rows if r.updated_at), default=None)
    return usernames, latest_dt


def get_south_config_with_candidates(
    db: Session,
    batch_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Trả về cấu hình Miền Nam hiện tại kèm danh sách đầy đủ ứng viên User nhận yêu cầu
    (gộp từ người xử lý trong file GPMS + cấu hình cũ + dbo.LIST_USER) để chọn nhanh trên UI.
    """
    south_rows = list(
        db.scalars(
            select(GpmsRegionConfig).where(GpmsRegionConfig.region == "NAM")
        ).all()
    )
    south_set = {r.username.strip().lower() for r in south_rows if r.username}
    latest_dt = max((r.updated_at for r in south_rows if r.updated_at), default=None)

    candidates_map: Dict[str, Dict[str, Any]] = {}

    # 1. Lấy người xử lý từ kỳ báo cáo đang chọn (hoặc kỳ mới nhất)
    batch: Optional[GpmsReportBatch] = None
    if batch_id:
        batch = db.get(GpmsReportBatch, batch_id)
    if batch is None or not batch.is_active:
        batch = db.scalar(
            select(GpmsReportBatch)
            .where(GpmsReportBatch.is_active == True)  # noqa: E712
            .order_by(desc(GpmsReportBatch.id))
            .limit(1)
        )

    if batch is not None:
        tickets = _get_cached_batch_tickets(batch)
        for t in tickets:
            uname = t["assignee"]
            if not uname or uname == "(Chưa gán)":
                continue
            ulow = uname.lower()
            cur = candidates_map.get(ulow)
            if cur is None:
                candidates_map[ulow] = {
                    "username": uname,
                    "full_name": t["assignee_name"] or uname,
                    "source": "GPMS",
                    "ticket_count": 1,
                    "is_south": ulow in south_set,
                }
            else:
                cur["ticket_count"] += 1

    # 2. Bổ sung user đã lưu trong cấu hình Miền Nam (phòng user chưa có ticket trong kỳ hiện tại)
    for cfg in south_rows:
        ulow = cfg.username.strip().lower()
        if ulow not in candidates_map:
            candidates_map[ulow] = {
                "username": cfg.username.strip(),
                "full_name": cfg.full_name or cfg.username.strip(),
                "source": "CONFIG",
                "ticket_count": 0,
                "is_south": True,
            }

    # 3. Bổ sung nhân sự đang active từ dbo.LIST_USER
    sys_users = db.scalars(select(User).where(User.active == True)).all()  # noqa: E712
    for su in sys_users:
        uname = (su.user_name1 or "").strip()
        if not uname:
            continue
        ulow = uname.lower()
        if ulow not in candidates_map:
            candidates_map[ulow] = {
                "username": uname,
                "full_name": (su.full_name or uname).strip(),
                "source": "SYSTEM",
                "ticket_count": 0,
                "is_south": ulow in south_set,
            }

    candidates = list(candidates_map.values())
    candidates.sort(key=lambda x: (not x["is_south"], -x["ticket_count"], x["username"].lower()))
    return {
        "south_usernames": sorted(south_set),
        "candidates": candidates,
        "updated_at": latest_dt,
    }


def save_south_usernames(
    db: Session,
    usernames: List[str],
    full_names: Optional[Dict[str, str]] = None,
    updated_by: Optional[str] = None,
) -> Tuple[List[str], datetime]:
    """Cập nhật toàn bộ danh sách User thuộc Miền Nam (các user khác tự động thành Miền Bắc)."""
    full_names = full_names or {}
    clean_map: Dict[str, str] = {}
    for raw_u in usernames:
        u = (raw_u or "").strip()
        if not u or u == "(Chưa gán)":
            continue
        ulow = u.lower()
        clean_map[ulow] = full_names.get(u) or full_names.get(ulow) or u

    existing_rows = list(db.scalars(select(GpmsRegionConfig)).all())
    existing_by_low = {r.username.strip().lower(): r for r in existing_rows if r.username}

    now = datetime.now()
    # Xóa những user không còn trong danh sách Miền Nam
    for ulow, row in existing_by_low.items():
        if ulow not in clean_map:
            db.delete(row)

    # Thêm mới hoặc cập nhật
    for ulow, fname in clean_map.items():
        row = existing_by_low.get(ulow)
        if row is None:
            db.add(
                GpmsRegionConfig(
                    username=ulow,
                    full_name=fname[:200],
                    region="NAM",
                    updated_by=updated_by,
                    updated_at=now,
                )
            )
        else:
            row.full_name = fname[:200]
            row.region = "NAM"
            row.updated_by = updated_by
            row.updated_at = now

    db.commit()
    return sorted(clean_map.keys()), now
