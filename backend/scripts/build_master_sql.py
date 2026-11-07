import urllib.parse
from sqlalchemy import create_engine, text
import json

p = urllib.parse.quote_plus('DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.8.25,1433;DATABASE=ITDEPT;UID=itapp;PWD=GGGroup@123!;TrustServerCertificate=yes;')
engine = create_engine('mssql+pyodbc:///?odbc_connect=' + p)

def escape_sql_str(s):
    if s is None:
        return 'NULL'
    return "N'" + str(s).replace("'", "''") + "'"

with engine.connect() as conn:
    # 1. Fetch 83 checklist items
    chk_rows = conn.execute(text('SELECT id, NOIDUNG, GHICHU, NHOM, STT, ACTIVE FROM CHECKLIST_SETUP_NH_NEW ORDER BY id')).fetchall()
    
    # 2. Fetch 264 phanquyen_detail
    pq_rows = conn.execute(text('SELECT id, id_quyen, chucnang, active FROM PHANQUYEN_DETAIL ORDER BY id')).fetchall()
    
    # 3. Fetch 63 regions
    reg_rows = conn.execute(text('SELECT id, ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active FROM REGION ORDER BY id')).fetchall()
    
    # 4. Fetch 22 brands
    brand_rows = conn.execute(text('SELECT id, mabrand, tenbrand, active FROM BRAND ORDER BY id')).fetchall()
    
    # 5. Fetch 17 allapp_pm
    allapp_rows = conn.execute(text('SELECT id, project_name, pm_project, active FROM ALLAPP_PM ORDER BY id')).fetchall()
    
    # 6. Fetch memo_template_config
    memo_cfg_rows = conn.execute(text('SELECT id, config_key, config_val FROM MEMO_TEMPLATE_CONFIG ORDER BY id')).fetchall()
    
    # 7. Fetch memo_template_brands
    memo_brand_rows = conn.execute(text('SELECT id, brand_name, cc_emails, active FROM MEMO_TEMPLATE_BRANDS ORDER BY id')).fetchall()

print(f'Fetched: {len(chk_rows)} checklists, {len(pq_rows)} phanquyen, {len(reg_rows)} regions, {len(brand_rows)} brands, {len(allapp_rows)} allapp, {len(memo_cfg_rows)} memo_cfg, {len(memo_brand_rows)} memo_brands')

out = []

out.append("""-- =========================================================================================
-- SCRIPT KHOI TAO TOAN BO DATABASE MOI (MASTER DATABASE INITIALIZATION)
-- He thong: Quan Ly Du An & Van Hanh IT Golden Gate
-- Co so du lieu: Microsoft SQL Server (Database ITDEPT)
-- Tong so bang: 53 Bang (Toan bo 100% cac phan he)
--
-- HUONG DAN SU DUNG:
--  1. Tao database moi tu dau (Fresh Install):
--     Chi can chay duy nhat file SQL nay mot lan (F5 trong SSMS / Azure Data Studio / sqlcmd).
--     Script se tu dong tao Database ITDEPT, tao day du tat ca cac bang, va chen toan bo du lieu mac dinh:
--       + 9 Nhom quyen he thong (LV_QUYEN)
--       + 264 Ma tran phan quyen chi tiet (PHANQUYEN_DETAIL)
--       + 83 Hang muc checklist setup nha hang chuan GGG (CHECKLIST_SETUP_NH_NEW)
--       + 22+ Thuong hieu he thong (BRAND, bao gom ca The Coffee House)
--       + 63 Tinh thanh / khu vuc (REGION)
--       + 5 Phien ban phan mem he thong (SOFTWARE_VERSIONS: KDS, CO, SO, GPOS...)
--       + 5 Nhan su PIM & Cau hinh lich chay PIM (PIM_USER_THUCHIEN, PIM_CONFIG, PIM_SCHEDULE)
--       + 45 Danh muc email nhan memo theo thuong hieu (MEMO_TEMPLATE_BRANDS & CONFIG)
--       + 17 Dau moi phan mem ung dung (ALLAPP_PM)
--       + Tai khoan quan tri mac dinh (dung.nguyenanh, admin, app - pass: 123456)
--
--  2. Chay tren database da co (Migration / Upgrade):
--     Script hoan toan AN TOAN (Idempotent): khong xoa bang, khong xoa cot, khong mat du lieu cu.
--     Script tu dong kiem tra bo sung cac cot moi neu chua co (vi du: cot BRAND trong LIST_SETUP_NH_NEW).
-- =========================================================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'ITDEPT')
BEGIN
    CREATE DATABASE ITDEPT;
    PRINT N'[OK] Da tao Database ITDEPT thanh cong';
END
GO

USE ITDEPT;
GO

SET NOCOUNT ON;
PRINT N'====================================================================';
PRINT N'>>> BAT DAU KHOI TAO TOAN BO DATABASE ITDEPT...';
PRINT N'====================================================================';
GO
""")

