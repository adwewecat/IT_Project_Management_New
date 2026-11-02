import re
import os
import io
import time
import json
import ftplib
import logging
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Tuple
from urllib.parse import urlparse

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from pymongo import MongoClient

# Hỗ trợ Lazy Import paramiko để tránh lỗi khởi động nếu server chưa cài đặt thư viện
_paramiko_module = None


def _get_paramiko():
    global _paramiko_module
    if _paramiko_module is not None:
        return _paramiko_module
    try:
        import paramiko
        _paramiko_module = paramiko
        return _paramiko_module
    except ImportError:
        pass

    # Thử tự động cài đặt qua pip cho môi trường máy chủ
    try:
        import subprocess
        import sys
        logger.info("Chưa tìm thấy paramiko, đang tự động cài đặt: pip install paramiko...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko"], timeout=60)
        import paramiko
        _paramiko_module = paramiko
        logger.info("Cài đặt paramiko thành công!")
        return _paramiko_module
    except Exception as ex:
        logger.warning(f"Không thể tự động cài paramiko: {ex}")
        return None

logger = logging.getLogger(__name__)

# File cấu hình máy chủ hình ảnh lưu trong thư mục data/
CONFIG_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "image_server_config.json"
)

# Cấu hình mặc định máy chủ hình ảnh GPOS (Read-Only)
DEFAULT_CONFIG: Dict[str, Any] = {
    "server_type": "SSH_SFTP",  # "SSH_SFTP" (Port 22) hoặc "FTP" (Port 21)
    "host": "192.168.201.116",
    "port": 22,
    "username": "dung.na",
    "password": "bp7em2zmQP",
    "remote_dir": "/opt/gpos/gmonitor/resources/menu",
    "standard_prefix": "/resources/menu/"
}

# Cache danh sách file trên server để tối ưu tốc độ, tránh gọi kết nối lặp lại
_cache_lock = threading.Lock()
_cached_exact_files: Optional[Set[str]] = None
_cached_lower_map: Optional[Dict[str, str]] = None
_cache_timestamp: float = 0.0
CACHE_TTL_SECONDS = 300.0  # 5 phút cache


def get_mongo_client(host: str, port: int = 27017, timeout_ms: int = 3500) -> MongoClient:
    """Khởi tạo MongoClient với timeout ngắn để tránh treo ứng dụng"""
    return MongoClient(
        host=host,
        port=port,
        serverSelectionTimeoutMS=timeout_ms,
        connectTimeoutMS=timeout_ms,
        socketTimeoutMS=timeout_ms,
    )


def clear_cache() -> None:
    """Xóa cache danh sách file để tải mới ở lần gọi tiếp theo"""
    global _cached_exact_files, _cached_lower_map, _cache_timestamp
    with _cache_lock:
        _cached_exact_files = None
        _cached_lower_map = None
        _cache_timestamp = 0.0
    logger.info("Đã xóa cache danh sách file của máy chủ hình ảnh.")


def load_config() -> Dict[str, Any]:
    """
    Đọc cấu hình máy chủ hình ảnh từ file JSON.
    Nếu chưa có, tự động tạo mới với cấu hình mặc định (192.168.201.116:22).
    """
    try:
        if os.path.exists(CONFIG_FILE_PATH):
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                merged = {**DEFAULT_CONFIG, **data}
                return merged
    except Exception as e:
        logger.error(f"Lỗi đọc file cấu hình máy chủ hình ảnh ({CONFIG_FILE_PATH}): {e}")

    return dict(DEFAULT_CONFIG)


def save_config(new_config: Dict[str, Any], updated_by: str = "") -> Dict[str, Any]:
    """
    Lưu cấu hình máy chủ hình ảnh (chỉ Super Admin hoặc dung.nguyenanh mới được gọi).
    Nếu mật khẩu để trống hoặc chứa ký tự che dấu ('🔒', '•'), giữ nguyên mật khẩu cũ.
    """
    current = load_config()
    
    server_type = (new_config.get("server_type") or current.get("server_type", "SSH_SFTP")).strip()
    host = (new_config.get("host") or current.get("host", "192.168.201.116")).strip()
    try:
        port = int(new_config.get("port") or current.get("port", 22))
    except (ValueError, TypeError):
        port = 22

    username = (new_config.get("username") or current.get("username", "dung.na")).strip()
    
    # Kiểm tra mật khẩu mới
    input_pass = new_config.get("password")
    if input_pass and not input_pass.startswith("🔒") and "•" not in input_pass:
        password = input_pass.strip()
    else:
        password = current.get("password", "bp7em2zmQP")

    remote_dir = (new_config.get("remote_dir") or current.get("remote_dir", "/opt/gpos/gmonitor/resources/menu")).strip()
    standard_prefix = (new_config.get("standard_prefix") or current.get("standard_prefix", "/resources/menu/")).strip()
    if not standard_prefix.endswith("/"):
        standard_prefix += "/"

    saved_data = {
        "server_type": server_type,
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "remote_dir": remote_dir,
        "standard_prefix": standard_prefix,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "updated_by": updated_by or "system"
    }

    try:
        os.makedirs(os.path.dirname(CONFIG_FILE_PATH), exist_ok=True)
        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(saved_data, f, ensure_ascii=False, indent=2)
        logger.info(f"Đã lưu cấu hình máy chủ hình ảnh bởi {updated_by}")
        # Xóa cache để áp dụng ngay máy chủ mới
        clear_cache()
    except Exception as e:
        logger.error(f"Lỗi ghi cấu hình máy chủ hình ảnh: {e}")
        raise RuntimeError(f"Không thể lưu cấu hình máy chủ: {e}")

    return saved_data


