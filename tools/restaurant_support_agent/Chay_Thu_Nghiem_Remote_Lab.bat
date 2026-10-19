@echo off
title CHAY THU NGHIEM REMOTE WORKER (THAY THE TIGHTVNC SCRCPY)
chcp 437 >nul
cls

echo ==============================================================================
echo       CONG CU THU NGHIEM REMOTE WORKER DOC LAP (CLIENT AGENT)
echo ==============================================================================
echo  Chuong trinh nay se ket noi den Relay Server va stream man hinh ve Web
echo ==============================================================================
echo.

set SERVER_URL=http://127.0.0.1:8000
set SESSION_ID=%1

if not "%SESSION_ID%"=="" goto :HasSession

echo Hay nhap Session ID duoc cap tu giao dien Web:
set /p SESSION_ID="Session ID: "

:HasSession
if "%SESSION_ID%"=="" goto :NoSession

echo.
echo Dang khoi dong Remote Worker voi Session: %SESSION_ID%
echo Server URL: %SERVER_URL%
echo.

if exist python.exe goto :RunLocalPython
if exist ..\..\backend\.venv\Scripts\python.exe goto :RunVenvPython
goto :RunSystemPython

:RunLocalPython
python.exe remote_worker.py --server %SERVER_URL% --session %SESSION_ID%
goto :Done

:RunVenvPython
..\..\backend\.venv\Scripts\python.exe remote_worker.py --server %SERVER_URL% --session %SESSION_ID%
goto :Done

:RunSystemPython
python remote_worker.py --server %SERVER_URL% --session %SESSION_ID%
goto :Done

:NoSession
echo.
echo [LOI] Khong co Session ID nao duoc nhap!
echo Vui long truy cap man hinh 'Tich hop thay the Remote' tren Web de tao phien.
goto :Done

:Done
echo.
echo ==============================================================================
echo  Tien trinh Remote Worker da ket thuc.
echo  Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
echo ==============================================================================
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