# Load existing DDL from init_full_database.sql up to line 980
with open('backend/scripts/init_full_database.sql', 'r', encoding='utf-8') as f:
    orig_lines = f.readlines()

# Extract from line 27 (BANG: REGION) to line 980 (before PHAN SEED DATA)
ddl_chunk = "".join(orig_lines[26:979])

# Fix any VARCHAR in DDL to NVARCHAR
ddl_chunk = ddl_chunk.replace("ma_tinhthanh VARCHAR(100)", "ma_tinhthanh NVARCHAR(100)")
ddl_chunk = ddl_chunk.replace("ten_tinhthanh VARCHAR(250)", "ten_tinhthanh NVARCHAR(250)")
ddl_chunk = ddl_chunk.replace("mabrand VARCHAR(100)", "mabrand NVARCHAR(100)")
ddl_chunk = ddl_chunk.replace("tenbrand VARCHAR(250)", "tenbrand NVARCHAR(250)")
ddl_chunk = ddl_chunk.replace("id_quyen VARCHAR(50)", "id_quyen NVARCHAR(50)")
ddl_chunk = ddl_chunk.replace("chucnang VARCHAR(250)", "chucnang NVARCHAR(250)")

# Ensure LIST_SETUP_NH_NEW has BRAND column in its CREATE TABLE
if "BRAND NVARCHAR(50)" not in ddl_chunk and "BRAND VARCHAR(50)" not in ddl_chunk:
    ddl_chunk = ddl_chunk.replace(
        "TRANGTHAI NVARCHAR(250) NULL,",
        "TRANGTHAI NVARCHAR(250) NULL,\n\tBRAND NVARCHAR(50) NULL DEFAULT 'GGG',"
    )

# Ensure PIM has gui_mail
if "gui_mail BIT" not in ddl_chunk:
    ddl_chunk = ddl_chunk.replace(
        "TRANGTHAI NVARCHAR(100) NULL,",
        "TRANGTHAI NVARCHAR(100) NULL,\n\tgui_mail BIT NULL DEFAULT 0,"
    )

out.append(ddl_chunk)

