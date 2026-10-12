import os
import sys
from datetime import datetime, date
from sqlalchemy import create_engine, text

# Add parent path to import app config
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from app.core.config import settings

OUTPUT_DIR = os.path.join(os.path.dirname(parent_dir), "Script")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SCHEMA_FILE = os.path.join(OUTPUT_DIR, "Full_SCRIPT_SQL_TABLE.sql")
DATA_FILE = os.path.join(OUTPUT_DIR, "Full_SCRIPT_SQL_TABLE_for_Data.sql")


def format_sql_val(val, data_type=""):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (datetime, date)):
        return f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'"
    
    val_str = str(val)
    # Remove huge embedded base64 images for clean sample seed data
    if "data:image" in val_str and ";base64," in val_str:
        import re
        val_str = re.sub(r'data:image/[^;]+;base64,[A-Za-z0-9+/=]+', '[Hình ảnh mẫu]', val_str)

    val_str = val_str.replace("'", "''")

    # If still > 3500 chars, chunk it to avoid SQL Server literal limit
    if len(val_str) > 3500:
        chunks = [val_str[i:i+3500] for i in range(0, len(val_str), 3500)]
        casted_chunks = [f"CAST(N'{c}' AS nvarchar(max))" for c in chunks]
        return " + ".join(casted_chunks)

    return f"N'{val_str}'"


def get_column_type_sql(ty_name, max_length, precision, scale):
    ty = ty_name.lower()
    if ty in ["nvarchar", "nchar"]:
        if max_length == -1:
            return f"{ty}(max)"
        return f"{ty}({max_length // 2})"
    elif ty in ["varchar", "char", "varbinary", "binary"]:
        if max_length == -1:
            return f"{ty}(max)"
        return f"{ty}({max_length})"
    elif ty in ["decimal", "numeric"]:
        return f"{ty}({precision},{scale})"
    return ty


