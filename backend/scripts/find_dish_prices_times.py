from pymongo import MongoClient
import json
from bson import json_util

client = MongoClient('10.8.45.41', 27017, serverSelectionTimeoutMS=3000)

print("="*70)
print("CHI TIET CAC BANG TRONG G_KITCHEN VA G_ORDER CO CHUA MON, GIA & THOI GIAN CHE BIEN")
print("="*70)

# 1. G_KITCHEN.DISH_KDS
col_dish_kds = client['G_KITCHEN']['DISH_KDS']
doc_kds = col_dish_kds.find_one({'itemKds.lstDish': {'$exists': True, '$ne': []}})
if doc_kds:
    lst = doc_kds.get('itemKds', {}).get('lstDish', [])
    print(f"\n1. [G_KITCHEN.DISH_KDS] (Chua mon order xuong bep KDS):")
    for dish in lst[:2]:
        m = dish.get('menuItem', {})
        c = dish.get('configCooking', {})
        print(f"   - Ma mon: {m.get('code')}")
        print(f"   - Ten mon: {m.get('name')}")
        print(f"   - Gia mon (price): {dish.get('price')} VND")
        print(f"   - Thoi gian che bien menu (cookMins): {m.get('cookMins')} phut")
        print(f"   - Thoi gian che bien cau hinh (singleCookingTime): {c.get('singleCookingTime')} giay")
        print(f"   - Vi tri bep (placeIds): {c.get('placeIds')}, Nhom bep: {c.get('groupTypeKds', {}).get('name')}")

# 2. G_KITCHEN.CONFIG_COOKING
col_cfg = client['G_KITCHEN']['CONFIG_COOKING']
print(f"\n2. [G_KITCHEN.CONFIG_COOKING] (Cau hinh thoi gian che bien mon tren KDS - Total: {col_cfg.count_documents({})} docs):")
for doc in col_cfg.find().limit(5):
    print(f"   - Ma mon (menuItemCode): {doc.get('menuItemCode')}")
    print(f"     Ten mon (menuItemName): {doc.get('menuItemName')}")
    print(f"     Ma SAP (sapCode): {doc.get('sapCode')}")
    print(f"     Thoi gian che bien (singleCookingTime): {doc.get('singleCookingTime')} giay (= {doc.get('singleCookingTime', 0)/60:.1f} phut)")
    print(f"     Nhom bep (groupTypeKds): {doc.get('groupTypeKds', {}).get('name')}")

# 3. G_KITCHEN.LOG_DISH_FINISH_ITEM
col_finish = client['G_KITCHEN']['LOG_DISH_FINISH_ITEM']
print(f"\n3. [G_KITCHEN.LOG_DISH_FINISH_ITEM] (Nhat ky hoan thanh mon o bep - Total: {col_finish.count_documents({})} docs):")
doc_finish = col_finish.find_one()
if doc_finish:
    m = doc_finish.get('menuItem', {})
    c = doc_finish.get('configCooking', {})
    print(f"   - Ten mon: {m.get('name')} (Ma: {m.get('code')})")
    print(f"   - Thoi gian che bien chuan (singleCookingTime): {c.get('singleCookingTime')} giay")
    print(f"   - Submit time: {doc_finish.get('submitTime')}")
    print(f"   - Delivery time: {doc_finish.get('deliveryTime')}")
    if doc_finish.get('submitTime') and doc_finish.get('deliveryTime'):
        duration = (doc_finish.get('deliveryTime') - doc_finish.get('submitTime')) / 1000
        print(f"   - Thoi gian che bien thuc te: {duration:.1f} giay")

# 4. G_ORDER.ORDER
col_order = client['G_ORDER']['ORDER']
doc_order = col_order.find_one({'lstSession.lstDish': {'$exists': True, '$ne': []}})
if not doc_order:
    doc_order = col_order.find_one({'lstSession': {'$exists': True, '$ne': []}})
print(f"\n4. [G_ORDER.ORDER] (Don hang order GPOS):")
if doc_order:
    sessions = doc_order.get('lstSession', [])
    for sess in sessions[:1]:
        dishes = sess.get('lstDish', [])
        for d in dishes[:2]:
            m = d.get('menuItem', {})
            print(f"   - Ten mon: {m.get('name')} (Ma: {m.get('code')})")
            print(f"   - Gia mon: {d.get('price')} VND")
            print(f"   - Thoi gian che bien (cookMins): {m.get('cookMins')} phut")

# 5. G_ORDER.ORDER_DELIVERY_LOG
col_deliv = client['G_ORDER']['ORDER_DELIVERY_LOG']
print(f"\n5. [G_ORDER.ORDER_DELIVERY_LOG] (Nhat ky tra mon GPOS - Total: {col_deliv.count_documents({})} docs):")
doc_deliv = col_deliv.find_one()
if doc_deliv:
    m = doc_deliv.get('menuItem', {})
    print(f"   - Ten mon: {m.get('name')} (Ma: {m.get('code')}, SAP: {m.get('sapCode')})")
    print(f"   - Thoi gian che bien chuan (configCookTime): {doc_deliv.get('configCookTime')} ms (= {doc_deliv.get('configCookTime',0)/60000:.1f} phut)")
    print(f"   - Thoi gian che bien thuc te (actualCookTime): {doc_deliv.get('actualCookTime')} ms (= {doc_deliv.get('actualCookTime',0)/60000:.1f} phut)")
    print(f"   - Ban: {doc_deliv.get('tableName')}, Vi tri bep: {doc_deliv.get('placeName')}")

client.close()
