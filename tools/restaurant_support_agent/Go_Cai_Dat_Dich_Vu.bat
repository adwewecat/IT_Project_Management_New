@echo off
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GO CAI DAT DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

:: 1. Kiem tra quyen Administrator (Tu dong xin quyen UAC de go cai dat 1-click)
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

echo Dang yeu cau quyen Administrator (UAC Windows)...
powershell -Command "Start-Process '%~f0' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   File go cai dat nay bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan:
echo   1. Nhap CHUOT PHAI vao file: Go_Cai_Dat_Dich_Vu.bat
echo   2. Chon: Run as administrator (Chay voi quyen quan tri vien)
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin

set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"

echo 1. Dang dung Windows Service va giai phong khoa...
for /f "tokens=3" %%p in ('sc.exe queryex MicrosoftEdgeServicess 2^>nul ^| findstr /i "PID"') do (
    if not "%%p"=="0" taskkill /F /PID %%p >nul 2>&1
)
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

echo 2. Dang go bo Windows Service trong services.msc...
if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" remove >nul 2>&1
sc.exe delete MicrosoftEdgeServicess >nul 2>&1

echo 3. Dang xoa tac vu khoi dong Task Scheduler...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

echo 4. Dang xoa phim tat Startup...
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MicrosoftEdgeServicess.lnk" >nul 2>&1

echo 5. Dang tat tien trinh dang chay neu co...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1

echo 6. Dang don dep thu muc cai dat: %INSTALL_DIR%...
if exist "%INSTALL_DIR%" (
    del /F /Q "%INSTALL_DIR%\*.*" >nul 2>&1
    rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1
)

echo.
echo ===============================================================================
echo   DA GO CAI DAT DICH VU MicrosoftEdgeServicess THANH CONG!
echo   Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
echo ===============================================================================
echo.
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
