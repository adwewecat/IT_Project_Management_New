@echo off
title Kiem Tra Trang Thai Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   KIEM TRA TRANG THAI DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"

:: 1. Kiem tra Windows Service trong services.msc
echo [1] Kiem tra trong Windows Services (services.msc):
sc.exe query MicrosoftEdgeServicess
echo.

:: 2. Kiem tra tien trinh chay ngam trong Task Manager
echo [2] Kiem tra tien trinh MicrosoftEdgeServicess.exe:
tasklist /FI "IMAGENAME eq MicrosoftEdgeServicess.exe"
echo.

:: 3. Kiem tra file log
echo [3] Nhat ky hoat dong gan nhat:
if exist "%INSTALL_DIR%\agent_service.log" (
    echo [Doc tu: %INSTALL_DIR%\agent_service.log]
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
) else if exist "%~dp0agent_service.log" (
    echo [Doc tu: %~dp0agent_service.log]
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
) else (
    echo    Chua tim thay file nhat ky agent_service.log.
)
echo.

echo ===============================================================================
echo   Hoan tat kiem tra.
echo ===============================================================================
echo.
pause
