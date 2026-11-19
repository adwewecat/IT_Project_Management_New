# -*- coding: utf-8 -*-
"""
Unit & integration tests cho:
1. Fix loi selector chon User 3CX (textContent "8778Duy Ngo Nhut..." khong co dau cach, dung [data-qa='peer-number'] + (?:\D|$)).
2. 2 cot hen gio cap nhat Manual (Ca Sang Backup & Ca Toi Backup) tren HOTLINE_3CX_SCHEDULES:
   - Model columns, normalize/validate HH:mm 24h
   - resolve_shift_plan cho MORNING_BACKUP & EVENING_BACKUP (ngay thuong vs cuoi tuan/le)
   - get_due_manual_backup_shifts & chong chay lap theo moc gio has_backup_sync_for_slot
   - API PUT/GET /api/v1/hotline-3cx-auto/schedules round-trip
"""

import asyncio
from datetime import date
from pathlib import Path
import re

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


def test_3cx_user_dropdown_selectors_handle_concatenated_peer_number():
    """Ca backend va Relay Worker phai match [data-qa='peer-number'] va (?:\\D|$) thay vi \\b."""
    backend_root = Path(__file__).resolve().parent.parent
    targets = [
        backend_root / "app" / "services" / "hotline_3cx_auto_service.py",
        backend_root / "app" / "assets" / "3cx_sync_relay" / "3cx_sync_relay.py",
    ]
    for path in targets:
        src = path.read_text(encoding="utf-8")
        assert "[data-qa='peer-number']" in src, f"Thieu [data-qa='peer-number'] trong {path.name}"
        assert r"(?:\D|$)" in src, f"Thieu fallback regex (?:\\D|$) trong {path.name}"
        assert r"\b" not in src or "re.escape(ext_line) + r\"\\b\"" not in src
        assert r"re.escape(assignment.ext_line)}\b" not in src

    pat = re.compile(r"^\s*" + re.escape("8778") + r"(?:\D|$)")
    assert pat.search("8778Duy Ngo Nhut HCM IT Dept") is not None
    assert pat.search("8778 Duy Ngo Nhut HCM IT Dept") is not None
    assert pat.search("8778") is not None
    assert pat.search("87780 Other User") is None


def test_schedule_model_has_backup_columns():
    from app.models.hotline_3cx_auto import Hotline3cxSchedule

    cols = set(Hotline3cxSchedule.__table__.columns.keys())
    assert {
        "morning_backup_time",
        "morning_backup_lines_json",
        "evening_backup_time",
        "evening_backup_lines_json",
    }.issubset(cols)


def test_upsert_and_read_backup_schedules_with_hhmm_validation():
    from app.schemas.hotline_3cx_auto import ScheduleDayUpsertItem
    from app.services.hotline_3cx_auto_service import (
        ensure_seeded_data,
        get_schedules_range,
        upsert_schedules,
    )

    _, SessionLocal = _make_memory_db()
    with SessionLocal() as db:
        ensure_seeded_data(db)
        target_day = date(2026, 11, 19)

        upsert_schedules(
            db,
            [
                ScheduleDayUpsertItem(
                    duty_date=target_day,
                    shift_mode="AUTO",
                    morning_lines=["8778", "8776"],
                    evening_lines=["8772", "8779"],
                    morning_backup_time="9:30",
                    morning_backup_lines=["8775", "8741"],
                    evening_backup_time="20:15",
                    evening_backup_lines=["8740", "8772"],
                )
            ],
            updated_by="dung.nguyenanh",
        )
        rows = get_schedules_range(db, target_day, target_day)
        assert len(rows) == 1
        assert rows[0].morning_backup_time == "09:30"
        assert rows[0].morning_backup_lines == ["8775", "8741"]
        assert rows[0].evening_backup_time == "20:15"
        assert rows[0].evening_backup_lines == ["8740", "8772"]

        try:
            upsert_schedules(
                db,
                [
                    ScheduleDayUpsertItem(
                        duty_date=target_day,
                        shift_mode="AUTO",
                        morning_backup_time="25:99",
                        morning_backup_lines=["8775"],
                    )
                ],
            )
            assert False, "Phai bao loi khi gio hen khong hop le"
        except ValueError as ve:
            assert "HH:mm" in str(ve) or "không hợp lệ" in str(ve)


