import time
import json
from collections import Counter
from datetime import datetime
from pymongo import MongoClient

def default_json(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

def main():
    client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)
    admin = client.admin
    
    print("Bắt đầu theo dõi MongoDB 10.9.62.12:27017 trong 15 giây...")
    queries_summary = Counter()
    collscan_summary = Counter()
    clients_summary = Counter()
    
    start_time = time.time()
    iterations = 0
    
    while time.time() - start_time < 15:
        iterations += 1
        ops = admin.command("currentOp", {"$all": False, "active": True})
        for op in ops.get("inprog", []):
            ns = op.get("ns", "")
            if not ns or ns.startswith("admin.") or ns.startswith("config.") or ns.startswith("local."):
                continue
            
            client_ip = op.get("client", "unknown")
            clients_summary[client_ip] += 1
            
            plan = op.get("planSummary", "NONE")
            cmd = op.get("command", {})
            cmd_type = list(cmd.keys())[0] if cmd else op.get("op", "unknown")
            
            # Extract key fields from command
            filt = cmd.get("filter") or cmd.get("query") or {}
            filt_keys = ",".join(sorted(filt.keys())) if isinstance(filt, dict) else "unknown"
            
            summary_key = f"[{ns}] op={cmd_type} filter_keys=({filt_keys}) plan={plan}"
            queries_summary[summary_key] += 1
            
            if plan == "COLLSCAN":
                collscan_summary[f"{ns} on ({filt_keys})"] += 1
                
        time.sleep(0.3)
        
    print("\n" + "="*60)
    print(f"KẾT QUẢ THEO DÕI SAU 15 GIÂY ({iterations} lần quét):")
    print("="*60)
    
    print("\n--- TOP CÁC DẠNG QUERY ĐANG CHẠY LIÊN TỤC ---")
    for q, count in queries_summary.most_common(15):
        print(f"  {count:4d} lần: {q}")
        
    print("\n--- CÁC QUERY BỊ COLLSCAN (QUÉT TOÀN BỘ BẢNG - NGUYÊN NHÂN CPU CAO) ---")
    for cs, count in collscan_summary.most_common(15):
        print(f"  {count:4d} lần: {cs}")

    print("\n--- CLIENT GỬI REQUEST NHIỀU NHẤT ---")
    for c, count in clients_summary.most_common(10):
        print(f"  {count:4d} lần: {c}")

if __name__ == "__main__":
    main()
