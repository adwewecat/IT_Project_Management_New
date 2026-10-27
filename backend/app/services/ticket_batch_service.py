import os
# Bỏ qua kiểm tra phiên bản Windows cho Node.js / Playwright (hỗ trợ Windows Server 2012 R2)
os.environ["NODE_SKIP_PLATFORM_CHECK"] = "1"

import json
import re
import base64
import logging
import asyncio
from datetime import datetime, date
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
TICKET_BATCH_CONFIG_FILE = os.path.join(DATA_DIR, "ticket_batch_config.json")
TICKET_BATCH_LATEST_FILE = os.path.join(DATA_DIR, "ticket_batch_latest.json")
SESSION_FILE = os.path.join(DATA_DIR, "ticket_batch_session.json")

TIMEOUT_ERROR_MESSAGE = "kết nối 600s nhưng không thành công, có thể lỗi hệ thống, vui lòng check lại"

BROWSER_MISSING_MESSAGE = (
    "Server chưa cài đặt Chromium cho Playwright (Windows Service). "
    "Vui lòng mở CMD Administrator trên Server và chạy lệnh:\n"
    r"C:\DUNGIT\IT_Project_Management_New\backend\.venv\Scripts\python.exe -m playwright install chromium"
)


def _setup_playwright_browsers_path() -> None:
    r"""
    Tự động dò tìm thư mục ms-playwright đã cài đặt trên máy hoặc cấu hình thư mục dùng chung.
    Giúp Windows Service (chạy dưới LocalSystem) tìm thấy Chromium mà không bị lỗi
    'Executable doesn't exist at C:\Windows\system32\config\systemprofile\...'.
    """
    if os.environ.get("PLAYWRIGHT_BROWSERS_PATH"):
        return

    candidate_paths = [
        r"C:\ms-playwright",
        r"C:\Program Files\ms-playwright",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ms-playwright"),
    ]

    try:
        users_root = r"C:\Users"
        if os.path.isdir(users_root):
            for u in os.listdir(users_root):
                user_pw_dir = os.path.join(users_root, u, "AppData", "Local", "ms-playwright")
                if os.path.isdir(user_pw_dir):
                    candidate_paths.append(user_pw_dir)
    except Exception:
        pass

    for path in candidate_paths:
        if os.path.isdir(path):
            try:
                subdirs = os.listdir(path)
                if any("chromium" in s.lower() or "chrome" in s.lower() for s in subdirs):
                    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = path
                    logger.info(f"[TICKET_BATCH] Tự động thiết lập PLAYWRIGHT_BROWSERS_PATH = {path}")
                    return
            except Exception:
                continue

    # Mặc định trỏ về C:\ms-playwright để tránh LocalSystem tìm vào systemprofile
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = r"C:\ms-playwright"


_setup_playwright_browsers_path()


def _is_timeout_error(e: Exception) -> bool:
    """Kiểm tra xem ngoại lệ có phải là Timeout / không phản hồi hay không."""
    err_str = str(e).lower()
    err_type = type(e).__name__.lower()
    timeout_keywords = [
        "timeout",
        "timed out",
        "time out",
        "navigation timeout",
        "err_connection_timed_out",
        "err_timed_out",
        "timeouterror"
    ]
    return any(k in err_str or k in err_type for k in timeout_keywords)


def _is_browser_missing_error(e: Exception) -> bool:
    """Kiểm tra ngoại lệ thiếu binary trình duyệt Playwright."""
    err_str = str(e).lower()
    return "executable doesn't exist" in err_str or "playwright install" in err_str


def format_friendly_error(e: Exception) -> str:
    """Format lỗi thành câu thông báo thân thiện, dễ hiểu cho người dùng."""
    if _is_timeout_error(e):
        return TIMEOUT_ERROR_MESSAGE
    if _is_browser_missing_error(e):
        return BROWSER_MISSING_MESSAGE
    return str(e)


# Danh mục công việc xoay vòng (theo index % 3)
CATEGORY_ROTATION = [
    "5. Các Danh Mục Phát Sinh Cần Điều Hướng - 168 Giờ làm việc",
    "2 MEMO Vận hành/hướng dẫn/đồng bộ Memo/fix lỗi khác cần liên hệ nhiều bên và check hệ thống - 168 Giờ làm việc",
    "3 Hướng dẫn Vận hành POS / RK7 / farcard / Mở Phần Mềm / Các vấn đề liên quan đến món cần liên hệ các bên xử lý - 168 Giờ làm việc"
]

SMTP_HOST = "smtp.office365.com"
SMTP_PORT = 587
SMTP_USER = "ss.it@ggg.com.vn"
SMTP_PASSWORD = "Agg$123iT%%"


def _encode_password(raw: str) -> str:
    """Base64 encode password để tránh lộ plain text trong JSON."""
    return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


def _decode_password(encoded: str) -> str:
    """Decode base64 password."""
    try:
        return base64.b64decode(encoded.encode("utf-8")).decode("utf-8")
    except Exception:
        return encoded  # Trả về nguyên nếu decode thất bại (plain text cũ)


def clear_session() -> None:
    """Xóa file session SSO khi đổi mật khẩu hoặc cần đăng nhập lại từ đầu."""
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
            logger.info("[TICKET_BATCH] Đã xóa session file cũ")
        except Exception:
            pass


def load_config() -> Dict[str, Any]:
    """Tải cấu hình SSO + email từ file JSON."""
    if os.path.exists(TICKET_BATCH_CONFIG_FILE):
        try:
            with open(TICKET_BATCH_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "sso_username": "",
        "sso_password_b64": "",
        "email_recipients": "",
        "last_run_at": None,
        "last_run_status": None,
    }


def save_config(cfg: Dict[str, Any]) -> None:
    """Lưu cấu hình vào file JSON."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(TICKET_BATCH_CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def load_latest_history() -> Optional[Dict[str, Any]]:
    """Tải lịch sử lần quét/xử lý gần nhất từ file JSON."""
    if os.path.exists(TICKET_BATCH_LATEST_FILE):
        try:
            with open(TICKET_BATCH_LATEST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"[TICKET_BATCH] Không đọc được latest history: {e}")
    return None


def save_latest_history(data: Dict[str, Any]) -> None:
    """Lưu lịch sử lần quét/xử lý gần nhất vào file JSON."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(TICKET_BATCH_LATEST_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"[TICKET_BATCH] Không lưu được latest history: {e}")


def get_sso_credentials() -> tuple[str, str]:
    """Lấy username và password SSO đã lưu. Ưu tiên config file, nếu chưa có thì đồng bộ từ DB UserSSOConfig."""
    cfg = load_config()
    username = (cfg.get("sso_username") or "").strip()
    password_b64 = (cfg.get("sso_password_b64") or "").strip()
    password = _decode_password(password_b64) if password_b64 else ""

    # Tự động đồng bộ từ DB UserSSOConfig nếu config chưa có password
    if not username or not password:
        try:
            from app.core.database import SessionLocal
            from app.models.user_sso_config import UserSSOConfig
            db = SessionLocal()
            sso_user = username or "dung.nguyenanh"
            user_cfg = db.query(UserSSOConfig).filter(UserSSOConfig.system_username == sso_user).first()
            if not user_cfg and "@" not in sso_user:
                user_cfg = db.query(UserSSOConfig).filter(UserSSOConfig.system_username == f"{sso_user}@ggg.com.vn").first()
            if user_cfg and user_cfg.sso_password:
                password = user_cfg.sso_password
                username = user_cfg.system_username.split('@')[0] if "@" in user_cfg.system_username else user_cfg.system_username
                cfg["sso_username"] = username
                cfg["sso_password_b64"] = _encode_password(password)
                save_config(cfg)
                logger.info(f"[TICKET_BATCH] Đã đồng bộ tài khoản SSO '{username}' từ UserSSOConfig trong CSDL.")
            db.close()
        except Exception as db_err:
            logger.debug(f"[TICKET_BATCH] Lỗi đọc UserSSOConfig từ DB: {db_err}")

    if not username or not password:
        raise ValueError("Chưa cấu hình tài khoản SSO. Vui lòng cấu hình username và password SSO trước khi chạy.")
    return username, password


async def _safe_wait_network_idle(page, timeout_ms: int = 24000):
    """Đợi DOM và networkidle an toàn, không bị crash/treo nếu có websocket/polling ngầm."""
    try:
        await page.wait_for_load_state("domcontentloaded", timeout=16000)
    except Exception:
        pass
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except Exception:
        pass


CHROMIUM_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--no-first-run",
    "--mute-audio",
]


async def _create_browser_context(playwright_instance):
    """
    Tạo Chromium browser và context với cờ tối ưu hóa bộ nhớ, chống crash khi chạy số lượng lớn.
    Tái sử dụng storage_state (cookies/session SSO) từ SESSION_FILE nếu tồn tại để tránh login nhiều lần.
    """
    _setup_playwright_browsers_path()
    browser = None
    launch_err = None
    try:
        browser = await playwright_instance.chromium.launch(headless=True, args=CHROMIUM_ARGS)
    except Exception as e:
        launch_err = e
        for ch in ["msedge", "chrome"]:
            try:
                browser = await playwright_instance.chromium.launch(channel=ch, headless=True, args=CHROMIUM_ARGS)
                logger.info(f"[TICKET_BATCH] Sử dụng trình duyệt '{ch}' thành công")
                break
            except Exception:
                pass

    if not browser:
        if launch_err and _is_browser_missing_error(launch_err):
            raise RuntimeError(BROWSER_MISSING_MESSAGE)
        if launch_err:
            raise launch_err

    if os.path.exists(SESSION_FILE) and os.path.getsize(SESSION_FILE) > 10:
        try:
            context = await browser.new_context(
                storage_state=SESSION_FILE,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            context.set_default_timeout(30000)
            context.set_default_navigation_timeout(45000)
            return browser, context
        except Exception as e:
            logger.warning(f"[TICKET_BATCH] Không đọc được session cache: {e}, tạo context mới")
            clear_session()
    
    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    )
    context.set_default_timeout(120000)
    context.set_default_navigation_timeout(180000)
    return browser, context


async def _ensure_logged_in(page, context, username: str, password: str) -> None:
    """
    Đảm bảo đã đăng nhập vào hệ thống GPMS:
    1. Kiểm tra session hiện có bằng cách truy cập GPMS work-list.
       Nếu URL ở GPMS và không bị chuyển hướng sang sso.ggg.com.vn -> Session còn sống, KHÔNG LOGIN LẠI!
    2. Nếu chưa login hoặc session hết hạn -> Truy cập sso.ggg.com.vn, login 1 lần duy nhất và lưu storage_state.
    """
    # 1. Thử kiểm tra session đã có
    if os.path.exists(SESSION_FILE):
        try:
            await page.goto("https://gpms.ggg.com.vn/gticket/work-list", timeout=600000)
            await _safe_wait_network_idle(page, 20000)
            if "gpms.ggg.com.vn" in page.url and "sso.ggg.com.vn" not in page.url and "login" not in page.url.lower():
                logger.info(f"[TICKET_BATCH] Tái sử dụng phiên SSO đã lưu thành công. Không cần gửi request login SSO!")
                return
        except Exception as e:
            logger.debug(f"[TICKET_BATCH] Kiểm tra session cũ: {e}")

    # 2. Thực hiện login SSO 1 lần duy nhất
    logger.info(f"[TICKET_BATCH] Đang thực hiện đăng nhập SSO cho user '{username}'...")
    await page.goto("https://sso.ggg.com.vn/", timeout=600000)
    await _safe_wait_network_idle(page, 40000)
    
    # Điền username
    username_input = page.locator('input[type="text"], input[name="username"], input[id*="user"], input[placeholder*="user"], input[placeholder*="User"]').first
    await username_input.wait_for(timeout=600000)
    await username_input.fill(username)
    
    # Điền password
    password_input = page.locator('input[type="password"]').first
    await password_input.fill(password)
    
    # Submit
    submit_btn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Đăng nhập")').first
    await submit_btn.click()
    await _safe_wait_network_idle(page, 60000)
    
    # Kiểm tra đăng nhập thành công
    if "sso.ggg.com.vn" in page.url and "login" in page.url.lower():
        clear_session()
        raise ValueError(f"Đăng nhập SSO thất bại. URL hiện tại: {page.url}. Kiểm tra lại username/password.")
    logger.info(f"[TICKET_BATCH] SSO login thành công. URL: {page.url}")

    # Chuyển tiếp sang GPMS để hoàn tất OAuth callback và nạp localStorage
    try:
        await page.goto("https://gpms.ggg.com.vn/gticket/work-list", timeout=240000)
        await _safe_wait_network_idle(page, 32000)
        await asyncio.sleep(2)
    except Exception as gpms_e:
        logger.debug(f"[TICKET_BATCH] GPMS callback init: {gpms_e}")

    # 3. Lưu session vào file để dùng lại ở các lần tiếp theo (bao gồm cả cookies và localStorage của GPMS)
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        await context.storage_state(path=SESSION_FILE)
        logger.info(f"[TICKET_BATCH] Đã lưu session vào {SESSION_FILE}")
    except Exception as se:
        logger.warning(f"[TICKET_BATCH] Không thể lưu session: {se}")


async def _sso_login(page, username: str, password: str) -> None:
    """Tương thích ngược: Đăng nhập SSO tại sso.ggg.com.vn."""
    await page.goto("https://sso.ggg.com.vn/", timeout=600000)
    await _safe_wait_network_idle(page, 40000)
    
    username_input = page.locator('input[type="text"], input[name="username"], input[id*="user"], input[placeholder*="user"], input[placeholder*="User"]').first
    await username_input.wait_for(timeout=600000)
    await username_input.fill(username)
    
    password_input = page.locator('input[type="password"]').first
    await password_input.fill(password)
    
    submit_btn = page.locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Đăng nhập")').first
    await submit_btn.click()
    await _safe_wait_network_idle(page, 60000)
    
    if "sso.ggg.com.vn" in page.url and "login" in page.url.lower():
        raise ValueError(f"Đăng nhập SSO thất bại. URL hiện tại: {page.url}. Kiểm tra lại username/password.")
    logger.info(f"[TICKET_BATCH] SSO login thành công. URL: {page.url}")


