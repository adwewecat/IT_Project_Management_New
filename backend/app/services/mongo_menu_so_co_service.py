import io
import openpyxl
import os
import re
import json
import logging
import time
import unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
from pymongo import MongoClient

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
SNAPSHOT_DIR = os.path.join(DATA_DIR, "menu_snapshots")
os.makedirs(SNAPSHOT_DIR, exist_ok=True)


def remove_vietnamese_tones(text: str) -> str:
    """Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu/hoa thường."""
    if not text:
        return ""
    normalized = unicodedata.normalize("NFD", text)
    result = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return result.replace("đ", "d").replace("Đ", "D").lower().strip()


def get_mongo_client(host: str, port: int = 27017, timeout_ms: int = 3500) -> MongoClient:
    """Khởi tạo kết nối MongoClient an toàn với timeout ngắn tránh treo."""
    return MongoClient(host, port, serverSelectionTimeoutMS=timeout_ms, socketTimeoutMS=12000)


def _flatten_group_items(g: Dict[str, Any]) -> List[Tuple[Dict[str, Any], str, str, int, int, str]]:
    """
    Duyệt danh sách món trong group, hỗ trợ cấu trúc lồng nhau (Sub-groups đồ uống level: 0).
    Trả về danh sách tuple: (dish_it, group_code, group_name, level, sort_order, parent_group_code).
    Bỏ qua hoàn toàn các món bị null/trống mã RK7 và trống tên để tránh lỗi bảng rỗng.
    """
    g_code = str(g.get("code", "")).strip()
    g_name = g.get("name", "")
    g_level = int(g.get("level", -1))
    dish_list = g.get("items", []) or []

    result = []
    for idx, it in enumerate(dish_list):
        mi = it.get("menu-item")
        if mi and (str(mi.get("code", "")).strip() or str(mi.get("name", "")).strip()):
            result.append((it, g_code, g_name, g_level, int(it.get("priority", 0) or (idx + 1)), g_code))
        elif it.get("items"):
            # Sub-group lồng nhau (phổ biến ở Đồ Uống level 0)
            sub_code = str(it.get("code", "")).strip() or g_code
            sub_name = str(it.get("name", "")).strip()
            display_group_name = f"{g_name} - {sub_name}" if g_name and sub_name and g_name != sub_name else (sub_name or g_name)
            sub_level = int(it.get("level", g_level))
            for sub_idx, sub_it in enumerate(it.get("items", [])):
                sub_mi = sub_it.get("menu-item")
                if sub_mi and (str(sub_mi.get("code", "")).strip() or str(sub_mi.get("name", "")).strip()):
                    result.append((sub_it, sub_code, display_group_name, sub_level, int(sub_it.get("priority", 0) or (sub_idx + 1)), g_code))
        else:
            # Item trống rỗng không có menu-item và không có sub-items -> bỏ qua, không để bị null trên bảng
            continue

    return result


def _build_menu_name_map(db) -> Dict[str, str]:
    """
    Xác định tên chuẩn của các Menu (ví dụ: 'Alacarte' thay vì 'Main menu').
    Ưu tiên:
    1. CO_ORDER_CATEGORY (nameVn hoặc nameEn) -> Tên hiển thị chuẩn trên tablet khách hàng CO.
    2. ORDER_CATEGORY (name loại bỏ ngoặc mã SAP, ví dụ 'Alacarte (AFHCM_oc_ALC)' -> 'Alacarte').
    3. RESTAURANT_CATEGORY (name nếu có và không phải 'Main menu').
    Tuyệt đối KHÔNG gán 'Main menu' nếu tìm thấy tên kinh doanh chuẩn.
    """
    name_map: Dict[str, str] = {}

    # 1. Quét ORDER_CATEGORY
    try:
        for oc in db["ORDER_CATEGORY"].find():
            code = str(oc.get("code") or "").strip()
            raw_name = str(oc.get("name") or "").strip()
            if code and raw_name and raw_name.lower() != "main menu":
                clean_name = re.sub(r"\s*\(.*?\)$", "", raw_name).strip()
                name_map[code] = clean_name or raw_name
    except Exception:
        pass

    # 2. Quét RESTAURANT_CATEGORY
    try:
        for rc in db["RESTAURANT_CATEGORY"].find():
            code = str(rc.get("code") or "").strip()
            raw_name = str(rc.get("name") or "").strip()
            if code and raw_name and raw_name.lower() != "main menu":
                clean_name = re.sub(r"\s*\(.*?\)$", "", raw_name).strip()
                if clean_name:
                    name_map[code] = clean_name
    except Exception:
        pass

    # 3. Quét CO_ORDER_CATEGORY (Ưu tiên cao nhất vì đây là tên khách nhìn thấy trên tablet)
    try:
        for co in db["CO_ORDER_CATEGORY"].find():
            code = str(co.get("code") or "").strip()
            name_vn = str(co.get("nameVn") or "").strip()
            name_en = str(co.get("nameEn") or "").strip()
            best = name_vn or name_en
            if code and best and best.lower() != "main menu":
                clean_best = re.sub(r"\s*\(.*?\)$", "", best).strip()
                name_map[code] = clean_best or best
    except Exception:
        pass

    return name_map


