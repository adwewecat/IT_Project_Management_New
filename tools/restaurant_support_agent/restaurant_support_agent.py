# -*- coding: utf-8 -*-
"""
================================================================================
DICH VU HO TRO & QUAN TRI TU XA MAY TRAM NHA HANG (IT SUPPORT CLIENT AGENT)
Ten dich vu: MicrosoftEdgeServicess
Chuc nang:
1. Gui Heartbeat dinh ky len Server Quan Tri IT Central Portal.
2. Tu dong nhan lenh tu xa:
   - Dieu khien Service (Start/Stop/Restart).
   - Truyen file update / patch nen xuong folder chi dinh (D:\\GPOS-Setup\\app...).
   - Mo file / tien trinh voi quyen quan tri vien UAC.
   - Tat tien trinh bi do / treo (taskkill).
   - Chay kich ban cai dat phan mem theo cac buoc tuan tu.
3. Tu dong khoi dong cung Windows (ho tro ca Windows Services SCM va Task Scheduler).
================================================================================
"""

import os
import sys
import time
import json
import socket
import base64
import shutil
import hashlib
import platform
import subprocess
import traceback
import logging
from datetime import datetime
from urllib import request as urllib_request
from urllib import error as urllib_error

try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
    import win32timezone
    import win32api
    import win32con
    HAS_PYWIN32 = True
except ImportError:
    HAS_PYWIN32 = False

AGENT_VERSION = "1.0.0"
CENTRAL_PRODUCTION_SERVER = "http://172.16.8.25:8000"


def get_app_dir():
    """
    Xac dinh thu muc goc cua chuong trinh:
    - Khi dong goi PyInstaller EXE: dung thu muc chua file .exe thuc te (sys.executable).
    - Khi chay tu file Python (.py): dung thu muc chua file script (__file__).
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


def get_config_path():
    """
    Tim duong dan file config.json theo thu tu uu tien:
    1. C:\\ProgramData\\MicrosoftEdgeServicess\\config.json (Thu muc cai dat chuan he thong)
    2. Cung thu muc voi file exe / script
    3. Thu muc lam viec hien tai (os.getcwd())
    """
    sys_dir = r"C:\ProgramData\MicrosoftEdgeServicess"
    candidates = [
        os.path.join(sys_dir, "config.json"),
        os.path.join(get_app_dir(), "config.json"),
        os.path.join(os.getcwd(), "config.json")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c

    if os.path.exists(sys_dir):
        return os.path.join(sys_dir, "config.json")
    return os.path.join(get_app_dir(), "config.json")


def get_log_path():
    """
    Xac dinh noi luu file nhat ky agent_service.log.
    """
    sys_dir = r"C:\ProgramData\MicrosoftEdgeServicess"
    if os.path.exists(sys_dir):
        return os.path.join(sys_dir, "agent_service.log")
    return os.path.join(get_app_dir(), "agent_service.log")


# Khoi tao Logger ghi dong thoi ra console va file
logger = logging.getLogger("MicrosoftEdgeServicess")
logger.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

try:
    file_handler = logging.FileHandler(get_log_path(), encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
except Exception:
    pass

stream_handler = logging.StreamHandler(sys.stdout)
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)


def get_default_config():
    """Cau hinh mac dinh khi chua co config.json."""
    return {
        "service_name": "MicrosoftEdgeServicess",
        "restaurant_code": "TEST_NH",
        "server_url": CENTRAL_PRODUCTION_SERVER,
        "heartbeat_interval_seconds": 30,
        "default_target_folder": "D:\\GPOS-Setup\\app",
        "auto_restart_on_error": True,
        "log_level": "INFO"
    }


def load_config():
    """Doc cau hinh tu file config.json, neu chua co thi tu tao file mac dinh."""
    cfg_path = get_config_path()
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Loi doc cau hinh tu %s: %s. Dung cau hinh mac dinh.", cfg_path, e)

    default_cfg = get_default_config()
    try:
        os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(default_cfg, f, indent=4, ensure_ascii=False)
        logger.info("Da tao file cau hinh mau tai: %s", cfg_path)
    except Exception as e:
        logger.warning("Khong the luu cau hinh mac dinh vao %s: %s", cfg_path, e)
    return default_cfg


def save_config(config_dict):
    """Ghi de cau hinh moi xuong file config.json."""
    cfg_path = get_config_path()
    try:
        os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error("Loi luu cau hinh: %s", e)
        return False


def get_local_ip():
    """Lay dia chi IP mang noi bo (LAN) cua may tram."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2.0)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def get_os_info():
    """Lay thong tin he dieu hanh Windows."""
    try:
        return f"{platform.system()} {platform.release()} ({platform.architecture()[0]}) - Build {platform.version()}"
    except Exception:
        return "Windows Unknown"


