from __future__ import annotations
from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class MongoCandidateStatus(BaseModel):
    ip: str
    port: int = 27017
    status: str  # "OPEN" | "CLOSED"
    message: str
    is_kds: Optional[bool] = False
    kds_dish_count: Optional[int] = 0
    role_hint: Optional[str] = None


class MongoConnectionCheckRequest(BaseModel):
    restaurant_id: Optional[int] = None
    ip: Optional[str] = None


class MongoConnectionCheckResponse(BaseModel):
    restaurant_id: Optional[int] = None
    restaurant_name: Optional[str] = None
    subnet: str
    candidates: List[MongoCandidateStatus]
    connected_ip: Optional[str] = None
    connected_ips: List[str] = []
    is_connected: bool = False
    error_message: Optional[str] = None


class AppParamItem(BaseModel):
    id: Optional[str] = None
    paramCode: str
    paramName: Optional[str] = None
    paramType: str = "FUNCTION"  # FUNCTION or CONFIG
    status: int = 1
    value: Optional[str] = ""
    note: Optional[str] = ""
    checkTimeRange: Optional[Any] = None


class AppParamUpdateRequest(BaseModel):
    host: str
    port: int = 27017
    paramName: Optional[str] = None
    paramType: str = Field(..., description="Chỉ nhận FUNCTION hoặc CONFIG")
    status: int = Field(..., ge=0, le=1)
    value: Optional[str] = ""
    note: Optional[str] = ""


class AppParamCreateRequest(BaseModel):
    host: str
    port: int = 27017
    paramCode: str
    paramName: Optional[str] = None
    paramType: str = Field(..., description="Chỉ nhận FUNCTION hoặc CONFIG")
    status: int = Field(default=1, ge=0, le=1)
    value: Optional[str] = ""
    note: Optional[str] = ""


class StandardAppParamItem(BaseModel):
    id: Optional[int] = None
    param_code: str
    param_name: str
    param_type: str = "FUNCTION"
    status: int = 1
    param_value: Optional[str] = ""
    note: Optional[str] = ""
    category: Optional[str] = None
    priority: int = 0
    nguoi_tao: Optional[str] = None
    nguoi_update: Optional[str] = None
    ngay_tao: Optional[datetime] = None
    ngay_update: Optional[datetime] = None


class StandardAppParamCreateRequest(BaseModel):
    param_code: str
    param_name: str
    param_type: str = Field(default="FUNCTION", description="Chỉ nhận FUNCTION hoặc CONFIG")
    status: int = Field(default=1, ge=0, le=1)
    param_value: Optional[str] = ""
    note: Optional[str] = ""
    category: Optional[str] = None
    priority: int = 0


class StandardAppParamUpdateRequest(BaseModel):
    param_name: Optional[str] = None
    param_type: Optional[str] = Field(None, description="Chỉ nhận FUNCTION hoặc CONFIG")
    status: Optional[int] = Field(None, ge=0, le=1)
    param_value: Optional[str] = None
    note: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None


class SaveStandardParamsFromRestaurantRequest(BaseModel):
    host: str
    port: int = 27017
    selected_param_codes: Optional[List[str]] = None


class ApplyStandardParamsToRestaurantRequest(BaseModel):
    host: str
    port: int = 27017
    mode: str = Field(default="skip_existing", description="'overwrite' hoặc 'skip_existing'")
    selected_param_codes: Optional[List[str]] = None


class ApplyStandardParamsResponse(BaseModel):
    success: bool
    message: str
    inserted_count: int = 0
    overwritten_count: int = 0
    skipped_count: int = 0
    total_standard: int = 0
    restaurant_host: str


class SaveSingleStandardParamRequest(BaseModel):
    param_code: str
    param_name: Optional[str] = None
    param_type: str = Field(default="FUNCTION", description="FUNCTION hoặc CONFIG")
    status: int = Field(default=1, ge=0, le=1)
    param_value: Optional[str] = ""
    note: Optional[str] = ""
    category: Optional[str] = None
    priority: int = 0


