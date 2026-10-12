import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app

client = TestClient(app)


def get_admin_token() -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_mongodb_unauthorized():
    res = client.get("/api/v1/mongodb/params?host=10.9.91.12")
    assert res.status_code == 401


def test_mongodb_param_validation_invalid_type():
    token = get_admin_token()
    res = client.post(
        "/api/v1/mongodb/params",
        json={
            "host": "127.0.0.1",
            "port": 27017,
            "paramCode": "TEST_INVALID",
            "paramType": "INVALID_TYPE",
            "status": 1
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code in [400, 422]


@patch("app.services.mongodb_service._check_tcp_port")
@patch("app.services.mongodb_service._verify_mongo_ping")
def test_mongodb_check_connection(mock_ping, mock_tcp):
    def side_effect(host, port=27017, timeout=1.5):
        if host.endswith(".12"):
            return True
        return False
    mock_tcp.side_effect = side_effect
    mock_ping.side_effect = side_effect

    token = get_admin_token()
    res = client.post(
        "/api/v1/mongodb/check-connection",
        json={"ip": "10.9.91.1"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["subnet"] == "10.9.91."
    assert len(data["candidates"]) == 3
    assert any(c["ip"] == "10.9.91.12" for c in data["candidates"])
