from pymongo import MongoClient

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)
db = client["G_KITCHEN"]
print("=== COLLECTIONS IN G_KITCHEN ===")
for coll_name in sorted(db.list_collection_names()):
    coll = db[coll_name]
    try:
        count = coll.estimated_document_count()
    except:
        count = coll.count_documents({})
    indexes = list(coll.list_indexes())
    idx_strs = [f"{idx.get('name')}: {dict(idx.get('key'))}" for idx in indexes]
    print(f"\n* Collection: {coll_name} ({count:,} docs)")
    for s in idx_strs:
        print(f"    - {s}")
