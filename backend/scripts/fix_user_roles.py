import pyodbc

def fix_roles():
    # 1. Update on 172.16.8.25
    try:
        conn1 = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.8.25,1433;DATABASE=ITDEPT;UID=itapp;PWD=GGGroup@123!;TrustServerCertificate=yes;')
        cur1 = conn1.cursor()
        cur1.execute("UPDATE LIST_USER SET phanquyen = '2' WHERE phanquyen = 'app' AND user_name1 != 'test'")
        conn1.commit()
        print(f"Updated 172.16.8.25 rows: {cur1.rowcount}")
    except Exception as e:
        print(f"Error on 172.16.8.25: {e}")

    # 2. Update on 172.16.20.103
    try:
        conn2 = pyodbc.connect('DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.20.103;DATABASE=ITDEPT;Trusted_Connection=yes;TrustServerCertificate=yes;')
        cur2 = conn2.cursor()
        cur2.execute("UPDATE LIST_USER SET phanquyen = '2' WHERE phanquyen = 'app' AND user_name1 != 'test'")
        conn2.commit()
        print(f"Updated 172.16.20.103 rows: {cur2.rowcount}")
    except Exception as e:
        print(f"Error on 172.16.20.103: {e}")

if __name__ == '__main__':
    fix_roles()
