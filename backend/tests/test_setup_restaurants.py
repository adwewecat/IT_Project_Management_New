import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.setup_restaurant import ListSetupNhNew, ChecklistSetupNhNewDetail

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_setup_restaurant_list(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/setup-restaurants", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert "total_in_progress" in data
    assert "total_completed" in data


def test_setup_restaurant_crud_and_completion_rule(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    ts = int(time.time())
    res_name = f"TEST_NH_SETUP_{ts}"

    # 1. Create new setup restaurant
    create_payload = {
        "TEN_NH": res_name,
        "NGAY_DUKIEN_KHAITRUONG": "2026-11-01T00:00:00",
        "IT_PHUTRACH": "Hùng",
        "AM_PHUTRACH": "Nguyễn Văn AM",
        "NOTE_THEM": "Test unit note"
    }
    create_res = client.post("/api/v1/setup-restaurants", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    res_data = create_res.json()
    res_id = res_data["id"]
    assert res_data["TEN_NH"] == res_name
    assert res_data["TRANGTHAI"] == "Mới - Đang Setup"
    assert res_data["total_checklist"] == 83
    assert res_data["completed_checklist"] == 0
    assert res_data["can_complete"] is False

    db = SessionLocal()
    try:
        # 2. Get checklist
        chk_res = client.get(f"/api/v1/setup-restaurants/{res_id}/checklist", headers=headers)
        assert chk_res.status_code == 200
        chk_data = chk_res.json()
        assert chk_data["total_items"] == 83
        assert chk_data["completed_items"] == 0
        assert chk_data["is_all_completed"] is False
        assert len(chk_data["groups"]) > 0
        assert "restaurant" in chk_data and chk_data["restaurant"] is not None
        assert chk_data["groups"][0]["nhom"] is not None

        first_item = chk_data["groups"][0]["items"][0]
        assert "ten_checklist" in first_item
        first_item_id = first_item["id"]

        # 3. Try to update status to "Đã Hoàn Thành" when checklist is NOT completed
        # USER RULE: NH mới cần phải hoàn thành checklist hết mới được xem là hoàn thành!
        invalid_update = client.put(
            f"/api/v1/setup-restaurants/{res_id}",
            json={"TRANGTHAI": "Đã Hoàn Thành"},
            headers=headers
        )
        assert invalid_update.status_code == 400
        assert "hoàn thành toàn bộ checklist" in invalid_update.json()["detail"].lower()

        # 4. Toggle 1 item
        toggle1 = client.put(
            f"/api/v1/setup-restaurants/checklist/{first_item_id}",
            json={"is_completed": True, "GHICHU": "Test done 1"},
            headers=headers
        )
        assert toggle1.status_code == 200
        assert toggle1.json()["item"]["is_completed"] is True
        assert toggle1.json()["restaurant_status"] == "Mới - Đang Setup"

        # 5. Complete all items in DB to test auto completion
        details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).all()
        for d in details:
            d.USER_HOANTHANH = "test.admin"
            d.ACTIVE = False
        db.commit()

        # Toggle the first item again to trigger re-evaluation
        toggle_all = client.put(
            f"/api/v1/setup-restaurants/checklist/{first_item_id}",
            json={"is_completed": True},
            headers=headers
        )
        assert toggle_all.status_code == 200
        assert toggle_all.json()["restaurant_status"] == "Đã Hoàn Thành"

        # 6. Uncheck 1 item -> restaurant automatically becomes "Mới - Đang Setup"
        uncheck = client.put(
            f"/api/v1/setup-restaurants/checklist/{first_item_id}",
            json={"is_completed": False},
            headers=headers
        )
        assert uncheck.status_code == 200
        assert uncheck.json()["restaurant_status"] == "Mới - Đang Setup"

        # 7. Export checklist
        exp_res = client.get(f"/api/v1/setup-restaurants/{res_id}/checklist/export", headers=headers)
        assert exp_res.status_code == 200
        assert len(exp_res.content) > 500

    finally:
        # Cleanup
        db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).delete()
        r = db.get(ListSetupNhNew, res_id)
        if r:
            db.delete(r)
        db.commit()
        db.close()


def test_checklist_excel_template_and_import(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Download template
    tmpl_res = client.get("/api/v1/setup-restaurants/checklist/template-excel", headers=headers)
    assert tmpl_res.status_code == 200
    assert len(tmpl_res.content) > 500

    # 2. Create test restaurant
    ts = int(time.time())
    res_name = f"TEST_IMPORT_EXCEL_{ts}"
    create_res = client.post(
        "/api/v1/setup-restaurants",
        json={"TEN_NH": res_name},
        headers=headers
    )
    assert create_res.status_code == 201
    res_id = create_res.json()["id"]

    db = SessionLocal()
    try:
        # 3. Create sample Excel file in memory
        import io
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Nhóm Hạng Mục", "Nội Dung Công Việc", "Ghi Chú"])
        ws.append(["MẠNG NỘI BỘ", "Cấu hình Router Mikrotik", "VLAN 10, 20"])
        ws.append(["MẠNG NỘI BỘ", "Lắp đặt Switch PoE", "Port 1-8"])
        ws.append(["ÂM THANH", "Lắp đặt loa phân vùng", "4 loa"])
        out = io.BytesIO()
        wb.save(out)
        out.seek(0)

        # 4. Import Excel
        files = {
            "file": ("test_import.xlsx", out.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }
        data = {"save_to_master": "false"}
        import_res = client.post(
            f"/api/v1/setup-restaurants/{res_id}/checklist/import-excel",
            files=files,
            data=data,
            headers=headers
        )
        assert import_res.status_code == 200
        import_data = import_res.json()
        assert import_data["success"] is True
        assert import_data["imported_count"] == 3
        assert import_data["groups_count"] == 2

        # 5. Verify checklist has 83 + 3 = 86 items
        chk_res = client.get(f"/api/v1/setup-restaurants/{res_id}/checklist", headers=headers)
        assert chk_res.status_code == 200
        assert chk_res.json()["total_items"] == 86

    finally:
        db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).delete()
        r = db.get(ListSetupNhNew, res_id)
        if r:
            db.delete(r)
        db.commit()
        db.close()


def test_setup_restaurant_bulk_toggle(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    ts = int(time.time())
    res_name = f"TEST_BULK_TOGGLE_{ts}"

    # 1. Create restaurant
    create_res = client.post(
        "/api/v1/setup-restaurants",
        json={"TEN_NH": res_name},
        headers=headers
    )
    assert create_res.status_code == 201
    res_id = create_res.json()["id"]

    db = SessionLocal()
    try:
        # 2. Bulk check all in group 'RK7-MANAGER'
        bulk_grp_res = client.put(
            f"/api/v1/setup-restaurants/{res_id}/checklist/bulk-toggle",
            json={"is_completed": True, "group_name": "RK7-MANAGER"},
            headers=headers
        )
        assert bulk_grp_res.status_code == 200
        assert bulk_grp_res.json()["success"] is True
        assert bulk_grp_res.json()["updated_count"] == 11
        assert bulk_grp_res.json()["restaurant_status"] == "Mới - Đang Setup"

        # Verify RK7-MANAGER items are now completed
        chk_res = client.get(f"/api/v1/setup-restaurants/{res_id}/checklist", headers=headers)
        assert chk_res.status_code == 200
        chk_data = chk_res.json()
        assert chk_data["completed_items"] == 11

        # 3. Bulk uncheck group 'RK7-MANAGER'
        uncheck_grp_res = client.put(
            f"/api/v1/setup-restaurants/{res_id}/checklist/bulk-toggle",
            json={"is_completed": False, "group_name": "RK7-MANAGER"},
            headers=headers
        )
        assert uncheck_grp_res.status_code == 200
        assert uncheck_grp_res.json()["updated_count"] == 11
        chk_res2 = client.get(f"/api/v1/setup-restaurants/{res_id}/checklist", headers=headers)
        assert chk_res2.json()["completed_items"] == 0

        # 4. Bulk check ALL 83 items
        bulk_all_res = client.put(
            f"/api/v1/setup-restaurants/{res_id}/checklist/bulk-toggle",
            json={"is_completed": True, "group_name": "ALL"},
            headers=headers
        )
        assert bulk_all_res.status_code == 200
        assert bulk_all_res.json()["updated_count"] == 83
        assert bulk_all_res.json()["restaurant_status"] == "Đã Hoàn Thành"

        # 5. Bulk uncheck ALL 83 items
        uncheck_all_res = client.put(
            f"/api/v1/setup-restaurants/{res_id}/checklist/bulk-toggle",
            json={"is_completed": False, "group_name": "ALL"},
            headers=headers
        )
        assert uncheck_all_res.status_code == 200
        assert uncheck_all_res.json()["updated_count"] == 83
        assert uncheck_all_res.json()["restaurant_status"] == "Mới - Đang Setup"

    finally:
        db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).delete()
        r = db.get(ListSetupNhNew, res_id)
        if r:
            db.delete(r)
        db.commit()
        db.close()


def test_setup_restaurant_brand_selection(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    ts = int(time.time())
    res_name = f"TEST_TCH_{ts}"

    # 1. Create with brand = Thecoffeehouse
    create_payload = {
        "ten_nh": res_name,
        "brand": "Thecoffeehouse",
        "it_phutrach": "Hùng"
    }
    create_res = client.post("/api/v1/setup-restaurants", json=create_payload, headers=headers)
    assert create_res.status_code == 201
    res_data = create_res.json()
    res_id = res_data["id"]
    assert res_data["ten_nh"] == res_name
    assert res_data["brand"] == "Thecoffeehouse"
    # TCH should have 0 checklist items created
    assert res_data["total_checklist"] == 0
    assert res_data["completed_checklist"] == 0

    db = SessionLocal()
    try:
        # Check database records
        details = db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).all()
        assert len(details) == 0

        # Update brand to GGG
        update_res = client.put(f"/api/v1/setup-restaurants/{res_id}", json={"brand": "GGG"}, headers=headers)
        assert update_res.status_code == 200
        assert update_res.json()["brand"] == "GGG"

    finally:
        db.query(ChecklistSetupNhNewDetail).filter(ChecklistSetupNhNewDetail.ID_NH_NEW == res_id).delete()
        r = db.get(ListSetupNhNew, res_id)
        if r:
            db.delete(r)
        db.commit()
        db.close()

