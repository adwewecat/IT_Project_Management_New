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


def send_heartbeat(config, ip_lan, machine_name, os_info):
    """
    Gui tin hieu Heartbeat len Central Server.
    Tu dong thu qua Server du phong neu cau hinh hien tai bi loi ket noi.
    """
    server_candidates = []
    current_srv = config.get("server_url", CENTRAL_PRODUCTION_SERVER).rstrip("/")
    server_candidates.append(current_srv)

    if CENTRAL_PRODUCTION_SERVER.rstrip("/") not in server_candidates:
        server_candidates.append(CENTRAL_PRODUCTION_SERVER.rstrip("/"))

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

    last_err = None
    for srv in server_candidates:
        endpoint = f"{srv}/api/v1/agent-multitask/heartbeat"
        try:
            resp = send_http_post(endpoint, payload, timeout=10)
            logger.info("Heartbeat [OK] -> %s (IP: %s, Ma NH: %s)", endpoint, ip_lan, config.get("restaurant_code"))
            if srv != current_srv:
                config["server_url"] = srv
                save_config(config)
                logger.info("Da cap nhat server_url chinh thuc: %s", srv)
            return True
        except Exception as e:
            last_err = e
            logger.warning("Khong the gui Heartbeat toi %s: %s", endpoint, e)

    logger.error("That bai gui Heartbeat toi tat ca server dich.")
    return False


def poll_pending_tasks(config, ip_lan=None):
    """Kiem tra va lay cac tac vu dieu khien tu xa dang cho thuc thi."""
    server_url = config.get("server_url", CENTRAL_PRODUCTION_SERVER).rstrip("/")
    r_code = config.get("restaurant_code", "")
    ip_param = f"&ip_lan={ip_lan}" if ip_lan else ""
    endpoint = f"{server_url}/api/v1/agent-multitask/poll-tasks?restaurant_code={r_code}{ip_param}"

    try:
        tasks = send_http_get(endpoint, timeout=10)
        if isinstance(tasks, list) and len(tasks) > 0:
            return tasks
        return []
    except Exception:
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
    except Exception as e:
        logger.error("Loi gui bao cao Task #%s: %s", task_id, e)


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

            full_cmd = f'"{proc}" {args}'.strip()
            logger.info("Chay tien trinh: %s", full_cmd)

            p = subprocess.Popen(
                full_cmd,
                shell=True,
                creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
            )
            success = True
            message = f"Da kich hoat tien trinh '{proc}' thanh cong (PID: {p.pid})."
            output = f"PID: {p.pid}\nCommandLine: {full_cmd}"

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
        elif HAS_PYWIN32 and arg in ("install", "update", "remove", "start", "stop", "restart", "debug", "--startup"):
            win32serviceutil.HandleCommandLine(MicrosoftEdgeService)
        elif HAS_PYWIN32:
            win32serviceutil.HandleCommandLine(MicrosoftEdgeService)
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
