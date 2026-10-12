-- =========================================================================================
-- SCRIPT MIGRATION TONG HOP: TRIEN KHAI HE THONG LEN SERVER (HOAN TOAN AN TOAN)
-- He thong: Quan Ly Du An & Van Hanh IT Golden Gate
-- Co so du lieu: SQL Server (Database ITDEPT)
-- Dac diem:
--  - Bao toan 100% du lieu cu (KHONG DROP TABLE, KHONG DROP COLUMN).
--  - Co the chay nhieu lan khong bi loi (Moi lenh deu boc trong IF NOT EXISTS).
--  - Day du moi bang moi va moi cot can thiet cho toan bo cac tinh nang cua he thong.
-- =========================================================================================

USE ITDEPT;
GO

SET NOCOUNT ON;
PRINT N'====================================================================';
PRINT N'>>> BAT DAU KIEM TRA VA CAP NHAT DATABASE ITDEPT...';
PRINT N'====================================================================';
GO

-- -----------------------------------------------------------------------------------------
-- PHAN 1: KIEM TRA VA BO SUNG COT CHO CAC BANG HIEN HUU (RESTORE TU DB CU)
-- -----------------------------------------------------------------------------------------

-- 1.1 BANG RESTAURANT: Kiem tra cac cot ho tro VNC / Rustdesk va cot an toan
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RESTAURANT' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESTAURANT' AND COLUMN_NAME = 'rustdesk_pos11')
        ALTER TABLE dbo.RESTAURANT ADD rustdesk_pos11 VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESTAURANT' AND COLUMN_NAME = 'rustdesk_pos12')
        ALTER TABLE dbo.RESTAURANT ADD rustdesk_pos12 VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RESTAURANT' AND COLUMN_NAME = 'test')
        ALTER TABLE dbo.RESTAURANT ADD test NVARCHAR(255) NULL;
    PRINT N'[OK] Da kiem tra va bo sung cot cho bang RESTAURANT';
END
GO

-- 1.2 BANG LIST_SETUP_NH_NEW: Bo sung cot Duyet (ReviewStatus, ReviewNote, ReviewedBy, ReviewedAt)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewStatus')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewStatus NVARCHAR(20) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewNote')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewNote NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewedBy')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewedBy NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_SETUP_NH_NEW' AND COLUMN_NAME = 'ReviewedAt')
        ALTER TABLE dbo.LIST_SETUP_NH_NEW ADD ReviewedAt DATETIME NULL;
    PRINT N'[OK] Da kiem tra va bo sung cot Review cho bang LIST_SETUP_NH_NEW';
END
GO

-- 1.3 BANG GHINHAN_SUVU: Bo sung cac cot quan ly su vu mo rong, dinh kem, phan cong
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'GHINHAN_SUVU' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'IS_PRIVATE')
        ALTER TABLE dbo.GHINHAN_SUVU ADD IS_PRIVATE BIT DEFAULT 0 WITH VALUES;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'RESTAURANT_ID')
        ALTER TABLE dbo.GHINHAN_SUVU ADD RESTAURANT_ID INT NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'RESTAURANT_NAME')
        ALTER TABLE dbo.GHINHAN_SUVU ADD RESTAURANT_NAME NVARCHAR(500) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'SAP_CODE')
        ALTER TABLE dbo.GHINHAN_SUVU ADD SAP_CODE VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'RK7_CODE')
        ALTER TABLE dbo.GHINHAN_SUVU ADD RK7_CODE VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'IP_ADDRESS')
        ALTER TABLE dbo.GHINHAN_SUVU ADD IP_ADDRESS VARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'ASSIGN_TYPE')
        ALTER TABLE dbo.GHINHAN_SUVU ADD ASSIGN_TYPE NVARCHAR(50) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'ASSIGNED_TO')
        ALTER TABLE dbo.GHINHAN_SUVU ADD ASSIGNED_TO NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'ASSIGNED_NAME')
        ALTER TABLE dbo.GHINHAN_SUVU ADD ASSIGNED_NAME NVARCHAR(200) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'PROGRESS_NOTES')
        ALTER TABLE dbo.GHINHAN_SUVU ADD PROGRESS_NOTES NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'IMAGES')
        ALTER TABLE dbo.GHINHAN_SUVU ADD IMAGES NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'FILES')
        ALTER TABLE dbo.GHINHAN_SUVU ADD FILES NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'RESOLVED_AT')
        ALTER TABLE dbo.GHINHAN_SUVU ADD RESOLVED_AT DATETIME NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'RESOLVED_BY')
        ALTER TABLE dbo.GHINHAN_SUVU ADD RESOLVED_BY NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'DATE_UPDATE')
        ALTER TABLE dbo.GHINHAN_SUVU ADD DATE_UPDATE DATETIME NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SUVU' AND COLUMN_NAME = 'USER_UPDATE')
        ALTER TABLE dbo.GHINHAN_SUVU ADD USER_UPDATE NVARCHAR(100) NULL;
    PRINT N'[OK] Da kiem tra va bo sung cac cot cho bang GHINHAN_SUVU';
