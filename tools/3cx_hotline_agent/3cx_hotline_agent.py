"""
3CX Hotline Desktop Agent — Tự động bắt cuộc gọi 3CX PWA & đẩy lên Hệ Thống IT Project Management
Dành cho máy kỹ thuật viên trực hotline nếu chạy phân tán (Client/Server).
"""

import time
import re
import requests
import logging

try:
    import win32service
    import win32con
    import pythoncom
    import uiautomation as auto
except ImportError:
    print("Vui lòng cài đặt thư viện cần thiết:")
    print("pip install pywin32 uiautomation requests")
    exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("3CX_Agent")

# Cấu hình URL Backend (sửa theo địa chỉ server của bạn)
API_BASE_URL = "http://localhost:8000/api/v1/hotline"

last_detected_key = None
last_detected_time = 0.0

def check_and_notify_call(ext: str, caller_text: str):
    url = f"{API_BASE_URL}/call-event"
    payload = {
        "ext": ext,
        "caller_raw_text": caller_text,
        "duty_user": "IT Hotline Agent",
        "is_busy": False
    }
    try:
        resp = requests.post(url, json=payload, timeout=3.0)
        if resp.status_code == 200:
            logger.info("-> Đã gửi thành công cuộc gọi EXT %s lên hệ thống!", ext)
        else:
            logger.warning("-> Server phản hồi mã %s: %s", resp.status_code, resp.text)
    except Exception as e:
        logger.error("-> Lỗi kết nối tới server %s: %s", url, e)

def main():
    global last_detected_key, last_detected_time
    logger.info("=== 3CX Hotline Desktop Agent Đang Chạy ===")
    logger.info("Theo dõi cửa sổ 3CX (PWA) để bắt cuộc gọi đến...")

    logging.getLogger("comtypes").setLevel(logging.WARNING)
    logging.getLogger("uiautomation").setLevel(logging.WARNING)

    try:
        winsta0 = win32service.OpenWindowStation("WinSta0", False, win32con.MAXIMUM_ALLOWED)
        winsta0.SetProcessWindowStation()
        desk = win32service.OpenDesktop("default", 0, False, win32con.MAXIMUM_ALLOWED)
        desk.SetThreadDesktop()
    except Exception as e_bind:
        logger.debug("Desktop binding initialization note: %s", e_bind)

    with auto.UIAutomationInitializerInThread():
        while True:
            try:
                root = auto.GetRootControl()
                incoming_detected = False

                for w in root.GetChildren():
                    name = (w.Name or "").strip()
                    cls = (w.ClassName or "").strip()

                    if any(k in name.lower() for k in ["3cx", "incoming", "cuộc gọi", "ringbot"]) or "toast" in cls.lower() or "notification" in cls.lower() or (cls == "Chrome_WidgetWin_1" and ("3cx" in name.lower() or "ringbot" in name.lower() or not name)):
                        texts = [name] if name else []
                        for desc_ctrl, _ in auto.WalkControl(w, maxDepth=6):
                            t = (desc_ctrl.Name or "").strip()
                            if t and t not in texts:
                                texts.append(t)

                        has_incoming = any(any(kw in t.lower() for kw in ["incoming call", "cuộc gọi đến", "incoming", "answer", "decline", "trả lời", "từ chối", "ringing", "ringbot"]) for t in texts)
                        if has_incoming or (("3cx" in name.lower() or "ringbot" in name.lower()) and any("answer" in t.lower() or "decline" in t.lower() for t in texts)):
                            incoming_detected = True
                            extracted_ext = None
                            caller_text = ""

                            for t in texts:
                                if any(ign in t.lower() for ign in ["incoming call", "cuộc gọi đến", "ringbot", "answer", "decline", "3cx", "close", "minimize"]):
                                    continue
                                match = re.search(r"\b(\d{2,12})\b", t)
                                if match and not extracted_ext:
                                    extracted_ext = match.group(1)
                                    caller_text = t
                                    break
                                clean_digits = re.sub(r"[^\d]", "", t)
                                if 2 <= len(clean_digits) <= 12 and not extracted_ext:
                                    extracted_ext = clean_digits
                                    caller_text = t
                                    break

                            if extracted_ext:
                                now = time.time()
                                call_key = f"{extracted_ext}_{caller_text}"
                                if call_key != last_detected_key or (now - last_detected_time > 5.0):
                                    last_detected_key = call_key
                                    last_detected_time = now
                                    logger.info("PHÁT HIỆN CUỘC GỌI: EXT=%s | Caller='%s'", extracted_ext, caller_text)
                                    check_and_notify_call(extracted_ext, caller_text)
                            break

                if not incoming_detected:
                    if last_detected_key and (time.time() - last_detected_time > 2.0):
                        last_detected_key = None

        except Exception as e:
            logger.debug("Lỗi scanner: %s", e)

        time.sleep(0.4)

if __name__ == "__main__":
    main()
