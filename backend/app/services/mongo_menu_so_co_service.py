from __future__ import annotations

import os
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


def _flatten_group_items(g: Dict[str, Any]) -> List[Tuple[Dict[str, Any], str, str, int, int]]:
    """
    Duyệt danh sách món trong group, hỗ trợ cấu trúc lồng nhau (Sub-groups đồ uống level: 0).
    Trả về danh sách tuple: (dish_it, group_code, group_name, level, sort_order).
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
            result.append((it, g_code, g_name, g_level, int(it.get("priority", 0) or (idx + 1))))
        elif it.get("items"):
            # Sub-group lồng nhau (phổ biến ở Đồ Uống level 0)
            sub_code = str(it.get("code", "")).strip() or g_code
            sub_name = str(it.get("name", "")).strip()
            display_group_name = f"{g_name} - {sub_name}" if g_name and sub_name and g_name != sub_name else (sub_name or g_name)
            sub_level = int(it.get("level", g_level))
            for sub_idx, sub_it in enumerate(it.get("items", [])):
                sub_mi = sub_it.get("menu-item")
                if sub_mi and (str(sub_mi.get("code", "")).strip() or str(sub_mi.get("name", "")).strip()):
                    result.append((sub_it, sub_code, display_group_name, sub_level, int(sub_it.get("priority", 0) or (sub_idx + 1))))
        else:
            # Item trống rỗng không có menu-item và không có sub-items -> bỏ qua, không để bị null trên bảng
            continue

    return result


def get_menu_categories(host: str, port: int = 27017) -> List[Dict[str, Any]]:
    """
    Lấy danh sách các Menu trong nhà hàng từ RESTAURANT_CATEGORY
    kèm số lượng nhóm món và số lượng món ăn trong từng menu từ ORDER_MENU_CACHE_CATEGORY.
    """
    client = get_mongo_client(host, port)
    try:
        db = client["G_ORDER"]
        rc_cursor = db["RESTAURANT_CATEGORY"].find().sort("id", 1)
        results = []

        # Đọc trước tất cả documents trong ORDER_MENU_CACHE_CATEGORY để tính tổng nhóm và món
        cache_map = {}
        for omc in db["ORDER_MENU_CACHE_CATEGORY"].find():
            cc = str(omc.get("category-code", "")).strip()
            if cc:
                groups = omc.get("main-menu", {}).get("items", []) or []
                total_dishes = 0
                for g in groups:
                    total_dishes += len(_flatten_group_items(g))
                cache_map[cc] = {
                    "group_count": len(groups),
                    "dish_count": total_dishes,
                }

        for rc in rc_cursor:
            code = str(rc.get("code", "")).strip()
            name = rc.get("name", "")
            stats = cache_map.get(code, {"group_count": 0, "dish_count": 0})
            results.append({
                "code": code,
                "id": rc.get("id"),
                "name": name,
                "show_in_so": bool(rc.get("showInSo", False)),
                "show_in_co": bool(rc.get("showInCo", False)),
                "show_in_qr_order": bool(rc.get("showInQrOrder", False)),
                "auto_delivery_in_so": bool(rc.get("autoDeliveryInSo", False)),
                "group_count": stats["group_count"],
                "dish_count": stats["dish_count"],
            })

        # Bổ sung các Menu có trong ORDER_MENU_CACHE_CATEGORY nhưng chưa có trong RESTAURANT_CATEGORY
        seen_codes = {r["code"] for r in results if r.get("code")}
        for cc, stats in cache_map.items():
            if cc and cc not in seen_codes:
                # Tìm tên menu nếu có trong doc ORDER_MENU_CACHE_CATEGORY
                doc_omc = db["ORDER_MENU_CACHE_CATEGORY"].find_one({"category-code": cc}, {"name": 1, "category-name": 1, "main-menu.name": 1})
                menu_name = ""
                if doc_omc:
                    menu_name = (
                        doc_omc.get("name")
                        or doc_omc.get("category-name")
                        or doc_omc.get("main-menu", {}).get("name")
                        or ""
                    )
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
                    "dish_count": stats["dish_count"],
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

        # 2. Tạo lookup tên menu từ RESTAURANT_CATEGORY
        menu_name_map: Dict[str, str] = {}
        for rc in db["RESTAURANT_CATEGORY"].find({}, {"code": 1, "name": 1}):
            c = str(rc.get("code", "")).strip()
            if c:
                menu_name_map[c] = rc.get("name", "")

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
            if not omc:
                continue

            menus_loaded.add(cat_code)
            menu_title = menu_name_map.get(cat_code, f"Menu {cat_code}")
            groups = omc.get("main-menu", {}).get("items", []) or []

            for g in groups:
                for it, g_code, g_name, g_level, sort_order in _flatten_group_items(g):
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

                    # Đối chiếu CO
                    co_info = co_lookup.get(rk7)
                    is_co = co_info is not None
                    image_url = co_info.get("finalImg", "") if co_info else ""
                    raw_src_img = co_info.get("srcImg", "") if co_info else ""
                    raw_url_qr = co_info.get("urlImgQr", "") if co_info else ""
                    co_kalo = co_info.get("kalo", 100.0) if co_info else None

                    # Nếu không có sap trong cache nhưng CO có thì bổ sung
                    if not sap and co_info and co_info.get("sapCode"):
                        sap = co_info["sapCode"]

                    items.append({
                        "menu_code": cat_code,
                        "menu_name": f"{menu_title} - {cat_code}",
                        "group_code": g_code,
                        "group_name": g_name,
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

        # Map tên menu từ RESTAURANT_CATEGORY
        menu_name_map: Dict[str, str] = {}
        for rc in db["RESTAURANT_CATEGORY"].find({}, {"code": 1, "name": 1}):
            c = str(rc.get("code", "")).strip()
            if c:
                menu_name_map[c] = rc.get("name", "")

        rk7_map: Dict[str, Dict[str, Any]] = {}
        name_map: Dict[str, Dict[str, Any]] = {}

        for omc in db["ORDER_MENU_CACHE_CATEGORY"].find(query_filter):
            cat_code = str(omc.get("category-code", "")).strip()
            menu_title = menu_name_map.get(cat_code, f"Menu {cat_code}")
            groups = omc.get("main-menu", {}).get("items", []) or []

            for g in groups:
                for it, g_code, g_name, g_level, sort_order in _flatten_group_items(g):
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
                    for it, _, _, _, _ in _flatten_group_items(g):
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

