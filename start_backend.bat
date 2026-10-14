@echo off
title IT Project Management - Backend (FastAPI)
cd /d "%~dp0\backend"
echo ===================================================
echo   KHOI DONG BACKEND (Python 3.14 + FastAPI)
echo   Database Test: 127.0.0.1:1433 (ITDEPT)
echo   API Docs: http://localhost:8000/docs
echo ===================================================
:: Tu dong giai phong port 8000 neu co tien trinh cu dang chiem
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

call .venv\Scripts\python.exe run.py
pause
