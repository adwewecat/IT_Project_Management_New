from __future__ import annotations
import os
import re
import json
import logging
import secrets
import string
import urllib.parse
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple

import httpx
from playwright.async_api import async_playwright, Page, BrowserContext, Browser
from sqlalchemy.orm import Session
from sqlalchemy import select, text

from app.models.user_sso_config import UserSSOConfig
from app.schemas.sso_management import IAMUserItem

logger = logging.getLogger(__name__)

# Bỏ qua kiểm tra phiên bản Windows cho Node.js / Playwright
os.environ["NODE_SKIP_PLATFORM_CHECK"] = "1"

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
SSO_SESSIONS_DIR = os.path.join(DATA_DIR, "sso_sessions")
os.makedirs(SSO_SESSIONS_DIR, exist_ok=True)

DEFAULT_14_CLIENTS = [
    "Chatbot cho hệ thống GPMS và G-Office (Phân quyền người dùng)",
    "Client Gương Thần API (Phân quyền người dùng)",
    "Client Gương Thần App (Phân quyền người dùng)",
    "Hệ thống G-Office ( Phân quyền người dùng)",
    "Hệ thống Quick Ticket",
    "Hệ thống GChecklist",
    "GStars_App_RM_PROD - Client dự án Gstars APP cho RM - PROD",
    "GStars_Web_RM_PROD - Webadmin dự án GStars App RM - PROD",
    "G Survey hệ thống khảo sát",
    "Hệ thống G-PMS",
    "Gstar Mobile App Client - Donot delete",
    "GHERO_Hệ thống Ghero",
    "ggg_sso_pim_created_date_19102021",
    "SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete",
]

DEFAULT_NCC_CLIENTS = [
    "Hệ thống GChecklist",
    "PoPortal_Hệ thống đặt hàng Hồ Chí Minh",
    "Hệ thống E-Bidding",
    "SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete",
]


def _normalize_text(val: str) -> str:
    """Chuẩn hóa chuỗi văn bản để so khớp tên client không bị lệch dấu cách hay ký tự ẩn"""
    if not val:
        return ""
    return re.sub(r"\s+", " ", val).strip().lower()