async def _fetch_timesheet_data(page) -> Dict[str, float]:
    """
    Lấy dữ liệu timesheet từ GPMS.
    Return: dict {"2026-09-01": remaining_hours, ...}
    Remaining = 24 - tổng_giờ_ngày_đó (min 0)
    """
    today = date.today()
    first_of_month = today.replace(day=1)
    
    from_str = first_of_month.strftime("%d/%m/%Y")
    to_str = today.strftime("%d/%m/%Y")
    
    await page.goto("https://gpms.ggg.com.vn/timesheet-management", timeout=600000)
    await _safe_wait_network_idle(page, 60000)
    await asyncio.sleep(2)
    
    # Lọc thời gian
    # Tìm input từ ngày
    date_inputs = await page.locator('input[type="text"]').all()
    if len(date_inputs) >= 2:
        # Nhập ngày bắt đầu
        await date_inputs[0].fill(from_str)
        await page.keyboard.press("Enter")
        await asyncio.sleep(0.5)
        # Nhập ngày kết thúc
        await date_inputs[1].fill(to_str)
        await page.keyboard.press("Enter")
        await asyncio.sleep(0.5)
    
    # Click nút tìm kiếm/lọc nếu có
    search_btn = page.locator('button:has-text("Tìm kiếm"), button:has-text("Lọc"), button:has-text("Áp dụng"), button:has-text("Search")')
    if await search_btn.count() > 0:
        await search_btn.first.click()
        await _safe_wait_network_idle(page, 10000)
    await asyncio.sleep(3)
    
    # Đọc hàng "Tổng thời gian" từ bảng
    # Hàng này nằm ở đầu bảng với label "Tổng thời gian"
    remaining_hours: Dict[str, float] = {}
    
    try:
        # Tìm row chứa "Tổng thời gian"
        total_row = page.locator('tr:has-text("Tổng thời gian")').first
        cells = await total_row.locator('td, th').all()
        
        # Parse header để biết ngày nào ứng cột nào
        headers = await page.locator('thead tr th').all()
        header_texts = []
        for h in headers:
            txt = (await h.inner_text()).strip()
            header_texts.append(txt)
        
        # header_texts[0] = "Công việc", sau đó là ngày 01/09, 02/09, ...
        # cells[0] = "Tổng thời gian", cells[1] = giờ ngày 01, ...
        
        for i, cell in enumerate(cells):
            if i == 0:
                continue  # skip label
            cell_text = (await cell.inner_text()).strip()
            # Tìm header tương ứng (offset 1)
            header_idx = i  # header_texts[i] tương ứng với cells[i]
            if header_idx < len(header_texts):
                day_str = header_texts[header_idx].strip()
                # day_str dạng "01/09" hoặc "01\n09"
                day_str = day_str.replace("\n", "/").strip("/")
                # Parse ngày
                try:
                    parts = day_str.split("/")
                    if len(parts) >= 2:
                        day_num = int(parts[0])
                        month_num = int(parts[1])
                        year_num = today.year
                        key = f"{year_num:04d}-{month_num:02d}-{day_num:02d}"
                        
                        # Parse số giờ từ cell (VD: "16h" -> 16, "16" -> 16)
                        hours_str = cell_text.replace("h", "").replace("H", "").strip()
                        if hours_str == "-" or hours_str == "":
                            total_hours = 0.0
                        else:
                            total_hours = float(hours_str)
                        
                        remaining = max(0.0, 24.0 - total_hours)
                        remaining_hours[key] = remaining
                except (ValueError, IndexError):
                    pass
    except Exception as e:
        logger.warning(f"[TICKET_BATCH] Không parse được timesheet: {e}")
    
    if not remaining_hours:
        # Fallback: khởi tạo tất cả các ngày trong tháng có 24h trống
        logger.warning("[TICKET_BATCH] Không đọc được timesheet, fallback: tất cả ngày có 24h")
        d = first_of_month
        while d <= today:
            remaining_hours[d.strftime("%Y-%m-%d")] = 24.0
            d = d.replace(day=d.day + 1) if d.day < 28 else (
                d.replace(month=d.month + 1, day=1) if d.month < 12 else d.replace(year=d.year + 1, month=1, day=1)
            )
    
    logger.info(f"[TICKET_BATCH] Timesheet loaded: {len(remaining_hours)} ngày")
    return remaining_hours


def _pick_best_day(remaining_hours: Dict[str, float]) -> Optional[str]:
    """
    Chọn ngày tốt nhất để khai báo 1 giờ:
    1. Ưu tiên ngày có remaining < 8h (nhưng > 0)
    2. Nếu không có, lấy ngày đầu tiên có remaining >= 1h
    Return: key dạng "2026-09-01" hoặc None nếu không có
    """
    # Sắp xếp theo ngày (tăng dần = ưu tiên ngày đầu tháng)
    sorted_days = sorted(remaining_hours.keys())
    
    # Ưu tiên 1: remaining > 0 và < 8
    for day_key in sorted_days:
        r = remaining_hours[day_key]
        if 0 < r < 8:
            return day_key
    
    # Ưu tiên 2: remaining >= 1
    for day_key in sorted_days:
        r = remaining_hours[day_key]
        if r >= 1:
            return day_key
    
    return None


async def _fetch_ticket_list(page, username: str) -> List[Dict[str, Any]]:
    """
    Lấy danh sách ticket từ work-list.
    Áp dụng Dual-Engine:
    1. Bắt trực tiếp response JSON từ API https://ticket-gpms.ggg.com.vn/api/tasks/paging.
    2. Duyệt DOM bảng kết hợp cuộn sâu (infinite scroll & mouse wheel) để bắt trọn mọi ticket.
    Quy tắc lọc theo người dùng chỉ định:
    - Tên nhiệm vụ chứa: 'Nhiệm vụ hỗ trợ tiếp nhận từ' hoặc 'từ tổng đài 3CX' (hoặc '3CX')
    - Người xử lý được gán cho: dung.nguyenanh (hoặc username SSO)
    """
    seen_tickets_dict: Dict[str, Dict[str, Any]] = {}
    user_clean = (username or "").strip().lower().split('@')[0]

    def _is_ticket_match(name: str, assignee: str) -> bool:
        combined_name = (name or "").lower()
        assignee_clean = (assignee or "").strip().lower()
        
        is_3cx = any(kw in combined_name for kw in [
            "nhiệm vụ hỗ trợ tiếp nhận từ",
            "từ tổng đài 3cx",
            "hỗ trợ tiếp nhận từ",
            "tiếp nhận từ tổng đài",
            "tổng đài 3cx",
            "từ tổng đài",
            "3cx",
        ])
        is_user_match = (
            ("dung.nguyenanh" in assignee_clean) or
            (user_clean and user_clean in assignee_clean) or
            (assignee_clean and assignee_clean in user_clean)
        )
        return is_3cx and is_user_match

    # Lắng nghe response từ API tasks/paging của GPMS
    async def _on_ticket_response(response):
        if "tasks/paging" in response.url:
            try:
                res_json = await response.json()
                items = res_json.get("data", {}).get("items", [])
                for it in items:
                    t_id = str(it.get("id", "")).strip()
                    t_title = (it.get("title") or it.get("name") or "").strip()
                    t_creator = (it.get("creator_name") or it.get("creator") or "Anonymous").strip()
                    t_assignee = (it.get("assignee_name") or it.get("assignee") or "").strip()
                    t_due = (it.get("due_date") or "").strip()
                    
                    if t_id and t_id not in seen_tickets_dict:
                        if _is_ticket_match(t_title, t_assignee):
                            seen_tickets_dict[t_id] = {
                                "ticket_id": t_id,
                                "ticket_name": t_title,
                                "created_by": t_creator,
                                "assignee": t_assignee,
                                "due_date": t_due,
                                "url": f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={t_id}",
                                "source_type": "TICKET",
                                "status": "Mới mở",
                            }
            except Exception as api_err:
                logger.debug(f"[TICKET_BATCH] Lỗi parse tasks/paging: {api_err}")

    page.on("response", _on_ticket_response)

    try:
        await page.goto("https://gpms.ggg.com.vn/gticket/work-list", timeout=600000)
        await _safe_wait_network_idle(page, 60000)
        await asyncio.sleep(2)

        # Đảm bảo chọn tab "Công việc nhận về" nếu có trên giao diện GPMS
        try:
            nhan_ve_btn = page.locator("button:has-text('Công việc nhận về'), div:has-text('Công việc nhận về'), span:has-text('Công việc nhận về'), a:has-text('Công việc nhận về')").first
            if await nhan_ve_btn.count() > 0:
                await nhan_ve_btn.click()
                await _safe_wait_network_idle(page, 24000)
                await asyncio.sleep(1)
        except Exception as tab_e:
            logger.debug(f"[TICKET_BATCH] Chuyển tab 'Công việc nhận về': {tab_e}")
        
        prev_row_count = 0
        no_new_rows_count = 0
        max_scrolls = 60  # Đảm bảo duyệt sâu mọi đợt lazy-load
        
        for scroll_idx in range(1, max_scrolls + 1):
            await asyncio.sleep(0.8)
            
            try:
                # Parse bảng ticket trực tiếp từ DOM
                rows = await page.locator('tbody tr').all()
                current_row_count = len(rows)
                
                for row in rows:
                    try:
                        cells = await row.locator('td').all()
                        if len(cells) < 4:
                            continue
                        
                        # Cột Mã (cell 0)
                        ma_cell = cells[0]
                        ma_text = (await ma_cell.inner_text()).strip()
                        if not ma_text or ma_text in seen_tickets_dict:
                            continue
                        
                        # Tên nhiệm vụ (cell 1) - lấy cả title lẫn text
                        ten_text = (await cells[1].inner_text()).strip()
                        cell_title = ""
                        try:
                            for tag in ['a', 'span', 'p', 'div']:
                                loc = cells[1].locator(tag)
                                c = await loc.count()
                                for idx in range(min(c, 5)):
                                    t_val = (await loc.nth(idx).get_attribute("title")) or ""
                                    if t_val and len(t_val) > len(cell_title):
                                        cell_title = t_val.strip()
                            if not cell_title:
                                cell_title = ((await cells[1].get_attribute("title")) or "").strip()
                        except Exception:
                            pass

                        full_task_name = cell_title if (cell_title and len(cell_title) > len(ten_text)) else ten_text
                        
                        # Người tạo (cell 2)
                        nguoi_tao = (await cells[2].inner_text()).strip() if len(cells) > 2 else ""
                        
                        # Người xử lý (cell 3)
                        nguoi_xu_ly = (await cells[3].inner_text()).strip() if len(cells) > 3 else ""
                        
                        # Ngày YCHT (cell 4)
                        ngay_ycht = (await cells[4].inner_text()).strip() if len(cells) > 4 else ""

                        if _is_ticket_match(full_task_name, nguoi_xu_ly):
                            seen_tickets_dict[ma_text] = {
                                "ticket_id": ma_text,
                                "ticket_name": full_task_name,
                                "created_by": nguoi_tao,
                                "assignee": nguoi_xu_ly,
                                "due_date": ngay_ycht,
                                "url": f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={ma_text}",
                                "source_type": "TICKET",
                                "status": "Mới mở",
                            }
                    except Exception as row_err:
                        logger.debug(f"[TICKET_BATCH] Skip row: {row_err}")

                # Kiểm tra nếu số dòng tăng lên
                if current_row_count > prev_row_count:
                    prev_row_count = current_row_count
                    no_new_rows_count = 0
                else:
                    no_new_rows_count += 1
                    if no_new_rows_count >= 6:
                        logger.info(f"[TICKET_BATCH] Đã cuộn hết trang sau {scroll_idx} lần cuộn (tổng {current_row_count} hàng trong DOM)")
                        break

                # Cuộn sâu cả container lẫn window bằng nhiều cơ chế
                await page.evaluate("""
                    () => {
                        window.scrollTo(0, document.body.scrollHeight);
                        if (document.documentElement) {
                            document.documentElement.scrollTop = document.documentElement.scrollHeight;
                        }
                        const scrollables = document.querySelectorAll('div, section, main, [class*="scroll"], [class*="table"], [class*="wrapper"], tbody');
                        for (const el of scrollables) {
                            if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
                                el.scrollTop = el.scrollHeight;
                                el.dispatchEvent(new Event('scroll', { bubbles: true }));
                            }
                        }
                    }
                """)
                
                # Cuộn chuột wheel
                try:
                    await page.mouse.wheel(0, 1500)
                except Exception:
                    pass

                # Kéo dòng cuối cùng vào tầm nhìn
                try:
                    last_row = page.locator('tbody tr').last
                    if await last_row.count() > 0:
                        await last_row.scroll_into_view_if_needed(timeout=1500)
                except Exception:
                    pass

                # Phím PageDown / End
                try:
                    await page.keyboard.press("PageDown")
                    await page.keyboard.press("End")
                except Exception:
                    pass

                await asyncio.sleep(1.0)
            except Exception as e:
                logger.warning(f"[TICKET_BATCH] Lỗi trong lần cuộn {scroll_idx}: {e}")
                break
    finally:
        try:
            page.remove_listener("response", _on_ticket_response)
        except Exception:
            pass
    
    tickets = list(seen_tickets_dict.values())
    logger.info(f"[TICKET_BATCH] Tìm thấy {len(tickets)} tickets 3CX của {username}")
    return tickets


