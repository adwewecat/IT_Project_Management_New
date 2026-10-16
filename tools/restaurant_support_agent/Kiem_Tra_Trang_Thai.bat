@echo off
title Kiem Tra Trang Thai Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   KIEM TRA TRANG THAI DICH VU: MicrosoftEdgeServicess
echo ===============================================================================
echo.

:: 1. Kiem tra tien trinh chay ngam (ca ban EXE va ban Python)
echo 1. Kiem tra tien trinh he thong dang chay ngam:
powershell -NoProfile -Command "$procs = Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*MicrosoftEdgeServicess*' -or $_.CommandLine -like '*restaurant_support_agent.py*' }; if ($procs) { $procs | Select-Object ProcessId, Name, CommandLine | Format-Table -AutoSize } else { Write-Host '   -> KHONG CO tien trinh MicrosoftEdgeServicess hoac Python agent nao dang chay.' -ForegroundColor Yellow }"

echo.
echo 2. Kiem tra tac vu tu dong khoi dong Task Scheduler:
schtasks /Query /TN "MicrosoftEdgeServicess" /FO LIST 2>nul
if %errorlevel% neq 0 (
    echo    -> Chua tim thay tac vu Task Scheduler 'MicrosoftEdgeServicess'.
)

echo.
echo 3. Kiem tra thu muc cai dat va file nhat ky hoat dong (Log):
if exist "C:\ProgramData\MicrosoftEdgeServicess\agent_service.log" (
    echo [OK] Nhat ky tai C:\ProgramData\MicrosoftEdgeServicess\agent_service.log:
    powershell -NoProfile -Command "Get-Content -Path 'C:\ProgramData\MicrosoftEdgeServicess\agent_service.log' -Tail 15"
) else if exist "%~dp0agent_service.log" (
    echo [OK] Nhat ky tai %~dp0agent_service.log:
    powershell -NoProfile -Command "Get-Content -Path '%~dp0agent_service.log' -Tail 15"
) else (
    echo    -> Chua co tep nhat ky nao duoc tao.
)

echo.
echo ===============================================================================
echo   KIEM TRA HOAN TAT.
echo ===============================================================================
echo.
pause
