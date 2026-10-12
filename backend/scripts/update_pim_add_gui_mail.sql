-- =========================================================================================
-- SCRIPT MIGRATION: BỔ SUNG CỘT gui_mail VÀO BẢNG dbo.PIM
-- Hệ thống: Quản Lý Dự Án IT (IT Project Management)
-- Cơ sở dữ liệu: SQL Server (Database ITDEPT)
-- Nội dung:
--   Thêm cột 'gui_mail' (Gửi mail thông báo cho nhà hàng) vào bảng dbo.PIM
--   Mặc định: N'chưa hoàn thành'
-- =========================================================================================

SET NOCOUNT ON;

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PIM' AND TABLE_SCHEMA = 'dbo')
BEGIN
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PIM' AND COLUMN_NAME = 'gui_mail')
    BEGIN
        PRINT N'>> Đang bổ sung cột gui_mail vào bảng dbo.PIM...';
        ALTER TABLE dbo.PIM ADD gui_mail NVARCHAR(50) DEFAULT N'chưa hoàn thành' WITH VALUES;
        PRINT N'>> Bổ sung cột gui_mail thành công!';
    END
    ELSE
    BEGIN
        PRINT N'>> Cột gui_mail đã tồn tại trong bảng dbo.PIM.';
    END
END
ELSE
BEGIN
    PRINT N'>> Bảng dbo.PIM chưa tồn tại trong CSDL. Vui lòng chạy setup_table_pim.sql trước.';
END
GO
