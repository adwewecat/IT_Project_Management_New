@echo off
title 3CX Hotline Desktop Agent
cd /d "%~dp0"

echo ========================================================
echo   KHOI DONG 3CX HOTLINE AGENT TU DONG BAT CUOC GOI
echo ========================================================
echo.
python 3cx_hotline_agent.py

echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
