# -*- coding: utf-8 -*-
"""
Unit & integration tests cho 3CX Sync Relay Worker (Phuong An 2):
- Model Hotline3cxRelayTask & cac cot Relay tren Hotline3cxConfig
- Kiem tra tuong thich Python 3.10 AST + khong BOM cho cac file backend & worker
- run_shift_sync trong execution_mode='RELAY':
  + SKIPPED ngay khi lich rong (khong tao task)
  + FAILED ngay khi thieu password (khong tao task)
  + PENDING khi hop le: tao Hotline3cxSyncLog(PENDING) + Hotline3cxRelayTask(PENDING), khong goi sync_fn local
- Xac thuc X-Relay-Token & API Relay Worker:
  + Tu dong tao relay_token khi khoi tao config
  + POST /relay/heartbeat (401 khi thieu/sai token, 200 cap nhat relay_online=True)
  + GET /relay/next-task (atomic claim PENDING -> RUNNING, worker thu 2 nhan has_task=False)
  + POST /relay/tasks/{id}/report (luu status, applied_lines, upload anh PNG vao /uploads/hotline_3cx, gui alert neu FAILED)
  + expire_stale_relay_tasks (qua 15 phut -> TIMEOUT & log FAILED)
  + POST /relay/regenerate-token (doi token moi, vo hieu token cu)
  + GET /relay/download-package (ZIP hop le chua 3cx_sync_relay.py, relay_config.json co token & server_url, cac file .bat Pure ASCII CRLF)
"""

import ast
import asyncio
from datetime import date, datetime, timedelta
import io
import json
from pathlib import Path
from unittest.mock import patch
import zipfile

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


class _MockSuperUser:
    username = "dung.nguyenanh"
    is_super_admin = True
    phanquyen = "0"


def _make_memory_db():
    from app.core.database import Base
    from app.models.hotline_3cx_auto import (
        Hotline3cxConfig,
        Hotline3cxHoliday,
        Hotline3cxMember,
        Hotline3cxRelayTask,
        Hotline3cxSchedule,
        Hotline3cxSyncLog,
    )

    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        engine,
        tables=[
            Hotline3cxMember.__table__,
            Hotline3cxSchedule.__table__,
            Hotline3cxSyncLog.__table__,
            Hotline3cxConfig.__table__,
            Hotline3cxHoliday.__table__,
            Hotline3cxRelayTask.__table__,
        ],
    )
    return engine, sessionmaker(autocommit=False, autoflush=False, bind=engine)


def test_relay_model_and_config_columns():
    from app.models.hotline_3cx_auto import Hotline3cxConfig, Hotline3cxRelayTask

    assert Hotline3cxRelayTask.__tablename__ == "HOTLINE_3CX_RELAY_TASKS"
    task_cols = set(Hotline3cxRelayTask.__table__.columns.keys())
    assert {
        "id",
        "duty_date",
        "shift_code",
        "queue_name",
        "is_dry_run",
        "triggered_by",
        "plan_json",
        "status",
        "worker_name",
        "sync_log_id",
        "error_message",
        "created_at",
        "claimed_at",
        "finished_at",
    }.issubset(task_cols)

    cfg_cols = set(Hotline3cxConfig.__table__.columns.keys())
    assert {
        "execution_mode",
        "relay_token",
        "relay_worker_name",
        "relay_last_ip",
        "relay_last_seen_at",
    }.issubset(cfg_cols)


def test_python310_ast_and_no_bom_for_relay_assets():
    backend_root = Path(__file__).resolve().parent.parent
    py_targets = [
        backend_root / "app" / "models" / "hotline_3cx_auto.py",
        backend_root / "app" / "schemas" / "hotline_3cx_auto.py",
        backend_root / "app" / "services" / "hotline_3cx_auto_service.py",
        backend_root / "app" / "services" / "hotline_3cx_relay_package.py",
        backend_root / "app" / "api" / "v1" / "hotline_3cx_auto.py",
        backend_root / "app" / "assets" / "3cx_sync_relay" / "3cx_sync_relay.py",
    ]
    for p in py_targets:
        assert p.exists(), f"Thieu file bat buoc: {p}"
        src = p.read_text(encoding="utf-8")
        assert not src.startswith("\ufeff"), f"Co UTF-8 BOM trong file {p}"
        ast.parse(src)


