-- ==========================================================
-- SCRIPT TẠO BẢNG CẤU HÌNH TÀI KHOẢN ĐĂNG NHẬP PIM (SSO)
-- Dành cho Super Admin cấu hình linh hoạt không cần sửa code
-- Database: ITDEPT
-- ==========================================================

USE ITDEPT;
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

    -- Dữ liệu mặc định ban đầu
    INSERT INTO dbo.PIM_CONFIG (sso_username, sso_password, user_cap_nhat)
    VALUES ('dung.nguyenanh@ggg.com.vn', 'Nguyetthu28071995@@', 'system');

    PRINT 'Bảng PIM_CONFIG đã được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng PIM_CONFIG đã tồn tại!';
END
GO
