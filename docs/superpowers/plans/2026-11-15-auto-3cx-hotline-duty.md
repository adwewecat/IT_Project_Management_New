# Auto 3CX Hotline Duty Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng tác vụ ngầm `job_auto_sync_3cx_hotline_duty` trong phân hệ **Tác Vụ Ngầm (Scheduler)** để quản lý danh bạ thành viên (7 người khởi tạo sẵn), lập lịch trực hotline theo Tuần (7 ngày mặc định `dd-mm-yyyy`) / Tháng / Ngày Lễ, và tự động đăng nhập `https://ggg.ringbot.co:5001/#/login` bằng Playwright để ghi đè hoàn toàn danh sách user trong 2 hàng đợi `IT HCM App Day` (06:00 T2–T6) và `IT HCM App Night` (16:29 T2–T6 & 06:00 / 16:29 T7–CN hoặc Ngày Lễ với `Skill Group` `1` Chính / `2` Phụ).

**Architecture:** Tách 4 lớp rõ ràng: (1) SQLAlchemy models & MSSQL DDL tự khởi tạo trong `backend/app/main.py` + `Script/Full_SCRIPT_SQL_TABLE.sql`; (2) Pure domain logic `resolve_shift_plan()` + CRUD service & Member seed trong `backend/app/services/hotline_3cx_auto_service.py`; (3) Playwright 3CX automation engine tái sử dụng `_setup_playwright_browsers_path`, `_create_browser_context`, `format_friendly_error` từ `ticket_batch_service.py` kèm cơ chế chống xóa trắng (`SKIPPED` khi 0 user), retry 2 lần (cách 60s), chụp PNG lưu dưới `backend/uploads/hotline_3cx/`, gửi email cảnh báo khi lỗi; (4) FastAPI router `/api/v1/hotline-3cx-auto` (bảo vệ bằng `require_super_admin_or_dung`) tích hợp vào `job_scheduler_service.py` + Modal 4 tab (`Hotline3cxDutyModal.tsx`) gắn vào card job trên `JobManagementPage.tsx`.

**Tech Stack:** Python 3.10+ (FastAPI, SQLAlchemy 2.0 MSSQL/pyodbc, Pydantic v2, Playwright async), Pytest, React 19, TypeScript (strict), Vite, Lucide React, `DateInput` / `dateFormat.ts`.

---

## Global Constraints (Bắt Buộc Tuân Thủ Cho Mọi Task)

1. **Python 3.10 Strict Compatibility (Server Production):**
   - TUYỆT ĐỐI KHÔNG đặt `\` hoặc dấu nháy trùng loại bên trong biểu thức `{...}` của f-string (PEP 701 chỉ có từ Python 3.12+, lên 3.10 sẽ crash `SyntaxError`).
   - TUYỆT ĐỐI KHÔNG dùng `datetime.UTC`, `typing.Self`, `enum.StrEnum`, `tomllib`, `except*`, hay UTF-8 BOM (`\ufeff`) trong file `.py`.
   - Sau mỗi task backend, bắt buộc chạy: `.venv\Scripts\python.exe -m compileall app` và Python 3.10 AST check.
2. **Bảo Mật Mật Khẩu & Git Hygiene:**
   - KHÔNG BAO GIỜ commit mật khẩu plaintext (`Abc0102009@`) vào bất kỳ file nào được git theo dõi.
   - Đọc `settings.HOTLINE_3CX_PASSWORD` từ `.env` (đã có trong `.gitignore`) làm fallback seed khi DB chưa lưu `password_enc`. API `GET /api/v1/hotline-3cx-auto/config` chỉ trả về `"has_password": bool`, KHÔNG trả về raw hoặc base64 password.
3. **An Toàn Tuyệt Đối Khi Tự Động Hóa 3CX (Zero-Wipe Guard & Safe Dry-Run):**
   - Nếu `resolve_shift_plan()` trả về danh sách user rỗng (`0` line hợp lệ): trả về `SKIPPED`, ghi log + gửi mail cảnh báo — TUYỆT ĐỐI KHÔNG vào 3CX xóa trắng danh sách Queue hiện tại.
   - Khi danh sách user hợp lệ (`>= 1` line): **xóa 100% toàn bộ user cũ/mặc định** trong tab `Users` của Queue trước khi thêm từng user mới theo đúng thứ tự (`Day` 0006 không set Skill Group; `Night` 0007 set `Skill Group` = `1` cho Chính, `2` cho Phụ).
   - Chế độ **Chạy Thử (`dry_run=True`)**: đăng nhập `ggg.ringbot.co:5001`, vào `Admin -> Call Handling -> Edit Queue -> Users`, kiểm tra trạng thái hiện tại + xác nhận toàn bộ line mục tiêu tìm thấy trong dropdown `+ Add User`, chụp ảnh PNG bằng chứng nhưng **KHÔNG XÓA USER VÀ KHÔNG BẤM SAVE** trên 3CX.
4. **Cập Nhật Schema SQL Server (`AGENTS.md` Rule 2.4):**
   - Bổ sung tạo 4 bảng mới (`HOTLINE_3CX_MEMBERS`, `HOTLINE_3CX_SCHEDULES`, `HOTLINE_3CX_SYNC_LOGS`, `HOTLINE_3CX_CONFIG`) bằng cả `Base.metadata.create_all(...)` và `IF OBJECT_ID(...)` T-SQL phòng vệ trong `backend/app/main.py` (`lifespan`).
   - Nối DDL T-SQL chuẩn vào cuối `Script/Full_SCRIPT_SQL_TABLE.sql` và chạy kiểm tra tạo bảng thực tế trên SQL Server DB đang kết nối (và đồng bộ sang server `.25` nếu cần).
5. **Frontend Strict TypeScript & UX Chuẩn Hệ Thống:**
   - Zero lỗi/warning `TS6133` (biến/import thừa), 100% nhãn/thông báo tiếng Việt.
   - Hiển thị ngày chuẩn Việt Nam `dd-mm-yyyy` qua `utils/dateFormat.ts` & `components/ui/DateInput.tsx` trong khi state/API vẫn dùng ISO `YYYY-MM-DD`.
   - Modal dùng `components/ui/Modal.tsx` (LIFO `Esc`/`X`), vùng bảng dùng `flex: 1, minHeight: 0, overflowY: 'auto'` + sticky table header.
   - Mỗi lần sửa Frontend phải chạy `cmd /c "npm run build"` tại `frontend/` đạt `exit code 0` để cập nhật sẵn `frontend/dist/`.

---

## Review Focus (Điểm Trọng Tâm Cần Soát Khi Thực Thi)

1. **Exact Selectors Trên 3CX Live (`https://ggg.ringbot.co:5001/#/login`):** Giao diện 3CX Web Client / Admin Console là Angular SPA. Trước khi hoàn thiện hàm `sync_3cx_queue_users()` trong Task 3, bắt buộc dùng Playwright chạy 1 bước **Read-Only DOM Probe** (đăng nhập `8740`, mở `Admin -> Call Handling -> Edit Queue 0006 & 0007 -> Users`, đọc chính xác DOM/ARIA/CSS selectors, **TUYỆT ĐỐI không bấm xóa hay Save**).
2. **Tách Biệt Ca `06:00` (`MORNING`) và `16:29` (`EVENING`) Trong Scheduler Worker:** Trong `backend/app/services/job_scheduler_service.py`, `job_schedule_worker` trước đây lưu `last_executed[job_id]` và gọi `trigger_job_dry_run(job_id, triggered_by="Hệ thống (Auto)")` không kèm `target_time`. Cần chuyển key dedupe thành `f"{job_id}@{current_time}"` và truyền `target_time=current_time` vào `trigger_job_dry_run` để nhận diện chính xác `06:00` (`MORNING`) vs `16:29` (`EVENING`), đồng thời kiểm tra DB `HOTLINE_3CX_SYNC_LOGS` chỉ chặn chạy trùng nếu `(duty_date, shift_code)` đã có bản ghi `status == 'SUCCESS'` (cho phép chạy lại nếu lần trước `FAILED`).
3. **Logic Đảo Chính/Phụ Cuối Tuần & Ngày Lễ:** Mon–Fri với `shift_mode == 'WEEKEND'` phải hành xử y hệt T7–CN (bỏ qua Queue Day `0006`, `06:00` áp `[Chính(1), Phụ(2)]` vào Queue Night `0007`, `16:29` tự động đảo `[Phụ(1), Chính(2)]` vào Queue Night `0007` trừ khi `weekend_evening_override` có danh sách line riêng).
4. **Tính Đầy Đủ 7 Thành Viên Khởi Tạo & Sao Chép Lịch Nhanh:** Danh sách 7 thành viên mặc định (`8775`, `8778`, `8776`, `8772`, `8779`, `8741`, `8740`) chỉ seed tự động khi bảng `HOTLINE_3CX_MEMBERS` rỗng (0 dòng) để không ghi đè chỉnh sửa/xóa sau này của admin.

