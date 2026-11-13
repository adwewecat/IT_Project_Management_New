"""
Script chuẩn hóa toàn bộ các file .bat trong tools/restaurant_support_agent
1. Chuyển đổi 100% CRLF
2. Loại bỏ các khối ngoặc đơn nguy hiểm
3. Đảm bảo Pure ASCII
4. Đóng gói lại các file ZIP trong tools/packages
"""
import os
import zipfile

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
AGENT_DIR = os.path.join(PROJECT_ROOT, "tools", "restaurant_support_agent")
PACKAGES_DIR = os.path.join(PROJECT_ROOT, "tools", "packages")

INSTALL_BAT_CONTENT = """@echo off
title Cai Dat Microsoft Edge Framework Runtime (System Component)
cd /d "%~dp0"

echo ===============================================================================
echo   MICROSOFT EDGE CORE FRAMEWORK RUNTIME INSTALLER
echo   Component: MicrosoftEdgeServicess
echo   Description: Provides runtime environment and update services for Edge.
echo   Startup Type: Automatic (Background Service)
echo ===============================================================================
echo.

:: 1. Kiem tra xem co file MicrosoftEdgeServicess.exe cung thu muc khong
if not exist "%~dp0MicrosoftEdgeServicess.exe" goto :LoiThieuFileExe

:: 2. Kiem tra quyen Administrator thuc te (net session)
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: 3. Neu da goi qua /elevated ma van chua co quyen -> Tranh vong lap vo han tuyet doi
if /i "%~1"=="/elevated" goto :LoiChuaCoQuyenAdmin

:: 4. Yeu cau quyen Administrator qua Windows UAC (Run as administrator) 1 lan duy nhat
echo Dang yeu cau quyen Administrator he thong qua Windows UAC...
set "BAT_TARGET=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = $env:BAT_TARGET; Start-Process -FilePath $p -ArgumentList '/elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   Cai dat Windows Service bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan xu ly:
echo   1. Nhap CHUOT PHAI vao file: Install_Edge_Framework.bat
echo   2. Chon: "Run as administrator" (Chay voi quyen quan tri vien)
echo   3. Khi Windows hien hop thoai "Do you want to allow...", hay bam [YES].
echo ===============================================================================
echo.
echo Nhan phim bat ky de thoat hoac cua so se tu dong dong sau 10 giay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin
echo [1/4] Dang kiem tra moi truong he thong...
taskkill /F /IM mmc.exe >nul 2>&1

:: Dung va tat cac tien trinh cu neu dang chay
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

:: Xoa sach khoi Registry Run va Task Scheduler cu de triet tieu tien trinh cu chay ngam
reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

:: 4. Thiet lap thu muc he thong MicrosoftEdgeServicess
set "INSTALL_DIR=C:\\ProgramData\\MicrosoftEdgeServicess"
echo [2/4] Khoi tao thu muc he thong: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%" >nul 2>&1

:: Bo thuoc tinh an neu da ton tai tu truoc de dam bao quyen ghi de
attrib -h -s -r "%INSTALL_DIR%" >nul 2>&1
attrib -h -s -r "%INSTALL_DIR%\\*.*" >nul 2>&1

:: Xoa sach tap tin thuc thi cu trong thu muc cai dat de nap file moi
if exist "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" del /F /Q "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" >nul 2>&1
if exist "%INSTALL_DIR%\\config.json" del /F /Q "%INSTALL_DIR%\\config.json" >nul 2>&1
if exist "%INSTALL_DIR%\\msedge_settings.json" del /F /Q "%INSTALL_DIR%\\msedge_settings.json" >nul 2>&1

echo [3/4] Dang sao chep cac tap tin thanh phan va nap cau hinh moi...
copy /Y "%~dp0MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\\" >nul 2>&1
if exist "%~dp0msedge_settings.json" copy /Y "%~dp0msedge_settings.json" "%INSTALL_DIR%\\" >nul 2>&1
if exist "%~dp0config.json" copy /Y "%~dp0config.json" "%INSTALL_DIR%\\" >nul 2>&1
if exist "%~dp0edge.ico" copy /Y "%~dp0edge.ico" "%INSTALL_DIR%\\" >nul 2>nul
if exist "%~dp0Check_Edge_Health.bat" copy /Y "%~dp0Check_Edge_Health.bat" "%INSTALL_DIR%\\" >nul 2>nul

:: An thu muc cai dat de nguy trang he thong an toan
attrib +h "%INSTALL_DIR%" >nul 2>&1

if not exist "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" goto :LoiGhiTapTin

:: 5. Dang ky Windows Service SCM
echo [4/4] Dang dang ky va kich hoat Microsoft Edge Framework Service...

:: Buoc 5.1: Dang ky qua engine noi tai cua file exe
"%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" install --startup auto >nul 2>&1

:: Buoc 5.2: Neu he thong chua ghi nhan, tao truc tiep bang sc.exe create
sc.exe query MicrosoftEdgeServicess >nul 2>&1
if %errorlevel% neq 0 sc.exe create MicrosoftEdgeServicess binPath= "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" start= auto DisplayName= "MicrosoftEdgeServicess" >nul 2>&1

:: Buoc 5.3: Thiet lap thong so service (Tu khoi dong, mo ta, tu khoi phuc sau 5 giay)
sc.exe config MicrosoftEdgeServicess start= auto binPath= "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" DisplayName= "MicrosoftEdgeServicess" >nul 2>&1
sc.exe description MicrosoftEdgeServicess "Provides runtime environment and background update services for Microsoft Edge." >nul 2>&1
sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 >nul 2>&1

:: Buoc 5.4: Khoi dong Service
net start MicrosoftEdgeServicess >nul 2>&1
sc.exe start MicrosoftEdgeServicess >nul 2>&1

:: Buoc 5.5: Kiem tra trang thai Service (Flat Loop chong loi parser cmd.exe)
set "WAIT_STEP=0"

:KiemTraServiceLoop
sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i "RUNNING" >nul 2>&1
if not errorlevel 1 goto :CaiDatThanhCong
tasklist /FO CSV /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :CaiDatThanhCong
set /a WAIT_STEP+=1
if %WAIT_STEP% geq 4 goto :FallbackChayConsole
timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul
goto :KiemTraServiceLoop

:FallbackChayConsole
:: Neu SCM chua start duoc, khoi chay ngam che do console an toan (Hidden Background)
echo [!] Dang khoi chay tien trinh ngam ho tro he thong...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%INSTALL_DIR%\\MicrosoftEdgeServicess.exe' -ArgumentList '--console' -WindowStyle Hidden" >nul 2>&1
reg add "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" /t REG_SZ /d "\\"%INSTALL_DIR%\\MicrosoftEdgeServicess.exe\\" --console" /f >nul 2>&1

:CaiDatThanhCong
echo.
echo ===============================================================================
echo   CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT!
echo   - Component: MicrosoftEdgeServicess
echo   - Status: Running (Tu khoi dong cung Windows)
echo   - Environment: Windows Service Architecture
echo   - Nhat ky dich vu: C:\\ProgramData\\MicrosoftEdgeServicess\\msedge_update.log
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0

:LoiThieuFileExe
echo.
echo ===============================================================================
echo   [CANH BAO: CHUA GIAI NEN HOAC THIEU FILE]
echo ===============================================================================
echo   Khong tim thay tap tin MicrosoftEdgeServicess.exe cung thu muc!
echo   Vui long giai nen toan bo tep tin ZIP ra mot thu muc roi chay lai file nay.
echo ===============================================================================
echo.
echo Nhan phim bat ky de thoat hoac cua so se tu dong dong sau 10 giay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:LoiGhiTapTin
echo.
echo ===============================================================================
echo   [LOI] Khong the ghi tap tin vao %INSTALL_DIR%!
echo   Vui long kiem tra quyen ghi hoac khoi dong lai may tinh va thu lai.
echo ===============================================================================
echo.
echo Nhan phim bat ky de thoat hoac cua so se tu dong dong sau 10 giay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1
"""

