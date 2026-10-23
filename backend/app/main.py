import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import test_db_connection
from app.api.v1.router import api_v1_router

# Hỗ trợ kết nối các phiên bản MongoDB cũ tại nhà hàng (MongoDB 3.6, 4.0 - Wire version 6, 7)
try:
    import pymongo.common
    pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
except Exception:
    pass

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
# Tắt triệt để log spam DEBUG từ comtypes / uiautomation khi chạy backend
logging.getLogger("comtypes").setLevel(logging.WARNING)
logging.getLogger("uiautomation").setLevel(logging.WARNING)
logger = logging.getLogger("app")


import asyncio
from app.services.pim_service import pim_schedule_worker
from app.services.job_scheduler_service import job_schedule_worker
from app.services.mongodb_service import param_schedule_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Khởi động hệ thống %s...", settings.APP_NAME)
    logger.info("Kiểm tra kết nối SQL Server (%s:%s / DB: %s)...", settings.DB_SERVER, settings.DB_PORT, settings.DB_NAME)
    db_ok = test_db_connection()
    if db_ok:
        logger.info("Kết nối SQL Server thành công!")
    else:
        logger.warning("CẢNH BÁO: Chưa kết nối được tới SQL Server!")
    
    # Tự động tạo bảng OVERNIGHT_DEVICES_LOG, USER_SSO_CONFIG, SOFTWARE_VERSIONS, STAFF_LEAVE_LOGS, STAFF_LEAVE_TYPES nếu chưa tồn tại
    try:
        from app.core.database import engine, Base
        from app.models.overnight_device import OvernightDeviceLog
        from app.models.user_sso_config import UserSSOConfig
        from app.models.software_version import SoftwareVersion
        from app.models.standard_app_param import StandardAppParam
        from app.models.scheduled_param_job import ScheduledParamPushJob
        from app.models.violation import StaffLeaveLog, StaffLeaveType
        from app.models.agent_multitask import (
            AgentMultitaskConfig,
            AgentMultitaskEndpoint,
            AgentMultitaskLog,
            AgentMultitaskScriptTemplate,
            AgentMultitaskPackageTemplate
        )
        from sqlalchemy import text
        Base.metadata.create_all(engine, tables=[
            OvernightDeviceLog.__table__,
            UserSSOConfig.__table__,
            SoftwareVersion.__table__,
            StandardAppParam.__table__,
            ScheduledParamPushJob.__table__,
            StaffLeaveLog.__table__,
            StaffLeaveType.__table__,
            AgentMultitaskConfig.__table__,
            AgentMultitaskEndpoint.__table__,
            AgentMultitaskLog.__table__,
            AgentMultitaskScriptTemplate.__table__,
            AgentMultitaskPackageTemplate.__table__,
        ], checkfirst=True)

        # Tự động nạp mẫu kịch bản mặc định nếu bảng trống
        try:
            with engine.connect() as _tc:
                _tcount = _tc.execute(text("SELECT COUNT(*) FROM dbo.AGENT_MULTITASK_SCRIPT_TEMPLATES")).scalar()
                if _tcount == 0:
                    _tc.execute(text("""
                        INSERT INTO dbo.AGENT_MULTITASK_SCRIPT_TEMPLATES 
                        (template_name, folder_hint, file_name, arguments, run_as_admin, description, created_by, created_at, updated_at)
                        VALUES 
                        (N'Update iPOS TCH', N'Update ipos TCH IT NEW', N'Update iPOS TCH.bat', N'', 1, N'Kịch bản cập nhật hệ thống iPOS TCH tự động', N'system', GETDATE(), GETDATE()),
                        (N'Khởi Động Lại GPOS Service', N'GPOS-Setup', N'RestartService.bat', N'', 1, N'Khởi động lại toàn bộ dịch vụ GPOS tại trạm', N'system', GETDATE(), GETDATE())
                    """))
                    _tc.commit()
                    logger.info("Đã tự động khởi tạo các mẫu kịch bản script mặc định trong AGENT_MULTITASK_SCRIPT_TEMPLATES.")

                # Kiểm tra phòng vệ bảng AGENT_MULTITASK_PACKAGE_TEMPLATES
                _tc.execute(text("""
                    IF OBJECT_ID('dbo.AGENT_MULTITASK_PACKAGE_TEMPLATES', 'U') IS NULL
                    BEGIN
                        CREATE TABLE dbo.AGENT_MULTITASK_PACKAGE_TEMPLATES (
                            id INT IDENTITY(1,1) PRIMARY KEY,
                            template_name NVARCHAR(200) NOT NULL,
                            description NVARCHAR(500) NULL,
                            target_folder NVARCHAR(255) NULL DEFAULT 'D:\\GPOS-Setup\\app',
                            package_file_name NVARCHAR(255) NULL,
                            auto_extract BIT NOT NULL DEFAULT 1,
                            steps_json NVARCHAR(MAX) NOT NULL DEFAULT '[]',
                            created_by NVARCHAR(100) NULL,
                            created_at DATETIME NOT NULL DEFAULT GETDATE(),
                            updated_by NVARCHAR(100) NULL,
                            updated_at DATETIME NULL DEFAULT GETDATE()
                        );
                    END
                """))
                _tc.commit()
        except Exception as _ex_tmpl:
            logger.warning("Lỗi tự động seed mẫu script hoặc tạo bảng package templates: %s", _ex_tmpl)
        # Đảm bảo các cột cần thiết tồn tại trong MEMO, SOFTWARE_VERSIONS và GHINHAN_SAIPHAM
        with engine.connect() as _c:
            try:
                _c.execute(text("""
                    IF OBJECT_ID('dbo.GHINHAN_SAIPHAM', 'U') IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='GHINHAN_SAIPHAM' AND COLUMN_NAME='LOAI_SAIPHAM')
                            ALTER TABLE dbo.GHINHAN_SAIPHAM ADD LOAI_SAIPHAM NVARCHAR(100) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='GHINHAN_SAIPHAM' AND COLUMN_NAME='HO_TEN')
                            ALTER TABLE dbo.GHINHAN_SAIPHAM ADD HO_TEN NVARCHAR(150) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='GHINHAN_SAIPHAM' AND COLUMN_NAME='IMAGES')
                            ALTER TABLE dbo.GHINHAN_SAIPHAM ADD IMAGES NVARCHAR(MAX) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='GHINHAN_SAIPHAM' AND COLUMN_NAME='FILES')
                            ALTER TABLE dbo.GHINHAN_SAIPHAM ADD FILES NVARCHAR(MAX) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='GHINHAN_SAIPHAM' AND COLUMN_NAME='DATE_UPDATE')
                            ALTER TABLE dbo.GHINHAN_SAIPHAM ADD DATE_UPDATE DATETIME NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='GHINHAN_SAIPHAM' AND COLUMN_NAME='USER_UPDATE')
                            ALTER TABLE dbo.GHINHAN_SAIPHAM ADD USER_UPDATE NVARCHAR(150) NULL;
                    END
                """))
                _c.commit()
            except Exception as _ex_gh:
                logger.warning("Lỗi tự động kiểm tra cột GHINHAN_SAIPHAM: %s", _ex_gh)

            _col_chk = _c.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='MEMO' AND COLUMN_NAME='noidung_mail'")).fetchone()
            if not _col_chk:
                _c.execute(text("ALTER TABLE MEMO ADD noidung_mail NVARCHAR(MAX) NULL"))
                _c.commit()
                logger.info("Đã tự động bổ sung cột noidung_mail vào bảng MEMO.")
            _pim_ha = _c.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='PIM' AND COLUMN_NAME='hinh_anh_setup'")).fetchone()
            if not _pim_ha:
                _c.execute(text("ALTER TABLE dbo.PIM ADD hinh_anh_setup NVARCHAR(MAX) NULL"))
                _c.commit()
                logger.info("Đã tự động bổ sung cột hinh_anh_setup vào bảng PIM.")
            _col_ha = _c.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SOFTWARE_VERSIONS' AND COLUMN_NAME='hinh_anh'")).fetchone()
            if not _col_ha:
                _c.execute(text("ALTER TABLE dbo.SOFTWARE_VERSIONS ADD hinh_anh NVARCHAR(MAX) NULL"))
                _c.commit()
                logger.info("Đã tự động bổ sung cột hinh_anh vào bảng SOFTWARE_VERSIONS.")
            _col_gc = _c.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='SOFTWARE_VERSIONS' AND COLUMN_NAME='ghi_chu'")).fetchone()
            if not _col_gc:
                _c.execute(text("ALTER TABLE dbo.SOFTWARE_VERSIONS ADD ghi_chu NVARCHAR(MAX) NULL"))
                _c.commit()
                logger.info("Đã tự động bổ sung cột ghi_chu vào bảng SOFTWARE_VERSIONS.")

            # Đảm bảo các cột cho AGENT_MULTITASK_ENDPOINTS (Hỗ trợ máy ngoài và đa máy trạm)
            try:
                _c.execute(text("""
                    IF OBJECT_ID('dbo.AGENT_MULTITASK_ENDPOINTS', 'U') IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='device_type')
                            ALTER TABLE dbo.AGENT_MULTITASK_ENDPOINTS ADD device_type NVARCHAR(50) NULL DEFAULT ('RESTAURANT');
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='user_assigned')
                            ALTER TABLE dbo.AGENT_MULTITASK_ENDPOINTS ADD user_assigned NVARCHAR(100) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='notes')
                            ALTER TABLE dbo.AGENT_MULTITASK_ENDPOINTS ADD notes NVARCHAR(250) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='admin_user')
                            ALTER TABLE dbo.AGENT_MULTITASK_ENDPOINTS ADD admin_user NVARCHAR(100) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='admin_pass')
                            ALTER TABLE dbo.AGENT_MULTITASK_ENDPOINTS ADD admin_pass NVARCHAR(255) NULL;
                    END

                    IF OBJECT_ID('dbo.AGENT_MULTITASK_CONFIG', 'U') IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_CONFIG' AND COLUMN_NAME='server_url')
                            ALTER TABLE dbo.AGENT_MULTITASK_CONFIG ADD server_url NVARCHAR(255) NULL DEFAULT ('http://172.16.8.25:8000');
                    END
                """))
                _c.commit()
            except Exception as _ex_ep:
                logger.warning("Lỗi tự động kiểm tra cột AGENT_MULTITASK_ENDPOINTS/CONFIG: %s", _ex_ep)

            # Đảm bảo quyền agent_multitask tồn tại trong PHANQUYEN_DETAIL
            try:
                _c.execute(text("""
                    IF OBJECT_ID('dbo.PHANQUYEN_DETAIL', 'U') IS NOT NULL
                    BEGIN
                        -- Chèn cho role Administrator (id_quyen = '1')
                        IF NOT EXISTS (SELECT 1 FROM dbo.PHANQUYEN_DETAIL WHERE id_quyen = '1' AND chucnang = 'agent_multitask')
                            INSERT INTO dbo.PHANQUYEN_DETAIL (id_quyen, chucnang, active) VALUES ('1', 'agent_multitask', 1);
                        IF NOT EXISTS (SELECT 1 FROM dbo.PHANQUYEN_DETAIL WHERE id_quyen = '1' AND chucnang = 'view_agent_multitask')
                            INSERT INTO dbo.PHANQUYEN_DETAIL (id_quyen, chucnang, active) VALUES ('1', 'view_agent_multitask', 1);
                        IF NOT EXISTS (SELECT 1 FROM dbo.PHANQUYEN_DETAIL WHERE id_quyen = '1' AND chucnang = 'update_agent_multitask')
                            INSERT INTO dbo.PHANQUYEN_DETAIL (id_quyen, chucnang, active) VALUES ('1', 'update_agent_multitask', 1);

                        -- Đảm bảo các role khác (2, 3, 4...) có dòng này (active = 0) để Super Admin có thể bật phân quyền
                        INSERT INTO dbo.PHANQUYEN_DETAIL (id_quyen, chucnang, active)
                        SELECT DISTINCT CAST(id AS NVARCHAR(50)), 'agent_multitask', 0
                        FROM dbo.LV_QUYEN
                        WHERE id <> 1
                          AND NOT EXISTS (
                              SELECT 1 FROM dbo.PHANQUYEN_DETAIL 
                              WHERE id_quyen = CAST(dbo.LV_QUYEN.id AS NVARCHAR(50)) 
                                AND chucnang = 'agent_multitask'
                          );

                        INSERT INTO dbo.PHANQUYEN_DETAIL (id_quyen, chucnang, active)
                        SELECT DISTINCT CAST(id AS NVARCHAR(50)), 'view_agent_multitask', 0
                        FROM dbo.LV_QUYEN
                        WHERE id <> 1
                          AND NOT EXISTS (
                              SELECT 1 FROM dbo.PHANQUYEN_DETAIL 
                              WHERE id_quyen = CAST(dbo.LV_QUYEN.id AS NVARCHAR(50)) 
                                AND chucnang = 'view_agent_multitask'
                          );

                        INSERT INTO dbo.PHANQUYEN_DETAIL (id_quyen, chucnang, active)
                        SELECT DISTINCT CAST(id AS NVARCHAR(50)), 'update_agent_multitask', 0
                        FROM dbo.LV_QUYEN
                        WHERE id <> 1
                          AND NOT EXISTS (
                              SELECT 1 FROM dbo.PHANQUYEN_DETAIL 
                              WHERE id_quyen = CAST(dbo.LV_QUYEN.id AS NVARCHAR(50)) 
                                AND chucnang = 'update_agent_multitask'
                          );
                    END
                """))
                _c.commit()
            except Exception as _ex_p:
                logger.warning("Lỗi tự động khởi tạo quyền agent_multitask: %s", _ex_p)

            # Đảm bảo các cột cho bảng Projects và tạo bảng MemberTasks nếu chưa có
            try:
                _c.execute(text("""
                    IF OBJECT_ID('Projects', 'U') IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Projects' AND COLUMN_NAME='Description')
                            ALTER TABLE Projects ADD Description NVARCHAR(MAX) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Projects' AND COLUMN_NAME='Images')
                            ALTER TABLE Projects ADD Images NVARCHAR(MAX) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Projects' AND COLUMN_NAME='Files')
                            ALTER TABLE Projects ADD Files NVARCHAR(MAX) NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Projects' AND COLUMN_NAME='DescriptionUpdatedAt')
                            ALTER TABLE Projects ADD DescriptionUpdatedAt DATETIME NULL;
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Projects' AND COLUMN_NAME='DescriptionUpdatedBy')
                            ALTER TABLE Projects ADD DescriptionUpdatedBy NVARCHAR(100) NULL;
                    END
                    IF OBJECT_ID('MemberTasks', 'U') IS NULL
                    BEGIN
                        CREATE TABLE MemberTasks (
                            TaskID INT IDENTITY(1,1) PRIMARY KEY,
                            MemberID INT NOT NULL,
                            TaskName NVARCHAR(255) NOT NULL,
                            Done BIT NOT NULL DEFAULT 0,
                            CompletedAt DATETIME NULL,
                            LastChangedBy NVARCHAR(100) NULL,
                            LastChangedAt DATETIME NULL,
                            Attachment NVARCHAR(500) NULL,
                            ReviewStatus NVARCHAR(20) NULL,
                            ReviewNote NVARCHAR(500) NULL,
                            ReviewedBy NVARCHAR(100) NULL,
                            ReviewedAt DATETIME NULL
                        );
                    END
                """))
                _c.commit()
            except Exception:
                pass

            # Tự động di chuyển nội dung Mail từ huong_dan sang noidung_mail cho các bản ghi cũ nếu còn sót
            try:
                _c.execute(text("""
                    UPDATE MEMO
                    SET noidung_mail = huong_dan,
                        huong_dan = NULL
                    WHERE huong_dan LIKE '%Yêu cầu tạo nút RK từ Salesforce Loyalty:%'
                      AND (noidung_mail IS NULL OR noidung_mail = '')
                      AND huong_dan NOT LIKE '%<img%'
                      AND huong_dan NOT LIKE '%![%'
                """))
                _c.commit()
            except Exception:
                pass
        logger.info("Kiểm tra bảng OVERNIGHT_DEVICES_LOG, USER_SSO_CONFIG & cột noidung_mail MEMO & Projects: OK")
    except Exception as e:
        logger.warning("Không thể tự động tạo bảng / kiểm tra cột: %s", e)

    # Khởi chạy tiến trình nền quét PIM tự động và tác vụ Job Scheduler theo lịch
    stop_event = asyncio.Event()
    pim_task = asyncio.create_task(pim_schedule_worker(stop_event))
    job_task = asyncio.create_task(job_schedule_worker(stop_event))
    param_task = asyncio.create_task(param_schedule_worker(stop_event))

    # Tự động khởi động tiến trình quét cuộc gọi 3CX Windows Desktop
    try:
        from app.services import hotline_3cx_service
        hotline_3cx_service.start_scanner()
        logger.info("Khởi động 3CX Scanner trên Windows Desktop thành công tại startup.")
    except Exception as e_hotline:
        logger.debug("Không thể tự động chạy 3CX scanner tại startup: %s", e_hotline)
    
    yield
    
    logger.info("Đang tắt ứng dụng...")
    stop_event.set()
    try:
        from app.services import hotline_3cx_service
        hotline_3cx_service.stop_scanner()
    except Exception:
        pass
    try:
        await asyncio.wait_for(asyncio.gather(pim_task, job_task, param_task, return_exceptions=True), timeout=5.0)
    except Exception:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    description="Hệ thống Quản lý Dự án & Thông tin IT - API Backend (FastAPI + SQL Server)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = str(err["loc"][-1]) if err.get("loc") else "Dữ liệu"
        msg = str(err.get("msg", ""))
        # Bỏ qua tiền tố "Value error, " nếu có từ Pydantic
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        errors.append(f"{msg}")
    detail_str = "; ".join(errors) if errors else "Dữ liệu gửi lên không hợp lệ."
    return JSONResponse(
        status_code=422,
        content={"detail": detail_str}
    )

# Include API v1 routers
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

# Mount uploads static folder
uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../uploads"))
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/api/health", tags=["Health"])
def health_check():
    """Kiểm tra tình trạng hoạt động của API và Database"""
    db_status = test_db_connection()
    return {
        "status": "healthy" if db_status else "degraded",
        "app_name": settings.APP_NAME,
        "database": {
            "server": settings.DB_SERVER,
            "port": settings.DB_PORT,
            "name": settings.DB_NAME,
            "user": settings.DB_USER or "itapp",
            "connected": db_status
        }

    }



@app.get("/", tags=["Health"])
def root():
    return {
        "message": f"Chào mừng tới {settings.APP_NAME}",
        "docs": "/docs",
        "redoc": "/redoc",
        "version": "1.0.0"
    }