END
GO

-- 1.4 BANG MEMO: Bo sung cot Duyet
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
    PRINT N'[OK] Da kiem tra va bo sung cot Review cho bang MEMO';
END
GO

-- 1.5 BANG GHINHAN_SAIPHAM: Bo sung cot LOAI_SAIPHAM, HO_TEN, IMAGES, FILES, DATE_UPDATE, USER_UPDATE
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND COLUMN_NAME = 'LOAI_SAIPHAM')
        ALTER TABLE dbo.GHINHAN_SAIPHAM ADD LOAI_SAIPHAM NVARCHAR(100) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND COLUMN_NAME = 'HO_TEN')
        ALTER TABLE dbo.GHINHAN_SAIPHAM ADD HO_TEN NVARCHAR(150) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND COLUMN_NAME = 'IMAGES')
        ALTER TABLE dbo.GHINHAN_SAIPHAM ADD IMAGES NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND COLUMN_NAME = 'FILES')
        ALTER TABLE dbo.GHINHAN_SAIPHAM ADD FILES NVARCHAR(MAX) NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND COLUMN_NAME = 'DATE_UPDATE')
        ALTER TABLE dbo.GHINHAN_SAIPHAM ADD DATE_UPDATE DATETIME NULL;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'GHINHAN_SAIPHAM' AND COLUMN_NAME = 'USER_UPDATE')
        ALTER TABLE dbo.GHINHAN_SAIPHAM ADD USER_UPDATE NVARCHAR(150) NULL;
    PRINT N'[OK] Da kiem tra va bo sung cac cot cho bang GHINHAN_SAIPHAM';
END
GO

-- 1.6 BANG LIST_USER: Bo sung cot quyen_mo_rong
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'LIST_USER' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LIST_USER' AND COLUMN_NAME = 'quyen_mo_rong')
        ALTER TABLE dbo.LIST_USER ADD quyen_mo_rong NVARCHAR(100) NULL;
    PRINT N'[OK] Da kiem tra cot quyen_mo_rong bang LIST_USER';
END
GO

-- 1.7 BANG CHECKLIST_TEMPLATE & CHECKLIST_RUN: Bo sung cot sla_days, han_chot_sla neu bang da ton tai truoc do
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CHECKLIST_TEMPLATE' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CHECKLIST_TEMPLATE' AND COLUMN_NAME = 'sla_days')
        ALTER TABLE dbo.CHECKLIST_TEMPLATE ADD sla_days INT DEFAULT 3 WITH VALUES;
END
GO

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CHECKLIST_RUN' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CHECKLIST_RUN' AND COLUMN_NAME = 'sla_days')
        ALTER TABLE dbo.CHECKLIST_RUN ADD sla_days INT DEFAULT 3 WITH VALUES;
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CHECKLIST_RUN' AND COLUMN_NAME = 'han_chot_sla')
        ALTER TABLE dbo.CHECKLIST_RUN ADD han_chot_sla DATETIME NULL;
END
GO


-- -----------------------------------------------------------------------------------------
-- PHAN 2: TAO BANG CHO CAC PHAN HE CO SO (NEU CHUA CO TRONG DB CU)
-- -----------------------------------------------------------------------------------------

