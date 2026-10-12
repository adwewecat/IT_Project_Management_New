-- =========================================================================================
-- SCRIPT: TẠO BẢNG QUẢN LÝ USER PHÂN CÔNG (PIM_USER_THUCHIEN) VÀ NHẬT KÝ (PIM_LOG)
-- Hệ thống: Quản Lý Dự Án IT (IT Project Management)
-- Cơ sở dữ liệu: SQL Server (Database ITDEPT)
-- Tác dụng:
--   1. Tạo bảng dbo.PIM_USER_THUCHIEN lưu danh sách user thực hiện và thứ tự xoay vòng.
--   2. Khởi tạo sẵn 5 user chỉ định: Quyên, Hùng, Duy, Thức, Trầm.
--   3. Tạo bảng dbo.PIM_LOG ghi nhận toàn bộ lịch sử thao tác của module PIM.
-- =========================================================================================

SET NOCOUNT ON;

-- -----------------------------------------------------------------------------------------
-- PHẦN 1: BẢNG USER THỰC HIỆN XOAY VÒNG (dbo.PIM_USER_THUCHIEN)
-- -----------------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PIM_USER_THUCHIEN' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT N'>> Đang khởi tạo bảng dbo.PIM_USER_THUCHIEN...';
    CREATE TABLE dbo.PIM_USER_THUCHIEN (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ten_user NVARCHAR(50) NOT NULL,               -- Tên hiển thị ngắn: Quyên, Hùng, Duy, Thức, Trầm
        ho_ten NVARCHAR(100) NULL,                    -- Họ và tên đầy đủ
        email NVARCHAR(150) NULL,                     -- Email công việc
        thu_tu INT NOT NULL,                          -- Thứ tự xoay vòng (1, 2, 3, 4, 5...)
        active BIT DEFAULT 1,                         -- 1: Đang tham gia xoay vòng, 0: Tạm ngưng
        ngay_tao DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_PIM_USER_ten_user UNIQUE (ten_user)
    );
    PRINT N'>> Khởi tạo bảng dbo.PIM_USER_THUCHIEN thành công!';
END
ELSE
BEGIN
    PRINT N'>> Bảng dbo.PIM_USER_THUCHIEN đã tồn tại.';
END
GO

-- Nạp 5 User mặc định theo thứ tự xoay vòng nếu chưa có
IF NOT EXISTS (SELECT 1 FROM dbo.PIM_USER_THUCHIEN WHERE ten_user = N'Quyên')
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active)
    VALUES (N'Quyên', N'Tô Thị Quyên', 'quyen.tt@ggg.com.vn', 1, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.PIM_USER_THUCHIEN WHERE ten_user = N'Hùng')
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active)
    VALUES (N'Hùng', N'Phạm Trần Mạnh Hùng', 'hung.phamtran@ggg.com.vn', 2, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.PIM_USER_THUCHIEN WHERE ten_user = N'Duy')
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active)
    VALUES (N'Duy', N'Ngô Nhựt Duy', 'duy.ngo@ggg.com.vn', 3, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.PIM_USER_THUCHIEN WHERE ten_user = N'Thức')
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active)
    VALUES (N'Thức', N'Nguyễn Thức', 'thuc.nguyen@ggg.com.vn', 4, 1);

IF NOT EXISTS (SELECT 1 FROM dbo.PIM_USER_THUCHIEN WHERE ten_user = N'Trầm')
    INSERT INTO dbo.PIM_USER_THUCHIEN (ten_user, ho_ten, email, thu_tu, active)
    VALUES (N'Trầm', N'Nguyễn Vi Trầm', 'tram.nv@ggg.com.vn', 5, 1);
GO

-- -----------------------------------------------------------------------------------------
-- PHẦN 2: BẢNG NHẬT KÝ THAO TÁC (dbo.PIM_LOG)
-- -----------------------------------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PIM_LOG' AND TABLE_SCHEMA = 'dbo')
BEGIN
    PRINT N'>> Đang khởi tạo bảng dbo.PIM_LOG...';
    CREATE TABLE dbo.PIM_LOG (
        id INT IDENTITY(1,1) PRIMARY KEY,
        id_yeu_cau NVARCHAR(50) NOT NULL,             -- ID yêu cầu PIM
        hanh_dong NVARCHAR(100) NOT NULL,             -- Phân công, Hoàn thành, Cập nhật, Đổi user...
        noi_dung NVARCHAR(MAX) NULL,                  -- Chi tiết nội dung thao tác
        user_thuc_hien NVARCHAR(100) NULL,             -- User thực hiện thao tác
        thoi_gian DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_PIM_LOG_id_yeu_cau ON dbo.PIM_LOG(id_yeu_cau);
    PRINT N'>> Khởi tạo bảng dbo.PIM_LOG thành công!';
END
ELSE
BEGIN
    PRINT N'>> Bảng dbo.PIM_LOG đã tồn tại.';
END
GO
