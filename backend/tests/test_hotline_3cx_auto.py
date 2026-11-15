# -*- coding: utf-8 -*-
"""
Unit tests cho phân hệ Tự Động Phân Hàng Đợi Trực Hotline 3CX (Task 2):
- Member Seed 7 nhân sự mặc định và tính idempotent
- Member CRUD (thêm, sửa, toggle active, xóa)
- Config masking & .env fallback password
- resolve_shift_plan:
  + Ca sáng ngày thường (parallel ring, không skill group)
  + Ca chiều ngày thường (skill group 1, 2, ...)
  + Cuối tuần T7-CN (auto swap ca sáng -> ca chiều)
  + Cuối tuần có ghi đè ca chiều (weekend_evening_override)
  + Ngày lễ / Ngày thường đặt shift_mode='WEEKEND'
  + Không có line -> should_skip=True
- Week & Month Bulk Helpers (get_week_schedules, clone_previous_week_schedules, apply_week_template_to_month)
"""

import ast
from datetime import date
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base
from app.models.hotline_3cx_auto import (
    Hotline3cxConfig,
    Hotline3cxMember,
    Hotline3cxSchedule,
    Hotline3cxSyncLog,
)
from app.schemas.hotline_3cx_auto import (
    Hotline3cxConfigOut,
    Hotline3cxConfigUpdate,
    HotlineMemberCreate,
    HotlineMemberUpdate,
    ScheduleDayUpsertItem,
)
from app.services.hotline_3cx_auto_service import (
    apply_week_template_to_month,
    clone_previous_week_schedules,
    create_member,
    delete_member,
    ensure_seeded_data,
    get_or_create_config,
    get_public_config,
    get_runtime_credentials,
    get_week_monday,
    get_week_schedules,
    has_successful_sync,
    list_members,
    list_sync_logs,
    resolve_shift_plan,
    run_shift_sync,
    update_config,
    update_member,
    upsert_schedules,
)


@pytest.fixture
def db_session():
    """Tạo database SQLite in-memory dùng riêng cho từng test case."""
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
        yield session


def test_seed_default_members_idempotent(db_session: Session):
    """
    1. calling ensure_seeded_data(db) inserts the exact 7 members once;
       calling again does not duplicate;
       after deleting/editing a member, re-running ensure_seeded_data does NOT resurrect the deleted member if count > 0.
    """
    # Lần 1: Chèn 7 nhân sự mặc định
    ensure_seeded_data(db_session)
    members = list_members(db_session)
    assert len(members) == 7

    expected_exts = ["8775", "8778", "8776", "8772", "8779", "8741", "8740"]
    actual_exts = [m.ext_line for m in members]
    assert actual_exts == expected_exts

    # Lần 2: Gọi lại không làm trùng lặp
    ensure_seeded_data(db_session)
    members_again = list_members(db_session)
    assert len(members_again) == 7

    # Xóa 1 nhân sự (ví dụ line 8740)
    member_8740 = next(m for m in members_again if m.ext_line == "8740")
    deleted = delete_member(db_session, member_8740.id)
    assert deleted is True
    assert len(list_members(db_session)) == 6

    # Gọi lại ensure_seeded_data: vì count > 0 nên không hồi sinh lại người đã xóa
    ensure_seeded_data(db_session)
    assert len(list_members(db_session)) == 6


def test_member_crud_add_edit_delete(db_session: Session):
    """
    2. Member CRUD: add '8799', edit full_name & department, toggle active, delete.
    """
    # Add 8799
    new_mem = create_member(
        db_session,
        HotlineMemberCreate(
            ext_line="8799",
            full_name="NGUYEN VAN TESTING",
            department="HCM IT DEPT",
            is_active=True,
            sort_order=99,
        ),
    )
    assert new_mem.id is not None
    assert new_mem.ext_line == "8799"
    assert new_mem.full_name == "NGUYEN VAN TESTING"

    # Edit full_name & department
    updated = update_member(
        db_session,
        new_mem.id,
        HotlineMemberUpdate(
            full_name="NGUYEN VAN TESTING PRO",
            department="HCM ITS",
        ),
    )
    assert updated is not None
    assert updated.full_name == "NGUYEN VAN TESTING PRO"
    assert updated.department == "HCM ITS"
    assert updated.is_active is True

    # Toggle active
    deactivated = update_member(
        db_session,
        new_mem.id,
        HotlineMemberUpdate(is_active=False),
    )
    assert deactivated is not None
    assert deactivated.is_active is False

    # List active only should exclude deactivated
    active_mems = list_members(db_session, active_only=True)
    assert not any(m.ext_line == "8799" for m in active_mems)

    # Delete
    deleted = delete_member(db_session, new_mem.id)
    assert deleted is True
    all_mems = list_members(db_session)
    assert not any(m.ext_line == "8799" for m in all_mems)