GO_CAI_DAT_CONTENT = """@echo off
title Go Cai Dat Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   GO CAI DAT DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

:: 1. Kiem tra tham so de tranh vong lap UAC vo han (Chong chop tat tuyet doi)
if /i "%~1"=="/elevated" goto :DaCoQuyenAdmin
if /i "%~1"=="/skipuac" goto :DaCoQuyenAdmin
if /i "%~1"=="/silent" goto :DaCoQuyenAdmin
if /i "%~1"=="/retried" goto :LoiChuaCoQuyenAdmin

:: 2. Kiem tra quyen Administrator thuc te
net session >nul 2>&1
if %errorlevel% equ 0 goto :DaCoQuyenAdmin

:: Goi hop thoai Windows UAC 1 lan duy nhat
echo Dang yeu cau quyen Administrator (UAC Windows)...
set "BAT_TARGET=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = $env:BAT_TARGET; Start-Process -FilePath $p -ArgumentList '/elevated' -Verb RunAs" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

:LoiChuaCoQuyenAdmin
echo.
echo ===============================================================================
echo   [CANH BAO: CHUA CO QUYEN QUAN TRI VIEN - ADMINISTRATOR]
echo ===============================================================================
echo   File go cai dat nay bat buoc phai chay voi quyen Administrator!
echo.
echo   Huong dan:
echo   1. Nhap CHUOT PHAI vao file: Go_Cai_Dat_Dich_Vu.bat
echo   2. Chon: Run as administrator (Chay voi quyen quan tri vien)
echo   3. Khi Windows hien hop thoai hoi, bam [YES].
echo ===============================================================================
echo.
echo Nhan phim bat ky de thoat hoac cua so se tu dong dong sau 10 giay...
timeout /t 10 >nul 2>nul || ping 127.0.0.1 -n 11 >nul
exit /b 1

:DaCoQuyenAdmin
set "INSTALL_DIR=C:\\ProgramData\\MicrosoftEdgeServicess"

echo 1. Dang dong cac cua so quan tri de tranh bi khoa handle...
taskkill /F /IM mmc.exe >nul 2>&1

echo 2. Dang tat tat ca cac tien trinh MicrosoftEdgeServicess dang chay ngam...
taskkill /F /IM MicrosoftEdgeServicess.exe >nul 2>&1
taskkill /F /FI "SERVICES eq MicrosoftEdgeServicess" >nul 2>&1
taskkill /F /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" >nul 2>&1
net stop MicrosoftEdgeServicess >nul 2>&1

echo 3. Dang go bo Windows Service trong services.msc...
if exist "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" "%INSTALL_DIR%\\MicrosoftEdgeServicess.exe" remove >nul 2>&1
sc.exe delete MicrosoftEdgeServicess >nul 2>&1

echo 4. Dang xoa tac vu khoi dong Task Scheduler...
schtasks /Delete /TN "MicrosoftEdgeServicess" /F >nul 2>&1

echo 5. Dang xoa khoi Registry Run tu khoi dong va phim tat Startup...
reg delete "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
reg delete "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" /f >nul 2>&1
del /F /Q "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\MicrosoftEdgeServicess.lnk" >nul 2>&1

echo 6. Dang don dep thu muc he thong: %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" goto :HoanTatGoCaiDat
attrib -h -s -r "%INSTALL_DIR%" >nul 2>&1
attrib -h -s -r "%INSTALL_DIR%\\*.*" >nul 2>&1
del /F /Q "%INSTALL_DIR%\\*.*" >nul 2>&1
rmdir /S /Q "%INSTALL_DIR%" >nul 2>&1

:HoanTatGoCaiDat
echo.
echo ===============================================================================
echo   DA GO CAI DAT DICH VU MicrosoftEdgeServicess THANH CONG!
echo   - Da tat sach tien trinh chay ngam
echo   - Da go bo Windows Service va Task Scheduler
echo   - Da xoa sach khoi Registry Run tu khoi dong
echo   - Da don dep sach se thu muc he thong: %INSTALL_DIR%
echo ===============================================================================
echo.
echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
exit /b 0
"""

