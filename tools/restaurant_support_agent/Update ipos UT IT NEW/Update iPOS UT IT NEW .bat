@echo off
title DANG CAP NHAT IPOS - UT
color 0b

echo Cap nhat noi dung moi ipos - UT
echo	II	IIIIIIIIII	IIIIIIIIII	IIIIIIIIII
echo	II	II	II	II	II	II
echo	II	IIIIIIIIII	II	II	IIIIIIIIII
echo	II	II		II	II	IIIIIIIIII
echo	II	II		II	II		II
echo	II	II		IIIIIIIIII	IIIIIIIIII

taskkill /f /im cbui.exe >nul 2>&1

echo ========================================================
echo              DANG CAP NHAT NOI DUNG IPOS - UT
echo ========================================================

:: Khai bao link thu muc Nextcloud va thu muc tam
set "SHARE_URL=https://pos.thecoffeehouse.vip/s/k29fAG9ptMcos8z/download"
set "TEMP_ZIP=%TEMP%\ipos_update_ut.zip"
set "EXTRACT_DIR=%TEMP%\ipos_extracted_ut"

:: 1. Tai goi cap nhat tu Nextcloud
echo [1/3] Dang tai ban cap nhat moi nhat...
curl -# -L -k "%SHARE_URL%?v=%RANDOM%" -o "%TEMP_ZIP%"

if not exist "%TEMP_ZIP%" (
    echo [LOI] Khong the tai file cap nhat. Vui long kiem tra ket noi mang!
    timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
    exit /b 1
)

:: 2. Tu dong giai nen
echo [2/3] Dang giai nen du lieu...
if exist "%EXTRACT_DIR%" rmdir /s /q "%EXTRACT_DIR%"
powershell -Command "Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%EXTRACT_DIR%' -Force"

:: 3. Ghi de vao dung cac thu muc cua he thong iPOS
echo [3/3] Dang ghi de cac file vao he thong...
:: Tu dong tim thu muc ben trong goi zip de copy dung vao D:\ipos\Client
for /d %%R in ("%EXTRACT_DIR%\*") do (
    if exist "%%R\Client" xcopy "%%R\Client\*" "D:\ipos\Client\" /s /e /y /q >nul 2>&1
    if exist "%%R\Templates" xcopy "%%R\Templates\*" "D:\ipos\Client\Templates\" /s /e /y /q >nul 2>&1
)
:: Hoac chep thang theo ten Z1UT_IT_NEW
xcopy "%EXTRACT_DIR%\Z1UT_IT_NEW\Client\*" "D:\ipos\Client\" /s /e /y /q >nul 2>&1
xcopy "%EXTRACT_DIR%\Z1UT_IT_NEW\Templates\*" "D:\ipos\Client\Templates\" /s /e /y /q >nul 2>&1

:: Don dep file rac sau khi cap nhat xong
del /f /q "%TEMP_ZIP%" >nul 2>&1
rmdir /s /q "%EXTRACT_DIR%" >nul 2>&1

:: 4. Khoi dong lai he thong
echo ========================================================
echo CAP NHAT THANH CONG, IPOS DANG DUOC KHOI DONG LAI. . . . 
echo Cua so se tu dong dong sau 5 giay...
echo ========================================================
START "" "D:\ipos\Client\Loader.exe"
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
exit /b 0