def generate_compliant_password(length: int = 10) -> str:
    """
    Tạo mật khẩu ngẫu nhiên đạt chuẩn:
    - Độ dài ít nhất 8 ký tự (mặc định 10).
    - Ít nhất 1 chữ hoa.
    - Ít nhất 1 chữ thường.
    - Ít nhất 1 số.
    - Ít nhất 1 ký tự đặc biệt (@#$!%&*).
    """
    specials = "@#$!%&*?"
    upper = secrets.choice(string.ascii_uppercase)
    lower = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice(specials)

    all_chars = string.ascii_letters + string.digits + specials
    remaining_length = max(length - 4, 4)
    remaining = [secrets.choice(all_chars) for _ in range(remaining_length)]

    pwd_chars = [upper, lower, digit, special] + remaining
    # Trộn ngẫu nhiên
    for i in range(len(pwd_chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        pwd_chars[i], pwd_chars[j] = pwd_chars[j], pwd_chars[i]

    return "".join(pwd_chars)


def _setup_playwright_browsers_path() -> None:
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
                p = os.path.join(users_root, u, "AppData", "Local", "ms-playwright")
                if os.path.isdir(p):
                    candidate_paths.append(p)
    except Exception:
        pass

    for path in candidate_paths:
        if os.path.isdir(path):
            try:
                subdirs = os.listdir(path)
                if any("chromium" in s.lower() or "chrome" in s.lower() for s in subdirs):
                    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = path
                    return
            except Exception:
                continue
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = r"C:\ms-playwright"


_setup_playwright_browsers_path()


def get_user_session_file(system_username: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", system_username.strip().lower())
    return os.path.join(SSO_SESSIONS_DIR, f"{clean}_session.json")


def clear_user_session(system_username: str) -> None:
    path = get_user_session_file(system_username)
    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception as e:
            logger.warning(f"Không thể xóa session file {path}: {e}")


def test_sso_credentials(sso_user: str, sso_pass: str) -> Tuple[bool, str]:
    """
    Kiểm tra nhanh thông tin đăng nhập SSO trực tiếp tại https://sso.ggg.com.vn/Account/Login
    bằng HTTP client để có phản hồi siêu nhanh trong 1-2 giây.
    """
    try:
        with httpx.Client(verify=False, follow_redirects=True, timeout=15) as client:
            r = client.get("https://sso.ggg.com.vn/Account/Login")
            token_match = re.search(r'name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"', r.text)
            if not token_match:
                token_match = re.search(r'value="([^"]+)"\s+name="__RequestVerificationToken"', r.text)
            token = token_match.group(1) if token_match else None
            if not token:
                return False, "Không trích xuất được mã xác thực Anti-Forgery từ hệ thống SSO."

            r_login = client.post(
                "https://sso.ggg.com.vn/Account/Login",
                data={
                    "Username": sso_user,
                    "Password": sso_pass,
                    "RememberLogin": "true",
                    "__RequestVerificationToken": token,
                    "button": "login",
                },
            )

            lower_res = r_login.text.lower()
            if (
                "tên đăng nhập hoặc mật khẩu không hợp lệ" in lower_res
                or "invalid username or password" in lower_res
                or "tài khoản của bạn đã bị khóa" in lower_res
            ):
                return False, "Tài khoản hoặc mật khẩu SSO không chính xác (hoặc tài khoản đã bị khóa)."

            # Nếu đăng nhập thành công, sso sẽ chuyển hướng khỏi Account/Login
            if "Account/Login" not in str(r_login.url):
                return True, "Đăng nhập SSO thành công!"

            # Nếu vẫn ở Account/Login mà không có báo lỗi rõ, kiểm tra text thông báo
            if "thông tin đăng nhập" in lower_res or "validation" in lower_res:
                return False, "Hệ thống SSO từ chối thông tin đăng nhập. Vui lòng kiểm tra lại."

            return True, "Đăng nhập SSO thành công!"
    except Exception as e:
        logger.error(f"Lỗi kiểm tra SSO login: {e}")
        return False, f"Lỗi khi kết nối tới SSO (https://sso.ggg.com.vn): {e}"


def get_user_sso_config(db: Session, system_username: str) -> Optional[UserSSOConfig]:
    clean_username = system_username.strip().lower()
    return db.scalar(select(UserSSOConfig).where(UserSSOConfig.system_username == clean_username))


def save_user_sso_config(
    db: Session, system_username: str, sso_username: str, sso_password: str
) -> Tuple[bool, str, UserSSOConfig]:
    """Lưu cấu hình SSO riêng cho từng user và kiểm tra đăng nhập ngay lập tức"""
    clean_sys_user = system_username.strip().lower()
    clean_sso_user = sso_username.strip()
    clean_sso_pass = sso_password.strip()

    # Xóa file session cũ của user để ép đăng nhập mới
    clear_user_session(clean_sys_user)

    # 1. Test login SSO
    ok, msg = test_sso_credentials(clean_sso_user, clean_sso_pass)

    # 2. Lưu vào DB
    cfg = get_user_sso_config(db, clean_sys_user)
    if not cfg:
        cfg = UserSSOConfig(
            system_username=clean_sys_user,
            sso_username=clean_sso_user,
            sso_password=clean_sso_pass,
            last_status="SUCCESS" if ok else "FAILED",
            last_tested_at=datetime.now(),
            ngay_cap_nhat=datetime.now(),
        )
        db.add(cfg)
    else:
        cfg.sso_username = clean_sso_user
        cfg.sso_password = clean_sso_pass
        cfg.last_status = "SUCCESS" if ok else "FAILED"
        cfg.last_tested_at = datetime.now()
        cfg.ngay_cap_nhat = datetime.now()

    db.commit()
    db.refresh(cfg)

    return ok, msg, cfg


async def _safe_wait_network_idle(page: Page, timeout_ms: int = 15000) -> None:
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except Exception:
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass


async def _create_user_playwright_context(
    playwright_instance: Any, system_username: str
) -> Tuple[Browser, BrowserContext]:
    _setup_playwright_browsers_path()
    browser = None
    launch_err = None
    try:
        browser = await playwright_instance.chromium.launch(headless=True)
    except Exception as e:
        launch_err = e
        for ch in ["msedge", "chrome"]:
            try:
                browser = await playwright_instance.chromium.launch(channel=ch, headless=True)
                break
            except Exception:
                pass
    if not browser:
        if launch_err:
            raise launch_err
        raise RuntimeError("Không thể khởi động trình duyệt Chromium cho tác vụ SSO.")

    session_file = get_user_session_file(system_username)
    if os.path.exists(session_file) and os.path.getsize(session_file) > 10:
        try:
            context = await browser.new_context(
                storage_state=session_file,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                ignore_https_errors=True,
            )
            context.set_default_timeout(45000)
            context.set_default_navigation_timeout(45000)
            return browser, context
        except Exception as e:
            logger.warning(f"Lỗi đọc session cache {session_file}: {e}, tạo context mới.")
            clear_user_session(system_username)

    context = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ignore_https_errors=True,
    )
    context.set_default_timeout(45000)
    context.set_default_navigation_timeout(45000)
    return browser, context


async def _ensure_iam_logged_in(
    page: Page, context: BrowserContext, system_username: str, sso_user: str, sso_pass: str
) -> None:
    """Đảm bảo page đã đăng nhập vào IAM, nếu bị chuyển sang trang SSO thì tự động điền form và lưu session"""
    if "sso.ggg.com.vn" in page.url or "Account/Login" in page.url:
        logger.info(f"Đang tự động đăng nhập SSO cho {system_username} ({sso_user})...")
        await page.wait_for_selector("#Username", timeout=15000)
        await page.fill("#Username", sso_user)
        await page.fill("#Password", sso_pass)
        await page.click("button[name='button'][value='login']")
        await _safe_wait_network_idle(page, 20000)

        if "sso.ggg.com.vn" in page.url and "login" in page.url.lower():
            clear_user_session(system_username)
            raise ValueError("Đăng nhập SSO thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu SSO của bạn.")

        # Lưu session vào file riêng của user
        session_file = get_user_session_file(system_username)
        try:
            await context.storage_state(path=session_file)
        except Exception as e:
            logger.warning(f"Lỗi lưu storage_state: {e}")


async def search_iam_users(
    system_username: str, sso_user: str, sso_pass: str, search_query: str
) -> Tuple[List[IAMUserItem], bool]:
    """Tìm kiếm user trên hệ thống IAM theo từ khóa"""
    encoded_search = urllib.parse.quote(search_query.strip())
    target_url = f"https://iam.ggg.com.vn/Identity/Users?search={encoded_search}&UserType=99"

    async with async_playwright() as p:
        browser, context = await _create_user_playwright_context(p, system_username)
        try:
            page = await context.new_page()
            await page.goto(target_url, wait_until="networkidle", timeout=30000)
            await _ensure_iam_logged_in(page, context, system_username, sso_user, sso_pass)

            # Đảm bảo đang ở trang kết quả IAM Users
            if "Identity/Users" not in page.url:
                await page.goto(target_url, wait_until="networkidle", timeout=30000)

            rows = page.locator("table tbody tr")
            count = await rows.count()
            logger.info(f"Tìm kiếm IAM user '{search_query}' ra {count} kết quả.")

            results: List[IAMUserItem] = []
            for i in range(count):
                row = rows.nth(i)
                cells = row.locator("td")
                cell_count = await cells.count()
                if cell_count < 6:
                    continue

                edit_link = cells.nth(0).locator("a")
                edit_href = (await edit_link.get_attribute("href")) or "" if await edit_link.count() > 0 else ""
                
                # Extract user_id from edit_href: /Identity/UserProfile/{guid}
                user_id = edit_href.split("/")[-1] if "/" in edit_href else edit_href

                username_text = (await cells.nth(2).inner_text()).strip()
                email_text = (await cells.nth(3).inner_text()).strip()
                phone_text = (await cells.nth(4).inner_text()).strip()
                lock_text = (await cells.nth(5).inner_text()).strip()
                type_text = (await cells.nth(6).inner_text()).strip() if cell_count > 6 else ""

                results.append(
                    IAMUserItem(
                        user_id=user_id,
                        user_name=username_text,
                        email=email_text,
                        phone_number=phone_text,
                        lock_enable=lock_text,
                        user_type=type_text,
                        edit_url=edit_href,
                    )
                )

            # Kiểm tra xem có phân trang hoặc nhiều hơn 10 kết quả không
            pagination_loc = page.locator('.pagination, ul.pagination, .pager')
            has_pagination = (await pagination_loc.count()) > 0
            has_more = has_pagination or (len(results) >= 10)

            return results, has_more
        finally:
            await browser.close()


async def change_iam_user_password(
    system_username: str, sso_user: str, sso_pass: str, user_id: str, custom_password: Optional[str] = None
) -> Dict[str, Any]:
    """
    Thực hiện đổi mật khẩu cho user:
    1. Truy cập /Identity/UserProfile/{user_id}
    2. Đọc UserType: nếu là 1 (AD/LDAP) -> dừng và trả về thông báo liên hệ Helpdesk
    3. Xóa Access Failed Count và đặt về 0.
    4. Xóa trắng Lockout End.
    5. Nhấn Save User.
    6. Nhấn Change Password, điền pass ngẫu nhiên đạt chuẩn, submit Change Password.
    7. Báo lại mật khẩu mới.
    """
    user_profile_url = f"https://iam.ggg.com.vn/Identity/UserProfile/{user_id}"

    async with async_playwright() as p:
        browser, context = await _create_user_playwright_context(p, system_username)
        try:
            page = await context.new_page()
            await page.goto(user_profile_url, wait_until="networkidle", timeout=30000)
            await _ensure_iam_logged_in(page, context, system_username, sso_user, sso_pass)

            if f"UserProfile/{user_id}" not in page.url:
                await page.goto(user_profile_url, wait_until="networkidle", timeout=30000)

            # Lấy thông tin User Type
            user_type_loc = page.locator("#UserType")
            user_type_val = ""
            if await user_type_loc.count() > 0:
                user_type_val = (await user_type_loc.input_value()).strip()

            target_username = ""
            username_loc = page.locator("#UserName")
            if await username_loc.count() > 0:
                target_username = (await username_loc.input_value()).strip()

            # Nếu là 1: LDAP/AD -> không cho đổi
            if user_type_val == "1":
                return {
                    "success": False,
                    "is_ldap": True,
                    "user_name": target_username,
                    "message": "Tài khoản này được đồng bộ từ LDAP qua, nên vui lòng liên hệ team Helpdesk để được đổi pass mail.",
                }

            # Đặt lại Access Failed Count = 0
            acc_failed_loc = page.locator("#AccessFailedCount")
            if await acc_failed_loc.count() > 0:
                await acc_failed_loc.fill("0")

            # Xóa trắng Lockout End
            lockout_end_loc = page.locator("#LockoutEnd")
            if await lockout_end_loc.count() > 0:
                await lockout_end_loc.fill("")

            # Nhấn Save User
            save_btn = page.locator("button.btn:has-text('Save User')").first
            if await save_btn.count() > 0:
                await save_btn.scroll_into_view_if_needed()
                await save_btn.click()
                await _safe_wait_network_idle(page, 15000)

            # Chuyển sang màn hình Change Password
            change_pwd_url = f"https://iam.ggg.com.vn/Identity/UserChangePassword/{user_id}"
            await page.goto(change_pwd_url, wait_until="networkidle", timeout=30000)

            new_pwd = custom_password.strip() if custom_password and custom_password.strip() else generate_compliant_password(10)

            await page.wait_for_selector("#Password", timeout=15000)
            await page.fill("#Password", new_pwd)
            await page.fill("#ConfirmPassword", new_pwd)

            submit_change_btn = page.locator("button[type='submit']:has-text('Change Password')").first
            await submit_change_btn.click()
            await _safe_wait_network_idle(page, 15000)

            # Kiểm tra lỗi validation nếu có
            validation_errors = page.locator(".text-danger, .validation-summary-errors")
            if await validation_errors.count() > 0:
                err_text = (await validation_errors.first.inner_text()).strip()
                if err_text:
                    return {
                        "success": False,
                        "is_ldap": False,
                        "user_name": target_username,
                        "message": f"Đổi mật khẩu không thành công: {err_text}",
                    }

            return {
                "success": True,
                "is_ldap": False,
                "user_name": target_username,
                "new_password": new_pwd,
                "message": f"Đã mở khóa và đổi mật khẩu thành công cho user '{target_username}'!",
            }
        finally:
            await browser.close()


async def assign_default_clients_to_user(
    system_username: str,
    sso_user: str,
    sso_pass: str,
    user_id: str,
    client_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Phân quyền client cho user trên IAM:
    1. Truy cập /Identity/UserClient/{user_id}
    2. Bật checkbox cho danh sách client đích
    3. Nhấn Save changes
    """
    user_client_url = f"https://iam.ggg.com.vn/Identity/UserClient/{user_id}"

    target_clients = [c.strip() for c in client_names if c.strip()] if client_names else DEFAULT_14_CLIENTS
    if not target_clients:
        raise ValueError("Danh sách client cần phân quyền không được để trống.")

    async with async_playwright() as p:
        browser, context = await _create_user_playwright_context(p, system_username)
        try:
            page = await context.new_page()
            await page.goto(user_client_url, wait_until="networkidle", timeout=30000)
            await _ensure_iam_logged_in(page, context, system_username, sso_user, sso_pass)

            if f"UserClient/{user_id}" not in page.url:
                await page.goto(user_client_url, wait_until="networkidle", timeout=30000)

            rows = page.locator("table tbody tr")
            count = await rows.count()
            logger.info(f"Bắt đầu phân quyền {len(target_clients)} client, tổng số client trong hệ thống: {count}")

            normalized_targets = [_normalize_text(c) for c in target_clients]
            checked_clients: List[str] = []

            for i in range(count):
                row = rows.nth(i)
                label_loc = row.locator("label.col-form-label")
                if await label_loc.count() > 0:
                    label_text = (await label_loc.inner_text()).strip()
                else:
                    tds = row.locator("td")
                    if await tds.count() > 1:
                        label_text = (await tds.nth(1).inner_text()).strip()
                    else:
                        label_text = (await row.inner_text()).strip()

                norm_label = _normalize_text(label_text)
                if not norm_label:
                    continue

                # So khớp: ưu tiên so khớp chính xác 100% trước, sau đó mới đến chứa chuỗi con
                matched_target = None
                for orig_target, norm_target in zip(target_clients, normalized_targets):
                    if norm_label == norm_target:
                        matched_target = orig_target
                        break
                if not matched_target:
                    for orig_target, norm_target in zip(target_clients, normalized_targets):
                        if norm_target in norm_label:
                            matched_target = orig_target
                            break

                if matched_target:
                    chk = row.locator("input[type='checkbox']")
                    if await chk.count() > 0:
                        is_checked = await chk.is_checked()
                        if not is_checked:
                            # Click switch để bật
                            switch_loc = row.locator("label.switch")
                            if await switch_loc.count() > 0:
                                await switch_loc.click()
                            else:
                                await chk.check(force=True)
                            # Kiểm tra lại, nếu vẫn chưa checked thì force check
                            try:
                                if not await chk.is_checked():
                                    await chk.check(force=True)
                            except Exception:
                                pass
                    if matched_target not in checked_clients:
                        checked_clients.append(matched_target)

            # Cuộn xuống cuối và nhấn Save changes
            save_btn = page.locator("button[type='submit']:has-text('Save changes'), button:has-text('Save changes'), input[type='submit'][value*='Save']").first
            if await save_btn.count() > 0:
                await save_btn.scroll_into_view_if_needed()
                await save_btn.click()
                await _safe_wait_network_idle(page, 15000)

            total_done = len(checked_clients) if checked_clients else len(target_clients)
            return {
                "success": True,
                "assigned_clients": checked_clients if checked_clients else target_clients,
                "total_assigned": total_done,
                "message": f"Đã phân quyền thành công {total_done} client cho user!",
            }
        finally:
            await browser.close()


def increment_phone_number(phone: str, step: int = 2) -> str:
    """Tăng số điện thoại lên +2, giữ nguyên độ dài và số 0 ở đầu."""
    clean = re.sub(r"[^\d]", "", phone.strip())
    if not clean:
        return "0908119345"
    num = int(clean) + step
    return str(num).zfill(len(clean))


async def check_iam_phone_exists(page: Page, phone_number: str) -> bool:
    """Kiểm tra số điện thoại đã tồn tại trên hệ thống IAM chưa."""
    clean_input_phone = re.sub(r"[^\d]", "", phone_number.strip())
    if not clean_input_phone:
        return False

    encoded_phone = urllib.parse.quote(clean_input_phone)
    search_url = f"https://iam.ggg.com.vn/Identity/Users?search={encoded_phone}&UserType=99"
    await page.goto(search_url, wait_until="networkidle", timeout=30000)

    rows = page.locator("table tbody tr")
    count = await rows.count()
    if count == 0:
        return False

    for i in range(count):
        row = rows.nth(i)
        cells = row.locator("td")
        if await cells.count() >= 5:
            # Cột 4 là Phone Number (0: Edit, 1: Send, 2: UserName, 3: Email, 4: Phone)
            tbl_phone = (await cells.nth(4).inner_text()).strip()
            clean_tbl_phone = re.sub(r"[^\d]", "", tbl_phone)
            if clean_tbl_phone and clean_tbl_phone == clean_input_phone:
                return True
            if clean_input_phone in clean_tbl_phone:
                return True
    return False


async def create_iam_ncc_user(
    system_username: str,
    sso_user: str,
    sso_pass: str,
    user_name: str,
    email: str,
    phone_number: str,
    auto_resolve_phone: bool = False,
    client_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Quy trình tự động tạo User NCC trên IAM:
    1. Kiểm tra SĐT có trùng trên IAM (https://iam.ggg.com.vn/Identity/Users?search={phone}&UserType=99).
       Nếu trùng và auto_resolve_phone=True thì tự động tăng +2 cho đến khi tìm được số trống.
    2. Đăng nhập SSO và bấm Add User.
    3. Điền: User Name, Email, User Phone Number, User Type=0, User Access Failed Count=0.
    4. Nhấn Save User.
    5. Vào User & Clients và bật 4 quyền mặc định (hoặc theo cấu hình):
       - Hệ thống GChecklist
       - PoPortal_Hệ thống đặt hàng Hồ Chí Minh
       - Hệ thống E-Bidding
       - SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete
    6. Lưu thay đổi và trả về kết quả.
    """
    clean_username = user_name.strip()
    clean_email = email.strip()
    current_phone = phone_number.strip()
    target_clients = [c.strip() for c in client_names if c.strip()] if client_names else DEFAULT_NCC_CLIENTS

    async with async_playwright() as p:
        browser, context = await _create_user_playwright_context(p, system_username)
        try:
            page = await context.new_page()

            # Đảm bảo đã login SSO và IAM
            await page.goto("https://iam.ggg.com.vn/Identity/Users", wait_until="networkidle", timeout=30000)
            await _ensure_iam_logged_in(page, context, system_username, sso_user, sso_pass)

            # 1.1 Kiểm tra trùng SĐT
            phone_exists = await check_iam_phone_exists(page, current_phone)
            if phone_exists:
                if not auto_resolve_phone:
                    return {
                        "success": False,
                        "is_duplicate_phone": True,
                        "phone_number": current_phone,
                        "message": f"Số điện thoại '{current_phone}' đã tồn tại trên hệ thống IAM. Bạn có thể tự đổi số khác hoặc chọn để hệ thống tự xử lý.",
                    }
                else:
                    logger.info(f"SĐT {current_phone} đã trùng, hệ thống tự động tìm số khả dụng...")
                    resolved = False
                    for _ in range(30):
                        current_phone = increment_phone_number(current_phone, 2)
                        if not await check_iam_phone_exists(page, current_phone):
                            resolved = True
                            logger.info(f"Tìm được SĐT khả dụng mới: {current_phone}")
                            break
                    if not resolved:
                        return {
                            "success": False,
                            "is_duplicate_phone": True,
                            "phone_number": current_phone,
                            "message": "Không tìm được số điện thoại khả dụng sau nhiều lần thử. Vui lòng nhập số khác thủ công.",
                        }

            # 2. Truy cập màn hình tạo mới User
            await page.goto("https://iam.ggg.com.vn/Identity/Users", wait_until="networkidle", timeout=30000)
            add_user_btn = page.locator("a:has-text('Add User'), button:has-text('Add User'), a[href*='Create']").first
            if await add_user_btn.count() > 0:
                await add_user_btn.click()
                await _safe_wait_network_idle(page, 20000)
            else:
                await page.goto("https://iam.ggg.com.vn/Identity/User/Create", wait_until="networkidle", timeout=30000)

            # Chờ form nhập liệu xuất hiện
            await page.wait_for_selector("#UserName, input[name='UserName']", timeout=20000)

            # 3. Điền thông tin User NCC
            # User Name
            await page.fill("#UserName, input[name='UserName']", clean_username)
            # Email
            await page.fill("#Email, input[name='Email']", clean_email)
            # User Phone Number
            phone_input = page.locator("#PhoneNumber, input[name='PhoneNumber']").first
            if await phone_input.count() > 0:
                await phone_input.fill(current_phone)
            # User Type luôn nhập 0 (Local)
            user_type_loc = page.locator("#UserType, input[name='UserType']").first
            if await user_type_loc.count() > 0:
                await user_type_loc.fill("0")
            # User Access Failed Count luôn nhập 0
            fail_count_loc = page.locator("#AccessFailedCount, input[name='AccessFailedCount']").first
            if await fail_count_loc.count() > 0:
                await fail_count_loc.fill("0")

            # 4. Kéo xuống dưới nhấn Save User
            save_btn = page.locator("button:has-text('Save User'), button[type='submit']:has-text('Save'), input[type='submit'][value*='Save']").first
            await save_btn.scroll_into_view_if_needed()
            await save_btn.click()
            await _safe_wait_network_idle(page, 20000)

            # Kiểm tra lỗi validation sau khi save
            val_errors = page.locator(".text-danger, .validation-summary-errors, .alert-danger")
            if await val_errors.count() > 0:
                err_texts = []
                for idx in range(await val_errors.count()):
                    txt = (await val_errors.nth(idx).inner_text()).strip()
                    if txt and not txt.startswith("*") and txt not in err_texts:
                        err_texts.append(txt)
                if err_texts:
                    return {
                        "success": False,
                        "is_duplicate_phone": False,
                        "phone_number": current_phone,
                        "message": f"Không thể tạo user trên IAM: {'; '.join(err_texts)}",
                    }

            # 5. Xác định User ID của user vừa tạo
            user_id = ""
            current_url = page.url
            match = re.search(r"/(?:UserProfile|Users?/Edit|UserClient|UserChangePassword)/([a-zA-Z0-9\-]+)", current_url)
            if match:
                user_id = match.group(1)

            if not user_id:
                user_client_btn = page.locator("a:has-text('User & Clients'), a[href*='UserClient'], a[href*='UserProfile'], a[href*='UserChangePassword']").first
                if await user_client_btn.count() > 0:
                    href = (await user_client_btn.get_attribute("href")) or ""
                    user_id = href.split("/")[-1] if "/" in href else ""

            if not user_id:
                # Nếu trang bị chuyển hướng về danh sách, tìm kiếm lại user vừa tạo để lấy user_id
                encoded_user = urllib.parse.quote(clean_username)
                await page.goto(f"https://iam.ggg.com.vn/Identity/Users?search={encoded_user}&UserType=99", wait_until="networkidle", timeout=30000)
                rows = page.locator("table tbody tr")
                if await rows.count() > 0:
                    edit_link = rows.first.locator("td").first.locator("a")
                    if await edit_link.count() > 0:
                        href = (await edit_link.get_attribute("href")) or ""
                        user_id = href.split("/")[-1] if "/" in href else href

            # 6. Vào UserProfile: Kiểm tra và tắt 'User Lockout Enabled' (đánh false để không khóa tài khoản)
            if user_id:
                profile_url = f"https://iam.ggg.com.vn/Identity/UserProfile/{user_id}"
                if f"UserProfile/{user_id}" not in page.url:
                    await page.goto(profile_url, wait_until="networkidle", timeout=30000)

                # Tìm checkbox/switch 'User Lockout Enabled'
                lockout_chk = page.locator("#LockoutEnabled, #UserLockoutEnabled, input[name='LockoutEnabled'], input[name='UserLockoutEnabled']").first
                if await lockout_chk.count() == 0:
                    label_loc = page.locator("label:has-text('User Lockout Enabled'), label:has-text('Lockout Enabled')").first
                    if await label_loc.count() > 0:
                        for_id = await label_loc.get_attribute("for")
                        if for_id:
                            lockout_chk = page.locator(f"#{for_id}").first
                        else:
                            cand = label_loc.locator("xpath=..").locator("input[type='checkbox']").first
                            if await cand.count() > 0:
                                lockout_chk = cand
                            else:
                                cand2 = label_loc.locator("xpath=../..").locator("input[type='checkbox']").first
                                if await cand2.count() > 0:
                                    lockout_chk = cand2

                if await lockout_chk.count() > 0:
                    is_lockout = await lockout_chk.is_checked()
                    logger.info(f"User Lockout Enabled của '{clean_username}' hiện tại: {is_lockout}")
                    if is_lockout:
                        switch_parent = lockout_chk.locator("xpath=..")
                        if await switch_parent.count() > 0 and "switch" in (await switch_parent.get_attribute("class") or ""):
                            await switch_parent.click()
                        else:
                            await lockout_chk.uncheck(force=True)
                        try:
                            if await lockout_chk.is_checked():
                                await lockout_chk.uncheck(force=True)
                        except Exception:
                            pass
                        logger.info("Đã chuyển User Lockout Enabled sang FALSE")

                # Đặt lại Access Failed Count = 0
                acc_failed_loc = page.locator("#AccessFailedCount, input[name='AccessFailedCount']").first
                if await acc_failed_loc.count() > 0:
                    await acc_failed_loc.fill("0")

                # Xóa trắng Lockout End
                lockout_end_loc = page.locator("#LockoutEnd, input[name='LockoutEnd']").first
                if await lockout_end_loc.count() > 0:
                    await lockout_end_loc.fill("")

                # Nhấn Save User để lưu cài đặt không khóa tài khoản
                save_profile_btn = page.locator("button.btn:has-text('Save User'), button[type='submit']:has-text('Save'), input[type='submit'][value*='Save']").first
                if await save_profile_btn.count() > 0:
                    await save_profile_btn.scroll_into_view_if_needed()
                    await save_profile_btn.click()
                    await _safe_wait_network_idle(page, 15000)
                    logger.info("Đã lưu User Profile (Lockout Enabled = False, AccessFailedCount = 0)")

            # 7. Đổi mật khẩu ngẫu nhiên đạt chuẩn cho User NCC
            new_random_password = generate_compliant_password(10)
            if user_id:
                change_pwd_url = f"https://iam.ggg.com.vn/Identity/UserChangePassword/{user_id}"
                await page.goto(change_pwd_url, wait_until="networkidle", timeout=30000)
                await page.wait_for_selector("#Password", timeout=15000)
                await page.fill("#Password", new_random_password)
                await page.fill("#ConfirmPassword", new_random_password)

                submit_pwd_btn = page.locator("button[type='submit']:has-text('Change Password'), button:has-text('Change Password')").first
                if await submit_pwd_btn.count() > 0:
                    await submit_pwd_btn.click()
                    await _safe_wait_network_idle(page, 15000)
                    logger.info(f"Đã đổi mật khẩu ngẫu nhiên thành công cho user NCC '{clean_username}'")

            # 8. Vào User & Clients và phân quyền Client
            if user_id:
                await page.goto(f"https://iam.ggg.com.vn/Identity/UserClient/{user_id}", wait_until="networkidle", timeout=30000)

            # Nếu đã vào được trang UserClient
            checked_clients: List[str] = []
            if "UserClient" in page.url or page.locator("table tbody tr").count() > 0:
                rows = page.locator("table tbody tr")
                count = await rows.count()
                normalized_targets = [_normalize_text(c) for c in target_clients]

                for i in range(count):
                    row = rows.nth(i)
                    label_loc = row.locator("label.col-form-label")
                    if await label_loc.count() > 0:
                        label_text = (await label_loc.inner_text()).strip()
                    else:
                        tds = row.locator("td")
                        label_text = (await tds.nth(1).inner_text()).strip() if await tds.count() > 1 else (await row.inner_text()).strip()

                    norm_label = _normalize_text(label_text)
                    if not norm_label:
                        continue

                    matched_target = None
                    for orig_target, norm_target in zip(target_clients, normalized_targets):
                        if norm_label == norm_target or norm_target in norm_label:
                            matched_target = orig_target
                            break

                    if matched_target:
                        chk = row.locator("input[type='checkbox']")
                        if await chk.count() > 0:
                            if not await chk.is_checked():
                                switch_loc = row.locator("label.switch")
                                if await switch_loc.count() > 0:
                                    await switch_loc.click()
                                else:
                                    await chk.check(force=True)
                                try:
                                    if not await chk.is_checked():
                                        await chk.check(force=True)
                                except Exception:
                                    pass
                        if matched_target not in checked_clients:
                            checked_clients.append(matched_target)

                # Nhấn Save changes
                save_client_btn = page.locator("button[type='submit']:has-text('Save changes'), button:has-text('Save changes'), input[type='submit'][value*='Save']").first
                if await save_client_btn.count() > 0:
                    await save_client_btn.scroll_into_view_if_needed()
                    await save_client_btn.click()
                    await _safe_wait_network_idle(page, 15000)

            return {
                "success": True,
                "user_name": clean_username,
                "email": clean_email,
                "phone_number": current_phone,
                "user_id": user_id,
                "new_password": new_random_password,
                "assigned_clients": checked_clients if checked_clients else target_clients,
                "is_duplicate_phone": False,
                "message": f"Tạo User NCC '{clean_username}' thành công, đã tắt Lockout, đổi mật khẩu và phân {len(checked_clients) or len(target_clients)} quyền client!",
            }
        finally:
            await browser.close()



def generate_sso_bulk_template() -> bytes:
    """Tạo file Excel mẫu theo chuẩn 7 cột cho Import Xử Lý Hàng Loạt IAM."""
    import openpyxl
    import io
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "DS_USER_IAM"

    # 7 Cột chuẩn hóa khớp 100% giao diện yêu cầu của người dùng
    headers = [
        "User Name",
        "Email",
        "User Type (0-Local,1-AD,2-Empl)",
        "User Phone Number",
        "Pass",
        "TRANG THAI",
        "UPDATE QUYEN"
    ]
    ws.append(headers)

    # Dòng mẫu hướng dẫn thực tế
    samples = [
        ["user_ncc_01", "ncc01@gmail.com", "0", "0908119345", "Ggg@2026!", "ON", "Hệ thống GChecklist, PoPortal_Hệ thống đặt hàng Hồ Chí Minh"],
        ["user_ncc_02", "ncc02@gmail.com", "0", "0908119347", "", "ON", "Client Gương Thần API (Phân quyền người dùng), Hệ thống E-Bidding"],
        ["000016", "g_000016@ggg.com.vn", "2", "0366093968", "MatKhauMoi@123", "", ""],
        ["user_can_khoa", "", "", "", "", "KHOA", ""]
    ]
    for row in samples:
        ws.append(row)

    # Định dạng Header
    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    for col_idx in range(1, len(headers) + 1):
        cell = ws.cell(row=1, column=col_idx)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    widths = [20, 32, 28, 22, 18, 16, 45]
    for idx, width in enumerate(widths, 1):
        col_letter = openpyxl.utils.get_column_letter(idx)
        ws.column_dimensions[col_letter].width = width

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def parse_sso_excel_file(file_bytes: bytes) -> List[Dict[str, Any]]:
    """Phân tích dữ liệu từ file Excel upload lên thành danh sách bản ghi chuẩn."""
    import openpyxl
    import io

    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []

    def _norm_hdr(s: Any) -> str:
        if not s:
            return ""
        return re.sub(r"[^a-zA-Z0-9]", "", str(s).lower())

    hdr_map: Dict[str, int] = {}
    for idx, col_val in enumerate(rows[0]):
        norm = _norm_hdr(col_val)
        if "username" in norm or ("user" in norm and "name" in norm):
            hdr_map["user_name"] = idx
        elif "email" in norm or "mail" in norm:
            hdr_map["email"] = idx
        elif "type" in norm:
            hdr_map["user_type"] = idx
        elif "phone" in norm or "sdt" in norm:
            hdr_map["phone_number"] = idx
        elif "pass" in norm:
            hdr_map["pass_word"] = idx
        elif "trangthai" in norm or "status" in norm:
            hdr_map["trang_thai"] = idx
        elif "quyen" in norm or "client" in norm:
            hdr_map["update_quyen"] = idx

    results: List[Dict[str, Any]] = []
    for r in rows[1:]:
        if not any(r):
            continue
        uname_idx = hdr_map.get("user_name", 0)
        u_name = str(r[uname_idx] or "").strip() if uname_idx < len(r) and r[uname_idx] is not None else ""

        email_idx = hdr_map.get("email", 1)
        email_val = str(r[email_idx] or "").strip() if email_idx < len(r) and r[email_idx] is not None else ""

        # Quy tắc: Bắt buộc ít nhất 1 trong 2 cột User Name hoặc Email phải có dữ liệu
        if not u_name and not email_val:
            continue

        results.append({
            "user_name": u_name,
            "email": email_val,
            "user_type": str(r[hdr_map["user_type"]] or "").strip() if "user_type" in hdr_map and hdr_map["user_type"] < len(r) and r[hdr_map["user_type"]] is not None else "0",
            "phone_number": str(r[hdr_map["phone_number"]] or "").strip() if "phone_number" in hdr_map and hdr_map["phone_number"] < len(r) and r[hdr_map["phone_number"]] is not None else "",
            "pass_word": str(r[hdr_map["pass_word"]] or "").strip() if "pass_word" in hdr_map and hdr_map["pass_word"] < len(r) and r[hdr_map["pass_word"]] is not None else "",
            "trang_thai": str(r[hdr_map["trang_thai"]] or "").strip() if "trang_thai" in hdr_map and hdr_map["trang_thai"] < len(r) and r[hdr_map["trang_thai"]] is not None else "",
            "update_quyen": str(r[hdr_map["update_quyen"]] or "").strip() if "update_quyen" in hdr_map and hdr_map["update_quyen"] < len(r) and r[hdr_map["update_quyen"]] is not None else "",
        })

    return results


async def set_user_lockout_fields(
    page: Page,
    lockout_enabled: bool,
    access_failed_count: int,
    lockout_end: Optional[str] = None
) -> None:
    """Cập nhật các trường User Lockout Enabled, Access Failed Count và Lockout End trên trang UserProfile."""
    # 1. User Lockout Enabled
    lockout_chk = page.locator("#LockoutEnabled, #UserLockoutEnabled, input[name='LockoutEnabled'], input[name='UserLockoutEnabled']").first
    if await lockout_chk.count() == 0:
        label_loc = page.locator("label:has-text('User Lockout Enabled'), label:has-text('Lockout Enabled')").first
        if await label_loc.count() > 0:
            for_id = await label_loc.get_attribute("for")
            if for_id:
                lockout_chk = page.locator(f"#{for_id}").first
            else:
                cand = label_loc.locator("xpath=..").locator("input[type='checkbox']").first
                if await cand.count() > 0:
                    lockout_chk = cand
                else:
                    cand2 = label_loc.locator("xpath=../..").locator("input[type='checkbox']").first
                    if await cand2.count() > 0:
                        lockout_chk = cand2

    if await lockout_chk.count() > 0:
        is_cur_checked = await lockout_chk.is_checked()
        if is_cur_checked != lockout_enabled:
            switch_label = lockout_chk.locator("xpath=..")
            if await switch_label.count() > 0 and "switch" in (await switch_label.get_attribute("class") or ""):
                await switch_label.click()
            else:
                if lockout_enabled:
                    await lockout_chk.check(force=True)
                else:
                    await lockout_chk.uncheck(force=True)

            try:
                if await lockout_chk.is_checked() != lockout_enabled:
                    await page.evaluate("""(data) => {
                        const el = document.querySelector('#LockoutEnabled, input[name="LockoutEnabled"]');
                        if (el) {
                            el.checked = data.enabled;
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }""", {"enabled": lockout_enabled})
            except Exception:
                pass

    # 2. User Access Failed Count
    acc_failed_loc = page.locator("#AccessFailedCount, input[name='AccessFailedCount']").first
    if await acc_failed_loc.count() > 0:
        await acc_failed_loc.fill(str(access_failed_count))
        try:
            await acc_failed_loc.dispatch_event("input")
            await acc_failed_loc.dispatch_event("change")
        except Exception:
            pass

    # 3. User Lockout End
    lockout_end_loc = page.locator("#LockoutEnd, input[name='LockoutEnd']").first
    if await lockout_end_loc.count() > 0:
        await lockout_end_loc.fill(lockout_end if lockout_end else "")
        try:
            await lockout_end_loc.dispatch_event("input")
            await lockout_end_loc.dispatch_event("change")
        except Exception:
            pass


async def find_iam_user_info(
    page: Page,
    email: Optional[str] = None,
    username: Optional[str] = None
) -> Tuple[Optional[str], str, str]:
    """
    Tìm kiếm user trên IAM theo thứ tự ưu tiên:
    1. Ưu tiên tìm kiếm theo Email trước (nếu có Email).
    2. Nếu không tìm thấy, tìm kiếm theo User Name (nếu có User Name).
    Trả về: (user_id, found_username, found_email)
    """
    clean_email = (email or "").strip()
    clean_username = (username or "").strip()

    search_queries: List[Tuple[str, str]] = []
    if clean_email:
        search_queries.append(("email", clean_email))
    if clean_username and clean_username.lower() != clean_email.lower():
        search_queries.append(("username", clean_username))

    for q_type, q_val in search_queries:
        encoded_query = urllib.parse.quote(q_val)
        search_url = f"https://iam.ggg.com.vn/Identity/Users?search={encoded_query}&UserType=99"
        await page.goto(search_url, wait_until="networkidle", timeout=30000)

        rows = page.locator("table tbody tr")
        count = await rows.count()
        if count == 0:
            continue

        for i in range(count):
            row = rows.nth(i)
            cells = row.locator("td")
            cell_count = await cells.count()
            if cell_count >= 4:
                uname = (await cells.nth(2).inner_text()).strip()
                umail = (await cells.nth(3).inner_text()).strip()

                is_match = False
                if q_type == "email" and (umail.lower() == q_val.lower() or q_val.lower() in umail.lower()):
                    is_match = True
                elif q_type == "username" and (uname.lower() == q_val.lower() or q_val.lower() in uname.lower()):
                    is_match = True

                if is_match:
                    edit_link = cells.nth(0).locator("a")
                    if await edit_link.count() > 0:
                        href = (await edit_link.get_attribute("href")) or ""
                        uid = href.split("/")[-1] if "/" in href else href
                        return uid, uname, umail

        # Nếu không có dòng nào khớp chính xác chuỗi nhưng query trả về kết quả
        first_row = rows.first
        cells = first_row.locator("td")
        if await cells.count() >= 4:
            uname = (await cells.nth(2).inner_text()).strip()
            umail = (await cells.nth(3).inner_text()).strip()
            edit_link = cells.nth(0).locator("a")
            if await edit_link.count() > 0:
                href = (await edit_link.get_attribute("href")) or ""
                uid = href.split("/")[-1] if "/" in href else href
                return uid, uname, umail

    return None, clean_username, clean_email


async def update_user_clients_on_page(page: Page, user_id: str, client_names: List[str]) -> Tuple[bool, List[str]]:
    """Phân quyền các client cho user trên màn hình UserClient."""
    user_client_url = f"https://iam.ggg.com.vn/Identity/UserClient/{user_id}"
    await page.goto(user_client_url, wait_until="networkidle", timeout=30000)

    rows = page.locator("table tbody tr")
    count = await rows.count()
    if count == 0:
        return False, []

    clean_targets = [c.strip() for c in client_names if c.strip()]
    normalized_targets = [_normalize_text(c) for c in clean_targets]
    checked_clients: List[str] = []

    for i in range(count):
        row = rows.nth(i)
        label_loc = row.locator("label.col-form-label")
        if await label_loc.count() > 0:
            label_text = (await label_loc.inner_text()).strip()
        else:
            tds = row.locator("td")
            label_text = (await tds.nth(1).inner_text()).strip() if await tds.count() > 1 else (await row.inner_text()).strip()

        norm_label = _normalize_text(label_text)
        if not norm_label:
            continue

        matched_target = None
        for orig_target, norm_target in zip(clean_targets, normalized_targets):
            if norm_label == norm_target or norm_target in norm_label:
                matched_target = orig_target
                break

        if matched_target:
            chk = row.locator("input[type='checkbox']")
            if await chk.count() > 0:
                if not await chk.is_checked():
                    switch_loc = row.locator("label.switch")
                    if await switch_loc.count() > 0:
                        await switch_loc.click()
                    else:
                        await chk.check(force=True)
                    try:
                        if not await chk.is_checked():
                            await chk.check(force=True)
                    except Exception:
                        pass
            if matched_target not in checked_clients:
                checked_clients.append(matched_target)

    # Save changes
    save_btn = page.locator("button[type='submit']:has-text('Save changes'), button:has-text('Save changes'), input[type='submit'][value*='Save']").first
    if await save_btn.count() > 0:
        await save_btn.scroll_into_view_if_needed()
        await save_btn.click()
        await _safe_wait_network_idle(page, 15000)

    return True, checked_clients


async def process_bulk_sso_item(
    system_username: str,
    sso_user: str,
    sso_pass: str,
    action: str,
    row: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Xử lý một dòng dữ liệu cho 1 trong 5 hành động:
    1. 'create': Tạo mới tài khoản
    2. 'update_pass': Update mật khẩu & mở khóa
    3. 'lock': Khóa tài khoản
    4. 'update_permissions': Update quyền User & Clients
    5. 'update_info': Cập nhật thông tin (Email, SĐT, User Type)
    """
    user_name = str(row.get("user_name") or "").strip()
    email = str(row.get("email") or "").strip()
    phone_number = str(row.get("phone_number") or "").strip()
    user_type = str(row.get("user_type") or "0").strip()
    pass_word = str(row.get("pass_word") or "").strip()
    update_quyen = str(row.get("update_quyen") or "").strip()

    # Bắt buộc ít nhất 1 trong 2: User Name hoặc Email
    if not user_name and not email:
        return {
            "success": False,
            "user_name": "",
            "email": "",
            "action": action,
            "message": "Bắt buộc phải có ít nhất User Name hoặc Email trong file để xử lý."
        }

    async with async_playwright() as p:
        browser, context = await _create_user_playwright_context(p, system_username)
        try:
            page = await context.new_page()

            # Đảm bảo đã đăng nhập vào IAM
            await page.goto("https://iam.ggg.com.vn/Identity/Users", wait_until="networkidle", timeout=30000)
            await _ensure_iam_logged_in(page, context, system_username, sso_user, sso_pass)

            # -------------------------------------------------------------
            # HÀNH ĐỘNG 1: TẠO MỚI TÀI KHOẢN (CREATE)
            # -------------------------------------------------------------
            if action == "create":
                target_username = user_name if user_name else email.split("@")[0].strip()
                target_email = email if email else f"{target_username}@ggg.com.vn"

                # Kiểm tra SĐT nếu có
                current_phone = phone_number
                if current_phone:
                    if await check_iam_phone_exists(page, current_phone):
                        for _ in range(30):
                            current_phone = increment_phone_number(current_phone, 2)
                            if not await check_iam_phone_exists(page, current_phone):
                                break

                # Bấm Add User
                await page.goto("https://iam.ggg.com.vn/Identity/Users", wait_until="networkidle", timeout=30000)
                add_user_btn = page.locator("a:has-text('Add User'), button:has-text('Add User'), a[href*='Create']").first
                if await add_user_btn.count() > 0:
                    await add_user_btn.click()
                    await _safe_wait_network_idle(page, 20000)
                else:
                    await page.goto("https://iam.ggg.com.vn/Identity/User/Create", wait_until="networkidle", timeout=30000)

                await page.wait_for_selector("#UserName, input[name='UserName']", timeout=20000)

                # Điền thông tin cơ bản
                await page.fill("#UserName, input[name='UserName']", target_username)
                await page.fill("#Email, input[name='Email']", target_email)

                type_loc = page.locator("#UserType, input[name='UserType']").first
                if await type_loc.count() > 0:
                    await type_loc.fill(user_type or "0")

                if current_phone:
                    phone_loc = page.locator("#PhoneNumber, input[name='PhoneNumber']").first
                    if await phone_loc.count() > 0:
                        await phone_loc.fill(current_phone)

                # Quy chuẩn: User Access Failed Count mặc định = 0, Lockout End xóa trắng
                fail_loc = page.locator("#AccessFailedCount, input[name='AccessFailedCount']").first
                if await fail_loc.count() > 0:
                    await fail_loc.fill("0")

                lock_end_loc = page.locator("#LockoutEnd, input[name='LockoutEnd']").first
                if await lock_end_loc.count() > 0:
                    await lock_end_loc.fill("")

                # Nhấn Save User
                save_btn = page.locator("button:has-text('Save User'), button[type='submit']:has-text('Save'), input[type='submit'][value*='Save']").first
                await save_btn.scroll_into_view_if_needed()
                await save_btn.click()
                await _safe_wait_network_idle(page, 20000)

                # Kiểm tra lỗi validation
                val_errors = page.locator(".text-danger, .validation-summary-errors, .alert-danger")
                if await val_errors.count() > 0:
                    err_texts = []
                    for idx in range(await val_errors.count()):
                        txt = (await val_errors.nth(idx).inner_text()).strip()
                        if txt and not txt.startswith("*") and txt not in err_texts:
                            err_texts.append(txt)
                    if err_texts:
                        return {
                            "success": False,
                            "user_name": target_username,
                            "email": target_email,
                            "action": action,
                            "message": f"Không thể tạo user: {'; '.join(err_texts)}"
                        }

                # Tìm user_id vừa tạo
                user_id, found_username, found_email = await find_iam_user_info(page, email=target_email, username=target_username)

                # Mở trang UserProfile để đảm bảo Lockout Enabled = False
                if user_id:
                    profile_url = f"https://iam.ggg.com.vn/Identity/UserProfile/{user_id}"
                    await page.goto(profile_url, wait_until="networkidle", timeout=30000)
                    await set_user_lockout_fields(page, lockout_enabled=False, access_failed_count=0, lockout_end="")
                    save_p = page.locator("button.btn:has-text('Save User'), button[type='submit']:has-text('Save')").first
                    if await save_p.count() > 0:
                        await save_p.scroll_into_view_if_needed()
                        await save_p.click()
                        await _safe_wait_network_idle(page, 15000)

                # Đổi mật khẩu
                new_pwd = pass_word if pass_word else generate_compliant_password(10)
                if user_id:
                    change_pwd_url = f"https://iam.ggg.com.vn/Identity/UserChangePassword/{user_id}"
                    await page.goto(change_pwd_url, wait_until="networkidle", timeout=30000)
                    await page.wait_for_selector("#Password", timeout=15000)
                    await page.fill("#Password", new_pwd)
                    await page.fill("#ConfirmPassword", new_pwd)
                    submit_pwd = page.locator("button[type='submit']:has-text('Change Password')").first
                    if await submit_pwd.count() > 0:
                        await submit_pwd.click()
                        await _safe_wait_network_idle(page, 15000)

                # Phân quyền nếu có
                assigned_clients: List[str] = []
                if user_id and update_quyen:
                    client_list = [c.strip() for c in re.split(r"[,;\n\r]+", update_quyen) if c.strip()]
                    if client_list:
                        _, assigned_clients = await update_user_clients_on_page(page, user_id, client_list)

                return {
                    "success": True,
                    "user_name": found_username or target_username,
                    "email": found_email or target_email,
                    "action": action,
                    "new_password": new_pwd,
                    "assigned_clients": assigned_clients,
                    "message": f"Tạo user '{found_username or target_username}' thành công! Mật khẩu: {new_pwd}" + (f" | Phân {len(assigned_clients)} quyền" if assigned_clients else "")
                }

            # -------------------------------------------------------------
            # CÁC HÀNH ĐỘNG 2, 3, 4, 5: TÌM KIẾM THEO EMAIL TRƯỚC, SAU ĐÓ USERNAME
            # -------------------------------------------------------------
            user_id, found_username, found_email = await find_iam_user_info(page, email=email, username=user_name)
            if not user_id:
                search_desc = f"Email '{email}'" if email else f"User Name '{user_name}'"
                if email and user_name:
                    search_desc = f"Email '{email}' hoặc User Name '{user_name}'"
                return {
                    "success": False,
                    "user_name": user_name,
                    "email": email,
                    "action": action,
                    "message": f"Không tìm thấy tài khoản với {search_desc} trên hệ thống IAM."
                }

            display_username = found_username or user_name
            display_email = found_email or email

            # -------------------------------------------------------------
            # HÀNH ĐỘNG 2: UPDATE PASS & MỞ KHÓA (UPDATE_PASS)
            # -------------------------------------------------------------
            if action == "update_pass":
                profile_url = f"https://iam.ggg.com.vn/Identity/UserProfile/{user_id}"
                await page.goto(profile_url, wait_until="networkidle", timeout=30000)

                # Kiểm tra LDAP/AD
                type_loc = page.locator("#UserType, input[name='UserType']").first
                if await type_loc.count() > 0:
                    val = (await type_loc.input_value()).strip()
                    if val == "1":
                        return {
                            "success": False,
                            "user_name": display_username,
                            "email": display_email,
                            "action": action,
                            "is_ldap": True,
                            "message": f"Tài khoản '{display_username}' đồng bộ từ LDAP (AD), vui lòng liên hệ Helpdesk đổi pass mail."
                        }

                await set_user_lockout_fields(page, lockout_enabled=False, access_failed_count=0, lockout_end="")

                save_btn = page.locator("button.btn:has-text('Save User'), button[type='submit']:has-text('Save')").first
                if await save_btn.count() > 0:
                    await save_btn.scroll_into_view_if_needed()
                    await save_btn.click()
                    await _safe_wait_network_idle(page, 15000)

                # Đổi mật khẩu
                new_pwd = pass_word if pass_word else generate_compliant_password(10)
                change_pwd_url = f"https://iam.ggg.com.vn/Identity/UserChangePassword/{user_id}"
                await page.goto(change_pwd_url, wait_until="networkidle", timeout=30000)
                await page.wait_for_selector("#Password", timeout=15000)
                await page.fill("#Password", new_pwd)
                await page.fill("#ConfirmPassword", new_pwd)
                submit_pwd = page.locator("button[type='submit']:has-text('Change Password')").first
                if await submit_pwd.count() > 0:
                    await submit_pwd.click()
                    await _safe_wait_network_idle(page, 15000)

                val_errors = page.locator(".text-danger, .validation-summary-errors")
                if await val_errors.count() > 0:
                    err = (await val_errors.first.inner_text()).strip()
                    if err:
                        return {
                            "success": False,
                            "user_name": display_username,
                            "email": display_email,
                            "action": action,
                            "message": f"Đổi mật khẩu thất bại: {err}"
                        }

                return {
                    "success": True,
                    "user_name": display_username,
                    "email": display_email,
                    "action": action,
                    "new_password": new_pwd,
                    "message": f"Đã mở khóa và đổi mật khẩu cho user '{display_username}': {new_pwd}"
                }

            # -------------------------------------------------------------
            # HÀNH ĐỘNG 3: KHÓA TÀI KHOẢN (LOCK)
            # -------------------------------------------------------------
            elif action == "lock":
                profile_url = f"https://iam.ggg.com.vn/Identity/UserProfile/{user_id}"
                await page.goto(profile_url, wait_until="networkidle", timeout=30000)

                # Quy chuẩn: User Lockout Enabled check button, User Access Failed Count nhập 4, User Lockout End nhập ngày hiện tại
                now_str = datetime.now().strftime("%m/%d/%Y %I:%M %p")
                await set_user_lockout_fields(page, lockout_enabled=True, access_failed_count=4, lockout_end=now_str)

                save_btn = page.locator("button.btn:has-text('Save User'), button[type='submit']:has-text('Save')").first
                if await save_btn.count() > 0:
                    await save_btn.scroll_into_view_if_needed()
                    await save_btn.click()
                    await _safe_wait_network_idle(page, 15000)

                return {
                    "success": True,
                    "user_name": display_username,
                    "email": display_email,
                    "action": action,
                    "detail": f"Lockout Enabled = TRUE, Access Failed Count = 4, Lockout End = {now_str}",
                    "message": f"Đã khóa tài khoản '{display_username}' thành công!"
                }

            # -------------------------------------------------------------
            # HÀNH ĐỘNG 4: UPDATE QUYỀN (UPDATE_PERMISSIONS)
            # -------------------------------------------------------------
            elif action == "update_permissions":
                if not update_quyen:
                    return {
                        "success": False,
                        "user_name": display_username,
                        "email": display_email,
                        "action": action,
                        "message": "Không có thông tin quyền cần gán (cột UPDATE QUYEN trống)."
                    }

                client_list = [c.strip() for c in re.split(r"[,;\n\r]+", update_quyen) if c.strip()]
                ok, assigned_clients = await update_user_clients_on_page(page, user_id, client_list)
                if not ok:
                    return {
                        "success": False,
                        "user_name": display_username,
                        "email": display_email,
                        "action": action,
                        "message": "Không tải được bảng danh sách quyền client trên IAM."
                    }

                return {
                    "success": True,
                    "user_name": display_username,
                    "email": display_email,
                    "action": action,
                    "assigned_clients": assigned_clients,
                    "message": f"Đã cập nhật thành công {len(assigned_clients)} quyền client cho user '{display_username}'!"
                }

            # -------------------------------------------------------------
            # HÀNH ĐỘNG 5: CẬP NHẬT THÔNG TIN (UPDATE_INFO)
            # -------------------------------------------------------------
            elif action == "update_info":
                profile_url = f"https://iam.ggg.com.vn/Identity/UserProfile/{user_id}"
                await page.goto(profile_url, wait_until="networkidle", timeout=30000)

                updated_fields = []
                if email:
                    email_loc = page.locator("#Email, input[name='Email']").first
                    if await email_loc.count() > 0:
                        await email_loc.fill(email)
                        updated_fields.append(f"Email: {email}")

                if phone_number:
                    phone_loc = page.locator("#PhoneNumber, input[name='PhoneNumber']").first
                    if await phone_loc.count() > 0:
                        await phone_loc.fill(phone_number)
                        updated_fields.append(f"SĐT: {phone_number}")

                if user_type:
                    type_loc = page.locator("#UserType, input[name='UserType']").first
                    if await type_loc.count() > 0:
                        await type_loc.fill(user_type)
                        updated_fields.append(f"UserType: {user_type}")

                save_btn = page.locator("button.btn:has-text('Save User'), button[type='submit']:has-text('Save')").first
                if await save_btn.count() > 0:
                    await save_btn.scroll_into_view_if_needed()
                    await save_btn.click()
                    await _safe_wait_network_idle(page, 15000)

                msg = f"Đã cập nhật thông tin cho user '{display_username}' ({', '.join(updated_fields)})" if updated_fields else f"Không có thông tin mới cần cập nhật cho user '{display_username}'."
                return {
                    "success": True,
                    "user_name": display_username,
                    "email": display_email,
                    "action": action,
                    "message": msg
                }

            else:
                return {
                    "success": False,
                    "user_name": display_username,
                    "email": display_email,
                    "action": action,
                    "message": f"Hành động '{action}' không được hỗ trợ."
                }

        finally:
            await browser.close()
