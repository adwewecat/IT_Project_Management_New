from pymongo import MongoClient
from datetime import datetime

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)

for db_name, coll_name, time_field in [
    ("G_KITCHEN", "DISH_KDS", "submitTime"),
    ("G_KITCHEN", "ACTION_LOG", "submitTime"),
    ("G_KITCHEN", "LOG_DISH_FINISH_ITEM", "finishTime"),
    ("G_ORDER", "ORDER", "openTime")
]:
    coll = client[db_name][coll_name]
    cnt = coll.estimated_document_count()
    first = coll.find_one({}, sort=[(time_field, 1)])
    last = coll.find_one({}, sort=[(time_field, -1)])
    
    t_first = first.get(time_field) if first else None
    t_last = last.get(time_field) if last else None
    
    def fmt_time(t):
        if not t:
            return "N/A"
        if isinstance(t, (int, float)):
            # check if ms or sec
            if t > 1e11:
                t = t / 1000
            try:
                return datetime.fromtimestamp(t).strftime('%Y-%m-%d %H:%M:%S')
            except:
                return str(t)
        return str(t)

    print(f"\n{db_name}.{coll_name} ({cnt:,} docs):")
    print(f"  Field thời gian: {time_field}")
    print(f"  Bản ghi cũ nhất: {fmt_time(t_first)} (raw={t_first})")
    print(f"  Bản ghi mới nhất: {fmt_time(t_last)} (raw={t_last})")
