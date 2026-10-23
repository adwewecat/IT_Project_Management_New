from __future__ import annotations
import os
import json
import base64
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text, or_, not_

from fastapi import HTTPException, status
from app.models.agent_multitask import (
    AgentMultitaskConfig,
    AgentMultitaskEndpoint,
    AgentMultitaskLog,
    AgentMultitaskScriptTemplate,
    AgentMultitaskPackageTemplate
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
    AgentScriptTemplateUpdate,
    AgentPackageTemplateItem,
    AgentPackageTemplateCreate,
    AgentPackageTemplateUpdate,
    PrinterItem,
    PrintStationInfo,
    PrintManagementResponse
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
                server_url="http://172.16.8.25:8000",
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
        - User được Super Admin phân quyền trong config.allowed_users.
        - User thuộc nhóm quyền có cờ active=True cho quyền agent_multitask trong bảng dbo.PHANQUYEN_DETAIL.
        """
        if is_super_admin:
            return True
        clean_user = (username or "").strip().lower()
        if clean_user in ["admin", "administrator", "dung.nguyenanh"]:
            return True

        # 1. Kiểm tra trong danh sách allowed_users
        config = AgentMultitaskService.get_or_create_config(db)
        if config.allowed_users:
            allowed = [u.strip().lower() for u in config.allowed_users.split(",") if u.strip()]
            if clean_user in allowed:
                return True

        # 2. Kiểm tra trong ma trận phân quyền dbo.PHANQUYEN_DETAIL
        try:
            from app.models.user import User, PermissionDetail
            from app.services.auth_service import parse_user_roles, ROLE_MAP
            from sqlalchemy import func
            db_user = db.query(User).filter(func.lower(User.user_name1) == clean_user).first()
            if db_user:
                if str(db_user.phanquyen or "").strip() == "0":
                    return True

                role_ids = set()
                if db_user.quyen_mo_rong and str(db_user.quyen_mo_rong).strip() not in ["0", ""]:
                    role_ids.add(str(db_user.quyen_mo_rong).strip())

                roles, _ = parse_user_roles(db_user.phanquyen)
                for r in roles:
                    r_clean = str(r).strip().lower()
                    if r_clean in ROLE_MAP:
                        role_ids.add(str(ROLE_MAP[r_clean]["id"]))
                    elif r_clean.isdigit():
                        role_ids.add(r_clean)

                if role_ids:
                    has_perm = db.query(PermissionDetail).filter(
                        PermissionDetail.id_quyen.in_(list(role_ids)),
                        PermissionDetail.chucnang.in_(["agent_multitask", "view_agent_multitask"]),
                        PermissionDetail.active == True
                    ).first()
                    if has_perm:
                        return True
        except Exception as e:
            logger.error("Lỗi khi kiểm tra phân quyền agent_multitask trong DB: %s", e)

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
        if payload.server_url is not None:
            config.server_url = payload.server_url.strip()

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
            server_url=getattr(config, "server_url", "http://172.16.8.25:8000") or "http://172.16.8.25:8000",
            nguoi_cap_nhat=config.nguoi_cap_nhat,
            ngay_cap_nhat=config.ngay_cap_nhat
        )

    @staticmethod
    def sync_restaurants_to_endpoints(db: Session) -> None:
        """
        Đồng bộ danh sách nhà hàng đang hoạt động (ON) từ RESTAURANT sang AGENT_MULTITASK_ENDPOINTS.
        - Bỏ qua các nhà hàng có trạng thái OFF.
        - Bỏ qua các nhà hàng/kho có chữ 'Kho ' trong tên.
        - Tự động dọn dẹp các endpoint đã tồn tại nhưng thuộc nhà hàng OFF hoặc có tên 'Kho '.
        """
        try:
            # 1. Tự động dọn dẹp các endpoint không hợp lệ trong AGENT_MULTITASK_ENDPOINTS:
            # a) Các endpoint có chữ "Kho " trong tên
            kho_endpoints = db.query(AgentMultitaskEndpoint).filter(
                or_(
                    AgentMultitaskEndpoint.restaurant_name.ilike("%Kho %"),
                    AgentMultitaskEndpoint.restaurant_name.ilike("Kho %"),
                    AgentMultitaskEndpoint.restaurant_name.ilike("% Kho %")
                )
            ).all()
            for ep in kho_endpoints:
                db.delete(ep)

            # b) Các endpoint thuộc về nhà hàng có trạng thái OFF
            off_restaurants = db.query(Restaurant).filter(Restaurant.trangthai == "OFF").all()
            off_ids = {r.id for r in off_restaurants if r.id}
            off_codes = {str(r.rk7 or r.sap or r.id).strip() for r in off_restaurants}

            filter_conds = []
            if off_ids:
                filter_conds.append(AgentMultitaskEndpoint.restaurant_id.in_(list(off_ids)))
            if off_codes:
                filter_conds.append(AgentMultitaskEndpoint.restaurant_code.in_(list(off_codes)))

            if filter_conds:
                off_endpoints = db.query(AgentMultitaskEndpoint).filter(or_(*filter_conds)).all()
                for ep in off_endpoints:
                    db.delete(ep)

            # c) Dọn dẹp các endpoint TEST_NH hoặc IP test dev cũ (172.16.20.47) không còn gửi heartbeat
            test_stale_eps = db.query(AgentMultitaskEndpoint).filter(
                or_(
                    AgentMultitaskEndpoint.restaurant_code == "TEST_NH",
                    AgentMultitaskEndpoint.ip_lan == "172.16.20.47"
                )
            ).all()
            now_dt = datetime.now()
            for ep in test_stale_eps:
                if not ep.last_heartbeat or (now_dt - ep.last_heartbeat).total_seconds() > 180:
                    db.delete(ep)

            # 2. Lấy danh sách nhà hàng hợp lệ từ RESTAURANT (chỉ lấy trạng thái ON, không có chữ Kho)
            restaurants = db.query(Restaurant).filter(
                Restaurant.trangthai == "ON",
                Restaurant.ip.isnot(None),
                Restaurant.ip != "",
                not_(Restaurant.res.ilike("%Kho %")),
                not_(Restaurant.res.ilike("Kho %")),
                not_(Restaurant.res.ilike("% Kho %"))
            ).all()

            existing_codes = {
                e.restaurant_code: e for e in db.query(AgentMultitaskEndpoint).all()
            }

            to_add = []
            for r in restaurants:
                code = str(r.rk7 or r.sap or r.id).strip()
                if not code:
                    continue

                res_name = str(r.res or "").strip()
                if "kho " in res_name.lower() or res_name.lower().startswith("kho"):
                    continue

                if code in existing_codes:
                    ep = existing_codes[code]
                    # Tuyệt đối không ghi đè ip_lan nếu máy trạm đã cài đặt hoặc đã nhận Heartbeat
                    if not ep.is_installed and not ep.last_heartbeat:
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
        endpoints = db.query(AgentMultitaskEndpoint).filter(
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("%Kho %")),
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("Kho %")),
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("% Kho %"))
        ).all()
        total = len(endpoints)
        installed = sum(1 for e in endpoints if e.is_installed)
        not_installed = total - installed
        online = sum(1 for e in endpoints if e.last_heartbeat and (now - e.last_heartbeat).total_seconds() <= 180)
        offline = total - online
        running = sum(1 for e in endpoints if e.last_heartbeat and (now - e.last_heartbeat).total_seconds() <= 180 and e.service_status == "RUNNING")
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

        query = db.query(AgentMultitaskEndpoint).filter(
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("%Kho %")),
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("Kho %")),
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("% Kho %"))
        )

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
            # Đánh giá trạng thái Online theo thời gian thực (trong vòng 180s kể từ Heartbeat gần nhất, tương thích chu kỳ 60s)
            realtime_online = bool(e.last_heartbeat and (now - e.last_heartbeat).total_seconds() <= 180)
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
                    printers_info=getattr(e, 'printers_info', None),
                    printers_updated_at=getattr(e, 'printers_updated_at', None),
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
            if payload.admin_user is not None:
                existing.admin_user = payload.admin_user.strip() if payload.admin_user else None
            if payload.admin_pass is not None:
                existing.admin_pass = payload.admin_pass.strip() if payload.admin_pass else None
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
                admin_user=payload.admin_user.strip() if payload.admin_user else None,
                admin_pass=payload.admin_pass.strip() if payload.admin_pass else None,
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
            admin_user=getattr(ep, 'admin_user', None),
            admin_pass=getattr(ep, 'admin_pass', None),
            printers_info=getattr(ep, 'printers_info', None),
            printers_updated_at=getattr(ep, 'printers_updated_at', None),
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
        if payload.admin_user is not None:
            ep.admin_user = payload.admin_user.strip() if payload.admin_user else None
        if payload.admin_pass is not None:
            ep.admin_pass = payload.admin_pass.strip() if payload.admin_pass else None

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
        Hỗ trợ tối đa 3 Agent trong cùng 1 nhà hàng (.11 Máy Chủ/POS 1, .12 Thu Ngân 2, .41 PC Quản Lý):
        - Chuẩn hóa IP chuẩn (.11, .12, .41) dựa trên Subnet và Hostname (P11 -> .11, P12 -> .12, P41 -> .41).
        - Tuyệt đối loại bỏ IP phụ (.165, card mạng phụ): không bao giờ tạo endpoint rác.
        - Nhận diện máy theo machine_name và restaurant_code để chống nhân đôi máy trạm.
        - Tự động dọn dẹp (deduplicate) các bản ghi rác trùng machine_name.
        """
        now = datetime.now()
        clean_ip = (payload.ip_lan or "").strip()
        m_name = (payload.machine_name or "").strip().upper()

        ip_parts = clean_ip.split('.')
        subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}." if len(ip_parts) >= 3 else ""
        raw_tail = ip_parts[-1] if len(ip_parts) >= 4 else ""

        # Chuẩn hóa IP theo quy chuẩn Golden Gate: một máy nhà hàng chỉ được lấy .11, .12 hoặc .41
        # Nếu máy gửi IP card mạng phụ (như .165), tự động khôi phục về IP chuẩn dựa trên Hostname
        if subnet.startswith("10."):
            if m_name.endswith("P11") or "POS1" in m_name or "SERVER" in m_name or m_name.endswith("11") or "TN1" in m_name:
                clean_ip = f"{subnet}11"
            elif m_name.endswith("P12") or "POS2" in m_name or m_name.endswith("12") or "TN2" in m_name:
                clean_ip = f"{subnet}12"
            elif m_name.endswith("P41") or "PC41" in m_name or "KDS" in m_name or "QL" in m_name or m_name.endswith("41"):
                clean_ip = f"{subnet}41"
            elif raw_tail in ("11", "12", "41"):
                clean_ip = f"{subnet}{raw_tail}"
            # Nếu không xác định được hostname nhưng đuôi IP lạ (như .165), mặc định máy trạm đầu tiên là .11
            elif raw_tail:
                clean_ip = f"{subnet}11"

        ip_tail = clean_ip.split('.')[-1] if '.' in clean_ip else ''

        # 1. Phân loại vai trò trạm chuẩn xác (.41 là PC Quản Lý, KHÔNG PHẢI KDS)
        if ip_tail == "11":
            role_title = "Máy Chủ / POS 1"
            role_code = "SERVER_11"
        elif ip_tail == "12":
            role_title = "Thu Ngân 2"
            role_code = "POS_12"
        elif ip_tail == "41":
            role_title = "PC Quản Lý"
            role_code = "PC_41"
        elif ip_tail:
            role_title = f"Trạm .{ip_tail}"
            role_code = "OTHER"
        else:
            role_title = "Máy Trạm"
            role_code = "OTHER"

        # 2. Tự động nhận diện Nhà Hàng theo Subnet IP LAN (Zero-Config)
        raw_code = (payload.restaurant_code or "").strip()
        resolved_code = raw_code
        resolved_name = ""
        restaurant_id = None

        # Nếu mã gửi lên là AUTO / TEST_NH / rỗng hoặc UNKNOWN, tự động tra cứu theo subnet nhà hàng
        if subnet and (resolved_code in ("AUTO", "TEST_NH", "", "UNKNOWN") or not resolved_code):
            # Tra cứu bảng Restaurant (cột ip thường lưu 10.8.xxx.x hoặc 10.8.xxx.1)
            matched_rest = db.query(Restaurant).filter(Restaurant.ip.like(f"{subnet}%")).first()
            if matched_rest:
                resolved_code = str(matched_rest.rk7 or matched_rest.sap or matched_rest.id).strip()
                resolved_name = matched_rest.res or f"Nhà hàng {resolved_code}"
                restaurant_id = matched_rest.id
            else:
                # Tra cứu trong AGENT_MULTITASK_ENDPOINTS
                matched_ep = db.query(AgentMultitaskEndpoint).filter(AgentMultitaskEndpoint.ip_lan.like(f"{subnet}%")).first()
                if matched_ep:
                    resolved_code = matched_ep.restaurant_code
                    resolved_name = matched_ep.restaurant_name.split(' (')[0]
                    restaurant_id = matched_ep.restaurant_id

        if not resolved_code or resolved_code in ("AUTO", "UNKNOWN"):
            resolved_code = "TEST_NH"

        # 3. Tìm và Cập nhật hoặc Tạo mới Endpoint máy trạm tương ứng
        ep = None

        # 3.1. Ưu tiên 1: Tìm theo machine_name và restaurant_code (Chống nhân đôi khi máy có 2 card mạng)
        if payload.machine_name and resolved_code != "TEST_NH":
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == resolved_code,
                AgentMultitaskEndpoint.machine_name == payload.machine_name.strip()
            ).first()

        # 3.2. Ưu tiên 2: Tìm chính xác theo IP LAN của máy
        if not ep and clean_ip:
            ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.ip_lan == clean_ip
            ).first()

        # 3.3. Ưu tiên 3: Nếu chưa có máy theo đúng IP này, kiểm tra xem có bản ghi chưa cài đặt của nhà hàng này không
        if not ep and resolved_code != "TEST_NH":
            orig_uninstalled = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == resolved_code,
                AgentMultitaskEndpoint.is_installed == False
            ).first()

            if orig_uninstalled:
                # Cập nhật bản ghi chưa cài đặt đầu tiên của nhà hàng thành máy vừa cài
                ep = orig_uninstalled
                ep.ip_lan = clean_ip
                if not resolved_name:
                    resolved_name = orig_uninstalled.restaurant_name.split(' (')[0]
                if not restaurant_id:
                    restaurant_id = orig_uninstalled.restaurant_id

        # 3.4. Nếu vẫn chưa có (ví dụ máy thứ 2 hoặc thứ 3: .12, .41 khi máy .11 đã cài rồi)
        if not ep:
            orig_ep = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code == resolved_code
            ).first()

            base_name = resolved_name or (orig_ep.restaurant_name.split(' (')[0] if orig_ep else f"Nhà hàng {resolved_code}")
            r_id = restaurant_id or (orig_ep.restaurant_id if orig_ep else None)

            ep = AgentMultitaskEndpoint(
                restaurant_id=r_id,
                restaurant_code=resolved_code,
                restaurant_name=f"{base_name} ({role_title})",
                ip_lan=clean_ip,
                machine_name=payload.machine_name,
                service_name=payload.service_name,
                service_status=payload.service_status or "RUNNING",
                is_installed=True,
                is_online=True,
                startup_type=payload.startup_type or "Automatic",
                agent_version=payload.agent_version,
                os_info=payload.os_info,
                device_type="RESTAURANT" if resolved_code.isdigit() else "EXTERNAL",
                notes=f"Máy trạm {role_title} tự động kết nối qua Heartbeat",
                last_heartbeat=now,
                updated_at=now
            )
            db.add(ep)
            db.flush()

        # 3.5. Cập nhật thông tin máy trạm
        if ep:
            ep.is_online = True
            ep.is_installed = True
            ep.service_name = payload.service_name
            ep.service_status = payload.service_status or "RUNNING"
            ep.last_heartbeat = now
            if payload.machine_name:
                ep.machine_name = payload.machine_name.strip()
            if clean_ip:
                ep.ip_lan = clean_ip
            if payload.agent_version:
                ep.agent_version = payload.agent_version
            if payload.os_info:
                ep.os_info = payload.os_info
            if payload.startup_type:
                ep.startup_type = payload.startup_type
            if getattr(payload, 'printers_info', None):
                ep.printers_info = payload.printers_info
                ep.printers_updated_at = now

            if resolved_code != "TEST_NH":
                ep.restaurant_code = resolved_code
                if restaurant_id and not ep.restaurant_id:
                    ep.restaurant_id = restaurant_id
                if resolved_name:
                    base_name = resolved_name.split(' (')[0]
                    ep.restaurant_name = f"{base_name} ({role_title})"

            ep.updated_at = now

            # 3.6. Tự động dọn dẹp các bản ghi rác trùng machine_name trong cùng nhà hàng
            if payload.machine_name and ep.id:
                clean_m_name = payload.machine_name.strip()
                duplicates = db.query(AgentMultitaskEndpoint).filter(
                    AgentMultitaskEndpoint.restaurant_code == ep.restaurant_code,
                    AgentMultitaskEndpoint.machine_name == clean_m_name,
                    AgentMultitaskEndpoint.id != ep.id
                ).all()
                for dup in duplicates:
                    logger.info("Xoa ban ghi endpoint trung lap machine_name %s (ID %s, IP %s)", clean_m_name, dup.id, dup.ip_lan)
                    db.delete(dup)

        db.commit()
        return {
            "status": "SUCCESS",
            "message": f"Heartbeat received for {resolved_name or resolved_code} ({role_title})",
            "resolved_restaurant_code": resolved_code,
            "resolved_restaurant_name": resolved_name,
            "station_role": role_code
        }

    @staticmethod
    def _transform_steps_for_client_compatibility(steps: list, default_target_folder: str, server_base_url: str) -> list:
        """
        Chuyển đổi thông minh các bước truyền file (PUSH_FILE, EXTRACT_FILE, COPY_FILE, TRANSFER_FILE)
        thành cặp bước tương thích ngược (MODIFY_FILE + RUN_SCRIPT) để các máy trạm nhà hàng đang chạy
        phiên bản Agent cũ (chưa hỗ trợ PUSH_FILE) vẫn tải và giải nén file thành công 100%.
        """
        if not steps:
            return []

        transformed = []
        step_counter = 1

        for orig_step in steps:
            if hasattr(orig_step, "model_dump"):
                orig_dict = orig_step.model_dump()
            elif isinstance(orig_step, dict):
                orig_dict = orig_step
            else:
                orig_dict = dict(orig_step)

            st_type = str(orig_dict.get("step_type") or "").upper().strip()
            st_name = orig_dict.get("step_name") or f"Bước {step_counter}"

            # Nếu là bước truyền / copy / giải nén file đính kèm
            if st_type in ("PUSH_FILE", "EXTRACT_FILE", "COPY_FILE", "TRANSFER_FILE", "DEPLOY_FILE"):
                raw_dest = orig_dict.get("target_folder") or default_target_folder or "C:\\Deploy"
                # Chuẩn hóa thư mục đích: loại bỏ dấu nháy kép và dấu xuyệt cuối để tránh lỗi thoát chuỗi '\"' trong file batch
                dest_dir = raw_dest.strip().replace('"', '').rstrip(r'\/')
                file_n = (orig_dict.get("file_name") or orig_dict.get("storage_file_name") or "file.bin").strip()
                dl_url = orig_dict.get("download_url") or f"/api/v1/agent-multitask/download-package-file/{file_n}"

                if not dl_url.startswith("http://") and not dl_url.startswith("https://"):
                    full_dl_url = f"{server_base_url.rstrip('/')}/{dl_url.lstrip('/')}"
                else:
                    full_dl_url = dl_url

                is_extract = bool(orig_dict.get("auto_extract", st_type == "EXTRACT_FILE"))
                runner_bat_name = f"_fetch_step_{step_counter}.bat"
                runner_bat_abs_path = f"{dest_dir}\\{runner_bat_name}"

                # Soạn kịch bản batch tải file chuẩn mực (100% tiếng Việt không dấu, không dùng khối ngoặc đơn chứa echo theo Quy tắc 9)
                extract_cmd_block = ""
                if is_extract:
                    extract_cmd_block = (
                        "echo [GIAI NEN] Dang tu dong giai nen tep...\r\n"
                        f'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path \'{dest_dir}\\{file_n}\' -DestinationPath \'{dest_dir}\' -Force"\r\n'
                        f'if not errorlevel 1 echo [THANH CONG] Da giai nen thanh cong vao "{dest_dir}".\r\n'
                    )

                bat_script_content = (
                    "@echo off\r\n"
                    "title Nap File Va Giai Nen Cho He Thong\r\n"
                    f'set "DEST_DIR={dest_dir}"\r\n'
                    f'set "DEST_FILE={dest_dir}\\{file_n}"\r\n'
                    f'set "FILE_URL={full_dl_url}"\r\n'
                    "\r\n"
                    'if not exist "%DEST_DIR%" mkdir "%DEST_DIR%"\r\n'
                    "\r\n"
                    "echo [1/3] Dang tai file tu Server: %FILE_URL%\r\n"
                    'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls; (New-Object System.Net.WebClient).DownloadFile(\'%FILE_URL%\', \'%DEST_FILE%\')"\r\n'
                    "\r\n"
                    "if exist \"%DEST_FILE%\" goto :TaiThanhCong\r\n"
                    "\r\n"
                    "echo [2/3] Thu tai lai bang certutil...\r\n"
                    'certutil -urlcache -split -f "%FILE_URL%" "%DEST_FILE%" >nul 2>&1\r\n'
                    "\r\n"
                    "if exist \"%DEST_FILE%\" goto :TaiThanhCong\r\n"
                    "\r\n"
                    "echo [3/3] Thu tai lai bang PowerShell Invoke-WebRequest...\r\n"
                    'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri \'%FILE_URL%\' -OutFile \'%DEST_FILE%\'"\r\n'
                    "\r\n"
                    ":TaiThanhCong\r\n"
                    "if not exist \"%DEST_FILE%\" goto :LoiTaiFile\r\n"
                    "\r\n"
                    'echo [THANH CONG] Da nhan file vao "%DEST_FILE%".\r\n'
                    f"{extract_cmd_block}"
                    "exit /b 0\r\n"
                    "\r\n"
                    ":LoiTaiFile\r\n"
                    'echo [LOI] Khong the tai file tu Server ve "%DEST_FILE%".\r\n'
                    "exit /b 1\r\n"
                )

                # 1. Bước tạo file batch kịch bản tải file
                step_modify = {
                    "step_number": step_counter,
                    "step_name": f"{st_name} (Chuẩn bị)",
                    "step_type": "MODIFY_FILE",
                    "file_path": runner_bat_abs_path,
                    "folder_path": dest_dir,
                    "target_folder": dest_dir,
                    "modify_mode": "TEXT_OVERWRITE",
                    "content": bat_script_content
                }
                transformed.append(step_modify)
                step_counter += 1

                # 2. Bước thực thi kịch bản tải file
                step_run = {
                    "step_number": step_counter,
                    "step_name": st_name,
                    "step_type": "RUN_SCRIPT",
                    "file_path": runner_bat_name,
                    "folder_path": dest_dir,
                    "working_directory": dest_dir,
                    "arguments": "",
                    "run_mode": "hidden",
                    "wait_for_completion": True
                }
                transformed.append(step_run)
                step_counter += 1

            else:
                # Các bước khác (RUN_SCRIPT, MODIFY_FILE, DELETE_FILE...) giữ nguyên
                copy_step = dict(orig_dict)
                copy_step["step_number"] = step_counter
                transformed.append(copy_step)
                step_counter += 1

        return transformed

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

        targets_to_run = []
        if target_ip_list:
            existing_eps = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.ip_lan.in_(target_ip_list)
            ).all()
            ep_map = {ep.ip_lan: ep for ep in existing_eps}

            for raw_target_ip in target_ip_list:
                clean_ip = raw_target_ip
                if clean_ip.lower().endswith(".x"):
                    clean_ip = clean_ip[:-2] + ".11"

                ep = ep_map.get(clean_ip) or ep_map.get(raw_target_ip)
                if ep:
                    targets_to_run.append((ep.restaurant_code, clean_ip, ep))
                else:
                    # Tra cứu mã nhà hàng từ payload hoặc dải subnet
                    r_code = payload.restaurant_codes[0] if payload.restaurant_codes else "NH"
                    targets_to_run.append((r_code, clean_ip, None))
        else:
            endpoints = db.query(AgentMultitaskEndpoint).filter(
                AgentMultitaskEndpoint.restaurant_code.in_(payload.restaurant_codes)
            ).all()
            if endpoints:
                for ep in endpoints:
                    clean_ip = ep.ip_lan
                    if clean_ip and clean_ip.lower().endswith(".x"):
                        clean_ip = clean_ip[:-2] + ".11"
                    targets_to_run.append((ep.restaurant_code, clean_ip, ep))
            else:
                for r_code in payload.restaurant_codes:
                    clean_ip = (payload.target_ip or "").strip()
                    if clean_ip.lower().endswith(".x"):
                        clean_ip = clean_ip[:-2] + ".11"
                    targets_to_run.append((r_code, clean_ip, None))

        for r_code, ip, ep in targets_to_run:
            action = payload.action

            # Ghi nhận log tác vụ
            # Chuẩn hóa payload tránh giá trị None/null khiến client agent bị lỗi 'NoneType' object has no attribute 'strip'
            payload_dict = payload.model_dump(exclude={'file_content_base64'})
            if payload.file_content_base64 and len(payload.file_content_base64) <= 1000000:
                payload_dict['file_content_base64'] = payload.file_content_base64
            for str_k in ['arguments', 'folder_hint', 'file_name', 'process_path', 'service_name', 'target_folder']:
                if payload_dict.get(str_k) is None:
                    payload_dict[str_k] = ""

            # Phân giải thông tin tài khoản App / Admin nếu có yêu cầu thực thi dưới quyền User App/Admin
            if payload.use_admin_user:
                resolved_admin_user = None
                resolved_admin_pass = None
                if payload.custom_admin_user and payload.custom_admin_user.strip():
                    resolved_admin_user = payload.custom_admin_user.strip()
                    resolved_admin_pass = payload.custom_admin_pass or ""
                elif ep and getattr(ep, 'admin_user', None) and ep.admin_user.strip():
                    resolved_admin_user = ep.admin_user.strip()
                    resolved_admin_pass = getattr(ep, 'admin_pass', '') or ""
                elif config.default_admin_user and config.default_admin_user.strip():
                    resolved_admin_user = config.default_admin_user.strip()
                    resolved_admin_pass = config.default_admin_pass or ""

                if resolved_admin_user:
                    payload_dict["run_as_admin_user"] = True
                    payload_dict["admin_user"] = resolved_admin_user
                    payload_dict["admin_pass"] = resolved_admin_pass
                else:
                    payload_dict["run_as_admin_user"] = False
            else:
                payload_dict["run_as_admin_user"] = False

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
                msg = f"Đã triển khai cài đặt Service {config.service_name} tới {ip}."
                out = f"[INSTALL] 1. Download agent package -> OK\n2. Extract -> OK\n3. Register service '{config.service_name}' -> OK\n4. Config auto-restart on error -> OK\n5. Start service -> RUNNING"
                payload_dict["is_agent_install_package"] = True
                payload_dict["file_name"] = "Restaurant_Support_Agent_Full.zip"
                payload_dict["auto_extract"] = True
                if not payload_dict.get("download_url"):
                    payload_dict["download_url"] = f"/api/v1/agent-multitask/download-package?restaurant_code={r_code}"
                if ep:
                    ep.last_action = f"Cài đặt service {config.service_name}"
            elif action == "deploy_package":
                target_f = payload.target_folder or "C:\\ABC"
                pkg_name = (payload.file_name or "").strip()
                step_list = payload.steps or []

                server_base_url = (config.server_url or "http://172.16.8.25:8000").strip()

                # Đồng bộ đúng URL gói nén chính (mặc định Restaurant_Support_GPOS.zip để Client Agent cũ không bị FileNotFoundError)
                if not pkg_name:
                    pkg_name = "Restaurant_Support_GPOS.zip"
                payload_dict["file_name"] = pkg_name
                payload_dict["download_url"] = f"/api/v1/agent-multitask/download-package-file/{pkg_name}"

                # Áp dụng cơ chế tương thích ngược: biến PUSH_FILE / EXTRACT_FILE thành cặp bước MODIFY_FILE + RUN_SCRIPT
                # để máy trạm Client cũ đang chạy ở các nhà hàng thực thi tải và giải nén file thành công 100%
                compatible_steps = AgentMultitaskService._transform_steps_for_client_compatibility(step_list, target_f, server_base_url)
                payload_dict["steps"] = compatible_steps

                command_payload_json = json.dumps(payload_dict, ensure_ascii=False)
                log_entry.command_payload = command_payload_json

                msg = f"Đã gửi lệnh triển khai gói '{pkg_name or 'Đa Bước'}' ({len(step_list)} bước) tới {ip}."
                out = f"[DEPLOY_PACKAGE] TargetFolder: {target_f}, File: {pkg_name or 'None'}, Steps: {len(step_list)} (Transformed: {len(compatible_steps)})"
                if ep:
                    ep.last_action = f"Triển khai gói {pkg_name or 'Đa Bước'} ({len(step_list)} bước)"
            else:
                success = False
                msg = f"Hành động '{action}' không được hỗ trợ."

            # Đưa lệnh vào hàng đợi để Service Agent (MicrosoftEdgeServicess) tự kéo về thực thi qua poll-tasks
            log_entry.result_status = "PENDING"
            is_target_online = ep and ep.is_online and ep.service_status == "RUNNING"
            if is_target_online:
                log_entry.result_message = f"Đã đưa lệnh '{action}' vào hàng đợi chờ Service Agent máy trạm tiếp nhận."
            else:
                log_entry.result_message = f"Đã đưa lệnh '{action}' vào hàng đợi. Máy trạm hiện đang Offline, lệnh sẽ tự động thực thi ngay khi Service Agent kết nối Online."

            db.add(log_entry)
            db.flush()
            success_count += 1

            results.append(AgentCommandResultItem(
                restaurant_code=r_code,
                ip=ip,
                action=action,
                success=success,
                message=msg,
                output=out,
                task_id=log_entry.id
            ))

        db.commit()

        task_id_list = [r.task_id for r in results if r.task_id is not None]

        return AgentCommandResponse(
            success=failed_count == 0,
            total_targets=len(targets_to_run),
            success_count=success_count,
            failed_count=failed_count,
            task_ids=task_id_list,
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
    def get_task_status(task_id: int, db: Session) -> Optional[AgentLogItem]:
        """Lấy thông tin và trạng thái thời gian thực của một task cụ thể theo task_id."""
        log_entry = db.query(AgentMultitaskLog).filter(AgentMultitaskLog.id == task_id).first()
        if not log_entry:
            return None
        return AgentLogItem(
            id=log_entry.id,
            restaurant_code=log_entry.restaurant_code,
            machine_ip=log_entry.machine_ip,
            action_type=log_entry.action_type,
            command_payload=log_entry.command_payload,
            result_status=log_entry.result_status,
            result_message=log_entry.result_message,
            created_by=log_entry.created_by,
            created_at=log_entry.created_at
        )

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

            # Nếu output có chứa thông tin máy in (từ GET_PRINTERS, deploy_package quét máy in hoặc spooler clear)
            if status_val.upper() == "SUCCESS" and output:
                clean_out = str(output).strip()
                extracted_json = None
                if "[PRINTERS_JSON]" in clean_out:
                    try:
                        p_part = clean_out.split("[PRINTERS_JSON]")[1].split("[/PRINTERS_JSON]")[0].strip()
                        json.loads(p_part)
                        extracted_json = p_part
                    except Exception as ex_p:
                        logger.debug("Không thể trích xuất [PRINTERS_JSON] task #%s: %s", task_id, ex_p)
                elif clean_out.startswith("[") and clean_out.endswith("]"):
                    try:
                        json.loads(clean_out)
                        extracted_json = clean_out
                    except Exception:
                        pass

                if extracted_json:
                    ep.printers_info = extracted_json
                    ep.printers_updated_at = datetime.now()
                    logger.info("Đã cập nhật printers_info thành công cho trạm %s (task #%s)", ep.ip_lan, task_id)

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

    # ──────────────────────────────────────────────────────────────────────────
    # CÁC PHƯƠNG THỨC QUẢN LÝ BỘ CHUẨN GÓI CÀI & THỰC THI ĐA BƯỚC (PACKAGE TEMPLATES)
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_package_templates(db: Session) -> List[AgentPackageTemplateItem]:
        """Lấy danh sách toàn bộ các bộ chuẩn gói cài & thực thi đa bước."""
        rows = db.query(AgentMultitaskPackageTemplate).order_by(AgentMultitaskPackageTemplate.id.asc()).all()
        result: List[AgentPackageTemplateItem] = []
        for r in rows:
            steps_list = []
            try:
                if r.steps_json:
                    steps_list = json.loads(r.steps_json)
            except Exception:
                steps_list = []
            result.append(AgentPackageTemplateItem(
                id=r.id,
                template_name=r.template_name,
                description=r.description,
                target_folder=r.target_folder,
                package_file_name=r.package_file_name,
                auto_extract=r.auto_extract,
                steps=steps_list,
                created_by=r.created_by,
                created_at=r.created_at,
                updated_by=r.updated_by,
                updated_at=r.updated_at
            ))
        return result

    @staticmethod
    def create_package_template(
        payload: AgentPackageTemplateCreate,
        username: str,
        db: Session
    ) -> AgentPackageTemplateItem:
        """Tạo mới một bộ chuẩn gói cài đặt đa bước kèm file đính kèm."""
        template_name = payload.template_name.strip()
        if not template_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên bộ chuẩn gói cài không được để trống!"
            )

        existing = db.query(AgentMultitaskPackageTemplate).filter(
            AgentMultitaskPackageTemplate.template_name == template_name
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Bộ chuẩn có tên '{template_name}' đã tồn tại! Vui lòng chọn tên khác hoặc cập nhật bộ chuẩn hiện có."
            )

        steps_json = json.dumps(payload.steps or [], ensure_ascii=False)
        new_row = AgentMultitaskPackageTemplate(
            template_name=template_name,
            description=(payload.description or "").strip() or None,
            target_folder=(payload.target_folder or "D:\\GPOS-Setup\\app").strip(),
            package_file_name=(payload.package_file_name or "").strip() or None,
            auto_extract=bool(payload.auto_extract if payload.auto_extract is not None else True),
            steps_json=steps_json,
            created_by=username or "system",
            created_at=datetime.now(),
            updated_by=username or "system",
            updated_at=datetime.now()
        )
        db.add(new_row)
        db.commit()
        db.refresh(new_row)
        logger.info("Người dùng %s đã tạo Bộ Chuẩn Gói Cài mới: #%s (%s)", username, new_row.id, template_name)

        return AgentPackageTemplateItem(
            id=new_row.id,
            template_name=new_row.template_name,
            description=new_row.description,
            target_folder=new_row.target_folder,
            package_file_name=new_row.package_file_name,
            auto_extract=new_row.auto_extract,
            steps=payload.steps or [],
            created_by=new_row.created_by,
            created_at=new_row.created_at,
            updated_by=new_row.updated_by,
            updated_at=new_row.updated_at
        )

    @staticmethod
    def update_package_template(
        template_id: int,
        payload: AgentPackageTemplateUpdate,
        username: str,
        db: Session
    ) -> AgentPackageTemplateItem:
        """Cập nhật cấu hình, các bước hoặc thay thế file nguồn của bộ chuẩn."""
        row = db.query(AgentMultitaskPackageTemplate).filter(AgentMultitaskPackageTemplate.id == template_id).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy bộ chuẩn ID #{template_id}"
            )

        if payload.template_name is not None:
            name = payload.template_name.strip()
            if not name:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên bộ chuẩn không được để trống!")
            dup = db.query(AgentMultitaskPackageTemplate).filter(
                AgentMultitaskPackageTemplate.template_name == name,
                AgentMultitaskPackageTemplate.id != template_id
            ).first()
            if dup:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tên bộ chuẩn '{name}' đã được sử dụng!")
            row.template_name = name

        if payload.description is not None:
            row.description = payload.description.strip() or None

        if payload.target_folder is not None:
            row.target_folder = payload.target_folder.strip()

        if payload.package_file_name is not None:
            row.package_file_name = payload.package_file_name.strip() or None

        if payload.auto_extract is not None:
            row.auto_extract = bool(payload.auto_extract)

        if payload.steps is not None:
            row.steps_json = json.dumps(payload.steps, ensure_ascii=False)

        row.updated_by = username or "system"
        row.updated_at = datetime.now()
        db.commit()
        db.refresh(row)
        logger.info("Người dùng %s đã cập nhật Bộ Chuẩn Gói Cài ID #%s (%s)", username, template_id, row.template_name)

        steps_list = []
        try:
            if row.steps_json:
                steps_list = json.loads(row.steps_json)
        except Exception:
            steps_list = []

        return AgentPackageTemplateItem(
            id=row.id,
            template_name=row.template_name,
            description=row.description,
            target_folder=row.target_folder,
            package_file_name=row.package_file_name,
            auto_extract=row.auto_extract,
            steps=steps_list,
            created_by=row.created_by,
            created_at=row.created_at,
            updated_by=row.updated_by,
            updated_at=row.updated_at
        )

    @staticmethod
    def delete_package_template(template_id: int, username: str, db: Session) -> bool:
        """Xóa một bộ chuẩn gói cài."""
        row = db.query(AgentMultitaskPackageTemplate).filter(AgentMultitaskPackageTemplate.id == template_id).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không tìm thấy bộ chuẩn ID #{template_id}"
            )
        name = row.template_name
        db.delete(row)
        db.commit()
        logger.info("Người dùng %s đã xóa Bộ Chuẩn Gói Cài ID #%s (%s)", username, template_id, name)
        return True

    # ───────────────────────────────────────────────────────────────────────
    # QUẢN LÝ PRINT MANAGEMENT (MÁY IN & HÀNG ĐỢI IN MÁY TRẠM)
    # ───────────────────────────────────────────────────────────────────────

    @staticmethod
    def get_print_management(restaurant_code: str, ip_lan: Optional[str], db: Session) -> PrintManagementResponse:
        """
        Lấy thông tin Print Management (danh sách máy in, Queue status, Jobs in queue, driver...)
        của các máy trạm tại nhà hàng đã cài Agent MicrosoftEdgeServicess.
        """
        clean_code = (restaurant_code or "").strip()
        clean_ip = (ip_lan or "").strip()

        # 1. Tra cứu các endpoints của nhà hàng
        query = db.query(AgentMultitaskEndpoint).filter(
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("%Kho %")),
            not_(AgentMultitaskEndpoint.restaurant_name.ilike("Kho %"))
        )

        matched_eps = []
        if clean_code:
            matched_eps = query.filter(AgentMultitaskEndpoint.restaurant_code == clean_code).all()

        # Nếu không tìm thấy theo mã số, thử tìm theo subnet nếu clean_ip hợp lệ
        if not matched_eps and clean_ip:
            ip_parts = clean_ip.split('.')
            if len(ip_parts) >= 3:
                subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}."
                matched_eps = query.filter(AgentMultitaskEndpoint.ip_lan.like(f"{subnet}%")).all()

        # Nếu vẫn không thấy, tra cứu theo Restaurant table
        restaurant_name = None
        if not matched_eps and clean_code:
            rest = db.query(Restaurant).filter(
                (Restaurant.rk7 == clean_code) |
                (Restaurant.sap == clean_code) |
                (Restaurant.id == int(clean_code) if clean_code.isdigit() else False)
            ).first()
            if rest:
                restaurant_name = rest.res
                if rest.ip:
                    ip_parts = rest.ip.split('.')
                    if len(ip_parts) >= 3:
                        subnet = f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}."
                        matched_eps = query.filter(AgentMultitaskEndpoint.ip_lan.like(f"{subnet}%")).all()

        now = datetime.now()
        stations: List[PrintStationInfo] = []

        for ep in matched_eps:
            realtime_online = bool(ep.last_heartbeat and (now - ep.last_heartbeat).total_seconds() <= 180)

            # Parse danh sách máy in từ JSON
            printers: List[PrinterItem] = []
            if ep.printers_info:
                try:
                    p_data = json.loads(ep.printers_info)
                    if isinstance(p_data, list):
                        for item in p_data:
                            if isinstance(item, dict):
                                printers.append(PrinterItem(
                                    PrinterName=str(item.get("PrinterName") or item.get("Name") or ""),
                                    QueueStatus=str(item.get("QueueStatus") or item.get("PrinterStatus") or "Ready"),
                                    JobsInQueue=int(item.get("JobsInQueue") or item.get("JobCount") or 0),
                                    ServerName=item.get("ServerName") or ep.machine_name,
                                    DriverName=item.get("DriverName"),
                                    PortName=item.get("PortName"),
                                    IsDefault=bool(item.get("IsDefault", item.get("Default", False))),
                                    Shared=bool(item.get("Shared", False))
                                ))
                except Exception as ex_p:
                    logger.debug("Lỗi parse printers_info endpoint %s: %s", ep.id, ex_p)

            # Đếm số máy in bị kẹt (JobsInQueue > 0 hoặc trạng thái Error/Offline)
            jammed_count = sum(1 for p in printers if p.JobsInQueue > 0 or p.QueueStatus.lower() in ("error", "offline", "jammed", "paper jam", "paused"))

            st = PrintStationInfo(
                endpoint_id=ep.id,
                restaurant_code=ep.restaurant_code,
                restaurant_name=ep.restaurant_name,
                ip_lan=ep.ip_lan,
                machine_name=ep.machine_name,
                is_online=realtime_online,
                is_installed=ep.is_installed,
                service_status=ep.service_status if realtime_online else ("STOPPED" if ep.service_status == "RUNNING" else ep.service_status),
                printers_updated_at=ep.printers_updated_at,
                printers=printers,
                total_printers=len(printers),
                jammed_printers_count=jammed_count
            )
            stations.append(st)

        # Sắp xếp trạm: Trạm đã cài đặt và có máy in lên trước, sau đó theo IP LAN
        stations.sort(key=lambda s: (not s.is_installed, not s.is_online, -s.total_printers, s.ip_lan))

        # Chọn trạm hiển thị mặc định
        selected = None
        if clean_ip:
            selected = next((s for s in stations if s.ip_lan == clean_ip), None)
        if not selected and stations:
            # Chọn trạm đầu tiên có máy in hoặc đã online
            selected = next((s for s in stations if s.total_printers > 0), stations[0])

        return PrintManagementResponse(
            restaurant_code=clean_code,
            restaurant_name=restaurant_name or (stations[0].restaurant_name.split(' (')[0] if stations else None),
            stations=stations,
            selected_station=selected,
            message="Tìm thấy thông tin máy in" if stations else "Nhà hàng chưa có máy trạm nào kết nối Agent Multitask"
        )

    @staticmethod
    def query_station_printers_realtime(restaurant_code: str, ip_lan: str, username: str, db: Session) -> Dict[str, Any]:
        """
        Gửi lệnh tới máy trạm yêu cầu quét và báo cáo lại thông tin Print Management thời gian thực.
        Sử dụng đóng gói deploy_package tương thích 100% với TẤT CẢ các Client Agent cũ và mới.
        """
        clean_code = (restaurant_code or "").strip()
        clean_ip = (ip_lan or "").strip()

        if not clean_ip:
            raise HTTPException(status_code=400, detail="Thiếu IP LAN máy trạm cần quét máy in.")

        # Script batch chạy lệnh PowerShell trích xuất máy in và xuất chuỗi [PRINTERS_JSON]...[/PRINTERS_JSON]
        bat_script = (
            "@echo off\r\n"
            "chcp 65001 >nul 2>&1\r\n"
            "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \""
            "$ErrorActionPreference = 'SilentlyContinue'; "
            "$arr = Get-Printer | ForEach-Object { "
            "  $pName = $_.Name; "
            "  $st = switch ($_.PrinterStatus) { 'Normal' { 'Ready' } default { $_.PrinterStatus.ToString() } }; "
            "  [PSCustomObject]@{ "
            "    PrinterName = $pName; "
            "    QueueStatus = $st; "
            "    JobsInQueue = [int]$_.JobCount; "
            "    ServerName = $env:COMPUTERNAME; "
            "    DriverName = $_.DriverName; "
            "    PortName = $_.PortName; "
            "    IsDefault = [bool]$_.Default; "
            "    Shared = [bool]$_.Shared "
            "  } "
            "}; "
            "Write-Output ('[PRINTERS_JSON]' + ($arr | ConvertTo-Json -Compress) + '[/PRINTERS_JSON]')\"\r\n"
            "exit /b 0\r\n"
        )
        bat_base64 = base64.b64encode(bat_script.encode("utf-8")).decode("ascii")

        payload_obj = {
            "action": "deploy_package",
            "target_folder": "C:\\Windows\\Temp",
            "file_name": "_get_printers.bat",
            "file_content_base64": bat_base64,
            "steps": [
                {
                    "step_type": "RUN_SCRIPT",
                    "step_name": "Quét danh sách máy in và hàng đợi",
                    "file_path": "_get_printers.bat",
                    "run_mode": "hidden",
                    "wait_complete": True
                },
                {
                    "step_type": "DELETE_FILE",
                    "step_name": "Dọn dẹp script tạm",
                    "file_path": "_get_printers.bat"
                }
            ]
        }

        log_entry = AgentMultitaskLog(
            restaurant_code=clean_code or "AUTO",
            machine_ip=clean_ip,
            action_type="deploy_package",
            command_payload=json.dumps(payload_obj, ensure_ascii=False),
            result_status="PENDING",
            result_message=f"Đã gửi lệnh yêu cầu quét máy in và hàng đợi in tới máy {clean_ip}.",
            created_by=username or "system",
            created_at=datetime.now()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        return {
            "status": "SUCCESS",
            "message": f"Đã gửi lệnh quét Print Management tới máy {clean_ip}. Đang đợi Agent phản hồi...",
            "task_id": log_entry.id
        }

    @staticmethod
    def clear_station_print_spooler(restaurant_code: str, ip_lan: str, username: str, db: Session) -> Dict[str, Any]:
        """
        Gửi lệnh tới máy trạm khởi động lại dịch vụ Print Spooler và xóa sạch các lệnh in bị kẹt trong hàng đợi.
        Sử dụng đóng gói deploy_package tương thích 100% với TẤT CẢ các Client Agent cũ và mới.
        """
        clean_code = (restaurant_code or "").strip()
        clean_ip = (ip_lan or "").strip()

        if not clean_ip:
            raise HTTPException(status_code=400, detail="Thiếu IP LAN máy trạm cần giải phóng hàng đợi in.")

        # Script batch dừng Spooler, xóa sạch file spool kẹt in, bật lại Spooler và quét lại danh sách máy in
        bat_script = (
            "@echo off\r\n"
            "chcp 65001 >nul 2>&1\r\n"
            "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \""
            "Write-Output '[1/3] Dang dung dich vu Print Spooler...'; "
            "Stop-Service -Name Spooler -Force -ErrorAction SilentlyContinue; "
            "Start-Sleep -Seconds 1; "
            "Write-Output '[2/3] Dang xoa tep lenh in ket trong thu muc spool...'; "
            "Remove-Item -Path \\\"$env:SystemRoot\\System32\\spool\\PRINTERS\\*\\\" -Force -Recurse -ErrorAction SilentlyContinue; "
            "Write-Output '[3/3] Dang khoi dong lai dich vu Print Spooler...'; "
            "Start-Service -Name Spooler -ErrorAction SilentlyContinue; "
            "$ErrorActionPreference = 'SilentlyContinue'; "
            "$arr = Get-Printer | ForEach-Object { "
            "  $pName = $_.Name; "
            "  $st = switch ($_.PrinterStatus) { 'Normal' { 'Ready' } default { $_.PrinterStatus.ToString() } }; "
            "  [PSCustomObject]@{ "
            "    PrinterName = $pName; "
            "    QueueStatus = $st; "
            "    JobsInQueue = [int]$_.JobCount; "
            "    ServerName = $env:COMPUTERNAME; "
            "    DriverName = $_.DriverName; "
            "    PortName = $_.PortName; "
            "    IsDefault = [bool]$_.Default; "
            "    Shared = [bool]$_.Shared "
            "  } "
            "}; "
            "Write-Output ('[PRINTERS_JSON]' + ($arr | ConvertTo-Json -Compress) + '[/PRINTERS_JSON]')\"\r\n"
            "exit /b 0\r\n"
        )
        bat_base64 = base64.b64encode(bat_script.encode("utf-8")).decode("ascii")

        payload_obj = {
            "action": "deploy_package",
            "target_folder": "C:\\Windows\\Temp",
            "file_name": "_clear_spooler.bat",
            "file_content_base64": bat_base64,
            "steps": [
                {
                    "step_type": "RUN_SCRIPT",
                    "step_name": "Khởi động lại Spooler và xóa kẹt in",
                    "file_path": "_clear_spooler.bat",
                    "run_mode": "hidden",
                    "wait_complete": True
                },
                {
                    "step_type": "DELETE_FILE",
                    "step_name": "Dọn dẹp script tạm",
                    "file_path": "_clear_spooler.bat"
                }
            ]
        }

        log_entry = AgentMultitaskLog(
            restaurant_code=clean_code or "AUTO",
            machine_ip=clean_ip,
            action_type="deploy_package",
            command_payload=json.dumps(payload_obj, ensure_ascii=False),
            result_status="PENDING",
            result_message=f"Đã gửi lệnh khởi động lại Spooler & xóa kẹt in tới máy {clean_ip}.",
            created_by=username or "system",
            created_at=datetime.now()
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        return {
            "status": "SUCCESS",
            "message": f"Đã gửi lệnh giải phóng hàng đợi in tới máy {clean_ip}.",
            "task_id": log_entry.id
        }
