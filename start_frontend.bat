@echo off
title IT Project Management - Frontend (React 19 + Vite)
cd /d "%~dp0\frontend"
echo ===================================================
echo   KHOI DONG FRONTEND (React 19 + TypeScript + Vite)
echo   URL: http://localhost:5173
echo ===================================================

where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call pnpm run dev
) else (
    echo [INFO] Chua co pnpm trong PATH, tu dong khoi chay bang npm...
    call npm run dev
)
pause
