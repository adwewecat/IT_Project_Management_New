import ast
import os
from datetime import date
from pathlib import Path


def test_hotline_3cx_auto_models_metadata():
    from app.models.hotline_3cx_auto import (
        Hotline3cxConfig,
        Hotline3cxMember,
        Hotline3cxSchedule,
        Hotline3cxSyncLog,
    )

    assert Hotline3cxMember.__tablename__ == "HOTLINE_3CX_MEMBERS"
    assert Hotline3cxSchedule.__tablename__ == "HOTLINE_3CX_SCHEDULES"
    assert Hotline3cxSyncLog.__tablename__ == "HOTLINE_3CX_SYNC_LOGS"
    assert Hotline3cxConfig.__tablename__ == "HOTLINE_3CX_CONFIG"

    schedule_cols = set(Hotline3cxSchedule.__table__.columns.keys())
    assert {
        "id",
        "duty_date",
        "shift_mode",
        "morning_lines_json",
        "evening_lines_json",
        "weekend_lines_json",
        "weekend_evening_override_json",
        "note",
        "updated_by",
        "updated_at",
    }.issubset(schedule_cols)

    config_cols = set(Hotline3cxConfig.__table__.columns.keys())
    assert {
        "id",
        "portal_url",
        "username",
        "password_enc",
        "day_queue_name",
        "night_queue_name",
        "morning_time",
        "evening_time",
        "alert_emails",
        "updated_at",
    }.issubset(config_cols)


def test_settings_has_hotline_3cx_password_field():
    from app.core.config import Settings

    s = Settings()
    assert hasattr(s, "HOTLINE_3CX_PASSWORD")
    assert isinstance(s.HOTLINE_3CX_PASSWORD, str)


def test_hotline_files_are_python310_compatible():
    backend_app = Path(__file__).resolve().parent.parent / "app"
    model_file = backend_app / "models" / "hotline_3cx_auto.py"
    source = model_file.read_text(encoding="utf-8")
    assert not source.startswith("\ufeff")
    ast.parse(source)


def test_hotline_tables_sqlite_in_memory_creation():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from app.core.database import Base
    from app.models.hotline_3cx_auto import (
        Hotline3cxConfig,
        Hotline3cxMember,
        Hotline3cxSchedule,
        Hotline3cxSyncLog,
    )

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(
        engine,
        tables=[
            Hotline3cxMember.__table__,
            Hotline3cxSchedule.__table__,
            Hotline3cxSyncLog.__table__,
            Hotline3cxConfig.__table__,
        ],
    )

    with Session(engine) as session:
        member = Hotline3cxMember(ext_line="8740", full_name="Nguyen Van A")
        session.add(member)
        cfg = Hotline3cxConfig(id=1)
        session.add(cfg)
        sched = Hotline3cxSchedule(
            duty_date=date(2026, 11, 15),
            morning_lines_json='["8740"]',
            evening_lines_json='["8740"]',
        )
        session.add(sched)
        log = Hotline3cxSyncLog(
            duty_date=date(2026, 11, 15),
            shift_code="MORNING",
            queue_name="IT HCM App Day",
            status="SUCCESS",
        )
        session.add(log)
        session.commit()

        assert member.id is not None
        assert member.is_active is True
        assert member.sort_order == 0
        assert sched.shift_mode == "AUTO"
        assert cfg.username == "8740"
        assert log.is_dry_run is False
