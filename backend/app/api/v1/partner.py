import os
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, Header
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import restaurant_service

router = APIRouter(prefix="/partner", tags=["Partner & NCC API"])


@router.get(
    "/restaurants",
    summary="API danh sách thông tin nhà hàng cho Đối tác & Nhà Cung Cấp (NCC)",
    description=(
        "API chuyên dụng cho NCC/Đối tác tự động đồng bộ danh sách nhà hàng với các tiêu chí: "
        "Mã SAP (bắt buộc đúng 4 chữ số), Tên Nhà Hàng, IP WAN. "
        "Chỉ lấy nhà hàng đang hoạt động (trangthai = 'ON'), không lấy OFF hoặc NEW."
    )
)
def get_partner_restaurants(
    format: str = Query("json", description="Định dạng trả về: 'json' (mặc định dạng đối tượng) hoặc 'array' (mảng danh sách thuần túy)"),
    sap: Optional[str] = Query(None, description="Lọc theo mã SAP cụ thể (4 chữ số)"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên nhà hàng hoặc mã SAP"),
    api_key: Optional[str] = Query(None, description="Mã bảo mật API Key (tùy chọn)"),
    x_api_key: Optional[str] = Header(None, alias="X-API-KEY", description="Mã bảo mật API Key qua Header (tùy chọn)"),
    db: Session = Depends(get_db)
):
    """
    API cung cấp dữ liệu cho NCC tự động kết nối:
    - Mã SAP: Bắt buộc đúng 4 chữ số (loại bỏ mã tạm hoặc không phải 4 số).
    - Tên Nhà Hàng: Tên đầy đủ.
    - IP WAN: Địa chỉ IP WAN của nhà hàng.
    - Trạng thái: Chỉ lấy nhà hàng có trạng thái là ON (loại bỏ OFF, NEW).
    """
    configured_key = os.environ.get("NCC_API_KEY", "").strip()
    provided_key = (api_key or x_api_key or "").strip()
    if configured_key and provided_key != configured_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key không hợp lệ hoặc chưa được cấp quyền truy cập."
        )

    results = restaurant_service.get_ncc_restaurants(db=db, sap=sap, search=search)

    # Nếu bên NCC yêu cầu mảng JSON thuần túy để dễ parse trực tiếp
    if format and format.strip().lower() in ("array", "raw", "list"):
        return results

    # Mặc định trả về định dạng chuẩn RESTful JSON
    return {
        "success": True,
        "total": len(results),
        "filter": {
            "trangthai": "ON",
            "sap_condition": "Mã SAP đúng 4 chữ số (^\\d{4}$)",
            "queried_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "data": results
    }
