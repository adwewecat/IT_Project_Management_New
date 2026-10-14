@echo off
chcp 65001 >nul
title 3CX Hotline Client Agent
cls
echo ==================================================================
echo    3CX HOTLINE CLIENT AGENT - AUTO FORWARD CALLS TO SERVER
echo ==================================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%config.txt"
set "PS1_FILE=%SCRIPT_DIR%3CX_Hotline_Agent.ps1"

if not exist "%PS1_FILE%" (
    echo [LOI] Khong tim thay file 3CX_Hotline_Agent.ps1!
    echo Vui long GIAI NEN toan bo file .zip ra thu muc truoc khi chay.
    echo Khong mo va nhap dup file truc tiep ben trong file nen .zip!
    echo.
    pause
    exit /b 1
)

if not exist "%CONFIG_FILE%" (
    echo SERVER_URL=http://172.16.8.25:5001> "%CONFIG_FILE%"
)

echo Dang khoi dong tien trinh ket noi 3CX...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1_FILE%"
pause