-- 2.1 BANG PIM (Quan ly yeu cau PIM & gui mail)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PIM')
BEGIN
    CREATE TABLE dbo.PIM (
        id INT IDENTITY(1,1) PRIMARY KEY,
        id_yeu_cau NVARCHAR(50) NOT NULL UNIQUE,
        chuoi NVARCHAR(150) NULL,
        ten_menu NVARCHAR(250) NULL,
        mo_ta NVARCHAR(MAX) NULL,
        thoi_gian_thuc_hien DATETIME NULL,
        link_yeu_cau NVARCHAR(500) NULL,
        ngay_insert DATETIME DEFAULT GETDATE(),
        trang_thai_thuc_hien NVARCHAR(50) DEFAULT N'chưa hoàn thành',
        user_thuc_hien NVARCHAR(100) NULL,
        user_hoan_thanh NVARCHAR(100) NULL,
        user_update NVARCHAR(100) NULL,
        thoi_gian_hoan_thanh DATETIME NULL,
        thoi_gian_update DATETIME NULL,
        so NVARCHAR(50) DEFAULT N'chưa hoàn thành',
        gui_mail NVARCHAR(50) DEFAULT N'chưa hoàn thành'
    );
    CREATE INDEX IX_PIM_id_yeu_cau ON dbo.PIM (id_yeu_cau);
    PRINT N'[OK] Tao bang PIM thanh cong';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PIM' AND COLUMN_NAME = 'gui_mail')
    BEGIN
        ALTER TABLE dbo.PIM ADD gui_mail NVARCHAR(50) DEFAULT N'chưa hoàn thành' WITH VALUES;
        PRINT N'[OK] Da bo sung cot gui_mail vao bang PIM';
    END
END
GO

-- 2.2 BANG SO LIEU CHECK SALES DAILY & TOTAL SALES DAILY
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SO_LIEU_CHECK_SALES_DAILY')
BEGIN
    CREATE TABLE dbo.SO_LIEU_CHECK_SALES_DAILY (
        id INT IDENTITY(1,1) PRIMARY KEY,
        DVCS NVARCHAR(50) NULL,
        TEN_NHAHANG NVARCHAR(250) NULL,
        TONGTIEN_NH NVARCHAR(100) NULL,
        TONGTIEN_SV NVARCHAR(100) NULL,
        SL_KHACH_NH NVARCHAR(50) NULL,
        SL_KHACH_SV NVARCHAR(50) NULL,
        NGAY_SALE DATE NULL,
        ACTIVE BIT DEFAULT 1,
        NOTE NVARCHAR(250) NULL,
        TRANGTHAI NVARCHAR(50) NULL,
        IP_NHAHANG NVARCHAR(50) NULL,
        LAN1_KETNOI_NH NVARCHAR(50) NULL,
        THOIGIAN_LAY_SALE_LAN1 DATETIME NULL,
        THOIGIAN_LAY_SALE_LAN2 DATETIME NULL,
        CREATED_AT DATETIME DEFAULT GETDATE(),
        UPDATED_AT DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_SALES_NGAY ON dbo.SO_LIEU_CHECK_SALES_DAILY (NGAY_SALE);
    PRINT N'[OK] Tao bang SO_LIEU_CHECK_SALES_DAILY thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TOTAL_SALES_DAILY')
BEGIN
    CREATE TABLE dbo.TOTAL_SALES_DAILY (
        id INT IDENTITY(1,1) PRIMARY KEY,
        NGAY DATETIME NULL,
        TOTAL_SALE NVARCHAR(250) NULL,
        TOTAL_TC NVARCHAR(250) NULL,
        ACTIVE BIT DEFAULT 1,
        CREATED_AT DATETIME DEFAULT GETDATE()
    );
    PRINT N'[OK] Tao bang TOTAL_SALES_DAILY thanh cong';
END
GO

-- 2.3 BANG STAFF_EVALUATION_CONFIG (Danh sach nhan vien danh gia KPI/Thang)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'STAFF_EVALUATION_CONFIG')
BEGIN
    CREATE TABLE dbo.STAFF_EVALUATION_CONFIG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        CONFIG_KEY NVARCHAR(100) NOT NULL DEFAULT 'EVALUATED_STAFF',
        USERNAME NVARCHAR(100) NOT NULL,
        FULL_NAME NVARCHAR(200) NULL,
        IS_ACTIVE BIT DEFAULT 1,
        SORT_ORDER INT DEFAULT 0,
        UPDATED_BY NVARCHAR(100) NULL,
        UPDATED_AT DATETIME DEFAULT GETDATE()
    );
    PRINT N'[OK] Tao bang STAFF_EVALUATION_CONFIG thanh cong';
END
GO

