@echo off
title GO CAI DAT LICH - OUTLOOK MEMO AGENT
cls

echo ====================================================================
echo   GO CAI DAT LICH TU DONG OUTLOOK MEMO AGENT
echo ====================================================================
echo.

schtasks /delete /tn "GGGMailMemo_09h30" /f >nul 2>nul
schtasks /delete /tn "GGGMailMemo_14h00" /f >nul 2>nul
schtasks /delete /tn "GGGMailMemo_19h00" /f >nul 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\GGGMailMemo_Startup.lnk" >nul 2>nul
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\GGGMailMemo_Startup.vbs" >nul 2>nul

echo [OK] Da go bo cac lich hen gio va khoi dong cung Windows.
echo.
pause
