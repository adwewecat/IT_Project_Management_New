import io
from datetime import datetime, date
from typing import Optional, List, Dict, Any, Tuple
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy import select, func, and_, or_, desc, asc
from sqlalchemy.orm import Session

from app.models.setup_restaurant import ListSetupNhNew, ChecklistSetupNhNewMaster, ChecklistSetupNhNewDetail
from app.schemas.setup_restaurant import (
    SetupRestaurantCreate,
    SetupRestaurantUpdate,
    ChecklistItemUpdate,
    ChecklistItemCreate,
    RestaurantChecklistResponse,
    ChecklistGroup,
    ChecklistItemOut,
    SetupRestaurantOut,
    SetupRestaurantListResponse,
    ChecklistMasterResponse,
    ChecklistMasterGroupOut,
    ChecklistMasterItemOut,
    ChecklistMasterItemCreate,
    ChecklistMasterItemUpdate,
    ChecklistMasterGroupUpdate,
)


def _compute_item_completed(item: ChecklistSetupNhNewDetail) -> bool:
    return bool(item.USER_HOANTHANH and item.USER_HOANTHANH.strip()) or (item.ACTIVE is False)


def _compute_restaurant_checklist_stats(details: List[ChecklistSetupNhNewDetail]) -> Tuple[int, int, float, int, int, float]:
    """
    Returns: (total_groups, completed_groups, group_pct, total_tasks, completed_tasks, task_pct)
    """
    total_tasks = len(details)
    completed_tasks = sum(1 for d in details if _compute_item_completed(d))
    task_pct = round(completed_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0.0

    groups_map: Dict[str, List[ChecklistSetupNhNewDetail]] = {}
    for d in details:
        g_name = (d.NHOM or "KHÁC").strip()
        if g_name not in groups_map:
            groups_map[g_name] = []
        groups_map[g_name].append(d)

    total_groups = len(groups_map)
    completed_groups = sum(
        1 for g_name, g_items in groups_map.items()
        if len(g_items) > 0 and all(_compute_item_completed(item) for item in g_items)
    )
    group_pct = round(completed_groups / total_groups * 100, 1) if total_groups > 0 else 0.0

    return total_groups, completed_groups, group_pct, total_tasks, completed_tasks, task_pct


def get_setup_restaurants(
    db: Session,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    it_phutrach: Optional[str] = None,
    page: int = 1,
    page_size: int = 20
) -> SetupRestaurantListResponse:
    base_query = db.query(ListSetupNhNew).filter(ListSetupNhNew.ACTIVE == True)

    # Status filter
    if status_filter and status_filter != "all":
        base_query = base_query.filter(ListSetupNhNew.TRANGTHAI == status_filter)

    # Search filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        base_query = base_query.filter(
            or_(
                ListSetupNhNew.TEN_NH.ilike(term),
                ListSetupNhNew.AM_PHUTRACH.ilike(term),
                ListSetupNhNew.NOTE_THEM.ilike(term),
                ListSetupNhNew.IT_PHUTRACH.ilike(term),
            )
        )

    # IT phụ trách filter
    if it_phutrach and it_phutrach.strip():
        base_query = base_query.filter(ListSetupNhNew.IT_PHUTRACH == it_phutrach.strip())

    total = base_query.count()

    # Counts by status
    total_in_progress = (
        db.query(func.count(ListSetupNhNew.id))
        .filter(ListSetupNhNew.ACTIVE == True, ListSetupNhNew.TRANGTHAI == "Mới - Đang Setup")
        .scalar() or 0
    )
    total_completed = (
        db.query(func.count(ListSetupNhNew.id))
        .filter(ListSetupNhNew.ACTIVE == True, ListSetupNhNew.TRANGTHAI == "Đã Hoàn Thành")
        .scalar() or 0
    )

    # Ordering & Pagination
    restaurants = (
        base_query.order_by(desc(ListSetupNhNew.id))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items_out = []
    for r in restaurants:
        # Calculate checklist stats
        details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == r.id).all()
        tot_groups, comp_groups, grp_pct, tot_tasks, comp_tasks, _ = _compute_restaurant_checklist_stats(details)
        brand_val = r.BRAND or "GGG"
        can_comp = (tot_groups > 0 and comp_groups == tot_groups) or (tot_groups == 0 and brand_val.upper() != 'GGG')

        items_out.append(
            SetupRestaurantOut(
                id=r.id,
                ten_nh=r.TEN_NH,
                ngay_dukien_khaitruong=r.NGAY_DUKIEN_KHAITRUONG,
                it_phutrach=r.IT_PHUTRACH,
                am_phutrach=r.AM_PHUTRACH,
                note_them=r.NOTE_THEM,
                trangthai=r.TRANGTHAI,
                brand=brand_val,
                created_at=r.NGAY_INSERT,
                updated_at=r.NGAY_UPDATE,
                TEN_NH=r.TEN_NH,
                NGAY_DUKIEN_KHAITRUONG=r.NGAY_DUKIEN_KHAITRUONG,
                IT_PHUTRACH=r.IT_PHUTRACH,
                AM_PHUTRACH=r.AM_PHUTRACH,
                NOTE_THEM=r.NOTE_THEM,
                TRANGTHAI=r.TRANGTHAI,
                BRAND=brand_val,
                NGAY_INSERT=r.NGAY_INSERT,
                NGAY_UPDATE=r.NGAY_UPDATE,
                ReviewStatus=r.ReviewStatus,
                ReviewNote=r.ReviewNote,
                ReviewedBy=r.ReviewedBy,
                ReviewedAt=r.ReviewedAt,
                total_checklist=tot_groups,
                completed_checklist=comp_groups,
                progress_percent=grp_pct,
                can_complete=can_comp,
                total_groups=tot_groups,
                completed_groups=comp_groups,
                total_tasks=tot_tasks,
                completed_tasks=comp_tasks,
            )
        )

    return SetupRestaurantListResponse(
        items=items_out,
        total=total,
        page=page,
        page_size=page_size,
        total_in_progress=total_in_progress,
        total_completed=total_completed
    )


