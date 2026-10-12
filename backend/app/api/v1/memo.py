import os
import shutil
import logging
from typing import Optional, List
from datetime import datetime, date
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.core.database import get_db
from app.schemas.auth import UserInfo, MessageResponse
from app.services.auth_service import is_admin_user
from app.schemas.memo import (
    MemoItem,
    MemoCreate,
    MemoUpdate,
    MemoGiaHan,
    MemoStats,
    MemoListResponse,
    MemoReviewRequest,
    NextItSetupResponse,
    UploadImageResponse,
    RoundRobinConfigResponse,
    RoundRobinConfigUpdate,
    MemoTemplateDataResponse,
    MemoTemplateToUpdate,
    MemoTemplateBaseCcUpdate,
    MemoTemplateLinkUpdate,
    MemoTemplateBodyUpdate,
    MemoTemplateBrandUpsert,
    MemoTemplateSyncTextRequest,
)
from app.services.memo_service import (
    get_memo_stats,
    get_memo_list,
    get_memo_by_id,
    get_app_users,
    get_next_it_setup,
    get_round_robin_config,
    update_round_robin_config,
    create_memo,
    update_memo,
    review_memo,
    gia_han_memo,
    delete_memo,
    export_memo_excel,
    get_memo_template_data,
    update_memo_template_to,
    update_memo_template_base_cc,
    update_memo_template_link,
    update_memo_template_body,
    upsert_memo_template_brand,
    delete_memo_template_brand,
    sync_bm_from_excel,
    sync_bm_from_text,
    check_memo_code_exists,
)
from app.api.deps import get_current_user, require_admin
from app.services.log_service import LogService

router = APIRouter(prefix="/memo", tags=["App - Quản Lý Memo"])

UPLOAD_FILES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/memo/files"))
UPLOAD_IMAGES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads/memo/images"))

os.makedirs(UPLOAD_FILES_DIR, exist_ok=True)
os.makedirs(UPLOAD_IMAGES_DIR, exist_ok=True)


def verify_memo_read(user: UserInfo):
    roles = [r.lower() for r in (user.roles or [])]
    phanquyen = str(user.phanquyen or "").strip().lower()

    if getattr(user, "is_super_admin", False) or "admin" in roles or phanquyen in ["0", "1"]:
        return True
    if "app" in roles or phanquyen == "2":
        return True
    if "helpdesk" in roles or phanquyen == "3":
        return True
    if "inventory" in roles or "inv" in roles or phanquyen == "4":
        return True
    return True


def verify_memo_write(user: UserInfo):
    roles = [r.lower() for r in (user.roles or [])]
    phanquyen = str(user.phanquyen or "").strip().lower()

    if is_admin_user(user):
        return True
    if "app" in roles or "2" in roles or phanquyen in ["2", "app"] or "app" in phanquyen or "2" in phanquyen:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Chỉ nhóm IT Application hoặc Quản trị viên mới có quyền thêm/sửa/xóa Memo."
    )


def verify_admin(user: UserInfo):
    if is_admin_user(user):
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Chỉ Quản trị viên (Admin) mới có quyền cấu hình danh sách xoay vòng Memo."
    )


