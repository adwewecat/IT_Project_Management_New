import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import require_super_admin, require_super_admin_or_dung

class MockSuperUser:
    id = "1"
    username = "admin"
    full_name = "Super Admin Test"
    email = "admin@test.com"
    quyen = 0
    phanquyen = "0"
    is_active = True
    is_super_admin = True

class MockRegularUser:
    id = "2"
    username = "user1"
    full_name = "Regular User"
    email = "user1@test.com"
    quyen = 2
    phanquyen = "2"
    is_active = True
    is_super_admin = False

@pytest.fixture
def client():
    app.dependency_overrides[require_super_admin] = lambda: MockSuperUser()
    app.dependency_overrides[require_super_admin_or_dung] = lambda: MockSuperUser()
    yield TestClient(app)
    app.dependency_overrides.clear()

def test_get_jobs(client):
    response = client.get("/api/v1/jobs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 7
    job_ids = [j["job_id"] for j in data]
    assert "job_sync_sales_daily_server" in job_ids
    assert "job_sync_pim_requests" in job_ids
    assert "job_email_sales_reconciliation" in job_ids
    assert "job_check_vpn_restaurants" in job_ids
    assert "job_check_internet_restaurants" in job_ids
    assert "job_check_ram_sql_mongo_limits" in job_ids
    assert "job_auto_sync_3cx_hotline_duty" in job_ids
    job_3cx = next(j for j in data if j["job_id"] == "job_auto_sync_3cx_hotline_duty")
    assert job_3cx["is_enabled"] is False
    assert "password" not in job_3cx
    assert "job_check_vpn_datacenter" not in job_ids
    assert "job_setup_restaurant_reminder" not in job_ids
    assert "job_memo_due_reminder" not in job_ids
    assert "job_hotline_shift_notification" not in job_ids
    assert "job_check_mon_rk7" not in job_ids
    assert "job_reconcile_sales_restaurants" not in job_ids
    assert "job_daily_news_gold_notification" not in job_ids

def test_get_dashboard_stats(client):
    response = client.get("/api/v1/jobs/dashboard")
    assert response.status_code == 200
    stats = response.json()
    assert stats["total_jobs"] >= 7
    assert stats["active_jobs"] >= 0
    assert "upcoming_jobs" in stats
    assert "categories_count" in stats

def test_update_schedule_and_toggle(client):
    # Toggle off
    res = client.put("/api/v1/jobs/job_sync_sales_daily_server/toggle", json={"is_enabled": False})
    assert res.status_code == 200
    assert res.json()["is_enabled"] is False

    # Toggle on
    res = client.put("/api/v1/jobs/job_sync_sales_daily_server/toggle", json={"is_enabled": True})
    assert res.status_code == 200
    assert res.json()["is_enabled"] is True

    # Update schedule to 05:45
    sched_payload = {
        "schedule_type": "daily",
        "time": "05:45",
        "days_of_week": [1, 2, 3, 4, 5, 6, 7]
    }
    res = client.put("/api/v1/jobs/job_sync_sales_daily_server/schedule", json=sched_payload)
    assert res.status_code == 200
    job = res.json()
    assert job["schedule"]["time"] == "05:45"
    assert "05:45" in job["schedule"]["human_readable"]

def test_run_job_dry_run(client):
    res = client.post("/api/v1/jobs/job_sync_pim_requests/run")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "log" in data
    assert data["log"]["status"] == "success"
    assert (
        "Đồng bộ PIM hoàn tất" in data["log"]["message"]
        or "[CHẾ ĐỘ XEM TRƯỚC / DRY-RUN]" in data["log"]["message"]
    )

    # Check logs
    res_logs = client.get("/api/v1/jobs/job_sync_pim_requests/logs")
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) >= 1

def test_update_email_recipients(client):
    res = client.put(
        "/api/v1/jobs/job_email_sales_reconciliation/email",
        json={"email_recipients": "test1@ggg.com.vn, test2@ggg.com.vn"}
    )
    assert res.status_code == 200
    job = res.json()
    assert job["email_recipients"] == "test1@ggg.com.vn, test2@ggg.com.vn"
    assert job["has_email_notification"] is True

def test_non_super_admin_forbidden():
    from app.api.deps import get_current_user
    old_overrides = dict(app.dependency_overrides)
    try:
        app.dependency_overrides.clear()
        app.dependency_overrides[get_current_user] = lambda: MockRegularUser()
        regular_client = TestClient(app)
        res = regular_client.get("/api/v1/jobs")
        assert res.status_code == 403
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(old_overrides)

