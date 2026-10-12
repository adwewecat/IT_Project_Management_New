import time
import json
from pymongo import MongoClient

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)
admin = client.admin

print("Bắt chi tiết các câu query thực tế vào DISH_KDS và ORDER trong 10 giây...")
captured_queries = []
start = time.time()

while time.time() - start < 10:
    ops = admin.command("currentOp", {"$all": False, "active": True})
    for op in ops.get("inprog", []):
        ns = op.get("ns", "")
        if ns in ["G_KITCHEN.DISH_KDS", "G_ORDER.ORDER", "G_ORDER.CO_MENU_ITEM"]:
            cmd = op.get("command", {})
            plan = op.get("planSummary", "")
            duration = op.get("microsecs_running", 0)
            captured_queries.append({
                "ns": ns,
                "plan": plan,
                "duration_us": duration,
                "cmd": cmd
            })
    time.sleep(0.1)

print(f"Tổng số queries bắt được: {len(captured_queries)}")
unique_patterns = {}
for q in captured_queries:
    cmd = q["cmd"]
    op_type = list(cmd.keys())[0] if cmd else "unknown"
    filt = cmd.get("filter") or cmd.get("query") or {}
    keys = tuple(sorted(filt.keys())) if isinstance(filt, dict) else ()
    pattern_key = (q["ns"], op_type, keys, q["plan"])
    if pattern_key not in unique_patterns:
        unique_patterns[pattern_key] = {
            "count": 0,
            "sample_cmd": cmd,
            "max_duration_us": 0
        }
    unique_patterns[pattern_key]["count"] += 1
    unique_patterns[pattern_key]["max_duration_us"] = max(unique_patterns[pattern_key]["max_duration_us"], q["duration_us"])

for (ns, op_type, keys, plan), val in unique_patterns.items():
    print("--------------------------------------------------")
    print(f"Collection: {ns}")
    print(f"Operation: {op_type} | Filter fields: {keys} | Plan: {plan}")
    print(f"Xuất hiện: {val['count']} lần | Thời gian lâu nhất: {val['max_duration_us']} µs")
    print(f"Sample command: {str(val['sample_cmd'])[:350]}")
