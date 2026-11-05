from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.managed_api import ManagedAPI
from app.schemas.managed_api import ManagedAPICreate, ManagedAPIUpdate

logger = logging.getLogger(__name__)

DEFAULT_APIS = [
    {
        "api_code": "ncc_restaurants",
        "api_name": "API Thông Tin Nhà Hàng Cho NCC (Mã SAP 4 số, Tên NH, IP WAN)",
        "endpoint_path": "/api/v1/restaurants/ncc",
        "alias_path": "/api/v1/partner/restaurants",
        "method": "GET",
        "description": "Cung cấp danh sách nhà hàng đang hoạt động (trangthai = ON) có mã SAP đúng 4 số cho Nhà Cung Cấp (NCC) và đối tác tự động đồng bộ (gồm Mã SAP, Tên Nhà Hàng, IP WAN).",
        "is_enabled": True,
        "require_api_key": False,
        "created_by": "system"
    }
]


def ensure_default_apis(db: Session) -> None:
    """Đảm bảo bảng MANAGED_APIS có sẵn cấu hình API NCC mặc định"""
    try:
        for item in DEFAULT_APIS:
            existing = db.query(ManagedAPI).filter(ManagedAPI.api_code == item["api_code"]).first()
            if not existing:
                new_api = ManagedAPI(
                    api_code=item["api_code"],
                    api_name=item["api_name"],
                    endpoint_path=item["endpoint_path"],
                    alias_path=item.get("alias_path"),
                    method=item.get("method", "GET"),
                    description=item.get("description"),
                    is_enabled=item.get("is_enabled", True),
                    require_api_key=item.get("require_api_key", False),
                    created_by=item.get("created_by", "system"),
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                db.add(new_api)
                db.commit()
                logger.info("Đã khởi tạo API mặc định: %s", item["api_code"])
    except Exception as e:
        db.rollback()
        logger.warning("Không thể khởi tạo API mặc định: %s", e)


def is_api_enabled(db: Session, api_code: str) -> bool:
    """
    Kiểm tra nhanh xem API có đang ở trạng thái BẬT (is_enabled = True) hay không.
    Nếu bảng chưa tạo hoặc có lỗi kết nối, mặc định trả về True để không làm gián đoạn hệ thống.
    """
    try:
        api = db.query(ManagedAPI).filter(ManagedAPI.api_code == api_code).first()
        if api:
            return bool(api.is_enabled)
        return True
    except Exception as e:
        logger.warning("Lỗi kiểm tra trạng thái API %s: %s", api_code, e)
        return True


def list_managed_apis(db: Session) -> List[ManagedAPI]:
    """Lấy danh sách tất cả API đang được quản lý trong hệ thống"""
    ensure_default_apis(db)
    return db.query(ManagedAPI).order_by(ManagedAPI.id.asc()).all()


def get_managed_api(db: Session, api_id: int) -> Optional[ManagedAPI]:
    """Lấy thông tin chi tiết 1 API theo ID"""
    return db.query(ManagedAPI).filter(ManagedAPI.id == api_id).first()


def get_managed_api_by_code(db: Session, api_code: str) -> Optional[ManagedAPI]:
    """Lấy thông tin chi tiết 1 API theo mã api_code"""
    return db.query(ManagedAPI).filter(ManagedAPI.api_code == api_code).first()


def create_managed_api(db: Session, data: ManagedAPICreate, username: str) -> ManagedAPI:
    """Thêm một API mới vào hệ thống quản lý"""
    # Chuẩn hóa api_code (slug không dấu)
    code = data.api_code.strip().lower().replace(" ", "_")
    existing = db.query(ManagedAPI).filter(ManagedAPI.api_code == code).first()
    if existing:
        raise ValueError(f"Mã API '{code}' đã tồn tại trong hệ thống.")

    new_api = ManagedAPI(
        api_code=code,
        api_name=data.api_name.strip(),
        endpoint_path=data.endpoint_path.strip(),
        alias_path=data.alias_path.strip() if data.alias_path else None,
        method=data.method.strip().upper(),
        description=data.description.strip() if data.description else None,
        is_enabled=data.is_enabled,
        require_api_key=data.require_api_key,
        api_key=data.api_key.strip() if data.api_key else None,
        created_by=username,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.add(new_api)
    db.commit()
    db.refresh(new_api)
    return new_api


def update_managed_api(db: Session, api_id: int, data: ManagedAPIUpdate, username: str) -> Optional[ManagedAPI]:
    """Cập nhật cấu hình của 1 API"""
    api = db.query(ManagedAPI).filter(ManagedAPI.id == api_id).first()
    if not api:
        return None

    if data.api_name is not None:
        api.api_name = data.api_name.strip()
    if data.endpoint_path is not None:
        api.endpoint_path = data.endpoint_path.strip()
    if data.alias_path is not None:
        api.alias_path = data.alias_path.strip() if data.alias_path else None
    if data.method is not None:
        api.method = data.method.strip().upper()
    if data.description is not None:
        api.description = data.description.strip() if data.description else None
    if data.is_enabled is not None:
        api.is_enabled = data.is_enabled
    if data.require_api_key is not None:
        api.require_api_key = data.require_api_key
    if data.api_key is not None:
        api.api_key = data.api_key.strip() if data.api_key else None

    api.updated_at = datetime.now()
    db.commit()
    db.refresh(api)
    return api


def toggle_managed_api(db: Session, api_id: int, is_enabled: bool, username: str = "system") -> Optional[ManagedAPI]:
    """Bật / Tắt API nhanh chóng với 1 cú click"""
    api = db.query(ManagedAPI).filter(ManagedAPI.id == api_id).first()
    if not api:
        return None

    api.is_enabled = is_enabled
    api.updated_at = datetime.now()
    db.commit()
    db.refresh(api)
    logger.info("User %s đã thay đổi trạng thái API [%s] thành: %s", username, api.api_code, "BẬT" if is_enabled else "TẮT")
    return api


def delete_managed_api(db: Session, api_id: int) -> bool:
    """Xóa một API khỏi danh sách quản lý"""
    api = db.query(ManagedAPI).filter(ManagedAPI.id == api_id).first()
    if not api:
        return False

    db.delete(api)
    db.commit()
    return True