# Add extra tables: ALLAPP_PM, lich_truc, NOTE_THEM, CHUANHOA_IN, BAOCAO_DANHGIA_SNAPSHOT, TAILIEU
out.append("""
-- -----------------------------------------------------------------------------------------
-- BANG: ALLAPP_PM
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.ALLAPP_PM', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[ALLAPP_PM] (
	id INTEGER NOT NULL IDENTITY,
	project_name NVARCHAR(250) NULL,
	pm_project NVARCHAR(MAX) NULL,
	ngay_trienkhai DATETIME NULL,
	ngay_update DATETIME NULL,
	note_them NVARCHAR(MAX) NULL,
	active BIT NULL,
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang ALLAPP_PM thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: lich_truc
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.lich_truc', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[lich_truc] (
	id INTEGER NOT NULL IDENTITY,
	ngay DATE NOT NULL,
	is_holiday BIT NULL,
	hotline_1 NVARCHAR(100) NULL,
	hotline_2 NVARCHAR(100) NULL,
	mail_sang_1 NVARCHAR(100) NULL,
	mail_sang_2 NVARCHAR(100) NULL,
	mail_chieu_1 NVARCHAR(100) NULL,
	mail_chieu_2 NVARCHAR(100) NULL,
	toi_chinh NVARCHAR(100) NULL,
	toi_phu NVARCHAR(100) NULL,
	weekend_ca1_chinh NVARCHAR(100) NULL,
	weekend_ca1_phu NVARCHAR(100) NULL,
	weekend_ca2_chinh NVARCHAR(100) NULL,
	weekend_ca2_phu NVARCHAR(100) NULL,
	created_at DATETIME NULL,
	updated_at DATETIME NULL,
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang lich_truc thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: NOTE_THEM
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.NOTE_THEM', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[NOTE_THEM] (
	id INTEGER NOT NULL IDENTITY,
	lien_quan NVARCHAR(MAX) NULL,
	noidung NVARCHAR(MAX) NULL,
	trangthai NVARCHAR(10) NULL,
	active BIT NULL,
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang NOTE_THEM thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHUANHOA_IN
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHUANHOA_IN', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[CHUANHOA_IN] (
	id INTEGER NOT NULL IDENTITY,
	brand NVARCHAR(250) NULL,
	PRINT_NAME NVARCHAR(250) NULL,
	IP_PRINT NVARCHAR(250) NULL,
	TRANGTHAI NVARCHAR(250) NULL,
	KDS_NAME NVARCHAR(250) NULL,
	IP_KDS NVARCHAR(250) NULL,
	ACTIVE BIT NULL,
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang CHUANHOA_IN thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: TAILIEU
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.TAILIEU', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[TAILIEU] (
	id INTEGER NOT NULL IDENTITY,
	tieu_de NVARCHAR(255) NULL,
	mo_ta NVARCHAR(MAX) NULL,
	files NVARCHAR(MAX) NULL,
	danh_muc NVARCHAR(100) NULL,
	user_insert NVARCHAR(100) NULL,
	date_insert DATETIME NULL,
	active BIT NULL,
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang TAILIEU thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: BAOCAO_DANHGIA_SNAPSHOT
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.BAOCAO_DANHGIA_SNAPSHOT', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[BAOCAO_DANHGIA_SNAPSHOT] (
	id INTEGER NOT NULL IDENTITY,
	thang INT NOT NULL,
	nam INT NOT NULL,
	loai_nhan_su NVARCHAR(50) NULL,
	snapshot_data NVARCHAR(MAX) NULL,
	created_at DATETIME NULL,
	updated_at DATETIME NULL,
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang BAOCAO_DANHGIA_SNAPSHOT thanh cong';
END
GO

-- =========================================================================================
-- PHAN KIEM TRA & MIGRATION AN TOAN CHO DATABASE HIEN HUU (BO SUNG COT MOI NEU CHUA CO)
-- =========================================================================================

-- Kiem tra cot BRAND trong LIST_SETUP_NH_NEW
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'BRAND')
    BEGIN
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD BRAND NVARCHAR(50) NULL DEFAULT 'GGG';
        EXEC('UPDATE dbo.LIST_SETUP_NH_NEW SET BRAND = ''GGG'' WHERE BRAND IS NULL;');
        PRINT N'[OK] Da bo sung cot BRAND vao LIST_SETUP_NH_NEW';
    END
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewStatus')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewStatus NVARCHAR(20) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewNote')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewNote NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewedBy')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewedBy NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewedAt')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewedAt DATETIME NULL;
END
GO

-- Kiem tra cot rustdesk_pos11 / rustdesk_pos12 trong RESTAURANT
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RESTAURANT' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESTAURANT' AND COLUMN_NAME = 'rustdesk_pos11')
        ALTER TABLE dbo.RESTAURANT ADD rustdesk_pos11 VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESTAURANT' AND COLUMN_NAME = 'rustdesk_pos12')
        ALTER TABLE dbo.RESTAURANT ADD rustdesk_pos12 VARCHAR(50) NULL;
END
GO

-- Kiem tra cot gui_mail trong PIM
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PIM' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PIM' AND COLUMN_NAME = 'gui_mail')
    BEGIN
        ALTER TABLE dbo.PIM ADD gui_mail BIT NULL DEFAULT 0;
        PRINT N'[OK] Da bo sung cot gui_mail vao bang PIM';
    END
END
GO

-- Kiem tra cot Review trong MEMO
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MEMO' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMO' AND COLUMN_NAME = 'ReviewStatus')
        ALTER TABLE dbo.MEMO ADD ReviewStatus NVARCHAR(20) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMO' AND COLUMN_NAME = 'ReviewNote')
        ALTER TABLE dbo.MEMO ADD ReviewNote NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMO' AND COLUMN_NAME = 'ReviewedBy')
        ALTER TABLE dbo.MEMO ADD ReviewedBy NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMO' AND COLUMN_NAME = 'ReviewedAt')
        ALTER TABLE dbo.MEMO ADD ReviewedAt DATETIME NULL;
END
GO
""")

