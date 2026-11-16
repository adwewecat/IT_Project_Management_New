# 3CX Sync Relay Worker Implementation Plan (Approach 2)

> **Goal:** Enable Production Server (`172.16.8.25`, whose DC firewall blocks outbound TCP 5001 to `ggg.ringbot.co:5001`) to offload 3CX Web Portal Playwright sync tasks to a lightweight Relay Worker agent running on any office PC/VM with outbound port 5001 open, while keeping all schedules, holidays, logs, screenshots, alerts, and admin controls centralized in `ITDEPT` and the main Web UI.

---

## Architecture Overview

1. **Pull-Based Relay Protocol (Worker PC -> Main Server):**
   - Office PC connects outbound to Main Server (`http(s)://<server>/api/v1/hotline-3cx-auto/relay/...`) authenticated by `X-Relay-Token` (stored in `HOTLINE_3CX_CONFIG.relay_token`, auto-generated cleanly and rotated on demand by Admin).
   - Worker heartbeats every ~30s and polls `next-task` every ~5s. Server tracks live worker hostname, client IP, and `relay_last_seen_at` (displayed as Online/Offline badge in Tab 3 `ConfigTab`).
2. **Database Extensions (`HOTLINE_3CX_CONFIG` + `HOTLINE_3CX_RELAY_TASKS`):**
   - Extend `HOTLINE_3CX_CONFIG`: `execution_mode` (`'DIRECT'` | `'RELAY'`), `relay_token`, `relay_worker_name`, `relay_last_ip`, `relay_last_seen_at`.
   - New table `HOTLINE_3CX_RELAY_TASKS`: `id`, `duty_date`, `shift_code`, `queue_name`, `is_dry_run`, `triggered_by`, `plan_json`, `status` (`PENDING` | `RUNNING` | `SUCCESS` | `DRY_RUN` | `FAILED` | `TIMEOUT`), `worker_name`, `sync_log_id`, `error_message`, `created_at`, `claimed_at`, `finished_at`.
   - Synced across: SQLAlchemy model (`hotline_3cx_auto.py`), `main.py` lifespan auto-DDL, `Script/Full_SCRIPT_SQL_TABLE.sql`, Production Server `172.16.8.25` (`ITDEPT`), and Local `127.0.0.1` (`ITDEPT`).
3. **Sync Lifecycle in `RELAY` Mode:**
   - Scheduler (`job_auto_sync_3cx_hotline_duty`) or Web triggers (`POST /dry-run`, `POST /apply-now`) call `run_shift_sync(db, ...)`.
   - Empty plan -> immediate `SKIPPED` log + alert; missing password -> immediate `FAILED` log + alert.
   - Valid plan -> inserts `Hotline3cxSyncLog(status='PENDING')` + `Hotline3cxRelayTask(status='PENDING')` and returns cleanly without blocking `.25` on port 5001.
   - Worker atomically claims oldest `PENDING` task (`PENDING -> RUNNING`), receives decrypted credentials + pre-resolved `plan`, executes the Playwright 3CX queue sync locally, and uploads status + applied lines + error + confirmation PNG screenshot via `POST /relay/tasks/{task_id}/report`.
   - Stale guard expires uncompleted `PENDING`/`RUNNING` tasks > 15 minutes (`TIMEOUT` / log `FAILED` + SMTP alert).
4. **Zero-Extra-Folder Packaging & Deployment:**
   - Standalone worker sources (`3cx_sync_relay.py`, Pure-ASCII CRLF `.bat` & `.vbs` scripts, `README_HUONG_DAN.txt`) live inside `backend/app/assets/3cx_sync_relay/` so copying only `backend/app` and `frontend/dist` to `.25` makes `GET /api/v1/hotline-3cx-auto/relay/download-package` immediately operational.
5. **Frontend UI (`ConfigTab.tsx`, `LogsTab.tsx`, `Hotline3cxDutyModal.tsx`):**
   - Tab 3 (`ConfigTab.tsx`): `execution_mode` selector (`DIRECT` vs `RELAY`), live Worker status pill (Online/Offline, hostname, IP, last seen `dd-mm-yyyy HH:mm`), `relay_token` view/copy/regenerate, and `Tải Bộ Cài 3CX Relay Worker (.zip)` button.
   - Tab 4 (`LogsTab.tsx`) & `Hotline3cxDutyModal.tsx`: distinct badges for `PENDING` (`Chờ Relay Worker`) & `RUNNING` (`Relay đang chạy`) and automatic 3s polling while active tasks are pending/running.