def generate_scripts():
    engine = create_engine(settings.sqlalchemy_database_uri)
    with engine.connect() as conn:
        # 1. Fetch all table names
        table_rows = conn.execute(text(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
        )).fetchall()
        all_tables = [r[0] for r in table_rows]

        # 2. Fetch PKs
        pk_rows = conn.execute(text('''
            SELECT tc.table_name, ku.column_name, tc.constraint_name
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
            JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku ON tc.constraint_name = ku.constraint_name
            WHERE tc.constraint_type = 'PRIMARY KEY'
            ORDER BY tc.table_name, ku.ordinal_position
        ''')).fetchall()
        pks = {}
        for r in pk_rows:
            pks.setdefault(r[0], []).append(r[1])

        # 3. Fetch Column metadata
        col_rows = conn.execute(text('''
            SELECT 
                t.name AS table_name,
                c.name AS column_name,
                ty.name AS data_type,
                c.max_length,
                c.precision,
                c.scale,
                c.is_nullable,
                c.is_identity,
                object_definition(c.default_object_id) AS default_val
            FROM sys.tables t
            INNER JOIN sys.columns c ON t.object_id = c.object_id
            INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
            ORDER BY t.name, c.column_id
        ''')).fetchall()

        table_columns = {}
        for r in col_rows:
            table_columns.setdefault(r[0], []).append({
                "column_name": r[1],
                "data_type": r[2],
                "max_length": r[3],
                "precision": r[4],
                "scale": r[5],
                "is_nullable": r[6],
                "is_identity": r[7],
                "default_val": r[8],
            })

    # Group tables logically
    table_groups = [
        ("PHÂN HỆ 1: HỆ THỐNG, NGƯỜI DÙNG & PHÂN QUYỀN", [
            "LV_QUYEN", "LIST_USER", "PHANQUYEN_DETAIL", "QUEN_PASS", "LOGS", "APP_THONGBAO_LUUY", "THONGBAO_APP", "USER_SSO_CONFIG"
        ]),
        ("PHÂN HỆ 2: DANH MỤC MASTER (BRAND, REGION, RESTAURANT)", [
            "REGION", "BRAND", "RESTAURANT", "SOFTWARE_VERSIONS", "BRAND_PRINT_STANDARDS", "CHUANHOA_IN", "EXT_RSC", "CODE_PHOTO"
        ]),
        ("PHÂN HỆ 3: QUẢN LÝ MEMO & CHIẾN DỊCH SALESFORCE RK7", [
            "MEMO", "MEMO_TEMPLATE_CONFIG", "MEMO_TEMPLATE_BRANDS"
        ]),
        ("PHÂN HỆ 4: CHECKLIST SETUP NHÀ HÀNG MỚI", [
            "LIST_SETUP_NH_NEW", "CHECKLIST_SETUP_NH_NEW", "CHECKLIST_SETUP_NH_NEW_DETAIL",
            "CHECKLIST_TEMPLATE", "CHECKLIST_TEMPLATE_ITEM", "CHECKLIST_RUN", "CHECKLIST_RUN_ITEM", "SETUP_RESTAURANT_NEW"
        ]),
        ("PHÂN HỆ 5: QUẢN LÝ TÀI SẢN & THIẾT BỊ PIM", [
            "PIM", "PIM_CONFIG", "PIM_LOG", "PIM_SCHEDULE", "PIM_USER_THUCHIEN"
        ]),
        ("PHÂN HỆ 6: QUẢN LÝ DỰ ÁN & TIẾN ĐỘ THÀNH VIÊN", [
            "Projects", "ProjectMembers", "MemberTasks", "ProjectActivityLog", "CONGVIEC_CANHAN", "ALLAPP_PM"
        ]),
        ("PHÂN HỆ 7: GHI NHẬN SỰ VỤ, SỰ CỐ & SAI PHẠM IT", [
            "GHINHAN_SUVU", "GHINHAN_SAIPHAM", "GHINHAN_SUCO_HETHONG", "NOTE_CASE_CHUA_XULYXONG", "NOTE_THEM", "TRE_HAN", "TICKET"
        ]),
        ("PHÂN HỆ 8: LỊCH TRỰC, NGHỈ PHÉP & BÁO CÁO DOANH THU", [
            "LICHTRUC_HOTLINE", "lich_truc", "STAFF_LEAVE_TYPES", "STAFF_LEAVE_LOGS", "STAFF_EVALUATION_CONFIG",
            "BAOCAO_DANHGIA_SNAPSHOT", "THEODOI_PR_PO_DO", "SO_LIEU_CHECK_SALES_DAILY", "TOTAL_SALES_DAILY", "TAILIEU"
        ]),
        ("PHÂN HỆ 9: GIÁM SÁT THIẾT BỊ ĐÊM & TÁC VỤ QUÉT TỰ ĐỘNG", [
            "OVERNIGHT_DEVICES_LOG", "RAM_LIMIT_AUDIT_LOG", "UNASSIGNED_3CX_TICKETS_LOG"
        ]),
    ]

    # Collect grouped tables and any leftovers
    grouped_set = set()
    for _, tbls in table_groups:
        grouped_set.update(tbls)
    leftovers = [t for t in all_tables if t not in grouped_set]
    if leftovers:
        table_groups.append(("PHÂN HỆ 10: CÁC BẢNG KHÁC", leftovers))

    print(f"Total tables to process: {len(all_tables)}")

    # -------------------------------------------------------------
    # BUILD SCRIPT 1: Full_SCRIPT_SQL_TABLE.sql
    # -------------------------------------------------------------
    schema_lines = [
        "-- ============================================================================",
        "-- SCRIPT TẠO TOÀN BỘ CƠ SỞ DỮ LIỆU VÀ CÁC BẢNG (FULL DDL SCHEMA)",
        "-- DỰ ÁN: IT PROJECT MANAGEMENT SYSTEM (GGG IT DEPARTMENT)",
        f"-- NGÀY TẠO: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "-- ============================================================================",
        "USE [ITDEPT];",
        "GO",
        "SET ANSI_NULLS ON;",
        "GO",
        "SET QUOTED_IDENTIFIER ON;",
        "GO",
        "",
    ]

    for grp_title, tbl_names in table_groups:
        schema_lines.append(f"-- ============================================================================")
        schema_lines.append(f"-- {grp_title}")
        schema_lines.append(f"-- ============================================================================")
        schema_lines.append("")

        for tname in tbl_names:
            if tname not in table_columns:
                continue

            cols = table_columns[tname]
            pk_cols = pks.get(tname, [])

            schema_lines.append(f"-- ----------------------------------------------------------------------------")
            schema_lines.append(f"-- BẢNG: [dbo].[{tname}]")
            schema_lines.append(f"-- ----------------------------------------------------------------------------")
            schema_lines.append(f"IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[{tname}]') AND type in (N'U'))")
            schema_lines.append("BEGIN")
            schema_lines.append(f"    CREATE TABLE [dbo].[{tname}] (")

            col_defs = []
            for c in cols:
                cname = c["column_name"]
                ctype = get_column_type_sql(c["data_type"], c["max_length"], c["precision"], c["scale"])
                ident = " IDENTITY(1,1)" if c["is_identity"] else ""
                nullable = "NULL" if c["is_nullable"] else "NOT NULL"
                default_str = f" DEFAULT {c['default_val']}" if c["default_val"] else ""
                col_defs.append(f"        [{cname}] {ctype}{ident} {nullable}{default_str}")

            # Primary Key
            if pk_cols:
                pk_str = ", ".join(f"[{pk}] ASC" for pk in pk_cols)
                col_defs.append(f"        CONSTRAINT [PK_{tname}] PRIMARY KEY CLUSTERED ({pk_str})")

            schema_lines.append(",\n".join(col_defs))
            schema_lines.append("    );")
            schema_lines.append(f"    PRINT N'Created table [dbo].[{tname}] successfully.';")
            schema_lines.append("END")
            schema_lines.append("GO")
            schema_lines.append("")

    with open(SCHEMA_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(schema_lines))
    print(f"Generated Schema File: {SCHEMA_FILE}")

    # -------------------------------------------------------------
    # BUILD SCRIPT 2: Full_SCRIPT_SQL_TABLE_for_Data.sql
    # -------------------------------------------------------------
    data_lines = [
        "-- ============================================================================",
        "-- SCRIPT CHÈN DỮ LIỆU MẪU & MẶC ĐỊNH CHO TỪNG BẢNG (FULL SEED DATA)",
        "-- DỰ ÁN: IT PROJECT MANAGEMENT SYSTEM (GGG IT DEPARTMENT)",
        f"-- NGÀY TẠO: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "-- ============================================================================",
        "USE [ITDEPT];",
        "GO",
        "SET ANSI_NULLS ON;",
        "GO",
        "SET QUOTED_IDENTIFIER ON;",
        "GO",
        "",
    ]

    # Tables with full export vs sample export
    # Master tables: export up to 100 rows
    # Operational tables: export 5-15 rows as samples
    with engine.connect() as conn:
        for grp_title, tbl_names in table_groups:
            data_lines.append(f"-- ============================================================================")
            data_lines.append(f"-- {grp_title}")
            data_lines.append(f"-- ============================================================================")
            data_lines.append("")

            for tname in tbl_names:
                if tname not in table_columns:
                    continue

                cols = table_columns[tname]
                col_names = [c["column_name"] for c in cols]
                col_types = {c["column_name"]: c["data_type"] for c in cols}
                has_identity = any(c["is_identity"] for c in cols)

                # Determine limit
                if tname in ["LV_QUYEN", "LIST_USER", "PHANQUYEN_DETAIL", "REGION", "BRAND", "SOFTWARE_VERSIONS",
                             "MEMO_TEMPLATE_CONFIG", "MEMO_TEMPLATE_BRANDS", "PIM_CONFIG", "PIM_SCHEDULE",
                             "PIM_USER_THUCHIEN", "STAFF_LEAVE_TYPES", "ALLAPP_PM", "CHUANHOA_IN", "EXT_RSC"]:
                    limit = 100
                elif tname in ["RESTAURANT", "MEMO"]:
                    limit = 20
                else:
                    limit = 10

                try:
                    if tname == "RESTAURANT":
                        fetch_query = f"SELECT TOP 25 * FROM [RESTAURANT] WHERE trangthai = 'ON' AND LEN(LTRIM(RTRIM(sap))) = 4 ORDER BY [id] ASC"
                        rows = conn.execute(text(fetch_query)).fetchall()
                    elif tname == "MEMO":
                        fetch_query = f"SELECT TOP 12 * FROM [MEMO] ORDER BY [id] DESC"
                        raw_rows = conn.execute(text(fetch_query)).fetchall()
                        rows = sorted(raw_rows, key=lambda r: getattr(r, "id", 0))
                    else:
                        fetch_query = f"SELECT TOP {limit} * FROM [{tname}]"
                        if "id" in col_names:
                            fetch_query += " ORDER BY [id] ASC"
                        rows = conn.execute(text(fetch_query)).fetchall()
                except Exception as e:
                    print(f"Warning: could not fetch data for {tname}: {e}")
                    rows = []

                if not rows:
                    continue

                data_lines.append(f"-- ----------------------------------------------------------------------------")
                data_lines.append(f"-- DỮ LIỆU BẢNG: [dbo].[{tname}] ({len(rows)} bản ghi)")
                data_lines.append(f"-- ----------------------------------------------------------------------------")
                data_lines.append(f"IF NOT EXISTS (SELECT 1 FROM [dbo].[{tname}])")
                data_lines.append("BEGIN")

                if has_identity:
                    data_lines.append(f"    SET IDENTITY_INSERT [dbo].[{tname}] ON;")

                col_list_str = ", ".join(f"[{c}]" for c in col_names)
                data_lines.append(f"    INSERT INTO [dbo].[{tname}] ({col_list_str}) VALUES")

                val_rows = []
                for idx, row in enumerate(rows):
                    val_items = []
                    for cname in col_names:
                        val = getattr(row, cname, None)
                        if tname == "MEMO" and cname == "ma_tua" and not val:
                            round_num = 1 + (idx // 6)
                            member_idx = 1 + (idx % 6)
                            val = f"A{round_num:04d}.{member_idx:02d}"
                        val_items.append(format_sql_val(val, col_types.get(cname, "")))
                    val_rows.append(f"        ({', '.join(val_items)})")

                data_lines.append(",\n".join(val_rows) + ";")

                if has_identity:
                    data_lines.append(f"    SET IDENTITY_INSERT [dbo].[{tname}] OFF;")

                data_lines.append(f"    PRINT N'Inserted default data for [dbo].[{tname}] successfully.';")
                data_lines.append("END")
                data_lines.append("GO")
                data_lines.append("")

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(data_lines))
    print(f"Generated Data File: {DATA_FILE}")


if __name__ == "__main__":
    generate_scripts()
