@echo off
title IT Management 5002
echo ===================================================
echo   KHOI DONG HE THONG IT MANAGEMENT (PORT 5002)
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5002
echo ===================================================
start "Backend 8000" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe run.py"
start "Frontend 5002" cmd /k "cd /d %~dp0frontend && npx vite preview --host 0.0.0.0 --port 5002"
echo He thong dang chay tai port 5002!