def get_setup_restaurant_by_id(db: Session, res_id: int) -> Optional[SetupRestaurantOut]:
    r = db.query(ListSetupNhNew).filter(ListSetupNhNew.id == res_id, ListSetupNhNew.ACTIVE == True).first()
    if not r:
        return None

    details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == r.id).all()
    tot_groups, comp_groups, grp_pct, tot_tasks, comp_tasks, _ = _compute_restaurant_checklist_stats(details)
    brand_val = r.BRAND or "GGG"
    can_comp = (tot_groups > 0 and comp_groups == tot_groups) or (tot_groups == 0 and brand_val.upper() != 'GGG')

    return SetupRestaurantOut(
        id=r.id,
        ten_nh=r.TEN_NH,
        ngay_dukien_khaitruong=r.NGAY_DUKIEN_KHAITRUONG,
        it_phutrach=r.IT_PHUTRACH,
        am_phutrach=r.AM_PHUTRACH,
        note_them=r.NOTE_THEM,
        trangthai=r.TRANGTHAI,
        brand=brand_val,
        created_at=r.NGAY_INSERT,
        updated_at=r.NGAY_UPDATE,
        TEN_NH=r.TEN_NH,
        NGAY_DUKIEN_KHAITRUONG=r.NGAY_DUKIEN_KHAITRUONG,
        IT_PHUTRACH=r.IT_PHUTRACH,
        AM_PHUTRACH=r.AM_PHUTRACH,
        NOTE_THEM=r.NOTE_THEM,
        TRANGTHAI=r.TRANGTHAI,
        BRAND=brand_val,
        NGAY_INSERT=r.NGAY_INSERT,
        NGAY_UPDATE=r.NGAY_UPDATE,
        ReviewStatus=r.ReviewStatus,
        ReviewNote=r.ReviewNote,
        ReviewedBy=r.ReviewedBy,
        ReviewedAt=r.ReviewedAt,
        total_checklist=tot_groups,
        completed_checklist=comp_groups,
        progress_percent=grp_pct,
        can_complete=can_comp,
        total_groups=tot_groups,
        completed_groups=comp_groups,
        total_tasks=tot_tasks,
        completed_tasks=comp_tasks,
    )


def get_next_it_setup_restaurant(db: Session) -> Dict[str, Any]:
    """
    Thuật toán Round-Robin: Tự động phân công nhân sự IT phụ trách Setup nhà hàng tiếp theo
    dựa trên nhà hàng được tạo gần nhất trong LIST_SETUP_NH_NEW.
    """
    from app.services.memo_service import get_round_robin_excluded_users, get_app_users
    from app.models.user import User

    excluded = get_round_robin_excluded_users(db)

    # 1. Lấy danh sách tài khoản IT App active
    stmt = (
        select(User.user_name1, User.full_name)
        .where(
            and_(
                func.lower(func.trim(User.phanquyen)).in_(["2", "app"]),
                or_(User.active == True, User.active == None),
                User.user_name1 != "test",
            )
        )
        .order_by(asc(User.id))
    )
    rows = db.execute(stmt).all()

    user_list = []
    all_users = []
    name_map = {}
    app_users_meta = get_app_users(db)

    for r in rows:
        if r[0]:
            uname = r[0].strip().lower()
            all_users.append(uname)
            if uname not in excluded:
                user_list.append(uname)
            name_map[uname] = uname
            if r[1]:
                fullname = r[1].strip().lower()
                name_map[fullname] = uname
                parts = fullname.split()
                if parts:
                    name_map[parts[-1]] = uname
                    name_map[parts[0]] = uname

    if not user_list:
        user_list = all_users

    if not user_list:
        return {
            "status": "ok",
            "next_it": "",
            "next_it_name": "",
            "user_list": app_users_meta
        }

    # 2. Lấy IT_PHUTRACH của nhà hàng được tạo gần nhất
    last_res = (
        db.query(ListSetupNhNew.IT_PHUTRACH)
        .filter(ListSetupNhNew.ACTIVE == True)
        .filter(ListSetupNhNew.IT_PHUTRACH != None, ListSetupNhNew.IT_PHUTRACH != "")
        .order_by(desc(ListSetupNhNew.id))
        .first()
    )

    last_user_raw = last_res[0].strip().lower() if (last_res and last_res[0]) else None
    last_username = None

    if last_user_raw:
        if last_user_raw in name_map:
            last_username = name_map[last_user_raw]
        else:
            for name_key, uname in name_map.items():
                if name_key in last_user_raw or last_user_raw in name_key:
                    last_username = uname
                    break

    if last_username and last_username in user_list:
        current_idx = user_list.index(last_username)
        next_idx = (current_idx + 1) % len(user_list)
    else:
        next_idx = 0

    next_uname = user_list[next_idx]
    next_meta = next((u for u in app_users_meta if u["username"].lower() == next_uname), None)
    next_label = next_meta["label"] if next_meta else next_uname

    return {
        "status": "ok",
        "next_it": next_uname,
        "next_it_name": next_label,
        "user_list": app_users_meta
    }


