@echo off
title Dung 3CX Hotline Agent
cd /d "%~dp0"

echo ====================================================================
echo   DANG DUNG 3CX HOTLINE AGENT CHAY NGAM...
echo ====================================================================
echo.

powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*3CX_Hotline_Agent*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host ('Da dung tien trinh PID: ' + $_.ProcessId) }"

echo.
echo Da tat hoan toan 3CX Hotline Agent.
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