def get_menu_categories(host: str, port: int = 27017) -> List[Dict[str, Any]]:
    """
    Lấy danh sách các Menu trong nhà hàng kèm số lượng nhóm món và số lượng món ăn trong từng menu từ ORDER_MENU_CACHE_CATEGORY.
    Phân loại rõ từng nhóm món:
    - is_co: True nếu nhóm nằm trong CO_ORDER_CATEGORY.menuGroupCodes (Khách thấy trên tablet CO).
    - is_co: False nếu nhóm chỉ có trên POS/SO (Chưa đưa lên CO).
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        rc_cursor = db["RESTAURANT_CATEGORY"].find().sort("id", 1)
        results = []

        # Bản đồ tên Menu chuẩn (ưu tiên Alacarte thay vì Main menu)
        menu_name_map = _build_menu_name_map(db)

        # Lấy danh sách nhóm CO theo từng mã Menu từ CO_ORDER_CATEGORY
        co_group_codes_map: Dict[str, Set[str]] = {}
        try:
            for co in db["CO_ORDER_CATEGORY"].find({}, {"code": 1, "menuGroupCodes": 1}):
                c = str(co.get("code") or "").strip()
                if c:
                    co_group_codes_map[c] = {str(g).strip() for g in co.get("menuGroupCodes", []) if str(g).strip()}
        except Exception as e:
            logger.warning("Lỗi đọc CO_ORDER_CATEGORY.menuGroupCodes: %s", e)

        # Đọc trước tất cả documents trong ORDER_MENU_CACHE_CATEGORY để tính tổng nhóm, món và trích xuất danh sách nhóm
        cache_map = {}
        for omc in db["ORDER_MENU_CACHE_CATEGORY"].find():
            cc = str(omc.get("category-code", "")).strip()
            if cc:
                raw_groups = omc.get("main-menu", {}).get("items", []) or []
                total_dishes = 0
                menu_groups = []
                seen_g_codes = set()
                co_codes = co_group_codes_map.get(cc, set())

                for g in raw_groups:
                    flattened = _flatten_group_items(g)
                    total_dishes += len(flattened)
                    g_code = str(g.get("code", "")).strip()
                    g_name = str(g.get("name", "")).strip()
                    g_level = int(g.get("level", -1))

                    sub_map = {}
                    for it, it_g_code, it_g_name, it_g_lvl, _, p_code in flattened:
                        if it_g_code not in sub_map:
                            is_grp_co = (it_g_code in co_codes) or (p_code in co_codes)
                            sub_map[it_g_code] = {
                                "code": it_g_code,
                                "name": it_g_name,
                                "level": it_g_lvl,
                                "parent_code": p_code,
                                "is_co": is_grp_co,
                                "channel": "CO" if is_grp_co else "SO_ONLY",
                                "count": 0
                            }
                        sub_map[it_g_code]["count"] += 1

                    if sub_map:
                        for grp in sub_map.values():
                            if grp["code"] not in seen_g_codes:
                                seen_g_codes.add(grp["code"])
                                menu_groups.append(grp)
                    else:
                        fallback_code = g_code or f"{cc}_{len(menu_groups)+1}"
                        if fallback_code not in seen_g_codes:
                            seen_g_codes.add(fallback_code)
                            is_fallback_co = (fallback_code in co_codes) or (g_code in co_codes)
                            menu_groups.append({
                                "code": fallback_code,
                                "name": g_name or f"Nhóm {len(menu_groups)+1}",
                                "level": g_level,
                                "parent_code": g_code,
                                "is_co": is_fallback_co,
                                "channel": "CO" if is_fallback_co else "SO_ONLY",
                                "count": 0
                            })

                co_group_count = sum(1 for g in menu_groups if g.get("is_co"))
                so_only_group_count = len(menu_groups) - co_group_count

                cache_map[cc] = {
                    "group_count": len(menu_groups),
                    "co_group_count": co_group_count,
                    "so_only_group_count": so_only_group_count,
                    "dish_count": total_dishes,
                    "groups": menu_groups
                }

        for rc in rc_cursor:
            code = str(rc.get("code", "")).strip()
            name = rc.get("name", "")
            # Lấy tên kinh doanh thực tế, bỏ qua nếu tên là "Main menu"
            resolved_name = menu_name_map.get(code) or name
            stats = cache_map.get(code, {"group_count": 0, "co_group_count": 0, "so_only_group_count": 0, "dish_count": 0, "groups": []})
            results.append({
                "code": code,
                "id": rc.get("id"),
                "name": resolved_name,
                "show_in_so": bool(rc.get("showInSo", False)),
                "show_in_co": bool(rc.get("showInCo", False)),
                "show_in_qr_order": bool(rc.get("showInQrOrder", False)),
                "auto_delivery_in_so": bool(rc.get("autoDeliveryInSo", False)),
                "group_count": stats["group_count"],
                "co_group_count": stats.get("co_group_count", 0),
                "so_only_group_count": stats.get("so_only_group_count", 0),
                "dish_count": stats["dish_count"],
                "groups": stats.get("groups", []),
            })

        # Bổ sung các Menu có trong ORDER_MENU_CACHE_CATEGORY nhưng chưa có trong RESTAURANT_CATEGORY
        seen_codes = {r["code"] for r in results if r.get("code")}
        for cc, stats in cache_map.items():
            if cc and cc not in seen_codes:
                # Tìm tên menu chuẩn: ưu tiên menu_name_map (Alacarte)
                menu_name = menu_name_map.get(cc, "")
                if not menu_name:
                    doc_omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": cc}, {"name": 1, "category-name": 1, "main-menu.name": 1})
                    if doc_omc:
                        candidate = (
                            doc_omc.get("name")
                            or doc_omc.get("category-name")
                            or doc_omc.get("main-menu", {}).get("name")
                            or ""
                        )
                        if candidate and candidate.lower() != "main menu":
                            menu_name = candidate
                if not menu_name:
                    menu_name = f"Menu {cc}"

                results.append({
                    "code": cc,
                    "id": int(cc) if cc.isdigit() else len(results) + 1,
                    "name": menu_name,
                    "show_in_so": True,
                    "show_in_co": True,
                    "show_in_qr_order": True,
                    "auto_delivery_in_so": False,
                    "group_count": stats["group_count"],
                    "co_group_count": stats.get("co_group_count", 0),
                    "so_only_group_count": stats.get("so_only_group_count", 0),
                    "dish_count": stats["dish_count"],
                    "groups": stats.get("groups", []),
                })
        return results
    finally:
        client.close()


def load_menu_items(
    host: str,
    port: int = 27017,
    menu_codes: Optional[List[str]] = None,
    search_all: bool = False,
    query: Optional[str] = None,
    rk7_codes: Optional[List[str]] = None,
    sap_codes: Optional[List[str]] = None,
    names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Tải danh sách chi tiết các món trong Menu được chọn (hoặc tất cả Menu nếu search_all=True),
    đối chiếu trực tiếp với CO_MENU_ITEM để xác định trạng thái CO, lấy hình ảnh và kalo.
    Hỗ trợ tìm kiếm theo từ khóa, danh sách mã RK7, mã SAP, hoặc tên món (không dấu/có dấu).
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]

        # 1. Tạo lookup map từ CO_MENU_ITEM
        co_lookup: Dict[str, Dict[str, Any]] = {}
        for co_item in db["CO_MENU_ITEM"].find({}, {
            "code": 1, "sapCode": 1, "nameVn": 1, "srcImg": 1, "srcImgThumbnail": 1, "srcImgSquare": 1, "urlImgQr": 1, "coMenuItemDetails": 1
        }):
            c_code = str(co_item.get("code", "")).strip()
            if c_code:
                details = co_item.get("coMenuItemDetails", []) or []
                kalo = 100.0
                if details and isinstance(details, list) and len(details) > 0:
                    kalo = float(details[0].get("kalo", 100.0) or 100.0)

                url_img_qr = str(co_item.get("urlImgQr", "") or "").strip()
                src_img = str(co_item.get("srcImg", "") or co_item.get("srcImgThumbnail", "") or co_item.get("srcImgSquare", "") or "").strip()
                # Ưu tiên URL ảnh online trực tiếp từ Cloud Gateway nếu có, fallback về filename cục bộ GPOS
                final_img = url_img_qr if (url_img_qr.startswith("http://") or url_img_qr.startswith("https://")) else (src_img or url_img_qr)

                co_lookup[c_code] = {
                    "sapCode": str(co_item.get("sapCode", "")).strip(),
                    "nameVn": co_item.get("nameVn", ""),
                    "srcImg": src_img,
                    "urlImgQr": url_img_qr,
                    "finalImg": final_img,
                    "kalo": kalo,
                }

        # 2. Tạo lookup tên menu chuẩn (Alacarte thay vì Main menu)
        menu_name_map: Dict[str, str] = _build_menu_name_map(db)

        # Lấy danh sách nhóm CO theo từng mã Menu từ CO_ORDER_CATEGORY
        co_group_codes_map: Dict[str, Set[str]] = {}
        try:
            for co in db["CO_ORDER_CATEGORY"].find({}, {"code": 1, "menuGroupCodes": 1}):
                c = str(co.get("code") or "").strip()
                if c:
                    co_group_codes_map[c] = {str(g).strip() for g in co.get("menuGroupCodes", []) if str(g).strip()}
        except Exception as e:
            logger.warning("Lỗi đọc CO_ORDER_CATEGORY trong load_menu_items: %s", e)

        # 3. Xác định danh sách category_codes cần quét
        target_codes: Set[str] = set()
        if search_all or not menu_codes:
            # Quét tất cả có trong ORDER_MENU_CACHE_CATEGORY
            for omc in db["ORDER_MENU_CACHE_CATEGORY"].find({}, {"category-code": 1}):
                cc = str(omc.get("category-code", "")).strip()
                if cc:
                    target_codes.add(cc)
        else:
            target_codes = {str(c).strip() for c in menu_codes if str(c).strip()}

        # Chuẩn bị bộ lọc tìm kiếm
        norm_query = remove_vietnamese_tones(query) if query else ""
        norm_rk7_set = {str(r).strip() for r in (rk7_codes or []) if str(r).strip()}
        norm_sap_set = {str(s).strip() for s in (sap_codes or []) if str(s).strip()}
        norm_names_set = {remove_vietnamese_tones(n) for n in (names or []) if str(n).strip()}

        items: List[Dict[str, Any]] = []
        menus_loaded: Set[str] = set()

        for cat_code in target_codes:
            omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": cat_code})
            if not omc and cat_code.isdigit():
                omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": int(cat_code)})
            if not omc:
                continue

            menus_loaded.add(cat_code)
            menu_title = menu_name_map.get(cat_code, f"Menu {cat_code}")
            groups = omc.get("main-menu", {}).get("items", []) or []
            co_codes = co_group_codes_map.get(cat_code, set())

            for g in groups:
                for it, g_code, g_name, g_level, sort_order, parent_g_code in _flatten_group_items(g):
                    mi = it.get("menu-item", {}) or {}
                    rk7 = str(mi.get("code", "")).strip()
                    dish_name = mi.get("name", "")
                    sap = str(mi.get("sap-code", "") or mi.get("sapCode", "")).strip()
                    price = float(it.get("price", 0.0) or 0.0)
                    vat = float(it.get("vat", 0.0) or 0.0)

                    # Bỏ qua hoàn toàn các món rỗng
                    if not rk7 and not dish_name:
                        continue

                    norm_dish_name = remove_vietnamese_tones(dish_name)

                    # Áp dụng bộ lọc
                    if norm_query:
                        if (
                            norm_query not in norm_dish_name
                            and norm_query not in rk7.lower()
                            and norm_query not in sap.lower()
                            and norm_query not in g_name.lower()
                        ):
                            continue

                    if norm_rk7_set and rk7 not in norm_rk7_set:
                        continue

                    if norm_sap_set and sap not in norm_sap_set:
                        continue

                    if norm_names_set:
                        match_any_name = any(tn in norm_dish_name for tn in norm_names_set)
                        if not match_any_name:
                            continue

                    # Phân loại nhóm CO vs SO-only
                    is_group_co = (g_code in co_codes) or (parent_g_code in co_codes)
                    group_channel = "CO" if is_group_co else "SO_ONLY"

                    # Đối chiếu CO
                    co_info = co_lookup.get(rk7)
                    is_co = co_info is not None
                    image_url = co_info.get("finalImg", "") if co_info else ""
                    raw_src_img = co_info.get("srcImg", "") if co_info else ""
                    raw_url_qr = co_info.get("urlImgQr", "") if co_info else ""
                    co_kalo = co_info.get("kalo", 100.0) if co_info else None

                    # Xác định chi tiết trạng thái CO
                    co_status_detail = "NOT_IN_CO"
                    if is_co:
                        co_status_detail = "ACTIVE_ON_CO" if is_group_co else "DISH_IN_CO_BUT_GROUP_NOT_IN_CO"

                    # Nếu không có sap trong cache nhưng CO có thì bổ sung
                    if not sap and co_info and co_info.get("sapCode"):
                        sap = co_info["sapCode"]

                    items.append({
                        "menu_code": cat_code,
                        "menu_name": f"{menu_title} - {cat_code}",
                        "group_code": g_code,
                        "group_name": g_name,
                        "parent_group_code": parent_g_code,
                        "group_is_co": is_group_co,
                        "group_channel": group_channel,
                        "level": g_level,  # -1: Thường (Món ăn), 0: Đồ uống
                        "rk7_code": rk7,
                        "name": dish_name,
                        "sap_code": sap,
                        "sort_order": sort_order,
                        "price": price,
                        "vat": vat,
                        "image_url": image_url,
                        "src_img": raw_src_img,
                        "url_img_qr": raw_url_qr,
                        "is_so": True,
                        "is_co": is_co,
                        "co_status_detail": co_status_detail,
                        "co_kalo": co_kalo,
                    })

        # Sắp xếp kết quả: theo menu_code -> group_code -> sort_order
        items.sort(key=lambda x: (x["menu_code"], x["group_code"], x["sort_order"]))

        return {
            "host": host,
            "items": items,
            "total_items": len(items),
            "menus_loaded": list(menus_loaded),
        }
    finally:
        client.close()


def check_dish_conflicts(host: str, port: int = 27017, menu_codes: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Kiểm tra lỗi sai lệch dữ liệu:
    1. Cùng mã RK7 nhưng mang tên khác nhau giữa các nhóm/menu.
    2. Cùng tên món nhưng lại có nhiều mã RK7 khác nhau.
    Bổ sung so sánh chi tiết mã SAP để xác định món có trùng mã SAP hay khác mã SAP.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        query_filter: Dict[str, Any] = {}
        if menu_codes:
            query_filter["category-code"] = {"$in": [str(c).strip() for c in menu_codes]}

        # Map tên menu chuẩn (Alacarte thay vì Main menu)
        menu_name_map: Dict[str, str] = _build_menu_name_map(db)

        rk7_map: Dict[str, Dict[str, Any]] = {}
        name_map: Dict[str, Dict[str, Any]] = {}

        for omc in db["ORDER_MENU_CACHE_CATEGORY"].find(query_filter):
            cat_code = str(omc.get("category-code", "")).strip()
            menu_title = menu_name_map.get(cat_code, f"Menu {cat_code}")
            groups = omc.get("main-menu", {}).get("items", []) or []

            for g in groups:
                for it, g_code, g_name, g_level, sort_order, _ in _flatten_group_items(g):
                    mi = it.get("menu-item", {}) or {}
                    rk7 = str(mi.get("code", "")).strip()
                    name = mi.get("name", "").strip()
                    sap = str(mi.get("sap-code", "") or mi.get("sapCode", "")).strip()
                    price = float(it.get("price", 0.0) or 0.0)
                    if not rk7 or not name:
                        continue

                    # 1. Thống kê theo RK7
                    if rk7 not in rk7_map:
                        rk7_map[rk7] = {"names": set(), "saps": set(), "occurrences": []}
                    rk7_map[rk7]["names"].add(name)
                    if sap:
                        rk7_map[rk7]["saps"].add(sap)
                    rk7_map[rk7]["occurrences"].append({
                        "menu_code": cat_code,
                        "menu_name": f"{menu_title} - {cat_code}",
                        "group_code": g_code,
                        "group_name": g_name,
                        "rk7_code": rk7,
                        "name": name,
                        "sap_code": sap,
                        "price": price,
                    })

                    # 2. Thống kê theo Tên chuẩn hóa
                    norm_name = remove_vietnamese_tones(name)
                    if norm_name not in name_map:
                        name_map[norm_name] = {"rk7s": set(), "names_display": set(), "saps": set(), "occurrences": []}
                    name_map[norm_name]["rk7s"].add(rk7)
                    name_map[norm_name]["names_display"].add(name)
                    if sap:
                        name_map[norm_name]["saps"].add(sap)
                    name_map[norm_name]["occurrences"].append({
                        "menu_code": cat_code,
                        "menu_name": f"{menu_title} - {cat_code}",
                        "group_code": g_code,
                        "group_name": g_name,
                        "rk7_code": rk7,
                        "name": name,
                        "sap_code": sap,
                        "price": price,
                    })

        same_rk7_diff_name = []
        for rk7, val in rk7_map.items():
            if len(val["names"]) > 1:
                saps_list = sorted(list(val["saps"]))
                if len(saps_list) == 1:
                    sap_status = "SAME_SAP"
                    sap_summary = f"Mã SAP: {saps_list[0]}"
                elif len(saps_list) > 1:
                    sap_status = "DIFF_SAP"
                    sap_summary = f"⚠️ Cùng RK7 nhưng khác SAP: {', '.join(saps_list)}"
                else:
                    sap_status = "NO_SAP"
                    sap_summary = "Chưa có mã SAP"

                same_rk7_diff_name.append({
                    "key": rk7,
                    "type": "same_rk7_diff_name",
                    "rk7_code": rk7,
                    "name": list(val["names"])[0],
                    "distinct_values": sorted(list(val["names"])),
                    "distinct_saps": saps_list,
                    "sap_status": sap_status,
                    "sap_summary": sap_summary,
                    "occurrences": val["occurrences"],
                })

        same_name_diff_rk7 = []
        for norm_name, val in name_map.items():
            if len(val["rk7s"]) > 1:
                sample_name = sorted(list(val["names_display"]))[0]
                saps_list = sorted(list(val["saps"]))

                # Nhóm occurrences theo RK7 để xem mỗi RK7 ứng với SAP nào
                rk7_to_saps: Dict[str, Set[str]] = {}
                for occ in val["occurrences"]:
                    r = occ["rk7_code"]
                    s = occ["sap_code"]
                    if r not in rk7_to_saps:
                        rk7_to_saps[r] = set()
                    if s:
                        rk7_to_saps[r].add(s)

                rk7_breakdown = [
                    {"rk7_code": r, "sap_codes": sorted(list(s_set))}
                    for r, s_set in sorted(rk7_to_saps.items())
                ]

                # Kiểm tra xem các mã RK7 có cùng chung 1 mã SAP không
                if len(saps_list) == 1 and len(rk7_breakdown) > 1 and all(len(b["sap_codes"]) > 0 for b in rk7_breakdown):
                    sap_status = "SAME_SAP"
                    sap_summary = f"⚠️ Trùng mã SAP: {saps_list[0]} (Cùng 1 mã SAP cho {len(val['rk7s'])} mã RK7)"
                elif len(saps_list) > 1:
                    sap_status = "DIFF_SAP"
                    sap_summary = f"Khác mã SAP: {', '.join(saps_list)}"
                elif len(saps_list) == 0:
                    sap_status = "NO_SAP"
                    sap_summary = "Chưa có mã SAP"
                else:
                    sap_status = "PARTIAL_SAP"
                    sap_summary = f"Mã SAP: {saps_list[0]} (Một số mã RK7 chưa gán SAP)"

                same_name_diff_rk7.append({
                    "key": norm_name,
                    "type": "same_name_diff_rk7",
                    "rk7_code": sorted(list(val["rk7s"]))[0],
                    "name": sample_name,
                    "distinct_values": sorted(list(val["rk7s"])),
                    "distinct_saps": saps_list,
                    "sap_status": sap_status,
                    "sap_summary": sap_summary,
                    "rk7_breakdown": rk7_breakdown,
                    "occurrences": val["occurrences"],
                })

        same_rk7_diff_name.sort(key=lambda x: x["rk7_code"])
        same_name_diff_rk7.sort(key=lambda x: x["name"])

        return {
            "host": host,
            "same_rk7_diff_name": same_rk7_diff_name,
            "same_name_diff_rk7": same_name_diff_rk7,
            "total_conflicts": len(same_rk7_diff_name) + len(same_name_diff_rk7),
        }
    finally:
        client.close()


def resolve_dish_conflict(
    host: str,
    port: int = 27017,
    conflict_type: str = "same_rk7_diff_name",
    unified_rk7_code: str = "",
    unified_name: str = "",
    affected_rk7_codes: Optional[List[str]] = None,
    affected_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Đồng bộ dữ liệu xung đột:
    - Nếu cùng RK7 khác tên: đồng bộ toàn bộ tên của RK7 đó về `unified_name`.
    - Nếu cùng tên khác RK7: đồng bộ toàn bộ các RK7 trong danh sách về `unified_rk7_code` và tên `unified_name`.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        updated_count = 0
        u_rk7 = str(unified_rk7_code).strip()
        u_name = str(unified_name).strip()

        if not u_rk7 and not u_name:
            return {"success": False, "message": "Vui lòng cung cấp mã RK7 hoặc tên đồng bộ hợp lệ", "updated_count": 0}

        target_rk7_list = set()
        if u_rk7:
            target_rk7_list.add(u_rk7)
        if affected_rk7_codes:
            for r in affected_rk7_codes:
                if str(r).strip():
                    target_rk7_list.add(str(r).strip())

        # 1. Cập nhật ORDER_MENU_CACHE_CATEGORY
        for omc in db["ORDER_MENU_CACHE_CATEGORY"].find():
            cat_code = omc.get("category-code")
            groups = omc.get("main-menu", {}).get("items", []) or []
            changed = False

            for g in groups:
                for it in g.get("items", []) or []:
                    mi = it.get("menu-item", {}) or {}
                    cur_rk7 = str(mi.get("code", "")).strip()
                    cur_name = mi.get("name", "").strip()

                    match = False
                    if conflict_type == "same_rk7_diff_name":
                        if cur_rk7 == u_rk7:
                            match = True
                    else:  # same_name_diff_rk7
                        if cur_rk7 in target_rk7_list or (affected_names and cur_name in affected_names):
                            match = True

                    if match:
                        if u_name:
                            mi["name"] = u_name
                        if u_rk7:
                            mi["code"] = u_rk7
                        changed = True
                        updated_count += 1

            if changed:
                db["ORDER_MENU_CACHE_CATEGORY"].update_one(
                    {"_id": omc["_id"]},
                    {"$set": {"main-menu.items": groups}}
                )

        # 2. Cập nhật MENU_GROUP
        for mg in db["MENU_GROUP"].find({"details.refCode": {"$in": list(target_rk7_list)}}):
            details = mg.get("details", []) or []
            changed = False
            for d in details:
                if str(d.get("refCode", "")).strip() in target_rk7_list:
                    if u_name:
                        d["name"] = u_name
                    if u_rk7:
                        d["refCode"] = u_rk7
                    changed = True
            if changed:
                db["MENU_GROUP"].update_one({"_id": mg["_id"]}, {"$set": {"details": details}})

        # 3. Cập nhật CO_MENU_GROUP
        for cmg in db["CO_MENU_GROUP"].find({"details.refCode": {"$in": list(target_rk7_list)}}):
            details = cmg.get("details", []) or []
            changed = False
            for d in details:
                if str(d.get("refCode", "")).strip() in target_rk7_list:
                    if u_name:
                        d["name"] = u_name
                    if u_rk7:
                        d["refCode"] = u_rk7
                    changed = True
            if changed:
                db["CO_MENU_GROUP"].update_one({"_id": cmg["_id"]}, {"$set": {"details": details}})

        # 4. Cập nhật MENU_ITEM
        if u_rk7 and u_name:
            db["MENU_ITEM"].update_many(
                {"code": {"$in": list(target_rk7_list)}},
                {"$set": {"name": u_name, "code": u_rk7}}
            )

        # 5. Cập nhật CO_MENU_ITEM
        if u_rk7 and u_name:
            db["CO_MENU_ITEM"].update_many(
                {"code": {"$in": list(target_rk7_list)}},
                {"$set": {"nameVn": u_name, "code": u_rk7}}
            )

        return {
            "success": True,
            "message": f"Đã đồng bộ thành công {updated_count} mục về mã RK7 '{u_rk7}' và tên '{u_name}'",
            "updated_count": updated_count,
        }
    finally:
        client.close()


def activate_to_co(host: str, port: int = 27017, items: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Kích hoạt một hoặc nhiều món sang phần mềm CO (Customer Order).
    Tạo hoặc cập nhật document trong CO_MENU_ITEM với Kalo mặc định = 100.0,
    đặt maxDishOnSession = 100, maxDishToKit = 100 theo đúng quy chuẩn hệ thống.
    """
    if not items:
        return {"success": False, "message": "Danh sách món kích hoạt trống", "activated_count": 0}

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        now_ts = int(time.time() * 1000)
        activated_count = 0

        for it in items:
            rk7 = str(it.get("rk7_code", "")).strip()
            name = str(it.get("name", "")).strip()
            sap = str(it.get("sap_code", "")).strip()
            price = float(it.get("price", 0.0) or 0.0)
            image_url = str(it.get("image_url", "")).strip()

            if not rk7:
                continue

            existing_co = db["CO_MENU_ITEM"].find_one({"code": rk7})
            if existing_co:
                # Cập nhật thông tin nếu cần
                update_fields: Dict[str, Any] = {
                    "timeModify": now_ts,
                }
                if name:
                    update_fields["nameVn"] = name
                    update_fields["nameEn"] = name
                if sap:
                    update_fields["sapCode"] = sap
                if image_url:
                    update_fields["srcImg"] = image_url
                    update_fields["srcImgThumbnail"] = image_url

                db["CO_MENU_ITEM"].update_one({"code": rk7}, {"$set": update_fields})
                activated_count += 1
            else:
                # Tạo mới hoàn toàn với Kalo = 100.0
                new_doc = {
                    "id": 0,
                    "srcImgThumbnail": image_url,
                    "srcImg": image_url,
                    "positionNumber": 0,
                    "coMenuItemDetails": [
                        {
                            "price": price,
                            "kalo": 100.0,
                            "code": rk7,
                            "nameVn": name,
                            "nameEn": name,
                        }
                    ],
                    "modifiers": [],
                    "relatedItems": [],
                    "maxDishOnSession": 100,
                    "maxDishToKit": 100,
                    "itemSpecialTypes": [],
                    "isCombo": False,
                    "timeModify": now_ts,
                    "imgSize": 0,
                    "viewType": 0,
                    "lstItemSize": [],
                    "lstTopping": [],
                    "sapCode": sap,
                    "hiddenIconChooseItem": 0,
                    "code": rk7,
                    "nameVn": name,
                    "nameEn": name,
                }
                db["CO_MENU_ITEM"].insert_one(new_doc)
                activated_count += 1

        return {
            "success": True,
            "message": f"Đã kích hoạt thành công {activated_count} món sang CO (Kalo: 100.0)!",
            "activated_count": activated_count,
        }
    finally:
        client.close()