async def _fetch_gprocess_mission_list(page, username: str) -> List[Dict[str, Any]]:
    """
    Lấy danh sách nhiệm vụ G-Process cần xử lý tại https://gpms.ggg.com.vn/g-process/my-mission.
    Điều kiện bắt buộc lọc và xử lý:
    1. Nhiệm vụ có tên: 'IT xác nhận lỗi kỹ thuật' (hoặc step_id == 11702).
    2. NGƯỜI THỰC HIỆN: Phải ĐÃ ĐƯỢC GÁN là 'dung.nguyenanh' (hoặc target_user).
       - Trong API list-my-task: assignee_id == target_user_id (mặc định 442 của dung.nguyenanh).
       - Bỏ qua tuyệt đối nếu assignee_id là None (chưa gán) hoặc gán cho người khác.
       - Đối chiếu với DOM bảng my-mission: cột 4 (Người thực hiện) phải là 'dung.nguyenanh'.
    """
    gprocess_items = []
    seen_ids = set()
    try:
        logger.info("[GPROCESS] Bắt đầu lấy danh sách nhiệm vụ từ https://gpms.ggg.com.vn/g-process/my-mission...")
        intercepted_tasks: List[Dict[str, Any]] = []
        target_user = (username or "dung.nguyenanh").strip().lower()
        target_user_id = 442 if "dung.nguyenanh" in target_user else 0

        async def _on_response(response):
            nonlocal target_user_id
            url = response.url
            if "info-by-username" in url or "info-full" in url:
                try:
                    u_json = await response.json()
                    uid = u_json.get("data", {}).get("id")
                    if uid:
                        target_user_id = uid
                except Exception:
                    pass

            if "list-my-task" in url:
                m_obj = re.search(r'object_id=(\d+)', url)
                if m_obj:
                    try:
                        target_user_id = int(m_obj.group(1))
                    except Exception:
                        pass
                try:
                    res_json = await response.json()
                    task_list = res_json.get("data", {}).get("list", [])
                    if isinstance(task_list, list):
                        for item in task_list:
                            if isinstance(item, dict) and item.get("id"):
                                intercepted_tasks.append(item)
                except Exception:
                    pass

        page.on("response", _on_response)

        await page.goto("https://gpms.ggg.com.vn/g-process/my-mission", timeout=480000)
        await _safe_wait_network_idle(page, 60000)

        # Chờ bảng xuất hiện hoặc spinner biến mất
        try:
            await page.locator('.ant-spin-spinning').wait_for(state="detached", timeout=32000)
        except Exception:
            pass

        # Chủ động đợi API list-my-task phản hồi hoặc bảng xuất hiện dữ liệu (tối đa 10s, kiểm tra mỗi 0.5s)
        for _ in range(20):
            if intercepted_tasks:
                break
            try:
                row_cnt = await page.locator('tr.ant-table-row, tbody tr').count()
                if row_cnt > 0:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.5)

        VALID_TARGETS = [target_user, "dung.nguyenanh", "nguyễn anh dũng", "nguyen anh dung"]
        UNASSIGNED_KEYWORDS = [
            "-", "—", "+", "none", "null", "undefined",
            "chưa gán", "chua gan", "chưa phân công", "chua phan cong",
            "chưa tiếp nhận", "chua tiep nhan", "gán người", "gan nguoi",
            "chờ tiếp nhận", "cho tiep nhan", "phòng cntt", "bộ phận it", "nhóm it"
        ]

        # Quét bảng HTML table trên trang để lập bản đồ đối chiếu cột 'Người thực hiện' (cột 4)
        dom_assignee_map = {}
        try:
            dom_rows = await page.locator('tr.ant-table-row').all()
            for r in dom_rows:
                cells = await r.locator('td').all()
                if len(cells) >= 5:
                    c_req = (await cells[3].inner_text()).strip()
                    c_assignee = (await cells[4].inner_text()).strip()
                    if c_req:
                        clean_k = re.sub(r'\s+', ' ', c_req).strip().lower()
                        dom_assignee_map[clean_k] = c_assignee
        except Exception as map_err:
            logger.debug(f"[GPROCESS] Lỗi xây dựng dom_assignee_map: {map_err}")

        # Hỗ trợ phân trang: Nếu còn trang tiếp theo, click để nạp thêm tasks
        try:
            next_page_btn = page.locator('li.ant-pagination-next:not(.ant-pagination-disabled) button, li.ant-pagination-next:not(.ant-pagination-disabled) a').first
            p_count = 0
            while await next_page_btn.count() > 0 and p_count < 5:
                is_disabled = await next_page_btn.get_attribute("disabled")
                if is_disabled is not None:
                    break
                logger.info(f"[GPROCESS] Đang click sang trang tiếp theo (trang {p_count + 2})...")
                await next_page_btn.click()
                await _safe_wait_network_idle(page, 15000)
                await asyncio.sleep(1.5)
                # Cập nhật thêm dom_assignee_map
                try:
                    p_rows = await page.locator('tr.ant-table-row').all()
                    for r in p_rows:
                        cells = await r.locator('td').all()
                        if len(cells) >= 5:
                            c_req = (await cells[3].inner_text()).strip()
                            c_assignee = (await cells[4].inner_text()).strip()
                            if c_req:
                                clean_k = re.sub(r'\s+', ' ', c_req).strip().lower()
                                dom_assignee_map[clean_k] = c_assignee
                except Exception:
                    pass
                p_count += 1
                next_page_btn = page.locator('li.ant-pagination-next:not(.ant-pagination-disabled) button, li.ant-pagination-next:not(.ant-pagination-disabled) a').first
        except Exception as page_e:
            logger.debug(f"[GPROCESS] Xử lý phân trang next: {page_e}")

        # 1. Ưu tiên cao nhất: Lấy từ intercepted_tasks của API list-my-task (dữ liệu chuẩn 100% của GPMS)
        if intercepted_tasks:
            logger.info(
                f"[GPROCESS] Đã bắt được {len(intercepted_tasks)} nhiệm vụ từ API list-my-task. "
                f"Đang lọc điều kiện: Tên 'IT xác nhận lỗi kỹ thuật' & Người thực hiện gán cho '{target_user}' (ID: {target_user_id})..."
            )
            for item in intercepted_tasks:
                m_id = str(item.get("id"))
                if not m_id or m_id in seen_ids:
                    continue

                task_name = (item.get("name") or "").strip()
                step_id = item.get("step_id")
                req_name = (item.get("ticket_request_name") or "").strip()

                # ========================================================
                # ĐIỀU KIỆN 1: Nhiệm vụ có tên: "IT xác nhận lỗi kỹ thuật"
                # ========================================================
                is_it_confirm = (
                    "xác nhận lỗi kỹ thuật" in task_name.lower() or
                    "it xác nhận lỗi kỹ thuật" in task_name.lower() or
                    step_id == 11702
                )
                if not is_it_confirm:
                    continue

                # ========================================================
                # ĐIỀU KIỆN 2: NGƯỜI THỰC HIỆN phải ĐÃ ĐƯỢC GÁN là "dung.nguyenanh"
                # Tuyệt đối không tự gán hoặc xử lý nhiệm vụ chưa gán / gán cho người khác!
                # ========================================================
                assignee_id = item.get("assignee_id")
                
                # Đối chiếu thêm với bảng DOM trên trang (nếu tìm thấy theo tên yêu cầu)
                clean_req = re.sub(r'\s+', ' ', req_name).strip().lower()
                dom_assignee = dom_assignee_map.get(clean_req, "")

                # 2.1. Kiểm tra trạng thái Chưa gán:
                if dom_assignee:
                    d_low = dom_assignee.lower().strip()
                    if not d_low or d_low in ["-", "—", "+"] or any(k in d_low for k in UNASSIGNED_KEYWORDS):
                        logger.info(f"[GPROCESS] ⏭️ Bỏ qua nhiệm vụ #{m_id}: Bảng trên trang hiển thị Chưa gán ('{dom_assignee}'). Tuyệt đối không tự gán!")
                        continue
                    if not any(v in d_low for v in VALID_TARGETS):
                        logger.info(f"[GPROCESS] ⏭️ Bỏ qua nhiệm vụ #{m_id}: Bảng trên trang hiển thị gán cho '{dom_assignee}', không phải {target_user}.")
                        continue

                # 2.2. Kiểm tra assignee_id từ API:
                if assignee_id is None or assignee_id == 0:
                    # Nếu API không có assignee_id và trên DOM cũng không xác nhận là dung.nguyenanh -> Chưa gán
                    if not dom_assignee or not any(v in dom_assignee.lower() for v in VALID_TARGETS):
                        logger.info(f"[GPROCESS] ⏭️ Bỏ qua nhiệm vụ #{m_id}: Chưa có người thực hiện (assignee_id=None). Tuyệt đối không tự gán!")
                        continue
                elif target_user_id > 0 and assignee_id != target_user_id:
                    # Gán cho người khác
                    logger.info(f"[GPROCESS] ⏭️ Bỏ qua nhiệm vụ #{m_id}: Nhiệm vụ này gán cho User ID #{assignee_id}, không phải {target_user} (ID #{target_user_id}).")
                    continue

                # Xác định người tạo
                creator_obj = item.get("creator") or {}
                nguoi_tao = creator_obj.get("user_name") or creator_obj.get("full_name") or "—"

                # Ngày YCHT
                due_date_str = "—"
                expected_ts = item.get("expected_complete_time")
                if expected_ts:
                    try:
                        due_date_str = datetime.fromtimestamp(expected_ts).strftime("%H:%M %d/%m/%Y")
                    except Exception:
                        pass
                if due_date_str == "—" and item.get("created_at"):
                    try:
                        dt_created = datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))
                        due_date_str = dt_created.strftime("%H:%M %d/%m/%Y")
                    except Exception:
                        pass

                detail_url = f"https://gpms.ggg.com.vn/g-process/my-mission/{m_id}"
                full_name = f"{task_name} ({req_name})" if req_name else task_name

                gprocess_items.append({
                    "ticket_id": m_id,
                    "ticket_name": full_name,
                    "created_by": nguoi_tao,
                    "assignee": dom_assignee or "dung.nguyenanh",
                    "due_date": due_date_str,
                    "url": detail_url,
                    "source_type": "GPROCESS",
                    "status": "Đang triển khai",
                })
                seen_ids.add(m_id)
                logger.info(f"[GPROCESS] ✅ Tìm thấy nhiệm vụ hợp lệ của {target_user}: #{m_id} - {full_name} (Assignee: {dom_assignee or 'dung.nguyenanh'})")

        # 2. Fallback: Parse từ HTML table nếu không có API response
        if not gprocess_items:
            logger.info("[GPROCESS] Fallback: Parse danh sách từ HTML table...")
            page_num = 1
            max_pages = 5
            while page_num <= max_pages:
                await asyncio.sleep(1)
                rows = await page.locator('tr.ant-table-row, .ant-table-tbody tr, tbody tr').all()
                if not rows:
                    break

                found_any = False
                for idx, row in enumerate(rows):
                    try:
                        cells = await row.locator('td').all()
                        if len(cells) < 5:
                            continue

                        nhiem_vu_text = (await cells[0].inner_text()).strip()
                        if not nhiem_vu_text or nhiem_vu_text == "\xa0":
                            continue

                        is_it_confirm = "xác nhận lỗi kỹ thuật" in nhiem_vu_text.lower()
                        if not is_it_confirm:
                            continue

                        found_any = True
                        trang_thai = (await cells[2].inner_text()).strip() if len(cells) > 2 else "Đang triển khai"
                        yeu_cau_text = (await cells[3].inner_text()).strip() if len(cells) > 3 else ""
                        nguoi_th_text = (await cells[4].inner_text()).strip() if len(cells) > 4 else ""
                        ngay_ycht = (await cells[5].inner_text()).strip() if len(cells) > 5 else ""
                        nguoi_tao = ""
                        if len(cells) > 7:
                            nguoi_tao = (await cells[7].inner_text()).strip()
                        elif len(cells) > 6:
                            nguoi_tao = (await cells[6].inner_text()).strip()

                        # Kiểm tra xem Người thực hiện có rơi vào chưa gán không
                        is_gp_unassigned = (
                            not nguoi_th_text or
                            nguoi_th_text in ["-", "—", "+", ""] or
                            any(k in nguoi_th_text.lower() for k in UNASSIGNED_KEYWORDS)
                        )
                        if is_gp_unassigned:
                            logger.info(f"[GPROCESS] (Fallback) ⏭️ Bỏ qua nhiệm vụ hàng {idx+1}: Chưa gán người thực hiện ('{nguoi_th_text}'). Tuyệt đối không tự gán!")
                            continue

                        is_dung = any(v_tar in nguoi_th_text.lower() for v_tar in VALID_TARGETS)
                        if not is_dung:
                            logger.info(f"[GPROCESS] (Fallback) ⏭️ Bỏ qua nhiệm vụ hàng {idx+1}: Gán cho '{nguoi_th_text}', không phải {target_user}.")
                            continue

                        mission_id = ""
                        link_tag = cells[0].locator('a').first
                        if await link_tag.count() > 0:
                            href = await link_tag.get_attribute('href') or ""
                            m_id = re.search(r'/my-mission/([0-9A-Za-z_-]+)', href)
                            if m_id:
                                mission_id = m_id.group(1)

                        if not mission_id:
                            r_key = await row.get_attribute('data-row-key')
                            if r_key and r_key != "None":
                                mission_id = str(r_key)

                        if not mission_id or mission_id in seen_ids:
                            mission_id = f"GP_{page_num}_{idx+1}"

                        detail_url = f"https://gpms.ggg.com.vn/g-process/my-mission/{mission_id}"
                        full_name = f"{nhiem_vu_text} ({yeu_cau_text})" if yeu_cau_text else nhiem_vu_text

                        gprocess_items.append({
                            "ticket_id": mission_id,
                            "ticket_name": full_name,
                            "created_by": nguoi_tao or "—",
                            "assignee": nguoi_th_text,
                            "due_date": ngay_ycht or "—",
                            "url": detail_url,
                            "source_type": "GPROCESS",
                            "status": trang_thai,
                        })
                        seen_ids.add(mission_id)
                        logger.info(f"[GPROCESS] (Fallback) ✅ Tìm thấy: #{mission_id} - {full_name} (Assignee: {nguoi_th_text})")
                    except Exception as row_err:
                        logger.debug(f"[GPROCESS] Lỗi parse hàng: {row_err}")

                if not found_any:
                    break
                next_btn = page.locator('button[aria-label="Next page"], .pagination .next, button:has-text(">"), a:has-text("Next"), li.ant-pagination-next:not(.ant-pagination-disabled)')
                if await next_btn.count() > 0:
                    is_disabled = await next_btn.first.get_attribute("disabled")
                    cls = await next_btn.first.get_attribute("class") or ""
                    if is_disabled is not None or "disabled" in cls:
                        break
                    await next_btn.first.click()
                    await _safe_wait_network_idle(page, 8000)
                    page_num += 1
                else:
                    break
    except Exception as e:
        logger.warning(f"[GPROCESS] Lỗi lấy danh sách my-mission: {e}")

    logger.info(f"[GPROCESS] Tổng số nhiệm vụ G-Process tìm thấy: {len(gprocess_items)}")
    return gprocess_items



