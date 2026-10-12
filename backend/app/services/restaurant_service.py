import io
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, or_, and_, text, desc, asc, literal, Unicode, case
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.models.restaurant import Restaurant
from app.models.brand_region import Brand, Region
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.auth import UserInfo
from app.schemas.restaurant import (
    RestaurantItem,
    RestaurantListResponse,
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantOptionsResponse,
    BrandItem,
    BrandCreate,
    RegionItem,
    RegionCreate,
    RestaurantAuditLogItem,
    RestaurantAuditLogsResponse
)
from app.services.auth_service import is_admin_user, is_super_admin_user

def sql_trim(col):
    """Hỗ trợ tương thích SQL Server 2012/2014/2016 (hàm TRIM() chỉ có từ SQL Server 2017)"""
    return func.ltrim(func.rtrim(col))

# Ánh xạ cột DB sang quyền tương ứng (hỗ trợ đa bí danh alias)
COLUMN_PERMISSIONS_MAP: Dict[str, Tuple[List[str], List[str]]] = {
    "res": (["view_res"], ["update_res"]),
    "trangthai": (["view_trangthai"], ["update_trangthai"]),
    "status": (["view_status"], ["update_status"]),
    "sap": (["view_sap"], ["update_sap"]),
    "rk7": (["view_rk7"], ["update_rk7"]),
    "ip": (["view_ip_lan", "view_ip"], ["update_ip_lan", "update_ip"]),
    "ip_wan": (["view_ipwan", "view_ip_wan"], ["update_ipwan", "update_ip_wan", "insert_ipwan"]),
    "pass_ou_ko_sys": (["view_pass_ou_ko_sys", "view_sys"], ["update_pass_ou_ko_sys", "update_sys", "insert_sys"]),
    "sys_sales": (["view_sys_sales", "view_sys"], ["update_sys_sales", "update_sys"]),
    "user_ftth": (["view_user_ftth", "view_ftth"], ["update_user_ftth", "update_ftth", "insert_ftth"]),
    "pass_ftth": (["view_pass_ftth", "view_ftth"], ["update_pass_ftth", "update_ftth"]),
    "thanhtoan_ftth": (["view_thanhtoan_ftth", "view_ftth"], ["update_thanhtoan_ftth", "update_ftth"]),
    "ngay_online_ftth": (["view_ngay_online_ftth", "view_ftth"], ["update_ngay_online_ftth", "update_ftth"]),
    "pass_mail": (["view_pass_mail"], ["update_pass_mail", "insert_pass_mail"]),
    "code_photo": (["view_code_photo"], ["update_code_photo", "insert_code_photo"]),
    "ext": (["view_ext", "view_ext_rsc"], ["update_ext", "update_ext_rsc"]),
    "teamview_pc": (["view_teamview_pc"], ["update_teamview_pc"]),
    "teamview_pos11": (["view_teamview_pos11"], ["update_teamview_pos11"]),
    "teamview_pos12": (["view_teamview_pos12"], ["update_teamview_pos12"]),
    "rustdesk_pos11": (["view_rustdesk_pos11"], ["update_rustdesk_pos11"]),
    "rustdesk_pos12": (["view_rustdesk_pos12"], ["update_rustdesk_pos12"]),
    "sdt_nh": (["view_sdt_nh"], ["update_sdt_nh"]),
    "email": (["view_email_nh", "view_email"], ["update_email_nh", "update_email"]),
    "address": (["view_address"], ["update_address"]),
    "region": (["view_region"], ["update_region"]),
    "brand": (["view_brand"], ["update_brand"]),
    "note": (["view_note_nh", "view_note"], ["update_note_nh", "update_note"]),
    "ngay_khaitruong": (["view_ngay_khaitruong"], ["update_ngay_khaitruong"]),
    "coscenter": (["view_coscenter"], ["update_coscenter"]),
    "sap_old": (["view_sap_old"], ["update_sap_old"]),
    "oracale": (["view_oracale"], ["update_oracale"]),
    "don_gia": (["view_don_gia"], ["update_don_gia"]),
    "dk_truyenthong": (["view_dk_truyenthong"], ["update_dk_truyenthong"]),
}


def get_user_allowed_columns(current_user: UserInfo) -> Tuple[List[str], List[str]]:
    """Xác định danh sách các cột được xem và sửa theo quyền của user"""
    # Super Admin và Admin có toàn quyền
    if is_admin_user(current_user):
        all_cols = list(COLUMN_PERMISSIONS_MAP.keys())
        return all_cols, all_cols

    allowed_view = []
    allowed_update = []
    user_perms = current_user.permissions or {}

    for col, (view_perms, update_perms) in COLUMN_PERMISSIONS_MAP.items():
        # Kiểm tra quyền xem
        if any(bool(user_perms.get(k, False)) for k in view_perms):
            allowed_view.append(col)

        # Kiểm tra quyền sửa
        if any(bool(user_perms.get(k, False)) for k in update_perms):
            allowed_update.append(col)

    # Các cột thông tin cơ bản tối thiểu hiển thị trên bảng danh sách
    base_cols = ["res", "sap", "rk7", "coscenter", "sdt_nh", "email", "ip", "region", "brand", "trangthai"]
    for b in base_cols:
        if b not in allowed_view:
            allowed_view.append(b)

    return allowed_view, allowed_update


