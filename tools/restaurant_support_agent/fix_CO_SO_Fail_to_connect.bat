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
set "ADMIN_PASS=GGrg@2025"

:: -------------------------------------------------------------------------------
:: 2. Kiem tra quyen Administrator va tu dong nang quyen
:: -------------------------------------------------------------------------------
:BatDauKiemTraQuyen
:: 1. Kiem tra co da qua buoc nang quyen (Bao ve chong vong lap vo han)
if /i "%~1"=="/elevated" goto :DaCoQuyenAdmin
if /i "%~1"=="/retried" goto :LoiChuaCoQuyenAdmin

net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: Neu da khai bao mat khau ADMIN_PASS -> Tu dong dang nhap ngam qua Credential (KHONG BIEU THI HOP THOAI UAC)
if not "%ADMIN_PASS%"=="" (
    echo Dang tu dong xac thuc quyen Administrator bang tai khoan [%ADMIN_USER%]...

    :: Thu 1: Chay tien trinh voi tai khoan ADMIN_USER khai bao
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $u='%ADMIN_USER%'; $p='%ADMIN_PASS%'; $s=ConvertTo-SecureString $p -AsPlainText -Force; $c=New-Object System.Management.Automation.PSCredential($u,$s); Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\" /elevated' -Credential $c; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 exit /b 0

    :: Thu 2: Thu voi tai khoan Administrator (neu may tram de mac dinh Administrator)
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $u='Administrator'; $p='%ADMIN_PASS%'; $s=ConvertTo-SecureString $p -AsPlainText -Force; $c=New-Object System.Management.Automation.PSCredential($u,$s); Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\" /elevated' -Credential $c; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 exit /b 0

    :: Thu 3: Thu voi prefix may tram: .\%ADMIN_USER%
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $u='.\%ADMIN_USER%'; $p='%ADMIN_PASS%'; $s=ConvertTo-SecureString $p -AsPlainText -Force; $c=New-Object System.Management.Automation.PSCredential($u,$s); Start-Process cmd.exe -ArgumentList '/c \"\"%~f0\"\" /elevated' -Credential $c; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 exit /b 0
)

echo.
echo ===============================================================================
echo   DANG KICH HOAT QUYEN QUAN TRI VIEN (WINDOWS UAC)...
echo   Vui long chon [YES] (hoac Co) tren hop thoai Windows UAC de tiep tuc...
echo ===============================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '/elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:: Neu khong the mo UAC tu dong, huong dan nguoi dung chay thu cong bang Run as administrator
goto :LoiChuaCoQuyenAdmin

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