---

### Task 1: SQL Server Models, `HOTLINE_3CX_PASSWORD` Setting, Lifespan DDL & `Full_SCRIPT_SQL_TABLE.sql`

**Files:**
- Create: `backend/app/models/hotline_3cx_auto.py`
- Modify: `backend/app/core/config.py:64-68`
- Modify: `backend/app/main.py:100-125` and `backend/app/main.py:315-325`
- Modify: `Script/Full_SCRIPT_SQL_TABLE.sql:1975-1979`
- Test: `backend/tests/test_hotline_3cx_models.py`

- [ ] **Step 1: Write failing tests for SQLAlchemy models, Settings fallback, and Python 3.10 AST compatibility**

Create `backend/tests/test_hotline_3cx_models.py`:
```python
import ast
import os
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_models.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.hotline_3cx_auto'`.

- [ ] **Step 3: Create `backend/app/models/hotline_3cx_auto.py`**

Implement the 4 SQLAlchemy models matching `app.core.database.Base` conventions:
- `Hotline3cxMember` (`HOTLINE_3CX_MEMBERS`):
  - `id` (`Integer`, PK, autoincrement)
  - `ext_line` (`Unicode(20)`, unique, not null, index)
  - `full_name` (`Unicode(200)`, not null)
  - `department` (`Unicode(100)`, nullable, default `""`)
  - `is_active` (`Boolean`, default `True`, not null)
  - `sort_order` (`Integer`, default `0`, not null)
  - `created_at` (`DateTime`, default `datetime.now`)
  - `updated_at` (`DateTime`, default `datetime.now`, onupdate `datetime.now`)
- `Hotline3cxSchedule` (`HOTLINE_3CX_SCHEDULES`):
  - `id` (`Integer`, PK, autoincrement)
  - `duty_date` (`Date`, unique, not null, index)
  - `shift_mode` (`Unicode(20)`, default `"AUTO"`, not null) — `"AUTO"` | `"WEEKDAY"` | `"WEEKEND"`
  - `morning_lines_json` (`UnicodeText`, default `"[]"`, not null)
  - `evening_lines_json` (`UnicodeText`, default `"[]"`, not null)
  - `weekend_lines_json` (`UnicodeText`, default `"[]"`, not null)
  - `weekend_evening_override_json` (`UnicodeText`, default `"[]"`, not null)
  - `note` (`Unicode(500)`, nullable)
  - `updated_by` (`Unicode(100)`, nullable)
  - `updated_at` (`DateTime`, default `datetime.now`, onupdate `datetime.now`)
- `Hotline3cxSyncLog` (`HOTLINE_3CX_SYNC_LOGS`):
  - `id` (`Integer`, PK, autoincrement)
  - `duty_date` (`Date`, not null, index)
  - `shift_code` (`Unicode(20)`, not null) — `"MORNING"` | `"EVENING"`
  - `queue_name` (`Unicode(150)`, not null)
  - `applied_lines_json` (`UnicodeText`, default `"[]"`, not null)
  - `status` (`Unicode(20)`, not null) — `"SUCCESS"` | `"FAILED"` | `"SKIPPED"` | `"DRY_RUN"`
  - `is_dry_run` (`Boolean`, default `False`, not null)
  - `triggered_by` (`Unicode(100)`, nullable)
  - `error_message` (`UnicodeText`, nullable)
  - `screenshot_path` (`Unicode(500)`, nullable)
  - `started_at` (`DateTime`, default `datetime.now`, not null)
  - `finished_at` (`DateTime`, nullable)
- `Hotline3cxConfig` (`HOTLINE_3CX_CONFIG`):
  - `id` (`Integer`, PK) — singleton `id=1`
  - `portal_url` (`Unicode(500)`, default `"https://ggg.ringbot.co:5001/#/login"`, not null)
  - `username` (`Unicode(100)`, default `"8740"`, not null)
  - `password_enc` (`Unicode(500)`, default `""`, not null)
  - `day_queue_name` (`Unicode(150)`, default `"IT HCM App Day"`, not null)
  - `night_queue_name` (`Unicode(150)`, default `"IT HCM App Night"`, not null)
  - `morning_time` (`Unicode(10)`, default `"06:00"`, not null)
  - `evening_time` (`Unicode(10)`, default `"16:29"`, not null)
  - `alert_emails` (`Unicode(1000)`, default `"dung.nguyenanh@ggg.com.vn"`, not null)
  - `updated_at` (`DateTime`, default `datetime.now`, onupdate `datetime.now`)

Note on Python 3.10: Use `from datetime import datetime` (`datetime.now`), zero f-string backslashes, zero BOM.

- [ ] **Step 4: Add `HOTLINE_3CX_PASSWORD` in `backend/app/core/config.py`, wire lifespan DDL in `backend/app/main.py`, and append T-SQL DDL to `Script/Full_SCRIPT_SQL_TABLE.sql`**

