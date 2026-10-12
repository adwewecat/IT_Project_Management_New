import json
import re
import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from fastapi import HTTPException, status
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models.work_checklist import (
    ChecklistTemplate,
    ChecklistTemplateItem,
    ChecklistRun,
    ChecklistRunItem,
)
from app.models.user import User
from app.schemas.work_checklist import (
    ChecklistTemplateSchema,
    ChecklistTemplateItemSchema,
    ChecklistTemplateCreate,
    ChecklistTemplateUpdate,
    ChecklistTemplateItemCreate,
    ChecklistTemplateItemBatchCreate,
    ChecklistRunSchema,
    ChecklistRunItemSchema,
    ChecklistRunCreate,
    ChecklistRunUpdate,
    ChecklistRunDetailResponse,
    ChecklistRunListResponse,
    ChecklistRunStatsSchema,
    AppUserOptionSchema,
)

def _safe_json_images(img_str: Optional[str]) -> List[str]:
    if not img_str:
        return []
    try:
        parsed = json.loads(img_str)
        return parsed if isinstance(parsed, list) else [img_str]
    except Exception:
        return [img_str] if img_str else []


# ==========================================
# 1. TEMPLATES (SƯỜN CHECKLIST)
# ==========================================

def get_templates(db: Session, search: Optional[str] = None) -> List[ChecklistTemplateSchema]:
    query = db.query(ChecklistTemplate).filter(ChecklistTemplate.active == True)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(ChecklistTemplate.ten_suon).like(term),
                func.lower(ChecklistTemplate.danh_muc).like(term),
                func.lower(ChecklistTemplate.mo_ta).like(term),
            )
        )
    records = query.order_by(desc(ChecklistTemplate.id)).all()

    result = []
    for r in records:
        active_items = [it for it in r.items if it.active]
        item_schemas = [ChecklistTemplateItemSchema.from_orm(it) for it in active_items]
        tmpl = ChecklistTemplateSchema(
            id=r.id,
            ten_suon=r.ten_suon,
            ma_suon=r.ma_suon,
            danh_muc=r.danh_muc or "Vận hành",
            mo_ta=r.mo_ta,
            nguoi_tao=r.nguoi_tao,
            sla_days=r.sla_days or 5,
            ngay_tao=r.ngay_tao,
            ngay_update=r.ngay_update,
            active=bool(r.active),
            total_items=len(active_items),
            items=item_schemas,
        )
        result.append(tmpl)
    return result


def get_template_detail(db: Session, template_id: int) -> ChecklistTemplateSchema:
    tmpl = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id, ChecklistTemplate.active == True).first()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sườn checklist.")
    
    active_items = [it for it in tmpl.items if it.active]
    return ChecklistTemplateSchema(
        id=tmpl.id,
        ten_suon=tmpl.ten_suon,
        ma_suon=tmpl.ma_suon,
        danh_muc=tmpl.danh_muc or "Vận hành",
        mo_ta=tmpl.mo_ta,
        nguoi_tao=tmpl.nguoi_tao,
        sla_days=tmpl.sla_days or 5,
        ngay_tao=tmpl.ngay_tao,
        ngay_update=tmpl.ngay_update,
        active=bool(tmpl.active),
        total_items=len(active_items),
        items=[ChecklistTemplateItemSchema.from_orm(it) for it in active_items],
    )


def create_template(db: Session, payload: ChecklistTemplateCreate, username: str) -> ChecklistTemplateSchema:
    tmpl = ChecklistTemplate(
        ten_suon=payload.ten_suon.strip(),
        ma_suon=payload.ma_suon.strip() if payload.ma_suon else None,
        danh_muc=payload.danh_muc.strip() if payload.danh_muc else "Vận hành",
        mo_ta=payload.mo_ta.strip() if payload.mo_ta else None,
        nguoi_tao=username,
        sla_days=payload.sla_days if (payload.sla_days and payload.sla_days > 0) else 5,
        ngay_tao=datetime.now(),
        ngay_update=datetime.now(),
        active=True,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)

    if payload.items:
        stt = 1
        for it in payload.items:
            tieu_de = it.get("tieu_de", "").strip()
            if tieu_de:
                item_obj = ChecklistTemplateItem(
                    template_id=tmpl.id,
                    nhom=it.get("nhom", "Chung"),
                    tieu_de=tieu_de,
                    huong_dan=it.get("huong_dan"),
                    stt=it.get("stt", stt),
                    active=True,
                )
                db.add(item_obj)
                stt += 1
        db.commit()
        db.refresh(tmpl)

    return get_template_detail(db, tmpl.id)


def update_template(db: Session, template_id: int, payload: ChecklistTemplateUpdate) -> ChecklistTemplateSchema:
    tmpl = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id, ChecklistTemplate.active == True).first()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sườn checklist.")

    if payload.ten_suon is not None:
        tmpl.ten_suon = payload.ten_suon.strip()
    if payload.ma_suon is not None:
        tmpl.ma_suon = payload.ma_suon.strip()
    if payload.danh_muc is not None:
        tmpl.danh_muc = payload.danh_muc.strip()
    if payload.mo_ta is not None:
        tmpl.mo_ta = payload.mo_ta.strip()
    if payload.sla_days is not None and payload.sla_days > 0:
        tmpl.sla_days = payload.sla_days

    tmpl.ngay_update = datetime.now()
    db.commit()
    db.refresh(tmpl)
    return get_template_detail(db, tmpl.id)


