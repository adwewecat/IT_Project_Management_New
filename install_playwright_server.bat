@echo off
title Cai Dat Chromium Cho Playwright
cd /d "%~dp0"

echo ====================================================
echo   CAI DAT CHROMIUM CHO PLAYWRIGHT (WINDOWS SERVICE)
echo ====================================================
echo.

:: Thiet lap bien moi truong cho session CMD hien tai
set NODE_SKIP_PLATFORM_CHECK=1
set PLAYWRIGHT_BROWSERS_PATH=C:\ms-playwright

:: Luu vinh vien vao System Environment Variables cho Windows Service
setx NODE_SKIP_PLATFORM_CHECK "1" /M >nul 2>&1
setx PLAYWRIGHT_BROWSERS_PATH "C:\ms-playwright" /M >nul 2>&1

echo 1. Da thiet lap NODE_SKIP_PLATFORM_CHECK=1 va PLAYWRIGHT_BROWSERS_PATH=C:\ms-playwright
echo 2. Dang tai va cai dat Chromium vao C:\ms-playwright ...
echo    (Qua trinh nay can ket noi Internet va mat khoang 1-2 phut)
echo.

if exist "%~dp0backend\.venv\Scripts\python.exe" goto :ChayPythonLocal
if exist "C:\DUNGIT\IT_Project_Management_New\backend\.venv\Scripts\python.exe" goto :ChayPythonServer
python -m playwright install chromium
goto :KiemTraKetQua

:ChayPythonLocal
"%~dp0backend\.venv\Scripts\python.exe" -m playwright install chromium
goto :KiemTraKetQua

:ChayPythonServer
"C:\DUNGIT\IT_Project_Management_New\backend\.venv\Scripts\python.exe" -m playwright install chromium
goto :KiemTraKetQua

:KiemTraKetQua
if %errorlevel% neq 0 goto :LoiCaiDat

echo.
echo ====================================================
echo   CAI DAT CHROMIUM THANH CONG!
echo   Da luu tai: C:\ms-playwright
echo ====================================================
goto :KetThuc

:LoiCaiDat
echo.
echo ====================================================
echo   [LOI] Cai dat that bai, ma loi: %errorlevel%
echo ====================================================
goto :KetThuc

:KetThuc
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
