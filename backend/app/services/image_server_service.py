import re
import os
import time
import logging
import threading
from typing import Dict, Any, List, Optional, Set, Tuple
from urllib.parse import urlparse

import paramiko
from pymongo import MongoClient

logger = logging.getLogger(__name__)

def get_mongo_client(host: str, port: int = 27017, timeout_ms: int = 3500) -> MongoClient:
    """Khởi tạo MongoClient với timeout ngắn để tránh treo ứng dụng"""
    return MongoClient(
        host=host,
        port=port,
        serverSelectionTimeoutMS=timeout_ms,
        connectTimeoutMS=timeout_ms,
        socketTimeoutMS=timeout_ms,
    )

# Cấu hình SSH Server hình ảnh GPOS (Read-Only)
IMAGE_SERVER_HOST = "192.168.201.116"
IMAGE_SERVER_PORT = 22
IMAGE_SERVER_USER = "dung.na"
IMAGE_SERVER_PASS = "bp7em2zmQP"
IMAGE_SERVER_DIR = "/opt/gpos/gmonitor/resources/menu"
STANDARD_IMAGE_PREFIX = "/resources/menu/"

# Cache danh sách file trên server để tối ưu tốc độ, tránh gọi SSH lặp lại
_cache_lock = threading.Lock()
_cached_exact_files: Optional[Set[str]] = None
_cached_lower_map: Optional[Dict[str, str]] = None
_cache_timestamp: float = 0.0
CACHE_TTL_SECONDS = 300.0  # 5 phút cache