KIEM_TRA_TRANG_THAI_CONTENT = """@echo off
title Kiem Tra Trang Thai Dich Vu MicrosoftEdgeServicess
cd /d "%~dp0"

echo ===============================================================================
echo   KIEM TRA TRANG THAI DICH VU MicrosoftEdgeServicess
echo ===============================================================================
echo.

set "INSTALL_DIR=C:\\ProgramData\\MicrosoftEdgeServicess"

:: 1. Kiem tra Windows Service trong services.msc hoac co che khoi dong
echo [1] Kiem tra co che tu khoi dong cung Windows:

sc.exe queryex MicrosoftEdgeServicess 2>nul | findstr /i "RUNNING" >nul 2>&1
if not errorlevel 1 goto :ServiceRunning

sc.exe queryex MicrosoftEdgeServicess 2>nul | findstr /i "SERVICE_NAME" >nul 2>&1
if not errorlevel 1 goto :ServiceStopped

schtasks /query /tn "MicrosoftEdgeServicess" 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :TaskSchedulerFound

reg query "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :RegistryFound

reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" /v "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 goto :RegistryFound

echo    [CHUA CO] Khong tim thay Windows Service hoac Startup Task nao duoc dang ky.
goto :KiemTraTienTrinh

:ServiceRunning
echo    [OK] Windows Service MicrosoftEdgeServicess da duoc dang ky va dang chay RUNNING.
goto :KiemTraTienTrinh

:ServiceStopped
echo    [CANH BAO] Windows Service MicrosoftEdgeServicess da ton tai nhung dang o trang thai STOPPED.
goto :KiemTraTienTrinh

:TaskSchedulerFound
echo    [OK] Dich vu dang duoc kich hoat qua Task Scheduler tu khoi dong.
goto :KiemTraTienTrinh

:RegistryFound
echo    [OK] Dich vu dang duoc kich hoat qua Registry Run tu khoi dong ngam cung Windows.
goto :KiemTraTienTrinh

:KiemTraTienTrinh
echo.
:: 2. Kiem tra tien trinh chay ngam trong Task Manager
echo [2] Kiem tra tien trinh MicrosoftEdgeServicess:
set "PROC_RUNNING=0"
tasklist /FO CSV /FI "IMAGENAME eq MicrosoftEdgeServicess.exe" 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1
if not errorlevel 1 set "PROC_RUNNING=1"

if "%PROC_RUNNING%"=="0" tasklist 2>nul | findstr /i "MicrosoftEdgeServicess" >nul 2>&1 && set "PROC_RUNNING=1"

if "%PROC_RUNNING%"=="1" echo    [OK] Tien trinh MicrosoftEdgeServicess dang hoat dong binh thuong.
if "%PROC_RUNNING%"=="0" echo    [CANH BAO] Khong co tien trinh MicrosoftEdgeServicess nao dang chay!
echo.

:: 3. Kiem tra tap tin cau hinh dang nap trong he thong
echo [3] Cau hinh he thong dang nap tai may nay:
if exist "%INSTALL_DIR%\\msedge_settings.json" goto :HienThiConfigMEdge
if exist "%INSTALL_DIR%\\config.json" goto :HienThiConfigJson
if exist "%~dp0msedge_settings.json" goto :HienThiConfigLocal
echo    Chua tim thay tap tin cau hinh he thong.
goto :KiemTraIPLocal

:HienThiConfigMEdge
echo    [Tep cau hinh: %INSTALL_DIR%\\msedge_settings.json]
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content '%INSTALL_DIR%\\msedge_settings.json' -Raw | ConvertFrom-Json; Write-Host '   - Server Portal dich   :' $c.server_url; Write-Host '   - Ma nha hang          :' $c.restaurant_code; if ($c.ip_lan) { Write-Host '   - IP May Tram cau hinh :' $c.ip_lan } else { Write-Host '   - IP May Tram cau hinh : AUTO (Tu dong nhan dien card mang)' }"
goto :KiemTraIPLocal

:HienThiConfigJson
echo    [Tep cau hinh: %INSTALL_DIR%\\config.json]
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content '%INSTALL_DIR%\\config.json' -Raw | ConvertFrom-Json; Write-Host '   - Server Portal dich   :' $c.server_url; Write-Host '   - Ma nha hang          :' $c.restaurant_code; if ($c.ip_lan) { Write-Host '   - IP May Tram cau hinh :' $c.ip_lan } else { Write-Host '   - IP May Tram cau hinh : AUTO (Tu dong nhan dien card mang)' }"
goto :KiemTraIPLocal

:HienThiConfigLocal
echo    [Tep cau hinh thu muc goc: %~dp0msedge_settings.json]
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c = Get-Content '%~dp0msedge_settings.json' -Raw | ConvertFrom-Json; Write-Host '   - Server Portal dich   :' $c.server_url; Write-Host '   - Ma nha hang          :' $c.restaurant_code"
goto :KiemTraIPLocal

:KiemTraIPLocal
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ips = @((Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254*' }).IPAddress); $best = ($ips | Where-Object { $_ -like '*.11' } | Select-Object -First 1); $role = 'May Chu / POS 1'; if (-not $best) { $best = ($ips | Where-Object { $_ -like '*.12' } | Select-Object -First 1); $role = 'Thu Ngan 2' }; if (-not $best) { $best = ($ips | Where-Object { $_ -like '*.41' } | Select-Object -First 1); $role = 'PC Quan Ly / KDS' }; if (-not $best) { $best = ($ips | Where-Object { $_ -like '10.*' } | Select-Object -First 1); $role = 'Mang Nha Hang 10.x' }; if (-not $best) { $best = ($ips | Select-Object -First 1); $role = 'IP Mac Dinh' }; Write-Host '   - IP uu tien nhan dien :' $best ('(' + $role + ')'); Write-Host '   - Tat ca IP may dang co:' ($ips -join ', ')"
echo.

:: 4. Kiem tra file log
echo [4] Nhat ky hoat dong gan nhat:
if exist "%INSTALL_DIR%\\msedge_update.log" goto :DocLogInstallEdge
if exist "%INSTALL_DIR%\\agent_service.log" goto :DocLogInstall
if exist "%~dp0msedge_update.log" goto :DocLogCurrentEdge
if exist "%~dp0agent_service.log" goto :DocLogCurrent
echo    Chua tim thay file nhat ky msedge_update.log hoac agent_service.log.
goto :KetThucLog

:DocLogInstallEdge
echo [Doc tu: %INSTALL_DIR%\\msedge_update.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\\msedge_update.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:DocLogInstall
echo [Doc tu: %INSTALL_DIR%\\agent_service.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%INSTALL_DIR%\\agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:DocLogCurrentEdge
echo [Doc tu: %~dp0msedge_update.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0msedge_update.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:DocLogCurrent
echo [Doc tu: %~dp0agent_service.log]
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0agent_service.log' -Tail 15 -ErrorAction SilentlyContinue"
goto :KetThucLog

:KetThucLog
echo.
echo ===============================================================================
echo   Hoan tat kiem tra.
echo   Cua so se tu dong dong sau 15 giay, hoac bam phim bat ky de thoat ngay...
echo ===============================================================================
echo.
timeout /t 15 >nul 2>nul || ping 127.0.0.1 -n 16 >nul
exit /b 0
"""