def create_setup_restaurant(
    db: Session,
    payload: SetupRestaurantCreate,
    username: str,
    is_admin: bool = False
) -> SetupRestaurantOut:
    ten_nh = payload.get_ten_nh()
    if not ten_nh:
        raise ValueError("Tên nhà hàng không được để trống")

    # Round-Robin: Tự động phân công IT xoay vòng nếu chưa có hoặc người tạo không phải Admin
    assigned_it = payload.get_it_phutrach()
    if not assigned_it or not is_admin:
        rr_info = get_next_it_setup_restaurant(db)
        auto_it = rr_info.get("next_it")
        if auto_it:
            assigned_it = auto_it

    brand = payload.get_brand()
    if not brand:
        brand = "GGG"

    # 1. Create restaurant
    restaurant = ListSetupNhNew(
        TEN_NH=ten_nh,
        NGAY_DUKIEN_KHAITRUONG=payload.get_ngay_dukien_khaitruong(),
        IT_PHUTRACH=assigned_it,
        AM_PHUTRACH=payload.get_am_phutrach(),
        NOTE_THEM=payload.get_note_them(),
        TRANGTHAI="Mới - Đang Setup",
        BRAND=brand,
        ACTIVE=True,
        NGAY_INSERT=datetime.now(),
        NGAY_UPDATE=None
    )
    db.add(restaurant)
    db.flush()

    # 2. Copy master checklist items to detail (Chỉ áp dụng cho GGG; TCH tạm thời chưa có checklist)
    if brand.upper() == "GGG":
        master_items = (
            db.query(ChecklistSetupNhNewMaster)
            .filter(ChecklistSetupNhNewMaster.ACTIVE == True)
            .order_by(asc(ChecklistSetupNhNewMaster.id))
            .all()
        )

        for m in master_items:
            detail = ChecklistSetupNhNewDetail(
                ID_NH_NEW=restaurant.id,
                STT=m.STT,
                NOIDUNG=m.NOIDUNG,
                NHOM=m.NHOM,
                NGAY_INSERT=datetime.now(),
                GHICHU="",
                HOANTHANH=None,
                NGAY_HOANTHANH=None,
                USER_HOANTHANH=None,
                ACTIVE=True  # 1 = pending
            )
            db.add(detail)

    db.commit()
    db.refresh(restaurant)

    return get_setup_restaurant_by_id(db, restaurant.id)


def update_setup_restaurant(
    db: Session,
    res_id: int,
    payload: SetupRestaurantUpdate,
    username: str,
    is_admin: bool = False
) -> SetupRestaurantOut:
    r = db.query(ListSetupNhNew).filter(ListSetupNhNew.id == res_id, ListSetupNhNew.ACTIVE == True).first()
    if not r:
        raise ValueError("Không tìm thấy nhà hàng mới tương ứng")

    trangthai_val = payload.get_trangthai()
    # User's core rule: New restaurant MUST complete 100% of checklist to be marked "Đã Hoàn Thành"
    if trangthai_val == "Đã Hoàn Thành":
        details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).all()
        total_chk = len(details)
        completed_chk = sum(1 for d in details if _compute_item_completed(d))
        if total_chk > 0 and completed_chk < total_chk:
            raise ValueError(
                f"Nhà hàng chưa hoàn thành toàn bộ checklist ({completed_chk}/{total_chk} mục). "
                f"Phải hoàn thành 100% checklist mới được chuyển sang trạng thái 'Đã Hoàn Thành'!"
            )

    ten_nh_val = payload.get_ten_nh()
    if ten_nh_val is not None:
        r.TEN_NH = ten_nh_val
    if payload.ngay_dukien_khaitruong is not None or payload.NGAY_DUKIEN_KHAITRUONG is not None:
        r.NGAY_DUKIEN_KHAITRUONG = payload.get_ngay_dukien_khaitruong()

    # Rule: Chỉ có Admin và Super Admin mới được thay đổi nhân sự IT phụ trách setup!
    if payload.it_phutrach is not None or payload.IT_PHUTRACH is not None:
        if is_admin:
            r.IT_PHUTRACH = payload.get_it_phutrach()

    if payload.am_phutrach is not None or payload.AM_PHUTRACH is not None:
        r.AM_PHUTRACH = payload.get_am_phutrach()
    if payload.note_them is not None or payload.NOTE_THEM is not None:
        r.NOTE_THEM = payload.get_note_them()
    if trangthai_val is not None:
        r.TRANGTHAI = trangthai_val
    brand_val = payload.get_brand()
    if brand_val is not None:
        r.BRAND = brand_val

    r.NGAY_UPDATE = datetime.now()
    db.commit()
    db.refresh(r)

    return get_setup_restaurant_by_id(db, r.id)


def review_setup_restaurant(
    db: Session,
    res_id: int,
    review_status: Optional[str],
    review_note: Optional[str],
    username: str
) -> SetupRestaurantOut:
    r = db.query(ListSetupNhNew).filter(ListSetupNhNew.id == res_id).first()
    if not r:
        raise ValueError("Không tìm thấy nhà hàng mới tương ứng")

    norm_status = review_status.lower().strip() if review_status else None
    if norm_status and norm_status not in ["ok", "fail"]:
        norm_status = None

    if norm_status == "fail" and not (review_note and review_note.strip()):
        raise ValueError("Vui lòng nhập lý do đánh giá không đạt (Fail)!")

    now = datetime.now()
    r.ReviewStatus = norm_status
    r.ReviewNote = review_note.strip() if (review_note and norm_status) else None
    r.ReviewedBy = username if norm_status else None
    r.ReviewedAt = now if norm_status else None
    r.NGAY_UPDATE = now

    db.commit()
    return get_setup_restaurant_by_id(db, r.id)


def delete_setup_restaurant(db: Session, res_id: int, hard_delete: bool = False) -> bool:
    r = db.query(ListSetupNhNew).filter(ListSetupNhNew.id == res_id).first()
    if not r:
        return False

    if hard_delete:
        db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).delete()
        db.delete(r)
    else:
        r.ACTIVE = False
        r.NGAY_UPDATE = datetime.now()

    db.commit()
    return True