def get_server_file_list(force_refresh: bool = False) -> Tuple[Set[str], Dict[str, str]]:
    """
    Kết nối SSH tới máy chủ 192.168.201.116 và lấy toàn bộ danh sách file trong /opt/gpos/gmonitor/resources/menu.
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

    # Kết nối SSH lấy danh sách file
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(
            hostname=IMAGE_SERVER_HOST,
            port=IMAGE_SERVER_PORT,
            username=IMAGE_SERVER_USER,
            password=IMAGE_SERVER_PASS,
            timeout=8
        )
        # Lệnh ls -1 liệt kê từng tên file 1 dòng
        stdin, stdout, stderr = ssh.exec_command(f"ls -1 {IMAGE_SERVER_DIR}", timeout=10)
        raw_output = stdout.read().decode("utf-8", errors="replace")
        lines = [line.strip() for line in raw_output.split("\n") if line.strip()]

        exact_set: Set[str] = set()
        lower_map: Dict[str, str] = {}

        for filename in lines:
            # Bỏ qua các mục rỗng hoặc dấu chấm
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

        logger.info(f"Đã tải {len(exact_set)} file ảnh từ máy chủ {IMAGE_SERVER_HOST}:{IMAGE_SERVER_DIR}")
        return exact_set, lower_map
    except Exception as e:
        logger.error(f"Lỗi kết nối SSH tới {IMAGE_SERVER_HOST}: {e}")
        # Nếu đã có cache cũ thì tạm dùng cache cũ
        with _cache_lock:
            if _cached_exact_files is not None and _cached_lower_map is not None:
                return _cached_exact_files, _cached_lower_map
        raise RuntimeError(f"Không thể kết nối máy chủ hình ảnh {IMAGE_SERVER_HOST}: {e}")
    finally:
        try:
            ssh.close()
        except Exception:
            pass


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
    1. Kiểm tra tiền tố có đúng là /resources/menu/ hay không.
    2. Kiểm tra tên hình (có phân biệt hoa/thường) có tồn tại trên máy chủ hay không.
    3. Nếu lệch chữ hoa/thường hoặc sai tiền tố, gợi ý đường dẫn chuẩn để đồng nhất.
    """
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

    has_standard_prefix = (prefix == STANDARD_IMAGE_PREFIX)

    # 1. Khớp chính xác 100% (cả chữ hoa/thường)
    if filename in exact_set:
        if has_standard_prefix:
            return {
                "status": "MATCH",
                "is_match": True,
                "is_fixable": False,
                "message": "Khớp hoàn toàn 100% cả tên hình và đường dẫn /resources/menu/",
                "given_path": raw_path,
                "given_filename": filename,
                "given_prefix": prefix,
                "server_filename": filename,
                "suggested_fix_path": f"{STANDARD_IMAGE_PREFIX}{filename}"
            }
        else:
            return {
                "status": "PREFIX_MISMATCH",
                "is_match": False,
                "is_fixable": True,
                "message": f"Tên hình khớp trên server nhưng sai đường dẫn (hiện tại: '{prefix}', chuẩn: '{STANDARD_IMAGE_PREFIX}')",
                "given_path": raw_path,
                "given_filename": filename,
                "given_prefix": prefix,
                "server_filename": filename,
                "suggested_fix_path": f"{STANDARD_IMAGE_PREFIX}{filename}"
            }

    # 2. Lệch chữ hoa / thường
    filename_lower = filename.lower()
    if filename_lower in lower_map:
        server_exact_name = lower_map[filename_lower]
        return {
            "status": "CASE_MISMATCH",
            "is_match": False,
            "is_fixable": True,
            "message": f"Lệch chữ hoa/thường (File DB: '{filename}', Server thực tế: '{server_exact_name}')",
            "given_path": raw_path,
            "given_filename": filename,
            "given_prefix": prefix,
            "server_filename": server_exact_name,
            "suggested_fix_path": f"{STANDARD_IMAGE_PREFIX}{server_exact_name}"
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
        return {
            "status": "CANDIDATE_FOUND",
            "is_match": False,
            "is_fixable": True,
            "message": f"Không tìm thấy '{filename}', nhưng tìm thấy file theo mã trên server: '{candidate_found}'",
            "given_path": raw_path,
            "given_filename": filename,
            "given_prefix": prefix,
            "server_filename": candidate_found,
            "suggested_fix_path": f"{STANDARD_IMAGE_PREFIX}{candidate_found}"
        }

    # 4. Hoàn toàn không tìm thấy trên server
    return {
        "status": "NOT_FOUND",
        "is_match": False,
        "is_fixable": False,
        "message": f"Hình '{filename}' không tồn tại trên máy chủ {IMAGE_SERVER_HOST}",
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
    Kiểm tra danh sách món của một menu với toàn bộ file ảnh trên server 192.168.201.116.
    Tận dụng cache trong RAM để xử lý toàn bộ menu chỉ trong vài miligiây.
    """
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
        "server_host": IMAGE_SERVER_HOST,
        "server_dir": IMAGE_SERVER_DIR,
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

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        col = db["CO_MENU_ITEM"]

        updated_count = 0
        errors: List[str] = []

        for fix in fixes:
            rk7 = str(fix.get("rk7_code") or "").strip()
            sap = str(fix.get("sap_code") or "").strip()
            target_path = str(fix.get("target_image_path") or "").strip()

            if not target_path or (not rk7 and not sap):
                continue

            # Đảm bảo target_path có tiền tố /resources/menu/
            if not target_path.startswith("/resources/menu/"):
                clean_name = os.path.basename(target_path)
                target_path = f"/resources/menu/{clean_name}"

            # Chuẩn hóa link gateway
            clean_filename = target_path.replace("/resources/menu/", "")
            gateway_url = f"https://gposgateway-hcm.ggg.com.vn:8443/resources/menu/{clean_filename}"

            query: Dict[str, Any] = {}
            if rk7:
                query["code"] = rk7
            elif sap:
                query["sapCode"] = sap

            update_fields: Dict[str, Any] = {
                "srcImg": target_path,
                "srcImgThumbnail": target_path,
                "srcImgQr": target_path,
                "urlImgQr": gateway_url,
                "timeModify": int(time.time() * 1000)
            }

            try:
                res = col.update_one(query, {"$set": update_fields})
                if res.matched_count > 0:
                    updated_count += 1
                else:
                    # Nếu chưa có trong CO_MENU_ITEM, thử tìm theo sapCode
                    if rk7 and sap:
                        res2 = col.update_one({"sapCode": sap}, {"$set": update_fields})
                        if res2.matched_count > 0:
                            updated_count += 1
            except Exception as ex:
                errors.append(f"Mã {rk7 or sap}: {ex}")

        return {
            "success": True,
            "updated_count": updated_count,
            "total_requested": len(fixes),
            "errors": errors,
            "message": f"Đã đồng nhất thành công {updated_count}/{len(fixes)} món trên MongoDB từ máy chủ ảnh!"
        }
    finally:
        client.close()
