@echo off
setlocal enabledelayedexpansion
title Restart IT Services (ITBackend & ITFrontend)

:: Kiem tra quyen Administrator, tu dong xin quyen neu chua co
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ========================================================
    echo  [!] Dang yeu cau quyen Administrator de restart service...
    echo ========================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c `\"%~f0`\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ========================================================
echo        KHOI DONG LAI DICH VU IT MANAGEMENT
echo ========================================================
echo.

:: Tim file nssm.exe: uu tien trong thu muc nssm-2.24 tuong doi, roi den duong dan server C:\DUNGIT\...
set "NSSM=%~dp0nssm-2.24\win64\nssm.exe"
if not exist "%NSSM%" (
    set "NSSM=C:\DUNGIT\IT_Project_Management_New\nssm-2.24\win64\nssm.exe"
)
if not exist "%NSSM%" (
    set "NSSM=nssm.exe"
)

echo Duong dan NSSM: "%NSSM%"
echo.

echo [1/2] Dang khoi dong lai ITBackend...
"%NSSM%" restart ITBackend
if %errorlevel% equ 0 (
    echo      --^> ITBackend: Khoi dong lai THANH CONG!
) else (
    echo      --^> ITBackend: Co loi hoac service khong ton tai.
)
echo.

echo [2/2] Dang khoi dong lai ITFrontend...
"%NSSM%" restart ITFrontend
if %errorlevel% equ 0 (
    echo      --^> ITFrontend: Khoi dong lai THANH CONG!
) else (
    echo      --^> ITFrontend: Co loi hoac service khong ton tai.
)
echo.

echo ========================================================
echo        HOAN TAT TIEN TRINH KHOI DONG LAI!
echo ========================================================
echo.
pause