def test_config_masks_password_and_reads_env_fallback(db_session: Session, monkeypatch):
    """
    3. get_public_config(db) returns has_password=True/False and NEVER contains raw or encoded password keys;
       get_runtime_credentials(db) falls back to settings.HOTLINE_3CX_PASSWORD when config.password_enc == "",
       and prefers saved password_enc once updated via update_config.
    """
    # Đảm bảo có config mặc định với password_enc rỗng
    monkeypatch.setattr(settings, "HOTLINE_3CX_PASSWORD", "")
    ensure_seeded_data(db_session)

    cfg = get_or_create_config(db_session)
    cfg.password_enc = ""
    db_session.commit()

    # Case 3.1: Không có mật khẩu trong DB lẫn .env
    pub_cfg = get_public_config(db_session)
    assert isinstance(pub_cfg, Hotline3cxConfigOut)
    assert pub_cfg.has_password is False
    pub_dump = pub_cfg.model_dump()
    assert "password_enc" not in pub_dump
    assert "password" not in pub_dump

    # Case 3.2: Có mật khẩu fallback từ settings .env
    monkeypatch.setattr(settings, "HOTLINE_3CX_PASSWORD", "test_env_dummy_password")
    pub_cfg_env = get_public_config(db_session)
    assert pub_cfg_env.has_password is True

    creds_env = get_runtime_credentials(db_session)
    assert creds_env.password == "test_env_dummy_password"
    assert creds_env["password"] == "test_env_dummy_password"

    # Case 3.3: Cập nhật mật khẩu riêng trong DB qua update_config
    update_config(
        db_session,
        Hotline3cxConfigUpdate(password="test_db_saved_password"),
    )
    pub_cfg_db = get_public_config(db_session)
    assert pub_cfg_db.has_password is True

    # Phải ưu tiên mật khẩu trong DB so với .env fallback
    creds_db = get_runtime_credentials(db_session)
    assert creds_db.password == "test_db_saved_password"

    # Raw password không bao giờ bị lộ trong public dump
    pub_dump_after = get_public_config(db_session).model_dump()
    assert "password_enc" not in pub_dump_after
    assert "password" not in pub_dump_after


def test_resolve_shift_plan_weekday_morning_parallel():
    """
    4. Monday (2026-11-16) + MORNING -> Queue 'IT HCM App Day', use_skill_group=False,
       lines ['8775', '8778', '8776'], each skill_group=None.
    """
    duty_date = date(2026, 11, 16)  # Thứ Hai
    config = Hotline3cxConfig(
        day_queue_name="IT HCM App Day",
        night_queue_name="IT HCM App Night",
    )
    schedule = Hotline3cxSchedule(
        duty_date=duty_date,
        shift_mode="AUTO",
        morning_lines_json='["8775", "8778", "8776"]',
        evening_lines_json='["8775", "8778"]',
    )

    plan = resolve_shift_plan(duty_date, "MORNING", schedule, config)
    assert plan.should_skip is False
    assert plan.effective_mode == "WEEKDAY"
    assert plan.queue_name == "IT HCM App Day"
    assert plan.use_skill_group is False
    assert [e.ext_line for e in plan.entries] == ["8775", "8778", "8776"]
    assert all(e.skill_group is None for e in plan.entries)


def test_resolve_shift_plan_weekday_evening_skill_groups():
    """
    5. Monday (2026-11-16) + EVENING -> Queue 'IT HCM App Night', use_skill_group=True,
       index 0 gets skill_group='1', index 1 gets skill_group='2'.
    """
    duty_date = date(2026, 11, 16)  # Thứ Hai
    config = Hotline3cxConfig(
        day_queue_name="IT HCM App Day",
        night_queue_name="IT HCM App Night",
    )
    schedule = Hotline3cxSchedule(
        duty_date=duty_date,
        shift_mode="AUTO",
        morning_lines_json='["8775", "8778", "8776"]',
        evening_lines_json='["8775", "8778"]',
    )

    plan = resolve_shift_plan(duty_date, "EVENING", schedule, config)
    assert plan.should_skip is False
    assert plan.effective_mode == "WEEKDAY"
    assert plan.queue_name == "IT HCM App Night"
    assert plan.use_skill_group is True
    assert [(e.ext_line, e.skill_group) for e in plan.entries] == [
        ("8775", "1"),
        ("8778", "2"),
    ]


