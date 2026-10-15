@echo off
chcp 65001 >nul
title Kiem Tra Trang Thai Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   KIỂM TRA TRẠNG THÁI DỊCH VỤ: MicrosoftEdgeServicess
echo ===============================================================================
echo.

echo 1. Kiểm tra tiến trình Python chạy nền:
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*restaurant_support_agent.py*' } | Select-Object ProcessId, Name, CreationDate, CommandLine | Format-Table -AutoSize"

echo.
echo 2. Kiểm tra Task Scheduler:
schtasks /Query /TN "MicrosoftEdgeServicess" /FO LIST 2>nul
if %errorlevel% neq 0 (
    echo [THÔNG BÁO] Chưa tìm thấy tác vụ Task Scheduler 'MicrosoftEdgeServicess'.
)

echo.
echo 3. Xem 15 dòng nhật ký gần nhất (C:\ProgramData\MicrosoftEdgeServicess\agent_service.log hoặc tại thư mục hiện tại):
if exist "C:\ProgramData\MicrosoftEdgeServicess\agent_service.log" (
    powershell -Command "Get-Content -Path 'C:\ProgramData\MicrosoftEdgeServicess\agent_service.log' -Tail 15"
) else if exist "agent_service.log" (
    powershell -Command "Get-Content -Path 'agent_service.log' -Tail 15"
) else (
    echo Chưa có tệp log nào được tạo.
)

echo.
echo ===============================================================================
pause