def test_run_vpn_and_internet_jobs(client, monkeypatch):
    from app.services.network_monitor_service import network_monitor_service

    # Mock ping to return simulated result quickly without network delays
    monkeypatch.setattr(
        network_monitor_service,
        "check_vpn_restaurants",
        lambda max_workers=50: {
            "check_type": "VPN",
            "target_time": "2026-09-16 10:00:00",
            "total": 10,
            "ok_count": 8,
            "down_count": 2,
            "down_items": [{"id": 1, "sap": "SAP01", "res": "Test NH", "ip": "10.9.1.1", "status": "Rớt VPN", "is_up": False}],
            "ok_items": [],
            "all_items": []
        }
    )
    email_called = []
    monkeypatch.setattr(
        network_monitor_service,
        "send_vpn_alert_email",
        lambda results, recipients: email_called.append((results, recipients)) or {"status": "success"}
    )

    res = client.post("/api/v1/jobs/job_check_vpn_restaurants/run")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["log"]["status"] == "success"
    assert "Kiểm tra kết nối VPN Nhà Hàng hoàn tất" in data["log"]["message"]
    assert len(email_called) == 1

def test_run_vpn_job_failure_does_not_send_email(client, monkeypatch):
    from app.services.network_monitor_service import network_monitor_service

    # Simulate network or database crash during check
    def _crash_check(max_workers=50):
        raise ConnectionResetError("Không thể kết nối SQL Database Nhà Hàng")

    monkeypatch.setattr(network_monitor_service, "check_vpn_restaurants", _crash_check)
    email_called = []
    monkeypatch.setattr(
        network_monitor_service,
        "send_vpn_alert_email",
        lambda results, recipients: email_called.append((results, recipients))
    )

    res = client.post("/api/v1/jobs/job_check_vpn_restaurants/run")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["log"]["status"] == "failed"
    assert "Không thể kết nối SQL Database Nhà Hàng" in data["log"]["message"]
    # Verify email was NOT sent
    assert len(email_called) == 0

def test_dung_utility_access_control():
    from app.api.deps import require_super_admin_or_dung

    class MockDungUser:
        id = "99"
        username = "dung.nguyenanh"
        full_name = "Nguyen Anh Dung"
        email = "dung.nguyenanh@ggg.com.vn"
        quyen = 1
        phanquyen = "1"
        is_active = True
        is_super_admin = False

    # 1. Dung can see dung_utility job
    app.dependency_overrides[require_super_admin_or_dung] = lambda: MockDungUser()
    dung_client = TestClient(app)
    res = dung_client.get("/api/v1/jobs")
    assert res.status_code == 200
    cat_ids = [j["category"] for j in res.json()]
    assert "dung_utility" in cat_ids

    # 2. Super Admin can see dung_utility job
    app.dependency_overrides[require_super_admin_or_dung] = lambda: MockSuperUser()
    admin_client = TestClient(app)
    res2 = admin_client.get("/api/v1/jobs")
    assert res2.status_code == 200
    cat_ids2 = [j["category"] for j in res2.json()]
    assert "dung_utility" in cat_ids2

    app.dependency_overrides.clear()

def test_ram_limit_audit_endpoints(client, monkeypatch):
    from app.services.ram_limit_audit_service import ram_limit_audit_service

    monkeypatch.setattr(
        ram_limit_audit_service,
        "get_scan_dates",
        lambda: ["2026-09-19"]
    )
    monkeypatch.setattr(
        ram_limit_audit_service,
        "get_audit_logs",
        lambda scan_date=None: [{
            "scan_date": "2026-09-19",
            "restaurant_id": 1,
            "sap_code": "SAP01",
            "restaurant_name": "Test Res",
            "subnet": "10.8.46",
            "ip_gateway": "10.8.46.1",
            "sql_ip": "10.8.46.41",
            "sql_connected": True,
            "sql_max_memory_mb": 2048,
            "sql_is_limited_2gb": True,
            "sql_is_limited_4gb": True,
            "sql_status": "Port 1433 Mở | Max Memory: 2048 MB",
            "mongo_ip": "10.8.46.12",
            "mongo_connected": True,
            "mongo_cache_size_gb": 6.0,
            "mongo_is_limited_6gb": True,
            "mongo_status": "Port 27017 Mở trên 10.8.46.12 | WiredTiger: 6.00 GB",
            "summary_note": "SQL <= 2GB: Đạt | Mongo 6GB: Đạt"
        }]
    )

    # Test dates endpoint
    res_dates = client.get("/api/v1/jobs/ram-limit-audit/dates")
    assert res_dates.status_code == 200
    assert res_dates.json() == ["2026-09-19"]

    # Test audit list endpoint
    res_audit = client.get("/api/v1/jobs/ram-limit-audit?scan_date=2026-09-19")
    assert res_audit.status_code == 200
    data = res_audit.json()
    assert data["total"] == 1
    assert data["items"][0]["sql_is_limited_2gb"] is True
    assert data["items"][0]["mongo_is_limited_6gb"] is True