def delete_template(db: Session, template_id: int) -> bool:
    tmpl = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id, ChecklistTemplate.active == True).first()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sườn checklist.")

    tmpl.active = False
    tmpl.ngay_update = datetime.now()
    db.commit()
    return True


def add_template_item(db: Session, template_id: int, payload: ChecklistTemplateItemCreate) -> ChecklistTemplateItemSchema:
    tmpl = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id, ChecklistTemplate.active == True).first()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sườn checklist.")

    current_max_stt = db.query(func.max(ChecklistTemplateItem.stt)).filter(
        ChecklistTemplateItem.template_id == template_id,
        ChecklistTemplateItem.active == True
    ).scalar() or 0

    item = ChecklistTemplateItem(
        template_id=template_id,
        nhom=payload.nhom.strip() if payload.nhom else "Chung",
        tieu_de=payload.tieu_de.strip(),
        huong_dan=payload.huong_dan.strip() if payload.huong_dan else None,
        stt=payload.stt if payload.stt and payload.stt > 0 else current_max_stt + 1,
        active=True,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return ChecklistTemplateItemSchema.from_orm(item)


def batch_add_template_items(db: Session, template_id: int, payload: ChecklistTemplateItemBatchCreate) -> List[ChecklistTemplateItemSchema]:
    tmpl = db.query(ChecklistTemplate).filter(ChecklistTemplate.id == template_id, ChecklistTemplate.active == True).first()
    if not tmpl:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy sườn checklist.")

    lines_to_add = []
    if payload.items:
        lines_to_add = [line.strip() for line in payload.items if line.strip()]
    elif payload.raw_text:
        raw_lines = payload.raw_text.strip().split("\n")
        for rl in raw_lines:
            cleaned = re.sub(r"^[\s*\-+•\d\.\)]+\s*", "", rl).strip()
            if cleaned:
                lines_to_add.append(cleaned)

    current_max_stt = db.query(func.max(ChecklistTemplateItem.stt)).filter(
        ChecklistTemplateItem.template_id == template_id,
        ChecklistTemplateItem.active == True
    ).scalar() or 0

    created_items = []
    for i, line in enumerate(lines_to_add):
        item = ChecklistTemplateItem(
            template_id=template_id,
            nhom=payload.nhom.strip() if payload.nhom else "Chung",
            tieu_de=line,
            stt=current_max_stt + i + 1,
            active=True,
        )
        db.add(item)
        created_items.append(item)

    db.commit()
    return [ChecklistTemplateItemSchema.from_orm(it) for it in created_items]


def delete_template_item(db: Session, item_id: int) -> bool:
    item = db.query(ChecklistTemplateItem).filter(ChecklistTemplateItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mục sườn checklist.")
    item.active = False
    db.commit()
    return True


# ==========================================
# 2. RUNS (CÁC ĐỢT CHECKLIST THỰC TẾ)
# ==========================================

def _compute_run_progress(run: ChecklistRun) -> Dict[str, Any]:
    active_items = [it for it in run.items if it.active]
    total = len(active_items)
    passed = sum(1 for it in active_items if it.trang_thai == "PASSED")
    failed = sum(1 for it in active_items if it.trang_thai == "FAILED")
    pending = sum(1 for it in active_items if it.trang_thai in ("PENDING", None, ""))
    
    percent = int((passed / total * 100)) if total > 0 else 0
    return {
        "total_items": total,
        "passed_items": passed,
        "failed_items": failed,
        "pending_items": pending,
        "progress_percent": percent,
    }


def _run_to_schema(run: ChecklistRun) -> ChecklistRunSchema:
    prog = _compute_run_progress(run)
    sla_days = run.sla_days if (run.sla_days and run.sla_days > 0) else 5
    han_chot = run.han_chot_sla
    if not han_chot and run.ngay_bat_dau:
        han_chot = run.ngay_bat_dau + timedelta(days=sla_days)

    now = datetime.now()
    is_done = (run.trang_thai == "Hoàn thành") or (prog["total_items"] > 0 and prog["progress_percent"] == 100)

    if is_done:
        finish_time = run.ngay_hoan_thanh or now
        if han_chot and finish_time > han_chot:
            delta = finish_time - han_chot
            if delta.days >= 1:
                sla_text = f"Trễ hạn {delta.days} ngày"
            else:
                hours = max(int(delta.total_seconds() / 3600), 1)
                sla_text = f"Trễ hạn {hours} giờ"
            sla_status = "COMPLETED_LATE"
        else:
            sla_status = "COMPLETED_ON_TIME"
            sla_text = "Đúng hạn ✓"
    else:
        if han_chot:
            if now > han_chot:
                delta = now - han_chot
                if delta.days >= 1:
                    sla_text = f"Quá hạn {delta.days} ngày"
                else:
                    hours = max(int(delta.total_seconds() / 3600), 1)
                    sla_text = f"Quá hạn {hours} giờ"
                sla_status = "OVERDUE"
            else:
                delta = han_chot - now
                if delta.days >= 2:
                    sla_text = f"Còn {delta.days} ngày"
                    sla_status = "IN_TIME"
                elif delta.days == 1:
                    sla_text = "Còn 1 ngày"
                    sla_status = "WARNING"
                else:
                    hours = max(int(delta.total_seconds() / 3600), 1)
                    sla_text = f"Còn {hours} giờ"
                    sla_status = "WARNING"
        else:
            sla_status = "IN_TIME"
            sla_text = f"{sla_days} ngày"

    return ChecklistRunSchema(
        id=run.id,
        template_id=run.template_id,
        ten_dot=run.ten_dot,
        ten_suon=run.ten_suon,
        version_note=run.version_note,
        ghi_chu=run.ghi_chu,
        nguoi_thuc_hien=run.nguoi_thuc_hien,
        nguoi_tao=run.nguoi_tao,
        trang_thai=run.trang_thai or "Đang thực hiện",
        sla_days=sla_days,
        han_chot_sla=han_chot,
        sla_status=sla_status,
        sla_text=sla_text,
        ngay_bat_dau=run.ngay_bat_dau,
        ngay_hoan_thanh=run.ngay_hoan_thanh,
        ngay_tao=run.ngay_tao,
        ngay_update=run.ngay_update,
        active=bool(run.active),
        total_items=prog["total_items"],
        passed_items=prog["passed_items"],
        failed_items=prog["failed_items"],
        pending_items=prog["pending_items"],
        progress_percent=prog["progress_percent"],
    )


def get_runs(
    db: Session,
    search: Optional[str] = None,
    template_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> ChecklistRunListResponse:
    query = db.query(ChecklistRun).filter(ChecklistRun.active == True)

    if template_id and template_id > 0:
        query = query.filter(ChecklistRun.template_id == template_id)

    if status_filter and status_filter.strip() and status_filter.lower() != "all":
        query = query.filter(ChecklistRun.trang_thai == status_filter.strip())

    if from_date and from_date.strip():
        try:
            fd = datetime.strptime(from_date.strip(), "%Y-%m-%d")
            query = query.filter(ChecklistRun.ngay_bat_dau >= fd)
        except Exception:
            pass

    if to_date and to_date.strip():
        try:
            td = datetime.strptime(f"{to_date.strip()} 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(ChecklistRun.ngay_bat_dau <= td)
        except Exception:
            pass

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(ChecklistRun.ten_dot).like(term),
                func.lower(ChecklistRun.version_note).like(term),
                func.lower(ChecklistRun.ten_suon).like(term),
                func.lower(ChecklistRun.nguoi_thuc_hien).like(term),
                func.lower(ChecklistRun.ghi_chu).like(term),
            )
        )

    # Compute overall stats for the current filter
    all_matching = query.all()
    total_runs = len(all_matching)
    unique_versions = len({r.version_note.strip().lower() for r in all_matching if r.version_note and r.version_note.strip()})
    
    all_matching_schemas = [_run_to_schema(r) for r in all_matching]
    completed_runs = sum(1 for s in all_matching_schemas if s.trang_thai == "Hoàn thành" or s.progress_percent == 100)
    total_items = sum(s.total_items for s in all_matching_schemas)
    passed_items = sum(s.passed_items for s in all_matching_schemas)
    failed_items = sum(s.failed_items for s in all_matching_schemas)
    avg_progress = int(sum(s.progress_percent for s in all_matching_schemas) / total_runs) if total_runs > 0 else 0

    stats = ChecklistRunStatsSchema(
        total_runs=total_runs,
        unique_versions=unique_versions,
        completed_runs=completed_runs,
        total_items=total_items,
        passed_items=passed_items,
        failed_items=failed_items,
        avg_progress=avg_progress,
    )

    records = query.order_by(desc(ChecklistRun.id)).offset((page - 1) * page_size).limit(page_size).all()
    items = [_run_to_schema(r) for r in records]

    return ChecklistRunListResponse(
        total=total_runs,
        page=page,
        page_size=page_size,
        stats=stats,
        items=items,
    )


def get_run_detail(db: Session, run_id: int) -> ChecklistRunDetailResponse:
    run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.active == True).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đợt checklist.")

    run_schema = _run_to_schema(run)
    active_items = [it for it in run.items if it.active]

    item_schemas = []
    groups_set = set()
    for it in active_items:
        if it.nhom:
            groups_set.add(it.nhom.strip())
        item_schemas.append(
            ChecklistRunItemSchema(
                id=it.id,
                run_id=it.run_id,
                stt=it.stt or 0,
                nhom=it.nhom or "Chung",
                tieu_de=it.tieu_de,
                huong_dan=it.huong_dan,
                trang_thai=it.trang_thai or "PENDING",
                ghi_chu_ket_qua=it.ghi_chu_ket_qua,
                images=_safe_json_images(it.images),
                nguoi_hoan_thanh=it.nguoi_hoan_thanh,
                ngay_hoan_thanh=it.ngay_hoan_thanh,
                active=bool(it.active),
            )
        )

    groups = sorted(list(groups_set))

    return ChecklistRunDetailResponse(
        run=run_schema,
        items=item_schemas,
        groups=groups,
    )


def create_run(db: Session, payload: ChecklistRunCreate, username: str) -> ChecklistRunSchema:
    template = db.query(ChecklistTemplate).filter(
        ChecklistTemplate.id == payload.template_id,
        ChecklistTemplate.active == True
    ).first()
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sườn checklist không tồn tại hoặc đã bị xóa.")

    tmpl_items = [it for it in template.items if it.active]
    if not tmpl_items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sườn checklist này chưa có mục nào. Vui lòng thêm các mục con vào sườn trước khi tạo đợt test!")

    ten_dot = payload.ten_dot.strip() if payload.ten_dot and payload.ten_dot.strip() else f"{template.ten_suon} - {payload.version_note.strip()}"

    now = datetime.now()
    sla_days = payload.sla_days if (payload.sla_days and payload.sla_days > 0) else (template.sla_days or 5)
    han_chot_sla = now + timedelta(days=sla_days)

    run = ChecklistRun(
        template_id=template.id,
        ten_dot=ten_dot,
        ten_suon=template.ten_suon,
        version_note=payload.version_note.strip(),
        ghi_chu=payload.ghi_chu.strip() if payload.ghi_chu else None,
        nguoi_thuc_hien=payload.nguoi_thuc_hien.strip() if payload.nguoi_thuc_hien else username,
        nguoi_tao=username,
        trang_thai="Đang thực hiện",
        sla_days=sla_days,
        han_chot_sla=han_chot_sla,
        ngay_bat_dau=now,
        ngay_tao=now,
        ngay_update=now,
        active=True,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Copy all template items to run items
    for tmpl_it in tmpl_items:
        run_it = ChecklistRunItem(
            run_id=run.id,
            stt=tmpl_it.stt,
            nhom=tmpl_it.nhom,
            tieu_de=tmpl_it.tieu_de,
            huong_dan=tmpl_it.huong_dan,
            trang_thai="PENDING",
            ghi_chu_ket_qua=None,
            images=None,
            active=True,
        )
        db.add(run_it)

    db.commit()
    db.refresh(run)

    return _run_to_schema(run)


def update_run(db: Session, run_id: int, payload: ChecklistRunUpdate) -> ChecklistRunSchema:
    run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.active == True).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đợt checklist.")

    if payload.ten_dot is not None:
        run.ten_dot = payload.ten_dot.strip()
    if payload.version_note is not None:
        run.version_note = payload.version_note.strip()
    if payload.ghi_chu is not None:
        run.ghi_chu = payload.ghi_chu.strip()
    if payload.nguoi_thuc_hien is not None:
        run.nguoi_thuc_hien = payload.nguoi_thuc_hien.strip()
    if payload.sla_days is not None and payload.sla_days > 0:
        run.sla_days = payload.sla_days
        base_time = run.ngay_bat_dau or datetime.now()
        run.han_chot_sla = base_time + timedelta(days=payload.sla_days)
    if payload.han_chot_sla is not None:
        run.han_chot_sla = payload.han_chot_sla
    if payload.trang_thai is not None:
        run.trang_thai = payload.trang_thai.strip()
        if payload.trang_thai == "Hoàn thành" and not run.ngay_hoan_thanh:
            run.ngay_hoan_thanh = datetime.now()

    run.ngay_update = datetime.now()
    db.commit()
    db.refresh(run)
    return _run_to_schema(run)


def delete_run(db: Session, run_id: int) -> bool:
    run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.active == True).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đợt checklist.")
    run.active = False
    run.ngay_update = datetime.now()
    db.commit()
    return True


