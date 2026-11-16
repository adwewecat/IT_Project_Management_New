# Custom Holidays (`HOTLINE_3CX_HOLIDAYS`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans / TDD to implement this plan cleanly.

**Goal:** Cho phép người dùng khai báo, quản lý và bật/tắt nhanh **Ngày Lễ Riêng** (các ngày nghỉ đột xuất/lễ công ty không cố định theo lịch Nhà nước) cho phân hệ Tự Động Phân Hàng Đợi Trực Hotline 3CX, đảm bảo ngày lễ chạy theo chế độ T7–CN (`Night 0007`: 06:00 Chính-Phụ → 16:29 tự đảo) và được bảo vệ khi sao chép tuần hoặc áp dụng mẫu tháng.

**Architecture:** Thêm bảng `dbo.HOTLINE_3CX_HOLIDAYS` (`id`, `holiday_date` UNIQUE, `name`, `created_by`, `created_at`) được tự động kiểm tra tạo trong `backend/app/main.py` (`lifespan`), `Script/Full_SCRIPT_SQL_TABLE.sql`, và tạo sẵn trên Production `.25` + Local `127.0.0.1`. Logic `compute_effective_mode` ưu tiên `WEEKDAY` nếu người dùng ép thủ công, kế tiếp là `WEEKEND` nếu `shift_mode == "WEEKEND"` hoặc `duty_date` thuộc `HOTLINE_3CX_HOLIDAYS`, cuối cùng là cuối tuần T7–CN. Frontend bổ sung nút `Ngày Lễ Riêng (N)` mở `HolidayManagerModal` (chọn 1 ngày hoặc khoảng `dd-mm-yyyy`, tên lễ, gán nhanh Chính/Phụ, nhảy tới tuần, xóa) và nút bật/tắt 1-chạm ngay trên từng dòng trong `ScheduleTab`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (Python 3.10+ compat, T-SQL), Pydantic v2, React 18 + TypeScript (strict TS6133), Vite.

## Global Constraints
- **Python 3.10 Production Compatibility:** Không đặt `\` hoặc dấu nháy trùng loại trong `{...}` của f-string; không dùng `datetime.UTC`, `StrEnum`, `Self`; không UTF-8 BOM.
- **T-SQL Bit Safety:** Mọi filter boolean dùng `== True` / `== False`, không dùng `.is_(True)`.
- **Zero-Loss Unsaved State:** Thao tác thêm/xóa ngày lễ phải merge trực tiếp metadata lễ vào bảng tuần đang mở mà không làm mất chỉnh sửa chưa lưu của các dòng khác.
- **Vietnamese UI & Date Standard:** 100% tiếng Việt, chuẩn ngày `dd-mm-yyyy` qua `DateInput` và `formatDateDDMMYYYY`, Modal hỗ trợ LIFO `Esc`/`X`.

## Tasks
1. **Database & Models:** Thêm `Hotline3cxHoliday` vào `backend/app/models/hotline_3cx_auto.py`, `main.py` lifespan DDL, `Script/Full_SCRIPT_SQL_TABLE.sql`, và thực thi tạo bảng trên `172.16.8.25` (`ITDEPT`) + `127.0.0.1` (`ITDEPT`).
2. **Backend Schemas, Service & Tests (TDD):** Thêm `HotlineHolidayItem`, `HotlineHolidayBatchCreateRequest`, cập nhật `ScheduleDayItem`, `compute_effective_mode`, `list_holidays`, `upsert_holidays_batch`, `delete_holiday`, `get_schedules_range`, `resolve_shift_plan`, `run_shift_sync`, bảo vệ lễ trong `clone_previous_week_schedules` và `apply_week_template_to_month`.
3. **API Endpoints:** Thêm `GET/POST /hotline-3cx-auto/holidays` và `DELETE /hotline-3cx-auto/holidays/{holiday_id}` trong `backend/app/api/v1/hotline_3cx_auto.py`.
4. **Frontend UI:** Cập nhật `hotline3cxAuto.ts`, `hotline3cxAutoService.ts`, tạo `HolidayManagerModal.tsx`, nâng cấp `ScheduleTab.tsx` và `Hotline3cxDutyModal.tsx`.
5. **Verification & Ship:** Chạy đầy đủ `pytest`, Python 3.10 AST scan, `compileall`, smoke test `from app.main import app`, `npm run build` (`web.config`), kiểm thử Playwright live UI (mở modal Ngày Lễ, thêm/xóa ngày lễ `dd-mm-yyyy`, toggle nhanh trên dòng, giữ nguyên unsaved edits, 0 console errors), cập nhật `PROGRESS.md`/`ARCHIVE.md`, commit & `git push origin main`.