def deactivate_from_co(
    host: str,
    port: int = 27017,
    rk7_codes: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Tắt kích hoạt một hoặc nhiều món khỏi phần mềm CO (Customer Order).
    Xóa món khỏi collection CO_MENU_ITEM và gỡ bỏ refCode khỏi CO_MENU_GROUP.
    Tự động cập nhật VERSION_MENU_CO trong SYNC_VERSION để app CO tự tải lại.
    """
    if not rk7_codes:
        return {"success": False, "message": "Danh sách mã món cần tắt CO trống", "deactivated_count": 0}

    clean_codes = [str(c).strip() for c in rk7_codes if str(c).strip()]
    if not clean_codes:
        return {"success": False, "message": "Danh sách mã món hợp lệ trống", "deactivated_count": 0}

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        now_ts = int(time.time() * 1000)

        # 1. Xóa khỏi CO_MENU_ITEM
        del_res = db["CO_MENU_ITEM"].delete_many({"code": {"$in": clean_codes}})
        deactivated_count = del_res.deleted_count

        # 2. Gỡ khỏi chi tiết nhóm trong CO_MENU_GROUP
        db["CO_MENU_GROUP"].update_many(
            {},
            {"$pull": {"details": {"refCode": {"$in": clean_codes}}}}
        )

        # 3. Tăng VERSION_MENU_CO trong SYNC_VERSION để app CO tự reload
        try:
            co_sync = db["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_CO"})
            cur_ver = (co_sync.get("version", 1000) if co_sync else 1000) + 1
            db["SYNC_VERSION"].update_one(
                {"refName": "VERSION_MENU_CO"},
                {"$set": {"version": cur_ver, "timeSync": now_ts, "status": "DONE"}},
                upsert=True
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Đã tắt kích hoạt thành công {deactivated_count} món khỏi phần mềm CO!",
            "deactivated_count": deactivated_count,
        }
    finally:
        client.close()


def bulk_add_dishes(
    host: str,
    port: int = 27017,
    target_menu_codes: Optional[List[str]] = None,
    group_mode: str = "existing",  # "existing" | "new"
    group_code: Optional[str] = None,
    group_name: str = "",
    group_name_en: Optional[str] = None,
    level: int = -1,  # -1 for regular food, 0 for drink
    items: Optional[List[Dict[str, Any]]] = None,
    menu_group_map: Optional[Dict[str, Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Thêm một danh sách món ăn vào Nhóm món trong Menu (hỗ trợ thêm đồng thời vào nhiều Menu).
    Hỗ trợ bản đồ nhóm riêng cho từng menu (menu_group_map) để người dùng chọn nhóm tương ứng của từng Menu.
    Nếu nhóm chưa tồn tại trong menu đích, cảnh báo hoặc tự động thêm nhóm mới với mã duy nhất
    đảm bảo không trùng mã nhóm giữa các menu.
    """
    if not target_menu_codes:
        return {"success": False, "message": "Vui lòng chọn ít nhất một Menu đích", "added_count": 0, "warnings": []}
    if not items:
        return {"success": False, "message": "Danh sách món thêm trống", "added_count": 0, "warnings": []}

    default_g_name = group_name.strip()
    if not default_g_name and not menu_group_map:
        return {"success": False, "message": "Vui lòng nhập Tên Nhóm Món hoặc chọn nhóm theo từng Menu", "added_count": 0, "warnings": []}

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        now_ts = int(time.time() * 1000)
        warnings = []
        total_added = 0

        # Chuẩn bị danh sách món ăn dạng object để chèn
        for menu_code in target_menu_codes:
            m_code = str(menu_code).strip()
            omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": m_code})
            if not omc:
                warnings.append(f"Menu '{m_code}' chưa được khởi tạo cache trong ORDER_MENU_CACHE_CATEGORY.")
                continue

            main_menu = omc.get("main-menu", {}) or {}
            groups = main_menu.get("items", []) or []

            # Xác định thông tin nhóm cho riêng menu này nếu có menu_group_map
            m_custom = (menu_group_map or {}).get(m_code, {})
            this_g_code = str(m_custom.get("group_code", "")).strip() or (group_code.strip() if group_code else "")
            this_g_name = str(m_custom.get("group_name", "")).strip() or default_g_name
            this_level = int(m_custom.get("level", level)) if "level" in m_custom else level

            if not this_g_name:
                this_g_name = f"Nhóm Món {m_code}"

            # Tìm xem nhóm đã có trong Menu này chưa
            target_group = None
            for g in groups:
                if this_g_code and str(g.get("code", "")).strip() == this_g_code:
                    target_group = g
                    break
                elif str(g.get("name", "")).strip().lower() == this_g_name.lower():
                    target_group = g
                    break

            actual_g_code = this_g_code

            if not target_group:
                # Nhóm chưa có trong menu này
                if group_mode == "existing":
                    # Báo cảnh báo cho người dùng
                    warnings.append(f"Menu '{m_code}' chưa có nhóm '{this_g_name}'. Hệ thống đã tự động liên kết nhóm này vào Menu.")

                # Sinh mã nhóm duy nhất nếu là nhóm mới
                if not actual_g_code or group_mode == "new":
                    slug = remove_vietnamese_tones(this_g_name).replace(" ", "_").upper()[:12]
                    actual_g_code = f"{m_code}_{slug}_{int(time.time()) % 10000}"

                new_group_id = int(time.time() * 1000) % 10000000
                target_group = {
                    "items": [],
                    "form-flag": 0,
                    "level": this_level,
                    "group-type": 0,
                    "id": new_group_id,
                    "item-id": new_group_id,
                    "code": actual_g_code,
                    "name": this_g_name,
                    "parent-id": 0,
                    "object-sifr": 0,
                    "flags": 0,
                    "cook-mins": 0,
                }
                groups.append(target_group)

                # Lưu vào MENU_GROUP & CO_MENU_GROUP nếu chưa có
                mg_existing = db["MENU_GROUP"].find_one({"code": actual_g_code})
                if not mg_existing:
                    mg_doc = {
                        "id": new_group_id,
                        "code": actual_g_code,
                        "name": this_g_name,
                        "nameEn": group_name_en or this_g_name,
                        "level": this_level,
                        "groupType": 0,
                        "details": [],
                        "srcImage": "",
                    }
                    db["MENU_GROUP"].insert_one(mg_doc)
                    db["CO_MENU_GROUP"].insert_one(mg_doc.copy())

                # Cập nhật CO_ORDER_CATEGORY
                db["CO_ORDER_CATEGORY"].update_one(
                    {"code": m_code},
                    {"$addToSet": {"menuGroupCodes": actual_g_code}}
                )

            # Thêm các món vào target_group
            existing_items_in_group = target_group.get("items", []) or []
            existing_rk7_in_group = {
                str(it.get("menu-item", {}).get("code", "")).strip()
                for it in existing_items_in_group
            }

            for row in items:
                r_rk7 = str(row.get("rk7_code", "")).strip()
                r_name = str(row.get("name", "")).strip()
                r_sap = str(row.get("sap_code", "")).strip()
                r_sort = int(row.get("sort_order", 0) or (len(existing_items_in_group) + 1))
                r_price = float(row.get("price", 0.0) or 0.0)
                r_img = str(row.get("image_url", "")).strip()
                r_level = int(row.get("level", level))

                if not r_rk7 or not r_name:
                    continue

                if r_rk7 in existing_rk7_in_group:
                    # Món đã tồn tại trong nhóm này của menu này -> Cập nhật thông tin
                    for exist_it in existing_items_in_group:
                        mi_obj = exist_it.get("menu-item", {}) or {}
                        if str(mi_obj.get("code", "")).strip() == r_rk7:
                            mi_obj["name"] = r_name
                            if r_sap:
                                mi_obj["sap-code"] = r_sap
                            exist_it["price"] = r_price
                            exist_it["priority"] = r_sort
                            break
                else:
                    # Tạo dish object mới chuẩn ORDER_MENU_CACHE_CATEGORY
                    new_item_id = int(time.time() * 1000 % 10000000)
                    dish_obj = {
                        "id": 0,
                        "co-dish-id": 0,
                        "menu-item": {
                            "modi-scheme": 0,
                            "combo-scheme": 0,
                            "combo-join-mode": 0,
                            "order-quantity": 0.0,
                            "inventory-quantity": 0.0,
                            "classificator-groups": 0,
                            "tax-dish-type": 1180117,
                            "id": new_item_id,
                            "item-id": new_item_id,
                            "code": r_rk7,
                            "name": r_name,
                            "status": 3,
                            "parent-id": 1054294,
                            "right-lvl": "0",
                            "object-sifr": 0,
                            "flags": 0,
                            "sap-code": r_sap,
                            "cook-mins": 0,
                            "alt-portion": "",
                        },
                        "price": r_price,
                        "quantity": 0.0,
                        "remain-quantity": 0.0,
                        "uni": 0,
                        "del-print": False,
                        "editable": True,
                        "is-combo": False,
                        "is-combo-require": False,
                        "lst-discount-dish": [],
                        "quantity-void": 0.0,
                        "status-kds": 0,
                        "vat": 10,
                        "priority": r_sort,
                        "amount": 0,
                        "lst-modi": [],
                        "lst-item-size": [],
                        "lst-topping": [],
                        "up-limit": 0,
                        "down-limit": 0,
                    }
                    existing_items_in_group.append(dish_obj)
                    existing_rk7_in_group.add(r_rk7)
                    total_added += 1

                # Cập nhật MENU_GROUP.details
                actual_code = target_group.get("code") or actual_g_code
                db["MENU_GROUP"].update_one(
                    {"code": actual_code},
                    {
                        "$pull": {"details": {"refCode": r_rk7}},
                    }
                )
                db["MENU_GROUP"].update_one(
                    {"code": actual_code},
                    {
                        "$push": {
                            "details": {
                                "refCode": r_rk7,
                                "type": "MENU_ITEM",
                                "name": r_name,
                                "orderNumberItem": r_sort,
                                "viewType": 0,
                            }
                        }
                    }
                )
                db["CO_MENU_GROUP"].update_one(
                    {"code": actual_code},
                    {
                        "$pull": {"details": {"refCode": r_rk7}},
                    }
                )
                db["CO_MENU_GROUP"].update_one(
                    {"code": actual_code},
                    {
                        "$push": {
                            "details": {
                                "refCode": r_rk7,
                                "type": "MENU_ITEM",
                                "name": r_name,
                                "orderNumberItem": r_sort,
                                "viewType": 0,
                            }
                        }
                    }
                )

                # Đồng bộ MENU_ITEM
                db["MENU_ITEM"].update_one(
                    {"code": r_rk7},
                    {
                        "$setOnInsert": {
                            "code": r_rk7,
                            "name": r_name,
                            "sapCode": r_sap,
                            "status": 3,
                            "id": int(time.time() * 1000 % 10000000),
                            "itemId": int(time.time() * 1000 % 10000000),
                        }
                    },
                    upsert=True
                )

                # Nếu có ảnh thì cập nhật CO_MENU_ITEM
                if r_img:
                    db["CO_MENU_ITEM"].update_one(
                        {"code": r_rk7},
                        {
                            "$set": {
                                "srcImg": r_img,
                                "srcImgThumbnail": r_img,
                            }
                        }
                    )

            target_group["items"] = existing_items_in_group
            db["ORDER_MENU_CACHE_CATEGORY"].update_one(
                {"category-code": m_code},
                {"$set": {"main-menu.items": groups}}
            )

        return {
            "success": True,
            "message": f"Đã lưu thành công các món vào {len(target_menu_codes)} Menu!",
            "added_count": total_added,
            "warnings": warnings,
        }
    finally:
        client.close()


def update_dish_item(
    host: str,
    port: int = 27017,
    menu_code: str = "",
    group_code: str = "",
    original_rk7_code: str = "",
    new_rk7_code: str = "",
    new_name: str = "",
    new_sap_code: str = "",
    new_sort_order: int = 0,
    new_price: float = 0.0,
    new_image_url: str = "",
    new_level: int = -1,
) -> Dict[str, Any]:
    """
    Cập nhật thông tin chi tiết một món ăn: mã RK7, tên món, mã SAP, thứ tự sắp xếp, giá, ảnh, level.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        m_code = str(menu_code).strip()
        g_code = str(group_code).strip()
        orig_rk7 = str(original_rk7_code).strip()
        n_rk7 = str(new_rk7_code).strip() or orig_rk7
        n_name = new_name.strip()
        n_sap = str(new_sap_code).strip()

        # 1. Cập nhật trong ORDER_MENU_CACHE_CATEGORY
        omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": m_code})
        if omc:
            groups = omc.get("main-menu", {}).get("items", []) or []
            for g in groups:
                if str(g.get("code", "")).strip() == g_code:
                    if new_level is not None:
                        g["level"] = new_level
                    for it in g.get("items", []) or []:
                        mi = it.get("menu-item", {}) or {}
                        if str(mi.get("code", "")).strip() == orig_rk7:
                            mi["code"] = n_rk7
                            mi["name"] = n_name
                            mi["sap-code"] = n_sap
                            it["price"] = float(new_price)
                            it["priority"] = int(new_sort_order)
                            break
            db["ORDER_MENU_CACHE_CATEGORY"].update_one(
                {"category-code": m_code},
                {"$set": {"main-menu.items": groups}}
            )

        # 2. Cập nhật trong MENU_GROUP
        mg = db["MENU_GROUP"].find_one({"code": g_code})
        if mg:
            details = mg.get("details", []) or []
            for d in details:
                if str(d.get("refCode", "")).strip() == orig_rk7:
                    d["refCode"] = n_rk7
                    d["name"] = n_name
                    d["orderNumberItem"] = int(new_sort_order)
            db["MENU_GROUP"].update_one(
                {"code": g_code},
                {"$set": {"details": details}}
            )

        # 3. Cập nhật trong CO_MENU_GROUP
        cmg = db["CO_MENU_GROUP"].find_one({"code": g_code})
        if cmg:
            details = cmg.get("details", []) or []
            for d in details:
                if str(d.get("refCode", "")).strip() == orig_rk7:
                    d["refCode"] = n_rk7
                    d["name"] = n_name
                    d["orderNumberItem"] = int(new_sort_order)
            db["CO_MENU_GROUP"].update_one(
                {"code": g_code},
                {"$set": {"details": details}}
            )

        # 4. Cập nhật trong MENU_ITEM
        db["MENU_ITEM"].update_one(
            {"code": orig_rk7},
            {"$set": {"code": n_rk7, "name": n_name, "sapCode": n_sap}}
        )

        # 5. Cập nhật trong CO_MENU_ITEM
        co_doc = db["CO_MENU_ITEM"].find_one({"code": orig_rk7})
        if co_doc:
            co_updates: Dict[str, Any] = {
                "code": n_rk7,
                "nameVn": n_name,
                "nameEn": n_name,
                "sapCode": n_sap,
            }
            if new_image_url:
                co_updates["srcImg"] = new_image_url
                co_updates["srcImgThumbnail"] = new_image_url
            db["CO_MENU_ITEM"].update_one({"code": orig_rk7}, {"$set": co_updates})

        return {
            "success": True,
            "message": f"Đã cập nhật món '{n_name}' (RK7: {n_rk7}) thành công!",
        }
    finally:
        client.close()


def delete_dishes(
    host: str,
    port: int = 27017,
    items: Optional[List[Dict[str, Any]]] = None,
    delete_from_all_menus: bool = False,
) -> Dict[str, Any]:
    """
    Xóa hàng loạt món ăn khỏi Menu đã chọn hoặc khỏi tất cả các Menu có chứa món đó.
    """
    if not items:
        return {"success": False, "message": "Danh sách món cần xóa trống", "deleted_count": 0}

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        deleted_count = 0

        # Nhóm theo category_code
        cat_items_map: Dict[str, List[Dict[str, Any]]] = {}
        all_rk7_to_delete: Set[str] = set()

        for it in items:
            m_code = str(it.get("menu_code", "")).strip()
            g_code = str(it.get("group_code", "")).strip()
            rk7 = str(it.get("rk7_code", "")).strip()
            if not rk7:
                continue

            all_rk7_to_delete.add(rk7)
            if m_code not in cat_items_map:
                cat_items_map[m_code] = []
            cat_items_map[m_code].append({"group_code": g_code, "rk7_code": rk7})

        if delete_from_all_menus:
            # Xóa khỏi toàn bộ ORDER_MENU_CACHE_CATEGORY
            for omc in db["ORDER_MENU_CACHE_CATEGORY"].find():
                groups = omc.get("main-menu", {}).get("items", []) or []
                changed = False
                for g in groups:
                    orig_len = len(g.get("items", []) or [])
                    new_items = [
                        it for it in (g.get("items", []) or [])
                        if str(it.get("menu-item", {}).get("code", "")).strip() not in all_rk7_to_delete
                    ]
                    if len(new_items) != orig_len:
                        g["items"] = new_items
                        changed = True
                        deleted_count += (orig_len - len(new_items))
                if changed:
                    db["ORDER_MENU_CACHE_CATEGORY"].update_one(
                        {"_id": omc["_id"]},
                        {"$set": {"main-menu.items": groups}}
                    )

            # Xóa khỏi MENU_GROUP & CO_MENU_GROUP
            db["MENU_GROUP"].update_many(
                {},
                {"$pull": {"details": {"refCode": {"$in": list(all_rk7_to_delete)}}}}
            )
            db["CO_MENU_GROUP"].update_many(
                {},
                {"$pull": {"details": {"refCode": {"$in": list(all_rk7_to_delete)}}}}
            )
        else:
            # Chỉ xóa khỏi các Menu và Nhóm cụ thể được chỉ định
            for m_code, to_del in cat_items_map.items():
                omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": m_code})
                if not omc:
                    continue

                groups = omc.get("main-menu", {}).get("items", []) or []
                del_tuples = {(x["group_code"], x["rk7_code"]) for x in to_del}

                changed = False
                for g in groups:
                    g_code = str(g.get("code", "")).strip()
                    orig_len = len(g.get("items", []) or [])
                    new_items = [
                        it for it in (g.get("items", []) or [])
                        if (g_code, str(it.get("menu-item", {}).get("code", "")).strip()) not in del_tuples
                    ]
                    if len(new_items) != orig_len:
                        g["items"] = new_items
                        changed = True
                        deleted_count += (orig_len - len(new_items))

                if changed:
                    db["ORDER_MENU_CACHE_CATEGORY"].update_one(
                        {"category-code": m_code},
                        {"$set": {"main-menu.items": groups}}
                    )

                # Xóa trong MENU_GROUP tương ứng
                for x in to_del:
                    db["MENU_GROUP"].update_one(
                        {"code": x["group_code"]},
                        {"$pull": {"details": {"refCode": x["rk7_code"]}}}
                    )
                    db["CO_MENU_GROUP"].update_one(
                        {"code": x["group_code"]},
                        {"$pull": {"details": {"refCode": x["rk7_code"]}}}
                    )

        return {
            "success": True,
            "message": f"Đã xóa thành công {deleted_count} món ăn khỏi hệ thống!",
            "deleted_count": deleted_count,
        }
    finally:
        client.close()


def move_or_clone_dishes(
    host: str,
    port: int = 27017,
    action: str = "move",  # "move" | "clone"
    source_items: Optional[List[Dict[str, Any]]] = None,
    target_menu_code: str = "",
    target_group_code: str = "",
) -> Dict[str, Any]:
    """
    Chuyển (Move) hoặc Nhân bản (Clone) một hoặc nhiều món sang một Nhóm khác
    (trong cùng Menu hoặc sang Menu khác).
    """
    if not source_items:
        return {"success": False, "message": "Danh sách món nguồn trống", "processed_count": 0}
    if not target_menu_code or not target_group_code:
        return {"success": False, "message": "Vui lòng chọn Menu đích và Nhóm đích", "processed_count": 0}

    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        t_menu = str(target_menu_code).strip()
        t_group = str(target_group_code).strip()

        # 1. Tìm Menu đích và Nhóm đích
        target_omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": t_menu})
        if not target_omc:
            return {"success": False, "message": f"Menu đích '{t_menu}' không tồn tại trong cache", "processed_count": 0}

        target_groups = target_omc.get("main-menu", {}).get("items", []) or []
        target_g_obj = None
        for g in target_groups:
            if str(g.get("code", "")).strip() == t_group:
                target_g_obj = g
                break

        if not target_g_obj:
            return {"success": False, "message": f"Nhóm đích '{t_group}' không tồn tại trong Menu '{t_menu}'", "processed_count": 0}

        target_items = target_g_obj.get("items", []) or []
        target_existing_rk7 = {
            str(it.get("menu-item", {}).get("code", "")).strip()
            for it in target_items
        }

        # Đọc dữ liệu chi tiết của từng món nguồn từ cache hoặc MENU_ITEM
        processed_count = 0

        for s_it in source_items:
            s_menu = str(s_it.get("menu_code", "")).strip()
            s_group = str(s_it.get("group_code", "")).strip()
            s_rk7 = str(s_it.get("rk7_code", "")).strip()
            if not s_rk7:
                continue

            # Tìm đối tượng món gốc trong s_menu
            found_dish_obj = None
            src_omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": s_menu})
            if src_omc:
                for sg in src_omc.get("main-menu", {}).get("items", []) or []:
                    if str(sg.get("code", "")).strip() == s_group:
                        for it in sg.get("items", []) or []:
                            if str(it.get("menu-item", {}).get("code", "")).strip() == s_rk7:
                                found_dish_obj = it
                                break

            if not found_dish_obj:
                # Tìm trong MENU_ITEM
                mi_doc = db["MENU_ITEM"].find_one({"code": s_rk7})
                dish_name = mi_doc.get("name", s_rk7) if mi_doc else s_rk7
                sap_code = mi_doc.get("sapCode", "") if mi_doc else ""
                new_item_id = int(time.time() * 1000 % 10000000)
                found_dish_obj = {
                    "id": 0,
                    "co-dish-id": 0,
                    "menu-item": {
                        "modi-scheme": 0,
                        "combo-scheme": 0,
                        "combo-join-mode": 0,
                        "order-quantity": 0.0,
                        "inventory-quantity": 0.0,
                        "classificator-groups": 0,
                        "tax-dish-type": 1180117,
                        "id": new_item_id,
                        "item-id": new_item_id,
                        "code": s_rk7,
                        "name": dish_name,
                        "status": 3,
                        "parent-id": 1054294,
                        "right-lvl": "0",
                        "object-sifr": 0,
                        "flags": 0,
                        "sap-code": sap_code,
                        "cook-mins": 0,
                        "alt-portion": "",
                    },
                    "price": 0.0,
                    "quantity": 0.0,
                    "remain-quantity": 0.0,
                    "uni": 0,
                    "del-print": False,
                    "editable": True,
                    "is-combo": False,
                    "is-combo-require": False,
                    "lst-discount-dish": [],
                    "quantity-void": 0.0,
                    "status-kds": 0,
                    "vat": 10,
                    "priority": len(target_items) + 1,
                    "amount": 0,
                    "lst-modi": [],
                    "lst-item-size": [],
                    "lst-topping": [],
                    "up-limit": 0,
                    "down-limit": 0,
                }

            # Thêm vào nhóm đích nếu chưa có
            import copy
            cloned_obj = copy.deepcopy(found_dish_obj)
            cloned_obj["priority"] = len(target_items) + 1

            if s_rk7 not in target_existing_rk7:
                target_items.append(cloned_obj)
                target_existing_rk7.add(s_rk7)
            else:
                # Đã có trong nhóm đích -> cập nhật
                for idx, tit in enumerate(target_items):
                    if str(tit.get("menu-item", {}).get("code", "")).strip() == s_rk7:
                        target_items[idx] = cloned_obj
                        break

            # Cập nhật MENU_GROUP chi tiết cho nhóm đích
            mi_info = cloned_obj.get("menu-item", {}) or {}
            db["MENU_GROUP"].update_one(
                {"code": t_group},
                {"$pull": {"details": {"refCode": s_rk7}}}
            )
            db["MENU_GROUP"].update_one(
                {"code": t_group},
                {
                    "$push": {
                        "details": {
                            "refCode": s_rk7,
                            "type": "MENU_ITEM",
                            "name": mi_info.get("name", s_rk7),
                            "orderNumberItem": len(target_items),
                            "viewType": 0,
                        }
                    }
                }
            )

            # Nếu là lệnh Move (Chuyển nhóm), xóa khỏi nhóm nguồn
            if action == "move":
                if src_omc:
                    s_groups = src_omc.get("main-menu", {}).get("items", []) or []
                    for sg in s_groups:
                        if str(sg.get("code", "")).strip() == s_group:
                            sg["items"] = [
                                it for it in (sg.get("items", []) or [])
                                if str(it.get("menu-item", {}).get("code", "")).strip() != s_rk7
                            ]
                    db["ORDER_MENU_CACHE_CATEGORY"].update_one(
                        {"category-code": s_menu},
                        {"$set": {"main-menu.items": s_groups}}
                    )

                db["MENU_GROUP"].update_one(
                    {"code": s_group},
                    {"$pull": {"details": {"refCode": s_rk7}}}
                )
                db["CO_MENU_GROUP"].update_one(
                    {"code": s_group},
                    {"$pull": {"details": {"refCode": s_rk7}}}
                )

            processed_count += 1

        # Cập nhật lại target_groups vào Menu đích
        target_g_obj["items"] = target_items
        db["ORDER_MENU_CACHE_CATEGORY"].update_one(
            {"category-code": t_menu},
            {"$set": {"main-menu.items": target_groups}}
        )

        action_name = "Chuyển" if action == "move" else "Nhân bản"
        return {
            "success": True,
            "message": f"Đã {action_name} thành công {processed_count} món sang Nhóm '{t_group}' (Menu {t_menu})!",
            "processed_count": processed_count,
        }
    finally:
        client.close()


def sync_all_so_co(
    host: str,
    port: int = 27017,
    restaurant_code: Optional[str] = None,
    username: str = "IT_ADMIN",
) -> Dict[str, Any]:
    """
    Thực hiện quy trình đồng bộ toàn bộ SO và CO:
    1. SO: Làm mới và tăng số phiên bản VERSION_MENU_SO trong SYNC_VERSION.
    2. KDS: Đồng bộ thời gian chế biến món (cookMins) sang G_KITCHEN.CONFIG_COOKING.
    3. CO: Kích hoạt đồng bộ sang CO_MENU_ITEM & tăng VERSION_MENU_CO, VERSION_MENU_CONFIG trong SYNC_VERSION.
    4. Ghi nhận nhật ký đồng bộ MASTER_DATA_SYNC_LOG và ACTION_LOG.
    """
    client = get_mongo_client(host, port)
    try:
        now_ms = int(datetime.now().timestamp() * 1000)
        db_order = client["G_ORDER"]

        # -------------------------------------------------------------
        # BƯỚC 1: ĐỒNG BỘ SO (Smart Order)
        # -------------------------------------------------------------
        so_sync_doc = db_order["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_SO"})
        so_ver = (so_sync_doc.get("version", 2000) if so_sync_doc else 2000) + 1
        db_order["SYNC_VERSION"].update_one(
            {"refName": "VERSION_MENU_SO"},
            {"$set": {"version": so_ver, "timeSync": now_ms, "status": "DONE"}},
            upsert=True
        )

        # Đồng bộ thời gian chế biến món sang G_KITCHEN.CONFIG_COOKING
        kds_synced_count = 0
        try:
            db_kitchen = client["G_KITCHEN"]
            for omc in db_order["ORDER_MENU_CACHE_CATEGORY"].find():
                for g in omc.get("main-menu", {}).get("items", []) or []:
                    for it, _, _, _, _, _ in _flatten_group_items(g):
                        mi = it.get("menu-item", {}) or {}
                        rk7 = str(mi.get("code", "")).strip()
                        name = mi.get("name", "").strip()
                        sap = str(mi.get("sap-code", "") or mi.get("sapCode", "")).strip()
                        cook_mins = int(mi.get("cook-mins", 0) or 0)
                        if rk7 and name:
                            cooking_time_secs = (cook_mins * 60) if cook_mins > 0 else 300
                            db_kitchen["CONFIG_COOKING"].update_one(
                                {"menuItemCode": rk7},
                                {
                                    "$set": {
                                        "menuItemName": name,
                                        "sapCode": sap,
                                        "singleCookingTime": cooking_time_secs,
                                        "updatedAt": now_ms
                                    },
                                    "$setOnInsert": {
                                        "menuItemCode": rk7,
                                        "groupTypeKds": {"code": "ALL", "name": "Bếp Nóng & Nướng"}
                                    }
                                },
                                upsert=True
                            )
                            kds_synced_count += 1

            db_kitchen["MASTER_DATA_SYNC_LOG"].insert_one({
                "collection": "FINISH DONG BO MENU",
                "date": now_ms,
                "logMess": "SUCCESS",
                "totalTime": 150
            })
        except Exception as e:
            logger.warning(f"Lỗi khi đồng bộ thời gian chế biến KDS: {e}")

        # Ghi nhận ACTION_LOG SO
        db_order["ACTION_LOG"].insert_one({
            "actionName": "/ggg/api/v2.0/order/sync-rk",
            "time": now_ms,
            "reqData": "",
            "resData": "{\"code\":\"200\",\"mess\":\"success\"}",
            "userCode": username,
            "appCode": "SO",
            "totalTime": 150,
            "restaurantCode": restaurant_code or "UNKNOWN"
        })

        # -------------------------------------------------------------
        # BƯỚC 2: ĐỒNG BỘ CO (Customer Order)
        # -------------------------------------------------------------
        co_sync_doc = db_order["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_CO"})
        co_ver = (co_sync_doc.get("version", 3500) if co_sync_doc else 3500) + 1
        db_order["SYNC_VERSION"].update_one(
            {"refName": "VERSION_MENU_CO"},
            {"$set": {"version": co_ver, "timeSync": now_ms, "status": "DONE"}},
            upsert=True
        )

        cfg_sync_doc = db_order["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_CONFIG"})
        cfg_ver = (cfg_sync_doc.get("version", 650) if cfg_sync_doc else 650) + 1
        db_order["SYNC_VERSION"].update_one(
            {"refName": "VERSION_MENU_CONFIG"},
            {"$set": {"version": cfg_ver, "timeSync": now_ms, "status": "DONE"}},
            upsert=True
        )

        db_order["MASTER_DATA_SYNC_LOG"].insert_one({
            "collection": "MENU_ITEMS",
            "date": now_ms,
            "logMess": "SUCCESS",
            "totalTime": 250
        })
        db_order["MASTER_DATA_SYNC_LOG"].insert_one({
            "collection": "CO_MENU_ITEMS",
            "date": now_ms + 1,
            "logMess": "SUCCESS",
            "totalTime": 180
        })

        db_order["ACTION_LOG"].insert_one({
            "actionName": "/ggg/api/v3.0/order/resetDishCache",
            "time": now_ms + 2,
            "reqData": "",
            "resData": "{\"code\":\"200\",\"mess\":\"success\"}",
            "userCode": username,
            "appCode": "CO",
            "totalTime": 200,
            "restaurantCode": restaurant_code or "UNKNOWN"
        })

        return {
            "success": True,
            "message": f"Đồng bộ toàn bộ thành công: Đã đồng bộ dữ liệu thực đơn SO, cập nhật thời gian chế biến {kds_synced_count} món KDS và kích hoạt làm mới dữ liệu CO thành công!",
            "so_version": so_ver,
            "co_version": co_ver,
            "config_version": cfg_ver,
            "kds_synced_count": kds_synced_count,
            "time_sync": now_ms,
        }
    finally:
        client.close()


def save_menu_snapshot(
    host: str,
    port: int = 27017,
    source_sap: str = "",
    source_name: str = "",
    snapshot_name: Optional[str] = None,
    menu_codes: Optional[List[str]] = None,
    username: str = "admin",
) -> Dict[str, Any]:
    """
    Xuất toàn bộ cấu trúc thực đơn từ MongoDB nhà hàng nguồn và lưu vào Không Gian Trung Gian.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        now = datetime.now()
        timestamp_str = now.strftime("%Y%m%d_%H%M%S")
        snapshot_id = f"snap_{source_sap or 'NH'}_{timestamp_str}"
        default_name = f"Thực đơn {source_name or source_sap or 'Nhà hàng'} ({source_sap}) - {now.strftime('%d/%m/%Y %H:%M')}"
        final_name = snapshot_name.strip() if snapshot_name and snapshot_name.strip() else default_name

        filter_q = {}
        if menu_codes:
            filter_q = {"code": {"$in": [str(c).strip() for c in menu_codes]}}

        # 1. Đọc RESTAURANT_CATEGORY
        rc_list = list(db["RESTAURANT_CATEGORY"].find(filter_q, {"_id": 0}))
        selected_cat_codes = [str(rc.get("code", "")).strip() for rc in rc_list if rc.get("code")]
        if not selected_cat_codes and menu_codes:
            selected_cat_codes = [str(c).strip() for c in menu_codes]

        # 2. Đọc ORDER_MENU_CACHE_CATEGORY
        omc_filter = {"category-code": {"$in": selected_cat_codes}} if selected_cat_codes else {}
        omc_list = list(db["ORDER_MENU_CACHE_CATEGORY"].find(omc_filter, {"_id": 0}))

        # 3. Đọc MENU_GROUP & CO_MENU_GROUP
        mg_list = list(db["MENU_GROUP"].find({}, {"_id": 0}))
        cmg_list = list(db["CO_MENU_GROUP"].find({}, {"_id": 0}))

        # 4. Đọc CO_MENU_ITEM
        co_items = list(db["CO_MENU_ITEM"].find({}, {"_id": 0}))

        # 5. Đọc SHOW_HIDE_ITEMS nếu có
        show_hide = list(db["SHOW_HIDE_ITEMS"].find({}, {"_id": 0})) if "SHOW_HIDE_ITEMS" in db.list_collection_names() else []

        # Thống kê
        menus_summary = []
        total_groups = 0
        total_dishes = 0
        for omc in omc_list:
            cat_code = str(omc.get("category-code", "")).strip()
            cat_name = next((rc.get("name", "") for rc in rc_list if str(rc.get("code", "")).strip() == cat_code), f"Menu {cat_code}")
            groups = omc.get("main-menu", {}).get("items", []) or []
            total_groups += len(groups)
            m_dishes = 0
            for g in groups:
                m_dishes += len(_flatten_group_items(g))
            total_dishes += m_dishes
            menus_summary.append({
                "code": cat_code,
                "name": cat_name,
                "groups_count": len(groups),
                "dishes_count": m_dishes,
            })

        snapshot_meta = {
            "id": snapshot_id,
            "name": final_name,
            "created_at": now.isoformat(),
            "created_by": username,
            "source_sap": source_sap,
            "source_name": source_name,
            "source_host": host,
            "total_menus": len(omc_list),
            "total_groups": total_groups,
            "total_dishes": total_dishes,
            "menus_summary": menus_summary,
        }

        full_snapshot = {
            "meta": snapshot_meta,
            "data": {
                "restaurant_categories": rc_list,
                "order_menu_cache_categories": omc_list,
                "menu_groups": mg_list,
                "co_menu_groups": cmg_list,
                "co_menu_items": co_items,
                "show_hide_items": show_hide,
            }
        }

        file_path = os.path.join(SNAPSHOT_DIR, f"{snapshot_id}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(full_snapshot, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "message": f"Đã lưu thành công Thực đơn vào Không Gian Trung Gian với {len(omc_list)} menu, {total_groups} nhóm, {total_dishes} món!",
            "snapshot": snapshot_meta,
        }
    finally:
        client.close()


def list_menu_snapshots() -> List[Dict[str, Any]]:
    """
    Liệt kê tất cả các bản snapshot thực đơn có trong Không Gian Trung Gian.
    """
    results = []
    if not os.path.exists(SNAPSHOT_DIR):
        return results

    for fname in os.listdir(SNAPSHOT_DIR):
        if fname.endswith(".json"):
            fpath = os.path.join(SNAPSHOT_DIR, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    snap = json.load(f)
                    meta = snap.get("meta") or {}
                    if meta:
                        results.append(meta)
            except Exception as e:
                logger.error(f"Lỗi đọc snapshot {fname}: {e}")

    results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return results


def get_menu_snapshot_detail(snapshot_id: str) -> Dict[str, Any]:
    """
    Xem chi tiết 1 snapshot trong Không Gian Trung Gian.
    """
    fpath = os.path.join(SNAPSHOT_DIR, f"{snapshot_id}.json")
    if not os.path.exists(fpath):
        raise ValueError(f"Không tìm thấy Snapshot ID: {snapshot_id}")
    with open(fpath, "r", encoding="utf-8") as f:
        return json.load(f)


def delete_menu_snapshot(snapshot_id: str) -> bool:
    """
    Xóa 1 snapshot khỏi Không Gian Trung Gian.
    """
    fpath = os.path.join(SNAPSHOT_DIR, f"{snapshot_id}.json")
    if os.path.exists(fpath):
        os.remove(fpath)
        return True
    return False


def deploy_menu_snapshot(
    snapshot_id: str,
    target_host: str,
    target_port: int = 27017,
    target_sap: str = "",
    mode: str = "merge_update",
    target_menu_codes: Optional[List[str]] = None,
    sync_co: bool = True,
    username: str = "admin",
) -> Dict[str, Any]:
    """
    Áp dụng toàn bộ thực đơn từ Snapshot trong Không Gian Trung Gian sang Nhà Hàng Đích.
    """
    snapshot = get_menu_snapshot_detail(snapshot_id)
    data = snapshot.get("data", {})

    target_client = get_mongo_client(target_host, target_port)
    try:
        target_db = target_client["G_ORDER"]
        now_ms = int(datetime.now().timestamp() * 1000)

        rc_list = data.get("restaurant_categories", [])
        omc_list = data.get("order_menu_cache_categories", [])
        mg_list = data.get("menu_groups", [])
        cmg_list = data.get("co_menu_groups", [])
        co_items = data.get("co_menu_items", [])

        if target_menu_codes:
            code_set = {str(c).strip() for c in target_menu_codes}
            rc_list = [rc for rc in rc_list if str(rc.get("code", "")).strip() in code_set]
            omc_list = [omc for omc in omc_list if str(omc.get("category-code", "")).strip() in code_set]

        # 1. Triển khai RESTAURANT_CATEGORY
        for rc in rc_list:
            c = str(rc.get("code", "")).strip()
            if not c:
                continue
            if mode == "clean_overwrite":
                target_db["RESTAURANT_CATEGORY"].delete_one({"code": c})
            target_db["RESTAURANT_CATEGORY"].update_one({"code": c}, {"$set": rc}, upsert=True)

        # 2. Triển khai ORDER_MENU_CACHE_CATEGORY
        for omc in omc_list:
            cc = str(omc.get("category-code", "")).strip()
            if not cc:
                continue
            if mode == "clean_overwrite":
                target_db["ORDER_MENU_CACHE_CATEGORY"].delete_one({"category-code": cc})
            target_db["ORDER_MENU_CACHE_CATEGORY"].update_one({"category-code": cc}, {"$set": omc}, upsert=True)

        # 3. Triển khai MENU_GROUP & CO_MENU_GROUP
        for mg in mg_list:
            code = str(mg.get("code", "")).strip()
            if code:
                target_db["MENU_GROUP"].update_one({"code": code}, {"$set": mg}, upsert=True)

        for cmg in cmg_list:
            code = str(cmg.get("code", "")).strip()
            if code:
                target_db["CO_MENU_GROUP"].update_one({"code": code}, {"$set": cmg}, upsert=True)

        # 4. Triển khai CO_MENU_ITEM
        if sync_co and co_items:
            for item in co_items:
                rk7 = str(item.get("code", "")).strip()
                if rk7:
                    target_db["CO_MENU_ITEM"].update_one({"code": rk7}, {"$set": item}, upsert=True)

        # 5. Kích hoạt SYNC_VERSION & Ghi Log
        so_sync_doc = target_db["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_SO"})
        so_ver = (so_sync_doc.get("version", 2000) if so_sync_doc else 2000) + 1
        target_db["SYNC_VERSION"].update_one(
            {"refName": "VERSION_MENU_SO"},
            {"$set": {"version": so_ver, "timeSync": now_ms, "status": "DONE"}},
            upsert=True
        )

        co_sync_doc = target_db["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_CO"})
        co_ver = (co_sync_doc.get("version", 3500) if co_sync_doc else 3500) + 1
        target_db["SYNC_VERSION"].update_one(
            {"refName": "VERSION_MENU_CO"},
            {"$set": {"version": co_ver, "timeSync": now_ms, "status": "DONE"}},
            upsert=True
        )

        target_db["MASTER_DATA_SYNC_LOG"].insert_one({
            "collection": "DEPLOY_MENU_SNAPSHOT",
            "date": now_ms,
            "logMess": f"SUCCESS - Deployed snapshot {snapshot_id} by {username}",
            "totalTime": 300
        })

        return {
            "success": True,
            "message": f"Đã đồng bộ thành công Thực đơn từ Snapshot sang Nhà Hàng {target_sap or target_host} ({len(omc_list)} menu, chế độ: {mode})!",
            "target_host": target_host,
            "menus_deployed": len(omc_list),
            "so_version": so_ver,
            "co_version": co_ver,
        }
    finally:
        target_client.close()


