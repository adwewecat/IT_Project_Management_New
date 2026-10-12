import io
import json
import unicodedata
from datetime import datetime
from typing import Optional, List, Dict, Any

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from sqlalchemy import select, and_, or_, desc, func, text
from sqlalchemy.orm import Session

from app.models.system_incident import SystemIncident
from app.schemas.system_incident import (
    SystemIncidentCreate,
    SystemIncidentUpdate,
    SystemIncidentProgressAdd,
    SystemIncidentResponse,
    SystemIncidentStats,
    SystemIncidentListResponse,
)


def remove_accents(input_str: Optional[str]) -> str:
    """Loại bỏ dấu tiếng Việt để phục vụ tìm kiếm không phân biệt dấu"""
    if not input_str:
        return ""
    s = unicodedata.normalize("NFD", input_str)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D").lower()


def format_downtime_text(minutes: Optional[int], is_ongoing: bool = False) -> str:
    if is_ongoing:
        if minutes is not None and minutes > 0:
            if minutes < 60:
                return f"Đang diễn ra ({minutes} phút)"
            h = minutes // 60
            m = minutes % 60
            return f"Đang diễn ra ({h}h {m}p)"
        return "Đang diễn ra"

    if minutes is None or minutes <= 0:
        return "0 phút"
    if minutes < 60:
        return f"{minutes} phút"
    hours = minutes // 60
    rem_min = minutes % 60
    if rem_min == 0:
        return f"{hours} giờ"
    return f"{hours} giờ {rem_min} phút"


def to_system_incident_response(item: SystemIncident) -> SystemIncidentResponse:
    minutes = item.thoi_gian_gian_doan_phut
    is_ongoing = item.trang_thai in ("DANG_XU_LY", "THEO_DOI") and item.thoi_gian_ket_thuc is None

    if is_ongoing and item.thoi_gian_bat_dau:
        now = datetime.now()
        elapsed = int((now - item.thoi_gian_bat_dau).total_seconds() / 60)
        downtime_text = format_downtime_text(elapsed, is_ongoing=True)
    else:
        downtime_text = format_downtime_text(minutes, is_ongoing=False)

    return SystemIncidentResponse(
        id=item.id,
        tieude=item.tieude,
        tieu_de=item.tieude,
        he_thong=item.he_thong,
        muc_do=item.muc_do or "Cao",
        thoi_gian_bat_dau=item.thoi_gian_bat_dau.strftime("%Y-%m-%d %H:%M:%S") if item.thoi_gian_bat_dau else None,
        thoi_gian_ket_thuc=item.thoi_gian_ket_thuc.strftime("%Y-%m-%d %H:%M:%S") if item.thoi_gian_ket_thuc else None,
        thoi_gian_gian_doan_phut=minutes,
        thoi_gian_gian_doan_text=downtime_text,
        noi_dung=item.noi_dung,
        nguyen_nhan=item.nguyen_nhan,
        bien_phap_khac_phuc=item.bien_phap_khac_phuc,
        trang_thai=item.trang_thai or "DANG_XU_LY",
        nguoi_ghi_nhan=item.nguoi_ghi_nhan,
        nguoi_xu_ly=item.nguoi_xu_ly,
        ghi_chu_tien_do=item.ghi_chu_tien_do,
        images=item.images,
        files=item.files,
        created_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else None,
        updated_at=item.updated_at.strftime("%Y-%m-%d %H:%M:%S") if item.updated_at else None,
        resolved_at=item.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if item.resolved_at else None,
        resolved_by=item.resolved_by,
    )