from datetime import date


def _fmt(val: Any) -> Optional[str]:
    """Chuyển đổi an toàn các kiểu date, datetime, bool, int sang string"""
    if val is None:
        return None
    if isinstance(val, bool):
        return "True" if val else "False"
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(val, date):
        return val.strftime("%Y-%m-%d")
    s = str(val).strip()
    return s if s else None


def parse_date_safely(date_val: Any) -> Optional[datetime]:
    """Chuyển đổi an toàn chuỗi ngày sang datetime/date, kiểm tra tính hợp lệ"""
    if not date_val:
        return None
    if isinstance(date_val, datetime):
        return date_val
    if isinstance(date_val, date):
        return datetime.combine(date_val, datetime.min.time())
    if isinstance(date_val, str):
        s = date_val.strip()
        if not s:
            return None
        # Bỏ phần giờ nếu có
        s_date = s.split(" ")[0]
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(s_date, fmt)
            except ValueError:
                continue
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng ngày '{date_val}' không hợp lệ. Vui lòng nhập YYYY-MM-DD hoặc DD/MM/YYYY"
        )
    return None


def mask_restaurant_item(res: Restaurant, allowed_view: List[str], can_update: bool) -> RestaurantItem:
    """Tạo RestaurantItem và ẩn các trường nhạy cảm nếu không có quyền xem"""
    item_dict = {
        "id": res.id,
        "res": _fmt(res.res) if "res" in allowed_view else None,
        "sap": _fmt(res.sap) if "sap" in allowed_view else None,
        "coscenter": _fmt(res.coscenter) if "coscenter" in allowed_view else None,
        "rk7": _fmt(res.rk7) if "rk7" in allowed_view else None,
        "sap_old": _fmt(res.sap_old) if "sap_old" in allowed_view else None,
        "oracale": _fmt(res.oracale) if "oracale" in allowed_view else None,
        "don_gia": _fmt(res.don_gia) if "don_gia" in allowed_view else None,
        "address": _fmt(res.address) if "address" in allowed_view else None,
        "region": _fmt(res.region) if "region" in allowed_view else None,
        "brand": _fmt(res.brand) if "brand" in allowed_view else None,
        "sdt_nh": _fmt(res.sdt_nh) if "sdt_nh" in allowed_view else None,
        "email": _fmt(res.email) if "email" in allowed_view else None,
        "trangthai": _fmt(res.trangthai) or "ON",
        "status": _fmt(res.status),
        "active": _fmt(res.active) or "True",
        "ngay_khaitruong": _fmt(res.ngay_khaitruong) if "ngay_khaitruong" in allowed_view else None,
        "ip": _fmt(res.ip) if "ip" in allowed_view else None,
        "ip_wan": _fmt(res.ip_wan) if "ip_wan" in allowed_view else None,
        "teamview_pc": _fmt(res.teamview_pc) if "teamview_pc" in allowed_view else None,
        "teamview_pos11": _fmt(res.teamview_pos11) if "teamview_pos11" in allowed_view else None,
        "teamview_pos12": _fmt(res.teamview_pos12) if "teamview_pos12" in allowed_view else None,
        "rustdesk_pos11": _fmt(res.rustdesk_pos11) if "rustdesk_pos11" in allowed_view else None,
        "rustdesk_pos12": _fmt(res.rustdesk_pos12) if "rustdesk_pos12" in allowed_view else None,
        "pass_ou_ko_sys": _fmt(res.pass_ou_ko_sys) if "pass_ou_ko_sys" in allowed_view else None,
        "user_ftth": _fmt(res.user_ftth) if "user_ftth" in allowed_view else None,
        "pass_ftth": _fmt(res.pass_ftth) if "pass_ftth" in allowed_view else None,
        "thanhtoan_ftth": _fmt(res.thanhtoan_ftth) if "thanhtoan_ftth" in allowed_view else None,
        "ngay_online_ftth": _fmt(res.ngay_online_ftth) if "ngay_online_ftth" in allowed_view else None,
        "dk_truyenthong": _fmt(res.dk_truyenthong) if "dk_truyenthong" in allowed_view else None,
        "pass_mail": _fmt(res.pass_mail) if "pass_mail" in allowed_view else None,
        "ext": _fmt(res.ext) if "ext" in allowed_view else None,
        "sys_sales": _fmt(res.sys_sales) if "sys_sales" in allowed_view else None,
        "note": _fmt(res.note) if "note" in allowed_view else None,
        "timkiem": _fmt(res.timkiem),
        "ngay_insert": _fmt(res.ngay_insert),
        "user_insert": _fmt(res.user_insert),
        "ngay_update": _fmt(res.ngay_update),
        "user_update": _fmt(res.user_update),
        "can_update": can_update,
    }
    return RestaurantItem(**item_dict)



