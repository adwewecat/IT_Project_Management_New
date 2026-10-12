import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_super_admin_token():
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_system_config_unauthorized():
    response = client.get("/api/v1/system/db-config")
    assert response.status_code == 401


def test_system_config_get_as_super_admin():
    token = get_super_admin_token()
    response = client.get(
        "/api/v1/system/db-config",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "server" in data
    assert "port" in data
    assert "db_name" in data
    assert "trusted_connection" in data
    assert data["port"] == 1433
    assert data["db_name"] == "ITDEPT"


def test_system_test_db_connection_success():
    token = get_super_admin_token()
    response = client.post(
        "/api/v1/system/test-db-connection",
        json={
            "server": "172.16.20.103",
            "port": 1433,
            "db_name": "ITDEPT",
            "trusted_connection": True
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "thành công" in data["message"].lower()


def test_system_test_db_connection_invalid_port():
    token = get_super_admin_token()
    response = client.post(
        "/api/v1/system/test-db-connection",
        json={
            "server": "172.16.20.103",
            "port": 9999,  # Non-existent port
            "db_name": "ITDEPT",
            "trusted_connection": True
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["error_detail"] is not None


def test_system_config_forbidden_for_regular_user():
    from app.core.security import create_access_token
    # Generate token for a regular company user (e.g. dung.nguyenanh)
    token = create_access_token({"sub": "dung.nguyenanh"})
    response = client.get(
        "/api/v1/system/db-config",
        headers={"Authorization": f"Bearer {token}"}
    )
    # Must be forbidden 403
    assert response.status_code == 403
    detail = response.json()["detail"]
    assert "Bạn không có quyền" in detail or "Supper Admin" in detail
