import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from sqlalchemy import text

def setup_tables():
    db = SessionLocal()
    try:
        # 1. Table BRAND_PRINT_STANDARDS
        sql_brand_print = """
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BRAND_PRINT_STANDARDS]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[BRAND_PRINT_STANDARDS](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [brand_name] [nvarchar](100) NOT NULL,
                [loai_in] [nvarchar](100) NOT NULL,
                [tieu_de] [nvarchar](255) NULL,
                [ghi_chu] [nvarchar](max) NULL,
                [images] [nvarchar](max) NULL,
                [files] [nvarchar](max) NULL,
                [nguoi_tao] [nvarchar](100) NULL,
                [nguoi_update] [nvarchar](100) NULL,
                [ngay_tao] [datetime] DEFAULT GETDATE(),
                [ngay_update] [datetime] DEFAULT GETDATE(),
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created BRAND_PRINT_STANDARDS';
        END
        """

        # 2. Table CONGVIEC_CANHAN
        sql_personal_tasks = """
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CONGVIEC_CANHAN]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[CONGVIEC_CANHAN](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [username] [nvarchar](100) NOT NULL,
                [noi_dung] [nvarchar](max) NOT NULL,
                [images] [nvarchar](max) NULL,
                [files] [nvarchar](max) NULL,
                [trang_thai] [nvarchar](50) DEFAULT 'PENDING',
                [ngay_tao] [datetime] DEFAULT GETDATE(),
                [ngay_hoan_thanh] [datetime] NULL,
                [sort_order] [int] DEFAULT 0,
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created CONGVIEC_CANHAN';
        END
        """

        db.execute(text(sql_brand_print))
        db.execute(text(sql_personal_tasks))
        db.commit()

        count = db.execute(text("SELECT count(*) FROM sys.tables WHERE name IN ('BRAND_PRINT_STANDARDS', 'CONGVIEC_CANHAN')")).scalar()
        print(f"Verified tables exist in database: {count}/2")
    finally:
        db.close()

if __name__ == "__main__":
    setup_tables()
