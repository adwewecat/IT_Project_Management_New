from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.models.user import User, PermissionDetail, RoleLevel
from app.schemas.auth import UserInfo, TokenResponse, MessageResponse

# Default permission keys in the system
ALL_PERMISSIONS = [
    # View permissions
    "view_res", "view_sap", "view_coscenter", "view_rk7", "view_sap_old", "view_oracale", "view_don_gia",
    "view_address", "view_region", "view_brand", "view_sdt_nh", "view_email_nh",
    "view_ngay_khaitruong", "view_ip_lan", "view_ip", "view_ipwan",
    "view_teamview_pc", "view_teamview_pos11", "view_teamview_pos12",
    "view_rustdesk_pos11", "view_rustdesk_pos12",
    "view_sys", "view_ftth", "view_dk_truyenthong", "view_pass_mail",
    "view_code_photo", "view_ext_rsc", "view_note_nh", "view_test",
    # Insert permissions
    "insert_ipwan", "insert_sys", "insert_ftth", "insert_pass_mail",
    "insert_ext_rsc", "insert_code_photo",
    # Update permissions
    "update_res", "update_sap", "update_coscenter", "update_rk7", "update_sap_old", "update_oracale", "update_don_gia",
    "update_address", "update_region", "update_brand", "update_sdt_nh", "update_email_nh",
    "update_ngay_khaitruong", "update_ip_lan", "update_ip", "update_ipwan",
    "update_teamview_pc", "update_teamview_pos11", "update_teamview_pos12",
    "update_rustdesk_pos11", "update_rustdesk_pos12",
    "update_sys", "update_ftth", "update_dk_truyenthong", "update_pass_mail",
    "update_code_photo", "update_ext_rsc", "update_note_nh", "update_test",
    # Hotline 3CX permissions
    "hotline_3cx_duty", "view_hotline_3cx_duty", "update_hotline_3cx_duty",
    # Agent Multitask permissions
    "agent_multitask", "view_agent_multitask", "update_agent_multitask",
    # Màn Hình & Phân Hệ Mới permissions (Mặc định chỉ Admin, phân quyền khi cần)
    "remote_desktop_lab", "view_remote_desktop_lab", "update_remote_desktop_lab",
]

ROLE_MAP = {
    "admin": {"code": "admin", "id": "1", "name": "Quản trị viên (Admin)"},
    "administrator": {"code": "admin", "id": "1", "name": "Quản trị viên (Admin)"},
    "1": {"code": "admin", "id": "1", "name": "Quản trị viên (Admin)"},
    "0": {"code": "admin", "id": "1", "name": "Quản trị viên (Admin)"},

    "app": {"code": "app", "id": "2", "name": "IT Application"},
    "it application": {"code": "app", "id": "2", "name": "IT Application"},
    "it_application": {"code": "app", "id": "2", "name": "IT Application"},
    "2": {"code": "app", "id": "2", "name": "IT Application"},

    "helpdesk": {"code": "helpdesk", "id": "3", "name": "IT Helpdesk"},
    "it helpdesk": {"code": "helpdesk", "id": "3", "name": "IT Helpdesk"},
    "it_helpdesk": {"code": "helpdesk", "id": "3", "name": "IT Helpdesk"},
    "3": {"code": "helpdesk", "id": "3", "name": "IT Helpdesk"},

    "inventory": {"code": "inventory", "id": "inventory", "name": "Quyền Inventory"},
    "inv": {"code": "inventory", "id": "inventory", "name": "Quyền Inventory"},
    "4": {"code": "inventory", "id": "inventory", "name": "Quyền Inventory"},
}

ROLE_NAMES = {
    "1": "Quản trị viên (Admin)",
    "admin": "Quản trị viên (Admin)",
    "administrator": "Quản trị viên (Admin)",
    "2": "IT Application",
    "app": "IT Application",
    "it application": "IT Application",
    "3": "IT Helpdesk",
    "helpdesk": "IT Helpdesk",
    "it helpdesk": "IT Helpdesk",
    "inventory": "Quyền Inventory",
    "4": "Quyền Inventory",
}


def parse_user_roles(phanquyen: Optional[str]) -> Tuple[list, str]:
    """Parse comma-separated or single phanquyen into normalized codes and readable names."""
    if not phanquyen:
        return [], "Chưa phân nhóm"
    
    raw_parts = [p.strip().lower() for p in phanquyen.replace(";", ",").split(",") if p.strip()]
    if not raw_parts:
        return [], "Chưa phân nhóm"
    
    codes: list = []
    names: list = []

    for p in raw_parts:
        if p in ROLE_MAP:
            info = ROLE_MAP[p]
            if info["code"] not in codes:
                codes.append(info["code"])
                names.append(info["name"])
        else:
            if p not in codes:
                codes.append(p)
                names.append(f"Nhóm {p}")

    return codes, ", ".join(names) if names else phanquyen


