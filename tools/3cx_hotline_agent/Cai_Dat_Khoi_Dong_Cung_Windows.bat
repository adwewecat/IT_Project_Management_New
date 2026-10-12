@echo off
chcp 65001 >nul
title Cài đặt 3CX Hotline Agent khởi động cùng Windows
echo ====================================================================
echo   CÀI ĐẶT 3CX HOTLINE AGENT TỰ ĐỘNG CHẠY NGẦM CÙNG WINDOWS
echo ====================================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\3CX_Hotline_Agent"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo 1. Đang tạo thư mục lưu trữ an toàn: "%TARGET_DIR%"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo 2. Đang sao chép các tệp cần thiết vào thư mục an toàn...
copy /Y "%~dp0config.txt" "%TARGET_DIR%\" >nul
copy /Y "%~dp0Run_Silent_Agent.vbs" "%TARGET_DIR%\" >nul
copy /Y "%~dp03CX_Hotline_Agent.ps1" "%TARGET_DIR%\" >nul
copy /Y "%~dp0Run_3CX_Hotline_Agent.bat" "%TARGET_DIR%\" >nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%TARGET_DIR%\" >nul

echo 3. Đang tạo phím tắt khởi động cùng Windows (Startup)...
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

echo 4. Đang khởi chạy Agent ngầm ngay bây giờ...
wscript.exe "%TARGET_DIR%\Run_Silent_Agent.vbs"

echo.
echo ====================================================================
echo   CÀI ĐẶT THÀNH CÔNG!
echo   - Toàn bộ tệp đã được sao chép vào: %TARGET_DIR%
echo   - Đã đăng ký tự động chạy mỗi khi bạn bật máy tính.
echo   - Bây giờ bạn có thể XÓA THƯ MỤC NÀY đi mà KHÔNG BỊ ẢNH HƯỞNG!
echo ====================================================================
echo.
pause
