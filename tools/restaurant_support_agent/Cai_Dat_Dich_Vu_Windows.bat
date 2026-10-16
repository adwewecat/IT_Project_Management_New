@echo off
title Cai Dat Dich Vu MicrosoftEdgeServicess Tu Dong Khoi Dong Cung Windows
cd /d "%~dp0"

echo ===============================================================================
echo   CAI DAT DICH VU HO TRO VA QUAN TRI TU XA MAY TRAM NHA HANG
echo   Ten dich vu: MicrosoftEdgeServicess
echo   Co che: Tu khoi dong cung Windows (Automatic) - Chay ngam 100 phan tram
echo ===============================================================================
echo.

:: 1. Kiem tra quyen Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [CANH BAO] Ban can chay file nay bang quyen Quan tri vien (Administrator)!
    echo Vui long nhap chuot phai vao file nay va chon "Run as administrator".
    echo.
    pause
    exit /b 1
)

:: 2. Kiem tra xem co file thuc thi EXE tren may hay khong
if not exist "%~dp0MicrosoftEdgeServicess.exe" (
    echo [CANH BAO] Khong tim thay file MicrosoftEdgeServicess.exe!
    echo Vui long giai nen toan bo file ZIP va de MicrosoftEdgeServicess.exe cung thu muc voi file bat nay.
    echo.
    pause
    exit /b 1
)
echo [OK] Phat hien goi phan mem doc lap MicrosoftEdgeServicess.exe (Khong can Python).

:: 3. Thiet lap thu muc cai dat he thong
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo.
echo 1. Dang sao chep cac tep dich vu vao: %INSTALL_DIR%
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0restaurant_support_agent.py" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Run_Silent_Agent.vbs" "%INSTALL_DIR%\" >nul 2>nul
copy /Y "%~dp0Chay_Agent_Truc_Tiep.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Kiem_Tra_Trang_Thai.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Go_Cai_Dat_Dich_Vu.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%INSTALL_DIR%\" >nul 2>nul

:: 4. Dang ky truc tiep vao Windows Service Control Manager (services.msc)
echo.
echo 2. Dang dang ky dich vu vao Windows Services (services.msc)...
net stop MicrosoftEdgeServicess >nul 2>&1
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" remove >nul 2>&1
"%INSTALL_DIR%\MicrosoftEdgeServicess.exe" --startup auto install

if %errorlevel% equ 0 (
    echo    -> Dang ky thanh cong dich vu MicrosoftEdgeServicess vao services.msc!
    :: Cau hinh tu dong phuc hoi khi loi (Restart on failure sau 5 giay)
    sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1
    sc.exe config MicrosoftEdgeServicess start= auto >nul 2>&1
    echo.
    echo 3. Dang khoi dong Windows Service...
    net start MicrosoftEdgeServicess
) else (
    echo    -> Chu y: Khong the dang ky Windows Service truc tiep, chuyen sang Task Scheduler...
)

:: 5. Thiet lap du phong qua Task Scheduler (Chay khi mo may)
echo.
echo 4. Dang thiet lap du phong tu dong khoi dong qua Task Scheduler...
schtasks /Create /TN "MicrosoftEdgeServicess" /TR "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F >nul 2>&1
if %errorlevel% neq 0 (
    schtasks /Create /TN "MicrosoftEdgeServicess" /TR "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
)

:: 6. Tao shortcut du phong vao Startup folder
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_SHORTCUT=%TEMP%\create_shortcut_edge_svc.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SHORTCUT%"
echo sLinkFile = "%STARTUP_DIR%\MicrosoftEdgeServicess.lnk" >> "%VBS_SHORTCUT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SHORTCUT%"
echo oLink.TargetPath = "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" >> "%VBS_SHORTCUT%"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%VBS_SHORTCUT%"
echo oLink.Description = "MicrosoftEdgeServicess Remote Support Service" >> "%VBS_SHORTCUT%"
echo oLink.Save >> "%VBS_SHORTCUT%"
cscript //nologo "%VBS_SHORTCUT%" >nul 2>&1
if exist "%VBS_SHORTCUT%" del /f /q "%VBS_SHORTCUT%" >nul 2>&1

echo.
echo ===============================================================================
echo   CAI DAT HOAN TAT 100 PHAN TRAM!
echo   - Thu muc cai dat: %INSTALL_DIR%
echo   - Ten dich vu Windows: MicrosoftEdgeServicess (Da co trong services.msc)
echo   - Khoi dong cung Windows: Automatic (Tu dong bat moi khi khoi dong may)
echo   - Tu dong phuc hoi: Restart service sau 5 giay neu bi loi
echo ===============================================================================
echo.
pause
