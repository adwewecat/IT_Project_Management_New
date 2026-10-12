import io
import math
from typing import Optional, Tuple, List, Dict, Any
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, desc, asc
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.theodoi_pr_po_do import TheodoiPrPoDo
from app.schemas.theodoi_pr_po_do import (
    PrPoDoItem,
    PrPoDoCreate,
    PrPoDoUpdate,
    PrPoDoStats,
    PrPoDoListResponse,
)


def detect_loai_from_so(so: Optional[str]) -> Optional[str]:
    """
    Tự động nhận diện Loại chứng từ dựa theo 2 ký tự đầu của Số (SO):
    - 11, 12, 13, 14 -> PR
    - 41, 42, 43, 44 -> PO
    - 00, 49 -> DO
    """
    if not so:
        return None
    so_clean = str(so).strip()
    if len(so_clean) < 2:
        return None
    
    prefix = so_clean[:2]
    if prefix in ("11", "12", "13", "14"):
        return "PR"
    elif prefix in ("41", "42", "43", "44"):
        return "PO"
    elif prefix in ("00", "49"):
        return "DO"
    return None


def get_pr_po_do_stats(db: Session) -> PrPoDoStats:
    """
    Lấy số liệu thống kê tổng hợp của bảng THEODOI_PR_PO_DO:
    Tổng số, BU, FC, MD, DONE (loại trừ placeholder Y và bản ghi đã xóa).
    """
    base_where = or_(TheodoiPrPoDo.STATUS_XOA == None, TheodoiPrPoDo.STATUS_XOA != "DELETED")
    not_dummy = or_(TheodoiPrPoDo.INSERT_TRANGTHAI == None, TheodoiPrPoDo.INSERT_TRANGTHAI != "Y")

    stmt = select(TheodoiPrPoDo.TRANGTHAI, func.count(TheodoiPrPoDo.id)).where(
        base_where,
        not_dummy,
        TheodoiPrPoDo.SO != None
    ).group_by(TheodoiPrPoDo.TRANGTHAI)

    results = db.execute(stmt).all()
    stats_dict = {"BU": 0, "FC": 0, "MD": 0, "DONE": 0}
    total = 0

    for tt, cnt in results:
        tt_clean = (tt or "").strip().upper()
        if tt_clean in stats_dict:
            stats_dict[tt_clean] += cnt
        total += cnt

    # Đếm tổng số bản ghi đã xóa
    del_stmt = select(func.count(TheodoiPrPoDo.id)).where(TheodoiPrPoDo.STATUS_XOA == "DELETED")
    total_deleted = db.scalar(del_stmt) or 0

    return PrPoDoStats(
        total=total,
        total_bu=stats_dict["BU"],
        total_fc=stats_dict["FC"],
        total_md=stats_dict["MD"],
        total_done=stats_dict["DONE"],
        total_deleted=total_deleted
    )


def build_filter_query(
    search: Optional[str] = None,
    loai: Optional[str] = None,
    trangthai: Optional[str] = None,
    sort_by_date: str = "desc"
):
    """
    Xây dựng câu lệnh query với bộ lọc đa năng.
    """
    stmt = select(TheodoiPrPoDo).where(
        or_(TheodoiPrPoDo.STATUS_XOA == None, TheodoiPrPoDo.STATUS_XOA != "DELETED"),
        or_(TheodoiPrPoDo.INSERT_TRANGTHAI == None, TheodoiPrPoDo.INSERT_TRANGTHAI != "Y"),
        TheodoiPrPoDo.SO != None
    )

    # Lọc theo Loại (PR, PO, DO)
    if loai and loai.strip() and loai.strip().upper() != "ALL":
        stmt = stmt.where(TheodoiPrPoDo.LOAI == loai.strip().upper())

    # Lọc theo Trạng Thái (PENDING, BU, FC, MD, DONE)
    if trangthai and trangthai.strip() and trangthai.strip().upper() != "ALL":
        tt_upper = trangthai.strip().upper()
        if tt_upper == "PENDING":
            stmt = stmt.where(TheodoiPrPoDo.TRANGTHAI.in_(["BU", "FC", "MD"]))
        else:
            stmt = stmt.where(TheodoiPrPoDo.TRANGTHAI == tt_upper)

    # Tìm kiếm nhanh theo Số, Nội Dung, Ghi Chú
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                TheodoiPrPoDo.SO.ilike(term),
                TheodoiPrPoDo.NOIDUNG.ilike(term),
                TheodoiPrPoDo.GHICHU.ilike(term),
                TheodoiPrPoDo.LOAI.ilike(term)
            )
        )

    # Sắp xếp
    if sort_by_date.lower() == "asc":
        stmt = stmt.order_by(asc(TheodoiPrPoDo.NGAY_THEM), asc(TheodoiPrPoDo.id))
    else:
        stmt = stmt.order_by(desc(TheodoiPrPoDo.NGAY_THEM), desc(TheodoiPrPoDo.id))

    return stmt


