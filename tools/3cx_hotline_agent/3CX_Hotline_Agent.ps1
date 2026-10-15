param (
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
$embeddedServer = "http://14.161.33.122:5001"
$embeddedAgent  = "dung.nguyenanh"

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
$winUser = $env:USERNAME
Log-Activity "=================================================================="
Log-Activity "   3CX HOTLINE CLIENT AGENT - TU DONG BAT CUOC GOI TU 3CX PWA    "
Log-Activity "=================================================================="
Log-Activity "-> Server nhan su kien: $ServerUrl"
Log-Activity "-> Nguoi truc may:       $AgentUser [Windows User: $winUser]"
Log-Activity "-> Dang ket noi toi Windows UserNotificationListener..."

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
    Log-Activity "[LOI KHOI TAO] Khong the kich hoat Windows Notification API: $_"
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
    Log-Activity "[CANH BAO] Quyen truy cap thong bao Windows bi tu choi ($access)."
    Log-Activity "Vui long mo Windows Settings -> Privacy & security -> Notifications va BAT 'ON'."
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

Log-Activity "-> Ket noi Windows Notification API: THANH CONG!"
Log-Activity "-> DANG CHAY NGAM: Tu dong lang nghe cuoc goi den va nho..."

# Kiểm tra kết nối tới Server
try {
    $testResp = Invoke-RestMethod -Uri "$ServerUrl/api/v1/hotline/status" -Method Get -TimeoutSec 4
    Log-Activity "[OK] Da kiem tra ket noi Server: OK (Hotline status ready)"
} catch {
    Log-Activity "[CANH BAO] Chua ket noi duoc Server $ServerUrl : $_"
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
            Log-Activity "-> Da bao ket thuc cuoc goi len Server."
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
        $typeLabel = if ($isMissed) { "CUOC GOI NHO" } else { "CUOC GOI DEN" }
        Log-Activity "[$typeLabel] Da day len Server thanh cong! Line: $ext | Caller: '$callerText'"
    } catch {
        Log-Activity "[LOI GUI SERVER] Khong the gui cuoc goi Line $ext toi $ServerUrl : $_"
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

                    if (-not ($hLow -match "call|cuộc gọi|cuoc goi|incoming|missed|ended|ringing" -or $cLow -match "call|cuộc gọi|cuoc goi|incoming|missed")) {
                        continue
                    }

                    $isIncoming = ($hLow -match "incoming call|cuộc gọi đến|cuoc goi den|incoming|ringing")
                    $isMissed = ($hLow -match "missed call|cuộc gọi nhỡ|cuoc goi nho|missed|nhỡ|nho")
                    $isEnded = ($hLow -match "call ended|kết thúc|ket thuc|ended")

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
        Log-Activity "[LOI VONG LAP] $_"
        Start-Sleep -Milliseconds 1000
    }
}
