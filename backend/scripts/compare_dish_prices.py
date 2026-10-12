from pymongo import MongoClient
import json

client = MongoClient('10.8.45.41', 27017, serverSelectionTimeoutMS=3000)
db_order = client['G_ORDER']
db_kitchen = client['G_KITCHEN']

# 1. DISH_CACHE
cache_docs = list(db_order['DISH_CACHE'].find())
print(f"So document trong G_ORDER.DISH_CACHE: {len(cache_docs)}")
cache_dishes = {}
for cdoc in cache_docs:
    cat = cdoc.get('orderCategoryCode')
    for d in cdoc.get('dishs', []):
        m = d.get('menuItem', {})
        code = str(m.get('code') or '')
        if code:
            cache_dishes[code] = {
                'name': m.get('name'),
                'price': d.get('price'),
                'cookMins': m.get('cookMins'),
                'sapCode': m.get('sapCode'),
                'groupName': d.get('groupName')
            }
print(f"Tong so mon trong DISH_CACHE: {len(cache_dishes)}")

# 2. SHOW_HIDE_ITEMS
show_hide_map = {}
for doc in db_order['SHOW_HIDE_ITEMS'].find():
    code = str(doc.get('itemCode') or '')
    if code:
        show_hide_map[code] = {
            'name': doc.get('name'),
            'price': doc.get('price'),
            'sapCode': doc.get('sapCode')
        }
print(f"Tong so mon trong G_ORDER.SHOW_HIDE_ITEMS: {len(show_hide_map)}")

# 3. OUT_OF_DISH
out_dish_map = {}
for doc in db_order['OUT_OF_DISH'].find():
    code = str(doc.get('code') or '')
    if code:
        out_dish_map[code] = {
            'name': doc.get('name'),
            'price': doc.get('price'),
            'sapCode': doc.get('sapCode')
        }
print(f"Tong so mon trong G_ORDER.OUT_OF_DISH: {len(out_dish_map)}")

# 4. CONFIG_COOKING
cooking_map = {}
for doc in db_kitchen['CONFIG_COOKING'].find():
    code = str(doc.get('menuItemCode') or '')
    if code:
        cooking_map[code] = {
            'name': doc.get('menuItemName'),
            'sapCode': doc.get('sapCode'),
            'singleCookingTime': doc.get('singleCookingTime'),
            'groupTypeKds': doc.get('groupTypeKds', {}).get('name') if isinstance(doc.get('groupTypeKds'), dict) else doc.get('groupTypeKds')
        }
print(f"Tong so mon trong G_KITCHEN.CONFIG_COOKING: {len(cooking_map)}")

# 5. SO SANH GIA GIUA CAC BANG
print("\n" + "="*70)
print("SO SANH GIA GIUA DISH_CACHE, SHOW_HIDE_ITEMS VA OUT_OF_DISH:")
print("="*70)
diff_prices = []
same_prices = 0

all_codes = set(list(cache_dishes.keys()) + list(show_hide_map.keys()) + list(out_dish_map.keys()))
for code in all_codes:
    p_cache = cache_dishes.get(code, {}).get('price')
    p_show = show_hide_map.get(code, {}).get('price')
    p_out = out_dish_map.get(code, {}).get('price')
    name = (cache_dishes.get(code) or show_hide_map.get(code) or out_dish_map.get(code) or {}).get('name')
    
    # Collect non-None prices
    prices = {}
    if p_cache is not None: prices['DISH_CACHE'] = p_cache
    if p_show is not None: prices['SHOW_HIDE_ITEMS'] = p_show
    if p_out is not None: prices['OUT_OF_DISH'] = p_out
    
    vals = list(prices.values())
    if len(set(vals)) > 1:
        diff_prices.append((code, name, prices))
    elif len(vals) > 1:
        same_prices += 1

print(f"So mon co gia KHOP NHAU hoan toan giua cac bang: {same_prices}")
print(f"So mon co gia KHAC NHAU giua cac bang: {len(diff_prices)}")
if diff_prices:
    print("Mau cac mon co su khac nhau:")
    for code, name, pdict in diff_prices[:10]:
        print(f"  - [{code}] {name}: {pdict}")

print("\n" + "="*70)
print("MAU 10 MON TRONG CONFIG_COOKING KEM GIA TU DISH_CACHE:")
print("="*70)
for code, cinfo in list(cooking_map.items())[:10]:
    price = cache_dishes.get(code, {}).get('price')
    if price is None:
        price = show_hide_map.get(code, {}).get('price')
    if price is None:
        price = out_dish_map.get(code, {}).get('price')
    
    sap = cinfo.get('sapCode') or cache_dishes.get(code, {}).get('sapCode') or show_hide_map.get(code, {}).get('sapCode')
    cook_s = cinfo.get('singleCookingTime', 0)
    cook_m = f"{cook_s // 60}p {cook_s % 60}s" if cook_s else "0s"
    print(f"Ma: {code:<6} | SAP: {str(sap):<10} | Gia: {str(price):<10} | TG: {cook_m:<8} ({cook_s}s) | Ten: {cinfo.get('name')}")

client.close()
