import os
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, Header, Request
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
    request: Request,
    format: str = Query("json", description="Định dạng trả về: 'json' (mặc định dạng đối tượng) hoặc 'array' (mảng danh sách thuần túy)"),
    sap: Optional[str] = Query(None, description="Lọc theo mã SAP cụ thể (4 chữ số)"),
    ma_sap: Optional[str] = Query(None, description="Lọc theo mã SAP cụ thể (4 chữ số)"),
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
    import time
    # validate_api_access

    start_time = time.perf_counter()
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "unknown")
    user_agent = request.headers.get("user-agent", "")
    query_params = str(request.query_params)
    endpoint = request.url.path

    from app.services.managed_api_service import validate_api_access, log_api_request

    provided_key = (api_key or x_api_key or "").strip()
    is_valid, err_msg, err_code = validate_api_access(db, "ncc_restaurants", provided_key)
    if not is_valid:
        duration_ms = int((time.perf_counter() - start_time) * 1000)
        log_api_request(
            db=db,
            api_code="ncc_restaurants",
            endpoint_called=endpoint,
            client_ip=client_ip,
            method=request.method,
            status_code=err_code,
            response_time_ms=duration_ms,
            user_agent=user_agent,
            query_params=query_params
        )
        raise HTTPException(
            status_code=err_code,
            detail=err_msg
        )

    results = restaurant_service.get_ncc_restaurants(db=db, sap=sap, ma_sap=ma_sap, search=search)
    duration_ms = int((time.perf_counter() - start_time) * 1000)

    # Ghi nhận lượt request vào bảng log & cập nhật số liệu 24h
    log_api_request(
        db=db,
        api_code="ncc_restaurants",
        endpoint_called=endpoint,
        client_ip=client_ip,
        method=request.method,
        status_code=200,
        response_time_ms=duration_ms,
        user_agent=user_agent,
        query_params=query_params
    )

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

