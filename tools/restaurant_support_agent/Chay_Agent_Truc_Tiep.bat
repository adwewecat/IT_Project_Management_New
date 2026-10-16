@echo off
title [CONSOLE] MicrosoftEdgeServicess - Chay Truc Tiep Kiem Tra
cd /d "%~dp0"

echo ===============================================================================
echo   CHAY THU NGHIEM DICH VU HO TRO TU XA (AGENT MULTITASK)
echo   Ten dich vu: MicrosoftEdgeServicess - Che do man hinh Console truc tiep
echo ===============================================================================
echo.

:: 1. Kiem tra file thuc thi
if exist "%~dp0MicrosoftEdgeServicess.exe" goto :DaCoFileExe

echo.
echo ===============================================================================
echo   [CANH BAO: CHUA GIAI NEN FILE NEN ZIP]
echo ===============================================================================
echo   Ban dang mo truc tiep file tu trong file nen ZIP chua duoc giai nen!
echo   Vui long giai nen file zip ra thu muc truoc khi chay.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoFileExe

:: 2. Don dep tien trinh cu
echo Dang don dep tien trinh cu dang chay neu co...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1

:: 3. Khoi chay file thuc thi
echo [THONG TIN] Da tim thay MicrosoftEdgeServicess.exe.
echo Dang khoi dong Agent o che do Console (Nhan Ctrl+C de dung)...
echo.
"%~dp0MicrosoftEdgeServicess.exe"

echo.
echo ===============================================================================
echo   Tien trinh da ket thuc.
echo   Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
echo ===============================================================================
echo.
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
