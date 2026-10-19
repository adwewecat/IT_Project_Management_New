@echo off
title CHAY THU NGHIEM REMOTE WORKER (TU DONG KET NOI)
chcp 437 >nul
cls

echo ==============================================================================
echo       CONG CU THU NGHIEM REMOTE WORKER TU DONG (CLIENT AGENT)
echo ==============================================================================
echo  Chuong trinh se TU DONG tim phien Remote tren Web va truyen man hinh ngay
echo  KHONG CAN GO LENH HOAC COPY SESSION ID THU CONG!
echo ==============================================================================
echo.

set SERVER_URL=http://127.0.0.1:8000
set SESSION_ID=%1

if "%SESSION_ID%"=="" set SESSION_ID=auto

echo Dang ket noi den Relay Server: %SERVER_URL%
echo Che do Session: %SESSION_ID% (Tu dong nhan dien phien tren Web)
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

:Done
echo.
echo ==============================================================================
echo  Tien trinh Remote Worker da ket thuc.
echo  Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
echo ==============================================================================
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
