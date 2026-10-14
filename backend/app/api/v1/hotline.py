from __future__ import annotations

import io
import logging
import os
import re
import zipfile
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserInfo
from app.services import hotline_3cx_service
from app.services.log_service import LogService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/hotline", tags=["Hotline 3CX"])


class CallEventRequest(BaseModel):
    ext: str
    caller_raw_text: Optional[str] = ""
    duty_user: Optional[str] = None
    is_busy: Optional[bool] = False
    is_missed: Optional[bool] = False


class SimulateCallRequest(BaseModel):
    ext: str
    caller_raw_text: Optional[str] = None
    duty_user: Optional[str] = None
    is_busy: Optional[bool] = False
    is_missed: Optional[bool] = False


class ToggleDutyRequest(BaseModel):
    active: bool
    duty_user: Optional[str] = None


def get_current_user_flexible(
    request: Request,
    db: Session = Depends(get_db),
) -> UserInfo:
    """Lấy thông tin người dùng hiện tại từ Bearer token, nếu không có hoặc hết hạn thì fallback IT Hotline"""
    try:
        from app.core.security import decode_access_token
        from app.models.user import User
        from sqlalchemy import func, select
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ")[1]
            payload = decode_access_token(token)
            if payload and payload.get("sub"):
                username = payload.get("sub")
                stmt = select(User).where(func.lower(User.user_name1) == username.lower())
                user = db.scalar(stmt)
                if user:
                    return UserInfo(
                        id=user.id,
                        username=user.user_name1,
                        full_name=user.full_name or user.user_name1,
                        email=user.email or "",
                        manv=user.manv or "",
                        phanquyen=user.phanquyen or "",
                        roles=[],
                        role_name="",
                        quyen_mo_rong="",
                        is_super_admin=False,
                        permissions={},
                    )
    except Exception:
        pass
    return UserInfo(
        id=0,
        username="hotline",
        full_name="IT Hotline",
        email="",
        manv="",
        phanquyen="",
        roles=[],
        role_name="",
        quyen_mo_rong="",
        is_super_admin=False,
        permissions={},
    )



