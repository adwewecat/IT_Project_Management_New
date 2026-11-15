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
    # Cấu hình mật khẩu test để bypass kiểm tra thông tin xác thực runtime
    update_config(db_session, Hotline3cxConfigUpdate(password="test_secret_password"))
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
    update_config(db_session, Hotline3cxConfigUpdate(password="test_secret_password"))
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


# ==============================================================================
# 6. TESTS CHO FASTAPI ROUTER & SCHEDULER INTEGRATION (TASK 4)
# ==============================================================================

class MockSuperUser:
    """Mock tài khoản Super Admin dùng cho unit test API."""
    id = 1
    username = "admin"
    full_name = "Super Admin"
    email = "admin@ggg.com.vn"
    quyen = 0
    phanquyen = "0"
    is_active = True
    is_super_admin = True
    roles = ["admin"]
    role_name = "Quản trị viên"


class MockRegularUser:
    """Mock tài khoản thường (không có quyền Admin/Dũng) dùng cho test phân quyền 403."""
    id = 2
    username = "regular_user"
    full_name = "Regular User"
    email = "user@ggg.com.vn"
    quyen = 2
    phanquyen = "2"
    is_active = True
    is_super_admin = False
    roles = ["user"]
    role_name = "Nhân viên"


@pytest.fixture
def api_test_db():
    """Tạo DB SQLite StaticPool cô lập trong bộ nhớ cho FastAPI TestClient."""
    from sqlalchemy.pool import StaticPool
    from sqlalchemy.orm import sessionmaker

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
        ],
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session, TestingSessionLocal
    finally:
        session.close()


