import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.lich_truc_hotline_service import extract_image_info
from app.api.v1.lich_truc_hotline import check_hotline_access
from app.schemas.auth import UserInfo

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def test_check_hotline_access_roles():
    def make_user(roles, phanquyen, is_super=False):
        return UserInfo(
            id=1,
            username="test",
            roles=roles,
            phanquyen=phanquyen,
            is_super_admin=is_super,
            permissions={}
        )

    # 1. Admin / Super Admin: cả hai
    assert check_hotline_access(make_user(["admin"], "1")) == (True, True)
    assert check_hotline_access(make_user([], "0", is_super=True)) == (True, True)

    # 2. Inventory: cả hai
    assert check_hotline_access(make_user(["inventory"], "4")) == (True, True)
    assert check_hotline_access(make_user(["inv"], "4")) == (True, True)

    # 3. Helpdesk: CHỈ Helpdesk
    assert check_hotline_access(make_user(["helpdesk"], "3")) == (True, False)

    # 4. App: CHỈ App
    assert check_hotline_access(make_user(["app"], "2")) == (False, True)

    # 5. Khách / Không có quyền: không xem được nhóm nào
    assert check_hotline_access(make_user(["guest"], "99")) == (False, False)


def test_extract_image_info():
    # Base64 data url
    img_data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    url, is_img = extract_image_info(img_data)
    assert is_img is True
    assert url == img_data

    # Img tag
    tag_html = f'<p><img src="{img_data}" /></p>'
    url2, is_img2 = extract_image_info(tag_html)
    assert is_img2 is True
    assert url2 == img_data

    # Table HTML
    table_html = '<table><tr><td>Ca sáng</td></tr></table>'
    t_url, t_is_img = extract_image_info(table_html)
    assert t_is_img is False
    assert t_url == table_html


def test_hotline_unauthorized():
    res = client.get("/api/v1/hotline/schedule")
    assert res.status_code in (401, 403)


def test_hotline_schedule(admin_token):
    res = client.get(
        "/api/v1/hotline/schedule?month=1",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["thang"] == "1"
    assert "available_months" in data


def test_hotline_available_months(admin_token):
    res = client.get(
        "/api/v1/hotline/available-months",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_hotline_upload_admin(admin_token):
    test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    payload = {
        "thang": "12",
        "team": "APP",
        "image_data": test_image
    }
    res = client.post(
        "/api/v1/hotline/upload",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["thang"] == "12"
    assert data["app"] is not None
    assert data["app"]["is_image"] is True
