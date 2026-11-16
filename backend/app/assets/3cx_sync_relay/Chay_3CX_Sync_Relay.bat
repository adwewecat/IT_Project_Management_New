@echo off
title 3CX SYNC RELAY WORKER - DONG BO HOTLINE 3CX
cd /d "%~dp0"

echo ====================================================================
echo   3CX SYNC RELAY WORKER - KET NOI SERVER VA CONG 3CX PORT 5001
echo ====================================================================
echo.

set "PYTHON_CMD="
where python >nul 2>nul
if %errorlevel% equ 0 set "PYTHON_CMD=python"
if defined PYTHON_CMD goto :CheckPlaywright

if exist "C:\Program Files\Python314\python.exe" set "PYTHON_CMD=C:\Program Files\Python314\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "C:\Program Files\Python313\python.exe" set "PYTHON_CMD=C:\Program Files\Python313\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "C:\Program Files\Python312\python.exe" set "PYTHON_CMD=C:\Program Files\Python312\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "C:\Program Files\Python311\python.exe" set "PYTHON_CMD=C:\Program Files\Python311\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "C:\Program Files\Python310\python.exe" set "PYTHON_CMD=C:\Program Files\Python310\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright
if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
if defined PYTHON_CMD goto :CheckPlaywright

echo [LOI] May nay chua cai dat Python 3.10 tro len!
echo Vui long cai Python 3.10+ va chon Add Python to PATH roi chay lai.
pause
exit /b 1

:CheckPlaywright
echo Dang dung Python: %PYTHON_CMD%
"%PYTHON_CMD%" -c "import playwright" >nul 2>nul
if %errorlevel% equ 0 goto :CheckBrowser

echo Dang cai dat thu vien playwright...
"%PYTHON_CMD%" -m pip install playwright
if %errorlevel% neq 0 goto :PipError

:CheckBrowser
"%PYTHON_CMD%" -c "from playwright.sync_api import sync_playwright; p=sync_playwright().start(); p.chromium.launch(headless=True).close(); p.stop()" >nul 2>nul
if %errorlevel% equ 0 goto :RunWorker

echo Dang kiem tra / tai trinh duyet Chromium cho Playwright...
"%PYTHON_CMD%" -m playwright install chromium

:RunWorker
echo.
echo Dang khoi dong 3CX Sync Relay Worker...
echo Nhan Ctrl+C hoac dong cua so de tam dung.
echo.
"%PYTHON_CMD%" "%~dp03cx_sync_relay.py" %*
if %errorlevel% neq 0 goto :RunError

echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:PipError
echo [LOI] Khong the cai dat thu vien playwright qua pip. Vui long kiem tra mang!
pause
exit /b 1

:RunError
echo [LOI] Relay Worker bi dung dot ngot. Kiem tra file relay_worker.log de xem chi tiet.
pause
exit /b 1