1. In `backend/app/core/config.py` (after line 67 `DB_BACKUP_ZIP_PASSWORD`):
```python
    # 3CX Hotline Auto Scheduler (Fallback password từ .env nếu chưa lưu trong HOTLINE_3CX_CONFIG)
    HOTLINE_3CX_PASSWORD: str = ""
```
2. In `backend/app/main.py`:
   - Import `Hotline3cxMember, Hotline3cxSchedule, Hotline3cxSyncLog, Hotline3cxConfig` around line 102 and include their `.__table__` inside `Base.metadata.create_all(engine, tables=[...], checkfirst=True)`.
   - Add an idempotent `IF OBJECT_ID(...)` T-SQL block right after line 319 (`_tc.commit()` for `GPMS_REGION_CONFIG`) creating `dbo.HOTLINE_3CX_MEMBERS`, `dbo.HOTLINE_3CX_SCHEDULES`, `dbo.HOTLINE_3CX_SYNC_LOGS`, `dbo.HOTLINE_3CX_CONFIG` + indexes `IX_HOTLINE_3CX_SCHEDULES_DATE`, `IX_HOTLINE_3CX_SYNC_LOGS_DATE_SHIFT`.
3. Append identical T-SQL DDL (`GO`-delimited) to the end of `Script/Full_SCRIPT_SQL_TABLE.sql` after line 1979.
4. Run SQL DDL creation check against the configured SQL Server (and `.25` if reachable) during `lifespan` / standalone script test.

- [ ] **Step 5: Run tests & Python 3.10 compileall**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_models.py -v
.\.venv\Scripts\python.exe -m compileall app
```
Expected: All 3 tests in `test_hotline_3cx_models.py` PASS, `compileall` exits `0`.

- [ ] **Step 6: Commit Task 1**

```powershell
git add backend/app/models/hotline_3cx_auto.py backend/app/core/config.py backend/app/main.py Script/Full_SCRIPT_SQL_TABLE.sql backend/tests/test_hotline_3cx_models.py
git commit -m "feat(3cx-hotline): add SQLAlchemy models, config fallback, and MSSQL DDL"
```

---

### Task 2: Schemas, Member Seed (7 Nhân Sự), Grid Helpers & Pure `resolve_shift_plan` Domain Logic

**Files:**
- Create: `backend/app/schemas/hotline_3cx_auto.py`
- Create: `backend/app/services/hotline_3cx_auto_service.py` (Part 1: Config/Password, Member CRUD + Seed, Schedule CRUD + Week/Month Grid + `resolve_shift_plan`)
- Create: `backend/tests/test_hotline_3cx_auto.py`

- [ ] **Step 1: Write failing unit tests for Member Seed, Week/Month Grid, Password Masking & `resolve_shift_plan`**

Create `backend/tests/test_hotline_3cx_auto.py` using an in-memory SQLite SQLAlchemy session (`sqlite:///:memory:` with `Base.metadata.create_all` for the 4 hotline tables) covering:
1. `test_seed_default_members_idempotent`: calling `ensure_seeded_data(db)` inserts the exact 7 members (`8775` HUNG PHAM TRAN MANH / HCM IT DEPT, `8778` DUY NGO NHUT / HCM IT DEPT, `8776` NGUYEN VU MINH THUC / HCM IT DEPT, `8772` NGUYEN VI TRAM / HCM ITS, `8779` LUC LE HOANG / HCM ITS, `8741` QUYEN TO THI / HCM IT DEPT, `8740` DUNG NGUYEN ANH / HCM IT DEPT) once; calling again does not duplicate; after deleting/editing a member, re-running `ensure_seeded_data` does NOT resurrect the deleted member if `count > 0`.
2. `test_member_crud_add_edit_delete`: add `"8799"`, edit full_name & department, toggle active, delete.
3. `test_config_masks_password_and_reads_env_fallback`: `get_public_config(db)` returns `has_password=True/False` and NEVER contains raw or encoded password keys; `get_runtime_credentials(db)` falls back to `settings.HOTLINE_3CX_PASSWORD` when `config.password_enc == ""`, and prefers saved `password_enc` once updated via `update_config`.
4. `test_resolve_shift_plan_weekday_morning_parallel`: Monday (`2026-11-16`) + `MORNING` -> Queue `IT HCM App Day`, `use_skill_group=False`, lines `["8775", "8778", "8776"]`, each `skill_group=None`.
5. `test_resolve_shift_plan_weekday_evening_skill_groups`: Monday (`2026-11-16`) + `EVENING` -> Queue `IT HCM App Night`, `use_skill_group=True`, index 0 gets `skill_group="1"`, index 1 gets `skill_group="2"`.
6. `test_resolve_shift_plan_weekend_saturday_auto_swap`: Saturday (`2026-11-21`) with `weekend_lines=["8775", "8778"]` and empty override:
   - `MORNING` -> Queue `IT HCM App Night`, `[("8775", "1"), ("8778", "2")]`
   - `EVENING` -> Queue `IT HCM App Night`, auto-swapped `[("8778", "1"), ("8775", "2")]`!
7. `test_resolve_shift_plan_weekend_with_explicit_override`: Saturday with `weekend_evening_override=["8740", "8741"]` -> `EVENING` applies `[("8740", "1"), ("8741", "2")]`.
8. `test_resolve_shift_plan_weekday_holiday_mode_weekend`: Wednesday (`2026-11-18`) with `shift_mode="WEEKEND"` and `weekend_lines=["8772", "8779"]` -> both `MORNING` and `EVENING` target `IT HCM App Night` with `[("8772", "1"), ("8779", "2")]` then `[("8779", "1"), ("8772", "2")]` (never Day Queue!).
9. `test_resolve_shift_plan_empty_returns_should_skip`: no lines configured -> `plan.should_skip is True`, `len(plan.entries) == 0`, `skip_reason` non-empty.
10. `test_week_and_month_bulk_helpers`: generating 7 default days Mon–Sun for a week (`get_week_schedules`), `clone_previous_week_schedules`, and `apply_week_template_to_month`.