def test_run_shift_sync_relay_mode_enqueues_without_local_playwright():
    from app.models.hotline_3cx_auto import Hotline3cxRelayTask
    from app.schemas.hotline_3cx_auto import Hotline3cxConfigUpdate, ScheduleDayUpsertItem
    from app.services.hotline_3cx_auto_service import (
        ensure_seeded_data,
        get_or_create_config,
        run_shift_sync,
        update_config,
        upsert_schedules,
    )

    _, SessionLocal = _make_memory_db()
    with SessionLocal() as db:
        ensure_seeded_data(db)
        update_config(
            db,
            Hotline3cxConfigUpdate(
                execution_mode="RELAY",
                password="secret-password-test",
            ),
        )
        cfg = get_or_create_config(db)
        assert cfg.execution_mode == "RELAY"
        assert cfg.relay_token

        called_local = False

        async def _should_not_run(**kwargs):
            nonlocal called_local
            called_local = True
            return {}

        target_day = date(2026, 11, 16)  # Thu Hai

        # 1. Chua co lich -> SKIPPED ngay, khong tao relay task
        skip_log = asyncio.run(
            run_shift_sync(
                db,
                duty_date=target_day,
                shift_code="MORNING",
                triggered_by="admin",
                dry_run=True,
                sync_fn=_should_not_run,
            )
        )
        assert skip_log.status == "SKIPPED"
        assert db.query(Hotline3cxRelayTask).count() == 0
        assert called_local is False

        # 2. Co lich hop le -> tao PENDING log + PENDING task, van khong goi Playwright local
        upsert_schedules(
            db,
            [
                ScheduleDayUpsertItem(
                    duty_date=target_day,
                    shift_mode="AUTO",
                    morning_lines=["8775", "8778"],
                    evening_lines=["8740", "8741"],
                )
            ],
        )
        pending_log = asyncio.run(
            run_shift_sync(
                db,
                duty_date=target_day,
                shift_code="MORNING",
                triggered_by="dung.nguyenanh",
                dry_run=True,
                sync_fn=_should_not_run,
            )
        )
        assert called_local is False
        assert pending_log.status == "PENDING"
        assert pending_log.is_dry_run is True
        assert pending_log.finished_at is None
        assert json.loads(pending_log.applied_lines_json) == ["8775", "8778"]

        task = db.query(Hotline3cxRelayTask).first()
        assert task is not None
        assert task.status == "PENDING"
        assert task.sync_log_id == pending_log.id
        assert task.is_dry_run is True
        plan_obj = json.loads(task.plan_json)
        assert plan_obj["queue_name"] == "IT HCM App Day"
        assert [e["ext_line"] for e in plan_obj["entries"]] == ["8775", "8778"]


