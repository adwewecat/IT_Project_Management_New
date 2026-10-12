import os
import json
import socket
import smtplib
import ssl
import re
import logging
from datetime import datetime
from email.message import EmailMessage
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import text
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
RESULTS_FILE = os.path.join(DATA_DIR, "mongo_mosquitto_audit.json")
CONFIG_FILE = os.path.join(DATA_DIR, "mongo_mosquitto_config.json")


def is_restaurant_excluded(r: Dict[str, Any]) -> bool:
    """
    Quy tắc loại trừ:
    1. Chỉ quét những nhà hàng có trạng thái ON (bỏ qua NEW và OFF).
    2. Mã SAP KHÔNG phải đúng 4 chữ số thì loại luôn (VD: sap='1', sap='KHO', ...).
    3. Bỏ qua tất cả nhà hàng có tên/brand/sap chứa:
       - TCH, The Coffee House
       - UT, Universal, Tea
       - Khong Phai NH
    """
    name = str(r.get("res") or r.get("NAME") or r.get("restaurant_name") or "").strip()
    brand = str(r.get("brand") or r.get("BRAND") or "").strip()
    sap = str(r.get("sap") or r.get("SAP") or "").strip()
    trangthai = str(r.get("trangthai") or r.get("status") or "").strip().upper()

    # 1. Chỉ quét nhà hàng có trạng thái ON (loại bỏ NEW, OFF, ...)
    if trangthai != "ON":
        return True

    # 2. Loại bỏ mã SAP không phải đúng 4 chữ số
    if not (len(sap) == 4 and sap.isdigit()):
        return True

    # 3. Không phải nhà hàng
    if "khong phai nh" in sap.lower() or "khong phai nh" in name.lower():
        return True

    # 4. The Coffee House / TCH
    if brand.lower() == "the coffee house":
        return True
    if re.search(r'\btch\b', name, re.IGNORECASE) or re.search(r'\bthe\s*coffee\s*house\b', name, re.IGNORECASE):
        return True
    if re.search(r'\btch\b', sap, re.IGNORECASE):
        return True

    # 5. Universal Tea / UT / Tea
    if brand.lower() in ["ut", "universal tea"]:
        return True
    if re.search(r'\but\b', name, re.IGNORECASE) or re.search(r'\but\b', sap, re.IGNORECASE):
        return True
    if "universal" in name.lower() or "universal" in brand.lower():
        return True
    if re.search(r'\btea\b', name, re.IGNORECASE) or re.search(r'\btea\b', brand, re.IGNORECASE):
        return True

    return False


