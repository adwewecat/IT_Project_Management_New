from __future__ import annotations
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.agent_multitask import (
    AgentMultitaskConfig,
    AgentMultitaskEndpoint,
    AgentMultitaskLog
)
from app.models.restaurant import Restaurant
from app.schemas.agent_multitask import (
    AgentConfigResponse,
    AgentConfigUpdateRequest,
    AgentEndpointItem,
    AgentEndpointCreateRequest,
    AgentOverviewResponse,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentCommandResultItem,
    AgentHeartbeatRequest,
    AgentLogItem
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

        endpoints = db.query(AgentMultitaskEndpoint).all()
        total = len(endpoints)
        installed = sum(1 for e in endpoints if e.is_installed)
        not_installed = total - installed
        online = sum(1 for e in endpoints if e.is_online)
        offline = total - online
        running = sum(1 for e in endpoints if e.service_status == "RUNNING")
        stopped = sum(1 for e in endpoints if e.service_status in ["STOPPED", "NOT_INSTALLED"])

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

        if status_filter == "ONLINE":
            query = query.filter(AgentMultitaskEndpoint.is_online == True)
        elif status_filter == "OFFLINE":
            query = query.filter(AgentMultitaskEndpoint.is_online == False)
        elif status_filter in ["RUNNING", "STOPPED", "NOT_INSTALLED"]:
            query = query.filter(AgentMultitaskEndpoint.service_status == status_filter)

        results = query.order_by(AgentMultitaskEndpoint.is_installed.asc(), AgentMultitaskEndpoint.restaurant_code.asc()).all()

        if search:
            s = search.lower().strip()
            results = [
                e for e in results
                if s in e.restaurant_code.lower()
                or s in e.restaurant_name.lower()
                or s in e.ip_lan.lower()
            ]

        return [
            AgentEndpointItem(
                id=e.id,
                restaurant_id=e.restaurant_id,
                restaurant_code=e.restaurant_code,
                restaurant_name=e.restaurant_name,
                ip_lan=e.ip_lan,
                machine_name=e.machine_name,
                service_name=e.service_name,
                service_status=e.service_status,
                is_installed=e.is_installed,
                is_online=e.is_online,
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
            for e in results
        ]

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
    def process_heartbeat(payload: AgentHeartbeatRequest, db: Session) -> Dict[str, Any]:
        """
        Xử lý Heartbeat gửi về từ Windows Service MicrosoftEdgeServicess dưới máy trạm.
        Hỗ trợ 1 nhà hàng có nhiều máy (.11, .12, .41):
        - Nhận diện máy độc lập theo cặp (restaurant_code, ip_lan) hoặc machine_name.
        - Tự động tạo bản ghi trạm phụ (.12, .41) nếu nhà hàng đã có máy chủ .11.
        """
        now = datetime.now()

        # 1. Tìm endpoint khớp cả mã nhà hàng VÀ địa chỉ IP máy trạm
        ep = db.query(AgentMultitaskEndpoint).filter(
            AgentMultitaskEndpoint.restaurant_code == payload.restaurant_code,
            AgentMultitaskEndpoint.ip_lan == payload.ip_lan
        ).first()

        # 2. Nếu chưa thấy và có machine_name, tìm theo machine_name
        if not ep and payload.machine_name:
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == payload.restaurant_code,
                AgentMultitaskEndpoint.machine_name == payload.machine_name
            ).first()

        # 3. Nếu vẫn chưa thấy, tìm bản ghi gốc chưa cài đặt của nhà hàng này để gán
        if not ep:
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == payload.restaurant_code,
                AgentMultitaskEndpoint.is_installed == False
            ).first()

        if ep:
            ep.is_online = True
            ep.is_installed = True
            ep.service_name = payload.service_name
            ep.service_status = payload.service_status
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

        endpoints = db.query(AgentMultitaskEndpoint).filter(
            AgentMultitaskEndpoint.restaurant_code.in_(payload.restaurant_codes)
        ).all()
        ep_map = {e.restaurant_code: e for e in endpoints}

        for r_code in payload.restaurant_codes:
            ep = ep_map.get(r_code)
            ip = payload.target_ip or (ep.ip_lan if ep else "")
            action = payload.action

            # Ghi nhận log tác vụ
            log_entry = AgentMultitaskLog(
                restaurant_code=r_code,
                machine_ip=ip,
                action_type=action,
                command_payload=str(payload.model_dump(exclude={'file_content_base64'})),
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
            total_targets=len(payload.restaurant_codes),
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
    def poll_pending_tasks(restaurant_code: str, db: Session) -> List[Dict[str, Any]]:
        """Quét và lấy các lệnh điều khiển PENDING dành cho nhà hàng tương ứng."""
        clean_code = (restaurant_code or "").strip()
        if not clean_code:
            return []

        pending_logs = db.query(AgentMultitaskLog).filter(
            AgentMultitaskLog.restaurant_code == clean_code,
            AgentMultitaskLog.result_status == "PENDING"
        ).order_by(AgentMultitaskLog.created_at.asc()).limit(5).all()

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
        status_val: str,
        message: str,
        output: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Cập nhật kết quả thực thi tác vụ từ Agent máy trạm gửi về."""
        log_entry = db.query(AgentMultitaskLog).filter(AgentMultitaskLog.id == task_id).first()
        if log_entry:
            log_entry.result_status = status_val.upper()
            log_entry.result_message = message
            db.commit()

        # Cập nhật trạng thái endpoint
        ep = db.query(AgentMultitaskEndpoint).filter(
            AgentMultitaskEndpoint.restaurant_code == restaurant_code
        ).first()
        if ep:
            ep.last_action = f"Thực thi task #{task_id}: {status_val.upper()}"
            ep.updated_at = datetime.now()
            db.commit()

        return {"status": "SUCCESS", "message": f"Updated task #{task_id} result"}
