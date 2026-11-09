from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class CoSoKdsOrderFlowItem(BaseModel):
    dish_id: str
    dish_name: str
    quantity: int = 1
    table_number: str
    table_name: Optional[str] = None
    order_id: str
    source: str = "CO"  # "CO" (Tablet Bàn) hoặc "SO" (Nhân viên phục vụ)
    submit_timestamp_ms: Optional[int] = 0
    order_date: Optional[str] = None
    combo_name: Optional[str] = None
    time_co_sent: Optional[str] = None
    time_pos_received: Optional[str] = None
    time_kds_received: Optional[str] = None
    time_kds_completed: Optional[str] = None
    time_so_delivered: Optional[str] = None
    line_cook: Optional[str] = "Bếp Nóng"
    is_unassigned: Optional[bool] = False
    status: str = "COOKING"  # "WAITING" | "COOKING" | "DONE" | "DELIVERED" | "DELAYED" | "CANCELLED"
    sla_minutes: int = 10
    elapsed_minutes: int = 4
    is_delayed: bool = False
    note: Optional[str] = None
    # Chi tiết KDS & đối soát
    sap_code: Optional[str] = None
    rk7_code: Optional[str] = None
    print_status: Optional[str] = None  # "PRINTED" | "NO_PRINTER" | "DISABLED" | "WAITING"
    printer_name: Optional[str] = None
    print_message: Optional[str] = None
    account_name: Optional[str] = None
    actual_minutes: Optional[float] = None
    config_minutes: Optional[int] = 10


class CoSoKdsOrderFlowResponse(BaseModel):
    success: bool
    table_number: Optional[str] = None
    order_id: Optional[str] = None
    effective_date: Optional[str] = None
    total_dishes: int = 0
    waiting_count: int = 0
    cooking_count: int = 0
    done_count: int = 0
    delivered_count: int = 0
    delayed_count: int = 0
    dishes: List[CoSoKdsOrderFlowItem] = []
    message: str = ""


class CoSoKdsTwoStepSyncRequest(BaseModel):
    host: str
    port: Optional[int] = 27017
    restaurant_id: Optional[int] = None
    sync_mode: str = "FULL_TWO_STEP"  # "FULL_TWO_STEP" | "SO_ONLY" | "CO_ONLY"


class CoSoKdsTwoStepSyncResponse(BaseModel):
    success: bool
    sync_mode: str
    step1_so_success: bool = True
    step1_so_message: str = ""
    step2_co_success: bool = True
    step2_co_message: str = ""
    total_co_notified: int = 0
    elapsed_ms: float = 0.0
    message: str = ""


class CoSoKdsDeviceItem(BaseModel):
    id: str
    device_type: str  # "CO" | "SO" | "KDS"
    device_name: str
    device_model: Optional[str] = "Samsung Galaxy Tab A8"
    unique_device_id: Optional[str] = None
    mac_address: Optional[str] = None
    table_code: Optional[str] = None
    ip_address: Optional[str] = None
    is_online: bool = True
    app_version: str = "v1.6.91"
    latest_version: str = "v1.6.91"
    is_outdated: bool = False
    battery_level: Optional[int] = None
    last_seen: Optional[str] = None
    last_order_time: Optional[str] = None  # Thời gian order / mở bàn mới nhất để hiển thị
    order_timestamp_ms: Optional[int] = 0  # Epoch ms để sắp xếp chính xác tuyệt đối
    session_count: int = 1  # Số phiên session đã gom về thiết bị duy nhất này
    line_cook: Optional[str] = None
    note: Optional[str] = None


class CoSoKdsDeviceFleetResponse(BaseModel):
    success: bool
    total_devices: int = 0
    total_co: int = 0
    total_so: int = 0
    total_kds: int = 0
    online_count: int = 0
    offline_count: int = 0
    outdated_count: int = 0
    devices: List[CoSoKdsDeviceItem] = []
    official_versions: Dict[str, str] = {}
    message: str = ""
