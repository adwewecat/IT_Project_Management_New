import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from sqlalchemy import text

def setup_notifications_table():
    db = SessionLocal()
    try:
        sql = """
        IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[APP_THONGBAO_LUUY]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[APP_THONGBAO_LUUY](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [tieu_de] [nvarchar](255) NOT NULL,
                [danh_muc] [nvarchar](100) NOT NULL DEFAULT N'Lưu ý chung',
                [muc_do] [nvarchar](50) NOT NULL DEFAULT N'Quan trọng',
                [noi_dung] [nvarchar](max) NOT NULL,
                [images] [nvarchar](max) NULL,
                [files] [nvarchar](max) NULL,
                [is_pinned] [bit] NOT NULL DEFAULT 0,
                [nguoi_tao] [nvarchar](100) NULL,
                [nguoi_update] [nvarchar](100) NULL,
                [ngay_tao] [datetime] DEFAULT GETDATE(),
                [ngay_update] [datetime] DEFAULT GETDATE(),
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created APP_THONGBAO_LUUY';
        END
        """
        db.execute(text(sql))
        db.commit()

        exists = db.execute(text("SELECT count(1) FROM sys.tables WHERE name = 'APP_THONGBAO_LUUY'")).scalar()
        print(f"Table APP_THONGBAO_LUUY exists: {exists == 1}")
    except Exception as e:
        print(f"Error creating table: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_notifications_table()
