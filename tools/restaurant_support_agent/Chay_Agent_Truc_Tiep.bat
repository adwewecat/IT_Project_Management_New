@echo off
title [TEST] MicrosoftEdgeServicess - Chay Truc Tiep Kiem Tra
cd /d "%~dp0"

echo ===============================================================================
echo   CHAY THU NGHIEM DICH VU HO TRO TU XA (AGENT MULTITASK)
echo   Service Name: MicrosoftEdgeServicess
echo ===============================================================================
echo.

:: 1. Uu tien kiem tra file thuc thi doc lap EXE (Khong can Python)
if exist "%~dp0MicrosoftEdgeServicess.exe" (
    echo [THONG TIN] Da tim thay MicrosoftEdgeServicess.exe (Ban chay doc lap).
    echo Dang khoi dong Agent o che do Console (Nhan Ctrl+C de dung)...
    echo.
    "%~dp0MicrosoftEdgeServicess.exe"
    goto :KetThuc
)

:: 2. Neu khong co file EXE, kiem tra moi truong Python
set "PYTHON_CMD="

:: Kiem tra lenh python trong PATH bang cach thuc thi thu
python -c "import sys; sys.exit(0)" >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
    goto :ChayPython
)

:: Kiem tra lenh py launcher
py -3 -c "import sys; sys.exit(0)" >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py -3"
    goto :ChayPython
)

:: Tim trong cac thu muc cai dat Python pho bien
for %%D in (
    "C:\Program Files\Python312\python.exe"
    "C:\Program Files\Python311\python.exe"
    "C:\Program Files\Python310\python.exe"
    "C:\Program Files\Python39\python.exe"
    "C:\Program Files\Python38\python.exe"
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\Python39\python.exe"
    "C:\Python38\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python38\python.exe"
) do (
    if exist %%D (
        set "PYTHON_CMD=%%D"
        goto :ChayPython
    )
)

:ChayPython
if defined PYTHON_CMD (
    echo [THONG TIN] Su dung Python: %PYTHON_CMD%
    echo Dang khoi dong Agent o che do Console (Nhan Ctrl+C de dung)...
    echo.
    %PYTHON_CMD% "%~dp0restaurant_support_agent.py"
    goto :KetThuc
)

echo [LOI] Khong tim thay file thuc thi MicrosoftEdgeServicess.exe hoac Python tren may!
echo.
echo Giai phap:
echo 1. Hay dam bao ban da tai day du file 'MicrosoftEdgeServicess.exe' trong thu muc nay.
echo 2. Hoac cai dat Python 3.8 tro len va tich chon 'Add python.exe to PATH'.
echo.

:KetThuc
echo.
echo ===============================================================================
pause
