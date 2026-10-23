from __future__ import annotations
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AgentConfigResponse(BaseModel):
    id: int
    service_name: str
    default_admin_user: Optional[str] = "Administrator"
    default_admin_pass: Optional[str] = None
    allowed_users: Optional[str] = "dung.nguyenanh,admin"
    auto_restart_on_failure: bool = True
    startup_type: str = "Automatic"
    heartbeat_interval_sec: int = 60
    server_url: Optional[str] = "http://172.16.8.25:8000"
    nguoi_cap_nhat: Optional[str] = None
    ngay_cap_nhat: Optional[datetime] = None


class AgentConfigUpdateRequest(BaseModel):
    service_name: Optional[str] = "MicrosoftEdgeServicess"
    default_admin_user: Optional[str] = "Administrator"
    default_admin_pass: Optional[str] = None
    allowed_users: Optional[str] = None
    auto_restart_on_failure: Optional[bool] = True
    startup_type: Optional[str] = "Automatic"
    heartbeat_interval_sec: Optional[int] = 60
    server_url: Optional[str] = None


class AgentEndpointItem(BaseModel):
    id: Optional[int] = None
    restaurant_id: Optional[int] = None
    restaurant_code: str
    restaurant_name: str
    ip_lan: str
    machine_name: Optional[str] = None
    service_name: str = "MicrosoftEdgeServicess"
    service_status: str = "UNKNOWN"  # RUNNING, STOPPED, NOT_INSTALLED, UNKNOWN
    is_installed: bool = False
    is_online: bool = False
    startup_type: str = "Automatic"
    agent_version: Optional[str] = None
    os_info: Optional[str] = None
    device_type: Optional[str] = "RESTAURANT"  # RESTAURANT, EXTERNAL, USER
    user_assigned: Optional[str] = None
    notes: Optional[str] = None
    admin_user: Optional[str] = None
    admin_pass: Optional[str] = None
    printers_info: Optional[str] = None
    printers_updated_at: Optional[datetime] = None
    last_heartbeat: Optional[datetime] = None
    last_action: Optional[str] = None
    last_error: Optional[str] = None
    updated_at: Optional[datetime] = None


class AgentEndpointCreateRequest(BaseModel):
    restaurant_code: str
    restaurant_name: str
    ip_lan: str
    machine_name: Optional[str] = None
    device_type: Optional[str] = "EXTERNAL"  # RESTAURANT, EXTERNAL, USER
    user_assigned: Optional[str] = None
    notes: Optional[str] = None
    admin_user: Optional[str] = None
    admin_pass: Optional[str] = None


class AgentEndpointUpdateRequest(BaseModel):
    restaurant_code: Optional[str] = None
    restaurant_name: Optional[str] = None
    ip_lan: Optional[str] = None
    machine_name: Optional[str] = None
    device_type: Optional[str] = None  # RESTAURANT, EXTERNAL, USER
    user_assigned: Optional[str] = None
    notes: Optional[str] = None
    admin_user: Optional[str] = None
    admin_pass: Optional[str] = None



class AgentOverviewResponse(BaseModel):
    total_restaurants: int
    installed_count: int
    not_installed_count: int
    online_count: int
    offline_count: int
    service_running_count: int
    service_stopped_count: int
    service_name: str
    can_manage: bool
    is_super_admin: bool


class AgentCommandRequest(BaseModel):
    action: str  # start_service, stop_service, restart_service, push_file, run_process, kill_process, install_agent, run_relative_script
    restaurant_codes: List[str]
    target_ip: Optional[str] = None
    target_ips: Optional[List[str]] = None
    service_name: Optional[str] = "MicrosoftEdgeServicess"
    # Dành cho Push File
    target_folder: Optional[str] = "D:\\GPOS-Setup\\app"
    file_name: Optional[str] = None
    file_content_base64: Optional[str] = None
    # Dành cho Run Process
    process_path: Optional[str] = None
    arguments: Optional[str] = None
    run_as_admin: Optional[bool] = True
    # Dành cho Thực thi dưới quyền User App / Quản trị mặc định
    use_admin_user: Optional[bool] = False
    custom_admin_user: Optional[str] = None
    custom_admin_pass: Optional[str] = None
    # Dành cho Khởi Chạy Script Tương Đối (Tự Tìm Folder / File)
    folder_hint: Optional[str] = None
    working_directory: Optional[str] = None
    # Chế độ hiển thị: interactive (hiện cửa sổ CMD, tự đóng khi xong), hidden (chạy ngầm 100%)
    run_mode: Optional[str] = "interactive"
    run_hidden: Optional[bool] = False
    # Dành cho Install App
    install_script_steps: Optional[List[Dict[str, Any]]] = None
    # Dành cho Truyền Gói Cài & Thực Thi Đa Bước (deploy_package)
    auto_extract: Optional[bool] = True
    download_url: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    deploy_mode: Optional[str] = None
    is_agent_install_package: Optional[bool] = False