def update_run_item(
    db: Session,
    item_id: int,
    status_val: Optional[str] = None,
    note: Optional[str] = None,
    images: Optional[List[str]] = None,
    username: str = "Admin",
) -> ChecklistRunItemSchema:
    item = db.query(ChecklistRunItem).filter(ChecklistRunItem.id == item_id, ChecklistRunItem.active == True).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy mục checklist.")

    if status_val is not None:
        item.trang_thai = status_val
        if status_val in ("PASSED", "FAILED", "NA"):
            item.nguoi_hoan_thanh = username
            item.ngay_hoan_thanh = datetime.now()
        else:
            item.nguoi_hoan_thanh = None
            item.ngay_hoan_thanh = None

    if note is not None:
        item.ghi_chu_ket_qua = note.strip()

    if images is not None:
        item.images = json.dumps(images, ensure_ascii=False)

    db.commit()
    db.refresh(item)

    # Check if all items in run are completed
    run = db.query(ChecklistRun).filter(ChecklistRun.id == item.run_id).first()
    if run:
        active_items = [it for it in run.items if it.active]
        all_done = all(it.trang_thai in ("PASSED", "FAILED", "NA") for it in active_items)
        if all_done and active_items:
            run.trang_thai = "Hoàn thành"
            if not run.ngay_hoan_thanh:
                run.ngay_hoan_thanh = datetime.now()
        else:
            if run.trang_thai == "Hoàn thành":
                run.trang_thai = "Đang thực hiện"
        run.ngay_update = datetime.now()
        db.commit()

    return ChecklistRunItemSchema(
        id=item.id,
        run_id=item.run_id,
        stt=item.stt or 0,
        nhom=item.nhom or "Chung",
        tieu_de=item.tieu_de,
        huong_dan=item.huong_dan,
        trang_thai=item.trang_thai or "PENDING",
        ghi_chu_ket_qua=item.ghi_chu_ket_qua,
        images=_safe_json_images(item.images),
        nguoi_hoan_thanh=item.nguoi_hoan_thanh,
        ngay_hoan_thanh=item.ngay_hoan_thanh,
        active=bool(item.active),
    )