-- 2.4 HE THONG QUAN LY DU AN IT (Projects, ProjectMembers, MemberTasks, ProjectActivityLog)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
BEGIN
    CREATE TABLE dbo.Projects (
        ProjectID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectName NVARCHAR(255) NOT NULL,
        Status VARCHAR(20) NOT NULL DEFAULT 'in-progress',
        Deadline DATE NULL,
        ProjectCode NVARCHAR(50) NULL
    );
    PRINT N'[OK] Tao bang Projects thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectMembers')
BEGIN
    CREATE TABLE dbo.ProjectMembers (
        MemberID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID INT NOT NULL FOREIGN KEY REFERENCES dbo.Projects(ProjectID) ON DELETE CASCADE,
        MemberName NVARCHAR(255) NOT NULL,
        CompletedAt DATETIME NULL,
        MemberCode NVARCHAR(50) NULL
    );
    PRINT N'[OK] Tao bang ProjectMembers thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MemberTasks')
BEGIN
    CREATE TABLE dbo.MemberTasks (
        TaskID INT IDENTITY(1,1) PRIMARY KEY,
        MemberID INT NOT NULL FOREIGN KEY REFERENCES dbo.ProjectMembers(MemberID) ON DELETE CASCADE,
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
    PRINT N'[OK] Tao bang MemberTasks thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ProjectActivityLog')
BEGIN
    CREATE TABLE dbo.ProjectActivityLog (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        ProjectID INT NOT NULL,
        MemberID INT NULL,
        TaskID INT NULL,
        ActionTime DATETIME NOT NULL DEFAULT GETDATE(),
        ActionBy NVARCHAR(100) NOT NULL,
        ActionType NVARCHAR(50) NOT NULL,
        Message NVARCHAR(500) NULL
    );
    PRINT N'[OK] Tao bang ProjectActivityLog thanh cong';
END
GO

-- 2.5 CHECKLIST SETUP NHA HANG MOI (CHECKLIST_SETUP_NH_NEW & CHECKLIST_SETUP_NH_NEW_DETAIL)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CHECKLIST_SETUP_NH_NEW')
BEGIN
    CREATE TABLE dbo.CHECKLIST_SETUP_NH_NEW (
        id INT IDENTITY(1,1) PRIMARY KEY,
        NOIDUNG NVARCHAR(MAX) NULL,
        GHICHU NVARCHAR(MAX) NULL,
        NHOM NVARCHAR(MAX) NULL,
        STT INT NULL,
        ACTIVE BIT DEFAULT 1,
        NGAY_INSERT DATETIME DEFAULT GETDATE(),
        NGAY_UPDATE DATETIME NULL
    );
    PRINT N'[OK] Tao bang CHECKLIST_SETUP_NH_NEW thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CHECKLIST_SETUP_NH_NEW_DETAIL')
BEGIN
    CREATE TABLE dbo.CHECKLIST_SETUP_NH_NEW_DETAIL (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ID_NH_NEW INT NOT NULL,
        STT INT NULL,
        NOIDUNG NVARCHAR(MAX) NULL,
        NHOM NVARCHAR(MAX) NULL,
        NGAY_INSERT DATETIME DEFAULT GETDATE(),
        GHICHU NVARCHAR(MAX) NULL,
        HOANTHANH NVARCHAR(10) NULL,
        NGAY_HOANTHANH DATETIME NULL,
        USER_HOANTHANH NVARCHAR(100) NULL,
        ACTIVE BIT DEFAULT 1
    );
    CREATE INDEX IX_DETAIL_ID_NH ON dbo.CHECKLIST_SETUP_NH_NEW_DETAIL (ID_NH_NEW);
    PRINT N'[OK] Tao bang CHECKLIST_SETUP_NH_NEW_DETAIL thanh cong';
END
GO


-- -----------------------------------------------------------------------------------------
-- PHAN 3: TAO CAC BANG TINH NANG NANG CAP MOI
-- -----------------------------------------------------------------------------------------

