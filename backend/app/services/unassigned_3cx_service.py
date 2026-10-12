import os
# Bỏ qua kiểm tra phiên bản Windows cho Node.js / Playwright (hỗ trợ Windows Server)
os.environ["NODE_SKIP_PLATFORM_CHECK"] = "1"

import re
import json
import logging
import asyncio
import smtplib
import ssl
from email.message import EmailMessage
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.services.ticket_batch_service import (
    _setup_playwright_browsers_path,
    _create_browser_context,
    _ensure_logged_in,
    get_sso_credentials,
    format_friendly_error,
    TIMEOUT_ERROR_MESSAGE,
    BROWSER_MISSING_MESSAGE,
    _safe_wait_network_idle,
)

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
UNASSIGNED_AUDIT_FILE = os.path.join(DATA_DIR, "unassigned_3cx_audit.json")


def _init_unassigned_db_table():
    """Tạo bảng lưu trữ lịch sử quét nhiệm vụ 3CX và G-Process chưa gán trên SQL Server nếu chưa có."""
    create_sql = """
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UNASSIGNED_3CX_TICKETS_LOG' AND schema_id = SCHEMA_ID('dbo'))
    BEGIN
        CREATE TABLE [dbo].[UNASSIGNED_3CX_TICKETS_LOG] (
            [id] INT IDENTITY(1,1) PRIMARY KEY,
            [scan_date] VARCHAR(20) NOT NULL,
            [ticket_id] NVARCHAR(50) NOT NULL,
            [ticket_title] NVARCHAR(500) NULL,
            [creator] NVARCHAR(200) NULL,
            [created_at_str] NVARCHAR(100) NULL,
            [due_date_str] NVARCHAR(100) NULL,
            [status] NVARCHAR(100) NULL,
            [assignee_status] NVARCHAR(100) DEFAULT N'Chưa gán người xử lý',
            [ticket_url] NVARCHAR(500) NULL,
            [source_type] NVARCHAR(50) DEFAULT 'TICKET',
            [scanned_at] DATETIME DEFAULT GETDATE()
        );
    END
    ELSE
    BEGIN
        IF NOT EXISTS (
            SELECT * FROM sys.columns 
            WHERE object_id = OBJECT_ID('dbo.UNASSIGNED_3CX_TICKETS_LOG') 
            AND name = 'source_type'
        )
        BEGIN
            ALTER TABLE [dbo].[UNASSIGNED_3CX_TICKETS_LOG]
            ADD [source_type] NVARCHAR(50) DEFAULT 'TICKET';
        END
    END
    """
    try:
        with engine.begin() as conn:
            conn.execute(text(create_sql))
    except Exception as e:
        logger.warning(f"[UNASSIGNED_3CX] Không thể tạo/cập nhật bảng DB UNASSIGNED_3CX_TICKETS_LOG (sẽ dùng file JSON): {e}")


_init_unassigned_db_table()



