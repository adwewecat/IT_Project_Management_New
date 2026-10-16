@echo off
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GO CAI DAT DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

:: 1. Kiem tra quyen Administrator va tu dong yeu cau UAC neu chua co
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Quan tri vien (Run as Administrator UAC)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs" 2>nul
    if %errorlevel% equ 0 exit /b 0
    echo.
    echo ===============================================================================
    echo   [CANH BAO QUYEN HAN QUAN TRI VIEN]
    echo ===============================================================================
    echo   Khong the tu dong cap quyen Administrator.
    echo   Vui long nhap chuot phai va chon "Run as administrator"!
    echo ===============================================================================
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