def add_custom_item_to_run(
    db: Session,
    run_id: int,
    tieu_de: str,
    nhom: Optional[str] = "Phát sinh thêm",
    huong_dan: Optional[str] = None,
) -> ChecklistRunItemSchema:
    run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.active == True).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đợt checklist.")

    current_max = db.query(func.max(ChecklistRunItem.stt)).filter(
        ChecklistRunItem.run_id == run_id,
        ChecklistRunItem.active == True
    ).scalar() or 0

    item = ChecklistRunItem(
        run_id=run_id,
        stt=current_max + 1,
        nhom=nhom.strip() if nhom else "Phát sinh thêm",
        tieu_de=tieu_de.strip(),
        huong_dan=huong_dan.strip() if huong_dan else None,
        trang_thai="PENDING",
        active=True,
    )
    db.add(item)
    run.ngay_update = datetime.now()
    db.commit()
    db.refresh(item)

    return ChecklistRunItemSchema(
        id=item.id,
        run_id=item.run_id,
        stt=item.stt or 0,
        nhom=item.nhom,
        tieu_de=item.tieu_de,
        huong_dan=item.huong_dan,
        trang_thai=item.trang_thai,
        images=[],
        active=True,
    )


# ==========================================
# 3. USERS & EXCEL EXPORTS
# ==========================================