def test_relay_api_full_lifecycle_and_download_zip(tmp_path):
    from app.api.deps import require_super_admin_or_dung
    from app.core.database import get_db
    from app.main import app
    from app.models.hotline_3cx_auto import Hotline3cxRelayTask, Hotline3cxSyncLog
    from app.schemas.hotline_3cx_auto import Hotline3cxConfigUpdate, ScheduleDayUpsertItem
    from app.services.hotline_3cx_auto_service import (
        ensure_seeded_data,
        expire_stale_relay_tasks,
        update_config,
        upsert_schedules,
    )

    _, SessionLocal = _make_memory_db()
    with SessionLocal() as seed_db:
        ensure_seeded_data(seed_db)
        update_config(
            seed_db,
            Hotline3cxConfigUpdate(
                execution_mode="RELAY",
                password="secret-password-test",
                alert_emails="alert@ggg.com.vn",
            ),
        )
        upsert_schedules(
            seed_db,
            [
                ScheduleDayUpsertItem(
                    duty_date=date(2026, 11, 16),
                    shift_mode="AUTO",
                    morning_lines=["8775", "8778"],
                    evening_lines=["8740", "8741"],
                )
            ],
        )

    def _override_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[require_super_admin_or_dung] = lambda: _MockSuperUser()

    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32

    try:
        with TestClient(app) as client:
            # 1. Lay config -> phai co relay_token, execution_mode='RELAY', relay_online=False
            cfg_res = client.get("/api/v1/hotline-3cx-auto/config")
            assert cfg_res.status_code == 200
            cfg_data = cfg_res.json()
            assert cfg_data["execution_mode"] == "RELAY"
            token = cfg_data["relay_token"]
            assert token and len(token) >= 20
            assert cfg_data["relay_online"] is False

            # 2. Heartbeat sai / thieu token -> 401
            assert client.post("/api/v1/hotline-3cx-auto/relay/heartbeat", json={"worker_name": "PC1"}).status_code == 401
            assert client.post(
                "/api/v1/hotline-3cx-auto/relay/heartbeat",
                headers={"X-Relay-Token": "wrong-token"},
                json={"worker_name": "PC1"},
            ).status_code == 401

            # 3. Heartbeat dung token -> 200 & config.relay_online=True
            hb_res = client.post(
                "/api/v1/hotline-3cx-auto/relay/heartbeat",
                headers={"X-Relay-Token": token},
                json={"worker_name": "PC-IT-VANPHONG", "can_reach_3cx": True},
            )
            assert hb_res.status_code == 200
            assert hb_res.json()["ok"] is True

            cfg_after = client.get("/api/v1/hotline-3cx-auto/config").json()
            assert cfg_after["relay_online"] is True
            assert cfg_after["relay_worker_name"] == "PC-IT-VANPHONG"

            # 4. Web kich hoat dry-run trong RELAY mode -> tra log PENDING
            dry_res = client.post(
                "/api/v1/hotline-3cx-auto/dry-run",
                json={"duty_date": "2026-11-16", "shift_code": "MORNING"},
            )
            assert dry_res.status_code == 200
            dry_log = dry_res.json()
            assert dry_log["status"] == "PENDING"
            assert dry_log["is_dry_run"] is True

            # 5. Worker 1 lay task -> atomic claim PENDING -> RUNNING
            claim_1 = client.get(
                "/api/v1/hotline-3cx-auto/relay/next-task",
                headers={"X-Relay-Token": token},
                params={"worker_name": "PC-IT-VANPHONG"},
            )
            assert claim_1.status_code == 200
            payload_1 = claim_1.json()
            assert payload_1["has_task"] is True
            task_info = payload_1["task"]
            assert task_info["queue_name"] == "IT HCM App Day"
            assert task_info["password"] == "secret-password-test"
            task_id = task_info["task_id"]

            # Worker 2 goi ngay sau -> khong con task PENDING
            claim_2 = client.get(
                "/api/v1/hotline-3cx-auto/relay/next-task",
                headers={"X-Relay-Token": token},
                params={"worker_name": "PC-KHAC"},
            )
            assert claim_2.status_code == 200
            assert claim_2.json()["has_task"] is False

            # Log trong DB da chuyen sang RUNNING
            logs_running = client.get("/api/v1/hotline-3cx-auto/logs").json()
            assert logs_running[0]["status"] == "RUNNING"

            # 6. Worker bao cao ket qua kem anh PNG (luu vao tmp uploads patch hoac static)
            with patch(
                "app.services.hotline_3cx_auto_service._get_hotline_upload_dir",
                return_value=str(tmp_path),
            ):
                rep_res = client.post(
                    f"/api/v1/hotline-3cx-auto/relay/tasks/{task_id}/report",
                    headers={"X-Relay-Token": token},
                    data={
                        "status": "DRY_RUN",
                        "worker_name": "PC-IT-VANPHONG",
                        "applied_lines_json": json.dumps(["8775", "8778"]),
                        "error_message": "",
                    },
                    files={"screenshot": ("proof.png", io.BytesIO(png_bytes), "image/png")},
                )
            assert rep_res.status_code == 200
            assert rep_res.json()["success"] is True

            logs_done = client.get("/api/v1/hotline-3cx-auto/logs").json()
            assert logs_done[0]["status"] == "DRY_RUN"
            assert logs_done[0]["screenshot_path"].startswith("/uploads/hotline_3cx/")
            saved_files = list(tmp_path.glob("*.png"))
            assert len(saved_files) == 1
            assert saved_files[0].read_bytes() == png_bytes

            # 7. Tai goi ZIP cho Relay Worker
            zip_res = client.get(
                "/api/v1/hotline-3cx-auto/relay/download-package",
                params={"server_url": "http://172.16.8.25:5001"},
            )
            assert zip_res.status_code == 200
            assert "application/zip" in zip_res.headers.get("content-type", "")
            zf = zipfile.ZipFile(io.BytesIO(zip_res.content))
            names = set(zf.namelist())
            assert {
                "3cx_sync_relay.py",
                "relay_config.json",
                "Chay_3CX_Sync_Relay.bat",
                "Cai_Dat_Khoi_Dong_Cung_Windows.bat",
                "Dung_3CX_Relay.bat",
                "Chay_Ngam_3CX_Relay.vbs",
                "README_HUONG_DAN.txt",
            }.issubset(names)

            cfg_json = json.loads(zf.read("relay_config.json").decode("utf-8"))
            assert cfg_json["server_url"] == "http://172.16.8.25:5001"
            assert cfg_json["relay_token"] == token

            # Kiem tra tat ca file .bat la Pure ASCII va CRLF
            for bat_name in (
                "Chay_3CX_Sync_Relay.bat",
                "Cai_Dat_Khoi_Dong_Cung_Windows.bat",
                "Dung_3CX_Relay.bat",
            ):
                raw_bat = zf.read(bat_name)
                assert b"\r\n" in raw_bat
                assert b"\n" not in raw_bat.replace(b"\r\n", b"")
                raw_bat.decode("ascii")

            # 8. Doi token -> token cu bi tu choi 401
            regen_res = client.post("/api/v1/hotline-3cx-auto/relay/regenerate-token")
            assert regen_res.status_code == 200
            new_token = regen_res.json()["relay_token"]
            assert new_token != token

            assert client.post(
                "/api/v1/hotline-3cx-auto/relay/heartbeat",
                headers={"X-Relay-Token": token},
                json={"worker_name": "PC-IT-VANPHONG"},
            ).status_code == 401
            assert client.post(
                "/api/v1/hotline-3cx-auto/relay/heartbeat",
                headers={"X-Relay-Token": new_token},
                json={"worker_name": "PC-IT-VANPHONG"},
            ).status_code == 200

            # 9. Kiem thu het han task cu (>15 phut) -> TIMEOUT & log FAILED
            with SessionLocal() as db:
                stale_log = Hotline3cxSyncLog(
                    duty_date=date(2026, 11, 16),
                    shift_code="EVENING",
                    queue_name="IT HCM App Night",
                    applied_lines_json='["8740"]',
                    status="PENDING",
                    is_dry_run=False,
                    triggered_by="He thong (Auto)",
                    started_at=datetime.now() - timedelta(minutes=25),
                )
                db.add(stale_log)
                db.flush()
                stale_task = Hotline3cxRelayTask(
                    duty_date=date(2026, 11, 16),
                    shift_code="EVENING",
                    queue_name="IT HCM App Night",
                    is_dry_run=False,
                    triggered_by="He thong (Auto)",
                    plan_json=json.dumps({"queue_name": "IT HCM App Night", "use_skill_group": True, "entries": []}),
                    status="PENDING",
                    sync_log_id=stale_log.id,
                    created_at=datetime.now() - timedelta(minutes=25),
                )
                db.add(stale_task)
                db.commit()

                alerts = []
                expired_count = expire_stale_relay_tasks(
                    db,
                    timeout_minutes=15,
                    alert_fn=lambda subj, body, emails: alerts.append((subj, body, emails)),
                )
                assert expired_count == 1
                db.refresh(stale_task)
                db.refresh(stale_log)
                assert stale_task.status == "TIMEOUT"
                assert stale_log.status == "FAILED"
                assert "Relay Worker" in (stale_log.error_message or "")
                assert len(alerts) == 1
    finally:
        app.dependency_overrides.clear()