def apply_restaurant_search_filter(query, search_text: Optional[str]):
    """
    Bộ lọc tìm kiếm nhà hàng:
    - Tìm kiếm theo cụm từ liên tiếp (consecutive phrase)
    - Không phân biệt chữ HOA / chữ thường
    - Không phân biệt dấu tiếng Việt (ví dụ: 'tân sơn nhì' và 'tan son nhi' hoàn toàn trùng khớp)
    - Tự động tìm trên các trường: Tên nhà hàng, SAP, RK7, Cost Center, Mã Oracle (oracale), Địa chỉ, Khu vực, Thương hiệu, Email, SĐT, IP, Timkiem
    """
    if not search_text or not search_text.strip():
        return query

    raw_term = " ".join(search_text.strip().split())
    if not raw_term:
        return query

    u_term = literal(f"%{raw_term}%", type_=Unicode)
    return query.where(
        or_(
            Restaurant.res.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.sap.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.rk7.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.coscenter.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.oracale.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.address.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.region.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.brand.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.timkiem.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.sdt_nh.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.email.collate("Latin1_General_CI_AI").like(u_term),
            Restaurant.ip.like(f"%{raw_term}%"),
            Restaurant.ip_wan.like(f"%{raw_term}%"),
        )
    )


def get_restaurants(
    db: Session,
    current_user: UserInfo,
    search: Optional[str] = None,
    region: Optional[str] = None,
    brand: Optional[str] = None,
    trangthai: Optional[str] = None,
    page: int = 1,
    page_size: int = 25,
    sort_by: str = "res",
    sort_order: str = "asc"
) -> RestaurantListResponse:
    """Truy vấn danh sách nhà hàng có phân trang & bộ lọc (mặc định sắp xếp Alpha B theo tên nhà hàng A-Z)"""
    allowed_view, allowed_update = get_user_allowed_columns(current_user)
    is_admin = is_admin_user(current_user)

    query = select(Restaurant)

    # Bộ lọc tìm kiếm thông minh
    query = apply_restaurant_search_filter(query, search)

    # Lọc theo Khu vực
    if region and region.strip() != "ALL":
        query = query.where(Restaurant.region == region.strip())

    # Lọc theo Thương hiệu
    if brand and brand.strip() != "ALL":
        query = query.where(Restaurant.brand == brand.strip())

    # Lọc theo Trạng thái (hỗ trợ nhiều trạng thái cách nhau bởi dấu phẩy, ví dụ: "ON,NEW" hoặc "ON")
    if trangthai and trangthai.strip() and trangthai.strip().upper() != "ALL":
        tt_list = [t.strip().upper() for t in trangthai.split(",") if t.strip() and t.strip().upper() != "ALL"]
        if len(tt_list) == 1:
            query = query.where(func.upper(func.coalesce(Restaurant.trangthai, '')) == tt_list[0])
        elif len(tt_list) > 1:
            query = query.where(func.upper(func.coalesce(Restaurant.trangthai, '')).in_(tt_list))

    # Nếu không phải Super Admin: Ẩn các nhà hàng có status == 'OFF' (đã đánh dấu xóa)
    if not is_super_admin_user(current_user):
        query = query.where(
            or_(
                Restaurant.status == None,
                Restaurant.status == "",
                func.upper(Restaurant.status) != "OFF"
            )
        )

    # Đếm tổng số bản ghi phù hợp
    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0

    # Sắp xếp: Ưu tiên trạng thái hoạt động (ON -> NEW -> OFF), sau đó sắp xếp theo thứ tự bảng chữ cái Alpha B (Tên Nhà Hàng)
    status_order = case(
        (func.upper(sql_trim(func.coalesce(Restaurant.status, ''))) == 'OFF', 4),
        (func.upper(sql_trim(func.coalesce(Restaurant.trangthai, ''))) == 'ON', 1),
        (func.upper(sql_trim(func.coalesce(Restaurant.trangthai, ''))) == 'NEW', 2),
        else_=3
    )

    sort_col = getattr(Restaurant, sort_by, Restaurant.res)
    if sort_order.lower() == "desc":
        query = query.order_by(status_order, desc(sort_col))
    else:
        query = query.order_by(status_order, asc(sort_col))

    # Phân trang
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    restaurants = db.scalars(query).all()

    items = [
        mask_restaurant_item(r, allowed_view, can_update=is_admin or len(allowed_update) > 0)
        for r in restaurants
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return RestaurantListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        allowed_view_columns=allowed_view,
        allowed_update_columns=allowed_update
    )


def get_restaurant_by_id(
    db: Session,
    current_user: UserInfo,
    restaurant_id: int
) -> Optional[RestaurantItem]:
    """Lấy chi tiết 1 nhà hàng"""
    res = db.scalar(select(Restaurant).where(Restaurant.id == restaurant_id))
    if not res:
        return None

    # Không phải Super Admin thì không được xem nhà hàng đã đánh dấu xóa (status == 'OFF')
    if not is_super_admin_user(current_user) and res.status and res.status.strip().upper() == "OFF":
        return None

    allowed_view, allowed_update = get_user_allowed_columns(current_user)
    is_admin = is_admin_user(current_user)
    return mask_restaurant_item(res, allowed_view, can_update=is_admin or len(allowed_update) > 0)