def get_app_users(db: Session) -> List[AppUserOptionSchema]:
    """Lấy danh sách các nhân viên/user để phân công thực hiện test."""
    users = db.query(User).filter(User.active == True).order_by(User.full_name, User.user_name1).all()
    result = []
    for u in users:
        result.append(
            AppUserOptionSchema(
                username=u.user_name1,
                full_name=u.full_name or u.user_name1,
                email=u.email,
                phanquyen=u.phanquyen,
            )
        )
    return result


def export_runs_excel(
    db: Session,
    search: Optional[str] = None,
    template_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
) -> Tuple[io.BytesIO, str]:
    """Xuất danh sách đợt checklist và thống kê version ra file Excel."""
    query = db.query(ChecklistRun).filter(ChecklistRun.active == True)

    if template_id and template_id > 0:
        query = query.filter(ChecklistRun.template_id == template_id)

    if status_filter and status_filter.strip() and status_filter.lower() != "all":
        query = query.filter(ChecklistRun.trang_thai == status_filter.strip())

    if from_date and from_date.strip():
        try:
            fd = datetime.strptime(from_date.strip(), "%Y-%m-%d")
            query = query.filter(ChecklistRun.ngay_bat_dau >= fd)
        except Exception:
            pass

    if to_date and to_date.strip():
        try:
            td = datetime.strptime(f"{to_date.strip()} 23:59:59", "%Y-%m-%d %H:%M:%S")
            query = query.filter(ChecklistRun.ngay_bat_dau <= td)
        except Exception:
            pass

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(ChecklistRun.ten_dot).like(term),
                func.lower(ChecklistRun.version_note).like(term),
                func.lower(ChecklistRun.ten_suon).like(term),
                func.lower(ChecklistRun.nguoi_thuc_hien).like(term),
                func.lower(ChecklistRun.ghi_chu).like(term),
            )
        )

    records = query.order_by(desc(ChecklistRun.id)).all()
    schemas = [_run_to_schema(r) for r in records]

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Thống Kê Checklist Test"

    # Title
    ws.merge_cells("A1:N1")
    ws["A1"] = "BÁO CÁO THỐNG KÊ CHECKLIST CÁC CÔNG VIỆC"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="92400E")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    # Info row
    date_info = f"Thời gian lọc: {from_date or 'Tất cả'} đến {to_date or 'Hiện tại'}  |  Tổng số đợt test: {len(schemas)}  |  Ngày xuất: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    ws.merge_cells("A2:N2")
    ws["A2"] = date_info
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="555555")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # Headers
    headers = [
        "STT",
        "Tên Đợt Checklist Test",
        "Sườn Áp Dụng",
        "Phiên Bản (Version Note)",
        "Người Phụ Trách Test",
        "Ngày Bắt Đầu",
        "SLA (Ngày)",
        "Hạn Chót SLA",
        "Tình Trạng SLA",
        "Tổng Số Mục",
        "Số Mục Đạt",
        "Số Mục Lỗi",
        "Tiến Độ (%)",
        "Trạng Thái",
    ]
    ws.append([])
    ws.append(headers)
    ws.row_dimensions[4].height = 25

    header_font = Font(name="Calibri", size=11, bold=True, color="111827")
    header_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3"),
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    current_row = 5
    for idx, r in enumerate(schemas, start=1):
        is_done = r.progress_percent == 100 or r.trang_thai == "Hoàn thành"
        ws.append([
            idx,
            r.ten_dot,
            r.ten_suon or "—",
            r.version_note or "—",
            r.nguoi_thuc_hien or "—",
            r.ngay_bat_dau.strftime("%d/%m/%Y %H:%M") if r.ngay_bat_dau else "",
            f"{r.sla_days} ngày",
            r.han_chot_sla.strftime("%d/%m/%Y %H:%M") if r.han_chot_sla else "—",
            r.sla_text or "—",
            r.total_items,
            r.passed_items,
            r.failed_items,
            f"{r.progress_percent}%",
            r.trang_thai,
        ])

        for col_idx in range(1, len(headers) + 1):
            c = ws.cell(row=current_row, column=col_idx)
            c.border = border_thin
            if col_idx in (1, 6, 7, 8, 9, 10, 11, 12, 13, 14):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

        # Color SLA status cell (col 9)
        sla_cell = ws.cell(row=current_row, column=9)
        if r.sla_status in ("OVERDUE", "COMPLETED_LATE"):
            sla_cell.font = Font(name="Calibri", size=10, bold=True, color="991B1B")
            sla_cell.fill = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")
        elif r.sla_status == "WARNING":
            sla_cell.font = Font(name="Calibri", size=10, bold=True, color="92400E")
            sla_cell.fill = PatternFill(start_color="FFFBEA", end_color="FFFBEA", fill_type="solid")
        else:
            sla_cell.font = Font(name="Calibri", size=10, bold=True, color="166534")
            sla_cell.fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")

        # Color overall status cell (col 14)
        status_cell = ws.cell(row=current_row, column=14)
        if is_done:
            status_cell.font = Font(name="Calibri", size=10, bold=True, color="166534")
            status_cell.fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
        else:
            status_cell.font = Font(name="Calibri", size=10, bold=True, color="92400E")

        current_row += 1

    # Auto column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    filename = f"Thong_Ke_Checklist_Test_He_Thong_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return stream, filename


