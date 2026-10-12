import pyodbc

servers = [
    ('172.16.20.103', 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.20.103,1433;DATABASE=ITDEPT;Trusted_Connection=yes;TrustServerCertificate=yes;'),
    ('172.16.8.25', 'DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.8.25,1433;DATABASE=ITDEPT;UID=itapp;PWD=GGGroup@123!;TrustServerCertificate=yes;')
]

sql_script = """
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SOFTWARE_VERSIONS' AND COLUMN_NAME = 'hinh_anh')
BEGIN
    ALTER TABLE dbo.SOFTWARE_VERSIONS ADD hinh_anh NVARCHAR(MAX) NULL;
    PRINT 'Added hinh_anh';
END

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SOFTWARE_VERSIONS' AND COLUMN_NAME = 'ghi_chu')
BEGIN
    ALTER TABLE dbo.SOFTWARE_VERSIONS ADD ghi_chu NVARCHAR(MAX) NULL;
    PRINT 'Added ghi_chu';
END
"""

for srv, conn_str in servers:
    print(f"Connecting to {srv}...")
    try:
        conn = pyodbc.connect(conn_str, timeout=10)
        cur = conn.cursor()
        cur.execute(sql_script)
        conn.commit()
        
        cur.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'SOFTWARE_VERSIONS'")
        cols = [r[0] for r in cur.fetchall()]
        print(f"Columns on {srv}: {cols}")
        conn.close()
    except Exception as e:
        print(f"Error on {srv}: {e}")
