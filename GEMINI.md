# IT Project Management — Project Instructions & Architecture

> Keep this file strictly under **300 lines**. On session start, read ONLY `GEMINI.md` and `PROGRESS.md`. Deep legacy specs/logs live in `AGENTS.md`, `Script/README.md`, `Script/GEMINI.md`, and `PROJECT_GUIDELINES.md` (read only when needed for the active task).

## Core Architecture

- **Overview:** Hệ thống quản lý hạ tầng, nhà hàng, sự vụ, dự án, PIM, Webmail và tự động hóa nghiệp vụ (MongoDB nhà hàng, GPMS Ticket 3CX/G-Process, SSO/IAM, Agent Multitask) cho team IT (`ITDEPT`).
- **Key Directories:**
  - `backend/app/` — FastAPI app (`api/`, `core/`, `models/`, `schemas/`, `services/`, `main.py`), chạy qua `backend/run.py` (`reload=False`, port `8000`).
  - `backend/tests/` & `backend/scripts/` — Pytest suite (`backend/pytest.ini`) và script hỗ trợ vận hành.
  - `frontend/src/` — React + TypeScript SPA (`components/`, `contexts/`, `pages/`, `routes/`, `services/`, `styles/`, `types/`, `utils/`), build tĩnh ra `frontend/dist/` kèm `web.config` (IIS).
  - `Script/` — `Full_SCRIPT_SQL_TABLE.sql` (DDL chuẩn), `README.md` & `GEMINI.md` (nhật ký chi tiết cũ).
  - Root scripts & config — `start_*.bat`, `build_frontend.bat`, `ISS/`, `Check_he_thong/`, `tools/`.

## Tech Stack

- **Backend (Python):** Python 3.10 production compatibility (`C:\Program Files\Python310`; local `.venv` in `backend/.venv`), `fastapi>=0.115.0`, `uvicorn>=0.30.0`, `sqlalchemy>=2.0.30`, `pyodbc>=5.1.0`, `pydantic>=2.7.0`, `pyjwt>=2.8.0`, `bcrypt>=4.1.0`, `openpyxl>=3.1.0`, `httpx>=0.27.0`, `pymongo>=4.0.0`, `playwright>=1.50.0`, `paramiko>=3.4.0`.
- **Frontend (Node/Vite):** React `^19.0.0`, TypeScript `~5.7.2` (strict mode, zero unused `TS6133`), Vite `^6.1.0` (dev port `5173` proxy `/api` & `/uploads` -> `127.0.0.1:8000`, preview `5001`), `react-router-dom ^7.1.5`, `axios ^1.7.9`, `lucide-react ^0.475.0`.
- **Database & Infra:** SQL Server (`ITDEPT`), MongoDB chi nhánh (`G_ORDER`, `G_KITCHEN`), IIS (`frontend/dist/web.config`).

## Build, Test & Verification Commands

```powershell
# Backend run (reload=False: phải restart process sau khi sửa .py)
Set-Location backend; .\.venv\Scripts\python.exe run.py

# Backend verify (cú pháp Python 3.10, import smoke test, pytest)
Set-Location backend; .\.venv\Scripts\python.exe -m compileall app
Set-Location backend; .\.venv\Scripts\python.exe -c "from app.main import app; print('>>> PASSED 100%')"
Set-Location backend; .\.venv\Scripts\pytest.exe

# Frontend build (bắt buộc chạy trước commit để cập nhật frontend/dist/ + web.config)
Set-Location frontend; cmd /c "npm run build"
```

## Critical Project Domain Rules