def export_run_detail_excel(db: Session, run_id: int) -> Tuple[io.BytesIO, str]:
    """Xuất chi tiết kết quả một đợt checklist test hệ thống ra Excel."""
    run = db.query(ChecklistRun).filter(ChecklistRun.id == run_id, ChecklistRun.active == True).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đợt checklist.")

    detail = get_run_detail(db, run_id)
    r = detail.run
    items = detail.items

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Ket_Qua_Test"

    # Title
    ws.merge_cells("A1:H1")
    ws["A1"] = f"KẾT QUẢ CHECKLIST CÔNG VIỆC: {r.ten_dot.upper()}"
    ws["A1"].font = Font(name="Calibri", size=13, bold=True, color="92400E")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    sla_info = f"SLA: {r.sla_days} ngày ({r.sla_text or ''})"
    if r.han_chot_sla:
        sla_info += f" - Hạn chót: {r.han_chot_sla.strftime('%d/%m/%Y %H:%M')}"
    info_text = f"Sườn kiểm thử: {r.ten_suon}  |  Version: {r.version_note}  |  {sla_info}  |  Người test: {r.nguoi_thuc_hien or '—'}  |  Tiến độ: {r.progress_percent}% ({r.passed_items}/{r.total_items} mục đạt, {r.failed_items} lỗi)"
    ws.merge_cells("A2:H2")
    ws["A2"] = info_text
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="444444")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # Headers
    headers = [
        "STT",
        "Nhóm Nghiệp Vụ",
        "Mục Cần Kiểm Tra",
        "Hướng Dẫn Kiểm Thử",
        "Kết Quả",
        "Ghi Chú Kết Quả / Báo Lỗi",
        "Người Test",
        "Ngày Giờ Test",
    ]
    ws.append([])
    ws.append(headers)
    ws.row_dimensions[4].height = 25

    header_font = Font(name="Calibri", size=11, bold=True, color="111827")
    header_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3"),
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    current_row = 5
    for idx, it in enumerate(items, start=1):
        if it.trang_thai == "PASSED":
            res_text = "ĐẠT (PASSED)"
        elif it.trang_thai == "FAILED":
            res_text = "LỖI (FAILED)"
        else:
            res_text = "CHƯA TEST"

        time_text = it.ngay_hoan_thanh.strftime("%d/%m/%Y %H:%M") if it.ngay_hoan_thanh else ""

        ws.append([
            idx,
            it.nhom or "Chung",
            it.tieu_de,
            it.huong_dan or "",
            res_text,
            it.ghi_chu_ket_qua or "",
            it.nguoi_hoan_thanh or "",
            time_text,
        ])

        for col_idx in range(1, len(headers) + 1):
            c = ws.cell(row=current_row, column=col_idx)
            c.border = border_thin
            if col_idx in (1, 5, 7, 8):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(horizontal="left", vertical="center")

        # Color result
        res_cell = ws.cell(row=current_row, column=5)
        if it.trang_thai == "PASSED":
            res_cell.font = Font(name="Calibri", size=10, bold=True, color="166534")
            res_cell.fill = PatternFill(start_color="F0FDF4", end_color="F0FDF4", fill_type="solid")
        elif it.trang_thai == "FAILED":
            res_cell.font = Font(name="Calibri", size=10, bold=True, color="991B1B")
            res_cell.fill = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")

        current_row += 1

    # Auto column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    clean_title = re.sub(r"[^\w\s-]", "", r.ten_dot).strip().replace(" ", "_")
    filename = f"Checklist_{clean_title}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return stream, filename


