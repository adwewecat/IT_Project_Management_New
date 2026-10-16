@echo off
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GO CAI DAT DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [CANH BAO] Ban can chay file nay bang quyen Quan tri vien (Administrator)!
    echo Vui long nhap chuot phai va chon "Run as administrator".
    echo.
    pause
    exit /b 1
)

set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"

echo 1. Dang dung Windows Service...
net stop MicrosoftEdgeServicess >nul 2>&1

echo 2. Dang go bo Windows Service (services.msc)...
if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" remove >nul 2>&1
)
sc.exe delete MicrosoftEdgeServicess >nul 2>&1

echo 3. Dang xoa tac vu khoi dong Task Scheduler...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

echo 4. Dang xoa phim tat Startup...
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MicrosoftEdgeServicess.lnk" >nul 2>&1

echo 5. Dang tat tien trinh dang chay (neu co)...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1

echo.
echo ===============================================================================
echo   DA GO CAI DAT DICH VU MicrosoftEdgeServicess THANH CONG!
echo ===============================================================================
echo.
pause