def get_user_permissions(db: Session, phanquyen: Optional[str], quyen_mo_rong: Optional[str], username: Optional[str] = None) -> Dict[str, bool]:
    """Retrieve granular permissions based on role and quyen_mo_rong"""
    permissions: Dict[str, bool] = {key: False for key in ALL_PERMISSIONS}

    roles, _ = parse_user_roles(phanquyen)
    clean_u = (username or "").strip().lower()
    is_super = clean_u in ["admin", "administrator", "dung.nguyenanh"] or str(phanquyen or "").strip() == "0"

    # Super Admin gets all permissions
    if is_super:
        for key in permissions:
            permissions[key] = True
        return permissions

    # Admin thường (phanquyen 1 hoặc roles admin) có toàn bộ quyền xem/sửa thông tin nghiệp vụ nhà hàng
    if "admin" in roles or str(phanquyen or "").strip() == "1":
        for key in permissions:
            permissions[key] = True
        # Agent Multitask thì không mặc định cấp cho admin thường, mà phụ thuộc ma trận phân quyền hoặc allowed_users
        permissions["agent_multitask"] = False
        permissions["view_agent_multitask"] = False
        permissions["update_agent_multitask"] = False

    # Collect all role IDs associated with this user
    role_ids_to_check = set()
    if quyen_mo_rong and str(quyen_mo_rong).strip() not in ["0", ""]:
        role_ids_to_check.add(str(quyen_mo_rong).strip())

    # Also resolve from roles/phanquyen (e.g. 'app' -> '2', 'helpdesk' -> '3', etc.)
    for r in roles:
        r_clean = str(r).strip().lower()
        if r_clean in ROLE_MAP:
            role_ids_to_check.add(str(ROLE_MAP[r_clean]["id"]))
        elif r_clean.isdigit():
            role_ids_to_check.add(r_clean)

    if role_ids_to_check:
        stmt = select(PermissionDetail).where(
            PermissionDetail.id_quyen.in_(list(role_ids_to_check))
        )
        details = db.scalars(stmt).all()
        for d in details:
            permissions[d.chucnang] = bool(d.active)

    # Kiểm tra thêm trong allowed_users của Agent Multitask nếu có username
    if clean_u:
        try:
            from app.models.agent_multitask import AgentMultitaskConfig
            cfg = db.query(AgentMultitaskConfig).first()
            if cfg and cfg.allowed_users:
                allowed_list = [u.strip().lower() for u in cfg.allowed_users.split(",") if u.strip()]
                if clean_u in allowed_list:
                    permissions["agent_multitask"] = True
                    permissions["view_agent_multitask"] = True
                    permissions["update_agent_multitask"] = True
        except Exception:
            pass

    return permissions


def get_role_name(db: Session, phanquyen: Optional[str], quyen_mo_rong: Optional[str]) -> str:
    """Resolve human-readable role name"""
    _, base_name = parse_user_roles(phanquyen)

    if quyen_mo_rong and str(quyen_mo_rong) != "0":
        try:
            quyen_id = int(quyen_mo_rong)
            role_level = db.scalar(select(RoleLevel).where(RoleLevel.id == quyen_id))
            if role_level and role_level.tenquyen:
                return f"{base_name} - {role_level.tenquyen}"
        except (ValueError, TypeError):
            pass

    return base_name