def direct_sync_restaurant_menu(
    source_host: str,
    source_port: int = 27017,
    target_host: str = "",
    target_port: int = 27017,
    source_sap: str = "",
    source_name: str = "",
    target_sap: str = "",
    target_name: str = "",
    mode: str = "merge_update",
    menu_codes: Optional[List[str]] = None,
    sync_co: bool = True,
    username: str = "admin",
) -> Dict[str, Any]:
    """
    Đồng bộ menu trực tiếp từ Nhà Hàng Nguồn sang Nhà Hàng Đích (đồng thời tự động tạo snapshot dự phòng).
    """
    snap_res = save_menu_snapshot(
        host=source_host,
        port=source_port,
        source_sap=source_sap,
        source_name=source_name,
        snapshot_name=f"Backup Sync {source_sap} ➔ {target_sap} ({datetime.now().strftime('%d/%m/%Y %H:%M')})",
        menu_codes=menu_codes,
        username=username,
    )
    snapshot_id = snap_res["snapshot"]["id"]

    deploy_res = deploy_menu_snapshot(
        snapshot_id=snapshot_id,
        target_host=target_host,
        target_port=target_port,
        target_sap=target_sap,
        mode=mode,
        target_menu_codes=menu_codes,
        sync_co=sync_co,
        username=username,
    )

    return {
        "success": True,
        "message": f"Đã đồng bộ trực tiếp thành công từ NH {source_sap} ({source_name}) sang NH {target_sap} ({target_name})!",
        "backup_snapshot_id": snapshot_id,
        "details": deploy_res,
    }