- [ ] **Step 2: Run test to verify it fails**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_auto.py -v
```
Expected: FAIL (`ModuleNotFoundError: No module named 'app.services.hotline_3cx_auto_service'`).

- [ ] **Step 3: Create `backend/app/schemas/hotline_3cx_auto.py`**

Define clean Pydantic v2 schemas:
- `HotlineMemberBase`, `HotlineMemberCreate`, `HotlineMemberUpdate`, `HotlineMemberOut`
- `ShiftMode = Literal["AUTO", "WEEKDAY", "WEEKEND"]`
- `ShiftCode = Literal["MORNING", "EVENING"]`
- `ScheduleDayItem` / `ScheduleDayUpsertItem` (fields: `duty_date: date`, `shift_mode`, `morning_lines: List[str]`, `evening_lines: List[str]`, `weekend_lines: List[str]`, `weekend_evening_override: List[str]`, `note: Optional[str]`, plus computed display fields `weekday_label: str`, `effective_mode: str`, `is_weekend: bool`)
- `ScheduleBulkSaveRequest` (`days: List[ScheduleDayUpsertItem]`)
- `CloneWeekRequest` (`target_week_start: date`)
- `ApplyMonthTemplateRequest` (`year: int`, `month: int`, `template_days: List[ScheduleDayUpsertItem]`, `overwrite_existing: bool = True`)
- `Hotline3cxConfigOut` (`portal_url`, `username`, `has_password: bool`, `day_queue_name`, `night_queue_name`, `morning_time`, `evening_time`, `alert_emails`, `updated_at`) — NEVER exposes `password_enc` or raw password!
- `Hotline3cxConfigUpdate` (optional `password: Optional[str] = None`; only overwrites `password_enc` when `password` is non-empty!)
- `ApplyNowRequest` (`duty_date: Optional[date] = None`, `shift_code: Optional[ShiftCode] = None`, `dry_run: bool = False`)
- `ResolvedUserAssignment` (`ext_line: str`, `skill_group: Optional[str]`)
- `ResolvedShiftPlan` (`duty_date: date`, `shift_code: ShiftCode`, `effective_mode: str`, `queue_name: str`, `use_skill_group: bool`, `entries: List[ResolvedUserAssignment]`, `should_skip: bool`, `skip_reason: Optional[str]`)
- `Hotline3cxSyncLogOut` (`id`, `duty_date`, `shift_code`, `queue_name`, `applied_lines: List[dict]`, `status`, `is_dry_run`, `triggered_by`, `error_message`, `screenshot_path`, `started_at`, `finished_at`)

- [ ] **Step 4: Implement `backend/app/services/hotline_3cx_auto_service.py` (Part 1)**

Implement with clear Vietnamese comments and zero Python 3.11+ constructs:
- `DEFAULT_3CX_MEMBERS` tuple/list with the exact 7 members + `sort_order` `1..7`.
- `ensure_seeded_data(db: Session)`:
  - If `Hotline3cxConfig` (`id=1`) missing, create default config (`portal_url="https://ggg.ringbot.co:5001/#/login"`, `username="8740"`, `password_enc=_encode_password(settings.HOTLINE_3CX_PASSWORD)` if `settings.HOTLINE_3CX_PASSWORD` else `""`, `day_queue_name="IT HCM App Day"`, `night_queue_name="IT HCM App Night"`, `morning_time="06:00"`, `evening_time="16:29"`, `alert_emails="dung.nguyenanh@ggg.com.vn"`).
  - If `Hotline3cxMember` total row count is `0`, bulk insert all 7 `DEFAULT_3CX_MEMBERS`.
- Member CRUD helpers: `list_members`, `create_member`, `update_member`, `delete_member`.
- Schedule CRUD & Grid helpers:
  - `get_week_monday(anchor: date) -> date`
  - `get_schedules_range(db, start_date: date, end_date: date)` returning normalized 7+ daily entries (filling missing dates with sensible empty template rows whose `effective_mode` reflects T2–T6 vs T7–CN).
  - `upsert_schedules(db, days, updated_by)`
  - `clone_previous_week_schedules(db, target_week_start, updated_by)`
  - `apply_week_template_to_month(db, year, month, template_days, updated_by, overwrite_existing=True)` — maps each template day's `isoweekday()` (`1..7`) across all dates in `(year, month)`.
- Pure `resolve_shift_plan(duty_date: date, shift_code: str, schedule_row: Optional[Hotline3cxSchedule], config: Hotline3cxConfig, active_lines: Optional[set[str]] = None) -> ResolvedShiftPlan`:
  - Determine `effective_mode`: if `shift_mode in ("WEEKDAY", "WEEKEND")` use it; else `"WEEKEND"` if `duty_date.isoweekday() in (6, 7)` else `"WEEKDAY"`.
  - Filter configured lines: strip blanks, preserve order, deduplicate while preserving order, optionally validate against `active_lines` if needed (or keep configured lines + warn if inactive? Wait: allow explicit configured valid digit lines, deduplicated in exact order; if user edited member ext line cleanly, keep ordered list).
  - If `effective_mode == "WEEKDAY"`:
    - `MORNING`: target `config.day_queue_name` (`IT HCM App Day`), `use_skill_group=False`, `entries=[ResolvedUserAssignment(ext_line=l, skill_group=None) for l in morning_lines]`.
    - `EVENING`: target `config.night_queue_name` (`IT HCM App Night`), `use_skill_group=True`, `entries=[ResolvedUserAssignment(ext_line=l, skill_group=str(idx + 1)) for idx, l in enumerate(evening_lines[:2])]` (or `idx + 1` capped/stringified `'1'`, `'2'`, ... wait: usually 2 people primary=`1`, secondary=`2`, if >2 allow `'1'..'N'` or keep all ordered lines with `str(idx + 1)` — let's map `str(idx + 1)` for all selected evening lines cleanly!).
  - If `effective_mode == "WEEKEND"`:
    - Both `MORNING` and `EVENING` target `config.night_queue_name` (`IT HCM App Night`), `use_skill_group=True`.
    - `MORNING`: uses `weekend_lines` in order (`1`, `2`, ...).
    - `EVENING`: if `weekend_evening_override` non-empty -> uses `weekend_evening_override` (`1`, `2`, ...); else reverses/swaps first two of `weekend_lines`: `[p2, p1, *rest]` -> assigns `Skill Group` `1`, `2`, ...!
  - Empty guard: if `len(entries) == 0`, return `should_skip=True`, `skip_reason=f"Chưa cấu hình nhân sự trực cho ca {shift_code} ngày {duty_date.strftime('%d-%m-%Y')}."`.

- [ ] **Step 5: Run tests to verify GREEN**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_auto.py -v
.\.venv\Scripts\python.exe -m compileall app
```
Expected: All 10 tests in `test_hotline_3cx_auto.py` PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add backend/app/schemas/hotline_3cx_auto.py backend/app/services/hotline_3cx_auto_service.py backend/tests/test_hotline_3cx_auto.py
git commit -m "feat(3cx-hotline): add schemas, 7-member seed, grid helpers, and shift plan resolver"
```

---

### Task 3: Context7 Lookup + Read-Only 3CX DOM Probe + Playwright Sync Engine & Retry/Alert Logic

**Files:**
- Modify: `backend/app/services/hotline_3cx_auto_service.py` (Part 2: Playwright automation `execute_3cx_queue_sync()`, retry x2 60s, screenshot saving under `backend/uploads/hotline_3cx/`, duplicate `SUCCESS` guard, failure email notification)
- Modify: `backend/tests/test_hotline_3cx_auto.py`

- [ ] **Step 1: Call `context7` MCP for current Playwright Python async API docs**

Call `resolve-library-id` (`playwright`) -> `query-docs` (`playwright async locator click fill type screenshot wait_for`) to confirm current best-practice Python Playwright async locator selectors & timeout patterns per `GEMINI.md` rule.

- [ ] **Step 2: Run safe Read-Only DOM Probe against `https://ggg.ringbot.co:5001/#/login`**

Using local Python script via `.venv\Scripts\python.exe` (in scratch folder or inline, reading password from env `HOTLINE_3CX_PASSWORD` — NEVER printed or committed), launch Playwright Chromium (`ignore_https_errors=True`):
1. Open `https://ggg.ringbot.co:5001/#/login`.
2. Record exact `<input>` placeholders/names/ids on login page, log in with `8740`.
3. Click sidebar `Admin` (`admin` menu button), then click `Call Handling`.
4. Locate queue rows `0006` (`IT HCM App Day`) and `0007` (`IT HCM App Night`), open Queue `0006` -> tab `Users` -> inspect exact DOM for user rows, trash delete buttons, `+ Add User` button, searchable `User` dropdown, `Save` button; then open Queue `0007` -> tab `Users` -> inspect exact `Skill Group` dropdown DOM!
5. **HARD SAFETY STOP:** NEVER click trash delete, `+ Add User`, or `Save` during this probe! Exit browser cleanly and capture findings to inform exact resilient locators in `hotline_3cx_auto_service.py`.

