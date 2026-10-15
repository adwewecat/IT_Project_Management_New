@echo off
chcp 65001 >nul
title [TEST] MicrosoftEdgeServicess - Chay Truc Tiep Kiem Tra
cd /d "%~dp0"

echo ===============================================================================
echo   CHAY THU NGHIEM DICH VU HO TRO TU XA (AGENT MULTITASK)
echo   Service Name: MicrosoftEdgeServicess
echo ===============================================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [CANH BAO] Khong tim thay Python trong bien moi truong PATH!
    echo Vui long cai dat Python 3.8 tro len hoac kiem tra duong dan Python.
    echo.
    pause
    exit /b 1
)

echo Dang khoi dong Agent o che do Console (Nhan Ctrl+C de dung)...
echo.
python restaurant_support_agent.py

pause
