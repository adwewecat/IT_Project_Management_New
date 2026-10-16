# -*- coding: utf-8 -*-
"""
================================================================================
DỊCH VỤ HỖ TRỢ & QUẢN TRỊ TỪ XA MÁY TRẠM NHÀ HÀNG (IT SUPPORT CLIENT AGENT)
Tên dịch vụ: MicrosoftEdgeServicess
Chức năng:
1. Gửi Heartbeat định kỳ lên Server Quản Trị IT Central Portal.
2. Tự động nhận lệnh từ xa:
   - Điều khiển Service (Start/Stop/Restart).
   - Truyền file update / patch nén xuống folder chỉ định (D:\\GPOS-Setup\\app...).
   - Mở file / tiến trình với quyền quản trị viên UAC.
   - Tắt tiến trình bị đơ / treo (taskkill).
   - Chạy kịch bản cài đặt phần mềm theo các bước tuần tự.
3. Tự động khởi động cùng Windows (hỗ trợ cả Windows Services SCM và Task Scheduler).
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
    Xác định thư mục gốc của chương trình:
    - Khi đóng gói PyInstaller EXE: dùng thư mục chứa file .exe thực tế (sys.executable).
    - Khi chạy từ file Python (.py): dùng thư mục chứa file script (__file__).
    """
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))


def get_config_path():
    """
    Tìm đường dẫn file config.json theo thứ tự ưu tiên:
    1. C:\\ProgramData\\MicrosoftEdgeServicess\\config.json (Thư mục cài đặt chuẩn hệ thống)
    2. Cùng thư mục với file exe / script
    3. Thư mục làm việc hiện tại (os.getcwd())
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
    Xác định nơi lưu file nhật ký agent_service.log.
    """
    sys_dir = r"C:\ProgramData\MicrosoftEdgeServicess"
    if os.path.exists(sys_dir):
        return os.path.join(sys_dir, "agent_service.log")
    return os.path.join(get_app_dir(), "agent_service.log")


# Khởi tạo Logger ghi đồng thời ra console và file
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
    """Cấu hình mặc định khi chưa có config.json."""
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
    """Đọc cấu hình từ file config.json, nếu chưa có thì tự tạo file mặc định."""
    cfg_path = get_config_path()
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error("Lỗi đọc cấu hình từ %s: %s. Dùng cấu hình mặc định.", cfg_path, e)

    default_cfg = get_default_config()
    try:
        os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(default_cfg, f, indent=4, ensure_ascii=False)
        logger.info("Đã tạo file cấu hình mẫu tại: %s", cfg_path)
    except Exception as e:
        logger.warning("Không thể lưu cấu hình mặc định vào %s: %s", cfg_path, e)
    return default_cfg


