import io
import time
import pytest
import openpyxl
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.services.project_service import get_project_session_maker
from app.models.project import Project, ProjectMember, MemberTask, ProjectActivityLog

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin9528077"}
    )
    assert login_res.status_code == 200
    return login_res.json()["access_token"]


def test_project_list(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/projects", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)


def test_project_sample_template(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/projects/sample-template", headers=headers)
    assert res.status_code == 200
    assert len(res.content) > 500


def test_project_export(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    res = client.get("/api/v1/projects/export", headers=headers)
    assert res.status_code == 200
    assert len(res.content) > 500


def test_project_crud_and_toggle_flow(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    ts = int(time.time())
    proj_name = f"TEST_PROJECT_{ts}"

    # 1. Create project without code (auto-generate code)
    create_res = client.post(
        "/api/v1/projects",
        json={"ProjectName": proj_name, "Deadline": "2026-12-31"},
        headers=headers
    )
    assert create_res.status_code == 201
    proj_data = create_res.json()
    proj_id = proj_data["ProjectID"]
    assert proj_data["ProjectName"] == proj_name
    assert proj_data["ProjectCode"] is not None
    assert proj_data["Status"] == "in-progress"

    session_maker = get_project_session_maker()
    db = session_maker()

    try:
        # 2. Add member
        mem_name = f"TestMember_{ts}"
        mem_res = client.post(
            f"/api/v1/projects/{proj_id}/members",
            json={"MemberName": mem_name},
            headers=headers
        )
        assert mem_res.status_code == 201
        mem_data = mem_res.json()
        mem_id = mem_data["MemberID"]
        assert mem_data["MemberCode"] is not None

        # 3. Add 2 tasks
        t1_res = client.post(
            f"/api/v1/projects/members/{mem_id}/tasks",
            json={"TaskName": "Task 1 Setup"},
            headers=headers
        )
        assert t1_res.status_code == 201
        t1_id = t1_res.json()["TaskID"]

        t2_res = client.post(
            f"/api/v1/projects/members/{mem_id}/tasks",
            json={"TaskName": "Task 2 Test"},
            headers=headers
        )
        assert t2_res.status_code == 201
        t2_id = t2_res.json()["TaskID"]

        # 4. Toggle Task 1 -> Done
        toggle1 = client.post(
            f"/api/v1/projects/tasks/{t1_id}/toggle",
            json={"done": True},
            headers=headers
        )
        assert toggle1.status_code == 200
        t1_out = toggle1.json()
        assert t1_out["task"]["Done"] is True
        assert t1_out["member_completed_at"] is None
        assert t1_out["project_status"] == "in-progress"

        # 5. Toggle Task 2 -> Done => All tasks done -> Member and Project become completed!
        toggle2 = client.post(
            f"/api/v1/projects/tasks/{t2_id}/toggle",
            json={"done": True},
            headers=headers
        )
        assert toggle2.status_code == 200
        t2_out = toggle2.json()
        assert t2_out["task"]["Done"] is True
        assert t2_out["member_completed_at"] is not None
        assert t2_out["project_status"] == "completed"

        # 6. Toggle Task 1 back to Undone => Project becomes in-progress again!
        toggle3 = client.post(
            f"/api/v1/projects/tasks/{t1_id}/toggle",
            json={"done": False},
            headers=headers
        )
        assert toggle3.status_code == 200
        assert toggle3.json()["task"]["Done"] is False
        assert toggle3.json()["project_status"] == "in-progress"

        # 6.5. Test review task: OK, Fail, Reset
        rev_ok = client.put(
            f"/api/v1/projects/tasks/{t1_id}/review",
            json={"review_status": "ok"},
            headers=headers
        )
        assert rev_ok.status_code == 200
        assert rev_ok.json()["ReviewStatus"] == "ok"
        assert rev_ok.json()["ReviewedBy"] is not None

        rev_fail = client.put(
            f"/api/v1/projects/tasks/{t1_id}/review",
            json={"review_status": "fail", "review_note": "Lỗi cấu hình"},
            headers=headers
        )
        assert rev_fail.status_code == 200
        assert rev_fail.json()["ReviewStatus"] == "fail"
        assert rev_fail.json()["ReviewNote"] == "Lỗi cấu hình"

        rev_reset = client.put(
            f"/api/v1/projects/tasks/{t1_id}/review",
            json={"review_status": None},
            headers=headers
        )
        assert rev_reset.status_code == 200
        assert rev_reset.json()["ReviewStatus"] is None

        # 7. Check activity logs
        log_res = client.get("/api/v1/projects/activity-logs", headers=headers)
        assert log_res.status_code == 200
        logs = log_res.json()
        assert len(logs) > 0

    finally:
        # Hard cleanup
        db.query(ProjectActivityLog).filter(ProjectActivityLog.ProjectID == proj_id).delete()
        members = db.query(ProjectMember).filter(ProjectMember.ProjectID == proj_id).all()
        for m in members:
            db.query(MemberTask).filter(MemberTask.MemberID == m.MemberID).delete()
            db.delete(m)
        p = db.get(Project, proj_id)
        if p:
            db.delete(p)
        db.commit()
        db.close()


def test_project_smart_import(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    ts = int(time.time())
    proj_name = f"TEST_IMPORT_PRJ_{ts}"

    # Create in-memory Excel file with only 4 friendly columns
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Projects"
    ws.append(["Tên dự án", "Hạn chót", "Thành viên đảm nhiệm", "Nội dung công việc"])
    # Row 1: full details
    ws.append([proj_name, "2026-11-20", "Tester A", "Task Import 1"])
    # Row 2: blank project name and blank member name (forward-fill test)
    ws.append(["", "", "", "Task Import 2 (auto-inherited)"])

    excel_bytes = io.BytesIO()
    wb.save(excel_bytes)
    excel_bytes.seek(0)

    files = {"file": ("test_import.xlsx", excel_bytes.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = client.post("/api/v1/projects/import", files=files, headers=headers)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["projects_count"] >= 1
    assert res_data["tasks_count"] >= 2

    # Verify and cleanup
    session_maker = get_project_session_maker()
    db = session_maker()
    try:
        p = db.query(Project).filter(Project.ProjectName == proj_name).first()
        assert p is not None
        assert p.ProjectCode is not None  # Auto-generated code
        assert len(p.members) == 1
        assert len(p.members[0].tasks) == 2

        # Cleanup
        db.query(ProjectActivityLog).filter(ProjectActivityLog.ProjectID == p.ProjectID).delete()
        for m in p.members:
            db.query(MemberTask).filter(MemberTask.MemberID == m.MemberID).delete()
            db.delete(m)
        db.delete(p)
        db.commit()
    finally:
        db.close()


def test_app_pm_endpoints(admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Get list
    res = client.get("/api/v1/projects/app-pm", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1  # At least the existing 17 applications
    
    # 2. Create new App PM
    ts = int(time.time())
    new_app_name = f"TEST_APP_{ts}"
    create_res = client.post(
        "/api/v1/projects/app-pm",
        json={
            "project_name": new_app_name,
            "pm_project": "Tester / 0900000000",
            "note_them": "Automated test note"
        },
        headers=headers
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["project_name"] == new_app_name
    app_id = created["id"]

    # 3. Update App PM
    update_res = client.put(
        f"/api/v1/projects/app-pm/{app_id}",
        json={
            "pm_project": "Updated Tester / 0911111111"
        },
        headers=headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["pm_project"] == "Updated Tester / 0911111111"

    # 4. Delete App PM (soft delete)
    del_res = client.delete(f"/api/v1/projects/app-pm/{app_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True

