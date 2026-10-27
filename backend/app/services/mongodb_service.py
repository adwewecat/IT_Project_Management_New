from __future__ import annotations
import socket
import asyncio
import datetime
import unicodedata
import re
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Dict, Any
import pymongo.common
pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
from pymongo import MongoClient, ReturnDocument
from sqlalchemy.orm import Session

import os
import json
import logging

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
TRANSFER_SETTINGS_FILE = os.path.join(DATA_DIR, "mongo_transfer_settings.json")
BASE_TRANSFER_DEFAULT_TAILS = ["11", "12", "41"]

PARAM_SETTINGS_FILE = os.path.join(DATA_DIR, "mongo_param_settings.json")
BASE_PARAM_DEFAULT_TAILS = ["11", "12", "41"]

def get_param_default_tails() -> List[str]:
    """Lấy danh sách đuôi IP máy POS/KDS mặc định khi đẩy APP_PARAM (gốc: .11, .12, .41)."""
    if os.path.exists(PARAM_SETTINGS_FILE):
        try:
            with open(PARAM_SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                tails = data.get("default_tails")
                if isinstance(tails, list) and tails:
                    res = []
                    for t in tails:
                        cleaned = str(t).strip().lstrip(".")
                        if cleaned and cleaned not in res:
                            res.append(cleaned)
                    if res:
                        return res
        except Exception as e:
            logger.error(f"Lỗi đọc {PARAM_SETTINGS_FILE}: {e}")
    return list(BASE_PARAM_DEFAULT_TAILS)

def save_param_default_tails(tails: List[str]) -> List[str]:
    """Lưu danh sách đuôi IP POS/KDS để người dùng thêm/bớt trạm đẩy param."""
    clean_tails = []
    for t in tails:
        c = str(t).strip().lstrip(".")
        if c and c not in clean_tails:
            clean_tails.append(c)
    if not clean_tails:
        clean_tails = list(BASE_PARAM_DEFAULT_TAILS)
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(PARAM_SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump({"default_tails": clean_tails}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Lỗi ghi {PARAM_SETTINGS_FILE}: {e}")

# Từ điển tên tham số tiếng Việt chuẩn hóa cho toàn hệ thống
KNOWN_PARAM_NAMES: Dict[str, str] = {
    "SHOW_KDS": "Hiển thị KDS Bếp",
    "FUNC_SHOW_NOTE": "Hiển thị ghi chú trên CD",
    "FUNC_SHOW_PAYMENT_QR_ORDER": "Thanh toán QR Order",
    "FUNC_SHOW_UPDATE_ROLE": "Phân quyền vai trò User",
    "ROLE_SETUP_SHOW_HIDE_ITEM": "Quyền Ẩn / Hiện món",
    "FUNC_SHOW_TOTAL_MONEY": "Hiển thị tổng tiền",
    "FUNC_SHOW_VOUCHER": "Hiển thị Voucher ưu đãi",
    "FW_SUBMIT_FOR_LESS_THAN_THREE_GUEST": "Gửi món dưới 3 khách",
    "FW_SUBMIT_FOR_ROUND_DEFAULT": "Lượt gọi món mặc định",
    "HOT_TIP": "Số tiền Tip gợi ý",
    "CONFIG_NEW_QR_ORDER": "Hệ thống QR Order Mới",
    "AUTO_PRINT_QR_CODE": "Tự động in mã QR Code",
    "FUNC_BOOKING": "Chức năng Đặt Bàn (Booking)",
    "FUNC_CALL_SERVICE": "Nút Gọi Nhân Viên trên CO",
    "FUNC_SHOW_CANCEL_ITEM": "Ẩn / Hiện chức năng Trả Món",
    "FUNC_SHOW_CO_PAY": "Thanh toán trên máy CO",
    "PASSWORD_EXIT_TABLE": "Mật khẩu thoát bàn Order",
    "ROLE_UNLOCK_ORDER": "Quyền mở khóa bàn Order",
    "CONFIG_COOKING": "Thời gian chế biến món KDS",
    "PRINT_BILL_AFTER_PAY": "Tự động in Bill sau thanh toán",
    "ALTER_CO_MENU_ITEM": "Đổi món trên thực đơn CO",
    "BF_PENDING_DISH": "Món chờ Buffet (Pending Dish)",
    "CONFIG_LINK_CTKM": "Link Chương Trình Khuyến Mãi",
    "AUTO_MERGE_ORDER": "Tự động gộp Order",
    "ENABLE_FAST_PAYMENT": "Thanh toán nhanh (Fast Pay)",
    "SHOW_PRICE_ON_ORDER": "Hiển thị giá món trên Order",
    "TABLET_LAYOUT_MODE": "Chế độ giao diện Tablet",
    "ALLOW_PRINT_TEMP_BILL": "Cho phép in tạm tính",
    "NOTIFY_NEW_ORDER_SOUND": "Âm thanh thông báo Order mới",
    "ALLOW_HIDE_ITEM_GROUP": "Quyền thấy món đang hiện",
}

def normalize_param_name_and_note(param_code: str, raw_name: Optional[str] = None, raw_note: Optional[str] = None):
    """
    Chuẩn hóa tên tham số tiếng Việt và ghi chú hướng dẫn:
    - Tên tham số: Phải là mô tả tiếng Việt có ý nghĩa, không để trùng thô với mã tham số.
    - Ghi chú: Chỉ là note bổ sung hướng dẫn nghiệp vụ, không trùng mã tham số hay lặp lại tên.
    """
    p_code = (param_code or "").strip().upper()
    name = (raw_name or "").strip()
    note = (raw_note or "").strip()

    # 1. Tìm tên tiếng Việt chuẩn
    if p_code in KNOWN_PARAM_NAMES:
        final_name = KNOWN_PARAM_NAMES[p_code]
    elif name and name.upper() != p_code:
        final_name = name
    elif note and note.upper() != p_code:
        final_name = note
        note = ""
    else:
        final_name = p_code

    # 2. Làm sạch ghi chú: không được trùng mã hoặc trùng tên
    if note.upper() == p_code or note == final_name:
        final_note = ""
    else:
        final_note = note

    return final_name, final_note
    return clean_tails

def get_transfer_default_tails() -> List[str]:
    """Lấy danh sách đuôi IP mặc định khi quét chuyển DB MongoDB (gốc: .11, .12, .41)."""
    if os.path.exists(TRANSFER_SETTINGS_FILE):
        try:
            with open(TRANSFER_SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                tails = data.get("default_tails")
                if isinstance(tails, list) and tails:
                    res = []
                    for t in tails:
                        cleaned = str(t).strip().lstrip(".")
                        if cleaned and cleaned not in res:
                            res.append(cleaned)
                    if res:
                        return res
        except Exception as e:
            logger.error(f"Lỗi đọc {TRANSFER_SETTINGS_FILE}: {e}")
    return list(BASE_TRANSFER_DEFAULT_TAILS)

def save_transfer_default_tails(tails: List[str]) -> List[str]:
    """Lưu danh sách đuôi IP mặc định để tất cả các nhà hàng sau này đều quét."""
    clean_tails = []
    for t in tails:
        c = str(t).strip().lstrip(".")
        if c and c not in clean_tails:
            clean_tails.append(c)
    if not clean_tails:
        clean_tails = list(BASE_TRANSFER_DEFAULT_TAILS)
    os.makedirs(DATA_DIR, exist_ok=True)
    try:
        with open(TRANSFER_SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump({"default_tails": clean_tails}, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Lỗi ghi {TRANSFER_SETTINGS_FILE}: {e}")
    return clean_tails


def _remove_vietnamese_tones(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFD", text)
    text = re.sub(r"[\u0300-\u036f]", "", text)
    text = text.replace("đ", "d").replace("Đ", "D")
    return text.lower().strip()


from sqlalchemy import text
from app.models.restaurant import Restaurant
from app.models.audit_log import AuditLog
from app.models.standard_app_param import StandardAppParam
from app.models.scheduled_param_job import ScheduledParamPushJob
from app.schemas.auth import UserInfo
from app.schemas.mongodb import (
    MongoCandidateStatus,
    MongoConnectionCheckResponse,
    AppParamItem,
    AppParamUpdateRequest,
    AppParamCreateRequest,
    StandardAppParamItem,
    StandardAppParamCreateRequest,
    StandardAppParamUpdateRequest,
    SaveStandardParamsFromRestaurantRequest,
    ApplyStandardParamsToRestaurantRequest,
    ApplyStandardParamsResponse,
    SaveSingleStandardParamRequest,
    BatchTargetRestaurantItem,
    BatchApplyParamsRequest,
    BatchApplyRestaurantResult,
    BatchApplyParamsResponse,
    ScheduledParamJobItem,
    ScheduledParamJobCreateRequest,
    MongoKitchenCollectionInfo,
    KitchenOverviewResponse,
    KitchenAccountGroup,
    KdsItemDish,
    KdsItemsResponse,
    KdsCookingTimeUpdateRequest,
    KdsCookingTimeUpdateResponse,
    MasterDataSyncLogItem,
    MasterDataSyncLogResponse,
    TableReportItem,
    TableReportResponse,
    MongoCollectionInfo,
    MongoDbOverviewResponse,
    MongoCollectionPreviewResponse,
    LockedTableItem,
    RestaurantLockStatusResponse,
    ClearTableLockResponse,
    ActionLogSessionItem,
    ActionLogSessionsResponse,
    ActionLogRecordItem,
    ActionLogSessionDetailResponse,
    VoucherItem,
    CustomerInfoItem,
    PaymentInfoItem,
    VatInfoItem,
    TabletUserItem,
    TabletUsersResponse,
    UnlockTabletUserRequest,
    UnlockTabletUserResponse,
    RestaurantGposInfoResponse,
    DishShowHideItem,
    DishShowHideListResponse,
    DishShowHideSaveRequest,
    DishShowHideSaveResponse,
    MenuShowHideItem,
    MenuShowHideListResponse,
    MenuShowHideSaveRequest,
    MenuShowHideSaveResponse,
    KdsPlaceItem,
    KdsPlaceListResponse,
    KdsPlaceCreateRequest,
    KdsPlaceCreateResponse,
    KdsCreateFoodControlRequest,
    KdsCreateFoodControlResponse,
    KdsAssignDishQuayRequest,
    KdsAssignDishQuayResponse,
    KdsDishLookupResponse,
    KdsAddDishItem,
    KdsAddDishesRequest,
    KdsAddDishesResponse,
    KdsTransferQuayRequest,
    KdsTransferQuayResponse,
    KdsLogQueryRequest,
    KdsLogItem,
    KdsLogQueryResponse,
    KdsKitchenIntakeAnalysisRequest,
    KdsKitchenIntakePlaceStat,
    KdsKitchenIntakeDateStat,
    KdsKitchenIntakeHourStat,
    KdsKitchenIntakeAnalysisResponse,
    KdsDishHistoryRequest,
    KdsDishHistoryTimelineItem,
    KdsDishHistoryResponse,
    KdsSyncGroupsByQuaysRequest,
    KdsSyncGroupsByQuaysResponse,
    KdsUpdateDishGroupRequest,
    KdsUpdateDishGroupResponse,
    KdsDeleteCookingConfigRequest,
    KdsDeleteCookingConfigResponse,
    KdsUpdatePlacePrinterRequest,
    KdsUpdatePlacePrinterResponse,
    KdsPlaceDeleteRequest,
    KdsPlaceDeleteResponse,
    KdsRenamePlaceRequest,
    KdsRenamePlaceResponse,
    KdsToggleFoodControlRequest,
    KdsToggleFoodControlResponse,
    KdsRoleUserItem,
    KdsRoleUsersResponse,
    KdsRoleUserActionRequest,
    KdsRoleToggleStatusRequest,
    BatchRoleUserActionRequest,
    BatchRoleUserRestaurantResult,
    BatchRoleUserActionResponse,
    KdsMasterStatusResponse,
    KdsMasterStatusToggleRequest,
    MongoMachineStatus,
    MongoScanMachinesRequest,
    MongoScanMachinesResponse,
    MongoDatabaseDetail,
    MongoMachineInspection,
    MongoInspectPairRequest,
    MongoInspectPairResponse,
    MongoTransferExecuteRequest,
    MongoTransferStepLog,
    MongoTransferCollectionResult,
    MongoTransferExecuteResponse
)



def _check_tcp_port(ip: str, port: int = 27017, timeout: float = 1.0) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            s.connect((ip, port))
            return True
    except Exception:
        return False


def _verify_mongo_ping(ip: str, port: int = 27017, timeout_ms: int = 2000) -> bool:
    try:
        client = MongoClient(ip, port, serverSelectionTimeoutMS=timeout_ms)
        client.admin.command("ping")
        client.close()
        return True
    except Exception:
        return False


def resolve_mongo_target_ip(ip: str, default_port: int = 27017, timeout_sec: float = 0.7) -> tuple[Optional[str], Optional[str]]:
    """
    Tự động dò tìm địa chỉ IP máy POS/KDS thực tế đang chạy MongoDB (port 27017).
    Do trong bảng RESTAURANT, IP thường được lưu là IP router gateway (kết thúc bằng .1),
    trong khi MongoDB thực tế chạy ở các máy POS/KDS (.11, .12, .41, .13, .14, .42).

    Trả về: (actual_ip, error_message).
    """
    raw_ip = (ip or "").strip()
    if not raw_ip:
        return None, "Thiếu địa chỉ IP nhà hàng"

    subnet = MongoDBService.extract_subnet_prefix(raw_ip)
    if not subnet or not subnet.endswith("."):
        return None, f"Địa chỉ IP không hợp lệ: {raw_ip}"

    # Danh sách các đuôi máy POS / KDS đặc trưng của Golden Gate
    candidate_tails = ["11", "12", "41", "13", "14", "42"]

    # 1. Nếu raw_ip không phải .1, không phải .X (ví dụ người dùng đã chỉ định sẵn đích danh .11 hay .12)
    clean_raw = raw_ip.lower()
    is_gateway = clean_raw.endswith(".1")
    is_wildcard = clean_raw.endswith(".x") or clean_raw.endswith(".")

    if not is_gateway and not is_wildcard:
        if _check_tcp_port(raw_ip, default_port, timeout=timeout_sec):
            return raw_ip, None

    # 2. Quét song song các candidate IP trong subnet (.11, .12, .41, .13, .14, .42)
    candidate_ips = [f"{subnet}{tail}" for tail in candidate_tails if f"{subnet}{tail}" != raw_ip]

    def _test_candidate(c_ip: str) -> Optional[str]:
        if _check_tcp_port(c_ip, default_port, timeout=timeout_sec):
            return c_ip
        return None

    with ThreadPoolExecutor(max_workers=min(6, len(candidate_ips))) as executor:
        found_ips = list(executor.map(_test_candidate, candidate_ips))

    for f_ip in found_ips:
        if f_ip:
            return f_ip, None

    # 3. Nếu là gateway .1 nhưng cấu hình đặc thù server đặt ở gateway, thử kiểm tra nhanh
    if is_gateway:
        if _check_tcp_port(raw_ip, default_port, timeout=0.4):
            return raw_ip, None

    return None, f"Không tìm thấy máy POS/KDS nào mở port {default_port} trong dải {subnet}X (đã quét .11, .12, .41, .13, .14, .42)"


def _push_params_to_single_device(
    ip: str,
    port: int,
    params_to_push: List[dict],
    mode: str
) -> dict:
    """
    Thực thi đẩy param xuống một máy POS/KDS cụ thể.
    """
    if not _check_tcp_port(ip, port, timeout=0.8):
        return {
            "ip": ip,
            "connected": False,
            "success": False,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "error": "Port 27017 đóng hoặc máy tắt nguồn (Offline)"
        }

    client = None
    try:
        client = MongoClient(ip, port, serverSelectionTimeoutMS=2500, socketTimeoutMS=5000)
        col = client["G_ORDER"]["APP_PARAM"]

        ins_cnt = 0
        upd_cnt = 0
        skp_cnt = 0

        for p in params_to_push:
            code = p.get("paramCode")
            if not code:
                continue
            existing = col.find_one({"paramCode": code})
            if existing:
                if mode in ["upsert", "overwrite"]:
                    col.update_one(
                        {"paramCode": code},
                        {"$set": {
                            "paramName": p.get("paramName") or existing.get("paramName") or code,
                            "paramType": p.get("paramType") or existing.get("paramType") or "FUNCTION",
                            "status": int(p.get("status", 1)),
                            "value": str(p.get("value", "")),
                            "note": str(p.get("note", "")),
                            "updateDate": datetime.datetime.now()
                        }}
                    )
                    upd_cnt += 1
                else:
                    skp_cnt += 1
            else:
                col.insert_one({
                    "paramCode": code,
                    "paramName": p.get("paramName") or code,
                    "paramType": p.get("paramType") or "FUNCTION",
                    "status": int(p.get("status", 1)),
                    "value": str(p.get("value", "")),
                    "note": str(p.get("note", "")),
                    "createDate": datetime.datetime.now(),
                    "updateDate": datetime.datetime.now()
                })
                ins_cnt += 1

        return {
            "ip": ip,
            "connected": True,
            "success": True,
            "inserted": ins_cnt,
            "updated": upd_cnt,
            "skipped": skp_cnt,
            "error": None
        }
    except Exception as e:
        return {
            "ip": ip,
            "connected": True,
            "success": False,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "error": f"Lỗi ghi dữ liệu MongoDB ({ip}): {str(e)}"
        }
    finally:
        if client:
            try:
                client.close()
            except Exception:
                pass


def _push_params_to_restaurant(
    r_info: dict,
    params_to_push: List[dict],
    mode: str
) -> dict:
    """
    Thực thi đẩy tham số APP_PARAM xuống TẤT CẢ các máy POS/KDS (.11, .12, .41...) của nhà hàng.
    Đảm bảo xử lý đồng thời hết tất cả IP của nhà hàng, không bỏ sót bất kỳ máy POS nào.
    """
    r_name = r_info.get("name") or r_info.get("restaurant_name") or r_info.get("ip") or "Chưa rõ"
    raw_ip = (r_info.get("ip") or "").strip()
    r_port = int(r_info.get("port") or 27017)
    r_sap = r_info.get("sap_code")
    r_rk7 = r_info.get("rk7_code")

    if not raw_ip:
        return {
            "restaurant_name": r_name,
            "ip": "",
            "raw_ip": "",
            "sap_code": r_sap,
            "rk7_code": r_rk7,
            "success": False,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "error": "Thiếu địa chỉ IP nhà hàng",
            "device_results": []
        }

    subnet = MongoDBService.extract_subnet_prefix(raw_ip)
    tails = get_param_default_tails()  # Mặc định: ['11', '12', '41']

    # Danh sách tất cả các IP POS/KDS cần xử lý của nhà hàng
    target_ips = [f"{subnet}{t}" for t in tails]

    # Nếu raw_ip là một IP trạm cụ thể khác (không phải .1, không kết thúc bằng .X và không nằm trong target_ips)
    clean_raw = raw_ip.lower()
    if not clean_raw.endswith(".1") and not clean_raw.endswith(".x") and not clean_raw.endswith("."):
        if raw_ip not in target_ips:
            target_ips.append(raw_ip)

    # Đẩy song song xuống TẤT CẢ các máy POS/KDS của nhà hàng
    with ThreadPoolExecutor(max_workers=len(target_ips)) as dev_executor:
        dev_results = list(dev_executor.map(
            lambda target_ip: _push_params_to_single_device(target_ip, r_port, params_to_push, mode),
            target_ips
        ))

    successful_devices = [d for d in dev_results if d.get("success")]
    offline_devices = [d for d in dev_results if not d.get("connected")]
    error_devices = [d for d in dev_results if d.get("connected") and not d.get("success")]

    total_inserted = sum(d.get("inserted", 0) for d in successful_devices)
    total_updated = sum(d.get("updated", 0) for d in successful_devices)
    total_skipped = sum(d.get("skipped", 0) for d in successful_devices)

    if len(successful_devices) > 0:
        success_ip_list = [d["ip"] for d in successful_devices]
        if len(successful_devices) == len(target_ips):
            display_ip = f"{', '.join(success_ip_list)} (Đã cập nhật đủ {len(successful_devices)}/{len(target_ips)} máy)"
        else:
            offline_tails = [f".{d['ip'].split('.')[-1]}" for d in offline_devices]
            display_ip = f"{', '.join(success_ip_list)} ({len(successful_devices)}/{len(target_ips)} máy online; tắt: {', '.join(offline_tails)})"

        return {
            "restaurant_name": r_name,
            "ip": display_ip,
            "raw_ip": raw_ip,
            "sap_code": r_sap,
            "rk7_code": r_rk7,
            "success": True,
            "inserted": total_inserted,
            "updated": total_updated,
            "skipped": total_skipped,
            "error": None,
            "device_results": dev_results
        }
    else:
        tail_names = [f".{t}" for t in tails]
        return {
            "restaurant_name": r_name,
            "ip": f"{', '.join(target_ips)} (0/{len(target_ips)} máy)",
            "raw_ip": raw_ip,
            "sap_code": r_sap,
            "rk7_code": r_rk7,
            "success": False,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "error": f"Cả {len(target_ips)} máy POS/KDS ({', '.join(tail_names)}) đều không kết nối được (Offline / mất mạng)",
            "device_results": dev_results
        }


class MongoDBService:
    @staticmethod
    def extract_subnet_prefix(ip: str) -> str:
        """Trích xuất subnet dạng '10.9.91.' từ IP '10.9.91.1' hoặc '10.9.91.12'"""
        ip = (ip or "").strip()
        parts = ip.split(".")
        if len(parts) >= 3:
            return f"{parts[0]}.{parts[1]}.{parts[2]}."
        return ip

    @classmethod
    async def check_connection(
        cls,
        db: Session,
        restaurant_id: Optional[int] = None,
        ip: Optional[str] = None
    ) -> MongoConnectionCheckResponse:
        restaurant_name = None
        target_ip = ip

        if restaurant_id is not None:
            r = db.get(Restaurant, restaurant_id)
            if r:
                restaurant_name = r.res
                target_ip = r.ip or r.ip_wan or ip

        if not target_ip:
            return MongoConnectionCheckResponse(
                restaurant_id=restaurant_id,
                restaurant_name=restaurant_name,
                subnet="",
                candidates=[],
                is_connected=False,
                error_message="Không tìm thấy địa chỉ IP của nhà hàng để quét MongoDB."
            )

        subnet = cls.extract_subnet_prefix(target_ip)
        candidates_ips = [f"{subnet}11", f"{subnet}12", f"{subnet}13", f"{subnet}14", f"{subnet}41", f"{subnet}42"]

        # Run concurrent port checks using asyncio
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor(max_workers=6) as executor:
            tcp_tasks = [
                loop.run_in_executor(executor, _check_tcp_port, c_ip, 27017, 1.0)
                for c_ip in candidates_ips
            ]
            tcp_results = await asyncio.gather(*tcp_tasks)

        candidates: List[MongoCandidateStatus] = []
        connected_ip = None

        def _inspect_mongo_candidate(ip_addr: str) -> tuple:
            try:
                client = MongoClient(ip_addr, 27017, serverSelectionTimeoutMS=1500)
                client.admin.command("ping")
                all_dbs = client.list_database_names()
                is_kds = False
                kds_count = 0
                if "G_KITCHEN" in all_dbs:
                    try:
                        kds_count = client["G_KITCHEN"]["CONFIG_COOKING"].count_documents({})
                        if kds_count > 0:
                            is_kds = True
                    except Exception:
                        pass
                client.close()
                return True, is_kds, kds_count
            except Exception:
                return False, False, 0

        # Concurrently verify MongoDB and detect KDS for open ports
        open_ips = [c_ip for c_ip, is_open in zip(candidates_ips, tcp_results) if is_open]
        mongo_inspect_map = {}
        if open_ips:
            with ThreadPoolExecutor(max_workers=len(open_ips)) as executor:
                inspect_tasks = [
                    loop.run_in_executor(executor, _inspect_mongo_candidate, o_ip)
                    for o_ip in open_ips
                ]
                inspect_results = await asyncio.gather(*inspect_tasks)
                for o_ip, res_tuple in zip(open_ips, inspect_results):
                    mongo_inspect_map[o_ip] = res_tuple

        for c_ip, is_open in zip(candidates_ips, tcp_results):
            tail = c_ip.split(".")[-1]
            if tail in ["41", "42"]:
                default_role = f"Máy Bếp / KDS (.{tail})"
            elif tail == "11":
                default_role = "Máy POS 1 (.11)"
            elif tail == "12":
                default_role = "Máy POS 2 (.12)"
            else:
                default_role = f"Máy Trạm (.{tail})"

            if is_open:
                is_mongo, is_kds, kds_count = mongo_inspect_map.get(c_ip, (False, False, 0))
                if is_mongo:
                    role_hint = f"{default_role} - Có KDS ({kds_count} món)" if is_kds else default_role
                    candidates.append(MongoCandidateStatus(
                        ip=c_ip,
                        port=27017,
                        status="OPEN",
                        message=f"Đã kết nối thành công tới MongoDB Port 27017 ({role_hint})",
                        is_kds=is_kds,
                        kds_dish_count=kds_count,
                        role_hint=role_hint
                    ))
                    if connected_ip is None:
                        connected_ip = c_ip
                else:
                    candidates.append(MongoCandidateStatus(
                        ip=c_ip,
                        port=27017,
                        status="CLOSED",
                        message="Cổng 27017 mở nhưng không phản hồi giao thức MongoDB",
                        is_kds=False,
                        kds_dish_count=0,
                        role_hint=default_role
                    ))
            else:
                candidates.append(MongoCandidateStatus(
                    ip=c_ip,
                    port=27017,
                    status="CLOSED",
                    message="Không có service",
                    is_kds=False,
                    kds_dish_count=0,
                    role_hint=default_role
                ))

        connected_ips = [c.ip for c in candidates if c.status == "OPEN"]
        is_connected = len(connected_ips) > 0
        connected_ip = connected_ips[0] if is_connected else None
        error_message = None
        if not is_connected:
            error_message = "Nhà hàng chưa mở POS hoặc chưa được cài MongoDB hoặc chưa cài file bin kết nối IP, Vui lòng check lại cho Nhà này"

        return MongoConnectionCheckResponse(
            restaurant_id=restaurant_id,
            restaurant_name=restaurant_name,
            subnet=subnet,
            candidates=candidates,
            connected_ip=connected_ip,
            connected_ips=connected_ips,
            is_connected=is_connected,
            error_message=error_message
        )

    @staticmethod
    def get_app_params(
        host: str,
        port: int = 27017,
        search: Optional[str] = None,
        param_type: Optional[str] = None,
        status: Optional[int] = None
    ) -> List[AppParamItem]:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        db = client["G_ORDER"]
        col = db["APP_PARAM"]

        query: Dict[str, Any] = {}
        if param_type and param_type.strip() and param_type != "ALL":
            query["paramType"] = param_type.strip().upper()
        if status is not None and status in [0, 1]:
            query["status"] = int(status)

        records = list(col.find(query).sort("paramCode", 1))
        client.close()

        results: List[AppParamItem] = []
        for r in records:
            p_code = str(r.get("paramCode") or "")
            p_name = str(r.get("paramName") or "")
            note = str(r.get("note") or "")
            val = str(r.get("value") or "")

            if search and search.strip():
                s = search.strip().lower()
                if s not in p_code.lower() and s not in p_name.lower() and s not in note.lower() and s not in val.lower():
                    continue

            results.append(AppParamItem(
                id=str(r.get("_id")),
                paramCode=p_code,
                paramName=p_name or p_code,
                paramType=str(r.get("paramType") or "FUNCTION").strip().upper(),
                status=int(r.get("status") if r.get("status") is not None else 1),
                value=val,
                note=note,
                checkTimeRange=r.get("checkTimeRange")
            ))

        return results

    @staticmethod
    def update_app_param(
        db: Session,
        current_user: UserInfo,
        param_code: str,
        payload: AppParamUpdateRequest
    ) -> Dict[str, Any]:
        p_type = payload.paramType.strip().upper()
        if p_type not in ["FUNCTION", "CONFIG"]:
            raise ValueError("Kiểu tham số chỉ được chọn FUNCTION hoặc CONFIG")

        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        col = client["G_ORDER"]["APP_PARAM"]

        existing = col.find_one({"paramCode": param_code})
        if not existing:
            client.close()
            raise ValueError(f"Không tìm thấy tham số '{param_code}' trong cơ sở dữ liệu MongoDB.")

        old_val = str(existing.get("value") or "")
        old_status = existing.get("status")
        old_type = existing.get("paramType")

        update_fields: Dict[str, Any] = {
            "paramType": p_type,
            "status": int(payload.status),
            "value": str(payload.value or ""),
            "note": str(payload.note or "")
        }
        if payload.paramName is not None and payload.paramName.strip():
            update_fields["paramName"] = payload.paramName.strip()

        col.update_one(
            {"paramCode": param_code},
            {"$set": update_fields}
        )
        client.close()

        # Write audit log to SQL Server
        audit = AuditLog(
            manhinh="MONGODB_PARAM",
            noidung=f"Cập nhật APP_PARAM '{param_code}' trên {payload.host}: Kiểu {old_type}->{p_type}, Status {old_status}->{payload.status}, Value '{old_val}'->'{payload.value}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": f"Cập nhật tham số '{param_code}' thành công!",
            "paramCode": param_code,
            "paramName": payload.paramName if payload.paramName else existing.get("paramName"),
            "paramType": p_type,
            "status": payload.status,
            "value": payload.value,
            "note": payload.note
        }

    @staticmethod
    def create_app_param(
        db: Session,
        current_user: UserInfo,
        payload: AppParamCreateRequest
    ) -> Dict[str, Any]:
        p_type = payload.paramType.strip().upper()
        if p_type not in ["FUNCTION", "CONFIG"]:
            raise ValueError("Kiểu tham số chỉ được chọn FUNCTION hoặc CONFIG")

        p_code = payload.paramCode.strip().upper()
        if not p_code:
            raise ValueError("Mã tham số (Param Code) không được để trống")

        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        col = client["G_ORDER"]["APP_PARAM"]

        existing = col.find_one({"paramCode": p_code})
        if existing:
            client.close()
            raise ValueError(f"Mã tham số '{p_code}' đã tồn tại trên MongoDB nhà hàng.")

        p_name = payload.paramName.strip() if payload.paramName and payload.paramName.strip() else p_code
        new_doc = {
            "paramCode": p_code,
            "paramName": p_name,
            "paramType": p_type,
            "status": int(payload.status),
            "value": str(payload.value or ""),
            "note": str(payload.note or ""),
            "checkTimeRange": 0
        }
        res = col.insert_one(new_doc)
        client.close()

        # Write audit log to SQL Server
        audit = AuditLog(
            manhinh="MONGODB_PARAM",
            noidung=f"Thêm mới APP_PARAM '{p_code}' trên {payload.host}: Kiểu {p_type}, Status {payload.status}, Value '{payload.value}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "id": str(res.inserted_id),
            "message": f"Thêm mới tham số '{p_code}' thành công!",
            "paramCode": p_code,
            "paramType": p_type,
            "status": payload.status,
            "value": payload.value,
            "note": payload.note
        }

    @staticmethod
    def delete_app_param(
        db: Session,
        current_user: UserInfo,
        param_code: str,
        host: str,
        port: int = 27017
    ) -> Dict[str, Any]:
        p_code = param_code.strip()
        if not p_code:
            raise ValueError("Mã tham số không được để trống!")

        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        col = client["G_ORDER"]["APP_PARAM"]

        existing = col.find_one({"paramCode": p_code})
        if not existing:
            client.close()
            raise ValueError(f"Không tìm thấy tham số '{p_code}' trong cơ sở dữ liệu MongoDB.")

        col.delete_one({"paramCode": p_code})
        client.close()

        # Write audit log to SQL Server
        audit = AuditLog(
            manhinh="MONGODB_PARAM",
            noidung=f"Xóa APP_PARAM '{p_code}' trên {host}:{port}",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": f"Đã xóa tham số '{p_code}' khỏi MongoDB nhà hàng thành công!",
            "paramCode": p_code
        }

    # ==========================================================
    # QUẢN LÝ BỘ PARAM CHUẨN (STANDARD APP PARAMS)
    # ==========================================================
    @staticmethod
    def get_standard_app_params(
        db: Session,
        search: Optional[str] = None,
        param_type: Optional[str] = None,
        status: Optional[int] = None
    ) -> List[StandardAppParamItem]:
        query = db.query(StandardAppParam)
        if param_type and param_type.strip() and param_type.upper() != "ALL":
            query = query.filter(StandardAppParam.param_type == param_type.strip().upper())
        if status is not None and status in [0, 1]:
            query = query.filter(StandardAppParam.status == int(status))

        records = query.order_by(StandardAppParam.priority.desc(), StandardAppParam.param_code.asc()).all()

        results: List[StandardAppParamItem] = []
        for r in records:
            p_code = r.param_code or ""
            p_name, note = normalize_param_name_and_note(p_code, r.param_name, r.note)
            val = r.param_value or ""

            if search and search.strip():
                s = search.strip().lower()
                if (s not in p_code.lower() and s not in p_name.lower()
                        and s not in note.lower() and s not in val.lower()):
                    continue

            results.append(StandardAppParamItem(
                id=r.id,
                param_code=p_code,
                param_name=p_name,
                param_type=r.param_type,
                status=r.status,
                param_value=val,
                note=note,
                category=r.category,
                priority=r.priority or 0,
                nguoi_tao=r.nguoi_tao,
                nguoi_update=r.nguoi_update,
                ngay_tao=r.ngay_tao,
                ngay_update=r.ngay_update
            ))
        return results

    @staticmethod
    def create_standard_app_param(
        db: Session,
        current_user: UserInfo,
        payload: StandardAppParamCreateRequest
    ) -> StandardAppParamItem:
        p_code = payload.param_code.strip().upper()
        if not p_code:
            raise ValueError("Mã tham số chuẩn không được để trống!")

        p_type = payload.param_type.strip().upper()
        if p_type not in ["FUNCTION", "CONFIG"]:
            raise ValueError("Kiểu tham số chỉ được chọn FUNCTION hoặc CONFIG!")

        existing = db.query(StandardAppParam).filter(StandardAppParam.param_code == p_code).first()
        if existing:
            raise ValueError(f"Mã tham số chuẩn '{p_code}' đã tồn tại trong hệ thống!")

        now = datetime.datetime.now()
        p_name, note = normalize_param_name_and_note(p_code, payload.param_name, payload.note)
        item = StandardAppParam(
            param_code=p_code,
            param_name=p_name,
            param_type=p_type,
            status=payload.status,
            param_value=str(payload.param_value or ""),
            note=note,
            category=payload.category,
            priority=payload.priority or 0,
            nguoi_tao=current_user.username,
            nguoi_update=current_user.username,
            ngay_tao=now,
            ngay_update=now
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        audit = AuditLog(
            manhinh="STANDARD_APP_PARAM",
            noidung=f"Thêm mới Param Chuẩn '{p_code}': Kiểu {p_type}, Status {payload.status}, Value '{payload.param_value}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return StandardAppParamItem(
            id=item.id,
            param_code=item.param_code,
            param_name=item.param_name,
            param_type=item.param_type,
            status=item.status,
            param_value=item.param_value,
            note=item.note,
            category=item.category,
            priority=item.priority,
            nguoi_tao=item.nguoi_tao,
            nguoi_update=item.nguoi_update,
            ngay_tao=item.ngay_tao,
            ngay_update=item.ngay_update
        )

    @staticmethod
    def update_standard_app_param(
        db: Session,
        current_user: UserInfo,
        param_code: str,
        payload: StandardAppParamUpdateRequest
    ) -> StandardAppParamItem:
        p_code = param_code.strip().upper()
        item = db.query(StandardAppParam).filter(StandardAppParam.param_code == p_code).first()
        if not item:
            raise ValueError(f"Không tìm thấy tham số chuẩn '{p_code}' trong hệ thống!")

        old_type = item.param_type
        old_status = item.status
        old_val = item.param_value

        if payload.param_name is not None:
            p_name_candidate = payload.param_name.strip()
            item.param_name = p_name_candidate if p_name_candidate else KNOWN_PARAM_NAMES.get(p_code, p_code)
        if payload.param_type is not None:
            pt = payload.param_type.strip().upper()
            if pt not in ["FUNCTION", "CONFIG"]:
                raise ValueError("Kiểu tham số chỉ được chọn FUNCTION hoặc CONFIG!")
            item.param_type = pt
        if payload.status is not None:
            item.status = int(payload.status)
        if payload.param_value is not None:
            item.param_value = str(payload.param_value)
        if payload.note is not None:
            n_candidate = str(payload.note).strip()
            item.note = "" if (n_candidate.upper() == p_code or n_candidate == item.param_name) else n_candidate
        if payload.category is not None:
            item.category = payload.category
        if payload.priority is not None:
            item.priority = int(payload.priority)

        item.nguoi_update = current_user.username
        item.ngay_update = datetime.datetime.now()
        db.commit()
        db.refresh(item)

        audit = AuditLog(
            manhinh="STANDARD_APP_PARAM",
            noidung=f"Cập nhật Param Chuẩn '{p_code}': Kiểu {old_type}->{item.param_type}, Status {old_status}->{item.status}, Value '{old_val}'->'{item.param_value}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return StandardAppParamItem(
            id=item.id,
            param_code=item.param_code,
            param_name=item.param_name,
            param_type=item.param_type,
            status=item.status,
            param_value=item.param_value,
            note=item.note,
            category=item.category,
            priority=item.priority,
            nguoi_tao=item.nguoi_tao,
            nguoi_update=item.nguoi_update,
            ngay_tao=item.ngay_tao,
            ngay_update=item.ngay_update
        )

    @staticmethod
    def delete_standard_app_param(
        db: Session,
        current_user: UserInfo,
        param_code: str
    ) -> Dict[str, Any]:
        p_code = param_code.strip().upper()
        item = db.query(StandardAppParam).filter(StandardAppParam.param_code == p_code).first()
        if not item:
            raise ValueError(f"Không tìm thấy tham số chuẩn '{p_code}' trong hệ thống!")

        db.delete(item)
        db.commit()

        audit = AuditLog(
            manhinh="STANDARD_APP_PARAM",
            noidung=f"Xóa Param Chuẩn '{p_code}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": f"Đã xóa tham số chuẩn '{p_code}' thành công!",
            "param_code": p_code
        }

    @staticmethod
    def save_standard_params_from_restaurant(
        db: Session,
        current_user: UserInfo,
        payload: SaveStandardParamsFromRestaurantRequest
    ) -> Dict[str, Any]:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        col = client["G_ORDER"]["APP_PARAM"]

        query: Dict[str, Any] = {}
        if payload.selected_param_codes and len(payload.selected_param_codes) > 0:
            query["paramCode"] = {"$in": payload.selected_param_codes}

        records = list(col.find(query))
        client.close()

        if not records:
            raise ValueError(f"Không tìm thấy bản ghi APP_PARAM nào từ MongoDB ({payload.host}:{payload.port})!")

        now = datetime.datetime.now()
        inserted_count = 0
        updated_count = 0

        for r in records:
            p_code = str(r.get("paramCode") or "").strip().upper()
            if not p_code:
                continue

            raw_name = str(r.get("paramName") or "").strip()
            raw_note = str(r.get("note") or "").strip()
            p_name, note = normalize_param_name_and_note(p_code, raw_name, raw_note)

            p_type = str(r.get("paramType") or "FUNCTION").strip().upper()
            if p_type not in ["FUNCTION", "CONFIG"]:
                p_type = "FUNCTION"
            st = int(r.get("status") if r.get("status") is not None else 1)
            val = str(r.get("value") or "")

            existing = db.query(StandardAppParam).filter(StandardAppParam.param_code == p_code).first()
            if existing:
                existing.param_name = p_name
                existing.param_type = p_type
                existing.status = st
                existing.param_value = val
                existing.note = note
                existing.nguoi_update = current_user.username
                existing.ngay_update = now
                updated_count += 1
            else:
                new_item = StandardAppParam(
                    param_code=p_code,
                    param_name=p_name,
                    param_type=p_type,
                    status=st,
                    param_value=val,
                    note=note,
                    priority=0,
                    nguoi_tao=current_user.username,
                    nguoi_update=current_user.username,
                    ngay_tao=now,
                    ngay_update=now
                )
                db.add(new_item)
                inserted_count += 1

        db.commit()

        audit = AuditLog(
            manhinh="STANDARD_APP_PARAM",
            noidung=f"Lưu params từ nhà hàng {payload.host}:{payload.port} vào Bộ Param Chuẩn: {inserted_count} thêm mới, {updated_count} cập nhật",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return {
            "success": True,
            "message": f"Đã lưu thành công {inserted_count + updated_count} tham số vào Bộ Param Chuẩn ({inserted_count} thêm mới, {updated_count} cập nhật)!",
            "inserted_count": inserted_count,
            "updated_count": updated_count,
            "total_count": inserted_count + updated_count
        }

    @staticmethod
    def apply_standard_params_to_restaurant(
        db: Session,
        current_user: UserInfo,
        payload: ApplyStandardParamsToRestaurantRequest
    ) -> ApplyStandardParamsResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        col = client["G_ORDER"]["APP_PARAM"]

        query = db.query(StandardAppParam)
        if payload.selected_param_codes and len(payload.selected_param_codes) > 0:
            query = query.filter(StandardAppParam.param_code.in_(payload.selected_param_codes))

        standard_records = query.all()
        if not standard_records:
            client.close()
            raise ValueError("Không có tham số chuẩn nào để áp dụng!")

        mode = (payload.mode or "skip_existing").strip().lower()
        inserted_count = 0
        overwritten_count = 0
        skipped_count = 0

        for s in standard_records:
            existing = col.find_one({"paramCode": s.param_code})
            if existing:
                if mode == "overwrite":
                    col.update_one(
                        {"paramCode": s.param_code},
                        {"$set": {
                            "paramName": s.param_name,
                            "paramType": s.param_type,
                            "status": s.status,
                            "value": s.param_value or "",
                            "note": s.note or ""
                        }}
                    )
                    overwritten_count += 1
                else:
                    skipped_count += 1
            else:
                col.insert_one({
                    "paramCode": s.param_code,
                    "paramName": s.param_name,
                    "paramType": s.param_type,
                    "status": s.status,
                    "value": s.param_value or "",
                    "note": s.note or ""
                })
                inserted_count += 1

        client.close()

        mode_desc = "Ghi đè" if mode == "overwrite" else "Giữ nguyên cũ"
        audit = AuditLog(
            manhinh="STANDARD_APP_PARAM",
            noidung=f"Áp dụng Param Chuẩn xuống nhà hàng {payload.host}:{payload.port} (Chế độ: {mode_desc}): {inserted_count} thêm mới, {overwritten_count} ghi đè, {skipped_count} bỏ qua",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        msg = f"Đã áp dụng xong bộ param chuẩn xuống nhà ({payload.host}): Thêm mới {inserted_count}, Ghi đè {overwritten_count}, Giữ nguyên {skipped_count}."
        return ApplyStandardParamsResponse(
            success=True,
            message=msg,
            inserted_count=inserted_count,
            overwritten_count=overwritten_count,
            skipped_count=skipped_count,
            total_standard=len(standard_records),
            restaurant_host=payload.host
        )

    @staticmethod
    def save_single_standard_param(
        db: Session,
        current_user: UserInfo,
        payload: SaveSingleStandardParamRequest
    ) -> StandardAppParamItem:
        p_code = payload.param_code.strip().upper()
        if not p_code:
            raise ValueError("Mã tham số không được để trống!")

        p_name, note = normalize_param_name_and_note(p_code, payload.param_name, payload.note)
        now = datetime.datetime.now()
        existing = db.query(StandardAppParam).filter(StandardAppParam.param_code == p_code).first()
        if existing:
            existing.param_name = p_name
            existing.param_type = (payload.param_type or "FUNCTION").strip().upper()
            existing.status = payload.status
            existing.param_value = str(payload.param_value or "")
            existing.note = note
            if payload.category is not None:
                existing.category = payload.category
            if payload.priority:
                existing.priority = payload.priority
            existing.nguoi_update = current_user.username
            existing.ngay_update = now
            db.commit()
            db.refresh(existing)
            target_item = existing
            action_desc = "Cập nhật"
        else:
            new_item = StandardAppParam(
                param_code=p_code,
                param_name=p_name,
                param_type=(payload.param_type or "FUNCTION").strip().upper(),
                status=payload.status,
                param_value=str(payload.param_value or ""),
                note=note,
                category=payload.category,
                priority=payload.priority or 0,
                nguoi_tao=current_user.username,
                nguoi_update=current_user.username,
                ngay_tao=now,
                ngay_update=now
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            target_item = new_item
            action_desc = "Thêm mới"

        audit = AuditLog(
            manhinh="STANDARD_APP_PARAM",
            noidung=f"{action_desc} Tham Số Chuẩn '{p_code}': Status {target_item.status}, Value '{target_item.param_value}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return StandardAppParamItem(
            id=target_item.id,
            param_code=target_item.param_code,
            param_name=target_item.param_name,
            param_type=target_item.param_type,
            status=target_item.status,
            param_value=target_item.param_value,
            note=target_item.note,
            category=target_item.category,
            priority=target_item.priority,
            nguoi_tao=target_item.nguoi_tao,
            nguoi_update=target_item.nguoi_update,
            ngay_tao=target_item.ngay_tao,
            ngay_update=target_item.ngay_update
        )

    @staticmethod
    def batch_apply_params(
        db: Session,
        current_user: UserInfo,
        payload: BatchApplyParamsRequest
    ) -> BatchApplyParamsResponse:
        """
        Áp dụng danh sách param xuống hàng loạt nhà hàng.
        Hỗ trợ 3 options:
        - 'upsert': Cập nhật param cũ & Thêm mới nếu chưa có.
        - 'overwrite': Đè luôn param cũ.
        - 'skip_existing': Giữ nguyên param cũ, chỉ thêm mới.
        """
        # Xác định params cần đẩy
        params_to_push = []
        if payload.custom_params and len(payload.custom_params) > 0:
            params_to_push = payload.custom_params
        else:
            query = db.query(StandardAppParam)
            if payload.selected_param_codes and len(payload.selected_param_codes) > 0:
                query = query.filter(StandardAppParam.param_code.in_(payload.selected_param_codes))
            std_list = query.all()
            if not std_list:
                raise ValueError("Không có tham số nào được chọn để áp dụng!")
            for s in std_list:
                params_to_push.append({
                    "paramCode": s.param_code,
                    "paramName": s.param_name,
                    "paramType": s.param_type,
                    "status": s.status,
                    "value": s.param_value or "",
                    "note": s.note or ""
                })

        mode = (payload.mode or "upsert").strip().lower()
        target_dicts = [
            {
                "name": r.name or r.ip,
                "ip": r.ip,
                "port": r.port or 27017,
                "sap_code": r.sap_code,
                "rk7_code": r.rk7_code
            }
            for r in payload.target_restaurants
        ]

        # Xử lý song song đa luồng qua ThreadPoolExecutor
        workers = min(12, max(1, len(target_dicts)))
        with ThreadPoolExecutor(max_workers=workers) as executor:
            push_fn = lambda r_item: _push_params_to_restaurant(r_item, params_to_push, mode)
            raw_results = list(executor.map(push_fn, target_dicts))

        results = [
            BatchApplyRestaurantResult(
                restaurant_name=res["restaurant_name"],
                ip=res["ip"],
                raw_ip=res.get("raw_ip"),
                sap_code=res.get("sap_code"),
                rk7_code=res.get("rk7_code"),
                success=res["success"],
                inserted=res.get("inserted", 0),
                updated=res.get("updated", 0),
                skipped=res.get("skipped", 0),
                error=res.get("error"),
                device_results=res.get("device_results")
            )
            for res in raw_results
        ]
        success_count = sum(1 for res in results if res.success)
        failed_count = sum(1 for res in results if not res.success)

        audit = AuditLog(
            manhinh="APP_PARAM_BATCH_APPLY",
            noidung=f"Áp dụng Param hàng loạt cho {len(payload.target_restaurants)} nhà hàng (Chế độ: {mode}): {success_count} thành công, {failed_count} lỗi",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return BatchApplyParamsResponse(
            success=True,
            message=f"Đã xử lý áp dụng tham số cho {len(payload.target_restaurants)} nhà hàng ({success_count} thành công, {failed_count} thất bại).",
            total_restaurants=len(payload.target_restaurants),
            success_count=success_count,
            failed_count=failed_count,
            details=results
        )

    @staticmethod
    def execute_scheduled_param_job(
        db: Session,
        job: ScheduledParamPushJob,
        triggered_by: str = "System (Scheduler)"
    ) -> ScheduledParamPushJob:
        """
        Thực thi một lịch hẹn giờ đẩy param xuống các nhà hàng đã cấu hình (chạy song song đa luồng).
        """
        job.status = "RUNNING"
        db.commit()

        try:
            target_restaurants = json.loads(job.target_restaurants_json or "[]")
            params_to_push = json.loads(job.params_payload_json or "[]")
        except Exception as e:
            job.status = "FAILED"
            job.result_summary_json = json.dumps([{"error": f"Lỗi giải mã JSON cấu hình: {e}"}], ensure_ascii=False)
            job.executed_at = datetime.datetime.now()
            db.commit()
            return job

        mode = (job.mode or "upsert").strip().lower()

        # Xử lý song song đa luồng qua ThreadPoolExecutor
        workers = min(12, max(1, len(target_restaurants)))
        with ThreadPoolExecutor(max_workers=workers) as executor:
            push_fn = lambda r_item: _push_params_to_restaurant(r_item, params_to_push, mode)
            results = list(executor.map(push_fn, target_restaurants))

        success_count = sum(1 for res in results if res.get("success"))
        failed_count = sum(1 for res in results if not res.get("success"))

        job.status = "COMPLETED" if success_count > 0 else "FAILED"
        job.success_count = success_count
        job.failed_count = failed_count
        job.executed_at = datetime.datetime.now()
        job.result_summary_json = json.dumps(results, ensure_ascii=False)
        db.commit()

        audit = AuditLog(
            manhinh="SCHEDULED_PARAM_JOB",
            noidung=f"Thực thi lịch hẹn '{job.job_title}' (ID {job.id}): {success_count} thành công, {failed_count} thất bại (Trigger: {triggered_by})",
            user_thuchien=triggered_by
        )
        db.add(audit)
        db.commit()

        return job

    @staticmethod
    def execute_scheduled_param_job_by_id(
        job_id: int,
        triggered_by: str = "System (Scheduler)"
    ) -> Optional[ScheduledParamPushJob]:
        """
        Thực thi một lịch hẹn giờ đẩy param trong một Session riêng biệt (thread-safe cho background scheduler).
        """
        from app.core.database import SessionLocal
        with SessionLocal() as db:
            job = db.query(ScheduledParamPushJob).filter(ScheduledParamPushJob.id == job_id).first()
            if not job:
                logger.error("Không tìm thấy ScheduledParamPushJob #%s", job_id)
                return None
            return MongoDBService.execute_scheduled_param_job(db=db, job=job, triggered_by=triggered_by)

    @staticmethod
    def get_scheduled_param_jobs(db: Session, status: Optional[str] = None) -> List[ScheduledParamJobItem]:
        query = db.query(ScheduledParamPushJob)
        if status:
            query = query.filter(ScheduledParamPushJob.status == status.strip().upper())
        records = query.order_by(
            ScheduledParamPushJob.run_date.desc(),
            ScheduledParamPushJob.run_time.desc(),
            ScheduledParamPushJob.id.desc()
        ).all()

        results: List[ScheduledParamJobItem] = []
        for r in records:
            try:
                targets = json.loads(r.target_restaurants_json or "[]")
            except Exception:
                targets = []
            try:
                params_list = json.loads(r.params_payload_json or "[]")
            except Exception:
                params_list = []
            try:
                res_sum = json.loads(r.result_summary_json) if r.result_summary_json else None
            except Exception:
                res_sum = None

            results.append(ScheduledParamJobItem(
                id=r.id,
                job_title=r.job_title,
                run_date=r.run_date,
                run_time=r.run_time,
                mode=r.mode,
                target_restaurants=targets,
                params_payload=params_list,
                status=r.status,
                total_restaurants=r.total_restaurants,
                success_count=r.success_count,
                failed_count=r.failed_count,
                result_summary=res_sum,
                created_by=r.created_by,
                created_at=r.created_at,
                executed_at=r.executed_at
            ))
        return results

    @staticmethod
    def create_scheduled_param_job(
        db: Session,
        current_user: UserInfo,
        payload: ScheduledParamJobCreateRequest
    ) -> ScheduledParamJobItem:
        if not payload.job_title.strip():
            raise ValueError("Vui lòng nhập tên lịch hẹn giờ!")
        if not payload.run_date.strip() or not payload.run_time.strip():
            raise ValueError("Vui lòng chọn ngày và giờ chạy lịch hẹn!")
        if not payload.target_restaurants or len(payload.target_restaurants) == 0:
            raise ValueError("Vui lòng chọn ít nhất 1 nhà hàng để áp dụng!")

        # Chuẩn bị params payload
        params_payload = []
        if payload.selected_param_codes and len(payload.selected_param_codes) > 0:
            query = db.query(StandardAppParam).filter(StandardAppParam.param_code.in_(payload.selected_param_codes))
            std_list = query.all()
            for s in std_list:
                params_payload.append({
                    "paramCode": s.param_code,
                    "paramName": s.param_name,
                    "paramType": s.param_type,
                    "status": s.status,
                    "value": s.param_value or "",
                    "note": s.note or ""
                })

        if payload.custom_params and len(payload.custom_params) > 0:
            existing_codes = {p["paramCode"] for p in params_payload}
            for cp in payload.custom_params:
                c_code = (cp.get("paramCode") or cp.get("param_code") or "").strip().upper()
                if not c_code:
                    continue
                item = {
                    "paramCode": c_code,
                    "paramName": cp.get("paramName") or cp.get("param_name") or c_code,
                    "paramType": cp.get("paramType") or cp.get("param_type") or "FUNCTION",
                    "status": int(cp.get("status", 1)),
                    "value": str(cp.get("value", cp.get("param_value", ""))),
                    "note": str(cp.get("note", ""))
                }
                if c_code in existing_codes:
                    params_payload = [p if p["paramCode"] != c_code else item for p in params_payload]
                else:
                    params_payload.append(item)
                    existing_codes.add(c_code)

        if not params_payload:
            # Nếu không chọn mã cụ thể và không có custom_params, lấy toàn bộ từ bộ chuẩn
            if payload.selected_param_codes is None or len(payload.selected_param_codes) == 0:
                std_all = db.query(StandardAppParam).all()
                for s in std_all:
                    params_payload.append({
                        "paramCode": s.param_code,
                        "paramName": s.param_name,
                        "paramType": s.param_type,
                        "status": s.status,
                        "value": s.param_value or "",
                        "note": s.note or ""
                    })

        if not params_payload:
            raise ValueError("Không có tham số nào được chọn hoặc tự nhập để đưa vào lịch hẹn!")

        targets_json = json.dumps([t.dict() for t in payload.target_restaurants], ensure_ascii=False)
        params_json = json.dumps(params_payload, ensure_ascii=False)

        job = ScheduledParamPushJob(
            job_title=payload.job_title.strip(),
            run_date=payload.run_date.strip(),
            run_time=payload.run_time.strip(),
            mode=payload.mode.strip().lower(),
            target_restaurants_json=targets_json,
            params_payload_json=params_json,
            status="PENDING",
            total_restaurants=len(payload.target_restaurants),
            success_count=0,
            failed_count=0,
            created_by=current_user.username,
            created_at=datetime.datetime.now()
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        audit = AuditLog(
            manhinh="SCHEDULED_PARAM_JOB",
            noidung=f"Tạo lịch hẹn đẩy Param: '{job.job_title}' (Ngày {job.run_date} lúc {job.run_time}, {job.total_restaurants} nhà hàng, Chế độ: {job.mode})",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return ScheduledParamJobItem(
            id=job.id,
            job_title=job.job_title,
            run_date=job.run_date,
            run_time=job.run_time,
            mode=job.mode,
            target_restaurants=[t.dict() for t in payload.target_restaurants],
            params_payload=params_payload,
            status=job.status,
            total_restaurants=job.total_restaurants,
            success_count=0,
            failed_count=0,
            result_summary=None,
            created_by=job.created_by,
            created_at=job.created_at,
            executed_at=None
        )

    @staticmethod
    def delete_scheduled_param_job(
        db: Session,
        current_user: UserInfo,
        job_id: int
    ) -> Dict[str, Any]:
        job = db.query(ScheduledParamPushJob).filter(ScheduledParamPushJob.id == job_id).first()
        if not job:
            raise ValueError(f"Không tìm thấy lịch hẹn giờ ID {job_id}!")

        title = job.job_title
        db.delete(job)
        db.commit()

        audit = AuditLog(
            manhinh="SCHEDULED_PARAM_JOB",
            noidung=f"Xóa lịch hẹn đẩy Param ID {job_id}: '{title}'",
            user_thuchien=current_user.username
        )
        db.add(audit)
        db.commit()

        return {"success": True, "message": f"Đã xóa lịch hẹn giờ '{title}' thành công!"}

    @staticmethod
    def run_scheduled_param_job_now(
        db: Session,
        current_user: UserInfo,
        job_id: int
    ) -> ScheduledParamJobItem:
        job = db.query(ScheduledParamPushJob).filter(ScheduledParamPushJob.id == job_id).first()
        if not job:
            raise ValueError(f"Không tìm thấy lịch hẹn giờ ID {job_id}!")

        executed_job = MongoDBService.execute_scheduled_param_job(
            db=db,
            job=job,
            triggered_by=current_user.username
        )

        try:
            targets = json.loads(executed_job.target_restaurants_json or "[]")
        except Exception:
            targets = []
        try:
            params_list = json.loads(executed_job.params_payload_json or "[]")
        except Exception:
            params_list = []
        try:
            res_sum = json.loads(executed_job.result_summary_json) if executed_job.result_summary_json else None
        except Exception:
            res_sum = None

        return ScheduledParamJobItem(
            id=executed_job.id,
            job_title=executed_job.job_title,
            run_date=executed_job.run_date,
            run_time=executed_job.run_time,
            mode=executed_job.mode,
            target_restaurants=targets,
            params_payload=params_list,
            status=executed_job.status,
            total_restaurants=executed_job.total_restaurants,
            success_count=executed_job.success_count,
            failed_count=executed_job.failed_count,
            result_summary=res_sum,
            created_by=executed_job.created_by,
            created_at=executed_job.created_at,
            executed_at=executed_job.executed_at
        )

    @staticmethod
    def get_kitchen_overview(host: str, port: int = 27017) -> KitchenOverviewResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        db = client["G_KITCHEN"]
        collections_names = sorted(db.list_collection_names())

        cols_info: List[MongoKitchenCollectionInfo] = []
        for c in collections_names:
            try:
                cnt = db[c].estimated_document_count()
            except Exception:
                cnt = -1
            cols_info.append(MongoKitchenCollectionInfo(name=c, count=cnt))

        client.close()
        return KitchenOverviewResponse(
            host=host,
            port=port,
            collections=cols_info,
            total_collections=len(cols_info)
        )

    @staticmethod
    def get_kds_items(
        host: str,
        port: int = 27017,
        search: Optional[str] = None,
        price_status: Optional[str] = None,
        group_kds: Optional[str] = None,
        quay: Optional[str] = None,
    ) -> KdsItemsResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        db_kitchen = client["G_KITCHEN"]
        db_order = client["G_ORDER"]

        # 1. Read ACCOUNT from G_KITCHEN to map quầy / bộ phận bếp
        account_docs = list(db_kitchen["ACCOUNT"].find())
        # place_id → list of account names that own/monitor this place
        place_id_to_account_names: Dict[int, List[str]] = {}
        accounts_summary: List[KitchenAccountGroup] = []

        for acc in account_docs:
            acc_name = str(acc.get("accName") or "").strip()
            acc_id = str(acc.get("accId") or "").strip()
            acc_pass = str(acc.get("pass") or "").strip() or None
            p_ids = []
            for p in (acc.get("listPlace") or []):
                # Guard: some entries in listPlace array can be None
                if not isinstance(p, dict):
                    continue
                p_id = p.get("id")
                if p_id is not None:
                    try:
                        p_id_int = int(p_id)
                        p_ids.append(p_id_int)
                        # Map placeId → account name (so quays shows account names)
                        if p_id_int not in place_id_to_account_names:
                            place_id_to_account_names[p_id_int] = []
                        if acc_name and acc_name not in place_id_to_account_names[p_id_int]:
                            place_id_to_account_names[p_id_int].append(acc_name)
                    except (ValueError, TypeError):
                        pass

            accounts_summary.append(KitchenAccountGroup(
                account_id=acc_id,
                account_name=acc_name,
                acc_pass=acc_pass,
                place_ids=p_ids,
                dish_count=0,
                role=acc.get("role")
            ))

        # 1.1 Read CONFIG_KDS to map printer for each place
        kds_cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
        place_id_to_printer: Dict[int, str] = {}
        for p in (kds_cfg.get("places") or []):
            if isinstance(p, dict) and p.get("id") is not None:
                try:
                    pid_int = int(p["id"])
                    prn = str(p.get("printer") or "").strip()
                    if prn:
                        place_id_to_printer[pid_int] = prn
                except (ValueError, TypeError):
                    pass
        # Fallback printer from account listPlace if not in places
        for acc in account_docs:
            for p in (acc.get("listPlace") or []):
                if isinstance(p, dict) and p.get("id") is not None:
                    try:
                        pid_int = int(p["id"])
                        prn = str(p.get("printer") or "").strip()
                        if prn and pid_int not in place_id_to_printer:
                            place_id_to_printer[pid_int] = prn
                    except (ValueError, TypeError):
                        pass

        # 2. Read CONFIG_COOKING
        cooking_docs = list(db_kitchen["CONFIG_COOKING"].find())

        # 3. Build price & sapCode lookups from G_ORDER collections
        # DISH_CACHE
        cache_prices: Dict[str, float] = {}
        fallback_sap: Dict[str, str] = {}
        for doc in db_order["DISH_CACHE"].find():
            for d in (doc.get("dishs") or []):
                mi = d.get("menuItem") or {}
                code = str(mi.get("code") or "").strip()
                p = d.get("price")
                if code and p is not None:
                    try:
                        cache_prices[code] = float(p)
                    except (ValueError, TypeError):
                        pass
                sap = str(mi.get("sapCode") or "").strip()
                if code and sap and code not in fallback_sap:
                    fallback_sap[code] = sap

        # SHOW_HIDE_ITEMS
        show_hide_prices: Dict[str, float] = {}
        for doc in db_order["SHOW_HIDE_ITEMS"].find():
            code = str(doc.get("itemCode") or "").strip()
            p = doc.get("price")
            if code and p is not None:
                try:
                    show_hide_prices[code] = float(p)
                except (ValueError, TypeError):
                    pass
            sap = str(doc.get("sapCode") or "").strip()
            if code and sap and code not in fallback_sap:
                fallback_sap[code] = sap

        # OUT_OF_DISH
        out_prices: Dict[str, float] = {}
        for doc in db_order["OUT_OF_DISH"].find():
            code = str(doc.get("code") or "").strip()
            p = doc.get("price")
            if code and p is not None:
                try:
                    out_prices[code] = float(p)
                except (ValueError, TypeError):
                    pass
            sap = str(doc.get("sapCode") or "").strip()
            if code and sap and code not in fallback_sap:
                fallback_sap[code] = sap

        # CO_MENU_ITEM for additional sapCode fallback
        for doc in db_order["CO_MENU_ITEM"].find({"sapCode": {"$ne": ""}}, {"code": 1, "sapCode": 1}):
            code = str(doc.get("code") or "").strip()
            sap = str(doc.get("sapCode") or "").strip()
            if code and sap and code not in fallback_sap:
                fallback_sap[code] = sap

        client.close()

        items: List[KdsItemDish] = []
        configured_time_count = 0
        diff_price_count = 0
        match_price_count = 0
        no_price_count = 0

        for doc in cooking_docs:
            code = str(doc.get("menuItemCode") or "").strip()
            name = str(doc.get("menuItemName") or "").strip()
            raw_sap = str(doc.get("sapCode") or "").strip()
            sap = raw_sap or fallback_sap.get(code) or ""

            # cooking time (in seconds)
            raw_time = doc.get("singleCookingTime")
            cooking_time = 0
            if raw_time is not None:
                try:
                    cooking_time = int(raw_time)
                except (ValueError, TypeError):
                    cooking_time = 0

            if cooking_time > 0:
                configured_time_count += 1
                mins = cooking_time // 60
                secs = cooking_time % 60
                if mins > 0 and secs > 0:
                    time_display = f"{mins}p {secs}s"
                elif mins > 0:
                    time_display = f"{mins} phút"
                else:
                    time_display = f"{secs}s"
            else:
                time_display = "0s"

            # group type KDS
            grp_raw = doc.get("groupTypeKds")
            group_name = ""
            if isinstance(grp_raw, dict):
                group_name = str(grp_raw.get("name") or grp_raw.get("code") or "")
            elif grp_raw:
                group_name = str(grp_raw)

            # Quầy / Place mapping → hiển thị tên account (VD: QUẦY THỊT, Food control)
            raw_pids = doc.get("placeIds") or []
            item_place_ids: List[int] = []
            item_quays: List[str] = []

            for pid in raw_pids:
                try:
                    pid_int = int(pid)
                    item_place_ids.append(pid_int)
                    acc_names = place_id_to_account_names.get(pid_int)
                    if acc_names:
                        for n in acc_names:
                            if n not in item_quays:
                                item_quays.append(n)
                    else:
                        item_quays.append(f"Place #{pid_int}")
                except (ValueError, TypeError):
                    pass

            # Update account dish counts
            d_pids_set = set(item_place_ids)
            for acc_grp in accounts_summary:
                if d_pids_set.intersection(set(acc_grp.place_ids)):
                    acc_grp.dish_count += 1

            # Prices comparison
            p_cache = cache_prices.get(code)
            p_show = show_hide_prices.get(code)
            p_out = out_prices.get(code)

            # Map valid prices > 0
            available_prices: Dict[str, float] = {}
            if p_cache is not None and p_cache > 0:
                available_prices["DISH_CACHE"] = p_cache
            if p_show is not None and p_show > 0:
                available_prices["SHOW_HIDE"] = p_show
            if p_out is not None and p_out > 0:
                available_prices["OUT_OF_DISH"] = p_out

            unique_prices = set(available_prices.values())

            if len(unique_prices) > 1:
                status = "DIFF"
                diff_price_count += 1
                diff_details = [f"{k}: {v:,.0f}đ" for k, v in available_prices.items()]
                note = f"Chênh lệch giá giữa các bảng ({', '.join(diff_details)})"
                final_p = p_cache if p_cache is not None and p_cache > 0 else (p_show or p_out or 0.0)
            elif len(unique_prices) == 1:
                status = "MATCH"
                match_price_count += 1
                final_p = list(unique_prices)[0]
                note = "Khớp giá"
            else:
                status = "NO_PRICE"
                no_price_count += 1
                final_p = 0.0
                note = "Chưa ghi nhận giá trong các bảng GPOS"

            # Filtering
            if search and search.strip():
                s_raw = search.strip().lower()
                s_clean = _remove_vietnamese_tones(search)
                name_raw = name.lower()
                name_clean = _remove_vietnamese_tones(name)

                match_code = s_raw in code.lower()
                match_sap = s_raw in sap.lower()
                match_name = s_raw in name_raw or s_clean in name_clean
                if not (match_code or match_sap or match_name):
                    continue

            if price_status and price_status != "ALL" and status != price_status:
                continue

            if group_kds and group_kds != "ALL" and group_name.upper() != group_kds.upper():
                continue

            if quay and quay != "ALL":
                # Match against quays or account places
                q_clean = _remove_vietnamese_tones(quay)
                matched_quay = False
                for q_name in item_quays:
                    if q_clean in _remove_vietnamese_tones(q_name):
                        matched_quay = True
                        break
                # Or check if quay corresponds to an account name that contains this dish's place_ids
                if not matched_quay:
                    for a in accounts_summary:
                        if q_clean in _remove_vietnamese_tones(a.account_name) and d_pids_set.intersection(set(a.place_ids)):
                            matched_quay = True
                            break
                if not matched_quay:
                    continue

            # Printers mapping for this dish
            item_printers: List[str] = []
            for pid_int in item_place_ids:
                prn = place_id_to_printer.get(pid_int)
                if prn and prn not in item_printers:
                    item_printers.append(prn)
            printer_display = ", ".join(item_printers) if item_printers else ""

            items.append(KdsItemDish(
                menu_item_code=code,
                sap_code=sap,
                menu_item_name=name,
                single_cooking_time=cooking_time,
                cooking_time_display=time_display,
                group_type_kds=group_name,
                place_ids=item_place_ids,
                quays=item_quays,
                printers=item_printers,
                printer_display=printer_display,
                price_order=p_cache,
                price_show_hide=p_show,
                price_out_of_dish=p_out,
                final_price=final_p,
                price_status=status,
                note=note
            ))

        # Sort: items with cooking_time > 0 first, then by name
        items.sort(key=lambda x: (-x.single_cooking_time, x.menu_item_name))

        # Check master KDS status from G_ORDER.APP_PARAM (SHOW_KDS)
        kds_master_status = 1
        kds_master_enabled = True
        try:
            db_order = client["G_ORDER"]
            show_kds_doc = db_order["APP_PARAM"].find_one({"paramCode": "SHOW_KDS"}, {"status": 1, "value": 1})
            if show_kds_doc:
                st = show_kds_doc.get("status")
                val = str(show_kds_doc.get("value", "")).strip()
                kds_master_status = int(st) if st is not None else (1 if val == "1" else 0)
                kds_master_enabled = (kds_master_status == 1 and val != "0")
        except Exception:
            pass

        # Bổ sung các quầy mồ côi (có món trong CONFIG_COOKING nhưng tài khoản trạm đã bị xóa khỏi ACCOUNT)
        covered_pids = set()
        for a in accounts_summary:
            for p in a.place_ids:
                covered_pids.add(p)

        orphan_dish_counts: Dict[int, int] = {}
        for cd in cooking_docs:
            for pid in (cd.get("placeIds") or []):
                try:
                    p_int = int(pid)
                    if p_int > 0 and p_int not in covered_pids:
                        orphan_dish_counts[p_int] = orphan_dish_counts.get(p_int, 0) + 1
                except (ValueError, TypeError):
                    pass

        for opid, op_count in sorted(orphan_dish_counts.items()):
            accounts_summary.append(KitchenAccountGroup(
                account_id=f"orphan_{opid}",
                account_name=f"⚠️ Place #{opid} (Quầy đã xóa ở NH)",
                acc_pass=None,
                place_ids=[opid],
                dish_count=op_count,
                role=3,
                is_orphan=True
            ))

        return KdsItemsResponse(
            host=host,
            port=port,
            total=len(items),
            configured_time_count=configured_time_count,
            diff_price_count=diff_price_count,
            match_price_count=match_price_count,
            no_price_count=no_price_count,
            accounts_summary=accounts_summary,
            kds_master_status=kds_master_status,
            kds_master_enabled=kds_master_enabled,
            items=items
        )

    @staticmethod
    def update_kds_cooking_time(
        current_user: UserInfo,
        payload: KdsCookingTimeUpdateRequest,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        db_kitchen = client["G_KITCHEN"]
        col = db_kitchen["CONFIG_COOKING"]

        code_str = str(payload.menu_item_code).strip()
        query_conditions = [{"menuItemCode": code_str}]
        if code_str.isdigit():
            query_conditions.append({"menuItemCode": int(code_str)})
        if payload.sap_code and payload.sap_code.strip():
            query_conditions.append({"sapCode": payload.sap_code.strip()})

        query = {"$or": query_conditions}
        existing = col.find_one(query)
        if not existing:
            client.close()
            raise ValueError(f"Không tìm thấy món với mã '{code_str}' trong bảng CONFIG_COOKING của bếp KDS.")

        old_time = int(existing.get("singleCookingTime") or 0)
        dish_name = str(existing.get("menuItemName") or code_str)

        new_time = int(payload.single_cooking_time)
        res = col.update_many(
            query,
            {"$set": {
                "singleCookingTime": new_time
            }}
        )

        client.close()

        # Audit log if db session available
        if db:
            try:
                log_entry = AuditLog(
                    USER_ACTION=current_user.username,
                    ACTION_TYPE="UPDATE_KDS_COOKING_TIME",
                    TARGET_OBJECT=f"CONFIG_COOKING:{code_str}",
                    DESCRIPTION=f"Sửa thời gian chế biến món '{dish_name}' (Mã: {code_str}) trên {payload.host}:{payload.port} từ {old_time}s -> {new_time}s",
                    DETAILS=f'{{"host": "{payload.host}", "menu_item_code": "{code_str}", "old_time": {old_time}, "new_time": {new_time}}}',
                    DATE_ACTION=datetime.datetime.now(),
                )
                db.add(log_entry)
                db.commit()
            except Exception:
                pass

        def fmt_time(t_sec):
            if not t_sec or t_sec <= 0:
                return "0s"
            mins = t_sec // 60
            secs = t_sec % 60
            if mins > 0 and secs > 0:
                return f"{mins}p {secs}s"
            elif mins > 0:
                return f"{mins} phút"
            return f"{secs}s"

        return {
            "success": True,
            "menu_item_code": code_str,
            "menu_item_name": dish_name,
            "old_cooking_time": old_time,
            "old_cooking_time_display": fmt_time(old_time),
            "new_cooking_time": new_time,
            "new_cooking_time_display": fmt_time(new_time),
            "modified_count": res.modified_count,
            "message": f"Đã cập nhật thời gian chế biến món '{dish_name}' thành {fmt_time(new_time)} ({new_time}s) thành công!"
        }

    @staticmethod
    def get_kds_places(host: str, port: int = 27017) -> KdsPlaceListResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_doc = db_kitchen["CONFIG_KDS"].find_one() or {}
            raw_places = kds_doc.get("places") or []

            # Map accounts for each place
            acc_docs = list(db_kitchen["ACCOUNT"].find())
            place_accounts: Dict[int, List[str]] = {}
            for acc in acc_docs:
                acc_name = str(acc.get("accName") or "").strip()
                for lp in (acc.get("listPlace") or []):
                    if isinstance(lp, dict) and lp.get("id") is not None:
                        try:
                            pid = int(lp["id"])
                            if pid not in place_accounts:
                                place_accounts[pid] = []
                            if acc_name and acc_name not in place_accounts[pid]:
                                place_accounts[pid].append(acc_name)
                        except (ValueError, TypeError):
                            pass

            # Count dishes per place in CONFIG_COOKING
            cooking_docs = list(db_kitchen["CONFIG_COOKING"].find({}, {"placeIds": 1}))
            dish_counts: Dict[int, int] = {}
            for cd in cooking_docs:
                for pid in (cd.get("placeIds") or []):
                    try:
                        p_int = int(pid)
                        dish_counts[p_int] = dish_counts.get(p_int, 0) + 1
                    except (ValueError, TypeError):
                        pass

            # Lấy danh sách ID quầy nằm trong Food Control listPlace
            fc_place_ids = set()
            fc_acc = next((a for a in acc_docs if a.get("role") == 2 or str(a.get("accId")) == "101" or "food" in str(a.get("accName") or "").lower()), None)
            if fc_acc:
                for lp in (fc_acc.get("listPlace") or []):
                    if isinstance(lp, dict) and lp.get("id") is not None:
                        try:
                            fc_place_ids.add(int(lp["id"]))
                        except (ValueError, TypeError):
                            pass

            distinct_printers = set()
            places_out: List[KdsPlaceItem] = []
            for p in raw_places:
                if not isinstance(p, dict):
                    continue
                pid = int(p.get("id", 0))
                prn = str(p.get("printer") or "").strip()
                if prn:
                    distinct_printers.add(prn)
                # also collect printers from accounts
                for acc in acc_docs:
                    for lp in (acc.get("listPlace") or []):
                        if isinstance(lp, dict) and lp.get("id") == pid:
                            lp_prn = str(lp.get("printer") or "").strip()
                            if lp_prn:
                                distinct_printers.add(lp_prn)
                                if not prn:
                                    prn = lp_prn

                hp_ids = []
                for x in (p.get("hallPlanIds") or []):
                    try:
                        hp_ids.append(int(x))
                    except (ValueError, TypeError):
                        pass

                driver_n = str(p.get("driverName") or p.get("driver_name") or prn).strip()
                is_in_fc = True if pid == 0 else (pid in fc_place_ids)

                places_out.append(KdsPlaceItem(
                    id=pid,
                    name=str(p.get("name") or f"Quầy #{pid}"),
                    place_code=str(p.get("placeCode") or ""),
                    printer=prn,
                    driver_name=driver_n,
                    type=str(p.get("type") or "BEP"),
                    hall_plan_ids=hp_ids,
                    account_names=place_accounts.get(pid, []),
                    dish_count=dish_counts.get(pid, 0),
                    is_in_food_control=is_in_fc,
                    is_orphan=False
                ))

            # Quét các placeId mồ côi (có món trong CONFIG_COOKING nhưng quầy đã bị xóa dưới nhà hàng / thiếu trong CONFIG_KDS)
            existing_pids = {p.id for p in places_out}
            for pid, count in sorted(dish_counts.items()):
                if pid > 0 and pid not in existing_pids and count > 0:
                    places_out.append(KdsPlaceItem(
                        id=pid,
                        name=f"⚠️ Place #{pid} (Quầy đã xóa ở NH)",
                        place_code=f"ORPHAN_{pid}",
                        printer="",
                        driver_name="",
                        type="BEP",
                        hall_plan_ids=[],
                        account_names=[],
                        dish_count=count,
                        is_in_food_control=False,
                        is_orphan=True
                    ))

            return KdsPlaceListResponse(
                host=host,
                port=port,
                places=places_out,
                printers=sorted(list(distinct_printers))
            )
        finally:
            client.close()

    @staticmethod
    def add_kds_quay_account(
        current_user: UserInfo,
        payload: KdsPlaceCreateRequest,
        db: Optional[Session] = None
    ) -> KdsPlaceCreateResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]

            kds_doc = kds_col.find_one()
            if not kds_doc:
                kds_doc = {"id": 1, "places": [], "printGroups": [], "printMode": 1, "isDisablePrint": False}
                ins = kds_col.insert_one(kds_doc)
                kds_doc["_id"] = ins.inserted_id

            places = kds_doc.get("places") or []
            existing_ids = [p.get("id", 0) for p in places if isinstance(p, dict) and p.get("id") is not None]
            new_place_id = (max(existing_ids) + 1) if existing_ids else 1

            # 1. Tìm tài khoản Food control để lấy placeParent và cập nhật listPlace
            food_control_acc = acc_col.find_one({
                "$or": [
                    {"role": 2},
                    {"placeParent": ""},
                    {"placeParent": None},
                    {"accName": {"$regex": "food.*control", "$options": "i"}}
                ]
            })
            food_control_acc_id = str(food_control_acc.get("accId") or "101") if food_control_acc else "101"

            # 2. Inherit hallPlanIds from existing kitchen sub-stations (id > 0), NOT from Food control
            hall_plan_ids = []
            for p in places:
                if isinstance(p, dict) and p.get("id", 0) > 0 and p.get("hallPlanIds"):
                    hall_plan_ids = list(p.get("hallPlanIds"))
                    break
            # Fallback if no sub-station has hallPlanIds yet
            if not hall_plan_ids and places:
                for p in places:
                    if isinstance(p, dict) and p.get("hallPlanIds"):
                        hall_plan_ids = list(p.get("hallPlanIds"))
                        break
            if not hall_plan_ids:
                for hp in db_kitchen["HALL_PLAN"].find({}, {"id": 1}).limit(20):
                    if hp.get("id"):
                        hall_plan_ids.append(hp["id"])

            place_name = payload.place_name.strip()
            place_code = (payload.place_code or place_name).strip()
            printer_name = payload.printer.strip()
            account_name = (payload.account_name or place_name).strip()

            if payload.account_id and payload.account_id.strip():
                account_id = payload.account_id.strip()
            else:
                existing_acc_ids = []
                for a in acc_col.find({}, {"accId": 1}):
                    aid = str(a.get("accId") or "").strip()
                    if aid.isdigit():
                        existing_acc_ids.append(int(aid))
                account_id = str((max(existing_acc_ids) + 1) if existing_acc_ids else (100 + new_place_id))

            group_kds_val = MongoDBService.to_kds_group_code(payload.group_kds or place_name)
            new_place = {
                "id": new_place_id,
                "name": place_name,
                "type": "BEP",
                "hallPlanIds": hall_plan_ids,
                "printer": printer_name,
                "driverName": printer_name,
                "placeCode": place_code,
                "groupKds": group_kds_val
            }

            # Update CONFIG_KDS
            kds_col.update_one(
                {"_id": kds_doc["_id"]},
                {"$push": {"places": new_place}}
            )

            # Insert into ACCOUNT (role: 3, placeParent = food_control_acc_id)
            new_account = {
                "id": 0,
                "accName": account_name,
                "accId": account_id,
                "pass": payload.password or "1",
                "placeParent": food_control_acc_id,
                "listPlace": [new_place],
                "role": 3,
                "groupKds": group_kds_val,
                "reorganizeTime": 0
            }
            acc_col.insert_one(new_account)

            # Cập nhật thêm quầy mới vào listPlace của Food control (role: 2) để Food control quản lý được quầy này
            if food_control_acc:
                fc_hall_plans = []
                for p in food_control_acc.get("listPlace") or []:
                    if isinstance(p, dict) and p.get("hallPlanIds"):
                        fc_hall_plans = list(p["hallPlanIds"])
                        break
                if not fc_hall_plans:
                    fc_hall_plans = hall_plan_ids

                fc_place_item = {
                    "id": new_place_id,
                    "name": place_name,
                    "type": "BEP",
                    "hallPlanIds": fc_hall_plans,
                    "printer": printer_name,
                    "driverName": printer_name,
                    "placeCode": place_code
                }
                acc_col.update_one(
                    {"_id": food_control_acc["_id"]},
                    {"$push": {"listPlace": fc_place_item}}
                )

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="CREATE_KDS_QUAY",
                        TARGET_OBJECT=f"CONFIG_KDS:place_{new_place_id}",
                        DESCRIPTION=f"Tạo quầy KDS mới '{place_name}' (ID: {new_place_id}, Máy in/Driver: {printer_name}, Account: {account_name}/{account_id}) trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "place_id": {new_place_id}, "place_name": "{place_name}", "printer": "{printer_name}", "account_name": "{account_name}", "account_id": "{account_id}"}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsPlaceCreateResponse(
                success=True,
                place_id=new_place_id,
                place_name=place_name,
                place_code=place_code,
                printer=printer_name,
                account_name=account_name,
                account_id=account_id,
                message=f"Đã thêm quầy '{place_name}' (ID: {new_place_id}) và tài khoản '{account_name}' (Mã: {account_id}, Máy in: {printer_name}) thành công!"
            )
        finally:
            client.close()

    @staticmethod
    def create_kds_food_control(
        current_user: UserInfo,
        payload: KdsCreateFoodControlRequest,
        db: Optional[Session] = None
    ) -> KdsCreateFoodControlResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]

            # 1. Kiểm tra xem đã có tài khoản Food control trong bảng ACCOUNT chưa
            acc_name_target = (payload.account_name or "Food control").strip()
            acc_id_target = (payload.account_id or "101").strip()

            existing_fc = acc_col.find_one({
                "$or": [
                    {"role": 2},
                    {"accId": acc_id_target},
                    {"accName": {"$regex": "^food\\s*control$", "$options": "i"}}
                ]
            })
            if existing_fc:
                existing_name = existing_fc.get("accName", "Food control")
                existing_id = existing_fc.get("accId", "")
                existing_role = existing_fc.get("role", 2)
                raise ValueError(
                    f"Nhà hàng đã tồn tại tài khoản Food Control ('{existing_name}' - Mã: {existing_id}, Role: {existing_role})! "
                    "Không thể tạo trùng lặp."
                )

            # 2. Lấy cấu hình CONFIG_KDS và danh sách places hiện có
            kds_doc = kds_col.find_one()
            if not kds_doc:
                kds_doc = {"id": 1, "places": [], "printGroups": [], "printMode": 1, "isDisablePrint": False}
                ins = kds_col.insert_one(kds_doc)
                kds_doc["_id"] = ins.inserted_id

            places = kds_doc.get("places") or []
            existing_place_ids = [p.get("id") for p in places if isinstance(p, dict) and p.get("id") is not None]

            # 3. Kế thừa hallPlanIds
            all_hall_plan_ids = []
            for hp in db_kitchen["HALL_PLAN"].find({}, {"id": 1}).limit(50):
                if hp.get("id") is not None:
                    try:
                        all_hall_plan_ids.append(int(hp["id"]))
                    except (ValueError, TypeError):
                        pass

            if not all_hall_plan_ids:
                for p in places:
                    if isinstance(p, dict) and p.get("hallPlanIds"):
                        all_hall_plan_ids = list(p.get("hallPlanIds"))
                        break

            # 4. Kiểm tra xem trong CONFIG_KDS.places đã có quầy Food Control chưa
            place_name_target = (payload.place_name or "Food control").strip()
            place_code_target = (payload.place_code or "FOOD_CONTROL").strip()
            printer_target = (payload.printer or "KDS").strip()

            fc_place = next(
                (p for p in places if isinstance(p, dict) and (
                    p.get("id") == 0 or
                    "food" in str(p.get("name") or "").lower() or
                    str(p.get("placeCode") or "").upper() == "FOOD_CONTROL"
                )),
                None
            )

            fc_place_id = 0
            if not fc_place:
                # Nếu id 0 đã bị một quầy khác lấy
                if 0 in existing_place_ids:
                    fc_place_id = max(existing_place_ids) + 1
                else:
                    fc_place_id = 0

                new_place_obj = {
                    "id": fc_place_id,
                    "name": place_name_target,
                    "type": "BEP",
                    "hallPlanIds": all_hall_plan_ids,
                    "printer": printer_target,
                    "driverName": printer_target,
                    "placeCode": place_code_target
                }
                kds_col.update_one(
                    {"_id": kds_doc["_id"]},
                    {"$push": {"places": new_place_obj}}
                )
                places.append(new_place_obj)
            else:
                fc_place_id = int(fc_place.get("id", 0))

            # 5. Xây dựng listPlace cho Food Control (chứa TẤT CẢ các quầy con hiện có)
            fc_list_places = []
            for p in places:
                if isinstance(p, dict):
                    p_copy = dict(p)
                    if not p_copy.get("hallPlanIds") and all_hall_plan_ids:
                        p_copy["hallPlanIds"] = all_hall_plan_ids
                    fc_list_places.append(p_copy)

            # 6. Tạo tài khoản Food control trong bảng ACCOUNT (Role: 2)
            new_fc_account = {
                "id": 0,
                "accName": acc_name_target,
                "accId": acc_id_target,
                "pass": payload.password or "1",
                "placeParent": "",
                "role": 2,
                "listPlace": fc_list_places,
                "reorganizeTime": 0
            }
            acc_col.insert_one(new_fc_account)

            # 7. Cập nhật các quầy con role: 3 chưa có placeParent -> liên kết tới accId của Food control
            acc_col.update_many(
                {
                    "role": 3,
                    "$or": [
                        {"placeParent": ""},
                        {"placeParent": None},
                        {"placeParent": {"$exists": False}}
                    ]
                },
                {"$set": {"placeParent": acc_id_target}}
            )

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="CREATE_KDS_FOOD_CONTROL",
                        TARGET_OBJECT=f"ACCOUNT:Food_Control_{acc_id_target}",
                        DESCRIPTION=f"Tạo bổ sung quầy & account Food control '{acc_name_target}' (ID: {acc_id_target}, Place ID: {fc_place_id}, Liên kết {len(fc_list_places)} quầy) trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "account_id": "{acc_id_target}", "account_name": "{acc_name_target}", "place_id": {fc_place_id}, "linked_places": {len(fc_list_places)}}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsCreateFoodControlResponse(
                success=True,
                account_id=acc_id_target,
                account_name=acc_name_target,
                place_id=fc_place_id,
                linked_places_count=len(fc_list_places),
                message=f"Đã tạo thành công quầy & tài khoản Food Control ('{acc_name_target}' - Mã: {acc_id_target}), liên kết quản lý {len(fc_list_places)} trạm bếp!"
            )
        finally:
            client.close()

    @staticmethod
    def assign_dish_kds_quay(
        current_user: UserInfo,
        payload: KdsAssignDishQuayRequest,
        db: Optional[Session] = None
    ) -> KdsAssignDishQuayResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            cook_col = db_kitchen["CONFIG_COOKING"]

            # Lấy thông tin quầy để đồng bộ Nhóm Bếp (groupTypeKds) chuẩn
            kds_cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
            place_id_to_name = {}
            for p in (kds_cfg.get("places") or []):
                if isinstance(p, dict) and p.get("id") is not None:
                    place_id_to_name[int(p["id"])] = p.get("name") or f"Quầy #{p['id']}"

            # Xác định tên nhóm bếp cần gán: ưu tiên payload.group_type_kds, nếu không có thì lấy tên quầy đầu tiên
            target_grp_name = ""
            if payload.group_type_kds is not None and payload.group_type_kds.strip():
                target_grp_name = payload.group_type_kds.strip()
            elif payload.place_ids:
                target_grp_name = place_id_to_name.get(payload.place_ids[0], "")

            if target_grp_name:
                code_name = MongoDBService.to_kds_group_code(target_grp_name)
                grp_obj = {
                    "id": 0,
                    "code": code_name,
                    "name": code_name
                }
            else:
                grp_obj = None

            modified_count = 0
            for code in payload.menu_item_codes:
                code_str = str(code).strip()
                if not code_str:
                    continue
                q = [{"menuItemCode": code_str}]
                if code_str.isdigit():
                    q.append({"menuItemCode": int(code_str)})

                update_set = {}
                if grp_obj:
                    update_set["groupTypeKds"] = grp_obj

                if payload.mode == "append":
                    update_ops = {"$addToSet": {"placeIds": {"$each": payload.place_ids}}}
                    if update_set:
                        update_ops["$set"] = update_set
                    res = cook_col.update_many({"$or": q}, update_ops)
                    modified_count += res.modified_count
                else:
                    full_set = {"placeIds": payload.place_ids}
                    if update_set:
                        full_set.update(update_set)
                    res = cook_col.update_many({"$or": q}, {"$set": full_set})
                    modified_count += res.modified_count

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="ASSIGN_DISH_KDS_QUAY",
                        TARGET_OBJECT=f"CONFIG_COOKING:dishes_{len(payload.menu_item_codes)}",
                        DESCRIPTION=f"Gán {len(payload.menu_item_codes)} món vào quầy KDS ID: {payload.place_ids} (mode: {payload.mode}) trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "place_ids": {payload.place_ids}, "mode": "{payload.mode}", "count": {len(payload.menu_item_codes)}}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsAssignDishQuayResponse(
                success=True,
                modified_count=modified_count,
                message=f"Đã cập nhật quầy thành công cho {len(payload.menu_item_codes)} món!"
            )
        finally:
            client.close()

    @staticmethod
    def lookup_dish_for_kds(host: str, code: str, port: int = 27017) -> KdsDishLookupResponse:
        """
        Tra cứu nhanh thông tin món ăn từ G_ORDER (name, sapCode, price, menu, group)
        và đối soát trạng thái hiện tại trong G_KITCHEN.CONFIG_COOKING (quầy bếp, nhóm KDS, thời gian nấu).
        """
        clean_code = str(code).strip()
        if not clean_code:
            return KdsDishLookupResponse(code="", found=False, message="Mã món ăn trống")

        client = MongoClient(host, port, serverSelectionTimeoutMS=3000)
        try:
            db_order = client["G_ORDER"]
            db_kitchen = client["G_KITCHEN"]

            dish_name = ""
            sap_code = ""
            price = 0.0
            group_name = ""
            menu_name = ""

            # 1. Tra cứu từ DISH_CACHE trong G_ORDER
            try:
                for doc in db_order["DISH_CACHE"].find():
                    for d in (doc.get("dishs") or []):
                        mi = d.get("menuItem") or {}
                        c = str(mi.get("code") or "").strip()
                        if c == clean_code:
                            dish_name = mi.get("name") or dish_name
                            sap_code = str(mi.get("sapCode") or "").strip() or sap_code
                            p = d.get("price")
                            if p is not None:
                                try:
                                    price = float(p)
                                except (ValueError, TypeError):
                                    pass
                            break
                    if dish_name:
                        break
            except Exception as e:
                logger.warning("Lỗi tra cứu DISH_CACHE: %s", e)

            # 2. Tra cứu từ CO_MENU_ITEM trong G_ORDER
            try:
                co_doc = db_order["CO_MENU_ITEM"].find_one({"code": clean_code})
                if co_doc:
                    if not dish_name:
                        dish_name = co_doc.get("nameVn") or co_doc.get("name") or ""
                    if not sap_code:
                        sap_code = str(co_doc.get("sapCode") or "").strip()
                    if price == 0.0 and co_doc.get("coMenuItemDetails"):
                        try:
                            price = float(co_doc["coMenuItemDetails"][0].get("price", 0.0))
                        except Exception:
                            pass
            except Exception as e:
                logger.warning("Lỗi tra cứu CO_MENU_ITEM: %s", e)

            # 3. Tra cứu từ SHOW_HIDE_ITEMS / OUT_OF_DISH
            if not dish_name or not sap_code:
                try:
                    sh_doc = db_order["SHOW_HIDE_ITEMS"].find_one({"itemCode": clean_code})
                    if sh_doc:
                        dish_name = dish_name or sh_doc.get("itemName") or ""
                        sap_code = sap_code or str(sh_doc.get("sapCode") or "").strip()
                        if price == 0.0 and sh_doc.get("price") is not None:
                            price = float(sh_doc.get("price"))
                except Exception:
                    pass

            # 4. Tra cứu Menu / Nhóm từ ORDER_MENU_CACHE_CATEGORY
            try:
                for omc in db_order["ORDER_MENU_CACHE_CATEGORY"].find():
                    m_code = str(omc.get("category-code") or "").strip()
                    m_name = omc.get("main-menu", {}).get("name") or f"Menu {m_code}"
                    groups = omc.get("main-menu", {}).get("items", []) or []
                    for g in groups:
                        g_code = str(g.get("code") or "").strip()
                        g_name = str(g.get("name") or g_code).strip()
                        for it in (g.get("items") or []):
                            mi = it.get("menu-item") or {}
                            if str(mi.get("code") or "").strip() == clean_code:
                                dish_name = dish_name or mi.get("name") or ""
                                group_name = g_name
                                menu_name = m_name
                                if not sap_code:
                                    sap_code = str(mi.get("sap-code") or mi.get("sapCode") or "").strip()
                                break
                        if group_name:
                            break
                    if group_name:
                        break
            except Exception as e:
                logger.warning("Lỗi tra cứu ORDER_MENU_CACHE_CATEGORY: %s", e)

            # 5. Đối soát trong G_KITCHEN.CONFIG_COOKING
            in_kds = False
            kds_id = None
            kds_place_ids = []
            kds_place_names = []
            kds_group_type = ""
            kds_cooking_time = 0
            kds_cooking_time_str = "0s"

            # Lấy map tên quầy từ CONFIG_KDS
            place_names_map = {}
            try:
                kds_cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
                for p in (kds_cfg.get("places") or []):
                    if isinstance(p, dict) and p.get("id") is not None:
                        place_names_map[int(p["id"])] = p.get("name", f"Quầy #{p['id']}")
            except Exception:
                pass

            try:
                q = [{"menuItemCode": clean_code}]
                if clean_code.isdigit():
                    q.append({"menuItemCode": int(clean_code)})
                c_doc = db_kitchen["CONFIG_COOKING"].find_one({"$or": q})
                if c_doc:
                    in_kds = True
                    kds_id = c_doc.get("id")
                    raw_pids = c_doc.get("placeIds") or []
                    for pid in raw_pids:
                        try:
                            pid_int = int(pid)
                            kds_place_ids.append(pid_int)
                            kds_place_names.append(place_names_map.get(pid_int, f"Quầy #{pid_int}"))
                        except (ValueError, TypeError):
                            pass

                    grp_raw = c_doc.get("groupTypeKds")
                    if isinstance(grp_raw, dict):
                        kds_group_type = str(grp_raw.get("name") or grp_raw.get("code") or "")
                    elif grp_raw:
                        kds_group_type = str(grp_raw)

                    raw_time = c_doc.get("singleCookingTime")
                    if raw_time is not None:
                        try:
                            kds_cooking_time = int(raw_time)
                            mins = kds_cooking_time // 60
                            secs = kds_cooking_time % 60
                            if mins > 0 and secs > 0:
                                kds_cooking_time_str = f"{mins}p {secs}s"
                            elif mins > 0:
                                kds_cooking_time_str = f"{mins} phút"
                            else:
                                kds_cooking_time_str = f"{secs}s"
                        except (ValueError, TypeError):
                            pass

                    # Nếu G_ORDER không có tên món nhưng CONFIG_COOKING có tên món
                    if not dish_name and c_doc.get("menuItemName"):
                        dish_name = str(c_doc["menuItemName"]).strip()
                    if not sap_code and c_doc.get("sapCode"):
                        sap_code = str(c_doc["sapCode"]).strip()
            except Exception as e:
                logger.warning("Lỗi đối soát CONFIG_COOKING: %s", e)

            found = bool(dish_name or in_kds)
            return KdsDishLookupResponse(
                code=clean_code,
                found=found,
                name=dish_name,
                sap_code=sap_code,
                price=price,
                group_name=group_name,
                menu_name=menu_name,
                in_kds=in_kds,
                kds_id=kds_id,
                kds_place_ids=kds_place_ids,
                kds_place_names=kds_place_names,
                kds_group_type=kds_group_type,
                kds_cooking_time=kds_cooking_time,
                kds_cooking_time_str=kds_cooking_time_str,
                message="Đã tìm thấy thông tin món" if found else "Không tìm thấy món với mã này trong GPOS"
            )
        finally:
            client.close()

    @staticmethod
    def add_dishes_to_kds(
        payload: KdsAddDishesRequest,
        current_user: Optional[UserInfo] = None,
        db: Optional[Session] = None
    ) -> KdsAddDishesResponse:
        """
        Thêm món ăn mới vào hệ thống KDS (G_KITCHEN.CONFIG_COOKING), gán quầy bếp (places)
        và thời gian nấu. Nếu món đã có trong CONFIG_COOKING và overwrite_if_exists=True,
        tự động cập nhật quầy bếp và thời gian nấu mới.
        """
        if not payload.dishes:
            raise ValueError("Danh sách món ăn cần thêm vào KDS không được để trống.")

        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            db_order = client["G_ORDER"]
            cook_col = db_kitchen["CONFIG_COOKING"]

            # 1. Lấy thông tin quầy từ CONFIG_KDS để map tên quầy và sinh nhóm KDS chuẩn
            kds_cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
            place_id_to_name = {}
            for p in (kds_cfg.get("places") or []):
                if isinstance(p, dict) and p.get("id") is not None:
                    place_id_to_name[int(p["id"])] = p.get("name") or f"Quầy #{p['id']}"

            # 2. Khởi tạo / Đồng bộ sequence trong COUNTERS và max id hiện có trong CONFIG_COOKING
            max_doc = cook_col.find_one(
                {"id": {"$exists": True, "$type": "number"}},
                sort=[("id", -1)]
            )
            current_max_id = int(max_doc["id"]) if (max_doc and max_doc.get("id") is not None) else 0

            # Đồng bộ COUNTERS seq để không bao giờ bị trùng ID
            counter_doc = db_kitchen["COUNTERS"].find_one({"_id": "CONFIG_COOKING_SEQ"})
            current_seq = int(counter_doc["seq"]) if (counter_doc and counter_doc.get("seq") is not None) else 0
            if current_seq < current_max_id:
                db_kitchen["COUNTERS"].update_one(
                    {"_id": "CONFIG_COOKING_SEQ"},
                    {"$set": {"seq": current_max_id}},
                    upsert=True
                )

            added_count = 0
            updated_count = 0
            details = []

            for it in payload.dishes:
                code_str = str(it.menu_item_code).strip()
                if not code_str:
                    continue

                # Tra cứu tên món và mã SAP nếu chưa có
                name_str = (it.menu_item_name or "").strip()
                sap_str = (it.sap_code or "").strip()

                if not name_str or not sap_str:
                    # Tra cứu nhanh trong G_ORDER
                    co_doc = db_order["CO_MENU_ITEM"].find_one({"code": code_str})
                    if co_doc:
                        name_str = name_str or co_doc.get("nameVn") or co_doc.get("name") or ""
                        sap_str = sap_str or str(co_doc.get("sapCode") or "").strip()

                if not name_str:
                    # Tra cứu trong DISH_CACHE
                    for doc in db_order["DISH_CACHE"].find():
                        for d in (doc.get("dishs") or []):
                            mi = d.get("menuItem") or {}
                            if str(mi.get("code") or "").strip() == code_str:
                                name_str = mi.get("name") or ""
                                sap_str = sap_str or str(mi.get("sapCode") or "").strip()
                                break
                        if name_str:
                            break

                final_name = name_str or f"Món {code_str}"

                # Xác định nhóm bếp KDS: ưu tiên it.group_type_kds, nếu không có lấy theo tên quầy đầu tiên
                target_grp_name = (it.group_type_kds or "").strip()
                if not target_grp_name and it.place_ids:
                    target_grp_name = place_id_to_name.get(it.place_ids[0], "ALL")
                if not target_grp_name:
                    target_grp_name = "ALL"

                code_grp_name = MongoDBService.to_kds_group_code(target_grp_name)
                grp_obj = {
                    "id": 0,
                    "code": code_grp_name,
                    "name": code_grp_name
                }

                cooking_time = int(it.single_cooking_time) if it.single_cooking_time is not None else 600

                # Kiểm tra món đã tồn tại trong CONFIG_COOKING chưa
                q_exist = [{"menuItemCode": code_str}]
                if code_str.isdigit():
                    q_exist.append({"menuItemCode": int(code_str)})

                existing = cook_col.find_one({"$or": q_exist})

                if existing:
                    if payload.overwrite_if_exists:
                        update_fields = {
                            "placeIds": it.place_ids,
                            "groupTypeKds": grp_obj,
                            "singleCookingTime": cooking_time
                        }
                        if final_name and final_name != f"Món {code_str}":
                            update_fields["menuItemName"] = final_name
                        if sap_str:
                            update_fields["sapCode"] = sap_str

                        cook_col.update_one({"_id": existing["_id"]}, {"$set": update_fields})
                        updated_count += 1
                        details.append({
                            "code": code_str,
                            "name": final_name,
                            "action": "UPDATED",
                            "place_ids": it.place_ids,
                            "group_type": code_grp_name,
                            "cooking_time": cooking_time
                        })
                else:
                    # Tăng sequence an toàn
                    seq_doc = db_kitchen["COUNTERS"].find_one_and_update(
                        {"_id": "CONFIG_COOKING_SEQ"},
                        {"$inc": {"seq": 1}},
                        upsert=True,
                        return_document=ReturnDocument.AFTER
                    )
                    new_id = int(seq_doc["seq"])

                    new_doc = {
                        "id": new_id,
                        "menuItemCode": code_str,
                        "menuItemName": final_name,
                        "placeIds": it.place_ids,
                        "singleCookingTime": cooking_time,
                        "groupTypeKds": grp_obj,
                        "delayTime": 0,
                        "delayTimeSubmit": 0,
                        "typeDelay": 0
                    }
                    if sap_str:
                        new_doc["sapCode"] = sap_str

                    cook_col.insert_one(new_doc)
                    added_count += 1
                    details.append({
                        "code": code_str,
                        "name": final_name,
                        "action": "ADDED",
                        "id": new_id,
                        "place_ids": it.place_ids,
                        "group_type": code_grp_name,
                        "cooking_time": cooking_time
                    })

            # Ghi nhật ký AuditLog
            if db and current_user:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="ADD_DISH_TO_KDS",
                        TARGET_OBJECT=f"CONFIG_COOKING:add_{added_count}_upd_{updated_count}",
                        DESCRIPTION=f"Thêm {added_count} món mới, cập nhật {updated_count} món vào KDS trên {payload.host}:{payload.port}",
                        DETAILS=json.dumps({
                            "host": payload.host,
                            "added_count": added_count,
                            "updated_count": updated_count,
                            "total": len(payload.dishes)
                        }, ensure_ascii=False),
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception as log_ex:
                    logger.warning("Lỗi ghi AuditLog ADD_DISH_TO_KDS: %s", log_ex)

            total_affected = added_count + updated_count
            msg = f"Đã xử lý thành công {total_affected} món (Thêm mới: {added_count}, Cập nhật: {updated_count}) vào bếp KDS!"
            return KdsAddDishesResponse(
                success=True,
                message=msg,
                added_count=added_count,
                updated_count=updated_count,
                total_count=total_affected,
                details=details
            )
        finally:
            client.close()

    @staticmethod
    def transfer_kds_dishes_quay(
        current_user: UserInfo,
        payload: KdsTransferQuayRequest,
        db: Optional[Session] = None
    ) -> KdsTransferQuayResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            cook_col = db_kitchen["CONFIG_COOKING"]

            kds_cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
            place_names = {}
            for p in (kds_cfg.get("places") or []):
                if isinstance(p, dict) and p.get("id") is not None:
                    place_names[int(p["id"])] = p.get("name", f"Quầy #{p['id']}")

            from_name = place_names.get(payload.from_place_id, f"Place #{payload.from_place_id} (Quầy đã xóa ở NH)")
            to_name = place_names.get(payload.to_place_id, f"Quầy #{payload.to_place_id}")

            from_pid_int = int(payload.from_place_id)
            from_pid_str = str(payload.from_place_id)
            from_pids = [from_pid_int, from_pid_str]

            match_filter: Dict[str, Any] = {"placeIds": {"$in": from_pids}}
            if payload.menu_item_codes and len(payload.menu_item_codes) > 0:
                clean_codes = [str(c).strip() for c in payload.menu_item_codes if str(c).strip()]
                int_codes = [int(c) for c in clean_codes if c.isdigit()]
                all_codes = list(set(clean_codes + int_codes))
                match_filter = {
                    "$and": [
                        {"placeIds": {"$in": from_pids}},
                        {"menuItemCode": {"$in": all_codes}}
                    ]
                }

            matched_docs = list(cook_col.find(match_filter, {"_id": 1}))
            if not matched_docs:
                return KdsTransferQuayResponse(
                    success=True,
                    modified_count=0,
                    from_place_name=from_name,
                    to_place_name=to_name,
                    message=f"Không tìm thấy món nào thuộc {from_name} để chuyển sang {to_name}."
                )

            doc_ids = [d["_id"] for d in matched_docs]

            to_code = MongoDBService.to_kds_group_code(to_name)
            to_grp_obj = {
                "id": 0,
                "code": to_code,
                "name": to_code
            }
            to_pid_int = int(payload.to_place_id) if str(payload.to_place_id).isdigit() else payload.to_place_id
            if not payload.keep_source:
                cook_col.update_many(
                    {"_id": {"$in": doc_ids}},
                    {
                        "$pull": {"placeIds": {"$in": from_pids}},
                        "$addToSet": {"placeIds": to_pid_int},
                        "$set": {"groupTypeKds": to_grp_obj}
                    }
                )
            else:
                cook_col.update_many(
                    {"_id": {"$in": doc_ids}},
                    {
                        "$addToSet": {"placeIds": to_pid_int},
                        "$set": {"groupTypeKds": to_grp_obj}
                    }
                )

            if db:
                try:
                    action_desc = (
                        f"Chuyển toàn bộ {len(doc_ids)} món từ {from_name} sang {to_name}"
                        if not payload.menu_item_codes
                        else f"Chuyển {len(doc_ids)} món chọn lọc từ {from_name} sang {to_name}"
                    )
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="TRANSFER_KDS_QUAY",
                        TARGET_OBJECT=f"CONFIG_COOKING:from_{payload.from_place_id}_to_{payload.to_place_id}",
                        DESCRIPTION=f"{action_desc} trên {payload.host}:{payload.port}",
                        DETAILS=json.dumps({
                            "host": payload.host,
                            "from_place_id": payload.from_place_id,
                            "to_place_id": payload.to_place_id,
                            "count": len(doc_ids),
                            "keep_source": payload.keep_source
                        }),
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsTransferQuayResponse(
                success=True,
                modified_count=len(doc_ids),
                from_place_name=from_name,
                to_place_name=to_name,
                message=f"Đã chuyển thành công {len(doc_ids)} món từ {from_name} sang {to_name}!"
            )
        finally:
            client.close()

    @staticmethod
    def to_kds_group_code(name: str) -> str:
        """
        Chuẩn hóa tên nhóm bếp KDS:
        - Bỏ dấu tiếng Việt (đ -> d, Đ -> D, loại bỏ dấu kết hợp)
        - Dấu cách thay bằng dấu gạch dưới _
        - Viết hoa chữ cái đầu mỗi từ chuẩn đẹp (VD: 'Quầy Thịt' hoặc 'QUẦY THỊT' -> 'Quay_Thit')
        """
        if not name:
            return ""
        text = str(name).strip()
        words = text.split()
        capitalized_words = []
        for w in words:
            if w.isupper() or w.islower():
                capitalized_words.append(w.capitalize())
            else:
                capitalized_words.append(w[0].upper() + w[1:] if len(w) > 0 else "")
        normalized_text = " ".join(capitalized_words)

        s = normalized_text.replace("đ", "d").replace("Đ", "D")
        s = unicodedata.normalize('NFKD', s)
        s = "".join(c for c in s if not unicodedata.combining(c))
        s = re.sub(r'[\s_]+', '_', s.strip())
        return s

    @staticmethod
    def sync_kds_groups_by_quays(
        current_user: UserInfo,
        payload: KdsSyncGroupsByQuaysRequest,
        db: Optional[Session] = None
    ) -> KdsSyncGroupsByQuaysResponse:
        """
        Đồng nhất Nhóm Bếp (groupTypeKds) theo Quầy Bếp (places trong CONFIG_KDS & ACCOUNT):
        1. Món thuộc quầy nào thì groupTypeKds tự động cập nhật theo tên quầy đó, bỏ dấu tiếng Việt và dấu cách thay bằng _ (VD: 'Quầy Thịt' -> 'Quay_Thit').
        2. Những món chưa được gán Quầy Bếp (ACCOUNT / CONFIG_KDS) thì nhóm bếp cũng bỏ luôn, cập nhật lại để trống {"id": 0, "code": "", "name": ""}.
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            cook_col = db_kitchen["CONFIG_COOKING"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]

            kds_doc = kds_col.find_one() or {}
            places = kds_doc.get("places") or []
            place_id_to_name: Dict[int, str] = {}
            for p in places:
                if isinstance(p, dict) and p.get("id") is not None:
                    try:
                        pid_int = int(p["id"])
                        place_id_to_name[pid_int] = p.get("name") or f"Quầy #{p['id']}"
                    except (ValueError, TypeError):
                        pass

            # Bổ sung mapping từ ACCOUNT nếu places trong CONFIG_KDS chưa có
            for acc in acc_col.find():
                acc_name = str(acc.get("accName") or "").strip()
                for p in (acc.get("listPlace") or []):
                    if isinstance(p, dict) and p.get("id") is not None:
                        try:
                            pid_int = int(p["id"])
                            if pid_int not in place_id_to_name:
                                place_id_to_name[pid_int] = p.get("name") or acc_name or f"Quầy #{pid_int}"
                        except (ValueError, TypeError):
                            pass

            modified_count = 0
            assigned_count = 0
            all_valid_pids = set(place_id_to_name.keys())

            # 1. Cập nhật nhóm bếp cho các món đã gán vào quầy (bỏ dấu tiếng Việt, dấu cách thành _)
            for pid, pname in place_id_to_name.items():
                code_name = MongoDBService.to_kds_group_code(pname)
                grp_obj = {
                    "id": 0,
                    "code": code_name,
                    "name": code_name
                }
                # Khớp cả dạng pid là số nguyên hoặc chuỗi
                res = cook_col.update_many(
                    {"$or": [{"placeIds": pid}, {"placeIds": str(pid)}]},
                    {"$set": {"groupTypeKds": grp_obj}}
                )
                assigned_count += res.modified_count

            modified_count += assigned_count

            # 2. Xử lý các món không thuộc danh sách quầy chuẩn:
            # - Món có placeIds mồ côi (quầy bị xóa dưới NH): BẢO LƯU NGUYÊN VẸN nhóm bếp cũ để tránh mất cấu hình!
            # - Món KHÔNG CÓ Nhóm Bếp, Quầy Bếp (ACCOUNT) và Máy In (hoặc chỉ mang nhóm rác GPOS ALL / Bếp Nóng & Nướng):
            #   TỰ ĐỘNG GỠ BỎ KHỎI KDS (xóa khỏi CONFIG_COOKING) để tránh lỗi phạt trễ oan khi thu ngân đóng bàn!
            unassigned_empty_doc_ids = []   # Món không có nhóm bếp/quầy/máy in -> Gỡ khỏi KDS
            unassigned_custom_doc_ids = []  # Món không có quầy nhưng có tên nhóm custom -> làm trống nhóm
            preserved_count = 0
            orphan_assigned_count = 0

            def is_empty_or_junk_kds_group(grp: Any) -> bool:
                """Kiểm tra nhóm bếp có phải rỗng hoặc là nhóm rác mặc định của GPOS khi nạp menu hay không"""
                if grp is None:
                    return True
                if isinstance(grp, dict):
                    c = str(grp.get("code") or "").strip()
                    n = str(grp.get("name") or "").strip()
                    if not c and not n:
                        return True
                    val = n or c
                else:
                    val = str(grp).strip()
                if not val or val in ("—", "-", "0"):
                    return True
                # Chuẩn hóa loại bỏ dấu tiếng Việt và ký tự đặc biệt
                s = val.replace("đ", "d").replace("Đ", "D")
                s = unicodedata.normalize('NFKD', s)
                s = "".join(ch for ch in s if not unicodedata.combining(ch)).upper()
                s = s.replace("&", "VA").replace("+", "VA")
                s = re.sub(r'[^A-Z0-9]+', '', s)
                junk_tokens = {"", "ALL", "TATCA", "DEFAULT", "BEPNONGVANUONG", "BEPNONGNUONG"}
                return s in junk_tokens

            for doc in cook_col.find({}, {"_id": 1, "menuItemCode": 1, "menuItemName": 1, "placeIds": 1, "groupTypeKds": 1}):
                raw_pids = doc.get("placeIds")
                valid_int_pids = [int(p) for p in (raw_pids or []) if str(p).isdigit() and int(p) > 0]

                # Nếu món THỰC SỰ không có bất kỳ placeIds hợp lệ nào (Chưa gán quầy & Chưa gán máy in)
                if not valid_int_pids:
                    old_grp = doc.get("groupTypeKds")
                    if is_empty_or_junk_kds_group(old_grp):
                        # Không có Nhóm Bếp (hoặc nhóm rác GPOS) + Không có Quầy Bếp + Không có Máy In
                        unassigned_empty_doc_ids.append(doc["_id"])
                    else:
                        unassigned_custom_doc_ids.append(doc["_id"])
                    continue

                # Nếu món có placeIds nhưng không nằm trong quầy chuẩn đã khai báo (quầy mồ côi)
                if not any(p in all_valid_pids for p in valid_int_pids):
                    old_grp = doc.get("groupTypeKds")
                    has_old_grp = False
                    if isinstance(old_grp, dict):
                        has_old_grp = bool(str(old_grp.get("code") or old_grp.get("name") or "").strip())
                    elif old_grp:
                        has_old_grp = bool(str(old_grp).strip())

                    if has_old_grp:
                        # Bảo lưu an toàn nhóm bếp đã cấu hình trước đó, tuyệt đối không xóa trắng!
                        preserved_count += 1
                    else:
                        # Nếu nhóm bếp đang trống, tạm thời gán theo mã quầy mồ côi
                        fallback_code = f"Quay_{valid_int_pids[0]}"
                        cook_col.update_one(
                            {"_id": doc["_id"]},
                            {"$set": {"groupTypeKds": {"id": 0, "code": fallback_code, "name": fallback_code}}}
                        )
                        orphan_assigned_count += 1

            # 2.1. Tự động GỠ BỎ (XÓA) khỏi CONFIG_COOKING các món không có Nhóm Bếp, Quầy Bếp, Máy In
            deleted_count = 0
            deleted_samples: List[str] = []
            if unassigned_empty_doc_ids:
                # Lấy mẫu thông tin món bị gỡ để lưu vết AuditLog
                sample_docs = list(cook_col.find(
                    {"_id": {"$in": unassigned_empty_doc_ids[:10]}},
                    {"menuItemCode": 1, "menuItemName": 1}
                ))
                deleted_samples = [
                    f"{d.get('menuItemCode')} ({d.get('menuItemName')})"
                    for d in sample_docs
                ]
                res_delete = cook_col.delete_many({"_id": {"$in": unassigned_empty_doc_ids}})
                deleted_count = res_delete.deleted_count

            # 2.2. Làm trống nhóm bếp cho các món không có quầy nhưng mang nhóm custom (nếu có)
            empty_grp_obj = {
                "id": 0,
                "code": "",
                "name": ""
            }
            empty_count = 0
            if unassigned_custom_doc_ids:
                res_empty = cook_col.update_many(
                    {"_id": {"$in": unassigned_custom_doc_ids}},
                    {"$set": {"groupTypeKds": empty_grp_obj}}
                )
                empty_count = res_empty.modified_count
                modified_count += empty_count

            msg_parts = [
                f"Đã đồng nhất Nhóm Bếp theo Quầy Bếp thành công: cập nhật {assigned_count} món theo quầy chuẩn."
            ]
            if deleted_count > 0:
                msg_parts.append(
                    f"Đã tự động gỡ bỏ {deleted_count} món không có Nhóm Bếp, Quầy Bếp (ACCOUNT) và Máy In khỏi KDS (CONFIG_COOKING)."
                )
            if empty_count > 0:
                msg_parts.append(f"Làm trống nhóm cho {empty_count} món chưa gán quầy.")
            if preserved_count > 0 or orphan_assigned_count > 0:
                msg_parts.append(
                    f"(Đã bảo lưu an toàn {preserved_count + orphan_assigned_count} món thuộc quầy mồ côi chưa khai báo dưới NH)."
                )
            msg = " ".join(msg_parts)

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="SYNC_KDS_GROUPS_BY_QUAYS",
                        TARGET_OBJECT="CONFIG_COOKING",
                        DESCRIPTION=(
                            f"Đồng nhất Nhóm Bếp theo Quầy Bếp ({assigned_count} món gán quầy dạng 'Quay_Thit', "
                            f"tự động gỡ bỏ {deleted_count} món không có nhóm bếp/quầy/máy in khỏi KDS) "
                            f"trên {payload.host}:{payload.port}"
                        ),
                        DETAILS=json.dumps({
                            "host": payload.host,
                            "assigned_count": assigned_count,
                            "deleted_count": deleted_count,
                            "deleted_samples": deleted_samples,
                            "empty_count": empty_count,
                            "preserved_count": preserved_count,
                            "total_modified": modified_count
                        }),
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsSyncGroupsByQuaysResponse(
                success=True,
                modified_count=modified_count,
                deleted_count=deleted_count,
                message=msg
            )
        finally:
            client.close()

    @staticmethod
    def update_kds_dish_group(
        current_user: UserInfo,
        payload: KdsUpdateDishGroupRequest,
        db: Optional[Session] = None
    ) -> KdsUpdateDishGroupResponse:
        """
        Cập nhật Nhóm Bếp (groupTypeKds) cho 1 hoặc nhiều món ăn được chỉ định trong CONFIG_COOKING.
        Nếu tên nhóm để trống -> xóa trắng nhóm bếp (để trống).
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            cook_col = db_kitchen["CONFIG_COOKING"]

            grp_name = payload.new_group_name.strip()
            if not grp_name:
                new_grp_obj = {
                    "id": 0,
                    "code": "",
                    "name": ""
                }
                desc_name = "(để trống)"
            else:
                code_name = MongoDBService.to_kds_group_code(grp_name) if payload.new_group_name else grp_name
                new_grp_obj = {
                    "id": 0,
                    "code": code_name,
                    "name": code_name
                }
                desc_name = code_name

            clean_codes = [str(c).strip() for c in payload.menu_item_codes if str(c).strip()]
            int_codes = [int(c) for c in clean_codes if c.isdigit()]
            all_codes = list(set(clean_codes + int_codes))

            res = cook_col.update_many(
                {"menuItemCode": {"$in": all_codes}},
                {"$set": {"groupTypeKds": new_grp_obj}}
            )

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="UPDATE_KDS_DISH_GROUP",
                        TARGET_OBJECT=f"CONFIG_COOKING:dishes_{len(clean_codes)}",
                        DESCRIPTION=f"Cập nhật Nhóm Bếp thành '{desc_name}' cho {res.modified_count} món trên {payload.host}:{payload.port}",
                        DETAILS=json.dumps({"host": payload.host, "group": desc_name, "count": res.modified_count}),
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsUpdateDishGroupResponse(
                success=True,
                modified_count=res.modified_count,
                group_name=desc_name,
                message=f"Đã cập nhật Nhóm Bếp thành '{desc_name}' cho {res.modified_count} món thành công!"
            )
        finally:
            client.close()

    @staticmethod
    def delete_kds_cooking_config(
        current_user: UserInfo,
        payload: KdsDeleteCookingConfigRequest,
        db: Optional[Session] = None
    ) -> KdsDeleteCookingConfigResponse:
        """
        Gỡ bỏ món khỏi bảng CONFIG_COOKING (dành cho các món không cần theo dõi chế biến như Vé Buffet, nước ngọt).
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            cook_col = db_kitchen["CONFIG_COOKING"]

            clean_codes = [str(c).strip() for c in payload.menu_item_codes if str(c).strip()]
            int_codes = [int(c) for c in clean_codes if c.isdigit()]
            all_codes = list(set(clean_codes + int_codes))

            res = cook_col.delete_many({"menuItemCode": {"$in": all_codes}})

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="DELETE_KDS_COOKING_CONFIG",
                        TARGET_OBJECT=f"CONFIG_COOKING:dishes_{len(clean_codes)}",
                        DESCRIPTION=f"Gỡ bỏ {res.deleted_count} món khỏi CONFIG_COOKING (không theo dõi KDS) trên {payload.host}:{payload.port}",
                        DETAILS=json.dumps({"host": payload.host, "deleted_count": res.deleted_count, "codes": clean_codes}),
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsDeleteCookingConfigResponse(
                success=True,
                deleted_count=res.deleted_count,
                message=f"Đã gỡ bỏ {res.deleted_count} món khỏi CONFIG_COOKING thành công! Từ nay món này khi order sẽ không gửi về KDS và không bao giờ bị báo đỏ trễ giờ."
            )
        finally:
            client.close()

    @staticmethod
    def get_kds_logs(
        payload: KdsLogQueryRequest,
        current_user: UserInfo
    ) -> KdsLogQueryResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        logs: List[KdsLogItem] = []
        try:
            date_str = payload.date.strip()
            if "/" in date_str:
                parts = date_str.split("/")
                if len(parts) == 3:
                    if len(parts[2]) == 4:
                        date_str = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                    elif len(parts[0]) == 4:
                        date_str = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"

            from_t = payload.from_time.strip() if payload.from_time else "00:00:00"
            if len(from_t) == 5:
                from_t += ":00"
            to_t = payload.to_time.strip() if payload.to_time else "23:59:59"
            if len(to_t) == 5:
                to_t += ":59"

            start_dt = datetime.datetime.strptime(f"{date_str} {from_t}", "%Y-%m-%d %H:%M:%S")
            end_dt = datetime.datetime.strptime(f"{date_str} {to_t}", "%Y-%m-%d %H:%M:%S")
            start_ms = int(start_dt.timestamp() * 1000)
            end_ms = int(end_dt.timestamp() * 1000)

            all_dbs = client.list_database_names()
            db_kitchen = client["G_KITCHEN"] if "G_KITCHEN" in all_dbs else None
            db_order = client["G_ORDER"] if "G_ORDER" in all_dbs else None

            place_map: Dict[int, str] = {}
            place_printer_map: Dict[int, str] = {}
            is_disable_print: bool = False
            if db_kitchen is not None:
                cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
                is_disable_print = bool(cfg.get("isDisablePrint", False))
                for p in (cfg.get("places") or []):
                    if isinstance(p, dict) and p.get("id") is not None:
                        try:
                            pid_int = int(p["id"])
                            place_map[pid_int] = p.get("name", f"Quầy #{p['id']}")
                            place_printer_map[pid_int] = str(p.get("printer") or p.get("driverName") or "").strip()
                        except Exception:
                            pass
                if "ACCOUNT" in db_kitchen.list_collection_names():
                    for acc in db_kitchen["ACCOUNT"].find():
                        for lp in (acc.get("listPlace") or []):
                            if isinstance(lp, dict) and lp.get("id") is not None:
                                try:
                                    lp_pid = int(lp["id"])
                                    if lp_pid not in place_printer_map or not place_printer_map[lp_pid]:
                                        lp_prn = str(lp.get("printer") or lp.get("driverName") or "").strip()
                                        if lp_prn:
                                            place_printer_map[lp_pid] = lp_prn
                                except Exception:
                                    pass

            table_filter = payload.table.strip().lower() if payload.table else None
            query_filter = _remove_vietnamese_tones(payload.query.strip()) if payload.query else None

            def parse_time_val(val: Any) -> Optional[datetime.datetime]:
                if not val:
                    return None
                if isinstance(val, datetime.datetime):
                    return val
                if isinstance(val, (int, float)):
                    if val > 1000000000000:
                        return datetime.datetime.fromtimestamp(val / 1000.0)
                    elif val > 1000000000:
                        return datetime.datetime.fromtimestamp(val)
                if isinstance(val, str):
                    val_str = val.strip()
                    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y %I:%M:%S %p", "%d/%m/%Y %I:%M:%S%p"]:
                        try:
                            return datetime.datetime.strptime(val_str.split(".")[0], fmt.split(".")[0])
                        except Exception:
                            pass
                return None

            # 1. Quét G_KITCHEN.LOG_DISH_FINISH_ITEM
            if db_kitchen is not None and "LOG_DISH_FINISH_ITEM" in db_kitchen.list_collection_names():
                col_finish = db_kitchen["LOG_DISH_FINISH_ITEM"]
                time_cond = {
                    "$or": [
                        {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"deliveryTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"submitTime": {"$gte": start_dt, "$lte": end_dt}},
                        {"deliveryTime": {"$gte": start_dt, "$lte": end_dt}},
                    ]
                }
                cursor = col_finish.find(time_cond).sort("submitTime", -1).limit(payload.limit)
                for doc in cursor:
                    m = doc.get("menuItem") or {}
                    c = doc.get("configCooking") or {}
                    m_code = str(m.get("code") or doc.get("menuItemCode") or "").strip()
                    m_name = str(m.get("name") or doc.get("menuItemName") or "").strip()
                    m_sap = str(m.get("sapCode") or doc.get("sapCode") or "").strip()

                    # Bóc tách tên bàn sạch sẽ, không hiển thị cả object dict
                    raw_tbl = doc.get("tableName") or doc.get("table") or doc.get("tableCode") or "-"
                    tbl = "-"
                    if isinstance(raw_tbl, dict):
                        tbl = str(raw_tbl.get("name") or raw_tbl.get("code") or "-").strip()
                    elif isinstance(raw_tbl, str):
                        raw_str = raw_tbl.strip()
                        if raw_str.startswith("{") and "'name':" in raw_str:
                            import ast
                            try:
                                p_tbl = ast.literal_eval(raw_str)
                                tbl = str(p_tbl.get("name") or p_tbl.get("code") or "-").strip()
                            except Exception:
                                tbl = raw_str
                        else:
                            tbl = raw_str
                    else:
                        tbl = str(raw_tbl).strip()
                    if tbl and not tbl.lower().startswith("bàn") and tbl != "-":
                        tbl = f"Bàn {tbl}"

                    if table_filter and table_filter not in tbl.lower():
                        continue

                    if query_filter:
                        combined = f"{_remove_vietnamese_tones(m_name)} {m_code.lower()} {m_sap.lower()}"
                        if query_filter not in combined:
                            continue

                    sub_dt = parse_time_val(doc.get("submitTime"))
                    deliv_dt = parse_time_val(doc.get("deliveryTime"))

                    sub_ms = doc.get("submitTime") if isinstance(doc.get("submitTime"), (int, float)) else (int(sub_dt.timestamp() * 1000) if sub_dt else 0)
                    deliv_ms = doc.get("deliveryTime") if isinstance(doc.get("deliveryTime"), (int, float)) else (int(deliv_dt.timestamp() * 1000) if deliv_dt else 0)

                    actual_mins = 0.0
                    if sub_ms and deliv_ms and deliv_ms >= sub_ms:
                        actual_mins = round((deliv_ms - sub_ms) / 60000.0, 1)

                    raw_cfg = c.get("singleCookingTime") or doc.get("singleCookingTime") or 0
                    config_mins = round(float(raw_cfg) / 60.0, 1) if raw_cfg else 0.0

                    delay_mins = round(max(0.0, actual_mins - config_mins), 1)
                    if not deliv_dt:
                        status_lbl = "Đang chế biến (Chưa Done)"
                    elif config_mins > 0 and actual_mins > config_mins:
                        status_lbl = f"Trễ {delay_mins:.1f}p"
                    else:
                        status_lbl = "Kịp giờ"

                    # Trích xuất danh sách quầy và nhóm KDS tại THỜI ĐIỂM ORDER (ghi nhận trong snapshot configCooking)
                    hist_pids_raw = c.get("placeIds") if isinstance(c.get("placeIds"), list) else ([doc.get("placeId")] if doc.get("placeId") is not None else [])
                    clean_pids: List[int] = []
                    for p in hist_pids_raw:
                        try:
                            clean_pids.append(int(p))
                        except (ValueError, TypeError):
                            pass

                    grp_kds = c.get("groupTypeKds") or {}
                    grp_name = str(grp_kds.get("name") or grp_kds.get("code") or "").strip()
                    is_unassigned = len(clean_pids) == 0

                    # Xác định tên quầy bếp tại thời điểm order
                    if doc.get("placeName"):
                        p_name = str(doc.get("placeName")).strip()
                    elif clean_pids:
                        p_names = [place_map.get(pid, f"Quầy #{pid}") for pid in clean_pids]
                        p_name = ", ".join(p_names)
                    elif grp_name:
                        p_name = f"⚠️ Chưa gán quầy ({grp_name})"
                    else:
                        p_name = "⚠️ Chưa gán quầy (ALL)"

                    # Bóc tách cấu hình máy in ghi nhận tại thời điểm đó
                    hist_prn = str(doc.get("printer") or c.get("printer") or c.get("driverName") or "").strip()
                    if not hist_prn and clean_pids:
                        for pid in clean_pids:
                            if place_printer_map.get(pid):
                                hist_prn = place_printer_map[pid]
                                break

                    # Bắt logs và kiểm tra phát lệnh in khi Done món
                    if not deliv_dt:
                        p_status = "NOT_DONE"
                        p_msg = "Chưa Done (Chờ bếp bấm để phát lệnh in)"
                    elif is_disable_print:
                        p_status = "DISABLED"
                        p_msg = "Tắt in KDS (Cấu hình isDisablePrint: BẬT)"
                    elif is_unassigned and not hist_prn:
                        p_status = "NO_PRINTER"
                        p_msg = f"Món chưa gán quầy cụ thể ({grp_name or 'ALL'}) - KDS không cấu hình máy in"
                        hist_prn = f"Không có máy in ({grp_name or 'ALL'})"
                    elif not hist_prn:
                        p_status = "NO_PRINTER"
                        p_msg = f"Quầy {p_name} chưa gán máy in/driver"
                    else:
                        p_status = "PRINTED"
                        done_str = deliv_dt.strftime("%H:%M:%S")
                        p_msg = f"Đã phát lệnh in ra [{hist_prn}] lúc {done_str}"

                    logs.append(KdsLogItem(
                        id=str(doc.get("_id")),
                        table_name=tbl,
                        dish_name=m_name or "Món ăn",
                        menu_item_code=m_code,
                        sap_code=m_sap,
                        place_name=p_name,
                        group_name=grp_name or None,
                        historical_place_ids=clean_pids,
                        is_unassigned=is_unassigned,
                        account_name=str(doc.get("accountName") or doc.get("accName") or doc.get("user") or "-"),
                        order_time=sub_dt.strftime("%d/%m/%Y %H:%M:%S") if sub_dt else "-",
                        done_time=deliv_dt.strftime("%d/%m/%Y %H:%M:%S") if deliv_dt else "Chưa Done",
                        actual_minutes=actual_mins,
                        config_minutes=config_mins,
                        delay_minutes=delay_mins,
                        status_label=status_lbl,
                        source_collection="G_KITCHEN.LOG_DISH_FINISH_ITEM",
                        printer_name=hist_prn or None,
                        print_status=p_status,
                        print_message=p_msg
                    ))

            # 2. Quét G_ORDER.ORDER_DELIVERY_LOG
            if db_order is not None and "ORDER_DELIVERY_LOG" in db_order.list_collection_names() and len(logs) < payload.limit:
                col_deliv = db_order["ORDER_DELIVERY_LOG"]
                q_deliv = {
                    "$or": [
                        {"time": {"$gte": start_ms, "$lte": end_ms}},
                        {"orderTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"time": {"$gte": start_dt, "$lte": end_dt}},
                    ]
                }
                rem_limit = payload.limit - len(logs)
                cursor2 = col_deliv.find(q_deliv).sort("time", -1).limit(rem_limit)
                for doc in cursor2:
                    m = doc.get("menuItem") or {}
                    m_code = str(m.get("code") or doc.get("itemCode") or "").strip()
                    m_name = str(m.get("name") or doc.get("itemName") or "").strip()
                    m_sap = str(m.get("sapCode") or "").strip()

                    raw_tbl = doc.get("tableName") or doc.get("table") or "-"
                    tbl = "-"
                    if isinstance(raw_tbl, dict):
                        tbl = str(raw_tbl.get("name") or raw_tbl.get("code") or "-").strip()
                    elif isinstance(raw_tbl, str):
                        raw_str = raw_tbl.strip()
                        if raw_str.startswith("{") and "'name':" in raw_str:
                            import ast
                            try:
                                p_tbl = ast.literal_eval(raw_str)
                                tbl = str(p_tbl.get("name") or p_tbl.get("code") or "-").strip()
                            except Exception:
                                tbl = raw_str
                        else:
                            tbl = raw_str
                    else:
                        tbl = str(raw_tbl).strip()
                    if tbl and not tbl.lower().startswith("bàn") and tbl != "-":
                        tbl = f"Bàn {tbl}"

                    if table_filter and table_filter not in tbl.lower():
                        continue
                    if query_filter:
                        combined = f"{_remove_vietnamese_tones(m_name)} {m_code.lower()} {m_sap.lower()}"
                        if query_filter not in combined:
                            continue

                    ord_dt = parse_time_val(doc.get("orderTime") or doc.get("submitTime"))
                    deliv_dt = parse_time_val(doc.get("time") or doc.get("deliveryTime"))

                    actual_raw = doc.get("actualCookTime") or 0
                    actual_mins = round(float(actual_raw) / 60000.0, 1) if actual_raw else 0.0
                    if actual_mins == 0.0 and ord_dt and deliv_dt:
                        diff_sec = (deliv_dt - ord_dt).total_seconds()
                        if diff_sec > 0:
                            actual_mins = round(diff_sec / 60.0, 1)

                    cfg_raw = doc.get("configCookTime") or 0
                    config_mins = round(float(cfg_raw) / 60000.0, 1) if cfg_raw else 0.0
                    delay_mins = round(max(0.0, actual_mins - config_mins), 1)
                    status_lbl = f"Trễ {delay_mins:.1f}p" if (config_mins > 0 and actual_mins > config_mins) else "Kịp giờ"

                    p_name_raw = str(doc.get("placeName") or "").strip()
                    p_name = p_name_raw if p_name_raw else "Quầy Bếp"

                    logs.append(KdsLogItem(
                        id=str(doc.get("_id")),
                        table_name=tbl,
                        dish_name=m_name or "Món ăn",
                        menu_item_code=m_code,
                        sap_code=m_sap,
                        place_name=p_name,
                        account_name=str(doc.get("accountName") or doc.get("user") or "-"),
                        order_time=ord_dt.strftime("%d/%m/%Y %H:%M:%S") if ord_dt else "-",
                        done_time=deliv_dt.strftime("%d/%m/%Y %H:%M:%S") if deliv_dt else "-",
                        actual_minutes=actual_mins,
                        config_minutes=config_mins,
                        delay_minutes=delay_mins,
                        status_label=status_lbl,
                        source_collection="G_ORDER.ORDER_DELIVERY_LOG",
                        printer_name=str(doc.get("printer") or "").strip() or None,
                        print_status="PRINTED" if deliv_dt else "NOT_DONE",
                        print_message=f"Đã giao món lúc {deliv_dt.strftime('%H:%M:%S')}" if deliv_dt else "Chưa Done"
                    ))

            return KdsLogQueryResponse(
                success=True,
                total=len(logs),
                date=date_str,
                table_filter=payload.table,
                query_filter=payload.query,
                logs=logs,
                message=f"Đã tìm thấy {len(logs)} bản ghi nhật ký KDS trong ngày {date_str}."
            )
        finally:
            client.close()

    @staticmethod
    def analyze_kds_kitchen_intake(
        payload: KdsKitchenIntakeAnalysisRequest,
        current_user: UserInfo
    ) -> KdsKitchenIntakeAnalysisResponse:
        """
        Phân tích tổng số lượng món ăn và lượt gửi order vào bếp (KDS/Kitchen Intake Analysis).
        - Thời gian: start_date đến end_date (chặn tối đa 5 ngày).
        - Thống kê song song:
          + Theo món: Tổng số món được gọi vào bếp (sum quantity)
          + Theo lượt: Tổng số đợt bấm gửi bếp (batch theo order/table + submit_time)
        - Phân rã theo từng Quầy Bếp (Places), theo Ngày (Dates) và theo Giờ trong ngày (Hours).
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            # 1. Chuẩn hóa ngày và kiểm tra giới hạn tối đa 5 ngày
            def _parse_date_str(d_str: str) -> datetime.date:
                clean = d_str.strip()
                if "/" in clean:
                    parts = clean.split("/")
                    if len(parts) == 3:
                        if len(parts[2]) == 4:
                            clean = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                        elif len(parts[0]) == 4:
                            clean = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"]:
                    try:
                        return datetime.datetime.strptime(clean, fmt).date()
                    except Exception:
                        pass
                raise ValueError(f"Định dạng ngày không hợp lệ: {d_str}")

            s_date = _parse_date_str(payload.start_date)
            e_date = _parse_date_str(payload.end_date)
            if s_date > e_date:
                s_date, e_date = e_date, s_date

            day_span = (e_date - s_date).days + 1
            if day_span > 5:
                # Giới hạn tối đa 5 ngày theo quy định
                e_date = s_date + datetime.timedelta(days=4)
                day_span = 5

            start_dt = datetime.datetime.combine(s_date, datetime.time.min)
            end_dt = datetime.datetime.combine(e_date, datetime.time.max)
            start_ms = int(start_dt.timestamp() * 1000)
            end_ms = int(end_dt.timestamp() * 1000)

            all_dbs = client.list_database_names()
            db_kitchen = client["G_KITCHEN"] if "G_KITCHEN" in all_dbs else None
            db_order = client["G_ORDER"] if "G_ORDER" in all_dbs else None

            # 2. Xây dựng bản đồ Quầy Bếp (Place Map)
            place_map: Dict[int, str] = {}
            if db_kitchen is not None:
                cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
                for p in (cfg.get("places") or []):
                    if isinstance(p, dict) and p.get("id") is not None:
                        try:
                            pid_int = int(p["id"])
                            place_map[pid_int] = str(p.get("name") or f"Quầy #{p['id']}").strip()
                        except Exception:
                            pass
                if "ACCOUNT" in db_kitchen.list_collection_names():
                    for acc in db_kitchen["ACCOUNT"].find():
                        for lp in (acc.get("listPlace") or []):
                            if isinstance(lp, dict) and lp.get("id") is not None:
                                try:
                                    lp_pid = int(lp["id"])
                                    if lp_pid not in place_map:
                                        place_map[lp_pid] = str(lp.get("name") or f"Quầy #{lp_pid}").strip()
                                except Exception:
                                    pass

            def parse_time_val(val: Any) -> Optional[datetime.datetime]:
                if not val:
                    return None
                if isinstance(val, datetime.datetime):
                    return val
                if isinstance(val, (int, float)):
                    if val > 1000000000000:
                        return datetime.datetime.fromtimestamp(val / 1000.0)
                    elif val > 1000000000:
                        return datetime.datetime.fromtimestamp(val)
                if isinstance(val, str):
                    val_str = val.strip()
                    for fmt in ["%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%d/%m/%Y %H:%M:%S"]:
                        try:
                            return datetime.datetime.strptime(val_str.split(".")[0], fmt.split(".")[0])
                        except Exception:
                            pass
                return None

            # 3. Thu thập và tổng hợp dữ liệu
            total_dishes = 0
            overall_batches: set = set()
            place_stats: Dict[int, Dict[str, Any]] = {}
            for pid, pname in place_map.items():
                place_stats[pid] = {"name": pname, "dishes": 0, "batches": set()}
            place_unassigned: Dict[str, Any] = {"name": "⚠️ Chưa gán quầy / Khác", "dishes": 0, "batches": set()}

            date_stats: Dict[str, Dict[str, Any]] = {}
            curr = s_date
            while curr <= e_date:
                d_key = curr.strftime("%Y-%m-%d")
                date_stats[d_key] = {"dishes": 0, "batches": set()}
                curr += datetime.timedelta(days=1)

            hour_stats: Dict[int, Dict[str, Any]] = {
                h: {"dishes": 0, "batches": set()} for h in range(24)
            }

            processed_ids: set = set()

            def process_dish_record(doc: Dict[str, Any]):
                nonlocal total_dishes
                doc_id = str(doc.get("_id"))
                if doc_id in processed_ids:
                    return
                processed_ids.add(doc_id)

                sub_val = doc.get("submitTime") or doc.get("orderTime") or doc.get("time") or doc.get("createDate")
                sub_dt = parse_time_val(sub_val)
                if not sub_dt:
                    return
                if sub_dt < start_dt or sub_dt > end_dt:
                    return

                q_val = doc.get("quantity") or doc.get("qty") or doc.get("count") or 1
                try:
                    qty = int(float(q_val))
                    if qty <= 0:
                        qty = 1
                except Exception:
                    qty = 1

                # Nhận diện Lượt gửi (Batch) gom món cùng bàn/order trong cửa sổ 3 giây (3000ms)
                raw_tbl = doc.get("tableName") or doc.get("table") or doc.get("tableCode") or "TBL"
                if isinstance(raw_tbl, dict):
                    tbl_str = str(raw_tbl.get("name") or raw_tbl.get("code") or "TBL").strip()
                else:
                    tbl_str = str(raw_tbl).strip()

                order_ref = str(doc.get("orderId") or doc.get("orderGuid") or doc.get("batchId") or tbl_str).strip()
                ts_ms = int(sub_dt.timestamp() * 1000)
                time_window = ts_ms // 3000
                batch_key = f"{sub_dt.strftime('%Y%m%d')}_{order_ref}_{time_window}"

                total_dishes += qty
                overall_batches.add(batch_key)

                # Cập nhật theo ngày
                d_str = sub_dt.strftime("%Y-%m-%d")
                if d_str in date_stats:
                    date_stats[d_str]["dishes"] += qty
                    date_stats[d_str]["batches"].add(batch_key)

                # Cập nhật theo giờ
                h = sub_dt.hour
                if h in hour_stats:
                    hour_stats[h]["dishes"] += qty
                    hour_stats[h]["batches"].add(batch_key)

                # Cập nhật theo quầy bếp
                c = doc.get("configCooking") or {}
                raw_pids = c.get("placeIds") if isinstance(c.get("placeIds"), list) else ([doc.get("placeId")] if doc.get("placeId") is not None else [])
                clean_pids = []
                for p in raw_pids:
                    try:
                        clean_pids.append(int(p))
                    except (ValueError, TypeError):
                        pass

                if clean_pids:
                    for pid in clean_pids:
                        if pid not in place_stats:
                            place_stats[pid] = {
                                "name": place_map.get(pid, f"Quầy #{pid}"),
                                "dishes": 0,
                                "batches": set()
                            }
                        place_stats[pid]["dishes"] += qty
                        place_stats[pid]["batches"].add(batch_key)
                else:
                    place_unassigned["dishes"] += qty
                    place_unassigned["batches"].add(batch_key)

            time_filter = {
                "$or": [
                    {"submitTime": {"$gte": start_ms, "$lte": end_ms}},
                    {"submitTime": {"$gte": start_dt, "$lte": end_dt}},
                ]
            }
            proj = {
                "_id": 1,
                "submitTime": 1,
                "orderTime": 1,
                "quantity": 1,
                "qty": 1,
                "orderId": 1,
                "orderGuid": 1,
                "batchId": 1,
                "tableName": 1,
                "table": 1,
                "tableCode": 1,
                "placeId": 1,
                "placeName": 1,
                "configCooking.placeIds": 1
            }

            source_colls = []
            if db_kitchen is not None:
                if "LOG_DISH_FINISH_ITEM" in db_kitchen.list_collection_names():
                    source_colls.append("LOG_DISH_FINISH_ITEM")
                    for d in db_kitchen["LOG_DISH_FINISH_ITEM"].find(time_filter, proj):
                        process_dish_record(d)

                if "DISH_KDS" in db_kitchen.list_collection_names():
                    source_colls.append("DISH_KDS")
                    for d in db_kitchen["DISH_KDS"].find(time_filter, proj):
                        process_dish_record(d)

            # Fallback nếu G_KITCHEN không có dữ liệu
            if total_dishes == 0 and db_order is not None and "ORDER_DELIVERY_LOG" in db_order.list_collection_names():
                source_colls.append("ORDER_DELIVERY_LOG")
                q_deliv = {
                    "$or": [
                        {"time": {"$gte": start_ms, "$lte": end_ms}},
                        {"orderTime": {"$gte": start_ms, "$lte": end_ms}},
                        {"time": {"$gte": start_dt, "$lte": end_dt}},
                    ]
                }
                for d in db_order["ORDER_DELIVERY_LOG"].find(q_deliv):
                    process_dish_record(d)

            total_batches_count = len(overall_batches)
            avg_all = round(total_dishes / total_batches_count, 1) if total_batches_count > 0 else 0.0

            # Xây dựng danh sách thống kê theo Quầy Bếp (by_places)
            by_places_list: List[KdsKitchenIntakePlaceStat] = []
            for pid, pdata in place_stats.items():
                p_dishes = pdata["dishes"]
                p_batches = len(pdata["batches"])
                p_avg = round(p_dishes / p_batches, 1) if p_batches > 0 else 0.0
                pct = round((p_dishes / total_dishes) * 100, 1) if total_dishes > 0 else 0.0
                if p_dishes > 0 or p_batches > 0:
                    by_places_list.append(KdsKitchenIntakePlaceStat(
                        place_id=pid,
                        place_name=pdata["name"],
                        total_dishes=p_dishes,
                        total_batches=p_batches,
                        avg_dishes_per_batch=p_avg,
                        percentage=pct
                    ))

            if place_unassigned["dishes"] > 0:
                u_dishes = place_unassigned["dishes"]
                u_batches = len(place_unassigned["batches"])
                u_avg = round(u_dishes / u_batches, 1) if u_batches > 0 else 0.0
                pct = round((u_dishes / total_dishes) * 100, 1) if total_dishes > 0 else 0.0
                by_places_list.append(KdsKitchenIntakePlaceStat(
                    place_id=None,
                    place_name=place_unassigned["name"],
                    total_dishes=u_dishes,
                    total_batches=u_batches,
                    avg_dishes_per_batch=u_avg,
                    percentage=pct
                ))

            by_places_list.sort(key=lambda x: x.total_dishes, reverse=True)

            # Xây dựng danh sách thống kê theo Ngày (by_dates)
            by_dates_list: List[KdsKitchenIntakeDateStat] = []
            for d_str in sorted(date_stats.keys()):
                d_info = date_stats[d_str]
                d_dishes = d_info["dishes"]
                d_batches = len(d_info["batches"])
                d_avg = round(d_dishes / d_batches, 1) if d_batches > 0 else 0.0
                by_dates_list.append(KdsKitchenIntakeDateStat(
                    date=d_str,
                    total_dishes=d_dishes,
                    total_batches=d_batches,
                    avg_dishes_per_batch=d_avg
                ))

            # Xây dựng danh sách thống kê theo Khung Giờ (by_hours)
            by_hours_list: List[KdsKitchenIntakeHourStat] = []
            for h in range(24):
                h_info = hour_stats[h]
                by_hours_list.append(KdsKitchenIntakeHourStat(
                    hour=h,
                    hour_label=f"{h:02d}:00 - {(h+1)%24:02d}:00",
                    total_dishes=h_info["dishes"],
                    total_batches=len(h_info["batches"])
                ))

            if payload.place_id is not None:
                by_places_list = [p for p in by_places_list if p.place_id == payload.place_id]

            date_range_label = f"{s_date.strftime('%d/%m/%Y')} -> {e_date.strftime('%d/%m/%Y')}" if s_date != e_date else s_date.strftime('%d/%m/%Y')
            msg = (
                f"Đã phân tích xong món vào bếp ({date_range_label}, {day_span} ngày): "
                f"Tổng {total_dishes:,} món ăn / {total_batches_count:,} lượt gửi bếp."
            )

            return KdsKitchenIntakeAnalysisResponse(
                success=True,
                message=msg,
                start_date=s_date.strftime("%Y-%m-%d"),
                end_date=e_date.strftime("%Y-%m-%d"),
                total_days=day_span,
                total_dishes=total_dishes,
                total_batches=total_batches_count,
                avg_dishes_per_batch=avg_all,
                by_places=by_places_list,
                by_dates=by_dates_list,
                by_hours=by_hours_list,
                source_collection=" + ".join(source_colls) if source_colls else "G_KITCHEN"
            )
        finally:
            client.close()

    @staticmethod
    def get_kds_dish_history(
        current_user: UserInfo,
        payload: KdsDishHistoryRequest,
        db: Optional[Session] = None
    ) -> KdsDishHistoryResponse:
        """
        Tra cứu lịch sử chi tiết của một món ăn trên KDS:
        1. Đối soát cấu hình hiện tại trong CONFIG_COOKING (quầy, nhóm KDS, thời gian chuẩn).
        2. Quét toàn bộ lịch sử các lần Order & Vào KDS từ LOG_DISH_FINISH_ITEM để phát hiện:
           - Món tại thời điểm order từng thuộc quầy nào?
           - Có bị gỡ khỏi quầy (placeIds: []) không?
           - Có được KDS mặc định điều phối vào nhóm ALL (Bếp Nóng & Nướng / KDS Tổng) không?
        3. Kiểm tra trạng thái Ẩn/Hiện trong SHOW_HIDE_ITEMS và Hết món trong OUT_OF_DISH.
        4. Tự động xuất báo cáo phân tích đối soát thông minh giúp IT làm việc với Nhà hàng.
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            all_dbs = client.list_database_names()
            db_kitchen = client["G_KITCHEN"] if "G_KITCHEN" in all_dbs else None
            db_order = client["G_ORDER"] if "G_ORDER" in all_dbs else None

            # 1. Map tên quầy hiện tại từ CONFIG_KDS
            place_map: Dict[int, str] = {}
            if db_kitchen is not None and "CONFIG_KDS" in db_kitchen.list_collection_names():
                cfg = db_kitchen["CONFIG_KDS"].find_one() or {}
                for p in (cfg.get("places") or []):
                    if isinstance(p, dict) and p.get("id") is not None:
                        try:
                            place_map[int(p["id"])] = p.get("name", f"Quầy #{p['id']}")
                        except Exception:
                            pass

            item_code = payload.item_code.strip()
            sap_code = (payload.sap_code or "").strip()
            d_name = (payload.dish_name or "").strip()

            # 2. Kiểm tra CONFIG_COOKING hiện tại
            is_in_cfg = False
            cur_pids: List[int] = []
            cur_names: List[str] = []
            cur_grp: str = ""
            cur_cfg_mins: float = 0.0

            if db_kitchen is not None and "CONFIG_COOKING" in db_kitchen.list_collection_names():
                q_cfg: Dict[str, Any] = {"$or": [
                    {"menuItemCode": item_code},
                    {"code": item_code}
                ]}
                if sap_code:
                    q_cfg["$or"].append({"sapCode": sap_code})
                c_doc = db_kitchen["CONFIG_COOKING"].find_one(q_cfg)
                if c_doc:
                    is_in_cfg = True
                    d_name = d_name or str(c_doc.get("menuItemName") or c_doc.get("name") or "")
                    sap_code = sap_code or str(c_doc.get("sapCode") or "")
                    for pid in (c_doc.get("placeIds") or []):
                        try:
                            pid_i = int(pid)
                            cur_pids.append(pid_i)
                            cur_names.append(place_map.get(pid_i, f"Quầy #{pid_i}"))
                        except Exception:
                            pass
                    g = c_doc.get("groupTypeKds") or {}
                    cur_grp = str(g.get("name") or g.get("code") or "")
                    raw_s = c_doc.get("singleCookingTime") or 0
                    cur_cfg_mins = round(float(raw_s) / 60.0, 1) if raw_s else 0.0

            # 3. Kiểm tra ẩn / hiện & hết món trong G_ORDER
            is_hidden = False
            is_out_of_stock = False
            if db_order is not None:
                if "SHOW_HIDE_ITEMS" in db_order.list_collection_names():
                    sh_doc = db_order["SHOW_HIDE_ITEMS"].find_one({"$or": [{"itemCode": item_code}, {"code": item_code}]})
                    if sh_doc:
                        d_name = d_name or str(sh_doc.get("itemName") or "")
                        sap_code = sap_code or str(sh_doc.get("sapCode") or "")
                        if bool(sh_doc.get("isHideQrOrder")) or bool(sh_doc.get("isHideCo")) or bool(sh_doc.get("isHideSo")):
                            is_hidden = True

                if "OUT_OF_DISH" in db_order.list_collection_names():
                    out_doc = db_order["OUT_OF_DISH"].find_one({"$or": [{"itemCode": item_code}, {"code": item_code}, {"menuItemCode": item_code}]})
                    if out_doc and bool(out_doc.get("isOutOfDish", False)):
                        is_out_of_stock = True

            # 4. Truy xuất Timeline từ LOG_DISH_FINISH_ITEM
            timeline: List[KdsDishHistoryTimelineItem] = []
            if db_kitchen is not None and "LOG_DISH_FINISH_ITEM" in db_kitchen.list_collection_names():
                col_finish = db_kitchen["LOG_DISH_FINISH_ITEM"]
                q_log: Dict[str, Any] = {"$or": [
                    {"menuItem.code": item_code},
                    {"menuItemCode": item_code}
                ]}
                if sap_code:
                    q_log["$or"].extend([{"menuItem.sapCode": sap_code}, {"sapCode": sap_code}])
                if d_name:
                    q_log["$or"].append({"menuItem.name": {"$regex": re.escape(d_name), "$options": "i"}})

                cursor = col_finish.find(q_log).sort("submitTime", -1).limit(50)
                for doc in cursor:
                    m = doc.get("menuItem") or {}
                    c = doc.get("configCooking") or {}
                    d_name = d_name or str(m.get("name") or doc.get("menuItemName") or "Món ăn")
                    sap_code = sap_code or str(m.get("sapCode") or doc.get("sapCode") or "")

                    raw_tbl = doc.get("tableName") or doc.get("table") or doc.get("tableCode") or "-"
                    tbl = "-"
                    if isinstance(raw_tbl, dict):
                        tbl = str(raw_tbl.get("name") or raw_tbl.get("code") or "-").strip()
                    elif isinstance(raw_tbl, str):
                        raw_str = raw_tbl.strip()
                        if raw_str.startswith("{") and "'name':" in raw_str:
                            import ast
                            try:
                                p_tbl = ast.literal_eval(raw_str)
                                tbl = str(p_tbl.get("name") or p_tbl.get("code") or "-").strip()
                            except Exception:
                                tbl = raw_str
                        else:
                            tbl = raw_str
                    else:
                        tbl = str(raw_tbl).strip()
                    if tbl and not tbl.lower().startswith("bàn") and tbl != "-":
                        tbl = f"Bàn {tbl}"

                    def _ts_to_dt(val):
                        if not val:
                            return None
                        if isinstance(val, datetime.datetime):
                            return val
                        if isinstance(val, (int, float)):
                            if val > 1000000000000:
                                return datetime.datetime.fromtimestamp(val / 1000.0)
                            return datetime.datetime.fromtimestamp(val)
                        return None

                    sub_dt = _ts_to_dt(doc.get("submitTime"))
                    deliv_dt = _ts_to_dt(doc.get("deliveryTime"))

                    sub_ms = doc.get("submitTime") if isinstance(doc.get("submitTime"), (int, float)) else (int(sub_dt.timestamp() * 1000) if sub_dt else 0)
                    deliv_ms = doc.get("deliveryTime") if isinstance(doc.get("deliveryTime"), (int, float)) else (int(deliv_dt.timestamp() * 1000) if deliv_dt else 0)

                    actual_mins = 0.0
                    if sub_ms and deliv_ms and deliv_ms >= sub_ms:
                        actual_mins = round((deliv_ms - sub_ms) / 60000.0, 1)

                    raw_cfg = c.get("singleCookingTime") or doc.get("singleCookingTime") or 0
                    config_mins = round(float(raw_cfg) / 60.0, 1) if raw_cfg else 0.0
                    delay_mins = round(max(0.0, actual_mins - config_mins), 1)

                    if not deliv_dt:
                        status_lbl = "Đang chế biến (Chưa Done)"
                    elif config_mins > 0 and actual_mins > config_mins:
                        status_lbl = f"Trễ {delay_mins:.1f}p"
                    else:
                        status_lbl = "Kịp giờ"

                    h_pids: List[int] = []
                    for p in (c.get("placeIds") or []):
                        try:
                            h_pids.append(int(p))
                        except Exception:
                            pass

                    h_grp = c.get("groupTypeKds") or {}
                    h_grp_name = str(h_grp.get("name") or h_grp.get("code") or "").strip()

                    if doc.get("placeName"):
                        p_name = str(doc.get("placeName")).strip()
                    elif h_pids:
                        p_name = ", ".join([place_map.get(pid, f"Quầy #{pid}") for pid in h_pids])
                    elif h_grp_name:
                        p_name = f"Chưa gán quầy ({h_grp_name})"
                    else:
                        p_name = "Chưa gán quầy (ALL)"

                    prn = str(doc.get("printer") or c.get("printer") or c.get("driverName") or "").strip()

                    timeline.append(KdsDishHistoryTimelineItem(
                        id=str(doc.get("_id")),
                        order_time=sub_dt.strftime("%d/%m/%Y %H:%M:%S") if sub_dt else "-",
                        done_time=deliv_dt.strftime("%d/%m/%Y %H:%M:%S") if deliv_dt else "Chưa Done",
                        table_name=tbl,
                        place_ids=h_pids,
                        place_name=p_name,
                        group_name=h_grp_name,
                        config_minutes=config_mins,
                        actual_minutes=actual_mins,
                        delay_minutes=delay_mins,
                        status_label=status_lbl,
                        printer_name=prn or None,
                        source="LOG_DISH_FINISH_ITEM"
                    ))

            # 5. Phân tích thông minh (Smart Analysis)
            analysis_parts = []
            if not is_in_cfg:
                analysis_parts.append(
                    "❌ CẤU HÌNH HIỆN TẠI: Món này hiện KHÔNG CÓ trong bảng CONFIG_COOKING trên KDS của nhà hàng. "
                    "Điều này có nghĩa là nhà hàng chưa từng thiết lập hoặc ĐÃ XÓA/GỠ BỎ cấu hình quầy của món này."
                )
            else:
                p_text = ", ".join(cur_names) if cur_names else "Chưa chọn quầy (placeIds rỗng)"
                analysis_parts.append(
                    f"✅ CẤU HÌNH HIỆN TẠI: Món đang được gán vào: [{p_text}], Nhóm: '{cur_grp or 'Không có'}', "
                    f"Thời gian chuẩn: {cur_cfg_mins} phút."
                )

            if timeline:
                unassigned_count = sum(1 for t in timeline if not t.place_ids)
                assigned_count = len(timeline) - unassigned_count
                sample_grp = timeline[0].group_name or "ALL / Bếp Nóng & Nướng"

                if unassigned_count > 0 and assigned_count == 0:
                    analysis_parts.append(
                        f"⚠️ ĐỐI SOÁT LỊCH SỬ KDS: Toàn bộ {unassigned_count} lần order trong lịch sử đều ghi nhận placeIds: [] (Rỗng) "
                        f"và nhóm KDS là '{sample_grp}'.\n"
                        f"👉 GIẢI TRÌNH BẢN CHẤT KỸ THUẬT (GỬI NHÀ HÀNG & QUẢN TRỊ VIÊN):\n"
                        f"1. TẠI SAO BẾP KHÔNG THẤY MÓN? Các tablet KDS tại bếp chỉ lọc và hiển thị món có mã quầy (placeIds) khớp với quầy của trạm. "
                        f"Khi món có placeIds rỗng, các tablet quầy con KHÔNG nhận được món, nên nhân viên bếp khẳng định 'không thấy món để bấm Done' là HOÀN TOÀN CHÍNH XÁC!\n"
                        f"2. TẠI SAO LỊCH SỬ LẠI GHI NHẬN ĐÃ RA MÓN (DONE) VÀ BỊ TRỄ HÀNG TRĂM PHÚT? Khi khách dùng bữa xong và thu ngân thực hiện đóng bàn / thanh toán hóa đơn trên POS, "
                        f"phần mềm GPOS sẽ tự động kích hoạt cơ chế 'Auto-Done' (hoàn tất tự động) cho tất cả các món còn treo trên bàn đó. "
                        f"Thời gian Done thực chất chính là THỜI ĐIỂM THU NGÂN IN BILL THANH TOÁN (sau 1 - 3 tiếng khách ngồi ăn), dẫn đến KDS tính độ trễ oan uổng cho nhà hàng!\n"
                        f"3. NGUỒN GỐC TÊN '{sample_grp}': Tên nhóm này do cấu hình đồng bộ mặc định (nhóm ALL) từ GPOS/RK7 sinh ra khi nạp thực đơn vào CONFIG_COOKING mà chưa được phân quầy.\n"
                        f"💡 HƯỚNG XỬ LÝ TRIỆT ĐỂ:\n"
                        f"- Nếu đây là món KHÔNG CẦN CHẾ BIẾN (Vé Buffet, Nước ngọt lon, Khăn lạnh...): Nhấn nút '🗑️ Gỡ Khỏi KDS' để xóa khỏi CONFIG_COOKING. Món sẽ không bao giờ bị đưa vào KDS hay phạt trễ nữa!\n"
                        f"- Nếu đây là món CẦN CHẾ BIẾN: Nhấn nút 'Gán Quầy' hoặc '⚡ Đồng Nhất Nhóm Bếp Theo Quầy' để phân bổ về đúng quầy và tài khoản tablet tương ứng."
                    )
                elif unassigned_count > 0 and assigned_count > 0:
                    analysis_parts.append(
                        f"🔍 PHÁT HIỆN BIẾN ĐỘNG CẤU HÌNH QUẦY: Món này có {assigned_count} lần từng được gán vào quầy cụ thể "
                        f"và {unassigned_count} lần bị bỏ trống quầy (placeIds: []).\n"
                        f"Khi placeIds bị rỗng, đầu bếp tại trạm con không nhận được món, và món chỉ được Auto-Done khi thu ngân đóng bàn thanh toán trên POS!"
                    )
                else:
                    analysis_parts.append(
                        f"ℹ️ Lịch sử ghi nhận món luôn được gán vào quầy cụ thể ({', '.join(set(t.place_name for t in timeline))})."
                    )

            if is_hidden:
                analysis_parts.append("👁️ TRẠNG THÁI ẨN/HIỆN: Món hiện đang được đặt cờ ẨN trên hệ thống (QR-Order/CO/SO).")
            if is_out_of_stock:
                analysis_parts.append("📦 TRẠNG THÁI HẾT MÓN: Món đang được đánh dấu BÁO HẾT (Out of Dish) tại nhà hàng.")

            smart_analysis_text = "\n\n".join(analysis_parts)

            return KdsDishHistoryResponse(
                success=True,
                dish_name=d_name or f"Món {item_code}",
                item_code=item_code,
                sap_code=sap_code,
                is_in_config_cooking=is_in_cfg,
                current_place_ids=cur_pids,
                current_place_names=cur_names,
                current_group_name=cur_grp,
                current_config_minutes=cur_cfg_mins,
                is_hidden=is_hidden,
                is_out_of_stock=is_out_of_stock,
                total_timeline_orders=len(timeline),
                timeline=timeline,
                smart_analysis=smart_analysis_text,
                message=f"Đã tra cứu thành công lịch sử món {item_code} ({len(timeline)} lần order)."
            )
        finally:
            client.close()

    @staticmethod
    def update_kds_place_printer(
        current_user: UserInfo,
        payload: KdsUpdatePlacePrinterRequest,
        db: Optional[Session] = None
    ) -> KdsUpdatePlacePrinterResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]

            prn = payload.printer.strip()
            # 1. Update in CONFIG_KDS.places where id = payload.place_id
            kds_col.update_one(
                {"places.id": payload.place_id},
                {"$set": {"places.$.printer": prn, "places.$.driverName": prn}}
            )

            # 2. Update in ACCOUNT.listPlace where id = payload.place_id
            acc_col.update_many(
                {"listPlace.id": payload.place_id},
                {"$set": {"listPlace.$.printer": prn, "listPlace.$.driverName": prn}}
            )

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="UPDATE_KDS_PLACE_PRINTER",
                        TARGET_OBJECT=f"CONFIG_KDS:place_{payload.place_id}",
                        DESCRIPTION=f"Cập nhật máy in quầy ID {payload.place_id} thành '{prn}' trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "place_id": {payload.place_id}, "printer": "{prn}"}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsUpdatePlacePrinterResponse(
                success=True,
                place_id=payload.place_id,
                printer=prn,
                message=f"Đã cập nhật máy in cho quầy ID {payload.place_id} thành '{prn}' thành công!"
            )
        finally:
            client.close()

    @staticmethod
    def rename_kds_place(
        current_user: UserInfo,
        payload: KdsRenamePlaceRequest,
        db=None
    ) -> KdsRenamePlaceResponse:
        """
        Đổi tên quầy KDS: cập nhật name + placeCode trong CONFIG_KDS.places
        và đồng bộ sang tất cả ACCOUNT.listPlace và accName của tài khoản quầy con.
        """
        if payload.place_id == 0:
            raise ValueError("Không được phép đổi tên quầy FOODCONTROL (ID=0)!")

        new_name = payload.new_name.strip()
        if not new_name:
            raise ValueError("Tên quầy mới không được để trống!")

        # placeCode = tên quầy dạng UPPER_CASE không dấu (hoặc chỉ lấy tên viết hoa)
        import unicodedata, re
        def _to_code(s: str) -> str:
            nfkd = unicodedata.normalize("NFKD", s)
            ascii_str = nfkd.encode("ascii", "ignore").decode("ascii")
            return re.sub(r"[^A-Z0-9]+", "_", ascii_str.upper()).strip("_")

        new_place_code = _to_code(new_name)

        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]

            # 1. Lấy thông tin quầy hiện tại
            kds_doc = kds_col.find_one() or {}
            raw_places = kds_doc.get("places") or []
            target_place = next(
                (p for p in raw_places if isinstance(p, dict) and p.get("id") == payload.place_id),
                None
            )
            if not target_place:
                raise ValueError(f"Không tìm thấy quầy ID {payload.place_id} trong CONFIG_KDS!")

            old_name = target_place.get("name", "")
            old_code = target_place.get("placeCode", "")

            # 2. Cập nhật trong CONFIG_KDS.places
            kds_col.update_one(
                {"places.id": payload.place_id},
                {"$set": {"places.$.name": new_name, "places.$.placeCode": new_place_code}}
            )

            # 3. Đồng bộ listPlace trong tất cả ACCOUNT (tên + placeCode)
            acc_col.update_many(
                {"listPlace.id": payload.place_id},
                {"$set": {"listPlace.$.name": new_name, "listPlace.$.placeCode": new_place_code}}
            )

            # 4. Đổi accName của tài khoản quầy con (role=3) nếu khớp tên/mã cũ
            for old_val in {old_name, old_code}:
                if old_val:
                    acc_col.update_many(
                        {"role": 3, "accName": old_val},
                        {"$set": {"accName": new_name}}
                    )

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="RENAME_KDS_PLACE",
                        TARGET_OBJECT=f"CONFIG_KDS:place_{payload.place_id}",
                        DESCRIPTION=f"Đổi tên quầy KDS ID {payload.place_id}: '{old_name}' → '{new_name}' (placeCode: '{old_code}' → '{new_place_code}') trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "place_id": {payload.place_id}, "old_name": "{old_name}", "new_name": "{new_name}", "new_code": "{new_place_code}"}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsRenamePlaceResponse(
                success=True,
                place_id=payload.place_id,
                old_name=old_name,
                new_name=new_name,
                new_place_code=new_place_code,
                message=f"Đã đổi tên quầy '{old_name}' → '{new_name}' (mã: {new_place_code}) và đồng bộ tất cả liên kết thành công!"
            )
        finally:
            client.close()

    @staticmethod
    def delete_kds_quay(
        current_user: UserInfo,
        payload: KdsPlaceDeleteRequest,
        db: Optional[Session] = None
    ) -> KdsPlaceDeleteResponse:
        if payload.place_id <= 0:
            raise ValueError("Không được phép xóa quầy FOODCONTROL (ID=0) vì đây là quầy tổng điều phối của hệ thống!")

        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]
            cook_col = db_kitchen["CONFIG_COOKING"]

            # 1. Lấy thông tin quầy trước khi xóa để hiển thị và ghi log
            kds_doc = kds_col.find_one() or {}
            raw_places = kds_doc.get("places") or []
            target_place = next((p for p in raw_places if isinstance(p, dict) and p.get("id") == payload.place_id), None)
            place_name = target_place.get("name", "") if target_place else f"Quầy #{payload.place_id}"
            place_code = target_place.get("placeCode", "") if target_place else ""

            # 2. Xóa quầy khỏi mảng places trong CONFIG_KDS
            kds_col.update_one(
                {},
                {"$pull": {"places": {"id": payload.place_id}}}
            )

            # 3. Gỡ quầy khỏi listPlace của tất cả ACCOUNT (kể cả Food control và các tài khoản khác)
            acc_col.update_many(
                {},
                {"$pull": {"listPlace": {"id": payload.place_id}}}
            )

            # 4. Xóa tài khoản trạm riêng tương ứng của quầy này (role: 3)
            # Tiêu chí: role 3 và (listPlace rỗng sau khi pull HOẶC accName khớp tên quầy / mã quầy)
            acc_filter: Dict[str, Any] = {
                "role": 3,
                "$or": [
                    {"listPlace": {"$size": 0}},
                    {"accName": place_name}
                ]
            }
            if place_code:
                acc_filter["$or"].append({"accName": place_code})
            acc_del_res = acc_col.delete_many(acc_filter)

            # 5. Gỡ quầy khỏi tất cả các món ăn trong CONFIG_COOKING
            cook_res_int = cook_col.update_many(
                {"placeIds": payload.place_id},
                {"$pull": {"placeIds": payload.place_id}}
            )
            cook_res_str = cook_col.update_many(
                {"placeIds": str(payload.place_id)},
                {"$pull": {"placeIds": str(payload.place_id)}}
            )
            dishes_cleared_count = cook_res_int.modified_count + cook_res_str.modified_count

            # 6. Ghi AuditLog
            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="DELETE_KDS_QUAY",
                        TARGET_OBJECT=f"CONFIG_KDS:place_{payload.place_id}",
                        DESCRIPTION=f"Xóa vĩnh viễn quầy KDS ID {payload.place_id} ('{place_name}') trên {payload.host}:{payload.port}. Đã xóa {acc_del_res.deleted_count} tài khoản liên kết và gỡ khỏi {dishes_cleared_count} món ăn.",
                        DETAILS=f'{{"host": "{payload.host}", "place_id": {payload.place_id}, "place_name": "{place_name}", "deleted_accounts": {acc_del_res.deleted_count}, "dishes_cleared": {dishes_cleared_count}}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsPlaceDeleteResponse(
                success=True,
                place_id=payload.place_id,
                place_name=place_name,
                deleted_account=(acc_del_res.deleted_count > 0),
                dishes_cleared_count=dishes_cleared_count,
                message=f"Đã xóa hoàn toàn quầy '{place_name}' (ID: {payload.place_id}), xóa tài khoản KDS và gỡ khỏi {dishes_cleared_count} món ăn!"
            )
        finally:
            client.close()

    @staticmethod
    def toggle_kds_food_control(
        current_user: UserInfo,
        payload: KdsToggleFoodControlRequest,
        db: Optional[Session] = None
    ) -> KdsToggleFoodControlResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_kitchen = client["G_KITCHEN"]
            kds_col = db_kitchen["CONFIG_KDS"]
            acc_col = db_kitchen["ACCOUNT"]

            food_control_acc = acc_col.find_one({
                "$or": [
                    {"role": 2},
                    {"accId": "101"},
                    {"accName": {"$regex": "food.*control", "$options": "i"}}
                ]
            })
            if not food_control_acc:
                raise ValueError("Nhà hàng này không cấu hình tài khoản quầy tổng Food Control trong bảng ACCOUNT!")

            # Lấy thông tin quầy trong CONFIG_KDS
            kds_doc = kds_col.find_one() or {}
            raw_places = kds_doc.get("places") or []
            target_place = next((p for p in raw_places if isinstance(p, dict) and p.get("id") == payload.place_id), None)
            place_name = target_place.get("name", "") if target_place else f"Quầy #{payload.place_id}"
            place_code = target_place.get("placeCode", "") if target_place else ""
            printer = target_place.get("printer", "") if target_place else ""
            driver_name = target_place.get("driverName", printer) if target_place else printer

            if payload.action == "exclude":
                # Bỏ quầy ra khỏi listPlace của Food Control
                acc_col.update_one(
                    {"_id": food_control_acc["_id"]},
                    {"$pull": {"listPlace": {"id": payload.place_id}}}
                )
                # Cập nhật placeParent = "" trên tài khoản quầy con (role 3)
                acc_col.update_many(
                    {"listPlace.id": payload.place_id, "role": 3},
                    {"$set": {"placeParent": ""}}
                )
                msg = f"Đã chuyển quầy '{place_name}' (ID: {payload.place_id}) sang Chế độ Bếp đơn (1 bước - Không qua Food Control)!"
                new_state = False
            else:
                # Thêm quầy vào listPlace của Food Control
                fc_hall_plans = []
                for p in food_control_acc.get("listPlace") or []:
                    if isinstance(p, dict) and p.get("hallPlanIds"):
                        fc_hall_plans = list(p["hallPlanIds"])
                        break
                if not fc_hall_plans:
                    fc_hall_plans = target_place.get("hallPlanIds", []) if target_place else []

                # Xóa bản cũ nếu có rồi push bản mới vào listPlace của Food Control
                acc_col.update_one(
                    {"_id": food_control_acc["_id"]},
                    {"$pull": {"listPlace": {"id": payload.place_id}}}
                )
                fc_place_item = {
                    "id": payload.place_id,
                    "name": place_name,
                    "type": target_place.get("type", "BEP") if target_place else "BEP",
                    "hallPlanIds": fc_hall_plans,
                    "printer": printer,
                    "driverName": driver_name,
                    "placeCode": place_code
                }
                acc_col.update_one(
                    {"_id": food_control_acc["_id"]},
                    {"$push": {"listPlace": fc_place_item}}
                )
                # Cập nhật placeParent = 101 trên tài khoản quầy con (role 3)
                fc_acc_id = str(food_control_acc.get("accId", "101"))
                acc_col.update_many(
                    {"listPlace.id": payload.place_id, "role": 3},
                    {"$set": {"placeParent": fc_acc_id}}
                )
                msg = f"Đã chuyển quầy '{place_name}' (ID: {payload.place_id}) sang Chế độ 2 bước (Liên kết Bếp Tổng Food Control) thành công!"
                new_state = True

            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="TOGGLE_KDS_FOOD_CONTROL",
                        TARGET_OBJECT=f"ACCOUNT:Food_Control_place_{payload.place_id}",
                        DESCRIPTION=f"{msg} trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "place_id": {payload.place_id}, "action": "{payload.action}", "is_in_food_control": {str(new_state).lower()}}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsToggleFoodControlResponse(
                success=True,
                place_id=payload.place_id,
                place_name=place_name,
                is_in_food_control=new_state,
                message=msg
            )
        finally:
            client.close()

    @staticmethod
    def get_kds_role_users(
        host: str,
        port: int = 27017,
        restaurant_code: Optional[str] = None,
        search: Optional[str] = None,
        param_code: str = "ROLE_SETUP_CONFIG_COOKING"
    ) -> KdsRoleUsersResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        try:
            target_param = param_code or "ROLE_SETUP_CONFIG_COOKING"
            db_order = client["G_ORDER"]
            param_doc = db_order["APP_PARAM"].find_one({"paramCode": target_param})
            raw_val = (param_doc.get("value", "") or "") if param_doc else ""
            raw_codes = [x.strip() for x in raw_val.split(",") if x.strip() and x.strip() != "0"]
            default_st = 0 if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else 1
            status_val = int(param_doc.get("status", default_st)) if param_doc else default_st
            is_enabled = bool(status_val == 1)

            # Giữ thứ tự nhưng loại bỏ trùng lặp
            seen = set()
            unique_codes = []
            for c in raw_codes:
                if c not in seen:
                    seen.add(c)
                    unique_codes.append(c)

            # 1. Phát hiện danh sách nhân viên thực tế của NHÀ HÀNG NÀY
            res_employees_map: Dict[str, Dict[str, Any]] = {}
            try:
                # Từ LOCK_ORDER
                for doc in db_order["LOCK_ORDER"].find():
                    c = str(doc.get("userCode") or "").strip()
                    n = str(doc.get("userName") or "").strip()
                    if c:
                        res_employees_map[c] = {"code": c, "name": n}

                # Từ isLogin == True trong EMPLOYEE
                for doc in db_order["EMPLOYEE"].find({"isLogin": {"$in": [True, 1, "1", "true", "True"]}}):
                    c = str(doc.get("code") or "").strip()
                    n = str(doc.get("name") or "").strip()
                    if c:
                        res_employees_map[c] = {"code": c, "name": n}

                # Từ 100 ORDER gần đây (waiter)
                for doc in db_order["ORDER"].find().sort("_id", -1).limit(100):
                    w = doc.get("waiter")
                    if isinstance(w, dict) and w.get("code"):
                        c = str(w.get("code")).strip()
                        n = str(w.get("name")).strip()
                        if c and c not in res_employees_map:
                            res_employees_map[c] = {"code": c, "name": n}

                # Nếu có tìm kiếm từ người dùng, tìm thêm từ EMPLOYEE
                if search and len(search.strip()) >= 1:
                    s_trim = search.strip()
                    search_filter = {
                        "$or": [
                            {"code": {"$regex": s_trim, "$options": "i"}},
                            {"name": {"$regex": s_trim, "$options": "i"}}
                        ]
                    }
                    for ed in db_order["EMPLOYEE"].find(search_filter).limit(30):
                        c = str(ed.get("code") or "").strip()
                        n = str(ed.get("name") or "").strip()
                        if c and c not in res_employees_map:
                            res_employees_map[c] = {"code": c, "name": n}

            except Exception:
                pass

            # Bổ sung thông tin chi tiết từ EMPLOYEE
            restaurant_users_list: List[KdsRoleUserItem] = []
            for c, info in res_employees_map.items():
                emp = db_order["EMPLOYEE"].find_one({"$or": [{"code": c}, {"id": int(c) if c.isdigit() else -1}]})
                emp_name = (emp.get("name") if emp else None) or info.get("name") or f"Nhân viên #{c}"
                st_int = emp.get("status") if emp else None
                st_desc = "Hoạt động" if st_int == 3 else ("Khóa" if st_int == 0 else f"Trạng thái {st_int}")
                in_role = (c in seen)

                restaurant_users_list.append(KdsRoleUserItem(
                    user_code=c,
                    employee_id=emp.get("id") if emp else None,
                    employee_name=emp_name,
                    status=st_int,
                    status_desc=st_desc,
                    is_in_role=in_role
                ))

            # Sắp xếp: user có quyền lên trước, sau đó theo mã
            restaurant_users_list.sort(key=lambda x: (not x.is_in_role, x.user_code))

            show_kds_st = 1
            show_kds_en = True
            try:
                show_kds_doc = db_order["APP_PARAM"].find_one({"paramCode": "SHOW_KDS"})
                if show_kds_doc:
                    st = show_kds_doc.get("status")
                    val = str(show_kds_doc.get("value", "")).strip()
                    show_kds_st = int(st) if st is not None else (1 if val == "1" else 0)
                    show_kds_en = (show_kds_st == 1 and val != "0")
            except Exception:
                pass

            allow_hide_st = 1
            allow_hide_en = True
            allow_hide_val = "1"
            try:
                ah_doc = db_order["APP_PARAM"].find_one({"paramCode": "ALLOW_HIDE_ITEM_GROUP"})
                if ah_doc:
                    st = ah_doc.get("status")
                    val = str(ah_doc.get("value", "")).strip()
                    allow_hide_val = val
                    allow_hide_st = int(st) if st is not None else (1 if val == "1" else 0)
                    allow_hide_en = (allow_hide_st == 1 and val != "0")
            except Exception:
                pass

            p_type = param_doc.get("paramType", "CONFIG") if param_doc else "CONFIG"
            p_name = param_doc.get("paramName", target_param) if param_doc else target_param
            p_note = param_doc.get("note", "") if param_doc else ""

            return KdsRoleUsersResponse(
                param_code=target_param,
                param_name=p_name,
                param_type=p_type,
                status=status_val,
                is_enabled=is_enabled,
                raw_value=raw_val,
                total_users=len(unique_codes),
                note=p_note,
                show_kds_status=show_kds_st,
                show_kds_enabled=show_kds_en,
                allow_hide_item_group_status=allow_hide_st,
                allow_hide_item_group_enabled=allow_hide_en,
                allow_hide_item_group_value=allow_hide_val,
                restaurant_users=restaurant_users_list,
                authorized_users=[],
                available_employees=[]
            )
        finally:
            client.close()

    @staticmethod
    def toggle_kds_role_status(
        payload: KdsRoleToggleStatusRequest,
        current_user: UserInfo,
        db: Optional[Session] = None
    ) -> KdsRoleUsersResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            target_param = payload.param_code or "ROLE_SETUP_CONFIG_COOKING"
            db_order = client["G_ORDER"]
            param_col = db_order["APP_PARAM"]
            param_doc = param_col.find_one({"paramCode": target_param})
            if not param_doc:
                raise ValueError(f"Không tìm thấy tham số {target_param} trong bảng APP_PARAM của G_ORDER!")

            new_status = 1 if payload.status == 1 else 0
            param_col.update_one(
                {"_id": param_doc["_id"]},
                {"$set": {"status": new_status}}
            )

            st_text = "Bật (1)" if new_status == 1 else "Tắt (0)"
            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="TOGGLE_KDS_ROLE_STATUS",
                        TARGET_OBJECT=f"APP_PARAM:{target_param}",
                        DESCRIPTION=f"Đổi trạng thái {target_param} sang {st_text} trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "status": {new_status}, "param": "{target_param}"}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return MongoDBService.get_kds_role_users(payload.host, payload.port, param_code=target_param)
        finally:
            client.close()

    @staticmethod
    def get_kds_master_status(host: str, port: int = 27017) -> KdsMasterStatusResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            param_col = db_order["APP_PARAM"]
            doc = param_col.find_one({"paramCode": "SHOW_KDS"})
            if not doc:
                return KdsMasterStatusResponse(
                    host=host,
                    port=port,
                    param_code="SHOW_KDS",
                    param_name="SHOW_KDS",
                    param_type="FUNCTION",
                    status=1,
                    value="1",
                    is_enabled=True,
                    note="SHOW_KDS"
                )
            st = doc.get("status")
            val = str(doc.get("value", "")).strip()
            st_int = int(st) if st is not None else (1 if val == "1" else 0)
            is_en = (st_int == 1 and val != "0")
            return KdsMasterStatusResponse(
                host=host,
                port=port,
                param_code="SHOW_KDS",
                param_name=doc.get("paramName", "SHOW_KDS"),
                param_type=doc.get("paramType", "FUNCTION"),
                status=st_int,
                value=val,
                is_enabled=is_en,
                note=doc.get("note", "SHOW_KDS")
            )
        finally:
            client.close()

    @staticmethod
    def toggle_kds_master_status(
        payload: KdsMasterStatusToggleRequest,
        current_user: UserInfo,
        db: Optional[Session] = None
    ) -> KdsMasterStatusResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            param_col = db_order["APP_PARAM"]
            param_doc = param_col.find_one({"paramCode": "SHOW_KDS"})

            new_status = 1 if payload.status == 1 else 0
            new_value = "1" if new_status == 1 else "0"

            if param_doc:
                param_col.update_one(
                    {"_id": param_doc["_id"]},
                    {"$set": {"status": new_status, "value": new_value}}
                )
            else:
                param_col.insert_one({
                    "paramCode": "SHOW_KDS",
                    "paramName": "SHOW_KDS",
                    "paramType": "FUNCTION",
                    "status": new_status,
                    "value": new_value,
                    "note": "SHOW_KDS",
                    "checkTimeRange": 0
                })

            st_text = "Bật (1)" if new_status == 1 else "Tắt (0)"
            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="TOGGLE_SHOW_KDS",
                        TARGET_OBJECT="APP_PARAM:SHOW_KDS",
                        DESCRIPTION=f"Đổi trạng thái SHOW_KDS (Bật/Tắt hoàn toàn KDS) sang {st_text} trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "status": {new_status}, "value": "{new_value}", "param": "SHOW_KDS"}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            res = MongoDBService.get_kds_master_status(payload.host, payload.port)
            res.message = f"Đã {st_text} thành công tham số SHOW_KDS!"
            return res
        finally:
            client.close()

    @staticmethod
    def toggle_allow_hide_item_group(
        payload: KdsMasterStatusToggleRequest,
        current_user: UserInfo,
        db: Optional[Session] = None
    ) -> KdsMasterStatusResponse:
        """
        Bật (status=1, value="1") hoặc Tắt (status=0, value="0") tham số ALLOW_HIDE_ITEM_GROUP trong G_ORDER.APP_PARAM.
        Quyết định quyền thấy món đang hiện / cho phép ẩn món theo nhóm trên thiết bị tablet nhà hàng.
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            param_col = db_order["APP_PARAM"]
            param_doc = param_col.find_one({"paramCode": "ALLOW_HIDE_ITEM_GROUP"})

            new_status = 1 if payload.status == 1 else 0
            new_value = "1" if new_status == 1 else "0"

            if param_doc:
                param_col.update_one(
                    {"_id": param_doc["_id"]},
                    {"$set": {"status": new_status, "value": new_value}}
                )
            else:
                param_col.insert_one({
                    "paramCode": "ALLOW_HIDE_ITEM_GROUP",
                    "paramName": "ALLOW_HIDE_ITEM_GROUP",
                    "paramType": "FUNCTION",
                    "status": new_status,
                    "value": new_value,
                    "note": "Quyền thấy món đang hiện",
                    "checkTimeRange": 0
                })

            st_text = "Bật (1 - Cho phép ẩn món theo nhóm)" if new_status == 1 else "Tắt (0 - Tắt hết món không cho ẩn)"
            if db:
                try:
                    log_entry = AuditLog(
                        USER_ACTION=current_user.username,
                        ACTION_TYPE="TOGGLE_ALLOW_HIDE_ITEM_GROUP",
                        TARGET_OBJECT="APP_PARAM:ALLOW_HIDE_ITEM_GROUP",
                        DESCRIPTION=f"Đổi trạng thái ALLOW_HIDE_ITEM_GROUP sang {st_text} trên {payload.host}:{payload.port}",
                        DETAILS=f'{{"host": "{payload.host}", "status": {new_status}, "value": "{new_value}", "param": "ALLOW_HIDE_ITEM_GROUP"}}',
                        DATE_ACTION=datetime.datetime.now(),
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception:
                    pass

            return KdsMasterStatusResponse(
                host=payload.host,
                port=payload.port,
                param_code="ALLOW_HIDE_ITEM_GROUP",
                param_name="ALLOW_HIDE_ITEM_GROUP",
                param_type="FUNCTION",
                status=new_status,
                value=new_value,
                is_enabled=bool(new_status == 1),
                note="Quyền thấy món đang hiện",
                message=f"Đã {st_text} thành công tham số ALLOW_HIDE_ITEM_GROUP!"
            )
        finally:
            client.close()

    @staticmethod
    def add_kds_role_user(
        payload: KdsRoleUserActionRequest,
        current_user: UserInfo,
        db: Optional[Session] = None
    ) -> KdsRoleUsersResponse:
        user_codes_to_add: List[str] = []
        if payload.user_codes:
            for uc in payload.user_codes:
                u_str = str(uc).strip()
                if u_str and u_str not in user_codes_to_add:
                    user_codes_to_add.append(u_str)
        if payload.user_code and str(payload.user_code).strip():
            u_str = str(payload.user_code).strip()
            if u_str not in user_codes_to_add:
                user_codes_to_add.append(u_str)
        if not user_codes_to_add:
            raise ValueError("Mã nhân viên / user code không được để trống!")

        target_param = payload.param_code or "ROLE_SETUP_CONFIG_COOKING"
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            param_col = db_order["APP_PARAM"]
            param_doc = param_col.find_one({"paramCode": target_param})
            if not param_doc:
                default_st = 0 if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else 1
                param_name = "Phân quyền ẩn hiện món" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else "Cấu hình KDS"
                param_col.insert_one({
                    "paramCode": target_param,
                    "paramName": param_name,
                    "paramType": "FUNCTION" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else "CONFIG",
                    "status": default_st,
                    "value": "0" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else ""
                })
                param_doc = param_col.find_one({"paramCode": target_param})

            raw_val = param_doc.get("value", "") or ""
            codes = [x.strip() for x in raw_val.split(",") if x.strip() and x.strip() != "0"]
            has_change = False
            for uc in user_codes_to_add:
                if uc not in codes:
                    codes.append(uc)
                    has_change = True

            if has_change:
                new_val = ",".join(codes)
                param_col.update_one(
                    {"_id": param_doc["_id"]},
                    {"$set": {"value": new_val}}
                )

                if db:
                    try:
                        codes_display = ", ".join(user_codes_to_add)
                        log_entry = AuditLog(
                            USER_ACTION=current_user.username,
                            ACTION_TYPE="ADD_KDS_ROLE_USER",
                            TARGET_OBJECT=f"APP_PARAM:{target_param}:{codes_display}",
                            DESCRIPTION=f"Thêm mã nhân viên '{codes_display}' vào tham số {target_param} trên {payload.host}:{payload.port}",
                            DETAILS=f'{{"host": "{payload.host}", "user_codes": "{codes_display}", "param": "{target_param}"}}',
                            DATE_ACTION=datetime.datetime.now(),
                        )
                        db.add(log_entry)
                        db.commit()
                    except Exception:
                        pass

            return MongoDBService.get_kds_role_users(payload.host, payload.port, param_code=target_param)
        finally:
            client.close()

    @staticmethod
    def remove_kds_role_user(
        payload: KdsRoleUserActionRequest,
        current_user: UserInfo,
        db: Optional[Session] = None
    ) -> KdsRoleUsersResponse:
        user_codes_to_remove = set()
        if payload.user_codes:
            for uc in payload.user_codes:
                u_str = str(uc).strip()
                if u_str:
                    user_codes_to_remove.add(u_str)
        if payload.user_code and str(payload.user_code).strip():
            user_codes_to_remove.add(str(payload.user_code).strip())
        if not user_codes_to_remove:
            raise ValueError("Mã nhân viên / user code không được để trống!")

        target_param = payload.param_code or "ROLE_SETUP_CONFIG_COOKING"
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            param_col = db_order["APP_PARAM"]
            param_doc = param_col.find_one({"paramCode": target_param})
            if not param_doc:
                raise ValueError(f"Không tìm thấy tham số {target_param} trong bảng APP_PARAM của G_ORDER!")

            raw_val = param_doc.get("value", "") or ""
            codes = [x.strip() for x in raw_val.split(",") if x.strip() and x.strip() != "0"]
            new_codes = [c for c in codes if c not in user_codes_to_remove]
            if len(new_codes) != len(codes):
                new_val = ",".join(new_codes) if new_codes else ("0" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else "")
                param_col.update_one(
                    {"_id": param_doc["_id"]},
                    {"$set": {"value": new_val}}
                )

                if db:
                    try:
                        codes_display = ", ".join(user_codes_to_remove)
                        log_entry = AuditLog(
                            USER_ACTION=current_user.username,
                            ACTION_TYPE="REMOVE_KDS_ROLE_USER",
                            TARGET_OBJECT=f"APP_PARAM:{target_param}:{codes_display}",
                            DESCRIPTION=f"Xóa mã nhân viên '{codes_display}' khỏi tham số {target_param} trên {payload.host}:{payload.port}",
                            DETAILS=f'{{"host": "{payload.host}", "user_codes": "{codes_display}", "param": "{target_param}"}}',
                            DATE_ACTION=datetime.datetime.now(),
                        )
                        db.add(log_entry)
                        db.commit()
                    except Exception:
                        pass

            return MongoDBService.get_kds_role_users(payload.host, payload.port, param_code=target_param)
        finally:
            client.close()

    @classmethod
    async def execute_batch_role_user_action(
        cls,
        payload: BatchRoleUserActionRequest,
        current_user: UserInfo,
        db: Session
    ) -> BatchRoleUserActionResponse:
        """
        Thực thi cấu hình phân quyền (ROLE_SETUP_SHOW_HIDE_ITEM hoặc ROLE_SETUP_CONFIG_COOKING)
        hàng loạt cho danh sách nhiều nhà hàng:
        - status_action: "ENABLE" (1) | "DISABLE" (0) | "KEEP"
        - user_action: "NONE" | "APPEND" | "REPLACE" | "REMOVE"
        - user_codes: danh sách mã user cần áp dụng
        """
        from app.models.restaurant import Restaurant

        target_param = payload.param_code or "ROLE_SETUP_SHOW_HIDE_ITEM"
        restaurants = db.query(Restaurant).filter(Restaurant.id.in_(payload.restaurant_ids)).all()
        rest_map = {r.id: r for r in restaurants}

        input_user_codes = [str(u).strip() for u in (payload.user_codes or []) if str(u).strip() and str(u).strip() != "0"]

        semaphore = asyncio.Semaphore(15)

        async def _process_restaurant(rest_id: int) -> BatchRoleUserRestaurantResult:
            async with semaphore:
                r = rest_map.get(rest_id)
                if not r:
                    return BatchRoleUserRestaurantResult(
                        restaurant_id=rest_id,
                        status="FAILED",
                        message=f"Không tìm thấy nhà hàng ID {rest_id} trong hệ thống"
                    )

                rest_sap = r.sap or ""
                rest_name = r.res or ""
                raw_ip = (r.ip or "").strip()

                if not raw_ip:
                    return BatchRoleUserRestaurantResult(
                        restaurant_id=rest_id,
                        restaurant_sap=rest_sap,
                        restaurant_name=rest_name,
                        status="SKIPPED",
                        message="Nhà hàng chưa có IP trong cơ sở dữ liệu"
                    )

                # Xác định dải IP MongoDB candidates (.11, .12, .41)
                parts = raw_ip.split(".")
                if len(parts) >= 3:
                    prefix = f"{parts[0]}.{parts[1]}.{parts[2]}."
                    candidates = [f"{prefix}11", f"{prefix}12", f"{prefix}41"]
                else:
                    candidates = [raw_ip]

                # Quét TCP socket song song để tìm host mở MongoDB port 27017
                loop = asyncio.get_running_loop()
                tcp_tasks = [loop.run_in_executor(None, _check_tcp_port, ip, 27017, 1.2) for ip in candidates]
                tcp_results = await asyncio.gather(*tcp_tasks, return_exceptions=True)

                open_host = None
                for c_ip, is_open in zip(candidates, tcp_results):
                    if is_open is True:
                        open_host = c_ip
                        break

                if not open_host:
                    return BatchRoleUserRestaurantResult(
                        restaurant_id=rest_id,
                        restaurant_sap=rest_sap,
                        restaurant_name=rest_name,
                        status="SKIPPED",
                        message=f"Không kết nối được MongoDB trên các máy ({', '.join(candidates)}:27017)"
                    )

                # Thực thi trên open_host
                def _do_mongo_work():
                    client = MongoClient(open_host, 27017, serverSelectionTimeoutMS=3500)
                    try:
                        db_order = client["G_ORDER"]
                        param_col = db_order["APP_PARAM"]
                        param_doc = param_col.find_one({"paramCode": target_param})
                        if not param_doc:
                            default_st = 0 if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else 1
                            param_name = "Phân quyền ẩn hiện món" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else "Cấu hình KDS"
                            param_col.insert_one({
                                "paramCode": target_param,
                                "paramName": param_name,
                                "paramType": "FUNCTION" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else "CONFIG",
                                "status": default_st,
                                "value": "0" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else ""
                            })
                            param_doc = param_col.find_one({"paramCode": target_param})

                        old_status = int(param_doc.get("status", 0)) if param_doc else 0
                        old_raw_val = (param_doc.get("value", "") or "") if param_doc else ""
                        old_codes = [x.strip() for x in old_raw_val.split(",") if x.strip() and x.strip() != "0"]

                        # 1. Tính toán Status mới
                        if payload.status_action == "ENABLE":
                            new_status = 1
                        elif payload.status_action == "DISABLE":
                            new_status = 0
                        else:
                            new_status = old_status

                        # 2. Tính toán User codes mới
                        if payload.user_action == "APPEND":
                            new_codes = list(dict.fromkeys(old_codes + input_user_codes))
                        elif payload.user_action == "REPLACE":
                            new_codes = list(dict.fromkeys(input_user_codes))
                        elif payload.user_action == "REMOVE":
                            remove_set = set(input_user_codes)
                            new_codes = [c for c in old_codes if c not in remove_set]
                        else:
                            new_codes = old_codes

                        new_val = ",".join(new_codes) if new_codes else ("0" if target_param == "ROLE_SETUP_SHOW_HIDE_ITEM" else "")

                        param_col.update_one(
                            {"paramCode": target_param},
                            {"$set": {"status": new_status, "value": new_val}}
                        )

                        return (True, old_status, new_status, len(old_codes), len(new_codes), new_val, None)
                    except Exception as ex:
                        return (False, None, None, 0, 0, "", str(ex))
                    finally:
                        client.close()

                ok, old_st, new_st, old_cnt, new_cnt, raw_val_res, err_msg = await loop.run_in_executor(None, _do_mongo_work)

                if ok:
                    st_text = f"Status: {old_st} -> {new_st}" if old_st != new_st else f"Status: {new_st}"
                    user_text = f"Users: {old_cnt} -> {new_cnt}" if payload.user_action != "NONE" else f"Users: {new_cnt}"
                    return BatchRoleUserRestaurantResult(
                        restaurant_id=rest_id,
                        restaurant_sap=rest_sap,
                        restaurant_name=rest_name,
                        host=open_host,
                        status="SUCCESS",
                        message=f"Thành công ({st_text}, {user_text})",
                        old_status=old_st,
                        new_status=new_st,
                        old_users_count=old_cnt,
                        new_users_count=new_cnt,
                        raw_value=raw_val_res
                    )
                else:
                    return BatchRoleUserRestaurantResult(
                        restaurant_id=rest_id,
                        restaurant_sap=rest_sap,
                        restaurant_name=rest_name,
                        host=open_host,
                        status="FAILED",
                        message=f"Lỗi ghi MongoDB: {err_msg}"
                    )

        # Chạy đồng thời cho danh sách restaurant_ids
        tasks = [_process_restaurant(rid) for rid in payload.restaurant_ids]
        items = await asyncio.gather(*tasks)

        success_count = sum(1 for it in items if it.status == "SUCCESS")
        failed_count = sum(1 for it in items if it.status != "SUCCESS")

        # Ghi AuditLog
        try:
            log_entry = AuditLog(
                USER_ACTION=current_user.username,
                ACTION_TYPE="BATCH_ROLE_USER_ACTION",
                TARGET_OBJECT=f"APP_PARAM:{target_param}",
                DESCRIPTION=f"Thực thi hàng loạt cấu hình {target_param} ({payload.status_action}, user_action={payload.user_action}) cho {len(items)} nhà hàng (Thành công: {success_count}, Thất bại/Bỏ qua: {failed_count})",
                DETAILS=f'{{"total": {len(items)}, "success": {success_count}, "failed": {failed_count}, "param": "{target_param}"}}',
                DATE_ACTION=datetime.datetime.now(),
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            pass

        return BatchRoleUserActionResponse(
            total_requested=len(payload.restaurant_ids),
            total_processed=len(items),
            success_count=success_count,
            failed_count=failed_count,
            param_code=target_param,
            status_action=payload.status_action,
            user_action=payload.user_action,
            items=items
        )

    @staticmethod
    def get_master_data_sync_logs(
        host: str,
        port: int = 27017,
        db_name: str = "G_ORDER",
        search: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        limit: int = 200
    ) -> MasterDataSyncLogResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        db_list = client.list_database_names()
        available_dbs = [d for d in ["G_ORDER", "G_KITCHEN"] if d in db_list]

        target_db = db_name if db_name in available_dbs else (available_dbs[0] if available_dbs else "G_ORDER")
        col = client[target_db]["MASTER_DATA_SYNC_LOG"]

        total_records = col.estimated_document_count()

        query: Dict[str, Any] = {}
        if from_date or to_date:
            date_filter: Dict[str, Any] = {}
            if from_date:
                try:
                    dt_from = datetime.datetime.strptime(from_date, "%Y-%m-%d")
                    date_filter["$gte"] = int(dt_from.timestamp() * 1000)
                except Exception:
                    pass
            if to_date:
                try:
                    dt_to = datetime.datetime.strptime(to_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, microsecond=999000)
                    date_filter["$lte"] = int(dt_to.timestamp() * 1000)
                except Exception:
                    pass
            if date_filter:
                query["date"] = date_filter

        # Fetch sorted by date desc or _id desc
        cursor = col.find(query).sort("date", -1).limit(limit)
        raw_docs = list(cursor)
        client.close()

        items: List[MasterDataSyncLogItem] = []
        success_count = 0
        error_count = 0
        latest_time = None
        latest_status = None

        now = datetime.datetime.now()

        for doc in raw_docs:
            rec_id = doc.get("id")
            collection_name = str(doc.get("collection") or "")
            raw_date = doc.get("date")
            log_mess = str(doc.get("logMess") or "")
            is_success = log_mess.upper() == "SUCCESS"
            if is_success:
                success_count += 1
            else:
                error_count += 1

            dt_formatted = ""
            time_ago = ""
            if raw_date is not None:
                try:
                    sec = raw_date / 1000.0 if raw_date > 1e11 else float(raw_date)
                    dt_obj = datetime.datetime.fromtimestamp(sec)
                    dt_formatted = dt_obj.strftime("%d/%m/%Y %H:%M:%S")
                    diff_sec = int((now - dt_obj).total_seconds())
                    if diff_sec < 0:
                        time_ago = "Vừa xong"
                    elif diff_sec < 60:
                        time_ago = f"{diff_sec} giây trước"
                    elif diff_sec < 3600:
                        time_ago = f"{diff_sec // 60} phút trước"
                    elif diff_sec < 86400:
                        time_ago = f"{diff_sec // 3600} giờ trước"
                    elif diff_sec < 86400 * 30:
                        time_ago = f"{diff_sec // 86400} ngày trước"
                    else:
                        time_ago = f"{diff_sec // (86400 * 30)} tháng trước"
                except Exception:
                    dt_formatted = str(raw_date)

            if latest_time is None and dt_formatted:
                latest_time = dt_formatted
                latest_status = log_mess

            total_time_val = doc.get("totalTime")
            if total_time_val is not None:
                try:
                    ms_val = int(total_time_val)
                    if ms_val < 1000:
                        time_disp = f"{ms_val} ms"
                    else:
                        time_disp = f"{ms_val / 1000.0:.2f}s"
                except Exception:
                    time_disp = str(total_time_val)
            else:
                time_disp = "—"

            if search and search.strip():
                s = search.strip().lower()
                s_clean = _remove_vietnamese_tones(search)
                c_clean = _remove_vietnamese_tones(collection_name)
                m_clean = _remove_vietnamese_tones(log_mess)
                if (s not in collection_name.lower() and
                    s_clean not in c_clean and
                    s not in log_mess.lower() and
                    s_clean not in m_clean and
                    s not in dt_formatted.lower() and
                    s not in str(rec_id or "").lower()):
                    continue

            items.append(MasterDataSyncLogItem(
                id=rec_id,
                collection=collection_name,
                date_timestamp=raw_date,
                date_formatted=dt_formatted,
                time_ago=time_ago,
                log_mess=log_mess,
                total_time_ms=total_time_val if isinstance(total_time_val, int) else None,
                total_time_display=time_disp,
                is_success=is_success
            ))

        return MasterDataSyncLogResponse(
            host=host,
            port=port,
            db_name=target_db,
            available_dbs=available_dbs,
            total_records=total_records,
            returned_records=len(items),
            latest_sync_time=latest_time,
            latest_sync_status=latest_status,
            success_count=success_count,
            error_count=error_count,
            items=items
        )

    @staticmethod
    def _natural_sort_key(s: str) -> list:
        return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', str(s or ''))]

    @classmethod
    def _serialize_mongo_doc(cls, doc: Any) -> Any:
        if isinstance(doc, dict):
            return {str(k): cls._serialize_mongo_doc(v) for k, v in doc.items()}
        elif isinstance(doc, list):
            return [cls._serialize_mongo_doc(x) for x in doc]
        elif hasattr(doc, "__str__") and type(doc).__name__ == "ObjectId":
            return str(doc)
        elif isinstance(doc, (datetime.datetime, datetime.date)):
            return doc.isoformat()
        return doc

    @staticmethod
    def get_database_overview(
        host: str,
        port: int = 27017,
        db_name: str = "G_ORDER"
    ) -> MongoDbOverviewResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        db_list = client.list_database_names()
        available_dbs = [d for d in ["G_ORDER", "G_KITCHEN"] if d in db_list]
        target_db = db_name if db_name in available_dbs else (available_dbs[0] if available_dbs else "G_ORDER")

        db = client[target_db]
        collections_names = sorted(db.list_collection_names())

        cols_info: List[MongoCollectionInfo] = []
        for c in collections_names:
            try:
                cnt = db[c].estimated_document_count()
            except Exception:
                cnt = -1
            sample_fields = []
            try:
                first_doc = db[c].find_one()
                if first_doc:
                    sample_fields = list(first_doc.keys())[:10]
            except Exception:
                pass
            cols_info.append(MongoCollectionInfo(name=c, count=cnt, sample_fields=sample_fields))

        client.close()
        return MongoDbOverviewResponse(
            host=host,
            port=port,
            db_name=target_db,
            available_dbs=available_dbs,
            collections=cols_info,
            total_collections=len(cols_info)
        )

    @classmethod
    def get_collection_preview(
        cls,
        host: str,
        port: int = 27017,
        db_name: str = "G_ORDER",
        collection_name: str = "TABLE",
        limit: int = 20
    ) -> MongoCollectionPreviewResponse:
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        db = client[db_name]
        col = db[collection_name]

        try:
            total_count = col.estimated_document_count()
        except Exception:
            total_count = col.count_documents({})

        raw_docs = list(col.find().limit(max(1, min(limit, 100))))
        client.close()

        docs = [cls._serialize_mongo_doc(d) for d in raw_docs]
        return MongoCollectionPreviewResponse(
            host=host,
            port=port,
            db_name=db_name,
            collection_name=collection_name,
            total_count=total_count,
            documents=docs
        )

    @classmethod
    def _fetch_single_restaurant_tables(
        cls,
        rest_info: Dict[str, Any],
        split_by_hall: bool
    ) -> List[TableReportItem]:
        rid = rest_info["id"]
        res_name = rest_info.get("res") or "N/A"
        sap = rest_info.get("sap") or "—"
        target_ip = rest_info.get("mongo_ip") or rest_info.get("ip")

        if not target_ip:
            return [TableReportItem(
                restaurant_id=rid,
                sap_code=sap,
                restaurant_name=res_name,
                mongo_ip="N/A",
                total_tables=0,
                hall_name="—",
                tables_sample="—",
                error="Không có IP kết nối"
            )]

        # Try connecting
        client = None
        working_ip = None
        candidate_ips = [target_ip]
        if "." in target_ip:
            subnet = cls.extract_subnet_prefix(target_ip)
            for sfx in ["41", "11", "12"]:
                cip = f"{subnet}{sfx}"
                if cip not in candidate_ips:
                    candidate_ips.append(cip)

        for ip in candidate_ips:
            try:
                c = MongoClient(ip, 27017, serverSelectionTimeoutMS=2000)
                c.admin.command("ping")
                client = c
                working_ip = ip
                break
            except Exception:
                pass

        if not client or not working_ip:
            return [TableReportItem(
                restaurant_id=rid,
                sap_code=sap,
                restaurant_name=res_name,
                mongo_ip=target_ip,
                total_tables=0,
                hall_name="—",
                tables_sample="—",
                error="Không kết nối được MongoDB"
            )]

        try:
            db = client["G_ORDER"]
            # 1. Hall plan lookup
            halls_cursor = db["HALL_PLAN"].find({"isCurrentRes": True})
            halls_map: Dict[int, str] = {}
            for h in halls_cursor:
                hid = h.get("id")
                hname = str(h.get("name") or "").strip()
                if hid is not None and hname:
                    halls_map[int(hid)] = hname

            # 2. Table lookup (only tables belonging to current restaurant)
            tables_cursor = list(db["TABLE"].find({"isCurrentRes": True}))
            client.close()

            if not tables_cursor:
                return [TableReportItem(
                    restaurant_id=rid,
                    sap_code=sap,
                    restaurant_name=res_name,
                    mongo_ip=working_ip,
                    total_tables=0,
                    hall_name="—",
                    tables_sample="—",
                    error="0 bàn (isCurrentRes: true)"
                )]

            if split_by_hall:
                # Group tables by hallPlanId
                hall_grouped: Dict[Optional[int], List[str]] = {}
                for t in tables_cursor:
                    h_id = t.get("hallPlanId")
                    h_id_key = int(h_id) if h_id is not None else None
                    t_name = str(t.get("name") or "").strip()
                    if t_name:
                        hall_grouped.setdefault(h_id_key, []).append(t_name)

                items: List[TableReportItem] = []
                for h_id_key, t_names in hall_grouped.items():
                    sorted_names = sorted(t_names, key=cls._natural_sort_key)
                    hall_label = halls_map.get(h_id_key, f"Khu {h_id_key}" if h_id_key else "Khu chung")
                    sample_str = ", ".join(sorted_names)
                    items.append(TableReportItem(
                        restaurant_id=rid,
                        sap_code=sap,
                        restaurant_name=res_name,
                        mongo_ip=working_ip,
                        total_tables=len(sorted_names),
                        hall_name=hall_label,
                        hall_id=h_id_key,
                        tables_sample=sample_str,
                        table_names=sorted_names
                    ))
                # Sort items by hall_name
                items.sort(key=lambda x: cls._natural_sort_key(x.hall_name))
                return items
            else:
                # Group all tables for this restaurant into one row
                all_names = sorted(
                    [str(t.get("name") or "").strip() for t in tables_cursor if t.get("name")],
                    key=cls._natural_sort_key
                )
                unique_halls = sorted(list(set(halls_map.values())), key=cls._natural_sort_key)
                hall_label = ", ".join(unique_halls) if unique_halls else "Khu chung"
                sample_str = ", ".join(all_names)
                return [TableReportItem(
                    restaurant_id=rid,
                    sap_code=sap,
                    restaurant_name=res_name,
                    mongo_ip=working_ip,
                    total_tables=len(all_names),
                    hall_name=hall_label,
                    tables_sample=sample_str,
                    table_names=all_names
                )]
        except Exception as e:
            if client:
                try:
                    client.close()
                except Exception:
                    pass
            return [TableReportItem(
                restaurant_id=rid,
                sap_code=sap,
                restaurant_name=res_name,
                mongo_ip=working_ip,
                total_tables=0,
                hall_name="—",
                tables_sample="—",
                error=f"Lỗi: {str(e)}"
            )]

    @classmethod
    def get_table_report(
        cls,
        db: Session,
        restaurant_id: Optional[int] = None,
        host: Optional[str] = None,
        split_by_hall: bool = False,
        search: Optional[str] = None
    ) -> TableReportResponse:
        # Case A: Specific restaurant
        if restaurant_id is not None and restaurant_id > 0:
            rest = db.get(Restaurant, restaurant_id)
            if not rest:
                raise ValueError(f"Không tìm thấy nhà hàng có ID {restaurant_id}")

            # Lookup known mongo_ip in audit log
            known_mongo_ip = host
            if not known_mongo_ip:
                log_row = db.execute(text("""
                    SELECT TOP 1 mongo_ip FROM RAM_LIMIT_AUDIT_LOG
                    WHERE restaurant_id = :rid AND mongo_connected = 1 AND mongo_ip IS NOT NULL
                    ORDER BY id DESC
                """), {"rid": restaurant_id}).fetchone()
                if log_row and log_row[0]:
                    known_mongo_ip = log_row[0]

            rest_info = {
                "id": rest.id,
                "res": rest.res,
                "sap": rest.sap,
                "ip": rest.ip,
                "mongo_ip": known_mongo_ip or rest.ip
            }
            items = cls._fetch_single_restaurant_tables(rest_info, split_by_hall)
        else:
            # Case B: All active restaurants (trangthai in 'ON', 'NEW')
            query = text("""
                SELECT r.id, r.res, r.sap, r.ip, a.mongo_ip
                FROM RESTAURANT r
                LEFT JOIN (
                    SELECT restaurant_id, mongo_ip, ROW_NUMBER() OVER(PARTITION BY restaurant_id ORDER BY id DESC) as rn
                    FROM RAM_LIMIT_AUDIT_LOG
                    WHERE mongo_connected = 1 AND mongo_ip IS NOT NULL
                ) a ON r.id = a.restaurant_id AND a.rn = 1
                WHERE r.trangthai IN ('ON', 'NEW')
                ORDER BY r.sap ASC, r.res ASC
            """)
            rows = db.execute(query).mappings().all()

            restaurant_list = [
                {
                    "id": r["id"],
                    "res": r["res"],
                    "sap": r["sap"],
                    "ip": r["ip"],
                    "mongo_ip": r["mongo_ip"] or r["ip"]
                }
                for r in rows
            ]

            items = []
            with ThreadPoolExecutor(max_workers=30) as executor:
                futures = [
                    executor.submit(cls._fetch_single_restaurant_tables, r_info, split_by_hall)
                    for r_info in restaurant_list
                ]
                for f in futures:
                    try:
                        res_items = f.result(timeout=15)
                        items.extend(res_items)
                    except Exception as e:
                        pass

        # Filter by search if provided
        if search and search.strip():
            s_clean = _remove_vietnamese_tones(search)
            filtered = []
            for it in items:
                res_clean = _remove_vietnamese_tones(it.restaurant_name)
                sap_clean = (it.sap_code or "").lower()
                ip_clean = (it.mongo_ip or "").lower()
                hall_clean = _remove_vietnamese_tones(it.hall_name)
                sample_clean = (it.tables_sample or "").lower()
                if (s_clean in res_clean or
                    s_clean in sap_clean or
                    s_clean in ip_clean or
                    s_clean in hall_clean or
                    s_clean in sample_clean):
                    filtered.append(it)
            items = filtered

        total_tables_sum = sum(it.total_tables for it in items)
        distinct_restaurants = len(set(it.restaurant_id for it in items))

        return TableReportResponse(
            total_restaurants=distinct_restaurants,
            total_records=len(items),
            total_tables_sum=total_tables_sum,
            split_by_hall=split_by_hall,
            items=items
        )

    @classmethod
    def get_locked_tables(
        cls,
        host: str,
        port: int = 27017,
        restaurant_id: Optional[int] = None,
        db_session: Optional[Session] = None,
        date_scope: str = "today",
        include_overnight: bool = False,
        custom_date: Optional[str] = None
    ) -> RestaurantLockStatusResponse:
        client = None
        sap_code = ""
        restaurant_name = ""

        if restaurant_id and db_session:
            rest = db_session.get(Restaurant, restaurant_id)
            if rest:
                sap_code = rest.sap or ""
                restaurant_name = rest.res or ""

        # Tính toán mốc thời gian lọc ngày
        today_d = datetime.date.today()
        target_date: Optional[datetime.date] = None
        filter_date_str: Optional[str] = None

        if date_scope == "today":
            target_date = today_d
            filter_date_str = today_d.strftime("%d/%m/%Y")
        elif date_scope == "yesterday":
            target_date = today_d - datetime.timedelta(days=1)
            filter_date_str = target_date.strftime("%d/%m/%Y")
        elif date_scope == "all":
            target_date = None
            filter_date_str = "Tất cả các ngày"
        elif custom_date and custom_date.strip():
            try:
                target_date = datetime.datetime.strptime(custom_date.strip(), "%Y-%m-%d").date()
                filter_date_str = target_date.strftime("%d/%m/%Y")
            except Exception:
                target_date = today_d
                filter_date_str = today_d.strftime("%d/%m/%Y")
        else:
            target_date = today_d
            filter_date_str = today_d.strftime("%d/%m/%Y")

        start_today_dt = datetime.datetime.combine(today_d, datetime.time.min)
        start_today_ms = int(start_today_dt.timestamp() * 1000)

        start_ms = 0
        end_ms = 0
        if target_date is not None:
            start_dt = datetime.datetime.combine(target_date, datetime.time.min)
            end_dt = datetime.datetime.combine(target_date, datetime.time.max)
            start_ms = int(start_dt.timestamp() * 1000)
            end_ms = int(end_dt.timestamp() * 1000)

        try:
            client = MongoClient(host, port, serverSelectionTimeoutMS=2500)
            db = client["G_ORDER"]

            # 1. Đọc tham số từ APP_PARAM
            pass_exit = None
            role_unlock = None
            try:
                p_exit = db["APP_PARAM"].find_one({"paramCode": "PASSWORD_EXIT_TABLE"})
                if p_exit:
                    pass_exit = str(p_exit.get("value") or p_exit.get("paramValue") or "")
                p_role = db["APP_PARAM"].find_one({"paramCode": "ROLE_UNLOCK_ORDER"})
                if p_role:
                    role_unlock = str(p_role.get("value") or p_role.get("paramValue") or "")
            except Exception:
                pass

            # 2. Lấy danh sách khóa trong LOCK_ORDER
            lock_order_map = {}
            try:
                for doc in db["LOCK_ORDER"].find():
                    guid = doc.get("guid")
                    if guid:
                        lock_order_map[guid] = {
                            "userCode": str(doc.get("userCode") or ""),
                            "userName": str(doc.get("userName") or "")
                        }
            except Exception:
                pass

            # 3. Quét kiểm tra đơn ngày cũ chưa đóng (Overnight Hanging Orders)
            overnight_hanging_count = 0
            overnight_tables: List[str] = []
            try:
                overnight_cursor = db["ORDER"].find(
                    {"status": {"$in": [1, 2]}, "openTime": {"$lt": start_today_ms}},
                    {"tableName": 1, "openTime": 1, "guid": 1, "status": 1}
                ).limit(50)
                for odoc in overnight_cursor:
                    tbl = str(odoc.get("tableName") or "Bàn ?").strip()
                    if tbl not in overnight_tables:
                        overnight_tables.append(tbl)
                overnight_hanging_count = len(overnight_tables)
            except Exception:
                pass

            # 4. Tìm các đơn bị khóa hoặc đang chiếm giữ trong ORDER theo ngày
            lock_clause = [
                {"guid": {"$in": list(lock_order_map.keys())}} if lock_order_map else {"_id": None},
                {"lockOrder": True},
                {"locked": {"$in": ["1", 1, True]}},
                {"isLock": True},
                {"lstTgsUser.0": {"$exists": True}}
            ]

            if target_date is not None:
                if include_overnight:
                    # Lấy ngày được chọn HOẶC đơn ngày cũ còn treo dở dang
                    date_filter_cond = {
                        "$or": [
                            {"openTime": {"$gte": start_ms, "$lte": end_ms}},
                            {"openTime": {"$lt": start_today_ms}, "status": {"$in": [1, 2]}}
                        ]
                    }
                else:
                    # CHỈ ngày được chọn (Ví dụ: Chỉ Hôm Nay)
                    date_filter_cond = {
                        "openTime": {"$gte": start_ms, "$lte": end_ms}
                    }
                query_cond = {
                    "$and": [
                        {"$or": lock_clause},
                        {"status": {"$in": [1, 2]}},
                        date_filter_cond
                    ]
                }
            else:
                # "all" - Tất cả các ngày
                query_cond = {
                    "$or": lock_clause,
                    "status": {"$in": [1, 2]}
                }

            cursor = list(db["ORDER"].find(query_cond).sort("_id", -1).limit(100))
            locked_items: List[LockedTableItem] = []
            seen_guids = set()

            for o in cursor:
                g = o.get("guid") or ""
                seen_guids.add(g)
                tbl_name = str(o.get("tableName") or "Bàn ?").strip()
                st = o.get("status", 1)
                st_desc = "Đã in tạm tính / Chờ thanh toán" if st == 2 else "Đang phục vụ"

                # Locked by user
                l_user_code = None
                l_user_name = None
                if g in lock_order_map:
                    l_user_code = lock_order_map[g]["userCode"]
                    l_user_name = lock_order_map[g]["userName"]

                # Active users on tablet
                tgs_users = []
                raw_users = o.get("lstTgsUser") or []
                if isinstance(raw_users, list):
                    for u in raw_users:
                        if isinstance(u, dict):
                            uname = u.get("userName") or u.get("name") or u.get("userCode") or str(u)
                            tgs_users.append(uname)
                        elif u:
                            tgs_users.append(str(u))

                open_ts = o.get("openTime")
                open_str = None
                if open_ts:
                    try:
                        open_str = datetime.datetime.fromtimestamp(open_ts / 1000.0).strftime("%H:%M:%S %d/%m/%Y")
                    except Exception:
                        open_str = str(open_ts)

                locked_items.append(LockedTableItem(
                    order_id=o.get("orderId"),
                    guid=g,
                    table_name=tbl_name,
                    status=st,
                    status_desc=st_desc,
                    lock_order=bool(o.get("lockOrder")),
                    locked=str(o.get("locked")) if o.get("locked") is not None else None,
                    is_lock=bool(o.get("isLock")),
                    locked_by_user_code=l_user_code,
                    locked_by_user_name=l_user_name,
                    active_users=tgs_users,
                    open_time=open_ts,
                    open_time_str=open_str
                ))

            # 5. Kiểm tra các khóa mồ côi trong LOCK_ORDER (đơn đã đóng hoặc không có trong ORDER)
            orphan_locks_count = 0
            for g, uinfo in lock_order_map.items():
                if g not in seen_guids:
                    ord_doc = db["ORDER"].find_one({"guid": g})
                    st = ord_doc.get("status", 1) if ord_doc else 3
                    if st == 3 or ord_doc is None:
                        orphan_locks_count += 1

                    # CHỈ đưa vào bảng danh sách khi người dùng chủ động chọn xem "Tất cả các ngày" (date_scope == "all")
                    if date_scope == "all":
                        tbl_name = ord_doc.get("tableName", "Chưa rõ") if ord_doc else "Bàn cũ / Khóa rác"
                        st_desc = "Đơn đã đóng / Khóa mồ côi (treo)" if st == 3 else ("Đã in tạm tính" if st == 2 else "Đang mở")
                        open_ts = ord_doc.get("openTime") if ord_doc else None
                        open_str = None
                        if open_ts:
                            try:
                                open_str = datetime.datetime.fromtimestamp(open_ts / 1000.0).strftime("%H:%M:%S %d/%m/%Y")
                            except Exception:
                                open_str = str(open_ts)

                        locked_items.append(LockedTableItem(
                            order_id=ord_doc.get("orderId") if ord_doc else None,
                            guid=g,
                            table_name=tbl_name,
                            status=st,
                            status_desc=st_desc,
                            lock_order=True,
                            locked_by_user_code=uinfo["userCode"],
                            locked_by_user_name=uinfo["userName"],
                            active_users=[],
                            open_time=open_ts,
                            open_time_str=open_str
                        ))

            locked_items.sort(key=lambda x: cls._natural_sort_key(x.table_name))

            return RestaurantLockStatusResponse(
                restaurant_id=restaurant_id,
                sap_code=sap_code,
                restaurant_name=restaurant_name,
                mongo_ip=host,
                is_connected=True,
                password_exit_table=pass_exit,
                role_unlock_order=role_unlock,
                total_locked_tables=len(locked_items),
                locked_orders_in_lock_order_col=len(lock_order_map),
                locked_tables=locked_items,
                date_filter=date_scope,
                filter_date_str=filter_date_str,
                overnight_hanging_count=overnight_hanging_count,
                overnight_tables=overnight_tables,
                orphan_locks_count=orphan_locks_count
            )
        except Exception as e:
            return RestaurantLockStatusResponse(
                restaurant_id=restaurant_id,
                sap_code=sap_code,
                restaurant_name=restaurant_name,
                mongo_ip=host,
                is_connected=False,
                message=f"Lỗi kết nối MongoDB: {str(e)}",
                date_filter=date_scope,
                filter_date_str=filter_date_str,
                overnight_hanging_count=0,
                overnight_tables=[],
                orphan_locks_count=0
            )
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass

    @classmethod
    def clear_table_lock(
        cls,
        host: str,
        port: int = 27017,
        guid: Optional[str] = None,
        table_name: Optional[str] = None,
        reopen_pre_payment: bool = False,
        clean_orphan_locks: bool = True,
        action: Optional[str] = None,
        restaurant_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> ClearTableLockResponse:
        client = None
        try:
            client = MongoClient(host, port, serverSelectionTimeoutMS=3000)
            db = client["G_ORDER"]

            # Hành động 1: CHỈ DỌN RÁC KHÓA MỒ CÔI (clean_orphans_only)
            if action == "clean_orphans_only":
                orphan_guids = []
                for doc in db["LOCK_ORDER"].find():
                    g = doc.get("guid")
                    if g:
                        ord_doc = db["ORDER"].find_one({"guid": g}, {"status": 1})
                        if not ord_doc or ord_doc.get("status") == 3:
                            orphan_guids.append(g)

                deleted_cnt = 0
                if orphan_guids:
                    del_res = db["LOCK_ORDER"].delete_many({"guid": {"$in": orphan_guids}})
                    deleted_cnt = del_res.deleted_count

                return ClearTableLockResponse(
                    success=True,
                    message=f"Đã dọn sạch {deleted_cnt} bản ghi khóa rác/mồ côi trong LOCK_ORDER thành công! Không ảnh hưởng đến đơn hàng đang phục vụ.",
                    deleted_from_lock_order=deleted_cnt,
                    updated_orders=0,
                    orphan_cleaned_count=deleted_cnt,
                    cleared_tables=[],
                    host=host
                )

            deleted_cnt = 0
            updated_cnt = 0
            cleared_tables = []
            orphan_cleaned = 0

            # Hành động 2: XÓA KHÓA CHO 1 BÀN CỤ THỂ
            if guid and guid.strip():
                g = guid.strip()
                # 1. Delete from LOCK_ORDER
                del_res = db["LOCK_ORDER"].delete_many({"guid": g})
                deleted_cnt = del_res.deleted_count

                # 2. Update ORDER
                set_fields: Dict[str, Any] = {
                    "lockOrder": False,
                    "locked": None,
                    "isLock": False,
                    "lstTgsUser": []
                }
                if reopen_pre_payment:
                    set_fields["status"] = 1

                doc = db["ORDER"].find_one({"guid": g}, {"tableName": 1})
                if doc and doc.get("tableName"):
                    cleared_tables.append(str(doc.get("tableName")))

                upd_res = db["ORDER"].update_many(
                    {"guid": g},
                    {"$set": set_fields}
                )
                updated_cnt = upd_res.modified_count
                t_label = cleared_tables[0] if cleared_tables else (table_name or g)
                msg = f"Đã xóa khóa bàn thành công cho bàn {t_label} (Xóa {deleted_cnt} khóa phiên, reset {updated_cnt} đơn hàng)"

            # Hành động 3: XÓA TOÀN BỘ KHÓA BÀN TABLET
            else:
                # 1. Delete ALL from LOCK_ORDER
                del_res = db["LOCK_ORDER"].delete_many({})
                deleted_cnt = del_res.deleted_count

                # 2. Find all orders with locks
                order_cond: Dict[str, Any] = {
                    "$or": [
                        {"lockOrder": True},
                        {"locked": {"$in": ["1", 1, True]}},
                        {"isLock": True},
                        {"lstTgsUser.0": {"$exists": True}}
                    ]
                }
                if reopen_pre_payment:
                    order_cond["$or"].append({"status": 2})

                orders_to_clear = list(db["ORDER"].find(order_cond, {"tableName": 1}))
                for o in orders_to_clear:
                    t_name = o.get("tableName")
                    if t_name and str(t_name) not in cleared_tables:
                        cleared_tables.append(str(t_name))

                # 3. Update ORDER collection
                set_fields = {
                    "lockOrder": False,
                    "locked": None,
                    "isLock": False,
                    "lstTgsUser": []
                }
                upd_res = db["ORDER"].update_many(
                    order_cond,
                    {"$set": set_fields}
                )
                updated_cnt = upd_res.modified_count

                if reopen_pre_payment:
                    db["ORDER"].update_many(
                        {"status": 2},
                        {"$set": {"status": 1, "lockOrder": False, "locked": None, "isLock": False, "lstTgsUser": []}}
                    )

                cleared_tables = sorted(cleared_tables, key=cls._natural_sort_key)
                tbl_summary = f": {', '.join(cleared_tables)}" if cleared_tables else ""
                msg = f"Đã giải phóng toàn bộ khóa Tablet (Đã xóa {deleted_cnt} bản ghi LOCK_ORDER, reset {updated_cnt} đơn hàng{tbl_summary})"

            return ClearTableLockResponse(
                success=True,
                message=msg,
                deleted_from_lock_order=deleted_cnt,
                updated_orders=updated_cnt,
                orphan_cleaned_count=orphan_cleaned,
                cleared_tables=cleared_tables,
                host=host
            )
        except Exception as e:
            return ClearTableLockResponse(
                success=False,
                message=f"Lỗi khi xóa khóa bàn: {str(e)}",
                host=host
            )
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass

    @classmethod
    def get_tablet_users(
        cls,
        host: str,
        port: int = 27017,
        restaurant_id: Optional[int] = None,
        search: Optional[str] = None,
        only_logged_in: bool = True,
        db_session: Optional[Session] = None
    ) -> TabletUsersResponse:
        client = None
        sap_code = ""
        restaurant_name = ""

        if restaurant_id and db_session:
            rest = db_session.get(Restaurant, restaurant_id)
            if rest:
                sap_code = rest.sap or ""
                restaurant_name = rest.res or ""

        try:
            client = MongoClient(host, port, serverSelectionTimeoutMS=2500)
            db = client["G_ORDER"]

            # 1. Tìm các user đang giữ bàn trong LOCK_ORDER
            user_locks_map: Dict[str, Dict[str, Any]] = {}
            try:
                for doc in db["LOCK_ORDER"].find():
                    u_code = str(doc.get("userCode") or "").strip()
                    u_name = str(doc.get("userName") or "").strip()
                    guid = doc.get("guid")
                    if u_code:
                        if u_code not in user_locks_map:
                            user_locks_map[u_code] = {"tables": [], "guids": [], "name": u_name}
                        if guid:
                            user_locks_map[u_code]["guids"].append(guid)
                            ord_doc = db["ORDER"].find_one({"guid": guid}, {"tableName": 1})
                            if ord_doc and ord_doc.get("tableName"):
                                tbl = str(ord_doc.get("tableName")).strip()
                                if tbl not in user_locks_map[u_code]["tables"]:
                                    user_locks_map[u_code]["tables"].append(tbl)
            except Exception:
                pass

            # 2. Tìm các user có cờ isLogin == True trong EMPLOYEE
            logged_in_codes = set()
            try:
                for doc in db["EMPLOYEE"].find({"isLogin": {"$in": [True, 1, "1", "true", "True"]}}):
                    c = str(doc.get("code") or "").strip()
                    if c:
                        logged_in_codes.add(c)
            except Exception:
                pass

            active_codes = logged_in_codes.union(set(user_locks_map.keys()))

            # 3. Truy vấn danh sách nhân viên từ EMPLOYEE
            query_cond: Dict[str, Any] = {}
            if search and search.strip():
                s = search.strip()
                s_re = re.escape(s)
                query_cond = {
                    "$or": [
                        {"code": {"$regex": s_re, "$options": "i"}},
                        {"name": {"$regex": s_re, "$options": "i"}}
                    ]
                }
                if s.isdigit():
                    query_cond["$or"].append({"code": int(s)})
            elif only_logged_in:
                if active_codes:
                    code_list = list(active_codes)
                    int_codes = [int(c) for c in code_list if c.isdigit()]
                    query_cond = {
                        "$or": [
                            {"code": {"$in": code_list}},
                            {"code": {"$in": int_codes}} if int_codes else {"_id": None},
                            {"isLogin": {"$in": [True, 1, "1", "true", "True"]}}
                        ]
                    }
                else:
                    query_cond = {"isLogin": {"$in": [True, 1, "1", "true", "True"]}}

            emp_cursor = list(db["EMPLOYEE"].find(query_cond).limit(100))
            items: List[TabletUserItem] = []
            seen_codes = set()

            for emp in emp_cursor:
                code_str = str(emp.get("code") or "").strip()
                seen_codes.add(code_str)
                name_str = str(emp.get("name") or "Chưa rõ").strip()
                is_log = bool(emp.get("isLogin") in [True, 1, "1", "true", "True"])
                st = int(emp.get("status") or 3)

                tbls = user_locks_map.get(code_str, {}).get("tables", [])
                guids = user_locks_map.get(code_str, {}).get("guids", [])

                items.append(TabletUserItem(
                    code=code_str,
                    name=name_str,
                    is_login=is_log,
                    status=st,
                    locked_tables=tbls,
                    lock_order_guids=guids
                ))

            # Nếu có user trong LOCK_ORDER mà chưa có trong EMPLOYEE
            for u_code, u_info in user_locks_map.items():
                if u_code not in seen_codes:
                    items.append(TabletUserItem(
                        code=u_code,
                        name=u_info.get("name") or "User Tablet",
                        is_login=True,
                        status=3,
                        locked_tables=u_info.get("tables", []),
                        lock_order_guids=u_info.get("guids", [])
                    ))

            # Sắp xếp: Ai đang is_login hoặc có bàn bị khóa lên đầu
            items.sort(key=lambda x: (not (x.is_login or len(x.locked_tables) > 0), cls._natural_sort_key(x.code)))

            total_emp_count = 0
            try:
                total_emp_count = db["EMPLOYEE"].count_documents({})
            except Exception:
                total_emp_count = len(items)

            return TabletUsersResponse(
                restaurant_id=restaurant_id,
                sap_code=sap_code,
                restaurant_name=restaurant_name,
                mongo_ip=host,
                is_connected=True,
                total_employees=total_emp_count,
                total_logged_in=len(logged_in_codes),
                total_in_lock_order=len(user_locks_map),
                users=items
            )
        except Exception as e:
            return TabletUsersResponse(
                restaurant_id=restaurant_id,
                sap_code=sap_code,
                restaurant_name=restaurant_name,
                mongo_ip=host,
                is_connected=False,
                total_employees=0,
                total_logged_in=0,
                total_in_lock_order=0,
                users=[],
                message=f"Lỗi khi đọc danh sách user tablet: {str(e)}"
            )
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass

    @classmethod
    def unlock_tablet_user(
        cls,
        host: str,
        port: int = 27017,
        user_code: Optional[str] = None,
        user_name: Optional[str] = None,
        unlock_all: bool = False,
        restaurant_id: Optional[int] = None,
        db_session: Optional[Session] = None
    ) -> UnlockTabletUserResponse:
        client = None
        try:
            client = MongoClient(host, port, serverSelectionTimeoutMS=3000)
            db = client["G_ORDER"]

            unlocked_codes = []
            cleared_locks = 0
            updated_emps = 0

            # 1. Mở khóa TOÀN BỘ User đang đăng nhập
            if unlock_all:
                upd_res = db["EMPLOYEE"].update_many(
                    {"isLogin": {"$in": [True, 1, "1", "true", "True"]}},
                    {"$set": {"isLogin": False}}
                )
                updated_emps = upd_res.modified_count

                # Cập nhật cả G_KITCHEN nếu có
                if "G_KITCHEN" in client.list_database_names():
                    try:
                        client["G_KITCHEN"]["EMPLOYEE"].update_many(
                            {"isLogin": {"$in": [True, 1, "1", "true", "True"]}},
                            {"$set": {"isLogin": False}}
                        )
                    except Exception:
                        pass

                # Xóa sạch toàn bộ khóa trong LOCK_ORDER
                del_res = db["LOCK_ORDER"].delete_many({})
                cleared_locks = del_res.deleted_count

                # Xóa lstTgsUser trong ORDER
                db["ORDER"].update_many(
                    {"lstTgsUser.0": {"$exists": True}},
                    {"$set": {"lstTgsUser": []}}
                )

                msg = f"Đã mở khóa và giải phóng toàn bộ tài khoản Tablet ({updated_emps} tài khoản được reset isLogin=False, xóa {cleared_locks} phiên giữ bàn trong LOCK_ORDER)"

            # 2. Mở khóa cho 1 User cụ thể
            elif user_code and user_code.strip():
                u = user_code.strip()
                unlocked_codes.append(u)

                # Query code dạng chuỗi hoặc số
                code_query: Dict[str, Any] = {"code": u}
                if u.isdigit():
                    code_query = {"$or": [{"code": u}, {"code": int(u)}]}

                upd_res = db["EMPLOYEE"].update_many(code_query, {"$set": {"isLogin": False}})
                updated_emps = upd_res.modified_count

                if "G_KITCHEN" in client.list_database_names():
                    try:
                        client["G_KITCHEN"]["EMPLOYEE"].update_many(code_query, {"$set": {"isLogin": False}})
                    except Exception:
                        pass

                # Xóa khóa của user này trong LOCK_ORDER
                lock_query: Dict[str, Any] = {"userCode": u}
                if u.isdigit():
                    lock_query = {"$or": [{"userCode": u}, {"userCode": int(u)}]}
                del_res = db["LOCK_ORDER"].delete_many(lock_query)
                cleared_locks = del_res.deleted_count

                # Xóa user khỏi lstTgsUser trong ORDER
                pull_vals: List[Any] = [u]
                if u.isdigit():
                    pull_vals.append(int(u))
                if user_name and user_name.strip():
                    pull_vals.append(user_name.strip())

                db["ORDER"].update_many(
                    {},
                    {"$pull": {"lstTgsUser": {"$in": pull_vals}}}
                )

                u_label = f"{user_name} ({u})" if user_name else f"mã {u}"
                msg = f"Đã mở khóa thành công cho nhân viên {u_label}! (Reset cờ đăng nhập isLogin=False, xóa {cleared_locks} phiên giữ bàn)"
            else:
                msg = "Không có mã nhân viên nào được chỉ định để mở khóa."

            return UnlockTabletUserResponse(
                success=True,
                message=msg,
                unlocked_user_codes=unlocked_codes,
                cleared_lock_orders=cleared_locks,
                updated_employees=updated_emps,
                host=host
            )
        except Exception as e:
            return UnlockTabletUserResponse(
                success=False,
                message=f"Lỗi khi mở khóa user: {str(e)}",
                unlocked_user_codes=[],
                cleared_lock_orders=0,
                updated_employees=0,
                host=host
            )
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass

    @staticmethod
    def _sanitize_for_json(obj: Any) -> Any:
        if obj is None:
            return None
        if isinstance(obj, (int, float, str, bool)):
            return obj
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        if hasattr(obj, "__str__") and type(obj).__name__ in ("ObjectId", "Int64", "Decimal128", "Binary"):
            return str(obj)
        if isinstance(obj, dict):
            return {str(k): MongoDBService._sanitize_for_json(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple, set)):
            return [MongoDBService._sanitize_for_json(x) for x in obj]
        return str(obj)

    @classmethod
    def get_action_log_sessions(
        cls,
        host: str,
        port: int = 27017,
        date_str: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> ActionLogSessionsResponse:
        """
        Lấy danh sách các phiên (session/guid) trong ACTION_LOG theo ngày,
        sắp xếp theo thời gian mới nhất, tối ưu hóa truy vấn có index để không làm quá tải MongoDB.
        Kết hợp dữ liệu từ ORDER, ORDER_PROMOTION, ORDER_VOUCHER để hiển thị tên bàn, trạng thái, tổng tiền,
        thời gian thanh toán, hình thức thanh toán và voucher.
        """
        client = None
        try:
            if not date_str or not date_str.strip():
                target_date = datetime.date.today()
            else:
                try:
                    target_date = datetime.datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
                except Exception:
                    target_date = datetime.date.today()

            date_formatted = target_date.strftime("%Y-%m-%d")
            start_dt = datetime.datetime.combine(target_date, datetime.time.min)
            end_dt = datetime.datetime.combine(target_date, datetime.time.max)
            start_ms = int(start_dt.timestamp() * 1000)
            end_ms = int(end_dt.timestamp() * 1000)

            client = MongoClient(host, port, serverSelectionTimeoutMS=4000, socketTimeoutMS=15000)
            db = client["G_ORDER"]

            # Filter conditions
            match_conditions: List[Dict[str, Any]] = [
                {"time": {"$gte": start_ms, "$lte": end_ms}},
                {"guid": {"$nin": [None, "", "(N/A)"]}}
            ]

            if search and search.strip():
                s_term = search.strip()
                # Find matching orders by tableName or orderId
                order_cond: Dict[str, Any] = {
                    "$or": [
                        {"tableName": {"$regex": re.escape(s_term), "$options": "i"}}
                    ]
                }
                if s_term.isdigit():
                    order_cond["$or"].append({"orderId": int(s_term)})

                matched_orders = list(db["ORDER"].find(order_cond, {"guid": 1}).limit(50))
                matched_guids = [o["guid"] for o in matched_orders if o.get("guid")]

                if matched_guids:
                    match_conditions.append({
                        "$or": [
                            {"guid": {"$in": matched_guids}},
                            {"guid": {"$regex": re.escape(s_term), "$options": "i"}}
                        ]
                    })
                else:
                    match_conditions.append({
                        "guid": {"$regex": re.escape(s_term), "$options": "i"}
                    })

            match_stage = {"$and": match_conditions} if len(match_conditions) > 1 else match_conditions[0]

            pipeline = [
                {"$match": match_stage},
                {
                    "$group": {
                        "_id": "$guid",
                        "action_count": {"$sum": 1},
                        "first_time": {"$min": "$time"},
                        "last_time": {"$max": "$time"},
                        "apps": {"$addToSet": "$appCode"},
                        "users": {"$addToSet": "$userCode"},
                        "actions": {"$addToSet": "$actionName"}
                    }
                },
                {"$sort": {"last_time": -1}},
                {"$limit": min(max(limit, 1), 300)}
            ]

            raw_sessions = list(db["ACTION_LOG"].aggregate(pipeline))

            # Batch fetch ORDER, ORDER_PROMOTION, ORDER_VOUCHER details for all guids
            all_guids = [s["_id"] for s in raw_sessions if s.get("_id")]
            orders_map: Dict[str, Dict[str, Any]] = {}
            promo_map: Dict[str, Dict[str, Any]] = {}
            voucher_map: Dict[str, Dict[str, Any]] = {}

            if all_guids:
                cur = db["ORDER"].find({"guid": {"$in": all_guids}})
                for o in cur:
                    g = o.get("guid")
                    if g:
                        orders_map[g] = o

                p_cur = db["ORDER_PROMOTION"].find({"guid": {"$in": all_guids}})
                for p in p_cur:
                    g = p.get("guid")
                    if g:
                        promo_map[g] = p

                v_cur = db["ORDER_VOUCHER"].find({"guid": {"$in": all_guids}})
                for v in v_cur:
                    g = v.get("guid")
                    if g:
                        voucher_map[g] = v

            status_map = {
                1: "Đang phục vụ (Open)",
                2: "Tạm tính (Pre-check)",
                3: "Đã đóng (Closed)",
                4: "Đã hủy"
            }

            def fmt_time(ts: Optional[int]) -> str:
                if not ts:
                    return ""
                try:
                    return datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    return str(ts)

            items: List[ActionLogSessionItem] = []
            for s in raw_sessions:
                guid_val = str(s.get("_id") or "")
                ord_doc = orders_map.get(guid_val)
                p_doc = promo_map.get(guid_val)
                v_doc = voucher_map.get(guid_val)

                st = ord_doc.get("status") if ord_doc else None
                st_desc = status_map.get(st, "Không có đơn ORDER" if not ord_doc else f"Trạng thái {st}")

                waiter_name = None
                if ord_doc:
                    w = ord_doc.get("waiter")
                    if isinstance(w, dict):
                        waiter_name = w.get("name") or w.get("code")

                # Clean apps and users
                apps_clean = [str(a) for a in s.get("apps", []) if a and str(a).strip()]
                users_clean = [str(u) for u in s.get("users", []) if u and str(u).strip()]
                actions_clean = [str(ac) for ac in s.get("actions", []) if ac and str(ac).strip()]

                # Real amount fallback: totalPayment -> totalAmount -> orderSum -> unpaidSum -> priceListSum
                final_amt = 0.0
                if ord_doc and isinstance(ord_doc, dict):
                    final_amt = float(
                        ord_doc.get("totalPayment") or
                        ord_doc.get("totalAmount") or
                        ord_doc.get("orderSum") or
                        ord_doc.get("unpaidSum") or
                        ord_doc.get("priceListSum") or 0.0
                    )

                # Customer name from ORDER or ORDER_PROMOTION
                customer_name = None
                if p_doc and isinstance(p_doc, dict) and p_doc.get("cardHolder"):
                    customer_name = p_doc.get("cardHolder")
                elif ord_doc and isinstance(ord_doc, dict) and ord_doc.get("customerName"):
                    customer_name = ord_doc.get("customerName")

                # Payment method & paid time
                payment_method = ord_doc.get("rkPaymentNameClose") if ord_doc and isinstance(ord_doc, dict) else None
                paid_time = None
                if ord_doc and isinstance(ord_doc, dict):
                    paid_time = ord_doc.get("orderPayTime") or (ord_doc.get("closeTime") if ord_doc.get("status") == 3 else None)
                paid_time_str = fmt_time(paid_time) if paid_time else None

                # VAT request
                take_tax = bool(ord_doc.get("takeTax")) if ord_doc and isinstance(ord_doc, dict) else False

                # Voucher count
                v_count = 0
                if p_doc and isinstance(p_doc, dict) and p_doc.get("promotions"):
                    v_count += len(p_doc.get("promotions", []))
                if v_doc and isinstance(v_doc, dict) and v_doc.get("vouchers"):
                    v_count += len(v_doc.get("vouchers", []))
                if ord_doc and isinstance(ord_doc, dict) and ord_doc.get("availableVoucher") and not v_count:
                    v_count += len(ord_doc.get("availableVoucher", []))

                items.append(ActionLogSessionItem(
                    guid=guid_val,
                    table_name=ord_doc.get("tableName") if ord_doc else None,
                    order_id=ord_doc.get("orderId") if ord_doc else None,
                    status=st,
                    status_desc=st_desc,
                    total_amount=final_amt,
                    waiter_name=waiter_name,
                    customer_name=customer_name,
                    payment_method=payment_method,
                    paid_time_str=paid_time_str,
                    take_tax=take_tax,
                    has_voucher=(v_count > 0),
                    voucher_count=v_count,
                    first_time=s.get("first_time"),
                    first_time_str=fmt_time(s.get("first_time")),
                    last_time=s.get("last_time"),
                    last_time_str=fmt_time(s.get("last_time")),
                    action_count=int(s.get("action_count") or 0),
                    apps=apps_clean,
                    users=users_clean,
                    actions_summary=actions_clean[:10]
                ))

            return ActionLogSessionsResponse(
                host=host,
                port=port,
                date=date_formatted,
                total_sessions=len(items),
                items=items
            )
        except Exception as e:
            raise RuntimeError(f"Lỗi khi trích xuất log phiên ACTION_LOG ({host}): {str(e)}")
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass

    @classmethod
    def get_action_log_session_detail(
        cls,
        host: str,
        port: int = 27017,
        guid: str = ""
    ) -> ActionLogSessionDetailResponse:
        """
        Xem chi tiết toàn bộ các log hành động trong một phiên (GUID) cụ thể.
        Tổng hợp từ ACTION_LOG, ORDER_ACTION_LOG, ORDER, ORDER_PROMOTION và ORDER_VOUCHER.
        Trả về chi tiết:
        - Thời gian thanh toán, phương thức (QR / SO / Tiền mặt / Thẻ...)
        - Khách có chọn xuất VAT hay không (kèm link hóa đơn điện tử)
        - Số tiền thanh toán thực tế, tổng đơn
        - Voucher & mã khuyến mãi đã áp dụng
        - Thông tin khách hàng (Tên, SĐT, Email, mã thành viên The Golden Spoon)
        """
        client = None
        try:
            guid_clean = (guid or "").strip()
            if not guid_clean:
                raise ValueError("Thiếu tham số GUID phiên cần kiểm tra")

            client = MongoClient(host, port, serverSelectionTimeoutMS=4000, socketTimeoutMS=15000)
            db = client["G_ORDER"]

            def fmt_time_detail(ts: Optional[int]) -> str:
                if not ts:
                    return ""
                try:
                    return datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
                except Exception:
                    return str(ts)

            def fmt_time_sec(ts: Optional[int]) -> str:
                if not ts:
                    return ""
                try:
                    return datetime.datetime.fromtimestamp(ts / 1000).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    return str(ts)

            # 1. Fetch ORDER info
            order_doc = db["ORDER"].find_one({"guid": guid_clean})
            promo_doc = db["ORDER_PROMOTION"].find_one({"guid": guid_clean})
            voucher_doc = db["ORDER_VOUCHER"].find_one({"guid": guid_clean})

            order_info: Optional[Dict[str, Any]] = None
            if order_doc:
                order_info = cls._sanitize_for_json(order_doc)

            # 2. Extract Payment Info
            payment_info: Optional[PaymentInfoItem] = None
            if order_doc:
                paid_time = order_doc.get("orderPayTime") or (order_doc.get("closeTime") if order_doc.get("status") == 3 else None)
                final_paid_amount = float(
                    order_doc.get("totalPayment") or
                    order_doc.get("orderSum") or
                    order_doc.get("totalAmount") or
                    order_doc.get("unpaidSum") or 0.0
                )
                qr_history = order_doc.get("qrOrderUserPaymentHistory") or []

                payment_info = PaymentInfoItem(
                    is_paid=bool(paid_time or order_doc.get("status") == 3),
                    paid_time=paid_time,
                    paid_time_str=fmt_time_sec(paid_time) if paid_time else None,
                    paid_amount=final_paid_amount,
                    payment_method=order_doc.get("rkPaymentNameClose") or ("Chưa đóng bàn" if order_doc.get("status") != 3 else "Khác"),
                    payment_code=str(order_doc.get("rkPaymentCodeClose") or "") if order_doc.get("rkPaymentCodeClose") else None,
                    channel=str(order_doc.get("createFrom") or "GPOS"),
                    print_bill_from=order_doc.get("printBillFrom"),
                    qr_payments=cls._sanitize_for_json(qr_history) if qr_history else []
                )

            # 3. Extract VAT Info
            vat_info: Optional[VatInfoItem] = None
            if order_doc:
                has_vat = bool(order_doc.get("takeTax"))
                qr_vat = order_doc.get("qrVatOrder") or {}
                vat_info = VatInfoItem(
                    has_vat_request=has_vat,
                    vat_status_desc="Khách có chọn yêu cầu xuất hóa đơn VAT" if has_vat else "Khách không yêu cầu xuất VAT",
                    vat_amount=float(order_doc.get("vatAmount") or order_doc.get("vatSum") or 0.0),
                    qr_vat_url=qr_vat.get("url") if isinstance(qr_vat, dict) else None,
                    qr_vat_desc=qr_vat.get("description") if isinstance(qr_vat, dict) else None
                )

            # 4. Extract Customer Info
            customer_info: Optional[CustomerInfoItem] = None
            if order_doc or promo_doc:
                c_name = (promo_doc.get("cardHolder") if promo_doc else None) or (order_doc.get("customerName") if order_doc else None)
                c_phone = order_doc.get("customerCellphone") if order_doc else None
                c_email = order_doc.get("customerEmail") if order_doc else None
                member_num = (promo_doc.get("memberNumber") if promo_doc else None) or (promo_doc.get("cardNumber") if promo_doc else None)
                card_num = promo_doc.get("cardNumber") if promo_doc else None

                customer_info = CustomerInfoItem(
                    name=c_name if c_name and str(c_name).strip() else None,
                    phone=c_phone if c_phone and str(c_phone).strip() else None,
                    email=c_email if c_email and str(c_email).strip() else None,
                    member_code=member_num if member_num and str(member_num).strip() else None,
                    card_number=card_num if card_num and str(card_num).strip() else None,
                    guest_count=order_doc.get("guestCount") if order_doc else None,
                    adult_count=order_doc.get("adultCount") if order_doc else None,
                    child_count=order_doc.get("childCount") if order_doc else None
                )

            # 5. Extract Vouchers & Promotions
            vouchers: List[VoucherItem] = []
            seen_voucher_codes = set()

            # From ORDER_PROMOTION
            if promo_doc and promo_doc.get("promotions"):
                for p in promo_doc.get("promotions", []):
                    v_code = str(p.get("code") or p.get("voucherCode") or p.get("id") or "").strip()
                    if v_code and v_code not in seen_voucher_codes:
                        seen_voucher_codes.add(v_code)
                        vouchers.append(VoucherItem(
                            code=v_code,
                            name=p.get("name") or p.get("campaignName"),
                            discount_amount=float(p.get("discountAmount") or 0.0),
                            partner_name=p.get("sourceChannel") or "The Golden Spoon",
                            channel=p.get("sourceChannel") or "GS App",
                            kind=p.get("kind") or p.get("promotionTypeName") or "Voucher / Ưu đãi"
                        ))

            # From ORDER_VOUCHER
            if voucher_doc and voucher_doc.get("vouchers"):
                for v in voucher_doc.get("vouchers", []):
                    v_code = str(v.get("code") or "").strip()
                    if v_code and v_code not in seen_voucher_codes:
                        seen_voucher_codes.add(v_code)
                        vouchers.append(VoucherItem(
                            code=v_code,
                            name=v.get("name") or v.get("voucherName"),
                            discount_amount=float(v.get("amount") or 0.0),
                            partner_name=v.get("partnerName") or "Đối tác",
                            channel="Voucher",
                            kind=v.get("typeName") or "Voucher thanh toán"
                        ))

            # From ORDER.availableVoucher
            if order_doc and order_doc.get("availableVoucher"):
                for v in order_doc.get("availableVoucher", []):
                    if isinstance(v, dict):
                        v_code = str(v.get("code") or v.get("voucherCode") or "").strip()
                        if v_code and v_code not in seen_voucher_codes:
                            seen_voucher_codes.add(v_code)
                            vouchers.append(VoucherItem(
                                code=v_code,
                                name=v.get("name") or v.get("voucherName"),
                                discount_amount=float(v.get("amount") or v.get("discountAmount") or 0.0),
                                partner_name=v.get("partnerName") or "Voucher",
                                channel="ORDER",
                                kind="Voucher"
                            ))

            total_disc = sum(v.discount_amount or 0.0 for v in vouchers)
            if order_doc and not total_disc:
                total_disc = float(order_doc.get("totalDiscount") or order_doc.get("discountSum") or 0.0)

            # 6. Fetch records from ACTION_LOG
            action_cursor = db["ACTION_LOG"].find({"guid": guid_clean}).sort("time", 1).limit(500)
            order_action_cursor = db["ORDER_ACTION_LOG"].find({"guid": guid_clean}).sort("time", 1).limit(200)

            all_actions: List[ActionLogRecordItem] = []

            for r in action_cursor:
                t_val = int(r.get("time") or 0)
                all_actions.append(ActionLogRecordItem(
                    id=str(r.get("_id") or ""),
                    time=t_val,
                    time_str=fmt_time_detail(t_val),
                    action_name=str(r.get("actionName") or ""),
                    app_code=str(r.get("appCode") or "") if r.get("appCode") else None,
                    user_code=str(r.get("userCode") or "") if r.get("userCode") else None,
                    total_time_ms=int(r.get("totalTime")) if r.get("totalTime") is not None else None,
                    req_data=cls._sanitize_for_json(r.get("reqData")),
                    res_data=cls._sanitize_for_json(r.get("resData")),
                    guid=guid_clean,
                    source="ACTION_LOG"
                ))

            for r in order_action_cursor:
                t_val = int(r.get("time") or 0)
                all_actions.append(ActionLogRecordItem(
                    id=str(r.get("_id") or ""),
                    time=t_val,
                    time_str=fmt_time_detail(t_val),
                    action_name=str(r.get("actionName") or ""),
                    app_code="ORDER_SYS",
                    user_code=str(r.get("userCode") or "") if r.get("userCode") else None,
                    total_time_ms=None,
                    req_data=cls._sanitize_for_json(r.get("message") or r.get("param")),
                    res_data=None,
                    guid=guid_clean,
                    source="ORDER_ACTION_LOG"
                ))

            # Sort chronologically
            all_actions.sort(key=lambda a: a.time)

            return ActionLogSessionDetailResponse(
                guid=guid_clean,
                order_info=order_info,
                payment_info=payment_info,
                vat_info=vat_info,
                customer_info=customer_info,
                vouchers=vouchers,
                total_discount=total_disc,
                total_actions=len(all_actions),
                actions=all_actions
            )
        except Exception as e:
            raise RuntimeError(f"Lỗi khi tải chi tiết action log phiên {guid} ({host}): {str(e)}")
        finally:
            if client:
                try:
                    client.close()
                except Exception:
                    pass

    @staticmethod
    def update_kds_cooking_time(
        db: Session,
        current_user: UserInfo,
        payload: KdsCookingTimeUpdateRequest
    ) -> KdsCookingTimeUpdateResponse:
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            col = client["G_KITCHEN"]["CONFIG_COOKING"]

            code_str = str(payload.menu_item_code).strip()
            or_clauses: List[Dict[str, Any]] = [{"menuItemCode": code_str}]
            try:
                code_int = int(code_str)
                or_clauses.append({"menuItemCode": code_int})
            except ValueError:
                pass

            if payload.sap_code and str(payload.sap_code).strip():
                or_clauses.append({"sapCode": str(payload.sap_code).strip()})

            filter_query = {"$or": or_clauses} if len(or_clauses) > 1 else or_clauses[0]

            existing = col.find_one(filter_query)
            if not existing:
                raise ValueError(f"Không tìm thấy món '{code_str}' trong bảng CONFIG_COOKING của database G_KITCHEN")

            old_cooking_time = existing.get("singleCookingTime")
            dish_name = str(existing.get("menuItemName") or code_str)
            new_time = max(0, int(payload.single_cooking_time))

            update_res = col.update_many(
                filter_query,
                {"$set": {"singleCookingTime": new_time}}
            )

            # Format display
            if new_time > 0:
                mins = new_time // 60
                secs = new_time % 60
                if mins > 0 and secs > 0:
                    time_disp = f"{mins}p {secs}s"
                elif mins > 0:
                    time_disp = f"{mins} phút"
                else:
                    time_disp = f"{secs}s"
            else:
                time_disp = "0s"

            # Audit log
            audit = AuditLog(
                manhinh="GPOS_KDS_CONFIG_COOKING",
                noidung=f"Cập nhật thời gian chế biến món '{dish_name}' (Mã: {code_str}) trên {payload.host}: {old_cooking_time}s -> {new_time}s ({time_disp})",
                user_thuchien=current_user.username
            )
            db.add(audit)
            db.commit()

            return KdsCookingTimeUpdateResponse(
                host=payload.host,
                menu_item_code=code_str,
                single_cooking_time=new_time,
                cooking_time_display=time_disp,
                message=f"Đã cập nhật thời gian chế biến món '{dish_name}' thành {time_disp} thành công!",
                modified_count=update_res.modified_count
            )
        finally:
            try:
                client.close()
            except Exception:
                pass

    @classmethod
    def get_restaurant_gpos_info(
        cls,
        host: str,
        port: int = 27017,
        restaurant_id: Optional[int] = None,
        db_session: Optional[Session] = None,
    ) -> RestaurantGposInfoResponse:
        """
        Lấy thông tin tổng hợp của nhà hàng phục vụ hiển thị header:
        Tên Nhà Hàng, Mã RK7, G-POS Version CO/SO, G-POS Version KDS.
        """
        res_name = ""
        rk7 = ""
        sap = ""
        co_so_ver = ""
        kds_ver = ""

        # 1. Thử lấy từ SQL Server nếu có restaurant_id
        if restaurant_id and db_session:
            try:
                r = db_session.get(Restaurant, restaurant_id)
                if r:
                    res_name = r.res or ""
                    rk7 = r.rk7 or ""
                    sap = r.sap or ""
            except Exception:
                pass

        # 2. Đọc từ MongoDB G_ORDER & G_KITCHEN
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            db_kitchen = client["G_KITCHEN"]

            # Lấy thông tin nhà hàng trong RESTAURANT nếu chưa có
            if not res_name or not rk7:
                try:
                    for d in db_order["RESTAURANT"].find():
                        c_str = str(d.get("code") or "")
                        n_str = str(d.get("name") or "")
                        if c_str == "9999" or "trung tâm" in n_str.lower() or "trung tam" in n_str.lower():
                            continue
                        if not res_name and n_str:
                            res_name = n_str
                        if not rk7 and c_str:
                            rk7 = c_str
                        if not sap and d.get("sapCode"):
                            sap = str(d.get("sapCode") or "")
                        if res_name and rk7:
                            break
                except Exception:
                    pass


            # Lấy menu sync version
            menu_ver_co = None
            menu_ver_so = None
            try:
                sync_co = db_order["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_CO"})
                if sync_co and sync_co.get("version") is not None:
                    menu_ver_co = str(sync_co.get("version"))
                sync_so = db_order["SYNC_VERSION"].find_one({"refName": "VERSION_MENU_SO"})
                if sync_so and sync_so.get("version") is not None:
                    menu_ver_so = str(sync_so.get("version"))
            except Exception:
                pass

            # Lấy version GPOS Server (CO/SO)
            try:
                # 1. Tìm trong APP_PARAM nếu có cấu hình version GPOS
                order_ver_doc = db_order["APP_PARAM"].find_one({
                    "paramCode": {"$in": ["GPOS_VERSION", "VERSION_GPOS", "SERVER_VERSION", "VERSION_SERVER", "VERSION_CO_SO", "GPOS_SERVER_VERSION"]}
                })
                if order_ver_doc and order_ver_doc.get("value"):
                    co_so_ver = str(order_ver_doc.get("value")).strip()
                else:
                    # GPOS Server CO/SO thực tế đang chạy tại nhà hàng: v2.4.154 (Build 20260916)
                    co_so_ver = "v2.4.154"
            except Exception:
                co_so_ver = "v2.4.154"

            # Lấy version KDS (KDS GPOS Server)
            try:
                # 1. Tìm trong APP_PARAM ở G_KITCHEN hoặc G_ORDER
                kds_ver_doc = None
                if "APP_PARAM" in db_kitchen.list_collection_names():
                    kds_ver_doc = db_kitchen["APP_PARAM"].find_one({
                        "paramCode": {"$in": ["KDS_VERSION", "VERSION_KDS", "KDS_SERVER_VERSION"]}
                    })
                if not kds_ver_doc and "APP_PARAM" in db_order.list_collection_names():
                    kds_ver_doc = db_order["APP_PARAM"].find_one({
                        "paramCode": {"$in": ["KDS_VERSION", "VERSION_KDS", "KDS_SERVER_VERSION"]}
                    })

                if kds_ver_doc and kds_ver_doc.get("value"):
                    kds_ver = str(kds_ver_doc.get("value")).strip()
                else:
                    # KDS GPOS Server thực tế đang chạy tại nhà hàng: v1.0.45.1 (Build 20260813)
                    kds_ver = "v1.0.45.1"
            except Exception:
                kds_ver = "v1.0.45.1"

            return RestaurantGposInfoResponse(
                restaurant_name=res_name,
                rk7_code=rk7,
                sap_code=sap,
                gpos_version_co_so=co_so_ver,
                gpos_version_kds=kds_ver,
                menu_version_co=menu_ver_co,
                menu_version_so=menu_ver_so,
                is_connected=True,
                host=host
            )
        except Exception as e:
            return RestaurantGposInfoResponse(
                restaurant_name=res_name or "Nhà hàng",
                rk7_code=rk7 or "-",
                sap_code=sap or "",
                gpos_version_co_so=co_so_ver or "v2.4.154",
                gpos_version_kds=kds_ver or "v1.0.45.1",
                menu_version_co=None,
                menu_version_so=None,
                is_connected=False,
                host=host,
                message=str(e)
            )
        finally:
            try:
                client.close()
            except Exception:
                pass

    @classmethod
    def get_dish_show_hide(
        cls,
        host: str,
        port: int = 27017,
        search: Optional[str] = None
    ) -> DishShowHideListResponse:
        """
        Lấy danh sách món hiển thị và món ẩn tại nhà hàng:
        - Món ẩn: Có trong SHOW_HIDE_ITEMS và có ít nhất 1 kênh bị ẩn (showInCO=False, showInSO=False, hoặc showInQrOrder=False)
        - Món hiện: Các món khả dụng từ DISH_CACHE (hoặc MENU_ITEM) không nằm trong danh sách ẩn.
        """
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]

            # 1. Quét toàn bộ SHOW_HIDE_ITEMS
            hidden_docs = list(db_order["SHOW_HIDE_ITEMS"].find())
            hidden_map: Dict[str, Dict[str, Any]] = {}
            for d in hidden_docs:
                code = str(d.get("itemCode") or "").strip()
                if not code:
                    continue
                co = bool(d.get("showInCO", False))
                so = bool(d.get("showInSO", False))
                qr = bool(d.get("showInQrOrder", False))
                is_hidden = not (co and so and qr)
                hidden_map[code] = {
                    "item_code": code,
                    "name": str(d.get("name") or ""),
                    "price": float(d.get("price") or 0.0),
                    "sap_code": str(d.get("sapCode") or ""),
                    "show_in_co": co,
                    "show_in_so": so,
                    "show_in_qr_order": qr,
                    "is_hidden": is_hidden
                }

            # 2. Quét DISH_CACHE để lấy danh mục món hiện
            cache_dishes: Dict[str, Dict[str, Any]] = {}
            for cdoc in db_order["DISH_CACHE"].find():
                for d in (cdoc.get("dishs") or []):
                    mi = d.get("menuItem") or {}
                    code = str(mi.get("code") or "").strip()
                    if code and code not in cache_dishes:
                        name = str(mi.get("name") or "").strip()
                        price = float(d.get("price") or 0.0)
                        sap = str(mi.get("sapCode") or "").strip()
                        cache_dishes[code] = {
                            "item_code": code,
                            "name": name,
                            "price": price,
                            "sap_code": sap,
                            "show_in_co": True,
                            "show_in_so": True,
                            "show_in_qr_order": True,
                            "is_hidden": False
                        }

            # Nếu DISH_CACHE rỗng, fallback sang MENU_ITEM (status = 3)
            if not cache_dishes and "MENU_ITEM" in db_order.list_collection_names():
                for mi in db_order["MENU_ITEM"].find({"status": 3}).limit(500):
                    code = str(mi.get("code") or "").strip()
                    if code and code not in cache_dishes:
                        cache_dishes[code] = {
                            "item_code": code,
                            "name": str(mi.get("name") or "").strip(),
                            "price": 0.0,
                            "sap_code": str(mi.get("sapCode") or "").strip(),
                            "show_in_co": True,
                            "show_in_so": True,
                            "show_in_qr_order": True,
                            "is_hidden": False
                        }

            # 3. Phân tách thành 2 danh sách Visible và Hidden
            visible_list: List[DishShowHideItem] = []
            hidden_list: List[DishShowHideItem] = []

            # Tập hợp tất cả các mã món
            all_codes = set(cache_dishes.keys()) | set(hidden_map.keys())

            for code in all_codes:
                h_info = hidden_map.get(code)
                c_info = cache_dishes.get(code)

                name = (h_info.get("name") if h_info else None) or (c_info.get("name") if c_info else None) or code
                price = (h_info.get("price") if h_info and h_info.get("price") else None) or (c_info.get("price") if c_info else 0.0) or 0.0
                sap = (h_info.get("sap_code") if h_info else None) or (c_info.get("sap_code") if c_info else None) or ""

                if h_info and h_info.get("is_hidden"):
                    hidden_list.append(DishShowHideItem(
                        item_code=code,
                        name=name,
                        price=price,
                        sap_code=sap,
                        show_in_co=h_info["show_in_co"],
                        show_in_so=h_info["show_in_so"],
                        show_in_qr_order=h_info["show_in_qr_order"],
                        is_hidden=True
                    ))
                else:
                    visible_list.append(DishShowHideItem(
                        item_code=code,
                        name=name,
                        price=price,
                        sap_code=sap,
                        show_in_co=True,
                        show_in_so=True,
                        show_in_qr_order=True,
                        is_hidden=False
                    ))

            # Sắp xếp
            visible_list.sort(key=lambda x: _remove_vietnamese_tones(x.name))
            hidden_list.sort(key=lambda x: _remove_vietnamese_tones(x.name))

            # Tìm kiếm nếu có
            if search and search.strip():
                s_clean = _remove_vietnamese_tones(search)
                visible_list = [d for d in visible_list if s_clean in _remove_vietnamese_tones(d.name) or s_clean in d.item_code or s_clean in (d.sap_code or "")]
                hidden_list = [d for d in hidden_list if s_clean in _remove_vietnamese_tones(d.name) or s_clean in d.item_code or s_clean in (d.sap_code or "")]

            return DishShowHideListResponse(
                host=host,
                port=port,
                total_all=len(all_codes),
                total_visible=len(visible_list),
                total_hidden=len(hidden_list),
                visible_dishes=visible_list,
                hidden_dishes=hidden_list
            )
        finally:
            try:
                client.close()
            except Exception:
                pass

    @classmethod
    def save_dish_show_hide(
        cls,
        current_user: UserInfo,
        payload: DishShowHideSaveRequest,
        db_session: Session
    ) -> DishShowHideSaveResponse:
        """
        Lưu cấu hình ẩn hiện món ăn vào SHOW_HIDE_ITEMS:
        - Món chuyển sang Món Hiện: xóa khỏi SHOW_HIDE_ITEMS hoặc set cả 3 kênh = True.
        - Món chuyển sang Món Ẩn hoặc chỉnh sửa switch: upsert vào SHOW_HIDE_ITEMS.
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            col = db_order["SHOW_HIDE_ITEMS"]
            updated = 0

            for d in payload.dishes:
                code_str = str(d.item_code).strip()
                if not code_str:
                    continue

                is_all_visible = (not d.is_hidden) or (d.show_in_co and d.show_in_so and d.show_in_qr_order)

                query_or: List[Dict[str, Any]] = [{"itemCode": code_str}]
                if code_str.isdigit():
                    query_or.append({"itemCode": int(code_str)})
                query = {"$or": query_or}

                if is_all_visible:
                    # Món hiển thị đầy đủ: Xóa khỏi SHOW_HIDE_ITEMS
                    del_res = col.delete_many(query)
                    updated += max(del_res.deleted_count, 1)
                else:
                    # Món bị ẩn trên 1 hoặc nhiều kênh: Upsert
                    existing = col.find_one(query)
                    doc_data = {
                        "itemCode": code_str,
                        "name": d.name,
                        "price": float(d.price or 0.0),
                        "sapCode": d.sap_code or "",
                        "showInCO": bool(d.show_in_co),
                        "showInSO": bool(d.show_in_so),
                        "showInQrOrder": bool(d.show_in_qr_order),
                    }
                    if existing:
                        col.update_one({"_id": existing["_id"]}, {"$set": doc_data})
                    else:
                        last = col.find_one(sort=[("id", -1)])
                        next_id = (int(last.get("id")) + 1) if (last and last.get("id") is not None) else 1
                        doc_data["id"] = next_id
                        doc_data["groupCode"] = ""
                        doc_data["groupName"] = ""
                        doc_data["isComboRequire"] = False
                        doc_data["isComboOption"] = False
                        doc_data["isComboRoot"] = False
                        col.insert_one(doc_data)
                    updated += 1

            # Ghi Audit log
            try:
                audit = AuditLog(
                    manhinh="GPOS_SHOW_HIDE_ITEMS",
                    noidung=f"Cập nhật cấu hình ẩn/hiện cho {len(payload.dishes)} món trên máy chủ {payload.host}",
                    user_thuchien=current_user.username
                )
                db_session.add(audit)
                db_session.commit()
            except Exception:
                pass

            return DishShowHideSaveResponse(
                success=True,
                message=f"Đã cập nhật thành công cấu hình cho {len(payload.dishes)} món ăn!",
                updated_count=updated
            )
        finally:
            try:
                client.close()
            except Exception:
                pass

    @classmethod
    def get_menu_show_hide(
        cls,
        host: str,
        port: int = 27017
    ) -> MenuShowHideListResponse:
        """
        Lấy danh sách các danh mục menu từ RESTAURANT_CATEGORY kèm theo:
        - Mã SAP, Mã RK7, Tên danh mục, Tên hiển thị phụ
        - Cấu hình 4 switch: CO, SO, QrOrder, KDS (autoDeliveryInSo)
        """
        client = MongoClient(host, port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]

            # Lấy phụ đề từ CO_ORDER_CATEGORY
            co_cats: Dict[str, str] = {}
            if "CO_ORDER_CATEGORY" in db_order.list_collection_names():
                for doc in db_order["CO_ORDER_CATEGORY"].find():
                    c = str(doc.get("code") or "").strip()
                    nv = str(doc.get("nameVn") or "").strip()
                    if c and nv:
                        co_cats[c] = nv

            menus: List[MenuShowHideItem] = []
            auto_kds = 0
            manual_kds = 0

            for doc in db_order["RESTAURANT_CATEGORY"].find():
                mid = int(doc.get("id") or 0)
                code_str = str(doc.get("code") or "").strip()
                name = str(doc.get("name") or "").strip()

                # Tách mã SAP từ ngoặc tròn nếu có (Ví dụ: Alacarte (ASHCM_oc_ALC) -> ASHCM_oc_ALC)
                sap_code = ""
                sap_match = re.search(r"\((.*?)\)", name)
                if sap_match:
                    sap_code = sap_match.group(1).strip()

                rk7_code = code_str or str(mid)
                subtitle = co_cats.get(code_str) or name

                show_co = bool(doc.get("showInCo", True))
                show_so = bool(doc.get("showInSo", True))
                show_qr = bool(doc.get("showInQrOrder", True))
                auto_kds_flag = bool(doc.get("autoDeliveryInSo", True))

                if auto_kds_flag:
                    auto_kds += 1
                else:
                    manual_kds += 1

                menus.append(MenuShowHideItem(
                    id=mid,
                    code=code_str,
                    name=name,
                    subtitle=subtitle,
                    sap_code=sap_code,
                    rk7_code=rk7_code,
                    show_in_co=show_co,
                    show_in_so=show_so,
                    show_in_qr_order=show_qr,
                    auto_delivery_in_so=auto_kds_flag
                ))

            menus.sort(key=lambda x: (not x.auto_delivery_in_so, _remove_vietnamese_tones(x.name)))

            return MenuShowHideListResponse(
                host=host,
                port=port,
                total=len(menus),
                total_auto_kds=auto_kds,
                total_manual_kds=manual_kds,
                menus=menus
            )
        finally:
            try:
                client.close()
            except Exception:
                pass

    @classmethod
    def save_menu_show_hide(
        cls,
        current_user: UserInfo,
        payload: MenuShowHideSaveRequest,
        db_session: Session
    ) -> MenuShowHideSaveResponse:
        """
        Lưu cấu hình ẩn hiện danh mục menu vào RESTAURANT_CATEGORY:
        Cập nhật showInCo, showInSo, showInQrOrder, autoDeliveryInSo (KDS tự động ra món).
        """
        client = MongoClient(payload.host, payload.port, serverSelectionTimeoutMS=4000)
        try:
            db_order = client["G_ORDER"]
            col = db_order["RESTAURANT_CATEGORY"]
            updated = 0

            for m in payload.menus:
                q_list: List[Dict[str, Any]] = [{"id": m.id}]
                if m.code:
                    q_list.append({"code": str(m.code)})
                    if str(m.code).isdigit():
                        q_list.append({"code": int(m.code)})
                query = {"$or": q_list}

                update_fields = {
                    "showInCo": bool(m.show_in_co),
                    "showInSo": bool(m.show_in_so),
                    "showInQrOrder": bool(m.show_in_qr_order),
                    "autoDeliveryInSo": bool(m.auto_delivery_in_so),
                }

                res = col.update_many(query, {"$set": update_fields})
                updated += max(res.modified_count, 1)

            # Ghi Audit Log
            try:
                audit = AuditLog(
                    manhinh="GPOS_RESTAURANT_CATEGORY",
                    noidung=f"Cập nhật cấu hình ẩn/hiện và KDS auto-delivery cho {len(payload.menus)} danh mục menu trên {payload.host}",
                    user_thuchien=current_user.username
                )
                db_session.add(audit)
                db_session.commit()
            except Exception:
                pass

            return MenuShowHideSaveResponse(
                success=True,
                message=f"Đã lưu thành công cấu hình cho {len(payload.menus)} danh mục menu!",
                updated_count=updated
            )
        finally:
            try:
                client.close()
            except Exception:
                pass

    @classmethod
    def scan_transfer_machines(
        cls,
        db: Session,
        payload: MongoScanMachinesRequest
    ) -> MongoScanMachinesResponse:
        """
        Quét danh sách các máy POS/KDS trong nhà hàng có thể kết nối MongoDB (Port 27017).
        Hỗ trợ các IP đuôi .11, .12, .13, .14, .41, .42 và các IP tùy chọn thêm.
        """
        import time

        restaurant_name = None
        target_ip = payload.target_ip

        if payload.restaurant_id is not None:
            r = db.get(Restaurant, payload.restaurant_id)
            if r:
                restaurant_name = r.res
                target_ip = r.ip or r.ip_wan or target_ip

        if not target_ip:
            target_ip = "10.8.0.11"

        subnet = cls.extract_subnet_prefix(target_ip)
        default_tails = get_transfer_default_tails()
        candidate_ips: List[str] = [f"{subnet}{tail}" for tail in default_tails]

        # Thêm extra_ips nếu có (hỗ trợ nhập cả đuôi như 45, .45 hoặc full IP)
        for x_ip in payload.extra_ips:
            cleaned = x_ip.strip()
            if cleaned:
                if re.match(r"^\.?\d{1,3}$", cleaned):
                    full_ip = f"{subnet}{cleaned.lstrip('.')}"
                else:
                    full_ip = cleaned
                if full_ip not in candidate_ips:
                    candidate_ips.append(full_ip)

        machines: List[MongoMachineStatus] = []

        for ip in candidate_ips:
            # 1. Quick TCP check
            is_open = _check_tcp_port(ip, 27017, timeout=1.0)
            if not is_open:
                machines.append(MongoMachineStatus(
                    ip=ip,
                    port=27017,
                    connected=False,
                    error="Port 27017 đóng hoặc không phản hồi"
                ))
                continue

            # 2. Check MongoDB ping & get databases
            try:
                t0 = time.time()
                client = MongoClient(ip, 27017, serverSelectionTimeoutMS=2000)
                client.admin.command("ping")
                ping_ms = round((time.time() - t0) * 1000, 1)

                all_dbs = client.list_database_names()
                user_dbs = [d for d in all_dbs if d not in ["admin", "config", "local"]]
                client.close()

                machines.append(MongoMachineStatus(
                    ip=ip,
                    port=27017,
                    connected=True,
                    ping_ms=ping_ms,
                    databases=user_dbs
                ))
            except Exception as e:
                machines.append(MongoMachineStatus(
                    ip=ip,
                    port=27017,
                    connected=False,
                    error=f"Lỗi giao thức MongoDB: {str(e)}"
                ))

        return MongoScanMachinesResponse(
            restaurant_id=payload.restaurant_id,
            restaurant_name=restaurant_name,
            subnet=subnet,
            machines=machines
        )

    @classmethod
    def inspect_transfer_pair(
        cls,
        payload: MongoInspectPairRequest
    ) -> MongoInspectPairResponse:
        """
        Dò và so sánh cơ sở dữ liệu giữa Máy Nguồn và Máy Đích trước khi chuyển giao.
        Cảnh báo nếu máy đích đã có database trùng lặp.
        Tính toán chi tiết dung lượng ACTION_LOG có thể tối ưu.
        """
        def _inspect_machine(ip: str, port: int) -> MongoMachineInspection:
            try:
                client = MongoClient(ip, port, serverSelectionTimeoutMS=3000)
                client.admin.command("ping")
                all_dbs = client.list_database_names()
                user_dbs = [d for d in all_dbs if d not in ["admin", "config", "local"]]

                db_details: List[MongoDatabaseDetail] = []
                total_docs = 0
                total_size_mb = 0.0

                for db_name in user_dbs:
                    db = client[db_name]
                    cols = [c for c in db.list_collection_names() if not c.startswith("system.")]
                    
                    try:
                        stats = db.command("dbstats")
                        data_bytes = int(stats.get("dataSize", 0))
                        storage_bytes = int(stats.get("storageSize", 0))
                    except Exception:
                        data_bytes = 0
                        storage_bytes = 0

                    db_docs = 0
                    action_log_docs = 0
                    action_log_size_mb = 0.0
                    action_log_bk_docs = 0
                    action_log_bk_size_mb = 0.0

                    for col_name in cols:
                        try:
                            c_stats = db.command("collstats", col_name)
                            c_count = int(c_stats.get("count", 0))
                            c_size = float(c_stats.get("size", 0))
                        except Exception:
                            c_count = int(db[col_name].estimated_document_count())
                            c_size = 0.0

                        db_docs += c_count

                        if col_name == "ACTION_LOG":
                            action_log_docs = c_count
                            action_log_size_mb = round(c_size / (1024 * 1024), 2)
                        elif col_name == "ACTION_LOG_BK":
                            action_log_bk_docs = c_count
                            action_log_bk_size_mb = round(c_size / (1024 * 1024), 2)

                    d_mb = round(data_bytes / (1024 * 1024), 2)
                    s_mb = round(storage_bytes / (1024 * 1024), 2)

                    total_docs += db_docs
                    total_size_mb += d_mb

                    db_details.append(MongoDatabaseDetail(
                        name=db_name,
                        collections_count=len(cols),
                        data_size_bytes=data_bytes,
                        data_size_mb=d_mb,
                        storage_size_mb=s_mb,
                        estimated_docs=db_docs,
                        action_log_docs=action_log_docs,
                        action_log_size_mb=action_log_size_mb,
                        action_log_bk_docs=action_log_bk_docs,
                        action_log_bk_size_mb=action_log_bk_size_mb
                    ))

                client.close()
                return MongoMachineInspection(
                    ip=ip,
                    port=port,
                    connected=True,
                    databases=db_details,
                    total_docs=total_docs,
                    total_size_mb=round(total_size_mb, 2)
                )
            except Exception as e:
                return MongoMachineInspection(
                    ip=ip,
                    port=port,
                    connected=False,
                    error=f"Không thể kết nối MongoDB: {str(e)}"
                )

        src_insp = _inspect_machine(payload.source_ip, payload.source_port)
        dst_insp = _inspect_machine(payload.dest_ip, payload.dest_port)

        src_db_names = [d.name for d in src_insp.databases]
        dst_db_names = [d.name for d in dst_insp.databases]
        conflicts = [d for d in src_db_names if d in dst_db_names]
        has_conflicts = len(conflicts) > 0

        warning_message = None
        if not dst_insp.connected:
            warning_message = f"❌ Máy đích ({payload.dest_ip}) hiện không kết nối được MongoDB. Vui lòng kiểm tra lại dịch vụ mongod trên máy đích."
        elif has_conflicts:
            conflict_str = ", ".join(conflicts)
            warning_message = (
                f"⚠️ CẢNH BÁO QUAN TRỌNG: Máy đích ({payload.dest_ip}) đã có sẵn các database: [{conflict_str}]. "
                f"Khi thực hiện chuyển đổi, toàn bộ dữ liệu của các database này trên máy đích sẽ bị XÓA HOÀN TOÀN để thay thế bằng dữ liệu từ máy nguồn ({payload.source_ip})!"
            )
        else:
            warning_message = f"✅ Máy đích ({payload.dest_ip}) chưa có database trùng lặp. Sẵn sàng tiếp nhận dữ liệu an toàn."

        # Tính toán dung lượng tiết kiệm nếu xóa ACTION_LOG
        action_log_savings_mb = sum(d.action_log_size_mb + d.action_log_bk_size_mb for d in src_insp.databases)
        est_transfer_size_mb = max(0.0, round(src_insp.total_size_mb - action_log_savings_mb, 2))

        return MongoInspectPairResponse(
            source=src_insp,
            dest=dst_insp,
            has_conflicts=has_conflicts,
            conflicting_databases=conflicts,
            warning_message=warning_message,
            estimated_transfer_size_mb=est_transfer_size_mb,
            action_log_savings_mb=round(action_log_savings_mb, 2)
        )

    @classmethod
    def execute_transfer(
        cls,
        payload: MongoTransferExecuteRequest,
        current_user_name: str = "System",
        db_session: Optional[Session] = None
    ) -> MongoTransferExecuteResponse:
        """
        Thực hiện quy trình chuyển toàn bộ cơ sở dữ liệu MongoDB:
        1. Xóa toàn bộ dữ liệu bảng ACTION_LOG (và ACTION_LOG_BK) trên máy nguồn (để tối ưu dung lượng).
        2. Xóa các database trùng lặp trên máy đích (nếu drop_dest_existing = True).
        3. Sao chép từng database, collection (theo chunk 5000 docs) và phục hồi đầy đủ Indexes.
        4. Đối soát số lượng bản ghi máy nguồn vs máy đích.
        5. Ghi Audit Log theo dõi.
        """
        import time
        from datetime import datetime

        t0_total = time.time()
        logs: List[MongoTransferStepLog] = []

        def add_log(step: str, status: str, message: str):
            logs.append(MongoTransferStepLog(
                step=step,
                status=status,
                message=message,
                timestamp=datetime.now().strftime("%H:%M:%S")
            ))

        add_log("Khởi động", "INFO", f"Bắt đầu chuyển database từ máy nguồn {payload.source_ip}:{payload.source_port} sang máy đích {payload.dest_ip}:{payload.dest_port}...")

        src_client = None
        dst_client = None
        cleaned_logs_summary: Dict[str, int] = {}
        dropped_databases: List[str] = []
        transferred_databases: List[str] = []
        collections_transferred: List[MongoTransferCollectionResult] = []
        verification_results: List[Dict[str, Any]] = []

        try:
            src_client = MongoClient(payload.source_ip, payload.source_port, serverSelectionTimeoutMS=4000)
            dst_client = MongoClient(payload.dest_ip, payload.dest_port, serverSelectionTimeoutMS=4000)

            # Test ping
            src_client.admin.command("ping")
            dst_client.admin.command("ping")
            add_log("Kết nối", "SUCCESS", "Kết nối thành công tới cả máy nguồn và máy đích.")

            # ── BƯỚC 1: XÓA ACTION_LOG TRÊN MÁY NGUỒN ĐỂ TỐI ƯU DUNG LƯỢNG ──
            if payload.clean_action_log or payload.clean_action_log_bk or payload.clean_kitchen_action_log:
                add_log("Dọn dẹp Log", "INFO", "Bắt đầu làm sạch các bảng ACTION_LOG trên máy nguồn để giảm dung lượng chuyển...")

                # Trong G_ORDER
                if "G_ORDER" in src_client.list_database_names():
                    order_db = src_client["G_ORDER"]
                    existing_cols = order_db.list_collection_names()

                    if payload.clean_action_log and "ACTION_LOG" in existing_cols:
                        try:
                            c_count = order_db["ACTION_LOG"].count_documents({})
                            old_indexes = order_db["ACTION_LOG"].index_information()
                            order_db.drop_collection("ACTION_LOG")
                            order_db.create_collection("ACTION_LOG")
                            for idx_name, idx_spec in old_indexes.items():
                                if idx_name == "_id_":
                                    continue
                                order_db["ACTION_LOG"].create_index(idx_spec["key"], name=idx_name)
                            cleaned_logs_summary["G_ORDER.ACTION_LOG"] = c_count
                            add_log("Dọn dẹp Log", "SUCCESS", f"Đã xóa sạch {c_count:,} bản ghi trong G_ORDER.ACTION_LOG trên máy nguồn ({payload.source_ip}), giữ nguyên cấu trúc index.")
                        except Exception as ex_log:
                            add_log("Dọn dẹp Log", "WARNING", f"Lỗi khi xóa G_ORDER.ACTION_LOG: {str(ex_log)}")

                    if payload.clean_action_log_bk and "ACTION_LOG_BK" in existing_cols:
                        try:
                            c_count_bk = order_db["ACTION_LOG_BK"].count_documents({})
                            old_indexes_bk = order_db["ACTION_LOG_BK"].index_information()
                            order_db.drop_collection("ACTION_LOG_BK")
                            order_db.create_collection("ACTION_LOG_BK")
                            for idx_name, idx_spec in old_indexes_bk.items():
                                if idx_name == "_id_":
                                    continue
                                order_db["ACTION_LOG_BK"].create_index(idx_spec["key"], name=idx_name)
                            cleaned_logs_summary["G_ORDER.ACTION_LOG_BK"] = c_count_bk
                            add_log("Dọn dẹp Log", "SUCCESS", f"Đã xóa sạch {c_count_bk:,} bản ghi trong G_ORDER.ACTION_LOG_BK trên máy nguồn ({payload.source_ip}).")
                        except Exception as ex_log_bk:
                            add_log("Dọn dẹp Log", "WARNING", f"Lỗi khi xóa G_ORDER.ACTION_LOG_BK: {str(ex_log_bk)}")

                # Trong G_KITCHEN
                if payload.clean_kitchen_action_log and "G_KITCHEN" in src_client.list_database_names():
                    kitchen_db = src_client["G_KITCHEN"]
                    if "ACTION_LOG" in kitchen_db.list_collection_names():
                        try:
                            c_count_k = kitchen_db["ACTION_LOG"].count_documents({})
                            old_idx_k = kitchen_db["ACTION_LOG"].index_information()
                            kitchen_db.drop_collection("ACTION_LOG")
                            kitchen_db.create_collection("ACTION_LOG")
                            for idx_name, idx_spec in old_idx_k.items():
                                if idx_name == "_id_":
                                    continue
                                kitchen_db["ACTION_LOG"].create_index(idx_spec["key"], name=idx_name)
                            cleaned_logs_summary["G_KITCHEN.ACTION_LOG"] = c_count_k
                            add_log("Dọn dẹp Log", "SUCCESS", f"Đã xóa sạch {c_count_k:,} bản ghi trong G_KITCHEN.ACTION_LOG trên máy nguồn ({payload.source_ip}).")
                        except Exception as ex_k:
                            add_log("Dọn dẹp Log", "WARNING", f"Lỗi khi xóa G_KITCHEN.ACTION_LOG: {str(ex_k)}")

            # ── BƯỚC 2: XÓA SẠCH DATABASE CŨ TRÊN MÁY ĐÍCH NẾU CÓ ──
            if payload.drop_dest_existing:
                add_log("Dọn máy đích", "INFO", "Kiểm tra và xóa các database cũ trên máy đích trước khi nạp dữ liệu...")
                dest_existing_dbs = dst_client.list_database_names()
                for db_name in payload.selected_databases:
                    if db_name in dest_existing_dbs:
                        dst_client.drop_database(db_name)
                        dropped_databases.append(db_name)
                        add_log("Dọn máy đích", "WARNING", f"Đã xóa bỏ hoàn toàn database cũ '{db_name}' trên máy đích {payload.dest_ip}.")

            # ── BƯỚC 3: SAO CHÉP DỮ LIỆU TỪ MÁY NGUỒN SANG MÁY ĐÍCH ──
            src_avail_dbs = src_client.list_database_names()
            for db_name in payload.selected_databases:
                if db_name not in src_avail_dbs:
                    add_log("Bỏ qua", "WARNING", f"Database '{db_name}' không tồn tại trên máy nguồn ({payload.source_ip}), bỏ qua.")
                    continue

                src_db = src_client[db_name]
                dst_db = dst_client[db_name]
                cols = [c for c in src_db.list_collection_names() if not c.startswith("system.")]

                add_log("Chuyển dữ liệu", "INFO", f"Đang sao chép database '{db_name}' ({len(cols)} collections) sang máy đích...")

                for col_name in cols:
                    t_col_start = time.time()
                    src_col = src_db[col_name]
                    dst_col = dst_db[col_name]

                    batch = []
                    docs_transferred = 0

                    for doc in src_col.find({}):
                        batch.append(doc)
                        if len(batch) >= 5000:
                            dst_col.insert_many(batch, ordered=False)
                            docs_transferred += len(batch)
                            batch.clear()

                    if batch:
                        dst_col.insert_many(batch, ordered=False)
                        docs_transferred += len(batch)
                        batch.clear()

                    # Sao chép Indexes
                    idx_created = 0
                    try:
                        src_indexes = src_col.index_information()
                        for idx_name, idx_spec in src_indexes.items():
                            if idx_name == "_id_":
                                continue
                            keys = idx_spec["key"]
                            clean_opts = {k: v for k, v in idx_spec.items() if k not in ["key", "v", "ns"]}
                            try:
                                dst_col.create_index(keys, **clean_opts)
                                idx_created += 1
                            except Exception as idx_err:
                                add_log("Index", "WARNING", f"Không tạo được index '{idx_name}' trên {db_name}.{col_name}: {str(idx_err)}")
                    except Exception:
                        pass

                    dur = round(time.time() - t_col_start, 2)
                    collections_transferred.append(MongoTransferCollectionResult(
                        database=db_name,
                        collection=col_name,
                        docs_count=docs_transferred,
                        indexes_count=idx_created,
                        duration_seconds=dur
                    ))

                transferred_databases.append(db_name)
                add_log("Chuyển dữ liệu", "SUCCESS", f"Hoàn tất sao chép database '{db_name}' ({len(cols)} collections) sang máy đích!")

            # ── BƯỚC 4: ĐỐI SOÁT DỮ LIỆU SAU KHI CHUYỂN ──
            add_log("Đối soát", "INFO", "Tiến hành đối soát số lượng bản ghi giữa máy nguồn và máy đích...")
            for db_name in transferred_databases:
                src_db = src_client[db_name]
                dst_db = dst_client[db_name]
                
                src_cols = [c for c in src_db.list_collection_names() if not c.startswith("system.")]
                src_total = sum(src_db[c].estimated_document_count() for c in src_cols)
                
                dst_cols = [c for c in dst_db.list_collection_names() if not c.startswith("system.")]
                dst_total = sum(dst_db[c].estimated_document_count() for c in dst_cols)

                is_match = (src_total == dst_total)
                verification_results.append({
                    "database": db_name,
                    "source_collections": len(src_cols),
                    "dest_collections": len(dst_cols),
                    "source_docs": src_total,
                    "dest_docs": dst_total,
                    "match": is_match
                })

                if is_match:
                    add_log("Đối soát", "SUCCESS", f"Database '{db_name}': Số bản ghi máy đích ({dst_total:,}) khớp 100% với máy nguồn.")
                else:
                    add_log("Đối soát", "WARNING", f"Database '{db_name}': Máy nguồn ({src_total:,}) vs Máy đích ({dst_total:,}). Chênh lệch có thể do POS đang ghi đơn mới.")

            # ── BƯỚC 5: GHI AUDIT LOG ──
            if db_session:
                try:
                    summary_dbs = ", ".join(transferred_databases)
                    audit = AuditLog(
                        manhinh="MONGO_TRANSFER_DATABASE",
                        noidung=f"Chuyển database [{summary_dbs}] từ {payload.source_ip} sang {payload.dest_ip}. Xóa action log: {payload.clean_action_log}",
                        user_thuchien=current_user_name
                    )
                    db_session.add(audit)
                    db_session.commit()
                except Exception:
                    pass

            total_duration = round(time.time() - t0_total, 2)
            add_log("Hoàn tất", "SUCCESS", f"Toàn bộ quy trình chuyển {len(transferred_databases)} database đã hoàn tất thành công trong {total_duration} giây!")

            return MongoTransferExecuteResponse(
                success=True,
                message=f"Đã chuyển thành công {len(transferred_databases)} database từ {payload.source_ip} sang {payload.dest_ip} trong {total_duration}s!",
                total_duration_seconds=total_duration,
                cleaned_logs_summary=cleaned_logs_summary,
                dropped_databases=dropped_databases,
                transferred_databases=transferred_databases,
                collections_transferred=collections_transferred,
                verification_results=verification_results,
                logs=logs
            )

        except Exception as e:
            add_log("Lỗi nghiêm trọng", "ERROR", f"Quá trình chuyển database thất bại: {str(e)}")
            total_duration = round(time.time() - t0_total, 2)
            return MongoTransferExecuteResponse(
                success=False,
                message=f"Lỗi khi chuyển database: {str(e)}",
                total_duration_seconds=total_duration,
                cleaned_logs_summary=cleaned_logs_summary,
                dropped_databases=dropped_databases,
                transferred_databases=transferred_databases,
                collections_transferred=collections_transferred,
                verification_results=verification_results,
                logs=logs
            )
        finally:
            if src_client:
                try:
                    src_client.close()
                except Exception:
                    pass
            if dst_client:
                try:
                    dst_client.close()
                except Exception:
                    pass


async def param_schedule_worker(stop_event: asyncio.Event):
    """
    Tiến trình nền kiểm tra các tác vụ SCHEDULED_PARAM_PUSH_JOBS trạng thái PENDING.
    Nếu run_date <= hôm nay và run_time <= giờ hiện tại (theo giờ hệ thống local YYYY-MM-DD HH:mm),
    sẽ tự động kích hoạt thực thi MongoDBService.execute_scheduled_param_job.
    """
    logger.info("Khởi động tiến trình nền Scheduled Param Push Worker...")
    while not stop_event.is_set():
        try:
            from app.core.database import SessionLocal
            jobs_to_trigger = []
            with SessionLocal() as db:
                now_dt = datetime.datetime.now()
                today_str = now_dt.strftime("%Y-%m-%d")
                curr_time_str = now_dt.strftime("%H:%M")

                pending_jobs = db.query(ScheduledParamPushJob).filter(
                    ScheduledParamPushJob.status == "PENDING"
                ).all()

                for job in pending_jobs:
                    should_run = False
                    if job.run_date < today_str:
                        should_run = True
                    elif job.run_date == today_str and job.run_time <= curr_time_str:
                        should_run = True

                    if should_run:
                        # Đánh dấu RUNNING ngay trong DB để không quét trùng ở chu kỳ tiếp theo
                        job.status = "RUNNING"
                        jobs_to_trigger.append((job.id, job.job_title, job.run_date, job.run_time))

                if jobs_to_trigger:
                    db.commit()

            # Chạy các jobs trong worker thread pool riêng biệt, KHÔNG block asyncio event loop
            for j_id, j_title, j_date, j_time in jobs_to_trigger:
                logger.info("Kích hoạt chạy job hẹn giờ đẩy param: #%s '%s' (%s %s)", j_id, j_title, j_date, j_time)
                asyncio.create_task(
                    asyncio.to_thread(
                        MongoDBService.execute_scheduled_param_job_by_id,
                        job_id=j_id,
                        triggered_by="System (Scheduler)"
                    )
                )

        except Exception as e:
            logger.error("Lỗi trong param_schedule_worker: %s", e)

        # Chờ 20 giây kiểm tra 1 lần hoặc khi stop_event được kích hoạt
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=20.0)
        except asyncio.TimeoutError:
            pass

    logger.info("Dừng tiến trình Scheduled Param Push Worker.")








