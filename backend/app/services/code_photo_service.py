import io
import math
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_, desc, asc
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.code_photo import CodePhoto
from app.schemas.code_photo import (
    CodePhotoItem,
    CodePhotoCreate,
    CodePhotoUpdate,
    CodePhotoStats,
    CodePhotoListResponse,
)


def get_code_photo_stats(db: Session) -> CodePhotoStats:
    """
    Lấy thống kê số lượng Code Photo theo hiện trạng (ON, OFF, Tổng cộng).
    """
    base_where = or_(CodePhoto.active == True, CodePhoto.active == None)

    stmt = (
        select(CodePhoto.hientrang, func.count(CodePhoto.id))
        .where(base_where)
        .group_by(CodePhoto.hientrang)
    )
    results = db.execute(stmt).all()

    total_on = 0
    total_off = 0
    total = 0

    for ht, cnt in results:
        ht_upper = (ht or "").strip().upper()
        if ht_upper == "ON":
            total_on += cnt
        elif ht_upper == "OFF":
            total_off += cnt
        total += cnt

    return CodePhotoStats(
        total=total,
        total_on=total_on,
        total_off=total_off,
    )


def get_code_photo_list(
    db: Session,
    search: Optional[str] = None,
    hientrang: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
) -> CodePhotoListResponse:
    """
    Truy vấn danh sách Code Photo có bộ lọc hiện trạng, tìm kiếm và phân trang.
    """
    query = db.query(CodePhoto).filter(
        or_(CodePhoto.active == True, CodePhoto.active == None)
    )

    if hientrang and hientrang.strip().upper() in ("ON", "OFF"):
        query = query.filter(CodePhoto.hientrang == hientrang.strip().upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CodePhoto.name.ilike(term),
                CodePhoto.email.ilike(term),
                CodePhoto.manv.ilike(term),
                CodePhoto.pass_code.ilike(term),
                CodePhoto.cmnd_sdt.ilike(term),
                CodePhoto.bophan.ilike(term),
                CodePhoto.chucdanh.ilike(term),
                CodePhoto.code_dept.ilike(term),
                CodePhoto.note.ilike(term),
            )
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1

    items = (
        query.order_by(desc(CodePhoto.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    stats = get_code_photo_stats(db)

    return CodePhotoListResponse(
        items=[CodePhotoItem.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        stats=stats,
    )


def check_email_exists(db: Session, email: str, exclude_id: Optional[int] = None) -> bool:
    """
    Kiểm tra email đã tồn tại trong bảng CODE_PHOTO chưa.
    """
    query = db.query(CodePhoto).filter(
        CodePhoto.email.ilike(email.strip()),
        or_(CodePhoto.active == True, CodePhoto.active == None)
    )
    if exclude_id is not None:
        query = query.filter(CodePhoto.id != exclude_id)
    return query.first() is not None


def create_code_photo(
    db: Session,
    payload: CodePhotoCreate,
    username: Optional[str] = None,
) -> CodePhotoItem:
    """
    Thêm mới Code Photo cho nhân viên.
    """
    now = datetime.now()
    item = CodePhoto(
        hientrang=(payload.hientrang or "ON").strip().upper(),
        manv=payload.manv.strip().upper() if payload.manv else None,
        name=payload.name.strip() if payload.name else None,
        email=payload.email.strip() if payload.email else None,
        pass_code=payload.pass_code.strip() if payload.pass_code else None,
        cmnd_sdt=payload.cmnd_sdt.strip() if payload.cmnd_sdt else None,
        bophan=payload.bophan.strip() if payload.bophan else None,
        chucdanh=payload.chucdanh.strip() if payload.chucdanh else None,
        code_dept=payload.code_dept.strip() if payload.code_dept else None,
        note=payload.note.strip() if payload.note else None,
        ngay_insert=now,
        user_insert=username,
        active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return CodePhotoItem.model_validate(item)


def update_code_photo(
    db: Session,
    item_id: int,
    payload: CodePhotoUpdate,
    username: Optional[str] = None,
) -> Optional[CodePhotoItem]:
    """
    Cập nhật thông tin Code Photo.
    """
    item = db.query(CodePhoto).filter(CodePhoto.id == item_id).first()
    if not item:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if isinstance(val, str):
            val = val.strip()
            if field == "manv":
                val = val.upper()
            elif field == "hientrang":
                val = val.upper()
        setattr(item, field, val)

    item.ngay_update = datetime.now()
    item.user_update = username

    db.commit()
    db.refresh(item)
    return CodePhotoItem.model_validate(item)


def delete_code_photo(
    db: Session,
    item_id: int,
    username: Optional[str] = None,
) -> bool:
    """
    Xóa Code Photo (soft delete active=False).
    """
    item = db.query(CodePhoto).filter(CodePhoto.id == item_id).first()
    if not item:
        return False

    item.active = False
    item.ngay_update = datetime.now()
    item.user_update = username
    db.commit()
    return True


def export_code_photo_excel(
    db: Session,
    search: Optional[str] = None,
    hientrang: Optional[str] = None,
) -> io.BytesIO:
    """
    Xuất danh sách Code Photo ra file Excel .xlsx
    """
    query = db.query(CodePhoto).filter(
        or_(CodePhoto.active == True, CodePhoto.active == None)
    )

    if hientrang and hientrang.strip().upper() in ("ON", "OFF"):
        query = query.filter(CodePhoto.hientrang == hientrang.strip().upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CodePhoto.name.ilike(term),
                CodePhoto.email.ilike(term),
                CodePhoto.manv.ilike(term),
                CodePhoto.pass_code.ilike(term),
                CodePhoto.cmnd_sdt.ilike(term),
                CodePhoto.bophan.ilike(term),
                CodePhoto.chucdanh.ilike(term),
                CodePhoto.code_dept.ilike(term),
                CodePhoto.note.ilike(term),
            )
        )

    items = query.order_by(desc(CodePhoto.id)).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Danh Sách Code Photo"

    font_title = Font(name="Arial", size=15, bold=True, color="FFFFFF")
    fill_title = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
    font_header = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    fill_header = PatternFill(start_color="1D4ED8", end_color="1D4ED8", fill_type="solid")
    font_body = Font(name="Arial", size=10)

    thin_border = Border(
        left=Side(style="thin", color="D1D5DB"),
        right=Side(style="thin", color="D1D5DB"),
        top=Side(style="thin", color="D1D5DB"),
        bottom=Side(style="thin", color="D1D5DB"),
    )

    fill_on = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
    font_on = Font(name="Arial", size=10, bold=True, color="166534")
    fill_off = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    font_off = Font(name="Arial", size=10, bold=True, color="991B1B")

    # Title Row
    ws.merge_cells("A1:K1")
    title_cell = ws["A1"]
    title_cell.value = "DANH SÁCH MÃ CODE MÁY PHOTOCOPY - GOLDEN GATE RESTAURANT GROUP"
    title_cell.font = font_title
    title_cell.fill = fill_title
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 40

    headers = [
        "STT",
        "Hiện Trạng",
        "Mã NV",
        "Tên Nhân Viên",
        "Email",
        "Pass Code",
        "CMND / SĐT",
        "Bộ Phận",
        "Chức Danh",
        "Code Dept",
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
        ht_val = (item.hientrang or "").strip().upper()
        row_data = [
            row_idx - 2,
            ht_val,
            item.manv or "",
            item.name or "",
            item.email or "",
            item.pass_code or "",
            item.cmnd_sdt or "",
            item.bophan or "",
            item.chucdanh or "",
            item.code_dept or "",
            item.note or "",
        ]
        for col_idx, val in enumerate(row_data, 1):
            c = ws.cell(row=row_idx, column=col_idx, value=val)
            c.font = font_body
            c.border = thin_border
            if col_idx == 2:  # Hiện trạng
                c.alignment = Alignment(horizontal="center", vertical="center")
                if ht_val == "ON":
                    c.fill = fill_on
                    c.font = font_on
                else:
                    c.fill = fill_off
                    c.font = font_off
            elif col_idx in (1, 3, 6, 10):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")
        ws.row_dimensions[row_idx].height = 22

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
