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


def test_pim_unauthorized():
    res = client.get("/api/v1/pim/pending")
    assert res.status_code in (401, 403)


def test_pim_pending_list(admin_token):
    res = client.get(
        "/api/v1/pim/pending",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_pim_completed_list(admin_token):
    res = client.get(
        "/api/v1/pim/completed",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_pim_export_excel(admin_token):
    res = client.get(
        "/api/v1/pim/export/excel?tab=all",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment;" in res.headers["content-disposition"]
    assert len(res.content) > 1000
