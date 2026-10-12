import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_memo_unauthorized():
    res = client.get("/api/v1/memo")
    assert res.status_code in (401, 403)


def test_memo_list_and_stats(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/memo?page=1&page_size=10", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "stats" in data
    assert data["total"] > 0
    assert data["stats"]["total"] == data["total"]


def test_next_it_setup(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/memo/next-it-setup", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "next_user" in data
    assert isinstance(data["user_list"], list)
    assert len(data["user_list"]) > 0


def test_app_users(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/memo/app-users", headers=headers)
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) > 0
    assert "username" in users[0]


def test_memo_crud_flow(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create
    payload = {
        "ma_memo": "TEST_MEMO_9999",
        "subject_mail": "https://gpms.ggg.com.vn/test-unit",
        "ngay_batdau": "2026-09-01",
        "ngay_ketthuc": "2026-10-01",
        "it_setup": "duy.ngo",
        "giahan": "0",
        "trangthai": "0",
        "nguoi_gui": "Unit Tester",
        "huong_dan": "Bước 1: Setup trên RK7; Bước 2: Bật khuyến mãi Loyalty.",
        "note": "Unit test note",
    }
    create_res = client.post("/api/v1/memo", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    memo_id = created_data["id"]
    giahan_id = None
    assert created_data["ma_memo"] == "TEST_MEMO_9999"
    assert created_data["trangthai"] == "0"

    try:
        # 2. Get Detail
        detail_res = client.get(f"/api/v1/memo/{memo_id}", headers=headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["huong_dan"] == payload["huong_dan"]

        # 3. Update to Trangthai = 2 (Đã Public) -> hoanthanh should be set
        update_payload = {
            "trangthai": "2",
            "note": "Updated by unit test",
        }
        update_res = client.put(f"/api/v1/memo/{memo_id}", json=update_payload, headers=headers)
        assert update_res.status_code == 200
        updated_data = update_res.json()
        assert updated_data["trangthai"] == "2"
        assert updated_data["hoanthanh"] is not None

        # 4. Gia Hạn Memo
        giahan_payload = {
            "ma_memo": "TEST_MEMO_9999",
            "ngay_batdau": "2026-10-02",
            "ngay_ketthuc": "2026-11-02",
            "it_setup": "hung.phamtran",
            "trangthai": "0",
        }
        giahan_res = client.post(f"/api/v1/memo/{memo_id}/gia-han", json=giahan_payload, headers=headers)
        assert giahan_res.status_code == 201
        giahan_data = giahan_res.json()
        giahan_id = giahan_data["id"]
        assert giahan_data["giahan"] == "1"
        assert giahan_data["it_setup"] == "hung.phamtran"

    finally:
        # 5. Delete (Soft)
        if giahan_id:
            client.delete(f"/api/v1/memo/{giahan_id}", headers=headers)
        del_res = client.delete(f"/api/v1/memo/{memo_id}", headers=headers)

        # 6. Hard-delete test rows from DB to avoid test pollution
        from app.core.database import SessionLocal
        from app.models.memo import Memo
        with SessionLocal() as db:
            for mid in [memo_id, giahan_id]:
                if mid:
                    m = db.get(Memo, mid)
                    if m:
                        db.delete(m)
            db.commit()


def test_memo_export(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/memo/export", headers=headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert len(res.content) > 1000


def test_round_robin_configuration(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Get round robin config
    res = client.get("/api/v1/memo/round-robin-config", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "users" in data
    assert data["total"] > 0
    all_users = data["users"]
    all_usernames = [u["username"] for u in all_users]

    # Pick the first user to exclude
    user_to_exclude = all_usernames[0]
    new_active = [u for u in all_usernames if u != user_to_exclude]

    try:
        # 2. Update config: exclude user_to_exclude
        put_res = client.put(
            "/api/v1/memo/round-robin-config",
            json={"active_usernames": new_active},
            headers=headers,
        )
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["active_count"] == len(new_active)

        # Verify in next-it-setup that excluded user is NOT in user_list
        next_res = client.get("/api/v1/memo/next-it-setup", headers=headers)
        assert next_res.status_code == 200
        next_data = next_res.json()
        assert user_to_exclude.lower() not in next_data["user_list"]

    finally:
        # 3. Restore all users back to active
        restore_res = client.put(
            "/api/v1/memo/round-robin-config",
            json={"active_usernames": all_usernames},
            headers=headers,
        )
        assert restore_res.status_code == 200
        assert restore_res.json()["active_count"] == len(all_usernames)