def get_pr_po_do_list(
    db: Session,
    search: Optional[str] = None,
    loai: Optional[str] = None,
    trangthai: Optional[str] = None,
    sort_by_date: str = "desc",
    page: int = 1,
    page_size: int = 50
) -> PrPoDoListResponse:
    """
    Lấy danh sách PR-PO-DO có phân trang và bộ lọc.
    """
    stmt = build_filter_query(search, loai, trangthai, sort_by_date)

    # Tính tổng số bản ghi khớp bộ lọc
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.scalar(count_stmt) or 0

    # Phân trang
    offset = (page - 1) * page_size
    items_stmt = stmt.offset(offset).limit(page_size)
    records = db.scalars(items_stmt).all()

    items = [
        PrPoDoItem(
            id=r.id,
            loai=r.LOAI,
            so=r.SO,
            noidung=r.NOIDUNG,
            ngay_them=r.NGAY_THEM,
            ngay_insert=r.NGAY_INSERT,
            ngay_update=r.NGAY_UPDATE,
            trangthai=r.TRANGTHAI or "BU",
            ghichu=r.GHICHU
        )
        for r in records
    ]

    total_pages = math.ceil(total / page_size) if total > 0 else 1
    stats = get_pr_po_do_stats(db)

    return PrPoDoListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        stats=stats
    )


def create_pr_po_do(db: Session, payload: PrPoDoCreate) -> PrPoDoItem:
    """
    Tạo mới một dòng chứng từ PR/PO/DO:
    Tự động xác định LOAI nếu có SO, đặt ngày tạo là ngày hiện tại.
    """
    loai = payload.loai
    if not loai or not loai.strip():
        loai = detect_loai_from_so(payload.so)

    now = datetime.now()
    ngay_them = payload.ngay_them or now.date()
    trangthai = (payload.trangthai or "BU").strip().upper()

    new_row = TheodoiPrPoDo(
        LOAI=loai,
        SO=payload.so.strip() if payload.so else None,
        NOIDUNG=payload.noidung,
        NGAY_THEM=ngay_them,
        NGAY_INSERT=now,
        TRANGTHAI=trangthai,
        GHICHU=payload.ghichu,
        INSERT_TRANGTHAI="N",
        STATUS_XOA=None
    )

    db.add(new_row)
    db.commit()
    db.refresh(new_row)

    return PrPoDoItem(
        id=new_row.id,
        loai=new_row.LOAI,
        so=new_row.SO,
        noidung=new_row.NOIDUNG,
        ngay_them=new_row.NGAY_THEM,
        ngay_insert=new_row.NGAY_INSERT,
        ngay_update=new_row.NGAY_UPDATE,
        trangthai=new_row.TRANGTHAI,
        ghichu=new_row.GHICHU
    )


def update_pr_po_do(db: Session, item_id: int, payload: PrPoDoUpdate) -> Optional[PrPoDoItem]:
    """
    Chỉnh sửa inline từng ô của dòng:
    Tự động cập nhật lại LOAI nếu SO thay đổi và chưa chỉ định LOAI rõ ràng.
    """
    stmt = select(TheodoiPrPoDo).where(TheodoiPrPoDo.id == item_id)
    record = db.scalar(stmt)
    if not record:
        return None

    now = datetime.now()

    if payload.so is not None:
        record.SO = payload.so.strip() if payload.so else None
        # Tự động suy ra loại nếu không truyền loai
        if payload.loai is None:
            detected = detect_loai_from_so(record.SO)
            if detected:
                record.LOAI = detected

    if payload.loai is not None:
        record.LOAI = payload.loai.strip() if payload.loai else None

    if payload.noidung is not None:
        record.NOIDUNG = payload.noidung

    if payload.trangthai is not None:
        record.TRANGTHAI = payload.trangthai.strip().upper() if payload.trangthai else "BU"

    if payload.ghichu is not None:
        record.GHICHU = payload.ghichu

    if payload.ngay_them is not None:
        record.NGAY_THEM = payload.ngay_them

    record.INSERT_TRANGTHAI = "N"
    record.NGAY_UPDATE = now

    db.commit()
    db.refresh(record)

    return PrPoDoItem(
        id=record.id,
        loai=record.LOAI,
        so=record.SO,
        noidung=record.NOIDUNG,
        ngay_them=record.NGAY_THEM,
        ngay_insert=record.NGAY_INSERT,
        ngay_update=record.NGAY_UPDATE,
        trangthai=record.TRANGTHAI,
        ghichu=record.GHICHU
    )


def delete_pr_po_do(db: Session, item_id: int) -> bool:
    """
    Xóa dòng (đánh dấu soft delete STATUS_XOA = 'DELETED').
    """
    stmt = select(TheodoiPrPoDo).where(TheodoiPrPoDo.id == item_id)
    record = db.scalar(stmt)
    if not record:
        return False

    record.STATUS_XOA = "DELETED"
    record.NGAY_UPDATE = datetime.now()
    db.commit()
    return True