def validate_restaurant_uniqueness(
    db: Session,
    sap: Optional[str] = None,
    rk7: Optional[str] = None,
    email: Optional[str] = None,
    exclude_id: Optional[int] = None
):
    """Kiểm tra bắt trùng mã SAP, mã RK7 và Email nhà hàng"""
    # 1. Bắt trùng Mã SAP
    if sap and sap.strip():
        clean_sap = sap.strip()
        if clean_sap.lower() not in ["none", "khong phai nh"]:
            stmt = select(Restaurant).where(func.lower(sql_trim(Restaurant.sap)) == clean_sap.lower())
            if exclude_id:
                stmt = stmt.where(Restaurant.id != exclude_id)
            dup = db.scalar(stmt)
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã SAP '{clean_sap}' đã được sử dụng bởi nhà hàng '{dup.res}' (ID: {dup.id})."
                )

    # 2. Bắt trùng Mã RK7
    if rk7 and rk7.strip():
        clean_rk7 = rk7.strip()
        if clean_rk7.lower() not in ["none"]:
            stmt = select(Restaurant).where(func.lower(sql_trim(Restaurant.rk7)) == clean_rk7.lower())
            if exclude_id:
                stmt = stmt.where(Restaurant.id != exclude_id)
            dup = db.scalar(stmt)
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mã RK7 '{clean_rk7}' đã được sử dụng bởi nhà hàng '{dup.res}' (ID: {dup.id})."
                )

    # 3. Bắt trùng Email nhà hàng
    if email and email.strip():
        clean_email = email.strip()
        if clean_email.lower() not in ["none"]:
            stmt = select(Restaurant).where(func.lower(sql_trim(Restaurant.email)) == clean_email.lower())
            if exclude_id:
                stmt = stmt.where(Restaurant.id != exclude_id)
            dup = db.scalar(stmt)
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email nhà hàng '{clean_email}' đã được sử dụng bởi nhà hàng '{dup.res}' (ID: {dup.id})."
                )


def create_restaurant(
    db: Session,
    current_user: UserInfo,
    data: RestaurantCreate
) -> RestaurantItem:
    """Thêm mới nhà hàng vào dbo.RESTAURANT (có bắt trùng SAP, RK7, Email)"""
    # Kiểm tra trùng lặp SAP, RK7, Email
    validate_restaurant_uniqueness(db, sap=data.sap, rk7=data.rk7, email=data.email)

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Tạo chuỗi timkiem
    timkiem = f"{data.res} {data.sap or ''} {data.rk7 or ''} {data.address or ''}".strip()

    restaurant_dict = data.model_dump()
    restaurant_dict["timkiem"] = timkiem
    restaurant_dict["ngay_insert"] = datetime.now()
    restaurant_dict["user_insert"] = current_user.username
    restaurant_dict["active"] = True

    if not restaurant_dict.get("ngay_khaitruong"):
        restaurant_dict["ngay_khaitruong"] = None
    else:
        restaurant_dict["ngay_khaitruong"] = parse_date_safely(restaurant_dict["ngay_khaitruong"])

    if not restaurant_dict.get("ngay_online_ftth"):
        restaurant_dict["ngay_online_ftth"] = None
    else:
        dt = parse_date_safely(restaurant_dict["ngay_online_ftth"])
        restaurant_dict["ngay_online_ftth"] = dt.date() if dt else None

    res = Restaurant(**restaurant_dict)
    db.add(res)
    db.flush()

    # Ghi log kiểm toán (Bảo mật: tuyệt đối không ghi mật khẩu vào logs)
    has_pass = any(bool(restaurant_dict.get(k)) for k in ["pass_mail", "pass_ftth", "pass_ou_ko_sys"])
    pass_note = " | Có thiết lập mật khẩu (đã bảo mật)" if has_pass else ""
    log = AuditLog(
        manhinh="RESTAURANT",
        chucnang="Thêm mới nhà hàng",
        user_thuchien=current_user.username,
        noidung=f"ID {res.id} - {res.res} | SAP: {res.sap or 'N/A'}, Region: {res.region or 'N/A'}, Brand: {res.brand or 'N/A'}{pass_note}",
        ngay_insert=datetime.now()
    )
    db.add(log)
    db.commit()
    db.refresh(res)

    allowed_view, allowed_update = get_user_allowed_columns(current_user)
    return mask_restaurant_item(res, allowed_view, can_update=True)


