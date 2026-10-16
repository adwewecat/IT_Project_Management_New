@echo off
title Cai dat 3CX Hotline Agent khoi dong cung Windows
cd /d "%~dp0"

echo ====================================================================
echo   CAI DAT 3CX HOTLINE AGENT TU DONG CHAY NGAM CUNG WINDOWS
echo ====================================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\3CX_Hotline_Agent"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo 1. Dang tao thu muc luu tru an toan: "%TARGET_DIR%"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo 2. Dang sao chep cac tep can thiet vao thu muc an toan...
copy /Y "%~dp0config.txt" "%TARGET_DIR%\" >nul
copy /Y "%~dp0Run_Silent_Agent.vbs" "%TARGET_DIR%\" >nul
copy /Y "%~dp03CX_Hotline_Agent.ps1" "%TARGET_DIR%\" >nul
copy /Y "%~dp0Run_3CX_Hotline_Agent.bat" "%TARGET_DIR%\" >nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%TARGET_DIR%\" >nul

echo 3. Dang tao phim tat khoi dong cung Windows (Startup)...
set "VBS_SCRIPT=%TEMP%\create_startup_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%STARTUP_DIR%\3CX_Hotline_Agent.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%TARGET_DIR%\Run_Silent_Agent.vbs" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "3CX Hotline Background Agent" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" >nul

echo 4. Dang khoi chay Agent ngam ngay bay gio...
wscript.exe "%TARGET_DIR%\Run_Silent_Agent.vbs"

echo.
echo ====================================================================
echo   CAI DAT THANH CONG!
echo   - Toan bo tep da duoc sao chep vao: %TARGET_DIR%
echo   - Da dang ky tu dong chay moi khi ban bat may tinh.
echo   - Bay gio ban co the XOA THU MUC NAY di ma KHONG BI ANH HUONG!
echo ====================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
