@echo off
title OUTLOOK MEMO AGENT - CAU NOI WEB VA OUTLOOK
cd /d "%~dp0"

echo ====================================================================
echo   OUTLOOK MEMO AGENT - KET NOI OUTLOOK DESKTOP VOI WEB
echo   (Luu y: Nhan dup de chay binh thuong, KHONG Run as administrator)
echo ====================================================================
echo.

set PYTHON_CMD=python
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\Python314\python.exe" (
        set PYTHON_CMD="C:\Program Files\Python314\python.exe"
    ) else if exist "C:\Program Files\Python313\python.exe" (
        set PYTHON_CMD="C:\Program Files\Python313\python.exe"
    ) else if exist "C:\Program Files\Python312\python.exe" (
        set PYTHON_CMD="C:\Program Files\Python312\python.exe"
    ) else if exist "C:\Program Files\Python311\python.exe" (
        set PYTHON_CMD="C:\Program Files\Python311\python.exe"
    ) else if exist "C:\Program Files\Python310\python.exe" (
        set PYTHON_CMD="C:\Program Files\Python310\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python314\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    ) else if exist "C:\Python314\python.exe" (
        set PYTHON_CMD="C:\Python314\python.exe"
    ) else if exist "C:\Python313\python.exe" (
        set PYTHON_CMD="C:\Python313\python.exe"
    ) else if exist "C:\Python312\python.exe" (
        set PYTHON_CMD="C:\Python312\python.exe"
    ) else if exist "C:\Python311\python.exe" (
        set PYTHON_CMD="C:\Python311\python.exe"
    ) else if exist "C:\Python310\python.exe" (
        set PYTHON_CMD="C:\Python310\python.exe"
    )
)

%PYTHON_CMD% -c "import win32com.client" >nul 2>nul
if %errorlevel% neq 0 (
    echo Dang cai dat thu vien pywin32 can thiet de ket noi Outlook...
    %PYTHON_CMD% -m pip install pywin32
)

set "AGENT_PY=%~dp0outlook_agent.py"
if not exist "%AGENT_PY%" (
    if exist "%~dp0tools\outlook_agent\outlook_agent.py" (
        set "AGENT_PY=%~dp0tools\outlook_agent\outlook_agent.py"
    ) else if exist "D:\Setup\Outlook_Memo_Agent_Full\outlook_agent.py" (
        set "AGENT_PY=D:\Setup\Outlook_Memo_Agent_Full\outlook_agent.py"
    )
)

if "%1"=="--restart" (
    echo Dang dung tien trinh Agent cu tren cong 18890...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":18890 .*LISTENING"') do (
        taskkill /F /PID %%a >nul 2>nul
    )
    timeout /t 1 /nobreak >nul
) else if not "%1"=="/silent" (
    if not "%1"=="--sync" (
        netstat -ano | findstr /R /C:":18890 .*LISTENING" >nul 2>nul
        if not errorlevel 1 (
            echo [THONG BAO] Phat hien Agent dang chay tren cong 18890.
            echo Dang giai phong tien trinh va nap phien ban moi nhat...
            for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":18890 .*LISTENING"') do (
                taskkill /F /PID %%a >nul 2>nul
            )
            timeout /t 1 /nobreak >nul
        )
    )
)

%PYTHON_CMD% "%AGENT_PY%" %*

if "%1"=="/silent" exit /b 0
pause