-- 3.1 APP_THONGBAO_LUUY (Bang Thong bao & Luu y chung toan he thong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'APP_THONGBAO_LUUY')
BEGIN
    CREATE TABLE dbo.APP_THONGBAO_LUUY (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tieu_de NVARCHAR(255) NOT NULL,
        danh_muc NVARCHAR(100) NOT NULL DEFAULT N'Lưu ý chung',
        muc_do NVARCHAR(50) NOT NULL DEFAULT N'Quan trọng',
        noi_dung NVARCHAR(MAX) NOT NULL,
        images NVARCHAR(MAX) NULL,
        files NVARCHAR(MAX) NULL,
        is_pinned BIT NOT NULL DEFAULT 0,
        nguoi_tao NVARCHAR(100) NULL,
        nguoi_update NVARCHAR(100) NULL,
        ngay_tao DATETIME DEFAULT GETDATE(),
        ngay_update DATETIME DEFAULT GETDATE(),
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang APP_THONGBAO_LUUY thanh cong';
END
GO

-- 3.2 BRAND_PRINT_STANDARDS (Tieu chuan may in & thiet bi theo Brand)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BRAND_PRINT_STANDARDS')
BEGIN
    CREATE TABLE dbo.BRAND_PRINT_STANDARDS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        brand_name NVARCHAR(100) NOT NULL,
        loai_in NVARCHAR(100) NOT NULL,
        tieu_de NVARCHAR(255) NULL,
        ghi_chu NVARCHAR(MAX) NULL,
        images NVARCHAR(MAX) NULL,
        files NVARCHAR(MAX) NULL,
        nguoi_tao NVARCHAR(100) NULL,
        nguoi_update NVARCHAR(100) NULL,
        ngay_tao DATETIME DEFAULT GETDATE(),
        ngay_update DATETIME DEFAULT GETDATE(),
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang BRAND_PRINT_STANDARDS thanh cong';
END
GO

-- 3.3 CONGVIEC_CANHAN (So tay cong viec ca nhan tung nhan vien IT)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CONGVIEC_CANHAN')
BEGIN
    CREATE TABLE dbo.CONGVIEC_CANHAN (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(100) NOT NULL,
        noi_dung NVARCHAR(MAX) NOT NULL,
        images NVARCHAR(MAX) NULL,
        files NVARCHAR(MAX) NULL,
        trang_thai NVARCHAR(50) DEFAULT 'PENDING',
        ngay_tao DATETIME DEFAULT GETDATE(),
        ngay_hoan_thanh DATETIME NULL,
        sort_order INT DEFAULT 0,
        active BIT DEFAULT 1
    );
    CREATE INDEX IX_CONGVIEC_USER ON dbo.CONGVIEC_CANHAN (username);
    PRINT N'[OK] Tao bang CONGVIEC_CANHAN thanh cong';
END
GO

-- 3.4 SOFTWARE_VERSIONS (Phien ban phan mem he thong F&B)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SOFTWARE_VERSIONS')
BEGIN
    CREATE TABLE dbo.SOFTWARE_VERSIONS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        phan_mem NVARCHAR(100) NOT NULL,
        phien_ban NVARCHAR(100) NOT NULL,
        ngay_update DATETIME NOT NULL,
        noi_dung_update NVARCHAR(MAX) NULL,
        nguoi_update NVARCHAR(100) NULL,
        active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE()
    );
    INSERT INTO dbo.SOFTWARE_VERSIONS (phan_mem, phien_ban, ngay_update, noi_dung_update, nguoi_update, active)
    VALUES 
        (N'KDS', N'v2.4.0', GETDATE(), N'Bản cập nhật hiển thị đơn gọi món nhà bếp thời gian thực', N'Admin', 1),
        (N'CO', N'v1.8.2', GETDATE(), N'Bản cập nhật Central Order đồng bộ thực đơn', N'Admin', 1),
        (N'SO', N'v1.6.5', GETDATE(), N'Bản cập nhật Smart Order thanh toán và tích điểm', N'Admin', 1),
        (N'GPOS-CO-SO', N'v3.1.0', GETDATE(), N'Bản phát hành tích hợp liên thông GPOS với CO và SO', N'Admin', 1),
        (N'GPOS-KDS', N'v2.5.1', GETDATE(), N'Bản cập nhật đồng bộ trạng thái chế biến món GPOS và KDS', N'Admin', 1);
    PRINT N'[OK] Tao bang SOFTWARE_VERSIONS thanh cong';
END
GO

