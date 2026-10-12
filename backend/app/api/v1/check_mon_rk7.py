from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.check_mon_rk7 import (
    SapCheckRequest,
    SapCheckResponse,
    SelectorCheckRequest,
    SelectorCheckResponse,
    BrandItem,
    BrandMenuResponse,
)
from app.services.check_mon_rk7_service import (
    get_brands,
    check_sap_exists,
    check_selector,
    get_brand_menu,
    export_sap_check_excel,
    export_selector_check_excel,
    export_brand_menu_excel,
)

router = APIRouter(prefix="/check-mon-rk7", tags=["App - Check Món RK7"])


@router.get("/brands", response_model=List[BrandItem])
def get_brands_endpoint(
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách các Brand có thực đơn trên hệ thống RK7"""
    try:
        return get_brands()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi kết nối hệ thống RK7: {str(e)}"
        )


@router.post("/check-sap", response_model=SapCheckResponse)
def check_sap_endpoint(
    payload: SapCheckRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """Kiểm tra danh sách mã SAP đã đẩy xuống RK7 chưa"""
    try:
        return check_sap_exists(payload.sap_codes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tra cứu mã SAP trên RK7: {str(e)}"
        )


@router.post("/check-selector", response_model=SelectorCheckResponse)
def check_selector_endpoint(
    payload: SelectorCheckRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """Kiểm tra danh sách mã SAP nằm trong nhóm Selector nào của Brand nào và đơn giá POS"""
    try:
        return check_selector(payload.sap_codes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi kiểm tra phân nhóm Selector trên RK7: {str(e)}"
        )


@router.get("/brand-menu/{brand_guid}", response_model=BrandMenuResponse)
def get_brand_menu_endpoint(
    brand_guid: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy toàn bộ thực đơn và bảng giá POS của một Brand theo GUID"""
    try:
        return get_brand_menu(brand_guid)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tải thực đơn Brand từ RK7: {str(e)}"
        )


@router.post("/export-sap")
def export_sap_endpoint(
    payload: SapCheckRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """Xuất file Excel kết quả kiểm tra SAP -> RK7"""
    try:
        res = check_sap_exists(payload.sap_codes)
        excel_stream, filename = export_sap_check_excel(res)
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xuất Excel: {str(e)}"
        )


@router.post("/export-selector")
def export_selector_endpoint(
    payload: SelectorCheckRequest,
    current_user: UserInfo = Depends(get_current_user)
):
    """Xuất file Excel kết quả kiểm tra phân nhóm Selector POS"""
    try:
        res = check_selector(payload.sap_codes)
        excel_stream, filename = export_selector_check_excel(res)
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xuất Excel: {str(e)}"
        )


@router.get("/brand-menu/{brand_guid}/export")
def export_brand_menu_endpoint(
    brand_guid: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Xuất file Excel toàn bộ menu POS của Brand"""
    try:
        res = get_brand_menu(brand_guid)
        excel_stream, filename = export_brand_menu_excel(res.brand_name, res)
        return StreamingResponse(
            excel_stream,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xuất Excel: {str(e)}"
        )
