@echo off
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GO BO DICH VU HO TRO TU XA: MicrosoftEdgeServicess
echo ===============================================================================
echo.

echo 1. Dang dung cac tien trinh Agent dang chay ngam...
taskkill /F /IM "MicrosoftEdgeServicess.exe" >nul 2>nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*restaurant_support_agent.py*' -or $_.Name -like '*MicrosoftEdgeServicess*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>nul

echo 2. Dang xoa tac vu tu khoi dong trong Task Scheduler...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>nul

echo 3. Dang xoa shortcut khoi dong trong thu muc Startup...
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MicrosoftEdgeServicess.lnk" (
    del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MicrosoftEdgeServicess.lnk" >nul 2>nul
)

echo 4. Dang don dep thu muc cai dat C:\ProgramData\MicrosoftEdgeServicess...
if exist "C:\ProgramData\MicrosoftEdgeServicess" (
    rmdir /S /Q "C:\ProgramData\MicrosoftEdgeServicess" >nul 2>nul
)

echo.
echo ===============================================================================
echo   DA GO BO HOAN TAT DICH VU MicrosoftEdgeServicess!
echo ===============================================================================
echo.
pause
