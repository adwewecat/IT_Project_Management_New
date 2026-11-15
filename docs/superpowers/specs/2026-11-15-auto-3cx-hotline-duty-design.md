# Thiết Kế Hệ Thống Tác Vụ Ngầm Tự Động Chỉnh Trực Hotline 3CX (IT HCM App)

- **Ngày thiết kế:** 15-11-2026
- **Trạng thái:** Đã duyệt (`15-11-2026`) — Đang triển khai
- **Phân hệ liên quan:** `Tác Vụ Ngầm (Scheduler)` (`JobManagementPage`), SQL Server (`ITDEPT`), Playwright 3CX Web Admin Automation (`https://ggg.ringbot.co:5001`)

---

## 1. Mục Tiêu & Ý Nghĩa (Intent & Goals)

### Mục tiêu
Xây dựng tác vụ chạy ngầm định kỳ trong phân hệ **Tác Vụ Ngầm (Scheduler)** để tự động đăng nhập tổng đài **3CX Web Admin** (`https://ggg.ringbot.co:5001/#/login`) và cập nhật danh sách nhân sự trực Hotline Team App HCM theo lịch tuần/tháng đã lập sẵn:
- **Thứ 2 → Thứ 6:**
  - **06:00 sáng:** Cập nhật Queue **`IT HCM App Day`** (`0006`) với danh sách nhân sự trực sáng (chạy **song song**, không có cột Skill Group).
  - **16:29 chiều:** Cập nhật Queue **`IT HCM App Night`** (`0007`) với danh sách nhân sự trực tối có phân cấp **`Skill Group`**: **Chính = `1`**, **Phụ = `2`**.
- **Thứ 7 & Chủ Nhật:**
  - Chỉ thao tác trên Queue **`IT HCM App Night`** (`0007`):
    - **06:00 sáng:** Cập nhật cặp **[Chính (`1`), Phụ (`2`)]** theo lịch ngày T7/CN.
    - **16:29 chiều:** Tự động **đảo ngược lại** thành **[Phụ cũ → Chính (`1`), Chính cũ → Phụ (`2`)]** (hoặc dùng cặp riêng nếu người dùng bật nhập ngoại lệ cho ca chiều).
- **Quy tắc ghi đè Queue:** Không giữ lại bất kỳ user mặc định nào đang có sẵn trên Queue 3CX — xóa sạch toàn bộ dòng user cũ trong tab `Users` rồi thêm lại đúng danh sách của ca trực hôm đó theo đúng thứ tự.

### Ngoài phạm vi (Non-Goals)
- Không can thiệp các Queue của bộ phận khác (Helpdesk, HN, Khối khác).
- Không thay thế trang xem ảnh `Lịch Trực Hotline` (`/hotline-schedule`).

### Điều tuyệt đối tránh (Anti-Goals)
- **An toàn tuyệt đối khi thiếu lịch:** Nếu ngày hôm đó chưa có cấu hình nhân sự trực hợp lệ (danh sách ca trống), tác vụ phải đánh dấu **`SKIPPED`** (ghi log + gửi email cảnh báo), **tuyệt đối không được xóa trắng user trong Queue trên 3CX thành 0 người**.
- **Mật khẩu & An toàn khởi tạo `[Quyết định kỹ thuật]`:** Mật khẩu đăng nhập 3CX (`8740`) lưu dạng mã hóa/encoded trong SQL Server (`HOTLINE_3CX_CONFIG`) và có thể đọc fallback/seed từ biến môi trường `HOTLINE_3CX_PASSWORD` trong `.env` (tuyệt đối không lưu mật khẩu thô trong source code GitHub). Các API GET chỉ trả về `has_password: true/false`. Tác vụ ngầm trong `DEFAULT_JOBS` mặc định đặt `is_enabled: False` cho tới khi bạn điền xong lịch trực + kiểm tra mật khẩu rồi gạt bật chạy tự động.
- **Retry & Chống chạy trùng `[Quyết định kỹ thuật]`:** Khi chạy ngầm lúc `06:00` hoặc `16:29`, nếu gặp lỗi mạng/timeout 3CX, hệ thống tự động **thử lại tối đa 2 lần** (cách nhau 60 giây) trước khi chốt `FAILED` và gửi email + ảnh màn hình báo lỗi. Hệ thống chỉ đánh dấu đã hoàn tất cặp `(duty_date, shift_code)` để chống chạy lặp khi kết quả đạt `SUCCESS` (giúp có thể bấm chạy lại thủ công nếu ca trước bị lỗi).

