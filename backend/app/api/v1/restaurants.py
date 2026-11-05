import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Response, Header
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
import json
import urllib.parse
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.schemas.restaurant import (
    RestaurantItem,
    RestaurantListResponse,
    RestaurantCreate,
    RestaurantUpdate,
    RestaurantOptionsResponse,
    BrandItem,
    BrandCreate,
    RegionItem,
    RegionCreate,
    RestaurantAuditLogItem,
    RestaurantAuditLogsResponse,
    RestaurantNCCItem,
    RestaurantNCCResponse
)
from app.services import restaurant_service
from app.services.auth_service import is_admin_user

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


@router.get("", response_model=RestaurantListResponse)
def list_restaurants(
    search: Optional[str] = Query(None, description="Từ khóa tìm kiếm (tên, SAP, RK7, IP...)"),
    region: Optional[str] = Query(None, description="Lọc theo khu vực"),
    brand: Optional[str] = Query(None, description="Lọc theo thương hiệu"),
    trangthai: Optional[str] = Query(None, description="Trạng thái: ALL, ON, OFF, NEW"),
    page: int = Query(1, ge=1, description="Số trang"),
    page_size: int = Query(25, ge=1, le=5000, description="Số bản ghi mỗi trang"),
    sort_by: str = Query("res", description="Cột sắp xếp (mặc định theo thứ tự Alpha B Tên Nhà Hàng)"),
    sort_order: str = Query("asc", description="Thứ tự sắp xếp: asc hoặc desc"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """
    Lấy danh sách nhà hàng có phân trang, tìm kiếm và lọc.
    Tự động áp dụng phân quyền ẩn/hiện cột theo tài khoản đang đăng nhập.
    """
    return restaurant_service.get_restaurants(
        db=db,
        current_user=current_user,
        search=search,
        region=region,
        brand=brand,
        trangthai=trangthai,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order
    )


@router.get("/options", response_model=RestaurantOptionsResponse)
def get_restaurant_options(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách các Khu vực và Thương hiệu duy nhất để hiển thị bộ lọc"""
    return restaurant_service.get_filter_options(db)


@router.get("/export/excel")
def export_restaurants_to_excel(
    search: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    trangthai: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Xuất danh sách nhà hàng ra file Excel .xlsx"""
    excel_stream = restaurant_service.export_restaurants_excel(
        db=db,
        current_user=current_user,
        search=search,
        region=region,
        brand=brand,
        trangthai=trangthai
    )
    filename = f"Danh_Sach_Nha_Hang.xlsx"
    quoted_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"}
    )


@router.get("/logs", response_model=RestaurantAuditLogsResponse)
def get_restaurant_audit_logs(
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD hoặc DD/MM/YYYY)"),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD hoặc DD/MM/YYYY)"),
    action_type: Optional[str] = Query(None, description="Loại thao tác (Thêm mới nhà hàng / Cập nhật nhà hàng)"),
    user_thuchien: Optional[str] = Query(None, description="Người thực hiện"),
    search: Optional[str] = Query(None, description="Tìm trong nội dung chi tiết"),
    limit: Optional[int] = Query(None, ge=1, le=50000, description="Số lượng dòng tối đa (mặc định 200 khi không lọc ngày)"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách nhật ký thêm/sửa nhà hàng (Supper Admin xem toàn bộ, các quyền khác không thấy log của Supper Admin)"""
    return restaurant_service.get_restaurant_logs(
        db=db,
        current_user=current_user,
        from_date=from_date,
        to_date=to_date,
        action_type=action_type,
        user_thuchien=user_thuchien,
        search=search,
        limit=limit
    )


@router.get("/logs/export/excel")
def export_restaurant_audit_logs_excel(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    user_thuchien: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=50000),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Xuất nhật ký thêm/sửa nhà hàng ra file Excel"""
    excel_stream = restaurant_service.export_restaurant_logs_excel(
        db=db,
        current_user=current_user,
        from_date=from_date,
        to_date=to_date,
        action_type=action_type,
        user_thuchien=user_thuchien,
        search=search,
        limit=limit
    )
    filename = f"Bao_Cao_Logs_Nha_Hang_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    quoted_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quoted_filename}"}
    )


