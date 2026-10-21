@echo off
title KHOI DONG LAI MONGODB VA UNG DUNG GPOS (CO/SO/KDS)
cd /d "%~dp0"

:: ===============================================================================
:: CAU HINH TAI KHOAN QUAN TRI (ADMINISTRATOR) - TU DONG NANG QUYEN AN TOAN
:: - ADMIN_USER    : Ten tai khoan Admin (Mac dinh: Administrator)
:: - ADMIN_PASS_ENC: Mat khau da duoc ma hoa bang thuat toan AES SecureString.
::                   Khi mo file bang Notepad, mat khau hoan toan duoc che giau.
:: - HUONG DAN CAI DAT / MA HOA MAT KHAU MOI:
::   + Cach 1: Chay file nay voi tham so /setpass hoac /mahoa
::             (Vi du trong CMD: fix_CO_SO_Fail_to_connect.bat /setpass)
::   + Cach 2: Tao file admin_pass.txt (chua mat khau) dat cung thu muc,
::             chay file nay 1 lan, he thong tu dong ma hoa vao file va xoa sach file txt!
:: ===============================================================================
set "ADMIN_USER=APP"
set "ADMIN_PASS_ENC=76492d1116743f0423413b16050a5345MgB8AEcAWABDAHMAdwBGAEMASgBWAHoAbAA0AHkAeQB3AGwAaABYAEMAbQAyAEEAPQA9AHwAMgA2AGUAYQAzADgAMAA1ADYAMQBiAGUAZgBmAGEAMQAzADgAYwBiAGIAZgA4AGEAMABjADMAOQA3AGUAYQAxADkAOAA1ADYAZgAyADIANgAyAGEAOQBmAGEANgA1ADkAZAAzAGIAMwA0ADIAZgBiADMAYwA3AGIAMAA1AGUAZgA="

:: -------------------------------------------------------------------------------
:: 0. Kiem tra xem co file admin_pass.txt hoac admin_account.txt de tu dong ma hoa
:: -------------------------------------------------------------------------------
if exist "%~dp0admin_account.txt" goto :TuDongMaHoaTuFileAccount
if exist "%~dp0admin_pass.txt" goto :TuDongMaHoaTuFilePass
goto :BoQuaMaHoaTuFile

:TuDongMaHoaTuFileAccount
echo [THIET LAP] Phat hien file admin_account.txt, dang tien hanh ma hoa mat khau...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~dp0admin_account.txt'; $bat='%~f0'; $lines=Get-Content -Path $f; if ($lines.Count -ge 1) { $u=$lines[0].Trim(); $p=''; if ($lines.Count -ge 2) { $p=$lines[1].Trim() }; if ($p) { $k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); $sec=ConvertTo-SecureString $p -AsPlainText -Force; $enc=ConvertFrom-SecureString $sec -Key $k; $txt=[System.IO.File]::ReadAllText($bat); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_USER=[^\"]*\"', \"set `\"ADMIN_USER=$u`\"\"); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_PASS_ENC=[^\"]*\"', \"set `\"ADMIN_PASS_ENC=$enc`\"\"); [System.IO.File]::WriteAllText($bat, $txt); Write-Host '[OK] Da ma hoa va cap nhat User/Pass vao file script thanh cong!'; Remove-Item -Path $f -Force -ErrorAction SilentlyContinue; Start-Process -FilePath $bat -ArgumentList '%*'; exit 0 } }"
exit /b 0

:TuDongMaHoaTuFilePass
echo [THIET LAP] Phat hien file admin_pass.txt, dang tien hanh ma hoa mat khau...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~dp0admin_pass.txt'; $bat='%~f0'; $p=(Get-Content -Path $f -Raw).Trim(); if ($p) { $k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); $sec=ConvertTo-SecureString $p -AsPlainText -Force; $enc=ConvertFrom-SecureString $sec -Key $k; $txt=[System.IO.File]::ReadAllText($bat); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_PASS_ENC=[^\"]*\"', \"set `\"ADMIN_PASS_ENC=$enc`\"\"); [System.IO.File]::WriteAllText($bat, $txt); Write-Host '[OK] Da ma hoa va cap nhat mat khau vao file script thanh cong!'; Remove-Item -Path $f -Force -ErrorAction SilentlyContinue; Start-Process -FilePath $bat -ArgumentList '%*'; exit 0 } }"
exit /b 0

:BoQuaMaHoaTuFile

