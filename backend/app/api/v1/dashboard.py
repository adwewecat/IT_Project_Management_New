from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.models.pim import PIMRequest, PIMUserThucHien
from app.models.memo import Memo
from app.models.setup_restaurant import ListSetupNhNew
from app.models.incident import Incident
from app.models.work_checklist import ChecklistRun
from app.models.user import User
from app.models.project import Project, ProjectMember

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _get_user_aliases(db: Session, username: str) -> List[str]:
    """
    Thu thập các định danh / tên viết tắt của user trong hệ thống
    (username, tên trong PIM_USER_THUCHIEN, tên họ đầy đủ, từ cuối trong tên)
    để lọc chính xác công việc được giao trong các bảng khác nhau.
    """
    aliases = [username.lower().strip()]
    user = db.query(User).filter(func.lower(User.user_name1) == username.lower().strip()).first()
    if user:
        if user.full_name:
            full = user.full_name.strip()
            aliases.append(full.lower())
            parts = full.split()
            if parts:
                aliases.append(parts[-1].lower())
        if user.email:
            email_prefix = user.email.split("@")[0].lower().strip()
            aliases.append(email_prefix)
            pu = db.query(PIMUserThucHien).filter(func.lower(PIMUserThucHien.email) == user.email.lower().strip()).first()
            if pu and pu.ten_user:
                aliases.append(pu.ten_user.strip().lower())
    return list(set([a for a in aliases if a]))