def get_restaurant_checklist(db: Session, res_id: int) -> RestaurantChecklistResponse:
    r = db.query(ListSetupNhNew).filter(ListSetupNhNew.id == res_id).first()
    if not r:
        raise ValueError("Không tìm thấy nhà hàng mới tương ứng")

    details = (
        db.query(ChecklistSetupNhNewDetail)
        .filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id)
        .order_by(asc(ChecklistSetupNhNewDetail.STT), asc(ChecklistSetupNhNewDetail.id))
        .all()
    )

    # Standard group order
    standard_groups = [
        "RK7-MANAGER",
        "POS THU NGÂN",
        "POS PHỤ 12",
        "PC QUẢN LÝ",
        "GMONITER",
        "MỤC ĐI KÈM QUAN TRỌNG",
        "MỤC KIỂM TRA SAU KHI SETUP"
    ]

    groups_dict: Dict[str, List[ChecklistItemOut]] = {}
    for g in standard_groups:
        groups_dict[g] = []

    total_items = len(details)
    completed_items = 0

    for d in details:
        is_comp = _compute_item_completed(d)
        if is_comp:
            completed_items += 1

        item_out = ChecklistItemOut(
            id=d.id,
            ID_NH_NEW=d.ID_NH_NEW,
            STT=d.STT,
            NOIDUNG=d.NOIDUNG,
            NHOM=d.NHOM,
            GHICHU=d.GHICHU,
            is_completed=is_comp,
            NGAY_HOANTHANH=d.NGAY_HOANTHANH,
            USER_HOANTHANH=d.USER_HOANTHANH,
            ten_checklist=d.NOIDUNG or "",
            nhom=d.NHOM or "",
            note=d.GHICHU or "",
            user_hoanthanh=d.USER_HOANTHANH,
            ngay_hoanthanh=d.NGAY_HOANTHANH.strftime("%d/%m/%Y %H:%M") if d.NGAY_HOANTHANH else None
        )

        group_key = d.NHOM or "KHÁC"
        if group_key not in groups_dict:
            groups_dict[group_key] = []
        groups_dict[group_key].append(item_out)

    groups_list = []
    for g_name, items in groups_dict.items():
        if not items:
            continue
        g_comp = sum(1 for it in items if it.is_completed)
        is_g_done = (len(items) > 0 and g_comp == len(items))

        g_completed_date = None
        g_completed_by = None
        comp_items_with_date = [it for it in items if it.NGAY_HOANTHANH]
        if comp_items_with_date:
            latest_item = max(comp_items_with_date, key=lambda x: x.NGAY_HOANTHANH or datetime.min)
            g_completed_date = latest_item.NGAY_HOANTHANH
            g_completed_by = latest_item.USER_HOANTHANH
        elif g_comp > 0:
            for it in items:
                if it.USER_HOANTHANH:
                    g_completed_by = it.USER_HOANTHANH
                    break

        notes = [it.note.strip() for it in items if it.note and it.note.strip()]
        g_note = " | ".join(dict.fromkeys(notes)) if notes else None

        groups_list.append(
            ChecklistGroup(
                group_name=g_name,
                total_items=len(items),
                completed_items=g_comp,
                items=items,
                nhom=g_name,
                total=len(items),
                completed=g_comp,
                is_completed=is_g_done,
                completed_date=g_completed_date,
                completed_by=g_completed_by,
                note=g_note,
            )
        )

    tot_groups = len(groups_list)
    comp_groups = sum(1 for g in groups_list if g.is_completed)
    group_pct = round(comp_groups / tot_groups * 100, 1) if tot_groups > 0 else 0.0

    pct = round(completed_items / total_items * 100, 1) if total_items > 0 else 0.0
    is_all_comp = (tot_groups > 0 and comp_groups == tot_groups)

    res_out = get_setup_restaurant_by_id(db, r.id)

    return RestaurantChecklistResponse(
        restaurant_id=r.id,
        restaurant_name=r.TEN_NH or "",
        it_phutrach=r.IT_PHUTRACH,
        am_phutrach=r.AM_PHUTRACH,
        ngay_dukien_khaitruong=r.NGAY_DUKIEN_KHAITRUONG,
        trangthai=r.TRANGTHAI or "Mới - Đang Setup",
        total_items=total_items,
        completed_items=completed_items,
        progress_percent=pct,
        is_all_completed=is_all_comp,
        groups=groups_list,
        restaurant=res_out,
        total_groups=tot_groups,
        completed_groups=comp_groups,
        group_progress_percent=group_pct,
    )


def update_checklist_item(
    db: Session,
    detail_id: int,
    payload: ChecklistItemUpdate,
    username: str
) -> Tuple[ChecklistItemOut, str]:
    item = db.get(ChecklistSetupNhNewDetail, detail_id)
    if not item:
        raise ValueError(f"Không tìm thấy hạng mục checklist ID: {detail_id}")

    restaurant = db.get(ListSetupNhNew, item.ID_NH_NEW)
    if not restaurant:
        raise ValueError("Không tìm thấy thông tin nhà hàng")

    now = datetime.now()

    # 1. Update completion state
    if payload.is_completed is not None:
        if payload.is_completed:
            item.USER_HOANTHANH = username
            item.NGAY_HOANTHANH = now
            item.ACTIVE = False  # 0 = completed (legacy standard)
        else:
            item.USER_HOANTHANH = None
            item.NGAY_HOANTHANH = None
            item.ACTIVE = True   # 1 = pending

    # 2. Update note
    note_val = payload.note if payload.note is not None else payload.GHICHU
    if note_val is not None:
        item.GHICHU = note_val.strip()

    # 3. Check entire restaurant checklist completion
    # Rule: "NH mới cần phải hoàn thành checklist hết mới được xem là hoàn thành"
    all_details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == restaurant.id).all()
    total_count = len(all_details)
    completed_count = sum(1 for d in all_details if _compute_item_completed(d))

    if total_count > 0 and completed_count == total_count:
        restaurant.TRANGTHAI = "Đã Hoàn Thành"
        restaurant.NGAY_UPDATE = now
    else:
        # If any item is not completed, status cannot be completed
        if restaurant.TRANGTHAI == "Đã Hoàn Thành":
            restaurant.TRANGTHAI = "Mới - Đang Setup"
            restaurant.NGAY_UPDATE = now

    db.commit()
    db.refresh(item)
    db.refresh(restaurant)

    out_item = ChecklistItemOut(
        id=item.id,
        ID_NH_NEW=item.ID_NH_NEW,
        STT=item.STT,
        NOIDUNG=item.NOIDUNG,
        NHOM=item.NHOM,
        GHICHU=item.GHICHU,
        is_completed=_compute_item_completed(item),
        NGAY_HOANTHANH=item.NGAY_HOANTHANH,
        USER_HOANTHANH=item.USER_HOANTHANH,
        ten_checklist=item.NOIDUNG or "",
        nhom=item.NHOM or "",
        note=item.GHICHU or "",
        user_hoanthanh=item.USER_HOANTHANH,
        ngay_hoanthanh=item.NGAY_HOANTHANH.strftime("%d/%m/%Y %H:%M") if item.NGAY_HOANTHANH else None
    )

    return out_item, restaurant.TRANGTHAI


