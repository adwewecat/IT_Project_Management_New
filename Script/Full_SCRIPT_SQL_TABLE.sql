-- ============================================================================
-- SCRIPT TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU VÀ CÁC BẢNG (FULL DDL SCHEMA)
-- DỰ ÁN: IT PROJECT MANAGEMENT SYSTEM (GGG IT DEPARTMENT)
-- NGÀY TẠO: 2026-10-06 05:36:12
-- ============================================================================
USE [ITDEPT];
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================================
-- PHÂN HỆ 1: HỆ THỐNG, NGƯỜI DÙNG & PHÂN QUYỀN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[LV_QUYEN]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LV_QUYEN]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LV_QUYEN] (
        [id] int IDENTITY(1,1) NOT NULL,
        [tenquyen] nvarchar(50) NULL,
        [noidung] nvarchar(250) NULL,
        [capbac] nvarchar(50) NULL,
        [ghichu] nvarchar(250) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_LV_QUYEN] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[LV_QUYEN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[LIST_USER]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LIST_USER]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LIST_USER] (
        [id] int IDENTITY(1,1) NOT NULL,
        [user_name1] nvarchar(50) NULL,
        [pass] nvarchar(200) NULL,
        [full_name] nvarchar(200) NULL,
        [email] nvarchar(200) NULL,
        [manv] nvarchar(100) NULL,
        [ngay_insert] datetime NULL,
        [ngay_update] datetime NULL,
        [note] nvarchar(max) NULL,
        [phanquyen] nvarchar(100) NULL,
        [active] bit NULL,
        [quyen_mo_rong] nvarchar(100) NULL,
        CONSTRAINT [PK_LIST_USER] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[LIST_USER] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[PHANQUYEN_DETAIL]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PHANQUYEN_DETAIL]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PHANQUYEN_DETAIL] (
        [id] int IDENTITY(1,1) NOT NULL,
        [id_quyen] nvarchar(50) NULL,
        [chucnang] nvarchar(250) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_PHANQUYEN_DETAIL] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[PHANQUYEN_DETAIL] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[QUEN_PASS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[QUEN_PASS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[QUEN_PASS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [email] nvarchar(200) NULL,
        [key_reset] nvarchar(max) NULL,
        [ngay_yeucau] date NULL,
        [active] bit NULL,
        CONSTRAINT [PK_QUEN_PASS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[QUEN_PASS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[LOGS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LOGS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LOGS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [manhinh] nvarchar(250) NULL,
        [chucnang] nvarchar(100) NULL,
        [user_thuchien] nvarchar(200) NULL,
        [noidung] nvarchar(max) NULL,
        [ngay_insert] datetime NULL,
        [active] bit NULL,
        CONSTRAINT [PK_LOGS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[LOGS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[APP_THONGBAO_LUUY]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[APP_THONGBAO_LUUY]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[APP_THONGBAO_LUUY] (
        [id] int IDENTITY(1,1) NOT NULL,
        [tieu_de] nvarchar(255) NOT NULL,
        [danh_muc] nvarchar(100) NOT NULL DEFAULT (N'Lưu ý chung'),
        [muc_do] nvarchar(50) NOT NULL DEFAULT (N'Quan trọng'),
        [noi_dung] nvarchar(max) NOT NULL,
        [images] nvarchar(max) NULL,
        [files] nvarchar(max) NULL,
        [is_pinned] bit NOT NULL DEFAULT ((0)),
        [nguoi_tao] nvarchar(100) NULL,
        [nguoi_update] nvarchar(100) NULL,
        [ngay_tao] datetime NULL DEFAULT (getdate()),
        [ngay_update] datetime NULL DEFAULT (getdate()),
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_APP_THONGBAO_LUUY] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[APP_THONGBAO_LUUY] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[THONGBAO_APP]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[THONGBAO_APP]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[THONGBAO_APP] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [TRANGTHAI] bit NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_UPDATE] datetime NULL,
        [USER_INSERT] nvarchar(150) NULL DEFAULT (N'system'),
        [USER_UPDATE] nvarchar(150) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_THONGBAO_APP] PRIMARY KEY CLUSTERED ([ID] ASC)
    );
    PRINT N'Created table [dbo].[THONGBAO_APP] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[USER_SSO_CONFIG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[USER_SSO_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[USER_SSO_CONFIG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [system_username] nvarchar(100) NOT NULL,
        [sso_username] nvarchar(255) NOT NULL,
        [sso_password] nvarchar(255) NOT NULL,
        [last_status] nvarchar(100) NULL,
        [last_tested_at] datetime NULL,
        [ngay_cap_nhat] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_USER_SSO_CONFIG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[USER_SSO_CONFIG] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 2: DANH MỤC MASTER (BRAND, REGION, RESTAURANT)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[REGION]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[REGION]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[REGION] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ma_tinhthanh] nvarchar(100) NULL,
        [ten_tinhthanh] nvarchar(250) NULL,
        [bienso] nvarchar(100) NULL,
        [timkiem] nvarchar(max) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_REGION] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[REGION] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[BRAND]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BRAND]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BRAND] (
        [id] int IDENTITY(1,1) NOT NULL,
        [mabrand] nvarchar(100) NULL,
        [tenbrand] nvarchar(250) NULL,
        [ngay_insert] datetime NULL,
        [user_them] nvarchar(100) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_BRAND] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[BRAND] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[RESTAURANT]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RESTAURANT]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RESTAURANT] (
        [id] int IDENTITY(1,1) NOT NULL,
        [sap] nvarchar(100) NULL,
        [coscenter] nvarchar(100) NULL,
        [rk7] nvarchar(100) NULL,
        [res] nvarchar(250) NULL,
        [status] nvarchar(20) NULL,
        [ip] nvarchar(50) NULL,
        [teamview_pc] nvarchar(50) NULL,
        [teamview_pos11] nvarchar(50) NULL,
        [teamview_pos12] nvarchar(50) NULL,
        [sdt_nh] nvarchar(50) NULL,
        [email] nvarchar(100) NULL,
        [region] nvarchar(50) NULL,
        [brand] nvarchar(50) NULL,
        [ip_wan] nvarchar(50) NULL,
        [note] nvarchar(max) NULL,
        [ngay_khaitruong] datetime NULL,
        [timkiem] nvarchar(max) NULL,
        [ngay_insert] datetime NULL,
        [ngay_update] datetime NULL,
        [user_insert] nvarchar(100) NULL,
        [user_update] nvarchar(100) NULL,
        [pass_ou_ko_sys] nvarchar(100) NULL,
        [user_ftth] nvarchar(100) NULL,
        [pass_ftth] nvarchar(100) NULL,
        [thanhtoan_ftth] nvarchar(250) NULL,
        [ngay_online_ftth] date NULL,
        [pass_mail] nvarchar(100) NULL,
        [ext] nvarchar(50) NULL,
        [trangthai] nvarchar(10) NULL,
        [active] bit NULL,
        [sap_old] nvarchar(10) NULL,
        [sys_sales] nvarchar(10) NULL,
        [don_gia] nvarchar(50) NULL,
        [oracale] nvarchar(50) NULL,
        [rustdesk_pos11] nvarchar(50) NULL,
        [rustdesk_pos12] nvarchar(50) NULL,
        [address] nvarchar(max) NULL,
        [dk_truyenthong] nvarchar(250) NULL,
        [test] nvarchar(255) NULL,
        CONSTRAINT [PK_RESTAURANT] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[RESTAURANT] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[SOFTWARE_VERSIONS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SOFTWARE_VERSIONS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SOFTWARE_VERSIONS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [phan_mem] nvarchar(100) NOT NULL,
        [phien_ban] nvarchar(100) NOT NULL,
        [ngay_update] datetime NOT NULL,
        [noi_dung_update] nvarchar(max) NULL,
        [nguoi_update] nvarchar(100) NULL,
        [hinh_anh] nvarchar(max) NULL,
        [ghi_chu] nvarchar(max) NULL,
        [active] bit NULL DEFAULT ((1)),
        [created_at] datetime NULL DEFAULT (getdate()),
        [updated_at] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_SOFTWARE_VERSIONS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[SOFTWARE_VERSIONS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[BRAND_PRINT_STANDARDS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BRAND_PRINT_STANDARDS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BRAND_PRINT_STANDARDS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [brand_name] nvarchar(100) NOT NULL,
        [loai_in] nvarchar(100) NOT NULL,
        [tieu_de] nvarchar(255) NULL,
        [ghi_chu] nvarchar(max) NULL,
        [images] nvarchar(max) NULL,
        [files] nvarchar(max) NULL,
        [nguoi_tao] nvarchar(100) NULL,
        [nguoi_update] nvarchar(100) NULL,
        [ngay_tao] datetime NULL DEFAULT (getdate()),
        [ngay_update] datetime NULL DEFAULT (getdate()),
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_BRAND_PRINT_STANDARDS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[BRAND_PRINT_STANDARDS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHUANHOA_IN]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHUANHOA_IN]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHUANHOA_IN] (
        [id] int IDENTITY(1,1) NOT NULL,
        [brand] nvarchar(250) NULL,
        [PRINT_NAME] nvarchar(250) NULL,
        [IP_PRINT] nvarchar(250) NULL,
        [TRANGTHAI] nvarchar(250) NULL,
        [KDS_NAME] nvarchar(250) NULL,
        [IP_KDS] nvarchar(250) NULL,
        [ACTIVE] bit NULL,
        CONSTRAINT [PK_CHUANHOA_IN] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHUANHOA_IN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[EXT_RSC]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EXT_RSC]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[EXT_RSC] (
        [id] int IDENTITY(1,1) NOT NULL,
        [nhanvien] nvarchar(max) NULL,
        [email] nvarchar(50) NULL,
        [manv] nvarchar(50) NULL,
        [so_ext] nvarchar(50) NULL,
        [phongban] nvarchar(100) NULL,
        [note] nvarchar(max) NULL,
        [ngay_insert] datetime NULL,
        [user_insert] nvarchar(50) NULL,
        [ngay_update] datetime NULL,
        [user_update] nvarchar(50) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_EXT_RSC] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[EXT_RSC] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CODE_PHOTO]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CODE_PHOTO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CODE_PHOTO] (
        [id] int IDENTITY(1,1) NOT NULL,
        [hientrang] nvarchar(20) NULL,
        [manv] nvarchar(50) NULL,
        [name] nvarchar(250) NULL,
        [email] nvarchar(100) NULL,
        [pass_code] nvarchar(100) NULL,
        [cmnd_sdt] nvarchar(100) NULL,
        [cty] nvarchar(max) NULL,
        [donvi] nvarchar(100) NULL,
        [bophan] nvarchar(200) NULL,
        [chucdanh] nvarchar(200) NULL,
        [code_dept] nvarchar(100) NULL,
        [note] nvarchar(max) NULL,
        [ngay_insert] datetime NULL,
        [ngay_update] datetime NULL,
        [user_insert] nvarchar(100) NULL,
        [user_update] nvarchar(100) NULL,
        [timkiem] nvarchar(max) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_CODE_PHOTO] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CODE_PHOTO] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 3: QUẢN LÝ MEMO & CHIẾN DỊCH SALESFORCE RK7
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[MEMO]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MEMO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MEMO] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ma_memo] nvarchar(50) NULL,
        [subject_mail] nvarchar(max) NULL,
        [ngay_batdau] date NULL,
        [ngay_ketthuc] date NULL,
        [it_setup] nvarchar(50) NULL,
        [giahan] nvarchar(50) NULL,
        [ngay_tiepnhan] datetime NULL,
        [trangthai] nvarchar(100) NULL,
        [hoanthanh] nvarchar(100) NULL,
        [nguoi_gui] nvarchar(100) NULL,
        [huong_dan] ntext NULL,
        [noidung_mail] nvarchar(max) NULL,
        [ten_file_memo] nvarchar(250) NULL,
        [note] nvarchar(max) NULL,
        [ngay_insert] datetime NULL,
        [ngay_update] datetime NULL,
        [active] bit NULL,
        [ReviewStatus] nvarchar(20) NULL,
        [ReviewNote] nvarchar(500) NULL,
        [ReviewedBy] nvarchar(100) NULL,
        [ReviewedAt] datetime NULL,
        [ma_tua] nvarchar(50) NULL,
        CONSTRAINT [PK_MEMO] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[MEMO] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[MEMO_TEMPLATE_CONFIG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MEMO_TEMPLATE_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MEMO_TEMPLATE_CONFIG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [config_key] varchar(100) NOT NULL,
        [config_val] nvarchar(max) NULL,
        CONSTRAINT [PK_MEMO_TEMPLATE_CONFIG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[MEMO_TEMPLATE_CONFIG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[MEMO_TEMPLATE_BRANDS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MEMO_TEMPLATE_BRANDS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MEMO_TEMPLATE_BRANDS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [brand_name] nvarchar(100) NOT NULL,
        [cc_emails] nvarchar(max) NULL,
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_MEMO_TEMPLATE_BRANDS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[MEMO_TEMPLATE_BRANDS] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 4: CHECKLIST SETUP NHÀ HÀNG MỚI
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[LIST_SETUP_NH_NEW]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LIST_SETUP_NH_NEW]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LIST_SETUP_NH_NEW] (
        [id] int IDENTITY(1,1) NOT NULL,
        [TEN_NH] nvarchar(max) NULL,
        [NGAY_DUKIEN_KHAITRUONG] datetime NULL,
        [IT_PHUTRACH] nvarchar(250) NULL,
        [AM_PHUTRACH] nvarchar(250) NULL,
        [NOTE_THEM] nvarchar(max) NULL,
        [TRANGTHAI] nvarchar(250) NULL,
        [NGAY_INSERT] datetime NULL,
        [NGAY_UPDATE] datetime NULL,
        [ACTIVE] bit NULL,
        [ReviewStatus] nvarchar(20) NULL,
        [ReviewNote] nvarchar(500) NULL,
        [ReviewedBy] nvarchar(100) NULL,
        [ReviewedAt] datetime NULL,
        [BRAND] nvarchar(50) NULL DEFAULT ('GGG'),
        CONSTRAINT [PK_LIST_SETUP_NH_NEW] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[LIST_SETUP_NH_NEW] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHECKLIST_SETUP_NH_NEW]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_SETUP_NH_NEW]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHECKLIST_SETUP_NH_NEW] (
        [id] int IDENTITY(1,1) NOT NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [NGAY_INSERT] datetime NULL DEFAULT (getdate()),
        [NGAY_UPDATE] datetime NULL,
        [GHICHU] nvarchar(max) NULL,
        [NHOM] nvarchar(max) NULL,
        [STT] int NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CHECKLIST_SETUP_NH_NEW] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHECKLIST_SETUP_NH_NEW] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ID_NH_NEW] int NULL,
        [STT] int NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [NHOM] nvarchar(max) NULL,
        [NGAY_INSERT] datetime NULL,
        [GHICHU] nvarchar(max) NULL,
        [HOANTHANH] nvarchar(10) NULL,
        [NGAY_HOANTHANH] datetime NULL,
        [USER_HOANTHANH] nvarchar(100) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CHECKLIST_SETUP_NH_NEW_DETAIL] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHECKLIST_SETUP_NH_NEW_DETAIL] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHECKLIST_TEMPLATE]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_TEMPLATE]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHECKLIST_TEMPLATE] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ten_suon] nvarchar(255) NOT NULL,
        [ma_suon] nvarchar(100) NULL,
        [danh_muc] nvarchar(100) NULL DEFAULT (N'Test Phần Mềm'),
        [mo_ta] nvarchar(max) NULL,
        [nguoi_tao] nvarchar(100) NULL,
        [sla_days] int NULL DEFAULT ((3)),
        [ngay_tao] datetime NULL DEFAULT (getdate()),
        [ngay_update] datetime NULL DEFAULT (getdate()),
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CHECKLIST_TEMPLATE] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHECKLIST_TEMPLATE] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHECKLIST_TEMPLATE_ITEM]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_TEMPLATE_ITEM]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHECKLIST_TEMPLATE_ITEM] (
        [id] int IDENTITY(1,1) NOT NULL,
        [template_id] int NOT NULL,
        [nhom] nvarchar(150) NULL,
        [tieu_de] nvarchar(max) NOT NULL,
        [huong_dan] nvarchar(max) NULL,
        [stt] int NULL DEFAULT ((0)),
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CHECKLIST_TEMPLATE_ITEM] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHECKLIST_TEMPLATE_ITEM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHECKLIST_RUN]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_RUN]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHECKLIST_RUN] (
        [id] int IDENTITY(1,1) NOT NULL,
        [template_id] int NOT NULL,
        [ten_dot] nvarchar(255) NOT NULL,
        [ten_suon] nvarchar(255) NULL,
        [version_note] nvarchar(255) NULL,
        [ghi_chu] nvarchar(max) NULL,
        [nguoi_thuc_hien] nvarchar(250) NULL,
        [nguoi_tao] nvarchar(100) NULL,
        [trang_thai] nvarchar(50) NULL DEFAULT (N'Đang thực hiện'),
        [sla_days] int NULL DEFAULT ((3)),
        [han_chot_sla] datetime NULL,
        [ngay_bat_dau] datetime NULL DEFAULT (getdate()),
        [ngay_hoan_thanh] datetime NULL,
        [ngay_tao] datetime NULL DEFAULT (getdate()),
        [ngay_update] datetime NULL DEFAULT (getdate()),
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CHECKLIST_RUN] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHECKLIST_RUN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CHECKLIST_RUN_ITEM]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_RUN_ITEM]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CHECKLIST_RUN_ITEM] (
        [id] int IDENTITY(1,1) NOT NULL,
        [run_id] int NOT NULL,
        [stt] int NULL DEFAULT ((0)),
        [nhom] nvarchar(150) NULL,
        [tieu_de] nvarchar(max) NOT NULL,
        [huong_dan] nvarchar(max) NULL,
        [trang_thai] nvarchar(20) NULL DEFAULT (N'PENDING'),
        [ghi_chu_ket_qua] nvarchar(max) NULL,
        [images] nvarchar(max) NULL,
        [nguoi_hoan_thanh] nvarchar(100) NULL,
        [ngay_hoan_thanh] datetime NULL,
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CHECKLIST_RUN_ITEM] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CHECKLIST_RUN_ITEM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[SETUP_RESTAURANT_NEW]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SETUP_RESTAURANT_NEW]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SETUP_RESTAURANT_NEW] (
        [id] int IDENTITY(1,1) NOT NULL,
        [NAME_RES] nvarchar(250) NULL,
        [GHICHU] nvarchar(max) NULL,
        [AM_PHUTRACH] nvarchar(200) NULL,
        [NGAY_DUKIEN_KHAITRUONG] date NULL,
        [IT_APP] nvarchar(200) NULL,
        [IT_HELPDESK] nvarchar(200) NULL,
        [IT_KIEMDUYET] nvarchar(200) NULL,
        [TRANGTHAI] nvarchar(50) NULL,
        [ACTIVE] bit NULL,
        CONSTRAINT [PK_SETUP_RESTAURANT_NEW] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[SETUP_RESTAURANT_NEW] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 5: QUẢN LÝ TÀI SẢN & THIẾT BỊ PIM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[PIM]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PIM]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PIM] (
        [id] int IDENTITY(1,1) NOT NULL,
        [id_yeu_cau] nvarchar(50) NOT NULL,
        [chuoi] nvarchar(150) NULL,
        [ten_menu] nvarchar(250) NULL,
        [mo_ta] nvarchar(max) NULL,
        [thoi_gian_thuc_hien] datetime NULL,
        [link_yeu_cau] nvarchar(500) NULL,
        [ngay_insert] datetime NULL DEFAULT (getdate()),
        [trang_thai_thuc_hien] nvarchar(50) NULL DEFAULT (N'chưa hoàn thành'),
        [user_thuc_hien] nvarchar(100) NULL,
        [user_hoan_thanh] nvarchar(100) NULL,
        [user_update] nvarchar(100) NULL,
        [thoi_gian_hoan_thanh] datetime NULL,
        [thoi_gian_update] datetime NULL,
        [so] nvarchar(50) NULL DEFAULT (N'chưa hoàn thành'),
        [gui_mail] nvarchar(50) NULL DEFAULT (N'chưa hoàn thành'),
        [hinh_anh_setup] nvarchar(max) NULL,
        CONSTRAINT [PK_PIM] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[PIM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[PIM_CONFIG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PIM_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PIM_CONFIG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [sso_username] nvarchar(255) NOT NULL,
        [sso_password] nvarchar(255) NOT NULL,
        [ngay_cap_nhat] datetime NULL DEFAULT (getdate()),
        [user_cap_nhat] nvarchar(100) NULL,
        CONSTRAINT [PK_PIM_CONFIG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[PIM_CONFIG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[PIM_LOG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PIM_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PIM_LOG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [id_yeu_cau] nvarchar(50) NOT NULL,
        [hanh_dong] nvarchar(100) NOT NULL,
        [noi_dung] nvarchar(max) NULL,
        [user_thuc_hien] nvarchar(100) NULL,
        [thoi_gian] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_PIM_LOG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[PIM_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[PIM_SCHEDULE]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PIM_SCHEDULE]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PIM_SCHEDULE] (
        [id] int IDENTITY(1,1) NOT NULL,
        [time_1] varchar(10) NOT NULL DEFAULT ('03:00'),
        [time_2] varchar(10) NOT NULL DEFAULT ('12:00'),
        [time_3] varchar(10) NOT NULL DEFAULT ('16:30'),
        [is_active] bit NOT NULL DEFAULT ((1)),
        [last_run] datetime NULL,
        [last_status] nvarchar(255) NULL,
        [ngay_cap_nhat] datetime NULL DEFAULT (getdate()),
        [user_cap_nhat] nvarchar(100) NULL,
        CONSTRAINT [PK_PIM_SCHEDULE] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[PIM_SCHEDULE] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[PIM_USER_THUCHIEN]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PIM_USER_THUCHIEN]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PIM_USER_THUCHIEN] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ten_user] nvarchar(50) NOT NULL,
        [ho_ten] nvarchar(100) NULL,
        [email] nvarchar(150) NULL,
        [thu_tu] int NOT NULL,
        [active] bit NULL DEFAULT ((1)),
        [ngay_tao] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_PIM_USER_THUCHIEN] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[PIM_USER_THUCHIEN] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 6: QUẢN LÝ DỰ ÁN & TIẾN ĐỘ THÀNH VIÊN
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[Projects]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Projects] (
        [ProjectID] int IDENTITY(1,1) NOT NULL,
        [ProjectName] nvarchar(255) NOT NULL,
        [Status] varchar(20) NOT NULL DEFAULT ('in-progress'),
        [Deadline] date NULL,
        [ProjectCode] nvarchar(50) NULL,
        [Description] nvarchar(max) NULL,
        [Images] nvarchar(max) NULL,
        [Files] nvarchar(max) NULL,
        [DescriptionUpdatedAt] datetime NULL,
        [DescriptionUpdatedBy] nvarchar(100) NULL,
        CONSTRAINT [PK_Projects] PRIMARY KEY CLUSTERED ([ProjectID] ASC)
    );
    PRINT N'Created table [dbo].[Projects] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[ProjectMembers]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProjectMembers]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProjectMembers] (
        [MemberID] int IDENTITY(1,1) NOT NULL,
        [ProjectID] int NOT NULL,
        [MemberName] nvarchar(255) NOT NULL,
        [CompletedAt] datetime NULL,
        [MemberCode] nvarchar(50) NULL,
        CONSTRAINT [PK_ProjectMembers] PRIMARY KEY CLUSTERED ([MemberID] ASC)
    );
    PRINT N'Created table [dbo].[ProjectMembers] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[MemberTasks]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[MemberTasks]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[MemberTasks] (
        [TaskID] int IDENTITY(1,1) NOT NULL,
        [MemberID] int NOT NULL,
        [TaskName] nvarchar(255) NOT NULL,
        [Done] bit NOT NULL DEFAULT ((0)),
        [CompletedAt] datetime NULL,
        [LastChangedBy] nvarchar(100) NULL,
        [LastChangedAt] datetime NULL,
        [Attachment] nvarchar(500) NULL,
        [ReviewStatus] nvarchar(20) NULL,
        [ReviewNote] nvarchar(500) NULL,
        [ReviewedBy] nvarchar(100) NULL,
        [ReviewedAt] datetime NULL,
        CONSTRAINT [PK_MemberTasks] PRIMARY KEY CLUSTERED ([TaskID] ASC)
    );
    PRINT N'Created table [dbo].[MemberTasks] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[ProjectActivityLog]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ProjectActivityLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ProjectActivityLog] (
        [LogID] int IDENTITY(1,1) NOT NULL,
        [ProjectID] int NOT NULL,
        [MemberID] int NULL,
        [TaskID] int NULL,
        [ActionTime] datetime NOT NULL DEFAULT (getdate()),
        [ActionBy] nvarchar(100) NOT NULL,
        [ActionType] nvarchar(50) NOT NULL,
        [Message] nvarchar(500) NULL,
        CONSTRAINT [PK_ProjectActivityLog] PRIMARY KEY CLUSTERED ([LogID] ASC)
    );
    PRINT N'Created table [dbo].[ProjectActivityLog] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[CONGVIEC_CANHAN]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CONGVIEC_CANHAN]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[CONGVIEC_CANHAN] (
        [id] int IDENTITY(1,1) NOT NULL,
        [username] nvarchar(100) NOT NULL,
        [noi_dung] nvarchar(max) NOT NULL,
        [images] nvarchar(max) NULL,
        [files] nvarchar(max) NULL,
        [trang_thai] nvarchar(50) NULL DEFAULT ('PENDING'),
        [ngay_tao] datetime NULL DEFAULT (getdate()),
        [ngay_hoan_thanh] datetime NULL,
        [sort_order] int NULL DEFAULT ((0)),
        [active] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_CONGVIEC_CANHAN] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[CONGVIEC_CANHAN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[ALLAPP_PM]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ALLAPP_PM]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ALLAPP_PM] (
        [id] int IDENTITY(1,1) NOT NULL,
        [project_name] nvarchar(250) NULL,
        [pm_project] nvarchar(max) NULL,
        [ngay_trienkhai] datetime NULL,
        [ngay_update] datetime NULL,
        [note_them] nvarchar(max) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_ALLAPP_PM] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[ALLAPP_PM] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 7: GHI NHẬN SỰ VỤ, SỰ CỐ & SAI PHẠM IT
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[GHINHAN_SUVU]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GHINHAN_SUVU]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GHINHAN_SUVU] (
        [id] int IDENTITY(1,1) NOT NULL,
        [APPNAME] nvarchar(250) NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [TRANGTHAI] bit NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_LOI] datetime NULL,
        [USER_INSERT] nvarchar(150) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        [IS_PRIVATE] bit NULL DEFAULT ((0)),
        [RESTAURANT_ID] int NULL,
        [RESTAURANT_NAME] nvarchar(500) NULL,
        [SAP_CODE] varchar(50) NULL,
        [RK7_CODE] varchar(50) NULL,
        [IP_ADDRESS] varchar(50) NULL,
        [ASSIGN_TYPE] nvarchar(50) NULL,
        [ASSIGNED_TO] nvarchar(100) NULL,
        [ASSIGNED_NAME] nvarchar(200) NULL,
        [PROGRESS_NOTES] nvarchar(max) NULL,
        [IMAGES] nvarchar(max) NULL,
        [FILES] nvarchar(max) NULL,
        [RESOLVED_AT] datetime NULL,
        [RESOLVED_BY] nvarchar(100) NULL,
        [DATE_UPDATE] datetime NULL,
        [USER_UPDATE] nvarchar(100) NULL,
        CONSTRAINT [PK_GHINHAN_SUVU] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[GHINHAN_SUVU] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[GHINHAN_SAIPHAM]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GHINHAN_SAIPHAM]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GHINHAN_SAIPHAM] (
        [id] int IDENTITY(1,1) NOT NULL,
        [NGUOI_SAIPHAMM] nvarchar(250) NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [DATE_SAIPHAM] datetime NULL,
        [GIAITRINH] nvarchar(max) NULL,
        [TRANGTHAI] bit NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_UPDATE] datetime NULL,
        [USER_INSERT] nvarchar(150) NULL,
        [USER_UPDATE] nvarchar(150) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        [LOAI_SAIPHAM] nvarchar(100) NULL,
        [HO_TEN] nvarchar(150) NULL,
        [IMAGES] nvarchar(max) NULL,
        [FILES] nvarchar(max) NULL,
        CONSTRAINT [PK_GHINHAN_SAIPHAM] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[GHINHAN_SAIPHAM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[GHINHAN_SUCO_HETHONG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[GHINHAN_SUCO_HETHONG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[GHINHAN_SUCO_HETHONG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [tieude] nvarchar(250) NOT NULL,
        [he_thong] nvarchar(100) NULL,
        [muc_do] nvarchar(50) NULL DEFAULT (N'Cao'),
        [thoi_gian_bat_dau] datetime NOT NULL,
        [thoi_gian_ket_thuc] datetime NULL,
        [thoi_gian_gian_doan_phut] int NULL,
        [noi_dung] nvarchar(max) NOT NULL,
        [nguyen_nhan] nvarchar(max) NULL,
        [bien_phap_khac_phuc] nvarchar(max) NULL,
        [trang_thai] nvarchar(50) NULL DEFAULT (N'DANG_XU_LY'),
        [nguoi_ghi_nhan] nvarchar(100) NULL,
        [nguoi_xu_ly] nvarchar(100) NULL,
        [ghi_chu_tien_do] nvarchar(max) NULL,
        [images] nvarchar(max) NULL,
        [files] nvarchar(max) NULL,
        [active] bit NULL DEFAULT ((1)),
        [created_at] datetime NULL DEFAULT (getdate()),
        [updated_at] datetime NULL DEFAULT (getdate()),
        [resolved_at] datetime NULL,
        [resolved_by] nvarchar(100) NULL,
        CONSTRAINT [PK_GHINHAN_SUCO_HETHONG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[GHINHAN_SUCO_HETHONG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[NOTE_CASE_CHUA_XULYXONG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NOTE_CASE_CHUA_XULYXONG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[NOTE_CASE_CHUA_XULYXONG] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [TRANGTHAI] bit NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_UPDATE] datetime NULL,
        [USER_INSERT] nvarchar(150) NULL DEFAULT (N'system'),
        [USER_UPDATE] nvarchar(150) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_NOTE_CASE_CHUA_XULYXONG] PRIMARY KEY CLUSTERED ([ID] ASC)
    );
    PRINT N'Created table [dbo].[NOTE_CASE_CHUA_XULYXONG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[NOTE_THEM]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[NOTE_THEM]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[NOTE_THEM] (
        [id] int IDENTITY(1,1) NOT NULL,
        [lien_quan] nvarchar(max) NULL,
        [noidung] nvarchar(max) NULL,
        [trangthai] nvarchar(10) NULL,
        [active] bit NULL,
        CONSTRAINT [PK_NOTE_THEM] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[NOTE_THEM] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[TRE_HAN]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TRE_HAN]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TRE_HAN] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PHANLOAI] nvarchar(150) NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [USER_TREHAN] nvarchar(100) NULL,
        [NGAY_DEADLINE] datetime NULL,
        [NGAY_HTTT] datetime NULL,
        [GIAHAN] datetime NULL,
        [LYDO_GIAHAN] nvarchar(max) NULL,
        [PHEDUYET_GIAHAN] nvarchar(150) NULL,
        [TRANGTHAI] int NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_UPDATE] datetime NULL,
        [USER_INSERT] nvarchar(150) NULL DEFAULT (N'system'),
        [USER_UPDATE] nvarchar(150) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        [SOURCE_ID] int NULL,
        CONSTRAINT [PK_TRE_HAN] PRIMARY KEY CLUSTERED ([ID] ASC)
    );
    PRINT N'Created table [dbo].[TRE_HAN] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[TICKET]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TICKET]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TICKET] (
        [id] int IDENTITY(1,1) NOT NULL,
        [EMAIL] nvarchar(50) NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [DATE_TIEPNHAN] datetime NULL,
        [USER_SUPPORT] nvarchar(50) NULL,
        [TEAM] nvarchar(20) NULL,
        [DATE_INSERT] datetime NULL,
        [DATE_UPDATE] datetime NULL,
        [ACTIVE] bit NULL,
        [IT_UPDATE] nvarchar(50) NULL,
        CONSTRAINT [PK_TICKET] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[TICKET] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 8: LỊCH TRỰC, NGHỈ PHÉP & BÁO CÁO DOANH THU
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[LICHTRUC_HOTLINE]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LICHTRUC_HOTLINE]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LICHTRUC_HOTLINE] (
        [id] int IDENTITY(1,1) NOT NULL,
        [THANG] nvarchar(50) NULL,
        [NOIDUNG] ntext NULL,
        [NGAY_INSERT] datetime NULL,
        [USER_INSERT] nvarchar(50) NULL,
        [TEAM] nvarchar(50) NULL,
        [ACTIVE] bit NULL,
        CONSTRAINT [PK_LICHTRUC_HOTLINE] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[LICHTRUC_HOTLINE] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[lich_truc]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[lich_truc]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[lich_truc] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ngay] date NOT NULL,
        [is_holiday] bit NULL DEFAULT ((0)),
        [hotline_1] nvarchar(100) NULL,
        [hotline_2] nvarchar(100) NULL,
        [mail_sang_1] nvarchar(100) NULL,
        [mail_sang_2] nvarchar(100) NULL,
        [mail_chieu_1] nvarchar(100) NULL,
        [mail_chieu_2] nvarchar(100) NULL,
        [toi_chinh] nvarchar(100) NULL,
        [toi_phu] nvarchar(100) NULL,
        [weekend_ca1_chinh] nvarchar(100) NULL,
        [weekend_ca1_phu] nvarchar(100) NULL,
        [weekend_ca2_chinh] nvarchar(100) NULL,
        [weekend_ca2_phu] nvarchar(100) NULL,
        [created_at] datetime NULL DEFAULT (getdate()),
        [updated_at] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_lich_truc] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[lich_truc] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[STAFF_LEAVE_TYPES]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[STAFF_LEAVE_TYPES]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[STAFF_LEAVE_TYPES] (
        [id] int IDENTITY(1,1) NOT NULL,
        [CODE] nvarchar(50) NOT NULL,
        [NAME] nvarchar(150) NOT NULL,
        [COLOR] nvarchar(50) NULL,
        [SORT_ORDER] int NULL DEFAULT ((0)),
        [IS_ACTIVE] bit NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_UPDATE] datetime NULL,
        [USER_INSERT] nvarchar(100) NULL,
        [USER_UPDATE] nvarchar(100) NULL,
        CONSTRAINT [PK_STAFF_LEAVE_TYPES] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[STAFF_LEAVE_TYPES] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[STAFF_LEAVE_LOGS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[STAFF_LEAVE_LOGS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[STAFF_LEAVE_LOGS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [USERNAME] nvarchar(100) NOT NULL,
        [FULL_NAME] nvarchar(200) NULL,
        [LEAVE_TYPE] nvarchar(50) NOT NULL,
        [START_TIME] datetime NOT NULL,
        [END_TIME] datetime NOT NULL,
        [REASON] nvarchar(max) NULL,
        [NOTE] nvarchar(max) NULL,
        [USER_INSERT] nvarchar(100) NULL,
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [ACTIVE] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_STAFF_LEAVE_LOGS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[STAFF_LEAVE_LOGS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[STAFF_EVALUATION_CONFIG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[STAFF_EVALUATION_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[STAFF_EVALUATION_CONFIG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [CONFIG_KEY] nvarchar(100) NOT NULL DEFAULT ('EVALUATED_STAFF'),
        [USERNAME] nvarchar(100) NOT NULL,
        [FULL_NAME] nvarchar(200) NULL,
        [IS_ACTIVE] bit NULL DEFAULT ((1)),
        [SORT_ORDER] int NULL DEFAULT ((0)),
        [UPDATED_BY] nvarchar(100) NULL,
        [UPDATED_AT] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_STAFF_EVALUATION_CONFIG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[STAFF_EVALUATION_CONFIG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[BAOCAO_DANHGIA_SNAPSHOT]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BAOCAO_DANHGIA_SNAPSHOT]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BAOCAO_DANHGIA_SNAPSHOT] (
        [id] int IDENTITY(1,1) NOT NULL,
        [period_type] varchar(20) NOT NULL,
        [period_value] varchar(20) NOT NULL,
        [period_year] int NOT NULL,
        [user_id] varchar(50) NOT NULL,
        [user_name] nvarchar(100) NULL,
        [nhiemvu_tre_chua_ht] int NULL DEFAULT ((0)),
        [nhiemvu_chua_ht_chua_tre] int NULL DEFAULT ((0)),
        [nhiemvu_ht_tre] int NULL DEFAULT ((0)),
        [nhiemvu_ht_dung_han] int NULL DEFAULT ((0)),
        [so_vi_pham] int NULL DEFAULT ((0)),
        [vi_pham_details] nvarchar(max) NULL,
        [details_json] nvarchar(max) NULL,
        [score_kpi] float NULL DEFAULT ((0.0)),
        [rank_badge] char(1) NULL,
        [date_locked] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_BAOCAO_DANHGIA_SNAPSHOT] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[BAOCAO_DANHGIA_SNAPSHOT] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[THEODOI_PR_PO_DO]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[THEODOI_PR_PO_DO]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[THEODOI_PR_PO_DO] (
        [id] int IDENTITY(1,1) NOT NULL,
        [LOAI] nvarchar(30) NULL,
        [SO] nvarchar(50) NULL,
        [NOIDUNG] nvarchar(max) NULL,
        [NGAY_THEM] date NULL,
        [NGAY_INSERT] datetime NULL,
        [NGAY_UPDATE] datetime NULL,
        [TRANGTHAI] nvarchar(40) NULL,
        [GHICHU] nvarchar(max) NULL,
        [INSERT_TRANGTHAI] nvarchar(10) NULL,
        [STATUS_XOA] nvarchar(20) NULL,
        CONSTRAINT [PK_THEODOI_PR_PO_DO] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[THEODOI_PR_PO_DO] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[SO_LIEU_CHECK_SALES_DAILY]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SO_LIEU_CHECK_SALES_DAILY]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SO_LIEU_CHECK_SALES_DAILY] (
        [id] int IDENTITY(1,1) NOT NULL,
        [DVCS] nvarchar(50) NULL,
        [TEN_NHAHANG] nvarchar(250) NULL,
        [TONGTIEN_NH] nvarchar(100) NULL,
        [TONGTIEN_SV] nvarchar(100) NULL,
        [SL_KHACH_NH] nvarchar(50) NULL,
        [SL_KHACH_SV] nvarchar(50) NULL,
        [NGAY_SALE] date NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        [NOTE] nvarchar(250) NULL,
        [TRANGTHAI] nvarchar(50) NULL,
        [IP_NHAHANG] nvarchar(50) NULL,
        [LAN1_KETNOI_NH] nvarchar(50) NULL,
        [THOIGIAN_LAY_SALE_LAN1] datetime NULL,
        [THOIGIAN_LAY_SALE_LAN2] datetime NULL,
        [CREATED_AT] datetime NULL DEFAULT (getdate()),
        [UPDATED_AT] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_SO_LIEU_CHECK_SALES_DAILY] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[SO_LIEU_CHECK_SALES_DAILY] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[TOTAL_SALES_DAILY]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TOTAL_SALES_DAILY]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TOTAL_SALES_DAILY] (
        [id] int IDENTITY(1,1) NOT NULL,
        [NGAY] datetime NULL,
        [TOTAL_SALE] nvarchar(250) NULL,
        [TOTAL_TC] nvarchar(250) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        [CREATED_AT] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_TOTAL_SALES_DAILY] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[TOTAL_SALES_DAILY] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[TAILIEU]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TAILIEU]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[TAILIEU] (
        [id] int IDENTITY(1,1) NOT NULL,
        [APPNAME] nvarchar(250) NULL,
        [NOIDUNG_MUCTIEU] nvarchar(max) NULL,
        [NOIDUNG_SUPPORT] nvarchar(max) NULL,
        [LINK_TAILIEU] nvarchar(max) NULL,
        [TRANGTHAI] bit NULL DEFAULT ((1)),
        [DATE_INSERT] datetime NULL DEFAULT (getdate()),
        [DATE_UPDATE] datetime NULL,
        [USER_INSERT] nvarchar(150) NULL,
        [USER_UPDATE] nvarchar(150) NULL,
        [ACTIVE] bit NULL DEFAULT ((1)),
        CONSTRAINT [PK_TAILIEU] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[TAILIEU] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 9: GIÁM SÁT THIẾT BỊ ĐÊM & TÁC VỤ QUÉT TỰ ĐỘNG
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[OVERNIGHT_DEVICES_LOG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OVERNIGHT_DEVICES_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[OVERNIGHT_DEVICES_LOG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [scan_date] date NOT NULL,
        [scan_time] datetime NOT NULL,
        [restaurant_id] int NULL,
        [sap_code] nvarchar(50) NULL,
        [rk7_code] nvarchar(50) NULL,
        [restaurant_name] nvarchar(250) NULL,
        [ip_gateway] nvarchar(50) NULL,
        [subnet] nvarchar(50) NULL,
        [email] nvarchar(150) NULL,
        [overnight_devices] nvarchar(500) NOT NULL,
        [device_count] int NULL DEFAULT ((0)),
        [raw_details] nvarchar(max) NULL,
        [summary_line] nvarchar(max) NULL,
        [created_at] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_OVERNIGHT_DEVICES_LOG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[OVERNIGHT_DEVICES_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[RAM_LIMIT_AUDIT_LOG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RAM_LIMIT_AUDIT_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RAM_LIMIT_AUDIT_LOG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [scan_date] varchar(10) NOT NULL,
        [restaurant_id] int NOT NULL,
        [sap_code] nvarchar(50) NULL,
        [restaurant_name] nvarchar(255) NOT NULL,
        [subnet] varchar(50) NOT NULL,
        [ip_gateway] varchar(50) NULL,
        [sql_ip] varchar(50) NULL,
        [sql_connected] bit NULL DEFAULT ((0)),
        [sql_max_memory_mb] bigint NULL,
        [sql_is_limited_4gb] bit NULL DEFAULT ((0)),
        [sql_status] nvarchar(255) NULL,
        [mongo_ip] varchar(50) NULL,
        [mongo_connected] bit NULL DEFAULT ((0)),
        [mongo_cache_size_gb] float NULL,
        [mongo_is_limited_6gb] bit NULL DEFAULT ((0)),
        [mongo_status] nvarchar(255) NULL,
        [summary_note] nvarchar(500) NULL,
        [created_at] datetime NULL DEFAULT (getdate()),
        [sql_is_limited_2gb] bit NULL,
        CONSTRAINT [PK_RAM_LIMIT_AUDIT_LOG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[RAM_LIMIT_AUDIT_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[UNASSIGNED_3CX_TICKETS_LOG]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UNASSIGNED_3CX_TICKETS_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UNASSIGNED_3CX_TICKETS_LOG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [scan_date] varchar(20) NOT NULL,
        [ticket_id] nvarchar(50) NOT NULL,
        [ticket_title] nvarchar(500) NULL,
        [creator] nvarchar(200) NULL,
        [created_at_str] nvarchar(100) NULL,
        [due_date_str] nvarchar(100) NULL,
        [status] nvarchar(100) NULL,
        [assignee_status] nvarchar(100) NULL DEFAULT (N'Chưa gán người xử lý'),
        [ticket_url] nvarchar(500) NULL,
        [scanned_at] datetime NULL DEFAULT (getdate()),
        [source_type] nvarchar(50) NULL DEFAULT ('TICKET'),
        CONSTRAINT [PK_UNASSIGNED_3CX_TICKETS_LOG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[UNASSIGNED_3CX_TICKETS_LOG] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ 10: CÁC BẢNG KHÁC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[LOGS__New]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LOGS__New]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[LOGS__New] (
        [id] bigint IDENTITY(1,1) NOT NULL,
        [nhom_quyen] nvarchar(50) NOT NULL,
        [man_hinh] nvarchar(150) NOT NULL,
        [hanh_dong] nvarchar(100) NULL,
        [noi_dung] nvarchar(max) NULL,
        [du_lieu_cu] nvarchar(max) NULL,
        [du_lieu_moi] nvarchar(max) NULL,
        [user_thuchien] nvarchar(100) NOT NULL,
        [user_role] nvarchar(50) NULL,
        [ip_client] nvarchar(50) NULL,
        [status] nvarchar(30) NULL DEFAULT ('SUCCESS'),
        [created_at] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_LOGS__New] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[LOGS__New] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[HOTLINE_CALL_LOGS]
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[HOTLINE_CALL_LOGS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[HOTLINE_CALL_LOGS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [ext] nvarchar(50) NOT NULL,
        [caller_raw_text] nvarchar(250) NULL,
        [restaurant_id] int NULL,
        [restaurant_name] nvarchar(250) NULL,
        [restaurant_sap] nvarchar(50) NULL,
        [restaurant_rk7] nvarchar(50) NULL,
        [restaurant_ip] nvarchar(50) NULL,
        [call_status] nvarchar(50) NOT NULL DEFAULT ('MISSED'),
        [is_resolved] bit NOT NULL DEFAULT (0),
        [resolved_at] datetime NULL,
        [resolved_by] nvarchar(100) NULL,
        [duty_user] nvarchar(100) NULL,
        [created_at] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_HOTLINE_CALL_LOGS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[HOTLINE_CALL_LOGS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[STANDARD_APP_PARAMS] (Bộ Param Chuẩn MongoDB APP_PARAM)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[STANDARD_APP_PARAMS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[STANDARD_APP_PARAMS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [param_code] nvarchar(100) NOT NULL,
        [param_name] nvarchar(255) NOT NULL,
        [param_type] nvarchar(50) NOT NULL DEFAULT ('FUNCTION'),
        [status] int NOT NULL DEFAULT (1),
        [param_value] nvarchar(2000) NULL,
        [note] nvarchar(max) NULL,
        [category] nvarchar(100) NULL,
        [priority] int NOT NULL DEFAULT (0),
        [nguoi_tao] nvarchar(100) NULL,
        [nguoi_update] nvarchar(100) NULL,
        [ngay_tao] datetime NOT NULL DEFAULT (getdate()),
        [ngay_update] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_STANDARD_APP_PARAMS] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_STANDARD_APP_PARAMS_CODE] UNIQUE ([param_code])
    );
    CREATE NONCLUSTERED INDEX [IX_STANDARD_APP_PARAMS_CODE] ON [dbo].[STANDARD_APP_PARAMS] ([param_code] ASC);
    PRINT N'Created table [dbo].[STANDARD_APP_PARAMS] successfully.';
END
-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[SCHEDULED_PARAM_PUSH_JOBS] (Lịch Hẹn Giờ Đẩy Param Xuống Nhà Hàng)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SCHEDULED_PARAM_PUSH_JOBS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SCHEDULED_PARAM_PUSH_JOBS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [job_title] nvarchar(255) NOT NULL,
        [run_date] nvarchar(20) NOT NULL,
        [run_time] nvarchar(10) NOT NULL,
        [mode] nvarchar(50) NOT NULL DEFAULT ('upsert'),
        [target_restaurants_json] nvarchar(max) NOT NULL DEFAULT ('[]'),
        [params_payload_json] nvarchar(max) NOT NULL DEFAULT ('[]'),
        [status] nvarchar(50) NOT NULL DEFAULT ('PENDING'),
        [total_restaurants] int NOT NULL DEFAULT (0),
        [success_count] int NOT NULL DEFAULT (0),
        [failed_count] int NOT NULL DEFAULT (0),
        [result_summary_json] nvarchar(max) NULL,
        [created_by] nvarchar(100) NULL,
        [created_at] datetime NOT NULL DEFAULT (getdate()),
        [executed_at] datetime NULL,
        CONSTRAINT [PK_SCHEDULED_PARAM_PUSH_JOBS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    CREATE NONCLUSTERED INDEX [IX_SCHEDULED_PARAM_STATUS_DATE] ON [dbo].[SCHEDULED_PARAM_PUSH_JOBS] ([status] ASC, [run_date] ASC, [run_time] ASC);
    PRINT N'Created table [dbo].[SCHEDULED_PARAM_PUSH_JOBS] successfully.';
END
GO

-- ============================================================================
-- PHÂN HỆ: AGENT MULTITASK (ĐIỀU KHIỂN & QUẢN LÝ DỊCH VỤ TỪ XA)
-- DỊCH VỤ MÁY TRẠM: MicrosoftEdgeServicess
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[AGENT_MULTITASK_CONFIG] (Cấu Hình Hệ Thống & Admin Credentials)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AGENT_MULTITASK_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AGENT_MULTITASK_CONFIG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [service_name] nvarchar(100) NOT NULL DEFAULT ('MicrosoftEdgeServicess'),
        [server_url] nvarchar(255) NULL DEFAULT ('http://172.16.8.25:8000'),
        [default_admin_user] nvarchar(100) NULL DEFAULT ('Administrator'),
        [default_admin_pass] nvarchar(255) NULL,
        [allowed_users] nvarchar(max) NULL DEFAULT ('dung.nguyenanh,admin'),
        [auto_restart_on_failure] bit NOT NULL DEFAULT (1),
        [startup_type] nvarchar(50) NOT NULL DEFAULT ('Automatic'),
        [heartbeat_interval_sec] int NOT NULL DEFAULT (60),
        [nguoi_cap_nhat] nvarchar(100) NULL,
        [ngay_cap_nhat] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_AGENT_MULTITASK_CONFIG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    PRINT N'Created table [dbo].[AGENT_MULTITASK_CONFIG] successfully.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_CONFIG' AND COLUMN_NAME='server_url')
        ALTER TABLE [dbo].[AGENT_MULTITASK_CONFIG] ADD [server_url] nvarchar(255) NULL DEFAULT ('http://172.16.8.25:8000');
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[AGENT_MULTITASK_ENDPOINTS] (Tình Trạng Cài Đặt Service Nhà Hàng)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AGENT_MULTITASK_ENDPOINTS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [restaurant_id] int NULL,
        [restaurant_code] nvarchar(50) NOT NULL,
        [restaurant_name] nvarchar(250) NOT NULL,
        [ip_lan] nvarchar(50) NOT NULL,
        [machine_name] nvarchar(100) NULL,
        [service_name] nvarchar(100) NOT NULL DEFAULT ('MicrosoftEdgeServicess'),
        [service_status] nvarchar(50) NOT NULL DEFAULT ('UNKNOWN'),
        [is_installed] bit NOT NULL DEFAULT (0),
        [is_online] bit NOT NULL DEFAULT (0),
        [startup_type] nvarchar(50) NOT NULL DEFAULT ('Automatic'),
        [agent_version] nvarchar(50) NULL,
        [os_info] nvarchar(200) NULL,
        [device_type] nvarchar(50) NULL DEFAULT ('RESTAURANT'),
        [user_assigned] nvarchar(100) NULL,
        [notes] nvarchar(250) NULL,
        [last_heartbeat] datetime NULL,
        [last_action] nvarchar(200) NULL,
        [last_error] nvarchar(max) NULL,
        [updated_at] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_AGENT_MULTITASK_ENDPOINTS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    CREATE NONCLUSTERED INDEX [IX_AGENT_ENDPOINT_CODE] ON [dbo].[AGENT_MULTITASK_ENDPOINTS] ([restaurant_code] ASC);
    CREATE NONCLUSTERED INDEX [IX_AGENT_ENDPOINT_STATUS] ON [dbo].[AGENT_MULTITASK_ENDPOINTS] ([service_status] ASC, [is_installed] ASC);
    PRINT N'Created table [dbo].[AGENT_MULTITASK_ENDPOINTS] successfully.';
END
ELSE
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='device_type')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [device_type] nvarchar(50) NULL DEFAULT ('RESTAURANT');
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='user_assigned')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [user_assigned] nvarchar(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='notes')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [notes] nvarchar(250) NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='admin_user')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [admin_user] nvarchar(100) NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='admin_pass')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [admin_pass] nvarchar(255) NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='printers_info')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [printers_info] nvarchar(max) NULL;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AGENT_MULTITASK_ENDPOINTS' AND COLUMN_NAME='printers_updated_at')
        ALTER TABLE [dbo].[AGENT_MULTITASK_ENDPOINTS] ADD [printers_updated_at] datetime NULL;
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[AGENT_MULTITASK_LOGS] (Nhật Ký Tác Vụ Điều Khiển & Cập Nhật)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AGENT_MULTITASK_LOGS]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AGENT_MULTITASK_LOGS] (
        [id] int IDENTITY(1,1) NOT NULL,
        [restaurant_code] nvarchar(50) NOT NULL,
        [machine_ip] nvarchar(50) NOT NULL,
        [action_type] nvarchar(50) NOT NULL,
        [command_payload] nvarchar(max) NULL,
        [result_status] nvarchar(50) NOT NULL DEFAULT ('PENDING'),
        [result_message] nvarchar(max) NULL,
        [created_by] nvarchar(100) NOT NULL,
        [created_at] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_AGENT_MULTITASK_LOGS] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    CREATE NONCLUSTERED INDEX [IX_AGENT_LOGS_CODE_DATE] ON [dbo].[AGENT_MULTITASK_LOGS] ([restaurant_code] ASC, [created_at] DESC);
    PRINT N'Created table [dbo].[AGENT_MULTITASK_LOGS] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[AGENT_MULTITASK_SCRIPT_TEMPLATES] (Thư Viện Mẫu Kịch Bản Script / Batch Khởi Chạy Từ Xa)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AGENT_MULTITASK_SCRIPT_TEMPLATES]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AGENT_MULTITASK_SCRIPT_TEMPLATES] (
        [id] int IDENTITY(1,1) NOT NULL,
        [template_name] nvarchar(150) NOT NULL,
        [folder_hint] nvarchar(255) NOT NULL,
        [file_name] nvarchar(255) NOT NULL,
        [arguments] nvarchar(500) NULL,
        [run_as_admin] bit NOT NULL DEFAULT (1),
        [description] nvarchar(255) NULL,
        [created_by] nvarchar(100) NULL,
        [created_at] datetime NOT NULL DEFAULT (getdate()),
        [updated_at] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_AGENT_MULTITASK_SCRIPT_TEMPLATES] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    CREATE NONCLUSTERED INDEX [IX_AGENT_SCRIPT_TEMPLATES_NAME] ON [dbo].[AGENT_MULTITASK_SCRIPT_TEMPLATES] ([template_name] ASC);
    PRINT N'Created table [dbo].[AGENT_MULTITASK_SCRIPT_TEMPLATES] successfully.';

    -- Nạp sẵn các mẫu kịch bản chuẩn nếu chưa có
    INSERT INTO [dbo].[AGENT_MULTITASK_SCRIPT_TEMPLATES] 
    ([template_name], [folder_hint], [file_name], [arguments], [run_as_admin], [description], [created_by], [created_at], [updated_at])
    VALUES 
    (N'Update iPOS TCH', N'Update ipos TCH IT NEW', N'Update iPOS TCH.bat', N'', 1, N'Kịch bản cập nhật hệ thống iPOS TCH tự động', N'system', GETDATE(), GETDATE()),
    (N'Khởi Động Lại GPOS Service', N'GPOS-Setup', N'RestartService.bat', N'', 1, N'Khởi động lại toàn bộ dịch vụ GPOS tại trạm', N'system', GETDATE(), GETDATE());
END
GO

-- ----------------------------------------------------------------------------
-- PHÂN QUYỀN: [dbo].[PHANQUYEN_DETAIL] (Quyền Quản Lý & Điều Khiển Agent Multitask)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[PHANQUYEN_DETAIL]', N'U') IS NOT NULL
BEGIN
    -- Cấp mặc định cho Administrator (id_quyen = '1')
    IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] WHERE [id_quyen] = '1' AND [chucnang] = 'agent_multitask')
        INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active]) VALUES ('1', 'agent_multitask', 1);
    IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] WHERE [id_quyen] = '1' AND [chucnang] = 'view_agent_multitask')
        INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active]) VALUES ('1', 'view_agent_multitask', 1);
    IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] WHERE [id_quyen] = '1' AND [chucnang] = 'update_agent_multitask')
        INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active]) VALUES ('1', 'update_agent_multitask', 1);

    -- Seed cho các nhóm quyền khác (id_quyen <> 1) với trạng thái active = 0 (chỉ Super Admin mới thấy để phân quyền)
    INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active])
    SELECT DISTINCT CAST(id AS nvarchar(50)), 'agent_multitask', 0
    FROM [dbo].[LV_QUYEN]
    WHERE id <> 1
      AND NOT EXISTS (
          SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] 
          WHERE [id_quyen] = CAST([dbo].[LV_QUYEN].id AS nvarchar(50)) 
            AND [chucnang] = 'agent_multitask'
      );
    PRINT N'Initialized agent_multitask permissions in [dbo].[PHANQUYEN_DETAIL] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[AGENT_MULTITASK_PACKAGE_TEMPLATES] (Bộ Chuẩn Gói Cài & Thực Thi Đa Bước)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AGENT_MULTITASK_PACKAGE_TEMPLATES]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AGENT_MULTITASK_PACKAGE_TEMPLATES] (
        [id] int IDENTITY(1,1) NOT NULL,
        [template_name] nvarchar(200) NOT NULL,
        [description] nvarchar(500) NULL,
        [target_folder] nvarchar(255) NULL DEFAULT (N'D:\GPOS-Setup\\app'),
        [package_file_name] nvarchar(255) NULL,
        [auto_extract] bit NOT NULL DEFAULT (1),
        [steps_json] nvarchar(max) NOT NULL DEFAULT (N'[]'),
        [created_by] nvarchar(100) NULL,
        [created_at] datetime NOT NULL DEFAULT (getdate()),
        [updated_by] nvarchar(100) NULL,
        [updated_at] datetime NULL DEFAULT (getdate()),
        CONSTRAINT [PK_AGENT_MULTITASK_PACKAGE_TEMPLATES] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    CREATE NONCLUSTERED INDEX [IX_AGENT_PACKAGE_TEMPLATES_NAME] ON [dbo].[AGENT_MULTITASK_PACKAGE_TEMPLATES] ([template_name] ASC);
    PRINT N'Created table [dbo].[AGENT_MULTITASK_PACKAGE_TEMPLATES] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[SYSTEM_EMAIL_CONFIG] (Cấu Hình Hệ Thống Mail Chung & SMTP)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SYSTEM_EMAIL_CONFIG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SYSTEM_EMAIL_CONFIG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [account_name] nvarchar(100) NOT NULL DEFAULT (N'Mail Chung IT Application'),
        [email_address] nvarchar(255) NOT NULL DEFAULT ('ss.it.application@ggg.com.vn'),
        [email_password] nvarchar(255) NOT NULL DEFAULT ('He110@app8888'),
        [smtp_host] nvarchar(255) NOT NULL DEFAULT ('smtp.office365.com'),
        [smtp_port] int NOT NULL DEFAULT (587),
        [smtp_use_tls] bit NOT NULL DEFAULT (1),
        [default_to] nvarchar(500) NULL,
        [default_cc] nvarchar(500) NOT NULL DEFAULT ('hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;'),
        [client_id] nvarchar(255) NOT NULL DEFAULT ('d3590ed6-52b3-4102-aeff-aad2292ab01c'),
        [updated_by] nvarchar(100) NULL,
        [updated_at] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_SYSTEM_EMAIL_CONFIG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    INSERT INTO [dbo].[SYSTEM_EMAIL_CONFIG] 
    ([account_name], [email_address], [email_password], [smtp_host], [smtp_port], [smtp_use_tls], [default_to], [default_cc], [updated_by])
    VALUES 
    (N'Mail Chung IT Application', 'ss.it.application@ggg.com.vn', 'He110@app8888', 'smtp.office365.com', 587, 1, '', 'hcm.it.appsupport@ggg.com.vn; tuan.pham@ggg.com.vn;', 'dung.nguyenanh');
    PRINT N'Created and seeded table [dbo].[SYSTEM_EMAIL_CONFIG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[USER_EMAIL_SIGNATURE] (Chữ Ký Email Theo Từng User Đăng Nhập)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[USER_EMAIL_SIGNATURE]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[USER_EMAIL_SIGNATURE] (
        [id] int IDENTITY(1,1) NOT NULL,
        [username] nvarchar(100) NOT NULL,
        [full_name] nvarchar(255) NULL,
        [job_title] nvarchar(255) NULL,
        [department] nvarchar(255) NULL DEFAULT (N'GOLDEN GATE GROUP – SOUTH BRANCH'),
        [office_address] nvarchar(500) NULL DEFAULT (N'7th Floor Gigamall, 240-242 Pham Van Dong, Hiep Binh Chanh, Thu Duc, Ho Chi Minh'),
        [office_phone] nvarchar(100) NULL DEFAULT ('028 7300 9000 (ext: 8740)'),
        [mobile] nvarchar(100) NULL,
        [email] nvarchar(255) NULL,
        [website] nvarchar(255) NULL DEFAULT ('www.ggg.com.vn'),
        [signature_html] nvarchar(max) NULL,
        [use_custom_html] bit NOT NULL DEFAULT (0),
        [updated_at] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_USER_EMAIL_SIGNATURE] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [UQ_USER_EMAIL_SIGNATURE_USERNAME] UNIQUE NONCLUSTERED ([username] ASC)
    );
    PRINT N'Created table [dbo].[USER_EMAIL_SIGNATURE] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: [dbo].[WEBMAIL_SENT_LOG] (Nhật Ký Thư Đã Gửi Từ Webmail Tập Trung)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[WEBMAIL_SENT_LOG]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[WEBMAIL_SENT_LOG] (
        [id] int IDENTITY(1,1) NOT NULL,
        [sender_username] nvarchar(100) NOT NULL,
        [from_email] nvarchar(255) NOT NULL,
        [to_emails] nvarchar(max) NOT NULL,
        [cc_emails] nvarchar(max) NULL,
        [subject] nvarchar(500) NULL,
        [body_preview] nvarchar(1000) NULL,
        [attachments_info] nvarchar(max) NULL,
        [status] nvarchar(50) NOT NULL DEFAULT ('SUCCESS'),
        [error_message] nvarchar(max) NULL,
        [sent_at] datetime NOT NULL DEFAULT (getdate()),
        CONSTRAINT [PK_WEBMAIL_SENT_LOG] PRIMARY KEY CLUSTERED ([id] ASC)
    );
    CREATE NONCLUSTERED INDEX [IX_WEBMAIL_SENT_LOG_USER_DATE] ON [dbo].[WEBMAIL_SENT_LOG] ([sender_username] ASC, [sent_at] DESC);
    PRINT N'Created table [dbo].[WEBMAIL_SENT_LOG] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- PHÂN QUYỀN: [dbo].[PHANQUYEN_DETAIL] (Quyền Sử Dụng Webmail Tập Trung)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[PHANQUYEN_DETAIL]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] WHERE [id_quyen] = '1' AND [chucnang] = 'webmail')
        INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active]) VALUES ('1', 'webmail', 1);
    IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] WHERE [id_quyen] = '1' AND [chucnang] = 'view_webmail')
        INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active]) VALUES ('1', 'view_webmail', 1);
    IF NOT EXISTS (SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] WHERE [id_quyen] = '1' AND [chucnang] = 'update_webmail')
        INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active]) VALUES ('1', 'update_webmail', 1);

    -- Seed cho các nhóm quyền khác (id_quyen <> 1) với trạng thái active = 0 (chỉ dung.nguyenanh / Super Admin mới thấy để phân quyền)
    INSERT INTO [dbo].[PHANQUYEN_DETAIL] ([id_quyen], [chucnang], [active])
    SELECT DISTINCT CAST(id AS nvarchar(50)), 'webmail', 0
    FROM [dbo].[LV_QUYEN]
    WHERE id <> 1
      AND NOT EXISTS (
          SELECT 1 FROM [dbo].[PHANQUYEN_DETAIL] 
          WHERE [id_quyen] = CAST([dbo].[LV_QUYEN].id AS nvarchar(50)) 
            AND [chucnang] = 'webmail'
      );
    PRINT N'Initialized webmail permissions in [dbo].[PHANQUYEN_DETAIL] successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: WEBMAIL_USER_READ (Lưu Vết Trạng Thái Đã Đọc Email Theo Từng User Đăng Nhập)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[WEBMAIL_USER_READ]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WEBMAIL_USER_READ] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(100) NOT NULL,
        [message_id] NVARCHAR(255) NOT NULL,
        [read_at] DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT [UQ_WEBMAIL_USER_READ] UNIQUE ([username], [message_id])
    );
    CREATE INDEX [IX_WEBMAIL_USER_READ_USER] ON [dbo].[WEBMAIL_USER_READ]([username]);
    CREATE INDEX [IX_WEBMAIL_USER_READ_MSG] ON [dbo].[WEBMAIL_USER_READ]([message_id]);
    PRINT N'Table [dbo].[WEBMAIL_USER_READ] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: WEBMAIL_INBOX_CACHE (Bộ Đệm Hộp Thư Đến Cho Phép Đánh Dấu Đã Đọc M365 Ngay Khi Tải)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[WEBMAIL_INBOX_CACHE]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WEBMAIL_INBOX_CACHE] (
        [id] NVARCHAR(255) PRIMARY KEY,
        [subject] NVARCHAR(500) NULL,
        [sender_name] NVARCHAR(255) NULL,
        [sender_email] NVARCHAR(255) NULL,
        [received_time_vn] NVARCHAR(100) NULL,
        [received_time_raw] NVARCHAR(100) NULL,
        [received_datetime] DATETIME NULL,
        [has_attachments] BIT NOT NULL DEFAULT 0,
        [preview] NVARCHAR(MAX) NULL,
        [importance] NVARCHAR(50) NOT NULL DEFAULT 'normal',
        [created_at] DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX [IX_WEBMAIL_INBOX_CACHE_TIME] ON [dbo].[WEBMAIL_INBOX_CACHE] ([received_datetime] DESC);
    PRINT N'Table [dbo].[WEBMAIL_INBOX_CACHE] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: WEBMAIL_DETAIL_CACHE (Bộ Đệm Chi Tiết Nội Dung & Ảnh Email Mở Tức Thì 0ms)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[WEBMAIL_DETAIL_CACHE]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[WEBMAIL_DETAIL_CACHE] (
        [id] NVARCHAR(255) PRIMARY KEY,
        [subject] NVARCHAR(500) NULL,
        [sender_name] NVARCHAR(255) NULL,
        [sender_email] NVARCHAR(255) NULL,
        [to_recipients_json] NVARCHAR(MAX) NULL,
        [cc_recipients_json] NVARCHAR(MAX) NULL,
        [received_time_vn] NVARCHAR(100) NULL,
        [received_time_raw] NVARCHAR(100) NULL,
        [has_attachments] BIT NOT NULL DEFAULT 0,
        [attachments_json] NVARCHAR(MAX) NULL,
        [body_type] NVARCHAR(50) NULL DEFAULT 'html',
        [body_content] NVARCHAR(MAX) NULL,
        [importance] NVARCHAR(50) NULL DEFAULT 'normal',
        [sent_by_user] NVARCHAR(100) NULL,
        [cached_at] DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX [IX_WEBMAIL_DETAIL_CACHE_TIME] ON [dbo].[WEBMAIL_DETAIL_CACHE] ([cached_at] DESC);
    PRINT N'Table [dbo].[WEBMAIL_DETAIL_CACHE] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: MANAGED_APIS (Cổng Quản Lý & Điều Khiển Bật / Tắt Các Link API Hệ Thống)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[MANAGED_APIS]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MANAGED_APIS] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [api_code] NVARCHAR(100) NOT NULL UNIQUE,
        [api_name] NVARCHAR(250) NOT NULL,
        [endpoint_path] NVARCHAR(255) NOT NULL,
        [alias_path] NVARCHAR(255) NULL,
        [method] NVARCHAR(20) NOT NULL DEFAULT 'GET',
        [description] NVARCHAR(500) NULL,
        [is_enabled] BIT NOT NULL DEFAULT 1,
        [require_api_key] BIT NOT NULL DEFAULT 0,
        [api_key] NVARCHAR(100) NULL,
        [created_by] NVARCHAR(100) NULL,
        [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME NULL DEFAULT GETDATE()
    );
    CREATE INDEX [IX_MANAGED_APIS_CODE] ON [dbo].[MANAGED_APIS] ([api_code]);
    PRINT N'Table [dbo].[MANAGED_APIS] created successfully.';

    INSERT INTO [dbo].[MANAGED_APIS] 
    ([api_code], [api_name], [endpoint_path], [alias_path], [method], [description], [is_enabled], [require_api_key], [created_by])
    VALUES
    ('ncc_restaurants', N'API Thông Tin Nhà Hàng Cho NCC (Mã SAP 4 số, Tên NH, IP WAN)', '/api/v1/restaurants/ncc', '/api/v1/partner/restaurants', 'GET', N'Cung cấp danh sách nhà hàng đang hoạt động (trangthai = ON) có mã SAP đúng 4 số cho Nhà Cung Cấp (NCC) và đối tác tự động đồng bộ.', 1, 1, 'system');
    UPDATE [dbo].[MANAGED_APIS] SET [require_api_key] = 1, [api_key] = 'ggg_ncc_secure_2026' WHERE [api_code] = 'ncc_restaurants';