- [ ] **Step 3: Write failing tests for retry (2x 60s), empty skip, failure email alert, `SUCCESS`-only dedupe, and Python 3.10 AST checks**

Append to `backend/tests/test_hotline_3cx_auto.py`:
1. `test_run_sync_skips_when_plan_empty_never_calls_browser`: verify `sync_fn` mock is NOT called (`call_count == 0`), DB logs `status="SKIPPED"`, email alert hook called.
2. `test_run_sync_retries_twice_on_transient_error_then_succeeds`: inject failing `sync_fn` throwing `TimeoutError("3CX timeout")` twice then returning success dict on attempt 3; inject `sleep_fn=async_noop`; verify `call_count == 3`, final log `status="SUCCESS"`, alert not sent.
3. `test_run_sync_fails_after_three_attempts_and_sends_alert`: inject `sync_fn` failing 3 times; verify `call_count == 3`, log `status="FAILED"`, alert email hook called once.
4. `test_has_successful_sync_blocks_only_after_success`: a `FAILED` or `DRY_RUN` log for `(2026-11-16, "MORNING")` returns `has_successful_sync() is False`; a non-dry-run `SUCCESS` log returns `True`.
5. `test_service_is_python310_compatible`: AST + BOM check on `backend/app/services/hotline_3cx_auto_service.py`.

- [ ] **Step 4: Run test to verify failures**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_auto.py -v
```
Expected: FAIL (`ImportError` / missing functions `run_shift_sync`, `has_successful_sync`).

- [ ] **Step 5: Implement Playwright automation + retry/dedupe/email alert in `backend/app/services/hotline_3cx_auto_service.py`**

Implement cleanly:
- `_create_3cx_browser_context(playwright_instance)`: reuse `_setup_playwright_browsers_path` from `app.services.ticket_batch_service`, launch headless Chromium (`msedge`/`chrome` fallback like `ticket_batch_service.py`), create fresh context with `ignore_https_errors=True`, `viewport={"width": 1440, "height": 900}` so Angular left sidebar & Queue columns never collapse into mobile drawer!
- `async def _playwright_sync_3cx_queue(portal_url, username, password, plan: ResolvedShiftPlan, dry_run: bool, screenshot_file_path: str) -> dict`:
  - Uses exact verified selectors from Step 2 Read-Only Probe.
  - Step-by-step trace messages in Vietnamese + verification checks:
    1. Navigate & login (`username`, `password`), verify dashboard/Admin button appears (raise clear `ValueError("Sai tài khoản hoặc mật khẩu 3CX")` on invalid credentials).
    2. Navigate `Admin -> Call Handling`, open queue row matching `plan.queue_name` (`IT HCM App Day` / `IT HCM App Night`).
    3. Click `Users` tab, wait for rows/empty state + screenshot helper.
    4. Capture pre-state user count/names.
    5. **If `dry_run` is True**: test opening `+ Add User` OR verifying each `entry.ext_line` exists cleanly without modifying existing rows (`Escape`/close without saving, capture PNG screenshot to `screenshot_file_path`), return `{"status": "DRY_RUN", "existing_users": [...], "verified_lines": [...]}`.
    6. **If `dry_run` is False**:
       - Loop deleting ALL visible trash icons in the `Users` table (`count()` down to `0`, safety guard max 50 deletes) so ZERO default/old users remain!
       - Assert table row count `== 0` before adding.
       - For each `(idx, assignment)` in `enumerate(plan.entries)`:
         - Click `+ Add User`
         - Type `assignment.ext_line` into the new row's searchable `User` input/dropdown, pick the option whose text starts with or contains `f"{assignment.ext_line} "` (fallback match `assignment.ext_line`).
         - If `plan.use_skill_group` and `assignment.skill_group`: select `assignment.skill_group` (`"1"` or `"2"`) in the `Skill Group` dropdown on that row.
       - Assert UI row count equals `len(plan.entries)`.
       - Click `Save` button, wait for network save / toast / button completion, capture final PNG screenshot to `screenshot_file_path`.
       - Re-open or re-read row summary and return confirmation payload.
- `async def run_shift_sync(db, duty_date=None, shift_code=None, triggered_by="Admin", dry_run=False, allow_retry=False, sync_fn=None, sleep_fn=None, alert_fn=None) -> Hotline3cxSyncLog`:
  - Determines `duty_date` (`date.today()`) and `shift_code` (`"MORNING"` if `datetime.now().hour < 12` else `"EVENING"` if omitted).
  - Resolves `plan = resolve_shift_plan(...)`.
  - If `plan.should_skip`: save `Hotline3cxSyncLog(status="SKIPPED", ...)`, trigger failure/warning email if not `dry_run` (so admin knows tonight's shift wasn't filled!), return log.
  - Resolves credentials via `get_runtime_credentials(db)`; if empty password, fail safely with clear Vietnamese error + log + alert without invoking browser.
  - Builds screenshot filename in `backend/uploads/hotline_3cx/` -> exposed cleanly via `/uploads/hotline_3cx/<filename>.png`!
  - Executes `sync_fn` (defaults to `_playwright_sync_3cx_queue`) with up to 3 attempts (`max_attempts = 3 if (allow_retry and not dry_run) else 1`, `60s` pause via `sleep_fn`) ONLY when transient timeout/network/Playwright launch/navigation errors occur (non-transient config errors like missing password fail immediately).
  - Saves `Hotline3cxSyncLog` (`SUCCESS` / `DRY_RUN` / `FAILED`), sends SMTP email alert via reused `ticket_batch_service` SMTP constants / `email_utils` when `FAILED` or `SKIPPED`.
- `has_successful_sync(db, duty_date: date, shift_code: str) -> bool`.

- [ ] **Step 6: Run tests & Python 3.10 compileall**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_auto.py -v
.\.venv\Scripts\python.exe -m compileall app
```
Expected: All tests in `test_hotline_3cx_auto.py` PASS, `compileall` exit `0`.

- [ ] **Step 7: Commit Task 3**

```powershell
git add backend/app/services/hotline_3cx_auto_service.py backend/tests/test_hotline_3cx_auto.py
git commit -m "feat(3cx-hotline): add Playwright 3CX queue sync engine with retry, zero-wipe guard, and screenshots"
```

---

### Task 4: FastAPI Endpoints (`/api/v1/hotline-3cx-auto`) & Scheduler Worker Integration

**Files:**
- Create: `backend/app/api/v1/hotline_3cx_auto.py`
- Modify: `backend/app/api/v1/router.py:38-82`
- Modify: `backend/app/services/job_scheduler_service.py:255-260`, `907-915`, `1870-1890`, `2330-2365`
- Modify: `backend/tests/test_jobs.py`
- Modify: `backend/tests/test_hotline_3cx_auto.py`

