from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc

from app.models.managed_api import ManagedAPI, ManagedAPILog
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
                    updated_at=datetime.now(),
                    total_requests=0
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


def validate_api_access(
    db: Session,
    api_code: str,
    provided_key: Optional[str] = None
) -> tuple[bool, Optional[str], int]:
    """
    Kiểm tra toàn diện quyền truy cập API:
    1. Trạng thái BẬT / TẮT (is_enabled)
    2. Xác thực API Key từ Database (hoặc fallback biến môi trường NCC_API_KEY)
    Trả về: (is_valid: bool, error_message: Optional[str], status_code: int)
    """
    try:
        api = db.query(ManagedAPI).filter(ManagedAPI.api_code == api_code).first()
        if api and not api.is_enabled:
            return False, "API hiện đang tạm khóa hoặc bảo trì bởi Quản trị viên.", 503

        # Kiểm tra API Key nếu được yêu cầu
        if api and api.require_api_key:
            expected_key = (api.api_key or "").strip()
            # Nếu chưa có trong DB, fallback sang env
            if not expected_key:
                import os
                expected_key = os.environ.get("NCC_API_KEY", "").strip()

            if expected_key:
                clean_provided = (provided_key or "").strip()
                if not clean_provided or clean_provided != expected_key:
                    return (
                        False,
                        "API Key không hợp lệ hoặc chưa được cung cấp qua tham số '?api_key=' hoặc Header 'X-API-KEY'.",
                        401
                    )

        return True, None, 200
    except Exception as e:
        logger.warning("Lỗi kiểm tra quyền truy cập API %s: %s", api_code, e)
        return True, None, 200


def log_api_request(
    db: Session,
    api_code: str,
    endpoint_called: str,
    client_ip: Optional[str] = None,
    method: str = "GET",
    status_code: int = 200,
    response_time_ms: int = 0,
    user_agent: Optional[str] = None,
    query_params: Optional[str] = None
) -> None:
    """
    Ghi nhận một lượt request vào bảng MANAGED_API_LOGS và cập nhật thống kê trong MANAGED_APIS.
    Bọc an toàn trong try-except để không bao giờ làm gián đoạn flow phản hồi API của hệ thống.
    """
    try:
        now = datetime.now()
        # 1. Thêm bản ghi log chi tiết
        log_entry = ManagedAPILog(
            api_code=api_code,
            endpoint_called=endpoint_called[:500] if endpoint_called else None,
            client_ip=client_ip[:100] if client_ip else None,
            method=method.upper(),
            status_code=status_code,
            response_time_ms=response_time_ms,
            user_agent=user_agent[:500] if user_agent else None,
            query_params=query_params[:500] if query_params else None,
            requested_at=now
        )
        db.add(log_entry)

        # 2. Cập nhật thống kê tích lũy nhanh trong MANAGED_APIS
        api = db.query(ManagedAPI).filter(ManagedAPI.api_code == api_code).first()
        if api:
            api.total_requests = (api.total_requests or 0) + 1
            api.last_requested_at = now
            if client_ip:
                api.last_client_ip = client_ip[:100]

        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning("Không thể ghi log request API %s: %s", api_code, e)


def get_api_requests_24h(db: Session, api_code: str) -> int:
    """Đếm số lượt gọi trong 24 giờ qua của một API"""
    try:
        since_time = datetime.now() - timedelta(hours=24)
        count = db.query(func.count(ManagedAPILog.id)).filter(
            ManagedAPILog.api_code == api_code,
            ManagedAPILog.requested_at >= since_time
        ).scalar()
        return count or 0
    except Exception as e:
        logger.warning("Lỗi đếm request 24h cho API %s: %s", api_code, e)
        return 0


def list_managed_apis(db: Session) -> List[Dict[str, Any]]:
    """Lấy danh sách tất cả API đang được quản lý kèm thống kê lượt gọi 24h & cảnh báo spam"""
    ensure_default_apis(db)
    apis = db.query(ManagedAPI).order_by(ManagedAPI.id.asc()).all()

    since_24h = datetime.now() - timedelta(hours=24)

    # Đếm số request 24h của tất cả api_code cùng 1 query group by để tối ưu hiệu năng
    stats_24h: Dict[str, int] = {}
    try:
        rows = db.query(
            ManagedAPILog.api_code,
            func.count(ManagedAPILog.id)
        ).filter(
            ManagedAPILog.requested_at >= since_24h
        ).group_by(ManagedAPILog.api_code).all()
        for code, cnt in rows:
            stats_24h[code] = cnt
    except Exception as e:
        logger.warning("Lỗi thống kê nhóm request 24h: %s", e)

    results = []
    for api in apis:
        cnt_24h = stats_24h.get(api.api_code, 0)
        # Cảnh báo tần suất cao nếu lượt gọi 24h > 500 (trung bình > 20 req/h liên tục)
        is_high = cnt_24h >= 500

        item_dict = {
            "id": api.id,
            "api_code": api.api_code,
            "api_name": api.api_name,
            "endpoint_path": api.endpoint_path,
            "alias_path": api.alias_path,
            "method": api.method,
            "description": api.description,
            "is_enabled": api.is_enabled,
            "require_api_key": api.require_api_key,
            "api_key": api.api_key,
            "created_by": api.created_by,
            "created_at": api.created_at,
            "updated_at": api.updated_at,
            "requests_24h": cnt_24h,
            "total_requests": api.total_requests or 0,
            "last_requested_at": api.last_requested_at,
            "last_client_ip": api.last_client_ip,
            "is_high_traffic": is_high
        }
        results.append(item_dict)

    return results


def get_managed_api(db: Session, api_id: int) -> Optional[ManagedAPI]:
    """Lấy thông tin chi tiết 1 API theo ID"""
    return db.query(ManagedAPI).filter(ManagedAPI.id == api_id).first()


def get_managed_api_by_code(db: Session, api_code: str) -> Optional[ManagedAPI]:
    """Lấy thông tin chi tiết 1 API theo mã api_code"""
    return db.query(ManagedAPI).filter(ManagedAPI.api_code == api_code).first()


def get_api_logs(
    db: Session,
    api_code: str,
    limit: int = 50,
    hours: int = 24
) -> List[ManagedAPILog]:
    """Lấy danh sách nhật ký các lượt gọi gần nhất của 1 API"""
    since_time = datetime.now() - timedelta(hours=hours)
    try:
        return db.query(ManagedAPILog).filter(
            ManagedAPILog.api_code == api_code,
            ManagedAPILog.requested_at >= since_time
        ).order_by(desc(ManagedAPILog.requested_at)).limit(limit).all()
    except Exception as e:
        logger.warning("Lỗi truy vấn logs cho API %s: %s", api_code, e)
        return []


def create_managed_api(db: Session, data: ManagedAPICreate, username: str) -> ManagedAPI:
    """Thêm một API mới vào hệ thống quản lý"""
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
        updated_at=datetime.now(),
        total_requests=0
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
