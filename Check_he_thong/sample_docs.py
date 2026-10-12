import json
from pymongo import MongoClient
from datetime import datetime

def default_json(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

client = MongoClient("10.9.62.12", 27017, serverSelectionTimeoutMS=5000)
doc = client["G_KITCHEN"]["DISH_KDS"].find_one()
print(json.dumps(doc, indent=2, default=default_json))