---

## 2. Phương Án Kiến Trúc Đã Chọn (Phương Án 1)

- **Lựa chọn:** Tự động hóa trình duyệt thực tế qua **Playwright Headless** (tận dụng hạ tầng `playwright>=1.50.0` và `_setup_playwright_browsers_path()` đã vận hành ổn định trong `ticket_batch_service.py` / `unassigned_3cx_service.py`), kết hợp lưu cấu hình/danh bạ/lịch trực/log vào **SQL Server (`ITDEPT`)** và giao diện quản lý tập trung ngay trong **`Tác Vụ Ngầm (Scheduler)`**.
- **Lý do chọn:** Thao tác đi đúng 100% luồng giao diện `ggg.ringbot.co:5001` đã được kiểm chứng qua ảnh chụp màn hình, không bị gãy khi 3CX nâng cấp API nội bộ, hỗ trợ chế độ **Chạy thử an toàn (Dry-Run không bấm Save)** và lưu **ảnh chụp màn hình bằng chứng (Screenshot)** sau mỗi lần xử lý để đối soát.
- **Phương án đã loại bỏ:** Gọi trực tiếp private REST/XAPI của 3CX (`httpx`) — nhanh hơn nhưng rủi ro thay đổi token/cookie/schema `SkillGroup` giữa các bản vá 3CX và không có bằng chứng trực quan sau khi lưu.

---

## 3. Thiết Kế Cơ Sở Dữ Liệu (SQL Server + `lifespan` + `Full_SCRIPT_SQL_TABLE.sql`)

Tự động kiểm tra và tạo bảng trong `backend/app/main.py` (`lifespan`) kèm bổ sung DDL chuẩn vào `Script/Full_SCRIPT_SQL_TABLE.sql` và khởi tạo trực tiếp trên DB Production `.25`:

### 3.1. `dbo.HOTLINE_3CX_CONFIG` (1 bản ghi cấu hình hệ thống)
- `id` (`INT IDENTITY PRIMARY KEY`)
- `base_url` (`NVARCHAR(500)`, mặc định `'https://ggg.ringbot.co:5001/#/login'`)
- `username` (`NVARCHAR(100)`, mặc định `'8740'`)
- `password_enc` (`NVARCHAR(500)`, lưu base64/mã hóa — đọc seed từ biến môi trường `HOTLINE_3CX_PASSWORD` nếu có khi khởi tạo lần đầu, hoặc nhập/cập nhật trực tiếp trên Tab 3)
- `day_queue_name` (`NVARCHAR(150)`, mặc định `N'IT HCM App Day'`)
- `day_queue_code` (`NVARCHAR(50)`, mặc định `'0006'`)
- `night_queue_name` (`NVARCHAR(150)`, mặc định `N'IT HCM App Night'`)
- `night_queue_code` (`NVARCHAR(50)`, mặc định `'0007'`)
- `morning_run_time` (`NVARCHAR(10)`, mặc định `'06:00'`)
- `evening_run_time` (`NVARCHAR(10)`, mặc định `'16:29'`)
- `weekend_auto_swap` (`BIT`, mặc định `1`)
- `headless` (`BIT`, mặc định `1`)
- `ignore_https_errors` (`BIT`, mặc định `1`)
- `email_recipients` (`NVARCHAR(500)`, mặc định `'dung.nguyenanh@ggg.com.vn'`)
- `notify_on_success` (`BIT`, mặc định `0`), `notify_on_failure` (`BIT`, mặc định `1`)
- `updated_by` (`NVARCHAR(100)`), `updated_at` (`DATETIME`)

### 3.2. `dbo.HOTLINE_3CX_MEMBERS` (Danh bạ thành viên & Line tìm kiếm nhanh)
- `id` (`INT IDENTITY PRIMARY KEY`)
- `ext_line` (`NVARCHAR(50) NOT NULL UNIQUE`) — Số Line gõ trực tiếp vào ô tìm kiếm 3CX (VD: `8775`)
- `full_name` (`NVARCHAR(200) NOT NULL`) — Họ tên hiển thị (VD: `HUNG PHAM TRAN MANH`)
- `department` (`NVARCHAR(100) NULL`) — Phòng ban (VD: `HCM IT DEPT`, `HCM ITS`)
- `is_active` (`BIT NOT NULL DEFAULT 1`)
- `sort_order` (`INT NOT NULL DEFAULT 0`)
- `note` (`NVARCHAR(255) NULL`)
- `created_at` (`DATETIME`), `updated_at` (`DATETIME`)

