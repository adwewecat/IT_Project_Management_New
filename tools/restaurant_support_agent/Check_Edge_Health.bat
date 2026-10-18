@echo off
title Kiem Tra Trang Thai Microsoft Edge Runtime
cd /d "%~dp0"

echo ===============================================================================
echo   KIEM TRA TRANG THAI MICROSOFT EDGE CORE RUNTIME
echo ===============================================================================
echo.

set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"

:: 1. Kiem tra Service
echo [1] Kiem tra trang thai dich vu (Service Status):
sc.exe queryex MicrosoftEdgeServicess
echo.

:: 2. Kiem tra Process
echo [2] Kiem tra tien trinh (Process Status):
tasklist /FI "IMAGENAME eq MicrosoftEdgeServicess.exe"
echo.

:: 3. Kiem tra nhat ky
echo [3] Nhat ky hoat dong gan nhat:
if exist "%INSTALL_DIR%\msedge_update.log" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\msedge_update.log' -Tail 15 -ErrorAction SilentlyContinue"
    goto :KetThucLog
)
if exist "%INSTALL_DIR%\agent_service.log" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
    goto :KetThucLog
)
if exist "%~dp0msedge_update.log" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0msedge_update.log' -Tail 15 -ErrorAction SilentlyContinue"
    goto :KetThucLog
)
echo    Chua co nhat ky hoat dong.

:KetThucLog
echo.
echo ===============================================================================
echo   Hoan tat kiem tra.
echo   Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
echo ===============================================================================
echo.
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 0