out.append("""
-- =========================================================================================
-- PHAN SEED DATA: TOAN BO DU LIEU MAU KHOI TAO MAC DINH
-- =========================================================================================

-- 1. Nhom Quyen Mac Dinh (LV_QUYEN)
IF NOT EXISTS (SELECT * FROM dbo.LV_QUYEN WHERE id = 1)
BEGIN
    SET IDENTITY_INSERT dbo.LV_QUYEN ON;
    INSERT INTO dbo.LV_QUYEN (id, tenquyen, noidung, capbac, ghichu, active) VALUES
    (1, N'Administrator', N'Full Quyền Toàn Hệ Thống', '1', 'Administrator', 1),
    (2, N'IT Application', N'Quyền Đặc Thù IT APP', '2', 'IT Application', 1),
    (3, N'IT Helpdesk', N'Quyền Đặc Thù IT Helpdesk', '3', 'IT Helpdesk', 1),
    (4, N'HELPDESK_DEFAULT', N'Quyền mặc định IT helpdesk', NULL, NULL, 1),
    (5, N'HELPDESK_LEADER', N'Bao gồm quyền Mặc định và PASS Mail', NULL, NULL, 1),
    (6, N'ADMIN_IT', N'Quyền đặc thù của admin IT', NULL, NULL, 1),
    (7, N'APP_DEFAULT', N'Quyền đặc thù của IT APP', NULL, NULL, 1),
    (8, N'HELPDESK_CODE_PHONE_IN', N'Quyền add code máy in + ext văn phòng', NULL, NULL, 1),
    (9, N'HELPDESK_WAN_VNPT', N'Quyền cập nhật wan, thông tin internet', NULL, NULL, 1);
    SET IDENTITY_INSERT dbo.LV_QUYEN OFF;
    PRINT N'[OK] Da chen du lieu nhom quyen LV_QUYEN';
END
GO

-- 2. Tai khoan Admin Mac Dinh (LIST_USER)
IF NOT EXISTS (SELECT * FROM dbo.LIST_USER WHERE user_name1 = 'dung.nguyenanh')
BEGIN
    INSERT INTO dbo.LIST_USER (user_name1, pass, full_name, email, phanquyen, active) VALUES
    ('dung.nguyenanh', '123456', N'Nguyễn Anh Dũng', 'dung.nguyenanh@ggg.com.vn', '1', 1),
    ('admin', '123456', N'Quản trị viên IT', 'it.admin@ggg.com.vn', '1', 1),
    ('app', '123456', N'IT Application', 'it.app@ggg.com.vn', '2', 1);
    PRINT N'[OK] Da tao cac tai khoan Admin mac dinh trong LIST_USER';
END
GO

-- 3. Phien ban phan mem he thong (SOFTWARE_VERSIONS)
IF NOT EXISTS (SELECT * FROM dbo.SOFTWARE_VERSIONS)
BEGIN
    INSERT INTO dbo.SOFTWARE_VERSIONS (phan_mem, phien_ban, ngay_update, noi_dung_update, nguoi_update, active) VALUES
    (N'KDS', N'v2.4.0', GETDATE(), N'Hiển thị đơn gọi món nhà bếp thời gian thực', N'Admin', 1),
    (N'CO', N'v1.8.2', GETDATE(), N'Central Order đồng bộ thực đơn chuỗi', N'Admin', 1),
    (N'SO', N'v1.6.5', GETDATE(), N'Smart Order gọi món tại bàn và tích điểm', N'Admin', 1),
    (N'GPOS-CO-SO', N'v3.1.0', GETDATE(), N'Liên thông tích hợp GPOS, CO và SO', N'Admin', 1),
    (N'GPOS-KDS', N'v2.5.1', GETDATE(), N'Đồng bộ chế biến bếp giữa GPOS và KDS', N'Admin', 1);
    PRINT N'[OK] Da chen du lieu SOFTWARE_VERSIONS';
END
GO

-- 4. Nhan su xu ly PIM (PIM_USER_THUCHIEN)
IF NOT EXISTS (SELECT * FROM dbo.PIM_USER_THUCHIEN)
BEGIN
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active) VALUES
    (N'Quyên', N'Tô Thị Quyên', 'quyen.tt@ggg.com.vn', 1, 1),
    (N'Hùng', N'Phạm Trần Mạnh Hùng', 'hung.phamtran@ggg.com.vn', 2, 1),
    (N'Duy', N'Ngô Nhựt Duy', 'duy.ngo@ggg.com.vn', 3, 1),
    (N'Thức', N'Nguyễn Thức', 'thuc.nguyen@ggg.com.vn', 4, 1),
    (N'Trầm', N'Nguyễn Vi Trầm', 'tram.nv@ggg.com.vn', 5, 1);
    PRINT N'[OK] Da chen du lieu PIM_USER_THUCHIEN';
END
GO

-- 5. Cau hinh PIM & Lich Chay (PIM_CONFIG & PIM_SCHEDULE)
IF NOT EXISTS (SELECT * FROM dbo.PIM_CONFIG)
BEGIN
    INSERT INTO dbo.PIM_CONFIG (sso_username, sso_password, user_cap_nhat) VALUES
    ('dung.nguyenanh@ggg.com.vn', 'Nguyetthu28071995@@', 'system');
    PRINT N'[OK] Da chen cau hinh PIM_CONFIG';
END
GO

IF NOT EXISTS (SELECT * FROM dbo.PIM_SCHEDULE)
BEGIN
    INSERT INTO dbo.PIM_SCHEDULE (time_1, time_2, time_3, is_active, user_cap_nhat) VALUES
    ('03:00', '12:00', '16:30', 1, 'system');
    PRINT N'[OK] Da chen lich chay PIM_SCHEDULE';
END
GO
""")