-- 3.5 GHINHAN_SUCO_HETHONG (Quan ly su co ha tang mang va ung dung toan quoc)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'GHINHAN_SUCO_HETHONG')
BEGIN
    CREATE TABLE dbo.GHINHAN_SUCO_HETHONG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        tieude NVARCHAR(250) NOT NULL,
        he_thong NVARCHAR(100) NULL,
        muc_do NVARCHAR(50) DEFAULT N'Cao',
        thoi_gian_bat_dau DATETIME NOT NULL,
        thoi_gian_ket_thuc DATETIME NULL,
        thoi_gian_gian_doan_phut INT NULL,
        noi_dung NVARCHAR(MAX) NOT NULL,
        nguyen_nhan NVARCHAR(MAX) NULL,
        bien_phap_khac_phuc NVARCHAR(MAX) NULL,
        trang_thai NVARCHAR(50) DEFAULT N'DANG_XU_LY',
        nguoi_ghi_nhan NVARCHAR(100) NULL,
        nguoi_xu_ly NVARCHAR(100) NULL,
        ghi_chu_tien_do NVARCHAR(MAX) NULL,
        images NVARCHAR(MAX) NULL,
        files NVARCHAR(MAX) NULL,
        active BIT DEFAULT 1,
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        resolved_at DATETIME NULL,
        resolved_by NVARCHAR(100) NULL
    );
    CREATE INDEX IX_SUCO_HETHONG_BATDAU ON dbo.GHINHAN_SUCO_HETHONG (thoi_gian_bat_dau);
    PRINT N'[OK] Tao bang GHINHAN_SUCO_HETHONG thanh cong';
END
GO

-- 3.6 STAFF_LEAVE_LOGS (Nghi phep, cong tac nhan su)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'STAFF_LEAVE_LOGS')
BEGIN
    CREATE TABLE dbo.STAFF_LEAVE_LOGS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        USERNAME NVARCHAR(100) NOT NULL,
        FULL_NAME NVARCHAR(200) NULL,
        LEAVE_TYPE NVARCHAR(50) NOT NULL,
        START_TIME DATETIME NOT NULL,
        END_TIME DATETIME NOT NULL,
        REASON NVARCHAR(MAX) NULL,
        NOTE NVARCHAR(MAX) NULL,
        USER_INSERT NVARCHAR(100) NULL,
        DATE_INSERT DATETIME DEFAULT GETDATE(),
        ACTIVE BIT DEFAULT 1
    );
    CREATE INDEX IX_LEAVE_USER ON dbo.STAFF_LEAVE_LOGS (USERNAME);
    PRINT N'[OK] Tao bang STAFF_LEAVE_LOGS thanh cong';
END
GO

