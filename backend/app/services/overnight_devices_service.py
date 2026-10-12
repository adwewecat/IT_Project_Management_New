import re, json, time, logging, subprocess
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import select, delete, desc
from app.core.database import SessionLocal
from app.models.restaurant import Restaurant
from app.models.overnight_device import OvernightDeviceLog

logger = logging.getLogger(__name__)


def ping_ip(ip: str, timeout_ms: int = 700) -> bool:
    """Kiểm tra tín hiệu ICMP ping tới địa chỉ IP trên Windows."""
    if not ip:
        return False
    try:
        r = subprocess.run(
            ['ping', '-n', '1', '-w', str(timeout_ms), ip],
            capture_output=True,
            timeout=2.0
        )
        out = r.stdout.decode('cp1252', errors='ignore')
        return r.returncode == 0 and ('TTL=' in out or 'bytes=' in out)
    except Exception:
        return False


def is_restaurant_excluded(r: Dict[str, Any]) -> bool:
    """
    Kiểm tra nhà hàng có thuộc diện loại trừ hay không:
    1. Chỉ quét những nhà hàng có trạng thái ON (bỏ qua NEW và OFF).
    2. Mã SAP KHÔNG phải đúng 4 chữ số thì loại luôn.
    3. Bỏ qua các nhà hàng trong tên (hoặc brand, mã SAP) có chứa:
       'tch', 'thecoffeehouse', 'the coffee house', 'ut', 'universal', 'tea', 'khong phai nh'.
    """
    name = str(r.get("res") or r.get("restaurant_name") or r.get("NAME") or "").strip()
    brand = str(r.get("brand") or r.get("BRAND") or "").strip()
    sap = str(r.get("sap") or r.get("sap_code") or r.get("SAP") or "").strip()
    trangthai = str(r.get("trangthai") or r.get("status") or "").strip().upper()

    # 1. Chỉ quét nhà hàng có trạng thái ON (loại bỏ NEW, OFF, ...)
    if trangthai and trangthai != "ON":
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


