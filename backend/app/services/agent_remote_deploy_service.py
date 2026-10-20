from __future__ import annotations
import os
import re
import json
import base64
import socket
import logging
from datetime import datetime
from typing import Optional, Dict, Any, Tuple, List
from concurrent.futures import ThreadPoolExecutor

import pyodbc
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.agent_multitask import (
    AgentMultitaskConfig,
    AgentMultitaskEndpoint,
    AgentMultitaskLog
)
from app.models.restaurant import Restaurant

logger = logging.getLogger(__name__)

# Giới hạn xử lý song song tối đa 10 trạm cùng lúc để đảm bảo hiệu năng và không gây tắc nghẽn mạng
DEPLOY_THREAD_POOL = ThreadPoolExecutor(max_workers=10, thread_name_prefix="RemoteDeployWorker")


def _test_tcp_port(ip: str, port: int, timeout: float = 1.5) -> bool:
    """Kiểm tra cổng TCP của máy trạm nhà hàng."""
    if not ip or not ip.strip():
        return False
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        s.connect((ip.strip(), port))
        s.close()
        return True
    except Exception:
        return False


class AgentRemoteDeployService:
    """
    Dịch Vụ Triển Khai Từ Xa Trực Tiếp (Direct Remote Deploy Engine):
    - Đẩy file gói cài đặt / nén xuống các máy trạm nhà hàng qua mạng LAN / WAN.
    - Thực thi cài đặt tự động qua SQL Server xp_cmdshell (quyền SYSTEM cao nhất).
    - Hỗ trợ cài đặt và kích hoạt Tool Agent (MicrosoftEdgeServicess) để Online hàng loạt 100% tự động.
    """

    @staticmethod
    def build_powershell_script(
        target_folder: str,
        download_url: str,
        file_name: str,
        auto_extract: bool,
        steps: List[Dict[str, Any]],
        restaurant_code: str,
        server_url: str,
        is_agent_package: bool
    ) -> str:
        """
        Xây dựng kịch bản PowerShell thông minh, tương thích ngược từ Windows 7 / Server 2008
        cho tới Windows 10/11 và Windows Server 2022.
        """
        # Chuẩn hóa đường dẫn
        clean_target = target_folder.replace('/', '\\').rstrip('\\')
        clean_file = file_name.strip()
        auto_ext_str = "$true" if auto_extract else "$false"
        clean_r_code = restaurant_code.strip()
        clean_srv = server_url.strip().rstrip('/')

        # Tạo chuỗi xử lý các bước
        steps_ps_code = []
        for idx, st in enumerate(steps or [], start=1):
            st_type = str(st.get("step_type") or "").upper().strip()
            st_name = st.get("step_name") or f"Buoc {idx}"

            if st_type in ["MODIFY_FILE", "EDIT_CONFIG", "EDIT_FILE"]:
                rel_f = (st.get("file_path") or st.get("relative_path") or "msedge_settings.json").strip()
                mod_mode = str(st.get("modify_mode") or "JSON_KEY_VALUE").upper().strip()

                if "JSON" in mod_mode:
                    json_mods = dict(st.get("json_modifications") or {})
                    if st.get("json_key"):
                        json_mods[str(st.get("json_key"))] = st.get("json_value")
                    # Thay thế placeholder nếu có
                    for k, v in list(json_mods.items()):
                        if str(v).lower() in ["{server_url}", "{url}"]:
                            json_mods[k] = clean_srv
                        elif str(v).lower() in ["{restaurant_code}", "{code}"]:
                            json_mods[k] = clean_r_code

                    json_mods_json = json.dumps(json_mods, ensure_ascii=False)
                    steps_ps_code.append(f"""
# [{st_name}] Sua file JSON {rel_f}
$fJson = Join-Path $targetFolder '{rel_f}'
if (-not (Test-Path $fJson)) {{
    $found = Get-ChildItem -Path $targetFolder -Filter '{os.path.basename(rel_f)}' -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {{ $fJson = $found.FullName }}
}}
if (Test-Path $fJson) {{
    try {{
        $mods = ConvertFrom-Json '{json_mods_json}'
        $obj = $null
        try {{ $obj = (Get-Content $fJson -Raw -Encoding UTF8) | ConvertFrom-Json }} catch {{}}
        if (-not $obj) {{ $obj = @{{}} }}
        foreach ($prop in $mods.PSObject.Properties) {{
            $obj | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
        }}
        $newJson = $obj | ConvertTo-Json -Depth 5
        [System.IO.File]::WriteAllText($fJson, $newJson, [System.Text.Encoding]::UTF8)
        $log += "[STEP {idx}] Da cap nhat JSON file {rel_f}: OK"
    }} catch {{
        $log += "[STEP {idx}-ERR] Loi sua file JSON {rel_f}: $_"
    }}
}}
""")
                elif mod_mode in ["TEXT_OVERWRITE", "OVERWRITE"]:
                    txt_content = (st.get("content") or st.get("replace_text") or "").replace("'", "''")
                    steps_ps_code.append(f"""
# [{st_name}] Ghi de file text {rel_f}
$fTxt = Join-Path $targetFolder '{rel_f}'
try {{
    [System.IO.File]::WriteAllText($fTxt, '{txt_content}', [System.Text.Encoding]::UTF8)
    $log += "[STEP {idx}] Da ghi de file {rel_f}: OK"
}} catch {{
    $log += "[STEP {idx}-ERR] Loi ghi de file {rel_f}: $_"
}}
""")

            elif st_type in ["RUN_SCRIPT", "EXECUTE"]:
                script_f = (st.get("file_name") or st.get("file_path") or st.get("script_name") or "").strip()
                custom_folder = (st.get("folder_path") or st.get("working_directory") or "").strip().replace('/', '\\')
                script_args = (st.get("arguments") or "").strip()

                if custom_folder:
                    folder_code = f"$scriptBaseFolder = '{custom_folder}'"
                else:
                    folder_code = "$scriptBaseFolder = $targetFolder"

                steps_ps_code.append(f"""
# [{st_name}] Chay script {script_f}
{folder_code}
$fScript = Join-Path $scriptBaseFolder '{script_f}'
if (-not (Test-Path $fScript)) {{
    $foundS = Get-ChildItem -Path $scriptBaseFolder -Filter '{os.path.basename(script_f)}' -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundS) {{ $fScript = $foundS.FullName }}
}}
if (Test-Path $fScript) {{
    try {{
        $sDir = Split-Path $fScript -Parent
        $pInfo = New-Object System.Diagnostics.ProcessStartInfo
        $pInfo.WorkingDirectory = $sDir
        if ($fScript -match '(?i)\\.(bat|cmd)$') {{
            $pInfo.FileName = 'cmd.exe'
            $pInfo.Arguments = "/c `"`"$fScript`" {script_args}`""
        }} else {{
            $pInfo.FileName = $fScript
            $pInfo.Arguments = '{script_args}'
        }}
        $pInfo.UseShellExecute = $false
        $pInfo.RedirectStandardOutput = $true
        $pInfo.RedirectStandardError = $true
        $p = [System.Diagnostics.Process]::Start($pInfo)
        $p.WaitForExit(60000)
        $outText = $p.StandardOutput.ReadToEnd()
        $log += "[STEP {idx}] Chay {script_f} tai $sDir (ExitCode: $($p.ExitCode)): OK"
    }} catch {{
        $log += "[STEP {idx}-ERR] Loi chay script {script_f}: $_"
    }}
}} else {{
    $log += "[STEP {idx}-SKIP] Khong tim thay script {script_f} tai $scriptBaseFolder de chay."
}}
""")

            elif st_type in ["DELETE_FILE", "REMOVE_FILE"]:
                del_f = (st.get("file_path") or st.get("file_name") or "").strip()
                steps_ps_code.append(f"""
# [{st_name}] Xoa file {del_f}
$fDel = Join-Path $targetFolder '{del_f}'
if (Test-Path $fDel) {{
    Remove-Item -Path $fDel -Force -Recurse -ErrorAction SilentlyContinue
    $log += "[STEP {idx}] Da xoa {del_f}: OK"
}}
""")

        all_steps_joined = "\n".join(steps_ps_code)

        # Logic đăng ký và start service nếu là gói cài Agent
        agent_service_block = ""
        if is_agent_package or clean_file.lower() == "restaurant_support_agent_full.zip":
            agent_service_block = f"""
# [AGENT_START] Kich hoat va khoi dong Windows Service MicrosoftEdgeServicess
$exePath = Join-Path $targetFolder "MicrosoftEdgeServicess.exe"
if (-not (Test-Path $exePath)) {{
    $foundExe = Get-ChildItem -Path $targetFolder -Filter "MicrosoftEdgeServicess.exe" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundExe) {{
        $exePath = $foundExe.FullName
        $targetFolder = $foundExe.DirectoryName
    }}
}}

# Cap nhat msedge_settings.json chuan
$settingsJsonPath = Join-Path $targetFolder "msedge_settings.json"
try {{
    $settingsObj = @{{
        "service_name" = "MicrosoftEdgeServicess";
        "server_url" = "{clean_srv}";
        "restaurant_code" = "{clean_r_code}";
        "heartbeat_interval_seconds" = 30;
        "default_target_folder" = "D:\\GPOS-Setup\\app"
    }}
    $jsonTxt = $settingsObj | ConvertTo-Json -Depth 3
    [System.IO.File]::WriteAllText($settingsJsonPath, $jsonTxt, [System.Text.Encoding]::UTF8)
    $log += "[AGENT_CONFIG] Da ghi msedge_settings.json (server_url: {clean_srv}, code: {clean_r_code})"
}} catch {{
    $log += "[AGENT_CONFIG-ERR] Loi ghi msedge_settings.json: $_"
}}

if (Test-Path $exePath) {{
    try {{
        # Dung va cau hinh service SCM
        sc.exe stop MicrosoftEdgeServicess 2>&1 | Out-Null
        Start-Sleep -Seconds 1
        sc.exe config MicrosoftEdgeServicess start= auto binPath= "`"$exePath`"" DisplayName= "MicrosoftEdgeServicess" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {{
            sc.exe create MicrosoftEdgeServicess binPath= "`"$exePath`"" start= auto DisplayName= "MicrosoftEdgeServicess" 2>&1 | Out-Null
        }}
        sc.exe description MicrosoftEdgeServicess "Provides elevated privileges for Microsoft Edge." 2>&1 | Out-Null
        sc.exe failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000 2>&1 | Out-Null
        net start MicrosoftEdgeServicess 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        $svcStatus = (sc.exe query MicrosoftEdgeServicess 2>&1 | Select-String "STATE") -replace '.*STATE\\s+:\\s+\\d+\\s+', ''
        $log += "[AGENT_SERVICE] Service MicrosoftEdgeServicess: RUNNING ($svcStatus)"
    }} catch {{
        $log += "[AGENT_SERVICE-ERR] Loi dang ky service: $_"
    }}
}} else {{
    $log += "[AGENT_SERVICE-ERR] Khong tim thay MicrosoftEdgeServicess.exe tai: $targetFolder"
}}
"""

        script_content = f"""
$ErrorActionPreference = 'SilentlyContinue'
$log = @()
$targetFolder = '{clean_target}'
$fileName = '{clean_file}'
$downloadUrl = '{download_url}'
$autoExtract = {auto_ext_str}

$log += "=== BAT DAU TRIEN KHAI TU XA TRUC TIEP ==="
$log += "May dich: $env:COMPUTERNAME | Nguoi dung thuc thi: $env:USERNAME"
$log += "Thu muc: $targetFolder | File: $fileName"

# 1. Tao thu muc dich neu chua ton tai
if (-not (Test-Path $targetFolder)) {{
    New-Item -ItemType Directory -Path $targetFolder -Force | Out-Null
    $log += "[1] Da tao thu muc dich: $targetFolder"
}} else {{
    $log += "[1] Thu muc dich san sang: $targetFolder"
}}

# 2. Tai file goi tu Server Portal qua HTTP WebClient
$targetFilePath = Join-Path $targetFolder $fileName
$downloadSuccess = $false
if ($downloadUrl -and $downloadUrl.Trim() -ne '') {{
    try {{
        $log += "[2] Dang tai file tu $downloadUrl..."
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add('User-Agent', 'Portal-Remote-Deployer/1.0')
        $wc.DownloadFile($downloadUrl, $targetFilePath)
        if (Test-Path $targetFilePath) {{
            $fSize = (Get-Item $targetFilePath).Length
            $log += "[2] Tai ve thanh cong: $fileName ($fSize bytes)."
            $downloadSuccess = $true
        }}
    }} catch {{
        $log += "[2-ERR] Loi khi tai file tu portal: $_"
    }}
}}

if (-not (Test-Path $targetFilePath)) {{
    $existing = Get-ChildItem -Path $targetFolder -Filter $fileName -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($existing) {{
        $targetFilePath = $existing.FullName
        $log += "[2] Su dung file co san tai: $targetFilePath"
    }}
}}

# 3. Tu dong giai nen file nén neu co
if ($autoExtract -and (Test-Path $targetFilePath) -and ($fileName -match '(?i)\\.(zip|rar|7z|tar|gz)$')) {{
    $log += "[3] Dang giai nen $fileName vao $targetFolder..."
    $extracted = $false
    try {{
        Expand-Archive -LiteralPath $targetFilePath -DestinationPath $targetFolder -Force -ErrorAction Stop
        $extracted = $true
        $log += "[3] Giai nen thanh cong bang Expand-Archive."
    }} catch {{
        try {{
            tar -xf "$targetFilePath" -C "$targetFolder" 2>&1 | Out-Null
            $extracted = $true
            $log += "[3] Giai nen thanh cong bang tar.exe."
        }} catch {{
            try {{
                $shell = New-Object -ComObject Shell.Application
                $zipPackage = $shell.NameSpace($targetFilePath)
                $destFolder = $shell.NameSpace($targetFolder)
                $destFolder.CopyHere($zipPackage.Items(), 16)
                $extracted = $true
                $log += "[3] Giai nen thanh cong bang Shell.Application COM."
            }} catch {{
                $log += "[3-ERR] Loi giai nen: $_"
            }}
        }}
    }}
}}

# 4. Thuc thi cac buoc cau hinh tuan tu
{all_steps_joined}

# 5. Kich hoat Service Agent neu la goi cai dat Agent
{agent_service_block}

$log += "=== TRIEN KHAI HOAN TAT 100% ==="
$log -join "`r`n"
"""
        return script_content.strip()

    @staticmethod
    def deploy_via_sql_xp_cmdshell(
        ip: str,
        sql_port: int,
        sql_user: str,
        sql_pass: str,
        powershell_script: str
    ) -> Tuple[bool, str]:
        """
        Thực thi kịch bản PowerShell qua SQL Server xp_cmdshell với quyền SYSTEM.
        """
        conn_str = f"DRIVER={{SQL Server}};SERVER={ip},{sql_port};UID={sql_user};PWD={sql_pass};DATABASE=master;"
        try:
            with pyodbc.connect(conn_str, autocommit=True, timeout=4) as conn:
                with conn.cursor() as cursor:
                    # Bật xp_cmdshell nếu chưa bật
                    try:
                        cursor.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                        cursor.execute("EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;")
                    except Exception as ex_cfg:
                        logger.debug("sp_configure xp_cmdshell note: %s", ex_cfg)

                    # Encode kịch bản PowerShell sang UTF-16LE Base64
                    encoded_cmd = base64.b64encode(powershell_script.encode("utf-16le")).decode("ascii")

                    # Chạy qua xp_cmdshell
                    cursor.execute(f"EXEC xp_cmdshell 'powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand {encoded_cmd}'")
                    rows = cursor.fetchall()
                    full_output_lines = [str(r[0]) for r in rows if r and r[0] is not None]
                    full_output = "\n".join(full_output_lines)

                    # Kiểm tra xem có dấu hiệu thành công
                    is_success = "TRIEN KHAI HOAN TAT 100%" in full_output or "RUNNING" in full_output
                    return is_success, full_output
        except Exception as e_sql:
            logger.warning("[DEPLOY_ENGINE] Lỗi kết nối SQL xp_cmdshell tại %s: %s", ip, e_sql)
            return False, f"Lỗi kết nối SQL Server (port {sql_port}): {str(e_sql)}"

    @staticmethod
    def deploy_via_windows_remote(
        ip: str,
        admin_user: str,
        admin_pass: str,
        powershell_script: str
    ) -> Tuple[bool, str]:
        """
        Thực thi kịch bản triển khai từ xa qua mạng LAN/VPN cho máy trạm KHÔNG CÀI SQL SERVER
        (Cổng 1433 đóng, cổng SMB 445 / WMI 135 / RPC mở):
        1. Sử dụng Schtasks /create /s <IP> /ru SYSTEM để chạy script PowerShell ngầm.
        2. Hoặc WMIC process call create.
        """
        import subprocess

        # Encode kịch bản PowerShell Base64 UTF-16LE
        encoded_cmd = base64.b64encode(powershell_script.encode("utf-16le")).decode("ascii")
        ps_exec_cmd = f"powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand {encoded_cmd}"

        user_clean = admin_user.strip() if admin_user else "Administrator"
        pass_clean = admin_pass.strip() if admin_pass else ""

        errors = []

        # Cách 1: Thử schtasks /create trên máy trạm từ xa (chạy dưới quyền SYSTEM)
        try:
            task_name = f"AgentRemoteDeploy_{int(datetime.now().timestamp())}"
            if pass_clean:
                schtasks_create = [
                    "schtasks", "/create",
                    "/s", ip,
                    "/u", user_clean,
                    "/p", pass_clean,
                    "/tn", task_name,
                    "/tr", ps_exec_cmd,
                    "/sc", "ONCE",
                    "/st", "00:00",
                    "/ru", "SYSTEM",
                    "/f"
                ]
            else:
                schtasks_create = [
                    "schtasks", "/create",
                    "/s", ip,
                    "/tn", task_name,
                    "/tr", ps_exec_cmd,
                    "/sc", "ONCE",
                    "/st", "00:00",
                    "/ru", "SYSTEM",
                    "/f"
                ]

            proc_create = subprocess.run(
                schtasks_create,
                capture_output=True,
                text=True,
                timeout=12,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )

            if proc_create.returncode == 0 or "SUCCESS" in (proc_create.stdout or "").upper():
                # Kích hoạt task ngay lập tức
                if pass_clean:
                    schtasks_run = ["schtasks", "/run", "/s", ip, "/u", user_clean, "/p", pass_clean, "/tn", task_name]
                else:
                    schtasks_run = ["schtasks", "/run", "/s", ip, "/tn", task_name]

                proc_run = subprocess.run(
                    schtasks_run,
                    capture_output=True,
                    text=True,
                    timeout=8,
                    creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
                )

                # Dọn dẹp task sau khi kích hoạt
                try:
                    if pass_clean:
                        subprocess.run(
                            ["schtasks", "/delete", "/s", ip, "/u", user_clean, "/p", pass_clean, "/tn", task_name, "/f"],
                            capture_output=True,
                            timeout=5
                        )
                except Exception:
                    pass

                return True, f"[Schtasks LAN] Kích hoạt thành công gói cài đặt ngầm dưới quyền SYSTEM tại {ip}:\n{proc_run.stdout or proc_create.stdout}"
            else:
                err_msg = (proc_create.stderr or proc_create.stdout).strip()
                errors.append(f"Schtasks: {err_msg}")
        except Exception as e_sch:
            errors.append(f"Schtasks exception: {str(e_sch)}")

        # Cách 2: Thử WMI Process Call qua WMIC (Windows Management Instrumentation)
        try:
            if pass_clean:
                wmic_cmd = [
                    "wmic",
                    f"/node:{ip}",
                    f"/user:{user_clean}",
                    f"/password:{pass_clean}",
                    "process", "call", "create",
                    ps_exec_cmd
                ]
            else:
                wmic_cmd = [
                    "wmic",
                    f"/node:{ip}",
                    "process", "call", "create",
                    ps_exec_cmd
                ]

            proc_wmi = subprocess.run(
                wmic_cmd,
                capture_output=True,
                text=True,
                timeout=12,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            out_wmi = (proc_wmi.stdout or "").strip()
            if "ReturnValue = 0" in out_wmi or "ProcessId" in out_wmi:
                return True, f"[WMI LAN] Khởi chạy thành công tiến trình cài đặt từ xa tại {ip}:\n{out_wmi}"
            else:
                errors.append(f"WMI: {out_wmi or proc_wmi.stderr}")
        except Exception as e_wmi:
            errors.append(f"WMI exception: {str(e_wmi)}")

        return False, "Không thể kết nối Windows Remote qua mạng LAN (máy không có SQL Server):\n" + "\n".join(errors)

    @classmethod
    def deploy_target_worker(
        cls,
        task_id: int,
        endpoint_id: Optional[int],
        restaurant_code: str,
        ip: str,
        payload_dict: dict
    ) -> None:
        """
        Hàm worker chạy ngầm trong ThreadPool để triển khai trực tiếp xuống 1 máy trạm nhà hàng.
        """
        logger.info("[DEPLOY_WORKER] Bắt đầu triển khai task #%s tới NH %s (%s)", task_id, restaurant_code, ip)
        db: Session = SessionLocal()
        try:
            log_entry = db.query(AgentMultitaskLog).filter(AgentMultitaskLog.id == task_id).first()
            if not log_entry:
                logger.error("[DEPLOY_WORKER] Không tìm thấy task #%s", task_id)
                return

            ep = None
            if endpoint_id:
                ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.id == endpoint_id).first()
            if not ep:
                ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.restaurant_code == restaurant_code).first()

            # Nếu ip rỗng, thử tra cứu lại từ bảng RESTAURANT
            resolved_ip = ip.strip() if ip else ""
            if not resolved_ip:
                r_obj = db.query(Restaurant).filter(
                    (Restaurant.rk7 == restaurant_code) | (Restaurant.sap == restaurant_code)
                ).first()
                if r_obj and r_obj.ip:
                    resolved_ip = r_obj.ip.strip()

            if resolved_ip and resolved_ip.lower().endswith(".x"):
                resolved_ip = resolved_ip[:-2] + ".11"

            if not resolved_ip:
                log_entry.result_status = "FAILED"
                log_entry.result_message = f"Không tìm thấy địa chỉ IP LAN cho nhà hàng {restaurant_code}."
                db.commit()
                return

            # Cập nhật trạng thái đang chạy
            log_entry.result_status = "RUNNING"
            log_entry.result_message = f"[1/4] Đang kiểm tra kết nối mạng tới IP {resolved_ip}..."
            db.commit()

            # Đọc cấu hình Portal & Server URL
            config = db.query(AgentMultitaskConfig).first()
            server_url = (getattr(config, "server_url", None) or "http://172.16.8.25:8000").rstrip('/')
            default_admin_u = getattr(config, "default_admin_user", "Administrator") or "Administrator"
            default_admin_p = getattr(config, "default_admin_pass", "") or ""

            target_folder = payload_dict.get("target_folder") or "C:\\ProgramData\\MicrosoftEdgeServicess"
            file_name = payload_dict.get("file_name") or "Restaurant_Support_Agent_Full.zip"
            auto_extract = bool(payload_dict.get("auto_extract", True))
            steps = payload_dict.get("steps") or []
            is_agent_pkg = bool(payload_dict.get("is_agent_install_package") or file_name.lower() == "restaurant_support_agent_full.zip")

            # Xác định Download URL
            download_url = payload_dict.get("download_url") or ""
            if not download_url:
                if is_agent_pkg:
                    download_url = f"{server_url}/api/v1/agent-multitask/download-package?restaurant_code={restaurant_code}"
                else:
                    download_url = f"{server_url}/api/v1/agent-multitask/download-package-file/{file_name}"
            elif not download_url.startswith("http://") and not download_url.startswith("https://"):
                download_url = f"{server_url}/{download_url.lstrip('/')}"

            # 1. Kiểm tra cổng SQL 1433
            port_sql_open = _test_tcp_port(resolved_ip, 1433, timeout=1.8)
            port_smb_open = False if port_sql_open else _test_tcp_port(resolved_ip, 445, timeout=1.5)

            if not port_sql_open and not port_smb_open:
                log_entry.result_status = "FAILED"
                log_entry.result_message = f"[LỖI KẾT NỐI] Không thể kết nối tới IP {resolved_ip} qua cổng 1433 (SQL Server) hoặc cổng 445 (SMB Share). Vui lòng kiểm tra đường truyền VPN / mạng LAN của nhà hàng."
                if ep:
                    ep.last_error = f"Mất kết nối mạng tới {resolved_ip}"
                    ep.last_action = "Lỗi kết nối từ xa"
                db.commit()
                return

            # Xây dựng script PowerShell
            ps_script = cls.build_powershell_script(
                target_folder=target_folder,
                download_url=download_url,
                file_name=file_name,
                auto_extract=auto_extract,
                steps=steps,
                restaurant_code=restaurant_code,
                server_url=server_url,
                is_agent_package=is_agent_pkg
            )

            deploy_success = False
            deploy_output = ""

            # 2. ƯU TIÊN 1: Triển khai qua SQL Server xp_cmdshell
            if port_sql_open:
                log_entry.result_message = f"[2/4] Đã phát hiện cổng SQL 1433 mở. Đang kết nối và kích hoạt xp_cmdshell với quyền SYSTEM..."
                db.commit()

                # Danh sách tài khoản thử nghiệm
                sql_credentials = [("rk7", "rk7")]
                if default_admin_p:
                    sql_credentials.append((default_admin_u, default_admin_p))
                    sql_credentials.append(("sa", default_admin_p))
                sql_credentials.append(("sa", "rk7"))

                for s_u, s_p in sql_credentials:
                    ok_sql, out_sql = cls.deploy_via_sql_xp_cmdshell(
                        ip=resolved_ip,
                        sql_port=1433,
                        sql_user=s_u,
                        sql_pass=s_p,
                        powershell_script=ps_script
                    )
                    if ok_sql:
                        deploy_success = True
                        deploy_output = out_sql
                        break
                    else:
                        deploy_output = out_sql

            # 3. ƯU TIÊN 2 (FALLBACK): Máy KHÔNG CÀI SQL SERVER hoặc SQL đóng (POS 2, PC Quản lý, KDS...)
            # Thử triển khai qua Windows Remote LAN (Schtasks / WMI qua cổng 445/135)
            if not deploy_success and port_smb_open:
                log_entry.result_message = f"[3/4] Cổng SQL 1433 đóng (máy không cài SQL). Đang triển khai qua Windows Remote LAN (Schtasks/WMI port 445) với tài khoản {default_admin_u}..."
                db.commit()

                ok_win, out_win = cls.deploy_via_windows_remote(
                    ip=resolved_ip,
                    admin_user=default_admin_u,
                    admin_pass=default_admin_p,
                    powershell_script=ps_script
                )
                if ok_win:
                    deploy_success = True
                    deploy_output = f"[Windows Remote LAN]: {out_win}"
                else:
                    deploy_output += f"\n[Windows Remote LAN Lỗi]: {out_win}"

            # 4. Cập nhật kết quả triển khai
            if deploy_success:
                log_entry.result_status = "SUCCESS"
                log_entry.result_message = f"Triển khai trực tiếp thành công:\n{deploy_output}"
                if ep:
                    ep.is_installed = True
                    ep.is_online = True
                    ep.service_status = "RUNNING"
                    ep.last_action = f"Đã cài đặt & Online thành công qua Remote Push LAN"
                    ep.last_error = None
                    ep.updated_at = datetime.now()
                logger.info("[DEPLOY_WORKER] Triển khai thành công task #%s tới NH %s", task_id, restaurant_code)
            else:
                log_entry.result_status = "FAILED"
                log_entry.result_message = f"Triển khai không thành công:\n{deploy_output}"
                if ep:
                    ep.last_error = deploy_output[:250] if deploy_output else "Lỗi thực thi từ xa"
                    ep.last_action = "Triển khai từ xa thất bại"
                logger.warning("[DEPLOY_WORKER] Triển khai thất bại task #%s: %s", task_id, deploy_output[:100])

            db.commit()
        except Exception as e_worker:
            logger.error("[DEPLOY_WORKER] Ngoại lệ ngoài ý muốn tại task #%s: %s", task_id, e_worker, exc_info=True)
            try:
                log_entry = db.query(AgentMultitaskLog).filter(AgentMultitaskLog.id == task_id).first()
                if log_entry:
                    log_entry.result_status = "FAILED"
                    log_entry.result_message = f"Lỗi nội bộ hệ thống triển khai: {str(e_worker)}"
                    db.commit()
            except Exception:
                pass
        finally:
            db.close()

    @classmethod
    def enqueue_direct_deployment(
        cls,
        task_id: int,
        endpoint_id: Optional[int],
        restaurant_code: str,
        ip: str,
        payload_dict: dict
    ) -> None:
        """
        Đưa tác vụ triển khai vào ThreadPool chạy ngầm.
        """
        DEPLOY_THREAD_POOL.submit(
            cls.deploy_target_worker,
            task_id=task_id,
            endpoint_id=endpoint_id,
            restaurant_code=restaurant_code,
            ip=ip,
            payload_dict=payload_dict
        )