- **Tương thích tuyệt đối Python 3.10 (Server Production):** Cấm đặt `\` hoặc dấu nháy trùng loại bên trong `{...}` của f-string; cấm dùng cú pháp 3.11/3.12+ (`datetime.UTC`, `StrEnum`, `Self`, `tomllib`, `except*`); cấm UTF-8 BOM trong file `.py`.
- **Sẵn sàng copy triển khai (`backend/app` + `frontend/dist`):** Mọi thay đổi frontend phải chạy `npm run build` (`exit code 0`, zero TS6133); thêm bảng/cột DB mới phải bổ sung tự kiểm tra trong `lifespan` (`backend/app/main.py`), cập nhật `Script/Full_SCRIPT_SQL_TABLE.sql` và DB Production `.25`.
- **Phân quyền & Che dữ liệu (`🔒 Bị ẩn theo phân quyền`):** Không bao giờ ẩn cả dòng/trường khi thiếu quyền xem — giữ nguyên nhãn, chỉ che giá trị bằng `🔒 Bị ẩn theo phân quyền`. Màn hình/phân hệ mới mặc định chỉ Admin (`RolesPage.tsx` `BASE_LABELS`, `role_service.py`, `auth_service.py`, `hasNewScreenAccess()`, `<ProtectedRoute>`).
- **UI/UX & Định dạng ngày chuẩn Việt Nam:** 100% tiếng Việt; không đặt stat cards ở đầu trang; giao diện 1 khung nhìn (`flex: 1, minHeight: 0, overflowY: 'auto'`, sticky table header, bảng rộng bọc `TopScrollTable`); đóng modal LIFO bằng `Esc`/`X`; dùng `utils/dateFormat.ts`, `DateInput`, `DateTimeInput`, `MonthInput` để nhập/hiển thị `dd-mm`, `dd-mm-yyyy`, `mm-yyyy`, `dd-mm-yyyy HH:mm` (24h) trong khi vẫn giữ ISO `YYYY-MM-DD` cho API/SQL. Mobile giữ font gọn `11–12.5px`, dò ping MongoDB thực tế trước khi hiện lựa chọn.
- **File `.bat` & Console Windows:** 100% tiếng Việt không dấu (Pure ASCII), không đặt `(echo ...)` trong khối `if (...)`, tự đóng sau 3 giây khi thành công.

<!-- skill-workflow-ai:start -->
## Workflow & Memory Rules (Skill_Workflow_A.I)

### 1. Memory & Auto-Init (Context Budget Protection)
- **Layered Session Startup:** At the start of every session, read **ONLY `GEMINI.md` and `PROGRESS.md`**. Do NOT bulk-read `ARCHIVE.md` or other `.md` files unless a path is explicitly named in the current task or loaded as an active skill (`SKILL.md`).
- **Auto-Initialization:** Before writing or modifying code, verify all 4 root files exist: `.gitignore`, `README.md`, `GEMINI.md` (< 300 lines), `PROGRESS.md`. Create any missing file immediately; leave existing ones intact.
- **History Rotation (`PROGRESS.md`):** After each verified change or bugfix, prepend a brief entry at the top of `PROGRESS.md`. Keep **at most 10 recent entries**; move older entries (#11+) into `ARCHIVE.md`.
- **Cross-Project Memory (`private-journal` MCP):** Before debugging unfamiliar issues or making architectural decisions, query `private-journal` (`search_journal`) for reusable environment fixes and patterns from past projects. After solving non-obvious issues, save generalizable takeaways via `process_thoughts` (`technical_insights` / `world_knowledge`). Keep `.private-journal/` gitignored.

### 2. Execution Workflow & MCP Standards
- **Main Backbone (`obra/superpowers` — Auto-On):** Follow for every task: load `using-superpowers` -> `brainstorming` / `writing-plans` -> split work into independent tasks -> dispatch fresh-context subagents per task (`subagent-driven-development` / `dispatching-parallel-agents`) -> strict RED-GREEN-REFACTOR `test-driven-development` -> run `verification-before-completion` with real command output before claiming success.
- **Up-to-Date Library Docs (`context7` MCP):** *"Luôn gọi Context7 để tra cứu API trước khi viết code tích hợp thư viện ngoài"* — always call `context7` (`resolve-library-id` -> `query-docs`) for current API docs and examples before writing third-party library or SDK integration code.
- **Browser UI Verification (`playwright` MCP):** When changes touch web/frontend UI, include `playwright` MCP in `verification-before-completion`: open the localhost URL, inspect the Accessibility snapshot, test core interactions, and check browser console/runtime errors before `git commit`.
- **Manual / Milestone Tools (`mattpocock/skills` — Manual Only):** Never auto-trigger on routine tasks. Run ONLY when the user chats one of these exact trigger phrases (or invokes the matching slash command):
  - **`quy trinh moi`** *(skill `grill-with-docs` — use when initializing a project or adding a major feature)*: Act as a strict reviewer, ask one question at a time on business logic and input/output until zero ambiguity remains, then lock canonical terms in `GLOSSARY.md` and decisions in `docs/adr/`. Never auto-trigger on routine bugfixes.
  - **`nghi ngoi`** *(skill `handoff` — use at end of workday or when chat gets long)*: Summarize completed work at the top of `PROGRESS.md` (keep max 10 entries; move older entries #11+ to `ARCHIVE.md`) and write clear handoff instructions for the next session.
  - **`cau hinh`** *(skill `wizard` — use for off-code manual setup)*: Generate an interactive terminal bash script guiding the user step-by-step to configure `.env`, API keys, GitHub Secrets, or environment setup.

### 3. Clean Code & Git / GitHub Standards
- **Clean Code:** Immediately delete unused variables, functions, imports, and dead files. Comment only **WHY** (non-obvious invariants, edge cases, special error handling); never comment obvious code.
- **Git & GitHub:**
  - Never push failing, untested, or unverified code.
  - `git commit` locally only after finishing and verifying each task.
  - `git push` to GitHub right after completing a full feature, a complete bugfix, or before ending a session — always inspect `git status` and staged diff first to ensure no `.env`, secrets, keys, or credentials are included.
<!-- skill-workflow-ai:end -->
