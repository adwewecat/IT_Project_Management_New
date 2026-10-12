import json
import logging
import os
import re
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User, RoleLevel, PermissionDetail
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleItemResponse,
    PermissionDetailItem,
    RoleWithPermissionsResponse,
    UpdateRolePermissionsRequest,
    AddCustomPermissionRequest,
)
from app.services.user_service import log_admin_action

logger = logging.getLogger(__name__)

CUSTOM_PERM_FILE = os.path.join(os.path.dirname(__file__), "..", "core", "custom_permissions.json")

# Database columns already recognized or mapped to standard permissions
RECOGNIZED_DB_COLUMNS = {
    # System metadata columns to ignore:
    "id", "timkiem", "ngay_insert", "ngay_update", "user_insert", "user_update", "active", "trangthai", "status",
    # Columns mapped to base permissions:
    "res", "sdt_nh", "email", "email_nh", "address", "region", "brand", "note", "note_nh", "ngay_khaitruong",
    "sap", "coscenter", "rk7", "oracale", "sap_old", "don_gia", "ip", "ip_lan",
    "teamview_pc", "teamview_pos11", "teamview_pos12", "rustdesk_pos11", "rustdesk_pos12",
    "ip_wan", "ipwan", "pass_ou_ko_sys", "sys_sales", "sys",
    "user_ftth", "pass_ftth", "thanhtoan_ftth", "ngay_online_ftth", "ftth",
    "dk_truyenthong", "pass_mail", "code_photo", "ext", "ext_rsc",
}

