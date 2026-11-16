# Progress Archive

> Older milestones rotated out of `PROGRESS.md` (entries older than the latest 10). Do NOT read on session startup unless specifically requested by a task.
> Full legacy granular troubleshooting notes remain preserved in `Script/README.md`, `Script/GEMINI.md`, and `AGENTS.md`.

<!-- Archived entries go below, newest archived at top -->

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