:: -------------------------------------------------------------------------------
:: 1. Che do chay tham so /setpass hoac /mahoa de nhap mat khau truc tiep tu ban phim
:: -------------------------------------------------------------------------------
if "%~1"=="/setpass" goto :MenuMaHoaMatKhau
if "%~1"=="/mahoa" goto :MenuMaHoaMatKhau
if "%~1"=="/encrypt" goto :MenuMaHoaMatKhau
goto :BatDauKiemTraQuyen

:MenuMaHoaMatKhau
cls
echo ===============================================================================
echo   CONG CU MA HOA MAT KHAU QUAN TRI VIEN (ADMINISTRATOR)
echo   Mat khau sau khi ma hoa se duoc luu an toan vao file fix_CO_SO_Fail_to_connect.bat
echo   Khi mo file bang Notepad, mat khau hoan toan duoc ma hoa AES (khong lo pass).
echo ===============================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=Read-Host 'Nhap ten tai khoan Admin (de trong mac dinh la %ADMIN_USER%)'; if (-not $u) { $u='%ADMIN_USER%' }; Write-Host 'Nhap mat khau can ma hoa (ky tu se duoc che giau bang dau *): ' -NoNewline; $pwd=''; while($true){ $k=[System.Console]::ReadKey($true); if ($k.Key -eq [System.ConsoleKey]::Enter) { break } elseif ($k.Key -eq [System.ConsoleKey]::Backspace) { if ($pwd.Length -gt 0) { $pwd=$pwd.Substring(0, $pwd.Length-1); Write-Host \"`b `b\" -NoNewline } } elseif ($k.KeyChar -ge 32) { $pwd+=$k.KeyChar; Write-Host '*' -NoNewline } }; Write-Host ''; if ($pwd) { $k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); $sec=ConvertTo-SecureString $pwd -AsPlainText -Force; $enc=ConvertFrom-SecureString $sec -Key $k; $bat='%~f0'; $txt=[System.IO.File]::ReadAllText($bat); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_USER=[^\"]*\"', \"set `\"ADMIN_USER=$u`\"\"); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_PASS_ENC=[^\"]*\"', \"set `\"ADMIN_PASS_ENC=$enc`\"\"); [System.IO.File]::WriteAllText($bat, $txt); Write-Host ''; Write-Host '[THANH CONG] Da ma hoa mat khau va luu truc tiep vao file script!' -ForegroundColor Green; Write-Host ('Tai khoan : ' + $u); Write-Host ('Chuoi ma hoa AES: ' + $enc.Substring(0, [Math]::Min(30, $enc.Length)) + '...') -ForegroundColor Yellow } else { Write-Host '[!] Mat khau trong, khong co thay doi.' -ForegroundColor Red }"
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:: -------------------------------------------------------------------------------
:: 2. Kiem tra quyen Administrator va tu dong nang quyen
:: -------------------------------------------------------------------------------
:BatDauKiemTraQuyen
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

echo.
echo ===============================================================================
echo   DANG KICH HOAT QUYEN QUAN TRI VIEN (WINDOWS UAC)...
echo   Vui long chon [YES] (hoac Co) tren hop thoai Windows UAC de tiep tuc...
echo ===============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\" /elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

set "VBS_TEMP=%TEMP%\elevate_%RANDOM%.vbs"
echo Set UAC = CreateObject^("Shell.Application"^) > "%VBS_TEMP%"
echo UAC.ShellExecute "cmd.exe", "/c ""%~f0"" /elevated", "", "runas", 1 >> "%VBS_TEMP%"
cscript //nologo "%VBS_TEMP%" >nul 2>&1
del /f /q "%VBS_TEMP%" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   Tien trinh stop/start MongoDB va Java bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan xu ly:
echo   1. Nhap CHUOT PHAI vao file: fix_CO_SO_Fail_to_connect.bat
echo   2. Chon: "Run as administrator" (Chay voi quyen quan tri vien)
echo   3. Khi Windows hoi "Do you want to allow...", hay bam [YES].
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:: -------------------------------------------------------------------------------
:: 3. Tien trinh chinh sau khi da co quyen Administrator
:: -------------------------------------------------------------------------------
:DaCoQuyenAdmin
cls
echo ===============================================================================
echo   TIEN TRINH KHOI DONG LAI MONGODB VA UNG DUNG GPOS (CO / SO / KDS)
echo ===============================================================================
echo   Quyen thuc thi: Administrator [OK]
echo.

:: 1. Ket thuc cac tien trinh Java dang treo
echo [1/7] Dang dung tien trinh Java / Javaw treo...
taskkill /F /IM java.exe >nul 2>&1
taskkill /F /IM javaw.exe >nul 2>&1

:: 2. Xac dinh ten service MongoDB
echo [2/7] Dang xac dinh dich vu MongoDB...
set "MDB_SVC="
for %%S in ("MongoDB Server" "MongoDB" "mongodb" "MongoDBServer" "mongod" "Mongo") do (
    sc query "%%~S" >nul 2>&1 && if not defined MDB_SVC set "MDB_SVC=%%~S"
)

:: Neu chua tim thay, quet toan bo danh sach service co chu 'mongo'
if "%MDB_SVC%"=="" (
    for /f "tokens=2 delims=: " %%A in ('sc query state^= all ^| findstr /i "SERVICE_NAME" ^| findstr /i "mongo"') do (
        if not defined MDB_SVC set "MDB_SVC=%%A"
    )
)

if "%MDB_SVC%"=="" goto :KhongTimThayService

echo [OK] Da tim thay Windows Service: "%MDB_SVC%"

:: 3. Dung service MongoDB va giai phong tien trinh treo
echo [3/7] Dang dung dich vu "%MDB_SVC%"...
net stop "%MDB_SVC%" >nul 2>&1
timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul
taskkill /F /IM mongod.exe >nul 2>&1
timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul

:: 4. Khoi dong lai service MongoDB
echo [4/7] Dang khoi dong lai dich vu "%MDB_SVC%"...
net start "%MDB_SVC%" >nul 2>&1
if errorlevel 1 (
    echo [!] Net start gap su co, dang khoi dong bang sc start...
    sc start "%MDB_SVC%" >nul 2>&1
)
timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul

:: Kiem tra neu co dich vu Mosquitto Broker thi khoi dong lai
for %%M in ("Mosquitto" "mosquitto" "Mosquitto Broker") do (
    sc query "%%~M" >nul 2>&1 && (
        net stop "%%~M" >nul 2>&1
        taskkill /F /IM mosquitto.exe >nul 2>&1
        net start "%%~M" >nul 2>&1
    )
)

:: 5. Chay lai ung dung Gpos CO/SO Java
echo [5/7] Dang khoi dong ung dung Gpos CO/SO (fxlauncher.jar)...
if not exist "D:\GPOS-Setup\app\fxlauncher.jar" goto :KhongCoGposCOSO
cd /d "D:\GPOS-Setup\app"
start "" javaw -jar fxlauncher.jar
echo [OK] Da khoi chay Gpos CO/SO.
goto :TiepTucKDS

:KhongCoGposCOSO
echo [!] Khong tim thay thu muc D:\GPOS-Setup\app\fxlauncher.jar

:TiepTucKDS
:: 6. Chay lai ung dung Gpos KDS
echo [6/7] Dang khoi dong ung dung Gpos KDS (fxlauncher_kds.jar)...
if not exist "D:\KDS-GPOS-Setup\app\fxlauncher_kds.jar" goto :KhongCoKDS
cd /d "D:\KDS-GPOS-Setup\app"
start "" javaw -jar fxlauncher_kds.jar
echo [OK] Da khoi chay Gpos KDS.
goto :TiepTucPrintStamp

:KhongCoKDS
echo [!] Nha hang khong su dung KDS (D:\KDS-GPOS-Setup\app khong ton tai)

:TiepTucPrintStamp
:: 7. Chay lai ung dung Gpos PrintStampService IN TEM
echo [7/7] Dang khoi dong ung dung Gpos In Tem (PrintStampService)...
if not exist "D:\PrintStampService\app\fxlauncher.jar" goto :KhongCoPrintStamp
cd /d "D:\PrintStampService\app"
start "" javaw -jar fxlauncher.jar
echo [OK] Da khoi chay In Tem (PrintStampService).
goto :HoanTat

:KhongCoPrintStamp
echo [!] Nha hang khong su dung PrintStampService IN TEM

:HoanTat
echo.
echo ===============================================================================
echo   HOAN TAT QUA TRINH XU LY LOI CO/SO FAIL TO CONNECT!
echo   MongoDB da duoc khoi dong lai, cac ung dung GPOS dang nap vao bo nho.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:KhongTimThayService
echo.
echo ===============================================================================
echo   [LOI] KHONG TIM THAY DICH VU MONGODB TREN HE THONG!
echo   Vui long mo cua so Services (services.msc) de kiem tra lai ten dich vu.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 1
