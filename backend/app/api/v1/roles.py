from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import UserInfo
from app.schemas.role import (
    RoleCreate,
    RoleUpdate,
    RoleItemResponse,
    PermissionDetailItem,
    RoleWithPermissionsResponse,
    UpdateRolePermissionsRequest,
    AddCustomPermissionRequest,
)
from app.services.role_service import (
    get_roles,
    get_role_by_id,
    create_role,
    update_role,
    delete_role,
    get_role_permissions,
    update_role_permissions,
    add_custom_column_permission,
)
from app.api.deps import require_admin, require_super_admin
from app.services.auth_service import is_super_admin_user

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])


@router.get(
    "",
    response_model=List[RoleItemResponse],
    summary="Danh sách nhóm quyền",
    description="Lấy danh sách các nhóm quyền từ bảng dbo.LV_QUYEN. Yêu cầu quyền Admin."
)
def api_get_roles(
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return get_roles(db)


@router.post(
    "",
    response_model=RoleItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo nhóm quyền mới",
    description="Thêm mới một nhóm quyền vào dbo.LV_QUYEN và tự động khởi tạo các quyền chức năng. Yêu cầu quyền Admin."
)
def api_create_role(
    payload: RoleCreate,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return create_role(db, payload, actor=admin.username)


@router.get(
    "/{role_id}",
    response_model=RoleItemResponse,
    summary="Chi tiết nhóm quyền",
    description="Lấy thông tin nhóm quyền theo ID."
)
def api_get_role(
    role_id: int,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return get_role_by_id(db, role_id)


@router.put(
    "/{role_id}",
    response_model=RoleItemResponse,
    summary="Cập nhật nhóm quyền",
    description="Cập nhật mô tả hoặc trạng thái nhóm quyền."
)
def api_update_role(
    role_id: int,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return update_role(db, role_id, payload, actor=admin.username)


@router.delete(
    "/{role_id}",
    summary="Xóa nhóm quyền mở rộng",
    description="Xóa vĩnh viễn nhóm quyền và ma trận phân quyền chi tiết. Yêu cầu quyền Super Admin. Điều kiện: nhóm đã Tạm khóa và không còn tài khoản sử dụng."
)
def api_delete_role(
    role_id: int,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_super_admin)
):
    return delete_role(db, role_id, actor=admin.username)


@router.get(
    "/{role_id}/permissions",
    response_model=RoleWithPermissionsResponse,
    summary="Lấy ma trận phân quyền chi tiết",
    description="Lấy danh sách 18 quyền chức năng (IP WAN, SYS, FTTH, Mail, Photo, Ext) của nhóm quyền từ dbo.PHANQUYEN_DETAIL."
)
def api_get_role_permissions(
    role_id: int,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return get_role_permissions(db, role_id)


@router.put(
    "/{role_id}/permissions",
    response_model=RoleWithPermissionsResponse,
    summary="Cập nhật ma trận phân quyền chi tiết",
    description="Cập nhật trạng thái bật/tắt (active) cho từng quyền chức năng của nhóm quyền trong dbo.PHANQUYEN_DETAIL."
)
def api_update_role_permissions(
    role_id: int,
    payload: UpdateRolePermissionsRequest,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_admin)
):
    return update_role_permissions(
        db,
        role_id,
        payload,
        actor=admin.username,
        is_super_admin=getattr(admin, "is_super_admin", False) or is_super_admin_user(admin)
    )


@router.post(
    "/permissions/add-custom",
    response_model=PermissionDetailItem,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm chức năng hoặc cột mới vào hệ thống phân quyền",
    description="Cho phép Admin bổ sung quyền cho một cột mới (vd trong Danh sách Nhà hàng) hoặc tính năng mới."
)
def api_add_custom_permission(
    payload: AddCustomPermissionRequest,
    db: Session = Depends(get_db),
    admin: UserInfo = Depends(require_super_admin)
):
    return add_custom_column_permission(db, payload, actor=admin.username)

