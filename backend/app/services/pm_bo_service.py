import unicodedata
from datetime import datetime
from typing import Optional, List
from sqlalchemy import select, and_, desc, text
from sqlalchemy.orm import Session

from app.models.software_version import SoftwareVersion
from app.models.brand_print_standard import BrandPrintStandard
from app.schemas.pm_bo import (
    PMSoftwareItem,
    PMSoftwareCreate,
    PMSoftwareUpdate,
    SoftwareVersionItem,
    SoftwareVersionCreate,
    SoftwareVersionUpdate,
    BrandPrintStandardItem,
    BrandPrintStandardCreate,
    BrandPrintStandardUpdate,
)


def remove_accents(input_str: Optional[str]) -> str:
    if not input_str:
        return ""
    s = unicodedata.normalize("NFD", input_str)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D").lower()


# =========================================================================
# 1. TAB 1: PHẦN MỀM & PM PHỤ TRÁCH (ALLAPP_PM)
# =========================================================================

def get_pm_softwares(db: Session, search: Optional[str] = None) -> List[PMSoftwareItem]:
    sql = text("""
        SELECT id, project_name, pm_project, pm_name, pm_phone, pm_email, note_them, ngay_trienkhai, ngay_update, active 
        FROM ALLAPP_PM 
        WHERE active = 1 
        ORDER BY id ASC
    """)
    rows = db.execute(sql).fetchall()

    results: List[PMSoftwareItem] = []
    search_clean = remove_accents(search).strip() if search else ""

    for r in rows:
        row_dict = dict(r._mapping)
        item = PMSoftwareItem(
            id=row_dict["id"],
            project_name=row_dict["project_name"] or "",
            pm_project=row_dict.get("pm_project"),
            pm_name=row_dict.get("pm_name") or (row_dict.get("pm_project") or "").split("/")[0].strip(),
            pm_phone=row_dict.get("pm_phone"),
            pm_email=row_dict.get("pm_email"),
            note_them=row_dict.get("note_them"),
            ngay_trienkhai=row_dict["ngay_trienkhai"].strftime("%Y-%m-%d %H:%M:%S") if row_dict.get("ngay_trienkhai") else None,
            ngay_update=row_dict["ngay_update"].strftime("%Y-%m-%d %H:%M:%S") if row_dict.get("ngay_update") else None,
            active=bool(row_dict.get("active", True)),
        )

        if search_clean:
            haystack = " ".join([
                item.project_name,
                item.pm_name or "",
                item.pm_phone or "",
                item.pm_email or "",
                item.note_them or "",
            ])
            if search_clean not in remove_accents(haystack):
                continue

        results.append(item)

    return results


def create_pm_software(db: Session, payload: PMSoftwareCreate, current_username: str) -> PMSoftwareItem:
    now = datetime.now()
    name = (payload.pm_name or "").strip()
    phone = (payload.pm_phone or "").strip()
    email = (payload.pm_email or "").strip()

    # Tạo chuỗi pm_project tương thích ngược
    parts = []
    if name:
        parts.append(name)
    if phone:
        parts.append(phone)
    if email:
        parts.append(email)
    pm_project_legacy = " / ".join(parts) if parts else None

    sql = text("""
        INSERT INTO ALLAPP_PM (project_name, pm_project, pm_name, pm_phone, pm_email, note_them, ngay_trienkhai, ngay_update, active)
        VALUES (:project_name, :pm_project, :pm_name, :pm_phone, :pm_email, :note_them, :now, :now, 1);
        SELECT SCOPE_IDENTITY() AS new_id;
    """)

    result = db.execute(sql, {
        "project_name": payload.project_name.strip(),
        "pm_project": pm_project_legacy,
        "pm_name": name or None,
        "pm_phone": phone or None,
        "pm_email": email or None,
        "note_them": (payload.note_them or "").strip() or None,
        "now": now,
    })
    db.commit()
    new_id = int(result.scalar() or 0)

    return PMSoftwareItem(
        id=new_id,
        project_name=payload.project_name.strip(),
        pm_project=pm_project_legacy,
        pm_name=name or None,
        pm_phone=phone or None,
        pm_email=email or None,
        note_them=(payload.note_them or "").strip() or None,
        ngay_trienkhai=now.strftime("%Y-%m-%d %H:%M:%S"),
        ngay_update=now.strftime("%Y-%m-%d %H:%M:%S"),
        active=True,
    )


