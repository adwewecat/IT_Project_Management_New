
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

$seen_ids = [System.Collections.Generic.HashSet[uint32]]::new()

# Seed initial IDs so we don't replay old history on startup, or output last 1 for test
$notifs = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
foreach ($n in $notifs) {
    [void]$seen_ids.Add($n.Id)
}

[Console]::WriteLine("READY")
[Console]::Out.Flush()

# Loop checking every 350ms
$counter = 0
while ($counter -lt 10) {
    Start-Sleep -Milliseconds 350
    $counter++
    try {
        $current = Await ($listener.GetNotificationsAsync([Windows.UI.Notifications.NotificationKinds]::Toast)) ([System.Collections.Generic.IReadOnlyList[Windows.UI.Notifications.UserNotification]])
        foreach ($n in $current) {
            if (-not $seen_ids.Contains($n.Id)) {
                [void]$seen_ids.Add($n.Id)
                $app = $n.AppInfo.DisplayInfo.DisplayName
                if ($app -like "*3CX*" -or $app -like "*Chrome*") {
                    $b = $n.Notification.Visual.GetBinding([Windows.UI.Notifications.KnownNotificationBindings]::ToastGeneric)
                    $texts = if ($b) { ($b.GetTextElements() | ForEach-Object { $_.Text }) -join " // " } else { "" }
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
        # ignore transient error
    }
}
[Console]::WriteLine("DONE")
