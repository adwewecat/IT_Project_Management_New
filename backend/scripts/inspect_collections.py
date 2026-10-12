from pymongo import MongoClient

c = MongoClient('10.9.0.12', 27017, serverSelectionTimeoutMS=2000)
db = c['G_ORDER']

print("=== APP_CACHE ===")
for d in db['APP_CACHE'].find().limit(5):
    print(d)

print("=== POS_API_CONFIG ===")
for d in db['POS_API_CONFIG'].find().limit(5):
    print(d)

print("=== WAITER_TALENT ===")
for d in db['WAITER_TALENT'].find().limit(5):
    print(d)

print("=== ALL APP_PARAM CODES ===")
for p in db['APP_PARAM'].find({}, {'paramCode': 1, 'value': 1, 'note': 1}):
    print(str(p.get('paramCode')) + ": " + str(p.get('value')) + " | " + str(p.get('note')))

c.close()
