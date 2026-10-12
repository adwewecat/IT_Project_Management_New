import sys
import pyodbc

def migrate_to_db(db_name):
    conn_str = (
        'DRIVER={ODBC Driver 18 for SQL Server};'
        f'SERVER=172.16.8.25,1433;'
        f'DATABASE={db_name};'
        'UID=itapp;'
        'PWD=GGGroup@123!;'
        'TrustServerCertificate=yes;'
        'Login Timeout=10;'
    )
    print(f"\n--- Dang kiem tra Database '{db_name}' tren 172.16.8.25 ---")
    try:
        conn = pyodbc.connect(conn_str)
    except Exception as e:
        print(f"Loi ket noi toi {db_name}: {e}")
        return False

    cur = conn.cursor()
    
    cur.execute("SELECT name FROM sys.tables WHERE name = 'RAM_LIMIT_AUDIT_LOG'")
    row = cur.fetchone()
    if row:
        print(f"Bang RAM_LIMIT_AUDIT_LOG da co san trong DB '{db_name}'.")
    else:
        print(f"Dang tao bang RAM_LIMIT_AUDIT_LOG trong DB '{db_name}'...")
        create_sql = """
        CREATE TABLE [dbo].[RAM_LIMIT_AUDIT_LOG] (
            id INTEGER NOT NULL IDENTITY, 
            scan_date DATE NOT NULL, 
            restaurant_id INTEGER NOT NULL, 
            sap_code NVARCHAR(50) NULL, 
            restaurant_name NVARCHAR(250) NOT NULL, 
            subnet NVARCHAR(50) NULL, 
            ip_gateway NVARCHAR(50) NULL, 
            sql_ip NVARCHAR(50) NOT NULL, 
            sql_connected BIT NOT NULL, 
            sql_max_memory_mb BIGINT NULL, 
            sql_is_limited_2gb BIT NULL, 
            sql_is_limited_4gb BIT NOT NULL, 
            sql_status NVARCHAR(255) NOT NULL, 
            mongo_ip NVARCHAR(50) NULL, 
            mongo_connected BIT NOT NULL, 
            mongo_cache_size_gb FLOAT NULL, 
            mongo_is_limited_6gb BIT NOT NULL, 
            mongo_status NVARCHAR(255) NOT NULL, 
            summary_note NVARCHAR(MAX) NULL, 
            created_at DATETIME DEFAULT GETDATE(), 
            PRIMARY KEY (id)
        );
        CREATE INDEX IX_RAM_LIMIT_AUDIT_DATE ON dbo.RAM_LIMIT_AUDIT_LOG (scan_date);
        CREATE INDEX IX_RAM_LIMIT_AUDIT_REST ON dbo.RAM_LIMIT_AUDIT_LOG (restaurant_id);
        """
        cur.execute(create_sql)
        conn.commit()
        print(f"-> Tao bang RAM_LIMIT_AUDIT_LOG thanh cong trong '{db_name}'!")

    cur.execute("SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('dbo.RAM_LIMIT_AUDIT_LOG')")
    cnt = cur.fetchone()[0]
    print(f"So cot trong bang: {cnt}")
    conn.close()
    return True

if __name__ == '__main__':
    for db in ['ITDEPT', 'PROJECT_MANAGEMENT']:
        migrate_to_db(db)
