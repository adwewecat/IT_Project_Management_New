@echo off
title DANG CAP NHAT IPOS - THE COFFEE HOUSE
color 0b

echo Cap nhat noi dung moi ipos 
echo	II	IIIIIIIIII	IIIIIIIIII	IIIIIIIIII
echo	II	II	II	II	II	II
echo	II	IIIIIIIIII	II	II	IIIIIIIIII
echo	II	II		II	II	IIIIIIIIII
echo	II	II		II	II		II
echo	II	II		IIIIIIIIII	IIIIIIIIII

msg * Dang update noi dung ipos, vui long khong tat >nul 2>&1
taskkill /f /im cbui.exe >nul 2>&1

echo ========================================================
echo              DANG CAP NHAT NOI DUNG IPOS
echo ========================================================

:: Khai bao link thu muc Nextcloud va thu muc tam
set "SHARE_URL=https://pos.thecoffeehouse.vip/s/twqLkYQx6m98rK5/download"
set "TEMP_ZIP=%TEMP%\ipos_update.zip"
set "EXTRACT_DIR=%TEMP%\ipos_extracted"

:: 1. Tai goi cap nhat tu Nextcloud
echo [1/3] Dang tai ban cap nhat moi nhat...
curl -# -L -k "%SHARE_URL%?v=%RANDOM%" -o "%TEMP_ZIP%"

if not exist "%TEMP_ZIP%" (
    echo [LOI] Khong the tai file cap nhat. Vui long kiem tra ket noi mang!
    pause
    exit /b
)

:: 2. Tu dong giai nen
echo [2/3] Dang giai nen du lieu...
if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%EXTRACT_DIR%' -Force"

:: 3. Ghi de vao dung cac thu muc cua he thong iPOS
echo [3/3] Dang ghi de cac file vao he thong...
:: Chep file Client vao D:\ipos\Client
xcopy "%EXTRACT_DIR%\Z1TCH_IT_NEW\Client\*" "D:\ipos\Client\" /s /e /y /q >nul 2>&1
:: Chep file Templates vao D:\ipos\Client\Templates
xcopy "%EXTRACT_DIR%\Z1TCH_IT_NEW\Templates\*" "D:\ipos\Client\Templates\" /s /e /y /q >nul 2>&1

:: Don dep file rac sau khi cap nhat xong
del /f /q "%TEMP_ZIP%" >nul 2>&1
rmdir /s /q "%EXTRACT_DIR%" >nul 2>&1

:: 4. Khoi dong lai he thong
echo ========================================================
echo CAP NHAT THANH CONG, IPOS DANG DUOC KHOI DONG LAI. . . . 
echo ========================================================
START "Test" "D:\ipos\Client\Loader.exe"
timeout /t 5