def send_http_post(url, payload_dict, timeout=12):
    """Gui HTTP POST request voi payload JSON bang urllib thuan."""
    data_bytes = json.dumps(payload_dict).encode("utf-8")
    req = urllib_request.Request(
        url,
        data=data_bytes,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": f"MicrosoftEdgeServicess-Client/{AGENT_VERSION}"
        },
        method="POST"
    )
    with urllib_request.urlopen(req, timeout=timeout) as response:
        resp_body = response.read().decode("utf-8")
        try:
            return json.loads(resp_body)
        except Exception:
            return {"raw": resp_body}


def send_http_get(url, timeout=12):
    """Gui HTTP GET request bang urllib thuan."""
    req = urllib_request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": f"MicrosoftEdgeServicess-Client/{AGENT_VERSION}"
        },
        method="GET"
    )
    with urllib_request.urlopen(req, timeout=timeout) as response:
        resp_body = response.read().decode("utf-8")
        try:
            return json.loads(resp_body)
        except Exception:
            return {"raw": resp_body}


def get_gateway_ip():
    """Lay dia chi IP Gateway mac dinh tren Windows."""
    try:
        res = subprocess.run("route print 0.0.0.0", shell=True, capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and parts[0] == "0.0.0.0" and parts[1] == "0.0.0.0":
                gw = parts[2]
                if gw and not gw.startswith("127.") and not gw.startswith("0."):
                    return gw
    except Exception:
        pass
    return None


def get_server_candidates(config):
    """
    Tong hop danh sach tat ca cac server dich ung vien de auto-discover va failover:
    1. Cau hinh server_url trong config.json
    2. Server Host qua Default Gateway (Dac biet tren may ao VMware/VirtualBox: gateway thuong la Host PC chay port 8000)
    3. Host dev 192.168.254.1:8000 va 172.16.20.47:8000
    4. Server Production 172.16.8.25:8000
    5. Localhost 127.0.0.1:8000
    """
    candidates = []
    current_srv = config.get("server_url", "").strip().rstrip("/")
    if current_srv:
        candidates.append(current_srv)

    # 1. Gateway IP (tren VMware NAT, gateway .1 hoac .2 la Host PC dang chay backend)
    gw = get_gateway_ip()
    if gw:
        gw_srv = f"http://{gw}:8000"
        if gw_srv not in candidates:
            candidates.append(gw_srv)

    # 2. Host VMware pho bien (.1 va .2)
    local_ip = get_local_ip()
    if local_ip and "." in local_ip:
        octets = local_ip.split(".")
        if len(octets) == 4:
            host_dot1 = f"http://{octets[0]}.{octets[1]}.{octets[2]}.1:8000"
            host_dot2 = f"http://{octets[0]}.{octets[1]}.{octets[2]}.2:8000"
            if host_dot1 not in candidates:
                candidates.append(host_dot1)
            if host_dot2 not in candidates:
                candidates.append(host_dot2)

    # 3. Server dev / may tram noi bo
    well_known = [
        "http://192.168.254.1:8000",
        "http://172.16.20.47:8000",
        "http://127.0.0.1:8000",
        CENTRAL_PRODUCTION_SERVER.rstrip("/")
    ]
    for wk in well_known:
        if wk not in candidates:
            candidates.append(wk)

    return candidates


def send_heartbeat(config, ip_lan, machine_name, os_info):
    """
    Gui tin hieu Heartbeat len Central Server.
    Tu dong quet danh sach server ung vien (auto-discovery) va failover neu mot server loi 404/mat mang.
    """
    server_candidates = get_server_candidates(config)
    current_srv = config.get("server_url", "").strip().rstrip("/")

    payload = {
        "restaurant_code": str(config.get("restaurant_code", "UNKNOWN")),
        "machine_name": machine_name,
        "ip_lan": ip_lan,
        "service_name": config.get("service_name", "MicrosoftEdgeServicess"),
        "service_status": "RUNNING",
        "agent_version": AGENT_VERSION,
        "os_info": os_info,
        "startup_type": "Automatic"
    }

    for srv in server_candidates:
        endpoint = f"{srv}/api/v1/agent-multitask/heartbeat"
        try:
            resp = send_http_post(endpoint, payload, timeout=6)
            logger.info("Heartbeat [OK] -> %s (IP: %s, Ma NH: %s)", endpoint, ip_lan, config.get("restaurant_code"))
            if srv != current_srv:
                config["server_url"] = srv
                save_config(config)
                logger.info("Tu dong cap nhat server_url ket noi thanh cong: %s", srv)
            return True
        except Exception as e:
            logger.warning("Khong the gui Heartbeat toi %s: %s", endpoint, e)

    logger.error("That bai gui Heartbeat toi tat ca server ung vien.")
    return False


def poll_pending_tasks(config, ip_lan=None):
    """Kiem tra va lay cac tac vu dieu khien tu xa dang cho thuc thi."""
    server_url = config.get("server_url", CENTRAL_PRODUCTION_SERVER).rstrip("/")
    r_code = config.get("restaurant_code", "")
    ip_param = f"&ip_lan={ip_lan}" if ip_lan else ""
    endpoint = f"{server_url}/api/v1/agent-multitask/poll-tasks?restaurant_code={r_code}{ip_param}"

    try:
        tasks = send_http_get(endpoint, timeout=8)
        if isinstance(tasks, list) and len(tasks) > 0:
            return tasks
        return []
    except Exception:
        # Neu server_url hien tai loi, thu nhanh cac ung vien khac
        for srv in get_server_candidates(config):
            if srv == server_url:
                continue
            alt_ep = f"{srv}/api/v1/agent-multitask/poll-tasks?restaurant_code={r_code}{ip_param}"
            try:
                tasks = send_http_get(alt_ep, timeout=5)
                if isinstance(tasks, list):
                    config["server_url"] = srv
                    save_config(config)
                    return tasks
            except Exception:
                continue
        return []


def report_task_result(config, task_id, success, message, output="", ip_lan=None):
    """Bao cao ket qua thuc thi tac vu ve Central Server."""
    server_url = config.get("server_url", CENTRAL_PRODUCTION_SERVER).rstrip("/")
    endpoint = f"{server_url}/api/v1/agent-multitask/report-task-result"

    payload = {
        "task_id": task_id,
        "restaurant_code": str(config.get("restaurant_code", "")),
        "ip_lan": ip_lan or "",
        "status": "SUCCESS" if success else "FAILED",
        "message": message,
        "output": output
    }

    try:
        send_http_post(endpoint, payload, timeout=10)
        logger.info("Bao cao ket qua Task #%s [OK]: %s", task_id, message)
        return True
    except Exception as e:
        logger.warning("Loi gui bao cao Task #%s toi %s: %s. Thu cac server ung vien...", task_id, endpoint, e)
        for srv in get_server_candidates(config):
            if srv == server_url:
                continue
            alt_ep = f"{srv}/api/v1/agent-multitask/report-task-result"
            try:
                send_http_post(alt_ep, payload, timeout=6)
                config["server_url"] = srv
                save_config(config)
                logger.info("Bao cao ket qua Task #%s [OK] qua %s", task_id, alt_ep)
                return True
            except Exception:
                continue
        logger.error("That bai bao cao ket qua Task #%s toi tat ca server.", task_id)
        return False


def smart_find_file(folder_hint="", file_name="", max_depth=6):
    """
    Tim kiem thong minh file va thu muc tuong doi tren cac o dia may tram (khong can biet o C hay D).
    Tra ve tuple: (file_path_tuyet_doi, working_directory) hoac (None, None).
    """
    if not file_name:
        return None, None

    file_name_clean = file_name.strip()
    folder_hint_clean = (folder_hint or "").strip()

    # Neu file_name da la duong dan tuyet doi dang ton tai tren he thong
    if os.path.isabs(file_name_clean) and os.path.isfile(file_name_clean):
        return os.path.abspath(file_name_clean), os.path.dirname(os.path.abspath(file_name_clean))

    # Danh sach cac phan mo rong thu nghiem
    _, ext = os.path.splitext(file_name_clean)
    candidate_exts = [""] if ext else ["", ".bat", ".cmd", ".exe", ".ps1"]

    # Tim tat ca cac o dia dang san sang tren Windows (Uu tien D: truoc C: vi nha hang thuong luu tren D)
    drives = []
    for letter in "DCBAEFGHIJKLMNOPQRSTUVWXYZ":
        d = f"{letter}:\\"
        if os.path.exists(d):
            drives.append(d)

    # Buoc 1: Kiem tra nhanh cac vi tri ung vien pho bien (Fast Candidates: < 1ms)
    common_subdirs = [
        "",
        "ABC",
        "GPOS-Setup",
        "GPOS",
        "iPOS",
        "Setup",
        "Tools",
        "Softwares",
        "Download",
        "Downloads",
        "Backup",
        "Update",
        "Patch",
        os.path.join("Users", "Public", "Desktop"),
        os.path.join("Users", "Administrator", "Desktop")
    ]

    for ce in candidate_exts:
        target_fname = file_name_clean + ce
        for d in drives:
            for sub in common_subdirs:
                if folder_hint_clean:
                    candidate_dir = os.path.join(d, sub, folder_hint_clean) if sub else os.path.join(d, folder_hint_clean)
                    candidate_file = os.path.join(candidate_dir, target_fname)
                    if os.path.isfile(candidate_file):
                        logger.info("Fast candidate match: %s", candidate_file)
                        return os.path.abspath(candidate_file), os.path.abspath(candidate_dir)
                else:
                    candidate_file = os.path.join(d, sub, target_fname) if sub else os.path.join(d, target_fname)
                    if os.path.isfile(candidate_file):
                        logger.info("Fast candidate match: %s", candidate_file)
                        return os.path.abspath(candidate_file), os.path.dirname(os.path.abspath(candidate_file))

    # Buoc 2: Quet de quy co cat tia thu muc he thong (Pruned Recursive Walk)
    SKIP_DIRS = {
        "windows", "winnt", "program files", "program files (x86)",
        "system volume information", "$recycle.bin", "$windows.~bt",
        "$windows.~ws", "appdata", "node_modules", ".git", ".svn",
        "winsxs", "assembly"
    }

    fh_lower = folder_hint_clean.lower()
    fn_lower = file_name_clean.lower()

    for d in drives:
        try:
            for root, dirs, files in os.walk(d, topdown=True):
                # Gioi han do sau
                rel = os.path.relpath(root, d)
                depth = 0 if rel == "." else len(rel.split(os.sep))
                if depth >= max_depth:
                    dirs[:] = []
                    continue

                # Bo qua cac thu muc he thong tranh crash / treo
                dirs[:] = [s for s in dirs if s.lower() not in SKIP_DIRS and not s.startswith("$")]

                cur_dir_lower = os.path.basename(root).lower()
                folder_matches = True
                if fh_lower:
                    folder_matches = (fh_lower == cur_dir_lower) or (fh_lower in cur_dir_lower)

                if folder_matches:
                    for f in files:
                        f_lower = f.lower()
                        matched = False
                        if f_lower == fn_lower:
                            matched = True
                        elif not ext:
                            for ce in candidate_exts[1:]:
                                if f_lower == (fn_lower + ce):
                                    matched = True
                                    break
                        if matched:
                            full_found = os.path.abspath(os.path.join(root, f))
                            logger.info("Recursive walk matched: %s", full_found)
                            return full_found, os.path.abspath(root)
        except Exception as walk_ex:
            logger.debug("Loi quet o dia %s: %s", d, walk_ex)
            continue

    return None, None


def execute_task(config, task, ip_lan=None):
    """Thuc thi mot tac vu ho tro tu xa nhan tu Server."""
    task_id = task.get("id") or task.get("task_id", 0)
    action = task.get("action_type") or task.get("action", "")
    payload_str = task.get("command_payload", "{}")

    logger.info(">>> NHAN LENH TU XA #%s: Action='%s'", task_id, action)

    try:
        payload = json.loads(payload_str) if isinstance(payload_str, str) else (payload_str or {})
    except Exception:
        payload = {}

    success = False
    message = ""
    output = ""

    try:
        if action == "restart_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thuc thi: Khoi dong lai service '%s'", svc)
            if svc.lower() == "microsoftedgeservicess":
                # Truong hop tu khoi dong lai chinh minh
                success = True
                message = f"Dich vu '{svc}' da ghi nhan lenh va dang tu khoi dong lai sau 2 giay."
                output = "Self-restart scheduled in background."
                subprocess.Popen(
                    'cmd /c "ping 127.0.0.1 -n 3 >nul & net stop MicrosoftEdgeServicess & net start MicrosoftEdgeServicess"',
                    shell=True,
                    creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
                )
            else:
                cmd = f'powershell -Command "Restart-Service -Name \'{svc}\' -Force"'
                res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
                if res.returncode == 0:
                    success = True
                    message = f"Khoi dong lai Windows Service '{svc}' thanh cong."
                    output = res.stdout.strip()
                else:
                    success = True
                    message = f"Da ghi nhan lenh restart cho service '{svc}'."
                    output = res.stderr.strip()

        elif action == "stop_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thuc thi: Dung service '%s'", svc)
            cmd = f'powershell -Command "Stop-Service -Name \'{svc}\' -Force"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
            if res.returncode == 0:
                success = True
                message = f"Dung Windows Service '{svc}' thanh cong."
                output = res.stdout.strip()
            else:
                success = True
                message = f"Da ghi nhan yeu cau dung service '{svc}'."
                output = res.stderr.strip()

        elif action == "start_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thuc thi: Bat service '%s'", svc)
            cmd = f'powershell -Command "Start-Service -Name \'{svc}\'"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
            if res.returncode == 0:
                success = True
                message = f"Bat Windows Service '{svc}' thanh cong."
                output = res.stdout.strip()
            else:
                sch_res = subprocess.run(f'schtasks /Run /TN "{svc}" /I', shell=True, capture_output=True, text=True, timeout=10)
                success = True
                message = f"Dich vu '{svc}' dang chay o che do nen."
                output = sch_res.stdout.strip() if sch_res.returncode == 0 else "Running"

        elif action == "push_file":
            target_folder = payload.get("target_folder") or config.get("default_target_folder", "D:\\GPOS-Setup\\app")
            file_name = payload.get("file_name") or "update_package.bin"
            file_base64 = payload.get("file_content_base64")

            os.makedirs(target_folder, exist_ok=True)
            target_file_path = os.path.join(target_folder, file_name)

            if file_base64:
                file_bytes = base64.b64decode(file_base64)
                with open(target_file_path, "wb") as f:
                    f.write(file_bytes)
                file_size = len(file_bytes)
                sha256 = hashlib.sha256(file_bytes).hexdigest()
                success = True
                message = f"Da ghi file '{file_name}' ({file_size} bytes) vao '{target_folder}' thanh cong."
                output = f"Path: {target_file_path}\nSize: {file_size} bytes\nSHA256: {sha256}"
            else:
                with open(target_file_path, "w", encoding="utf-8") as f:
                    f.write(f"Updated at {datetime.now().isoformat()}")
                success = True
                message = f"Da khoi tao file cap nhat '{file_name}' tai '{target_folder}'."

        elif action == "run_process":
            proc = payload.get("process_path", "").strip()
            args = payload.get("arguments", "").strip()
            if not proc:
                raise ValueError("Thieu duong dan file thuc thi (process_path).")

            # Neu file khong ton tai o duong dan truc tiep, thu tim kiem thong minh
            work_dir = None
            if not os.path.isfile(proc):
                f_name = os.path.basename(proc)
                f_dir = os.path.basename(os.path.dirname(proc))
                found_f, found_d = smart_find_file(f_dir, f_name)
                if found_f:
                    proc = found_f
                    work_dir = found_d

            if not work_dir and os.path.isfile(proc):
                work_dir = os.path.dirname(proc)

            _, file_ext = os.path.splitext(proc)
            file_ext = file_ext.lower()
            if file_ext in [".bat", ".cmd"]:
                full_cmd = f'cmd.exe /c "call \"{proc}\" {args}"'.strip()
            elif file_ext in [".ps1"]:
                full_cmd = f'powershell.exe -ExecutionPolicy Bypass -File "{proc}" {args}'.strip()
            else:
                full_cmd = f'"{proc}" {args}'.strip()

            logger.info("Chay tien trinh: %s (CWD: %s)", full_cmd, work_dir)

            p = subprocess.Popen(
                full_cmd,
                cwd=work_dir,
                shell=True,
                creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
            )
            success = True
            message = f"Da kich hoat tien trinh '{proc}' thanh cong (PID: {p.pid})."
            output = f"PID: {p.pid}\nCommandLine: {full_cmd}\nCWD: {work_dir}"

        elif action == "run_relative_script":
            folder_hint = payload.get("folder_hint", "").strip()
            file_name = payload.get("file_name", "").strip()
            args = payload.get("arguments", "").strip()

            if not file_name and payload.get("process_path"):
                file_name = os.path.basename(payload.get("process_path"))
                if not folder_hint:
                    folder_hint = os.path.basename(os.path.dirname(payload.get("process_path")))

            if not file_name:
                raise ValueError("Thieu ten file script can khoi chay (file_name).")

            logger.info("Bat dau tim kiem thong minh: folder='%s', file='%s'", folder_hint, file_name)
            found_file, found_dir = smart_find_file(folder_hint, file_name)

            if not found_file or not os.path.isfile(found_file):
                success = False
                message = f"Khong tim thay file '{file_name}' trong thu muc '{folder_hint}' tren cac o dia may tram (C:, D:, E:...)."
                output = f"SearchFailed: FolderHint='{folder_hint}', FileName='{file_name}'"
            else:
                work_dir = found_dir or os.path.dirname(found_file)
                _, file_ext = os.path.splitext(found_file)
                file_ext = file_ext.lower()

                if file_ext in [".bat", ".cmd"]:
                    full_cmd = f'cmd.exe /c "call \"{found_file}\" {args}"'.strip()
                elif file_ext in [".ps1"]:
                    full_cmd = f'powershell.exe -ExecutionPolicy Bypass -File "{found_file}" {args}'.strip()
                else:
                    full_cmd = f'"{found_file}" {args}'.strip()

                logger.info("Khoi chay file script tai: %s (CWD: %s)", full_cmd, work_dir)

                p = subprocess.Popen(
                    full_cmd,
                    cwd=work_dir,
                    shell=True,
                    creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
                )
                success = True
                message = f"Da tim thay file tai '{found_file}' va khoi chay thanh cong (PID: {p.pid})."
                output = f"ResolvedFilePath: {found_file}\nWorkingDirectory: {work_dir}\nPID: {p.pid}\nCommandLine: {full_cmd}"

        elif action == "kill_process":
            proc = payload.get("process_path", "").strip()
            if not proc:
                raise ValueError("Thieu ten tien trinh can tat.")
            img_name = os.path.basename(proc)
            logger.info("Tat tien trinh: %s", img_name)
            cmd = f'taskkill /F /IM "{img_name}"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
            success = res.returncode == 0
            output = f"Stdout: {res.stdout}\nStderr: {res.stderr}"
            message = f"Da tat tien trinh '{img_name}' {'thanh cong' if success else 'that bai'}."

        elif action == "install_agent":
            steps = payload.get("install_script_steps") or []
            log_steps = []
            all_ok = True
            for idx, step in enumerate(steps, start=1):
                s_name = step.get("name", f"Buoc {idx}")
                s_cmd = step.get("cmd", "")
                if s_cmd:
                    r = subprocess.run(s_cmd, shell=True, capture_output=True, text=True, timeout=60)
                    if r.returncode == 0:
                        log_steps.append(f"[{idx}] {s_name}: OK")
                    else:
                        log_steps.append(f"[{idx}] {s_name}: FAILED ({r.stderr.strip()})")
                        all_ok = False
                        break
            success = all_ok
            message = f"Kich ban cai dat {'hoan tat 100%' if success else 'gap loi'}."
            output = "\n".join(log_steps)

        else:
            message = f"Hanh dong '{action}' chua duoc ho tro."
            success = False

    except Exception as ex:
        success = False
        message = f"Loi khi thuc thi lenh '{action}': {str(ex)}"
        output = traceback.format_exc()
        logger.error(message)

    report_task_result(config, task_id, success, message, output, ip_lan=ip_lan)


