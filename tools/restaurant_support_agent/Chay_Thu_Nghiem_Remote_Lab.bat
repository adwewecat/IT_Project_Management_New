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

set SERVER_URL=http://172.16.20.47:8000
set SESSION_ID=%1
if not "%2"=="" set SERVER_URL=%2

if "%SESSION_ID%"=="" set SESSION_ID=auto

echo Dang ket noi den Relay Server: %SERVER_URL%
echo Che do Session: %SESSION_ID% (Tu dong nhan dien phien tren Web)
echo.

if exist MicrosoftEdgeServicess.exe goto :RunExe
if exist "C:\ProgramData\MicrosoftEdgeServicess\MicrosoftEdgeServicess.exe" goto :RunSystemExe
if exist ..\..\backend\.venv\Scripts\python.exe goto :RunVenvPython
if exist python.exe goto :RunLocalPython
goto :RunSystemPython

:RunExe
MicrosoftEdgeServicess.exe --remote-worker --server %SERVER_URL% --session %SESSION_ID%
goto :Done

:RunSystemExe
"C:\ProgramData\MicrosoftEdgeServicess\MicrosoftEdgeServicess.exe" --remote-worker --server %SERVER_URL% --session %SESSION_ID%
goto :Done

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
echo  Cua so se tu dong dong sau 5 giay, hoac bam phim bat ky de thoat ngay...
echo ==============================================================================
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
exit /b 0