@router.get("/events")
async def hotline_events_stream():
    """
    Endpoint Server-Sent Events (SSE) để frontend nhận sự kiện cuộc gọi 3CX theo thời gian thực.
    """
    return StreamingResponse(
        hotline_3cx_service.subscribe_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/status")
def get_hotline_status(username: Optional[str] = Query(None)):
    """Lấy trạng thái hiện tại của phân hệ trực hotline"""
    return hotline_3cx_service.get_status(current_username=username)


@router.post("/toggle-duty")
def toggle_hotline_duty(req: ToggleDutyRequest):
    """Bật/tắt chế độ trực hotline và khởi động/dừng scanner Windows"""
    if req.active:
        hotline_3cx_service.start_scanner()
    else:
        # Khi tắt, nếu không còn ai trực thì có thể dừng scanner
        hotline_3cx_service.stop_scanner()

    return {
        "success": True,
        "is_active": req.active,
        "status": hotline_3cx_service.get_status(current_username=req.duty_user),
    }


@router.post("/call-event")
def trigger_call_event(req: CallEventRequest):
    """
    Nhận sự kiện cuộc gọi 3CX (từ scanner nội bộ hoặc local agent bên ngoài).
    """
    if not req.ext or not req.ext.strip():
        raise HTTPException(status_code=400, detail="Thiếu số máy lẻ EXT.")

    result = hotline_3cx_service.process_incoming_call(
        ext=req.ext.strip(),
        caller_raw_text=req.caller_raw_text or "",
        duty_user=req.duty_user,
        is_busy=bool(req.is_busy),
        is_missed=bool(req.is_missed),
    )
    return {"success": True, "call": result}


@router.api_route("/3cx-webhook", methods=["GET", "POST"])
async def receive_3cx_pbx_webhook(
    request: Request,
    number: Optional[str] = Query(None, alias="Number"),
    call_type: Optional[str] = Query(None, alias="CallType"),
    caller_name: Optional[str] = Query(None, alias="CallerName"),
    agent: Optional[str] = Query(None, alias="Agent"),
):
    """
    Endpoint nhận Webhook trực tiếp từ 3CX PWA Client hoặc tổng đài 3CX PBX.
    Hỗ trợ tính năng: 3CX PWA -> Settings -> Integration -> Auto launch Custom Contact URL
    với biến %CallerNumber% hoặc ?Number=%CallerNumber%
    """
    # Đọc từ Query params hỗ trợ tất cả các cách đặt tên của 3CX
    qp = request.query_params
    ext = (
        number
        or qp.get("Number")
        or qp.get("number")
        or qp.get("CallerNumber")
        or qp.get("callernumber")
        or qp.get("caller")
        or qp.get("phone")
        or qp.get("ext")
        or ""
    )
    c_type = (call_type or qp.get("CallType") or qp.get("call_type") or "Inbound").lower()
    c_name = caller_name or qp.get("CallerName") or qp.get("caller_name") or qp.get("CallerDisplayName") or ""
    raw_agent = agent or qp.get("Agent") or qp.get("agent") or qp.get("User") or qp.get("user") or qp.get("duty_user") or qp.get("ext_receiver") or ""
    duty_user: Optional[str] = raw_agent.strip() if raw_agent and raw_agent.strip() else None
    if duty_user and duty_user.lower() == "3cx pwa client":
        duty_user = None

    # Nếu gửi qua POST body
    if request.method == "POST":
        try:
            body = await request.json()
            if isinstance(body, dict):
                ext = ext or body.get("Number") or body.get("number") or body.get("CallerNumber") or body.get("ext") or body.get("caller") or ""
                c_type = (body.get("CallType") or body.get("call_type") or c_type).lower()
                c_name = c_name or body.get("CallerName") or body.get("caller_name") or body.get("CallerDisplayName") or body.get("name") or ""
                post_agent = body.get("Agent") or body.get("agent") or body.get("User") or body.get("user") or body.get("duty_user") or ""
                if post_agent and str(post_agent).strip():
                    duty_user = str(post_agent).strip()
                    if duty_user.lower() == "3cx pwa client":
                        duty_user = None
        except Exception:
            try:
                form = await request.form()
                ext = ext or form.get("Number") or form.get("number") or form.get("CallerNumber") or form.get("ext") or ""
                c_type = (form.get("CallType") or form.get("call_type") or c_type).lower()
                c_name = c_name or form.get("CallerName") or form.get("caller_name") or ""
            except Exception:
                pass

    # Gọt bỏ dấu ngoặc kép hoặc nháy đơn vô tình bị dán thừa
    ext = ext.strip().strip('"\'')
    if duty_user:
        duty_user = duty_user.strip().strip('"\'')

    # Xử lý tự động bẫy lỗi trường hợp người dùng viết URL có đuôi máy nhánh:
    # Ví dụ: "Number=%CallerNumber% 8740" (viết cách khoảng trắng số máy nhánh 8740 ở cuối)
    if not duty_user:
        sub_tokens = ext.split()
        if len(sub_tokens) >= 2:
            first_token = sub_tokens[0].strip().strip('"\'')
            second_token = sub_tokens[1].strip().strip('"\'')
            # Cụm thứ hai là số máy nhánh (2-6 chữ số như 8740, 8345) hoặc username
            if re.match(r"^\w{2,10}$", second_token):
                duty_user = second_token
                ext = first_token
                logger.info("Tự động trích xuất Agent máy nhánh từ đuôi tham số Number: %s", duty_user)

        # Hoặc kiểm tra trong query string thô nếu URL bị encode
        raw_query = str(request.url.query)
        if not duty_user and raw_query:
            m_tail = re.search(r"(?:%20|\s+)(\d{3,6})\b", raw_query)
            if m_tail:
                duty_user = m_tail.group(1)
                logger.info("Tự động trích xuất Agent máy nhánh từ query string thô: %s", duty_user)

    if not ext:
        if "text/html" in request.headers.get("accept", ""):
            return Response(
                content="<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h3>3CX Hotline Webhook</h3><p>Không có số điện thoại được truyền qua tham số Number.</p></body></html>",
                media_type="text/html",
            )
        return {"status": "ignored", "reason": "No phone/ext provided"}

    # Bóc tách số EXT nếu có
    m = re.search(r"\b(\d{2,12})\b", ext)
    clean_ext = m.group(1) if m else ext

    is_missed = "missed" in c_type or "nhỡ" in c_type
    is_ended = "end" in c_type or "kết thúc" in c_type

    if is_ended:
        hotline_3cx_service.end_current_call()
        if "text/html" in request.headers.get("accept", ""):
            return Response(
                content=f"<html><body style='font-family:sans-serif;text-align:center;padding:40px;color:#475569;'><h3>Đã kết thúc cuộc gọi {clean_ext}</h3><script>setTimeout(()=>window.close(), 1200);</script></body></html>",
                media_type="text/html",
            )
        return {"status": "call_ended", "ext": clean_ext}

    result = hotline_3cx_service.process_incoming_call(
        ext=clean_ext,
        caller_raw_text=c_name or f"Cuộc gọi {ext}",
        duty_user=duty_user,
        is_busy=False,
        is_missed=is_missed,
    )

    # Nếu được kích hoạt bởi trình duyệt mở tab Contact URL
    if "text/html" in request.headers.get("accept", ""):
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>3CX Hotline Connector</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; background: #F8FAFC; color: #1E293B; }}
        .card {{ max-width: 450px; margin: 0 auto; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #E2E8F0; }}
        .badge {{ display: inline-block; background: #DCFCE7; color: #15803D; padding: 4px 12px; border-radius: 999px; font-weight: 700; font-size: 13px; margin-bottom: 12px; }}
        h2 {{ margin: 0 0 8px 0; color: #0F172A; }}
        p {{ color: #64748B; font-size: 14px; margin: 0 0 16px 0; }}
        .close-hint {{ font-size: 12px; color: #94A3B8; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">✓ ĐÃ KẾT NỐI HỆ THỐNG</div>
        <h2>📞 Cuộc gọi Hotline: {clean_ext}</h2>
        <p>Hệ thống IT Project Management đã nhận diện cuộc gọi và đang hiển thị thông tin nhà hàng trên màn hình chính.</p>
        <div class="close-hint">Cửa sổ này sẽ tự động đóng sau 2 giây...</div>
    </div>
    <script>
        setTimeout(function() {{
            window.close();
        }}, 2000);
    </script>
</body>
</html>"""
        return Response(content=html_content, media_type="text/html")

    return {"status": "success", "call": result}


class AgentConfigPayload(BaseModel):
    server_url: str


@router.get("/agent-config")
def get_agent_config(request: Request):
    """Lấy cấu hình Server URL cho Client Agent"""
    cfg = hotline_3cx_service.get_hotline_permissions()
    configured_url = cfg.get("agent_server_url", "").strip()
    return {
        "server_url": configured_url or str(request.base_url).rstrip("/"),
        "is_custom": bool(configured_url),
    }


@router.post("/agent-config")
def update_agent_config(
    payload: AgentConfigPayload,
    current_user: UserInfo = Depends(get_current_user),
):
    """Cập nhật Server URL cho Client Agent (Dành cho Super Admin)"""
    clean_user = (current_user.username or "").strip().lower()
    if not (current_user.is_super_admin or clean_user in ["admin", "administrator", "dung.nguyenanh"]):
        raise HTTPException(status_code=403, detail="Chỉ Super Admin mới được cấu hình Server URL cho Agent.")

    cfg = hotline_3cx_service.get_hotline_permissions()
    cfg["agent_server_url"] = payload.server_url.strip().rstrip("/")
    hotline_3cx_service.save_hotline_permissions(cfg)
    return {
        "success": True,
        "server_url": cfg["agent_server_url"],
    }


CLIENT_AGENT_BAT_TEMPLATE = """@echo off
chcp 65001 >nul
title 3CX Hotline Client Agent
cls
echo ==================================================================
echo    3CX HOTLINE CLIENT AGENT - AUTO FORWARD CALLS TO SERVER
echo ==================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%config.txt"
set "PS1_FILE=%SCRIPT_DIR%3CX_Hotline_Agent.ps1"

if not exist "%PS1_FILE%" (
    echo [LOI] Khong tim thay file 3CX_Hotline_Agent.ps1!
    echo Vui long GIAI NEN toan bo file .zip ra thu muc truoc khi chay.
    echo Khong mo va nhap dup file truc tiep ben trong file nen .zip!
    echo.
    pause
    exit /b 1
)

if not exist "%CONFIG_FILE%" (
    echo SERVER_URL=__EMBEDDED_SERVER_URL__> "%CONFIG_FILE%"
    echo AGENT_USERNAME=__EMBEDDED_AGENT_USER__>> "%CONFIG_FILE%"
)

echo Dang khoi dong tien trinh ket noi 3CX...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%"
echo.
echo ==================================================================
echo Tien trinh da dung hoac ket thuc.
echo ==================================================================
pause
"""

CLIENT_AGENT_PS1_TEMPLATE = r"""param (
    [string]$ServerUrl = "",
    [string]$AgentUser = ""
)

# ==============================================================================
# 3CX HOTLINE CLIENT AGENT (PowerShell Native)
# Tu dong bat thong bao cuoc goi tu 3CX PWA tren Windows va day len Server
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try { $Host.UI.RawUI.WindowTitle = "3CX Hotline Client Agent [Dang Chay]" } catch {}

# Tu dong dong cac tien trinh Agent cu dang chay trung lap de tranh xung dot
$myPid = $PID
try {
    $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId = $myPid").ParentProcessId
    Get-CimInstance Win32_Process -Filter "Name LIKE '%powershell%'" | Where-Object {
        $_.ProcessId -ne $myPid -and $_.ProcessId -ne $parentPid -and $_.CommandLine -like "*3CX_Hotline_Agent.ps1*"
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
} catch {}

# Gia tri mac dinh duoc nhung san tu Server
$embeddedServer = "__EMBEDDED_SERVER_URL__"
$embeddedAgent  = "__EMBEDDED_AGENT_USER__"

if (-not $ServerUrl -and $embeddedServer -and -not ($embeddedServer -like "*__*")) {
    $ServerUrl = $embeddedServer
}
if (-not $AgentUser -and $embeddedAgent -and -not ($embeddedAgent -like "*__*")) {
    $AgentUser = $embeddedAgent
}

# Doc file config.txt cung thu muc neu co (uu tien config.txt khi nguoi dung can sua)
$scriptDir = if ($PSScriptRoot) { 
    $PSScriptRoot 
} elseif ($MyInvocation -and $MyInvocation.MyCommand -and $MyInvocation.MyCommand.Path) { 
    Split-Path -Parent $MyInvocation.MyCommand.Path 
} else { 
    (Get-Location).Path 
}
if (-not $scriptDir) {
    $scriptDir = [System.AppDomain]::CurrentDomain.BaseDirectory
}
$configFile = Join-Path $scriptDir "config.txt"
$logFile = Join-Path $scriptDir "agent_activity.log"

Function Log-Activity($msg) {
    $t = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$t] $msg"
    Write-Host $line
    try { Add-Content -Path $logFile -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue } catch {}
}

if (Test-Path $configFile) {
    Get-Content $configFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -match "^SERVER_URL\s*=\s*(.+)$") {
            $val = $matches[1].Trim()
            if ($val) { $ServerUrl = $val }
        }
        if ($line -match "^(?:AGENT_USERNAME|DUTY_USER|USERNAME)\s*=\s*(.+)$") {
            $val = $matches[1].Trim()
            if ($val) { $AgentUser = $val }
        }
    }
}

# Neu van chua co AgentUser, lay username Windows hien tai
if (-not $AgentUser) {
    $AgentUser = $env:USERNAME
}

# Neu hoan toan chua co ServerUrl thi moi hoi nguoi dung
if (-not $ServerUrl) {
    Write-Host "Vui lòng nhập địa chỉ Server (ví dụ: http://14.161.33.122:5001):" -ForegroundColor Yellow
    try { $ServerUrl = Read-Host "Server URL" } catch {}
    if ($ServerUrl) {
        $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
        Set-Content -Path $configFile -Value "SERVER_URL=$ServerUrl`nAGENT_USERNAME=$AgentUser" -Encoding UTF8
    } else {
        Write-Host "Không có Server URL, dừng chương trình." -ForegroundColor Red
        Start-Sleep -Seconds 3
        exit 1
    }
} else {
    $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
}

try { Clear-Host } catch {}
Log-Activity "=================================================================="
Log-Activity "   3CX HOTLINE CLIENT AGENT — TỰ ĐỘNG BẮT CUỘC GỌI TỪ 3CX PWA    "
Log-Activity "=================================================================="
Log-Activity "-> Server nhận sự kiện: $ServerUrl"
Log-Activity "-> Người trực máy:       $AgentUser (Windows: $($env:USERNAME))"
Log-Activity "-> Đang kết nối tới Windows UserNotificationListener..."

# Nạp Windows Runtime cho Notification Listener
try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.IsGenericMethod })[0]
    Function Await($t, $r) {
        $asTask = $asTaskGeneric.MakeGenericMethod($r)
        $netTask = $asTask.Invoke($null, @($t))
        $netTask.Wait(-1) | Out-Null
        $netTask.Result
    }
    [Windows.UI.Notifications.Management.UserNotificationListener, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    [Windows.UI.Notifications.NotificationKinds, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    [Windows.UI.Notifications.KnownNotificationBindings, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    [Windows.UI.Notifications.UserNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    $access = Await ($listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
} catch {
    Log-Activity "[LỖI KHỞI TẠO] Không thể kích hoạt Windows Notification API: $_"
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "KHÔNG THỂ KÍCH HOẠT WINDOWS NOTIFICATION API:`n`n$_`n`nVui lòng đảm bảo bạn đang dùng Windows 10/11.",
            "3CX Hotline Agent - Lỗi Khởi Tạo",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    } catch {}
    Start-Sleep -Seconds 3
    exit 1
}

if ($access -ne "Allowed") {
    Log-Activity "[CẢNH BÁO] Quyền truy cập thông báo Windows bị từ chối ($access)."
    Log-Activity "Vui lòng mở Windows Settings -> Privacy & security -> Notifications và BẬT 'ON'."
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "CẢNH BÁO: Quyền truy cập thông báo Windows đang bị TẮT ($access)!`n`nĐể 3CX Agent nhận được cuộc gọi, vui lòng vào:`nWindows Settings -> Privacy & security -> Notifications và BẬT 'ON'.",
            "3CX Hotline Agent - Cảnh Báo Quyền",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
    } catch {}
    Start-Sleep -Seconds 3
    exit 1
}

Log-Activity "-> Kết nối Windows Notification API: THÀNH CÔNG!"
Log-Activity "-> ĐANG CHẠY NGẦM: Tự động lắng nghe cuộc gọi đến và nhỡ..."

# Kiểm tra kết nối tới Server
try {
    $testResp = Invoke-RestMethod -Uri "$ServerUrl/api/v1/hotline/status" -Method Get -TimeoutSec 4
    Log-Activity "[OK] Đã kiểm tra kết nối Server: OK (Hotline status ready)"
} catch {
    Log-Activity "[CẢNH BÁO] Chưa kết nối được Server $ServerUrl : $_"
}

$seen_keys = [System.Collections.Generic.HashSet[string]]::new()
$cutoff = (Get-Date).AddMinutes(-2)

# Đọc thông báo 2 phút gần đây để đánh dấu tránh trigger lại cuộc gọi cũ khi vừa mở agent
try {
    $initial = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
    foreach ($n in $initial) {
        $b = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
        $texts = if ($b) { ($b.GetTextElements() | ForEach-Object { $_.Text }) -join " // " } else { "" }
        $key = "$($n.Id)_$texts"
        if ($n.CreationTime.DateTime -lt $cutoff) {
            [void]$seen_keys.Add($key)
        }
    }
} catch {}

Function Send-CallEvent($ext, $callerText, $isMissed, $isEnded) {
    if ($isEnded) {
        try {
            $endUrl = "$ServerUrl/api/v1/hotline/end-call"
            Invoke-RestMethod -Uri $endUrl -Method Post -TimeoutSec 3 | Out-Null
            Log-Activity "-> Đã báo kết thúc cuộc gọi lên Server."
        } catch {}
        return
    }

    $payload = @{
        ext = $ext
        caller_raw_text = $callerText
        duty_user = $AgentUser
        is_busy = $false
        is_missed = $isMissed
    } | ConvertTo-Json -Compress

    try {
        $eventUrl = "$ServerUrl/api/v1/hotline/call-event"
        $utf8Bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
        $resp = Invoke-RestMethod -Uri $eventUrl -Method Post -Body $utf8Bytes -ContentType "application/json; charset=utf-8" -TimeoutSec 5
        $typeLabel = if ($isMissed) { "CUỘC GỌI NHỠ" } else { "CUỘC GỌI ĐẾN" }
        Log-Activity "[$typeLabel] Đã đẩy lên Server thành công! Line: $ext | Caller: '$callerText'"
    } catch {
        Log-Activity "[LỖI GỬI SERVER] Không thể gửi cuộc gọi Line $ext tới $ServerUrl : $_"
    }
}

# Vòng lặp lắng nghe liên tục mỗi 300ms
while ($true) {
    try {
        Start-Sleep -Milliseconds 300
        $current = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
        foreach ($n in $current) {
            $app = $n.AppInfo.DisplayInfo.DisplayName
            if ($app -like "*3CX*" -or $app -like "*Chrome*" -or $app -like "*Edge*" -or $app -like "*Brave*") {
                $b = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
                $texts = if ($b) { ($b.GetTextElements() | ForEach-Object { $_.Text }) -join " // " } else { "" }
                $key = "$($n.Id)_$texts"
                if (-not $seen_keys.Contains($key)) {
                    [void]$seen_keys.Add($key)

                    $parts = $texts.Split(@(" // "), [System.StringSplitOptions]::RemoveEmptyEntries)
                    $header = if ($parts.Length -gt 0) { $parts[0].Trim() } else { "" }
                    $caller = if ($parts.Length -gt 1) { $parts[1].Trim() } else { $header }

                    $hLow = $header.ToLower()
                    $cLow = $caller.ToLower()

                    if (-not ($hLow -match "call|cuộc gọi|incoming|missed|ended|ringing" -or $cLow -match "call|cuộc gọi|incoming|missed")) {
                        continue
                    }

                    $isIncoming = ($hLow -match "incoming call|cuộc gọi đến|incoming|ringing")
                    $isMissed = ($hLow -match "missed call|cuộc gọi nhỡ|missed|nhỡ")
                    $isEnded = ($hLow -match "call ended|kết thúc|ended")

                    # Tìm số EXT trong caller
                    $match = [regex]::Match($caller, "\b(\d{2,12})\b")
                    $ext = if ($match.Success) { $match.Groups[1].Value } else { "EXT_3CX" }

                    if ($isIncoming) {
                        Send-CallEvent $ext $caller $false $false
                    } elseif ($isMissed) {
                        Send-CallEvent $ext $caller $true $false
                    } elseif ($isEnded) {
                        Send-CallEvent $ext $caller $false $true
                    }
                }
            }
        }
    } catch {
        Log-Activity "[LỖI VÒNG LẶP] $_"
        Start-Sleep -Milliseconds 1000
    }
}
"""

CLIENT_AGENT_README_TEMPLATE = """HƯỚNG DẪN SỬ DỤNG 3CX HOTLINE CLIENT AGENT
==================================================================

1. MỤC ĐÍCH:
- Khi hệ thống Web được đưa lên Máy Chủ (Server), cuộc gọi 3CX PWA đổ chuông trên máy tính của bạn (Client).
- Tool này chạy ngầm trên máy tính của bạn, tự động bắt thông báo Toast khi có cuộc gọi đến hoặc cuộc gọi nhỡ từ 3CX PWA và đẩy tức thì lên Server.
- Toàn bộ các máy tính đang mở Web sẽ lập tức nhận được popup kết nối VNC/KDS từ xa!

2. CÁCH SỬ DỤNG:
- Bước 1: Nhấp đúp chuột vào file: "Run_3CX_Hotline_Agent.bat" (hoặc "Khoi_Dong_Lai_Agent.bat" để chạy ngầm).
- Bước 2: File đã được cấu hình sẵn kết nối tới Server {SERVER_URL}.
- Bước 3: Cửa sổ thông báo "KẾT NỐI THÀNH CÔNG" và chuyển sang chế độ "ĐANG CHẠY NGẦM".
- Bạn chỉ cần thu nhỏ (Minimize) cửa sổ này xuống thanh Taskbar và làm việc bình thường.

3. LƯU Ý QUAN TRỌNG:
- Yêu cầu Windows 10 hoặc Windows 11.
- Đảm bảo trong Windows Settings: Settings -> Privacy & security -> Notifications đang ở chế độ BẬT (ON).
- Nếu không thấy popup khi có cuộc gọi: Hãy chạy trực tiếp file "Run_3CX_Hotline_Agent.bat" để xem báo lỗi cụ thể.
- ĐẶC BIỆT: Nếu bạn đã cấu hình URL trực tiếp trong 3CX (Custom CRM), bạn KHÔNG CẦN chạy tool này nữa!
"""


CLIENT_AGENT_STOP_BAT_TEMPLATE = """@echo off
chcp 65001 >nul
title Dung toan bo tien trinh 3CX Hotline Client Agent

echo ==================================================================
echo   DON DEP VA DUNG TOAN BO TIEN TRINH 3CX HOTLINE CLIENT AGENT
echo ==================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'powershell|wscript|cscript') -and ($_.CommandLine -like '*3CX_Hotline_Agent*' -or $_.CommandLine -like '*Run_Silent_Agent*') }; if ($procs) { $procs | ForEach-Object { Write-Host ('-> Dang dung PID ' + $_.ProcessId + ': ' + $_.Name) -ForegroundColor Yellow; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Write-Host '-> Da dung cac tien trinh 3CX Agent thanh cong!' -ForegroundColor Green } else { Write-Host '-> Khong co tien trinh 3CX Agent nao dang chay ngam.' -ForegroundColor Green }"

echo.
echo ==================================================================
echo DA DON DEP SACH SE 100%% CAC TIEN TRINH 3CX CHAY NGAM!
echo ==================================================================
echo.
pause
"""

CLIENT_AGENT_RESTART_BAT_TEMPLATE = """@echo off
chcp 65001 >nul
title Khoi dong lai 3CX Hotline Client Agent

echo ==================================================================
echo   KHOI DONG LAI 3CX HOTLINE CLIENT AGENT (LAM SACH VA CHAY MOI)
echo ==================================================================
echo.

echo 1. Dang dung tat ca tien trinh 3CX Agent cu...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'powershell|wscript|cscript') -and ($_.CommandLine -like '*3CX_Hotline_Agent*' -or $_.CommandLine -like '*Run_Silent_Agent*') }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"

echo 2. Dang khoi chay tien trinh Agent moi...
set "SCRIPT_DIR=%~dp0"
set "VBS_FILE=%SCRIPT_DIR%Run_Silent_Agent.vbs"
set "PS1_FILE=%SCRIPT_DIR%3CX_Hotline_Agent.ps1"

if not exist "%PS1_FILE%" (
    echo.
    echo ==================================================================
    echo [LOI] Khong tim thay file 3CX_Hotline_Agent.ps1!
    echo Vui long GIAI NEN toan bo file .zip ra thu muc truoc khi chay!
    echo ==================================================================
    echo.
    pause
    exit /b 1
)

REM Khoi chay ngam qua VBScript hoac truc tiep qua PowerShell Hidden
if exist "%VBS_FILE%" (
    wscript.exe "%VBS_FILE%"
)

timeout /t 2 >nul

REM Du phong: Neu he thong chan VBScript, khoi chay truc tiep bang PowerShell Hidden
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3CX_Hotline_Agent*' }; if (-not $p) { Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%PS1_FILE%""' -WindowStyle Hidden }"

timeout /t 2 >nul

echo 3. Kiem tra trang thai khoi dong...
if exist "%SCRIPT_DIR%agent_activity.log" (
    echo.
    echo Nhat ky khoi dong gan nhat:
    powershell.exe -NoProfile -Command "Get-Content '%SCRIPT_DIR%agent_activity.log' -Tail 6"
)

echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3CX_Hotline_Agent*' }; if ($p) { Write-Host '==================================================================' -ForegroundColor Green; Write-Host 'HOAN TAT! Tien trinh dang chay ngam on dinh (PID ' $p.ProcessId ').' -ForegroundColor Green; Write-Host '==================================================================' -ForegroundColor Green } else { Write-Host '==================================================================' -ForegroundColor Red; Write-Host '[CANH BAO] TIEN TRINH CHAY NGAM CHUA KHOI DONG THANH CONG!' -ForegroundColor Red; Write-Host '-> Nguyen nhan: Co the do Windows chan Notifications hoac thieu quyen.' -ForegroundColor Yellow; Write-Host '-> HUONG DAN: Vui long nhap dup vao file Run_3CX_Hotline_Agent.bat de xem loi chi tiet!' -ForegroundColor Yellow; Write-Host '==================================================================' -ForegroundColor Red }"
echo.
pause
"""


CLIENT_AGENT_VBS_TEMPLATE = (
    'Set WshShell = CreateObject("WScript.Shell")\r\n'
    'scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)\r\n'
    'ps1File = scriptDir & "\\3CX_Hotline_Agent.ps1"\r\n'
    'WshShell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1File & """", 0, False\r\n'
)


@router.get("/download-agent")
def download_client_agent(
    request: Request,
    server_url: Optional[str] = Query(None),
    agent_username: Optional[str] = Query(None),
):
    """
    Tải gói 3CX Hotline Client Agent (.zip) cho máy tính cá nhân của Kỹ thuật viên (Client).
    Tự động nhúng sẵn Server URL và Tên người trực đã cấu hình để kỹ thuật viên tải về mở chạy ngay.
    Đảm bảo 100% nội dung các file BAT, PS1, VBS, README luôn đầy đủ kể cả khi chạy phân tán trên server.
    """
    cfg = hotline_3cx_service.get_hotline_permissions()
    configured_url = cfg.get("agent_server_url", "").strip()
    base_url = (server_url or configured_url or str(request.base_url)).rstrip("/")
    clean_user = (agent_username or "").strip()

    # Lấy nội dung mẫu đã nhúng sẵn SERVER_URL và AGENT_USERNAME
    bat_content = CLIENT_AGENT_BAT_TEMPLATE.replace("__EMBEDDED_SERVER_URL__", base_url).replace("__EMBEDDED_AGENT_USER__", clean_user)
    ps1_content = CLIENT_AGENT_PS1_TEMPLATE.replace("__EMBEDDED_SERVER_URL__", base_url).replace("__EMBEDDED_AGENT_USER__", clean_user)
    readme_content = CLIENT_AGENT_README_TEMPLATE.replace("{SERVER_URL}", base_url)
    config_content = f"SERVER_URL={base_url}\nAGENT_USERNAME={clean_user}\n"

    # Đóng gói zip in-memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("config.txt", config_content.encode("utf-8"))
        z.writestr("Run_3CX_Hotline_Agent.bat", bat_content.encode("utf-8"))
        z.writestr("Run_Silent_Agent.vbs", CLIENT_AGENT_VBS_TEMPLATE.encode("utf-8"))
        z.writestr("Dung_Toan_Bo_Agent.bat", CLIENT_AGENT_STOP_BAT_TEMPLATE.encode("utf-8"))
        z.writestr("Khoi_Dong_Lai_Agent.bat", CLIENT_AGENT_RESTART_BAT_TEMPLATE.encode("utf-8"))
        z.writestr("3CX_Hotline_Agent.ps1", ps1_content.encode("utf-8"))
        z.writestr("README_HUONG_DAN.txt", readme_content.encode("utf-8"))

    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=3CX_Hotline_Client_Agent.zip"
        }
    )


@router.get("/download-extension")
def download_chrome_extension(request: Request, server_url: Optional[str] = Query(None)):
    """
    Tải gói Google Chrome Extension (.zip) để cài đặt trực tiếp vào trình duyệt Chrome.
    Bắt sự kiện cuộc gọi 3CX trên tab https://ggg.ringbot.co:5001 mà KHÔNG CẦN CHẠY FILE .BAT.
    """
    cfg = hotline_3cx_service.get_hotline_permissions()
    configured_url = cfg.get("agent_server_url", "").strip()
    base_url = (server_url or configured_url or str(request.base_url)).rstrip("/")

    ext_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../tools/3cx_chrome_extension"))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        if os.path.exists(ext_dir):
            for fname in os.listdir(ext_dir):
                fpath = os.path.join(ext_dir, fname)
                if os.path.isfile(fpath):
                    with open(fpath, "rb") as f:
                        file_bytes = f.read()
                    # Nhúng base_url vào popup.js và content.js nếu có
                    if fname in ["popup.js", "content.js"]:
                        text = file_bytes.decode("utf-8", errors="ignore")
                        text = text.replace("http://localhost:8000", base_url)
                        file_bytes = text.encode("utf-8")
                    z.writestr(fname, file_bytes)
        else:
            z.writestr("README.txt", f"Extension folder not found at {ext_dir}".encode("utf-8"))

    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={
            "Content-Disposition": "attachment; filename=3CX_Chrome_Extension.zip"
        }
    )


@router.get("/download-userscript")
def download_userscript(request: Request, server_url: Optional[str] = Query(None)):
    """
    Tải trực tiếp file Userscript (Tampermonkey) để bắt cuộc gọi 3CX chỉ với 1-click.
    """
    cfg = hotline_3cx_service.get_hotline_permissions()
    configured_url = cfg.get("agent_server_url", "").strip()
    base_url = (server_url or configured_url or str(request.base_url)).rstrip("/")

    us_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../tools/3cx_hotline_userscript.user.js"))
    if os.path.exists(us_path):
        with open(us_path, "r", encoding="utf-8") as f:
            content = f.read()
        content = content.replace("http://localhost:8000", base_url)
    else:
        content = f"// Userscript not found\nconst serverUrl = '{base_url}';"

    return Response(
        content=content.encode("utf-8"),
        media_type="text/javascript",
        headers={
            "Content-Disposition": "attachment; filename=3cx_hotline_userscript.user.js"
        }
    )


@router.post("/simulate-call")
def simulate_call(req: SimulateCallRequest):
    """
    Giả lập một cuộc gọi đến để kiểm thử (Test Simulation).
    """
    result = hotline_3cx_service.process_incoming_call(
        ext=req.ext.strip(),
        caller_raw_text=req.caller_raw_text or f"Giả lập gọi từ {req.ext}",
        duty_user=req.duty_user,
        is_busy=bool(req.is_busy),
        is_missed=bool(req.is_missed),
    )
    return {"success": True, "simulated_call": result}


@router.api_route("/end-call", methods=["GET", "POST"])
async def end_current_active_call(
    request: Request,
    call_id: Optional[int] = Query(None),
):
    """Khai báo cuộc gọi hiện tại đã kết thúc để sẵn sàng đón cuộc gọi mới"""
    cid = call_id
    if cid is None and request.method == "POST":
        try:
            body = await request.json()
            if isinstance(body, dict):
                cid = body.get("call_id") or body.get("id")
        except Exception:
            pass
    hotline_3cx_service.end_current_call(cid)
    return {"success": True, "message": "Đã kết thúc cuộc gọi."}


@router.get("/missed-calls")
def get_missed_calls_list(
    unresolved_only: bool = Query(True),
    limit: int = Query(50),
    username: Optional[str] = Query(None),
    all_agents: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user_flexible),
):
    """Lấy danh sách các cuộc gọi nhỡ / bận (cho modal dấu chấm than (!))"""
    effective_user = username or current_user.username
    items = hotline_3cx_service.get_missed_calls(
        db,
        unresolved_only=unresolved_only,
        limit=limit,
        current_username=effective_user,
        all_agents=all_agents,
    )
    return {
        "total": len(items),
        "items": items,
    }



