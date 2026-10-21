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
if "%~1"=="/skipuac" goto :DaCoQuyenAdmin
if "%~1"=="/elevated" goto :DaCoQuyenAdmin
if "%~1"=="/silent" goto :DaCoQuyenAdmin

:: Phong ngua vong lap vo tan neu da thu
if "%~1"=="/retried" goto :LoiChuaCoQuyenAdmin

net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: Truong hop A: Co mat khau ma hoa -> Giai ma trong RAM va nang quyen bang tai khoan Admin
if not "%ADMIN_PASS_ENC%"=="" (
    echo Dang xac thuc va khoi chay quyen Administrator bang tai khoan [%ADMIN_USER%]...

    :: Thu cach 1: Task Scheduler voi dac quyen HIGHEST (Khong hien hop thoai UAC)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); try { $s=ConvertTo-SecureString '%ADMIN_PASS_ENC%' -Key $k; $b=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); $p=[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($b); [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b); $u='%ADMIN_USER%'; schtasks /delete /tn TempFixCoSoAdmin /f >$null 2>&1; schtasks /create /tn TempFixCoSoAdmin /tr '\"\"%~f0\"\" /elevated' /sc once /st 23:59 /ru $u /rp $p /rl HIGHEST /f >$null 2>&1; if ($LASTEXITCODE -eq 0) { schtasks /run /tn TempFixCoSoAdmin >$null 2>&1; Start-Sleep -Seconds 3; schtasks /delete /tn TempFixCoSoAdmin /f >$null 2>&1; exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto :KetThucNangQuyen

    :: Thu cach 2: ProcessStartInfo bang PowerShell (CreateProcessWithLogonW)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); try { $s=ConvertTo-SecureString '%ADMIN_PASS_ENC%' -Key $k; $psi=New-Object System.Diagnostics.ProcessStartInfo; $psi.FileName='cmd.exe'; $psi.Arguments='/c \"\"%~f0\"\" /elevated'; $psi.UserName='%ADMIN_USER%'; $psi.Password=$s; $psi.Domain='.'; $psi.UseShellExecute=$false; $pr=[System.Diagnostics.Process]::Start($psi); $pr.WaitForExit(); exit $pr.ExitCode } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto :KetThucNangQuyen

    goto :LoiSaiMatKhauAdmin
)

:: Truong hop B: Chua co mat khau ma hoa -> Dung hop thoai UAC mac dinh
echo Dang yeu cau cap quyen Administrator (Windows UAC)...
powershell -Command "Start-Process '%~f0' -ArgumentList '/retried' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 goto :KetThucNangQuyen

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   CANH BAO: CHUA CO QUYEN QUAN TRI VIEN (ADMINISTRATOR)
echo ===============================================================================
echo   Tien trinh stop/start MongoDB va Java yeu cau quyen Administrator!
echo.
echo   Huong dan xu ly:
echo   1. Nhap chuot phai vao file chon "Run as administrator"
echo   2. Hoac chay lenh: fix_CO_SO_Fail_to_connect.bat /setpass de ma hoa mat khau
echo   3. Hoac tao file admin_pass.txt cung thu muc de he thong tu dong ma hoa.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 1

:LoiSaiMatKhauAdmin
echo.
echo ===============================================================================
echo   [LOI XAC THUC] TAI KHOAN HOAC MAT KHAU ADMIN KHONG CHINH XAC!
echo ===============================================================================
echo   Tai khoan khai bao: [%ADMIN_USER%]
echo   Windows tu choi dang nhap bang thong tin xac thuc nay.
echo.
echo   Huong dan xu ly:
echo   - Chay lenh: fix_CO_SO_Fail_to_connect.bat /setpass de nhap lai mat khau moi
echo   - Hoac tao file admin_pass.txt chua pass dung va chay lai
echo   - Hoac nhap chuot phai chon "Run as administrator"
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 1

:KetThucNangQuyen
exit /b 0

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
for %%S in ("MongoDB Server" "MongoDB" "mongodb" "MongoDBServer") do (
    sc query "%%~S" >nul 2>&1 && if not defined MDB_SVC set "MDB_SVC=%%~S"
)

if "%MDB_SVC%"=="" goto :KhongTimThayService

echo [OK] Da tim thay Windows Service: "%MDB_SVC%"

:: 3. Dung service MongoDB
echo [3/7] Dang dung dich vu "%MDB_SVC%"...
net stop "%MDB_SVC%" >nul 2>&1
timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul

:: 4. Khoi dong lai service MongoDB
echo [4/7] Dang khoi dong lai dich vu "%MDB_SVC%"...
net start "%MDB_SVC%" >nul 2>&1
if errorlevel 1 (
    echo [!] Net start gap su co, dang khoi dong bang sc start...
    sc start "%MDB_SVC%" >nul 2>&1
)
timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul

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
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 1
