import io
import math
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, desc, asc
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.ext_rsc import ExtRsc
from app.schemas.ext_rsc import (
    ExtRscItem,
    ExtRscCreate,
    ExtRscUpdate,
    ExtRscListResponse,
)


def get_ext_rsc_list(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> ExtRscListResponse:
    """
    Truy vấn danh sách số máy nhánh EXT RSC có tìm kiếm và phân trang.
    """
    query = db.query(ExtRsc).filter(
        or_(ExtRsc.active == True, ExtRsc.active == None)
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ExtRsc.nhanvien.ilike(term),
                ExtRsc.email.ilike(term),
                ExtRsc.manv.ilike(term),
                ExtRsc.so_ext.ilike(term),
                ExtRsc.phongban.ilike(term),
                ExtRsc.note.ilike(term),
            )
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    items = (
        query.order_by(desc(ExtRsc.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return ExtRscListResponse(
        items=[ExtRscItem.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


def create_ext_rsc(
    db: Session,
    payload: ExtRscCreate,
    username: Optional[str] = None,
) -> ExtRscItem:
    """
    Thêm mới số máy nhánh EXT RSC.
    """
    now = datetime.now()
    item = ExtRsc(
        nhanvien=payload.nhanvien.strip() if payload.nhanvien else None,
        email=payload.email.strip() if payload.email else None,
        manv=payload.manv.strip().upper() if payload.manv else None,
        so_ext=payload.so_ext.strip() if payload.so_ext else None,
        phongban=payload.phongban.strip() if payload.phongban else None,
        note=payload.note.strip() if payload.note else None,
        ngay_insert=now,
        user_insert=username,
        active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ExtRscItem.model_validate(item)


def update_ext_rsc(
    db: Session,
    item_id: int,
    payload: ExtRscUpdate,
    username: Optional[str] = None,
) -> Optional[ExtRscItem]:
    """
    Cập nhật thông tin số máy nhánh EXT RSC.
    """
    item = db.query(ExtRsc).filter(ExtRsc.id == item_id).first()
    if not item:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if isinstance(val, str):
            val = val.strip()
            if field == "manv":
                val = val.upper()
        setattr(item, field, val)

    item.ngay_update = datetime.now()
    item.user_update = username

    db.commit()
    db.refresh(item)
    return ExtRscItem.model_validate(item)


def delete_ext_rsc(
    db: Session,
    item_id: int,
    username: Optional[str] = None,
) -> bool:
    """
    Xóa số máy nhánh (soft delete active=False).
    """
    item = db.query(ExtRsc).filter(ExtRsc.id == item_id).first()
    if not item:
        return False

    item.active = False
    item.ngay_update = datetime.now()
    item.user_update = username
    db.commit()
    return True


def export_ext_rsc_excel(
    db: Session,
    search: Optional[str] = None,
) -> io.BytesIO:
    """
    Xuất danh sách EXT RSC ra file Excel .xlsx
    """
    query = db.query(ExtRsc).filter(
        or_(ExtRsc.active == True, ExtRsc.active == None)
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                ExtRsc.nhanvien.ilike(term),
                ExtRsc.email.ilike(term),
                ExtRsc.manv.ilike(term),
                ExtRsc.so_ext.ilike(term),
                ExtRsc.phongban.ilike(term),
                ExtRsc.note.ilike(term),
            )
        )

    items = query.order_by(asc(ExtRsc.so_ext), desc(ExtRsc.id)).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Danh Sách EXT RSC"

    # Header style
    font_title = Font(name="Arial", size=15, bold=True, color="FFFFFF")
    fill_title = PatternFill(start_color="D97706", end_color="D97706", fill_type="solid")
    font_header = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    fill_header = PatternFill(start_color="B45309", end_color="B45309", fill_type="solid")
    font_body = Font(name="Arial", size=10)

    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB"),
    )

    # Title Row
    ws.merge_cells("A1:G1")
    title_cell = ws["A1"]
    title_cell.value = "DANH SÁCH SỐ MÁY NHÁNH EXT RSC - GOLDEN GATE RESTAURANT GROUP"
    title_cell.font = font_title
    title_cell.fill = fill_title
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 40

    headers = [
        "STT",
        "Tên Nhân Viên",
        "Email",
        "Mã NV",
        "Số EXT",
        "Phòng Ban",
        "Ghi Chú",
    ]

    for col_idx, h_text in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_idx, value=h_text)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border
    ws.row_dimensions[2].height = 28

    for row_idx, item in enumerate(items, 3):
        row_data = [
            row_idx - 2,
            item.nhanvien or "",
            item.email or "",
            item.manv or "",
            item.so_ext or "",
            item.phongban or "",
            item.note or "",
        ]
        for col_idx, val in enumerate(row_data, 1):
            c = ws.cell(row=row_idx, column=col_idx, value=val)
            c.font = font_body
            c.border = thin_border
            if col_idx in (1, 4, 5):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[row_idx].height = 22

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if cell.row > 1 and len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output