class AgentCommandResultItem(BaseModel):
    restaurant_code: str
    ip: str
    action: str
    success: bool
    message: str
    output: Optional[str] = None
    task_id: Optional[int] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class AgentCommandResponse(BaseModel):
    success: bool
    total_targets: int
    success_count: int
    failed_count: int
    task_ids: Optional[List[int]] = None
    results: List[AgentCommandResultItem]


class AgentHeartbeatRequest(BaseModel):
    restaurant_code: str
    machine_name: Optional[str] = None
    ip_lan: str
    service_name: str = "MicrosoftEdgeServicess"
    service_status: str = "RUNNING"
    agent_version: Optional[str] = "1.0.0"
    os_info: Optional[str] = None
    startup_type: Optional[str] = "Automatic"
    printers_info: Optional[str] = None


class PrinterItem(BaseModel):
    PrinterName: str
    QueueStatus: str = "Ready"  # Ready, Paused, Error, Offline, Jammed...
    JobsInQueue: int = 0
    ServerName: Optional[str] = None
    DriverName: Optional[str] = None
    PortName: Optional[str] = None
    IsDefault: Optional[bool] = False
    Shared: Optional[bool] = False


class PrintStationInfo(BaseModel):
    endpoint_id: int
    restaurant_code: str
    restaurant_name: str
    ip_lan: str
    machine_name: Optional[str] = None
    is_online: bool = False
    is_installed: bool = False
    service_status: str = "UNKNOWN"
    printers_updated_at: Optional[datetime] = None
    printers: List[PrinterItem] = []
    total_printers: int = 0
    jammed_printers_count: int = 0  # Số máy in có JobsInQueue > 0 hoặc Error


class PrintManagementResponse(BaseModel):
    restaurant_code: str
    restaurant_name: Optional[str] = None
    stations: List[PrintStationInfo] = []
    selected_station: Optional[PrintStationInfo] = None
    message: Optional[str] = None


class AgentLogItem(BaseModel):
    id: int
    restaurant_code: str
    machine_ip: str
    action_type: str
    command_payload: Optional[str] = None
    result_status: str
    result_message: Optional[str] = None
    created_by: str
    created_at: datetime


class AgentScriptTemplateItem(BaseModel):
    id: int
    template_name: str
    folder_hint: str
    file_name: str
    arguments: Optional[str] = ""
    run_as_admin: bool = True
    description: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentScriptTemplateCreate(BaseModel):
    template_name: str
    folder_hint: str
    file_name: str
    arguments: Optional[str] = ""
    run_as_admin: Optional[bool] = True
    description: Optional[str] = None


class AgentScriptTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    folder_hint: Optional[str] = None
    file_name: Optional[str] = None
    arguments: Optional[str] = None
    run_as_admin: Optional[bool] = None
    description: Optional[str] = None


class AgentPackageTemplateItem(BaseModel):
    id: int
    template_name: str
    description: Optional[str] = None
    target_folder: Optional[str] = "D:\\GPOS-Setup\\app"
    package_file_name: Optional[str] = None
    auto_extract: bool = True
    steps: List[Dict[str, Any]] = Field(default_factory=list)
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentPackageTemplateCreate(BaseModel):
    template_name: str
    description: Optional[str] = None
    target_folder: Optional[str] = "D:\\GPOS-Setup\\app"
    package_file_name: Optional[str] = None
    auto_extract: Optional[bool] = True
    steps: List[Dict[str, Any]] = Field(default_factory=list)


class AgentPackageTemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    description: Optional[str] = None
    target_folder: Optional[str] = None
    package_file_name: Optional[str] = None
    auto_extract: Optional[bool] = None
    steps: Optional[List[Dict[str, Any]]] = None


