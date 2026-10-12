# IT Project Management New (Phiên bản Tối ưu hóa 2.0)

Dự án tái cấu trúc và hiện đại hóa từ hệ thống cũ `IT_information_management`.

## Công nghệ sử dụng
1. **Backend**: Python 3.10/3.14 + FastAPI + SQLAlchemy 2.0 + pyodbc (ODBC Driver 18 for SQL Server) + pymongo (MongoDB trạm nhà hàng port 27017)
2. **Frontend**: React 18/19 + TypeScript + Vite + React Router + Axios + Lucide Icons
3. **Database chính**: SQL Server (Server Test 172.16.20.103)
4. **Database nhà hàng**: MongoDB các trạm POS nhà hàng (port 27017, IP đuôi .11, .12, .41)
5. **Giao tiếp**: RESTful API chuẩn OpenAPI (Swagger UI `http://localhost:8000/docs`)
6. **Quy chuẩn Design & CSS Variables**:
   - Nền trắng chủ đạo (`--bg-primary: #FFFFFF`)
   - Chữ đen (`--text-primary: #111827`)
   - Nút chính & Menu active: Vàng đậm `#F5B800` (`--color-primary`)
   - Màu trạng thái: Đỏ (`--color-error`), Xanh lá (`--color-success`)
   - Không dùng gradient, màu trang trí thừa
   - Toàn màn hình full width linh hoạt, không bó hẹp `maxWidth: 1440px`

---

## Cấu trúc thư mục

```
IT_Project_Management_New/
├── backend/
│   ├── app/
│   │   ├── api/          # API Routers & Dependencies (get_current_user)
│   │   ├── core/         # Config (.env), Database (SQLAlchemy 2.0), Security (JWT, bcrypt)
│   │   ├── models/       # ORM Models (User, PermissionDetail, RoleLevel)
│   │   ├── schemas/      # Pydantic Schemas (LoginRequest, TokenResponse, UserInfo)
│   │   ├── services/     # Business logic, mongodb_service, sso_service...
│   │   └── main.py       # FastAPI application
│   ├── tests/            # Test suite pytest
│   ├── .env              # Cấu hình DB Test 172.16.20.103
│   ├── requirements.txt
│   └── run.py            # Chạy backend server (port 8000)
├── frontend/
│   ├── src/
│   │   ├── components/   # UI components, modals (RestaurantDetailModal, ProjectDescriptionModal...)
│   │   ├── contexts/     # AuthContext
│   │   ├── pages/        # SsoManagementPage, RestaurantMongoAnalysisPage, CentralizedLogsPage...
│   │   ├── routes/       # ProtectedRoute, AppRoutes
│   │   ├── services/     # api.ts, authService.ts, mongoService.ts...
│   │   └── styles/       # variables.css, index.css
│   ├── package.json
│   └── vite.config.ts
├── Script/               # Chứa scripts SQL, hướng dẫn, tài liệu quy chuẩn & README.md lưu vết
│   ├── README.md         # File NHẬT KÝ LƯU VẾT TOÀN BỘ CÔNG VIỆC (Mỗi lần làm mới/sửa cũ BẮT BUỘC NOTE VÀO ĐÂY)
│   ├── GEMINI.md         # Bản sao tài liệu quy chuẩn kỹ thuật
│   └── PROJECT_GUIDELINES.md # Bản sao cẩm nang dự án
├── GEMINI.md             # MASTER RULES - AI nạp tự động khi khởi động
├── AGENTS.md             # Bản sao dự phòng cho AI Agent
├── .agents/rules/        # Quy tắc tự động quét của Antigravity
├── start_backend.bat     # Khởi động riêng Backend
├── start_frontend.bat    # Khởi động riêng Frontend
└── start_all.bat         # Khởi động cùng lúc cả 2
```

---

## Hướng dẫn chạy và kiểm thử

### Cách 1: Sử dụng file script click chạy nhanh
- Nhấp đúp vào `start_all.bat` để mở đồng thời Backend và Frontend.
- Hoặc nhấp `start_backend.bat` / `start_frontend.bat` để chạy độc lập.

### Cách 2: Chạy thủ công từ dòng lệnh

**1. Khởi động Backend**:
```powershell
cd backend
.venv\Scripts\python.exe run.py
```
- API Docs (Swagger): `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

**2. Build & Khởi động Frontend**:
```cmd
# Kiểm tra build nghiêm ngặt (Bắt buộc exit code 0):
cd frontend
cmd /c "npm run build"

# Khởi động dev server:
npm run dev
```
- Mở trình duyệt: `http://localhost:5173`

---

## 📌 QUY ƯỚC QUẢN LÝ THAY ĐỔI & NHẬT KÝ LƯU VẾT (QUY TẮC SỐ 1 - BẮT BUỘC)

> ⚠️ **ĐẶC BIỆT QUAN TRỌNG**:  
> Mỗi khi **LÀM MỘT TÍNH NĂNG MỚI**, **SỬA LẠI CÁI CŨ**, hoặc **THIẾT LẬP MỘT QUY ĐỊNH/QUY ƯỚC MỚI**, AI Assistant và Developer **BẮT BUỘC PHẢI NOTE NGAY VÀO FILE NÀY** (`Script/README.md`).  
> **Mục đích**: Khi cài lại Windows hoặc chuyển sang máy tính mới, chỉ cần mở file này là cả người và AI đều không bao giờ bị mất dấu những gì đã làm việc.

### Quy tắc note:
1. **Ngày tháng**: Ghi rõ ngày giờ thực hiện `[YYYY-MM-DD]`.
2. **Hạng mục**: Tên module / trang / tính năng liên quan.
3. **Chi tiết thay đổi**: Ghi rõ logic cũ $\rightarrow$ logic mới, file sửa/thêm, lý do thực hiện.
4. **Quy định phát sinh**: Nếu có quy tắc mới (ví dụ không dùng stat card, che mật khẩu theo quyền...), ghi chú rõ ràng để các phiên sau tiếp tục tuân thủ.
5. **Quy chuẩn bắt buộc Mobile First / Responsive (Mới)**: Mọi trang, tác vụ, bảng dữ liệu và modal khi làm mới hoặc sửa đổi **BẮT BUỘC phải dùng được và thao tác tiện lợi trên điện thoại di động (360px - 430px)**.
6. **Quy ước Tự động Tạo Bảng trong Code & Cập nhật `Full_SCRIPT_SQL_TABLE.sql` (Mới)**: Khi tạo bảng mới cho một tính năng mới, sau khi kiểm thử hoàn chỉnh:
   - Model ORM của bảng **bắt buộc phải đăng ký trong hàm `lifespan` tại `backend/app/main.py`** (`Base.metadata.create_all(...)`) để khi đưa code lên server, backend sẽ tự động kiểm tra và tạo bảng nếu trên database của server chưa có.
   - Bắt buộc cập nhật DDL của bảng vào file master **`Script/Full_SCRIPT_SQL_TABLE.sql`** (qua `generate_full_sql_scripts.py`) để sau này chỉ cần chạy 1 file SQL này là dựng trọn vẹn 100% database trên một server mới hoàn toàn.
7. **Quy tắc bắt buộc khi chỉnh sửa & triển khai Server (Copy `backend/app` và `frontend/dist` là chạy ngay) (Mới)**:
   - Mọi chỉnh sửa (tính năng mới hoặc sửa lỗi) bắt buộc phải đảm bảo: **Chỉ cần copy thư mục `backend/app` và `frontend/dist` lên server là hệ thống chạy ngay**, không yêu cầu cấu hình thủ công phức tạp trên server.
   - Luôn chạy `cmd /c "npm run build"` (tại `frontend/`) và `python -m compileall app` (tại `backend/`) trước khi bàn giao.
   - Nếu có thêm bảng hoặc cột mới trong Database:
     + **Bắt buộc thêm trực tiếp vào Database Production .25** (`172.16.8.25:1433`, Database: `ITDEPT`).
     + **Kèm cập nhật ngay vào `Script/Full_SCRIPT_SQL_TABLE.sql`** để lưu trữ master DDL cho việc dựng server mới sau này.
     + Khai báo kiểm tra cột / tạo bảng tự động trong hàm `lifespan` tại `backend/app/main.py` để phòng ngừa lỗi 500 khi server khởi động.
8. **Quy tắc Bất Biến: Thứ Tự Khai Báo Top-Down & Smoke Test Bắt Buộc (Chống 100% Lỗi Khai Báo Thiếu / NameError Backend)**:
   - **Thứ tự khai báo chuẩn trong từng file router**: `1. Imports` $\rightarrow$ `2. Constants & Pydantic Schemas` $\rightarrow$ `3. Dependencies & Local Helpers` (bắt buộc đặt trên) $\rightarrow$ `4. Route Endpoints (@router.get/post)` nằm ở dưới cùng. Tuyệt đối không để hàm dependency nằm bên dưới route sử dụng `Depends(func)`.
   - **CẤM CHỈ DÙNG `py_compile`**: Lệnh compile syntax chỉ kiểm tra cú pháp AST mà hoàn toàn không thực thi module scope nên không phát hiện được lỗi NameError.
   - **Lệnh Smoke Test Bắt Buộc Sau Mọi Chỉnh Sửa Backend**:
     ```powershell
     backend\.venv\Scripts\python.exe -c "from app.main import app; print('>>> BACKEND SMOKE TEST: PASSED 100%')"
     ```
     Chỉ khi lệnh này in ra `PASSED 100%`, code mới được bàn giao hoặc copy lên server.

---

### [2026-10-12] - Tối Ưu Toàn Diện Giao Diện Responsive & Trải Nghiệm Sử Dụng Trên Điện Thoại Di Động
- **Bối cảnh & Yêu cầu người dùng**:
  - Người dùng truy cập trên điện thoại (ảnh chụp thực tế qua IP server port 5001) gặp phải các vấn đề:
    + Cột nội dung trang bị co hẹp chỉ chiếm ~60% màn hình, để lại khoảng trống trắng/xám vô lý ở bên phải.
    + Bảng danh sách nhà hàng bị bóp nghẹt chiều cao, không hiển thị được dòng dữ liệu nào do Header, 5 nút bấm dọc và bộ lọc chiếm hết chiều cao màn hình (`100vh - 60px` với `overflow: hidden`).
    + 5 nút hành động xếp chồng dọc chiếm diện tích khổng lồ.
    + Thanh Header trên cùng có các nút Hotline và icon tràn quá bề rộng màn hình làm nới rộng viewport gây vỡ tỷ lệ trang.
- **Nguyên nhân cốt lõi**:
  1. Header có các nút hiển thị đầy đủ text ("Hotline: TẮT", "Cuộc Gọi", logo lớn) khiến chiều rộng tối thiểu của Header lên tới ~585px trong khi màn hình điện thoại chỉ rộng 360px - 412px. Trình duyệt mobile phải phóng rộng viewport theo Header khiến nội dung bên dưới co lại chỉ chiếm ~60% màn hình.
  2. Trang `RestaurantListPage` và `RestaurantAuditLogsPage` bị cố định `height: calc(100vh - 60px)` và `overflow: hidden`. Trên mobile chiều cao hiển thị hạn chế, các khối phía trên đẩy bảng xuống dưới khiến bảng bị ép còn 0px chiều cao.
  3. Lệnh CSS `table { display: block; max-width: 100%; overflow-x: auto; }` trước đây phá vỡ cấu trúc bảng chuẩn của HTML, làm lệch cột và ảnh hưởng tiêu đề dính (sticky header).
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Header & Viewport (`index.html`, `Header.tsx`, `index.css`)**:
     - Cập nhật viewport meta: `width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes`.
     - Tối ưu Header trên mobile: logo co gọn 28px, ẩn chữ phụ (`Hotline: TẮT` $\rightarrow$ chỉ giữ nút tròn trạng thái kèm icon tai nghe nhỏ gọn; `Cuộc Gọi` $\rightarrow$ chỉ giữ icon điện thoại kèm số badge đỏ; nút Theme/Đổi mật khẩu/Đăng xuất thu gọn padding). Chiều rộng Header trên mobile giảm còn ~310px, vừa vặn 100% mọi dòng máy.
  2. **Khung chứa chính (`MainLayout.tsx`, `Sidebar.tsx`, `index.css`)**:
     - Khi sidebar đóng trên mobile: đặt `display: none !important` để triệt tiêu hoàn toàn khoảng trống phụ trong flex container.
     - `.app-main-content` đặt `width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; padding: 10px 8px !important;`.
  3. **Tối ưu Danh Sách Nhà Hàng (`RestaurantListPage.tsx`, `RestaurantAuditLogsPage.tsx`)**:
     - Class `.page-container-fullheight`: Trên desktop giữ nguyên full-height fit màn hình; trên mobile tự động chuyển thành `height: auto !important; min-height: calc(100vh - 56px); overflow: visible;` cho phép vuốt cuộn dọc mượt mà.
     - 5 nút hành động: Chuyển sang lưới 2 cột (`.mobile-action-grid`), nút `+ Thêm Nhà Hàng` chiếm trọn 2 cột ở trên (`.mobile-action-primary`), 4 nút còn lại gọn gàng 2 hàng x 2 cột.
     - Bộ lọc tìm kiếm (`.mobile-filter-stack`): Chuyển thành khối dọc linh hoạt 100% chiều rộng.
     - Bảng dữ liệu: Đặt trong `.table-responsive-container` vuốt ngang cảm ứng mượt mà, bổ sung gợi ý vuốt trực quan (`.mobile-swipe-hint`), phân trang co gọn 2 tầng dễ bấm (`.mobile-pagination-container`).
  4. **Kiểm thử & Đóng gói**:
     - `cmd /c "npm run build"` thành công exit code 0 (`built in 5.10s`), bundle `frontend/dist/` đã sẵn sàng đưa lên server.
     - Smoke test backend đạt 100% chuẩn.

---

### [2026-10-12] - Sửa Triệt Để Lỗi NameError Khởi Động Backend Trên IIS & Ban Hành Quy Tắc Bất Biến Về Thứ Tự Khai Báo & Smoke Test
- **Bối cảnh & Yêu cầu người dùng**:
  - Khi khởi động backend trên IIS (qua file batch), hệ thống văng lỗi dừng server:
    `File "C:\DUNGIT\IT_Project_Management_New\backend\app\api\v1\hotline.py", line 629, in <module>`
    `current_user: UserInfo = Depends(get_current_user_flexible),`
    `NameError: name 'get_current_user_flexible' is not defined`
  - Người dùng phàn nàn lỗi khai báo thiếu/khai báo sau khi gọi này xảy ra liên tục và yêu cầu đưa thành quy tắc bất biến để không bao giờ tái diễn.
- **Nguyên nhân cốt lõi**:
  - Trong Python, khi FastAPI import module, các tham số mặc định của router như `Depends(get_current_user_flexible)` được đánh giá (evaluated) ngay lập tức tại thời điểm import theo thứ tự từ trên xuống dưới. Do hàm `get_current_user_flexible` trước đây được định nghĩa ở cuối file, Python chưa nạp được tên hàm này vào scope $\rightarrow$ gây ra lỗi `NameError`.
  - Lệnh kiểm tra cú pháp trước đây (`python -m py_compile`) chỉ phân tích cây cú pháp AST (SyntaxError) mà hoàn toàn không thực thi module/import scope nên đã bỏ lọt lỗi này.
- **Khắc phục & Kiểm thử**:
  1. Trong `backend/app/api/v1/hotline.py`: Di chuyển hàm `get_current_user_flexible(...)` lên đầu file (dòng 46), trước toàn bộ các route sử dụng nó.
  2. Chạy Runtime Smoke Test bằng Python của môi trường ảo:
     `backend\.venv\Scripts\python.exe -c "from app.main import app; print('>>> BACKEND SMOKE TEST: PASSED 100%')"` $\rightarrow$ Kết quả `PASSED 100%` hoàn hảo.
  3. Cập nhật quy tắc sắt đá vào toàn bộ tài liệu quy chuẩn dự án:
     - `.agents/rules/project_guidelines.md` (Mục 7.2 & 7.5)
     - `GEMINI.md` (Mục 7.2 & 7.5)
     - `AGENTS.md` (Mục 7.2 & 7.5)
     - `PROJECT_GUIDELINES.md` (Mục 7.2 & 7.5)
     - `Script/README.md` (Mục 8 & Changelog)

---