async def _close_ticket(
    page,
    ticket: Dict[str, Any],
    ticket_index: int,
    remaining_hours: Dict[str, float]
) -> Dict[str, Any]:
    """
    Đóng 1 ticket:
    - Chuyển trạng thái sang Hoàn thành
    - Khai báo timesheet 1h
    - Xoay vòng danh mục
    """
    ticket_id = str(ticket.get("ticket_id", "")).strip()
    url = ticket.get("url") or f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={ticket_id}"

    try:
        if page.is_closed():
            raise RuntimeError("Trang trình duyệt đã bị đóng bất ngờ")

        await page.goto(url, timeout=180000)
        await _safe_wait_network_idle(page, 20000)
        await asyncio.sleep(0.5)

        # Chọn ngày tốt nhất còn trống
        best_day = _pick_best_day(remaining_hours)
        if not best_day:
            return {
                "ticket_id": ticket_id,
                "ticket_name": ticket.get("ticket_name", f"Ticket #{ticket_id}"),
                "status": "skipped",
                "reason": "Không còn giờ trống trong tháng",
                "message": "Bỏ qua: Không còn giờ trống trong tháng",
                "created_by": ticket.get("created_by", "—"),
                "assignee": ticket.get("assignee", "—"),
                "due_date": ticket.get("due_date", "—"),
                "url": url,
                "source_type": "TICKET"
            }

        best_day_dt = datetime.strptime(best_day, "%Y-%m-%d")
        best_day_display = best_day_dt.strftime("%d/%m/%Y")

        # Chọn danh mục xoay vòng theo index
        category = CATEGORY_ROTATION[ticket_index % len(CATEGORY_ROTATION)]

        # 1. Chuyển trạng thái sang 'Đã hoàn thành' (react-select)
        status_container = page.locator("label:has-text('Trạng thái')").locator("xpath=../..").locator("[class*='control'], .css-l2aqk6").first
        status_text = await status_container.inner_text() if await status_container.count() > 0 else ""
        if "Đã hoàn thành" not in status_text:
            if await status_container.count() > 0:
                await status_container.click()
                await asyncio.sleep(0.3)
                sel_inp = status_container.locator("input").first
                if await sel_inp.count() > 0:
                    await sel_inp.fill("Đã hoàn thành")
                    await asyncio.sleep(0.2)
                    await page.keyboard.press("Enter")
                    await asyncio.sleep(0.8)
                else:
                    opt = page.locator("[class*='option']:has-text('Đã hoàn thành'), :text('Đã hoàn thành')").first
                    if await opt.count() > 0:
                        await opt.click()
                        await asyncio.sleep(0.8)
            else:
                # Fallback nếu container không tìm thấy
                status_box = page.locator(".css-1dimb5e-singleValue, [class*='singleValue']:has-text('Mới mở'), [class*='singleValue']:has-text('Đang triển khai')").first
                if await status_box.count() > 0:
                    await status_box.click()
                    await asyncio.sleep(0.3)
                    opt = page.locator("[class*='option']:has-text('Đã hoàn thành'), :text('Đã hoàn thành')").first
                    if await opt.count() > 0:
                        await opt.click()
                        await asyncio.sleep(0.8)

        # 2. Xử lý popup Khai báo Timesheet (#container-portal hoặc .ant-modal)
        # Khi chuyển trạng thái sang 'Đã hoàn thành', GPMS mở modal để khai báo giờ và ghi chú
        portal = page.locator("#container-portal")
        modal_in_portal = portal.locator("div[id*='container-modal'], div[class*='container-modal'], div[id*='style_container-modal'], div[class*='style_container-modal'], table").first

        try:
            await modal_in_portal.wait_for(state="visible", timeout=14000)
        except Exception:
            pass

        is_portal_open = await modal_in_portal.count() > 0 and await modal_in_portal.is_visible()
        antd_timesheet = page.locator(".ant-modal:has-text('Timesheet'), .ant-modal:has-text('thời gian'), .ant-modal:has-text('Khai báo')").first
        is_antd_open = await antd_timesheet.count() > 0 and await antd_timesheet.is_visible()

        if is_portal_open or is_antd_open:
            active_container = portal if is_portal_open else antd_timesheet
            logger.info(f"[TICKET_BATCH] #{ticket_id}: Phát hiện popup Timesheet trong {'#container-portal' if is_portal_open else '.ant-modal'}")

            # Tìm các dòng trong bảng
            rows = await active_container.locator("tbody tr").all()
            target_row = None

            if rows:
                for r in rows:
                    r_text = await r.inner_text()
                    r_inputs = await r.locator("input").all()
                    r_vals = [await inp.input_value() for inp in r_inputs]
                    if best_day_display in r_text or any(best_day_display in v for v in r_vals):
                        target_row = r
                        break
                if not target_row:
                    target_row = rows[0]

            scope = target_row if target_row else active_container

            # 2.1. Điền Thời gian (1 giờ)
            time_filled = False
            time_inps = scope.locator("input[name*='time'], input[name*='actual'], input[name*='hour'], input[type='number']")
            if await time_inps.count() > 0:
                await time_inps.first.fill("1")
                time_filled = True

            # 2.2. Điền Ghi chú (Note) - BẮT BUỘC để form Timesheet hợp lệ
            note_inps = scope.locator("input[name*='note'], textarea[name*='note'], input[placeholder*='note'], input[placeholder*='Ghi chú']")
            if await note_inps.count() > 0:
                await note_inps.first.fill("Hỗ trợ hoàn thành nhiệm vụ")

            # 2.3. Quét kiểm tra tất cả input để không sót ô rỗng
            all_inps = await scope.locator("input:not([type='hidden']), textarea").all()
            for inp in all_inps:
                inp_name = (await inp.get_attribute("name") or "").lower()
                inp_val = await inp.input_value()
                if not inp_val or inp_val in ["-", ""]:
                    if "note" in inp_name:
                        await inp.fill("Hỗ trợ hoàn thành nhiệm vụ")
                    elif ("time" in inp_name or "hour" in inp_name or "actual" in inp_name) and not time_filled:
                        await inp.fill("1")
                        time_filled = True

            if not time_filled:
                for inp in all_inps:
                    inp_name = (await inp.get_attribute("name") or "").lower()
                    if "note" not in inp_name:
                        await inp.fill("1")
                        time_filled = True
                        break

            await asyncio.sleep(0.3)

            # 2.4. Bấm nút Lưu / Xác nhận trong popup Timesheet
            save_ts = active_container.locator("button:has-text('Lưu'), button:has-text('Xác nhận'), button:has-text('Đồng ý'), div[class*='container-bottom-modal'] button:not(:has-text('Hủy')):not(:has-text('Đóng'))").first
            if await save_ts.count() > 0:
                try:
                    await save_ts.click(timeout=12000)
                except Exception:
                    await save_ts.click(force=True)
            else:
                bottom_btns = await active_container.locator("div[class*='container-bottom-modal'] button, .ant-modal-footer button").all()
                if bottom_btns:
                    await bottom_btns[-1].click(force=True)

            # Chờ popup Timesheet biến mất (tối đa 16s)
            try:
                await modal_in_portal.wait_for(state="hidden", timeout=16000)
            except Exception:
                pass
            await asyncio.sleep(0.5)

            # Thử lại nếu popup chưa đóng
            if await modal_in_portal.count() > 0 and await modal_in_portal.is_visible():
                logger.warning(f"[TICKET_BATCH] #{ticket_id}: Popup Timesheet chưa biến mất, thử force click Lưu.")
                try:
                    retry_btn = active_container.locator("button:has-text('Lưu'), button:has-text('Xác nhận')").first
                    if await retry_btn.count() > 0:
                        await retry_btn.click(force=True)
                        await asyncio.sleep(1.0)
                except Exception:
                    pass

        # 3. Phân loại: chọn 'Yêu cầu' (radio value='2')
        try:
            # Kiểm tra xem radio 'Yêu cầu' đã được chọn sẵn chưa (tránh click thừa hoặc lỗi Ant Design)
            is_checked = False
            radio2 = page.locator("input[type='radio'][value='2']").first
            if await radio2.count() > 0:
                try:
                    is_checked = await page.evaluate("""() => {
                        const r = document.querySelector("input[type='radio'][value='2']");
                        if (!r) return false;
                        if (r.checked) return true;
                        const w = r.closest('.ant-radio-wrapper') || r.closest('.ant-radio');
                        return !!(w && (w.classList.contains('ant-radio-wrapper-checked') || w.classList.contains('ant-radio-checked')));
                    }""")
                except Exception:
                    pass

            if not is_checked:
                # Với Ant Design, click vào label bao ngoài (label.ant-radio-wrapper) là chuẩn nhất
                radio_label = page.locator("label.ant-radio-wrapper:has(input[value='2']), label:has(input[value='2'])").first
                if await radio_label.count() > 0:
                    try:
                        await radio_label.click(timeout=12000)
                    except Exception:
                        await radio_label.click(force=True)
                else:
                    yc_radio = page.locator("label.ant-radio-wrapper:has-text('Yêu cầu'), label:has-text('Yêu cầu')").first
                    if await yc_radio.count() > 0:
                        try:
                            await yc_radio.click(timeout=12000)
                        except Exception:
                            await yc_radio.click(force=True)
                    elif await radio2.count() > 0:
                        await radio2.click(force=True)
                await asyncio.sleep(0.3)
        except Exception as err_radio:
            logger.warning(f"[TICKET_BATCH] Lỗi chọn radio 'Yêu cầu' ticket {ticket_id} (tiếp tục quy trình): {err_radio}")

        # 4. Danh mục công việc: chọn theo xoay vòng (0 -> 5., 1 -> 2., 2 -> 3.)
        cat_kw = "5. Các Danh Mục" if (ticket_index % 3 == 0) else ("2 MEMO" if (ticket_index % 3 == 1) else "3 Hướng dẫn")
        cat_card = page.locator(f".ItemCategoryUpdate_itemCategoryJob__QRmlI:has-text('{cat_kw}'), div[class*='ItemCategoryUpdate']:has-text('{cat_kw}')").first
        if await cat_card.count() > 0:
            try:
                await cat_card.scroll_into_view_if_needed(timeout=12000)
                await cat_card.click(timeout=16000)
            except Exception:
                try:
                    await cat_card.click(force=True, timeout=12000)
                except Exception:
                    await cat_card.evaluate("el => el.click()")
            await asyncio.sleep(0.5)

            # Xác nhận popup thay đổi SLA nếu có
            confirm_modal = page.locator(".ant-modal:has-text('Bạn có muốn thay đổi ngày YCHT'), .ant-modal:has-text('thay đổi')").first
            if await confirm_modal.count() > 0 and await confirm_modal.is_visible():
                btn_ok = confirm_modal.locator("button:has-text('Xác nhận'), button:has-text('OK')").first
                if await btn_ok.count() > 0:
                    try:
                        await btn_ok.click(timeout=12000)
                    except Exception:
                        await btn_ok.click(force=True)
                    await asyncio.sleep(0.5)

        # 5. Kéo xuống dưới cùng và bấm Lưu ticket (Lưu ý: nút Lưu trên GPMS là thẻ DIV .DetailTicket_btnSave)
        await page.keyboard.press("End")
        await asyncio.sleep(0.3)
        save_btn = page.locator(".DetailTicket_btnSave__36RtV, div[class*='DetailTicket_btnSave']").first
        if await save_btn.count() > 0:
            try:
                await save_btn.scroll_into_view_if_needed(timeout=8000)
                await save_btn.click(timeout=20000)
            except Exception:
                await save_btn.click(force=True, timeout=12000)
            await asyncio.sleep(1.0)

        # Xử lý nếu có popup xác nhận sau khi Lưu (VD: Modal hỏi 'Bạn có chắc chắn?')
        try:
            post_modal = page.locator(".ant-modal:has-text('Xác nhận'), .ant-modal:has-text('Bạn có chắc'), .ant-modal:has-text('thành công')").first
            if await post_modal.count() > 0 and await post_modal.is_visible():
                post_btn = post_modal.locator("button:has-text('Xác nhận'), button:has-text('OK'), button:has-text('Đồng ý'), button.ant-btn-primary").first
                if await post_btn.count() > 0:
                    await post_btn.click(force=True)
                    await asyncio.sleep(1.0)
        except Exception:
            pass

        # 6. Kiểm tra kết quả phản hồi thực tế từ GPMS (Toast Thành công / Lỗi)
        success_toast = page.locator('.ant-message-success, .ant-notification-notice-success, div[class*="ant-message"]:has-text("thành công"), div[class*="ant-notification"]:has-text("thành công")').first
        error_toast = page.locator('.ant-message-error, .ant-notification-notice-error, div[class*="ant-message-error"]').first

        ticket_saved = False
        for _ in range(15):
            if await error_toast.count() > 0 and await error_toast.is_visible():
                err_msg = await error_toast.inner_text()
                logger.error(f"[TICKET_BATCH] #{ticket_id}: GPMS báo lỗi khi lưu: {err_msg}")
                raise RuntimeError(f"GPMS báo lỗi: {err_msg}")

            if await success_toast.count() > 0 and await success_toast.is_visible():
                succ_msg = await success_toast.inner_text()
                logger.info(f"[TICKET_BATCH] #{ticket_id}: GPMS xác nhận lưu thành công: {succ_msg}")
                ticket_saved = True
                break
            await asyncio.sleep(1.0)

        if not ticket_saved:
            raise RuntimeError(f"GPMS không trả về xác nhận lưu thành công cho ticket #{ticket_id}")

        # Chờ 3.0s an toàn để API ngầm của GPMS commit dữ liệu vào database trước khi đóng/chuyển tiếp
        await asyncio.sleep(3.0)

        # Cập nhật remaining_hours
        remaining_hours[best_day] = max(0.0, remaining_hours[best_day] - 1.0)

        return {
            "ticket_id": ticket_id,
            "ticket_name": ticket.get("ticket_name", f"Ticket #{ticket_id}"),
            "status": "success",
            "message": f"Đã hoàn thành (Ngày {best_day_display}, {category[:35]}...)",
            "day_used": best_day_display,
            "category_used": category,
            "remaining_after": remaining_hours[best_day],
            "created_by": ticket.get("created_by", "—"),
            "assignee": ticket.get("assignee", "—"),
            "due_date": ticket.get("due_date", "—"),
            "url": url,
            "source_type": "TICKET"
        }
    except Exception as e:
        logger.error(f"[TICKET_BATCH] Lỗi đóng ticket {ticket_id}: {e}")
        import traceback
        tb = traceback.format_exc()
        return {
            "ticket_id": ticket_id,
            "ticket_name": ticket.get("ticket_name", f"Ticket #{ticket_id}"),
            "status": "error",
            "reason": format_friendly_error(e),
            "message": format_friendly_error(e),
            "error_details": f"{type(e).__name__}: {str(e)}\n\nTraceback:\n{tb}",
            "created_by": ticket.get("created_by", "—"),
            "assignee": ticket.get("assignee", "—"),
            "due_date": ticket.get("due_date", "—"),
            "url": url,
            "source_type": "TICKET"
        }


