-- ========================================================
-- SCRIPT TẠO BẢNG CẤU HÌNH TÀI KHOẢN SSO CÁ NHÂN (USER_SSO_CONFIG)
-- Tác vụ: Phục vụ lưu trữ tài khoản SSO & IAM cá nhân cho từng user hệ thống
-- Database: ITDEPT
-- ========================================================

USE ITDEPT;
GO

IF NOT EXISTS (
    SELECT * FROM sys.tables t 
    JOIN sys.schemas s ON t.schema_id = s.schema_id 
    WHERE t.name = 'USER_SSO_CONFIG' AND s.name = 'dbo'
)
BEGIN
    CREATE TABLE dbo.USER_SSO_CONFIG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        system_username NVARCHAR(100) NOT NULL,
        sso_username NVARCHAR(255) NOT NULL,
        sso_password NVARCHAR(255) NOT NULL,
        last_status NVARCHAR(100) NULL,
        last_tested_at DATETIME NULL,
        ngay_cap_nhat DATETIME DEFAULT GETDATE() NULL,
        CONSTRAINT UQ_USER_SSO_CONFIG_system_username UNIQUE (system_username)
    );

    CREATE NONCLUSTERED INDEX IX_USER_SSO_CONFIG_username 
    ON dbo.USER_SSO_CONFIG (system_username);

    PRINT N'✅ Đã tạo thành công bảng dbo.USER_SSO_CONFIG';
END
ELSE
BEGIN
    PRINT N'ℹ️ Bảng dbo.USER_SSO_CONFIG đã tồn tại sẵn.';
END
GO
