import os
import shutil
import uuid
import urllib.parse
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_admin, require_super_admin
from app.schemas.auth import UserInfo
from app.services.auth_service import is_admin_user
from app.schemas.pim import (
    PIMRequestOut,
    PIMStatusUpdate,
    PIMAssignUpdate,
    PIMUserOut,
    PIMUserCreate,
    PIMUserUpdate,
    PIMLogOut,
    PIMSyncResponse,
    PIMConfigOut,
    PIMConfigUpdate,
    PIMTestLoginResponse,
    PIMScheduleOut,
    PIMScheduleUpdate
)
from app.services import pim_service
from app.services.log_service import LogService

router = APIRouter(prefix="/pim", tags=["PIM Management"])


def require_app_or_admin(current_user: UserInfo = Depends(get_current_user)) -> UserInfo:
    if is_admin_user(current_user):
        return current_user
    user_roles = [r.lower() for r in current_user.roles]
    if "app" in user_roles or "2" in user_roles or current_user.phanquyen in ["2", "app"]:
        return current_user
    raise HTTPException(
        status_code=403,
        detail="Chức năng này chỉ dành cho nhóm quyền IT APP hoặc Quản trị viên."
    )


@router.get("/pending", response_model=List[PIMRequestOut])
def get_pending_pim_requests(
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    user_thuc_hien: Optional[str] = Query(None, description="Lọc theo User thực hiện"),
    search: Optional[str] = Query(None, description="Tìm kiếm nhanh ID, Chuỗi, Mô tả"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lấy danh sách PIM chưa hoàn thành"""
    return pim_service.get_pending_requests(
        db, from_date=from_date, to_date=to_date, user_thuc_hien=user_thuc_hien, search=search
    )


@router.get("/completed", response_model=List[PIMRequestOut])
def get_completed_pim_requests(
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    user_thuc_hien: Optional[str] = Query(None, description="Lọc theo User thực hiện"),
    user_update: Optional[str] = Query(None, description="Lọc theo User cập nhật"),
    search: Optional[str] = Query(None, description="Tìm kiếm nhanh"),
    limit: int = Query(100, description="Giới hạn số dòng trả về"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lấy danh sách PIM đã hoàn thành (mặc định 100 dòng mới nhất)"""
    return pim_service.get_completed_requests(
        db, from_date=from_date, to_date=to_date, user_thuc_hien=user_thuc_hien,
        user_update=user_update, search=search, limit=limit
    )


@router.get("/logs", response_model=List[PIMLogOut])
def get_pim_logs(
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    user_thuc_hien: Optional[str] = Query(None, description="User thực hiện thao tác"),
    search: Optional[str] = Query(None, description="Tìm kiếm nhanh ID, hành động, nội dung"),
    limit: int = Query(50, description="Giới hạn số dòng trả về"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lấy danh sách nhật ký thao tác PIM (mặc định 50 dòng gần nhất)"""
    return pim_service.get_pim_logs(
        db, from_date=from_date, to_date=to_date, user_thuc_hien=user_thuc_hien, search=search, limit=limit
    )


@router.post("/sync", response_model=PIMSyncResponse)
def trigger_pim_sync(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Kích hoạt quét và đồng bộ dữ liệu từ PIM"""
    try:
        res = pim_service.sync_all_pim_data(db)
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="PIM",
            hanh_dong="SYNC",
            mo_ta="Kích hoạt đồng bộ dữ liệu PIM thủ công",
            current_user=current_user
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export/excel")
def export_pim_excel(
    tab: Optional[str] = Query("all", description="Loại danh sách: pending, completed, all"),
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)"),
    user_thuc_hien: Optional[str] = Query(None, description="Lọc theo người thực hiện"),
    user_update: Optional[str] = Query(None, description="Lọc theo người cập nhật"),
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm"),
    trang_thai_thuc_hien: Optional[str] = Query(None, description="Lọc theo trạng thái thực hiện"),
    so: Optional[str] = Query(None, description="Lọc theo trạng thái SO"),
    gui_mail: Optional[str] = Query(None, description="Lọc theo trạng thái gửi mail"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Xuất danh sách PIM ra file Excel theo bộ lọc"""
    try:
        stream = pim_service.export_pim_excel(
            db=db,
            tab=tab,
            from_date=from_date,
            to_date=to_date,
            user_thuc_hien=user_thuc_hien,
            user_update=user_update,
            search=search,
            trang_thai_thuc_hien=trang_thai_thuc_hien,
            so=so,
            gui_mail=gui_mail
        )
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        tab_suffix = "Chua_Hoan_Thanh" if tab == "pending" else ("Da_Hoan_Thanh" if tab == "completed" else "Tat_Ca")
        filename = f"Danh_Sach_PIM_{tab_suffix}_{timestamp}.xlsx"
        quoted_filename = urllib.parse.quote(filename)

        return StreamingResponse(
            stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xuất file Excel: {str(e)}")


@router.put("/{pim_id}/status", response_model=PIMRequestOut)
def update_pim_status(
    pim_id: int,
    status_update: PIMStatusUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Cập nhật trạng thái hoàn thành / SO của yêu cầu"""
    try:
        res = pim_service.update_request_status(
            db, pim_id=pim_id, status_update=status_update, current_username=current_user.username
        )
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="PIM",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật trạng thái yêu cầu PIM #{pim_id}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật trạng thái: {str(e)}")


@router.put("/{pim_id}/assign", response_model=PIMRequestOut)
def assign_pim_user(
    pim_id: int,
    assign_update: PIMAssignUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """Admin điều chuyển người thực hiện yêu cầu"""
    try:
        res = pim_service.assign_request_user(
            db, pim_id=pim_id, assign_update=assign_update, current_username=current_user.username
        )
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="PIM",
            hanh_dong="UPDATE",
            mo_ta=f"Điều chuyển yêu cầu PIM #{pim_id} cho {assign_update.user_thuc_hien}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi điều chuyển: {str(e)}")


@router.get("/users", response_model=List[PIMUserOut])
def get_round_robin_users(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """Lấy danh sách nhân sự xoay vòng PIM"""
    return pim_service.get_round_robin_users(db)


@router.post("/users", response_model=PIMUserOut)
def create_round_robin_user(
    user_in: PIMUserCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """Admin thêm nhân sự vào danh sách xoay vòng"""
    try:
        res = pim_service.create_round_robin_user(db, user_in=user_in, current_username=current_user.username)
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="PIM",
            hanh_dong="INSERT",
            mo_ta=f"Thêm nhân sự xoay vòng PIM: {user_in.username}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi thêm nhân sự: {str(e)}")


@router.put("/users/{user_id}", response_model=PIMUserOut)
def update_round_robin_user(
    user_id: int,
    user_update: PIMUserUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """Admin cập nhật thứ tự hoặc bật/tắt nhân sự xoay vòng"""
    try:
        res = pim_service.update_round_robin_user(
            db, user_id=user_id, user_update=user_update, current_username=current_user.username
        )
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="PIM",
            hanh_dong="UPDATE",
            mo_ta=f"Cập nhật nhân sự xoay vòng PIM ID {user_id}",
            current_user=current_user
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật nhân sự: {str(e)}")


@router.delete("/users/{user_id}")
def delete_round_robin_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """Admin xóa nhân sự khỏi danh sách xoay vòng"""
    try:
        pim_service.delete_round_robin_user(db, user_id=user_id, current_username=current_user.username)
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="PIM",
            hanh_dong="DELETE",
            mo_ta=f"Xóa nhân sự xoay vòng PIM ID {user_id}",
            current_user=current_user
        )
        return {"success": True, "message": "Xóa nhân sự thành công!"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa nhân sự: {str(e)}")


@router.get("/config", response_model=PIMConfigOut)
def get_pim_configuration(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin)
):
    """Lấy thông tin cấu hình tài khoản đăng nhập SSO / PIM"""
    return pim_service.get_pim_config(db)


@router.put("/config", response_model=PIMConfigOut)
def update_pim_configuration(
    config_in: PIMConfigUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_super_admin)
):
    """Cập nhật thông tin tài khoản đăng nhập SSO / PIM"""
    try:
        res = pim_service.update_pim_config(db, config_in=config_in, current_username=current_user.username)
        try:
            LogService.record_log(
                db=db, nhom_quyen="APP", man_hinh="PIM_CONFIG", hanh_dong="UPDATE",
                noi_dung=f"Cập nhật cấu hình SSO PIM (User: {config_in.sso_username})",
                user_thuchien=current_user.username, current_user=current_user
            )
        except Exception: pass
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật cấu hình: {str(e)}")


@router.post("/config/test", response_model=PIMTestLoginResponse)
def test_pim_credentials(
    config_in: PIMConfigUpdate,
    current_user: UserInfo = Depends(require_super_admin)
):
    """Kiểm tra đăng nhập thử nghiệm SSO / PIM"""
    return pim_service.test_pim_login(sso_username=config_in.sso_username, sso_password=config_in.sso_password)


@router.get("/schedule", response_model=PIMScheduleOut)
def get_pim_schedule(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """Quản trị viên xem cấu hình lịch quét PIM tự động (3 lần/ngày)"""
    return pim_service.get_pim_schedule(db)


@router.put("/schedule", response_model=PIMScheduleOut)
def update_pim_schedule(
    sched_in: PIMScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """Quản trị viên cập nhật cấu hình lịch quét PIM tự động (3 lần/ngày)"""
    try:
        res = pim_service.update_pim_schedule(db, sched_in=sched_in, current_username=current_user.username)
        try:
            LogService.record_log(
                db=db, nhom_quyen="APP", man_hinh="PIM_SCHEDULE", hanh_dong="UPDATE",
                noi_dung=f"Cập nhật lịch quét PIM tự động (Active: {sched_in.is_active}, Ca: {sched_in.time_slot_1}, {sched_in.time_slot_2}, {sched_in.time_slot_3})",
                user_thuchien=current_user.username, current_user=current_user
            )
        except Exception: pass
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


UPLOAD_PIM_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/pim/images"))
os.makedirs(UPLOAD_PIM_IMAGES_DIR, exist_ok=True)


@router.post("/upload-setup-images")
async def upload_pim_setup_images(
    files: List[UploadFile] = File(...),
    current_user: UserInfo = Depends(require_app_or_admin)
):
    """
    Tải lên hình ảnh chụp file Excel setup món PIM (lưu vào uploads/pim/images/).
    Hỗ trợ tải lên 1 hoặc nhiều ảnh cùng lúc, hoặc paste từ clipboard.
    """
    uploaded_urls: List[str] = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    for file in files:
        orig = file.filename or "setup.png"
        ext = os.path.splitext(orig)[1].lower()
        if not ext or ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]:
            ext = ".png"
        uid = uuid.uuid4().hex[:8]
        safe_name = f"pim_setup_{timestamp}_{uid}{ext}"
        target_path = os.path.join(UPLOAD_PIM_IMAGES_DIR, safe_name)
        with open(target_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        uploaded_urls.append(f"/uploads/pim/images/{safe_name}")

    return {"urls": uploaded_urls}