def test_resolve_shift_plan_weekend_saturday_auto_swap():
    """
    6. Saturday (2026-11-21) with weekend_lines=['8775', '8778'] and empty override:
       - MORNING -> Queue 'IT HCM App Night', [('8775', '1'), ('8778', '2')]
       - EVENING -> Queue 'IT HCM App Night', auto-swapped [('8778', '1'), ('8775', '2')]!
    """
    duty_date = date(2026, 11, 21)  # Thứ Bảy
    config = Hotline3cxConfig(
        day_queue_name="IT HCM App Day",
        night_queue_name="IT HCM App Night",
    )
    schedule = Hotline3cxSchedule(
        duty_date=duty_date,
        shift_mode="AUTO",
        weekend_lines_json='["8775", "8778"]',
        weekend_evening_override_json="[]",
    )

    # Ca sáng T7
    plan_morning = resolve_shift_plan(duty_date, "MORNING", schedule, config)
    assert plan_morning.should_skip is False
    assert plan_morning.effective_mode == "WEEKEND"
    assert plan_morning.queue_name == "IT HCM App Night"
    assert plan_morning.use_skill_group is True
    assert [(e.ext_line, e.skill_group) for e in plan_morning.entries] == [
        ("8775", "1"),
        ("8778", "2"),
    ]

    # Ca chiều T7: tự động đảo ngược 2 nhân sự đầu tiên
    plan_evening = resolve_shift_plan(duty_date, "EVENING", schedule, config)
    assert plan_evening.should_skip is False
    assert plan_evening.effective_mode == "WEEKEND"
    assert plan_evening.queue_name == "IT HCM App Night"
    assert plan_evening.use_skill_group is True
    assert [(e.ext_line, e.skill_group) for e in plan_evening.entries] == [
        ("8778", "1"),
        ("8775", "2"),
    ]


def test_resolve_shift_plan_weekend_with_explicit_override():
    """
    7. Saturday with weekend_evening_override=['8740', '8741'] -> EVENING applies [('8740', '1'), ('8741', '2')].
    """
    duty_date = date(2026, 11, 21)  # Thứ Bảy
    config = Hotline3cxConfig(
        day_queue_name="IT HCM App Day",
        night_queue_name="IT HCM App Night",
    )
    schedule = Hotline3cxSchedule(
        duty_date=duty_date,
        shift_mode="AUTO",
        weekend_lines_json='["8775", "8778"]',
        weekend_evening_override_json='["8740", "8741"]',
    )

    plan_evening = resolve_shift_plan(duty_date, "EVENING", schedule, config)
    assert plan_evening.should_skip is False
    assert [(e.ext_line, e.skill_group) for e in plan_evening.entries] == [
        ("8740", "1"),
        ("8741", "2"),
    ]


def test_resolve_shift_plan_weekday_holiday_mode_weekend():
    """
    8. Wednesday (2026-11-18) with shift_mode='WEEKEND' and weekend_lines=['8772', '8779']
       -> both MORNING and EVENING target 'IT HCM App Night' with [('8772', '1'), ('8779', '2')]
       then [('8779', '1'), ('8772', '2')] (never Day Queue!).
    """
    duty_date = date(2026, 11, 18)  # Thứ Tư ngày lễ
    config = Hotline3cxConfig(
        day_queue_name="IT HCM App Day",
        night_queue_name="IT HCM App Night",
    )
    schedule = Hotline3cxSchedule(
        duty_date=duty_date,
        shift_mode="WEEKEND",  # Chế độ ngày lễ trực theo format cuối tuần
        weekend_lines_json='["8772", "8779"]',
        weekend_evening_override_json="[]",
    )

    plan_morning = resolve_shift_plan(duty_date, "MORNING", schedule, config)
    assert plan_morning.should_skip is False
    assert plan_morning.effective_mode == "WEEKEND"
    assert plan_morning.queue_name == "IT HCM App Night"
    assert [(e.ext_line, e.skill_group) for e in plan_morning.entries] == [
        ("8772", "1"),
        ("8779", "2"),
    ]

    plan_evening = resolve_shift_plan(duty_date, "EVENING", schedule, config)
    assert plan_evening.should_skip is False
    assert plan_evening.effective_mode == "WEEKEND"
    assert plan_evening.queue_name == "IT HCM App Night"
    assert [(e.ext_line, e.skill_group) for e in plan_evening.entries] == [
        ("8779", "1"),
        ("8772", "2"),
    ]