**Dữ liệu seed mặc định khi bảng rỗng (đúng 7 thành viên):**
1. `8775` — `HUNG PHAM TRAN MANH` — `HCM IT DEPT`
2. `8778` — `DUY NGO NHUT` — `HCM IT DEPT`
3. `8776` — `NGUYEN VU MINH THUC` — `HCM IT DEPT`
4. `8772` — `NGUYEN VI TRAM` — `HCM ITS`
5. `8779` — `LUC LE HOANG` — `HCM ITS`
6. `8741` — `QUYEN TO THI` — `HCM IT DEPT`
7. `8740` — `DUNG NGUYEN ANH` — `HCM IT DEPT`

### 3.3. `dbo.HOTLINE_3CX_SCHEDULES` (Lịch trực từng ngày)
- `id` (`INT IDENTITY PRIMARY KEY`)
- `duty_date` (`DATE NOT NULL UNIQUE`) — Lưu chuẩn `DATE` SQL (`YYYY-MM-DD`), hiển thị Frontend chuẩn `dd-mm-yyyy`
- `shift_mode` (`NVARCHAR(20) NOT NULL DEFAULT 'AUTO'`) — `'AUTO'` (tự động T2–T6 ngày thường, T7–CN cuối tuần) hoặc `'WEEKEND'` (bật cho ngày Lễ/Tết rơi vào T2–T6 để chạy giống chế độ Cuối tuần chỉ Queue Night Chính/Phụ & tự đảo 16:29)
- `day_lines_json` (`NVARCHAR(MAX)`) — JSON mảng Line trực Sáng song song cho T2–T6, VD `["8776", "8772"]`
- `night_primary_line` (`NVARCHAR(50) NULL`) — Line Chính (Skill Group `1`) cho Tối T2–T6 hoặc Ban ngày T7–CN
- `night_secondary_line` (`NVARCHAR(50) NULL`) — Line Phụ (Skill Group `2`) cho Tối T2–T6 hoặc Ban ngày T7–CN
- `weekend_evening_override` (`BIT NOT NULL DEFAULT 0`) — Dùng cho T7–CN nếu muốn nhập tay ca `16:29` thay vì tự động đảo ngược
- `weekend_evening_primary_line` (`NVARCHAR(50) NULL`)
- `weekend_evening_secondary_line` (`NVARCHAR(50) NULL`)
- `note` (`NVARCHAR(300) NULL`)
- `updated_by` (`NVARCHAR(100) NULL`), `updated_at` (`DATETIME`)

### 3.4. `dbo.HOTLINE_3CX_EXECUTION_LOGS` (Lịch sử áp dụng & Ảnh chụp xác nhận)
- `id` (`INT IDENTITY PRIMARY KEY`)
- `duty_date` (`DATE NOT NULL`)
- `shift_code` (`NVARCHAR(20) NOT NULL`) — `'MORNING'` (`06:00`) | `'EVENING'` (`16:29`)
- `queue_name` (`NVARCHAR(150) NOT NULL`)
- `applied_users_json` (`NVARCHAR(MAX)`) — Danh sách `[{"line": "8778", "name": "...", "skill_group": 1}]`
- `dry_run` (`BIT NOT NULL DEFAULT 0`)
- `status` (`NVARCHAR(30) NOT NULL`) — `'SUCCESS'` | `'FAILED'` | `'SKIPPED'` | `'DRY_RUN_OK'`
- `message` (`NVARCHAR(1000) NULL`)
- `screenshot_filename` (`NVARCHAR(255) NULL`) — Lưu file PNG trong `backend/data/hotline_3cx_screenshots/` phục vụ xem lại trên modal
- `triggered_by` (`NVARCHAR(100) NULL`), `duration_seconds` (`FLOAT NULL`), `executed_at` (`DATETIME NOT NULL`)

---

## 4. Kiến Trúc Backend & Luồng Tự Động Hóa Playwright

