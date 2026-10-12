from pymongo import MongoClient

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)
db_kitchen = client["G_KITCHEN"]
coll = db_kitchen["DISH_KDS"]

# Lấy 1 bản ghi ở gần cuối
sample = list(coll.find().skip(100000).limit(1))
if sample:
    doc = sample[0]
    guid = doc.get("lineGuid")
    doc_id = doc.get("id")
    print(f"Test với lineGuid: {guid}, id: {doc_id}")
    
    exp1 = coll.find({"lineGuid": guid}).explain()
    stats1 = exp1.get("executionStats", {})
    print("\nExplain find(lineGuid):")
    print(f" - winningPlan: {exp1.get('queryPlanner', {}).get('winningPlan', {}).get('stage')}")
    print(f" - totalDocsExamined: {stats1.get('totalDocsExamined')}")
    print(f" - executionTimeMillis: {stats1.get('executionTimeMillis')} ms")

    exp2 = coll.find({"id": doc_id}).explain()
    stats2 = exp2.get("executionStats", {})
    print("\nExplain find(id):")
    print(f" - winningPlan: {exp2.get('queryPlanner', {}).get('winningPlan', {}).get('stage')}")
    print(f" - totalDocsExamined: {stats2.get('totalDocsExamined')}")
    print(f" - executionTimeMillis: {stats2.get('executionTimeMillis')} ms")