def test_resolve_shift_plan_empty_returns_should_skip():
    """
    9. no lines configured -> plan.should_skip is True, len(plan.entries) == 0, skip_reason non-empty.
    """
    duty_date = date(2026, 11, 16)
    config = Hotline3cxConfig()

    # Case 9.1: schedule_row là None
    plan_none = resolve_shift_plan(duty_date, "MORNING", None, config)
    assert plan_none.should_skip is True
    assert len(plan_none.entries) == 0
    assert plan_none.skip_reason is not None
    assert len(plan_none.skip_reason) > 0

    # Case 9.2: schedule_row có nhưng mảng rỗng
    empty_sched = Hotline3cxSchedule(
        duty_date=duty_date,
        shift_mode="AUTO",
        morning_lines_json="[]",
        evening_lines_json="[]",
        weekend_lines_json="[]",
    )
    plan_empty = resolve_shift_plan(duty_date, "MORNING", empty_sched, config)
    assert plan_empty.should_skip is True
    assert len(plan_empty.entries) == 0
    assert plan_empty.skip_reason is not None


def test_week_and_month_bulk_helpers(db_session: Session):
    """
    10. generating 7 default days Mon-Sun for a week (get_week_schedules),
        clone_previous_week_schedules, and apply_week_template_to_month.
    """
    anchor = date(2026, 11, 18)  # Thứ Tư
    monday = get_week_monday(anchor)
    assert monday == date(2026, 11, 16)

    # 10.1 get_week_schedules tự động sinh đủ 7 ngày kể cả khi chưa có trong DB
    week_grid = get_week_schedules(db_session, anchor)
    assert len(week_grid) == 7
    assert week_grid[0].duty_date == date(2026, 11, 16)
    assert week_grid[0].weekday_label == "Thứ Hai"
    assert week_grid[0].effective_mode == "WEEKDAY"
    assert week_grid[5].duty_date == date(2026, 11, 21)
    assert week_grid[5].weekday_label == "Thứ Bảy"
    assert week_grid[5].effective_mode == "WEEKEND"

    # 10.2 Lưu lịch tuần 1 qua upsert_schedules
    upsert_items = [
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 16),
            shift_mode="WEEKDAY",
            morning_lines=["8775", "8778", "8776"],
            evening_lines=["8775", "8778"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 21),
            shift_mode="WEEKEND",
            weekend_lines=["8772", "8779"],
            weekend_evening_override=[],
        ),
    ]
    saved = upsert_schedules(db_session, upsert_items, updated_by="tester")
    assert len(saved) == 2

    # 10.3 clone_previous_week_schedules sang tuần kế tiếp (bắt đầu từ 2026-11-23)
    target_monday = date(2026, 11, 23)
    cloned = clone_previous_week_schedules(
        db_session,
        target_week_start=target_monday,
        updated_by="cloner",
    )
    assert len(cloned) == 7

    target_grid = get_week_schedules(db_session, target_monday)
    mon_cloned = next(d for d in target_grid if d.duty_date == target_monday)
    assert mon_cloned.morning_lines == ["8775", "8778", "8776"]
    assert mon_cloned.evening_lines == ["8775", "8778"]

    sat_cloned = next(d for d in target_grid if d.duty_date == date(2026, 11, 28))
    assert sat_cloned.weekend_lines == ["8772", "8779"]

    # 10.4 apply_week_template_to_month cho tháng 12/2026 (31 ngày)
    # Chuẩn bị template 7 ngày
    template_days = [
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 16),  # T2
            morning_lines=["8775"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 17),  # T3
            morning_lines=["8778"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 18),  # T4
            morning_lines=["8776"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 19),  # T5
            morning_lines=["8772"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 20),  # T6
            morning_lines=["8779"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 21),  # T7
            weekend_lines=["8741", "8740"],
        ),
        ScheduleDayUpsertItem(
            duty_date=date(2026, 11, 22),  # CN
            weekend_lines=["8740", "8741"],
        ),
    ]

    applied_count = apply_week_template_to_month(
        db_session,
        year=2026,
        month=12,
        template_days=template_days,
        updated_by="template_applier",
        overwrite_existing=True,
    )
    assert applied_count == 31

    # Kiểm tra ngày 2026-12-01 (Thứ Ba) áp dụng đúng template của Thứ Ba
    from app.services.hotline_3cx_auto_service import get_schedules_range

    dec_range = get_schedules_range(
        db_session, date(2026, 12, 1), date(2026, 12, 1)
    )
    assert len(dec_range) == 1
    assert dec_range[0].morning_lines == ["8778"]


