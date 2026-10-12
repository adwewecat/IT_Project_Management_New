from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import require_app_or_admin
from app.services.overnight_devices_service import overnight_devices_service
from app.services.log_service import LogService

router = APIRouter(prefix="/overnight-devices", tags=["Overnight Devices"])


@router.get("", response_model=Dict[str, Any])
def get_overnight_devices(
    date: Optional[str] = Query(None, description="Ngày quét dạng YYYY-MM-DD hoặc DD-MM-YYYY"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo mã SAP hoặc tên nhà hàng"),
    current_user = Depends(require_app_or_admin)
):
    """Lấy danh sách các nhà hàng có thiết bị để qua đêm theo ngày."""
    logs = overnight_devices_service.get_logs_by_date(date)
    # Chỉ giữ các nhà hàng có ít nhất 1 thiết bị để qua đêm
    logs = [r for r in logs if (r.get("device_count", 0) > 0 or len(r.get("device_items", [])) > 0)]
    if search:
        s = search.strip().lower()
        logs = [
            r for r in logs
            if s in (r.get("sap_code") or "").lower()
            or s in (r.get("restaurant_name") or "").lower()
            or s in (r.get("ip_gateway") or "").lower()
            or s in (r.get("email") or "").lower()
            or s in (r.get("col_kds") or "").lower()
            or s in (r.get("col_pos_pc") or "").lower()
        ]

    total_devices = sum(r.get("device_count", 0) for r in logs)
    formatted_report = "\n\n".join([r["summary_line"] for r in logs if r.get("summary_line")])
    excel_tsv = overnight_devices_service.build_excel_tsv(logs)

    return {
        "success": True,
        "date": date or (logs[0]["scan_date"] if logs else ""),
        "total_restaurants": len(logs),
        "total_devices": total_devices,
        "items": logs,
        "formatted_report": formatted_report,
        "excel_table_tsv": excel_tsv
    }


@router.get("/dates", response_model=List[str])
def get_scan_dates(current_user = Depends(require_app_or_admin)):
    """Lấy danh sách tất cả các ngày đã có dữ liệu quét."""
    return overnight_devices_service.get_available_scan_dates()


@router.post("/scan", response_model=Dict[str, Any])
async def trigger_scan_now(
    db: Session = Depends(get_db),
    current_user = Depends(require_app_or_admin),
):
    """Kích hoạt quét toàn bộ nhà hàng ngay lập tức."""
    import asyncio
    res = await asyncio.to_thread(overnight_devices_service.scan_and_log_overnight_devices)
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="SYS",
            hanh_dong="SCAN",
            mo_ta="Kích hoạt quét toàn bộ nhà hàng kiểm tra thiết bị qua đêm",
            current_user=current_user,
        )
    except Exception:
        pass
    return res


@router.post("/send-email", response_model=Dict[str, Any])
async def send_email_report(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user = Depends(require_app_or_admin),
):
    """Gửi email báo cáo danh sách thiết bị để qua đêm dạng bảng cột chuẩn."""
    import asyncio
    scan_date = payload.get("scan_date")
    raw_recipients = payload.get("recipients")

    if not raw_recipients:
        recipients = ["it.helpdesk@ggg.com.vn", "it.support@ggg.com.vn"]
    elif isinstance(raw_recipients, list):
        recipients = [r.strip() for r in raw_recipients if r.strip()]
    elif isinstance(raw_recipients, str):
        recipients = [r.strip() for r in raw_recipients.split(",") if r.strip()]
    else:
        recipients = ["it.helpdesk@ggg.com.vn", "it.support@ggg.com.vn"]

    # Lấy dữ liệu ngày được chọn
    items = overnight_devices_service.get_logs_by_date(scan_date)
    scan_date_str = scan_date or (items[0]["scan_date"] if items else None)

    scan_results = {
        "scan_date": scan_date_str,
        "results": items,
        "total_restaurants_scanned": len(items),
        "total_devices_overnight": sum(i.get("device_count", 0) for i in items)
    }

    res = await asyncio.to_thread(
        overnight_devices_service.send_overnight_devices_email,
        scan_results=scan_results,
        recipients=recipients
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="SYS",
            hanh_dong="SEND_MAIL",
            mo_ta=f"Gửi email báo cáo thiết bị để qua đêm ngày {scan_date_str} tới {', '.join(recipients)}",
            current_user=current_user,
        )
    except Exception:
        pass
    return res

