import os
import sys
import re
import json
import time
import socket
import logging
import threading
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(AGENT_DIR, "agent_config.json")

# Default Config
CONFIG = {
    "server_url": "http://172.16.8.25:8000",
    "agent_secret": "dung_memo_agent_secret_2026",
    "folder_name": "5. MKT",
    "keyword": "Yêu cầu tạo nút RK cho Memo mới",
    "max_items": 60,
    "agent_port": 18890,
    "auto_sync_times": ["09:30", "14:00", "19:00"],
    "sync_on_startup": True
}

if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            CONFIG.update(json.load(f))
    except Exception as e:
        print(f"[WARN] Lỗi đọc config: {e}")

AGENT_PORT = int(CONFIG.get("agent_port", 18890))

if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

LOG_FILE = os.path.join(AGENT_DIR, "agent.log")
handlers_list = [
    logging.FileHandler(LOG_FILE, encoding="utf-8"),
    logging.StreamHandler(sys.stdout)
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers_list
)
logger = logging.getLogger("OutlookAgent")


def is_port_in_use(port: int) -> bool:
    """Kiểm tra cổng đã có ứng dụng nào lắng nghe chưa."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def is_outlook_process_running() -> bool:
    """Kiểm tra nhanh xem process OUTLOOK.EXE có đang chạy không (không cần gọi COM nặng)."""
    try:
        import subprocess
        out = subprocess.check_output('tasklist /fi "imagename eq outlook.exe" /nh', shell=True, text=True, errors="ignore")
        return "outlook.exe" in out.lower()
    except Exception:
        return True


def get_outlook_app():
    """
    Lấy đối tượng Outlook đang mở.
    Thử GetActiveObject trước (nhanh, bắt đúng phiên Outlook đang mở của người dùng thường).
    Nếu không được mới Dispatch.
    """
    try:
        import pythoncom
        pythoncom.CoInitialize()
    except Exception:
        pass
    import win32com.client
    # 1. Thử GetActiveObject để gắn trực tiếp vào Outlook đang mở
    try:
        return win32com.client.GetActiveObject("Outlook.Application")
    except Exception:
        pass
    # 2. Fallback Dispatch
    return win32com.client.Dispatch("Outlook.Application")


def is_running_as_admin() -> bool:
    """Kiểm tra xem script có đang chạy dưới quyền Administrator hay không."""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def parse_memo_email(subject: str, body: str) -> dict | None:
    """Bóc tách dữ liệu email Memo từ Salesforce Loyalty."""
    if not body:
        return None

    # Tìm Memo Code
    memo_code_match = re.search(r"Memo\s*Code\s*:\s*(?:Memo\s*Code\s*:\s*)?([A-Za-z0-9_-]+)", body, re.IGNORECASE)
    if not memo_code_match:
        memo_code_match = re.search(r"\b([0-9]{6}[A-Za-z]{2,4}[0-9]{2,4})\b", body)
    if not memo_code_match:
        return None

    memo_code = memo_code_match.group(1).strip().upper()

    # Sub-Memo Code
    sub_memo_match = re.search(r"Sub-Memo\s*Code\s*:\s*([A-Za-z0-9_.-]+)", body, re.IGNORECASE)
    sub_memo_code = sub_memo_match.group(1).strip() if sub_memo_match else None

    # Tên Memo
    ten_memo_match = re.search(r"Tên\s*Memo\s*:\s*([^\r\n]+)", body, re.IGNORECASE)
    ten_memo = ten_memo_match.group(1).strip() if ten_memo_match else subject.replace("Yêu cầu tạo nút RK cho Memo mới", "").strip()
    if not ten_memo:
        ten_memo = f"Memo {memo_code}"

    # Người yêu cầu
    nguoi_yc_match = re.search(r"Người\s*yêu\s*cầu\s*:\s*([^\r\n]+)", body, re.IGNORECASE)
    nguoi_yc = nguoi_yc_match.group(1).strip() if nguoi_yc_match else "Salesforce Loyalty"

    # Ngày yêu cầu
    ngay_yc_match = re.search(r"Ngày\s*tạo\s*(?:yêu\s*cầu)?\s*:\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})", body, re.IGNORECASE)
    ngay_yc_str = ngay_yc_match.group(1).strip() if ngay_yc_match else None

    # Link Salesforce
    link_match = re.search(r"Link\s*:\s*(https?://[^\s\r\n]+)", body, re.IGNORECASE)
    link_sf = link_match.group(1).strip() if link_match else None

    return {
        "memo_code": memo_code,
        "sub_memo_code": sub_memo_code,
        "ten_memo": ten_memo,
        "nguoi_yeu_cau": nguoi_yc,
        "ngay_yeu_cau": ngay_yc_str,
        "link_salesforce": link_sf,
        "raw_subject": subject,
    }


def read_outlook_emails(max_items: int = 400) -> list:
    """
    Đọc email từ ứng dụng Microsoft Outlook Desktop đang mở.
    Chiến lược:
    1. Quét TOÀN BỘ thư chưa đọc ([UnRead] = True) trong thư mục -> đảm bảo không sót bất kỳ mail nào.
    2. Quét thêm max_items thư mới nhất (kể cả đã đọc, mặc định 400 thư gần nhất).
    3. Tối ưu hiệu năng: Lọc nhanh qua Subject trước, chỉ đọc Body khi tiêu đề khớp -> siêu nhanh, không lag Outlook.
    4. Đánh dấu đã đọc cho tất cả email Memo được bóc tách.
    """
    outlook = get_outlook_app()
    namespace = outlook.GetNamespace("MAPI")

    target_folder = None
    target_folder_name = CONFIG.get("folder_name", "5. MKT")

    # 1. Tìm trong hòm thư dung.nguyenanh
    for store in namespace.Folders:
        if "dung.nguyenanh" in store.Name.lower():
            try:
                target_folder = store.Folders[target_folder_name]
                break
            except Exception:
                pass

    # 2. Tìm thư mục theo tên trong tất cả stores
    if not target_folder:
        for store in namespace.Folders:
            for sub in store.Folders:
                if target_folder_name.lower() in sub.Name.lower() or sub.Name.lower() == "mkt":
                    target_folder = sub
                    break
            if target_folder:
                break

    # 3. Fallback Inbox
    if not target_folder:
        target_folder = namespace.GetDefaultFolder(6)

    keyword = CONFIG.get("keyword", "Yêu cầu tạo nút RK cho Memo mới")
    kw_lower = keyword.lower()
    target_mails = []
    seen_entry_ids = set()

    # Bước 1: Quét TOÀN BỘ thư chưa đọc trong thư mục (cực nhanh qua Restrict)
    try:
        unreads = target_folder.Items.Restrict("[UnRead] = True")
        unreads.Sort("[ReceivedTime]", True)
        for i in range(1, unreads.Count + 1):
            try:
                mail = unreads.Item(i)
                eid = getattr(mail, "EntryID", None)
                if eid:
                    if eid not in seen_entry_ids:
                        seen_entry_ids.add(eid)
                        target_mails.append(mail)
                else:
                    target_mails.append(mail)
            except Exception:
                pass
    except Exception as ex:
        logger.warning(f"Lỗi khi lọc thư chưa đọc: {ex}")

    # Bước 2: Quét thêm các thư mới nhất gần đây (để phòng trường hợp lỡ bấm xem trước)
    try:
        all_items = target_folder.Items
        all_items.Sort("[ReceivedTime]", True)
        recent_limit = min(all_items.Count, max_items)
        for i in range(1, recent_limit + 1):
            try:
                mail = all_items.Item(i)
                eid = getattr(mail, "EntryID", None)
                if eid:
                    if eid not in seen_entry_ids:
                        seen_entry_ids.add(eid)
                        target_mails.append(mail)
                else:
                    target_mails.append(mail)
            except Exception:
                pass
    except Exception as ex:
        logger.warning(f"Lỗi khi lấy thư gần đây: {ex}")

    results = []
    for mail in target_mails:
        try:
            subj = str(getattr(mail, "Subject", "") or "")
            subj_lower = subj.lower()

            # Tối ưu hóa cực lớn: Lọc nhanh theo Subject trước khi đọc Body (tiết kiệm 95% thời gian & RAM)
            if not (kw_lower in subj_lower or "yêu cầu tạo nút rk" in subj_lower or "yeu cau tao nut rk" in subj_lower or "nút rk" in subj_lower):
                continue

            body = str(getattr(mail, "Body", "") or "")
            recv_time = getattr(mail, "ReceivedTime", None)

            parsed = parse_memo_email(subj, body)
            if parsed:
                parsed["received_time"] = recv_time.strftime("%Y-%m-%d %H:%M:%S") if recv_time else None
                results.append(parsed)
                # Tự động đánh dấu email đã đọc trong Outlook
                try:
                    if getattr(mail, "UnRead", False):
                        mail.UnRead = False
                        mail.Save()
                except Exception as save_ex:
                    logger.debug(f"Không thể đánh dấu đã đọc mail: {save_ex}")
        except Exception as ex:
            logger.debug(f"Bỏ qua email: {ex}")
            continue

    return results


def push_items_to_server(items: list) -> dict:
    """Đẩy trực tiếp danh sách Memo lên Backend Server."""
    raw_url = CONFIG.get("server_url", "http://localhost:8000").strip().rstrip("/")
    if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
        raw_url = "http://" + raw_url
    if raw_url.endswith("/api/v1"):
        raw_url = raw_url[:-7].rstrip("/")
    elif raw_url.endswith("/api"):
        raw_url = raw_url[:-4].rstrip("/")

    api_url = f"{raw_url}/api/v1/mail-memo/import-from-agent"
    secret = CONFIG.get("agent_secret", "dung_memo_agent_secret_2026")

    payload = json.dumps({"items": items}, ensure_ascii=False).encode("utf-8")
    req = Request(api_url, data=payload, headers={
        "Content-Type": "application/json; charset=utf-8",
        "X-Agent-Secret": secret,
        "User-Agent": "GGGMailMemoAgent/1.0"
    })

    try:
        with urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            logger.info(f"✅ Đã đồng bộ lên Server thành công: {data.get('message')}")
            return {"success": True, "server_response": data}
    except Exception as e:
        logger.error(f"❌ Không thể gửi lên Server ({api_url}): {e}")
        return {"success": False, "error": str(e)}


def perform_sync(max_items: int = 400) -> dict:
    """Quét Outlook và đẩy lên server."""
    logger.info(f"Bắt đầu quét Outlook (max {max_items} emails)...")
    try:
        items = read_outlook_emails(max_items=max_items)
        logger.info(f"Đã tìm thấy {len(items)} email Memo.")
        if not items:
            return {"success": True, "total_found": 0, "message": "Không tìm thấy email Memo mới."}

        res = push_items_to_server(items)
        res["total_found"] = len(items)
        return res
    except Exception as e:
        logger.error(f"Lỗi khi thực hiện sync: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


class AgentHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Agent-Secret")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        if path in ["/status", "/health", "/"]:
            is_connected = is_outlook_process_running()
            data = {
                "status": "online",
                "connected": is_connected,
                "account": "dung.nguyenanh@ggg.com.vn",
                "folder": CONFIG.get("folder_name", "5. MKT"),
                "server_url": CONFIG.get("server_url", "http://localhost:8000"),
                "port": AGENT_PORT,
                "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
            return

        if path == "/scan":
            max_items = int(query.get("max_items", [CONFIG.get("max_items", 400)])[0])
            try:
                items = read_outlook_emails(max_items=max_items)
                res = {
                    "success": True,
                    "total_found": len(items),
                    "items": items,
                    "scanned_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
                self.send_response(200)
            except Exception as e:
                res = {
                    "success": False,
                    "message": f"Lỗi đọc Outlook Desktop: {str(e)}",
                    "total_found": 0,
                    "items": []
                }
                self.send_response(500)

            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            return

        if path == "/auto-sync":
            res = perform_sync(max_items=CONFIG.get("max_items", 400))
            self.send_response(200 if res.get("success") else 500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(b"Not Found")

    def do_POST(self):
        if self.path.startswith("/auto-sync"):
            return self.do_GET()
        if self.path.startswith("/scan"):
            return self.do_GET()
        self.send_response(404)
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(b"Not Found")

    def log_message(self, format, *args):
        logger.info("%s - [%s] %s" % (self.client_address[0], self.log_date_time_string(), format % args))


def schedule_watcher_thread():
    """Luồng chạy ngầm tự động quét theo các khung giờ (09:30, 14:00, 19:00)."""
    try:
        import pythoncom
        pythoncom.CoInitialize()
    except Exception:
        pass
    sync_times = CONFIG.get("auto_sync_times", ["09:30", "14:00", "19:00"])
    if CONFIG.get("sync_on_startup", True):
        # Đợi 10s sau khi khởi động để Outlook ổn định
        time.sleep(10)
        logger.info("⚡ [Startup] Tự động quét email Memo lần đầu khi mở máy...")
        try:
            perform_sync(CONFIG.get("max_items", 60))
        except Exception as e:
            logger.warning(f"Lỗi quét startup: {e}")

    last_synced_minute = ""
    while True:
        try:
            now = datetime.now()
            current_hm = now.strftime("%H:%M")
            if current_hm in sync_times and current_hm != last_synced_minute:
                last_synced_minute = current_hm
                logger.info(f"⏰ [Lịch Định Kỳ {current_hm}] Kích hoạt quét tự động...")
                perform_sync(CONFIG.get("max_items", 400))
        except Exception as ex:
            logger.error(f"Lỗi luồng schedule: {ex}")
        time.sleep(25)


def main():
    # Kiểm tra cờ CLI: Nếu có --sync thì chỉ quét rồi thoát
    if "--sync" in sys.argv:
        if is_port_in_use(AGENT_PORT):
            try:
                # Gọi tới agent đang chạy để kích hoạt sync
                with urlopen(f"http://127.0.0.1:{AGENT_PORT}/auto-sync", timeout=30) as r:
                    print(r.read().decode("utf-8"))
                sys.exit(0)
            except Exception:
                pass
        res = perform_sync(CONFIG.get("max_items", 400))
        print(json.dumps(res, ensure_ascii=False, indent=2))
        sys.exit(0)

    # Nếu cổng đã chạy và không phải cờ --sync, có thể do Task Scheduler gọi
    if is_port_in_use(AGENT_PORT):
        logger.info(f"Agent đã đang chạy ở cổng {AGENT_PORT}. Đang kích hoạt quét tự động...")
        try:
            with urlopen(f"http://127.0.0.1:{AGENT_PORT}/auto-sync", timeout=30) as r:
                print(r.read().decode("utf-8"))
        except Exception as e:
            print(f"Lỗi kích hoạt: {e}")
        sys.exit(0)

    if is_running_as_admin():
        print("=" * 68)
        print("⚠️  CẢNH BÁO: BẠN ĐANG MỞ CỬA SỔ NÀY DƯỚI QUYỀN ADMINISTRATOR!")
        print("   Windows có thể CHẶN kết nối giữa ứng dụng Administrator và Outlook thường.")
        print("   Nếu gặp lỗi không đọc được email, hãy TẮT cửa sổ này và nhấp đúp")
        print("   chạy file Chay_Outlook_Agent.bat bình thường (KHÔNG bấm Run as administrator).")
        print("=" * 68)

    print("=" * 68)
    print("   🚀 OUTLOOK MEMO AGENT - KẾT NỐI MÁY CÁ NHÂN DŨNG NGUYỄN")
    print(f"   📡 Đang lắng nghe tại: http://127.0.0.1:{AGENT_PORT}")
    print(f"   🌐 Đích Server đồng bộ: {CONFIG.get('server_url')}")
    print(f"   ⏰ Lịch tự động: {', '.join(CONFIG.get('auto_sync_times', []))} & Startup")
    print("   💡 Cửa sổ chạy ngầm phục vụ Web & Scheduler tự động")
    print("=" * 68)

    # Khởi động luồng hẹn giờ
    t = threading.Thread(target=schedule_watcher_thread, daemon=True)
    t.start()

    server = ThreadingHTTPServer(("127.0.0.1", AGENT_PORT), AgentHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nĐã dừng Outlook Agent.")
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        with open(os.path.join(AGENT_DIR, "agent_crash.log"), "w", encoding="utf-8") as f:
            import traceback
            traceback.print_exc(file=f)