def bulk_update_checklist_items(
    db: Session,
    res_id: int,
    is_completed: bool,
    username: str,
    group_name: Optional[str] = None,
    item_ids: Optional[List[int]] = None,
    completed_date: Optional[datetime] = None,
    note: Optional[str] = None
) -> Tuple[int, str]:
    """Bulk mark items in a restaurant's checklist as completed or pending."""
    restaurant = db.get(ListSetupNhNew, res_id)
    if not restaurant:
        raise ValueError("Không tìm thấy thông tin nhà hàng")

    query = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id)
    if item_ids:
        query = query.filter(ChecklistSetupNhNewDetail.id.in_(item_ids))
    elif group_name and group_name.strip() and group_name.strip().upper() != "ALL":
        query = query.filter(ChecklistSetupNhNewDetail.NHOM == group_name.strip())

    items = query.all()
    now = datetime.now()
    exec_date = completed_date if completed_date else now
    count = 0
    for item in items:
        if is_completed:
            item.USER_HOANTHANH = username
            item.NGAY_HOANTHANH = exec_date
            item.ACTIVE = False  # 0 = completed
            if note is not None and note.strip():
                item.GHICHU = note.strip()
        else:
            item.USER_HOANTHANH = None
            item.NGAY_HOANTHANH = None
            item.ACTIVE = True   # 1 = pending
            if note is not None:
                item.GHICHU = note.strip()
        count += 1

    # Recalculate restaurant status
    all_details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).all()
    tot_groups, comp_groups, _, _, _, _ = _compute_restaurant_checklist_stats(all_details)

    if tot_groups > 0 and comp_groups == tot_groups:
        restaurant.TRANGTHAI = "Đã Hoàn Thành"
        restaurant.NGAY_UPDATE = now
    else:
        if restaurant.TRANGTHAI == "Đã Hoàn Thành":
            restaurant.TRANGTHAI = "Mới - Đang Setup"
            restaurant.NGAY_UPDATE = now

    db.commit()
    db.refresh(restaurant)
    return count, restaurant.TRANGTHAI or "Mới - Đang Setup"


def add_checklist_item(
    db: Session,
    res_id: int,
    payload: ChecklistItemCreate,
    username: str
) -> Tuple[ChecklistItemOut, str]:
    """Add a new task item or a new group of tasks for a restaurant checklist (Admin / Super Admin only)."""
    r = db.get(ListSetupNhNew, res_id)
    if not r:
        raise ValueError("Không tìm thấy nhà hàng mới tương ứng")

    group_name = payload.nhom.strip()
    task_content = payload.noidung.strip()
    if not group_name:
        raise ValueError("Tên nhóm lớn không được để trống")
    if not task_content:
        raise ValueError("Nội dung task/hạng mục không được để trống")

    now = datetime.now()

    # Get max STT in this restaurant
    max_stt = db.query(func.max(ChecklistSetupNhNewDetail.STT)).filter(
        ChecklistSetupNhNewDetail.ID_NH_NEW == res_id
    ).scalar() or 0

    new_item = ChecklistSetupNhNewDetail(
        ID_NH_NEW=res_id,
        STT=max_stt + 1,
        NOIDUNG=task_content,
        NHOM=group_name,
        GHICHU=payload.ghichu.strip() if payload.ghichu else "",
        ACTIVE=True,  # pending
        NGAY_INSERT=now,
        HOANTHANH=None,
        NGAY_HOANTHANH=None,
        USER_HOANTHANH=None
    )
    db.add(new_item)

    # Optional: also save into master checklist template for future new restaurants
    if payload.save_to_master:
        max_master_stt = db.query(func.max(ChecklistSetupNhNewMaster.STT)).scalar() or 0
        master_item = ChecklistSetupNhNewMaster(
            NOIDUNG=task_content,
            NHOM=group_name,
            GHICHU=payload.ghichu.strip() if payload.ghichu else "",
            STT=max_master_stt + 1,
            ACTIVE=True,
            NGAY_INSERT=now
        )
        db.add(master_item)

    # If restaurant was "Đã Hoàn Thành", adding a new pending task resets it to "Mới - Đang Setup"
    if r.TRANGTHAI == "Đã Hoàn Thành":
        r.TRANGTHAI = "Mới - Đang Setup"
        r.NGAY_UPDATE = now

    db.commit()
    db.refresh(new_item)
    db.refresh(r)

    out_item = ChecklistItemOut(
        id=new_item.id,
        ID_NH_NEW=new_item.ID_NH_NEW,
        STT=new_item.STT,
        NOIDUNG=new_item.NOIDUNG,
        NHOM=new_item.NHOM,
        GHICHU=new_item.GHICHU,
        is_completed=False,
        NGAY_HOANTHANH=None,
        USER_HOANTHANH=None,
        ten_checklist=new_item.NOIDUNG or "",
        nhom=new_item.NHOM or "",
        note=new_item.GHICHU or "",
        user_hoanthanh=None,
        ngay_hoanthanh=None
    )

    return out_item, r.TRANGTHAI


