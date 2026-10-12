from pymongo import MongoClient

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)

targets = [
    ("G_KITCHEN", "DISH_KDS"),
    ("G_ORDER", "ORDER"),
    ("G_ORDER", "CO_MENU_ITEM"),
    ("G_ORDER", "MENU_ITEM"),
]

for db_name, coll_name in targets:
    coll = client[db_name][coll_name]
    count = coll.estimated_document_count()
    indexes = list(coll.list_indexes())
    print(f"\n==========================================")
    print(f"DATABASE: {db_name} | COLLECTION: {coll_name} (Tổng docs: {count:,})")
    print("------------------------------------------")
    for idx in indexes:
        print(f"Index name: {idx.get('name')}")
        print(f"  Key: {dict(idx.get('key'))}")
        print(f"  Unique: {idx.get('unique', False)}")