- [ ] **Step 1: Write failing API & Scheduler integration tests**

Append to `backend/tests/test_hotline_3cx_auto.py` and `backend/tests/test_jobs.py`:
1. In `test_hotline_3cx_auto.py`:
   - `test_api_requires_super_admin_or_dung`: `MockRegularUser` receives HTTP `403` on `/api/v1/hotline-3cx-auto/members` and `/config`.
   - `test_api_members_schedule_config_endpoints`: using FastAPI `TestClient` with `MockSuperUser` + overridden `get_db` pointing to SQLite test session:
     - `GET /api/v1/hotline-3cx-auto/members` returns 7 seeded members.
     - `POST` -> `PUT` -> `DELETE` member roundtrip.
     - `GET /api/v1/hotline-3cx-auto/schedules?start_date=2026-11-16&end_date=2026-11-22` returns 7 daily rows (`dd-mm-yyyy` logic tested on client, ISO `YYYY-MM-DD` over wire).
     - `PUT /api/v1/hotline-3cx-auto/schedules` persists changes.
     - `GET /api/v1/hotline-3cx-auto/config` returns `has_password` boolean and NEVER leaks raw password.
     - `POST /api/v1/hotline-3cx-auto/dry-run` invokes dry-run service and returns `log` payload.
2. In `backend/tests/test_jobs.py`:
   - `test_get_jobs` checks `"job_auto_sync_3cx_hotline_duty" in job_ids` and confirms `is_enabled` defaults cleanly without leaking credentials.

- [ ] **Step 2: Run tests to verify failure**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_auto.py tests/test_jobs.py -v
```
Expected: FAIL (endpoints 404 & job ID missing from `DEFAULT_JOBS`).

- [ ] **Step 3: Create `backend/app/api/v1/hotline_3cx_auto.py` & mount in `router.py`**

Implement `/api/v1/hotline-3cx-auto` endpoints with `Depends(require_super_admin_or_dung)` + `check_is_dung_or_super_admin(current_user)` helper (matching `jobs.py:16-20`):
- `GET /members` -> `List[HotlineMemberOut]`
- `POST /members` -> `HotlineMemberOut`
- `PUT /members/{member_id}` -> `HotlineMemberOut`
- `DELETE /members/{member_id}` -> `{"success": True}`
- `GET /schedules` (`start_date: Optional[date] = None`, `end_date: Optional[date] = None`) -> returns requested range (defaults to current Monday..Sunday 7 days) with seeded defaults
- `PUT /schedules` -> `ScheduleBulkSaveRequest` -> saves all 7 (or N) rows & returns updated items
- `POST /schedules/clone-week` -> copies `(target_week_start - 7 days .. +6 days)` onto `target_week_start .. +6 days`
- `POST /schedules/apply-month` -> repeats 7-day Mon–Sun template across specified `(year, month)`
- `GET /config` -> `Hotline3cxConfigOut` (`has_password` masked)
- `PUT /config` -> updates URL/username/queue names/times/alert emails + updates `password_enc` ONLY when `payload.password` is non-empty, AND syncs `morning_time`/`evening_time`/`alert_emails` to `job_scheduler_service` schedule (`time` / `time_2` / `email_recipients`) so Scheduler card stays 100% consistent!
- `POST /dry-run` (`ApplyNowRequest`) -> forces `dry_run=True`
- `POST /apply-now` (`ApplyNowRequest`) -> executes live queue update (`dry_run=False`, `allow_retry=False`)
- `GET /logs` (`limit: int = 50`) -> `List[Hotline3cxSyncLogOut]`

Mount `hotline_3cx_auto_router` in `backend/app/api/v1/router.py`.

- [ ] **Step 4: Register `job_auto_sync_3cx_hotline_duty` & dispatch logic in `backend/app/services/job_scheduler_service.py`**

1. Append to `DEFAULT_JOBS` (inside `dung_utility` category):
```python
    {
        "job_id": "job_auto_sync_3cx_hotline_duty",
        "job_name": "Tự Động Chỉnh Trực Hotline 3CX (IT HCM App)",
        "category": "dung_utility",
        "category_name": "Tiện Ích của Dũng",
        "description": "Tự động đăng nhập 3CX Admin Console để xóa sạch danh sách cũ và cập nhật lại User trực cho Queue IT HCM App Day (06:00 T2-T6) & Queue IT HCM App Night (16:29 T2-T6, 06:00 & 16:29 T7-CN / Ngày Lễ với Skill Group 1 Chính / 2 Phụ).",
        "source_reference": "hotline_3cx_auto_service.py: run_shift_sync",
        "has_email_notification": True,
        "email_recipients": "dung.nguyenanh@ggg.com.vn",
        "is_enabled": False,
        "restricted_to_dung": True,
        "is_hidden": False,
        "schedule": {
            "schedule_type": "daily",
            "time": "06:00",
            "time_2": "16:29",
            "interval_minutes": 60,
            "days_of_week": [1, 2, 3, 4, 5, 6, 7],
            "cron_expression": "0 6,16 * * *",
            "human_readable": "Hàng ngày lúc 06:00 & 16:29"
        }
    },
```
2. Update `trigger_job_dry_run(self, job_id: str, triggered_by: str = "Admin", target_time: Optional[str] = None)`:
   - Add `elif job_id == "job_auto_sync_3cx_hotline_duty":`:
     - Map `target_time` against `schedule.time` (`MORNING`) vs `schedule.time_2` (`EVENING`), falling back to `now.hour < 12` when `target_time` is `None`.
     - If `triggered_by == "Hệ thống (Auto)"` and `has_successful_sync(db, today, shift_code)`: skip cleanly with info log `"Bỏ qua vì ca ... đã đồng bộ thành công trước đó."` (prevent double-run across restarts without blocking retry after `FAILED`).
     - Run `run_shift_sync(db, duty_date=today, shift_code=shift_code, triggered_by=triggered_by, dry_run=False, allow_retry=(triggered_by == "Hệ thống (Auto)"))`.
     - Update `job` stats, insert `self._logs` entry, `_save_config()`, `_save_logs()`. On failure/skipped send email notification via `_send_job_execution_email` or dedicated alert helper.
3. Update `job_schedule_worker`:
   - Track `last_executed[f"{job_id}@{current_time}"]` when `sched_type in ("daily", "weekly")` so multi-slot schedules (`06:00` and `16:29`) each dedupe cleanly per minute, and pass `target_time=current_time` to `trigger_job_dry_run`!

- [ ] **Step 5: Run tests, compileall & smoke test**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_auto.py tests/test_jobs.py -v
.\.venv\Scripts\python.exe -m compileall app
.\.venv\Scripts\python.exe -c "from app.main import app; print('>>> PASSED 100%')"
```
Expected: All tests pass, `compileall` exit `0`, smoke test prints `>>> PASSED 100%`.

- [ ] **Step 6: Commit Task 4**

```powershell
git add backend/app/api/v1/hotline_3cx_auto.py backend/app/api/v1/router.py backend/app/services/job_scheduler_service.py backend/tests/test_hotline_3cx_auto.py backend/tests/test_jobs.py
git commit -m "feat(3cx-hotline): add FastAPI router and integrate 06:00/16:29 auto scheduler job"
```