def test_worker_standalone_multipart_and_pending_guard(tmp_path):
    """Kiem tra script 3cx_sync_relay.py dong goi multipart chuan va guard has_pending_relay_sync."""
    import importlib.util
    from app.models.hotline_3cx_auto import Hotline3cxRelayTask
    from app.services.hotline_3cx_auto_service import has_pending_relay_sync

    worker_path = (
        Path(__file__).resolve().parent.parent
        / "app"
        / "assets"
        / "3cx_sync_relay"
        / "3cx_sync_relay.py"
    )
    spec = importlib.util.spec_from_file_location("relay_worker_mod", str(worker_path))
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)

    body, ctype = mod.encode_multipart_formdata(
        {"status": "SUCCESS", "worker_name": "PC1"},
        ("screenshot", "proof.png", b"\x89PNG\r\n\x1a\nOK", "image/png"),
    )
    assert ctype.startswith("multipart/form-data; boundary=")
    assert b'name="status"' in body
    assert b'filename="proof.png"' in body
    assert b"\x89PNG\r\n\x1a\nOK" in body

    cfg_file = tmp_path / "relay_config.json"
    cfg_file.write_text(
        json.dumps({"server_url": "http://127.0.0.1:8000/", "relay_token": "tok123"}),
        encoding="utf-8",
    )
    loaded = mod.load_config(str(cfg_file))
    assert loaded["server_url"] == "http://127.0.0.1:8000"
    assert loaded["relay_token"] == "tok123"
    assert loaded["worker_name"]

    _, SessionLocal = _make_memory_db()
    with SessionLocal() as db:
        assert has_pending_relay_sync(db, date(2026, 11, 16), "MORNING") is False
        db.add(
            Hotline3cxRelayTask(
                duty_date=date(2026, 11, 16),
                shift_code="MORNING",
                queue_name="IT HCM App Day",
                is_dry_run=False,
                plan_json="{}",
                status="PENDING",
            )
        )
        db.commit()
        assert has_pending_relay_sync(db, date(2026, 11, 16), "MORNING") is True


