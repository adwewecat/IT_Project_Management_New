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


def test_ext_rsc_unauthorized():
    res = client.get("/api/v1/ext-rsc")
    assert res.status_code in (401, 403)


def test_code_photo_unauthorized():
    res = client.get("/api/v1/code-photo")
    assert res.status_code in (401, 403)


def test_ext_rsc_list(admin_token):
    res = client.get(
        "/api/v1/ext-rsc?page=1&page_size=20",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 0


def test_ext_rsc_crud_flow(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create
    payload = {
        "nhanvien": "Test NV Extension",
        "email": "test_ext_automation@ggg.com.vn",
        "manv": "TEST9999",
        "so_ext": "9999",
        "phongban": "IT Dept",
        "note": "Unit test note",
    }
    create_res = client.post("/api/v1/ext-rsc", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    item_id = created_data["id"]
    assert created_data["so_ext"] == "9999"
    assert created_data["nhanvien"] == "Test NV Extension"

    # 2. Update
    update_payload = {
        "nhanvien": "Test NV Extension Updated",
        "so_ext": "8888",
    }
    update_res = client.put(f"/api/v1/ext-rsc/{item_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["so_ext"] == "8888"

    # 3. Export Excel
    export_res = client.get("/api/v1/ext-rsc/export?search=TEST9999", headers=headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # 4. Delete
    del_res = client.delete(f"/api/v1/ext-rsc/{item_id}", headers=headers)
    assert del_res.status_code == 200


def test_code_photo_list_and_stats(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    stats_res = client.get("/api/v1/code-photo/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total" in stats
    assert "total_on" in stats
    assert "total_off" in stats

    list_res = client.get("/api/v1/code-photo?page=1&page_size=20", headers=headers)
    assert list_res.status_code == 200
    data = list_res.json()
    assert "items" in data
    assert "total" in data
    assert "stats" in data


def test_code_photo_crud_flow(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    unique_email = "test_code_photo_auto_999@ggg.com.vn"

    # 1. Create
    payload = {
        "hientrang": "ON",
        "manv": "CP999",
        "name": "Test Nhan Vien Photo",
        "email": unique_email,
        "pass_code": "98765",
        "cmnd_sdt": "0987654321",
        "bophan": "IT Support",
        "chucdanh": "Helpdesk Specialist",
        "code_dept": "IT",
        "note": "Auto test code photo",
    }
    create_res = client.post("/api/v1/code-photo", json=payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    item_id = created_data["id"]
    assert created_data["email"] == unique_email
    assert created_data["pass_code"] == "98765"

    # 2. Duplicate email check
    dup_res = client.post("/api/v1/code-photo", json=payload, headers=headers)
    assert dup_res.status_code == 400
    assert "đã được cấp" in dup_res.json()["detail"] or "tồn tại" in dup_res.json()["detail"]

    # 3. Update
    update_payload = {
        "pass_code": "54321",
        "hientrang": "OFF",
    }
    update_res = client.put(f"/api/v1/code-photo/{item_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["pass_code"] == "54321"
    assert update_res.json()["hientrang"] == "OFF"

    # 4. Export Excel
    export_res = client.get("/api/v1/code-photo/export?search=CP999", headers=headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    # 5. Delete
    del_res = client.delete(f"/api/v1/code-photo/{item_id}", headers=headers)
    assert del_res.status_code == 200
