from pymongo import MongoClient
import sqlite3

conn = sqlite3.connect('backend/database.db')
cursor = conn.cursor()
cursor.execute("SELECT sap, res, ip FROM restaurant WHERE ip IS NOT NULL AND ip != '' LIMIT 30")
rows = cursor.fetchall()
conn.close()

for sap, res, ip in rows:
    try:
        c = MongoClient(ip, 27017, serverSelectionTimeoutMS=1500)
        db = c['G_ORDER']
        cnt = db['EMPLOYEE'].count_documents({'isLogin': True})
        total = db['EMPLOYEE'].count_documents({})
        if cnt > 0:
            print(f"FOUND LOGGED IN USERS at {sap} - {res} ({ip}): {cnt}/{total}")
            for e in db['EMPLOYEE'].find({'isLogin': True}):
                print(f"   User: code={e.get('code')}, name={e.get('name')}, isLogin={e.get('isLogin')}, id={e.get('id')}")
        else:
            print(f"{sap} - {res} ({ip}): isLogin=True: 0/{total}")
        c.close()
    except Exception as e:
        pass