class Unassigned3cxService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    def __init__(self):
        self._cache_data: Optional[Dict[str, Any]] = None

    def load_cached_data(self) -> Dict[str, Any]:
        """Tải dữ liệu quét mới nhất từ file JSON hoặc DB."""
        if os.path.exists(UNASSIGNED_AUDIT_FILE):
            try:
                with open(UNASSIGNED_AUDIT_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"[UNASSIGNED_3CX] Lỗi đọc cache JSON: {e}")
        return {
            "scan_date": datetime.now().strftime("%Y-%m-%d"),
            "scanned_at": None,
            "total_unassigned": 0,
            "items": []
        }

    def get_scan_dates(self) -> List[str]:
        """Lấy danh sách các ngày quét đã lưu trong DB hoặc cache."""
        dates = []
        try:
            with engine.connect() as conn:
                res = conn.execute(text("SELECT DISTINCT scan_date FROM [dbo].[UNASSIGNED_3CX_TICKETS_LOG] ORDER BY scan_date DESC"))
                for row in res.fetchall():
                    if row[0]:
                        dates.append(str(row[0]))
        except Exception as e:
            logger.debug(f"[UNASSIGNED_3CX] Lỗi lấy scan dates từ DB: {e}")

        cached = self.load_cached_data()
        cached_date = cached.get("scan_date")
        if cached_date and cached_date not in dates:
            dates.insert(0, cached_date)
        if not dates:
            dates = [datetime.now().strftime("%Y-%m-%d")]
        return dates

    def get_audit_items_by_date(self, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Lấy danh sách ticket chưa gán theo ngày."""
        if not target_date:
            target_date = datetime.now().strftime("%Y-%m-%d")

        # Thử đọc từ DB
        try:
            with engine.connect() as conn:
                query = text("""
                    SELECT ticket_id, ticket_title, creator, created_at_str, due_date_str, status, assignee_status, ticket_url, scanned_at, ISNULL(source_type, 'TICKET')
                    FROM [dbo].[UNASSIGNED_3CX_TICKETS_LOG]
                    WHERE scan_date = :sdate
                    ORDER BY id DESC
                """)
                res = conn.execute(query, {"sdate": target_date}).fetchall()
                if res:
                    items = []
                    for row in res:
                        items.append({
                            "ticket_id": row[0],
                            "ticket_title": row[1] or "",
                            "creator": row[2] or "",
                            "created_at": row[3] or "",
                            "due_date": row[4] or "",
                            "status": row[5] or "Mới mở",
                            "assignee_status": row[6] or "Chưa gán người xử lý",
                            "url": row[7] or f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={row[0]}",
                            "scanned_at": str(row[8]) if row[8] else "",
                            "source_type": row[9] or "TICKET"
                        })
                    return {
                        "scan_date": target_date,
                        "scanned_at": items[0]["scanned_at"] if items else None,
                        "total_unassigned": len(items),
                        "items": items
                    }
        except Exception as e:
            logger.debug(f"[UNASSIGNED_3CX] Lỗi query DB: {e}")

        # Fallback về file JSON nếu ngày khớp hoặc DB trống
        cached = self.load_cached_data()
        for it in cached.get("items", []):
            if "source_type" not in it:
                it["source_type"] = "TICKET"
        if cached.get("scan_date") == target_date or not target_date:
            return cached

        return {
            "scan_date": target_date,
            "scanned_at": None,
            "total_unassigned": 0,
            "items": []
        }

    async def scan_unassigned_tickets(self, max_pages: int = 10) -> Dict[str, Any]:
        """
        Thực hiện rà soát các nhiệm vụ 3CX chưa gán người xử lý:
        1. Đăng nhập SSO vào GPMS (tái sử dụng session hoặc login).
        2. Quét danh sách công việc nhận về tại https://gpms.ggg.com.vn/gticket/work-list.
        3. Nhận diện các ticket có cột Người xử lý là 'Gán người xử lý' (hoặc chưa gán).
        4. Với mỗi ticket chưa gán, truy cập trang chi tiết để lấy chính xác 'Ngày tạo'.
        5. Lưu kết quả vào DB và file JSON.
        """
        from playwright.async_api import async_playwright

        username, password = get_sso_credentials()
        scan_date_str = datetime.now().strftime("%Y-%m-%d")
        scanned_at_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        async with async_playwright() as p:
            browser, context = await _create_browser_context(p)
            try:
                page = await context.new_page()
                page.set_default_timeout(150000)
                page.set_default_navigation_timeout(150000)

                # 1. Đảm bảo đã login SSO
                logger.info("[UNASSIGNED_3CX] Bắt đầu kiểm tra phiên đăng nhập GPMS...")
                await _ensure_logged_in(page, context, username, password)

                # 2. Truy cập trang work-list
                logger.info("[UNASSIGNED_3CX] Truy cập https://gpms.ggg.com.vn/gticket/work-list...")
                await page.goto("https://gpms.ggg.com.vn/gticket/work-list", timeout=150000)
                await _safe_wait_network_idle(page, 15000)
                await asyncio.sleep(2)

                unassigned_raw_dict = {}
                prev_row_count = 0
                no_new_rows_count = 0
                max_scrolls = 60

                for scroll_idx in range(1, max_scrolls + 1):
                    await asyncio.sleep(0.8)
                    try:
                        rows = await page.locator('tbody tr').all()
                        current_row_count = len(rows)
                        if not rows:
                            break

                        for row in rows:
                            try:
                                cells = await row.locator('td').all()
                                if len(cells) < 4:
                                    continue

                                ma_text = (await cells[0].inner_text()).strip()
                                if not ma_text or ma_text in unassigned_raw_dict:
                                    continue

                                ten_text = (await cells[1].inner_text()).strip()
                                nguoi_tao = (await cells[2].inner_text()).strip() if len(cells) > 2 else ""
                                nguoi_xu_ly = (await cells[3].inner_text()).strip() if len(cells) > 3 else ""
                                ngay_ycht = (await cells[4].inner_text()).strip() if len(cells) > 4 else ""
                                trang_thai = (await cells[6].inner_text()).strip() if len(cells) > 6 else "Mới mở"

                                # Kiểm tra xem có phải chưa gán người xử lý không:
                                # Cột Người xử lý có chữ "Gán người xử lý", hoặc icon "+ Gán người xử lý", hoặc để trống
                                is_unassigned = (
                                    "gán người xử lý" in nguoi_xu_ly.lower() or
                                    "gan nguoi xu ly" in nguoi_xu_ly.lower() or
                                    "chưa gán" in nguoi_xu_ly.lower() or
                                    not nguoi_xu_ly or
                                    nguoi_xu_ly == "+"
                                )

                                if is_unassigned:
                                    unassigned_raw_dict[ma_text] = {
                                        "ticket_id": ma_text,
                                        "ticket_title": ten_text,
                                        "creator": nguoi_tao,
                                        "due_date": ngay_ycht,
                                        "status": trang_thai,
                                        "assignee_status": "Chưa gán người xử lý",
                                        "url": f"https://gpms.ggg.com.vn/gticket/work-list/detail?id={ma_text}",
                                        "created_at": ""
                                    }
                            except Exception as row_err:
                                logger.debug(f"[UNASSIGNED_3CX] Lỗi đọc row: {row_err}")

                        # Kiểm tra xem có tải thêm dòng mới hay không
                        if current_row_count > prev_row_count:
                            prev_row_count = current_row_count
                            no_new_rows_count = 0
                        else:
                            no_new_rows_count += 1
                            if no_new_rows_count >= 5:
                                logger.info(f"[UNASSIGNED_3CX] Đã cuộn hết trang sau {scroll_idx} lần cuộn (tổng {current_row_count} hàng trong DOM)")
                                break

                        # Cuộn xuống dưới cùng để trang tải tiếp (Infinite scroll)
                        await page.evaluate("""
                            () => {
                                window.scrollTo(0, document.body.scrollHeight);
                                if (document.documentElement) {
                                    document.documentElement.scrollTop = document.documentElement.scrollHeight;
                                }
                                const scrollables = document.querySelectorAll('div, section, main, [class*="scroll"], [class*="table"], tbody');
                                for (const el of scrollables) {
                                    if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
                                        el.scrollTop = el.scrollHeight;
                                    }
                                }
                            }
                        """)

                        try:
                            last_row = page.locator('tbody tr').last
                            if await last_row.count() > 0:
                                await last_row.scroll_into_view_if_needed(timeout=1500)
                        except Exception:
                            pass

                        try:
                            await page.keyboard.press("PageDown")
                            await page.keyboard.press("End")
                        except Exception:
                            pass

                        await asyncio.sleep(1.2)
                    except Exception as scroll_err:
                        logger.warning(f"[UNASSIGNED_3CX] Lỗi cuộn trang: {scroll_err}")
                        break

                unassigned_raw_list = list(unassigned_raw_dict.values())
                logger.info(f"[UNASSIGNED_3CX] Tìm thấy {len(unassigned_raw_list)} nhiệm vụ chưa gán người xử lý. Đang truy cập chi tiết để lấy 'Ngày tạo'...")

                # 3. Truy cập chi tiết từng ticket để lấy "Ngày tạo"
                final_items = []
                for idx, t in enumerate(unassigned_raw_list):
                    detail_url = t["url"]
                    created_date_str = ""
                    try:
                        logger.info(f"[UNASSIGNED_3CX] ({idx+1}/{len(unassigned_raw_list)}) Lấy Ngày tạo ticket {t['ticket_id']}...")
                        await page.goto(detail_url, timeout=60000)
                        await _safe_wait_network_idle(page, 8000)
                        await asyncio.sleep(1)

                        page_content = await page.content()
                        # Tìm regex dạng: Ngày tạo: 24/09/2026 17:58:51 hoặc 24/09/2026 17:58
                        m = re.search(r"Ngày tạo:\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4}(?:\s+[0-9]{1,2}:[0-9]{1,2}(?::[0-9]{1,2})?)?)", page_content)
                        if m:
                            created_date_str = m.group(1).strip()
                        else:
                            # Fallback qua locator
                            date_elem = page.locator(':text("Ngày tạo:")')
                            if await date_elem.count() > 0:
                                text_val = await date_elem.first.inner_text()
                                m2 = re.search(r"([0-9]{1,2}/[0-9]{1,2}/[0-9]{4}(?:\s+[0-9]{1,2}:[0-9]{1,2}(?::[0-9]{1,2})?)?)", text_val)
                                if m2:
                                    created_date_str = m2.group(1).strip()
                    except Exception as det_err:
                        logger.warning(f"[UNASSIGNED_3CX] Lỗi lấy Ngày tạo ticket {t['ticket_id']}: {det_err}")

                    t["created_at"] = created_date_str or "—"
                    t["source_type"] = "TICKET"
                    t["scanned_at"] = scanned_at_str
                    final_items.append(t)

                # 4. Quét thêm nhiệm vụ G-Process chưa gán tại https://gpms.ggg.com.vn/g-process/my-mission
                logger.info("[UNASSIGNED_3CX] Bắt đầu quét các nhiệm vụ G-Process chưa gán tại https://gpms.ggg.com.vn/g-process/my-mission...")
                unassigned_gp_list = []
                try:
                    await page.goto("https://gpms.ggg.com.vn/g-process/my-mission", timeout=150000)
                    await _safe_wait_network_idle(page, 15000)
                    await asyncio.sleep(2)

                    gp_page_num = 1
                    while gp_page_num <= max_pages:
                        await asyncio.sleep(1)
                        gp_rows = await page.locator('tbody tr').all()
                        if not gp_rows:
                            break

                        found_gp_row = False
                        for r_idx, grow in enumerate(gp_rows):
                            try:
                                gcells = await grow.locator('td').all()
                                if len(gcells) < 5:
                                    continue

                                nhiem_vu_text = (await gcells[0].inner_text()).strip()
                                tien_trinh = (await gcells[1].inner_text()).strip() if len(gcells) > 1 else ""
                                trang_thai = (await gcells[2].inner_text()).strip() if len(gcells) > 2 else ""
                                yeu_cau_text = (await gcells[3].inner_text()).strip() if len(gcells) > 3 else ""
                                nguoi_th_text = (await gcells[4].inner_text()).strip() if len(gcells) > 4 else ""
                                ngay_ycht = (await gcells[5].inner_text()).strip() if len(gcells) > 5 else ""
                                nguoi_tao = ""
                                if len(gcells) > 7:
                                    nguoi_tao = (await gcells[7].inner_text()).strip()
                                if not nguoi_tao and len(gcells) > 6:
                                    nguoi_tao = (await gcells[6].inner_text()).strip()

                                found_gp_row = True

                                # Kiểm tra xem NGƯỜI THỰC HIỆN có chưa được gán không:
                                is_gp_unassigned = (
                                    not nguoi_th_text or
                                    nguoi_th_text in ["-", "—", "+"] or
                                    "chưa gán" in nguoi_th_text.lower() or
                                    "chua gan" in nguoi_th_text.lower() or
                                    "chưa phân công" in nguoi_th_text.lower() or
                                    "gán người" in nguoi_th_text.lower() or
                                    "chưa tiếp nhận" in nguoi_th_text.lower()
                                )

                                if is_gp_unassigned:
                                    # Lấy link / ID của G-Process
                                    href = ""
                                    link_tag = gcells[0].locator('a').first
                                    if await link_tag.count() > 0:
                                        href = await link_tag.get_attribute('href') or ""

                                    mission_id = ""
                                    if href:
                                        m_match = re.search(r'/my-mission/([0-9A-Za-z_-]+)', href)
                                        if m_match:
                                            mission_id = m_match.group(1)
                                    if not mission_id and yeu_cau_text:
                                        m_req = re.search(r'\[([0-9A-Za-z_-]+)\]', yeu_cau_text)
                                        if m_req:
                                            mission_id = m_req.group(1)
                                    if not mission_id:
                                        mission_id = f"GP_{len(unassigned_gp_list)+1}"

                                    detail_url = href if href.startswith("http") else (f"https://gpms.ggg.com.vn{href}" if href else "https://gpms.ggg.com.vn/g-process/my-mission")
                                    full_title = f"{nhiem_vu_text} - {yeu_cau_text}" if (nhiem_vu_text and yeu_cau_text) else (nhiem_vu_text or yeu_cau_text)

                                    unassigned_gp_list.append({
                                        "ticket_id": mission_id,
                                        "ticket_title": full_title,
                                        "creator": nguoi_tao or "—",
                                        "due_date": ngay_ycht or "—",
                                        "status": trang_thai or "Chờ xử lý",
                                        "assignee_status": "Chưa gán người thực hiện",
                                        "url": detail_url,
                                        "created_at": "",  # Ngày gửi có thể bỏ trống theo yêu cầu của user
                                        "source_type": "GPROCESS",
                                        "scanned_at": scanned_at_str
                                    })
                            except Exception as gp_row_err:
                                logger.debug(f"[UNASSIGNED_3CX] Lỗi parse hàng G-Process: {gp_row_err}")

                        if not found_gp_row:
                            break

                        # Phân trang G-Process
                        gp_next_btn = page.locator('button[aria-label="Next page"], .pagination .next, button:has-text(">"), a:has-text("Next"), li.ant-pagination-next:not(.ant-pagination-disabled)')
                        if await gp_next_btn.count() > 0:
                            is_dis = await gp_next_btn.first.get_attribute("disabled")
                            cls = await gp_next_btn.first.get_attribute("class") or ""
                            if is_dis is not None or "disabled" in cls:
                                break
                            await gp_next_btn.first.click()
                            await _safe_wait_network_idle(page, 8000)
                            gp_page_num += 1
                        else:
                            break

                    logger.info(f"[UNASSIGNED_3CX] Quét xong G-Process: phát hiện {len(unassigned_gp_list)} nhiệm vụ chưa gán.")
                except Exception as gp_err:
                    logger.warning(f"[UNASSIGNED_3CX] Lỗi quét trang G-Process my-mission: {gp_err}")

                final_items.extend(unassigned_gp_list)

                # 5. Lưu vào Database & file JSON
                result_payload = {
                    "scan_date": scan_date_str,
                    "scanned_at": scanned_at_str,
                    "total_unassigned": len(final_items),
                    "items": final_items
                }

                # Lưu JSON
                try:
                    with open(UNASSIGNED_AUDIT_FILE, "w", encoding="utf-8") as f:
                        json.dump(result_payload, f, ensure_ascii=False, indent=2)
                except Exception as je:
                    logger.warning(f"[UNASSIGNED_3CX] Lỗi lưu file JSON: {je}")

                # Lưu vào SQL Server
                try:
                    with engine.begin() as conn:
                        # Xóa kết quả quét cũ cùng ngày nếu có để cập nhật mới nhất
                        conn.execute(
                            text("DELETE FROM [dbo].[UNASSIGNED_3CX_TICKETS_LOG] WHERE scan_date = :sdate"),
                            {"sdate": scan_date_str}
                        )
                        for item in final_items:
                            conn.execute(
                                text("""
                                    INSERT INTO [dbo].[UNASSIGNED_3CX_TICKETS_LOG]
                                    (scan_date, ticket_id, ticket_title, creator, created_at_str, due_date_str, status, assignee_status, ticket_url, source_type, scanned_at)
                                    VALUES
                                    (:scan_date, :ticket_id, :ticket_title, :creator, :created_at_str, :due_date_str, :status, :assignee_status, :ticket_url, :source_type, GETDATE())
                                """),
                                {
                                    "scan_date": scan_date_str,
                                    "ticket_id": item["ticket_id"],
                                    "ticket_title": item["ticket_title"],
                                    "creator": item.get("creator", ""),
                                    "created_at_str": item.get("created_at", ""),
                                    "due_date_str": item.get("due_date", ""),
                                    "status": item.get("status", ""),
                                    "assignee_status": item.get("assignee_status", ""),
                                    "ticket_url": item.get("url", ""),
                                    "source_type": item.get("source_type", "TICKET"),
                                }
                            )
                except Exception as dbe:
                    logger.warning(f"[UNASSIGNED_3CX] Lỗi lưu Database: {dbe}")

                return result_payload


            finally:
                await context.close()
                await browser.close()

    def send_report_email(self, recipients: str, target_date: Optional[str] = None) -> Dict[str, Any]:
        """Gửi email báo cáo danh sách ticket 3CX và G-Process chưa gán người xử lý."""
        recipients_list = [r.strip() for r in recipients.split(",") if r.strip()]
        if not recipients_list:
            raise ValueError("Vui lòng nhập ít nhất một địa chỉ email người nhận.")

        audit_data = self.get_audit_items_by_date(target_date)
        items = audit_data.get("items", [])
        scan_date = audit_data.get("scan_date", datetime.now().strftime("%Y-%m-%d"))
        total = len(items)
        ticket_count = sum(1 for it in items if it.get("source_type") != "GPROCESS")
        gp_count = sum(1 for it in items if it.get("source_type") == "GPROCESS")

        # Xây dựng bảng HTML
        table_rows_html = ""
        for idx, it in enumerate(items, 1):
            is_gp = it.get("source_type") == "GPROCESS"
            type_badge = (
                '<span style="background-color: #EEF2FF; color: #4F46E5; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid #C7D2FE;">⚙️ G-Process</span>'
                if is_gp else
                '<span style="background-color: #FEF3C7; color: #D97706; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid #FDE68A;">🎫 Ticket 3CX</span>'
            )
            created_val = it.get('created_at') or '—'
            created_html = f'<span style="color: #9CA3AF;">—</span>' if (not created_val or created_val == '—') else f'<span style="color: #DC2626; font-weight: 600;">{created_val}</span>'

            table_rows_html += f"""
            <tr style="border-bottom: 1px solid #E5E7EB; background-color: {'#FFFFFF' if idx % 2 != 0 else '#F9FAFB'};">
                <td style="padding: 10px 12px; text-align: center; color: #6B7280; font-weight: bold;">{idx}</td>
                <td style="padding: 10px 12px; text-align: center;">{type_badge}</td>
                <td style="padding: 10px 12px; font-weight: bold;">
                    <a href="{it.get('url', '#')}" target="_blank" style="color: #2563EB; text-decoration: none;">
                        #{it.get('ticket_id')}
                    </a>
                </td>
                <td style="padding: 10px 12px; color: #111827; font-weight: 500;">{it.get('ticket_title', '')}</td>
                <td style="padding: 10px 12px; color: #4B5563;">{it.get('creator', '—')}</td>
                <td style="padding: 10px 12px;">{created_html}</td>
                <td style="padding: 10px 12px; color: #6B7280;">{it.get('due_date', '—')}</td>
                <td style="padding: 10px 12px; text-align: center;">
                    <span style="background-color: #FEF2F2; color: #DC2626; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid #FECACA;">
                        {it.get('assignee_status', 'Chưa gán người xử lý')}
                    </span>
                </td>
            </tr>
            """

        if not items:
            table_rows_html = """
            <tr>
                <td colspan="8" style="padding: 24px; text-align: center; color: #059669; font-weight: bold;">
                    ✓ Tuyệt vời! Hiện không có nhiệm vụ 3CX hoặc G-Process nào đang chờ gán người xử lý.
                </td>
            </tr>
            """

        if total > 0:
            details_breakdown = []
            if ticket_count > 0:
                details_breakdown.append(f"{ticket_count} Ticket 3CX")
            if gp_count > 0:
                details_breakdown.append(f"{gp_count} G-Process")
            breakdown_str = f" ({', '.join(details_breakdown)})" if details_breakdown else ""
            status_badge = f"<span style='background-color: #FEF2F2; color: #DC2626; padding: 4px 10px; border-radius: 4px; font-weight: bold; border: 1px solid #FCA5A5;'>{total} Nhiệm Vụ Chưa Gán{breakdown_str}</span>"
        else:
            status_badge = "<span style='background-color: #ECFDF5; color: #059669; padding: 4px 10px; border-radius: 4px; font-weight: bold;'>0 Nhiệm Vụ</span>"

        html_content = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; }}
                .container {{ max-width: 950px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }}
                .header {{ background-color: #111827; color: #F5B800; padding: 18px 24px; font-size: 16px; font-weight: bold; }}
                .body {{ padding: 24px; background-color: #FFFFFF; }}
                .table-box {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }}
                .table-box th {{ background-color: #F3F4F6; color: #4B5563; padding: 10px 12px; text-align: left; text-transform: uppercase; font-size: 11px; border-bottom: 2px solid #E5E7EB; }}
                .footer {{ background-color: #F9FAFB; padding: 14px 24px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    Bạn nào check mail ngày đó, gán nhiệm vụ về mình để xử lý
                </div>
                <div class="body">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <div>
                            <div style="font-size: 15px; font-weight: bold; color: #111827;">Hệ Thống GPMS G-Ticket & G-Process</div>
                            <div style="font-size: 12px; color: #6B7280; margin-top: 3px;">Ngày rà soát: <b>{scan_date}</b></div>
                        </div>
                        <div>
                            {status_badge}
                        </div>
                    </div>

                    <table class="table-box">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">STT</th>
                                <th style="width: 105px; text-align: center;">Phân Loại</th>
                                <th style="width: 85px;">Mã</th>
                                <th>Tên Nhiệm Vụ / Yêu Cầu</th>
                                <th style="width: 130px;">Người Tạo</th>
                                <th style="width: 130px;">Ngày Tạo</th>
                                <th style="width: 120px;">Hạn Xử Lý</th>
                                <th style="width: 130px; text-align: center;">Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {table_rows_html}
                        </tbody>
                    </table>
                </div>
                <div class="footer">
                    Email báo cáo tự động từ Tác vụ Scheduler Quản Trị IT Golden Gate Restaurant Group.<br/>
                    Truy cập GPMS Ticket: <a href="https://gpms.ggg.com.vn/gticket/work-list" style="color: #2563EB;">gticket/work-list</a> &nbsp;|&nbsp; GPMS G-Process: <a href="https://gpms.ggg.com.vn/g-process/my-mission" style="color: #2563EB;">g-process/my-mission</a>
                </div>
            </div>
        </body>
        </html>
        """

        msg = EmailMessage()
        subject_parts = []
        if ticket_count > 0:
            subject_parts.append(f"{ticket_count} Ticket 3CX")
        if gp_count > 0:
            subject_parts.append(f"{gp_count} G-Process")
        sub_desc = f" ({', '.join(subject_parts)})" if subject_parts else ""
        msg["Subject"] = f"[CẢNH BÁO GPMS] Có {total} nhiệm vụ chưa gán người xử lý{sub_desc} ({scan_date})"
        msg["From"] = f"Hệ Thống Quản Trị ITSS <{self.SMTP_USER}>"
        msg["To"] = ", ".join(recipients_list)
        msg.set_content(f"Báo cáo rà soát ngày {scan_date}: Có {total} nhiệm vụ chưa gán người xử lý{sub_desc}.\nVui lòng kiểm tra và gán nhiệm vụ.")
        msg.add_alternative(html_content, subtype="html")

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2


        with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(self.SMTP_USER, self.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"[UNASSIGNED_3CX] Đã gửi email báo cáo tới {recipients_list}")
        return {"status": "success", "message": f"Đã gửi email báo cáo thành công tới {len(recipients_list)} địa chỉ."}


unassigned_3cx_service = Unassigned3cxService()
