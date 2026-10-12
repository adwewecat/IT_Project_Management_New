-- =========================================================================================
-- SCRIPT: TẠO BẢNG QUẢN LÝ YÊU CẦU MENU PIM (Table PIM)
-- Hệ thống: Quản Lý Dự Án IT (IT Project Management)
-- Cơ sở dữ liệu: SQL Server (Database ITDEPT)
-- Tác dụng:
--   1. Tạo bảng dbo.PIM nếu chưa tồn tại.
--   2. Lưu trữ thông tin yêu cầu menu PIM (Chuỗi, Mô tả, Thời gian thực hiện, ID, Link, ...)
--   3. Tạo Unique Index trên id_yeu_cau để tránh trùng lặp dữ liệu.
-- =========================================================================================

SET NOCOUNT ON;

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PIM' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT N'>> Đang khởi tạo bảng dbo.PIM...';
    CREATE TABLE dbo.PIM (
        id INT IDENTITY(1,1) PRIMARY KEY,
        id_yeu_cau NVARCHAR(50) NOT NULL,                           -- ID yêu cầu trên PIM (menustaging_id)
        chuoi NVARCHAR(150) NULL,                                   -- Chuỗi (Brand, ví dụ: KK - Kichi Kichi)
        ten_menu NVARCHAR(250) NULL,                                -- Tên Menu & Version
        mo_ta NVARCHAR(MAX) NULL,                                   -- Mô tả yêu cầu
        thoi_gian_thuc_hien DATETIME NULL,                          -- Thời gian thực hiện (Bước cuối)
        link_yeu_cau NVARCHAR(500) NULL,                            -- Link trực tiếp tới yêu cầu trên PIM
        ngay_insert DATETIME DEFAULT GETDATE(),                     -- Thời gian hệ thống insert vào DB
        trang_thai_thuc_hien NVARCHAR(50) DEFAULT N'chưa hoàn thành', -- Trạng thái thực hiện (hoàn thành / chưa hoàn thành)
        user_thuc_hien NVARCHAR(100) NULL,                          -- User thực hiện
        user_hoan_thanh NVARCHAR(100) NULL,                         -- User hoàn thành
        user_update NVARCHAR(100) NULL,                             -- User cập nhật
        thoi_gian_hoan_thanh DATETIME NULL,                         -- Thời gian hoàn thành
        thoi_gian_update DATETIME NULL,                             -- Thời gian cập nhật
        so NVARCHAR(50) DEFAULT N'chưa hoàn thành',                 -- SO (hoàn thành / chưa hoàn thành)
        gui_mail NVARCHAR(50) DEFAULT N'chưa hoàn thành',           -- Gửi mail thông báo cho nhà hàng (hoàn thành / chưa hoàn thành)
        CONSTRAINT UQ_PIM_id_yeu_cau UNIQUE (id_yeu_cau)
    );
    PRINT N'>> Khởi tạo bảng dbo.PIM thành công!';
END
ELSE
BEGIN
    PRINT N'>> Bảng dbo.PIM đã tồn tại sẵn trong CSDL.';
    -- Bổ sung cột gui_mail nếu bảng đã tồn tại từ trước nhưng chưa có cột này
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PIM' AND COLUMN_NAME = 'gui_mail')
    BEGIN
        ALTER TABLE dbo.PIM ADD gui_mail NVARCHAR(50) DEFAULT N'chưa hoàn thành' WITH VALUES;
        PRINT N'>> Đã thêm cột gui_mail vào bảng dbo.PIM thành công!';
    END
END
GO

-- Tạo Index tìm kiếm nhanh theo trạng thái thực hiện, so và gui_mail
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PIM_trang_thai' AND object_id = OBJECT_ID('dbo.PIM'))
BEGIN
    CREATE INDEX IX_PIM_trang_thai ON dbo.PIM(trang_thai_thuc_hien, so, gui_mail);
    PRINT N'>> Tạo Index IX_PIM_trang_thai thành công!';
END
GO