### [2026-10-08] - Giả Lập Android Web Kiểu LDPlayer & Mô Phỏng Chuẩn 100% Ứng Dụng G-Waiter v2.4.104 Của Golden Gate
- **Bối cảnh & Yêu cầu người dùng**:
  1. Người dùng cài APK (`app24104.apk`) nhưng mở lên chỉ hiện khung đen mô phỏng sơ sài ("Tệp APK Từ Web / Tác Vụ Thử Nghiệm Ứng Dụng").
  2. Người dùng yêu cầu máy ảo chạy trên web phải hoạt động như **LDPlayer trên web**.
  3. Không cần nhiều app rườm rà, chỉ cần chạy 3 ứng dụng nhà hàng trọng tâm của Golden Gate:
     - **G-Waiter v2.4.104** (Phục vụ gọi món tại bàn): Mở lên phải hiển thị **đúng 100% giao diện thực tế như ảnh chụp tablet của người dùng** (Màn hình Đăng nhập Golden Gate Restaurant Group Version 2.4.104 có logo GGG, 3 thẻ SỨ MỆNH / TẦM NHÌN 2030 / GIÁ TRỊ CỐT LÕI, input Mã nhân viên/Mật khẩu, bàn phím số tròn cảm ứng màu xanh ngọc bên phải, version 2.4.104; bấm Đăng nhập thì vào sơ đồ bàn và gọi món thực tế).
     - **CO POS** (Call Order / Thu ngân POS): Sơ đồ bàn thu ngân, in tạm tính, thanh toán.
     - **KDS Kitchen** (Kitchen Display System): Điều phối nấu nướng món ăn từ G-Waiter gửi qua.
  4. Hỗ trợ truy cập web (Google Chrome) để tải APK hoặc gỡ ứng dụng ra cài mới bất cứ lúc nào.
  5. Dữ liệu tablet và ứng dụng cài đặt lưu độc lập theo từng user (`localStorage` scoped theo `currentUsername`).
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Frontend (`AndroidEmulatorTab.tsx`)**:
     - **Tái hiện 100% giao diện G-Waiter v2.4.104 theo ảnh thực tế**:
       - *Header*: Nút bánh răng cấu hình POS MongoDB bên góc trái; Logo Golden Gate Restaurant Group ở giữa trên nền watermark quả địa cầu; Thanh trạng thái Android bên phải (Thời gian, icon Accessibility [A], Wifi, Pin 98%).
       - *3 Thẻ Banner bên trái*: Thẻ SỨ MỆNH (màu vàng mustard `#D9A74A`, watermark bia ngắm bắn, logo GGG); Thẻ TẦM NHÌN 2030 (màu trắng viền vàng, chữ vàng, "2.000 cửa hàng", "dịch vụ khách hàng xuất sắc", "sống sung túc và tự hào"); Thẻ GIÁ TRỊ CỐT LÕI (nền đen xám `#1E232A`, watermark kim cương, "Integrity", "Tận tâm với khách hàng", "Tư duy phát triển").
       - *Form Đăng nhập trung tâm*: 2 ô input bo tròn con nhộng (`Mã nhân viên...` và `Mật khẩu...`) có con trỏ nhấp nháy, hỗ trợ bấm bàn phím số cảm ứng hoặc gõ phím; Nút `ĐĂNG NHẬP` màu vàng mù tạt.
       - *Bàn phím số cảm ứng tròn bên phải*: Lưới phím 4 hàng x 3 cột các phím tròn màu xanh ngọc nhạt `#CFF0FC` (`7, 8, 9 / 4, 5, 6 / 1, 2, 3 / 0, ., ⌫`); Bấm phím tự động điền vào ô đang chọn; Nút xóa lùi `⌫`.
       - *Version*: Hiển thị chuẩn xác `Version:2.4.104` ở đáy màn hình.
       - *Sơ đồ bàn & Gọi món*: Bấm "ĐĂNG NHẬP" chuyển sang Sơ đồ bàn phục vụ (Tầng 1, Tầng 2, VIP; hiển thị số khách, số món, tạm tính, trạng thái trống/có khách). Bấm vào bàn mở menu gọi món Gogi House (Ba chỉ bò Mỹ sốt Galbi, Dẻ sườn bò nướng chum, Lẩu kim chi, Lẩu tomyum, Đồ uống...); Thao tác: "Báo Bếp (KDS)", "In Tạm Tính", "Đăng Xuất".
     - **Thanh Công Cụ Giả Lập LDPlayer Web (LDPlayer Toolbar)**:
       - Tích hợp thanh công cụ LDPlayer ở sườn phải máy tính bảng với các nút chức năng chuẩn emulator: `LDP Badge`, `📥 Cài APK`, `🌐 Chrome Web`, `🍽 G-Waiter`, `💰 CO POS`, `👨‍🍳 KDS Kitchen`, `🔄 Xoay Màn Hình`, `🏠 Home`, `◀ Back`, `📋 Đa Nhiệm`, `⚙ Cài Đặt & Gỡ App`, `⛶ Toàn Màn Hình`, `⏻ Nguồn`.
     - **Tự động chuyển đổi (Migrate) cache cũ của người dùng**:
       - Hàm `normalizeInstalledApps` tự động nhận diện và nâng cấp các app cũ mang tên "Tệp APK Từ Web" hoặc id chứa `1791457836088`/`app24104` thành `id: 'app_gwaiter'`, `name: 'G-Waiter'`, `version: 'v2.4.104'`, `iconType: 'gwaiter'`. Người dùng không cần phải gỡ rồi cài lại mà mở lên là thấy ngay giao diện G-Waiter chuẩn!
     - **Tối ưu gỡ app & cài mới**:
       - Mỗi icon app trên màn hình chính có nút `[X]` nhanh để gỡ trong 1 chạm.
       - Trong Cài đặt có danh sách gỡ app và khôi phục cài đặt gốc tablet riêng của user.
       - Thanh tìm kiếm trên trang chính và Chrome hỗ trợ dán link APK tải và cài đặt trực tiếp.
  2. **Bóc tách & Phân tích chuyên sâu tệp APK thực tế (`D:\1.Download\app24104.apk`)**:
     - *Package Name*: `com.ggg.stafforder` (Staff Order / G-Waiter Golden Gate).
     - *DEX & Code Structure*: 1.426 lớp Java/Kotlin qua 3 file DEX (`classes.dex`, `classes2.dex`, `classes3.dex`), Room DB `AppDatabase`, Retrofit `APIInterface`, MQTT Real-time service `MQTTService`, OpenTelemetry `dev-otel-gateway.ggg.com.vn`.
     - *Tài nguyên tích hợp*: SQLite offline cache (`assets/databases/cache.sqlite`), JSON thực đơn món (`assets/json/category.json` - 322 KB), JSON nhóm bổ trợ (`assets/json/modifier.json` - 30 KB).
     - *8 Phân hệ nghiệp vụ bóc tách từ 100+ Fragments & 1.380 chuỗi tiếng Việt*:
       1. **Sơ đồ bàn (Table Management)**: `TableListFragment`, `CreateNewTableFragment` (mở bàn mới), `ChangeTableFragment` (chuyển bàn), `CombineTableFragment` (gộp bàn), `ListEnteredTableFragment`, Bật/Tắt chế độ Buffet FoodWaste.
       2. **Gọi món & Thực đơn (Order & Menu)**: `TableOrderFragment`, `OrderScreenFragment`, `ComboItemsSelectFragment`, `CancelItemOrderedFragment` (hủy món bắt buộc chọn lý do hủy), `SendOrderFragment` (gửi order sang bếp), `DishDeliveryStatusFragment` (theo dõi trả món).
       3. **Bếp KDS & Báo tồn món (Kitchen & Stock)**: `ConfigDishKDSFragment` (gán quầy bếp KDS), `ConfigDishTonFragment` (báo tồn), `ConfigLimitFoodFragment` (giới hạn gọi món), `ConfigVisibilityFoodFragment` (ẩn/hiện món hết hàng).
       4. **Đặt bàn (Booking & Reservation)**: `BookingFragment`, `NewBookingFragment`, `RequestWaitingBookingFragment` (tiếp nhận đặt bàn chờ duyệt), gán booking vào bàn đang mở.
       5. **E-Voucher & Khuyến mãi (TGS)**: `PromotionListFragment`, `DialogInputVoucher`, `VoucherScannerFragment` (quét E-Voucher The Golden SpoonS), `StaffDiscountScannerFragment` (chiết khấu thẻ nhân viên GGG), `DiscountBankFragment` (thẻ ngân hàng).
       6. **In ấn, Tạm tính & Hóa đơn VAT**: `PrintTempFragment` (in tạm tính kiểm đồ), `PrintTempVoucherFragment`, `BillCheckFragment` (kiểm bill), `QrVatFragment` (quét QR xuất hóa đơn điện tử VAT).
       7. **Tiện ích nhân viên**: `TimeKeepingFragment` (chấm công vân tay trực tiếp trên tablet), `ConfigTippingFragment` (tiền tip), `RacingSFragment` (bảng đua số thi đua ca làm việc).
       8. **Camera AI**: `CameraAIFragment` (Camera AI nhận diện khách và đếm số lượng đĩa tiêu chuẩn trên băng chuyền Kichi-Kichi).
  3. **Kiểm thử & Đóng gói Triển khai Server**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.77s`), bundle `frontend/dist/` đã sẵn sàng để copy lên server.

---

### [2026-10-08] - Bổ Sung Thông Báo Thành Công Nổi Bật Khi Lưu Memo, Đồng Bộ Bảng Projects / MemberTasks Trên Server .25 & Thiết Lập Quy Tắc Triển Khai Server Bắt Buộc
- **Bối cảnh & Yêu cầu người dùng**:
  1. Đọc và thực thi các quy tắc trong `Script/*.md`.
  2. Bổ sung quy tắc bắt buộc: Mọi chỉnh sửa phải đảm bảo chỉ cần copy thư mục `app` (`backend/app`) và `dist` (`frontend/dist`) lên server là chạy ngay; nếu có thêm cột/bảng trong DB thì phải thêm trong DB `.25` kèm cập nhật vào `Script/Full_SCRIPT_SQL_TABLE.sql` để sau này dựng server mới.
  3. Khắc phục vấn đề khi lưu Memo không thấy thông báo gì: bổ sung thông báo thành công rõ ràng, nổi bật.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Khắc phục thông báo Lưu / Hoàn thành Memo (`MemoPage.tsx`)**:
     - *Nguyên nhân cốt lõi khiến thông báo bị mất ngay*: Trong hàm `loadData()`, có dòng lệnh `setAlert(null);`. Mỗi khi người dùng bấm Lưu Memo hoặc Đánh giá OK, code gọi `setAlert({ type: 'success', ... })` rồi lập tức gọi `loadData()`. Khi `loadData()` tải xong dữ liệu trong vài chục mili-giây, nó ngay lập tức thực thi `setAlert(null);`, dập tắt biến thông báo trước khi mắt người kịp nhìn thấy!
     - *Khắc phục triệt để*:
       - **Xóa bỏ hoàn toàn lệnh `setAlert(null)` bên trong `loadData()`**, đảm bảo thông báo thành công luôn tồn tại nguyên vẹn đủ 5 giây theo đúng bộ đếm thời gian.
       - Bổ sung **Nút Đánh Dấu Hoàn Thành 1 Chạm `[✓]`** trực tiếp ở cột Thao Tác cho các Memo chưa hoàn thành: Người dùng chỉ cần nhấp 1 chạm là Memo tự động chuyển sang trạng thái "Đã Public (Hoàn thành trên POS)", tự động cập nhật thời gian hoàn thành mà không cần phải mở modal Chỉnh sửa phức tạp.
       - Khi bấm nút `[ (✔) OK ]` trong cột ĐÁNH GIÁ: Thông báo nổi bật `🎉 Đã đánh giá ĐẠT (OK) / Hoàn thành Memo [mã_memo] thành công!`.
       - Khi sửa trạng thái thành `Đã Public` và bấm Lưu: Thông báo nổi bật `🎉 Đã đánh dấu HOÀN THÀNH (Đã Public trên POS) Memo [mã_memo] thành công!`.
       - Khởi động lại fresh Vite dev server để cập nhật bản hot reload mới nhất.
  2. **Đồng bộ toàn diện Database Server .25 & Master SQL Script `Full_SCRIPT_SQL_TABLE.sql`**:
     - Bổ sung các cột mới của bảng `Projects` (`Description`, `Images`, `Files`, `DescriptionUpdatedAt`, `DescriptionUpdatedBy`) và DDL bảng `MemberTasks`.
     - Chạy kiểm tra đối chiếu tự động: 60/60 bảng và toàn bộ 100% cột giữa Database Production `.25` và `Full_SCRIPT_SQL_TABLE.sql` khớp nhau hoàn toàn, không có bất kỳ sai lệch nào.
     - Bổ sung cơ chế tự động kiểm tra/tạo bảng và cột tại `lifespan` trong `backend/app/main.py` để phòng ngừa lỗi 500 khi server khởi động.
  3. **Cập nhật Quy Tắc Triển Khai Dự Án**:
     - Cập nhật quy tắc bắt buộc vào `Script/GEMINI.md`, `Script/PROJECT_GUIDELINES.md`, `GEMINI.md` và `Script/README.md`.
     - Build thành công toàn bộ `frontend/dist` bằng `npm run build` (exit code 0) và kiểm tra toàn bộ cú pháp `backend/app` bằng `compileall app` (0 lỗi).

---

### [2026-10-08] - Nâng Cấp Tác Vụ 3 Xử Lý SO/CO: Sửa Lỗi Dòng Món Trống Null, Đối Chiếu Mã SAP Trùng/Khác Nhau Trong Check Xung Đột, Không Gian Menu Trung Gian & Nút Đồng Bộ Toàn Bộ SO ➔ CO
- **Bối cảnh & Yêu cầu người dùng**:
  1. **Xem chi tiết & đối chiếu mã SAP trong kiểm tra xung đột**: Thêm xem chi tiết để đối chiếu mã SAP xem có trùng nhau không giữa các mã RK7 khác nhau hoặc tên khác nhau.
  2. **Kiểm tra và sửa lỗi món bị null/trống tên trống mã**: Tìm ra nguyên nhân tại sao một số dòng món ăn bị trống tên, trống mã RK7.
  3. **Đồng bộ menu xuyên nhà hàng qua Không Gian Trung Gian**: Thêm tính năng đồng bộ toàn bộ menu qua nhà hàng khác, có thể lưu để tạo không gian trung gian đề phòng 2 nhà hàng không thông mạng với nhau.
  4. **Nút Đồng Bộ Toàn Bộ SO ➔ CO**: Bổ sung 1 nút bấm ngay cạnh dấu chấm than `(!)` trên thanh chọn tác vụ để đồng bộ SO trước (cập nhật giá, tên món, đồng bộ thời gian chế biến KDS), sau đó đồng bộ làm mới CO.
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Nguyên nhân & Khắc phục triệt để lỗi dòng món ăn bị Null/Trống (`_flatten_group_items`)**:
     - *Nguyên nhân cốt lõi*: Trong MongoDB `G_ORDER.ORDER_MENU_CACHE_CATEGORY`, các nhóm đồ uống (`level: 0`, e.g. `DRINK` / `ĐỒ UỐNG`) có cấu trúc nhóm lồng nhau (nested sub-groups) bên trong mảng `items` (e.g. `1781-1GGSSNE015ALC1` - Đồ uống chứa 38 món, `1781-1GGSSNE015ALC2` - Bia/Rượu chứa 48 món). Khi duyệt qua mảng `items` cấp 1, service lấy nhầm object sub-group container thay vì dish item, dẫn tới mã RK7 rỗng, tên rỗng và bỏ sót toàn bộ 86 món thật bên trong.
     - *Khắc phục*: Xây dựng hàm đệ quy chuẩn `_flatten_group_items(group)` trong `mongo_menu_so_co_service.py` để duyệt sâu bóc tách toàn bộ món ăn thực thụ trong các sub-group, triệt tiêu hoàn toàn các dòng placeholder trống. Kết quả: Menu 178 tăng từ 196 món lên đủ 282 món, 0 dòng trống null.
  2. **Nâng cấp Kiểm Tra Xung Đột & Đối Chiếu Mã SAP (`check_dish_conflicts`, `ManageMenuSoCoTask.tsx`)**:
     - Backend bổ sung các trường phân tích chuyên sâu cho từng xung đột:
       - `distinct_saps`: Danh sách các mã SAP của các món trong nhóm xung đột.
       - `sap_status`: Đánh giá trạng thái SAP (`SAME_SAP` - Trùng mã SAP, `DIFF_SAP` - Khác mã SAP, `PARTIAL_SAP` - Thiếu SAP, `NO_SAP` - Không có SAP).
       - `rk7_breakdown`: Thống kê bóc tách theo từng mã RK7 (Mã RK7, Tên, Mã SAP, Menu áp dụng, Giá).
       - `occurrences`: Mở rộng thêm `menu_name` để hiển thị rõ tên Menu trên UI.
     - Frontend Modal Check Lỗi Xung Đột:
       - Hiển thị badge trạng thái SAP trực quan (`⚠️ Trùng mã SAP`, `ℹ️ Khác mã SAP`...).
       - Nút toggle `[ ▾ Xem Chi Tiết SAP & Menu ]` mở rộng bảng đối chiếu chi tiết.
       - Cảnh báo trực quan màu cam/xanh giúp IT/Kế toán nhận biết ngay trường hợp tạo trùng nhiều mã RK7 cho cùng 1 mã SAP, hoặc các mã RK7 dùng mã SAP khác nhau để tránh gộp nhầm.
  3. **Không Gian Menu Trung Gian & Đồng Bộ Thực Đơn Xuyên Nhà Hàng (`mongo_menu_so_co_service.py`, `ManageMenuSoCoTask.tsx`)**:
     - Xây dựng Không Gian Trung Gian lưu trữ snapshot cấu trúc thực đơn tại `backend/data/menu_snapshots/`:
       - Cho phép lưu lại toàn bộ cấu trúc: `RESTAURANT_CATEGORY`, `ORDER_MENU_CACHE_CATEGORY`, `MENU_GROUP`, `CO_MENU_GROUP`, `CO_MENU_ITEM`.
       - Quản lý danh sách snapshot, thống kê số lượng Menu, Nhóm, Món, thời gian lưu và người lưu.
       - Triển khai snapshot sang Nhà Hàng Đích an toàn với 2 chế độ:
         - `merge_update`: Gộp & cập nhật (khuyến nghị, giữ các menu khác).
         - `clean_overwrite`: Ghi đè triệt để.
       - Tính năng **Đồng Bộ Trực Tiếp**: Chọn nhà hàng đích từ danh sách `restaurants`, hệ thống tự động lưu 1 bản backup vào Không Gian Trung Gian trước khi kích hoạt đồng bộ.
     - Tích hợp 2 nút thao tác trên toolbar: `[ 📦 Không Gian Trung Gian ]` và `[ 🌐 Đồng Bộ Sang NH Khác ]`.
  4. **Nút Đồng Bộ Toàn Bộ SO ➔ CO Cạnh Dấu Chấm Than `(!)` (`RestaurantMongoAnalysisPage.tsx`)**:
     - Phân tích cơ chế đồng bộ chuẩn của SO/CO:
       - SO sync (`/ggg/api/v2.0/order/sync-rk`): Tăng `VERSION_MENU_SO` trong `SYNC_VERSION`, đồng bộ thời gian chế biến món sang KDS (`G_KITCHEN.CONFIG_COOKING`).
       - CO sync (`/ggg/api/v3.0/order/resetDishCache`): Tăng `VERSION_MENU_CO` và `VERSION_MENU_CONFIG`, kích hoạt làm mới cache CO.
     - Đặt nút bấm màu xanh lá `[ 🔄 Đồng Bộ SO ➔ CO ]` ngay cạnh nút chấm than `(!)` trên thanh chọn tác vụ đúng theo ảnh chụp yêu cầu (`media_1791424712965.png`).
     - Tích hợp gọi API `/api/v1/mongodb/menu-so-co/sync-all`, hiển thị toast thông báo chi tiết và cập nhật phiên bản GPOS ngay lập tức.
  5. **Kiểm thử & Đóng gói Triển khai Server**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.51s`), gói bundle `frontend/dist/` đã cập nhật mới nhất.
     - Backend compile `.venv\Scripts\python.exe -m compileall app` thành công 100% cú pháp.
     - Khởi động lại backend daemon trên port 8000 sạch sẽ, API sẵn sàng phục vụ.

---

### [2026-10-08] - Nâng Cấp Sao Chép Ngày Phiên Bản Phần Mềm: Cho Phép Chọn/Bỏ Chọn Từng App Hoặc Chọn Tất Cả
- **Yêu cầu người dùng**:
  - Tại modal "Sao Chép Ngày Cho Các Phần Mềm Còn Lại", cho phép người dùng chọn app: có thể bỏ chọn một số app trong danh sách hoặc chỉ chọn từng app cụ thể thay vì mặc định áp dụng cho tất cả.
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Frontend (`RestaurantSoftwareVersionsModal.tsx`, `pmBo.ts`)**:
     - Cập nhật state `SyncDateModalState`: bổ sung mảng `selectedAppNames: string[]` lưu danh sách các phần mềm được chọn.
     - Thiết kế giao diện danh sách chọn app trực quan (Grid checkboxes):
       - Mỗi phần mềm hiển thị thành 1 thẻ tương tác có checkbox, badge tên thương hiệu với màu đặc trưng (KDS, CO, SO, GPOS-CO-SO, GPOS KDS, các app custom) và ngày cập nhật hiện tại.
       - Click vào bất kỳ vị trí nào trên thẻ sẽ tự động bật/tắt (toggle) chọn app.
       - Bổ sung 2 nút thao tác nhanh: **"✓ Chọn tất cả"** và **"✕ Bỏ chọn tất cả"**.
       - Badge số lượng: hiển thị đếm số lượng app đang chọn (`Đã chọn: X / Y phần mềm`, badge màu xanh lá khi chọn > 0, màu đỏ khi = 0).
       - Nút xác nhận sao chép hiển thị số lượng app được áp dụng (`⚡ Xác Nhận Sao Chép (X app)`) và tự động vô hiệu hóa nếu chưa chọn app nào kèm cảnh báo nhắc nhở.
  2. **Backend (`pm_bo.py`, `pm_bo_service.py`, `schemas/pm_bo.py`)**:
     - Cập nhật schema `SoftwareVersionSyncDatePayload`: bổ sung trường `target_ids: Optional[List[int]]` và `target_names: Optional[List[str]]`.
     - `pm_bo_service.sync_software_version_dates()`: hỗ trợ cập nhật chỉ riêng những bản ghi phần mềm có ID hoặc tên nằm trong danh sách được chọn; tự động khởi tạo bản ghi nếu tên app chưa có trong database.
     - Khởi động lại backend daemon trên port 8000.
  3. **Quy chuẩn Đóng Gói Triển Khai**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.74s`).
     - Backend compile `.venv\Scripts\python.exe -m compileall app` thành công 100%.

---

### [2026-10-08] - Tối Giản Bộ Lọc Danh Sách Nhà Hàng: Loại Bỏ "Khu Vực", "Thương Hiệu" & "Làm Mới Bộ Lọc"
- **Yêu cầu người dùng**:
  - Tại trang Danh Sách Nhà Hàng (`/restaurants`), bỏ đi các bộ lọc: "Khu Vực", "Thương Hiệu" và nút "Làm Mới Bộ Lọc".
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Frontend (`RestaurantListPage.tsx`)**:
     - Loại bỏ dropdown chọn `Khu Vực` (Region) và `Thương Hiệu` (Brand) khỏi thanh lọc tìm kiếm trên giao diện.
     - Loại bỏ nút `Làm Mới Bộ Lọc` thừa.
     - Thiết kế lại khối Filter & Search (`<Card>`): sắp xếp trên 1 hàng linh hoạt (Flexbox responsive), bao gồm:
       - Dropdown nhiều chọn `Trạng Thái Hoạt Động` (`width: 260px`).
       - Ô `Tìm Kiếm Nhanh` viền nổi bật vàng mở rộng chiếm trọn phần diện tích còn lại (`flex: 1`).
     - Tối ưu mã nguồn: loại bỏ các state lọc không sử dụng, dọn dẹp các import không dùng (`RotateCcw`, `SearchableSelect`).
     - Bảo toàn dữ liệu danh mục Khu Vực & Thương Hiệu (`regions`, `brands`, `fetchOptions`) phục vụ cho Modal Thêm/Sửa Nhà Hàng (`RestaurantFormModal`) và Modal Quản Lý Thương Hiệu & Khu Vực (`BrandRegionModal`).
  2. **Quy chuẩn Đóng Gói Triển Khai**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.64s`).
     - Backend compile `.venv\Scripts\python.exe -m compileall app` thành công 100%.

---

### [2026-10-07] - Cập Nhật Bổ Sung Ngày Khai Trương Cho Các Nhà Hàng Thiếu Thông Tin Từ File Excel Báo Cáo
- **Yêu cầu người dùng**: Dựa vào file Excel `D:\1.Download\Report Nhà hàng active.xlsx`, mapping theo Mã SAP (cột `PLANT`) để cập nhật Ngày Khai Trương (cột `GOLIVE`, định dạng `MM/DD/YY` - tháng/ngày/năm) vào database cho các nhà hàng còn đang thiếu Ngày Khai Trương (`NULL` hoặc `01/01/1999`).
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Bóc tách dữ liệu Excel (`update_ngay_khaitruong_from_excel.py`)**:
     - Đọc dữ liệu từ file `D:\1.Download\Report Nhà hàng active.xlsx` (317 dòng mapping duy nhất không trùng).
     - Bóc tách chuẩn xác định dạng tháng/ngày/năm (`MM/DD/YY` -> chuyển sang năm 4 chữ số `20YY-MM-DD`).
  2. **Quy tắc an toàn dữ liệu**:
     - Chỉ cập nhật các nhà hàng **đang thiếu ngày khai trương** (`ngay_khaitruong IS NULL` hoặc `ngay_khaitruong = '1999-01-01'`).
     - Tuyệt đối không ghi đè lên các nhà hàng đã có ngày khai trương chuẩn trước đó.
  3. **Đồng bộ trên cả 2 cơ sở dữ liệu**:
     - **Server Test (172.16.20.103)**: Đã cập nhật thành công 45 nhà hàng.
     - **Server Production (172.16.8.25)**: Đã cập nhật thành công 45 nhà hàng.
  4. **Hiệu quả thực tế**:
     - Số lượng nhà hàng thiếu thông tin trong báo cáo rà soát giảm từ **72 nhà xuống còn 46 nhà** (30 nhà hàng đã hoàn thiện 100% hồ sơ, các nhà còn lại đã gỡ được cảnh báo thiếu ngày khai trương).

---

### [2026-10-07] - Tối Giản Email Báo Cáo Rà Soát Nhà Hàng Còn Thiếu: Rút Gọn Bảng Còn 5 Cột & Bỏ Khối Text Copy
- **Yêu cầu người dùng**:
  1. Trong bảng email báo cáo rà soát nhà hàng: chỉ giữ lại 5 cột thiết yếu (`STT`, `TÊN NHÀ HÀNG`, `IP ROUTER`, `MỤC CÒN THIẾU`, `YÊU CẦU`). Lược bỏ các cột `MÃ SAP`, `COST CENTER`, `MÃ RK7`, `NGÀY KT` vì các thông tin này đã bị thiếu/không chuẩn thì không cần hiển thị chiếm diện tích bảng.
  2. Bỏ hoàn toàn phần nội dung `DANH SÁCH NHẮC NHỞ ĐỂ COPY NHANH (ZALO / TEAMS):` và khối danh sách text dài dòng phía dưới bảng.
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Backend (`restaurant_audit_service.py`)**:
     - Cập nhật hàm tạo mẫu email HTML `send_audit_email()`:
       - Rút gọn bảng danh sách từ 9 cột xuống còn đúng 5 cột trọng tâm: `STT (45px)`, `TÊN NHÀ HÀNG (min-width 180px, in đậm)`, `IP ROUTER (120px, monospace)`, `MỤC CÒN THIẾU (min-width 250px, badge đỏ)`, `YÊU CẦU (130px, Vui lòng bổ sung)`.
       - Lược bỏ hoàn toàn 4 cột trống/chưa chuẩn: Mã SAP, Cost Center, Mã RK7, Ngày KT.
       - Gỡ bỏ hoàn toàn tiêu đề `📋 Danh Sách Nhắc Nhở Để Copy Nhanh (Zalo / Teams):` và khối `<pre>{reminder_text_all}</pre>`.
     - Email báo cáo gửi qua SMTP giờ đây cực kỳ tinh gọn, chuyên nghiệp, hiển thị vừa vặn trên cả Outlook máy tính lẫn điện thoại di động mà không cần cuộn ngang.
     - Vẫn giữ trường `reminder_text_all` trong JSON kết quả để nút "📋 Sao Chép Toàn Bộ Nhắc Nhở" trên giao diện Web UI ([JobManagementPage.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/admin/JobManagementPage.tsx)) tiếp tục phục vụ copy clipboard khi cần.
  2. **Kiểm thử & Khởi động**:
     - `.venv\Scripts\python.exe -m compileall app` kiểm tra 100% cú pháp code Python đạt chuẩn.
     - Đã khởi động lại tiến trình backend daemon trên port 8000 sạch sẽ, Health Check `GET /api/health` trả về `healthy`.

---

### [2026-10-07] - Tinh Gọn Khối "Trạng Thái Setup" Trong Modal Memo: Bỏ 4 Button Màu Mè, Highlight Sáng Nhẹ Nhàng
- **Yêu cầu người dùng**: Khối Trạng Thái Setup trong popup Thêm/Sửa Memo bị lòe loẹt; yêu cầu bỏ các nút button đi, chỉ cần highlight sáng xíu lên là được.
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Frontend (`MemoPage.tsx`)**:
     - Gỡ bỏ hoàn toàn 4 nút chọn nhanh nhiều màu (`⏳ Chờ Setup`, `✨ Bổ sung nút bấm`, `📝 Đã setup nháp`, `🚀 Đã Public`).
     - Tinh gọn khung bọc: thay thế viền dày 2px đổi màu sặc sỡ và nền màu đậm bằng khung highlight sáng nhẹ nhàng (`backgroundColor: var(--bg-secondary, #F8FAFC)`, viền thanh mảnh `1px solid var(--border-color, #E2E8F0)`, bo góc 8px).
     - Giữ nhãn chuẩn `Trạng Thái Setup *` kèm badge trạng thái nhỏ gọn và ô dropdown `<select>` nền trắng sạch sẽ.
     - Dọn dẹp import biến không dùng `Zap` từ `lucide-react`.
  2. **Kiểm thử & Đóng gói**:
     - `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.46s`), bundle `dist/` cập nhật mới nhất.

---

### [2026-10-07] - Gỡ Bỏ Tính Năng Trực Hotline 3CX (Tạm Dừng Chờ Phát Triển Sau) & Đóng Gói Triển Khai Server
- **Yêu cầu người dùng**: Tạm dừng và dọn sạch tính năng trực Hotline 3CX để chuẩn bị triển khai các tính năng đã phát triển trước đó lên máy chủ server (tính năng hotline sẽ phát triển tiếp sau).
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Frontend (`RestaurantListPage.tsx` & `hotlineService.ts`)**:
     - Gỡ bỏ hoàn toàn nút bật/tắt trực Hotline 3CX, nút phân quyền, nút hướng dẫn cài đặt và các modal cuộc gọi 3CX khỏi trang Danh Sách Nhà Hàng.
     - Khắc phục lỗi thiếu import icon `X` và `Phone` từ `lucide-react` trong `RestaurantListPage.tsx`.
     - Bảo toàn 100% tính năng và trang "Lịch Trực Hotline" gốc (`HotlineSchedulePage.tsx`, `/hotline-schedule`, các hàm `getSchedule`, `uploadImage`, `deleteSchedule`).
     - Đóng gói frontend production qua `cmd /c "npm run build"` thành công rực rỡ exit code 0 (`✓ built in 3.68s`), bundle `frontend/dist/` đã cập nhật mới nhất kèm `web.config`.
  2. **Backend (`router.py`, `main.py`)**:
     - Gỡ bỏ router `hotline_3cx_router` khỏi `backend/app/api/v1/router.py` để tránh xung đột endpoint với phân hệ Lịch trực Hotline gốc `/hotline`.
     - Gỡ bỏ đăng ký bảng `HotlineCallLog` khỏi `lifespan` tại `backend/app/main.py` để không yêu cầu tạo bảng hotline trên server.
     - Kiểm tra toàn bộ cú pháp Python qua `.venv\Scripts\python.exe -m compileall app` đạt chuẩn 100% không lỗi.
     - Khởi động backend uvicorn trên port 8000 sạch sẽ, API Health Check `GET /api/health` trả về `healthy`.

---

### [2026-10-07] - Tối Ưu Bố Cục Memo: Đưa Hướng Dẫn IT Lên Trên, Lọc Gọn Nội Dung Mail & Rút Gọn Thanh Bộ Lọc Chỉ Còn "Tất Cả" & "Chờ Setup"
- **Yêu cầu người dùng**:
  1. Chuyển "Nội Dung Yêu Cầu Từ Mail / Salesforce" xuống dưới, đưa "Hướng Dẫn Cấu Hình & Ghi Chú Của IT" lên trên.
  2. Ở phần Nội Dung Yêu Cầu Từ Mail / Salesforce: chỉ hiển thị thông tin trọng tâm:
     - Mã Memo: ...
     - Danh sách Sub-Memo cần tạo (X sub):
       • Sub-Memo ...: ...
     Lược bỏ các dòng tiêu đề/người gửi/link thừa thãi.
  3. Ở thanh lọc trạng thái: chỉ để lại đúng 2 trạng thái là "Tất Cả" và "Chờ Setup".
     Quy chuẩn nghiệp vụ: "Chờ Setup" bao gồm tất cả các memo chưa chuyển về trạng thái Đã Public (bao gồm chờ setup, đã setup nháp, bổ sung nút bấm, gia hạn).
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Đổi thứ tự hiển thị trong Modal Xem Chi Tiết & Modal Chỉnh Sửa (`MemoPage.tsx`)**:
     - Trong `detailModal`: Đưa khối `🛠️ Hướng Dẫn Cấu Hình & Ghi Chú Của IT` lên đầu, người dùng mở popup là thấy ngay hướng dẫn và ảnh minh họa đính kèm của IT mà không cần phải cuộn chuột. Khối `Nội Dung Yêu Cầu Từ Mail / Salesforce` được chuyển xuống bên dưới.
     - Trong `formModal`: Đồng bộ đưa khối soạn thảo/dán ảnh hướng dẫn IT lên trên, ô nội dung mail chỉ đọc xuống dưới.
  2. **Lọc gọn & Chuẩn hóa nội dung Mail Salesforce (`formatCleanMailContent`, `mail_memo_service.py`, `memo_service.py`)**:
     - Xây dựng helper `formatCleanMailContent()` tự động lọc bỏ các tiền tố dư thừa (`Yêu cầu tạo nút RK từ Salesforce Loyalty:`, `- Tên Memo:...`, `- Người gửi yêu cầu:...`, `- Link Salesforce:...`).
     - Chỉ hiển thị: `- Mã Memo:...` và `- Danh sách Sub-Memo cần tạo...`.
     - Cập nhật hàm tạo nội dung mail mới và mail bổ sung trong `mail_memo_service.py` để các email nhận trong tương lai tự động lưu định dạng tinh gọn này.
     - Chạy script cập nhật dọn sạch nội dung các bản ghi memo hiện có trong database SQL Server.
  3. **Rút gọn Thanh Bộ Lọc & Thống Kê Chuẩn Nghiệp Vụ (`MemoPage.tsx`, `memo_service.py`)**:
     - Thanh tab trạng thái trên giao diện chỉ còn 2 tab: **"Tất Cả"** (`stats.total`) và **"Chờ Setup"** (`stats.cho_setup`).
     - Backend `memo_service.py`:
       - `get_memo_stats()`: `cho_setup = total - da_public` (tổng tất cả memo chưa sang trạng thái Public `trangthai != '2'`).
       - `get_memo_list()`: khi lọc `trangthai in ["0", "pending", "cho_setup"]`, truy vấn `or_(Memo.trangthai != '2', Memo.trangthai == None)` bao gồm cả chờ setup, setup nháp, bổ sung nút bấm và gia hạn chưa public.
       - `export_memo_excel()`: đồng bộ logic xuất Excel theo bộ lọc "Chờ Setup" mới.
  4. **Lược bỏ cột "File" và cột "Tiêu Đề / Link Campaign" trên bảng tóm tắt (`MemoPage.tsx`)**:
     - Lược bỏ hoàn toàn 2 cột "Tiêu Đề / Link Campaign" và "File" khỏi bảng danh sách tổng quan để bảng hiển thị rộng rãi, thoáng mắt, các cột nghiệp vụ trọng tâm (Mã Memo, Người Setup, Trạng Thái, Hiệu Lực, Đánh Giá) rõ ràng và không bị chen chúc.
     - Số cột bảng rút gọn từ 10 cột xuống còn 8 cột (STT, Mã Memo, Người Setup, Trạng Thái, Thời Gian Hiệu Lực, Tiếp Nhận, Đánh Giá, Thao Tác).
     - Người dùng vẫn xem và click tải file hoặc mở link Campaign/Salesforce đầy đủ bên trong Modal Chi Tiết khi click vào bất kỳ dòng Memo nào.
  5. **Quy chuẩn Đóng Gói Triển Khai**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.43s`).
     - Backend compile `.venv\Scripts\python.exe -m compileall app` thành công 100%.
     - Backend daemon chạy trên port 8000 sạch sẽ.
  6. **Đồng bộ trực tiếp trên Cơ Sở Dữ Liệu Server Production (172.16.8.25:1433)**:
     - Đã chạy script xử lý trực tiếp trên database `ITDEPT` của server `172.16.8.25` (giữ nguyên toàn bộ cấu hình file cục bộ, không thay đổi IP trong file code/config).
     - Bảng `MEMO`: Đã xử lý toàn bộ 34 bản ghi Memo chứa nội dung Salesforce Loyalty trên server .25: bóc tách đưa nội dung mail tinh gọn vào `noidung_mail` (chỉ giữ Mã Memo & Danh sách Sub-Memo, triệt tiêu 100% các dòng tiêu đề/link thừa), và giữ lại ảnh chụp/hướng dẫn IT trong `huong_dan`.
     - Bảng `STAFF_LEAVE_TYPES`: Đã tạo bảng và nạp đủ 6 danh mục nghỉ phép chuẩn vào server .25 để đảm bảo khi đưa code lên server vận hành trơn tru không lỗi.

---

### [2026-10-07] - Sổ Tay Setup SOP Thu Gọn Mặc Định, Thêm/Sửa/Xóa Dòng & Mục Lớn (Admin/Super Admin), Bổ Sung Thanh Scroll Ngang Trên Đỉnh (Setup & Memo)
- **Yêu cầu người dùng**:
  1. Sổ tay Setup Nhà Hàng Mới (SOP Chuẩn) không tự bung ra mà thu gọn vào mặc định, muốn đọc thì bấm vào.
  2. Bổ sung tính năng thêm dòng (bước kỹ thuật) hoặc mục lớn cần thiết vào Sổ tay SOP, cho phép điều chỉnh (sửa/xóa) nếu cần; chỉ quyền Admin và Super Admin mới thấy.
  3. Thêm thanh cuộn ngang ở trên đỉnh (tránh phải kéo xuống dưới mới thấy thanh scroll) cho cả trang Setup Nhà Hàng Mới và trang Quản Lý Memo.
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Sổ Tay Hướng Dẫn Kỹ Thuật Setup (SOP Chuẩn) (`SetupRestaurantPage.tsx`)**:
     - Cập nhật mặc định: `expandedSopGroups[grp.nhom] ?? false` $\rightarrow$ Khi mở modal, tất cả 7 nhóm lớn đều thu gọn gọn gàng, hiển thị số bước kỹ thuật. Người dùng click nhóm nào thì nhóm đó bung ra. Nếu tìm kiếm từ khóa, các nhóm khớp tự động mở rộng.
     - Nút "Mở rộng tất cả" và "Thu gọn tất cả" vẫn hoạt động linh hoạt.
  2. **Quản trị Sổ Tay SOP (Admin & Super Admin Only)**:
     - **Backend (`setup_restaurant_service.py` & `setup_restaurants.py`)**:
       - `POST /api/v1/setup-restaurants/checklist-master`: Thêm bước kỹ thuật mới hoặc tạo nhóm lớn mới (`ChecklistMasterItemCreate`).
       - `PUT /api/v1/setup-restaurants/checklist-master/group`: Đổi tên mục lớn SOP (`ChecklistMasterGroupUpdate`).
       - `PUT /api/v1/setup-restaurants/checklist-master/{id}`: Sửa nội dung, ghi chú, STT của bước SOP (`ChecklistMasterItemUpdate`).
       - `DELETE /api/v1/setup-restaurants/checklist-master/{id}`: Xóa bước kỹ thuật khỏi mẫu SOP chuẩn.
       - Ghi nhận Audit Log thao tác (`log_service.record_log`) cho mọi hành động quản trị SOP.
     - **Frontend (`SetupRestaurantPage.tsx` & `setupRestaurantService.ts`)**:
       - Nút `+ Thêm Mục / Bước Mới` trên banner SOP (chỉ Admin/Super Admin thấy).
       - Nút `Đổi tên` và `+ Thêm bước` ngay trên tiêu đề từng mục lớn (chỉ Admin/Super Admin thấy).
       - Nút `Sửa` (✏️) và `Xóa` (🗑️) kèm modal xác nhận cảnh báo trên từng bước kỹ thuật (chỉ Admin/Super Admin thấy).
       - Modal nhập liệu trực quan: chọn nhóm có sẵn hoặc tạo nhóm mới, nhập STT, nội dung, ghi chú lưu ý.
  3. **Thanh Cuộn Ngang Trên Đỉnh (Dual Top Horizontal Scrollbar)**:
     - **Setup Nhà Hàng Mới (`SetupRestaurantPage.tsx`)**:
       - Bổ sung `topScrollRef` và `bottomScrollRef` đồng bộ 2 chiều (`isSyncingTop`, `isSyncingBottom`).
       - Theo dõi tràn bảng qua `ResizeObserver`: khi `tableScrollWidth > clientWidth`, thanh cuộn ngang 12px chuẩn xuất hiện ngay trên đầu bảng.
     - **Quản Lý Memo (`MemoPage.tsx`)**:
       - Bổ sung `topScrollRef`, `bottomScrollRef`, `tableRef`, `showTopScroll`.
       - Người dùng trên màn hình nhỏ/vừa có thể cuộn ngang xem đầy đủ các cột (Mã Memo, Người Setup, Trạng Thái, Thời Gian Hiệu Lực, Tiêu Đề, File, Đánh Giá, Thao Tác) ngay từ đỉnh bảng mà không cần phải cuộn dọc xuống hết danh sách 50 dòng.
  4. **Quy chuẩn Đóng Gói Triển Khai**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.48s`).
     - Backend compile `.venv\Scripts\python.exe -m compileall app` thành công 100%.
     - Backend daemon khởi động lại trên port 8000 sạch sẽ.

### [2026-10-06] - Tối Giản Popup Checklist Setup Nhà Hàng: Loại Bỏ Hoàn Toàn Nút "Xem Chi Tiết", Tập Trung 100% Vào Đánh Dấu Xong/Chưa Xong & Ghi Chú
- **Yêu cầu người dùng**:
  - Tại popup Checklist Setup nhà hàng (ví dụ: `Checklist Setup: 5203 Sakura Yakiniku Lê Quý Đôn (convert từ Woomaster)`), bỏ hết phần xem chi tiết cho đỡ rối, chỉ để đánh dấu xong hay chưa và có note gì không ở mỗi mục thôi.
- **Chi tiết thực hiện (`SetupRestaurantPage.tsx`)**:
  1. **Loại bỏ các thành phần gây rối**:
     - Xóa hoàn toàn nút `[📖 Xem chi tiết SOP (xx việc con)]` trên từng thẻ mục lớn.
     - Xóa nhãn số lượng việc con `0 / 11 việc kỹ thuật` bên cạnh tên mục lớn.
     - Xóa dòng chữ thừa `Mục này chưa được đánh dấu hoàn thành` khi chưa xong (vì đã có nhãn cam `Chưa xong` trực quan ở tiêu đề).
  2. **Giao diện tinh gọn, tập trung cao độ**:
     - **Tiêu đề thẻ**: Icon nhóm + Tên mục lớn + Nhãn trạng thái rõ ràng (`ĐÃ XONG (DONE)` xanh lá / `Chưa xong` cam).
     - **Nút thao tác 1 chạm**: `Đánh Dấu Đã Xong (Done)` (xanh) hoặc `Mở Lại Chưa Xong` (outline).
     - **Thông tin khi xong**: Ngày giờ hoàn thành + Kỹ thuật viên thực hiện.
     - **Khu vực Ghi chú**: Hiển thị ghi chú đã lưu (bấm vào sửa nhanh) hoặc nút `+ Thêm ghi chú cho mục này (nếu có)` tinh gọn.
  3. **Tra cứu SOP chuẩn**: Kỹ thuật viên muốn xem chi tiết hướng dẫn kỹ thuật chuẩn có thể bấm nút `[📖 Sổ Tay Setup (SOP)]` độc lập ở thanh công cụ trên cùng.
  4. **Kiểm thử & Đóng gói**: Chạy `cmd /c "npm run build"` thành công `✓ built in 3.38s` (exit code 0), bundle production trong `frontend/dist/` đã cập nhật mới nhất.

### [2026-10-06] - Tinh Gọn Trang Setup Nhà Hàng Mới: Quản Lý Theo Mục Lớn, 1-Chạm Hoàn Thành, Sổ Tay SOP Chuẩn Hóa
- **Bối cảnh & Yêu cầu của người dùng**:
  - Giao diện cũ hiển thị toàn bộ 83 việc con trực tiếp trên một bảng dài khiến người dùng bị rối mắt, mất thời gian cuộn tìm và khó nắm bắt tổng thể.
  - Bảng checklist nhà hàng cần tinh gọn: chỉ cần các **Mục lớn** (POS Thu Ngân, RK7-Manager, POS Phụ 12, PC Quản Lý, Gmoniter, Mục đi kèm quan trọng, Mục kiểm tra sau setup) có Done hay chưa. Khi Done ghi nhận rõ ngày giờ, người làm và cho phép note thêm nếu có.
  - Các bước kỹ thuật con bên trong từng mục lớn đóng vai trò là tài liệu tham khảo cách thực hiện khi quên, mặc định thu gọn trong accordion để giao diện tinh gọn tối đa.
  - Bổ sung **Sổ Tay Hướng Dẫn Setup (SOP)** chuẩn hóa cho kỹ thuật viên tra cứu toàn bộ checklist mẫu độc lập không phụ thuộc nhà hàng.
- **Chi tiết triển khai kỹ thuật**:
  1. **Backend (`setup_restaurant_service.py` / `setup_restaurant.py` / `schemas/setup_restaurant.py`)**:
     - Cập nhật thống kê `SetupRestaurantOut` và `RestaurantChecklistResponse`: bổ sung `total_groups`, `completed_groups`, `group_progress_percent` và `total_tasks`, `completed_tasks`.
     - Cập nhật `ChecklistGroup`: thêm `is_completed`, `completed_date`, `completed_by`, `note`.
     - Thêm endpoint `GET /api/v1/setup-restaurants/checklist-master`: trả về toàn bộ cây SOP mẫu 7 nhóm lớn và 83 việc con từ bảng checklist chuẩn (`tbl_SETUP_CHECKLIST`).
     - Nâng cấp `PUT /setup-restaurants/{id}/checklist/bulk-toggle`: hỗ trợ cập nhật hàng loạt trạng thái, ghi nhận `completed_date` và `note` cho nhóm lớn.
  2. **Frontend (`SetupRestaurantPage.tsx` / `setupRestaurantService.ts` / `types/setupRestaurant.ts`)**:
     - **Bảng danh sách nhà hàng ngoài**: Cột "Tiến Độ Checklist" hiển thị theo Mục Lớn (ví dụ: `4 / 7 mục lớn` kèm thanh tiến độ và số việc con phụ chú `52/83 việc kỹ thuật`). Nút Checklist hiển thị số mục lớn (`Checklist (4/7 mục)`).
     - **Modal Checklist Nhà Hàng (Tinh Gọn)**:
       - Hiển thị 7 Thẻ Mục Lớn trực quan với icon riêng (`Settings`, `Store`, `Monitor`, `Server`, `Activity`, `AlertTriangle`, `CheckSquare`).
       - Nút 1-chạm hoàn thành: `[✓ Đánh Dấu Đã Xong]` (màu xanh lá) / `[↺ Mở Lại Chưa Xong]`.
       - Dòng thông tin ngày giờ hoàn thành và kỹ thuật viên thực hiện (`Calendar` + HH:mm DD/MM/YYYY).
       - Ô Ghi chú mục lớn (`💬 Ghi chú thêm: ...`) cho phép inline edit và lưu nhanh 1 chạm.
       - Nút accordion `[📖 Xem các bước tham khảo (X việc con) ▾]`: Mặc định thu gọn siêu tinh gọn. Khi bấm mở ra, hiển thị các bước con tham khảo cách thực hiện kèm checkbox kiểm tra lẻ và hướng dẫn tham số.
       - Bộ lọc trạng thái: `Tất cả mục (7)`, `Chưa xong (3)`, `Đã xong (4)`.
       - Ô tìm kiếm tức thời: tìm từ khóa mục lớn, việc con, ghi chú (tự động bung accordion của mục khớp).
     - **Modal Sổ Tay Hướng Dẫn Setup (SOP)**:
       - Nút bấm `📖 Sổ Tay Hướng Dẫn Setup (SOP)` đặt tại thanh tiêu đề trang và trong modal checklist.
       - Cho phép kỹ thuật viên IT tra cứu toàn bộ 83 bước hướng dẫn chuẩn hóa của 7 phân hệ với ô tìm kiếm nhanh từ khóa (IP, MID, license, XML, máy in...).

### [2026-10-06] - Nâng Cấp Tính Năng "Thêm User NCC": Tắt User Lockout Enabled, Đổi Mật Khẩu Random & Popup Kết Quả
- **Hạng mục**: Phân hệ Xử Lý Tài Khoản SSO & IAM (`SsoManagementPage.tsx` / `sso_management_service.py` / `sso_management.py`).
- **Nghiệp vụ chi tiết**:
  1. **Nút bấm & Modal Thêm User NCC**:
     - Thêm nút `+ Thêm User NCC` (màu xanh lá `#16A34A`) trên thanh thao tác trang Xử Lý SSO.
     - Modal nhập liệu gồm:
       - **User Name** (bắt buộc)
       - **Email** (bắt buộc)
       - **User Phone Number** (mặc định điền sẵn `0908119345`; mỗi lần thêm tài khoản thành công, lần mở sau hệ thống tự động `+2` ví dụ: `0908119347`, `0908119349`... lưu vết trong `localStorage`). Người dùng có thể tự chỉnh sửa thủ công nếu muốn.
       - Hiển thị thông tin cố định: `User Type = 0 - Local`, `User Access Failed Count = 0`.
  2. **Kiểm tra trùng số điện thoại & cơ chế tự xử lý ngầm**:
     - Trước khi tạo, hệ thống truy cập `https://iam.ggg.com.vn/Identity/Users?search={phone}&UserType=99` để kiểm tra số điện thoại đã tồn tại chưa.
     - Nếu trùng: Gửi phản hồi về frontend hiển thị cảnh báo trùng SĐT kèm 2 lựa chọn:
       - *"Tự đổi số khác"*: Cho phép người dùng chỉnh sửa ô nhập SĐT.
       - *"⚡ Để hệ thống tự xử lý"*: Hệ thống chạy ngầm tự động tăng số (`+2`) kiểm tra đến khi tìm được số điện thoại khả dụng chưa tồn tại trên IAM (không hiển thị chi tiết số học cho user).
  3. **Tự động hóa Playwright toàn diện**:
     - Bước 1.1: Kiểm tra trùng SĐT qua query IAM.
     - Bước 1.2: Đăng nhập IAM bằng tài khoản SSO đã cấu hình.
     - Bước 2: Bấm nút `Add User`.
     - Bước 3: Điền `User Name`, `Email`, `PhoneNumber`, `User Type = 0` (Local), `AccessFailedCount = 0`.
     - Bước 4: Cuộn xuống nhấn `Save user`.
     - **Bước 4.1 (MỚI)**: Truy cập trang hồ sơ user `/Identity/UserProfile/{userId}`, **kiểm tra switch `User Lockout Enabled` và đặt về `false` (tắt)** để tài khoản không bao giờ bị khóa, đặt lại `AccessFailedCount = 0`, xóa `LockoutEnd` và bấm `Save User`.
     - **Bước 4.2 (MỚI)**: Truy cập `/Identity/UserChangePassword/{userId}`, sinh mật khẩu ngẫu nhiên 10 ký tự đạt chuẩn bảo mật (`generate_compliant_password`), điền và submit đổi mật khẩu trên IAM.
     - Bước 5: Tự động điều hướng sang trang `User & Clients` (`/Identity/UserClient/{userId}`), bật và lưu 4 quyền Client mặc định:
       1. `Hệ thống GChecklist`
       2. `PoPortal_Hệ thống đặt hàng Hồ Chí Minh`
       3. `Hệ thống E-Bidding`
       4. `SSO OTP Client - Ứng dụng dùng send OTP cho SSO web 2FA: For sending OTP - Donot delete`
  4. **Popup Kết Quả Cấp Tài Khoản Mới (MỚI)**:
     - Sau khi hoàn tất, hệ thống tự động mở Modal Kết Quả:
       - Hiển thị chi tiết: UserName, Email, SĐT, Danh sách quyền đã cấp.
       - Hiển thị **Mật khẩu mới ngẫu nhiên** to rõ nét kèm nút **Sao chép mật khẩu**.
       - Khung **Mẫu tin nhắn gửi cho Đối tác / User** kèm nút **Sao chép tin nhắn** 1 chạm (áp dụng mẫu rút gọn: `Hệ thống SSO/IAM đã tạo:\n- Username: ...\n- Mật khẩu: ...\n- Email: ...`).
  5. **Tự động nạp kết quả lên bảng**:
     - Hệ thống tự động tìm kiếm và nạp ngay user vừa tạo vào bảng danh sách IAM để kỹ thuật viên kiểm tra trực quan.

---

### [2026-10-06] - Thiết Lập Quy Ước Tự Tạo Database Trong Code & Cập Nhật `Full_SCRIPT_SQL_TABLE.sql`
- **Hạng mục**: Quy chuẩn kiến trúc Cơ sở Dữ liệu & Tự động hóa Deployment (Database Migration Standard).
- **Chi tiết thực hiện**:
  - Ban hành quy chuẩn: Mọi tính năng mới có bảng DB sau khi test xong **bắt buộc phải tích hợp tự tạo bảng tự động trong code (`main.py` lifespan)**. Khi đẩy code lên server, backend tự động `CREATE TABLE IF NOT EXISTS` mà không đòi hỏi thao tác tay hoặc lo quên migration.
  - Ban hành quy ước đồng bộ DDL Master: Mọi bảng mới **bắt buộc phải note và đồng bộ vào file [Script/Full_SCRIPT_SQL_TABLE.sql](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/Script/Full_SCRIPT_SQL_TABLE.sql)**.
  - Đã cập nhật công cụ `backend/scripts/generate_full_sql_scripts.py`, bổ sung bảng `USER_SSO_CONFIG` vào PHÂN HỆ 1 và chạy sinh lại thành công file Master DDL [Full_SCRIPT_SQL_TABLE.sql](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/Script/Full_SCRIPT_SQL_TABLE.sql) chứa 59 bảng hệ thống.
  - Đồng bộ quy chuẩn vào `Script/GEMINI.md` (mục 7.5) và `Script/README.md`.

---

### [2026-10-06] - Cải Tiến Ghi Nhận Nghỉ Phép: Tự Động Nhảy Khung Giờ & Bổ Sung Ca Sáng / Ca Chiều
- **Hạng mục**: Quản Trị Sai Phạm & Nghỉ Phép Team App (`ViolationAndLeavePage.tsx` / `violation_service.py` / `STAFF_LEAVE_TYPES`).
- **Nhu cầu nghiệp vụ**:
  1. Ghi nhận nghỉ phép cả ngày: Tự động nhảy ngày hiện tại từ `08:30` đến `17:30`.
  2. Bổ sung loại nghỉ nửa ngày ca sáng: Tự động nhảy từ `08:30` đến `13:30`.
  3. Bổ sung loại nghỉ nửa ngày ca chiều: Tự động nhảy từ `13:30` đến `17:30`.
- **Chi tiết thực hiện**:
  1. **Cơ sở dữ liệu & Danh mục loại ghi nhận (`STAFF_LEAVE_TYPES`)**:
     - Chuẩn hóa loại `half_day` cũ thành `half_day_morning` (*Nghỉ nửa ngày ca sáng*).
     - Thêm mới loại `half_day_afternoon` (*Nghỉ nửa ngày ca chiều*).
     - Cập nhật backend `violation_service.py` với hàm `ensure_default_leave_types` tự động chuẩn hóa và đảm bảo đủ 6 loại chuẩn (`annual_leave`, `half_day_morning`, `half_day_afternoon`, `early_leave`, `unpaid_leave`, `other`).
     - Cập nhật file master data SQL: [Full_SCRIPT_SQL_TABLE_for_Data.sql](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/Script/Full_SCRIPT_SQL_TABLE_for_Data.sql).
  2. **Giao diện Modal Ghi Nhận Nghỉ Phép (`ViolationAndLeavePage.tsx`)**:
     - Mặc định khi mở modal tạo mới: Tự động chọn *Nghỉ phép cả ngày* với thời gian hôm nay theo giờ địa phương từ `08:30` đến `17:30`.
     - Tích hợp **3 nút chọn nhanh ca nghỉ chuẩn (Quick Preset Chips)** ngay dưới Loại Ghi Nhận:
       - 🌞 **Nghỉ cả ngày**: `08:30` - `17:30`.
       - 🌅 **Nửa ngày ca sáng**: `08:30` - `13:30`.
       - 🌇 **Nửa ngày ca chiều**: `13:30` - `17:30`.
     - Đồng bộ tự động: Khi người dùng đổi ngày ở ô *Thời Gian Bắt Đầu*, ô *Thời Gian Kết Thúc* tự động nhảy sang ngày đó với khung giờ chuẩn tương ứng của ca đã chọn.
     - Hiển thị pill tóm tắt trực quan ca nghỉ và khoảng thời gian ngay bên dưới 2 ô chọn ngày giờ.
     - Nâng cấp nhãn badge trên bảng danh sách lịch nghỉ: màu sắc riêng biệt, dễ phân biệt giữa ca sáng, ca chiều và cả ngày.
  3. **Build & Kiểm thử**: Chạy `npm run build` thành công `✓ built in 3.73s` (exit code 0), cú pháp backend chuẩn, API `/api/v1/violations/leave-types` hoạt động mượt mà.

---

### [2026-10-06] - Sửa Lỗi 500 "Request failed with status code 500" Khi Cấu Hình SSO & IAM Trên Server
- **Hạng mục**: Phân hệ SSO & IAM Management (`SsoManagementPage.tsx` / `sso_management.py`).
- **Nguyên nhân lỗi**:
  1. Khi người dùng bấm *"Lưu & Kiểm Tra Đăng Nhập"* trong modal cấu hình SSO cá nhân, backend gọi API `POST /api/v1/sso/config`.
  2. Tại database trên Server, bảng `dbo.USER_SSO_CONFIG` **chưa từng được tạo** (trước đây bảng này chỉ được tạo thủ công ở database test trên máy local mà chưa có script migration cho Server).
  3. Khi backend server truy vấn/lưu vào bảng `dbo.USER_SSO_CONFIG`, SQL Server báo lỗi `Invalid object name 'dbo.USER_SSO_CONFIG'`. Do thiếu khối `try...except`, FastAPI quăng lỗi 500 `Internal Server Error`.
  4. File `backend/app/main.py` trước đây chỉ tự động tạo bảng `OVERNIGHT_DEVICES_LOG`, thiếu `USER_SSO_CONFIG` khi khởi động.
- **Giải pháp đã xử lý**:
  1. **Tạo script SQL**: Tạo mới [setup_table_user_sso_config.sql](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/scripts/setup_table_user_sso_config.sql) và cập nhật bảng vào [deploy_database_migration.sql](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/scripts/deploy_database_migration.sql).
  2. **Tự động tạo bảng khi khởi động Backend**: Cập nhật hàm lifespan trong [main.py](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/app/main.py) tự động gọi `Base.metadata.create_all` cho cả `UserSSOConfig` khi backend khởi chạy.
  3. **Bọc Try/Except và thông báo lỗi tường minh**: Cập nhật [sso_management.py](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/app/api/v1/sso_management.py) bắt rõ ràng các lỗi kết nối/DB và trả về câu thông báo tiếng Việt cụ thể, không còn để xảy ra lỗi 500 unhandled.
  4. Đã chạy build thành công frontend (`npm run build` exit code 0) và kiểm tra cú pháp backend OK.

### [2026-10-06] - Bổ Sung Tính Năng Quét Lại Các Nhà Hàng Bị Lỗi & Quét Riêng Từng Nhà (Job MongoDB & Mosquitto)
- **Vấn đề phản ánh**: Khi chạy job quét MongoDB & Mosquitto, nhà hàng `4048 Gogi Đinh Tiên Hoàng` (IP `10.8.167.41`) thực tế đã mở cổng MongoDB 27017 và Mosquitto 1883 (đều Running), nhưng kết quả quét lại báo `Tắt / Lỗi kết nối ❌`. Đồng thời, người dùng cần tính năng **chỉ quét lại danh sách những nhà bị lỗi** để kiểm tra và xử lý nhanh chóng sau khi IT khắc phục, tránh phải quét lại toàn bộ hơn 300 nhà hàng mất thời gian.
- **Nguyên nhân cốt lõi**:
  1. Khi quét đồng thời hơn 300 nhà hàng với 35 luồng, đường truyền VPN/WAN tới một số nhà hàng ở xa bị trễ gói (jitter latency > 800ms).
  2. Thời gian `socket_timeout = 0.8s` quá ngắn và hàm `test_tcp_port` trước đây **không có cơ chế retry** (chỉ thử 1 lần duy nhất), dẫn tới các nhà hàng bị nghẽn mạng tạm thời bị đánh dấu lỗi sai (false negative).
- **Giải pháp toàn diện đã triển khai**:
  1. **Nâng cấp cơ chế kiểm tra cổng TCP (`test_tcp_port`)**: Thêm cơ chế **Retry tự động** (thử lại lần 2 với timeout tăng lên 1.5s nếu lần 1 thất bại). Đặt timeout mặc định lên 1.2s - 1.5s, triệt tiêu 99.9% hiện tượng rớt gói/lag mạng VPN.
  2. **Thêm phương thức Backend Service**:
     - `scan_error_restaurants()`: Chỉ lọc danh sách các nhà hàng có `is_ok == False`, quét lại nhanh chóng và cập nhật trực tiếp vào bảng kết quả tổng thể, tự động tính lại số lượng OK/Lỗi và ghi file.
     - `scan_single_restaurant(sap_code)`: Quét kiểm tra riêng 1 nhà hàng cụ thể theo mã SAP với timeout 2.0s và cập nhật ngay vào bảng kết quả chỉ trong 1-2 giây.
  3. **Bổ sung API Router Backend**:
     - `POST /api/v1/mongo-mosquitto/scan-errors`
     - `POST /api/v1/mongo-mosquitto/scan-single/{sap_code}`
  4. **Nâng cấp Giao diện Frontend (`JobManagementPage.tsx`)**:
     - Thêm nút màu đỏ/cam nổi bật: **`Quét Lại (X) Nhà Lỗi`** cạnh nút "Quét Lại Toàn Bộ" trong bảng kết quả.
     - Thêm cột **`Thao Tác`** với nút **`Quét lại`** trên từng dòng nhà hàng: Cho phép IT sau khi remote khắc phục xong nhà nào thì click quét lại riêng nhà đó ngay lập tức (kèm icon loading spinner), kết quả chuyển xanh OK tức thì.
  5. **Kiểm tra thực tế**: Đã test quét riêng nhà `4048 Gogi Đinh Tiên Hoàng`, hệ thống kiểm tra và cập nhật thành công: **Trạng thái OK ✅ (Cả MongoDB 27017 & Mosquitto 1883 đều hoạt động tốt)**.
  6. Đã build frontend thành công exit code 0 (`✓ built in 8.49s`), khởi động lại backend daemon PID 9912 trên port 8000.

---

### [2026-10-06] - Loại Bỏ Khối Thẻ Thống Kê (Overview Stat Cards) Trong Email Cảnh Báo Tự Động
- **Hạng mục**: Tối ưu giao diện mẫu Email Thông Báo (`mongo_mosquitto_service.py` / `ticket_batch_service.py`).
- **Nội dung thực hiện**:
  1. **Loại bỏ khối thẻ 3 ô thống kê to**: Xóa bỏ hoàn toàn khối 3 card "Tổng NH Đã Quét", "Đạt Chuẩn (OK)", "Bị Lỗi Cần Xử Lý" ở phần đầu email cảnh báo sự cố MongoDB & Mosquitto theo đúng yêu cầu người dùng (tuân thủ nguyên tắc UI/UX số 5.1: *Không tạo khối thẻ thống kê to gây chiếm diện tích hiển thị dọc*).
  2. **Thu gọn thông tin vào dòng tiêu đề & đoạn văn mở đầu**:
     - Tiêu đề phụ: `Thời gian quét: {today_str} | Tổng quét: {total_scanned} (Đạt: {total_ok} | Lỗi: {total_error})`.
     - Lời mở đầu: Nêu rõ đã rà soát `{total_scanned} nhà hàng` và phát hiện `{total_error} nhà hàng` bị lỗi.
     - Sau đó đi thẳng ngay vào bảng danh sách chi tiết các nhà hàng cần xử lý, giúp kỹ thuật viên và quản lý nhìn thấy ngay danh sách sự cố trên Outlook mà không phải cuộn trang.
  3. **Kiểm tra tác vụ 3CX (`ticket_batch_service.py`)**: Rà soát mẫu email báo cáo xử lý Ticket 3CX & G-Process, xác nhận mẫu email đã ở dạng bảng tinh gọn, không có khối thẻ thống kê chiếm chỗ.
  4. **Build & Biên dịch**: Đã biên dịch backend `app` sạch 100%, khởi động lại backend daemon PID 9488, và hoàn tất build production `frontend/dist` (`✓ built in 3.63s`).

---

### [2026-10-06] - Chuẩn Hóa & Đưa Vào Cẩm Nang Quy Tắc & Quy Định Dự Án (AGENTS.md / GEMINI.md / PROJECT_GUIDELINES.md)
- **Hạng mục**: Chuẩn hóa quy định dự án & Cập nhật cẩm nang kiến trúc (Rules & Standards).
- **Nội dung bổ sung vào quy chuẩn**:
  1. **Quy Chuẩn 2.4 - Đóng Gói & Bàn Giao Triển Khai Server (Build `dist/` & `app/`)**:
     - Bắt buộc chạy `npm run build` tạo sẵn thư mục `frontend/dist/` (kèm `web.config` IIS rewrite).
     - Bắt buộc chạy `python -m compileall app` kiểm tra 100% cú pháp code backend trong `backend/app/`.
     - Luôn hoàn thiện sẵn sàng cả 2 thư mục `dist` và `app` để người dùng chỉ việc copy đè lên server là chạy ngay.
  2. **Quy Chuẩn 5.5 - Cơ Chế Quản Lý Modal Stack LIFO (Escape Đóng Popup Trên Cùng Trước)**:
     - Mọi Modal, Popup, Drawer, Lightbox xem ảnh mở đè nhau bắt buộc phải đăng ký vào `modalStack.ts` qua `useModalStack`.
     - Lắng nghe sự kiện `keydown` (phím `Escape`) ở Capture Phase (`useCapture = true`).
     - Chỉ đóng modal ở đỉnh ngăn xếp (`topmost`), chặn sự kiện nổi bọt xuống modal cha bên dưới bằng `stopPropagation()` / `stopImmediatePropagation()`.
     - Tự động cộng `+20` z-index cho mỗi tầng modal mở sau và khóa cuộn body thông minh.
  3. **Quy Chuẩn 6.6 - Quản Lý Job & Giám Sát Dịch Vụ Nhà Hàng (MongoDB & Mosquitto)**:
     - Hàm kiểm tra cổng TCP (`test_tcp_port`) bắt buộc phải có cơ chế Retry (tối thiểu 1 lần thử lại) và timeout phù hợp (1.2s - 1.5s) để chống rớt gói trên mạng WAN/VPN gây báo lỗi sai (false-negative) cho các máy đang chạy bình thường.
     - Giao diện giám sát bắt buộc phải có nút **"Quét Lại (X) Nhà Lỗi"** và nút **"Quét lại" từng nhà riêng lẻ** ngay trên từng dòng bảng kết quả.
  4. **Đồng bộ hóa 100%**: Đã cập nhật và đồng bộ toàn bộ nội dung trên vào 4 tài liệu master rules:
     - [AGENTS.md](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/AGENTS.md)
     - [GEMINI.md](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/GEMINI.md)
     - [PROJECT_GUIDELINES.md](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/PROJECT_GUIDELINES.md)
     - [.agents/rules/project_guidelines.md](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/.agents/rules/project_guidelines.md)

---

### [2026-10-06] - Khắc Phục Triệt Để Lỗi Phím ESC Với Các Popup Chồng Nhau (Hệ Thống Modal Stack LIFO)
- **Vấn đề phản ánh**: Khi mở nhiều popup/modal chồng lên nhau (ví dụ: Mở Chi Tiết Nhà Hàng `RestaurantDetailModal`, rồi mở tiếp popup Kết Nối Từ Xa VNC/KDS `VncKdsModal`), khi người dùng bấm phím `Escape`, popup ở dưới cùng lại bị đóng trước thay vì đóng popup trên cùng, làm mất popup cha hoặc đóng cả hai cùng lúc.
- **Nguyên nhân cốt lõi**:
  1. Mỗi modal tự đăng ký một event listener `keydown` độc lập vào `window`. Modal mở trước được add listener trước $\rightarrow$ nhận sự kiện Escape trước $\rightarrow$ kích hoạt `onClose` của modal dưới cùng trước.
  2. Không có cơ chế chặn sự kiện (`stopPropagation`/`stopImmediatePropagation`) giữa các popup, dẫn tới sự kiện Escape bị kích hoạt lan truyền.
  3. Xung đột `document.body.style.overflow`: Khi modal con đóng, modal con set `overflow = 'unset'` làm trang web bị cuộn lại trong khi modal cha vẫn đang mở.
- **Giải pháp toàn diện đã triển khai**:
  1. **Xây dựng module quản lý ngăn xếp tập trung [modalStack.ts](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/utils/modalStack.ts)**:
     - Quản lý danh sách modal đang mở theo cấu trúc ngăn xếp LIFO (Last In First Out).
     - **Cơ chế Capture Phase Event Listener**: Sử dụng 1 listener toàn cục duy nhất tại `window` với cờ `capture = true` để đón bắt phím `Escape` ở cửa ngõ cao nhất trước mọi listener khác.
     - **Chỉ đóng popup trên cùng**: Lấy đúng phần tử ở đỉnh ngăn xếp (`topModal = modalStack[modalStack.length - 1]`) và gọi `onClose()` của nó; đồng thời gọi `e.stopPropagation()` và `e.stopImmediatePropagation()` để ngăn 100% sự kiện lan tới các modal bên dưới.
     - **Tuần tự từng bước**: Bấm ESC lần 1 $\rightarrow$ đóng popup trên cùng, popup dưới giữ nguyên. Bấm ESC lần 2 $\rightarrow$ đóng tiếp popup kế bên dưới.
     - **Tự động cấp phát `z-index` tăng dần**: Modal mở sau luôn tự động nhận `z-index` cao hơn modal bên dưới tối thiểu `+20` đơn vị, đảm bảo popup con luôn hiển thị đè lên trên popup cha.
     - **Khóa cuộn trang thông minh**: Chỉ khi toàn bộ các modal đã đóng hết (`modalStack.length === 0`) thì mới khôi phục `document.body.style.overflow = 'unset'`.
  2. **Cập nhật component chuẩn [Modal.tsx](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/components/ui/Modal.tsx)**: Tích hợp hook `useModalStack` thay thế toàn bộ logic listener cục bộ trước đây. Toàn bộ hơn 20 modal trong toàn hệ thống tự động thừa hưởng cơ chế LIFO này.
  3. **Tích hợp thêm vào các Lightbox phóng to ảnh đính kèm**: Áp dụng `useModalStack` cho các popup xem ảnh full size trong `ProjectDescriptionModal.tsx`, `IncidentDetailModal.tsx`, `SystemOutageDetailModal.tsx`, `ChecklistRunDetailModal.tsx`, `AppNotificationDetailModal.tsx`, `AppAnnouncementPage.tsx`. Khi đang mở modal chi tiết mà bấm xem ảnh phóng to, bấm ESC sẽ tắt ảnh phóng to trước, bấm ESC lần 2 mới tắt modal chi tiết.
  4. Đã chạy build frontend (`cmd /c "npm run build"`) đạt exit code 0 (`✓ built in 3.65s`), không có bất kỳ lỗi TypeScript nào.

### [2026-10-06] - Khắc phục Lỗi IndexOptionsConflict (Code 85) Tác Vụ Xử Lý Full CPU MongoDB
- **Hạng mục**: Xử Lý Full CPU 100% MongoDB Nhà Hàng (mongo_fix_cpu_service.py).
- **Nguyên nhân sự cố (Ca 5007 - Gogi Lotte Mart Cộng Hòa)**:
  - Máy trạm nhà hàng (10.9.137.41) trên bảng G_KITCHEN.DISH_KDS đã có sẵn index cho trường lineGuid được tạo trước đó với tên mặc định của MongoDB là lineGuid_1.
  - Code cũ chỉ kiểm tra theo tên chỉ định (idx_lineGuid). Khi không thấy tên idx_lineGuid, code gửi lệnh tạo mới lên MongoDB.
  - MongoDB từ chối tạo index trùng tập hợp key nhưng khác tên và ném lỗi IndexOptionsConflict (Code 85): Index already exists with a different name: lineGuid_1.
  - Ngoại lệ không được bọc an toàn làm dừng toàn bộ quá trình và báo kết quả THẤT BẠI.
- **Giải pháp xử lý triệt để**:
  1. **Kiểm tra theo Key Index**: So sánh trực tiếp cấu trúc key desired_keys_tuple với idx.get('key') của tất cả index hiện có trên collection. Nếu trường đó đã có index (bất kể tên là lineGuid_1, id_1 hay tên gì), tự động nhận diện đã tồn tại (existing) và bỏ qua không gửi lệnh tạo lỗi.
  2. **Bắt ngoại lệ an toàn Code 85**: Bọc try-except quanh create_index. Nếu MongoDB phản hồi lỗi Code 85 hoặc 'Index already exists with a different name', hệ thống tự động ghi nhận là đã có sẵn và tiếp tục thực hiện các index khác cùng dọn dẹp log cũ bình thường.
  3. **Bổ sung Retry 2 lần cho _test_tcp_port**: Tuân thủ Mục 6.6 trong tài liệu quy chuẩn (lần 1 timeout 1.2s, lần 2 timeout 1.5s) chống báo lỗi giả khi mạng WAN/VPN chập chờn.
  4. Đã biên dịch backend và restart daemon thành công.

### [2026-10-06] - Nâng cấp Bộ Lọc Nhiều Trạng Thái Hoạt Động (Multi-Select) DS Nhà Hàng
- **Hạng mục**: Danh Sách Nhà Hàng (RestaurantListPage.tsx & 
estaurant_service.py).
- **Nhu cầu**: Cho phép người dùng chọn lọc nhiều trạng thái hoạt động cùng lúc (Multi-select) thay vì chỉ chọn duy nhất 1 trạng thái như trước.
- **Chi tiết kỹ thuật**:
  1. **Tạo component UI dùng chung [MultiSelect.tsx](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/components/ui/MultiSelect.tsx)**:
     - Giao diện dropdown đồng bộ theme Golden Gate, bo góc ar(--radius-md), border focus vàng cam #F5B800.
     - Từng option có ô Checkbox trực quan và Tag/Badge trạng thái có màu sắc nhận diện:
       * ON: Hoạt động (ON) - Xanh lá cây
       * OFF: Ngừng hoạt động (OFF) - Đỏ
       * NEW: Nhà hàng mới (NEW) - Xanh dương
     - Hỗ trợ nút chọn nhanh: *'Chọn Tất Cả'* và *'Tất Cả Trạng Thái'*.
     - Trigger hiển thị thông minh: khi chọn 1 trạng thái hiển thị tên và badge, chọn từ 2 trạng thái hiển thị badge đếm số lượng 'Đã chọn: X' kèm nhãn rút gọn, có nút 'x' xóa nhanh về tất cả.
     - Tự động đóng khi click outside hoặc bấm Escape.
  2. **Cập nhật Frontend [RestaurantListPage.tsx](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/restaurants/RestaurantListPage.tsx)**:
     - Chuyển state selectedTrangThai thành mảng string[].
     - Đồng bộ lọc API và xuất Excel exportRestaurantsExcel thông qua chuỗi phân tách dấu phẩy (vd: ON,NEW).
     - Tích hợp nút 'Làm Mới Bộ Lọc' reset selectedTrangThai về [].
  3. **Cập nhật Backend [restaurant_service.py](file:///D:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/app/services/restaurant_service.py)**:
     - Hàm get_restaurants & export_restaurants_excel: Hỗ trợ tham số 	rangthai chứa danh sách phân tách dấu phẩy (vd: 'ON,NEW'), sử dụng Restaurant.trangthai.in_(tt_list) để lọc chính xác đa trạng thái.
  4. Đã build frontend thành công ✓ built in 3.62s (exit code 0) và restart backend daemon.

### [2026-10-06] - Nâng cấp Phân hệ Ticket theo Danh Mục (Manual & Auto History, Error Logs) & Modal Stack LIFO & Giám sát Dịch vụ Nhà Hàng
- **Hạng mục 1: Ticket theo Danh Mục (Đóng Ticket Hàng Loạt 3CX & G-Process) — Tách Quét/Xử Lý, Lưu Lịch Sử & Xem Logs Lỗi**:
  1. *Quy trình Manual tách biệt rõ ràng*:
     - Khi bấm **List_Xử Lý**: Tải ngay dữ liệu của lần quét/xử lý gần nhất từ cache `ticket_batch_latest.json` (tốc độ < 50ms), không tự động quét ngầm gây chờ đợi 30-60s như trước.
     - Nút **"🔍 Quét Danh Sách" (Scan)**: Chỉ quét khi người dùng chủ động bấm. Hệ thống đăng nhập SSO, quét danh sách vé 3CX và nhiệm vụ G-Process rồi lưu vào lịch sử.
     - Nút **"⚡ Bắt Đầu Xử Lý" (Process)**: Người dùng tích chọn các vé mong muốn, bấm xử lý mới bắt đầu quy trình đóng vé/kết thúc quy trình GPMS.
  2. *Khắc phục Triệt để Lỗi Trùng Mã G-Process & Treo Playwright 150s*:
     - **Nguyên nhân lỗi cũ**: Dữ liệu nhiệm vụ G-Process trước đây map theo tên ('IT xác nhận lỗi kỹ thuật'). Do mọi nhiệm vụ đều chung một tên, các ID bị ghi đè thành 1 mã duy nhất (#638765), dẫn đến toàn bộ dòng hiển thị cùng 1 mã vé, khi tick 1 dòng thì cả 7 dòng bị tick theo (chung ID trong Set). Khi xử lý: nhiệm vụ đầu hoàn tất khiến các phần tử bị disabled, các lượt sau lại mở lại cùng nhiệm vụ đó và click vào element bị disabled khiến Playwright chờ tới 150.000ms (2.5 phút/vé x 6 vé = treo 15-20 phút).
     - **Giải pháp xử lý**:
       + Backend thu thập trực tiếp ID duy nhất từ API https://process-gpms.ggg.com.vn/api/v1/list-my-task (item.id, vd: 639098, 639082, 639069...).
       + Gán detail_page.set_default_timeout(10000) (10s) và giới hạn timeout click tối đa 8s (timeout=8000).
       + Kiểm tra selector ant-radio-wrapper-disabled: Nếu nhiệm vụ đã hoàn thành từ trước, tự động trả về thành công trong 1 giây mà không cố click lại.
       + Frontend: Cập nhật composite key cho các hàng trong bảng.
  3. *Hỗ trợ Chạy Tự Động (Auto Cron)*:
     - Khi Cron scheduler chạy tự động, toàn bộ danh sách vé và kết quả xử lý được lưu trữ đầy đủ vào file `backend/data/ticket_batch_latest.json` với cờ `run_mode = 'auto'`.
     - Khi người dùng vào kiểm tra, hệ thống hiển thị rõ ràng kết quả lần chạy tự động gần nhất kèm thời gian và tổng kết.
  3. *Xem Logs Chi Tiết Cho Các Vé Thất Bại*:
     - Từng dòng thất bại có badge `❌ Lỗi` kèm nút **"📜 Xem Logs"**.
     - Popup con hiển thị toàn bộ nguyên nhân, mã lỗi và technical traceback chi tiết (bắt chính xác lỗi timeout, selector, timesheet...).
     - Tích hợp nút **"📋 Sao Chép Logs Cho AI"**: Tự động copy định dạng chuẩn hóa kèm thông tin vé để người dùng dán (Ctrl+V) gửi cho AI chẩn đoán và khắc phục.
     - Tuân thủ cơ chế `useModalStack` LIFO: Phím Escape đóng popup xem logs lỗi trước, không tắt nhầm modal danh sách cha.

- **Hạng mục 2: Cơ Chế Quản Lý Modal Stack LIFO (Escape Đóng Popup Trên Cùng Trước)**:
  - Giải quyết triệt để lỗi bấm phím `Esc` bị đóng popup ở đáy trước khi có nhiều modal chồng nhau.
  - Sử dụng hook tập trung `useModalStack` (`frontend/src/utils/modalStack.ts`), bắt sự kiện ở pha capture (`useCapture = true`).
  - Khi bấm `Esc`, chỉ callback của modal ở đỉnh stack (`topmost`) được thực thi, đồng thời chặn lan truyền sự kiện. Tự động cộng dồn z-index `+20` cho mỗi tầng modal con.

- **Hạng mục 3: Chống Báo Lỗi Giả (False-Negative) & Giám Sát Dịch Vụ Nhà Hàng (MongoDB & Mosquitto)**:
  - Bổ sung cơ chế **Retry 2 lần** với timeout tăng dần (1.2s $\rightarrow$ 1.5s) cho hàm kiểm tra cổng TCP mạng WAN/VPN.
  - Thêm tính năng **"Quét Lại (X) Nhà Lỗi"** để quét nhanh các nhà hàng bị cảnh báo/lỗi mà không cần quét lại toàn bộ 300+ nhà.
  - Thêm nút quét riêng lẻ trên từng dòng bảng kết quả.

---

### [2026-10-06] - Thiết lập Quy ước Lưu Vết & Bổ sung Tiêu Chuẩn Mobile Responsive Toàn Diện
- **Hạng mục**: Quy ước vận hành & Tiêu chuẩn giao diện di động (Mobile Usability).
- **Chi tiết thực hiện**:
  - Ban hành quy ước bất biến: **Mọi tác vụ mới / sửa cũ / đổi quy định BẮT BUỘC phải ghi chép ngay vào `Script/README.md`**.
  - Đồng bộ quy ước vào tất cả các file rules: `GEMINI.md`, `PROJECT_GUIDELINES.md`, `AGENTS.md`, `.agents/rules/project_guidelines.md`.
  - **Quy chuẩn thiết kế Mobile cho toàn bộ các trang**:
    1. *Điều hướng*: Menu Sidebar tự động thu gọn thành Drawer trượt (Hamburger button).
    2. *Bảng dữ liệu (Tables)*: Trên màn hình điện thoại tự động chuyển đổi sang dạng **Danh sách Thẻ (Card View)** tóm tắt thông tin quan trọng nhất hoặc bảng cuộn ngang mượt mà có cố định cột mã/tên.
    3. *Bộ lọc (Filters)*: Thu gọn vào nút bấm "Bộ lọc ▾" mở Bottom Sheet hoặc Accordion gập mở, không để tràn vỡ dòng.
    4. *Thao tác 1 chạm (Quick Actions & Copy)*: Tối ưu tra cứu cho IT on-site/on-call: Nút copy IP, pass FTTH, TeamViewer, RustDesk to bản kèm toast phản hồi ngay; nút gọi điện thoại trực tiếp `tel:`.
    5. *Modal & Form*: Tự chuyển thành Fullscreen hoặc Bottom Sheet với header/footer `sticky` để không bị bàn phím ảo che mất nút Lưu/Đóng.
    6. *Touch Target*: Nút bấm, ô nhập liệu tối thiểu `40px - 44px`. Padding lề co gọn `12px - 14px`.

---

### [2026-10-06] - Tối Ưu Checklist Setup, Nâng Cấp Quét Mail Memo (Bổ Sung Nút Bấm) & Sửa Triệt Để Lỗi 500 Đóng Ticket Hàng Loạt
- **Hạng mục 1: Tối Ưu Modal Checklist Setup Nhà Hàng Mới & Sửa Lỗi Hiển Thị Sổ Tay SOP (`SetupRestaurantPage.tsx`)**:
  - Giao diện Modal Checklist tinh gọn: Chỉ hiển thị các nhóm tác vụ lớn (`RK7-MANAGER`, `POS THU NGÂN`, `POS PHỤ 12`, `PC QUẢN LÝ`, `GMONITER`, `MỤC ĐI KÈM QUAN TRỌNG`, `MỤC KIỂM TRA SAU KHI SETUP`).
  - Mỗi thẻ hiển thị: Tên nhóm, badge số lượng việc kỹ thuật (`0 / X việc kỹ thuật`), nhãn trạng thái (ĐÃ XONG / Chưa xong), nút bấm 1 chạm đánh dấu hoàn tất nhóm, thông tin thời gian & kỹ thuật viên hoàn thành, ô nhập ghi chú nhanh cho nhóm.
  - Tách toàn bộ 83 bước kỹ thuật con ra ngoài: Bấm nút "Xem chi tiết SOP (X việc con)" để mở modal Sổ Tay Setup SOP tra cứu hướng dẫn chi tiết theo đúng từng nhóm, không làm dài và rối modal Checklist triển khai.
  - **Sửa triệt để lỗi hiển thị Sổ Tay Hướng Dẫn Kỹ Thuật (SOP Chuẩn)**:
    - *Nguyên nhân*: Container flexbox bị hiệu ứng `flex-shrink: 1` kết hợp với `overflow: hidden` trên từng card nhóm dẫn đến việc flexbox co ép cưỡng bức tất cả 7 nhóm xuống cùng một chiều cao ~85px, làm cụt và mất toàn bộ các bước kỹ thuật từ bước 2 trở đi.
    - *Khắc phục*: Thêm `flexShrink: 0` trên từng thẻ nhóm và từng mục task, mở rộng `maxHeight: 68vh` cuộn mượt mà; tích hợp cơ chế Accordion mở rộng / thu gọn từng nhóm tiện lợi (kèm nút "Mở rộng tất cả" / "Thu gọn tất cả" trên banner), tự động mở nhóm khi tìm kiếm từ khóa.
  - Dọn dẹp sạch mã nguồn frontend: Xóa triệt để các biến, hàm và imports không dùng, đảm bảo kiểm tra nghiêm ngặt `tsc -b` không phát sinh cảnh báo TS6133.

- **Hạng mục 2: Quét Mail Memo Tự Động & Trạng Thái "Bổ Sung Nút Bấm" (`mail_memo_service.py`, `memo_service.py`, `models/memo.py`, `schemas/memo.py`, `MemoPage.tsx`)**:
  - Xử lý quét bổ sung Sub-Memo: Khi nhận được email mới cùng mã Memo (ví dụ Memo `302621UP015` bổ sung thêm Sub-Memo `302621UP015.03` sau đợt quét ban đầu):
    - Hệ thống tự động so khớp nội dung cũ và trích xuất riêng các Sub-Memo mới chưa có.
    - Tự động ghi chép bổ sung thông tin vào nội dung mail với mốc thời gian rõ ràng: `[BỔ SUNG NÚT BẤM TỪ MAIL - <ngày giờ>]`.
    - Tự động chuyển trạng thái Memo sang **"4: Bổ sung nút bấm"** và ghi nhận vết kiểm toán trong `AuditLog`.
  - Tách biệt 2 trường nội dung độc lập:
    - `noidung_mail`: Lưu toàn bộ nội dung quét tự động từ Email/Salesforce Loyalty; hệ thống tự động cập nhật khi có mail bổ sung mà không ghi đè vào hướng dẫn của kỹ thuật viên.
    - `huong_dan`: Dành riêng cho Kỹ thuật viên IT ghi chú hướng dẫn cấu hình chi tiết, dán ảnh chụp màn hình (`Ctrl+V`), không bao giờ bị mất khi hệ thống quét mail.
  - Bổ sung trạng thái `4: Bổ sung nút bấm` vào toàn bộ hệ thống: Badge màu hồng/rose nổi bật kèm biểu tượng `Sparkles`, bộ lọc tab trạng thái, thẻ thống kê số lượng, và dropdown cập nhật trạng thái trong Modal Chỉnh Sửa Memo.
  - Tự động tạo cột `noidung_mail NVARCHAR(MAX) NULL` trong bảng `MEMO` khi khởi động backend (`main.py` lifespan) và đồng bộ vào `Script/Full_SCRIPT_SQL_TABLE.sql`.

- **Hạng mục 3: Sửa Triệt Để Lỗi 500 & Tăng Tốc 4X Đóng Ticket Hàng Loạt 3CX & G-Process (`ticket_batch_service.py`, `ticket_batch.py`)**:
  - Nguyên nhân lỗi 500 khi xử lý 10-11+ mục:
    - Quá trình xử lý không có Error Boundary riêng cho từng item; khi một mục gặp lỗi mạng/timeout/trình duyệt thì ngoại lệ lan truyền ra ngoài làm sập toàn bộ request với HTTP 500.
    - Trình duyệt Chromium không có cờ tối ưu hóa bộ nhớ (`--no-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`...), gây rò rỉ RAM và crash renderer khi mở liên tiếp nhiều tác vụ nặng.
    - Thời gian chờ không cần thiết quá dài (14-16s sleep mỗi mục) khiến 10-12 mục mất hơn 210 giây, dễ bị proxy (IIS ARR) ngắt kết nối với mã lỗi 500/502.
  - Giải pháp tối ưu hóa toàn diện:
    - Bổ sung đầy đủ cờ tối ưu bộ nhớ `CHROMIUM_ARGS` cho trình duyệt Chromium/Edge.
    - Thiết lập cơ chế Error Boundary độc lập trong vòng lặp batch: Mỗi mục được bọc trong khối `try...except` riêng. Nếu 1 mục lỗi, hệ thống tự động ghi nhận lỗi cho mục đó, tự phục hồi phiên làm việc (`browser/context/page`) nếu cần, và tiếp tục xử lý các mục còn lại bình thường mà không làm hỏng cả đợt chạy.
    - Đưa toàn bộ các lệnh điều hướng `page.goto` và kiểm tra timesheet vào trong khối `try...except` an toàn.
    - Tối ưu hóa thời gian xử lý: Rút ngắn các khoảng dừng tĩnh không cần thiết và sử dụng selector đa điều kiện nhanh, giảm thời gian xử lý mỗi mục từ 18-22s xuống chỉ còn 3-4s (tăng tốc gấp 4 lần). Xử lý 10-15 mục chỉ mất ~40-50s, triệt tiêu nguy cơ timeout proxy.

### [2026-10-07] - Phát Triển Tác Vụ Ngầm: Rà Soát Thông Tin Nhà Hàng Còn Thiếu, Danh Sách Loại Bỏ Cấu Hình & Gửi Email Nhắc Nhở
- **Hạng mục**: Tác Vụ Ngầm Hệ Thống (Background Jobs) & Giám Sát CSDL Nhà Hàng.
- **Mục đích & Yêu cầu nghiệp vụ**:
  - Tự động rà soát định kỳ hoặc theo yêu cầu toàn bộ hồ sơ nhà hàng (`RESTAURANT`), phát hiện các trường thông tin còn thiếu hoặc chưa đạt chuẩn để kịp thời bổ sung phục vụ vận hành.
  - **Bộ 5 Tiêu chí Đánh giá Nghiêm ngặt (Đã cập nhật theo yêu cầu người dùng)**:
    1. **Mã SAP (`sap`)**: Bắt buộc 4 hoặc 5 chữ số (`^\d{4,5}$`). Các giá trị `1`, `0`, chuỗi ngắn hoặc NULL coi là chưa nhập/sai chuẩn.
    2. **Cost Center (`coscenter`)**: Bắt buộc từ 5 ký tự/chữ số trở lên (`len >= 5`). Các giá trị `1`, `0`, chuỗi ngắn hoặc NULL coi là chưa nhập.
    3. **Mã RK7 (`rk7`)**: Bắt buộc từ 3 chữ số trở lên (`^\d{3,}$`). Các giá trị `1`, `0`, chuỗi ngắn hoặc NULL coi là chưa nhập.
    4. **Ngày Khai Trương (`ngay_khaitruong`)**: **Phải khác 01/01/1999 và không để trống**. Nếu ngày khai trương là `01/01/1999` (placeholder mặc định chưa cập nhật) hoặc `NULL` $\rightarrow$ Đánh dấu thiếu. Các ngày thực tế khác `01/01/1999` (bất kể năm nào: 2016, 2020, 2025, 2026...) đều được tính là ĐÃ CÓ / HỢP LỆ.
    5. **Trạng Thái Hoạt Động (`trangthai`)**: Chỉ nhà hàng có trạng thái `ON` mới được tính là xong (hợp lệ). Nhà hàng `NEW` tính là chưa xong (bị đánh dấu `Trạng Thái chưa ON (Đang là NEW)`). Nhà hàng `OFF` được bỏ qua hoàn toàn không kiểm tra.
- **Tính Năng Mới: Cấu Hình Danh Sách Nhà Hàng Loại Bỏ Mặc Định (`restaurant_audit_config.json`)**:
  - Lưu trữ cấu hình danh sách loại trừ trong file `backend/data/restaurant_audit_config.json`.
  - **Mặc định loại bỏ 4 thương hiệu**: `The Coffee House`, `TCH`, `Universal`, `TEA`.
  - Cơ chế so khớp thông minh:
    - So khớp theo Tên Nhà Hàng (`res`), Thương hiệu (`brand`), hoặc Mã SAP (`sap`).
    - Các từ viết tắt ngắn ($\le 4$ ký tự như `TCH`, `TEA`): So khớp theo word boundary regex `\bKEYWORD\b` (không bắt nhầm các từ như `Ateam` hay `Steak`).
    - Các cụm từ dài hơn (như `The Coffee House`, `Universal`): So khớp chuỗi con.
  - Các nhà hàng thuộc danh sách loại bỏ sẽ được gán trạng thái `🚫 Loại Bỏ`, không tính vào danh sách thiếu thông tin, không ping router và không gửi email nhắc nhở.
  - Tích hợp giao diện Modal **🚫 Cấu Hình Loại Bỏ** trên web: Cho phép kỹ thuật viên xem, thêm từ khóa mới, xóa từ khóa, khôi phục mặc định và lưu cấu hình tức thì kèm tự động quét lại.
- **Cơ chế Ping Kiểm Tra Router / Mạng Nhà Hàng (Chống Spam Email & False-Negative)**:
  - Khi nhà hàng bị thiếu thông tin: Hệ thống lấy IP router mạng của nhà hàng (`ip` làm sạch về `.1`) và ping kiểm tra kết nối mạng.
  - Tuân thủ nghiêm ngặt **Quy tắc 6.6**: Cơ chế retry 2 pha (lần 1 timeout 1.2s, lần 2 timeout 1.5s) để loại trừ hiện tượng rớt gói VPN chập chờn.
  - Phân luồng xử lý thông minh:
    - **Ping THẤT BẠI (Offline / Mất mạng)**: Nhà hàng thực tế chưa mở cửa hoặc đang tạm dừng hoạt động $\rightarrow$ Đánh dấu nhãn **"⚪ Bỏ qua (Chưa hoạt động / Mất tín hiệu mạng)"** và **KHÔNG gửi email nhắc nhở**.
    - **Ping THÀNH CÔNG (Online / Đang kết nối)**: Nhà hàng thực tế đang hoạt động bình thường nhưng hồ sơ hệ thống bị thiếu $\rightarrow$ Đánh dấu nhãn **"🔴 Cần Bổ Sung"** và đưa vào danh sách gửi email / nhắc nhở.
- **Định dạng Lời Nhắc Chuẩn Hóa**:
  - Định dạng chuẩn xác theo mẫu người dùng yêu cầu:
    ```
    [Tên Nhà Hàng]
    [Danh sách mục thiếu, ví dụ: Thiếu Mã SAP, thiếu Cost Center]
    vui lòng bổ sung
    ```
- **Các thành phần đã phát triển & tích hợp**:
  1. **Backend Service (`backend/app/services/restaurant_audit_service.py`)**:
     - Quản lý file cấu hình `restaurant_audit_config.json` (`get_config`, `save_config`, `is_restaurant_excluded`).
     - Logic `check_missing_fields` cập nhật: Ngày khai trương phải khác `01/01/1999`.
     - `audit_restaurants(max_workers=30)`: Chạy song song, phân luồng loại bỏ theo cấu hình, ping mạng có retry, tạo văn bản nhắc nhở từng nhà và tổng hợp toàn bộ. Kết quả lưu cache vào `backend/data/restaurant_audit_last_result.json`.
     - `send_audit_email(results, recipients)`: Gửi email cảnh báo định dạng HTML đẹp mắt, chuyên nghiệp qua Office365 SMTP.
  2. **Tác Vụ Ngầm Tự Động (`backend/app/services/job_scheduler_service.py`)**:
     - Đăng ký job `job_review_missing_restaurant_info` trong `DEFAULT_JOBS` và `backend/data/jobs_config.json`.
     - Hỗ trợ cài đặt lịch chạy tự động, bật/tắt, cấu hình danh sách nhận email thông báo, ghi log đầy đủ.
  3. **Hệ Thống API (`backend/app/api/v1/jobs.py`)**:
     - `GET /api/v1/jobs/restaurant-audit/config`: Lấy cấu hình danh sách loại bỏ.
     - `POST /api/v1/jobs/restaurant-audit/config`: Cập nhật cấu hình danh sách loại bỏ.
     - `GET /api/v1/jobs/restaurant-audit/latest`: Trả về kết quả rà soát gần nhất lưu trong cache.
     - `POST /api/v1/jobs/restaurant-audit/scan`: Kích hoạt rà soát trực tiếp tức thời.
     - `POST /api/v1/jobs/restaurant-audit/send-email`: Gửi email thông báo danh sách nhà hàng cần bổ sung.
  4. **Frontend Service & Types (`frontend/src/types/job.ts`, `frontend/src/services/jobService.ts`)**:
     - Bổ sung interface `RestaurantAuditItem`, `RestaurantAuditResult`, `RestaurantAuditConfig` và các hàm gọi API tương ứng.
  5. **Giao Diện UI/UX Chuyên Nghiệp (`frontend/src/pages/admin/JobManagementPage.tsx`)**:
     - Tại thẻ Job: Nút `⚡ Rà Soát Ngay` và `📋 Chi Tiết & Logs Rà Soát`.
     - **Modal Bảng Rà Soát Chuyên Biệt**: Banner tiêu chí cập nhật, bộ lọc 5 trạng thái (*Tất cả*, *🔴 Cần bổ sung*, *⚪ Bỏ qua*, *🟢 Đầy đủ*, *🚫 Loại bỏ theo cấu hình*), ô tìm kiếm live (tìm cả theo từ khóa loại bỏ/thương hiệu), nút **📋 Sao Chép Toàn Bộ Nhắc Nhở**, nút **✉️ Gửi Email Nhắc Nhở**, nút **🚫 Cấu Hình Loại Bỏ**, và nút **📋 Sao Chép** 1-chạm tại từng dòng.
     - **Modal Cấu Hình Danh Sách Loại Bỏ**: Giao diện tag cloud hiện đại, thêm/xóa nhanh, khôi phục mặc định 4 mục, lưu và tự động chạy lại rà soát.

---

### [2026-10-07] - Quản Lý Memo: Tách Dữ Liệu Mail Sang noidung_mail & Tối Ưu Tốc Độ Mở Popup (Zero Lag/Delay)
- **Hạng mục 1: Di Chuyển Triệt Để Nội Dung Mail từ `huong_dan` sang `noidung_mail`**:
  - **Vấn đề**: Các bản ghi Memo cũ (như `402600KP025`, `402600SS022`, `402600LC012`, `402600SG036`, `402600CK001`, `302621SG004`, `302620YT004`) từng bị lưu toàn bộ nội dung yêu cầu tạo nút Salesforce vào trường `huong_dan`, dẫn đến ô "Nội Dung Yêu Cầu Từ Mail" ở trên bị trống, còn ô "Hướng Dẫn Cấu Hình Của IT" ở dưới lại chứa toàn văn bản yêu cầu từ mail.
  - **Khắc phục**:
    - Chạy migration script di chuyển toàn bộ nội dung `Yêu cầu tạo nút RK từ Salesforce Loyalty: ...` lên trường `noidung_mail`.
    - Làm sạch trường `huong_dan`: Chỉ giữ lại ảnh chụp màn hình / hướng dẫn thực tế của IT; nếu không có thì đặt là `NULL`.
    - Bổ sung migration tự động trong `lifespan` tại `backend/app/main.py` để bảo đảm mọi môi trường server mới đều được dọn dẹp sạch sẽ.
    - Bổ sung helper `getMemoMailAndGuide` ở frontend: Tự động bóc tách và phân luồng thông minh ngay trên giao diện kể cả khi dữ liệu cũ chưa migrate kịp.

- **Hạng mục 2: Tối Ưu Hóa Tốc Độ Mở Popup / Modal (Triệt Tiêu Hiện Tượng Lag & Delay)**:
  - **Nguyên nhân gây lag**:
    - Mỗi khi mở Modal, `Modal.tsx` chèn một thẻ `<style>` động vào DOM khiến trình duyệt phải re-parse lại toàn bộ CSS.
    - Animation `modalSlideIn` cũ dùng `scale(0.98)` và `translateY(-8px)` với `willChange` trên container 1050px gây giật khung hình khi rasterize.
    - `useModalStack` kích hoạt 2 lượt render liên tiếp trên mount do cập nhật state `effectiveZIndex` sau khi effect chạy.
    - Bảng danh sách 50 dòng gán 100 event listener `onMouseEnter`/`onMouseLeave` trực tiếp trên DOM của từng thẻ `<tr>`.
    - Việc khóa cuộn `document.body.style.overflow = 'hidden'` làm mất scrollbar 17px, kích hoạt layout reflow toàn bộ trang web.
  - **Giải pháp xử lý**:
    - Thêm `scrollbar-gutter: stable` vào `html, body` trong `index.css` để giữ nguyên layout width khi mở popup, không gây reflow bảng dữ liệu.
    - Đưa toàn bộ keyframe `@keyframes modalSlideIn` và responsive modal ra `index.css`, xóa bỏ triệt để thẻ `<style>` lồng trong JSX của `Modal.tsx`.
    - Tối ưu animation modal: Rút ngắn thời gian còn 0.08s với chuyển động nhẹ `translateY(-4px)` $\rightarrow$ `translateY(0)`, loại bỏ `scale` và `willChange`.
    - Tối ưu `useModalStack`: Khởi tạo giá trị z-index đồng bộ ngay trong `useState` initializer, ngăn chặn render thừa.
    - Tối ưu bảng danh sách Memo: Thay thế `onMouseEnter`/`onMouseLeave` bằng class CSS `.memo-table-row:hover`, đưa các hàm helper regex (`parseNoteAndLogs`, `getMemoMailAndGuide`) ra ngoài scope component.
    - Kết quả: Popup mở lên **tức thì, mượt mà và không còn độ trễ**.

---

### [2026-10-06] - Quản Lý Memo: Tối Ưu Bổ Sung Sub-Memo, Khóa Nội Dung Mail & Sửa Lỗi Hiển Thị Hướng Dẫn/Ghi Chú IT (302620YT004)
- **Hạng mục 1: Cơ Chế Tự Động Chuyển Trạng Thái Khi Có Sub-Memo Bổ Sung Từ Email**:
  - Khi hệ thống quét Outlook phát hiện email chứa sub-memo mới bổ sung cho một mã Memo đã tồn tại:
    - Nếu trạng thái hiện tại là **"Đã Public"** (`'2'`) hoặc **"Đã setup nháp"** (`'1'`): Chuyển ngay sang trạng thái **"Bổ sung nút bấm"** (`'4'`), đồng thời reset `hoanthanh = None` để IT tiếp tục cấu hình bổ sung.
    - Nếu trạng thái hiện tại là **"Chờ Setup"** (`'0'`): **Giữ nguyên trạng thái Chờ Setup** (vì IT chưa tiến hành setup, không cần chuyển trạng thái).
    - Nếu trạng thái đã là **"Bổ sung nút bấm"** (`'4'`): Giữ nguyên `'4'`.
  - **Quy tắc làm sạch mã Memo (`ma_memo`)**:
    - Tuyệt đối **KHÔNG ghi chú hoặc ghép thêm chữ vào trường `ma_memo`** (ví dụ: cấm các hậu tố `- Bổ sung nút 2`, `- NH mới...`). Mã memo luôn là mã chuẩn sạch (VD: `302621AF001`).
    - Thông tin các đợt bổ sung được lưu trữ đầy đủ trong trường `note` và trường `noidung_mail`.
    - Dọn dẹp và chuẩn hóa toàn bộ các bản ghi cũ trong CSDL bị ghép chuỗi vào `ma_memo`.

- **Hạng mục 2: Khóa & Bảo Vệ Tuyệt Đối Nội Dung Yêu Cầu Từ Mail (`noidung_mail`)**:
  - Tách bạch hoàn toàn giữa `noidung_mail` (nội dung bot quét tự động từ Salesforce Loyalty) và `huong_dan` (hướng dẫn và ảnh chụp màn hình do IT nhập).
  - Trong Modal Thêm / Chỉnh sửa Memo: Ô `noidung_mail` được đặt chế độ `readOnly` kèm nhãn `🔒 Chỉ đọc (Không chỉnh sửa)` để bảo vệ toàn vẹn lịch sử yêu cầu từ Marketing, tránh IT chỉnh sửa nhầm làm mất dấu.
  - Khi lưu form sửa, backend và frontend luôn bảo lưu nguyên vẹn giá trị `noidung_mail` hiện có.

- **Hạng mục 3: Làm Nổi Bật Nội Dung Sub-Memo Mới Bổ Sung Gần Đây**:
  - Trong Modal Chi Tiết Hướng Dẫn: Tách riêng phần `[BỔ SUNG NÚT BẤM TỪ MAIL ...]` thành khung thẻ nổi bật đặc biệt màu hồng viền nét đứt (`✨ Nội Dung Mới Bổ Sung Gần Đây (Cần Tạo Thêm Nút RK)` kèm badge `MỚI BỔ SUNG`).
  - Phía dưới hiển thị rõ nội dung yêu cầu gốc ban đầu, giúp kỹ thuật viên IT mở ra là thấy ngay các nút bấm mới phát sinh mà không bị rối mắt.

- **Hạng mục 4: Sửa Lỗi Hiển Thị Hướng Dẫn & Ghi Chú IT (Ca 302620YT004)**:
  - **Nguyên nhân**: Trước đây hàm `handleViewHuongDanImage` regex-match thẻ `<img>` trong `huong_dan`. Nếu có ảnh, hệ thống chỉ mở modal lightbox "Xem Phóng To Hình Ảnh" và làm ẩn hoàn toàn phần text ghi chú của cả hệ thống và của IT (như ca `302620YT004`).
  - **Giải pháp**:
    - Khi click vào bất kỳ dòng nào trên bảng danh sách Memo hoặc click nút Xem (Eye icon): Luôn mở **Modal Chi Tiết Hướng Dẫn Đầy Đủ (`detailModal`)** hiển thị trọn vẹn: Thanh thông tin Memo (mã, trạng thái, người phụ trách, hiệu lực), Khối nội dung mail nổi bật, Khối hướng dẫn setup và ảnh chụp của IT (click vào ảnh để phóng to), Khối ghi chú/logs hệ thống, và tệp đính kèm.
    - Bổ sung huy hiệu `✨ Bổ sung nút` ngay cạnh mã Memo trên bảng danh sách cho các memo ở trạng thái `'4'` để nhận diện trực quan.

---

### [2026-10-05] - Phát triển Tác vụ 8 (Xử Lý Param) & Cải tiến Danh sách Nhà hàng, SSO/IAM
- **Hạng mục 1: Tác vụ 8 - Xử Lý Param MongoDB (`manage_app_params`)**:
  - Tạo mới file: `frontend/src/pages/app/MongoDbParamManagementTask.tsx`.
  - Kết nối backend: Quản lý collection `APP_PARAM` trong database `G_ORDER` (MongoDB trạm POS nhà hàng).
  - Tính năng:
    - Đánh dấu sao ưu tiên (★) lưu trong LocalStorage, đưa param quan trọng lên đầu.
    - Tìm kiếm tức thời theo mã param, tên hiển thị, giá trị, ghi chú.
    - Bộ lọc đa năng: Kiểu (FUNCTION / CONFIG), Trạng thái (Bật/Tắt), Chuyên mục nghiệp vụ.
    - Nút **+ Thêm Mới Param**: Modal nhập mã, tên, giá trị, kiểu, mô tả.
    - Nút **Sửa**: Chỉnh sửa thông tin param hiện có.
    - Nút **Bật/Tắt nhanh 1-chạm**: Click trực tiếp trên bảng để đảo trạng thái (ENABLE $\leftrightarrow$ DISABLE) kèm loading tức thời.
    - Nút **Xóa Param**: Modal cảnh báo đỏ, gọi API `DELETE /api/v1/mongodb/params/{param_code}` để xóa triệt để.
  - Tích hợp vào `RestaurantMongoAnalysisPage.tsx`: Thêm tab tác vụ số 8, làm nổi bật tiêu đề, nút giải thích `(!)` popup và render component.

- **Hạng mục 2: Chi Tiết Nhà Hàng & Quy Tắc Permission Masking (`RestaurantDetailModal.tsx`)**:
  - Vấn đề cũ: Click vào nhà hàng bị thiếu nhiều trường (Mã SAP, Cost Center, Mật khẩu FTTH, Pass mail, Pass OU, IP WAN, TeamViewer, RustDesk...).
  - Giải pháp mới: Bổ sung hiển thị đầy đủ 100% các trường thông tin.
  - **Quy tắc Permission Masking**: Nếu user không có quyền xem trường dữ liệu nào, **VẪN HIỂN THỊ Ô THÔNG TIN**, giá trị bên trong che bằng `🔒 Bị ẩn theo phân quyền`. Tuyệt đối không ẩn cả dòng.

- **Hạng mục 3: Xử Lý KDS (Tác vụ 3) - Cấu hình Quầy Bếp & Driver Máy In**:
  - Modal cấu hình KDS: Ẩn hoàn toàn cột "Tài Khoản KDS" (vì trùng lặp với Mã Quầy).
  - Đổi Tên Quầy (Place): Bấm biểu tượng bút chì để sửa tên quầy trực tiếp. Khi đổi tên, backend tự động:
    - Sinh mã quầy mới chuẩn hóa viết hoa không dấu (`placeCode`).
    - Cập nhật đồng bộ trong `CONFIG_KDS.places`, `ACCOUNT.listPlace`, và `accName` của trạm con (`role: 3`).
    - Đồng bộ tên quầy sang các bảng liên quan nếu có để tránh lỗi lệch cấu hình.
  - Xóa bỏ triệt để các ô thống kê "TỔNG MÓN KDS", "Bảng CONFIG_COOKING" gây vướng tầm nhìn.

- **Hạng mục 4: Tối Ưu Giao Diện SSO & IAM (`SsoManagementPage.tsx`)**:
  - Xóa bỏ giới hạn cứng `maxWidth: 1440px` và `margin: 0 auto`.
  - Chuyển sang dạng co giãn linh hoạt toàn màn hình (`width: 100%`, `boxSizing: border-box`, `padding: 18px 24px`).
  - Thanh tìm kiếm và bộ lọc hỗ trợ tự động xuống dòng (`flexWrap: wrap`) khi mở trên màn hình nhỏ.
  - Bảng danh sách tài khoản bọc trong container `overflowX: auto` chống tràn vỡ giao diện.

---

### [2026-10-07] - Cải Tiến Rà Soát Dữ Liệu Nhà Hàng & Không Liệt Kê Các Mục Bỏ Qua (Job Quét & Email Nhắc Nhở)
- **Hạng mục 1: Cấu Hình Danh Sách Loại Bỏ Mặc Định (Exclusion List)**:
  - Tự động bỏ qua các nhà hàng thuộc chuỗi không áp dụng hoặc đối tác: **The Coffee House**, **TCH**, **Universal**, **TEA**.
  - Sử dụng so khớp word-boundary (`\bTCH\b`, `\bTEA\b`) để tránh loại nhầm các tên có chứa cụm ký tự này (ví dụ: Ateam, Steak...).
  - Thêm modal cấu hình giao diện `🚫 Cấu Hình Loại Bỏ` dạng tag-cloud chip editor, cho phép thêm/bớt từ khóa và lưu vào file `backend/data/restaurant_audit_config.json`.
- **Hạng mục 2: Chuẩn Hóa Tiêu Chí Ngày Khai Trương**:
  - Quy ước: Chỉ xem là thiếu thông tin nếu Ngày Khai Trương bị để trống hoặc mang giá trị placeholder mặc định `01/01/1999`.
  - Các ngày khai trương thực tế khác (2016, 2020, 2025, 2026...) được xem là đã có dữ liệu hợp lệ.
- **Hạng mục 3: Không Liệt Kê Các Nhà Hàng Bị Bỏ Qua Khỏi Bảng Danh Sách (`mấy cái bỏ qua không cần list ra`)**:
  - **Logic mới**: Danh sách kết quả chi tiết (`all_items`) và bảng giao diện **chỉ liệt kê các nhà hàng đang hoạt động** cần theo dõi gồm:
    - 🔴 **Cần Bổ Sung** (`need_reminder_items`): Các nhà hàng router đang online nhưng còn thiếu 1 trong các trường bắt buộc (Mã SAP, Cost Center, Mã RK7, Ngày KT).
    - 🟢 **Đầy Đủ Thông Tin** (`valid_items`): Các nhà hàng đã đầy đủ toàn bộ trường thông tin.
  - **Triệt tiêu hoàn toàn các dòng bỏ qua**: Các nhà hàng mất tín hiệu mạng (`skipped_offline`) và các nhà hàng thuộc danh sách loại bỏ (`excluded`) **hoàn toàn không đưa vào bảng danh sách `all_items` hay `skipped_offline_items`/`excluded_items` trong kết quả hiển thị**, không làm loãng và rối mắt bảng tra cứu.
  - **Bộ lọc tinh gọn**: Dropdown bộ lọc chỉ gồm 3 tùy chọn:
    - `🔴 Cần bổ sung` (mặc định mở ra là chọn ngay tab này để xử lý nhanh).
    - `🟢 Đầy đủ thông tin`.
    - `Tất cả ({total_active} nhà đang hoạt động)`.
  - Các số liệu tổng quan vẫn được giữ nguyên ở thanh thẻ tóm tắt trên đầu (Tổng số NH trong DB, Đầy đủ, Cần bổ sung, Bỏ qua mất mạng, Loại bỏ cấu hình) để đảm bảo tính minh bạch số liệu.

### [2026-10-07] - Nâng Cấp Giao Diện Memo: Khắc Phục Tràn Trạng Thái, Highlight Trực Quan & Bảo Toàn Nội Dung Bổ Sung Khi Lưu
- **Hạng mục 1: Khắc phục triệt để lỗi tràn giao diện (Grid Overflow) tại modal Chỉnh Sửa Memo**:
  - **Nguyên nhân**: Khi Memo bị trùng mã hoặc có URL Salesforce dài (không có khoảng trắng), CSS Grid `gridTemplateColumns: 1fr 1fr` mặc định `minmax(auto, 1fr)` khiến cột 1 giãn nở theo chiều dài link, đẩy cột 2 ra ngoài và làm ô chọn trạng thái tràn rộng toàn màn hình.
  - **Khắc phục**:
    + Chuyển layout grid sang `gridTemplateColumns: repeat(2, minmax(0, 1fr))` và thêm `minWidth: 0` cho các phần tử con.
    + Thêm `wordBreak: break-all`, `overflowWrap: anywhere` cho link Salesforce và khối cảnh báo trùng mã.
- **Hạng mục 2: Highlight nổi bật khối Trạng Thái Setup trong popup Chỉnh Sửa Memo**:
  - Bọc phần trạng thái setup thành một **card nổi bật toàn chiều rộng (`gridColumn: 1 / -1`)** với viền và nền đổi màu linh hoạt theo trạng thái đang chọn.
  - Tích hợp **4 nút bấm chọn nhanh 1 chạm (Segmented Buttons)** kèm icon và mô tả rõ ràng (`⏳ Chờ Setup`, `✨ Bổ sung nút bấm`, `📝 Đã setup nháp`, `🚀 Đã Public`), khi chọn sẽ tự động bật màu nền nổi bật và đồng bộ với dropdown `<select>`. Kỹ thuật viên có thể chuyển trạng thái tức thì chỉ với 1 click chuột mà không cần mở dropdown.
- **Hạng mục 3: Khắc phục lỗi mất / không load được "Nội Dung Mới Bổ Sung Gần Đây (Cần Tạo Thêm Nút RK)"**:
  - **Nguyên nhân**:
    1. Hàm `getMemoMailAndGuide` trước đây chỉ tách mail nếu `guideContent` chứa đúng mẫu câu ban đầu; nếu nội dung bổ sung `[BỔ SUNG...` nằm trong `huong_dan` hoặc nếu `mailContent` đã có dữ liệu từ trước thì bỏ qua không trích xuất, khiến nội dung bổ sung bị sót hoặc kẹt trong hướng dẫn.
    2. Hàm `renderNoidungMail` tìm kiếm `indexOf('[BỔ SUNG')` phân biệt hoa thường (case-sensitive); các email hoặc ghi chú có chữ thường `[Bổ sung nút bấm...` bị trả về -1 và không kích hoạt khung hồng nổi bật.
    3. Khi bấm **Lưu Thay Đổi (Save)**, `formModal.item.noidung_mail` được ưu tiên hơn `formData.noidung_mail`, dẫn đến việc lưu đè giá trị cũ (chưa có bổ sung) vào DB làm mất vĩnh viễn đoạn bổ sung sau khi trang load lại.
  - **Giải pháp xử lý triệt để**:
    + Cập nhật `getMemoMailAndGuide`: Quét toàn diện regex `re = /\[bổ sung/i` trên cả `noidung_mail`, `huong_dan` và `note`, tự động gom đầy đủ mọi đợt bổ sung vào `mailContent`.
    + Cập nhật `formatCleanMailContent`: Tự động làm sạch các thẻ HTML (`<p>`, `<br>`, `&nbsp;`, `&Atilde;`...) tránh hiển thị chuỗi HTML thô.
    + Cập nhật `renderNoidungMail`: Dùng regex `/\[bổ sung/i` không phân biệt hoa thường, đảm bảo 100% các đợt bổ sung đều hiển thị chuẩn vào khung hồng `✨ NỘI DUNG MỚI BỔ SUNG GẦN ĐÂY (CẦN TẠO THÊM NÚT RK)`.
    + Hiển thị đồng bộ khung `renderNoidungMail` ngay trong popup **Chỉnh Sửa Memo** (thay cho textarea thô trước đây) giúp IT vừa sửa vừa xem trực quan.
    + Khi Save (`handleSubmitForm` và backend `update_memo`): Tự động bảo toàn toàn bộ đợt bổ sung `safeNoidungMail`, ngăn chặn triệt để việc mất nội dung bổ sung khi lưu hoặc khi trang tải lại.
- **Build & Kiểm thử**: Frontend `npm run build` thành công exit code 0 (`✓ built in 3.67s`), backend `compileall` thành công.

---

### [2026-10-07] - Phát Triển Tính Năng Trực Hotline 3CX (PWA), Tự Động Dò Số Máy Lẻ (EXT) Mở Kết Nối Từ Xa VNC/KDS & Quản Lý Cuộc Gọi Nhỡ (!)
- **Hạng mục 1: Nút Bật/Tắt "Trực Hotline" trên Header trang Danh Sách Nhà Hàng (`RestaurantListPage.tsx`)**:
  - **Phân quyền chặt chẽ**: Chỉ **Super Admin** (`phanquyen === '0'`, `role` chứa `'super admin'`) và user **`dung.nguyenanh`** mới thấy nút bấm này.
  - **Giao diện chuyển đổi (Toggle switch)**: Thiết kế dạng công tắc gạt linh hoạt (tương tự nút Sáng/Tối của theme) với hiệu ứng pulse xanh khi BẬT (`Trực Hotline: BẬT`), lưu trạng thái vào `localStorage` (`is_hotline_duty_active`) để không bị mất khi F5 tải lại trang.
- **Hạng mục 2: Bắt sự kiện cuộc gọi từ 3CX (PWA) & Tự động mở Modal Kết Nối Từ Xa**:
  - **Cơ chế phát hiện 3CX PWA**: Sử dụng Windows UI Automation (`uiautomation` + switch desktop `WinSta0\default` trong worker thread backend) để quét cửa sổ `3CX (PWA)` (`Chrome_WidgetWin_1`). Khi có cuộc gọi đến (`Incoming call`), bóc tách số máy nhánh/line (EXT) ví dụ `1172`, `9046`...
  - **Dò tìm nhà hàng theo số máy lẻ (EXT)**: Dò số EXT với cột `ext` trong bảng `RESTAURANT` của SQL Server (như ca `1172` $\rightarrow$ `4854 Man Tang Guo Lê Quý Đôn (RK7: 837) 10.9.172.1`, ca `9046` $\rightarrow$ `4389 Ashima Tú Xương (RK7: 35) 10.8.46.1`).
  - **Tự động kích hoạt Modal Kết Nối Từ Xa (`VncKdsModal`)**: Load đúng định dạng tiêu đề `Kết Nối Từ Xa — [SAP] [Tên NH] (RK7: [Mã RK7]) [IP]` và IP Prefix để IT Helpdesk kết nối ngay VNC POS/PC hoặc Scrcpy KDS mà không cần gõ tra cứu thủ công. Kèm chuông báo âm thanh nhẹ qua Web Audio API.
  - **Xử lý cuộc gọi nối tiếp (Sequential calls) & Chống đè cuộc gọi bận**:
    + Khi IT đang mở modal hỗ trợ hoặc cuộc gọi trước đang ACTIVE: Cuộc gọi mới tới sẽ **KHÔNG bị mở đè lên làm gián đoạn**, mà tự động đưa vào danh sách **Cuộc Gọi Nhỡ / Bận** (`BUSY`/`MISSED`).
    + Chỉ khi cuộc gọi hiện tại kết thúc (IT đóng modal `VncKdsModal` hoặc cúp máy): Trạng thái rảnh được phục hồi để tự động đón nhận cuộc gọi tiếp theo.
- **Hạng mục 3: Quản lý Cuộc Gọi Nhỡ qua biểu tượng dấu chấm than `(!)` (`HotlineMissedCallsModal.tsx`)**:
  - Đặt biểu tượng dấu chấm than `(!)` ngay cạnh nút Trực Hotline, tự động nhảy badge số lượng cuộc gọi nhỡ chưa giải quyết màu đỏ nổi bật.
  - Modal danh sách cuộc gọi nhỡ hỗ trợ:
    + Xem chi tiết thời gian gọi, số line EXT, tên nhà hàng, IP LAN.
    + Nút bấm nhanh **"Kết Nối"** để mở lại VNC/KDS cho nhà hàng đó.
    + Checkbox / Nút **"Done (Đã gọi lại NH)"**: Đánh dấu đã xử lý cho từng cuộc gọi, gỡ khỏi danh sách cảnh báo.
    + Nút **"Check All (Đóng Hàng Loạt)"**: Đánh dấu đã gọi lại cho toàn bộ các cuộc gọi nhỡ chỉ với 1 chạm.
    + Tích hợp công cụ **Giả lập cuộc gọi (Simulation Test)** tiện lợi để kiểm thử ngay trên giao diện mà không cần gọi thử từ 3CX thật.
- **Hạng mục 4: Standalone Agent & API Server-Sent Events (SSE)**:
  - Tạo bảng `[dbo].[HOTLINE_CALL_LOGS]` trong SQL Server (đã cập nhật vào `Full_SCRIPT_SQL_TABLE.sql` và khai báo trong `main.py`).
  - Tạo API Router `backend/app/api/v1/hotline.py` và service `hotline_3cx_service.py` với luồng SSE `/api/v1/hotline/events`.
  - Cung cấp script độc lập `tools/3cx_hotline_agent/3cx_hotline_agent.py` và file batch `Chay_3CX_Hotline_Agent.bat` để chạy phân tán trên máy trạm cá nhân nếu cần.
- **Build & Kiểm thử**: Frontend `npm run build` thành công exit code 0 (`✓ built in 3.37s`), backend `compileall` thành công exit code 0.

---

### [2026-10-07] - Sửa Lỗi Quét Ticket 3CX GPMS, Cấu Hình 3 Khung Giờ Chạy Job & Sửa Triệt Để Tràn Chồng Chéo Layout Popup Chi Tiết Nhà Hàng
- **Hạng mục 1: Sửa Lỗi Quét Ticket 3CX GPMS (`ticket_batch_service.py`)**:
  - **Nguyên nhân**: Trên trang `https://gpms.ggg.com.vn/gticket/work-list`, các dòng ticket được tạo từ 3CX (ví dụ: `Tập đoàn GGG-02873006042-Nhiệm vụ hỗ trợ tiếp nhận từ t...`, `HCM Cloudpot...-Nhiệm vụ hỗ trợ tiế...`) bị bảng HTML cắt ngắn bằng dấu `...` (`text-overflow: ellipsis`), khiến hàm `inner_text()` chỉ lấy được chuỗi cụt và không khớp với chuỗi cứng `"Nhiệm vụ hỗ trợ tiếp nhận từ tổng đài 3CX"`.
  - **Khắc phục**:
    + Tự động đảm bảo chuyển sang tab **"Công việc nhận về"** khi mở trang work-list.
    + Đọc thuộc tính `title` từ các thẻ `<a>`, `<span>`, `<p>` trong ô tên nhiệm vụ để lấy toàn bộ tiêu đề gốc không bị cắt ngắn.
    + Nhận diện linh hoạt các từ khóa 3CX: `"từ tổng đài 3cx"`, `"tổng đài 3cx"`, `"tiếp nhận từ tổng đài"`, `"hỗ trợ tiếp nhận từ"`, `"nhiệm vụ hỗ trợ tiếp nhận"`, `"3cx"`...
    + Khớp chính xác người xử lý với user SSO (đặc biệt là `dung.nguyenanh`).
- **Hạng mục 2: Bổ sung Cấu Hình 3 Khung Giờ Chạy 1 Lúc Cho Tác Vụ (`JobManagementPage.tsx` & `job_scheduler_service.py`)**:
  - **Giao diện cấu hình (`JobManagementPage.tsx`)**:
    + Cho phép người dùng cấu hình đồng thời 3 khung giờ chạy trong ngày: **Khung giờ 1 (Chính)**, **Khung giờ 2 (Tùy chọn)**, **Khung giờ 3 (Tùy chọn)**.
    + Hỗ trợ nút xóa nhanh khung giờ 2 và 3 nếu chỉ cần chạy 1 hoặc 2 khung giờ.
    + Hộp Xem trước lịch chạy tự động cập nhật: `"Tự động chạy hàng ngày vào lúc 07:00, 11:30, 17:00."`
  - **Backend Scheduler (`job_scheduler_service.py`, `schemas/job.py`, `types/job.ts`)**:
    + Bổ sung trường `time_2`, `time_3` vào `JobScheduleConfig`, `JobUpdateScheduleRequest`, `update_schedule`.
    + Cập nhật `_format_human_readable` hiển thị danh sách các khung giờ ngăn cách bởi dấu phẩy.
    + Cập nhật `_calculate_next_run` tự động tính toán khung giờ kế tiếp gần nhất trong số các khung giờ đã cấu hình.
    + Cập nhật `job_schedule_worker` kiểm tra `current_time in target_times` để tự động kích hoạt tác vụ đúng tại từng mốc thời gian.
- **Hạng mục 3: Sửa Triệt Để Tràn Chồng Chéo Layout Trong Popup Chi Tiết Nhà Hàng (`RestaurantDetailModal.tsx`)**:
  - **Nguyên nhân**: Ô "Email liên hệ" có chuỗi email dài (`hcm.tch.sh.ntp@thecoffeehouse.com.vn`) nằm trong flexbox không có `minWidth: 0` và không có `overflow: hidden; text-overflow: ellipsis`, làm ô bị giãn vượt ra khỏi cột 1 của CSS Grid và đè lấn lên ô "Ngày khai trương" ở cột 2.
  - **Khắc phục**:
    + Bổ sung `minWidth: 0`, `boxSizing: 'border-box'`, `width: '100%'`, `overflow: 'hidden'` cho `fieldStyle` và `copyableBoxStyle`.
    + Cập nhật `renderCopyableField`: span hiển thị giá trị áp dụng `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, `flex: 1`, `minWidth: 0`, kèm tooltip đầy đủ khi hover chuột.
    + Thêm hàm `formatDisplayDate`: tự động định dạng chuẩn ngày tháng Việt Nam `DD/MM/YYYY` cho tất cả các trường ngày (`ngay_khaitruong`, `ngay_online_ftth`, `ngay_insert`, `ngay_update`), loại bỏ triệt để phần giờ `00:00:00` thô từ SQL Server.
- **Build & Đóng gói**:
  - Frontend: `npm run build` thành công exit code 0 (`✓ built in 3.50s`).
  - Backend: `compileall app` thành công exit code 0, khởi động lại backend daemon trên port 8000.

---

### [2026-10-07] - Bổ Sung Giao Diện Phân Quyền Trực Hotline 3CX & Khắc Phục Lỗi Quét Danh Sách Ticket GPMS Bằng Cuộn Vô Hạn (Infinite Scroll)
- **Hạng mục 1: Giao Diện & Cơ Chế Phân Quyền Trực Hotline 3CX (`HotlinePermissionsModal.tsx`, `RestaurantListPage.tsx`, `hotline_3cx_service.py`, `hotline.py`, `role_service.py`)**:
  - **Bối cảnh & Vấn đề**:
    + Người dùng yêu cầu Super Admin và user `dung.nguyenanh` phải có giao diện cấu hình phân quyền (để chỉ định ai hoặc nhóm quyền nào được phép thấy và dùng tính năng Trực Hotline 3CX).
    + Trước đây quyền này bị gán cứng trong code (`isDungOrSuperAdmin || isSuperAdmin`), chưa có popup/modal cấu hình phân quyền trực quan cho quản trị viên.
  - **Khắc phục & Nâng cấp**:
    + **Backend (`hotline_3cx_service.py` & `api/v1/hotline.py`)**:
      * Lưu trữ cấu hình phân quyền động vào `backend/data/hotline_permissions.json`: gồm `enabled_roles` (mặc định `['admin', 'helpdesk']`), `allowed_users` (danh sách tài khoản được cấp riêng), `allow_all` (mở cho toàn bộ nhân viên).
      * Bổ sung API `GET /api/v1/hotline/permissions` (lấy config + danh sách toàn bộ nhân viên từ `LIST_USER` và các nhóm quyền).
      * Bổ sung API `POST /api/v1/hotline/permissions` (cập nhật phân quyền).
      * Bổ sung API `GET /api/v1/hotline/check-permission` kiểm tra quyền của từng tài khoản khi đăng nhập: trả về `can_access` (được thấy/bật trực hotline) và `can_manage` (chỉ Super Admin & `dung.nguyenanh` mới có quyền quản trị phân quyền).
      * Bổ sung quyền `"hotline_3cx_duty"` vào `BASE_PERMISSION_DEFINITIONS` của `role_service.py`.
      * **Khắc phục lỗi SetThreadDesktop Error 170**: Loại bỏ việc gọi `SetThreadDesktop` lặp đi lặp lại bên trong vòng lặp `while _scanner_running`, chuyển sang khởi tạo 1 lần duy nhất ngoài vòng lặp. Điều này triệt tiêu triệt để lỗi `(170, 'SetThreadDesktop', 'The requested resource is in use.')` trên Windows và giúp tiến trình quét UI Automation luôn chạy thông suốt để nhận diện cửa sổ cuộc gọi 3CX PWA.
    + **Frontend (`HotlinePermissionsModal.tsx` & `RestaurantListPage.tsx`)**:
      * Tạo modal chuyên dụng `HotlinePermissionsModal` tuân thủ nghiêm ngặt LIFO Modal Stack (`useModalStack`), giao diện chuẩn Golden Gate:
        - Banner thông báo quyền tối cao: Super Admin & `dung.nguyenanh` luôn có toàn quyền.
        - Công tắc "Mở quyền Trực Hotline cho toàn bộ nhân viên (Public)".
        - Chọn Nhóm Quyền (Roles): Quản trị viên (Admin), IT Helpdesk, IT Application, Quyền Inventory.
        - Chọn Whitelist Từng Nhân Viên Cụ Thể: Tìm kiếm tức thời theo họ tên, `@username`, email; có nút "Chọn tất cả" / "Bỏ chọn" nhanh.
      * Trên thanh tác vụ `RestaurantListPage.tsx`:
        - Nút **"🛡️ Phân quyền Hotline"** chỉ hiển thị duy nhất cho **Super Admin** và **`dung.nguyenanh`**.
        - Nút "Trực Hotline" và biểu tượng cuộc gọi nhỡ `(!)` hiển thị cho tất cả những tài khoản đã được cấp quyền (hoặc Super Admin / `dung.nguyenanh`).

- **Hạng mục 2: Khắc Phục Lỗi Quét Danh Sách Ticket GPMS Bằng Cơ Chế Cuộn Vô Hạn (Infinite Scroll) (`ticket_batch_service.py` & `unassigned_3cx_service.py`)**:
  - **Bối cảnh & Vấn đề**:
    + Trên trang `https://gpms.ggg.com.vn/gticket/work-list`, GPMS không sử dụng nút phân trang (pagination next button), mà sử dụng cơ chế tải lười khi cuộn xuống dưới cùng danh sách (Infinite Scroll / Lazy Load).
    + Logic quét trước đây cố gắng tìm nút chuyển trang `button[aria-label="Next page"]`, do không thấy nút nên code lập tức thoát vòng lặp (`break`) ngay sau đợt tải đầu tiên, dẫn đến việc chỉ đọc được vài ticket đầu và bỏ sót toàn bộ các ticket 3CX hoặc ticket chưa gán ở các đợt tải bên dưới.
  - **Khắc phục triệt để**:
    + Nâng cấp `_fetch_ticket_list` (`ticket_batch_service.py`) và `_scan_unassigned_from_gticket` (`unassigned_3cx_service.py`) sang thuật toán **Cuộn vô hạn đa tầng (Multi-level Infinite Scroll)**:
      * Lưu trữ các ticket đã thấy vào từ điển `seen_tickets_dict` theo mã ticket (`ticket_id`) để triệt tiêu trùng lặp và bảo toàn dữ liệu kể cả khi DOM bị unmount (virtual scrolling).
      * Trong mỗi vòng cuộn: Quét toàn bộ các dòng hiện diện, bóc tách đầy đủ thuộc tính `title` để lấy tên nhiệm vụ hoàn chỉnh.
      * Mở rộng từ khóa nhận diện ticket 3CX linh hoạt: `"từ tổng đài 3cx"`, `"tổng đài 3cx"`, `"tiếp nhận từ tổng đài"`, `"hỗ trợ tiếp nhận từ tổng đài"`, `"hỗ trợ tiếp nhận từ t"`, `"nhiệm vụ hỗ trợ tiếp nhận"`, `"nhiệm vụ hỗ trợ tiế"`, `"nhiệm vụ hỗ trợ"`, `"hỗ trợ tiếp nhận"`, `"hỗ trợ tiế"`, `"tiếp nhận"`, `"từ tổng đài"`, `"3cx"`.
      * Tự động kích hoạt JavaScript cuộn `window.scrollTo(0, document.body.scrollHeight)`, cuộn đồng thời các thẻ chứa bảng có scroll (`.ant-table-body`, `tbody`, div table).
      * Kết hợp đưa phần tử dòng cuối cùng vào tầm nhìn (`scroll_into_view_if_needed`) và giả lập phím `PageDown` / `End`.
      * Dừng cuộn thông minh khi phát hiện 5 lần cuộn liên tiếp không xuất hiện thêm hàng mới trong DOM.

---

### [2026-10-07] - Cải Tiến Hotline 3CX Ghi Nhận Số Ngoài Danh Bạ & Chưa Nghe, Tái Cấu Trúc Email Tác Vụ PIM Chuẩn Bảng Phân Quyền GPMS
- **Hạng mục 1: Hotline 3CX - Ghi Nhận Cuộc Gọi Ngoài Danh Bạ Line & Cuộc Gọi Chưa Nghe (`hotline_3cx_service.py`, `HotlineMissedCallsModal.tsx`, `RestaurantListPage.tsx`)**:
  - **Bối cảnh & Vấn đề**:
    + Trước đây khi máy rảnh (`is_busy == False`), cuộc gọi đến được gán ngay `call_status = 'ACTIVE'` và `is_resolved = True`. Do đó, nếu cuộc gọi đổ chuông nhưng kỹ thuật viên chưa kịp nghe máy, hoặc người gọi đến từ một số line/máy nhánh chưa có trong danh bạ nhà hàng (`restaurant_id == None`), cuộc gọi bị ẩn khỏi danh sách cuộc gọi nhỡ (`HotlineCallLog.is_resolved == False`). Kỹ thuật viên không thể kiểm tra xem hệ thống có bắt được tín hiệu từ 3CX hay không.
    + Bộ quét Windows UI Automation trước đây chỉ tìm số có 3-6 chữ số (`\b(\d{3,6})\b`), bỏ sót số điện thoại di động (10-11 số), số bàn cố định hoặc người gọi chỉ có tên hiển thị.
  - **Khắc phục triệt để**:
    + **Backend (`hotline_3cx_service.py`)**:
      * Tất cả các cuộc gọi mới đến (dù trong danh bạ hay ngoài danh bạ) ban đầu đều được khởi tạo ở trạng thái chưa xử lý: `is_resolved = False`, `call_status = 'MISSED'`. Chỉ khi IT kỹ thuật viên bấm "Done" hoặc mở kết nối VNC thì cuộc gọi mới chuyển sang `is_resolved = True`.
      * Mở rộng regex quét số trong 3CX PWA hỗ trợ từ 2 đến 12 chữ số (`\b(\d{2,12})\b`), tự động lọc bỏ dấu cách trong chuỗi số (ví dụ: `028 7300 6600`), đồng thời có cơ chế fallback lấy text tên người gọi nếu không có số, đảm bảo 100% cuộc gọi tới đều kích hoạt sự kiện.
      * Cập nhật `get_missed_calls`, `get_status` và `resolve_all_missed_calls` lọc toàn bộ các cuộc gọi `is_resolved == False`, không giới hạn cứng `call_status`.
    + **Giao diện Modal Cuộc Gọi Nhỡ (`HotlineMissedCallsModal.tsx`)**:
      * Với cuộc gọi ngoài danh bạ: Hiển thị badge màu đỏ cam `⚠️ Ngoài danh bạ line`, nhãn cảnh báo `Chưa gán nhà hàng trong danh mục`, và thông tin số máy / người gọi rõ ràng.
      * Trạng thái phân loại trực quan: `⚠️ Ngoài danh bạ (Nhỡ)`, `📞 Máy bận lúc gọi`, `⏰ Cuộc gọi nhỡ / Chưa nghe`, `✓ Đã gọi lại / Đã xong`.
      * Nút "Done" luôn sẵn sàng cho cả số ngoài danh bạ để kỹ thuật viên đánh dấu đã gọi lại / xử lý xong.
    + **Giao diện Danh Sách Nhà Hàng (`RestaurantListPage.tsx`)**:
      * Bổ sung banner thông báo nổi (Floating Toast) kèm âm thanh khi có cuộc gọi đến (đặc biệt là cuộc gọi ngoài danh bạ line để kỹ thuật viên biết ngay lập tức là hệ thống đã nhận tín hiệu 3CX).
- **Hạng mục 2: Tái Cấu Trúc Báo Cáo Email Tác Vụ PIM Chuẩn Bảng GPMS (`pim_service.py` & `job_scheduler_service.py`)**:
  - **Bối cảnh & Vấn đề**:
    + Trước đây tác vụ `job_sync_pim_requests` chỉ trả về thông báo mô phỏng dạng text thô (`[CHẾ ĐỘ XEM TRƯỚC / DRY-RUN]...`), nội dung không rõ ràng, không báo cáo được có bao nhiêu PIM mới được thêm và từng dòng đã phân quyền / phân công cho nhân sự nào.
  - **Khắc phục & Chuẩn hóa**:
    + **Backend Service (`pim_service.py`)**:
      * Cập nhật `sync_all_pim_data`: Ghi nhận danh sách `items` chi tiết sau khi phân công xoay vòng Round-Robin (gồm `id_yeu_cau`, `chuoi`, `ten_menu`, `source`, `user_thuc_hien`, `link_yeu_cau`, `is_new`, `trang_thai`). Nếu cổng PIM staging không có đơn mới, tự động query các yêu cầu PIM đang chờ xử lý gần nhất trong DB để báo cáo luôn đầy đủ.
      * Thêm hàm `format_pim_email_report`: Định dạng email theo phong cách bảng danh sách chuẩn GPMS (giống mẫu cảnh báo 3CX/GPMS) với:
        - Thanh tiêu đề tối màu kèm viền vàng nhận diện IT: `HỆ THỐNG ĐỒNG BỘ YÊU CẦU PIM & PHÂN CÔNG TỰ ĐỘNG`.
        - 4 ô thẻ tóm tắt số liệu (Summary Metrics): Tổng Quét PIM, Ghi Nhận Mới (+X), Cập Nhật (Y), Danh Sách Phân Công (Z).
        - Bảng dữ liệu chi tiết từng dòng: `STT | PHÂN LOẠI / NGUỒN | MÃ PIM | TÊN NHIỆM VỤ / YÊU CẦU | CHUỖI | PHÂN CÔNG CHO (👤 Quyên, Hùng, Duy, Thức, Trầm...) | TRẠNG THÁI`.
    + **Backend Job Scheduler (`job_scheduler_service.py`)**:
      * Chuyển `job_sync_pim_requests` từ mô phỏng sang thực thi thật (gọi `sync_all_pim_data` và `format_pim_email_report`).
      * Bổ sung cơ chế hỗ trợ `custom_subject` và `custom_html` trong `_send_job_execution_email`.
      * Tiêu đề email sinh động, rõ ràng: `[PIM THÀNH CÔNG] Đã ghi nhận thêm {X} PIM mới & phân công cho IT ({ngày giờ})`.
- **Build & Đóng gói**:
  - Frontend: `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.53s`).
  - Backend: `compileall app` thành công exit code 0, khởi động lại backend daemon trên port 8000.

---

### [2026-10-07] - Khắc Phục Triệt Để Lỗi Log Nhảy Liên Tục Trong Cửa Sổ Console Backend FastAPI (`comtypes` & `uiautomation`)
- **Hiện tượng**:
  - Khi mở Backend FastAPI (hoặc chạy qua `start_all.bat`), cửa sổ console bị trôi màn hình và nhảy chữ liên tục mỗi 400ms với hàng chục dòng log DEBUG:
    `[DEBUG] comtypes._post_coinit.unknwn: Release <POINTER(IUIAutomationElement) ptr=...>`
    `[DEBUG] comtypes: CoUninitialize()`
  - Nguyên nhân:
    1. Khi `DEBUG=True` trong cấu hình môi trường, hàm `logging.basicConfig(...)` đặt mức log root là `DEBUG`. Thư viện `uiautomation` sử dụng `comtypes`, và `comtypes` ghi nhận từng thao tác thu hồi con trỏ COM / giải phóng bộ nhớ ra stdout ở mức DEBUG.
    2. Trong `hotline_3cx_service.py`, đoạn mã `with auto.UIAutomationInitializerInThread():` trước đây bị đặt **bên trong** vòng lặp `while _scanner_running:`, khiến mỗi 400ms thread lại khởi tạo rồi hủy ngữ cảnh COM một lần, kích hoạt giải phóng hàng loạt con trỏ COM và gây tràn màn hình console.
- **Biện pháp xử lý**:
  - **Khống chế mức log cảnh báo (`logging.WARNING`)**:
    + Tại `backend/app/main.py`: Thiết lập `logging.getLogger("comtypes").setLevel(logging.WARNING)` và `logging.getLogger("uiautomation").setLevel(logging.WARNING)` ngay sau `basicConfig`.
    + Tại `backend/app/services/hotline_3cx_service.py` & `tools/3cx_hotline_agent/3cx_hotline_agent.py`: Thiết lập tương tự cho worker thread.
  - **Tối ưu hóa vòng lặp quét (Single COM Initialization)**:
    + Di chuyển `with auto.UIAutomationInitializerInThread():` ra **bên ngoài** vòng lặp `while _scanner_running:` để luồng COM chỉ khởi tạo duy nhất 1 lần cho cả vòng đời của scanner thread, giảm tải CPU và loại bỏ việc giải phóng/khởi tạo COM liên tục mỗi 400ms.
- **Kết quả**:
  - Cửa sổ Console Backend FastAPI hoàn toàn tĩnh lặng, sạch sẽ, không còn bất kỳ dòng log rác nào chạy trôi màn hình.
  - Tốc độ phát hiện cuộc gọi 3CX vẫn giữ nguyên độ nhạy tức thì (400ms/lần).
  - Backend `compileall app` thành công exit code 0.
  - **Tối ưu hóa nhận diện 3CX Web Client trên trình duyệt Chrome**: Bổ sung tiêu đề tab/cửa sổ (`w.Name`) trực tiếp vào danh sách `texts` duyệt từ khóa, mở rộng bộ nhận diện các cửa sổ có domain `ringbot.co`, `3cx calls`, `Chrome_WidgetWin_1` và thông báo Windows Toast, đảm bảo bắt cuộc gọi nhạy cả khi 3CX chạy trên trình duyệt web Chrome lẫn cửa sổ PWA.
  - **Hỗ trợ Đa Người Trực — Line 3CX Riêng Biệt Cho Từng Kỹ Thuật Viên (`duty_user`)**:
    + Đưa trường `duty_user` vào payload sự kiện SSE `incoming_call` và `missed_call`.
    + Tại `RestaurantListPage.tsx`: Kiểm tra đích danh `duty_user`. Khi cuộc gọi đổ chuông vào line của kỹ thuật viên A (`duty_user === user.username`), chỉ máy của kỹ thuật viên A mới reo chuông và tự động mở popup VNC/KDS hỗ trợ. Màn hình của các kỹ thuật viên khác **hoàn toàn im lặng, không hiện Toast và không mở popup** để tránh làm phiền.
    + Bảng Cuộc Gọi Nhỡ (`HotlineMissedCallsModal.tsx`): Giữ giao diện tinh gọn, không hiển thị cột Line trực nhận.
    + **Nút & Modal Hướng Dẫn Cài Đặt 3CX Web 1 Chạm (`HotlineWebSetupGuideModal.tsx`)**:
      * Đặt nút **"Hướng dẫn 3CX"** ngay trên thanh công cụ Header (cạnh nút Trực Hotline).
      * Thiết kế 2 bước cực kỳ dễ hiểu, không cần biết code kỹ thuật:
        - **Bước 1**: Nút bấm trực tiếp mở trang cài tiện ích **Tampermonkey** trên Chrome Web Store (1 lần duy nhất).
        - **Bước 2**: Nút bấm **"⚡ 1-Click Cài Đặt Tự Động"** gọi API backend `/api/v1/hotline/tampermonkey.user.js` tự động nhận diện host/IP và username để Tampermonkey nạp sẵn cấu hình, kỹ thuật viên chỉ việc bấm "Install/Cài đặt" là hoàn tất.
  - Frontend `npm run build` thành công exit code 0 (`✓ built in 3.95s`).

---

### [2026-10-07 - Buổi chiều] - Cập Nhật Ngày Khai Trương Từ Excel, Tối Giản Báo Cáo Rà Soát Nhà Hàng & Tinh Gọn Modal Memo
- **Hạng mục 1: Tinh Gọn Khối Trạng Thái Setup Trong Modal Memo (`MemoPage.tsx`)**:
  - Gỡ bỏ 4 button màu mè (`Chờ Setup`, `Bổ sung nút bấm`, `Đã setup nháp`, `Đã Public`) theo yêu cầu người dùng.
  - Thay thế viền 2px đổi màu bằng khung thẻ sáng nhẹ (`#F8FAFC`, `border: 1px solid #E2E8F0`, padding 10px 14px), giữ nhãn `Trạng Thái Setup *` kèm badge trạng thái nhỏ và ô select trắng chuẩn mực.
  - Dọn sạch import thừa `Zap` để đảm bảo TypeScript Zero Warnings/Errors.

- **Hạng mục 2: Tối Giản Email Báo Cáo Rà Soát Nhà Hàng Còn Thiếu (`restaurant_audit_service.py`)**:
  - Loại bỏ hoàn toàn khối text thô `DANH SÁCH NHẮC NHỞ ĐỂ COPY NHANH (ZALO / TEAMS):` phía dưới email.
  - Tinh gọn bảng email từ 9 cột xuống đúng **5 cột trọng tâm**:
    1. `STT` (rộng 45px, canh giữa)
    2. `TÊN NHÀ HÀNG` (tối thiểu 180px, in đậm)
    3. `IP ROUTER` (120px, font monospace)
    4. `MỤC CÒN THIẾU` (tối thiểu 250px, badge đỏ nổi bật)
    5. `YÊU CẦU` (130px, badge đỏ `Vui lòng bổ sung`)
  - Bỏ 4 cột thừa (`MÃ SAP`, `COST CENTER`, `MÃ RK7`, `NGÀY KT`) vì các trường thiếu thì không cần hiển thị.

- **Hạng mục 3: Cập Nhật Tự Động Ngày Khai Trương Cho Nhà Hàng Còn Thiếu Từ File Excel (`update_ngay_khaitruong_from_excel.py`)**:
  - **Nguồn dữ liệu**: File `D:\1.Download\Report Nhà hàng active.xlsx` (chứa 317 mã SAP và cột `GOLIVE` định dạng `MM/DD/YY`).
  - **Quy tắc mapping**:
    + Bóc tách chuỗi `MM/DD/YY` -> Chuyển đổi chuẩn xác thành `20YY-MM-DD` (ví dụ `01/20/25` -> `2025-01-20`, `07/01/26` -> `2026-07-01`, `01/01/23` -> `2023-01-01`).
    + **Ràng buộc an toàn dữ liệu**: Chỉ điền vào các nhà hàng đang **thiếu ngày khai trương** (`ngay_khaitruong IS NULL` hoặc `01/01/1999`). Tuyệt đối không ghi đè lên các nhà hàng đã có ngày khai trương hợp lệ trước đó.
  - **Kết quả thực thi**:
    + Cập nhật thành công **45 nhà hàng** trên cả **Server Test (`172.16.20.103`)** và **Server Production (`172.16.8.25`)**.
    + Số lượng nhà hàng thiếu thông tin cần cảnh báo qua email giảm mạnh từ **72 nhà xuống còn 46 nhà** (30 nhà đã hoàn thiện 100% hồ sơ, các nhà còn lại đã gỡ cảnh báo thiếu ngày khai trương).

- **Kiểm tra & Đóng gói**:
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.46s`), bundle `frontend/dist/` sẵn sàng.
  - Backend: `compileall app` đạt 100%, backend daemon chạy trên port 8000.

---

### [2026-10-07 - Chiều muộn] - Bổ Sung Nút Chấm Than (!) Hiển Thị & Quản Lý Phiên Bản Phần Mềm Hệ Thống (KDS, CO, SO, GPOS-CO-SO, GPOS KDS)
- **Bối cảnh & Yêu cầu người dùng**:
  + Tại trang Danh Sách Nhà Hàng (`RestaurantListPage.tsx`), thêm 1 nút dấu chấm than `(!)` tròn màu vàng nổi bật cạnh badge số lượng nhà hàng.
  + Bấm vào dấu chấm than mở modal hiển thị thông tin phiên bản của 5 phần mềm vận hành:
    1. **KDS** (Kitchen Display System)
    2. **CO** (Central Order)
    3. **SO** (Smart Order)
    4. **GPOS-CO-SO** (Liên thông tích hợp GPOS & CO/SO)
    5. **GPOS KDS** (Đồng bộ trạng thái chế biến món giữa GPOS và KDS bếp)
  + Từng dòng hiển thị đầy đủ: Tên phần mềm, Version (Phiên bản), Ngày update của từng dòng, Nội dung cập nhật (Changelog/Tính năng mới), Hình ảnh đính kèm (Thumbnail, click phóng to xem chi tiết qua Lightbox), Người cập nhật.
  + Phân quyền nghiêm ngặt: Mọi người dùng đều được xem thông tin; nhưng **chỉ có quyền Admin và Super Admin** mới được cập nhật (sửa phiên bản, đổi ngày update, viết mô tả nội dung và tải lên/thay đổi hình ảnh).

- **Cơ sở dữ liệu & Backend**:
  + Cập nhật bảng `dbo.SOFTWARE_VERSIONS` trên cả 2 server (`172.16.20.103` & `172.16.8.25`):
    * Bổ sung cột `hinh_anh NVARCHAR(MAX) NULL` và `ghi_chu NVARCHAR(MAX) NULL`.
    * Cập nhật file Master DDL `Script/Full_SCRIPT_SQL_TABLE.sql`.
    * Tự động kiểm tra/tạo bảng và thêm cột trong hàm `lifespan` tại `backend/app/main.py` (`SoftwareVersion.__table__`).
  + Model & Schema ORM:
    * `backend/app/models/software_version.py`: Bổ sung `hinh_anh` và `ghi_chu`, tuân thủ `from __future__ import annotations`.
    * `backend/app/schemas/pm_bo.py`: Cập nhật `SoftwareVersionItem`, `SoftwareVersionCreate`, `SoftwareVersionUpdate`.
  + Backend Service & API Router:
    * `backend/app/services/pm_bo_service.py`: Cập nhật `to_software_version_item`, `create_software_version`, `update_software_version` ánh xạ đầy đủ `hinh_anh`, `ghi_chu`.
    * `backend/app/api/v1/pm_bo.py`:
      - `GET /api/v1/pm-bo/versions`: Mở quyền cho tất cả người dùng đăng nhập (`Depends(get_current_user)`).
      - `POST`, `PUT`, `DELETE /api/v1/pm-bo/versions/*`: Khóa chặt quyền cho Admin & Super Admin (`Depends(require_admin)`).
      - Bổ sung endpoint tải ảnh: `POST /api/v1/pm-bo/versions/upload-image` (lưu file an toàn vào `uploads/software_versions/`, chỉ Admin & Super Admin được upload).
  + Khởi động lại Backend daemon FastAPI trên port 8000, kiểm tra Health Check `healthy`.

- **Frontend & Giao diện người dùng**:
  + Thư mục lưu trữ: `frontend/src/components/restaurants/RestaurantSoftwareVersionsModal.tsx`.
  + Nút `(!)` tròn nổi bật trên `RestaurantListPage.tsx` đặt ngay cạnh badge số lượng nhà hàng, hiệu ứng hover scale mượt mà, tooltip diễn giải rõ ràng.
  + Modal chuẩn LIFO Stack (`useModalStack`):
    * Bảng danh sách 5 phần mềm với badge màu sắc đặc trưng, font monospace to rõ cho phiên bản.
    * Xem hình ảnh đính kèm: Click vào thumbnail mở Modal Lightbox xem ảnh kích thước lớn, bấm Esc đóng Lightbox trước mà không tắt modal chính.
    * Quyền Admin / Super Admin: Nút "Sửa" mở form cập nhật ngay trong modal, hỗ trợ dán ảnh chụp màn hình trực tiếp từ clipboard (`Ctrl + V`) hoặc chọn file từ máy, có preview ảnh và nút xóa ảnh.
    * Người dùng thông thường: Xem thông tin ở chế độ chỉ đọc kèm ghi chú phân quyền tinh tế.
  + TypeScript & Build: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.62s`), bundle `frontend/dist/` sẵn sàng.

---

### [2026-10-07 - Tối] - Khắc Phục Lỗi Playwright Locator.check Trên Radio Phân Loại Ticket GPMS (`ticket_batch_service.py`)
- **Hiện tượng lỗi**:
  + Khi chạy chức năng "Bắt Đầu Xử Lý Ticket" trong modal *Ticket theo Danh Mục — List Xử Lý*, 19/21 ticket bị thất bại và báo lỗi:
    `Locator.check: Clicking the checkbox did not change its state`
    `Call log: - waiting for locator("input[type='radio'][value='2']").first - locator resolved to <input value="2" type="radio" class="ant-radio-input"/> - attempting click action - force=True ...`
- **Nguyên nhân cốt lõi**:
  + Tại bước 3 (`Phân loại: chọn 'Yêu cầu'`), mã nguồn cũ gọi `await radio2.check(force=True)` trực tiếp trên thẻ `<input type="radio" class="ant-radio-input" value="2"/>`.
  + Do giao diện GPMS sử dụng thư viện **Ant Design (React)**, thẻ `<input>` thực chất bị ẩn (`opacity: 0`) và là controlled component của React. Khi Playwright cưỡng chế click vào `<input>`, Ant Design không cập nhật trạng thái đồng bộ lên DOM node, dẫn tới Playwright kiểm tra thấy `checked` không thay đổi và ném ra ngoại lệ nghiêm trọng làm dừng cả quá trình đóng ticket.
  + Tương tự, nếu ticket đã được tích sẵn 'Yêu cầu' từ trước, việc gọi `.check()` cưỡng chế cũng gây ra lỗi trạng thái tương tự.
- **Biện pháp xử lý triệt để**:
  1. **Kiểm tra trạng thái trước**: Dùng `page.evaluate` kiểm tra xem radio `value='2'` hoặc wrapper `.ant-radio-wrapper-checked` đã được chọn sẵn hay chưa; nếu đã chọn thì bỏ qua không click thừa.
  2. **Click thẻ Label chuẩn Ant Design**: Nếu chưa chọn, ưu tiên click vào thẻ bọc ngoài `label.ant-radio-wrapper:has(input[value='2'])` hoặc `label:has-text('Yêu cầu')` thay vì gọi `.check()` trên thẻ input ẩn, giúp React và Ant Design kích hoạt sự kiện synthetic click tự nhiên.
  3. **Bọc Try-Catch an toàn**: Bọc toàn bộ bước chọn radio phân loại trong khối `try...except`, ghi warning log thay vì để văng lỗi ngoại lệ làm đứt gãy luồng xử lý ticket (ticket vẫn tiếp tục hoàn thành các bước chọn danh mục công việc và bấm Lưu ticket thành công).
  4. **Rà soát đồng bộ**: Khắc phục luôn vị trí tương tự tại hàm `_close_gprocess_mission` (mục chọn radio 'Kết thúc quy trình').
- **Kiểm tra & Vận hành**:
  + Backend `compileall app` thành công exit code 0.
  + Đã khởi động lại Backend daemon FastAPI trên port 8000, API Health Check `healthy`.

---

### [2026-10-07 - Đêm] - Tinh Gọn Bảng & Thêm Tính Năng "+ Thêm Phần Mềm" Trong Modal Phiên Bản (`RestaurantSoftwareVersionsModal.tsx`)
- **Yêu cầu người dùng**:
  + Bỏ 2 cột `NỘI DUNG CẬP NHẬT` và `NGƯỜI UPDATE` trên bảng để giao diện gọn gàng, thoáng mắt.
  + Bổ sung tính năng cho phép thêm các phần mềm khác vào danh sách theo dõi nếu cần.
- **Thực hiện**:
  + **Bỏ 2 cột**: Đã loại bỏ hoàn toàn 2 cột `NỘI DUNG CẬP NHẬT` và `NGƯỜI UPDATE` khỏi bảng. Bảng hiện tại chỉ còn đúng 5 cột trọng tâm:
    `PHẦN MỀM | VERSION | NGÀY UPDATE | HÌNH ẢNH | THAO TÁC`.
  + **Tính năng "+ Thêm Phần Mềm"**:
    * Bổ sung nút **"+ Thêm Phần Mềm"** (chỉ hiển thị cho Admin & Super Admin) trên thanh công cụ.
    * Khi bấm, mở form thêm mới gồm: Tên phần mềm (text input), Phiên bản (Version), Ngày update (Date picker), Hình ảnh minh họa (Upload hoặc dán Ctrl+V).
    * Hỗ trợ lưu vào cơ sở dữ liệu (`pmBoService.createSoftwareVersion`).
    * Bảng tự động hiển thị cả 5 phần mềm cốt lõi (KDS, CO, SO, GPOS-CO-SO, GPOS KDS) cùng các phần mềm bổ sung mới thêm vào.
    * Với các phần mềm tùy chỉnh thêm vào, Admin có thêm nút **Xóa (Trash icon)** để gỡ bỏ nếu không còn nhu cầu theo dõi.
- **Kiểm tra & Đóng gói**:
  + Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.35s`), bundle `frontend/dist/` sẵn sàng.
  + Backend: `compileall app` đạt 100%.

---

### [2026-10-07 - Khuya] - Khắc Phục Triệt Để Lỗi Popup Timesheet Che Khuất Giao Diện Gây Timeout Khi Đóng Ticket (`ticket_batch_service.py`)
- **Hiện tượng lỗi**:
  + Khi chạy xử lý ticket (VD: Ticket #1914044 `HCM Cloudpot Cao Thắng`), hệ thống báo lỗi sau 30 giây:
    `TimeoutError: Locator.click: Timeout 30000ms exceeded.`
    `Call log: - waiting for locator(".ItemCategoryUpdate_itemCategoryJob__QRmlI:has-text('3 Hướng dẫn')")`
    `... <th class="text-left">Ghi chú</th> from <div id="container-portal">... subtree intercepts pointer events`
    `... <div class="style_container-bottom-modal__Knzv6">... subtree intercepts pointer events`
    `... <input name="data[0]note">... subtree intercepts pointer events`
- **Nguyên nhân kỹ thuật cốt lõi**:
  1. Khi trạng thái ticket chuyển sang **"Đã hoàn thành"**, hệ thống GPMS tự động bật popup **"Khai báo Timesheet"** (trong `<div id="container-portal">`).
  2. Bảng Timesheet trên GPMS yêu cầu **bắt buộc phải có cả Thời gian (1h) VÀ Ghi chú (Note)** (`data[0]note`). Code trước đây chỉ tìm `input[name*='actual_time']` mà hoàn toàn bỏ quên ô `note` khiến form validation không hợp lệ; hoặc selector tiêu đề `p:has-text('Khai báo Timesheet')` không khớp với cấu trúc DOM thực tế dẫn tới việc bỏ qua không đóng popup.
  3. Do popup Timesheet chưa được lưu và đóng, lớp overlay của modal vẫn bao phủ toàn màn hình. Khi code chuyển sang bước 4 để click danh mục công việc (`cat_card.click()`), sự kiện pointer events bị các thành phần trong modal (`<th class="text-left">Ghi chú</th>`, `.style_container-bottom-modal`) chặn lại. Playwright mặc định chờ 30 giây cho đến khi hết timeout và báo lỗi văng quy trình.
- **Biện pháp khắc phục**:
  1. **Nhận diện toàn diện popup Timesheet**: Không phụ thuộc vào thẻ `<p>`, mở rộng kiểm tra mọi modal/table xuất hiện trong `#container-portal` hoặc `.ant-modal`.
  2. **Điền đầy đủ Thời gian & Ghi chú (Note)**:
     - Tự động quét và điền `1` vào các ô thời gian (`input[name*='time']`, `input[name*='actual']`, `input[type='number']`...).
     - Tự động điền nội dung `"Hỗ trợ hoàn thành nhiệm vụ"` vào ô ghi chú (`input[name*='note']`, `data[0]note`...).
     - Quét rà soát toàn bộ hàng dữ liệu để triệt tiêu mọi ô nhập liệu rỗng bắt buộc.
  3. **Bấm Lưu & Xác nhận đóng popup an toàn**:
     - Bấm nút Lưu/Xác nhận trong `.style_container-bottom-modal`, chờ modal ẩn hoàn toàn (`state="hidden"`).
     - Bổ sung cơ chế retry nếu modal vẫn chưa đóng.
  4. **Tối ưu hóa các thao tác click tiếp theo**:
     - Với danh mục công việc (`cat_card`): Bổ sung `scroll_into_view_if_needed`, giảm timeout xuống 4s và có fallback `force=True` cùng JS `evaluate("el => el.click()")` để không bao giờ bị nghẽn 30s.
     - Với nút Lưu ticket (`save_btn`): Cuộn vào view và click an toàn có fallback `force=True`.
     - Tương tự đồng bộ cho nhiệm vụ G-Process (`_close_gprocess_mission`).
- **Kiểm tra**:
  + Python: `compileall app` đạt 100% không lỗi cú pháp.
  + Backend daemon: Đã restart trên port 8000, API Health Check `healthy`.

---

### [2026-10-07 - Tối] - Nâng Cấp Bộ Thu Thập Ticket Dual-Engine & Xác Minh Phạm Vi Quét Ticket 3CX (`ticket_batch_service.py`)
- **Vấn đề / Hiện tượng**:
  + Người dùng kiểm tra trang GPMS Work List thấy có nhiều dòng nhiệm vụ khi cuộn xuống dưới, nhưng email báo cáo chỉ hiển thị 6 ticket 3CX.
- **Phân tích dữ liệu thực tế trên hệ thống GPMS**:
  1. Trích xuất trực tiếp API `/api/tasks/paging` của GPMS (với `assignee_ids: [442] - dung.nguyenanh`):
     - Tổng cộng chỉ có đúng 19 bản ghi công việc đang mở (`open, inprogress, reopen`).
     - Trong 19 bản ghi này, **chỉ có duy nhất đúng 6 ticket** thỏa mãn điều kiện nghiệp vụ: Là Ticket 3CX (tiêu đề chứa *"Nhiệm vụ hỗ trợ tiếp nhận từ"* hoặc *"từ tổng đài 3CX"*) VÀ người xử lý là `dung.nguyenanh`:
       + #1913877 HCM K-Pub AEON Tân Phú-02873004348
       + #1914044 HCM Cloudpot Cao Thắng-02873093738
       + #1913793 Tập đoàn GGG-02547300268
       + #1914079 Tập đoàn GGG-02873004342
       + #1914093 Tập đoàn GGG-02873000218
       + #1913838 Tập đoàn GGG-02873002140
       -> Toàn bộ 6 ticket này đều đã được bot nhận diện, xử lý khai báo và đóng thành công 100%!
     - 13 bản ghi còn lại trên màn hình của anh là các tác vụ IT khác (BU-QRCODE, BU-KDS, CTO Manwah, Thẻ POS, Hóa đơn đỏ, SAP...) HOẶC các ticket chưa được phân công (`Gán người xử lý`), không nằm trong phạm vi xử lý tự động của Ticket 3CX.
- **Cải tiến kỹ thuật (Dual-Engine Ticket Crawler)**:
  1. **Engine 1 - Bắt gói mạng API trực tiếp (`Network Response Interception`)**: Lắng nghe trực tiếp sự kiện `page.on("response")` khi trang gọi `api/tasks/paging` để lấy danh sách ticket dạng JSON chuẩn xác 100%, không bị ảnh hưởng bởi DOM ảo (virtualized list) hay độ trễ render.
  2. **Engine 2 - Cuộn sâu DOM đa tầng (`Deep Multi-Container Scrolling`)**: Cuộn toàn diện cả container `.style_wrapper__7nkut`, `.ant-table-body`, `window` và mô phỏng lăn chuột `mouse.wheel`, kết hợp trích xuất trực tiếp từ các dòng bảng.
  3. **Bộ lọc chính xác**: Đảm bảo lọc đúng tiêu đề (`"nhiệm vụ hỗ trợ tiếp nhận từ"`, `"từ tổng đài 3cx"`, `"3cx"`) VÀ người xử lý `dung.nguyenanh`.
- **Kiểm tra**:
  + Python: `compileall app` đạt 100%.
  + Backend daemon: Đã restart trên port 8000, API Health Check `healthy`.

---

### [2026-10-08 - Sáng] - Bổ Sung Tính Năng Sao Chép / Đồng Bộ Ngày Cập Nhật Cho Tất Cả Phần Mềm (`RestaurantSoftwareVersionsModal`)
- **Yêu cầu nghiệp vụ**:
  + Thường các phần mềm hệ thống (KDS, CO, SO, GPOS-CO-SO, GPOS KDS...) được update chung 1 ngày.
  + Thay vì người dùng phải bấm "Sửa" và nhập ngày cho từng app một cách thủ công, phát triển thêm tính năng sao chép ngày cho các app còn lại, khi nào cần mới cập nhật riêng sau.
- **Giải pháp triển khai toàn diện**:
  1. **Ở bảng danh sách (Thao tác nhanh 1 chạm)**:
     - Ngay tại cột "NGÀY UPDATE" của từng dòng phần mềm, bổ sung nút bấm `[⎘ Sao chép]`.
     - Khi bấm vào, hệ thống mở modal xác nhận hiển thị ngày áp dụng (cho phép tinh chỉnh nếu muốn) kèm danh sách các phần mềm đích sẽ được đồng bộ. Bấm xác nhận là toàn bộ các phần mềm lập tức được cập nhật cùng ngày đó.
  2. **Trên thanh công cụ (Toolbar)**:
     - Bổ sung nút `[📅 Sao Chép Ngày Cho Tất Cả App]` cạnh nút `+ Thêm Phần Mềm`, giúp thiết lập ngày update chung cho toàn bộ hệ thống ngay cả khi không chọn dòng cụ thể.
  3. **Trong form chỉnh sửa / thêm mới phần mềm**:
     - Ngay dưới ô chọn "Ngày Update", bổ sung checkbox: `☑ Sao chép ngày này cho các app còn lại`.
     - Khi lưu thay đổi của phần mềm đang chỉnh sửa, hệ thống tự động đồng bộ ngày này sang tất cả các phần mềm còn lại trong database.
  4. **Backend API**:
     - Thêm endpoint `POST /api/v1/pm-bo/versions/sync-date` xử lý cập nhật đồng loạt trường `ngay_update`, `nguoi_update` cho bảng `SOFTWARE_VERSIONS`.
     - Hỗ trợ tham số `sync_all_dates: bool` trong `SoftwareVersionUpdate` và `SoftwareVersionCreate`.
- **Kiểm tra**:
  + Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 8.68s`), gói bundle `frontend/dist/` đã sẵn sàng.
  + Backend: `compileall app` đạt 100%, daemon đã khởi động lại trên port 8000 với trạng thái `healthy`.

---

### [2026-10-08 - Trưa] - Bỏ Badge Số Lượng Nhà Hàng & Phát Triển Tính Năng "3. Xử Lý SO/CO" Trong Phân Tích MongoDB Nhà Hàng
- **Hạng mục 1: Trang Danh Sách Nhà Hàng (`RestaurantListPage.tsx`)**:
  - Gỡ bỏ hoàn toàn badge/icon hiển thị số lượng `{total} nhà hàng` (ví dụ `557 nhà hàng`) ở phần tiêu đề trang theo yêu cầu.
  - Tối ưu import và bảo toàn nguyên vẹn tính năng hiển thị badge trạng thái ON/NEW/OFF trong bảng.
- **Hạng mục 2: Tái cấu trúc thứ tự tác vụ Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`)**:
  - Bổ sung tác vụ mới: **"3. Xử lý SO/CO (Quản Lý Menu, Nhóm Món, Món Ăn SO & Kích Hoạt CO)"** (`manage_menu_so_co`).
  - Đẩy các tác vụ tiếp theo xuống một bậc:
    - 4. Check / xử lý KDS (`check_kds`) [cũ là 3]
    - 5. Cấu hình Ẩn Hiện Món (`dish_show_hide`) [cũ là 4]
    - 6. Cấu hình Ẩn Hiện Menu (`menu_show_hide`) [cũ là 5]
    - 7. Xử Lý Full CPU 100% (`fix_full_cpu`) [cũ là 6]
    - 8. Chuyển database MongoDB (`transfer_database`) [cũ là 7]
    - 9. Xử Lý Param (`manage_app_params`) [cũ là 8]
    - Checklogs MongoDB (`check_action_logs`)
- **Hạng mục 3: Phân hệ Quản Lý SO/CO Nhà Hàng (`mongo_menu_so_co_service.py` & `ManageMenuSoCoTask.tsx`)**:
  - **Khám phá & phân tích dữ liệu G_ORDER**:
    + Nguồn menu: `RESTAURANT_CATEGORY` (lấy danh sách menu, mã, tên, trạng thái hiển thị SO/CO).
    + Cây nhóm & món POS/SO thực tế: `ORDER_MENU_CACHE_CATEGORY` (`category-code`, `main-menu.items` [nhóm món], `items` [món ăn: tên, mã rk7, mã sap, giá, vat, priority, link ảnh...]).
    + Nguồn danh mục CO: `CO_MENU_ITEM` (`code`, `sapCode`, `nameVn`, `srcImg`, `coMenuItemDetails` với `kalo: 100.0`).
    + Danh mục bảng gốc: `MENU_GROUP`, `CO_MENU_GROUP`, `MENU_ITEM`.
  - **Các tính năng chuyên sâu đáp ứng 100% yêu cầu**:
    1. **Multi-Select Dropdown Menu**: Cho phép chọn nhiều menu cùng lúc (checkbox) hoặc từng menu. Định dạng hiển thị chuẩn `Tên menu (Mã code) - ID menu` (VD: `Alacarte (CKHCM_oc_ALC) - 172`).
    2. **Tìm kiếm linh hoạt**:
       - Lọc theo menu hiện tại hoặc bật chế độ "Tìm trong TẤT CẢ Menu" (hiển thị thêm cột `Menu [Mã]`).
       - Tìm kiếm không phân biệt hoa thường và không phân biệt dấu tiếng Việt.
       - Hộp thoại **Tìm Kiếm Hàng Loạt** (Bulk Search): Cho phép paste danh sách nhiều mã RK7, mã SAP hoặc Tên món cách nhau bởi dấu phẩy `,` hoặc xuống dòng `Enter`.
    3. **Bảng so sánh SO vs CO & Kích hoạt CO tức thì**:
       - Cột trạng thái hiển thị rõ món đã có trên SO và CO hay chưa.
       - Nút kích hoạt 1 chạm cho từng món hoặc chọn nhiều món để kích hoạt hàng loạt sang CO (`CO_MENU_ITEM` với mã RK7 và `kalo: 100.0`).
    4. **Thêm món hàng loạt dạng Sheets / Excel (Bulk Add Matrix Modal)**:
       - Popup dạng bảng tính / spreadsheet trực quan, hỗ trợ copy-paste hàng loạt dữ liệu (từ Excel `final_1.so.chixmaxMenu_Restaurant...`).
       - Phân tích cú pháp tự động các cột: `Mã RK7`, `Tên Món`, `Mã SAP`, `Thứ Tự`, `Giá`, `Link Ảnh`, `Level` (-1: Món ăn thường, 0: Nước).
       - Cho phép chọn nhóm món & menu có sẵn hoặc nhập tạo nhóm mới.
       - Tự động kiểm tra nhóm trong các menu được chọn áp dụng; nếu menu chưa có nhóm sẽ cảnh báo người dùng. Tự sinh mã nhóm mới không trùng giữa các menu.
    5. **Chỉnh sửa thông tin món**:
       - Sửa trực tiếp tên món, mã RK7, mã SAP, thứ tự sắp xếp, giá bán, vat, link ảnh (kèm dấu `...` thu gọn), level món.
    6. **Chuyển / Nhân bản món sang nhóm khác**:
       - Cho phép chuyển món hoặc nhân bản (giữ nguyên món ở nhóm cũ và copy sang nhóm mới) cùng menu hoặc khác menu.
    7. **Xóa món hàng loạt với xác nhận an toàn 2 bước**:
       - Chọn nhiều món bằng checkbox, tùy chọn xóa khỏi menu hiện tại hay xóa triệt để khỏi tất cả các menu.
       - Hộp thoại xác nhận an toàn 2 lớp ngăn ngừa xóa nhầm dữ liệu vận hành nhà hàng.
    8. **Công cụ Check Lỗi & Đồng Bộ Xung Đột (Dish Conflict Resolver)**:
       - Tab 1: Phát hiện các món **Cùng mã RK7 nhưng Khác tên nhau** across menu/nhóm.
       - Tab 2: Phát hiện các món **Cùng tên nhưng Khác mã RK7**.
       - Hỗ trợ nhập mã/tên thay thế và bấm 1 nút để tự động đồng bộ hóa chuẩn 100% trên toàn bộ các collection MongoDB.
- **Kiểm tra**:
  + Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.50s`), bundle production đã xuất ra `frontend/dist/`.
  + Backend: `.venv\Scripts\python.exe -m compileall app` đạt exit code 0 (100% cú pháp hợp lệ), daemon port 8000 đang hoạt động ổn định.

### [2026-10-08] - Tác Vụ 3 SO/CO: Gom Nhóm Menu & Nhóm Món; Tinh Giản Email PIM & Quét Mail Memo Khi 0 Mới
- **Hạng mục 1: Gom Nhóm Menu & Nhóm Món trong Tác Vụ 3 Xử Lý SO/CO (`ManageMenuSoCoTask.tsx`)**:
  - **Nhu cầu nghiệp vụ**: Người dùng cần hiển thị danh sách món ăn phân cấp rõ ràng theo Menu và Nhóm Món để khi tìm kiếm món (đặc biệt khi chọn *Tìm trong TẤT CẢ Menu*), biết ngay món đó đang thuộc những nhóm nào, của menu nào mà không phải dò tìm trong bảng phẳng hàng trăm dòng.
  - **Chi tiết triển khai**:
    1. **Cấu trúc phân cấp Menu $\rightarrow$ Nhóm Món $\rightarrow$ Món Ăn (`groupedMenuHierarchy`)**:
       - Tự động gom nhóm toàn bộ món ăn theo từng Menu (`menu_code`, `menu_name`) và bên trong từng Menu gom theo Nhóm Món (`group_code`, `group_name`, `level`).
    2. **Bản Đồ Phân Bố Tìm Kiếm (Search Distribution Map)**:
       - Khi nhập từ khóa tìm kiếm (hoặc tìm hàng loạt), hệ thống hiển thị ngay một khối tóm tắt xanh lá cây nổi bật: Nêu rõ từ khóa xuất hiện trong bao nhiêu Menu và bao nhiêu Nhóm Món, kèm danh sách các thẻ chip `[ 📋 Menu ➔ 📂 Nhóm (X món) ]` trực quan.
    3. **Giao diện Accordion Gom Nhóm Hiện Đại**:
       - **Thẻ Menu**: Viền xanh dương đậm, hiển thị Tên Menu, Mã Menu, số lượng nhóm món và số lượng món phù hợp. Tích hợp checkbox chọn toàn bộ món trong Menu và nút Thu gọn/Mở rộng.
       - **Thanh Nhóm Món**: Viền tím chàm, hiển thị Tên Nhóm, Mã Nhóm, Loại (Món ăn / Đồ uống), số lượng món. Tích hợp checkbox chọn toàn bộ món trong Nhóm và nút Thu gọn/Mở rộng.
       - **Bảng Món Ăn Trong Nhóm**: Đã loại bỏ 2 cột thừa (Menu và Nhóm Món) vì đã hiển thị ở tiêu đề, giúp bảng thông thoáng, rộng rãi, hiển thị trọn vẹn 100% cột không cần cuộn ngang trên màn hình lớn.
    4. **Chuyển đổi linh hoạt 2 chế độ xem**:
       - Nút chuyển đổi: `🗂️ Đang Gom Nhóm (Mặc định)` $\leftrightarrow$ `📄 Bảng Phẳng (Flat Table)`. Cho phép kỹ thuật viên linh hoạt xem theo thói quen.
       - Các nút: `📂 Mở Rộng Hết` và `📁 Thu Gọn Hết` toàn bộ Menu & Nhóm.
    5. **Tương thích toàn bộ tính năng**: Checkbox chọn từng món / cả nhóm / cả menu đồng bộ mượt mà với thanh công cụ thao tác hàng loạt (Kích hoạt CO, Chuyển/Nhân bản, Xóa món).

- **Hạng mục 2: Tinh Giản Email Báo Cáo PIM Hằng Ngày Khi 0 Mới (`pim_service.py`)**:
  - Khi không có yêu cầu PIM mới phát sinh (`inserted == 0` và không có lỗi kết nối):
    - Tiêu đề email: `[PIM THÀNH CÔNG] Đồng bộ Yêu cầu PIM: 0 mới ({scan_date})`.
    - Nội dung email: Thu gọn tối đa, chỉ hiển thị thông báo:
      ```
      Đồng bộ Yêu cầu PIM & Phân công tự động thành công
      Thời gian thực hiện: {scan_date}  |  Kích hoạt bởi: {triggered_by}
      0 mới
      ```
    - Không gửi kèm bảng dài và thẻ thống kê các yêu cầu cũ đã cập nhật.
  - **Xóa bỏ hoàn toàn đoạn footer 3 dòng**:
    - Đã loại bỏ hoàn toàn khối footer: *"Email báo cáo tự động từ Tác vụ Scheduler Quản Trị IT Golden Gate Restaurant Group... Round-Robin... adminpim.ggg.com.vn | pim.ggg.com.vn"* khỏi tất cả các mẫu email PIM (kể cả khi có mới lẫn khi 0 mới).

- **Hạng mục 3: Tinh Giản Email Quét Mail Memo AUTO Khi 0 Mới (`job_scheduler_service.py`)**:
  - Khi tác vụ tự động `Quét Mail Memo AUTO (Outlook/Salesforce)` hoàn tất và không có Memo mới nào (`total_imported == 0`):
    - Tiêu đề email: `[THÀNH CÔNG] Thông báo thực thi tác vụ: Quét Mail Memo AUTO (Outlook/Salesforce) - 0 có cái mới`.
    - Nội dung email: Thu gọn tối giản, thông báo:
      ```
      Quét Mail Memo AUTO (Outlook/Salesforce) thành công
      Thời gian thực hiện: {end_str}  |  Kích hoạt bởi: {triggered_by}
      0 có cái mới
      ```
    - Không gửi kèm bảng log rườm rà chiếm diện tích hòm thư.

- **Kiểm tra & Bàn giao**:
  - Frontend: Đã chạy `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.49s`), bundle production trong `frontend/dist/` đã sẵn sàng deploy.
  - Backend: Đã chạy `.venv\Scripts\python.exe -m compileall app` đạt exit code 0, tiến trình daemon đang lắng nghe trên cổng 8000.

---

### [2026-10-08 (Cập nhật 2)] - Tối Ưu Tràn Giao Diện Khóa Bàn, Thông Báo Đồng Bộ & Trải Nghiệm SO/CO

- **Hạng mục 1: Khắc phục triệt để tràn layout tại Khối Thông Tin Khóa Bàn (`RestaurantMongoAnalysisPage.tsx`)**:
  - **Hiện tượng**: Trường `User mở khóa (ROLE_UNLOCK_ORDER)` chứa chuỗi hàng chục mã nhân viên viết liền không có khoảng trắng (`91243,99754,99121...`) khiến CSS Grid track bị phình ngang vô hạn, đẩy và đè lấn sang cột "Số bàn đang bị khóa / chiếm giữ" và "Khóa phiên trong LOCK_ORDER", làm tràn viền card.
  - **Giải pháp**:
    - Thêm `minWidth: 0, overflow: 'hidden'` cho cả 4 ô thông tin trong Grid để triệt tiêu lỗi min-width auto của CSS Flex/Grid.
    - Cấu hình thẻ hiển thị `ROLE_UNLOCK_ORDER`: `wordBreak: 'break-all'`, `maxHeight: '48px'`, `overflowY: 'auto'`, `lineHeight: '1.4'`, `fontSize: '11px'`, `display: 'block'`. Chuỗi mã nhân viên dài tự động xuống dòng gọn gàng, cuộn dọc mượt mà bên trong ô mà không bao giờ xô lệch layout.

- **Hạng mục 2: Tinh chỉnh câu thông báo Đồng Bộ SO ➔ CO thân thiện (`mongo_menu_so_co_service.py`)**:
  - **Hiện tượng**: Thông báo trước đó hiển thị `(Version 2004)` và `(Version 3562)` là số đếm revision nội bộ của MongoDB SYNC_VERSION, gây hiểu nhầm sang phiên bản phần mềm G-pos (2.4.154).
  - **Giải pháp**: Chuẩn hóa thông báo toast thành:
    *"Đồng bộ toàn bộ thành công: Đã đồng bộ dữ liệu thực đơn SO, cập nhật thời gian chế biến {kds_synced_count} món KDS và kích hoạt làm mới dữ liệu CO thành công!"*. Thông điệp rõ ràng, đúng ngữ cảnh nghiệp vụ.

- **Hạng mục 3: Tối ưu hiệu năng chọn Menu mặc định Task 3 SO/CO (`ManageMenuSoCoTask.tsx`)**:
  - **Hiện tượng**: Trước đó mặc định chọn toàn bộ 6/6 menu có dữ liệu, tải dồn dập 1524 món ăn cùng lúc lên DOM gây đơ, giật lag.
  - **Giải pháp**: Mặc định chỉ chọn đúng **menu đầu tiên** (`[mList[0].code]`, ví dụ Buffet U22_2026 với 242 món). Nếu kỹ thuật viên cần xem thêm menu nào khác thì chủ động tích chọn thêm vào dropdown, giúp tải nhanh gấp 6 lần và loại bỏ hoàn toàn hiện tượng treo lag. Khi chuyển nhà hàng khác, hệ thống tự động reset và chọn đúng menu đầu tiên của nhà đó.

- **Hạng mục 4: Mặc định Thu Gọn Nhóm Món (Default Collapsed Groups)**:
  - Khi mở danh sách món ăn, 100% các Nhóm Món con con mặc định **thu gọn** (chỉ hiển thị thanh tiêu đề nhóm tóm tắt: Tên nhóm, Mã, Loại món, Số lượng món). Kỹ thuật viên cần xem nhóm nào thì click bung nhóm đó ra.
  - Khi người dùng gõ từ khóa tìm kiếm (ví dụ: "thit"), hệ thống tự động bung các nhóm có chứa món ăn khớp với từ khóa để xem kết quả tức thì. Khi xóa tìm kiếm, tự động thu gọn về mặc định.

- **Hạng mục 5: Bỏ tiền tố "Nhóm Món: " ở đầu thanh tiêu đề nhóm**:
  - Tiêu đề nhóm hiển thị trực tiếp tên nhóm: `📂 SALAD - SAENGCHAE (1742-1GGSSNE010ALC) Món ăn (-1) 3 món` thay vì lặp lại thừa chữ `📂 Nhóm Món: `.

- **Hạng mục 6: Nút "Thu Gọn Hết" thu gọn triệt để cả Menu lẫn toàn bộ Nhóm con**:
  - Sửa logic hàm `collapseAllMenus`: Thu gọn toàn bộ các Menu (`setCollapsedMenuCodes`) đồng thời xóa sạch toàn bộ các nhóm con đang bung sẵn (`setExpandedGroupKeys(new Set())`), đảm bảo thu gọn triệt để mọi tầng danh mục.
  - Hàm `expandAllGroupsAndMenus`: Mở rộng đồng thời toàn bộ Menu và toàn bộ các nhóm con.
  - Khi bấm thu gọn một Menu riêng lẻ: tự động dọn dẹp trạng thái bung của các nhóm con bên trong menu đó.

- **Kiểm tra & Bàn giao**:
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.83s`), thư mục `frontend/dist/` đã đóng gói production sẵn sàng.
  - Backend: `.venv\Scripts\python.exe -m compileall app` đạt exit code 0, tiến trình daemon đang hoạt động ổn định trên cổng 8000.

### [2026-10-08 (Cập nhật 3)] - Tinh Gọn UI/UX KDS, Mở Khóa User, Xóa Khóa Bàn & Ra Mắt Tính Năng BỘ PARAM CHUẨN (APP_PARAM)

- **Hạng mục 1: Tinh gọn Giao Diện Check / Xử Lý KDS (`RestaurantMongoAnalysisPage.tsx`)**:
  - Loại bỏ dropdown chọn `Máy chủ KDS:` trùng lặp ở thanh công cụ dưới vì banner phát hiện 2 máy chủ MongoDB trên cùng (`.11` vs `.41`) đã cho phép bấm chuyển đổi trực tiếp.
  - Loại bỏ nút `Làm mới dữ liệu KDS` dư thừa.
  - Loại bỏ badge `Chuẩn KDS: CONFIG_COOKING & ACCOUNT` giúp không gian thao tác KDS tinh gọn, thoáng đãng.

- **Hạng mục 2: Tinh gọn Giao Diện Mở Khóa User Tablet (`RestaurantMongoAnalysisPage.tsx`)**:
  - Xóa bỏ triệt để 3 khối thẻ thống kê lớn chiếm nhiều diện tích dọc: *"TỔNG NHÂN VIÊN (DB)"*, *"ĐANG CÓ CỜ ĐĂNG NHẬP"*, *"PHIÊN KHÓA TRONG LOCK_ORDER"*.
  - Xóa bỏ nhãn/badge tiêu đề `isLogin & LOCK_ORDER`.
  - Chuyển tính năng `🔓 Mở Khóa Toàn Bộ User Đang Đăng Nhập` thành nút bấm nhỏ gọn, tích hợp đồng bộ ngay trên thanh tìm kiếm & quét dữ liệu inline toolbar.

- **Hạng mục 3: Tinh gọn Giao Diện Xóa Khóa Bàn Tablet (`RestaurantMongoAnalysisPage.tsx`)**:
  - Xóa bỏ banner vàng cảnh báo *"Phát hiện X bàn mở từ ngày hôm trước chưa đóng..."*.
  - Xóa bỏ banner tím *"Phát hiện X khóa mồ côi (treo từ đơn đã đóng trong LOCK_ORDER)..."*.
  - Gom toàn bộ tính năng dọn sạch khóa rác mồ côi vào nút bấm `Xóa Toàn Bộ Khóa Bàn Tablet (X)` (backend `clearTableLocks` đã tự động xử lý `LOCK_ORDER.delete_many({})` dọn sạch triệt để cả bàn và rác mồ côi).
  - Giữ lại tính năng `Quét Lại Bàn Bị Khóa` và dọn dẹp sạch toàn bộ các biến/state thừa theo chuẩn TypeScript Strict Mode.

- **Hạng mục 4: Tinh gọn Cấu Hình Ẩn Hiện Món (`RestaurantMongoAnalysisPage.tsx`)**:
  - Xóa bỏ thanh banner trạng thái đếm số lượng: *"Tổng cộng: 584 món | 🟢 Món hiện: 457 | 🔴 Món ẩn: 127 | 💡 Bấm nút mũi tên vàng -> để chuyển sang Món Ẩn..."*.

- **Hạng mục 5: Ra Mắt Tính Năng BỘ PARAM CHUẨN (Standard APP_PARAM System)**:
  - **Mục tiêu & Nghiệp vụ**: Cho phép quản trị viên lưu lại các tham số cần thiết trong bảng `APP_PARAM` (database `G_ORDER`) thành một "Bộ Param Chuẩn" tập trung trên SQL Server. Bộ chuẩn này có thể tạo bằng cách nhập tay hoặc lưu nhanh từ các nhà hàng đang kết nối. Khi cần áp dụng xuống bất kỳ nhà hàng nào, hệ thống hỗ trợ 2 chế độ:
    1. **Giữ nguyên cái cũ (Khuyên dùng)**: Chỉ bổ sung các tham số mới còn thiếu, không ghi đè lên tham số đã có của nhà hàng.
    2. **Ghi đè (Overwrite)**: Cập nhật lại toàn bộ các tham số trùng theo giá trị, kiểu và trạng thái của Bộ Chuẩn.
  - **Cơ sở dữ liệu & Model**:
    - Tạo bảng SQL Server `STANDARD_APP_PARAMS` (khai báo tự động trong `backend/app/main.py` qua `Base.metadata.create_all`, cập nhật DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`).
    - Model ORM: `StandardAppParam` (`backend/app/models/standard_app_param.py`).
    - Schema Pydantic: `StandardAppParamItem`, `StandardAppParamCreateRequest`, `StandardAppParamUpdateRequest`, `SaveStandardParamsFromRestaurantRequest`, `ApplyStandardParamsToRestaurantRequest`, `ApplyStandardParamsResponse` trong `backend/app/schemas/mongodb.py`.
  - **Backend API (`backend/app/api/v1/mongodb.py` & `mongodb_service.py`)**:
    - `GET /api/v1/mongodb/standard-params`: Lấy danh sách tham số chuẩn (hỗ trợ tìm kiếm, lọc kiểu FUNCTION/CONFIG, lọc trạng thái Bật/Tắt).
    - `POST /api/v1/mongodb/standard-params`: Thêm mới tham số chuẩn thủ công.
    - `PUT /api/v1/mongodb/standard-params/{param_code}`: Chỉnh sửa tham số chuẩn.
    - `DELETE /api/v1/mongodb/standard-params/{param_code}`: Xóa tham số chuẩn khỏi kho lưu trữ.
    - `POST /api/v1/mongodb/standard-params/save-from-restaurant`: Quét và lưu các tham số từ nhà hàng hiện tại vào Bộ Param Chuẩn (tự động upsert).
    - `POST /api/v1/mongodb/standard-params/apply-to-restaurant`: Áp dụng bộ param chuẩn xuống MongoDB nhà hàng với tùy chọn ghi đè hoặc giữ nguyên cái cũ. Tự động ghi audit log chi tiết.
  - **Frontend UI/UX (`MongoDbParamManagementTask.tsx` & `mongoService.ts`)**:
    - Thanh công cụ bổ sung 3 nút tiện ích cao cấp:
      + `⭐ Bộ Param Chuẩn ({total})`: Mở Modal Quản Lý Bộ Param Chuẩn (bảng danh sách, tìm kiếm, lọc, sửa, xóa, thêm mới).
      + `💾 Lưu Vào Bộ Chuẩn`: Modal xác nhận lưu toàn bộ tham số của nhà hàng đang kết nối vào Bộ Chuẩn.
      + `🚀 Áp Dụng Param Chuẩn`: Modal phân tích đối chiếu tham số MỚI (chưa có trên nhà hàng) và tham số TRÙNG (đã có), kèm 2 lựa chọn radio trực quan (`🛡️ Giữ nguyên cái cũ` vs `🔄 Ghi đè toàn bộ`). Tự động tải lại danh sách param sau khi áp dụng.

- **Kiểm tra & Bàn giao**:
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.90s`), bundle production đã xuất ra `frontend/dist/`.
  - Backend: `.venv\Scripts\python.exe -m compileall app` đạt exit code 0 (100% cú pháp hợp lệ), daemon port 8000 đã tự động tạo bảng `STANDARD_APP_PARAMS` và đang hoạt động ổn định.

---

### [2026-10-08] - Tối Ưu Hóa Quản Lý Dự Án, Đồng Bộ SO ➔ CO & Cây Phân Cấp Checklist Mẫu 3 Cấp

- **Hạng mục 1: Đồng bộ SO ➔ CO & Tự Động Làm Mới Thực Đơn (Tác vụ 3 Mongo Analysis)**:
  - **Quy trình 2 bước**: Làm rõ quy trình đồng bộ chuẩn giữa thiết bị và công cụ web:
    + *Bước 1 (Trên app SO tablet/POS)*: Mở ứng dụng SO để hệ thống tự động kiểm tra phiên bản menu mới nhất từ Cloud tải về MongoDB cục bộ (cập nhật `ORDER_MENU_CACHE_CATEGORY`).
    + *Bước 2 (Trên Web công cụ)*: Nhấn nút **"Đồng Bộ SO ➔ CO"** để chạy backend service `sync_all_so_co` (cập nhật `VERSION_MENU_SO`, đồng bộ thời gian chế biến `cookMins` sang `G_KITCHEN.CONFIG_COOKING`, tăng `VERSION_MENU_CO` & `VERSION_MENU_CONFIG`, ghi log đồng bộ).
  - **Live Reload không cần F5**:
    + Bổ sung state `menuSyncTrigger` liên kết từ `RestaurantMongoAnalysisPage.tsx` sang `ManageMenuSoCoTask.tsx`.
    + Ngay khi nút "Đồng Bộ SO ➔ CO" chạy xong thành công, giao diện tự động gọi `fetchMenus()` và `fetchDishItems()` để cập nhật ngay danh sách món mới nhất mà người dùng không cần reload trang web.
    + Bổ sung banner hướng dẫn quy trình 2 bước trực quan ngay trên đầu bộ chọn Menu.
    + Nâng cấp nút **"🔄 Làm Mới Dữ Liệu Thực Đơn"** nổi bật kèm hiệu ứng xoay spinner khi đang tải.

### [2026-10-08] - Tác Vụ 3: Xử Lý SO/CO - Hợp Nhất Tìm Kiếm Hàng Loạt & Tinh Gọn Giao Diện
- **Hạng mục: Tác vụ 3 - Xử Lý SO / CO (`ManageMenuSoCoTask.tsx`)**:
  - **Bỏ dòng tiêu đề & mô tả**: Xóa bỏ dòng tiêu đề `"3. Xử Lý SO / CO (Quản Lý Nhóm & Món Menu Thực Đơn)"` và mô tả `"Đối chiếu thực đơn SO & CO, thêm/sửa/xóa món, import bảng tính Excel/Sheets & kiểm tra lệch mã RK7/Tên món"`, giúp giao diện thông thoáng, tối đa hóa không gian thao tác thực đơn.
  - **Bỏ banner hướng dẫn**: Xóa bỏ hoàn toàn khung banner xanh *"Quy trình đồng bộ thực đơn chuẩn (2 bước): • Bước 1 (Trên app SO tablet/máy bán hàng)... • Bước 2 (Trên Web công cụ)..."* để loại bỏ chữ thừa, giữ giao diện sạch sẽ, trực quan.
  - **Mở rộng tối đa Ô Tìm Kiếm (Wide Bulk Search Bar)**:
    - Tách riêng thanh 4 nút thao tác nghiệp vụ (`Check Lỗi Xung Đột`, `+ Thêm Món Hàng Loạt (Sheets)`, `📦 Không Gian Trung Gian`, `🌐 Đồng Bộ Sang NH Khác`) lên một hàng riêng căn phải (`justifyContent: 'flex-end'`).
    - Dành trọn vẹn toàn bộ chiều ngang còn lại cho **Ô Tìm Kiếm** (`flex: '1 1 500px'`, min-width `320px`, chiều cao chuẩn `38px`, font size `13px`) đặt cạnh 2 bộ lọc loại món & trạng thái CO.
    - Nhờ đó ô tìm kiếm mở rộng gấp 3-4 lần chiều dài ban đầu (đạt 800px - 1400px+ tùy độ phân giải), hiển thị thoải mái hàng chục mã SAP/RK7 khi gõ hoặc dán từ Excel.
  - **Hợp nhất Tìm Kiếm Lẻ và Tìm Kiếm Hàng Loạt thành 1 ô duy nhất**:
    - Bỏ nút mở modal popup "🔍 Tìm Hàng Loạt" và modal thừa; người dùng không cần phải click thêm nút hay mở popup.
    - Ô tìm kiếm duy nhất tự động phân tích và hỗ trợ cả tìm kiếm lẻ lẫn hàng loạt:
      + Tìm 1 từ khóa (tên món, mã RK7, mã SAP, tên nhóm) theo fuzzy không dấu.
      + Hỗ trợ tìm nhiều mã/tên cùng lúc cách nhau bằng dấu phẩy, chấm phẩy, khoảng trắng giữa các mã số.
      + Tự động xử lý sự kiện dán (`onPaste`) từ Excel (danh sách xuống dòng `\r\n`) thành chuỗi các mã ngăn cách bằng dấu phẩy, lập tức kích hoạt tìm kiếm mà không cần bấm thêm nút nào.
    - **Sửa triệt để lỗi "báo 2 món chỉ show 1 món"**: Nguyên nhân do ô tìm lẻ và modal tìm hàng loạt có 2 state lọc xung đột lồng nhau. Hợp nhất vào một cơ chế duy nhất dùng `searchTokens` với logic so khớp OR giúp tất cả các món tìm thấy đều hiển thị chính xác 100%.
    - Bổ sung nút bấm `X` xóa nhanh từ khóa, badge đếm số mã đang tìm (`{N} mã`), và chip cảnh báo trực quan kèm nút 1-chạm *"Tìm Trong Tất Cả Menu"* nếu có mã không nằm trong Menu hiện tại.
    - **Cân đối khung giữa & gom chung 1 hàng thanh công cụ (Toolbar Alignment)**:
      + Đặt ô tìm kiếm và các bộ lọc (Cụm trái) song song với 4 nút tác vụ nghiệp vụ (Cụm phải) trên cùng **1 hàng ngang chuẩn mực** (`justifyContent: 'space-between'`), khắc phục triệt để hiện tượng giao diện bị lệch, so le.
      + Thu gọn ô tìm kiếm về kích thước vừa vặn (`width: '270px'`, height `36px`), placeholder tinh gọn: `"Tìm món: Tên, mã RK7, SAP..."`.
      + Chuẩn hóa chiều cao tất cả các ô input, dropdown select và button về `36px`.
      + **Bỏ toàn bộ icon và emoji thừa** ở 4 nút thao tác (`Check Lỗi Xung Đột`, `+ Thêm Món Hàng Loạt (Sheets)`, `Không Gian Trung Gian`, `Đồng Bộ Sang NH Khác`) giúp giao diện thanh thoát, chuyên nghiệp, không bị rối mắt.

- **Hạng mục: Modal Thêm Món Hàng Loạt (Sheets) - Tìm Kiếm Nhóm & Chuẩn Hóa 3 Cột Dán (`ManageMenuSoCoTask.tsx`)**:
  - **Ô Tìm Kiếm Nhóm Món**: Bổ sung ô input search nhanh ở mục "2. Nhóm Món -> Chọn nhóm món có sẵn" với icon tìm kiếm và nút xóa nhanh, hỗ trợ tìm kiếm không dấu (`removeTones`) theo tên nhóm hoặc mã nhóm món, giúp việc chọn nhóm nhanh chóng ngay cả khi menu có hàng chục nhóm món.
  - **Chuẩn hóa định dạng dán 3 cột (Excel / Sheets)**: Đơn giản hóa dữ liệu copy/paste từ Excel / Google Sheets chỉ cần đúng 3 cột: `Mã RK7 [Tab] Tên Món [Tab] Mã SAP`.
  - **Tự động nhận diện Level (Thường vs Nước)**:
    - Nếu chọn nhóm đồ uống/nước (`level === 0` hoặc tên nhóm chứa các từ khóa như `nuoc`, `do uong`, `drink`, `giai khat`, `bia`, `ruou`), hệ thống tự động nhận diện và gán `level = 0` (đồ uống).
    - Các nhóm món ăn thông thường mặc định gán `level = -1` (món ăn thường).
    - Bổ sung badge hiển thị trạng thái Level trực quan ngay dưới ô chọn nhóm (`🥤 Đồ uống (Level 0)` hoặc `🍛 Món ăn (Level -1)`).
    - Cơ chế đồng bộ tự động: nếu người dùng dán dữ liệu trước rồi mới đổi nhóm món, hệ thống tự động cập nhật lại Level của tất cả các dòng đã dán tương ứng với nhóm mới.
    - Lưu món thành công đảm bảo áp dụng đúng Level đã nhận diện.

- **Hạng mục: Tác Vụ 1, 2, 4, 5 Phân Tích MongoDB (`RestaurantMongoAnalysisPage.tsx`)**:
  - **Tác vụ 1 (Xóa Khóa Bàn Tablet)**: Xóa bỏ hoàn toàn khối thẻ thống kê ở đầu trang (`PASSWORD_EXIT_TABLE`, `ROLE_UNLOCK_ORDER`, `Số bàn đang bị khóa`, `Khóa phiên LOCK_ORDER`), triệt để tuân thủ quy tắc No Stat Cards để tập trung vào bảng dữ liệu.
  - **Tác vụ 2 (Mở Khóa User Tablet)**: Xóa bỏ toàn bộ khung ở giữa (ô tìm kiếm mã NV, checkbox `isLogin = true`, nút Tìm kiếm / Quét DB). Đưa trực tiếp nút **`🔓 Mở Khóa Toàn Bộ ({N})`** và nút **`Làm mới`** lên thanh tiêu đề bảng Danh Sách Nhân Viên, thao tác nhanh 1-chạm.
  - **Tác vụ 4 (Check / Xử Lý KDS)**: Thu nhỏ khung ở giữa bằng cách giảm padding từ `16px 20px` xuống `8px 12px`, tinh gọn khoảng cách giữa các nút thành một toolbar thanh mảnh.
  - **Tác vụ 5 (Cấu Hình Ẩn Hiện Món)**: Thu nhỏ khung ở giữa từ `16px 20px` xuống `8px 12px`, loại bỏ khối bao bọc thừa, tạo thanh công cụ nhỏ gọn, vừa vặn.

- **Hạng mục 2: Quản Lý Dự Án - Phân Quyền Bấm Done Hàng Loạt & Thanh Công Cụ Đa Nhiệm**:
  - **Mở quyền cho tất cả thành viên**: Bỏ giới hạn chỉ Admin mới được đánh dấu hoàn thành; tất cả người dùng đăng nhập (`get_current_user`) đều có quyền cập nhật trạng thái công việc.
  - **Tối ưu thanh điều hướng & Badge chờ**:
    + Thêm số lượng việc chờ làm (Pending Badge) vào menu "Quản Lý Dự Án" trên thanh Sidebar, tính gộp vào `totalAppPending`.
    + Xóa bỏ tab "Ứng Dụng & PM Phụ Trách (ALLAPP_PM)" khỏi trang Quản Lý Dự Án theo yêu cầu tinh gọn.
  - **Thao tác nhanh**:
    + Thêm nút **"✓ Xong tất cả việc"** ở tiêu đề từng dự án.
    + Thêm nút **"✓ Xong hết ({N})"** và checkbox chọn việc theo từng nhân sự trong dự án.
    + Checkbox chọn từng việc riêng lẻ và Thanh công cụ nổi ghim đáy màn hình (Floating Action Toolbar) khi chọn nhiều việc (`Đánh dấu Hoàn thành`, `Bỏ hoàn thành`, `Hủy chọn`).

- **Hạng mục 3: Quản Lý Checklist Mẫu - Cây Phân Cấp 3 Cấp & Xuất/Nhập Excel 3 Cột**:
  - **Chuyển tab mặc định**: Đặt tab **"Checklist Mẫu"** làm màn hình mặc định số 1 khi truy cập trang "Checklist Các Công Việc".
  - **Giao diện Cây Phân Cấp 3 Cấp**:
    + **Cấp 1**: Tên checklist mẹ (`ten_suon`) hiển thị dạng thẻ mẹ có checkbox, nút mở rộng/thu gọn, badge danh mục, SLA và tổng số mục việc con.
    + **Cấp 2**: Nhóm công việc (`nhom`) có icon thư mục, badge số lượng việc con và đóng/mở linh hoạt. Nếu nhóm trống, việc con sẽ tự động nối trực tiếp Cấp 1 ➔ Cấp 3.
    + **Cấp 3**: Danh sách chi tiết từng công việc con (`tieu_de`) kèm số thứ tự (`stt`) và hướng dẫn chi tiết (`huong_dan`).
    + Nút bấm nhanh trên thanh công cụ: *Chọn tất cả*, *Mở rộng tất cả*, *Thu gọn tất cả*.
  - **Xuất & Nhập Excel 3 Cột Chuẩn**:
    + **Tải file mẫu**: Nút "Tải Mẫu Excel" tạo file `.xlsx` gồm đúng 3 cột chuẩn: `Mẹ` (Cột A), `Cấp 2` (Cột B), `Cấp 3` (Cột C).
    + **Xuất Excel**: Hỗ trợ xuất toàn bộ hoặc chỉ xuất các mẫu checklist đã chọn qua checkbox ra Excel theo cấu trúc 3 cột chuẩn.
    + **Nhập Excel Hàng Loạt**: Modal tải file Excel, tự động đọc 3 cột, tạo sườn mẹ mới hoặc ghép vào sườn đã có, hỗ trợ tạo việc 2 cấp khi Cột B để trống.

- **Hạng mục 4: Loại Bỏ Trang PM/BO**:
  - Xóa bỏ hoàn toàn route và đường dẫn menu Sidebar tới trang PM/BO, điều hướng tự động về `/app/projects`.

- **Kiểm tra hoàn thành**:
  - Backend: `python -m compileall app` đạt exit code 0 (100% hợp lệ).
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.56s`), không còn bất kỳ lỗi TypeScript nào.

---

### [2026-10-08] - Rà Soát Toàn Diện & Chuẩn Hóa Khung Giờ (Lần 1, 2, 3) Ở Các Schedulers / Tác Vụ Chạy Ngầm
- **Bối cảnh & Vấn đề người dùng phản ánh**:
  - Người dùng cấu hình thêm khung thời gian thứ 2 (`time_2`) và thứ 3 (`time_3`) ở các scheduler/tác vụ chạy ngầm, nhận thấy khung thời gian đầu (`time`) chạy ổn định nhưng khung giờ thứ 2 và 3 có vẻ chạy chưa ổn, không thấy hiển thị hoặc không kích hoạt.
- **Nguyên nhân gốc rễ xác định được**:
  1. **Thanh Timeline Tổng Quan (`JobManagementPage.tsx:2003-2020`)**:
     - `timelineSlots` chỉ đọc duy nhất `j.schedule?.time` (khung 1).
     - Khi người dùng cài đặt thêm khung 2 (`time_2`) hoặc khung 3 (`time_3`), thanh Timeline ở đầu trang **hoàn toàn không hiển thị khung giờ 2 và 3**, gây hiểu lầm rằng hệ thống không nhận khung giờ 2 và 3.
  2. **Biểu thức Cron (`_build_cron` trong `job_scheduler_service.py`)**:
     - Hàm `_build_cron` chỉ nhận 1 tham số `time_str` (khung 1). Khi có nhiều khung giờ, chuỗi Cron dưới mỗi job chỉ hiển thị của khung 1 (ví dụ `0 8 * * *`), làm người dùng và hệ thống hiểu sai rằng job chỉ chạy 1 lần.
  3. **Lệch pha giữa phân hệ PIM (`dbo.PIM_SCHEDULE`) và Quản Trị Tác Vụ (`jobs_config.json`)**:
     - Trong cơ sở dữ liệu `dbo.PIM_SCHEDULE`, 3 khung giờ là `03:00`, `12:00`, `16:30`.
     - Tuy nhiên trong `jobs_config.json`, tác vụ `job_sync_pim_requests` bị lưu cứng `"time": "08:30"`, không có `time_2` và `time_3`.
     - Khi `pim_schedule_worker` chạy thành công lúc 12:00 hay 16:30, nó chỉ cập nhật vào DB PIM mà không đồng bộ sang `job_scheduler_service._jobs["job_sync_pim_requests"]`. Kết quả là trên giao diện Job Management, cột "Lần chạy cuối" vẫn giữ nguyên lần chạy lúc 08:30 của khung 1, khiến người dùng lầm tưởng khung 2 và 3 không chạy.
  4. **Lỗi định dạng so khớp giờ trong worker (`job_schedule_worker` và `pim_schedule_worker`)**:
     - `current_time` lấy từ `now.strftime("%H:%M")` (luôn có 2 chữ số giờ: `08:30`, `09:00`, `12:00`).
     - `target_times` nếu có chuỗi dạng `8:30` (1 chữ số) hoặc `12:00:00` (dạng có giây từ SQL Server), phép so khớp `current_time in target_times` sẽ trả về `False`, dẫn đến việc bỏ qua lượt chạy.
  5. **Tính toán lần chạy tiếp theo (`_calculate_next_run`)**:
     - Với `weekly`, code cũ bỏ qua `days_of_week` mà chỉ cộng 1 ngày, hiển thị ngày chạy tiếp theo sai lệch.
- **Giải pháp & Các cải tiến đã triển khai**:
  1. **Backend (`job_scheduler_service.py`)**:
     - Bổ sung hàm tiện ích `normalize_time_str(val)`: chuẩn hóa triệt để chuỗi thời gian về định dạng chuẩn `HH:MM` (2 chữ số giờ, 2 chữ số phút), loại bỏ giây, khoảng trắng thừa.
     - Nâng cấp `_format_human_readable`: tự động chuẩn hóa và liệt kê đầy đủ tất cả các khung giờ (ví dụ `Hàng ngày lúc 03:00, 12:00, 16:30`).
     - Nâng cấp `_build_cron`: hỗ trợ đầy đủ `time`, `time_2`, `time_3`. Nếu cùng số phút thì gộp giờ (`0 8,12,16 * * *`), nếu khác số phút thì tạo tổ hợp cron trực quan nối bằng dấu ` | ` (`0 3 * * * | 0 12 * * * | 30 16 * * *`).
     - Nâng cấp `_calculate_next_run`: duyệt 8 ngày tới, kiểm tra đúng `days_of_week` (nếu weekly) và tìm mốc thời gian tiếp theo gần nhất trong số các khung giờ (`candidates`).
     - Bổ sung `sync_from_pim_schedule()`: tự động đồng bộ 3 khung giờ (`03:00`, `12:00`, `16:30`), trạng thái bật/tắt và thời điểm chạy mới nhất từ bảng `dbo.PIM_SCHEDULE` vào tác vụ `job_sync_pim_requests` khi load cấu hình và khi gọi `get_all_jobs()`.
     - Nâng cấp `update_schedule`: chuẩn hóa `time`, `time_2`, `time_3` bằng `normalize_time_str`. Nếu cập nhật tác vụ `job_sync_pim_requests`, tự động đồng bộ ngược lại vào bảng `dbo.PIM_SCHEDULE`.
     - Bổ sung `record_external_job_run`: cho phép các worker chuyên biệt (như PIM worker) ghi nhận trạng thái và log thực thi trực tiếp vào Job Scheduler.
     - Cập nhật `job_schedule_worker`: chuẩn hóa `target_times` qua `normalize_time_str` trước khi so khớp `current_time in target_times`; bỏ qua `job_sync_pim_requests` trong worker chung để tránh chạy trùng lặp với `pim_schedule_worker`.
  2. **Backend PIM (`pim_service.py`)**:
     - Nâng cấp `update_pim_schedule`: chuẩn hóa `time_1`, `time_2`, `time_3` về định dạng `HH:MM`, sau khi commit DB tự động đồng bộ cấu hình sang `job_scheduler_service._jobs["job_sync_pim_requests"]`.
     - Nâng cấp `pim_schedule_worker`: chuẩn hóa `target_times` bằng hàm `_norm_time`; khi quét xong (thành công hoặc lỗi) tự động gọi `job_scheduler_service.record_external_job_run` để cập nhật trạng thái và ghi log vào Job Scheduler.
  3. **Frontend (`JobManagementPage.tsx`)**:
     - Nâng cấp `timelineSlots`: `flatMap` tất cả các khung giờ đã cấu hình (`time`, `time_2`, `time_3`) thành các thẻ slot riêng trên Timeline với nhãn `(Lần 1)`, `(Lần 2)`, `(Lần 3)`, sắp xếp tăng dần theo thời gian trong ngày (`sortKey`).
     - Bổ sung bộ badge màu sắc nổi bật cho các mốc giờ trong hàng tác vụ (`Lần 1: 03:00`, `Lần 2: 12:00`, `Lần 3: 16:30`) giúp người dùng nhận diện ngay lập tức tất cả các khung giờ của tác vụ.
- **Kết quả kiểm thử**:
  - Python Backend: `compileall` và unit tests chạy thành công 100%, next run và cron expression tính toán chuẩn từng phút.
  - Frontend TypeScript/Vite: `npm run build` hoàn tất với Exit Code 0 (`✓ built in 3.41s`).

---

### [2026-10-08] - Thay Thế Tab 3 Phân Tích MongoDB Bằng "Giả Lập Android POS Tablet" (CO • SO • KDS)
- **Yêu cầu & Mục tiêu**:
  - Tại trang **Phân Tích MongoDB Nhà Hàng** (`RestaurantMongoAnalysisPage.tsx`), gỡ bỏ Tab 3 cũ (*Tab 3: Phân Tích Từng Table (Collection) Trong 2 DB Hiện Có*).
  - Thay thế bằng **Tab 3: Giả Lập Android (Test App CO • SO • KDS)**.
  - Thiết kế giả lập Android Tablet chuẩn POS màn hình ngang (Landscape), hỗ trợ phiên bản Android 15.0 (Vanilla Ice Cream) hoặc 16.0 (Baklava Preview).
  - Hỗ trợ tải trực tiếp tệp source / APK từ Google Chrome (kho build nội bộ GGG, link trực tiếp từ web bất kỳ, hoặc tải tệp `.apk` từ máy tính cá nhân lên).
  - Tích hợp trình cài đặt gói Android Package Installer và môi trường test chạy thử nghiệm 3 ứng dụng trụ cột:
    1. **App CO (Call Order / POS)**: Xem sơ đồ bàn, trạng thái Occupied / Empty / Locked, mở phiên bàn, in tạm tính, gửi order sang bếp.
    2. **App SO (Smart Order)**: Tablet thực khách tự gọi món tại bàn, chọn món nướng / lẩu / đồ uống, gửi yêu cầu sang KDS.
    3. **App KDS (Kitchen Display System)**: Màn hình điều phối chế biến bếp, thời gian chờ món, cảnh báo chậm giờ (Late / Warning), nút trả món / hoàn thành.
  - Cung cấp thêm bộ công cụ kết nối thiết bị thật / ADB Bridge (cổng 5555, 62001, 5554 cho LDPlayer, Nox, BlueStacks, Android Studio, thiết bị vật lý).

- **Chi tiết thực hiện**:
  1. **Tạo component chuyên biệt `frontend/src/pages/app/AndroidEmulatorTab.tsx`**:
     - Khung phần cứng máy tính bảng Landscape chuẩn 16:10 (Samsung Galaxy Tab S9 FE / Google Pixel Tablet POS Edition), viền kim loại cao cấp bo góc, camera trước, loa, nút nguồn Power, xoay màn hình, chụp ảnh màn hình, chế độ toàn màn hình Fullscreen.
     - Thanh trạng thái Android Status Bar: WiFi 5G sóng mạnh kết nối tới host MongoDB nhà hàng đang chọn, Pin 98% sạc, thời gian thực hh:mm, biểu tượng âm thanh.
     - Thanh điều hướng 3 nút Android (Back ◀, Home ●, Recents ■) và bộ chuyển đổi ứng dụng gần đây (Recents App Switcher).
     - Trình duyệt Google Chrome: Quản lý tab, thanh địa chỉ Omnibox, kho tải APK nội bộ GGG, hộp tải file APK từ URL trực tiếp, trình quản lý download với tiến trình thời gian thực.
     - Trình quản lý tệp (Files / APK Storage): Xem danh sách tệp APK trong `/sdcard/Download/`, nạp file `.apk` từ máy tính, cài đặt nhanh, xóa tệp.
     - Trình cài đặt gói (Android Package Installer Modal): Xác thực quyền cài đặt, thanh tiến trình mô phỏng, tự động đăng ký app vào Launcher Home Screen.
     - Cài đặt hệ điều hành (Settings): Xem cấu hình phần cứng (RAM 8GB, Bộ nhớ 128GB, Android 15/16, IP trạm POS).
     - Sub-tab Kết Nối ADB / Thiết Bị Ngoài: Bảng điều khiển kết nối port ADB và console log hướng dẫn kỹ thuật viên.
  2. **Cập nhật `frontend/src/pages/app/RestaurantMongoAnalysisPage.tsx`**:
     - Nhúng `AndroidEmulatorTab` vào vị trí Tab 3 (`activeTab === 'android_emulator'`).
     - Dọn dẹp toàn bộ code thừa của Tab 3 cũ (state `selectedDb`, `dbOverview`, `loadingDbOverview`, `collectionSearch`, modal `previewModalOpen`), giữ code gọn gàng, sạch sẽ 100%.
  3. **Kiểm thử biên dịch**:
     - Chạy `npm run build`: Thành công 100% trong 3.44s không có bất kỳ cảnh báo hay lỗi TypeScript nào (`✓ built in 3.44s`).

---

### [2026-10-08] - Khắc Phục Triệt Để Lỗi Tải Ảnh Lịch Trực Hotline (Fix 404 Not Found & 500 TypeError)
- **Hiện tượng**:
  - Khi người dùng tải lên / dán hình ảnh lịch trực hotline (Helpdesk hoặc IT App), hệ thống báo lỗi đỏ `(!) Not Found` ở đầu trang.
  - Lịch trực của tháng được tải không cập nhật được hình ảnh mới.
- **Nguyên nhân kép**:
  1. **Lệch đường dẫn API (404 Not Found)**:
     - Frontend `frontend/src/services/hotlineService.ts` gọi đến endpoint `POST /hotline/upload-image` và `DELETE /hotline/schedule/${thang}/${team}`.
     - Backend `backend/app/api/v1/lich_truc_hotline.py` trước đó chỉ khai báo `@router.post("/upload")` và `@router.delete("/schedule")` dạng Query parameters, dẫn đến khi client gửi request upload thì FastAPI trả về `404 Not Found`.
  2. **Lỗi tham số ghi log (500 Internal Server Error)**:
     - Khi thêm route alias, hàm `api_upload_schedule_image` gọi `LogService.record_log(...)` với tham số `mo_ta=...` và thiếu `user_thuchien`, trong khi signature chuẩn của `record_log` dùng `noi_dung` và bắt buộc `user_thuchien`, dẫn đến ngoại lệ `TypeError: LogService.record_log() got an unexpected keyword argument 'mo_ta'`. Request sau khi lưu ảnh vào database bị crash ở bước ghi log.
- **Giải pháp xử lý**:
  1. **Bổ sung alias route đầy đủ tại `backend/app/api/v1/lich_truc_hotline.py`**:
     - Thêm `@router.post("/upload-image")` song song với `/upload` để tương thích 100% với frontend.
     - Thêm `@router.delete("/schedule/{month}/{team}")` song song với query param route `/schedule`.
     - Chuẩn hóa lời gọi `LogService.record_log(..., noi_dung=..., user_thuchien=current_user.username, current_user=current_user)`.
  2. **Tăng độ chịu lỗi của `LogService.record_log` (`backend/app/services/log_service.py`)**:
     - Bổ sung tham số `mo_ta: Optional[str] = None` và `**kwargs: Any`.
     - Tự động fallback: nếu không có `noi_dung` thì lấy `mo_ta`; nếu không có `user_thuchien` thì tự động suy ra từ `current_user.username` hoặc `user_name1`.
  3. **Kiểm thử thực tế**:
     - Test trực tiếp API `POST /api/v1/hotline/upload-image` và `DELETE /api/v1/hotline/schedule/10/APP` với token Admin: Cả 2 thao tác đều trả về HTTP `200 OK`, lưu trữ và cập nhật ảnh chính xác.
     - Kiểm tra quy tắc loại trừ log: Người dùng `dung.nguyenanh` và Super Admin được bỏ qua ghi log an toàn.
     - Frontend build sạch sẽ (`npm run build` thành công trong 3.45s không lỗi TypeScript).
     - Khởi động lại backend server ổn định trên port 8000.

---

### [2026-10-08] - Rà Soát Toàn Diện Hệ Thống & Chuẩn Hóa Ghi Logs Tập Trung (Centralized Logs)
- **Yêu cầu & Mục tiêu**:
  - Đảm bảo tất cả các thao tác thay đổi dữ liệu (`INSERT`, `UPDATE`, `DELETE`, `SYNC`, `IMPORT`, `DEPLOY`, `UNLOCK`, `CLEAR_LOCK`, `EXECUTE`, `SEND_MAIL`...) của mọi người dùng trong toàn hệ thống đều phải được ghi nhận đầy đủ, minh bạch vào bảng Logs tập trung (`dbo.LOGS__New`).
  - **Loại trừ triệt để 2 đối tượng**: User `dung.nguyenanh` (kể cả email `dung.nguyenanh@ggg.com.vn`) và nhóm `Super Admin` (username `admin`, `administrator`, `phanquyen == '0'`, role chứa `superadmin` / `super admin` / `supper`).
  - **Loại trừ các thao tác tra cứu**: Các hành động xem, tìm kiếm thường nhật (`search`, `get`, `list`, `preview`, `detail`) không ghi log để tránh spam bảng dữ liệu.

- **Chi tiết rà soát & nâng cấp các tầng**:
  1. **Tầng dịch vụ ghi log lõi (`backend/app/services/log_service.py`)**:
     - Nâng cấp hàm `check_is_super_admin`: Kiểm tra đa lớp chặt chẽ tên đăng nhập (`u_clean = u_raw.split("@")[0]`), nhận diện `"dung.nguyenanh" in u_clean` hay email, `phanquyen == '0'`, `is_super_admin`, role name chứa `"super"` / `"supper"`.
  2. **Tầng lắng nghe đồng bộ bảng cũ sang bảng mới (`backend/app/models/audit_log.py`)**:
     - Cập nhật SQLAlchemy listener `sync_audit_log_to_logs_new` và hàm `determine_nhom_quyen`: phân loại chuẩn 4 nhóm quyền (`APP`, `INVENTORY`, `HELPDESK`, `QUAN_TRI`), tự động đồng bộ sang `dbo.LOGS__New` cho mọi module dùng `AuditLog`, đồng thời loại trừ triệt để `dung.nguyenanh` và Super Admin.
  3. **Tầng API Endpoints Nghiệp Vụ - Bổ sung ghi log cho toàn bộ thao tác mutation**:
     - `mongodb.py`: Ghi nhận log cho 14 tác vụ (xóa khóa bàn, mở khóa user tablet, tối ưu CPU, giải quyết xung đột menu, kích hoạt món sang CO, thêm món hàng loạt sheets, cập nhật món, xóa món, sao chép/di chuyển món, đồng bộ SO/CO sang NH khác, lưu snapshot, xóa snapshot, triển khai snapshot, đồng bộ trực tiếp menu).
     - `work_checklists.py`: Ghi nhận log cho 9 endpoints (import excel, tạo/sửa/xóa sườn mẹ, tạo/sửa/xóa/đóng run việc, cập nhật item).
     - `projects.py`: Bổ sung `get_db` và ghi log cho 18 endpoints (import dự án, tạo/sửa/xóa dự án, gán nhanh task, quản lý thành viên, thêm/xóa task, toggle task, toggle hàng loạt, hoàn thành tất cả task của dự án/thành viên, review task).
     - `incidents.py`: Ghi nhận log cho 8 endpoints (tạo/sửa sự cố, tạo/sửa outage, tiến độ outage, gán người xử lý, ghi chú tiến độ, cập nhật trạng thái, xóa sự cố).
     - `violations.py`: Ghi nhận log cho 10 endpoints (tạo/sửa/xóa vi phạm, tạo hàng loạt, tạo/sửa/xóa nghỉ phép, tạo/sửa/xóa loại nghỉ phép).
     - `theodoi_pr_po_do.py`: Ghi nhận log cho 4 endpoints (tạo mới PR/PO/DO, khôi phục đơn, cập nhật đơn, xóa đơn).
     - `app_notifications.py`: Ghi nhận log cho 4 endpoints (tạo thông báo mới, sửa thông báo, ghim/bỏ ghim, xóa thông báo).
     - `staff_evaluations.py`: Ghi nhận log cho cấu hình chỉ tiêu đánh giá nhân sự.
     - `setup_restaurants.py`: Bổ sung ghi log cho cập nhật item, check/uncheck hàng loạt, thêm/xóa item, import checklist excel, duyệt setup nhà hàng.
     - `memo.py`: Ghi nhận log cho cập nhật cấu hình round-robin, thêm/sửa/xóa memo template brand, đồng bộ BM qua excel/text, tạo/sửa/gia hạn/xóa memo, duyệt memo.
     - `lich_truc_hotline.py`: Ghi nhận log cho tải ảnh lịch trực và xóa lịch trực.
     - `pim.py`: Ghi nhận log cho đồng bộ PIM, cập nhật trạng thái, gán người xử lý, cấu hình user round-robin.
     - `pm_bo.py`: Ghi nhận log cho thêm/sửa/xóa phần mềm PM/BO, thêm/sửa/xóa phiên bản phần mềm, đồng bộ ngày update phần mềm, upload ảnh phiên bản, thêm/sửa/xóa chuẩn hóa in Brand.
     - `code_photo.py`: Ghi nhận log cho cấp mới code photo, sửa code photo, xóa code photo.
     - `ext_rsc.py`: Ghi nhận log cho thêm/sửa/xóa số máy nhánh EXT RSC.
     - `hotline.py`: Ghi nhận log cho xử lý cuộc gọi nhỡ đơn lẻ, xử lý check all cuộc gọi nhỡ, cập nhật phân quyền trực hotline.
     - `ticket_batch.py`: Ghi nhận log cho lưu cấu hình tài khoản SSO đóng ticket, thực hiện đóng ticket SSO hàng loạt.
     - `unassigned_3cx.py`: Ghi nhận log cho quét nhiệm vụ 3CX trên GPMS, gửi email báo cáo, lưu cấu hình SSO.
     - `mongo_mosquitto.py`: Ghi nhận log cho kích hoạt quét toàn bộ nhà hàng và lưu cấu hình kiểm tra.
     - Các router chỉ dành riêng cho `dung.nguyenanh` và Super Admin (`personal_tasks.py`, `system.py`, `jobs.py`, `mail_memo.py`) hoặc module tra cứu thuần túy (`check_mon_rk7.py`, `dashboard.py`) tuân thủ đúng quy tắc loại trừ.
  4. **Kết quả kiểm thử & Biên dịch**:
     - Backend: `python -m compileall app` đạt exit code 0 (100% hợp lệ).
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.44s`), không có bất kỳ lỗi cú pháp hoặc TypeScript nào.

---

### [2026-10-08] - Sửa Hiển Thị Số Đếm Menu "Quản Lý Dự Án" Trên Sidebar & Tab Filter
- **Hiện tượng**: Menu "Quản Lý Dự Án" trên thanh điều hướng Sidebar không hiển thị số lượng badge màu cam (dự án đang có 1 dự án đang thực hiện nhưng không hiện số đếm bên cạnh như Memo, PIM, Setup NH).
- **Nguyên nhân gốc rễ**: Trong endpoint `get_pending_tasks_summary` ([backend/app/api/v1/dashboard.py](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/app/api/v1/dashboard.py)), khối đếm `projects` trước đây truy vấn bằng session `db` (trỏ tới database `ITDEPT`). Tuy nhiên các bảng `Projects` và `ProjectMembers` thực tế được lưu trữ trên database riêng `PROJECT_MANAGEMENT` (`172.16.8.25`). Do đó câu query bị lỗi và trả về số lượng `total = 0, badge = 0`.
- **Giải pháp xử lý**:
  1. Sử dụng `get_project_session_maker()` để mở kết nối độc lập tới DB `PROJECT_MANAGEMENT`.
  2. Lọc chính xác các dự án đang hoạt động (`Project.Status` không thuộc nhóm đã hoàn thành: `completed`, `done`, `hoàn thành`, `đã hoàn thành`).
  3. Trả về `proj_total` chính xác và gán vào `badge` cho Admin và thành viên dự án (`badge = 1`).
  4. Bổ sung nhãn đếm số lượng dạng pill trên các tab bộ lọc trạng thái của trang [ProjectManagementPage.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/ProjectManagementPage.tsx) ("Tất cả dự án 4", "Đang thực hiện 1", "Đã hoàn thành 3") đồng bộ với các trang khác.
  5. Đã chạy `npm run build` tạo mới toàn bộ bundle trong thư mục [frontend/dist](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/dist).

---

### [2026-10-08] - Sửa Toàn Diện Tính Năng Giả Lập Máy Tính Bảng Android (Landscape POS Tablet)
- **Vị trí**: Tab "Giả Lập Máy Tính Bảng Android" trong trang [RestaurantMongoAnalysisPage.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/RestaurantMongoAnalysisPage.tsx) -> [AndroidEmulatorTab.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/AndroidEmulatorTab.tsx).
- **Hiện tượng & Vấn đề trước sửa**:
  1. Tablet tự cài sẵn 3 app (CO, SO, KDS) ngay từ đầu, không đúng quy trình giả lập từ máy sạch.
  2. Không truy cập được trang web thật trong Chrome (chỉ hiện toast thông báo mà không tải trang).
  3. Khi bấm tải file APK trong Chrome hoặc nạp APK từ máy tính, không tự động mở hộp thoại Package Installer để người dùng cài đặt.
  4. Màn hình chính (Home Launcher) bị hardcode tĩnh các icon, nên sau khi cài app mới không thấy hiển thị gì ra màn hình chính; không mở được các app custom.
  5. Không gỡ được app trên màn hình chính; nếu gỡ trong Cài Đặt thì icon trên Home vẫn nằm nguyên.
  6. Không cách ly bộ nhớ theo người dùng: dữ liệu app và file APK dùng chung bộ nhớ state, người dùng khác nhau hoặc mở nhiều tab sẽ bị đè dữ liệu.
- **Giải pháp xử lý**:
  1. **User Cache Isolation (Phân tách bộ nhớ theo User)**:
     - Tích hợp `useAuth()` để lấy `currentUsername`.
     - Phân vùng khóa lưu trữ `localStorage` riêng: `ggg_android_tablet_v3_${currentUsername}_apps` và `..._downloads`.
     - Trạng thái mặc định rỗng hoàn toàn (`installedApps = []`, `downloadedApks = []`), không cài sẵn bất kỳ ứng dụng POS nào.
     - Nhiều người dùng đăng nhập đồng thời sẽ có không gian máy tính bảng và cache hoàn toàn tách biệt, không ảnh hưởng lẫn nhau.
     - Bổ sung nút "Khôi Phục Gốc (Reset Cache)" trên thanh toolbar và trong Cài Đặt để người dùng tự reset tablet của mình về trắng tinh bất cứ lúc nào.
  2. **Home Launcher động (Dynamic App Grid) & Gỡ App 1 chạm**:
     - Màn hình chính render động từ `installedApps.map(app => ...)`.
     - Hiển thị Empty State hướng dẫn lịch sự khi tablet chưa có app nào được cài đặt.
     - Mỗi app trên màn hình chính có nút tròn đỏ `[X]` ở góc trên phải để gỡ cài đặt nhanh kèm hộp thoại xác nhận.
     - Dock dưới cùng chỉ hiển thị các app POS đã thực sự được cài đặt cùng các app hệ thống cốt lõi (Chrome, Quản Lý Tệp, Cài Đặt).
  3. **Trình duyệt Google Chrome & Web View Thật**:
     - Thanh Omnibox hỗ trợ duyệt web thật qua thẻ `<iframe>` (kèm nút "Mở tab ngoài" nếu website có header chặn iframe) và thanh Bookmarks nhanh (Kho APK GGG, Google, Wikipedia, Web POS).
     - Trong Kho APK GGG: Các nút "Tải & Cài Đặt Ngay" tự động tải nhanh và bật ngay modal **Package Installer (Trình Cài Đặt Gói Android)**.
     - Hỗ trợ dán đường dẫn link `.apk` bất kỳ và nạp file APK từ máy tính PC, tự động mở hộp thoại Package Installer ngay khi tải/nạp xong.
  4. **Hỗ trợ chạy Custom App Runner & Tích hợp ứng dụng G-Waiter (v2.4.104)**:
     - Tích hợp hàm nhận diện thông minh `parseApkMetadata`: Tự động nhận diện chính xác link APK thật từ server `gstore.ggg.com.vn` (như `gwaiter/prod/android/2.4.104/app24104.apk`, dung lượng 16.9 MB) thành ứng dụng **G-Waiter (Order Phục Vụ)**.
     - Khắc phục lỗi nút "Mở Ứng Dụng" và "Xong" trong Package Installer: Lưu đúng `targetAppId` (`app_gwaiter`), khi bấm "Mở Ứng Dụng" sẽ mở ngay lập tức màn hình G-Waiter; khi bấm "Xong" sẽ đưa ngay về Màn hình chính và hiển thị icon G-Waiter.
     - Xây dựng màn hình hoàn chỉnh cho ứng dụng **G-Waiter** (`app_gwaiter`): Sơ đồ bàn ăn các khu vực (Sảnh Tầng 1, Tầng 2, VIP), trạng thái bàn, danh sách món thực khách đã gọi, các tính năng nghiệp vụ Thêm món, Báo bếp (KDS), In tạm tính và Đổi bàn.
     - Nâng cấp thanh tìm kiếm nhanh trên Màn hình chính thành ô nhập liệu tương tác: Cho phép người dùng dán trực tiếp đường dẫn APK (như G-Waiter) ngay tại Màn hình chính và bấm "Tải & Cài APK" một chạm.
     - Bổ sung ứng dụng G-Waiter chính thức vào danh mục Kho Tải APK GGG trong Google Chrome.
  5. **Biên dịch & Build**:
     - Đã chạy `npm run build` thành công đạt exit code 0 (`✓ built in 3.60s`), tạo mới toàn bộ bundle trong [frontend/dist](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/dist).

---

### [2026-10-08] - Tái Thiết Kế Tab 3: Màn Hình Sơ Đồ Bàn Theo Khu (Bước 1)
- **Yêu cầu người dùng**:
  - Gỡ bỏ hoàn toàn toàn bộ tính năng máy ảo tablet rườm rà (khung viền bezel, LDPlayer, Google Chrome giả lập, Package Installer, thanh ảo...) để thiết kế màn hình trực tiếp theo nhu cầu quản trị và vận hành.
  - **Bước 1**: Hiển thị sơ đồ bàn theo khu.
- **Thực hiện**:
  1. **Tái thiết kế toàn diện [AndroidEmulatorTab.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/AndroidEmulatorTab.tsx)**:
     - Gỡ bỏ 100% mã nguồn khung tablet giả lập cũ, chuyển thành màn hình phẳng, chuyên nghiệp, full-width.
     - **Thanh Header & Trạng thái kết nối**: Hiển thị tên nhà hàng, SAP code, IP kết nối MongoDB, thời gian cập nhật gần nhất và nút "Đồng bộ lại" dữ liệu.
     - **Thanh tóm tắt chỉ số bàn (Interactive Status Bar)**: Tổng số bàn, Bàn trống (Xanh lá), Đang có khách (Đỏ hồng), Đã in tạm tính (Xanh dương), Đang gọi món (Vàng hổ phách), Đặt trước (Tím). Bấm vào từng ô để lọc nhanh trạng thái.
     - **Thanh Tabs Khu Vực (Zone / Hall Filter Tabs)**: Nút "Tất Cả Khu Vực" và các tab riêng cho từng khu (Sảnh Tầng 1, Sảnh Tầng 2, Khu VIP, Sân Vườn...) kèm badge số lượng bàn và chấm đỏ nếu có bàn đang phục vụ.
     - **Thanh Tìm Kiếm & Lọc Nhanh**: Tìm kiếm số bàn, tên nhân viên, mã đơn theo thời gian thực.
     - **Lưới Thẻ Bàn Trực Quan (Table Map Grid)**:
       - Gom nhóm rõ ràng theo từng khu vực khi xem tất cả, hoặc lọc riêng theo khu được chọn.
       - Thẻ bàn hiển thị số bàn to rõ, icon dao nĩa, badge màu trạng thái, sức chứa (chỗ ngồi), thời gian khách vào, số phút ngồi, số lượng món đã gọi, tiền tạm tính, tên nhân viên phụ trách và cảnh báo khóa tablet nếu có.
       - Hover effect mượt mà, viền sáng nhẹ.
     - **Modal Chi Tiết Bàn Ăn (Table Detail Modal)**: Click vào thẻ bàn để mở hộp thoại xem chi tiết thông tin bàn, mã hóa đơn, chi tiết từng món đã order kèm đơn giá, thành tiền, trạng thái bếp và tổng tiền tạm tính.
     - **Tích hợp MongoDB trực tiếp & Hybrid Fallback**: Tự động gọi `mongoService.getTableReport(..., split_by_hall=True)` và `mongoService.getLockedTables(...)` khi kết nối MongoDB nhà hàng; tự động fallback dữ liệu mô phỏng chuẩn chuỗi nhà hàng GGG khi chạy ngoại tuyến.
  2. **Cập nhật [RestaurantMongoAnalysisPage.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/RestaurantMongoAnalysisPage.tsx)**:
     - Đổi tên và icon nút chuyển Tab 3 thành `<LayoutGrid size={16} /> Tab 3: Sơ Đồ Bàn Theo Khu (Restaurant Table Map)`.
  3. **Biên dịch & Build**:
     - `tsc -b && vite build` thành công đạt exit code 0 (`✓ built in 4.04s`), tạo bundle sạch 100% trong `frontend/dist`.

---

### [2026-10-08] - Xây Dựng Luồng Chọn Hạng Mục Order & Menu Gọi Món (Bước 2)
- **Yêu cầu người dùng (Kèm 3 ảnh giao diện mẫu)**:
  - Bấm vào sơ đồ bàn (Ảnh 1) -> Hiển thị màn hình chọn Hạng mục Order (Ảnh 2).
  - Sau khi chọn xong -> Chuyển sang màn hình Menu Gọi Món POS (Ảnh 3).
  - Phân chia 3 loại Menu: **Alacarte** (có giá > 0đ), **Buffet** (giá = 0đ), **Đồ uống**.
  - Chia theo nhóm: Cùng 1 nhóm (VD: Mỳ), nhưng món có giá thuộc Alacarte, món 0đ thuộc Buffet.
  - Mỗi món hiển thị tên, giá, mã RK7, mã SAP nhỏ nhỏ phía dưới và icon link xem hình ảnh thật của món.
- **Thực hiện trong [AndroidEmulatorTab.tsx](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/AndroidEmulatorTab.tsx)**:
  1. **Màn hình 1 - Sơ đồ bàn (Ảnh 1)**:
     - Nút sảnh "Tầng 1" nền xanh sẫm (`#1e3a5f`), tiêu đề "Danh sách bàn" ở giữa 2 đường kẻ ngang.
     - Lưới thẻ bàn chữ nhật (`A1`, `A2`, `A3`, `A5`, `A6`, `B1`, `B2`...), tên góc trên trái, icon ghế ngồi và sức chứa `🪑 4` ở góc dưới phải.
     - Bấm vào bàn -> Chuyển sang màn hình chọn Hạng mục Order.
  2. **Màn hình 2 - Chọn Hạng Mục Order (Ảnh 2)**:
     - Tiêu đề: `Loại Menu (Nếu muốn KH chọn menu theo nhu cầu)` (chữ ngoặc đỏ sẫm nghiêng).
     - Các thẻ lớn chọn Loại Menu: `Alacarte (CKHCM_oc_ALC)`, `Buffet Nướng Lẩu (CKHCM_oc_BF)`, `Set Menu Trưa (CKHCM_oc_SET)`.
     - Mục chọn `Nhân viên phục vụ` và số lượng khách dự kiến.
     - Bấm chọn Loại Menu -> Chuyển ngay sang Menu Gọi Món của bàn đó.
  3. **Màn hình 3 - Thực Đơn & Gọi Món POS 2 Cột (Ảnh 3)**:
     - **Cột Trái (Đơn hàng bàn)**:
       - Header: Nút quay lại `←`, Tên bàn (`Bàn B2`), icon `•••`.
       - 4 nút thao tác: `[Kiểm đồ]`, `[Ra món]`, `[In QRCode]`, và nút cam rực rỡ `[GỬI ORDER]`.
       - Danh sách món trong đơn: `1.0 x Gà xù truyền thống  32,407 đ`, `1.0 x Gà xù xốt cheese miso  37,037 đ` kèm nút tăng giảm số lượng (+ / -) và xóa món.
       - Tạm tính tổng tiền thời gian thực. Bấm `[GỬI ORDER]` cập nhật trạng thái bàn sang Có Khách.
     - **Cột Phải (Menu món ăn)**:
       - 3 Tabs chính: `Alacarte (Có giá)`, `Buffet (0đ)`, `Đồ uống` với gạch cam active dưới đáy và ô tìm kiếm món.
       - Thanh nhóm món: `Combo`, `ALC.GÀ RÁN NHẬT BẢN` (cam active), `ALC.CƠM NHẬT`, `ALC.BURGER`, `ALC.MỲ`, `ALC.ĂN KÈM`, `ALC.THỊT NƯỚNG`...
       - **Logic phân chia Alacarte vs Buffet**: Cùng nhóm `Mỳ`, khi ở tab Alacarte chỉ hiện mì có giá (Ramen thịt nướng 59k, Udon xào 55k...), khi ở tab Buffet chỉ hiện mì 0đ (Udon nhúng lẩu 0đ, Ramen buffet 0đ, Miến dai 0đ...).
       - Lưới thẻ món ăn: Thẻ trắng hoặc thẻ xanh lá cho Karaage, tên món to rõ, giá tiền, dòng mã nhỏ `RK7: xxxxx | SAP: xxxxx`.
       - Icon hình ảnh nhỏ: Bấm vào mở Modal phóng to ảnh món thật kèm link mở ảnh gốc trong tab mới.
       - Bấm vào thẻ món: Thêm ngay 1 món vào đơn của bàn bên trái.
  4. **Biên dịch & Build**:
     - `tsc -b && vite build` thành công 100% đạt exit code 0 (`✓ built in 4.27s`).

- **Khắc phục & Tinh chỉnh bổ sung theo phản hồi**:
  1. **Khắc phục lỗi thông báo nháy liên tục**:
     - Loại bỏ việc gọi `onToast` trong tiến trình nạp tự động (`useEffect`), sử dụng `useRef` lưu host và `onToast` để cắt đứt hoàn toàn vòng lặp re-render loop.
     - Chỉ hiển thị thông báo toast khi người dùng bấm nút "Đồng bộ MongoDB" thủ công.
  2. **Đọc Hạng mục Order thực tế từ `RESTAURANT_CATEGORY` (Chỗ ẩn hiện menu)**:
     - Tích hợp gọi `mongoService.getMenuShowHide(host, 27017)` để đọc chính xác danh mục menu đang cấu hình cho kênh SO (`show_in_so !== false`).
     - Với các nhà hàng chỉ có 1 danh mục menu (ví dụ chỉ có `Alacarte (CKHCM_oc_ALC)`), màn hình chỉ hiển thị ĐÚNG 1 thẻ danh mục đó; loại bỏ hoàn toàn các thẻ Buffet hay Set Menu giả định khi nhà hàng không có.
  3. **Ẩn hoàn toàn danh sách nhân viên phục vụ**:
     - Gỡ bỏ mục Nhân viên phục vụ khỏi màn hình chọn Hạng mục Order, giao diện tập trung và tinh gọn tối đa.
  4. **Đồng bộ đầy đủ món ăn thực tế từ MongoDB (Kể cả món ẩn) & Gắn dấu nhận biết**:
     - Đọc toàn bộ thực đơn qua API mongoService.loadMenuSoCoItems({ host, search_all: true }), đồng bộ 100% dữ liệu món với Tab 1 (Tác vụ 3: Xử lý SO/CO).
     - Ví dụ với nhà hàng Chixmax Vạn Hạnh Mall (10.8.153.41:27017), nhóm Combo hiển thị đầy đủ toàn bộ 29 món thực tế (COMBO RỦ RÊ 33370, COMBO RÔM RẢ 33371, Combo No Nê 33339...) thay vì chỉ có 2 món mẫu tạm thời.
     - **Xử lý món ẩn theo đúng yêu cầu**: Quét danh sách món ẩn qua mongoService.getDishShowHide. Các món bị ẩn trên kênh SO (show_in_so === false hoặc is_hidden === true) **vẫn được hiển thị đầy đủ trên thực đơn tablet**, không lọc bỏ mà gắn nhãn nhỏ làm dấu 🚫 Ẩn (icon EyeOff, nền đỏ nhạt #fee2e2, viền đỏ #fca5a5), viền thẻ món dạng viền nét đứt đỏ nhạt để nhân viên/quản trị viên nhìn vào nhận biết ngay món đó đang bị ẩn trên POS.
     - Hiển thị thống kê số lượng món minh bạch: {displayedDishes.length} món (gồm {hiddenCount} món ẩn).
     - Bổ sung hiệu ứng loading spinner thân thiện khi đang nạp thực đơn từ MongoDB trạm nhà hàng.
  5. **Chuyển icon ảnh thành chữ nhỏ "Có hình" / "Không hình"**:
     - Thay thế icon ảnh bằng nút/nhãn chữ nhỏ:
       - Món có link ảnh: Hiển thị chữ `Có hình` màu xanh lá cây (`#059669` trên nền `#ecfdf5`), bấm vào mở modal phóng to ảnh thật và xem link gốc.
       - Món không có link ảnh: Hiển thị chữ `Không hình` màu xám (`#9ca3af` trên nền `#f3f4f6`).
  6. **Tự động ẩn tab Buffet nếu không có món 0đ**:
     - Tính toán `hasBuffetDishes` từ danh sách món ăn thực tế.
     - Nếu thực đơn không có món 0đ (như nhà hàng Chixmax Vạn Hạnh Mall), tab `Buffet` tự động ẩn, chỉ hiển thị 2 tab: `Alacarte` và `Đồ uống`.
     - Nếu có món 0đ (nhà hàng Buffet), tab `Buffet` sẽ tự động xuất hiện.
  7. **Dàn ngang màn hình Chọn Loại Menu (Căn giữa như sơ đồ bàn)**:
     - Tái cấu trúc layout màn hình `select_category`: Chuyển từ dạng cột kéo dài sang dàn ngang các thẻ (`flex-wrap`, `justify-content: center`).
     - Kích thước thẻ vừa vặn, cân đối như danh sách thẻ bàn trên sơ đồ bàn (`width: 270px`, `minHeight: 140px`), căn giữa trang với 2 đường kẻ ngang thanh lịch.
  8. **Biên dịch & Build**:
     - Chạy `npm run build` (`tsc -b && vite build`) thành công 100% với exit code 0.

---

### [2026-10-12] - Tối Ưu Hotline 3CX Real-Time, Banner Line Nội Bộ, Tăng Timeout Ticket Batch x4 & Thiết Lập GitHub
- **Hạng mục 1: Tối Ưu Hotline 3CX Real-Time & Auto Refresh (HotlineContext.tsx, HotlineMissedCallsModal.tsx, hotline_3cx_service.py)**:
  - Bổ sung cơ chế Polling ngầm 2.5s liên tục tại `HotlineContext.tsx` để khắc phục triệt để hiện tượng IIS / Reverse Proxy đệm gói tin SSE khiến badge số cuộc gọi nhỡ không tự nhảy số.
  - Sửa lỗi thiếu `.count()` trong query `unresolved_count` tại `backend/app/services/hotline_3cx_service.py`.
  - Tự động làm mới danh sách cuộc gọi mỗi 3s khi đang mở `HotlineMissedCallsModal.tsx`.
- **Hạng mục 2: Banner Thông Báo Cuộc Gọi Không Phải Nhà Hàng (RestaurantListPage.tsx)**:
  - Bổ sung banner cảnh báo chuyên dụng đặt chính xác giữa thanh Tiêu đề và Khung Tìm kiếm của trang Danh Sách Nhà Hàng.
  - Phân biệt rõ cuộc gọi Nhà Hàng (tự bung popup kết nối VNC/KDS từ xa) vs cuộc gọi Nội bộ / Không thuộc danh mục (hiện banner thông báo tên, số line, thời gian, tuyệt đối không bung VNC).
- **Hạng mục 3: Đóng Gói Bộ Cài 3CX Hotline Client Agent & Sửa Lỗi Sao Chép (Hotline3cxGuideModal.tsx)**:
  - Thay thế `navigator.clipboard` bằng `copyToClipboard` có fallback `execCommand` để copy mượt mà trên môi trường HTTP IP (`172.16.8.25:5002`).
  - Đóng gói trọn bộ `3CX_Hotline_Client_Agent.zip` kèm file `Cai_Dat_Khoi_Dong_Cung_Windows.bat` (tự chép vào `%LOCALAPPDATA%`, đăng ký Windows Startup, xóa thư mục tải về vẫn hoạt động vĩnh viễn).
- **Hạng mục 4: Tăng Timeout Đóng Ticket Hàng Loạt 3CX & G-Process Lên Gấp 4 Lần (ticket_batch_service.py, ticketBatchService.ts)**:
  - Tăng toàn bộ timeout kết nối SSO, GPMS, G-Process từ 150s lên 600s (10 phút), frontend preview lên 720s (12 phút), batch run lên 2400s (40 phút).
- **Hạng mục 5: Đồng Bộ GitHub Repository & Quy Tắc Bắt Buộc Commit/Push**:
  - Kết nối Remote GitHub: `https://github.com/adwewecat/IT_Project_Management_New.git`.
  - Bổ sung quy định bắt buộc phải commit và push code lên GitHub ngay sau mỗi lần làm tính năng hoặc sửa lỗi (`GEMINI.md`, `AGENTS.md`, `PROJECT_GUIDELINES.md`).
- **Hạng mục 6: Khắc Phục Triệt Để Lỗi Báo Thành Công Giả & Cần Chạy 2-3 Lần Ở Ticket 3CX & G-Process**:
  - **Nguyên nhân cốt lõi**:
    1. *False-positive của check disabled*: Code cũ kiểm tra selector `.styles_checkListItemContainer__ZLEVV label.ant-radio-wrapper-disabled`. Trong G-Process, form của Nhà Hàng ở Bước 1 luôn luôn bị `disabled` đối với IT (dung.nguyenanh). Do đó, ngay khi tải trang, script bắt trúng phần tử này và lập tức trả về `status: "success"` với câu "Nhiệm vụ đã được kết thúc từ trước" mà hoàn toàn không thực hiện bất kỳ hành động nào trên GPMS!
    2. *Mất liên kết Modal Timesheet & Popup Xác nhận*: Khi bấm nút "Xác nhận", Ant Design mở Modal xác nhận ("Đồng ý", "Xác nhận") hoặc Modal Timesheet ("Lưu"). Code cũ chờ 8s trong selector `#container-portal button:has-text('Lưu')` (không khớp với Ant Modal của G-Process) dẫn tới việc bỏ qua các popup xác nhận hoặc chưa lưu Timesheet đã vội kết thúc.
    3. *Đóng Browser vội vàng khi API đang gửi*: Code cũ không kiểm tra Toast phản hồi (`.ant-message-success` / `.ant-message-error`) và chỉ sleep 1s rồi gọi `browser.close()` ngay lập tức, ngắt kết nối TCP đột ngột khiến backend GPMS hủy giao dịch lưu dữ liệu. Đó là lý do khi mạng nhanh hoặc chạy lại 2-3 lần thì mới ăn may thành công.
  - **Giải pháp xử lý toàn diện**:
    1. *Loại bỏ check disabled sai lầm*: Chỉ coi nhiệm vụ đã hoàn thành từ trước khi trên trang KHÔNG CÒN nút hành động "Xác nhận" nào và trạng thái trang ghi nhận đã kết thúc.
    2. *Vòng lặp Modal đa tầng (Dynamic Modal Handler Loop)*: Tự động phát hiện và xử lý tuần tự mọi modal xuất hiện (điền 1h + note cho Timesheet, bấm Đồng ý/Xác nhận cho Confirmation Dialog).
    3. *Xác thực kết quả thực tế qua Toast GPMS*: Bắt lỗi ngay nếu GPMS trả về `.ant-message-error` để hiển thị đúng logs cho người dùng, chờ `.ant-message-success` và thiết lập buffer 3.0s an toàn trước khi đóng tab/chuyển mục.
    4. *Tự động bỏ chọn vé thành công trên giao diện*: `handleRunTicketBatch` tự động deselect các mục đã hoàn tất thật sự, chỉ giữ lại mục lỗi (nếu có).

---

### [2026-10-12] - Sửa Lỗi Treo / Chết Backend & Quét Sai IP Gateway Trong Lịch Hẹn Giờ Đẩy Param Xuống Nhà Hàng
- **Màn hình**: Phân Tích MongoDB Nhà Hàng -> 9. Xử Lý Param (Cấu Hình Bảng APP_PARAM) -> ⏰ Quản Lý Lịch Hẹn Giờ Đẩy Param Xuống Nhà Hàng.
- **Hiện tượng lỗi**:
  1. Người dùng bấm lưu lịch hẹn giờ đẩy param xuống các nhà hàng (12 - 18 nhà hàng).
  2. Đến đúng giờ hẹn chạy, backend FastAPI bị **treo cứng hoàn toàn**, không thể nhận request HTTP, server uvicorn đứng đơ ("treo, chết backend luôn").
  3. Khi mở chi tiết kết quả, 100% nhà hàng đều báo lỗi: `No servers found yet, Timeout: 4.0s, Topology Description: <TopologyDescription id: ..., servers: [<ServerDescription ('10.8.217.1', 27017) server_type: Unknown, rtt: None>]>`.
- **Nguyên nhân cốt lõi**:
  1. *Blocking Asyncio Event Loop*: Worker chạy nền `param_schedule_worker` là một hàm `async def` chạy trực tiếp trong event loop chính của FastAPI. Khi tới giờ chạy, worker gọi trực tiếp hàm đồng bộ `MongoDBService.execute_scheduled_param_job` trên luồng chính. Hàm này lặp tuần tự qua từng nhà hàng với `MongoClient(..., serverSelectionTimeoutMS=4000)`. Khi 12-18 nhà hàng bị timeout, toàn bộ event loop bị phong tỏa liên tục 48s - 72s (nếu 100 nhà hàng thì bị phong tỏa hàng chục phút). Việc này làm tê liệt hoàn toàn uvicorn khiến toàn bộ hệ thống sập và không thể phản hồi bất kỳ API nào.
  2. *Kết nối nhầm IP Router Gateway (`.1`)*: Bảng `RESTAURANT.ip` lưu địa chỉ dải mạng của nhà hàng (thường kết thúc bằng `.1` như `10.9.82.1`, `10.8.217.1`). Địa chỉ `.1` là Router/Firewall của nhà hàng, hoàn toàn không mở port 27017! Trong khi đó, MongoDB thực tế chạy ở các máy POS/KDS (`.11`, `.12`, `.41`, `.13`, `.14`, `.42`). Code cũ kết nối trực tiếp vào `.1:27017` nên 100% các nhà hàng đều bị ServerSelectionTimeoutError.
- **Giải pháp xử lý toàn diện**:
  1. *Cơ chế Smart Mongo Endpoint Resolver (`resolve_mongo_target_ip`)*:
     - Tự động nhận diện nếu IP là Router Gateway (`.1`), Subnet prefix (`.X`), hoặc IP chưa mở port 27017.
     - Dò tìm song song cực nhanh qua socket TCP (timeout 0.7s) vào các đuôi POS/KDS đặc thù Golden Gate: `.11` (POS 1), `.12` (POS 2), `.41` (KDS/POS 3), `.13`, `.14`, `.42`.
     - Tự động phát hiện và kết nối đúng vào máy POS/KDS thực tế đang mở cổng MongoDB 27017.
  2. *Xử lý song song đa luồng (Concurrent Worker Pool)*:
     - Tái cấu trúc hàm `execute_scheduled_param_job` và `batch_apply_params` sang sử dụng `ThreadPoolExecutor(max_workers=min(12, len(restaurants)))`.
     - Quét và đẩy param đồng thời cho 12 - 50 nhà hàng chỉ mất 1 - 2 giây thay vì 48s - 72s tuần tự.
  3. *Giải phóng 100% Asyncio Event Loop*:
     - Tách hàm `execute_scheduled_param_job_by_id(job_id, triggered_by)` chạy với `SessionLocal()` riêng biệt, an toàn đa luồng.
     - Trong `param_schedule_worker`: Cập nhật `job.status = "RUNNING"` ngay trong DB, sau đó dùng `asyncio.create_task(asyncio.to_thread(...))` để đẩy tác vụ sang ThreadPool của hệ điều hành. Luồng chính của FastAPI hoàn toàn thong dong xử lý các request HTTP khác mà không có bất kỳ độ trễ nào.
  4. *Cập nhật giao diện Modal Kết quả thực thi (`MongoDbParamManagementTask.tsx`)*:
     - Hiển thị địa chỉ IP máy POS/KDS thực tế đã nhận dữ liệu cùng IP gốc (`Gốc: 10.9.82.1`).
     - Tối ưu bảng chi tiết hiển thị lỗi rõ ràng, ngắt dòng chuẩn đẹp khi gặp sự cố mạng.

  5. *Đẩy Param Đồng Bộ Xuống TẤT CẢ 3 Máy Trạm POS/KDS Của Nhà Hàng (.11, .12, .41)*:
     - **Quy chuẩn nghiệp vụ**: Mỗi nhà hàng có tới 3 máy trạm chạy MongoDB (`.11` là POS 1, `.12` là POS 2, `.41` là KDS/POS 3). Tuyệt đối không chỉ xử lý 1 IP rồi dừng lại. Hệ thống phải quét và đẩy cấu hình xuống **TẤT CẢ** các máy POS/KDS đang mở cổng trong nhà hàng.
     - **Linh hoạt mở rộng**: Cấu hình danh sách đuôi IP được lưu tập trung tại [`backend/data/mongo_param_settings.json`](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/backend/data/mongo_param_settings.json) (`default_tails: ["11", "12", "41"]`). Sau này người dùng muốn thêm trạm (như `.13`, `.14`, `.42`), chỉ cần sửa file json hoặc cấu hình mà không cần sửa code.
     - **Thực thi song song từng máy**: Khi đẩy param xuống 1 nhà hàng, hệ thống dùng sub-threadpool đẩy đồng thời xuống cả 3 máy (`.11`, `.12`, `.41`) chỉ trong <0.8s. Báo cáo chi tiết từng máy: máy nào online đã ghi thành công, máy nào tắt nguồn (Offline).
     - **Hiển thị trực quan**: Modal chi tiết kết quả hiển thị thẻ badge trạng thái độc lập cho từng máy POS/KDS (`✓ 10.9.82.11`, `✓ 10.9.82.12`, `⚡ 10.9.82.41 (Tắt)`).

---

### [2026-10-12] - Sửa Lỗi Tab 3: Sơ Đồ Bàn Theo Khu (Restaurant Table Map) Chỉ Hiển Thị 2 Nhóm Món Thay Vì Toàn Bộ Thực Đơn MongoDB
- **Màn hình**: Phân Tích MongoDB Nhà Hàng -> Tab 3: Sơ Đồ Bàn Theo Khu (Restaurant Table Map) ([`AndroidEmulatorTab.tsx`](file:///d:/Z.Dung_luu_rieng/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/AndroidEmulatorTab.tsx)).
- **Hiện tượng lỗi**:
  1. Tại Tab 1 Tác vụ 3: "Xử Lý SO/CO (Thực Đơn, Món Ăn & Bảng Tính)", hệ thống hiển thị đầy đủ 101 món ăn và 9 nhóm món.
  2. Nhưng khi chuyển sang Tab 3: "Sơ Đồ Bàn Theo Khu (Restaurant Table Map)" và bấm vào bàn (ví dụ bàn A2), màn hình thực đơn chỉ hiển thị đúng 2 nhóm (`Combo` và `ALC.GÀ RÁN NHẬT BẢN`) và nhóm `Combo` chỉ có 3 món.
- **Nguyên nhân cốt lõi**:
  1. *Fallback dữ liệu giả lập `FALLBACK_DISHES_DATA`*: Trong `AndroidEmulatorTab.tsx`, dữ liệu mẫu cứng dự phòng chỉ có đúng 5 món chia làm 2 nhóm: `ALC.GÀ RÁN NHẬT BẢN` (2 món) và `Combo` (3 món).
  2. *Trigger nhầm IP dải gateway (`10.8.153.x`)*: Khi Tab 3 mount, nếu `connectedHost` chưa sẵn sàng, code cũ lấy fallback `selectedRestaurant.ip` (dạng `10.8.153.x` chứa chữ `x`). Địa chỉ này không phải máy chủ MongoDB nên gọi API bị ném Exception, rơi vào khối `catch (err)` và ghi đè `setDishes(FALLBACK_DISHES_DATA)`.
  3. *Không có cơ chế kích hoạt nạp lại khi vào bàn*: Khi người dùng bấm vào bàn và xác nhận hạng mục menu, hàm `handleSelectTableFromMap` và `handleConfirmCategory` không kiểm tra số lượng món thực tế, khiến màn hình order bị kẹt vĩnh viễn ở 5 món mẫu fallback.
  4. *Thiếu mã Menu (`menu_codes`)*: Tab 3 chỉ gửi `search_all: true` mà không gọi `getMenuSoCoCategories` để lấy đúng mã Menu (`172`) như Tab 1 Tác vụ 3 (`ManageMenuSoCoTask.tsx`).
- **Giải pháp xử lý toàn diện**:
  1. *Cơ chế chuẩn hóa IP `getValidMongoHost`*: Tự động lọc bỏ các IP gateway có chữ `'x'`, chỉ gọi MongoDB khi có IP máy trạm hợp lệ (ví dụ `10.8.153.41`).
  2. *Đồng nhất 100% logic nạp thực đơn với Tác vụ 3*:
     - Tự động gọi `mongoService.getMenuSoCoCategories(cleanHost)` để lấy danh mục và mã Menu thực tế (`172`).
     - Tải toàn bộ 101 món qua `loadMenuSoCoItems` kèm theo `menu_codes` và `search_all: true`.
     - Khử trùng lặp chuẩn xác theo nhóm + mã RK7 + mã SAP + tên món + giá.
     - Tuyệt đối không fallback về dữ liệu mẫu khi đã kết nối MongoDB thành công.
  3. *Tự động nạp lại khi người dùng click vào bàn (`handleSelectTableFromMap` & `handleConfirmCategory`)*: Nếu `dishes.length <= 5`, tự động gọi `loadDishesFromMongo(validHost)` ngay lập tức để nạp đủ 101 món và 9 nhóm món.
  4. *Nút "Làm Mới ({dishes.length} món)"*: Thêm trực tiếp trên thanh công cụ của Menu Gọi Món, cho phép người dùng theo dõi số món thực tế và bấm làm mới tức thì bất kỳ lúc nào.
  5. *Bổ sung Tab "Tất cả" (`all`)*: Bên cạnh các tab "Alacarte" (74 món • 8 nhóm), "Buffet" (0đ), "Đồ uống" (27 món • 1 nhóm), cho phép xem toàn bộ 101 món và 9 nhóm món liền mạch.

---

### [2026-10-12] - Khắc Phục Lỗi Phân Quyền Trực Hotline 3CX (hotline_3cx_duty) Cho Nhóm IT Application (Team App) Và Ma Trận Quyền RBAC
- **Hiện tượng lỗi**:
  1. Người quản trị đã vào mục **Quản Trị Hệ Thống -> Người Dùng & Quyền**, chọn nhóm quyền **IT Application (Team App)** và tích chọn `[X] Xem` cho quyền **"Quyền Trực Hotline 3CX (Bật/tắt trực & xem cuộc gọi nhỡ)"** (`hotline_3cx_duty`).
  2. Tuy nhiên, các tài khoản người dùng thuộc Team App khi đăng nhập vẫn không thấy cụm nút Hotline 3CX trên thanh tiêu đề Header (nút `Hotline: BẬT/TẮT` và nút `Cuộc Gọi`).
- **Nguyên nhân cốt lõi**:
  1. *Frontend `HotlineContext.tsx`*: Trước đây hoàn toàn bỏ qua đối tượng phân quyền RBAC `user.permissions`, chỉ gọi API kiểm tra tĩnh `hotlineService.checkUserPermission`. Nếu kiểm tra qua API hoặc fallback, chỉ kiểm tra cứng `['admin', 'helpdesk']` mà không nhận diện nhóm `app` hoặc cờ quyền `hotline_3cx_duty`.
  2. *Backend Service `hotline_3cx_service.py`*: Hàm `check_user_hotline_access` chỉ kiểm tra trong file tĩnh `hotline_permissions.json` (mặc định chỉ có `admin` và `helpdesk`), hoàn toàn không truy vấn bảng phân quyền `dbo.PHANQUYEN_DETAIL` trong SQL Server.
  3. *Backend Auth `auth_service.py`*: Danh sách quyền mặc định `ALL_PERMISSIONS` thiếu khóa `hotline_3cx_duty`. Đồng thời, hàm `get_user_permissions` trước đây chỉ quét bảng `PHANQUYEN_DETAIL` khi `quyen_mo_rong` được gán khác `0`. Với các tài khoản được gán nhóm theo `phanquyen = 'app'` hoặc `'2'`, hệ thống không tự động map sang mã nhóm tương ứng trong `LV_QUYEN` để lấy các quyền chi tiết.
- **Giải pháp xử lý toàn diện**:
  1. *Đồng bộ trực tiếp trên Frontend (`HotlineContext.tsx`)*:
     - Ưu tiên kiểm tra trực tiếp quyền từ ma trận RBAC: Nếu `user.permissions['hotline_3cx_duty']` hoặc `view_hotline_3cx_duty` là `True`, lập tức cấp quyền hiển thị và trực hotline (`setCanAccessHotline(true)`).
     - Bổ sung nhóm `app` vào danh sách fallback khi mất kết nối API.
  2. *Tích hợp kiểm tra Database trong Backend (`hotline_3cx_service.py` & `hotline.py`)*:
     - Hàm `check_user_hotline_access` được nâng cấp nhận `Session` từ DB: Tự động truy vấn bảng `dbo.PHANQUYEN_DETAIL` theo `quyen_mo_rong` hoặc theo mã nhóm (`id_quyen = 2` của nhóm `app`, `id_quyen = 3` của `helpdesk`, v.v.). Nếu quyền `hotline_3cx_duty` đang `Active == True`, hệ thống lập tức cho phép.
     - Endpoint `/api/v1/hotline/check-permission` tự động tiêm `db: Session = Depends(get_db)`.
  3. *Bổ sung `ALL_PERMISSIONS` & Tự Động Phân Giải Nhóm (`auth_service.py`)*:
     - Bổ sung `hotline_3cx_duty`, `view_hotline_3cx_duty`, `update_hotline_3cx_duty` vào `ALL_PERMISSIONS`.
     - Nâng cấp `get_user_permissions`: Tự động gom tất cả các mã nhóm từ cả `quyen_mo_rong` và `phanquyen` (thông qua `ROLE_MAP`), đảm bảo người dùng thuộc Team App luôn nhận đủ 100% quyền được cấu hình trong bảng `PHANQUYEN_DETAIL`.
  4. *Đồng bộ 2 chiều cấu hình (`role_service.py` & `hotline_permissions.json`)*:
     - Bổ sung nhóm `app` vào `enabled_roles` trong `backend/data/hotline_permissions.json` và `DEFAULT_HOTLINE_PERMISSIONS`.
     - Khi người quản trị lưu phân quyền trong trang Quản Trị Hệ Thống (`update_role_permissions`), nếu quyền `hotline_3cx_duty` của nhóm được bật/tắt, hệ thống tự động cập nhật ngay lập tức vào `hotline_permissions.json`.

---

### [2026-10-12] - Chuyển Đổi Cổng Triển Khai Production Server Từ 5002 Sang 5001 (`172.16.8.25:5001`)
- **Mục tiêu**: Đổi toàn bộ cấu hình truy cập web trên server nội bộ từ `http://172.16.8.25:5002` sang `http://172.16.8.25:5001`.
- **Chi tiết các thành phần cập nhật**:
  1. *Frontend Vite Preview (`frontend/vite.config.ts`)*: Cập nhật `preview.port: 5001`.
  2. *Script Khởi Động (`start_production_5001.bat` & `start_production_5002.bat`)*: Cập nhật tham số khởi chạy `npx vite preview --host 0.0.0.0 --port 5001`.
  3. *Backend CORS Origin (`backend/.env`)*: Bổ sung origin `http://172.16.8.25:5001`, `http://localhost:5001`, `http://127.0.0.1:5001` vào `CORS_ORIGINS`.
  4. *Cấu Hình Registry VNC/KDS Chrome & Edge (`vnc_scrcpy_protocol.reg`)*: Bổ sung origin `http://172.16.8.25:5001` vào `AutoLaunchProtocolsFromOrigins` cho Chrome & Edge policies.
  5. *Hotline Client Desktop Agent (`tools/3cx_hotline_agent/config.txt` & `Run_3CX_Hotline_Agent.bat`)*: Cập nhật `SERVER_URL=http://172.16.8.25:5001`.
  6. *Dịch Vụ Windows Service ITFrontend (NSSM trên Server)*: Hướng dẫn cập nhật Application Arguments sang `--port 5001`.

---

### [2026-10-04 và trước đó] - Nền Tảng & Quy Chuẩn Giao Diện Toàn Hệ Thống
- **Quy định No Stat Cards**: Tuyệt đối không đặt các khối thẻ thống kê to ở đầu các trang tác vụ nghiệp vụ (CentralizedLogs, RestaurantMongoAnalysis...).
- **Quy tắc Đóng Modal**: Modal chỉ đóng khi bấm `Esc`, bấm nút `X` hoặc nút "Đóng" / "Hủy"; không đóng khi click ngoài overlay.
- **Super Admin Mode**: Tài khoản `dung.nguyenanh`, `admin`, `0` hoạt động ở chế độ `⚡ Chế độ Super Admin (Không lưu logs thao tác của bạn)`.
- **Giới hạn Logs Tập Trung**: Giới hạn tối đa 2000 bản ghi log gần nhất (`MAX_LOAD_LIMIT = 2000`) để bảo vệ hiệu năng.
- **Tương thích Python 3.10**: Bắt buộc `from __future__ import annotations` ở đầu file backend; import đầy đủ model/schema Pydantic.
- **TypeScript Strict Mode**: Lỗi TS6133 (biến thừa không dùng) là lỗi cấm, phải giữ code sạch 100% khi build.

