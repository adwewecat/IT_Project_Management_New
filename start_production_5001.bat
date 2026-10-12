@echo off
title IT Management 5001
echo ===================================================
echo   KHOI DONG HE THONG IT MANAGEMENT (PORT 5001)
echo   Backend: http://localhost:8000
echo   Frontend: http://localhost:5001
echo ===================================================
start "Backend 8000" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe run.py"
start "Frontend 5001" cmd /k "cd /d %~dp0frontend && npx vite preview --host 0.0.0.0 --port 5001"
echo He thong dang chay tai port 5001!
