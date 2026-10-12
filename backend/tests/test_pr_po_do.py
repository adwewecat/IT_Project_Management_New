import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.theodoi_pr_po_do_service import detect_loai_from_so

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_detect_loai_from_so():
    assert detect_loai_from_so("1100030286") == "PR"
    assert detect_loai_from_so("1200007543") == "PR"
    assert detect_loai_from_so("1300060322") == "PR"
    assert detect_loai_from_so("1400012345") == "PR"
    assert detect_loai_from_so("4100040001") == "PO"
    assert detect_loai_from_so("4200040001") == "PO"
    assert detect_loai_from_so("4300040001") == "PO"
    assert detect_loai_from_so("4400040001") == "PO"
    assert detect_loai_from_so("0012345678") == "DO"
    assert detect_loai_from_so("4900000123") == "DO"
    assert detect_loai_from_so("9900000000") is None
    assert detect_loai_from_so(None) is None
    assert detect_loai_from_so("") is None


def test_pr_po_do_unauthorized():
    res = client.get("/api/v1/pr-po-do")
    assert res.status_code in (401, 403)


def test_pr_po_do_list(admin_token):
    res = client.get(
        "/api/v1/pr-po-do?page=1&page_size=20",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "stats" in data
    assert data["total"] > 0
    assert "total_bu" in data["stats"]
    assert "total_done" in data["stats"]


def test_pr_po_do_crud_flow(admin_token):
    # 1. Create
    create_payload = {
        "so": "1199999999",
        "noidung": "TEST AUTOMATION PR CREATION",
        "trangthai": "BU",
        "ghichu": "Ghi chú test"
    }
    create_res = client.post(
        "/api/v1/pr-po-do",
        json=create_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    created_item = create_res.json()
    item_id = created_item["id"]
    assert created_item["so"] == "1199999999"
    assert created_item["loai"] == "PR"
    assert created_item["trangthai"] == "BU"

    # 2. Patch / Update inline
    patch_payload = {
        "trangthai": "FC",
        "ghichu": "Đã chuyển kế toán duyệt"
    }
    patch_res = client.patch(
        f"/api/v1/pr-po-do/{item_id}",
        json=patch_payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert patch_res.status_code == 200
    updated_item = patch_res.json()
    assert updated_item["trangthai"] == "FC"
    assert updated_item["ghichu"] == "Đã chuyển kế toán duyệt"

    # 3. Delete
    delete_res = client.delete(
        f"/api/v1/pr-po-do/{item_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert delete_res.status_code == 200

    # 4. Check in /deleted list
    deleted_res = client.get(
        f"/api/v1/pr-po-do/deleted?search=1199999999",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert deleted_res.status_code == 200
    deleted_items = deleted_res.json()
    assert any(d["id"] == item_id for d in deleted_items)

    # 5. Restore
    restore_res = client.post(
        f"/api/v1/pr-po-do/{item_id}/restore",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert restore_res.status_code == 200
    restored_item = restore_res.json()
    assert restored_item["id"] == item_id

    # 6. Clean up by deleting again
    client.delete(
        f"/api/v1/pr-po-do/{item_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )


def test_pr_po_do_export_excel(admin_token):
    res = client.get(
        "/api/v1/pr-po-do/export?loai=PR",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment;" in res.headers["content-disposition"]
    assert len(res.content) > 1000
