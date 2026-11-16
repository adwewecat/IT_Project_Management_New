@echo off
title DUNG TIEN TRINH 3CX SYNC RELAY
cd /d "%~dp0"

set "PID_FILE=%~dp0.3cx_sync_relay.pid"
if not exist "%PID_FILE%" goto :NoPidFile

set /p WORKER_PID=<"%PID_FILE%"
if not defined WORKER_PID goto :CleanupPid

echo Dang dung 3CX Sync Relay Worker PID %WORKER_PID%...
taskkill /F /PID %WORKER_PID% >nul 2>nul

:CleanupPid
del /Q "%PID_FILE%" >nul 2>nul
echo [THANH CONG] Da dung 3CX Sync Relay Worker!
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:NoPidFile
echo Khong tim thay tien trinh 3CX Sync Relay dang chay theo file PID.
echo Dang quet dong bo qua WMIC / PowerShell...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3cx_sync_relay.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