def test_tcp_port(ip: str, port: int, timeout: float = 1.0, retries: int = 1) -> bool:
    """Kiểm tra mở cổng TCP an toàn, có retry chống rớt gói mạng WAN/VPN."""
    for attempt in range(retries + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                cur_timeout = timeout if attempt == 0 else max(timeout, 1.5)
                s.settimeout(cur_timeout)
                if s.connect_ex((ip, port)) == 0:
                    return True
        except Exception:
            pass
    return False


class MongoMosquittoService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"
    DEFAULT_RECIPIENTS = "dung.nguyenanh@ggg.com.vn"

    def __init__(self):
        self._cached_results: Optional[Dict[str, Any]] = None
        self._load_cached_results()

    def _load_cached_results(self):
        if os.path.exists(RESULTS_FILE):
            try:
                with open(RESULTS_FILE, "r", encoding="utf-8") as f:
                    self._cached_results = json.load(f)
            except Exception as e:
                logger.warning(f"[MONGO_MOSQUITTO] Không đọc được cache kết quả: {e}")

    def get_config(self) -> Dict[str, Any]:
        """Lấy cấu hình email và thông số tác vụ."""
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {
            "email_recipients": self.DEFAULT_RECIPIENTS,
            "has_email_notification": True,
            "mongo_port": 27017,
            "mosquitto_port": 1883,
            "candidate_suffixes": [".41", ".11", ".12"],
            "socket_timeout": 1.2,
        }

    def save_config(self, cfg: Dict[str, Any]) -> None:
        """Lưu cấu hình."""
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)

    def get_latest_results(self) -> Dict[str, Any]:
        """Lấy kết quả quét mới nhất từ cache hoặc file."""
        if self._cached_results:
            return self._cached_results
        self._load_cached_results()
        if self._cached_results:
            return self._cached_results
        return {
            "scan_date": None,
            "scan_time": None,
            "total_scanned": 0,
            "total_ok": 0,
            "total_error": 0,
            "total_excluded": 0,
            "items": [],
            "error_items": [],
            "message": "Chưa có kết quả quét nào. Vui lòng bấm 'Chạy Thử' hoặc 'Quét Lại Ngay'."
        }

    def _check_one_restaurant(self, rest: Dict[str, Any], mongo_port: int, mosquitto_port: int, timeout: float) -> Dict[str, Any]:
        """
        Kiểm tra 1 nhà hàng:
        - Lấy subnet từ IP gateway (VD 10.8.45.1 -> 10.8.45)
        - Dò lần lượt candidate IPs: .41, .11, .12
        - Nếu 1 máy có CẢ Port 27017 (Mongo) và Port 1883 (Mosquitto) đều mở:
          -> Coi như nhà hàng đó OK! Dừng không quét các máy khác.
        - Nếu không máy nào có cả 2:
          -> Thu thập trạng thái lỗi chi tiết và đánh dấu ERROR.
        """
        rest_id = rest.get("id")
        sap = str(rest.get("sap") or "").strip()
        name = str(rest.get("res") or "").strip()
        brand = str(rest.get("brand") or "").strip()
        ip_gw = str(rest.get("ip") or "").strip()

        parts = ip_gw.split(".")
        if len(parts) >= 3 and not any(x in parts[0] + parts[1] + parts[2] for x in ["x", "X"]):
            subnet = f"{parts[0]}.{parts[1]}.{parts[2]}"
        else:
            subnet = ""

        item_result = {
            "restaurant_id": rest_id,
            "sap_code": sap,
            "restaurant_name": name,
            "brand": brand,
            "ip_gateway": ip_gw,
            "subnet": subnet,
            "representative_ip": "",
            "mongo_port": mongo_port,
            "mosquitto_port": mosquitto_port,
            "mongo_status": "Không kết nối",
            "mongo_ok": False,
            "mosquitto_status": "Không kết nối",
            "mosquitto_ok": False,
            "is_ok": False,
            "status_label": "LỖI",
            "candidate_results": [],
            "note": ""
        }

        if not subnet:
            item_result["note"] = "Subnet IP gateway không hợp lệ (.x/24)"
            return item_result

        candidate_ips = [f"{subnet}.41", f"{subnet}.11", f"{subnet}.12"]
        found_perfect_match = False
        partial_cand = None

        for cand_ip in candidate_ips:
            mongo_open = test_tcp_port(cand_ip, mongo_port, timeout=timeout)
            mosq_open = test_tcp_port(cand_ip, mosquitto_port, timeout=timeout)

            cand_info = {
                "ip": cand_ip,
                "mongo_open": mongo_open,
                "mosquitto_open": mosq_open
            }
            item_result["candidate_results"].append(cand_info)

            # Trường hợp lý tưởng: 1 máy có cả 2 service đang chạy
            if mongo_open and mosq_open:
                item_result["representative_ip"] = cand_ip
                item_result["mongo_ok"] = True
                item_result["mongo_status"] = "Đang chạy (Running)"
                item_result["mosquitto_ok"] = True
                item_result["mosquitto_status"] = "Đang chạy (Running)"
                item_result["is_ok"] = True
                item_result["status_label"] = "OK"
                item_result["note"] = f"Máy đại diện {cand_ip}: Cả MongoDB & Mosquitto đều hoạt động tốt ✅"
                found_perfect_match = True
                break
            
            # Ghi nhớ máy có ít nhất 1 service mở nếu chưa có
            if (mongo_open or mosq_open) and not partial_cand:
                partial_cand = (cand_ip, mongo_open, mosq_open)

        # Nếu không máy nào có cả 2 service chạy đồng thời
        if not found_perfect_match:
            if partial_cand:
                cand_ip, m_open, mq_open = partial_cand
                item_result["representative_ip"] = cand_ip
                item_result["mongo_ok"] = m_open
                item_result["mongo_status"] = "Đang chạy (Running)" if m_open else "Tắt / Lỗi kết nối"
                item_result["mosquitto_ok"] = mq_open
                item_result["mosquitto_status"] = "Đang chạy (Running)" if mq_open else "Tắt / Lỗi kết nối"
                item_result["is_ok"] = False
                item_result["status_label"] = "LỖI"
                
                missing = []
                if not m_open:
                    missing.append(f"MongoDB ({mongo_port}) tắt/lỗi")
                if not mq_open:
                    missing.append(f"Mosquitto ({mosquitto_port}) tắt/lỗi")
                item_result["note"] = f"Máy {cand_ip}: {', '.join(missing)} ❌"
            else:
                # Cả 3 máy đều không mở 2 port
                item_result["representative_ip"] = f"{subnet}.*"
                item_result["mongo_ok"] = False
                item_result["mongo_status"] = "Tắt / Không mở Port"
                item_result["mosquitto_ok"] = False
                item_result["mosquitto_status"] = "Tắt / Không mở Port"
                item_result["is_ok"] = False
                item_result["status_label"] = "LỖI"
                item_result["note"] = f"Không tìm thấy MongoDB (27017) & Mosquitto (1883) trên các máy .41, .11, .12 ❌"

        return item_result

    def scan_all_restaurants(self, email_recipients: Optional[str] = None) -> Dict[str, Any]:
        """
        Quét toàn bộ nhà hàng đang hoạt động:
        1. Query database danh sách NH có trangthai = 'ON'
        2. Bỏ qua các nhà hàng TCH, The Coffee House, UT, Universal, Tea, Khong Phai NH
        3. Quét đa luồng kiểm tra máy đại diện (.41, .11, .12)
        4. Tổng hợp kết quả và lưu file
        5. Nếu có lỗi và có cấu hình email -> gửi email cảnh báo
        6. Nếu 100% OK -> KHÔNG gửi mail (theo đúng yêu cầu của user)
        """
        start_time = datetime.now()
        start_str = start_time.strftime("%Y-%m-%d %H:%M:%S")
        date_str = start_time.strftime("%d/%m/%Y")

        cfg = self.get_config()
        mongo_port = int(cfg.get("mongo_port", 27017))
        mosquitto_port = int(cfg.get("mosquitto_port", 1883))
        timeout = float(cfg.get("socket_timeout", 0.8))

        # 1. Query nhà hàng
        db = SessionLocal()
        raw_restaurants = []
        try:
            sql = "SELECT id, sap, res, brand, ip, trangthai FROM RESTAURANT WHERE trangthai = 'ON' ORDER BY id ASC"
            rows = db.execute(text(sql)).mappings().all()
            raw_restaurants = [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"[MONGO_MOSQUITTO] Lỗi query RESTAURANT: {e}")
            raise RuntimeError(f"Không thể truy vấn bảng RESTAURANT: {e}")
        finally:
            db.close()

        # 2. Lọc loại trừ
        target_restaurants = []
        excluded_count = 0
        for r in raw_restaurants:
            if is_restaurant_excluded(r):
                excluded_count += 1
            else:
                target_restaurants.append(r)

        total_scanned = len(target_restaurants)
        logger.info(f"[MONGO_MOSQUITTO] Bắt đầu quét {total_scanned} nhà hàng (đã loại trừ {excluded_count} TCH/UT/Khác)...")

        # 3. Quét đa luồng
        results: List[Dict[str, Any]] = []
        max_workers = min(35, max(10, os.cpu_count() * 5 if os.cpu_count() else 20))

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_rest = {
                executor.submit(self._check_one_restaurant, r, mongo_port, mosquitto_port, timeout): r
                for r in target_restaurants
            }
            for future in as_completed(future_to_rest):
                try:
                    res = future.result()
                    results.append(res)
                except Exception as err:
                    r = future_to_rest[future]
                    logger.debug(f"[MONGO_MOSQUITTO] Lỗi quét NH {r.get('sap')}: {err}")
                    results.append({
                        "restaurant_id": r.get("id"),
                        "sap_code": str(r.get("sap") or ""),
                        "restaurant_name": str(r.get("res") or ""),
                        "brand": str(r.get("brand") or ""),
                        "ip_gateway": str(r.get("ip") or ""),
                        "subnet": "",
                        "representative_ip": "",
                        "mongo_ok": False,
                        "mongo_status": "Lỗi",
                        "mosquitto_ok": False,
                        "mosquitto_status": "Lỗi",
                        "is_ok": False,
                        "status_label": "LỖI",
                        "candidate_results": [],
                        "note": f"Lỗi exception: {str(err)[:60]}"
                    })

        # Sắp xếp kết quả: Các NH lỗi lên đầu, sau đó sắp xếp theo SAP
        results.sort(key=lambda x: (x["is_ok"], x["sap_code"] or "9999"))

        total_ok = sum(1 for r in results if r["is_ok"])
        total_error = sum(1 for r in results if not r["is_ok"])
        error_items = [r for r in results if not r["is_ok"]]
        duration = round((datetime.now() - start_time).total_seconds(), 2)

        summary_data = {
            "scan_date": date_str,
            "scan_time": start_str,
            "duration_seconds": duration,
            "total_restaurants_active": len(raw_restaurants),
            "total_excluded": excluded_count,
            "total_scanned": total_scanned,
            "total_ok": total_ok,
            "total_error": total_error,
            "items": results,
            "error_items": error_items,
            "email_sent": False,
            "email_status": "Chưa gửi email",
            "message": f"Hoàn tất quét {total_scanned} nhà hàng ({duration}s): {total_ok} Đạt chuẩn OK, {total_error} Bị lỗi."
        }

        # 4. Lưu kết quả vào file json
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(RESULTS_FILE, "w", encoding="utf-8") as f:
                json.dump(summary_data, f, ensure_ascii=False, indent=2)
            self._cached_results = summary_data
        except Exception as se:
            logger.warning(f"[MONGO_MOSQUITTO] Lỗi ghi kết quả vào file: {se}")

        # 5. Xử lý gửi email
        # QUY TẮC CỦA USER: "nếu tất cả các NH đều thấy thì cũng không cần gửi mail nhé"
        target_recipients_str = (email_recipients or cfg.get("email_recipients") or "").strip()
        recipients = [e.strip() for e in target_recipients_str.split(",") if e.strip()]

        if total_error == 0:
            summary_data["email_status"] = "Không gửi email (Tất cả nhà hàng đều hoạt động tốt 100%)"
            logger.info(f"[MONGO_MOSQUITTO] {summary_data['email_status']}")
        elif total_error > 0 and recipients and cfg.get("has_email_notification", True):
            try:
                self._send_alert_email(summary_data, recipients)
                summary_data["email_sent"] = True
                summary_data["email_status"] = f"Đã gửi email cảnh báo {total_error} nhà hàng lỗi tới: {', '.join(recipients)}"
                logger.info(f"[MONGO_MOSQUITTO] {summary_data['email_status']}")
            except Exception as mail_err:
                summary_data["email_status"] = f"Lỗi gửi email cảnh báo: {mail_err}"
                logger.error(f"[MONGO_MOSQUITTO] {summary_data['email_status']}")
        else:
            summary_data["email_status"] = f"Có {total_error} nhà hàng lỗi nhưng chưa bật email hoặc chưa cấu hình người nhận"

        return summary_data

    def scan_error_restaurants(self, email_recipients: Optional[str] = None) -> Dict[str, Any]:
        """
        Quét lại CHỈ những nhà hàng hiện đang bị LỖI trong kết quả kiểm tra gần nhất:
        - Lấy danh sách các nhà hàng có is_ok == False từ bộ kết quả hiện tại
        - Dò quét lại các máy đại diện với timeout tối ưu (1.5s) và cơ chế retry
        - Cập nhật trực tiếp kết quả mới vào danh sách tổng và lưu lại file
        """
        start_time = datetime.now()
        current_data = self.get_latest_results()
        items = list(current_data.get("items", []))

        # Nếu chưa từng quét bao giờ, quét toàn bộ
        if not items:
            return self.scan_all_restaurants(email_recipients)

        error_items = [it for it in items if not it.get("is_ok")]
        if not error_items:
            current_data["message"] = "Tất cả nhà hàng đều đạt chuẩn OK, không có nhà hàng nào bị lỗi cần quét lại."
            return current_data

        cfg = self.get_config()
        mongo_port = int(cfg.get("mongo_port", 27017))
        mosquitto_port = int(cfg.get("mosquitto_port", 1883))
        timeout = max(float(cfg.get("socket_timeout", 1.2)), 1.5)

        # Lấy thông tin IP mới nhất từ DB cho danh sách lỗi
        target_restaurants: List[Dict[str, Any]] = []
        error_saps = [str(it.get("sap_code") or "").strip() for it in error_items if it.get("sap_code")]

        db = SessionLocal()
        db_map: Dict[str, Dict[str, Any]] = {}
        try:
            if error_saps:
                rows = db.execute(
                    text("SELECT id, sap, res, brand, ip, trangthai FROM RESTAURANT WHERE sap IN :saps"),
                    {"saps": tuple(error_saps)}
                ).mappings().all()
                for row in rows:
                    db_map[str(row.get("sap") or "").strip()] = dict(row)
        except Exception as dbe:
            logger.warning(f"[MONGO_MOSQUITTO] Lỗi query DB cho danh sách lỗi: {dbe}")
        finally:
            db.close()

        for it in error_items:
            sap = str(it.get("sap_code") or "").strip()
            if sap in db_map:
                target_restaurants.append(db_map[sap])
            else:
                target_restaurants.append({
                    "id": it.get("restaurant_id"),
                    "sap": sap,
                    "res": it.get("restaurant_name"),
                    "brand": it.get("brand"),
                    "ip": it.get("ip_gateway") or f"{it.get('subnet')}.1",
                    "trangthai": "ON"
                })

        logger.info(f"[MONGO_MOSQUITTO] Bắt đầu quét lại {len(target_restaurants)} nhà hàng bị lỗi...")

        # Quét đa luồng
        new_results: List[Dict[str, Any]] = []
        max_workers = min(15, max(4, len(target_restaurants)))

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_rest = {
                executor.submit(self._check_one_restaurant, r, mongo_port, mosquitto_port, timeout): r
                for r in target_restaurants
            }
            for future in as_completed(future_to_rest):
                try:
                    res = future.result()
                    new_results.append(res)
                except Exception as err:
                    r = future_to_rest[future]
                    logger.debug(f"[MONGO_MOSQUITTO] Lỗi quét lại NH {r.get('sap')}: {err}")

        # Cập nhật kết quả mới vào danh sách tổng items
        new_res_map = {str(res.get("sap_code") or "").strip(): res for res in new_results}
        for i in range(len(items)):
            sap_key = str(items[i].get("sap_code") or "").strip()
            if sap_key in new_res_map:
                items[i] = new_res_map[sap_key]

        # Sắp xếp: Nhà lỗi lên đầu, sau đó sắp xếp theo SAP
        items.sort(key=lambda x: (x.get("is_ok", False), x.get("sap_code") or "9999"))

        total_ok = sum(1 for r in items if r.get("is_ok"))
        total_error = sum(1 for r in items if not r.get("is_ok"))
        new_error_items = [r for r in items if not r.get("is_ok")]
        duration = round((datetime.now() - start_time).total_seconds(), 2)

        current_data["total_ok"] = total_ok
        current_data["total_error"] = total_error
        current_data["items"] = items
        current_data["error_items"] = new_error_items
        current_data["duration_seconds"] = duration
        current_data["scan_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        current_data["message"] = (
            f"Quét lại hoàn tất {len(target_restaurants)} nhà lỗi ({duration}s): "
            f"Hiện còn {total_error} nhà bị lỗi, {total_ok} nhà đạt chuẩn OK."
        )

        # Lưu vào file cache
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(RESULTS_FILE, "w", encoding="utf-8") as f:
                json.dump(current_data, f, ensure_ascii=False, indent=2)
            self._cached_results = current_data
        except Exception as se:
            logger.warning(f"[MONGO_MOSQUITTO] Lỗi ghi file sau khi quét lại lỗi: {se}")

        return current_data

    def scan_single_restaurant(self, sap_code: str) -> Dict[str, Any]:
        """
        Quét lại riêng 1 nhà hàng cụ thể theo mã SAP:
        - Kiểm tra các máy .41, .11, .12 với timeout 2.0s và có retry
        - Cập nhật trực tiếp kết quả vào danh sách tổng và lưu lại file
        """
        sap_code = str(sap_code).strip()
        current_data = self.get_latest_results()
        items = list(current_data.get("items", []))

        cfg = self.get_config()
        mongo_port = int(cfg.get("mongo_port", 27017))
        mosquitto_port = int(cfg.get("mosquitto_port", 1883))
        timeout = 2.0

        # Lấy thông tin nhà hàng từ DB
        rest_dict: Optional[Dict[str, Any]] = None
        db = SessionLocal()
        try:
            row = db.execute(
                text("SELECT id, sap, res, brand, ip, trangthai FROM RESTAURANT WHERE sap = :sap"),
                {"sap": sap_code}
            ).mappings().first()
            if row:
                rest_dict = dict(row)
        except Exception as dbe:
            logger.warning(f"[MONGO_MOSQUITTO] Lỗi query DB cho SAP {sap_code}: {dbe}")
        finally:
            db.close()

        # Nếu không có trong DB, tìm trong items
        if not rest_dict:
            existing = next((it for it in items if str(it.get("sap_code") or "").strip() == sap_code), None)
            if existing:
                rest_dict = {
                    "id": existing.get("restaurant_id"),
                    "sap": sap_code,
                    "res": existing.get("restaurant_name"),
                    "brand": existing.get("brand"),
                    "ip": existing.get("ip_gateway") or f"{existing.get('subnet')}.1",
                    "trangthai": "ON"
                }

        if not rest_dict:
            raise ValueError(f"Không tìm thấy nhà hàng có mã SAP: {sap_code}")

        # Quét kiểm tra
        single_result = self._check_one_restaurant(rest_dict, mongo_port, mosquitto_port, timeout=timeout)

        # Cập nhật vào danh sách tổng
        found_in_items = False
        for i in range(len(items)):
            if str(items[i].get("sap_code") or "").strip() == sap_code:
                items[i] = single_result
                found_in_items = True
                break

        if not found_in_items:
            items.append(single_result)

        # Sắp xếp lại
        items.sort(key=lambda x: (x.get("is_ok", False), x.get("sap_code") or "9999"))

        total_ok = sum(1 for r in items if r.get("is_ok"))
        total_error = sum(1 for r in items if not r.get("is_ok"))
        new_error_items = [r for r in items if not r.get("is_ok")]

        current_data["total_ok"] = total_ok
        current_data["total_error"] = total_error
        current_data["items"] = items
        current_data["error_items"] = new_error_items
        current_data["scan_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        msg = f"Đã quét lại nhà hàng [{sap_code}] {single_result.get('restaurant_name')}: {single_result.get('status_label')} ({single_result.get('note')})"
        current_data["message"] = msg

        # Lưu file
        os.makedirs(DATA_DIR, exist_ok=True)
        try:
            with open(RESULTS_FILE, "w", encoding="utf-8") as f:
                json.dump(current_data, f, ensure_ascii=False, indent=2)
            self._cached_results = current_data
        except Exception as se:
            logger.warning(f"[MONGO_MOSQUITTO] Lỗi ghi file sau khi quét SAP {sap_code}: {se}")

        return {
            "summary": current_data,
            "item": single_result,
            "message": msg
        }

    def _send_alert_email(self, data: Dict[str, Any], recipients: List[str]) -> None:
        """Gửi email danh sách nhà hàng bị lỗi MongoDB hoặc Mosquitto."""
        today_str = datetime.now().strftime("%d/%m/%Y %H:%M")
        error_items = data.get("error_items", [])
        total_scanned = data.get("total_scanned", 0)
        total_ok = data.get("total_ok", 0)
        total_error = data.get("total_error", 0)

        subject = f"⚠️ [CẢNH BÁO IT] Phát Hiện {total_error} Nhà Hàng Bị Lỗi MongoDB / Mosquitto Broker ({today_str})"

        # Tạo rows HTML cho bảng lỗi
        rows_html = ""
        for idx, it in enumerate(error_items, 1):
            sap = it.get("sap_code") or "—"
            name = it.get("restaurant_name") or "—"
            brand = it.get("brand") or "—"
            
            # Format IP đại diện dạng 10.8.14.* theo yêu cầu
            subnet = str(it.get("subnet") or "").strip()
            if not subnet:
                ip_src = str(it.get("representative_ip") or it.get("ip_gateway") or "").strip()
                parts = ip_src.split(".")
                if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
                    subnet = f"{parts[0]}.{parts[1]}.{parts[2]}"
            
            if subnet:
                rep_ip = f"{subnet}.*"
            else:
                rep_ip = it.get("representative_ip") or it.get("ip_gateway") or "—"
            
            # Badge Mongo
            if it.get("mongo_ok"):
                mongo_badge = '<span style="color:#059669; font-weight:bold;">Đang chạy (27017)</span>'
            else:
                mongo_badge = '<span style="color:#dc2626; font-weight:bold;">Tắt / Lỗi ❌</span>'

            # Badge Mosquitto
            if it.get("mosquitto_ok"):
                mosq_badge = '<span style="color:#059669; font-weight:bold;">Đang chạy (1883)</span>'
            else:
                mosq_badge = '<span style="color:#dc2626; font-weight:bold;">Tắt / Lỗi ❌</span>'

            note = it.get("note") or "Lỗi kết nối"

            row_bg = "#ffffff" if idx % 2 == 1 else "#fef2f2"
            rows_html += f"""
            <tr style="background-color:{row_bg}; border-bottom:1px solid #fee2e2;">
                <td style="padding:10px 8px; text-align:center; font-weight:bold; color:#6b7280;">{idx}</td>
                <td style="padding:10px 8px; font-weight:bold; color:#111827; text-align:center;">{sap}</td>
                <td style="padding:10px 8px; font-weight:600; color:#1f2937;">{name} <span style="font-size:11px; color:#6b7280;">({brand})</span></td>
                <td style="padding:10px 8px; font-family:monospace; color:#374151; text-align:center;">{rep_ip}</td>
                <td style="padding:10px 8px; text-align:center;">{mongo_badge}</td>
                <td style="padding:10px 8px; text-align:center;">{mosq_badge}</td>
                <td style="padding:10px 8px; color:#b91c1c; font-size:12px;">{note}</td>
            </tr>
            """

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"/></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; margin:0; padding:20px; background-color:#f9fafb; color:#374151;">
            <div style="max-width:960px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); border:1px solid #e5e7eb;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); color:#ffffff; padding:24px 30px;">
                    <div style="font-size:13px; text-transform:uppercase; letter-spacing:1px; opacity:0.9; margin-bottom:6px;">GOLDEN GATE RESTAURANT GROUP — IT OPERATIONS</div>
                    <h2 style="margin:0; font-size:22px; font-weight:700;">Báo Cáo Sự Cố Dịch Vụ: MongoDB & Mosquitto Broker</h2>
                    <p style="margin:8px 0 0 0; font-size:13px; opacity:0.95;">Thời gian quét: <b>{today_str}</b> | Tổng quét: <b>{total_scanned}</b> (Đạt: <b>{total_ok}</b> | Lỗi: <b style="color:#fee2e2;">{total_error}</b>)</p>
                </div>

                <!-- Nội dung thông báo -->
                <div style="padding:24px 30px;">
                    <p style="margin-top:0; font-size:14px; line-height:1.6;">
                        Kính gửi Anh/Chị Quản trị hệ thống IT,<br/>
                        Hệ thống giám sát tự động vừa thực hiện rà soát các máy đại diện (<b>.41, .11, .12</b>) tại <b>{total_scanned} nhà hàng</b> đang hoạt động và phát hiện <b>{total_error} nhà hàng</b> bị lỗi dịch vụ <b>MongoDB Server (Port 27017)</b> hoặc <b>Mosquitto Broker (Port 1883)</b>.
                    </p>

                    <div style="margin-top:16px; overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:13px; border:1px solid #fee2e2;">
                            <thead>
                                <tr style="background-color:#fee2e2; color:#991b1b; text-align:left;">
                                    <th style="padding:10px 8px; text-align:center; width:40px;">STT</th>
                                    <th style="padding:10px 8px; text-align:center; width:70px;">Mã SAP</th>
                                    <th style="padding:10px 8px;">Tên Nhà Hàng</th>
                                    <th style="padding:10px 8px; text-align:center; width:110px;">IP Đại Diện</th>
                                    <th style="padding:10px 8px; text-align:center; width:130px;">MongoDB (27017)</th>
                                    <th style="padding:10px 8px; text-align:center; width:130px;">Mosquitto (1883)</th>
                                    <th style="padding:10px 8px;">Chi Tiết Ghi Nhận</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows_html}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top:20px; padding:12px 16px; background-color:#eff6ff; border-left:4px solid #3b82f6; border-radius:4px; font-size:12px; color:#1e40af;">
                        💡 <b>Ghi chú quy tắc kiểm tra:</b> Hệ thống dò quét các máy theo thứ tự (.41 ➔ .11 ➔ .12). Nếu phát hiện 1 máy mở cả 2 cổng 27017 & 1883 thì ghi nhận nhà hàng đó ĐẠT. Báo cáo này chỉ liệt kê các nhà hàng chưa khởi chạy đủ 2 dịch vụ để IT kịp thời hỗ trợ nhà hàng. (Đã tự động bỏ qua các nhà hàng thuộc TCH và Universal Tea).
                    </div>
                </div>

                <!-- Footer -->
                <div style="background-color:#f9fafb; padding:16px 30px; border-top:1px solid #e5e7eb; font-size:12px; color:#9ca3af; text-align:center;">
                    Email này được gửi tự động từ <b>Hệ thống IT Project Management</b> — Golden Gate Restaurant Group.
                </div>
            </div>
        </body>
        </html>
        """

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.SMTP_USER
        msg["To"] = ", ".join(recipients)
        msg.set_content(f"Cảnh báo: Phát hiện {total_error} nhà hàng bị lỗi MongoDB / Mosquitto. Xem chi tiết trong nội dung HTML.")
        msg.add_alternative(html_content, subtype="html")

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT, timeout=25) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(self.SMTP_USER, self.SMTP_PASSWORD)
            server.send_message(msg)


mongo_mosquitto_service = MongoMosquittoService()
