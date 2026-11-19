import os
import json
import uuid
import asyncio
import smtplib
import ssl
import logging
import traceback
from email.message import EmailMessage
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from app.schemas.job import (
    JobItem, JobScheduleConfig, JobRunLog,
    JobUpdateScheduleRequest, JobToggleRequest,
    JobDashboardStats
)
from app.services.sales_sync_service import sales_sync_service
from app.services.sales_report_service import sales_report_service
from app.services.network_monitor_service import network_monitor_service
from app.services.maintenance_service import maintenance_service
from app.services.restaurant_audit_service import restaurant_audit_service

logger = logging.getLogger("app.job_scheduler")

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
os.makedirs(DATA_DIR, exist_ok=True)
CONFIG_FILE = os.path.join(DATA_DIR, "jobs_config.json")
LOGS_FILE = os.path.join(DATA_DIR, "jobs_logs.json")

DEFAULT_JOBS = [
    {
        "job_id": "job_sync_sales_daily_server",
        "job_name": "Lấy dữ liệu tổng sales, tổng khách từ SERVER Dcorp về Server IT Daily Sales",
        "category": "sync_data",
        "category_name": "Đồng Bộ Dữ Liệu",
        "description": "Lấy dữ liệu tổng sales, tổng khách (doanh thu ca, tiền tip, thuế suất 5%, 8%, 10%, và các loại thanh toán...) từ SERVER Dcorp 172.16.8.26 về Server IT Daily Sales (SO_LIEU_CHECK_SALES_DAILY)",
        "source_reference": "app_trang_chu.py: /lay_data_tu_server_172_16_8_26",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "05:45",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "45 5 * * *",
            "human_readable": "Hàng ngày lúc 05:45"
        }
    },
    {
        "job_id": "job_sync_pim_requests",
        "job_name": "Đồng bộ Yêu cầu PIM & Phân công tự động",
        "category": "sync_data",
        "category_name": "Đồng Bộ Dữ Liệu",
        "description": "Kết nối SSO và cổng Admin PIM (https://adminpim.ggg.com.vn), tự động quét các yêu cầu tạo Menu, Món ăn, Combo, Giá bán và phân công xoay vòng Round-Robin cho IT phụ trách",
        "source_reference": "pim_service.py: sync_all_pim_data",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "08:30",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "30 8 * * *",
            "human_readable": "Hàng ngày lúc 08:30"
        }
    },
    {
        "job_id": "job_email_sales_reconciliation",
        "job_name": "Gửi Email Báo Cáo Sales Daily & Biểu Đồ",
        "category": "report",
        "category_name": "Báo Cáo & Biểu Đồ",
        "description": "Tổng hợp kết quả đối soát doanh số, tự động vẽ biểu đồ cột so sánh doanh thu và gửi email cho Ban Quản Lý",
        "source_reference": "app_trang_chu.py: /gui_mail_check_sale",
        "has_email_notification": True,
        "email_recipients": "banquanly@ggg.com.vn, it.support@ggg.com.vn",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "07:00",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 7 * * *",
            "human_readable": "Hàng ngày lúc 07:00"
        }
    },
    {
        "job_id": "job_check_vpn_restaurants",
        "job_name": "Kiểm tra kết nối VPN Nhà Hàng",
        "category": "monitor",
        "category_name": "Giám Sát Mạng & VPN",
        "description": "Kiểm tra kết nối VPN: Ping từ Server Local tới IP Router / VPN của các nhà hàng đang hoạt động (trạng thái ON, bỏ qua NEW/OFF). Tự động gửi email cảnh báo các nhà hàng bị rớt VPN cho bộ phận Mạng/Helpdesk",
        "source_reference": "app_trang_chu.py: /check_tinhieu_NH",
        "has_email_notification": True,
        "email_recipients": "it.helpdesk@ggg.com.vn, network@ggg.com.vn",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "10:00",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 10 * * *",
            "human_readable": "Hàng ngày lúc 10:00"
        }
    },
    {
        "job_id": "job_check_internet_restaurants",
        "job_name": "Kiểm tra Internet & Cảnh báo rớt mạng Nhà Hàng",
        "category": "monitor",
        "category_name": "Giám Sát Mạng & VPN",
        "description": "Kiểm tra tín hiệu Internet WAN: Ping từ Server Local xuống IP Public của các nhà hàng đang hoạt động (trạng thái ON, bỏ qua NEW/OFF). Tự động gửi email cảnh báo các nhà hàng bị rớt mạng cho bộ phận Mạng/Helpdesk",
        "source_reference": "app_trang_chu.py: /gui_mail_check_internet",
        "has_email_notification": True,
        "email_recipients": "it.helpdesk@ggg.com.vn, network@ggg.com.vn",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "10:05",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "5 10 * * *",
            "human_readable": "Hàng ngày lúc 10:05"
        }
    },
    {
        "job_id": "job_review_missing_restaurant_info",
        "job_name": "Rà Soát Thông Tin Nhà Hàng Còn Thiếu",
        "category": "monitor",
        "category_name": "Giám Sát Mạng & VPN",
        "description": "Rà soát thông tin nhà hàng còn thiếu: Mã SAP (4-5 số), Cost Center (>= 5 ký tự), Mã RK7 (>= 3 số), Ngày Khai Trương (> 2025), Trạng Thái Hoạt Động (ON). Tự động ping router: nếu mất tín hiệu thì bỏ qua (chưa hoạt động), nếu có tín hiệu thì gửi email nhắc nhở bổ sung dữ liệu.",
        "source_reference": "restaurant_audit_service.py: audit_restaurants",
        "has_email_notification": True,
        "email_recipients": "it.helpdesk@ggg.com.vn, dung.nguyenanh@ggg.com.vn",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "09:30",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "30 9 * * *",
            "human_readable": "Hàng ngày lúc 09:30"
        }
    },
    {
        "job_id": "job_compress_and_clean_db_backup",
        "job_name": "Nén Zip Database Backup & Dọn dẹp File cũ quá 30 ngày",
        "category": "maintenance",
        "category_name": "Sao Lưu & Bảo Trì Hệ Thống",
        "description": "Tự động quét thư mục C:/DUNGIT/Backup_Data_SQL trực tiếp trên Server này, nén các file .bak thành .zip mã hóa AES bảo mật (mật khẩu Abc0102009@), đồng thời xóa sạch các file sao lưu cũ quá 30 ngày để giải phóng dung lượng đĩa cứng.",
        "source_reference": "maintenance_service.py: compress_and_cleanup_db_backup (chạy local trên server)",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "01:30",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "30 1 * * *",
            "human_readable": "Hàng ngày lúc 01:30"
        }
    },
    {
        "job_id": "job_check_overnight_devices",
        "job_name": "Quét & ghi nhận thiết bị POS, KDS, PC để qua đêm tại Nhà Hàng",
        "category": "monitor",
        "category_name": "Giám Sát Mạng & Thiết Bị",
        "description": "Quét tự động dải mạng của tất cả Nhà Hàng đang hoạt động lúc 04:00 sáng. Kiểm tra các thiết bị: Thu Ngân (.11, .12), PC Quản Lý (.41), và cụm KDS Bếp (.31 đến .38). Tự động tổng hợp danh sách các máy để qua đêm và lưu vào Cơ sở dữ liệu.",
        "source_reference": "overnight_devices_service.py: scan_and_log_overnight_devices",
        "has_email_notification": True,
        "email_recipients": "it.helpdesk@ggg.com.vn, it.support@ggg.com.vn",
        "is_enabled": True,
        "schedule": {
            "schedule_type": "daily",
            "time": "04:00",
            "interval_minutes": 30,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 4 * * *",
            "human_readable": "Hàng ngày lúc 04:00"
        }
    },
    {
        "job_id": "job_check_ram_sql_mongo_limits",
        "job_name": "Kiểm tra giới hạn RAM SQL Server (2GB) & MongoDB (6GB)",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Quét toàn bộ nhà hàng đang hoạt động: (1) Kết nối SQL Server tại IP .41 (user: rk7 / pass: rk7) để kiểm tra cấu hình giới hạn RAM 2GB (max server memory); (2) Dò quét port 27017 tại các IP .41, .11, .12, nếu không kết nối được thì ghi nhận 'Mongo chưa cấu hình mở port IP', nếu kết nối được thì kiểm tra xem đã giới hạn RAM 6GB (WiredTiger Cache) hay chưa.",
        "source_reference": "ram_limit_audit_service.py: scan_and_log_ram_limits",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "manual",
            "time": "00:00",
            "interval_minutes": 60,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 0 * * *",
            "human_readable": "Chạy thủ công theo nhu cầu"
        }
    },
    {
        "job_id": "job_ticket_batch_by_category",
        "job_name": "Ticket theo Danh Mục (Đóng Ticket Hàng Loạt 3CX)",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Tự động login SSO → lấy danh sách Nhiệm vụ 3CX → khai báo timesheet 1h xoay vòng danh mục → đóng hàng loạt ticket. Chỉ xử lý các nhiệm vụ có tên chứa 'Nhiệm vụ hỗ trợ tiếp nhận từ tổng đài 3CX' của user đã cấu hình SSO.",
        "source_reference": "ticket_batch_service.py: run_batch_close",
        "has_email_notification": True,
        "email_recipients": "",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "manual",
            "time": "00:00",
            "interval_minutes": 60,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 0 * * *",
            "human_readable": "Chạy thủ công theo nhu cầu"
        }
    },
    {
        "job_id": "job_check_unassigned_3cx_tickets",
        "job_name": "Rà soát các nhiệm vụ 3CX chưa gán người xử lý",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Tự động đăng nhập SSO GPMS, rà soát danh sách công việc (work-list) để phát hiện các nhiệm vụ 3CX chưa gán người xử lý (cột Người xử lý hiển thị 'Gán người xử lý'). Tự động truy cập chi tiết từng ticket để lấy chính xác Ngày tạo và xuất bảng thống kê, cảnh báo qua email.",
        "source_reference": "unassigned_3cx_service.py: scan_unassigned_tickets",
        "has_email_notification": True,
        "email_recipients": "dung.nguyenanh@ggg.com.vn",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "daily",
            "time": "08:00",
            "interval_minutes": 60,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 8 * * *",
            "human_readable": "Hàng ngày lúc 08:00"
        }
    },
    {
        "job_id": "job_scan_mail_memo_auto",
        "job_name": "Quét Mail Memo AUTO (Outlook/Salesforce)",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Tự động kết nối hộp thư Outlook/Office 365, quét các email có nội dung 'Yêu cầu tạo nút RK cho Memo mới', tự động trích xuất Memo Code (VD: 402600MW033), tên Memo, người gửi và tự động lưu vào danh sách Memo hệ thống.",
        "source_reference": "mail_memo_service.py: scan_and_import_memos",
        "has_email_notification": True,
        "email_recipients": "dung.nguyenanh@ggg.com.vn",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "interval",
            "time": "08:00",
            "interval_minutes": 15,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "*/15 * * * *",
            "human_readable": "Mỗi 15 phút một lần"
        }
    },
    {
        "job_id": "job_check_mongodb_mosquitto_services",
        "job_name": "Quét MongoDB & Mosquitto Broker Nhà Hàng",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Quét tự động toàn bộ nhà hàng đang hoạt động: kiểm tra dịch vụ MongoDB Server (port 27017) và Mosquitto Broker (port 1883) trên máy đại diện (.41, .11, .12). Bỏ qua các chuỗi TCH, UT, Universal, Tea, Thecoffeehouse. Tự động gửi email cảnh báo các nhà hàng bị lỗi, nếu 100% OK sẽ không gửi email.",
        "source_reference": "mongo_mosquitto_service.py: scan_all_restaurants",
        "has_email_notification": True,
        "email_recipients": "dung.nguyenanh@ggg.com.vn",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "daily",
            "time": "08:30",
            "interval_minutes": 60,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "30 8 * * *",
            "human_readable": "Hàng ngày lúc 08:30"
        }
    },
    {
        "job_id": "job_auto_sync_3cx_hotline_duty",
        "job_name": "Tự Động Chỉnh Trực Hotline 3CX (IT HCM App)",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Tự động đăng nhập 3CX Admin Console để xóa sạch danh sách cũ và cập nhật lại User trực cho Queue IT HCM App Day (06:00 T2-T6) & Queue IT HCM App Night (16:29 T2-T6, 06:00 & 16:29 T7-CN / Ngày Lễ với Skill Group 1 Chính / 2 Phụ).",
        "source_reference": "hotline_3cx_auto_service.py: run_shift_sync",
        "has_email_notification": True,
        "email_recipients": "dung.nguyenanh@ggg.com.vn",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "daily",
            "time": "06:00",
            "time_2": "16:29",
            "interval_minutes": 60,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 6,16 * * *",
            "human_readable": "Hàng ngày lúc 06:00 & 16:29"
        }
    },
    {
        "job_id": "job_auto_purge_old_logs",
        "job_name": "Tự Động Dọn Dẹp Logs Cũ (Sau 3 Năm)",
        "category": "system_maintenance",
        "category_name": "Bảo Trì Hệ Thống",
        "description": "Tự động dọn dẹp và xóa các bản ghi trong bảng LOGS__New đã lưu trữ quá 3 năm để giải phóng dung lượng cơ sở dữ liệu, đảm bảo hệ thống không bị quá tải hay phình to dữ liệu theo thời gian.",
        "source_reference": "log_service.py: purge_old_logs",
        "has_email_notification": False,
        "email_recipients": "dung.nguyenanh@ggg.com.vn",
        "is_enabled": True,
        "restricted_to_dung": False,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "weekly",
            "time": "03:00",
            "interval_minutes": 60,
            "days_of_week": [7],
            "cron_expression": "0 3 * * 0",
            "human_readable": "Hàng tuần lúc 03:00 Chủ Nhật"
        }
    }
]