def test_resolve_shift_plan_backup_weekday_and_weekend():
    from app.models.hotline_3cx_auto import Hotline3cxSchedule
    from app.schemas.hotline_3cx_auto import Hotline3cxConfigUpdate
    from app.services.hotline_3cx_auto_service import (
        ensure_seeded_data,
        get_or_create_config,
        resolve_shift_plan,
        update_config,
    )

    _, SessionLocal = _make_memory_db()
    with SessionLocal() as db:
        ensure_seeded_data(db)
        update_config(db, Hotline3cxConfigUpdate(day_queue_name="IT HCM App Day", night_queue_name="IT HCM App Night"))
        cfg = get_or_create_config(db)

        # Ngay thuong (Thu Nam 19-11-2026)
        weekday_row = Hotline3cxSchedule(
            duty_date=date(2026, 11, 19),
            shift_mode="AUTO",
            morning_backup_time="11:30",
            morning_backup_lines_json='["8775", "8741"]',
            evening_backup_time="20:00",
            evening_backup_lines_json='["8740", "8772"]',
        )
        plan_mb_wd = resolve_shift_plan(date(2026, 11, 19), "MORNING_BACKUP", weekday_row, cfg)
        assert plan_mb_wd.should_skip is False
        assert plan_mb_wd.queue_name == "IT HCM App Day"
        assert plan_mb_wd.use_skill_group is False
        assert [(e.ext_line, e.skill_group) for e in plan_mb_wd.entries] == [("8775", None), ("8741", None)]

        plan_eb_wd = resolve_shift_plan(date(2026, 11, 19), "EVENING_BACKUP", weekday_row, cfg)
        assert plan_eb_wd.should_skip is False
        assert plan_eb_wd.queue_name == "IT HCM App Night"
        assert plan_eb_wd.use_skill_group is True
        assert [(e.ext_line, e.skill_group) for e in plan_eb_wd.entries] == [("8740", "1"), ("8772", "2")]

        # Cuoi tuan (Thu Bay 21-11-2026) -> Ca 2 backup deu vao Night Queue voi Skill 1 / 2
        weekend_row = Hotline3cxSchedule(
            duty_date=date(2026, 11, 21),
            shift_mode="AUTO",
            morning_backup_time="10:00",
            morning_backup_lines_json='["8776", "8779"]',
            evening_backup_time="19:30",
            evening_backup_lines_json='["8741", "8740"]',
        )
        plan_mb_we = resolve_shift_plan(date(2026, 11, 21), "MORNING_BACKUP", weekend_row, cfg)
        assert plan_mb_we.should_skip is False
        assert plan_mb_we.queue_name == "IT HCM App Night"
        assert plan_mb_we.use_skill_group is True
        assert [(e.ext_line, e.skill_group) for e in plan_mb_we.entries] == [("8776", "1"), ("8779", "2")]

        # Backup rong -> should_skip=True
        empty_row = Hotline3cxSchedule(duty_date=date(2026, 11, 19), shift_mode="AUTO")
        plan_empty = resolve_shift_plan(date(2026, 11, 19), "MORNING_BACKUP", empty_row, cfg)
        assert plan_empty.should_skip is True


def test_due_backup_shifts_slot_dedupe_and_api_roundtrip():
    from app.api.deps import require_super_admin_or_dung
    from app.core.database import get_db
    from app.main import app
    from app.schemas.hotline_3cx_auto import Hotline3cxConfigUpdate, ScheduleDayUpsertItem
    from app.services.hotline_3cx_auto_service import (
        ensure_seeded_data,
        get_due_manual_backup_shifts,
        has_backup_sync_for_slot,
        run_shift_sync,
        update_config,
        upsert_schedules,
    )

    _, SessionLocal = _make_memory_db()
    target_day = date(2026, 11, 19)

    with SessionLocal() as db:
        ensure_seeded_data(db)
        update_config(
            db,
            Hotline3cxConfigUpdate(execution_mode="RELAY", password="test-secret-password"),
        )
        upsert_schedules(
            db,
            [
                ScheduleDayUpsertItem(
                    duty_date=target_day,
                    shift_mode="AUTO",
                    morning_backup_time="11:30",
                    morning_backup_lines=["8775", "8778"],
                    evening_backup_time="20:00",
                    evening_backup_lines=[],  # Rong -> khong duoc kich hoat
                )
            ],
        )

        assert get_due_manual_backup_shifts(db, target_day, "11:30") == [("MORNING_BACKUP", "11:30")]
        assert get_due_manual_backup_shifts(db, target_day, "20:00") == []
        assert has_backup_sync_for_slot(db, target_day, "MORNING_BACKUP", "11:30") is False

        log = asyncio.run(
            run_shift_sync(
                db,
                duty_date=target_day,
                shift_code="MORNING_BACKUP",
                triggered_by="Hẹn giờ Backup (11:30)",
                dry_run=False,
            )
        )
        assert log.status == "PENDING"
        assert log.shift_code == "MORNING_BACKUP"
        assert has_backup_sync_for_slot(db, target_day, "MORNING_BACKUP", "11:30") is True
        # Doi gio khac cung ngay van chay duoc
        assert has_backup_sync_for_slot(db, target_day, "MORNING_BACKUP", "14:00") is False

    def _override_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[require_super_admin_or_dung] = lambda: _MockSuperUser()
    try:
        with TestClient(app) as client:
            res_put = client.put(
                "/api/v1/hotline-3cx-auto/schedules",
                json={
                    "days": [
                        {
                            "duty_date": "2026-11-20",
                            "shift_mode": "AUTO",
                            "morning_lines": ["8779"],
                            "evening_lines": ["8776", "8775"],
                            "weekend_lines": [],
                            "weekend_evening_override": [],
                            "morning_backup_time": "10:45",
                            "morning_backup_lines": ["8740", "8741"],
                            "evening_backup_time": "21:00",
                            "evening_backup_lines": ["8778", "8772"],
                        }
                    ]
                },
            )
            assert res_put.status_code == 200
            day_item = res_put.json()[0]
            assert day_item["morning_backup_time"] == "10:45"
            assert day_item["morning_backup_lines"] == ["8740", "8741"]
            assert day_item["evening_backup_time"] == "21:00"
            assert day_item["evening_backup_lines"] == ["8778", "8772"]

            res_bad = client.put(
                "/api/v1/hotline-3cx-auto/schedules",
                json={
                    "days": [
                        {
                            "duty_date": "2026-11-20",
                            "shift_mode": "AUTO",
                            "morning_backup_time": "99:99",
                        }
                    ]
                },
            )
            assert res_bad.status_code == 400
    finally:
        app.dependency_overrides.clear()