def test_api_requires_super_admin_or_dung(api_test_db):
    """
    MockRegularUser nhận mã HTTP 403 khi truy cập các endpoints /members và /config.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db
    from app.api.deps import require_super_admin_or_dung

    session, TestingSessionLocal = api_test_db

    def _override_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[require_super_admin_or_dung] = lambda: MockRegularUser()

    try:
        with TestClient(app) as client:
            res_members = client.get("/api/v1/hotline-3cx-auto/members")
            assert res_members.status_code == 403

            res_config = client.get("/api/v1/hotline-3cx-auto/config")
            assert res_config.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_api_members_schedule_config_endpoints(api_test_db):
    """
    FastAPI TestClient với MockSuperUser và SQLite test session:
    - GET /api/v1/hotline-3cx-auto/members trả về 7 nhân sự mặc định đã được seed.
    - POST -> PUT -> DELETE member roundtrip.
    - GET /api/v1/hotline-3cx-auto/schedules?start_date=2026-11-16&end_date=2026-11-22 trả về 7 ngày.
    - PUT /api/v1/hotline-3cx-auto/schedules lưu thay đổi thành công.
    - GET /api/v1/hotline-3cx-auto/config trả về has_password boolean và KHÔNG để lộ password.
    - POST /api/v1/hotline-3cx-auto/dry-run kích hoạt dry-run và trả về payload log.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.database import get_db
    from app.api.deps import require_super_admin_or_dung

    session, TestingSessionLocal = api_test_db

    def _override_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[require_super_admin_or_dung] = lambda: MockSuperUser()

    try:
        with TestClient(app) as client:
            # 1. GET /members -> 7 nhân sự mặc định
            res_m = client.get("/api/v1/hotline-3cx-auto/members")
            assert res_m.status_code == 200
            members_data = res_m.json()
            assert len(members_data) == 7
            exts = [m["ext_line"] for m in members_data]
            assert "8775" in exts
            assert "8740" in exts

            # 2. Member POST -> PUT -> DELETE roundtrip
            new_mem_payload = {
                "ext_line": "8799",
                "full_name": "Nguyen Van Test",
                "department": "HCM IT DEPT",
                "is_active": True,
                "sort_order": 99,
            }
            res_create = client.post("/api/v1/hotline-3cx-auto/members", json=new_mem_payload)
            assert res_create.status_code == 200
            created_member = res_create.json()
            assert created_member["ext_line"] == "8799"
            new_id = created_member["id"]

            res_update = client.put(
                f"/api/v1/hotline-3cx-auto/members/{new_id}",
                json={"full_name": "Nguyen Van Test Updated", "is_active": False},
            )
            assert res_update.status_code == 200
            assert res_update.json()["full_name"] == "Nguyen Van Test Updated"
            assert res_update.json()["is_active"] is False

            res_delete = client.delete(f"/api/v1/hotline-3cx-auto/members/{new_id}")
            assert res_delete.status_code == 200
            assert res_delete.json().get("success") is True

            # Xác nhận đã xóa
            res_m_after = client.get("/api/v1/hotline-3cx-auto/members")
            assert len(res_m_after.json()) == 7

            # 3. GET /schedules
            res_sched = client.get(
                "/api/v1/hotline-3cx-auto/schedules?start_date=2026-11-16&end_date=2026-11-22"
            )
            assert res_sched.status_code == 200
            sched_data = res_sched.json()
            assert len(sched_data) == 7
            assert sched_data[0]["duty_date"] == "2026-11-16"
            assert sched_data[6]["duty_date"] == "2026-11-22"

            # 4. PUT /schedules
            bulk_payload = {
                "days": [
                    {
                        "duty_date": "2026-11-16",
                        "shift_mode": "AUTO",
                        "morning_lines": ["8775", "8778"],
                        "evening_lines": ["8776", "8772"],
                        "weekend_lines": [],
                        "weekend_evening_override": [],
                        "note": "Tuần kiểm thử tự động",
                    }
                ]
            }
            res_bulk = client.put("/api/v1/hotline-3cx-auto/schedules", json=bulk_payload)
            assert res_bulk.status_code == 200
            res_bulk_data = res_bulk.json()
            assert len(res_bulk_data) >= 1
            saved_item = next(d for d in res_bulk_data if d["duty_date"] == "2026-11-16")
            assert saved_item["morning_lines"] == ["8775", "8778"]
            assert saved_item["note"] == "Tuần kiểm thử tự động"

            # 5. GET /config & PUT /config (với sync sang Scheduler)
            res_cfg = client.get("/api/v1/hotline-3cx-auto/config")
            assert res_cfg.status_code == 200
            cfg_data = res_cfg.json()
            assert "has_password" in cfg_data
            assert isinstance(cfg_data["has_password"], bool)
            assert "password" not in cfg_data
            assert "password_enc" not in cfg_data

            update_cfg_payload = {
                "portal_url": "https://ggg.ringbot.co:5001/#/login",
                "morning_time": "06:15",
                "evening_time": "16:45",
                "alert_emails": "test_alert@ggg.com.vn",
            }
            res_cfg_put = client.put("/api/v1/hotline-3cx-auto/config", json=update_cfg_payload)
            assert res_cfg_put.status_code == 200
            assert res_cfg_put.json()["morning_time"] == "06:15"
            assert res_cfg_put.json()["evening_time"] == "16:45"
            assert res_cfg_put.json()["alert_emails"] == "test_alert@ggg.com.vn"

            # 6. POST /dry-run
            res_dry = client.post("/api/v1/hotline-3cx-auto/dry-run", json={})
            assert res_dry.status_code == 200
            dry_data = res_dry.json()
            assert "status" in dry_data
            assert dry_data["is_dry_run"] is True

            # 7. POST /apply-now
            res_apply = client.post("/api/v1/hotline-3cx-auto/apply-now", json={})
            assert res_apply.status_code == 200
            apply_data = res_apply.json()
            assert "status" in apply_data
            assert apply_data["is_dry_run"] is False

            # 8. POST /schedules/clone-week
            res_clone = client.post(
                "/api/v1/hotline-3cx-auto/schedules/clone-week",
                json={"target_week_start": "2026-11-23"},
            )
            assert res_clone.status_code == 200
            clone_items = res_clone.json()
            assert len(clone_items) == 7
            assert clone_items[0]["duty_date"] == "2026-11-23"

            # 9. POST /schedules/apply-month
            res_month = client.post(
                "/api/v1/hotline-3cx-auto/schedules/apply-month",
                json={
                    "year": 2026,
                    "month": 12,
                    "template_days": [
                        {
                            "duty_date": "2026-11-16",
                            "shift_mode": "WEEKDAY",
                            "morning_lines": ["8775"],
                            "evening_lines": ["8776"],
                            "weekend_lines": [],
                            "weekend_evening_override": [],
                        }
                    ],
                    "overwrite_existing": True,
                },
            )
            assert res_month.status_code == 200
            assert res_month.json()["success"] is True
            assert res_month.json()["applied_days"] >= 1

            # 10. GET /schedules (default không truyền tham số)
            res_sched_default = client.get("/api/v1/hotline-3cx-auto/schedules")
            assert res_sched_default.status_code == 200
            assert len(res_sched_default.json()) == 7

            # 11. GET /logs
            res_logs = client.get("/api/v1/hotline-3cx-auto/logs?limit=10")
            assert res_logs.status_code == 200
            logs_data = res_logs.json()
            assert isinstance(logs_data, list)
            assert len(logs_data) >= 1

    finally:
        app.dependency_overrides.clear()


