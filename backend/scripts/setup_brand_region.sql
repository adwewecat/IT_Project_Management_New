-- =========================================================================================
-- SCRIPT: KHỞI TẠO & CẬP NHẬT DANH MỤC THƯƠNG HIỆU (BRAND) & KHU VỰC (REGION)
-- Hệ thống: Quản Lý Dự Án & Danh Sách Nhà Hàng IT (IT Project Management)
-- Cơ sở dữ liệu: SQL Server
-- Tác dụng:
--   1. Tạo bảng dbo.BRAND và dbo.REGION nếu chưa tồn tại.
--   2. Chuẩn hóa làm sạch ký tự xuống dòng (\r\n) và khoảng trắng thừa.
--   3. Đồng bộ toàn bộ 34 Thương hiệu và 63+ Tỉnh thành / Khu vực thực tế từ RESTAURANT.
-- =========================================================================================

SET NOCOUNT ON;

-- -----------------------------------------------------------------------------------------
-- PHẦN 1: BẢNG KHU VỰC (dbo.REGION)
-- -----------------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'REGION' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT N'>> Đang tạo bảng dbo.REGION...';
    CREATE TABLE dbo.REGION (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ma_tinhthanh NVARCHAR(100) NULL,
        ten_tinhthanh NVARCHAR(250) NULL,
        bienso NVARCHAR(100) NULL,
        timkiem NVARCHAR(MAX) NULL,
        active BIT DEFAULT 1
    );
END
ELSE
BEGIN
    PRINT N'>> Bảng dbo.REGION đã tồn tại.';
END
GO

-- Làm sạch dữ liệu khoảng trắng thừa trong dbo.REGION
UPDATE dbo.REGION
SET ten_tinhthanh = LTRIM(RTRIM(REPLACE(REPLACE(ten_tinhthanh, CHAR(13), ''), CHAR(10), '')))
WHERE ten_tinhthanh IS NOT NULL;
GO

-- Thêm các khu vực đặc thù có trong RESTAURANT nếu chưa có
IF NOT EXISTS (SELECT 1 FROM dbo.REGION WHERE ten_tinhthanh = N'Bà Rịa - Vũng Tàu')
BEGIN
    INSERT INTO dbo.REGION (ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active)
    VALUES ('BV', N'Bà Rịa - Vũng Tàu', '72', N'Ba Ria - Vung Tau', 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.REGION WHERE ten_tinhthanh = N'Biên Hòa')
BEGIN
    INSERT INTO dbo.REGION (ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active)
    VALUES ('BH', N'Biên Hòa', '60', N'Bien Hoa Dong Nai', 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.REGION WHERE ten_tinhthanh = N'Thành phố Hồ Chí Minh')
BEGIN
    INSERT INTO dbo.REGION (ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active)
    VALUES ('SG', N'Thành phố Hồ Chí Minh', '50-59', N'Ho Chi Minh HCM Sai Gon', 1);
END

IF NOT EXISTS (SELECT 1 FROM dbo.REGION WHERE ten_tinhthanh = N'Hà Nội')
BEGIN
    INSERT INTO dbo.REGION (ma_tinhthanh, ten_tinhthanh, bienso, timkiem, active)
    VALUES ('HN', N'Hà Nội', '29-33', N'Ha Noi HN', 1);
END
GO

PRINT N'>> Hoàn tất đồng bộ bảng dbo.REGION.';
GO


-- -----------------------------------------------------------------------------------------
-- PHẦN 2: BẢNG THƯƠNG HIỆU (dbo.BRAND)
-- -----------------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'BRAND' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT N'>> Đang tạo bảng dbo.BRAND...';
    CREATE TABLE dbo.BRAND (
        id INT IDENTITY(1,1) PRIMARY KEY,
        mabrand NVARCHAR(100) NULL,
        tenbrand NVARCHAR(250) NULL,
        ngay_insert DATETIME DEFAULT GETDATE(),
        user_them NVARCHAR(100) DEFAULT 'system',
        active BIT DEFAULT 1
    );
END
ELSE
BEGIN
    PRINT N'>> Bảng dbo.BRAND đã tồn tại.';
END
GO

-- Làm sạch khoảng trắng và ký tự xuống dòng (\r, \n) trong bảng BRAND cũ
UPDATE dbo.BRAND
SET tenbrand = LTRIM(RTRIM(REPLACE(REPLACE(tenbrand, CHAR(13), ''), CHAR(10), ''))),
    mabrand = LTRIM(RTRIM(REPLACE(REPLACE(mabrand, CHAR(13), ''), CHAR(10), '')))
WHERE tenbrand IS NOT NULL;
GO

-- Nạp danh sách đầy đủ 34 Thương hiệu thực tế từ hệ thống nhà hàng
DECLARE @BrandsTable TABLE (mabrand NVARCHAR(100), tenbrand NVARCHAR(250));

INSERT INTO @BrandsTable (mabrand, tenbrand) VALUES
('7fuku', N'7Fuku Izakaya'),
('37st', N'Phố 37'),
('ashima', N'Ashima'),
('asian_corner', N'Asian Corner'),
('bapbung', N'Bập Bùng'),
('citystation', N'City Station'),
('ck', N'CK'),
('cloudpot', N'CloudPot'),
('cowboyjack', N'Cowboy Jack'),
('crystaljade', N'Crystal Jade'),
('daoniuguo', N'Dao Niu Guo'),
('daruma', N'Daruma'),
('fc', N'FC'),
('gogi', N'Gogi House'),
('gogisteak', N'Gogi House Steak'),
('hangcuon', N'Hàng Cuốn'),
('happybull', N'Happy Bull'),
('hutong', N'Hutong'),
('hutongsichuan', N'Hutong Sichuan'),
('icook', N'Icook'),
('isushi', N'Isushi'),
('jbcoffee', N'JB Coffee'),
('khac', N'Khác'),
('kichi', N'Kichi Kichi'),
('kpub', N'Kpub'),
('lachcalachcach', N'Lách Ca Lách Cách'),
('magicpan', N'Magic Pan'),
('makmak', N'Mak Mak'),
('mantangguo', N'Man tang guo'),
('manwah', N'Manwah'),
('sakura', N'Sakura'),
('shogun', N'Shogun'),
('sumobbq', N'Sumo BBQ'),
('sushix', N'Sushi X'),
('thecoffeehouse', N'The Coffee House'),
('ut', N'UT'),
('vinhxanh', N'Vịnh Xanh'),
('vuvuzela', N'Vuvuzela'),
('wowyakiniku', N'Wow! Yakiniku'),
('yutang', N'Yutang');

-- Chèn vào dbo.BRAND nếu chưa tồn tại
INSERT INTO dbo.BRAND (mabrand, tenbrand, ngay_insert, user_them, active)
SELECT b.mabrand, b.tenbrand, GETDATE(), 'system', 1
FROM @BrandsTable b
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.BRAND existing 
    WHERE LTRIM(RTRIM(existing.tenbrand)) = b.tenbrand
);
GO

PRINT N'>> Hoàn tất đồng bộ bảng dbo.BRAND.';
GO

-- -----------------------------------------------------------------------------------------
-- PHẦN 3: KIỂM TRA DỮ LIỆU SAU KHI NẠP
-- -----------------------------------------------------------------------------------------
SELECT COUNT(*) AS [TongSoKhuVuc_REGION] FROM dbo.REGION WHERE active = 1;
SELECT COUNT(*) AS [TongSoThuongHieu_BRAND] FROM dbo.BRAND WHERE active = 1;
SELECT id, mabrand, tenbrand, active FROM dbo.BRAND ORDER BY tenbrand;
GO
