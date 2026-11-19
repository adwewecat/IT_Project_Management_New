import ast
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import get_db
from app.api.deps import require_app_or_admin
from app.models.scheduled_param_job import ScheduledParamPushJob
from app.models.audit_log import AuditLog
from app.models.standard_app_param import StandardAppParam
from app.schemas.mongodb import BatchTargetRestaurantItem, ScheduledParamJobCreateRequest
from app.services.mongodb_service import MongoDBService


def _create_sqlite_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    ).execution_options(schema_translate_map={"dbo": None})
    ScheduledParamPushJob.__table__.create(bind=engine, checkfirst=True)
    AuditLog.__table__.create(bind=engine, checkfirst=True)
    StandardAppParam.__table__.create(bind=engine, checkfirst=True)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()


def _fake_user():
    return SimpleNamespace(
        id=1,
        username="tester",
        phanquyen="0",
        is_super_admin=True,
        role_name="Admin",
        chucvu="Admin",
    )


def test_update_pending_scheduled_param_job_service():
    db = _create_sqlite_session()
    user = _fake_user()
    try:
        create_payload = ScheduledParamJobCreateRequest(
            job_title="Old title",
            run_date="2026-11-25",
            run_time="10:00",
            mode="upsert",
            target_restaurants=[
                BatchTargetRestaurantItem(
                    name="Gogi Test 1",
                    ip="10.8.1.1",
                    port=27017,
                    sap_code="1001",
                    rk7_code="101",
                )
            ],
            selected_param_codes=["LOW_ENTRY"],
            custom_params=[
                {
                    "paramCode": "LOW_ENTRY",
                    "paramName": "LOW_ENTRY",
                    "paramType": "FUNCTION",
                    "status": 1,
                    "value": "1",
                    "note": "initial",
                }
            ],
        )
        created = MongoDBService.create_scheduled_param_job(db=db, current_user=user, payload=create_payload)
        assert created.status == "PENDING"
        assert created.total_restaurants == 1
        assert created.params_payload[0]["value"] == "1"

        update_payload = ScheduledParamJobCreateRequest(
            job_title="Updated title",
            run_date="2026-11-26",
            run_time="14:30",
            mode="overwrite",
            target_restaurants=[
                BatchTargetRestaurantItem(
                    name="Gogi Test 1",
                    ip="10.8.1.1",
                    port=27017,
                    sap_code="1001",
                    rk7_code="101",
                ),
                BatchTargetRestaurantItem(
                    name="Gogi Test 2",
                    ip="10.8.2.1",
                    port=27017,
                    sap_code="1002",
                    rk7_code="102",
                ),
            ],
            selected_param_codes=["LOW_ENTRY", "NEW_PARAM"],
            custom_params=[
                {
                    "paramCode": "LOW_ENTRY",
                    "paramName": "LOW_ENTRY",
                    "paramType": "CONFIG",
                    "status": 0,
                    "value": "0",
                    "note": "updated",
                },
                {
                    "paramCode": "NEW_PARAM",
                    "paramName": "NEW_PARAM",
                    "paramType": "FUNCTION",
                    "status": 1,
                    "value": "99",
                    "note": "added",
                },
            ],
        )

        updated = MongoDBService.update_scheduled_param_job(
            db=db,
            current_user=user,
            job_id=created.id,
            payload=update_payload,
        )
        assert updated.id == created.id
        assert updated.job_title == "Updated title"
        assert updated.run_date == "2026-11-26"
        assert updated.run_time == "14:30"
        assert updated.mode == "overwrite"
        assert updated.total_restaurants == 2
        assert len(updated.params_payload) == 2
        assert updated.params_payload[0]["status"] == 0
        assert updated.params_payload[0]["value"] == "0"
        assert updated.params_payload[1]["paramCode"] == "NEW_PARAM"
    finally:
        db.close()


def test_update_non_pending_scheduled_param_job_rejected():
    db = _create_sqlite_session()
    user = _fake_user()
    try:
        payload = ScheduledParamJobCreateRequest(
            job_title="Done job",
            run_date="2026-11-19",
            run_time="08:00",
            mode="upsert",
            target_restaurants=[
                BatchTargetRestaurantItem(name="Test", ip="10.8.1.1", port=27017)
            ],
            selected_param_codes=["P1"],
            custom_params=[
                {"paramCode": "P1", "paramType": "FUNCTION", "status": 1, "value": "1"}
            ],
        )
        created = MongoDBService.create_scheduled_param_job(db=db, current_user=user, payload=payload)
        row = db.query(ScheduledParamPushJob).filter(ScheduledParamPushJob.id == created.id).first()
        row.status = "COMPLETED"
        db.commit()

        with pytest.raises(ValueError, match="Đang chờ"):
            MongoDBService.update_scheduled_param_job(
                db=db,
                current_user=user,
                job_id=created.id,
                payload=payload,
            )
    finally:
        db.close()


def test_put_scheduled_param_job_endpoint():
    db = _create_sqlite_session()
    user = _fake_user()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[require_app_or_admin] = lambda: user
    try:
        client = TestClient(app)
        create_res = client.post(
            "/api/v1/mongodb/scheduled-param-jobs",
            json={
                "job_title": "API Job",
                "run_date": "2026-11-28",
                "run_time": "09:00",
                "mode": "upsert",
                "target_restaurants": [{"name": "R1", "ip": "10.8.1.1", "port": 27017}],
                "selected_param_codes": ["P_API"],
                "custom_params": [
                    {"paramCode": "P_API", "paramType": "FUNCTION", "status": 1, "value": "1"}
                ],
            },
        )
        assert create_res.status_code == 200
        job_id = create_res.json()["id"]

        put_res = client.put(
            f"/api/v1/mongodb/scheduled-param-jobs/{job_id}",
            json={
                "job_title": "API Job Edited",
                "run_date": "2026-11-29",
                "run_time": "11:15",
                "mode": "skip_existing",
                "target_restaurants": [
                    {"name": "R1", "ip": "10.8.1.1", "port": 27017},
                    {"name": "R2", "ip": "10.8.2.1", "port": 27017},
                ],
                "selected_param_codes": ["P_API"],
                "custom_params": [
                    {"paramCode": "P_API", "paramType": "CONFIG", "status": 0, "value": "ABC"}
                ],
            },
        )
        assert put_res.status_code == 200
        data = put_res.json()
        assert data["job_title"] == "API Job Edited"
        assert data["total_restaurants"] == 2
        assert data["params_payload"][0]["value"] == "ABC"
        assert data["params_payload"][0]["status"] == 0
    finally:
        app.dependency_overrides.clear()
        db.close()


def test_python_310_ast_compatibility_for_edited_files():
    backend_root = Path(__file__).resolve().parents[1]
    for rel_path in ["app/api/v1/mongodb.py", "app/services/mongodb_service.py"]:
        src = (backend_root / rel_path).read_text(encoding="utf-8")
        assert not src.startswith("\ufeff")
        ast.parse(src, filename=rel_path, feature_version=(3, 10))
