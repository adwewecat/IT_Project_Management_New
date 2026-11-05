from __future__ import annotations
import logging
from typing import Optional, List
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, require_app_or_admin
from app.schemas.auth import UserInfo
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import Response, StreamingResponse
from app.schemas.sso_management import (
    SSOConfigRequest,
    SSOConfigResponse,
    SSOTestLoginResponse,
    SSOSearchUserRequest,
    SSOSearchUserResponse,
    IAMUserItem,
    SSOChangePasswordRequest,
    SSOChangePasswordResponse,
    SSOAssignClientsRequest,
    SSOAssignClientsResponse,
    SSOCreateNCCUserRequest,
    SSOCreateNCCUserResponse,
    SSOBulkRowItem,
    SSOBulkParseResponse,
    SSOBulkProcessItemRequest,
    SSOBulkProcessItemResponse,
)
from app.services.sso_management_service import (
    get_user_sso_config,
    save_user_sso_config,
    test_sso_credentials,
    search_iam_users,
    change_iam_user_password,
    assign_default_clients_to_user,
    create_iam_ncc_user,
    generate_sso_bulk_template,
    parse_sso_excel_file,
    process_bulk_sso_item,
)
from app.services.log_service import log_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sso", tags=["SSO Management"])


@router.get("/config", response_model=SSOConfigResponse)
def get_current_user_sso_config(
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """Lấy trạng thái cấu hình SSO riêng của user đang đăng nhập."""
    try:
        cfg = get_user_sso_config(db, current_user.username)
        if not cfg:
            return SSOConfigResponse(
                configured=False,
                message="Chưa cấu hình tài khoản SSO cho tài khoản đăng nhập hiện tại.",
            )

        return SSOConfigResponse(
            configured=True,
            sso_username=cfg.sso_username,
            last_status=cfg.last_status,
            last_tested_at=cfg.last_tested_at,
            message="Đã lưu cấu hình tài khoản SSO.",
        )
    except Exception as e:
        logger.error(f"Lỗi truy vấn cấu hình SSO của user '{current_user.username}': {e}", exc_info=True)
        return SSOConfigResponse(
            configured=False,
            message=f"Chưa thể tải cấu hình SSO (Lỗi DB: {e}). Vui lòng kiểm tra bảng dbo.USER_SSO_CONFIG.",
        )


@router.post("/config", response_model=SSOConfigResponse)
def save_and_test_config(
    req: SSOConfigRequest,
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """Lưu và kiểm tra đăng nhập tài khoản SSO riêng của user hiện tại."""
    if not req.sso_username.strip() or not req.sso_password.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập và mật khẩu SSO không được để trống.",
        )

    try:
        ok, msg, cfg = save_user_sso_config(
            db, current_user.username, req.sso_username, req.sso_password
        )
    except Exception as e:
        logger.error(f"Lỗi khi lưu cấu hình SSO cho user '{current_user.username}': {e}", exc_info=True)
        err_str = str(e)
        if "USER_SSO_CONFIG" in err_str or "Invalid object name" in err_str:
            detail_msg = "Cơ sở dữ liệu chưa có bảng 'dbo.USER_SSO_CONFIG'. Vui lòng chạy file script 'setup_table_user_sso_config.sql' trên SQL Server hoặc khởi động lại backend."
        else:
            detail_msg = f"Lỗi máy chủ khi lưu cấu hình SSO: {err_str}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail_msg,
        )

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cấu hình đã được lưu nhưng đăng nhập SSO thất bại: {msg}",
        )

    log_service.record_log(
        db=db,
        nhom_quyen="APP",
        man_hinh="SSO_MANAGEMENT",
        hanh_dong="CONFIG_SSO",
        noi_dung=f"Cấu hình và lưu tài khoản SSO '{req.sso_username}'",
        user_thuchien=current_user.username,
        current_user=current_user,
    )

    return SSOConfigResponse(
        configured=True,
        sso_username=cfg.sso_username,
        last_status=cfg.last_status,
        last_tested_at=cfg.last_tested_at,
        message=f"Lưu tài khoản SSO và đăng nhập thành công: {msg}",
    )


@router.post("/test-login", response_model=SSOTestLoginResponse)
def test_saved_sso_login(
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """Kiểm tra lại kết nối đăng nhập của tài khoản SSO đã lưu."""
    try:
        cfg = get_user_sso_config(db, current_user.username)
    except Exception as e:
        logger.error(f"Lỗi kiểm tra SSO login: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi kết nối cơ sở dữ liệu: {e}",
        )

    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn chưa cấu hình tài khoản SSO. Vui lòng cấu hình tài khoản trước.",
        )

    ok, msg = test_sso_credentials(cfg.sso_username, cfg.sso_password)
    cfg.last_status = "SUCCESS" if ok else "FAILED"
    db.commit()

    return SSOTestLoginResponse(
        success=ok,
        message=msg,
        sso_username=cfg.sso_username,
    )


