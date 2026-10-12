import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.system_incident import SystemIncident

client = TestClient(app)


@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "admin", "roles": ["admin"]})
    return {"Authorization": f"Bearer {token}"}


def test_system_incident_lifecycle(auth_headers):
    # 1. Tạo mới sự cố hệ thống
    payload = {
        "tieude": "Sự cố mạng diện rộng Datacenter Test",
        "he_thong": "Mạng / VPN Datacenter",
        "muc_do": "Khẩn cấp",
        "thoi_gian_bat_dau": "2026-09-16T08:30:00",
        "noi_dung": "Gián đoạn toàn bộ đường truyền VPN từ DC đến chi nhánh",
        "nguoi_xu_ly": "Team Net",
        "note": "Đang phối hợp với ISP VNPT kiểm tra core switch"
    }
    create_res = client.post("/api/v1/incidents/system-outages", json=payload, headers=auth_headers)
    assert create_res.status_code == 201
    created_data = create_res.json()
    incident_id = created_data["id"]
    assert created_data["tieude"] == payload["tieude"]
    assert created_data["trang_thai"] == "DANG_XU_LY"
    assert created_data["muc_do"] == "Khẩn cấp"

    try:
        # 2. Lấy danh sách & kiểm tra thống kê
        list_res = client.get("/api/v1/incidents/system-outages", headers=auth_headers)
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 1
        assert list_data["stats"]["total"] >= 1
        assert list_data["stats"]["dang_xu_ly"] >= 1

        # 3. Lấy chi tiết sự cố
        detail_res = client.get(f"/api/v1/incidents/system-outages/{incident_id}", headers=auth_headers)
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == incident_id

        # 4. Thêm tiến độ xử lý
        prog_payload = {
            "note": "ISP đã khởi động lại switch quang, kết nối bắt đầu hồi phục 80%",
            "nguyen_nhan": "Hỏng card quang module SFP tại ODF",
            "bien_phap_khac_phuc": "Thay thế module dự phòng và đo kiểm suy hao"
        }
        prog_res = client.post(
            f"/api/v1/incidents/system-outages/{incident_id}/progress",
            json=prog_payload,
            headers=auth_headers
        )
        assert prog_res.status_code == 200
        updated_data = prog_res.json()
        assert "switch quang" in updated_data["ghi_chu_tien_do"]
        assert updated_data["nguyen_nhan"] == prog_payload["nguyen_nhan"]

        # 5. Xác nhận hoàn tất khắc phục
        close_payload = {
            "note": "Hệ thống đã hoạt động bình thường 100% trên toàn quốc.",
            "status": "DA_KHAC_PHUC",
            "thoi_gian_ket_thuc": "2026-09-16T10:00:00"
        }
        close_res = client.post(
            f"/api/v1/incidents/system-outages/{incident_id}/progress",
            json=close_payload,
            headers=auth_headers
        )
        assert close_res.status_code == 200
        closed_data = close_res.json()
        assert closed_data["trang_thai"] == "DA_KHAC_PHUC"
        assert closed_data["thoi_gian_gian_doan_phut"] == 90  # 8:30 -> 10:00 = 90 phút
        assert "1 giờ 30 phút" in closed_data["thoi_gian_gian_doan_text"]

        # 6. Xuất báo cáo Excel
        excel_res = client.get("/api/v1/incidents/system-outages/export/excel", headers=auth_headers)
        assert excel_res.status_code == 200
        assert len(excel_res.content) > 1000

    finally:
        # Dọn dẹp bản ghi test
        db = SessionLocal()
        try:
            item = db.get(SystemIncident, incident_id)
            if item:
                db.delete(item)
                db.commit()
        finally:
            db.close()
