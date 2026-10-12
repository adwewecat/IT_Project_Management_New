@echo off
chcp 65001 >nul
echo ====================================================
echo   CÀI ĐẶT CHROMIUM CHO PLAYWRIGHT (WINDOWS SERVICE)
echo ====================================================

:: Thiết lập biến môi trường cho session CMD hiện tại
set NODE_SKIP_PLATFORM_CHECK=1
set PLAYWRIGHT_BROWSERS_PATH=C:\ms-playwright

:: Lưu vĩnh viễn vào System Environment Variables cho Windows Service
setx NODE_SKIP_PLATFORM_CHECK "1" /M >nul 2>&1
setx PLAYWRIGHT_BROWSERS_PATH "C:\ms-playwright" /M >nul 2>&1

echo 1. Đã thiết lập NODE_SKIP_PLATFORM_CHECK=1 và PLAYWRIGHT_BROWSERS_PATH=C:\ms-playwright
echo 2. Đang tải và cài đặt Chromium vào C:\ms-playwright ...
echo    (Quá trình này cần kết nối Internet và mất khoảng 1-2 phút)
echo.

if exist "C:\DUNGIT\IT_Project_Management_New\backend\.venv\Scripts\python.exe" (
    "C:\DUNGIT\IT_Project_Management_New\backend\.venv\Scripts\python.exe" -m playwright install chromium
) else (
    python -m playwright install chromium
)

if %errorlevel% equ 0 (
    echo.
    echo ====================================================
    echo   CÀI ĐẶT CHROMIUM THÀNH CÔNG!
    echo   Đã lưu tại: C:\ms-playwright
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo   [LỖI] Cài đặt thất bại, mã lỗi: %errorlevel%
    echo ====================================================
)

echo.
pause