### 4.1. Độ phân giải ca trực (`resolve_shift_plan`)
Đầu vào: `target_date` (`date`), `shift_code` (`'MORNING' | 'EVENING'`), bản ghi `HOTLINE_3CX_SCHEDULES`:
- Xác định chế độ ngày: `is_weekend_mode = (schedule.shift_mode == 'WEEKEND') or (target_date.isoweekday() in {6, 7})`:
- Nếu `not is_weekend_mode` (Thứ 2 → Thứ 6 ngày thường):
  - `MORNING` (`06:00`): Target Queue = **`IT HCM App Day`** (`0006`), `use_skill_group = False`, danh sách = `day_lines` (theo thứ tự chọn).
  - `EVENING` (`16:29`): Target Queue = **`IT HCM App Night`** (`0007`), `use_skill_group = True`, danh sách = `[ (night_primary_line, skill=1), (night_secondary_line, skill=2) ]`.
- Nếu `is_weekend_mode` (Thứ 7, Chủ Nhật hoặc ngày T2–T6 bật cờ **Ngày Lễ**):
  - Target Queue luôn là **`IT HCM App Night`** (`0007`), `use_skill_group = True`:
    - `MORNING` (`06:00`): `[ (night_primary_line, skill=1), (night_secondary_line, skill=2) ]`.
    - `EVENING` (`16:29`):
      - Nếu `weekend_evening_override == True` và có đủ cấu hình riêng: dùng `[ (weekend_evening_primary_line, 1), (weekend_evening_secondary_line, 2) ]`.
      - Mặc định nếu `weekend_auto_swap == True`: tự động đảo ngược thành `[ (night_secondary_line, skill=1), (night_primary_line, skill=2) ]`.
- Kiểm tra an toàn:
  - Phải có cấu hình mật khẩu 3CX hợp lệ; nếu chưa có → báo lỗi cấu hình rõ ràng.
  - Loại bỏ line rỗng/trùng lặp; nếu kết quả cuối cùng có `0` user hợp lệ → trả trạng thái **`SKIPPED`**, tuyệt đối không mở Queue để xóa user trên 3CX.

### 4.2. Luồng Playwright trên `https://ggg.ringbot.co:5001/#/login`
1. Mở Chromium headless (hoặc có đầu nếu config `headless=0` để debug), `ignore_https_errors=True`, timeout chuẩn + dùng khóa (`asyncio.Lock` / `threading.Lock`) tránh 2 ca chạy đè nhau.
2. Truy cập `base_url`: kiểm tra nếu chưa ở giao diện đã login thì điền `username` (`8740`) + `password` → nhấn Login và chờ menu trái 3CX xuất hiện.
3. Click nút **`Admin`** (góc dưới thanh menu trái) → chờ `3CX Admin Console` → click **`Call Handling`**.
4. Tìm và mở Queue khớp `target_queue_name` hoặc `target_queue_code` (`IT HCM App Day` / `0006` hoặc `IT HCM App Night` / `0007`).
5. Click tab **`Users`**.
6. **Xóa sạch danh sách user cũ (không giữ user mặc định):** Đếm toàn bộ nút xóa (biểu tượng thùng rác trên từng dòng user trong bảng Users) và click xóa lần lượt cho tới khi không còn dòng user nào.
7. **Thêm lại đúng danh sách user mới theo thứ tự:**
   - Với mỗi phần tử `(ext_line, skill_group)`:
     - Click **`+ Add User`**.
     - Click mở ô dropdown `User` của dòng mới thêm → gõ chính xác **`ext_line`** (VD: `8740`) → chờ option bắt đầu bằng `ext_line ` (VD `8740 Dung Nguyen Anh...`) → click chọn.
     - Nếu là `IT HCM App Night` (`use_skill_group = True`): mở dropdown cột **`Skill Group`** ở cùng dòng đó → chọn đúng giá trị **`1`** (Chính) hoặc **`2`** (Phụ).
8. **Chụp ảnh màn hình trạng thái trước/sau + Lưu:**
   - Nếu `dry_run = True`: Dừng ngay trước nút `Save`, chụp ảnh màn hình giao diện để đối soát, thoát không lưu và trả `DRY_RUN_OK`.
   - Nếu `dry_run = False`: Bấm nút **`Save`**, chờ xác nhận lưu thành công / load lại kiểm tra danh sách vừa lưu khớp 100%, chụp ảnh xác nhận lưu vào `screenshot_filename`.
9. Khi có lỗi → luôn chụp ảnh màn hình tại thời điểm lỗi (`error_*.png`), lưu log `FAILED`, và gửi email cảnh báo qua SMTP cấu hình sẵn trong `job_scheduler_service`.

