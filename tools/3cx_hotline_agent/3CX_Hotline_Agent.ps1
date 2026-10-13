param (
    [string]$ServerUrl = "http://14.161.33.122:5001",
    [string]$AgentUser = "dung.nguyenanh"
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
    Get-CimInstance Win32_Process -Filter "Name LIKE '%powershell%'" | Where-Object {
        $_.ProcessId -ne $myPid -and $_.CommandLine -like "*3CX_Hotline_Agent.ps1*"
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
} catch {}

# Neu khong truyen qua tham so, doc file config.txt cung thu muc
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configFile = Join-Path $scriptDir "config.txt"

if (Test-Path $configFile) {
    Get-Content $configFile | ForEach-Object {
        $line = $_.Trim()
        if (-not $ServerUrl -or $ServerUrl -eq "") {
            if ($line -match "^SERVER_URL\s*=\s*(.+)$") {
                $ServerUrl = $matches[1].Trim()
            }
        }
        if (-not $AgentUser -or $AgentUser -eq "") {
            if ($line -match "^(?:AGENT_USERNAME|DUTY_USER|USERNAME)\s*=\s*(.+)$") {
                $AgentUser = $matches[1].Trim()
            }
        }
    }
}

if (-not $AgentUser) {
    $AgentUser = $env:USERNAME
}

if (-not $ServerUrl) {
    Write-Host "Vui lòng nhập địa chỉ Server (ví dụ: http://192.168.1.50:8000 hoặc https://itpm.ggg.com.vn):" -ForegroundColor Yellow
    $ServerUrl = Read-Host "Server URL"
    if ($ServerUrl) {
        $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
        Set-Content -Path $configFile -Value "SERVER_URL=$ServerUrl`nAGENT_USERNAME=$AgentUser" -Encoding UTF8
    } else {
        Write-Host "Không có Server URL, dừng chương trình." -ForegroundColor Red
        exit 1
    }
} else {
    $ServerUrl = $ServerUrl.Trim().TrimEnd('/')
}

try { Clear-Host } catch {}
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "   3CX HOTLINE CLIENT AGENT — TỰ ĐỘNG BẮT CUỘC GỌI TỪ 3CX PWA    " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "-> Server nhận sự kiện: $ServerUrl" -ForegroundColor Green
Write-Host "-> Người trực máy:       $AgentUser (Windows: $($env:USERNAME))" -ForegroundColor Gray
Write-Host "-> Đang kết nối tới Windows UserNotificationListener..." -ForegroundColor Gray

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
    $listener = [Windows.UI.Notifications.Management.UserNotificationListener]::Current
    $access = Await ($listener.RequestAccessAsync()) ([Windows.UI.Notifications.Management.UserNotificationListenerAccessStatus])
} catch {
    Write-Host "[LỖI KHỞI TẠO] Không thể kích hoạt Windows Notification API: $_" -ForegroundColor Red
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

if ($access -ne "Allowed") {
    Write-Host ""
    Write-Host "[CẢNH BÁO] Quyền truy cập thông báo Windows bị từ chối ($access)." -ForegroundColor Red
    Write-Host "Vui lòng mở Windows Settings -> Privacy & security -> Notifications và BẬT 'ON'." -ForegroundColor Yellow
    Read-Host "Nhấn Enter để thoát..."
    exit 1
}

Write-Host "-> Kết nối Windows Notification API: THÀNH CÔNG!" -ForegroundColor Green
Write-Host "-> ĐANG CHẠY NGẦM: Tự động lắng nghe cuộc gọi đến và nhỡ..." -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------" -ForegroundColor DarkGray

# Kiểm tra kết nối tới Server
try {
    $testResp = Invoke-RestMethod -Uri "$ServerUrl/api/v1/hotline/status" -Method Get -TimeoutSec 4
    Write-Host "[OK] Đã kiểm tra kết nối Server: OK (Hotline status ready)" -ForegroundColor Green
} catch {
    Write-Host "[CẢNH BÁO] Chưa kết nối được Server $ServerUrl (Server có thể đang khởi động hoặc sai IP): $_" -ForegroundColor Yellow
}
Write-Host "------------------------------------------------------------------" -ForegroundColor DarkGray

$seen_keys = [System.Collections.Generic.HashSet[string]]::new()
$cutoff = (Get-Date).AddMinutes(-5)

# Đọc thông báo 5 phút gần đây để tránh trigger lại cuộc gọi cũ khi vừa mở agent
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
    $timeStr = (Get-Date).ToString("HH:mm:ss")
    if ($isEnded) {
        try {
            $endUrl = "$ServerUrl/api/v1/hotline/end-call"
            Invoke-RestMethod -Uri $endUrl -Method Post -TimeoutSec 3 | Out-Null
            Write-Host "[$timeStr] -> Đã báo kết thúc cuộc gọi lên Server." -ForegroundColor DarkGray
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
        Write-Host "[$timeStr] [$typeLabel] Đã đẩy lên Server thành công! Line: $ext | Caller: '$callerText'" -ForegroundColor Green
    } catch {
        Write-Host "[$timeStr] [LỖI GỬI SERVER] Không thể gửi cuộc gọi Line $ext tới $ServerUrl : $_" -ForegroundColor Red
    }
}

# Vòng lặp lắng nghe liên tục mỗi 300ms
while ($true) {
    try {
        Start-Sleep -Milliseconds 300
        $current = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
        foreach ($n in $current) {
            $app = $n.AppInfo.DisplayInfo.DisplayName
            if ($app -like "*3CX*" -or $app -like "*Chrome*") {
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
        Start-Sleep -Milliseconds 500
    }
}
