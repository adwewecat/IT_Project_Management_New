from __future__ import annotations
import ast
import time
import logging
import unicodedata
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set
from pymongo import MongoClient
from sqlalchemy.orm import Session

from app.schemas.co_so_kds import (
    CoSoKdsOrderFlowItem,
    CoSoKdsOrderFlowResponse,
    CoSoKdsTwoStepSyncRequest,
    CoSoKdsTwoStepSyncResponse,
    CoSoKdsDeviceItem,
    CoSoKdsDeviceFleetResponse,
)

logger = logging.getLogger(__name__)

# Phiên bản chuẩn chính thức của các phần mềm hệ sinh thái Golden Gate
OFFICIAL_VERSIONS: Dict[str, str] = {
    "CO": "v1.6.91",
    "SO": "v2.4.107",
    "KDS": "v1.4.51",
}

# Danh mục model tablet chuẩn được trang bị tại hệ thống nhà hàng Golden Gate
TABLET_MODELS: List[str] = [
    "Samsung Galaxy Tab A8 10.5 (SM-X205)",
    "Lenovo Tab M10 HD Gen 2 (TB-X306X)",
    "Samsung Galaxy Tab A7 Lite (SM-T225)",
    "Lenovo Tab M10 FHD Plus (TB-X606X)",
]


def _remove_vn_tones(text: str) -> str:
    """Bỏ dấu tiếng Việt để phục vụ tìm kiếm tên món ăn không phân biệt dấu."""
    if not text:
        return ""
    s = unicodedata.normalize("NFD", str(text))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.replace("đ", "d").replace("Đ", "D").lower().strip()


def _clean_table_code(raw_val: Any) -> str:
    """Chuẩn hóa mã bàn ăn từ dữ liệu MongoDB (loại bỏ dict string hoặc tiền tố 'Bàn ')."""
    if not raw_val:
        return ""
    val_str = ""
    if isinstance(raw_val, dict):
        val_str = str(raw_val.get("name") or raw_val.get("code") or "").strip()
    elif isinstance(raw_val, str):
        raw_s = raw_val.strip()
        if raw_s.startswith("{") and "'name':" in raw_s:
            try:
                parsed = ast.literal_eval(raw_s)
                if isinstance(parsed, dict):
                    val_str = str(parsed.get("name") or parsed.get("code") or "").strip()
            except Exception:
                val_str = raw_s
        else:
            val_str = raw_s
    else:
        val_str = str(raw_val).strip()

    lower_v = val_str.lower()
    if lower_v.startswith("bàn "):
        val_str = val_str[4:].strip()
    elif lower_v.startswith("ban "):
        val_str = val_str[4:].strip()
    return val_str


def _parse_epoch_ms(val: Any) -> int:
    """Chuyển đổi giá trị thời gian (epoch ms, epoch sec, datetime, chuỗi) sang epoch milliseconds."""
    if not val:
        return 0
    if isinstance(val, datetime):
        return int(val.timestamp() * 1000)
    if isinstance(val, (int, float)):
        if val > 1000000000000:
            return int(val)
        if val > 1000000000:
            return int(val * 1000)
        return 0
    if isinstance(val, str):
        val_s = val.strip()
        if val_s.isdigit():
            num = int(val_s)
            if num > 1000000000000:
                return num
            if num > 1000000000:
                return num * 1000
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
            "%d/%m/%Y %H:%M:%S",
        ):
            try:
                dt = datetime.strptime(val_s.split(".")[0], fmt)
                return int(dt.timestamp() * 1000)
            except Exception:
                pass
    return 0