---

### Task 5: Frontend Types, API Service, 4-Tab Management Modal & `JobManagementPage` Integration

**Files:**
- Create: `frontend/src/types/hotline3cxAuto.ts`
- Create: `frontend/src/services/hotline3cxAutoService.ts`
- Create: `frontend/src/components/admin/Hotline3cxDutyModal.tsx`
- Modify: `frontend/src/pages/admin/JobManagementPage.tsx:35-40`, `1495-1520`, `2887-2900`, `3100-3170`, `8965-8973`

- [ ] **Step 1: Create `frontend/src/types/hotline3cxAuto.ts` & `frontend/src/services/hotline3cxAutoService.ts`**

1. Define TypeScript interfaces matching all backend Pydantic schemas cleanly (`Hotline3cxMember`, `Hotline3cxScheduleDay`, `Hotline3cxConfig`, `Hotline3cxConfigUpdate`, `Hotline3cxSyncLog`, `ShiftCode`, `ShiftMode`, `ApplyNowRequest`).
2. Implement `hotline3cxAutoService` using `api` (`./api`) matching existing services (`unassigned3cxService.ts` style):
   - `getMembers()`, `createMember()`, `updateMember()`, `deleteMember()`
   - `getSchedules(startDate?, endDate?)`, `saveSchedules(days)`, `clonePreviousWeek(targetWeekStart)`, `applyMonthTemplate(payload)`
   - `getConfig()`, `updateConfig(payload)`
   - `dryRun(payload)`, `applyNow(payload)`
   - `getLogs(limit)`

- [ ] **Step 2: Build `frontend/src/components/admin/Hotline3cxDutyModal.tsx` (4-Tab Interactive Modal)**

Follow all project UI/UX & Date rules strictly:
- Wrap in `<Modal isOpen={isOpen} onClose={onClose} title=... maxWidth="1120px">` (inherits LIFO `Esc`/`X` closing).
- Header tab switcher (4 tabs, zero top stat cards):
  1. **Lịch Trực Tuần / Tháng**:
     - Toolbar: Week navigator (`< Tuần Trước`, `Tuần Này`, `Tuần Sau >`) + `<DateInput>` jumping directly to any week (`dd-mm-yyyy`), buttons `Sao Chép Tuần Trước -> Tuần Này`, `Áp Dụng Mẫu 7 Ngày Cho Tháng` (month selector using `mm-yyyy` or `MonthInput`), `Lưu Lịch Trực`.
     - 7-day grid (Mon -> Sun default rows) inside a dedicated internal-scroll container (`maxHeight: '52vh', overflowY: 'auto'`) with **sticky table header (`position: 'sticky', top: 0, zIndex: 10`)**:
       - Column 1: Thứ & Ngày (`Thứ 2 • 16-11-2026` formatted via `formatDateDDMMYYYY`, badge `T2-T6` / `Cuối tuần`)
       - Column 2: Chế độ ngày (`Tự động`, `Ngày thường (T2-T6)`, `Ngày Lễ / Cuối tuần (Chỉ Night)`)
       - Column 3 (Ngày thường): **Ca Sáng 06:00 (Day Queue 0006 — Song Song)** — multi-select member pill/checklist picker from active members (ordered selection badges `8775 Hùng`, `8778 Duy`... clickable to add/remove & move order!). Disabled badge `"Không chạy Day (Chỉ Night)"` when effective mode is Weekend/Holiday.
       - Column 4 (Ngày thường): **Ca Tối 16:29 (Night Queue 0007 — Chính 1 / Phụ 2)** — ordered 2-slot picker: `1 (Chính)` dropdown + `2 (Phụ)` dropdown populated from active members!
       - Column 5 (Cuối tuần / Lễ): **T7–CN / Lễ (Night 0007: 06:00 Chính-Phụ -> 16:29 Tự Đảo)**: `Chính 06:00 (Skill 1)` + `Phụ 06:00 (Skill 2)` + preview pill `16:29 tự đảo: Phụ(1) / Chính(2)` + toggle `"Tùy chỉnh ca 16:29 riêng"` if manual override needed.
     - Quick action footer inside Modal: `[Chạy Thử (Không Lưu)]`, `[Áp Dụng Ca Ngay]` (prompts inline confirmation with exact date + shift `MORNING 06:00` / `EVENING 16:29` selector), `[Lưu Toàn Bộ Lịch]`.
  2. **Thành Viên (7 Mặc Định + Thêm/Sửa)**:
     - Add member form (`Line 3CX` e.g. `8799`, `Họ Tên` e.g. `NGUYEN VAN A`, `Phòng Ban` e.g. `HCM IT DEPT`), Save button.
     - Sticky-header scrollable table listing all members with inline Edit mode (`ext_line`, `full_name`, `department`, `sort_order`), Active toggle, and Delete button.
  3. **Cấu Hình 3CX & Email**:
     - Fields: URL 3CX (`https://ggg.ringbot.co:5001/#/login`), Tài khoản (`8740`), Mật khẩu 3CX (type `password`, placeholder `Đã lưu trong hệ thống — nhập mới nếu muốn đổi` when `has_password=true`), Tên Queue Sáng (`IT HCM App Day`), Tên Queue Tối (`IT HCM App Night`), Giờ Sáng (`06:00`), Giờ Chiều (`16:29`), Email cảnh báo khi lỗi (`dung.nguyenanh@ggg.com.vn`), nút `Lưu Cấu Hình`.
  4. **Lịch Sử Thực Thi & Ảnh Chụp**:
     - Sticky-header scrollable table displaying execution logs: Thời gian (`dd-mm-yyyy HH:mm` 24h), Ngày trực (`dd-mm-yyyy`), Ca (`Sáng 06:00` / `Chiều 16:29`), Hàng đợi (`IT HCM App Day` / `Night`), User áp dụng (`8775 (1), 8778 (2)`), Trạng thái badge (`Thành công` / `Thất bại` / `Bỏ qua (Rỗng)` / `Chạy thử`), Lỗi, nút `Xem Ảnh` opening nested `<Modal>` rendering `<img src={...} />` from `/uploads/hotline_3cx/...`.

- [ ] **Step 3: Wire `job_auto_sync_3cx_hotline_duty` into `frontend/src/pages/admin/JobManagementPage.tsx`**

1. Import `Hotline3cxDutyModal` and `hotline3cxAutoService`.
2. Add state `showHotline3cxModal`, `hotline3cxInitialTab`, `runningHotline3cxAction` + handlers (`handleOpenHotline3cxModal`, `handleQuickHotline3cxDryRun`, `handleQuickHotline3cxApplyNow` updating/refreshing jobs list & toast).
3. Update line `2888`: exclude `'job_auto_sync_3cx_hotline_duty'` from the generic simulated `Chạy Thử` button.
4. Add custom card buttons block `{job.job_id === 'job_auto_sync_3cx_hotline_duty' && (...)}` matching existing `job_check_unassigned_3cx_tickets` button aesthetic:
   - `Lịch Trực & Cấu Hình 3CX` (mở Tab 1)
   - `Chạy Thử (Không Lưu)` (chạy Dry-Run ca hiện tại và mở Tab Lịch Sử xem kết quả + ảnh chụp)
   - `Áp Dụng Ca Ngay` (mở modal / xác nhận áp dụng ca sáng hoặc chiều)
   - `Lịch Sử & Ảnh` (mở thẳng Tab 4)
