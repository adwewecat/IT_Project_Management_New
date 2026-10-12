import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_admin_token() -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_list_restaurants_unauthorized():
    response = client.get("/api/v1/restaurants")
    assert response.status_code == 401


def test_list_restaurants_as_admin():
    token = get_admin_token()
    response = client.get(
        "/api/v1/restaurants?page=1&page_size=10",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 500  # Database has 548 restaurants
    assert len(data["items"]) <= 10
    first = data["items"][0]
    assert "id" in first
    assert "res" in first


def test_get_restaurant_options():
    token = get_admin_token()
    response = client.get(
        "/api/v1/restaurants/options",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "regions" in data
    assert "brands" in data
    assert len(data["regions"]) > 0


def test_search_and_filter_restaurants():
    token = get_admin_token()
    # Search for 'Central'
    response = client.get(
        "/api/v1/restaurants?search=Central",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert any("central" in (r["res"] or "").lower() for r in data["items"])

    # Test tìm kiếm có dấu vs không dấu: 'cần thơ' vs 'can tho'
    res_accented = client.get(
        "/api/v1/restaurants?search=cần thơ&page_size=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_accented.status_code == 200
    data_accented = res_accented.json()
    assert data_accented["total"] > 0

    res_unaccented = client.get(
        "/api/v1/restaurants?search=can tho&page_size=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_unaccented.status_code == 200
    data_unaccented = res_unaccented.json()
    # Phải trả về số lượng kết quả như nhau
    assert data_unaccented["total"] == data_accented["total"]

    # Cả hai cách tìm đều phải tìm thấy Yutang Lotte Mart Cần Thơ
    yutang_names_accented = [r["res"] for r in data_accented["items"] if "yutang" in (r["res"] or "").lower()]
    yutang_names_unaccented = [r["res"] for r in data_unaccented["items"] if "yutang" in (r["res"] or "").lower()]
    assert len(yutang_names_accented) > 0
    assert len(yutang_names_unaccented) > 0

    # Tìm kiếm đa từ 'Yutang Cần Thơ' và 'yutang can tho'
    multi_accent = client.get(
        "/api/v1/restaurants?search=Yutang Cần Thơ",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert multi_accent.status_code == 200
    assert any("yutang" in (r["res"] or "").lower() for r in multi_accent.json()["items"])

    multi_unaccent = client.get(
        "/api/v1/restaurants?search=yutang can tho",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert multi_unaccent.status_code == 200
    assert any("yutang" in (r["res"] or "").lower() for r in multi_unaccent.json()["items"])


def test_get_restaurant_detail():
    token = get_admin_token()
    # List first
    list_resp = client.get(
        "/api/v1/restaurants?page=1&page_size=1",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert list_resp.status_code == 200
    first_id = list_resp.json()["items"][0]["id"]

    # Get detail
    detail_resp = client.get(
        f"/api/v1/restaurants/{first_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == first_id
    assert "res" in detail


def test_export_restaurants_excel():
    token = get_admin_token()
    response = client.get(
        "/api/v1/restaurants/export/excel",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(response.content) > 1000  # Valid Excel file size


def test_list_and_create_brand():
    token = get_admin_token()
    # List brands
    res = client.get(
        "/api/v1/restaurants/brands",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    brands = res.json()
    assert isinstance(brands, list)
    assert len(brands) > 0

    # Create new brand with unique timestamp
    import time
    ts = int(time.time())
    test_brand_name = f"TestBrand_{ts}"
    test_brand_code = f"tb_{ts}"
    create_res = client.post(
        "/api/v1/restaurants/brands",
        json={"tenbrand": test_brand_name, "mabrand": test_brand_code},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["tenbrand"] == test_brand_name
    brand_id = created["id"]

    try:
        # Duplicate brand name should fail with 400
        dup_res = client.post(
            "/api/v1/restaurants/brands",
            json={"tenbrand": test_brand_name, "mabrand": f"other_{ts}"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dup_res.status_code == 400

        # Duplicate brand code should fail with 400
        dup_code_res = client.post(
            "/api/v1/restaurants/brands",
            json={"tenbrand": f"OtherBrand_{ts}", "mabrand": test_brand_code},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dup_code_res.status_code == 400
    finally:
        from app.core.database import SessionLocal
        from app.models.brand_region import Brand
        db = SessionLocal()
        b = db.get(Brand, brand_id)
        if b:
            db.delete(b)
            db.commit()
        db.close()


def test_list_and_create_region():
    token = get_admin_token()
    # List regions
    res = client.get(
        "/api/v1/restaurants/regions",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    regions = res.json()
    assert isinstance(regions, list)
    assert len(regions) > 0

    # Create new region with unique timestamp
    import time
    test_region_name = f"TestRegion_{int(time.time())}"
    create_res = client.post(
        "/api/v1/restaurants/regions",
        json={"ten_tinhthanh": test_region_name, "ma_tinhthanh": "TR", "bienso": "999"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["ten_tinhthanh"] == test_region_name
    region_id = created["id"]

    try:
        # Duplicate region should fail with 400
        dup_reg = client.post(
            "/api/v1/restaurants/regions",
            json={"ten_tinhthanh": test_region_name},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dup_reg.status_code == 400
    finally:
        from app.core.database import SessionLocal
        from app.models.brand_region import Region
        db = SessionLocal()
        r = db.get(Region, region_id)
        if r:
            db.delete(r)
            db.commit()
        db.close()


def test_duplicate_restaurant_validations():
    token = get_admin_token()
    import time
    ts = int(time.time())
    unique_sap = f"SAP_{ts}"
    unique_rk7 = f"RK_{ts}"
    unique_email = f"nh_{ts}@ggg.com.vn"

    # 1. Create a base restaurant
    res1 = client.post(
        "/api/v1/restaurants",
        json={
            "res": f"Restaurant Unique {ts}",
            "sap": unique_sap,
            "rk7": unique_rk7,
            "email": unique_email,
            "trangthai": "ON"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 201
    created_res_id = res1.json()["id"]

    try:
        # 2. Try creating with same SAP -> should fail 400
        dup_sap = client.post(
            "/api/v1/restaurants",
            json={
                "res": f"Restaurant Dup SAP {ts}",
                "sap": unique_sap,
                "rk7": f"DIFF_{ts}",
                "email": f"diff_{ts}@ggg.com.vn"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dup_sap.status_code == 400
        assert "Mã SAP" in dup_sap.json()["detail"]

        # 3. Try creating with same RK7 -> should fail 400
        dup_rk7 = client.post(
            "/api/v1/restaurants",
            json={
                "res": f"Restaurant Dup RK7 {ts}",
                "sap": f"DIFF_SAP_{ts}",
                "rk7": unique_rk7,
                "email": f"diff2_{ts}@ggg.com.vn"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dup_rk7.status_code == 400
        assert "Mã RK7" in dup_rk7.json()["detail"]

        # 4. Try creating with same Email -> should fail 400
        dup_mail = client.post(
            "/api/v1/restaurants",
            json={
                "res": f"Restaurant Dup Mail {ts}",
                "sap": f"DIFF_SAP2_{ts}",
                "rk7": f"DIFF_RK2_{ts}",
                "email": unique_email
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert dup_mail.status_code == 400
        assert "Email" in dup_mail.json()["detail"]
    finally:
        from app.core.database import SessionLocal
        from app.models.restaurant import Restaurant
        db = SessionLocal()
        r = db.get(Restaurant, created_res_id)
        if r:
            db.delete(r)
            db.commit()
        db.close()


def test_restaurant_status_off_hidden_for_non_superadmin():
    from app.core.security import create_access_token
    from app.core.database import SessionLocal
    from app.models.restaurant import Restaurant
    from app.models.audit_log import AuditLog
    import time

    admin_token = get_admin_token()
    non_super_token = create_access_token({"sub": "dat.luong"})

    ts = int(time.time())
    unique_sap = f"OFF_SAP_{ts}"
    unique_rk7 = f"OFF_RK_{ts}"
    unique_name = f"Hidden Restaurant {ts}"

    # 1. Super Admin creates a restaurant with status='OFF'
    create_res = client.post(
        "/api/v1/restaurants",
        json={
            "res": unique_name,
            "sap": unique_sap,
            "rk7": unique_rk7,
            "status": "OFF",
            "trangthai": "OFF"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    res_id = create_res.json()["id"]

    try:
        # 2. Super Admin can see it in search
        admin_search = client.get(
            f"/api/v1/restaurants?search={unique_sap}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_search.status_code == 200
        admin_data = admin_search.json()
        assert admin_data["total"] >= 1
        assert any(r["id"] == res_id for r in admin_data["items"])
        item = next(r for r in admin_data["items"] if r["id"] == res_id)
        assert item["status"] == "OFF"

        # 3. Super Admin can view detail
        admin_detail = client.get(
            f"/api/v1/restaurants/{res_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_detail.status_code == 200
        assert admin_detail.json()["id"] == res_id
        assert admin_detail.json()["status"] == "OFF"

        # 4. Non-superadmin cannot see it in search / list
        user_search = client.get(
            f"/api/v1/restaurants?search={unique_sap}",
            headers={"Authorization": f"Bearer {non_super_token}"}
        )
        assert user_search.status_code == 200
        user_data = user_search.json()
        assert not any(r["id"] == res_id for r in user_data["items"])

        # 5. Non-superadmin cannot access detail (404)
        user_detail = client.get(
            f"/api/v1/restaurants/{res_id}",
            headers={"Authorization": f"Bearer {non_super_token}"}
        )
        assert user_detail.status_code == 404

        # 6. Non-superadmin cannot update status
        # Create an ON restaurant first
        on_res = client.post(
            "/api/v1/restaurants",
            json={
                "res": f"ON Restaurant {ts}",
                "sap": f"ON_SAP_{ts}",
                "rk7": f"ON_RK_{ts}",
                "status": "ON"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert on_res.status_code == 201
        on_id = on_res.json()["id"]

        try:
            # Non-superadmin attempts to set status='OFF'
            # Note: update_restaurant strips 'status' if not super admin
            update_attempt = client.put(
                f"/api/v1/restaurants/{on_id}",
                json={"status": "OFF", "note": "Kiểm thử phân quyền status"},
                headers={"Authorization": f"Bearer {non_super_token}"}
            )
            # Status should remain ON in DB
            db = SessionLocal()
            r_db = db.get(Restaurant, on_id)
            assert r_db.status == "ON"
            db.close()
        finally:
            db = SessionLocal()
            r_del = db.get(Restaurant, on_id)
            if r_del:
                db.delete(r_del)
            # Dọn log test
            db.query(AuditLog).filter(AuditLog.manhinh == "RESTAURANT", AuditLog.noidung.ilike(f"%{on_id}%")).delete(synchronize_session=False)
            db.commit()
            db.close()

    finally:
        db = SessionLocal()
        r = db.get(Restaurant, res_id)
        if r:
            db.delete(r)
        # Dọn log test
        db.query(AuditLog).filter(AuditLog.manhinh == "RESTAURANT", AuditLog.noidung.ilike(f"%{res_id}%")).delete(synchronize_session=False)
        db.commit()
        db.close()


def test_column_permissions_aliases():
    from app.services.restaurant_service import COLUMN_PERMISSIONS_MAP, get_user_allowed_columns
    from app.schemas.auth import UserInfo

    # Ensure email maps to both update_email and update_email_nh
    assert "email" in COLUMN_PERMISSIONS_MAP
    view_perms, update_perms = COLUMN_PERMISSIONS_MAP["email"]
    assert "update_email_nh" in update_perms
    assert "update_email" in update_perms

    # User with only update_email_nh should have email in allowed_update
    user_with_nh = UserInfo(
        id=999,
        username="tester",
        phanquyen="3",
        permissions={"update_email_nh": True}
    )
    allowed_view, allowed_update = get_user_allowed_columns(user_with_nh)
    assert "email" in allowed_update


def test_restaurant_date_validation():
    import time
    from app.core.database import SessionLocal
    from app.models.restaurant import Restaurant

    token = get_admin_token()
    ts = int(time.time())

    # 1. Tạo nhà hàng với ngày sai định dạng -> phải báo lỗi 400
    res_bad = client.post(
        "/api/v1/restaurants",
        json={
            "res": f"Bad Date Restaurant {ts}",
            "sap": f"BAD_DATE_{ts}",
            "rk7": f"BAD_RK_{ts}",
            "ngay_khaitruong": "sai-dinh-dang-ngay",
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_bad.status_code == 400
    assert "Định dạng ngày" in res_bad.json()["detail"]

    # 2. Tạo nhà hàng với ngày hợp lệ DD/MM/YYYY
    res_ok = client.post(
        "/api/v1/restaurants",
        json={
            "res": f"Valid Date Restaurant {ts}",
            "sap": f"OK_DATE_{ts}",
            "rk7": f"OK_RK_{ts}",
            "ngay_khaitruong": "14/09/2026",
            "ngay_online_ftth": "2026-09-14",
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_ok.status_code == 201
    created_id = res_ok.json()["id"]

    try:
        # Kiểm tra chi tiết ngày trả về
        detail = client.get(
            f"/api/v1/restaurants/{created_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert detail.status_code == 200
        assert "2026-09-14" in detail.json()["ngay_khaitruong"]
        assert "2026-09-14" in detail.json()["ngay_online_ftth"]

        # 3. Cập nhật ngày sai định dạng -> 400
        up_bad = client.put(
            f"/api/v1/restaurants/{created_id}",
            json={"ngay_khaitruong": "32/13/2026"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert up_bad.status_code == 400
        assert "Định dạng ngày" in up_bad.json()["detail"]

        # 4. Cập nhật ngày rỗng -> thành công xóa ngày
        up_empty = client.put(
            f"/api/v1/restaurants/{created_id}",
            json={"ngay_khaitruong": "", "ngay_online_ftth": ""},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert up_empty.status_code == 200
        assert up_empty.json()["ngay_khaitruong"] is None
        assert up_empty.json()["ngay_online_ftth"] is None

    finally:
        db = SessionLocal()
        r = db.get(Restaurant, created_id)
        if r:
            db.delete(r)
            db.commit()
        db.close()


def test_restaurant_audit_logs_and_security():
    import time
    from app.core.security import create_access_token
    from app.core.database import SessionLocal
    from app.models.restaurant import Restaurant
    from app.models.audit_log import AuditLog

    admin_token = get_admin_token()
    # Tài khoản không phải admin (ví dụ: dat.luong quyền 3)
    user_token = create_access_token({"sub": "dat.luong"})

    ts = int(time.time())
    secret_pass = f"MyTopSecret_{ts}"

    # 1. Thêm mới nhà hàng có đặt mật khẩu
    create_res = client.post(
        "/api/v1/restaurants",
        json={
            "res": f"Log Test Res {ts}",
            "sap": f"LOG_SAP_{ts}",
            "rk7": f"LOG_RK_{ts}",
            "pass_mail": secret_pass,
            "pass_ftth": secret_pass
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    res_id = create_res.json()["id"]

    try:
        # Cập nhật mật khẩu mới
        new_secret = f"NewSuperSecret_{ts}"
        up_res = client.put(
            f"/api/v1/restaurants/{res_id}",
            json={
                "pass_mail": new_secret,
                "note": "Updated note test"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert up_res.status_code == 200

        # 2. Kiểm tra log trong CSDL: TUYỆT ĐỐI KHÔNG CHỨA plaintext password
        db = SessionLocal()
        logs = db.query(AuditLog).filter(
            AuditLog.manhinh == "RESTAURANT",
            AuditLog.noidung.ilike(f"%{res_id}%")
        ).all()
        assert len(logs) >= 2

        for log in logs:
            assert secret_pass not in (log.noidung or ""), "Password plaintext bị lộ trong log thêm mới!"
            assert new_secret not in (log.noidung or ""), "Password plaintext bị lộ trong log cập nhật!"
        db.close()

        # 3. Phân quyền xem log:
        # User thường KHÔNG thấy log của Super Admin
        user_log_res = client.get(
            f"/api/v1/restaurants/logs?search={res_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert user_log_res.status_code == 200
        user_data = user_log_res.json()
        assert len(user_data["items"]) == 0, "User thường không được thấy log do Supper Admin thực hiện!"

        # Super Admin xem được toàn bộ log
        admin_log_res = client.get(
            f"/api/v1/restaurants/logs?search={res_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_log_res.status_code == 200
        admin_data = admin_log_res.json()
        assert len(admin_data["items"]) >= 2, "Supper Admin phải xem được log của mình!"
        # Kiểm tra nội dung log qua API cũng không chứa password
        for item in admin_data["items"]:
            assert secret_pass not in item["noidung"]
            assert new_secret not in item["noidung"]

        # User thường thực hiện cập nhật -> Cả User và Super Admin đều thấy log này
        up_by_user = client.put(
            f"/api/v1/restaurants/{res_id}",
            json={"note": "Note updated by regular user"},
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert up_by_user.status_code == 200

        user_log_res2 = client.get(
            f"/api/v1/restaurants/logs?search={res_id}",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert len(user_log_res2.json()["items"]) == 1
        assert user_log_res2.json()["items"][0]["user_thuchien"] == "dat.luong"

        admin_log_res2 = client.get(
            f"/api/v1/restaurants/logs?search={res_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert len(admin_log_res2.json()["items"]) >= 3

        # 4. Xuất file Excel nhật ký logs
        excel_res = client.get(
            f"/api/v1/restaurants/logs/export/excel?search={res_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert excel_res.status_code == 200
        assert excel_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert len(excel_res.content) > 1000

    finally:
        db = SessionLocal()
        r = db.get(Restaurant, res_id)
        if r:
            db.delete(r)
        # Dọn sạch log test
        db.query(AuditLog).filter(AuditLog.manhinh == "RESTAURANT", AuditLog.noidung.ilike(f"%{res_id}%")).delete(synchronize_session=False)
        db.commit()
        db.close()