def update_restaurant(
    db: Session,
    current_user: UserInfo,
    restaurant_id: int,
    data: RestaurantUpdate
) -> Optional[RestaurantItem]:
    """Cập nhật thông tin nhà hàng theo phân quyền (có bắt trùng SAP, RK7, Email)"""
    res = db.scalar(select(Restaurant).where(Restaurant.id == restaurant_id))
    if not res:
        return None

    # Kiểm tra trùng lặp nếu có thay đổi SAP, RK7, Email
    if data.sap is not None or data.rk7 is not None or data.email is not None:
        validate_restaurant_uniqueness(
            db,
            sap=data.sap if data.sap is not None else res.sap,
            rk7=data.rk7 if data.rk7 is not None else res.rk7,
            email=data.email if data.email is not None else res.email,
            exclude_id=restaurant_id
        )

    allowed_view, allowed_update = get_user_allowed_columns(current_user)
    is_admin = is_admin_user(current_user)
    is_super = is_super_admin_user(current_user)

    update_data = data.model_dump(exclude_unset=True)
    # Cột 'status' chỉ Super Admin mới được thấy và cập nhật (đánh dấu xóa mềm)
    if "status" in update_data and not is_super:
        del update_data["status"]

    PASSWORD_FIELDS = {"pass_mail", "pass_ftth", "pass_ou_ko_sys", "password", "pass_"}
    updated_fields = []
    change_details = []

    for field, value in update_data.items():
        if value is not None:
            # Kiểm tra xem user có quyền sửa cột này không (Admin, SuperAdmin hoặc có quyền trong allowed_update)
            can_edit = is_admin or (field in allowed_update)
            if field == "status":
                can_edit = is_super
            if can_edit:
                old_val = getattr(res, field)
                if field == "ngay_khaitruong":
                    value = parse_date_safely(value) if (value != "" and value is not None) else None
                elif field == "ngay_online_ftth":
                    dt = parse_date_safely(value) if (value != "" and value is not None) else None
                    value = dt.date() if dt else None

                # So sánh giá trị cũ và mới
                is_changed = str(old_val or "") != str(value or "")
                setattr(res, field, value)
                updated_fields.append(field)

                if is_changed:
                    # BẢO MẬT TUYỆT ĐỐI: KHÔNG GHI MẬT KHẨU VÀO LOGS
                    if field in PASSWORD_FIELDS or "pass" in field.lower():
                        change_details.append(f"{field}: [ĐÃ THAY ĐỔI MẬT KHẨU (BẢO MẬT)]")
                    else:
                        old_txt = str(old_val) if old_val is not None and str(old_val).strip() else "trống"
                        new_txt = str(value) if value is not None and str(value).strip() else "trống"
                        change_details.append(f"{field}: '{old_txt}' -> '{new_txt}'")

    res.ngay_update = datetime.now()
    res.user_update = current_user.username

    # Cập nhật lại timkiem nếu sửa tên hoặc địa chỉ
    if "res" in updated_fields or "address" in updated_fields or "sap" in updated_fields:
        res.timkiem = f"{res.res} {res.sap or ''} {res.rk7 or ''} {res.address or ''}".strip()

    # Ghi log kiểm toán
    details_str = "; ".join(change_details) if change_details else (", ".join(updated_fields) if updated_fields else "Không có thay đổi")
    log = AuditLog(
        manhinh="RESTAURANT",
        chucnang="Cập nhật nhà hàng",
        user_thuchien=current_user.username,
        noidung=f"ID {res.id} - {res.res} | Thay đổi: {details_str}",
        ngay_insert=datetime.now()
    )
    db.add(log)
    db.commit()
    db.refresh(res)

    return mask_restaurant_item(res, allowed_view, can_update=True)


def get_restaurant_logs(
    db: Session,
    current_user: Optional[UserInfo] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    action_type: Optional[str] = None,
    user_thuchien: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None
) -> RestaurantAuditLogsResponse:
    """Lấy danh sách nhật ký thêm/sửa nhà hàng (Riêng tài khoản Supper Admin thì Supper Admin mới thấy, các user khác chỉ xem được log khác ngoại trừ Supper Admin)"""
    query = select(AuditLog).where(AuditLog.manhinh == "RESTAURANT")

    # Bảo mật: Nếu người xem KHÔNG PHẢI Supper Admin -> Loại bỏ tất cả logs do Supper Admin thực hiện
    if current_user is not None and not is_super_admin_user(current_user):
        super_admin_usernames = ["admin", "administrator", "dung.nguyenanh"]
        super_users = db.scalars(select(User.user_name1).where(or_(User.phanquyen == "0", func.lower(User.user_name1).in_(["admin", "administrator", "dung.nguyenanh"])))).all()
        for su in super_users:
            if su and su.strip().lower() not in super_admin_usernames:
                super_admin_usernames.append(su.strip().lower())
        query = query.where(func.lower(func.coalesce(AuditLog.user_thuchien, "")).notin_(super_admin_usernames))

    has_date_filter = False
    if from_date and from_date.strip():
        dt_from = parse_date_safely(from_date)
        if dt_from:
            query = query.where(AuditLog.ngay_insert >= dt_from)
            has_date_filter = True

    if to_date and to_date.strip():
        dt_to = parse_date_safely(to_date)
        if dt_to:
            dt_to_end = dt_to.replace(hour=23, minute=59, second=59)
            query = query.where(AuditLog.ngay_insert <= dt_to_end)
            has_date_filter = True

    if action_type and action_type.strip() and action_type.strip() != "ALL":
        query = query.where(AuditLog.chucnang.ilike(f"%{action_type.strip()}%"))

    if user_thuchien and user_thuchien.strip():
        query = query.where(AuditLog.user_thuchien.ilike(f"%{user_thuchien.strip()}%"))

    if search and search.strip():
        query = query.where(AuditLog.noidung.ilike(f"%{search.strip()}%"))

    # Đếm tổng
    count_stmt = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_stmt) or 0

    # Lấy dữ liệu sắp xếp mới nhất lên trước
    # Mặc định 200 dòng gần nhất khi không chọn ngày; nếu có chọn ngày thì lấy toàn bộ theo khoảng ngày đó
    query = query.order_by(desc(AuditLog.id))
    if limit is not None:
        query = query.limit(limit)
    elif not has_date_filter:
        query = query.limit(200)

    rows = db.scalars(query).all()

    items = [
        RestaurantAuditLogItem(
            id=r.id,
            manhinh=r.manhinh,
            chucnang=r.chucnang,
            user_thuchien=r.user_thuchien,
            noidung=r.noidung,
            ngay_insert=r.ngay_insert.strftime("%Y-%m-%d %H:%M:%S") if r.ngay_insert else None
        )
        for r in rows
    ]

    return RestaurantAuditLogsResponse(items=items, total=total)