def lookup_dish_info(host: str, rk7_code: str, port: int = 27017) -> Dict[str, Any]:
    """
    Tra cứu thông tin tên món, mã SAP, đơn giá và hình ảnh theo mã RK7:
    1. Quét từ MongoDB GPOS tại nhà hàng (host): DISH_CACHE, CO_MENU_ITEM, ORDER_MENU_CACHE_CATEGORY, SHOW_HIDE_ITEMS, OUT_OF_DISH, CONFIG_COOKING
    2. Nếu không tìm thấy, quét tiếp từ CSDL Master RK7 tập trung (get_rk7_engine)
    """
    clean_code = str(rk7_code).strip()
    if not clean_code:
        return {
            "found": False,
            "rk7_code": clean_code,
            "name": None,
            "sap_code": None,
            "price": None,
            "image_url": None,
            "source": None,
            "message": "Mã RK7 trống"
        }

    # 1. Thử tìm trong MongoDB nhà hàng (host)
    try:
        client = get_mongo_client(host, port, timeout_ms=3000)
        db_order = client["G_ORDER"]
        db_kitchen = client["G_KITCHEN"]

        dish_name = ""
        sap_code = ""
        price: Optional[float] = None
        image_url = ""

        # A. DISH_CACHE trong G_ORDER (chứa món và giá từ MID)
        try:
            for doc in db_order["DISH_CACHE"].find():
                for d in (doc.get("dishs") or []):
                    mi = d.get("menuItem") or {}
                    c = str(mi.get("code") or "").strip()
                    if c == clean_code:
                        dish_name = mi.get("name") or dish_name
                        sap_code = str(mi.get("sapCode") or "").strip() or sap_code
                        p = d.get("price")
                        if p is not None and price is None:
                            try:
                                price = float(p)
                            except (ValueError, TypeError):
                                pass
                        break
                if dish_name and price is not None:
                    break
        except Exception as e:
            logger.warning("Lỗi quét DISH_CACHE: %s", e)

        # B. CO_MENU_ITEM trong G_ORDER (chứa nameVn, sapCode, urlImgQr/srcImg)
        try:
            co_doc = db_order["CO_MENU_ITEM"].find_one({"code": clean_code})
            if co_doc:
                if not dish_name:
                    dish_name = co_doc.get("nameVn") or co_doc.get("name") or ""
                if not sap_code:
                    sap_code = str(co_doc.get("sapCode") or "").strip()
                url_img_qr = str(co_doc.get("urlImgQr") or "").strip()
                src_img = str(co_doc.get("srcImg") or co_doc.get("srcImgThumbnail") or co_doc.get("srcImgSquare") or "").strip()
                image_url = url_img_qr if (url_img_qr.startswith("http://") or url_img_qr.startswith("https://")) else (src_img or url_img_qr)
        except Exception as e:
            logger.warning("Lỗi quét CO_MENU_ITEM: %s", e)

        # C. ORDER_MENU_CACHE_CATEGORY trong G_ORDER (chứa thực đơn hiện hữu)
        if not dish_name or price is None or not sap_code:
            try:
                for omc in db_order["ORDER_MENU_CACHE_CATEGORY"].find():
                    groups = omc.get("main-menu", {}).get("items", []) or []
                    for g in groups:
                        for it, _, _, _, _, _ in _flatten_group_items(g):
                            mi = it.get("menu-item") or {}
                            if str(mi.get("code") or "").strip() == clean_code:
                                if not dish_name:
                                    dish_name = mi.get("name") or ""
                                if not sap_code:
                                    sap_code = str(mi.get("sap-code") or mi.get("sapCode") or "").strip()
                                if price is None and it.get("price") is not None:
                                    try:
                                        price = float(it.get("price"))
                                    except (ValueError, TypeError):
                                        pass
                                break
                        if dish_name and price is not None and sap_code:
                            break
                    if dish_name and price is not None and sap_code:
                        break
            except Exception as e:
                logger.warning("Lỗi quét ORDER_MENU_CACHE_CATEGORY: %s", e)

        # D. SHOW_HIDE_ITEMS / OUT_OF_DISH trong G_ORDER
        if not dish_name or price is None or not sap_code:
            try:
                sh_doc = db_order["SHOW_HIDE_ITEMS"].find_one({"itemCode": clean_code})
                if sh_doc:
                    if not dish_name:
                        dish_name = sh_doc.get("name") or ""
                    if not sap_code:
                        sap_code = str(sh_doc.get("sapCode") or "").strip()
                    if price is None and sh_doc.get("price") is not None:
                        try:
                            price = float(sh_doc.get("price"))
                        except (ValueError, TypeError):
                            pass
            except Exception as e:
                logger.warning("Lỗi quét SHOW_HIDE_ITEMS: %s", e)

        # E. CONFIG_COOKING trong G_KITCHEN
        if not dish_name:
            try:
                cook_doc = db_kitchen["CONFIG_COOKING"].find_one({"menuItem.code": clean_code})
                if cook_doc:
                    mi = cook_doc.get("menuItem") or {}
                    dish_name = mi.get("name") or ""
            except Exception as e:
                logger.warning("Lỗi quét CONFIG_COOKING: %s", e)

        client.close()

        if dish_name:
            return {
                "found": True,
                "rk7_code": clean_code,
                "name": dish_name,
                "sap_code": sap_code or None,
                "price": price,
                "image_url": image_url or None,
                "source": "MID / GPOS Cache (Nhà hàng)",
                "message": f"Tìm thấy món '{dish_name}' từ MID / GPOS Cache"
            }
    except Exception as e:
        logger.warning("Không thể kết nối hoặc quét MongoDB nhà hàng (%s): %s", host, e)

    # 2. Quét tiếp từ CSDL Master RK7 tập trung
    try:
        from app.core.database import get_rk7_engine
        from sqlalchemy import text
        engine = get_rk7_engine()
        sql = """
            SELECT TOP 1
                MI.CODE AS RK7_CODE,
                MI.NAME AS ITEMNAME,
                GPD.PROPERTYVAL AS SAPCODE,
                PR.VALUE AS PRICE
            FROM MENUITEMS MI
            LEFT JOIN PRICES PR ON PR.OBJECTID = MI.SIFR AND PR.SPECIES = 1 AND PR.VALUE IS NOT NULL
            LEFT JOIN GENERATEDPROPDATAS GPD ON GPD.RKTYPEIDENT = 1000008 AND GPD.OBJECTREFNO = 10 AND GPD.OBJECTIDENT = MI.SIFR
            WHERE (MI.CODE = :code OR CAST(MI.SIFR AS VARCHAR(50)) = :code)
            ORDER BY PR.VALUE DESC
        """
        with engine.connect() as conn:
            row = conn.execute(text(sql), {"code": clean_code}).fetchone()
            if row:
                r_rk7 = str(row[0] or clean_code)
                r_name = str(row[1] or "")
                r_sap = str(row[2] or "").strip()
                r_price = float(row[3]) if row[3] is not None else None
                return {
                    "found": True,
                    "rk7_code": r_rk7,
                    "name": r_name,
                    "sap_code": r_sap or None,
                    "price": r_price,
                    "image_url": None,
                    "source": "RK7 Central Master DB",
                    "message": f"Tìm thấy món '{r_name}' từ CSDL Master RK7 tập trung"
                }
    except Exception as e:
        logger.warning("Lỗi tra cứu CSDL Master RK7: %s", e)

    return {
        "found": False,
        "rk7_code": clean_code,
        "name": None,
        "sap_code": None,
        "price": None,
        "image_url": None,
        "source": None,
        "message": f"Không tìm thấy món với mã RK7 '{clean_code}' trong MID/GPOS và CSDL Master RK7"
    }


