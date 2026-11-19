# Progress Archive

> Older milestones rotated out of `PROGRESS.md` (entries older than the latest 10). Do NOT read on session startup unless specifically requested by a task.
> Full legacy granular troubleshooting notes remain preserved in `Script/README.md`, `Script/GEMINI.md`, and `AGENTS.md`.

<!-- Archived entries go below, newest archived at top -->

- **[2026-11-16] Xây dựng tác vụ ngầm Tự Động Chỉnh Trực Hotline 3CX (IT HCM App Day & Night)**
  - **Done:** Tạo 4 bảng `HOTLINE_3CX_*` (SQL Server `.25`, local `ITDEPT`, `main.py` lifespan, `Script/Full_SCRIPT_SQL_TABLE.sql`) và nạp sẵn 7 nhân sự mặc định; xây dựng engine `resolve_shift_plan` (ca sáng song song 06:00 T2-T6, ca tối chính/phụ 16:29 Skill 1/2, tự động đảo ca T7-CN/Lễ lúc 16:29, zero-wipe safety, retry 2 lần x 60s, chụp ảnh PNG, SMTP alert), 13 API `/api/v1/hotline-3cx-auto/*`, tích hợp scheduler `job_auto_sync_3cx_hotline_duty` (`06:00` & `16:29`), và modal UI 4 tab `Hotline3cxDutyModal` (`dd-mm-yyyy`, LIFO Esc/X).
  - **Verification:** `35 passed` (`pytest tests/test_hotline_3cx_models.py tests/test_hotline_3cx_auto.py tests/test_jobs.py`, bao gồm test hồi quy T-SQL `== True/False` & selector tabpanel), Playwright live E2E với 3CX (`DRY_RUN` vào đúng `Edit Queue 0006 -> Users`, Lightbox load ảnh, LIFO `Esc`, 0 console errors), `npm run build` exit 0 (`web.config` OK), và Python 3.10 AST check (`0` lỗi).

- **[2026-11-14] Xây dựng màn hình Báo Cáo GPMS tương tác đa chiều tại mục Báo Cáo & Nhật Ký**
  - **Done:** Phát triển trọn bộ Backend + Frontend phân hệ **Báo Cáo GPMS** (`/reports/gpms`) đọc file Excel GPMS (`ChiTietCongViec_*.xlsx`, lưu nén gzip+b64 vào SQL Server `GPMS_REPORT_BATCHES` + tự động nạp từ `REPORT/`), cấu hình User Miền Nam (`GPMS_REGION_CONFIG` — còn lại tự động vào Miền Bắc), bộ lọc nhanh `Vùng miền` (`Tất cả vùng` / `Miền Nam` / `Miền Bắc`) ngay trên thanh công cụ đầu trang, modal cấu hình User Miền Nam giữ nguyên vị trí cuộn & thứ tự danh sách khi tích chọn cho tới khi bấm `Lưu Cấu Hình` (không giật/nhảy đầu trang), và 6 chiều phân tích tương tác động + lọc chéo: (1) Top 5 Người gửi (mở rộng, bật/tắt Anonymous), (2) Top 5 Người nhận với biểu đồ 1 cột 3 màu (`Trễ hạn YCHT`, `Chưa trễ hạn YCHT`, `Hủy`) + mở rộng xem tất cả, (3) Donut & thanh 5 tiêu chí SLA (`HT đúng hạn`, `HT trễ hạn`, `Chưa HT chưa trễ`, `Chưa HT trễ hạn`, `Đã hủy`), (4) So sánh Miền Nam vs Miền Bắc kèm danh sách user từng miền & modal cấu hình có tìm kiếm, (5) Phân loại theo cột `Phân loại`, (6) Danh mục công việc (`DMCV cấp 1 -> cấp 2`). Áp dụng phân quyền Rule 10 (`gpms_report` / `view_gpms_report` / `update_gpms_report`), tự động tạo bảng trong `main.py` lifespan và bổ sung DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
  - **Verification:** `python -m unittest tests/test_gpms_report.py` (5/5 PASS trên 18.414 ticket thực tế + RBAC + Python 3.10 AST), `python -m compileall app`, smoke test `from app.main import app` PASSED 100%, `cmd /c "npm run build"` exit code 0 (zero TS6133), và kiểm thử Playwright live UI Desktop (Light/Dark, modal tick không nhảy `scrollTop === 220`, lọc riêng `Miền Nam` 4.270/18.414 ticket & `0` console errors) + Mobile 390px.

- **[2026-11-13] Sửa lỗi bể giao diện Modal Ghi Nhận Nghỉ Phép / Xin Về Sớm**
  - **Root Cause:** Modal đặt `maxWidth="600px"` quá chật cho 2 trường `DateTimeInput` (chứa cả input ngày `dd-mm-yyyy`, icon Clock, select Giờ và Phút) trên lưới cố định `1fr 1fr` (~270px/cột), kết hợp với select box không fix width tối ưu khiến ô phút bị đẩy tràn mép phải modal.
  - **Done:** Nâng `maxWidth` của Modal Nghỉ phép từ `600px` lên `680px` (đồng bộ với Modal Loại nghỉ phép `680px`); cấu hình responsive `repeat(auto-fit, minmax(270px, 1fr))` tự động xếp chồng trên mobile; tinh gọn kích thước `DateTimeInput` (`width: 46px, minWidth: 44px, gap: 3px`, icon Clock 13px) giúp 2 cột hiển thị thoáng đãng, sang trọng, không còn bị cắt xén.
  - **Verification:** `cmd /c "npm run build"` (exit code 0, 4.44s), smoke test backend passed 100%.

