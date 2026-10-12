# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.abspath("."))
from app.core.database import SessionLocal
from sqlalchemy import text

def setup_work_checklists_tables():
    db = SessionLocal()
    try:
        # 1. CHECKLIST_TEMPLATE
        sql_template = """
        IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_TEMPLATE]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[CHECKLIST_TEMPLATE](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [ten_suon] [nvarchar](255) NOT NULL,
                [ma_suon] [nvarchar](100) NULL,
                [danh_muc] [nvarchar](100) NULL DEFAULT N'Test Phần Mềm',
                [mo_ta] [nvarchar](max) NULL,
                [nguoi_tao] [nvarchar](100) NULL,
                [ngay_tao] [datetime] DEFAULT GETDATE(),
                [ngay_update] [datetime] DEFAULT GETDATE(),
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created CHECKLIST_TEMPLATE';
        END
        """

        # 2. CHECKLIST_TEMPLATE_ITEM
        sql_template_item = """
        IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_TEMPLATE_ITEM]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[CHECKLIST_TEMPLATE_ITEM](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [template_id] [int] NOT NULL,
                [nhom] [nvarchar](150) NULL,
                [tieu_de] [nvarchar](max) NOT NULL,
                [huong_dan] [nvarchar](max) NULL,
                [stt] [int] DEFAULT 0,
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created CHECKLIST_TEMPLATE_ITEM';
        END
        """

        # 3. CHECKLIST_RUN
        sql_run = """
        IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_RUN]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[CHECKLIST_RUN](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [template_id] [int] NOT NULL,
                [ten_dot] [nvarchar](255) NOT NULL,
                [ten_suon] [nvarchar](255) NULL,
                [version_note] [nvarchar](255) NULL,
                [ghi_chu] [nvarchar](max) NULL,
                [nguoi_thuc_hien] [nvarchar](250) NULL,
                [nguoi_tao] [nvarchar](100) NULL,
                [trang_thai] [nvarchar](50) DEFAULT N'Đang thực hiện',
                [ngay_bat_dau] [datetime] DEFAULT GETDATE(),
                [ngay_hoan_thanh] [datetime] NULL,
                [ngay_tao] [datetime] DEFAULT GETDATE(),
                [ngay_update] [datetime] DEFAULT GETDATE(),
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created CHECKLIST_RUN';
        END
        """

        # 4. CHECKLIST_RUN_ITEM
        sql_run_item = """
        IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CHECKLIST_RUN_ITEM]') AND type in (N'U'))
        BEGIN
            CREATE TABLE [dbo].[CHECKLIST_RUN_ITEM](
                [id] [int] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [run_id] [int] NOT NULL,
                [stt] [int] DEFAULT 0,
                [nhom] [nvarchar](150) NULL,
                [tieu_de] [nvarchar](max) NOT NULL,
                [huong_dan] [nvarchar](max) NULL,
                [trang_thai] [nvarchar](20) DEFAULT N'PENDING',
                [ghi_chu_ket_qua] [nvarchar](max) NULL,
                [images] [nvarchar](max) NULL,
                [nguoi_hoan_thanh] [nvarchar](100) NULL,
                [ngay_hoan_thanh] [datetime] NULL,
                [active] [bit] DEFAULT 1
            );
            PRINT 'Created CHECKLIST_RUN_ITEM';
        END
        """

        db.execute(text(sql_template))
        db.execute(text(sql_template_item))
        db.execute(text(sql_run))
        db.execute(text(sql_run_item))
        db.commit()

        # Check if seed templates exist
        count_tmpl = db.execute(text("SELECT count(1) FROM CHECKLIST_TEMPLATE WHERE active = 1")).scalar()
        if count_tmpl == 0:
            print("Seeding initial checklist templates...")
            # Template 1: Checklist Test version CO / SO / GPOS
            db.execute(text("""
                INSERT INTO [dbo].[CHECKLIST_TEMPLATE] ([ten_suon], [ma_suon], [danh_muc], [mo_ta], [nguoi_tao])
                VALUES (N'Checklist Test version co/so/gpos', 'TMPL_VERSION_CO_SO_GPOS', N'Test Phần Mềm', N'Sườn chuẩn kiểm thử các phiên bản mới của phần mềm CO, SO và GPOS trước khi triển khai nhà hàng', 'admin')
            """))
            db.commit()
            tmpl_id_1 = int(db.execute(text("SELECT id FROM CHECKLIST_TEMPLATE WHERE ma_suon = 'TMPL_VERSION_CO_SO_GPOS'")).scalar())

            # Seed items for Template 1
            items_tmpl_1 = [
                ("1. Cài đặt & Cập nhật", "1. Test cài đè bản mới vào bản cũ (Upgrade)", "Cài đè trực tiếp mà không gỡ bản cũ, kiểm tra dữ liệu cấu hình còn nguyên", 1),
                ("1. Cài đặt & Cập nhật", "2. Test cài mới hoàn toàn (Clean Install)", "Cài đặt trên môi trường sạch, kiểm tra tự động tạo thư mục và database", 2),
                ("1. Cài đặt & Cập nhật", "3. Kiểm tra thông tin phiên bản hiển thị đúng version mới", "Vào phần Giới thiệu / About kiểm tra đúng số version và ngày build", 3),
                ("1. Cài đặt & Cập nhật", "4. Kiểm tra file cấu hình config / kết nối Database", "Kiểm tra IP kết nối SQL Server, cổng và tài khoản kết nối", 4),
                
                ("2. Đăng nhập & Quyền", "5. Test đăng nhập tài khoản quản trị (Admin/Manager)", "Đăng nhập được với đầy đủ quyền quản lý, cấu hình", 5),
                ("2. Đăng nhập & Quyền", "6. Test đăng nhập tài khoản thu ngân / nhân viên", "Đăng nhập bằng mã NV, mật khẩu hoặc thẻ từ", 6),
                ("2. Đăng nhập & Quyền", "7. Test khóa màn hình và đổi mật khẩu", "Thử khóa ca làm việc, đăng xuất và đổi mật khẩu nhân viên", 7),
                
                ("3. Order & Bán hàng", "8. Test mở ca / đóng ca bán hàng", "Mở ca đầu ngày, kiểm tra số dư đầu ca và đóng ca in bảng kê", 8),
                ("3. Order & Bán hàng", "9. Test tạo bàn mới / chọn bàn trên sơ đồ", "Chọn bàn trên sơ đồ khu vực, nhập số lượng khách", 9),
                ("3. Order & Bán hàng", "10. Test order món thông thường và món combo/set", "Chọn món, chọn thuộc tính/toppings, chọn món trong set menu", 10),
                ("3. Order & Bán hàng", "11. Test ghi chú món (Note bếp/bar) và đổi món/hủy món", "Thêm ghi chú không cay, ít đá; thử đổi món hoặc hủy món theo quyền", 11),
                ("3. Order & Bán hàng", "12. Test gửi bếp và in lệnh chế biến (Order/Kitchen Print)", "Bấm gửi bếp, kiểm tra lệnh in ra máy in bếp/bar hoặc hiển thị KDS", 12),
                
                ("4. Thanh toán & Đồng bộ", "13. Test in bill tạm tính", "In hóa đơn tạm tính kiểm tra đúng giá, đúng VAT và khuyến mãi", 13),
                ("4. Thanh toán & Đồng bộ", "14. Test áp dụng khuyến mãi / Voucher / Golden Spoon", "Quét mã voucher, tích điểm và trừ điểm thành viên Golden Spoon", 14),
                ("4. Thanh toán & Đồng bộ", "15. Test các hình thức thanh toán (Tiền mặt, Thẻ, QR Pay)", "Thanh toán từng loại hình, thanh toán chia tách hóa đơn", 15),
                ("4. Thanh toán & Đồng bộ", "16. Test đồng bộ dữ liệu doanh thu về BO / SAP / Cloud", "Kiểm tra doanh thu sau khi kết ca hiển thị đúng trên BO và hệ thống trung tâm", 16),
            ]

            for nhom, tieu_de, huong_dan, stt in items_tmpl_1:
                db.execute(text("""
                    INSERT INTO [dbo].[CHECKLIST_TEMPLATE_ITEM] ([template_id], [nhom], [tieu_de], [huong_dan], [stt])
                    VALUES (:tid, :nhom, :tieu_de, :huong_dan, :stt)
                """), {"tid": tmpl_id_1, "nhom": nhom, "tieu_de": tieu_de, "huong_dan": huong_dan, "stt": stt})

            # Template 2: Checklist Test món
            db.execute(text("""
                INSERT INTO [dbo].[CHECKLIST_TEMPLATE] ([ten_suon], [ma_suon], [danh_muc], [mo_ta], [nguoi_tao])
                VALUES (N'Checklist Test món', 'TMPL_TEST_MON', N'Menu & Món Ăn', N'Sườn kiểm thử khi có thực đơn mới, đổi giá món, tạo combo hoặc thay đổi cấu hình in món', 'admin')
            """))
            db.commit()
            tmpl_id_2 = int(db.execute(text("SELECT id FROM CHECKLIST_TEMPLATE WHERE ma_suon = 'TMPL_TEST_MON'")).scalar())

            items_tmpl_2 = [
                ("1. Thông tin & Giá món", "1. Kiểm tra hiển thị tên món, mã món trên Menu POS", "Tên món đúng chính tả, hiển thị rõ ràng trên màn hình order", 1),
                ("1. Thông tin & Giá món", "2. Kiểm tra giá bán và thuế suất VAT (8% hoặc 10%)", "Giá đúng theo Memo phê duyệt của phòng Marketing/Vận hành", 2),
                ("1. Thông tin & Giá món", "3. Kiểm tra phân loại nhóm món (Khai vị, Món chính, Đồ uống)", "Món nằm đúng cây danh mục thực đơn của thương hiệu", 3),
                ("2. In ấn & KDS", "4. Kiểm tra in lệnh xuống đúng máy in bếp hoặc quầy bar", "Order món bếp in máy bếp, đồ uống in máy bar", 4),
                ("2. In ấn & KDS", "5. Kiểm tra hiển thị món trên màn hình KDS bếp", "Món hiển thị đúng dòng, đúng số lượng và màu thời gian chờ", 5),
                ("3. Kho & BOM", "6. Kiểm tra trừ kho nguyên vật liệu (BOM Recipe)", "Bán món xong kiểm tra trừ đúng định lượng nguyên vật liệu trên phần mềm kho", 6),
            ]

            for nhom, tieu_de, huong_dan, stt in items_tmpl_2:
                db.execute(text("""
                    INSERT INTO [dbo].[CHECKLIST_TEMPLATE_ITEM] ([template_id], [nhom], [tieu_de], [huong_dan], [stt])
                    VALUES (:tid, :nhom, :tieu_de, :huong_dan, :stt)
                """), {"tid": tmpl_id_2, "nhom": nhom, "tieu_de": tieu_de, "huong_dan": huong_dan, "stt": stt})

            db.commit()
            print("Seeded 2 templates with 22 items successfully!")

        print("Work Checklists tables setup completed!")
    except Exception as e:
        print(f"Error during setup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_work_checklists_tables()
