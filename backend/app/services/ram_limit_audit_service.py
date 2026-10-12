import os
import json
import re
import base64
import socket
import ssl
import smtplib
import logging
from datetime import datetime
from email.message import EmailMessage
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import text
from app.core.database import SessionLocal, engine

# Hỗ trợ kết nối các phiên bản MongoDB cũ tại nhà hàng (MongoDB 3.6, 4.0 - Wire version 6, 7)
try:
    import pymongo.common
    pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
except Exception:
    pass

logger = logging.getLogger(__name__)

class RamLimitAuditService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    DEFAULT_RECIPIENT = "dung.nguyenanh@ggg.com.vn"

    def __init__(self):
        self._cache_latest_results: List[Dict[str, Any]] = []
        self._cache_date: Optional[str] = None
        self._config_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
            "ram_audit_email_config.json"
        )
        self._exclude_config_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
            "ram_audit_exclude_config.json"
        )
        self._target_config_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
            "ram_audit_target_config.json"
        )
        self._custom_config_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "data",
            "ram_audit_custom_config.json"
        )

    def get_custom_configs(self) -> Dict[str, Dict[str, Any]]:
        """Lấy danh sách các nhà hàng có cấu hình RAM riêng biệt."""
        try:
            if os.path.exists(self._custom_config_file):
                with open(self._custom_config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, dict):
                        return data
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi đọc custom config RAM: {e}")
        return {}

    def save_custom_config(
        self,
        restaurant_id: int,
        sql_limit_gb: float,
        mongo_limit_gb: float,
        sap_code: str = "",
        restaurant_name: str = ""
    ) -> Dict[str, Any]:
        """Lưu hoặc cập nhật cấu hình RAM riêng cho 1 nhà hàng cụ thể."""
        configs = self.get_custom_configs()
        entry = {
            "restaurant_id": int(restaurant_id),
            "sap_code": str(sap_code or "").strip(),
            "restaurant_name": str(restaurant_name or "").strip(),
            "sql_limit_gb": round(float(sql_limit_gb), 2),
            "mongo_limit_gb": round(float(mongo_limit_gb), 2),
            "updated_at": datetime.now().isoformat()
        }
        configs[str(restaurant_id)] = entry
        try:
            os.makedirs(os.path.dirname(self._custom_config_file), exist_ok=True)
            with open(self._custom_config_file, "w", encoding="utf-8") as f:
                json.dump(configs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi lưu custom config RAM cho NH {restaurant_id}: {e}")
        return entry

    def delete_custom_config(self, restaurant_id: int) -> bool:
        """Xóa cấu hình RAM riêng của 1 nhà hàng để trở về cấu hình mặc định."""
        configs = self.get_custom_configs()
        key = str(restaurant_id)
        if key in configs:
            del configs[key]
            try:
                os.makedirs(os.path.dirname(self._custom_config_file), exist_ok=True)
                with open(self._custom_config_file, "w", encoding="utf-8") as f:
                    json.dump(configs, f, ensure_ascii=False, indent=2)
                return True
            except Exception as e:
                logger.error(f"[RAM_AUDIT] Lỗi xóa custom config RAM cho NH {restaurant_id}: {e}")
        return False

    def get_target_config(self) -> Dict[str, Any]:
        """Lấy cấu hình mức giới hạn RAM mục tiêu và thông số kết nối cho SQL Server và MongoDB."""
        default_cfg = {
            "sql_limit_gb": 2.0,
            "mongo_limit_gb": 6.0,
            "sql_port": 1433,
            "sql_user": "rk7",
            "sql_password": "rk7",
            "mongo_port": 27017
        }
        try:
            if os.path.exists(self._target_config_file):
                with open(self._target_config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    sql_gb = float(data.get("sql_limit_gb", 2.0))
                    mongo_gb = float(data.get("mongo_limit_gb", 6.0))
                    sql_port = int(data.get("sql_port", 1433))
                    sql_user = str(data.get("sql_user", "rk7") or "rk7").strip()
                    sql_password = str(data.get("sql_password", "rk7") or "rk7").strip()
                    mongo_port = int(data.get("mongo_port", 27017))
                    return {
                        "sql_limit_gb": sql_gb,
                        "mongo_limit_gb": mongo_gb,
                        "sql_port": sql_port,
                        "sql_user": sql_user,
                        "sql_password": sql_password,
                        "mongo_port": mongo_port
                    }
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi đọc config target RAM: {e}")
        return default_cfg

    def save_target_config(
        self,
        sql_limit_gb: float,
        mongo_limit_gb: float,
        sql_port: int = 1433,
        sql_user: str = "rk7",
        sql_password: str = "rk7",
        mongo_port: int = 27017
    ) -> Dict[str, Any]:
        """Lưu cấu hình mức giới hạn RAM mục tiêu và thông số kết nối cho SQL Server và MongoDB."""
        payload = {
            "sql_limit_gb": round(float(sql_limit_gb), 2),
            "mongo_limit_gb": round(float(mongo_limit_gb), 2),
            "sql_port": int(sql_port or 1433),
            "sql_user": str(sql_user or "rk7").strip(),
            "sql_password": str(sql_password or "rk7").strip(),
            "mongo_port": int(mongo_port or 27017),
            "updated_at": datetime.now().isoformat()
        }
        try:
            os.makedirs(os.path.dirname(self._target_config_file), exist_ok=True)
            with open(self._target_config_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi ghi config target RAM: {e}")
        return payload

    def get_exclude_config(self) -> Dict[str, Any]:
        """Lấy cấu hình loại trừ nhà hàng (mặc định loại trừ TCH)."""
        default_cfg = {
            "skip_tch": True,
            "exclude_keywords": ["TCH"]
        }
        try:
            if os.path.exists(self._exclude_config_file):
                with open(self._exclude_config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    skip_tch = bool(data.get("skip_tch", True))
                    kws = data.get("exclude_keywords", ["TCH"])
                    if not isinstance(kws, list):
                        kws = ["TCH"]
                    return {
                        "skip_tch": skip_tch,
                        "exclude_keywords": kws
                    }
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi khi đọc file config exclude: {e}")
        return default_cfg

    def save_exclude_config(self, skip_tch: bool, exclude_keywords: List[str]) -> Dict[str, Any]:
        """Lưu cấu hình loại trừ nhà hàng linh động."""
        clean_kws = []
        for kw in exclude_keywords:
            parts = [p.strip() for p in kw.split(",") if p.strip()]
            clean_kws.extend(parts)
        clean_kws = list(dict.fromkeys([k.strip() for k in clean_kws if k.strip()]))
        payload = {
            "skip_tch": bool(skip_tch),
            "exclude_keywords": clean_kws,
            "updated_at": datetime.now().isoformat()
        }
        try:
            os.makedirs(os.path.dirname(self._exclude_config_file), exist_ok=True)
            with open(self._exclude_config_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi khi ghi file config exclude: {e}")
        return payload

    def is_restaurant_excluded(
        self,
        restaurant: Dict[str, Any],
        skip_tch: Optional[bool] = None,
        exclude_keywords: Optional[List[str]] = None
    ) -> bool:
        """
        Kiểm tra 1 nhà hàng có thuộc diện loại trừ hay không.
        - skip_tch: Kiểm tra tiền tố 'TCH' (The Coffee House) ở đầu tên hoặc mã SAP
        - exclude_keywords: Danh sách mã SAP hoặc từ khóa/tên cần loại trừ thêm
        """
        if skip_tch is None or exclude_keywords is None:
            cfg = self.get_exclude_config()
            if skip_tch is None:
                skip_tch = cfg.get("skip_tch", True)
            if exclude_keywords is None:
                exclude_keywords = cfg.get("exclude_keywords", ["TCH"])

        res_name = (restaurant.get("res") or restaurant.get("NAME") or restaurant.get("restaurant_name") or "").strip().upper()
        sap_code = (restaurant.get("sap") or restaurant.get("SAP") or "").strip().upper()
        rest_id_str = str(restaurant.get("id") or restaurant.get("ID") or "")
        trangthai = (restaurant.get("trangthai") or restaurant.get("TRANGTHAI") or "ON").strip().upper()

        # 0. Chỉ quét nhà hàng có trạng thái ON (loại bỏ NEW, OFF, ...)
        if trangthai != "ON":
            return True

        # 1. Loại bỏ các nhà hàng có mã SAP KHÔNG phải 4 chữ số (VD: 'Khong Phai NH', kho, xưởng...)
        if not (sap_code.isdigit() and len(sap_code) == 4):
            return True

        # 2. Kiểm tra tiền tố TCH ở đầu
        if skip_tch:
            if res_name.startswith("TCH") or sap_code.startswith("TCH"):
                return True
            if res_name.startswith("THE COFFEE HOUSE") or res_name.startswith("THECOFFEEHOUSE"):
                return True

        # 2. Kiểm tra danh sách từ khóa / mã SAP loại trừ bổ sung
        for kw in (exclude_keywords or []):
            kw_clean = kw.strip().upper()
            if not kw_clean:
                continue
            if kw_clean == "TCH" and skip_tch:
                continue
            # Khớp mã SAP hoặc khớp ID
            if kw_clean == sap_code or kw_clean == rest_id_str:
                return True
            # Tên nhà hàng bắt đầu bằng từ khóa hoặc chứa từ khóa
            if res_name.startswith(kw_clean) or kw_clean in res_name:
                return True

        return False

    def get_email_config(self) -> List[str]:
        """Lấy danh sách email người nhận báo cáo đã lưu cấu hình."""
        try:
            if os.path.exists(self._config_file):
                with open(self._config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    recipients = data.get("recipients", [])
                    if recipients and isinstance(recipients, list):
                        return [r.strip() for r in recipients if r and r.strip()]
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi khi đọc file config email: {e}")
        return [self.DEFAULT_RECIPIENT]

    def save_email_config(self, recipients: List[str]) -> List[str]:
        """Lưu danh sách email người nhận báo cáo linh động."""
        clean_recs = []
        for r in recipients:
            parts = [p.strip() for p in r.split(",") if p.strip()]
            clean_recs.extend(parts)
        clean_recs = list(dict.fromkeys(clean_recs)) # dedup
        if not clean_recs:
            clean_recs = [self.DEFAULT_RECIPIENT]
        try:
            os.makedirs(os.path.dirname(self._config_file), exist_ok=True)
            with open(self._config_file, "w", encoding="utf-8") as f:
                json.dump({"recipients": clean_recs, "updated_at": datetime.now().isoformat()}, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi khi ghi file config email: {e}")
        return clean_recs

    def _test_tcp_port(self, host: str, port: int, timeout: float = 1.2) -> bool:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        try:
            res = s.connect_ex((host, port))
            return res == 0
        except Exception:
            return False
        finally:
            try:
                s.close()
            except Exception:
                pass

    @staticmethod
    def _update_mongod_cfg_text(content: str, target_gb: float) -> str:
        """Cập nhật nội dung YAML của file cấu hình mongod.cfg / mongod.conf chuẩn MongoDB."""
        val_str = str(int(target_gb)) if target_gb.is_integer() else str(target_gb)
        # Case 1: Đã có cấu hình cacheSizeGB
        if re.search(r'(?i)cacheSizeGB\s*:\s*[\d\.]+', content):
            return re.sub(r'(?i)(cacheSizeGB\s*:\s*)[\d\.]+', r'\g<1>' + val_str, content)
        # Case 2: Đã có engineConfig
        m = re.search(r'(?im)^([ \t]*engineConfig\s*:)', content)
        if m:
            indent = re.match(r'^[ \t]*', m.group(0)).group(0)
            sub_indent = indent + '  '
            return content[:m.end()] + '\n' + sub_indent + f'cacheSizeGB: {val_str}' + content[m.end():]
        # Case 3: Đã có wiredTiger
        m = re.search(r'(?im)^([ \t]*wiredTiger\s*:)', content)
        if m:
            indent = re.match(r'^[ \t]*', m.group(0)).group(0)
            return content[:m.end()] + '\n' + indent + '  engineConfig:\n' + indent + '    ' + f'cacheSizeGB: {val_str}' + content[m.end():]
        # Case 4: Đã có storage
        m = re.search(r'(?im)^([ \t]*storage\s*:)', content)
        if m:
            indent = re.match(r'^[ \t]*', m.group(0)).group(0)
            return content[:m.end()] + '\n' + indent + '  wiredTiger:\n' + indent + '    engineConfig:\n' + indent + '      ' + f'cacheSizeGB: {val_str}' + content[m.end():]
        # Case 5: Chưa có storage
        sep = '\n' if content.endswith('\n') else '\n\n'
        return content + sep + f'storage:\n  wiredTiger:\n    engineConfig:\n      cacheSizeGB: {val_str}\n'

    def _update_remote_mongod_config(
        self,
        mongo_target_ip: str,
        target_mongo_gb: float,
        parsed_config_path: Optional[str] = None,
        sql_target_ip: Optional[str] = None,
        sql_port: int = 1433,
        sql_user: str = "rk7",
        sql_password: str = "rk7"
    ) -> Tuple[bool, str]:
        """
        Cập nhật file cấu hình MongoDB (mongod.cfg / mongod.conf) trên máy chủ nhà hàng:
        1. Thử qua SQL Server xp_cmdshell (chạy PowerShell local trên .41 với quyền hệ thống)
        2. Thử trực tiếp qua UNC SMB share (\\\\ip\\d$\\MongoDB\\mongod.cfg...)
        """
        target_gb_str = str(int(target_mongo_gb)) if target_mongo_gb.is_integer() else str(target_mongo_gb)

        candidate_paths = []
        if parsed_config_path:
            candidate_paths.append(parsed_config_path)

        default_local_paths = [
            r"D:\MongoDB\mongod.conf",
            r"D:\MongoDB\mongod.cfg",
            r"D:\MongoDB\bin\mongod.conf",
            r"D:\MongoDB\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\3.4\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\3.6\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\4.0\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\4.2\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\4.4\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\5.0\bin\mongod.cfg",
            r"C:\MongoDB\mongod.conf",
            r"C:\MongoDB\mongod.cfg",
        ]
        for p in default_local_paths:
            if p not in candidate_paths:
                candidate_paths.append(p)

        # -------------------------------------------------------------
        # CÁCH 1: Chạy PowerShell qua SQL Server xp_cmdshell trên máy .41
        # -------------------------------------------------------------
        if sql_target_ip:
            try:
                import pyodbc
                conn_str = f"DRIVER={{SQL Server}};SERVER={sql_target_ip},{sql_port};UID={sql_user};PWD={sql_password};DATABASE=master;"
                with pyodbc.connect(conn_str, autocommit=True, timeout=4) as conn:
                    with conn.cursor() as cursor:
                        # Bật xp_cmdshell nếu chưa bật
                        try:
                            cursor.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                            cursor.execute("EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;")
                        except Exception:
                            pass

                        sql_search_paths = list(candidate_paths)
                        if mongo_target_ip and mongo_target_ip != sql_target_ip:
                            unc_prefix = f"\\\\{mongo_target_ip}"
                            sql_search_paths.insert(0, f"{unc_prefix}\\d$\\MongoDB\\mongod.conf")
                            sql_search_paths.insert(1, f"{unc_prefix}\\d$\\MongoDB\\mongod.cfg")
                            sql_search_paths.insert(2, f"{unc_prefix}\\c$\\Program Files\\MongoDB\\Server\\3.4\\bin\\mongod.cfg")

                        paths_ps_list = ", ".join(f"'{p}'" for p in sql_search_paths)
                        ps_script = f"""
$targetGb = "{target_gb_str}"
$targetPaths = @({paths_ps_list})
$updated = $false
$usedPath = ""
foreach ($p in $targetPaths) {{
    if (Test-Path -LiteralPath $p) {{
        try {{
            $raw = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
            if ($raw -match '(?i)cacheSizeGB\\s*:\\s*[\\d\\.]+') {{
                $newText = [regex]::Replace($raw, '(?i)(cacheSizeGB\\s*:\\s*)[\\d\\.]+', "${{1}}$targetGb")
            }} elseif ($raw -match '(?im)^([ \\t]*engineConfig\\s*:)') {{
                $newText = [regex]::Replace($raw, '(?im)^([ \\t]*engineConfig\\s*:)', "`$1`r`n      cacheSizeGB: $targetGb")
            }} elseif ($raw -match '(?im)^([ \\t]*wiredTiger\\s*:)') {{
                $newText = [regex]::Replace($raw, '(?im)^([ \\t]*wiredTiger\\s*:)', "`$1`r`n    engineConfig:`r`n      cacheSizeGB: $targetGb")
            }} elseif ($raw -match '(?im)^([ \\t]*storage\\s*:)') {{
                $newText = [regex]::Replace($raw, '(?im)^([ \\t]*storage\\s*:)', "`$1`r`n  wiredTiger:`r`n    engineConfig:`r`n      cacheSizeGB: $targetGb")
            }} else {{
                $newText = $raw + "`r`nstorage:`r`n  wiredTiger:`r`n    engineConfig:`r`n      cacheSizeGB: $targetGb`r`n"
            }}
            [System.IO.File]::WriteAllText($p, $newText, [System.Text.Encoding]::UTF8)
            $updated = $true
            $usedPath = $p
            break
        }} catch {{
            Write-Output "ERR_WRITE: $_"
        }}
    }}
}}
if ($updated) {{
    try {{
        Get-Service -Name *mongo* -ErrorAction SilentlyContinue | Restart-Service -Force -ErrorAction SilentlyContinue
    }} catch {{}}
    Write-Output "OK_UPDATED:$usedPath"
}} else {{
    Write-Output "FILE_NOT_FOUND"
}}
"""
                        encoded_cmd = base64.b64encode(ps_script.encode("utf-16le")).decode("ascii")
                        cursor.execute(f"EXEC xp_cmdshell 'powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand {encoded_cmd}'")
                        rows = cursor.fetchall()
                        full_out = " ".join(str(r[0]) for r in rows if r and r[0])
                        if "OK_UPDATED:" in full_out:
                            match = re.search(r"OK_UPDATED:([^\r\n\t]+)", full_out)
                            found_file = match.group(1).strip() if match else "mongod.cfg"
                            return True, f"Đã cập nhật file {os.path.basename(found_file)} qua SQL xp_cmdshell"
            except Exception as e:
                logger.warning(f"[RAM_AUDIT] Cập nhật config MongoDB qua xp_cmdshell không thành công: {e}")

        # -------------------------------------------------------------
        # CÁCH 2: Thử trực tiếp qua UNC share từ máy chủ backend
        # -------------------------------------------------------------
        if mongo_target_ip:
            unc_candidates = []
            if parsed_config_path:
                clean_p = parsed_config_path.replace("/", "\\")
                if len(clean_p) >= 2 and clean_p[1] == ":":
                    drive = clean_p[0].lower()
                    unc_candidates.append(f"\\\\{mongo_target_ip}\\{drive}${clean_p[2:]}")

            unc_candidates.extend([
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\mongod.conf",
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\bin\\mongod.conf",
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\Program Files\\MongoDB\\Server\\3.4\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\Program Files\\MongoDB\\Server\\3.6\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\Program Files\\MongoDB\\Server\\4.0\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\MongoDB\\mongod.conf",
                f"\\\\{mongo_target_ip}\\c$\\MongoDB\\mongod.cfg",
            ])

            for unc_path in unc_candidates:
                try:
                    if os.path.exists(unc_path):
                        with open(unc_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        new_content = self._update_mongod_cfg_text(content, target_mongo_gb)
                        with open(unc_path, "w", encoding="utf-8") as f:
                            f.write(new_content)
                        return True, f"Đã cập nhật file {os.path.basename(unc_path)} qua UNC share"
                except Exception as unc_err:
                    logger.debug(f"[RAM_AUDIT] Lỗi ghi UNC {unc_path}: {unc_err}")

        return False, "Không thể cập nhật trực tiếp file config"

    def _remove_remote_mongod_cache_limit(
        self,
        mongo_target_ip: str,
        parsed_config_path: Optional[str] = None,
        sql_target_ip: Optional[str] = None,
        sql_port: int = 1433,
        sql_user: str = "rk7",
        sql_password: str = "rk7"
    ) -> Tuple[bool, str]:
        """
        Gỡ bỏ dòng cacheSizeGB khỏi file cấu hình MongoDB trên máy chủ nhà hàng:
        1. Thử qua SQL Server xp_cmdshell powershell (nếu cùng máy .41 hoặc có kết nối SQL).
        2. Thử qua UNC share trực tiếp.
        Sau đó khởi động lại service mongod để WiredTiger trả về dung lượng RAM tự động theo mặc định.
        """
        candidate_paths = [
            r"D:\MongoDB\mongod.conf",
            r"D:\MongoDB\mongod.cfg",
            r"D:\MongoDB\bin\mongod.conf",
            r"D:\MongoDB\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\3.4\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\3.6\bin\mongod.cfg",
            r"C:\Program Files\MongoDB\Server\4.0\bin\mongod.cfg",
            r"C:\MongoDB\mongod.conf",
            r"C:\MongoDB\mongod.cfg"
        ]
        if parsed_config_path and parsed_config_path not in candidate_paths:
            candidate_paths.insert(0, parsed_config_path)

        # CÁCH 1: Thử qua SQL Server xp_cmdshell PowerShell
        if sql_target_ip:
            try:
                import pyodbc
                conn_str = f"DRIVER={{SQL Server}};SERVER={sql_target_ip},{sql_port};UID={sql_user};PWD={sql_password};DATABASE=master;"
                with pyodbc.connect(conn_str, autocommit=True, timeout=4) as conn:
                    with conn.cursor() as cursor:
                        try:
                            cursor.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                            cursor.execute("EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;")
                        except Exception:
                            pass

                        sql_search_paths = list(candidate_paths)
                        if mongo_target_ip and mongo_target_ip != sql_target_ip:
                            unc_prefix = f"\\\\{mongo_target_ip}"
                            sql_search_paths.insert(0, f"{unc_prefix}\\d$\\MongoDB\\mongod.conf")
                            sql_search_paths.insert(1, f"{unc_prefix}\\d$\\MongoDB\\mongod.cfg")
                            sql_search_paths.insert(2, f"{unc_prefix}\\c$\\Program Files\\MongoDB\\Server\\3.4\\bin\\mongod.cfg")

                        paths_ps_list = ", ".join(f"'{p}'" for p in sql_search_paths)
                        ps_script = f"""
$targetPaths = @({paths_ps_list})
$updated = $false
$usedPath = ""
foreach ($p in $targetPaths) {{
    if (Test-Path -LiteralPath $p) {{
        try {{
            $raw = [System.IO.File]::ReadAllText($p, [System.Text.Encoding]::UTF8)
            if ($raw -match '(?i)cacheSizeGB\\s*:\\s*[\\d\\.]+') {{
                $newText = [regex]::Replace($raw, '(?im)^[ \\t]*cacheSizeGB\\s*:\\s*[\\d\\.]+[^\r\n]*[\r\n]*', '')
                [System.IO.File]::WriteAllText($p, $newText, [System.Text.Encoding]::UTF8)
                $updated = $true
                $usedPath = $p
                break
            }}
        }} catch {{
            Write-Output "ERR_WRITE: $_"
        }}
    }}
}}
try {{
    Get-Service -Name *mongo* -ErrorAction SilentlyContinue | Restart-Service -Force -ErrorAction SilentlyContinue
}} catch {{}}
if ($updated) {{
    Write-Output "OK_REMOVED:$usedPath"
}} else {{
    Write-Output "NO_LIMIT_FOUND"
}}
"""
                        encoded_cmd = base64.b64encode(ps_script.encode("utf-16le")).decode("ascii")
                        cursor.execute(f"EXEC xp_cmdshell 'powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand {encoded_cmd}'")
                        rows = cursor.fetchall()
                        full_out = " ".join(str(r[0]) for r in rows if r and r[0])
                        if "OK_REMOVED:" in full_out:
                            match = re.search(r"OK_REMOVED:([^\r\n\t]+)", full_out)
                            found_file = match.group(1).strip() if match else "mongod.cfg"
                            return True, f"Đã gỡ cacheSizeGB file {os.path.basename(found_file)} qua SQL xp_cmdshell"
                        elif "NO_LIMIT_FOUND" in full_out:
                            return True, "File config vốn không bị giới hạn cacheSizeGB (đã restart service)"
            except Exception as e:
                logger.warning(f"[RAM_AUDIT] Gỡ bỏ config MongoDB qua xp_cmdshell không thành công: {e}")

        # CÁCH 2: Thử qua UNC share
        if mongo_target_ip:
            unc_candidates = [
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\mongod.conf",
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\bin\\mongod.conf",
                f"\\\\{mongo_target_ip}\\d$\\MongoDB\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\Program Files\\MongoDB\\Server\\3.4\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\Program Files\\MongoDB\\Server\\3.6\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\Program Files\\MongoDB\\Server\\4.0\\bin\\mongod.cfg",
                f"\\\\{mongo_target_ip}\\c$\\MongoDB\\mongod.conf",
                f"\\\\{mongo_target_ip}\\c$\\MongoDB\\mongod.cfg",
            ]
            for unc_path in unc_candidates:
                try:
                    if os.path.exists(unc_path):
                        with open(unc_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                        if re.search(r'(?i)cacheSizeGB\s*:\\s*[\d\.]+', content):
                            new_content = re.sub(r'(?im)^[ \t]*cacheSizeGB\s*:\s*[\d\.]+[^\r\n]*[\r\n]*', '', content)
                            with open(unc_path, "w", encoding="utf-8") as f:
                                f.write(new_content)
                            return True, f"Đã gỡ cacheSizeGB file {os.path.basename(unc_path)} qua UNC share"
                except Exception as unc_err:
                    logger.debug(f"[RAM_AUDIT] Lỗi ghi UNC {unc_path}: {unc_err}")

        return False, "Không tìm thấy file config để gỡ bỏ"

    def check_restaurant_ram_limits(
        self,
        restaurant: Dict[str, Any],
        skip_network_if_excluded: bool = True,
        skip_tch: Optional[bool] = None,
        exclude_keywords: Optional[List[str]] = None,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Kiểm tra 1 nhà hàng (Read-only):
        - target_sql_gb: Mức RAM chuẩn của SQL Server (GB)
        - target_mongo_gb: Mức RAM chuẩn của MongoDB (GB)
        - sql_port, sql_user, sql_password, mongo_port: Thông số kết nối linh động
        """
        rest_id = restaurant.get("id") or restaurant.get("ID")
        sap = (restaurant.get("sap") or restaurant.get("SAP") or "").strip()
        name = (restaurant.get("res") or restaurant.get("NAME") or restaurant.get("restaurant_name") or "N/A").strip()
        ip_gw = (restaurant.get("ip") or restaurant.get("IP") or "").strip()

        # Kiểm tra xem nhà hàng có cấu hình RAM riêng biệt không
        custom_cfgs = self.get_custom_configs()
        custom_cfg = custom_cfgs.get(str(rest_id))
        has_custom = False
        custom_sql = None
        custom_mongo = None
        if custom_cfg:
            has_custom = True
            custom_sql = custom_cfg.get("sql_limit_gb")
            custom_mongo = custom_cfg.get("mongo_limit_gb")
            if target_sql_gb is None and custom_sql is not None:
                target_sql_gb = custom_sql
            if target_mongo_gb is None and custom_mongo is not None:
                target_mongo_gb = custom_mongo

        # Đọc cấu hình chuẩn RAM và kết nối nếu chưa truyền
        t_cfg = self.get_target_config()
        if target_sql_gb is None:
            target_sql_gb = t_cfg.get("sql_limit_gb", 2.0)
        if target_mongo_gb is None:
            target_mongo_gb = t_cfg.get("mongo_limit_gb", 6.0)
        if sql_port is None:
            sql_port = int(t_cfg.get("sql_port", 1433))
        if sql_user is None:
            sql_user = str(t_cfg.get("sql_user", "rk7")).strip()
        if sql_password is None:
            sql_password = str(t_cfg.get("sql_password", "rk7")).strip()
        if mongo_port is None:
            mongo_port = int(t_cfg.get("mongo_port", 27017))

        target_sql_mb = int(target_sql_gb * 1024)
        target_mongo_bytes = int(target_mongo_gb * (1024**3))

        is_ex = self.is_restaurant_excluded(restaurant, skip_tch=skip_tch, exclude_keywords=exclude_keywords)

        # Xác định Subnet (VD: 10.8.46.1 -> 10.8.46)
        parts = ip_gw.split(".")
        if len(parts) >= 3:
            subnet = f"{parts[0]}.{parts[1]}.{parts[2]}"
        else:
            subnet = ""

        res_item = {
            "restaurant_id": rest_id,
            "sap_code": sap,
            "restaurant_name": name,
            "subnet": subnet,
            "ip_gateway": ip_gw,
            "is_excluded": is_ex,
            "has_custom_ram": has_custom,
            "custom_sql_gb": custom_sql,
            "custom_mongo_gb": custom_mongo,
            "target_sql_gb": target_sql_gb,
            "target_mongo_gb": target_mongo_gb,
            # SQL
            "sql_ip": f"{subnet}.41" if subnet else "",
            "sql_connected": False,
            "sql_max_memory_mb": None,
            "sql_is_limited_2gb": False,
            "sql_is_limited_4gb": False,
            "sql_status": "Chưa kiểm tra",
            # Mongo
            "mongo_ip": None,
            "mongo_port_open": False,
            "mongo_connected": False,
            "mongo_cache_size_gb": None,
            "mongo_is_limited_6gb": False,
            "mongo_status": "Chưa kiểm tra",
            # Summary
            "summary_note": ""
        }

        # Nếu thuộc diện loại trừ (TCH hoặc keyword cấu hình) và bật cờ bỏ qua kiểm tra mạng
        if is_ex and skip_network_if_excluded:
            res_item["sql_status"] = "Đã bỏ qua (Thuộc diện loại trừ TCH / Ngoại lệ)"
            res_item["mongo_status"] = "Đã bỏ qua (Thuộc diện loại trừ TCH / Ngoại lệ)"
            res_item["summary_note"] = "🛡️ Đã bỏ qua (TCH / Danh sách loại trừ)"
            return res_item

        if not subnet or "x" in subnet.lower():
            res_item["sql_status"] = "Không xác định được dải IP (Subnet không hợp lệ)"
            res_item["mongo_status"] = "Không xác định được dải IP (Subnet không hợp lệ)"
            res_item["summary_note"] = "IP không hợp lệ (.x/24)"
            return res_item

        # -------------------------------------------------------------
        # BƯỚC 1: KIỂM TRA SQL SERVER (.41)
        # -------------------------------------------------------------
        sql_target_ip = f"{subnet}.41"
        res_item["sql_ip"] = sql_target_ip

        sql_port_open = self._test_tcp_port(sql_target_ip, sql_port, timeout=1.5)
        if not sql_port_open:
            res_item["sql_connected"] = False
            res_item["sql_is_limited_2gb"] = False
            res_item["sql_is_limited_4gb"] = False
            res_item["sql_status"] = f"Không kết nối được SQL .41 (Port {sql_port} đóng)"
        else:
            try:
                import pyodbc
                conn_str = f"DRIVER={{SQL Server}};SERVER={sql_target_ip},{sql_port};UID={sql_user};PWD={sql_password};DATABASE=master;"
                with pyodbc.connect(conn_str, timeout=3) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT CAST(value_in_use AS BIGINT) FROM sys.configurations WHERE name = 'max server memory (MB)'")
                        row = cursor.fetchone()
                        if row and row[0] is not None:
                            max_mb = int(row[0])
                            res_item["sql_connected"] = True
                            res_item["sql_max_memory_mb"] = max_mb
                            if max_mb <= target_sql_mb:
                                res_item["sql_is_limited_2gb"] = True
                                res_item["sql_is_limited_4gb"] = True
                                res_item["sql_status"] = f"Đã giới hạn <={target_sql_gb}GB ({max_mb} MB) ✅"
                            else:
                                res_item["sql_is_limited_2gb"] = False
                                res_item["sql_is_limited_4gb"] = False
                                if max_mb >= 2147483647:
                                    res_item["sql_status"] = f"Chưa giới hạn <={target_sql_gb}GB (Mặc định không giới hạn) ⚠️"
                                else:
                                    res_item["sql_status"] = f"Chưa giới hạn <={target_sql_gb}GB (Hiện tại: {max_mb} MB) ⚠️"
                        else:
                            res_item["sql_connected"] = True
                            res_item["sql_status"] = "Đã kết nối SQL nhưng không đọc được tham số memory"
            except Exception as e:
                res_item["sql_connected"] = False
                err_msg = str(e)
                if "Login failed" in err_msg:
                    res_item["sql_status"] = f"Sai tài khoản {sql_user} hoặc quyền truy cập bị từ chối ❌"
                elif "timeout" in err_msg.lower():
                    res_item["sql_status"] = "Timeout khi kết nối SQL .41"
                else:
                    res_item["sql_status"] = f"Lỗi SQL: {err_msg[:60]}"

        # -------------------------------------------------------------
        # BƯỚC 2: KIỂM TRA MONGODB (.41, .11, .12)
        # -------------------------------------------------------------
        candidate_ips = [f"{subnet}.41", f"{subnet}.11", f"{subnet}.12"]
        mongo_open_ip = None

        for cand in candidate_ips:
            if self._test_tcp_port(cand, mongo_port, timeout=1.0):
                mongo_open_ip = cand
                break

        if not mongo_open_ip:
            res_item["mongo_connected"] = False
            res_item["mongo_port_open"] = False
            res_item["mongo_is_limited_6gb"] = False
            res_item["mongo_status"] = f"NH này Mongo chưa cấu hình mở port {mongo_port} ❌"
        else:
            res_item["mongo_ip"] = mongo_open_ip
            res_item["mongo_port_open"] = True
            try:
                import pymongo.common
                pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
                from pymongo import MongoClient
                client = MongoClient(mongo_open_ip, mongo_port, serverSelectionTimeoutMS=2000)
                try:
                    admin = client.admin
                    # 1. Đọc mongod config xem có cấu hình wiredTiger cacheSizeGB không
                    cache_size_cfg = None
                    parsed_config_path = None
                    try:
                        cmd_line = admin.command("getCmdLineOpts")
                        parsed = cmd_line.get("parsed", {})
                        parsed_config_path = parsed.get("config")
                        if not parsed_config_path:
                            argv = cmd_line.get("argv", [])
                            for i, arg in enumerate(argv):
                                if arg in ("--config", "-f") and i + 1 < len(argv):
                                    parsed_config_path = argv[i + 1]
                                    break
                                elif str(arg).startswith("--config="):
                                    parsed_config_path = str(arg).split("=", 1)[1]
                                    break
                        cache_size_cfg = parsed.get("storage", {}).get("wiredTiger", {}).get("engineConfig", {}).get("cacheSizeGB")
                    except Exception:
                        pass

                    # 2. Đọc serverStatus để lấy WiredTiger runtime cache
                    status = admin.command("serverStatus")
                    wt_bytes = status.get("wiredTiger", {}).get("cache", {}).get("maximum bytes configured", 0)
                    wt_gb = round(wt_bytes / (1024**3), 2) if wt_bytes else None

                    res_item["mongo_connected"] = True
                    res_item["mongo_cache_size_gb"] = wt_gb

                    # Kiểm tra xem đã giới hạn target_mongo_gb hay chưa
                    is_limited = False
                    if cache_size_cfg is not None and cache_size_cfg <= target_mongo_gb:
                        is_limited = True
                    elif wt_bytes == target_mongo_bytes or (wt_gb is not None and abs(wt_gb - target_mongo_gb) <= 0.25):
                        is_limited = True

                    res_item["mongo_is_limited_6gb"] = is_limited

                    cfg_detail = f"Config={cache_size_cfg}GB" if cache_size_cfg else "Mặc định chưa set mongod.cfg"
                    if is_limited:
                        res_item["mongo_status"] = f"Đã giới hạn {target_mongo_gb}GB ({mongo_open_ip}: {wt_gb} GB, {cfg_detail}) ✅"
                    else:
                        res_item["mongo_status"] = f"Chưa giới hạn {target_mongo_gb}GB ({mongo_open_ip}: {wt_gb} GB, {cfg_detail}) ⚠️"
                finally:
                    client.close()
            except Exception as me:
                res_item["mongo_connected"] = False
                res_item["mongo_is_limited_6gb"] = False
                res_item["mongo_status"] = f"Đã mở port {mongo_open_ip} nhưng lỗi truy vấn: {str(me)[:80]}"

        # -------------------------------------------------------------
        # TỔNG HỢP ĐÁNH GIÁ
        # -------------------------------------------------------------
        parts_note = []
        if res_item["sql_is_limited_2gb"]:
            parts_note.append(f"SQL <={target_sql_gb}GB: Đạt")
        elif res_item["sql_connected"]:
            parts_note.append(f"SQL: Chưa giới hạn <={target_sql_gb}GB")
        else:
            parts_note.append("SQL: Không kết nối")

        if res_item["mongo_is_limited_6gb"]:
            parts_note.append(f"Mongo {target_mongo_gb}GB: Đạt")
        elif res_item["mongo_connected"]:
            parts_note.append(f"Mongo: Chưa giới hạn {target_mongo_gb}GB")
        elif res_item.get("mongo_port_open"):
            parts_note.append(f"Mongo: Mở port {mongo_open_ip} (Lỗi lệnh)")
        else:
            parts_note.append("Mongo: Chưa mở port IP")

        res_item["summary_note"] = " | ".join(parts_note)
        return res_item

    def apply_restaurant_ram_limits(
        self,
        restaurant: Dict[str, Any],
        fix_sql: bool = True,
        fix_mongo: bool = True,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Kiểm tra và THỰC THI giới hạn RAM cho 1 nhà hàng theo cấu hình linh động:
        1. SQL Server (.41): EXEC sp_configure 'max server memory (MB)', {target_sql_mb}; RECONFIGURE;
        2. MongoDB (.41, .11, .12): setParameter wiredTigerEngineRuntimeConfig='cache_size={target_mongo_mb}M'
        """
        rest_id = restaurant.get("id") or restaurant.get("ID")
        sap = (restaurant.get("sap") or restaurant.get("SAP") or "").strip()
        name = (restaurant.get("res") or restaurant.get("NAME") or restaurant.get("restaurant_name") or "N/A").strip()
        ip_gw = (restaurant.get("ip") or restaurant.get("IP") or "").strip()

        # Kiểm tra xem nhà hàng có cấu hình RAM riêng biệt không
        custom_cfgs = self.get_custom_configs()
        custom_cfg = custom_cfgs.get(str(rest_id))
        has_custom = False
        custom_sql = None
        custom_mongo = None
        if custom_cfg:
            has_custom = True
            custom_sql = custom_cfg.get("sql_limit_gb")
            custom_mongo = custom_cfg.get("mongo_limit_gb")
            if target_sql_gb is None and custom_sql is not None:
                target_sql_gb = custom_sql
            if target_mongo_gb is None and custom_mongo is not None:
                target_mongo_gb = custom_mongo

        # Đọc cấu hình chuẩn RAM và kết nối nếu chưa truyền
        t_cfg = self.get_target_config()
        if target_sql_gb is None:
            target_sql_gb = t_cfg.get("sql_limit_gb", 2.0)
        if target_mongo_gb is None:
            target_mongo_gb = t_cfg.get("mongo_limit_gb", 6.0)
        if sql_port is None:
            sql_port = int(t_cfg.get("sql_port", 1433))
        if sql_user is None:
            sql_user = str(t_cfg.get("sql_user", "rk7")).strip()
        if sql_password is None:
            sql_password = str(t_cfg.get("sql_password", "rk7")).strip()
        if mongo_port is None:
            mongo_port = int(t_cfg.get("mongo_port", 27017))

        target_sql_mb = int(target_sql_gb * 1024)
        target_mongo_mb = int(target_mongo_gb * 1024)
        target_mongo_bytes = int(target_mongo_gb * (1024**3))

        parts = ip_gw.split(".")
        subnet = f"{parts[0]}.{parts[1]}.{parts[2]}" if len(parts) >= 3 else ""

        res_item = {
            "restaurant_id": rest_id,
            "sap_code": sap,
            "restaurant_name": name,
            "subnet": subnet,
            "ip_gateway": ip_gw,
            "has_custom_ram": has_custom,
            "custom_sql_gb": custom_sql,
            "custom_mongo_gb": custom_mongo,
            "target_sql_gb": target_sql_gb,
            "target_mongo_gb": target_mongo_gb,
            # SQL
            "sql_ip": f"{subnet}.41" if subnet else "",
            "sql_connected": False,
            "sql_max_memory_mb": None,
            "sql_is_limited_2gb": False,
            "sql_is_limited_4gb": False,
            "sql_fixed": False,
            "sql_status": "Chưa xử lý",
            # Mongo
            "mongo_ip": None,
            "mongo_connected": False,
            "mongo_cache_size_gb": None,
            "mongo_is_limited_6gb": False,
            "mongo_fixed": False,
            "mongo_status": "Chưa xử lý",
            # Summary
            "summary_note": ""
        }

        if not subnet:
            res_item["sql_status"] = "Không xác định được dải IP"
            res_item["mongo_status"] = "Không xác định được dải IP"
            res_item["summary_note"] = "Thiếu IP Gateway"
            return res_item

        # 1. XỬ LÝ SQL SERVER (.41)
        sql_target_ip = f"{subnet}.41"
        res_item["sql_ip"] = sql_target_ip
        if not self._test_tcp_port(sql_target_ip, sql_port, timeout=1.5):
            res_item["sql_connected"] = False
            res_item["sql_is_limited_2gb"] = False
            res_item["sql_is_limited_4gb"] = False
            res_item["sql_status"] = f"Không kết nối được SQL .41 (Port {sql_port} đóng)"
        else:
            try:
                import pyodbc
                conn_str = f"DRIVER={{SQL Server}};SERVER={sql_target_ip},{sql_port};UID={sql_user};PWD={sql_password};DATABASE=master;"
                with pyodbc.connect(conn_str, autocommit=True, timeout=4) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT CAST(value_in_use AS BIGINT) FROM sys.configurations WHERE name = 'max server memory (MB)'")
                        row = cursor.fetchone()
                        current_mb = int(row[0]) if row and row[0] is not None else None

                        if current_mb is not None and current_mb <= target_sql_mb:
                            res_item["sql_connected"] = True
                            res_item["sql_max_memory_mb"] = current_mb
                            res_item["sql_is_limited_2gb"] = True
                            res_item["sql_is_limited_4gb"] = True
                            res_item["sql_status"] = f"Đã đạt chuẩn <={target_sql_gb}GB sẵn ({current_mb} MB) ✅"
                        elif fix_sql:
                            # Thực hiện cấu hình giới hạn target_sql_mb
                            cursor.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                            cursor.execute(f"EXEC sp_configure 'max server memory (MB)', {target_sql_mb}; RECONFIGURE;")
                            # Kiểm tra lại xác nhận
                            cursor.execute("SELECT CAST(value_in_use AS BIGINT) FROM sys.configurations WHERE name = 'max server memory (MB)'")
                            row_after = cursor.fetchone()
                            new_mb = int(row_after[0]) if row_after and row_after[0] is not None else target_sql_mb
                            res_item["sql_connected"] = True
                            res_item["sql_max_memory_mb"] = new_mb
                            res_item["sql_is_limited_2gb"] = (new_mb <= target_sql_mb)
                            res_item["sql_is_limited_4gb"] = (new_mb <= target_sql_mb)
                            res_item["sql_fixed"] = (new_mb <= target_sql_mb)
                            res_item["sql_status"] = f"Đã giới hạn {target_sql_gb}GB thành công ({new_mb} MB) ⚡✅"
            except Exception as e:
                res_item["sql_connected"] = False
                err_msg = str(e)
                if "Login failed" in err_msg:
                    res_item["sql_status"] = f"Sai tài khoản {sql_user} hoặc bị từ chối ❌"
                elif "timeout" in err_msg.lower():
                    res_item["sql_status"] = "Timeout khi kết nối SQL .41"
                else:
                    res_item["sql_status"] = f"Lỗi SQL: {err_msg[:60]}"

        # 2. XỬ LÝ MONGODB (.41, .11, .12)
        candidate_ips = [f"{subnet}.41", f"{subnet}.11", f"{subnet}.12"]
        mongo_open_ips = [cand for cand in candidate_ips if self._test_tcp_port(cand, mongo_port, timeout=1.0)]

        if not mongo_open_ips:
            res_item["mongo_connected"] = False
            res_item["mongo_port_open"] = False
            res_item["mongo_is_limited_6gb"] = False
            res_item["mongo_status"] = f"NH này Mongo chưa cấu hình mở port {mongo_port} ❌"
        else:
            mongo_target = mongo_open_ips[0]
            res_item["mongo_ip"] = mongo_target
            res_item["mongo_port_open"] = True
            try:
                import pymongo.common
                pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
                from pymongo import MongoClient
                client = MongoClient(mongo_target, mongo_port, serverSelectionTimeoutMS=3000)
                try:
                    # 1. Đọc mongod config hiện tại
                    cache_size_cfg = None
                    parsed_config_path = None
                    try:
                        cmd_line = admin.command("getCmdLineOpts")
                        parsed = cmd_line.get("parsed", {})
                        parsed_config_path = parsed.get("config")
                        if not parsed_config_path:
                            argv = cmd_line.get("argv", [])
                            for i, arg in enumerate(argv):
                                if arg in ("--config", "-f") and i + 1 < len(argv):
                                    parsed_config_path = argv[i + 1]
                                    break
                                elif str(arg).startswith("--config="):
                                    parsed_config_path = str(arg).split("=", 1)[1]
                                    break
                        cache_size_cfg = parsed.get("storage", {}).get("wiredTiger", {}).get("engineConfig", {}).get("cacheSizeGB")
                    except Exception:
                        pass

                    # 2. Đọc serverStatus để lấy WiredTiger runtime cache
                    status = admin.command("serverStatus")
                    wt_bytes = status.get("wiredTiger", {}).get("cache", {}).get("maximum bytes configured", 0)
                    wt_gb = round(wt_bytes / (1024**3), 2) if wt_bytes else 0

                    if not fix_mongo and (wt_bytes == target_mongo_bytes or (wt_gb and abs(wt_gb - target_mongo_gb) <= 0.25)):
                        res_item["mongo_connected"] = True
                        res_item["mongo_cache_size_gb"] = wt_gb
                        res_item["mongo_is_limited_6gb"] = True
                        cfg_str = f"Config={cache_size_cfg}GB" if cache_size_cfg else "Runtime OK"
                        res_item["mongo_status"] = f"Đã đạt chuẩn {target_mongo_gb}GB sẵn ({mongo_target}: {wt_gb} GB, {cfg_str}) ✅"
                    elif fix_mongo:
                        # a. Cập nhật file config (mongod.cfg / mongod.conf) trên máy chủ
                        cfg_ok, cfg_info = self._update_remote_mongod_config(
                            mongo_target_ip=mongo_target,
                            target_mongo_gb=target_mongo_gb,
                            parsed_config_path=parsed_config_path,
                            sql_target_ip=sql_target_ip,
                            sql_port=sql_port,
                            sql_user=sql_user,
                            sql_password=sql_password
                        )
                        # b. Áp dụng giới hạn target_mongo_mb ngay runtime WiredTiger
                        try:
                            admin.command("setParameter", 1, wiredTigerEngineRuntimeConfig=f"cache_size={target_mongo_mb}M")
                        except Exception as e_rt:
                            logger.warning(f"[RAM_AUDIT] Lỗi runtime setParameter: {e_rt}")

                        # c. Xác minh lại cache và config
                        status2 = admin.command("serverStatus")
                        wt_bytes2 = status2.get("wiredTiger", {}).get("cache", {}).get("maximum bytes configured", 0)
                        wt_gb2 = round(wt_bytes2 / (1024**3), 2) if wt_bytes2 else float(target_mongo_gb)

                        # Đọc lại getCmdLineOpts (nếu mongod service vừa restart)
                        try:
                            cmd_line2 = admin.command("getCmdLineOpts")
                            parsed2 = cmd_line2.get("parsed", {})
                            cache_size_cfg2 = parsed2.get("storage", {}).get("wiredTiger", {}).get("engineConfig", {}).get("cacheSizeGB")
                        except Exception:
                            cache_size_cfg2 = None

                        res_item["mongo_connected"] = True
                        res_item["mongo_cache_size_gb"] = wt_gb2
                        res_item["mongo_is_limited_6gb"] = True
                        res_item["mongo_fixed"] = True

                        if cfg_ok:
                            cfg_badge = f"{cfg_info}"
                        elif cache_size_cfg2:
                            cfg_badge = f"Config={cache_size_cfg2}GB"
                        else:
                            cfg_badge = "Đã set runtime WiredTiger"

                        res_item["mongo_status"] = f"Đã giới hạn {target_mongo_gb}GB thành công ({mongo_target}: {wt_gb2} GB, {cfg_badge}) ⚡✅"
                finally:
                    client.close()
            except Exception as me:
                res_item["mongo_connected"] = False
                res_item["mongo_is_limited_6gb"] = False
                res_item["mongo_status"] = f"Lỗi MongoDB ({mongo_target}): {str(me)[:60]}"

        # 3. TỔNG HỢP GHI CHÚ KẾT QUẢ
        parts_note = []
        if res_item.get("sql_fixed"):
            parts_note.append(f"SQL: Đã giới hạn {target_sql_gb}GB ⚡")
        elif res_item.get("sql_is_limited_2gb"):
            parts_note.append(f"SQL: Đạt <={target_sql_gb}GB")
        elif not res_item.get("sql_connected"):
            parts_note.append("SQL: Mất kết nối .41")
        else:
            parts_note.append(f"SQL: Chưa đạt <={target_sql_gb}GB")

        if res_item.get("mongo_fixed"):
            parts_note.append(f"Mongo ({res_item.get('mongo_ip')}): Đã giới hạn {target_mongo_gb}GB ⚡")
        elif res_item.get("mongo_is_limited_6gb"):
            parts_note.append(f"Mongo ({res_item.get('mongo_ip')}): Đạt {target_mongo_gb}GB")
        elif not res_item.get("mongo_connected"):
            parts_note.append(f"Mongo: Chưa mở port {mongo_port}")
        else:
            parts_note.append(f"Mongo: Chưa đạt {target_mongo_gb}GB")

        res_item["summary_note"] = " | ".join(parts_note)
        return res_item

    def scan_single_restaurant(
        self,
        restaurant_id: int,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """Quét kiểm tra giới hạn RAM SQL & Mongo cho 1 nhà hàng cụ thể."""
        scan_date = datetime.now().strftime("%Y-%m-%d")
        with engine.connect() as conn:
            query = text("""
                SELECT ID as id, RES as res, BRAND as brand, SAP as sap,
                       IP as ip, TRANGTHAI as trangthai, RK7 as rk7
                FROM RESTAURANT
                WHERE ID = :id
            """)
            row = conn.execute(query, {"id": restaurant_id}).mappings().first()
            if not row:
                raise ValueError(f"Không tìm thấy nhà hàng có ID = {restaurant_id}")
            restaurant = dict(row)

        res_item = self.check_restaurant_ram_limits(
            restaurant,
            skip_network_if_excluded=False,
            target_sql_gb=target_sql_gb,
            target_mongo_gb=target_mongo_gb,
            sql_port=sql_port,
            sql_user=sql_user,
            sql_password=sql_password,
            mongo_port=mongo_port
        )

        # Cập nhật kết quả vào database RAM_LIMIT_AUDIT_LOG
        try:
            with engine.begin() as conn:
                check_sql = text("SELECT id FROM RAM_LIMIT_AUDIT_LOG WHERE scan_date = :scan_date AND restaurant_id = :rid")
                existing = conn.execute(check_sql, {"scan_date": scan_date, "rid": restaurant_id}).first()
                if existing:
                    update_sql = text("""
                        UPDATE RAM_LIMIT_AUDIT_LOG
                        SET sql_ip = :sql_ip, sql_connected = :sql_connected, sql_max_memory_mb = :sql_max_memory_mb,
                            sql_is_limited_2gb = :sql_is_limited_2gb, sql_is_limited_4gb = :sql_is_limited_4gb, sql_status = :sql_status,
                            mongo_ip = :mongo_ip, mongo_connected = :mongo_connected, mongo_cache_size_gb = :mongo_cache_size_gb,
                            mongo_is_limited_6gb = :mongo_is_limited_6gb, mongo_status = :mongo_status,
                            summary_note = :summary_note, created_at = GETDATE()
                        WHERE scan_date = :scan_date AND restaurant_id = :restaurant_id
                    """)
                    conn.execute(update_sql, {
                        "scan_date": scan_date,
                        "restaurant_id": restaurant_id,
                        "sql_ip": res_item["sql_ip"],
                        "sql_connected": 1 if res_item["sql_connected"] else 0,
                        "sql_max_memory_mb": res_item["sql_max_memory_mb"],
                        "sql_is_limited_2gb": 1 if res_item.get("sql_is_limited_2gb") else 0,
                        "sql_is_limited_4gb": 1 if res_item.get("sql_is_limited_4gb") else 0,
                        "sql_status": res_item["sql_status"],
                        "mongo_ip": res_item["mongo_ip"],
                        "mongo_connected": 1 if res_item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": res_item["mongo_cache_size_gb"],
                        "mongo_is_limited_6gb": 1 if res_item.get("mongo_is_limited_6gb") else 0,
                        "mongo_status": res_item["mongo_status"],
                        "summary_note": res_item["summary_note"]
                    })
                else:
                    insert_sql = text("""
                        INSERT INTO RAM_LIMIT_AUDIT_LOG (
                            scan_date, restaurant_id, sap_code, restaurant_name, subnet, ip_gateway,
                            sql_ip, sql_connected, sql_max_memory_mb, sql_is_limited_2gb, sql_is_limited_4gb, sql_status,
                            mongo_ip, mongo_connected, mongo_cache_size_gb, mongo_is_limited_6gb, mongo_status,
                            summary_note, created_at
                        ) VALUES (
                            :scan_date, :restaurant_id, :sap_code, :restaurant_name, :subnet, :ip_gateway,
                            :sql_ip, :sql_connected, :sql_max_memory_mb, :sql_is_limited_2gb, :sql_is_limited_4gb, :sql_status,
                            :mongo_ip, :mongo_connected, :mongo_cache_size_gb, :mongo_is_limited_6gb, :mongo_status,
                            :summary_note, GETDATE()
                        )
                    """)
                    conn.execute(insert_sql, {
                        "scan_date": scan_date,
                        "restaurant_id": restaurant_id,
                        "sap_code": res_item["sap_code"],
                        "restaurant_name": res_item["restaurant_name"],
                        "subnet": res_item["subnet"],
                        "ip_gateway": res_item["ip_gateway"],
                        "sql_ip": res_item["sql_ip"],
                        "sql_connected": 1 if res_item["sql_connected"] else 0,
                        "sql_max_memory_mb": res_item["sql_max_memory_mb"],
                        "sql_is_limited_2gb": 1 if res_item.get("sql_is_limited_2gb") else 0,
                        "sql_is_limited_4gb": 1 if res_item.get("sql_is_limited_4gb") else 0,
                        "sql_status": res_item["sql_status"],
                        "mongo_ip": res_item["mongo_ip"],
                        "mongo_connected": 1 if res_item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": res_item["mongo_cache_size_gb"],
                        "mongo_is_limited_6gb": 1 if res_item.get("mongo_is_limited_6gb") else 0,
                        "mongo_status": res_item["mongo_status"],
                        "summary_note": res_item["summary_note"]
                    })
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi lưu kết quả single scan: {e}")

        return res_item

    def apply_ram_limits_single(
        self,
        restaurant_id: int,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None,
        save_as_custom: bool = False
    ) -> Dict[str, Any]:
        """Xử lý giới hạn RAM SQL & Mongo cho 1 nhà hàng cụ thể."""
        scan_date = datetime.now().strftime("%Y-%m-%d")
        with engine.connect() as conn:
            query = text("""
                SELECT ID as id, RES as res, BRAND as brand, SAP as sap,
                       IP as ip, TRANGTHAI as trangthai, RK7 as rk7
                FROM RESTAURANT
                WHERE ID = :id
            """)
            row = conn.execute(query, {"id": restaurant_id}).mappings().first()
            if not row:
                raise ValueError(f"Không tìm thấy nhà hàng có ID = {restaurant_id}")
            restaurant = dict(row)

        res_item = self.apply_restaurant_ram_limits(
            restaurant,
            fix_sql=True,
            fix_mongo=True,
            target_sql_gb=target_sql_gb,
            target_mongo_gb=target_mongo_gb,
            sql_port=sql_port,
            sql_user=sql_user,
            sql_password=sql_password,
            mongo_port=mongo_port
        )

        if save_as_custom:
            effective_sql = target_sql_gb if target_sql_gb is not None else res_item.get("target_sql_gb", 2.0)
            effective_mongo = target_mongo_gb if target_mongo_gb is not None else res_item.get("target_mongo_gb", 6.0)
            self.save_custom_config(
                restaurant_id=restaurant_id,
                sql_limit_gb=effective_sql,
                mongo_limit_gb=effective_mongo,
                sap_code=res_item.get("sap_code", ""),
                restaurant_name=res_item.get("restaurant_name", "")
            )
            res_item["has_custom_ram"] = True
            res_item["custom_sql_gb"] = effective_sql
            res_item["custom_mongo_gb"] = effective_mongo

        # Cập nhật vào database RAM_LIMIT_AUDIT_LOG
        try:
            with engine.begin() as conn:
                check_sql = text("SELECT id FROM RAM_LIMIT_AUDIT_LOG WHERE scan_date = :scan_date AND restaurant_id = :rid")
                existing = conn.execute(check_sql, {"scan_date": scan_date, "rid": restaurant_id}).first()
                if existing:
                    update_sql = text("""
                        UPDATE RAM_LIMIT_AUDIT_LOG
                        SET sql_ip = :sql_ip, sql_connected = :sql_connected, sql_max_memory_mb = :sql_max_memory_mb,
                            sql_is_limited_2gb = :sql_is_limited_2gb, sql_is_limited_4gb = :sql_is_limited_4gb, sql_status = :sql_status,
                            mongo_ip = :mongo_ip, mongo_connected = :mongo_connected, mongo_cache_size_gb = :mongo_cache_size_gb,
                            mongo_is_limited_6gb = :mongo_is_limited_6gb, mongo_status = :mongo_status,
                            summary_note = :summary_note, created_at = GETDATE()
                        WHERE scan_date = :scan_date AND restaurant_id = :restaurant_id
                    """)
                    conn.execute(update_sql, {
                        "scan_date": scan_date,
                        "restaurant_id": restaurant_id,
                        "sql_ip": res_item["sql_ip"],
                        "sql_connected": 1 if res_item["sql_connected"] else 0,
                        "sql_max_memory_mb": res_item["sql_max_memory_mb"],
                        "sql_is_limited_2gb": 1 if res_item["sql_is_limited_2gb"] else 0,
                        "sql_is_limited_4gb": 1 if res_item["sql_is_limited_4gb"] else 0,
                        "sql_status": res_item["sql_status"],
                        "mongo_ip": res_item["mongo_ip"],
                        "mongo_connected": 1 if res_item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": res_item["mongo_cache_size_gb"],
                        "mongo_is_limited_6gb": 1 if res_item["mongo_is_limited_6gb"] else 0,
                        "mongo_status": res_item["mongo_status"],
                        "summary_note": res_item["summary_note"]
                    })
                else:
                    insert_sql = text("""
                        INSERT INTO RAM_LIMIT_AUDIT_LOG (
                            scan_date, restaurant_id, sap_code, restaurant_name, subnet, ip_gateway,
                            sql_ip, sql_connected, sql_max_memory_mb, sql_is_limited_2gb, sql_is_limited_4gb, sql_status,
                            mongo_ip, mongo_connected, mongo_cache_size_gb, mongo_is_limited_6gb, mongo_status,
                            summary_note, created_at
                        ) VALUES (
                            :scan_date, :restaurant_id, :sap_code, :restaurant_name, :subnet, :ip_gateway,
                            :sql_ip, :sql_connected, :sql_max_memory_mb, :sql_is_limited_2gb, :sql_is_limited_4gb, :sql_status,
                            :mongo_ip, :mongo_connected, :mongo_cache_size_gb, :mongo_is_limited_6gb, :mongo_status,
                            :summary_note, GETDATE()
                        )
                    """)
                    conn.execute(insert_sql, {
                        "scan_date": scan_date,
                        "restaurant_id": restaurant_id,
                        "sap_code": res_item["sap_code"],
                        "restaurant_name": res_item["restaurant_name"],
                        "subnet": res_item["subnet"],
                        "ip_gateway": res_item["ip_gateway"],
                        "sql_ip": res_item["sql_ip"],
                        "sql_connected": 1 if res_item["sql_connected"] else 0,
                        "sql_max_memory_mb": res_item["sql_max_memory_mb"],
                        "sql_is_limited_2gb": 1 if res_item["sql_is_limited_2gb"] else 0,
                        "sql_is_limited_4gb": 1 if res_item["sql_is_limited_4gb"] else 0,
                        "sql_status": res_item["sql_status"],
                        "mongo_ip": res_item["mongo_ip"],
                        "mongo_connected": 1 if res_item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": res_item["mongo_cache_size_gb"],
                        "mongo_is_limited_6gb": 1 if res_item["mongo_is_limited_6gb"] else 0,
                        "mongo_status": res_item["mongo_status"],
                        "summary_note": res_item["summary_note"]
                    })
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi lưu kết quả single apply: {e}")

        return res_item

    def remove_restaurant_ram_limits(
        self,
        restaurant: Dict[str, Any],
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Gỡ bỏ hoàn toàn giới hạn RAM cho 1 nhà hàng (Cả SQL Server và MongoDB):
        1. SQL Server (.41): EXEC sp_configure 'max server memory (MB)', 2147483647; RECONFIGURE;
        2. MongoDB (.41, .11, .12): Xóa dòng cacheSizeGB trong file cấu hình mongod.cfg/conf và restart MongoDB service.
        """
        rest_id = restaurant.get("id") or restaurant.get("ID")
        sap = (restaurant.get("sap") or restaurant.get("SAP") or "").strip()
        name = (restaurant.get("res") or restaurant.get("NAME") or restaurant.get("restaurant_name") or "N/A").strip()
        ip_gw = (restaurant.get("ip") or restaurant.get("IP") or "").strip()

        t_cfg = self.get_target_config()
        if sql_port is None:
            sql_port = int(t_cfg.get("sql_port", 1433))
        if sql_user is None:
            sql_user = str(t_cfg.get("sql_user", "rk7")).strip()
        if sql_password is None:
            sql_password = str(t_cfg.get("sql_password", "rk7")).strip()
        if mongo_port is None:
            mongo_port = int(t_cfg.get("mongo_port", 27017))

        parts = ip_gw.split(".")
        subnet = f"{parts[0]}.{parts[1]}.{parts[2]}" if len(parts) >= 3 else ""

        res_item = {
            "restaurant_id": rest_id,
            "sap_code": sap,
            "restaurant_name": name,
            "subnet": subnet,
            "ip_gateway": ip_gw,
            "has_custom_ram": False,
            "custom_sql_gb": None,
            "custom_mongo_gb": None,
            # SQL
            "sql_ip": f"{subnet}.41" if subnet else "",
            "sql_connected": False,
            "sql_max_memory_mb": None,
            "sql_is_limited_2gb": False,
            "sql_is_limited_4gb": False,
            "sql_fixed": False,
            "sql_status": "Chưa xử lý",
            # Mongo
            "mongo_ip": None,
            "mongo_port_open": False,
            "mongo_connected": False,
            "mongo_cache_size_gb": None,
            "mongo_is_limited_6gb": False,
            "mongo_fixed": False,
            "mongo_status": "Chưa xử lý",
            "summary_note": ""
        }

        if not subnet:
            res_item["sql_status"] = "Không xác định được dải IP"
            res_item["mongo_status"] = "Không xác định được dải IP"
            res_item["summary_note"] = "Thiếu IP Gateway"
            return res_item

        # 1. GỠ BỎ GIỚI HẠN SQL SERVER (.41) -> max server memory = 2147483647 (2PB - Không giới hạn)
        sql_target_ip = f"{subnet}.41"
        res_item["sql_ip"] = sql_target_ip
        if not self._test_tcp_port(sql_target_ip, sql_port, timeout=1.5):
            res_item["sql_connected"] = False
            res_item["sql_status"] = f"Không kết nối được SQL .41 (Port {sql_port} đóng)"
        else:
            try:
                import pyodbc
                conn_str = f"DRIVER={{SQL Server}};SERVER={sql_target_ip},{sql_port};UID={sql_user};PWD={sql_password};DATABASE=master;"
                with pyodbc.connect(conn_str, autocommit=True, timeout=4) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("EXEC sp_configure 'show advanced options', 1; RECONFIGURE;")
                        cursor.execute("EXEC sp_configure 'max server memory (MB)', 2147483647; RECONFIGURE;")
                        cursor.execute("SELECT CAST(value_in_use AS BIGINT) FROM sys.configurations WHERE name = 'max server memory (MB)'")
                        row_after = cursor.fetchone()
                        new_mb = int(row_after[0]) if row_after and row_after[0] is not None else 2147483647
                        res_item["sql_connected"] = True
                        res_item["sql_max_memory_mb"] = new_mb
                        res_item["sql_is_limited_2gb"] = False
                        res_item["sql_is_limited_4gb"] = False
                        res_item["sql_fixed"] = True
                        res_item["sql_status"] = f"Đã gỡ bỏ giới hạn RAM SQL (Không giới hạn - {new_mb} MB) 🔓"
            except Exception as e:
                res_item["sql_connected"] = False
                res_item["sql_status"] = f"Lỗi gỡ giới hạn SQL: {str(e)[:60]}"

        # 2. GỠ BỎ GIỚI HẠN MONGODB (.41, .11, .12) -> Xóa cacheSizeGB trong file config và restart
        candidate_ips = [f"{subnet}.41", f"{subnet}.11", f"{subnet}.12"]
        mongo_open_ips = [cand for cand in candidate_ips if self._test_tcp_port(cand, mongo_port, timeout=1.0)]

        if not mongo_open_ips:
            res_item["mongo_connected"] = False
            res_item["mongo_port_open"] = False
            res_item["mongo_status"] = f"NH này Mongo chưa cấu hình mở port {mongo_port} ❌"
        else:
            mongo_target = mongo_open_ips[0]
            res_item["mongo_ip"] = mongo_target
            res_item["mongo_port_open"] = True

            # Gỡ bỏ cấu hình qua xp_cmdshell PowerShell hoặc UNC
            removed_cfg, remove_info = self._remove_remote_mongod_cache_limit(
                mongo_target_ip=mongo_target,
                sql_target_ip=sql_target_ip,
                sql_port=sql_port,
                sql_user=sql_user,
                sql_password=sql_password
            )

            try:
                import pymongo.common
                pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
                from pymongo import MongoClient
                client = MongoClient(mongo_target, mongo_port, serverSelectionTimeoutMS=3000)
                try:
                    admin = client.admin
                    status = admin.command("serverStatus")
                    wt_bytes = status.get("wiredTiger", {}).get("cache", {}).get("maximum bytes configured", 0)
                    wt_gb = round(wt_bytes / (1024**3), 2) if wt_bytes else None

                    res_item["mongo_connected"] = True
                    res_item["mongo_cache_size_gb"] = wt_gb
                    res_item["mongo_is_limited_6gb"] = False
                    res_item["mongo_fixed"] = True
                    badge = remove_info if removed_cfg else "Đã xóa giới hạn"
                    res_item["mongo_status"] = f"Đã gỡ bỏ giới hạn RAM Mongo ({mongo_target}: {wt_gb or 'Auto'} GB, {badge}) 🔓"
                finally:
                    client.close()
            except Exception as me:
                res_item["mongo_connected"] = False
                res_item["mongo_is_limited_6gb"] = False
                res_item["mongo_status"] = f"Lỗi MongoDB ({mongo_target}): {str(me)[:60]}"

        # Nếu nhà hàng này từng có custom RAM config, xóa khỏi danh sách riêng
        self.delete_custom_config(rest_id)

        parts_note = []
        if res_item.get("sql_fixed"):
            parts_note.append("SQL: Không giới hạn 🔓")
        else:
            parts_note.append(res_item.get("sql_status", "SQL: Lỗi"))

        if res_item.get("mongo_fixed"):
            parts_note.append("Mongo: Không giới hạn 🔓")
        else:
            parts_note.append(res_item.get("mongo_status", "Mongo: Lỗi"))

        res_item["summary_note"] = " | ".join(parts_note)
        return res_item

    def remove_ram_limits_single(
        self,
        restaurant_id: int,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """Gỡ bỏ hoàn toàn giới hạn RAM SQL & Mongo cho 1 nhà hàng cụ thể."""
        scan_date = datetime.now().strftime("%Y-%m-%d")
        with engine.connect() as conn:
            query = text("""
                SELECT ID as id, RES as res, BRAND as brand, SAP as sap,
                       IP as ip, TRANGTHAI as trangthai, RK7 as rk7
                FROM RESTAURANT
                WHERE ID = :id
            """)
            row = conn.execute(query, {"id": restaurant_id}).mappings().first()
            if not row:
                raise ValueError(f"Không tìm thấy nhà hàng có ID = {restaurant_id}")
            restaurant = dict(row)

        res_item = self.remove_restaurant_ram_limits(
            restaurant,
            sql_port=sql_port,
            sql_user=sql_user,
            sql_password=sql_password,
            mongo_port=mongo_port
        )

        # Cập nhật kết quả vào database RAM_LIMIT_AUDIT_LOG
        try:
            with engine.begin() as conn:
                check_sql = text("SELECT id FROM RAM_LIMIT_AUDIT_LOG WHERE scan_date = :scan_date AND restaurant_id = :rid")
                existing = conn.execute(check_sql, {"scan_date": scan_date, "rid": restaurant_id}).first()
                if existing:
                    update_sql = text("""
                        UPDATE RAM_LIMIT_AUDIT_LOG
                        SET sql_ip = :sql_ip, sql_connected = :sql_connected, sql_max_memory_mb = :sql_max_memory_mb,
                            sql_is_limited_2gb = 0, sql_is_limited_4gb = 0, sql_status = :sql_status,
                            mongo_ip = :mongo_ip, mongo_connected = :mongo_connected, mongo_cache_size_gb = :mongo_cache_size_gb,
                            mongo_is_limited_6gb = 0, mongo_status = :mongo_status,
                            summary_note = :summary_note, created_at = GETDATE()
                        WHERE scan_date = :scan_date AND restaurant_id = :restaurant_id
                    """)
                    conn.execute(update_sql, {
                        "scan_date": scan_date,
                        "restaurant_id": restaurant_id,
                        "sql_ip": res_item["sql_ip"],
                        "sql_connected": 1 if res_item["sql_connected"] else 0,
                        "sql_max_memory_mb": res_item["sql_max_memory_mb"],
                        "sql_status": res_item["sql_status"],
                        "mongo_ip": res_item["mongo_ip"],
                        "mongo_connected": 1 if res_item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": res_item["mongo_cache_size_gb"],
                        "mongo_status": res_item["mongo_status"],
                        "summary_note": res_item["summary_note"]
                    })
                else:
                    insert_sql = text("""
                        INSERT INTO RAM_LIMIT_AUDIT_LOG (
                            scan_date, restaurant_id, sap_code, restaurant_name, subnet, ip_gateway,
                            sql_ip, sql_connected, sql_max_memory_mb, 0, 0, :sql_status,
                            mongo_ip, mongo_connected, mongo_cache_size_gb, 0, :mongo_status,
                            summary_note, created_at
                        ) VALUES (
                            :scan_date, :restaurant_id, :sap_code, :restaurant_name, :subnet, :ip_gateway,
                            :sql_ip, :sql_connected, :sql_max_memory_mb, 0, 0, :sql_status,
                            :mongo_ip, :mongo_connected, :mongo_cache_size_gb, 0, :mongo_status,
                            :summary_note, GETDATE()
                        )
                    """)
                    conn.execute(insert_sql, {
                        "scan_date": scan_date,
                        "restaurant_id": restaurant_id,
                        "sap_code": res_item["sap_code"],
                        "restaurant_name": res_item["restaurant_name"],
                        "subnet": res_item["subnet"],
                        "ip_gateway": res_item["ip_gateway"],
                        "sql_ip": res_item["sql_ip"],
                        "sql_connected": 1 if res_item["sql_connected"] else 0,
                        "sql_max_memory_mb": res_item["sql_max_memory_mb"],
                        "sql_status": res_item["sql_status"],
                        "mongo_ip": res_item["mongo_ip"],
                        "mongo_connected": 1 if res_item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": res_item["mongo_cache_size_gb"],
                        "mongo_status": res_item["mongo_status"],
                        "summary_note": res_item["summary_note"]
                    })
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi lưu kết quả single remove limit: {e}")

        return res_item

    def remove_ram_limits_batch(
        self,
        scope: str = "custom",
        restaurant_ids: Optional[List[int]] = None,
        recipients: Optional[List[str]] = None,
        send_email: bool = False,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """Gỡ bỏ hoàn toàn giới hạn RAM hàng loạt cho danh sách nhà hàng."""
        scan_date = datetime.now().strftime("%Y-%m-%d")
        scan_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with engine.connect() as conn:
            query = text("""
                SELECT ID as id, RES as res, BRAND as brand, SAP as sap,
                       IP as ip, TRANGTHAI as trangthai, RK7 as rk7
                FROM RESTAURANT
                WHERE UPPER(LTRIM(RTRIM(ISNULL(TRANGTHAI, 'ON')))) = 'ON'
                ORDER BY ID ASC
            """)
            rows = conn.execute(query).mappings().all()
            all_active = [dict(r) for r in rows]

        if restaurant_ids:
            target_restaurants = [r for r in all_active if r["id"] in restaurant_ids]
        elif scope == "custom_only":
            custom_cfgs = self.get_custom_configs()
            c_ids = {int(k) for k in custom_cfgs.keys()}
            target_restaurants = [r for r in all_active if r["id"] in c_ids]
        else:
            target_restaurants = all_active

        if not target_restaurants:
            return {
                "scan_date": scan_date,
                "total_processed": 0,
                "message": "Không có nhà hàng nào để gỡ bỏ giới hạn RAM."
            }

        results: List[Dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=30) as executor:
            future_to_rest = {
                executor.submit(
                    self.remove_restaurant_ram_limits,
                    rest,
                    sql_port,
                    sql_user,
                    sql_password,
                    mongo_port
                ): rest
                for rest in target_restaurants
            }
            for future in as_completed(future_to_rest):
                try:
                    res_data = future.result()
                    results.append(res_data)
                except Exception as e:
                    r_ref = future_to_rest[future]
                    logger.error(f"[RAM_AUDIT] Lỗi gỡ giới hạn RAM NH {r_ref.get('res')}: {e}")

        results.sort(key=lambda x: x.get("restaurant_id", 0))

        # Cập nhật kết quả vào database SQL Server
        try:
            with engine.begin() as conn:
                for item in results:
                    rid = item["restaurant_id"]
                    check_sql = text("SELECT id FROM RAM_LIMIT_AUDIT_LOG WHERE scan_date = :scan_date AND restaurant_id = :rid")
                    existing = conn.execute(check_sql, {"scan_date": scan_date, "rid": rid}).first()
                    if existing:
                        conn.execute(text("""
                            UPDATE RAM_LIMIT_AUDIT_LOG
                            SET sql_ip = :sql_ip, sql_connected = :sql_connected, sql_max_memory_mb = :sql_max_memory_mb,
                                sql_is_limited_2gb = 0, sql_is_limited_4gb = 0, sql_status = :sql_status,
                                mongo_ip = :mongo_ip, mongo_connected = :mongo_connected, mongo_cache_size_gb = :mongo_cache_size_gb,
                                mongo_is_limited_6gb = 0, mongo_status = :mongo_status,
                                summary_note = :summary_note, created_at = GETDATE()
                            WHERE scan_date = :scan_date AND restaurant_id = :restaurant_id
                        """), {
                            "scan_date": scan_date,
                            "restaurant_id": rid,
                            "sql_ip": item["sql_ip"],
                            "sql_connected": 1 if item["sql_connected"] else 0,
                            "sql_max_memory_mb": item["sql_max_memory_mb"],
                            "sql_status": item["sql_status"],
                            "mongo_ip": item["mongo_ip"],
                            "mongo_connected": 1 if item["mongo_connected"] else 0,
                            "mongo_cache_size_gb": item["mongo_cache_size_gb"],
                            "mongo_status": item["mongo_status"],
                            "summary_note": item["summary_note"]
                        })
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi lưu kết quả gỡ giới hạn batch: {e}")

        total_processed = len(results)
        sql_unlimited_cnt = sum(1 for r in results if r.get("sql_fixed"))
        mongo_unlimited_cnt = sum(1 for r in results if r.get("mongo_fixed"))

        msg = f"Đã gỡ bỏ giới hạn RAM thành công cho {total_processed} nhà hàng (SQL Server gỡ: {sql_unlimited_cnt}, MongoDB gỡ: {mongo_unlimited_cnt})."
        return {
            "scan_date": scan_date,
            "scan_time": scan_time_str,
            "total_processed": total_processed,
            "sql_unlimited_count": sql_unlimited_cnt,
            "mongo_unlimited_count": mongo_unlimited_cnt,
            "items": results,
            "message": msg
        }

    def apply_ram_limits_batch(
        self,
        scope: str = "unlimited_only",
        restaurant_ids: Optional[List[int]] = None,
        recipients: Optional[List[str]] = None,
        send_email: bool = True,
        skip_tch: Optional[bool] = None,
        exclude_keywords: Optional[List[str]] = None,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Xử lý hàng loạt giới hạn RAM SQL & MongoDB theo cấu hình linh động:
        - scope: 'unlimited_only' (chỉ các NH chưa đạt chuẩn), 'all_active' (tất cả NH đang ON), 'custom' (theo restaurant_ids)
        - recipients: danh sách email người nhận thông báo
        - send_email: có tự động gửi email sau khi xong không
        - skip_tch: có bỏ qua các nhà hàng bắt đầu bằng 'TCH' không (mặc định lấy theo config)
        - exclude_keywords: danh sách từ khóa/mã SAP cần loại trừ thêm (mặc định lấy theo config)
        - target_sql_gb: Mức RAM chuẩn của SQL Server (GB)
        - target_mongo_gb: Mức RAM chuẩn của MongoDB (GB)
        """
        scan_date = datetime.now().strftime("%Y-%m-%d")
        scan_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Đọc cấu hình chuẩn RAM và kết nối nếu không được truyền trực tiếp
        t_cfg = self.get_target_config()
        if target_sql_gb is None:
            target_sql_gb = t_cfg.get("sql_limit_gb", 2.0)
        if target_mongo_gb is None:
            target_mongo_gb = t_cfg.get("mongo_limit_gb", 6.0)
        if sql_port is None:
            sql_port = int(t_cfg.get("sql_port", 1433))
        if sql_user is None:
            sql_user = str(t_cfg.get("sql_user", "rk7")).strip()
        if sql_password is None:
            sql_password = str(t_cfg.get("sql_password", "rk7")).strip()
        if mongo_port is None:
            mongo_port = int(t_cfg.get("mongo_port", 27017))

        # Đọc cấu hình loại trừ nếu không được truyền trực tiếp
        cfg = self.get_exclude_config()
        actual_skip_tch = cfg.get("skip_tch", True) if skip_tch is None else bool(skip_tch)
        actual_exclude_kws = cfg.get("exclude_keywords", ["TCH"]) if exclude_keywords is None else exclude_keywords

        # 1. Lấy danh sách nhà hàng
        with engine.connect() as conn:
            query = text("""
                SELECT ID as id, RES as res, BRAND as brand, SAP as sap,
                       IP as ip, TRANGTHAI as trangthai, RK7 as rk7
                FROM RESTAURANT
                WHERE UPPER(LTRIM(RTRIM(ISNULL(TRANGTHAI, 'ON')))) = 'ON'
                ORDER BY ID ASC
            """)
            rows = conn.execute(query).mappings().all()
            all_active = [dict(r) for r in rows]

        if restaurant_ids:
            target_restaurants = [r for r in all_active if r["id"] in restaurant_ids]
        elif scope == "unlimited_only":
            # Lọc các nhà hàng chưa đạt chuẩn từ kết quả gần nhất (nếu có)
            latest_audit = self.get_audit_logs(scan_date)
            if latest_audit:
                unlimited_ids = {
                    item["restaurant_id"] for item in latest_audit
                    if not (item.get("sql_is_limited_2gb") and item.get("mongo_is_limited_6gb"))
                }
                target_restaurants = [r for r in all_active if r["id"] in unlimited_ids]
            else:
                target_restaurants = all_active
        else:
            target_restaurants = all_active

        # TỰ ĐỘNG LOẠI TRỪ CÁC NHÀ HÀNG CÓ CẤU HÌNH RAM RIÊNG KHI XỬ LÝ HÀNG LOẠT
        if scope != "custom":
            custom_cfgs = self.get_custom_configs()
            custom_ids = {int(k) for k in custom_cfgs.keys()}
            target_restaurants = [r for r in target_restaurants if r["id"] not in custom_ids]

        # Lọc bỏ các nhà hàng thuộc diện loại trừ nếu option bật
        if actual_skip_tch or actual_exclude_kws:
            target_restaurants = [
                r for r in target_restaurants
                if not self.is_restaurant_excluded(r, skip_tch=actual_skip_tch, exclude_keywords=actual_exclude_kws)
            ]

        total_targets = len(target_restaurants)
        if total_targets == 0:
            return {
                "scan_date": scan_date,
                "total_processed": 0,
                "message": "Không có nhà hàng nào cần xử lý giới hạn RAM (đã lọc loại trừ).",
            }

        # 2. Xử lý đa luồng 30 workers
        results: List[Dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=30) as executor:
            future_to_rest = {
                executor.submit(
                    self.apply_restaurant_ram_limits,
                    rest,
                    True,
                    True,
                    target_sql_gb,
                    target_mongo_gb,
                    sql_port,
                    sql_user,
                    sql_password,
                    mongo_port
                ): rest
                for rest in target_restaurants
            }
            for future in as_completed(future_to_rest):
                try:
                    res_data = future.result()
                    results.append(res_data)
                except Exception as e:
                    r_ref = future_to_rest[future]
                    logger.error(f"[RAM_AUDIT] Lỗi xử lý NH {r_ref.get('res')}: {e}")

        results.sort(key=lambda x: x.get("restaurant_id", 0))

        # 3. Cập nhật kết quả vào database SQL Server
        try:
            with engine.begin() as conn:
                for item in results:
                    rid = item["restaurant_id"]
                    check_sql = text("SELECT id FROM RAM_LIMIT_AUDIT_LOG WHERE scan_date = :scan_date AND restaurant_id = :rid")
                    existing = conn.execute(check_sql, {"scan_date": scan_date, "rid": rid}).first()
                    if existing:
                        conn.execute(text("""
                            UPDATE RAM_LIMIT_AUDIT_LOG
                            SET sql_ip = :sql_ip, sql_connected = :sql_connected, sql_max_memory_mb = :sql_max_memory_mb,
                                sql_is_limited_2gb = :sql_is_limited_2gb, sql_is_limited_4gb = :sql_is_limited_4gb, sql_status = :sql_status,
                                mongo_ip = :mongo_ip, mongo_connected = :mongo_connected, mongo_cache_size_gb = :mongo_cache_size_gb,
                                mongo_is_limited_6gb = :mongo_is_limited_6gb, mongo_status = :mongo_status,
                                summary_note = :summary_note, created_at = GETDATE()
                            WHERE scan_date = :scan_date AND restaurant_id = :restaurant_id
                        """), {
                            "scan_date": scan_date, "restaurant_id": rid,
                            "sql_ip": item["sql_ip"], "sql_connected": 1 if item["sql_connected"] else 0,
                            "sql_max_memory_mb": item["sql_max_memory_mb"],
                            "sql_is_limited_2gb": 1 if item.get("sql_is_limited_2gb") else 0,
                            "sql_is_limited_4gb": 1 if item.get("sql_is_limited_4gb") else 0,
                            "sql_status": item["sql_status"], "mongo_ip": item["mongo_ip"],
                            "mongo_connected": 1 if item["mongo_connected"] else 0,
                            "mongo_cache_size_gb": item["mongo_cache_size_gb"],
                            "mongo_is_limited_6gb": 1 if item["mongo_is_limited_6gb"] else 0,
                            "mongo_status": item["mongo_status"], "summary_note": item["summary_note"]
                        })
                    else:
                        conn.execute(text("""
                            INSERT INTO RAM_LIMIT_AUDIT_LOG (
                                scan_date, restaurant_id, sap_code, restaurant_name, subnet, ip_gateway,
                                sql_ip, sql_connected, sql_max_memory_mb, sql_is_limited_2gb, sql_is_limited_4gb, sql_status,
                                mongo_ip, mongo_connected, mongo_cache_size_gb, mongo_is_limited_6gb, mongo_status,
                                summary_note, created_at
                            ) VALUES (
                                :scan_date, :restaurant_id, :sap_code, :restaurant_name, :subnet, :ip_gateway,
                                :sql_ip, :sql_connected, :sql_max_memory_mb, :sql_is_limited_2gb, :sql_is_limited_4gb, :sql_status,
                                :mongo_ip, :mongo_connected, :mongo_cache_size_gb, :mongo_is_limited_6gb, :mongo_status,
                                :summary_note, GETDATE()
                            )
                        """), {
                            "scan_date": scan_date, "restaurant_id": rid,
                            "sap_code": item["sap_code"], "restaurant_name": item["restaurant_name"],
                            "subnet": item["subnet"], "ip_gateway": item["ip_gateway"],
                            "sql_ip": item["sql_ip"], "sql_connected": 1 if item["sql_connected"] else 0,
                            "sql_max_memory_mb": item["sql_max_memory_mb"],
                            "sql_is_limited_2gb": 1 if item.get("sql_is_limited_2gb") else 0,
                            "sql_is_limited_4gb": 1 if item.get("sql_is_limited_4gb") else 0,
                            "sql_status": item["sql_status"], "mongo_ip": item["mongo_ip"],
                            "mongo_connected": 1 if item["mongo_connected"] else 0,
                            "mongo_cache_size_gb": item["mongo_cache_size_gb"],
                            "mongo_is_limited_6gb": 1 if item["mongo_is_limited_6gb"] else 0,
                            "mongo_status": item["mongo_status"], "summary_note": item["summary_note"]
                        })
        except Exception as e:
            logger.error(f"[RAM_AUDIT] Lỗi cập nhật batch apply vào DB: {e}")

        # Cập nhật cache
        self._cache_latest_results = results
        self._cache_date = scan_date

        # 4. Thống kê
        sql_fixed_cnt = sum(1 for r in results if r.get("sql_fixed"))
        sql_already_ok_cnt = sum(1 for r in results if r.get("sql_is_limited_2gb") and not r.get("sql_fixed"))
        mongo_fixed_cnt = sum(1 for r in results if r.get("mongo_fixed"))
        mongo_already_ok_cnt = sum(1 for r in results if r.get("mongo_is_limited_6gb") and not r.get("mongo_fixed"))

        msg = (
            f"Xử lý hàng loạt hoàn tất {total_targets} nhà hàng lúc {scan_time_str}. "
            f"SQL .41: {sql_fixed_cnt} vừa giới hạn {target_sql_gb}GB, {sql_already_ok_cnt} đã đạt sẵn; "
            f"MongoDB: {mongo_fixed_cnt} vừa giới hạn {target_mongo_gb}GB, {mongo_already_ok_cnt} đã đạt sẵn."
        )

        # 5. Gửi email thông báo nếu có yêu cầu
        email_sent = False
        email_error = None
        if send_email:
            target_recipients = recipients or self.get_email_config()
            try:
                self.send_ram_audit_email(
                    scan_date=scan_date,
                    recipients=target_recipients,
                    items=results,
                    target_sql_gb=target_sql_gb,
                    target_mongo_gb=target_mongo_gb
                )
                email_sent = True
            except Exception as mail_err:
                email_error = str(mail_err)
                logger.error(f"[RAM_AUDIT] Lỗi gửi email báo cáo: {mail_err}")

        return {
            "scan_date": scan_date,
            "scan_time": scan_time_str,
            "target_sql_gb": target_sql_gb,
            "target_mongo_gb": target_mongo_gb,
            "total_processed": total_targets,
            "sql_fixed": sql_fixed_cnt,
            "sql_already_ok": sql_already_ok_cnt,
            "mongo_fixed": mongo_fixed_cnt,
            "mongo_already_ok": mongo_already_ok_cnt,
            "email_sent": email_sent,
            "email_error": email_error,
            "recipients": recipients or self.get_email_config(),
            "message": msg,
            "items": results
        }

    def scan_and_log_ram_limits(
        self,
        skip_tch: Optional[bool] = None,
        exclude_keywords: Optional[List[str]] = None,
        skip_network_if_excluded: bool = True,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None,
        sql_port: Optional[int] = None,
        sql_user: Optional[str] = None,
        sql_password: Optional[str] = None,
        mongo_port: Optional[int] = None
    ) -> Dict[str, Any]:
        """Quét toàn bộ nhà hàng đang hoạt động (ON) và lưu vào bảng RAM_LIMIT_AUDIT_LOG"""
        scan_date = datetime.now().strftime("%Y-%m-%d")
        scan_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Đọc cấu hình chuẩn RAM và kết nối nếu chưa truyền
        t_cfg = self.get_target_config()
        if target_sql_gb is None:
            target_sql_gb = t_cfg.get("sql_limit_gb", 2.0)
        if target_mongo_gb is None:
            target_mongo_gb = t_cfg.get("mongo_limit_gb", 6.0)
        if sql_port is None:
            sql_port = int(t_cfg.get("sql_port", 1433))
        if sql_user is None:
            sql_user = str(t_cfg.get("sql_user", "rk7")).strip()
        if sql_password is None:
            sql_password = str(t_cfg.get("sql_password", "rk7")).strip()
        if mongo_port is None:
            mongo_port = int(t_cfg.get("mongo_port", 27017))

        cfg = self.get_exclude_config()
        actual_skip_tch = cfg.get("skip_tch", True) if skip_tch is None else bool(skip_tch)
        actual_exclude_kws = cfg.get("exclude_keywords", ["TCH"]) if exclude_keywords is None else exclude_keywords

        restaurants = []
        with engine.connect() as conn:
            query = text("""
                SELECT ID as id, RES as res, BRAND as brand, SAP as sap,
                       IP as ip, TRANGTHAI as trangthai, RK7 as rk7
                FROM RESTAURANT
                WHERE UPPER(LTRIM(RTRIM(ISNULL(TRANGTHAI, 'ON')))) = 'ON'
                ORDER BY ID ASC
            """)
            rows = conn.execute(query).mappings().all()
            restaurants = [dict(r) for r in rows]

        total_rests = len(restaurants)
        if total_rests == 0:
            return {
                "scan_date": scan_date,
                "total_scanned": 0,
                "items": [],
                "message": "Không tìm thấy nhà hàng nào đang hoạt động (ON)."
            }

        results: List[Dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=50) as executor:
            future_to_rest = {
                executor.submit(
                    self.check_restaurant_ram_limits,
                    rest,
                    skip_network_if_excluded,
                    actual_skip_tch,
                    actual_exclude_kws,
                    target_sql_gb,
                    target_mongo_gb,
                    sql_port,
                    sql_user,
                    sql_password,
                    mongo_port
                ): rest
                for rest in restaurants
            }
            for future in as_completed(future_to_rest):
                try:
                    data = future.result()
                    results.append(data)
                except Exception as e:
                    rest_ref = future_to_rest[future]
                    logger.error(f"[RAM_LIMIT_AUDIT] Lỗi kiểm tra nhà hàng {rest_ref.get('res')}: {e}")

        results.sort(key=lambda x: x.get("restaurant_id", 0))

        try:
            with engine.begin() as conn:
                conn.execute(
                    text("DELETE FROM RAM_LIMIT_AUDIT_LOG WHERE scan_date = :scan_date"),
                    {"scan_date": scan_date}
                )

                insert_stmt = text("""
                    INSERT INTO RAM_LIMIT_AUDIT_LOG (
                        scan_date, restaurant_id, sap_code, restaurant_name, subnet, ip_gateway,
                        sql_ip, sql_connected, sql_max_memory_mb, sql_is_limited_2gb, sql_is_limited_4gb, sql_status,
                        mongo_ip, mongo_connected, mongo_cache_size_gb, mongo_is_limited_6gb, mongo_status,
                        summary_note, created_at
                    ) VALUES (
                        :scan_date, :restaurant_id, :sap_code, :restaurant_name, :subnet, :ip_gateway,
                        :sql_ip, :sql_connected, :sql_max_memory_mb, :sql_is_limited_2gb, :sql_is_limited_4gb, :sql_status,
                        :mongo_ip, :mongo_connected, :mongo_cache_size_gb, :mongo_is_limited_6gb, :mongo_status,
                        :summary_note, GETDATE()
                    )
                """)
                for item in results:
                    conn.execute(insert_stmt, {
                        "scan_date": scan_date,
                        "restaurant_id": item["restaurant_id"],
                        "sap_code": item["sap_code"],
                        "restaurant_name": item["restaurant_name"],
                        "subnet": item["subnet"],
                        "ip_gateway": item["ip_gateway"],
                        "sql_ip": item["sql_ip"],
                        "sql_connected": 1 if item["sql_connected"] else 0,
                        "sql_max_memory_mb": item["sql_max_memory_mb"],
                        "sql_is_limited_2gb": 1 if item.get("sql_is_limited_2gb") else 0,
                        "sql_is_limited_4gb": 1 if item.get("sql_is_limited_4gb") else 0,
                        "sql_status": item["sql_status"],
                        "mongo_ip": item["mongo_ip"],
                        "mongo_connected": 1 if item["mongo_connected"] else 0,
                        "mongo_cache_size_gb": item["mongo_cache_size_gb"],
                        "mongo_is_limited_6gb": 1 if item["mongo_is_limited_6gb"] else 0,
                        "mongo_status": item["mongo_status"],
                        "summary_note": item["summary_note"]
                    })
        except Exception as dbe:
            logger.error(f"[RAM_LIMIT_AUDIT] Lỗi khi lưu kết quả vào SQL Server: {dbe}")

        self._cache_latest_results = results
        self._cache_date = scan_date

        sql_limited_cnt = sum(1 for r in results if r.get("sql_is_limited_2gb"))
        sql_unlimited_cnt = sum(1 for r in results if r.get("sql_connected") and not r.get("sql_is_limited_2gb"))
        sql_offline_cnt = sum(1 for r in results if not r.get("sql_connected"))

        mongo_limited_cnt = sum(1 for r in results if r.get("mongo_is_limited_6gb"))
        mongo_unlimited_cnt = sum(1 for r in results if r.get("mongo_connected") and not r.get("mongo_is_limited_6gb"))
        mongo_closed_cnt = sum(1 for r in results if not r.get("mongo_connected"))

        msg = (
            f"Quét hoàn tất {total_rests} nhà hàng lúc {scan_time_str}. "
            f"SQL .41: {sql_limited_cnt} đã giới hạn {target_sql_gb}GB, {sql_unlimited_cnt} chưa giới hạn, {sql_offline_cnt} không kết nối; "
            f"MongoDB: {mongo_limited_cnt} đã giới hạn {target_mongo_gb}GB, {mongo_unlimited_cnt} chưa giới hạn, {mongo_closed_cnt} chưa mở port IP."
        )

        return {
            "scan_date": scan_date,
            "scan_time": scan_time_str,
            "target_sql_gb": target_sql_gb,
            "target_mongo_gb": target_mongo_gb,
            "total_scanned": total_rests,
            "sql_limited": sql_limited_cnt,
            "sql_unlimited": sql_unlimited_cnt,
            "sql_offline": sql_offline_cnt,
            "mongo_limited": mongo_limited_cnt,
            "mongo_unlimited": mongo_unlimited_cnt,
            "mongo_closed_port": mongo_closed_cnt,
            "items": results,
            "message": msg
        }

    def get_scan_dates(self) -> List[str]:
        try:
            with engine.connect() as conn:
                rows = conn.execute(text("SELECT DISTINCT scan_date FROM RAM_LIMIT_AUDIT_LOG ORDER BY scan_date DESC")).all()
                return [str(r[0]) for r in rows if r[0]]
        except Exception:
            return [self._cache_date] if self._cache_date else []

    def get_audit_logs(self, scan_date: Optional[str] = None) -> List[Dict[str, Any]]:
        target_date = scan_date or self._cache_date
        if not target_date:
            dates = self.get_scan_dates()
            target_date = dates[0] if dates else datetime.now().strftime("%Y-%m-%d")

        try:
            with engine.connect() as conn:
                query = text("""
                    SELECT id, scan_date, restaurant_id, sap_code, restaurant_name, subnet, ip_gateway,
                           sql_ip, sql_connected, sql_max_memory_mb, sql_is_limited_2gb, sql_is_limited_4gb, sql_status,
                           mongo_ip, mongo_connected, mongo_cache_size_gb, mongo_is_limited_6gb, mongo_status,
                           summary_note, created_at
                    FROM RAM_LIMIT_AUDIT_LOG
                    WHERE scan_date = :scan_date
                    ORDER BY restaurant_id ASC
                """)
                rows = conn.execute(query, {"scan_date": target_date}).mappings().all()
                if rows:
                    cfg = self.get_exclude_config()
                    skip_tch_cfg = cfg.get("skip_tch", True)
                    exclude_kws_cfg = cfg.get("exclude_keywords", ["TCH"])
                    target_cfg = self.get_target_config()
                    tgt_sql_gb = target_cfg.get("sql_limit_gb", 2.0)
                    tgt_mongo_gb = target_cfg.get("mongo_limit_gb", 6.0)
                    tgt_sql_mb = int(tgt_sql_gb * 1024)

                    custom_cfgs = self.get_custom_configs()
                    items = []
                    for r in rows:
                        it = dict(r)
                        rid_str = str(it.get("restaurant_id"))
                        custom_c = custom_cfgs.get(rid_str)
                        if custom_c:
                            it["has_custom_ram"] = True
                            it["custom_sql_gb"] = custom_c.get("sql_limit_gb")
                            it["custom_mongo_gb"] = custom_c.get("mongo_limit_gb")
                            active_sql_gb = custom_c.get("sql_limit_gb", tgt_sql_gb)
                            active_mongo_gb = custom_c.get("mongo_limit_gb", tgt_mongo_gb)
                        else:
                            it["has_custom_ram"] = False
                            it["custom_sql_gb"] = None
                            it["custom_mongo_gb"] = None
                            active_sql_gb = tgt_sql_gb
                            active_mongo_gb = tgt_mongo_gb

                        active_sql_mb = int(active_sql_gb * 1024)
                        it["sql_connected"] = bool(it.get("sql_connected"))
                        it["target_sql_gb"] = active_sql_gb
                        it["target_mongo_gb"] = active_mongo_gb
                        
                        max_mb = it.get("sql_max_memory_mb")
                        if max_mb is not None:
                            it["sql_is_limited_2gb"] = (max_mb <= active_sql_mb)
                        elif it.get("sql_is_limited_2gb") is not None:
                            it["sql_is_limited_2gb"] = bool(it.get("sql_is_limited_2gb"))
                        else:
                            it["sql_is_limited_2gb"] = bool(it.get("sql_is_limited_4gb"))

                        it["sql_is_limited_4gb"] = bool(it.get("sql_is_limited_4gb"))
                        it["mongo_connected"] = bool(it.get("mongo_connected"))
                        
                        mongo_cache = it.get("mongo_cache_size_gb")
                        if mongo_cache is not None and it["mongo_connected"]:
                            it["mongo_is_limited_6gb"] = (mongo_cache <= active_mongo_gb or abs(mongo_cache - active_mongo_gb) <= 0.25)
                        else:
                            it["mongo_is_limited_6gb"] = bool(it.get("mongo_is_limited_6gb"))

                        if it.get("created_at"):
                            it["created_at"] = str(it["created_at"])
                        it["is_excluded"] = self.is_restaurant_excluded(
                            {"id": it.get("restaurant_id"), "sap": it.get("sap_code"), "res": it.get("restaurant_name")},
                            skip_tch=skip_tch_cfg,
                            exclude_keywords=exclude_kws_cfg
                        )
                        items.append(it)
                    return items
        except Exception as e:
            logger.error(f"[RAM_LIMIT_AUDIT] Lỗi khi đọc logs: {e}")

        if self._cache_latest_results:
            return self._cache_latest_results
        return []

    def send_ram_audit_email(
        self,
        scan_date: Optional[str] = None,
        recipients: Optional[List[str]] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        target_sql_gb: Optional[float] = None,
        target_mongo_gb: Optional[float] = None
    ) -> Dict[str, Any]:
        """Gửi email báo cáo kết quả kiểm tra / xử lý giới hạn RAM SQL & Mongo theo cấu hình linh động."""
        target_date = scan_date or datetime.now().strftime("%Y-%m-%d")
        target_recipients = recipients or self.get_email_config()
        if not target_recipients:
            target_recipients = [self.DEFAULT_RECIPIENT]

        # Đọc cấu hình chuẩn RAM nếu chưa truyền
        if target_sql_gb is None or target_mongo_gb is None:
            t_cfg = self.get_target_config()
            target_sql_gb = target_sql_gb or t_cfg.get("sql_limit_gb", 2.0)
            target_mongo_gb = target_mongo_gb or t_cfg.get("mongo_limit_gb", 6.0)

        audit_items = items if items is not None else self.get_audit_logs(target_date)

        total = len(audit_items)
        sql_ok = sum(1 for i in audit_items if i.get("sql_is_limited_2gb"))
        mongo_ok = sum(1 for i in audit_items if i.get("mongo_is_limited_6gb"))
        both_ok = sum(1 for i in audit_items if i.get("sql_is_limited_2gb") and i.get("mongo_is_limited_6gb"))
        unlimited_cnt = total - both_ok

        table_rows = ""
        for idx, it in enumerate(audit_items, 1):
            rest_name = f"{it.get('sap_code') + ' - ' if it.get('sap_code') else ''}{it.get('restaurant_name', '')}"
            subnet = it.get('subnet') or it.get('ip_gateway') or ''
            
            # SQL badge & status
            sql_is_ok = it.get("sql_is_limited_2gb")
            sql_conn = it.get("sql_connected")
            if sql_is_ok:
                sql_badge = f'<span style="background-color:#DEF7EC;color:#03543F;border:1px solid #31C48D;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">ĐẠT (&le;{target_sql_gb}GB)</span>'
            elif sql_conn:
                sql_badge = '<span style="background-color:#FDE8E8;color:#9B1C1C;border:1px solid #F98080;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">CHƯA ĐẠT</span>'
            else:
                sql_badge = '<span style="background-color:#F3F4F6;color:#4B5563;border:1px solid #D1D5DB;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">MẤT KẾT NỐI</span>'

            # Mongo badge & status
            mongo_is_ok = it.get("mongo_is_limited_6gb")
            mongo_conn = it.get("mongo_connected")
            if mongo_is_ok:
                mongo_badge = f'<span style="background-color:#DEF7EC;color:#03543F;border:1px solid #31C48D;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">ĐẠT ({target_mongo_gb}GB)</span>'
            elif mongo_conn:
                mongo_badge = '<span style="background-color:#FEF08A;color:#854D0E;border:1px solid #FACC15;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">CHƯA ĐẠT</span>'
            else:
                mongo_badge = '<span style="background-color:#F3F4F6;color:#6B7280;border:1px solid #D1D5DB;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px;">CHƯA MỞ PORT</span>'

            bg_row = "#FFFFFF" if idx % 2 != 0 else "#F9FAFB"
            table_rows += f"""
            <tr style="background-color: {bg_row};">
                <td style="border: 1px solid #BFBFBF; padding: 8px 10px; text-align: center; color: #6B7280; font-size: 12px;">{idx}</td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 12px;">
                    <div style="font-weight: bold; color: #111827;">{rest_name}</div>
                    <div style="color: #6B7280; font-size: 11px; font-family: monospace;">Subnet: {subnet}</div>
                </td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 12px;">
                    <div style="margin-bottom: 4px;">{sql_badge}</div>
                    <div style="color: #374151; font-size: 11px; line-height: 1.3;">{it.get('sql_status', '')}</div>
                </td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 12px;">
                    <div style="margin-bottom: 4px;">{mongo_badge}</div>
                    <div style="color: #374151; font-size: 11px; line-height: 1.3;">{it.get('mongo_status', '')}</div>
                </td>
                <td style="border: 1px solid #BFBFBF; padding: 8px 12px; font-size: 12px; color: {'#059669' if sql_is_ok and mongo_is_ok else '#D97706'}; font-weight: 500;">
                    {it.get('summary_note', '—')}
                </td>
            </tr>
            """

        html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    body {{ font-family: 'Segoe UI', Calibri, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f6f8; color: #111827; }}
    .container {{ max-width: 1050px; margin: 0 auto; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.06); }}
    .header {{ background-color: #111827; color: #ffffff; padding: 18px 24px; border-bottom: 3px solid #F5B800; }}
    .header h2 {{ margin: 0 0 6px 0; font-size: 17px; color: #F5B800; text-transform: uppercase; letter-spacing: 0.5px; }}
    .header p {{ margin: 0; font-size: 13px; color: #d1d5db; }}
    .kpi-bar {{ background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0; padding: 12px 24px; font-size: 13px; display: flex; flex-wrap: wrap; gap: 15px; }}
    .kpi-badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
    .content {{ padding: 20px 24px; }}
    .data-table {{ width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }}
    .data-table th {{ background-color: #D9E1F2; color: #000000; font-weight: bold; border: 1px solid #BFBFBF; padding: 10px 12px; text-align: center; font-size: 12px; }}
    .footer {{ background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 14px 24px; font-size: 12px; color: #64748B; text-align: center; line-height: 1.6; }}
</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>⭐ BÁO CÁO KẾT QUẢ XỬ LÝ & KIỂM TRA GIỚI HẠN RAM (SQL {target_sql_gb}GB & MONGO {target_mongo_gb}GB)</h2>
            <p>Hệ Thống Quản Trị & Vận Hành ITSS - Golden Gate | Ngày thực hiện: <b>{target_date}</b></p>
        </div>
        <div class="kpi-bar">
            <span class="kpi-badge" style="background-color:#EBF5FF;color:#1E429F;border:1px solid #A4CAFE;">Tổng Nhà Hàng: {total}</span>
            <span class="kpi-badge" style="background-color:#DEF7EC;color:#03543F;border:1px solid #31C48D;">🟢 Đạt chuẩn cả 2: {both_ok}</span>
            <span class="kpi-badge" style="background-color:#FEF3C7;color:#92400E;border:1px solid #FCD34D;">⚡ SQL Server đạt {target_sql_gb}GB: {sql_ok}</span>
            <span class="kpi-badge" style="background-color:#FEF3C7;color:#92400E;border:1px solid #FCD34D;">⚡ MongoDB đạt {target_mongo_gb}GB: {mongo_ok}</span>
            <span class="kpi-badge" style="background-color:#FDE8E8;color:#9B1C1C;border:1px solid #F98080;">⚠️ Cần lưu ý: {unlimited_cnt}</span>
        </div>
        <div class="content">
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 4%;">STT</th>
                        <th style="width: 28%; text-align: left;">Nhà Hàng</th>
                        <th style="width: 25%; text-align: left;">SQL Server (.41 - {target_sql_gb}GB)</th>
                        <th style="width: 25%; text-align: left;">MongoDB (.41/.11/.12 - {target_mongo_gb}GB)</th>
                        <th style="width: 18%; text-align: left;">Đánh Giá Tổng Hợp</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
        </div>
        <div class="footer">
            Email được gửi tự động từ <b>Hệ Thống Tiện Ích ITSS</b> - Golden Gate Restaurant Group.<br/>
            Người nhận báo cáo: <b>{', '.join(target_recipients)}</b>
        </div>
    </div>
</body>
</html>"""

        msg = EmailMessage()
        msg["Subject"] = f"[RAM AUDIT] Báo cáo xử lý giới hạn RAM SQL ({target_sql_gb}GB) & Mongo ({target_mongo_gb}GB) - {target_date}"
        msg["From"] = f"Hệ Thống Quản Trị ITSS <{self.SMTP_USER}>"
        msg["To"] = ", ".join(target_recipients)
        msg.set_content(f"Báo cáo kết quả xử lý RAM SQL ({target_sql_gb}GB) và MongoDB ({target_mongo_gb}GB) ngày {target_date}. Tổng số {total} nhà hàng.")
        msg.add_alternative(html_content, subtype="html")

        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        context.maximum_version = ssl.TLSVersion.TLSv1_2

        with smtplib.SMTP(self.SMTP_HOST, self.SMTP_PORT, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(self.SMTP_USER, self.SMTP_PASSWORD)
            server.send_message(msg)

        logger.info(f"[RAM_AUDIT] Đã gửi email báo cáo tới {', '.join(target_recipients)}")
        return {
            "status": "success",
            "recipients": target_recipients,
            "message": f"Đã gửi email báo cáo thành công tới {', '.join(target_recipients)}!"
        }

ram_limit_audit_service = RamLimitAuditService()