def test_force_direct_and_cancel_pending_logs_api(tmp_path):
    """Kiem tra force_direct bo qua hang cho Relay va API huy lenh PENDING trong Nhat ky."""
    import asyncio
    from types import SimpleNamespace
    from fastapi.testclient import TestClient

    from app.api.v1.hotline_3cx_auto import require_hotline_access
    from app.core.database import get_db
    from app.main import app
    from app.models.hotline_3cx_auto import Hotline3cxRelayTask, Hotline3cxSyncLog
    from app.schemas.hotline_3cx_auto import Hotline3cxConfigUpdate, ScheduleDayUpsertItem
    from app.services.hotline_3cx_auto_service import (
        cancel_all_pending_sync_logs,
        cancel_pending_sync_log,
        claim_next_relay_task,
        ensure_seeded_data,
        has_pending_relay_sync,
        run_shift_sync,
        update_config,
        upsert_schedules,
    )

    _, SessionLocal = _make_memory_db()
    with SessionLocal() as db:
        ensure_seeded_data(db)
        update_config(
            db,
            Hotline3cxConfigUpdate(
                portal_url="https://ggg.ringbot.co:5001/#/login",
                username="8740",
                password="secret",
                execution_mode="RELAY",
            ),
        )
        upsert_schedules(
            db,
            [
                ScheduleDayUpsertItem(
                    duty_date=date(2026, 11, 20),
                    shift_mode="WEEKDAY",
                    morning_lines=["8779", "8741"],
                    evening_lines=["8742", "8743"],
                )
            ],
        )

        # 1. Mac dinh RELAY -> tao log PENDING va task PENDING
        log_q1 = asyncio.run(
            run_shift_sync(
                db,
                duty_date=date(2026, 11, 20),
                shift_code="MORNING",
                triggered_by="dung.nguyenanh",
                dry_run=False,
            )
        )
        assert log_q1.status == "PENDING"
        assert has_pending_relay_sync(db, date(2026, 11, 20), "MORNING") is True

        # 2. Khi truyen force_direct=True -> bo qua Relay queue, goi sync_fn truc tiep ngay
        called_direct = {"count": 0}

        async def _fake_direct_sync(**kwargs):
            called_direct["count"] += 1
            return {"status": "SUCCESS"}

        log_direct = asyncio.run(
            run_shift_sync(
                db,
                duty_date=date(2026, 11, 20),
                shift_code="MORNING",
                triggered_by="dung.nguyenanh",
                dry_run=False,
                force_direct=True,
                sync_fn=_fake_direct_sync,
            )
        )
        assert called_direct["count"] == 1
        assert log_direct.status == "SUCCESS"

        # 3. Huy 1 lenh PENDING -> chuyen sang CANCELLED va worker khong claim duoc nua
        log_q2 = asyncio.run(
            run_shift_sync(
                db,
                duty_date=date(2026, 11, 20),
                shift_code="MORNING",
                triggered_by="dung.nguyenanh",
                dry_run=True,
            )
        )
        assert log_q2.status == "PENDING"
        cancelled = cancel_pending_sync_log(db, log_q1.id, cancelled_by="dung.nguyenanh")
        assert cancelled is not None
        assert cancelled.status == "CANCELLED"
        assert "hủy" in (cancelled.error_message or "").lower()
        assert has_pending_relay_sync(db, date(2026, 11, 20), "MORNING") is False

        # 4. API endpoints POST /logs/{id}/cancel va POST /logs/cancel-pending
        def _override_db():
            yield db

        app.dependency_overrides[get_db] = _override_db
        app.dependency_overrides[require_hotline_access] = lambda: SimpleNamespace(
            username="dung.nguyenanh", is_super_admin=True, phanquyen="0"
        )
        try:
            with TestClient(app) as client:
                r_bad = client.post(f"/api/v1/hotline-3cx-auto/logs/{log_direct.id}/cancel")
                assert r_bad.status_code == 400

                r_all = client.post("/api/v1/hotline-3cx-auto/logs/cancel-pending")
                assert r_all.status_code == 200
                assert r_all.json()["cancelled_count"] >= 1
        finally:
            app.dependency_overrides.clear()

        refreshed_q2 = db.query(Hotline3cxSyncLog).filter(Hotline3cxSyncLog.id == log_q2.id).first()
        assert refreshed_q2.status == "CANCELLED"
        task_q2 = (
            db.query(Hotline3cxRelayTask)
            .filter(Hotline3cxRelayTask.sync_log_id == log_q2.id)
            .first()
        )
        assert task_q2 is not None and task_q2.status == "CANCELLED"
        assert claim_next_relay_task(db, worker_name="PC_TEST") is None
        assert cancel_all_pending_sync_logs(db, cancelled_by="dung.nguyenanh") == 0


def test_relay_worker_lock_and_bat_files_ascii(tmp_path, monkeypatch):
    """Kiem tra lock file chong chay trung lap --if-not-running va chuan Pure ASCII cua file .bat."""
    import importlib.util

    assets_dir = (
        Path(__file__).resolve().parent.parent
        / "app"
        / "assets"
        / "3cx_sync_relay"
    )
    for bat_name in ("Chay_3CX_Sync_Relay.bat", "Cai_Dat_Khoi_Dong_Cung_Windows.bat"):
        raw = (assets_dir / bat_name).read_text(encoding="ascii")
        assert raw, f"{bat_name} rong"
        assert "timeout /t 3" in raw

    worker_path = assets_dir / "3cx_sync_relay.py"
    spec = importlib.util.spec_from_file_location("relay_worker_lock_mod", str(worker_path))
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)

    monkeypatch.setattr(mod, "LOCK_FILE_PATH", str(tmp_path / ".test.lock"))
    h1 = mod._try_acquire_worker_lock()
    assert h1 is not None
    h2 = mod._try_acquire_worker_lock()
    assert h2 is None
    mod._release_worker_lock(h1)
    h3 = mod._try_acquire_worker_lock()
    assert h3 is not None
    mod._release_worker_lock(h3)