def update_pm_software(db: Session, item_id: int, payload: PMSoftwareUpdate, current_username: str) -> PMSoftwareItem:
    now = datetime.now()
    existing = db.execute(text("SELECT * FROM ALLAPP_PM WHERE id = :id AND active = 1"), {"id": item_id}).fetchone()
    if not existing:
        raise ValueError("Phần mềm không tồn tại hoặc đã bị xóa.")

    ex_dict = dict(existing._mapping)
    p_name = payload.project_name.strip() if payload.project_name is not None else ex_dict.get("project_name")
    pm_name = payload.pm_name.strip() if payload.pm_name is not None else ex_dict.get("pm_name")
    pm_phone = payload.pm_phone.strip() if payload.pm_phone is not None else ex_dict.get("pm_phone")
    pm_email = payload.pm_email.strip() if payload.pm_email is not None else ex_dict.get("pm_email")
    note_them = payload.note_them.strip() if payload.note_them is not None else ex_dict.get("note_them")

    parts = []
    if pm_name:
        parts.append(pm_name)
    if pm_phone:
        parts.append(pm_phone)
    if pm_email:
        parts.append(pm_email)
    pm_project_legacy = " / ".join(parts) if parts else None

    sql = text("""
        UPDATE ALLAPP_PM
        SET project_name = :p_name,
            pm_project = :pm_project,
            pm_name = :pm_name,
            pm_phone = :pm_phone,
            pm_email = :pm_email,
            note_them = :note_them,
            ngay_update = :now
        WHERE id = :id
    """)
    db.execute(sql, {
        "id": item_id,
        "p_name": p_name,
        "pm_project": pm_project_legacy,
        "pm_name": pm_name or None,
        "pm_phone": pm_phone or None,
        "pm_email": pm_email or None,
        "note_them": note_them or None,
        "now": now,
    })
    db.commit()

    return PMSoftwareItem(
        id=item_id,
        project_name=p_name or "",
        pm_project=pm_project_legacy,
        pm_name=pm_name or None,
        pm_phone=pm_phone or None,
        pm_email=pm_email or None,
        note_them=note_them or None,
        ngay_update=now.strftime("%Y-%m-%d %H:%M:%S"),
        active=True,
    )


def delete_pm_software(db: Session, item_id: int, current_username: str) -> bool:
    sql = text("UPDATE ALLAPP_PM SET active = 0, ngay_update = GETDATE() WHERE id = :id")
    res = db.execute(sql, {"id": item_id})
    db.commit()
    return res.rowcount > 0


# =========================================================================
# 2. TAB 2: PHIÊN BẢN PHẦN MỀM (SOFTWARE_VERSIONS)
# =========================================================================

def to_software_version_item(item: SoftwareVersion) -> SoftwareVersionItem:
    return SoftwareVersionItem(
        id=item.id,
        phan_mem=item.phan_mem,
        phien_ban=item.phien_ban,
        ngay_update=item.ngay_update.strftime("%Y-%m-%d %H:%M:%S") if item.ngay_update else None,
        noi_dung_update=item.noi_dung_update,
        hinh_anh=getattr(item, "hinh_anh", None),
        ghi_chu=getattr(item, "ghi_chu", None),
        nguoi_update=item.nguoi_update,
        active=item.active,
        created_at=item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else None,
        updated_at=item.updated_at.strftime("%Y-%m-%d %H:%M:%S") if item.updated_at else None,
    )


def get_software_versions(db: Session, search: Optional[str] = None) -> List[SoftwareVersionItem]:
    stmt = select(SoftwareVersion).where(SoftwareVersion.active == True).order_by(desc(SoftwareVersion.ngay_update), desc(SoftwareVersion.id))
    rows = db.scalars(stmt).all()

    search_clean = remove_accents(search).strip() if search else ""
    results = []
    for r in rows:
        item = to_software_version_item(r)
        if search_clean:
            haystack = " ".join([
                item.phan_mem,
                item.phien_ban,
                item.noi_dung_update or "",
                item.ghi_chu or "",
                item.nguoi_update or "",
            ])
            if search_clean not in remove_accents(haystack):
                continue
        results.append(item)
    return results