class OvernightDevicesService:
    @staticmethod
    def extract_subnet_prefix(ip: Optional[str]) -> Optional[str]:
        """Trích xuất 3 octet đầu từ IP, ví dụ 10.8.45.1 -> 10.8.45."""
        if not ip:
            return None
        text = str(ip).strip()
        m = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3})', text)
        if not m:
            return None
        prefix = m.group(1)
        octets = prefix.split('.')
        if not all(0 <= int(o) <= 255 for o in octets):
            return None
        return f"{prefix}."

    @classmethod
    def scan_restaurant(cls, rest_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Quét các thiết bị qua đêm cho 1 nhà hàng cụ thể."""
        # 0. Bỏ qua các nhà hàng thuộc diện loại trừ (TCH, UT, Universal, Tea, Khong Phai NH)
        if is_restaurant_excluded(rest_dict):
            return None

        ip = rest_dict.get("ip")
        prefix = cls.extract_subnet_prefix(ip)
        if not prefix:
            return None

        gateway_ip = f"{prefix}1"
        # 1. Kiểm tra sơ bộ Router Gateway nhà hàng
        if not ping_ip(gateway_ip, timeout_ms=600):
            # Nếu Gateway không phản hồi (Nhà hàng rớt VPN hoặc cúp điện), bỏ qua
            return None

        # 2. Danh sách thiết bị cần kiểm tra
        # .11, .12: Thu Ngân
        # .41: PC Quản Lý
        # .31 -> .38: Cụm KDS
        targets = [
            ("11", f"{prefix}11", "pos"),
            ("12", f"{prefix}12", "pos"),
            ("41", f"{prefix}41", "pc"),
            ("31", f"{prefix}31", "kds"),
            ("32", f"{prefix}32", "kds"),
            ("33", f"{prefix}33", "kds"),
            ("34", f"{prefix}34", "kds"),
            ("35", f"{prefix}35", "kds"),
            ("36", f"{prefix}36", "kds"),
            ("37", f"{prefix}37", "kds"),
            ("38", f"{prefix}38", "kds"),
        ]

        active_pos = []
        active_pc = []
        active_kds = []
        raw_results = {}

        for tag, target_ip, dev_type in targets:
            is_up = ping_ip(target_ip, timeout_ms=700)
            raw_results[target_ip] = "OPEN" if is_up else "CLOSED"
            if is_up:
                if dev_type == "pos":
                    active_pos.append(tag)
                elif dev_type == "pc":
                    active_pc.append(tag)
                elif dev_type == "kds":
                    active_kds.append(tag)

        # Nếu không có máy nào để qua đêm
        total_active = len(active_pos) + len(active_pc) + len(active_kds)
        if total_active == 0:
            return None

        # Tách riêng: Thiết bị để qua đêm KDS và Thiết bị để qua đêm PC/11/41
        kds_items = [f"Máy KDS {k}" for k in sorted(active_kds)]
        pos_pc_items = [f"Thu Ngân {p}" for p in sorted(active_pos)] + [f"Máy PC Quản Lý {c}" for c in sorted(active_pc)]
        device_items = kds_items + pos_pc_items

        col_kds = "\n".join(kds_items)
        col_pos_pc = "\n".join(pos_pc_items)
        devices_multiline = "\n".join(device_items)
        overnight_devices_str = ", ".join(device_items)

        # Chuẩn bị thông tin nhà hàng
        sap = (rest_dict.get("sap") or "").strip()
        res_name = (rest_dict.get("res") or "").strip()
        rk7 = (rest_dict.get("rk7") or "").strip()
        email = (rest_dict.get("email") or "").strip()
        gateway_str = (rest_dict.get("ip") or f"{prefix}1").strip()
        today_vn = datetime.now().strftime("%d-%m-%Y")

        # Cột A: Tên Nhà Hàng (VD: 1 Cloud Pot Vincom An Giang (RK7: 1) 10.8.148.x)
        rk7_part = f"(RK7: {rk7}) " if rk7 else ""
        sap_part = f"{sap} " if sap else ""
        subnet_x = f"{prefix}x" if prefix else gateway_str
        col_restaurant = f"{sap_part}{res_name} {rk7_part}{subnet_x}".strip()

        # Dòng ghi chú tóm tắt (giữ tương thích)
        summary_line = f"{col_restaurant}      KDS: {', '.join(kds_items) or '-'} | PC/11/41: {', '.join(pos_pc_items) or '-'}  {email}\n{today_vn}"

        return {
            "restaurant_id": rest_dict.get("id"),
            "sap_code": sap,
            "rk7_code": rk7,
            "restaurant_name": res_name,
            "ip_gateway": gateway_str,
            "subnet": prefix,
            "email": email,
            "overnight_devices": overnight_devices_str,
            "device_count": total_active,
            "raw_details": json.dumps(raw_results, ensure_ascii=False),
            "summary_line": summary_line,
            "col_restaurant": col_restaurant,
            "col_kds": col_kds,
            "col_pos_pc": col_pos_pc,
            "col_devices": devices_multiline,
            "col_email": email,
            "kds_items": kds_items,
            "pos_pc_items": pos_pc_items,
            "device_items": device_items,
        }

    @classmethod
    def scan_and_log_overnight_devices(cls, max_workers: int = 40) -> Dict[str, Any]:
        """Quét toàn bộ nhà hàng, ghi nhận các máy để qua đêm và lưu vào SQL Server."""
        scan_now = datetime.now()
        scan_date_val = scan_now.date()
        scan_date_str = scan_now.strftime("%d-%m-%Y")
        start_time = time.time()

        # 1. Lấy danh sách nhà hàng đang hoạt động có IP
        db = SessionLocal()
        try:
            restaurants = db.scalars(
                select(Restaurant)
                .where(Restaurant.trangthai == 'ON')
                .order_by(Restaurant.sap)
            ).all()

            rest_list = [
                {
                    "id": r.id,
                    "sap": r.sap,
                    "rk7": r.rk7,
                    "res": r.res,
                    "ip": r.ip,
                    "email": r.email,
                }
                for r in restaurants
                if r.ip and cls.extract_subnet_prefix(r.ip) and not is_restaurant_excluded({
                    "id": r.id, "sap": r.sap, "rk7": r.rk7, "res": r.res, "ip": r.ip, "email": r.email
                })
            ]
        finally:
            db.close()

        total_restaurants = len(rest_list)
        logger.info(f"Bắt đầu quét thiết bị qua đêm cho {total_restaurants} nhà hàng...")

        # 2. Thực hiện quét đa luồng
        overnight_results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_rest = {
                executor.submit(cls.scan_restaurant, rest): rest
                for rest in rest_list
            }
            for future in as_completed(future_to_rest):
                try:
                    res = future.result()
                    if res:
                        overnight_results.append(res)
                except Exception as e:
                    logger.error(f"Lỗi khi quét nhà hàng: {e}")

        # Sắp xếp theo mã SAP
        overnight_results.sort(key=lambda x: str(x.get("sap_code") or ""))

        # 3. Lưu vào Database OVERNIGHT_DEVICES_LOG
        db = SessionLocal()
        try:
            # Xóa các log cũ của cùng ngày quét để tránh trùng lặp khi chạy lại
            db.execute(
                delete(OvernightDeviceLog).where(OvernightDeviceLog.scan_date == scan_date_val)
            )

            # Chèn các bản ghi mới
            for item in overnight_results:
                log_entry = OvernightDeviceLog(
                    scan_date=scan_date_val,
                    scan_time=scan_now,
                    restaurant_id=item["restaurant_id"],
                    sap_code=item["sap_code"],
                    rk7_code=item["rk7_code"],
                    restaurant_name=item["restaurant_name"],
                    ip_gateway=item["ip_gateway"],
                    subnet=item["subnet"],
                    email=item["email"],
                    overnight_devices=item["overnight_devices"],
                    device_count=item["device_count"],
                    raw_details=item["raw_details"],
                    summary_line=item["summary_line"],
                    created_at=scan_now,
                )
                db.add(log_entry)

            db.commit()
            logger.info(f"Đã lưu {len(overnight_results)} nhà hàng có máy qua đêm vào OVERNIGHT_DEVICES_LOG.")
        except Exception as e:
            db.rollback()
            logger.error(f"Lỗi khi lưu kết quả vào CSDL: {e}")
            raise
        finally:
            db.close()

        duration = round(time.time() - start_time, 2)
        total_devices = sum(item["device_count"] for item in overnight_results)

        # Tổng hợp text báo cáo
        text_lines = [item["summary_line"] for item in overnight_results]
        formatted_report = "\n\n".join(text_lines)

        # Tạo dữ liệu bảng cột chuẩn
        table_rows_data = cls.format_items_for_columns(overnight_results)
        excel_tsv = cls.build_excel_tsv(table_rows_data)

        return {
            "status": "success",
            "scan_date": scan_date_str,
            "scan_time": scan_now.strftime("%Y-%m-%d %H:%M:%S"),
            "duration_seconds": duration,
            "total_restaurants_scanned": total_restaurants,
            "total_restaurants_with_overnight": len(overnight_results),
            "total_devices_overnight": total_devices,
            "results": table_rows_data,
            "formatted_report": formatted_report,
            "excel_table_tsv": excel_tsv,
            "message": (
                f"Quét hoàn tất lúc {scan_now.strftime('%H:%M:%S %d/%m/%Y')} trong {duration}s. "
                f"Phát hiện {len(overnight_results)} nhà hàng có thiết bị để qua đêm (tổng cộng {total_devices} máy)."
            )
        }

    @classmethod
    def format_items_for_columns(cls, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Chuẩn hóa dữ liệu sang 4 cột chuẩn theo yêu cầu:
        Tên Nhà Hàng | Thiết bị để qua đêm kds | Thiết bị để qua đêm pc/11/41 | email
        """
        formatted = []
        for it in items:
            # Bỏ qua nhà hàng loại trừ nếu có
            if is_restaurant_excluded(it):
                continue

            sap = (it.get("sap_code") or "").strip()
            rk7 = (it.get("rk7_code") or "").strip()
            res_name = (it.get("restaurant_name") or "").strip()
            subnet = (it.get("subnet") or "").strip()
            email = (it.get("email") or "").strip()
            gateway = (it.get("ip_gateway") or "").strip()

            sap_str = f"{sap} " if sap else ""
            rk7_str = f"(RK7: {rk7}) " if rk7 else ""
            subnet_x = f"{subnet}x" if subnet else gateway
            col_restaurant = it.get("col_restaurant") or f"{sap_str}{res_name} {rk7_str}{subnet_x}".strip()

            kds_items = it.get("kds_items")
            pos_pc_items = it.get("pos_pc_items")

            if kds_items is None or pos_pc_items is None:
                kds_items = []
                pos_pc_items = []

                raw_details = it.get("raw_details")
                if isinstance(raw_details, str):
                    try:
                        raw_details = json.loads(raw_details)
                    except Exception:
                        raw_details = {}
                elif not isinstance(raw_details, dict):
                    raw_details = {}

                if raw_details and subnet:
                    if raw_details.get(f"{subnet}11") == "OPEN":
                        pos_pc_items.append("Thu Ngân 11")
                    if raw_details.get(f"{subnet}12") == "OPEN":
                        pos_pc_items.append("Thu Ngân 12")
                    if raw_details.get(f"{subnet}41") == "OPEN":
                        pos_pc_items.append("Máy PC Quản Lý 41")
                    for k in range(31, 39):
                        if raw_details.get(f"{subnet}{k}") == "OPEN":
                            kds_items.append(f"Máy KDS {k}")

                if not kds_items and not pos_pc_items:
                    all_devs = it.get("device_items")
                    if not all_devs:
                        raw_dev = it.get("overnight_devices", "")
                        if "\n" in raw_dev:
                            all_devs = [d.strip() for d in raw_dev.split("\n") if d.strip()]
                        else:
                            all_devs = [d.strip() for d in raw_dev.split(",") if d.strip()]
                    all_devs = all_devs or []
                    for dev in all_devs:
                        if "kds" in dev.lower():
                            kds_items.append(dev)
                        else:
                            pos_pc_items.append(dev)

            col_kds = "\n".join(kds_items)
            col_pos_pc = "\n".join(pos_pc_items)
            device_items = kds_items + pos_pc_items

            # YÊU CẦU: Nếu cả 1 nhà hàng đều không có máy nào để qua đêm thì không cần hiện,
            # chỉ hiện dòng Nhà Hàng khi Nhà hàng đó có chứa ít nhất 1 máy không tắt
            if len(device_items) == 0:
                continue

            col_devices = "\n".join(device_items)

            new_it = dict(it)
            new_it["col_restaurant"] = col_restaurant
            new_it["col_kds"] = col_kds
            new_it["col_pos_pc"] = col_pos_pc
            new_it["col_devices"] = col_devices
            new_it["col_email"] = email
            new_it["kds_items"] = kds_items
            new_it["pos_pc_items"] = pos_pc_items
            new_it["device_items"] = device_items
            new_it["device_count"] = len(device_items)
            formatted.append(new_it)
        return formatted

    @classmethod
    def build_excel_tsv(cls, items: List[Dict[str, Any]]) -> str:
        """Tạo chuỗi TSV chuẩn để copy paste thẳng vào Excel hoặc Email với 4 cột chuẩn."""
        lines = ["Tên Nhà Hàng\tThiết bị để qua đêm kds\tThiết bị để qua đêm pc/11/41\temail"]
        for it in items:
            col_r = it.get("col_restaurant", "")
            col_kds = it.get("col_kds", "")
            col_pos_pc = it.get("col_pos_pc", "")
            col_e = it.get("col_email", "")
            # Trong TSV: cell có dấu xuống dòng cần bao bọc trong ngoặc kép ""
            kds_escaped = f'"{col_kds}"' if "\n" in col_kds else col_kds
            pos_pc_escaped = f'"{col_pos_pc}"' if "\n" in col_pos_pc else col_pos_pc
            lines.append(f"{col_r}\t{kds_escaped}\t{pos_pc_escaped}\t{col_e}")
        return "\n".join(lines)

    @classmethod
    def build_email_html(
        cls,
        items: List[Dict[str, Any]],
        scan_date_str: str,
        total_restaurants: int,
        total_devices: int
    ) -> str:
        """Tạo mẫu HTML gửi email chuẩn dạng bảng 4 cột theo đúng yêu cầu: Tên Nhà Hàng / Thiết bị để qua đêm kds / Thiết bị để qua đêm pc/11/41 / email."""
        table_rows = ""
        for idx, item in enumerate(items, 1):
            col_rest = item.get("col_restaurant") or ""

            kds_lines = item.get("kds_items") or []
            if not kds_lines and item.get("col_kds"):
                kds_lines = [k.strip() for k in item["col_kds"].split("\n") if k.strip()]
            kds_html = "<br/>".join(kds_lines) if kds_lines else '<span style="color: #9CA3AF;">--</span>'

            pos_pc_lines = item.get("pos_pc_items") or []
            if not pos_pc_lines and item.get("col_pos_pc"):
                pos_pc_lines = [p.strip() for p in item["col_pos_pc"].split("\n") if p.strip()]
            pos_pc_html = "<br/>".join(pos_pc_lines) if pos_pc_lines else '<span style="color: #9CA3AF;">--</span>'

            email = item.get("col_email") or item.get("email") or ""
            email_html = f'<a href="mailto:{email}" style="color: #0056b3; text-decoration: underline;">{email}</a>' if email else '<span style="color: #9CA3AF;">--</span>'
            bg_row = "#FFFFFF" if idx % 2 != 0 else "#F9FAFB"

            table_rows += f"""
            <tr style="background-color: {bg_row};">
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 13px; font-weight: 500; color: #111827; vertical-align: top;">
                    {col_rest}
                </td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 13px; line-height: 1.5; color: #111827; vertical-align: top;">
                    {kds_html}
                </td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 13px; line-height: 1.5; color: #111827; vertical-align: top;">
                    {pos_pc_html}
                </td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 13px; vertical-align: top;">
                    {email_html}
                </td>
            </tr>
            """

        if not items:
            table_rows = """
            <tr>
                <td colspan="4" style="border: 1px solid #BFBFBF; padding: 20px; text-align: center; color: #16A34A; font-weight: bold; font-size: 13px;">
                    ✅ Không có nhà hàng nào để máy qua đêm! Toàn bộ thiết bị đã được tắt đúng quy định.
                </td>
            </tr>
            """

        html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f6f8; color: #111827; }}
    .container {{ max-width: 980px; margin: 0 auto; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }}
    .header {{ background-color: #1f2937; color: #ffffff; padding: 18px 24px; }}
    .header h2 {{ margin: 0 0 6px 0; font-size: 17px; color: #F5B800; text-transform: uppercase; letter-spacing: 0.5px; }}
    .header p {{ margin: 0; font-size: 13px; color: #d1d5db; }}
    .kpi-bar {{ background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; padding: 12px 24px; font-size: 13px; color: #475569; }}
    .kpi-badge {{ display: inline-block; background-color: #FEF2F2; color: #DC2626; border: 1px solid #FCA5A5; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-right: 15px; font-size: 12px; }}
    .content {{ padding: 20px 24px; }}
    .data-table {{ width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }}
    .data-table th {{ background-color: #D9E1F2; color: #000000; font-weight: bold; border: 1px solid #BFBFBF; padding: 10px 12px; text-align: center; font-size: 13px; }}
    .footer {{ background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 14px 24px; font-size: 12px; color: #64748B; text-align: center; line-height: 1.6; }}
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>DANH SÁCH THIẾT BỊ ĐỂ QUA ĐÊM TẠI NHÀ HÀNG</h2>
            <p>Thời gian quét tự động: <b>04:00 AM</b> ngày <b>{scan_date_str}</b></p>
        </div>
        <div class="kpi-bar">
            <span class="kpi-badge">Phát hiện: {len(items)} Nhà Hàng</span>
            <span style="margin-right: 20px;">Tổng số máy để qua đêm: <b>{total_devices}</b></span>
            <span>Tổng số NH quét: <b>{total_restaurants}</b></span>
        </div>
        <div class="content">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 38%; text-align: center;">Tên Nhà Hàng</th>
                        <th style="width: 22%; text-align: center;">Thiết bị để qua đêm kds</th>
                        <th style="width: 22%; text-align: center;">Thiết bị để qua đêm pc/11/41</th>
                        <th style="width: 18%; text-align: center;">email</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
        </div>
        <div class="footer">
            Email được gửi tự động từ <b>Hệ Thống Quản Trị & Vận Hành IT</b> - Golden Gate Restaurant Group.<br/>
            Vui lòng liên hệ IT Helpdesk nếu cần đối soát hoặc hỗ trợ kỹ thuật.
        </div>
    </div>
</body>
</html>"""
        return html

    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    @classmethod
    def send_overnight_devices_email(cls, scan_results: Dict[str, Any], recipients: List[str]) -> Dict[str, Any]:
        """Gửi email thông báo danh sách thiết bị để qua đêm dạng bảng 3 cột chuẩn."""
        import ssl, smtplib
        from email.message import EmailMessage

        if not recipients:
            raise ValueError("Không có danh sách email người nhận để gửi báo cáo thiết bị qua đêm.")

        scan_date_str = scan_results.get("scan_date") or datetime.now().strftime("%d-%m-%Y")
        items = scan_results.get("results") or []
        formatted_items = cls.format_items_for_columns(items)

        total_restaurants = scan_results.get("total_restaurants_scanned", len(formatted_items))
        total_devices = scan_results.get("total_devices_overnight", sum(i.get("device_count", 0) for i in formatted_items))

        html_body = cls.build_email_html(
            items=formatted_items,
            scan_date_str=scan_date_str,
            total_restaurants=total_restaurants,
            total_devices=total_devices
        )

        msg = EmailMessage()
        msg["Subject"] = f"[Báo cáo 04:00] Danh sách Thiết bị để qua đêm tại Nhà Hàng - Ngày {scan_date_str}"
        msg["From"] = f"Hệ Thống Quản Trị ITSS <{cls.SMTP_USER}>"
        msg["To"] = ", ".join(recipients)

        # Plain text
        tsv_content = cls.build_excel_tsv(formatted_items)
        msg.set_content(
            f"Báo cáo thiết bị để qua đêm ngày {scan_date_str}:\n"
            f"Phát hiện {len(formatted_items)} nhà hàng có {total_devices} thiết bị chưa tắt.\n\n"
            f"{tsv_content}"
        )
        msg.add_alternative(html_body, subtype="html")

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT, timeout=25) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"Đã gửi email báo cáo thiết bị qua đêm dạng cột tới: {', '.join(recipients)}")
        return {
            "status": "success",
            "message": f"Đã gửi email báo cáo thiết bị qua đêm thành công tới {len(recipients)} người nhận.",
            "recipients": recipients,
            "overnight_restaurants": len(formatted_items),
            "total_devices": total_devices
        }

    @classmethod
    def get_logs_by_date(cls, scan_date_str: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lấy danh sách bản ghi theo ngày (mặc định là ngày hôm nay)."""
        db = SessionLocal()
        try:
            if scan_date_str:
                try:
                    target_date = datetime.strptime(scan_date_str, "%Y-%m-%d").date()
                except ValueError:
                    target_date = datetime.strptime(scan_date_str, "%d-%m-%Y").date()
            else:
                target_date = datetime.now().date()

            records = db.scalars(
                select(OvernightDeviceLog)
                .where(OvernightDeviceLog.scan_date == target_date)
                .order_by(OvernightDeviceLog.sap_code)
            ).all()

            raw_list = [
                {
                    "id": r.id,
                    "scan_date": r.scan_date.strftime("%d-%m-%Y"),
                    "scan_time": r.scan_time.strftime("%H:%M:%S %d-%m-%Y") if r.scan_time else "",
                    "restaurant_id": r.restaurant_id,
                    "sap_code": r.sap_code,
                    "rk7_code": r.rk7_code,
                    "restaurant_name": r.restaurant_name,
                    "ip_gateway": r.ip_gateway,
                    "subnet": r.subnet,
                    "email": r.email,
                    "overnight_devices": r.overnight_devices,
                    "device_count": r.device_count,
                    "summary_line": r.summary_line,
                    "raw_details": json.loads(r.raw_details) if r.raw_details else {},
                }
                for r in records
                if not is_restaurant_excluded({
                    "sap": r.sap_code,
                    "res": r.restaurant_name,
                    "id": r.restaurant_id
                })
            ]
            return cls.format_items_for_columns(raw_list)
        finally:
            db.close()

    @classmethod
    def get_available_scan_dates(cls) -> List[str]:
        """Lấy danh sách các ngày đã có dữ liệu quét."""
        db = SessionLocal()
        try:
            dates = db.scalars(
                select(OvernightDeviceLog.scan_date)
                .distinct()
                .order_by(desc(OvernightDeviceLog.scan_date))
            ).all()
            return [d.strftime("%Y-%m-%d") for d in dates if d]
        finally:
            db.close()


overnight_devices_service = OvernightDevicesService()