@router.post("/search-users", response_model=SSOSearchUserResponse)
async def search_users(
    req: SSOSearchUserRequest,
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """Tìm kiếm danh sách User trên IAM bằng tài khoản SSO của user hiện tại."""
    cfg = get_user_sso_config(db, current_user.username)
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn chưa cấu hình tài khoản SSO. Vui lòng vào cấu hình tài khoản trước khi tìm kiếm.",
        )

    query = req.search.strip()
    if not query:
        return SSOSearchUserResponse(
            success=True,
            message="Từ khóa tìm kiếm rỗng.",
            items=[],
            total=0,
        )

    try:
        items, has_more = await search_iam_users(
            current_user.username, cfg.sso_username, cfg.sso_password, query
        )
        if has_more:
            msg = "Danh sách kết quả nhiều hơn 10 tài khoản nên hệ thống chỉ hiển thị 10 user đầu tiên. Vui lòng nhập thêm thông tin để tìm kiếm chính xác."
        elif items:
            msg = f"Tìm thấy {len(items)} tài khoản người dùng."
        else:
            msg = "Không tìm thấy user nào khớp với từ khóa tìm kiếm."

        return SSOSearchUserResponse(
            success=True,
            message=msg,
            items=items,
            total=len(items),
            has_more=has_more,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi tìm kiếm IAM users: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi tìm kiếm trên IAM: {e}",
        )


@router.post("/change-password", response_model=SSOChangePasswordResponse)
async def change_password(
    req: SSOChangePasswordRequest,
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """
    Đổi mật khẩu cho user được chọn:
    - Xóa Access Failed Count về 0.
    - Xóa Lockout End.
    - Nhấn Save User.
    - Nếu User Type là 1 (AD/LDAP) thì dừng và báo liên hệ Helpdesk.
    - Nếu là 0 hoặc 2 thì tạo pass ngẫu nhiên đạt chuẩn và đổi pass.
    """
    cfg = get_user_sso_config(db, current_user.username)
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn chưa cấu hình tài khoản SSO. Vui lòng cấu hình tài khoản trước.",
        )

    if not req.user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã định danh user (user_id) không được để trống.",
        )

    try:
        res = await change_iam_user_password(
            current_user.username,
            cfg.sso_username,
            cfg.sso_password,
            req.user_id.strip(),
            req.custom_password,
        )

        if res.get("success"):
            log_service.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="SSO_MANAGEMENT",
                hanh_dong="CHANGE_PASSWORD",
                noi_dung=f"Đổi mật khẩu thành công cho user IAM '{res.get('user_name')}' (User ID: {req.user_id.strip()})",
                user_thuchien=current_user.username,
                current_user=current_user,
            )

        return SSOChangePasswordResponse(
            success=res.get("success", False),
            message=res.get("message", ""),
            new_password=res.get("new_password"),
            is_ldap=res.get("is_ldap", False),
            user_name=res.get("user_name"),
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi đổi mật khẩu IAM user: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thực hiện đổi mật khẩu: {e}",
        )


@router.post("/assign-default-clients", response_model=SSOAssignClientsResponse)
async def assign_default_clients(
    req: SSOAssignClientsRequest,
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """Phân quyền client cho user được chọn trên IAM."""
    cfg = get_user_sso_config(db, current_user.username)
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn chưa cấu hình tài khoản SSO. Vui lòng cấu hình tài khoản trước.",
        )

    if not req.user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã định danh user (user_id) không được để trống.",
        )

    try:
        res = await assign_default_clients_to_user(
            current_user.username,
            cfg.sso_username,
            cfg.sso_password,
            req.user_id.strip(),
            client_names=req.client_names,
        )

        if res.get("success"):
            assigned = res.get("assigned_clients", [])
            log_service.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="SSO_MANAGEMENT",
                hanh_dong="ASSIGN_CLIENTS",
                noi_dung=f"Phân quyền {res.get('total_assigned', 0)} clients cho user IAM ID '{req.user_id.strip()}': {', '.join(assigned[:5])}{'...' if len(assigned) > 5 else ''}",
                user_thuchien=current_user.username,
                current_user=current_user,
            )

        return SSOAssignClientsResponse(
            success=res.get("success", False),
            message=res.get("message", ""),
            assigned_clients=res.get("assigned_clients", []),
            total_assigned=res.get("total_assigned", 0),
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi phân quyền client: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi phân quyền clients: {e}",
        )