5. Mount `<Hotline3cxDutyModal ... />` near bottom of JSX before closing `</div>`.

- [ ] **Step 4: Build Frontend & verify ZERO TypeScript errors/TS6133**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\frontend`):
```cmd
cmd /c "npm run build"
```
Expected: `tsc` and `vite build` succeed with `exit code 0` (`✓ built in ...s`) and updated `frontend/dist/`. Fix any `TS6133` unused imports immediately if hit.

- [ ] **Step 5: Commit Task 5**

```powershell
git add frontend/src/types/hotline3cxAuto.ts frontend/src/services/hotline3cxAutoService.ts frontend/src/components/admin/Hotline3cxDutyModal.tsx frontend/src/pages/admin/JobManagementPage.tsx frontend/dist
git commit -m "feat(3cx-hotline): add 4-tab duty schedule UI modal and Scheduler card integration"
```

---

### Task 6: Live SQL Schema Sync, Full Test Suite, Playwright UI + Safe 3CX Dry-Run Verification & Docs Push

**Files:**
- Modify: `PROGRESS.md` (keep <= 10 recent entries; rotate #11+ to `ARCHIVE.md` if needed)
- Modify: `Script/README.md` (append verified feature log per `AGENTS.md` Rule 2 & 8)
- Optional local gitignored config (NEVER staged): `backend/.env` (`HOTLINE_3CX_PASSWORD=...` only if testing live Dry-Run locally)

- [ ] **Step 1: Verify SQL Server tables exist on configured DB (and check `.25` Production parity)**

Run a safe Python check (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`) triggering `Base.metadata.create_all(...)` & verifying all 4 tables (`HOTLINE_3CX_MEMBERS`, `HOTLINE_3CX_SCHEDULES`, `HOTLINE_3CX_SYNC_LOGS`, `HOTLINE_3CX_CONFIG`) + seeded 7 members exist cleanly on SQL Server without touching unrelated tables. Check Production `.25` (`ITDEPT` / `PROJECT_MANAGEMENT` parity per `AGENTS.md` Rule 2.4) safely without printing passwords.

- [ ] **Step 2: Run full Backend Verification & Python 3.10 Compatibility Audit**

Run (cwd `d:\LAPTRINH\IT_Project_Management_New\backend`):
```powershell
.\.venv\Scripts\pytest.exe tests/test_hotline_3cx_models.py tests/test_hotline_3cx_auto.py tests/test_jobs.py -v
.\.venv\Scripts\python.exe -m compileall app
.\.venv\Scripts\python.exe -c "from app.main import app; print('>>> PASSED 100%')"
```
Run full AST check scanning all modified/added `.py` files for Python 3.10 forbidden constructs (f-string backslashes, nested matching quotes, `datetime.UTC`, `StrEnum`, `Self`, BOM).
Run `.\.venv\Scripts\pytest.exe` (or check all tests in `backend/tests/`) to confirm zero regressions.

- [ ] **Step 3: Restart running Backend on port 8000 (since `run.py` has `reload=False`) & verify UI via `playwright` MCP**

1. Restart backend daemon cleanly if running stale code so port `8000` serves the new `/api/v1/hotline-3cx-auto` endpoints and `job_auto_sync_3cx_hotline_duty`.
2. Use `playwright` MCP (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_console_messages`) on `http://localhost:5173`:
   - Navigate to **Tác Vụ Ngầm (`/admin/jobs`)** (log in if prompted).
   - Verify card **Tự Động Chỉnh Trực Hotline 3CX (IT HCM App)** displays with schedule `06:00 & 16:29` and toggle OFF by default.
   - Click `Lịch Trực & Cấu Hình 3CX` -> verify all 4 tabs (`Lịch Trực Tuần / Tháng` with 7 `dd-mm-yyyy` rows Mon–Sun, `Thành Viên` listing all 7 pre-seeded staff `8775`, `8778`, `8776`, `8772`, `8779`, `8741`, `8740`, `Cấu Hình 3CX & Email`, `Lịch Sử Thực Thi & Ảnh Chụp`) + test `Esc` close LIFO behavior + check zero console/runtime errors!
   - If password saved via Tab 3 / local gitignored `.env`, run 1 safe `Chạy Thử (Không Lưu)` (`POST /api/v1/hotline-3cx-auto/dry-run`) against `https://ggg.ringbot.co:5001/#/login`, verify PNG screenshot loads cleanly in Tab 4 (`Lịch Sử Thực Thi & Ảnh Chụp`), confirming 3CX live Queue membership was **not modified**!

- [ ] **Step 4: Rebuild Frontend `dist/` (`cmd /c "npm run build"`) & update `PROGRESS.md` + `Script/README.md`**

- Re-run `cmd /c "npm run build"` inside `frontend/` after any final UI fix.
- Prepend concise verified entry at top of `PROGRESS.md` (rotating entries #11+ to `ARCHIVE.md` if applicable) and append log entry to `Script/README.md`.

- [ ] **Step 5: Inspect `git status` & diffs, commit, and push to `origin main`**

Ensure ZERO `.env` / secrets / unrelated scratch files or runtime logs are staged, commit cleanly, and run `git push origin main`.

---

## Plan Self-Review Checklist (Inline Verification)

1. **Spec Coverage:** Every requirement in `docs/superpowers/specs/2026-11-15-auto-3cx-hotline-duty-design.md` maps directly to tasks: 4 SQL tables & lifespan DDL (Task 1), 7 pre-seeded editable members + `dd-mm-yyyy` 7-day grid + Week/Month copy + `AUTO`/`WEEKDAY`/`WEEKEND` holiday switch + auto weekend swap + empty `SKIPPED` guard (Task 2), 9-step Playwright UI automation deleting all old rows + Skill Group `1`/`2` + retry 2x 60s + PNG screenshot + email alert + safe Dry-Run (Task 3), `/api/v1/hotline-3cx-auto` endpoints + `job_auto_sync_3cx_hotline_duty` 06:00/16:29 Scheduler integration + `SUCCESS`-only dedupe (Task 4), 4-tab `Hotline3cxDutyModal` + `JobManagementPage` integration (Task 5), SQL parity check + full tests + Playwright live UI/Dry-Run verification + docs + push (Task 6).
2. **Concrete Code & Test Steps:** No placeholder TBDs remain; test assertions, file paths, command lines, and Python 3.10 constraints are explicit.
3. **Type & Route Consistency:** Schema field names (`ext_line`, `shift_mode`, `morning_lines`, `evening_lines`, `weekend_lines`, `weekend_evening_override`, `has_password`) and route prefix (`/api/v1/hotline-3cx-auto`) match consistently across models, schemas, service, router, and frontend TS client.
4. **Proportionality:** Follows existing `unassigned_3cx_service.py` / `ticket_batch_service.py` / `JobManagementPage.tsx` conventions cleanly without overengineering external queues/workers.

