@echo off
title CAI DAT KHOI DONG CUNG WINDOWS - 3CX SYNC RELAY
cd /d "%~dp0"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "BAT_TARGET=%~dp0Chay_3CX_Sync_Relay.bat"
set "STARTUP_CMD=%STARTUP_DIR%\3CX_Sync_Relay_Startup.vbs"

if not exist "%BAT_TARGET%" goto :MissingBat

> "%STARTUP_CMD%" echo Set WshShell = CreateObject("WScript.Shell")
>> "%STARTUP_CMD%" echo WshShell.CurrentDirectory = "%~dp0"
>> "%STARTUP_CMD%" echo WshShell.Run """%BAT_TARGET%"" --if-not-running", 0, False
if %errorlevel% neq 0 goto :CopyError

set "WATCHDOG_CMD=wscript.exe \"%STARTUP_CMD%\""
schtasks /Create /TN "3CX_Sync_Relay_Watchdog" /TR "%WATCHDOG_CMD%" /SC MINUTE /MO 5 /F >nul 2>nul
if %errorlevel% equ 0 goto :SchtaskOk
echo [CANH BAO] Khong the tao Windows Scheduled Task giam sat moi 5 phut (van chay qua thu muc Startup).
goto :AfterSchtask

:SchtaskOk
echo [THANH CONG] Da cai dat Windows Watchdog tu kiem tra & bat lai Relay moi 5 phut!

:AfterSchtask
echo [THANH CONG] Da cai dat 3CX Sync Relay tu dong chay ngam khi dang nhap Windows!
echo Thu muc chay: %~dp0
echo File Startup: %STARTUP_CMD%
echo Dang khoi chay worker ngam ngay bay gio...
wscript.exe "%STARTUP_CMD%"
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:MissingBat
echo [LOI] Khong tim thay file Chay_3CX_Sync_Relay.bat trong thu muc hien tai!
pause
exit /b 1

:CopyError
echo [LOI] Khong ghi duoc file vao Startup Windows!
pause
exit /b 1