END
GO

-- Bổ sung cột thống kê request vào MANAGED_APIS nếu chưa có
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MANAGED_APIS' AND COLUMN_NAME = 'total_requests')
BEGIN
    ALTER TABLE [dbo].[MANAGED_APIS] ADD [total_requests] INT NOT NULL DEFAULT 0;
END
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MANAGED_APIS' AND COLUMN_NAME = 'last_requested_at')
BEGIN
    ALTER TABLE [dbo].[MANAGED_APIS] ADD [last_requested_at] DATETIME NULL;
END
GO
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MANAGED_APIS' AND COLUMN_NAME = 'last_client_ip')
BEGIN
    ALTER TABLE [dbo].[MANAGED_APIS] ADD [last_client_ip] NVARCHAR(100) NULL;
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: MANAGED_API_LOGS (Nhật Ký & Thống Kê Truy Vấn API - Bắt Spam & Quá Tải)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[MANAGED_API_LOGS]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MANAGED_API_LOGS] (
        [id] BIGINT IDENTITY(1,1) PRIMARY KEY,
        [api_code] NVARCHAR(100) NOT NULL,
        [endpoint_called] NVARCHAR(500) NULL,
        [client_ip] NVARCHAR(100) NULL,
        [method] NVARCHAR(10) NOT NULL DEFAULT 'GET',
        [status_code] INT NOT NULL DEFAULT 200,
        [response_time_ms] INT NULL DEFAULT 0,
        [user_agent] NVARCHAR(500) NULL,
        [query_params] NVARCHAR(500) NULL,
        [requested_at] DATETIME NOT NULL DEFAULT GETDATE()
    );

    CREATE INDEX [IX_MANAGED_API_LOGS_CODE_TIME] 
    ON [dbo].[MANAGED_API_LOGS] ([api_code], [requested_at] DESC);

    CREATE INDEX [IX_MANAGED_API_LOGS_IP] 
    ON [dbo].[MANAGED_API_LOGS] ([client_ip], [requested_at] DESC);

    PRINT N'Table [dbo].[MANAGED_API_LOGS] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: GPMS_REPORT_BATCHES (Lưu trữ các kỳ & file Excel Báo Cáo GPMS đã nạp)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[GPMS_REPORT_BATCHES]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GPMS_REPORT_BATCHES] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [report_name] NVARCHAR(255) NOT NULL,
        [file_name] NVARCHAR(255) NOT NULL,
        [period_label] NVARCHAR(100) NULL,
        [export_at] DATETIME NULL,
        [total_rows] INT NOT NULL DEFAULT 0,
        [unique_senders] INT NOT NULL DEFAULT 0,
        [unique_receivers] INT NOT NULL DEFAULT 0,
        [source_type] NVARCHAR(30) NOT NULL DEFAULT 'UPLOAD',
        [payload_gzip_b64] VARCHAR(MAX) NOT NULL,
        [uploaded_by] NVARCHAR(100) NULL,
        [uploaded_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [is_active] BIT NOT NULL DEFAULT 1
    );
    PRINT N'Table [dbo].[GPMS_REPORT_BATCHES] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: GPMS_REGION_CONFIG (Cấu hình danh sách User Miền Nam cho Báo Cáo GPMS)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[GPMS_REGION_CONFIG]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[GPMS_REGION_CONFIG] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [username] NVARCHAR(100) NOT NULL UNIQUE,
        [full_name] NVARCHAR(200) NULL,
        [region] NVARCHAR(20) NOT NULL DEFAULT 'NAM',
        [note] NVARCHAR(255) NULL,
        [updated_by] NVARCHAR(100) NULL,
        [updated_at] DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX [IX_GPMS_REGION_CONFIG_USER] ON [dbo].[GPMS_REGION_CONFIG] ([username]);
    PRINT N'Table [dbo].[GPMS_REGION_CONFIG] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: HOTLINE_3CX_MEMBERS (Danh mục nhân sự & máy nhánh trực hotline 3CX)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[HOTLINE_3CX_MEMBERS]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HOTLINE_3CX_MEMBERS] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [ext_line] NVARCHAR(20) NOT NULL UNIQUE,
        [full_name] NVARCHAR(200) NOT NULL,
        [department] NVARCHAR(100) NULL DEFAULT N'',
        [is_active] BIT NOT NULL DEFAULT 1,
        [sort_order] INT NOT NULL DEFAULT 0,
        [created_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX [IX_HOTLINE_3CX_MEMBERS_LINE] ON [dbo].[HOTLINE_3CX_MEMBERS] ([ext_line]);
    PRINT N'Table [dbo].[HOTLINE_3CX_MEMBERS] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: HOTLINE_3CX_SCHEDULES (Lịch gán line trực hotline 3CX theo ngày)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[HOTLINE_3CX_SCHEDULES]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HOTLINE_3CX_SCHEDULES] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [duty_date] DATE NOT NULL UNIQUE,
        [shift_mode] NVARCHAR(20) NOT NULL DEFAULT N'AUTO',
        [morning_lines_json] NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        [evening_lines_json] NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        [weekend_lines_json] NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        [weekend_evening_override_json] NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        [note] NVARCHAR(500) NULL,
        [updated_by] NVARCHAR(100) NULL,
        [updated_at] DATETIME NOT NULL DEFAULT GETDATE()
    );
    CREATE INDEX [IX_HOTLINE_3CX_SCHEDULES_DATE] ON [dbo].[HOTLINE_3CX_SCHEDULES] ([duty_date]);
    PRINT N'Table [dbo].[HOTLINE_3CX_SCHEDULES] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: HOTLINE_3CX_SYNC_LOGS (Nhật ký đồng bộ Playwright vào portal 3CX)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[HOTLINE_3CX_SYNC_LOGS]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HOTLINE_3CX_SYNC_LOGS] (
        [id] INT IDENTITY(1,1) PRIMARY KEY,
        [duty_date] DATE NOT NULL,
        [shift_code] NVARCHAR(20) NOT NULL,
        [queue_name] NVARCHAR(150) NOT NULL,
        [applied_lines_json] NVARCHAR(MAX) NOT NULL DEFAULT N'[]',
        [status] NVARCHAR(20) NOT NULL,
        [is_dry_run] BIT NOT NULL DEFAULT 0,
        [triggered_by] NVARCHAR(100) NULL,
        [error_message] NVARCHAR(MAX) NULL,
        [screenshot_path] NVARCHAR(500) NULL,
        [started_at] DATETIME NOT NULL DEFAULT GETDATE(),
        [finished_at] DATETIME NULL
    );
    CREATE INDEX [IX_HOTLINE_3CX_SYNC_LOGS_DATE_SHIFT] ON [dbo].[HOTLINE_3CX_SYNC_LOGS] ([duty_date], [shift_code]);
    PRINT N'Table [dbo].[HOTLINE_3CX_SYNC_LOGS] created successfully.';
