import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def get_admin_token() -> str:
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_get_users_unauthorized():
    response = client.get("/api/v1/users")
    assert response.status_code == 401


def test_get_users_as_admin():
    token = get_admin_token()
    response = client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] > 0
    # Check item properties
    first_user = data["items"][0]
    assert "username" in first_user
    assert "phanquyen" in first_user
    assert "role_name" in first_user


def test_get_roles_as_admin():
    token = get_admin_token()
    response = client.get(
        "/api/v1/roles",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert any(r["tenquyen"] == "Administrator" for r in data)


def test_get_role_permissions_as_admin():
    token = get_admin_token()
    # Test role ID 4 (HELPDESK_DEFAULT)
    response = client.get(
        "/api/v1/roles/4/permissions",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "role" in data
    assert "permissions" in data
    assert len(data["permissions"]) >= 18
    # Ensure permission item has module_group and action_label
    first_perm = data["permissions"][0]
    assert "chucnang" in first_perm
    assert "active" in first_perm
    assert "module_group" in first_perm


def test_search_users():
    token = get_admin_token()
    response = client.get(
        "/api/v1/users?search=dung",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) >= 1
    assert any("dung" in u["username"].lower() or "dung" in (u["full_name"] or "").lower() for u in data["items"])
