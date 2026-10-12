@echo off
title IT Project Management - Launcher
echo ===================================================
echo   KHOI DONG HE THONG IT PROJECT MANAGEMENT NEW
echo   1. Backend:  http://localhost:8000/docs
echo   2. Frontend: http://localhost:5173
echo ===================================================

:: Tu dong giai phong port 8000 neu co tien trinh cu dang chiem
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

start "Backend FastAPI" cmd /k "cd /d %~dp0\backend && .venv\Scripts\python.exe run.py"
timeout /t 2 /nobreak >nul
start "Frontend Vite" cmd /k "cd /d %~dp0\frontend && pnpm run dev"

echo Da khoi dong ca Backend va Frontend!
pause