def get_deleted_pr_po_do_list(
    db: Session,
    search: Optional[str] = None,
    limit: int = 50
) -> List[PrPoDoItem]:
    """
    Lấy danh sách tối đa 50 dòng đã xóa gần đây nhất, hỗ trợ tìm kiếm.
    """
    stmt = select(TheodoiPrPoDo).where(TheodoiPrPoDo.STATUS_XOA == "DELETED")

    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                TheodoiPrPoDo.SO.ilike(term),
                TheodoiPrPoDo.NOIDUNG.ilike(term),
                TheodoiPrPoDo.GHICHU.ilike(term),
                TheodoiPrPoDo.LOAI.ilike(term)
            )
        )

    stmt = stmt.order_by(desc(TheodoiPrPoDo.NGAY_UPDATE), desc(TheodoiPrPoDo.id)).limit(limit)
    records = db.scalars(stmt).all()

    return [
        PrPoDoItem(
            id=r.id,
            loai=r.LOAI,
            so=r.SO,
            noidung=r.NOIDUNG,
            ngay_them=r.NGAY_THEM,
            ngay_insert=r.NGAY_INSERT,
            ngay_update=r.NGAY_UPDATE,
            trangthai=r.TRANGTHAI or "BU",
            ghichu=r.GHICHU
        )
        for r in records
    ]


def restore_pr_po_do(db: Session, item_id: int) -> Optional[PrPoDoItem]:
    """
    Khôi phục lại dòng đã xóa về trạng thái hoạt động bình thường.
    """
    stmt = select(TheodoiPrPoDo).where(
        TheodoiPrPoDo.id == item_id,
        TheodoiPrPoDo.STATUS_XOA == "DELETED"
    )
    record = db.scalar(stmt)
    if not record:
        return None

    record.STATUS_XOA = None
    record.NGAY_UPDATE = datetime.now()
    db.commit()
    db.refresh(record)

    return PrPoDoItem(
        id=record.id,
        loai=record.LOAI,
        so=record.SO,
        noidung=record.NOIDUNG,
        ngay_them=record.NGAY_THEM,
        ngay_insert=record.NGAY_INSERT,
        ngay_update=record.NGAY_UPDATE,
        trangthai=record.TRANGTHAI or "BU",
        ghichu=record.GHICHU
    )


def export_pr_po_do_excel(
    db: Session,
    search: Optional[str] = None,
    loai: Optional[str] = None,
    trangthai: Optional[str] = None,
    sort_by_date: str = "desc"
) -> io.BytesIO:
    """
    Xuất danh sách PR-PO-DO ra file Excel chuẩn định dạng.
    """
    stmt = build_filter_query(search, loai, trangthai, sort_by_date)
    records = db.scalars(stmt).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Theo Dõi PR-PO-DO"

    # Định dạng tiêu đề cột
    headers = ["STT", "Loại", "Số", "Nội Dung", "Ngày Tạo", "Trạng Thái", "Ghi Chú"]
    header_fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
    left_align = Alignment(horizontal="left", vertical="center", wrap_text=True)

    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB")
    )

    ws.append(headers)
    ws.row_dimensions[1].height = 28

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    # Điền dữ liệu
    for idx, r in enumerate(records, start=1):
        ngay_str = r.NGAY_THEM.strftime("%d/%m/%Y") if r.NGAY_THEM else ""
        row_data = [
            idx,
            r.LOAI or "",
            r.SO or "",
            r.NOIDUNG or "",
            ngay_str,
            r.TRANGTHAI or "",
            r.GHICHU or ""
        ]
        ws.append(row_data)
        row_num = idx + 1
        ws.row_dimensions[row_num].height = 22

        # Màu sắc từng ô
        for c_idx in range(1, len(row_data) + 1):
            cell = ws.cell(row=row_num, column=c_idx)
            cell.font = Font(name="Arial", size=10)
            cell.border = thin_border
            if c_idx in (1, 2, 5, 6):
                cell.alignment = center_align
            else:
                cell.alignment = left_align

            # Màu nhẹ cho trạng thái
            if c_idx == 6:
                tt = (r.TRANGTHAI or "").upper()
                if tt == "DONE":
                    cell.font = Font(name="Arial", size=10, bold=True, color="16A34A")
                elif tt == "FC":
                    cell.font = Font(name="Arial", size=10, bold=True, color="7C3AED")
                elif tt == "MD":
                    cell.font = Font(name="Arial", size=10, bold=True, color="2563EB")
                elif tt == "BU":
                    cell.font = Font(name="Arial", size=10, bold=True, color="D97706")

    # Tự động căn chỉnh độ rộng cột
    column_widths = {1: 8, 2: 12, 3: 18, 4: 55, 5: 14, 6: 14, 7: 35}
    for col_idx, width in column_widths.items():
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
