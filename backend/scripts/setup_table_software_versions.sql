-- =========================================================================
-- Script tạo bảng theo dõi phiên bản phần mềm
-- Table: dbo.SOFTWARE_VERSIONS
-- =========================================================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SOFTWARE_VERSIONS' AND xtype='U')
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

    -- Nạp dữ liệu ban đầu cho 5 phần mềm theo yêu cầu
    INSERT INTO dbo.SOFTWARE_VERSIONS (phan_mem, phien_ban, ngay_update, noi_dung_update, nguoi_update, active)
    VALUES 
        (N'KDS', N'v2.4.0', GETDATE(), N'Bản cập nhật hiển thị đơn gọi món nhà bếp thời gian thực', N'Admin', 1),
        (N'CO', N'v1.8.2', GETDATE(), N'Bản cập nhật Central Order đồng bộ thực đơn', N'Admin', 1),
        (N'SO', N'v1.6.5', GETDATE(), N'Bản cập nhật Smart Order thanh toán và tích điểm', N'Admin', 1),
        (N'GPOS-CO-SO', N'v3.1.0', GETDATE(), N'Bản phát hành tích hợp liên thông GPOS với CO và SO', N'Admin', 1),
        (N'GPOS-KDS', N'v2.5.1', GETDATE(), N'Bản cập nhật đồng bộ trạng thái chế biến món GPOS và KDS', N'Admin', 1);

    PRINT 'Tao bang SOFTWARE_VERSIONS va nap du lieu thanh cong!';
END
ELSE
BEGIN
    PRINT 'Bang SOFTWARE_VERSIONS da ton tai.';
END
GO
