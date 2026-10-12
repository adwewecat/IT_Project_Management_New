# 3CX Windows Toast Notification Listener (PowerShell Stream Worker)
# Sử dụng Windows Runtime UserNotificationListener để bắt chính xác các sự kiện thông báo cuộc gọi từ 3CX PWA
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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

if ($access -ne "Allowed") {
    [Console]::WriteLine((ConvertTo-Json @{ error = "Access denied" } -Compress))
    [Console]::Out.Flush()
    exit 1
}

$seen_keys = [System.Collections.Generic.HashSet[string]]::new()
$cutoff = (Get-Date).AddHours(-2)

# Khởi tạo: kiểm tra các thông báo gần nhất từ 10 phút trước
$initial = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
foreach ($n in $initial) {
    $b = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
    $texts = if ($b) { ($b.GetTextElements() | ForEach-Object { $_.Text }) -join " // " } else { "" }
    $key = "$($n.Id)_$texts"
    if ($n.CreationTime.DateTime -lt $cutoff) {
        [void]$seen_keys.Add($key)
    }
}

[Console]::WriteLine("READY")
[Console]::Out.Flush()

# Đẩy các thông báo 3CX trong 10 phút qua (đặc biệt là cuộc gọi nhỡ chưa xử lý)
foreach ($n in $initial) {
    $app = $n.AppInfo.DisplayInfo.DisplayName
    if ($app -like "*3CX*") {
        $b = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
        $texts = if ($b) { ($b.GetTextElements() | ForEach-Object { $_.Text }) -join " // " } else { "" }
        $key = "$($n.Id)_$texts"
        if (-not $seen_keys.Contains($key)) {
            [void]$seen_keys.Add($key)
            $obj = @{
                id = $n.Id
                app = $app
                time = $n.CreationTime.ToString("yyyy-MM-dd HH:mm:ss")
                texts = $texts
            }
            [Console]::WriteLine((ConvertTo-Json $obj -Compress))
            [Console]::Out.Flush()
        }
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
                    $obj = @{
                        id = $n.Id
                        app = $app
                        time = $n.CreationTime.ToString("yyyy-MM-dd HH:mm:ss")
                        texts = $texts
                    }
                    [Console]::WriteLine((ConvertTo-Json $obj -Compress))
                    [Console]::Out.Flush()
                }
            }
        }
    } catch {
        Start-Sleep -Milliseconds 500
    }
}