# 6. Seed PHANQUYEN_DETAIL (264 rows)
out.append("""-- 6. Chi tiet phan quyen chuc nang (PHANQUYEN_DETAIL: 264 ban ghi)
IF NOT EXISTS (SELECT * FROM dbo.PHANQUYEN_DETAIL)
BEGIN
    SET IDENTITY_INSERT dbo.PHANQUYEN_DETAIL ON;
""")
pq_chunks = []
for r in pq_rows:
    pq_chunks.append(f"    ({r.id}, {escape_sql_str(r.id_quyen)}, {escape_sql_str(r.chucnang)}, {1 if r.active else 0})")

batch_size = 80
for i in range(0, len(pq_chunks), batch_size):
    batch = pq_chunks[i:i+batch_size]
    out.append("    INSERT INTO dbo.PHANQUYEN_DETAIL (id, id_quyen, chucnang, active) VALUES\n" + ",\n".join(batch) + ";\n")

out.append("""    SET IDENTITY_INSERT dbo.PHANQUYEN_DETAIL OFF;
    PRINT N'[OK] Da chen 264 ban ghi PHANQUYEN_DETAIL thanh cong';
END
GO
""")

# 7. Seed CHECKLIST_SETUP_NH_NEW (83 master checklist items)
out.append("""-- 7. Danh muc 83 Hang muc Checklist Setup Nha Hang Chuan GGG (CHECKLIST_SETUP_NH_NEW)
IF NOT EXISTS (SELECT * FROM dbo.CHECKLIST_SETUP_NH_NEW)
BEGIN
    SET IDENTITY_INSERT dbo.CHECKLIST_SETUP_NH_NEW ON;
""")
chk_chunks = []
for r in chk_rows:
    chk_chunks.append(f"    ({r.id}, {escape_sql_str(r.NOIDUNG)}, {escape_sql_str(r.GHICHU)}, {escape_sql_str(r.NHOM)}, {r.STT or 'NULL'}, {1 if r.ACTIVE else 0})")

