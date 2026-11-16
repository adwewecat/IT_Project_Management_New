# -*- coding: utf-8 -*-
"""
3CX Sync Relay Worker (Standalone)
Chay tren PC/VM co ket noi mang toi cong 3CX https://ggg.ringbot.co:5001
de nhan lenh dong bo ca truc Hotline 3CX tu may chu IT Project Management.

Chi su dung thu vien chuan Python (3.10+) va playwright.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
import signal
import socket
import ssl
import sys
import tempfile
import time
import urllib.error
from urllib.parse import urlencode, urlparse
import urllib.request
import uuid
from typing import Any, Dict, List, Optional, Tuple


APP_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CONFIG_PATH = os.path.join(APP_DIR, "relay_config.json")
PID_FILE_PATH = os.path.join(APP_DIR, ".3cx_sync_relay.pid")
LOG_FILE_PATH = os.path.join(APP_DIR, "relay_worker.log")


def setup_logging() -> logging.Logger:
    """Thiet lap ghi log ra console (Pure ASCII) va file relay_worker.log."""
    logger = logging.getLogger("3cx_sync_relay")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fmt = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%d-%m-%Y %H:%M:%S",
    )

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    try:
        fh = logging.FileHandler(LOG_FILE_PATH, encoding="utf-8")
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except Exception:
        pass

    return logger


logger = setup_logging()


def _to_ascii_safe(text: Any) -> str:
    """Chuyen chuoi bat ky sang ASCII an toan cho Windows Console CMD."""
    raw = str(text or "")
    try:
        return raw.encode("ascii", errors="replace").decode("ascii")
    except Exception:
        return "Unknown text"


def load_config(config_path: str) -> Dict[str, Any]:
    """Doc cau hinh tu relay_config.json."""
    if not os.path.isfile(config_path):
        raise FileNotFoundError(
            "Khong tim thay file cau hinh relay_config.json tai: " + config_path
        )
    with open(config_path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    server_url = str(data.get("server_url") or "").strip().rstrip("/")
    relay_token = str(data.get("relay_token") or "").strip()
    worker_name = str(data.get("worker_name") or "").strip()
    if not worker_name or worker_name.upper() == "AUTO":
        worker_name = socket.gethostname()

    if not server_url or server_url.startswith("__"):
        raise ValueError("Chua cau hinh server_url hop le trong relay_config.json")
    if not relay_token or relay_token.startswith("__"):
        raise ValueError("Chua cau hinh relay_token hop le trong relay_config.json")

    return {
        "server_url": server_url,
        "relay_token": relay_token,
        "worker_name": worker_name[:150],
        "poll_interval_seconds": max(2, int(data.get("poll_interval_seconds", 5))),
        "heartbeat_interval_seconds": max(5, int(data.get("heartbeat_interval_seconds", 30))),
        "headless": bool(data.get("headless", True)),
        "verify_ssl": bool(data.get("verify_ssl", False)),
    }


def _build_ssl_context(verify_ssl: bool) -> Optional[ssl.SSLContext]:
    if verify_ssl:
        return None
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def http_json_request(
    method: str,
    url: str,
    relay_token: str,
    payload: Optional[Dict[str, Any]] = None,
    timeout: int = 20,
    verify_ssl: bool = False,
) -> Dict[str, Any]:
    """Gui HTTP JSON request bang stdlib urllib (khong phu thuoc thu vien ngoai)."""
    body_bytes: Optional[bytes] = None
    headers = {
        "X-Relay-Token": relay_token,
        "Accept": "application/json",
    }
    if payload is not None:
        body_bytes = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"

    req = urllib.request.Request(url, data=body_bytes, headers=headers, method=method.upper())
    ctx = _build_ssl_context(verify_ssl)
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw.strip() else {}


def encode_multipart_formdata(
    fields: Dict[str, str],
    file_field: Optional[Tuple[str, str, bytes, str]] = None,
) -> Tuple[bytes, str]:
    """
    Dong goi multipart/form-data theo chuan RFC 7578 bang stdlib Python.
    file_field = (field_name, filename, content_bytes, content_type).
    """
    boundary = "----3cxRelayBoundary" + uuid.uuid4().hex
    parts: List[bytes] = []

    for key, val in fields.items():
        header = (
            "--" + boundary + "\r\n"
            + 'Content-Disposition: form-data; name="' + str(key) + '"\r\n\r\n'
        ).encode("utf-8")
        parts.append(header)
        parts.append(str(val).encode("utf-8"))
        parts.append(b"\r\n")

    if file_field is not None:
        f_name, f_filename, f_bytes, f_ctype = file_field
        f_header = (
            "--" + boundary + "\r\n"
            + 'Content-Disposition: form-data; name="'
            + f_name
            + '"; filename="'
            + f_filename
            + '"\r\n'
            + "Content-Type: "
            + f_ctype
            + "\r\n\r\n"
        ).encode("utf-8")
        parts.append(f_header)
        parts.append(f_bytes)
        parts.append(b"\r\n")

    parts.append(("--" + boundary + "--\r\n").encode("utf-8"))
    body = b"".join(parts)
    content_type = "multipart/form-data; boundary=" + boundary
    return body, content_type


def http_upload_report(
    url: str,
    relay_token: str,
    fields: Dict[str, str],
    screenshot_path: Optional[str] = None,
    timeout: int = 30,
    verify_ssl: bool = False,
) -> Dict[str, Any]:
    """Gui ket qua dong bo va anh PNG chup man hinh ve server."""
    file_tuple: Optional[Tuple[str, str, bytes, str]] = None
    if screenshot_path and os.path.isfile(screenshot_path):
        with open(screenshot_path, "rb") as f:
            png_bytes = f.read()
        if png_bytes:
            file_tuple = (
                "screenshot",
                os.path.basename(screenshot_path),
                png_bytes,
                "image/png",
            )

    body, content_type = encode_multipart_formdata(fields, file_tuple)
    headers = {
        "X-Relay-Token": relay_token,
        "Content-Type": content_type,
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    ctx = _build_ssl_context(verify_ssl)
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
        return json.loads(raw) if raw.strip() else {}


def _extract_host_port(portal_url: str) -> Tuple[str, int]:
    """Tach hostname va port tu URL cong 3CX."""
    parsed = urlparse((portal_url or "").strip())
    host = (parsed.hostname or "").strip()
    if parsed.port is not None:
        port = int(parsed.port)
    elif parsed.scheme.lower() == "https":
        port = 443
    else:
        port = 80
    return host, port


def probe_portal_tcp(portal_url: str, timeout_sec: float = 3.0) -> Tuple[str, bool, str]:
    """Kiem tra ket noi TCP truc tiep tu PC Relay toi cong 3CX."""
    host, port = _extract_host_port(portal_url)
    if not host:
        return "", False, "URL portal 3CX khong hop le"
    try:
        resolved_ip = socket.gethostbyname(host)
    except Exception as exc:
        return "", False, "Khong phan giai duoc DNS " + host + ": " + str(exc)

    try:
        with socket.create_connection((host, port), timeout=timeout_sec):
            return resolved_ip, True, ""
    except Exception as exc:
        return resolved_ip, False, str(exc)


def _is_timeout_error(exc: Exception) -> bool:
    txt = str(exc).lower()
    return (
        "timeout" in txt
        or "timed out" in txt
        or "timedout" in txt
        or "err_connection" in txt
        or "net::err_" in txt
    )


async def _safe_wait_network_idle_3cx(page: Any, timeout_ms: int = 15000) -> None:
    try:
        await page.wait_for_load_state("networkidle", timeout=timeout_ms)
    except Exception:
        await asyncio.sleep(1.5)


async def _create_browser_context(
    playwright_instance: Any,
    headless: bool = True,
    bypass_proxy: bool = False,
):
    """Khoi tao trinh duyet Chromium (fallback sang msedge/chrome neu can)."""
    launch_args = [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--ignore-certificate-errors",
    ]
    if bypass_proxy:
        launch_args.append("--no-proxy-server")

    browser = None
    last_exc: Optional[Exception] = None
    for channel in (None, "msedge", "chrome"):
        try:
            kwargs: Dict[str, Any] = {
                "headless": headless,
                "args": launch_args,
            }
            if channel is not None:
                kwargs["channel"] = channel
            browser = await playwright_instance.chromium.launch(**kwargs)
            break
        except Exception as exc:
            last_exc = exc

    if browser is None:
        raise RuntimeError(
            "Khong mo duoc trinh duyet Playwright/Edge/Chrome: " + str(last_exc)
        )

    context = await browser.new_context(
        ignore_https_errors=True,
        viewport={"width": 1440, "height": 900},
    )
    context.set_default_timeout(45000)
    context.set_default_navigation_timeout(60000)
    return browser, context


async def _playwright_sync_3cx_queue(
    portal_url: str,
    username: str,
    password: str,
    plan: Dict[str, Any],
    dry_run: bool,
    screenshot_file_path: str,
    headless: bool = True,
) -> Dict[str, Any]:
    """Thuc thi dong bo hang doi 3CX bang Playwright tren PC Relay."""
    from playwright.async_api import async_playwright

    queue_name = str(plan.get("queue_name") or "")
    use_skill_group = bool(plan.get("use_skill_group", False))
    entries = list(plan.get("entries") or [])

    async with async_playwright() as p:
        browser, context = await _create_browser_context(
            p, headless=headless, bypass_proxy=False
        )
        page = await context.new_page()
        try:
            logger.info("[RELAY-3CX] Dang mo portal: %s", portal_url)
            try:
                await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
            except Exception as nav_err:
                nav_low = str(nav_err).lower()
                if (
                    "err_connection_timed_out" in nav_low
                    or "err_timed_out" in nav_low
                    or "err_proxy" in nav_low
                ):
                    _, direct_ok, _ = await asyncio.to_thread(
                        probe_portal_tcp, portal_url, 3.0
                    )
                    if direct_ok:
                        logger.warning(
                            "[RELAY-3CX] Thu lai voi --no-proxy-server vi TCP truc tiep thong"
                        )
                        try:
                            await context.close()
                        except Exception:
                            pass
                        try:
                            await browser.close()
                        except Exception:
                            pass
                        browser, context = await _create_browser_context(
                            p, headless=headless, bypass_proxy=True
                        )
                        page = await context.new_page()
                        await page.goto(portal_url, wait_until="domcontentloaded", timeout=60000)
                    else:
                        raise
                else:
                    raise

            # 1. Dang nhap
            user_input = page.locator("#loginInput, input[placeholder*='Extension']").first
            await user_input.wait_for(state="visible", timeout=20000)
            await user_input.fill(username)

            pass_input = page.locator("#passwordInput, input[type='password']").first
            await pass_input.fill(password)

            submit_btn = page.locator("button[type='submit']").first
            await submit_btn.click()

            admin_btn = page.locator("a#menuAdmin, a:has-text('Admin')").first
            try:
                await admin_btn.wait_for(state="visible", timeout=30000)
            except Exception:
                err_loc = page.locator(
                    ".alert-danger, .error-message, .pw-login-error, .invalid-feedback"
                )
                if await err_loc.count() > 0 and await err_loc.first.is_visible():
                    err_txt = (await err_loc.first.inner_text()).strip()
                    raise ValueError("Dang nhap 3CX that bai: " + err_txt)
                raise ValueError("Sai tai khoan hoac mat khau 3CX (khong vao duoc Admin)")

            # 2. Dieu huong Admin -> Call Handling
            logger.info("[RELAY-3CX] Dang nhap thanh cong, vao Call Handling...")
            await admin_btn.click()
            await _safe_wait_network_idle_3cx(page, 15000)

            call_handling_link = page.locator("a:has-text('Call Handling')").first
            await call_handling_link.wait_for(state="visible", timeout=15000)
            await call_handling_link.click()
            await _safe_wait_network_idle_3cx(page, 15000)

            # 3. Mo Queue can dong bo
            logger.info("[RELAY-3CX] Tim hang doi: %s", _to_ascii_safe(queue_name))
            fallback_code = "0006" if "day" in queue_name.lower() else "0007"
            await page.locator("tr.clickable, table tbody tr").first.wait_for(
                state="visible", timeout=15000
            )
            queue_row = page.locator("tr:has-text('" + queue_name + "')").first
            try:
                await queue_row.wait_for(state="visible", timeout=5000)
            except Exception:
                queue_row = page.locator("tr:has-text('" + fallback_code + "')").first
                await queue_row.wait_for(state="visible", timeout=15000)

            await queue_row.click()
            await page.locator("button[data-qa='back-btn']").wait_for(
                state="visible", timeout=15000
            )
            await _safe_wait_network_idle_3cx(page, 15000)

            # 4. Chuyen tab Users BEN TRONG chi tiet Queue
            users_tab = page.locator(
                "a#users-link[role='tab'], ul.nav-tabs a#users-link, [role='tab']:has-text('Users')"
            ).first
            await users_tab.wait_for(state="visible", timeout=15000)
            await users_tab.click()
            users_panel = page.locator(
                "div.tab-pane.active[role='tabpanel'], [role='tabpanel'][aria-labelledby='users-link']"
            ).first
            await users_panel.locator("[data-qa='add-agent'] button").wait_for(
                state="visible", timeout=15000
            )
            await asyncio.sleep(0.5)

            existing_user_elems = await users_panel.locator("button[data-qa='remove-agent']").all()
            existing_count = len(existing_user_elems)
            logger.info("[RELAY-3CX] So nhan su hien tai trong hang doi: %d", existing_count)

            # 5. DRY_RUN: Chup anh va thoat an toan khong luu
            if dry_run:
                logger.info("[RELAY-3CX] Che do DRY_RUN -> chup anh xac nhan, khong ghi de")
                os.makedirs(os.path.dirname(os.path.abspath(screenshot_file_path)), exist_ok=True)
                await page.screenshot(path=screenshot_file_path, full_page=True)
                back_btn = page.locator("button[data-qa='back-btn']").first
                if await back_btn.count() > 0 and await back_btn.is_visible():
                    await back_btn.click()
                return {
                    "status": "DRY_RUN",
                    "applied_lines": [str(e.get("ext_line") or "") for e in entries],
                }

            # 6. Dong bo thuc te: Xoa sach cu (Zero-wipe guard) + Them moi + Save
            trash_loc = users_panel.locator("button[data-qa='remove-agent']")
            deletes_done = 0
            while await trash_loc.count() > 0 and deletes_done < 50:
                await trash_loc.first.click()
                await asyncio.sleep(0.3)
                deletes_done += 1

            remaining = await trash_loc.count()
            if remaining != 0:
                raise RuntimeError(
                    "Zero-wipe guard that bai: van con " + str(remaining) + " nhan su"
                )
            logger.info("[RELAY-3CX] Da xoa sach %d nhan su cu", deletes_done)

            add_btn = users_panel.locator(
                "[data-qa='add-agent'] button, button:has-text('Add User')"
            ).first
            for idx, assignment in enumerate(entries):
                ext_line = str(assignment.get("ext_line") or "").strip()
                skill_group = assignment.get("skill_group")
                logger.info(
                    "[RELAY-3CX] Them line [%d/%d]: %s (Skill=%s)",
                    idx + 1,
                    len(entries),
                    ext_line,
                    skill_group or "-",
                )
                await add_btn.click()
                await asyncio.sleep(0.5)

                new_row = users_panel.locator(".queueAgent.cdk-drag, [id^='UserListItem']").last
                user_input_box = new_row.locator("app-dn-select input[role='combobox']").first
                await user_input_box.wait_for(state="visible", timeout=10000)
                await user_input_box.fill(ext_line)
                await asyncio.sleep(0.6)

                line_pattern = re.compile(r"^\s*" + re.escape(ext_line) + r"\b")
                opt = page.locator("ng-dropdown-panel .ng-option").filter(has_text=line_pattern).first
                await opt.wait_for(state="visible", timeout=10000)
                await opt.click()
                await asyncio.sleep(0.3)

                if use_skill_group and skill_group:
                    skill_select = new_row.locator("ng-select[bindvalue='value']").first
                    await skill_select.wait_for(state="visible", timeout=10000)
                    await skill_select.click()
                    await asyncio.sleep(0.3)
                    skill_pattern = re.compile(r"^\s*" + re.escape(str(skill_group)) + r"\s*$")
                    skill_opt = (
                        page.locator("ng-dropdown-panel .ng-option")
                        .filter(has_text=skill_pattern)
                        .first
                    )
                    await skill_opt.wait_for(state="visible", timeout=10000)
                    await skill_opt.click()
                    await asyncio.sleep(0.3)

            final_rows_count = await users_panel.locator("button[data-qa='remove-agent']").count()
            if final_rows_count != len(entries):
                raise RuntimeError(
                    "So nhan su khong khop: mong doi "
                    + str(len(entries))
                    + ", thuc te "
                    + str(final_rows_count)
                )

            save_btn = page.locator("button#btnSave, button[data-qa='save']").first
            await save_btn.click()
            await _safe_wait_network_idle_3cx(page, 15000)
            await asyncio.sleep(2.0)

            os.makedirs(os.path.dirname(os.path.abspath(screenshot_file_path)), exist_ok=True)
            await page.screenshot(path=screenshot_file_path, full_page=True)
            logger.info("[RELAY-3CX] Luu thanh cong va chup anh: %s", screenshot_file_path)

            return {
                "status": "SUCCESS",
                "applied_lines": [str(e.get("ext_line") or "") for e in entries],
            }
        except Exception:
            try:
                os.makedirs(os.path.dirname(os.path.abspath(screenshot_file_path)), exist_ok=True)
                await page.screenshot(path=screenshot_file_path, full_page=True)
            except Exception:
                pass
            raise
        finally:
            try:
                await context.close()
            except Exception:
                pass
            try:
                await browser.close()
            except Exception:
                pass


def format_worker_error(exc: Exception, portal_url: str) -> str:
    """Chuyen loi Playwright sang thong bao ngan gon, de hieu."""
    raw = str(exc or "").strip()
    low = raw.lower()
    host, port = _extract_host_port(portal_url)
    if "err_connection_timed_out" in low or "err_timed_out" in low:
        return (
            "PC Relay khong ket noi duoc toi cong 3CX "
            + host
            + ":"
            + str(port)
            + " ("
            + raw
            + ")"
        )
    if "executable doesn't exist" in low or "browser" in low and "install" in low:
        return "PC Relay thieu trinh duyet Playwright Chromium/Edge (" + raw + ")"
    return raw or "Loi khong xac dinh khi chay Relay Worker"


def execute_task_sync(task: Dict[str, Any], headless: bool = True) -> Tuple[str, List[str], str, Optional[str]]:
    """
    Chay task dong bo 3CX (co retry toi da 3 lan khi loi timeout neu khong phai dry_run).
    Tra ve: (status, applied_lines, error_message, screenshot_file_path)
    """
    portal_url = str(task.get("portal_url") or "")
    username = str(task.get("username") or "")
    password = str(task.get("password") or "")
    plan = task.get("plan") or {}
    is_dry_run = bool(task.get("is_dry_run", False))
    entries = list(plan.get("entries") or [])
    applied_lines = [str(e.get("ext_line") or "") for e in entries]

    tmp_dir = tempfile.mkdtemp(prefix="3cx_relay_")
    screenshot_path = os.path.join(
        tmp_dir, "relay_task_" + str(task.get("task_id", 0)) + ".png"
    )

    max_attempts = 1 if is_dry_run else 3
    last_err: Optional[Exception] = None

    for attempt in range(1, max_attempts + 1):
        try:
            logger.info(
                "[TASK #%s] Thuc thi queue='%s' dry_run=%s (lan %d/%d)",
                task.get("task_id"),
                _to_ascii_safe(plan.get("queue_name")),
                is_dry_run,
                attempt,
                max_attempts,
            )
            res = asyncio.run(
                _playwright_sync_3cx_queue(
                    portal_url=portal_url,
                    username=username,
                    password=password,
                    plan=plan,
                    dry_run=is_dry_run,
                    screenshot_file_path=screenshot_path,
                    headless=headless,
                )
            )
            final_status = str(res.get("status") or ("DRY_RUN" if is_dry_run else "SUCCESS"))
            return final_status, applied_lines, "", screenshot_path if os.path.isfile(screenshot_path) else None
        except Exception as exc:
            last_err = exc
            logger.warning("[TASK #%s] Lan %d/%d that bai: %s", task.get("task_id"), attempt, max_attempts, _to_ascii_safe(exc))
            if attempt < max_attempts and _is_timeout_error(exc):
                time.sleep(15)
            else:
                break

    err_msg = format_worker_error(last_err or RuntimeError("Loi dong bo"), portal_url)
    return "FAILED", applied_lines, err_msg, screenshot_path if os.path.isfile(screenshot_path) else None


def run_once(cfg: Dict[str, Any], headless: bool = True) -> bool:
    """Thuc hien 1 chu ky poll task va bao cao ket qua. Tra ve True neu da xu ly 1 task."""
    base_url = cfg["server_url"]
    token = cfg["relay_token"]
    worker_name = cfg["worker_name"]
    verify_ssl = cfg["verify_ssl"]

    query = urlencode({"worker_name": worker_name})
    next_url = base_url + "/api/v1/hotline-3cx-auto/relay/next-task?" + query
    resp = http_json_request("GET", next_url, token, timeout=15, verify_ssl=verify_ssl)
    if not resp.get("has_task") or not resp.get("task"):
        return False

    task = resp["task"]
    task_id = task["task_id"]
    logger.info(
        "[TASK #%s] Da nhan lenh dong bo ngay %s ca %s -> %s",
        task_id,
        task.get("duty_date"),
        task.get("shift_code"),
        _to_ascii_safe(task.get("queue_name")),
    )

    final_status, applied_lines, err_msg, screenshot_path = execute_task_sync(
        task, headless=headless
    )

    report_url = base_url + "/api/v1/hotline-3cx-auto/relay/tasks/" + str(task_id) + "/report"
    fields = {
        "status": final_status,
        "worker_name": worker_name,
        "applied_lines_json": json.dumps(applied_lines, ensure_ascii=False),
        "error_message": err_msg,
    }
    try:
        http_upload_report(
            report_url,
            token,
            fields=fields,
            screenshot_path=screenshot_path,
            timeout=30,
            verify_ssl=verify_ssl,
        )
        logger.info("[TASK #%s] Da bao cao ket qua ve Server: %s", task_id, final_status)
    finally:
        if screenshot_path and os.path.isfile(screenshot_path):
            try:
                parent_tmp = os.path.dirname(screenshot_path)
                os.remove(screenshot_path)
                os.rmdir(parent_tmp)
            except Exception:
                pass
    return True


def send_heartbeat(cfg: Dict[str, Any]) -> None:
    """Gui tin hieu Heartbeat bao trang thai Online ve Server."""
    base_url = cfg["server_url"]
    token = cfg["relay_token"]
    verify_ssl = cfg["verify_ssl"]
    hb_url = base_url + "/api/v1/hotline-3cx-auto/relay/heartbeat"
    http_json_request(
        "POST",
        hb_url,
        token,
        payload={
            "worker_name": cfg["worker_name"],
            "can_reach_3cx": True,
        },
        timeout=15,
        verify_ssl=verify_ssl,
    )


def write_pid_file() -> None:
    try:
        with open(PID_FILE_PATH, "w", encoding="ascii") as f:
            f.write(str(os.getpid()))
    except Exception:
        pass


def remove_pid_file() -> None:
    try:
        if os.path.isfile(PID_FILE_PATH):
            os.remove(PID_FILE_PATH)
    except Exception:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="3CX Sync Relay Worker")
    parser.add_argument("--config", default=DEFAULT_CONFIG_PATH, help="Duong dan file relay_config.json")
    parser.add_argument("--once", action="store_true", help="Chi poll 1 lan roi thoat")
    parser.add_argument("--headed", action="store_true", help="Mo cua so trinh duyet truc quan de theo doi")
    args = parser.parse_args()

    try:
        cfg = load_config(args.config)
    except Exception as exc:
        logger.error("[INIT] Loi doc cau hinh: %s", _to_ascii_safe(exc))
        return 1

    headless = False if args.headed else bool(cfg.get("headless", True))
    write_pid_file()

    stop_requested = {"stop": False}

    def _on_sig(signum, frame):
        stop_requested["stop"] = True

    signal.signal(signal.SIGINT, _on_sig)
    signal.signal(signal.SIGTERM, _on_sig)

    logger.info("==============================================================")
    logger.info("  3CX SYNC RELAY WORKER DA SAN SANG HOAT DONG")
    logger.info("  Worker Name : %s", _to_ascii_safe(cfg["worker_name"]))
    logger.info("  Server URL  : %s", _to_ascii_safe(cfg["server_url"]))
    logger.info("  Poll / HB   : %ds / %ds | Headless: %s", cfg["poll_interval_seconds"], cfg["heartbeat_interval_seconds"], headless)
    logger.info("==============================================================")

    try:
        send_heartbeat(cfg)
        logger.info("[HEARTBEAT] Ket noi may chu thanh cong!")
    except Exception as exc:
        logger.warning("[HEARTBEAT] Chua ket noi duoc may chu khi khoi dong: %s", _to_ascii_safe(exc))

    if args.once:
        try:
            run_once(cfg, headless=headless)
            return 0
        except Exception as exc:
            logger.error("[ONCE] Loi thuc thi: %s", _to_ascii_safe(exc))
            return 1
        finally:
            remove_pid_file()

    last_hb = time.monotonic()
    while not stop_requested["stop"]:
        now_m = time.monotonic()
        if now_m - last_hb >= cfg["heartbeat_interval_seconds"]:
            try:
                send_heartbeat(cfg)
            except Exception as hb_err:
                logger.warning("[HEARTBEAT] Loi gui heartbeat: %s", _to_ascii_safe(hb_err))
            last_hb = now_m

        try:
            processed = run_once(cfg, headless=headless)
            if processed:
                last_hb = time.monotonic()
                continue
        except urllib.error.HTTPError as http_err:
            if http_err.code == 401:
                logger.error("[AUTH] Relay Token khong hop le (HTTP 401). Vui long tai lai goi cai dat tu Web!")
            else:
                logger.warning("[POLL] Loi HTTP %s tu Server", http_err.code)
        except Exception as poll_err:
            logger.warning("[POLL] Loi ket noi Server: %s", _to_ascii_safe(poll_err))

        time.sleep(cfg["poll_interval_seconds"])

    remove_pid_file()
    logger.info("3CX Sync Relay Worker da dung.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