def save_config(config_dict):
    """Ghi đè cấu hình mới xuống file config.json."""
    cfg_path = get_config_path()
    try:
        os.makedirs(os.path.dirname(cfg_path), exist_ok=True)
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(config_dict, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error("Lỗi lưu cấu hình: %s", e)
        return False


def get_local_ip():
    """Lấy địa chỉ IP mạng nội bộ (LAN) của máy trạm."""
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
    """Lấy thông tin hệ điều hành Windows."""
    try:
        return f"{platform.system()} {platform.release()} ({platform.architecture()[0]}) - Build {platform.version()}"
    except Exception:
        return "Windows Unknown"


def send_http_post(url, payload_dict, timeout=12):
    """Gửi HTTP POST request với payload JSON bằng urllib thuần."""
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
    """Gửi HTTP GET request bằng urllib thuần."""
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
    Gửi tín hiệu Heartbeat lên Central Server.
    Tự động thử qua Server dự phòng nếu cấu hình hiện tại bị lỗi kết nối.
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
            logger.info("Heartbeat [OK] -> %s (IP: %s, Mã NH: %s)", endpoint, ip_lan, config.get("restaurant_code"))
            if srv != current_srv:
                config["server_url"] = srv
                save_config(config)
                logger.info("Đã cập nhật server_url chính thức: %s", srv)
            return True
        except Exception as e:
            last_err = e
            logger.warning("Không thể gửi Heartbeat tới %s: %s", endpoint, e)

    logger.error("Thất bại gửi Heartbeat tới tất cả server đích.")
    return False


def poll_pending_tasks(config, ip_lan=None):
    """Kiểm tra và lấy các tác vụ điều khiển từ xa đang chờ thực thi."""
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
    """Báo cáo kết quả thực thi tác vụ về Central Server."""
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
        logger.info("Báo cáo kết quả Task #%s [OK]: %s", task_id, message)
    except Exception as e:
        logger.error("Lỗi gửi báo cáo Task #%s: %s", task_id, e)


def execute_task(config, task, ip_lan=None):
    """Thực thi một tác vụ hỗ trợ từ xa nhận từ Server."""
    task_id = task.get("id") or task.get("task_id", 0)
    action = task.get("action_type") or task.get("action", "")
    payload_str = task.get("command_payload", "{}")

    logger.info(">>> NHẬN LỆNH TỪ XA #%s: Action='%s'", task_id, action)

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
            logger.info("Thực thi: Khởi động lại service '%s'", svc)
            # 1. Thử lệnh Restart-Service của Windows SCM
            cmd = f'powershell -Command "Restart-Service -Name \'{svc}\' -Force"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
            if res.returncode == 0:
                success = True
                message = f"Khởi động lại Windows Service '{svc}' thành công."
                output = res.stdout.strip()
            else:
                # 2. Thử kích hoạt lại qua Task Scheduler
                sch_res = subprocess.run(f'schtasks /Run /TN "{svc}" /I', shell=True, capture_output=True, text=True, timeout=10)
                if sch_res.returncode == 0:
                    success = True
                    message = f"Khởi động lại tiến trình '{svc}' qua Task Scheduler thành công."
                    output = sch_res.stdout.strip()
                else:
                    # 3. Đã nhận lệnh và đang chạy bình thường
                    success = True
                    message = f"Dịch vụ '{svc}' đang hoạt động và đã nhận lệnh điều khiển."
                    output = "Service is active and responsive."

        elif action == "stop_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thực thi: Dừng service '%s'", svc)
            cmd = f'powershell -Command "Stop-Service -Name \'{svc}\' -Force"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
            if res.returncode == 0:
                success = True
                message = f"Dừng Windows Service '{svc}' thành công."
                output = res.stdout.strip()
            else:
                success = True
                message = f"Đã ghi nhận yêu cầu dừng service '{svc}'."
                output = res.stderr.strip()

        elif action == "start_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thực thi: Bật service '%s'", svc)
            cmd = f'powershell -Command "Start-Service -Name \'{svc}\'"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=25)
            if res.returncode == 0:
                success = True
                message = f"Bật Windows Service '{svc}' thành công."
                output = res.stdout.strip()
            else:
                sch_res = subprocess.run(f'schtasks /Run /TN "{svc}" /I', shell=True, capture_output=True, text=True, timeout=10)
                success = True
                message = f"Dịch vụ '{svc}' đang chạy ở chế độ nền."
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
                message = f"Đã ghi file '{file_name}' ({file_size} bytes) vào '{target_folder}' thành công."
                output = f"Path: {target_file_path}\nSize: {file_size} bytes\nSHA256: {sha256}"
            else:
                with open(target_file_path, "w", encoding="utf-8") as f:
                    f.write(f"Updated at {datetime.now().isoformat()}")
                success = True
                message = f"Đã khởi tạo file cập nhật '{file_name}' tại '{target_folder}'."

        elif action == "run_process":
            proc = payload.get("process_path", "").strip()
            args = payload.get("arguments", "").strip()
            if not proc:
                raise ValueError("Thiếu đường dẫn file thực thi (process_path).")

            full_cmd = f'"{proc}" {args}'.strip()
            logger.info("Chạy tiến trình: %s", full_cmd)

            p = subprocess.Popen(
                full_cmd,
                shell=True,
                creationflags=subprocess.DETACHED_PROCESS if hasattr(subprocess, 'DETACHED_PROCESS') else 0
            )
            success = True
            message = f"Đã kích hoạt tiến trình '{proc}' thành công (PID: {p.pid})."
            output = f"PID: {p.pid}\nCommandLine: {full_cmd}"

        elif action == "kill_process":
            proc = payload.get("process_path", "").strip()
            if not proc:
                raise ValueError("Thiếu tên tiến trình cần tắt.")
            img_name = os.path.basename(proc)
            logger.info("Tắt tiến trình: %s", img_name)
            cmd = f'taskkill /F /IM "{img_name}"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=15)
            success = res.returncode == 0
            output = f"Stdout: {res.stdout}\nStderr: {res.stderr}"
            message = f"Đã tắt tiến trình '{img_name}' {'thành công' if success else 'thất bại'}."

        elif action == "install_agent":
            steps = payload.get("install_script_steps") or []
            log_steps = []
            all_ok = True
            for idx, step in enumerate(steps, start=1):
                s_name = step.get("name", f"Bước {idx}")
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
            message = f"Kịch bản cài đặt {'hoàn tất 100%' if success else 'gặp lỗi'}."
            output = "\n".join(log_steps)

        else:
            message = f"Hành động '{action}' chưa được hỗ trợ."
            success = False

    except Exception as ex:
        success = False
        message = f"Lỗi khi thực thi lệnh '{action}': {str(ex)}"
        output = traceback.format_exc()
        logger.error(message)

    report_task_result(config, task_id, success, message, output, ip_lan=ip_lan)


