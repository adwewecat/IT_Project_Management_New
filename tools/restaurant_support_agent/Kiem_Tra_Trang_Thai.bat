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
sc.exe queryex MicrosoftEdgeServicess
echo.

:: 2. Kiem tra tien trinh chay ngam trong Task Manager
echo [2] Kiem tra tien trinh MicrosoftEdgeServicess.exe:
tasklist /FI "IMAGENAME eq MicrosoftEdgeServicess.exe"
echo.

:: 3. Kiem tra file log
echo [3] Nhat ky hoat dong gan nhat:
if exist "%INSTALL_DIR%\msedge_update.log" goto :DocLogInstallEdge
if exist "%INSTALL_DIR%\agent_service.log" goto :DocLogInstall
if exist "%~dp0msedge_update.log" goto :DocLogCurrentEdge
if exist "%~dp0agent_service.log" goto :DocLogCurrent
echo    Chua tim thay file nhat ky (msedge_update.log hoac agent_service.log).
goto :KetThucLog

:DocLogInstallEdge
echo [Doc tu: %INSTALL_DIR%\msedge_update.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\msedge_update.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:DocLogInstall
echo [Doc tu: %INSTALL_DIR%\agent_service.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:DocLogCurrentEdge
echo [Doc tu: %~dp0msedge_update.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0msedge_update.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:DocLogCurrent
echo [Doc tu: %~dp0agent_service.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:KetThucLog
echo.
echo ===============================================================================
echo   Hoan tat kiem tra.
echo   Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
echo ===============================================================================
echo.
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0