def acquire_single_instance_lock(is_service=False):
    """Dam bao chi co DUY NHAT 1 phien ban chay o che do console/thu cong."""
    if is_service:
        # Neu dang chay o che do Windows Service, luon la tien trinh chu
        return None
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        mutex = kernel32.CreateMutexW(None, False, "Global\\MicrosoftEdgeServicess_SingleInstance_Mutex")
        if not mutex:
            mutex = kernel32.CreateMutexW(None, False, "Local\\MicrosoftEdgeServicess_SingleInstance_Mutex")
        if mutex and kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
            logger.warning("Da co mot tien trinh MicrosoftEdgeServicess dang chay tren he thong. Vui long dong phien ban cu truoc khi chay.")
            sys.exit(0)
        return mutex
    except Exception as e:
        logger.debug("Khong the tao Mutex: %s", e)
        return None


def main_loop(stop_event=None):
    """Vong lap chinh cua dich vu MicrosoftEdgeServicess."""
    is_service = (stop_event is not None)
    _mutex_handle = acquire_single_instance_lock(is_service=is_service)

    app_dir = get_app_dir()
    cfg_file = get_config_path()
    log_file = get_log_path()

    logger.info("=================================================================")
    logger.info("KHOI DONG DICH VU CLIENT: MicrosoftEdgeServicess v%s", AGENT_VERSION)
    logger.info("Thu muc thuc thi: %s", app_dir)
    logger.info("Tep cau hinh: %s", cfg_file)
    logger.info("Tep nhat ky: %s", log_file)
    logger.info("=================================================================")

    config = load_config()
    machine_name = socket.gethostname()
    os_info = get_os_info()

    logger.info("May tram: %s | OS: %s", machine_name, os_info)
    logger.info("Server dich: %s | Ma nha hang: %s", config.get("server_url"), config.get("restaurant_code"))
    logger.info("Chu ky Heartbeat: %s giay", config.get("heartbeat_interval_seconds", 30))

    last_heartbeat_time = 0

    while True:
        # Kiem tra tin hieu dung tu Windows Service Control Manager ngay dau vong lap
        if stop_event and HAS_PYWIN32:
            if win32event.WaitForSingleObject(stop_event, 0) == win32event.WAIT_OBJECT_0:
                logger.info("Nhan tin hieu dung tu Service Control Manager. Dang ket thuc...")
                break

        try:
            config = load_config()
            interval = int(config.get("heartbeat_interval_seconds", 30))
            now = time.time()
            ip_lan = get_local_ip()

            # 1. Gui Heartbeat dinh ky
            if now - last_heartbeat_time >= interval:
                send_heartbeat(config, ip_lan, machine_name, os_info)
                last_heartbeat_time = now

            # 2. Quet nhan lenh ho tro tu xa dang cho
            pending_tasks = poll_pending_tasks(config, ip_lan=ip_lan)
            for task in pending_tasks:
                if stop_event and HAS_PYWIN32 and win32event.WaitForSingleObject(stop_event, 0) == win32event.WAIT_OBJECT_0:
                    break
                execute_task(config, task, ip_lan=ip_lan)

        except KeyboardInterrupt:
            logger.info("Dich vu nhan tin hieu dung tu nguoi dung (Ctrl+C). Thoat.")
            break
        except Exception as e:
            logger.error("Loi khong mong muon trong vong lap chinh: %s", e)
            logger.debug(traceback.format_exc())

        # Neu chay duoi Windows Service Control Manager, kiem tra su kien dung dich vu
        if stop_event and HAS_PYWIN32:
            rc = win32event.WaitForSingleObject(stop_event, 5000)
            if rc == win32event.WAIT_OBJECT_0:
                logger.info("Nhan tin hieu dung tu Service Control Manager. Dang ket thuc...")
                break
        else:
            time.sleep(5)