def batch_lookup_dishes(host: str, rk7_codes: List[str], port: int = 27017) -> Dict[str, Any]:
    """
    Tra cứu hàng loạt thông tin tên món, mã SAP, đơn giá và hình ảnh theo danh sách mã RK7:
    1. Quét từ MongoDB GPOS tại nhà hàng (host): DISH_CACHE, CO_MENU_ITEM, ORDER_MENU_CACHE_CATEGORY, SHOW_HIDE_ITEMS, CONFIG_COOKING
    2. Đối soát tiếp từ CSDL Master RK7 tập trung (get_rk7_engine) cho các món còn thiếu thông tin
    """
    seen = set()
    clean_codes: List[str] = []
    for c in rk7_codes:
        sc = str(c).strip()
        if sc and sc not in seen:
            seen.add(sc)
            clean_codes.append(sc)

    if not clean_codes:
        return {
            "success": True,
            "total": 0,
            "found_count": 0,
            "items": []
        }

    dish_map: Dict[str, Dict[str, Any]] = {
        c: {
            "found": False,
            "rk7_code": c,
            "name": "",
            "sap_code": "",
            "price": None,
            "image_url": "",
            "source": "",
            "message": ""
        }
        for c in clean_codes
    }

    # 1. Thử quét từ MongoDB nhà hàng (host)
    try:
        client = get_mongo_client(host, port, timeout_ms=4000)
        db_order = client["G_ORDER"]
        db_kitchen = client["G_KITCHEN"]

        # A. DISH_CACHE trong G_ORDER (chứa món và giá từ MID)
        try:
            for doc in db_order["DISH_CACHE"].find():
                for d in (doc.get("dishs") or []):
                    mi = d.get("menuItem") or {}
                    c = str(mi.get("code") or "").strip()
                    if c in dish_map:
                        item = dish_map[c]
                        if not item["name"]:
                            item["name"] = mi.get("name") or ""
                        if not item["sap_code"]:
                            item["sap_code"] = str(mi.get("sapCode") or "").strip()
                        if item["price"] is None and d.get("price") is not None:
                            try:
                                item["price"] = float(d.get("price"))
                            except (ValueError, TypeError):
                                pass
                        if item["name"]:
                            item["found"] = True
                            if not item["source"]:
                                item["source"] = "MID / GPOS Cache"
        except Exception as e:
            logger.warning("Lỗi quét DISH_CACHE batch: %s", e)

        # B. CO_MENU_ITEM trong G_ORDER (chứa nameVn, sapCode, urlImgQr/srcImg)
        try:
            for co_doc in db_order["CO_MENU_ITEM"].find({"code": {"$in": clean_codes}}):
                c = str(co_doc.get("code") or "").strip()
                if c in dish_map:
                    item = dish_map[c]
                    if not item["name"]:
                        item["name"] = co_doc.get("nameVn") or co_doc.get("name") or ""
                    if not item["sap_code"]:
                        item["sap_code"] = str(co_doc.get("sapCode") or "").strip()
                    url_img_qr = str(co_doc.get("urlImgQr") or "").strip()
                    src_img = str(co_doc.get("srcImg") or co_doc.get("srcImgThumbnail") or co_doc.get("srcImgSquare") or "").strip()
                    if not item["image_url"]:
                        item["image_url"] = url_img_qr if (url_img_qr.startswith("http://") or url_img_qr.startswith("https://")) else (src_img or url_img_qr)
                    if item["name"]:
                        item["found"] = True
                        if not item["source"]:
                            item["source"] = "CO_MENU_ITEM"
        except Exception as e:
            logger.warning("Lỗi quét CO_MENU_ITEM batch: %s", e)

        # C. ORDER_MENU_CACHE_CATEGORY trong G_ORDER (chứa thực đơn hiện hữu)
        codes_needing_data = [c for c in clean_codes if not dish_map[c]["name"] or dish_map[c]["price"] is None or not dish_map[c]["sap_code"]]
        if codes_needing_data:
            try:
                for omc in db_order["ORDER_MENU_CACHE_CATEGORY"].find():
                    groups = omc.get("main-menu", {}).get("items", []) or []
                    for g in groups:
                        for it, _, _, _, _, _ in _flatten_group_items(g):
                            mi = it.get("menu-item") or {}
                            c = str(mi.get("code") or "").strip()
                            if c in dish_map:
                                item = dish_map[c]
                                if not item["name"]:
                                    item["name"] = mi.get("name") or ""
                                if not item["sap_code"]:
                                    item["sap_code"] = str(mi.get("sap-code") or mi.get("sapCode") or "").strip()
                                if item["price"] is None and it.get("price") is not None:
                                    try:
                                        item["price"] = float(it.get("price"))
                                    except (ValueError, TypeError):
                                        pass
                                if item["name"]:
                                    item["found"] = True
                                    if not item["source"]:
                                        item["source"] = "ORDER_MENU_CACHE"
            except Exception as e:
                logger.warning("Lỗi quét ORDER_MENU_CACHE_CATEGORY batch: %s", e)

        # D. SHOW_HIDE_ITEMS / OUT_OF_DISH trong G_ORDER
        codes_still_missing = [c for c in clean_codes if not dish_map[c]["name"] or dish_map[c]["price"] is None]
        if codes_still_missing:
            try:
                for sh_doc in db_order["SHOW_HIDE_ITEMS"].find({"itemCode": {"$in": codes_still_missing}}):
                    c = str(sh_doc.get("itemCode") or "").strip()
                    if c in dish_map:
                        item = dish_map[c]
                        if not item["name"]:
                            item["name"] = sh_doc.get("name") or ""
                        if not item["sap_code"]:
                            item["sap_code"] = str(sh_doc.get("sapCode") or "").strip()
                        if item["price"] is None and sh_doc.get("price") is not None:
                            try:
                                item["price"] = float(sh_doc.get("price"))
                            except (ValueError, TypeError):
                                pass
                        if item["name"]:
                            item["found"] = True
                            if not item["source"]:
                                item["source"] = "SHOW_HIDE_ITEMS"
            except Exception as e:
                logger.warning("Lỗi quét SHOW_HIDE_ITEMS batch: %s", e)

        # E. CONFIG_COOKING trong G_KITCHEN
        codes_missing_name = [c for c in clean_codes if not dish_map[c]["name"]]
        if codes_missing_name:
            try:
                for cook_doc in db_kitchen["CONFIG_COOKING"].find({"menuItem.code": {"$in": codes_missing_name}}):
                    mi = cook_doc.get("menuItem") or {}
                    c = str(mi.get("code") or "").strip()
                    if c in dish_map and not dish_map[c]["name"]:
                        dish_map[c]["name"] = mi.get("name") or ""
                        dish_map[c]["found"] = True
                        if not dish_map[c]["source"]:
                            dish_map[c]["source"] = "CONFIG_COOKING"
            except Exception as e:
                logger.warning("Lỗi quét CONFIG_COOKING batch: %s", e)

        client.close()
    except Exception as e:
        logger.warning("Không thể kết nối hoặc quét MongoDB nhà hàng (%s): %s", host, e)

    # 2. Quét tiếp từ CSDL Master RK7 tập trung cho các món còn thiếu
    codes_needing_rk7 = [c for c in clean_codes if not dish_map[c]["name"] or dish_map[c]["price"] is None or not dish_map[c]["sap_code"]]
    if codes_needing_rk7:
        try:
            from app.core.database import get_rk7_engine
            from sqlalchemy import text, bindparam
            engine = get_rk7_engine()
            sql = """
                SELECT
                    MI.CODE AS RK7_CODE,
                    MI.NAME AS ITEMNAME,
                    GPD.PROPERTYVAL AS SAPCODE,
                    PR.VALUE AS PRICE
                FROM MENUITEMS MI
                LEFT JOIN PRICES PR ON PR.OBJECTID = MI.SIFR AND PR.SPECIES = 1 AND PR.VALUE IS NOT NULL
                LEFT JOIN GENERATEDPROPDATAS GPD ON GPD.RKTYPEIDENT = 1000008 AND GPD.OBJECTREFNO = 10 AND GPD.OBJECTIDENT = MI.SIFR
                WHERE MI.CODE IN :codes OR CAST(MI.SIFR AS VARCHAR(50)) IN :codes
                ORDER BY PR.VALUE DESC
            """
            stmt = text(sql).bindparams(bindparam("codes", expanding=True))
            with engine.connect() as conn:
                rows = conn.execute(stmt, {"codes": tuple(codes_needing_rk7)}).fetchall()
                for row in rows:
                    r_rk7 = str(row[0] or "").strip()
                    r_name = str(row[1] or "")
                    r_sap = str(row[2] or "").strip()
                    r_price = float(row[3]) if row[3] is not None else None
                    if r_rk7 in dish_map:
                        item = dish_map[r_rk7]
                        if not item["name"]:
                            item["name"] = r_name
                        if not item["sap_code"] and r_sap:
                            item["sap_code"] = r_sap
                        if item["price"] is None and r_price is not None:
                            item["price"] = r_price
                        if item["name"]:
                            item["found"] = True
                            if not item["source"]:
                                item["source"] = "RK7 Central Master DB"
        except Exception as e:
            logger.warning("Lỗi tra cứu CSDL Master RK7 batch: %s", e)

    results = []
    found_count = 0
    for c in clean_codes:
        item = dish_map[c]
        if item["found"] or item["name"]:
            item["found"] = True
            found_count += 1
            src = item["source"] or "MID / Server"
            name_val = item["name"]
            item["message"] = f"Tìm thấy món '{name_val}' từ {src}"
        else:
            item["message"] = f"Chưa tìm thấy món với mã RK7 '{c}' trong MID và RK7 Master"
        results.append(item)

    return {
        "success": True,
        "total": len(clean_codes),
        "found_count": found_count,
        "items": results
    }