- **[2026-11-13] Khắc phục triệt để lỗi file .bat chớp tắt khi cài Client Agent (Agent Multitask)** (`24de7d2`)
  - **Root Cause:** Tất cả file `.bat` trong `tools/restaurant_support_agent/` đều dùng Unix LF (`\n`) thay vì Windows CRLF (`\r\n`), khiến `cmd.exe` seek sai byte-offset và quăng lỗi `The system cannot find the batch label specified`. Kết hợp với cấu trúc `for/do (goto :Label)` bên trong ngoặc đơn đa dòng → chớp tắt ngay lập tức.
  - **Done:** Viết lại `Install_Edge_Framework.bat` cấu trúc phẳng hoàn toàn (zero ngoặc đơn đa dòng), UAC safe qua `%BAT_TARGET%`, flat loop `goto :KiemTraServiceLoop`. Convert `Go_Cai_Dat_Dich_Vu.bat`, `Kiem_Tra_Trang_Thai.bat`, `fix_CO_SO_Fail_to_connect.bat` sang CRLF 100%. Cập nhật API `download-package` tự động chuẩn hóa CRLF cho mọi file text khi đóng gói ZIP. Đóng gói lại 2 ZIP tĩnh. 5/5 unit tests PASS.
  - **Verification:** `python -m compileall app` ✓, `npm run build` exit 0 ✓, 5 unit tests PASS ✓.

- **[2026-11-13] Integrated `Skill_Workflow_A.I`, 3 MCP Servers & Standardized Project Files**
  - **Done:** Installed/updated 42 curated workflow skills in `.agents/skills/` (`obra/superpowers` auto backbone + `mattpocock/skills` manual triggers `quy trinh moi`, `nghi ngoi`, `cau hinh`), verified `playwright`, `private-journal`, and `context7` in `~/.gemini/config/mcp_config.json`, streamlined `GEMINI.md` strictly under 300 lines, and initialized `PROGRESS.md` + `ARCHIVE.md`.

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

- **[2026-11-09] Khắc phục lỗi xóa hình ảnh minh họa phiên bản phần mềm không lưu được** (`2bbc861`)
- **[2026-11-09] Khắc phục lỗi dán bảng Excel vào soạn thư Webmail bị chuyển thành ảnh — giữ nguyên HTML table text chỉnh sửa được** (`2dabae7`)
- **[2026-11-09] Multi-Collection Live Order Tracker cho Logs Order Bàn & Dynamic Fleet Tablet/Thiết Bị Nhà Hàng** (`132d9ee`)
- **[2026-11-09] Tối ưu hiệu năng Webmail tức thì (0ms) & hỗ trợ Ctrl+V / Drag & Drop tệp đính kèm**
- **[2026-11-08] Nâng cấp Remote KDS (Scrcpy v5.0.1 + ADB 37.0.1) & tinh gọn 13 khối tác vụ Phân tích MongoDB**
- **[2026-11-07] Khắc phục SyntaxError f-string Python 3.10; hoàn thiện giả lập CO-SO & KDS; hợp nhất Tab 1-2 MongoDB**
- **[2026-11-06] Chuẩn hóa Agent Multitask 2 (100% Agent-less, LAN Relay đa máy `D:\GPOS-Setup\`, hot-swap, batch IP paste)**
- **[2026-11-05] Phát triển Agent Multitask 2 (SFTP & thực thi lệnh máy trạm) và link API thông tin nhà hàng cho NCC**
- **[2026-11-03] Khóa cố định thư mục ảnh `/opt/gpos/gmonitor/resources/menu`, truyền ảnh xuống `D:\GPOS-Setup\app\img\menu`, nâng hạn mức Webmail 30MB**
- **[2026-11-02] Phòng vệ `paramiko`, tìm kiếm theo FTTH, chọn món đồng bộ ảnh CO 5 cột & xuất Excel chuẩn**
- **[2026-11-01] Tích hợp kỹ năng Matt Pocock & Superpowers; random mã tạm SAP/Cost Center/RK7; nâng cấp Sơ Đồ Bàn CO-SO Tab 3**
- **[2026-10-30] Nâng cấp modal xem ảnh Setup PIM (lướt cuộn tất cả ảnh & chuyển nhanh)**
- **[2026-10-29] Quản lý Role 1 vs Role 3 KDS; tối ưu Reply All & chữ ký email; sửa lỗi đọc email đính kèm rời TCH**
- **[2026-10-28] Tách trạng thái Đã đọc/Chưa đọc Webmail theo từng user; đồng nhất Param Code & Name**
- **[2026-10-27] Bổ sung thêm món vào KDS & gán bếp nấu; khắc phục Agent Multitask tab & phản hồi G-Process**
- **[2026-10-25..26] Tự động điều hướng & nâng cấp Mobile Portal (`/mobile`), lọc G-Process `'IT Xác Nhận Lỗi Kỹ Thuật'`**