def create_system_incident(
    db: Session,
    payload: SystemIncidentCreate,
    current_username: str,
    current_fullname: str
) -> SystemIncidentResponse:
    now = datetime.now()

    # Tính phút gián đoạn nếu có thời gian kết thúc
    downtime_minutes = None
    if payload.thoi_gian_ket_thuc and payload.thoi_gian_ket_thuc >= payload.thoi_gian_bat_dau:
        downtime_minutes = int((payload.thoi_gian_ket_thuc - payload.thoi_gian_bat_dau).total_seconds() / 60)

    initial_note = f"[{now.strftime('%d/%m/%Y %H:%M')}] {current_fullname} ({current_username}) ghi nhận sự cố hệ thống."
    if payload.note and payload.note.strip():
        initial_note += f"\n- {payload.note.strip()}"

    resolved_at = payload.thoi_gian_ket_thuc if payload.trang_thai == "DA_KHAC_PHUC" else None
    resolved_by = current_username if payload.trang_thai == "DA_KHAC_PHUC" else None

    title = (getattr(payload, 'tieude', None) or getattr(payload, 'tieu_de', None) or "").strip()
    content = (getattr(payload, 'noi_dung', None) or title).strip()

    item = SystemIncident(
        tieude=title,
        he_thong=payload.he_thong.strip() if payload.he_thong else "Hệ thống khác",
        muc_do=payload.muc_do or "Cao",
        thoi_gian_bat_dau=payload.thoi_gian_bat_dau,
        thoi_gian_ket_thuc=payload.thoi_gian_ket_thuc,
        thoi_gian_gian_doan_phut=downtime_minutes,
        noi_dung=content,
        nguyen_nhan=payload.nguyen_nhan.strip() if payload.nguyen_nhan else None,
        bien_phap_khac_phuc=payload.bien_phap_khac_phuc.strip() if payload.bien_phap_khac_phuc else None,
        trang_thai=payload.trang_thai or "DANG_XU_LY",
        nguoi_ghi_nhan=current_username,
        nguoi_xu_ly=payload.nguoi_xu_ly.strip() if payload.nguoi_xu_ly else None,
        ghi_chu_tien_do=initial_note,
        images=payload.images,
        files=payload.files,
        active=True,
        created_at=now,
        updated_at=now,
        resolved_at=resolved_at,
        resolved_by=resolved_by,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return to_system_incident_response(item)


def get_system_incident_by_id(db: Session, incident_id: int) -> Optional[SystemIncident]:
    return db.scalar(select(SystemIncident).where(SystemIncident.id == incident_id, SystemIncident.active == True))


def delete_system_incident(db: Session, incident_id: int) -> bool:
    item = get_system_incident_by_id(db, incident_id)
    if not item:
        return False
    item.active = False
    db.commit()
    return True


def add_system_incident_progress(
    db: Session,
    incident_id: int,
    payload: SystemIncidentProgressAdd,
    current_username: str,
    current_fullname: str
) -> SystemIncidentResponse:
    item = get_system_incident_by_id(db, incident_id)
    if not item:
        raise ValueError("Sự cố hệ thống không tồn tại hoặc đã bị xóa.")

    now = datetime.now()
    log_entry = f"\n[{now.strftime('%d/%m/%Y %H:%M')}] {current_fullname} ({current_username}): {payload.note.strip()}"
    item.ghi_chu_tien_do = (item.ghi_chu_tien_do or "") + log_entry

    # Cập nhật ảnh đính kèm nếu có
    if payload.images:
        try:
            new_imgs = json.loads(payload.images) if isinstance(payload.images, str) else payload.images
            existing_imgs = json.loads(item.images) if item.images else []
            combined = existing_imgs + [img for img in new_imgs if img not in existing_imgs]
            item.images = json.dumps(combined)
        except Exception:
            item.images = payload.images

    # Cập nhật files đính kèm nếu có
    if payload.files:
        try:
            new_f = json.loads(payload.files) if isinstance(payload.files, str) else payload.files
            existing_f = json.loads(item.files) if item.files else []
            combined_f = existing_f + [f for f in new_f if f not in existing_f]
            item.files = json.dumps(combined_f)
        except Exception:
            item.files = payload.files

    if payload.nguyen_nhan and payload.nguyen_nhan.strip():
        item.nguyen_nhan = payload.nguyen_nhan.strip()

    if payload.bien_phap_khac_phuc and payload.bien_phap_khac_phuc.strip():
        item.bien_phap_khac_phuc = payload.bien_phap_khac_phuc.strip()

    # Cập nhật trạng thái
    if payload.status:
        old_status = item.trang_thai
        item.trang_thai = payload.status
        if payload.status == "DA_KHAC_PHUC":
            item.resolved_at = now
            item.resolved_by = current_username
            end_time = payload.thoi_gian_ket_thuc or now
            item.thoi_gian_ket_thuc = end_time
            if item.thoi_gian_bat_dau and end_time >= item.thoi_gian_bat_dau:
                item.thoi_gian_gian_doan_phut = int((end_time - item.thoi_gian_bat_dau).total_seconds() / 60)
        elif old_status == "DA_KHAC_PHUC" and payload.status != "DA_KHAC_PHUC":
            item.resolved_at = None
            item.resolved_by = None

    if payload.thoi_gian_ket_thuc:
        item.thoi_gian_ket_thuc = payload.thoi_gian_ket_thuc
        if item.thoi_gian_bat_dau and payload.thoi_gian_ket_thuc >= item.thoi_gian_bat_dau:
            item.thoi_gian_gian_doan_phut = int((payload.thoi_gian_ket_thuc - item.thoi_gian_bat_dau).total_seconds() / 60)

    item.updated_at = now
    db.commit()
    db.refresh(item)
    return to_system_incident_response(item)


def update_system_incident(
    db: Session,
    incident_id: int,
    payload: SystemIncidentUpdate,
    current_username: str,
    current_fullname: str
) -> SystemIncidentResponse:
    item = get_system_incident_by_id(db, incident_id)
    if not item:
        raise ValueError("Sự cố hệ thống không tồn tại hoặc đã bị xóa.")

    now = datetime.now()
    new_title = getattr(payload, 'tieude', None) or getattr(payload, 'tieu_de', None)
    if new_title is not None:
        item.tieude = new_title.strip()
    if payload.he_thong is not None:
        item.he_thong = payload.he_thong.strip()
    if payload.muc_do is not None:
        item.muc_do = payload.muc_do.strip()
    if payload.thoi_gian_bat_dau is not None:
        item.thoi_gian_bat_dau = payload.thoi_gian_bat_dau
    if payload.thoi_gian_ket_thuc is not None:
        item.thoi_gian_ket_thuc = payload.thoi_gian_ket_thuc
    if payload.noi_dung is not None:
        item.noi_dung = payload.noi_dung.strip()
    if payload.nguyen_nhan is not None:
        item.nguyen_nhan = payload.nguyen_nhan.strip() if payload.nguyen_nhan else None
    if payload.bien_phap_khac_phuc is not None:
        item.bien_phap_khac_phuc = payload.bien_phap_khac_phuc.strip() if payload.bien_phap_khac_phuc else None
    if payload.nguoi_xu_ly is not None:
        item.nguoi_xu_ly = payload.nguoi_xu_ly.strip() if payload.nguoi_xu_ly else None
    if payload.images is not None:
        item.images = payload.images
    if payload.files is not None:
        item.files = payload.files

    if payload.trang_thai is not None:
        item.trang_thai = payload.trang_thai
        if payload.trang_thai == "DA_KHAC_PHUC":
            if not item.thoi_gian_ket_thuc:
                item.thoi_gian_ket_thuc = now
            item.resolved_at = item.thoi_gian_ket_thuc or now
            item.resolved_by = current_username
        else:
            item.resolved_at = None
            item.resolved_by = None
            item.thoi_gian_ket_thuc = None

    # Tự động tính lại downtime
    if item.thoi_gian_bat_dau and item.thoi_gian_ket_thuc and item.thoi_gian_ket_thuc >= item.thoi_gian_bat_dau:
        item.thoi_gian_gian_doan_phut = int((item.thoi_gian_ket_thuc - item.thoi_gian_bat_dau).total_seconds() / 60)
    else:
        item.thoi_gian_gian_doan_phut = None

    item.updated_at = now
    db.commit()
    db.refresh(item)
    return to_system_incident_response(item)


def get_system_incidents(
    db: Session,
    search: Optional[str] = None,
    month: Optional[str] = None,  # YYYY-MM
    from_date: Optional[str] = None,  # YYYY-MM-DD
    to_date: Optional[str] = None,  # YYYY-MM-DD
    system_name: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> SystemIncidentListResponse:
    base_where = [SystemIncident.active == True]

    # Lọc theo tháng (VD: 2026-09)
    if month and month.strip() and month.strip() != "ALL":
        try:
            m_parts = month.strip().split("-")
            year = int(m_parts[0])
            m = int(m_parts[1])
            start_m = datetime(year, m, 1, 0, 0, 0)
            if m == 12:
                end_m = datetime(year + 1, 1, 1, 0, 0, 0)
            else:
                end_m = datetime(year, m + 1, 1, 0, 0, 0)
            base_where.append(and_(SystemIncident.thoi_gian_bat_dau >= start_m, SystemIncident.thoi_gian_bat_dau < end_m))
        except Exception:
            pass

    # Lọc theo khoảng ngày
    if from_date and from_date.strip():
        try:
            fd = datetime.strptime(from_date.strip()[:10], "%Y-%m-%d").replace(hour=0, minute=0, second=0)
            base_where.append(SystemIncident.thoi_gian_bat_dau >= fd)
        except Exception:
            pass

    if to_date and to_date.strip():
        try:
            td = datetime.strptime(to_date.strip()[:10], "%Y-%m-%d").replace(hour=23, minute=59, second=59)
            base_where.append(SystemIncident.thoi_gian_bat_dau <= td)
        except Exception:
            pass

    # Lọc theo hệ thống
    if system_name and system_name.strip() and system_name.strip() != "ALL":
        base_where.append(func.lower(SystemIncident.he_thong).like(f"%{system_name.strip().lower()}%"))

    # Lọc theo trạng thái
    if status and status.strip() and status.strip() != "ALL":
        base_where.append(SystemIncident.trang_thai == status.strip())

    # Lấy toàn bộ records thỏa base_where để tính thống kê và search tiếng Việt không dấu
    stmt = select(SystemIncident).where(and_(*base_where)).order_by(desc(SystemIncident.thoi_gian_bat_dau), desc(SystemIncident.id))
    all_records = db.scalars(stmt).all()

    # Tính thống kê tổng quát
    stats = SystemIncidentStats(
        total=len(all_records),
        dang_xu_ly=sum(1 for r in all_records if r.trang_thai == "DANG_XU_LY"),
        da_khac_phuc=sum(1 for r in all_records if r.trang_thai == "DA_KHAC_PHUC"),
        theo_doi=sum(1 for r in all_records if r.trang_thai == "THEO_DOI"),
        total_downtime_minutes=sum(r.thoi_gian_gian_doan_phut or 0 for r in all_records),
    )
    stats.total_downtime_hours = round(stats.total_downtime_minutes / 60.0, 1)

    by_sys: Dict[str, int] = {}
    by_sev: Dict[str, int] = {}
    for r in all_records:
        if r.he_thong:
            for s in [x.strip() for x in r.he_thong.split(",") if x.strip()]:
                by_sys[s] = by_sys.get(s, 0) + 1
        else:
            by_sys["Khác"] = by_sys.get("Khác", 0) + 1
        sev = r.muc_do or "Cao"
        by_sev[sev] = by_sev.get(sev, 0) + 1
    stats.by_system = by_sys
    stats.by_severity = by_sev

    # Search filter (tiếng Việt không dấu)
    search_clean = remove_accents(search).strip() if search else ""
    filtered = []
    for r in all_records:
        if search_clean:
            haystack = " ".join([
                r.tieude or "",
                r.noi_dung or "",
                r.he_thong or "",
                r.nguyen_nhan or "",
                r.bien_phap_khac_phuc or "",
                r.nguoi_xu_ly or "",
                r.nguoi_ghi_nhan or "",
            ])
            if search_clean not in remove_accents(haystack):
                continue
        filtered.append(r)

    total_matched = len(filtered)
    paginated = filtered[offset : offset + limit]

    items = [to_system_incident_response(r) for r in paginated]
    return SystemIncidentListResponse(items=items, total=total_matched, stats=stats)


def export_system_incidents_excel(
    db: Session,
    search: Optional[str] = None,
    month: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    system_name: Optional[str] = None,
    status: Optional[str] = None,
) -> io.BytesIO:
    # Lấy toàn bộ bản ghi không giới hạn
    res = get_system_incidents(
        db=db,
        search=search,
        month=month,
        from_date=from_date,
        to_date=to_date,
        system_name=system_name,
        status=status,
        limit=5000,
        offset=0
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Su Co He Thong"

    # Font styles
    title_font = Font(name="Arial", size=14, bold=True, color="1E3A8A")
    meta_font = Font(name="Arial", size=10, italic=True, color="475569")
    header_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="000000")
    data_font = Font(name="Arial", size=10)
    center_align = Alignment(horizontal="center", vertical="center")
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)
    border_thin = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )

    # Title
    ws.merge_cells("A1:K1")
    ws["A1"] = "BÁO CÁO SỰ CỐ TOÀN HỆ THỐNG / LỖI DIỆN RỘNG"
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align
    ws.row_dimensions[1].height = 28

    # Subtitle
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    ws.merge_cells("A2:K2")
    ws["A2"] = f"Thời gian xuất: {now_str} | Tổng số sự cố: {len(res.items)} | Tổng downtime: {res.stats.total_downtime_hours} giờ ({res.stats.total_downtime_minutes} phút)"
    ws["A2"].font = meta_font
    ws["A2"].alignment = center_align
    ws.row_dimensions[2].height = 18

    # Header columns
    headers = [
        ("STT", 7),
        ("Mã ID", 10),
        ("Bắt Đầu", 20),
        ("Kết Thúc", 20),
        ("Downtime", 16),
        ("Hệ Thống", 20),
        ("Mức Độ", 14),
        ("Tiêu Đề Sự Cố", 35),
        ("Nội Dung Chi Tiết", 50),
        ("Trạng Thái", 16),
        ("Người Xử Lý", 20),
    ]

    header_row = 4
    ws.row_dimensions[header_row].height = 24

    for col_idx, (header_text, col_width) in enumerate(headers, 1):
        cell = ws.cell(row=header_row, column=col_idx, value=header_text)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = border_thin
        col_letter = openpyxl.utils.get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = col_width

    # Rows
    status_map = {
        "DANG_XU_LY": "Đang xử lý",
        "DA_KHAC_PHUC": "Đã khắc phục",
        "THEO_DOI": "Đang theo dõi",
    }

    for idx, item in enumerate(res.items, 1):
        row_idx = header_row + idx
        ws.row_dimensions[row_idx].height = 24

        row_data = [
            idx,
            f"#SYS-{item.id}",
            item.thoi_gian_bat_dau or "",
            item.thoi_gian_ket_thuc or "",
            item.thoi_gian_gian_doan_text or "",
            item.he_thong or "",
            item.muc_do or "",
            item.tieude or "",
            item.noi_dung or "",
            status_map.get(item.trang_thai, item.trang_thai),
            item.nguoi_xu_ly or "",
        ]

        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = data_font
            cell.border = border_thin
            if col_idx in (1, 2, 3, 4, 5, 7, 10):
                cell.alignment = center_align
            else:
                cell.alignment = left_align

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def get_distinct_systems(db: Session) -> List[str]:
    """Lấy danh sách các hệ thống/dịch vụ từ sự cố đã ghi nhận, danh mục PM/BO và phần mềm."""
    systems_set = set()

    # 1. Từ bảng GHINHAN_SUCO_HETHONG
    try:
        suco_systems = db.execute(select(SystemIncident.he_thong).distinct()).scalars().all()
        for s in suco_systems:
            if s and s.strip():
                for sub in s.split(","):
                    sub_clean = sub.strip()
                    if sub_clean:
                        systems_set.add(sub_clean)
    except Exception:
        pass

    # 2. Từ bảng ALLAPP_PM
    try:
        pm_apps = db.execute(text("SELECT project_name FROM ALLAPP_PM WHERE active = 1")).scalars().all()
        for a in pm_apps:
            if a and a.strip():
                systems_set.add(a.strip())
    except Exception:
        pass

    # 3. Từ bảng SOFTWARE_VERSIONS
    try:
        versions = db.execute(text("SELECT phan_mem FROM SOFTWARE_VERSIONS WHERE active = 1")).scalars().all()
        for v in versions:
            if v and v.strip():
                systems_set.add(v.strip())
    except Exception:
        pass

    # 4. Default baseline systems
    baseline = [
        "SAP", "CO", "SO", "KDS", "GPOS", "GPOS-CO-SO", "GPOS-KDS", 
        "PIM", "SSO / Portal", "VPN Datacenter", "Internet Nhà Hàng", "Wifi Marketing"
    ]
    for b in baseline:
        systems_set.add(b)

    # Sort alphabet
    return sorted(list(systems_set), key=lambda x: remove_accents(x).lower())