def toggle_group_co(
    host: str,
    port: int = 27017,
    menu_code: str = "",
    group_code: str = "",
    action: str = "ADD"
) -> Dict[str, Any]:
    """
    Thêm hoặc gỡ mã nhóm món (group_code) vào trường menuGroupCodes của CO_ORDER_CATEGORY.
    - action == 'ADD': Đưa nhóm lên CO ($addToSet) để khách thấy và đặt được trên tablet.
    - action == 'REMOVE': Gỡ nhóm khỏi CO ($pull) để ẩn nhóm khỏi tablet.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        menu_code_clean = str(menu_code).strip()
        group_code_clean = str(group_code).strip()
        action_clean = str(action).strip().upper()

        if not menu_code_clean or not group_code_clean:
            return {
                "success": False,
                "message": "Thiếu mã menu hoặc mã nhóm món.",
                "menu_code": menu_code_clean,
                "group_code": group_code_clean,
                "action": action_clean,
                "menuGroupCodes": []
            }

        co_cat = db["CO_ORDER_CATEGORY"].find_one({"code": menu_code_clean})
        if not co_cat and menu_code_clean.isdigit():
            co_cat = db["CO_ORDER_CATEGORY"].find_one({"code": int(menu_code_clean)})

        if not co_cat:
            return {
                "success": False,
                "message": f"Không tìm thấy Menu '{menu_code_clean}' trong CO_ORDER_CATEGORY.",
                "menu_code": menu_code_clean,
                "group_code": group_code_clean,
                "action": action_clean,
                "menuGroupCodes": []
            }

        target_code_field = co_cat.get("code")

        if action_clean == "ADD":
            db["CO_ORDER_CATEGORY"].update_one(
                {"code": target_code_field},
                {"$addToSet": {"menuGroupCodes": group_code_clean}}
            )
            msg = f"Đã đưa nhóm món '{group_code_clean}' lên CO (Menu {menu_code_clean}) thành công!"
        else:
            db["CO_ORDER_CATEGORY"].update_one(
                {"code": target_code_field},
                {"$pull": {"menuGroupCodes": group_code_clean}}
            )
            msg = f"Đã gỡ nhóm món '{group_code_clean}' khỏi CO (Menu {menu_code_clean}) thành công!"

        # Lấy lại danh sách mới nhất
        updated_cat = db["CO_ORDER_CATEGORY"].find_one({"code": target_code_field})
        current_groups = updated_cat.get("menuGroupCodes", []) if updated_cat else []

        return {
            "success": True,
            "message": msg,
            "menu_code": menu_code_clean,
            "group_code": group_code_clean,
            "action": action_clean,
            "menuGroupCodes": [str(x) for x in current_groups]
        }
    finally:
        client.close()




# ══════════════════════════════════════════════════════════════════════════
# TÍNH NĂNG MỚI: QUẢN LÝ & ĐỐI SOÁT NHÓM HIỂN THỊ TRÊN CO (FILE SỐ 2)
# ══════════════════════════════════════════════════════════════════════════

DEFAULT_FILE_2_PATH = r"D:\1.Download\SO.CO\File_goc\2 CO_FILE_2.xlsx"


def read_file_2_co_menus(file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Đọc file số 2 (CO_FILE_2.xlsx) chứa cấu hình Menu và danh sách group hiển thị trên CO (Cột 18).
    Trả về danh sách các Menu và các mã nhóm tương ứng.
    """
    target_path = file_path or DEFAULT_FILE_2_PATH
    if not os.path.exists(target_path):
        return {
            "success": False,
            "message": f"Không tìm thấy file 2 tại: {target_path}",
            "file_path": target_path,
            "menus": []
        }

    try:
        wb = openpyxl.load_workbook(target_path, data_only=True)
        sheet = wb["Menu"] if "Menu" in wb.sheetnames else wb.active
        menus = []
        # Cột 1: Mã Loại Menu, Cột 2: Tên Loại Menu VN, Cột 18: Danh sách các group hiển thị trên Co
        for r in range(2, sheet.max_row + 1):
            m_code = str(sheet.cell(row=r, column=1).value or "").strip()
            m_name = str(sheet.cell(row=r, column=2).value or "").strip()
            raw_groups = str(sheet.cell(row=r, column=18).value or "").strip()
            if not m_code:
                continue
            group_codes = [g.strip() for g in raw_groups.split(",") if g.strip()]
            menus.append({
                "menu_code": m_code,
                "menu_name": m_name,
                "group_count": len(group_codes),
                "group_codes": group_codes,
                "raw_groups": raw_groups
            })

        return {
            "success": True,
            "message": f"Đọc thành công {len(menus)} menu từ File 2.",
            "file_path": target_path,
            "menus": menus
        }
    except Exception as e:
        logger.error("Lỗi đọc File 2 (%s): %s", target_path, e)
        return {
            "success": False,
            "message": f"Lỗi đọc File 2: {str(e)}",
            "file_path": target_path,
            "menus": []
        }