def test_router_is_python310_compatible():
    """
    Kiểm tra router backend/app/api/v1/hotline_3cx_auto.py:
    Zero BOM UTF-8, AST hợp lệ, không có backslash trong f-string, không có cú pháp 3.11+.
    """
    router_path = Path(__file__).resolve().parent.parent / "app" / "api" / "v1" / "hotline_3cx_auto.py"
    if not router_path.exists():
        pytest.skip("Chưa tạo router hotline_3cx_auto.py (TDD RED)")

    raw_bytes = router_path.read_bytes()
    assert not raw_bytes.startswith(b"\xef\xbb\xbf"), "Tập tin chứa UTF-8 BOM cấm!"

    source_code = raw_bytes.decode("utf-8")
    tree = ast.parse(source_code, filename=str(router_path))

    for node in ast.walk(tree):
        assert not hasattr(ast, "TryStar") or not isinstance(node, getattr(ast, "TryStar")), "Cấm dùng except* (Python 3.11+)"
        assert not hasattr(ast, "TypeAlias") or not isinstance(node, getattr(ast, "TypeAlias")), "Cấm dùng type X = ... (Python 3.12+)"

    for node in ast.walk(tree):
        if isinstance(node, ast.JoinedStr):
            for part in node.values:
                if isinstance(part, ast.FormattedValue):
                    expr_segment = ast.get_source_segment(source_code, part.value)
                    if expr_segment:
                        assert "\\" not in expr_segment, f"Phát hiện backslash trong f-string: {expr_segment}"


def test_job_scheduler_3cx_sync_execution(monkeypatch):
    """
    Kiểm tra luồng thực thi job_auto_sync_3cx_hotline_duty qua job_scheduler_service:
    - Bỏ qua dedupe khi ca đã thành công trước đó (Hệ thống (Auto)).
    - Chạy đồng bộ khi được trigger và ghi log scheduler.
    """
    import asyncio
    from app.services.job_scheduler_service import job_scheduler_service

    assert "job_auto_sync_3cx_hotline_duty" in job_scheduler_service._jobs
    job = job_scheduler_service._jobs["job_auto_sync_3cx_hotline_duty"]
    assert job["restricted_to_dung"] is True
    sched_morning = job["schedule"].get("time") or "06:00"
    sched_evening = job["schedule"].get("time_2") or "16:29"

    # Mock SessionLocal and run_shift_sync
    mock_sync_called = []

    async def _mock_run_shift_sync(*args, **kwargs):
        mock_sync_called.append(kwargs)
        from app.models.hotline_3cx_auto import Hotline3cxSyncLog
        return Hotline3cxSyncLog(
            id=1,
            duty_date=date.today(),
            shift_code=kwargs.get("shift_code", "MORNING"),
            queue_name="IT HCM App Day",
            applied_lines_json='["8775"]',
            status="SUCCESS",
            is_dry_run=False,
            triggered_by=kwargs.get("triggered_by", "Admin"),
        )

    # 1. Test target_time mapping to MORNING vs EVENING
    import app.services.job_scheduler_service as jss_module

    class DummyDB:
        def close(self):
            pass

    monkeypatch.setattr("app.core.database.SessionLocal", lambda: DummyDB())
    monkeypatch.setattr("app.services.hotline_3cx_auto_service.has_successful_sync", lambda db, d, s: False)
    monkeypatch.setattr("app.services.hotline_3cx_auto_service.run_shift_sync", _mock_run_shift_sync)

    log1 = asyncio.run(
        job_scheduler_service.trigger_job_dry_run(
            "job_auto_sync_3cx_hotline_duty",
            triggered_by="Admin",
            target_time=sched_morning,
        )
    )
    assert log1 is not None
    assert log1.status == "success"
    assert mock_sync_called[-1]["shift_code"] == "MORNING"

    log2 = asyncio.run(
        job_scheduler_service.trigger_job_dry_run(
            "job_auto_sync_3cx_hotline_duty",
            triggered_by="Admin",
            target_time=sched_evening,
        )
    )
    assert log2 is not None
    assert log2.status == "success"
    assert mock_sync_called[-1]["shift_code"] == "EVENING"

    # 2. Test auto dedupe: when has_successful_sync returns True and triggered_by is "Hệ thống (Auto)"
    monkeypatch.setattr("app.services.hotline_3cx_auto_service.has_successful_sync", lambda db, d, s: True)
    count_before = len(mock_sync_called)
    log_auto_skip = asyncio.run(
        job_scheduler_service.trigger_job_dry_run(
            "job_auto_sync_3cx_hotline_duty",
            triggered_by="Hệ thống (Auto)",
            target_time=sched_morning,
        )
    )
    assert log_auto_skip is not None
    assert log_auto_skip.status == "success"
    assert "Bỏ qua vì ca MORNING" in log_auto_skip.message
    # run_shift_sync should NOT have been called
    assert len(mock_sync_called) == count_before