# ==============================================================================
# TESTS FOR TASK 3: Playwright Automation, Retry, Empty Skip, Alert & Dedupe
# ==============================================================================


def test_run_sync_skips_when_plan_empty_never_calls_browser(db_session: Session):
    """
    1. test_run_sync_skips_when_plan_empty_never_calls_browser:
       verify sync_fn mock is NOT called (call_count == 0),
       DB logs status="SKIPPED", alert email hook called.
    """
    import asyncio
    from unittest.mock import AsyncMock

    ensure_seeded_data(db_session)
    mock_sync = AsyncMock()
    mock_alert = AsyncMock()

    duty_date = date(2026, 11, 16)  # No schedules seeded for this day -> plan.should_skip is True

    log = asyncio.run(
        run_shift_sync(
            db_session,
            duty_date=duty_date,
            shift_code="MORNING",
            triggered_by="TestRunner",
            dry_run=False,
            allow_retry=False,
            sync_fn=mock_sync,
            alert_fn=mock_alert,
        )
    )

    assert mock_sync.call_count == 0
    assert log.status == "SKIPPED"
    assert "Chưa cấu hình nhân sự trực" in (log.error_message or "")
    assert mock_alert.call_count == 1
    assert "CẢNH BÁO" in mock_alert.call_args[0][0] or "SKIPPED" in mock_alert.call_args[0][0] or "BỎ QUA" in mock_alert.call_args[0][0]


