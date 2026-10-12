import json
from pymongo import MongoClient
from bson import json_util

def inspect_host(host, port=27017):
    print(f"\n========================================================")
    print(f"Connecting to MongoDB at {host}:{port}...")
    print(f"========================================================")
    try:
        client = MongoClient(host, port, serverSelectionTimeoutMS=3000)
        dbs = client.list_database_names()
        print(f"Danh sach Database: {dbs}")
        
        for db_name in dbs:
            if db_name in ['admin', 'config', 'local']:
                continue
            
            db = client[db_name]
            cols = sorted(db.list_collection_names())
            print(f"\n--- [DB: {db_name}] co {len(cols)} collections: ---")
            print(f"Collections: {cols}")
            
            for col_name in cols:
                col = db[col_name]
                count = col.estimated_document_count()
                sample = col.find_one()
                
                # Check if collection is related to dishes, menu, orders, kitchen, cooking
                col_lower = col_name.lower()
                sample_str = json.dumps(sample, default=json_util.default, ensure_ascii=False) if sample else ""
                sample_lower = sample_str.lower()
                
                has_dish_hint = any(k in col_lower or k in sample_lower for k in [
                    'dish', 'item', 'menu', 'food', 'mon', 'price', 'gia', 'cook', 'che_bien', 'time', 'kitchen'
                ])
                
                if has_dish_hint or count > 0:
                    print(f"\n>> Collection: {db_name}.{col_name} (So luong: {count})")
                    if sample:
                        keys = list(sample.keys())
                        print(f"   Fields: {keys}")
                        # Filter key attributes
                        interesting = {k: v for k, v in sample.items() if k != '_id'}
                        # truncate if too big
                        sample_json = json.dumps(interesting, default=json_util.default, ensure_ascii=False, indent=2)
                        if len(sample_json) > 1000:
                            sample_json = sample_json[:1000] + "\n... [truncated]"
                        print(f"   Sample doc:\n{sample_json}")

        client.close()
    except Exception as e:
        print(f"Loi ket noi {host}: {e}")

if __name__ == '__main__':
    inspect_host('10.8.45.41')
