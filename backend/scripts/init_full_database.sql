-- =========================================================================================
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
-- -----------------------------------------------------------------------------------------
-- BANG: REGION
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.REGION', 'U') IS NULL
BEGIN
CREATE TABLE [REGION] (
	id INTEGER NOT NULL IDENTITY, 
	ma_tinhthanh NVARCHAR(100) NULL, 
	ten_tinhthanh NVARCHAR(250) NULL, 
	bienso VARCHAR(100) NULL, 
	timkiem TEXT NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang REGION thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: BRAND
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.BRAND', 'U') IS NULL
BEGIN
CREATE TABLE [BRAND] (
	id INTEGER NOT NULL IDENTITY, 
	mabrand NVARCHAR(100) NULL, 
	tenbrand NVARCHAR(250) NULL, 
	ngay_insert DATETIME NULL, 
	user_them VARCHAR(100) NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang BRAND thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: SOFTWARE_VERSIONS
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.SOFTWARE_VERSIONS', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[SOFTWARE_VERSIONS] (
	id INTEGER NOT NULL IDENTITY, 
	phan_mem NVARCHAR(100) NOT NULL, 
	phien_ban NVARCHAR(100) NOT NULL, 
	ngay_update DATETIME NOT NULL, 
	noi_dung_update NTEXT NULL, 
	nguoi_update NVARCHAR(100) NULL, 
	active BIT NOT NULL, 
	created_at DATETIME NULL, 
	updated_at DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang SOFTWARE_VERSIONS thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: BRAND_PRINT_STANDARDS
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.BRAND_PRINT_STANDARDS', 'U') IS NULL
BEGIN
CREATE TABLE [BRAND_PRINT_STANDARDS] (
	id INTEGER NOT NULL IDENTITY, 
	brand_name NVARCHAR(100) NOT NULL, 
	loai_in NVARCHAR(100) NOT NULL, 
	tieu_de NVARCHAR(255) NULL, 
	ghi_chu NTEXT NULL, 
	images NTEXT NULL, 
	files NTEXT NULL, 
	nguoi_tao NVARCHAR(100) NULL, 
	nguoi_update NVARCHAR(100) NULL, 
	ngay_tao DATETIME NULL, 
	ngay_update DATETIME NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang BRAND_PRINT_STANDARDS thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: LV_QUYEN
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.LV_QUYEN', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[LV_QUYEN] (
	id INTEGER NOT NULL IDENTITY, 
	tenquyen VARCHAR(50) NULL, 
	noidung VARCHAR(250) NULL, 
	capbac VARCHAR(50) NULL, 
	ghichu VARCHAR(250) NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang LV_QUYEN thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: LIST_USER
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.LIST_USER', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[LIST_USER] (
	id INTEGER NOT NULL IDENTITY, 
	user_name1 VARCHAR(50) NOT NULL, 
	pass VARCHAR(200) NOT NULL, 
	full_name VARCHAR(200) NULL, 
	email VARCHAR(200) NULL, 
	manv VARCHAR(100) NULL, 
	ngay_insert DATETIME NULL, 
	ngay_update DATETIME NULL, 
	note TEXT NULL, 
	phanquyen VARCHAR(100) NULL, 
	active BIT NULL, 
	quyen_mo_rong VARCHAR(100) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang LIST_USER thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: PHANQUYEN_DETAIL
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.PHANQUYEN_DETAIL', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[PHANQUYEN_DETAIL] (
	id INTEGER NOT NULL IDENTITY, 
	id_quyen NVARCHAR(50) NOT NULL, 
	chucnang NVARCHAR(250) NOT NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang PHANQUYEN_DETAIL thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: LOGS
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.LOGS', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[LOGS] (
	id INTEGER NOT NULL IDENTITY, 
	manhinh NVARCHAR(250) NULL, 
	chucnang NVARCHAR(100) NULL, 
	user_thuchien NVARCHAR(200) NULL, 
	noidung NTEXT NULL, 
	ngay_insert DATETIME NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang LOGS thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: RESTAURANT
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.RESTAURANT', 'U') IS NULL
BEGIN
CREATE TABLE [RESTAURANT] (
	id INTEGER NOT NULL IDENTITY, 
	res NVARCHAR(250) NULL, 
	sap NVARCHAR(40) NULL, 
	coscenter NVARCHAR(40) NULL, 
	rk7 NVARCHAR(40) NULL, 
	sap_old NVARCHAR(10) NULL, 
	oracale NVARCHAR(50) NULL, 
	don_gia NVARCHAR(50) NULL, 
	address NTEXT NULL, 
	region NVARCHAR(50) NULL, 
	brand NVARCHAR(50) NULL, 
	sdt_nh NVARCHAR(50) NULL, 
	email NVARCHAR(100) NULL, 
	trangthai NVARCHAR(10) NULL, 
	status NVARCHAR(20) NULL, 
	active BIT NULL, 
	ngay_khaitruong DATETIME NULL, 
	ip NVARCHAR(50) NULL, 
	ip_wan NVARCHAR(50) NULL, 
	teamview_pc NVARCHAR(50) NULL, 
	teamview_pos11 NVARCHAR(50) NULL, 
	teamview_pos12 NVARCHAR(50) NULL, 
	rustdesk_pos11 NVARCHAR(50) NULL, 
	rustdesk_pos12 NVARCHAR(50) NULL, 
	pass_ou_ko_sys NVARCHAR(100) NULL, 
	user_ftth NVARCHAR(100) NULL, 
	pass_ftth NVARCHAR(100) NULL, 
	thanhtoan_ftth NVARCHAR(250) NULL, 
	ngay_online_ftth DATETIME NULL, 
	dk_truyenthong NVARCHAR(250) NULL, 
	pass_mail NVARCHAR(100) NULL, 
	ext NVARCHAR(50) NULL, 
	sys_sales NVARCHAR(10) NULL, 
	note NTEXT NULL, 
	timkiem NTEXT NULL, 
	ngay_insert DATETIME NULL, 
	user_insert NVARCHAR(100) NULL, 
	ngay_update DATETIME NULL, 
	user_update NVARCHAR(100) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang RESTAURANT thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: EXT_RSC
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.EXT_RSC', 'U') IS NULL
BEGIN
CREATE TABLE [EXT_RSC] (
	id INTEGER NOT NULL IDENTITY, 
	nhanvien VARCHAR(255) NULL, 
	email VARCHAR(255) NULL, 
	manv VARCHAR(50) NULL, 
	so_ext VARCHAR(50) NULL, 
	phongban VARCHAR(255) NULL, 
	note VARCHAR(max) NULL, 
	ngay_insert DATETIME NULL, 
	user_insert VARCHAR(50) NULL, 
	ngay_update DATETIME NULL, 
	user_update VARCHAR(50) NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang EXT_RSC thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CODE_PHOTO
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CODE_PHOTO', 'U') IS NULL
BEGIN
CREATE TABLE [CODE_PHOTO] (
	id INTEGER NOT NULL IDENTITY, 
	hientrang VARCHAR(50) NULL, 
	manv VARCHAR(50) NULL, 
	name VARCHAR(255) NULL, 
	email VARCHAR(255) NULL, 
	pass_code VARCHAR(50) NULL, 
	cmnd_sdt VARCHAR(50) NULL, 
	cty VARCHAR(255) NULL, 
	donvi VARCHAR(255) NULL, 
	bophan VARCHAR(255) NULL, 
	chucdanh VARCHAR(255) NULL, 
	code_dept VARCHAR(50) NULL, 
	note VARCHAR(max) NULL, 
	ngay_insert DATETIME NULL, 
	ngay_update DATETIME NULL, 
	user_insert VARCHAR(50) NULL, 
	user_update VARCHAR(50) NULL, 
	timkiem VARCHAR(max) NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang CODE_PHOTO thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: LICHTRUC_HOTLINE
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.LICHTRUC_HOTLINE', 'U') IS NULL
BEGIN
CREATE TABLE [LICHTRUC_HOTLINE] (
	id INTEGER NOT NULL IDENTITY, 
	[THANG] NVARCHAR(50) NULL, 
	[NOIDUNG] NTEXT NULL, 
	[NGAY_INSERT] DATETIME NULL, 
	[USER_INSERT] NVARCHAR(50) NULL, 
	[TEAM] NVARCHAR(50) NULL, 
	[ACTIVE] BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang LICHTRUC_HOTLINE thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: GHINHAN_SUVU
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.GHINHAN_SUVU', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[GHINHAN_SUVU] (
	id INTEGER NOT NULL IDENTITY, 
	[APPNAME] NVARCHAR(250) NULL, 
	[NOIDUNG] NTEXT NULL, 
	[TRANGTHAI] BIT NULL, 
	[DATE_INSERT] DATETIME NULL, 
	[DATE_LOI] DATETIME NULL, 
	[USER_INSERT] NVARCHAR(150) NULL, 
	[ACTIVE] BIT NULL, 
	[IS_PRIVATE] BIT NULL, 
	[RESTAURANT_ID] INTEGER NULL, 
	[RESTAURANT_NAME] NVARCHAR(500) NULL, 
	[SAP_CODE] NVARCHAR(50) NULL, 
	[RK7_CODE] NVARCHAR(50) NULL, 
	[IP_ADDRESS] NVARCHAR(50) NULL, 
	[ASSIGN_TYPE] NVARCHAR(50) NULL, 
	[ASSIGNED_TO] NVARCHAR(100) NULL, 
	[ASSIGNED_NAME] NVARCHAR(200) NULL, 
	[PROGRESS_NOTES] NTEXT NULL, 
	[IMAGES] NTEXT NULL, 
	[FILES] NTEXT NULL, 
	[RESOLVED_AT] DATETIME NULL, 
	[RESOLVED_BY] NVARCHAR(100) NULL, 
	[DATE_UPDATE] DATETIME NULL, 
	[USER_UPDATE] NVARCHAR(100) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang GHINHAN_SUVU thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: GHINHAN_SAIPHAM
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.GHINHAN_SAIPHAM', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[GHINHAN_SAIPHAM] (
	id INTEGER NOT NULL IDENTITY, 
	[NGUOI_SAIPHAMM] NVARCHAR(250) NULL, 
	[HO_TEN] NVARCHAR(200) NULL, 
	[NOIDUNG] NTEXT NULL, 
	[LOAI_SAIPHAM] NVARCHAR(100) NULL, 
	[DATE_SAIPHAM] DATETIME NULL, 
	[GIAITRINH] NTEXT NULL, 
	[TRANGTHAI] BIT NULL, 
	[IMAGES] NTEXT NULL, 
	[FILES] NTEXT NULL, 
	[DATE_INSERT] DATETIME NULL, 
	[DATE_UPDATE] DATETIME NULL, 
	[USER_INSERT] NVARCHAR(150) NULL, 
	[USER_UPDATE] NVARCHAR(150) NULL, 
	[ACTIVE] BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang GHINHAN_SAIPHAM thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: GHINHAN_SUCO_HETHONG
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.GHINHAN_SUCO_HETHONG', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[GHINHAN_SUCO_HETHONG] (
	id INTEGER NOT NULL IDENTITY, 
	tieude NVARCHAR(250) NOT NULL, 
	he_thong NVARCHAR(100) NULL, 
	muc_do NVARCHAR(50) NULL, 
	thoi_gian_bat_dau DATETIME NOT NULL, 
	thoi_gian_ket_thuc DATETIME NULL, 
	thoi_gian_gian_doan_phut INTEGER NULL, 
	noi_dung NTEXT NOT NULL, 
	nguyen_nhan NTEXT NULL, 
	bien_phap_khac_phuc NTEXT NULL, 
	trang_thai NVARCHAR(50) NOT NULL, 
	nguoi_ghi_nhan NVARCHAR(100) NULL, 
	nguoi_xu_ly NVARCHAR(100) NULL, 
	ghi_chu_tien_do NTEXT NULL, 
	images NTEXT NULL, 
	files NTEXT NULL, 
	active BIT NOT NULL, 
	created_at DATETIME NULL, 
	updated_at DATETIME NULL, 
	resolved_at DATETIME NULL, 
	resolved_by NVARCHAR(100) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang GHINHAN_SUCO_HETHONG thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: MEMO
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.MEMO', 'U') IS NULL
BEGIN
CREATE TABLE [MEMO] (
	id INTEGER NOT NULL IDENTITY, 
	ma_memo NVARCHAR(50) NULL, 
	subject_mail NTEXT NULL, 
	ngay_batdau DATETIME NULL, 
	ngay_ketthuc DATETIME NULL, 
	it_setup NVARCHAR(50) NULL, 
	giahan NVARCHAR(50) NULL, 
	ngay_tiepnhan DATETIME NULL, 
	trangthai NVARCHAR(100) NULL, 
	hoanthanh NVARCHAR(100) NULL, 
	nguoi_gui NVARCHAR(100) NULL, 
	huong_dan NTEXT NULL, 
	ten_file_memo NVARCHAR(250) NULL, 
	note NTEXT NULL, 
	ngay_insert DATETIME NULL, 
	ngay_update DATETIME NULL, 
	active BIT NULL, 
	[ReviewStatus] NVARCHAR(20) NULL, 
	[ReviewNote] NVARCHAR(500) NULL, 
	[ReviewedBy] NVARCHAR(100) NULL, 
	[ReviewedAt] DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang MEMO thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: MEMO_TEMPLATE_CONFIG
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.MEMO_TEMPLATE_CONFIG', 'U') IS NULL
BEGIN
CREATE TABLE [MEMO_TEMPLATE_CONFIG] (
	id INTEGER NOT NULL IDENTITY, 
	config_key NVARCHAR(100) NULL, 
	config_val NTEXT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang MEMO_TEMPLATE_CONFIG thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: MEMO_TEMPLATE_BRANDS
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.MEMO_TEMPLATE_BRANDS', 'U') IS NULL
BEGIN
CREATE TABLE [MEMO_TEMPLATE_BRANDS] (
	id INTEGER NOT NULL IDENTITY, 
	brand_name NVARCHAR(100) NULL, 
	cc_emails NTEXT NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang MEMO_TEMPLATE_BRANDS thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: LIST_SETUP_NH_NEW
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.LIST_SETUP_NH_NEW', 'U') IS NULL
BEGIN
CREATE TABLE [LIST_SETUP_NH_NEW] (
	id INTEGER NOT NULL IDENTITY, 
	[TEN_NH] NTEXT NULL, 
	[NGAY_DUKIEN_KHAITRUONG] DATETIME NULL, 
	[IT_PHUTRACH] NVARCHAR(250) NULL, 
	[AM_PHUTRACH] NVARCHAR(250) NULL, 
	[NOTE_THEM] NTEXT NULL, 
	[TRANGTHAI] NVARCHAR(250) NULL, 
	[NGAY_INSERT] DATETIME NULL, 
	[NGAY_UPDATE] DATETIME NULL, 
	[ACTIVE] BIT NULL, 
	[ReviewStatus] NVARCHAR(20) NULL, 
	[ReviewNote] NVARCHAR(500) NULL, 
	[ReviewedBy] NVARCHAR(100) NULL, 
	[ReviewedAt] DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang LIST_SETUP_NH_NEW thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHECKLIST_SETUP_NH_NEW
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHECKLIST_SETUP_NH_NEW', 'U') IS NULL
BEGIN
CREATE TABLE [CHECKLIST_SETUP_NH_NEW] (
	id INTEGER NOT NULL IDENTITY, 
	[NOIDUNG] NTEXT NULL, 
	[GHICHU] NTEXT NULL, 
	[NHOM] NTEXT NULL, 
	[STT] INTEGER NULL, 
	[ACTIVE] BIT NULL, 
	[NGAY_INSERT] DATETIME NULL, 
	[NGAY_UPDATE] DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang CHECKLIST_SETUP_NH_NEW thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHECKLIST_SETUP_NH_NEW_DETAIL
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHECKLIST_SETUP_NH_NEW_DETAIL', 'U') IS NULL
BEGIN
CREATE TABLE [CHECKLIST_SETUP_NH_NEW_DETAIL] (
	id INTEGER NOT NULL IDENTITY, 
	[ID_NH_NEW] INTEGER NOT NULL, 
	[STT] INTEGER NULL, 
	[NOIDUNG] NTEXT NULL, 
	[NHOM] NTEXT NULL, 
	[NGAY_INSERT] DATETIME NULL, 
	[GHICHU] NTEXT NULL, 
	[HOANTHANH] NVARCHAR(10) NULL, 
	[NGAY_HOANTHANH] DATETIME NULL, 
	[USER_HOANTHANH] NVARCHAR(100) NULL, 
	[ACTIVE] BIT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY([ID_NH_NEW]) REFERENCES [LIST_SETUP_NH_NEW] (id) ON DELETE CASCADE
);
    PRINT N'[OK] Tao bang CHECKLIST_SETUP_NH_NEW_DETAIL thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHECKLIST_TEMPLATE
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHECKLIST_TEMPLATE', 'U') IS NULL
BEGIN
CREATE TABLE [CHECKLIST_TEMPLATE] (
	id INTEGER NOT NULL IDENTITY, 
	ten_suon NVARCHAR(255) NOT NULL, 
	ma_suon NVARCHAR(100) NULL, 
	danh_muc NVARCHAR(100) NULL, 
	mo_ta NTEXT NULL, 
	nguoi_tao NVARCHAR(100) NULL, 
	sla_days INTEGER NULL, 
	ngay_tao DATETIME NULL, 
	ngay_update DATETIME NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang CHECKLIST_TEMPLATE thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHECKLIST_TEMPLATE_ITEM
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHECKLIST_TEMPLATE_ITEM', 'U') IS NULL
BEGIN
CREATE TABLE [CHECKLIST_TEMPLATE_ITEM] (
	id INTEGER NOT NULL IDENTITY, 
	template_id INTEGER NOT NULL, 
	nhom NVARCHAR(150) NULL, 
	tieu_de NTEXT NOT NULL, 
	huong_dan NTEXT NULL, 
	stt INTEGER NULL, 
	active BIT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(template_id) REFERENCES [CHECKLIST_TEMPLATE] (id) ON DELETE CASCADE
);
    PRINT N'[OK] Tao bang CHECKLIST_TEMPLATE_ITEM thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHECKLIST_RUN
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHECKLIST_RUN', 'U') IS NULL
BEGIN
CREATE TABLE [CHECKLIST_RUN] (
	id INTEGER NOT NULL IDENTITY, 
	template_id INTEGER NOT NULL, 
	ten_dot NVARCHAR(255) NOT NULL, 
	ten_suon NVARCHAR(255) NULL, 
	version_note NVARCHAR(255) NULL, 
	ghi_chu NTEXT NULL, 
	nguoi_thuc_hien NVARCHAR(250) NULL, 
	nguoi_tao NVARCHAR(100) NULL, 
	trang_thai NVARCHAR(50) NULL, 
	sla_days INTEGER NULL, 
	han_chot_sla DATETIME NULL, 
	ngay_bat_dau DATETIME NULL, 
	ngay_hoan_thanh DATETIME NULL, 
	ngay_tao DATETIME NULL, 
	ngay_update DATETIME NULL, 
	active BIT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(template_id) REFERENCES [CHECKLIST_TEMPLATE] (id)
);
    PRINT N'[OK] Tao bang CHECKLIST_RUN thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CHECKLIST_RUN_ITEM
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CHECKLIST_RUN_ITEM', 'U') IS NULL
BEGIN
CREATE TABLE [CHECKLIST_RUN_ITEM] (
	id INTEGER NOT NULL IDENTITY, 
	run_id INTEGER NOT NULL, 
	stt INTEGER NULL, 
	nhom NVARCHAR(150) NULL, 
	tieu_de NTEXT NOT NULL, 
	huong_dan NTEXT NULL, 
	trang_thai NVARCHAR(20) NULL, 
	ghi_chu_ket_qua NTEXT NULL, 
	images NTEXT NULL, 
	nguoi_hoan_thanh NVARCHAR(100) NULL, 
	ngay_hoan_thanh DATETIME NULL, 
	active BIT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(run_id) REFERENCES [CHECKLIST_RUN] (id) ON DELETE CASCADE
);
    PRINT N'[OK] Tao bang CHECKLIST_RUN_ITEM thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: PIM
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.PIM', 'U') IS NULL
BEGIN
CREATE TABLE [PIM] (
	id INTEGER NOT NULL IDENTITY, 
	id_yeu_cau NVARCHAR(50) NOT NULL, 
	chuoi NVARCHAR(150) NULL, 
	ten_menu NVARCHAR(250) NULL, 
	mo_ta NTEXT NULL, 
	thoi_gian_thuc_hien DATETIME NULL, 
	link_yeu_cau NVARCHAR(500) NULL, 
	ngay_insert DATETIME NULL, 
	trang_thai_thuc_hien NVARCHAR(50) NULL, 
	user_thuc_hien NVARCHAR(100) NULL, 
	user_hoan_thanh NVARCHAR(100) NULL, 
	user_update NVARCHAR(100) NULL, 
	thoi_gian_hoan_thanh DATETIME NULL, 
	thoi_gian_update DATETIME NULL, 
	so NVARCHAR(50) NULL, 
	gui_mail NVARCHAR(50) NULL, 
	PRIMARY KEY (id), 
	UNIQUE (id_yeu_cau)
);
    PRINT N'[OK] Tao bang PIM thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: PIM_USER_THUCHIEN
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.PIM_USER_THUCHIEN', 'U') IS NULL
BEGIN
CREATE TABLE [PIM_USER_THUCHIEN] (
	id INTEGER NOT NULL IDENTITY, 
	ten_user NVARCHAR(50) NOT NULL, 
	ho_ten NVARCHAR(100) NULL, 
	email NVARCHAR(150) NULL, 
	thu_tu INTEGER NOT NULL, 
	active BIT NULL, 
	ngay_tao DATETIME NULL, 
	PRIMARY KEY (id), 
	UNIQUE (ten_user)
);
    PRINT N'[OK] Tao bang PIM_USER_THUCHIEN thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: PIM_LOG
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.PIM_LOG', 'U') IS NULL
BEGIN
CREATE TABLE [PIM_LOG] (
	id INTEGER NOT NULL IDENTITY, 
	id_yeu_cau NVARCHAR(50) NOT NULL, 
	hanh_dong NVARCHAR(100) NOT NULL, 
	noi_dung NTEXT NULL, 
	user_thuc_hien NVARCHAR(100) NULL, 
	thoi_gian DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang PIM_LOG thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: PIM_CONFIG
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.PIM_CONFIG', 'U') IS NULL
BEGIN
CREATE TABLE [PIM_CONFIG] (
	id INTEGER NOT NULL IDENTITY, 
	sso_username NVARCHAR(255) NOT NULL, 
	sso_password NVARCHAR(255) NOT NULL, 
	ngay_cap_nhat DATETIME NULL, 
	user_cap_nhat NVARCHAR(100) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang PIM_CONFIG thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: PIM_SCHEDULE
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.PIM_SCHEDULE', 'U') IS NULL
BEGIN
CREATE TABLE [PIM_SCHEDULE] (
	id INTEGER NOT NULL IDENTITY, 
	time_1 VARCHAR(10) NOT NULL, 
	time_2 VARCHAR(10) NOT NULL, 
	time_3 VARCHAR(10) NOT NULL, 
	is_active BIT NOT NULL, 
	last_run DATETIME NULL, 
	last_status NVARCHAR(255) NULL, 
	ngay_cap_nhat DATETIME NULL, 
	user_cap_nhat NVARCHAR(100) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang PIM_SCHEDULE thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: Projects
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.Projects', 'U') IS NULL
BEGIN
CREATE TABLE [Projects] (
	[ProjectID] INTEGER NOT NULL IDENTITY, 
	[ProjectName] NVARCHAR(255) NOT NULL, 
	[Status] VARCHAR(20) NOT NULL, 
	[Deadline] DATETIME NULL, 
	[ProjectCode] NVARCHAR(50) NULL, 
	PRIMARY KEY ([ProjectID])
);
    PRINT N'[OK] Tao bang Projects thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: ProjectMembers
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.ProjectMembers', 'U') IS NULL
BEGIN
CREATE TABLE [ProjectMembers] (
	[MemberID] INTEGER NOT NULL IDENTITY, 
	[ProjectID] INTEGER NOT NULL, 
	[MemberName] NVARCHAR(255) NOT NULL, 
	[CompletedAt] DATETIME NULL, 
	[MemberCode] NVARCHAR(50) NULL, 
	PRIMARY KEY ([MemberID]), 
	FOREIGN KEY([ProjectID]) REFERENCES [Projects] ([ProjectID]) ON DELETE CASCADE
);
    PRINT N'[OK] Tao bang ProjectMembers thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: MemberTasks
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.MemberTasks', 'U') IS NULL
BEGIN
CREATE TABLE [MemberTasks] (
	[TaskID] INTEGER NOT NULL IDENTITY, 
	[MemberID] INTEGER NOT NULL, 
	[TaskName] NVARCHAR(255) NOT NULL, 
	[Done] BIT NOT NULL, 
	[CompletedAt] DATETIME NULL, 
	[LastChangedBy] NVARCHAR(100) NULL, 
	[LastChangedAt] DATETIME NULL, 
	[Attachment] NVARCHAR(500) NULL, 
	[ReviewStatus] NVARCHAR(20) NULL, 
	[ReviewNote] NVARCHAR(500) NULL, 
	[ReviewedBy] NVARCHAR(100) NULL, 
	[ReviewedAt] DATETIME NULL, 
	PRIMARY KEY ([TaskID]), 
	FOREIGN KEY([MemberID]) REFERENCES [ProjectMembers] ([MemberID]) ON DELETE CASCADE
);
    PRINT N'[OK] Tao bang MemberTasks thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: ProjectActivityLog
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.ProjectActivityLog', 'U') IS NULL
BEGIN
CREATE TABLE [ProjectActivityLog] (
	[LogID] INTEGER NOT NULL IDENTITY, 
	[ProjectID] INTEGER NOT NULL, 
	[MemberID] INTEGER NULL, 
	[TaskID] INTEGER NULL, 
	[ActionTime] DATETIME NOT NULL, 
	[ActionBy] NVARCHAR(100) NOT NULL, 
	[ActionType] NVARCHAR(50) NOT NULL, 
	[Message] NVARCHAR(500) NULL, 
	PRIMARY KEY ([LogID])
);
    PRINT N'[OK] Tao bang ProjectActivityLog thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: THEODOI_PR_PO_DO
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.THEODOI_PR_PO_DO', 'U') IS NULL
BEGIN
CREATE TABLE [THEODOI_PR_PO_DO] (
	id INTEGER NOT NULL IDENTITY, 
	[LOAI] NVARCHAR(30) NULL, 
	[SO] NVARCHAR(50) NULL, 
	[NOIDUNG] NTEXT NULL, 
	[NGAY_THEM] DATETIME NULL, 
	[NGAY_INSERT] DATETIME NULL, 
	[NGAY_UPDATE] DATETIME NULL, 
	[TRANGTHAI] NVARCHAR(40) NULL, 
	[GHICHU] NTEXT NULL, 
	[INSERT_TRANGTHAI] NVARCHAR(10) NULL, 
	[STATUS_XOA] NVARCHAR(20) NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang THEODOI_PR_PO_DO thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: STAFF_LEAVE_LOGS
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.STAFF_LEAVE_LOGS', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[STAFF_LEAVE_LOGS] (
	id INTEGER NOT NULL IDENTITY, 
	[USERNAME] NVARCHAR(100) NOT NULL, 
	[FULL_NAME] NVARCHAR(200) NULL, 
	[LEAVE_TYPE] NVARCHAR(50) NOT NULL, 
	[START_TIME] DATETIME NOT NULL, 
	[END_TIME] DATETIME NULL, 
	[REASON] NTEXT NULL, 
	[NOTE] NTEXT NULL, 
	[USER_INSERT] NVARCHAR(100) NULL, 
	[DATE_INSERT] DATETIME NULL, 
	[ACTIVE] BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang STAFF_LEAVE_LOGS thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: STAFF_EVALUATION_CONFIG
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.STAFF_EVALUATION_CONFIG', 'U') IS NULL
BEGIN
CREATE TABLE dbo.[STAFF_EVALUATION_CONFIG] (
	id INTEGER NOT NULL IDENTITY, 
	[CONFIG_KEY] VARCHAR(100) NOT NULL, 
	[USERNAME] VARCHAR(100) NOT NULL, 
	[FULL_NAME] VARCHAR(200) NULL, 
	[IS_ACTIVE] BIT NULL, 
	[SORT_ORDER] INTEGER NULL, 
	[UPDATED_BY] VARCHAR(100) NULL, 
	[UPDATED_AT] DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang STAFF_EVALUATION_CONFIG thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: CONGVIEC_CANHAN
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.CONGVIEC_CANHAN', 'U') IS NULL
BEGIN
CREATE TABLE [CONGVIEC_CANHAN] (
	id INTEGER NOT NULL IDENTITY, 
	username NVARCHAR(100) NOT NULL, 
	noi_dung NTEXT NOT NULL, 
	images NTEXT NULL, 
	files NTEXT NULL, 
	trang_thai NVARCHAR(50) NULL, 
	ngay_tao DATETIME NULL, 
	ngay_hoan_thanh DATETIME NULL, 
	sort_order INTEGER NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang CONGVIEC_CANHAN thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: SO_LIEU_CHECK_SALES_DAILY
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.SO_LIEU_CHECK_SALES_DAILY', 'U') IS NULL
BEGIN
CREATE TABLE [SO_LIEU_CHECK_SALES_DAILY] (
	id INTEGER NOT NULL IDENTITY, 
	[DVCS] NVARCHAR(50) NULL, 
	[TEN_NHAHANG] NVARCHAR(250) NULL, 
	[TONGTIEN_NH] NVARCHAR(100) NULL, 
	[TONGTIEN_SV] NVARCHAR(100) NULL, 
	[SL_KHACH_NH] NVARCHAR(50) NULL, 
	[SL_KHACH_SV] NVARCHAR(50) NULL, 
	[NGAY_SALE] DATETIME NULL, 
	[ACTIVE] BIT NULL, 
	[NOTE] NVARCHAR(250) NULL, 
	[TRANGTHAI] NVARCHAR(50) NULL, 
	[IP_NHAHANG] NVARCHAR(50) NULL, 
	[LAN1_KETNOI_NH] NVARCHAR(50) NULL, 
	[THOIGIAN_LAY_SALE_LAN1] DATETIME NULL, 
	[THOIGIAN_LAY_SALE_LAN2] DATETIME NULL, 
	[CREATED_AT] DATETIME NULL, 
	[UPDATED_AT] DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang SO_LIEU_CHECK_SALES_DAILY thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: TOTAL_SALES_DAILY
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.TOTAL_SALES_DAILY', 'U') IS NULL
BEGIN
CREATE TABLE [TOTAL_SALES_DAILY] (
	id INTEGER NOT NULL IDENTITY, 
	[NGAY] DATETIME NULL, 
	[TOTAL_SALE] NVARCHAR(250) NULL, 
	[TOTAL_TC] NVARCHAR(250) NULL, 
	[ACTIVE] BIT NULL, 
	[CREATED_AT] DATETIME NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang TOTAL_SALES_DAILY thanh cong';
END
GO

-- -----------------------------------------------------------------------------------------
-- BANG: APP_THONGBAO_LUUY
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.APP_THONGBAO_LUUY', 'U') IS NULL
BEGIN
CREATE TABLE [APP_THONGBAO_LUUY] (
	id INTEGER NOT NULL IDENTITY, 
	tieu_de NVARCHAR(255) NOT NULL, 
	danh_muc NVARCHAR(100) NOT NULL, 
	muc_do NVARCHAR(50) NOT NULL, 
	noi_dung NTEXT NOT NULL, 
	images NTEXT NULL, 
	files NTEXT NULL, 
	is_pinned BIT NULL, 
	nguoi_tao NVARCHAR(100) NULL, 
	nguoi_update NVARCHAR(100) NULL, 
	ngay_tao DATETIME NULL, 
	ngay_update DATETIME NULL, 
	active BIT NULL, 
	PRIMARY KEY (id)
);
    PRINT N'[OK] Tao bang APP_THONGBAO_LUUY thanh cong';
END
GO

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
-- 6. Chi tiet phan quyen chuc nang (PHANQUYEN_DETAIL: 264 ban ghi)
IF NOT EXISTS (SELECT * FROM dbo.PHANQUYEN_DETAIL)
BEGIN
    SET IDENTITY_INSERT dbo.PHANQUYEN_DETAIL ON;
    INSERT INTO dbo.PHANQUYEN_DETAIL (id, id_quyen, chucnang, active) VALUES
    (1, N'4', N'view_ipwan', 1),
    (2, N'4', N'insert_ipwan', 1),
    (3, N'4', N'update_ipwan', 1),
    (4, N'4', N'view_sys', 1),
    (5, N'4', N'insert_sys', 0),
    (6, N'4', N'update_sys', 0),
    (7, N'4', N'view_ftth', 1),
    (8, N'4', N'insert_ftth', 1),
    (9, N'4', N'update_ftth', 1),
    (10, N'4', N'view_pass_mail', 1),
    (11, N'4', N'insert_pass_mail', 0),
    (12, N'4', N'update_pass_mail', 0),
    (13, N'4', N'view_code_photo', 1),
    (14, N'4', N'insert_code_photo', 1),
    (15, N'4', N'update_code_photo', 1),
    (16, N'4', N'view_ext_rsc', 1),
    (17, N'4', N'insert_ext_rsc', 1),
    (18, N'4', N'update_ext_rsc', 1),
    (19, N'5', N'view_ipwan', 1),
    (20, N'5', N'insert_ipwan', 1),
    (21, N'5', N'update_ipwan', 1),
    (22, N'5', N'view_sys', 1),
    (23, N'5', N'insert_sys', 1),
    (24, N'5', N'update_sys', 1),
    (25, N'5', N'view_ftth', 1),
    (26, N'5', N'insert_ftth', 1),
    (27, N'5', N'update_ftth', 1),
    (28, N'5', N'view_pass_mail', 1),
    (29, N'5', N'insert_pass_mail', 1),
    (30, N'5', N'update_pass_mail', 1),
    (31, N'5', N'view_code_photo', 1),
    (32, N'5', N'insert_code_photo', 1),
    (33, N'5', N'update_code_photo', 1),
    (34, N'5', N'view_ext_rsc', 1),
    (35, N'5', N'insert_ext_rsc', 1),
    (36, N'5', N'update_ext_rsc', 1),
    (37, N'6', N'view_ipwan', 0),
    (38, N'6', N'insert_ipwan', 0),
    (39, N'6', N'update_ipwan', 0),
    (40, N'6', N'view_sys', 0),
    (41, N'6', N'insert_sys', 0),
    (42, N'6', N'update_sys', 0),
    (43, N'6', N'view_ftth', 0),
    (44, N'6', N'insert_ftth', 0),
    (45, N'6', N'update_ftth', 0),
    (46, N'6', N'view_pass_mail', 0),
    (47, N'6', N'insert_pass_mail', 0),
    (48, N'6', N'update_pass_mail', 0),
    (49, N'6', N'view_code_photo', 1),
    (50, N'6', N'insert_code_photo', 1),
    (51, N'6', N'update_code_photo', 1),
    (52, N'6', N'view_ext_rsc', 1),
    (53, N'6', N'insert_ext_rsc', 1),
    (54, N'6', N'update_ext_rsc', 1),
    (55, N'7', N'view_ipwan', 0),
    (56, N'7', N'insert_ipwan', 0),
    (57, N'7', N'update_ipwan', 0),
    (58, N'7', N'view_sys', 1),
    (59, N'7', N'insert_sys', 0),
    (60, N'7', N'update_sys', 0),
    (61, N'7', N'view_ftth', 0),
    (62, N'7', N'insert_ftth', 0),
    (63, N'7', N'update_ftth', 0),
    (64, N'7', N'view_pass_mail', 0),
    (65, N'7', N'insert_pass_mail', 0),
    (66, N'7', N'update_pass_mail', 0),
    (67, N'7', N'view_code_photo', 0),
    (68, N'7', N'insert_code_photo', 0),
    (69, N'7', N'update_code_photo', 0),
    (70, N'7', N'view_ext_rsc', 1),
    (71, N'7', N'insert_ext_rsc', 0),
    (72, N'7', N'update_ext_rsc', 0),
    (73, N'8', N'view_ipwan', 1),
    (74, N'8', N'insert_ipwan', 1),
    (75, N'8', N'update_ipwan', 1),
    (76, N'8', N'view_sys', 1),
    (77, N'8', N'insert_sys', 0),
    (78, N'8', N'update_sys', 0),
    (79, N'8', N'view_ftth', 1),
    (80, N'8', N'insert_ftth', 1);
    INSERT INTO dbo.PHANQUYEN_DETAIL (id, id_quyen, chucnang, active) VALUES
    (81, N'8', N'update_ftth', 1),
    (82, N'8', N'view_pass_mail', 1),
    (83, N'8', N'insert_pass_mail', 0),
    (84, N'8', N'update_pass_mail', 0),
    (85, N'8', N'view_code_photo', 1),
    (86, N'8', N'insert_code_photo', 1),
    (87, N'8', N'update_code_photo', 1),
    (88, N'8', N'view_ext_rsc', 1),
    (89, N'8', N'insert_ext_rsc', 1),
    (90, N'8', N'update_ext_rsc', 1),
    (91, N'9', N'view_ipwan', 1),
    (92, N'9', N'insert_ipwan', 1),
    (93, N'9', N'update_ipwan', 1),
    (94, N'9', N'view_sys', 1),
    (95, N'9', N'insert_sys', 1),
    (96, N'9', N'update_sys', 1),
    (97, N'9', N'view_ftth', 1),
    (98, N'9', N'insert_ftth', 1),
    (99, N'9', N'update_ftth', 1),
    (100, N'9', N'view_pass_mail', 1),
    (101, N'9', N'insert_pass_mail', 0),
    (102, N'9', N'update_pass_mail', 0),
    (103, N'9', N'view_code_photo', 1),
    (104, N'9', N'insert_code_photo', 0),
    (105, N'9', N'update_code_photo', 0),
    (106, N'9', N'view_ext_rsc', 1),
    (107, N'9', N'insert_ext_rsc', 0),
    (108, N'9', N'update_ext_rsc', 0),
    (109, N'2', N'view_res', 1),
    (110, N'2', N'update_res', 1),
    (111, N'2', N'view_trangthai', 1),
    (112, N'2', N'update_trangthai', 1),
    (113, N'2', N'view_sdt_nh', 1),
    (114, N'2', N'update_sdt_nh', 1),
    (115, N'2', N'view_email_nh', 1),
    (116, N'2', N'update_email_nh', 0),
    (117, N'2', N'view_address', 1),
    (118, N'2', N'update_address', 1),
    (119, N'2', N'view_region', 1),
    (120, N'2', N'update_region', 1),
    (121, N'2', N'view_brand', 1),
    (122, N'2', N'update_brand', 1),
    (123, N'2', N'view_note_nh', 1),
    (124, N'2', N'update_note_nh', 1),
    (125, N'2', N'view_ngay_khaitruong', 1),
    (126, N'2', N'update_ngay_khaitruong', 1),
    (127, N'2', N'view_sap', 1),
    (128, N'2', N'update_sap', 1),
    (129, N'2', N'view_coscenter', 1),
    (130, N'2', N'update_coscenter', 1),
    (131, N'2', N'view_rk7', 1),
    (132, N'2', N'update_rk7', 1),
    (133, N'2', N'view_oracale', 1),
    (134, N'2', N'update_oracale', 1),
    (135, N'2', N'view_sap_old', 1),
    (136, N'2', N'update_sap_old', 1),
    (137, N'2', N'view_don_gia', 1),
    (138, N'2', N'update_don_gia', 1),
    (139, N'2', N'view_ip_lan', 1),
    (140, N'2', N'update_ip_lan', 0),
    (141, N'2', N'view_teamview_pc', 1),
    (142, N'2', N'update_teamview_pc', 0),
    (143, N'2', N'view_teamview_pos11', 1),
    (144, N'2', N'update_teamview_pos11', 0),
    (145, N'2', N'view_teamview_pos12', 1),
    (146, N'2', N'update_teamview_pos12', 0),
    (147, N'2', N'view_rustdesk_pos11', 1),
    (148, N'2', N'update_rustdesk_pos11', 0),
    (149, N'2', N'view_rustdesk_pos12', 1),
    (150, N'2', N'update_rustdesk_pos12', 0),
    (151, N'2', N'view_ipwan', 1),
    (152, N'2', N'insert_ipwan', 0),
    (153, N'2', N'update_ipwan', 0),
    (154, N'2', N'view_user_ftth', 1),
    (155, N'2', N'update_user_ftth', 0),
    (156, N'2', N'view_pass_ftth', 0),
    (157, N'2', N'update_pass_ftth', 0),
    (158, N'2', N'view_ngay_online_ftth', 1),
    (159, N'2', N'update_ngay_online_ftth', 0),
    (160, N'2', N'view_thanhtoan_ftth', 1);
    INSERT INTO dbo.PHANQUYEN_DETAIL (id, id_quyen, chucnang, active) VALUES
    (161, N'2', N'update_thanhtoan_ftth', 0),
    (162, N'2', N'view_dk_truyenthong', 1),
    (163, N'2', N'update_dk_truyenthong', 0),
    (164, N'2', N'view_pass_mail', 0),
    (165, N'2', N'insert_pass_mail', 0),
    (166, N'2', N'update_pass_mail', 0),
    (167, N'2', N'view_pass_ou_ko_sys', 1),
    (168, N'2', N'update_pass_ou_ko_sys', 0),
    (169, N'2', N'view_ext', 1),
    (170, N'2', N'update_ext', 0),
    (171, N'2', N'view_sys_sales', 0),
    (172, N'2', N'update_sys_sales', 0),
    (173, N'2', N'view_ftth', 1),
    (174, N'2', N'insert_ftth', 0),
    (175, N'2', N'update_ftth', 0),
    (176, N'2', N'view_sys', 1),
    (177, N'2', N'insert_sys', 0),
    (178, N'2', N'update_sys', 0),
    (179, N'2', N'view_code_photo', 0),
    (180, N'2', N'insert_code_photo', 0),
    (181, N'2', N'update_code_photo', 0),
    (182, N'2', N'view_ext_rsc', 0),
    (183, N'2', N'insert_ext_rsc', 0),
    (184, N'2', N'update_ext_rsc', 0),
    (185, N'2', N'view_test', 0),
    (186, N'2', N'update_test', 0),
    (187, N'3', N'view_res', 1),
    (188, N'3', N'update_res', 1),
    (189, N'3', N'view_trangthai', 1),
    (190, N'3', N'update_trangthai', 1),
    (191, N'3', N'view_sdt_nh', 1),
    (192, N'3', N'update_sdt_nh', 1),
    (193, N'3', N'view_email_nh', 1),
    (194, N'3', N'update_email_nh', 1),
    (195, N'3', N'view_address', 1),
    (196, N'3', N'update_address', 1),
    (197, N'3', N'view_region', 1),
    (198, N'3', N'update_region', 1),
    (199, N'3', N'view_brand', 1),
    (200, N'3', N'update_brand', 1),
    (201, N'3', N'view_note_nh', 1),
    (202, N'3', N'update_note_nh', 1),
    (203, N'3', N'view_ngay_khaitruong', 1),
    (204, N'3', N'update_ngay_khaitruong', 1),
    (205, N'3', N'view_sap', 1),
    (206, N'3', N'update_sap', 0),
    (207, N'3', N'view_coscenter', 1),
    (208, N'3', N'update_coscenter', 0),
    (209, N'3', N'view_rk7', 1),
    (210, N'3', N'update_rk7', 0),
    (211, N'3', N'view_oracale', 1),
    (212, N'3', N'update_oracale', 0),
    (213, N'3', N'view_sap_old', 1),
    (214, N'3', N'update_sap_old', 0),
    (215, N'3', N'view_don_gia', 1),
    (216, N'3', N'update_don_gia', 0),
    (217, N'3', N'view_ip_lan', 1),
    (218, N'3', N'update_ip_lan', 1),
    (219, N'3', N'view_teamview_pc', 1),
    (220, N'3', N'update_teamview_pc', 1),
    (221, N'3', N'view_teamview_pos11', 1),
    (222, N'3', N'update_teamview_pos11', 1),
    (223, N'3', N'view_teamview_pos12', 1),
    (224, N'3', N'update_teamview_pos12', 1),
    (225, N'3', N'view_rustdesk_pos11', 1),
    (226, N'3', N'update_rustdesk_pos11', 1),
    (227, N'3', N'view_rustdesk_pos12', 1),
    (228, N'3', N'update_rustdesk_pos12', 1),
    (229, N'3', N'view_ipwan', 1),
    (230, N'3', N'insert_ipwan', 0),
    (231, N'3', N'update_ipwan', 0),
    (232, N'3', N'view_user_ftth', 1),
    (233, N'3', N'update_user_ftth', 0),
    (234, N'3', N'view_pass_ftth', 1),
    (235, N'3', N'update_pass_ftth', 0),
    (236, N'3', N'view_ngay_online_ftth', 1),
    (237, N'3', N'update_ngay_online_ftth', 0),
    (238, N'3', N'view_thanhtoan_ftth', 1),
    (239, N'3', N'update_thanhtoan_ftth', 0),
    (240, N'3', N'view_dk_truyenthong', 1);
    INSERT INTO dbo.PHANQUYEN_DETAIL (id, id_quyen, chucnang, active) VALUES
    (241, N'3', N'update_dk_truyenthong', 0),
    (242, N'3', N'view_pass_mail', 0),
    (243, N'3', N'insert_pass_mail', 0),
    (244, N'3', N'update_pass_mail', 0),
    (245, N'3', N'view_pass_ou_ko_sys', 1),
    (246, N'3', N'update_pass_ou_ko_sys', 0),
    (247, N'3', N'view_ext', 1),
    (248, N'3', N'update_ext', 0),
    (249, N'3', N'view_sys_sales', 1),
    (250, N'3', N'update_sys_sales', 0),
    (251, N'3', N'view_ftth', 1),
    (252, N'3', N'insert_ftth', 0),
    (253, N'3', N'update_ftth', 0),
    (254, N'3', N'view_sys', 1),
    (255, N'3', N'insert_sys', 0),
    (256, N'3', N'update_sys', 0),
    (257, N'3', N'view_code_photo', 1),
    (258, N'3', N'insert_code_photo', 1),
    (259, N'3', N'update_code_photo', 1),
    (260, N'3', N'view_ext_rsc', 1),
    (261, N'3', N'insert_ext_rsc', 1),
    (262, N'3', N'update_ext_rsc', 1),
    (263, N'3', N'view_test', 0),
    (264, N'3', N'update_test', 0);
    SET IDENTITY_INSERT dbo.PHANQUYEN_DETAIL OFF;
    PRINT N'[OK] Da chen 264 ban ghi PHANQUYEN_DETAIL thanh cong';
END
GO
-- 7. Danh muc 83 Hang muc Checklist Setup Nha Hang Chuan GGG (CHECKLIST_SETUP_NH_NEW)
IF NOT EXISTS (SELECT * FROM dbo.CHECKLIST_SETUP_NH_NEW)
BEGIN
    SET IDENTITY_INSERT dbo.CHECKLIST_SETUP_NH_NEW ON;
    INSERT INTO dbo.CHECKLIST_SETUP_NH_NEW (id, NOIDUNG, GHICHU, NHOM, STT, ACTIVE) VALUES
    (1, N'Login phần mềm RK7-Manager và bắt đầu check/cấu hình.', NULL, N'RK7-MANAGER', 1, 1),
    (2, N'Cài đặt "Các Máy POS Và Thiết Bị"', NULL, N'RK7-MANAGER', 2, 1),
    (3, N'Tạo nhà hàng mới theo các thiết bị sau: (Dcorp sẽ tạo khi có mã RK7)
-MID
-Máy TN
-Máy Order(nếu có pos phụ, không có không cần tạo)', NULL, N'RK7-MANAGER', 3, 1),
    (4, N'Điền các tham số cho MID, TN, ORDER - Đặt tên giống tên chuẩn các nhà hàng khác
-Ví dụ nhà hàng mới là cloudpot giga thì đặt tên là MID = CDHCM761-MID, TN = CDHCM781-TN
-Profitcenter
-SAPCODE
-GGGRCO
-Tên NH', NULL, N'RK7-MANAGER', 4, 1),
    (5, N'Vào thiết bị máy TN
Thêm các máy in trong phần CÁC MÁY IN, đặt tên và gán module đúng theo từng máy.
Coppy hoặc tạo theo đúng chuẩn in đã chuẩn hóa trước đó
Ví dụ: Cloudpot máy in thịt là .52 thì tạo module máy in TM200#2 
gán Printer Address 10.9.120.52 ( máy in Thịt của Cloudpot Gigamall, tùy theo IP của từng nhà hàng do team Helpdesk gửi)', NULL, N'RK7-MANAGER', 5, 1),
    (6, N'Cài đặt ""Sơ Đồ Dịch Vụ"" tại RK7-manager
- Tạo sơ đồ dịch vụ ứng với nhà hàng mới
- Coppy/hoặc tạo dịch vụ in đúng theo chuẩn hóa brand đang chạy
- Gán máy in cho từng dịch vụ ( VD: dịch vụ IN Thịt -> gán với máy in .52)', NULL, N'RK7-MANAGER', 6, 1),
    (7, N'Kéo dịch vụ in vào tham số -> "Sử dụng sơ đồ dịch vụ in" -> Gán dịch vụ in vào nhà hàng mới', NULL, N'RK7-MANAGER', 7, 1),
    (8, N'Setup sơ đồ bàn tại Thiết lập tham số -> Sơ đồ bàn và buồng. (Setup theo sơ đồ bàn Ops gửi)', NULL, N'RK7-MANAGER', 8, 1),
    (9, N'Tạo nhân viên mới -> ""Nhân Viên"" -> Tạo nhân viên theo rule Quản lý, Trợ lý, Giám Sát, Thu Ngân, Phục vụ -> Gán mã thẻ POS cho NH theo thông tin Ops gửi, hoặc có thể gán trước mã và gửi cho NH luôn. 
Sau khi tạo đồng bộ luôn tham số GPOS để hệ thống sync luôn tài khoản CO/SO', NULL, N'RK7-MANAGER', 9, 1),
    (10, N'Tạo tài khoản RK7-Report cho nhà hàng tại "Nhân Viên" trên RK7', NULL, N'RK7-MANAGER', 10, 1),
    (11, N'Kiểm tra đầy đủ các tham số, Licenese key, XML, start MID, … và test tước khi bàn giao lại cho nhà hàng vận hành', NULL, N'RK7-MANAGER', 11, 1),
    (12, N'SETUP SQL SERVER 2014 (GIỚI HẠN RAM 2GB)', NULL, N'PC QUẢN LÝ', 1, 1),
    (13, N'Truyền source "GGG_REPLOC (1)" & GGG_REPLOC_BLANK_2023_SQL2014 xuống máy PC nhà hàng', NULL, N'PC QUẢN LÝ', 2, 1),
    (14, N'', NULL, N'PC QUẢN LÝ', 3, 1),
    (15, N'Đổi tên GGG_REPLOC(1) thành RK7', NULL, N'PC QUẢN LÝ', 4, 1),
    (16, N'Config file "repsserv" tại folder REPSER', NULL, N'PC QUẢN LÝ', 5, 1),
    (17, N'Tạo shortcut rkReportsServer
rkReportsServer -> tạo shortcut -> properties file shortcut', NULL, N'PC QUẢN LÝ', 6, 1),
    (18, N'Run admin file rkReportServer gốc -> run shortcut rkReportServer -> khối lập phương report service sẽ đỏ', NULL, N'PC QUẢN LÝ', 7, 1),
    (19, N'Open SQL Server -> Tạo user rk7 set full quyền', NULL, N'PC QUẢN LÝ', 8, 1),
    (20, N'Login user rk7 và "Restore Database" GGG_REPLOC_BLANK_2023_SQL2014.bak -> file .bak có trong source setup', NULL, N'PC QUẢN LÝ', 9, 1),
    (21, N'Về lại folder MANSTA -> tìm file "rk7man" config cấu hình', NULL, N'PC QUẢN LÝ', 10, 1),
    (22, N'Check lại khối lập phương rkReportsever xanh -> restart lại máy
Nếu vẫn còn đỏ check lại các bước cài đặt hoặc anh Tuấn Dcorp', NULL, N'PC QUẢN LÝ', 11, 1),
    (23, N'Truyền source Setup GPOS xuống nhà hàng và cài đặt các dịch vụ để chạy CO/SO/KDS', NULL, N'PC QUẢN LÝ', 12, 1),
    (24, N'Cài đặt fxlaucher , fxlaucher_kds cho start cùng windowns tại shell:startup', NULL, N'PC QUẢN LÝ', 13, 1),
    (25, N'Bật fxlaucher/fxlaucher_kds và cấu hình IP,Port trỏ về MID', NULL, N'PC QUẢN LÝ', 14, 1),
    (26, N'Báo Helpdesk share máy in CO,THIT,HAISAN,NONG,… tùy theo brand chạy KDS. Máy in kiểm đồ CO thì luôn share.', NULL, N'PC QUẢN LÝ', 15, 1),
    (27, N'Setup auto restart service mongoDB khi lỗi start', NULL, N'PC QUẢN LÝ', 16, 1),
    (28, N'Mở port MongoDB', NULL, N'PC QUẢN LÝ', 17, 1),
    (29, N'Tạo shortcut phần mềm POS và pink to taskbar : %SystemRoot%\system32\cmd.exe /C ', NULL, N'PC QUẢN LÝ', 18, 1),
    (30, N'Down source setup RK7 về máy POS 11', NULL, N'POS THU NGÂN', 1, 1),
    (31, N'Đổi tên folder "GGG_MIDSER" thành RK7', NULL, N'POS THU NGÂN', 2, 1),
    (32, N'Config file RKEEPER và winprint ở folder ""MIDSER""
', NULL, N'POS THU NGÂN', 3, 1),
    (33, N'Tạo shorcut midserv', NULL, N'POS THU NGÂN', 4, 1),
    (34, N'
Config file global_shift_transport tại folder ""SHIFT TRANSPORT""', NULL, N'POS THU NGÂN', 5, 1),
    (35, N'
Tạo shortcut Farcards tại folder ""FARCARDS""', NULL, N'POS THU NGÂN', 6, 1),
    (36, N'Truyền file "Object.key" xuống folder FARCARDS (object.key do anh Tuấn Dcorp cung cấp)', NULL, N'POS THU NGÂN', 7, 1),
    (37, N'Start "farcard-shortcut"', NULL, N'POS THU NGÂN', 8, 1),
    (38, N'Config file ""wincash"" ở folder CASSTA
', NULL, N'POS THU NGÂN', 9, 1),
    (39, N'Bật midserv- Shortcut và chạy xong ( quyền admin/partner)', NULL, N'POS THU NGÂN', 10, 1),
    (40, N'Open file wincash.bat tại folder CASSTA', NULL, N'POS THU NGÂN', 11, 1),
    (41, N'Tạo shortcut phần mềm POS và pink to taskbar : %SystemRoot%\system32\cmd.exe /C ', NULL, N'POS THU NGÂN', 12, 1),
    (42, N'Setup auto restart service farcard khi lỗi start', NULL, N'POS THU NGÂN', 13, 1),
    (43, N'Tạo folder "hoadon" tại ổ D và báo Helpdesk share folder này', NULL, N'POS THU NGÂN', 14, 1),
    (44, N'Truyền source "GGG_CASSTA" xuống máy POS 12', NULL, N'POS PHỤ 12', 1, 1),
    (45, N'Đổi tên folder "GGG_CASSTA" thành RK7', NULL, N'POS PHỤ 12', 2, 1),
    (46, N'Config file ""wincash"" ở folder CASSTA trỏ về MID
', NULL, N'POS PHỤ 12', 3, 1),
    (47, N'Tạo shortcut phần mềm POS và pink to taskbar : %SystemRoot%\system32\cmd.exe /C ', NULL, N'POS PHỤ 12', 4, 1),
    (48, N'Open file wincash.bat', NULL, N'POS PHỤ 12', 5, 1),
    (49, N'Tạo shortcut phần mềm POS và pink to taskbar : %SystemRoot%\system32\cmd.exe /C ', NULL, N'POS PHỤ 12', 6, 1),
    (50, N'Truy cập hệ thống Gmoniter', NULL, N'GMONITER', 1, 1),
    (51, N'Đẩy danh mục SO,CO,QRORDER,Tham số Param,… xuống nhà hàng mới.', NULL, N'GMONITER', 2, 1),
    (52, N'Đồng bộ danh mục master data, đồng bộ dự liệu xuống sever nhà hàng, để hệ thống lấy thông tin từ RK7 truyền xuống nhà hàng.', NULL, N'GMONITER', 3, 1),
    (53, N'Vào CO/SO nhà hàng và kiểm tra thông tin dữ liệu đảm bảo đầy đủ.', NULL, N'GMONITER', 4, 1),
    (54, N'Gửi khai báo thông tin nhà hàng cho DF Application sau khi có mã RK7', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 1, 1),
    (55, N'Phân quyền tải khoản Gchecklist', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 2, 1),
    (56, N'Phân quyền tài khoản Ghero', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 3, 1),
    (57, N'Phân quyền TCNVL', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 4, 1),
    (58, N'Phân quyền PIM', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 5, 1),
    (59, N'Phân quyền tài khoản Quản lý cho nhà hàng trên SO', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 6, 1),
    (60, N'Tạo tài khoản SAP', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 7, 1),
    (61, N'Tạo tài khoản SSC', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 8, 1),
    (62, N'Tạo CLM Tích bù kèm gán NH đúng vào user vừa tạo', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 9, 1),
    (63, N'Tạo tài khoản Gbooking kèm phân quyền co user AM quản lý tương ứng', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 10, 1),
    (64, N'Tạo tài khoản thông tin nhân viên', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 11, 1),
    (65, N'Phân quyền nhà hàng cho MKT, FC,ACC,OPS,…', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 12, 1),
    (66, N'Setup MEMO khai trương từ MKT', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 13, 1),
    (67, N'Gửi mail cho Ops các tài khoản có thể tạo trước', NULL, N'MỤC ĐI KÈM QUAN TRỌNG', 14, 1),
    (68, N'Kiểm tra ping thông cả 3 máy POS11, POS12,PC41', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 1, 1),
    (69, N'IT kiểm tra tổng quan item, các tác vụ trên POS/CO/SO,…', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 2, 1),
    (70, N'Test gọi thử món, sử dụng chức năng  (xóa món / trả món / chuyển bàn / …. )trên giao diện POS có được không,…', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 3, 1),
    (71, N'Check Farcard đã RUN chưa', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 4, 1),
    (72, N'Test quét app TGS -> Có thể dùng nhập từ bàn phím -> sử dụng app TGS cá nhân -> Hiển thị thông tin app -> xác nhận -> hiển thị CLM_GPP_023 -> Done', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 5, 1),
    (73, N'Login check 1 , 2 user đăng nhập thành công không', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 6, 1),
    (74, N'Test KDS món có hiển thị không sau khi gọi món trên CO/SO (đối với nhà có chạy KDS)', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 7, 1),
    (75, N'Sau khi hoàn thành setup và kiểm tra hết tất cả thông tin trên -> Mail triển khai bàn giao cho nhà hàng kiểm tra.', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 8, 1),
    (76, N'Mail lại cho Dcorp ngày lấy dữ liệu bán thật để tiến Golive báo cáo về văn phòng', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 9, 1),
    (77, N'Test gọi món -> gửi món thành công', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 10, 1),
    (78, N'Test gọi món -> Gửi món -> không thành công -> check lại XML của Dcorp ( báo anh Tuấn Dcorp)', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 11, 1),
    (79, N'Test gọi món -> báo dữ liệu item người lớn chưa bao gồm -> điền 0 đồng vào item Người Lớn trên RK7', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 12, 1),
    (80, N'Test thẻ tiếp khách / Nhân Viên (nhập từ xa thẻ anh Tuấn IT) -> hiển thị thông tin/ hạn mức -> xác nhận ok -> xóa thông tin thẻ -> không lưu thông tin tránh bấm nhầm đóng giao dịch', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 13, 1);
    INSERT INTO dbo.CHECKLIST_SETUP_NH_NEW (id, NOIDUNG, GHICHU, NHOM, STT, ACTIVE) VALUES
    (81, N'Báo anh Dũng IT setup xuất VAT cho NH', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 15, 1),
    (82, N'Note lại các thông tin và ngày khai trương (ngày đầu tiên có doanh thu) lên web IT', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 16, 1),
    (83, N'Hoàn tất setup, follow bảo hành , hỗ trợ nhà hàng 2 tuần ^_^!', NULL, N'MỤC KIỂM TRA SAU KHI SETUP', 17, 1);
    SET IDENTITY_INSERT dbo.CHECKLIST_SETUP_NH_NEW OFF;
    PRINT N'[OK] Da chen 83 hang muc CHECKLIST_SETUP_NH_NEW thanh cong';
END
GO
-- 8. Danh muc Thuong Hieu (BRAND)
IF NOT EXISTS (SELECT * FROM dbo.BRAND WHERE mabrand = 'gogi')
BEGIN
    SET IDENTITY_INSERT dbo.BRAND ON;
    INSERT INTO dbo.BRAND (id, mabrand, tenbrand, ngay_insert, user_them, active) VALUES
    (1, N'37st', N'Phố 37', GETDATE(), 'system', 1),
    (2, N'vuvuzela', N'Vuvuzela', GETDATE(), 'system', 1),
    (3, N'cbj', N'Cowboy Jack', GETDATE(), 'system', 1),
    (4, N'hutong', N'Hutong', GETDATE(), 'system', 1),
    (5, N'iss', N'Isushi', GETDATE(), 'system', 1),
    (6, N'cj', N'Crystal Jade', GETDATE(), 'system', 1),
    (7, N'Ashima', N'Ashima', GETDATE(), 'system', 1),
    (8, N'Kpub', N'Kpub', GETDATE(), 'system', 1),
    (9, N'mw', N'Manwah', GETDATE(), 'system', 1),
    (10, N'Yutang', N'Yutang', GETDATE(), 'system', 1),
    (11, N'jb', N'JB Coffee', GETDATE(), 'system', 1),
    (12, N'sm', N'Sumo BBQ', GETDATE(), 'system', 1),
    (13, N'Icook', N'Icook', GETDATE(), 'system', 1),
    (14, N'kichi', N'Kichi Kichi', GETDATE(), 'system', 1),
    (15, N'gogi', N'Gogi House', GETDATE(), 'system', 1),
    (16, N'gogi_steak', N'Gogi House Steak', GETDATE(), 'system', 1),
    (17, N'CK', N'CK', GETDATE(), 'system', 1),
    (18, N'Asian Corner', N'Asian Corner', GETDATE(), 'system', 1),
    (19, N'Daruma', N'Daruma', GETDATE(), 'system', 1),
    (20, N'Khác', N'Khác', GETDATE(), 'system', 1),
    (21, N'Magic Pan', N'Magic Pan', GETDATE(), 'system', 1),
    (22, N'City Station', N'City Station', GETDATE(), 'system', 1);
    SET IDENTITY_INSERT dbo.BRAND OFF;
    PRINT N'[OK] Da chen danh muc BRAND thanh cong';
END
GO
-- 9. Danh muc 63 Tinh Thanh / Khu Vuc (REGION)
IF NOT EXISTS (SELECT * FROM dbo.REGION)
BEGIN
    SET IDENTITY_INSERT dbo.REGION ON;
    INSERT INTO dbo.REGION (id, ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active) VALUES
    (1, N'AG', N'An Giang', N'67', N'An Giang', 1),
    (2, N'BV', N'Bà Rịa – Vũng Tàu', N'72', N'Ba Ria – Vung Tau', 1),
    (3, N'BL', N'Bạc Liêu', N'94', N'Bac Lieu', 1),
    (4, N'BK', N'Bắc Kạn', N'97', N'Bac Kan', 1),
    (5, N'BG', N'Bắc Giang', N'98', N'Bac Giang', 1),
    (6, N'BN', N'Bắc Ninh', N'99', N'Bac Ninh', 1),
    (7, N'BT', N'Bến Tre', N'71', N'Ben Tre', 1),
    (8, N'BD', N'Bình Dương', N'61', N'Binh Duong', 1),
    (9, N'BĐ', N'Bình Định', N'77', N'Binh Dinh', 1),
    (10, N'BP', N'Bình Phước', N'93', N'Binh Phuoc', 1),
    (11, N'BTh', N'Bình Thuận', N'86', N'Binh Thuan', 1),
    (12, N'CM', N'Cà Mau', N'69', N'Ca Mau', 1),
    (13, N'CB', N'Cao Bằng', N'11', N'Cao Bang', 1),
    (14, N'CT', N'Cần Thơ', N'65', N'Can Tho', 1),
    (15, N'ĐNa', N'Đà Nẵng', N'43', N'Da Nang', 1),
    (16, N'ĐL', N'Đắk Lắk', N'47', N'Dak Lak', 1),
    (17, N'ĐNo', N'Đắk Nông', N'48', N'Dak Nong', 1),
    (18, N'ĐB', N'Điện Biên', N'27', N'Dien Bien', 1),
    (19, N'ĐN', N'Đồng Nai', N'60, 39', N'Dong Nai', 1),
    (20, N'ĐT', N'Đồng Tháp', N'66', N'Dong Thap', 1),
    (21, N'GL', N'Gia Lai', N'81', N'Gia Lai', 1),
    (22, N'HG', N'Hà Giang', N'23', N'Ha Giang', 1),
    (23, N'HNa', N'Hà Nam', N'90', N'Ha Nam', 1),
    (24, N'HN', N'Hà Nội', N'29 đến 33,40', N'Ha Noi', 1),
    (25, N'HT', N'Hà Tĩnh', N'38', N'Ha Tinh', 1),
    (26, N'HD', N'Hải Dương', N'34', N'Hai Duong', 1),
    (27, N'HP', N'Hải Phòng', N'15, 16', N'Hai Phong', 1),
    (28, N'HGi', N'Hậu Giang', N'95', N'Hau Giang', 1),
    (29, N'HB', N'Hòa Bình', N'28', N'Hoa Binh', 1),
    (30, N'SG', N'Thành phố Hồ Chí Minh', N'50 đến 59', N'Thanh pho hcm ho chi minh sai gon', 1),
    (31, N'HY', N'Hưng Yên', N'89', N'Hung Yen', 1),
    (32, N'KH', N'Khánh Hòa', N'79', N'Khanh Hoa', 1),
    (33, N'KG', N'Kiên Giang', N'68', N'Kien Giang', 1),
    (34, N'KT', N'Kon Tum', N'82', N'Kon Tum', 1),
    (35, N'LC', N'Lai Châu', N'25', N'Lai Chau', 1),
    (36, N'LS', N'Lạng Sơn', N'12', N'Lang Son', 1),
    (37, N'LCa', N'Lào Cai', N'24', N'Lao Cai', 1),
    (38, N'LĐ', N'Lâm Đồng', N'49', N'Lam Dong', 1),
    (39, N'LA', N'Long An', N'62', N'Long An', 1),
    (40, N'NĐ', N'Nam Định', N'18', N'Nam Dinh', 1),
    (41, N'NA', N'Nghệ An', N'37', N'Nghe An', 1),
    (42, N'NB', N'Ninh Bình', N'35', N'Ninh Binh', 1),
    (43, N'NT', N'Ninh Thuận', N'85', N'Ninh Thuan', 1),
    (44, N'PT', N'Phú Thọ', N'19', N'Phu Tho', 1),
    (45, N'PY', N'Phú Yên', N'78', N'Phu Yen', 1),
    (46, N'QB', N'Quảng Bình', N'73', N'Quang Binh', 1),
    (47, N'QNa', N'Quảng Nam', N'92', N'Quang Nam', 1),
    (48, N'QNg', N'Quảng Ngãi', N'76', N'Quang Ngai', 1),
    (49, N'QN', N'Quảng Ninh', N'14', N'Quang Ninh', 1),
    (50, N'QT', N'Quảng Trị', N'74', N'Quang Tri', 1),
    (51, N'ST', N'Sóc Trăng', N'83', N'Soc Trang', 1),
    (52, N'SL', N'Sơn La', N'26', N'Son La', 1),
    (53, N'TN', N'Tây Ninh', N'70', N'Tay Ninh', 1),
    (54, N'TB', N'Thái Bình', N'17', N'Thai Binh', 1),
    (55, N'TNg', N'Thái Nguyên', N'20', N'Thai Nguyen', 1),
    (56, N'TH', N'Thanh Hóa', N'36', N'Thanh Hoa', 1),
    (57, N'TTH', N'Thừa Thiên Huế', N'75', N'Thua Thien Hue', 1),
    (58, N'TG', N'Tiền Giang', N'63', N'Tien Giang', 1),
    (59, N'TV', N'Trà Vinh', N'84', N'Tra Vinh', 1),
    (60, N'TQ', N'Tuyên Quang', N'22', N'Tuyen Quang', 1),
    (61, N'VL', N'Vĩnh Long', N'64', N'Vinh Long', 1),
    (62, N'VP', N'Vĩnh Phúc', N'88', N'Vinh Phuc', 1),
    (63, N'YB', N'Yên Bái', N'21', N'Yen Bai', 1);
    SET IDENTITY_INSERT dbo.REGION OFF;
    PRINT N'[OK] Da chen 63 tinh thanh REGION thanh cong';
END
GO
-- 10. Danh muc Dau Moi Phan Mem Ung Dung (ALLAPP_PM)
IF NOT EXISTS (SELECT * FROM dbo.ALLAPP_PM)
BEGIN
    SET IDENTITY_INSERT dbo.ALLAPP_PM ON;
    INSERT INTO dbo.ALLAPP_PM (id, project_name, pm_project, active) VALUES
    (1, N'B2C (Payment Hub, eInvoice, Evoucher)', N'Nguyễn Thị Thu Quỳnh / 0374484465', 1),
    (2, N'B2C (TGS, CLM)', N'Nguyễn Thị Thu Quỳnh / 0374484465', 1),
    (3, N'B2C (Booking, Ecom, G-Deli)', N'Trần Văn Quang / 0983037537', 1),
    (4, N'CO/SO, QR Code Order, KDS, Kiosk', N'Nguyễn Duy Tuấn/ 0375310277', 1),
    (5, N'Ghero', N'Nguyễn Thị Hạnh / 098 222 2365', 1),
    (6, N'Gchecklist', N'Nguyễn Thị Duyên / 0988940795', 1),
    (7, N'SAP', N'Nguyễn Thị Trang/ 09447779 80', 1),
    (8, N'PO Portal', N'Phạm Văn Đáp/ 0948101019', 1),
    (9, N'GStars', N'Nguyễn Thị Hạnh / 098 222 2365', 1),
    (10, N'DMP', N'Nguyễn Văn Giáp/0986500380', 1),
    (11, N'SSO', N'Phạm Văn Đáp/ 0948101019', 1),
    (12, N'GRMS', N'Nguyễn Thúy Hồng/ 085 300 6181', 1),
    (13, N'IHRP', N'Nguyễn Thị Duyên / 0988940795', 1),
    (14, N'GPMS', N'Nguyễn Thị Mai Hương/0983160584
huong.ntm@ggg.com.vn', 1),
    (15, N'Ebidding', N'Phạm Văn Đáp/ 0948101019
dap.pv@ggg.com.vn
thuoc.nguyen@ggg.com.vn', 1),
    (16, N'RK', N'Nguyễn Duy Tuấn/ 0375310277', 1),
    (17, N'CSM', N'Nguyễn Duy Tuấn/ 0375310277', 1);
    SET IDENTITY_INSERT dbo.ALLAPP_PM OFF;
    PRINT N'[OK] Da chen 17 ung dung ALLAPP_PM thanh cong';
END
GO
-- 11. Mau Memo & Danh Sach Nhan Memo Theo Thuong Hieu (MEMO_TEMPLATE_CONFIG & MEMO_TEMPLATE_BRANDS)
IF NOT EXISTS (SELECT * FROM dbo.MEMO_TEMPLATE_CONFIG)
BEGIN
    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_CONFIG ON;
    INSERT INTO dbo.MEMO_TEMPLATE_CONFIG (id, config_key, config_val) VALUES
    (1, N'to_emails', N'DCORP Support <19006140@dcorp.com.vn>; LOI Nguyen (DCORP | HCM) <d.loinq@dcorp.com.vn>; ''TUAN Nguyen (DCORP | HCM)'' <d.tuannv@dcorp.com.vn>; support@dcorp.com.vn; quan.pham@ggg.com.vn;'),
    (2, N'mkt_link', N'https://goldengatetradeservice.sharepoint.com/:x:/s/CAMNANGTHONGTIN/IQCMsLY2xKEmSKrDPc1VpU_JAU4LDzEBTzgph82KZqAZjOA?e=xOsFGO'),
    (3, N'email_body', N'<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; color: #1e293b; line-height: 1.55;" bis_skin_checked="1">
    <p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Dear Anh/Chị,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">MEMO đã được setup trên POS.</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Memo bắt đầu từ:&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã IO (Memo):</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Link Setup:</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Hướng dẫn:&nbsp;&nbsp;</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;" id="docs-internal-guid-1a95b8c3-7fff-2b8d-7e27-f5302972105d"><br></b></p><ul style="margin-top:0;margin-bottom:0;padding-inline-start:48px;"><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Các điều kiện nút bấm nhà hàng xem trong </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">file đính kèm</span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> hoặc truy cập </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">link G-Process </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">đế áp dụng đúng chương trình</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;" role="presentation"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Anh/chị Nhà Hàng vui lòng xem kỹ danh sách </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nhà Hàng được áp dụng</span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">.</span></p></li><li dir="ltr" style="list-style-type:disc;font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;" aria-level="1"><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:12pt;" role="presentation"><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Các </span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nhà Hàng không áp dụng</span><span style="font-size:12pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:400;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> anh/chị vui lòng bỏ qua mail này. Cần thêm thông tin cơ chế chương trình anh/chị vui lòng liên hệ team MKT phụ trách brand của mình để được giải đáp</span></p></li></ul><p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:12pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#ffff00;background-color:#000000;font-weight:700;font-style:italic;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nhà hàng lưu ý kiểm tra nút bấm giảm trước khi đóng giao dịch!</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Internal Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “.....................”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: ………………….</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Lưu ý </span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">:</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">NH kiểm tra nếu</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">chưa có nút bấm báo ngay hotline Dcorp 19006140 nhân phím 1</span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">để được hỗ trợ .</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nếu đã có nút bấm vui lòng kiểm tra kỹ lại xem thông tin setup đã chính xác so với MEMO</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">, có sai sót trong quá trình vận hành NH vui lòng báo ngay hotline IT nhấn phím 2, không liên hệ được hotline vui lòng gọi trực tiếp IT gửi hướng dẫn memo để điều chỉnh chính xác</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> </span><span style="font-size:10pt;font-family:Cambria,serif;color:#ff0000;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">trước khi bán</span><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> .(Mặc định Nhà hàng không phản hồi nghĩa là SETUP MEMO trên POS đã chính xác với nội dung memo MKT ban hành, mọi sai sót sau khi bán IT hoàn toàn không chịu trách nhiệm,nên mong NH kiểm tra kỹ trước khi bán )</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">@Dear team Dcorp,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Vui lòng tiếp nhận thông tin support khi cần thiết nhé</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">@Dear team MKT,</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Team vui lòng hướng dẫn thêm các cơ chế cho nhà hàng dễ vận hành nhé</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-------------------------------------------------------------------------------------------------------------------------</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">&nbsp;-------------------------------------------------------------------------------------------------------------------------</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Nếu là Voucher sau Thuế thì setup trong nhóm Voucher Internal hay External</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">1.</span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Trong nhóm External vui lòng cung cấp thêm mã SAP PartnerCode</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">2.</span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><span class="Apple-tab-span" style="white-space:pre;">	</span></span><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher cần setup mệnh giá bao nhiêu, Có xuất Hóa Đơn hay không</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:10pt;font-family:''Times New Roman'',serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Những phần trên có thể trao đổi với chị Hiền ACC để được hướng dẫn</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:11pt;font-family:''Times New Roman'',serif;color:#ff0000;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Lưu ý : Memo “Lũy Kế” tự động , hướng&nbsp; dẫn NH chỉ thao tác bấm 1 lần</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Tặng món</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn đúng món -- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Tặng món MKT</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> -- &gt; chọn “.....................”&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: …………………………….</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã Món Tặng : …………………………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Internal Coupon</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “.....................”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: ………………….</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#0b5394;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">TGS discount campaign</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">TGS discount campaign</span><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “Coupon”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#073763;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7: …………………………….</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Đóng Giao dịch -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher - Internal</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> -- &gt; chọn “voucher”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Đóng Giao dịch -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Voucher - External</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “voucher”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Promotion&nbsp;</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Promotion</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> -- &gt; chọn “...............”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-style: normal; font-variant: normal; text-decoration: none; vertical-align: baseline; white-space: pre-wrap;"><span style="background-color: rgb(255, 255, 0);"><b>Promotion áp dụng cho món
</b></span></span><span style="background-color: transparent; font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">Chọn Món Ăn-- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="background-color: transparent; font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-weight: 700; font-variant: normal; vertical-align: baseline; white-space: pre-wrap;">Promotion</span><span style="background-color: transparent; font-size: 12pt; font-family: Cambria, serif; color: rgb(31, 73, 125); font-variant: normal; vertical-align: baseline; white-space: pre-wrap;"> -- &gt; chọn “...............”</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">GRO Discount Campaign</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền -- &gt; Giảm giá -- &gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">GRO Discount Campaign </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “...............”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:12pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Giảm giá ngân ngân hàng</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Chọn ORDER -- &gt; Tính tiền --&gt; Giảm giá&nbsp; --&gt; </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Giảm giá ngân ngân hàng</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-- &gt; chọn “...............”</span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"> Mã RK7 : ……………………..</span></p><p style="margin: 0 0 10px 0;"><b style="font-weight:normal;"><br><br><br></b></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:#ffff00;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Công nợ</span></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">Đóng giao dịch -&gt; Công nợ -&gt; chọn </span><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:700;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">“VIETLIFE”</span></p><p style="margin: 0 0 10px 0;"></p><p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;">-&gt; quẹt thẻ quản lý -&gt; nhập tên người gửi hợp đông -&gt; xác nhận</span></p><div bis_skin_checked="1"><span style="font-size:12pt;font-family:Cambria,serif;color:#1f497d;background-color:transparent;font-weight:400;font-style:normal;font-variant:normal;text-decoration:none;vertical-align:baseline;white-space:pre;white-space:pre-wrap;"><br></span></div>
</div>');
    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_CONFIG OFF;
    PRINT N'[OK] Da chen cau hinh MEMO_TEMPLATE_CONFIG thanh cong';
END
GO

IF NOT EXISTS (SELECT * FROM dbo.MEMO_TEMPLATE_BRANDS)
BEGIN
    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_BRANDS ON;
    INSERT INTO dbo.MEMO_TEMPLATE_BRANDS (id, brand_name, cc_emails, active) VALUES
    (1, N'Ashima', N'trang.hoangminh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (2, N'Ashima Forest', N'trang.hoangminh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (3, N'Bập Bùng', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (4, N'Blue Bay', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (5, N'Càng Đỏ', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (6, N'Catering', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (7, N'Chả cá Vạn Vạn', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (8, N'Chay', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (9, N'Chibo', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (10, N'Chixmax', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (11, N'Cloud Pot', N'loc.tt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (12, N'Crystal Jade', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (13, N'Dao Niu Guo', N'tram.nn@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (14, N'Flychef', N'linh.nk@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (15, N'Gogi House', N'huong.nguyenngoc@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (16, N'Hàng Cuốn', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (17, N'Happy Bull', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (18, N'Hutong', N'tram.nn@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (19, N'iSushi', N'loc.tt@ggg.com.vn;nhi.letuyet@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (20, N'Kichi Kichi', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (21, N'K-Pub', N'hau.nguyen@ggg.com.vn;huong.nguyenngoc@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hau.nguyen@ggg.com.vn;huong.nguyenngoc@ggg.com.vn', 1),
    (22, N'Ktop', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (23, N'Lách Ca Lách Cách', N'anh.nguyen@ggg.com.vn;huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (24, N'Lách Ta Lách Tách', N'huyen.ptm@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (25, N'Mama''s Bakery', N'phuong.tq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (26, N'Man Tang Guo', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (27, N'Manwah', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (28, N'NgonYa', N'tram.nn@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (29, N'Daruma', N'hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (30, N'Phở Inn', N'Hang.nmt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (31, N'Phở Inn China', N'Hang.nmt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (32, N'Pizza 360', N'linh.mai@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (33, N'Sakura Yakiniku', N'nhi.hq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (34, N'Shogun', N'anh.nguyen@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (35, N'Sumo Yakiniku', N'huong.nguyenngoc@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (36, N'SushiX', N'loc.tt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (37, N'The Coffee House', N'Trang.tt@ggg.com.vn;tuan.ln1@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (38, N'Union Pizza', N'Thu.nh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (39, N'Universal Coffee', N'phuong.tq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (40, N'Universal Tea', N'phuong.tq@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (41, N'Vuvuzela', N'tuan.ln1@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (42, N'Woomaster', N'Thu.nh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (43, N'Wow!Yakiniku', N'Thu.nh@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (44, N'Yu Tang', N'tuan.ln1@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1),
    (45, N'Bò vui', N'duong.nt@ggg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;hcm.it.appsupport@ggg.com.vn;tuan.pham@ggg.com.vn;hien.lethu@ggg.com.vn;hcm.finance@ggg.com.vn;hcm.finance@ggg.com.vn; hcm.ic@ggg.com.vn; hcm.acc@ggg.com.vn; cs.tgssupport@ggg.com.vn; ha.vo@ggg.com.vn; trang.vo@ggg.com.vn; giang.ntt@ggg.com.vn; thao.tranmai@ggg.com.vn; tam.vo@ggg.com.vn; trinh.dinh@ggg.com.vn; df.app.support@ggg.com.vn;ha.nl@ggg.com.vn; erp.team@ggg.com.vn;trang.bt2@gg.com.vn;', 1);
    SET IDENTITY_INSERT dbo.MEMO_TEMPLATE_BRANDS OFF;
    PRINT N'[OK] Da chen danh sach MEMO_TEMPLATE_BRANDS thanh cong';
END
-- -----------------------------------------------------------------------------------------
-- BANG: OVERNIGHT_DEVICES_LOG (Luu nhat ky thiet bi POS, PC, KDS de qua dem tai Nha Hang)
-- -----------------------------------------------------------------------------------------
IF OBJECT_ID('dbo.OVERNIGHT_DEVICES_LOG', 'U') IS NULL
BEGIN
CREATE TABLE [OVERNIGHT_DEVICES_LOG] (
	id INTEGER NOT NULL IDENTITY, 
	scan_date DATE NOT NULL, 
	scan_time DATETIME NOT NULL, 
	restaurant_id INTEGER NULL, 
	sap_code NVARCHAR(50) NULL, 
	rk7_code NVARCHAR(50) NULL, 
	restaurant_name NVARCHAR(250) NULL, 
	ip_gateway NVARCHAR(50) NULL, 
	subnet NVARCHAR(50) NULL, 
	email NVARCHAR(150) NULL, 
	overnight_devices NVARCHAR(500) NOT NULL, 
	device_count INTEGER DEFAULT 0, 
	raw_details NVARCHAR(MAX) NULL, 
	summary_line NVARCHAR(MAX) NULL, 
	created_at DATETIME DEFAULT GETDATE(), 
	PRIMARY KEY (id)
);
CREATE INDEX IX_OVERNIGHT_DEVICES_DATE ON dbo.OVERNIGHT_DEVICES_LOG (scan_date);
CREATE INDEX IX_OVERNIGHT_DEVICES_REST ON dbo.OVERNIGHT_DEVICES_LOG (restaurant_id);
PRINT N'[OK] Tao bang OVERNIGHT_DEVICES_LOG thanh cong';
END
GO

PRINT N'====================================================================';
PRINT N'>>> HOAN TAT TOAN BO KHOI TAO VA SEED DU LIEU DATABASE ITDEPT!';
PRINT N'====================================================================';