def export_restaurant_logs_excel(
    db: Session,
    current_user: Optional[UserInfo] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    action_type: Optional[str] = None,
    user_thuchien: Optional[str] = None,
    search: Optional[str] = None,
    limit: Optional[int] = None
) -> io.BytesIO:
    """Xuất báo cáo nhật ký thêm/sửa nhà hàng ra file Excel (áp dụng quyền Supper Admin)"""
    logs_res = get_restaurant_logs(
        db=db,
        current_user=current_user,
        from_date=from_date,
        to_date=to_date,
        action_type=action_type,
        user_thuchien=user_thuchien,
        search=search,
        limit=limit
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Logs Nha Hang"

    # Định dạng style
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

    # Tiêu đề báo cáo
    ws.merge_cells("A1:F1")
    ws["A1"] = "BÁO CÁO LOGS NHÀ HÀNG"
    ws["A1"].font = title_font
    ws["A1"].alignment = center_align
    ws.row_dimensions[1].height = 28

    # Thông tin xuất
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    ws.merge_cells("A2:F2")
    has_date = bool((from_date and from_date.strip()) or (to_date and to_date.strip()))
    if has_date:
        meta_text = f"Thời gian xuất: {now_str} | Số lượng bản ghi: {len(logs_res.items)} dòng"
    else:
        meta_text = f"Thời gian xuất: {now_str} | Số lượng bản ghi: {len(logs_res.items)} dòng (Mặc định 200 dòng gần nhất)"
    ws["A2"] = meta_text
    ws["A2"].font = meta_font
    ws["A2"].alignment = center_align
    ws.row_dimensions[2].height = 18

    # Header bảng
    headers = [
        ("STT", 8),
        ("Mã Log", 12),
        ("Thời Gian", 22),
        ("Người Thực Hiện", 20),
        ("Hành Động", 22),
        ("Nội Dung Chi Tiết", 80)
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

    # Ghi dữ liệu
    for idx, item in enumerate(logs_res.items, 1):
        row_num = header_row + idx
        ws.row_dimensions[row_num].height = 22

        ws.cell(row=row_num, column=1, value=idx).alignment = center_align
        ws.cell(row=row_num, column=2, value=item.id).alignment = center_align
        ws.cell(row=row_num, column=3, value=item.ngay_insert or "").alignment = center_align
        ws.cell(row=row_num, column=4, value=item.user_thuchien or "").alignment = center_align
        ws.cell(row=row_num, column=5, value=item.chucnang or "").alignment = center_align
        ws.cell(row=row_num, column=6, value=item.noidung or "").alignment = left_align

        for col_idx in range(1, 7):
            cell = ws.cell(row=row_num, column=col_idx)
            cell.font = data_font
            cell.border = border_thin

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def get_filter_options(db: Session) -> RestaurantOptionsResponse:
    """Lấy danh sách các lựa chọn khu vực, thương hiệu, trạng thái từ bảng danh mục"""
    # Lấy danh sách Khu Vực từ dbo.REGION + dbo.RESTAURANT
    try:
        region_query = text("""
            SELECT DISTINCT LTRIM(RTRIM(val)) FROM (
                SELECT ten_tinhthanh AS val FROM dbo.REGION WHERE active = 1 AND ten_tinhthanh IS NOT NULL
                UNION
                SELECT region AS val FROM dbo.RESTAURANT WHERE region IS NOT NULL AND region <> ''
            ) AS combined
            WHERE val <> ''
            ORDER BY LTRIM(RTRIM(val))
        """)
        regions_res = db.execute(region_query).fetchall()
        regions = [r[0] for r in regions_res if r[0]]
    except Exception:
        regions_res = db.execute(
            text("SELECT DISTINCT region FROM dbo.RESTAURANT WHERE region IS NOT NULL AND region <> '' ORDER BY region")
        ).fetchall()
        regions = [r[0].strip() for r in regions_res if r[0]]

    # Lấy danh sách Thương Hiệu từ dbo.BRAND + dbo.RESTAURANT
    try:
        brand_query = text("""
            SELECT DISTINCT LTRIM(RTRIM(val)) FROM (
                SELECT REPLACE(REPLACE(tenbrand, CHAR(13), ''), CHAR(10), '') AS val FROM dbo.BRAND WHERE active = 1 AND tenbrand IS NOT NULL
                UNION
                SELECT brand AS val FROM dbo.RESTAURANT WHERE brand IS NOT NULL AND brand <> ''
            ) AS combined
            WHERE val <> ''
            ORDER BY LTRIM(RTRIM(val))
        """)
        brands_res = db.execute(brand_query).fetchall()
        brands = [b[0] for b in brands_res if b[0]]
    except Exception:
        brands_res = db.execute(
            text("SELECT DISTINCT brand FROM dbo.RESTAURANT WHERE brand IS NOT NULL AND brand <> '' ORDER BY brand")
        ).fetchall()
        brands = [b[0].strip() for b in brands_res if b[0]]

    # Lấy danh sách Trạng Thái hoạt động (ON, OFF, NEW)
    try:
        status_res = db.execute(
            text("SELECT DISTINCT UPPER(LTRIM(RTRIM(trangthai))) FROM dbo.RESTAURANT WHERE trangthai IS NOT NULL AND trangthai <> ''")
        ).fetchall()
        db_statuses = [s[0] for s in status_res if s[0]]
        # Đảm bảo có đủ bộ chuẩn ON, OFF, NEW và duy trì thứ tự logic
        preferred_order = ["ON", "OFF", "NEW"]
        statuses = [s for s in preferred_order if s in db_statuses or s in ["ON", "OFF", "NEW"]]
        for s in db_statuses:
            if s not in statuses:
                statuses.append(s)
    except Exception:
        statuses = ["ON", "OFF", "NEW"]

    return RestaurantOptionsResponse(
        regions=regions,
        brands=brands,
        statuses=statuses
    )


def export_restaurants_excel(
    db: Session,
    current_user: UserInfo,
    search: Optional[str] = None,
    region: Optional[str] = None,
    brand: Optional[str] = None,
    trangthai: Optional[str] = None
) -> io.BytesIO:
    """Xuất danh sách nhà hàng ra file Excel .xlsx với định dạng chuẩn"""
    allowed_view, _ = get_user_allowed_columns(current_user)

    query = select(Restaurant)
    query = apply_restaurant_search_filter(query, search)
    if region and region != "ALL":
        query = query.where(Restaurant.region == region.strip())
    if brand and brand != "ALL":
        query = query.where(Restaurant.brand == brand.strip())
    if trangthai and trangthai.strip() and trangthai.strip().upper() != "ALL":
        tt_list = [t.strip().upper() for t in trangthai.split(",") if t.strip() and t.strip().upper() != "ALL"]
        if len(tt_list) == 1:
            query = query.where(func.upper(func.coalesce(Restaurant.trangthai, '')) == tt_list[0])
        elif len(tt_list) > 1:
            query = query.where(func.upper(func.coalesce(Restaurant.trangthai, '')).in_(tt_list))

    # Nếu không phải Super Admin: Ẩn các nhà hàng có status == 'OFF'
    if not is_super_admin_user(current_user):
        query = query.where(
            or_(
                Restaurant.status == None,
                Restaurant.status == "",
                func.upper(Restaurant.status) != "OFF"
            )
        )

    status_order = case(
        (func.upper(sql_trim(func.coalesce(Restaurant.status, ''))) == 'OFF', 4),
        (func.upper(sql_trim(func.coalesce(Restaurant.trangthai, ''))) == 'ON', 1),
        (func.upper(sql_trim(func.coalesce(Restaurant.trangthai, ''))) == 'NEW', 2),
        else_=3
    )
    query = query.order_by(status_order, asc(Restaurant.res))
    restaurants = db.scalars(query).all()

    # Tạo workbook openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Danh Sách Nhà Hàng"

    # Header styling
    header_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="000000")
    border_thin = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='thin', color='D0D7DE')
    )

    all_export_columns = [
        ("Mã ID", "id"),
        ("Tên Nhà Hàng", "res"),
        ("Mã SAP", "sap"),
        ("Mã RK7", "rk7"),
        ("Cost Center", "coscenter"),
        ("Số ĐT", "sdt_nh"),
        ("Email", "email"),
        ("Địa Chỉ", "address"),
        ("Khu Vực", "region"),
        ("Thương Hiệu", "brand"),
        ("Trạng Thái", "trangthai"),
        ("Ngày Khai Trương", "ngay_khaitruong"),
        ("IP LAN", "ip"),
        ("IP WAN", "ip_wan"),
        ("Teamview PC", "teamview_pc"),
        ("Teamview POS 11", "teamview_pos11"),
        ("Teamview POS 12", "teamview_pos12"),
        ("Rustdesk POS 11", "rustdesk_pos11"),
        ("Rustdesk POS 12", "rustdesk_pos12"),
        ("Pass OU/KO Sys", "pass_ou_ko_sys"),
        ("Sys Sales", "sys_sales"),
        ("User FTTH", "user_ftth"),
        ("Pass FTTH", "pass_ftth"),
        ("Thanh Toán FTTH", "thanhtoan_ftth"),
        ("Ngày Online FTTH", "ngay_online_ftth"),
        ("ĐK Truyền Thông", "dk_truyenthong"),
        ("Pass Mail", "pass_mail"),
        ("Code Photo", "code_photo"),
        ("EXT RSC", "ext"),
        ("Oracle", "oracale"),
        ("Mã SAP Cũ", "sap_old"),
        ("Đơn Giá", "don_gia"),
        ("Ghi Chú", "note")
    ]

    # BẢO MẬT AN TOÀN THÔNG TIN:
    # CHỈ đưa vào file Excel các cột mà người dùng/nhóm người dùng được cấp quyền XEM (view)
    # Cột nào không được phân quyền xem thì TUYỆT ĐỐI KHÔNG xuất hiện (kể cả tiêu đề cột) trong file Excel
    headers = [
        (title, field_name)
        for title, field_name in all_export_columns
        if field_name not in COLUMN_PERMISSIONS_MAP or field_name in allowed_view
    ]

    # Ghi header
    ws.row_dimensions[1].height = 28
    for col_idx, (title, field_name) in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx, value=title)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = border_thin

    # Ghi data
    for row_idx, r in enumerate(restaurants, start=2):
        ws.row_dimensions[row_idx].height = 20
        for col_idx, (title, field_name) in enumerate(headers, start=1):
            val = getattr(r, field_name, None)
            # Phòng thủ chiều sâu (defense-in-depth): nếu bất kỳ lý do gì không có quyền thì để rỗng
            if field_name in COLUMN_PERMISSIONS_MAP and field_name not in allowed_view:
                val = ""
            cell = ws.cell(row=row_idx, column=col_idx, value=_fmt(val) or "")
            cell.border = border_thin
            cell.alignment = Alignment(vertical="center")

    # Tự động điều chỉnh độ rộng cột
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return stream