END
GO

-- ----------------------------------------------------------------------------
-- BẢNG: HOTLINE_3CX_CONFIG (Cấu hình kết nối & tham số tự động trực hotline 3CX)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'[dbo].[HOTLINE_3CX_CONFIG]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[HOTLINE_3CX_CONFIG] (
        [id] INT PRIMARY KEY,
        [portal_url] NVARCHAR(500) NOT NULL DEFAULT N'https://ggg.ringbot.co:5001/#/login',
        [username] NVARCHAR(100) NOT NULL DEFAULT N'8740',
        [password_enc] NVARCHAR(500) NOT NULL DEFAULT N'',
        [day_queue_name] NVARCHAR(150) NOT NULL DEFAULT N'IT HCM App Day',
        [night_queue_name] NVARCHAR(150) NOT NULL DEFAULT N'IT HCM App Night',
        [morning_time] NVARCHAR(10) NOT NULL DEFAULT N'06:00',
        [evening_time] NVARCHAR(10) NOT NULL DEFAULT N'16:29',
        [alert_emails] NVARCHAR(1000) NOT NULL DEFAULT N'dung.nguyenanh@ggg.com.vn',
        [updated_at] DATETIME NOT NULL DEFAULT GETDATE()
    );
    PRINT N'Table [dbo].[HOTLINE_3CX_CONFIG] created successfully.';
END
GO

IF OBJECT_ID(N'[dbo].[HOTLINE_3CX_CONFIG]', N'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [dbo].[HOTLINE_3CX_CONFIG] WHERE [id] = 1)
BEGIN
    INSERT INTO [dbo].[HOTLINE_3CX_CONFIG] ([id], [portal_url], [username], [password_enc], [day_queue_name], [night_queue_name], [morning_time], [evening_time], [alert_emails], [updated_at])
    VALUES (1, N'https://ggg.ringbot.co:5001/#/login', N'8740', N'', N'IT HCM App Day', N'IT HCM App Night', N'06:00', N'16:29', N'dung.nguyenanh@ggg.com.vn', GETDATE());
    PRINT N'Default row id=1 inserted into [dbo].[HOTLINE_3CX_CONFIG].';
END
GO