def delete_checklist_item(
    db: Session,
    detail_id: int,
    username: str
) -> Tuple[bool, str]:
    """Delete a task item from a restaurant's checklist (Admin / Super Admin only)."""
    item = db.get(ChecklistSetupNhNewDetail, detail_id)
    if not item:
        raise ValueError(f"Không tìm thấy hạng mục checklist ID: {detail_id}")

    res_id = item.ID_NH_NEW
    restaurant = db.get(ListSetupNhNew, res_id)

    db.delete(item)
    db.flush()

    now = datetime.now()
    if restaurant:
        all_details = db.query(ChecklistSetupNhNewDetail).filter(
            ChecklistSetupNhNewDetail.ID_NH_NEW == res_id
        ).all()
        total_count = len(all_details)
        completed_count = sum(1 for d in all_details if _compute_item_completed(d))

        if total_count > 0 and completed_count == total_count:
            restaurant.TRANGTHAI = "Đã Hoàn Thành"
        elif restaurant.TRANGTHAI == "Đã Hoàn Thành" and total_count > 0 and completed_count < total_count:
            restaurant.TRANGTHAI = "Mới - Đang Setup"

        restaurant.NGAY_UPDATE = now
        db.commit()
        db.refresh(restaurant)
        return True, restaurant.TRANGTHAI

    db.commit()
    return True, "Mới - Đang Setup"


def export_restaurant_checklist_excel(db: Session, res_id: int) -> Tuple[io.BytesIO, str]:
    r = db.query(ListSetupNhNew).filter(ListSetupNhNew.id == res_id).first()
    if not r:
        raise ValueError("Không tìm thấy nhà hàng mới tương ứng")

    checklist_data = get_restaurant_checklist(db, res_id)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Checklist Setup NH Mới"

    # Title rows
    ws.merge_cells("A1:G1")
    ws["A1"] = f"CHECKLIST SETUP NHÀ HÀNG MỚI: {r.TEN_NH.upper()}"
    ws["A1"].font = Font(name="Calibri", size=14, bold=True, color="1F4E79")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    info_text = f"IT phụ trách: {r.IT_PHUTRACH or 'Chưa phân công'}  |  AM phụ trách: {r.AM_PHUTRACH or 'N/A'}  |  Dự kiến khai trương: {r.NGAY_DUKIEN_KHAITRUONG.strftime('%d/%m/%Y') if r.NGAY_DUKIEN_KHAITRUONG else 'N/A'}  |  Trạng thái: {r.TRANGTHAI} ({checklist_data.completed_items}/{checklist_data.total_items} - {checklist_data.progress_percent}%)"
    ws.merge_cells("A2:G2")
    ws["A2"] = info_text
    ws["A2"].font = Font(name="Calibri", size=10, italic=True, color="555555")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    # Header
    headers = ["STT", "Nhóm Hạng Mục", "Nội Dung Checklist", "Trạng Thái", "Ghi Chú", "Người Hoàn Thành", "Ngày Giờ Hoàn Thành"]
    ws.append([]) # Row 3 blank
    ws.append(headers) # Row 4
    ws.row_dimensions[4].height = 25

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2F5597", end_color="2F5597", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3")
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=4, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    current_row = 5
    stt_counter = 1

    for group in checklist_data.groups:
        for item in group.items:
            status_text = "Hoàn thành" if item.is_completed else "Chưa hoàn thành"
            date_text = item.NGAY_HOANTHANH.strftime("%d/%m/%Y %H:%M") if item.NGAY_HOANTHANH else ""

            ws.append([
                stt_counter,
                group.group_name,
                item.NOIDUNG or "",
                status_text,
                item.GHICHU or "",
                item.USER_HOANTHANH or "",
                date_text
            ])

            row_cell_status = ws.cell(row=current_row, column=4)
            if item.is_completed:
                row_cell_status.font = Font(color="2E7D32", bold=True)
            else:
                row_cell_status.font = Font(color="D32F2F")

            for c in range(1, len(headers) + 1):
                cell = ws.cell(row=current_row, column=c)
                cell.border = border_thin
                cell.alignment = Alignment(vertical="center")
                if c in (1, 4, 6, 7):
                    cell.alignment = Alignment(horizontal="center", vertical="center")

            current_row += 1
            stt_counter += 1

    # Column widths
    ws.column_dimensions["A"].width = 6
    ws.column_dimensions["B"].width = 24
    ws.column_dimensions["C"].width = 50
    ws.column_dimensions["D"].width = 16
    ws.column_dimensions["E"].width = 30
    ws.column_dimensions["F"].width = 18
    ws.column_dimensions["G"].width = 20

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"Checklist_Setup_{r.TEN_NH}_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return output, filename