async def preview_tickets() -> Dict[str, Any]:
    """
    Bước 1-4: Login SSO (hoặc tái sử dụng session) → lấy timesheet → lấy danh sách ticket 3CX và nhiệm vụ G-Process.
    Return danh sách ticket & nhiệm vụ để user review trước khi xử lý, đồng thời lưu lịch sử lần quét gần nhất.
    """
    username, password = get_sso_credentials()
    _setup_playwright_browsers_path()
    
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ImportError("Playwright chưa được cài. Chạy: pip install playwright && playwright install chromium")
    
    try:
        async with async_playwright() as p:
            browser, context = await _create_browser_context(p)
            page = await context.new_page()
            
            try:
                await _ensure_logged_in(page, context, username, password)
                timesheet = await _fetch_timesheet_data(page)
                tickets = await _fetch_ticket_list(page, username)
                gprocess_missions = await _fetch_gprocess_mission_list(page, username)
            finally:
                await browser.close()
    except Exception as e:
        if _is_timeout_error(e):
            raise RuntimeError(TIMEOUT_ERROR_MESSAGE)
        if _is_browser_missing_error(e):
            raise RuntimeError(BROWSER_MISSING_MESSAGE)
        raise
    
    all_items = tickets + gprocess_missions
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    history_items = []
    for it in all_items:
        history_items.append({
            "ticket_id": str(it.get("ticket_id", "")),
            "ticket_name": it.get("ticket_name", ""),
            "source_type": it.get("source_type", "TICKET"),
            "created_by": it.get("created_by", "—"),
            "assignee": it.get("assignee", username),
            "due_date": it.get("due_date", "—"),
            "url": it.get("url", ""),
            "status": it.get("status", "Mới mở"),
            "execution_status": "pending",
            "execution_message": "Vừa quét, chưa xử lý",
            "error_details": None,
            "execution_time": None
        })

    history = {
        "last_scanned_at": now_str,
        "last_run_at": None,
        "run_mode": "manual",
        "sso_username": username,
        "total_items": len(history_items),
        "ticket_count": len(tickets),
        "gprocess_count": len(gprocess_missions),
        "timesheet_summary": {
            day: hours for day, hours in sorted(timesheet.items())
        },
        "items": history_items,
        "summary": {
            "status": "scanned",
            "total_processed": 0,
            "success_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "message": f"Quét thủ công: Tìm thấy {len(tickets)} ticket 3CX và {len(gprocess_missions)} nhiệm vụ G-Process ({now_str})"
        }
    }
    save_latest_history(history)

    return {
        "status": "success",
        "sso_username": username,
        "tickets": all_items,
        "total_tickets": len(all_items),
        "ticket_count": len(tickets),
        "gprocess_count": len(gprocess_missions),
        "timesheet_summary": {
            day: hours for day, hours in sorted(timesheet.items())
        },
        "message": f"Tìm thấy {len(tickets)} ticket 3CX và {len(gprocess_missions)} nhiệm vụ G-Process của user '{username}'",
        "last_scanned_at": now_str,
    }


