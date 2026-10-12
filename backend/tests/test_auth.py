import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["database"]["server"] == "172.16.20.103"
    assert data["database"]["connected"] is True


def test_login_invalid_credentials():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "non_existent_user_xyz", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_login_admin_fallback():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["is_super_admin"] is True
    assert data["user"]["permissions"]["view_sys"] is True

    # Test protected /me endpoint
    token = data["access_token"]
    me_resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "admin"
    assert me_data["full_name"] == "Administrator"


def test_me_unauthorized():
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_change_password_unauthorized():
    response = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "oldpassword",
            "new_password": "newpassword123",
            "confirm_password": "newpassword123"
        }
    )
    assert response.status_code == 401


def test_change_password_admin_forbidden():
    # Login as built-in admin
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    # Attempt to change password for admin
    response = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "admin9528077",
            "new_password": "newpassword123",
            "confirm_password": "newpassword123"
        }
    )
    assert response.status_code == 400
    assert "admin" in response.json()["detail"].lower()


def test_change_password_validation_errors():
    # Login as admin to get a valid token
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    token = login_resp.json()["access_token"]

    # Short password (< 4 chars)
    resp = client.post(
        "/api/v1/auth/change-password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "admin9528077",
            "new_password": "12",
            "confirm_password": "12"
        }
    )
    assert resp.status_code == 422  # Pydantic validation error for min_length=4