def generate_checklist_template_excel() -> Tuple[io.BytesIO, str]:
    """Generate a clean template Excel file for importing checklist items."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Mau Checklist Setup"

    # Header Row
    headers = ["Nhóm Hạng Mục", "Nội Dung Công Việc", "Ghi Chú"]
    ws.append(headers)
    ws.row_dimensions[1].height = 28

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2F5597", end_color="2F5597", fill_type="solid")
    border_thin = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3")
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    # Sample data
    sample_rows = [
        ["RK7-MANAGER", "Cài đặt phần mềm RK7 Manager trên PC quản lý", "Cần tạo user quản lý"],
        ["RK7-MANAGER", "Cấu hình phân quyền nhân viên và menu món", ""],
        ["POS THU NGÂN", "Cài đặt máy POS thu ngân 1 và 2", "IP tĩnh: 192.168.1.101, 102"],
        ["POS THU NGÂN", "Cài đặt máy in hoá đơn và test in bill", "Khổ giấy K80"],
        ["HỆ THỐNG MẠNG", "Cấu hình Router Mikrotik và Switch PoE", "Chia VLAN tách biệt"],
        ["HỆ THỐNG MẠNG", "Lắp đặt và phát sóng Access Point WiFi", "SSID theo chuẩn nhà hàng"],
        ["CAMERA QUAN SÁT", "Lắp đặt và kiểm tra góc quay các camera", "Đầu ghi 16 kênh"],
        ["ÂM THANH", "Cài đặt Amply và hệ thống loa phân vùng", "Kiểm tra âm lượng từng khu vực"]
    ]

    for r_idx, row in enumerate(sample_rows, start=2):
        ws.append(row)
        ws.row_dimensions[r_idx].height = 22
        for c_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=r_idx, column=c_idx)
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")
            if c_idx == 1:
                cell.font = Font(name="Calibri", size=11, bold=True, color="1F4E79")

    ws.column_dimensions["A"].width = 25
    ws.column_dimensions["B"].width = 55
    ws.column_dimensions["C"].width = 35

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    filename = "Mau_Import_Checklist_Setup.xlsx"
    return output, filename


def import_checklist_from_excel(
    db: Session,
    res_id: int,
    file_bytes: bytes,
    save_to_master: bool,
    username: str
) -> Dict[str, Any]:
    """Parse and bulk import tasks into a restaurant's checklist from an Excel file (Admin / Super Admin only)."""
    r = db.get(ListSetupNhNew, res_id)
    if not r:
        raise ValueError("Không tìm thấy nhà hàng mới tương ứng")

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    except Exception as e:
        raise ValueError(f"Không thể đọc file Excel. Vui lòng đảm bảo file có định dạng .xlsx: {str(e)}")

    ws = wb.active
    if not ws:
        raise ValueError("File Excel không chứa sheet dữ liệu nào")

    # Locate headers
    header_row_idx = None
    col_nhom = None
    col_noidung = None
    col_ghichu = None

    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if r_idx > 10:
            break
        row_strs = [str(c).strip().lower() if c is not None else "" for c in row]
        for c_idx, val in enumerate(row_strs):
            val_clean = val.replace("_", " ").replace("-", " ")
            if any(k in val_clean for k in ["nhom", "nhóm", "group", "chuyen muc", "chuyên mục"]):
                if col_nhom is None:
                    col_nhom = c_idx
            elif any(k in val_clean for k in ["noi dung", "nội dung", "cong viec", "công việc", "task", "hang muc", "hạng mục", "ten checklist", "tên checklist", "tên"]):
                if col_noidung is None:
                    col_noidung = c_idx
            elif any(k in val_clean for k in ["ghi chu", "ghi chú", "note", "mo ta", "mô tả"]):
                if col_ghichu is None:
                    col_ghichu = c_idx

        if col_noidung is not None:
            header_row_idx = r_idx
            break

    if header_row_idx is None:
        header_row_idx = 1
        col_nhom = 0
        col_noidung = 1
        col_ghichu = 2
    elif col_nhom is None:
        col_nhom = 0

    parsed_items: List[Tuple[str, str, str]] = []
    current_group = "CÔNG VIỆC CHUNG"

    for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        if r_idx <= header_row_idx:
            continue

        raw_nhom = row[col_nhom] if col_nhom < len(row) and row[col_nhom] is not None else ""
        raw_noidung = row[col_noidung] if col_noidung < len(row) and row[col_noidung] is not None else ""
        raw_ghichu = row[col_ghichu] if col_ghichu is not None and col_ghichu < len(row) and row[col_ghichu] is not None else ""

        str_nhom = str(raw_nhom).strip()
        str_noidung = str(raw_noidung).strip()
        str_ghichu = str(raw_ghichu).strip()

        if str_nhom:
            current_group = str_nhom

        # Skip if content is empty or looks like a header repetition
        if not str_noidung or str_noidung.lower() in ["nội dung", "noi dung", "công việc", "task", "hạng mục"]:
            continue

        parsed_items.append((current_group, str_noidung, str_ghichu))

    if not parsed_items:
        raise ValueError("Không tìm thấy dữ liệu công việc hợp lệ trong file Excel. Vui lòng kiểm tra lại cột 'Nhóm' và 'Nội dung công việc'.")

    now = datetime.now()

    # Get max STT for restaurant detail
    max_stt = db.query(func.max(ChecklistSetupNhNewDetail.STT)).filter(
        ChecklistSetupNhNewDetail.ID_NH_NEW == res_id
    ).scalar() or 0

    # Get max STT for master checklist if needed
    max_master_stt = 0
    if save_to_master:
        max_master_stt = db.query(func.max(ChecklistSetupNhNewMaster.STT)).scalar() or 0

    unique_groups = set()
    for idx, (grp, content, note) in enumerate(parsed_items):
        unique_groups.add(grp)
        detail_item = ChecklistSetupNhNewDetail(
            ID_NH_NEW=res_id,
            STT=max_stt + idx + 1,
            NOIDUNG=content,
            NHOM=grp,
            GHICHU=note,
            ACTIVE=True,
            NGAY_INSERT=now,
            HOANTHANH=None,
            NGAY_HOANTHANH=None,
            USER_HOANTHANH=None
        )
        db.add(detail_item)

        if save_to_master:
            master_item = ChecklistSetupNhNewMaster(
                NOIDUNG=content,
                NHOM=grp,
                GHICHU=note,
                STT=max_master_stt + idx + 1,
                ACTIVE=True,
                NGAY_INSERT=now
            )
            db.add(master_item)

    if r.TRANGTHAI == "Đã Hoàn Thành":
        r.TRANGTHAI = "Mới - Đang Setup"
        r.NGAY_UPDATE = now

    db.commit()
    db.refresh(r)

    return {
        "success": True,
        "imported_count": len(parsed_items),
        "groups_count": len(unique_groups),
        "groups": sorted(list(unique_groups)),
        "restaurant_status": r.TRANGTHAI,
        "message": f"Đã nhập thành công {len(parsed_items)} công việc thuộc {len(unique_groups)} nhóm từ file Excel!"
    }