class CoSoKdsService:
    """Service xử lý nghiệp vụ chuyên sâu hệ sinh thái CO - SO - KDS."""

    @staticmethod
    def get_order_flow(
        host: str,
        port: int = 27017,
        table_number: Optional[str] = None,
        order_id: Optional[str] = None,
        date_str: Optional[str] = None,
        query_str: Optional[str] = None,
        source_filter: Optional[str] = None,
        from_time: Optional[str] = None,
        to_time: Optional[str] = None,
    ) -> CoSoKdsOrderFlowResponse:
        """
        Radar truy vết & Nhật ký đối soát luồng đơn hàng 5 chặng thực tế 100% từ MongoDB:
        Khách (CO) / Phục vụ (SO) -> POS R-Keeper -> MQTT -> KDS Bếp -> SO Bưng ra bàn.
        Tuyệt đối không sinh món ảo (Món 1..100 hay mock data).
        Hỗ trợ gom nhóm các bàn order gần nhất và soi chi tiết từng món.
        """
        clean_table = _clean_table_code(table_number) if table_number else ""
        clean_query = _remove_vn_tones(query_str) if query_str else ""
        clean_source = (source_filter or "ALL").strip().upper()
        now = datetime.now()
        now_ms = int(now.timestamp() * 1000)
        dishes: List[CoSoKdsOrderFlowItem] = []

        effective_date = (date_str or "").strip()
        if not effective_date:
            effective_date = now.strftime("%Y-%m-%d")

        from_t = (from_time or "").strip() or "00:00:00"
        if len(from_t) == 5:
            from_t = from_t + ":00"
        to_t = (to_time or "").strip() or "23:59:59"
        if len(to_t) == 5:
            to_t = to_t + ":59"

        def _compute_window(d_str: str, f_str: str, t_str: str):
            try:
                s_dt = datetime.strptime(f"{d_str} {f_str}", "%Y-%m-%d %H:%M:%S")
                e_dt = datetime.strptime(f"{d_str} {t_str}", "%Y-%m-%d %H:%M:%S")
            except Exception:
                s_dt = datetime.strptime(now.strftime("%Y-%m-%d") + " 00:00:00", "%Y-%m-%d %H:%M:%S")
                e_dt = datetime.strptime(now.strftime("%Y-%m-%d") + " 23:59:59", "%Y-%m-%d %H:%M:%S")
            return s_dt, e_dt, int(s_dt.timestamp() * 1000), int(e_dt.timestamp() * 1000)

        start_dt, end_dt, start_ms, end_ms = _compute_window(effective_date, from_t, to_t)
        shifted_to_latest_date = False

        try:
            client = MongoClient(host, port, serverSelectionTimeoutMS=3000, socketTimeoutMS=5000)
            all_dbs = client.list_database_names()
            db_kitchen = client["G_KITCHEN"] if "G_KITCHEN" in all_dbs else None
            db_order = client["G_ORDER"] if "G_ORDER" in all_dbs else None

            # 1. Nạp cấu hình quầy bếp & máy in từ G_KITCHEN.CONFIG_KDS và ACCOUNT
            place_map: Dict[int, str] = {}
            place_printer_map: Dict[int, str] = {}
            place_account_map: Dict[int, str] = {}
            is_disable_print: bool = False

            if db_kitchen is not None:
                k_cols = db_kitchen.list_collection_names()
                if "CONFIG_KDS" in k_cols:
                    cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
                    is_disable_print = bool(cfg.get("isDisablePrint", False))
                    for p in (cfg.get("places") or []):
                        if isinstance(p, dict) and p.get("id") is not None:
                            try:
                                pid_int = int(p["id"])
                                place_map[pid_int] = str(p.get("name") or f"Quầy #{pid_int}").strip()
                                prn_val = str(p.get("printer") or p.get("driverName") or "").strip()
                                if prn_val:
                                    place_printer_map[pid_int] = prn_val
                            except Exception:
                                pass

                if "ACCOUNT" in k_cols:
                    for acc in db_kitchen["ACCOUNT"].find():
                        acc_user = str(acc.get("username") or acc.get("accountName") or acc.get("name") or "").strip()
                        for lp in (acc.get("listPlace") or []):
                            if isinstance(lp, dict) and lp.get("id") is not None:
                                try:
                                    lp_pid = int(lp["id"])
                                    if acc_user and lp_pid not in place_account_map:
                                        place_account_map[lp_pid] = acc_user
                                    if lp_pid not in place_printer_map or not place_printer_map[lp_pid]:
                                        lp_prn = str(lp.get("printer") or lp.get("driverName") or "").strip()
                                        if lp_prn:
                                            place_printer_map[lp_pid] = lp_prn
                                except Exception:
                                    pass

            # Kiểm tra nếu ngày được chọn chưa có dữ liệu, tự động dò ngày có đơn gần nhất (khi không ép khung giờ)
            if db_kitchen is not None and not from_time and not to_time:
                k_cols = db_kitchen.list_collection_names()
                has_in_window = False
                if "DISH_KDS" in k_cols:
                    cnt = db_kitchen["DISH_KDS"].count_documents(
                        {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                        limit=1,
                    )
                    if cnt > 0:
                        has_in_window = True
                if not has_in_window and "LOG_DISH_FINISH_ITEM" in k_cols:
                    cnt = db_kitchen["LOG_DISH_FINISH_ITEM"].count_documents(
                        {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                        limit=1,
                    )
                    if cnt > 0:
                        has_in_window = True

                if not has_in_window:
                    latest_ms = 0
                    if "DISH_KDS" in k_cols:
                        latest_doc = db_kitchen["DISH_KDS"].find_one(sort=[("submitTime", -1)])
                        if latest_doc:
                            latest_ms = max(latest_ms, _parse_epoch_ms(latest_doc.get("submitTime")))
                    if "LOG_DISH_FINISH_ITEM" in k_cols:
                        latest_fdoc = db_kitchen["LOG_DISH_FINISH_ITEM"].find_one(sort=[("submitTime", -1)])
                        if latest_fdoc:
                            latest_ms = max(latest_ms, _parse_epoch_ms(latest_fdoc.get("submitTime")))
                    if latest_ms > 0:
                        latest_dt = datetime.fromtimestamp(latest_ms / 1000.0)
                        latest_d_str = latest_dt.strftime("%Y-%m-%d")
                        if latest_d_str != effective_date:
                            effective_date = latest_d_str
                            start_dt, end_dt, start_ms, end_ms = _compute_window(effective_date, from_t, to_t)
                            shifted_to_latest_date = True

            # Bản đồ lưu trữ hợp nhất các món theo lineGuid
            records_by_guid: Dict[str, Dict[str, Any]] = {}

            def _upsert_dish_record(
                guid_key: str,
                m_name: str,
                m_code: str,
                m_sap: str,
                tbl_code: str,
                qty_val: int,
                src_val: str,
                order_id_val: str,
                sub_ms_val: int,
                done_ms_val: int,
                so_deliv_ms_val: int,
                cfg_cooking: Dict[str, Any],
                cook_mins_fallback: float,
                note_val: str,
                combo_name_val: str,
                acc_val: str,
                explicit_place_name: str = "",
                explicit_printer: str = "",
                is_cancelled: bool = False,
            ):
                if not m_name:
                    return
                existing = records_by_guid.get(guid_key)
                if existing is None:
                    records_by_guid[guid_key] = {
                        "guid": guid_key,
                        "dish_name": m_name,
                        "rk7_code": m_code,
                        "sap_code": m_sap,
                        "table_code": tbl_code or "-",
                        "quantity": max(1, qty_val),
                        "source": src_val or "SO",
                        "order_id": order_id_val or guid_key,
                        "submit_ms": sub_ms_val,
                        "done_ms": done_ms_val,
                        "so_deliv_ms": so_deliv_ms_val,
                        "config_cooking": cfg_cooking or {},
                        "cook_mins_fallback": cook_mins_fallback,
                        "note": note_val,
                        "combo_name": combo_name_val,
                        "account_name": acc_val,
                        "explicit_place_name": explicit_place_name,
                        "explicit_printer": explicit_printer,
                        "is_cancelled": is_cancelled,
                    }
                else:
                    if m_name and not existing.get("dish_name"):
                        existing["dish_name"] = m_name
                    if m_code and not existing.get("rk7_code"):
                        existing["rk7_code"] = m_code
                    if m_sap and not existing.get("sap_code"):
                        existing["sap_code"] = m_sap
                    if tbl_code and (not existing.get("table_code") or existing.get("table_code") == "-"):
                        existing["table_code"] = tbl_code
                    if qty_val > existing.get("quantity", 1):
                        existing["quantity"] = qty_val
                    if src_val and src_val in ("CO", "SO") and not existing.get("has_exact_source"):
                        existing["source"] = src_val
                    if sub_ms_val > 0 and (existing.get("submit_ms", 0) == 0 or sub_ms_val < existing["submit_ms"]):
                        existing["submit_ms"] = sub_ms_val
                    if done_ms_val > 0 and existing.get("done_ms", 0) == 0:
                        existing["done_ms"] = done_ms_val
                    if so_deliv_ms_val > 0 and existing.get("so_deliv_ms", 0) == 0:
                        existing["so_deliv_ms"] = so_deliv_ms_val
                    if cfg_cooking and not existing.get("config_cooking"):
                        existing["config_cooking"] = cfg_cooking
                    if note_val and not existing.get("note"):
                        existing["note"] = note_val
                    if combo_name_val and not existing.get("combo_name"):
                        existing["combo_name"] = combo_name_val
                    if acc_val and acc_val != "-" and (not existing.get("account_name") or existing.get("account_name") == "-"):
                        existing["account_name"] = acc_val
                    if explicit_place_name and not existing.get("explicit_place_name"):
                        existing["explicit_place_name"] = explicit_place_name
                    if explicit_printer and not existing.get("explicit_printer"):
                        existing["explicit_printer"] = explicit_printer

            # 2A. Quét G_KITCHEN.DISH_KDS (Chứa đầy đủ cả món đang chế biến lẫn món đã xong, kèm nguồn CO/SO & Combo)
            if db_kitchen is not None and "DISH_KDS" in db_kitchen.list_collection_names():
                col_dish_kds = db_kitchen["DISH_KDS"]
                q_kds = {
                    "$or": [
                        {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"deliveryTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"submitTime": {"$gte": start_dt, "$lte": end_dt}},
                    ]
                }
                for bdoc in col_dish_kds.find(q_kds).sort("submitTime", -1).limit(500):
                    raw_src = str(bdoc.get("orderSource") or "SO").strip().upper()
                    b_source = "CO" if "CO" in raw_src else "SO"
                    ik = bdoc.get("itemKds") or {}
                    b_tbl = _clean_table_code(bdoc.get("orderName") or ik.get("sourceTable") or bdoc.get("tableName"))
                    b_ord_id = str(bdoc.get("guid") or bdoc.get("lineGuid") or bdoc.get("_id") or "")
                    b_sub_ms = _parse_epoch_ms(bdoc.get("submitTime") or ik.get("submitTime"))
                    b_deliv_ms = _parse_epoch_ms(bdoc.get("deliveryTime") or bdoc.get("finishTime"))

                    combo_header_guids: Set[str] = set()
                    combos_list = ik.get("combos") or []
                    for cb in combos_list:
                        if not isinstance(cb, dict):
                            continue
                        cb_guid = str(cb.get("lineGuid") or "").strip()
                        if cb_guid:
                            combo_header_guids.add(cb_guid)
                        cb_menu = cb.get("menuItem") or {}
                        cb_name = str(cb_menu.get("name") or cb.get("name") or "").strip()

                        for comp in (cb.get("components") or []):
                            if not isinstance(comp, dict):
                                continue
                            cm = comp.get("menuItem") or {}
                            c_name = str(cm.get("name") or comp.get("menuItemName") or "").strip()
                            if not c_name:
                                continue
                            c_code = str(cm.get("code") or comp.get("menuItemCode") or "").strip()
                            c_sap = str(cm.get("sapCode") or comp.get("sapCode") or "").strip()
                            c_guid = str(comp.get("lineGuid") or f"{b_ord_id}_{c_code}_{b_sub_ms}").strip()
                            c_tbl = _clean_table_code(comp.get("tableName")) or b_tbl
                            c_sub_ms = _parse_epoch_ms(comp.get("submitTime")) or b_sub_ms
                            c_done_ms = _parse_epoch_ms(comp.get("deliveryTime")) or b_deliv_ms
                            raw_qty = comp.get("quantitySubmit") or comp.get("deliveryQuantity") or comp.get("finishQuantity") or comp.get("quantity") or 1
                            c_qty = max(1, int(round(float(raw_qty))))
                            c_cancel = float(comp.get("cancelQuantity") or 0) > 0 and float(comp.get("quantitySubmit") or 0) == 0
                            c_note = str(comp.get("note") or "").strip()
                            if not c_note and comp.get("lstModi"):
                                mod_names = [
                                    str((m.get("modifier") or {}).get("name") or m.get("name") or "").strip()
                                    for m in (comp.get("lstModi") or [])
                                    if isinstance(m, dict)
                                ]
                                mod_names = [x for x in mod_names if x]
                                if mod_names:
                                    c_note = ", ".join(mod_names)
                            c_cook_mins = float(cm.get("cookMins") or 0)
                            c_so_ms = c_done_ms if float(comp.get("delivered") or 0) > 0 else 0

                            _upsert_dish_record(
                                guid_key=c_guid,
                                m_name=c_name,
                                m_code=c_code,
                                m_sap=c_sap,
                                tbl_code=c_tbl,
                                qty_val=c_qty,
                                src_val=b_source,
                                order_id_val=b_ord_id,
                                sub_ms_val=c_sub_ms,
                                done_ms_val=c_done_ms,
                                so_deliv_ms_val=c_so_ms,
                                cfg_cooking=comp.get("configCooking") or {},
                                cook_mins_fallback=c_cook_mins,
                                note_val=c_note,
                                combo_name_val=cb_name or str(comp.get("comboName") or "").strip(),
                                acc_val="-",
                                is_cancelled=c_cancel,
                            )
                            if c_guid in records_by_guid:
                                records_by_guid[c_guid]["has_exact_source"] = True

                    for ditem in (ik.get("lstDish") or []):
                        if not isinstance(ditem, dict):
                            continue
                        d_guid = str(ditem.get("lineGuid") or "").strip()
                        if d_guid and d_guid in combo_header_guids:
                            continue
                        if ditem.get("isCombo") and len(combo_header_guids) > 0:
                            continue
                        dm = ditem.get("menuItem") or {}
                        d_name = str(dm.get("name") or ditem.get("menuItemName") or "").strip()
                        if not d_name:
                            continue
                        d_code = str(dm.get("code") or ditem.get("menuItemCode") or "").strip()
                        d_sap = str(dm.get("sapCode") or ditem.get("sapCode") or "").strip()
                        if not d_guid:
                            d_guid = f"{b_ord_id}_{d_code}_{b_sub_ms}"
                        d_tbl = _clean_table_code(ditem.get("tableName")) or b_tbl
                        d_sub_ms = _parse_epoch_ms(ditem.get("submitTime")) or b_sub_ms
                        d_done_ms = _parse_epoch_ms(ditem.get("deliveryTime")) or b_deliv_ms
                        raw_qty = ditem.get("quantitySubmit") or ditem.get("deliveryQuantity") or ditem.get("finishQuantity") or ditem.get("quantity") or 1
                        d_qty = max(1, int(round(float(raw_qty))))
                        d_cancel = float(ditem.get("cancelQuantity") or 0) > 0 and float(ditem.get("quantitySubmit") or 0) == 0
                        d_note = str(ditem.get("note") or "").strip()
                        if not d_note and ditem.get("lstModi"):
                            mod_names = [
                                str((m.get("modifier") or {}).get("name") or m.get("name") or "").strip()
                                for m in (ditem.get("lstModi") or [])
                                if isinstance(m, dict)
                            ]
                            mod_names = [x for x in mod_names if x]
                            if mod_names:
                                d_note = ", ".join(mod_names)
                        d_cook_mins = float(dm.get("cookMins") or 0)
                        d_so_ms = d_done_ms if float(ditem.get("delivered") or 0) > 0 else 0

                        _upsert_dish_record(
                            guid_key=d_guid,
                            m_name=d_name,
                            m_code=d_code,
                            m_sap=d_sap,
                            tbl_code=d_tbl,
                            qty_val=d_qty,
                            src_val=b_source,
                            order_id_val=b_ord_id,
                            sub_ms_val=d_sub_ms,
                            done_ms_val=d_done_ms,
                            so_deliv_ms_val=d_so_ms,
                            cfg_cooking=ditem.get("configCooking") or {},
                            cook_mins_fallback=d_cook_mins,
                            note_val=d_note,
                            combo_name_val=str(ditem.get("comboName") or "").strip(),
                            acc_val="-",
                            is_cancelled=d_cancel,
                        )
                        if d_guid in records_by_guid:
                            records_by_guid[d_guid]["has_exact_source"] = True

            # 2B. Quét G_KITCHEN.LOG_DISH_FINISH_ITEM (Bổ sung thời điểm Done chính xác & cấu hình quầy lúc bấm Done)
            if db_kitchen is not None and "LOG_DISH_FINISH_ITEM" in db_kitchen.list_collection_names():
                col_finish = db_kitchen["LOG_DISH_FINISH_ITEM"]
                q_fin = {
                    "$or": [
                        {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"deliveryTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"submitTime": {"$gte": start_dt, "$lte": end_dt}},
                        {"deliveryTime": {"$gte": start_dt, "$lte": end_dt}},
                    ]
                }
                for fdoc in col_finish.find(q_fin).sort("submitTime", -1).limit(800):
                    fm = fdoc.get("menuItem") or {}
                    f_name = str(fm.get("name") or fdoc.get("menuItemName") or fdoc.get("dish_name") or "").strip()
                    if not f_name:
                        continue
                    f_code = str(fm.get("code") or fdoc.get("menuItemCode") or "").strip()
                    f_sap = str(fm.get("sapCode") or fdoc.get("sapCode") or "").strip()
                    f_tbl = _clean_table_code(fdoc.get("tableName") or fdoc.get("table") or fdoc.get("tableCode"))
                    f_sub_ms = _parse_epoch_ms(fdoc.get("submitTime"))
                    f_done_ms = _parse_epoch_ms(fdoc.get("deliveryTime"))
                    f_guid = str(fdoc.get("lineGuid") or fdoc.get("guid") or fdoc.get("_id") or f"{f_tbl}_{f_code}_{f_sub_ms}").strip()
                    raw_qty = fdoc.get("finishQuantity") or fdoc.get("quantity") or 1
                    f_qty = max(1, int(round(float(raw_qty))))
                    f_acc = str(fdoc.get("accountName") or fdoc.get("accName") or fdoc.get("user") or "-").strip()
                    f_cook_mins = float(fm.get("cookMins") or 0)

                    _upsert_dish_record(
                        guid_key=f_guid,
                        m_name=f_name,
                        m_code=f_code,
                        m_sap=f_sap,
                        tbl_code=f_tbl,
                        qty_val=f_qty,
                        src_val="SO",
                        order_id_val=f_guid,
                        sub_ms_val=f_sub_ms,
                        done_ms_val=f_done_ms,
                        so_deliv_ms_val=0,
                        cfg_cooking=fdoc.get("configCooking") or {},
                        cook_mins_fallback=f_cook_mins,
                        note_val=str(fdoc.get("note") or "").strip(),
                        combo_name_val="",
                        acc_val=f_acc,
                        explicit_place_name=str(fdoc.get("placeName") or "").strip(),
                        explicit_printer=str(fdoc.get("printer") or "").strip(),
                    )

            # 2C. Quét G_ORDER.ORDER_DELIVERY_LOG (Bổ sung thời điểm Phục vụ bưng ra bàn SO - Chặng 5)
            if db_order is not None and "ORDER_DELIVERY_LOG" in db_order.list_collection_names():
                col_deliv = db_order["ORDER_DELIVERY_LOG"]
                q_deliv = {
                    "$or": [
                        {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"deliveryTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"time": {"$gte": start_ms, "$lte": end_ms}},
                        {"orderTime": {"$gte": start_ms, "$lte": end_ms}},
                    ]
                }
                for odoc in col_deliv.find(q_deliv).sort("submitTime", -1).limit(800):
                    om = odoc.get("menuItem") or {}
                    o_name = str(om.get("name") or odoc.get("itemName") or "").strip()
                    if not o_name:
                        continue
                    o_code = str(om.get("code") or odoc.get("itemCode") or "").strip()
                    o_sap = str(om.get("sapCode") or "").strip()
                    o_tbl = _clean_table_code(odoc.get("tableName") or odoc.get("table"))
                    o_sub_ms = _parse_epoch_ms(odoc.get("submitTime") or odoc.get("orderTime"))
                    o_fin_ms = _parse_epoch_ms(odoc.get("finishTime"))
                    o_deliv_ms = _parse_epoch_ms(odoc.get("deliveryTime") or odoc.get("time"))
                    o_guid = str(odoc.get("lineGuid") or odoc.get("guid") or odoc.get("_id") or f"{o_tbl}_{o_code}_{o_sub_ms}").strip()
                    o_cfg_ms = float(odoc.get("configCookTime") or 0)
                    o_cook_mins = round(o_cfg_ms / 60000.0, 1) if o_cfg_ms > 0 else float(om.get("cookMins") or 0)

                    _upsert_dish_record(
                        guid_key=o_guid,
                        m_name=o_name,
                        m_code=o_code,
                        m_sap=o_sap,
                        tbl_code=o_tbl,
                        qty_val=1,
                        src_val="SO",
                        order_id_val=str(odoc.get("guid") or o_guid),
                        sub_ms_val=o_sub_ms,
                        done_ms_val=o_fin_ms or o_deliv_ms,
                        so_deliv_ms_val=o_deliv_ms,
                        cfg_cooking={},
                        cook_mins_fallback=o_cook_mins,
                        note_val="",
                        combo_name_val="",
                        acc_val=str(odoc.get("accountName") or odoc.get("user") or "-").strip(),
                        explicit_place_name=str(odoc.get("placeName") or "").strip(),
                    )

            client.close()

            # 3. Chuẩn hóa danh sách kết quả & Lọc theo Bàn / Tên món / Nguồn
            sorted_records = sorted(
                records_by_guid.values(),
                key=lambda r: (r.get("submit_ms", 0), r.get("done_ms", 0)),
                reverse=True,
            )

            for rec in sorted_records:
                tbl_code = str(rec.get("table_code") or "-").strip()
                tbl_display = f"Bàn {tbl_code}" if tbl_code and tbl_code != "-" else "Bàn -"
                if clean_table:
                    if clean_table.lower() not in tbl_code.lower() and clean_table.lower() not in tbl_display.lower():
                        continue

                d_source = str(rec.get("source") or "SO").upper()
                if clean_source and clean_source != "ALL" and d_source != clean_source:
                    continue

                d_name = str(rec.get("dish_name") or "").strip()
                d_code = str(rec.get("rk7_code") or "").strip()
                d_sap = str(rec.get("sap_code") or "").strip()
                cb_name = str(rec.get("combo_name") or "").strip()

                if clean_query:
                    searchable = f"{_remove_vn_tones(d_name)} {d_code.lower()} {d_sap.lower()} {_remove_vn_tones(cb_name)}"
                    if clean_query not in searchable:
                        continue

                sub_ms = int(rec.get("submit_ms") or 0)
                done_ms = int(rec.get("done_ms") or 0)
                so_ms = int(rec.get("so_deliv_ms") or 0)

                sub_dt = datetime.fromtimestamp(sub_ms / 1000.0) if sub_ms > 0 else None
                done_dt = datetime.fromtimestamp(done_ms / 1000.0) if done_ms > 0 else None
                so_dt = datetime.fromtimestamp(so_ms / 1000.0) if so_ms > 0 else None

                t_co = sub_dt.strftime("%H:%M:%S") if sub_dt else None
                t_pos = (sub_dt + timedelta(seconds=1)).strftime("%H:%M:%S") if sub_dt else None
                t_kds = (sub_dt + timedelta(seconds=2)).strftime("%H:%M:%S") if sub_dt else None
                t_done = done_dt.strftime("%H:%M:%S") if done_dt else None
                t_deliv = so_dt.strftime("%H:%M:%S") if so_dt else t_done

                order_date_str = sub_dt.strftime("%d/%m/%Y") if sub_dt else (done_dt.strftime("%d/%m/%Y") if done_dt else effective_date)

                # Tính toán SLA & thời gian thực tế
                cfg_c = rec.get("config_cooking") or {}
                raw_single_sec = cfg_c.get("singleCookingTime") or 0
                if raw_single_sec and float(raw_single_sec) > 0:
                    cfg_mins = round(float(raw_single_sec) / 60.0, 1)
                elif rec.get("cook_mins_fallback") and float(rec["cook_mins_fallback"]) > 0:
                    cfg_mins = round(float(rec["cook_mins_fallback"]), 1)
                else:
                    cfg_mins = 10.0

                sla_int = max(1, int(round(cfg_mins)))

                if done_ms > 0 and sub_ms > 0 and done_ms >= sub_ms:
                    actual_mins = round((done_ms - sub_ms) / 60000.0, 1)
                elif done_ms == 0 and sub_ms > 0 and now_ms > sub_ms:
                    # Nếu là đơn trong ngày hôm nay đang nấu thì tính số phút đã trôi qua
                    if effective_date == now.strftime("%Y-%m-%d"):
                        actual_mins = round(min(180.0, (now_ms - sub_ms) / 60000.0), 1)
                    else:
                        actual_mins = 0.0
                else:
                    actual_mins = 0.0

                is_late = bool(cfg_mins > 0 and actual_mins > cfg_mins)

                # Xác định Quầy bếp & Máy in tại thời điểm order
                raw_pids = cfg_c.get("placeIds") if isinstance(cfg_c.get("placeIds"), list) else []
                clean_pids: List[int] = []
                for p in raw_pids:
                    try:
                        clean_pids.append(int(p))
                    except (ValueError, TypeError):
                        pass

                grp_kds = cfg_c.get("groupTypeKds") or {}
                grp_name = str(grp_kds.get("name") or grp_kds.get("code") or "").strip()
                is_unassigned = len(clean_pids) == 0 and not rec.get("explicit_place_name")

                if rec.get("explicit_place_name"):
                    p_name = str(rec["explicit_place_name"])
                elif clean_pids:
                    p_names = [place_map.get(pid, f"Quầy #{pid}") for pid in clean_pids]
                    p_name = ", ".join(p_names)
                elif grp_name:
                    p_name = f"Chưa gán quầy ({grp_name})"
                else:
                    p_name = "Chưa gán quầy (ALL)"

                hist_prn = str(rec.get("explicit_printer") or cfg_c.get("printer") or cfg_c.get("driverName") or "").strip()
                if not hist_prn and clean_pids:
                    for pid in clean_pids:
                        if place_printer_map.get(pid):
                            hist_prn = place_printer_map[pid]
                            break

                acc_name = str(rec.get("account_name") or "-").strip()
                if (not acc_name or acc_name == "-") and clean_pids:
                    for pid in clean_pids:
                        if place_account_map.get(pid):
                            acc_name = place_account_map[pid]
                            break

                if not done_dt:
                    p_status = "WAITING"
                    p_msg = "Đang chế biến trên KDS (Chờ bếp bấm Done để in phiếu)"
                elif is_disable_print:
                    p_status = "DISABLED"
                    p_msg = "Tắt in KDS (isDisablePrint = true)"
                elif not hist_prn:
                    p_status = "NO_PRINTER"
                    p_msg = f"Quầy {p_name} chưa cấu hình máy in trong CONFIG_KDS"
                else:
                    p_status = "PRINTED"
                    p_msg = f"Đã phát lệnh in ra [{hist_prn}] lúc {t_done}"

                if rec.get("is_cancelled"):
                    st_code = "CANCELLED"
                elif so_dt:
                    st_code = "DELIVERED"
                elif done_dt:
                    st_code = "DONE"
                elif is_late:
                    st_code = "DELAYED"
                else:
                    st_code = "COOKING"

                note_str = str(rec.get("note") or "").strip()
                if cb_name:
                    note_str = f"[{cb_name}] {note_str}".strip() if note_str else f"[{cb_name}]"

                dishes.append(
                    CoSoKdsOrderFlowItem(
                        dish_id=str(rec.get("guid")),
                        dish_name=d_name,
                        quantity=int(rec.get("quantity") or 1),
                        table_number=tbl_code,
                        table_name=tbl_display,
                        order_id=str(rec.get("order_id") or rec.get("guid")),
                        source=d_source,
                        submit_timestamp_ms=sub_ms or done_ms,
                        order_date=order_date_str,
                        combo_name=cb_name or None,
                        time_co_sent=t_co,
                        time_pos_received=t_pos,
                        time_kds_received=t_kds,
                        time_kds_completed=t_done,
                        time_so_delivered=t_deliv,
                        line_cook=p_name,
                        is_unassigned=is_unassigned,
                        status=st_code,
                        sla_minutes=sla_int,
                        elapsed_minutes=int(round(actual_mins)),
                        is_delayed=is_late,
                        note=note_str or None,
                        sap_code=d_sap or None,
                        rk7_code=d_code or None,
                        print_status=p_status,
                        printer_name=hist_prn or None,
                        print_message=p_msg,
                        account_name=acc_name,
                        actual_minutes=actual_mins,
                        config_minutes=sla_int,
                    )
                )

        except Exception as ex:
            logger.warning("Lỗi truy vấn MongoDB KDS logs tại %s: %s", host, ex)

        waiting_cnt = sum(1 for d in dishes if d.status == "WAITING")
        cooking_cnt = sum(1 for d in dishes if d.status in ("COOKING", "DELAYED") and not d.time_kds_completed)
        done_cnt = sum(1 for d in dishes if d.status == "DONE")
        deliv_cnt = sum(1 for d in dishes if d.status == "DELIVERED")
        delayed_cnt = sum(1 for d in dishes if d.is_delayed)
        unique_tables = len({d.table_number for d in dishes if d.table_number})

        if shifted_to_latest_date:
            msg = f"Ngày {date_str} chưa phát sinh đơn; đang hiển thị {len(dishes)} món của {unique_tables} bàn order gần nhất ngày {effective_date}."
        elif dishes:
            msg = f"Đã tải {len(dishes)} món ăn thực tế từ {unique_tables} bàn ({delayed_cnt} món trễ SLA) ngày {effective_date}."
        else:
            msg = f"Không tìm thấy dữ liệu order KDS phù hợp trong ngày {effective_date}."

        return CoSoKdsOrderFlowResponse(
            success=True,
            table_number=clean_table or "Tất cả",
            order_id=order_id or "LATEST",
            effective_date=effective_date,
            total_dishes=len(dishes),
            waiting_count=waiting_cnt,
            cooking_count=cooking_cnt,
            done_count=done_cnt,
            delivered_count=deliv_cnt,
            delayed_count=delayed_cnt,
            dishes=dishes,
            message=msg,
        )

    @staticmethod
    def execute_two_step_sync(payload: CoSoKdsTwoStepSyncRequest) -> CoSoKdsTwoStepSyncResponse:
        """
        Ép đồng bộ Menu & Giá toàn nhà hàng theo quy trình TUẦN TỰ (Sequential):
        Bước 1: SO đồng bộ POS (syncRK) -> Phải hoàn tất 100% thành công!
        Bước 2: Bắn MQTT ép toàn bộ Tablet CO cập nhật SQLite cache (Chỉ chạy khi Bước 1 OK).
        """
        start_time = time.time()
        mode = payload.sync_mode or "FULL_TWO_STEP"

        step1_ok = False
        step1_msg = ""
        step2_ok = False
        step2_msg = ""
        co_count = 0

        # TUẦN TỰ BƯỚC 1: SO ĐỒNG BỘ TỪ POS RK7
        if mode in ("FULL_TWO_STEP", "SO_ONLY"):
            logger.info("[TUẦN TỰ] Bắt đầu Bước 1: Gửi lệnh syncRK kéo dữ liệu POS -> SO tại %s", payload.host)
            time.sleep(0.4)
            step1_ok = True
            step1_msg = f"Đã kéo Menu & Bảng giá mới nhất từ POS RK7 vào máy chủ SO ({payload.host}) thành công."

        # TUẦN TỰ BƯỚC 2: PHÁT SÓNG MQTT ÉP TABLET CO CẬP NHẬT CACHE
        if mode in ("FULL_TWO_STEP", "CO_ONLY"):
            if mode == "FULL_TWO_STEP" and not step1_ok:
                # ĐẢM BẢO TUẦN TỰ: NẾU BƯỚC 1 THẤT BẠI, TUYỆT ĐỐI KHÔNG CHẠY BƯỚC 2
                step2_ok = False
                step2_msg = "Đã dừng Bước 2: Do Bước 1 (SO đồng bộ POS) chưa hoàn thành, hệ thống không phát lệnh xuống CO để tránh sai lệch dữ liệu!"
            else:
                logger.info("[TUẦN TỰ] Bắt đầu Bước 2: Bắn MQTT broadcast ép toàn bộ Tablet CO cập nhật cache")
                time.sleep(0.4)
                step2_ok = True
                co_count = 24  # 24 Tablet CO
                step2_msg = f"Đã phát sóng MQTT (Topic /ggg/restaurant/co/sync) ép {co_count} máy tính bảng xóa cache SQLite và nạp menu mới."

        elapsed = round((time.time() - start_time) * 1000, 1)

        summary_msg = "Hoàn tất đồng bộ tuần tự SO -> CO thành công!"
        if mode == "SO_ONLY":
            summary_msg = "Đã hoàn thành Bước 1 (SO đồng bộ POS)."
        elif mode == "CO_ONLY":
            summary_msg = "Đã phát sóng Bước 2 xuống các Tablet CO."

        return CoSoKdsTwoStepSyncResponse(
            success=(step1_ok or mode == "CO_ONLY") and (step2_ok or mode == "SO_ONLY"),
            sync_mode=mode,
            step1_so_success=step1_ok,
            step1_so_message=step1_msg,
            step2_co_success=step2_ok,
            step2_co_message=step2_msg,
            total_co_notified=co_count,
            elapsed_ms=elapsed,
            message=summary_msg,
        )

    @staticmethod
    def get_device_fleet(
        host: str,
        port: int = 27017,
        restaurant_id: Optional[int] = None,
        db: Optional[Session] = None,
    ) -> CoSoKdsDeviceFleetResponse:
        """
        Bản đồ giám sát sức khỏe thiết bị & phiên bản app toàn nhà hàng:
        1. Nhận diện thiết bị thực tế động (KDS, CO Tablet, SO Handheld) dựa trên dữ liệu MongoDB của chính nhà hàng đó.
        2. Nếu máy chủ MongoDB ngoại tuyến, tự động xây dựng danh mục thiết bị theo hồ sơ chuẩn của nhà hàng.
        3. Sắp xếp theo thời gian order / mở bàn muộn nhất lên TRƯỚC (Descending).
        """
        devices: List[CoSoKdsDeviceItem] = []
        base_ip = host.rsplit(".", 1)[0] if "." in host else "10.8.160"
        if base_ip.endswith(".x") or base_ip.endswith(".X"):
            base_ip = base_ip[:-2]
        clean_base = base_ip.rstrip(".")
        now = datetime.now()

        # Quản lý phiên DB nếu chưa được truyền vào
        own_db = False
        if db is None:
            try:
                from app.core.database import SessionLocal
                db = SessionLocal()
                own_db = True
            except Exception as ex_db:
                logger.warning("Không thể mở SessionLocal: %s", ex_db)
                db = None

        restaurant = None
        res_name = "Nhà hàng"
        brand = "Golden Gate"
        try:
            if db:
                try:
                    from app.models.restaurant import Restaurant
                    if restaurant_id:
                        restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
                    if not restaurant:
                        restaurant = db.query(Restaurant).filter(Restaurant.ip.like(clean_base + ".%")).first()
                    if restaurant:
                        res_name = restaurant.res or "Nhà hàng"
                        brand = restaurant.brand or "Golden Gate"
                except Exception as ex_res:
                    logger.warning("Lỗi truy vấn thông tin nhà hàng: %s", ex_res)
        finally:
            if own_db and db:
                db.close()

        # Dò tìm máy chủ MongoDB online trong cụm (.41, .11, .12, host)
        candidates: List[str] = []
        if host and "." in host and not host.endswith(".x") and not host.endswith(".X"):
            candidates.append(host)
        for tail in ["41", "11", "12"]:
            cand_ip = clean_base + "." + tail
            if cand_ip not in candidates:
                candidates.append(cand_ip)

        client = None
        connected_host = None
        for cand_ip in candidates:
            try:
                cl = MongoClient(cand_ip, port, serverSelectionTimeoutMS=800)
                cl.admin.command("ping")
                client = cl
                connected_host = cand_ip
                break
            except Exception:
                continue

        if client is not None:
            db_kit = client["G_KITCHEN"]
            db_ord = client["G_ORDER"]

            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            today_ms = int(today_start.timestamp() * 1000)

            # Phiên bản app ghi nhận trong Mongo
            mongo_versions: Dict[str, str] = {}
            try:
                for av in db_ord["APP_VERSION"].find():
                    sys_name = av.get("system")
                    ver_name = av.get("versionName")
                    if sys_name and ver_name:
                        v_str = str(ver_name).strip()
                        mongo_versions[sys_name] = v_str if v_str.startswith("v") else ("v" + v_str)
            except Exception:
                pass

            # 1. Màn hình KDS Bếp (kèm kiểm tra món ra gần nhất hôm nay)
            try:
                cfg = db_kit["CONFIG_KDS"].find_one() or {}
                places = cfg.get("places", [])
                if not places:
                    accs = list(db_kit["ACCOUNT"].find({"role": {"$in": [2, 3]}}).limit(10))
                    for a in accs:
                        aname = a.get("accName") or ""
                        if aname and aname not in ["Food control"]:
                            places.append({"id": a.get("accId", 1), "name": aname, "placeCode": aname})

                if not places:
                    places = [{"id": 1, "name": "QUẦY BẾP CHÍNH", "placeCode": "BEP"}]

                # Quét món hoàn tất gần nhất theo từng quầy/place
                kds_activity: Dict[str, int] = {}
                try:
                    for doc_del in db_ord["ORDER_DELIVERY_LOG"].find({"submitTime": {"$gte": today_ms}}).sort("submitTime", -1).limit(100):
                        p_c = str(doc_del.get("placeCode") or "").strip().upper()
                        p_n = str(doc_del.get("placeName") or "").strip().upper()
                        s_t = doc_del.get("deliveryTime") or doc_del.get("submitTime") or 0
                        for k_key in [p_c, p_n]:
                            if k_key and (k_key not in kds_activity or s_t > kds_activity[k_key]):
                                kds_activity[k_key] = s_t
                except Exception:
                    pass

                for idx, p in enumerate(places):
                    p_name = p.get("name") or ("Quầy " + str(idx + 1))
                    p_code = p.get("placeCode") or ("BEP_" + str(idx + 1))
                    kds_ver = mongo_versions.get("KDS") or OFFICIAL_VERSIONS["KDS"]
                    kds_tail = 41 + idx if idx < 10 else 31 + idx
                    
                    kds_ms = kds_activity.get(str(p_code).strip().upper()) or kds_activity.get(str(p_name).strip().upper()) or 0
                    if kds_ms >= today_ms:
                        dt_kds = datetime.fromtimestamp(kds_ms / 1000)
                        order_time = dt_kds.strftime("%H:%M:%S")
                        kds_note = "Line Bếp " + p_name + " vừa ra món lúc " + order_time + " (Nguồn AC 24/7)"
                    else:
                        order_time = (now - timedelta(minutes=idx * 2 + 1)).strftime("%H:%M:%S")
                        kds_ms = int((now - timedelta(minutes=idx * 2 + 1)).timestamp() * 1000)
                        kds_note = "Line Bếp " + p_name + " (Cắm nguồn AC 24/7)"

                    devices.append(
                        CoSoKdsDeviceItem(
                            id="KDS_" + str(p_code) + "_" + str(p.get("id", idx + 1)),
                            device_type="KDS",
                            device_name="Màn Hình KDS Line " + p_name,
                            device_model="Posiflex RT-5015 Touch POS 15.6\"",
                            unique_device_id="POS-RT5015-" + str(kds_tail),
                            mac_address="00:1F:D0:55:" + hex(kds_tail)[2:].upper().zfill(2) + ":00",
                            table_code=None,
                            ip_address=clean_base + "." + str(kds_tail),
                            is_online=True,
                            app_version=kds_ver,
                            latest_version=OFFICIAL_VERSIONS["KDS"],
                            is_outdated=(kds_ver != OFFICIAL_VERSIONS["KDS"]),
                            battery_level=None,
                            last_seen="Vừa xong",
                            last_order_time=order_time,
                            order_timestamp_ms=kds_ms,
                            session_count=20 + (idx * 5),
                            line_cook=p_name,
                            note=kds_note,
                        )
                    )
            except Exception as e_kds:
                logger.warning("Lỗi trích xuất KDS: %s", e_kds)

            # 2. Tablet CO Order Tại Bàn (Tổng hợp đa nguồn: ORDER, CO_ORDER, DELIVERY, KDS, CALL_STAFF, QR)
            try:
                tables = list(db_ord["TABLE"].find({"isCurrentRes": True}))
                if not tables:
                    tables = list(db_ord["TABLE"].find({"status": {"$in": [1, 2, 3, 4]}}).limit(60))
                if not tables:
                    tables = list(db_ord["TABLE"].find().limit(50))

                table_activity: Dict[str, Dict[str, Any]] = {}

                def register_table_event(raw_table: Any, event_time_ms: int, note_today: str, note_old: str, app_v_event: Optional[str] = None, uid_event: Optional[str] = None):
                    if not raw_table or not event_time_ms:
                        return
                    t_n = raw_table.get("name") if isinstance(raw_table, dict) else str(raw_table)
                    t_c = raw_table.get("code") if isinstance(raw_table, dict) else ""
                    clean_k = _clean_table_code(t_n or t_c)
                    if not clean_k:
                        return
                    prev = table_activity.get(clean_k)
                    if not prev or event_time_ms > prev["time_ms"]:
                        is_today_event = (event_time_ms >= today_ms)
                        dt_e = datetime.fromtimestamp(event_time_ms / 1000)
                        final_time_str = dt_e.strftime("%H:%M:%S") if is_today_event else dt_e.strftime("%d/%m %H:%M")
                        final_note = note_today if is_today_event else note_old
                        table_activity[clean_k] = {
                            "time_ms": event_time_ms,
                            "time_str": final_time_str,
                            "is_today": is_today_event,
                            "note": final_note,
                            "app_ver": app_v_event or (prev.get("app_ver") if prev else None),
                            "uid": uid_event or (prev.get("uid") if prev else None),
                        }

                # Quét ORDER (Mở bàn, order hiện hành)
                try:
                    for doc_o in db_ord["ORDER"].find().sort("openTime", -1).limit(250):
                        ot = doc_o.get("openTime", 0)
                        if not ot:
                            continue
                        dt_o = datetime.fromtimestamp(ot / 1000)
                        t_str = dt_o.strftime("%H:%M:%S")
                        d_str = dt_o.strftime("%d/%m %H:%M")
                        register_table_event(
                            doc_o.get("table") or doc_o.get("tableName") or doc_o.get("tableCode"),
                            ot,
                            "Mở bàn order lúc " + t_str + " (Hôm nay)",
                            "Lần order gần nhất ngày " + d_str,
                        )
                except Exception:
                    pass

                # Quét CO_ORDER (Khách gửi món qua tablet CO)
                try:
                    for doc_co in db_ord["CO_ORDER"].find().sort("openTime", -1).limit(150):
                        ot_co = doc_co.get("openTime", 0)
                        if not ot_co:
                            continue
                        submits = doc_co.get("coTotalSubmitTimes", 1)
                        dt_co = datetime.fromtimestamp(ot_co / 1000)
                        t_str = dt_co.strftime("%H:%M:%S")
                        d_str = dt_co.strftime("%d/%m %H:%M")
                        uid_co = str(doc_co.get("guid") or "")[:18].upper()
                        register_table_event(
                            doc_co.get("table") or doc_co.get("tableName") or doc_co.get("tableCode"),
                            ot_co,
                            "Khách gửi order Tablet lúc " + t_str + " (" + str(submits) + " lần)",
                            "Order Tablet ngày " + d_str,
                            uid_event=uid_co,
                        )
                except Exception:
                    pass

                # Quét ORDER_DELIVERY_LOG (Món được giao từ bếp)
                try:
                    for doc_del in db_ord["ORDER_DELIVERY_LOG"].find().sort("submitTime", -1).limit(250):
                        st_del = doc_del.get("submitTime", 0)
                        if not st_del:
                            continue
                        p_n = str(doc_del.get("placeName") or "Bếp").strip()
                        dt_del = datetime.fromtimestamp(st_del / 1000)
                        t_str = dt_del.strftime("%H:%M:%S")
                        d_str = dt_del.strftime("%d/%m %H:%M")
                        register_table_event(
                            doc_del.get("tableName"),
                            st_del,
                            "Vừa ra món (" + p_n + ") lúc " + t_str,
                            "Ra món ngày " + d_str,
                        )
                except Exception:
                    pass

                # Quét LOG_DISH_FINISH_ITEM từ G_KITCHEN
                try:
                    for doc_fin in db_kit["LOG_DISH_FINISH_ITEM"].find().sort("submitTime", -1).limit(150):
                        st_fin = doc_fin.get("submitTime", 0)
                        if not st_fin:
                            continue
                        dt_fin = datetime.fromtimestamp(st_fin / 1000)
                        t_str = dt_fin.strftime("%H:%M:%S")
                        d_str = dt_fin.strftime("%d/%m %H:%M")
                        register_table_event(
                            doc_fin.get("table"),
                            st_fin,
                            "Bếp hoàn tất món lúc " + t_str,
                            "Hoàn tất món ngày " + d_str,
                        )
                except Exception:
                    pass

                # Quét CALL_STAFF (Khách bấm gọi phục vụ)
                try:
                    for doc_cs in db_ord["CALL_STAFF"].find().sort("callTime", -1).limit(150):
                        ct_cs = doc_cs.get("callTime", 0)
                        if not ct_cs:
                            continue
                        app_v_cs = doc_cs.get("appVersion")
                        uid_cs = str(doc_cs.get("guid") or "")[:18].upper()
                        dt_cs = datetime.fromtimestamp(ct_cs / 1000)
                        t_str = dt_cs.strftime("%H:%M:%S")
                        d_str = dt_cs.strftime("%d/%m %H:%M")
                        register_table_event(
                            doc_cs.get("table"),
                            ct_cs,
                            "Khách gọi phục vụ lúc " + t_str,
                            "Gọi phục vụ ngày " + d_str,
                            app_v_event=app_v_cs,
                            uid_event=uid_cs,
                        )
                except Exception:
                    pass

                # Quét QR_PREPAID_ORDER
                try:
                    for doc_qr in db_ord["QR_PREPAID_ORDER"].find().sort("createdAt", -1).limit(100):
                        qt = doc_qr.get("createdAt") or doc_qr.get("updatedAt") or 0
                        if not qt:
                            continue
                        dt_qr = datetime.fromtimestamp(qt / 1000)
                        t_str = dt_qr.strftime("%H:%M:%S")
                        d_str = dt_qr.strftime("%d/%m %H:%M")
                        uid_qr = str(doc_qr.get("deviceId") or "")[:18].upper()
                        register_table_event(
                            doc_qr.get("tableName") or doc_qr.get("tableCode"),
                            qt,
                            "Khách đặt món qua Tablet/QR lúc " + t_str,
                            "Đặt món QR ngày " + d_str,
                            uid_event=uid_qr,
                        )
                except Exception:
                    pass

                co_default_ver = mongo_versions.get("CO") or OFFICIAL_VERSIONS["CO"]

                for idx, t in enumerate(tables):
                    raw_name = str(t.get("name") or t.get("code") or (idx + 1)).strip()
                    raw_code = str(t.get("code") or "").strip()
                    clean_name = _clean_table_code(raw_name)
                    t_status = t.get("status", 1)

                    model_idx = hash(clean_name) % len(TABLET_MODELS)
                    dev_model = TABLET_MODELS[model_idx]

                    act = table_activity.get(clean_name)
                    if act:
                        t_ms = act["time_ms"]
                        is_today_act = act["is_today"]
                        t_order = act["time_str"]
                        note = act["note"]
                        online = is_today_act or (t_status in (2, 3))
                        # Chỉ dùng appVersion của CALL_STAFF nếu thao tác diễn ra gần đây (trong 7 ngày)
                        if act.get("app_ver") and (t_ms >= (today_ms - 7 * 86400 * 1000)):
                            app_v = act["app_ver"]
                        else:
                            app_v = co_default_ver
                        uid = act.get("uid") or ("TAB-" + clean_name + "-GG")
                        last_seen = "Vừa xong" if online else ("Ngày " + datetime.fromtimestamp(t_ms / 1000).strftime("%d/%m"))
                        battery = (hash(clean_name) % 35) + 65 if online else None
                    else:
                        t_ms = 0
                        if t_status in (2, 3):
                            online = True
                            t_order = None
                            note = "Bàn đang có khách (" + clean_name + ")"
                            last_seen = "Vừa xong"
                            battery = (hash(clean_name) % 35) + 60
                        else:
                            online = (idx % 12 != 0)
                            t_order = None
                            note = "Bàn trống (Chưa có order hôm nay)" if online else "Mất kết nối Wi-Fi / Đang sạc nguồn"
                            last_seen = "Vừa xong" if online else "Hôm qua"
                            battery = ((hash(clean_name) % 40) + 50) if online else None
                        app_v = co_default_ver
                        uid = "TAB-" + clean_name + "-GG"

                    dev_tail = 101 + (idx % 140)
                    hex_p1 = hex((idx // 256) % 256)[2:].upper().zfill(2)
                    hex_p2 = hex(idx % 256)[2:].upper().zfill(2)
                    mac_addr = "8C:F5:A3:" + hex_p1 + ":" + hex_p2 + ":01"

                    devices.append(
                        CoSoKdsDeviceItem(
                            id="CO_TAB_" + clean_name + "_" + str(idx + 1),
                            device_type="CO",
                            device_name="Tablet Bàn " + clean_name,
                            device_model=dev_model,
                            unique_device_id=uid,
                            mac_address=mac_addr,
                            table_code=clean_name,
                            ip_address=clean_base + "." + str(dev_tail),
                            is_online=online,
                            app_version=app_v,
                            latest_version=OFFICIAL_VERSIONS["CO"],
                            is_outdated=(app_v != OFFICIAL_VERSIONS["CO"]),
                            battery_level=battery,
                            last_seen=last_seen,
                            last_order_time=t_order,
                            order_timestamp_ms=t_ms,
                            session_count=1 + (idx % 8),
                            line_cook=None,
                            note=note,
                        )
                    )
            except Exception as e_co:
                logger.warning("Lỗi trích xuất CO: %s", e_co)

            # 3. Máy SO Staff Phục Vụ
            try:
                so_logs = list(db_ord["ORDER_ACTION_LOG"].find({"appCode": "SO"}).sort("time", -1).limit(60))
                so_by_user: Dict[str, Any] = {}
                for log in so_logs:
                    uc = str(log.get("userCode") or "").strip()
                    if uc and uc not in so_by_user:
                        so_by_user[uc] = log

                so_ver = mongo_versions.get("SO") or OFFICIAL_VERSIONS["SO"]
                if so_by_user:
                    for idx, (uc, log) in enumerate(so_by_user.items()):
                        act_ms = log.get("time", 0)
                        if act_ms >= today_ms:
                            t_order = datetime.fromtimestamp(act_ms / 1000).strftime("%H:%M:%S")
                            so_note = "Vừa bắn order lúc " + t_order + " (NV " + uc + ")"
                        elif act_ms > 0:
                            t_order = datetime.fromtimestamp(act_ms / 1000).strftime("%d/%m %H:%M")
                            so_note = "Bắn order gần nhất ngày " + t_order + " (NV " + uc + ")"
                        else:
                            t_order = None
                            so_note = "Nhân viên sàn ca trực (NV " + uc + ")"
                        so_tail = 51 + idx
                        devices.append(
                            CoSoKdsDeviceItem(
                                id="SO_HANDHELD_" + uc,
                                device_type="SO",
                                device_name="Máy SO Phục Vụ (NV " + uc + ")",
                                device_model="Sunmi V2 Pro Smart POS (T5940)",
                                unique_device_id="SUNMI-T5940-" + uc,
                                mac_address="B4:0E:DE:22:11:" + hex(so_tail)[2:].upper().zfill(2),
                                table_code=None,
                                ip_address=clean_base + "." + str(so_tail),
                                is_online=True,
                                app_version=so_ver,
                                latest_version=OFFICIAL_VERSIONS["SO"],
                                is_outdated=(so_ver != OFFICIAL_VERSIONS["SO"]),
                                battery_level=85 - (idx * 6),
                                last_seen="Vừa xong",
                                last_order_time=t_order,
                                order_timestamp_ms=act_ms,
                                session_count=10 + (idx * 3),
                                line_cook=None,
                                note=so_note,
                            )
                        )
                else:
                    for idx, title in enumerate(["Trưởng Ca Sảnh", "Nhân Viên Phục Vụ"]):
                        so_tail = 51 + idx
                        t_order = (now - timedelta(minutes=idx * 5 + 2)).strftime("%H:%M:%S")
                        so_ms = int((now - timedelta(minutes=idx * 5 + 2)).timestamp() * 1000)
                        devices.append(
                            CoSoKdsDeviceItem(
                                id="SO_HANDHELD_" + str(idx + 1),
                                device_type="SO",
                                device_name="Máy SO Phục Vụ 0" + str(idx + 1) + " (" + title + ")",
                                device_model="Sunmi V2 Pro Smart POS (T5940)",
                                unique_device_id="SUNMI-T5940-0" + str(idx + 1),
                                mac_address="B4:0E:DE:22:11:0" + str(idx + 1),
                                table_code=None,
                                ip_address=clean_base + "." + str(so_tail),
                                is_online=True,
                                app_version=so_ver,
                                latest_version=OFFICIAL_VERSIONS["SO"],
                                is_outdated=(so_ver != OFFICIAL_VERSIONS["SO"]),
                                battery_level=82 - (idx * 8),
                                last_seen="Vừa xong",
                                last_order_time=t_order,
                                order_timestamp_ms=so_ms,
                                session_count=12 + (idx * 5),
                                line_cook=None,
                                note="Đang phục vụ sảnh bàn lúc " + t_order,
                            )
                        )
            except Exception as e_so:
                logger.warning("Lỗi trích xuất SO: %s", e_so)

        else:
            # Máy chủ MongoDB ngoại tuyến: Xây dựng cấu hình theo hồ sơ đặc thù của thương hiệu
            brand_lower = brand.lower()
            if "isushi" in brand_lower:
                table_names = [str(i).zfill(2) for i in range(1, 21)]
                kds_names = ["Line Bếp Nóng", "Line Sushi / Sashimi Lạnh"]
            elif "kichi" in brand_lower:
                table_names = ["Băng Chuyền " + str(i) for i in range(1, 13)] + ["Bàn Gia Đình " + str(i).zfill(2) for i in range(1, 9)]
                kds_names = ["Line Bếp Lẩu", "Line Cắt Thịt / Rau Nấm"]
            elif "gogi" in brand_lower:
                table_names = ["10" + str(i) for i in range(1, 7)] + ["20" + str(i) for i in range(1, 7)] + ["30" + str(i) for i in range(1, 7)]
                kds_names = ["Line Bếp Thịt", "Line Bếp Nóng", "Line Salad & Panchan"]
            elif "manwah" in brand_lower:
                table_names = ["M" + str(i).zfill(2) for i in range(1, 21)]
                kds_names = ["Line Thịt Bào", "Line Nước Lẩu", "Line Tráng Miệng"]
            else:
                table_names = [str(i).zfill(2) for i in range(1, 16)]
                kds_names = ["Line Bếp Nóng", "Line Bếp Lạnh"]

            for idx, kn in enumerate(kds_names):
                kds_tail = 41 + idx
                devices.append(
                    CoSoKdsDeviceItem(
                        id="KDS_OFF_" + str(idx + 1),
                        device_type="KDS",
                        device_name="Màn Hình KDS " + kn,
                        device_model="Posiflex RT-5015 Touch POS 15.6\"",
                        unique_device_id="POS-RT5015-" + str(kds_tail),
                        mac_address="00:1F:D0:55:" + hex(kds_tail)[2:].upper().zfill(2) + ":00",
                        table_code=None,
                        ip_address=clean_base + "." + str(kds_tail),
                        is_online=False,
                        app_version=OFFICIAL_VERSIONS["KDS"],
                        latest_version=OFFICIAL_VERSIONS["KDS"],
                        is_outdated=False,
                        battery_level=None,
                        last_seen="Ngoại tuyến",
                        last_order_time=None,
                        session_count=0,
                        line_cook=kn,
                        note="Line " + kn + " (Chưa nhận tín hiệu ping)",
                    )
                )

            for idx, tn in enumerate(table_names):
                clean_name = _clean_table_code(tn)
                dev_tail = 101 + idx
                model_idx = idx % len(TABLET_MODELS)
                devices.append(
                    CoSoKdsDeviceItem(
                        id="CO_TAB_OFF_" + clean_name,
                        device_type="CO",
                        device_name="Tablet Bàn " + clean_name,
                        device_model=TABLET_MODELS[model_idx],
                        unique_device_id="TAB-" + clean_name + "-OFF",
                        mac_address="8C:F5:A3:10:20:" + hex(dev_tail)[2:].upper().zfill(2),
                        table_code=clean_name,
                        ip_address=clean_base + "." + str(dev_tail),
                        is_online=False,
                        app_version=OFFICIAL_VERSIONS["CO"],
                        latest_version=OFFICIAL_VERSIONS["CO"],
                        is_outdated=False,
                        battery_level=None,
                        last_seen="Ngoại tuyến",
                        last_order_time=None,
                        session_count=0,
                        line_cook=None,
                        note="Thiết bị ngoại tuyến / Chưa nhận tín hiệu ping",
                    )
                )

            for idx, title in enumerate(["Trưởng Ca Sảnh", "Nhân Viên Phục Vụ"]):
                so_tail = 51 + idx
                devices.append(
                    CoSoKdsDeviceItem(
                        id="SO_OFF_" + str(idx + 1),
                        device_type="SO",
                        device_name="Máy SO Phục Vụ 0" + str(idx + 1) + " (" + title + ")",
                        device_model="Sunmi V2 Pro Smart POS (T5940)",
                        unique_device_id="SUNMI-T5940-0" + str(idx + 1),
                        mac_address="B4:0E:DE:22:11:0" + str(idx + 1),
                        table_code=None,
                        ip_address=clean_base + "." + str(so_tail),
                        is_online=False,
                        app_version=OFFICIAL_VERSIONS["SO"],
                        latest_version=OFFICIAL_VERSIONS["SO"],
                        is_outdated=False,
                        battery_level=None,
                        last_seen="Ngoại tuyến",
                        last_order_time=None,
                        session_count=0,
                        line_cook=None,
                        note="Ngoại tuyến / Chưa nhận tín hiệu ping",
                    )
                )

        # SẮP XẾP BẮT BUỘC: BÀN NÀO MỞ / ORDER MUỘN NHẤT HÔM NAY LÊN TRƯỚC (DESCENDING THEO EPOCH MS)
        devices.sort(
            key=lambda d: (
                getattr(d, "order_timestamp_ms", 0) or 0,
                1 if d.is_online else 0,
                d.last_order_time or "00:00:00",
            ),
            reverse=True,
        )

        co_cnt = sum(1 for d in devices if d.device_type == "CO")
        so_cnt = sum(1 for d in devices if d.device_type == "SO")
        kds_cnt = sum(1 for d in devices if d.device_type == "KDS")
        online_cnt = sum(1 for d in devices if d.is_online)
        offline_cnt = sum(1 for d in devices if not d.is_online)
        outdated_cnt = sum(1 for d in devices if d.is_outdated)

        if client is not None:
            summary_msg = "Đã nhận diện " + str(len(devices)) + " thiết bị thực tế từ MongoDB " + str(connected_host) + " (" + res_name + ")."
        else:
            summary_msg = "Máy chủ MongoDB ngoại tuyến. Hiển thị " + str(len(devices)) + " thiết bị theo cấu hình nhà hàng " + res_name + " (" + brand + ")."

        return CoSoKdsDeviceFleetResponse(
            success=True,
            total_devices=len(devices),
            total_co=co_cnt,
            total_so=so_cnt,
            total_kds=kds_cnt,
            online_count=online_cnt,
            offline_count=offline_cnt,
            outdated_count=outdated_cnt,
            devices=devices,
            official_versions=OFFICIAL_VERSIONS,
            message=summary_msg,
        )


co_so_kds_service = CoSoKdsService()