def test_connection(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Kiểm tra kết nối và liệt kê thử thư mục trên máy chủ (SFTP/SSH hoặc FTP).
    Tuyệt đối chỉ đọc (Read-Only), không can thiệp hay sửa đổi bất kỳ file nào trên server.
    """
    cfg = dict(DEFAULT_CONFIG)
    if config:
        cfg.update(config)
    else:
        cfg = load_config()

    server_type = cfg.get("server_type", "SSH_SFTP")
    host = cfg.get("host", "192.168.201.116")
    port = int(cfg.get("port", 22))
    username = cfg.get("username", "dung.na")
    password = cfg.get("password", "bp7em2zmQP")
    remote_dir = cfg.get("remote_dir", "/opt/gpos/gmonitor/resources/menu")

    start_time = time.time()

    if server_type == "FTP":
        # Kết nối qua giao thức FTP
        ftp = None
        try:
            ftp = ftplib.FTP()
            ftp.connect(host=host, port=port, timeout=8)
            ftp.login(user=username, passwd=password)
            if remote_dir:
                ftp.cwd(remote_dir)
            files = [f for f in ftp.nlst() if f and f not in (".", "..")]
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            return {
                "success": True,
                "total_files": len(files),
                "latency_ms": elapsed_ms,
                "message": f"Kết nối FTP thành công tới {host}:{port}. Tìm thấy {len(files)} file trong thư mục '{remote_dir}'."
            }
        except Exception as e:
            return {
                "success": False,
                "total_files": 0,
                "latency_ms": None,
                "message": f"Lỗi kết nối FTP tới {host}:{port}: {str(e)}"
            }
        finally:
            if ftp:
                try:
                    ftp.quit()
                except Exception:
                    pass
    else:
        # Mặc định kết nối qua SSH / SFTP (Port 22)
        pm = _get_paramiko()
        if pm is None:
            return {
                "success": False,
                "total_files": 0,
                "latency_ms": None,
                "message": (
                    "Môi trường Python trên máy chủ chưa cài đặt thư viện 'paramiko'. "
                    "Vui lòng chạy lệnh: pip install paramiko trên CMD máy chủ (hoặc chuyển Server Type sang FTP port 21)."
                )
            }
        ssh = pm.SSHClient()
        ssh.set_missing_host_key_policy(pm.AutoAddPolicy())
        try:
            ssh.connect(
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=8
            )
            stdin, stdout, stderr = ssh.exec_command(f"ls -1 {remote_dir}", timeout=10)
            raw_output = stdout.read().decode("utf-8", errors="replace")
            err_output = stderr.read().decode("utf-8", errors="replace").strip()
            
            if err_output and not raw_output:
                return {
                    "success": False,
                    "total_files": 0,
                    "latency_ms": None,
                    "message": f"Không thể truy cập thư mục '{remote_dir}': {err_output}"
                }

            files = [line.strip() for line in raw_output.split("\n") if line.strip() and line.strip() not in (".", "..")]
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            return {
                "success": True,
                "total_files": len(files),
                "latency_ms": elapsed_ms,
                "message": f"Kết nối SSH/SFTP thành công tới {host}:{port}. Tìm thấy {len(files)} file trong thư mục '{remote_dir}'."
            }
        except Exception as e:
            return {
                "success": False,
                "total_files": 0,
                "latency_ms": None,
                "message": f"Lỗi kết nối SSH tới {host}:{port}: {str(e)}"
            }
        finally:
            try:
                ssh.close()
            except Exception:
                pass


def get_server_file_list(force_refresh: bool = False) -> Tuple[Set[str], Dict[str, str]]:
    """
    Kết nối máy chủ ảnh (theo cấu hình đã lưu) và lấy toàn bộ danh sách file trong thư mục hình ảnh.
    Lưu cache trong bộ nhớ RAM 5 phút để các lần check tiếp theo phản hồi tức thì (<1ms).
    Tuyệt đối chỉ đọc (Read-Only), không thực hiện bất kỳ lệnh ghi/sửa nào trên máy chủ.
    """
    global _cached_exact_files, _cached_lower_map, _cache_timestamp

    now = time.time()
    with _cache_lock:
        if (
            not force_refresh
            and _cached_exact_files is not None
            and _cached_lower_map is not None
            and (now - _cache_timestamp) < CACHE_TTL_SECONDS
        ):
            return _cached_exact_files, _cached_lower_map

    cfg = load_config()
    server_type = cfg.get("server_type", "SSH_SFTP")
    host = cfg.get("host", "192.168.201.116")
    port = int(cfg.get("port", 22))
    username = cfg.get("username", "dung.na")
    password = cfg.get("password", "bp7em2zmQP")
    remote_dir = cfg.get("remote_dir", "/opt/gpos/gmonitor/resources/menu")

    lines: List[str] = []

    if server_type == "FTP":
        # Kết nối FTP
        ftp = None
        try:
            ftp = ftplib.FTP()
            ftp.connect(host=host, port=port, timeout=8)
            ftp.login(user=username, passwd=password)
            if remote_dir:
                ftp.cwd(remote_dir)
            lines = [f for f in ftp.nlst() if f and f not in (".", "..")]
        except Exception as e:
            logger.error(f"Lỗi kết nối FTP tới {host}:{port}: {e}")
            with _cache_lock:
                if _cached_exact_files is not None and _cached_lower_map is not None:
                    return _cached_exact_files, _cached_lower_map
            raise RuntimeError(f"Không thể kết nối máy chủ hình ảnh FTP {host}:{port}: {e}")
        finally:
            if ftp:
                try:
                    ftp.quit()
                except Exception:
                    pass
    else:
        # Kết nối SSH/SFTP
        pm = _get_paramiko()
        if pm is None:
            raise RuntimeError(
                "Môi trường Python trên máy chủ chưa cài đặt thư viện 'paramiko'. "
                "Vui lòng chạy lệnh trên CMD máy chủ: pip install paramiko (hoặc chuyển Server Type sang FTP port 21)."
            )
        ssh = pm.SSHClient()
        ssh.set_missing_host_key_policy(pm.AutoAddPolicy())
        try:
            ssh.connect(
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=8
            )
            stdin, stdout, stderr = ssh.exec_command(f"ls -1 {remote_dir}", timeout=10)
            raw_output = stdout.read().decode("utf-8", errors="replace")
            lines = [line.strip() for line in raw_output.split("\n") if line.strip()]
        except Exception as e:
            logger.error(f"Lỗi kết nối SSH tới {host}:{port}: {e}")
            # Nếu đã có cache cũ thì tạm dùng cache cũ
            with _cache_lock:
                if _cached_exact_files is not None and _cached_lower_map is not None:
                    return _cached_exact_files, _cached_lower_map
            raise RuntimeError(f"Không thể kết nối máy chủ hình ảnh {host}:{port}: {e}")
        finally:
            try:
                ssh.close()
            except Exception:
                pass

    exact_set: Set[str] = set()
    lower_map: Dict[str, str] = {}

    for filename in lines:
        if not filename or filename in (".", ".."):
            continue
        exact_set.add(filename)
        # Giữ tên file xuất hiện đầu tiên nếu trùng chữ hoa thường
        if filename.lower() not in lower_map:
            lower_map[filename.lower()] = filename

    with _cache_lock:
        _cached_exact_files = exact_set
        _cached_lower_map = lower_map
        _cache_timestamp = time.time()

    logger.info(f"Đã tải {len(exact_set)} file ảnh từ máy chủ {host}:{remote_dir}")
    return exact_set, lower_map


def extract_filename_and_prefix(raw_path: str) -> Tuple[str, str]:
    """
    Tách đường dẫn hình ảnh thành:
    - filename: tên file có đuôi (vd: GG_nigiri_tom_phomai_gg.jpg)
    - prefix: tiền tố thư mục (vd: /resources/menu/ hoặc /menu/)
    """
    if not raw_path:
        return "", ""

    clean = raw_path.strip()

    # Nếu là URL HTTP/HTTPS (vd: https://gposgateway-hcm.ggg.com.vn:8443/resources/menu/foo.jpg)
    if clean.startswith("http://") or clean.startswith("https://"):
        parsed = urlparse(clean)
        path = parsed.path
    else:
        path = clean

    # Chuẩn hóa dấu phân cách
    path = path.replace("\\", "/")

    # Tách thư mục và tên file
    if "/" in path:
        idx = path.rfind("/")
        prefix = path[:idx + 1]
        filename = path[idx + 1:]
    else:
        prefix = ""
        filename = path

    return filename.strip(), prefix.strip()


def compare_single_image(
    raw_path: str,
    dish_name: str = "",
    rk7_code: str = "",
    sap_code: str = "",
    exact_set: Optional[Set[str]] = None,
    lower_map: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    So sánh đường dẫn và tên hình ảnh của một món với danh sách file thực tế trên server:
    1. Kiểm tra tiền tố có đúng là standard_prefix (mặc định /resources/menu/) hay không.
    2. Kiểm tra tên hình (có phân biệt hoa/thường) có tồn tại trên máy chủ hay không.
    3. Nếu lệch chữ hoa/thường hoặc sai tiền tố, gợi ý đường dẫn chuẩn để đồng nhất.
    """
    cfg = load_config()
    standard_prefix = cfg.get("standard_prefix", "/resources/menu/")

    if exact_set is None or lower_map is None:
        exact_set, lower_map = get_server_file_list()

    filename, prefix = extract_filename_and_prefix(raw_path)

    if not filename:
        return {
            "status": "NO_IMAGE",
            "is_match": False,
            "is_fixable": False,
            "message": "Chưa có cấu hình hình ảnh trên hệ thống",
            "given_path": raw_path or "",
            "given_filename": "",
            "given_prefix": "",
            "server_filename": "",
            "suggested_fix_path": ""
        }

    # 1. Khớp chính xác 100% tên file trên máy chủ (cả chữ hoa/thường)
    # Quy tắc: Không cần kiểm tra tiền tố /menu/ hay /resources/menu/, chỉ cần đúng tên hình là Khớp 100%!
    if filename in exact_set:
        return {
            "status": "MATCH",
            "is_match": True,
            "is_fixable": False,
            "message": f"Tên hình khớp 100% trên máy chủ ({filename})",
            "given_path": raw_path,
            "given_filename": filename,
            "given_prefix": prefix,
            "server_filename": filename,
            "suggested_fix_path": raw_path
        }

    # 2. Lệch chữ hoa / thường: Giữ nguyên tiền tố của nhà hàng (vd: /menu/), chỉ đổi tên file sang đúng server (vd: /menu/Mona.jpg)
    filename_lower = filename.lower()
    if filename_lower in lower_map:
        server_exact_name = lower_map[filename_lower]
        suggested_path = f"{prefix}{server_exact_name}" if prefix else server_exact_name
        return {
            "status": "CASE_MISMATCH",
            "is_match": False,
            "is_fixable": True,
            "message": f"Lệch chữ hoa/thường (File DB: '{filename}', Server thực tế: '{server_exact_name}')",
            "given_path": raw_path,
            "given_filename": filename,
            "given_prefix": prefix,
            "server_filename": server_exact_name,
            "suggested_fix_path": suggested_path
        }

    # 3. Không tìm thấy đúng tên file, thử tìm ứng viên theo mã RK7 / SAP nếu có
    candidate_found = ""
    clean_rk7 = str(rk7_code or "").strip()
    clean_sap = str(sap_code or "").strip()

    if clean_rk7 and len(clean_rk7) >= 3:
        for f in exact_set:
            if clean_rk7 in f:
                candidate_found = f
                break

    if not candidate_found and clean_sap and len(clean_sap) >= 4:
        for f in exact_set:
            if clean_sap in f:
                candidate_found = f
                break

    if candidate_found:
        suggested_path = f"{prefix}{candidate_found}" if prefix else candidate_found
        return {
            "status": "CANDIDATE_FOUND",
            "is_match": False,
            "is_fixable": True,
            "message": f"Không tìm thấy '{filename}', nhưng tìm thấy file theo mã trên server: '{candidate_found}'",
            "given_path": raw_path,
            "given_filename": filename,
            "given_prefix": prefix,
            "server_filename": candidate_found,
            "suggested_fix_path": suggested_path
        }

    # 4. Hoàn toàn không tìm thấy trên server
    server_host = cfg.get("host", "192.168.201.116")
    return {
        "status": "NOT_FOUND",
        "is_match": False,
        "is_fixable": False,
        "message": f"Hình '{filename}' không tồn tại trên máy chủ {server_host}",
        "given_path": raw_path,
        "given_filename": filename,
        "given_prefix": prefix,
        "server_filename": "",
        "suggested_fix_path": ""
    }


def check_dishes_images_for_menu(
    dishes: List[Dict[str, Any]],
    force_refresh_cache: bool = False
) -> Dict[str, Any]:
    """
    Kiểm tra danh sách món của một menu với toàn bộ file ảnh trên máy chủ ảnh.
    Tận dụng cache trong RAM để xử lý toàn bộ menu chỉ trong vài miligiây.
    """
    cfg = load_config()
    server_host = cfg.get("host", "192.168.201.116")
    server_dir = cfg.get("remote_dir", "/opt/gpos/gmonitor/resources/menu")

    exact_set, lower_map = get_server_file_list(force_refresh=force_refresh_cache)

    results: List[Dict[str, Any]] = []
    match_count = 0
    prefix_mismatch_count = 0
    case_mismatch_count = 0
    candidate_count = 0
    not_found_count = 0
    no_image_count = 0
    fixable_count = 0

    for d in dishes:
        raw_path = d.get("image_url") or d.get("src_img") or d.get("url_img_qr") or ""
        dish_name = d.get("name") or ""
        rk7 = str(d.get("rk7_code") or d.get("rk7Code") or "").strip()
        sap = str(d.get("sap_code") or d.get("sapCode") or "").strip()
        dish_id = d.get("id") or f"{rk7}_{sap}"

        comp = compare_single_image(
            raw_path=raw_path,
            dish_name=dish_name,
            rk7_code=rk7,
            sap_code=sap,
            exact_set=exact_set,
            lower_map=lower_map
        )

        st = comp["status"]
        if st == "MATCH":
            match_count += 1
        elif st == "PREFIX_MISMATCH":
            prefix_mismatch_count += 1
            fixable_count += 1
        elif st == "CASE_MISMATCH":
            case_mismatch_count += 1
            fixable_count += 1
        elif st == "CANDIDATE_FOUND":
            candidate_count += 1
            fixable_count += 1
        elif st == "NO_IMAGE":
            no_image_count += 1
        elif st == "NOT_FOUND":
            not_found_count += 1

        results.append({
            "dish_id": dish_id,
            "rk7_code": rk7,
            "sap_code": sap,
            "name": dish_name,
            **comp
        })

    return {
        "server_host": server_host,
        "server_dir": server_dir,
        "total_dishes": len(dishes),
        "total_server_files": len(exact_set),
        "match_count": match_count,
        "prefix_mismatch_count": prefix_mismatch_count,
        "case_mismatch_count": case_mismatch_count,
        "candidate_count": candidate_count,
        "not_found_count": not_found_count,
        "no_image_count": no_image_count,
        "fixable_count": fixable_count,
        "results": results
    }


def sync_dish_images_to_mongo(
    host: str,
    port: int,
    fixes: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Cập nhật đồng nhất tên hình ảnh từ máy chủ vào MongoDB nhà hàng.
    ƯU TIÊN CẬP NHẬT TÊN HÌNH TỪ SERVER VỀ MONGODB, TUYỆT ĐỐI KHÔNG CHỈNH SỬA GÌ TRÊN SERVER.
    Cập nhật các trường:
      - srcImg: đường dẫn chuẩn /resources/menu/<filename>
      - srcImgThumbnail: /resources/menu/<filename>
      - srcImgQr: /resources/menu/<filename>
      - urlImgQr: link gateway https://gposgateway-hcm.ggg.com.vn:8443/resources/menu/<filename>
    """
    if not fixes:
        return {"updated_count": 0, "message": "Không có món nào cần cập nhật"}

    cfg = load_config()
    standard_prefix = cfg.get("standard_prefix", "/resources/menu/")
    if not standard_prefix.endswith("/"):
        standard_prefix += "/"

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        col = db["CO_MENU_ITEM"]

        updated_count = 0
        total_modified_docs = 0
        errors: List[str] = []

        for fix in fixes:
            rk7 = str(fix.get("rk7_code") or "").strip()
            sap = str(fix.get("sap_code") or "").strip()
            name = str(fix.get("dish_name") or fix.get("name") or "").strip()
            target_path = str(fix.get("target_image_path") or "").strip()

            if not target_path or (not rk7 and not sap and not name):
                continue

            # Giữ nguyên tiền tố của target_path (ví dụ: /menu/Mona.jpg), KHÔNG ép về standard_prefix
            clean_filename = os.path.basename(target_path)
            # Cloud Gateway URL luôn phục vụ từ /resources/menu/
            gateway_url = f"https://gposgateway-hcm.ggg.com.vn:8443/resources/menu/{clean_filename}"

            # Xây dựng bộ lọc OR để quét và cập nhật TẤT CẢ các bản ghi của món này dù ở bất kỳ menu nào
            or_conditions: List[Dict[str, Any]] = []
            if rk7:
                or_conditions.append({"code": rk7})
                try:
                    or_conditions.append({"code": int(rk7)})
                except Exception:
                    pass
            if sap:
                or_conditions.append({"sapCode": sap})
            if name:
                or_conditions.append({"nameVn": name})
                or_conditions.append({"name": name})

            if not or_conditions:
                continue

            match_query = {"$or": or_conditions}

            update_fields: Dict[str, Any] = {
                "srcImg": target_path,
                "srcImgThumbnail": target_path,
                "srcImgSquare": target_path,
                "srcImgQr": target_path,
                "urlImgQr": gateway_url,
                "timeModify": int(time.time() * 1000)
            }

            try:
                # Dùng update_many để đồng bộ toàn bộ các món cùng mã RK7/SAP hoặc cùng tên ở mọi menu
                res = col.update_many(match_query, {"$set": update_fields})
                if res.matched_count > 0:
                    updated_count += 1
                    total_modified_docs += res.modified_count

                # Đồng bộ thêm vào bảng MENU_ITEM nếu có bảng này trong G_ORDER
                if "MENU_ITEM" in db.list_collection_names():
                    try:
                        db["MENU_ITEM"].update_many(
                            match_query,
                            {"$set": {"srcImg": target_path, "timeModify": int(time.time() * 1000)}}
                        )
                    except Exception:
                        pass
            except Exception as ex:
                errors.append(f"Món {name or rk7 or sap}: {ex}")

        # Tăng VERSION_MENU_CO trong SYNC_VERSION để máy tính bảng POS CO nhận diện cập nhật ngay
        try:
            co_sync = db["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_CO"})
            cur_ver = co_sync.get("version", 0) if co_sync else 0
            db["SYNC_VERSION"].update_one(
                {"refName": "VERSION_MENU_CO"},
                {"$set": {"timeModify": int(time.time() * 1000), "version": cur_ver + 1}},
                upsert=True
            )
        except Exception:
            pass

        return {
            "success": True,
            "updated_count": updated_count,
            "total_modified_docs": total_modified_docs,
            "total_requested": len(fixes),
            "errors": errors,
            "message": f"Đã đồng nhất thành công {updated_count}/{len(fixes)} món ({total_modified_docs} bản ghi trên toàn bộ DB) từ máy chủ ảnh!"
        }
    finally:
        client.close()


# Danh sách 38 cột tiêu chuẩn của File 3 (Customer_Menu)
COLUMNS_38 = [
    "Mã SAP",
    "Mã món",
    "Tên Món VN",
    "Tên Món EN",
    "Extra FoodItem",
    "Mô tả TV",
    "Mô tả EN",
    "Số đĩa tối đa được gọi",
    "Số đĩa tối đa được gửi vào bếp",
    "Kalo",
    "Nhóm Kalo",
    "Tên hiển thị BF",
    "Vị trí trong combo",
    "Độ lớn ảnh trên CO (0:Bình thường, 1: 2x ngang, 2: Full size, 3: 2x dọc)",
    "Kiểu hiển thị(0: hiển thị bình thường, 1: hiển thị theo size)",
    "Thông tin số người ăn của món",
    "Khai báo ẩn/hiện món (0: hiển thị, 1: ẩn)",
    "Ghi chú",
    "Định lượng",
    'Các ghi chú cho món ăn (Sử dụng dấu "&&" để phân cách)',
    'Món liên quan (Ngon nhất khi ăn cùng - Sử dụng "&&" để ngăn cách])',
    'Size kèm theo (Mã món-Tên size. Các cặp ngăn cách bởi dấu "&&")',
    'Các topping kèm theo (Mã món-Mã modifier. Các cặp ngăn cách bởi dấu "&&")',
    'Modifier (Mã Modifier-Loại[0:Loại thường, 1: Loại cay]-Cấp độ cay[Không có thì để rỗng]. Các nhóm cách nhau bởi dấu "&&")',
    "Nhãn(cay, bán nhiêu,...)",
    'Các món ưu đãi (Mã foodItem, ngăn cách bởi dấu "&&")',
    "Ảnh đại diện",
    "Ảnh một nửa",
    "Ảnh topping",
    "Ảnh 1/4",
    "Ảnh Group",
    "Ảnh Group Hidden",
    "Ảnh 2x ngang",
    "Ảnh 2x dọc",
    "Ảnh vuông (đồ uống...)",
    "Ảnh QR-Order",
    "Ảnh Thumbnail",
    "Thời gian hấp (phút)",
]

TEMPLATE_FILE_3_PATH = r"D:\1.Download\SO.CO\File_goc\3 CO_GOC.xlsx"


def export_mismatched_dishes_excel(
    host: str,
    port: int,
    menu_code: str,
    menu_name: str = "",
    force_refresh_cache: bool = False,
    dishes: Optional[List[Dict[str, Any]]] = None
) -> Tuple[io.BytesIO, int, str]:
    """
    Xuất file Excel các món bị sai link hoặc tên hình ảnh của ĐÚNG MENU ĐƯỢC CHỌN (menu_code),
    tuyệt đối không xuất của các menu khác theo đúng quy định.
    Cấu trúc file bám sát 100% theo File 3 (D:\\1.Download\\SO.CO\\File_goc\\3 CO_GOC.xlsx - Sheet: Customer_Menu)
    với 38 cột chuẩn nghiệp vụ và bổ sung 3 cột đối soát:
      39: [Đối soát] Trạng thái kiểm tra
      40: [Đối soát] Đường dẫn chuẩn trên Server
      41: [Đối soát] Chi tiết thông báo lỗi
    """
    # Import service tránh phụ thuộc vòng lặp
    from app.services import mongo_menu_so_co_service

    clean_host = (host or "").strip()
    clean_menu_code = str(menu_code or "").strip()

    if not clean_host:
        raise ValueError("Chưa cung cấp địa chỉ IP máy trạm MongoDB!")
    if not clean_menu_code:
        raise ValueError("Chưa cung cấp mã Menu cần xuất đối soát hình ảnh!")

    # 1. Tải danh sách món ăn: ưu tiên lấy từ dishes do frontend truyền vào
    menu_items = dishes or []
    if not menu_items:
        try:
            loaded = mongo_menu_so_co_service.load_menu_items(
                host=clean_host,
                port=port,
                menu_codes=[clean_menu_code],
                search_all=False
            )
            menu_items = loaded.get("items", []) or []
        except Exception as e_load:
            logger.warning(f"Lỗi tải món từ MongoDB {clean_host}: {e_load}")
            menu_items = []

    # 2. Kiểm tra đối chiếu hình ảnh với máy chủ ảnh 192.168.201.116 (cache nhanh <1ms)
    check_res = check_dishes_images_for_menu(
        dishes=menu_items,
        force_refresh_cache=force_refresh_cache
    )
    all_results = check_res.get("results", []) or []

    # 3. Lọc duy nhất các món KHÔNG KHỚP (is_match == False: sai link, lệch chữ hoa/thường, không có trên server, chưa có hình)
    mismatches = [r for r in all_results if not r.get("is_match")]

    # 4. Tra cứu thông tin đầy đủ 38 trường từ CO_MENU_ITEM trong MongoDB G_ORDER
    client = get_mongo_client(clean_host, port)
    co_docs_by_rk7: Dict[str, Dict[str, Any]] = {}
    co_docs_by_sap: Dict[str, Dict[str, Any]] = {}

    try:
        db = client["G_ORDER"]
        rk7_list = [str(m.get("rk7_code", "")).strip() for m in mismatches if m.get("rk7_code")]
        sap_list = [str(m.get("sap_code", "")).strip() for m in mismatches if m.get("sap_code")]

        query_conditions = []
        if rk7_list:
            rk7_vals: List[Any] = list(rk7_list)
            for r in rk7_list:
                if r.isdigit():
                    rk7_vals.append(int(r))
            query_conditions.append({"code": {"$in": rk7_vals}})
        if sap_list:
            query_conditions.append({"sapCode": {"$in": sap_list}})

        if query_conditions:
            or_filter = {"$or": query_conditions} if len(query_conditions) > 1 else query_conditions[0]
            for doc in db["CO_MENU_ITEM"].find(or_filter):
                c = str(doc.get("code") or "").strip()
                s = str(doc.get("sapCode") or "").strip()
                if c:
                    co_docs_by_rk7[c] = doc
                if s:
                    co_docs_by_sap[s] = doc
    except Exception as e:
        logger.warning(f"Lỗi đọc CO_MENU_ITEM khi xuất Excel đối soát ({clean_host}): {e}")
    finally:
        client.close()

    # 5. Khởi tạo Workbook theo khuôn mẫu File 3
    wb = None
    if os.path.exists(TEMPLATE_FILE_3_PATH):
        try:
            wb = openpyxl.load_workbook(TEMPLATE_FILE_3_PATH)
            logger.info(f"Đã nạp file mẫu gốc File 3 từ {TEMPLATE_FILE_3_PATH}")
            ws = wb["Customer_Menu"] if "Customer_Menu" in wb.sheetnames else wb.active
            if ws.max_row > 1:
                ws.delete_rows(2, ws.max_row - 1)
        except Exception as ex_load:
            logger.warning(f"Không thể đọc hoặc xử lý file mẫu {TEMPLATE_FILE_3_PATH}: {ex_load}, tạo mới workbook hoàn toàn")
            wb = None

    if wb is None:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Customer_Menu"
        # Ghi 38 cột tiêu chuẩn
        header_font = Font(name="Arial", size=10, bold=True, color="000000")
        header_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")
        for col_idx, col_name in enumerate(COLUMNS_38, 1):
            c = ws.cell(1, col_idx, value=col_name)
            c.font = header_font
            c.fill = header_fill

    # Đảm bảo 3 cột đối soát (39, 40, 41) có tiêu đề nổi bật
    audit_header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    audit_header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    audit_titles = [
        (39, "[Đối soát] Trạng thái kiểm tra"),
        (40, "[Đối soát] Đường dẫn chuẩn trên Server"),
        (41, "[Đối soát] Chi tiết thông báo lỗi")
    ]
    for col_idx, col_title in audit_titles:
        c = ws.cell(1, col_idx, value=col_title)
        c.font = audit_header_font
        c.fill = audit_header_fill

    # Bản đồ nhãn trạng thái tiếng Việt thân thiện
    status_vietnamese = {
        "PREFIX_MISMATCH": "Sai tiền tố đường dẫn (/menu/ thay vì /resources/menu/)",
        "CASE_MISMATCH": "Lệch chữ hoa/thường so với file thực tế trên Server",
        "CANDIDATE_FOUND": "Tên file lệch nhưng tìm thấy ảnh theo mã RK7/SAP",
        "NOT_FOUND": "Không tìm thấy file ảnh trên Server",
        "NO_IMAGE": "Chưa có cấu hình đường dẫn ảnh",
    }

    # 6. Ghi dữ liệu từng món sai vào các dòng Excel
    for m in mismatches:
        rk7 = str(m.get("rk7_code") or "").strip()
        sap = str(m.get("sap_code") or "").strip()
        dish_name = m.get("name") or ""

        co_doc = co_docs_by_rk7.get(rk7) or co_docs_by_sap.get(sap) or {}

        # Tra cứu kalo
        details = co_doc.get("coMenuItemDetails", []) or []
        kalo = 100.0
        if details and isinstance(details, list) and len(details) > 0 and isinstance(details[0], dict):
            kalo = float(details[0].get("kalo", 100.0) or 100.0)

        st_code = m.get("status", "")
        st_text = status_vietnamese.get(st_code, st_code)

        # Định dạng chuỗi danh sách nối dấu &&
        def join_amp(val: Any) -> str:
            if isinstance(val, list):
                return "&&".join([str(x) for x in val if str(x).strip()])
            return str(val or "")

        def join_dict_amp(val: Any, key1: str, key2: str) -> str:
            if isinstance(val, list):
                parts = []
                for x in val:
                    if isinstance(x, dict):
                        parts.append(f"{x.get(key1, '')}-{x.get(key2, '')}")
                    else:
                        parts.append(str(x))
                return "&&".join(parts)
            return str(val or "")

        def join_modifiers(val: Any) -> str:
            if isinstance(val, list):
                parts = []
                for x in val:
                    if isinstance(x, dict):
                        parts.append(f"{x.get('code', '')}-{x.get('type', 0)}-{x.get('spicyLevel', '')}")
                    else:
                        parts.append(str(x))
                return "&&".join(parts)
            return str(val or "")

        final_sap = str(co_doc.get("sapCode") or sap or "")
        if final_sap == "0":
            final_sap = ""

        row = [
            final_sap,                                                            # 1. Mã SAP
            str(co_doc.get("code") or rk7 or ""),                                 # 2. Mã món
            co_doc.get("nameVn") or dish_name,                                    # 3. Tên Món VN
            co_doc.get("nameEn") or co_doc.get("nameVn") or dish_name,            # 4. Tên Món EN
            co_doc.get("extraFoodItem", "") or "",                                # 5. Extra FoodItem
            co_doc.get("descVn", "") or "",                                       # 6. Mô tả TV
            co_doc.get("descEn", "") or "",                                       # 7. Mô tả EN
            co_doc.get("maxDishOnSession", 0),                                    # 8. Số đĩa tối đa được gọi
            co_doc.get("maxDishToKit", 0),                                        # 9. Số đĩa tối đa được gửi vào bếp
            kalo,                                                                 # 10. Kalo
            co_doc.get("caloGroup", "") or "",                                    # 11. Nhóm Kalo
            co_doc.get("otherName", "") or "",                                    # 12. Tên hiển thị BF
            co_doc.get("positionNumber", 0),                                      # 13. Vị trí trong combo
            co_doc.get("imgSize", 0),                                             # 14. Độ lớn ảnh trên CO
            co_doc.get("viewType", 0),                                            # 15. Kiểu hiển thị
            co_doc.get("numberOfPeopleEat", co_doc.get("numberOfPeople", 0)),     # 16. Thông tin số người ăn
            co_doc.get("hiddenIconChooseItem", 0),                                # 17. Khai báo ẩn/hiện món
            co_doc.get("note", "") or "",                                         # 18. Ghi chú
            co_doc.get("noteQuantitative", co_doc.get("quantitative", 0)),        # 19. Định lượng
            join_amp(co_doc.get("lstNote")),                                      # 20. Các ghi chú cho món ăn
            join_amp(co_doc.get("relatedItems")),                                 # 21. Món liên quan
            join_dict_amp(co_doc.get("lstItemSize"), "code", "name"),             # 22. Size kèm theo
            join_dict_amp(co_doc.get("lstTopping"), "code", "modifierCode"),      # 23. Các topping kèm theo
            join_modifiers(co_doc.get("modifiers")),                              # 24. Modifier
            join_amp(co_doc.get("itemSpecialTypes")),                             # 25. Nhãn
            join_amp(co_doc.get("promotionalLst") or co_doc.get("promotionItems")), # 26. Các món ưu đãi
            co_doc.get("srcImg") or m.get("given_path") or "",                    # 27. Ảnh đại diện
            co_doc.get("srcImgHalf", "") or "",                                   # 28. Ảnh một nửa
            co_doc.get("srcImgTopping", "") or "",                                # 29. Ảnh topping
            co_doc.get("srcImgQuarter", "") or "",                                # 30. Ảnh 1/4
            co_doc.get("srcImgGroup", "") or "",                                  # 31. Ảnh Group
            co_doc.get("srcImgGroupHidden", "") or "",                            # 32. Ảnh Group Hidden
            co_doc.get("srcImg2xHorizontal", "") or "",                           # 33. Ảnh 2x ngang
            co_doc.get("srcImg2xVertical", "") or "",                             # 34. Ảnh 2x dọc
            co_doc.get("srcImgSquare", "") or "",                                 # 35. Ảnh vuông
            co_doc.get("urlImgQr") or co_doc.get("srcImgQr", "") or "",           # 36. Ảnh QR-Order
            co_doc.get("srcImgThumbnail", "") or "",                              # 37. Ảnh Thumbnail
            co_doc.get("steamingTime", "") or "",                                 # 38. Thời gian hấp
            st_text,                                                              # 39. [Đối soát] Trạng thái kiểm tra
            m.get("suggested_fix_path") or m.get("server_filename") or "",        # 40. [Đối soát] Đường dẫn chuẩn trên Server
            m.get("message") or ""                                                # 41. [Đối soát] Chi tiết thông báo lỗi
        ]
        ws.append(row)

    # 7. Xuất ra buffer bytes
    bio = io.BytesIO()
    wb.save(bio)
    bio.seek(0)

    # Tạo tên file gợi nhớ, sạch ký tự đặc biệt
    clean_menu_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', menu_name or clean_menu_code)
    clean_menu_title = re.sub(r'_+', '_', clean_menu_title).strip('_')
    date_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_name = f"Mon_Sai_Link_Anh_Menu_{clean_menu_code}_{clean_menu_title}_{date_str}.xlsx"

    logger.info(
        f"Đã xuất thành công file Excel {file_name} gồm {len(mismatches)}/{len(menu_items)} món sai ảnh "
        f"cho Menu '{menu_name}' ({clean_menu_code}) tại nhà hàng {clean_host}."
    )
    return bio, len(mismatches), file_name
