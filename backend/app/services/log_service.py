from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.orm import Session

from app.models.logs_new import LogsNew
from app.schemas.auth import UserInfo
from app.services.auth_service import is_super_admin_user, is_admin_user
from app.schemas.logs import (
    LogItemResponse,
    LogGroupStats,
    LogListResponse,
    LogPurgeResponse
)

logger = logging.getLogger(__name__)

SUPER_ADMIN_USERNAMES = {"admin", "administrator", "dung.nguyenanh"}


def check_is_super_admin(username: Optional[str] = None, current_user: Optional[Any] = None) -> bool:
    """Kiểm tra nếu người dùng là Super Admin hoặc dung.nguyenanh (không ghi log theo yêu cầu của user)."""
    if username:
        u_raw = username.strip().lower()
        u_clean = u_raw.split("@")[0].strip()
        if (
            u_clean in SUPER_ADMIN_USERNAMES
            or "dung.nguyenanh" in u_clean
            or "dung.nguyenanh" in u_raw
            or "super" in u_clean
            or "supper" in u_clean
        ):
            return True

    if current_user is not None:
        if getattr(current_user, "is_super_admin", False):
            return True
        c_user = (getattr(current_user, "username", "") or "").strip().lower()
        c_clean = c_user.split("@")[0].strip()
        if (
            c_clean in SUPER_ADMIN_USERNAMES
            or "dung.nguyenanh" in c_clean
            or "dung.nguyenanh" in c_user
            or "super" in c_clean
            or "supper" in c_clean
        ):
            return True
        c_email = (getattr(current_user, "email", "") or "").strip().lower()
        if "dung.nguyenanh" in c_email:
            return True
        pq = str(getattr(current_user, "phanquyen", "") or "").strip().lower()
        if pq == "0":
            return True
        roles = [str(r).lower().strip() for r in (getattr(current_user, "roles", None) or [])]
        if "superadmin" in roles or "super admin" in roles:
            return True
        role_name = (getattr(current_user, "role_name", "") or "").lower()
        if "super" in role_name or "supper" in role_name:
            return True
    return False


def normalize_log_group(group: Optional[str]) -> str:
    """Chuẩn hóa nhóm log về 1 trong 4 nhóm: APP, INVENTORY, HELPDESK, QUAN_TRI."""
    if not group:
        return "APP"
    g = group.strip().upper()
    if g in ("APP", "APPLICATION", "MEMO", "PIM", "GPOS"):
        return "APP"
    if g in ("INV", "INVENTORY", "KHO", "VATTU", "NCC"):
        return "INVENTORY"
    if g in ("HELP", "HELPDESK", "HOTLINE", "SUPPORT", "NETWORK", "VPN"):
        return "HELPDESK"
    if g in ("ADMIN", "QUAN_TRI", "QUANTRI", "SYSTEM", "HE_THONG"):
        return "QUAN_TRI"
    return g