@router.post("/create-ncc-user", response_model=SSOCreateNCCUserResponse)
async def create_ncc_user_endpoint(
    req: SSOCreateNCCUserRequest,
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """
    Tạo mới tài khoản NCC trên IAM và phân 4 quyền client mặc định:
    1. Kiểm tra SĐT có trùng trên IAM (nếu trùng báo về client hoặc tự động tăng số khả dụng nếu auto_resolve_phone=True).
    2. Đăng nhập SSO và bấm Add User.
    3. Điền User Name, Email, Phone Number, User Type=0, Access Failed Count=0.
    4. Save User.
    5. Vào User & Clients và gán 4 quyền mặc định (hoặc client_names).
    """
    cfg = get_user_sso_config(db, current_user.username)
    if not cfg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn chưa cấu hình tài khoản SSO. Vui lòng cấu hình tài khoản trước khi thực hiện.",
        )

    if not req.user_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập (User Name) không được để trống.",
        )

    if not req.email.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email không được để trống.",
        )

    if not req.phone_number.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại không được để trống.",
        )

    try:
        res = await create_iam_ncc_user(
            system_username=current_user.username,
            sso_user=cfg.sso_username,
            sso_pass=cfg.sso_password,
            user_name=req.user_name.strip(),
            email=req.email.strip(),
            phone_number=req.phone_number.strip(),
            auto_resolve_phone=req.auto_resolve_phone,
            client_names=req.client_names,
        )

        if res.get("success"):
            log_service.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="SSO_MANAGEMENT",
                hanh_dong="CREATE_NCC_USER",
                noi_dung=f"Tạo thành công User NCC '{res.get('user_name')}' (Email: {res.get('email')}, SĐT: {res.get('phone_number')}) và phân quyền client",
                user_thuchien=current_user.username,
                current_user=current_user,
            )

        return SSOCreateNCCUserResponse(
            success=res.get("success", False),
            message=res.get("message", ""),
            user_name=res.get("user_name"),
            email=res.get("email"),
            phone_number=res.get("phone_number"),
            user_id=res.get("user_id"),
            new_password=res.get("new_password"),
            assigned_clients=res.get("assigned_clients", []),
            is_duplicate_phone=res.get("is_duplicate_phone", False),
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Lỗi tạo user NCC trên IAM: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo user NCC trên IAM: {e}",
        )




@router.get("/bulk-template")
def download_bulk_template(
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Tải file Excel mẫu chuẩn 7 cột cho tác vụ Import Xử Lý Hàng Loạt."""
    try:
        content = generate_sso_bulk_template()
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=Mau_Import_SSO_IAM.xlsx"},
        )
    except Exception as e:
        logger.error(f"Lỗi tạo template Excel SSO: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tạo file Excel mẫu: {e}",
        )


@router.post("/parse-excel", response_model=SSOBulkParseResponse)
async def parse_excel(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(require_app_or_admin),
):
    """Tải lên file Excel và phân tích danh sách user để xem trước (preview)."""
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File tải lên bắt buộc phải có định dạng Excel (.xlsx hoặc .xls).",
        )

    try:
        file_bytes = await file.read()
        rows_data = parse_sso_excel_file(file_bytes)
        row_items = [SSOBulkRowItem(**r) for r in rows_data]
        return SSOBulkParseResponse(
            success=True,
            message=f"Đọc thành công {len(row_items)} dòng từ file Excel '{file.filename}'.",
            rows=row_items,
            total_rows=len(row_items),
        )
    except Exception as e:
        logger.error(f"Lỗi phân tích file Excel '{file.filename}': {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể đọc file Excel. Vui lòng kiểm tra định dạng file: {e}",
        )


@router.post("/bulk-process-item", response_model=SSOBulkProcessItemResponse)
async def process_single_bulk_item(
    req: SSOBulkProcessItemRequest,
    current_user: UserInfo = Depends(require_app_or_admin),
    db: Session = Depends(get_db),
):
    """
    Xử lý 1 dòng trong danh sách Import Hàng Loạt:
    - create: Tạo mới tài khoản
    - update_pass: Update mật khẩu & mở khóa
    - lock: Khóa tài khoản
    - update_permissions: Update quyền User & Clients
    - update_info: Cập nhật thông tin (Email, SĐT, User Type)
    """
    cfg = get_user_sso_config(db, current_user.username)
    if not cfg or not cfg.sso_username or not cfg.sso_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tài khoản '{current_user.username}' chưa cấu hình SSO. Vui lòng bấm 'Cấu Hình SSO' trước khi thực hiện.",
        )

    try:
        res = await process_bulk_sso_item(
            system_username=current_user.username,
            sso_user=cfg.sso_username,
            sso_pass=cfg.sso_password,
            action=req.action,
            row=req.model_dump(),
        )

        if res.get("success"):
            log_service.record_log(
                db=db,
                nhom_quyen="APP",
                man_hinh="SSO_MANAGEMENT",
                hanh_dong=f"BULK_{req.action.upper()}",
                noi_dung=f"Xử lý hàng loạt ({req.action}) cho user '{req.user_name}': {res.get('message')}",
                user_thuchien=current_user.username,
                current_user=current_user,
            )

        return SSOBulkProcessItemResponse(
            success=res.get("success", False),
            user_name=res.get("user_name", req.user_name),
            action=req.action,
            message=res.get("message", ""),
            detail=res.get("detail"),
            new_password=res.get("new_password"),
            assigned_clients=res.get("assigned_clients", []),
            is_ldap=res.get("is_ldap", False),
        )
    except Exception as e:
        logger.error(f"Lỗi xử lý bulk item '{req.user_name}' ({req.action}): {e}", exc_info=True)
        return SSOBulkProcessItemResponse(
            success=False,
            user_name=req.user_name,
            action=req.action,
            message=f"Lỗi thực thi: {str(e)}",
        )