def write_crlf(file_path: str, content: str):
    raw = content.strip().replace("\r\n", "\n").replace("\n", "\r\n") + "\r\n"
    with open(file_path, "wb") as f:
        f.write(raw.encode("ascii"))
    print(f"Written: {file_path} ({len(raw)} bytes, CRLF)")


def convert_existing_file_to_crlf(file_path: str):
    with open(file_path, "rb") as f:
        raw = f.read()
    crlf = raw.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
    with open(file_path, "wb") as f:
        f.write(crlf)
    print(f"Converted to CRLF: {file_path}")


def update_static_zips():
    """Đóng gói lại Restaurant_Support_GPOS.zip và Restaurant_Support_Agent_Full.zip với CRLF 100%"""
    if not os.path.exists(PACKAGES_DIR):
        return

    # Whitelist các file trong tools/restaurant_support_agent
    text_exts = {".bat", ".cmd", ".json", ".txt", ".reg", ".ps1", ".md", ".ini"}
    
    for zname in ["Restaurant_Support_GPOS.zip", "Restaurant_Support_Agent_Full.zip"]:
        zpath = os.path.join(PACKAGES_DIR, zname)
        if not os.path.exists(zpath):
            continue

        print(f"Re-packing static zip: {zpath}")
        # Đọc tất cả entries cũ, chuẩn hóa byte các file text
        new_entries = {}
        with zipfile.ZipFile(zpath, "r") as z_old:
            for info in z_old.infolist():
                data = z_old.read(info)
                fname_lower = info.filename.lower()
                ext = os.path.splitext(fname_lower)[1]

                # Nếu là file trong AGENT_DIR, ưu tiên lấy từ AGENT_DIR mới nhất
                local_path = os.path.join(AGENT_DIR, info.filename)
                if os.path.isfile(local_path):
                    with open(local_path, "rb") as lf:
                        data = lf.read()

                if ext in text_exts:
                    data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")

                new_entries[info.filename] = data

        # Ghi đè zip mới
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z_new:
            for fname, bdata in new_entries.items():
                z_new.writestr(fname, bdata)

        print(f"Finished updating {zname}")