@router.get("", response_model=MemoListResponse)
def get_memos(
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm"),
    trangthai: Optional[str] = Query(None, description="Trạng thái (0, 1, 2, ALL)"),
    it_setup: Optional[str] = Query(None, description="Người phụ trách IT Setup"),
    giahan: Optional[str] = Query(None, description="Gia hạn (0, 1, ALL)"),
    tungay: Optional[date] = Query(None, description="Ngày bắt đầu từ"),
    denngay: Optional[date] = Query(None, description="Ngày kết thúc đến"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(50, ge=1, le=200, description="Kích thước trang"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Lấy danh sách Memo có phân trang, tìm kiếm và thống kê.
    """
    verify_memo_read(current_user)
    return get_memo_list(
        db=db,
        search=search,
        trangthai=trangthai,
        it_setup=it_setup,
        giahan=giahan,
        tungay=tungay,
        denngay=denngay,
        page=page,
        page_size=page_size,
    )


@router.get("/stats", response_model=MemoStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Lấy thống kê số lượng Memo theo trạng thái.
    """
    verify_memo_read(current_user)
    return get_memo_stats(db)


@router.get("/next-it-setup", response_model=NextItSetupResponse)
def get_next_it(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Thuật toán xoay vòng Round-Robin: Gợi ý username IT setup tiếp theo dựa trên Memo gần nhất.
    """
    verify_memo_read(current_user)
    return get_next_it_setup(db)


@router.get("/round-robin-config", response_model=RoundRobinConfigResponse)
def get_round_robin_configuration(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Lấy danh sách nhân sự IT App và trạng thái tham gia xoay vòng Memo.
    """
    verify_memo_read(current_user)
    return get_round_robin_config(db)


@router.put("/round-robin-config", response_model=RoundRobinConfigResponse)
def update_round_robin_configuration(
    payload: RoundRobinConfigUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Cập nhật danh sách nhân sự tham gia xoay vòng Memo. Chỉ Admin mới có quyền.
    """
    verify_admin(current_user)
    user_name = current_user.username or "admin"
    res = update_round_robin_config(db, payload, current_user=user_name)
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="MEMO",
            hanh_dong="UPDATE",
            noi_dung="Cập nhật danh sách nhân sự tham gia xoay vòng Memo (Round-Robin)",
            user_thuchien=user_name,
            current_user=current_user
        )
    except Exception as log_err:
        logger.warning(f"Lỗi ghi log xoay vòng memo: {log_err}")
    return res


@router.get("/app-users")
def get_users(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Lấy danh sách nhân sự IT App active để chọn trong dropdown.
    """
    verify_memo_read(current_user)
    return get_app_users(db)


@router.get("/export")
def export_memos(
    search: Optional[str] = Query(None),
    trangthai: Optional[str] = Query(None),
    it_setup: Optional[str] = Query(None),
    giahan: Optional[str] = Query(None),
    tungay: Optional[date] = Query(None),
    denngay: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Xuất file Excel danh sách Memo (.xlsx).
    """
    verify_memo_read(current_user)
    excel_stream = export_memo_excel(
        db=db,
        search=search,
        trangthai=trangthai,
        it_setup=it_setup,
        giahan=giahan,
        tungay=tungay,
        denngay=denngay,
    )

    filename = f"DANH_SACH_MEMO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------------------------------------------------------------------------
# Template Mẫu Gửi Mail Memo Endpoints
# ---------------------------------------------------------------------------

@router.get("/template/data", response_model=MemoTemplateDataResponse)
def get_memo_template_data_endpoint(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Lấy toàn bộ dữ liệu cấu hình Template Mẫu: TO, Base CC, link BM MKT, Email Body, và danh sách Brands.
    """
    verify_memo_read(current_user)
    try:
        return get_memo_template_data(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lấy dữ liệu Template: {str(e)}")


@router.put("/template/to")
def update_memo_template_to_endpoint(
    payload: MemoTemplateToUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Cập nhật danh sách email TO mặc định. (Admin)
    """
    verify_admin(current_user)
    try:
        val = update_memo_template_to(db, payload.to_emails)
        return {"status": "success", "to_emails": val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật TO: {str(e)}")


@router.put("/template/base-cc")
def update_memo_template_base_cc_endpoint(
    payload: MemoTemplateBaseCcUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Cập nhật danh sách Base CC mặc định. (Admin)
    """
    verify_admin(current_user)
    try:
        val = update_memo_template_base_cc(db, payload.base_cc_emails)
        return {"status": "success", "base_cc_emails": val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật Base CC: {str(e)}")


@router.put("/template/link")
def update_memo_template_link_endpoint(
    payload: MemoTemplateLinkUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Cập nhật link SharePoint BM MKT. (Admin)
    """
    verify_admin(current_user)
    try:
        val = update_memo_template_link(db, payload.mkt_link)
        return {"status": "success", "mkt_link": val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật Link MKT: {str(e)}")


@router.put("/template/body")
def update_memo_template_body_endpoint(
    payload: MemoTemplateBodyUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Cập nhật nội dung Email Body mẫu (Rich HTML). (Admin)
    """
    verify_admin(current_user)
    try:
        val = update_memo_template_body(db, payload.email_body)
        return {"status": "success", "email_body": val}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật Email Body: {str(e)}")


@router.post("/template/brand")
def upsert_memo_template_brand_endpoint(
    payload: MemoTemplateBrandUpsert,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Thêm hoặc cập nhật nhãn hàng và email BM. (Admin)
    """
    verify_admin(current_user)
    try:
        brand = upsert_memo_template_brand(
            db,
            brand_name=payload.brand_name,
            bm_emails=payload.bm_emails,
            active=payload.active if payload.active is not None else True,
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="MEMO",
                hanh_dong="UPDATE",
                noi_dung=f"Thêm/cập nhật cấu hình brand Memo: {payload.brand_name}",
                user_thuchien=current_user.username or "admin",
                current_user=current_user
            )
        except Exception as log_err:
            logger.warning(f"Lỗi ghi log brand: {log_err}")
        return {
            "status": "success",
            "brand": {
                "id": brand.id,
                "brand_name": brand.brand_name,
                "cc_emails": brand.cc_emails,
                "active": brand.active,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi lưu Brand: {str(e)}")


@router.delete("/template/brand/{brand_id}")
def delete_memo_template_brand_endpoint(
    brand_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Xóa nhãn hàng khỏi Template. (Admin)
    """
    verify_admin(current_user)
    try:
        success = delete_memo_template_brand(db, brand_id)
        if not success:
            raise HTTPException(status_code=404, detail="Không tìm thấy Brand để xóa.")
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="MEMO",
                hanh_dong="DELETE",
                noi_dung=f"Xóa brand Memo ID {brand_id}",
                user_thuchien=current_user.username or "admin",
                current_user=current_user
            )
        except Exception as log_err:
            logger.warning(f"Lỗi ghi log xóa brand: {log_err}")
        return {"status": "success", "message": "Đã xóa Brand thành công."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xóa Brand: {str(e)}")


@router.post("/template/sync-bm-excel")
async def sync_bm_excel_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Đồng bộ danh sách BM MKT bằng cách upload file Excel tải từ SharePoint. (Admin)
    """
    verify_admin(current_user)
    try:
        content = await file.read()
        res = sync_bm_from_excel(db, content)
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="MEMO",
                hanh_dong="SYNC",
                noi_dung=f"Đồng bộ danh sách BM MKT từ Excel ({file.filename})",
                user_thuchien=current_user.username or "admin",
                current_user=current_user
            )
        except Exception as log_err:
            logger.warning(f"Lỗi ghi log sync bm excel: {log_err}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ file Excel: {str(e)}")


@router.post("/template/sync-bm-text")
def sync_bm_text_endpoint(
    payload: MemoTemplateSyncTextRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Đồng bộ danh sách BM MKT bằng cách paste text/bảng copy từ SharePoint. (Admin)
    """
    verify_admin(current_user)
    try:
        res = sync_bm_from_text(db, payload.text)
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="MEMO",
                hanh_dong="SYNC",
                noi_dung="Đồng bộ danh sách BM MKT từ văn bản/bảng sao chép",
                user_thuchien=current_user.username or "admin",
                current_user=current_user
            )
        except Exception as log_err:
            logger.warning(f"Lỗi ghi log sync bm text: {log_err}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đồng bộ dữ liệu text: {str(e)}")


@router.get("/check-code")
def check_memo_code_endpoint(
    code: str = Query(..., min_length=1),
    exclude_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Kiểm tra nhanh xem Mã Memo đã tồn tại chưa (real-time khi nhập vào ô Mã Memo).
    """
    verify_memo_read(current_user)
    existing = check_memo_code_exists(db, code, exclude_id=exclude_id)
    if existing:
        return {
            "exists": True,
            "ma_memo": existing.ma_memo,
            "memo_id": existing.id,
            "it_setup": existing.it_setup,
            "subject_mail": existing.subject_mail,
            "ngay_tiepnhan": existing.ngay_tiepnhan.strftime("%Y-%m-%d") if existing.ngay_tiepnhan else None,
            "message": f"Mã Memo '{existing.ma_memo}' đã tồn tại (gán cho {existing.it_setup or 'chưa rõ'})!"
        }
    return {
        "exists": False,
        "message": "Mã Memo hợp lệ, chưa tồn tại."
    }


@router.get("/{id}", response_model=MemoItem)
def get_memo(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Lấy chi tiết một bản ghi Memo theo ID.
    """
    verify_memo_read(current_user)
    item = get_memo_by_id(db, id)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy Memo.")
    return MemoItem.model_validate(item)


@router.post("", response_model=MemoItem, status_code=status.HTTP_201_CREATED)
def create_new_memo(
    payload: MemoCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Tạo mới một Memo.
    """
    verify_memo_write(current_user)
    user_name = current_user.username or "system"
    try:
        item = create_memo(db, payload, current_user=user_name)
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="MEMO",
                hanh_dong="INSERT",
                noi_dung=f'Tạo mới Memo: Mã "{item.ma_memo}" (Tiêu đề: {item.subject_mail or ""}, IT: {item.it_setup or ""})',
                user_thuchien=user_name,
                current_user=current_user
            )
        except Exception as log_err:
            logger.warning(f"Lỗi ghi log tạo memo: {log_err}")
        return MemoItem.model_validate(item)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/{id}", response_model=MemoItem)
def update_existing_memo(
    id: int,
    payload: MemoUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Cập nhật thông tin Memo.
    """
    verify_memo_write(current_user)
    user_name = current_user.username or "system"
    item = update_memo(db, id, payload, current_user=user_name)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy Memo để cập nhật.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="MEMO",
            hanh_dong="UPDATE",
            noi_dung=f'Cập nhật Memo ID {id} (Mã: {item.ma_memo})',
            user_thuchien=user_name,
            current_user=current_user
        )
    except Exception as log_err:
        logger.warning(f"Lỗi ghi log cập nhật memo: {log_err}")
    return MemoItem.model_validate(item)


@router.post("/{id}/gia-han", response_model=MemoItem, status_code=status.HTTP_201_CREATED)
def extend_existing_memo(
    id: int,
    payload: MemoGiaHan,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Gia hạn Memo: Nhân bản Memo gốc thành một bản ghi mới với cờ giahan = '1'.
    """
    verify_memo_write(current_user)
    user_name = current_user.username or "system"
    item = gia_han_memo(db, id, payload, current_user=user_name)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy Memo gốc để gia hạn.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="MEMO",
            hanh_dong="INSERT",
            noi_dung=f'Gia hạn Memo ID {id} -> tạo Memo mới (Mã: {item.ma_memo})',
            user_thuchien=user_name,
            current_user=current_user
        )
    except Exception as log_err:
        logger.warning(f"Lỗi ghi log gia hạn memo: {log_err}")
    return MemoItem.model_validate(item)


@router.delete("/{id}", response_model=MessageResponse)
def remove_memo(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Xóa mềm Memo.
    """
    verify_memo_write(current_user)
    user_name = current_user.username or "system"
    ok = delete_memo(db, id, current_user=user_name)
    if not ok:
        raise HTTPException(status_code=404, detail="Không tìm thấy Memo để xóa.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="APP",
            man_hinh="MEMO",
            hanh_dong="DELETE",
            noi_dung=f"Xóa Memo ID {id}",
            user_thuchien=user_name,
            current_user=current_user
        )
    except Exception as log_err:
        logger.warning(f"Lỗi ghi log xóa memo: {log_err}")
    return MessageResponse(message="Xóa Memo thành công.")


@router.post("/upload-file")
async def upload_memo_file(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Tải lên file đính kèm Memo (Excel, PDF, Word...).
    """
    verify_memo_write(current_user)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_name = file.filename or "attachment"
    safe_name = f"{timestamp}_{original_name.replace(' ', '_')}"
    file_path = os.path.join(UPLOAD_FILES_DIR, safe_name)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "status": "ok",
        "filename": safe_name,
        "original_name": original_name,
    }


@router.post("/upload-image", response_model=UploadImageResponse)
async def upload_memo_image(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Tải lên hình ảnh chèn vào hướng dẫn setup (lưu vào folder uploads/memo/images/).
    """
    verify_memo_write(current_user)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_name = file.filename or "image.png"
    safe_name = f"memo_img_{timestamp}_{original_name.replace(' ', '_')}"
    image_path = os.path.join(UPLOAD_IMAGES_DIR, safe_name)

    with open(image_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return UploadImageResponse(
        status="ok",
        url=f"/uploads/memo/images/{safe_name}",
        filename=safe_name,
    )


@router.get("/images/{filename}")
def get_memo_image(filename: str):
    """
    Trả về file hình ảnh hướng dẫn setup (để hiển thị trực tiếp trong thẻ img).
    """
    image_path = os.path.join(UPLOAD_IMAGES_DIR, filename)
    if not os.path.exists(image_path):
        raise HTTPException(status_code=404, detail="Không tìm thấy hình ảnh.")

    mime_type = "image/png"
    ext = os.path.splitext(filename)[1].lower()
    if ext in [".jpg", ".jpeg"]:
        mime_type = "image/jpeg"
    elif ext == ".gif":
        mime_type = "image/gif"
    elif ext == ".webp":
        mime_type = "image/webp"

    return FileResponse(image_path, media_type=mime_type)


@router.get("/download-file/{filename}")
def download_file(
    filename: str,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Tải về file đính kèm của Memo.
    """
    verify_memo_read(current_user)
    file_path = os.path.join(UPLOAD_FILES_DIR, filename)
    if not os.path.exists(file_path):
        # Kiểm tra thêm trong static/luu_file_memo cũ nếu có
        legacy_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "../../../../IT_information_management/IT_information_management/static/luu_file_memo", filename)
        )
        if os.path.exists(legacy_path):
            file_path = legacy_path
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy file đính kèm trên hệ thống.")

    return FileResponse(
        file_path,
        filename=filename,
        media_type="application/octet-stream",
    )


@router.put("/{id}/review", response_model=MemoItem)
def review_memo_endpoint(
    id: int,
    payload: MemoReviewRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(require_admin)
):
    """
    Đánh giá Memo (OK / Fail / Reset) - Dành riêng cho Quản trị viên & Super Admin
    """
    try:
        reviewer_name = current_user.full_name or current_user.username
        res = review_memo(
            db,
            memo_id=id,
            review_status=payload.review_status,
            review_note=payload.review_note,
            username=reviewer_name
        )
        try:
            LogService.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="MEMO",
                hanh_dong="UPDATE",
                noi_dung=f"Đánh giá Memo ID {id}: {payload.review_status} (Ghi chú: {payload.review_note or 'Không'})",
                user_thuchien=reviewer_name,
                current_user=current_user
            )
        except Exception as log_err:
            logger.warning(f"Lỗi ghi log review memo: {log_err}")
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi đánh giá Memo: {str(e)}")