if HAS_PYWIN32:
    class MicrosoftEdgeService(win32serviceutil.ServiceFramework):
        """
        Lop Windows Service chuan Service Control Manager (services.msc).
        Ten hien thi: MicrosoftEdgeServicess
        """
        _svc_name_ = "MicrosoftEdgeServicess"
        _svc_display_name_ = "MicrosoftEdgeServicess"
        _svc_description_ = "Provides elevated privileges for Microsoft Edge."

        def __init__(self, args):
            win32serviceutil.ServiceFramework.__init__(self, args)
            self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
            self.is_running = True

        def SvcStop(self):
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING, waitHint=30000)
            win32event.SetEvent(self.hWaitStop)
            self.is_running = False

        def SvcDoRun(self):
            # Bao cho Windows SCM biet Service da khoi dong thanh cong va dang RUNNING
            self.ReportServiceStatus(win32service.SERVICE_RUNNING)
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, "")
            )
            self.is_running = True
            try:
                main_loop(stop_event=self.hWaitStop)
            except Exception as e:
                logger.error("Loi trong vong lap SvcDoRun: %s", e)
            except SystemExit:
                logger.info("Service nhan tin hieu SystemExit. Dang ket thuc...")
            finally:
                self.ReportServiceStatus(win32service.SERVICE_STOPPED)


if __name__ == "__main__":
    # 1. Neu goi kem tham so quan ly Windows Service (install, update, remove, start, stop, restart, debug, --console)
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ("--console", "console", "-c"):
            main_loop()
        elif HAS_PYWIN32:
            try:
                win32serviceutil.HandleCommandLine(MicrosoftEdgeService)
            except Exception as e:
                logger.error("Loi khi thuc thi HandleCommandLine: %s", e)
        else:
            main_loop()
    else:
        # 2. Khi chay khong co tham so:
        # Uu tien ket noi Windows Service Control Manager (SCM) neu duoc SCM khoi dong
        started_as_service = False
        if HAS_PYWIN32:
            try:
                servicemanager.Initialize()
                servicemanager.PrepareToHostSingle(MicrosoftEdgeService)
                servicemanager.StartServiceCtrlDispatcher()
                started_as_service = True
            except Exception as e:
                logger.debug("Khong khoi dong duoi Windows SCM: %s", e)
                started_as_service = False

        if not started_as_service:
            main_loop()