# Standard permission definitions including all RESTAURANT columns and existing modules
BASE_PERMISSION_DEFINITIONS = [
    # === DANH SÁCH NHÀ HÀNG: THÔNG TIN CƠ BẢN & LIÊN HỆ ===
    {"chucnang": "view_res", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Tên Nhà Hàng (res)"},
    {"chucnang": "update_res", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Tên Nhà Hàng"},
    {"chucnang": "view_trangthai", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Trạng Thái Hoạt Động (trangthai)"},
    {"chucnang": "update_trangthai", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Trạng Thái Hoạt Động"},
    {"chucnang": "view_sdt_nh", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem SĐT Nhà Hàng (sdt_nh)"},
    {"chucnang": "update_sdt_nh", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật SĐT Nhà Hàng"},
    {"chucnang": "view_email_nh", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Email Nhà Hàng (email)"},
    {"chucnang": "update_email_nh", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Email Nhà Hàng"},
    {"chucnang": "view_address", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Địa Chỉ (address)"},
    {"chucnang": "update_address", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Địa Chỉ"},
    {"chucnang": "view_region", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Khu Vực (region)"},
    {"chucnang": "update_region", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Khu Vực"},
    {"chucnang": "view_brand", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Thương Hiệu (brand)"},
    {"chucnang": "update_brand", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Thương Hiệu"},
    {"chucnang": "view_note_nh", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Ghi Chú (note)"},
    {"chucnang": "update_note_nh", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Ghi Chú"},
    {"chucnang": "view_ngay_khaitruong", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Xem Ngày Khai Trương"},
    {"chucnang": "update_ngay_khaitruong", "module": "DS Nhà Hàng: Thông Tin Cơ Bản", "action": "Cập nhật Ngày Khai Trương"},

    # === DANH SÁCH NHÀ HÀNG: MÃ HỆ THỐNG & KẾ TOÁN ===
    {"chucnang": "view_sap", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Xem Mã SAP (sap)"},
    {"chucnang": "update_sap", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Cập nhật Mã SAP"},
    {"chucnang": "view_coscenter", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Xem Cost Center (coscenter)"},
    {"chucnang": "update_coscenter", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Cập nhật Cost Center"},
    {"chucnang": "view_rk7", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Xem Mã POS RK7 (rk7)"},
    {"chucnang": "update_rk7", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Cập nhật Mã POS RK7"},
    {"chucnang": "view_oracale", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Xem Cột Oracle (oracale)"},
    {"chucnang": "update_oracale", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Cập nhật Cột Oracle"},
    {"chucnang": "view_sap_old", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Xem Mã SAP Cũ (sap_old)"},
    {"chucnang": "update_sap_old", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Cập nhật Mã SAP Cũ"},
    {"chucnang": "view_don_gia", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Xem Đơn Giá (don_gia)"},
    {"chucnang": "update_don_gia", "module": "DS Nhà Hàng: Mã SAP & Kế Toán", "action": "Cập nhật Đơn Giá"},

    # === DANH SÁCH NHÀ HÀNG: REMOTE & MÁY TRẠM ===
    {"chucnang": "view_ip_lan", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Xem IP Nội Bộ LAN (ip)"},
    {"chucnang": "update_ip_lan", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Cập nhật IP Nội Bộ LAN"},
    {"chucnang": "view_teamview_pc", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Xem TeamViewer PC"},
    {"chucnang": "update_teamview_pc", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Cập nhật TeamViewer PC"},
    {"chucnang": "view_teamview_pos11", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Xem TeamViewer POS 11"},
    {"chucnang": "update_teamview_pos11", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Cập nhật TeamViewer POS 11"},
    {"chucnang": "view_teamview_pos12", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Xem TeamViewer POS 12"},
    {"chucnang": "update_teamview_pos12", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Cập nhật TeamViewer POS 12"},
    {"chucnang": "view_rustdesk_pos11", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Xem RustDesk POS 11"},
    {"chucnang": "update_rustdesk_pos11", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Cập nhật RustDesk POS 11"},
    {"chucnang": "view_rustdesk_pos12", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Xem RustDesk POS 12"},
    {"chucnang": "update_rustdesk_pos12", "module": "DS Nhà Hàng: Remote & Máy Trạm", "action": "Cập nhật RustDesk POS 12"},

    # === DANH SÁCH NHÀ HÀNG: HẠ TẦNG MẠNG & FTTH ===
    {"chucnang": "view_ipwan", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem IP WAN (ip_wan)"},
    {"chucnang": "insert_ipwan", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Thêm mới IP WAN"},
    {"chucnang": "update_ipwan", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật IP WAN"},
    {"chucnang": "view_user_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Tài Khoản FTTH (user_ftth)"},
    {"chucnang": "update_user_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Tài Khoản FTTH"},
    {"chucnang": "view_pass_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Mật Khẩu FTTH (pass_ftth)"},
    {"chucnang": "update_pass_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Mật Khẩu FTTH"},
    {"chucnang": "view_ngay_online_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Ngày Online FTTH"},
    {"chucnang": "update_ngay_online_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Ngày Online FTTH"},
    {"chucnang": "view_thanhtoan_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Hình Thức Thanh Toán FTTH"},
    {"chucnang": "update_thanhtoan_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Hình Thức Thanh Toán FTTH"},
    {"chucnang": "view_dk_truyenthong", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem ĐK Truyền Thông (dk_truyenthong)"},
    {"chucnang": "update_dk_truyenthong", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật ĐK Truyền Thông"},
    {"chucnang": "view_pass_mail", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Mật Khẩu Mail Nhà Hàng (pass_mail)"},
    {"chucnang": "insert_pass_mail", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Thêm mới Mật Khẩu Mail Nhà Hàng"},
    {"chucnang": "update_pass_mail", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Mật Khẩu Mail Nhà Hàng"},
    {"chucnang": "view_pass_ou_ko_sys", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Mật Khẩu OU - Không sys"},
    {"chucnang": "update_pass_ou_ko_sys", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Mật Khẩu OU - Không sys"},
    {"chucnang": "view_ext", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Số Máy Lẻ EXT Nhà Hàng"},
    {"chucnang": "update_ext", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Số Máy Lẻ EXT Nhà Hàng"},
    {"chucnang": "view_sys_sales", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Cấu Hình Sys Sales"},
    {"chucnang": "update_sys_sales", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Cấu Hình Sys Sales"},
    # Nhóm gộp cũ (tương thích ngược)
    {"chucnang": "view_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Toàn Bộ Thông Tin FTTH (Gộp)"},
    {"chucnang": "insert_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Thêm mới Hợp Đồng FTTH (Gộp)"},
    {"chucnang": "update_ftth", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Toàn Bộ Thông Tin FTTH (Gộp)"},
    {"chucnang": "view_sys", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Xem Server POS / Pass OU Sys (Gộp)"},
    {"chucnang": "insert_sys", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Thêm mới Server POS / Pass OU Sys (Gộp)"},
    {"chucnang": "update_sys", "module": "DS Nhà Hàng: Hạ Tầng Mạng & FTTH", "action": "Cập nhật Server POS / Pass OU Sys (Gộp)"},

    # === VĂN PHÒNG: MÁY PHOTO & EXT ===
    {"chucnang": "view_code_photo", "module": "Văn Phòng: Máy Photo & Ext", "action": "Xem Danh Sách Mã Photo"},
    {"chucnang": "insert_code_photo", "module": "Văn Phòng: Máy Photo & Ext", "action": "Thêm Mới Mã Photo"},
    {"chucnang": "update_code_photo", "module": "Văn Phòng: Máy Photo & Ext", "action": "Cập Nhật Mã Photo"},
    {"chucnang": "view_ext_rsc", "module": "Văn Phòng: Máy Photo & Ext", "action": "Xem Ext RSC Văn Phòng"},
    {"chucnang": "insert_ext_rsc", "module": "Văn Phòng: Máy Photo & Ext", "action": "Thêm Mới Số Ext RSC"},
    {"chucnang": "update_ext_rsc", "module": "Văn Phòng: Máy Photo & Ext", "action": "Cập Nhật Số Ext RSC"},

    # === HOTLINE 3CX: TỔNG ĐÀI & CUỘC GỌI NHỠ ===
    {"chucnang": "hotline_3cx_duty", "module": "Hotline 3CX: Trực Cuộc Gọi & Nhỡ", "action": "Quyền Trực Hotline 3CX (Bật/tắt trực & xem cuộc gọi nhỡ)"},
]


def load_custom_permissions() -> List[Dict[str, str]]:
    """Load custom registered permissions from JSON storage"""
    if os.path.exists(CUSTOM_PERM_FILE):
        try:
            with open(CUSTOM_PERM_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_custom_permission(chucnang: str, module: str, action: str):
    """Save a newly created permission definition"""
    perms = load_custom_permissions()
    # Check duplicate
    for p in perms:
        if p["chucnang"] == chucnang:
            p["module"] = module
            p["action"] = action
            break
    else:
        perms.append({"chucnang": chucnang, "module": module, "action": action})

    os.makedirs(os.path.dirname(CUSTOM_PERM_FILE), exist_ok=True)
    with open(CUSTOM_PERM_FILE, "w", encoding="utf-8") as f:
        json.dump(perms, f, ensure_ascii=False, indent=2)


def get_all_permission_definitions(db: Optional[Session] = None) -> List[Dict[str, str]]:
    """
    Merge base definitions with dynamic custom definitions and 
    auto-discovered columns directly from SQL Server table dbo.RESTAURANT.
    """
    custom = load_custom_permissions()
    merged = list(BASE_PERMISSION_DEFINITIONS)
    existing_keys = {item["chucnang"] for item in merged}
    for c in custom:
        if c["chucnang"] not in existing_keys:
            merged.append(c)
            existing_keys.add(c["chucnang"])

    # Auto-discover any columns added to dbo.RESTAURANT in SQL Server
    if db is not None:
        try:
            db_cols = db.execute(text(
                "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_NAME = 'RESTAURANT' ORDER BY ORDINAL_POSITION"
            )).fetchall()

            for (raw_col,) in db_cols:
                col_name = str(raw_col).strip()
                col_lower = col_name.lower()

                # Skip system metadata or columns already mapped in BASE_PERMISSION_DEFINITIONS
                if col_lower in RECOGNIZED_DB_COLUMNS:
                    continue

                v_key = f"view_{col_lower}"
                u_key = f"update_{col_lower}"

                if v_key not in existing_keys:
                    merged.append({
                        "chucnang": v_key,
                        "module": "DS Nhà Hàng: Cột Mới Tự Động Từ DB",
                        "action": f"Xem Cột {col_name} ({col_lower})"
                    })
                    existing_keys.add(v_key)

                if u_key not in existing_keys:
                    merged.append({
                        "chucnang": u_key,
                        "module": "DS Nhà Hàng: Cột Mới Tự Động Từ DB",
                        "action": f"Cập nhật Cột {col_name}"
                    })
                    existing_keys.add(u_key)
        except Exception as err:
            logger.warning(f"Lỗi khi tự động quét cột từ SQL Server bảng RESTAURANT: {err}")

    return merged


def get_roles(db: Session) -> List[RoleItemResponse]:
    roles = db.scalars(select(RoleLevel).order_by(RoleLevel.id)).all()
    user_counts_raw = db.execute(
        select(User.quyen_mo_rong, func.count(User.id))
        .where(User.quyen_mo_rong.isnot(None))
        .group_by(User.quyen_mo_rong)
    ).all()
    user_count_map = {str(r[0]): r[1] for r in user_counts_raw if r[0]}

    result: List[RoleItemResponse] = []
    for r in roles:
        result.append(
            RoleItemResponse(
                id=r.id,
                tenquyen=r.tenquyen,
                noidung=r.noidung,
                active=bool(r.active),
                user_count=user_count_map.get(str(r.id), 0)
            )
        )
    return result


def get_role_by_id(db: Session, role_id: int) -> RoleItemResponse:
    role = db.get(RoleLevel, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhóm quyền.")

    user_count = db.scalar(
        select(func.count(User.id)).where(User.quyen_mo_rong == str(role_id))
    ) or 0

    return RoleItemResponse(
        id=role.id,
        tenquyen=role.tenquyen,
        noidung=role.noidung,
        active=bool(role.active),
        user_count=user_count
    )


def create_role(db: Session, data: RoleCreate, actor: str) -> RoleItemResponse:
    clean_name = data.tenquyen.strip().upper()

    existing = db.scalar(select(RoleLevel).where(func.upper(RoleLevel.tenquyen) == clean_name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Nhóm quyền '{clean_name}' đã tồn tại trong hệ thống."
        )

    new_role = RoleLevel(
        tenquyen=clean_name,
        noidung=data.noidung.strip() if data.noidung else None,
        active=data.active
    )
    db.add(new_role)
    db.flush()

    # Seed permissions in dbo.PHANQUYEN_DETAIL
    all_defs = get_all_permission_definitions(db)
    for def_item in all_defs:
        perm = PermissionDetail(
            id_quyen=str(new_role.id),
            chucnang=def_item["chucnang"],
            active=False
        )
        db.add(perm)

    log_content = f"Tên Quyền : {clean_name} - Nội Dung : {data.noidung} - Trạng thái : {data.active}"
    log_admin_action(db, "Admin_quyenmo_rong", "Insert_Nhomquyen_morong", actor, log_content)
    db.commit()
    db.refresh(new_role)

    return get_role_by_id(db, new_role.id)


def update_role(db: Session, role_id: int, data: RoleUpdate, actor: str) -> RoleItemResponse:
    role = db.get(RoleLevel, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhóm quyền.")

    # IMMUNITY: Do not allow deactivating Super Admin role
    if role_id == 1 or (role.tenquyen and role.tenquyen.strip().upper() == "ADMINISTRATOR"):
        if not data.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạm khóa hoặc vô hiệu hóa nhóm Administrator tối cao."
            )

    role.noidung = data.noidung.strip() if data.noidung else None
    role.active = data.active

    log_content = f"Tên Quyền : {role.tenquyen} - Nội Dung : {data.noidung} - Trạng thái : {data.active}"
    log_admin_action(db, "Admin_quyenmo_rong", "Update_Nhomquyen_morong", actor, log_content)
    db.commit()
    db.refresh(role)

    return get_role_by_id(db, role.id)


def get_role_permissions(db: Session, role_id: int) -> RoleWithPermissionsResponse:
    role = db.get(RoleLevel, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhóm quyền.")

    role_info = get_role_by_id(db, role_id)

    # Fetch existing permissions from dbo.PHANQUYEN_DETAIL
    details = db.scalars(
        select(PermissionDetail).where(PermissionDetail.id_quyen == str(role_id))
    ).all()
    details_map = {d.chucnang: (d.id, bool(d.active)) for d in details}

    all_defs = get_all_permission_definitions(db)
    map_module = {item["chucnang"]: item["module"] for item in all_defs}
    map_action = {item["chucnang"]: item["action"] for item in all_defs}

    seen_keys = set()
    permissions: List[PermissionDetailItem] = []

    # First add all known definitions
    for def_item in all_defs:
        chucnang = def_item["chucnang"]
        seen_keys.add(chucnang)
        if chucnang in details_map:
            perm_id, is_active = details_map[chucnang]
        else:
            perm_id = None
            is_active = False

        permissions.append(
            PermissionDetailItem(
                id=perm_id,
                chucnang=chucnang,
                active=is_active,
                module_group=def_item["module"],
                action_label=def_item["action"]
            )
        )

    # Also add any unexpected keys that exist in DB for this role
    for chucnang, (perm_id, is_active) in details_map.items():
        if chucnang not in seen_keys:
            permissions.append(
                PermissionDetailItem(
                    id=perm_id,
                    chucnang=chucnang,
                    active=is_active,
                    module_group="Cột Bổ Sung / Tùy Biến",
                    action_label=chucnang
                )
            )

    # For Administrator (Super Admin), always enforce full permissions (100% active)
    if role_id == 1 or (role.tenquyen and role.tenquyen.strip().upper() == "ADMINISTRATOR"):
        for p in permissions:
            p.active = True

    return RoleWithPermissionsResponse(role=role_info, permissions=permissions)


def update_role_permissions(
    db: Session,
    role_id: int,
    data: UpdateRolePermissionsRequest,
    actor: str
) -> RoleWithPermissionsResponse:
    role = db.get(RoleLevel, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy nhóm quyền.")

    # IMMUNITY: Do not allow modifying permissions of Super Admin (Administrator)
    if role_id == 1 or (role.tenquyen and role.tenquyen.strip().upper() == "ADMINISTRATOR"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nhóm Administrator là nhóm Quản trị được bảo vệ bất biến, không được phép thay đổi hoặc hạn chế phân quyền."
        )

    existing_details = db.scalars(
        select(PermissionDetail).where(PermissionDetail.id_quyen == str(role_id))
    ).all()
    existing_map = {d.chucnang: d for d in existing_details}

    for item in data.permissions:
        if item.chucnang in existing_map:
            existing_map[item.chucnang].active = item.active
        else:
            new_perm = PermissionDetail(
                id_quyen=str(role_id),
                chucnang=item.chucnang,
                active=item.active
            )
            db.add(new_perm)

    log_content = f"Update_Permissions: Quyền={role.tenquyen} (id={role_id})"
    log_admin_action(db, "Admin_quyenmo_rong", "Update_Permissions", actor, log_content)
    db.commit()

    return get_role_permissions(db, role_id)


def add_custom_column_permission(
    db: Session,
    payload: AddCustomPermissionRequest,
    actor: str
) -> PermissionDetailItem:
    """Add a new custom column or function permission across roles"""
    clean_chucnang = payload.chucnang.strip().lower()
    clean_module = payload.module_group.strip()
    clean_action = payload.action_label.strip()

    ALLOWED_DB_TYPES = {
        "NVARCHAR(255)", "NVARCHAR(500)", "NVARCHAR(MAX)",
        "VARCHAR(50)", "VARCHAR(100)", "VARCHAR(255)",
        "INT", "BIGINT", "DECIMAL(18,2)", "BIT", "DATE", "DATETIME"
    }

    # Optionally create physical column in SQL Server table dbo.RESTAURANT
    if payload.create_db_column:
        col_name = clean_chucnang
        if col_name.startswith("view_"):
            col_name = col_name[5:]
        elif col_name.startswith("update_"):
            col_name = col_name[7:]
        elif col_name.startswith("insert_"):
            col_name = col_name[7:]

        if not re.match(r'^[a-zA-Z0-9_]{1,64}$', col_name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã cột '{col_name}' không hợp lệ. Chỉ chấp nhận chữ cái, số và dấu gạch dưới (tối đa 64 ký tự)."
            )

        requested_type = (payload.db_data_type or "NVARCHAR(255)").strip().upper()
        safe_type = requested_type if requested_type in ALLOWED_DB_TYPES else "NVARCHAR(255)"

        try:
            col_exists = db.execute(text(
                "SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS "
                "WHERE TABLE_NAME = 'RESTAURANT' AND COLUMN_NAME = :c"
            ), {"c": col_name}).scalar()

            if not col_exists:
                db.execute(text(f"ALTER TABLE RESTAURANT ADD [{col_name}] {safe_type} NULL"))
                db.commit()
                log_admin_action(
                    db,
                    "Database_Schema",
                    "ALTER_TABLE_ADD_COLUMN",
                    actor,
                    f"Thêm cột [{col_name}] kiểu {safe_type} vào bảng dbo.RESTAURANT"
                )
                logger.info(f"Đã thêm cột [{col_name}] {safe_type} vào bảng RESTAURANT thành công.")
        except Exception as e:
            logger.error(f"Lỗi khi thực hiện ALTER TABLE RESTAURANT ADD [{col_name}]: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi khi tạo cột trong SQL Server: {str(e)}"
            )

    # Save to definition registry
    save_custom_permission(clean_chucnang, clean_module, clean_action)

    # Determine target roles
    if payload.target_role_id:
        role_ids = [str(payload.target_role_id)]
    else:
        all_roles = db.scalars(select(RoleLevel)).all()
        role_ids = [str(r.id) for r in all_roles]

    # Insert into dbo.PHANQUYEN_DETAIL for those roles if not present
    for rid in role_ids:
        exists = db.scalar(
            select(PermissionDetail).where(
                PermissionDetail.id_quyen == rid,
                PermissionDetail.chucnang == clean_chucnang
            )
        )
        if not exists:
            db.add(
                PermissionDetail(
                    id_quyen=rid,
                    chucnang=clean_chucnang,
                    active=False
                )
            )

    log_content = f"Add_Custom_Permission: Chức năng={clean_chucnang} - Module={clean_module} - Action={clean_action}"
    log_admin_action(db, "Admin_quyenmo_rong", "Add_Custom_Permission", actor, log_content)
    db.commit()

    return PermissionDetailItem(
        chucnang=clean_chucnang,
        active=False,
        module_group=clean_module,
        action_label=clean_action
    )