def test_mssql_boolean_queries_never_emit_is_1_or_is_0(db_session: Session):
    """Hồi quy T-SQL: mọi filter BIT trên SQL Server phải biên dịch thành = 1 / = 0, không dùng IS 1 / IS 0."""
    from sqlalchemy import select
    from sqlalchemy.dialects import mssql

    service_src = (
        Path(__file__).resolve().parent.parent / "app" / "services" / "hotline_3cx_auto_service.py"
    ).read_text(encoding="utf-8")
    tree = ast.parse(service_src)
    is_calls = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "is_"
    ]
    assert is_calls == [], f"Phát hiện lời gọi SQLAlchemy .is_(...) gây lỗi syntax MSSQL tại dòng {is_calls}"

    stmt_member = select(Hotline3cxMember).where(Hotline3cxMember.is_active == True)  # noqa: E712
    stmt_log = select(Hotline3cxSyncLog).where(Hotline3cxSyncLog.is_dry_run == False)  # noqa: E712
    sql_member = str(stmt_member.compile(dialect=mssql.dialect(), compile_kwargs={"literal_binds": True}))
    sql_log = str(stmt_log.compile(dialect=mssql.dialect(), compile_kwargs={"literal_binds": True}))
    assert "IS 1" not in sql_member.upper() and "IS 0" not in sql_log.upper()
    assert "= 1" in sql_member
    assert "= 0" in sql_log

    # Đảm bảo gọi hàm thật vẫn hoạt động bình thường
    ensure_seeded_data(db_session)
    assert len(list_members(db_session, active_only=True)) == 7
    assert has_successful_sync(db_session, date(2026, 11, 16), "MORNING") is False


def test_playwright_sync_selectors_scoped_to_queue_tabpanel():
    """Hồi quy selector 3CX: Tab Users phải scoped bên trong Edit Queue và dropdown phải scoped ng-dropdown-panel."""
    service_src = (
        Path(__file__).resolve().parent.parent / "app" / "services" / "hotline_3cx_auto_service.py"
    ).read_text(encoding="utf-8")
    tree = ast.parse(service_src)
    str_literals = [
        node.value
        for node in ast.walk(tree)
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
    ]
    assert any("a#users-link[role='tab']" in s for s in str_literals)
    assert all("a:has-text('Users')" not in s for s in str_literals)
    assert any("div.tab-pane.active[role='tabpanel']" in s for s in str_literals)
    assert any("ng-dropdown-panel .ng-option" in s for s in str_literals)
    assert any("ng-select[bindvalue='value']" in s for s in str_literals)





