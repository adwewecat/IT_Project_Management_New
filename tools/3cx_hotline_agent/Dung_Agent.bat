@echo off
chcp 65001 >nul
title Dừng 3CX Hotline Agent
echo ====================================================================
echo   ĐANG DỪNG 3CX HOTLINE AGENT CHẠY NGẦM...
echo ====================================================================
echo.

powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3CX_Hotline_Agent*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host ('Đã dừng tiến trình PID: ' + $_.ProcessId) }"

echo.
echo Đã tắt hoàn toàn 3CX Hotline Agent.
pause