def authenticate_user(db: Session, username: str, password: str) -> UserInfo:
    """Validate username and password, then return UserInfo object"""
    clean_username = username.strip().lower()

    # Legacy special accounts fallback - CHỈ DUY NHẤT TÀI KHOẢN NÀY LÀ SUPER ADMIN
    if clean_username == "admin" and password == "admin9528077":
        perms = {k: True for k in ALL_PERMISSIONS}
        return UserInfo(
            id=0,
            username="admin",
            full_name="Administrator",
            email="admin@ggg.com.vn",
            manv="ADMIN01",
            phanquyen="0",
            roles=["admin"],
            role_name="Quản trị viên (Admin)",
            quyen_mo_rong="0",
            is_super_admin=True,
            permissions=perms
        )

    # Query DB
    stmt = select(User).where(func.lower(User.user_name1) == clean_username)
    user = db.scalar(stmt)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác."
        )

    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản này đã bị khóa hoặc ngừng kích hoạt. Vui lòng liên hệ quản trị viên."
        )

    if not verify_password(password, user.pass_):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tên đăng nhập hoặc mật khẩu không chính xác."
        )

    permissions = get_user_permissions(db, user.phanquyen, user.quyen_mo_rong, user.user_name1)
    role_name = get_role_name(db, user.phanquyen, user.quyen_mo_rong)
    roles, _ = parse_user_roles(user.phanquyen)

    # All DB users (including phanquyen 1, 2, 3, 4) are NOT Super Admin. Super Admin is strictly admin/admin9528077
    is_super = (clean_username == "admin")

    return UserInfo(
        id=user.id,
        username=user.user_name1,
        full_name=user.full_name or user.user_name1,
        email=user.email,
        manv=user.manv,
        phanquyen=user.phanquyen,
        roles=roles,
        role_name=role_name,
        quyen_mo_rong=user.quyen_mo_rong,
        is_super_admin=is_super,
        permissions=permissions
    )


def is_super_admin_user(user_info: UserInfo) -> bool:
    """Check if the user has Super Admin privileges (user 'admin', 'dung.nguyenanh', is_super_admin=True, or phanquyen='0')"""
    if getattr(user_info, "is_super_admin", False):
        return True
    username = (user_info.username or "").lower().strip()
    if username in ["admin", "administrator", "dung.nguyenanh"]:
        return True
    if str(user_info.phanquyen or "").strip() == "0":
        return True
    roles = [str(r).lower().strip() for r in (getattr(user_info, "roles", None) or [])]
    if "superadmin" in roles or "super admin" in roles:
        return True
    return False


def is_admin_user(user_info: UserInfo) -> bool:
    """Check if the user has Admin privileges (SuperAdmin or admin role)"""
    if is_super_admin_user(user_info):
        return True
    if str(user_info.phanquyen or "").strip() in ["0", "1"]:
        return True
    roles = [str(r).lower().strip() for r in (getattr(user_info, "roles", None) or [])]
    if "admin" in roles or "1" in roles:
        return True
    if user_info.phanquyen:
        parts = [p.strip().lower() for p in str(user_info.phanquyen).split(",") if p.strip()]
        if "1" in parts or "admin" in parts:
            return True
    return False


def login(db: Session, username: str, password: str, remember_me: bool = False) -> TokenResponse:
    """Execute login and generate JWT token"""
    user_info = authenticate_user(db, username, password)

    # Token validity: 7 days if remember_me else from settings (24h)
    expire_minutes = 60 * 24 * 7 if remember_me else settings.ACCESS_TOKEN_EXPIRE_MINUTES
    expires_delta = timedelta(minutes=expire_minutes)

    token_data = {
        "sub": user_info.username,
        "user_id": user_info.id,
        "phanquyen": user_info.phanquyen,
        "quyen_mo_rong": user_info.quyen_mo_rong,
        "full_name": user_info.full_name
    }

    token = create_access_token(token_data, expires_delta=expires_delta)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=user_info
    )


def change_user_password(
    db: Session,
    username: str,
    current_password: str,
    new_password: str,
    confirm_password: Optional[str] = None
) -> MessageResponse:
    """Allow a logged-in user to change their own password."""
    clean_username = username.strip().lower()

    # Built-in hardcoded admin cannot be modified via UI
    if clean_username == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản quản trị viên hệ thống gốc (admin) không thể thay đổi mật khẩu qua giao diện này."
        )

    clean_new_pass = new_password.strip()
    if len(clean_new_pass) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có độ dài tối thiểu từ 4 ký tự."
        )

    if confirm_password is not None and clean_new_pass != confirm_password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu xác nhận không khớp với mật khẩu mới."
        )

    stmt = select(User).where(func.lower(User.user_name1) == clean_username)
    user = db.scalar(stmt)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản người dùng."
        )

    if not verify_password(current_password, user.pass_):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại."
        )

    if current_password == clean_new_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu hiện tại."
        )

    user.pass_ = clean_new_pass
    user.ngay_update = datetime.now()

    from app.services.user_service import log_admin_action
    log_content = f"User đổi mật khẩu: Tài khoản {user.user_name1}"
    log_admin_action(db, "User", "Change_Pass", user.user_name1, log_content)
    db.commit()

    return MessageResponse(
        success=True,
        message="Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới cho các lần đăng nhập tiếp theo."
    )
