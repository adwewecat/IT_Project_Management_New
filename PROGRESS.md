# Project Progress

> **Rotation Rule:** Prepend new entries to the top of **Recent Milestones**. Keep at most **10 entries** here; move older entries (#11+) to `ARCHIVE.md`.

## Recent Milestones

- **[2026-11-13] Integrated `Skill_Workflow_A.I`, 3 MCP Servers & Standardized Project Files**
  - **Done:** Installed/updated 42 curated workflow skills in `.agents/skills/` (`obra/superpowers` auto backbone + `mattpocock/skills` manual triggers `quy trinh moi`, `nghi ngoi`, `cau hinh`), verified `playwright`, `private-journal`, and `context7` in `~/.gemini/config/mcp_config.json`, added `.env`/`.env.*`/`.private-journal/` ignores in `.gitignore` (preserving existing rules and leaving `README.md` intact), streamlined `GEMINI.md` strictly under 300 lines with manifest/code architecture details + `Skill_Workflow_A.I` rules, and initialized `PROGRESS.md` (10 milestones) + `ARCHIVE.md`.
  - **Issues Fixed:** Reduced `GEMINI.md` from 3,895 lines to < 300 lines to prevent startup context bloat while preserving deep legacy reference pointers.
  - **Next:** Begin subsequent tasks following layered reading (`GEMINI.md` + `PROGRESS.md`), Context7 docs lookup, Superpowers TDD/subagents, and Playwright verification.

- **[2026-11-13] Chuẩn hóa toàn diện định dạng ngày/tháng/giờ Việt Nam (`dd-mm` / `dd-mm-yyyy` / `mm-yyyy` / 24h)** (`de59b31`)
  - **Done:** Tạo `frontend/src/utils/dateFormat.ts`, `DateTimeInput.tsx`, `MonthInput.tsx`, nâng cấp `DateInput.tsx` (`dd-mm-yyyy`), sửa pill Timesheet `formatDateDDMM(day)` (`01-11: 4h`) và thay toàn bộ `<input type="date" | "datetime-local" | "month">` trên các trang/modal.
  - **Verification:** `npm run build` (`exit code 0`), unit tests `dateFormat.ts`, và Edge Playwright headless (`locale="en-US"`).

- **[2026-11-13] Sửa triệt để lỗi đóng ticket 3CX treo 110s & thất bại do popup Timesheet 422 / Toast / `#basic_typeTicket`** (`1484df0`)
  - **Done:** Cập nhật `backend/app/services/ticket_batch_service.py` xử lý xoay vòng ngày trống khi `POST /api/worklog` trả 422, bắt toast `react-hot-toast` (`[role="status"]`) + API `PUT /api/tasks/{id}`, chuẩn hóa radio `#basic_typeTicket input[type='radio'][value='2']`.

- **[2026-11-13] Sửa lỗi quét 0 ticket 3CX & sai Timesheet 24h/ngày trên GPMS** (`d02ba27`)
  - **Done:** Bổ sung phục hồi SSO (`_recover_sso_if_redirected`), phân trang `tasks/paging`, parse Ant Design RangePicker & tiêu đề bảng `/timesheet-management` trên `ticket_batch_service.py`, nâng cấp badge `timesheet_summary` trên `JobManagementPage.tsx`.

- **[2026-11-12] Hỗ trợ tùy chọn dán mã RK7 hoặc SAP thêm món hàng loạt SO-CO** (`0c9cb56`)
  - **Done:** Bổ sung chế độ chọn dán mã RK7 hoặc SAP thêm món hàng loạt và tra cứu tên/đơn giá tự động từ MID/Server.

- **[2026-11-11] Giới hạn hiển thị tối đa 20 phiên lịch hẹn giờ đẩy Param & đồng bộ Báo Cáo Logs Tập Trung** (`d17345c`)
  - **Done:** Giới hạn danh sách hiển thị 20 lịch hẹn gần nhất trên modal Quản Lý Lịch Hẹn Giờ và lưu đầy đủ lịch sử sang Báo Cáo Logs Tập Trung.

- **[2026-11-11] Phát triển tính năng dán mã RK7 thêm món hàng loạt vào nhóm món SO-CO** (`62ef03e`)
  - **Done:** Cho phép paste danh sách mã RK7 để link tự động tên món/đơn giá từ MID và Master RK7.

- **[2026-11-11] Rà soát & chuẩn hóa rule so khớp tài khoản SSO/IAM (Strict Identity Matching)** (`079afb0`, `a0fd2a5`)
  - **Done:** Khắc phục lỗi khớp nhầm user đầu danh sách khi khóa/đổi mật khẩu hàng loạt SSO/IAM (`uyen.hoang` vs `duyen.hoang`), bổ sung bộ lọc nhanh và hiển thị kiểu khớp.

- **[2026-11-10] Nâng cấp Quản Lý Lịch Hẹn Giờ Đẩy Param (Auto-Polling, Chi Tiết Param, Tái Sử Dụng)** (`135233f`)
  - **Done:** Thêm tự động cập nhật trạng thái thời gian thực, xem chi tiết cấu hình param đã đẩy, tái sử dụng (clone) cấu hình và đẩy ngay.

- **[2026-11-10] Ràng buộc bắt buộc nhập Subject Email trên Webmail** (`cabf985`)
  - **Done:** Chặn gửi email khi bỏ trống tiêu đề (`Subject`) trên giao diện Webmail.
