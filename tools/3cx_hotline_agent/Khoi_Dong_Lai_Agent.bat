@echo off
chcp 65001 >nul
title Khoi dong lai 3CX Hotline Client Agent

echo ==================================================================
echo   KHOI DONG LAI 3CX HOTLINE CLIENT AGENT (LAM SACH VA CHAY MOI)
echo ==================================================================
echo.

echo 1. Dang dung tat ca tien trinh 3CX Agent cu...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'powershell|wscript|cscript') -and ($_.CommandLine -like '*3CX_Hotline_Agent*' -or $_.CommandLine -like '*Run_Silent_Agent*') }; if ($procs) { $procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }"

echo 2. Dang khoi chay tien trinh Agent moi...
set "SCRIPT_DIR=%~dp0"
set "VBS_FILE=%SCRIPT_DIR%Run_Silent_Agent.vbs"
set "PS1_FILE=%SCRIPT_DIR%3CX_Hotline_Agent.ps1"

if not exist "%PS1_FILE%" (
    echo.
    echo ==================================================================
    echo [LOI] Khong tim thay file 3CX_Hotline_Agent.ps1!
    echo Vui long GIAI NEN toan bo file .zip ra thu muc truoc khi chay!
    echo ==================================================================
    echo.
    pause
    exit /b 1
)

REM Khoi chay ngam qua VBScript hoac truc tiep qua PowerShell Hidden
if exist "%VBS_FILE%" (
    wscript.exe "%VBS_FILE%"
)

timeout /t 2 >nul

REM Du phong: Neu he thong chan VBScript, khoi chay truc tiep bang PowerShell Hidden
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3CX_Hotline_Agent*' }; if (-not $p) { Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%PS1_FILE%""' -WindowStyle Hidden }"

timeout /t 2 >nul

echo 3. Kiem tra trang thai khoi dong...
if exist "%SCRIPT_DIR%agent_activity.log" (
    echo.
    echo Nhat ky khoi dong gan nhat:
    powershell.exe -NoProfile -Command "Get-Content '%SCRIPT_DIR%agent_activity.log' -Tail 6"
)

echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3CX_Hotline_Agent*' }; if ($p) { Write-Host '==================================================================' -ForegroundColor Green; Write-Host ('HOAN TAT! Tien trinh dang chay ngam on dinh (PID ' + $p.ProcessId + ').') -ForegroundColor Green; Write-Host '==================================================================' -ForegroundColor Green } else { Write-Host '==================================================================' -ForegroundColor Red; Write-Host '[CANH BAO] TIEN TRINH CHAY NGAM CHUA KHOI DONG THANH CONG!' -ForegroundColor Red; Write-Host '-> Nguyen nhan: Co the do Windows chan Notifications hoac thieu quyen.' -ForegroundColor Yellow; Write-Host '-> HUONG DAN: Vui long nhap dup vao file Run_3CX_Hotline_Agent.bat de xem loi chi tiet!' -ForegroundColor Yellow; Write-Host '==================================================================' -ForegroundColor Red }"
echo.
pause