class LogService:
    @staticmethod
    def get_user_allowed_groups(current_user: UserInfo) -> Tuple[List[str], str]:
        """
        Xác định nhóm log mà user được phép xem:
        - Quản trị (Admin) và Super Admin: Xem được tất cả 4 nhóm ('ALL')
        - App (phanquyen = 2 hoặc app): Chỉ xem được nhóm 'APP'
        - Inventory (phanquyen = 4 hoặc inventory): Chỉ xem được nhóm 'INVENTORY'
        - Helpdesk (phanquyen = 3 hoặc helpdesk): Chỉ xem được nhóm 'HELPDESK'
        """
        is_super = is_super_admin_user(current_user)
        is_admin = is_admin_user(current_user)

        if is_super or is_admin:
            return (["APP", "INVENTORY", "HELPDESK", "QUAN_TRI"], "ALL")

        pq_raw = str(getattr(current_user, "phanquyen", "") or "").lower()
        roles_raw = [str(r).lower() for r in (getattr(current_user, "roles", None) or [])]
        all_privs = pq_raw.split(",") + roles_raw

        allowed: List[str] = []
        for p in all_privs:
            p_clean = p.strip()
            if p_clean in ("2", "app") and "APP" not in allowed:
                allowed.append("APP")
            elif p_clean in ("4", "inventory", "inv") and "INVENTORY" not in allowed:
                allowed.append("INVENTORY")
            elif p_clean in ("3", "helpdesk", "help") and "HELPDESK" not in allowed:
                allowed.append("HELPDESK")
            elif p_clean in ("1", "admin", "quantri") and "QUAN_TRI" not in allowed:
                allowed.append("QUAN_TRI")

        if not allowed:
            allowed = ["APP"]

        default_group = allowed[0]
        return (allowed, default_group)

    @classmethod
    def record_log(
        cls,
        db: Session,
        nhom_quyen: str,
        man_hinh: str,
        hanh_dong: str,
        noi_dung: Optional[str] = None,
        user_thuchien: Optional[str] = None,
        user_role: Optional[str] = None,
        ip_client: Optional[str] = None,
        status: str = "SUCCESS",
        du_lieu_cu: Optional[str] = None,
        du_lieu_moi: Optional[str] = None,
        current_user: Optional[Any] = None,
        mo_ta: Optional[str] = None,
        **kwargs: Any,
    ) -> Optional[LogsNew]:
        """
        Ghi log vào bảng LOGS__New:
        QUY TẮC CỦA USER: "nếu user là supper admin thao tác thì không lưu logs lại"
        Hỗ trợ linh hoạt cả noi_dung hoặc mo_ta, tự động suy ra user_thuchien từ current_user nếu thiếu.
        """
        if noi_dung is None and mo_ta is not None:
            noi_dung = mo_ta
        if not noi_dung:
            noi_dung = f"{hanh_dong} trên màn hình {man_hinh}"
        
        if not user_thuchien and current_user is not None:
            user_thuchien = getattr(current_user, "username", None) or getattr(current_user, "user_name1", None) or "SYSTEM"
        if not user_role and current_user is not None:
            user_role = getattr(current_user, "role_name", None)

        # 1. Bỏ qua ghi log nếu user là Super Admin
        if check_is_super_admin(username=user_thuchien, current_user=current_user):
            logger.debug(f"[LOGS__New] Bỏ qua ghi log vì user {user_thuchien} là Super Admin.")
            return None

        # 2. Chuẩn hóa nhóm quyền
        norm_group = normalize_log_group(nhom_quyen)

        try:
            entry = LogsNew(
                nhom_quyen=norm_group,
                man_hinh=man_hinh[:150] if man_hinh else "SYSTEM",
                hanh_dong=hanh_dong[:100] if hanh_dong else None,
                noi_dung=noi_dung,
                du_lieu_cu=du_lieu_cu,
                du_lieu_moi=du_lieu_moi,
                user_thuchien=user_thuchien[:100] if user_thuchien else "SYSTEM",
                user_role=user_role[:50] if user_role else None,
                ip_client=ip_client[:50] if ip_client else None,
                status=status[:30] if status else "SUCCESS",
                created_at=datetime.now(),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            return entry
        except Exception as e:
            db.rollback()
            logger.error(f"[LOGS__New] Lỗi khi ghi log thao tác ({man_hinh} - {hanh_dong}): {e}")
            return None

    @classmethod
    def get_logs(
        cls,
        db: Session,
        current_user: UserInfo,
        nhom_quyen: Optional[str] = None,
        man_hinh: Optional[str] = None,
        search: Optional[str] = None,
        user_thuchien: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> LogListResponse:
        """Truy vấn danh sách Logs tập trung có phân quyền và thống kê số lượng theo nhóm."""
        allowed_groups, default_group = cls.get_user_allowed_groups(current_user)

        # Quyết định nhóm quyền cần lọc
        target_group = nhom_quyen.strip().upper() if nhom_quyen else None
        if target_group in ("ALL", "TAT_CA", ""):
            target_group = None

        # Kiểm tra nếu user bị giới hạn quyền mà chọn nhóm không được phép
        if target_group and target_group not in allowed_groups:
            target_group = default_group

        # Base filter theo quyền của user
        conditions = []
        if target_group:
            conditions.append(LogsNew.nhom_quyen == target_group)
        else:
            # Nếu chọn "ALL" hoặc không chọn, chỉ lấy trong các nhóm user được phép
            conditions.append(LogsNew.nhom_quyen.in_(allowed_groups))

        # Filter màn hình
        if man_hinh and man_hinh.strip():
            conditions.append(LogsNew.man_hinh.ilike(f"%{man_hinh.strip()}%"))

        # Filter user
        if user_thuchien and user_thuchien.strip():
            conditions.append(LogsNew.user_thuchien.ilike(f"%{user_thuchien.strip()}%"))

        # Filter search (nội dung hoặc hành động hoặc màn hình)
        if search and search.strip():
            s = f"%{search.strip()}%"
            conditions.append(
                or_(
                    LogsNew.noi_dung.ilike(s),
                    LogsNew.man_hinh.ilike(s),
                    LogsNew.hanh_dong.ilike(s),
                    LogsNew.user_thuchien.ilike(s),
                )
            )

        # Filter ngày tháng
        if start_date and start_date.strip():
            try:
                sd = datetime.strptime(start_date.strip(), "%Y-%m-%d")
                conditions.append(LogsNew.created_at >= sd)
            except ValueError:
                pass

        if end_date and end_date.strip():
            try:
                ed = datetime.strptime(end_date.strip(), "%Y-%m-%d") + timedelta(days=1)
                conditions.append(LogsNew.created_at < ed)
            except ValueError:
                pass

        # YÊU CẦU CỦA USER: "chỉ load 2000 dòng logs gần nhất"
        MAX_LOAD_LIMIT = 2000

        # 1. Đếm tổng số bản ghi thỏa điều kiện (giới hạn tối đa 2000 dòng gần nhất)
        total_stmt = select(func.count(LogsNew.id)).where(and_(*conditions))
        raw_total = db.scalar(total_stmt) or 0
        total = min(raw_total, MAX_LOAD_LIMIT)

        # 2. Lấy dữ liệu phân trang (đảm bảo không vượt quá 2000)
        offset = max(0, (page - 1) * page_size)
        if offset >= MAX_LOAD_LIMIT:
            logs = []
        else:
            actual_limit = min(page_size, MAX_LOAD_LIMIT - offset)
            data_stmt = (
                select(LogsNew)
                .where(and_(*conditions))
                .order_by(LogsNew.created_at.desc(), LogsNew.id.desc())
                .offset(offset)
                .limit(actual_limit)
            )
            logs = db.scalars(data_stmt).all()

        # 3. Thống kê theo từng nhóm (trong phạm vi quyền của user)
        stats_stmt = (
            select(LogsNew.nhom_quyen, func.count(LogsNew.id))
            .where(LogsNew.nhom_quyen.in_(allowed_groups))
            .group_by(LogsNew.nhom_quyen)
        )
        group_counts = dict(db.execute(stats_stmt).all())

        stats = LogGroupStats(
            total_all=sum(group_counts.values()),
            total_app=group_counts.get("APP", 0),
            total_inventory=group_counts.get("INVENTORY", 0),
            total_helpdesk=group_counts.get("HELPDESK", 0),
            total_quan_tri=group_counts.get("QUAN_TRI", 0),
        )

        total_pages = max(1, (total + page_size - 1) // page_size)

        return LogListResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            items=[LogItemResponse.model_validate(it) for it in logs],
            stats=stats,
            user_allowed_groups=allowed_groups,
            default_group=default_group,
        )

    @classmethod
    def purge_old_logs(cls, db: Session, years: int = 3) -> int:
        """
        Dọn dẹp logs cũ hơn N năm (mặc định 3 năm) để tránh quá tải và phình to database.
        """
        threshold_date = datetime.now() - timedelta(days=years * 365)
        try:
            stmt = delete(LogsNew).where(LogsNew.created_at < threshold_date)
            result = db.execute(stmt)
            db.commit()
            deleted_count = result.rowcount
            logger.info(f"[LOGS__New] Đã dọn dẹp {deleted_count} logs cũ hơn {years} năm (< {threshold_date})")
            return deleted_count
        except Exception as e:
            db.rollback()
            logger.error(f"[LOGS__New] Lỗi dọn dẹp logs cũ: {e}")
            raise e


log_service = LogService()