def test_run_sync_retries_twice_on_transient_error_then_succeeds(db_session: Session):
    """
    2. test_run_sync_retries_twice_on_transient_error_then_succeeds:
       inject failing sync_fn throwing TimeoutError("3CX timeout") twice then returning success dict on attempt 3;
       inject sleep_fn=async_noop; verify call_count == 3, final log status="SUCCESS", alert not sent.
    """
    import asyncio
    from unittest.mock import AsyncMock

    ensure_seeded_data(db_session)
    # Seed schedule so plan has lines
    duty_date = date(2026, 11, 16)
    upsert_schedules(
        db_session,
        [
            ScheduleDayUpsertItem(
                duty_date=duty_date,
                shift_mode="WEEKDAY",
                morning_lines=["8775", "8778"],
            )
        ],
    )

    call_count = 0

    async def mock_sync(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise TimeoutError("3CX timeout connection dropped")
        return {"status": "SUCCESS", "queue_name": "IT HCM App Day", "count": 2}

    mock_sleep = AsyncMock()
    mock_alert = AsyncMock()

    log = asyncio.run(
        run_shift_sync(
            db_session,
            duty_date=duty_date,
            shift_code="MORNING",
            triggered_by="TestRunner",
            dry_run=False,
            allow_retry=True,
            sync_fn=mock_sync,
            sleep_fn=mock_sleep,
            alert_fn=mock_alert,
        )
    )

    assert call_count == 3
    assert mock_sleep.call_count == 2
    assert log.status == "SUCCESS"
    assert log.error_message is None
    assert mock_alert.call_count == 0


def test_run_sync_fails_after_three_attempts_and_sends_alert(db_session: Session):
    """
    3. test_run_sync_fails_after_three_attempts_and_sends_alert:
       inject sync_fn failing 3 times; verify call_count == 3, log status="FAILED",
       alert email hook called once.
    """
    import asyncio
    from unittest.mock import AsyncMock

    ensure_seeded_data(db_session)
    duty_date = date(2026, 11, 16)
    upsert_schedules(
        db_session,
        [
            ScheduleDayUpsertItem(
                duty_date=duty_date,
                shift_mode="WEEKDAY",
                morning_lines=["8775", "8778"],
            )
        ],
    )

    mock_sync = AsyncMock(side_effect=TimeoutError("Permanent connection failure"))
    mock_sleep = AsyncMock()
    mock_alert = AsyncMock()

    log = asyncio.run(
        run_shift_sync(
            db_session,
            duty_date=duty_date,
            shift_code="MORNING",
            triggered_by="TestRunner",
            dry_run=False,
            allow_retry=True,
            sync_fn=mock_sync,
            sleep_fn=mock_sleep,
            alert_fn=mock_alert,
        )
    )

    assert mock_sync.call_count == 3
    assert mock_sleep.call_count == 2
    assert log.status == "FAILED"
    assert "Permanent connection failure" in (log.error_message or "")
    assert mock_alert.call_count == 1


def test_has_successful_sync_blocks_only_after_success(db_session: Session):
    """
    4. test_has_successful_sync_blocks_only_after_success:
       a FAILED or DRY_RUN log for (2026-11-16, "MORNING") returns has_successful_sync() is False;
       a non-dry-run SUCCESS log returns True.
    """
    duty_date = date(2026, 11, 16)
    shift_code = "MORNING"

    # Ban đầu chưa có log
    assert has_successful_sync(db_session, duty_date, shift_code) is False

    # Thêm FAILED log
    log_failed = Hotline3cxSyncLog(
        duty_date=duty_date,
        shift_code=shift_code,
        queue_name="IT HCM App Day",
        applied_lines_json='["8775"]',
        status="FAILED",
        is_dry_run=False,
        error_message="Timeout",
    )
    db_session.add(log_failed)
    db_session.commit()
    assert has_successful_sync(db_session, duty_date, shift_code) is False

    # Thêm DRY_RUN log (kể cả status là DRY_RUN hay SUCCESS nhưng is_dry_run=True)
    log_dry = Hotline3cxSyncLog(
        duty_date=duty_date,
        shift_code=shift_code,
        queue_name="IT HCM App Day",
        applied_lines_json='["8775"]',
        status="SUCCESS",
        is_dry_run=True,
    )
    db_session.add(log_dry)
    db_session.commit()
    assert has_successful_sync(db_session, duty_date, shift_code) is False

    # Thêm non-dry-run SUCCESS log
    log_success = Hotline3cxSyncLog(
        duty_date=duty_date,
        shift_code=shift_code,
        queue_name="IT HCM App Day",
        applied_lines_json='["8775"]',
        status="SUCCESS",
        is_dry_run=False,
    )
    db_session.add(log_success)
    db_session.commit()
    assert has_successful_sync(db_session, duty_date, shift_code) is True


def test_service_is_python310_compatible():
    """
    5. test_service_is_python310_compatible:
       AST + BOM check on backend/app/services/hotline_3cx_auto_service.py.
       Verifies zero UTF-8 BOM, valid AST, no backslash inside f-strings, no 3.11+ constructs.
    """
    service_path = Path(__file__).resolve().parent.parent / "app" / "services" / "hotline_3cx_auto_service.py"
    raw_bytes = service_path.read_bytes()

    # Cấm UTF-8 BOM
    assert not raw_bytes.startswith(b"\xef\xbb\xbf"), "Tập tin chứa UTF-8 BOM cấm!"

    source_code = raw_bytes.decode("utf-8")
    tree = ast.parse(source_code, filename=str(service_path))

    # Quét AST đảm bảo không có cú pháp 3.11+
    for node in ast.walk(tree):
        # Không dùng TryStar (except*) chỉ có từ 3.11
        assert not hasattr(ast, "TryStar") or not isinstance(node, getattr(ast, "TryStar")), "Cấm dùng except* (Python 3.11+)"
        # Không dùng TypeAlias (type X = ...) chỉ có từ 3.12
        assert not hasattr(ast, "TypeAlias") or not isinstance(node, getattr(ast, "TypeAlias")), "Cấm dùng type X = ... (Python 3.12+)"

    # Quét f-string expressions đảm bảo không có backslash
    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for part in node.values:
                if isinstance(part, ast.FormattedValue):
                    # Lấy đoạn mã tương ứng với expression
                    expr_segment = ast.get_source_segment(source_code, part.value)
                    if expr_segment:
                        assert "\\" not in expr_segment, f"Phát hiện backslash trong f-string: {expr_segment}"