def generate_template_sample_excel() -> Tuple[io.BytesIO, str]:
    """Tạo file Excel mẫu 3 cột chuẩn để nhập hàng loạt Checklist Mẫu: Mẹ, Cấp 2, Cấp 3."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Mau_Checklist_3_Cap"

    # Header styling
    header_font = Font(name="Calibri", size=11, bold=True, color="111827")
    header_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3"),
    )

    headers = ["Mẹ", "Cấp 2", "Cấp 3"]
    ws.append(headers)
    ws.row_dimensions[1].height = 28

    for col_idx in range(1, 4):
        c = ws.cell(row=1, column=col_idx)
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border_thin

    # Sample rows
    sample_data = [
        ["Checklist Setup Nhà Hàng Mới", "Phần Cứng & Hạ Tầng", "Kiểm tra đường truyền Internet chính & backup 4G"],
        ["Checklist Setup Nhà Hàng Mới", "Phần Cứng & Hạ Tầng", "Cài đặt và cấu hình máy chủ Server RK7"],
        ["Checklist Setup Nhà Hàng Mới", "Phần Cứng & Hạ Tầng", "Lắp ráp và kết nối máy in bill bếp KDS"],
        ["Checklist Setup Nhà Hàng Mới", "Phần Mềm Nghiệp Vụ", "Cài đặt RK7 Client và kích hoạt bản quyền"],
        ["Checklist Setup Nhà Hàng Mới", "Phần Mềm Nghiệp Vụ", "Đồng bộ thực đơn SO và menu món ăn"],
        ["Checklist Vận Hành Hàng Ngày", "", "Kiểm tra trạng thái hoạt động của hệ thống thanh toán"],
        ["Checklist Vận Hành Hàng Ngày", "", "Kiểm tra đồng bộ dữ liệu hóa đơn cuối ca"],
        ["Checklist Vận Hành Hàng Ngày", "", "Khởi động lại máy in bill và POS trước giờ mở cửa"],
    ]

    data_font = Font(name="Calibri", size=10)
    for r_idx, row in enumerate(sample_data, start=2):
        ws.append(row)
        ws.row_dimensions[r_idx].height = 22
        for col_idx in range(1, 4):
            c = ws.cell(row=r_idx, column=col_idx)
            c.font = data_font
            c.border = border_thin
            c.alignment = Alignment(horizontal="left", vertical="center")

    ws.column_dimensions["A"].width = 35
    ws.column_dimensions["B"].width = 25
    ws.column_dimensions["C"].width = 55

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream, "Mau_Checklist_Mau_3_Cap.xlsx"


def export_templates_excel(
    db: Session,
    template_ids: Optional[List[int]] = None
) -> Tuple[io.BytesIO, str]:
    """Xuất danh sách các Checklist Mẫu ra file Excel theo chuẩn 3 cột: Mẹ, Cấp 2, Cấp 3."""
    query = db.query(ChecklistTemplate).filter(ChecklistTemplate.active == True)
    if template_ids and len(template_ids) > 0:
        query = query.filter(ChecklistTemplate.id.in_(template_ids))
    templates = query.order_by(ChecklistTemplate.ten_suon).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Checklist_Mau"

    header_font = Font(name="Calibri", size=11, bold=True, color="111827")
    header_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3"),
    )

    headers = ["Mẹ", "Cấp 2", "Cấp 3"]
    ws.append(headers)
    ws.row_dimensions[1].height = 28

    for col_idx in range(1, 4):
        c = ws.cell(row=1, column=col_idx)
        c.font = header_font
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = border_thin

    data_font = Font(name="Calibri", size=10)
    current_row = 2

    for tmpl in templates:
        active_items = [it for it in tmpl.items if it.active]
        if not active_items:
            # Template without items
            ws.append([tmpl.ten_suon, "", ""])
            ws.row_dimensions[current_row].height = 22
            for col_idx in range(1, 4):
                c = ws.cell(row=current_row, column=col_idx)
                c.font = data_font
                c.border = border_thin
                c.alignment = Alignment(horizontal="left", vertical="center")
            current_row += 1
        else:
            for it in active_items:
                ws.append([tmpl.ten_suon, it.nhom or "", it.tieu_de])
                ws.row_dimensions[current_row].height = 22
                for col_idx in range(1, 4):
                    c = ws.cell(row=current_row, column=col_idx)
                    c.font = data_font
                    c.border = border_thin
                    c.alignment = Alignment(horizontal="left", vertical="center")
                current_row += 1

    ws.column_dimensions["A"].width = 35
    ws.column_dimensions["B"].width = 25
    ws.column_dimensions["C"].width = 55

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    filename = f"Danh_Sach_Checklist_Mau_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return stream, filename


def import_templates_from_excel(
    db: Session,
    file_contents: bytes,
    username: str
) -> Dict[str, Any]:
    """Nhập hàng loạt Checklist Mẫu từ file Excel có 3 cột: Mẹ, Cấp 2, Cấp 3."""
    wb = openpyxl.load_workbook(io.BytesIO(file_contents), data_only=True)
    ws = wb.active

    # Find columns index
    col_me = None
    col_cap2 = None
    col_cap3 = None

    header_row_idx = 1
    # Search first 5 rows for header row
    for r_idx in range(1, min(6, ws.max_row + 1)):
        row_vals = [str(ws.cell(row=r_idx, column=c).value or "").strip().lower() for c in range(1, min(10, ws.max_column + 1))]
        for c_idx, val in enumerate(row_vals):
            if "mẹ" in val or "tên checklist" in val or "suon" in val:
                col_me = c_idx + 1
            elif "cấp 2" in val or "nhóm" in val or "nhom" in val:
                col_cap2 = c_idx + 1
            elif "cấp 3" in val or "tiêu đề" in val or "tieu de" in val or "việc con" in val or "công việc" in val:
                col_cap3 = c_idx + 1
        if col_me is not None and col_cap3 is not None:
            header_row_idx = r_idx
            break

    # If headers not identified by name, fallback to columns 1, 2, 3
    if col_me is None:
        col_me = 1
    if col_cap2 is None:
        col_cap2 = 2
    if col_cap3 is None:
        col_cap3 = 3

    templates_cache: Dict[str, ChecklistTemplate] = {}
    items_created = 0
    now = datetime.now()

    for r_idx in range(header_row_idx + 1, ws.max_row + 1):
        raw_me = ws.cell(row=r_idx, column=col_me).value
        raw_cap2 = ws.cell(row=r_idx, column=col_cap2).value
        raw_cap3 = ws.cell(row=r_idx, column=col_cap3).value

        ten_suon = str(raw_me or "").strip()
        if not ten_suon:
            continue

        nhom = str(raw_cap2 or "").strip() or None
        tieu_de = str(raw_cap3 or "").strip()

        key = ten_suon.lower()
        if key not in templates_cache:
            tmpl = db.query(ChecklistTemplate).filter(
                func.lower(ChecklistTemplate.ten_suon) == key,
                ChecklistTemplate.active == True
            ).first()
            if not tmpl:
                tmpl = ChecklistTemplate(
                    ten_suon=ten_suon,
                    danh_muc="Vận hành",
                    nguoi_tao=username,
                    sla_days=5,
                    ngay_tao=now,
                    ngay_update=now,
                    active=True
                )
                db.add(tmpl)
                db.flush()
            templates_cache[key] = tmpl
        else:
            tmpl = templates_cache[key]

        if tieu_de:
            # Check duplicate item
            query_dup = db.query(ChecklistTemplateItem).filter(
                ChecklistTemplateItem.template_id == tmpl.id,
                func.lower(ChecklistTemplateItem.tieu_de) == tieu_de.lower(),
                ChecklistTemplateItem.active == True
            )
            if nhom:
                query_dup = query_dup.filter(func.lower(ChecklistTemplateItem.nhom) == nhom.lower())
            else:
                query_dup = query_dup.filter(or_(ChecklistTemplateItem.nhom == None, ChecklistTemplateItem.nhom == ""))

            exists = query_dup.first()
            if not exists:
                max_stt = db.query(func.coalesce(func.max(ChecklistTemplateItem.stt), 0)).filter(
                    ChecklistTemplateItem.template_id == tmpl.id
                ).scalar()
                item = ChecklistTemplateItem(
                    template_id=tmpl.id,
                    nhom=nhom,
                    tieu_de=tieu_de,
                    stt=max_stt + 1,
                    active=True
                )
                db.add(item)
                items_created += 1

    db.commit()
    return {
        "success": True,
        "templates_count": len(templates_cache),
        "items_count": items_created,
        "message": f"Đã import thành công {len(templates_cache)} mẫu checklist với {items_created} việc con!"
    }