@router.post("/missed-calls/{call_id}/resolve")
def resolve_single_call(
    call_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user_flexible),
):
    """Đánh dấu một cuộc gọi nhỡ là Done (Đã gọi lại NH)"""
    resolved_by = current_user.full_name or current_user.username or "IT Hotline"
    success = hotline_3cx_service.resolve_single_missed_call(db, call_id=call_id, resolved_by=resolved_by)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc gọi.")
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="UPDATE",
            mo_ta=f"Xử lý hoàn tất cuộc gọi nhỡ Hotline (ID={call_id})",
            current_user=current_user,
        )
    except Exception:
        pass
    return {"success": True, "call_id": call_id}


@router.post("/missed-calls/resolve-all")
def resolve_all_calls(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user_flexible),
):
    """Đánh dấu các cuộc gọi nhỡ của Agent hiện tại là Done (Check All đóng hàng loạt)"""
    resolved_by = current_user.full_name or current_user.username or "IT Hotline"
    count = hotline_3cx_service.resolve_all_missed_calls(
        db,
        resolved_by=resolved_by,
        current_username=current_user.username,
    )
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="UPDATE",
            mo_ta=f"Xử lý hoàn tất các cuộc gọi nhỡ Hotline của Agent {resolved_by} ({count} cuộc gọi)",
            current_user=current_user,
        )
    except Exception:
        pass
    return {"success": True, "resolved_count": count}