def normalize_time_str(val: Optional[str]) -> Optional[str]:
    """
    Chuẩn hóa chuỗi thời gian về định dạng HH:MM chuẩn (2 chữ số giờ, 2 chữ số phút).
    Hỗ trợ xử lý: '8:30' -> '08:30', '12:00:00' -> '12:00', ' 16:30 ' -> '16:30'.
    Trả về None nếu định dạng không hợp lệ hoặc rỗng.
    """
    if not val:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        parts = val_str.split(":")
        if len(parts) >= 2:
            h = int(parts[0])
            m = int(parts[1])
            if 0 <= h <= 23 and 0 <= m <= 59:
                return f"{h:02d}:{m:02d}"
    except Exception:
        pass
    return None


class JobSchedulerService:
    SMTP_HOST = "smtp.office365.com"
    SMTP_PORT = 587
    SMTP_USER = "ss.it@ggg.com.vn"
    SMTP_PASSWORD = "Agg$123iT%%"

    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._logs: List[Dict[str, Any]] = []
        self._load_data()

    @classmethod
    def _send_job_execution_email(cls, job: Dict[str, Any], log_entry: Dict[str, Any]):
        """
        Gửi email thông báo kết quả thực thi tác vụ cho danh sách email đã cấu hình.
        Tự động kích hoạt khi tác vụ kết thúc (kể cả Chạy Thử hoặc Chạy Tự Động theo lịch).
        """
        recipients_str = job.get("email_recipients") or ""
        recipients = [e.strip().rstrip(",") for e in recipients_str.split(",") if e.strip().rstrip(",")]
        if not recipients:
            return

        try:
            status = log_entry.get("status", "success")
            is_success = (status == "success")
            job_name = job.get("job_name", "Tác vụ hệ thống")
            category_name = job.get("category_name", "Hệ Thống")
            started_at = log_entry.get("started_at", "")
            finished_at = log_entry.get("finished_at", "")
            duration = log_entry.get("duration_seconds", 0)
            message = log_entry.get("message", "")
            details = log_entry.get("details", "")
            triggered_by = log_entry.get("triggered_by", "Hệ thống")

            status_label = "THÀNH CÔNG" if is_success else "THẤT BẠI"
            status_color = "#16A34A" if is_success else "#DC2626"
            status_bg = "#F0FDF4" if is_success else "#FEF2F2"
            status_border = "#86EFAC" if is_success else "#FCA5A5"

            details_html = details.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")

            html_content = f"""
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; }}
                    .container {{ max-width: 650px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }}
                    .header {{ background-color: #111827; color: #F5B800; padding: 16px 20px; font-size: 16px; font-weight: bold; }}
                    .body {{ padding: 20px; background-color: #FFFFFF; }}
                    .badge {{ display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; }}
                    .info-table {{ width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }}
                    .info-table td {{ padding: 8px 10px; border-bottom: 1px solid #F3F4F6; font-size: 13px; }}
                    .info-table td.label {{ color: #6B7280; width: 140px; font-weight: 500; }}
                    .details-box {{ background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px; font-size: 12px; color: #374151; font-family: Consolas, monospace; line-height: 1.6; margin-top: 10px; }}
                    .footer {{ background-color: #F9FAFB; padding: 12px 20px; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E5E7EB; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        HỆ THỐNG QUẢN TRỊ TÁC VỤ IT - THÔNG BÁO THỰC THI
                    </div>
                    <div class="body">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                            <span class="badge" style="background-color: {status_bg}; color: {status_color}; border: 1px solid {status_border};">
                                {status_label}
                            </span>
                            <span style="font-size: 12px; color: #6B7280;">Kích hoạt bởi: <b>{triggered_by}</b></span>
                        </div>
                        <h3 style="margin: 6px 0 12px; color: #111827; font-size: 15px;">
                            {job_name}
                        </h3>
                        <p style="margin: 0; color: #4B5563; font-size: 13px;">
                            {message}
                        </p>

                        <table class="info-table">
                            <tr>
                                <td class="label">Phân loại:</td>
                                <td><b>{category_name}</b></td>
                            </tr>
                            <tr>
                                <td class="label">Thời gian bắt đầu:</td>
                                <td>{started_at}</td>
                            </tr>
                            <tr>
                                <td class="label">Thời gian kết thúc:</td>
                                <td>{finished_at}</td>
                            </tr>
                            <tr>
                                <td class="label">Thời lượng:</td>
                                <td><b>{duration} giây</b></td>
                            </tr>
                        </table>

                        <div style="font-weight: 600; font-size: 12px; color: #4B5563; text-transform: uppercase; margin-top: 12px;">
                            Chi tiết thực thi / Nhật ký:
                        </div>
                        <div class="details-box">
                            {details_html}
                        </div>
                    </div>
                    <div class="footer">
                        Email này được gửi tự động từ Hệ Thống Quản Lý Dự Án & Vận Hành IT Golden Gate.<br/>
                        Vui lòng không phản hồi trực tiếp qua địa chỉ email này.
                    </div>
                </div>
            </body>
            </html>
            """

            msg = EmailMessage()
            msg["Subject"] = log_entry.get("custom_subject") or f"[{status_label}] Thông báo thực thi tác vụ: {job_name}"
            msg["From"] = f"Hệ Thống Quản Trị ITSS <{cls.SMTP_USER}>"
            msg["To"] = ", ".join(recipients)
            plain_body = log_entry.get("custom_plain") or f"Kết quả thực thi tác vụ '{job_name}': {status_label}\nThời gian: {started_at} -> {finished_at}\n{message}\n\nChi tiết:\n{details}"
            msg.set_content(plain_body)
            final_html = log_entry.get("custom_html") or html_content
            msg.add_alternative(final_html, subtype="html")

            context = ssl.create_default_context()
            context.minimum_version = ssl.TLSVersion.TLSv1_2
            context.maximum_version = ssl.TLSVersion.TLSv1_2

            with smtplib.SMTP(cls.SMTP_HOST, cls.SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls(context=context)
                server.login(cls.SMTP_USER, cls.SMTP_PASSWORD)
                server.send_message(msg)

            print(f"[JOB_NOTIFY_EMAIL] Đã gửi thông báo tác vụ '{job_name}' tới {', '.join(recipients)}")
        except Exception as e:
            print(f"[JOB_NOTIFY_EMAIL] Lỗi khi gửi email thông báo tác vụ: {e}")

    def _format_human_readable(self, schedule_type: str, time_str: str, interval: int, days: List[int], time_2: Optional[str] = None, time_3: Optional[str] = None) -> str:
        day_names = {1: "T2", 2: "T3", 3: "T4", 4: "T5", 5: "T6", 6: "T7", 7: "CN"}
        times = []
        for raw in [time_str, time_2, time_3]:
            nt = normalize_time_str(raw)
            if nt and nt not in times:
                times.append(nt)
        if not times:
            times = ["06:00"]
        times_display = ", ".join(times)

        if schedule_type == "interval":
            return f"Mỗi {interval} phút"
        elif schedule_type == "daily":
            return f"Hàng ngày lúc {times_display}"
        elif schedule_type == "weekly":
            if len(days) == 7 or len(days) == 0:
                return f"Hàng ngày lúc {times_display}"
            selected_days = ", ".join([day_names.get(d, str(d)) for d in sorted(days)])
            return f"{selected_days} lúc {times_display}"
        elif schedule_type == "custom_cron":
            return f"Biểu thức Cron: {time_str}"
        elif schedule_type == "manual":
            return "Chạy thủ công theo nhu cầu"
        return f"Hàng ngày lúc {times_display}"

    def _build_cron(self, schedule_type: str, time_str: str, interval: int, days: List[int], time_2: Optional[str] = None, time_3: Optional[str] = None) -> str:
        if schedule_type == "interval":
            return f"*/{interval} * * * *"
        
        times = []
        for raw in [time_str, time_2, time_3]:
            nt = normalize_time_str(raw)
            if nt and nt not in times:
                times.append(nt)
        if not times:
            times = ["06:00"]
        
        dow = ",".join([str(d % 7) for d in sorted(days)]) if (days and len(days) < 7) else "*"
        
        minutes = set(int(t.split(":")[1]) for t in times)
        if len(minutes) == 1:
            minute = int(times[0].split(":")[1])
            hours = ",".join(str(int(t.split(":")[0])) for t in times)
            if schedule_type == "weekly" and dow != "*":
                return f"{minute} {hours} * * {dow}"
            return f"{minute} {hours} * * *"
        else:
            cron_parts = []
            for t in times:
                h, m = int(t.split(":")[0]), int(t.split(":")[1])
                if schedule_type == "weekly" and dow != "*":
                    cron_parts.append(f"{m} {h} * * {dow}")
                else:
                    cron_parts.append(f"{m} {h} * * *")
            return " | ".join(cron_parts)

    def _calculate_next_run(self, schedule_dict: Dict[str, Any], is_enabled: bool) -> Optional[str]:
        if not is_enabled:
            return "Đang tạm dừng"
        
        schedule_type = schedule_dict.get("schedule_type", "daily")
        interval = schedule_dict.get("interval_minutes", 30)

        now = datetime.now()
        if schedule_type == "interval":
            next_time = now + timedelta(minutes=interval)
            return next_time.strftime("%Y-%m-%d %H:%M:%S")
        elif schedule_type == "manual":
            return "Chạy thủ công"
        else:
            norm_times = []
            for raw in [schedule_dict.get("time"), schedule_dict.get("time_2"), schedule_dict.get("time_3")]:
                nt = normalize_time_str(raw)
                if nt and nt not in norm_times:
                    norm_times.append(nt)
            if not norm_times:
                norm_times = ["06:00"]

            days_of_week = schedule_dict.get("days_of_week") or [1, 2, 3, 4, 5, 6, 7]
            candidates = []
            for day_offset in range(8):
                test_date = (now + timedelta(days=day_offset)).date()
                dow = test_date.isoweekday()
                if schedule_type == "weekly" and dow not in days_of_week:
                    continue
                for t_str in norm_times:
                    parts = t_str.split(":")
                    cand_dt = datetime(test_date.year, test_date.month, test_date.day, int(parts[0]), int(parts[1]), 0)
                    if cand_dt > now:
                        candidates.append(cand_dt)
            if candidates:
                candidates.sort()
                return candidates[0].strftime("%Y-%m-%d %H:%M:%S")
            return (now + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S")

    def _load_data(self):
        # Load jobs config
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    saved_jobs = json.load(f)
                    self._jobs = {j["job_id"]: j for j in saved_jobs}
            except Exception:
                self._jobs = {}
        
        # Remove deprecated jobs
        deprecated_ids = {
            "job_reconcile_sales_restaurants",
            "job_daily_news_gold_notification",
            "job_memo_due_reminder",
            "job_hotline_shift_notification",
            "job_check_mon_rk7",
            "job_check_vpn_datacenter",
            "job_setup_restaurant_reminder"
        }
        for did in deprecated_ids:
            self._jobs.pop(did, None)

        # Merge default jobs if any missing
        for dj in DEFAULT_JOBS:
            jid = dj["job_id"]
            if jid not in self._jobs:
                job_copy = dict(dj)
                job_copy["status"] = "idle"
                job_copy["last_run_at"] = None
                job_copy["last_duration"] = None
                job_copy["last_status"] = None
                job_copy["total_runs"] = 0
                job_copy["success_runs"] = 0
                job_copy["failed_runs"] = 0
                self._jobs[jid] = job_copy
            else:
                for field in ["job_name", "category", "category_name", "description", "source_reference", "has_email_notification", "restricted_to_dung"]:
                    if field in dj:
                        self._jobs[jid][field] = dj[field]
                if "email_recipients" in dj and "email_recipients" not in self._jobs[jid]:
                    self._jobs[jid]["email_recipients"] = dj["email_recipients"]
                if "is_hidden" not in self._jobs[jid]:
                    self._jobs[jid]["is_hidden"] = dj.get("is_hidden", False)
                if "restricted_to_dung" not in self._jobs[jid]:
                    self._jobs[jid]["restricted_to_dung"] = dj.get("restricted_to_dung", False)

        # Load logs
        if os.path.exists(LOGS_FILE):
            try:
                with open(LOGS_FILE, "r", encoding="utf-8") as f:
                    self._logs = json.load(f)
            except Exception:
                self._logs = []

        self._save_config()
        self.sync_from_pim_schedule()

    def sync_from_pim_schedule(self):
        """
        Tự động đồng bộ 3 khung giờ và trạng thái thực thi từ cơ sở dữ liệu dbo.PIM_SCHEDULE
        vào cấu hình của job_sync_pim_requests để đảm bảo thông tin trên Job Management luôn nhất quán 100%.
        """
        try:
            from app.core.database import SessionLocal
            from app.models.pim import PIMSchedule
            db = SessionLocal()
            try:
                sched = db.query(PIMSchedule).first()
                if sched and "job_sync_pim_requests" in self._jobs:
                    job = self._jobs["job_sync_pim_requests"]
                    t1 = normalize_time_str(sched.time_1) or "03:00"
                    t2 = normalize_time_str(sched.time_2) or "12:00"
                    t3 = normalize_time_str(sched.time_3) or "16:30"
                    
                    job_sched = job.setdefault("schedule", {})
                    job_sched["schedule_type"] = "daily"
                    job_sched["time"] = t1
                    job_sched["time_2"] = t2
                    job_sched["time_3"] = t3
                    job_sched["human_readable"] = self._format_human_readable("daily", t1, 30, [1, 2, 3, 4, 5, 6, 7], time_2=t2, time_3=t3)
                    job_sched["cron_expression"] = self._build_cron("daily", t1, 30, [1, 2, 3, 4, 5, 6, 7], time_2=t2, time_3=t3)
                    job["is_enabled"] = bool(sched.is_active)

                    if sched.last_run:
                        sched_last_str = sched.last_run.strftime("%Y-%m-%d %H:%M:%S")
                        current_last = job.get("last_run_at") or ""
                        if sched_last_str > current_last:
                            job["last_run_at"] = sched_last_str
                            job["last_status"] = "success" if (sched.last_status and "Thành công" in sched.last_status) else (job.get("last_status") or "success")
            finally:
                db.close()
        except Exception:
            pass

    def record_external_job_run(
        self,
        job_id: str,
        status: str,
        message: str,
        details: str,
        triggered_by: str = "Hệ thống (Auto)",
        duration: float = 0.0,
        run_dt: Optional[datetime] = None
    ):
        """
        Ghi nhận kết quả thực thi từ tiến trình bên ngoài (như pim_schedule_worker)
        vào Job Scheduler để cập nhật trạng thái và lưu log thống nhất.
        """
        if job_id not in self._jobs:
            return
        dt = run_dt or datetime.now()
        dt_str = dt.strftime("%Y-%m-%d %H:%M:%S")
        job = self._jobs[job_id]
        job["status"] = "idle"
        job["last_run_at"] = dt_str
        job["last_duration"] = duration
        job["last_status"] = status
        job["total_runs"] = job.get("total_runs", 0) + 1
        if status == "success":
            job["success_runs"] = job.get("success_runs", 0) + 1
        else:
            job["failed_runs"] = job.get("failed_runs", 0) + 1

        log_entry = {
            "id": str(uuid.uuid4())[:8],
            "job_id": job_id,
            "job_name": job["job_name"],
            "started_at": dt_str,
            "finished_at": dt_str,
            "duration_seconds": duration,
            "status": status,
            "message": message,
            "details": details,
            "triggered_by": triggered_by
        }
        self._logs.insert(0, log_entry)
        self._save_config()
        self._save_logs()

    def _save_config(self):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(list(self._jobs.values()), f, ensure_ascii=False, indent=2)
        except Exception as e:
            print("Error saving jobs config:", e)

    def _save_logs(self):
        try:
            # Keep last 200 logs
            trimmed = self._logs[-200:]
            with open(LOGS_FILE, "w", encoding="utf-8") as f:
                json.dump(trimmed, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print("Error saving jobs logs:", e)

    def get_all_jobs(self) -> List[JobItem]:
        self.sync_from_pim_schedule()
        results = []
        for job in self._jobs.values():
            schedule_dict = job.get("schedule", {})
            sched_cfg = JobScheduleConfig(
                schedule_type=schedule_dict.get("schedule_type", "daily"),
                time=normalize_time_str(schedule_dict.get("time")) or "06:00",
                time_2=normalize_time_str(schedule_dict.get("time_2")),
                time_3=normalize_time_str(schedule_dict.get("time_3")),
                interval_minutes=schedule_dict.get("interval_minutes", 30),
                days_of_week=schedule_dict.get("days_of_week", [1, 2, 3, 4, 5, 6, 7]),
                cron_expression=schedule_dict.get("cron_expression") or self._build_cron(
                    schedule_dict.get("schedule_type", "daily"),
                    schedule_dict.get("time", "06:00"),
                    schedule_dict.get("interval_minutes", 30),
                    schedule_dict.get("days_of_week", [1, 2, 3, 4, 5, 6, 7]),
                    time_2=schedule_dict.get("time_2"),
                    time_3=schedule_dict.get("time_3")
                ),
                human_readable=schedule_dict.get("human_readable") or self._format_human_readable(
                    schedule_dict.get("schedule_type", "daily"),
                    schedule_dict.get("time", "06:00"),
                    schedule_dict.get("interval_minutes", 30),
                    schedule_dict.get("days_of_week", [1, 2, 3, 4, 5, 6, 7]),
                    time_2=schedule_dict.get("time_2"),
                    time_3=schedule_dict.get("time_3")
                )
            )
            next_run = self._calculate_next_run(schedule_dict, job.get("is_enabled", True))
            
            results.append(JobItem(
                job_id=job["job_id"],
                job_name=job["job_name"],
                category=job["category"],
                category_name=job["category_name"],
                description=job["description"],
                source_reference=job.get("source_reference", ""),
                is_enabled=job.get("is_enabled", True),
                status=job.get("status", "idle"),
                schedule=sched_cfg,
                has_email_notification=job.get("has_email_notification", False),
                email_recipients=job.get("email_recipients"),
                last_run_at=job.get("last_run_at"),
                next_run_at=next_run,
                last_duration=job.get("last_duration"),
                last_status=job.get("last_status"),
                total_runs=job.get("total_runs", 0),
                success_runs=job.get("success_runs", 0),
                failed_runs=job.get("failed_runs", 0),
                is_hidden=job.get("is_hidden", False),
                restricted_to_dung=job.get("restricted_to_dung", False),
            ))
        return results

    def set_job_hidden(self, job_id: str, is_hidden: bool) -> Optional[JobItem]:
        if job_id not in self._jobs:
            return None
        self._jobs[job_id]["is_hidden"] = is_hidden
        self._save_config()
        all_j = [j for j in self.get_all_jobs() if j.job_id == job_id]
        return all_j[0] if all_j else None

    def get_dashboard_stats(self) -> JobDashboardStats:
        jobs = list(self._jobs.values())
        total = len(jobs)
        active = sum(1 for j in jobs if j.get("is_enabled", True))
        disabled = total - active
        running = sum(1 for j in jobs if j.get("status") == "running")

        cat_counts = {}
        for j in jobs:
            c = j.get("category_name", "Khác")
            cat_counts[c] = cat_counts.get(c, 0) + 1

        upcoming = []
        for j in jobs:
            if j.get("is_enabled", True):
                next_time = self._calculate_next_run(j.get("schedule", {}), True)
                upcoming.append({
                    "job_id": j["job_id"],
                    "job_name": j["job_name"],
                    "next_run": next_time,
                    "schedule_human": j.get("schedule", {}).get("human_readable", "")
                })

        upcoming.sort(key=lambda x: x["next_run"] or "")

        return JobDashboardStats(
            total_jobs=total,
            active_jobs=active,
            disabled_jobs=disabled,
            running_jobs=running,
            categories_count=cat_counts,
            upcoming_jobs=upcoming
        )

    def toggle_job(self, job_id: str, req: JobToggleRequest) -> Optional[JobItem]:
        if job_id not in self._jobs:
            return None
        self._jobs[job_id]["is_enabled"] = req.is_enabled
        self._save_config()

        # Đồng bộ trạng thái sang dbo.PIM_SCHEDULE nếu đây là tác vụ PIM
        if job_id == "job_sync_pim_requests":
            try:
                from app.core.database import SessionLocal
                from app.models.pim import PIMSchedule
                db = SessionLocal()
                try:
                    p_sched = db.query(PIMSchedule).first()
                    if p_sched:
                        p_sched.is_active = req.is_enabled
                        p_sched.ngay_cap_nhat = datetime.now()
                        p_sched.user_cap_nhat = "Admin (JobScheduler)"
                        db.commit()
                finally:
                    db.close()
            except Exception as e:
                print("Lỗi đồng bộ is_active sang dbo.PIM_SCHEDULE:", e)

        return [j for j in self.get_all_jobs() if j.job_id == job_id][0]

    def update_schedule(self, job_id: str, req: JobUpdateScheduleRequest) -> Optional[JobItem]:
        if job_id not in self._jobs:
            return None
        
        job = self._jobs[job_id]
        sched = job.get("schedule", {})
        
        sched["schedule_type"] = req.schedule_type
        if req.time is not None:
            sched["time"] = normalize_time_str(req.time) or "06:00"
        sched["time_2"] = normalize_time_str(req.time_2)
        sched["time_3"] = normalize_time_str(req.time_3)
        if req.interval_minutes is not None:
            sched["interval_minutes"] = req.interval_minutes
        if req.days_of_week is not None:
            sched["days_of_week"] = req.days_of_week
        
        cron_expr = req.cron_expression or self._build_cron(
            req.schedule_type,
            sched.get("time", "06:00"),
            sched.get("interval_minutes", 30),
            sched.get("days_of_week", [1, 2, 3, 4, 5, 6, 7]),
            time_2=sched.get("time_2"),
            time_3=sched.get("time_3")
        )
        sched["cron_expression"] = cron_expr
        sched["human_readable"] = self._format_human_readable(
            req.schedule_type,
            sched.get("time", "06:00"),
            sched.get("interval_minutes", 30),
            sched.get("days_of_week", [1, 2, 3, 4, 5, 6, 7]),
            time_2=sched.get("time_2"),
            time_3=sched.get("time_3")
        )
        
        if req.email_recipients is not None:
            job["email_recipients"] = req.email_recipients.strip()
            if req.email_recipients.strip():
                job["has_email_notification"] = True
        
        job["schedule"] = sched
        self._save_config()

        # Đồng bộ sang dbo.PIM_SCHEDULE nếu đây là tác vụ PIM
        if job_id == "job_sync_pim_requests":
            try:
                from app.core.database import SessionLocal
                from app.models.pim import PIMSchedule
                db = SessionLocal()
                try:
                    p_sched = db.query(PIMSchedule).first()
                    if p_sched:
                        p_sched.time_1 = sched.get("time") or "03:00"
                        p_sched.time_2 = sched.get("time_2") or "12:00"
                        p_sched.time_3 = sched.get("time_3") or "16:30"
                        p_sched.ngay_cap_nhat = datetime.now()
                        p_sched.user_cap_nhat = "Admin (JobScheduler)"
                        db.commit()
                finally:
                    db.close()
            except Exception as e:
                print("Lỗi đồng bộ cấu hình sang dbo.PIM_SCHEDULE:", e)

        return [j for j in self.get_all_jobs() if j.job_id == job_id][0]

    def update_email(self, job_id: str, email_recipients: Optional[str]) -> Optional[JobItem]:
        if job_id not in self._jobs:
            return None
        self._jobs[job_id]["email_recipients"] = (email_recipients or "").strip()
        if (email_recipients or "").strip():
            self._jobs[job_id]["has_email_notification"] = True
        self._save_config()
        return [j for j in self.get_all_jobs() if j.job_id == job_id][0]

    async def trigger_job_dry_run(
        self,
        job_id: str,
        triggered_by: str = "Admin",
        target_time: Optional[str] = None,
    ) -> Optional[JobRunLog]:
        if job_id not in self._jobs:
            return None

        job = self._jobs[job_id]
        job["status"] = "running"
        start_dt = datetime.now()
        start_str = start_dt.strftime("%Y-%m-%d %H:%M:%S")
        log_id = str(uuid.uuid4())[:8]

        # 1. Real execution for Sales Sync
        if job_id == "job_sync_sales_daily_server":
            try:
                sync_res = await asyncio.to_thread(sales_sync_service.sync_sales_from_rk7)
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = (
                    f"Đồng bộ thành công dữ liệu doanh số ngày {sync_res['target_date']} từ Server RK7 (172.16.8.26) "
                    f"về bảng SO_LIEU_CHECK_SALES_DAILY trên DB ITSS (172.16.20.103)."
                )
                details = (
                    f"Kết quả thực thi thực tế:\n"
                    f"- Ngày chốt doanh số: {sync_res['target_date']}\n"
                    f"- Tổng số nhà hàng lấy về: {sync_res['total_restaurants']}\n"
                    f"- Số nhà hàng có doanh số: {sync_res['success_count']}\n"
                    f"- Tổng doanh thu hệ thống: {sync_res['total_sales']:,.0f} VNĐ\n"
                    f"- Tổng lượng khách (TC): {sync_res['total_guests']:,}\n"
                    f"- Database đích: ITDEPT (172.16.20.103)\n"
                    f"- Bảng dữ liệu: dbo.SO_LIEU_CHECK_SALES_DAILY & dbo.TOTAL_SALES_DAILY"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, log_entry))
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi khi đồng bộ doanh số từ RK7: {str(e)}",
                    "details": f"Chi tiết ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 2. Real execution for Sales Email Report
        elif job_id == "job_email_sales_reconciliation":
            try:
                raw_recipients = job.get("email_recipients") or ""
                recipients = [e.strip().rstrip(",") for e in raw_recipients.split(",") if e.strip().rstrip(",")]
                if not recipients:
                    recipients = ["dung.nguyenanh@ggg.com.vn"]

                email_res = await asyncio.to_thread(
                    sales_report_service.send_sales_daily_report,
                    recipients=recipients
                )
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                is_success = (email_res.get("status") == "success")
                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success" if is_success else "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                if is_success:
                    job["success_runs"] = job.get("success_runs", 0) + 1
                else:
                    job["failed_runs"] = job.get("failed_runs", 0) + 1

                details = (
                    f"Kết quả gửi email báo cáo:\n"
                    f"- Trạng thái: {email_res.get('status')}\n"
                    f"- Ngày số liệu: {email_res.get('target_date')}\n"
                    f"- Danh sách người nhận: {', '.join(recipients)}\n"
                    f"- Thông điệp: {email_res.get('message')}\n"
                    f"- Biểu đồ: Đã tạo và nhúng trực tiếp qua CID (doanh_so_daily.png)\n"
                    f"- SMTP Server: smtp.office365.com:587 (Tài khoản: ss.it@ggg.com.vn)"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success" if is_success else "failed",
                    "message": email_res.get("message"),
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi khi gửi email báo cáo doanh số: {str(e)}",
                    "details": f"Chi tiết ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # 3. Real execution for Check VPN Restaurants
        elif job_id == "job_check_vpn_restaurants":
            try:
                # First, perform VPN ping check across restaurants
                vpn_res = await asyncio.to_thread(network_monitor_service.check_vpn_restaurants)

                total = vpn_res.get("total", 0)
                down_count = vpn_res.get("down_count", 0)
                ok_count = vpn_res.get("ok_count", 0)
                down_items = vpn_res.get("down_items", [])

                if total == 0:
                    raise RuntimeError("Không có nhà hàng nào được kiểm tra hoặc không kết nối được cơ sở dữ liệu.")

                # Ping check succeeded -> proceed with email notification if configured
                mail_status = "Chưa gửi email (chưa cấu hình người nhận hoặc tính năng thông báo email đang tắt)"
                raw_recipients = job.get("email_recipients") or ""
                recipients = [e.strip().rstrip(",") for e in raw_recipients.split(",") if e.strip().rstrip(",")]
                if job.get("has_email_notification", False) and recipients:
                    mail_res = await asyncio.to_thread(
                        network_monitor_service.send_vpn_alert_email,
                        results=vpn_res,
                        recipients=recipients
                    )
                    mail_status = f"Đã gửi email cảnh báo VPN thành công tới: {', '.join(recipients)}"

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = (
                    f"Kiểm tra kết nối VPN Nhà Hàng hoàn tất ({vpn_res['target_time']}): "
                    f"{ok_count}/{total} NH kết nối bình thường, {down_count} NH rớt VPN. {mail_status}"
                )
                down_sample = ", ".join([f"{it['sap']} - {it['res']} ({it['ip']})" for it in down_items[:10]])
                if len(down_items) > 10:
                    down_sample += f" ...và {len(down_items) - 10} nhà hàng khác"

                details = (
                    f"Kết quả kiểm tra kết nối VPN Nhà Hàng:\n"
                    f"- Tiêu chí lọc: Chỉ quét các nhà hàng có trạng thái ON (Bỏ qua NEW và OFF)\n"
                    f"- Thời gian thực hiện: {vpn_res['target_time']}\n"
                    f"- Tổng số nhà hàng kiểm tra: {total}\n"
                    f"- Kết nối VPN ổn định: {ok_count}\n"
                    f"- Mất kết nối VPN (Rớt Router): {down_count}\n"
                    f"- Danh sách nhà hàng rớt VPN: {down_sample or 'Không có (Toàn bộ hoạt động tốt)'}\n"
                    f"- Trạng thái thông báo Email: {mail_status}\n"
                    f"- Server gửi Mail: smtp.office365.com:587 (ss.it@ggg.com.vn)"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi trong quá trình kiểm tra VPN Nhà Hàng (Không gửi email): {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}\nCơ chế an toàn: Tác vụ đã dừng và KHÔNG gửi email khi quá trình kiểm tra xảy ra lỗi.",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # 4. Real execution for Check Internet WAN Restaurants
        elif job_id == "job_check_internet_restaurants":
            try:
                # First, perform Internet WAN ping check across restaurants
                net_res = await asyncio.to_thread(network_monitor_service.check_internet_restaurants)

                total = net_res.get("total", 0)
                down_count = net_res.get("down_count", 0)
                ok_count = net_res.get("ok_count", 0)
                down_items = net_res.get("down_items", [])

                if total == 0:
                    raise RuntimeError("Không có nhà hàng nào được kiểm tra hoặc không kết nối được cơ sở dữ liệu.")

                # Ping check succeeded -> proceed with email notification if configured
                mail_status = "Chưa gửi email (chưa cấu hình người nhận hoặc tính năng thông báo email đang tắt)"
                raw_recipients = job.get("email_recipients") or ""
                recipients = [e.strip().rstrip(",") for e in raw_recipients.split(",") if e.strip().rstrip(",")]
                if job.get("has_email_notification", False) and recipients:
                    mail_res = await asyncio.to_thread(
                        network_monitor_service.send_internet_alert_email,
                        results=net_res,
                        recipients=recipients
                    )
                    mail_status = f"Đã gửi email cảnh báo Internet thành công tới: {', '.join(recipients)}"

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = (
                    f"Kiểm tra Internet WAN Nhà Hàng hoàn tất ({net_res['target_time']}): "
                    f"{ok_count}/{total} NH kết nối Internet bình thường, {down_count} NH rớt Internet. {mail_status}"
                )
                down_sample = ", ".join([f"{it['sap']} - {it['res']} ({it['ip_wan']})" for it in down_items[:10]])
                if len(down_items) > 10:
                    down_sample += f" ...và {len(down_items) - 10} nhà hàng khác"

                details = (
                    f"Kết quả kiểm tra tín hiệu Internet WAN Nhà Hàng:\n"
                    f"- Tiêu chí lọc: Chỉ quét các nhà hàng có trạng thái ON (Bỏ qua NEW và OFF)\n"
                    f"- Thời gian thực hiện: {net_res['target_time']}\n"
                    f"- Tổng số nhà hàng kiểm tra: {total}\n"
                    f"- Kết nối Internet WAN ổn định: {ok_count}\n"
                    f"- Mất kết nối Internet (Rớt mạng WAN): {down_count}\n"
                    f"- Danh sách nhà hàng rớt Internet: {down_sample or 'Không có (Toàn bộ hoạt động tốt)'}\n"
                    f"- Trạng thái thông báo Email: {mail_status}\n"
                    f"- Server gửi Mail: smtp.office365.com:587 (ss.it@ggg.com.vn)"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi trong quá trình kiểm tra Internet WAN Nhà Hàng (Không gửi email): {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}\nCơ chế an toàn: Tác vụ đã dừng và KHÔNG gửi email khi quá trình kiểm tra xảy ra lỗi.",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # Real execution for Review Missing Restaurant Info
        elif job_id == "job_review_missing_restaurant_info":
            try:
                audit_res = await asyncio.to_thread(restaurant_audit_service.audit_restaurants)

                total = audit_res.get("total_scanned", 0)
                need_count = audit_res.get("need_reminder_count", 0)
                skipped_count = audit_res.get("skipped_offline_count", 0)
                valid_count = audit_res.get("valid_count", 0)
                need_items = audit_res.get("need_reminder_items", [])

                if total == 0:
                    raise RuntimeError("Không có nhà hàng nào được kiểm tra hoặc không kết nối được cơ sở dữ liệu.")

                mail_status = "Chưa gửi email (chưa cấu hình người nhận hoặc tính năng thông báo email đang tắt)"
                raw_recipients = job.get("email_recipients") or ""
                recipients = [e.strip().rstrip(",") for e in raw_recipients.split(",") if e.strip().rstrip(",")]
                if job.get("has_email_notification", False) and recipients:
                    mail_res = await asyncio.to_thread(
                        restaurant_audit_service.send_audit_email,
                        results=audit_res,
                        recipients=recipients
                    )
                    mail_status = f"Đã gửi email nhắc nhở thành công tới: {', '.join(recipients)}"

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = (
                    f"Rà soát thông tin nhà hàng hoàn tất ({audit_res['target_time']}): "
                    f"{valid_count}/{total} NH đầy đủ thông tin, {need_count} NH online CẦN BỔ SUNG, "
                    f"{skipped_count} NH offline bỏ qua. {mail_status}"
                )

                need_sample = ", ".join([f"{it['res']} ({', '.join(it['missing_fields'])})" for it in need_items[:8]])
                if len(need_items) > 8:
                    need_sample += f" ...và {len(need_items) - 8} nhà hàng khác"

                details = (
                    f"Kết quả Rà Soát Thông Tin Nhà Hàng Còn Thiếu:\n"
                    f"- Tiêu chuẩn hợp lệ: Mã SAP (4-5 số), Cost Center (>= 5 ký tự), Mã RK7 (>= 3 số), Ngày Khai Trương (> 2025), Trạng Thái ON\n"
                    f"- Thời gian thực hiện: {audit_res['target_time']}\n"
                    f"- Tổng số nhà hàng rà soát: {total}\n"
                    f"- Đầy đủ thông tin: {valid_count}\n"
                    f"- Cần bổ sung (Ping Online): {need_count}\n"
                    f"- Bỏ qua (Chưa hoạt động / Mất tín hiệu Ping): {skipped_count}\n"
                    f"- Danh sách NH online cần bổ sung: {need_sample or 'Không có (Toàn bộ đã hoàn thiện)'}\n"
                    f"- Trạng thái thông báo Email: {mail_status}\n"
                    f"- Server gửi Mail: smtp.office365.com:587 (ss.it@ggg.com.vn)"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi trong quá trình rà soát thông tin nhà hàng: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # 6. Real execution for Compress DB Backup & Clean Files > 30 Days
        elif job_id == "job_compress_and_clean_db_backup":
            try:
                backup_res = await asyncio.to_thread(maintenance_service.compress_and_cleanup_db_backup)
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                is_success = (backup_res.get("status") in ("success", "warning"))
                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success" if is_success else "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                if is_success:
                    job["success_runs"] = job.get("success_runs", 0) + 1
                else:
                    job["failed_runs"] = job.get("failed_runs", 0) + 1

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success" if is_success else "failed",
                    "message": backup_res.get("message"),
                    "details": backup_res.get("details"),
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, log_entry))
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi khi nén DB backup hoặc dọn dẹp file cũ: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 7. Real execution for Overnight Devices Check
        elif job_id == "job_check_overnight_devices":
            try:
                from app.services.overnight_devices_service import overnight_devices_service
                res = await asyncio.to_thread(overnight_devices_service.scan_and_log_overnight_devices)

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                total_rests = res.get("total_restaurants_scanned", 0)
                overnight_rests = res.get("total_restaurants_with_overnight", 0)
                overnight_devs = res.get("total_devices_overnight", 0)

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                # Gửi email báo cáo dạng bảng 3 cột chuẩn
                mail_status = "Chưa gửi email thông báo (chưa cấu hình người nhận hoặc tính năng thông báo đang tắt)"
                raw_recipients = job.get("email_recipients") or ""
                recipients = [e.strip().rstrip(",") for e in raw_recipients.split(",") if e.strip().rstrip(",")]
                if job.get("has_email_notification", False) and recipients:
                    try:
                        mail_res = await asyncio.to_thread(
                            overnight_devices_service.send_overnight_devices_email,
                            scan_results=res,
                            recipients=recipients
                        )
                        mail_status = f"Đã gửi email báo cáo thiết bị qua đêm (dạng bảng 4 cột chuẩn) thành công tới: {', '.join(recipients)}"
                    except Exception as me:
                        mail_status = f"Lỗi khi gửi email báo cáo: {str(me)}"
                        logger.error(f"[JOB_OVERNIGHT_EMAIL] {mail_status}")

                msg = res.get("message")
                details = (
                    f"Kết quả quét thiết bị để qua đêm:\n"
                    f"- Ngày quét: {res.get('scan_date')}\n"
                    f"- Tổng số nhà hàng quét: {total_rests}\n"
                    f"- Số nhà hàng có máy để qua đêm: {overnight_rests}\n"
                    f"- Tổng số thiết bị để qua đêm: {overnight_devs}\n"
                    f"- Trạng thái thông báo Email: {mail_status}\n"
                    f"- Định dạng gửi mail: Bảng 4 cột (Tên Nhà Hàng | Thiết bị để qua đêm kds | Thiết bị để qua đêm pc/11/41 | email)\n"
                    f"- Server gửi Mail: smtp.office365.com:587 (ss.it@ggg.com.vn)\n\n"
                    f"--- BÁO CÁO CHI TIẾT THEO MẪU ---\n"
                    f"{res.get('formatted_report', 'Không có nhà hàng nào để máy qua đêm.')}"
                )

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": f"{msg}. {mail_status}",
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi khi quét thiết bị để qua đêm: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 8. Real execution for RAM Limit Audit (SQL 2GB & MongoDB 6GB)
        elif job_id == "job_check_ram_sql_mongo_limits":
            try:
                from app.services.ram_limit_audit_service import ram_limit_audit_service
                res = await asyncio.to_thread(ram_limit_audit_service.scan_and_log_ram_limits)

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = res.get("message")
                details = (
                    f"Kết quả kiểm tra giới hạn RAM SQL Server & MongoDB:\n"
                    f"- Ngày quét: {res.get('scan_date')}\n"
                    f"- Tổng số nhà hàng quét: {res.get('total_scanned')}\n"
                    f"- SQL Server (.41): {res.get('sql_limited')} đạt chuẩn 2GB, {res.get('sql_unlimited')} chưa giới hạn, {res.get('sql_offline')} không kết nối\n"
                    f"- MongoDB (.41, .11, .12): {res.get('mongo_limited')} đạt chuẩn 6GB, {res.get('mongo_unlimited')} chưa giới hạn, {res.get('mongo_closed_port')} chưa mở port IP\n"
                    f"- Thông điệp: {msg}"
                )

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi khi kiểm tra RAM SQL/Mongo: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # 9. Real execution for Ticket Batch By Category (Đóng Ticket Hàng Loạt 3CX)
        elif job_id == "job_ticket_batch_by_category":
            try:
                from app.services.ticket_batch_service import run_full_batch_pipeline
                # Chạy toàn bộ quy trình: login 1 lần duy nhất, lấy timesheet, đóng các ticket 3CX và gửi email
                batch_res = await run_full_batch_pipeline()

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                is_success = batch_res.get("failed_count", 0) == 0
                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success" if is_success else "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                if is_success:
                    job["success_runs"] = job.get("success_runs", 0) + 1
                else:
                    job["failed_runs"] = job.get("failed_runs", 0) + 1

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success" if is_success else "failed",
                    "message": batch_res.get("message", "Đã xử lý ticket batch"),
                    "details": (
                        f"Kết quả đóng ticket hàng loạt:\n"
                        f"- Tổng ticket: {batch_res.get('total_processed')}\n"
                        f"- Thành công: {batch_res.get('success_count')}\n"
                        f"- Lỗi: {batch_res.get('failed_count')}\n"
                        f"- Bỏ qua: {batch_res.get('skipped_count')}\n"
                        f"- Email thông báo: {'Đã gửi' if batch_res.get('email_sent') else 'Chưa gửi'}"
                    ),
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)

            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                from app.services.ticket_batch_service import format_friendly_error
                friendly_err = format_friendly_error(e)

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": friendly_err,
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 10. Real execution for Unassigned 3CX Tickets Audit (Rà soát các nhiệm vụ 3CX chưa gán người xử lý)
        elif job_id == "job_check_unassigned_3cx_tickets":
            try:
                from app.services.unassigned_3cx_service import unassigned_3cx_service
                res = await unassigned_3cx_service.scan_unassigned_tickets()

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                total_unassigned = res.get("total_unassigned", 0)
                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = f"Đã rà soát xong GPMS. Phát hiện {total_unassigned} nhiệm vụ 3CX chưa gán người xử lý."
                details = (
                    f"Kết quả rà soát nhiệm vụ 3CX chưa gán người xử lý:\n"
                    f"- Ngày quét: {res.get('scan_date')}\n"
                    f"- Thời gian thực hiện: {res.get('scanned_at')}\n"
                    f"- Tổng số nhiệm vụ chưa gán: {total_unassigned}\n"
                )
                if res.get("items"):
                    sample_titles = "\n".join([f"  • #{it['ticket_id']} - {it['ticket_title'][:60]}... (Tạo: {it.get('created_at', '—')})" for it in res["items"][:8]])
                    details += f"\nDanh sách nhiệm vụ:\n{sample_titles}"

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()

                # Tự động gửi email báo cáo nếu job có cấu hình email recipients
                recipients = job.get("email_recipients")
                if recipients and recipients.strip():
                    try:
                        await asyncio.to_thread(unassigned_3cx_service.send_report_email, recipients, res.get("scan_date"))
                    except Exception as mail_err:
                        print(f"[UNASSIGNED_3CX] Lỗi gửi email tự động: {mail_err}")

                return JobRunLog(**log_entry)

            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                from app.services.ticket_batch_service import format_friendly_error
                friendly_err = format_friendly_error(e)

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": friendly_err,
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 11. Real execution for Scan Mail Memo Auto (Quét Mail Memo AUTO)
        elif job_id == "job_scan_mail_memo_auto":
            try:
                from app.services.mail_memo_service import mail_memo_service
                res = await asyncio.to_thread(mail_memo_service.scan_and_import_memos, 60)

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                total_found = res.get("total_found", 0)
                total_imported = res.get("total_imported", 0)
                total_skipped = res.get("total_skipped", 0)

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = (
                    f"Quét Mail Memo AUTO hoàn tất: Tìm thấy {total_found} email, "
                    f"đã import thành công {total_imported} Memo mới vào hệ thống (Bỏ qua {total_skipped} mã đã có)."
                )
                new_items = res.get("new_items", [])
                items_preview = "\n".join([f"- Memo {it['memo_code']}: {it.get('ten_memo', '')} (Gán IT: {it.get('it_setup')})" for it in new_items[:10]])
                details = (
                    f"Chi tiết kết quả Quét Mail Memo AUTO:\n"
                    f"- Tổng email yêu cầu tạo nút RK tìm thấy: {total_found}\n"
                    f"- Số Memo mới đã thêm vào hệ thống: {total_imported}\n"
                    f"- Số Memo bỏ qua do đã tồn tại: {total_skipped}\n"
                    f"{items_preview or 'Không có Memo mới phát sinh'}"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }

                # Nếu không có Memo mới phát sinh (0 có cái mới): Gửi thông báo ngắn gọn tinh giản
                if total_imported == 0:
                    log_entry["custom_subject"] = f"[THÀNH CÔNG] Thông báo thực thi tác vụ: Quét Mail Memo AUTO (Outlook/Salesforce) - 0 có cái mới"
                    log_entry["custom_plain"] = (
                        f"Quét Mail Memo AUTO (Outlook/Salesforce) thành công\n"
                        f"Thời gian thực hiện: {end_str}  |  Kích hoạt bởi: {triggered_by}\n"
                        f"0 có cái mới\n"
                    )
                    log_entry["custom_html"] = f"""
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body {{ font-family: 'Segoe UI', Calibri, Tahoma, sans-serif; font-size: 13px; color: #1F2937; line-height: 1.5; margin: 0; padding: 0; }}
                            .container {{ max-width: 650px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }}
                            .header {{ background-color: #111827; color: #F5B800; padding: 16px 20px; font-size: 16px; font-weight: bold; }}
                            .body {{ padding: 24px; background-color: #FFFFFF; }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                HỆ THỐNG QUẢN TRỊ TÁC VỤ IT - QUÉT MAIL MEMO AUTO
                            </div>
                            <div class="body">
                                <div style="font-size: 15px; font-weight: bold; color: #111827; margin-bottom: 6px;">
                                    Quét Mail Memo AUTO (Outlook/Salesforce) thành công
                                </div>
                                <div style="font-size: 12px; color: #6B7280; margin-bottom: 14px;">
                                    Thời gian thực hiện: <b>{end_str}</b> &nbsp;|&nbsp; Kích hoạt bởi: <b>{triggered_by}</b>
                                </div>
                                <div style="display: inline-block; padding: 6px 14px; border-radius: 6px; background-color: #EFF6FF; color: #1D4ED8; font-weight: bold; font-size: 13px; border: 1px solid #BFDBFE;">
                                    0 có cái mới
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                    """

                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, log_entry))
                return JobRunLog(**log_entry)

            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi quét Mail Memo AUTO: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # 12. Real execution for Check MongoDB & Mosquitto Broker
        elif job_id == "job_check_mongodb_mosquitto_services":
            try:
                from app.services.mongo_mosquitto_service import mongo_mosquitto_service
                raw_recipients = job.get("email_recipients") or ""
                recipients = [e.strip() for e in raw_recipients.split(",") if e.strip()]
                has_email = bool(job.get("has_email_notification", True)) and bool(recipients)

                res = await asyncio.to_thread(
                    mongo_mosquitto_service.scan_all_restaurants,
                    email_recipients=raw_recipients if has_email else None
                )

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                total_scanned = res.get("total_scanned", 0)
                total_ok = res.get("total_ok", 0)
                total_error = res.get("total_error", 0)
                total_excluded = res.get("total_excluded", 0)
                email_status = res.get("email_status", "")

                is_success = (total_error == 0)

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success" if is_success else "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                if is_success:
                    job["success_runs"] = job.get("success_runs", 0) + 1
                else:
                    job["failed_runs"] = job.get("failed_runs", 0) + 1

                msg = (
                    f"Quét MongoDB & Mosquitto hoàn tất: {total_scanned} NH được kiểm tra "
                    f"({total_ok} OK, {total_error} Lỗi, bỏ qua {total_excluded} NH TCH/UT/Universal/Tea). "
                    f"Email: {email_status}"
                )

                error_preview = ""
                error_items = res.get("error_items", [])
                if error_items:
                    lines = [f"- [{it.get('sap_code')}] {it.get('restaurant_name')}: {it.get('note')}" for it in error_items[:15]]
                    if len(error_items) > 15:
                        lines.append(f"... và {len(error_items) - 15} nhà hàng lỗi khác.")
                    error_preview = "\n" + "\n".join(lines)

                details = (
                    f"Chi tiết Quét MongoDB Server & Mosquitto Broker:\n"
                    f"- Tổng NH hoạt động: {res.get('total_restaurants_active', 0)}\n"
                    f"- Bỏ qua: {total_excluded} (TCH, Tea, UT, Universal, Khong Phai NH)\n"
                    f"- Đã quét: {total_scanned} nhà hàng\n"
                    f"- Đạt chuẩn OK (có máy chạy đủ 2 service): {total_ok}\n"
                    f"- Bị lỗi / thiếu service: {total_error}\n"
                    f"- Trạng thái Email: {email_status}\n"
                    f"- Danh sách lỗi tiêu biểu:{error_preview or ' Không có lỗi nào!'}"
                )

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success" if is_success else "failed",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)

            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi quét MongoDB & Mosquitto: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                return JobRunLog(**err_entry)

        # 13. Real execution for Auto Purge Old Logs (After 3 years)
        if job_id == "job_auto_purge_old_logs":
            try:
                from app.services.log_service import log_service
                from app.core.database import SessionLocal
                db = SessionLocal()
                try:
                    deleted_count = await asyncio.to_thread(log_service.purge_old_logs, db, 3)
                finally:
                    db.close()

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = f"Đã dọn dẹp {deleted_count} bản ghi logs cũ hơn 3 năm trong LOGS__New."
                details = f"Tác vụ dọn dẹp Logs định kỳ (> 3 năm) thành công. Tổng số bản ghi được giải phóng: {deleted_count} dòng."

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**log_entry)
            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi dọn dẹp logs cũ: {str(e)}",
                    "details": f"Ngoại lệ: {str(e)}",
                    "triggered_by": triggered_by
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                return JobRunLog(**err_entry)

        # 14. Real execution for PIM Requests Sync & Auto Assignment
        elif job_id == "job_sync_pim_requests":
            try:
                from app.services.pim_service import sync_all_pim_data, format_pim_email_report
                from app.core.database import SessionLocal

                db = SessionLocal()
                try:
                    res = await asyncio.to_thread(sync_all_pim_data, db)
                finally:
                    db.close()

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                total_scanned = res.get("total_scanned", 0)
                inserted = res.get("inserted", 0)
                updated = res.get("updated", 0)
                items = res.get("items", [])

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["success_runs"] = job.get("success_runs", 0) + 1

                msg = (
                    f"Đồng bộ PIM hoàn tất: Quét {total_scanned} yêu cầu, "
                    f"ghi nhận thêm {inserted} PIM mới, cập nhật {updated} yêu cầu. "
                    f"Đã phân công tự động cho {len(items)} nhiệm vụ."
                )

                subject, custom_html, custom_plain = format_pim_email_report(
                    res=res,
                    scan_date=end_str,
                    triggered_by=triggered_by
                )

                details = (
                    f"Chi tiết thực thi tác vụ Đồng bộ PIM & Phân công tự động:\n"
                    f"- Thời gian hoàn tất: {end_str} (Thời lượng: {duration}s)\n"
                    f"- Tổng số yêu cầu quét từ 4 màn hình PIM: {total_scanned}\n"
                    f"- Số yêu cầu PIM mới ghi nhận thêm: {inserted}\n"
                    f"- Số yêu cầu PIM đã cập nhật: {updated}\n"
                    f"- Số nhiệm vụ trong bảng phân công: {len(items)}\n\n"
                    f"Danh sách chi tiết phân công:\n"
                    f"{custom_plain}"
                )

                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by,
                    "custom_subject": subject,
                    "custom_html": custom_html,
                    "custom_plain": custom_plain
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, log_entry))
                return JobRunLog(**log_entry)

            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_msg = str(e)
                from app.services.pim_service import format_pim_email_report
                from app.models.pim import PIMRequest
                from sqlalchemy import or_, desc, select
                from app.core.database import SessionLocal

                fallback_items = []
                db = SessionLocal()
                try:
                    recent = db.execute(
                        select(PIMRequest)
                        .where(or_(
                            PIMRequest.trang_thai_thuc_hien != "đã hoàn thành",
                            PIMRequest.so != "đã hoàn thành",
                            PIMRequest.gui_mail != "đã hoàn thành"
                        ))
                        .order_by(desc(PIMRequest.id))
                        .limit(20)
                    ).scalars().all()
                    for r in recent:
                        fallback_items.append({
                            "id_yeu_cau": r.id_yeu_cau,
                            "chuoi": r.chuoi or "—",
                            "ten_menu": r.ten_menu or "—",
                            "source": "Yêu cầu trong hệ thống",
                            "user_thuc_hien": r.user_thuc_hien or "Chưa phân công",
                            "is_new": False,
                            "link_yeu_cau": r.link_yeu_cau or "",
                            "trang_thai": r.trang_thai_thuc_hien or "Chưa hoàn thành"
                        })
                except Exception:
                    pass
                finally:
                    db.close()

                subject, custom_html, custom_plain = format_pim_email_report(
                    res={"total_scanned": 0, "inserted": 0, "updated": 0, "items": fallback_items, "is_from_pending_db": True},
                    scan_date=end_str,
                    triggered_by=triggered_by,
                    error=err_msg
                )

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Sự cố đồng bộ PIM: {err_msg}",
                    "details": f"Ngoại lệ: {err_msg}\n\nDanh sách PIM hiện có:\n{custom_plain}",
                    "triggered_by": triggered_by,
                    "custom_subject": subject,
                    "custom_html": custom_html,
                    "custom_plain": custom_plain
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 15. Real execution for 3CX Hotline Duty Auto Sync (Tự Động Chỉnh Trực Hotline 3CX)
        elif job_id == "job_auto_sync_3cx_hotline_duty":
            try:
                from app.core.database import SessionLocal
                from app.services.hotline_3cx_auto_service import (
                    has_pending_relay_sync,
                    has_successful_sync,
                    run_shift_sync,
                )

                today = date.today()
                sched = job.get("schedule", {})
                time_morning = sched.get("time") or "06:00"
                time_evening = sched.get("time_2") or "16:29"

                if target_time:
                    if target_time == time_evening:
                        shift_code = "EVENING"
                    elif target_time == time_morning:
                        shift_code = "MORNING"
                    else:
                        shift_code = "MORNING" if start_dt.hour < 12 else "EVENING"
                else:
                    shift_code = "MORNING" if start_dt.hour < 12 else "EVENING"

                db = SessionLocal()
                try:
                    is_auto = (triggered_by == "Hệ thống (Auto)")
                    today_str = today.strftime("%d-%m-%Y")
                    if is_auto and (
                        has_successful_sync(db, today, shift_code)
                        or has_pending_relay_sync(db, today, shift_code)
                    ):
                        logger.info(
                            f"[JOB_AUTO] Bỏ qua vì ca {shift_code} ngày {today_str} đã đồng bộ thành công hoặc đang chờ Relay."
                        )
                        end_dt = datetime.now()
                        duration = round((end_dt - start_dt).total_seconds(), 2)
                        end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                        job["status"] = "idle"
                        job["last_run_at"] = end_str
                        job["last_duration"] = duration
                        job["last_status"] = "success"
                        job["total_runs"] = job.get("total_runs", 0) + 1
                        job["success_runs"] = job.get("success_runs", 0) + 1

                        msg = f"Bỏ qua vì ca {shift_code} ngày {today_str} đã đồng bộ thành công hoặc đang chờ Relay."
                        log_entry = {
                            "id": log_id,
                            "job_id": job_id,
                            "job_name": job["job_name"],
                            "started_at": start_str,
                            "finished_at": end_str,
                            "duration_seconds": duration,
                            "status": "success",
                            "message": msg,
                            "details": msg,
                            "triggered_by": triggered_by,
                        }
                        self._logs.insert(0, log_entry)
                        self._save_config()
                        self._save_logs()
                        return JobRunLog(**log_entry)

                    # Thực thi run_shift_sync
                    sync_log = await run_shift_sync(
                        db,
                        duty_date=today,
                        shift_code=shift_code,
                        triggered_by=triggered_by,
                        dry_run=False,
                        allow_retry=is_auto,
                    )
                finally:
                    db.close()

                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                is_success = (sync_log.status in ("SUCCESS", "PENDING"))
                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "success" if is_success else "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                if is_success:
                    job["success_runs"] = job.get("success_runs", 0) + 1
                else:
                    job["failed_runs"] = job.get("failed_runs", 0) + 1

                today_str = today.strftime("%d-%m-%Y")
                msg = f"Đồng bộ Hotline 3CX ca {shift_code} ngày {today_str}: {sync_log.status}"
                err_text = sync_log.error_message or "Không"
                details = (
                    f"Trạng thái: {sync_log.status}\n"
                    f"Hàng đợi: {sync_log.queue_name}\n"
                    f"Danh sách lines: {sync_log.applied_lines_json}\n"
                    f"Lỗi: {err_text}"
                )
                log_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "success" if is_success else "failed",
                    "message": msg,
                    "details": details,
                    "triggered_by": triggered_by,
                }
                self._logs.insert(0, log_entry)
                self._save_config()
                self._save_logs()

                if not is_success and (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, log_entry))

                return JobRunLog(**log_entry)

            except Exception as e:
                end_dt = datetime.now()
                duration = round((end_dt - start_dt).total_seconds(), 2)
                end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

                job["status"] = "idle"
                job["last_run_at"] = end_str
                job["last_duration"] = duration
                job["last_status"] = "failed"
                job["total_runs"] = job.get("total_runs", 0) + 1
                job["failed_runs"] = job.get("failed_runs", 0) + 1

                err_entry = {
                    "id": log_id,
                    "job_id": job_id,
                    "job_name": job["job_name"],
                    "started_at": start_str,
                    "finished_at": end_str,
                    "duration_seconds": duration,
                    "status": "failed",
                    "message": f"Lỗi đồng bộ Hotline 3CX: {str(e)}",
                    "details": traceback.format_exc(),
                    "triggered_by": triggered_by,
                }
                self._logs.insert(0, err_entry)
                self._save_config()
                self._save_logs()
                if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
                    asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, err_entry))
                return JobRunLog(**err_entry)

        # 16. Safe Simulation for other jobs
        await asyncio.sleep(0.8)
        end_dt = datetime.now()
        duration = round((end_dt - start_dt).total_seconds(), 2)
        end_str = end_dt.strftime("%Y-%m-%d %H:%M:%S")

        # Update stats
        job["status"] = "idle"
        job["last_run_at"] = end_str
        job["last_duration"] = duration
        job["last_status"] = "success"
        job["total_runs"] = job.get("total_runs", 0) + 1
        job["success_runs"] = job.get("success_runs", 0) + 1

        simulated_msg = (
            f"[CHẾ ĐỘ XEM TRƯỚC / DRY-RUN] Tác vụ '{job['job_name']}' được kích hoạt thử nghiệm thành công. "
            f"Hệ thống đang ở chế độ xem trước (View Mode), không thực thi thao tác dữ liệu hay gửi email thật."
        )

        extra_info = ""

        email_info = ""
        if job.get("has_email_notification") or job.get("email_recipients"):
            recipients = job.get("email_recipients") or "Chưa cấu hình danh sách nhận"
            email_info = f"\n- Cấu hình gửi mail: Bật\n- Danh sách Email nhận: {recipients}\n- Giả lập gửi Email: Thành công (Dry-run không gửi email thật)"

        simulated_details = (
            f"Thông tin kiểm tra môi trường:\n"
            f"- Mã Tác Vụ: {job['job_id']}\n"
            f"- Phân loại: {job['category_name']}\n"
            f"- Nguồn code: {job.get('source_reference')}\n"
            f"- Chu kỳ cài đặt: {job.get('schedule', {}).get('human_readable')}\n"
            f"- Trạng thái kết nối SQL / Service: Khả dụng (Ready){extra_info}{email_info}\n"
            f"- Ghi chú an toàn: Theo chỉ đạo, tác vụ chưa chạy thật trên server mà chỉ mô phỏng kiểm thử giao diện."
        )

        log_entry = {
            "id": log_id,
            "job_id": job_id,
            "job_name": job["job_name"],
            "started_at": start_str,
            "finished_at": end_str,
            "duration_seconds": duration,
            "status": "success",
            "message": simulated_msg,
            "details": simulated_details,
            "triggered_by": triggered_by
        }

        self._logs.insert(0, log_entry)
        self._save_config()
        self._save_logs()
        if (job.get("has_email_notification") or job.get("email_recipients")) and job.get("email_recipients"):
            asyncio.create_task(asyncio.to_thread(self._send_job_execution_email, job, log_entry))

        return JobRunLog(**log_entry)

    def get_job_logs(self, job_id: Optional[str] = None, limit: int = 50) -> List[JobRunLog]:
        if job_id:
            filtered = [l for l in self._logs if l.get("job_id") == job_id]
        else:
            filtered = self._logs
        return [JobRunLog(**l) for l in filtered[:limit]]