def get_master_checklist(db: Session) -> ChecklistMasterResponse:
    """Lấy danh sách checklist chuẩn master chia theo từng nhóm lớn để tra cứu tham khảo SOP."""
    master_items = (
        db.query(ChecklistSetupNhNewMaster)
        .filter(or_(ChecklistSetupNhNewMaster.ACTIVE == True, ChecklistSetupNhNewMaster.ACTIVE == None))
        .order_by(asc(ChecklistSetupNhNewMaster.STT), asc(ChecklistSetupNhNewMaster.id))
        .all()
    )

    standard_groups = [
        "RK7-MANAGER",
        "POS THU NGÂN",
        "POS PHỤ 12",
        "PC QUẢN LÝ",
        "GMONITER",
        "MỤC ĐI KÈM QUAN TRỌNG",
        "MỤC KIỂM TRA SAU KHI SETUP"
    ]

    groups_dict: Dict[str, List[ChecklistMasterItemOut]] = {g: [] for g in standard_groups}

    for item in master_items:
        g_name = (item.NHOM or "KHÁC").strip()
        if g_name not in groups_dict:
            groups_dict[g_name] = []
        groups_dict[g_name].append(
            ChecklistMasterItemOut(
                id=item.id,
                stt=item.STT,
                nhom=g_name,
                noidung=item.NOIDUNG or "",
                ghichu=item.GHICHU or "",
                active=bool(item.ACTIVE),
            )
        )

    groups_list: List[ChecklistMasterGroupOut] = []
    total_tasks = 0
    for g_name, tasks in groups_dict.items():
        if not tasks:
            continue
        total_tasks += len(tasks)
        groups_list.append(
            ChecklistMasterGroupOut(
                nhom=g_name,
                total_tasks=len(tasks),
                tasks=tasks,
            )
        )

    return ChecklistMasterResponse(
        total_groups=len(groups_list),
        total_tasks=total_tasks,
        groups=groups_list,
    )


def create_master_checklist_item(
    db: Session,
    payload: ChecklistMasterItemCreate,
) -> ChecklistMasterItemOut:
    """Thêm một bước/dòng mới vào checklist chuẩn Master (SOP)."""
    nhom_val = payload.nhom.strip().upper()
    noidung_val = payload.noidung.strip()
    ghichu_val = payload.ghichu.strip() if payload.ghichu else None

    # Tìm STT lớn nhất hiện tại
    max_stt = db.query(func.max(ChecklistSetupNhNewMaster.STT)).filter(ChecklistSetupNhNewMaster.NHOM == nhom_val).scalar() or 0
    stt_val = payload.stt if payload.stt is not None else (max_stt + 1)

    new_item = ChecklistSetupNhNewMaster(
        NHOM=nhom_val,
        NOIDUNG=noidung_val,
        GHICHU=ghichu_val,
        STT=stt_val,
        ACTIVE=True,
        NGAY_INSERT=datetime.now(),
        NGAY_UPDATE=datetime.now(),
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return ChecklistMasterItemOut(
        id=new_item.id,
        stt=new_item.STT,
        nhom=new_item.NHOM or "",
        noidung=new_item.NOIDUNG or "",
        ghichu=new_item.GHICHU,
        active=bool(new_item.ACTIVE),
    )


def update_master_checklist_item(
    db: Session,
    item_id: int,
    payload: ChecklistMasterItemUpdate,
) -> ChecklistMasterItemOut:
    """Cập nhật một bước trong checklist chuẩn Master (SOP)."""
    item = db.query(ChecklistSetupNhNewMaster).filter(ChecklistSetupNhNewMaster.id == item_id).first()
    if not item:
        raise ValueError(f"Không tìm thấy bước SOP với ID {item_id}")

    if payload.nhom is not None:
        item.NHOM = payload.nhom.strip().upper()
    if payload.noidung is not None:
        item.NOIDUNG = payload.noidung.strip()
    if payload.ghichu is not None:
        item.GHICHU = payload.ghichu.strip() if payload.ghichu else None
    if payload.stt is not None:
        item.STT = payload.stt

    item.NGAY_UPDATE = datetime.now()
    db.commit()
    db.refresh(item)

    return ChecklistMasterItemOut(
        id=item.id,
        stt=item.STT,
        nhom=item.NHOM or "",
        noidung=item.NOIDUNG or "",
        ghichu=item.GHICHU,
        active=bool(item.ACTIVE),
    )


def delete_master_checklist_item(
    db: Session,
    item_id: int,
) -> bool:
    """Xóa một bước khỏi checklist chuẩn Master (SOP)."""
    item = db.query(ChecklistSetupNhNewMaster).filter(ChecklistSetupNhNewMaster.id == item_id).first()
    if not item:
        raise ValueError(f"Không tìm thấy bước SOP với ID {item_id}")

    db.delete(item)
    db.commit()
    return True


def update_master_checklist_group(
    db: Session,
    old_nhom: str,
    new_nhom: str,
) -> int:
    """Đổi tên một mục lớn trong checklist chuẩn Master (SOP)."""
    old_clean = old_nhom.strip().upper()
    new_clean = new_nhom.strip().upper()
    if not old_clean or not new_clean:
        raise ValueError("Tên mục lớn không được để trống")

    items = db.query(ChecklistSetupNhNewMaster).filter(ChecklistSetupNhNewMaster.NHOM == old_clean).all()
    count = len(items)
    for it in items:
        it.NHOM = new_clean
        it.NGAY_UPDATE = datetime.now()

    db.commit()
    return count