@router.get("/answered-calls")
def get_answered_calls_list(
    limit: int = Query(100),
    username: Optional[str] = Query(None),
    all_agents: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user_flexible),
):
    """Lấy danh sách các cuộc gọi tới đã nghe (Tab 2: Lịch sử cuộc gọi tới đã nghe theo Agent)"""
    effective_user = username or current_user.username
    items = hotline_3cx_service.get_answered_calls(
        db,
        limit=limit,
        current_username=effective_user,
        all_agents=all_agents,
    )
    return {
        "total": len(items),
        "items": items,
    }


@router.post("/answered-calls/{call_id}/mark")
def mark_call_as_answered(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user_flexible),
):
    """Đánh dấu cuộc gọi là đã nghe (khi mở modal kết nối VNC/KDS)"""
    duty_user = current_user.full_name or current_user.username or "IT Hotline"
    success = hotline_3cx_service.mark_call_answered(db, call_id=call_id, duty_user=duty_user)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc gọi.")
    return {"success": True, "call_id": call_id}


class HotlinePermissionsPayload(BaseModel):
    enabled_roles: List[str] = ["admin", "helpdesk"]
    allowed_users: List[str] = ["dung.nguyenanh", "admin"]
    allow_all: bool = False


@router.get("/permissions")
def get_permissions_config(db: Session = Depends(get_db)):
    """Lấy cấu hình phân quyền trực hotline và danh sách nhân viên để chọn phân quyền"""
    from app.models.user import User
    users = db.query(User).filter(User.active == True).order_by(User.full_name).all()
    user_list = [
        {
            "id": u.id,
            "username": u.user_name1,
            "full_name": u.full_name or u.user_name1,
            "email": u.email,
            "phanquyen": u.phanquyen,
        }
        for u in users if u.user_name1
    ]
    cfg = hotline_3cx_service.get_hotline_permissions()
    return {
        "config": cfg,
        "available_users": user_list,
        "available_roles": [
            {"code": "admin", "label": "Quản trị viên (Admin)"},
            {"code": "helpdesk", "label": "IT Helpdesk (Hỗ trợ IT)"},
            {"code": "app", "label": "IT Application (Quyền App)"},
            {"code": "inventory", "label": "Quyền Inventory (Kiểm kê)"},
        ],
    }


