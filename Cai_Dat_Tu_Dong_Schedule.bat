@echo off
setlocal EnableDelayedExpansion
title CAI DAT LICH TU DONG - OUTLOOK MEMO AGENT
cd /d "%~dp0"
cls

echo ====================================================================
echo   CAI DAT TU DONG CHAY OUTLOOK MEMO AGENT VAO WINDOWS
echo ====================================================================
echo.
echo Dang thiet lap cac lich tu dong:
echo   1. Khoi dong cung Windows (Moi khi mo may / dang nhap).
echo   2. Quet va Dong bo tu dong luc 09:30 sang hang ngay.
echo   3. Quet va Dong bo tu dong luc 14:00 chieu hang ngay.
echo   4. Quet va Dong bo tu dong luc 19:00 toi hang ngay.
echo.

set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"
set "VBS_TARGET=%CURRENT_DIR%\Chay_Ngam.vbs"

:: 1. Tao Shortcut khoi dong cung Windows
echo Set WshShell = CreateObject("WScript.Shell") > "%TEMP%\_create_memo_lnk.vbs"
echo strStartup = WshShell.SpecialFolders("Startup") >> "%TEMP%\_create_memo_lnk.vbs"
echo Set objLnk = WshShell.CreateShortcut(strStartup ^& "\GGGMailMemo_Startup.lnk") >> "%TEMP%\_create_memo_lnk.vbs"
echo objLnk.TargetPath = "wscript.exe" >> "%TEMP%\_create_memo_lnk.vbs"
echo objLnk.Arguments = Chr(34) ^& WScript.Arguments(0) ^& Chr(34) >> "%TEMP%\_create_memo_lnk.vbs"
echo objLnk.WorkingDirectory = WScript.Arguments(1) >> "%TEMP%\_create_memo_lnk.vbs"
echo objLnk.WindowStyle = 7 >> "%TEMP%\_create_memo_lnk.vbs"
echo objLnk.Save >> "%TEMP%\_create_memo_lnk.vbs"

cscript //nologo "%TEMP%\_create_memo_lnk.vbs" "%VBS_TARGET%" "%CURRENT_DIR%" >nul 2>nul
del "%TEMP%\_create_memo_lnk.vbs" >nul 2>nul

if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\GGGMailMemo_Startup.lnk" (
    echo [OK] 1. Da cai dat khoi dong cung Windows thanh cong.
) else (
    echo [!] 1. Khong the tao shortcut khoi dong cung Windows.
)

:: 2. Lich 09:30 sang hang ngay
schtasks /create /tn "GGGMailMemo_09h30" /tr "wscript.exe """%VBS_TARGET%"""" /sc daily /st 09:30 /f >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 2. Da tao lich chay luc 09:30 sang hang ngay.
) else (
    echo [!] 2. Khong the tao lich 09:30.
)

:: 3. Lich 14:00 chieu hang ngay
schtasks /create /tn "GGGMailMemo_14h00" /tr "wscript.exe """%VBS_TARGET%"""" /sc daily /st 14:00 /f >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 3. Da tao lich chay luc 14:00 chieu hang ngay.
) else (
    echo [!] 3. Khong the tao lich 14:00.
)

:: 4. Lich 19:00 toi hang ngay
schtasks /create /tn "GGGMailMemo_19h00" /tr "wscript.exe """%VBS_TARGET%"""" /sc daily /st 19:00 /f >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 4. Da tao lich chay luc 19:00 toi hang ngay.
) else (
    echo [!] 4. Khong the tao lich 19:00.
)

echo.
echo ====================================================================
echo  HOAN TAT CAI DAT LICH TU DONG!
echo.
echo  He thong se tu dong quet email Memo 3 lan moi ngay:
echo    - 09:30 sang
echo    - 14:00 chieu
echo    - 19:00 toi
echo  va moi khi ban bat may tinh dang nhap vao Windows.
echo ====================================================================
echo.
echo Dang khoi dong Agent chay ngam ngay bay gio...
start "" wscript.exe "%VBS_TARGET%"
echo [OK] Agent da duoc kich hoat chay ngam!
echo Ban co the kiem tra tren Web Server, muc 'Local Agent' se chuyen sang mau xanh (Online).
echo.
pause
