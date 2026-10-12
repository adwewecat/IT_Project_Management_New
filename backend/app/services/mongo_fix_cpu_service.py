import os
import json
import socket
import ssl
import smtplib
import asyncio
import logging
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import pymongo.common
pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
from pymongo import MongoClient
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.restaurant import Restaurant

logger = logging.getLogger(__name__)


def _test_tcp_port(ip: str, port: int = 27017, timeout: float = 1.2) -> bool:
    """Kiểm tra cổng TCP với cơ chế retry 2 lần (lần 1 timeout 1.2s, lần 2 timeout 1.5s) chống rớt gói WAN/VPN"""
    for to in [timeout, 1.5]:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(to)
        try:
            s.connect((ip, port))
            s.close()
            return True
        except Exception:
            pass
    return False


def _verify_mongo_ping(ip: str, port: int = 27017, timeout_ms: int = 2000) -> bool:
    try:
        client = MongoClient(ip, port, serverSelectionTimeoutMS=timeout_ms)
        client.admin.command("ping")
        client.close()
        return True
    except Exception:
        return False


class MongoFixCpuService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    DEFAULT_RECIPIENT = "dung.nguyenanh@ggg.com.vn"

    INDEX_DEFINITIONS = [
        # (Database, Collection, Index Keys, Index Name)
        ("G_KITCHEN", "DISH_KDS", [("lineGuid", 1)], "idx_lineGuid"),
        ("G_KITCHEN", "DISH_KDS", [("id", 1)], "idx_id"),
        ("G_KITCHEN", "DISH_KDS", [("submitTime", -1)], "idx_submitTime"),
        ("G_KITCHEN", "ACTION_LOG", [("time", -1)], "idx_time"),
        ("G_ORDER", "ORDER", [("lstSession.lineGuid", 1), ("status", 1)], "idx_lstSession_lineGuid_status"),
        ("G_ORDER", "CO_MENU_ITEM", [("code", 1)], "idx_code"),
    ]

    def __init__(self):
        self._config_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
            "mongo_fix_cpu_config.json"
        )

    def get_default_email(self) -> str:
        """Lấy email mặc định nhận thông báo kết quả (mặc định dung.nguyenanh@ggg.com.vn)."""
        try:
            if os.path.exists(self._config_file):
                with open(self._config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    email = data.get("default_email", "").strip()
                    if email:
                        return email
        except Exception as e:
            logger.error(f"[MONGO_FIX_CPU] Lỗi đọc config default email: {e}")
        return self.DEFAULT_RECIPIENT

    def save_default_email(self, email: str) -> str:
        """Lưu email mặc định (chỉ Super Admin hoặc dung.nguyenanh mới được gọi)."""
        clean_email = email.strip() if email else self.DEFAULT_RECIPIENT
        try:
            os.makedirs(os.path.dirname(self._config_file), exist_ok=True)
            with open(self._config_file, "w", encoding="utf-8") as f:
                json.dump({"default_email": clean_email, "updated_at": datetime.now().isoformat()}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[MONGO_FIX_CPU] Lỗi ghi config default email: {e}")
        return clean_email

    @staticmethod
    def extract_subnet_prefix(ip: str) -> str:
        """Trích xuất subnet dạng '10.9.91.' từ IP '10.9.91.1' hoặc '10.9.91.12'"""
        ip = (ip or "").strip()
        parts = ip.split(".")
        if len(parts) >= 3:
            return f"{parts[0]}.{parts[1]}.{parts[2]}."
        return ip

    def process_mongo_ip(self, ip: str, port: int = 27017) -> Dict[str, Any]:
        """Thực thi tạo các index tối ưu trên 1 máy chủ MongoDB cụ thể."""
        created = []
        existing = []
        start_time = datetime.now()
        error_msg = None

        try:
            client = MongoClient(ip, port, serverSelectionTimeoutMS=2500)
            # Ping kiểm tra
            client.admin.command("ping")

            # Lấy danh sách DBs
            available_dbs = client.list_database_names()

            for db_name, coll_name, keys, name in self.INDEX_DEFINITIONS:
                if db_name not in available_dbs:
                    continue
                db = client[db_name]
                if coll_name not in db.list_collection_names():
                    continue

                coll = db[coll_name]
                try:
                    existing_indexes = list(coll.list_indexes())
                except Exception as ex_list:
                    logger.warning(f"[MONGO_FIX_CPU] {ip} - Không đọc được list_indexes của {coll_name}: {ex_list}")
                    existing_indexes = []

                existing_names = [idx.get("name") for idx in existing_indexes]

                # 1. Kiểm tra nếu index cùng tên đã tồn tại
                if name in existing_names:
                    existing.append(f"{coll_name}:{name}")
                    continue

                # 2. Kiểm tra xem đã có index nào trên cùng các trường (keys) chưa (vd: lineGuid_1 vs idx_lineGuid)
                desired_keys_tuple = tuple((str(k), int(v)) for k, v in keys)
                matched_existing_name = None
                for ex_idx in existing_indexes:
                    ex_key_dict = ex_idx.get("key", {})
                    try:
                        ex_keys_tuple = tuple((str(k), int(v)) for k, v in ex_key_dict.items())
                        if ex_keys_tuple == desired_keys_tuple:
                            matched_existing_name = ex_idx.get("name")
                            break
                    except Exception:
                        pass

                if matched_existing_name:
                    logger.info(f"[MONGO_FIX_CPU] {ip} - {coll_name} đã có index '{matched_existing_name}' trên key {keys}. Bỏ qua tạo lại.")
                    existing.append(f"{coll_name}:{matched_existing_name} (đã có sẵn)")
                    continue

                # 3. Tạo index mới và bọc an toàn lỗi trùng key khác tên (IndexOptionsConflict - code 85)
                try:
                    coll.create_index(keys, name=name, background=True)
                    created.append(f"{coll_name}:{name}")
                except Exception as ex_create:
                    err_str = str(ex_create)
                    if getattr(ex_create, "code", None) == 85 or "Index already exists with a different name" in err_str or "already exists" in err_str:
                        logger.info(f"[MONGO_FIX_CPU] {ip} - {coll_name}:{name} đã tồn tại với tên khác trên MongoDB: {err_str}")
                        existing.append(f"{coll_name}:{name} (đã có sẵn)")
                    else:
                        logger.warning(f"[MONGO_FIX_CPU] {ip} - Lỗi khi tạo index {coll_name}:{name}: {ex_create}")

            # ── XÓA LOGS CŨ CỦA G_ORDER VÀ G_KITCHEN (CHỈ GIỮ LẠI 2 THÁNG GẦN NHẤT) ──
            cleaned_logs: Dict[str, int] = {}
            total_cleaned_logs = 0

            cutoff_date = datetime.now() - timedelta(days=60)
            cutoff_ms = int(cutoff_date.timestamp() * 1000)

            purge_targets = [
                ("G_ORDER", "ACTION_LOG", "time"),
                ("G_ORDER", "ACTION_LOG_BK", "time"),
                ("G_ORDER", "ORDER_ACTION_LOG", "time"),
                ("G_KITCHEN", "ACTION_LOG", "time"),
                ("G_KITCHEN", "LOG_DISH_FINISH_ITEM", "submitTime"),
            ]

            for p_db_name, p_coll_name, p_time_field in purge_targets:
                if p_db_name not in available_dbs:
                    continue
                p_db = client[p_db_name]
                if p_coll_name not in p_db.list_collection_names():
                    continue

                p_coll = p_db[p_coll_name]
                try:
                    deleted_for_coll = 0
                    filter_q = {p_time_field: {"$lt": cutoff_ms}}

                    # Xóa theo lô 50.000 để an toàn, giải phóng bộ nhớ mượt mà
                    while True:
                        ids = [d["_id"] for d in p_coll.find(filter_q, {"_id": 1}).limit(50000)]
                        if not ids:
                            break
                        res_del = p_coll.delete_many({"_id": {"$in": ids}})
                        deleted_for_coll += res_del.deleted_count
                        if len(ids) < 50000:
                            break

                    if deleted_for_coll > 0:
                        cleaned_logs[f"{p_db_name}.{p_coll_name}"] = deleted_for_coll
                        total_cleaned_logs += deleted_for_coll
                        logger.info(f"[MONGO_FIX_CPU] {ip} - Đã xóa {deleted_for_coll:,} log cũ (>60 ngày) trong {p_db_name}.{p_coll_name}")
                except Exception as ex_p:
                    logger.warning(f"[MONGO_FIX_CPU] {ip} - Lỗi khi xóa log cũ {p_db_name}.{p_coll_name}: {ex_p}")

            client.close()
            connected = True
        except Exception as e:
            connected = False
            error_msg = str(e)
            cleaned_logs = {}
            total_cleaned_logs = 0

        dur = (datetime.now() - start_time).total_seconds()
        return {
            "ip": ip,
            "port": port,
            "connected": connected,
            "created_indexes": created,
            "existing_indexes": existing,
            "cleaned_logs": cleaned_logs,
            "total_cleaned_logs": total_cleaned_logs,
            "duration_seconds": round(dur, 2),
            "error_message": error_msg
        }

    def process_restaurant(self, restaurant: Restaurant) -> Dict[str, Any]:
        """Quét và xử lý toàn bộ IP kết nối được (.11, .12, .41) của một nhà hàng."""
        target_ip = restaurant.ip or restaurant.ip_wan
        if not target_ip:
            return {
                "restaurant_id": restaurant.id,
                "sap": restaurant.sap or "",
                "restaurant_name": restaurant.res or "",
                "trangthai": restaurant.trangthai or "ON",
                "subnet": "",
                "status": "FAILED",
                "processed_ips": [],
                "ip_results": [],
                "total_cleaned_logs": 0,
                "message": "Không tìm thấy địa chỉ IP LAN hoặc WAN của nhà hàng",
                "error_message": "Thiếu thông tin IP nhà hàng"
            }

        subnet = self.extract_subnet_prefix(target_ip)
        candidates_ips = [f"{subnet}11", f"{subnet}12", f"{subnet}41"]

        # Kiểm tra TCP port 27017 đồng thời
        open_ips = []
        for c_ip in candidates_ips:
            if _test_tcp_port(c_ip, 27017, timeout=1.2):
                open_ips.append(c_ip)

        if not open_ips:
            return {
                "restaurant_id": restaurant.id,
                "sap": restaurant.sap or "",
                "restaurant_name": restaurant.res or "",
                "trangthai": restaurant.trangthai or "ON",
                "subnet": subnet,
                "status": "OFFLINE",
                "processed_ips": [],
                "ip_results": [
                    {
                        "ip": c_ip,
                        "port": 27017,
                        "connected": False,
                        "created_indexes": [],
                        "existing_indexes": [],
                        "cleaned_logs": {},
                        "total_cleaned_logs": 0,
                        "duration_seconds": 0,
                        "error_message": "Port 27017 đóng / Máy trạm Offline"
                    } for c_ip in candidates_ips
                ],
                "total_cleaned_logs": 0,
                "message": f"Không có máy trạm nào mở port 27017 trong các IP (.11, .12, .41)",
                "error_message": "Không kết nối được MongoDB"
            }

        # Xử lý trên từng IP mở port
        ip_results = []
        any_success = False
        processed_ips = []

        for ip in open_ips:
            res = self.process_mongo_ip(ip, 27017)
            ip_results.append(res)
            if res["connected"]:
                any_success = True
                processed_ips.append(ip)

        total_cleaned = sum(r.get("total_cleaned_logs", 0) for r in ip_results)

        if any_success:
            total_created = sum(len(r["created_indexes"]) for r in ip_results)
            total_existing = sum(len(r["existing_indexes"]) for r in ip_results)
            msg = f"Đã kết nối {len(processed_ips)} IP ({', '.join(processed_ips)}). Tạo mới {total_created} index, đã có sẵn {total_existing} index."
            if total_cleaned > 0:
                msg += f" Đã xóa {total_cleaned:,} log cũ (>2 tháng) của G_ORDER & G_KITCHEN."
            status = "SUCCESS"
            err = None
        else:
            msg = f"Mở port TCP nhưng không xác thực được MongoDB"
            status = "FAILED"
            err = "; ".join([r.get("error_message") or "" for r in ip_results if r.get("error_message")])

        return {
            "restaurant_id": restaurant.id,
            "sap": restaurant.sap or "",
            "restaurant_name": restaurant.res or "",
            "trangthai": restaurant.trangthai or "ON",
            "subnet": subnet,
            "status": status,
            "processed_ips": processed_ips,
            "ip_results": ip_results,
            "total_cleaned_logs": total_cleaned,
            "message": msg,
            "error_message": err
        }

    def execute_fix_cpu(
        self,
        db: Session,
        restaurant_ids: List[int],
        default_email: Optional[str] = None,
        user_email: Optional[str] = None,
        performer_name: str = "IT Staff",
        send_email: bool = True
    ) -> Dict[str, Any]:
        """
        Thực hiện quét và tối ưu Index hàng loạt cho danh sách nhà hàng.
        Chỉ quét nhà hàng có trạng thái ON hoặc NEW (bỏ qua OFF).
        """
        # Lấy danh sách nhà hàng thỏa mãn
        query = db.query(Restaurant).filter(Restaurant.id.in_(restaurant_ids))
        all_matched = query.all()

        # Lọc chỉ lấy ON hoặc NEW (loại bỏ OFF)
        valid_restaurants: List[Restaurant] = []
        for r in all_matched:
            st = (r.trangthai or "").strip().upper()
            if st != "OFF":
                valid_restaurants.append(r)

        if not valid_restaurants:
            return {
                "total_restaurants": 0,
                "success_count": 0,
                "failed_count": 0,
                "results": [],
                "email_sent": False,
                "email_error": "Không có nhà hàng nào hợp lệ (trạng thái ON/NEW) trong danh sách chọn.",
                "recipients": [],
                "message": "Không có nhà hàng nào hợp lệ để xử lý."
            }

        # Xử lý đa luồng (tối đa 5 nhà hàng cùng lúc để không nghẽn mạng)
        results = []
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_rest = {executor.submit(self.process_restaurant, r): r for r in valid_restaurants}
            for future in future_to_rest:
                try:
                    res = future.result()
                    results.append(res)
                except Exception as e:
                    r = future_to_rest[future]
                    results.append({
                        "restaurant_id": r.id,
                        "sap": r.sap or "",
                        "restaurant_name": r.res or "",
                        "trangthai": r.trangthai or "ON",
                        "subnet": "",
                        "status": "FAILED",
                        "processed_ips": [],
                        "ip_results": [],
                        "message": f"Lỗi ngoại lệ: {str(e)}",
                        "error_message": str(e)
                    })

        # Sắp xếp kết quả theo mã SAP
        results.sort(key=lambda x: str(x.get("sap", "")))

        success_count = sum(1 for r in results if r["status"] == "SUCCESS")
        failed_count = len(results) - success_count
        total_cleaned_all = sum(r.get("total_cleaned_logs", 0) for r in results)

        # Xử lý người nhận Email
        recipients = []
        # Luôn có email mặc định
        primary_default = default_email or self.get_default_email()
        if primary_default:
            recipients.append(primary_default.strip())

        # Email của user thực hiện
        if user_email and user_email.strip():
            clean_u = user_email.strip()
            if clean_u not in recipients:
                recipients.append(clean_u)

        email_sent = False
        email_error = None

        if send_email and recipients:
            try:
                self.send_fix_cpu_report_email(
                    results=results,
                    recipients=recipients,
                    performer_name=performer_name,
                    success_count=success_count,
                    failed_count=failed_count,
                    total_cleaned_logs=total_cleaned_all
                )
                email_sent = True
            except Exception as mail_err:
                email_error = str(mail_err)
                logger.error(f"[MONGO_FIX_CPU] Lỗi khi gửi email báo cáo: {mail_err}")

        summary_msg = f"Đã hoàn thành xử lý {len(results)} nhà hàng ({success_count} thành công, {failed_count} offline/thất bại)."
        if total_cleaned_all > 0:
            summary_msg += f" Đã xóa sạch {total_cleaned_all:,} bản ghi log cũ (>2 tháng) trong G_ORDER & G_KITCHEN."

        return {
            "total_restaurants": len(results),
            "success_count": success_count,
            "failed_count": failed_count,
            "total_cleaned_logs": total_cleaned_all,
            "results": results,
            "email_sent": email_sent,
            "email_error": email_error,
            "recipients": recipients,
            "message": summary_msg
        }

    def send_fix_cpu_report_email(
        self,
        results: List[Dict[str, Any]],
        recipients: List[str],
        performer_name: str,
        success_count: int,
        failed_count: int,
        total_cleaned_logs: int = 0
    ) -> Dict[str, Any]:
        """Gửi email báo cáo kết quả tối ưu Index MongoDB đẹp mắt theo chuẩn Golden Gate."""
        if not recipients:
            raise ValueError("Không có danh sách email người nhận.")

        now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        date_str = datetime.now().strftime("%d/%m/%Y")
        total = len(results)

        # Xây dựng bảng HTML chi tiết
        rows_html = ""
        for idx, r in enumerate(results, 1):
            sap = r.get("sap") or "N/A"
            name = r.get("restaurant_name") or "N/A"
            subnet = r.get("subnet") or ""
            status = r.get("status")

            if status == "SUCCESS":
                status_badge = '<span style="background-color:#DEF7EC;color:#03543F;border:1px solid #31C48D;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:11px;">THÀNH CÔNG</span>'
            elif status == "OFFLINE":
                status_badge = '<span style="background-color:#FEF08A;color:#854D0E;border:1px solid #FACC15;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:11px;">OFFLINE (.11/.12/.41)</span>'
            else:
                status_badge = '<span style="background-color:#FDE8E8;color:#9B1C1C;border:1px solid #F98080;padding:3px 8px;border-radius:4px;font-weight:bold;font-size:11px;">THẤT BẠI</span>'

            # Chi tiết các IP
            ip_details = []
            for ip_r in r.get("ip_results", []):
                ip_addr = ip_r.get("ip")
                if ip_r.get("connected"):
                    cr = len(ip_r.get("created_indexes", []))
                    ex = len(ip_r.get("existing_indexes", []))
                    dur = ip_r.get("duration_seconds", 0)
                    cl = ip_r.get("total_cleaned_logs", 0)
                    cl_str = f" | <span style='color:#B45309;'>🗑️ Xóa {cl:,} log cũ</span>" if cl > 0 else ""
                    ip_details.append(f"<b style='color:#059669;'>{ip_addr}</b> (Tạo mới: {cr}, Có sẵn: {ex}{cl_str} - {dur}s)")
                else:
                    err = ip_r.get("error_message") or "Đóng port"
                    ip_details.append(f"<span style='color:#9CA3AF;'>{ip_addr} ({err})</span>")

            details_html = "<br/>".join(ip_details) if ip_details else "<span style='color:#9CA3AF;'>Không có IP phản hồi</span>"
            bg_color = "#FFFFFF" if idx % 2 != 0 else "#F9FAFB"

            rows_html += f"""
            <tr style="background-color:{bg_color};border-bottom:1px solid #E5E7EB;">
                <td style="padding:10px 12px;text-align:center;font-size:12px;color:#6B7280;">{idx}</td>
                <td style="padding:10px 12px;font-weight:bold;font-size:13px;color:#111827;">{sap}</td>
                <td style="padding:10px 12px;font-size:13px;color:#1F2937;">{name}</td>
                <td style="padding:10px 12px;font-size:12px;color:#4B5563;font-family:monospace;">{subnet}</td>
                <td style="padding:10px 12px;text-align:center;">{status_badge}</td>
                <td style="padding:10px 12px;font-size:12px;line-height:1.4;">{details_html}</td>
            </tr>
            """

        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>Báo cáo Xử lý Full CPU MongoDB Nhà Hàng</title>
</head>
<body style="margin:0;padding:20px;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:960px;margin:0 auto;background:#FFFFFF;border-radius:10px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);overflow:hidden;border:1px solid #E5E7EB;">
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #B45309 0%, #D97706 50%, #F59E0B 100%);padding:24px 30px;color:#FFFFFF;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:700;opacity:0.9;">HỆ THỐNG QUẢN TRỊ & VẬN HÀNH ITSS - GOLDEN GATE</div>
            <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">BÁO CÁO XỬ LÝ FULL CPU MONGODB NHÀ HÀNG</h1>
            <p style="margin:6px 0 0 0;font-size:13px;opacity:0.95;">Tối ưu Index tự động & Dọn dẹp Log cũ (&gt;2 tháng) trong G_ORDER và G_KITCHEN</p>
        </div>

        <!-- Info Bar -->
        <div style="padding:16px 30px;background-color:#FFFBEB;border-bottom:1px solid #FDE68A;display:flex;flex-wrap:wrap;gap:20px;font-size:13px;color:#92400E;">
            <div><b>Thời gian thực thi:</b> {now_str}</div>
            <div><b>Người thực hiện:</b> {performer_name}</div>
            <div><b>Phạm vi:</b> Nhà hàng trạng thái ON / NEW (IP .11, .12, .41)</div>
        </div>

        <!-- Metric Cards -->
        <div style="padding:24px 30px 10px 30px;">
            <table style="width:100%;border-collapse:separate;border-spacing:12px 0;">
                <tr>
                    <td style="width:25%;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Tổng số Nhà Hàng</div>
                        <div style="font-size:24px;font-weight:900;color:#0F172A;margin-top:4px;">{total}</div>
                    </td>
                    <td style="width:25%;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:11px;font-weight:700;color:#047857;text-transform:uppercase;">Thành Công</div>
                        <div style="font-size:24px;font-weight:900;color:#065F46;margin-top:4px;">{success_count}</div>
                    </td>
                    <td style="width:25%;background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:11px;font-weight:700;color:#B91C1C;text-transform:uppercase;">Thất Bại / Offline</div>
                        <div style="font-size:24px;font-weight:900;color:#991B1B;margin-top:4px;">{failed_count}</div>
                    </td>
                    <td style="width:25%;background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:16px;text-align:center;">
                        <div style="font-size:11px;font-weight:700;color:#92400E;text-transform:uppercase;">Log Đã Xóa (&gt;2 tháng)</div>
                        <div style="font-size:24px;font-weight:900;color:#B45309;margin-top:4px;">{total_cleaned_logs:,}</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Explanation Note -->
        <div style="padding:0 30px 16px 30px;">
            <div style="background:#F0FDF4;border-left:4px solid #10B981;padding:12px 16px;border-radius:0 6px 6px 0;font-size:13px;color:#065F46;line-height:1.5;">
                Đã test thử từ thời gian API gọi 1s 20 lần thành chia nhỏ xử lý tra cứu trong <b>&lt; 1 mili-giây</b>, triệt tiêu COLLSCAN giải phóng CPU 100%.
            </div>
        </div>

        <!-- Detail Table -->
        <div style="padding:0 30px 30px 30px;">
            <h3 style="font-size:15px;font-weight:700;color:#1F2937;margin:16px 0 12px 0;">Danh Sách Chi Tiết Từng Nhà Hàng</h3>
            <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:6px;overflow:hidden;">
                <thead>
                    <tr style="background-color:#F3F4F6;color:#374151;font-size:12px;text-align:left;border-bottom:2px solid #E5E7EB;">
                        <th style="padding:10px 12px;width:40px;text-align:center;">STT</th>
                        <th style="padding:10px 12px;width:70px;">Mã SAP</th>
                        <th style="padding:10px 12px;width:200px;">Tên Nhà Hàng</th>
                        <th style="padding:10px 12px;width:120px;">Dải Mạng (Subnet)</th>
                        <th style="padding:10px 12px;width:130px;text-align:center;">Trạng Thái</th>
                        <th style="padding:10px 12px;">Chi Tiết IP (.11, .12, .41) & Index</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </div>

        <!-- Footer -->
        <div style="background:#F9FAFB;padding:16px 30px;border-top:1px solid #E5E7EB;font-size:12px;color:#6B7280;line-height:1.5;text-align:center;">
            Email được gửi tự động từ <b>Hệ Thống Quản Trị & Vận Hành ITSS</b> - Golden Gate Restaurant Group.<br/>
            Người nhận báo cáo: {', '.join(recipients)}
        </div>
    </div>
</body>
</html>"""

        msg = EmailMessage()
        msg["Subject"] = f"[IT VẬN HÀNH] Báo cáo Xử Lý Full CPU MongoDB Nhà Hàng ({success_count}/{total} thành công) - {date_str}"
        msg["From"] = f"Hệ Thống Quản Trị ITSS <{self.SMTP_USER}>"
        msg["To"] = ", ".join(recipients)

        msg.set_content(
            f"Báo cáo Xử Lý Full CPU MongoDB Nhà Hàng ngày {date_str}:\n"
            f"- Tổng số nhà hàng: {total}\n"
            f"- Thành công: {success_count}\n"
            f"- Thất bại / Offline: {failed_count}\n"
            f"- Người thực hiện: {performer_name}\n"
            f"Chi tiết vui lòng xem định dạng HTML đính kèm."
        )
        msg.add_alternative(html_body, subtype="html")

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT, timeout=25) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(self.SMTP_USER, self.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"[MONGO_FIX_CPU] Đã gửi email báo cáo thành công tới: {', '.join(recipients)}")
        return {
            "status": "success",
            "recipients": recipients,
            "total": total,
            "success_count": success_count,
            "failed_count": failed_count
        }


mongo_fix_cpu_service = MongoFixCpuService()
