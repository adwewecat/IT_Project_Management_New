"""
Script tối ưu Index cho MongoDB 10.9.62.12:27017
Chỉ chạy khi bạn đồng ý tạo Index để giảm tải CPU từ 40% xuống < 2%.
Script hoàn toàn độc lập trong thư mục Check_he_thong, không can thiệp code dự án.
"""

import time
from pymongo import MongoClient

def main():
    host = "10.9.62.12"
    port = 27017
    print(f"Đang kết nối tới MongoDB {host}:{port}...")
    client = MongoClient(host, port, serverSelectionTimeoutMS=5000)

    indexes_to_create = [
        # (Database, Collection, Index specification, name)
        ("G_KITCHEN", "DISH_KDS", [("lineGuid", 1)], "idx_lineGuid"),
        ("G_KITCHEN", "DISH_KDS", [("id", 1)], "idx_id"),
        ("G_KITCHEN", "DISH_KDS", [("submitTime", -1)], "idx_submitTime"),
        ("G_ORDER", "ORDER", [("lstSession.lineGuid", 1), ("status", 1)], "idx_lstSession_lineGuid_status"),
        ("G_ORDER", "CO_MENU_ITEM", [("code", 1)], "idx_code"),
    ]

    print("\nBẮT ĐẦU TẠO INDEXES...")
    for db_name, coll_name, keys, name in indexes_to_create:
        coll = client[db_name][coll_name]
        existing = [idx.get("name") for idx in coll.list_indexes()]
        if name in existing:
            print(f"[ĐÃ TỒN TẠI] {db_name}.{coll_name} -> {name}")
            continue

        print(f"[ĐANG TẠO] {db_name}.{coll_name} -> {keys} ({name})...", end="", flush=True)
        t0 = time.time()
        res = coll.create_index(keys, name=name, background=True)
        dur = time.time() - t0
        print(f" XONG ({dur:.2f}s) -> {res}")

    print("\nHOÀN TẤT TẠO INDEXES! Hãy kiểm tra lại CPU trên Task Manager sau vài giây.")

if __name__ == "__main__":
    main()
