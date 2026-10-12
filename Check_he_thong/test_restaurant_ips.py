import pyodbc

conn_str = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    "SERVER=172.16.20.103;DATABASE=ITDEPT;"
    "UID=itapp;PWD=GGGroup@123!;"
    "TrustServerCertificate=yes;"
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

query = """
SELECT id, res, sap, ip, trangthai, status, pass_ou_ko_sys
FROM RESTAURANT 
WHERE UPPER(LTRIM(RTRIM(trangthai))) IN ('ON', 'NEW') 
   OR UPPER(LTRIM(RTRIM(status))) IN ('ON', 'NEW')
"""
cursor.execute(query)
rows = cursor.fetchall()
print(f"Total matching restaurants: {len(rows)}")
for r in rows[:10]:
    print(f"ID={r[0]} | Res={r[1]} | SAP={r[2]} | IP={r[3]} | TrangThai={r[4]} | Status={r[5]}")
