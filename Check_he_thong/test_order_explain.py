from pymongo import MongoClient

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)
db_order = client["G_ORDER"]
coll = db_order["ORDER"]

sample = coll.find_one({"status": 2, "lstSession.0": {"$exists": True}})
if sample and "lstSession" in sample and len(sample["lstSession"]) > 0:
    first_session = sample["lstSession"][0]
    line_guid = first_session.get("lineGuid")
    print(f"Testing ORDER query with lineGuid={line_guid}, status=2")
    exp = coll.find({"lstSession.lineGuid": line_guid, "status": 2}).explain()
    stats = exp.get("executionStats", {})
    plan = exp.get("queryPlanner", {}).get("winningPlan", {})
    print(f" - winningPlan: {plan.get('stage')}")
    print(f" - totalDocsExamined: {stats.get('totalDocsExamined')}")
    print(f" - executionTimeMillis: {stats.get('executionTimeMillis')} ms")
