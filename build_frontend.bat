@echo off
title Build Frontend
cd /d "%~dp0frontend"
echo Dang build frontend...
call npm run build
echo Build thanh cong! Thu muc frontend/dist da san sang.
pause