-- 3.7 CHECKLIST_TEMPLATE & CHECKLIST_RUN (Sop Test He Thong / Khai Truong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CHECKLIST_TEMPLATE')
BEGIN
    CREATE TABLE dbo.CHECKLIST_TEMPLATE (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ten_suon NVARCHAR(255) NOT NULL,
        ma_suon NVARCHAR(100) NULL,
        danh_muc NVARCHAR(100) NULL DEFAULT N'Test Phần Mềm',
        mo_ta NVARCHAR(MAX) NULL,
        nguoi_tao NVARCHAR(100) NULL,
        sla_days INT DEFAULT 3,
        ngay_tao DATETIME DEFAULT GETDATE(),
        ngay_update DATETIME DEFAULT GETDATE(),
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang CHECKLIST_TEMPLATE thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CHECKLIST_TEMPLATE_ITEM')
BEGIN
    CREATE TABLE dbo.CHECKLIST_TEMPLATE_ITEM (
        id INT IDENTITY(1,1) PRIMARY KEY,
        template_id INT NOT NULL,
        nhom NVARCHAR(150) NULL,
        tieu_de NVARCHAR(MAX) NOT NULL,
        huong_dan NVARCHAR(MAX) NULL,
        stt INT DEFAULT 0,
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang CHECKLIST_TEMPLATE_ITEM thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CHECKLIST_RUN')
BEGIN
    CREATE TABLE dbo.CHECKLIST_RUN (
        id INT IDENTITY(1,1) PRIMARY KEY,
        template_id INT NOT NULL,
        ten_dot NVARCHAR(255) NOT NULL,
        ten_suon NVARCHAR(255) NULL,
        version_note NVARCHAR(255) NULL,
        ghi_chu NVARCHAR(MAX) NULL,
        nguoi_thuc_hien NVARCHAR(250) NULL,
        nguoi_tao NVARCHAR(100) NULL,
        trang_thai NVARCHAR(50) DEFAULT N'Đang thực hiện',
        sla_days INT DEFAULT 3,
        han_chot_sla DATETIME NULL,
        ngay_bat_dau DATETIME DEFAULT GETDATE(),
        ngay_hoan_thanh DATETIME NULL,
        ngay_tao DATETIME DEFAULT GETDATE(),
        ngay_update DATETIME DEFAULT GETDATE(),
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang CHECKLIST_RUN thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CHECKLIST_RUN_ITEM')
BEGIN
    CREATE TABLE dbo.CHECKLIST_RUN_ITEM (
        id INT IDENTITY(1,1) PRIMARY KEY,
        run_id INT NOT NULL,
        stt INT DEFAULT 0,
        nhom NVARCHAR(150) NULL,
        tieu_de NVARCHAR(MAX) NOT NULL,
        huong_dan NVARCHAR(MAX) NULL,
        trang_thai NVARCHAR(20) DEFAULT N'PENDING',
        ghi_chu_ket_qua NVARCHAR(MAX) NULL,
        images NVARCHAR(MAX) NULL,
        nguoi_hoan_thanh NVARCHAR(100) NULL,
        ngay_hoan_thanh DATETIME NULL,
        active BIT DEFAULT 1
    );
    CREATE INDEX IX_RUN_ITEM_RUNID ON dbo.CHECKLIST_RUN_ITEM (run_id);
    PRINT N'[OK] Tao bang CHECKLIST_RUN_ITEM thanh cong';
END
GO

-- 3.8 MEMO_TEMPLATE_CONFIG & MEMO_TEMPLATE_BRANDS (Mau Memo Khuyen Mai, CC Brand)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MEMO_TEMPLATE_CONFIG')
BEGIN
    CREATE TABLE dbo.MEMO_TEMPLATE_CONFIG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        config_key NVARCHAR(100) NULL,
        config_val NVARCHAR(MAX) NULL
    );
    PRINT N'[OK] Tao bang MEMO_TEMPLATE_CONFIG thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MEMO_TEMPLATE_BRANDS')
BEGIN
    CREATE TABLE dbo.MEMO_TEMPLATE_BRANDS (
        id INT IDENTITY(1,1) PRIMARY KEY,
        brand_name NVARCHAR(100) NULL,
        cc_emails NVARCHAR(MAX) NULL,
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang MEMO_TEMPLATE_BRANDS thanh cong';
END
GO

-- 3.9 PIM EXTENSIONS (USER THUC HIEN, LOG, CONFIG, SCHEDULE)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PIM_USER_THUCHIEN')
BEGIN
    CREATE TABLE dbo.PIM_USER_THUCHIEN (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ten_user NVARCHAR(50) NOT NULL UNIQUE,
        ho_ten NVARCHAR(100) NULL,
        email NVARCHAR(150) NULL,
        thu_tu INT NOT NULL,
        active BIT DEFAULT 1,
        ngay_tao DATETIME DEFAULT GETDATE()
    );
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active)
    VALUES 
        (N'Quyên', N'Tô Thị Quyên', 'quyen.tt@ggg.com.vn', 1, 1),
        (N'Hùng', N'Phạm Trần Mạnh Hùng', 'hung.phamtran@ggg.com.vn', 2, 1),
        (N'Duy', N'Ngô Nhựt Duy', 'duy.ngo@ggg.com.vn', 3, 1),
        (N'Thức', N'Nguyễn Thức', 'thuc.nguyen@ggg.com.vn', 4, 1),
        (N'Trầm', N'Nguyễn Vi Trầm', 'tram.nv@ggg.com.vn', 5, 1);
    PRINT N'[OK] Tao bang PIM_USER_THUCHIEN thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PIM_LOG')
BEGIN
    CREATE TABLE dbo.PIM_LOG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        id_yeu_cau NVARCHAR(50) NOT NULL,
        hanh_dong NVARCHAR(100) NOT NULL,
        noi_dung NVARCHAR(MAX) NULL,
        user_thuc_hien NVARCHAR(100) NULL,
        thoi_gian DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_PIM_LOG_id_yeu_cau ON dbo.PIM_LOG(id_yeu_cau);
    PRINT N'[OK] Tao bang PIM_LOG thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PIM_CONFIG')
BEGIN
    CREATE TABLE dbo.PIM_CONFIG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sso_username NVARCHAR(255) NOT NULL,
        sso_password NVARCHAR(255) NOT NULL,
        ngay_cap_nhat DATETIME DEFAULT GETDATE(),
        user_cap_nhat NVARCHAR(100)
    );
    INSERT INTO dbo.PIM_CONFIG (sso_username, sso_password, user_cap_nhat)
    VALUES ('dung.nguyenanh@ggg.com.vn', 'Nguyetthu28071995@@', 'system');
    PRINT N'[OK] Tao bang PIM_CONFIG thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PIM_SCHEDULE')