@router.get("/pending-summary")
def get_pending_tasks_summary(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Thống kê tổng hợp số lượng công việc còn chưa làm xong cho Quyền App và Quản trị:
    - Checklist test hệ thống
    - Memo
    - PIM
    - Setup NH mới
    - Báo cáo sự cố / sự vụ
    Trả về cả số lượng của cá nhân (my) và tổng số lượng toàn hệ thống (total).
    """
    username = current_user.username or ""
    roles = [r.lower() for r in (current_user.roles or [])]
    phanquyen = str(current_user.phanquyen or "").strip().lower()
    is_super_admin = bool(
        current_user.is_super_admin or
        username.lower() in ("admin", "administrator", "dung.nguyenanh") or
        phanquyen == "0"
    )
    is_admin = is_super_admin or "admin" in roles or phanquyen == "1"

    aliases = _get_user_aliases(db, username)

    # 1. PIM: Trạng thái thực hiện / SO / Gửi mail chưa xong
    pim_total, pim_my = 0, 0
    try:
        pim_base = or_(
            PIMRequest.trang_thai_thuc_hien != "hoàn thành",
            PIMRequest.trang_thai_thuc_hien.is_(None),
            PIMRequest.so != "hoàn thành",
            PIMRequest.so.is_(None),
            PIMRequest.gui_mail != "hoàn thành",
            PIMRequest.gui_mail.is_(None)
        )
        pim_total = db.query(PIMRequest.id).filter(pim_base).count()
        pim_my = db.query(PIMRequest.id).filter(
            and_(pim_base, or_(*[func.lower(PIMRequest.user_thuc_hien).like(f"%{a}%") for a in aliases]))
        ).count()
    except Exception as e:
        print(f"Lỗi pending PIM: {e}")

    # 2. Memo: Active và chưa public (trangthai != 2)
    memo_total, memo_my = 0, 0
    try:
        memo_base = and_(
            or_(Memo.active == True, Memo.active.is_(None)),
            Memo.trangthai != "2"
        )
        memo_total = db.query(Memo.id).filter(memo_base).count()
        memo_my = db.query(Memo.id).filter(
            and_(memo_base, or_(*[func.lower(Memo.it_setup).like(f"%{a}%") for a in aliases]))
        ).count()
    except Exception as e:
        print(f"Lỗi pending Memo: {e}")

    # 3. Setup NH mới: Active và chưa khai trương / chưa hoàn thành
    setup_total, setup_my = 0, 0
    try:
        setup_base = and_(
            or_(ListSetupNhNew.ACTIVE == True, ListSetupNhNew.ACTIVE.is_(None)),
            ListSetupNhNew.TRANGTHAI != "Đã Hoàn Thành",
            ListSetupNhNew.TRANGTHAI != "Đã Khai Trương"
        )
        setup_total = db.query(ListSetupNhNew.id).filter(setup_base).count()
        setup_my = db.query(ListSetupNhNew.id).filter(
            and_(setup_base, or_(*[func.lower(ListSetupNhNew.IT_PHUTRACH).like(f"%{a}%") for a in aliases]))
        ).count()
    except Exception as e:
        print(f"Lỗi pending Setup NH: {e}")

    # 4. Báo Cáo Sự Cố / Sự Vụ: Active và chưa giải quyết (RESOLVED_AT is None)
    inc_total, inc_my = 0, 0
    try:
        inc_base = and_(
            or_(Incident.ACTIVE == True, Incident.ACTIVE.is_(None)),
            or_(Incident.TRANGTHAI == False, Incident.TRANGTHAI.is_(None)),
            Incident.RESOLVED_AT.is_(None)
        )
        inc_total = db.query(Incident.id).filter(inc_base).count()
        inc_my = db.query(Incident.id).filter(
            and_(
                inc_base,
                or_(
                    *[func.lower(Incident.ASSIGNED_TO).like(f"%{a}%") for a in aliases] +
                    [func.lower(Incident.USER_INSERT).like(f"%{a}%") for a in aliases]
                )
            )
        ).count()
    except Exception as e:
        print(f"Lỗi pending Incident: {e}")

    # 5. Checklist Các Công Việc: Active và đang thực hiện (chưa hoàn thành)
    chk_total, chk_my = 0, 0
    try:
        chk_base = and_(
            ChecklistRun.active == True,
            ChecklistRun.trang_thai != "Hoàn thành"
        )
        chk_total = db.query(ChecklistRun.id).filter(chk_base).count()
        chk_my = db.query(ChecklistRun.id).filter(
            and_(chk_base, or_(*[func.lower(ChecklistRun.nguoi_thuc_hien).like(f"%{a}%") for a in aliases]))
        ).count()
    except Exception as e:
        print(f"Lỗi pending Checklist: {e}")

    # 6. Quản Lý Dự Án: Active và đang thực hiện (Status != 'completed')
    proj_total, proj_my = 0, 0
    try:
        from app.services.project_service import get_project_session_maker
        proj_session_maker = get_project_session_maker()
        with proj_session_maker() as proj_db:
            proj_base = and_(
                func.lower(func.trim(Project.Status)).not_in(["completed", "done", "hoàn thành", "đã hoàn thành"])
            )
            proj_total = proj_db.query(Project.ProjectID).filter(proj_base).count()
            proj_my = proj_db.query(Project.ProjectID).join(ProjectMember).filter(
                and_(
                    proj_base,
                    or_(*[func.lower(ProjectMember.MemberName).like(f"%{a}%") for a in aliases])
                )
            ).distinct().count()
    except Exception as e:
        print(f"Lỗi pending Projects: {e}")

    return {
        "is_admin": is_admin,
        "is_super_admin": is_super_admin,
        "username": username,
        "aliases": aliases,
        "items": {
            "checklist": {
                "key": "checklist",
                "title": "Checklist Các Công Việc",
                "my": chk_my,
                "total": chk_total,
                "badge": chk_my if not is_admin else (chk_my if chk_my > 0 else chk_total),
                "link": "/app/checklists",
                "unit": "đợt"
            },
            "memo": {
                "key": "memo",
                "title": "Quản Lý Memo",
                "my": memo_my,
                "total": memo_total,
                "badge": memo_my if not is_admin else (memo_my if memo_my > 0 else memo_total),
                "link": "/app/memo",
                "unit": "memo"
            },
            "pim": {
                "key": "pim",
                "title": "PIM",
                "my": pim_my,
                "total": pim_total,
                "badge": pim_my if not is_admin else (pim_my if pim_my > 0 else pim_total),
                "link": "/pim",
                "unit": "yêu cầu"
            },
            "projects": {
                "key": "projects",
                "title": "Quản Lý Dự Án",
                "my": proj_my,
                "total": proj_total,
                "badge": proj_total if is_admin else (proj_my if proj_my > 0 else proj_total),
                "link": "/app/projects",
                "unit": "dự án"
            },
            "setup_nh": {
                "key": "setup_nh",
                "title": "Setup NH Mới",
                "my": setup_my,
                "total": setup_total,
                "badge": setup_my if not is_admin else (setup_my if setup_my > 0 else setup_total),
                "link": "/app/setup-restaurants",
                "unit": "nhà hàng"
            },
            "incidents": {
                "key": "incidents",
                "title": "Báo Cáo Sự Cố",
                "my": inc_my,
                "total": inc_total,
                "badge": inc_my if not is_admin else (inc_my if inc_my > 0 else inc_total),
                "link": "/app/incidents",
                "unit": "sự vụ"
            }
        }
    }
