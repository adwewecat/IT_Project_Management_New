import sys
sys.path.insert(0, '.')
from app.core.database import SessionLocal
from app.models.restaurant import Restaurant
from pymongo import MongoClient

db = SessionLocal()
rests = db.query(Restaurant).filter(Restaurant.ip != None).limit(80).all()
print(f"Scanning {len(rests)} restaurants for EMPLOYEE.isLogin == True...")

found_cnt = 0
for r in rests:
    try:
        c = MongoClient(r.ip, 27017, serverSelectionTimeoutMS=1000)
        col = c['G_ORDER']['EMPLOYEE']
        users = list(col.find({'isLogin': True}))
        if users:
            found_cnt += 1
            print(f"*** [{r.sap}] {r.res} ({r.ip}) has {len(users)} users with isLogin=True:")
            for u in users:
                print(f"    - code: {u.get('code')}, name: {u.get('name')}, status: {u.get('status')}")
        c.close()
    except Exception:
        pass

print(f"Finished. Found {found_cnt} restaurants with logged in users.")
db.close()
