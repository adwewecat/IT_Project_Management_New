import time
import json
from datetime import datetime
from pymongo import MongoClient

def default_json(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

def main():
    host = "10.9.62.12"
    port = 27017
    client = MongoClient(host, port, serverSelectionTimeoutMS=5000)
    
    print("==================================================")
    print(" 1. KIỂM TRA COLLECTIONS & INDEXES TRONG G_KITCHEN & G_ORDER")
    print("==================================================")
    for db_name in ["G_KITCHEN", "G_ORDER"]:
        db = client[db_name]
        colls = db.list_collection_names()
        print(f"\n--- Database: {db_name} ---")
        for coll_name in colls:
            coll = db[coll_name]
            count = coll.estimated_document_count()
            indexes = list(coll.list_indexes())
            index_keys = [list(idx.get("key", {}).keys()) for idx in indexes]
            print(f"Collection: {coll_name} | Ước tính documents: {count:,}")
            for idx in indexes:
                print(f"   Index: {idx.get('name')} -> {dict(idx.get('key'))} (unique={idx.get('unique', False)})")

    print("\n==================================================")
    print(" 2. ĐO TỐC ĐỘ QUERY (OPCOUNTERS) TRONG 5 GIÂY")
    print("==================================================")
    s1 = client.admin.command("serverStatus")
    q1 = s1["opcounters"]["query"]
    c1 = s1["opcounters"]["command"]
    u1 = s1["opcounters"]["update"]
    i1 = s1["opcounters"]["insert"]
    time.sleep(5)
    s2 = client.admin.command("serverStatus")
    q2 = s2["opcounters"]["query"]
    c2 = s2["opcounters"]["command"]
    u2 = s2["opcounters"]["update"]
    i2 = s2["opcounters"]["insert"]
    
    print(f"Trong 5 giây vừa qua:")
    print(f" - Queries: {q2 - q1} queries (~{(q2 - q1)/5:.1f} queries/giây)")
    print(f" - Commands: {c2 - c1} commands (~{(c2 - c1)/5:.1f}/giây)")
    print(f" - Updates: {u2 - u1} updates (~{(u2 - u1)/5:.1f}/giây)")
    print(f" - Inserts: {i2 - i1} inserts (~{(i2 - i1)/5:.1f}/giây)")

    print("\n==================================================")
    print(" 3. BẮT CÁC QUERY ĐANG CHẠY LIÊN TỤC TRONG 10 LẦN LẤY MẪU (Mỗi 500ms)")
    print("==================================================")
    op_samples = []
    for step in range(10):
        ops = client.admin.command("currentOp", {"$all": False, "active": True})
        for op in ops.get("inprog", []):
            ns = op.get("ns", "")
            cmd = op.get("command", {})
            plan = op.get("planSummary", "")
            client_ip = op.get("client", "")
            if ns and not ns.startswith("admin.") and not ns.startswith("config."):
                op_samples.append({
                    "step": step,
                    "ns": ns,
                    "plan": plan,
                    "client": client_ip,
                    "command": json.dumps(cmd, default=default_json)
                })
        time.sleep(0.5)

    if op_samples:
        print(f"Bắt được {len(op_samples)} queries nghiệp vụ đang chạy:")
        # Group by command shape
        seen = {}
        for s in op_samples:
            key = f"{s['ns']} | {s['plan']} | {s['command'][:150]}"
            seen[key] = seen.get(key, 0) + 1
        for k, v in seen.items():
            print(f"  [{v} lần xuất hiện] {k}")
    else:
        print("Không bắt được query nào trong lúc lấy mẫu.")

    print("\n==================================================")
    print(" 4. KIỂM TRA EXPLAIN TRÊN QUERY PHỔ BIẾN (DISH_KDS filter lineGuid)")
    print("==================================================")
    if "G_KITCHEN" in client.list_database_names() and "DISH_KDS" in client["G_KITCHEN"].list_collection_names():
        db_kitchen = client["G_KITCHEN"]
        one_doc = db_kitchen["DISH_KDS"].find_one()
        if one_doc and "lineGuid" in one_doc:
            sample_guid = one_doc["lineGuid"]
            explain_result = db_kitchen["DISH_KDS"].find({"lineGuid": sample_guid}).limit(1).explain()
            exec_stats = explain_result.get("executionStats", {})
            winning_plan = explain_result.get("queryPlanner", {}).get("winningPlan", {})
            print(f"Query test: find lineGuid = '{sample_guid}'")
            print(f"Stage thắng: {winning_plan.get('stage')}")
            print(f"Execution Stats:")
            print(f" - executionSuccess: {exec_stats.get('executionSuccess')}")
            print(f" - nReturned: {exec_stats.get('nReturned')}")
            print(f" - executionTimeMillis: {exec_stats.get('executionTimeMillis')} ms")
            print(f" - totalKeysExamined: {exec_stats.get('totalKeysExamined')}")
            print(f" - totalDocsExamined: {exec_stats.get('totalDocsExamined')}")

    print("\n==================================================")
    print(" 5. KIỂM TRA CLIENT CONNECTIONS ĐANG MỞ TỚI MONGO")
    print("==================================================")
    conns = client.admin.command("currentOp", {"$all": True})
    ip_counts = {}
    for c in conns.get("inprog", []):
        client_addr = c.get("client")
        if client_addr:
            ip = client_addr.split(":")[0]
            ip_counts[ip] = ip_counts.get(ip, 0) + 1
    print("Thống kê connections theo IP:")
    for ip, cnt in ip_counts.items():
        print(f" - {ip}: {cnt} connections")

if __name__ == "__main__":
    main()