### 4.3. Tích hợp Tác Vụ Ngầm (`job_scheduler_service.py`)
- Đăng ký thêm tác vụ `job_auto_sync_3cx_hotline_duty` trong `DEFAULT_JOBS` (`category: "dung_utility"`, `restricted_to_dung: True`, `is_enabled: False` mặc định để chờ người dùng nhập lịch & kiểm tra mật khẩu xong mới bật, `schedule`: `schedule_type: "daily"`, `time: "06:00"`, `time_2: "16:29"`, `days_of_week: [1,2,3,4,5,6,7]`).
- Tự động merge tác vụ mới vào `backend/data/jobs_config.json` khi khởi động nếu chưa tồn tại.
- Trong `job_schedule_worker`: hỗ trợ khớp chính xác cả `06:00` (tự động truyền `shift_code="MORNING"`) và `16:29` (tự động truyền `shift_code="EVENING"`), tự động **retry tối đa 2 lần (cách 60s)** khi gặp lỗi mạng/timeout tạm thời, và khóa chống chạy lặp chỉ khi cặp `(duty_date, shift_code)` đạt `SUCCESS`.
- Trong `trigger_job_dry_run`: thêm nhánh xử lý `job_auto_sync_3cx_hotline_duty` (xác định ca theo giờ hiện tại hoặc tham số ca chỉ định).

### 4.4. API Endpoints (`backend/app/api/v1/hotline_3cx_auto.py`, Prefix `/api/v1/hotline-3cx-auto`)
Tất cả endpoint đều bảo vệ bởi `Depends(require_super_admin_or_dung)`:
- `GET /dashboard?start_date=YYYY-MM-DD&days=7`: Trả về cấu hình tổng quan (ẩn pass thật), danh bạ thành viên, lịch trực của tuần/khoảng ngày (tự điền khung rỗng cho đủ 7 ngày T2–CN), kèm preview ca Sáng/Chiều sắp chạy của hôm nay.
- `PUT /config`: Cập nhật link 3CX, user, pass (chỉ ghi đè pass nếu có nhập mới), tên/mã Queue Day/Night, giờ chạy `06:00` / `16:29`, `weekend_auto_swap`, `email_recipients`.
- `POST /members`, `PUT /members/{id}`, `DELETE /members/{id}`: Thêm / Sửa / Xóa thành viên và số Line trong danh bạ chọn nhanh.
- `PUT /schedules/bulk`: Lưu nhanh danh sách lịch trực nhiều ngày (1 tuần 7 ngày hoặc cả tháng) trong một lần bấm lưu.
- `POST /schedules/clone-week`: Nhân bản lịch tuần nguồn sang 1 hoặc nhiều tuần kế tiếp (hoặc hết tháng).
- `POST /run`: Chạy đồng bộ 1 ca chỉ định (`duty_date`, `shift_code: 'MORNING' | 'EVENING'`, `dry_run: bool`) — hỗ trợ nút **Chạy Thử (Không Lưu)** và **Áp Dụng Ngay Lên 3CX**.
- `GET /logs` & `GET /screenshots/{filename}`: Xem nhật ký thực thi và ảnh chụp màn hình bằng chứng.

---

## 5. Thiết Kế Giao Diện Frontend (`Hotline3cxDutyModal.tsx` tích hợp vào `JobManagementPage.tsx`)