class BatchTargetRestaurantItem(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    sap_code: Optional[str] = None
    rk7_code: Optional[str] = None
    ip: str
    port: int = 27017


class BatchApplyParamsRequest(BaseModel):
    target_restaurants: List[BatchTargetRestaurantItem]
    mode: str = Field(default="upsert", description="'upsert' (Cập nhật cũ & thêm mới), 'overwrite' (Đè luôn cũ), 'skip_existing' (Giữ nguyên cũ)")
    selected_param_codes: Optional[List[str]] = None
    custom_params: Optional[List[Dict[str, Any]]] = None


class BatchApplyRestaurantResult(BaseModel):
    restaurant_name: str
    ip: str
    raw_ip: Optional[str] = None
    sap_code: Optional[str] = None
    rk7_code: Optional[str] = None
    success: bool
    inserted: int = 0
    updated: int = 0
    skipped: int = 0
    error: Optional[str] = None
    device_results: Optional[List[Dict[str, Any]]] = None


class BatchApplyParamsResponse(BaseModel):
    success: bool
    message: str
    total_restaurants: int
    success_count: int
    failed_count: int
    details: List[BatchApplyRestaurantResult]


class ScheduledParamJobItem(BaseModel):
    id: int
    job_title: str
    run_date: str
    run_time: str
    mode: str
    target_restaurants: List[Dict[str, Any]]
    params_payload: List[Dict[str, Any]]
    status: str
    total_restaurants: int = 0
    success_count: int = 0
    failed_count: int = 0
    result_summary: Optional[List[Dict[str, Any]]] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None


class ScheduledParamJobCreateRequest(BaseModel):
    job_title: str
    run_date: str
    run_time: str
    mode: str = Field(default="upsert", description="'upsert', 'overwrite', 'skip_existing'")
    target_restaurants: List[BatchTargetRestaurantItem]
    selected_param_codes: Optional[List[str]] = None
    custom_params: Optional[List[Dict[str, Any]]] = None



class MongoKitchenCollectionInfo(BaseModel):
    name: str
    count: int


class KitchenOverviewResponse(BaseModel):
    host: str
    port: int
    collections: List[MongoKitchenCollectionInfo]
    total_collections: int


class KitchenAccountGroup(BaseModel):
    account_id: str
    account_name: str
    acc_pass: Optional[str] = None        # mật khẩu đăng nhập quầy bếp
    place_ids: List[int] = []
    dish_count: int = 0
    role: Optional[int] = None
    is_orphan: Optional[bool] = False


class KdsItemDish(BaseModel):
    menu_item_code: str
    sap_code: Optional[str] = None
    menu_item_name: str
    single_cooking_time: int = 0
    cooking_time_display: str = "0s"
    group_type_kds: Optional[str] = None
    place_ids: List[int] = []
    quays: List[str] = []
    printers: List[str] = []
    printer_display: str = ""
    price_order: Optional[float] = None
    price_show_hide: Optional[float] = None
    price_out_of_dish: Optional[float] = None
    final_price: Optional[float] = None
    price_status: str = "MATCH"  # "MATCH" | "DIFF" | "NO_PRICE"
    note: Optional[str] = None


class KdsItemsResponse(BaseModel):
    host: str
    port: int
    total: int
    configured_time_count: int
    diff_price_count: int
    match_price_count: int
    no_price_count: int
    accounts_summary: List[KitchenAccountGroup] = []
    kds_master_status: int = 1
    kds_master_enabled: bool = True
    items: List[KdsItemDish]


class KdsCookingTimeUpdateRequest(BaseModel):
    host: str
    port: int = 27017
    menu_item_code: str
    single_cooking_time: int = Field(..., ge=0, description="Thời gian chế biến tính bằng giây (>= 0)")
    sap_code: Optional[str] = None


class KdsCookingTimeUpdateResponse(BaseModel):
    success: bool
    menu_item_code: str
    menu_item_name: str
    old_cooking_time: int
    old_cooking_time_display: str
    new_cooking_time: int
    new_cooking_time_display: str
    modified_count: int
    message: str


class KdsPlaceItem(BaseModel):
    id: int
    name: str
    place_code: str = ""
    printer: str = ""
    driver_name: str = ""
    type: str = "BEP"
    hall_plan_ids: List[int] = []
    account_names: List[str] = []
    dish_count: int = 0
    is_in_food_control: bool = False
    is_orphan: Optional[bool] = False
    role: Optional[int] = 3
    role_desc: Optional[str] = ""
    print_on_done: Optional[bool] = True
    account_id: Optional[str] = ""


class KdsToggleFoodControlRequest(BaseModel):
    host: str
    port: int = 27017
    place_id: int
    action: str = "include"  # "include", "exclude", "to_role_1", "to_role_3", "role_1", "role_3", "direct"
    target_role: Optional[int] = None


class KdsToggleFoodControlResponse(BaseModel):
    success: bool
    place_id: int
    place_name: str = ""
    is_in_food_control: bool
    role: int = 3
    print_on_done: bool = True
    message: str


class KdsRoleUserItem(BaseModel):
    user_code: str
    employee_id: Optional[int] = None
    employee_name: Optional[str] = None
    status: Optional[int] = None
    status_desc: Optional[str] = None
    is_in_role: bool = True


class KdsRoleUsersResponse(BaseModel):
    param_code: str = "ROLE_SETUP_CONFIG_COOKING"
    param_name: str = "ROLE_SETUP_CONFIG_COOKING"
    param_type: str = "CONFIG"
    status: int = 1
    is_enabled: bool = True
    raw_value: str = ""
    total_users: int = 0
    note: Optional[str] = None
    show_kds_status: int = 1
    show_kds_enabled: bool = True
    allow_hide_item_group_status: int = 1
    allow_hide_item_group_enabled: bool = True
    allow_hide_item_group_value: str = "1"
    restaurant_users: List[KdsRoleUserItem] = []
    authorized_users: List[KdsRoleUserItem] = []
    available_employees: List[KdsRoleUserItem] = []


class KdsMasterStatusResponse(BaseModel):
    host: str
    port: int = 27017
    param_code: str = "SHOW_KDS"
    param_name: str = "SHOW_KDS"
    param_type: str = "FUNCTION"
    status: int = 1
    value: str = "1"
    is_enabled: bool = True
    note: Optional[str] = "SHOW_KDS"
    message: Optional[str] = None


class KdsMasterStatusToggleRequest(BaseModel):
    host: str
    port: int = 27017
    status: int  # 1 (Bật) | 0 (Tắt)


class KdsRoleUserActionRequest(BaseModel):
    host: str
    port: int = 27017
    user_code: Optional[str] = ""
    user_codes: Optional[List[str]] = []
    param_code: str = "ROLE_SETUP_CONFIG_COOKING"


class KdsRoleToggleStatusRequest(BaseModel):
    host: str
    port: int = 27017
    status: int
    param_code: str = "ROLE_SETUP_CONFIG_COOKING"


class BatchRoleUserActionRequest(BaseModel):
    restaurant_ids: List[int]
    param_code: str = "ROLE_SETUP_SHOW_HIDE_ITEM"
    status_action: str = "ENABLE"  # "ENABLE" | "DISABLE" | "KEEP"
    user_action: str = "NONE"       # "NONE" | "APPEND" | "REPLACE" | "REMOVE"
    user_codes: List[str] = []


class BatchRoleUserRestaurantResult(BaseModel):
    restaurant_id: int
    restaurant_sap: Optional[str] = None
    restaurant_name: Optional[str] = None
    host: Optional[str] = None
    status: str  # "SUCCESS" | "FAILED" | "SKIPPED"
    message: str
    old_status: Optional[int] = None
    new_status: Optional[int] = None
    old_users_count: Optional[int] = 0
    new_users_count: Optional[int] = 0
    raw_value: Optional[str] = None


class BatchRoleUserActionResponse(BaseModel):
    total_requested: int
    total_processed: int
    success_count: int
    failed_count: int
    param_code: str
    status_action: str
    user_action: str
    items: List[BatchRoleUserRestaurantResult]




class KdsPlaceListResponse(BaseModel):
    host: str
    port: int
    places: List[KdsPlaceItem] = []
    printers: List[str] = []


class KdsPlaceCreateRequest(BaseModel):
    host: str
    port: int = 27017
    place_name: str
    place_code: Optional[str] = None
    printer: str
    account_name: Optional[str] = None
    account_id: Optional[str] = None
    password: Optional[str] = "1"
    group_kds: Optional[str] = None


class KdsPlaceCreateResponse(BaseModel):
    success: bool
    place_id: int
    place_name: str
    place_code: str
    printer: str
    account_name: str
    account_id: str
    message: str


class KdsCreateFoodControlRequest(BaseModel):
    host: str
    port: int = 27017
    account_name: str = "Food control"
    account_id: str = "101"
    password: str = "1"
    place_name: str = "Food control"
    place_code: str = "FOOD_CONTROL"
    printer: Optional[str] = "KDS"


class KdsCreateFoodControlResponse(BaseModel):
    success: bool
    account_id: str
    account_name: str
    place_id: int
    linked_places_count: int
    message: str


class KdsAssignDishQuayRequest(BaseModel):
    host: str
    port: int = 27017
    menu_item_codes: List[str]
    place_ids: List[int]
    mode: str = "replace"  # "replace" or "append"
    group_type_kds: Optional[str] = None  # Nhóm Bếp tùy chọn (VD: NÓNG, SALAD, NƯỚNG...)


class KdsAssignDishQuayResponse(BaseModel):
    success: bool
    modified_count: int
    message: str


class KdsDishLookupResponse(BaseModel):
    code: str
    found: bool = False
    name: Optional[str] = None
    sap_code: Optional[str] = None
    price: Optional[float] = None
    group_name: Optional[str] = None
    menu_name: Optional[str] = None
    in_kds: bool = False
    kds_id: Optional[int] = None
    kds_place_ids: List[int] = []
    kds_place_names: List[str] = []
    kds_group_type: Optional[str] = None
    kds_cooking_time: Optional[int] = None
    kds_cooking_time_str: Optional[str] = None
    message: Optional[str] = None


class KdsAddDishItem(BaseModel):
    menu_item_code: str
    menu_item_name: Optional[str] = None
    place_ids: List[int] = []
    single_cooking_time: int = 600  # seconds (mặc định 10 phút = 600s)
    group_type_kds: Optional[str] = None
    sap_code: Optional[str] = None


class KdsAddDishesRequest(BaseModel):
    host: str
    port: int = 27017
    dishes: List[KdsAddDishItem]
    overwrite_if_exists: bool = True


class KdsAddDishesResponse(BaseModel):
    success: bool
    message: str
    added_count: int
    updated_count: int
    total_count: int
    details: List[dict] = []



class KdsTransferQuayRequest(BaseModel):
    host: str
    port: int = 27017
    from_place_id: int
    to_place_id: int
    menu_item_codes: Optional[List[str]] = None  # None hoặc rỗng = chuyển tất cả món
    keep_source: bool = False  # False: chuyển hẳn (rút quầy nguồn), True: giữ cả 2


class KdsTransferQuayResponse(BaseModel):
    success: bool
    modified_count: int
    from_place_name: str = ""
    to_place_name: str = ""
    message: str


class KdsLogQueryRequest(BaseModel):
    host: str
    port: int = 27017
    date: str  # YYYY-MM-DD
    table: Optional[str] = None
    query: Optional[str] = None
    from_time: Optional[str] = None
    to_time: Optional[str] = None
    limit: int = 300


class KdsLogItem(BaseModel):
    id: str
    table_name: str
    dish_name: str
    menu_item_code: str
    sap_code: str
    place_name: str
    group_name: Optional[str] = None
    historical_place_ids: Optional[List[int]] = None
    is_unassigned: bool = False
    account_name: Optional[str] = None
    order_time: Optional[str] = None
    done_time: Optional[str] = None
    actual_minutes: float = 0.0
    config_minutes: float = 0.0
    delay_minutes: float = 0.0
    status_label: str = "Kịp giờ"
    source_collection: str = "LOG_DISH_FINISH_ITEM"
    printer_name: Optional[str] = None
    print_status: Optional[str] = None
    print_message: Optional[str] = None


class KdsLogQueryResponse(BaseModel):
    success: bool
    total: int
    date: str
    table_filter: Optional[str] = None
    query_filter: Optional[str] = None
    logs: List[KdsLogItem]
    message: str = ""


# ══════════════════════════════════════════════════════════════
# SCHEMAS: PHÂN TÍCH MÓN VÀO BẾP KDS (THEO MÓN & THEO LƯỢT)
# ══════════════════════════════════════════════════════════════
class KdsKitchenIntakeAnalysisRequest(BaseModel):
    host: str
    port: int = 27017
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    place_id: Optional[int] = None  # None = Tất cả các quầy


class KdsKitchenIntakePlaceStat(BaseModel):
    place_id: Optional[int] = None
    place_name: str
    total_dishes: int = 0          # Tổng số món (theo món)
    total_batches: int = 0         # Tổng số lượt gửi vào bếp (theo lượt)
    avg_dishes_per_batch: float = 0.0
    percentage: float = 0.0        # Tỷ lệ % số món so với toàn nhà hàng


class KdsKitchenIntakeDateStat(BaseModel):
    date: str                      # YYYY-MM-DD
    total_dishes: int = 0          # Tổng số món trong ngày
    total_batches: int = 0         # Tổng số lượt trong ngày
    avg_dishes_per_batch: float = 0.0


class KdsKitchenIntakeHourStat(BaseModel):
    hour: int                      # 0..23
    hour_label: str                # Ví dụ "11:00 - 12:00"
    total_dishes: int = 0
    total_batches: int = 0


class KdsKitchenIntakeAnalysisResponse(BaseModel):
    success: bool
    message: str = ""
    start_date: str
    end_date: str
    total_days: int = 1
    total_dishes: int = 0          # Thống kê chế độ "Theo Món"
    total_batches: int = 0         # Thống kê chế độ "Theo Lượt"
    avg_dishes_per_batch: float = 0.0
    by_places: List[KdsKitchenIntakePlaceStat] = []
    by_dates: List[KdsKitchenIntakeDateStat] = []
    by_hours: List[KdsKitchenIntakeHourStat] = []
    source_collection: str = "G_KITCHEN.LOG_DISH_FINISH_ITEM & DISH_KDS"




class KdsDishHistoryRequest(BaseModel):
    host: str
    port: int = 27017
    item_code: str
    sap_code: Optional[str] = None
    dish_name: Optional[str] = None


class KdsDishHistoryTimelineItem(BaseModel):
    id: str
    order_time: str
    done_time: str
    table_name: str
    place_ids: List[int] = []
    place_name: str
    group_name: str
    config_minutes: float = 0.0
    actual_minutes: float = 0.0
    delay_minutes: float = 0.0
    status_label: str
    printer_name: Optional[str] = None
    source: str = "LOG_DISH_FINISH_ITEM"


class KdsDishHistoryResponse(BaseModel):
    success: bool
    dish_name: str
    item_code: str
    sap_code: str
    is_in_config_cooking: bool
    current_place_ids: List[int] = []
    current_place_names: List[str] = []
    current_group_name: str = ""
    current_config_minutes: float = 0.0
    is_hidden: bool = False
    is_out_of_stock: bool = False
    total_timeline_orders: int = 0
    timeline: List[KdsDishHistoryTimelineItem] = []
    smart_analysis: str = ""
    message: str = ""


class KdsSyncGroupsByQuaysRequest(BaseModel):
    host: str
    port: int = 27017


class KdsSyncGroupsByQuaysResponse(BaseModel):
    success: bool
    modified_count: int
    message: str
    deleted_count: Optional[int] = 0


class KdsUpdateDishGroupRequest(BaseModel):
    host: str
    port: int = 27017
    menu_item_codes: List[str]
    new_group_name: str = ""


class KdsUpdateDishGroupResponse(BaseModel):
    success: bool
    modified_count: int
    message: str


class KdsDeleteCookingConfigRequest(BaseModel):
    host: str
    port: int = 27017
    menu_item_codes: List[str]


class KdsDeleteCookingConfigResponse(BaseModel):
    success: bool
    deleted_count: int
    message: str


class KdsUpdatePlacePrinterRequest(BaseModel):
    host: str
    port: int = 27017
    place_id: int
    printer: str


class KdsUpdatePlacePrinterResponse(BaseModel):
    success: bool
    place_id: int
    printer: str
    message: str


class KdsPlaceDeleteRequest(BaseModel):
    host: str
    port: int = 27017
    place_id: int


class KdsPlaceDeleteResponse(BaseModel):
    success: bool
    place_id: int
    place_name: str = ""
    deleted_account: bool = False
    dishes_cleared_count: int = 0
    message: str


class KdsRenamePlaceRequest(BaseModel):
    host: str
    port: int = 27017
    place_id: int
    new_name: str


class KdsRenamePlaceResponse(BaseModel):
    success: bool
    place_id: int
    old_name: str = ""
    new_name: str
    new_place_code: str
    message: str


class MasterDataSyncLogItem(BaseModel):
    id: Optional[int] = None
    collection: str
    date_timestamp: Optional[int] = None
    date_formatted: str = ""
    time_ago: Optional[str] = None
    log_mess: str = ""
    total_time_ms: Optional[int] = None
    total_time_display: str = ""
    is_success: bool = True


class MasterDataSyncLogResponse(BaseModel):
    host: str
    port: int
    db_name: str
    available_dbs: List[str] = ["G_ORDER", "G_KITCHEN"]
    total_records: int
    returned_records: int
    latest_sync_time: Optional[str] = None
    latest_sync_status: Optional[str] = None
    success_count: int
    error_count: int
    items: List[MasterDataSyncLogItem]


class TableReportItem(BaseModel):
    restaurant_id: int
    sap_code: str
    restaurant_name: str
    mongo_ip: str
    total_tables: int
    hall_name: str
    hall_id: Optional[int] = None
    tables_sample: str
    table_names: List[str] = []
    error: Optional[str] = None


class TableReportResponse(BaseModel):
    total_restaurants: int
    total_records: int
    total_tables_sum: int
    split_by_hall: bool
    items: List[TableReportItem]


class MongoCollectionInfo(BaseModel):
    name: str
    count: int
    sample_fields: List[str] = []


class MongoDbOverviewResponse(BaseModel):
    host: str
    port: int
    db_name: str
    available_dbs: List[str] = ["G_ORDER", "G_KITCHEN"]
    collections: List[MongoCollectionInfo]
    total_collections: int


class MongoCollectionPreviewResponse(BaseModel):
    host: str
    port: int
    db_name: str
    collection_name: str
    total_count: int
    documents: List[Dict[str, Any]]


class LockedTableItem(BaseModel):
    order_id: Optional[int] = None
    guid: str
    table_name: str
    status: int = 1
    status_desc: str = "Đang phục vụ"
    lock_order: bool = False
    locked: Optional[str] = None
    is_lock: bool = False
    locked_by_user_code: Optional[str] = None
    locked_by_user_name: Optional[str] = None
    active_users: List[str] = []
    open_time: Optional[int] = None
    open_time_str: Optional[str] = None


class RestaurantLockStatusResponse(BaseModel):
    restaurant_id: Optional[int] = None
    sap_code: str = ""
    restaurant_name: str = ""
    mongo_ip: str
    is_connected: bool = True
    password_exit_table: Optional[str] = None
    role_unlock_order: Optional[str] = None
    total_locked_tables: int = 0
    locked_orders_in_lock_order_col: int = 0
    locked_tables: List[LockedTableItem] = []
    message: Optional[str] = None
    date_filter: str = "today"
    filter_date_str: Optional[str] = None
    overnight_hanging_count: int = 0
    overnight_tables: List[str] = []
    orphan_locks_count: int = 0


class ClearTableLockRequest(BaseModel):
    restaurant_id: Optional[int] = None
    host: Optional[str] = None
    port: int = 27017
    guid: Optional[str] = None
    table_name: Optional[str] = None
    reopen_pre_payment: bool = False
    clean_orphan_locks: bool = True
    action: Optional[str] = None  # 'clear_locks' | 'clean_orphans_only'


class ClearTableLockResponse(BaseModel):
    success: bool
    message: str
    deleted_from_lock_order: int = 0
    updated_orders: int = 0
    orphan_cleaned_count: int = 0
    cleared_tables: List[str] = []
    host: str


class VoucherItem(BaseModel):
    code: str
    name: Optional[str] = None
    discount_amount: Optional[float] = 0.0
    partner_name: Optional[str] = None
    channel: Optional[str] = None
    kind: Optional[str] = None


class CustomerInfoItem(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    member_code: Optional[str] = None
    card_number: Optional[str] = None
    guest_count: Optional[int] = None
    adult_count: Optional[int] = None
    child_count: Optional[int] = None


class PaymentInfoItem(BaseModel):
    is_paid: bool = False
    paid_time: Optional[int] = None
    paid_time_str: Optional[str] = None
    paid_amount: float = 0.0
    payment_method: Optional[str] = None
    payment_code: Optional[str] = None
    channel: Optional[str] = None
    print_bill_from: Optional[int] = None
    qr_payments: List[Dict[str, Any]] = []


class VatInfoItem(BaseModel):
    has_vat_request: bool = False
    vat_status_desc: str = "Không yêu cầu xuất VAT"
    vat_amount: float = 0.0
    qr_vat_url: Optional[str] = None
    qr_vat_desc: Optional[str] = None


class ActionLogSessionItem(BaseModel):
    guid: str
    table_name: Optional[str] = None
    order_id: Optional[int] = None
    status: Optional[int] = None
    status_desc: Optional[str] = None
    total_amount: Optional[float] = 0.0
    waiter_name: Optional[str] = None
    customer_name: Optional[str] = None
    payment_method: Optional[str] = None
    paid_time_str: Optional[str] = None
    take_tax: bool = False
    has_voucher: bool = False
    voucher_count: int = 0
    first_time: Optional[int] = None
    first_time_str: Optional[str] = None
    last_time: Optional[int] = None
    last_time_str: Optional[str] = None
    action_count: int = 0
    apps: List[str] = []
    users: List[str] = []
    actions_summary: List[str] = []


class ActionLogSessionsResponse(BaseModel):
    host: str
    port: int
    date: str
    total_sessions: int
    items: List[ActionLogSessionItem]


class ActionLogRecordItem(BaseModel):
    id: str
    time: int
    time_str: str
    action_name: str
    app_code: Optional[str] = None
    user_code: Optional[str] = None
    total_time_ms: Optional[int] = None
    req_data: Optional[Any] = None
    res_data: Optional[Any] = None
    guid: Optional[str] = None
    source: str = "ACTION_LOG"


class ActionLogSessionDetailResponse(BaseModel):
    guid: str
    order_info: Optional[Dict[str, Any]] = None
    payment_info: Optional[PaymentInfoItem] = None
    vat_info: Optional[VatInfoItem] = None
    customer_info: Optional[CustomerInfoItem] = None
    vouchers: List[VoucherItem] = []
    total_discount: float = 0.0
    total_actions: int
    actions: List[ActionLogRecordItem]


class KdsCookingTimeUpdateRequest(BaseModel):
    host: str
    port: int = 27017
    menu_item_code: str
    single_cooking_time: int
    sap_code: Optional[str] = None


class KdsCookingTimeUpdateResponse(BaseModel):
    host: str
    menu_item_code: str
    single_cooking_time: int
    cooking_time_display: str
    message: str
    modified_count: int


class TabletUserItem(BaseModel):
    code: str
    name: str
    is_login: bool = False
    status: int = 3
    locked_tables: List[str] = []
    lock_order_guids: List[str] = []


class TabletUsersResponse(BaseModel):
    restaurant_id: Optional[int] = None
    sap_code: str = ""
    restaurant_name: str = ""
    mongo_ip: str
    is_connected: bool = True
    total_employees: int = 0
    total_logged_in: int = 0
    total_in_lock_order: int = 0
    users: List[TabletUserItem] = []
    message: Optional[str] = None


class UnlockTabletUserRequest(BaseModel):
    host: Optional[str] = None
    port: int = 27017
    restaurant_id: Optional[int] = None
    user_code: Optional[str] = None
    user_name: Optional[str] = None
    unlock_all: bool = False


class UnlockTabletUserResponse(BaseModel):
    success: bool
    message: str
    unlocked_user_codes: List[str] = []
    cleared_lock_orders: int = 0
    updated_employees: int = 0
    host: str


class RestaurantGposInfoResponse(BaseModel):
    restaurant_name: str = ""
    rk7_code: str = ""
    sap_code: str = ""
    gpos_version_co_so: str = ""
    gpos_version_kds: str = ""
    menu_version_co: Optional[str] = None
    menu_version_so: Optional[str] = None
    is_connected: bool = True
    host: str = ""
    message: Optional[str] = None


class DishShowHideItem(BaseModel):
    item_code: str
    name: str
    price: float = 0.0
    sap_code: Optional[str] = None
    show_in_co: bool = True
    show_in_so: bool = True
    show_in_qr_order: bool = True
    is_hidden: bool = False


class DishShowHideListResponse(BaseModel):
    host: str
    port: int
    total_all: int = 0
    total_visible: int = 0
    total_hidden: int = 0
    visible_dishes: List[DishShowHideItem] = []
    hidden_dishes: List[DishShowHideItem] = []


class DishShowHideSaveAction(BaseModel):
    item_code: str
    name: str
    price: float = 0.0
    sap_code: Optional[str] = None
    is_hidden: bool
    show_in_co: bool = True
    show_in_so: bool = True
    show_in_qr_order: bool = True


class DishShowHideSaveRequest(BaseModel):
    host: str
    port: int = 27017
    restaurant_id: Optional[int] = None
    dishes: List[DishShowHideSaveAction]


class DishShowHideSaveResponse(BaseModel):
    success: bool
    message: str
    updated_count: int = 0


class MenuShowHideItem(BaseModel):
    id: int
    code: str
    name: str
    subtitle: Optional[str] = None
    sap_code: Optional[str] = None
    rk7_code: Optional[str] = None
    show_in_co: bool = True
    show_in_so: bool = True
    show_in_qr_order: bool = True
    auto_delivery_in_so: bool = True


class MenuShowHideListResponse(BaseModel):
    host: str
    port: int
    total: int = 0
    total_auto_kds: int = 0
    total_manual_kds: int = 0
    menus: List[MenuShowHideItem] = []


class MenuShowHideSaveItem(BaseModel):
    id: int
    code: str
    show_in_co: bool
    show_in_so: bool
    show_in_qr_order: bool
    auto_delivery_in_so: bool


class MenuShowHideSaveRequest(BaseModel):
    host: str
    port: int = 27017
    restaurant_id: Optional[int] = None
    menus: List[MenuShowHideSaveItem]


class MenuShowHideSaveResponse(BaseModel):
    success: bool
    message: str
    updated_count: int = 0


class MongoFixCpuIpResult(BaseModel):
    ip: str
    port: int = 27017
    connected: bool
    created_indexes: List[str] = []
    existing_indexes: List[str] = []
    cleaned_logs: Dict[str, int] = {}
    total_cleaned_logs: int = 0
    duration_seconds: float = 0.0
    error_message: Optional[str] = None


class MongoFixCpuRestaurantResult(BaseModel):
    restaurant_id: int
    sap: Optional[str] = None
    restaurant_name: Optional[str] = None
    trangthai: Optional[str] = None
    subnet: Optional[str] = None
    status: str  # "SUCCESS" | "FAILED" | "OFFLINE"
    processed_ips: List[str] = []
    ip_results: List[MongoFixCpuIpResult] = []
    total_cleaned_logs: int = 0
    message: str = ""
    error_message: Optional[str] = None


class MongoFixCpuRequest(BaseModel):
    restaurant_ids: List[int] = []
    default_email: Optional[str] = None
    user_email: Optional[str] = None
    send_email: bool = True


class MongoFixCpuResponse(BaseModel):
    total_restaurants: int
    success_count: int
    failed_count: int
    total_cleaned_logs: int = 0
    results: List[MongoFixCpuRestaurantResult] = []
    email_sent: bool = False
    email_error: Optional[str] = None
    recipients: List[str] = []
    message: str


class MongoFixCpuConfigResponse(BaseModel):
    default_email: Optional[str] = None
    is_privileged: bool = False


class MongoFixCpuConfigRequest(BaseModel):
    default_email: str


# ══════════════════════════════════════════════════════════════════════════
# MONGO TRANSFER / MIGRATE SCHEMAS
# ══════════════════════════════════════════════════════════════════════════

class MongoMachineStatus(BaseModel):
    ip: str
    port: int = 27017
    connected: bool
    ping_ms: Optional[float] = None
    databases: List[str] = []
    error: Optional[str] = None


class MongoTransferSettingsResponse(BaseModel):
    default_tails: List[str] = ["11", "12", "41"]


class MongoTransferSettingsUpdateRequest(BaseModel):
    default_tails: List[str]


class MongoScanMachinesRequest(BaseModel):
    restaurant_id: Optional[int] = None
    target_ip: Optional[str] = None
    extra_ips: List[str] = []


class MongoScanMachinesResponse(BaseModel):
    restaurant_id: Optional[int] = None
    restaurant_name: Optional[str] = None
    subnet: str
    machines: List[MongoMachineStatus] = []


class MongoDatabaseDetail(BaseModel):
    name: str
    collections_count: int = 0
    data_size_bytes: int = 0
    data_size_mb: float = 0.0
    storage_size_mb: float = 0.0
    estimated_docs: int = 0
    action_log_docs: int = 0
    action_log_size_mb: float = 0.0
    action_log_bk_docs: int = 0
    action_log_bk_size_mb: float = 0.0


class MongoMachineInspection(BaseModel):
    ip: str
    port: int = 27017
    connected: bool
    databases: List[MongoDatabaseDetail] = []
    total_docs: int = 0
    total_size_mb: float = 0.0
    error: Optional[str] = None


class MongoInspectPairRequest(BaseModel):
    source_ip: str
    source_port: int = 27017
    dest_ip: str
    dest_port: int = 27017


class MongoInspectPairResponse(BaseModel):
    source: MongoMachineInspection
    dest: MongoMachineInspection
    has_conflicts: bool = False
    conflicting_databases: List[str] = []
    warning_message: Optional[str] = None
    estimated_transfer_size_mb: float = 0.0
    action_log_savings_mb: float = 0.0


class MongoTransferExecuteRequest(BaseModel):
    source_ip: str
    source_port: int = 27017
    dest_ip: str
    dest_port: int = 27017
    selected_databases: List[str] = ["G_ORDER", "G_KITCHEN"]
    clean_action_log: bool = True
    clean_action_log_bk: bool = True
    clean_kitchen_action_log: bool = True
    drop_dest_existing: bool = True


class MongoTransferStepLog(BaseModel):
    step: str
    status: str  # "SUCCESS" | "INFO" | "WARNING" | "ERROR"
    message: str
    timestamp: str


class MongoTransferCollectionResult(BaseModel):
    database: str
    collection: str
    docs_count: int
    indexes_count: int
    duration_seconds: float


class MongoTransferExecuteResponse(BaseModel):
    success: bool
    message: str
    total_duration_seconds: float = 0.0
    cleaned_logs_summary: Dict[str, int] = {}
    dropped_databases: List[str] = []
    transferred_databases: List[str] = []
    collections_transferred: List[MongoTransferCollectionResult] = []
    verification_results: List[Dict[str, Any]] = []
    logs: List[MongoTransferStepLog] = []


class MongoTransferSettingsResponse(BaseModel):
    default_tails: List[str]


class MongoTransferSettingsUpdateRequest(BaseModel):
    default_tails: List[str]


# ══════════════════════════════════════════════════════════════════════════════
# MENU SO/CO MANAGEMENT SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class MenuGroupBrief(BaseModel):
    code: str
    name: str
    level: int = -1
    count: int = 0
    parent_code: Optional[str] = None
    is_co: bool = False
    channel: str = "SO_ONLY"  # "CO" hoặc "SO_ONLY"


class MenuCategoryItem(BaseModel):
    code: str
    id: Optional[int] = None
    name: str
    show_in_so: bool = False
    show_in_co: bool = False
    show_in_qr_order: bool = False
    auto_delivery_in_so: bool = False
    group_count: int = 0
    co_group_count: int = 0
    so_only_group_count: int = 0
    dish_count: int = 0
    groups: Optional[List[MenuGroupBrief]] = None


class MenuCategoriesResponse(BaseModel):
    host: str
    menus: List[MenuCategoryItem]
    total_menus: int


class DishMenuItem(BaseModel):
    menu_code: str
    menu_name: str
    group_code: str
    group_name: str
    parent_group_code: Optional[str] = None
    group_is_co: bool = False
    group_channel: str = "SO_ONLY"  # "CO" hoặc "SO_ONLY"
    co_status_detail: Optional[str] = None  # "ACTIVE_ON_CO", "DISH_IN_CO_BUT_GROUP_NOT_IN_CO", "NOT_IN_CO"
    level: int = -1  # -1: Food/Thường, 0: Drink/Nước
    rk7_code: str
    name: str
    sap_code: str = ""
    sort_order: int = 0
    price: float = 0.0
    vat: float = 0.0
    image_url: str = ""
    src_img: Optional[str] = ""
    url_img_qr: Optional[str] = ""
    is_so: bool = True
    is_co: bool = False
    co_kalo: Optional[float] = None


class ToggleGroupCoRequest(BaseModel):
    host: str
    port: int = 27017
    menu_code: str
    group_code: str
    action: str = "ADD"  # "ADD" hoặc "REMOVE"


class ToggleGroupCoResponse(BaseModel):
    success: bool
    message: str
    menu_code: str
    group_code: str
    action: str
    menuGroupCodes: List[str] = []

class MenuSoGroupItem(BaseModel):
    code: str
    name: str
    level: int = -1
    dish_count: int = 0
    is_co: bool = False
    in_file2: Optional[bool] = None


class MenuGroupsCoDetailResponse(BaseModel):
    success: bool
    message: str = ""
    menu_code: str
    menu_name: str = ""
    so_groups: List[MenuSoGroupItem] = []
    co_group_codes: List[str] = []
    file2_available: bool = False
    file2_group_codes: List[str] = []
    file2_path: Optional[str] = None
    extra_co_groups: List[str] = []


class BulkSyncMenuGroupsCoRequest(BaseModel):
    host: str
    port: int = 27017
    menu_code: str
    group_codes: List[str] = []
    action: str = "ADD"  # "ADD", "SET", "REMOVE"
    update_file2: bool = False
    file2_path: Optional[str] = None


class BulkSyncMenuGroupsCoResponse(BaseModel):
    success: bool
    message: str
    menu_code: str
    action: str
    updated_count: int
    current_co_groups: List[str] = []
    file2_updated: bool = False


class File2MenuSummaryItem(BaseModel):
    menu_code: str
    menu_name: str
    group_count: int
    group_codes: List[str] = []
    raw_groups: str = ""


class ReadFile2Response(BaseModel):
    success: bool
    message: str
    file_path: str
    menus: List[File2MenuSummaryItem] = []


class LoadMenuItemsRequest(BaseModel):
    host: str
    port: int = 27017
    menu_codes: List[str] = []
    search_all: bool = False
    query: Optional[str] = None
    rk7_codes: Optional[List[str]] = None
    sap_codes: Optional[List[str]] = None
    names: Optional[List[str]] = None


class LoadMenuItemsResponse(BaseModel):
    host: str
    items: List[DishMenuItem]
    total_items: int
    menus_loaded: List[str] = []


class BulkAddDishRow(BaseModel):
    rk7_code: str
    name: str
    sap_code: Optional[str] = ""
    sort_order: Optional[int] = 1
    price: Optional[float] = 0.0
    image_url: Optional[str] = ""
    level: Optional[int] = -1


class BulkAddDishesRequest(BaseModel):
    host: str
    port: int = 27017
    target_menu_codes: List[str]
    group_mode: str = "existing"  # "existing" or "new"
    group_code: Optional[str] = None
    group_name: str
    group_name_en: Optional[str] = None
    level: int = -1  # -1 for food, 0 for drink
    items: List[BulkAddDishRow]
    menu_group_map: Optional[Dict[str, Dict[str, Any]]] = None  # Bản đồ nhóm riêng cho từng menu {menu_code: {group_code, group_name, level}}


class BulkAddDishesResponse(BaseModel):
    success: bool
    message: str
    added_count: int
    warnings: List[str] = []


class UpdateDishItemRequest(BaseModel):
    host: str
    port: int = 27017
    menu_code: str
    group_code: str
    original_rk7_code: str
    new_rk7_code: str
    new_name: str
    new_sap_code: Optional[str] = ""
    new_sort_order: int = 0
    new_price: float = 0.0
    new_image_url: Optional[str] = ""
    new_level: int = -1


class UpdateDishItemResponse(BaseModel):
    success: bool
    message: str


class DeleteDishesRequest(BaseModel):
    host: str
    port: int = 27017
    items: List[Dict[str, Any]]  # [{menu_code, group_code, rk7_code}]
    delete_from_all_menus: bool = False


class DeleteDishesResponse(BaseModel):
    success: bool
    message: str
    deleted_count: int


class MoveCloneDishesRequest(BaseModel):
    host: str
    port: int = 27017
    action: str  # "move" | "clone"
    source_items: List[Dict[str, Any]]  # [{menu_code, group_code, rk7_code}]
    target_menu_code: str
    target_group_code: str


class MoveCloneDishesResponse(BaseModel):
    success: bool
    message: str
    processed_count: int


class ConflictItem(BaseModel):
    key: str
    type: str  # "same_rk7_diff_name" | "same_name_diff_rk7"
    rk7_code: Optional[str] = None
    name: Optional[str] = None
    distinct_values: List[str] = []
    distinct_saps: List[str] = []
    sap_status: Optional[str] = None
    sap_summary: Optional[str] = None
    rk7_breakdown: List[Dict[str, Any]] = []
    occurrences: List[Dict[str, Any]] = []


class CheckConflictsResponse(BaseModel):
    host: str
    same_rk7_diff_name: List[ConflictItem]
    same_name_diff_rk7: List[ConflictItem]
    total_conflicts: int


class ResolveConflictRequest(BaseModel):
    host: str
    port: int = 27017
    conflict_type: str  # "same_rk7_diff_name" | "same_name_diff_rk7"
    unified_rk7_code: str = ""
    unified_name: str = ""
    affected_rk7_codes: List[str] = []
    affected_names: List[str] = []


class ResolveConflictResponse(BaseModel):
    success: bool
    message: str
    updated_count: int


class ActivateCoRequest(BaseModel):
    host: str
    port: int = 27017
    items: List[Dict[str, Any]]  # [{rk7_code, name, sap_code, price, image_url}]


class ActivateCoResponse(BaseModel):
    success: bool
    message: str
    activated_count: int


class DeactivateCoRequest(BaseModel):
    host: str
    port: int = 27017
    rk7_codes: List[str]


class DeactivateCoResponse(BaseModel):
    success: bool
    message: str
    deactivated_count: int


class SyncAllSoCoRequest(BaseModel):
    host: str
    port: int = 27017
    restaurant_code: Optional[str] = None


class SyncAllSoCoResponse(BaseModel):
    success: bool
    message: str
    so_version: int
    co_version: int
    config_version: int
    kds_synced_count: int
    time_sync: int


class SaveMenuSnapshotRequest(BaseModel):
    host: str
    port: int = 27017
    source_sap: str = ""
    source_name: str = ""
    snapshot_name: Optional[str] = None
    menu_codes: Optional[List[str]] = None


class SaveMenuSnapshotResponse(BaseModel):
    success: bool
    message: str
    snapshot: Dict[str, Any]


class DeployMenuSnapshotRequest(BaseModel):
    target_host: str
    target_port: int = 27017
    target_sap: str = ""
    mode: str = "merge_update"  # "clean_overwrite" | "merge_update"
    target_menu_codes: Optional[List[str]] = None
    sync_co: bool = True


class DeployMenuSnapshotResponse(BaseModel):
    success: bool
    message: str
    target_host: str
    menus_deployed: int
    so_version: int
    co_version: int


class DirectSyncMenuRequest(BaseModel):
    source_host: str
    source_port: int = 27017
    target_host: str
    target_port: int = 27017
    source_sap: str = ""
    source_name: str = ""
    target_sap: str = ""
    target_name: str = ""
    mode: str = "merge_update"  # "clean_overwrite" | "merge_update"
    menu_codes: Optional[List[str]] = None
    sync_co: bool = True


class DirectSyncMenuResponse(BaseModel):
    success: bool
    message: str
    backup_snapshot_id: str
    details: Dict[str, Any]


class DishLookupResponse(BaseModel):
    found: bool
    rk7_code: str
    name: Optional[str] = None
    sap_code: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    source: Optional[str] = None
    message: Optional[str] = None












# ══════════════════════════════════════════════════════════════════════════
# KIỂM TRA & ĐỒNG NHẤT HÌNH ẢNH MÓN VỚI MÁY CHỦ ẢNH 192.168.201.116
# ══════════════════════════════════════════════════════════════════════════

class CheckSingleImageRequest(BaseModel):
    raw_path: str = ''
    dish_name: Optional[str] = ''
    rk7_code: Optional[str] = ''
    sap_code: Optional[str] = ''


class CheckDishImageResult(BaseModel):
    status: str
    is_match: bool
    is_fixable: bool
    message: str
    given_path: str
    given_filename: str
    given_prefix: str
    server_filename: str
    suggested_fix_path: str


class CheckMenuImagesRequest(BaseModel):
    host: str
    port: int = 27017
    menu_code: str
    force_refresh: bool = False
    dishes: Optional[List[Dict[str, Any]]] = None


class CheckMenuImagesResponse(BaseModel):
    server_host: str
    server_dir: str
    total_dishes: int
    total_server_files: int
    match_count: int
    prefix_mismatch_count: int
    case_mismatch_count: int
    candidate_count: int
    not_found_count: int
    no_image_count: int
    fixable_count: int
    results: List[Dict[str, Any]] = []


class DishImageFixItem(BaseModel):
    rk7_code: str
    sap_code: Optional[str] = ''
    target_image_path: str


class SyncDishImagesRequest(BaseModel):
    host: str
    port: int = 27017
    fixes: List[DishImageFixItem]
    menu_code: Optional[str] = ""
    menu_name: Optional[str] = ""
    restaurant_name: Optional[str] = ""


class SyncDishImagesResponse(BaseModel):
    success: bool
    updated_count: int
    total_requested: int
    message: str
    errors: List[str] = []


class ImageServerConfigResponse(BaseModel):
    server_type: str = "SSH_SFTP"  # "SSH_SFTP" hoặc "FTP"
    host: str
    port: int
    username: str
    password: Optional[str] = None
    remote_dir: str
    standard_prefix: str
    is_privileged: bool = False
    can_edit: bool = False
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class UpdateImageServerConfigRequest(BaseModel):
    server_type: Optional[str] = "SSH_SFTP"
    host: str
    port: int = 22
    username: str
    password: Optional[str] = None
    remote_dir: str = "/opt/gpos/gmonitor/resources/menu"
    standard_prefix: str = "/resources/menu/"


class TestImageServerConnectionRequest(BaseModel):
    server_type: Optional[str] = "SSH_SFTP"
    host: str
    port: int = 22
    username: str
    password: Optional[str] = None
    remote_dir: str = "/opt/gpos/gmonitor/resources/menu"


class TestImageServerConnectionResponse(BaseModel):
    success: bool
    total_files: int = 0
    message: str
    latency_ms: Optional[float] = None


class ExportMismatchedDishesRequest(BaseModel):
    host: str
    port: int = 27017
    menu_code: str
    menu_name: Optional[str] = ""
    restaurant_name: Optional[str] = ""
    force_refresh: bool = False