def get_brands(db: Session) -> List[BrandItem]:
    """Lấy danh sách tất cả các thương hiệu từ bảng BRAND"""
    brands = db.scalars(select(Brand).order_by(asc(Brand.tenbrand))).all()
    return [
        BrandItem(
            id=b.id,
            mabrand=b.mabrand,
            tenbrand=b.tenbrand.strip() if b.tenbrand else "",
            active=bool(b.active),
            ngay_insert=_fmt(b.ngay_insert),
            user_them=b.user_them
        )
        for b in brands
    ]


def create_brand(db: Session, current_user: UserInfo, data: BrandCreate) -> BrandItem:
    """Thêm mới một thương hiệu vào bảng BRAND (bắt trùng cả tên thương hiệu và mã brand)"""
    clean_name = data.tenbrand.strip()
    existing = db.scalar(select(Brand).where(func.lower(sql_trim(Brand.tenbrand)) == clean_name.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tên thương hiệu '{clean_name}' đã tồn tại trong hệ thống (ID: {existing.id})."
        )

    mabrand = data.mabrand.strip() if data.mabrand and data.mabrand.strip() else clean_name.lower().replace(" ", "")
    existing_code = db.scalar(select(Brand).where(func.lower(sql_trim(Brand.mabrand)) == mabrand.lower()))
    if existing_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã thương hiệu '{mabrand}' đã được sử dụng bởi thương hiệu '{existing_code.tenbrand}'."
        )

    new_brand = Brand(
        mabrand=mabrand,
        tenbrand=clean_name,
        ngay_insert=datetime.now(),
        user_them=current_user.username,
        active=True
    )
    db.add(new_brand)
    db.commit()
    db.refresh(new_brand)

    # Ghi log kiểm toán
    log = AuditLog(
        manhinh="RESTAURANT",
        chucnang="Thêm thương hiệu mới",
        user_thuchien=current_user.username,
        noidung=f"Thương hiệu: {clean_name} | Mã: {mabrand}",
        ngay_insert=datetime.now()
    )
    db.add(log)
    db.commit()

    return BrandItem(
        id=new_brand.id,
        mabrand=new_brand.mabrand,
        tenbrand=new_brand.tenbrand,
        active=bool(new_brand.active),
        ngay_insert=_fmt(new_brand.ngay_insert),
        user_them=new_brand.user_them
    )