BEGIN
    CREATE TABLE dbo.PIM_SCHEDULE (
        id INT IDENTITY(1,1) PRIMARY KEY,
        time_1 VARCHAR(10) NOT NULL DEFAULT '03:00',
        time_2 VARCHAR(10) NOT NULL DEFAULT '12:00',
        time_3 VARCHAR(10) NOT NULL DEFAULT '16:30',
        is_active BIT NOT NULL DEFAULT 1,
        last_run DATETIME NULL,
        last_status NVARCHAR(255) NULL,
        ngay_cap_nhat DATETIME DEFAULT GETDATE(),
        user_cap_nhat NVARCHAR(100)
    );
    INSERT INTO dbo.PIM_SCHEDULE (time_1, time_2, time_3, is_active, user_cap_nhat)
    VALUES ('03:00', '12:00', '16:30', 1, 'system');
    PRINT N'[OK] Tao bang PIM_SCHEDULE thanh cong';
END
GO

-- 3.10 REGION & BRAND (Danh muc vung mien va thuong hieu)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'REGION')
BEGIN
    CREATE TABLE dbo.REGION (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ma_tinhthanh NVARCHAR(100) NULL,
        ten_tinhthanh NVARCHAR(250) NULL,
        bienso NVARCHAR(100) NULL,
        timkiem NVARCHAR(MAX) NULL,
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang REGION thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BRAND')
BEGIN
    CREATE TABLE dbo.BRAND (
        id INT IDENTITY(1,1) PRIMARY KEY,
        brand_code NVARCHAR(100) NULL,
        brand_name NVARCHAR(250) NULL,
        timkiem NVARCHAR(MAX) NULL,
        active BIT DEFAULT 1
    );
    PRINT N'[OK] Tao bang BRAND thanh cong';
END
GO

-- 3.11 OVERNIGHT_DEVICES_LOG (Luu nhat ky thiet bi POS, PC, KDS de qua dem tai Nha Hang)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OVERNIGHT_DEVICES_LOG')
BEGIN
    CREATE TABLE dbo.OVERNIGHT_DEVICES_LOG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        scan_date DATE NOT NULL,
        scan_time DATETIME NOT NULL,
        restaurant_id INT NULL,
        sap_code NVARCHAR(50) NULL,
        rk7_code NVARCHAR(50) NULL,
        restaurant_name NVARCHAR(250) NULL,
        ip_gateway NVARCHAR(50) NULL,
        subnet NVARCHAR(50) NULL,
        email NVARCHAR(150) NULL,
        overnight_devices NVARCHAR(500) NOT NULL,
        device_count INT DEFAULT 0,
        raw_details NVARCHAR(MAX) NULL,
        summary_line NVARCHAR(MAX) NULL,
        created_at DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_OVERNIGHT_DEVICES_DATE ON dbo.OVERNIGHT_DEVICES_LOG (scan_date);
    CREATE INDEX IX_OVERNIGHT_DEVICES_REST ON dbo.OVERNIGHT_DEVICES_LOG (restaurant_id);
    PRINT N'[OK] Tao bang OVERNIGHT_DEVICES_LOG thanh cong';
END
-- 3.12 USER_SSO_CONFIG (Luu cau hinh tai khoan SSO & IAM ca nhan cua tung user he thong)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'USER_SSO_CONFIG')
BEGIN
    CREATE TABLE dbo.USER_SSO_CONFIG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        system_username NVARCHAR(100) NOT NULL UNIQUE,
        sso_username NVARCHAR(255) NOT NULL,
        sso_password NVARCHAR(255) NOT NULL,
        last_status NVARCHAR(100) NULL,
        last_tested_at DATETIME NULL,
        ngay_cap_nhat DATETIME DEFAULT GETDATE() NULL
    );
    CREATE UNIQUE INDEX IX_USER_SSO_CONFIG_username ON dbo.USER_SSO_CONFIG (system_username);
    PRINT N'[OK] Tao bang USER_SSO_CONFIG thanh cong';
END
GO

PRINT N'====================================================================';
PRINT N'>>> HOAN TAT TOAN BO! DATABASE ITDEPT SAN SANG HOAT DONG 100%.';
PRINT N'====================================================================';