async def _close_gprocess_mission(page, context, mission: Dict[str, Any]) -> Dict[str, Any]:
    """
    Xử lý 1 nhiệm vụ G-Process:
    - Mở chi tiết nhiệm vụ (qua URL trực tiếp hoặc click từ bảng my-mission)
    - Check 'Không đạt' ở ô Phản hồi xác nhận thông tin
    - Điền feedback_message: 'Dear NH, Với xác nhận lỗi hạ tầng NH vui lòng gửi tới huy.ld để được hỗ trợ nhé'
    - Check 'Không phê duyệt' và 'Kết thúc quy trình'
    - Click 'Xác nhận'
    - Xử lý các popup liên tiếp (Xác nhận, Khai báo Timesheet...)
    - Xác thực kết quả thực tế từ GPMS (bắt lỗi nếu có toast lỗi, đợi toast thành công và buffer 3s an toàn)
    """
    mission_id = str(mission.get("ticket_id", "")).strip()
    target_url = mission.get("url") or f"https://gpms.ggg.com.vn/g-process/my-mission/{mission_id}"
    feedback_message = "Dear NH, Với xác nhận lỗi hạ tầng NH vui lòng gửi tới huy.ld để được hỗ trợ nhé"
    
    logger.info(f"[GPROCESS] Bắt đầu xử lý nhiệm vụ G-Process #{mission_id} ({target_url})...")
    detail_page = page
    opened_new_page = False
    
    try:
        # 1. Mở trang chi tiết:
        navigated = False
        if mission_id and mission_id.isdigit():
            try:
                detail_page = await context.new_page()
                opened_new_page = True
                await detail_page.goto(target_url, timeout=120000)
                # Chờ form nhiệm vụ được render đầy đủ
                try:
                    await detail_page.wait_for_selector(
                        'button:has-text("Xác nhận"), label:has-text("Không đạt"), label:has-text("Không phê duyệt"), label:has-text("Phê duyệt")',
                        timeout=40000
                    )
                except Exception:
                    pass
                # Đợi thêm 2.5s để React SPA hoàn tất nạp dữ liệu API và hydrate DOM
                await asyncio.sleep(2.5)
                navigated = True
                logger.info(f"[GPROCESS] Đã vào trực tiếp {target_url}")
            except Exception as direct_err:
                logger.debug(f"[GPROCESS] Goto trực tiếp thất bại, thử click từ danh sách: {direct_err}")
                if opened_new_page:
                    try:
                        await detail_page.close()
                    except Exception:
                        pass
                    opened_new_page = False

        if not navigated:
            await page.goto("https://gpms.ggg.com.vn/g-process/my-mission", timeout=180000)
            await _safe_wait_network_idle(page, 32000)
            await asyncio.sleep(2)
            
            row_span = page.locator(f'tr:has-text("{mission_id}") span:has-text("IT xác nhận lỗi kỹ thuật")').first
            if await row_span.count() == 0:
                row_span = page.locator('tr:has-text("IT xác nhận lỗi kỹ thuật") span:has-text("IT xác nhận lỗi kỹ thuật")').first
            if await row_span.count() == 0:
                row_span = page.locator(':text("IT xác nhận lỗi kỹ thuật")').first
            
            if await row_span.count() > 0:
                async with context.expect_page(timeout=40000) as p_info:
                    await row_span.click()
                detail_page = await p_info.value
                opened_new_page = True
                await asyncio.sleep(2.5)
                logger.info(f"[GPROCESS] Đã mở tab chi tiết nhiệm vụ từ danh sách: {detail_page.url}")
            else:
                raise RuntimeError(f"Không tìm thấy nhiệm vụ #{mission_id} trên trang my-mission")

        # Đặt timeout tối đa 40s cho detail_page để an toàn với mạng chậm
        try:
            detail_page.set_default_timeout(40000)
        except Exception:
            pass

        # Kiểm tra xem nhiệm vụ này đã được kết thúc / đã xử lý trước đó chưa
        # Chỉ coi là đã kết thúc khi bước '02. IT xác nhận lỗi kỹ thuật' trên thanh tiến trình đã chuyển sang 'Hoàn thành'
        # hoặc không còn nút 'Xác nhận' nào trên trang
        is_already_done = False
        try:
            it_step = detail_page.locator('div:has-text("02. IT xác nhận lỗi kỹ thuật"), div:has-text("IT xác nhận lỗi kỹ thuật")').first
            if await it_step.count() > 0:
                step_txt = (await it_step.inner_text()).lower()
                if "hoàn thành" in step_txt and "đang thực hiện" not in step_txt:
                    is_already_done = True
        except Exception:
            pass

        if is_already_done:
            logger.info(f"[GPROCESS] #{mission_id}: Nhiệm vụ IT đã ở trạng thái hoàn thành từ trước.")
            return {
                "ticket_id": mission_id,
                "ticket_name": mission.get("ticket_name", f"G-Process #{mission_id}"),
                "status": "success",
                "source_type": "GPROCESS",
                "type": "gprocess",
                "message": "Nhiệm vụ đã được kết thúc từ trước",
                "created_by": mission.get("created_by", "—"),
                "assignee": mission.get("assignee", "dung.nguyenanh"),
                "due_date": mission.get("due_date", "—"),
                "url": target_url
            }

        # 1.1. KIỂM TRA PHÒNG VỆ TUYỆT ĐỐI (TRƯỚC KHI THAO TÁC FORM):
        # Đảm bảo nhiệm vụ đã được gán ĐÍCH DANH cho dung.nguyenanh.
        # Tuyệt đối KHÔNG tự gán cho dung.nguyenanh nếu nhiệm vụ chưa gán hoặc gán cho người khác!
        target_user = (mission.get("assignee") or "dung.nguyenanh").strip().lower()
        VALID_TARGETS = [target_user, "dung.nguyenanh", "nguyễn anh dũng", "nguyen anh dung"]
        UNASSIGNED_KEYWORDS = [
            "-", "—", "+", "none", "null", "undefined",
            "chưa gán", "chua gan", "chưa phân công", "chua phan cong",
            "chưa tiếp nhận", "chua tiep nhan", "gán người", "gan nguoi",
            "chờ tiếp nhận", "cho tiep nhan"
        ]

        # Kiểm tra 1: Có nút Tiếp nhận / Nhận việc / Claim task trên trang chi tiết không
        claim_btn = detail_page.locator(
            'button:has-text("Tiếp nhận"), button:has-text("Nhận việc"), button:has-text("Tiếp nhận nhiệm vụ"), '
            'button:has-text("Nhận nhiệm vụ"), button:has-text("Claim"), button:has-text("Nhận xử lý")'
        ).first
        if await claim_btn.count() > 0 and await claim_btn.is_visible():
            logger.warning(
                f"[GPROCESS] 🛑 DỪNG XỬ LÝ #{mission_id}: Phát hiện nút Tiếp nhận/Nhận việc. "
                f"Nhiệm vụ này CHƯA ĐƯỢC GÁN cho dung.nguyenanh. Bỏ qua để không tự gán!"
            )
            return {
                "ticket_id": mission_id,
                "ticket_name": mission.get("ticket_name", f"G-Process #{mission_id}"),
                "status": "skipped",
                "source_type": "GPROCESS",
                "type": "gprocess",
                "message": "Nhiệm vụ chưa được gán cho dung.nguyenanh (có nút Tiếp nhận), đã bỏ qua để tránh tự gán",
                "created_by": mission.get("created_by", "—"),
                "assignee": mission.get("assignee", "Chưa gán"),
                "due_date": mission.get("due_date", "—"),
                "url": target_url
            }

        # Kiểm tra 2: Quét thông tin Người thực hiện hiển thị trên trang chi tiết
        assignee_on_page = await detail_page.evaluate("""() => {
            const labels = Array.from(document.querySelectorAll('label, div, span, p, td, th'));
            for (const el of labels) {
                const txt = (el.textContent || '').trim().toLowerCase();
                if (
                    txt === 'người thực hiện:' || txt === 'người thực hiện' ||
                    txt === 'người xử lý:' || txt === 'người xử lý' ||
                    txt === 'cán bộ xử lý:' || txt === 'cán bộ xử lý' ||
                    txt === 'assignee:' || txt === 'assignee' ||
                    txt === 'phân công cho:' || txt === 'phân công cho'
                ) {
                    let valEl = el.nextElementSibling;
                    if (!valEl && el.parentElement) {
                        const sibs = Array.from(el.parentElement.children);
                        const idx = sibs.indexOf(el);
                        if (idx >= 0 && idx + 1 < sibs.length) {
                            valEl = sibs[idx + 1];
                        }
                    }
                    if (valEl) {
                        return (valEl.textContent || '').trim();
                    }
                }
            }
            return null;
        }""")

        if assignee_on_page:
            assignee_lower = assignee_on_page.lower().strip()
            is_unassigned = not assignee_lower or any(pat in assignee_lower for pat in UNASSIGNED_KEYWORDS)
            if is_unassigned:
                logger.warning(
                    f"[GPROCESS] 🛑 DỪNG XỬ LÝ #{mission_id}: Người thực hiện trên trang là '{assignee_on_page}'. "
                    f"Nhiệm vụ này CHƯA ĐƯỢC GÁN cho dung.nguyenanh. Bỏ qua để không tự gán!"
                )
                return {
                    "ticket_id": mission_id,
                    "ticket_name": mission.get("ticket_name", f"G-Process #{mission_id}"),
                    "status": "skipped",
                    "source_type": "GPROCESS",
                    "type": "gprocess",
                    "message": f"Nhiệm vụ chưa được gán cho dung.nguyenanh (Trên trang: '{assignee_on_page}'), đã bỏ qua để tránh tự gán",
                    "created_by": mission.get("created_by", "—"),
                    "assignee": assignee_on_page,
                    "due_date": mission.get("due_date", "—"),
                    "url": target_url
                }

            is_valid_assignee = any(v_tar in assignee_lower for v_tar in VALID_TARGETS)
            if not is_valid_assignee:
                logger.warning(
                    f"[GPROCESS] 🛑 DỪNG XỬ LÝ #{mission_id}: Người thực hiện trên trang là '{assignee_on_page}', không phải dung.nguyenanh. "
                    f"Bỏ qua để không xử lý nhầm nhiệm vụ của người khác!"
                )
                return {
                    "ticket_id": mission_id,
                    "ticket_name": mission.get("ticket_name", f"G-Process #{mission_id}"),
                    "status": "skipped",
                    "source_type": "GPROCESS",
                    "type": "gprocess",
                    "message": f"Nhiệm vụ gán cho '{assignee_on_page}', không phải dung.nguyenanh, đã bỏ qua",
                    "created_by": mission.get("created_by", "—"),
                    "assignee": assignee_on_page,
                    "due_date": mission.get("due_date", "—"),
                    "url": target_url
                }

        # 2. Check vào "Không đạt" ở ô Phản hồi xác nhận thông tin (Checklist)
        kd_selector = 'label:has-text("Không đạt"), label.ant-radio-wrapper:has-text("Không đạt"), :text("Không đạt")'
        try:
            kd_el = detail_page.locator(kd_selector).first
            await kd_el.wait_for(state="visible", timeout=12000)
            await kd_el.scroll_into_view_if_needed(timeout=5000)
            await kd_el.click(timeout=8000)
            logger.info(f"[GPROCESS] #{mission_id}: Đã click 'Không đạt' qua locator.")
        except Exception as kd_click_err:
            logger.warning(f"[GPROCESS] #{mission_id}: Click 'Không đạt' trực tiếp: {kd_click_err}")

        # Đồng bộ React state chọn 'Không đạt'
        await detail_page.evaluate("""() => {
            const labels = Array.from(document.querySelectorAll('label, div[class*="radio"]'));
            const kd = labels.find(el => el.textContent && el.textContent.trim().includes('Không đạt'));
            if (kd) {
                kd.click();
                const inp = kd.querySelector('input[type="radio"], input');
                if (inp) {
                    inp.checked = true;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }""")
        await asyncio.sleep(0.5)

        # 3. Nhập nội dung phản hồi vào textarea còn hiệu lực (không disabled / readonly)
        active_tas = detail_page.locator('textarea:not([disabled]):not([readonly])')
        try:
            if await active_tas.count() > 0:
                ta = active_tas.first
                await ta.scroll_into_view_if_needed(timeout=5000)
                await ta.click()
                await ta.fill(feedback_message)
                await ta.evaluate("""(el, msg) => {
                    el.value = msg;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }""", feedback_message)
                logger.info(f"[GPROCESS] #{mission_id}: Đã điền nội dung phản hồi.")
                await asyncio.sleep(0.3)
        except Exception as ta_err:
            logger.warning(f"[GPROCESS] #{mission_id}: Điền textarea: {ta_err}")

        # 4. Ở mục THỰC HIỆN: Click "Không phê duyệt"
        kpd_selector = 'label:has-text("Không phê duyệt"), div[class*="unapprovedItem"] label, :text("Không phê duyệt")'
        try:
            kpd_el = detail_page.locator(kpd_selector).first
            await kpd_el.wait_for(state="visible", timeout=12000)
            await kpd_el.scroll_into_view_if_needed(timeout=5000)
            await kpd_el.click(timeout=8000)
            logger.info(f"[GPROCESS] #{mission_id}: Đã chọn 'Không phê duyệt'.")
        except Exception as kpd_err:
            logger.warning(f"[GPROCESS] #{mission_id}: Click 'Không phê duyệt': {kpd_err}")

        # Đồng bộ React state chọn 'Không phê duyệt'
        await detail_page.evaluate("""() => {
            const labels = Array.from(document.querySelectorAll('label, div[class*="radio"]'));
            const kpd = labels.find(el => el.textContent && el.textContent.trim().includes('Không phê duyệt'));
            if (kpd) {
                kpd.click();
                const inp = kpd.querySelector('input[type="radio"], input');
                if (inp) {
                    inp.checked = true;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }""")
        await asyncio.sleep(0.6)

        # BẮT BUỘC: Chọn 'Kết thúc quy trình', tuyệt đối không để rơi vào 'Quay lại'
        kt_selector = 'label:has-text("Kết thúc quy trình"), div[class*="radioWrapper"]:has-text("Kết thúc quy trình") label, label[title="Kết thúc quy trình"], :text("Kết thúc quy trình")'
        try:
            kt_radio = detail_page.locator(kt_selector).first
            await kt_radio.wait_for(state="visible", timeout=10000)
            await kt_radio.scroll_into_view_if_needed(timeout=5000)
            await kt_radio.click(timeout=8000)
            logger.info(f"[GPROCESS] #{mission_id}: Đã click 'Kết thúc quy trình'.")
        except Exception as kt_err:
            logger.warning(f"[GPROCESS] #{mission_id}: Chờ/click 'Kết thúc quy trình': {kt_err}")

        # Đảm bảo 'Kết thúc quy trình' được tick chuẩn trong React state
        await detail_page.evaluate("""() => {
            const labels = Array.from(document.querySelectorAll('label, div[class*="radio"]'));
            const kt = labels.find(l => l.textContent && l.textContent.trim().includes('Kết thúc quy trình'));
            if (kt) {
                kt.click();
                const inp = kt.querySelector('input[type="radio"], input');
                if (inp) {
                    inp.checked = true;
                    inp.dispatchEvent(new Event('input', { bubbles: true }));
                    inp.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        }""")
        await asyncio.sleep(0.5)
        logger.info(f"[GPROCESS] #{mission_id}: Đã chọn chính xác 'Kết thúc quy trình'.")

        # 5. Bấm nút "Xác nhận" ở cuối form
        confirm_btn = detail_page.locator('button:has-text("Xác nhận"):not([disabled]), button[type="submit"]:has-text("Xác nhận"):not([disabled]), .ant-btn-primary:has-text("Xác nhận")').last
        await confirm_btn.wait_for(state="visible", timeout=12000)
        await confirm_btn.scroll_into_view_if_needed(timeout=5000)
        await confirm_btn.click(timeout=10000)
        logger.info(f"[GPROCESS] #{mission_id}: Đã bấm nút 'Xác nhận' trên form.")
        await asyncio.sleep(1.0)

        # 6. Vòng lặp xử lý tất cả các popup liên tiếp (Modal xác nhận, Modal Timesheet...)
        for modal_step in range(5):
            await asyncio.sleep(0.8)
            visible_modal = detail_page.locator('.ant-modal:visible, #container-portal div[class*="modal"]:visible, .ant-modal-content:visible').first
            if await visible_modal.count() == 0 or not await visible_modal.is_visible():
                break

            modal_text = ""
            try:
                modal_text = (await visible_modal.inner_text()).lower()
            except Exception:
                pass
            logger.info(f"[GPROCESS] #{mission_id} (modal step {modal_step+1}): Phát hiện modal: {modal_text[:100]}...")

            # TH 6.1: Modal Timesheet (QUY TẮC BẮT BUỘC: KHÔNG khai báo timesheet cho G-Process, để Tổng thời gian HTTT = 0)
            time_inputs = visible_modal.locator('input[name*="actual_time"], input[name*="time"], input[name*="hour"], input[type="number"]')
            has_time_input = await time_inputs.count() > 0
            if "timesheet" in modal_text or "thời gian" in modal_text or "khai báo" in modal_text or has_time_input:
                logger.info(f"[GPROCESS] #{mission_id}: Phát hiện popup Khai báo Timesheet -> Để thời gian HTTT là 0 (KHÔNG khai báo timesheet cho G-Process).")

                # Cập nhật các hàng trong bảng Timesheet:
                # - Số lần/Số SP: 1
                # - Tổng thời gian HTTT: 0 (BẮT BUỘC = 0 theo yêu cầu)
                # - Ghi chú: '-'
                try:
                    await visible_modal.evaluate("""(modal) => {
                        const rows = modal.querySelectorAll('tbody tr, .ant-table-row, div[class*="row"]');
                        if (rows && rows.length > 0) {
                            rows.forEach(r => {
                                const inputs = r.querySelectorAll('input:not([type="hidden"])');
                                if (inputs.length >= 3) {
                                    // inputs[0]: Ngày thực hiện
                                    // inputs[1]: Số lần / Số SP đã thực hiện (mặc định 1)
                                    if (!inputs[1].value || inputs[1].value.trim() === '') {
                                        inputs[1].value = '1';
                                        inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                                        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
                                    }
                                    // inputs[2]: Tổng thời gian HTTT -> BẮT BUỘC ĐỂ 0
                                    inputs[2].value = '0';
                                    inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
                                    inputs[2].dispatchEvent(new Event('change', { bubbles: true }));

                                    // inputs[3]: Ghi chú -> để '-' nếu rỗng
                                    if (inputs.length >= 4) {
                                        if (!inputs[3].value || inputs[3].value.trim() === '') {
                                            inputs[3].value = '-';
                                            inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
                                            inputs[3].dispatchEvent(new Event('change', { bubbles: true }));
                                        }
                                    }
                                }
                            });
                        }
                        // Quét phòng ngừa tất cả các ô input thời gian / time / hour để chắc chắn 100% mang giá trị 0
                        const allInps = modal.querySelectorAll('input:not([type="hidden"])');
                        allInps.forEach(inp => {
                            const name = (inp.getAttribute('name') || '').toLowerCase();
                            const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
                            if (name.includes('time') || name.includes('hour') || name.includes('actual') ||
                                placeholder.includes('thời gian') || placeholder.includes('time')) {
                                inp.value = '0';
                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        });
                    }""")
                    await asyncio.sleep(0.3)
                except Exception as eval_err:
                    logger.debug(f"[GPROCESS] #{mission_id}: Evaluate Timesheet rows: {eval_err}")

                # Quét lại qua Playwright locators để đồng bộ giá trị '0' vào các ô thời gian
                for t_idx in range(await time_inputs.count()):
                    try:
                        t_inp = time_inputs.nth(t_idx)
                        name_attr = (await t_inp.get_attribute("name") or "").lower()
                        # Không đè lên ô số lần / số lượng
                        if any(k in name_attr for k in ["quantity", "count", "so_lan", "solan", "sp"]):
                            continue
                        await t_inp.fill('0')
                        await asyncio.sleep(0.05)
                    except Exception:
                        pass

                # Ghi chú: Điền '-' nếu rỗng
                note_inputs = visible_modal.locator('input[name*="note"], textarea[name*="note"], input[placeholder*="Ghi chú"], textarea')
                for n_idx in range(await note_inputs.count()):
                    try:
                        n_inp = note_inputs.nth(n_idx)
                        n_val = await n_inp.input_value()
                        if not n_val or n_val.strip() == "":
                            await n_inp.fill('-')
                            await asyncio.sleep(0.05)
                    except Exception:
                        pass

                # Bấm nút "Lưu" (nút màu vàng ở góc dưới bên phải modal Timesheet)
                save_btn = visible_modal.locator('button:has-text("Lưu"), button.ant-btn-primary:has-text("Lưu"), button:has-text("Xác nhận"), button:has-text("Đồng ý")').first
                if await save_btn.count() > 0:
                    await save_btn.click(timeout=15000)
                    logger.info(f"[GPROCESS] #{mission_id}: Đã bấm nút 'Lưu' Timesheet (Tổng thời gian HTTT = 0).")
                    await asyncio.sleep(1.2)
                continue

            # TH 6.2: Modal Xác nhận / Đồng ý kết thúc
            confirm_modal_btn = visible_modal.locator('button:has-text("Đồng ý"), button:has-text("Xác nhận"), button:has-text("OK"), button.ant-btn-primary').first
            if await confirm_modal_btn.count() > 0:
                btn_txt = await confirm_modal_btn.inner_text()
                logger.info(f"[GPROCESS] #{mission_id}: Bấm xác nhận trên popup ('{btn_txt}').")
                await confirm_modal_btn.click(timeout=15000)
                await asyncio.sleep(1.2)
                continue

        # 7. Kiểm tra kết quả phản hồi thực tế từ GPMS (Toast Thành công / Lỗi hoặc Chuyển trang) - CHỐNG BÁO THÀNH CÔNG ẢO
        success_toast = detail_page.locator('.ant-message-success, .ant-notification-notice-success, div[class*="ant-message"]:has-text("thành công"), div[class*="ant-notification"]:has-text("thành công")').first
        error_toast = detail_page.locator('.ant-message-error, .ant-notification-notice-error, div[class*="ant-message-error"]').first

        is_success = False
        for _ in range(15):
            if await error_toast.count() > 0 and await error_toast.is_visible():
                err_msg = await error_toast.inner_text()
                logger.error(f"[GPROCESS] #{mission_id}: GPMS trả về thông báo lỗi: {err_msg}")
                raise RuntimeError(f"GPMS báo lỗi: {err_msg}")

            if await success_toast.count() > 0 and await success_toast.is_visible():
                succ_msg = await success_toast.inner_text()
                logger.info(f"[GPROCESS] #{mission_id}: GPMS xác nhận thành công: {succ_msg}")
                is_success = True
                break

            # Kiểm tra xem GPMS có chuyển hướng khỏi trang chi tiết sau khi đóng thành công không
            curr_url = detail_page.url
            if "my-mission" in curr_url and mission_id not in curr_url:
                logger.info(f"[GPROCESS] #{mission_id}: GPMS đã tự động chuyển hướng về danh sách.")
                is_success = True
                break

            await asyncio.sleep(1.0)

        if not is_success:
            # KIỂM TRA PHÒNG VỆ: Nếu không thấy toast và không redirect, kiểm tra xem nút 'Xác nhận' còn tồn tại không
            try:
                confirm_still_there = detail_page.locator('button:has-text("Xác nhận"):not([disabled])')
                if await confirm_still_there.count() == 0:
                    is_success = True
                    logger.info(f"[GPROCESS] #{mission_id}: Nút Xác nhận đã biến mất khỏi form, ghi nhận thành công.")
            except Exception:
                pass

        if not is_success:
            raise RuntimeError("GPMS không trả về thông báo thành công sau khi bấm Xác nhận (Form chưa được lưu hoặc có trường bắt buộc chưa điền)")

        # Chờ 3.0s an toàn để API ngầm của GPMS hoàn tất ghi nhận vào cơ sở dữ liệu
        await asyncio.sleep(3.0)

        logger.info(f"[GPROCESS] ✅ Hoàn tất đóng nhiệm vụ G-Process: #{mission_id}")
        return {
            "ticket_id": mission_id,
            "ticket_name": mission.get("ticket_name", f"G-Process #{mission_id}"),
            "status": "success",
            "source_type": "GPROCESS",
            "type": "gprocess",
            "message": "Đã phản hồi 'Không đạt' & kết thúc quy trình",
            "created_by": mission.get("created_by", "—"),
            "assignee": mission.get("assignee", "dung.nguyenanh"),
            "due_date": mission.get("due_date", "—"),
            "url": mission.get("url", f"https://gpms.ggg.com.vn/g-process/my-mission/{mission_id}")
        }
    except Exception as e:
        logger.error(f"[GPROCESS] ❌ Lỗi xử lý G-Process #{mission_id}: {e}")
        import traceback
        tb = traceback.format_exc()
        return {
            "ticket_id": mission_id,
            "ticket_name": mission.get("ticket_name", f"G-Process #{mission_id}"),
            "status": "error",
            "source_type": "GPROCESS",
            "type": "gprocess",
            "message": format_friendly_error(e),
            "reason": format_friendly_error(e),
            "error_details": f"{type(e).__name__}: {str(e)}\n\nTraceback:\n{tb}",
            "created_by": mission.get("created_by", "—"),
            "assignee": mission.get("assignee", "dung.nguyenanh"),
            "due_date": mission.get("due_date", "—"),
            "url": mission.get("url", f"https://gpms.ggg.com.vn/g-process/my-mission/{mission_id}")
        }
    finally:
        if opened_new_page and detail_page != page:
            try:
                await detail_page.close()
            except Exception:
                pass