def get_regions(db: Session) -> List[RegionItem]:
    """Lấy danh sách tất cả các khu vực từ bảng REGION"""
    regions = db.scalars(select(Region).order_by(asc(Region.ten_tinhthanh))).all()
    return [
        RegionItem(
            id=r.id,
            ma_tinhthanh=r.ma_tinhthanh,
            ten_tinhthanh=r.ten_tinhthanh.strip() if r.ten_tinhthanh else "",
            bienso=r.bienso,
            active=bool(r.active)
        )
        for r in regions
    ]


def create_region(db: Session, current_user: UserInfo, data: RegionCreate) -> RegionItem:
    """Thêm mới một khu vực vào bảng REGION (bắt trùng tên khu vực)"""
    clean_name = data.ten_tinhthanh.strip()
    existing = db.scalar(select(Region).where(func.lower(sql_trim(Region.ten_tinhthanh)) == clean_name.lower()))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Khu vực '{clean_name}' đã tồn tại trong hệ thống (ID: {existing.id})."
        )

    new_region = Region(
        ma_tinhthanh=data.ma_tinhthanh.strip() if data.ma_tinhthanh else None,
        ten_tinhthanh=clean_name,
        bienso=data.bienso.strip() if data.bienso else None,
        timkiem=clean_name,
        active=True
    )
    db.add(new_region)
    db.commit()
    db.refresh(new_region)

    # Ghi log kiểm toán
    log = AuditLog(
        manhinh="RESTAURANT",
        chucnang="Thêm khu vực mới",
        user_thuchien=current_user.username,
        noidung=f"Khu vực: {clean_name} | Mã: {data.ma_tinhthanh or ''}, Biển số: {data.bienso or ''}",
        ngay_insert=datetime.now()
    )
    db.add(log)
    db.commit()

    return RegionItem(
        id=new_region.id,
        ma_tinhthanh=new_region.ma_tinhthanh,
        ten_tinhthanh=new_region.ten_tinhthanh,
        bienso=new_region.bienso,
        active=bool(new_region.active)
    )
