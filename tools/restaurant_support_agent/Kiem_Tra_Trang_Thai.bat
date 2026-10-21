@echo off
title Kiem Tra Trang Thai Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   KIEM TRA TRANG THAI DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"

:: 1. Kiem tra Windows Service trong services.msc hoac co che khoi dong
echo [1] Kiem tra co che tu khoi dong cung Windows:

sc.exe queryex MicrosoftEdgeServicess 2>nul | findstr /i "RUNNING" >nul 2>&1
if not errorlevel 1 goto :ServiceRunning

sc.exe queryex MicrosoftEdgeServicess 2>nul | findstr /i "SERVICE_NAME" >nul 2>&1
if not errorlevel 1 goto :ServiceStopped

schtasks /query /tn "MicrosoftEdgeServicess" 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :TaskSchedulerFound

reg query "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :RegistryFound

reg query "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :RegistryFound

echo    [CHUA CO] Khong tim thay Windows Service hoac Startup Task nao duoc dang ky.
goto :KiemTraTienTrinh

:ServiceRunning
echo    [OK] Windows Service MicrosoftEdgeServicess da duoc dang ky va dang chay RUNNING.
goto :KiemTraTienTrinh

:ServiceStopped
echo    [CANH BAO] Windows Service MicrosoftEdgeServicess da ton tai nhung dang o trang thai STOPPED.
goto :KiemTraTienTrinh

:TaskSchedulerFound
echo    [OK] Dich vu dang duoc kich hoat qua Task Scheduler tu khoi dong.
goto :KiemTraTienTrinh

:RegistryFound
echo    [OK] Dich vu dang duoc kich hoat qua Registry Run tu khoi dong ngam cung Windows.
goto :KiemTraTienTrinh

:KiemTraTienTrinh
echo.
:: 2. Kiem tra tien trinh chay ngam trong Task Manager
echo [2] Kiem tra tien trinh MicrosoftEdgeServicess:
set "PROC_RUNNING=0"
tasklist /FO CSV /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 set "PROC_RUNNING=1"

if "%PROC_RUNNING%"=="0" (
    tasklist 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
    if not errorlevel 1 set "PROC_RUNNING=1"
)

if "%PROC_RUNNING%"=="1" (
    echo    [OK] Tien trinh MicrosoftEdgeServicess dang hoat dong binh thuong.
) else (
    echo    [CANH BAO] Khong co tien trinh MicrosoftEdgeServicess nao dang chay!
)
echo.

:: 3. Kiem tra file log
echo [3] Nhat ky hoat dong gan nhat:
if exist "%INSTALL_DIR%\msedge_update.log" goto :DocLogInstallEdge
if exist "%INSTALL_DIR%\agent_service.log" goto :DocLogInstall
if exist "%~dp0msedge_update.log" goto :DocLogCurrentEdge
if exist "%~dp0agent_service.log" goto :DocLogCurrent
echo    Chua tim thay file nhat ky msedge_update.log hoac agent_service.log.
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
echo   Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
echo ===============================================================================
echo.
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 0