job_scheduler_service = JobSchedulerService()


async def job_schedule_worker(stop_event: asyncio.Event):
    """
    Tiến trình nền chạy ngầm tự động kích hoạt các tác vụ trong Job Scheduler theo đúng lịch hẹn (Hàng ngày, Interval, Weekly).
    """
    import logging
    sched_logger = logging.getLogger("app.job_scheduler")
    sched_logger.info("Khởi động tiến trình chạy nền Job Schedule Worker...")

    last_executed: Dict[str, datetime] = {}
    last_relay_sweep: Optional[datetime] = None

    while not stop_event.is_set():
        try:
            now = datetime.now()
            if not last_relay_sweep or (now - last_relay_sweep).total_seconds() >= 60:
                last_relay_sweep = now
                try:
                    def _sweep_relay():
                        from app.core.database import SessionLocal
                        from app.services.hotline_3cx_auto_service import expire_stale_relay_tasks

                        with SessionLocal() as _sdb:
                            expire_stale_relay_tasks(_sdb, timeout_minutes=15)

                    await asyncio.to_thread(_sweep_relay)
                except Exception as _sweep_err:
                    sched_logger.warning("Lỗi kiểm tra tác vụ 3CX Relay quá hạn: %s", _sweep_err)
            current_time = now.strftime("%H:%M")
            current_dow = now.isoweekday()  # 1: Monday ... 7: Sunday

            # Quét lịch hẹn giờ Backup Manual theo ngày (chạy độc lập ngay cả khi lịch chung đang Tạm Dừng)
            try:
                today_date = now.date()

                def _find_due_3cx_backups():
                    from app.core.database import SessionLocal
                    from app.services.hotline_3cx_auto_service import (
                        get_due_manual_backup_shifts,
                        has_backup_sync_for_slot,
                    )

                    with SessionLocal() as _bdb:
                        due_list = get_due_manual_backup_shifts(_bdb, today_date, current_time)
                        return [
                            (sc, hhmm)
                            for sc, hhmm in due_list
                            if not has_backup_sync_for_slot(_bdb, today_date, sc, hhmm)
                        ]

                due_backups = await asyncio.to_thread(_find_due_3cx_backups)
                for b_shift, b_hhmm in due_backups:
                    b_key = f"3cx_backup@{today_date.isoformat()}@{b_shift}@{b_hhmm}"
                    b_last = last_executed.get(b_key)
                    if b_last and (now - b_last).total_seconds() < 65:
                        continue
                    last_executed[b_key] = now
                    sched_logger.info(
                        "[3CX_BACKUP_AUTO] Đến giờ hẹn Backup Manual %s lúc %s ngày %s — bắt đầu đồng bộ...",
                        b_shift,
                        b_hhmm,
                        today_date.strftime("%d-%m-%Y"),
                    )

                    async def _run_backup_task(t_date=today_date, t_shift=b_shift, t_hhmm=b_hhmm):
                        from app.core.database import SessionLocal
                        from app.services.hotline_3cx_auto_service import run_shift_sync

                        _db = SessionLocal()
                        try:
                            await run_shift_sync(
                                _db,
                                duty_date=t_date,
                                shift_code=t_shift,
                                triggered_by=f"Hẹn giờ Backup ({t_hhmm})",
                                dry_run=False,
                                allow_retry=True,
                            )
                        except Exception as _be:
                            sched_logger.error(
                                "[3CX_BACKUP_AUTO] Lỗi chạy Backup Manual %s (%s): %s",
                                t_shift,
                                t_hhmm,
                                _be,
                            )
                        finally:
                            _db.close()

                    asyncio.create_task(_run_backup_task())
            except Exception as _bk_scan_err:
                sched_logger.warning("Lỗi kiểm tra lịch hẹn Backup Manual 3CX: %s", _bk_scan_err)

            all_jobs = list(job_scheduler_service._jobs.values())
            for job in all_jobs:
                if not job.get("is_enabled", True):
                    continue

                job_id = job.get("job_id")
                if not job_id:
                    continue

                # Riêng tác vụ job_sync_pim_requests do pim_schedule_worker độc lập quét tự động
                # theo dbo.PIM_SCHEDULE và tự động ghi log/cập nhật trạng thái sang Job Scheduler
                if job_id == "job_sync_pim_requests":
                    continue

                schedule = job.get("schedule", {})
                sched_type = schedule.get("schedule_type", "daily")
                target_times = []
                for t_raw in [schedule.get("time"), schedule.get("time_2"), schedule.get("time_3")]:
                    nt = normalize_time_str(t_raw)
                    if nt and nt not in target_times:
                        target_times.append(nt)
                if not target_times:
                    target_times = ["06:00"]
                days_of_week = schedule.get("days_of_week", [1, 2, 3, 4, 5, 6, 7])
                interval_min = schedule.get("interval_minutes", 30)

                should_run = False

                if sched_type in ("daily", "weekly"):
                    if current_dow in days_of_week and current_time in target_times:
                        exec_key = f"{job_id}@{current_time}"
                        last_run = last_executed.get(exec_key)
                        if not last_run or (now - last_run).total_seconds() >= 65:
                            should_run = True

                elif sched_type == "interval":
                    last_run = last_executed.get(job_id)
                    if not last_run or (now - last_run).total_seconds() >= (interval_min * 60 - 5):
                        should_run = True

                if should_run:
                    if sched_type in ("daily", "weekly"):
                        last_executed[f"{job_id}@{current_time}"] = now
                    else:
                        last_executed[job_id] = now
                    sched_logger.info(f"[JOB_AUTO] Đến giờ thực thi tác vụ '{job.get('job_name')}' ({job_id}) lúc {current_time}...")
                    asyncio.create_task(job_scheduler_service.trigger_job_dry_run(job_id, triggered_by="Hệ thống (Auto)", target_time=current_time))

        except Exception as e:
            sched_logger.error(f"Lỗi vòng lặp Job Schedule Worker: {e}")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=20.0)
        except asyncio.TimeoutError:
            pass

    sched_logger.info("Tiến trình chạy nền Job Schedule Worker đã dừng.")