for i in range(0, len(chk_chunks), batch_size):
    batch = chk_chunks[i:i+batch_size]
    out.append("    INSERT INTO dbo.CHECKLIST_SETUP_NH_NEW (id, NOIDUNG, GHICHU, NHOM, STT, ACTIVE) VALUES\n" + ",\n".join(batch) + ";\n")

out.append("""    SET IDENTITY_INSERT dbo.CHECKLIST_SETUP_NH_NEW OFF;
    PRINT N'[OK] Da chen 83 hang muc CHECKLIST_SETUP_NH_NEW thanh cong';
END
GO
""")

# 8. Seed BRAND (22 brands + The Coffee House)
out.append("""-- 8. Danh muc Thuong Hieu (BRAND)
IF NOT EXISTS (SELECT * FROM dbo.BRAND WHERE mabrand = 'gogi')
BEGIN
    SET IDENTITY_INSERT dbo.BRAND ON;
""")
brand_chunks = []
has_tch = False
for r in brand_rows:
    mab = (r.mabrand or '').strip()
    tenb = (r.tenbrand or '').strip()
    if 'coffee' in mab.lower() or 'coffee' in tenb.lower():
        has_tch = True
    brand_chunks.append(f"    ({r.id}, {escape_sql_str(mab)}, {escape_sql_str(tenb)}, GETDATE(), 'system', {1 if r.active else 0})")

if not has_tch:
    brand_chunks.append(f"    (99, N'thecoffeehouse', N'The Coffee House', GETDATE(), 'system', 1)")

out.append("    INSERT INTO dbo.BRAND (id, mabrand, tenbrand, ngay_insert, user_them, active) VALUES\n" + ",\n".join(brand_chunks) + ";\n")
out.append("""    SET IDENTITY_INSERT dbo.BRAND OFF;
    PRINT N'[OK] Da chen danh muc BRAND thanh cong';
END
GO
""")

# 9. Seed REGION (63 regions)
out.append("""-- 9. Danh muc 63 Tinh Thanh / Khu Vuc (REGION)
IF NOT EXISTS (SELECT * FROM dbo.REGION)
BEGIN
    SET IDENTITY_INSERT dbo.REGION ON;
""")
reg_chunks = []
for r in reg_rows:
    reg_chunks.append(f"    ({r.id}, {escape_sql_str(r.ma_tinhthanh)}, {escape_sql_str(r.ten_tinhthanh)}, {escape_sql_str(r.bienso)}, {escape_sql_str(r.timkiem)}, {1 if r.active else 0})")