def create_software_version(db: Session, payload: SoftwareVersionCreate, current_username: str) -> SoftwareVersionItem:
    now = datetime.now()
    version_date = payload.ngay_update or now
    item = SoftwareVersion(
        phan_mem=payload.phan_mem.strip(),
        phien_ban=payload.phien_ban.strip(),
        ngay_update=version_date,
        noi_dung_update=(payload.noi_dung_update or "").strip() or None,
        hinh_anh=(payload.hinh_anh or "").strip() or None,
        ghi_chu=(payload.ghi_chu or "").strip() or None,
        nguoi_update=current_username,
        active=True,
        created_at=now,
        updated_at=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)

    # Nếu chọn đồng bộ ngày update cho tất cả các phần mềm còn lại
    if payload.sync_all_dates and version_date is not None:
        db.execute(
            text("""
                UPDATE SOFTWARE_VERSIONS
                SET ngay_update = :target_date,
                    nguoi_update = :current_username,
                    updated_at = :now
                WHERE active = 1 AND id != :current_id
            """),
            {
                "target_date": version_date,
                "current_username": current_username,
                "now": now,
                "current_id": item.id,
            },
        )
        db.commit()

    return to_software_version_item(item)


def update_software_version(db: Session, item_id: int, payload: SoftwareVersionUpdate, current_username: str) -> SoftwareVersionItem:
    item = db.scalar(select(SoftwareVersion).where(SoftwareVersion.id == item_id, SoftwareVersion.active == True))
    if not item:
        raise ValueError("Phần mềm không tồn tại hoặc đã bị xóa.")

    now = datetime.now()
    if payload.phan_mem is not None:
        item.phan_mem = payload.phan_mem.strip()
    if payload.phien_ban is not None:
        item.phien_ban = payload.phien_ban.strip()
    if payload.ngay_update is not None:
        item.ngay_update = payload.ngay_update
    if payload.noi_dung_update is not None:
        item.noi_dung_update = payload.noi_dung_update.strip() or None
    if payload.hinh_anh is not None:
        item.hinh_anh = payload.hinh_anh.strip() or None
    if payload.ghi_chu is not None:
        item.ghi_chu = payload.ghi_chu.strip() or None

    item.nguoi_update = current_username
    item.updated_at = now
    db.commit()
    db.refresh(item)

    # Nếu người dùng chọn đồng bộ ngày update cho tất cả các phần mềm còn lại
    if payload.sync_all_dates and payload.ngay_update is not None:
        db.execute(
            text("""
                UPDATE SOFTWARE_VERSIONS
                SET ngay_update = :target_date,
                    nguoi_update = :current_username,
                    updated_at = :now
                WHERE active = 1 AND id != :current_id
            """),
            {
                "target_date": payload.ngay_update,
                "current_username": current_username,
                "now": now,
                "current_id": item_id,
            },
        )
        db.commit()

    return to_software_version_item(item)


def sync_software_version_dates(
    db: Session,
    target_date: datetime,
    current_username: str,
    exclude_id: Optional[int] = None,
    target_ids: Optional[List[int]] = None,
    target_names: Optional[List[str]] = None,
) -> List[SoftwareVersionItem]:
    """Cập nhật đồng bộ ngày update cho các phần mềm được chọn (hoặc tất cả nếu không chọn lọc)."""
    now = datetime.now()

    # Nếu truyền danh sách target_ids hoặc target_names cụ thể
    if target_ids is not None or target_names is not None:
        valid_ids = set(target_ids or [])
        clean_names = [n.strip().lower() for n in (target_names or []) if n and n.strip()]

        all_active = db.scalars(select(SoftwareVersion).where(SoftwareVersion.active == True)).all()
        existing_names = {item.phan_mem.strip().lower(): item for item in all_active}

        # Cập nhật các bản ghi hiện có
        for item in all_active:
            match_id = item.id in valid_ids
            match_name = item.phan_mem.strip().lower() in clean_names
            if (match_id or match_name) and (exclude_id is None or item.id != exclude_id):
                item.ngay_update = target_date
                item.nguoi_update = current_username
                item.updated_at = now

        # Nếu có target_name chưa có trong DB thì tự động tạo mới
        if target_names:
            for name in target_names:
                name_clean = name.strip()
                if name_clean and name_clean.lower() not in existing_names:
                    new_item = SoftwareVersion(
                        phan_mem=name_clean,
                        phien_ban="Chưa cấu hình",
                        ngay_update=target_date,
                        nguoi_update=current_username,
                        active=True,
                        created_at=now,
                        updated_at=now,
                    )
                    db.add(new_item)

        db.commit()
    elif exclude_id is not None:
        db.execute(
            text("""
                UPDATE SOFTWARE_VERSIONS
                SET ngay_update = :target_date,
                    nguoi_update = :current_username,
                    updated_at = :now
                WHERE active = 1 AND id != :exclude_id
            """),
            {
                "target_date": target_date,
                "current_username": current_username,
                "now": now,
                "exclude_id": exclude_id,
            },
        )
        db.commit()
    else:
        db.execute(
            text("""
                UPDATE SOFTWARE_VERSIONS
                SET ngay_update = :target_date,
                    nguoi_update = :current_username,
                    updated_at = :now
                WHERE active = 1
            """),
            {
                "target_date": target_date,
                "current_username": current_username,
                "now": now,
            },
        )
        db.commit()

    return get_software_versions(db)


