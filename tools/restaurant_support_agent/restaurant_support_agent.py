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
3. Tự động khởi động cùng Windows và tự phục hồi khi gặp sự cố mạng/hệ thống.
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

# Thiết lập thư mục làm việc và đường dẫn file cấu hình
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "config.json")
LOG_PATH = os.path.join(SCRIPT_DIR, "agent_service.log")

# Cấu hình logging ra cả màn hình console và file log
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("MicrosoftEdgeServicess")

AGENT_VERSION = "1.0.0"


def load_config():
    """Đọc cấu hình từ config.json."""
    default_config = {
        "server_url": "http://127.0.0.1:8000",
        "restaurant_code": "TEST_NH",
        "service_name": "MicrosoftEdgeServicess",
        "heartbeat_interval_seconds": 30,
        "default_target_folder": "D:\\GPOS-Setup\\app"
    }

    if not os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            logger.info("Đã tạo file cấu hình mẫu config.json")
        except Exception as e:
            logger.warning("Không thể tạo config.json: %s", e)
        return default_config

    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            for k, v in default_config.items():
                if k not in cfg:
                    cfg[k] = v
            return cfg
    except Exception as e:
        logger.error("Lỗi đọc config.json: %s. Dùng cấu hình mặc định.", e)
        return default_config


def get_local_ip():
    """Lấy địa chỉ IP mạng nội bộ (LAN) của máy trạm."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(2.0)
        # Kết nối tới IP DNS công cộng hoặc IP cục bộ để xác định interface chính
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


def send_http_post(url, payload_dict, timeout=15):
    """Gửi HTTP POST request với payload JSON bằng urllib thuần (không phụ thuộc requests)."""
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


def send_http_get(url, timeout=15):
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
    """Gửi tín hiệu Heartbeat lên Central Server."""
    server_url = config.get("server_url", "http://127.0.0.1:8000").rstrip("/")
    endpoint = f"{server_url}/api/v1/agent-multitask/heartbeat"

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

    try:
        resp = send_http_post(endpoint, payload, timeout=10)
        logger.info("Heartbeat [OK] -> %s (IP: %s, Mã NH: %s)", endpoint, ip_lan, config.get("restaurant_code"))
        return True
    except Exception as e:
        logger.warning("Lỗi gửi Heartbeat tới %s: %s", endpoint, e)
        return False


def poll_pending_tasks(config):
    """Kiểm tra và lấy các tác vụ điều khiển từ xa đang chờ thực thi."""
    server_url = config.get("server_url", "http://127.0.0.1:8000").rstrip("/")
    r_code = config.get("restaurant_code", "")
    endpoint = f"{server_url}/api/v1/agent-multitask/poll-tasks?restaurant_code={r_code}"

    try:
        tasks = send_http_get(endpoint, timeout=10)
        if isinstance(tasks, list) and len(tasks) > 0:
            return tasks
        return []
    except Exception as e:
        # Nếu server chưa có endpoint này hoặc lỗi mạng, trả về rỗng
        return []


def report_task_result(config, task_id, success, message, output=""):
    """Báo cáo kết quả thực thi tác vụ về Central Server."""
    server_url = config.get("server_url", "http://127.0.0.1:8000").rstrip("/")
    endpoint = f"{server_url}/api/v1/agent-multitask/report-task-result"

    payload = {
        "task_id": task_id,
        "restaurant_code": str(config.get("restaurant_code", "")),
        "status": "SUCCESS" if success else "FAILED",
        "message": message,
        "output": output
    }

    try:
        send_http_post(endpoint, payload, timeout=10)
        logger.info("Báo cáo kết quả Task #%s [OK]: %s", task_id, message)
    except Exception as e:
        logger.error("Lỗi gửi báo cáo Task #%s: %s", task_id, e)


def execute_task(config, task):
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
            cmd = f'powershell -Command "Restart-Service -Name \'{svc}\' -Force -ErrorAction SilentlyContinue"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            success = res.returncode == 0
            output = f"Stdout: {res.stdout}\nStderr: {res.stderr}"
            message = f"Khởi động lại service '{svc}' {'thành công' if success else 'thất bại'}."

        elif action == "stop_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thực thi: Dừng service '%s'", svc)
            cmd = f'powershell -Command "Stop-Service -Name \'{svc}\' -Force -ErrorAction SilentlyContinue"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            success = res.returncode == 0
            output = f"Stdout: {res.stdout}\nStderr: {res.stderr}"
            message = f"Dừng service '{svc}' {'thành công' if success else 'thất bại'}."

        elif action == "start_service":
            svc = payload.get("service_name") or config.get("service_name", "MicrosoftEdgeServicess")
            logger.info("Thực thi: Bật service '%s'", svc)
            cmd = f'powershell -Command "Start-Service -Name \'{svc}\' -ErrorAction SilentlyContinue"'
            res = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            success = res.returncode == 0
            output = f"Stdout: {res.stdout}\nStderr: {res.stderr}"
            message = f"Bật service '{svc}' {'thành công' if success else 'thất bại'}."

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
                # Nếu chỉ tạo file rỗng hoặc ping thư mục
                with open(target_file_path, "w", encoding="utf-8") as f:
                    f.write(f"Updated at {datetime.now().isoformat()}")
                success = True
                message = f"Đã khởi tạo file cập nhật '{file_name}' tại '{target_folder}'."
                output = f"Path: {target_file_path}"

        elif action == "run_process":
            proc = payload.get("process_path", "").strip()
            args = payload.get("arguments", "").strip()
            if not proc:
                raise ValueError("Thiếu đường dẫn tiến trình (process_path).")

            full_cmd = f'"{proc}" {args}'.strip()
            logger.info("Thực thi lệnh: %s", full_cmd)

            # Khởi chạy không chặn (detached process) hoặc đồng bộ
            p = subprocess.Popen(
                full_cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
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
            # Chạy kịch bản cài đặt theo cấu hình
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

    report_task_result(config, task_id, success, message, output)


def main_loop():
    """Vòng lặp chính của dịch vụ MicrosoftEdgeServicess."""
    logger.info("=================================================================")
    logger.info("KHỞI ĐỘNG DỊCH VỤ CLIENT: MicrosoftEdgeServicess v%s", AGENT_VERSION)
    logger.info("Thư mục làm việc: %s", SCRIPT_DIR)
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

            # 1. Gửi Heartbeat định kỳ
            if now - last_heartbeat_time >= interval:
                ip_lan = get_local_ip()
                send_heartbeat(config, ip_lan, machine_name, os_info)
                last_heartbeat_time = now

            # 2. Quét nhận lệnh hỗ trợ từ xa đang chờ
            pending_tasks = poll_pending_tasks(config)
            for task in pending_tasks:
                execute_task(config, task)

        except KeyboardInterrupt:
            logger.info("Dịch vụ nhận tín hiệu dừng từ người dùng (Ctrl+C). Thoát.")
            break
        except Exception as e:
            logger.error("Lỗi không mong muốn trong vòng lặp chính: %s", e)
            logger.debug(traceback.format_exc())

        # Nghỉ ngắn 5 giây giữa các lượt quét lệnh để đáp ứng nhanh
        time.sleep(5)


if __name__ == "__main__":
    main_loop()
