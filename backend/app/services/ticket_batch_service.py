import os
# Bỏ qua kiểm tra phiên bản Windows cho Node.js / Playwright (hỗ trợ Windows Server 2012 R2)
os.environ["NODE_SKIP_PLATFORM_CHECK"] = "1"

import json
import re
import base64
import logging
import asyncio
from datetime import datetime, date, timedelta
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
            context.set_default_timeout(120000)
            context.set_default_navigation_timeout(180000)
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


async def _is_gpms_session_alive(page, timeout_sec: float = 12.0) -> bool:
    """
    Kiểm tra thực tế xem phiên GPMS trên page có đang đăng nhập hợp lệ hay không:
    - Không bị chuyển hướng về sso.ggg.com.vn hoặc /login
    - Có JWT accessToken hợp lệ (chưa hết hạn) trong localStorage HOẶC API GPMS trả 200 (không bị 401)
    - Giao diện GPMS thực sự render (không đứng ở màn hình trắng / callback chưa xong)
    """
    loops = max(1, int(timeout_sec / 0.5))
    for _ in range(loops):
        curr_url = (page.url or "").lower()
        if "sso.ggg.com.vn" in curr_url or "/login" in curr_url:
            return False

        if "gpms.ggg.com.vn" in curr_url:
            try:
                auth_state = await page.evaluate("""() => {
                    const tok = localStorage.getItem('accessToken') || '';
                    let exp = 0;
                    let hasValidJwt = false;
                    if (tok && tok.split('.').length === 3) {
                        try {
                            const b64 = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                            const payload = JSON.parse(atob(b64));
                            exp = Number(payload.exp || 0);
                            hasValidJwt = exp > (Date.now() / 1000 + 30);
                        } catch (e) {}
                    }
                    const txt = (document.body && document.body.innerText) ? document.body.innerText : '';
                    const uiReady = (
                        txt.includes('Danh sách công việc') ||
                        txt.includes('G-Ticket') ||
                        txt.includes('G-Process') ||
                        txt.includes('Timesheet')
                    );
                    return { hasValidJwt, exp, uiReady };
                }""")
                if auth_state and auth_state.get("hasValidJwt") and auth_state.get("uiReady"):
                    return True
            except Exception:
                pass
        await asyncio.sleep(0.5)
    return False


async def _ensure_logged_in(page, context, username: str, password: str) -> None:
    """
    Đảm bảo đã đăng nhập vào hệ thống GPMS:
    1. Kiểm tra session hiện có bằng cách truy cập GPMS work-list và xác minh token + giao diện thực sự sống.
       Nếu còn sống -> làm mới lưu lại storage_state và KHÔNG login lại.
    2. Nếu chưa login hoặc session/token hết hạn -> xóa cookie/session cũ, đăng nhập SSO 1 lần duy nhất và lưu storage_state.
    """
    # 1. Thử kiểm tra session đã có
    if os.path.exists(SESSION_FILE):
        try:
            await page.goto("https://gpms.ggg.com.vn/gticket/work-list", timeout=600000)
            await _safe_wait_network_idle(page, 25000)
            if await _is_gpms_session_alive(page, timeout_sec=10.0):
                logger.info("[TICKET_BATCH] Tái sử dụng phiên SSO đã lưu thành công. Đang cập nhật cache phiên mới nhất.")
                try:
                    await context.storage_state(path=SESSION_FILE)
                except Exception:
                    pass
                return
            logger.info(f"[TICKET_BATCH] Phiên SSO cũ không còn hiệu lực (URL: {page.url}), sẽ đăng nhập lại từ đầu...")
        except Exception as e:
            logger.debug(f"[TICKET_BATCH] Kiểm tra session cũ lỗi: {e}")

    # Xóa sạch phiên cũ (cả file và cookies trong context) trước khi login mới
    clear_session()
    try:
        await context.clear_cookies()
    except Exception:
        pass

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

    # Chuyển tiếp sang GPMS để hoàn tất OAuth callback và nạp localStorage / token các phân hệ
    try:
        await page.goto("https://gpms.ggg.com.vn/gticket/work-list", timeout=240000)
        await _safe_wait_network_idle(page, 32000)
        await _is_gpms_session_alive(page, timeout_sec=12.0)
        await asyncio.sleep(1.5)
    except Exception as gpms_e:
        logger.debug(f"[TICKET_BATCH] GPMS callback init: {gpms_e}")

    # 3. Lưu session vào file để dùng lại ở các lần tiếp theo (bao gồm cả cookies và localStorage của GPMS)
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        await context.storage_state(path=SESSION_FILE)
        logger.info(f"[TICKET_BATCH] Đã lưu session vào {SESSION_FILE}")
    except Exception as se:
        logger.warning(f"[TICKET_BATCH] Không thể lưu session: {se}")