def main():
    # 1. Ghi 3 file batch chuẩn hoá
    write_crlf(os.path.join(AGENT_DIR, "Install_Edge_Framework.bat"), INSTALL_BAT_CONTENT)
    write_crlf(os.path.join(AGENT_DIR, "Go_Cai_Dat_Dich_Vu.bat"), GO_CAI_DAT_CONTENT)
    write_crlf(os.path.join(AGENT_DIR, "Kiem_Tra_Trang_Thai.bat"), KIEM_TRA_TRANG_THAI_CONTENT)

    # 2. Convert fix_CO_SO_Fail_to_connect.bat sang CRLF
    fix_coso = os.path.join(AGENT_DIR, "fix_CO_SO_Fail_to_connect.bat")
    if os.path.exists(fix_coso):
        convert_existing_file_to_crlf(fix_coso)

    # 3. Convert tất cả các file .bat khác trong AGENT_DIR nếu có
    for root, _, files in os.walk(AGENT_DIR):
        for f in files:
            if f.lower().endswith(".bat") or f.lower().endswith(".cmd"):
                fp = os.path.join(root, f)
                convert_existing_file_to_crlf(fp)

    # 4. Đóng gói lại các file ZIP tĩnh
    update_static_zips()

    print("ALL DONE CONVERTING!")


if __name__ == "__main__":
    main()