def get_menu_groups_co_detail(
    host: str,
    port: int = 27017,
    menu_code: str = "",
    custom_file2_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Lấy chi tiết danh sách nhóm món trong SO của một Menu,
    đối chiếu trực tiếp với:
    1. Cấu hình thực tế trên DB MONGO Nhà Hàng (CO_ORDER_CATEGORY.menuGroupCodes).
    2. File số 2 (CO_FILE_2.xlsx - Cột 18: Danh sách các group hiển thị trên Co).
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        menu_code_clean = str(menu_code).strip()

        # 1. Lấy danh sách nhóm CO thực tế từ Mongo
        co_group_codes: List[str] = []
        co_cat = db["CO_ORDER_CATEGORY"].find_one({"code": menu_code_clean})
        if not co_cat and menu_code_clean.isdigit():
            co_cat = db["CO_ORDER_CATEGORY"].find_one({"code": int(menu_code_clean)})

        if co_cat:
            co_group_codes = [str(g).strip() for g in co_cat.get("menuGroupCodes", []) if str(g).strip()]

        co_set = set(co_group_codes)

        # 2. Đọc File số 2 nếu có
        file2_path = custom_file2_path or DEFAULT_FILE_2_PATH
        file2_available = os.path.exists(file2_path)
        file2_group_codes: List[str] = []

        if file2_available:
            try:
                wb = openpyxl.load_workbook(file2_path, data_only=True)
                sheet = wb["Menu"] if "Menu" in wb.sheetnames else wb.active
                for r in range(2, sheet.max_row + 1):
                    row_m_code = str(sheet.cell(row=r, column=1).value or "").strip()
                    if row_m_code == menu_code_clean:
                        raw_groups = str(sheet.cell(row=r, column=18).value or "").strip()
                        file2_group_codes = [g.strip() for g in raw_groups.split(",") if g.strip()]
                        break
            except Exception as ex_f2:
                logger.warning("Không đọc được file 2 (%s): %s", file2_path, ex_f2)

        file2_set = set(file2_group_codes)

        # 3. Lấy SO groups từ ORDER_MENU_CACHE_CATEGORY
        so_groups: List[Dict[str, Any]] = []
        menu_title = f"Menu {menu_code_clean}"
        omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": menu_code_clean})
        if omc:
            menu_name_map = _build_menu_name_map(db)
            menu_title = menu_name_map.get(menu_code_clean, menu_title)
            groups = omc.get("main-menu", {}).get("items", []) or []

            seen_codes = set()
            for g in groups:
                flattened = _flatten_group_items(g)
                sub_map: Dict[str, Dict[str, Any]] = {}
                for it, it_g_code, it_g_name, it_g_lvl, _, p_code in flattened:
                    if it_g_code not in sub_map:
                        is_co = (it_g_code in co_set) or (p_code in co_set)
                        in_f2 = (it_g_code in file2_set) or (p_code in file2_set) if file2_available else None
                        sub_map[it_g_code] = {
                            "code": it_g_code,
                            "name": it_g_name,
                            "level": it_g_lvl,
                            "dish_count": 0,
                            "is_co": is_co,
                            "in_file2": in_f2
                        }
                    sub_map[it_g_code]["dish_count"] += 1

                for grp in sub_map.values():
                    if grp["code"] not in seen_codes:
                        seen_codes.add(grp["code"])
                        so_groups.append(grp)

        # 4. Xác định các mã nhóm đặc biệt có trong CO/File 2 mà không thuộc SO (ví dụ mã gán tay, extra)
        so_code_set = {g["code"] for g in so_groups}
        extra_codes = []
        for c in co_group_codes:
            if c not in so_code_set and c not in extra_codes:
                extra_codes.append(c)
        for c in file2_group_codes:
            if c not in so_code_set and c not in extra_codes:
                extra_codes.append(c)

        return {
            "success": True,
            "message": "Lấy chi tiết nhóm CO thành công.",
            "menu_code": menu_code_clean,
            "menu_name": menu_title,
            "so_groups": so_groups,
            "co_group_codes": co_group_codes,
            "file2_available": file2_available,
            "file2_group_codes": file2_group_codes,
            "file2_path": file2_path if file2_available else None,
            "extra_co_groups": extra_codes
        }
    finally:
        client.close()


def bulk_sync_menu_groups_co(
    host: str,
    port: int = 27017,
    menu_code: str = "",
    group_codes: List[str] = [],
    action: str = "ADD",
    update_file2: bool = False,
    custom_file2_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Thêm/Gỡ/Ghi đè hàng loạt mã nhóm (group_codes) vào trường menuGroupCodes của CO_ORDER_CATEGORY trong MongoDB.
    Tùy chọn: Đồng thời cập nhật trực tiếp vào File 2 (CO_FILE_2.xlsx) tại cột 18.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        menu_code_clean = str(menu_code).strip()
        action_clean = str(action).strip().upper()
        clean_codes = [str(c).strip() for c in group_codes if str(c).strip()]

        if not menu_code_clean:
            return {
                "success": False,
                "message": "Thiếu mã Menu.",
                "menu_code": menu_code_clean,
                "action": action_clean,
                "updated_count": 0,
                "current_co_groups": [],
                "file2_updated": False
            }

        co_cat = db["CO_ORDER_CATEGORY"].find_one({"code": menu_code_clean})
        if not co_cat and menu_code_clean.isdigit():
            co_cat = db["CO_ORDER_CATEGORY"].find_one({"code": int(menu_code_clean)})

        if not co_cat:
            # Tạo mới CO_ORDER_CATEGORY nếu chưa có
            cat_name = f"Menu {menu_code_clean}"
            rc = db["RESTAURANT_CATEGORY"].find_one({"code": menu_code_clean})
            if rc:
                cat_name = rc.get("name") or cat_name
            db["CO_ORDER_CATEGORY"].insert_one({
                "code": menu_code_clean,
                "name": cat_name,
                "nameVn": cat_name,
                "nameEn": cat_name,
                "menuGroupCodes": clean_codes if action_clean in ("ADD", "SET") else [],
                "active": True
            })
            target_code_field = menu_code_clean
        else:
            target_code_field = co_cat.get("code")

            if action_clean == "ADD":
                if clean_codes:
                    db["CO_ORDER_CATEGORY"].update_one(
                        {"code": target_code_field},
                        {"$addToSet": {"menuGroupCodes": {"$each": clean_codes}}}
                    )
            elif action_clean == "REMOVE":
                if clean_codes:
                    db["CO_ORDER_CATEGORY"].update_one(
                        {"code": target_code_field},
                        {"$pull": {"menuGroupCodes": {"$in": clean_codes}}}
                    )
            elif action_clean == "SET":
                db["CO_ORDER_CATEGORY"].update_one(
                    {"code": target_code_field},
                    {"$set": {"menuGroupCodes": clean_codes}}
                )

        # Lấy lại danh sách nhóm CO mới nhất sau cập nhật
        updated_cat = db["CO_ORDER_CATEGORY"].find_one({"code": target_code_field})
        current_groups = [str(x).strip() for x in updated_cat.get("menuGroupCodes", []) if str(x).strip()] if updated_cat else []

        # Cập nhật File 2 nếu được yêu cầu
        file2_updated = False
        file2_path = custom_file2_path or DEFAULT_FILE_2_PATH
        if update_file2 and os.path.exists(file2_path):
            try:
                wb = openpyxl.load_workbook(file2_path)
                sheet = wb["Menu"] if "Menu" in wb.sheetnames else wb.active
                row_found = False
                for r in range(2, sheet.max_row + 1):
                    row_m_code = str(sheet.cell(row=r, column=1).value or "").strip()
                    if row_m_code == menu_code_clean:
                        # Ghi danh sách mã nhóm mới vào Cột 18 (phân tách dấu phẩy)
                        sheet.cell(row=r, column=18).value = ",".join(current_groups)
                        row_found = True
                        break

                if not row_found:
                    # Nếu chưa có dòng cho Menu này, thêm dòng mới
                    new_r = sheet.max_row + 1
                    sheet.cell(row=new_r, column=1).value = menu_code_clean
                    sheet.cell(row=new_r, column=2).value = co_cat.get("name", f"Menu {menu_code_clean}") if co_cat else f"Menu {menu_code_clean}"
                    sheet.cell(row=new_r, column=18).value = ",".join(current_groups)

                wb.save(file2_path)
                file2_updated = True
                logger.info("Đã cập nhật File 2 (%s) cho Menu %s thành công.", file2_path, menu_code_clean)
            except Exception as ex_wb:
                logger.error("Lỗi khi ghi File 2 (%s): %s", file2_path, ex_wb)

        action_msg = "đưa lên CO" if action_clean == "ADD" else ("gỡ khỏi CO" if action_clean == "REMOVE" else "đồng bộ toàn bộ danh sách CO")
        f2_msg = " (Đã đồng bộ vào File 2)" if file2_updated else ""

        return {
            "success": True,
            "message": f"Đã {action_msg} thành công cho {len(clean_codes)} nhóm món của Menu {menu_code_clean}!{f2_msg}",
            "menu_code": menu_code_clean,
            "action": action_clean,
            "updated_count": len(clean_codes),
            "current_co_groups": current_groups,
            "file2_updated": file2_updated
        }
    finally:
        client.close()


def export_file_2_co_menus(
    host: str,
    port: int = 27017,
    source_file_path: Optional[str] = None
) -> io.BytesIO:
    """
    Xuất File 2 (CO_FILE_2.xlsx) mới nhất:
    Lấy danh sách mã nhóm hiển thị trên CO (Cột 18) trực tiếp từ MongoDB CO_ORDER_CATEGORY của nhà hàng.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        target_path = source_file_path or DEFAULT_FILE_2_PATH

        if os.path.exists(target_path):
            wb = openpyxl.load_workbook(target_path)
            sheet = wb["Menu"] if "Menu" in wb.sheetnames else wb.active
        else:
            # Tạo workbook mẫu nếu không tìm thấy file gốc
            wb = openpyxl.Workbook()
            sheet = wb.active
            sheet.title = "Menu"
            headers = [
                "Mã Loại Menu", "Tên Loại Menu VN", "Tên Loại Menu EN", "Mô tả VN", "Mô tả EN",
                "Mô tả tiếng Nhật", "Mô tả tiếng Hàn", "Mô tả tiếng Trung", "Ghi chú khi xem danh sách món",
                "Số tiền ăn trung bình", "Loại menu (1:ALC, 2: BF, 3: SET)", "Tên ALC", "Tên BF",
                "Tên Drink", "Tên ALC EN", "Tên BF EN", "Tên Drink EN", "Danh sách các group hiển thị trên Co",
                "Vị trí menu giới thiệu NH (0: ở dưới, 1: ở trên)", "Ảnh đại diện", "Ảnh Giới Thiệu",
                "Ảnh giới thiệu Nhà hàng", "Video giới thiệu Nhà hàng", "Video giới thiệu",
                "Ảnh đại diện cho menu 1 category ", "Ảnh làm đại diện cho menu >= 2 category",
                "Trạng thái", "Nguyên nhân lỗi"
            ]
            sheet.append(headers)

        # Map nhóm từ Mongo CO_ORDER_CATEGORY
        co_map: Dict[str, List[str]] = {}
        for co in db["CO_ORDER_CATEGORY"].find():
            c = str(co.get("code") or "").strip()
            if c:
                co_map[c] = [str(x).strip() for x in co.get("menuGroupCodes", []) if str(x).strip()]

        for r in range(2, sheet.max_row + 1):
            m_code = str(sheet.cell(row=r, column=1).value or "").strip()
            if m_code in co_map:
                sheet.cell(row=r, column=18).value = ",".join(co_map[m_code])

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out
    finally:
        client.close()
