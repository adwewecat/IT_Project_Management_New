@echo off
chcp 65001 >nul
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GỠ BỎ DỊCH VỤ HỖ TRỢ TỪ XA: MicrosoftEdgeServicess
echo ===============================================================================
echo.

echo 1. Đang dừng các tiến trình Agent đang chạy...
taskkill /F /FI "WINDOWTITLE eq *MicrosoftEdgeServicess*" >nul 2>nul
wmic process where "CommandLine like '%%restaurant_support_agent.py%%'" call terminate >nul 2>nul

echo 2. Đang xóa tác vụ tự khởi động trong Task Scheduler...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>nul

echo 3. Đang xóa shortcut trong thư mục Startup...
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MicrosoftEdgeServicess.lnk" >nul 2>nul

echo 4. Đang dọn dẹp thư mục cài đặt: C:\ProgramData\MicrosoftEdgeServicess...
if exist "C:\ProgramData\MicrosoftEdgeServicess" (
    rmdir /S /Q "C:\ProgramData\MicrosoftEdgeServicess" >nul 2>nul
)

echo.
echo ===============================================================================
echo   ĐÃ GỠ BỎ HOÀN TẤT DỊCH VỤ MicrosoftEdgeServicess!
echo ===============================================================================
echo.
pause
