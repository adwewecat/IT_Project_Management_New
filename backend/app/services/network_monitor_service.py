import os
import re
import subprocess
import smtplib
import ssl
import logging
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Any, Optional
from email.message import EmailMessage

from sqlalchemy import select, func
from app.core.database import SessionLocal
from app.models.restaurant import Restaurant

logger = logging.getLogger(__name__)


class NetworkMonitorService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    @staticmethod
    def _clean_router_ip(raw: Optional[str]) -> Optional[str]:
        """
        Chuẩn hóa IP Router / VPN nhà hàng:
        IP Router của nhà hàng luôn kết thúc bằng .1 (Ví dụ: 10.8.74.1, 10.9.147.1, 10.60.35.1).
        Nếu trong cơ sở dữ liệu lưu dạng dải mạng (10.60.35.x/24, 10.8.110.x, 10.8.40.X, 10.60.35.0/24),
        hệ thống tự động trích xuất 3 octet đầu tiên và gắn .1 để ping đúng router gateway của nhà hàng.
        """
        if not raw:
            return None
        text = str(raw).strip()
        m = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3})', text)
        if not m:
            return None
        prefix = m.group(1)
        octets = prefix.split('.')
        if not all(0 <= int(o) <= 255 for o in octets):
            return None
        return f"{prefix}.1"

    @staticmethod
    def _clean_wan_ip(raw: Optional[str]) -> Optional[str]:
        """
        Chuẩn hóa IP WAN Public: Trích xuất IP WAN hợp lệ (VD: 113.161.254.109).
        """
        if not raw:
            return None
        parts = re.split(r'[\s,;/]+', str(raw).strip())
        for p in parts:
            p_clean = re.sub(r'[^\d.]', '', p).strip()
            octets = p_clean.split('.')
            if len(octets) == 4 and all(o.isdigit() and 0 <= int(o) <= 255 for o in octets):
                return p_clean
        return None

    @staticmethod
    def _extract_all_wan_ips(raw: Optional[str]) -> List[str]:
        """
        Trích xuất toàn bộ các IP WAN hợp lệ của nhà hàng (hỗ trợ các nhà hàng có nhiều line Internet dự phòng).
        """
        if not raw:
            return []
        parts = re.split(r'[\s,;/]+', str(raw).strip())
        valid = []
        for p in parts:
            p_clean = re.sub(r'[^\d.]', '', p).strip()
            octets = p_clean.split('.')
            if len(octets) == 4 and all(o.isdigit() and 0 <= int(o) <= 255 for o in octets):
                if p_clean not in valid:
                    valid.append(p_clean)
        return valid

    @staticmethod
    def _ping_single_ip(ip: str, timeout_ms: int = 1200) -> bool:
        if not ip:
            return False
        try:
            # Gửi 2 gói tin ICMP, timeout 1.2s mỗi gói, tổng thời gian chờ tiến trình tối đa 5s
            r = subprocess.run(
                ['ping', '-n', '2', '-w', str(timeout_ms), ip],
                capture_output=True,
                timeout=5.0
            )
            out = r.stdout.decode('cp1252', errors='ignore')
            # Trên Windows, ping thành công khi returncode == 0 và nhận được phản hồi có thông số TTL/bytes
            return (r.returncode == 0 and ('TTL=' in out or 'bytes=' in out))
        except Exception:
            return False

    @classmethod
    def check_vpn_restaurants(cls, max_workers: int = 25) -> Dict[str, Any]:
        """
        Kiểm tra kết nối VPN: Ping từ Server Local tới IP Router / VPN của các nhà hàng đang hoạt động (Trạng thái ON).
        Bỏ qua các nhà hàng có trạng thái OFF và NEW.
        """
        db = SessionLocal()
        try:
            # Chỉ lấy các nhà hàng có trạng thái ON, bỏ qua NEW và OFF
            restaurants = db.scalars(
                select(Restaurant)
                .where(func.upper(func.ltrim(func.rtrim(Restaurant.trangthai))) == 'ON')
                .order_by(Restaurant.sap)
            ).all()

            if not restaurants:
                raise RuntimeError("Không tìm thấy nhà hàng nào có trạng thái ON trong cơ sở dữ liệu để kiểm tra kết nối VPN.")

            targets = []
            for r in restaurants:
                clean_ip = cls._clean_router_ip(r.ip)
                if clean_ip:
                    sap_display = str(r.sap or '').strip()
                    if sap_display.lower() in ('none', 'null', ''):
                        sap_display = '-'
                    targets.append({
                        "id": r.id,
                        "sap": sap_display,
                        "res": r.res or "",
                        "ip": clean_ip,
                        "raw_ip": r.ip or ""
                    })

            if not targets:
                raise RuntimeError("Không có nhà hàng trạng thái ON nào có cấu hình IP Router / VPN hợp lệ để kiểm tra.")

            def _worker(item):
                ok = cls._ping_single_ip(item["ip"], timeout_ms=1200)
                status_label = "OK" if ok else "Rớt VPN"
                return {
                    "id": item["id"],
                    "sap": item["sap"],
                    "res": item["res"],
                    "ip": item["ip"],
                    "status": status_label,
                    "is_up": ok
                }

            results = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                results = list(executor.map(_worker, targets))

            down_items = [item for item in results if not item["is_up"]]
            ok_items = [item for item in results if item["is_up"]]

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return {
                "check_type": "VPN",
                "target_time": now_str,
                "total": len(results),
                "ok_count": len(ok_items),
                "down_count": len(down_items),
                "down_items": down_items,
                "ok_items": ok_items,
                "all_items": down_items + ok_items
            }
        finally:
            db.close()

    @classmethod
    def check_internet_restaurants(cls, max_workers: int = 25) -> Dict[str, Any]:
        """
        Kiểm tra Internet WAN: Ping từ Server Local xuống IP WAN Nhà Hàng đang hoạt động (Trạng thái ON).
        Bỏ qua các nhà hàng có trạng thái OFF và NEW. Hỗ trợ đa line WAN (Primary + Backup).
        """
        db = SessionLocal()
        try:
            # Chỉ lấy các nhà hàng có trạng thái ON, bỏ qua NEW và OFF
            restaurants = db.scalars(
                select(Restaurant)
                .where(func.upper(func.ltrim(func.rtrim(Restaurant.trangthai))) == 'ON')
                .order_by(Restaurant.sap)
            ).all()

            if not restaurants:
                raise RuntimeError("Không tìm thấy nhà hàng nào có trạng thái ON trong cơ sở dữ liệu để kiểm tra Internet WAN.")

            targets = []
            for r in restaurants:
                all_wans = cls._extract_all_wan_ips(r.ip_wan)
                if all_wans:
                    sap_display = str(r.sap or '').strip()
                    if sap_display.lower() in ('none', 'null', ''):
                        sap_display = '-'
                    targets.append({
                        "id": r.id,
                        "sap": sap_display,
                        "res": r.res or "",
                        "wans": all_wans,
                        "ip_wan": " / ".join(all_wans),
                        "raw_wan": r.ip_wan or ""
                    })

            if not targets:
                raise RuntimeError("Không có nhà hàng trạng thái ON nào có cấu hình IP WAN hợp lệ để kiểm tra.")

            def _worker(item):
                wans = item["wans"]
                ok = False
                for ip in wans:
                    if cls._ping_single_ip(ip, timeout_ms=1200):
                        ok = True
                        break
                status_label = "OK" if ok else "Rớt INTERNET"
                return {
                    "id": item["id"],
                    "sap": item["sap"],
                    "res": item["res"],
                    "ip_wan": item["ip_wan"],
                    "status": status_label,
                    "is_up": ok
                }

            results = []
            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                results = list(executor.map(_worker, targets))

            down_items = [item for item in results if not item["is_up"]]
            ok_items = [item for item in results if item["is_up"]]

            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            return {
                "check_type": "INTERNET",
                "target_time": now_str,
                "total": len(results),
                "ok_count": len(ok_items),
                "down_count": len(down_items),
                "down_items": down_items,
                "ok_items": ok_items,
                "all_items": down_items + ok_items
            }
        finally:
            db.close()

    @classmethod
    def send_vpn_alert_email(cls, results: Dict[str, Any], recipients: List[str]) -> Dict[str, Any]:
        """
        Gửi email cảnh báo trạng thái VPN Nhà Hàng.
        """
        if not recipients:
            raise ValueError("Không có danh sách email người nhận để gửi cảnh báo VPN.")

        now = datetime.now()
        date_display = now.strftime("%d/%m/%Y")
        time_display = now.strftime("%H:%M")

        down_count = results.get("down_count", 0)
        total = results.get("total", 0)
        ok_count = results.get("ok_count", 0)
        items = results.get("all_items", [])

        table_rows = ""
        for it in items:
            is_down = not it.get("is_up", False)
            bg_color = "#FEE2E2" if is_down else "#FFFFFF"
            status_color = "#DC2626" if is_down else "#16A34A"
            status_badge = f"<b style='color: {status_color};'>{it.get('status')}</b>"
            table_rows += f"""
            <tr style="background-color: {bg_color};">
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px; text-align: center;">{it.get('sap')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px;">{it.get('res')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px; font-family: monospace;">{it.get('ip')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px; text-align: center;">{status_badge}</td>
            </tr>
            """

        alert_color = "#DC2626" if down_count > 0 else "#16A34A"
        summary_title = f"Hiện Có {down_count} Nhà Hàng Rớt VPN" if down_count > 0 else "Toàn Bộ Nhà Hàng Đều Kết Nối VPN Tốt"

        html_content = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; }}
                table {{ border-collapse: collapse; width: 100%; max-width: 900px; margin-top: 12px; }}
                th {{ background-color: #F3F4F6; border: 1px solid #D1D5DB; padding: 8px 10px; text-align: left; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div style="padding: 12px 16px; background-color: #F8FAFC; border-left: 4px solid {alert_color}; margin-bottom: 16px;">
                <h2 style="margin: 0 0 6px; color: {alert_color}; font-size: 18px;">
                    {summary_title}
                </h2>
                <p style="margin: 0; font-size: 13px; color: #4B5563;">
                    Check VPN Nhà Hàng lúc <strong>{time_display}</strong> ngày <strong>{date_display}</strong>
                </p>
                <div style="margin-top: 8px; font-size: 13px;">
                    <span>Tổng số NH kiểm tra: <strong>{total}</strong></span> |
                    <span style="color: #16A34A;">Kết nối bình thường: <strong>{ok_count}</strong></span> |
                    <span style="color: #DC2626;">Rớt VPN: <strong>{down_count}</strong></span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 80px; text-align: center;">MÃ SAP</th>
                        <th style="min-width: 250px;">TÊN NHÀ HÀNG</th>
                        <th style="width: 150px;">IP ROUTER (VPN)</th>
                        <th style="width: 120px; text-align: center;">TRẠNG THÁI</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>

            <p style="margin-top: 24px; font-style: italic; color: #6B7280; font-size: 12px;">
                * Đây là email tự động gửi từ hệ thống IT Daily Operations. Vui lòng không reply trực tiếp email này.
            </p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />

            <div style="font-size: 12px; color: #4B5563;">
                <strong>Golden Gate Restaurant Group - IT Department</strong><br />
                Hotline IT: <strong>(028) 7300 7430</strong> (Ext 1: Helpdesk/Mạng - Ext 2: Application Support)<br />
                Email Helpdesk: <a href="mailto:hcm.it.helpdesk@ggg.com.vn">hcm.it.helpdesk@ggg.com.vn</a>
            </div>
        </body>
        </html>
        """

        msg = EmailMessage()
        msg['Subject'] = f"Check VPN NH tại thời điểm {time_display} ngày {date_display}"
        msg['From'] = cls.SMTP_USER
        msg['To'] = ", ".join(recipients)
        msg.set_content(f"Báo cáo kết nối VPN Nhà Hàng lúc {time_display} ngày {date_display}: {down_count} nhà hàng rớt VPN.")
        msg.add_alternative(html_content, subtype='html')

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT, timeout=25) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
            server.send_message(msg)

        return {
            "status": "success",
            "message": f"Đã gửi email cảnh báo VPN thành công tới {len(recipients)} người nhận.",
            "recipients": recipients,
            "down_count": down_count
        }

    @classmethod
    def send_internet_alert_email(cls, results: Dict[str, Any], recipients: List[str]) -> Dict[str, Any]:
        """
        Gửi email cảnh báo trạng thái Internet WAN Nhà Hàng.
        """
        if not recipients:
            raise ValueError("Không có danh sách email người nhận để gửi cảnh báo Internet.")

        now = datetime.now()
        date_display = now.strftime("%d/%m/%Y")
        time_display = now.strftime("%H:%M")

        down_count = results.get("down_count", 0)
        total = results.get("total", 0)
        ok_count = results.get("ok_count", 0)
        items = results.get("all_items", [])

        table_rows = ""
        for it in items:
            is_down = not it.get("is_up", False)
            bg_color = "#FEE2E2" if is_down else "#FFFFFF"
            status_color = "#DC2626" if is_down else "#16A34A"
            status_badge = f"<b style='color: {status_color};'>{it.get('status')}</b>"
            table_rows += f"""
            <tr style="background-color: {bg_color};">
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px; text-align: center;">{it.get('sap')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px;">{it.get('res')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px; font-family: monospace;">{it.get('ip_wan')}</td>
                <td style="border: 1px solid #D1D5DB; padding: 6px 10px; text-align: center;">{status_badge}</td>
            </tr>
            """

        alert_color = "#DC2626" if down_count > 0 else "#16A34A"
        summary_title = f"Hiện Có {down_count} Nhà Hàng Rớt Internet" if down_count > 0 else "Toàn Bộ Nhà Hàng Đều Có Kết Nối Internet Tốt"

        html_content = f"""
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; }}
                table {{ border-collapse: collapse; width: 100%; max-width: 900px; margin-top: 12px; }}
                th {{ background-color: #F3F4F6; border: 1px solid #D1D5DB; padding: 8px 10px; text-align: left; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div style="padding: 12px 16px; background-color: #F8FAFC; border-left: 4px solid {alert_color}; margin-bottom: 16px;">
                <h2 style="margin: 0 0 6px; color: {alert_color}; font-size: 18px;">
                    {summary_title}
                </h2>
                <p style="margin: 0; font-size: 13px; color: #4B5563;">
                    Check Internet Nhà Hàng lúc <strong>{time_display}</strong> ngày <strong>{date_display}</strong>
                </p>
                <div style="margin-top: 8px; font-size: 13px;">
                    <span>Tổng số NH kiểm tra: <strong>{total}</strong></span> |
                    <span style="color: #16A34A;">Kết nối bình thường: <strong>{ok_count}</strong></span> |
                    <span style="color: #DC2626;">Rớt Internet: <strong>{down_count}</strong></span>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 80px; text-align: center;">MÃ SAP</th>
                        <th style="min-width: 250px;">TÊN NHÀ HÀNG</th>
                        <th style="width: 150px;">IP WAN (INTERNET)</th>
                        <th style="width: 120px; text-align: center;">TRẠNG THÁI</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>

            <p style="margin-top: 24px; font-style: italic; color: #6B7280; font-size: 12px;">
                * Đây là email tự động gửi từ hệ thống IT Daily Operations. Vui lòng không reply trực tiếp email này.
            </p>

            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;" />

            <div style="font-size: 12px; color: #4B5563;">
                <strong>Golden Gate Restaurant Group - IT Department</strong><br />
                Hotline IT: <strong>(028) 7300 7430</strong> (Ext 1: Helpdesk/Mạng - Ext 2: Application Support)<br />
                Email Helpdesk: <a href="mailto:hcm.it.helpdesk@ggg.com.vn">hcm.it.helpdesk@ggg.com.vn</a>
            </div>
        </body>
        </html>
        """

        msg = EmailMessage()
        msg['Subject'] = f"Check Internet WAN NH tại thời điểm {time_display} ngày {date_display}"
        msg['From'] = cls.SMTP_USER
        msg['To'] = ", ".join(recipients)
        msg.set_content(f"Báo cáo kết nối Internet Nhà Hàng lúc {time_display} ngày {date_display}: {down_count} nhà hàng rớt Internet.")
        msg.add_alternative(html_content, subtype='html')

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT, timeout=25) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
            server.send_message(msg)

        return {
            "status": "success",
            "message": f"Đã gửi email cảnh báo Internet thành công tới {len(recipients)} người nhận.",
            "recipients": recipients,
            "down_count": down_count
        }


network_monitor_service = NetworkMonitorService()
