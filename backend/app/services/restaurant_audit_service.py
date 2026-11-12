from __future__ import annotations

import os
import re
import json
import uuid
import smtplib
import ssl
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Any, Optional

from sqlalchemy import select, func
from app.core.database import SessionLocal
from app.models.restaurant import Restaurant
from app.services.network_monitor_service import network_monitor_service

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
CACHE_FILE = os.path.join(DATA_DIR, "restaurant_audit_last_result.json")
CONFIG_FILE = os.path.join(DATA_DIR, "restaurant_audit_config.json")

DEFAULT_EXCLUDED_KEYWORDS = [
    "The Coffee House",
    "TCH",
    "Universal",
    "TEA"
]


class RestaurantAuditService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    def __init__(self):
        self._last_result: Optional[Dict[str, Any]] = None
        self.excluded_keywords: List[str] = list(DEFAULT_EXCLUDED_KEYWORDS)
        self._load_config()
        self._load_cache()

    def _load_config(self):
        """Tải danh sách loại bỏ cấu hình từ JSON, nếu chưa có thì khởi tạo mặc định."""
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    if isinstance(cfg, dict) and "excluded_keywords" in cfg:
                        self.excluded_keywords = [str(k).strip() for k in cfg["excluded_keywords"] if str(k).strip()]
            except Exception as e:
                print(f"[RESTAURANT_AUDIT] Error loading exclusion config: {e}")
                self.excluded_keywords = list(DEFAULT_EXCLUDED_KEYWORDS)
        else:
            self.excluded_keywords = list(DEFAULT_EXCLUDED_KEYWORDS)
            self._save_config()

    def _save_config(self):
        """Lưu danh sách loại bỏ vào file JSON."""
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({"excluded_keywords": self.excluded_keywords}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[RESTAURANT_AUDIT] Error saving exclusion config: {e}")

    def get_config(self) -> Dict[str, Any]:
        """Lấy cấu hình loại bỏ hiện tại."""
        return {
            "excluded_keywords": list(self.excluded_keywords),
            "default_keywords": list(DEFAULT_EXCLUDED_KEYWORDS)
        }

    def save_config(self, keywords: List[str]) -> Dict[str, Any]:
        """Cập nhật cấu hình loại bỏ."""
        cleaned = []
        for k in keywords:
            ks = str(k or "").strip()
            if ks and ks not in cleaned:
                cleaned.append(ks)
        self.excluded_keywords = cleaned
        self._save_config()
        return self.get_config()

    def is_restaurant_excluded(self, res_name: Optional[str], brand: Optional[str], sap: Optional[str]) -> Tuple[bool, str]:
        """
        Kiểm tra xem nhà hàng có thuộc danh sách loại bỏ hay không.
        Khớp theo Tên nhà hàng, Thương hiệu, hoặc Mã SAP.
        - Viết tắt <= 4 ký tự (như TEA, TCH, UT): dùng word boundary regex \bKEYWORD\b.
        - Cụm từ > 4 ký tự (như The Coffee House, Universal): tìm kiếm chuỗi con.
        - Mã SAP: so khớp chính xác.
        """
        res_s = (res_name or "").strip()
        brand_s = (brand or "").strip()
        sap_s = (sap or "").strip()

        for kw in self.excluded_keywords:
            kw_clean = kw.strip()
            if not kw_clean:
                continue

            # 1. So khớp theo mã SAP
            if sap_s and kw_clean.lower() == sap_s.lower():
                return True, kw_clean

            # 2. So khớp từ viết tắt ngắn (<= 4 ký tự)
            if len(kw_clean) <= 4:
                pattern = r'\b' + re.escape(kw_clean) + r'\b'
                if re.search(pattern, res_s, re.IGNORECASE) or re.search(pattern, brand_s, re.IGNORECASE):
                    return True, kw_clean
            else:
                # 3. So khớp cụm từ dài hơn
                if kw_clean.lower() in res_s.lower() or kw_clean.lower() in brand_s.lower():
                    return True, kw_clean

        return False, ""

    def _load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    self._last_result = json.load(f)
            except Exception as e:
                print(f"[RESTAURANT_AUDIT] Error loading cache: {e}")
                self._last_result = None

    def _save_cache(self, data: Dict[str, Any]):
        self._last_result = data
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[RESTAURANT_AUDIT] Error saving cache: {e}")

    def get_latest_results(self) -> Optional[Dict[str, Any]]:
        return self._last_result

    @staticmethod
    def check_missing_fields(
        res_name: Optional[str],
        sap: Optional[str],
        coscenter: Optional[str],
        rk7: Optional[str],
        ngay_khaitruong: Optional[datetime],
        trangthai: Optional[str]
    ) -> List[str]:
        r"""
        Quy tắc rà soát thông tin nhà hàng:
        1. Mã SAP: Phải 4 số hoặc 5 số (^\d{4,5}$). Không phải 1, 0, null.
        2. Cost Center: PHẢI 5 số/ký tự trở lên (len >= 5). Không phải 1, 0, null.
        3. Mã RK7: 3 số trở lên. Không phải 1, 0, null.
        4. Ngày Khai Trương: Phải khác 01/01/1999 và không để trống (ngày 01/01/1999 hoặc None là chưa nhập).
        5. Trạng Thái Hoạt Động: ON thì mới được tính là xong, NEW tính là chưa xong. OFF bỏ qua từ query.
        """
        missing: List[str] = []

        # 1. Mã SAP (phải 4 số hoặc 5 số)
        sap_s = str(sap or "").strip()
        if not sap_s or sap_s.lower() in ('1', '0', 'none', 'null') or not re.match(r'^\d{4,5}$', sap_s):
            missing.append("Thiếu Mã SAP")

        # 2. Cost Center (PHẢI 5 số/ký tự trở lên)
        cc_s = str(coscenter or "").strip()
        if not cc_s or "cần bổ sung mã đúng" in cc_s.lower() or cc_s.lower() in ('1', '0', 'none', 'null') or len(cc_s) < 5:
            missing.append("Thiếu Cost Center")

        # 3. Mã RK7 (3 số trở lên)
        rk7_s = str(rk7 or "").strip()
        if not rk7_s or "cần bổ sung mã đúng" in rk7_s.lower() or rk7_s.lower() in ('1', '0', 'none', 'null') or not re.search(r'\d{3,}', rk7_s):
            missing.append("Thiếu Mã RK7")

        # 4. Ngày Khai Trương (Phải khác 01/01/1999 và không được để trống)
        if not ngay_khaitruong:
            missing.append("Thiếu Ngày Khai Trương")
        elif ngay_khaitruong.strftime('%Y-%m-%d') == '1999-01-01':
            missing.append("Thiếu Ngày Khai Trương (01/01/1999)")

        # 5. Trạng Thái Hoạt Động (ON là xong, NEW chưa xong)
        tt_s = str(trangthai or "").strip().upper()
        if tt_s == 'NEW':
            missing.append("Trạng Thái chưa ON (Đang là NEW)")
        elif tt_s != 'ON':
            missing.append("Trạng Thái chưa ON")

        return missing

    @classmethod
    def _ping_with_retry(cls, ip: Optional[str]) -> bool:
        """
        Ping kiểm tra tín hiệu mạng router với cơ chế Retry 2 lần (lần 1: 1.2s, lần 2: 1.5s)
        để chống báo lỗi giả trên đường truyền WAN/VPN.
        """
        if not ip:
            return False
        ok = network_monitor_service._ping_single_ip(ip, timeout_ms=1200)
        if not ok:
            ok = network_monitor_service._ping_single_ip(ip, timeout_ms=1500)
        return ok

    def audit_restaurants(self, max_workers: int = 30) -> Dict[str, Any]:
        """
        Thực hiện rà soát thông tin toàn bộ nhà hàng trong database (bỏ qua OFF):
        - Kiểm tra các trường: Mã SAP, Cost Center, Mã RK7, Ngày Khai Trương, Trạng Thái.
        - Với các nhà hàng thiếu thông tin: Ping router IP.
          + Nếu mất tín hiệu (offline) -> Bỏ qua (Chưa hoạt động).
          + Nếu có tín hiệu (online) -> Đánh dấu Cần Bổ Sung và tổng hợp danh sách nhắc nhở.
        """
        db = SessionLocal()
        try:
            # Lấy tất cả nhà hàng không phải OFF (bao gồm ON, NEW, null)
            restaurants = db.scalars(
                select(Restaurant)
                .where(
                    (Restaurant.trangthai != 'OFF') | (Restaurant.trangthai.is_(None))
                )
                .order_by(Restaurant.sap.asc(), Restaurant.id.desc())
            ).all()

            if not restaurants:
                raise RuntimeError("Không tìm thấy nhà hàng nào trong cơ sở dữ liệu để rà soát.")

            initial_items: List[Dict[str, Any]] = []
            targets_to_ping: List[Dict[str, Any]] = []
            excluded_items: List[Dict[str, Any]] = []

            for r in restaurants:
                clean_ip = network_monitor_service._clean_router_ip(r.ip)
                sap_display = str(r.sap or "").strip()
                if sap_display.lower() in ('none', 'null', ''):
                    sap_display = '-'

                nkt_display = r.ngay_khaitruong.strftime("%d/%m/%Y") if r.ngay_khaitruong else "Chưa nhập"
                if r.ngay_khaitruong and r.ngay_khaitruong.strftime('%Y-%m-%d') == '1999-01-01':
                    nkt_display = "01/01/1999 (Chưa có ngày chuẩn)"

                # Kiểm tra xem nhà hàng có thuộc danh sách loại bỏ cấu hình hay không
                is_excluded, matched_kw = self.is_restaurant_excluded(r.res, r.brand, r.sap)
                if is_excluded:
                    excluded_items.append({
                        "id": r.id,
                        "sap": sap_display,
                        "res": r.res or "Chưa đặt tên",
                        "brand": r.brand or "-",
                        "coscenter": r.coscenter or "-",
                        "rk7": r.rk7 or "-",
                        "ngay_khaitruong": nkt_display,
                        "raw_nkt": r.ngay_khaitruong.strftime("%Y-%m-%d %H:%M:%S") if r.ngay_khaitruong else None,
                        "trangthai": (r.trangthai or "").strip().upper() or "CHƯA RÕ",
                        "ip": clean_ip or (r.ip or "-"),
                        "raw_ip": r.ip or "-",
                        "matched_keyword": matched_kw,
                        "missing_fields": [],
                        "is_missing": False,
                        "is_up": False,
                        "ping_status": "Bỏ qua",
                        "category": "excluded",
                        "conclusion": f"Loại bỏ theo cấu hình ({matched_kw})",
                        "reminder_text": ""
                    })
                    continue

                missing_fields = self.check_missing_fields(
                    res_name=r.res,
                    sap=r.sap,
                    coscenter=r.coscenter,
                    rk7=r.rk7,
                    ngay_khaitruong=r.ngay_khaitruong,
                    trangthai=r.trangthai
                )

                item_info = {
                    "id": r.id,
                    "sap": sap_display,
                    "res": r.res or "Chưa đặt tên",
                    "brand": r.brand or "-",
                    "coscenter": r.coscenter or "-",
                    "rk7": r.rk7 or "-",
                    "ngay_khaitruong": nkt_display,
                    "raw_nkt": r.ngay_khaitruong.strftime("%Y-%m-%d %H:%M:%S") if r.ngay_khaitruong else None,
                    "trangthai": (r.trangthai or "").strip().upper() or "CHƯA RÕ",
                    "ip": clean_ip or (r.ip or "-"),
                    "raw_ip": r.ip or "-",
                    "matched_keyword": "",
                    "missing_fields": missing_fields,
                    "is_missing": len(missing_fields) > 0,
                    "is_up": False,
                    "ping_status": "Chưa kiểm tra",
                    "category": "valid",
                    "conclusion": "Đầy đủ thông tin",
                    "reminder_text": ""
                }

                if len(missing_fields) > 0:
                    # Cần ping kiểm tra tín hiệu router
                    targets_to_ping.append(item_info)
                else:
                    item_info["category"] = "valid"
                    item_info["conclusion"] = "Đầy đủ thông tin"
                    item_info["ping_status"] = "Đầy Đủ"
                    initial_items.append(item_info)

            # Thực hiện ping song song cho các nhà thiếu thông tin
            def _ping_worker(item: Dict[str, Any]) -> Dict[str, Any]:
                target_ip = item["ip"]
                has_valid_ip = bool(re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', target_ip))
                is_online = False
                if has_valid_ip:
                    is_online = self._ping_with_retry(target_ip)

                missing_str = ", ".join(item["missing_fields"])
                # Định dạng chuẩn theo yêu cầu:
                # [Tên Nhà Hàng]
                # [Thiếu ...]
                # vui lòng bổ sung
                reminder = f"{item['res']}\n{missing_str}\nvui lòng bổ sung"

                if is_online:
                    item["is_up"] = True
                    item["ping_status"] = "Online"
                    item["category"] = "need_reminder"
                    item["conclusion"] = "Cần Bổ Sung"
                    item["reminder_text"] = reminder
                else:
                    item["is_up"] = False
                    item["ping_status"] = "Mất Tín Hiệu"
                    item["category"] = "skipped_offline"
                    item["conclusion"] = "Bỏ qua (Chưa hoạt động / Mất tín hiệu)"
                    item["reminder_text"] = ""

                return item

            pinged_items: List[Dict[str, Any]] = []
            if targets_to_ping:
                with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                    pinged_items = list(executor.map(_ping_worker, targets_to_ping))

            need_reminder_items = [it for it in pinged_items if it["category"] == "need_reminder"]
            skipped_offline_items = [it for it in pinged_items if it["category"] == "skipped_offline"]
            valid_items = initial_items

            # Sắp xếp danh sách: Chỉ list các nhà đang hoạt động (cần bổ sung + đầy đủ), KHÔNG list các nhà bỏ qua (offline / loại bỏ)
            all_items = need_reminder_items + valid_items

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Tạo text tổng hợp copy tất cả các nhà cần bổ sung
            reminder_text_lines = []
            for idx, it in enumerate(need_reminder_items, 1):
                missing_str = ", ".join(it["missing_fields"])
                reminder_text_lines.append(
                    f"{idx}. {it['res']} (IP: {it['ip']})\n{missing_str}\nvui lòng bổ sung"
                )

            reminder_text_all = "\n\n".join(reminder_text_lines)

            results = {
                "target_time": now_str,
                "total_scanned": len(restaurants),
                "need_reminder_count": len(need_reminder_items),
                "skipped_offline_count": len(skipped_offline_items),
                "valid_count": len(valid_items),
                "excluded_count": len(excluded_items),
                "excluded_keywords": list(self.excluded_keywords),
                "need_reminder_items": need_reminder_items,
                "skipped_offline_items": [],
                "valid_items": valid_items,
                "excluded_items": [],
                "all_items": all_items,
                "reminder_text_all": reminder_text_all
            }

            self._save_cache(results)
            return results

        finally:
            db.close()

    def send_audit_email(self, results: Dict[str, Any], recipients: List[str]) -> Dict[str, Any]:
        """
        Gửi email báo cáo danh sách nhà hàng còn thiếu thông tin (chỉ gửi các nhà hàng đang online có tín hiệu).
        """
        if not recipients:
            raise ValueError("Không có danh sách email người nhận.")

        now = datetime.now()
        date_display = now.strftime("%d/%m/%Y")
        time_display = now.strftime("%H:%M")

        need_reminder_items = results.get("need_reminder_items", [])
        need_count = len(need_reminder_items)
        total = results.get("total_scanned", 0)
        valid_count = results.get("valid_count", 0)
        skipped_count = results.get("skipped_offline_count", 0)
        excluded_count = results.get("excluded_count", 0)

        alert_color = "#DC2626" if need_count > 0 else "#16A34A"
        summary_title = (
            f"Phát Hiện {need_count} Nhà Hàng Đang Hoạt Động Còn Thiếu Thông Tin Hồ Sơ"
            if need_count > 0 else
            "Toàn Bộ Nhà Hàng Đang Hoạt Động Đã Hoàn Thiện Đầy Đủ Thông Tin"
        )

        table_rows = ""
        for idx, it in enumerate(need_reminder_items, 1):
            missing_badges = " ".join([
                f"<span style='background-color:#FEE2E2; color:#DC2626; border:1px solid #FCA5A5; padding:2px 6px; border-radius:4px; font-size:11px; margin-right:4px; margin-bottom:4px; display:inline-block;'>{m}</span>"
                for m in it.get("missing_fields", [])
            ])
            table_rows += f"""
            <tr style="background-color: #FFFFFF;">
                <td style="border: 1px solid #D1D5DB; padding: 8px 8px; text-align: center;">{idx}</td>
                <td style="border: 1px solid #D1D5DB; padding: 8px 12px; font-weight: bold; color: #111827;">{it.get('res')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 8px 10px; font-family: monospace; text-align: center; color: #374151;">{it.get('ip')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 8px 12px;">{missing_badges}</td>
                <td style="border: 1px solid #D1D5DB; padding: 8px 10px; text-align: center; color: #DC2626; font-weight: bold;">Vui lòng bổ sung</td>
            </tr>
            """

        if need_count > 0:
            table_content = f"""
            <table>
                <thead>
                    <tr>
                        <th style="width: 45px;">STT</th>
                        <th style="min-width: 180px; text-align: left; padding-left: 12px;">TÊN NHÀ HÀNG</th>
                        <th style="width: 120px; text-align: center;">IP ROUTER</th>
                        <th style="min-width: 250px; text-align: left; padding-left: 12px;">MỤC CÒN THIẾU</th>
                        <th style="width: 130px; text-align: center;">YÊU CẦU</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
            """
        else:
            table_content = '<p style="color: #16A34A; font-weight: bold;">Tuyệt vời! Toàn bộ các nhà hàng đang hoạt động đều đã được cập nhật đầy đủ thông tin chuẩn.</p>'

        html_content = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; }}
                table {{ border-collapse: collapse; width: 100%; max-width: 900px; margin-top: 12px; }}
                th {{ background-color: #F3F4F6; border: 1px solid #D1D5DB; padding: 8px 8px; text-align: center; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div style="padding: 14px 18px; background-color: #F8FAFC; border-left: 4px solid {alert_color}; margin-bottom: 16px; border-radius: 4px;">
                <h2 style="margin: 0 0 6px; color: {alert_color}; font-size: 17px;">
                    {summary_title}
                </h2>
                <p style="margin: 0; font-size: 13px; color: #4B5563;">
                    Thời gian rà soát: <strong>{time_display}</strong> ngày <strong>{date_display}</strong> | Tiêu chuẩn: <strong>Mã SAP (4-5 số)</strong>, <strong>Cost Center (&ge; 5 ký tự)</strong>, <strong>Mã RK7 (&ge; 3 số)</strong>, <strong>Ngày Khai Trương (Khác 01/01/1999)</strong>, <strong>Trạng Thái (ON)</strong>
                </p>
                <div style="margin-top: 8px; font-size: 13px;">
                    <span>Tổng số NH rà soát: <strong>{total}</strong></span> |
                    <span style="color: #16A34A;">Đầy đủ thông tin: <strong>{valid_count}</strong></span> |
                    <span style="color: #DC2626;">Đang hoạt động CẦN BỔ SUNG: <strong>{need_count}</strong></span> |
                    <span style="color: #6B7280;">Bỏ qua (Chưa hoạt động / Mất mạng): <strong>{skipped_count}</strong></span> |
                    <span style="color: #8B5CF6;">Loại bỏ theo cấu hình: <strong>{excluded_count}</strong></span>
                </div>
            </div>

            {table_content}

            <p style="margin-top: 24px; font-style: italic; color: #6B7280; font-size: 12px;">
                * Đây là email tự động từ tác vụ ngầm IT Daily Operations. Vui lòng không reply trực tiếp email này.
            </p>
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
            <div style="font-size: 12px; color: #4B5563;">
                <strong>Golden Gate Restaurant Group - IT Department</strong><br />
                Hệ thống Quản Trị Tác Vụ IT Daily Operations<br />
            </div>
        </body>
        </html>
        """

        from email.message import EmailMessage
        msg = EmailMessage()
        msg['Subject'] = f"[IT Operations] Rà Soát Thông Tin Nhà Hàng Còn Thiếu - {need_count} NH Cần Bổ Sung ({date_display})"
        msg['From'] = f"Golden Gate IT Operations <{self.SMTP_USER}>"
        msg['To'] = ", ".join(recipients)
        msg.set_content(
            f"Báo cáo rà soát thông tin nhà hàng ({date_display} {time_display}): "
            f"{need_count} nhà hàng đang hoạt động cần bổ sung thông tin. Chi tiết vui lòng xem định dạng HTML."
        )
        msg.add_alternative(html_content, subtype='html')

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(self.SMTP_USER, self.SMTP_PASSWORD)
            server.send_message(msg)

        return {
            "status": "success",
            "recipients": recipients,
            "need_count": need_count,
            "sent_at": now.strftime("%Y-%m-%d %H:%M:%S")
        }


restaurant_audit_service = RestaurantAuditService()
