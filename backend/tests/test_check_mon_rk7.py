import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "admin", "roles": ["admin"]})
    return {"Authorization": f"Bearer {token}"}


def test_check_mon_unauthorized():
    res = client.get("/api/v1/check-mon-rk7/brands")
    assert res.status_code == 401


def test_get_brands(auth_headers):
    res = client.get("/api/v1/check-mon-rk7/brands", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "guid" in first
    assert "name" in first
    assert "display_name" in first
    assert "total_items" in first


def test_check_sap_exists(auth_headers):
    # Test with valid and invalid SAP codes
    test_codes = ["60001467", "60002549", "NON_EXIST_SAP_999999"]
    payload = {"sap_codes": test_codes}
    res = client.post("/api/v1/check-mon-rk7/check-sap", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_input"] == 3
    assert data["found_count"] >= 1
    assert "NON_EXIST_SAP_999999" in data["missing_codes"]
    assert any(item["sap_code"] in ["60001467", "60002549"] for item in data["items"])


def test_check_selector(auth_headers):
    # Test with known Gogi dish SAP code: 60000151
    test_codes = ["60000151", "NON_EXIST_CODE_888888"]
    payload = {"sap_codes": test_codes}
    res = client.post("/api/v1/check-mon-rk7/check-selector", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_input"] == 2
    assert "NON_EXIST_CODE_888888" in data["missing_codes"]
    if data["found_count"] > 0:
        item = data["items"][0]
        assert "brand" in item
        assert "nhom_pos" in item
        assert "gia" in item


def test_get_brand_menu(auth_headers):
    # Get brands first
    b_res = client.get("/api/v1/check-mon-rk7/brands", headers=auth_headers)
    brands = b_res.json()
    assert len(brands) > 0
    target_guid = brands[0]["guid"]

    res = client.get(f"/api/v1/check-mon-rk7/brand-menu/{target_guid}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "brand_name" in data
    assert "total_items" in data
    assert "items" in data
    assert data["total_items"] > 0


def test_export_endpoints(auth_headers):
    # 1. Export SAP check
    res_sap = client.post(
        "/api/v1/check-mon-rk7/export-sap",
        json={"sap_codes": ["60001467", "NON_EXIST_SAP"]},
        headers=auth_headers
    )
    assert res_sap.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res_sap.headers["content-type"]

    # 2. Export selector check
    res_sel = client.post(
        "/api/v1/check-mon-rk7/export-selector",
        json={"sap_codes": ["60000151", "NON_EXIST_SAP"]},
        headers=auth_headers
    )
    assert res_sel.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res_sel.headers["content-type"]

    # 3. Export brand menu
    b_res = client.get("/api/v1/check-mon-rk7/brands", headers=auth_headers)
    brands = b_res.json()
    target_guid = brands[0]["guid"]
    res_menu = client.get(
        f"/api/v1/check-mon-rk7/brand-menu/{target_guid}/export",
        headers=auth_headers
    )
    assert res_menu.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res_menu.headers["content-type"]
