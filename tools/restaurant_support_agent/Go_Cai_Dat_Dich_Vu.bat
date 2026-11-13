@echo off
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GO CAI DAT DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

:: 1. Kiem tra tham so de tranh vong lap UAC vo han (Chong chop tat tuyet doi)
if /i "%~1"=="/elevated" goto :DaCoQuyenAdmin
if /i "%~1"=="/skipuac" goto :DaCoQuyenAdmin
if /i "%~1"=="/silent" goto :DaCoQuyenAdmin
if /i "%~1"=="/retried" goto :LoiChuaCoQuyenAdmin

:: 2. Kiem tra quyen Administrator thuc te
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: Goi hop thoai Windows UAC 1 lan duy nhat
echo Dang yeu cau quyen Administrator (UAC Windows)...
set "BAT_TARGET=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = $env:BAT_TARGET; Start-Process -FilePath $p -ArgumentList '/elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   File go cai dat nay bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan:
echo   1. Nhap CHUOT PHAI vao file: Go_Cai_Dat_Dich_Vu.bat
echo   2. Chon: Run as administrator (Chay voi quyen quan tri vien)
echo   3. Khi Windows hien hop thoai hoi, bam [YES].
echo ===============================================================================
echo.
echo Nhan phim bat ky de thoat hoac cua so se tu dong dong sau 10 giay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"

echo 1. Dang dong cac cua so quan tri de tranh bi khoa handle...
taskkill /F /IM mmc.exe >nul 2>&1

echo 2. Dang tat tat ca cac tien trinh MicrosoftEdgeServicess dang chay ngam...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

echo 3. Dang go bo Windows Service trong services.msc...
if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" remove >nul 2>&1
sc.exe delete MicrosoftEdgeServicess >nul 2>&1

echo 4. Dang xoa tac vu khoi dong Task Scheduler...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

echo 5. Dang xoa khoi Registry Run tu khoi dong va phim tat Startup...
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MicrosoftEdgeServicess.lnk" >nul 2>&1

echo 6. Dang don dep thu muc he thong: %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" goto :HoanTatGoCaiDat
attrib -h -s -r "%INSTALL_DIR%" >nul 2>&1
attrib -h -s -r "%INSTALL_DIR%\*.*" >nul 2>&1
del /F /Q "%INSTALL_DIR%\*.*" >nul 2>&1
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1

:HoanTatGoCaiDat
echo.
echo ===============================================================================
echo   DA GO CAI DAT DICH VU MicrosoftEdgeServicess THANH CONG!
echo   - Da tat sach tien trinh chay ngam
echo   - Da go bo Windows Service va Task Scheduler
echo   - Da xoa sach khoi Registry Run tu khoi dong
echo   - Da don dep sach se thu muc he thong: %INSTALL_DIR%
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0
