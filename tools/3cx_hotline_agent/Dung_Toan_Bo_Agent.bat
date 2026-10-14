@echo off
chcp 65001 >nul
title Dung toan bo tien trinh 3CX Hotline Client Agent

echo ==================================================================
echo   DON DEP VA DUNG TOAN BO TIEN TRINH 3CX HOTLINE CLIENT AGENT
echo ==================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$procs = Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'powershell|wscript|cscript') -and ($_.CommandLine -like '*3CX_Hotline_Agent*' -or $_.CommandLine -like '*Run_Silent_Agent*') }; if ($procs) { $procs | ForEach-Object { Write-Host ('-> Dang dung PID ' + $_.ProcessId + ': ' + $_.Name) -ForegroundColor Yellow; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Write-Host '-> Da dung cac tien trinh 3CX Agent thanh cong!' -ForegroundColor Green } else { Write-Host '-> Khong co tien trinh 3CX Agent nao dang chay ngam.' -ForegroundColor Green }"

echo.
echo ==================================================================
echo DA DON DEP SACH SE 100%% CAC TIEN TRINH 3CX CHAY NGAM!
echo ==================================================================
echo.
pause