@router.post("/permissions")
def update_permissions_config(
    payload: HotlinePermissionsPayload,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Cập nhật phân quyền trực hotline (Dành cho Super Admin và dung.nguyenanh)"""
    saved = hotline_3cx_service.save_hotline_permissions(payload.dict())
    try:
        LogService.record_log(
            db=db,
            nhom_quyen="HELPDESK",
            hanh_dong="UPDATE",
            mo_ta="Cập nhật cấu hình phân quyền trực Hotline 3CX",
            current_user=current_user,
        )
    except Exception:
        pass
    return {"success": True, "config": saved}


@router.get("/check-permission")
def check_user_permission(
    username: Optional[str] = Query(None),
    roles: Optional[str] = Query(None),
    is_super_admin: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Kiểm tra quyền trực hotline của user hiện tại"""
    role_list = [r.strip().lower() for r in (roles or "").split(",") if r.strip()]
    can_access = hotline_3cx_service.check_user_hotline_access(
        username=username,
        role_codes=role_list,
        is_super_admin=is_super_admin,
        db=db,
    )
    can_manage = is_super_admin or (username or "").strip().lower() in ["admin", "administrator", "dung.nguyenanh"]
    return {
        "can_access": can_access,
        "can_manage": can_manage,
    }


@router.get("/tampermonkey.user.js")
def get_tampermonkey_script(
    request: Request,
    duty_user: Optional[str] = Query(None),
):
    """
    Tải file Userscript (Tampermonkey) tự động điền URL server và username.
    Khi người dùng đã cài Tampermonkey và bấm link này, Tampermonkey sẽ mở giao diện Cài Đặt (Install) 1 chạm.
    """
    base_url = str(request.base_url).rstrip("/")
    api_endpoint = f"{base_url}/api/v1/hotline/call-event"
    default_user = (duty_user or "").strip()

    script_content = f"""// ==UserScript==
// @name         3CX Web Hotline Auto-Sync
// @namespace    http://ggg.com.vn/
// @version      2.1
// @description  Tu dong bat cuoc goi tu 3CX Web va dong bo len he thong IT Project Management
// @match        https://ggg.ringbot.co:5001/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {{
    'use strict';

    const SERVER_URL = "{api_endpoint}";
    const DEFAULT_DUTY_USER = "{default_user}";

    let lastDetectedKey = "";
    let lastDetectedTime = 0;

    function getDutyUser() {{
        return localStorage.getItem("it_hotline_duty_user") || DEFAULT_DUTY_USER;
    }}

    setInterval(() => {{
        try {{
            const bodyText = document.body ? document.body.innerText : "";
            // Kiem tra dau hieu cuoc goi den: chu incoming, nut tra loi, dialer hoac audio dang reo
            const hasIncomingSignal = /incoming|cuộc gọi đến|ringing|đang gọi/i.test(bodyText) ||
                document.querySelector("button[title*='Answer' i], button[title*='Trả lời' i], button[aria-label*='Answer' i], button[aria-label*='Trả lời' i], .btn-answer, .call-btn-answer, [class*='incoming' i], [class*='ringing' i]") ||
                Array.from(document.querySelectorAll("audio")).some(a => !a.paused);

            if (!hasIncomingSignal) return;

            // Quet so may le nha hang trong cum thong bao cuoc goi
            const activeCallContainer = document.querySelector("[class*='incoming' i], [class*='call' i], [class*='dialog' i], body");
            const scanText = activeCallContainer ? activeCallContainer.innerText : bodyText;
            const matches = scanText.match(/\\b(\\d{{2,12}})\\b/g) || [];
            const restaurantExt = matches.find(m => m.length >= 2 && m.length <= 6 && m !== "5001");

            if (restaurantExt) {{
                const now = Date.now();
                const callKey = restaurantExt;

                if (callKey !== lastDetectedKey || (now - lastDetectedTime > 6000)) {{
                    lastDetectedKey = callKey;
                    lastDetectedTime = now;
                    const dutyUser = getDutyUser();

                    console.log("[3CX-Hotline-Sync] Phat hien cuoc goi EXT:", restaurantExt, "DutyUser:", dutyUser);

                    GM_xmlhttpRequest({{
                        method: "POST",
                        url: SERVER_URL,
                        headers: {{ "Content-Type": "application/json" }},
                        data: JSON.stringify({{
                            ext: restaurantExt,
                            caller_raw_text: "3CX Web (" + restaurantExt + ")",
                            duty_user: dutyUser,
                            is_busy: false
                        }}),
                        onload: function(response) {{
                            console.log("[3CX-Hotline-Sync] Da gui thanh cong len Server:", response.status);
                        }},
                        onerror: function(err) {{
                            console.warn("[3CX-Hotline-Sync] Loi gui len Server:", err);
                        }}
                    }});
                }}
            }}
        }} catch (e) {{
            console.error("[3CX-Hotline-Sync] Error in scanner:", e);
        }}
    }}, 500);
}})();
"""
    return Response(
        content=script_content,
        media_type="application/javascript",
        headers={
            "Content-Disposition": 'inline; filename="3cx_hotline_sync.user.js"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
    )

