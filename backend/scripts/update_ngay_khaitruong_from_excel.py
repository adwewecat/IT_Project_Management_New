import os
import sys
import openpyxl
from datetime import datetime
import pyodbc

# Path to excel file
EXCEL_PATH = r"D:\1.Download\Report Nhà hàng active.xlsx"

def load_excel_mapping(excel_path: str):
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Không tìm thấy file: {excel_path}")
    
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb.active
    
    sap_to_date = {}
    for r in range(2, ws.max_row + 1):
        golive = ws.cell(r, 1).value
        plant = ws.cell(r, 2).value
        res_name = ws.cell(r, 5).value or ""
        
        if not golive or not plant:
            continue
            
        plant_clean = str(plant).strip()
        g_str = str(golive).strip()
        
        try:
            parts = g_str.split('/')
            if len(parts) == 3:
                m, d, y = int(parts[0]), int(parts[1]), int(parts[2])
                if y < 100:
                    y = 2000 + y
                dt = datetime(y, m, d)
                sap_to_date[plant_clean] = {
                    "date": dt,
                    "date_str": dt.strftime("%Y-%m-%d"),
                    "raw_golive": g_str,
                    "excel_res": str(res_name).strip()
                }
        except Exception as e:
            print(f"Lỗi parse dòng {r} ({plant}, {g_str}): {e}")
            
    print(f"==> Đã đọc {len(sap_to_date)} mã SAP từ Excel {excel_path}")
    return sap_to_date


def update_database(server_name: str, conn_str: str, sap_mapping: dict):
    print(f"\n========================================================")
    print(f" BẮT ĐẦU CẬP NHẬT TRÊN SERVER: {server_name}")
    print(f"========================================================")
    
    try:
        conn = pyodbc.connect(conn_str, timeout=10)
    except Exception as e:
        print(f"LỖI KẾT NỐI tới {server_name}: {e}")
        return
        
    cursor = conn.cursor()
    
    # 1. Tìm các nhà hàng thiếu ngày khai trương (None hoặc 01/01/1999)
    cursor.execute("""
        SELECT id, sap, res, trangthai, ngay_khaitruong 
        FROM RESTAURANT
        WHERE ngay_khaitruong IS NULL 
           OR CAST(ngay_khaitruong AS DATE) = '1999-01-01'
    """)
    rows = cursor.fetchall()
    print(f"Tổng số nhà hàng thiếu ngày khai trương trên DB ({server_name}): {len(rows)}")
    
    updated_count = 0
    now = datetime.now()
    
    for r in rows:
        r_id, sap, res_name, status, old_nkt = r[0], str(r[1] or '').strip(), str(r[2] or '').strip(), str(r[3] or '').strip(), r[4]
        
        if sap in sap_mapping:
            info = sap_mapping[sap]
            target_date = info["date"]
            old_str = old_nkt.strftime('%d/%m/%Y') if old_nkt else 'NULL'
            new_str = target_date.strftime('%d/%m/%Y')
            
            cursor.execute("""
                UPDATE RESTAURANT
                SET ngay_khaitruong = ?,
                    ngay_update = ?,
                    user_update = ?
                WHERE id = ?
            """, (target_date, now, 'system_sap_import', r_id))
            
            updated_count += 1
            print(f" [#{r_id}] SAP {sap:5s} | {res_name[:35]:35s} | {old_str} -> {new_str} (GOLIVE: {info['raw_golive']})")
            
    conn.commit()
    print(f"==> KẾT QUẢ {server_name}: Đã cập nhật thành công {updated_count} nhà hàng.")
    conn.close()


if __name__ == "__main__":
    sap_map = load_excel_mapping(EXCEL_PATH)
    
    # 1. Update Test Server 172.16.20.103
    conn_str_103 = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.20.103,1433;DATABASE=ITDEPT;Trusted_Connection=yes;TrustServerCertificate=yes;"
    update_database("Server Test 172.16.20.103", conn_str_103, sap_map)
    
    # 2. Update Production Server 172.16.8.25
    conn_str_25 = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=172.16.8.25,1433;DATABASE=ITDEPT;UID=itapp;PWD=GGGroup@123!;TrustServerCertificate=yes;"
    update_database("Server Production 172.16.8.25", conn_str_25, sap_map)
