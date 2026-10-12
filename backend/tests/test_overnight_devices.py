import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.services.overnight_devices_service import overnight_devices_service
from app.services.job_scheduler_service import job_scheduler_service

client = TestClient(app)


def get_admin_token() -> str:
    resp = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077+"}
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_overnight_devices_unauthorized():
    res = client.get("/api/v1/overnight-devices")
    assert res.status_code == 401


def test_job_schedule_registration():
    jobs = job_scheduler_service.get_all_jobs()
    matched = [j for j in jobs if j.job_id == "job_check_overnight_devices"]
    assert len(matched) > 0
    job = matched[0]
    assert job.schedule.time == "04:00"
    assert job.schedule.cron_expression == "0 4 * * *"


def test_overnight_formatting_spec():
    sample_rest = {
        "id": 594,
        "sap": "4388",
        "rk7": "34",
        "res": "Ashima Nguyễn Đình Chiểu",
        "ip": "10.8.45.1",
        "email": "hcm.asm.sh.ndc@ggg.com.vn"
    }
    with patch("app.services.overnight_devices_service.ping_ip") as mock_ping:
        def side_effect(ip, timeout_ms=700):
            if ip in ["10.8.45.1", "10.8.45.11", "10.8.45.12"]:
                return True
            return False
        mock_ping.side_effect = side_effect
        
        result = overnight_devices_service.scan_restaurant(sample_rest)
        assert result is not None
        assert result["sap_code"] == "4388"
        assert "Thu Ngân 11" in result["overnight_devices"]
        assert "Thu Ngân 12" in result["overnight_devices"]
        assert result["col_restaurant"] == "4388 Ashima Nguyễn Đình Chiểu (RK7: 34) 10.8.45.x"
        assert result["device_items"] == ["Thu Ngân 11", "Thu Ngân 12"]
        assert "hcm.asm.sh.ndc@ggg.com.vn" in result["summary_line"]

