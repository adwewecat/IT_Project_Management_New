@echo off
chcp 65001 > nul
title 3CX Hotline Desktop Agent
echo ========================================================
echo   KHỞI ĐỘNG 3CX HOTLINE AGENT TỰ ĐỘNG BẮT CUỘC GỌI
echo ========================================================
echo.
python 3cx_hotline_agent.py
pause
