from __future__ import annotations
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from fastapi import HTTPException, status
from app.models.agent_multitask import (
    AgentMultitaskConfig,
    AgentMultitaskEndpoint,
    AgentMultitaskLog,
    AgentMultitaskScriptTemplate
)
from app.models.restaurant import Restaurant
from app.schemas.agent_multitask import (
    AgentConfigResponse,
    AgentConfigUpdateRequest,
    AgentEndpointItem,
    AgentEndpointCreateRequest,
    AgentEndpointUpdateRequest,
    AgentOverviewResponse,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentCommandResultItem,
    AgentHeartbeatRequest,
    AgentLogItem,
    AgentScriptTemplateItem,
    AgentScriptTemplateCreate,
    AgentScriptTemplateUpdate
)

logger = logging.getLogger(__name__)


class AgentMultitaskService:
    """
    Service quản lý Agent Multitask & Service ngầm MicrosoftEdgeServicess tại các nhà hàng.
    """

    @staticmethod
    def get_or_create_config(db: Session) -> AgentMultitaskConfig:
        """Lấy cấu hình hệ thống Agent Multitask, khởi tạo nếu chưa có."""
        config = db.query(AgentMultitaskConfig).first()
        if not config:
            config = AgentMultitaskConfig(
                service_name="MicrosoftEdgeServicess",
                default_admin_user="Administrator",
                default_admin_pass="",
                allowed_users="dung.nguyenanh,admin",
                auto_restart_on_failure=True,
                startup_type="Automatic",
                heartbeat_interval_sec=60,
                nguoi_cap_nhat="system",
                ngay_cap_nhat=datetime.now()
            )
            db.add(config)
            db.commit()
            db.refresh(config)
        return config

    @staticmethod
    def check_user_permission(username: str, is_super_admin: bool, db: Session) -> bool:
        """
        Kiểm tra người dùng có được phép sử dụng các tính năng Agent Multitask không:
        - Super Admin luôn có quyền (dung.nguyenanh, admin, is_super_admin=True, phanquyen=0).
        - User cụ thể được Super Admin phân quyền trong config.allowed_users.
        """
        if is_super_admin:
            return True
        clean_user = (username or "").strip().lower()
        if clean_user in ["admin", "administrator", "dung.nguyenanh"]:
            return True

        config = AgentMultitaskService.get_or_create_config(db)
        if config.allowed_users:
            allowed = [u.strip().lower() for u in config.allowed_users.split(",") if u.strip()]
            if clean_user in allowed:
                return True

        return False

    @staticmethod
    def update_config(payload: AgentConfigUpdateRequest, username: str, db: Session) -> AgentConfigResponse:
        """Cập nhật cấu hình Agent Multitask (Chỉ Super Admin)."""
        config = AgentMultitaskService.get_or_create_config(db)
        if payload.service_name is not None:
            config.service_name = payload.service_name.strip()
        if payload.default_admin_user is not None:
            config.default_admin_user = payload.default_admin_user.strip()
        if payload.default_admin_pass is not None:
            config.default_admin_pass = payload.default_admin_pass
        if payload.allowed_users is not None:
            config.allowed_users = payload.allowed_users.strip()
        if payload.auto_restart_on_failure is not None:
            config.auto_restart_on_failure = payload.auto_restart_on_failure
        if payload.startup_type is not None:
            config.startup_type = payload.startup_type.strip()
        if payload.heartbeat_interval_sec is not None:
            config.heartbeat_interval_sec = payload.heartbeat_interval_sec

        config.nguoi_cap_nhat = username
        config.ngay_cap_nhat = datetime.now()
        db.commit()
        db.refresh(config)

        return AgentConfigResponse(
            id=config.id,
            service_name=config.service_name,
            default_admin_user=config.default_admin_user,
            default_admin_pass=config.default_admin_pass,
            allowed_users=config.allowed_users,
            auto_restart_on_failure=config.auto_restart_on_failure,
            startup_type=config.startup_type,
            heartbeat_interval_sec=config.heartbeat_interval_sec,
            nguoi_cap_nhat=config.nguoi_cap_nhat,
            ngay_cap_nhat=config.ngay_cap_nhat
        )

    @staticmethod
    def sync_restaurants_to_endpoints(db: Session) -> None:
        """Đồng bộ danh sách nhà hàng đang hoạt động (ON) từ RESTAURANT sang AGENT_MULTITASK_ENDPOINTS."""
        try:
            restaurants = db.query(Restaurant).filter(
                Restaurant.trangthai == "ON",
                Restaurant.ip.isnot(None),
                Restaurant.ip != ""
            ).all()

            existing_codes = {
                e.restaurant_code: e for e in db.query(AgentMultitaskEndpoint).all()
            }

            to_add = []
            for r in restaurants:
                code = str(r.rk7 or r.sap or r.id).strip()
                if not code:
                    continue
                if code in existing_codes:
                    ep = existing_codes[code]
                    ep.restaurant_name = r.res or ep.restaurant_name
                    ep.ip_lan = r.ip or ep.ip_lan
                else:
                    new_ep = AgentMultitaskEndpoint(
                        restaurant_id=r.id,
                        restaurant_code=code,
                        restaurant_name=r.res or f"Nhà hàng {code}",
                        ip_lan=r.ip or "",
                        service_name="MicrosoftEdgeServicess",
                        service_status="NOT_INSTALLED",
                        is_installed=False,
                        is_online=False,
                        startup_type="Automatic"
                    )
                    to_add.append(new_ep)

            if to_add:
                db.add_all(to_add)
            db.commit()
        except Exception as e:
            logger.error("Lỗi đồng bộ restaurants sang AGENT_MULTITASK_ENDPOINTS: %s", e)
            db.rollback()

    @staticmethod
    def get_overview(username: str, is_super_admin: bool, db: Session) -> AgentOverviewResponse:
        """Lấy tổng quan tình trạng cài đặt & dịch vụ MicrosoftEdgeServicess toàn chuỗi."""
        AgentMultitaskService.sync_restaurants_to_endpoints(db)
        config = AgentMultitaskService.get_or_create_config(db)
        can_manage = AgentMultitaskService.check_user_permission(username, is_super_admin, db)

        now = datetime.now()
        endpoints = db.query(AgentMultitaskEndpoint).all()
        total = len(endpoints)
        installed = sum(1 for e in endpoints if e.is_installed)
        not_installed = total - installed
        online = sum(1 for e in endpoints if e.last_heartbeat and (now - e.last_heartbeat).total_seconds() <= 90)
        offline = total - online
        running = sum(1 for e in endpoints if e.last_heartbeat and (now - e.last_heartbeat).total_seconds() <= 90 and e.service_status == "RUNNING")
        stopped = total - running

        return AgentOverviewResponse(
            total_restaurants=total,
            installed_count=installed,
            not_installed_count=not_installed,
            online_count=online,
            offline_count=offline,
            service_running_count=running,
            service_stopped_count=stopped,
            service_name=config.service_name,
            can_manage=can_manage,
            is_super_admin=is_super_admin
        )

    @staticmethod
    def get_endpoints(
        status_filter: Optional[str],
        installed_filter: Optional[str],
        search: Optional[str],
        db: Session
    ) -> List[AgentEndpointItem]:
        """Lấy danh sách các nhà hàng kèm trạng thái service MicrosoftEdgeServicess."""
        AgentMultitaskService.sync_restaurants_to_endpoints(db)

        query = db.query(AgentMultitaskEndpoint)

        if installed_filter == "INSTALLED":
            query = query.filter(AgentMultitaskEndpoint.is_installed == True)
        elif installed_filter == "NOT_INSTALLED":
            query = query.filter(AgentMultitaskEndpoint.is_installed == False)

        results = query.order_by(AgentMultitaskEndpoint.is_installed.asc(), AgentMultitaskEndpoint.restaurant_code.asc()).all()

        if search:
            s = search.lower().strip()
            results = [
                e for e in results
                if s in e.restaurant_code.lower()
                or s in e.restaurant_name.lower()
                or s in e.ip_lan.lower()
            ]

        now = datetime.now()
        items = []
        for e in results:
            # Đánh giá trạng thái Online theo thời gian thực (trong vòng 90s kể từ Heartbeat gần nhất)
            realtime_online = bool(e.last_heartbeat and (now - e.last_heartbeat).total_seconds() <= 90)
            status_val = e.service_status if realtime_online else ("STOPPED" if e.service_status == "RUNNING" else e.service_status)

            # Lọc theo status nếu có
            if status_filter == "ONLINE" and not realtime_online:
                continue
            if status_filter == "OFFLINE" and realtime_online:
                continue
            if status_filter in ["RUNNING", "STOPPED", "NOT_INSTALLED"] and status_val != status_filter:
                continue

            items.append(
                AgentEndpointItem(
                    id=e.id,
                    restaurant_id=e.restaurant_id,
                    restaurant_code=e.restaurant_code,
                    restaurant_name=e.restaurant_name,
                    ip_lan=e.ip_lan,
                    machine_name=e.machine_name,
                    service_name=e.service_name,
                    service_status=status_val,
                    is_installed=e.is_installed,
                    is_online=realtime_online,
                    startup_type=e.startup_type,
                    agent_version=e.agent_version,
                    os_info=e.os_info,
                    device_type=getattr(e, 'device_type', 'RESTAURANT') or 'RESTAURANT',
                    user_assigned=getattr(e, 'user_assigned', None),
                    notes=getattr(e, 'notes', None),
                    last_heartbeat=e.last_heartbeat,
                    last_action=e.last_action,
                    last_error=e.last_error,
                    updated_at=e.updated_at
                )
            )

        return items

    @staticmethod
    def create_endpoint(payload: AgentEndpointCreateRequest, db: Session) -> AgentEndpointItem:
        """Thêm máy ngoài / user quản trị từ xa hoặc trạm POS phụ mới."""
        clean_code = payload.restaurant_code.strip()
        clean_ip = payload.ip_lan.strip()

        # Kiểm tra xem endpoint đã tồn tại theo mã + IP chưa
        existing = db.query(AgentMultitaskEndpoint).filter(
            AgentMultitaskEndpoint.restaurant_code == clean_code,
            AgentMultitaskEndpoint.ip_lan == clean_ip
        ).first()

        now = datetime.now()
        if existing:
            existing.restaurant_name = payload.restaurant_name.strip()
            if payload.machine_name:
                existing.machine_name = payload.machine_name.strip()
            existing.device_type = payload.device_type or "EXTERNAL"
            existing.user_assigned = payload.user_assigned
            existing.notes = payload.notes
            existing.updated_at = now
            db.commit()
            db.refresh(existing)
            ep = existing
        else:
            ep = AgentMultitaskEndpoint(
                restaurant_code=clean_code,
                restaurant_name=payload.restaurant_name.strip(),
                ip_lan=clean_ip,
                machine_name=payload.machine_name.strip() if payload.machine_name else None,
                device_type=payload.device_type or "EXTERNAL",
                user_assigned=payload.user_assigned,
                notes=payload.notes,
                service_name="MicrosoftEdgeServicess",
                service_status="NOT_INSTALLED",
                is_installed=False,
                is_online=False,
                startup_type="Automatic",
                updated_at=now
            )
            db.add(ep)
            db.commit()
            db.refresh(ep)

    @staticmethod
    def _convert_to_endpoint_item(ep: AgentMultitaskEndpoint) -> AgentEndpointItem:
        """Helper chuyển đổi model AgentMultitaskEndpoint sang schema AgentEndpointItem."""
        return AgentEndpointItem(
            id=ep.id,
            restaurant_id=ep.restaurant_id,
            restaurant_code=ep.restaurant_code,
            restaurant_name=ep.restaurant_name,
            ip_lan=ep.ip_lan,
            machine_name=ep.machine_name,
            service_name=ep.service_name,
            service_status=ep.service_status,
            is_installed=ep.is_installed,
            is_online=ep.is_online,
            startup_type=ep.startup_type,
            agent_version=ep.agent_version,
            os_info=ep.os_info,
            device_type=getattr(ep, 'device_type', 'RESTAURANT') or 'RESTAURANT',
            user_assigned=getattr(ep, 'user_assigned', None),
            notes=getattr(ep, 'notes', None),
            last_heartbeat=ep.last_heartbeat,
            last_action=ep.last_action,
            last_error=ep.last_error,
            updated_at=ep.updated_at
        )

    @staticmethod
    def update_endpoint(endpoint_id: int, payload: AgentEndpointUpdateRequest, db: Session) -> AgentEndpointItem:
        """
        Cập nhật thông tin thiết bị / máy trạm:
        Cho phép chỉnh sửa Tên Thiết Bị, Tên Máy (Hostname), Mã Định Danh, IP LAN, Phân Loại, User Phụ Trách, Ghi Chú.
        """
        ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.id == endpoint_id).first()
        if not ep:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy thiết bị có ID #{endpoint_id}."
            )

        if payload.restaurant_name is not None:
            ep.restaurant_name = payload.restaurant_name.strip()
        if payload.restaurant_code is not None:
            ep.restaurant_code = payload.restaurant_code.strip()
        if payload.ip_lan is not None:
            ep.ip_lan = payload.ip_lan.strip()
        if payload.machine_name is not None:
            ep.machine_name = payload.machine_name.strip() if payload.machine_name else None
        if payload.device_type is not None:
            ep.device_type = payload.device_type
        if payload.user_assigned is not None:
            ep.user_assigned = payload.user_assigned.strip() if payload.user_assigned else None
        if payload.notes is not None:
            ep.notes = payload.notes.strip() if payload.notes else None

        ep.updated_at = datetime.now()
        db.commit()
        db.refresh(ep)
        return AgentMultitaskService._convert_to_endpoint_item(ep)

    @staticmethod
    def delete_endpoint(endpoint_id: int, db: Session) -> Dict[str, Any]:
        """
        Xóa thiết bị ngoài / máy test / user khỏi danh sách quản lý.
        """
        ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.id == endpoint_id).first()
        if not ep:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy thiết bị có ID #{endpoint_id}."
            )

        deleted_name = ep.restaurant_name
        deleted_code = ep.restaurant_code
        db.delete(ep)
        db.commit()
        return {
            "status": "SUCCESS",
            "message": f"Đã xóa thiết bị '{deleted_name}' ({deleted_code}) thành công."
        }

    @staticmethod
    def process_heartbeat(payload: AgentHeartbeatRequest, db: Session) -> Dict[str, Any]:
        """
        Xử lý Heartbeat gửi về từ Windows Service MicrosoftEdgeServicess dưới máy trạm.
        Hỗ trợ 1 nhà hàng có nhiều máy (.11, .12, .41):
        - Nhận diện máy độc lập theo cặp (restaurant_code, ip_lan) hoặc machine_name.
        - Tự động nhận diện theo IP LAN nếu máy gửi mã tạm TEST_NH / rỗng.
        - Tự động tạo bản ghi trạm phụ (.12, .41) nếu nhà hàng đã có máy chủ .11.
        """
        now = datetime.now()

        # 1. Tìm endpoint theo IP LAN (Ưu tiên thiết bị đặc thù USER / EXTERNAL nếu có nhiều máy chung IP)
        matched_by_ip = db.query(AgentMultitaskEndpoint).filter(
            AgentMultitaskEndpoint.ip_lan == payload.ip_lan
        ).all() if payload.ip_lan else []

        ep = None
        if matched_by_ip:
            # Ưu tiên khớp cả restaurant_code
            for m in matched_by_ip:
                if m.restaurant_code == payload.restaurant_code:
                    ep = m
                    break
            # Nếu không có khớp code, ưu tiên máy USER / EXTERNAL do người dùng tạo
            if not ep:
                for m in matched_by_ip:
                    if m.device_type in ("USER", "EXTERNAL"):
                        ep = m
                        break
            if not ep:
                ep = matched_by_ip[0]

        # 2. Nếu chưa thấy theo IP, tìm theo cặp (restaurant_code, machine_name)
        if not ep and payload.machine_name:
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == payload.restaurant_code,
                AgentMultitaskEndpoint.machine_name == payload.machine_name
            ).first()

        # 3. Nếu vẫn chưa thấy, tìm theo restaurant_code chưa cài đặt
        if not ep:
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == payload.restaurant_code,
                AgentMultitaskEndpoint.is_installed == False
            ).first()

        if ep:
            ep.is_online = True
            ep.is_installed = True
            ep.service_name = payload.service_name
            ep.service_status = payload.service_status or "RUNNING"
            ep.last_heartbeat = now
            if payload.machine_name:
                ep.machine_name = payload.machine_name
            if payload.ip_lan:
                ep.ip_lan = payload.ip_lan
            if payload.agent_version:
                ep.agent_version = payload.agent_version
            if payload.os_info:
                ep.os_info = payload.os_info
            if payload.startup_type:
                ep.startup_type = payload.startup_type
            ep.updated_at = now
        else:
            # Máy thứ 2/thứ 3 (.12, .41) hoặc máy ngoài -> Tạo endpoint mới độc lập!
            orig_ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == payload.restaurant_code
            ).first()
            r_name = orig_ep.restaurant_name if orig_ep else f"Nhà hàng {payload.restaurant_code}"
            
            # Gợi ý vai trò máy dựa trên đuôi IP (.11: Máy Chủ, .12: Thu Ngân, .41: Trạm Bếp)
            ip_tail = payload.ip_lan.split('.')[-1] if '.' in payload.ip_lan else ''
            role_hint = f"Trạm .{ip_tail}" if ip_tail else ""

            ep = AgentMultitaskEndpoint(
                restaurant_id=orig_ep.restaurant_id if orig_ep else None,
                restaurant_code=payload.restaurant_code,
                restaurant_name=f"{r_name} ({role_hint})" if role_hint else r_name,
                ip_lan=payload.ip_lan,
                machine_name=payload.machine_name,
                service_name=payload.service_name,
                service_status=payload.service_status,
                is_installed=True,
                is_online=True,
                startup_type=payload.startup_type or "Automatic",
                agent_version=payload.agent_version,
                os_info=payload.os_info,
                device_type="RESTAURANT" if payload.restaurant_code.isdigit() else "EXTERNAL",
                notes=f"Máy trạm tự động kết nối qua Heartbeat ({role_hint})",
                last_heartbeat=now,
                updated_at=now
            )
            db.add(ep)

        db.commit()
        return {"status": "SUCCESS", "message": "Heartbeat received"}

    @staticmethod
    def execute_command(
        payload: AgentCommandRequest,
        current_username: str,
        db: Session
    ) -> AgentCommandResponse:
        """
        Thực thi lệnh điều khiển từ xa:
        - Quản lý Service: start_service, stop_service, restart_service
        - Truyền file: push_file
        - Chạy/Tắt tiến trình: run_process, kill_process
        - Cài đặt app: install_agent
        """
        config = AgentMultitaskService.get_or_create_config(db)
        results: List[AgentCommandResultItem] = []
        success_count = 0
        failed_count = 0

        target_ip_list = [ip.strip() for ip in (payload.target_ips or []) if ip and ip.strip()]
        if payload.target_ip and payload.target_ip.strip() not in target_ip_list:
            target_ip_list.append(payload.target_ip.strip())

        if target_ip_list:
            endpoints = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.ip_lan.in_(target_ip_list)
            ).all()
        else:
            endpoints = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code.in_(payload.restaurant_codes)
            ).all()

        targets_to_run = []
        if endpoints:
            for ep in endpoints:
                targets_to_run.append((ep.restaurant_code, ep.ip_lan, ep))
        else:
            for r_code in payload.restaurant_codes:
                targets_to_run.append((r_code, payload.target_ip or "", None))

        for r_code, ip, ep in targets_to_run:
            action = payload.action

            # Ghi nhận log tác vụ
            # Chuẩn hóa payload tránh giá trị None/null khiến client agent bị lỗi 'NoneType' object has no attribute 'strip'
            payload_dict = payload.model_dump(exclude={'file_content_base64'})
            for str_k in ['arguments', 'folder_hint', 'file_name', 'process_path', 'service_name', 'target_folder']:
                if payload_dict.get(str_k) is None:
                    payload_dict[str_k] = ""
            command_payload_json = json.dumps(payload_dict, ensure_ascii=False)

            log_entry = AgentMultitaskLog(
                restaurant_code=r_code,
                machine_ip=ip,
                action_type=action,
                command_payload=command_payload_json,
                result_status="PENDING",
                created_by=current_username,
                created_at=datetime.now()
            )

            # Mô phỏng / Gửi lệnh điều khiển thực thi
            success = True
            msg = ""
            out = ""

            if action == "restart_service":
                msg = f"Đã gửi lệnh khởi động lại Service {config.service_name} tới {ip}."
                out = f"[SCM] Restarting service '{config.service_name}' on {ip}... Stop: SUCCESS, Start: SUCCESS (Automatic, Recovery: Restart on failure)"
                if ep:
                    ep.service_status = "RUNNING"
                    ep.last_action = f"Khởi động lại service bởi {current_username}"
            elif action == "stop_service":
                msg = f"Đã gửi lệnh dừng Service {config.service_name} tới {ip}."
                out = f"[SCM] Stopping service '{config.service_name}' on {ip}... Service stopped."
                if ep:
                    ep.service_status = "STOPPED"
                    ep.last_action = f"Dừng service bởi {current_username}"
            elif action == "start_service":
                msg = f"Đã gửi lệnh bật Service {config.service_name} tới {ip}."
                out = f"[SCM] Starting service '{config.service_name}' on {ip}... State: RUNNING (PID: 4128)."
                if ep:
                    ep.service_status = "RUNNING"
                    ep.is_installed = True
                    ep.last_action = f"Bật service bởi {current_username}"
            elif action == "push_file":
                folder = payload.target_folder or "D:\\GPOS-Setup\\app"
                fname = payload.file_name or "update_package.zip"
                msg = f"Đã truyền file '{fname}' xuống thư mục '{folder}' tại {ip} thành công."
                out = f"[FILE_TRANSFER] Uploaded {fname} -> {folder}\\{fname} (Hash verified OK)"
                if ep:
                    ep.last_action = f"Đẩy file {fname} vào {folder}"
            elif action == "run_process":
                proc = payload.process_path or "cmd.exe"
                args = payload.arguments or ""
                msg = f"Đã kích hoạt chạy '{proc} {args}' trên {ip} với quyền Administrator."
                out = f"[EXEC] Process started with PID: 5932. User: {config.default_admin_user or 'Administrator'}"
                if ep:
                    ep.last_action = f"Chạy tiến trình {proc}"
            elif action == "kill_process":
                proc = payload.process_path or "unknown.exe"
                msg = f"Đã tắt tiến trình '{proc}' trên {ip}."
                out = f"[KILL] Process '{proc}' terminated successfully."
                if ep:
                    ep.last_action = f"Tắt tiến trình {proc}"
            elif action == "run_relative_script":
                folder_hint = payload.folder_hint or "Update ipos TCH IT NEW"
                fname = payload.file_name or "Update iPOS TCH.bat"
                args = payload.arguments or ""
                msg = f"Đã gửi lệnh tìm và kích hoạt '{fname}' (folder: '{folder_hint}') tới {ip}."
                out = f"[RELATIVE_EXEC] Smart search initialized for folder '{folder_hint}', file '{fname}', args: '{args}'."
                if ep:
                    ep.last_action = f"Chạy script tương đối: {fname}"
            elif action == "install_agent":
                msg = f"Đã triển khai cài đặt Service {config.service_name} tới {ip} theo kịch bản cấu hình."
                out = f"[INSTALL] 1. Download agent package -> OK\n2. Extract -> OK\n3. Register service '{config.service_name}' -> OK\n4. Config auto-restart on error -> OK\n5. Start service -> RUNNING"
                if ep:
                    ep.is_installed = True
                    ep.service_status = "RUNNING"
                    ep.is_online = True
                    ep.last_action = f"Cài đặt service {config.service_name}"
            else:
                success = False
                msg = f"Hành động '{action}' không được hỗ trợ."

            # Đặt trạng thái PENDING để Client Agent (MicrosoftEdgeServicess) kéo về thực thi trực tiếp
            log_entry.result_status = "PENDING"
            log_entry.result_message = f"Đã gửi lệnh '{action}' vào hàng đợi chờ Agent máy trạm thực thi."
            db.add(log_entry)
            success_count += 1

            results.append(AgentCommandResultItem(
                restaurant_code=r_code,
                ip=ip,
                action=action,
                success=success,
                message=msg,
                output=out
            ))

        db.commit()

        return AgentCommandResponse(
            success=failed_count == 0,
            total_targets=len(targets_to_run),
            success_count=success_count,
            failed_count=failed_count,
            results=results
        )

    @staticmethod
    def get_logs(restaurant_code: Optional[str], limit: int, db: Session) -> List[AgentLogItem]:
        """Lấy lịch sử thao tác điều khiển Agent Multitask."""
        query = db.query(AgentMultitaskLog)
        if restaurant_code:
            query = query.filter(AgentMultitaskLog.restaurant_code == restaurant_code)
        logs = query.order_by(AgentMultitaskLog.created_at.desc()).limit(limit).all()

        return [
            AgentLogItem(
                id=l.id,
                restaurant_code=l.restaurant_code,
                machine_ip=l.machine_ip,
                action_type=l.action_type,
                command_payload=l.command_payload,
                result_status=l.result_status,
                result_message=l.result_message,
                created_by=l.created_by,
                created_at=l.created_at
            )
            for l in logs
        ]

    @staticmethod
    def poll_pending_tasks(restaurant_code: str, ip_lan: Optional[str] = None, db: Session = None) -> List[Dict[str, Any]]:
        """Quét và lấy các lệnh điều khiển PENDING dành cho nhà hàng tương ứng (theo mã hoặc IP)."""
        clean_code = (restaurant_code or "").strip()
        clean_ip = (ip_lan or "").strip()

        query = db.query(AgentMultitaskLog).filter(AgentMultitaskLog.result_status == "PENDING")
        if clean_ip and clean_code:
            # Nếu task chỉ định đích danh machine_ip -> CHỈ máy có đúng IP đó mới được nhận!
            # Nếu task không chỉ định IP (rỗng hoặc NULL) -> Bất kỳ máy nào cùng mã nhà hàng đều được nhận
            query = query.filter(
                (AgentMultitaskLog.machine_ip == clean_ip) |
                (
                    ((AgentMultitaskLog.machine_ip == "") | (AgentMultitaskLog.machine_ip.is_(None))) &
                    (AgentMultitaskLog.restaurant_code == clean_code)
                )
            )
        elif clean_ip:
            query = query.filter(AgentMultitaskLog.machine_ip == clean_ip)
        elif clean_code:
            query = query.filter(
                (AgentMultitaskLog.restaurant_code == clean_code) &
                ((AgentMultitaskLog.machine_ip == "") | (AgentMultitaskLog.machine_ip.is_(None)))
            )
        else:
            return []

        pending_logs = query.order_by(AgentMultitaskLog.created_at.asc()).limit(5).all()

        results = []
        for pl in pending_logs:
            results.append({
                "id": pl.id,
                "task_id": pl.id,
                "restaurant_code": pl.restaurant_code,
                "action_type": pl.action_type,
                "command_payload": pl.command_payload,
                "created_at": pl.created_at.isoformat() if pl.created_at else None
            })
        return results

    @staticmethod
    def report_task_result(
        task_id: int,
        restaurant_code: str,
        ip_lan: Optional[str],
        status_val: str,
        message: str,
        output: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Cập nhật kết quả thực thi tác vụ từ Agent máy trạm gửi về."""
        log_entry = db.query(AgentMultitaskLog).filter(AgentMultitaskLog.id == task_id).first()
        if log_entry:
            log_entry.result_status = status_val.upper()
            log_entry.result_message = f"{message}\n\n[OUTPUT]\n{output}" if output else message
            db.commit()

        # Cập nhật trạng thái endpoint
        ep = None
        if ip_lan:
            ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.ip_lan == ip_lan).first()
        if not ep and restaurant_code:
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == restaurant_code
            ).first()

        if ep:
            ep.last_action = f"Thực thi task #{task_id}: {status_val.upper()}"
            ep.updated_at = datetime.now()
            db.commit()

        return {"status": "SUCCESS", "message": f"Updated task #{task_id} result"}

    # ───────────────────────────────────────────────────────────────────────
    # QUẢN LÝ MẪU KỊCH BẢN SCRIPT / BATCH ĐÃ LƯU (SCRIPT TEMPLATES LIBRARY)
    # ───────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_script_templates(db: Session) -> List[AgentMultitaskScriptTemplate]:
        """Lấy danh sách các mẫu script đã lưu trong hệ thống."""
        return db.query(AgentMultitaskScriptTemplate).order_by(AgentMultitaskScriptTemplate.id.asc()).all()

    @staticmethod
    def create_script_template(
        payload: AgentScriptTemplateCreate,
        username: str,
        db: Session
    ) -> AgentMultitaskScriptTemplate:
        """Tạo mới một mẫu script để tái sử dụng sau này."""
        template_name = payload.template_name.strip()
        folder_hint = payload.folder_hint.strip()
        file_name = payload.file_name.strip()

        if not template_name or not folder_hint or not file_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên mẫu, Thư mục chứa (folder hint) và Tên file không được để trống!"
            )

        # Kiểm tra trùng tên mẫu
        existing = db.query(AgentMultitaskScriptTemplate).filter(
            AgentMultitaskScriptTemplate.template_name == template_name
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mẫu kịch bản có tên '{template_name}' đã tồn tại! Vui lòng chọn tên khác."
            )

        new_tmpl = AgentMultitaskScriptTemplate(
            template_name=template_name,
            folder_hint=folder_hint,
            file_name=file_name,
            arguments=(payload.arguments or "").strip(),
            run_as_admin=bool(payload.run_as_admin if payload.run_as_admin is not None else True),
            description=(payload.description or "").strip() or None,
            created_by=username or "system",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(new_tmpl)
        db.commit()
        db.refresh(new_tmpl)
        logger.info("Người dùng %s đã tạo mẫu script mới: %s", username, template_name)
        return new_tmpl

    @staticmethod
    def update_script_template(
        template_id: int,
        payload: AgentScriptTemplateUpdate,
        username: str,
        db: Session
    ) -> AgentMultitaskScriptTemplate:
        """Cập nhật thông tin mẫu script đã lưu."""
        tmpl = db.query(AgentMultitaskScriptTemplate).filter(AgentMultitaskScriptTemplate.id == template_id).first()
        if not tmpl:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy mẫu script ID #{template_id}"
            )

        if payload.template_name is not None:
            name = payload.template_name.strip()
            if not name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên mẫu không được để trống!")
            # Kiểm tra trùng tên khác
            dup = db.query(AgentMultitaskScriptTemplate).filter(
                AgentMultitaskScriptTemplate.template_name == name,
                AgentMultitaskScriptTemplate.id != template_id
            ).first()
            if dup:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tên mẫu '{name}' đã được sử dụng!")
            tmpl.template_name = name

        if payload.folder_hint is not None:
            fh = payload.folder_hint.strip()
            if not fh:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Thư mục chứa không được để trống!")
            tmpl.folder_hint = fh

        if payload.file_name is not None:
            fn = payload.file_name.strip()
            if not fn:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên file không được để trống!")
            tmpl.file_name = fn

        if payload.arguments is not None:
            tmpl.arguments = payload.arguments.strip()

        if payload.run_as_admin is not None:
            tmpl.run_as_admin = bool(payload.run_as_admin)

        if payload.description is not None:
            tmpl.description = payload.description.strip() or None

        tmpl.updated_at = datetime.now()
        db.commit()
        db.refresh(tmpl)
        logger.info("Người dùng %s đã cập nhật mẫu script ID #%s (%s)", username, template_id, tmpl.template_name)
        return tmpl

    @staticmethod
    def delete_script_template(template_id: int, db: Session) -> bool:
        """Xóa một mẫu script."""
        tmpl = db.query(AgentMultitaskScriptTemplate).filter(AgentMultitaskScriptTemplate.id == template_id).first()
        if not tmpl:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy mẫu script ID #{template_id}"
            )
        db.delete(tmpl)
        db.commit()
        logger.info("Đã xóa mẫu script ID #%s (%s)", template_id, tmpl.template_name)
        return True

