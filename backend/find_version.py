import pymongo.common
pymongo.common.MIN_SUPPORTED_WIRE_VERSION = 0
from pymongo import MongoClient

c = MongoClient('10.8.222.12', 27017, serverSelectionTimeoutMS=4000)

print("--- SEARCHING G_ORDER ---")
db_order = c['G_ORDER']
for col_name in db_order.list_collection_names():
    col = db_order[col_name]
    # Check for version-like strings
    try:
        # Search for 2.4.154 or 20260916 or 1.0.45
        for doc in col.find({"$or": [
            {"$text": {"$search": "2.4.154"}},
        ]}).limit(2):
            print(f"Text match in {col_name}: {doc}")
    except Exception:
        pass

    # Regex search on string fields
    try:
        sample = col.find_one()
        if sample:
            for k, v in sample.items():
                if isinstance(v, str) and ("2.4." in v or "1.0." in v or "20260" in v or "version" in k.lower() or "ver" in k.lower() or "gpos" in k.lower() or "server" in k.lower()):
                    print(f"Sample key match in {col_name}.{k}: {v}")
    except Exception:
        pass

print("\n--- CHECKING SPECIFIC COLLECTIONS IN G_ORDER ---")
for col_name in ["APP_PARAM", "SERVER_CONFIG", "CONFIG", "VERSION", "INFO", "SYSTEM_CONFIG", "POS_CONFIG", "POS_API_CONFIG", "G_POS_CONFIG"]:
    if col_name in db_order.list_collection_names():
        print(f"Found collection {col_name} in G_ORDER:")
        for doc in db_order[col_name].find().limit(5):
            print("  ", {k: v for k, v in doc.items() if k != "_id"})

print("\n--- SEARCHING FOR '2.4.154' or '1.0.45.1' in all fields ---")
for db_name in ["G_ORDER", "G_KITCHEN"]:
    db = c[db_name]
    for col_name in db.list_collection_names():
        col = db[col_name]
        try:
            for doc in col.find():
                doc_str = str(doc)
                if "2.4.154" in doc_str:
                    print(f"FOUND '2.4.154' in {db_name}.{col_name}: {doc_str[:300]}")
                if "1.0.45" in doc_str:
                    print(f"FOUND '1.0.45' in {db_name}.{col_name}: {doc_str[:300]}")
                if "20260916" in doc_str:
                    print(f"FOUND '20260916' in {db_name}.{col_name}: {doc_str[:300]}")
                if "20260813" in doc_str:
                    print(f"FOUND '20260813' in {db_name}.{col_name}: {doc_str[:300]}")
        except Exception:
            pass