async def run_batch_close(
    ticket_ids_to_process: List[str],
    all_tickets: List[Dict[str, Any]],
    timesheet_data: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Bước 5-6: Thực hiện đóng các ticket 3CX và nhiệm vụ G-Process đã chọn trong cùng 1 browser session (không login lại nhiều lần).
    Bao bọc cơ chế tự phục hồi và error boundary chặt chẽ cho từng item, tránh lỗi 500 khi xử lý số lượng lớn (10+ mục).
    """
    username, password = get_sso_credentials()
    _setup_playwright_browsers_path()
    
    # Lọc chỉ lấy ticket/nhiệm vụ đã chọn
    selected_set = {str(x).strip() for x in ticket_ids_to_process}
    tickets_to_close = [t for t in all_tickets if str(t.get("ticket_id", "")).strip() in selected_set]
    
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ImportError("Playwright chưa được cài. Chạy: pip install playwright && playwright install chromium")
    
    start_time = datetime.now()
    results = []
    
    try:
        async with async_playwright() as p:
            browser, context = await _create_browser_context(p)
            page = await context.new_page()
            
            try:
                # Tái sử dụng session hoặc login duy nhất 1 lần
                await _ensure_logged_in(page, context, username, password)
                
                # Lấy timesheet nếu chưa có
                if not timesheet_data:
                    timesheet_data = await _fetch_timesheet_data(page)
                
                # Copy để không làm hỏng dữ liệu gốc
                remaining_hours = dict(timesheet_data)
                
                # Xử lý tất cả ticket / G-process trên cùng 1 browser session
                for idx, item in enumerate(tickets_to_close):
                    item_id = str(item.get("ticket_id", "")).strip()
                    try:
                        # Tự phục hồi browser / context / page nếu bị rớt giữa chừng
                        if browser is None or not browser.is_connected():
                            logger.warning("[TICKET_BATCH] Trình duyệt bị ngắt kết nối, đang khởi động lại...")
                            browser, context = await _create_browser_context(p)
                            page = await context.new_page()
                            await _ensure_logged_in(page, context, username, password)

                        if context is None:
                            logger.warning("[TICKET_BATCH] Browser context bị mất, đang tạo lại...")
                            _, context = await _create_browser_context(p)
                            page = await context.new_page()
                            await _ensure_logged_in(page, context, username, password)

                        if page is None or page.is_closed():
                            logger.warning("[TICKET_BATCH] Trang chính đã đóng, đang tạo trang mới...")
                            page = await context.new_page()

                        if item.get("source_type") == "GPROCESS":
                            logger.info(f"[TICKET_BATCH] Xử lý G-Process ({idx+1}/{len(tickets_to_close)}): #{item_id}")
                            result = await _close_gprocess_mission(page, context, item)
                        else:
                            logger.info(f"[TICKET_BATCH] Xử lý ticket 3CX ({idx+1}/{len(tickets_to_close)}): #{item_id}")
                            result = await _close_ticket(page, item, idx, remaining_hours)

                    except Exception as item_err:
                        logger.error(f"[TICKET_BATCH] Lỗi ngoại lệ khi xử lý mục #{item_id}: {item_err}", exc_info=True)
                        import traceback
                        tb = traceback.format_exc()
                        result = {
                            "ticket_id": item_id,
                            "ticket_name": item.get("ticket_name", f"Mục #{item_id}"),
                            "status": "error",
                            "source_type": item.get("source_type", "TICKET"),
                            "type": item.get("type", "ticket"),
                            "message": format_friendly_error(item_err),
                            "reason": format_friendly_error(item_err),
                            "error_details": f"{type(item_err).__name__}: {str(item_err)}\n\nTraceback:\n{tb}",
                            "created_by": item.get("created_by", "—"),
                            "assignee": item.get("assignee", username),
                            "due_date": item.get("due_date", "—"),
                            "url": item.get("url", "")
                        }

                    results.append(result)
                    await asyncio.sleep(0.5)  # Nghỉ nhẹ 0.5s giữa các mục
            finally:
                if browser:
                    try:
                        await browser.close()
                    except Exception:
                        pass
    except Exception as e:
        if _is_timeout_error(e):
            raise RuntimeError(TIMEOUT_ERROR_MESSAGE)
        if _is_browser_missing_error(e):
            raise RuntimeError(BROWSER_MISSING_MESSAGE)
        raise
    
    duration = round((datetime.now() - start_time).total_seconds(), 2)
    success_count = sum(1 for r in results if r.get("status") == "success")
    failed_count = sum(1 for r in results if r.get("status") == "error")
    skipped_count = sum(1 for r in results if r.get("status") == "skipped")
    
    # Gửi email kết quả
    cfg = load_config()
    email_recipients_str = (cfg.get("email_recipients") or "").strip()
    if not email_recipients_str:
        try:
            from app.services.job_scheduler_service import job_scheduler_service
            job = job_scheduler_service._jobs.get("job_ticket_batch_by_category", {})
            email_recipients_str = (job.get("email_recipients") or "").strip()
        except Exception:
            pass
    email_sent = False
    if email_recipients_str and tickets_to_close:
        recipients = [e.strip() for e in email_recipients_str.split(",") if e.strip()]
        if recipients:
            try:
                await asyncio.to_thread(_send_result_email, results, tickets_to_close, recipients)
                email_sent = True
            except Exception as mail_err:
                logger.error(f"[TICKET_BATCH] Lỗi gửi email: {mail_err}")
    
    # Cập nhật config last run
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cfg["last_run_at"] = now_str
    cfg["last_run_status"] = "success" if failed_count == 0 else "partial"
    save_config(cfg)
    
    # Cập nhật latest history với kết quả thực thi
    try:
        latest = load_latest_history() or {
            "last_scanned_at": now_str,
            "run_mode": "manual",
            "sso_username": username,
            "items": [],
            "total_items": 0,
            "ticket_count": 0,
            "gprocess_count": 0,
        }
        res_map = {str(r.get("ticket_id")): r for r in results}
        existing_items = latest.get("items", [])
        updated_ids = set()
        for it in existing_items:
            t_id = str(it.get("ticket_id", ""))
            if t_id in res_map:
                r = res_map[t_id]
                st = r.get("status")
                it["execution_status"] = "success" if st == "success" else ("failed" if st == "error" else "skipped")
                it["execution_message"] = r.get("message") or r.get("reason") or ("Thành công" if st == "success" else "Lỗi")
                it["error_details"] = r.get("error_details")
                it["execution_time"] = now_str
                updated_ids.add(t_id)

        for r in results:
            t_id = str(r.get("ticket_id", ""))
            if t_id not in updated_ids:
                st = r.get("status")
                matching_source = next((t for t in all_tickets if str(t.get("ticket_id", "")) == t_id), {})
                existing_items.append({
                    "ticket_id": t_id,
                    "ticket_name": r.get("ticket_name") or matching_source.get("ticket_name", f"Mục #{t_id}"),
                    "source_type": r.get("source_type") or matching_source.get("source_type", "TICKET"),
                    "created_by": r.get("created_by") or matching_source.get("created_by", "—"),
                    "assignee": r.get("assignee") or matching_source.get("assignee", username),
                    "due_date": r.get("due_date") or matching_source.get("due_date", "—"),
                    "url": r.get("url") or matching_source.get("url", ""),
                    "status": matching_source.get("status", "Đã xử lý"),
                    "execution_status": "success" if st == "success" else ("failed" if st == "error" else "skipped"),
                    "execution_message": r.get("message") or r.get("reason") or ("Thành công" if st == "success" else "Lỗi"),
                    "error_details": r.get("error_details"),
                    "execution_time": now_str
                })

        latest["items"] = existing_items
        latest["total_items"] = len(existing_items)
        latest["last_run_at"] = now_str
        latest["run_mode"] = "manual"
        latest["summary"] = {
            "status": "completed",
            "total_processed": len(tickets_to_close),
            "success_count": success_count,
            "failed_count": failed_count,
            "skipped_count": skipped_count,
            "message": f"Chạy thủ công: Đã xử lý {len(tickets_to_close)} mục ({duration}s). Thành công: {success_count}, Thất bại: {failed_count}, Bỏ qua: {skipped_count}."
        }
        save_latest_history(latest)
    except Exception as hist_err:
        logger.warning(f"[TICKET_BATCH] Lỗi lưu latest history sau khi chạy manual: {hist_err}")
    
    return {
        "status": "success",
        "duration_seconds": duration,
        "total_processed": len(tickets_to_close),
        "success_count": success_count,
        "failed_count": failed_count,
        "skipped_count": skipped_count,
        "results": results,
        "email_sent": email_sent,
        "message": (
            f"Hoàn tất xử lý {len(tickets_to_close)} mục trong {duration}s. "
            f"Thành công: {success_count}, Lỗi: {failed_count}, Bỏ qua: {skipped_count}."
        )
    }


async def process_gprocess_missions(page, context=None) -> List[Dict[str, Any]]:
    """
    Tự động quét và xử lý các nhiệm vụ G-Process sau khi hoàn tất đóng ticket 3CX.
    """
    gprocess_results = []
    username, _ = get_sso_credentials()
    missions = await _fetch_gprocess_mission_list(page, username)
    for m in missions:
        res = await _close_gprocess_mission(page, context or page.context, m)
        gprocess_results.append(res)
        await asyncio.sleep(1)
    return gprocess_results



async def run_full_batch_pipeline() -> Dict[str, Any]:
    """
    Quy trình tự động đóng ticket 3CX và xử lý G-Process trong 1 phiên duyệt duy nhất (Cron/Scheduler):
    - Khởi tạo 1 Browser context duy nhất
    - Đăng nhập SSO duy nhất 1 lần (hoặc tái sử dụng session cache)
    - Tự động lấy timesheet & danh sách ticket 3CX
    - Xử lý đóng lần lượt từng ticket 3CX trên cùng 1 trang
    - Tự động qua link gprocess https://gpms.ggg.com.vn/g-process/my-mission:
        + Lọc nhiệm vụ 'IT xác nhận lỗi kỹ thuật' & người thực hiện 'dung.nguyenanh'
        + Đánh dấu 'Không đạt', nhập ghi chú hỗ trợ, chọn 'Kết thúc quy trình'
        + Lưu khai báo timesheet và xác nhận hoàn tất
    - Gửi email thông báo tổng hợp (gồm cả Ticket và G-Process)
    - Đóng browser
    """
    username, password = get_sso_credentials()
    _setup_playwright_browsers_path()
    
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise ImportError("Playwright chưa được cài. Chạy: pip install playwright && playwright install chromium")
    
    start_time = datetime.now()
    results = []
    tickets = []
    gprocess_results = []
    
    try:
        async with async_playwright() as p:
            browser, context = await _create_browser_context(p)
            page = await context.new_page()
            
            try:
                # 1. Đăng nhập 1 lần duy nhất (hoặc tái sử dụng session)
                await _ensure_logged_in(page, context, username, password)
                
                # 2. Lấy timesheet
                timesheet_data = await _fetch_timesheet_data(page)
                remaining_hours = dict(timesheet_data)
                
                # 3. Lấy danh sách ticket 3CX
                tickets = await _fetch_ticket_list(page, username)
                
                # 4. Đóng lần lượt từng ticket 3CX trên cùng phiên làm việc
                if tickets:
                    for idx, ticket in enumerate(tickets):
                        logger.info(f"[TICKET_BATCH] Xử lý ticket {idx+1}/{len(tickets)}: #{ticket['ticket_id']}")
                        result = await _close_ticket(page, ticket, idx, remaining_hours)
                        results.append(result)
                        await asyncio.sleep(1)
                else:
                    logger.info(f"[TICKET_BATCH] Không có ticket 3CX nào cần đóng cho user '{username}'.")
                
                # 5. Xử lý các nhiệm vụ G-Process (IT xác nhận lỗi kỹ thuật của dung.nguyenanh)
                gprocess_results = await process_gprocess_missions(page, context)
                for gp in gprocess_results:
                    results.append(gp)

                
                if not tickets and not gprocess_results:
                    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    try:
                        save_latest_history({
                            "last_scanned_at": now_str,
                            "last_run_at": now_str,
                            "run_mode": "auto",
                            "sso_username": username,
                            "total_items": 0,
                            "ticket_count": 0,
                            "gprocess_count": 0,
                            "timesheet_summary": {
                                day: hours for day, hours in sorted(timesheet_data.items())
                            } if timesheet_data else {},
                            "items": [],
                            "summary": {
                                "status": "completed",
                                "total_processed": 0,
                                "success_count": 0,
                                "failed_count": 0,
                                "skipped_count": 0,
                                "message": f"Chạy tự động (Cron): Không có ticket 3CX hay nhiệm vụ G-Process nào cần xử lý ({now_str})."
                            }
                        })
                    except Exception:
                        pass
                    return {
                        "status": "success",
                        "total_processed": 0,
                        "ticket_processed": 0,
                        "gprocess_processed": 0,
                        "success_count": 0,
                        "failed_count": 0,
                        "skipped_count": 0,
                        "results": [],
                        "email_sent": False,
                        "message": f"Không có ticket 3CX hay nhiệm vụ G-Process nào cần xử lý cho user '{username}'."
                    }
            finally:
                await browser.close()
    except Exception as e:
        if _is_timeout_error(e):
            raise RuntimeError(TIMEOUT_ERROR_MESSAGE)
        if _is_browser_missing_error(e):
            raise RuntimeError(BROWSER_MISSING_MESSAGE)
        raise
    
    duration = round((datetime.now() - start_time).total_seconds(), 2)
    ticket_count = len(tickets) if tickets else 0
    gp_count = len(gprocess_results) if gprocess_results else 0
    total_processed = ticket_count + gp_count
    
    success_count = sum(1 for r in results if r.get("status") == "success")
    failed_count = sum(1 for r in results if r.get("status") == "error")
    skipped_count = sum(1 for r in results if r.get("status") == "skipped")
    
    # 6. Gửi email kết quả
    cfg = load_config()
    email_recipients_str = (cfg.get("email_recipients") or "").strip()
    if not email_recipients_str:
        try:
            from app.services.job_scheduler_service import job_scheduler_service
            job = job_scheduler_service._jobs.get("job_ticket_batch_by_category", {})
            email_recipients_str = (job.get("email_recipients") or "").strip()
        except Exception:
            pass
            
    email_sent = False
    if email_recipients_str and results:
        recipients = [e.strip() for e in email_recipients_str.split(",") if e.strip()]
        if recipients:
            try:
                await asyncio.to_thread(_send_result_email, results, tickets, recipients)
                email_sent = True
            except Exception as mail_err:
                logger.error(f"[TICKET_BATCH] Lỗi gửi email: {mail_err}")
    
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cfg["last_run_at"] = now_str
    cfg["last_run_status"] = "success" if failed_count == 0 else "partial"
    save_config(cfg)

    # Lưu lịch sử lần chạy tự động gần nhất
    try:
        auto_items = []
        res_map = {str(r.get("ticket_id")): r for r in results}
        
        if tickets:
            for t in tickets:
                t_id = str(t.get("ticket_id", ""))
                r = res_map.get(t_id, {})
                st = r.get("status")
                auto_items.append({
                    "ticket_id": t_id,
                    "ticket_name": t.get("ticket_name", f"Ticket #{t_id}"),
                    "source_type": "TICKET",
                    "created_by": t.get("created_by", "—"),
                    "assignee": t.get("assignee", username),
                    "due_date": t.get("due_date", "—"),
                    "url": t.get("url", f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={t_id}"),
                    "status": t.get("status", "Mới mở"),
                    "execution_status": "success" if st == "success" else ("failed" if st == "error" else ("skipped" if st == "skipped" else "pending")),
                    "execution_message": r.get("message") or r.get("reason") or ("Thành công" if st == "success" else "Chưa xử lý"),
                    "error_details": r.get("error_details"),
                    "execution_time": now_str if st else None
                })
                
        if gprocess_results:
            for gp in gprocess_results:
                gp_id = str(gp.get("ticket_id", ""))
                st = gp.get("status")
                auto_items.append({
                    "ticket_id": gp_id,
                    "ticket_name": gp.get("ticket_name", f"G-Process #{gp_id}"),
                    "source_type": "GPROCESS",
                    "created_by": gp.get("created_by", "—"),
                    "assignee": gp.get("assignee", username),
                    "due_date": gp.get("due_date", "—"),
                    "url": gp.get("url", f"https://gpms.ggg.com.vn/g-process/my-mission/{gp_id}"),
                    "status": "Đang thực hiện",
                    "execution_status": "success" if st == "success" else ("failed" if st == "error" else "skipped"),
                    "execution_message": gp.get("message") or gp.get("reason") or ("Thành công" if st == "success" else "Lỗi"),
                    "error_details": gp.get("error_details"),
                    "execution_time": now_str
                })
                
        auto_history = {
            "last_scanned_at": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "last_run_at": now_str,
            "run_mode": "auto",
            "sso_username": username,
            "total_items": len(auto_items),
            "ticket_count": len(tickets) if tickets else 0,
            "gprocess_count": len(gprocess_results) if gprocess_results else 0,
            "timesheet_summary": {
                day: hours for day, hours in sorted(timesheet_data.items())
            } if 'timesheet_data' in locals() and timesheet_data else {},
            "items": auto_items,
            "summary": {
                "status": "completed",
                "total_processed": total_processed,
                "success_count": success_count,
                "failed_count": failed_count,
                "skipped_count": skipped_count,
                "message": f"Chạy tự động (Cron): Đã xử lý {total_processed} mục ({duration}s). Thành công: {success_count}, Thất bại: {failed_count}, Bỏ qua: {skipped_count}."
            }
        }
        save_latest_history(auto_history)
    except Exception as auto_hist_err:
        logger.warning(f"[TICKET_BATCH] Lỗi lưu latest history trong auto pipeline: {auto_hist_err}")
    
    summary_msg = f"Hoàn tất: Đã đóng {ticket_count} ticket 3CX và xử lý {gp_count} nhiệm vụ G-Process ({duration}s). Thành công: {success_count}, Lỗi: {failed_count}."
    return {
        "status": "success",
        "duration_seconds": duration,
        "total_processed": total_processed,
        "ticket_processed": ticket_count,
        "gprocess_processed": gp_count,
        "success_count": success_count,
        "failed_count": failed_count,
        "skipped_count": skipped_count,
        "results": results,
        "email_sent": email_sent,
        "message": summary_msg
    }


def _send_result_email(results: List[Dict], tickets: List[Dict], recipients: List[str]) -> None:
    """Gửi email thông báo kết quả đóng ticket 3CX & xử lý G-Process."""
    import smtplib, ssl
    from email.message import EmailMessage
    
    today_str = datetime.now().strftime("%d/%m/%Y")
    
    all_display_items = []
    seen_ids = set()

    # 1. Lấy danh sách từ tickets (gồm cả Ticket 3CX và G-Process nếu chạy thủ công qua modal)
    for t in tickets:
        tid = str(t.get("ticket_id", "")).strip()
        if not tid:
            continue
        seen_ids.add(tid)
        
        is_gp = (t.get("source_type") == "GPROCESS" or t.get("type") == "gprocess")
        r = next((x for x in results if str(x.get("ticket_id", "")).strip() == tid), {})
        
        all_display_items.append({
            "type": "GPROCESS" if is_gp else "TICKET",
            "id": tid,
            "title": t.get("ticket_name", r.get("ticket_name", "")),
            "assignee": t.get("assignee", r.get("assignee", "dung.nguyenanh")),
            "creator": t.get("created_by", r.get("created_by", "—")),
            "due_date": t.get("due_date", r.get("due_date", "—")),
            "status": r.get("status", "unknown"),
            "msg": r.get("message", "")
        })
        
    # 2. Bổ sung các kết quả trong results chưa có trong tickets (ví dụ nhiệm vụ G-Process từ batch tự động)
    for r in results:
        rid = str(r.get("ticket_id", "")).strip()
        if not rid or rid in seen_ids:
            continue
        seen_ids.add(rid)
        
        is_gp = (r.get("source_type") == "GPROCESS" or r.get("type") == "gprocess")
        all_display_items.append({
            "type": "GPROCESS" if is_gp else "TICKET",
            "id": rid,
            "title": r.get("ticket_name", f"Nhiệm vụ #{rid}"),
            "assignee": r.get("assignee", "dung.nguyenanh"),
            "creator": r.get("created_by", "—"),
            "due_date": r.get("due_date", "—"),
            "status": r.get("status", "unknown"),
            "msg": r.get("message", "Đã kết thúc quy trình")
        })

    rows_html = ""
    for i, it in enumerate(all_display_items):
        status = it["status"]
        status_color = "#16A34A" if status == "success" else "#DC2626" if status == "error" else "#9CA3AF"
        status_label = "✅ Thành công" if status == "success" else "❌ Lỗi" if status == "error" else "⏭️ Bỏ qua"
        type_badge = '<span style="background:#EDE9FE;color:#6D28D9;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #DDD6FE">⚙️ G-Process</span>' if it["type"] == "GPROCESS" else '<span style="background:#EFF6FF;color:#1D4ED8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #BFDBFE">🎫 Ticket 3CX</span>'
        bg = "#FFFFFF" if i % 2 == 0 else "#F9FAFB"
        rows_html += f"""
        <tr style="background-color:{bg}">
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:11px;text-align:center">{type_badge}</td>
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:12px;font-weight:bold">{it['id']}</td>
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:12px">{it['title'][:80]}</td>
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:12px">{it['assignee']}</td>
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:12px">{it['creator']}</td>
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:12px">{it['due_date']}</td>
            <td style="border:1px solid #E5E7EB;padding:8px;font-size:12px;color:{status_color};font-weight:bold">{status_label}</td>
        </tr>"""
    
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Segoe UI,Arial;">
    <div style="max-width:960px;margin:0 auto;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
        <div style="background:#111827;padding:16px 20px;color:#F5B800;font-size:16px;font-weight:bold">
            Báo Cáo Xử Lý Ticket 3CX & Nhiệm Vụ G-Process ({today_str})
        </div>
        <div style="padding:20px">
            <table style="width:100%;border-collapse:collapse">
                <thead>
                    <tr style="background:#1F2937;color:#F9FAFB">
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:center;width:95px">Phân loại</th>
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:left;width:80px">Mã</th>
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:left">Tên nhiệm vụ / Yêu cầu</th>
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:left;width:120px">Người xử lý</th>
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:left;width:120px">Người tạo</th>
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:left;width:100px">Ngày YCHT</th>
                        <th style="border:1px solid #E5E7EB;padding:10px;text-align:left;width:110px">Kết quả</th>
                    </tr>
                </thead>
                <tbody>{rows_html}</tbody>
            </table>
        </div>
        <div style="background:#F9FAFB;padding:12px 20px;font-size:11px;color:#6B7280;text-align:center">
            Email tự động từ Hệ Thống Quản Trị IT - Golden Gate Restaurant Group
        </div>
    </div>
    </body></html>"""
    
    msg = EmailMessage()
    msg["Subject"] = f"Báo cáo xử lý Ticket 3CX & G-Process ({today_str})"
    msg["From"] = f"Hệ Thống ITSS <{SMTP_USER}>"
    msg["To"] = ", ".join(recipients)
    msg.set_content(f"Báo cáo: {len(all_display_items)} nhiệm vụ (Ticket 3CX & G-Process) đã được xử lý.")
    msg.add_alternative(html, subtype="html")
    
    ctx = ssl.create_default_context()
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=25) as s:
        s.ehlo()
        s.starttls(context=ctx)
        s.login(SMTP_USER, SMTP_PASSWORD)
        s.send_message(msg)


ticket_batch_service_instance = None  # Singleton placeholder
