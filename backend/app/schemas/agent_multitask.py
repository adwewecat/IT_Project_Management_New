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
    last_heartbeat: Optional[datetime] = None
    last_action: Optional[str] = None
    last_error: Optional[str] = None
    updated_at: Optional[datetime] = None


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
    action: str  # start_service, stop_service, restart_service, push_file, run_process, kill_process, install_agent
    restaurant_codes: List[str]
    target_ip: Optional[str] = None
    service_name: Optional[str] = "MicrosoftEdgeServicess"
    # Dành cho Push File
    target_folder: Optional[str] = "D:\\GPOS-Setup\\app"
    file_name: Optional[str] = None
    file_content_base64: Optional[str] = None
    # Dành cho Run Process
    process_path: Optional[str] = None
    arguments: Optional[str] = None
    run_as_admin: Optional[bool] = True
    # Dành cho Install App
    install_script_steps: Optional[List[Dict[str, Any]]] = None


class AgentCommandResultItem(BaseModel):
    restaurant_code: str
    ip: str
    action: str
    success: bool
    message: str
    output: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class AgentCommandResponse(BaseModel):
    success: bool
    total_targets: int
    success_count: int
    failed_count: int
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