async def _recover_sso_if_redirected(page, target_url: str, username: str, password: str) -> None:
    """
    Hàm phòng vệ: Nếu đang ở giữa luồng quét mà bị GPMS đẩy về trang đăng nhập SSO,
    tự động đăng nhập lại và quay về đúng URL mục tiêu thay vì âm thầm quét ra 0 dòng.
    """
    curr_url = (page.url or "").lower()
    if "sso.ggg.com.vn" in curr_url or "/login" in curr_url:
        logger.warning(f"[TICKET_BATCH] Phát hiện bị chuyển về SSO giữa chừng ({page.url}), đang tự động đăng nhập lại...")
        clear_session()
        await _sso_login(page, username, password)
        await page.goto(target_url, timeout=240000)
        await _safe_wait_network_idle(page, 30000)
        await _is_gpms_session_alive(page, timeout_sec=10.0)
        await asyncio.sleep(1.5)


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
    Lấy dữ liệu timesheet từ GPMS (https://gpms.ggg.com.vn/timesheet-management) từ đầu tháng đến hôm nay.
    Cơ chế Dual-Source:
    1. Mở bộ lọc Ant Design RangePicker (input[placeholder='dd/mm/yyyy'] readonly), click chọn trực tiếp ngày
       đầu tháng (YYYY-MM-01) và ngày hôm nay (YYYY-MM-DD) để bảng GPMS tải trọn vẹn dữ liệu tháng.
    2. Đọc hàng tiêu đề bảng chính `table:not(.ant-picker-content) thead tr th` (tránh nhầm bảng lịch popup),
       nơi GPMS hiển thị từng cột dạng `"01/11\\n20h"` (tổng giờ đã khai báo trong ngày).
    3. Song song lắng nghe API `ticket-gpms.ggg.com.vn/api/timesheet` và `process-gpms.ggg.com.vn/api/v1/timesheet-management`
       ứng đúng `from_date`..`to_date` làm lớp dự phòng nếu DOM thay đổi.
    Return: dict {"2026-11-01": remaining_hours, ...} với Remaining = max(0.0, 24.0 - logged_hours).
    """
    today = date.today()
    first_of_month = today.replace(day=1)
    from_iso = first_of_month.strftime("%Y-%m-%d")
    to_iso = today.strftime("%Y-%m-%d")
    first_dd_mm = first_of_month.strftime("%d/%m")

    # Chuẩn bị danh sách tất cả các ngày từ đầu tháng đến hôm nay để đối chiếu & bổ sung đủ
    all_month_days: List[str] = []
    cur_d = first_of_month
    while cur_d <= today:
        all_month_days.append(cur_d.strftime("%Y-%m-%d"))
        cur_d = cur_d + timedelta(days=1)

    # Bộ lắng nghe API timesheet từ backend GPMS (chỉ bắt đúng khoảng from_iso .. to_iso hoặc tải lần đầu)
    api_bucket: Dict[str, Dict[str, float]] = {}  # source_key -> { "YYYY-MM-DD": total_hours }
    target_api_seen = False

    async def _on_ts_response(response):
        nonlocal target_api_seen
        url = response.url or ""
        is_ticket_ts = "ticket-gpms.ggg.com.vn/api/timesheet" in url
        is_proc_ts = "process-gpms.ggg.com.vn/api/v1/timesheet-management" in url
        if not (is_ticket_ts or is_proc_ts):
            return
        if response.status != 200:
            return
        try:
            # Ưu tiên response ứng với khoảng ngày from_iso..to_iso (hoặc tuần chứa ngày đó)
            is_exact_range = (f"from_date={from_iso}" in url and f"to_date={to_iso}" in url)
            if is_exact_range:
                target_api_seen = True
            source_key = url.split("?")[0]
            if is_ticket_ts:
                m_t = re.search(r"[?&]type=([^&]+)", url)
                if m_t:
                    source_key = f"{source_key}#type={m_t.group(1)}"

            res_json = await response.json()
            tasks = res_json.get("data") or []
            if not isinstance(tasks, list):
                return

            # Tính tổng giờ từng ngày từ response này (nếu có exact range sẽ ghi đè dữ liệu cũ cùng source)
            per_day: Dict[str, float] = {}
            for task in tasks:
                if not isinstance(task, dict):
                    continue
                for ts_entry in (task.get("timesheet") or []):
                    if not isinstance(ts_entry, dict):
                        continue
                    try:
                        h_val = float(ts_entry.get("hour") or 0)
                    except (TypeError, ValueError):
                        h_val = 0.0
                    raw_d = str(ts_entry.get("date") or "").strip()
                    if h_val <= 0 or not raw_d:
                        continue
                    if "T" in raw_d and raw_d.endswith("Z"):
                        # API trả về UTC (VD: 2026-11-08T17:00:00.000000Z = 00:00 ngày 2026-11-09 GMT+7)
                        dt_local = datetime.fromisoformat(raw_d.replace("Z", "+00:00")) + timedelta(hours=7)
                        d_key = dt_local.strftime("%Y-%m-%d")
                    else:
                        d_key = raw_d[:10]
                    per_day[d_key] = per_day.get(d_key, 0.0) + h_val

            # Lưu lại theo từng API (exact_range được gắn cờ ưu tiên tuyệt đối)
            if is_exact_range or f"exact|{source_key}" not in api_bucket:
                store_key = f"exact|{source_key}" if is_exact_range else f"init|{source_key}"
                api_bucket[store_key] = per_day
        except Exception as ts_api_err:
            logger.debug(f"[TICKET_BATCH] Lỗi parse API timesheet: {ts_api_err}")

    page.on("response", _on_ts_response)
    remaining_hours: Dict[str, float] = {}

    try:
        ts_url = "https://gpms.ggg.com.vn/timesheet-management"
        await page.goto(ts_url, timeout=600000)
        await _safe_wait_network_idle(page, 60000)

        # Kiểm tra nếu bị đá về SSO thì tự động đăng nhập lại
        try:
            u_cfg, p_cfg = get_sso_credentials()
            await _recover_sso_if_redirected(page, ts_url, u_cfg, p_cfg)
        except Exception:
            pass

        await asyncio.sleep(1.5)

        # Bước 1: Thao tác Ant Design RangePicker (readonly input placeholder="dd/mm/yyyy")
        date_inps = page.locator("input[placeholder='dd/mm/yyyy']")
        if await date_inps.count() >= 2:
            try:
                await date_inps.nth(0).click()
                await asyncio.sleep(0.5)

                # Nếu ô ngày đầu tháng chưa nằm trong panel đang mở, lùi tối đa 2 tháng để tìm
                cell_start_sel = f'.ant-picker-dropdown td.ant-picker-cell-in-view[title="{from_iso}"]'
                cell_end_sel = f'.ant-picker-dropdown td.ant-picker-cell-in-view[title="{to_iso}"]'

                for _ in range(2):
                    if await page.locator(cell_start_sel).count() > 0:
                        break
                    prev_btn = page.locator(".ant-picker-dropdown .ant-picker-header-prev-btn").first
                    if await prev_btn.count() > 0:
                        await prev_btn.click()
                        await asyncio.sleep(0.3)

                cell_start = page.locator(cell_start_sel).first
                if await cell_start.count() > 0:
                    await cell_start.click()
                    await asyncio.sleep(0.35)

                    cell_end = page.locator(cell_end_sel).first
                    if await cell_end.count() > 0:
                        await cell_end.click()
                        await asyncio.sleep(0.4)
                    else:
                        # Đề phòng panel chuyển tháng sau click start -> tiến tới 1 tháng tìm end
                        next_btn = page.locator(".ant-picker-dropdown .ant-picker-header-next-btn").first
                        if await next_btn.count() > 0:
                            await next_btn.click()
                            await asyncio.sleep(0.3)
                        cell_end = page.locator(cell_end_sel).first
                        if await cell_end.count() > 0:
                            await cell_end.click()
                            await asyncio.sleep(0.4)
            except Exception as picker_err:
                logger.warning(f"[TICKET_BATCH] Lỗi thao tác RangePicker timesheet: {picker_err}")
        else:
            # Fallback cho layout có input[type="text"] thông thường không phải readonly
            from_str = first_of_month.strftime("%d/%m/%Y")
            to_str = today.strftime("%d/%m/%Y")
            text_inputs = await page.locator('input[type="text"]:not([readonly])').all()
            if len(text_inputs) >= 2:
                await text_inputs[0].fill(from_str)
                await page.keyboard.press("Enter")
                await asyncio.sleep(0.4)
                await text_inputs[1].fill(to_str)
                await page.keyboard.press("Enter")
                await asyncio.sleep(0.4)
                search_btn = page.locator('button:has-text("Tìm kiếm"), button:has-text("Lọc"), button:has-text("Áp dụng"), button:has-text("Search")')
                if await search_btn.count() > 0:
                    await search_btn.first.click()

        # Đợi bảng chính cập nhật cột đầu tháng (VD: "01/11") và API hoàn tất
        await _safe_wait_network_idle(page, 15000)
        for _ in range(20):
            try:
                th_locs = await page.locator("table:not(.ant-picker-content) thead tr th, table:not(.ant-picker-content) thead tr td").all()
                th_texts = [(await h.inner_text()).strip() for h in th_locs]
                if any(first_dd_mm in t for t in th_texts):
                    break
            except Exception:
                pass
            await asyncio.sleep(0.5)
        await asyncio.sleep(0.8)

        # Bước 2: Đọc dữ liệu từ tiêu đề bảng Timesheet (VD: "01/11\n20h" hoặc "01/11 20h")
        # Quan trọng: loại trừ .ant-picker-content để không đọc nhầm bảng lịch dropdown (T2..CN)
        try:
            headers = await page.locator(
                "table:not(.ant-picker-content) thead tr th, table:not(.ant-picker-content) thead tr td"
            ).all()
            for h in headers:
                raw_txt = (await h.inner_text()).strip()
                if not raw_txt or "Tổng thời gian" in raw_txt or raw_txt.lower().startswith("tổng"):
                    continue

                lines = [ln.strip() for ln in raw_txt.splitlines() if ln.strip()]
                date_key = None
                total_hours = 0.0

                for ln in lines:
                    m_date = re.search(r"\b(\d{1,2})/(\d{1,2})\b", ln)
                    if m_date and date_key is None:
                        d_num = int(m_date.group(1))
                        m_num = int(m_date.group(2))
                        if 1 <= d_num <= 31 and 1 <= m_num <= 12:
                            # Xử lý năm chính xác kể cả trường hợp đầu năm
                            y_num = today.year
                            date_key = f"{y_num:04d}-{m_num:02d}-{d_num:02d}"
                        # Nếu cùng 1 dòng vừa có ngày vừa có số giờ phía sau (VD: "01/11 20h")
                        tail_part = ln[m_date.end():].strip()
                        if tail_part:
                            m_h_inline = re.search(r"(\d+(?:[.,]\d+)?)\s*h?\b", tail_part, re.IGNORECASE)
                            if m_h_inline:
                                total_hours = float(m_h_inline.group(1).replace(",", "."))
                        continue

                    if date_key is not None:
                        if ln in ("-", "—", ""):
                            total_hours = 0.0
                        else:
                            m_h = re.search(r"(\d+(?:[.,]\d+)?)\s*h?\b", ln, re.IGNORECASE)
                            if m_h:
                                total_hours = float(m_h.group(1).replace(",", "."))

                if date_key and date_key in all_month_days:
                    rem = round(max(0.0, 24.0 - total_hours), 2)
                    remaining_hours[date_key] = rem
        except Exception as e:
            logger.warning(f"[TICKET_BATCH] Lỗi parse DOM bảng timesheet: {e}")

        # Bước 3: Fallback bằng dữ liệu API timesheet nếu DOM đọc thiếu hoặc thất bại
        exact_keys = [k for k in api_bucket.keys() if k.startswith("exact|")]
        if (not remaining_hours or len(remaining_hours) < len(all_month_days)) and (exact_keys or api_bucket):
            use_keys = exact_keys if exact_keys else list(api_bucket.keys())
            api_logged_totals: Dict[str, float] = {}
            for sk in use_keys:
                for d_k, h_v in api_bucket[sk].items():
                    api_logged_totals[d_k] = api_logged_totals.get(d_k, 0.0) + h_v

            if target_api_seen or api_logged_totals:
                for d_k in all_month_days:
                    if d_k not in remaining_hours:
                        logged = api_logged_totals.get(d_k, 0.0)
                        remaining_hours[d_k] = round(max(0.0, 24.0 - logged), 2)
                logger.info(f"[TICKET_BATCH] Đã bổ sung/đối chiếu timesheet từ API ({len(use_keys)} nguồn)")
    finally:
        try:
            page.remove_listener("response", _on_ts_response)
        except Exception:
            pass

    if not remaining_hours:
        # Fallback cuối cùng: khởi tạo tất cả các ngày trong tháng có 24h trống
        logger.warning("[TICKET_BATCH] Không đọc được timesheet cả DOM lẫn API, fallback: tất cả ngày có 24h")
        for d_k in all_month_days:
            remaining_hours[d_k] = 24.0
    else:
        # Đảm bảo đủ mọi ngày từ đầu tháng đến hôm nay (nếu ngày nào thiếu cột trên UI -> coi như 24h trống)
        for d_k in all_month_days:
            if d_k not in remaining_hours:
                remaining_hours[d_k] = 24.0

    logger.info(f"[TICKET_BATCH] Timesheet loaded ({len(remaining_hours)} ngày): {remaining_hours}")
    return remaining_hours


def _pick_best_day(remaining_hours: Dict[str, float]) -> Optional[str]:
    """
    Chọn ngày tốt nhất để khai báo 1 giờ:
    1. Ưu tiên ngày có remaining >= 1h và < 8h (lấp đầy các ngày sắp đủ 24h trước)
    2. Nếu không có, lấy ngày đầu tiên có remaining >= 1h
    Return: key dạng "2026-11-01" hoặc None nếu không còn ngày nào trống >= 1h
    """
    sorted_days = sorted(remaining_hours.keys())
    
    # Ưu tiên 1: còn ít nhất 1h và < 8h
    for day_key in sorted_days:
        r = remaining_hours[day_key]
        if 1.0 <= r < 8.0:
            return day_key
    
    # Ưu tiên 2: remaining >= 1h
    for day_key in sorted_days:
        r = remaining_hours[day_key]
        if r >= 1.0:
            return day_key
    
    return None


def _extract_person_display_and_blob(val: Any) -> tuple[str, str]:
    """
    Chuẩn hóa trường người dùng từ API GPMS (`assignees` / `creators` / `assignee_name` / `assignee`).
    GPMS trả về `assignees` dạng dict (`{"user_name": "dung.nguyenanh", "full_name": "...", "name": "..."}`)
    hoặc danh sách dict / chuỗi đơn. Trả về `(tên_hiển_thị, chuỗi_gộp_để_so_khớp)`.
    """
    if isinstance(val, dict):
        uname = str(val.get("user_name") or val.get("username") or "").strip()
        fname = str(val.get("full_name") or "").strip()
        name = str(val.get("name") or "").strip()
        email = str(val.get("email") or "").strip()
        display = uname or name or fname or email
        blob = " ".join(x for x in [uname, fname, name, email] if x)
        return display, blob

    if isinstance(val, list):
        displays: List[str] = []
        blobs: List[str] = []
        for entry in val:
            d, b = _extract_person_display_and_blob(entry)
            if d:
                displays.append(d)
            if b:
                blobs.append(b)
        return ", ".join(displays), " ".join(blobs)

    if val is not None:
        s = str(val).strip()
        return s, s

    return "", ""


async def _fetch_ticket_list(page, username: str) -> List[Dict[str, Any]]:
    """
    Lấy danh sách ticket từ work-list (https://gpms.ggg.com.vn/gticket/work-list).
    Áp dụng Dual-Engine chuẩn xác:
    1. Bắt trực tiếp JSON từ API `https://ticket-gpms.ggg.com.vn/api/tasks/paging` (đã sửa đúng key `assignees` & `creators`),
       đồng thời chủ động tải các trang tiếp theo nếu `total_page > 1`.
    2. Duyệt DOM bảng `tbody tr` kết hợp cuộn sâu làm lớp đối chiếu/dự phòng.
       (Đã loại bỏ selector `div:has-text('Công việc nhận về')` gây click nhầm `<div id="root">` mở DatePicker!).
    Quy tắc lọc theo người dùng chỉ định:
    - Tên nhiệm vụ chứa: '...hỗ trợ tiếp nhận từ tổng đài 3CX...' (hoặc '3CX', 'tổng đài')
    - Người xử lý là: dung.nguyenanh (hoặc username SSO)
    """
    seen_tickets_dict: Dict[str, Dict[str, Any]] = {}
    user_clean = (username or "").strip().lower().split("@")[0]

    def _is_ticket_match(name: str, assignee_blob: str) -> bool:
        combined_name = (name or "").lower()
        assignee_clean = (assignee_blob or "").strip().lower()

        is_3cx = any(kw in combined_name for kw in [
            "hỗ trợ tiếp nhận từ tổng đài 3cx",
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
            ("nguyễn anh dũng" in assignee_clean) or
            ("nguyen anh dung" in assignee_clean) or
            (user_clean and user_clean in assignee_clean) or
            (assignee_clean and assignee_clean in user_clean)
        )
        return is_3cx and is_user_match

    status_vi_map = {
        "open": "Mới mở",
        "inprogress": "Đang triển khai",
        "in_progress": "Đang triển khai",
        "reopen": "Mở lại",
    }
    closed_statuses = {"done", "closed", "completed", "cancelled", "cancel", "reject", "rejected"}

    def _ingest_api_items(items: List[Any]) -> None:
        for it in items:
            if not isinstance(it, dict):
                continue
            t_id = str(it.get("id") or it.get("code") or "").strip()
            t_title = str(it.get("title") or it.get("name") or "").strip()
            raw_status = str(it.get("status") or "").strip().lower()
            if raw_status in closed_statuses:
                continue

            creator_disp, _ = _extract_person_display_and_blob(
                it.get("creators") or it.get("creator_name") or it.get("creator")
            )
            if not creator_disp:
                creator_disp = "Anonymous"

            assignee_disp, assignee_blob = _extract_person_display_and_blob(
                it.get("assignees") or it.get("assignee_name") or it.get("assignee")
            )
            due_date_part = str(it.get("due_date") or "").strip()
            due_hour_part = str(it.get("due_hour") or "").strip()
            t_due = f"{due_date_part} {due_hour_part}".strip() if (due_date_part or due_hour_part) else ""
            t_status = status_vi_map.get(raw_status, str(it.get("status") or "Mới mở"))

            if t_id and t_id not in seen_tickets_dict:
                if _is_ticket_match(t_title, assignee_blob or assignee_disp):
                    seen_tickets_dict[t_id] = {
                        "ticket_id": t_id,
                        "ticket_name": t_title,
                        "created_by": creator_disp,
                        "assignee": assignee_disp or username,
                        "due_date": t_due,
                        "url": f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={t_id}",
                        "source_type": "TICKET",
                        "status": t_status,
                    }

    paging_api_received = False
    api_total_page = 1
    captured_ticket_auth: Optional[str] = None
    captured_paging_payload: Optional[Dict[str, Any]] = None

    async def _on_ticket_request(request):
        nonlocal captured_ticket_auth, captured_paging_payload
        req_url = request.url or ""
        if "ticket-gpms.ggg.com.vn/api/" in req_url:
            auth_val = request.headers.get("authorization") or request.headers.get("Authorization")
            if auth_val:
                captured_ticket_auth = auth_val
        if "tasks/paging" in req_url and request.method.upper() == "POST":
            try:
                if request.post_data:
                    captured_paging_payload = json.loads(request.post_data)
            except Exception:
                pass

    async def _on_ticket_response(response):
        nonlocal paging_api_received, api_total_page
        if "tasks/paging" in (response.url or "") and response.status == 200:
            try:
                res_json = await response.json()
                data_obj = res_json.get("data") or {}
                paging_api_received = True
                try:
                    tp = int(data_obj.get("total_page") or 1)
                    if tp > api_total_page:
                        api_total_page = tp
                except (TypeError, ValueError):
                    pass
                items = data_obj.get("items") or []
                if isinstance(items, list):
                    _ingest_api_items(items)
            except Exception as api_err:
                logger.debug(f"[TICKET_BATCH] Lỗi parse tasks/paging: {api_err}")

    page.on("request", _on_ticket_request)
    page.on("response", _on_ticket_response)

    try:
        worklist_url = "https://gpms.ggg.com.vn/gticket/work-list"
        await page.goto(worklist_url, timeout=600000)
        await _safe_wait_network_idle(page, 60000)

        # Kiểm tra nếu bị đẩy về SSO thì tự động đăng nhập lại ngay
        try:
            u_cfg, p_cfg = get_sso_credentials()
            await _recover_sso_if_redirected(page, worklist_url, u_cfg, p_cfg)
        except Exception:
            pass

        # Chờ tối đa 20s để API tasks/paging trả dữ liệu hoặc bảng DOM render dòng thật
        for _ in range(40):
            if paging_api_received:
                break
            try:
                real_rows = await page.locator("tbody tr:not([aria-hidden='true'])").all()
                if real_rows:
                    for rr in real_rows[:5]:
                        first_td = (await rr.locator("td").first.inner_text()).strip() if await rr.locator("td").count() > 0 else ""
                        if first_td:
                            paging_api_received = True
                            break
                if paging_api_received:
                    break
            except Exception:
                pass
            await asyncio.sleep(0.5)

        # Đảm bảo đang ở tab "Công việc nhận về" (CHỈ match button/a/tab, KHÔNG match div#root!)
        try:
            nhan_ve_btn = page.locator(
                "button:has-text('Công việc nhận về'), a:has-text('Công việc nhận về'), [role='tab']:has-text('Công việc nhận về')"
            ).first
            if await nhan_ve_btn.count() > 0:
                btn_cls = (await nhan_ve_btn.get_attribute("class") or "").lower()
                # Chỉ click nếu nút chưa ở trạng thái active/primary (tránh reload thừa)
                if "primary" not in btn_cls and "active" not in btn_cls:
                    await nhan_ve_btn.click()
                    await _safe_wait_network_idle(page, 24000)
                    await asyncio.sleep(1.0)
        except Exception as tab_e:
            logger.debug(f"[TICKET_BATCH] Chuyển tab 'Công việc nhận về': {tab_e}")

        # Nếu API tasks/paging có nhiều hơn 1 trang -> chủ động gọi API lấy hết trang 2..N
        if api_total_page > 1 and captured_ticket_auth and captured_paging_payload:
            max_api_pages = min(api_total_page, 20)
            logger.info(f"[TICKET_BATCH] API tasks/paging có {api_total_page} trang, đang tải các trang 2..{max_api_pages}...")
            for page_idx in range(2, max_api_pages + 1):
                try:
                    req_body = dict(captured_paging_payload)
                    req_body["page"] = page_idx
                    page_json = await page.evaluate(
                        """async ([auth, bodyObj]) => {
                            const resp = await fetch('https://ticket-gpms.ggg.com.vn/api/tasks/paging', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': auth
                                },
                                body: JSON.stringify(bodyObj)
                            });
                            if (!resp.ok) return null;
                            return await resp.json();
                        }""",
                        [captured_ticket_auth, req_body],
                    )
                    if isinstance(page_json, dict):
                        p_items = (page_json.get("data") or {}).get("items") or []
                        if isinstance(p_items, list):
                            _ingest_api_items(p_items)
                except Exception as pg_err:
                    logger.warning(f"[TICKET_BATCH] Lỗi tải tasks/paging trang {page_idx}: {pg_err}")
                    break

        # Lớp 2 (DOM Fallback & Merge): Quét DOM bảng trực tiếp kết hợp cuộn sâu
        prev_row_count = 0
        no_new_rows_count = 0
        max_scrolls = 30

        for scroll_idx in range(1, max_scrolls + 1):
            await asyncio.sleep(0.6)
            try:
                rows = await page.locator("table:not(.ant-picker-content) tbody tr").all()
                current_row_count = len(rows)

                for row in rows:
                    try:
                        cells = await row.locator("td").all()
                        if len(cells) < 4:
                            continue

                        # Cột Mã (cell 0) - bỏ qua hàng đo kích thước trống của Ant/React Table
                        ma_text = (await cells[0].inner_text()).strip()
                        if not ma_text or ma_text in seen_tickets_dict:
                            continue

                        # Tên nhiệm vụ (cell 1) - lấy text_content (không bị CSS ellipsis cắt) + inner_text + title
                        ten_inner = (await cells[1].inner_text()).strip()
                        ten_content = (await cells[1].text_content() or "").strip()
                        ten_text = ten_content if len(ten_content) > len(ten_inner) else ten_inner
                        cell_title = ""
                        try:
                            for tag in ["a", "span", "p", "div"]:
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

                        # Người tạo (cell 2), Người xử lý (cell 3), Ngày YCHT (cell 4), Trạng thái (cell 6)
                        nguoi_tao = (await cells[2].inner_text()).strip() if len(cells) > 2 else ""
                        nguoi_xu_ly = (await cells[3].inner_text()).strip() if len(cells) > 3 else ""
                        ngay_ycht = (await cells[4].inner_text()).strip() if len(cells) > 4 else ""
                        trang_thai = (await cells[6].inner_text()).strip() if len(cells) > 6 else "Mới mở"

                        if _is_ticket_match(full_task_name, nguoi_xu_ly):
                            seen_tickets_dict[ma_text] = {
                                "ticket_id": ma_text,
                                "ticket_name": full_task_name,
                                "created_by": nguoi_tao,
                                "assignee": nguoi_xu_ly,
                                "due_date": ngay_ycht,
                                "url": f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={ma_text}",
                                "source_type": "TICKET",
                                "status": trang_thai or "Mới mở",
                            }
                    except Exception as row_err:
                        logger.debug(f"[TICKET_BATCH] Skip row: {row_err}")

                if current_row_count > prev_row_count:
                    prev_row_count = current_row_count
                    no_new_rows_count = 0
                else:
                    no_new_rows_count += 1
                    if no_new_rows_count >= 4:
                        logger.info(
                            f"[TICKET_BATCH] Đã quét xong bảng work-list sau {scroll_idx} lượt (tổng {current_row_count} hàng DOM)"
                        )
                        break

                await page.evaluate("""
                    () => {
                        window.scrollTo(0, document.body.scrollHeight);
                        const scrollables = document.querySelectorAll('div, section, main, [class*="scroll"], [class*="table"], tbody');
                        for (const el of scrollables) {
                            if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
                                el.scrollTop = el.scrollHeight;
                                el.dispatchEvent(new Event('scroll', { bubbles: true }));
                            }
                        }
                    }
                """)
                await asyncio.sleep(0.8)
            except Exception as e:
                logger.warning(f"[TICKET_BATCH] Lỗi trong lần cuộn {scroll_idx}: {e}")
                break
    finally:
        try:
            page.remove_listener("request", _on_ticket_request)
        except Exception:
            pass
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
    _gp_handler = None
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

        _gp_handler = _on_response
        page.on("response", _on_response)

        gp_url = "https://gpms.ggg.com.vn/g-process/my-mission"
        await page.goto(gp_url, timeout=480000)
        await _safe_wait_network_idle(page, 60000)

        # Kiểm tra nếu bị đẩy về SSO giữa chừng thì tự động đăng nhập lại
        try:
            u_cfg, p_cfg = get_sso_credentials()
            await _recover_sso_if_redirected(page, gp_url, u_cfg, p_cfg)
        except Exception:
            pass

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
    finally:
        if _gp_handler is not None:
            try:
                page.remove_listener("response", _gp_handler)
            except Exception:
                pass

    logger.info(f"[GPROCESS] Tổng số nhiệm vụ G-Process tìm thấy: {len(gprocess_items)}")
    return gprocess_items



async def _close_ticket(
    page,
    ticket: Dict[str, Any],
    ticket_index: int,
    remaining_hours: Dict[str, float],
    username: str = "",
    password: str = ""
) -> Dict[str, Any]:
    """
    Đóng 1 ticket:
    - Chuyển trạng thái sang Hoàn thành
    - Khai báo timesheet 1h (tự kiểm tra HTTP POST /api/worklog & tự chuyển ngày nếu bị 422)
    - Chọn phân loại 'Yêu cầu' trong #basic_typeTicket & xoay vòng danh mục
    - Lưu ticket và xác nhận qua PUT /api/tasks/{id} hoặc toast react-hot-toast/AntD
    """
    ticket_id = str(ticket.get("ticket_id", "")).strip()
    url = ticket.get("url") or f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={ticket_id}"
    if not username or not password:
        u_cfg, p_cfg = get_sso_credentials()
        username = username or u_cfg
        password = password or p_cfg

    put_listener = None
    try:
        if page.is_closed():
            raise RuntimeError("Trang trình duyệt đã bị đóng bất ngờ")

        await page.goto(url, timeout=180000)
        await _safe_wait_network_idle(page, 20000)
        await _recover_sso_if_redirected(page, url, username, password)
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
        used_day = best_day
        used_day_display = best_day_display

        # Chọn danh mục xoay vòng theo index
        category = CATEGORY_ROTATION[ticket_index % len(CATEGORY_ROTATION)]

        # 1. Chuyển trạng thái sang 'Đã hoàn thành' (react-select; GPMS dùng div[class*='title_field'] chứ không phải <label>)
        status_container = page.locator("div[class*='title_field']:has-text('Trạng thái')").locator("xpath=..").locator("[class*='control'], .css-l2aqk6").first
        if await status_container.count() == 0:
            status_container = page.locator("label:has-text('Trạng thái')").locator("xpath=../..").locator("[class*='control'], .css-l2aqk6").first

        status_text = await status_container.inner_text() if await status_container.count() > 0 else ""
        if "Đã hoàn thành" not in status_text:
            if await status_container.count() > 0:
                await status_container.click()
                await asyncio.sleep(0.3)
                opt = page.locator("[class*='option']:has-text('Đã hoàn thành'), [id*='-option-']:has-text('Đã hoàn thành')").first
                if await opt.count() > 0 and await opt.is_visible():
                    await opt.click()
                    await asyncio.sleep(0.6)
                else:
                    sel_inp = status_container.locator("input").first
                    if await sel_inp.count() > 0:
                        await sel_inp.fill("Đã hoàn thành")
                        await asyncio.sleep(0.25)
                        opt_after = page.locator("[class*='option']:has-text('Đã hoàn thành'), [id*='-option-']:has-text('Đã hoàn thành')").first
                        if await opt_after.count() > 0 and await opt_after.is_visible():
                            await opt_after.click()
                        else:
                            await page.keyboard.press("Enter")
                        await asyncio.sleep(0.6)
            else:
                # Fallback nếu container không tìm thấy
                status_box = page.locator(".css-1dimb5e-singleValue, [class*='singleValue']:has-text('Mới mở'), [class*='singleValue']:has-text('Đang triển khai'), [class*='singleValue']:has-text('Mở lại')").first
                if await status_box.count() > 0:
                    await status_box.click()
                    await asyncio.sleep(0.3)
                    opt = page.locator("[class*='option']:has-text('Đã hoàn thành'), [id*='-option-']:has-text('Đã hoàn thành')").first
                    if await opt.count() > 0:
                        await opt.click()
                        await asyncio.sleep(0.6)

        # 2. Xử lý popup Khai báo Timesheet (#container-portal hoặc .ant-modal)
        # Khi chuyển trạng thái sang 'Đã hoàn thành', GPMS mở modal để khai báo giờ và ghi chú
        portal = page.locator("#container-portal")
        modal_in_portal = portal.locator("div[id*='container-modal'], div[class*='container-modal'], div[id*='style_container-modal'], div[class*='style_container-modal'], table").first

        try:
            await modal_in_portal.wait_for(state="visible", timeout=10000)
        except Exception:
            pass

        is_portal_open = await modal_in_portal.count() > 0 and await modal_in_portal.is_visible()
        antd_timesheet = page.locator(".ant-modal:has-text('Timesheet'), .ant-modal:has-text('thời gian'), .ant-modal:has-text('Khai báo')").first
        is_antd_open = await antd_timesheet.count() > 0 and await antd_timesheet.is_visible()

        if is_portal_open or is_antd_open:
            active_container = portal if is_portal_open else antd_timesheet
            logger.info(f"[TICKET_BATCH] #{ticket_id}: Phát hiện popup Timesheet trong {'#container-portal' if is_portal_open else '.ant-modal'}")

            # Thử tối đa 4 ngày khác nhau nếu GPMS trả về HTTP 422 (ví dụ ngày đó thực tế đã đủ 24h)
            ts_saved = False
            last_ts_error = ""
            prev_row_idx: Optional[int] = None

            for ts_attempt in range(4):
                candidate_day = _pick_best_day(remaining_hours)
                if not candidate_day:
                    last_ts_error = "Không còn ngày nào trống >= 1h trong tháng để khai báo Timesheet"
                    break

                candidate_display = datetime.strptime(candidate_day, "%Y-%m-%d").strftime("%d/%m/%Y")
                rows = await active_container.locator("tbody tr").all()

                # Nếu lần thử trước bị lỗi 422, xóa sạch dữ liệu đã điền ở dòng trước để tránh gửi trùng/cộng dồn 2h
                if prev_row_idx is not None and rows and prev_row_idx < len(rows):
                    try:
                        prev_row = rows[prev_row_idx]
                        prev_time = prev_row.locator("input[name*='time'], input[name*='actual'], input[name*='hour'], input[type='number']").first
                        if await prev_time.count() > 0:
                            await prev_time.fill("0")
                        prev_note = prev_row.locator("input[name*='note'], textarea[name*='note'], input[placeholder*='note'], input[placeholder*='Ghi chú']").first
                        if await prev_note.count() > 0:
                            await prev_note.fill("")
                    except Exception:
                        pass

                target_row = None
                target_row_idx = None
                unused_row = None
                unused_row_idx = None

                if rows:
                    for r_idx, r in enumerate(rows):
                        r_text = await r.inner_text()
                        r_inputs = await r.locator("input").all()
                        r_vals = [await inp.input_value() for inp in r_inputs]
                        # Kiểm tra dòng có khớp ngày cần điền không
                        if candidate_display in r_text or any(candidate_display in v for v in r_vals):
                            target_row = r
                            target_row_idx = r_idx
                            break

                        # Ghi nhận dòng trống đầu tiên chưa điền giờ (ưu tiên từ dưới lên hoặc dòng trống cuối để tránh trùng ngày khác)
                        time_val_str = ""
                        try:
                            t_inp = r.locator("input[name*='time'], input[name*='actual'], input[name*='hour'], input[type='number']").first
                            if await t_inp.count() > 0:
                                time_val_str = (await t_inp.input_value() or "").strip()
                        except Exception:
                            pass
                        is_row_empty = time_val_str in ("", "0", "0.0", "-")
                        if is_row_empty:
                            unused_row = r
                            unused_row_idx = r_idx

                    # Nếu ngày mục tiêu không nằm trong 5 dòng mặc định của modal, đổi ngày trên 1 dòng trống (react-datepicker)
                    if not target_row:
                        target_row = unused_row if unused_row else rows[0]
                        target_row_idx = unused_row_idx if unused_row_idx is not None else 0
                        date_inp = target_row.locator("input[placeholder='dd/mm/yyyy'], input[name*='date']").first
                        if await date_inp.count() > 0:
                            try:
                                await date_inp.click()
                                await date_inp.fill(candidate_display)
                                await date_inp.press("Enter")
                                await asyncio.sleep(0.25)
                                logger.info(f"[TICKET_BATCH] #{ticket_id}: Đã chuyển ngày Timesheet dòng {target_row_idx} sang {candidate_display}")
                            except Exception as date_err:
                                logger.warning(f"[TICKET_BATCH] #{ticket_id}: Không thể đổi ngày datepicker sang {candidate_display}: {date_err}")

                scope = target_row if target_row else active_container
                prev_row_idx = target_row_idx

                # 2.1. Điền Thời gian (1 giờ) — click trước để đóng popover datepicker nếu còn mở
                time_filled = False
                time_inps = scope.locator("input[name*='time'], input[name*='actual'], input[name*='hour'], input[type='number']")
                if await time_inps.count() > 0:
                    await time_inps.first.click()
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
                    inp_ph = (await inp.get_attribute("placeholder") or "").lower()
                    inp_val = await inp.input_value()
                    if not inp_val or inp_val in ["-", ""]:
                        if "note" in inp_name:
                            await inp.fill("Hỗ trợ hoàn thành nhiệm vụ")
                        elif ("time" in inp_name or "hour" in inp_name or "actual" in inp_name) and not time_filled:
                            await inp.fill("1")
                            time_filled = True
                    elif ("time" in inp_name or "hour" in inp_name or "actual" in inp_name) and inp_val == "0" and not time_filled and "dd/mm" not in inp_ph:
                        await inp.fill("1")
                        time_filled = True

                if not time_filled:
                    for inp in all_inps:
                        inp_name = (await inp.get_attribute("name") or "").lower()
                        inp_ph = (await inp.get_attribute("placeholder") or "").lower()
                        if "note" not in inp_name and "date" not in inp_name and "dd/mm" not in inp_ph:
                            await inp.fill("1")
                            time_filled = True
                            break

                await asyncio.sleep(0.25)

                # 2.4. Bấm nút Lưu trong popup Timesheet và lắng nghe trực tiếp API POST /api/worklog
                worklog_resp_holder: Dict[str, Any] = {}
                worklog_event = asyncio.Event()

                async def _on_worklog_resp(resp):
                    try:
                        if "/api/worklog" in resp.url and resp.request.method == "POST":
                            body_txt = ""
                            try:
                                body_txt = await resp.text()
                            except Exception:
                                pass
                            worklog_resp_holder["status"] = resp.status
                            worklog_resp_holder["body"] = body_txt
                            worklog_event.set()
                    except Exception:
                        pass

                page.on("response", _on_worklog_resp)
                try:
                    save_ts = active_container.locator("button:has-text('Lưu'), button:has-text('Xác nhận'), button:has-text('Đồng ý'), div[class*='container-bottom-modal'] button:not(:has-text('Hủy')):not(:has-text('Đóng'))").first
                    if await save_ts.count() > 0:
                        try:
                            await save_ts.click(timeout=10000)
                        except Exception:
                            await save_ts.click(force=True)
                    else:
                        bottom_btns = await active_container.locator("div[class*='container-bottom-modal'] button, .ant-modal-footer button").all()
                        if bottom_btns:
                            await bottom_btns[-1].click(force=True)

                    try:
                        await asyncio.wait_for(worklog_event.wait(), timeout=10.0)
                    except asyncio.TimeoutError:
                        pass
                finally:
                    try:
                        page.remove_listener("response", _on_worklog_resp)
                    except Exception:
                        pass

                wl_status = worklog_resp_holder.get("status")
                if wl_status in (200, 201):
                    try:
                        await modal_in_portal.wait_for(state="hidden", timeout=6000)
                    except Exception:
                        pass
                    used_day = candidate_day
                    used_day_display = candidate_display
                    ts_saved = True
                    logger.info(f"[TICKET_BATCH] #{ticket_id}: Lưu Timesheet thành công (ngày {candidate_display}, HTTP {wl_status}).")
                    break

                # Kiểm tra nếu không bắt được event HTTP nhưng modal đã tự đóng
                await asyncio.sleep(0.4)
                still_open = (await modal_in_portal.count() > 0 and await modal_in_portal.is_visible()) or (await antd_timesheet.count() > 0 and await antd_timesheet.is_visible())
                if wl_status is None and not still_open:
                    used_day = candidate_day
                    used_day_display = candidate_display
                    ts_saved = True
                    break

                # GPMS trả về 422 / 4xx hoặc từ chối lưu -> loại ngày này khỏi pool tạm và thử ngày khác
                err_body = (worklog_resp_holder.get("body") or "").strip()
                last_ts_error = f"HTTP {wl_status} ({err_body[:180]})" if wl_status else "Popup Timesheet không đóng sau khi bấm Lưu"
                logger.warning(f"[TICKET_BATCH] #{ticket_id}: Lần thử {ts_attempt + 1} ngày {candidate_display} thất bại: {last_ts_error}")
                remaining_hours[candidate_day] = 0.0
                await asyncio.sleep(0.3)

            if not ts_saved:
                # Đóng popup trước khi ném lỗi để tránh kẹt trạng thái
                try:
                    cancel_ts = active_container.locator("button:has-text('Hủy'), button:has-text('Đóng')").first
                    if await cancel_ts.count() > 0 and await cancel_ts.is_visible():
                        await cancel_ts.click(force=True)
                except Exception:
                    pass
                raise RuntimeError(f"Không thể lưu Timesheet cho ticket #{ticket_id}: {last_ts_error}")

            await asyncio.sleep(0.3)

        # 3. Phân loại: chọn 'Yêu cầu' (radio value='2' trong #basic_typeTicket, tránh nhầm với CategoryField_radio)
        try:
            is_checked = await page.evaluate("""() => {
                const scoped = document.querySelector("#basic_typeTicket input[type='radio'][value='2']");
                if (scoped) {
                    if (scoped.checked) return true;
                    const w = scoped.closest('.ant-radio-wrapper') || scoped.closest('.ant-radio');
                    return !!(w && (w.classList.contains('ant-radio-wrapper-checked') || w.classList.contains('ant-radio-checked')));
                }
                const labels = Array.from(document.querySelectorAll('label.ant-radio-wrapper'));
                const yc = labels.find(l => (l.textContent || '').trim() === 'Yêu cầu');
                return !!(yc && yc.classList.contains('ant-radio-wrapper-checked'));
            }""")

            if not is_checked:
                # Lưu ý: GPMS lồng <label for=""> bên trong label.ant-radio-wrapper nên click wrapper bị nuốt click;
                # bắt buộc click trực tiếp vào input[type='radio'][value='2'] hoặc span.ant-radio bên trong #basic_typeTicket
                radio_input = page.locator("#basic_typeTicket input[type='radio'][value='2']").first
                if await radio_input.count() > 0:
                    try:
                        await radio_input.click(timeout=10000)
                    except Exception:
                        await radio_input.click(force=True)
                else:
                    yc_span = page.locator("label.ant-radio-wrapper:has-text('Yêu cầu') input[type='radio'], label.ant-radio-wrapper:has-text('Yêu cầu') span.ant-radio").first
                    if await yc_span.count() > 0:
                        try:
                            await yc_span.click(timeout=10000)
                        except Exception:
                            await yc_span.click(force=True)
                await asyncio.sleep(0.3)
        except Exception as err_radio:
            logger.warning(f"[TICKET_BATCH] Lỗi chọn radio 'Yêu cầu' ticket {ticket_id} (tiếp tục quy trình): {err_radio}")

        # 4. Danh mục công việc: chọn theo xoay vòng (0 -> 5., 1 -> 2., 2 -> 3.)
        cat_kw = "5. Các Danh Mục" if (ticket_index % 3 == 0) else ("2 MEMO" if (ticket_index % 3 == 1) else "3 Hướng dẫn")
        cat_card = page.locator(f".ItemCategoryUpdate_itemCategoryJob__QRmlI:has-text('{cat_kw}'), div[class*='ItemCategoryUpdate']:has-text('{cat_kw}')").first
        if await cat_card.count() > 0:
            try:
                await cat_card.scroll_into_view_if_needed(timeout=10000)
                await cat_card.click(timeout=12000)
            except Exception:
                try:
                    await cat_card.click(force=True, timeout=10000)
                except Exception:
                    await cat_card.evaluate("el => el.click()")
            await asyncio.sleep(0.5)

            # Xác nhận popup thay đổi SLA nếu có
            confirm_modal = page.locator(".ant-modal:has-text('Bạn có muốn thay đổi ngày YCHT'), .ant-modal:has-text('thay đổi')").first
            if await confirm_modal.count() > 0 and await confirm_modal.is_visible():
                btn_ok = confirm_modal.locator("button:has-text('Xác nhận'), button:has-text('OK')").first
                if await btn_ok.count() > 0:
                    try:
                        await btn_ok.click(timeout=10000)
                    except Exception:
                        await btn_ok.click(force=True)
                    await asyncio.sleep(0.5)

        # 5. Lắng nghe trực tiếp API PUT /api/tasks/{ticket_id} + kéo xuống dưới cùng bấm Lưu ticket
        task_put_result: Dict[str, Any] = {"done": False, "ok": False, "error": ""}
        api_task_marker = f"/api/tasks/{ticket_id}"

        async def _on_task_put_resp(resp):
            try:
                if resp.request.method == "PUT" and api_task_marker in resp.url:
                    body_json: Dict[str, Any] = {}
                    body_txt = ""
                    try:
                        body_txt = await resp.text()
                        if body_txt:
                            body_json = json.loads(body_txt)
                    except Exception:
                        pass

                    code_val = str(body_json.get("code", "")) if isinstance(body_json, dict) else ""
                    status_str = str(body_json.get("status", "")).lower() if isinstance(body_json, dict) else ""
                    if resp.status in (200, 201) and (code_val in ("", "200") or status_str == "success"):
                        task_put_result["ok"] = True
                    else:
                        msg = ""
                        if isinstance(body_json, dict):
                            msg = str(body_json.get("message") or body_json.get("detail") or body_json.get("error") or "")
                        task_put_result["error"] = msg or body_txt[:200] or f"HTTP {resp.status}"
                    task_put_result["done"] = True
            except Exception:
                pass

        put_listener = _on_task_put_resp
        page.on("response", put_listener)

        await page.keyboard.press("End")
        await asyncio.sleep(0.3)
        save_btn = page.locator(".DetailTicket_btnSave__36RtV, div[class*='DetailTicket_btnSave']").first
        if await save_btn.count() > 0:
            try:
                await save_btn.scroll_into_view_if_needed(timeout=8000)
                await save_btn.click(timeout=15000)
            except Exception:
                await save_btn.click(force=True, timeout=10000)
            await asyncio.sleep(0.6)

        # Xử lý nếu có popup xác nhận sau khi Lưu (VD: Modal hỏi 'Bạn có chắc chắn?' hoặc cảnh báo ngày YCHT rơi vào cuối tuần)
        try:
            post_modal = page.locator(".ant-modal:visible, .ant-modal-confirm:visible").first
            if await post_modal.count() > 0 and await post_modal.is_visible():
                post_btn = post_modal.locator("button:has-text('Xác nhận'), button:has-text('Tiếp tục'), button:has-text('Đồng ý'), button:has-text('OK'), button.ant-btn-primary").first
                if await post_btn.count() > 0:
                    await post_btn.click(force=True)
                    await asyncio.sleep(0.5)
        except Exception:
            pass

        # 6. Kiểm tra xác nhận lưu qua HTTP PUT /api/tasks/{id} hoặc toast (react-hot-toast [role='status'] + AntD)
        success_toast = page.locator(
            '[role="status"]:has-text("thành công"), '
            '.ant-message-success, .ant-notification-notice-success, '
            'div[class*="ant-message"]:has-text("thành công"), '
            'div[class*="ant-notification"]:has-text("thành công")'
        ).first
        error_toast = page.locator(
            '[role="status"]:has-text("lỗi"), [role="status"]:has-text("thất bại"), [role="status"]:has-text("không thể"), '
            '.ant-message-error, .ant-notification-notice-error, div[class*="ant-message-error"]'
        ).first

        ticket_saved = False
        for _ in range(45):  # 45 * 0.3s ~= 13.5s
            if task_put_result["done"]:
                if task_put_result["ok"]:
                    logger.info(f"[TICKET_BATCH] #{ticket_id}: API PUT {api_task_marker} xác nhận lưu thành công.")
                    ticket_saved = True
                    break
                err_api = task_put_result["error"]
                logger.error(f"[TICKET_BATCH] #{ticket_id}: API PUT báo lỗi khi lưu: {err_api}")
                raise RuntimeError(f"GPMS báo lỗi khi lưu: {err_api}")

            if await error_toast.count() > 0 and await error_toast.is_visible():
                err_msg = (await error_toast.inner_text() or "").strip()
                if err_msg:
                    logger.error(f"[TICKET_BATCH] #{ticket_id}: GPMS báo lỗi khi lưu: {err_msg}")
                    raise RuntimeError(f"GPMS báo lỗi: {err_msg}")

            if await success_toast.count() > 0 and await success_toast.is_visible():
                succ_msg = (await success_toast.inner_text() or "").strip()
                logger.info(f"[TICKET_BATCH] #{ticket_id}: GPMS xác nhận lưu thành công (toast): {succ_msg}")
                ticket_saved = True
                break

            await asyncio.sleep(0.3)

        if not ticket_saved:
            raise RuntimeError(f"GPMS không trả về xác nhận lưu thành công cho ticket #{ticket_id}")

        # Chờ ngắn 1.0s để transaction commit ổn định trước khi chuyển ticket kế tiếp
        await asyncio.sleep(1.0)

        # Cập nhật remaining_hours theo đúng ngày thực tế đã gửi lên GPMS
        remaining_hours[used_day] = max(0.0, remaining_hours[used_day] - 1.0)

        return {
            "ticket_id": ticket_id,
            "ticket_name": ticket.get("ticket_name", f"Ticket #{ticket_id}"),
            "status": "success",
            "message": f"Đã hoàn thành (Ngày {used_day_display}, {category[:35]}...)",
            "day_used": used_day_display,
            "category_used": category,
            "remaining_after": remaining_hours[used_day],
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
    finally:
        if put_listener is not None:
            try:
                page.remove_listener("response", put_listener)
            except Exception:
                pass


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


def _is_gprocess_step_completed(step_text: str) -> bool:
    """Kiểm tra bước IT xác nhận trên thanh Tiến trình đã hoàn thành/không duyệt hay vẫn đang thực hiện."""
    low = (step_text or "").lower()
    if not low.strip():
        return False
    if "đang thực hiện" in low or "chưa thực hiện" in low:
        return False
    return ("không duyệt" in low) or ("hoàn thành" in low)


def _verify_gprocess_mission_completed(
    mission_id: str,
    curr_url: str,
    step2_text: str,
    confirm_disabled: bool,
    mission_api_succeeded: bool,
) -> bool:
    """
    Chỉ xác nhận đóng G-Process thành công dựa trên tín hiệu thật từ GPMS:
    - URL rời trang chi tiết /my-mission/{id}, HOẶC
    - API process-gpms cập nhật task trả về HTTP 200/201, HOẶC
    - Bước 'IT xác nhận lỗi kỹ thuật' đổi khỏi 'Đang thực hiện' (Không duyệt / Hoàn thành) và nút Xác nhận bị khóa.
    Không bao giờ lấy toast lưu Timesheet làm căn cứ hoàn tất nhiệm vụ!
    """
    if "my-mission" in (curr_url or "") and mission_id and mission_id not in curr_url:
        return True
    if mission_api_succeeded:
        return True
    if confirm_disabled and _is_gprocess_step_completed(step2_text):
        return True
    return False


async def _handle_gprocess_popups_and_resubmit(detail_page, mission_id: str) -> bool:
    """
    Xử lý các popup liên tiếp sau khi bấm 'Xác nhận' (Khai báo Timesheet 0h, modal Xác nhận).
    Trả về True nếu vừa lưu modal Khai báo Timesheet (vì GPMS Pn() thoát sớm ở lần bấm đầu
    nên cần bấm 'Xác nhận' lần 2 để thực sự gửi handleUpdateTask).
    """
    timesheet_saved = False
    for modal_step in range(5):
        await asyncio.sleep(0.8)
        visible_modal = detail_page.locator(
            'div[class*="container_content_modal"]:visible, .ant-modal:visible, .ant-modal-content:visible'
        ).first
        if await visible_modal.count() == 0 or not await visible_modal.is_visible():
            break

        modal_text = ""
        try:
            modal_text = (await visible_modal.inner_text()).lower()
        except Exception:
            pass
        logger.info(f"[GPROCESS] #{mission_id} (modal step {modal_step+1}): Phát hiện modal: {modal_text[:100]}...")

        time_inputs = visible_modal.locator(
            'input[name*="actual_time"], input[name*="time"], input[name*="hour"], input[type="number"]'
        )
        has_time_input = await time_inputs.count() > 0
        if "timesheet" in modal_text or "thời gian" in modal_text or "khai báo" in modal_text or has_time_input:
            logger.info(f"[GPROCESS] #{mission_id}: Phát hiện popup Khai báo Timesheet -> Để thời gian HTTT là 0.")
            try:
                await visible_modal.evaluate("""(modal) => {
                    const rows = modal.querySelectorAll('tbody tr, .ant-table-row, div[class*="row"]');
                    if (rows && rows.length > 0) {
                        rows.forEach(r => {
                            const inputs = r.querySelectorAll('input:not([type="hidden"])');
                            if (inputs.length >= 3) {
                                if (!inputs[1].value || inputs[1].value.trim() === '') {
                                    inputs[1].value = '1';
                                    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
                                    inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
                                }
                                inputs[2].value = '0';
                                inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
                                inputs[2].dispatchEvent(new Event('change', { bubbles: true }));
                                if (inputs.length >= 4 && (!inputs[3].value || inputs[3].value.trim() === '')) {
                                    inputs[3].value = '-';
                                    inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
                                    inputs[3].dispatchEvent(new Event('change', { bubbles: true }));
                                }
                            }
                        });
                    }
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

            for t_idx in range(await time_inputs.count()):
                try:
                    t_inp = time_inputs.nth(t_idx)
                    name_attr = (await t_inp.get_attribute("name") or "").lower()
                    if any(k in name_attr for k in ["quantity", "count", "so_lan", "solan", "sp"]):
                        continue
                    await t_inp.fill("0")
                    await asyncio.sleep(0.05)
                except Exception:
                    pass

            note_inputs = visible_modal.locator(
                'input[name*="note"], textarea[name*="note"], input[placeholder*="Ghi chú"], textarea'
            )
            for n_idx in range(await note_inputs.count()):
                try:
                    n_inp = note_inputs.nth(n_idx)
                    n_val = await n_inp.input_value()
                    if not n_val or n_val.strip() == "":
                        await n_inp.fill("-")
                        await asyncio.sleep(0.05)
                except Exception:
                    pass

            save_btn = visible_modal.locator(
                'button:has-text("Lưu"), button.ant-btn-primary:has-text("Lưu"), button:has-text("Xác nhận"), button:has-text("Đồng ý")'
            ).first
            if await save_btn.count() > 0:
                await save_btn.click(timeout=15000)
                timesheet_saved = True
                logger.info(f"[GPROCESS] #{mission_id}: Đã bấm 'Lưu' Timesheet (HTTT = 0), chờ modal đóng để xác nhận lần 2.")
                try:
                    await visible_modal.wait_for(state="hidden", timeout=8000)
                except Exception:
                    pass
                await asyncio.sleep(1.0)
            continue

        confirm_modal_btn = visible_modal.locator(
            'button:has-text("Đồng ý"), button:has-text("Xác nhận"), button:has-text("OK"), button.ant-btn-primary'
        ).first
        if await confirm_modal_btn.count() > 0:
            btn_txt = await confirm_modal_btn.inner_text()
            logger.info(f"[GPROCESS] #{mission_id}: Bấm xác nhận trên popup ('{btn_txt}').")
            await confirm_modal_btn.click(timeout=15000)
            await asyncio.sleep(1.2)
            continue
    return timesheet_saved


async def _close_gprocess_mission(page, context, mission: Dict[str, Any]) -> Dict[str, Any]:
    """
    Xử lý 1 nhiệm vụ G-Process:
    - Mở chi tiết nhiệm vụ (qua URL trực tiếp hoặc click từ bảng my-mission)
    - Check đúng radio thứ 2 ('Không đạt') trong hàng checklist (tự mở ô 'Viết bình luận')
    - Điền feedback_message & blur để lưu comment checklist
    - Chọn 'Không phê duyệt' và 'Kết thúc quy trình' (click đúng input/span AntD)
    - Bấm 'Xác nhận', xử lý modal Khai báo Timesheet 0h, sau đó bấm 'Xác nhận' lần 2 nếu cần
    - Xác thực hoàn tất thực tế từ URL / API process-gpms / Tiến trình bước 02
    """
    mission_id = str(mission.get("ticket_id", "")).strip()
    target_url = mission.get("url") or f"https://gpms.ggg.com.vn/g-process/my-mission/{mission_id}"
    feedback_message = "Dear NH, Với xác nhận lỗi hạ tầng, Nhà Hàng vui lòng gửi ticket tới huy.ld nhé"
    
    logger.info(f"[GPROCESS] Bắt đầu xử lý nhiệm vụ G-Process #{mission_id} ({target_url})...")
    detail_page = page
    opened_new_page = False
    gp_resp_listener = None
    mission_api_state: Dict[str, Any] = {"succeeded": False, "error": None}

    try:
        # 1. Mở trang chi tiết:
        navigated = False
        if mission_id and mission_id.isdigit():
            try:
                detail_page = await context.new_page()
                opened_new_page = True
                await detail_page.goto(target_url, timeout=120000)
                try:
                    await detail_page.wait_for_selector(
                        'button:has-text("Xác nhận"), label:has-text("Không đạt"), label:has-text("Không phê duyệt"), label:has-text("Phê duyệt")',
                        timeout=40000
                    )
                except Exception:
                    pass
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

        try:
            detail_page.set_default_timeout(40000)
        except Exception:
            pass

        # Theo dõi API submit G-Process thực tế (loại trừ API worklog / comment / dynamic-forms)
        async def _on_gp_response(resp):
            try:
                req = resp.request
                if req.method not in ("POST", "PUT", "PATCH"):
                    return
                r_url = resp.url.lower()
                if "process-gpms" not in r_url or "/tasks" not in r_url:
                    return
                if any(ex in r_url for ex in ("worklog", "comment", "assign")):
                    return
                if resp.status in (200, 201):
                    mission_api_state["succeeded"] = True
                    logger.info(f"[GPROCESS] #{mission_id}: API cập nhật G-Process trả HTTP {resp.status} ({req.url}).")
                elif resp.status >= 400:
                    err_txt = ""
                    try:
                        err_txt = await resp.text()
                    except Exception:
                        pass
                    mission_api_state["error"] = f"HTTP {resp.status}: {err_txt[:200]}"
            except Exception:
                pass

        gp_resp_listener = _on_gp_response
        detail_page.on("response", gp_resp_listener)

        # Kiểm tra bước 'IT xác nhận lỗi kỹ thuật' trực tiếp trong vùng ProcessStatus_stepContainer (tránh đụng #root chứa bước 01 Hoàn thành)
        step2_loc = detail_page.locator('[class*="ProcessStatus_stepContainer"]:has-text("IT xác nhận lỗi kỹ thuật")').first
        is_already_done = False
        try:
            if await step2_loc.count() > 0:
                step_txt = await step2_loc.inner_text()
                is_already_done = _is_gprocess_step_completed(step_txt)
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

        # 1.1. KIỂM TRA PHÒNG VỆ TUYỆT ĐỐI (TRƯỚC KHI THAO TÁC FORM)
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

        # 2. Check đúng ô radio 'Không đạt' trong hàng checklist (radio thứ 2 của [class*="checkListItem"])
        chk_radios = detail_page.locator('[class*="checkListItem"] label.ant-radio-wrapper')
        if await chk_radios.count() >= 2:
            no_pass_radio = chk_radios.nth(1)
            await no_pass_radio.wait_for(state="visible", timeout=12000)
            await no_pass_radio.scroll_into_view_if_needed(timeout=5000)
            cls_now = (await no_pass_radio.get_attribute("class")) or ""
            if "ant-radio-wrapper-checked" not in cls_now:
                await no_pass_radio.click(timeout=8000)
                await asyncio.sleep(0.5)
            cls_after = (await no_pass_radio.get_attribute("class")) or ""
            if "ant-radio-wrapper-checked" not in cls_after:
                await no_pass_radio.locator("span.ant-radio, input.ant-radio-input").first.click(force=True)
                await asyncio.sleep(0.5)
            logger.info(f"[GPROCESS] #{mission_id}: Đã chọn radio 'Không đạt' trong hàng checklist.")
        else:
            raise RuntimeError("Không tìm thấy radio 'Không đạt' trong hàng Checklist của G-Process.")

        # 3. Nhập nội dung phản hồi vào textarea styles_checkListComment và blur để GPMS gọi handleSubmitComment
        ta_selector = 'textarea.styles_checkListComment__kiJXw, [class*="checkListItemContainer"] textarea, textarea[placeholder*="Viết bình luận"], textarea:not([disabled]):not([readonly])'
        active_ta = detail_page.locator(ta_selector).first
        if await active_ta.count() == 0 or not await active_ta.is_visible():
            comment_icon = detail_page.locator('[class*="checkListItem"] [class*="commentIcon"] svg').first
            if await comment_icon.count() > 0:
                await comment_icon.click(force=True)
                await asyncio.sleep(0.5)

        if await active_ta.count() > 0 and await active_ta.is_visible():
            await active_ta.scroll_into_view_if_needed(timeout=5000)
            await active_ta.click()
            await active_ta.fill(feedback_message)
            try:
                await active_ta.blur()
            except Exception:
                await detail_page.locator('[class*="checkListLabel"]').first.click()
            await asyncio.sleep(0.8)
            logger.info(f"[GPROCESS] #{mission_id}: Đã điền và lưu nội dung phản hồi Checklist.")
        else:
            raise RuntimeError("Không mở được ô nhập bình luận Checklist trên G-Process.")

        # 4. Chọn 'Không phê duyệt' (nếu chưa auto-check sau Không đạt) & 'Kết thúc quy trình' (tránh bẫy nested <label for="">)
        kpd_wrapper = detail_page.locator('label.ant-radio-wrapper:has-text("Không phê duyệt")').first
        await kpd_wrapper.wait_for(state="visible", timeout=12000)
        kpd_cls = (await kpd_wrapper.get_attribute("class")) or ""
        if "ant-radio-wrapper-checked" not in kpd_cls:
            await kpd_wrapper.locator("span.ant-radio, input.ant-radio-input").first.click(force=True)
            await asyncio.sleep(0.6)
        logger.info(f"[GPROCESS] #{mission_id}: Đã chọn 'Không phê duyệt'.")

        kt_wrapper = detail_page.locator('label.ant-radio-wrapper:has-text("Kết thúc quy trình")').first
        await kt_wrapper.wait_for(state="visible", timeout=10000)
        await kt_wrapper.scroll_into_view_if_needed(timeout=5000)
        kt_cls = (await kt_wrapper.get_attribute("class")) or ""
        if "ant-radio-wrapper-checked" not in kt_cls:
            await kt_wrapper.locator("span.ant-radio, input.ant-radio-input").first.click(force=True)
            await asyncio.sleep(0.5)
        kt_cls_after = (await kt_wrapper.get_attribute("class")) or ""
        if "ant-radio-wrapper-checked" not in kt_cls_after:
            raise RuntimeError("Không thể kích hoạt lựa chọn 'Kết thúc quy trình' trên GPMS.")
        logger.info(f"[GPROCESS] #{mission_id}: Đã chọn chính xác 'Kết thúc quy trình'.")

        # 5. Bấm nút "Xác nhận" lần 1
        confirm_btn = detail_page.locator(
            'button:has-text("Xác nhận"):not([disabled]), button[type="submit"]:has-text("Xác nhận"):not([disabled]), .ant-btn-primary:has-text("Xác nhận"):not([disabled])'
        ).last
        await confirm_btn.wait_for(state="visible", timeout=12000)
        await confirm_btn.scroll_into_view_if_needed(timeout=5000)
        await confirm_btn.click(timeout=10000)
        logger.info(f"[GPROCESS] #{mission_id}: Đã bấm nút 'Xác nhận' lần 1.")
        await asyncio.sleep(1.0)

        # 6. Xử lý popup (Khai báo Timesheet 0h, xác nhận); nếu mới chỉ lưu Timesheet thì bấm 'Xác nhận' lần 2 để thực thi handleUpdateTask
        timesheet_saved = await _handle_gprocess_popups_and_resubmit(detail_page, mission_id)
        if timesheet_saved:
            await asyncio.sleep(0.8)
            still_step2 = False
            try:
                if await step2_loc.count() > 0:
                    still_step2 = not _is_gprocess_step_completed(await step2_loc.inner_text())
                else:
                    still_step2 = mission_id in (detail_page.url or "")
            except Exception:
                still_step2 = True

            if still_step2 and not mission_api_state["succeeded"] and await confirm_btn.count() > 0 and await confirm_btn.is_visible():
                await confirm_btn.scroll_into_view_if_needed(timeout=5000)
                await confirm_btn.click(timeout=10000)
                logger.info(f"[GPROCESS] #{mission_id}: Đã bấm nút 'Xác nhận' lần 2 sau khi khai báo Timesheet 0h.")
                await asyncio.sleep(1.0)
                await _handle_gprocess_popups_and_resubmit(detail_page, mission_id)

        # 7. Xác thực kết quả hoàn tất thực tế (KHÔNG dùng toast của Timesheet để báo Thành công giả)
        error_toast = detail_page.locator(
            '[role="status"]:has-text("lỗi"), [role="status"]:has-text("thất bại"), [role="status"]:has-text("không thể"), '
            '[role="status"]:has-text("yêu cầu"), [role="status"]:has-text("vui lòng"), [role="status"]:has-text("thiếu"), '
            '.ant-message-error, .ant-message-warning, .ant-notification-notice-error, div[class*="ant-message-error"]'
        ).first

        is_success = False
        for _ in range(42):  # ~14.7s
            if mission_api_state["error"]:
                raise RuntimeError(f"GPMS API từ chối lưu nhiệm vụ: {mission_api_state['error']}")

            if await error_toast.count() > 0 and await error_toast.is_visible():
                err_msg = (await error_toast.inner_text() or "").strip()
                if err_msg:
                    logger.error(f"[GPROCESS] #{mission_id}: GPMS trả về thông báo lỗi/validation: {err_msg}")
                    raise RuntimeError(f"GPMS báo lỗi: {err_msg}")

            curr_url = detail_page.url
            step2_txt = ""
            try:
                if await step2_loc.count() > 0:
                    step2_txt = await step2_loc.inner_text()
            except Exception:
                pass
            confirm_disabled = False
            try:
                btn_any = detail_page.locator('button:has-text("Xác nhận")').last
                if await btn_any.count() > 0:
                    confirm_disabled = bool(await btn_any.is_disabled())
            except Exception:
                pass

            if _verify_gprocess_mission_completed(
                mission_id=mission_id,
                curr_url=curr_url,
                step2_text=step2_txt,
                confirm_disabled=confirm_disabled,
                mission_api_succeeded=bool(mission_api_state["succeeded"]),
            ):
                logger.info(f"[GPROCESS] #{mission_id}: Xác thực hoàn tất thực tế trên GPMS (URL={curr_url}, API={mission_api_state['succeeded']}).")
                is_success = True
                break

            await asyncio.sleep(0.35)

        if not is_success:
            raise RuntimeError(
                "GPMS chưa ghi nhận hoàn tất nhiệm vụ (vui lòng kiểm tra Checklist/Bình luận/Kết thúc quy trình hoặc popup trên GPMS)"
            )

        await asyncio.sleep(2.0)

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
        if gp_resp_listener is not None:
            try:
                detail_page.remove_listener("response", gp_resp_listener)
            except Exception:
                pass
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
                            result = await _close_ticket(page, item, idx, remaining_hours, username, password)

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
                        result = await _close_ticket(page, ticket, idx, remaining_hours, username, password)
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
