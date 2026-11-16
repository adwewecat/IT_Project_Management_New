@echo off
title CAI DAT KHOI DONG CUNG WINDOWS - 3CX SYNC RELAY
cd /d "%~dp0"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_TARGET=%~dp0Chay_Ngam_3CX_Relay.vbs"
set "STARTUP_CMD=%STARTUP_DIR%\3CX_Sync_Relay_Startup.vbs"

if not exist "%VBS_TARGET%" goto :MissingVbs

copy /Y "%VBS_TARGET%" "%STARTUP_CMD%" >nul
if %errorlevel% neq 0 goto :CopyError

echo [THANH CONG] Da cai dat 3CX Sync Relay tu dong chay ngam khi dang nhap Windows!
echo Thu muc chay: %~dp0
echo Dang khoi chay worker ngam ngay bay gio...
wscript.exe "%VBS_TARGET%"
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:MissingVbs
echo [LOI] Khong tim thay file Chay_Ngam_3CX_Relay.vbs trong thu muc hien tai!
pause
exit /b 1

:CopyError
echo [LOI] Khong ghi duoc file vao Startup Windows!
pause
exit /b 1

