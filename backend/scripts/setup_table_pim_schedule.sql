-- ==========================================================
-- SCRIPT TẠO BẢNG CẤU HÌNH LỊCH QUÉT PIM TỰ ĐỘNG (3 LẦN/NGÀY)
-- Dành cho Admin và Super Admin điều chỉnh thời gian quét
-- Database: ITDEPT
-- ==========================================================

USE ITDEPT;
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

    -- Dữ liệu cấu hình mặc định (03h sáng, 12h00 trưa, 16h30 chiều)
    INSERT INTO dbo.PIM_SCHEDULE (time_1, time_2, time_3, is_active, user_cap_nhat)
    VALUES ('03:00', '12:00', '16:30', 1, 'system');

    PRINT 'Bảng PIM_SCHEDULE đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng PIM_SCHEDULE đã tồn tại!';
END
GO