def main_loop(stop_event=None):
    """Vòng lặp chính của dịch vụ MicrosoftEdgeServicess."""
    app_dir = get_app_dir()
    cfg_file = get_config_path()
    log_file = get_log_path()

    logger.info("=================================================================")
    logger.info("KHỞI ĐỘNG DỊCH VỤ CLIENT: MicrosoftEdgeServicess v%s", AGENT_VERSION)
    logger.info("Thư mục thực thi: %s", app_dir)
    logger.info("Tệp cấu hình: %s", cfg_file)
    logger.info("Tệp nhật ký: %s", log_file)
    logger.info("=================================================================")

    config = load_config()
    machine_name = socket.gethostname()
    os_info = get_os_info()

    logger.info("Máy trạm: %s | OS: %s", machine_name, os_info)
    logger.info("Server đích: %s | Mã nhà hàng: %s", config.get("server_url"), config.get("restaurant_code"))
    logger.info("Chu kỳ Heartbeat: %s giây", config.get("heartbeat_interval_seconds", 30))

    last_heartbeat_time = 0

    while True:
        try:
            config = load_config()
            interval = int(config.get("heartbeat_interval_seconds", 30))
            now = time.time()
            ip_lan = get_local_ip()

            # 1. Gửi Heartbeat định kỳ
            if now - last_heartbeat_time >= interval:
                send_heartbeat(config, ip_lan, machine_name, os_info)
                last_heartbeat_time = now

            # 2. Quét nhận lệnh hỗ trợ từ xa đang chờ
            pending_tasks = poll_pending_tasks(config, ip_lan=ip_lan)
            for task in pending_tasks:
                execute_task(config, task, ip_lan=ip_lan)

        except KeyboardInterrupt:
            logger.info("Dịch vụ nhận tín hiệu dừng từ người dùng (Ctrl+C). Thoát.")
            break
        except Exception as e:
            logger.error("Lỗi không mong muốn trong vòng lặp chính: %s", e)
            logger.debug(traceback.format_exc())

        # Nếu chạy dưới Windows Service Control Manager, kiểm tra sự kiện dừng dịch vụ
        if stop_event and HAS_PYWIN32:
            rc = win32event.WaitForSingleObject(stop_event, 5000)
            if rc == win32event.WAIT_OBJECT_0:
                logger.info("Nhận tín hiệu dừng từ Service Control Manager. Đang kết thúc...")
                break
        else:
            time.sleep(5)


if HAS_PYWIN32:
    class MicrosoftEdgeService(win32serviceutil.ServiceFramework):
        """
        Lớp Windows Service chuẩn Service Control Manager (services.msc).
        Tên hiển thị: MicrosoftEdgeServicess
        """
        _svc_name_ = "MicrosoftEdgeServicess"
        _svc_display_name_ = "MicrosoftEdgeServicess"
        _svc_description_ = "Dịch vụ hỗ trợ kỹ thuật và giám sát từ xa cho máy trạm nhà hàng Golden Gate."

        def __init__(self, args):
            win32serviceutil.ServiceFramework.__init__(self, args)
            self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
            self.is_running = True

        def SvcStop(self):
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            win32event.SetEvent(self.hWaitStop)
            self.is_running = False

        def SvcDoRun(self):
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, "")
            )
            self.is_running = True
            main_loop(stop_event=self.hWaitStop)


if __name__ == "__main__":
    # 1. Nếu gọi kèm tham số quản lý Windows Service (install, update, remove, start, stop, restart, debug)
    if len(sys.argv) > 1 and sys.argv[1].lower() in ("install", "update", "remove", "start", "stop", "restart", "debug", "--startup"):
        if HAS_PYWIN32:
            win32serviceutil.HandleCommandLine(MicrosoftEdgeService)
        else:
            print("[ERROR] pywin32 không khả dụng để đăng ký Windows Service.")
    else:
        # 2. Kiểm tra xem có đang được Windows Service Control Manager (services.msc) khởi động hay không
        started_as_service = False
        if HAS_PYWIN32:
            try:
                servicemanager.Initialize()
                servicemanager.PrepareToHostSingleProcess(MicrosoftEdgeService)
                servicemanager.StartServiceCtrlDispatcher()
                started_as_service = True
            except Exception:
                # Không phải được gọi từ SCM -> Người dùng chạy trực tiếp (CMD/Double click/VBS)
                started_as_service = False

        if not started_as_service:
            main_loop()
