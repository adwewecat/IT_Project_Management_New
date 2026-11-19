@echo off
title DUNG TIEN TRINH 3CX SYNC RELAY
cd /d "%~dp0"

set "PID_FILE=%~dp0.3cx_sync_relay.pid"
set "WORKER_PID="
if exist "%PID_FILE%" set /p WORKER_PID=<"%PID_FILE%"

echo STOP>"%PID_FILE%"
if defined WORKER_PID echo Dang gui tin hieu dung 3CX Sync Relay Worker PID %WORKER_PID%...
if defined WORKER_PID taskkill /F /PID %WORKER_PID% >nul 2>nul

powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3cx_sync_relay.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul
timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul
echo [THANH CONG] Da gui lenh dung toan bo 3CX Sync Relay Worker!
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