def delete_software_version(db: Session, item_id: int, current_username: str) -> bool:
    item = db.scalar(select(SoftwareVersion).where(SoftwareVersion.id == item_id, SoftwareVersion.active == True))
    if not item:
        return False
    item.active = False
    item.updated_at = datetime.now()
    db.commit()
    return True


# =========================================================================
# 3. TAB 3: CHUẨN HÓA IN TỪNG BRAND (BRAND_PRINT_STANDARDS)
# =========================================================================

def to_brand_print_item(item: BrandPrintStandard) -> BrandPrintStandardItem:
    return BrandPrintStandardItem(
        id=item.id,
        brand_name=item.brand_name,
        loai_in=item.loai_in,
        tieu_de=item.tieu_de,
        ghi_chu=item.ghi_chu,
        images=item.images,
        files=item.files,
        nguoi_tao=item.nguoi_tao,
        nguoi_update=item.nguoi_update,
        ngay_tao=item.ngay_tao.strftime("%Y-%m-%d %H:%M:%S") if item.ngay_tao else None,
        ngay_update=item.ngay_update.strftime("%Y-%m-%d %H:%M:%S") if item.ngay_update else None,
        active=bool(item.active),
    )


def get_brand_print_standards(
    db: Session,
    search: Optional[str] = None,
    loai_in: Optional[str] = None,
) -> List[BrandPrintStandardItem]:
    stmt = select(BrandPrintStandard).where(BrandPrintStandard.active == True)

    if loai_in and loai_in != "ALL":
        stmt = stmt.where(BrandPrintStandard.loai_in == loai_in)

    stmt = stmt.order_by(BrandPrintStandard.brand_name.asc(), BrandPrintStandard.id.desc())
    items = db.scalars(stmt).all()

    if search:
        s_clean = remove_accents(search).strip()
        filtered = []
        for it in items:
            haystack = f"{it.brand_name} {it.loai_in} {it.tieu_de or ''} {it.ghi_chu or ''}"
            if s_clean in remove_accents(haystack):
                filtered.append(it)
        items = filtered

    return [to_brand_print_item(it) for it in items]


def create_brand_print_standard(
    db: Session,
    payload: BrandPrintStandardCreate,
    current_username: str,
) -> BrandPrintStandardItem:
    now = datetime.now()
    item = BrandPrintStandard(
        brand_name=payload.brand_name.strip(),
        loai_in=payload.loai_in.strip(),
        tieu_de=payload.tieu_de.strip() if payload.tieu_de else None,
        ghi_chu=payload.ghi_chu.strip() if payload.ghi_chu else None,
        images=payload.images,
        files=payload.files,
        nguoi_tao=current_username,
        nguoi_update=current_username,
        ngay_tao=now,
        ngay_update=now,
        active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return to_brand_print_item(item)


def update_brand_print_standard(
    db: Session,
    item_id: int,
    payload: BrandPrintStandardUpdate,
    current_username: str,
) -> BrandPrintStandardItem:
    item = db.scalar(select(BrandPrintStandard).where(BrandPrintStandard.id == item_id, BrandPrintStandard.active == True))
    if not item:
        raise ValueError("Không tìm thấy thông tin chuẩn hóa in.")

    now = datetime.now()
    if payload.brand_name is not None:
        item.brand_name = payload.brand_name.strip()
    if payload.loai_in is not None:
        item.loai_in = payload.loai_in.strip()
    if payload.tieu_de is not None:
        item.tieu_de = payload.tieu_de.strip() or None
    if payload.ghi_chu is not None:
        item.ghi_chu = payload.ghi_chu.strip() or None
    if payload.images is not None:
        item.images = payload.images
    if payload.files is not None:
        item.files = payload.files

    item.nguoi_update = current_username
    item.ngay_update = now
    db.commit()
    db.refresh(item)
    return to_brand_print_item(item)


def delete_brand_print_standard(db: Session, item_id: int, current_username: str) -> bool:
    item = db.scalar(select(BrandPrintStandard).where(BrandPrintStandard.id == item_id, BrandPrintStandard.active == True))
    if not item:
        return False
    item.active = False
    item.nguoi_update = current_username
    item.ngay_update = datetime.now()
    db.commit()
    return True

