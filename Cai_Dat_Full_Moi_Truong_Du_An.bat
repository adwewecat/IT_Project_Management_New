@echo off
setlocal enabledelayedexpansion
title Cai Dat Full Thu Vien & Moi Truong Cho May Moi (IT Project Management)
color 0A

echo ===============================================================================
echo      HE THONG CAI DAT FULL THU VIEN & MOI TRUONG CHO MAY MOI / CAI LAI WIN
echo                     IT PROJECT MANAGEMENT NEW (GOLDEN GATE)
echo ===============================================================================
echo.

cd /d "%~dp0"

:: -----------------------------------------------------------------------------
:: 1. KIEM TRA PYTHON
:: -----------------------------------------------------------------------------
echo [1/5] Kiem tra moi truong Python...
set "PY_EXE="
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_EXE=python"
) else (
    if exist "C:\Program Files\Python314\python.exe" set "PY_EXE=C:\Program Files\Python314\python.exe"
    if exist "C:\Program Files\Python310\python.exe" set "PY_EXE=C:\Program Files\Python310\python.exe"
    if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
    if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" set "PY_EXE=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
)

if "%PY_EXE%"=="" (
    color 0C
    echo [LOI] Khong tim thay Python tren may tinh nay!
    echo Vui long tai va cai dat Python 3.10 hoac 3.14 tu https://www.python.org/downloads/
    echo LUU Y: Khi cai dat, BAT BUOC tick chon "Add python.exe to PATH".
    echo.
    pause
    exit /b 1
)

echo    - Da tim thay Python: %PY_EXE%
%PY_EXE% --version

:: -----------------------------------------------------------------------------
:: 2. KHOI TAO VIRTUALENV & CAI DAT THU VIEN BACKEND
:: -----------------------------------------------------------------------------
echo.
echo [2/5] Cai dat Virtualenv & Thu vien Backend (requirements.txt)...
if not exist "backend\.venv\Scripts\python.exe" (
    echo    - Dang tao moi truong ao backend\.venv...
    "%PY_EXE%" -m venv backend\.venv
)

echo    - Nang cap pip...
backend\.venv\Scripts\python.exe -m pip install --upgrade pip --quiet

echo    - Dang cai dat danh sach thu vien backend (FastAPI, SQLAlchemy, PyMongo, PyODBC...)...
backend\.venv\Scripts\pip.exe install -r backend\requirements.txt

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [CANH BAO] Co mot so thu vien Python chua cai hoan tat, kiem tra lai ket noi mang.
) else (
    echo    - Backend dependencies: HOAN TAT 100%!
)

:: -----------------------------------------------------------------------------
:: 3. KIEM TRA NODE.JS & CAI DAT PNPM
:: -----------------------------------------------------------------------------
echo.
echo [3/5] Kiem tra Node.js & Cai dat PNPM toan cuc...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [LOI] Khong tim thay Node.js!
    echo Vui long tai va cai dat Node.js (ban LTS v20 hoac v24) tu https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo    - Da tim thay Node.js:
node -v

where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    - Dang cai dat pnpm toan cuc qua npm...
    call npm install -g pnpm
) else (
    echo    - pnpm da duoc cai dat san:
    call pnpm -v
)

:: -----------------------------------------------------------------------------
:: 4. CAI DAT DEPENDENCIES CHO FRONTEND
:: -----------------------------------------------------------------------------
echo.
echo [4/5] Cai dat Dependencies cho Frontend (React 19 + TypeScript + Vite)...
cd /d "%~dp0\frontend"
where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo    - Chay pnpm install...
    call pnpm install
) else (
    echo    - Chay npm install...
    call npm install
)
cd /d "%~dp0"

:: -----------------------------------------------------------------------------
:: 5. KIEM TRA THU MUC SCRCPY (KDS)
:: -----------------------------------------------------------------------------
echo.
echo [5/5] Kiem tra bo cong cu KDS Scrcpy...
if exist "C:\scrcpy\scrcpy\scrcpy.exe" (
    echo    - Phat hien thu muc long C:\scrcpy\scrcpy, dang chuyen ra C:\scrcpy\...
    powershell -Command "Move-Item -Path 'C:\scrcpy\scrcpy\*' -Destination 'C:\scrcpy\' -Force; Remove-Item 'C:\scrcpy\scrcpy' -Recurse -Force" >nul 2>&1
)

if exist "C:\scrcpy\scrcpy.exe" (
    echo    - Scrcpy & ADB da san sang tai C:\scrcpy!
) else (
    echo    - [Luu y]: Chua co thu muc C:\scrcpy. Neu can dieu khien KDS tu xa, vui long giai nen file scrcpy vao C:\scrcpy.
)

:: -----------------------------------------------------------------------------
:: HOAN TAT
:: -----------------------------------------------------------------------------
echo.
echo ===============================================================================
echo   CHUC MUNG! TOAN BO MOI TRUONG & THU VIEN DA DUOC THIET LAP HOAN TAT 100%!
echo.
echo   Tu bay gio, ban chi can nhap dup chuot vao:
echo     - start_all.bat      : De chay ca Backend (port 8000) va Frontend (port 5173)
echo     - start_backend.bat  : De chay rieng Backend
echo     - start_frontend.bat : De chay rieng Frontend
echo ===============================================================================
echo.
pause