def check_can_manage_brand_region(current_user: UserInfo):
    """Kiểm tra quyền: Chỉ quản trị viên (Admin/SuperAdmin) hoặc người có quyền mở rộng mới được thêm"""
    is_admin = is_admin_user(current_user)
    has_extended = bool(current_user.quyen_mo_rong and str(current_user.quyen_mo_rong).strip() not in ["0", "", "None"])
    has_perm = bool(current_user.permissions and current_user.permissions.get("manage_brands_regions"))
    if not (is_admin or has_extended or has_perm):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện thao tác này. Cần quyền Quản trị hoặc Quyền mở rộng."
        )


@router.get("/brands", response_model=list[BrandItem])
def list_all_brands(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách tất cả các thương hiệu"""
    return restaurant_service.get_brands(db)


@router.post("/brands", response_model=BrandItem, status_code=status.HTTP_201_CREATED)
def add_new_brand(
    data: BrandCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Thêm thương hiệu mới (Yêu cầu quyền Quản trị hoặc Quyền mở rộng)"""
    check_can_manage_brand_region(current_user)
    try:
        return restaurant_service.create_brand(db, current_user, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/regions", response_model=list[RegionItem])
def list_all_regions(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy danh sách tất cả các khu vực / tỉnh thành"""
    return restaurant_service.get_regions(db)


@router.post("/regions", response_model=RegionItem, status_code=status.HTTP_201_CREATED)
def add_new_region(
    data: RegionCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Thêm khu vực mới (Yêu cầu quyền Quản trị hoặc Quyền mở rộng)"""
    check_can_manage_brand_region(current_user)
    try:
        return restaurant_service.create_region(db, current_user, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


VNC_CONFIG_FILE = Path(__file__).resolve().parent.parent.parent.parent / "static" / "downloads" / "vnc_config.json"

def get_saved_vnc_password() -> str:
    try:
        if VNC_CONFIG_FILE.exists():
            with open(VNC_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("default_password", "1234a@")
    except Exception:
        pass
    return "1234a@"

def save_vnc_password(password: str, updated_by: str):
    VNC_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(VNC_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "default_password": password,
            "updated_by": updated_by,
            "updated_at": str(datetime.now())
        }, f, ensure_ascii=False, indent=2)

def check_can_configure_vnc(current_user: UserInfo):
    username = (current_user.username or "").strip().lower()
    allowed = ["dung.nguyenanh", "admin"]
    if not (current_user.is_super_admin or username in allowed):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản dung.nguyenanh hoặc Quản trị viên (admin) mới có quyền cấu hình mật khẩu VNC."
        )

class VncConfigRequest(BaseModel):
    password: str

@router.get("/vnc-config")
def get_vnc_config(current_user: UserInfo = Depends(get_current_user)):
    """Lấy cấu hình mật khẩu VNC mặc định hiện tại"""
    return {"default_password": get_saved_vnc_password()}

@router.post("/vnc-config")
def update_vnc_config(data: VncConfigRequest, current_user: UserInfo = Depends(get_current_user)):
    """Cập nhật mật khẩu VNC mặc định (Chỉ cho phép dung.nguyenanh hoặc admin)"""
    check_can_configure_vnc(current_user)
    pwd = data.password.strip() if data.password and data.password.strip() else "1234a@"
    save_vnc_password(pwd, current_user.username)
    return {"status": "success", "default_password": pwd, "updated_by": current_user.username}


@router.get("/download/scrcpy")
def download_scrcpy_package():
    """Tải bộ cài đặt scrcpy.rar để giải nén vào ổ C:\\scrcpy"""
    file_path = Path(__file__).resolve().parent.parent.parent.parent / "static" / "downloads" / "scrcpy.rar"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File scrcpy.rar không tồn tại trên máy chủ")
    return FileResponse(
        path=str(file_path),
        filename="scrcpy.rar",
        media_type="application/x-rar-compressed"
    )


@router.get("/download/reg")
def download_vnc_scrcpy_reg(request: Request, password: Optional[str] = Query(None)):
    """Tải file vnc_scrcpy_protocol.reg đăng ký giao thức vnc:// và scrcpy:// cho Windows"""
    origin = f"{request.url.scheme}://{request.url.netloc}"
    req_origin = request.headers.get("origin") or request.headers.get("referer")
    if req_origin:
        parsed = urllib.parse.urlparse(req_origin)
        if parsed.scheme and parsed.netloc:
            origin = f"{parsed.scheme}://{parsed.netloc}"

    if password and password.strip():
        vnc_pwd = password.strip()
    else:
        vnc_pwd = get_saved_vnc_password()

    reg_template = r"""Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\vnc]
@="URL:VNC Connection"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\vnc\shell]

[HKEY_CLASSES_ROOT\vnc\shell\open]

[HKEY_CLASSES_ROOT\vnc\shell\open\command]
@="cmd /V:ON /c \"set url=%1&&set url=!url:vnc://=!&&set url=!url:/=!&&start \"\" \"C:\\Program Files\\TightVNC\\tvnviewer.exe\" !url! -password=1234a@\""

[HKEY_CLASSES_ROOT\scrcpy]
@="URL:scrcpy Connection"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\scrcpy\shell]

[HKEY_CLASSES_ROOT\scrcpy\shell\open]

[HKEY_CLASSES_ROOT\scrcpy\shell\open\command]
@="cmd /c \"set KDS_URL=%1&&powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand JAB1ACAAPQAgACQAZQBuAHYAOgBLAEQAUwBfAFUAUgBMAAoAJABpAHAAIAA9ACAAKAAkAHUAIAAtAHIAZQBwAGwAYQBjAGUAIABbAHMAdAByAGkAbgBnAF0AWwBjAGgAYQByAF0AMwA0ACwAIAAnACcAIAAtAHIAZQBwAGwAYQBjAGUAIAAnAHMAYwByAGMAcAB5ADoALwAvACcALAAgACcAJwAgAC0AcgBlAHAAbABhAGMAZQAgACcALwAnACwAIAAnACcAKQAuAFQAcgBpAG0AKAApAAoAaQBmACAAKAAtAG4AbwB0ACAAKABUAGUAcwB0AC0AUABhAHQAaAAgACcAQwA6AFwAcwBjAHIAYwBwAHkAJwApACkAIAB7AAoAIAAgACAAIABXAHIAaQB0AGUALQBIAG8AcwB0ACAAJwBMAG8AaQA6ACAAVABoAHUAIABtAHUAYwAgAEMAOgBcAHMAYwByAGMAcAB5ACAAawBoAG8AbgBnACAAdABvAG4AIAB0AGEAaQAhACcAIAAtAEYAbwByAGUAZwByAG8AdQBuAGQAQwBvAGwAbwByACAAUgBlAGQACgAgACAAIAAgAFcAcgBpAHQAZQAtAEgAbwBzAHQAIAAnAFYAdQBpACAAbABvAG4AZwAgAGcAaQBhAGkAIABuAGUAbgAgAGIAbwAgAGMAYQBpACAAcwBjAHIAYwBwAHkAIAB2AGEAbwAgAHQAaAB1ACAAbQB1AGMAIABDADoAXABzAGMAcgBjAHAAeQAnAAoAIAAgACAAIABSAGUAYQBkAC0ASABvAHMAdAAgACcATgBoAGEAbgAgAEUAbgB0AGUAcgAgAGQAZQAgAGQAbwBuAGcALgAuAC4AJwAKACAAIAAgACAAZQB4AGkAdAAKAH0ACgBjAGQAIAAnAEMAOgBcAHMAYwByAGMAcAB5ACcACgAuAFwAYQBkAGIALgBlAHgAZQAgAGQAaQBzAGMAbwBuAG4AZQBjAHQAIAAiACQAewBpAHAAfQA6ADUANQA1ADUAIgAgADIAPgAkAG4AdQBsAGwAIAB8ACAATwB1AHQALQBOAHUAbABsAAoALgBcAGEAZABiAC4AZQB4AGUAIABjAG8AbgBuAGUAYwB0ACAAIgAkAHsAaQBwAH0AOgA1ADUANQA1ACIACgAuAFwAcwBjAHIAYwBwAHkALgBlAHgAZQAgAC0AcwAgACIAJAB7AGkAcAB9ADoANQA1ADUANQAiACAALQAtAHcAaQBuAGQAbwB3AC0AdABpAHQAbABlACAAIgBLAEQAUwAtACQAewBpAHAAfQAiAAoAaQBmACAAKAAkAEwAQQBTAFQARQBYAEkAVABDAE8ARABFACAALQBuAGUAIAAwACkAIAB7AAoAIAAgACAAIABSAGUAYQBkAC0ASABvAHMAdAAgACcATgBoAGEAbgAgAEUAbgB0AGUAcgAgAGQAZQAgAGQAbwBuAGcALgAuAC4AJwAKAH0A\""

[HKEY_CURRENT_USER\Software\Policies\Google\Chrome]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"

[HKEY_CURRENT_USER\Software\Policies\Microsoft\Edge]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"

[HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"

[HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Edge]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"
"""
    formatted_content = reg_template.replace('{origin}', origin).replace('-password=1234a@', f'-password={vnc_pwd}').strip().replace('\n', '\r\n')
    return Response(
        content=formatted_content.encode('utf-8-sig'),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=vnc_scrcpy_protocol.reg",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )


@router.get("/download/scrcpy-winserver")
def download_scrcpy_winserver_package():
    """Tải bộ cài đặt scrcpy_winserver.zip chuyên dụng cho Windows Server / RDP (hỗ trợ Win Server 2012+)"""
    base_dir = Path(__file__).resolve().parent.parent.parent.parent / "static" / "downloads"
    zip_path = base_dir / "scrcpy_winserver.zip"
    rar_path = base_dir / "scrcpy_winserver.rar"
    if zip_path.exists():
        return FileResponse(
            path=str(zip_path),
            filename="scrcpy_winserver.zip",
            media_type="application/zip"
        )
    elif rar_path.exists():
        return FileResponse(
            path=str(rar_path),
            filename="scrcpy_winserver.rar",
            media_type="application/x-rar-compressed"
        )
    raise HTTPException(status_code=404, detail="File scrcpy_winserver không tồn tại trên máy chủ")


@router.get("/download/reg-winserver")
def download_vnc_scrcpy_reg_winserver(request: Request, password: Optional[str] = Query(None)):
    """Tải file vnc_scrcpy_protocol_winserver.reg tối ưu riêng cho Windows Server & Remote Desktop"""
    origin = f"{request.url.scheme}://{request.url.netloc}"
    req_origin = request.headers.get("origin") or request.headers.get("referer")
    if req_origin:
        parsed = urllib.parse.urlparse(req_origin)
        if parsed.scheme and parsed.netloc:
            origin = f"{parsed.scheme}://{parsed.netloc}"

    if password and password.strip():
        vnc_pwd = password.strip()
    else:
        vnc_pwd = get_saved_vnc_password()

    reg_template = r"""Windows Registry Editor Version 5.00

[HKEY_CLASSES_ROOT\vnc]
@="URL:VNC Connection"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\vnc\shell]

[HKEY_CLASSES_ROOT\vnc\shell\open]

[HKEY_CLASSES_ROOT\vnc\shell\open\command]
@="cmd /V:ON /c \"set url=%1&&set url=!url:vnc://=!&&set url=!url:/=!&&start \"\" \"C:\\Program Files\\TightVNC\\tvnviewer.exe\" !url! -password=1234a@\""

[HKEY_CLASSES_ROOT\scrcpy]
@="URL:scrcpy Connection"
"URL Protocol"=""

[HKEY_CLASSES_ROOT\scrcpy\shell]

[HKEY_CLASSES_ROOT\scrcpy\shell\open]

[HKEY_CLASSES_ROOT\scrcpy\shell\open\command]
@="cmd /c \"if exist C:\\\\scrcpy\\\\kds_connect_server.bat (call C:\\\\scrcpy\\\\kds_connect_server.bat %1) else (echo Khong tim thay C:\\\\scrcpy\\\\kds_connect_server.bat && echo Vui long tai va giai nen bo cai scrcpy_winserver vao C:\\\\scrcpy && echo. && pause)\""

[HKEY_CURRENT_USER\Software\Policies\Google\Chrome]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"

[HKEY_CURRENT_USER\Software\Policies\Microsoft\Edge]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"

[HKEY_LOCAL_MACHINE\Software\Policies\Google\Chrome]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"

[HKEY_LOCAL_MACHINE\Software\Policies\Microsoft\Edge]
"AutoLaunchProtocolsFromOrigins"="[{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"vnc\"},{\"allowed_origins\":[\"{origin}\"],\"protocol\":\"scrcpy\"}]"
"""
    formatted_content = reg_template.replace('{origin}', origin).replace('-password=1234a@', f'-password={vnc_pwd}').strip().replace('\n', '\r\n')
    return Response(
        content=formatted_content.encode('utf-8-sig'),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=vnc_scrcpy_protocol_winserver.reg",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )



def _check_single_vnc(ip: str) -> bool:
    import socket
    import subprocess
    # 1. Quick TCP check on VNC port 5900 (ultra fast, ~6-10ms if VNC service is running)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.15)
        s.connect((ip, 5900))
        s.close()
        return True
    except Exception:
        pass
    # 2. Fast ICMP ping fallback (timeout 350ms on LAN/VPN)
    try:
        r = subprocess.run(
            ['ping', '-n', '1', '-w', '350', ip],
            capture_output=True, text=True,
            creationflags=0x08000000  # CREATE_NO_WINDOW
        )
        return r.returncode == 0 and 'ttl=' in r.stdout.lower()
    except Exception:
        return False


def _check_single_kds(ip: str) -> bool:
    import socket
    import subprocess
    # 1. Quick TCP check on ADB port 5555 (ultra fast if Scrcpy/ADB is listening)
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.12)
        s.connect((ip, 5555))
        s.close()
        return True
    except Exception:
        pass
    # 2. Fast ICMP ping fallback (timeout 350ms)
    try:
        r = subprocess.run(
            ['ping', '-n', '1', '-w', '350', ip],
            capture_output=True, text=True,
            creationflags=0x08000000  # CREATE_NO_WINDOW
        )
        return r.returncode == 0 and 'ttl=' in r.stdout.lower()
    except Exception:
        return False


@router.get("/ping-vnc/{ip_prefix:path}")
async def ping_vnc_endpoints(
    ip_prefix: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Ping PC QL (.41), POS TN 1.1 (.11), POS TN 1.2 (.12) của nhà hàng theo IP prefix với cơ chế Hybrid siêu tốc"""
    import asyncio
    import concurrent.futures

    prefix = ip_prefix.strip()
    if not prefix.endswith('.'):
        prefix += '.'
    suffixes = ["41", "11", "12"]

    def run_checks():
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            res_list = list(executor.map(lambda s: (s, _check_single_vnc(prefix + s)), suffixes))
            return dict(res_list)

    results = await asyncio.to_thread(run_checks)
    return {"status": "success", "results": results}


@router.get("/ping-kds/{ip_prefix:path}")
async def ping_kds_endpoints(
    ip_prefix: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Ping KDS màn hình hiển thị bếp (.31 → .38) của nhà hàng theo IP prefix với cơ chế Hybrid siêu tốc"""
    import asyncio
    import concurrent.futures

    prefix = ip_prefix.strip()
    if not prefix.endswith('.'):
        prefix += '.'
    suffixes = ["31", "32", "33", "34", "35", "36", "37", "38"]

    def run_checks():
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
            res_list = list(executor.map(lambda s: (s, _check_single_kds(prefix + s)), suffixes))
            return dict(res_list)

    results = await asyncio.to_thread(run_checks)
    return {"status": "success", "results": results}



@router.get(
    "/ncc",
    summary="API thông tin nhà hàng cho Nhà Cung Cấp (NCC) / Đối tác",
    description="API công khai cho phép NCC tự động lấy thông tin danh sách nhà hàng với 3 thông tin chính: Mã SAP, Tên Nhà Hàng, IP WAN. Điều kiện lọc: Nhà hàng đang hoạt động (trangthai = 'ON') và Mã SAP đúng 4 chữ số."
)
def get_restaurants_for_ncc(
    format: str = Query("json", description="Định dạng trả về: 'json' (mặc định dạng đối tượng) hoặc 'array' (danh sách mảng thuần túy)"),
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


@router.get("/{id}", response_model=RestaurantItem)
def get_restaurant_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Lấy thông tin chi tiết của 1 nhà hàng theo ID"""
    restaurant = restaurant_service.get_restaurant_by_id(db, current_user, id)
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy nhà hàng với ID {id}"
        )
    return restaurant


@router.post("", response_model=RestaurantItem, status_code=status.HTTP_201_CREATED)
def create_new_restaurant(
    data: RestaurantCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Thêm một nhà hàng mới vào hệ thống"""
    return restaurant_service.create_restaurant(db, current_user, data)


@router.put("/{id}", response_model=RestaurantItem)
def update_restaurant_info(
    id: int,
    data: RestaurantUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Cập nhật thông tin nhà hàng theo phân quyền cho phép"""
    updated = restaurant_service.update_restaurant(db, current_user, id, data)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy nhà hàng với ID {id}"
        )
    return updated