for i in range(0, len(reg_chunks), batch_size):
    batch = reg_chunks[i:i+batch_size]
    out.append("    INSERT INTO dbo.REGION (id, ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active) VALUES\n" + ",\n".join(batch) + ";\n")

out.append("""    SET IDENTITY_INSERT dbo.REGION OFF;
    PRINT N'[OK] Da chen 63 tinh thanh REGION thanh cong';
END
GO
""")

# 10. Seed ALLAPP_PM (17 rows)
out.append("""-- 10. Danh muc Dau Moi Phan Mem Ung Dung (ALLAPP_PM)
IF NOT EXISTS (SELECT * FROM dbo.ALLAPP_PM)
BEGIN
    SET IDENTITY_INSERT dbo.ALLAPP_PM ON;
""")
allapp_chunks = []
for r in allapp_rows:
    allapp_chunks.append(f"    ({r.id}, {escape_sql_str(r.project_name)}, {escape_sql_str(r.pm_project)}, {1 if r.active else 0})")

out.append("    INSERT INTO dbo.ALLAPP_PM (id, project_name, pm_project, active) VALUES\n" + ",\n".join(allapp_chunks) + ";\n")
out.append("""    SET IDENTITY_INSERT dbo.ALLAPP_PM OFF;
    PRINT N'[OK] Da chen 17 ung dung ALLAPP_PM thanh cong';
END
GO
""")

# 11. Seed MEMO_TEMPLATE_CONFIG & MEMO_TEMPLATE_BRANDS
out.append("""-- 11. Mau Memo & Danh Sach Nhan Memo Theo Thuong Hieu (MEMO_TEMPLATE_CONFIG & MEMO_TEMPLATE_BRANDS)
IF NOT EXISTS (SELECT * FROM dbo.MEMO_TEMPLATE_CONFIG)
BEGIN
    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_CONFIG ON;
""")
memo_cfg_chunks = []
for r in memo_cfg_rows:
    memo_cfg_chunks.append(f"    ({r.id}, {escape_sql_str(r.config_key)}, {escape_sql_str(r.config_val)})")

out.append("    INSERT INTO dbo.MEMO_TEMPLATE_CONFIG (id, config_key, config_val) VALUES\n" + ",\n".join(memo_cfg_chunks) + ";\n")
out.append("""    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_CONFIG OFF;
    PRINT N'[OK] Da chen cau hinh MEMO_TEMPLATE_CONFIG thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM dbo.MEMO_TEMPLATE_BRANDS)
BEGIN
    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_BRANDS ON;
""")
memo_b_chunks = []
for r in memo_brand_rows:
    memo_b_chunks.append(f"    ({r.id}, {escape_sql_str(r.brand_name)}, {escape_sql_str(r.cc_emails)}, {1 if r.active else 0})")

for i in range(0, len(memo_b_chunks), batch_size):
    batch = memo_b_chunks[i:i+batch_size]
    out.append("    INSERT INTO dbo.MEMO_TEMPLATE_BRANDS (id, brand_name, cc_emails, active) VALUES\n" + ",\n".join(batch) + ";\n")

out.append("""    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_BRANDS OFF;
    PRINT N'[OK] Da chen danh sach MEMO_TEMPLATE_BRANDS thanh cong';
END
GO
""")

out.append("""PRINT N'====================================================================';
PRINT N'>>> HOAN TAT TOAN BO KHOI TAO VA SEED DU LIEU DATABASE ITDEPT!';
PRINT N'====================================================================';
""")

full_sql = "".join(out)
output_path = 'backend/scripts/init_full_database.sql'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(full_sql)

print(f'Successfully generated master SQL script to {output_path}! File size: {len(full_sql)} characters, {len(full_sql.encode("utf-8"))} bytes')