- **Card Tác Vụ Ngầm:** Hiển thị thẻ `Tự Động Cập Nhật Lịch Trực Hotline 3CX (App HCM)` với tóm tắt ca `06:00` & `16:29` hôm nay, cùng các nút: **`Quản Lý Lịch Trực & Cấu Hình 3CX`**, **`Chạy Thử Hôm Nay (Không Lưu)`**, **`Áp Dụng Ca Ngay`**.
- **Modal Quản Lý Toàn Diện (Responsive 100%, đóng Esc/X theo LIFO stack, chuẩn `dd-mm-yyyy`):**
  1. **Tab 1 — Lịch Trực Tuần / Tháng (`dd-mm-yyyy`):**
     - Thanh chọn tuần mặc định hiển thị **7 ngày Thứ 2 → Chủ Nhật** của tuần hiện tại (`← Tuần trước` | `Tuần dd-mm-yyyy – dd-mm-yyyy` | `Tuần sau` | `Chọn tháng` | `Copy từ tuần trước` | `Lặp tới cuối tháng` | nút `Lưu Lịch Tuần/Tháng`).
     - Với **Thứ 2 → Thứ 6**:
       - Có nút gạt nhanh **"Ngày Lễ (như T7–CN)"** (`shift_mode = 'WEEKEND'` / `'AUTO'`) ngay trên từng dòng ngày để tự động chuyển hôm đó sang chế độ 1 Queue Night Chính/Phụ giống cuối tuần.
       - Khi ở chế độ ngày thường: Cột **Ca Sáng (06:00 • Queue Day 0006 • Song song)**: Danh sách checkbox/pill **7 thành viên + Line** bấm chọn nhiều người cực nhanh trong 1 chạm.
       - Cột **Ca Tối (16:29 • Queue Night 0007 • Chính / Phụ)**: 2 ô chọn nhanh từ danh bạ: **`Chính (Skill 1)`** và **`Phụ (Skill 2)`** (kèm cảnh báo trực quan nếu chọn trùng cùng 1 người).
     - Với **Thứ 7 & Chủ Nhật**:
       - Cột **Ca Ngày (06:00 • Queue Night 0007)**: Chọn **`Chính (1)`** và **`Phụ (2)`**.
       - Cột **Ca Tối (16:29 • Tự động đảo)**: Mặc định hiển thị badge xem trước **`Tự động đảo: [Phụ → Chính (1)] + [Chính → Phụ (2)]`**, kèm checkbox **`Nhập riêng ca 16:29`** nếu có ngoại lệ đột xuất.
     - Mỗi dòng ngày có nút **Test / Áp dụng nhanh** cho từng ca Sáng hoặc Chiều.
  2. **Tab 2 — Danh Bạ Thành Viên & Số Line:**
     - Hiển thị sẵn 7 thành viên bạn đã cung cấp; hỗ trợ tìm kiếm, thêm dòng thành viên mới (`Line`, `Họ tên`, `Phòng ban`), sửa trực tiếp thông tin/Line cũ hoặc bật/tắt/xóa thành viên.
  3. **Tab 3 — Cấu Hình Kết Nối 3CX & Giờ Chạy:**
     - Chỉnh Link tổng đài, User đăng nhập (`8740`), Mật khẩu (bỏ trống nếu giữ nguyên mật khẩu cũ), Tên/Mã `IT HCM App Day` (`0006`) & `IT HCM App Night` (`0007`), Mốc giờ Sáng (`06:00`) / Chiều (`16:29`), Bật/tắt tự đảo T7–CN, Chế độ headless, Email nhận cảnh báo lỗi.
  4. **Tab 4 — Nhật Ký & Ảnh Xác Nhận:**
     - Danh sách log từng lần chạy + nút xem trực tiếp ảnh chụp màn hình Queue trên 3CX (`img` trong popup con).

---

## 6. Ràng Buộc Kỹ Thuật & Kiểm Thử (Builder Notes)

- **Python 3.10 Compatibility:** Tuyệt đối tuân thủ không viết backslash `\` hoặc dấu nháy trùng loại trong `{...}` f-string, không dùng cú pháp Python 3.11+, không để UTF-8 BOM.
- **Kiểm chứng Selector 3CX thực tế (Left to Builder during implementation):** Khi triển khai service Playwright, builder chạy script đọc DOM **chế độ chỉ đọc (không bấm Save)** vào `https://ggg.ringbot.co:5001/#/login` để ghi nhận chính xác HTML selectors của form login, nút `Admin`, mục `Call Handling`, bảng Queue, tab `Users`, nút `+ Add User`, ô combobox search user theo số Line, dropdown `Skill Group`, nút thùng rác xóa dòng và nút `Save`.
- **Kiểm thử bắt buộc:**
  - Unit tests (`backend/tests/test_hotline_3cx_auto.py`): test quy tắc resolve T2–T6 Sáng/Tối, T7–CN `06:00` & `16:29` tự đảo, T7–CN ngoại lệ override, chặn xóa trắng khi lịch rỗng (`SKIPPED`), seed 7 thành viên mặc định, bảo mật không trả plain password, và AST Python 3.10 check.
  - Frontend build: `cmd /c "npm run build"` (`tsc -b && vite build`, zero TS6133).
  - Playwright UI E2E kiểm tra màn hình `JobManagementPage` -> mở `Hotline3cxDutyModal` (desktop + mobile, light/dark, 0 console errors) và kiểm tra luồng Dry-Run an toàn.

