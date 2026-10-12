-- =========================================================================
-- Script tạo bảng ghi nhận sự cố hệ thống / lỗi diện rộng
-- Table: dbo.GHINHAN_SUCO_HETHONG
-- =========================================================================

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GHINHAN_SUCO_HETHONG' AND xtype='U')
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
    CREATE INDEX IX_SUCO_HETHONG_HETHONG ON dbo.GHINHAN_SUCO_HETHONG (he_thong);
    CREATE INDEX IX_SUCO_HETHONG_TRANGTHAI ON dbo.GHINHAN_SUCO_HETHONG (trang_thai);

    PRINT 'Tao bang dbo.GHINHAN_SUCO_HETHONG thanh cong!';
END
ELSE
BEGIN
    PRINT 'Bang dbo.GHINHAN_SUCO_HETHONG da ton tai.';
END
GO
