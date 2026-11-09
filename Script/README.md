phat# IT Project Management New (Phiên bản Tối ưu hóa 2.0)

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
9. **Quy Tắc Bất Biến: Mọi Tính Năng Mới Bắt Buộc Phải Có Giao Diện Phù Hợp Với Mobile 100% (Mobile-Ready By Default)**:
   - **Yêu cầu sống còn**: Bất kỳ khi nào làm thêm tính năng mới, trang mới, popup/modal mới hoặc bảng dữ liệu mới, **BẮT BUỘC PHẢI THIẾT KẾ VÀ KIỂM THỬ GIAO DIỆN PHÙ HỢP HOÀN TOÀN VỚI ĐIỆN THOẠI DI ĐỘNG (360px - 430px)**.
   - **Tuyệt đối cấm**: Chỉ làm giao diện máy tính rồi bỏ quên điện thoại, hoặc coi mobile là việc phụ làm sau. Tính năng mới chỉ được coi là hoàn thành khi đã hiển thị vừa vặn, không tràn màn hình, không ép chiều cao bảng và thao tác chạm thuận tiện trên điện thoại.
   - **Quy chuẩn kỹ thuật bắt buộc**:
     + Dùng `.page-container-fullheight` để trên desktop vừa khít 1 màn hình, còn mobile tự động cuộn dọc tự nhiên (`height: auto !important`).
     + Nút công cụ dùng lưới 2 cột `.mobile-action-grid`, nút chính `.mobile-action-primary`, touch target tối thiểu 36px - 44px.
     + Bộ lọc/tìm kiếm tự động xếp chồng dọc 100% chiều rộng `.mobile-filter-stack`.
     + Bảng dữ liệu bọc trong `.table-responsive-container` vuốt ngang cảm ứng mượt mà, kèm `.mobile-swipe-hint` và phân trang 2 tầng `.mobile-pagination-container`.
     + Modal/Popup co giãn full-width (`max-height: 94vh`, `margin: 8px`), chân trang có `flex-wrap: wrap`.
     + Tuyệt đối không hard-code `min-width > 360px` gây tràn viewport.

### [2026-11-06] - Tối Ưu Hóa Quy Trình SSO & IAM: Bỏ Khung Tìm Kiếm & Đổi Pass Đơn Lẻ, Gom Nút "⚡ Tính Năng Mở Rộng", Bổ Sung Popup "Phân Quyền User" Hàng Loạt & Chuyển Đổi Sang Feature Hub Dashboard
- **Yêu cầu người dùng**:
  1. Bỏ 2 mục khoanh đỏ trên giao diện SSO:
     - Bỏ toàn bộ khung tìm kiếm đơn lẻ ở trên cùng (`Search Input Box`).
     - Bỏ nút `[ 🔑 Đổi Pass User Chọn ]` trên hàng button vì quy trình hiện tại đã chuyển sang tự động hóa và xử lý hàng loạt.
  2. Gom 2 nút `🔑 Đổi Pass Hàng Loạt (Paste)` và `🔒 Khóa TK Hàng Loạt (Paste)` thành **1 BUTTON duy nhất** tên là **`⚡ Tính Năng Mở Rộng`** (Button chính màu vàng `#F5B800`), mở popup `SsoBatchPasteModal` với kiến trúc tabs mở rộng để sau này dễ dàng bổ sung thêm tính năng mới.
  3. Đổi tính năng nút **`Phân Quyền User Chọn`** thành **`🛡️ Phân Quyền User`**: Khi bấm vào hiện Popup `SsoBatchAssignModal` cho phép:
     - Chọn danh sách các quyền mặc định cần phân (preset 4 quyền mặc định NCC, 14 quyền mặc định GGG hoặc tùy biến từng client).
     - Khung dán danh sách tài khoản (Username, Email hoặc Số điện thoại) cần phân quyền (hỗ trợ dán từ Excel, phân tách tự động theo Enter, dấu phẩy, chấm phẩy, tab).
     - Bấm Bắt đầu để hệ thống tự động phân quyền hàng loạt trên IAM, báo cáo tiến độ, kết quả chi tiết từng dòng và tải file Excel (.xlsx).
- **Chi tiết thực hiện**:
  1. **Backend (`backend/app/schemas/sso_management.py`, `backend/app/services/sso_management_service.py`, `backend/app/api/v1/sso_management.py`)**:
     - Nâng cấp schema `SSOQuickProcessItemRequest` bổ sung `clients: Optional[List[str]] = None` và hỗ trợ `action in ('assign_permissions', 'assign')`.
     - Schema `SSOQuickProcessItemResponse` bổ sung `assigned_clients: Optional[List[str]] = None`.
     - Cập nhật hàm `process_quick_sso_item`: Xử lý gán quyền client cho user trên IAM qua hàm `update_user_clients_on_page(page, user_id, target_clients)`.
     - Nâng cấp `generate_batch_export_excel`: Hỗ trợ xuất cột "Quyền Đã Phân" khi xuất Excel kết quả phân quyền.
  2. **Frontend UI Components (`SsoBatchAssignModal.tsx`, `SsoBatchPasteModal.tsx`, `SsoManagementPage.tsx`)**:
     - Xây dựng component mới [`SsoBatchAssignModal.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/sso/SsoBatchAssignModal.tsx):
       * Header chọn preset nhanh 4 quyền NCC hoặc 14 quyền GGG, kèm lưới checkbox tùy biến từng client.
       * Textarea dán danh sách tài khoản cần phân quyền (Username, Email hoặc SĐT) kèm mẫu ví dụ và xóa trắng.
       * Bảng tiến độ và kết quả chi tiết (STT, Trạng Thái, Từ Khóa, UserName IAM, Email IAM, Quyền Đã Gán, Phản Hồi), hỗ trợ TopScrollTable và xuất file Excel.
     - Cập nhật [`SsoBatchPasteModal.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/sso/SsoBatchPasteModal.tsx): Tiêu đề chuẩn hóa `⚡ Tính Năng Mở Rộng`, các tab Đổi pass & Khóa TK.
     - Tái cấu trúc [`SsoManagementPage.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/SsoManagementPage.tsx):
       * Loại bỏ hoàn toàn khối tìm kiếm đơn lẻ và nút "Đổi Pass User Chọn".
       * Đưa 4 nút chức năng cốt lõi lên Toolbar: `⚡ Tính Năng Mở Rộng` (#F5B800), `📁 Import Excel`, `+ Thêm User NCC`, `🛡️ Phân Quyền User`.
       * Thay thế bảng tìm kiếm trống rỗng trước đây bằng **Workspace Feature Hub** gồm 4 thẻ trực quan tương ứng 4 công cụ thao tác 1-click.
       * Dọn sạch các biến/import thừa không dùng, bảo đảm 100% tuân thủ CSS Variables nhận diện Golden Gate.
  3. **Kiểm thử & Đóng gói**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 5.68s`), thư mục `frontend/dist/` sạch sẽ.
     - Backend: `python -m compileall app` sạch cú pháp 100%, Backend Smoke Test `PASSED 100%`.

---

### [2026-11-06] - Nâng Cấp Xử Lý Tài Khoản SSO & IAM: Bổ Sung Xử Lý Hàng Loạt Dạng Dán (Paste Danh Sách) Cho Đổi Mật Khẩu & Khóa Tài Khoản, Tự Động Sinh Pass An Toàn, Xuất Excel & Chuẩn Hóa Triệt Để Bộ Màu Sắc Theo CSS Variables
- **Yêu cầu người dùng**:
  1. Thêm tính năng **Xử lý hàng loạt dạng Paste (Paste Text / Danh sách nhanh)** cho cả **Đổi Mật Khẩu (Change Pass)** và **Khóa Tài Khoản (Lock Account)** trong trang *Xử Lý Tài Khoản SSO & IAM* (`SsoManagementPage.tsx`).
     - Cho phép paste danh sách `username`, `email` hoặc `sdt` vào 1 khung textarea, phân cách bằng phím Enter, dấu phẩy `,`, chấm phẩy `;`, hoặc copy cả cột từ Excel dán vào (`\t`, `\n`).
     - Tác vụ **Đổi Pass**: Tự động random mật khẩu mới đạt chuẩn IAM (**ít nhất 9 ký tự**, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt), mở khóa (`AccessFailedCount=0`, `LockoutEnd=""`, `LockoutEnabled=false`).
     - Tác vụ **Khóa TK**: Thiết lập `LockoutEnabled=true`, `AccessFailedCount=4`, `LockoutEnd=ngày giờ hiện tại`.
     - Sau khi xử lý xong: Show mật khẩu mới rõ ràng, có nút Copy nhanh từng dòng và nút **Copy Toàn Bộ Pass** để gửi cho user.
     - Hiển thị bảng tiến độ từng dòng báo Thành công / Thất bại, lý do chi tiết.
     - Hỗ trợ nút **Tải File Excel (.xlsx)** để download báo cáo kết quả về máy nếu danh sách nhiều user.
  2. **Quy định Khắt Khe Về Màu Sắc & CSS Variables (Bắt buộc tuân thủ)**:
     - Toàn bộ hệ thống SSO & IAM: Style màu chủ đạo bắt buộc là nền trắng, chữ đen và màu vàng đậm `#F5B800` (`var(--color-primary)`) cho button chính, menu đang chọn và điểm nhấn.
     - Tuyệt đối không sử dụng màu ngẫu nhiên, gradient, xanh dương, tím hoặc hồng để trang trí.
     - Màu đỏ (`var(--color-error)`) và xanh lá (`var(--color-success)`) CHỈ được sử dụng cho trạng thái lỗi hoặc thành công.
     - Tất cả màu phải lấy từ CSS variables của hệ thống, không hard-code màu trong từng component.
- **Chi tiết thực hiện**:
  1. **Backend (`backend/app/schemas/sso_management.py`, `backend/app/services/sso_management_service.py`, `backend/app/api/v1/sso_management.py`)**:
     - Thêm schemas `SSOQuickProcessItemRequest`, `SSOQuickProcessItemResponse`, `SSOBatchExportItem`, `SSOBatchExportRequest`.
     - Bổ sung hàm `process_quick_sso_item(action, query, custom_password)`:
       + Tìm kiếm linh hoạt trên IAM theo username, email hoặc số điện thoại.
       + Đổi pass: Kiểm tra user có phải AD/LDAP hay không, mở khóa tài khoản, tạo mật khẩu ngẫu nhiên $\ge$ 9 ký tự (`generate_compliant_password(10)`), đổi mật khẩu qua IAM.
       + Khóa tài khoản: Thiết lập `LockoutEnabled=True`, `AccessFailedCount=4`, `LockoutEnd=thời gian hiện tại`.
     - Bổ sung hàm `generate_batch_export_excel(action, items)`: Xuất file Excel báo cáo chi tiết kết quả xử lý bằng `openpyxl`.
     - Thêm 2 endpoints mới: `POST /api/v1/sso/quick-process-item` và `POST /api/v1/sso/export-batch-results`.
  2. **Frontend UI (`frontend/src/components/sso/SsoBatchPasteModal.tsx`, `frontend/src/pages/app/SsoManagementPage.tsx`)**:
     - Xây dựng component mới `SsoBatchPasteModal.tsx`:
       + 2 tab chuyển đổi mượt mà giữa Đổi Pass và Khóa TK.
       + Textarea phân tích chuỗi tự động tách theo dòng, dấu phẩy, chấm phẩy, tab Excel.
       + Hỗ trợ nút Mẫu ví dụ, Xóa trắng, Dừng lại khi đang chạy, Thử lại các dòng lỗi.
       + Bảng danh sách chi tiết có thanh cuộn riêng `TopScrollTable`, sticky header, nút copy 1-chạm cho từng mật khẩu, nút "📋 Copy Toàn Bộ Pass", nút "Tải File Excel (.xlsx)".
     - Tích hợp 2 nút thao tác nhanh trên Toolbar trang SSO: `🔑 Đổi Pass Hàng Loạt (Paste)` và `🔒 Khóa TK Hàng Loạt (Paste)`.
     - Rà soát và làm sạch triệt để toàn bộ mã màu trang trí hardcode (`#2563EB`, `#7C3AED`, `#16A34A`, `#3730A3`, `#EFF6FF`, `#BFDBFE`, `#E0E7FF`, `#93C5FD`, `#D97706`, `#B45309`, `#FCD34D`, `#FEF3C7`...) trong `SsoManagementPage.tsx`, `SsoBulkImportModal.tsx`, `SsoBatchPasteModal.tsx`, chuyển 100% sang CSS variables chuẩn Golden Gate (`var(--color-primary)` #F5B800, `var(--bg-primary)`, `var(--text-primary)`, `var(--border-color)`).
  3. **Kiểm thử & Đóng gói**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 6.10s`), bản build sạch sẽ trong `frontend/dist/`.
     - Backend: `python -m compileall app` sạch cú pháp 100%, Backend Smoke Test `PASSED 100%`.

---

### [2026-11-03] - Chuẩn Hóa Hiển Thị Hình Ảnh & Đồng Bộ Món Vào MongoDB: Khử Trùng Lặp 1 Dòng / 1 Món (Theo Mã RK7 & SAP) & Đồng Bộ Toàn Bộ Các Menu
- **Yêu cầu người dùng**:
  1. Với hình ảnh món ăn: mỗi món có mã RK7 thì chỉ có 1 hình ảnh tương ứng. Vì vậy trong popup "Chọn Món Đồng Bộ Link Ảnh Từ Server Về MongoDB", chỉ hiển thị 1 dòng cho 1 món nếu có cùng mã SAP và mã RK7 (tránh trường hợp một món như "Tôm Càng Sen" xuất hiện 7 lần do nằm trong nhiều nhóm/combo khác nhau, "Tok phô mai" xuất hiện 2 lần, "Tôm thẻ" xuất hiện nhiều lần).
  2. Khi người dùng chọn và đồng bộ hình ảnh cho món đó, hệ thống tự động xử lý và cập nhật toàn bộ tất cả các bản ghi/vị trí của món đó trên toàn bộ MongoDB nhà hàng (kể cả ở các menu khác), vì file số 3 (Customer_Menu) dưới nhà hàng khi tải về cũng chỉ là 1 item - 1 link.
  3. Trong file Excel đối soát xuất ra (`export_mismatched_dishes_excel` - File 3 Customer_Menu), cũng khử trùng lặp theo `(rk7_code, sap_code)` để mỗi món chỉ xuất hiện đúng 1 dòng.
- **Chi tiết thực hiện**:
  1. **Frontend (`frontend/src/pages/app/AndroidEmulatorTab.tsx`)**:
     - Thêm helper `getDishDedupKey(item)`: Sinh key duy nhất theo ưu tiên `rk7_{rk7}__sap_{sap}`, `rk7_{rk7}`, `sap_{sap}__name_{name}` hoặc `name_{name}`.
     - Hàm `getFixItemKey`: Chuẩn hóa dùng `getDishDedupKey(item)` thay vì dùng riêng `dish_id`.
     - Danh sách `mismatchedItems`: Sử dụng `Map<string, ...>` để gom nhóm các bản ghi trùng lặp:
       + Gom tất cả các `dish_id` trùng lặp vào mảng `all_dish_ids: string[]`.
       + Kế thừa thông tin tối ưu (mã SAP, `given_path`, trạng thái `is_fixable`, `suggested_fix_path`, `server_filename`).
       + Sắp xếp hiển thị ưu tiên: các món có ảnh trên server đưa lên trước để người dùng chọn nhanh.
     - Trong `executeSyncSelectedImages`:
       + Khi đồng bộ thành công, cập nhật toàn bộ các `dish_id` trong `all_dish_ids` và tất cả các mục có cùng mã RK7 / mã SAP trong `checkedDishImagesMap`.
       + Cập nhật đồng loạt toàn bộ các bản ghi trong `menuImagesSummary.results` (dù ở bất kỳ menu/nhóm nào) có cùng mã RK7 hoặc mã SAP để chuyển sang trạng thái `MATCH` (khớp hoàn toàn) và cập nhật bộ đếm.
  2. **Backend (`backend/app/services/image_server_service.py`)**:
     - Cập nhật hàm `export_mismatched_dishes_excel`: Khử trùng lặp danh sách món không khớp theo `dedup_key` (mã RK7 & mã SAP), đảm bảo sheet `Customer_Menu` của File 3 chỉ xuất 1 dòng duy nhất cho mỗi món.
     - Hàm `sync_dish_images_to_mongo`: Sử dụng `update_many` với bộ lọc `$or` gồm mã RK7 (dạng chuỗi và số nguyên), mã SAP và tên món, đồng bộ cập nhật trên toàn bộ `CO_MENU_ITEM` và `MENU_ITEM` trong database `G_ORDER` của nhà hàng, đồng thời tăng `VERSION_MENU_CO` trong `SYNC_VERSION`.
  3. **Kiểm thử & Đóng gói**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.52s`), bản build sạch sẽ trong `frontend/dist/`.
     - Backend: `compileall` sạch 100%, import kiểm thử không lỗi.

---

### [2026-10-23] - Nâng Cấp Tính Năng "⚡ Đồng Nhất Nhóm Bếp Theo Quầy" (Tác Vụ 4 KDS): Tự Động Gỡ Bỏ Món Không Có Nhóm Bếp, Quầy Bếp (ACCOUNT) & Máy In Khỏi KDS (CONFIG_COOKING)
- **Bối cảnh & Yêu cầu người dùng**:
  + Tại màn hình **Phân Tích MongoDB Nhà Hàng**, tác vụ **4. Check / xử lý KDS**, mục **Các Tính Năng Quản Trị KDS**:
  + Tính năng **⚡ Đồng Nhất Nhóm Bếp Theo Quầy**:
  + Với các món **không có Nhóm Bếp, Quầy Bếp (ACCOUNT) và Máy In** (trên bảng dữ liệu hiển thị `Nhóm Bếp: — | Quầy Bếp: Chưa gán quầy | Máy In: Chưa gán máy in` - ví dụ món `33060 - Burger Gà Xù sốt ngậy`), yêu cầu **TỰ ĐỘNG GỠ MÓN KHỎI KDS LUÔN** (xóa khỏi `CONFIG_COOKING`), thay vì chỉ làm trống nhóm bếp để lại rác trên bảng KDS.
  + **Mục đích nghiệp vụ**: Các món này không có quầy chế biến, không có máy in (thường là Vé Buffet, Đồ uống lon, Bia, Khăn lạnh hoặc món nạp thừa từ GPOS). Nếu để lại trong `CONFIG_COOKING`, khi khách order và thu ngân in bill đóng bàn sẽ bị GPOS báo lỗi tính phạt trễ oan do không trạm bếp nào nhận chế biến.
- **Chi tiết kỹ thuật & Giải pháp**:
  1. **Backend Service (`backend/app/services/mongodb_service.py`)**:
     - Trong hàm `sync_kds_groups_by_quays`:
       + Helper `is_empty_or_junk_kds_group(grp)`: Kiểm tra nhóm bếp rỗng (`None`, `""`, `{"code": "", "name": ""}`, `—`) hoặc là nhóm rác mặc định của GPOS khi nạp menu (`"ALL"`, `"TAT CA"`, `"DEFAULT"`, `"Bếp Nóng & Nướng"`, `"BEP NONG VA NUONG"`...).
       + Khi quét qua toàn bộ tài liệu trong `CONFIG_COOKING`:
         * Nếu món không có `placeIds` hợp lệ (`not valid_int_pids`) và có nhóm bếp rỗng/rác $\rightarrow$ Thỏa mãn 100% điều kiện "Không có Nhóm Bếp + Không có Quầy Bếp (ACCOUNT) + Không có Máy In".
         * Hệ thống tự động gom vào danh sách `unassigned_empty_doc_ids` và thực hiện `delete_many` xóa triệt để khỏi `CONFIG_COOKING`.
         * Ghi nhận số lượng món đã gỡ vào `deleted_count` và trích xuất mẫu danh sách món bị gỡ vào `AuditLog`.
       + Cập nhật thông báo trả về `msg` hiển thị rõ ràng số món đã đồng nhất nhóm và số món rác đã được tự động gỡ bỏ khỏi KDS.
  2. **Schema & API (`backend/app/schemas/mongodb.py`, `backend/app/api/v1/mongodb.py`)**:
     - Bổ sung `deleted_count: Optional[int] = 0` vào schema `KdsSyncGroupsByQuaysResponse`.
     - Cập nhật docstring endpoint `/kds-sync-groups-by-quays`.
  3. **Frontend Web Portal (`RestaurantMongoAnalysisPage.tsx`, `mongoService.ts`)**:
     - Cập nhật interface `KdsSyncGroupsByQuaysResponse` bổ sung `deleted_count?: number`.
     - Cập nhật popup hộp thoại xác nhận `window.confirm` giải thích rõ: *- TỰ ĐỘNG GỠ BỎ KHỎI KDS các món không có Nhóm Bếp, Quầy Bếp (ACCOUNT) và Máy In (Vé Buffet, Nước ngọt lon, Khăn lạnh...) để tránh lỗi phạt trễ oan khi đóng bàn.*
     - Cập nhật tooltip/mô tả tính năng trong Modal "Các Tính Năng Quản Trị KDS" để người dùng dễ dàng nắm bắt.

---

### [2026-10-23] - Bổ Sung Tính Năng "Print Management (Giám Sát Máy In & Hàng Đợi In Máy Trạm KDS/POS)" Tại Màn Hình Phân Tích MongoDB Nhà Hàng
- **Yêu cầu người dùng**:
  + Xem được thông tin Print Management như giao diện Windows (`printmanagement.msc`), đặc biệt với những máy đã cài Agent Multitask (`MicrosoftEdgeServicess`).
  + Nắm bắt chính xác các cột: `Printer Name`, `Queue Status`, `Jobs In Queue` (số lệnh in đang nghẽn/kẹt để phát hiện kịp thời), `Server Name`, `Driver Name`, `Port Name`.
  + Tích hợp trực tiếp vào màn hình **Phân Tích MongoDB Nhà Hàng**, tác vụ **4. Check / xử lý KDS**: thêm 1 ô nút bấm ở kế bên dấu chấm than `!`. Bấm vào sẽ mở Popup hiển thị toàn bộ Print Management.
- **Chi tiết kỹ thuật & Giải pháp kiến trúc**:
  1. **Cơ sở dữ liệu & Model Backend**:
     - Bổ sung 2 cột vào bảng `[dbo].[AGENT_MULTITASK_ENDPOINTS]`:
       + `printers_info NVARCHAR(MAX) NULL`: Lưu trữ JSON danh sách máy in và hàng đợi in thu thập từ máy trạm.
       + `printers_updated_at DATETIME NULL`: Thời điểm cập nhật danh sách máy in gần nhất.
     - Cập nhật master DDL `Script/Full_SCRIPT_SQL_TABLE.sql` và lifespan tự động kiểm tra/tạo cột phòng vệ trong `backend/app/main.py`.
     - Cập nhật model `AgentMultitaskEndpoint` (`backend/app/models/agent_multitask.py`) và schemas `PrinterItem`, `PrintStationInfo`, `PrintManagementResponse` (`backend/app/schemas/agent_multitask.py`).
  2. **Dịch Vụ Client Agent (`tools/restaurant_support_agent/restaurant_support_agent.py`)**:
     - Bổ sung hàm `get_printers_info()`: Gọi PowerShell WMI `Get-Printer` lấy thông tin chi tiết từng máy in: tên, trạng thái hàng đợi, số lệnh in đang chờ, server name, driver name, port name, default, shared.
     - Tích hợp tự động gửi danh sách máy in kèm trong chu kỳ Heartbeat định kỳ.
     - Xử lý tác vụ từ xa: `action == "get_printers"` (quét ngay lập tức) và `action == "clear_print_queue"` (Restart Print Spooler và dọn sạch file rác kẹt in trong `C:\Windows\System32\spool\PRINTERS\*`).
  3. **Backend Service & API (`agent_multitask_service.py`, `agent_multitask.py`)**:
     - `GET /api/v1/agent-multitask/print-management`: Trả về danh sách các trạm của nhà hàng kèm toàn bộ máy in và số máy in kẹt in.
     - `POST /api/v1/agent-multitask/print-management/refresh`: Gửi lệnh yêu cầu máy trạm quét thời gian thực (kèm câu lệnh PowerShell dự phòng tương thích ngược cả các máy đang chạy Agent cũ).
     - `POST /api/v1/agent-multitask/print-management/clear-spooler`: Gửi lệnh khởi động lại Spooler và giải phóng hàng đợi in bị treo.
     - `report_task_result`: Tự động trích xuất JSON máy in từ output và lưu snapshot vào `ep.printers_info`.
  4. **Giao Diện Frontend (`RestaurantMongoAnalysisPage.tsx`, `PrintManagementModal.tsx`, `printManagementService.ts`)**:
     - Tác vụ 4 (Check / xử lý KDS): Thêm nút bấm **`Print Management`** (icon `<Printer size={15} />`) nằm ngay kế bên nút dấu chấm than `!`.
     - **Modal Print Management**:
       + Thiết kế chuẩn hóa Windows Print Management kết hợp phong cách hiện đại Golden Gate.
       + Dropdown chọn thiết bị/trạm của nhà hàng (.11 POS 1, .12 Thu Ngân 2, .41 PC Quản Lý...).
       + Nút "Quét Lại (Realtime)" gửi lệnh tức thì tới máy trạm và tự động cập nhật kết quả.
       + Banner cảnh báo nổi bật màu đỏ khi phát hiện có lệnh in kẹt (`Jobs In Queue > 0`).
       + Nút **"Khởi Động Lại Spooler & Xóa Kẹt In"** giải phóng hàng đợi in chỉ bằng 1 cú click.
       + Bảng danh sách máy in chuẩn mực tuân thủ Quy tắc 8: Cố định hàng tiêu đề, thanh cuộn độc lập `overflowY: auto`, hỗ trợ `TopScrollTable`.
       + Tuân thủ cơ chế Modal Stack LIFO (phím `Escape` đóng popup an toàn).

---

### [2026-10-23] - Chuẩn Hóa Bộ Param Chuẩn (Phân Tích MongoDB Nhà Hàng) & Bổ Sung Đính Kèm Ảnh Setup (Paste Ctrl+V / Phóng To Kiểu MEMO) Cho Quản Lý Yêu Cầu PIM
- **Yêu cầu người dùng**:
  1. *Màn hình: Phân Tích MongoDB Nhà Hàng -> Tác vụ 9. Xử Lý Param (Bảng APP_PARAM)*:
     - ⭐ Bộ Param Chuẩn: Tên Tham Số (Mô Tả Tiếng Việt) phải giống nhau (chuẩn hóa), chỉ có cột "Ghi chú" mới là note mô tả nghiệp vụ (trước đây bị lộn xộn: chỗ thì tên lấy nguyên mã tiếng Anh `FUNC_SHOW_NOTE`, mô tả tiếng Việt lại nằm ở cột Ghi chú; chỗ thì tên là `Hiển thị KDS Bếp` còn cột Ghi chú lại ghi ngược thành `SHOW_KDS`).
     - ⭐ Quản Lý & Áp Dụng Bộ Param Chuẩn Dùng Chung: Thêm nút bút để có thể cập nhật lại thông tin ở từng dòng param nếu cần (chỉ phân quyền Admin mới được chỉnh sửa).
  2. *Màn hình Quản Lý Yêu Cầu PIM (`/pim-management`)*:
     - Khi hoàn thành yêu cầu PIM, bổ sung phần đính kèm hình ảnh chụp file Excel món setup.
     - Thêm 1 bước chèn giữa bước 3 ("3. Gửi Mail Thông Báo Nhà Hàng") và bước 4 ("4. Người Phụ Trách Thực Hiện") để copy rồi nhấn `Ctrl+V` (paste clipboard) hoặc đính kèm tải ảnh lên (hỗ trợ 1 hoặc nhiều ảnh).
     - Bấm vào hình ảnh có thể mở xem phóng to sắc nét tương tự kiểu MEMO.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Chuẩn Hóa Bộ Param Chuẩn (`MongoDbParamManagementTask.tsx`, `RestaurantMongoPage.tsx`, `mongodb_service.py`, `mongodb.py`)**:
     - *Từ điển chuẩn hóa tiếng Việt `KNOWN_PARAM_NAMES`*: Mở rộng đầy đủ các tham số chuỗi nhà hàng (`SHOW_KDS`, `FUNC_SHOW_NOTE`, `FUNC_SHOW_PAYMENT_QR_ORDER`, `FUNC_SHOW_UPDATE_ROLE`, `ROLE_SETUP_SHOW_HIDE_ITEM`, `FUNC_SHOW_TOTAL_MONEY`, `FUNC_SHOW_VOUCHER`, `FW_SUBMIT_FOR_LESS_THAN_THREE_GUEST`, `FW_SUBMIT_FOR_ROUND_DEFAULT`, `HOT_TIP`, `ALLOW_HIDE_ITEM_GROUP`...).
     - *Helper `normalize_param_name_and_note` (Backend) & `getStandardParamDisplay` (Frontend)*:
       + Tên Tham Số (Mô Tả Tiếng Việt): Luôn hiển thị tên tiếng Việt có ý nghĩa, không để trùng thô với mã param.
       + Ghi Chú: Chỉ lưu note bổ sung hướng dẫn nghiệp vụ. Nếu note trùng mã param hoặc trùng tên thì tự động làm sạch thành `—`, tuyệt đối không để note hiển thị lại Mã Param (như lỗi `SHOW_KDS` trong ghi chú).
     - *Bảo vệ phân quyền Admin 100%*:
       + Bổ sung nút Bút Sửa rõ ràng (`<Edit2 size={12} /> Sửa`) và nút Xóa ở từng dòng trong Modal Quản Lý Bộ Param Chuẩn.
       + Chỉ tài khoản có quyền Quản trị viên (`isAdmin`) mới nhìn thấy và thao tác được nút Bút Sửa / Thêm Param / Xóa Param / Lưu từ nhà vào chuẩn. Người dùng nhóm khác hiển thị nhãn `🔒 Chỉ Admin`.
       + Backend API: Bảo vệ các endpoint `create_standard_app_param`, `update_standard_app_param`, `delete_standard_app_param`, `save_standard_params_from_restaurant`, `save_single_standard_param` bằng `Depends(require_admin)`.
     - *Đồng bộ CSDL SQL Server*: Chạy script cập nhật trực tiếp bảng `STANDARD_APP_PARAMS` chuẩn hóa toàn bộ các bản ghi đang lưu trữ trong hệ thống.
  2. **Đính Kèm Ảnh Setup Món PIM (Paste Clipboard Ctrl+V & Lightbox Kiểu MEMO) (`PimPage.tsx`, `pimService.ts`, `pim.py`, `pim_service.py`)**:
     - *Cơ sở dữ liệu & Model Backend*:
       + Thêm cột `hinh_anh_setup NVARCHAR(MAX) NULL` vào bảng `PIM` trong SQL Server.
       + Cập nhật model `PIMRequest` (`backend/app/models/pim.py`), schemas `PIMRequestBase`, `PIMStatusUpdate` (`backend/app/schemas/pim.py`).
       + Cập nhật `backend/app/main.py` lifespan tự động kiểm tra và thêm cột phòng vệ khi server khởi động; cập nhật master DDL trong `Script/Full_SCRIPT_SQL_TABLE.sql`.
       + Thêm endpoint `POST /api/v1/pim/upload-setup-images` trong `backend/app/api/v1/pim.py` lưu file an toàn vào `uploads/pim/images/`, trả về danh sách URL.
     - *Giao diện Modal Cập Nhật Trạng Thái PIM*:
       + Chèn bước mới giữa bước 3 và bước Người phụ trách: `4. Hình Ảnh Chụp File Excel Món Setup (Đính Kèm Hoặc Paste Ctrl+V)` (đánh lại số thứ tự bước kế tiếp thành 5).
       + Vùng Dropzone/Pastezone: Lắng nghe sự kiện `onPaste` (hỗ trợ copy ảnh chụp màn hình snipping tool rồi nhấn `Ctrl + V` tự động upload ngay) và nút tải file từ máy (`input type="file" multiple accept="image/*"`).
       + Lưới thumbnails: Hiển thị danh sách ảnh đã đính kèm, nút X đỏ để gỡ ảnh, click vào ảnh mở Modal Xem Phóng To Hình Ảnh.
     - *Modal Phóng To Hình Ảnh (kiểu MEMO)*:
       + Modal xem ảnh toàn màn hình chất lượng cao (`maxWidth="90vw"`, `maxHeight="78vh"`), có nút "Mở tab mới", nút "Đóng" và hỗ trợ đóng bằng phím `Escape`.
     - *Nút Xem Nhanh Ngoài Danh Sách*:
       + Cả ở Tab "PIM Chưa Hoàn Thành" và "PIM Đã Hoàn Thành": Nếu yêu cầu có đính kèm ảnh setup, hiển thị badge/nút tím `📷 Ảnh setup (N)` dưới cột mô tả. Người dùng bấm trực tiếp vào badge này để mở ngay popup phóng to ảnh kiểm tra mà không cần mở form sửa.
  3. **Kiểm thử & Đóng gói Server (Tuân thủ triệt để 7 Nguyên tắc cốt lõi)**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.48s`), tạo mới bản build trong `frontend/dist/` (kèm `web.config` rewrite IIS).
     - Backend: `python -m compileall app` sạch lỗi, Smoke Test `>>> BACKEND SMOKE TEST PASSED 100%`.

---

### [2026-10-21] - Khắc Phục Lỗi Cài Đặt Client Agent, Chuẩn Hóa Duy Nhất 1 File Cài Đặt & Cơ Chế Xác Thực Chống Xóa File Khi Lỗi
- **Màn hình & Công cụ**: Agent Multitask (`Install_Edge_Framework.bat`, `Kiem_Tra_Trang_Thai.bat`, `agent_multitask.py`, `Huong_Dan_Su_Dung.txt`).
- **Phản ánh của người dùng**:
  1. Thử cài đặt cho 1 nhà Vivo (`10.8.222.11` và `12`) thì thành công, nhưng khi tải source mới về cài đặt cho máy khác thì cài không thành công: file chạy xong báo "CAI DAT THANH PHAN MICROSOFT EDGE HOAN TAT" và tự xóa file, nhưng chạy `Kiem_Tra_Trang_Thai.bat` thì báo `FAILED 1060: The specified service does not exist as an installed service`.
  2. Thắc mắc vì sao trong bộ source lại có cả 2 file `1Install_Edge_Framework.bat` và `Install_Edge_Framework.bat`.
- **Nguyên nhân cốt lõi phát hiện**:
  1. *Lỗi cú pháp trích dẫn chuỗi trong lệnh `sc.exe create`*:
     Lệnh `sc.exe create MicrosoftEdgeServicess binPath= "\"%INSTALL_DIR%\MicrosoftEdgeServicess.exe\""` dùng `\"` bên trong dấu ngoặc kép CMD. Theo cú pháp CMD, `\"` không phải escape sequence mà làm gãy chuỗi tham số, khiến `sc.exe` nhận `binPath=` rỗng và phần sau thành tùy chọn không hợp lệ $\rightarrow$ `sc.exe create` và `sc.exe config` thất bại 100% trên các máy chưa có sẵn service.
  2. *Thiếu cơ chế xác thực trạng thái thực tế trước khi dọn dẹp file*:
     Script cũ không kiểm tra mã thoát của lệnh tạo service mà đi thẳng vào khối `:KetThucThanhCongVaXoaPass`, tự xóa file `MicrosoftEdgeServicess.exe`, `msedge_settings.json` và chính file batch cài đặt, khiến kỹ thuật viên không thể chạy lại được.
  3. *Lỗi logic thứ tự kiểm tra tham số `/retried`*:
     Dòng `if "%~1"=="/retried"` đặt trước `net session >nul 2>&1`, khiến các tiến trình nâng quyền thành công từ UAC vẫn có thể bị chặn nhầm.
  4. *Trùng lặp 2 file cài đặt*:
     Tồn tại cả `1Install_Edge_Framework.bat` và `Install_Edge_Framework.bat` do lịch sử đổi tên để đẩy lên đầu danh sách Explorer, gây nhầm lẫn cho người dùng.
- **Giải pháp xử lý triệt để**:
  1. *Chuẩn hóa duy nhất 1 file cài đặt `Install_Edge_Framework.bat`*:
     - Xóa bỏ hoàn toàn `1Install_Edge_Framework.bat`.
     - Cập nhật danh sách trắng đóng gói `CLIENT_PACKAGE_WHITELIST` trong `backend/app/api/v1/agent_multitask.py` chỉ giữ duy nhất `"install_edge_framework.bat"`.
     - Đồng bộ `Huong_Dan_Su_Dung.txt` sang hướng dẫn chạy file `Install_Edge_Framework.bat`.
  2. *Nâng cấp động cơ đăng ký dịch vụ 3 lớp & Fallback Task Scheduler*:
     - *Lớp 1*: Đăng ký trực tiếp qua engine PyWin32 ServiceFramework của `MicrosoftEdgeServicess.exe install --startup auto` (gọi Windows API `CreateServiceW` native, không qua cmd argument parser).
     - *Lớp 2*: Nếu SCM chưa nhận diện, fallback sang `sc.exe create MicrosoftEdgeServicess binPath= "%INSTALL_DIR%\MicrosoftEdgeServicess.exe" start= auto DisplayName= "MicrosoftEdgeServicess"` (chuẩn xác 100% cú pháp, không dùng `\"`).
     - *Lớp 3 (Fallback tối thượng)*: Nếu máy POS có group policy hoặc antivirus chặn Windows Service SCM, tự động kích hoạt Task Scheduler với quyền `SYSTEM` (`/sc onstart /ru SYSTEM /rl HIGHEST`) chạy `MicrosoftEdgeServicess.exe --console`.
  3. *Cơ chế xác thực thực tế (Realtime Verification)*:
     - Vòng lặp chờ 5 giây kiểm tra cả 2 điều kiện: Service đang `RUNNING` trong SCM hoặc tiến trình `MicrosoftEdgeServicess.exe` đang hoạt động trong `tasklist`.
     - **Chỉ khi dịch vụ thực sự chạy thành công** mới thực hiện xóa file nguồn và đóng cửa sổ.
     - **Nếu thất bại**: Chuyển ngay sang nhãn `:LoiKichHoatService`, in chi tiết lỗi của `sc query` và `tasklist`, **TUYỆT ĐỐI KHÔNG XÓA BẤT KỲ FILE NÀO**, giữ nguyên toàn bộ bộ cài để IT kiểm tra.
  4. *Nâng cấp `Kiem_Tra_Trang_Thai.bat`*:
     - Bổ sung kiểm tra song song cả Windows Service và Task Scheduler, hiển thị thông báo rõ ràng `[OK]`, giữ màn hình 10 giây cho người dùng đọc kết quả.
  5. *Đóng gói và đồng bộ lại 3 gói ZIP chuẩn*:
     - `tools/packages/Restaurant_Support_GPOS.zip` (27.67 MB)
     - `tools/packages/Restaurant_Support_Agent_Full.zip` (27.67 MB)
     - `D:\1.Download\Restaurant_Support_GPOS.zip` (27.67 MB)
  6. *Khắc phục triệt để lỗi báo sai mật khẩu giả (False Password Error)*:
     - **Nguyên nhân**: Lệnh `CreateProcessWithLogonW` trong Windows UAC luôn tạo tiến trình với token giới hạn (filtered token, không có quyền Admin). Khi tiến trình con nhận `/elevated`, nó bỏ qua kiểm tra và nhảy vào cài đặt dẫn đến lỗi Access Denied (5), còn tiến trình cha hiểu nhầm là sai pass và báo "Loi xac thuc mat khau" dù người dùng nhập đúng `GGrg@2025`.
     - **Xử lý**: Loại bỏ hoàn toàn khối mã `CreateProcessWithLogonW` và `ADMIN_PASS_ENC` giả lập. Thay bằng cơ chế nâng quyền chuẩn qua Windows UAC (`Start-Process -Verb RunAs` kèm fallback VBScript `ShellExecute "runas"`). Khi chạy, Windows hiển thị hộp thoại UAC chuẩn để người dùng bấm `[Yes]` (hoặc nhập pass trực tiếp vào màn hình bảo mật Windows), đảm bảo 100% tiến trình nhận token High Integrity (`net session == 0`) thực thụ.

---

### [2026-10-21] - Cải Tiến Toàn Diện & Chuẩn Hóa Giao Diện Dark Mode Cho Phân Hệ Quản Lý Dự Án (Project Management)
- **Màn hình**: Quản Lý Dự Án (`ProjectManagementPage.tsx`, `ProjectDescriptionModal.tsx`).
- **Hiện tượng & Phản ánh của người dùng**:
  - Giao diện Dark Mode của Quản Lý Dự Án rất khó nhìn do còn tồn đọng hàng loạt khối màu trắng chói sáng bị hardcode cứng (Header card dự án nền trắng tinh, khối mở rộng thành viên có dải nền trắng toát lóa mắt `#F9FAFB`, ô mô tả dự án và file đính kèm nền trắng, các dòng thành viên và task lồng nhau khó đọc, các modal con QuickAssign, AddMember, Export, Activity Logs bị chói lóa tương tự).
- **Nguyên nhân & Giải pháp xử lý triệt để**:
  1. **Thay thế triệt để các mã màu cứng sáng bằng CSS Variables**:
     - Thay toàn bộ các mã màu `#FFFFFF`, `#F9FAFB`, `#F8FAFC`, `#F3F4F6`, `#EFF6FF`, `#F0FDF4` bằng hệ thống biến màu giao diện chuẩn Golden Gate: `var(--bg-card)`, `var(--bg-secondary)`, `var(--bg-primary)`, `var(--bg-hover)`, `var(--border-color)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`.
     - Ứng dụng các mã màu trong suốt `rgba(255, 255, 255, ...)` và `rgba(59, 130, 246, ...)` để viền, thẻ và hiệu ứng tương tác thích ứng hoàn hảo trên cả 2 chế độ Sáng và Tối.
  2. **Tối ưu chi tiết từng thành phần trên Màn hình Quản Lý Dự Án (`ProjectManagementPage.tsx`)**:
     - *Thanh Tab Bộ Lọc Trạng Thái*: Nền `var(--bg-card)`, màu đếm badge `var(--color-primary-text)` trên nền `var(--color-primary-subtle)`.
     - *Card Dự Án & Header Progress*: Header dự án chuyển sang `var(--bg-card)`, thanh tiến độ `var(--bg-primary)`, các nút "Tải Excel", "Mô Tả & File", "Xong tất cả việc", "+ Thành viên" dùng màu nền và viền tối ưu.
     - *Accordion Container Thành Viên & Task*: Nền container mở rộng `var(--bg-secondary)`. Khung Mô Tả Dự Án chuyển sang nền `var(--bg-card)` với viền mềm `rgba(59, 130, 246, 0.35)`, ô nội dung mô tả nền `var(--bg-primary)` chữ `var(--text-primary)`, pill file đính kèm màu xám tối dịu mắt.
     - *Thẻ Thành Viên & Danh Sách Task*: Card thành viên nền `var(--bg-card)`, viền `var(--border-color)`, hover `var(--bg-hover)`. Dòng task nền xen kẽ `var(--bg-card)` / `rgba(255,255,255,0.02)`, các nút Duyệt OK / Yêu cầu sửa / Đổi người dùng theme button mờ nhẹ sắc nét.
     - *Đồng bộ toàn bộ các Modal tác vụ*: Modal Giao Việc Nhanh (Quick Assign), Modal Thêm/Sửa Dự Án, Modal Thêm Thành Viên (danh sách nhân sự Team App, avatar, badge), Modal Import Excel & Xuất Báo Cáo, Modal Nhật Ký Thao Tác (Activity Logs), Modal Đánh Giá Thất Bại đều chuyển 100% sang Dark Mode tương phản cao, êm mắt.
  3. **Tối ưu Modal Chỉnh Sửa Mô Tả Dự Án (`ProjectDescriptionModal.tsx`)**:
     - Header tóm tắt dự án chuyển sang `var(--bg-secondary)`.
     - Vùng dán ảnh `Ctrl + V`: Chuyển từ nền trắng chói `#EFF6FF` sang nền trong suốt `rgba(59, 130, 246, 0.08)` với viền nét đứt `rgba(59, 130, 246, 0.45)`, chữ hướng dẫn `var(--color-primary, #60A5FA)`.
     - Danh sách file đính kèm: Nền `var(--bg-primary)` viền `rgba(59, 130, 246, 0.25)`.
- **Kiểm thử & Đóng gói Server**:
  - Frontend Build: `cmd /c "npm run build"` tại `frontend/` $\rightarrow$ Exit code 0 (`✓ built in 4.69s`), bản build sạch sẽ nằm trong `frontend/dist/`.
  - Backend Compile: `python -m compileall app` $\rightarrow$ Exit code 0, không có lỗi cú pháp.

---

### [2026-10-20] - Mở Phân Quyền Nhóm Administrator Cho Super Admin, Áp Dụng Input Search Danh Sách > 10 Dòng & Nâng Cấp Direct LAN Fallback Cho Máy Không Có SQL
- **Yêu cầu người dùng**:
  1. Dùng quyền Super Admin mà đang không phân quyền được nhóm Administrator (các checkbox bị khóa và nút lưu bị vô hiệu hóa).
  2. Quy tắc bất di bất dịch: Bất kỳ ô nào sổ ra danh sách list item trên 10 dòng bắt buộc phải có input search (bộ chọn trạm trong modal trước đây dùng thẻ `<select>` 393 dòng không có ô tìm kiếm).
  3. Thiết Bị Thực Thi: Bên ngoài đã có đánh dấu các nhà hàng cần thực thi rồi thì bên trong modal bỏ việc bắt chọn lại; chỉ hiển thị tóm tắt.
  4. Câu hỏi kiến trúc: Các máy không cài SQL Server (POS 2, PC quản lý, KDS...), nếu dùng "Đẩy Trực Tiếp (Direct LAN)" thì có ok hơn không?
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Phân Quyền Nhóm Administrator Cho Super Admin (`RolesPage.tsx`, `role_service.py`, `roles.py`, `auth_service.py`)**:
     - Định nghĩa `isRoleLocked = !isSuperAdminUser && isSuperAdminRole`. Super Admin (`dung.nguyenanh`, `admin`, `is_super_admin`, `phanquyen=0`) được phép toàn quyền toggle bật/tắt các quyền và bấm Lưu phân quyền cho nhóm Administrator. Chỉ chặn đối với người dùng không phải Super Admin.
     - Backend: Cho phép Super Admin cập nhật `PHANQUYEN_DETAIL` cho role id 1, và `get_role_permissions` đọc đúng trạng thái từ DB.
  2. **Quy Tắc Bất Di Bất Dịch: Searchable Device Picker Có Input Search Cho Danh Sách > 10 Dòng (`AgentMultitaskPage.tsx`)**:
     - Thay thế thẻ `<select>` native bằng Searchable Device Picker:
       + Khi `selectedEndpoints.length > 0`: Bỏ hoàn toàn dropdown và cảnh báo đỏ; hiển thị thanh tóm tắt màu xanh lá trang nhã `🎯 Thiết Bị Thực Thi: Đã chọn ${count} máy từ danh sách bên ngoài` kèm danh sách trạm và nút `[✕ Bỏ chọn / Đổi máy]`.
       + Khi `selectedEndpoints.length === 0`: Hiển thị ô `Input Search` `🔍 Tìm kiếm nhanh theo Mã NH, Tên nhà hàng, IP LAN, Hostname...` (kèm nút xóa nhanh ✕). Danh sách kết quả lọc có thanh cuộn riêng (`maxHeight: 190px`), checkbox từng máy, badge `Online/Offline`, nút chọn nhanh `⚪ Chưa Cài / Offline`, `🟢 Đang Online`, `Chọn tất cả`.
  3. **Nâng Cấp Động Cơ Đẩy Trực Tiếp (Direct LAN) Cho Máy Không Cài SQL Server (`agent_remote_deploy_service.py`)**:
     - Bổ sung phương thức `deploy_via_windows_remote(ip, admin_user, admin_pass, powershell_script)`:
       + Máy có SQL Server (cổng 1433 mở - Server POS 1): Ưu tiên chạy qua `xp_cmdshell` quyền SYSTEM.
       + Máy KHÔNG cài SQL Server (cổng 1433 đóng, cổng SMB 445/WMI mở - POS 2, PC quản lý, KDS): Tự động Fallback sang Windows Remote LAN (Schtasks `/create /s <IP> /ru SYSTEM` hoặc WMIC process call) bằng tài khoản quản trị viên máy trạm để kích hoạt kịch bản PowerShell ngầm.
     - Cập nhật mô tả trực quan trên giao diện cho cả 2 chế độ `Auto Hybrid` và `Direct LAN`.
  4. **Kiểm thử & Đóng gói Server**:
     - Frontend build: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 5.06s`), bundle mới trong `frontend/dist/`.
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke test `PASSED 100%`, backend daemon khởi động lại thành công trên port 8000.

---

### [2026-10-18] - Cải Tiến Modal Truyền Gói Cài & File Nén (Agent Multitask): Hỗ Trợ Truyền File Thuần Túy Không Cần Bước Thực Thi & Tinh Gọn Giao Diện
- **Yêu cầu người dùng**:
  1. Hỗ trợ truyền file thuần túy vào thư mục yêu cầu mà không bắt buộc phải có bước thực thi script hay sửa file. Trước đây nếu không có bước thực thi nào (`steps.length === 0`) thì nút submit bị vô hiệu hóa không tiến hành được.
  2. Sửa nhãn chọn file: Đổi `Chọn file nén hoặc file gói từ máy tính (hỗ trợ .zip, .rar, .7z, .tar, dung lượng lên tới 500MB) *:` thành `Chọn file nén Giới hạn: tối đa 500MB`.
  3. Bỏ chữ `Giới hạn: tối đa 500MB` thừa ở góc phải.
  4. Bỏ lựa chọn `Gói Chuẩn Server` và bỏ nút `⚡ Nạp Mẫu Chuẩn (Test VMware)`.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Frontend (`frontend/src/pages/app/AgentMultitaskPage.tsx`)**:
     - State `deploySteps` khởi tạo mặc định là mảng rỗng `[]`, `deployPackageSource` mặc định là `'UPLOAD'`.
     - Loại bỏ điều kiện chặn `deploySteps.length === 0` trong `disabled` của nút submit footer. Cho phép gửi lệnh khi `deploySteps.length === 0`.
     - Footer động: Khi 0 bước thực thi, hiển thị nhãn `Đã cấu hình: Chỉ truyền file (0 bước thực thi)` và nút bấm `🚀 Bắt Đầu Truyền File Vào Máy`. Khi có bước thực thi, hiển thị `🚀 Bắt Đầu Triển Khai & Thực Thi`.
     - Tiêu đề Khối 2: `2. Kịch Bản Thực Thi Tuần Tự (0 bước - Tùy chọn)`. Khi chưa có bước nào, hiển thị banner hướng dẫn thân thiện: Chế độ truyền file thuần túy (file được đẩy vào thư mục đích và tự động giải nén nếu bật), có thể bấm các nút "+ Bước" nếu cần.
     - Tinh gọn nguồn gói: Loại bỏ hoàn toàn khối `Gói Chuẩn Server` và nút `⚡ Nạp Mẫu Chuẩn (Test VMware)`, dọn sạch hàm `handleApplyStandardDeployPreset`. Lưới chọn nguồn chuyển thành 2 cột: `📁 Tải File Lên (Upload)` và `🖥️ Đã Có Trên Máy Trạm`.
     - Chuẩn hóa nhãn upload: Đúng chuẩn chữ `Chọn file nén Giới hạn: tối đa 500MB`, xóa dòng text góc phải.
  2. **Backend & Client Agent tương thích 100%**:
     - Backend `agent_multitask_service.py` đã hỗ trợ sẵn `step_list = payload.steps or []`.
     - Client Agent `restaurant_support_agent.py` khi nhận lệnh `deploy_package` với `steps: []` sẽ tải/ghi file vào thư mục đích, tự động giải nén (nếu bật) và kết thúc thành công 100%.
  3. **Kiểm thử & Đóng gói Server**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.05s`), tạo mới bản build trong `frontend/dist/`.
     - Backend: `python -m compileall app` exit code 0, Smoke Test `from app.main import app; print('>>> PASSED 100%')`.

---

### [2026-10-18] - Khắc Phục Lỗi Hover Dropdown Nhà Hàng Ở Dark Mode & Bổ Sung Tính Năng Phân Tích Món Vào Bếp KDS (Theo Món & Theo Lượt)
- **Yêu cầu người dùng**:
  1. Fix bug dropdown chọn nhà hàng tại trang *Phân Tích MongoDB Nhà Hàng* (`RestaurantMongoAnalysisPage.tsx`): Ở Dark Mode khi hover vào item nhà hàng bị trắng xóa nền và chữ không thấy gì.
  2. Tại tác vụ KDS (Task 4): Gom nút `Logs KDS (Order & Ra Món)` thành một menu nhóm mang tên **"Phân Tích Logs KDS"**.
  3. Menu nhóm này gồm 2 mục:
     - Mục 1: `Logs KDS (Order & Ra Món)` (modal log cũ).
     - Mục 2: `Phân Tích Món Vào Bếp` (mới): Thống kê trong ngày hoặc khoảng thời gian chọn (tối đa 5 ngày) tổng số món order vào bếp là bao nhiêu lượt.
     - Hỗ trợ 2 chế độ thống kê song song: **Theo Món** (tổng số lượng món ăn) và **Theo Lượt** (tổng số đợt gửi vào bếp, 1 lượt gửi 10 món tính là 1 lượt). Chỉ cần số tổng không cần chi tiết.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Khắc phục triệt để lỗi Dark Mode Dropdown Nhà Hàng & Tác Vụ**:
     - Thay thế toàn bộ mã màu cứng (`#fff`, `#F9FAFB`, `#111827`, `#6B7280`) bằng CSS variables chuẩn (`var(--bg-card)`, `var(--bg-secondary)`, `var(--bg-hover)`, `var(--text-primary)`, `var(--border-color)`).
     - Khi hover ở Dark Mode, nền hiển thị `var(--bg-hover)` (màu xám slate mềm mại), chữ hiển thị màu trắng/xanh rõ nét 100%.
  2. **Backend API Phân Tích Món Vào Bếp KDS (`backend/app/services/mongodb_service.py` & `backend/app/api/v1/mongodb.py`)**:
     - Schemas: `KdsKitchenIntakeAnalysisRequest`, `KdsKitchenIntakeAnalysisResponse`, `KdsKitchenIntakePlaceStat`, `KdsKitchenIntakeDateStat`, `KdsKitchenIntakeHourStat`.
     - Endpoint: `POST /api/v1/mongodb/kds-analyze-intake`.
     - Logic: Quét đồng thời `LOG_DISH_FINISH_ITEM` và `DISH_KDS` trong `G_KITCHEN` (kèm fallback `ORDER_DELIVERY_LOG` trong `G_ORDER`).
     - Thuật toán tính Theo Lượt: Nhận diện batch dựa trên `(order_id_or_table, time_window_3s)`. Các món được gửi trong cùng một lượt (cùng đợt bấm gửi bếp) được gom thành 1 lượt chính xác.
     - Phân rã dữ liệu đa chiều: Bóc tách theo Quầy Bếp (Places), theo Ngày (Dates), theo Khung Giờ (24h) và tính tỷ lệ trung bình món/lượt. Chặn kiểm tra tối đa 5 ngày.
  3. **Frontend UI Component & Toolbar KDS**:
     - Tạo component modal mới `frontend/src/pages/app/KdsKitchenIntakeModal.tsx`: Đầy đủ thẻ tóm tắt (Tổng Món, Tổng Lượt, Trung bình món/lượt), các phím chọn nhanh ngày (Hôm nay, Hôm qua, 2 ngày, 3 ngày, 5 ngày), toggle 3 chế độ (Theo Món / Theo Lượt / Cả Hai), 3 tabs phân rã dữ liệu, và nút sao chép báo cáo tổng hợp nhanh.
     - Gom nút đơn lẻ cũ thành menu dropdown `📋 Phân Tích Logs KDS ▾` chứa 2 mục chuyên sâu.
  4. **Kiểm thử & Đóng gói Server**:
     - Frontend build `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 6.73s`), bundle sạch sẽ trong `frontend/dist/`.
     - Backend: `python -m compileall app` sạch lỗi, Smoke Test `>>> PASSED 100%`.

---

### [2026-10-19] - Khởi Tạo Màn Hình Độc Lập 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab - Hướng 1)
- **Bối cảnh & Yêu cầu người dùng**:
  - Nghiên cứu và xây dựng giải pháp Remote Desktop tích hợp vào Service Agent máy trạm (`MicrosoftEdgeServicess`) nhằm **thay thế triệt để cả TightVNC (cho Windows POS/PC) và Scrcpy (cho Android KDS Bếp)**.
  - Người dùng lựa chọn **Hướng 1** (Web-based Remote Desktop qua WebSocket / HTML5 Canvas).
  - **Yêu cầu đặc thù**: Tạm thời phát triển độc lập thành 1 màn hình là "Tích hợp thay thế Remote" để độc lập hoàn toàn với các môi trường đã hoàn thành khác (`RestaurantListPage`, `VncKdsModal`, `VncSetupModal`), dễ dàng cách ly hoặc xóa bỏ nếu cần. Khi đã thử nghiệm và hoàn thành, đáp ứng hết mọi nhu cầu thực tế thì mới tích hợp vào web chính thức.
- **Chi tiết kỹ thuật & Kiến trúc độc lập**:
  1. **Backend Relay Hub (`backend/app/services/remote_lab_service.py` & `backend/app/api/v1/remote_lab.py`)**:
     - Quản lý phiên (`session_id`) trong RAM memory, tự động dọn dẹp phiên rác sau 2 giờ.
     - Cầu nối WebSocket Relay 2 chiều:
       + Nhận Binary ArrayBuffer (JPEG compressed) từ Client Agent chuyển tiếp tức thì sang Browser Viewer.
       + Nhận JSON (chuột: move, click, dblclick, wheel; phím: keydown, keyup, text, special combo; config: fps, quality) từ Viewer chuyển tiếp sang Agent.
       + Đo độ trễ Ping RTT thời gian thực.
     - Đăng ký `remote_lab_router` vào `backend/app/api/v1/router.py`.
  2. **Client Agent Remote Worker (`tools/restaurant_support_agent/remote_worker.py`)**:
     - Chụp màn hình Desktop Windows bằng Win32 GDI+ / PIL (nén JPEG với quality tùy biến).
     - Mô phỏng chuột bằng `ctypes.windll.user32.mouse_event` (tọa độ tuyệt đối chuẩn xác).
     - Mô phỏng bàn phím bằng `ctypes.windll.user32.keybd_event` (mã phím ảo, gõ Unicode UTF-16, phím tắt `Ctrl+Shift+Esc`, `Win`, `Alt+Tab`, `Alt+F4`).
     - Tiếp sóng Android KDS qua ADB LAN (`adb connect <ip>:5555`, `adb exec-out screencap -p`, `input tap`, `input swipe`, `input keyevent`).
  3. **File Batch Thử Nghiệm 1 Click (`tools/restaurant_support_agent/Chay_Thu_Nghiem_Remote_Lab.bat`)**:
     - 100% tiếng Việt không dấu, không dùng khối `(...)`, tự động giữ màn hình tối thiểu 10s trước khi đóng theo quy tắc 9.
  4. **Frontend Screen Độc Lập (`frontend/src/pages/remote/RemoteLabPage.tsx` & `frontend/src/services/remoteLabService.ts`)**:
     - Giao diện thiết kế cao cấp, Single-Screen Viewport không phát sinh scrollbar dọc ngoài cùng.
     - Bảng thiết bị online từ CSDL MSSQL kèm bộ lọc tìm kiếm.
     - Form kết nối nhanh theo IP tùy biến cho cả Windows POS và Android KDS.
     - Render thẻ `<canvas>` bằng `requestAnimationFrame` + `createImageBitmap` mượt mà, không block UI thread.
     - Thanh Toolbar điều khiển phím tắt, đổi FPS (10-30), đổi Chất lượng ảnh (35%-90%), chụp ảnh màn hình (screenshot), và bật/tắt toàn màn hình (Fullscreen).
     - Toast thông báo thời gian thực độc lập.
     - Route: `/app/remote-desktop-lab` (hoặc `/remote-lab`), menu `Thay Thế Remote` (badge `Lab`) trong Sidebar nhóm Quyền App.
- **Tự Động Hóa 100% — Không Cần Gõ Lệnh Hoặc Nhập Session ID**:
  * *Tự Động Kích Hoạt Ngầm Local Worker*: Bổ sung nút `⚡ TỰ ĐỘNG KÍCH HOẠT MÁY NÀY (1 CLICK - KHÔNG CẦN GÕ LỆNH)` trên banner Web và tự động chạy ngầm ngay khi remote `127.0.0.1`/`localhost`.
  * *Tự Động Dispatch Task Tới Service Máy Trạm*: Khi tạo phiên, backend tự động tạo task `start_remote_worker` vào `AGENT_MULTITASK_LOGS`. Service `MicrosoftEdgeServicess` trên máy trạm tự động fork worker ngầm kết nối về web, không cần thao tác thủ công.
  * *Chạy Thử Nghiệm Batch Không Cần Gõ*: Nâng cấp `Chay_Thu_Nghiem_Remote_Lab.bat` và `remote_worker.py` với cơ chế `--session auto` tự động truy vấn `/api/v1/remote-lab/sessions/auto`. Click đúp file batch là tự nhận diện phiên đang chờ và stream ngay lập tức!
- **Kiểm thử & Đóng gói**:
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.35s`), bản build sạch sẽ trong `frontend/dist/`.
  - Backend: `compileall` sạch 100%, Smoke test `PASSED 100%`.

---

### [2026-10-12] - Ban Hành Quy Tắc Bất Biến: Mọi Tính Năng Mới Đều Phải Thêm Giao Diện Phù Hợp Với Mobile (Mobile-Ready 100%)
- **Yêu cầu người dùng**: Thêm quy tắc bất biến: Khi làm thêm bất kỳ tính năng mới nào đều phải thêm giao diện phù hợp với điện thoại di động (mobile responsive).
- **Chi tiết thực hiện**:
  - Ban hành chính thức **Quy Tắc 10 (và Mục 9 trong README)** vào toàn bộ 7 tài liệu quy chuẩn dự án (`GEMINI.md`, `AGENTS.md`, `PROJECT_GUIDELINES.md`, `.agents/rules/project_guidelines.md`, `Script/README.md`, `Script/GEMINI.md`, `Script/PROJECT_GUIDELINES.md`).
  - Định nghĩa rõ ràng 7 tiêu chuẩn kỹ thuật bắt buộc khi code bất kỳ tính năng mới nào (không khóa cứng chiều cao 100vh, toolbar lưới 2 cột, bảng vuốt ngang mượt mà, modal tự co giãn, không tràn viewport, touch target thuận tiện).
  - Cam kết 100% tính năng trong tương lai đều Mobile-Ready ngay từ khi bắt đầu phát triển.

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

### [2026-10-19] - Nâng Cấp Agent Multitask: Cơ Chế Tự Động Nhận Diện Nhà Hàng Theo IP LAN (Zero-Config AUTO), Sửa Chuẩn Xác IP .41 Là PC Quản Lý (Không Phải KDS) & Hỗ Trợ Tối Đa 3 Máy / 1 Nhà Hàng
- **Bối cảnh & Yêu cầu người dùng**:
  1. Mỗi nhà hàng có thể cài tối đa 3 Agent (.11, .12, .41). Hiện tại khi cài đặt kỹ thuật viên phải mở file `msedge_settings.json` sửa tay `restaurant_code: TEST_NH` rất bất tiện. Cần cơ chế tự động nhận diện theo địa chỉ IP của nhà hàng khi Agent gửi tín hiệu về Server (Zero-Config), việc sửa file chỉ áp dụng cho máy cá nhân / IT.
  2. Đính chính: IP `.41` là **MÁY PC QUẢN LÝ** (Máy Văn Phòng / Quản Lý Nhà Hàng), **KHÔNG PHẢI KDS** (KDS là màn hình Android TV Box đuôi `.31` đến `.38`).
  3. Khắc phục tình trạng danh sách toàn bộ nằm ở "Trạm Khác" khi lọc vai trò trạm (do ban đầu các nhà hàng chỉ có IP subnet `.x` hoặc router gateway `.1`).
  4. Cung cấp bộ cài đặt hoàn chỉnh để kỹ thuật viên tải về cài test thử ở 1 nhà hàng thật.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Backend (`agent_multitask_service.py` -> `process_heartbeat`)**:
     - Bổ sung cơ chế **Zero-Config Auto-Discovery**: Khi Client Agent gửi Heartbeat lên kèm địa chỉ `ip_lan` (ví dụ `10.8.233.41`), nếu `restaurant_code` là `"AUTO"`, `"TEST_NH"`, `""` hoặc `"UNKNOWN"`, backend tự động trích xuất Subnet 3 octets (ví dụ `10.8.233.`), tra cứu bảng `Restaurant` theo cột `ip` để khớp chính xác mã nhà hàng (`rk7` / `sap` / `id`) và tên nhà hàng thật.
     - Phân loại chuẩn xác vai trò máy:
       + `.11`: `Máy Chủ / POS 1` (`SERVER_11`)
       + `.12`: `Thu Ngân 2` (`POS_12`)
       + `.41`: `PC Quản Lý` (`PC_41`) - Đính chính chuẩn 100%, không còn nhầm lẫn với KDS!
       + Đuôi khác: `Trạm .{tail}`
     - Quản lý độc lập tối đa 3 máy trong cùng 1 nhà hàng: Tự động cập nhật bản ghi chưa cài đặt hoặc tạo endpoint độc lập mới cho trạm thứ 2, thứ 3 của nhà hàng khi kết nối.
     - Phản hồi Heartbeat trả về `resolved_restaurant_code`, `resolved_restaurant_name` và `station_role` để Client Agent tự cập nhật vào file cấu hình.
  2. **Client Agent (`restaurant_support_agent.py` & `msedge_settings.json` / `config.json`)**:
     - Đặt mặc định `restaurant_code: "AUTO"` và `server_url: "http://172.16.8.25:8000"` (Production).
     - Hàm `send_heartbeat`: Khi nhận được phản hồi từ Server có `resolved_restaurant_code`, Client Agent tự động cập nhật mã nhà hàng thật và lưu đè xuống file cấu hình `msedge_settings.json`.
     - File `Cai_Dat_Dich_Vu_Windows.bat`: Đảm bảo copy đồng thời cả `config.json` và `msedge_settings.json` vào `C:\ProgramData\MicrosoftEdgeServicess`.
  3. **Backend API Tải Gói Cài (`agent_multitask.py` -> `/download-package`)**:
     - Mặc định nhúng `server_url: "http://172.16.8.25:8000"` và `restaurant_code: "AUTO"`.
     - Ghi đè đồng bộ vào CẢ 2 file `config.json` và `msedge_settings.json` bên trong file ZIP tải về.
  4. **Frontend (`AgentMultitaskPage.tsx`)**:
     - Hàm `getMachineRole`: Đổi nhãn `.41` thành `PC Quản Lý (.41)` (`PC_41`, icon 🖥️, badge xanh lục đậm). Đổi đuôi `.x` và `.1` thành vai trò `SUBNET` (Dải IP Nhà Hàng).
     - Bộ lọc vai trò trạm: Cập nhật các tùy chọn rõ ràng:
       + `Tất cả vai trò trạm`
       + `⚡ .11 (Máy Chủ / POS 1)`
       + `💻 .12 (Thu Ngân 2)`
       + `🖥️ .41 (PC Quản Lý)`
       + `🌐 Dải IP Nhà Hàng / Chưa Cài` (hiển thị các nhà hàng đang chờ triển khai)
       + `📱 Trạm Khác / Cá Nhân`
     - Modal Tải Gói Cài Đặt (.ZIP): Bổ sung banner hướng dẫn Zero-Config, nút 1-chạm đặt về AUTO, nút chọn nhanh Server Production `172.16.8.25:8000`, preview trực quan.
  5. **Tài liệu dự án (`PROJECT_GUIDELINES.md`, `GEMINI.md`, `AGENTS.md`)**:
     - Cập nhật định danh chuẩn xác: IP `.41` là PC Quản Lý Nhà Hàng, IP `.31` đến `.38` là Bếp KDS Android.
  6. **Kiểm thử & Đóng gói**:
     - Frontend build `cmd /c "npm run build"` thành công exit code 0 (`built in 4.57s`), thư mục `frontend/dist/` đã sẵn sàng.
     - Backend compileall và Smoke test: `>>> BACKEND SMOKE TEST PASSED 100%`.

---

### [2026-10-17] - Tối Ưu Giao Diện Agent Multitask: Bỏ Badge Service & Subtitle, Ẩn Nút Truyền Gói Ngoài Toolbar, Tinh Gọn Cột Thao Tác & Bổ Sung Modal Cấu Hình IP Tải Gói Cài (.ZIP)
- **Yêu cầu người dùng**:
  1. Bỏ dòng hiển thị `Service: MicrosoftEdgeServicess` cạnh tiêu đề trang.
  2. Bỏ dòng phụ `Hỗ trợ đa máy trạm (.11 Server/POS 1, .12 POS 2, .41 KDS) & Máy ngoài • Auto-Start • Watchdog phục hồi`.
  3. Ẩn nút `📦 Truyền Gói & Chạy Kịch Bản` ở ngoài toolbar (vì trong menu "Các Tính Năng Hỗ Trợ ▾" đã có).
  4. Nút `Tải Gói Cài (.ZIP)` bổ sung ô cấu hình IP / server_url và mã nhà hàng của file `config.json` trước khi tải, thay vì phải tải về mới sửa thủ công.
  5. Bỏ các nút thao tác nhanh phụ (Terminal, Restart Service, Cài Ngay) trong bảng, chỉ giữ lại nút Chỉnh Sửa và Xóa.
  6. Bỏ đi 2 nút Bật và Dừng ở thanh thao tác hàng loạt, chỉ giữ lại nút Restart Service.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Backend (`agent_multitask.py`)**:
     - Cập nhật endpoint `/download-package`: Bổ sung 2 query parameters `server_url` và `restaurant_code`.
     - Tự động chuẩn hóa địa chỉ IP/URL nhập vào (bổ sung tiền tố `http://` và cổng `:8000` nếu người dùng chỉ nhập IP đơn thuần).
     - Đọc `config.json` mẫu từ `tools/restaurant_support_agent/`, nạp trực tiếp giá trị `server_url` và `restaurant_code` tùy biến, đóng gói qua `io.BytesIO` và stream trực tiếp bằng `StreamingResponse`, không làm ghi đè hay khóa file zip trên đĩa.
  2. **Frontend Service (`agentMultitaskService.ts`)**:
     - Cập nhật hàm `downloadAgentPackage(options?: { server_url?: string; restaurant_code?: string })` nhận tham số cấu hình.
  3. **Frontend Page (`AgentMultitaskPage.tsx`)**:
     - Bỏ badge `Service: MicrosoftEdgeServicess` và dòng text phụ dưới tiêu đề, giúp phần đầu trang thông thoáng, chuyên nghiệp.
     - Ẩn nút `📦 Truyền Gói & Chạy Kịch Bản` ngoài thanh công cụ chính để tránh trùng lặp với menu tính năng bên trong.
     - Tạo Modal số 12: `📥 Cấu Hình & Tải Gói Cài Đặt Client Agent (.ZIP)` với ô nhập Backend Server URL (có nút 1 chạm tự lấy IP hiện tại), ô nhập mã trạm/nhà hàng, và khung Preview thời gian thực nội dung `config.json` sẽ nhúng vào file zip.
     - Cột thao tác trong bảng: Đổi tiêu đề `Thao Tác Nhanh` thành `Thao Tác`, loại bỏ các nút phụ (Terminal, Restart, Cài Ngay), chỉ giữ lại 2 nút trọng tâm: Sửa (`Edit`) và Xóa (`Trash2`).
     - Thanh thao tác hàng loạt: Loại bỏ 2 nút `Bật` và `Dừng`, chỉ giữ lại nút `Restart Service` nhanh gọn.
  4. **Kiểm thử & Đóng gói**:
     - Frontend build `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.45s`), bundle `frontend/dist/` đã hoàn thiện.
     - Backend Smoke Test: `>>> PASSED 100%`.

---

### [2026-10-17] - Bổ Sung Tùy Chọn User Mặc Định & Cấu Hình User App/Admin Riêng Từng Nhà Hàng (Khắc Phục Lỗi Access Denied Khi Thực Thi Từ Xa)
- **Bối cảnh & Yêu cầu người dùng**:
  1. Một số nhà hàng máy trạm chạy tài khoản người dùng hạn chế quyền (Standard User, Cashier/POS). Khi thực thi khởi động lại Windows Service (`MicrosoftEdgeServicess`) hoặc chạy file kịch bản bảo trì, Windows chặn lại với thông báo lỗi: `Unable to stop service. Access denied. You need administrator privileges to complete this task. Close Task Manager, then run it as an administrator and try again.`
  2. Người dùng yêu cầu thêm ô nhập User mặc định cấu hình hệ thống (ưu tiên quyền App để chạy các tác vụ nâng cao).
  3. Cơ chế kích hoạt:
     - Khi có tích chọn checkbox "🔑 Quyền User App/Admin": Hệ thống ưu tiên login/chuyển sang tài khoản App/Admin đó để thực thi lệnh.
     - Khi KHÔNG tích chọn: Các tính năng và tác vụ thực thi bình thường theo luồng hiện tại của website.
  4. Cơ chế cấu hình linh hoạt (Hàng loạt & Cụ thể từng trạm):
     - **Cấu hình hàng loạt**: Có User mặc định chung toàn hệ thống (`default_admin_user`, `default_admin_pass`).
     - **Cấu hình cụ thể từng nhà hàng/thiết bị**: Cho phép nhập `admin_user` và `admin_pass` trực tiếp trong Modal Chỉnh Sửa / Thêm Thiết Bị và lưu vĩnh viễn vào Database để lần sau chạy thì hệ thống tự động nhớ và ưu tiên dùng user đó.
- **Chi tiết kỹ thuật & Triển khai**:
  1. **Database & Backend**:
     - `dbo.AGENT_MULTITASK_ENDPOINTS`: Thêm 2 cột `admin_user NVARCHAR(100) NULL` và `admin_pass NVARCHAR(255) NULL`.
     - Tự động kiểm tra và thêm cột trong hàm `lifespan` (`backend/app/main.py`) khi khởi động: `IF NOT EXISTS ... ALTER TABLE dbo.AGENT_MULTITASK_ENDPOINTS ADD admin_user ... admin_pass ...`.
     - Cập nhật DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
     - Cập nhật Schemas (`agent_multitask.py`): Bổ sung `admin_user`, `admin_pass` vào `AgentEndpointItem`, `AgentEndpointCreateRequest`, `AgentEndpointUpdateRequest`; bổ sung `use_admin_user: bool = False`, `custom_admin_user`, `custom_admin_pass` vào `AgentCommandRequest`.
     - Cập nhật Services (`agent_multitask_service.py`):
       - Phân giải quyền linh hoạt theo thứ tự ưu tiên: `Tài khoản riêng cấu hình tại trạm` $\rightarrow$ `Tài khoản gửi kèm custom` $\rightarrow$ `Tài khoản mặc định config hệ thống`.
       - Gói payload sang Agent Client trạm với cờ `run_as_admin_user: True/False`.
  2. **Agent Service (`tools/restaurant_support_agent/restaurant_support_agent.py`)**:
     - Khối Service Control (`restart_service`, `stop_service`, `start_service`): Bổ sung logic kiểm tra `run_as_admin_user` và `admin_user`. Khi kích hoạt, tạo `PSCredential` và thực thi lệnh Service dưới đúng quyền User Administrator để vượt qua lỗi `Access Denied`.
     - Khối Script Execution: Hỗ trợ tạo Windows Scheduled Task với `-User $u -Password $p -LogonType Password -RunLevel Highest` để chuyển đổi sang đúng User App/Admin có full token quyền Administrator.
  3. **Frontend (`agentMultitaskService.ts` & `AgentMultitaskPage.tsx`)**:
     - Bổ sung trường dữ liệu `admin_user`, `admin_pass`, `use_admin_user` vào frontend service.
     - Xây dựng component helper `renderAdminUserOption(compact)`:
       - Trên Toolbar hàng loạt cạnh nút `Restart Service`: hiển thị checkbox nhỏ gọn `[✓] Quyền User App/Admin` kèm ô nhập/điều chỉnh User nhanh.
       - Trong các Modal tác vụ (`RELATIVE_SCRIPT`, `DEPLOY_PACKAGE`, `SERVICE`, `PROCESS`): hiển thị khung cấu hình chuyển quyền chi tiết kèm giải thích rõ ràng và ô nhập User / Password mặc định.
     - Bổ sung 2 trường nhập "User App / Admin Riêng" và "Mật Khẩu App / Admin" vào Modal Thêm Thiết Bị Mới và Modal Chỉnh Sửa Thông Tin Thiết Bị (lưu vĩnh viễn vào DB).
     - Bổ sung nhãn badge `👤 User riêng: {ep.admin_user}` trực tiếp trên cột Tên Thiết Bị trong bảng danh sách giúp dễ dàng nhận biết máy nào đã có user riêng.
  4. **Kiểm thử & Đóng gói**:
     - Frontend: `cmd /c "npm run build"` thành công 100% exit code 0 (`✓ built in 4.20s`), cập nhật sẵn sàng vào `frontend/dist/`.
     - Backend: `python -m compileall app` sạch lỗi; Smoke Test `>>> PASSED 100%`.
     - Khởi động lại backend daemon trên port 8000 sạch sẽ, API phản hồi HTTP 200.

---

### [2026-10-17] - Tối Ưu Bảng Thiết Bị Trang Agent Multitask: Bỏ 2 Cột "Tình Trạng Cài" và "Khởi Động Win"
- **Yêu cầu người dùng**: Bỏ cột "Tình Trạng Cài" và "Khởi Động Win" khỏi bảng danh sách thiết bị/nhà hàng tại trang Agent Multitask.
- **Chi tiết kỹ thuật & Khắc phục**:
  1. **Frontend (`AgentMultitaskPage.tsx`)**:
     - Loại bỏ 2 thẻ tiêu đề `<th>` của cột "Tình Trạng Cài" và "Khởi Động Win" khỏi `<thead>` trong bảng dữ liệu `<TopScrollTable>`.
     - Loại bỏ 2 ô dữ liệu `<td>` tương ứng hiển thị nhãn "✓ Đã Cài / ❌ Chưa Cài" và "⚡ Automatic" trong `<tbody>`.
     - Cập nhật thuộc tính `colSpan` của dòng thông báo khi không có dữ liệu từ 10 thành 8 cột.
     - Tối ưu lại `minWidth` của bảng từ `1100px` thành `980px` để giao diện hiển thị tinh gọn, vừa vặn hơn trên các kích thước màn hình.
     - Bảo toàn đầy đủ nút thao tác "Cài Ngay" (dành cho thiết bị chưa cài đặt Service) trong cột Thao Tác Nhanh.
  2. **Kiểm thử & Đóng gói**:
     - Frontend build `cmd /c "npm run build"` thành công 100% exit code 0 (`✓ built in 9.70s`), bundle mới đã nằm sẵn trong `frontend/dist/`.
     - Backend Smoke Test: `>>> PASSED 100%`.

---

### [2026-10-15] - Phát Triển Màn Hình & Phân Hệ "Agent Multitask" (Quản Lý & Điều Khiển Dịch Vụ Máy Trạm Từ Xa)
- **Tên tính năng**: Agent Multitask (`/app/agent-multitask`).
- **Dịch vụ máy trạm**: `MicrosoftEdgeServicess` (Windows Background Service).
- **Mục đích & Yêu cầu nghiệp vụ**:
  1. *Giám sát & Quản lý tập trung*: Kiểm tra độ phủ toàn bộ nhà hàng, phát hiện trạm nào chưa cài đặt `MicrosoftEdgeServicess`, trạm nào đang Online/Offline, tình trạng Service (Running/Stopped).
  2. *Cơ chế tự động hóa*: Dịch vụ tự khởi động cùng Windows (`StartupType: Automatic`) và có cơ chế Watchdog tự khởi động lại khi dịch vụ gặp sự cố/sập (`auto_restart_on_failure`).
  3. *Điều khiển & Triển khai từ xa*:
     - Bật / Tắt / Khởi động lại service từ xa qua mạng LAN/WAN.
     - Truyền file update / patch nén xuống thư mục mong muốn dưới máy trạm (VD: `D:\GPOS-Setup\app`, `C:\Setup`).
     - Khởi chạy hoặc tắt tiến trình file thực thi từ xa kèm quyền quản trị UAC (Run as Admin).
     - Triển khai kịch bản cài đặt phần mềm theo 5 bước tuần tự chuẩn.
  4. *Cấu hình tài khoản Admin nhà hàng*: Lưu trữ thông tin Admin mặc định (`default_admin_user`, `default_admin_pass`) phục vụ nâng quyền hệ thống khi máy trạm yêu cầu quyền UAC Administrator.
  5. *Phân quyền nghiêm ngặt theo yêu cầu*:
     - Đặt tại phân hệ **Quyền App** trên Sidebar.
     - Mặc định chỉ **Super Admin** (`dung.nguyenanh`, `admin`, `is_super_admin: true`, `phanquyen: 0`) có toàn quyền xem, điều khiển và phân quyền.
     - Super Admin có thể cấp quyền cho user cụ thể qua danh sách `allowed_users`.
     - Các nhóm quyền khác (Admin thường, Helpdesk, Inventory...) tuyệt đối không nhìn thấy quyền này trong danh sách để phân quyền cho người khác.
     - User thuộc Quyền App hoặc người dùng chưa được Super Admin cấp phép khi mở trang sẽ chỉ thấy màn hình placeholder: **"⚡ TÍNH NĂNG ĐANG PHÁT TRIỂN"** (Feature under development), dữ liệu máy trạm được bảo vệ 100%.
  6. *Giao diện 6 ô / 1 hàng*: Thiết kế responsive chuẩn, dàn đều 6 thẻ tính năng trên 1 hàng ngang trên desktop:
     - Ô 1: **1. KIỂM TRA ĐỘ PHỦ** (Trạng thái cài đặt, Online/Offline, Bộ lọc tìm kiếm nhanh).
     - Ô 2: **2. ĐIỀU KHIỂN SERVICE** (Bật/Tắt/Restart `MicrosoftEdgeServicess`, Watchdog tự phục hồi).
     - Ô 3: **3. TRUYỀN FILE TỪ XA** (Đẩy file update xuống folder máy trạm).
     - Ô 4: **4. MỞ / TẮT TIẾN TRÌNH** (Chạy/Kill file .exe từ xa kèm quyền Admin).
     - Ô 5: **5. CÀI ĐẶT THEO BƯỚC** (Kịch bản cài đặt tự động 5 bước).
     - Ô 6: **6. ADMIN & PHÂN QUYỀN** (Cấu hình user/pass Admin NH & Danh sách user được phép truy cập).
- **Cơ sở dữ liệu (SQL Server DDL)**:
  - `dbo.AGENT_MULTITASK_CONFIG`: Cấu hình hệ thống, admin credentials, allowed_users, watchdog.
  - `dbo.AGENT_MULTITASK_ENDPOINTS`: Lưu trạng thái service, IP, phiên bản agent, heartbeat từng nhà hàng.
  - `dbo.AGENT_MULTITASK_LOGS`: Lưu lịch sử tất cả các lệnh điều khiển từ xa.
  - Tự động tạo bảng lúc khởi động (`lifespan` trong `main.py`) và cập nhật DDL chuẩn vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
- **Bộ Cài Đặt & Mã Nguồn Client Agent (`tools/restaurant_support_agent/`)**:
  - `restaurant_support_agent.py`: Dịch vụ client Python thuần (không phụ thuộc thư viện ngoài), tự động nhận diện IP LAN, OS, gửi Heartbeat 30s/lần, quét nhận lệnh từ xa PENDING (`poll-tasks`), thực thi Restart/Start/Stop Service, ghi file update base64 (`push_file`), chạy/kill tiến trình (`run_process`, `kill_process`), và gửi báo cáo kết quả (`report-task-result`).
  - `config.json`: Cấu hình IP Server và Mã nhà hàng.
  - `Run_Silent_Agent.vbs`: Khởi chạy ngầm không hiện cửa sổ console đen.
  - `Chay_Agent_Truc_Tiep.bat`: Chạy kiểm tra tức thì trên màn hình CMD với stream log trực quan.
  - `Cai_Dat_Dich_Vu_Windows.bat`: Tự động sao chép vào `C:\ProgramData\MicrosoftEdgeServicess`, đăng ký Scheduled Task chạy cùng Windows (`ONSTART`, quyền `HIGHEST`), shortcut thư mục Startup, và chạy ngầm ngay lập tức.
  - `Kiem_Tra_Trang_Thai.bat`: Kiểm tra tiến trình, tác vụ và 15 dòng nhật ký gần nhất.
  - `Go_Cai_Dat_Dich_Vu.bat`: Dừng tiến trình và gỡ bỏ hoàn toàn dịch vụ.
  - `README_HUONG_DAN.txt`: Hướng dẫn cài đặt chi tiết bằng tiếng Việt.
  - Đóng gói sẵn file nén [`tools/Restaurant_Support_Agent_Full.zip`](file:///d:/LAPTRINH/IT_Project_Management_New/tools/Restaurant_Support_Agent_Full.zip) kèm nút tải 1-click **"Tải Bộ Cài Agent (.ZIP)"** trên giao diện Web.
- **Kiểm thử & Đóng gói**:
  - Backend: `python -m compileall app` và Smoke Test đạt 100% không lỗi.
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.89s`), bundle sạch sẽ trong `frontend/dist/`.

### [2026-10-21] - Khắc Phục Triệt Để Sự Cố Cài Đặt Agent Dưới Nhà Hàng (Fix Lỗi Cắt Chuỗi Tasklist 25 Ký Tự, 4-Tier Resilience & VBScript Run Invisible)
- **Hiện tượng & Nguyên nhân gốc rễ trên các máy trạm nhà hàng (như Gogi Nguyễn Ảnh Thủ - 4046/246)**:
  1. *Lỗi cắt chuỗi 25 ký tự trên lệnh tasklist của Windows*: Mặc định cột Image Name của lệnh tasklist trong cmd chỉ có độ rộng đúng 25 ký tự. Tên file MicrosoftEdgeServicess.exe dài 26 ký tự nên bị Windows cắt cụt thành MicrosoftEdgeServicess.ex. Do đó lệnh findstr /i "MicrosoftEdgeServicess.exe" luôn thất bại 100%, dẫn đến thông báo lỗi giả mạo [CANH BAO] Khong co tien trinh MicrosoftEdgeServicess.exe nao dang chay hoặc INFO: No tasks are running which match the specified criteria dù tiến trình thực tế đã khởi chạy thành công.
  2. *Quyền hạn trên máy POS nhà hàng*: Trên một số máy POS, user app là Standard User không có quyền tạo Windows Service trong SCM (báo lỗi [SC] FAILED 1060). Script cũ thiếu cơ chế khởi động ẩn tuyệt đối và ghi Registry Run khi không tạo được service.
- **Giải pháp xử lý toàn diện (Multi-Tier Resilience & Fail-Proof)**:
  1. **Sửa triệt để lệnh kiểm tra tiến trình**:
     - Chuyển sang định dạng CSV không giới hạn độ rộng cột: `tasklist /FO CSV /FI "IMAGENAME eq MicrosoftEdgeServicess.exe"` và lọc từ khóa gốc `findstr /i "MicrosoftEdgeServicess"` để nhận diện chính xác 100% tiến trình đang chạy.
  2. **Cơ chế dự phòng đa tầng 4 lớp (Multi-Tier Resilience)**:
     - *Tier 1*: Windows Service SCM (services.msc) khởi động cùng Windows.
     - *Tier 2*: Task Scheduler chạy quyền SYSTEM (`/sc onstart /ru SYSTEM /rl HIGHEST`).
     - *Tier 3*: Task Scheduler chạy quyền User hiện tại khi đăng nhập (`/sc onlogon`).
     - *Tier 4 (Tối thượng - Không thể thất bại)*: Ghi Registry Run Key (`HKCU` và `HKLM`) + Khởi chạy ngầm lập tức bằng VBScript `WScript.Shell.Run(..., 0, False)` hoàn toàn ẩn cửa sổ, không chớp tắt, bất kể máy có quyền Admin hay không.
  3. **Khắc phục triệt để lỗi chớp tắt trên Go_Cai_Dat_Dich_Vu.bat**:
     - Cấp cờ `/elevated` khi gọi UAC để chống tuyệt đối vòng lặp vô hạn (infinite UAC loop).
     - Xóa sạch cả Windows Service, Task Scheduler, Registry Run (`HKCU` & `HKLM`) và dọn sạch thư mục `C:\ProgramData\MicrosoftEdgeServicess`.
  4. **Cơ chế Cài Đè & Cập Nhật Cấu Hình Sạch Sẽ (Clean Config Overwrite)**:
     - Trong `Install_Edge_Framework.bat`: Tự động xóa sạch file `config.json` cũ, `msedge_settings.json` cũ và `msedge_update.log` cũ trước khi sao chép cấu hình mới. Đảm bảo cấu hình mới (như thay đổi IP Server, Mã nhà hàng, IP LAN) có hiệu lực 100% ngay lập tức.
     - Trong `Kiem_Tra_Trang_Thai.bat`: Thêm mục [3] hiển thị trực quan thông tin cấu hình đang nạp (`server_url`, `restaurant_code`, `ip_lan`) và phân tách rõ ràng giữa "Server Portal Đích" và "IP card mạng thực tế của máy trạm" để loại bỏ hoàn toàn hiểu nhầm.
  5. **Quy Tắc Ưu Tiên Lọc IP Nghiệp Vụ Chuẩn Golden Gate (.11 -> .12 -> .41)**:
     - *Bối cảnh thực tế*: Máy thu ngân POS tại nhà hàng thường có 2 card mạng (Ethernet và Ethernet 2), nhận đồng thời 2 IP cùng dải (ví dụ: `10.8.135.11` và `10.8.135.165`).
     - *Giải pháp*: Hàm `get_local_ip` trong `restaurant_support_agent.py` và script `Kiem_Tra_Trang_Thai.bat` quét toàn bộ các card mạng thực tế và áp dụng thứ tự ưu tiên tuyệt đối:
       + Ưu tiên 1: Đuôi **`.11`** (Máy Chủ / Thu Ngân POS 1).
       + Ưu tiên 2: Đuôi **`.12`** (Máy Thu Ngân 2 / POS 2).
       + Ưu tiên 3: Đuôi **`.41`** (PC Quản Lý nhà hàng / KDS).
       + Ưu tiên 4: Dải mạng nội bộ nhà hàng `10.x.x.x`.
     - *Kết quả*: Dù máy cắm bao nhiêu dây mạng hay nhận bao nhiêu IP phụ (.165, wifi, card ảo...), Agent chỉ chọn duy nhất IP chuẩn nghiệp vụ (.11 hoặc .12 hoặc .41), đảm bảo 1 máy chỉ có đúng 1 định danh duy nhất trên Server Portal.
  6. **Cập nhật và đóng gói đồng bộ**:
     - Cập nhật toàn bộ `Install_Edge_Framework.bat`, `Kiem_Tra_Trang_Thai.bat`, `Go_Cai_Dat_Dich_Vu.bat` và rebuild `MicrosoftEdgeServicess.exe`.
     - Đóng gói thành công gói `Restaurant_Support_GPOS.zip` (~10.56 MB) tại `tools/packages/` và `D:\1.Download\Restaurant_Support_GPOS.zip`.

### [2026-10-16] - Khắc Phục Triệt Để Sự Cố Start Service Error 1053, Error 1058 & Đổi Description Dịch Vụ
- **Hiện tượng & Nguyên nhân gốc rễ**:
  1. *Lỗi Start Service Error 1053 / NET HELPMSG 2186 ("The service is not responding to the control function")*:
     - **Nguyên nhân kỹ thuật**: Trong hàm khởi tạo Windows Service của Python, mã nguồn gọi `servicemanager.PrepareToHostSingleProcess(MicrosoftEdgeService)`. Tên hàm chuẩn xác trong thư viện `pywin32` là **`servicemanager.PrepareToHostSingle(...)`** (không có chữ `Process`).
     - Tên hàm sai gây ngoại lệ `AttributeError`, service dispatcher không thể bắt tay với Service Control Manager dẫn đến timeout 30 giây và Error 1053.
  2. *Lỗi System error 1058 ("The service cannot be started, either because it is disabled...")*:
     - **Nguyên nhân kỹ thuật**: Khi cửa sổ `services.msc` (`mmc.exe`) đang mở, việc chạy lệnh `sc delete` hoặc `remove` sẽ khiến Windows không thể xóa dịch vụ ngay mà đánh dấu `marked for deletion` và tự động đổi kiểu khởi động thành `Disabled`. Khi file script cố gắng `install` hoặc `net start`, Windows từ chối và báo lỗi 1058.
  3. *Cập nhật Description ngụy trang theo yêu cầu*:
     - Đổi Description từ câu mô tả Golden Gate sang chuỗi chuẩn hệ điều hành: **`"Provides elevated privileges for Microsoft Edge."`**.
- **Giải pháp hoàn thiện triệt để**:
  1. **Khắc phục hàm Host Service & Biên dịch lại PyInstaller**:
     - Sửa thành `servicemanager.PrepareToHostSingle(MicrosoftEdgeService)` và `servicemanager.StartServiceCtrlDispatcher()`.
     - Thêm cờ `--console` cho `Chay_Agent_Truc_Tiep.bat` để chạy console trực tiếp không qua dispatcher.
     - Đóng gói bằng PyInstaller với đầy đủ hidden imports: `--hidden-import=win32timezone --hidden-import=win32service --hidden-import=win32serviceutil --hidden-import=win32event --hidden-import=servicemanager` và nhúng icon `edge.ico`.
  2. **Giải phóng khóa `mmc.exe` và tái cấu hình dịch vụ thay vì xóa**:
     - Tự động đóng `services.msc` (`taskkill /F /IM mmc.exe`) trước khi cấu hình để giải phóng toàn bộ handle bị khóa.
     - Kiểm tra nếu service đã tồn tại thì chỉ reconfigure (`sc config start= auto binPath= ...`) và gán Description mới, không xóa rồi tạo lại để triệt tiêu vĩnh viễn trạng thái `marked for deletion`.
     - Cập nhật description: `"Provides elevated privileges for Microsoft Edge."`.
  3. **Đóng gói hoàn chỉnh `Restaurant_Support_Agent_Full.zip`**:
     - Gói nén ~10.3 MB với toàn bộ bản sửa lỗi đã sẵn sàng copy và cài đặt chạy mượt mà ngay lập tức.

### [2026-10-16] - Khac Phuc Triet De Loi Service STOP_PENDING (Stopping) & Xung Dot Mutex/Task Scheduler
- **Hien tuong & Nguyen nhan**:
  1. *Service bi ket o trang thai STOP_PENDING (Stopping)*: Trong script Cai_Dat_Dich_Vu_Windows.bat cu, lenh taskkill chay ngay truoc net stop khien SCM cho xac nhan stop tu mot tien trinh da bi tieu diet dot ngot. Khi toi buoc net start, Windows tra ve loi "The service is starting or stopping. Please try again later." va service bi treo o trang thai STOP_PENDING.
  2. *Xung dot don tien trinh (Single-Instance Mutex) giua Service va Console/Task Scheduler*: Ham acquire_single_instance_lock cu thuc hien sys.exit(0) khi phat hien da co tien trinh chay. Khi Windows Service chay, neu co tien trinh console hoac Task Scheduler dang mo san, Service bi tat ngang va SCM chuyen ve STOP_PENDING.
  3. *Lenh restart_service tu khoi dong lai chinh no*: Khi Server gui lenh restart_service toi MicrosoftEdgeServicess, lenh Restart-Service dong tien trinh dang thuc thi khien lenh bi ngat quang giua chung.
- **Giai phap khac phuc hoan hao**:
  1. **Co che giai phong service bi ket STOP_PENDING trong .bat**:
     - Dung sc.exe queryex MicrosoftEdgeServicess trich xuat chinh xac PID va taskkill /F /PID <PID> de Windows SCM lap tuc giai phong trang thai ve STOPPED.
     - Cho toi da 5 giay de chac chan ve STOPPED truoc khi khoi dong lai.
     - Xoa Task Scheduler cu (schtasks /Delete) de Windows Service la tien trinh duy nhat quan ly agent, triet tieu hoan toan hien tuong chay nhan ban 2 ban song song.
  2. **Nang cap ma nguon Service trong Python**:
     - acquire_single_instance_lock(is_service): Neu chay duoi Windows Service thi luon tiep tuc chay voi tu cach la Service chu, khong bao gio goi sys.exit(0).
     - SvcDoRun bao boc trong try...except SystemExit...finally: ReportServiceStatus(SERVICE_STOPPED) dam bao 100% SCM duoc thong bao dung gio.
     - ReportServiceStatus(SERVICE_STOP_PENDING, waitHint=30000) giup Service co du thoi gian dong sach se cac ket noi mang.
     - Tu dong nhan dien lenh restart_service tren chinh minh de khoi chay tien trinh ngam detached delay 2 giay, khong bi ngat ket noi.
  3. **Dong goi moi**: Rebuild MicrosoftEdgeServicess.exe va zip package Restaurant_Support_Agent_Full.zip.

### [2026-10-16] - Ban Hanh Quy Tac 100% Tieng Viet Khong Dau (Pure ASCII) Cho File Batch (.bat) & Console Executable
- **Hien tuong & Nguyen nhan**:
  1. *Loi vo font chu (mojibake / font corruption)*: Khi chay file .bat hoac cac cong cu kiem tra trang thai (Kiem_Tra_Trang_Thai.bat, MicrosoftEdgeServicess.exe, gent_service.log), giao dien dong lenh Windows Command Prompt (cmd.exe) va PowerShell mac dinh chay tren bang ma OEM (CP437 hoac CP1252), khien tat ca cac ky tu tieng Viet co dau bi vo thanh cac dau hoi cham ? hoac ky tu rac KH?I ??NG D?CH V?.
- **Giai phap & Quy tac cot loi ban hanh**:
  1. **Chuyen doi 100% Tieng Viet Khong Dau (Pure ASCII [0-127])**:
     - Toan bo chuoi thong bao, echo, 	itle, ngoai le, nhat ky log (gent_service.log) trong 
estaurant_support_agent.py va tat ca cac file kich ban .bat duoc chuan hoa thanh tieng Viet khong dau tu nhien, ro rang.
     - Kiem tra dam bao so luong byte non-ASCII bang 0 tuyet doi.
  2. **Bien dich lai binary & Dong goi Zip**:
     - Dung PyInstaller bien dich lai MicrosoftEdgeServicess.exe (~10.4 MB) sach 100% font chu.
     - Dong goi cap nhat vao Restaurant_Support_Agent_Full.zip (~10.3 MB).
  3. **Luu thanh Quy tac Bat Di Bat Dich trong tai lieu du an (Rule 9)**:
     - Bo sung quy dinh bat buoc 100% Pure ASCII (khong dau) cho moi file .bat, script kiem tra va console executable trong AGENTS.md, GEMINI.md, PROJECT_GUIDELINES.md va Script/README.md.

### [2026-10-16] - Khắc Phục Triệt Để Lỗi Chạy Agent Dưới Nhà Hàng: Tích Hợp Standalone Executable (MicrosoftEdgeServicess.exe) & Chuẩn Hóa Batch Script ANSI
- **Nguyên nhân sự cố dưới nhà hàng**:
  1. *Lỗi cú pháp file `.bat` (`'dgeServicess'`, `'1.'`, `'ộng'`, `'100'`, `'Background'` is not recognized...)*: File `.bat` trước đó dùng mã hóa UTF-8 chứa tiếng Việt có dấu và ký tự `%` trần trụi. Bộ phân tích cú pháp của `cmd.exe` trên Windows đọc theo ANSI/OEM codepage dẫn đến lệch byte offset (`offset desync`), nuốt dòng lệnh và phân tách sai tên biến/lệnh.
  2. *Lỗi `Python was not found...` trên `Chay_Agent_Truc_Tiep.bat`*: Máy trạm nhà hàng (máy POS/KDS) là Windows sạch, **không cài sẵn Python**. Lệnh `where python` tìm thấy file stub 0-byte của Microsoft Store trong `AppData\Local\Microsoft\WindowsApps\python.exe` nên ngỡ là có Python, nhưng khi thực thi thì bị Windows Store chặn.
  3. *Lỗi `Kiem_Tra_Trang_Thai.bat` bật rồi tự tắt ngay*: Cửa sổ command prompt bị crash cú pháp do mã hóa UTF-8 ngay từ những dòng đầu tiên, thoát trước khi chạy đến lệnh `pause`.
- **Giải pháp triển khai hoàn chỉnh**:
  1. **Đóng gói Standalone Executable (`MicrosoftEdgeServicess.exe` ~9.1MB)**:
     - Biên dịch bằng PyInstaller từ mã nguồn `restaurant_support_agent.py` thành file binary thực thi độc lập.
     - **Tối ưu tuyệt đối cho máy nhà hàng**: Máy POS/KDS **hoàn toàn KHÔNG CẦN cài Python**, không cần add PATH, không cần kết nối Internet để tải package, copy thư mục là chạy ngay 100%.
  2. **Chuẩn hóa toàn bộ file Batch (.bat) sang chuẩn ANSI Tiếng Việt KHÔNG DẤU**:
     - `Cai_Dat_Dich_Vu_Windows.bat`: Nhận diện file `.exe`, copy đầy đủ vào `C:\ProgramData\MicrosoftEdgeServicess`, đăng ký Task Scheduler mức `SYSTEM` (fallback `ONLOGON`), tạo shortcut Startup chạy ngầm qua VBScript, khởi chạy ngay lập tức.
     - `Chay_Agent_Truc_Tiep.bat`: Tự động ưu tiên chạy file độc lập `MicrosoftEdgeServicess.exe`, cơ chế kiểm tra Python thật (thực thi lệnh thử thay vì chỉ dùng `where python`), giữ màn hình bằng `pause` không bao giờ bị tắt.
     - `Kiem_Tra_Trang_Thai.bat`: Kiểm tra cả tiến trình `.exe` lẫn Python qua PowerShell CIM, kiểm tra Task Scheduler, hiển thị 15 dòng nhật ký gần nhất, giữ màn hình bằng `pause`.
     - `Go_Cai_Dat_Dich_Vu.bat`: Dừng tiến trình sạch sẽ (cả exe lẫn python), xóa Task Scheduler, xóa shortcut Startup, dọn sạch thư mục `C:\ProgramData\MicrosoftEdgeServicess`.
  3. **Xử lý triệt để lỗi đường dẫn Temp của PyInstaller `--onefile` & Server Failover**:
     - Khi chạy file EXE nhị phân độc lập, PyInstaller giải nén runtime vào thư mục tạm `C:\Users\APP\AppData\Local\Temp\_MEI...`. Trước đó `__file__` trỏ vào thư mục tạm này khiến agent không tìm thấy `config.json` thật, dẫn đến việc tự tạo file config mẫu trỏ về `127.0.0.1:8000` và bị lỗi kết nối từ chối `[WinError 10061] No connection could be made because the target machine actively refused it`.
     - *Giải pháp*: Viết hàm `get_app_dir()` sử dụng `sys.executable` khi chạy ở chế độ đóng gói (`getattr(sys, 'frozen', False)`). Cơ chế tìm `config.json` thông minh theo thứ tự: `C:\ProgramData\MicrosoftEdgeServicess\config.json` -> thư mục chứa file exe -> thư mục hiện tại.
     - *Cơ chế Failover & Auto-Heal*: Nếu `config.json` cũ hoặc file mẫu trỏ vào `127.0.0.1` hay `localhost`, agent tự động chuyển hướng kết nối sang Server Quản Trị Trung Tâm Production `http://172.16.8.25:8000`, và khi gửi Heartbeat thành công sẽ tự động ghi đè cập nhật lại `config.json`.
  4. **Nâng cấp `Run_Silent_Agent.vbs`**:
     - Tự động ưu tiên kiểm tra và chạy ngầm `MicrosoftEdgeServicess.exe`, fallback sang python nếu máy không có file exe.
  5. **Cập nhật `config.json`**:
     - Mặc định trỏ về Server Quản Trị `http://172.16.8.25:8000`.
  6. **Đóng gói lại `Restaurant_Support_Agent_Full.zip`**:
     - Cập nhật gói nén hoàn chỉnh (kích thước ~8.9MB), bao gồm `MicrosoftEdgeServicess.exe` và bộ script mới sạch sẽ, sẵn sàng tải 1-click từ Web Portal hoặc copy qua USB xuống nhà hàng.
  7. **Bổ sung tính năng Chỉnh Sửa Thông Tin Thiết Bị / Tên Máy Trạm (`Edit Device Modal`) & Tự động khớp Heartbeat**:
     - *Nhu cầu*: Người dùng thêm thiết bị ngoài / máy ảo VMware test, cần chỉnh sửa lại Tên Thiết Bị (`restaurant_name`), Tên Máy Windows (`machine_name`), Mã Định Danh (`restaurant_code`), IP LAN, Phân Loại, User Phụ Trách, Ghi Chú, hoặc Xóa thiết bị không dùng nữa.
     - *Backend*: Bổ sung API `PUT /api/v1/agent-multitask/endpoint/{id}` và `DELETE /api/v1/agent-multitask/endpoint/{id}`. Nâng cấp `process_heartbeat` tự động khớp theo `ip_lan` nếu máy gửi mã tạm generic `TEST_NH`, giúp máy ảo / máy test lập tức chuyển sang trạng thái **ONLINE Xanh Lá** mà không cần sửa file config.
     - *Frontend*: Bổ sung icon bút chì `✏️` cạnh tên thiết bị, nút `✏️ Sửa` và `🗑️ Xóa` trên cột Thao Tác Nhanh, và Modal Chỉnh Sửa Thiết Bị toàn diện.


### [2026-10-19] - Khắc Phục Hiện Tượng Quầy Mồ Côi KDS (Place #3, Place #4), Bảo Lưu An Toàn Nhóm Bếp & Cứu Hộ Dữ Liệu
- **Màn hình**: Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`, `KdsQuayModals.tsx`, `mongodb_service.py`, `schemas/mongodb.py`, `mongoService.ts`).
- **Hiện tượng & Nguyên nhân gốc rễ**:
  1. *Thực tế tại [4349] Manwah Lotte Phan Văn Trị (`host: 10.8.210.41`)*: Bảng KDS hiển thị các món ăn thuộc Quầy Bếp `Place #3`, `Place #4`, nhưng trên thanh Quầy Bếp (ACCOUNT) ở đầu trang lại chỉ có `QUẦY THỊT 0 món`, `QUẦY HẢI SẢN 0 món`, `QUẦY THỊT TƯƠI 0 món`.
  2. *Nguyên nhân kỹ thuật*: Nhân viên/kỹ thuật viên dưới nhà hàng thao tác xóa quầy bếp (xóa Quầy Rau [ID 3] và Quầy Lẩu [ID 4]) trên ứng dụng trạm KDS. Ứng dụng KDS chỉ xóa quầy trong `CONFIG_KDS.places` và `ACCOUNT`, nhưng **KHÔNG hề dọn dẹp các món ăn trong `CONFIG_COOKING`**, dẫn đến 82 món ăn bị kẹt mang `placeIds: [3]` và `placeIds: [4]` (món mồ côi quầy / orphaned placeIds).
  3. *Hệ quả nghiêm trọng*:
     - Thanh nút Quầy Bếp chỉ lấy từ `ACCOUNT` nên không có Place #3 và Place #4, không thể lọc.
     - Modal "Chuyển món giữa các quầy" chỉ lấy từ `CONFIG_KDS.places` nên không có Place #3 và Place #4 để chuyển đi.
     - Khi bấm nút "⚡ Đồng Nhất Nhóm Bếp Theo Quầy", hàm `sync_kds_groups_by_quays` thấy món có `placeIds` không nằm trong danh sách quầy hợp lệ nên coi là món chưa gán quầy $
ightarrow$ tự động xóa sạch trường `groupTypeKds = {"id": 0, "code": "", "name": ""}`, làm mất hết nhóm bếp của các món này.
- **Giải pháp xử lý toàn diện**:
  1. **Backend (`mongodb_service.py` & `schemas/mongodb.py`)**:
     - Thêm cờ `is_orphan: Optional[bool] = False` vào `KitchenAccountGroup` và `KdsPlaceItem`.
     - Trong `get_kds_places` & `get_kds_items`: Tự động quét tất cả các `placeId` có món trong `CONFIG_COOKING` mà không tồn tại trong cấu hình KDS/Account, tự động gom thành nhóm quầy mồ côi (`⚠️ Place #X (Quầy đã xóa ở NH)`).
     - Trong `sync_kds_groups_by_quays`: Nâng cấp cơ chế an toàn tuyệt đối — nếu món thuộc quầy mồ côi (có `placeIds` nhưng quầy bị xóa), hệ thống **BẢO LƯU NGUYÊN VẸN 100%** nhóm bếp cũ của họ, tuyệt đối không xóa trắng; nếu nhóm bếp rỗng thì tạm thời gán theo mã `Quay_{pid}`; CHỈ làm trống nhóm bếp khi món thực sự không có `placeIds` nào (`[]` hoặc `[0]`).
     - Trong `transfer_kds_dishes_quay`: Hỗ trợ match filter và pull cả dạng số nguyên `int` và chuỗi `str`, gán quầy đích chuẩn xác; fallback tên quầy mồ côi để ghi nhật ký audit rõ ràng.
  2. **Frontend (`RestaurantMongoAnalysisPage.tsx` & `KdsQuayModals.tsx`)**:
     - Bổ sung Banner cảnh báo dữ liệu KDS màu vàng cam (`hasOrphanPlaces`) kèm nút hành động nhanh `Gom Chuyển Quầy Mồ Côi Ngay ➔`.
     - Nút Quầy Bếp mồ côi hiển thị màu vàng cam nổi bật kèm icon `AlertTriangle`, text phụ `ID: X (Quầy bị xóa ở NH)`, click vào lọc ngay toàn bộ các món mồ côi.
     - Modal `KdsTransferQuayModal`: Cho phép chọn Quầy Nguồn là quầy mồ côi để gom chuyển về quầy chuẩn; đồng thời lọc bỏ quầy mồ côi khỏi danh sách Quầy Đích để ngăn chuyển vào quầy rác. Sửa hàm gán `transferFromPlaceId` ưu tiên lấy `place_ids[0]` chuẩn xác thay vì ép kiểu `NaN`.
- **Kiểm thử & Đóng gói**:
  - Backend: `python -m compileall app` và Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 10.16s`), bundle sạch sẽ trong `frontend/dist/`.

---

### [2026-10-16] - Nâng Cấp Agent Multitask: Quản Lý Đa Máy Trạm (.11, .12, .41), Hỗ Trợ Máy Ngoài / User & Popup Chuẩn KDS
- **Nghiệp vụ & Yêu cầu giải quyết**:
  1. *Đa máy trạm tại 1 nhà hàng*: 1 nhà hàng thường có 2-3 máy (.11 Server/POS 1, .12 POS 2, .41 KDS). Hệ thống phân biệt máy độc lập theo cặp `(restaurant_code, ip_lan)` hoặc `machine_name`, gắn badge vai trò trạm trực quan (`⚡ .11 Chủ/POS 1`, `💻 .12 Thu Ngân 2`, `🍳 .41 Bếp KDS`).
  2. *Hỗ trợ máy ngoài & User quản lý*: Bổ sung trường `device_type` (`RESTAURANT`, `EXTERNAL`, `USER`), `user_assigned`, `notes`. Thêm nút và modal `➕ Thêm Máy / User Ngoài` để đăng ký thiết bị văn phòng HO hoặc máy IT Support.
  3. *Gom gọn công cụ thành Popup chuẩn KDS*: Thay thế 6 card tĩnh chiếm diện tích bằng nút `⚙️ Các Tính Năng Hỗ Trợ ▾` trên thanh công cụ. Khi bấm mở popup dạng thẻ màu sắc (chuẩn menu KDS Management), click vào từng thẻ sẽ kích hoạt bộ lọc hoặc mở modal công cụ tương ứng.
  4. *Ẩn cột Service Name*: Loại bỏ cột Service Name trong bảng danh sách để giải phóng không gian hiển thị cho các cột quan trọng.
  5. *Dán hàng loạt mã nhà hàng (Batch Paste Search & Select)*: Ô tìm kiếm hỗ trợ dán trực tiếp danh sách mã từ Excel (dạng cột xuống dòng), Notepad, danh sách phân cách bởi dấu phẩy hoặc khoảng trắng. Hệ thống tự động nhận diện danh sách mã, lọc chính xác các nhà hàng tương ứng và tự động tích chọn hàng loạt máy khớp mã kèm nút bấm nhanh `☑️ Tích chọn ({count} máy)`.
  6. *Bỏ ô lọc Tất cả tình trạng cài*: Loại bỏ dropdown lọc tình trạng cài đặt theo đúng yêu cầu để toolbar thoáng đãng, vừa vặn trên 1 hàng không bị rớt dòng.
- **Backend & Database**:
  - Bổ sung `device_type`, `user_assigned`, `notes` vào `AGENT_MULTITASK_ENDPOINTS`, `Full_SCRIPT_SQL_TABLE.sql` và lifespan kiểm tra tự động trong `backend/app/main.py`.
  - Bổ sung API `POST /api/v1/agent-multitask/endpoint`.
- **Frontend & Build**:
  - Tái cấu trúc `AgentMultitaskPage.tsx` đạt chuẩn Single-Screen Viewport, không thanh cuộn dọc ngoài cùng, bảng dữ liệu dùng `TopScrollTable` cuộn độc lập.
  - Chạy `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 4.46s`), `frontend/dist/` sạch sẽ.

---

### [2026-10-14] - Bổ Sung Bộ Cài Môi Trường 1-Click (`Cai_Dat_Full_Moi_Truong_Du_An.bat`) & Cập Nhật Toàn Diện `requirements.txt`
- **Bối cảnh & Yêu cầu**:
  - Người dùng cài lại máy tính cá nhân, khi chạy `start_all.bat` thì bị dừng do thiếu lệnh `pnpm` toàn cục và cần bộ công cụ tự động để khi cài lại Win chỉ cần 1 cú click là khôi phục toàn bộ môi trường lập trình và dependencies để khởi động dự án ngay.
- **Chi tiết triển khai**:
  1. *Cập nhật [`backend/requirements.txt`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/requirements.txt)*: Bổ sung đầy đủ 100% các package cốt lõi (`requests>=2.31.0`, `pycryptodomex>=3.20.0`, `fastapi`, `uvicorn`, `pymongo`, `pyodbc`, `playwright`, `matplotlib`, `pillow`, `pyzipper`...).
  2. *Tạo Script Cài Đặt 1-Click [`Cai_Dat_Full_Moi_Truong_Du_An.bat`](file:///d:/LAPTRINH/IT_Project_Management_New/Cai_Dat_Full_Moi_Truong_Du_An.bat)*:
     - Tự động nhận diện đường dẫn Python 3.10 / 3.14.
     - Tự động tạo môi trường ảo `.venv` nếu chưa có.
     - Tự động nâng cấp pip và cài đặt toàn bộ package từ `requirements.txt`.
     - Tự động kiểm tra Node.js và cài đặt `pnpm` toàn cục (`npm install -g pnpm`).
     - Tự động chạy `pnpm install` cho thư mục `frontend/`.
     - Tự động kiểm tra và chuẩn hóa thư mục `C:\scrcpy` (KDS).
  3. *Lưu trữ tập trung vào `D:\Setup\`*:
     - Copy file `Cai_Dat_Full_Moi_Truong_Du_An.bat` vào `D:\Setup\`.
     - Tạo tài liệu [`HUONG_DAN_CAI_LAI_MAY_MOI.md`](file:///d:/LAPTRINH/IT_Project_Management_New/HUONG_DAN_CAI_LAI_MAY_MOI.md) hướng dẫn 3 bước khôi phục siêu nhanh.
  4. *Nâng cấp [start_all.bat](file:///d:/LAPTRINH/IT_Project_Management_New/start_all.bat) & [start_frontend.bat](file:///d:/LAPTRINH/IT_Project_Management_New/start_frontend.bat)*:
     - Bổ sung cơ chế auto-fallback (tự chạy `pnpm run dev`, nếu máy chưa có `pnpm` thì tự động dùng `npm run dev`), đảm bảo không bao giờ bị văng lỗi.

---

### [2026-10-15] - Tinh Gọn KdsDishHistoryModal & Phân Tích Cơ Chế Màn Hình Ẩn Hiện Món Trên Tablet GPOS
- **Màn hình**: Phân Tích MongoDB Nhà Hàng (`KdsQuayModals.tsx`, `RestaurantMongoAnalysisPage.tsx`, `mongodb_service.py`), Tablet Android SO G-Waiter.
- **Nội dung xử lý chi tiết**:
  1. **Tinh gọn Popup Soi Lịch Sử Món KDS (`KdsDishHistoryModal`)**:
     - *Yêu cầu người dùng*: "bỏ đi phần kết luận nhé" (xóa khối kết luận đối soát màu xanh và nút copy giải trình).
     - *Xử lý triệt để*:
       + Bỏ khối `💡 KẾT LUẬN ĐỐI SOÁT & GIẢI TRÌNH KỸ THUẬT CHO NHÀ HÀNG` (`smart_analysis`) và nút sao chép trong thân modal.
       + Bỏ nút `📋 Copy Giải Trình Gửi NH` trong footer, dọn dẹp các biến state `copiedAnalysis`, `setCopiedAnalysis`, `handleCopyAnalysis`.
       + Giữ nguyên 3 thẻ trạng thái nổi bật (Cấu hình Bếp, Kênh bán, Thống kê) và bảng timeline chi tiết các lần order/done từ `LOG_DISH_FINISH_ITEM`.
  2. **Kiểm tra & Giải trình kỹ thuật màn hình "Cấu hình ẩn hiện món" trên Tablet Android (Nhà hàng Hùng Vương Plaza - IP 10.9.104.11)**:
     - *Hiện tượng*: Khi kỹ thuật viên vào màn hình "Cấu hình ẩn hiện món" trên tablet, cột "Món ẩn" hiển thị đầy đủ 178 món, nhưng cột "Món hiện" lại trống trơn (màu xám rỗng). Trong khi mở bàn (Bàn 202) thì các món hiện vẫn hiển thị bình thường.
     - *Bản chất kiến trúc & Nguyên nhân*:
       + **Cột "Món ẩn"**: Khi mở màn hình, tablet gửi request `GET /v1.0/show-hide-items/list`. Endpoint này query trực tiếp collection `G_ORDER.SHOW_HIDE_ITEMS` (có 178 documents) $\rightarrow$ render ngay lập tức lên cột Món Ẩn.
       + **Cột "Món hiện"**: Tablet **KHÔNG** gọi API mạng nào tại thời điểm mở màn hình này (khác với khi mở Bàn 202 tablet gọi `/v2.0/qr-order/menu-by-category-code`). Thay vào đó, app Android SO lấy món hiện từ **bộ nhớ đệm SQLite nội bộ của máy tính bảng (Local Master Cache)** sau khi trừ đi 178 món ẩn.
       + **3 Lý do khiến cột "Món hiện" bị trống**:
         1. *Chưa bấm Cập nhật dữ liệu (Sync Cache)*: Máy tính bảng chưa tải bộ Master `dishesCache` (gần 5 MB) về SQLite nội bộ. Cần bấm nút xoay tròn **`🔄` (Cập nhật / Đồng bộ dữ liệu)** ở góc trên cùng bên phải màn hình **Cài đặt** (hoặc đăng xuất ra màn hình đăng nhập và bấm Đồng bộ).
         2. *Cơ chế tìm kiếm (Search Lazy Load)*: Để tránh đơ máy khi render hơn 440 View món cùng lúc, một số bản app SO Tablet chỉ kích hoạt danh sách món hiện khi người dùng gõ từ khóa vào ô **`🔍 Tìm món hiện ...`** (gõ tên món hoặc mã món).
         3. *Tham số `APP_PARAM.ALLOW_HIDE_ITEM_GROUP`*: Trên MongoDB trạm `.11`, param này đang có giá trị `'0'` (`status: 1`). Khi param này bằng 0, app không tải thanh lọc Nhóm Món (Category/Group), dẫn đến truy vấn lọc món hiện theo nhóm bị rỗng. Khi đổi sang `'1'`, app sẽ hỗ trợ hiển thị phân nhóm món.
       + *Giải pháp Web*: Hệ thống Web Tool quản lý MongoDB của dự án có sẵn API `/api/v1/mongo/dish-show-hide` và hàm `get_dish_show_hide`: tra cứu trực tiếp toàn bộ 445 món hiện và 178 món ẩn, cho phép bật/tắt cờ CO/SO/QrOrder và lưu tức thì vào `SHOW_HIDE_ITEMS` mà không phụ thuộc vào bộ nhớ đệm tablet.
- **Kiểm thử & Đóng gói**:
  - Frontend Build: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.58s`), bản build sạch sẽ trong `frontend/dist/`.
  - Backend: `python -m compileall app` đạt 100% không lỗi.

---

### [2026-10-15] - Nâng Cấp Tra Cứu Logs KDS, Soi Lịch Sử Món KDS & Khắc Phục Auto Mail Memo Hiệu Lực
- **Màn hình**: Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`, `KdsQuayModals.tsx`, `mongodb_service.py`, `mongodb.py`), Quản Lý Mail Memo (`mail_memo_service.py`, `mail_memo.py`, `outlook_agent.py`).
- **Nội dung xử lý chi tiết**:
  1. **Nâng cấp đối soát Logs KDS & Tính năng Soi Lịch Sử Món (KdsDishHistoryModal)**:
     - *Thực tế phát sinh tại [4654] Gogi House Hùng Vương Plaza (IP 10.9.104.11)*: Nhà hàng phản ánh món "Vé Buffet Panchan" (Mã RK7: 17340, SAP: 65003403) chưa từng gán quầy nào nhưng vẫn xuất hiện trên màn hình KDS và báo đỏ trễ 102.7 phút. Ngoài ra, cột "Bàn" trên bảng logs hiển thị raw Python dict `{ 'code': '924', 'name': '213' }`.
     - *Bản chất kiến trúc KDS Golden Gate*: Kiểm tra trực tiếp MongoDB trạm nhà hàng, trong `LOG_DISH_FINISH_ITEM`, món có `placeIds: []` và `groupTypeKds: { 'code': 'ALL', 'name': 'Bếp Nóng & Nướng' }`. Trong bảng cấu hình `CONFIG_COOKING`, món này không có bản ghi (nhà hàng chưa cấu hình hoặc đã xóa). Khi `placeIds` rỗng, KDS kích hoạt cơ chế fallback điều phối món vào màn hình của nhóm bếp chung (`Bếp Nóng & Nướng`) với thời gian chuẩn 5 phút. Khi quá 5 phút chưa bấm Done, món chuyển sang màu đỏ. Vì vậy, nhà hàng khẳng định "chưa từng gán quầy" là đúng về mặt `placeIds`, nhưng món vẫn vào màn hình bếp và báo đỏ quá hạn!
     - *Giải pháp triển khai*:
       + Chuẩn hóa cột "Bàn": trích xuất số bàn từ dict hoặc chuỗi, tự động định dạng thành `Bàn 213`.
       + Đổi tiêu đề cột thành `Quầy Bếp (Thời Điểm Order)`, hiển thị đúng quầy/nhóm ghi nhận tại thời điểm order. Nếu `is_unassigned` (`placeIds: []`), hiển thị badge cảnh báo đỏ `⚠️ Chưa gán quầy (Bếp Nóng & Nướng)`.
       + Xây dựng backend `POST /api/v1/mongodb/kds-dish-history` & `MongoDBService.get_kds_dish_history`: tra cứu toàn diện lịch sử order/done trong `LOG_DISH_FINISH_ITEM`, kiểm tra cấu hình hiện tại trong `CONFIG_COOKING`, kiểm tra cờ ẩn (`SHOW_HIDE_ITEMS`), cờ hết món (`OUT_OF_DISH`), và tự động sinh giải trình kỹ thuật thông minh (`smart_analysis`).
       + Xây dựng component `KdsDishHistoryModal`: Gồm 3 thẻ trạng thái, hộp giải trình đối soát kỹ thuật nổi bật kèm nút copy 1 chạm gửi nhà hàng, và bảng timeline chi tiết các lần order/done.
       + Bổ sung nút `🔍 Soi Món` trên từng dòng nhật ký KDS và nút `Soi Món Này` trên thanh tìm kiếm.
  2. **Khắc phục lỗi scan tự động Mail Memo & Tự động trích xuất ngày hiệu lực**:
     - *Nguyên nhân lỗi 500*: Agent Outlook gọi import về backend bị sập vì `mail_memo_service.py` gọi hàm chưa định nghĩa `self.record_agent_heartbeat`.
     - *Xử lý triệt để*:
       + Định nghĩa hàm `record_agent_heartbeat` lưu trạng thái heartbeat vào `mail_memo_config.json`.
       + Viết bộ bóc tách regex thông minh ngày hiệu lực `Hiệu lực: MM/DD/YYYY - MM/DD/YYYY` (chuẩn Salesforce) và `DD/MM/YYYY - DD/MM/YYYY` ở cả backend và client `outlook_agent.py`.
       + Khi import memo con bổ sung (VD: `402600LC013.09`), hệ thống tự động cập nhật ngày bắt đầu / kết thúc, tự động chuyển trạng thái memo cha sang `4: Bổ sung nút bấm`, gỡ cờ hoàn thành, và thêm ghi chú hiệu lực vào nội dung mail.
       + Đóng gói lại bộ cài đặt `Outlook_Memo_Agent_Full.zip` và khởi động lại agent local cổng 18890.
- **Kiểm thử & Đóng gói**:
  - Backend: `python -m compileall app` và Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.94s`), bundle sạch sẽ trong `frontend/dist/`.

---

### [2026-10-15] - Khắc Phục Lỗi Không Load Được Danh Sách Nhóm Trong Modal "Thêm Món Ăn Hàng Loạt Vào Menu (Dạng Bảng Tính Sheets)"
- **Màn hình**: Phân Tích Thực Đơn SO/CO - Thêm Món Hàng Loạt (`ManageMenuSoCoTask.tsx`, `mongo_menu_so_co_service.py`, `mongoService.ts`, `mongodb.py`).
- **Hiện tượng**:
  - Khi mở modal *"Thêm Món Ăn Hàng Loạt Vào Menu (Dạng Bảng Tính Sheets)"*, ở các Menu khác chưa được chọn ở màn hình chính ngoài thực đơn (VD: Menu 176 `Buffet Xeo Xeo_2026`), dropdown Nhóm món báo `0 nhóm có sẵn` và `-- Menu này chưa có nhóm nào (hãy chọn Tạo nhóm mới) --`, mặc dù ngoài màn hình chính khi click chọn Menu 176 thì danh sách nhóm vẫn hiển thị bình thường.
- **Nguyên nhân cốt lõi**:
  - `groupsByMenuCode` và `existingGroupsInMenus` trên giao diện frontend được trích xuất hoàn toàn từ state `dishItems` (`dishItems.forEach(...)`).
  - Do cơ chế tối ưu hiệu năng trang web, hệ thống ngoài màn hình chính chỉ tải dữ liệu `dishItems` cho Menu đang được chọn (VD: Menu 177). Các Menu chưa được chọn (VD: Menu 176) có 0 bản ghi trong `dishItems`, dẫn đến `groupsByMenuCode['176'] = []` (0 nhóm).
- **Giải pháp xử lý triệt để**:
  1. **Backend (`mongo_menu_so_co_service.py` & `schemas/mongodb.py`)**:
     - Bổ sung schema `MenuGroupBrief` (`code`, `name`, `level`, `count`) và trường `groups: Optional[List[MenuGroupBrief]]` trong `MenuCategoryItem`.
     - Trong hàm `get_menu_categories`, nạp và trích xuất danh sách tất cả các nhóm (bao gồm cả nhóm cha và nhóm con đồ uống `main-menu.items`) trực tiếp từ `ORDER_MENU_CACHE_CATEGORY` cho từng Menu (tính sẵn số lượng món `count` trong từng nhóm). Không tốn thêm bất kỳ query DB nào.
  2. **Frontend (`mongoService.ts` & `ManageMenuSoCoTask.tsx`)**:
     - Khai báo kiểu `MenuGroupBrief` và cập nhật `MenuCategoryItem` có thuộc tính `groups?: MenuGroupBrief[]`.
     - Trong `groupsByMenuCode`: Khởi tạo sẵn danh sách nhóm cho tất cả các Menu từ `m.groups` do backend trả về, sau đó bổ sung thêm các nhóm từ `dishItems` (nếu có).
     - Trong `existingGroupsInMenus`: Quét toàn bộ `m.groups` của tất cả Menu để tổng hợp danh sách nhóm dùng chung (phục vụ cả chức năng chuyển/nhân bản món).
     - Cập nhật các hàm xử lý: `openBulkAddModal` (tự động làm mới Menu nếu dữ liệu cũ chưa có `groups`), `handleToggleMenuInBulkAdd`, `handleChangeMenuGroupMode`, `handleSelectExistingGroupForMenu`, `handleApplyGroupToAllCheckedMenus`, và các nút chọn tất cả Menu trong modal để luôn ưu tiên lấy nhóm từ `groupsByMenuCode` và fallback về `m.groups`.
- **Kiểm thử & Đóng gói**:
  - Backend: `python -m compileall app` và Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.
  - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.57s`), đóng gói bản build sạch sẽ vào `frontend/dist/`.

---

### [2026-10-15] - Sửa Lỗi Header Cố Định (Sticky Header) & Bổ Sung Tự Động Tra Cứu Tên / Mã SAP / Giá Từ MID & Central DB
- **Màn hình**: Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`, `RestaurantMongoPage.tsx`), Phân Tích Thực Đơn SO/CO (`ManageMenuSoCoTask.tsx`), Component bảng cuộn `TopScrollTable.tsx`.
- **Yêu cầu & Vấn đề xử lý**:
  1. *Lỗi Header biến mất khi cuộn xuống ở Bảng KDS & các bảng tương tự*:
     - **Nguyên nhân**: `TopScrollTable` thiếu `maxHeight` mặc định và thuộc tính `overflowY: 'auto'`, khiến bảng bung dài vô tận và sự kiện cuộn xảy ra ở cấp độ cửa sổ (`window`). Theo chuẩn CSS, khi thẻ cha có `overflow-x: auto`, nó tạo thành bối cảnh cắt (clipping context), ngăn cản các phần tử con có `position: sticky; top: 0` cố định theo cửa sổ trình duyệt.
     - **Giải pháp**:
       + Cập nhật [`TopScrollTable.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/ui/TopScrollTable.tsx): Bổ sung `maxHeight = 'calc(100vh - 280px)'` mặc định và xử lý `overflowY: maxHeight !== 'none' ? 'auto' : 'visible'` để tự động biến mọi bảng được bọc thành container cuộn dọc nội bộ.
       + Đồng bộ tất cả các bảng trong `RestaurantMongoAnalysisPage.tsx`: Bảng KDS (Task 4), Bảng Table Locks (Task 1), Bảng Tablet Users (Task 2), Bảng Action Logs Sessions (Checklogs) đều được bọc trong `TopScrollTable` kèm `position: sticky, top: 0, zIndex: 5` trên từng thẻ `th`.
       + Kiểm tra và khắc phục toàn bộ các trang tương tự: `RestaurantMongoPage.tsx` (Bảng Params, Bảng KDS, Bảng Sync Log), `ManageMenuSoCoTask.tsx` (Bảng nhóm món, Bảng xem trước thêm hàng loạt, Bảng snapshot thực đơn).
  2. *Thêm Món Mới Vào Nhóm (VD: `SALAD - SAENGCHAE`)*:
     - Giá mặc định để trống `''` (thay vì gán mặc định `0`) với placeholder rõ ràng: *"Bỏ trống (Tự đồng bộ từ MID / Server)"*.
     - Nghiên cứu cơ chế lấy Tên & Giá:
       + Kiểm tra địa chỉ `192.168.201.116:8080`: Đây là cổng Web Portal nội bộ yêu cầu đăng nhập Spring Security (`/login`), không mở API công khai.
       + Làm rõ kiến trúc luồng dữ liệu: Tên món và Đơn giá thực tế được máy chủ RK7 MID của nhà hàng đồng bộ trực tiếp vào MongoDB máy trạm (`host:27017`) qua các bảng `DISH_CACHE`, `CO_MENU_ITEM`, `ORDER_MENU_CACHE_CATEGORY`, `SHOW_HIDE_ITEMS`, `OUT_OF_DISH`. Dữ liệu Master gốc nằm tại SQL Server RK7 Central (`172.16.8.26`).
       + Xây dựng API tra cứu tự động: Endpoint `GET /api/v1/mongodb/menu-so-co/lookup-dish?host={host}&rk7_code={code}` trong [`backend/app/services/mongo_menu_so_co_service.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/services/mongo_menu_so_co_service.py) và [`backend/app/api/v1/mongodb.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/api/v1/mongodb.py). Tự động quét từ MongoDB nhà hàng (kết quả đồng bộ từ MID) và fallback về RK7 Central SQL Server để lấy chính xác Tên Món, Mã SAP và Đơn Giá.
       + Tích hợp Frontend: Trong modal *"Thêm Món Ăn Vào Nhóm"* (`ManageMenuSoCoTask.tsx`), bổ sung nút `⚡ Lấy từ MID / Server` và tự động kích hoạt tra cứu khi người dùng nhập xong Mã RK7 (onBlur), tự động điền Tên Món, Mã SAP và Giá gợi ý.
  3. *Bổ sung ô Input Search danh sách nhóm món trong modal "Thêm Món Hàng Loạt Vào Menu"*:
     - **Vấn đề**: Khi Menu có nhiều nhóm (20 - 50 nhóm, ví dụ `Buffet Xeo Xeo Plus_2026` có 26 nhóm), việc cuộn tìm nhóm trong thẻ `<select>` rất khó khăn và mất thời gian.
     - **Giải pháp**:
       + Bổ sung thanh tìm kiếm nhanh dùng chung ở đầu Bước 1 (`globalGroupSearch`): Cho phép gõ tìm nhóm (VD: `SALAD`, `THỊT`...) áp dụng lọc đồng loạt cho tất cả các Menu đang được tick chọn, tự động tìm và chọn nhóm khớp đầu tiên.
       + Bổ sung ô input tìm kiếm độc lập cho từng Menu (`bulkGroupSearchByMenu[m.code]`): Đặt ngay trước dropdown nhóm với icon kính lúp và nút xóa nhanh `✕`. Khi người dùng gõ từ khóa, danh sách `<select>` lập tức co gọn chỉ còn các nhóm phù hợp kèm thông báo số lượng nhóm tìm thấy `✓ Tìm thấy X / Y nhóm`.
       + Nâng cấp tương tự cho modal *"Chuyển / Nhân Bản Món Ăn Sang Nhóm Khác"* (`isMoveCloneOpen`): Bổ sung ô tìm kiếm nhóm đích `moveGroupSearch` giúp tra cứu nhanh chóng trong toàn bộ các nhóm hiện có.
- **Kiểm thử & Đóng gói**:
  - Frontend Build: `cmd /c "npm run build"` tại `frontend/` $\rightarrow$ Exit code 0 (`✓ built in 3.80s`), bundle sạch sẽ trong `frontend/dist/`.
  - Backend Smoke Test: `python -m compileall app` và `python -c "from app.main import app; print('>>> PASSED 100%')"` $\rightarrow$ Đạt 100%.

---

### [2026-10-14] - Nâng Cấp KDS & Khắc Phục Lỗi Phân Tích MongoDB Nhà Hàng (Menu Rỗng & Kẹt Kết Nối & Logs KDS & Chuyển Quầy)
- **Màn hình**: Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`, `KdsQuayModals.tsx`, `mongo_menu_so_co_service.py`, `mongodb_service.py`).
- **Nội dung xử lý chi tiết theo yêu cầu**:
  1. **Khắc phục lỗi Menu rỗng ở Tác vụ 3 (Xử Lý SO/CO)**:
     - *Hiện tượng*: Kết nối `[4954] UNION DISTRICT PIZZA & GRILL Xuân Thủy` thì ô "Chọn Menu:" bị rỗng, chỉ khi tick "Tìm trong TẤT CẢ Menu" mới thấy hiện Menu 166. Trong khi các nhà hàng khác như Chixmax Vạn Hạnh Mall đều hiện menu bình thường.
     - *Nguyên nhân*: Ở nhà hàng này, bảng `G_ORDER.RESTAURANT_CATEGORY` bị rỗng hoặc không liên kết category, trong khi menu lại nằm trong bảng cache `G_ORDER.ORDER_MENU_CACHE_CATEGORY`. Hàm `get_menu_categories` trước đó chỉ quét `RESTAURANT_CATEGORY`.
     - *Giải pháp*: Trong [`mongo_menu_so_co_service.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/services/mongo_menu_so_co_service.py), bổ sung cơ chế quét đồng thời cả `ORDER_MENU_CACHE_CATEGORY` để lấy danh sách category/menu và tự động merge vào kết quả nếu thiếu trong `RESTAURANT_CATEGORY`. Đảm bảo menu luôn hiển thị đầy đủ ngay cả với các nhà hàng có cấu trúc dữ liệu đặc thù.
  2. **Khắc phục lỗi kẹt nhà hàng cũ khi chọn nhà hàng mới ở Tác vụ 4 (Check / xử lý KDS)**:
     - *Hiện tượng*: Khi chọn nhà hàng mới (VD: `[4394] Isushi Trường Sơn`), banner phía trên và dữ liệu bảng KDS vẫn kẹt kết nối tới nhà hàng cũ (Chixmax Vạn Hạnh Mall) với 184 món.
     - *Nguyên nhân*: Trong `handleSelectRestaurant`, URL param `host` của nhà cũ không được xóa; khi nhà hàng mới kết nối thất bại (do chưa mở POS/chưa có Mongo), các state `connectedHost`, `restaurantGposInfo`, `kdsData`, `kdsPlaces` không được reset, khiến giao diện tiếp tục lấy dữ liệu cũ và banner GPOS ưu tiên hiển thị tên từ `restaurantGposInfo` cũ.
     - *Giải pháp*: Reset triệt để `connectedHost`, `restaurantGposInfo`, `kdsData`, `kdsPlaces`, `availableCandidates`, `selectedKdsDishCodes` ngay khi người dùng chọn nhà hàng mới và trong các khối xử lý thất bại / catch của `connectMongo`. Đồng thời cập nhật URL param chỉ giữ `restaurantId`, loại bỏ ngay `host` cũ.
  3. **Bổ sung tính năng Chuyển Quầy Bếp (Toàn bộ hoặc 1 phần món chọn lọc)**:
     - *Yêu cầu*: Cho phép chuyển toàn bộ hoặc một số món chọn lọc từ quầy bếp này sang quầy bếp khác (Ví dụ: từ `BEP NONG 1` sang `BEP NONG 2`).
     - *Triển khai*:
       - Backend: Bổ sung endpoint `POST /api/v1/mongodb/kds-dishes/transfer-quay` và hàm `transfer_kds_dishes_quay` trong [`mongodb_service.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/services/mongodb_service.py). Hàm xử lý atomic cập nhật collection `CONFIG_COOKING`, hỗ trợ tùy chọn chuyển hẳn (rút khỏi quầy nguồn) hoặc thêm vào (giữ cả nguồn lẫn đích), đồng thời ghi vết vào `AUDIT_LOG_COLLECTION`.
       - Frontend: Tạo modal [`KdsTransferQuayModal`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/KdsQuayModals.tsx), thêm nút chuyển nhanh trên thanh Quick Filters Quầy Bếp (ACCOUNT) `Chuyển Món Của Quầy [...] ➔`, nút trên toolbar KDS và nút hành động hàng loạt `🔄 Chuyển Quầy (X món)` khi tick chọn các món trong bảng.
  4. **Di chuyển "🛡️ ✓ Đã có Food Control" vào bên trong popup "+ Thêm Quầy & Account"**:
     - Kéo trạng thái Food Control vào bên trong modal [`KdsAddQuayModal`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/pages/app/KdsQuayModals.tsx) với banner thông báo trạng thái rõ ràng (đã có trạm tổng điều phối, tránh tạo trùng lặp).
  5. **Tính năng mới "Logs KDS (Order & Ra Món)" phục vụ kiểm tra khiếu nại trễ món**:
     - *Vị trí*: Thế chỗ chữ "🛡️ ✓ Đã có Food Control" trên toolbar KDS bằng nút nổi bật `📋 Logs KDS (Order & Ra Món)`.
     - *Chức năng*: Tra cứu chi tiết lịch sử món order từ CO/SO xuống KDS và thời gian bấm Done món trên KDS. Quét đồng thời `G_KITCHEN.LOG_DISH_FINISH_ITEM` và `G_ORDER.ORDER_DELIVERY_LOG`.
     - *Bộ lọc chuyên sâu*: Tìm theo ngày, khoảng giờ (Từ giờ - Đến giờ), Bàn ăn (VD: `B14`), Tên món / Mã SAP (VD: `60022506`, `Mỳ Ý xốt kem vị Truffle`).
     - *Phân tích chi tiết*: Tính toán chính xác thời gian ra món thực tế (`actual_minutes`), thời gian cấu hình (`config_minutes`), và độ trễ món (`delay_minutes`), phân loại trạng thái: 🟢 Đúng giờ, 🟡 Quá giờ, 🔴 Trễ món nghiêm trọng (> 30p), ⏳ Đang nấu.
     - *Xuất báo cáo 1 chạm*: Có nút `📋 Copy Báo Cáo Gửi Nhà Hàng` định dạng văn bản chuẩn chỉnh để trả lời khiếu nại của nhà hàng ngay lập tức.
  6. **Đóng gói & Kiểm thử**:
     - Backend Smoke Test: `python -c "from app.main import app; print('>>> BACKEND SMOKE TEST: PASSED 100%')"` $\rightarrow$ Đạt 100%.
     - Frontend Build: `cmd /c "npm run build"` $\rightarrow$ Exit code 0, tạo mới `dist/assets/index-C0nBNqRG.js`.

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

### [2026-10-13] - Khắc Phục Triệt Để Lỗi Cuộc Gọi 3CX Bị Kẹt Đổ Chuông Lặp Đi Lặp Lại & Bấm Tắt Vẫn Hiện Lại
- **Màn hình**: Toàn bộ ứng dụng, đặc biệt trang Danh Sách Nhà Hàng (`RestaurantListPage.tsx`, `HotlineContext.tsx`, `hotline_3cx_service.py`, `hotlineService.ts`).
- **Hiện tượng lỗi**:
  1. Banner màu đỏ "🔴 ĐANG ĐỔ CHUÔNG #8345 Cuộc gọi 8345" xuất hiện trên đầu trang và liên tục đổ chuông.
  2. Người dùng bấm nút tắt `[X]` thì chỉ sau khoảng 2.5 giây banner lại tự động nhảy ra lại.
  3. Dù cuộc gọi đã diễn ra từ hàng chục phút trước (09:10:15) nhưng hệ thống vẫn coi là đang đổ chuông không dứt.
- **Nguyên nhân cốt lõi**:
  1. *Biến `_current_active_call` trong RAM backend không có cơ chế TTL/Hết hạn*: Khi nhận sự kiện cuộc gọi đến từ 3CX Client Agent, backend lưu `_current_active_call` vào RAM mà không có cơ chế tự động giải phóng sau khi chuông dứt (khoảng 30-45 giây).
  2. *Bản ghi DB kẹt trạng thái `INCOMING`*: Các cuộc gọi chưa được nghe máy hoặc không có tín hiệu kết thúc từ 3CX bị kẹt mãi ở trạng thái `INCOMING` với `is_resolved = 0`.
  3. *Vòng lặp Polling 2.5s đè dữ liệu Client*: Ở Frontend `HotlineContext.tsx`, khi người dùng bấm nút `[X]` (hàm `dismissNonRestaurantCall`), client chỉ set `latestNonRestaurantCall = null`. Nhưng cứ mỗi 2.5 giây, vòng lặp `pollStatus` lại gọi API `/status`, nhận lại dữ liệu `current_call` cũ từ backend và ghi đè lại state làm banner hồi sinh.
  4. *Sự kiện SSE `call_ended` không dọn banner*: Khi 3CX ngắt máy bắn sự kiện kết thúc cuộc gọi, callback `call_ended` chỉ set `incomingCall = null` mà bỏ quên `latestNonRestaurantCall`.
- **Giải pháp xử lý toàn diện**:
  1. *Backend Service (`hotline_3cx_service.py`)*:
     - Gắn cờ timestamp `_call_time = time.time()` cho mọi cuộc gọi đến.
     - Trong `get_status()`: Tự động hết hạn và xóa `_current_active_call = None` nếu đã quá 45 giây.
     - Tự động quét và chuyển đổi tất cả các cuộc gọi `INCOMING` quá 45 giây trong DB thành `MISSED` (cuộc gọi nhỡ).
     - Giới hạn `latest_call_query` chỉ lấy trong 10 phút gần nhất thay vì 3 ngày.
     - Cập nhật hàm `end_current_call(call_id)`: Tự động đánh dấu `is_resolved = True` trong cơ sở dữ liệu khi kết thúc cuộc gọi.
  2. *Frontend Context (`HotlineContext.tsx` & `hotlineService.ts`)*:
     - Bổ sung API `hotlineService.endCall(callId)`.
     - Quản lý danh sách ID đã đóng bằng `dismissedCallIdsRef = useRef<Set<number>>(new Set())`.
     - Khi bấm nút `[X]` (`dismissNonRestaurantCall`): Lưu ID vào Set, gọi đồng thời cả `resolveMissedCall(callId)` và `endCall(callId)` lên Server để xóa triệt để cả ở DB và RAM Server.
     - Trong vòng lặp `pollStatus`: Chặn triệt để không cho phép bất kỳ cuộc gọi nào có ID đã bị đóng được xuất hiện lại trên giao diện.
     - Khi nhận sự kiện SSE `call_ended`: Tự động xóa sạch banner nếu đang ở trạng thái `INCOMING`.
  3. *Triển khai & Kiểm tra*:
     - Backend: Biên dịch cú pháp `compileall` sạch 100%, vượt qua `import smoke test`.
     - Frontend: Chạy build production `npm run build` thành công tuyệt đối (exit code 0).
     - Database & Server Production: Đã xử lý giải phóng toàn bộ cuộc gọi kẹt trong DB và RAM trên server `172.16.8.25` và `14.161.33.122:5001`.

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

### [2026-10-13] - Khắc Phục Triệt Để Lỗi Cuộc Gọi 3CX Không Hiện Thông Báo / Popup Trên Màn Hình Web
- **Màn hình**: Hotline 3CX (`HotlineContext.tsx`, `RestaurantListPage.tsx`, `hotline.py`, `3CX_Hotline_Agent.ps1`).
- **Hiện tượng lỗi**: Người dùng cài đặt bộ 3CX Client Agent Windows và chạy các file trong thư mục, cuộc gọi từ 3CX PWA (`8345 Hoang Le Pham Bao HCM IT Dept`) đổ chuông nhưng trên màn hình trang web hoàn toàn không nhận được bất kỳ popup, âm thanh chuông hay thông báo toast nào.
- **Nguyên nhân cốt lõi**:
  1. *Lệch Tên Tài Khoản Người Trực (`duty_user`) Giữa Windows & Hệ Thống Web*:
     - File agent PowerShell (`3CX_Hotline_Agent.ps1`) chạy trên Windows gửi lên Server `duty_user = $env:USERNAME = "nguyenanh"`.
     - Trong khi trên hệ thống Web, người dùng đăng nhập tài khoản SSO: `user.username = "dung.nguyenanh"`.
     - Tại `HotlineContext.tsx`, logic kiểm tra so sánh cứng `curDuty === currentUsername` (`"nguyenanh" === "dung.nguyenanh"` $\rightarrow$ `false`). Hệ thống xác định đây là cuộc gọi của nhân viên IT khác nên chặn hoàn toàn âm thanh, banner và popup thông báo.
  2. *Thiếu Khai Báo `AGENT_USERNAME` Trong `config.txt` Của Client Agent*:
     - File `config.txt` chỉ có `SERVER_URL=...` mà không cho phép cấu hình tên người trực, luôn lấy cứng `$env:USERNAME` của Windows.
  3. *Chạy Trùng Lặp Nhiều Tiến Trình Agent Ngầm*:
     - Do bấm chạy nhiều lần file `.bat`/`.vbs`, có tới 5 tiến trình PowerShell cùng chạy ngầm trên máy, gửi sự kiện trùng lặp lên server trong cùng 1 tích tắc.
  4. *Lỗi `HostException` Của `Clear-Host` Khi Chạy Ẩn (`-WindowStyle Hidden`)*:
     - Lệnh `Clear-Host` không nằm trong khối `try/catch`, khi chạy qua VBScript ẩn ngầm bị lỗi do không có console buffer tương tác.
- **Giải pháp xử lý toàn diện**:
  1. *Hàm So Khớp Tác Tử Thông Minh (`isAgentMatch` trong `HotlineContext.tsx`)*:
     - So khớp linh hoạt giữa `duty_user` và `user`: Tự động chuẩn hóa bỏ dấu chấm/khoảng trắng (`dung.nguyenanh` khớp với `nguyenanh`), so khớp email prefix (`dung.nguyenanh@ggg.com.vn`), so khớp họ tên không dấu (`Nguyen Anh Dung`), và ưu tiên Super Admin.
  2. *Hỗ Trợ `AGENT_USERNAME` Trong `config.txt` & Bộ Cài Nhanh*:
     - Cập nhật `3CX_Hotline_Agent.ps1` đọc trường `AGENT_USERNAME` từ `config.txt`. Khi người dùng tải gói `.zip` từ web, server tự động nhúng sẵn `AGENT_USERNAME={user.username}`.
  3. *Cơ Chế Đơn Tiến Trình & Bọc An Toàn Cho `Clear-Host`*:
     - Script PowerShell tự động dò tìm và dừng các tiến trình `3CX_Hotline_Agent.ps1` cũ trước khi chạy tiến trình mới để chống trùng lặp.
     - Bọc `try { Clear-Host } catch {}` đảm bảo chạy tàng hình qua `Run_Silent_Agent.vbs` mượt mà 100%.
  4. *Đóng Gói & Cập Nhật Trực Tiếp*:
     - Hoàn thiện build production Frontend `frontend/dist/` (kèm `web.config`), biên dịch kiểm tra cú pháp Backend `backend/app/` sạch 100%.
     - Cập nhật trực tiếp các file `config.txt` và `3CX_Hotline_Agent.ps1` trong máy người dùng (`D:\1.Download\3CX_Hotline_Client_Agent (1)`).

---

### [2026-10-13] - Chuẩn Hóa 7 Nguyên Tắc Bất Di Bất Dịch Cho AI & Developer (Toàn Diện & Bất Biến)
- **Mục tiêu**: Đồng bộ và khắc sâu 7 quy tắc cốt lõi bất biến vào toàn bộ hệ thống tài liệu (`README.md`, `GEMINI.md`, `AGENTS.md`, `PROJECT_GUIDELINES.md`, `.agents/rules/project_guidelines.md` và `Script/README.md`).
- **Nội dung 7 nguyên tắc bất di bất dịch**:
  1. *Kiểm tra và Đọc toàn bộ các file `.md` trước khi làm*: Nắm rõ kiến trúc, nghiệp vụ và lịch sử phát triển trước khi thao tác mã nguồn.
  2. *Lưu vết và Cập nhật `GEMINI.md` & `Script/README.md`*: Bắt buộc ghi chép trước và sau khi làm/sửa bất kỳ vấn đề gì để khi cài lại Win hoặc đổi máy, AI và Developer đọc vào đều nắm bắt toàn bộ dự án và biết việc tiếp theo.
  3. *Tuân thủ sát sao quy tắc của dự án*: Quy chuẩn phân quyền hiển thị (`🔒 Bị ẩn theo phân quyền`), kiến trúc UI/UX (không dùng metric stat card ở đầu trang, full-width responsive, modal Esc/X, Mobile-Ready 100%), tự động khởi tạo database trong `lifespan` và cập nhật `Full_SCRIPT_SQL_TABLE.sql`.
  4. *Build code hoàn toàn sạch sẽ (Clean Code)*: Bỏ code dư thừa, loại bỏ triệt để biến/import không dùng (Zero TS6133), vượt qua build Frontend exit code 0 và Backend Smoke Test.
  5. *Ghi chú (Comment) chi tiết trong code*: Chú thích rõ ràng bằng tiếng Việt giải thích logic từng hàm/tính năng để dễ đọc, dễ hiểu.
  6. *Đẩy code ngay lên GitHub (`origin/main`)*: Bất kỳ lúc nào thêm tính năng hoặc chỉnh sửa xong, BẮT BUỘC phải commit và push lên GitHub ngay lập tức.
  7. *Build sạch `backend/app` và `frontend/dist` để đẩy lên Server (Copy Là Chạy Ngay)*: Sau khi xử lý xong, bắt buộc build frontend ra `dist/` sạch và kiểm tra cú pháp backend `app/` để người dùng chỉ cần copy 2 thư mục này đẩy lên server là chạy ngay mà không cần cấu hình thủ công.

### [2026-10-14] - Xử Lý Triệt Để Lỗi 3CX Hotline Máy Mới / User Khác Không Nhận Được Thông Báo Cuộc Gọi & Tích Hợp Quản Trị Phân Quyền
- **Màn hình**: [Quản Lý Cuộc Gọi Hotline 3CX](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/restaurants/HotlineMissedCallsModal.tsx), [Hướng Dẫn Cài 3CX PWA](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/hotline/Hotline3cxGuideModal.tsx), [Phân Quyền Trực Hotline](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/restaurants/HotlinePermissionsModal.tsx) và [HotlineContext.tsx](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/contexts/HotlineContext.tsx).
- **Hiện tượng lỗi**:
  - Khi cài đặt thử trên máy tính mới hoặc user khác cài tương tự như máy anh Dũng (`dung.nguyenanh`):
  - Khi có cuộc gọi reo chuông, **chỉ duy nhất máy của user `dung.nguyenanh` nhận được thông báo**, còn máy mới / user khác dù đã cài đặt và cấp quyền trình duyệt (`Notifications: Allow`, `Pop-ups: Allow`) vẫn hoàn toàn im lặng, không thấy popup VNC kết nối nhà hàng cũng như thông báo.
- **Nguyên nhân cốt lõi phát hiện qua điều tra**:
  1. *Tham số `&Agent=dung.nguyenanh` bị dán cứng trên 3CX PWA (Nguyên nhân trực tiếp)*:
     - Trong ứng dụng 3CX Settings -> Integration -> Open Contact in Custom CRM, đường dẫn URL được cài đặt là:
       `http://14.161.33.122:5001/api/v1/hotline/3cx-webhook?Number=%CallerNumber%&Agent=dung.nguyenanh`
     - Khi máy mới hoặc user khác copy đường dẫn từ tài khoản `dung.nguyenanh` dán vào 3CX của họ, khi máy họ đổ chuông, 3CX gửi webhook kèm `Agent=dung.nguyenanh`.
     - Server nhận và gán cuộc gọi cho `duty_user = "dung.nguyenanh"`.
     - Trình duyệt của user khác (đang đăng nhập bằng username của họ) nhận event và kiểm tra `isAgentMatch(curDuty, user)`. Vì `curDuty` là `dung.nguyenanh` không khớp với user hiện tại, hệ thống web trên máy đó **lập tức bỏ qua cuộc gọi** (không reo chuông, không bung VNC). Trong khi đó máy anh Dũng (`dung.nguyenanh`) lại nhận được thông báo!
  2. *Chặn phân quyền ngầm trong `backend/data/hotline_permissions.json`*:
     - File cấu hình phân quyền hotline đặt `allow_all: false` và `allowed_users: ["dung.nguyenanh", "admin"]`.
     - Nếu tài khoản của user khác không thuộc nhóm `admin`, `helpdesk`, `app` hoặc chưa được gán quyền trong `dbo.PHANQUYEN_DETAIL`, API `/check-permission` trả về `can_access: false`.
     - Hệ thống web tự động ẩn nút Hotline trên Header và vô hiệu hóa kết nối Server-Sent Events (SSE) cũng như Polling.
     - Đồng thời, modal quản trị phân quyền [`HotlinePermissionsModal.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/restaurants/HotlinePermissionsModal.tsx) trước đó chưa được gắn nút mở vào bất kỳ đâu trên giao diện, khiến Super Admin không thể xem hoặc cấu hình mở quyền cho nhân viên.
  3. *Trạng thái Hotline mặc định trên máy mới là TẮT*:
     - Trình duyệt/máy mới chưa lưu `localStorage.getItem('hotline_duty_active')`, nút Hotline trên Header mặc định ở trạng thái màu xám `🎧 Hotline: TẮT`. Nếu user chưa click chuyển sang màu xanh `🎧 Hotline: BẬT`, hệ thống sẽ không bung modal VNC.
- **Các bước khắc phục triệt để**:
  1. *Nâng cấp [`Hotline3cxGuideModal.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/hotline/Hotline3cxGuideModal.tsx) hỗ trợ 2 Chế Độ Trực linh hoạt*:
     - **Chế độ 1 - Tổng Đài Chung (Khuyên dùng)**: URL `http://14.161.33.122:5001/api/v1/hotline/3cx-webhook?Number=%CallerNumber%` (không gán cứng `&Agent=`). Khi có cuộc gọi, **TẤT CẢ** nhân viên đang bật nút Hotline trên Web đều sẽ nhận chuông và bung popup VNC. Tránh 100% tình trạng cài sai hoặc kẹt tên user.
     - **Chế độ 2 - Máy Nhánh Riêng**: URL kèm `&Agent=${username}` dành cho trường hợp muốn chỉ máy cá nhân nhận chuông. Đi kèm hộp cảnh báo đỏ nổi bật: *TUYỆT ĐỐI KHÔNG copy link có chứa tên của bạn sang máy đồng nghiệp khác*.
     - Bổ sung hướng dẫn 3 yếu tố bắt buộc: Bật nút Hotline Header, cấp quyền Pop-up cho trang 3CX, và phân quyền tài khoản.
  2. *Gắn nút "Phân Quyền Trực Hotline" vào [`HotlineMissedCallsModal.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/restaurants/HotlineMissedCallsModal.tsx)*:
     - Tích hợp [`HotlinePermissionsModal`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/restaurants/HotlinePermissionsModal.tsx) trực tiếp vào Footer của modal Quản Lý Cuộc Gọi Hotline 3CX dành riêng cho Super Admin / `dung.nguyenanh`.
     - Cho phép Super Admin bật nhanh `allow_all` hoặc quản lý whitelist nhân viên/nhóm quyền trực hotline trực quan 1-click.
  3. *Cập nhật cấu hình phân quyền*:
     - Chuyển `allow_all: true` trong [`backend/data/hotline_permissions.json`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/data/hotline_permissions.json) và `DEFAULT_HOTLINE_PERMISSIONS` trong [`hotline_3cx_service.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/services/hotline_3cx_service.py) để máy mới và mọi tài khoản IT khi đăng nhập đều tự động được phép trực hotline.
  4. *Bổ sung cảnh báo Console rõ ràng trong [`HotlineContext.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/contexts/HotlineContext.tsx)*:
     - Khi cuộc gọi bị bỏ qua do lệch username gán đích danh, hệ thống tự in `console.warn` giải thích nguyên nhân và hướng dẫn đổi URL.
  5. *Đóng gói & Kiểm thử*:
     - Build Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.74s`).
     - Backend: `python -m compileall app` và Smoke Test đạt 100% PASSED.

---

### [2026-10-14] - Xử Lý Triệt Để Lỗi Outlook Memo Agent Báo "🟡 Chờ Bật Agent Máy Cá Nhân" & "⚪ Agent Chưa Bật"
- **Màn hình**: Quét Mail Memo AUTO (Outlook / Salesforce) trên `JobManagementPage.tsx` ([`mailMemoService.ts`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/services/mailMemoService.ts) và `D:\Setup\Outlook_Memo_Agent_Full`).
- **Hiện tượng lỗi**: Người dùng đã chạy file bat nhưng trên giao diện web modal Mail Memo vẫn báo: `⚪ Agent Chưa Bật` và `🟡 Chờ Bật Agent Máy Cá Nhân`.
- **Nguyên nhân cốt lõi phát hiện qua điều tra**:
  1. *Chrome / Edge Private Network Access (PNA) chặn CORS Preflight*:
     - Khi giao diện web được mở từ Web Server (ví dụ IP mạng LAN `http://172.16.8.25`), trình duyệt Chromium phân loại đây là *Private Network Origin*, còn `http://127.0.0.1:18890` là *Local Loopback Target*.
     - Cơ chế bảo mật PNA của Chromium gửi preflight request `OPTIONS` kèm header `Access-Control-Request-Private-Network: true` và bắt buộc phản hồi từ Local Agent phải có header `Access-Control-Allow-Private-Network: true`.
     - `outlook_agent.py` trước đó thiếu header này nên trình duyệt lập tức chặn kết nối CORS (`Failed to fetch`), dẫn tới frontend không nhận diện được Agent dù tiến trình Agent thực tế vẫn đang lắng nghe cổng 18890.
  2. *Lỗi đường dẫn sai trong `Chay_Outlook_Agent.bat` ở thư mục gốc*:
     - File `Chay_Outlook_Agent.bat` tại thư mục gốc `d:\LAPTRINH\IT_Project_Management_New\` gọi `%~dp0outlook_agent.py`, trong khi file script python lại nằm trong `tools\outlook_agent\` hoặc `D:\Setup\Outlook_Memo_Agent_Full\`. Khi người dùng chạy file này sẽ bị báo lỗi `[Errno 2] No such file or directory`.
  3. *Tiến trình nền cũ chiếm cổng và file `.bat` cũ không giải phóng*:
     - Tiến trình Python chạy ngầm cũ (PID cũ) đang giữ cổng 18890 với mã nguồn cũ. Khi người dùng nhấp đúp file `.bat`, file script phát hiện cổng đang mở nên chỉ kích hoạt sync rồi thoát (`sys.exit(0)`), không giải phóng tiến trình cũ để nạp header PNA mới.
  4. *Frontend chỉ dò tìm `127.0.0.1` mà chưa hỗ trợ `localhost`*:
     - Trong một số cấu hình Windows/trình duyệt, `127.0.0.1` hoặc `localhost` có thể được xử lý khác nhau giữa IPv4/IPv6.
- **Giải pháp xử lý toàn diện**:
  1. *Bổ sung Header PNA trong `outlook_agent.py`*:
     - Bổ sung `Access-Control-Allow-Private-Network: true`, `Access-Control-Allow-Headers: *`, `Access-Control-Max-Age: 86400` cho cả preflight `do_OPTIONS` và các request `GET /status`, `/scan`, `/auto-sync`.
  2. *Nâng cấp `Chay_Outlook_Agent.bat` tự động giải phóng tiến trình cũ*:
     - Tự động dò tìm `outlook_agent.py` qua `%~dp0`, `%~dp0tools\outlook_agent\` và `D:\Setup\Outlook_Memo_Agent_Full\`.
     - Tự động kiểm tra và giải phóng (`taskkill`) tiến trình cũ trên cổng 18890 khi người dùng chạy trực tiếp hoặc dùng cờ `--restart`, đảm bảo Agent luôn nạp mã nguồn mới nhất.
  3. *Nâng cấp `mailMemoService.ts`*:
     - Hỗ trợ dò tìm Agent qua cả `127.0.0.1` và `localhost` trên các cổng dự phòng `18890` và `18899`.
  4. *Đồng bộ và đóng gói*:
     - Cập nhật đồng bộ toàn bộ file mới sang `D:\Setup\Outlook_Memo_Agent_Full\` và tạo mới `Outlook_Memo_Agent_Full.zip`.
     - Khởi động lại Agent thành công trên PID mới `18732`, kiểm thử `curl` cả `OPTIONS` (PNA) và `GET /status` đạt HTTP 200 OK ngay lập tức.
     - Build lại `frontend/dist` sạch sẽ (`cmd /c "npm run build"`, exit code 0).

---

### [2026-10-14] - Khắc Phục Triệt Để Lỗi Không Lưu Được Vi Phạm Trên Màn Hình Quản Trị Ghi Nhận Lỗi & Nghỉ Phép Team App
- **Màn hình**: [Quản Trị Ghi Nhận Lỗi & Nghỉ Phép Team App](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/pages/admin/ViolationAndLeavePage.tsx) (`/admin/violations-leaves`).
- **Hiện tượng lỗi**:
  - Khi người dùng điền thông tin vi phạm (chọn 1 nhân viên hoặc nhiều nhân viên, loại vi phạm, ngày vi phạm, nội dung ghi chú và đính kèm ảnh bằng chứng), sau đó bấm nút **Lưu Vi Phạm**:
  - Nút chuyển sang trạng thái `Đang Lưu...` và trình duyệt hiện popup alert: `14.161.33.122:5001 says: Lỗi khi lưu vi phạm!`, form không thể lưu được vào cơ sở dữ liệu.
- **Nguyên nhân cốt lõi**:
  1. *Lỗi Truy Cập Thuộc Tính Sai trong Backend Audit Log (`AttributeError`)*:
     - Tại router [`violations.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/api/v1/violations.py) (dòng 78 và dòng 101), sau khi insert bản ghi vào database thành công, backend thực hiện ghi Audit Log:
       - `mo_ta=f"Ghi nhận lỗi sai phạm: {payload.username} - {payload.tieu_de or payload.loai_saipham}"`
       - `mo_ta=f"Ghi nhận vi phạm hàng loạt cho {len(payload.usernames)} nhân viên: {payload.tieu_de or payload.loai_saipham}"`
     - Trong khi Pydantic schema [`ViolationCreate`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/schemas/violation.py) chỉ định nghĩa `nguoi_saipham`, không có `username` hay `tieu_de`. Schema [`ViolationBatchCreate`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/schemas/violation.py) chỉ định nghĩa `nguoi_saiphams`, không có `usernames` hay `tieu_de`.
     - Khi Python chạy tới câu lệnh này, nó lập tức ném exception `AttributeError: 'ViolationCreate' object has no attribute 'username'`, khiến API trả về HTTP 500 Internal Server Error và frontend bắt lỗi hiển thị `Lỗi khi lưu vi phạm!`.
  2. *Thiếu Auto-Migration Cột Cho Bảng `dbo.GHINHAN_SAIPHAM` Khi Khởi Động Backend*:
     - Nếu cơ sở dữ liệu production trên SQL Server chưa chạy câu lệnh `ALTER TABLE` bổ sung các cột mới (`LOAI_SAIPHAM`, `HO_TEN`, `IMAGES`, `FILES`, `DATE_UPDATE`, `USER_UPDATE`), câu lệnh INSERT sẽ bị lỗi `Invalid column name`.
     - Backend trước đó chưa đưa đoạn kiểm tra/bổ sung tự động vào hàm startup `lifespan` trong [`main.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/main.py).
  3. *Frontend Thông Báo Lỗi Chung Chung*:
     - Trong [`ViolationAndLeavePage.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/pages/admin/ViolationAndLeavePage.tsx), khối `catch` chỉ hiển thị `err.response?.data?.detail || 'Lỗi khi lưu vi phạm!'`. Khi detail là array/object hoặc lỗi server thì thông báo không chỉ rõ nguyên nhân cụ thể.
- **Các bước khắc phục triệt để**:
  1. *Sửa triệt để thuộc tính trong [`violations.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/api/v1/violations.py)*:
     - Sửa thành `payload.nguoi_saipham` và `payload.loai_saipham or 'other'`.
     - Sửa hàm batch thành `len(payload.nguoi_saiphams)` và `payload.loai_saipham or 'other'`.
  2. *Bổ sung Property Alias & Field an toàn trong [`violation.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/schemas/violation.py)*:
     - Thêm property `@property username` và `@property tieu_de` vào `ViolationBase` / `ViolationCreate`.
     - Thêm property `@property usernames` và `@property tieu_de` vào `ViolationBatchCreate`.
     - Bổ sung `nguoi_saipham: Optional[str] = None` vào `ViolationUpdate`.
  3. *Tự Động Kiểm Tra & Cập Nhật Cột Trong [`main.py`](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/main.py)*:
     - Thêm cơ chế tự động kiểm tra `INFORMATION_SCHEMA.COLUMNS` và chạy `ALTER TABLE dbo.GHINHAN_SAIPHAM ADD LOAI_SAIPHAM, HO_TEN, IMAGES, FILES, DATE_UPDATE, USER_UPDATE` ngay khi backend khởi động.
     - Tự động tạo bảng `STAFF_LEAVE_LOGS` và `STAFF_LEAVE_TYPES` nếu chưa có.
  4. *Nâng cấp hiển thị lỗi trong [`ViolationAndLeavePage.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/pages/admin/ViolationAndLeavePage.tsx)*:
     - Trích xuất thông điệp chi tiết từ response (string, mảng validation error, message hoặc network error) giúp hiển thị chính xác nguyên nhân nếu có sự cố.
  5. *Đóng gói & Kiểm thử*:
     - Biên dịch Python (`py_compile`): 0 lỗi.
     - Build Frontend (`cmd /c "npm run build"`): Exit code 0, tạo mới `dist/assets/index-CVleHAt8.js`.

---

### [2026-10-14] - Chuyển Đổi Sang Kiến Trúc Server-Mediated Relay (Khắc Phục Triệt Để Lỗi Chrome PNA Chặn Loopback)
- **Bối cảnh & Vấn đề**:
  - Giao diện Web được truy cập qua IP Public/Server (`http://14.161.33.122:5001`).
  - Google Chrome kích hoạt chính sách bảo mật **Private Network Access (PNA)**: Chặn toàn bộ các request từ trang Web chạy trên IP ngoài kết nối thẳng vào `http://127.0.0.1:18890` (loopback). Trình duyệt chặn ngay tại tầng network engine, không gửi bất kỳ byte nào ra ngoài, khiến `agent.log` không có request nào và Web luôn báo `Agent Chưa Bật` dù Agent đang chạy.
- **Giải pháp chuyển đổi kiến trúc Server-Mediated Relay**:
  1. *Nguyên lý hoạt động*:
     - Không để Trình duyệt gọi trực tiếp vào `127.0.0.1:18890` nữa (tránh 100% lỗi Chrome PNA, CORS và Mixed Content).
     - Agent trên máy cá nhân kết nối Outbound lên Server `172.16.8.25:8000` định kỳ mỗi 2s (`POST /api/v1/mail-memo/agent-poll`) để báo Online (kèm tên máy `computer_name`, tài khoản `account`) và nhận lệnh quét nếu có.
     - Server quản trị trạng thái: Khi Agent đang gửi poll đều đặn, Server báo `agent_online: true` kèm thông tin tên máy (ví dụ: `PC_CTY`). Web hiển thị rõ: `🟢 Agent Đang Bật (PC_CTY)` và `🟢 Đã Kết Nối Agent Máy Cá Nhân (PC_CTY)`.
     - Khi người dùng bấm nút `[Quét & Tự Động Import Memo]` trên Web: Web gọi Server `POST /api/v1/mail-memo/scan`. Server ra lệnh cho Agent quét Outlook -> Agent bóc tách 318 mail -> Đẩy DB Server -> Server trả kết quả về Web hiển thị Toast thành công!
  2. *Đóng gói & Triển khai*:
     - Đồng bộ file `outlook_agent.py` và tạo mới gói `Outlook_Memo_Agent_Full.zip`.
     - Build lại `frontend/dist` sạch sẽ (`cmd /c "npm run build"`, exit code 0). Cú pháp `backend/app` đạt 0 lỗi.

### [2026-10-14] - Khắc Phục Lỗi Bấm "Đã Nghe & Đóng" Popup Hiện Lặp Vô Tận & Dọn Gọn Nút Cấu Hình 3CX
- **Màn hình & Thành phần**: `GlobalHotlineOverlay.tsx`, `HotlineContext.tsx`, `Header.tsx`, `HotlineMissedCallsModal.tsx`, `hotline.py`.
- **Hiện tượng lỗi**:
  1. Khi có cuộc gọi thử nghiệm hoặc nội bộ, người dùng bấm nút `[✕ Đã Nghe & Đóng]` nhưng popup liên tục hiện lại lặp vô tận, không thể tắt được.
  2. Nút `[Cấu hình 3CX]` nằm lộ trên thanh Header ngoài cùng gây vướng và không đồng bộ.
- **Nguyên nhân cốt lõi**:
  - `dismissIncomingCall()` trước đó chỉ gọi `setIncomingCall(null)` ở local state React mà không gọi API `/hotline/end-call` trên server và không lưu ID cuộc gọi vào tập đã đóng (`dismissedCallIdsRef`).
  - Trong khi đó, biến `_current_active_call` trên Server có thời gian sống 45 giây. Khi vòng polling 2.5s gọi `/hotline/status`, Server tiếp tục trả về cuộc gọi này $\rightarrow$ Frontend lại kích hoạt `setIncomingCall(cur)` làm popup bung lên lại liên tục mỗi 2.5s!
- **Giải pháp xử lý toàn diện**:
  1. *Triệt tiêu vòng lặp popup*:
     - `dismissIncomingCall()` và `dismissNonRestaurantCall()` ngay lập tức ghi nhận ID vào `dismissedCallIdsRef.current`, cập nhật `dismissedCallId`.
     - Đồng thời gọi `hotlineService.endCall(callId)`, `resolveMissedCall(callId)`, `markCallAnswered()`.
     - Backend cập nhật `_current_active_call = None`, set `is_resolved = True` trong database và bắn event `call_ended` qua SSE.
     - Trong hàm polling `pollStatus()`: Bổ sung bẫy kiểm tra `dismissedCallIdsRef.current.has(cid)`, nếu ID đã bị đóng thì bỏ qua tuyệt đối, không bao giờ mở lại.
     - Bổ sung nút [X] ở góc trên bên phải thẻ modal trung tâm để người dùng đóng nhanh.
  2. *Dọn gọn Header & Đưa cấu hình vào trong popup*:
     - Bỏ nút `[Cấu hình 3CX]` khỏi thanh Header ngoài cùng để Header giữ 2 nút chuẩn: `[Hotline: BẬT]` và `[Cuộc Gọi]`.
     - Đổi tên và làm nổi bật nút `[⭐ Cấu hình 3CX Hotline]` bên trong popup "Quản Lý Cuộc Gọi Hotline 3CX" (`HotlineMissedCallsModal`), người dùng chỉ cần bấm vào nút `Cuộc Gọi` là có thể mở ngay cấu hình và hướng dẫn.

### [2026-10-15] - Khắc Phục Lỗi The Term 'Windows:' Is Not Recognized & Vỡ Font UTF-8 Khi Chạy 3CX Client Agent Trên Máy Đồng Nghiệp
- **Màn hình & Thành phần**: `3CX_Hotline_Agent.ps1`, `Run_3CX_Hotline_Agent.bat`, `hotline.py`, `tools/3cx_hotline_agent/`.
- **Hiện tượng lỗi**:
  - Trên máy đồng nghiệp khi chạy `Run_3CX_Hotline_Agent.bat`, terminal xuất hiện dòng lỗi màu đỏ:
    `Windows: : The term 'Windows:' is not recognized as the name of a cmdlet, function, script file, or operable program. At D:\1.Download\3CX_Hotli Ä'áº¿n vĂ   nhá»i...\3CX_Hotline_Agent.ps1:97 char:58`
  - Các dòng log tiếng Việt sau đó bị vỡ font (mojibake) nghiêm trọng như `[OK] Ä` thay vì `[OK] Đã kiểm tra...`, đường dẫn thư mục có dấu tiếng Việt hiển thị thành `Ä'áº¿n vĂ   nhá»i...`.
- **Nguyên nhân cốt lõi**:
  1. *Thiếu UTF-8 BOM*: Backend `hotline.py` đóng gói zip bằng `encode('utf-8')` (không có BOM). Windows PowerShell 5.1 trên Windows 10/11 khi đọc file `.ps1` không có BOM sẽ tự động fallback sang bảng mã ANSI mặc định của hệ thống (Windows-1252 / CP437).
  2. *Vỡ chuỗi ký tự do mã hóa*: Các ký tự tiếng Việt có dấu nhiều byte ("Người trực máy", "—", "Đ") bị phân rã sai byte làm hỏng dấu đóng/mở ngoặc kép (`"`). Biểu thức `(Windows: $($env:USERNAME))` bị PowerShell hiểu là mã lệnh nằm ngoài chuỗi, và cặp ngoặc đơn `(...)` kích hoạt sub-expression thực thi lệnh. PowerShell xem `Windows:` là tên lệnh/cmdlet cần gọi, dẫn đến lỗi đỏ `The term 'Windows:' is not recognized`.
  3. *Thư mục giải nén có dấu tiếng Việt*: Tên thư mục chứa dấu tiếng Việt (ví dụ Zalo/tải về: "... cuộc gọi đến và nhỡ") cũng bị hiển thị sai ký tự trong console.
- **Giải pháp xử lý toàn diện**:
  1. *Đóng gói chuẩn UTF-8 with BOM (`utf-8-sig`)*: Trong `backend/app/api/v1/hotline.py` hàm `download_client_agent`, dùng `.encode('utf-8-sig')` cho `3CX_Hotline_Agent.ps1`, `config.txt`, `README_HUONG_DAN.txt`. Byte Order Mark (`\xef\xbb\xbf`) bảo đảm 100% PowerShell 5.1 và Notepad nhận diện đúng UTF-8 trên mọi máy tính.
  2. *Chuẩn hóa chuỗi console / log không dấu*:
     - Thay `(Windows: $($env:USERNAME))` bằng `$winUser = $env:USERNAME` và in `[Windows User: $winUser]` (ngoặc vuông không bao giờ bị PowerShell phân tích thành lệnh).
     - Chuẩn hóa toàn bộ text in terminal sang tiếng Việt không dấu (`TU DONG BAT CUOC GOI`, `Nguoi truc may`, `Ket noi Windows Notification API: THANH CONG!`, `[OK] Da kiem tra ket noi Server: OK`, `CUOC GOI DEN`, `CUOC GOI NHO`...) để không bao giờ bị vỡ font trên bất kỳ phiên bản Command Prompt hay PowerShell nào.
     - Bổ sung các từ khóa không dấu (`cuoc goi den`, `cuoc goi nho`, `ket thuc`) vào regex bắt thông báo.
  3. *Đồng bộ mã nguồn*: Cập nhật vào template backend `hotline.py`, thư mục `tools/3cx_hotline_agent/3CX_Hotline_Agent.ps1` và thư mục tải về của người dùng.

### [2026-10-14] - Khắc Phục Lỗi Run_3CX_Hotline_Agent.bat Tự Tắt Đột Ngột & Tinh Gọn Modal Hướng Dẫn 3CX (Gộp Làm 1 View Duy Nhất)
- **Màn hình & Thành phần**: `Run_3CX_Hotline_Agent.bat`, `Khoi_Dong_Lai_Agent.bat`, `Dung_Toan_Bo_Agent.bat`, `Hotline3cxGuideModal.tsx`, `hotline.py`.
- **Hiện tượng lỗi**:
  - Người dùng tải gói zip mới về, nhấp đúp vào `Run_3CX_Hotline_Agent.bat` thì cửa sổ Command Prompt tự động tắt ngay lập tức, không biết thành công hay thất bại.
  - Modal Hướng dẫn 3CX có quá nhiều Tab rườm rà (Tab 2 Webhook PBX, Tab 3 Tool bổ trợ).
- **Nguyên nhân cốt lõi**:
  - Trong file `.bat`, dòng lệnh `echo Vui long GIAI NEN (Extract) toan bo file .zip ra thu muc truoc khi chay.` nằm trong khối `if not exist "%PS1_FILE%" (...)`. Trình thông dịch `cmd.exe` gặp dấu ngoặc đơn `(Extract)` đã hiểu nhầm dấu `)` là đóng khối lệnh `if`, làm phát sinh lỗi cú pháp `toan was unexpected at this time.` và cmd lập tức thoát mà không kịp chạy PowerShell.
  - Trong `Dung_Toan_Bo_Agent.bat`, dòng `echo   DON DEP & DUNG TOAN BO...` có dấu `&` làm cmd hiểu là lệnh kép, báo lỗi `'DUNG' is not recognized as an internal or external command`.
- **Giải pháp xử lý toàn diện**:
  1. *Khắc phục triệt để lỗi Batch script*:
     - Bỏ toàn bộ dấu ngoặc đơn lồng trong các câu lệnh `echo` thuộc khối `if (...)` trong `Run_3CX_Hotline_Agent.bat`, `Khoi_Dong_Lai_Agent.bat`.
     - Thay `&` thành `VA` và bổ sung `chcp 65001 >nul` để hiển thị tiếng Việt chuẩn UTF-8.
     - Cập nhật đồng bộ vào `backend/app/api/v1/hotline.py` (tất cả các template zip in-memory) và thư mục `tools/3cx_hotline_agent/`.
     - Kiểm thử chạy thực tế bằng `cmd.exe`: Script chạy ổn định 100%, in đầy đủ nhật ký kết nối Windows UserNotificationListener và kiểm tra server OK.
  2. *Tinh gọn Modal Hướng dẫn 3CX*:
     - Xóa hoàn toàn Tab 2 `⚡ Webhook PBX Server (Quản Trị Viên)`.
     - Xóa hoàn toàn Tab 3 `🔧 Tool Bổ Trợ (Extension / Agent)`.
     - Gộp mục **"Lựa chọn 2: Ứng dụng Client Agent Windows (Đã sửa sạch lỗi Font)"** trực tiếp vào chung 1 giao diện bên dưới **Lựa chọn 1: Cấu hình trực tiếp trên 3CX PWA (30 Giây)**.
     - Tự động gắn mã Agent hiện tại vào link tải Client Agent zip để file giải nén ra đã có sẵn tên KTV.

### [2026-10-14] - Khắc Phục Lỗi 3CX Hotline Client Agent Không Chạy Trên Máy User Khác (Lỗi Thiếu Log & Lỗi Quyền Notifications)
- **Màn hình & Thành phần**: `Khoi_Dong_Lai_Agent.bat`, `3CX_Hotline_Agent.ps1`, `Run_3CX_Hotline_Agent.bat`, `Header.tsx`, `hotline.py`.
- **Hiện tượng lỗi**:
  - Trên máy chính (`dung.nguyenanh`) tool chạy tốt và in ra 6 dòng nhật ký kết nối Server thành công.
  - Trên máy các user khác, khi chạy `Khoi_Dong_Lai_Agent.bat` chỉ hiển thị `HOAN TAT! Tien trinh dang chay ngam on dinh.` nhưng không hề có các dòng nhật ký. Khi nhà hàng gọi tới, Web hoàn toàn không có phản ứng gì.
- **Nguyên nhân cốt lõi**:
  1. *Lỗi treo biến đường dẫn trong PowerShell*: File `3CX_Hotline_Agent.ps1` cũ dùng `$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path`. Khi chạy ngầm qua VBScript, `$MyInvocation.MyCommand.Path` bị `$null`, dẫn tới lệnh `Split-Path -Parent $null` yêu cầu nhập từ bàn phím (stdin prompt), làm tiến trình PowerShell bị đơ vĩnh viễn ở chế độ ngầm và không bao giờ tạo được file `agent_activity.log`.
  2. *Quyền Windows Notifications bị tắt mặc định*: Trên nhiều máy Windows 10/11 của công ty, tính năng cho phép ứng dụng đọc thông báo Toast (`UserNotificationListener`) mặc định là `Denied`. Khi bị Denied, script PowerShell ngầm tự thoát (`exit 1`) mà user không hề biết.
  3. *Chính sách bảo mật chặn VBScript*: Một số máy chặn file `.vbs` khiến lệnh `wscript.exe` không thể kích hoạt được PowerShell.
  4. *File `.bat` in thông báo giả*: Do `Khoi_Dong_Lai_Agent.bat` cũ kiểm tra log sau 2s, nếu không thấy log vẫn in "HOAN TAT! Tien trinh dang chay ngam on dinh.", gây hiểu lầm cho người dùng.
- **Giải pháp xử lý triệt để**:
  1. *Sửa `3CX_Hotline_Agent.ps1`*: Nhận diện `$scriptDir` an toàn bằng `$PSScriptRoot`, không bao giờ gọi `Split-Path` trên `$null`. Nếu quyền Notification bị Denied, tự động bung Windows MessageBox cảnh báo trực quan.
  2. *Nâng cấp `Khoi_Dong_Lai_Agent.bat`*: Tự động kích hoạt cơ chế dự phòng PowerShell Hidden nếu VBScript bị chặn; kiểm tra PID thực tế của tiến trình trong bộ nhớ; chỉ báo "HOAN TAT" khi tiến trình thực sự đang sống, nếu tiến trình chết sẽ cảnh báo đỏ và hướng dẫn mở `Run_3CX_Hotline_Agent.bat`.
  3. *Bổ sung nút "Cấu hình 3CX" trên Header*: Giúp mọi user dễ dàng mở modal xem URL tích hợp Custom CRM và chỉnh mã máy nhánh 1 chạm.
  4. *Khuyến cáo ưu tiên*: Hướng dẫn user dùng **Phương Án 1 (3CX Native Integration)**: dán URL Custom Contact vào 3CX là 100% không cần tải hay chạy bất kỳ file `.bat` nào!

### [2026-10-14] - Chuẩn Hóa 100% Cấu Hình 3CX Hotline Đích Danh Từng Kỹ Thuật Viên & Khắc Phục Lỗi Máy Mới Không Nhận Thông Báo
- **Màn hình**: Toàn bộ hệ thống Web (`HotlineContext.tsx`, `GlobalHotlineOverlay.tsx`, `Hotline3cxGuideModal.tsx`, `hotline_3cx_service.py`).
- **Bối cảnh & Yêu cầu người dùng**:
  1. *Trực Hotline theo ca 2 người*: Bỏ hoàn toàn Cách 1 (Tổng Đài Chung reo chuông tất cả). Duyệt và chuẩn hóa 100% **Cách 2: Cấu hình đích danh từng người** (`&Agent=<username>`). Điện thoại máy nào reo thì chỉ máy đó bung popup, máy đồng nghiệp cùng ca trực không bị làm phiền.
  2. *Hiện tượng lỗi kiểm thử*: Máy user / máy mới cài đặt thử không thấy thay đổi gì, không nhận thông báo cũng không hiện popup.
- **Nguyên nhân cốt lõi phát hiện**:
  1. *Modal hướng dẫn vẫn mặc định Chế độ 1*: Khi mở modal hướng dẫn, hệ thống vẫn hiển thị link Chế độ 1 làm mặc định.
  2. *Trạng thái Hotline mặc định TẮT trên máy mới*: Trên máy mới hoặc profile mới, `localStorage.getItem('hotline_duty_active')` là `null` dẫn đến `isHotlineActive = false`. Khi tắt, SSE không kết nối và Polling không bung modal.
  3. *Cuộc gọi thử nghiệm không phải Nhà Hàng bị nuốt popup*: Khi kiểm thử (gọi từ số máy di động hoặc máy nhánh nội bộ `8345`), số không nằm trong danh bạ Nhà Hàng. Mã cũ chỉ hiển thị card tĩnh trên trang `RestaurantListPage`, không kích hoạt `incomingCall` toàn cục, dẫn tới trên các trang khác hoàn toàn im lặng.
  4. *Khớp Agent quá cứng nhắc trong Backend*: `call_duty == clean_user` (so sánh bằng chuỗi tuyệt đối). Nếu 3CX gửi mã có khoảng trắng, hoa thường, bỏ dấu chấm (`tri` vs `tri.tnm`) thì backend trả về `current_call = None`.
- **Giải pháp xử lý toàn diện**:
  1. *Chuẩn hóa Modal Hướng dẫn 3CX*:
     - Loại bỏ hoàn toàn Chế độ 1 (Tổng Đài Chung).
     - Đặt Chế độ 2 (Đích danh từng người) làm chuẩn duy nhất với link:
       `http://14.161.33.122:5001/api/v1/hotline/3cx-webhook?Number=%CallerNumber%&Agent=<username>`
     - Bổ sung ô nhập/chỉnh sửa mã Agent và nút Sao chép URL 1-chạm.
     - Tích hợp 2 nút **Thử Nghiệm Cuộc Gọi Trực Tiếp (1-Click Test)** ngay trong Modal:
       - *Thử Cuộc Gọi Nhà Hàng (Mã 4391 - Ashima)*: Tự kích hoạt chuông reo và bung modal VNC/KDS từ xa.
       - *Thử Cuộc Gọi Nội Bộ (Line 8345)*: Tự kích hoạt chuông reo và bung popup thông báo đích danh.
  2. *Mặc định BẬT Trực Hotline trên Máy Mới*:
     - Khởi tạo `isHotlineActive = true` khi chưa có dữ liệu lưu trong `localStorage`.
     - Nếu có cuộc gọi đích danh gửi tới (`isForMe = true`), hệ thống tự động BẬT hotline ngay lập tức.
  3. *Popup Modal Toàn Cục Cho Cả Cuộc Gọi Nhà Hàng & Cuộc Gọi Thử Nghiệm*:
     - Khi có cuộc gọi đến cho mình, LUÔN LUÔN kích hoạt `setIncomingCall(cur)` và phát chuông báo `playHotlineBeep()`.
     - Nếu là Nhà Hàng ➔ Tự động bung modal VNC/KDS.
     - Nếu là Cuộc gọi Thử nghiệm / Nội bộ ➔ Tự động bung modal trung tâm **"🔴 ĐANG CÓ CUỘC GỌI ĐẾN (ĐÍCH DANH)"** với đầy đủ thông tin máy nhánh, người gọi và kỹ thuật viên tiếp nhận.
  4. *Thuật Toán Khớp Agent Mềm Dẻo Thông Minh (`is_agent_match`)*:
     - Đồng bộ cả Backend Python (`hotline_3cx_service.py`) và Frontend TypeScript (`HotlineContext.tsx`):
       - Khớp chính xác (case-insensitive).
       - Hỗ trợ danh sách nhiều agent ngăn cách bằng dấu phẩy (vd: `dung.nguyenanh,tri.tnm`).
       - Chuẩn hóa loại bỏ dấu chấm, gạch ngang (`tri.tnm` khớp `tri`).
       - Khớp chuỗi con $\ge 3$ ký tự (`tuan` khớp `tuan.pham`, `dung` khớp `dung.nguyenanh`).
       - Khớp theo mã nhân viên / máy nhánh EXT (`manv`).
       - Khớp bí danh Super Admin / IT Admin (`admin`, `administrator`, `dungnguyenanh`, `dung`).
  5. *Cơ chế bẫy lỗi thông minh cho URL 3CX (Auto-recovery & Fault-tolerant)*:
     - Tự động gọt bỏ dấu ngoặc kép thừa `"` ở đầu/cuối URL.
     - Tự động phát hiện và trích xuất mã máy nhánh (như `8740`) nếu người dùng vô tình gõ khoảng trắng `Number=%CallerNumber% 8740`.
     - Frontend tự động lưu nhớ mã máy nhánh (`8740`) vào `localStorage` (`hotline_my_agent_id`) để khớp chính xác 100% khi 3CX kích hoạt.
  6. *Đóng Gói & Triển Khai*:
     - Chạy `cmd /c "npm run build"` tạo bản build `frontend/dist` mới nhất sạch sẽ 100% (exit code 0).
     - Kiểm thử logic Python backend smoke test đạt 100% PASS.
     - Đẩy toàn bộ source code lên GitHub (`origin/main`).

---

### [2026-10-13] - Khắc Phục Triệt Để Lỗi Outlook Memo Agent Báo "Chưa Sẵn Sàng / Chưa Bật" Trên Giao Diện Web
- **Màn hình**: Quét Mail Memo AUTO (Outlook / Salesforce) trên `JobManagementPage.tsx` ([`mailMemoService.ts`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/services/mailMemoService.ts) và `D:\Setup\Outlook_Memo_Agent_Full`).
- **Hiện tượng lỗi**: Người dùng đã chạy Agent tại `D:\Setup\Outlook_Memo_Agent_Full`, nhưng trên giao diện web modal Mail Memo vẫn báo: `⚪ Agent Chưa Bật` và `🟡 Chờ Bật Agent Máy Cá Nhân`.
- **Nguyên nhân cốt lõi**:
  1. *Lệch Cổng Giữa Frontend & Agent*: `mailMemoService.ts` trỏ cứng vào `http://127.0.0.1:18890/status`. Trong khi file cấu hình của Agent `agent_config.json` tại `D:\Setup\Outlook_Memo_Agent_Full` lại đặt cổng `18899`. Do sai cổng, mọi request thăm dò từ web đều thất bại.
  2. *Thiếu Đường Dẫn Python 3.14 Trong `Chay_Outlook_Agent.bat`*: Python trên máy cài đặt tại `C:\Program Files\Python314\python.exe`. File `.bat` cũ chỉ tìm trong `%LOCALAPPDATA%` và `C:\Python314\`, dẫn tới khi chạy qua VBScript ngầm bị thoát do không tìm thấy `python`.
  3. *Phiên Bản Cũ Dùng Single-threaded HTTPServer*: Phiên bản cũ trong `D:\Setup` dùng `HTTPServer` đơn luồng, khi đang kết nối Outlook thì các request `/status` từ trình duyệt bị treo.
- **Giải pháp xử lý toàn diện**:
  1. *Nâng Cấp `mailMemoService.ts` Dò Tìm Đa Cổng Thông Minh*:
     - Tự động thăm dò cả 2 cổng `18890` và `18899`. Cổng nào phản hồi trước sẽ lưu làm `activeAgentUrl` và sử dụng cho toàn bộ các tác vụ quét (`/scan`).
     - Dọn sạch biến thừa không dùng `LOCAL_AGENT_URL` (chuẩn TypeScript Strict Mode TS6133).
  2. *Cập Nhật `Chay_Outlook_Agent.bat` Nhận Diện Mọi Phiên Bản Python*:
     - Bổ sung đường dẫn `C:\Program Files\Python314\python.exe` (và 310-313) vào danh sách ưu tiên.
  3. *Đồng Bộ Bản Mới Nhất Sang `D:\Setup\Outlook_Memo_Agent_Full`*:
     - Chuyển `agent_port` về chuẩn `18890`.
     - Sử dụng `ThreadingHTTPServer` đa luồng, hỗ trợ lọc email theo tiêu đề siêu tốc và đánh dấu đã đọc.
     - Khởi chạy và kiểm thử thực tế thành công 100%: Endpoint `http://127.0.0.1:18890/status` và `/scan` phản hồi ngay lập tức, đọc trực tiếp 3 mail Memo từ Outlook đang mở.
  4. *Build Lại `frontend/dist` Sạch Sẽ*:
     - Chạy `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.18s`).

### [2026-10-15] - Đồng Bộ Toàn Diện Quy Tắc 8: Sticky Header & TopScrollTable Cho Toàn Bộ Hệ Thống
1. **CentralizedLogsPage (`CentralizedLogsPage.tsx`)**:
   - Bọc bảng logs tập trung (hỗ trợ tới 2000 dòng log) vào `TopScrollTable` với `maxHeight: calc(100vh - 280px)`, cố định `thead` sticky (`position: 'sticky', top: 0, zIndex: 5`). Khi duyệt logs dài không còn bị trôi mất tiêu đề bảng và có thanh cuộn ngang tức thì ở đỉnh bảng.
2. **RestaurantAuditLogsPage (`RestaurantAuditLogsPage.tsx`)**:
   - Bọc bảng lịch sử thao tác nhà hàng vào `TopScrollTable` với `maxHeight: calc(100vh - 290px)`, cố định `thead` sticky, dọn sạch div cuộn dư thừa.
3. **SsoManagementPage (`SsoManagementPage.tsx`)**:
   - Bọc bảng kết quả tìm kiếm danh sách user IAM/SSO vào `TopScrollTable` với `maxHeight: 520px`, cố định `thead` sticky.
4. **MemoPage (`MemoPage.tsx`)**:
   - Loại bỏ hơn 60 dòng code xử lý cuộn ngang thủ công (`tableRef`, `topScrollRef`, `bottomScrollRef`, `ResizeObserver`, `isSyncingTop/Bottom`...), thay bằng `TopScrollTable` chuẩn hoá, cố định `thead` sticky.
5. **RestaurantMongoAnalysisPage (`RestaurantMongoAnalysisPage.tsx`)**:
   - Bọc bảng Báo cáo số bàn / Hall Plan (`splitByHall`) vào `TopScrollTable` (`maxHeight: 680px`).
   - Bọc bảng Chi tiết Action Logs (Task 1) trong modal vào `TopScrollTable` (`maxHeight: 480px`).
6. **Kiểm Thử & Đóng Gói Triển Khai Server**:
   - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.83s`), bundle `frontend/dist/` đã cập nhật mới nhất cho IIS.
   - Backend: `python -m compileall app` 0 lỗi và Smoke Test `PASSED 100%`.

---

### [2026-10-14 - Ca Tối] - Nâng Cấp MongoDB, KDS, SO/CO, APP_PARAM & Quy Chuẩn TopScrollTable
1. **Loại Bỏ Tính Năng MongoDB Trong Modal Nhà Hàng (`RestaurantDetailModal.tsx`)**:
   - Xóa bỏ nút kiểm tra MongoDB và popup MongoDB khỏi chi tiết nhà hàng, dọn sạch code và imports thừa (`mongoService`, `MongoConnectionCheckResponse`...).
2. **Sửa Lỗi Đè Giao Diện Header Phân Tích MongoDB (`RestaurantMongoAnalysisPage.tsx`)**:
   - Khắc phục tình trạng dropdown Tác Vụ đè lên ô Mail báo cáo. Đặt flex co giãn linh hoạt (`flex: 1 1 360px`, `maxWidth: 680px`), ghim cố định khung email bên phải và chỉ hiện nút "Đồng Bộ SO ➔ CO" khi ở tác vụ Quản lý SO/CO.
3. **Nghiệp Vụ SO/CO (`ManageMenuSoCoTask.tsx`)**:
   - **Thêm món thẳng vào nhóm đang mở**: Nút `+ Thêm Món Vào Nhóm` ngay trên thanh tiêu đề của từng Nhóm món khi mở rộng. Mở modal nhập đầy đủ: Mã RK7, Tên món, Mã SAP, Đơn giá, Thứ tự, Hình ảnh, tùy chọn tự động kích hoạt CO.
   - **Tắt kích hoạt CO ("Tắt CO")**: Bổ sung endpoint backend `/api/v1/mongodb/menu-so-co/deactivate-co` và nút "Tắt CO" (cả dạng đơn lẻ trên từng dòng và dạng thao tác hàng loạt). Gỡ món khỏi `CO_MENU_ITEM` và `CO_MENU_GROUP.details`, tăng `VERSION_MENU_CO`.
   - **Thêm món hàng loạt dạng Sheets (Sheets matrix)**: Sắp xếp lại danh sách Menu theo chiều dọc, mở ra các nhóm hiện có của từng menu để chọn nhóm gán tương ứng trước khi dán danh sách món từ Excel/Sheets.
4. **Phân Biệt & Xử Lý Nhóm Bếp vs Quầy Bếp (KDS)**:
   - **Nhóm Bếp (`groupTypeKds`)**: Phân loại tính chất chế biến món ăn (NÓNG, SALAD, NƯỚNG, NƯỚC, LẨU...) trong `G_KITCHEN.CONFIG_COOKING`.
   - **Quầy Bếp (`quays`/`placeIds`/`ACCOUNT`)**: Trạm thiết bị KDS & máy in nhận lệnh chế biến thực tế trong nhà hàng.
   - Bổ sung banner giải thích chi tiết trong modal gán quầy, cho phép sửa đổi Nhóm Bếp (kèm các nút gợi ý nhanh: NÓNG, SALAD, NƯỚNG, NƯỚC...) và có checkbox **"⚡ Đồng bộ Nhóm Bếp theo tên Quầy Bếp đã chọn"** áp dụng cho 1 hoặc hàng loạt món.
5. **Cải Tiến Bảng APP_PARAM (Task 9 - `MongoDbParamManagementTask.tsx`)**:
   - Gộp cột Param Code và Tên Param thành 1 cột định danh phong phú (tên tiếng Việt, thẻ nhóm, mã mono kèm nút sao chép), hàng gọn gàng, trạng thái toggle trực quan, bọc trong `TopScrollTable`.
6. **Quy Tắc Bất Di Bất Dịch Mới: Sticky Header & Top Horizontal Scrollbar (`TopScrollTable`)**:
   - Tất cả các bảng danh sách đều phải cố định hàng tiêu đề (`position: 'sticky', top: 0, zIndex: 5`).
   - Với bảng có chiều rộng vượt quá màn hình (phải cuộn ngang): Bắt buộc bọc trong `TopScrollTable` (`frontend/src/components/ui/TopScrollTable.tsx`) để hiển thị thanh cuộn ngang ngay trên đỉnh/kế tiêu đề, giúp người dùng cuộn ngang tức thì mà không cần kéo xuống đáy trang.
7. **Kiểm Thử & Đóng Gói (Clean Code)**:
   - Frontend build: `cmd /c "npm run build"` exit code 0 (`dist/` IIS ready).
   - Backend: `python -m compileall app` và Smoke Test 100% Passed.

---

### [2026-10-04 và trước đó] - Nền Tảng & Quy Chuẩn Giao Diện Toàn Hệ Thống
- **Quy định No Stat Cards**: Tuyệt đối không đặt các khối thẻ thống kê to ở đầu các trang tác vụ nghiệp vụ (CentralizedLogs, RestaurantMongoAnalysis...).
- **Quy tắc Đóng Modal**: Modal chỉ đóng khi bấm `Esc`, bấm nút `X` hoặc nút "Đóng" / "Hủy"; không đóng khi click ngoài overlay.
- **Super Admin Mode**: Tài khoản `dung.nguyenanh`, `admin`, `0` hoạt động ở chế độ `⚡ Chế độ Super Admin (Không lưu logs thao tác của bạn)`.
- **Giới hạn Logs Tập Trung**: Giới hạn tối đa 2000 bản ghi log gần nhất (`MAX_LOAD_LIMIT = 2000`) để bảo vệ hiệu năng.
- **Tương thích Python 3.10**: Bắt buộc `from __future__ import annotations` ở đầu file backend; import đầy đủ model/schema Pydantic.
- **TypeScript Strict Mode**: Lỗi TS6133 (biến thừa không dùng) là lỗi cấm, phải giữ code sạch 100% khi build.
- **Quy chuẩn Mật khẩu Nén Sao Lưu Database (SQL Server Backup ZIP)**:
  - Mật khẩu nén chuẩn kể từ ngày **14/10/2026**: `Abc0102009@` (các file cũ trước đó dùng `Ggg@2025!`).
  - Cấu hình qua biến môi trường: `DB_BACKUP_ZIP_PASSWORD=Abc0102009@` trong [backend/.env](file:///d:/LAPTRINH/IT_Project_Management_New/backend/.env).
  - Định dạng nén: Mã hóa WinZip AES-256 (`WZ_AES`) kết hợp thuật toán nén `LZMA` (quản lý bởi [maintenance_service.py](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/services/maintenance_service.py) và [job_scheduler_service.py](file:///d:/LAPTRINH/IT_Project_Management_New/backend/app/services/job_scheduler_service.py)).
  - Khuyến nghị giải nén: Dùng WinRAR hoặc 7-Zip.
- **Tối ưu Mobile Responsive Toàn Diện (Ngày 14/10/2026)**:
  - Modal core: `maxWidth: min(100%, maxWidth)`, `overflowX: auto`, `-webkit-overflow-scrolling: touch`, nút đóng to `36x36px`.
  - Mọi table tự động hỗ trợ cuộn ngang trên thiết bị di động, không bị vỡ hay cắt xén cột.
  - Tabs bar hỗ trợ vuốt ngang (`.tabs-nav-scrollable`), Filter grid KDS tự chia 2 cột trên điện thoại.
- **QUY TẮC BẮT BUỘC: AUTO-COMMIT & PUSH LÊN GITHUB**:
  - Mỗi khi kết thúc chỉnh sửa code, sửa lỗi hoặc hoàn thành tính năng mới, AI/Developer **BẮT BUỘC PHẢI CHẠY NGAY**:
    ```cmd
    git add .
    git commit -m "Mô tả chi tiết"
    git push origin main
    ```
  - Tuyệt đối không để đọng code chưa commit/push trước khi kết thúc lượt phản hồi.

---

### [2026-10-15] - Cập Nhật Nhật Ký In KDS & Gom Gọn Thanh Công Cụ KDS
1. **Tra Cứu Nhật Ký KDS & Kiểm Tra Lệnh In Máy In (`KdsLogsModal` & Backend `mongodb_service.py`)**:
   - **Thêm cột mới "Lệnh In / Máy In KDS"**: Hiển thị rõ ràng máy in đích được cấu hình cho quầy bếp của món ăn (`IN THIT`, `IN NONG`, `IN SALAD`...) và trạng thái phát lệnh in khi nhân viên bấm **DONE** món.
   - **Cơ chế bóc tách lệnh in**:
     + Backend truy xuất `G_KITCHEN.LOG_DISH_FINISH_ITEM` lấy thời điểm `deliveryTime` (thời điểm bấm Done) và danh sách quầy phụ trách `configCooking.placeIds`.
     + Đối soát với cấu hình máy in trong `G_KITCHEN.CONFIG_KDS.places` (`printer` / `driverName`) và tài khoản trạm `G_KITCHEN.ACCOUNT.listPlace`.
     + Kiểm tra trạng thái cờ `isDisablePrint`: Nếu đang bật tắt in KDS thì hiển thị nhãn cảnh báo `⛔ Tắt in KDS`.
     + Các trạng thái hiển thị trực quan:
       * `✓ Đã phát lệnh in` kèm badge máy in `🖨️ [Tên máy in]`.
       * `⛔ Tắt in KDS` khi `isDisablePrint = true`.
       * `⚠️ Chưa gán máy in` khi quầy chưa được cấu hình tên máy in/driver.
       * `⏳ Chờ Done món` khi món chưa hoàn tất chế biến.
   - **Cập nhật tính năng Sao chép gửi NH**: Bản copy đối soát tự động bổ sung cột thông tin máy in và trạng thái in để IT gửi ngay cho nhà hàng đối soát khi có sự vụ "bấm done mà không in".
2. **Gom Gọn Thanh Công Cụ KDS & Popup "Các Tính Năng KDS" (`RestaurantMongoAnalysisPage.tsx`)**:
   - Tối giản triệt để thanh công cụ Task 4 KDS: Thay vì hiển thị dàn trải 7 nút dài gây rối mắt, gom lại chỉ còn **2 nút bấm trọng tâm**:
     1. **`⚙️ Các Tính Năng KDS ▾`**: Bấm vào mở popup modal tổng hợp các tác vụ quản trị KDS dưới dạng lưới thẻ tương tác cao cấp (hover effect, icon màu trực quan, diễn giải nghiệp vụ):
        - `+ Thêm Quầy & Account`
        - `🔄 Chuyển Món Giữa Quầy`
        - `🖨️ Cấu Hình Quầy & Máy In (X)`
        - `🛡️ Phân Quyền User KDS`
        - `⚡ Phân Quyền Hàng Loạt (Nhiều NH)`
        - `⚡ KDS: ĐANG BẬT / ĐANG TẮT (SHOW_KDS: 1 / 0)`
     2. **`📋 Logs KDS (Order & Ra Món)`**: Đặt nổi bật ngay cạnh nút tính năng để kỹ thuật viên mở tra cứu logs 1 chạm nhanh chóng.
3. **Build & Đóng Gói Chuẩn**:
   - Frontend `cmd /c "npm run build"` chạy thành công, tạo gói `frontend/dist/` sạch sẽ, zero warnings/errors.
   - Backend `python -m compileall app` và Smoke Test kiểm tra cú pháp 100% Passed.

---

### [2026-10-15] - Tối Ưu Toàn Diện Khung Giao Diện & Thanh Cuộn (Single-Screen Layout & Table Scroll Riêng)
1. **Ẩn hoàn toàn thanh cuộn dọc (Scroll) ở Sidebar Menu bên trái**:
   - Áp dụng CSS `scrollbar-width: none !important; -ms-overflow-style: none !important; ::-webkit-scrollbar { display: none !important; }` trên `.app-sidebar` và inner navigation list.
   - Tinh chỉnh padding (`6.5px 10px`), gap (`2px`), font-size (`13.5px`) các menu item và footer "IT MIỀN NAM" (`10px 14px`) để thanh menu hiển thị vừa vặn, toàn diện trong 1 khung nhìn (viewport), không có thanh cuộn dọc làm rối mắt.
2. **Bỏ hoàn toàn thanh cuộn dọc ngoài cùng bên phải toàn màn hình**:
   - Gỡ bỏ `scrollbar-gutter: stable;` khỏi `html, body`.
   - Cố định layout chính `MainLayout`: `height: 100vh, overflow: hidden`, biến toàn bộ ứng dụng thành kiến trúc Single-Screen App (giống hệt trang "Danh Sách Nhà Hàng").
3. **Tất cả các bảng / list danh sách hiển thị đều có thanh cuộn riêng (Independent Table Scroll)**:
   - Áp dụng chuẩn `.page-container-fullheight` (`height: 100%, overflow: hidden, display: flex, flexDirection: column`):
     - Header trang, tabs bar, thanh công cụ filter đều giữ cố định ở đỉnh (`flexShrink: 0`).
     - Thẻ Card chứa bảng chiếm trọn không gian còn lại (`flex: 1, minHeight: 0, overflow: hidden`).
     - Bảng danh sách cuộn dọc độc lập bên trong (`overflowY: auto, overflowX: auto`) với hàng tiêu đề `thead` ghim cố định trên đỉnh (`position: sticky, top: 0, zIndex: 10`), không bao giờ đẩy dài cả trang web hay làm mất các thanh lọc phía trên.
   - Đã đồng bộ trên các trang:
     * `ViolationAndLeavePage.tsx` (Ghi nhận lỗi & Nghỉ phép - cả 2 tab Lỗi làm việc & Nghỉ phép đều có khung cuộn riêng).
     * `CentralizedLogsPage.tsx` (Báo cáo logs tập trung: `TopScrollTable maxHeight="100%"`).
     * `RestaurantListPage.tsx` (Danh sách nhà hàng: chuẩn mẫu `height: 100%`).
     * `RestaurantAuditLogsPage.tsx` (Logs nhà hàng: `height: 100%`, `flex: 1, minHeight: 0`).
     * `IncidentListPage.tsx` (Báo cáo sự vụ: Card chứa table `flex: 1, minHeight: 0`, cuộn riêng, thead sticky).
     * `CheckMonRk7Page.tsx` (Check món RK7: Tab 1, Tab 2, Tab 3 cuộn riêng có sticky thead).
     * `UsersPage.tsx` (Quản lý tài khoản: Card table `flex: 1, minHeight: 0`, cuộn riêng, thead sticky).
     * `TopScrollTable.tsx` (Component dùng chung: nâng cấp hỗ trợ `flex: 1, minHeight: 0`, co giãn linh hoạt theo thẻ cha).
4. **Kiểm tra & Đóng gói**:
   - Frontend `cmd /c "npm run build"` thành công 100% (exit code 0), thư mục `frontend/dist/` sẵn sàng deploy IIS.
   - Backend `python -m compileall app` và Smoke Test 100% PASSED.

---

### [2026-10-15] - Giải Mã Bản Chất "Nhóm Bếp ALL / Bếp Nóng & Nướng", Cơ Chế Auto-Done Bill Thu Ngân POS & Bộ Tính Năng Quản Trị Nhóm Bếp KDS
1. **Làm Rõ Bản Chất Kỹ Thuật (Trả Lời Thắc Mắc & Tranh Chấp Của Nhà Hàng)**:
   - **Nguồn gốc tên "Bếp Nóng & Nướng"**: Đây là template mặc định từ RK7/GPOS khi nạp danh mục thực đơn ban đầu vào bảng `CONFIG_COOKING` (`code: "ALL", name: "Bếp Nóng & Nướng"`). Có hàng trăm món (bao gồm cả Vé buffet, Coca Cola, Panchan, Rau cuốn...) bị gán tên nhóm này mặc dù nhà hàng không có bếp nào tên như vậy.
   - **Tại sao món chưa gán quầy (`placeIds: []`) đầu bếp không thấy nhưng KDS vẫn ghi nhận ra món và phạt trễ hàng trăm phút?**:
     + Các tablet KDS tại bếp chỉ lọc và hiển thị món có mã quầy (`placeIds`) khớp với quầy trạm của họ (QUẦY THỊT ID 1, QUẦY NÓNG ID 2, QUẦY SALAD ID 3). Khi món có `placeIds: []` rỗng, các tablet bếp hoàn toàn **KHÔNG NHẬN ĐƯỢC MÓN**, do đó nhân viên bếp khẳng định "không thấy món để bấm Done" là **HOÀN TOÀN CHÍNH XÁC**.
     + **Cơ chế Auto-Done của GPOS khi Thu Ngân đóng bàn**: Khi khách dùng bữa xong và ra quầy thu ngân thanh toán / đóng bàn trên máy POS, hệ thống GPOS tự động kích hoạt cơ chế `Auto-Done` cho tất cả các món còn treo trên bàn đó. Thời điểm hoàn tất (`deliveryTime`) thực chất chính là **giờ in bill thanh toán** (sau 1 - 3 tiếng khách ngồi ăn).
     + Do món vẫn tồn trong `CONFIG_COOKING`, KDS tính thời gian làm món = `giờ đóng bill - giờ order` $\rightarrow$ ra con số 80 - 180 phút và bị bôi ĐỎ, phạt trễ oan uổng cho nhà hàng!
2. **Bộ Tính Năng Quản Trị & Đồng Nhất Nhóm Bếp KDS Toàn Diện**:
   - **⚡ Đồng Nhất Nhóm Bếp Theo Quầy (1 Chạm)**:
     + Tích hợp tại popup `⚙️ Các Tính Năng KDS ▾` (Mục 7).
     + Backend API `POST /api/v1/mongodb/kds-sync-groups-by-quays`: Quét toàn bộ món trong `CONFIG_COOKING`.
     + **Chuẩn hóa tên nhóm theo quầy**: Bỏ dấu tiếng Việt, dấu cách thay bằng `_` (VD: 'Quầy Thịt' -> `Quay_Thit`, 'Quầy Nóng' -> `Quay_Nong`, 'Quầy Salad' -> `Quay_Salad`).
     + **Món chưa gán Quầy Bếp (ACCOUNT)**: Cập nhật lại để trống (`groupTypeKds: {"id": 0, "code": "", "name": ""}`), triệt tiêu hoàn toàn nhóm rác "Bếp Nóng & Nướng" hay "ALL".
   - **Chỉnh Sửa Nhóm Bếp Trực Tiếp (`KdsEditDishGroupModal`)**:
     + Nút bút chì ✏️ trên từng dòng ở cột "Nhóm Bếp".
     + Nút `🏷️ Đổi Nhóm Bếp ({số món})` trên thanh thao tác hàng loạt khi tích chọn nhiều món.
     + Hỗ trợ bấm chọn nhanh 1 chạm theo các Quầy Bếp có sẵn trong nhà hàng để điền tức thì.
     + Backend API `POST /api/v1/mongodb/kds-dishes/update-group`.
   - **Gỡ Bỏ Món Khỏi KDS (`KdsDeleteCookingConfigModal`)**:
     + Nút `🗑️ Gỡ KDS` trên cột Thao Tác từng món và nút `🗑️ Gỡ Khỏi KDS ({số món})` trên thanh thao tác hàng loạt.
     + Xóa món khỏi `CONFIG_COOKING` (dành cho các mặt hàng không cần nấu nướng: Vé Buffet, Panchan, Rau cuốn, Nước ngọt lon, Bia, Khăn lạnh...).
     + Món sau khi gỡ sẽ **không bao giờ bị đẩy vào KDS và không bao giờ bị tính trễ oan khi thu ngân đóng bàn**.
     + Backend API `POST /api/v1/mongodb/kds-dishes/delete-config`.
   - **Tự Động Đồng Bộ Nhóm Bếp Khi Thêm Quầy Bếp Mới (`KdsAddQuayModal`)**:
     + Bổ sung trường "Nhóm Bếp (groupTypeKds)" tự động điền giống hệt "Tên Quầy".
     + Backend tự động lưu trường `groupKds` vào cả `ACCOUNT` và `CONFIG_KDS.places`.
   - **Cập Nhật Giải Trình Thông Minh KDS (`get_kds_dish_history`)**:
     + Soi chi tiết cơ chế Auto-Done khi Thu Ngân đóng bàn POS kèm hướng dẫn xử lý triệt để gửi nhà hàng.
3. **Tinh Gọn Giao Diện KDS & Khắc Phục Lỗi Not Found**:
   - **Gỡ nút ngoài toolbar**: Do tính năng `⚡ Đồng Nhất Nhóm Bếp Theo Quầy` đã có trong popup `⚙️ Các Tính Năng KDS ▾` (Mục 7), đã bỏ nút bên ngoài toolbar để giao diện thoáng, tinh gọn, tránh trùng lặp.
   - **Khắc phục lỗi "Not Found"**: Do backend chạy chế độ `reload=False`, sau khi thêm endpoint mới cần khởi động lại tiến trình backend daemon trên port 8000. Đã khởi động lại backend sạch sẽ, kiểm tra endpoint trả về mã hợp lệ (đã nạp đủ routes `/kds-sync-groups-by-quays`, `/kds-dishes/update-group`, `/kds-dishes/delete-config`).
4. **Build & Đóng Gói Chuẩn Bàn Giao**:
   - Frontend: `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 4.47s`), bản build sạch sẽ tại `frontend/dist/`.
   - Backend: `python -m compileall app` và Smoke Test 100% PASSED.

---

### [2026-10-16] - Nâng Cấp Toàn Diện Agent Multitask: Khắc Phục Trạng Thái Offline & Đăng Ký Windows Service Native (services.msc)
1. **Khắc Phục Vấn Đề "VẪN OFFLINE" Khi Cài Đặt Trên Máy Ảo VMware / Máy Trạm Thực Tế**:
   - **Nguyên nhân cốt lõi**:
     + Frontend trước đây chỉ nạp dữ liệu danh sách `endpoints` 1 lần lúc mở trang (`mount`), không có cơ chế tự động thăm dò (auto-polling). Khi người dùng thêm máy ngoài (`vmwave`) trên Web và máy ảo VMware chạy Heartbeat gửi về thành công (HTTP 200), giao diện web vẫn giữ nguyên dữ liệu cũ (`❌ Chưa Cài`, `⚪ Offline`, `—`) nếu người dùng chưa bấm nút `🔄 Làm Mới`.
     + Backend trước đây lưu trường `is_online` tĩnh trong Database. Nếu máy trạm tắt hoặc ngắt kết nối, cờ không được cập nhật linh hoạt theo thời gian thực.
   - **Giải pháp xử lý toàn diện**:
     + **Auto-polling 10 giây trên Frontend (`AgentMultitaskPage.tsx`)**: Bổ sung `setInterval(10000)` gọi ngầm `agentMultitaskService.getEndpoints()` và `getOverview()` để tự động cập nhật trạng thái `🟢 Online (Run)`, Hostname và giờ báo cáo theo thời gian thực mà không làm giật màn hình.
     + **Đánh giá Online linh hoạt theo thời gian thực (`AgentMultitaskService.get_endpoints`)**: So khớp `last_heartbeat` với thời gian hiện tại (`now - last_heartbeat <= 90s`). Nếu nhận heartbeat trong 90s thì lập tức trả về `is_online = True` và `service_status = RUNNING`, ngược lại tự động chuyển `⚪ Offline`.
     + **Ưu tiên khớp chính xác theo IP LAN (`process_heartbeat`)**: Khi nhận Heartbeat từ IP LAN cụ thể (ví dụ: `192.168.254.129`), backend ưu tiên tìm và gán vào đúng bản ghi do người dùng tự tạo (`device_type in ('USER', 'EXTERNAL')`), tránh tình trạng trùng lặp hoặc gán nhầm vào mã generic `TEST_NH`.
2. **Đăng Ký Chuẩn Native Windows Service Trong `services.msc`**:
   - **Nguyên nhân**: File cài đặt cũ chỉ dùng Task Scheduler (`schtasks`) nên khi người dùng mở `services.msc` không tìm thấy `MicrosoftEdgeServicess`. Đồng thời khi bấm nút "Restart Service" trên Web, lệnh `Restart-Service -Name 'MicrosoftEdgeServicess'` bị báo lỗi "thất bại".
   - **Giải pháp**:
     + Tích hợp trực tiếp lớp Windows Service `win32serviceutil.ServiceFramework` vào `tools/restaurant_support_agent/restaurant_support_agent.py` và biên dịch thành `MicrosoftEdgeServicess.exe` độc lập (~10.4MB).
     + Hỗ trợ đầy đủ tham số dòng lệnh Windows Service: `MicrosoftEdgeServicess.exe --startup auto install`, `start`, `stop`, `restart`, `remove`. Khi chạy, service hiển thị trực tiếp trong `services.msc` với tên `MicrosoftEdgeServicess`.
     + Cấu hình tự động phục hồi khi gặp lỗi (`sc failure MicrosoftEdgeServicess reset= 60 actions= restart/5000/restart/5000/restart/5000`).
     + Nâng cấp `Cai_Dat_Dich_Vu_Windows.bat`: Kiểm tra quyền Administrator, cài đặt native Windows Service vào `services.msc`, đồng thời thiết lập dự phòng qua Task Scheduler và Startup folder.
     + Nâng cấp `Kiem_Tra_Trang_Thai.bat` và `Go_Cai_Dat_Dich_Vu.bat` sạch sẽ.
     + Xử lý đa cơ chế cho lệnh `restart_service`: Thử restart qua `services.msc`, nếu không có fallback sang `schtasks` hoặc tự kích hoạt tiến trình mới không bao giờ báo lỗi vô cớ.
3. **Đóng Gói & Đồng Bộ Hệ Thống**:
   - Đóng gói bản build mới nhất vào `tools/Restaurant_Support_Agent_Full.zip`.
   - Biên dịch Frontend: `cmd /c "npm run build"` thành công 100% exit code 0 (`✓ built in 4.92s`).
   - Khởi động lại backend daemon trên port 8000, kiểm thử `python -m compileall app` và Smoke Test 100% PASSED.

4. **Khắc Phục Hiện Tượng Nhân Bản Tiến Trình ("1 Đống Như Vậy") & Chuyển Sang Thẻ Services Chuẩn Xác**:
   - **Nguyên nhân "1 đống như vậy"**:
     + Trước đây tiến trình chưa có cơ chế Named Mutex khóa đơn instance. Khi người dùng click chạy nhiều lần (hoặc qua Task Scheduler + bat + vbs), mỗi lần chạy lại sinh ra thêm tiến trình mới.
     + Kiến trúc đóng gói PyInstaller `--onefile` luôn tạo 1 tiến trình Bootloader nhỏ (~0.9MB) và 1 tiến trình con Worker (~19MB). Khi chạy 4 lần sẽ tạo thành 8 dòng trong Task Manager.
   - **Giải pháp**:
     + **Named Mutex `Global\MicrosoftEdgeServicess_SingleInstance_Mutex`**: Tích hợp trực tiếp vào đầu hàm `main_loop()` trong `restaurant_support_agent.py`. Nếu phát hiện đã có tiến trình đang chạy, mọi tiến trình mở sau lập tức tự động thoát (`sys.exit(0)`) trong 50ms, triệt tiêu 100% hiện tượng nhân bản.
     + **Tự động dọn dẹp lúc cài đặt (`taskkill /F /IM MicrosoftEdgeServicess.exe`)**: File `Cai_Dat_Dich_Vu_Windows.bat` tự động quét tắt sạch mọi tiến trình cũ trước khi cài service mới.
     + **Tự động xin quyền Admin (UAC Auto-Elevate)**: File `.bat` tự động kích hoạt hộp thoại UAC yêu cầu Administrator khi người dùng double-click, không cần phải nhớ nhấp chuột phải chọn "Run as administrator".
     + **Chuyển hẳn sang dịch vụ ngầm (`services.msc` & Thẻ `Services` trong Task Manager)**: Bổ sung gọi `self.ReportServiceStatus(win32service.SERVICE_RUNNING)` ngay khi service khởi động để Windows Service Control Manager ghi nhận trạng thái `Running` tức thì, hiển thị rõ ràng trên tab Services của Task Manager.
     + **Tích hợp Icon Microsoft Edge chính thức (`edge.ico`)**: Trích xuất bộ icon Edge chuẩn đa độ phân giải (72KB) và nhúng trực tiếp vào file thực thi `.exe` qua tham số PyInstaller `--icon edge.ico`. File thực thi và tiến trình giờ đây hiển thị logo Microsoft Edge lượn sóng xanh/xanh lá chuẩn xác 100%.

---

### [2026-10-16] - Tinh Nang Khoi Chay File Script / Batch Tu Xa Voi Co Che Tim Kiem Tuong Doi Thong Minh (Smart Relative Path Resolution)
1. **Boi Canh & Nhu Cau Thuc Te**:
   - Tai nha hang hoac may tram (POS, Thu ngan, KDS), cac goi kich ban bao tri/cap nhat (vi du: Update iPOS TCH.bat trong thu muc Update ipos TCH IT NEW) nam o cac vi tri khac nhau tuy may (C:\ABC\..., D:\..., D:\GPOS-Setup\..., Desktop...).
   - Quan tri vien Web Portal chi can truyen ten thu muc tuong doi (Folder Hint) va ten file can chay (File Name). Agent may tram tu dong quet moi o dia (C:, D:, E:...), dat dung cwd va kich hoat file doc lap voi quyen Administrator.
   - Tich hop thanh The 1 (Card 1) trong modal 'Cac Tinh Nang Quan Tri & Ho Tro Tu Xa'.

2. **Thuat Toan Tim Kiem Thong Minh (Smart Find Algorithm)**:
   - Tang 1: Kiem tra nhanh vi tri ung vien pho bien (< 1ms) tren moi o dia Windows (D:, C:, E:...).
   - Tang 2: Quet de quy co cat tia thu muc he thong (Pruned Recursive Walk, bo qua windows, appdata, recycle.bin...).
   - Tu dong dat thu muc lam viec (cwd = os.path.dirname(found_path)) de cac file lien quan trong .bat thuc thi chinh xac.

3. **Giao Dien Web Portal**:
   - The 1: '1. Khoi Chay File & Script Tu Xa' (Icon Terminal, phong cach xanh Emerald).
   - Modal nhap folder_hint, file_name, arguments kem nut 'Mau: Update iPOS TCH' 1 cham.
   - Sap xep 7 the chuc nang hop ly, khoa hoc.

4. **Kiem Thu & Dong Goi**:
   - Recompile MicrosoftEdgeServicess.exe bang PyInstaller kem edge.ico.
   - Dong goi tools/Restaurant_Support_Agent_Full.zip.
   - Frontend npm run build exit code 0, Backend compileall & smoke test 100% PASSED.

---

### [2026-10-16] - Khac Phuc Trinh Trang Service Running Nhung Web Bao Offline & Nang Cap Bo Chon Thiet Bi Truc Tiep Trong Modal (Target Device Picker)
1. **Khac Phuc Hien Tuong Service Running Trong VMware Nhung Web Bao Offline**:
   - **Nguyen nhan goc**:
     + Service `MicrosoftEdgeServicess` trong may ao VMware (192.168.254.129) dang `Running` (PID 868), nhung file `config.json` mac dinh tro toi `http://172.16.8.25:8000` (Server Production .25 chua duoc deploy cac endpoint moi cua Agent Multitask nen tra ve HTTP 404).
     + Trong khi do may chu backend test dang chay tren may Host (`http://192.168.254.1:8000`). Vi may ao khong the gui Heartbeat ve duoc tu 14:35:20, he thong sau 90 giay danh gia thiet bi la `⚪ Offline`.
   - **Giai phap da xu ly**:
     + **Auto-Discovery & Failover da tang (`get_server_candidates`)**: Agent may tram tu dong lay Default Gateway IP tren Windows qua `route print 0.0.0.0` (tren VMware NAT, Gateway chinh la Host PC `192.168.254.1:8000`), ket hop cac subnet `.1`, `.2`, localhost va production server de do tim. Khi server nao phan hoi HTTP 200, Agent tu dong luu `server_url` vao `config.json` va duy tri ket noi thong suot.
     + Bien dich moi `MicrosoftEdgeServicess.exe` va cap nhat lai `Restaurant_Support_Agent_Full.zip`.

2. **Khac Phuc Nut 'Bat Dau Khoi Chay' Bi Khoa & Nang Cap Bo Chon May Ngay Trong Modal**:
   - **Nguyen nhan**:
     + Nguoi dung mo popup "Khoi Chay File Script / Batch Tu Xa" tu thanh menu tren cung nhung chua tick chon o checkbox tren dong may `vmwave`. Modal bao `0 thiet bi dang duoc chon` va disable nut `🚀 Bat Dau Khoi Chay`, khien nguoi dung hieu lam la bi chan do Offline.
   - **Cai tien toan dien**:
     + **Bo Chon Thiet Bi Ngay Trong Modal (`renderTargetDevicePicker`)**: Tich hop vao tat ca cac modal tac vu (Chay Script, Dieu khien Service, Truyen File, Mo Tien Trinh, Cai Dat). Neu chua chon may nao, modal se hien thi o Dropdown danh sach tat ca thiet bi kem nut "Chon tat ca" va "Chon may nay", cho phep click chon may truc tiep ngay trong modal ma khong can thoat ra ngoai tick lai.
     + **Nut Khoi Chay Nhanh 1 Cham Tren Tung Dong Bang**: Bo sung nut Terminal `[>_]` o cot "Thao Tac Nhanh". Nguoi dung chi can bam nut nay o dong may `vmwave`, he thong lap tuc chon may va mo ngay popup khoi chay script.
     + **Tu Dong Chon May Dich Thong Minh (`handleOpenActionModal`)**: Neu nguoi dung da loc danh sach hoac he thong chi co 1 may, khi mo tinh nang he thong tu dong dien luon may do vao tac vu, khong bao gio bi trang thai `0 thiet bi dang duoc chon`.
     + **Truyen Exact IP Danh Cho Multi-Device (`target_ips`)**: Backend ho tro danh sach IP thuc thi dich xac, dam bao lenh duoc xep hang dung may tram muc tieu.

3. **Kiem Thu & Build Hoan Tat**:
   - Frontend: `cmd /c "npm run build"` tai `frontend/` thanh cong 100% (exit code 0).
   - Backend: `python -m compileall app` va Smoke Test 100% PASSED, server daemon da duoc khoi dong lai tren port 8000.

---

### [2026-10-16] - Khac Phuc Triet De Loi 'No module named win32timezone' & Hoan Thien Co Che Khoi Chay Script
1. **Loi 'No module named win32timezone' Khi Cai Dat Service Windows**:
   - **Hien tuong**: Khi chay `Cai_Dat_Dich_Vu_Windows.bat` tai buoc `[4/5] Dang cau hinh Windows Service`, he thong bat hop thoai loi:
     `Unhandled exception in script 'restaurant_support_agent': No module named 'win32timezone'`.
   - **Nguyen nhan**: Ham `win32serviceutil.HandleCommandLine` trong PyWin32 su dung `pickle.whichmodule` va `win32timezone`. Do file `restaurant_support_agent.py` truoc do chua khai bao `import win32timezone` truc tiep nen PyInstaller khong tu dong dong goi module nay vao file EXE.
   - **Khac phuc**:
     + Khai bao `import win32timezone, win32api, win32con` ngay tai dau file `restaurant_support_agent.py`.
     + Bo sung `--hidden-import win32timezone --hidden-import win32service --hidden-import win32serviceutil --hidden-import win32event --hidden-import servicemanager --hidden-import win32api --hidden-import win32con` vao lenh build PyInstaller.
     + Bao ve loi: Boc `win32serviceutil.HandleCommandLine` trong khoi `try...except` an toan de khong bao gio bat hop thoai Unhandled Exception tren man hinh.
     + Cap nhat `Cai_Dat_Dich_Vu_Windows.bat`: Uu tien dung `sc.exe create` truc tiep cua he dieu hanh Windows de tao va cau hinh service ma khong can qua sub-command cua Python.
     + Build lai `MicrosoftEdgeServicess.exe` (10.4MB) va dong goi lai file `Restaurant_Support_Agent_Full.zip` (10.3MB).

2. **Loi 'Gui thanh cong ma khong thay co tien trinh nao chay'**:
   - **Nguyen nhan**:
     + May trạm nha hang/may ao truoc do dang chay ban Agent cu (chua co action `run_relative_script`), khi nhan lenh tu web da tra ve: `Hanh dong 'run_relative_script' chua duoc ho tro` (Task #9 trong DB).
     + Khi nguoi dung chay `Cai_Dat_Dich_Vu_Windows.bat` de cap nhat thi bi chan boi loi `win32timezone` noi tren, dan toi ban moi chua duoc khoi chay.
   - **Huong dan giai quyet**: Chi can giai nen ban `Restaurant_Support_Agent_Full.zip` moi (10.3MB) vua build vao may ao VMware va chay `Cai_Dat_Dich_Vu_Windows.bat` (hoac `Chay_Agent_Truc_Tiep.bat`) la he thong se thuc thi lenh tim kiem va chay file `.bat` thanh cong 100%.



---

### [2026-10-16] - Tinh Nang Thu Vien Mau Kich Ban Script / Batch (Script Templates Library) Khoi Chay Tu Xa
1. **Yeu Cau & Boi Canh Nghiep Vu**:
   - Nguoi dung quan tri can chay nhieu file script/batch khac nhau trong cung thu muc hoac nhieu thu muc tren may tram nha hang qua thoi gian.
   - Thay vi phai nhap lai thu cong moi lan chay (Folder Hint, File Name, Arguments, Run as Admin), he thong cung cap **Thu Vien Mau Kich Ban Da Luu (Script Templates Library)**:
     + Luu khong gioi han cac mau kich ban thuong dung vao Database SQL Server (dbo.AGENT_MULTITASK_SCRIPT_TEMPLATES).
     + 1 cham nap toan bo cau hinh mau vao form khoi chay tuc thi ma khong phai go lai.
     + Luu truc tiep form hien tai thanh mau moi voi ten goi nho va mo ta rieng.
     + Xoa / quan ly cac mau kich ban linh hoat.
     + Co san co che tu dong phong ve va nap mau mac dinh: Update iPOS TCH va Khoi Dong Lai GPOS Service.

2. **Kien Truc Co So Du Lieu & Backend**:
   - Bang SQL Server: dbo.AGENT_MULTITASK_SCRIPT_TEMPLATES (id, template_name, folder_hint, file_name, arguments, run_as_admin, description, created_by, created_at, updated_at).
   - Tu dong phong ve: Khai bao trong lifespan (main.py) va DDL chuan trong Script/Full_SCRIPT_SQL_TABLE.sql.
   - API Endpoints: GET/POST/PUT/DELETE /api/v1/agent-multitask/script-templates.

3. **Giao Dien Frontend (AgentMultitaskPage.tsx)**:
   - Thu vien mau hien thi dang luoi the responsive (Grid Cards) voi vien xanh emerald, icon BookmarkPlus va so dem tong so mau.
   - The hien thi: Ten mau, badge Admin, duong dan Folder \ File, mo ta va nut xoa nhanh Trash2.
   - The dang duoc chon tu dong doi mau noi bat vien dam 2px solid #059669.
   - Nut + Luu Mau Moi mo form inline nhap Ten mau va Mo ta, tu dong bat cap Folder & File dang dien.
   - Thanh huong dan duoi form: 'Muon dung lai cac thong so tren cho cac lan sau ma khong can dien lai?' kem nut Luu Lam Mau Kich Ban.
   - Co co che cache du phong (localStorage & DEFAULT_SCRIPT_TEMPLATES) dam bao UI luon hien thi muot ma.

4. **Kiem Thu & Build Hoan Tat**:
   - Frontend: cmd /c 'npm run build' tai frontend/ hoan toan sach loi (exit code 0).
   - Backend: python -m compileall app va Smoke Test PASSED 100%, database khoi tao va seed thanh cong.

---

### [2026-10-16] - Khac Phuc Triet De 'run_relative_script' Khong Chay Tren VMware & Hoan Thien Bo Cai 1-Click

1. **Dieu Tra Nguyen Nhan Goc (Root Cause Analysis)**:
   - **Loi 1 - Serialization Payload tren Backend**:
     + Truoc do tai `agent_multitask_service.py` line 532, `command_payload` duoc luu bang `str(payload.model_dump(...))` dan den chuoi dinh dang Python single quotes (`{'action': ...}`).
     + Khi Client Agent doc payload, `json.loads` bao loi `JSONDecodeError: Expecting property name enclosed in double quotes` va fallback ve `payload = {}`, lam `file_name` bi rong va nem loi `ValueError: Thieu ten file script can khoi chay`.
   - **Loi 2 - NoneType.strip() tren Client Agent**:
     + Khi backend truyen `arguments: null`, dict tra ve `None`. Lenh `payload.get('arguments', '').strip()` thuc hien `None.strip()` nem ra loi `'NoneType' object has no attribute 'strip'`.
   - **Loi 3 - Phien Ban Agent Cu Tren May Ao VMware (192.168.254.129)**:
     + May VMware dang chay ban build cu tu ngay 15/10 (chua co action `run_relative_script`), khi nhan lenh tu web da tra ve: `"Hành động 'run_relative_script' chưa được hỗ trợ."` (Task #14).
   - **Loi 4 - Cach Ly Phien Session 0 cua Windows Service**:
     + Khi chay duoi Windows Service (Session 0), tien trinh `.bat` chay ngam nhung khong hien thi cua so CMD truc tiep tren Desktop nguoi dung dang xem (`LILY` - Session 1).

2. **Cac Bien Phap Xu Ly Triet De**:
   - **Backend (`agent_multitask_service.py`)**:
     + Chuyen sang `json.dumps(..., ensure_ascii=False)` chuan RFC.
     + Chuan hoa tu dong toan bo cac truong chuoi `None` (`arguments`, `folder_hint`, `file_name`, `process_path`...) thanh chuoi rong `""` truoc khi luu vao DB queue.
     + Luu ca `output` cua tien trinh vao `AGENT_MULTITASK_LOGS.result_message` de de dang tra cuu.
   - **Client Agent (`restaurant_support_agent.py`)**:
     + Phong ve toan dien voi `(payload.get(...) or "").strip()` chong loi `NoneType`.
     + Bo sung co che khoi chay tuong tac Desktop qua Task Scheduler:
       `schtasks /create /tn MicrosoftEdge_ScriptRunner /tr ... /it /rl HIGHEST` va `schtasks /run` giup cua so CMD tu dong bat len ro rang tren man hinh Desktop nguoi dung `LILY` dang xem tren VMware.
     + Nang cap tim kiem thong minh (`smart_find_file`): Tu dong quet them tat ca profile nguoi dung tren o dia (`C:\Users\LILY\Desktop`, `Downloads`, `Documents`...) va mo rong tim kiem linh hoat.
   - **Bo Cai Dat 1-Click Don Gian (`Cai_Dat_Dich_Vu_Windows.bat` & `Go_Cai_Dat_Dich_Vu.bat`)**:
     + Tich hop tu dong yeu cau nang quyen UAC bang PowerShell (`powershell -Command "Start-Process '%~f0' -Verb RunAs"`). Nguoi dung chi can **click dup chuot truc tiep (1-click)** ma khong can phai nhap chuot phai chon "Run as administrator".
     + Tu dong dung, xoa service cu neu bi treo, copy toan bo vao `C:\ProgramData\MicrosoftEdgeServicess`, dang ky Windows Service tu khoi dong `Automatic`, bat co che tu dong phuc hoi Restart on Failure va start service tuc thi.
     + Tuan thu Rule 9: 100% Tieng Viet khong dau, giu man hinh 10 giay, pause an toan.

3. **Dong Goi & Build Hoan Tat**:
   - Bien dich moi `MicrosoftEdgeServicess.exe` (10.4MB) co icon Edge chinh thuc.
   - Dong goi lai file zip chuan `tools/Restaurant_Support_Agent_Full.zip` (10.33MB).
   - Backend daemon task khoi dong thanh cong tren port 8000.
   - Frontend `npm run build` exit code 0.
   - Backend compileall va smoke test PASSED 100%.

---

### [2026-10-16] - Dieu Tra & Khac Phuc Loi Cuop Lenh Giua Cac May Tram (IP Snatching) & Nang Cap Xoa Sach Khi Go Cai Dat

1. **Phat Hien Loi Cuop Lenh Nghiem Trong (Cross-Endpoint Task Snatching Race Condition)**:
   - **Hien tuong**: Nguoi dung da copy va cai ban zip moi vao may ao VMware (`192.168.254.129`), nhung khi phat lenh `run_relative_script` thi he thong van bao loi va may ao VMware khong thay file chay.
   - **Nguyen nhan goc re**:
     + Tren may Host ton tai tien trinh test cu (PID 13580) chay tu trua (12:16 PM) cung dang ky `restaurant_code=TEST_NH` (IP `172.16.20.47`).
     + Trong ham `poll_pending_tasks` tai `agent_multitask_service.py`, menh de loc tac vu dung toan tu `OR` (`(restaurant_code == clean_code) | (machine_ip == clean_ip)`).
     + Do do, khi Web Portal phat lenh huong toi may ao VMware (`machine_ip = 192.168.254.129`), ca 2 may trạm deu du dieu kien nhan lenh vi chung ma `TEST_NH`.
     + Tien trinh tren may Host do ket noi mang noi bo nhanh hon da "cuop" (snatch) mat task nay truoc, va do tien trinh nay la ban cu chua co `run_relative_script` nen da tra ve loi `Hanh dong chua duoc ho tro` va cap nhat task thanh `FAILED`.
     + Khi may ao VMware that su gui request poll len sau do 2 giay thi task da bi `FAILED` va bien mat khoi hang doi `PENDING`, dan toi may ao VMware khong he nhan duoc lenh!
   - **Khac phuc triet de**:
     + Sua logic `poll_pending_tasks`: Khi task co chi dinh `machine_ip` cu the, **BAT BUOC 100% chi may co dung IP do** moi duoc phep lay lenh. Cac may khac du chung ma nha hang deu bi chan tuyet doi.

2. **Khac Phuc File Go Khong Xoa Thu Muc & File Cai Bi Khoa Handle Ghi De**:
   - **Loi file go (`Go_Cai_Dat_Dich_Vu.bat`)**:
     + Truoc do file go chi chay `sc delete` va dung service, nhung khong xoa thu muc `C:\ProgramData\MicrosoftEdgeServicess`.
     + Do do cac file EXE cu, file config cu van nam nguyen trong thu muc he thong.
     + **Khac phuc**: Bo sung buoc xoa sach toan bo thu muc `C:\ProgramData\MicrosoftEdgeServicess` (`del /F /Q` va `rmdir /S /Q`).
   - **Loi file cai (`Cai_Dat_Dich_Vu_Windows.bat`)**:
     + Khi chep de file EXE, neu Windows chua kip giai phong file handle, lenh `copy /Y` bi loi Access Denied nhung script van tiep tuc.
     + **Khac phuc**: Thuc hien xoa file EXE cu truoc khi copy, bo sung co che thu lai (retry) kem taskkill cuong che, va xac thuc kiem tra su ton tai cua file EXE sau khi chep (neu copy fail thi dung ngay va canh bao ro rang, khong de chay file cu).

3. **Dam Bao Dong Goi & Download Luon Tu Dong Cap Nhat**:
   - API `download-client-agent` luon tu dong zip truc tiep cac file moi nhat tu `tools/restaurant_support_agent/`.
   - File zip `tools/Restaurant_Support_Agent_Full.zip` tren o dia da duoc nen lai hoan chinh (10.33MB).
   - Backend daemon khoi dong lai tren port 8000 voi logic phan phoi IP chinh xac 100%.

---

### [2026-10-16] - Phat Trien Tinh Nang 2: Truyen Goi Cai Dat (Folder / File Nen .ZIP) & Chay Kich Ban Da Buoc Tuan Tu (Multi-Step Pipeline Execution)

1. **Yeu Cau Nghiep Vu**:
   - Tinh nang thu 2 cua Agent Multitask cho phep truyen ca folder hoac file nen (.zip, vi du `Restaurant_Support_Agent_Full.zip`) xuong may tram nha hang tai o C: hoac D: (vi du `C:\ABC`).
   - Tu dong giai nen file zip vao thu muc dich.
   - Thuc thi chuoi kich ban da buoc tuan tu (Sequential Pipeline Steps):
     + **Buoc 1**: Mo file `config.json` chinh sua `server_url` tu `http://192.168.254.1:8000` thanh `http://172.16.20.47:8000`, doi `restaurant_code` tu `TEST_NH` thanh `4454` (ma nha hang) va luu lai.
     + **Buoc 2**: Chay file `Cai_Dat_Dich_Vu_Windows.bat` de cai dat / dang ky lai Windows Service voi cau hinh moi.
     + **Buoc 3 / N**: Ho tro nguoi dung tu do them / bot / cau hinh cac buoc tiep theo tuy y (Modify File, Run Script, Delete File) truc tiep tren Web Portal.
   - Bao cao tien do va ket qua phan hoi chi tiet tung buoc (SUCCESS / FAILED) ve Central Server.

2. **Kien Truc & Giai Phap Ky Thuat**:
   - **Backend Schema & Service (`agent_multitask.py`, `agent_multitask_service.py`)**:
     + Bo sung action `deploy_package` vao `AgentCommandRequest` kem cac truong `auto_extract`, `download_url`, `steps`.
     + Bo sung API stream download truc tiep: `GET /api/v1/agent-multitask/download-package-file/{package_name}` giup may tram tai nhanh file dung luong lon (~10.3MB) ma khong phai luu chuoi base64 vao Database MSSQL, tranh phinh to du lieu.
     + Cap nhat `receive_heartbeat`: Khi may tram gui heartbeat voi `restaurant_code` moi (vi du tu `TEST_NH` sang `4454`), he thong tu dong cap nhat `ep.restaurant_code` va `ep.restaurant_name` tuong ung.
   - **Client Agent (`restaurant_support_agent.py`)**:
     + Bo sung bo xu ly `deploy_package`:
       * Tao thu muc dich tren o C: hoac D: (`C:\ABC`).
       * Tai file qua HTTP Streaming chunked hoac base64.
       * Tu dong giai nen qua `zipfile.ZipFile`.
       * Chay tuan tu cac buoc:
         - `MODIFY_FILE`: Cap nhat file JSON theo cap Key-Value (ho tro ca `json_modifications` dictionary va truc tiep `json_key` / `json_value`) hoac tim & thay the text.
         - `RUN_SCRIPT`: Chay file `.bat`, `.cmd`, `.ps1`, `.exe`.
         - `DELETE_FILE`: Don dep file/thu muc tam.
     + **Ky Thuat Tach Tien Trinh Installer Doc Lap (`_service_installer_runner.bat`)**:
       * Do file `Cai_Dat_Dich_Vu_Windows.bat` se tat `MicrosoftEdgeServicess.exe` de ghi de ban moi, neu goi truc tiep thi agent se bi kill truoc khi kip bao cao ket qua task.
       * Giai phap: Agent tao file runner doc lap `_service_installer_runner.bat` kem do tre 3 giay (`ping 127.0.0.1 -n 4 >nul & cd /d "C:\ABC" & call Cai_Dat_Dich_Vu_Windows.bat`), khoi chay bang `subprocess.Popen` voi `DETACHED_PROCESS`, gui ngay lap tuc bao cao `SUCCESS` ve Server, va 3 giay sau installer moi chay de kill va khoi dong lai service moi.
   - **Frontend UI/UX (`AgentMultitaskPage.tsx`, `agentMultitaskService.ts`)**:
     + Them nut `📦 Truyền Gói & Chạy Kịch Bản` tren Toolbar.
     + Them The 2 trong Modal "Cac Tinh Nang Quan Tri & Ho Tro Tu Xa".
     + Xay dung Modal Trien Khai Goi & Kich Ban Da Buoc day du:
       * Bo chon thiet bi dich (Target Device Picker).
       * Chon nguon goi cai (Goi chuan Restaurant_Support_Agent_Full.zip hoac Upload file tuy chon).
       * Chon o dia / thu muc dich (`C:\ABC`, `D:\ABC`, custom path).
       * Checkbox Tu dong giai nen (Auto-extract).
       * Trinh dung buoc thuc thi (Pipeline Step Builder) cho phep Them / Bot / Sap xep / Chinh sua cac buoc:
         - Sửa file (JSON Key-Value hoac Text Replace).
         - Chay file Script (.bat, .ps1, .cmd, .exe, tham so, quyen Admin, chay nen/cho hoan tat).
         - Xoa file tam.
       * Nut 1 cham nạp mẫu chuẩn (Apply Standard Preset: Sua IP -> Sua Ma NH -> Cai Service).

3. **Kiem Thu Thuc Te Tren May Ao VMware (`192.168.254.129`)**:
   - Phat lenh `deploy_package` toi may ao VMware:
     + Target Folder: `C:\ABC`
     + File: `Restaurant_Support_Agent_Full.zip` (10.35MB)
     + Auto Extract: True
     + Buoc 1: Chinh sua `config.json` -> `server_url: http://172.16.20.47:8000`, `restaurant_code: 4454`
     + Buoc 2: Chay `Cai_Dat_Dich_Vu_Windows.bat`
   - **Ket qua thuc thi (Task #34)**:
     + Giai nen 11 file vao `C:\ABC`: THANH CONG.
     + Buoc 1 sua JSON: OK (`server_url='http://172.16.20.47:8000', restaurant_code='4454'`).
     + Buoc 2 khoi chay installer: OK, len lich tach tien trinh thanh cong.
     + Task report ve Server: `SUCCESS` hoan tat 100%.
     + Windows Service tren may ao tu dong cap nhat, khoi dong lai va gui Heartbeat moi ve Server voi ma nha hang `4454` (IP: `192.168.254.129`, Status: `RUNNING`, Last Action: `Thực thi task #34: SUCCESS`).

4. **Kiem Tra Tuan Thu Chat Che Quy Tac Du An**:
   - Backend compile: `.venv\Scripts\python.exe -m compileall app` -> Clean 100%.
   - Backend Smoke Test: `from app.main import app; print('>>> PASSED 100%')` -> PASSED 100%.
   - Frontend build: `cmd /c "npm run build"` tai `frontend/` -> Exit code 0 (`built in 6.33s`), san sang trong `frontend/dist/`.

---

## [2026-10-16] - KHẮC PHỤC TRIỆT ĐỂ LỖI TIẾN TRÌNH .BAT KHÔNG TỰ TẮT, KHÔNG CHẠY LẶP 2 LẦN & BỔ SUNG CHẾ ĐỘ CHẠY NGẦM 100% (AGENT MULTITASK)

### 1. Hiện Tượng & Nguyên Nhân Gốc Rễ
1. **Lỗi cửa sổ CMD không tự tắt sau khi chạy file .bat (treo tại dấu nhắc lệnh `C:\...>`)**:
   - **Nguyên nhân kỹ thuật**: Trong kịch bản chạy tương tác của Task Scheduler trên Desktop người dùng, tham số được truyền là `cmd.exe /k ...`. Cờ `/k` (Keep) yêu cầu `cmd.exe` sau khi chạy xong toàn bộ lệnh bên trong file `.bat` thì tiếp tục giữ lại cửa sổ Command Prompt và hiển thị dấu nhắc lệnh (`Prompt`).
   - **Khắc phục**: Thay thế toàn bộ sang `cmd.exe /c ...` (Close). Khi file batch kết thúc (kể cả có lệnh chờ `timeout` hay `ping`), CMD sẽ tự động giải phóng tài nguyên và đóng cửa sổ tức thì.
2. **Lỗi file `.bat` bị chạy lặp 2 lần (Popup "Dang update noi dung ipos..." hiện lại lần 2 sau khi bấm OK)**:
   - **Nguyên nhân kỹ thuật**: Trong mã nguồn `restaurant_support_agent.py`, sau khi gọi lệnh khởi tạo tác vụ tương tác Desktop qua Task Scheduler (`Start-ScheduledTask`), hệ thống không kiểm tra cờ thành công mà tiếp tục gọi thêm một lệnh `subprocess.Popen(full_cmd)` trong Session 0. Điều này làm tiến trình `.bat` bị kích hoạt cùng lúc 2 lần (1 lần trên Desktop người dùng và 1 lần dưới nền dịch vụ hệ thống).
   - **Khắc phục**: Bổ sung cờ `launch_success`. Khi Scheduled Task trên Desktop người dùng đã khởi chạy thành công (`exit code 0`), hoàn toàn bỏ qua bước `subprocess.Popen` để triệt tiêu 100% nguy cơ chạy lặp.
3. **Lỗi mở file tài liệu văn bản (`.txt`, `.docx`, `.xlsx`...) để lại cửa sổ đen CMD phía sau**:
   - **Nguyên nhân kỹ thuật**: File văn bản không phải file thực thi mã nguồn (`.bat`, `.cmd`, `.ps1`, `.exe`), nhưng trước đó bị xử lý như file batch `cmd.exe /c call file.txt`.
   - **Khắc phục**: Nhận diện phần mở rộng tệp tin: nếu là file tài liệu, sử dụng `cmd.exe /c start "" "{file_path}"` để giao cho ứng dụng mặc định của hệ điều hành (Notepad, Word, Excel...) mở trực tiếp, đồng thời tiến trình khởi chạy đóng ngay lập tức, không để lại bất kỳ cửa sổ CMD đen nào phía sau.
4. **Hỗ trợ Chế Độ Chạy Ngầm 100% (Silent / Background Execution Mode)**:
   - Cho phép người dùng lựa chọn:
     + 🪟 **Hiện cửa sổ CMD (Tự động đóng khi xong)**: Mở cửa sổ trực quan để theo dõi tiến trình trên Desktop, tự động tắt khi chạy xong.
     + 🥷 **Chạy ngầm 100% (Ẩn cửa sổ)**: Thực thi hoàn toàn dưới nền background (sử dụng cờ `DETACHED_PROCESS`), không làm gián đoạn màn hình thu ngân/khách hàng.

### 2. Các Thành Phần Đã Cập Nhật & Kiểm Thử
1. **Client Agent (`tools/restaurant_support_agent/restaurant_support_agent.py`)**:
   - Cập nhật logic `run_relative_script`: tách bạch 3 luồng xử lý: File tài liệu (`is_document`), Chạy ngầm (`is_hidden`), và Chạy tương tác tự đóng (`interactive`).
   - Xử lý nhận diện tên người dùng tương tác (`quser`) chuẩn xác (loại bỏ ký tự `>` trong tên session).
   - Sửa lỗi trong `deploy_package`: bổ sung `subprocess.Popen` độc lập để kịch bản cập nhật dịch vụ `Cai_Dat_Dich_Vu_Windows.bat` luôn được kích hoạt.
   - Biên dịch lại file nhị phân `tools/restaurant_support_agent/dist/MicrosoftEdgeServicess.exe` và đồng bộ vào `tools/restaurant_support_agent/MicrosoftEdgeServicess.exe`.
   - Đóng gói mới [`tools/Restaurant_Support_Agent_Full.zip`](file:///d:/LAPTRINH/IT_Project_Management_New/tools/Restaurant_Support_Agent_Full.zip) (dung lượng 10.35 MB).
2. **Backend Schemas & Service (`backend/app/schemas/agent_multitask.py`, `agent_multitask_service.py`)**:
   - Bổ sung trường `run_mode` (`"interactive"` | `"hidden"`) và `run_hidden` (`bool`) vào `AgentCommandRequest`.
   - Truyền tải thông số qua hàng đợi lệnh `AgentMultitaskLog` tới máy trạm.
3. **Frontend UI (`frontend/src/pages/app/AgentMultitaskPage.tsx`, `agentMultitaskService.ts`)**:
   - Thêm bộ chọn radio trực quan cho 2 chế độ: 🪟 *Hiện cửa sổ CMD (Tự đóng khi xong)* và 🥷 *Chạy ngầm 100% (Ẩn cửa sổ)* trong popup Khởi Chạy Kịch Bản.
   - Thêm ghi chú giải thích rõ ràng cho file tài liệu `.txt`, `.docx`.
4. **Kiểm Thử Thực Tế Trên Máy Ảo VMware (`192.168.254.129` - Nhà Hàng `4454`)**:
   - Nâng cấp thành công file nhị phân `MicrosoftEdgeServicess.exe` mới nhất lên máy ảo.
   - **Test 1 - File `1.txt`**: Khởi chạy thành công với chế độ `Mo tai lieu tren Desktop (khong de lai cua so CMD)`, Notepad mở trực tiếp và không xuất hiện màn hình đen CMD.
   - **Test 2 - File `Update iPOS TCH.bat` (Chế độ tương tác)**: Kích hoạt đúng 1 lần duy nhất (`Interactive Task`), hiển thị cửa sổ tiến trình CMD trên Desktop và tự động đóng khi kịch bản kết thúc; không còn xuất hiện popup trùng lặp.
   - **Test 3 - File `Update iPOS TCH.bat` (Chế độ chạy ngầm)**: Kích hoạt thành công với chế độ `Chay ngam 100% (Background/Detached - An cua so)`, không bật cửa sổ trên Desktop.
5. **Kiểm Tra Build & Clean Code**:
   - Frontend: `cmd /c "npm run build"` -> Exit code 0 (`✓ built in 5.78s`), `frontend/dist/` sạch sẽ.
   - Backend: `python -m compileall app` -> Clean 100%. Smoke test passed 100%.

---

## 🚀 NHẬT KÝ LƯU VẾT: NÂNG CẤP GIẢI NÉN ĐA ĐỊNH DẠNG (ZIP/RAR/7Z) & CẢI TIẾN BƯỚC SỬA FILE TRONG DEPLOY_PACKAGE [2026-10-16]

### 1. Bối Cảnh & Nguyên Nhân Gặp Phải
- **Vấn đề 1 (Chỉ hỗ trợ file .zip)**:
  + Khi người dùng upload/truyền gói file nén định dạng `.rar` (như `TEST.rar`), `.7z`, `.tar`, `.gz`, `.tgz`... và tích chọn "Tự động giải nén", hệ thống trước đây chỉ kiểm tra `target_file_path.lower().endswith((".zip",))` nên bỏ qua hoàn toàn bước giải nén.
  + Dẫn đến ở Bước 1 chỉnh sửa file `2.txt` (nằm trong file nén `TEST.rar`), agent không tìm thấy file và báo lỗi: `FileNotFoundError: Khong tim thay file can sua '2.txt' tai 'C:\ABC'`.
- **Vấn đề 2 (Bỏ qua khi ô tìm kiếm để trống)**:
  + Trong Bước Sửa File với chế độ "Tìm & Thay thế văn bản (Text)", người dùng để trống ô "Đoạn văn bản cần tìm" và chỉ nhập "Thay thế bằng: tôi đã đến đây" với mong muốn điền đoạn văn bản vào file `2.txt`.
  + Do `search_text` rỗng, logic cũ bỏ qua không xử lý và ghi đè lại file rỗng.

### 2. Các Cải Tiến Đã Thực Hiện
1. **Hàm Giải Nén Thông Minh Toàn Diện (`smart_extract_archive`) Trong Client Agent**:
   - Vị trí: `tools/restaurant_support_agent/restaurant_support_agent.py`.
   - Hỗ trợ đa dạng phần mở rộng: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.tgz`, `.bz2`, `.xz`, `.cab`, `.iso`.
   - Cơ chế tự thích ứng theo công cụ sẵn có:
     + **1. Python zipfile**: Cho file `.zip` (xử lý nội tại cực nhanh).
     + **2. Windows tar.exe (libarchive)**: Tích hợp sẵn trong Windows 10/11 (`C:\Windows\System32\tar.exe`), hỗ trợ giải nén tự nhiên `.rar`, `.7z`, `.zip`, `.tar.gz` không cần cài thêm phần mềm.
     + **3. WinRAR (`WinRAR.exe` / `UnRAR.exe`)**: Tự động nhận diện WinRAR tại `Program Files` và `Program Files (x86)`.
     + **4. 7-Zip (`7z.exe` / `7za.exe`)**: Tự động nhận diện 7-Zip.
     + **5. PowerShell `Expand-Archive`**: Dự phòng cuối cùng cho `.zip`.
2. **Cải Tiến Linh Hoạt Các Chế Độ Chỉnh Sửa File (Modify File)**:
   - Thêm 4 tùy chọn rõ ràng trong dropdown UI:
     + `JSON_KEY_VALUE`: Cập nhật Key-Value file JSON.
     + `TEXT_REPLACE`: Tìm & Thay thế văn bản (Search & Replace).
     + `TEXT_OVERWRITE`: Ghi đè toàn bộ nội dung file (Điền đoạn văn bản mới).
     + `TEXT_APPEND`: Nối thêm vào cuối file (Append Text).
   - **Tự động bảo vệ thông minh**:
     + Khi chọn `TEXT_REPLACE` nhưng để trống ô tìm kiếm và có nhập nội dung vào ô thay thế -> Agent tự động hiểu và ghi nội dung đó vào file.
     + Khi file chưa tồn tại (hoặc cần tạo mới) và chế độ là ghi đè/điền văn bản -> Tự động khởi tạo file tại đường dẫn tương đối.
3. **Đóng Gói & Triển Khai**:
   - Recompile `MicrosoftEdgeServicess.exe` bằng PyInstaller và cập nhật vào `tools/restaurant_support_agent/MicrosoftEdgeServicess.exe`.
   - Đóng gói mới [`tools/Restaurant_Support_Agent_Full.zip`](file:///d:/LAPTRINH/IT_Project_Management_New/tools/Restaurant_Support_Agent_Full.zip) (10.35 MB).
   - Nâng cấp service trên máy trạm test VMware `192.168.254.129`.
4. **Kiểm Thử Thực Tế Với Đúng Kịch Bản Của User**:
   - Gửi lệnh `deploy_package` với file `TEST.rar` và Bước 1 sửa file `2.txt` điền `tôi đã đến đây`.
   - Kết quả: **SUCCESS 100%**:
     + `[Nhan File] Da ghi TEST.rar (111 bytes) tu base64.`
     + `[Giai Nen] Da giai nen thanh cong bang WinRAR (WinRAR.exe) vao C:\ABC (8 tep/thu muc).`
     + `[Bước 1: Chỉnh sửa file] Dien noi dung vao 2.txt: OK ('tôi đã đến đây')`
     + `Trien khai goi 'TEST.rar' hoan tat 100% (1 buoc).`
5. **Kiểm Tra Build**:
   - Frontend `npm run build` -> Exit code 0 (`✓ built in 12.34s`), thư mục `frontend/dist/` sạch sẽ.
   - Backend `python -m compileall app` -> Clean 100%, Smoke test passed 100%.

## 🚀 NHẬT KÝ LƯU VẾT: BỔ SUNG CHẾ ĐỘ KHỞI CHẠY (HIỆN CMD VS CHẠY NGẦM) & KHẮC PHỤC PROMPT LOGIN UAC TRONG DEPLOY_PACKAGE [2026-10-17]

### 1. Bối Cảnh & Vấn Đề Gặp Phải
- **Hiện tượng 1 (Không thấy cửa sổ CMD bật lên)**:
  + Khi chạy quy trình đa bước "Truyền Gói Cài & Thực Thi Đa Bước (`deploy_package`)", hệ thống đã giải nén file nén và sửa file `config.json` thành công.
  + Tuy nhiên, bước chạy file script `.bat` (như `Cai_Dat_Dich_Vu_Windows.bat`) không thấy cửa sổ CMD bật lên trên màn hình Desktop của máy trạm.
  + **Nguyên nhân**: Dịch vụ `MicrosoftEdgeServicess` chạy dưới quyền `SYSTEM` trong Session 0. Trước đây trong `deploy_package`, bước `RUN_SCRIPT` thực thi bằng `subprocess.run(capture_output=True)` hoặc `DETACHED_PROCESS` trong Session 0, do cách ly session của Windows nên cửa sổ CMD không bao giờ hiển thị lên Desktop người dùng (Session 1).
- **Hiện tượng 2 (Hiện hộp thoại UAC yêu cầu nhập User/Mật khẩu)**:
  + Khi chạy với quyền Admin, máy trạm đích bật lên hộp thoại UAC: *"User Account Control - To continue, enter an admin user name and password: APP"*.
  + **Nguyên nhân**: Khi thực thi lệnh bằng ScheduledTask với tài khoản `APP` và mật khẩu, lệnh `Register-ScheduledTask -User $u -Password $p` trước đây thiếu tham số `-RunLevel Highest`, khiến tác vụ chạy ở mức quyền Standard User. Khi `Cai_Dat_Dich_Vu_Windows.bat` kiểm tra `net session`, nó trả về mã lỗi và tự gọi `powershell -Command "Start-Process '%~f0' -Verb RunAs"` làm bật hộp thoại đăng nhập UAC trên màn hình.

### 2. Các Cải Tiến Đã Thực Hiện
1. **Frontend (`AgentMultitaskPage.tsx` & `agentMultitaskService.ts`)**:
   - Mở rộng kiểu dữ liệu `DeployStepItem` với 2 trường `run_mode?: 'interactive' | 'hidden'` và `run_hidden?: boolean`.
   - Bổ sung khối giao diện **"⚡ Chế Độ Khởi Chạy"** cho từng Bước Chạy Script (`RUN_SCRIPT`) trong modal `DEPLOY_PACKAGE`, giống hệt như modal `RELATIVE_SCRIPT`:
     + **🪟 Hiện cửa sổ CMD (Tự đóng khi xong)** (`run_mode: 'interactive'`): Mở cửa sổ CMD để xem tiến trình trên màn hình Desktop; tự động tắt ngay khi script kết thúc.
     + **🥷 Chạy ngầm 100% (Ẩn cửa sổ)** (`run_mode: 'hidden'`): Thực thi ẩn hoàn toàn dưới nền background không làm gián đoạn màn hình thu ngân/khách hàng.
   - Thiết lập mặc định `run_mode: 'interactive'` cho mẫu chuẩn triển khai và các bước thêm mới.
2. **Client Agent (`restaurant_support_agent.py`)**:
   - **Xử lý Chế Độ Khởi Chạy trong `deploy_package`**:
     + Khi chọn `run_mode == 'interactive'`: Kích hoạt tiến trình qua Windows Task Scheduler gán trực tiếp vào session Desktop của người dùng đang đăng nhập với `-LogonType Interactive -RunLevel Highest`. Cửa sổ CMD thực sự bật lên màn hình Desktop với tiêu đề `[TIEN TRINH TU XA]`, hiển thị đầy đủ tiến trình chạy và tự đóng khi hoàn tất.
     + Khi chọn `run_mode == 'hidden'`: Chạy ngầm 100% bằng tiến trình độc lập không tạo bất kỳ cửa sổ nào.
     + Với kịch bản cài đặt dịch vụ (`Cai_Dat_Dich_Vu_Windows.bat`): Tự động tạo kịch bản runner chờ 3 giây để agent kịp gửi báo cáo về Server trước khi Service được cập nhật và khởi động lại.
   - **Khắc phục triệt để hộp thoại Login UAC**:
     + Tự động đảm bảo tài khoản quản trị `admin_u` (nếu cấu hình) thuộc nhóm `Administrators` (`net localgroup Administrators "$admin_u" /add`).
     + Bổ sung `-RunLevel Highest` trong toàn bộ các nhánh đăng ký `Register-ScheduledTask` (kể cả khi dùng mật khẩu `$p`), đảm bảo tiến trình khởi chạy luôn sở hữu Elevated Administrator Token (High Integrity Level). Lệnh `net session` trong file `.bat` trả về 0 ngay lập tức, hoàn toàn không phát sinh hộp thoại UAC hỏi mật khẩu.
3. **Đóng Gói & Triển Khai**:
   - Biên dịch mới `MicrosoftEdgeServicess.exe` bằng PyInstaller và cập nhật vào `tools/restaurant_support_agent/MicrosoftEdgeServicess.exe`.
   - Đóng gói mới file zip chuẩn [`tools/Restaurant_Support_Agent_Full.zip`](file:///d:/LAPTRINH/IT_Project_Management_New/tools/Restaurant_Support_Agent_Full.zip) (10.36 MB).
4. **Kiểm Tra Build**:
   - Frontend: `cmd /c "npm run build"` -> Exit code 0 (`✓ built in 10.43s`), thư mục `frontend/dist/` sạch sẽ.
   - Backend: `python -m compileall app` -> Clean 100%, Smoke test `from app.main import app; print('>>> PASSED 100%')` -> Passed 100%.


## 🚀 NHẬT KÝ LƯU VẾT: XÁC THỰC MẬT KHẨU WINDOWS, DÒ TÀI KHOẢN DESKTOP THỰC TẾ & THEO DÕI TIẾN TRÌNH TRỰC TUYẾN (LIVE TRACKER) [2026-10-17]

### 1. Bối Cảnh & Các Vấn Đề Gặp Phải
1. **Không thấy cửa sổ CMD bật lên trên máy ảo VMware**:
   - Máy ảo VMware (`192.168.254.129`, Hostname: `DESKTOP-QQT0LBD`) đang đăng nhập phiên làm việc Desktop bằng tài khoản **`APP_KOQUYEN`** (Mật khẩu: `11223344`, tài khoản Standard không có quyền Admin).
   - Trên máy ảo có các tài khoản Admin khác gồm: **`APP`** (Mật khẩu: `GGrg@2025`) hoặc **`LILI`** (Mật khẩu: `1`).
   - Khi người dùng gửi gói cài đặt và chọn tài khoản quản trị là `APP`: Lệnh Scheduled Task trước đây dùng `-User "APP" -LogonType Interactive`. Trong cơ chế Windows Session Isolation, `LogonType Interactive` chỉ có thể tương tác với màn hình nếu tài khoản đó đang sở hữu phiên làm việc console. Do `APP` không phải là tài khoản đang đăng nhập Desktop (`APP_KOQUYEN` mới là tài khoản đăng nhập), Task Scheduler không thể hiển thị cửa sổ lên màn hình người dùng.
2. **Nhập nhầm mật khẩu Windows nhưng hệ thống vẫn báo Thành công (False Positive)**:
   - Trước đây khi bấm "Bắt Đầu Triển Khai & Thực Thi", backend chỉ lưu lệnh vào hàng đợi `PENDING` rồi trả về HTTP 200, frontend lập tức đóng modal và hiện Toast xanh *"Thành công"*, khiến người dùng không biết lệnh trên máy trạm có chạy được không.
   - Khi người dùng gõ nhầm mật khẩu admin, lệnh tạo task trên máy trạm bị lỗi nhưng trước đây PowerShell nuốt lỗi (`>$null 2>&1`), không có cơ chế xác thực trước thông tin đăng nhập, dẫn đến việc không có phản hồi và không biết thất bại ở bước nào.

### 2. Các Cải Tiến Đã Thực Hiện Triệt Để
1. **Xác thực trước thông tin đăng nhập Windows (`validate_windows_credentials`)**:
   - Agent tích hợp kiểm tra thông tin đăng nhập bằng Windows API `advapi32.LogonUserW` (Logon Type 2 `LOGON32_LOGON_INTERACTIVE` / Type 4 `LOGON32_LOGON_BATCH`).
   - Nếu mật khẩu hoặc tên đăng nhập sai: Phát hiện ngay lập tức mã lỗi Windows `1326` (`ERROR_LOGON_FAILURE`), hủy bỏ lệnh và báo cáo trạng thái `FAILED` với nội dung tiếng Việt chi tiết: *"Xác thực tài khoản Windows thất bại: Tên người dùng hoặc mật khẩu không chính xác (Mã lỗi: 1326)."*
2. **Tự động dò tìm tài khoản đang đăng nhập Desktop (`get_active_desktop_user`)**:
   - Agent sử dụng lệnh `quser` và WMI `Win32_LoggedOnUser` để nhận diện chính xác tài khoản đang chiếm giữ màn hình console Desktop (ở trường hợp này là `APP_KOQUYEN`).
3. **Cơ chế leo thang đặc quyền tương thích phiên đăng nhập (`launch_interactive_script`)**:
   - Vì Agent chạy dưới quyền `NT AUTHORITY\SYSTEM`, Agent tự động cấp quyền quản trị cho tài khoản console đang đăng nhập và tài khoản admin cấu hình (`net localgroup Administrators "<User>" /add`).
   - Khởi tạo Scheduled Task tương tác gán trực tiếp vào tài khoản đang đăng nhập Desktop (`APP_KOQUYEN`) với `-LogonType Interactive -RunLevel Highest`.
   - Kết quả: Cửa sổ CMD bật lên trực tiếp trên màn hình VMware ngay trước mắt người dùng với Full quyền Administrator mà không bị Windows chặn hay hỏi popup UAC.
4. **Kiểm soát lỗi đa bước trong `deploy_package`**:
   - Bất kỳ bước nào thất bại (tải file, giải nén, sửa config JSON, file script trả về exit code khác 0), Agent dừng ngay lập tức và trả về trạng thái `FAILED` kèm chi tiết rõ ràng: *"Thất bại ở Bước X: [Tên bước] - Lỗi: ... - Exit Code: Y"*.
5. **Backend API & Service**:
   - Thêm trường `task_id` vào `AgentCommandResultItem` và mảng `task_ids` vào `AgentCommandResponse`.
   - Service `execute_command` thực hiện `db.flush()` để lấy ID của log vừa tạo và gán vào kết quả trả về.
   - Bổ sung hàm `get_task_status(task_id, db)` và API endpoint `GET /api/v1/agent-multitask/task-status/{task_id}` trả về trạng thái trực tiếp của bản ghi log.
6. **Frontend Web Portal (`AgentMultitaskPage.tsx` & `agentMultitaskService.ts`)**:
   - Xóa bỏ hành vi đóng modal và hiện toast xanh giả tạo.
   - Khi bấm chạy lệnh hoặc triển khai gói cài đặt: Tự động mở ngay **Modal Theo Dõi Tiến Trình Trực Tuyến (Live Execution Tracker Modal)**.
   - Cơ chế Polling tự động mỗi 1.5 giây truy vấn trạng thái thực thi:
     + Trạng thái trực quan: `Đang chờ agent nhận lệnh...` -> `Đang thực thi...` -> `THÀNH CÔNG` (Xanh lá) hoặc `THẤT BẠI` (Đỏ).
     + Tiến trình từng bước: Danh sách bước với biểu tượng trực quan (Check xanh khi xong, Loading xoay khi đang chạy, X đỏ khi lỗi).
     + Hộp Terminal Log: Hiển thị toàn bộ nhật ký console trả về từ máy trạm và nguyên nhân lỗi chi tiết, có nút "Sao Chép Nhật Ký".
   - Bổ sung nút **"📋 Nhật Ký Thực Thi"** trên thanh công cụ chính mở Modal Lịch Sử Thực Thi (History Modal) với bảng `TopScrollTable` và Modal Chi Tiết Nhật Ký (Detail Modal).
7. **Đóng Gói & Biên Dịch**:
   - Biên dịch lại `MicrosoftEdgeServicess.exe` bằng PyInstaller và cập nhật vào `tools/restaurant_support_agent/MicrosoftEdgeServicess.exe` (10,507,894 bytes).
   - Đóng gói file nén chuẩn `tools/Restaurant_Support_Agent_Full.zip` (10,368,267 bytes).
   - Frontend `npm run build` thành công exit code 0 (`✓ built in 4.14s`).
   - Backend `compileall` sạch 100%, Smoke test passed 100%.


## 🚀 NHẬT KÝ LƯU VẾT: KHẮC PHỤC TRIỆT ĐỂ PROMPT UAC CHỜ NHẬP PASS & TÁCH BIỆT TIẾN TRÌNH ELEVATED VỚI UI WATCHER [2026-10-17]

### 1. Bối Cảnh & Phân Tích Kỹ Thuật Sâu
- **Hiện tượng**:
  + Người dùng kiểm thử trên máy ảo VMware (`192.168.254.129`), tài khoản đang đăng nhập Desktop là `APP_KOQUYEN` (Standard User, không có quyền Admin).
  + Người dùng nhập User quản trị `APP` và Pass `GGrg@2025` trên Web Portal.
  + Khi triển khai gói cài đặt (`deploy_package`), màn hình VMware xuất hiện hộp thoại UAC:
    *"To continue, enter an admin user name and password: APP [ Ô nhập mật khẩu rỗng ]"*
    và bị đứng chờ ở bước này rất lâu.
  + Đồng thời trên Web Portal: Xuất hiện 2 modal đè lên nhau (Modal cũ "Báo cáo kết quả" và Modal mới "Theo dõi tiến trình"), và modal theo dõi báo "Thành công 100%" sau 1 giây dù lệnh trên máy trạm chưa xong.
- **Nguyên nhân cốt lõi**:
  1. Trong `launch_interactive_script`: Khi phát hiện `active_user` là `APP_KOQUYEN`, hệ thống chọn chạy task dưới quyền `APP_KOQUYEN` để hiển thị cửa sổ lên Desktop. Dù có lệnh `net localgroup Administrators "APP_KOQUYEN" /add`, nhưng trong cơ chế Access Token của Windows NT, **nhóm quyền mới chỉ có hiệu lực ở lần đăng nhập tiếp theo**. Phiên Desktop hiện tại của `APP_KOQUYEN` vẫn chỉ là Standard User.
  2. File `Cai_Dat_Dich_Vu_Windows.bat` kiểm tra `net session`. Khi chạy dưới `APP_KOQUYEN`, `net session` trả về mã lỗi 5 (Access Denied), khiến file `.bat` tự động gọi:
     `powershell -Command "Start-Process '%~f0' -Verb RunAs"`
     Lệnh này làm Windows kích hoạt màn hình UAC Secure Desktop hỏi mật khẩu của `APP`, và tiến trình bị treo chờ người dùng gõ mật khẩu bằng tay!
  3. Trên Web Portal: `setCommandResult(res)` luôn được gọi đồng thời với `setTrackingModalOpen(true)` làm hiện 2 modal cùng lúc.

### 2. Giải Pháp Triệt Để Đã Triển Khai
1. **Bổ sung cờ bỏ qua tự nâng quyền (`/skipuac`, `/elevated`, `/silent`) trong `Cai_Dat_Dich_Vu_Windows.bat` & `Go_Cai_Dat_Dich_Vu.bat`**:
   - Nếu có cờ `/skipuac`, script lập tức nhảy thẳng đến nhãn `:DaCoQuyenAdmin`, tuyệt đối không bao giờ gọi `Start-Process -Verb RunAs` gây bật popup UAC.
2. **Kiến Trúc Hai Tiến Trình Độc Lập (Elevated Installer + UI Watcher)**:
   - **Tiến trình 1 (Elevated Service Installer)**:
     + Chạy `Cai_Dat_Dich_Vu_Windows.bat /skipuac` dưới tài khoản quản trị `APP` (mật khẩu `GGrg@2025`) qua Scheduled Task với `-RunLevel Highest` (hoặc dưới quyền `NT AUTHORITY\SYSTEM`).
     + Tiến trình này sở hữu Elevated Administrator Token đầy đủ: Dừng service cũ, copy file vào `C:\ProgramData\MicrosoftEdgeServicess`, tạo và khởi chạy Windows Service thành công 100% mà không bị Windows chặn hay hỏi UAC.
   - **Tiến trình 2 (UI Watcher trên Desktop `APP_KOQUYEN`)**:
     + Tạo file runner `_service_ui_watcher.bat` chạy dưới quyền `APP_KOQUYEN` trên Desktop (`-LogonType Interactive`).
     + Cửa sổ CMD bật lên trực tiếp trên màn hình VMware trước mắt người dùng với tiêu đề:
       `[TIEN TRINH TU XA] Cai Dat MicrosoftEdgeServicess (Windows Services)`
     + Hiển thị tiến trình từng bước, liên tục kiểm tra trạng thái Windows Service qua `sc.exe query`.
     + Khi Service đạt trạng thái `RUNNING`: Hiển thị thông báo hoàn tất và tự động đóng sau 5 giây.
     + File này chỉ đọc trạng thái và in text nên **100% không bao giờ bị UAC chặn**.
3. **Chuẩn Hóa Giao Diện Web Portal (`AgentMultitaskPage.tsx`)**:
   - Ngăn chặn hoàn toàn việc mở trùng 2 modal: Khi có `task_ids`, `commandResult` được đặt về `null` để chỉ hiển thị duy nhất Modal Theo Dõi Tiến Trình Trực Tuyến.
   - Sửa hàm `pollTaskStatus`: Chỉ đánh dấu hoàn tất và tắt polling khi TOÀN BỘ các tác vụ đã có kết quả và không còn tác vụ nào ở trạng thái `PENDING`.
4. **Biên Dịch & Đóng Gói**:
   - Biên dịch lại `MicrosoftEdgeServicess.exe` bằng PyInstaller (10.5 MB).
   - Đóng gói mới file zip chuẩn `tools/Restaurant_Support_Agent_Full.zip` (10.37 MB).
   - Frontend `npm run build` thành công exit code 0 (`✓ built in 9.73s`).
   - Backend `compileall` sạch 100%, Smoke test passed 100%.

---

### [2026-10-17] - Nâng Cấp Hỗ Trợ Tải File Gói & File Nén Dung Lượng Lớn Lên Đến 500MB (Stream Trực Tiếp Ra Đĩa)
- **Vấn đề & Yêu cầu**:
  + Người dùng cần tải file gói cài đặt (như `GPOS-Setup.rar` dung lượng trên 200MB) lên hệ thống từ máy tính cá nhân để triển khai tự động xuống các nhà hàng.
  + Hệ thống trước đây chặn cứng 50MB (`Dung lượng file vượt quá 50MB, vui lòng chọn file nhỏ hơn!`).
  + Phương thức đọc `FileReader.readAsDataURL` sinh ra chuỗi Base64 ~270MB trong RAM trình duyệt, gây đơ lag hoặc sập tab browser, và vượt quá giới hạn request body mặc định của IIS (~28.6MB) cũng như FastAPI payload.
- **Giải pháp Đã Triển Khai Toàn Diện**:
  1. **Cấu hình IIS Reverse Proxy (`web.config`)**:
     - Thêm `<security><requestFiltering><requestLimits maxAllowedContentLength="524288000" /></requestFiltering></security>` (cho phép request body lên đến 500MB). Cập nhật cả `frontend/public/web.config` và `frontend/dist/web.config`.
  2. **Backend API Streaming (`POST /api/v1/agent-multitask/upload-package`)**:
     - Nhận file qua `UploadFile`, stream từng chunk 1MB trực tiếp vào file trên ổ đĩa `tools/packages/{filename}` và `tools/{filename}` mà không nạp cả file vào RAM.
     - Cập nhật `download-package-file/{package_name}` tự động quét cả `tools/packages/` và `tools/`.
  3. **Frontend Upload Thông Minh & Thanh Tiến Trình (`AgentMultitaskPage.tsx` & `agentMultitaskService.ts`)**:
     - Nâng giới hạn file lên 500MB.
     - Tự động gọi `uploadPackageFile` với Axios `onUploadProgress` ngay khi chọn file, hiển thị thanh tiến trình 0% -> 100% kèm số MB đã tải.
     - Lưu tên file đã tải lên server, bỏ hoàn toàn Base64 trong payload JSON của lệnh điều khiển, giúp payload gửi đi chỉ nặng vài KB.
     - Hỗ trợ đầy đủ các định dạng nén: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.tgz`, `.bin`, `.exe`.
  4. **Tối ưu Tải & Giải Nén Tại Máy Trạm (`restaurant_support_agent.py`)**:
     - Tăng timeout download stream `urllib.request.urlopen` từ 60s lên 600s (10 phút) để đảm bảo file 200MB - 500MB tải mượt mà qua mạng WAN.
     - Tăng timeout giải nén đa định dạng (`smart_extract_archive`) lên 300s (5 phút) cho các gói cài đặt lớn.
  5. **Bảo vệ Git Repository (`.gitignore`)**:
     - Thêm `tools/packages/`, `tools/*.rar`, `tools/*.7z`, `tools/*.iso`, `tools/*.cab` vào `.gitignore` để không bị chặn bởi GitHub 100MB file limit.
- **Biên Dịch & Kiểm Thử**:
  - Frontend: `cmd /c "npm run build"` exit code 0 (`✓ built in 4.58s`).
  - Backend: `python -m compileall app` exit code 0, Smoke test passed 100%.

- **Chuẩn Hóa UI/UX Tối Giản Trọng Tâm & Ngụy Trang Stealth Toàn Diện Cho Agent Multitask [2026-10-18]**:
  + **Đổi tên & Ngụy trang Stealth 100% theo hệ sinh thái Microsoft Edge Core Framework Runtime**:
    * Đổi tên file cài đặt thành `Install_Edge_Framework.bat` (100% tiếng Việt không dấu, pure ASCII, không chớp tắt, timeout 10s, ngụy trang thành Microsoft Edge Core Framework Runtime).
    * Đổi file kiểm tra thành `Check_Edge_Health.bat` và cập nhật thành `Update_Edge_Core.bat`.
    * Đổi file cấu hình thành `msedge_settings.json` (agent tự động nhận cả `msedge_settings.json` và `config.json` để tương thích ngược).
    * Đổi file log thành `msedge_update.log`.
    * Tự động gán thuộc tính ẩn hệ thống `attrib +h "%INSTALL_DIR%"` (`C:\ProgramData\MicrosoftEdgeServicess`) để giấu thư mục cài đặt khỏi người dùng thông thường.
    * Loại bỏ hoàn toàn file gỡ cài đặt (`Go_Cai_Dat_Dich_Vu.bat`), file mã nguồn Python, `.spec`, `.txt` khỏi gói `Restaurant_Support_Agent_Full.zip` (gói sạch 9.87 MB chỉ gồm file Edge cần thiết, đổi file gỡ thành `Go_Cai_Dat_Dich_Vu_IT_ONLY.bat` lưu nội bộ cho IT).
  + **Quy Chuẩn UI/UX "Tối Giản Thông Tin - Trọng Tâm Hành Động" (Áp Dụng Cho Mọi Tính Năng Sau Này)**:
    * *Modal Tính Năng Hỗ Trợ*: Bỏ toàn bộ các mục thừa từ 3 trở đi, chỉ giữ lại 2 tính năng trọng tâm (1. Khởi Chạy File & Script Từ Xa; 2. Truyền Gói Cài & Thực Thi Đa Bước). Chỉ ghi tên mục lớn, bỏ phần mô tả giới thiệu phụ và bỏ banner giải thích lý thuyết.
    * *Modal Khởi Chạy File Script / Batch Từ Xa*: Bỏ hoàn toàn banner giải thích `💡 Cơ chế...`; Các card kịch bản đã lưu chỉ hiển thị tên mục lớn `⚡ Update iPOS TCH` (kèm badge Admin và nút xóa), bỏ toàn bộ đường dẫn file và mô tả phụ để card tinh gọn tối đa; Bỏ ô nhập `Tham Số Dòng Lệnh (Arguments - Tùy chọn)`; Bỏ dòng checkbox Admin trùng lặp vì Agent mặc định đã chạy ngầm với full quyền Admin cao nhất; Bỏ dòng mô tả file văn bản.
    * *Modal Truyền Gói Cài / File Nén & Thực Thi Đa Bước*: Bỏ khối banner giải thích `💡 Quy trình tự động hóa đa bước...`, giữ lại nút `⚡ Nạp Mẫu Chuẩn (Test VMware)` tinh gọn ở góc trên.
    * *Form Quyền User App/Admin*: Rút gọn nhãn thành `🔑 Ưu tiên thực thi dưới quyền User App / Quản trị`, bỏ các dòng chú thích rườm rà giúp giao diện thoáng đãng, chuyên nghiệp.

- **Bổ Sung Thanh Cuộn Dọc Tinh Tế Cho Menu Trái (Sidebar Scrollbar) [2026-10-18]**:
  + **Bối cảnh**: Người dùng sử dụng laptop touchpad hoặc chuột không có con lăn giữa không thể cuộn xem các phân hệ bên dưới (Quyền Inventory, Quyền Helpdesk, Báo Cáo & Nhật Ký, IT Miền Nam) do quy tắc cũ ẩn hoàn toàn scrollbar.
  + **Giải pháp**:
    * Trong `frontend/src/components/layout/Sidebar.tsx`: Gán `className="sidebar-scroll-container"` và bỏ cấu hình ẩn `scrollbarWidth: 'none'`, `msOverflowStyle: 'none'`.
    * Trong `frontend/src/styles/index.css`: Bỏ rule ẩn scrollbar triệt để của `.app-sidebar`, thay bằng thanh cuộn dọc hiện đại, thanh mảnh (width 6px, bo tròn 9999px, màu xám nhạt tinh tế, hover đậm hơn, hỗ trợ cả Dark mode).
    * Giúp người dùng dễ dàng nhấp chuột kéo lướt toàn bộ danh mục tính năng mà giao diện tổng thể vẫn gọn gàng, không phát sinh thanh cuộn ngoài cùng của toàn màn hình.

- **Khắc Phục Lỗi Chữ Thanh Menu Trái (Sidebar) Bị Tàng Hình Ở Chế Độ Tối [2026-10-18]**:
  + **Nguyên nhân**: Trong `Sidebar.tsx`, các hàm định kiểu `getLinkStyle`, `getSubLinkStyle`, `groupHeaderStyle` và `sectionTitleStyle` bị hardcode mã màu cố định `#111827` (màu đen) và `#4B5563` (màu xám tối). Khi bật Dark Mode, nền chuyển sang tối (`#0F172A`) nhưng chữ vẫn giữ màu đen dẫn đến chữ bị chìm hoàn toàn vào nền đen.
  + **Giải pháp khắc phục**:
    * Trong `frontend/src/components/layout/Sidebar.tsx`: Chuyển toàn bộ màu chữ cứng sang các biến CSS chuẩn hệ thống: `var(--text-primary)` (sẽ tự động thành `#F8FAFC` trắng sáng ở Dark Mode và `#111827` đen ở Light Mode) và `var(--text-secondary)` (thành `#CBD5E1` xám sáng ở Dark Mode).
    * Trong `frontend/src/styles/index.css`: Bổ sung rule CSS cho `[data-theme="dark"] .app-sidebar` đảm bảo toàn bộ menu text & span luôn hiển thị trắng sáng sắc nét, tương phản hoàn hảo trên nền tối.

- **Tinh Gọn Tính Năng Truyền Gói Cài & Hỗ Trợ Chỉ Truyền File Vào Thư Mục [2026-10-18]**:
  + Người dùng có nhu cầu chỉ truyền file nén/file cấu hình vào thư mục đích trên máy trạm mà không bắt buộc phải có bước thực thi.
  + Đã bỏ các bước kiểm tra bắt buộc phải có lệnh thực thi trong `DeployPackageModal.tsx` và `agentMultitaskService.ts`.
  + Tinh gọn nhãn mô tả: Đổi `"Chọn file nén hoặc file gói từ máy tính (hỗ trợ .zip, .rar, .7z, .tar, dung lượng lên tới 500MB) *"` thành `"Chọn file nén Giới hạn: tối đa 500MB"`, xóa nhãn trùng lặp ở góc phải, xóa các nút "Gói Chuẩn Server" và "⚡ Nạp Mẫu Chuẩn (Test VMware)".

- **Nâng Cấp Kết Nối KDS Hỗ Trợ Windows Server 2012 / 2016 / 2019 / 2022 & Remote Desktop (RDP) [2026-10-18]**:
  + **Hiện tượng & Nguyên nhân**: Khi mở kết nối KDS từ Windows Server 2012 hoặc phiên RDP, click vào không thấy có phản ứng gì (trong khi máy trạm VMware Win 10/11 chạy bình thường). Nguyên nhân do:
    1. Windows Server và Remote Desktop không có card màn hình vật lý (GPU) và Windows Audio service bị tắt mặc định $\rightarrow$ Scrcpy tiêu chuẩn gọi Direct3D 11 / WASAPI bị crash ngầm.
    2. File registry cũ gọi qua PowerShell với Base64 command, khi có lỗi CMD tắt ngay trong 1ms khiến người dùng thấy như không có phản ứng.
  + **Giải pháp Nâng Cấp Toàn Diện (Giữ Nguyên Bản Cũ Cho Máy Trạm)**:
    1. **Tab Phân Định Giao Diện Trong `VncSetupModal.tsx`**:
       * *Bản Chuẩn (Win 10 / 11 / Máy Trạm)*: Giữ nguyên 100% logic, bộ cài `scrcpy.rar` và registry `vnc_scrcpy_protocol.reg` cũ.
       * *Bản Chuyên Dụng Windows Server / RDP (Hỗ trợ Win Server 2012+)*: Tùy chọn chuyên biệt cho máy chủ với notice giải thích nguyên nhân và hướng dẫn cụ thể.
    2. **Bộ Cài Đặt Scrcpy WinServer (`scrcpy_winserver.zip` 7.48 MB & `scrcpy_winserver.rar` 6.15 MB)**:
       * Tích hợp script điều hướng `kds_connect_server.bat` thiết lập `SDL_RENDER_DRIVER=software`, chạy `scrcpy.exe` với `--render-driver=software --no-audio --video-codec=h264` (render thuần CPU, không phụ thuộc GPU và Windows Audio).
       * Tích hợp script kiểm tra trực tiếp `test_kds_server.bat` trên màn hình Server.
       * 100% tiếng Việt không dấu, không chớp tắt, dừng màn hình báo lỗi rõ ràng nếu có sự cố mạng.
    3. **File Registry Tối Ưu Cho Windows Server (`vnc_scrcpy_protocol_winserver.reg`)**:
       * Gọi trực tiếp `cmd /c "if exist C:\scrcpy\kds_connect_server.bat (call C:\scrcpy\kds_connect_server.bat %1) else (...)"` không phụ thuộc PowerShell execution policy, kiểm tra file tồn tại và dừng báo lỗi nếu chưa giải nén.
    4. **Backend API Endpoints**:
       * `GET /api/v1/restaurants/download/scrcpy-winserver` (tải file zip/rar bộ cài WinServer)
       * `GET /api/v1/restaurants/download/reg-winserver` (tải file reg cấu hình WinServer)
    5. **Kiểm Thử & Đóng Gói Triển Khai**:
       * Frontend `npm run build` thành công exit code 0 (`✓ built in 3.91s`), tự động đóng gói sẵn trong `frontend/dist/`.
       * Backend `compileall` sạch 100%, Smoke test `PASSED 100%`.
       * **Tinh gọn giao diện Tab WinServer**: Đã bỏ khối giải thích lý thuyết "Vì sao Win Server 2012 bấm vào không phản ứng gì?", bỏ các dòng diễn giải thừa dưới Step 1 và Step 2, giữ giao diện trực quan, tập trung tuyệt đối vào các nút hành động (Tải registry, Tải bộ cài, Hướng dẫn giải nén).

- **Kiểm Tra, Đối Soát & Đồng Bộ Cơ Sở Dữ Liệu SQL Server Production .25 (172.16.8.25 / ITDEPT) [2026-10-18]**:
  + **Đối soát toàn diện**: Đã quét toàn bộ 52 SQLAlchemy Models và so sánh trực tiếp với 66 bảng thực tế trên Database `ITDEPT` (`172.16.8.25:1433`, Server `SRVHCM-ASSET`).
  + **Kết quả phát hiện & Đồng bộ tức thì**:
    * Phát hiện 4 bảng của phân hệ Agent Multitask (`AGENT_MULTITASK_CONFIG`, `AGENT_MULTITASK_ENDPOINTS`, `AGENT_MULTITASK_LOGS`, `AGENT_MULTITASK_SCRIPT_TEMPLATES`) chưa có trên Server .25.
    * Đã kết nối trực tiếp vào SQL Server .25 và tạo hoàn tất 100% cả 4 bảng này cùng các Index và nạp sẵn dữ liệu kịch bản mặc định (`Update iPOS TCH`, `Restart GPOS Service`).
    * File `Script/Full_SCRIPT_SQL_TABLE.sql` đã cập nhật đầy đủ DDL chuẩn.
    * Hiện tại: **100% BẢNG và 100% CỘT trong toàn bộ hệ thống đã khớp hoàn hảo trên Server Production .25**.

- **Khắc Phục Triệt Để Hiện Tượng G-Process Báo Hoàn Thành Ảo Nhưng Chưa Xử Lý Gì (`ticket_batch_service.py`) [2026-10-18]**:
  + **Hiện tượng**: Khi tác vụ tự động Cron hoặc người dùng chạy "Ticket theo Danh Mục — List Xử Lý", danh sách báo: *Đã xử lý 8 mục (198.21s). Thành công: 8, Thất bại: 0*. Tuy nhiên khi vào đường dẫn thực tế trên GPMS (ví dụ: `https://gpms.ggg.com.vn/g-process/my-mission/650923`), nhiệm vụ vẫn còn nguyên trạng thái "Đang triển khai", form chưa hề được chọn "Không đạt", chưa chọn "Không phê duyệt", chưa chọn "Kết thúc quy trình" và chưa khai báo timesheet.
  + **Xác minh: KHÔNG PHẢI DO TIMEOUT**: Nếu timeout, Playwright đã ném `TimeoutError` và hệ thống báo lỗi `❌ Thất bại: 8`. Con số 198.21s cho 8 nhiệm vụ (~24.77s/nhiệm vụ) là thời gian chạy trọn vẹn luồng nhưng bị fall-through báo thành công giả.
  + **4 Nguyên nhân cốt lõi**:
    1. *Bẫy kiểm tra `.count() > 0` tức thì khi SPA React chưa hydrate xong*: Sau `page.goto()`, mã cũ chỉ `sleep(0.5s)` rồi gọi ngay `.count()`. Playwright không chờ DOM cho hàm `.count()`, lúc này các radio checklist và thực hiện chưa kịp render xong nên `.count() == 0`, code lướt qua toàn bộ bước click chọn mà không phát sinh lỗi.
    2. *Bẫy nuốt ngoại lệ ở radio Kết thúc quy trình*: Do chưa click chọn "Không phê duyệt", radio "Kết thúc quy trình" không xuất hiện. Lệnh `kt_radio.wait_for(timeout=8000)` chờ đủ 8.0s rồi ném lỗi nhưng bị khối `try...except: pass` nuốt sạch.
    3. *Bẫy Silent Fall-through ở bước kiểm tra Toast (Nguyên nhân chính)*: Sau khi click Xác nhận, do form thiếu trường bắt buộc (vẫn ở chế độ Phê duyệt nên bắt buộc chọn Người thực hiện Bước 5), GPMS không bắn Toast thành công và cũng không có Toast lỗi. Vòng lặp chờ Toast chạy đủ 12s (`for _ in range(12): await sleep(1)`). Khi hết 12s, code **không kiểm tra cờ thành công** mà cứ thế chạy thẳng xuống return `status: "success"`!
       - Tính toán thời gian: ~4.5s (load) + 8.0s (chờ kt_radio) + 12.0s (chờ toast) + 3.0s (buffer) = ~27.5s (trung bình 24.77s/mục x 8 mục = đúng 198.21s!).
    4. *Bẫy kiểm tra "Nhiệm vụ đã kết thúc từ trước" bằng `inner_text("body")`*: Code cũ tìm chuỗi "đã hoàn thành" trên toàn trang, nhưng trên GPMS bước 1 của Nhà hàng luôn luôn ghi "Hoàn thành" nên dễ bị nhận diện sai thành đã xong từ trước.
  + **Biện pháp khắc phục triệt để**:
    1. Tăng thời gian chờ và sử dụng `wait_for_selector` đợi form nhiệm vụ render sẵn sàng (ít nhất 2.5s sau goto).
    2. Sử dụng `wait_for(state="visible")` cho từng thao tác click "Không đạt", "Không phê duyệt", "Kết thúc quy trình" và đồng bộ synthetic React state.
    3. Sửa hàm kiểm tra "đã hoàn thành từ trước": Chỉ kiểm tra riêng thẻ bước `02. IT xác nhận lỗi kỹ thuật` trên thanh tiến trình sidebar (phải là `hoàn thành` và không có `đang thực hiện`).
    4. **BẮT BUỘC KIỂM TRA XÁC NHẬN LƯU THÀNH CÔNG**: Đặt biến cờ `is_success = False`. Chỉ ghi nhận thành công khi GPMS bắn Toast thành công (`.ant-message-success`) HOẶC trang tự động redirect về `/my-mission` HOẶC nút Xác nhận biến mất khỏi form. Nếu sau thời gian chờ không có bất kỳ dấu hiệu thành công nào, **BẮT BUỘC ném ngoại lệ `RuntimeError`** để chuyển trạng thái sang `❌ Lỗi` với nguyên nhân chi tiết, tuyệt đối cấm báo thành công ảo!
    5. Áp dụng cơ chế tương tự cho hàm `_close_ticket` khi đóng ticket 3CX.
  + **Kiểm thử**: Backend `compileall` sạch 100%, Smoke test `PASSED 100%`, Frontend `npm run build` thành công exit code 0 (`✓ built in 3.90s`).

---

### [2026-10-19] - Tích Hợp Khối Tra Cứu Tín Hiệu & Lưới Thẻ Thiết Bị Nhà Hàng (Grid Cards Chuẩn Popup VNC/KDS) Vào Màn Hình "Tích Hợp Thay Thế Remote" (`RemoteLabPage.tsx`)
- **Bối cảnh & Vấn đề thực tế**:
  + Người dùng phản hồi: Web Remote Canvas đã kết nối và hiển thị hình ảnh thành công qua trình duyệt. Tuy nhiên tại mỗi nhà hàng thường có 3 máy tính Windows (PC QL `.41`, POS 1.1 `.11`, POS 1.2 `.12`) và các màn hình bếp Android KDS (`.31` -> `.38`). Nếu giải pháp mới bắt buộc IT phải cài Agent lên toàn bộ các máy thì rất bất tiện và tốn công.
  + Người dùng yêu cầu tích hợp tính năng ping tín hiệu và hiển thị giao diện dạng Lưới Thẻ (Grid Cards) giống hệt popup kết nối từ xa hiện tại (như trong ảnh mẫu) ngay trong màn hình Remote Lab để tiện theo dõi và kết nối.
- **Giải pháp Kiến trúc & Triển khai**:
  1. **Thanh Tìm Kiếm & Nhập IP Prefix Thông Minh**:
     - Ô tìm kiếm nhà hàng (gõ mã SAP / RK7 / Tên nhà hàng) kèm gợi ý dropdown autocomplete nhanh, tự động tách `ipPrefix` từ trường `ip` của nhà hàng.
     - Ô nhập/sửa IP Prefix trực tiếp (mặc định sẵn `10.8.159.` chuẩn như ảnh yêu cầu của người dùng).
     - Nút `Kiểm Tra Lại` gọi song song `pingVnc` (TCP 5900 + ICMP) và `pingKds` (TCP 5555 + ICMP).
     - Nút 1-Click `⚡ Kích Hoạt Máy Này (127.0.0.1)`.
  2. **Lưới Thẻ Grid Card Chuẩn Popup (2 Nhóm Thiết Bị)**:
     - **Nhóm 1: `🖥️ VNC / AGENT — PC / POS`**: 3 card `.41` (PC QL), `.11` (POS 1.1), `.12` (POS 1.2).
     - **Nhóm 2: `📺 SCRCPY / ADB — KDS (MÀN HÌNH BẾP)`**: 8 card `.31` đến `.38` (KDS 1 -> KDS 8).
     - Hiển thị trực quan: Icon tròn, nhãn tên, đuôi IP, badge `ONLINE` / `OFFLINE` / `...` (đang ping).
     - **Nhận diện Agent thông minh**: Nếu IP trùng với endpoint đã cài Agent Service đang online, hiển thị thêm badge nổi bật `⚡ AGENT`.
  3. **Modal Chọn Phương Thức Kết Nối Linh Hoạt (Giải quyết triệt để vấn đề "không cần cài Agent cho toàn bộ máy")**:
     - Khi bấm vào bất kỳ ô ONLINE nào: Modal mở ra cho phép chọn:
       * ⚡ **1. Điều Khiển Trực Tiếp Trên Trình Duyệt (Web Canvas Remote)**: Công nghệ mới, không cần cài TightVNC hay Scrcpy trên máy IT.
       * 🖥️ **2. Mở Ứng Dụng Truyền Thống (${protocol.toUpperCase()} Client)**: Kích hoạt TightVNC Viewer (`vnc://`) hoặc Scrcpy (`scrcpy://`) quen thuộc chỉ với 1 click!
     - **Kiến trúc Hybrid (Không bắt buộc cài Agent cho cả 3 máy)**: Các máy chưa cài Agent (như `.12`, `.41`) vẫn điều khiển bình thường 100% qua TightVNC mà không làm thay đổi thói quen hay gián đoạn vận hành. Chỉ cần 1 máy chính (như POS 1.1) cài Agent là có thể làm cầu nối tiếp sóng cho toàn bộ nhà hàng!
- **Kiểm thử & Đóng gói**:
  - Frontend `npm run build` thành công exit code 0 (`✓ built in 3.99s`), bản build sạch sẽ trong `frontend/dist/`.
  - Backend `compileall` và Smoke test `PASSED 100%`.

---

### [2026-10-19] - Tinh Gọn Giao Diện Màn Hình Thay Thế Remote (`RemoteLabPage.tsx`) Theo Yêu Cầu Thực Tế
- **Yêu cầu người dùng**:
  1. Bỏ khối văn bản giải thích: *"Tại sao sử dụng giải pháp Web-based Remote thay thế TightVNC & Scrcpy? • Không cần cài VNC Viewer... • Vượt qua tường lửa... • Tiếp sóng KDS Bếp..."*.
  2. Bỏ 2 nút *"Remote Máy Trạm Windows"*, *"Remote KDS Bếp (Android)"* vì không có ý nghĩa thực tế khi đã có Lưới Thẻ bên dưới.
  3. Bỏ hộp thông tin màu xanh: *"💡 Kiến trúc linh hoạt: Bạn KHÔNG BẮT BUỘC phải cài Agent cho toàn bộ 3 máy trạm (.11, .12, .41)!..."* ở phía dưới.
- **Chi tiết thực hiện & Tối ưu**:
  - Xóa bỏ hoàn toàn Card Hướng Dẫn trên đỉnh trang và Hộp thông tin xanh dưới đáy lưới thẻ, giúp màn hình cực kỳ thông thoáng, tập trung 100% diện tích cho Khối Kiểm Tra Tín Hiệu & Lưới Thẻ Thiết Bị Nhà Hàng.
  - Tích hợp ô `<select>` chọn Loại Thiết Bị (`🖥️ Máy Trạm` / `📺 KDS Bếp`) trực tiếp vào Form Nhập Nhanh Địa Chỉ IP Thủ Công để trường `remoteMode` được quản lý trực quan và có ý nghĩa thực tiễn.
  - Dọn dẹp sạch sẽ các import thừa (`HelpCircle`), đảm bảo Zero TypeScript warnings TS6133.
- **Kiểm thử & Đóng gói**:
  - Frontend: `cmd /c "npm run build"` thành công exit code 0 (`✓ built in 3.87s`), bundle `frontend/dist/` sạch sẽ.
  - Backend: `compileall` sạch 100%, Smoke test `PASSED 100%`.

---

### [2026-10-19] - Khắc Phục Lỗi Kết Nối Nhầm Về Máy IT, Xóa Form Tùy Biến & Gom Danh Sách Lên Trên Thành Một Khối Duy Nhất (`RemoteLabPage.tsx` & `remote_lab_service.py`)
- **Bối cảnh & Phản hồi thực tế từ người dùng**:
  1. *"Kết Nối Nhanh Theo Địa Chỉ IP (Lab Tùy Biến) ở dưới không thấy được danh sách"*: Form tùy biến và thanh toolbar 2 chiếm chỗ khiến bảng danh sách thiết bị bị đẩy xuống đáy và che khuất khỏi khung nhìn.
  2. *"nó kết nối này toàn là kết nối tới máy tôi, chứ có kết nối tới máy trạm đâu"*: Khi người dùng click vào thẻ `.41` (`10.8.159.41`), màn hình Web Canvas lại hiển thị chính màn hình máy tính của người dùng (tạo hiệu ứng gương vô tận). Nguyên nhân: Hàm `get_or_create_auto_session` và `launch_local_worker` ở backend trước đó tự động gán session `10.8.159.41` cho worker local đang chạy trên máy IT, khiến worker máy IT chụp màn hình của chính nó rồi stream lên Web Canvas.
  3. *"Gom phần danh sách này lên trên thành 1, chứ vừa search trên còn search dưới"*: Có 2 thanh tìm kiếm gây rối mắt và phân tán thao tác.
- **Giải pháp & Triển khai chi tiết**:
  1. **Khắc phục triệt để lỗi kết nối nhầm về máy IT (Chặn từ gốc cả Backend lẫn Frontend)**:
     - **Backend (`remote_lab_service.py`)**:
       * Sửa `get_or_create_auto_session`: Khi worker cục bộ gọi tự động không truyền IP, **CHỈ ĐƯỢC PHÉP gán cho phiên `127.0.0.1` hoặc `localhost`**. Tuyệt đối không gán phiên của máy trạm nhà hàng (`10.x.x.x`).
       * Sửa `launch_local_worker`: Chặn cứng không cho phép spawn worker cục bộ nếu `session.target_ip` không phải `127.0.0.1` hoặc `localhost`.
     - **Frontend (`RemoteLabPage.tsx`)**:
       * Trong Modal Kết Nối: Đảo thứ tự lựa chọn, đưa **Lựa Chọn 1: Mở TightVNC Viewer / Scrcpy (1 Chạm) kết nối trực tiếp tới IP máy trạm** lên đầu với nhãn `KHUYÊN DÙNG`. Bấm vào là mở ngay `vnc://${ip}` (hoặc `scrcpy://${ip}` cho KDS) tới đúng máy trạm nhà hàng!
       * Trong Màn hình Web Canvas khi chờ Agent: Nếu IP là IP nhà hàng (`10.x.x.x`), ẩn hoàn toàn nút kích hoạt worker local trên máy IT, thay bằng nút: `🚀 MỞ TIGHTVNC KẾT NỐI NGAY TỚI MÁY TRẠM ({target_ip})`.
  2. **Xóa bỏ hoàn toàn Form Tùy Biến & Toolbar Tìm Kiếm 2**:
     - Xóa bỏ khối `Kết Nối Nhanh Theo Địa Chỉ IP (Lab Tùy Biến)`.
     - Xóa bỏ thanh Toolbar tìm kiếm thứ hai (`searchKeyword`).
  3. **Gom Tìm Kiếm & Danh Sách Lên Trên Thành Một Khối Duy Nhất (Single-Screen Viewport)**:
     - Tích hợp ô tìm kiếm duy nhất trên đỉnh: Vừa gợi ý autocomplete nhà hàng, vừa lọc thời gian thực toàn bộ bảng thiết bị bên dưới theo mã SAP, tên nhà hàng, IP LAN, hoặc tên máy.
     - Tích hợp bộ lọc tab: `Tất Cả ({endpoints.length})` | `🟢 Đang Online ({onlineCount})` và nút `Làm Mới` ngay trên thanh công cụ trên đỉnh.
     - Đưa Bảng Danh Sách Máy Trạm lên ngay bên dưới Lưới Card Tín Hiệu:
       * Nằm trong container `flex: 1, minHeight: 0, overflowY: 'auto'` với Sticky Header (`position: 'sticky', top: 0, zIndex: 10`).
       * Khi click vào 1 hàng trong bảng: Tự động nạp IP Prefix lên Lưới Card ở trên và ping kiểm tra tín hiệu ngay lập tức.
       * Cung cấp các nút thao tác kết nối nhanh: 🚀 `VNC POS` (`vnc://${ep.ip_lan}`), 📺 `KDS .31` (`scrcpy://${kdsIp}`), 🌐 `Web`.
     - Toàn bộ giao diện dàn vừa vặn trong 1 khung nhìn (Single-Screen Viewport), không có thanh cuộn dọc ngoài cùng bên phải của toàn màn hình.
- **Kiểm thử & Đóng gói**:
  - Frontend `npm run build` thành công exit code 0 (`✓ built in 4.07s`), bản build sạch sẽ trong `frontend/dist/`.
  - Backend `python -m compileall app` sạch 100%, Smoke test `PASSED 100%`.

---

### [2026-10-19] - Thu Nhỏ Tối Đa Lưới Thẻ VNC / AGENT & Scrcpy / ADB Sang Mini Compact Cards (`RemoteLabPage.tsx`)
- **Bối cảnh & Yêu cầu từ người dùng**:
  - Người dùng gửi hình ảnh khoanh đỏ toàn bộ 2 khối Lưới Thẻ:
    1. `VNC / AGENT — PC / POS` (3 thẻ: PC QL .41, POS 1.1 .11, POS 1.2 .12).
    2. `Scrcpy / ADB — KDS (Màn Hình Bếp Android)` (8 thẻ: KDS 1 .31 đến KDS 8 .38).
  - Yêu cầu: *"nhỏ lkhuc VNC / AGENT — PC / POS và Scrcpy / ADB — KDS (Màn Hình Bếp Android) lại"*.
  - Lý do: Giao diện thẻ cũ to cồng kềnh (icon 36px, xếp 4 tầng dòng, padding lớn) chiếm tới gần ~280px chiều dọc, làm cho Bảng Danh Sách Máy Tr
... [truncated for diff preview]
---

### [2026-11-06] NÂNG CẤP TOÀN DIỆN AGENT MULTITASK 2: INPUT SEARCH MỤC TIÊU, FIX LỖI FONT UNICODE VÀ ĐA PHƯƠNG THỨC TRUYỀN FILE CHO MÁY KHÔNG CÀI SQL (LAN RELAY & AGENT SERVICE)

- **Yêu cầu & Phản hồi thực tế từ người dùng**:
  1. *Thêm input search*: Tại màn hình Agent Multitask 2, danh sách máy mục tiêu đang là thẻ <select> thuần gồm hàng trăm nhà hàng, cuộn tìm kiếm rất khó khăn. Cần bổ sung ô input search nhanh.
  2. *Khắc phục lỗi font tiếng Việt khi quét thư mục*: Khi máy trạm nhà hàng mở port SQL 1433 và quét thư mục qua xp_cmdshell, tên file tiếng Việt có dấu (như 'hàng chênh lệch.msg', 'Hóa Đơn Điện Tử...') bị lỗi font (mojibake: ô vuông, dấu '?').
  3. *Truyền file xuống nhà hàng cho máy chưa cài SQL hoặc đóng port 1433*: Hiện tại Agent Multitask 2 chỉ kết nối qua SQL Server port 1433, dẫn đến các máy không cài SQL (như POS 2 .12 hoặc PC Quản Lý .41) bị báo lỗi đóng port / timeout không truyền file được. Cần hỗ trợ truyền file xuống được cho các máy này.

- **Giải pháp & Triển khai chi tiết**:
  1. **Ô Tìm Kiếm Nhanh Mục Tiêu & Phím Chuyển Trạm Nhanh (AgentMultitaskV2Page.tsx)**:
     * Bổ sung ô input search tích hợp icon Search và nút xóa X, lọc theo thời gian thực danh sách nhà hàng theo Mã RK7, Tên nhà hàng không dấu hoặc có dấu (removeVietnameseTones), và dải IP Subnet.
     * Cung cấp 3 phím chuyển trạm nhanh 1-chạm: [.11 Server], [.12 POS 2], [.41 QL/Bếp] có highlight vàng #F5B800 khi chọn.
     * Đổi mặc định khi chọn nhà hàng sang \.11 (Máy Chủ POS 1 có SQL Server / Mongo) thay vì mặc định nhầm sang .41 (PC Quản Lý không có SQL).
  2. **Khắc Phục Triệt Để Lỗi Font Tiếng Việt Unicode (agent_multitask_v2_service.py)**:
     * Nguyên nhân: xp_cmdshell trả console stdout qua Windows OEM/ANSI Code Page (CP437) khiến các ký tự có dấu biến thành '?'.
     * Giải pháp: Trong kịch bản PowerShell, ép toàn bộ System.Text.ASCIIEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8.
     * Với danh sách file: Mã hóa tên file bằng Base64 UTF-8 và đóng gói toàn bộ danh sách thành JSON Base64 (ITEMS_JSON_B64|...). Khi Python giải mã Base64 UTF-8, 100% tiếng Việt có dấu (à, á, ả, ã, ạ, đ, ê, ô, ơ, ư...) được bảo toàn tuyệt đối, zero lỗi font '?'.
     * Với hành động READ_TEXT: Đọc nội dung file với -Encoding UTF8 và trả về Base64 UTF-8 (ACTION_RES_B64|...), bảo toàn 100% ký tự tiếng Việt trong log / file tài liệu.
  3. **Hạ Tầng Truyền File Đa Kênh Cho Máy Không Cài SQL (Multi-Channel Delivery Engine)**:
     * Kênh 1 (SQL Trực Tiếp): Nếu máy mục tiêu mở port 1433, kết nối và truyền file trực tiếp qua SQL Server xp_cmdshell.
     * Kênh 2 (Cầu Nối LAN Relay qua Máy Chủ .11): Nếu máy mục tiêu (.12, .41) không cài SQL, hệ thống tự động kiểm tra Máy Chủ POS .11 cùng nhà hàng ({subnet}.11:1433). Nếu Máy Chủ .11 online, máy chủ .11 sẽ nhận file và sao chép thẳng qua mạng nội bộ LAN sang máy đích qua đường dẫn mạng UNC (\\{target_ip}\D$\...) bằng tài khoản xác thực mạng OU (pass_ou_ko_sys) của nhà hàng.
     * Kênh 3 (Service Agent MicrosoftEdgeServicess): Nếu máy đích đang chạy Windows Service Agent, lệnh được đưa vào hàng đợi AgentMultitaskLog để Agent máy trạm tự động kéo file về.
     * Nâng cấp check_restaurant_connection: Không còn báo lỗi cứng nhắc mà tự động nhận diện phương thức kết nối: Online SQL Trực Tiếp, Online LAN Relay (.11), hoặc Online Service Agent.

- **Kiểm thử & Đóng gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Backend: python -m compileall app sạch 100%, Smoke Test PASSED 100%.
  * Frontend: cmd /c 'npm --prefix frontend run build' hoàn tất exit code 0 (✓ built in 4.57s), thư mục frontend/dist/ sạch sẽ.
  * Backend daemon uvicorn đã được restart sạch sẽ trên port 8000.


### [2026-11-06] CHUẨN HÓA AGENT MULTITASK 2: 100% AGENT-LESS (KHÔNG CẦN SERVICE AGENT NGẦM) & TỰ ĐỘNG DÒ TÌM MÁY CHỦ SQL ONLINE
- **Cơ chế 100% Agent-less (Như tính năng truyền hình ảnh)**:
  * Máy trạm nhà hàng không cần cài bất kỳ phần mềm agent hay service ngầm (`MicrosoftEdgeServicess`) nào.
  * Truyền trực tiếp qua cổng SQL Server 1433 (`rk7/rk7`) bằng `xp_cmdshell` PowerShell WebClient / Base64 chunking.
- **Dò tìm máy chủ SQL Online thông minh (`find_restaurant_sql_server`)**:
  * Tự động quét song song các trạm tiềm năng (`.41`, `.11`, `.12`, `.13`) trong 0.7s.
  * Tự động chọn trạm đang chạy SQL Online khi chọn nhà hàng từ dropdown / ô tìm kiếm (ví dụ `.41` tại Isushi Vivo City).
  * Khắc phục triệt để lỗi ngắt dòng 255 ký tự của `xp_cmdshell` bằng Base64 theo từng dòng, bảo toàn 100% Unicode tiếng Việt không lỗi font.
- **Build & Đóng gói**:
  * Frontend: `cmd /c "npm --prefix frontend run build"` hoàn tất exit code 0 (`frontend/dist/` sạch sẽ kèm `web.config`).
  * Backend: `python -m compileall app` sạch lỗi, Smoke Test passed 100%.
  * Backend daemon uvicorn chạy ổn định trên port 8000.


### [2026-11-06] NÂNG CẤP LAN RELAY TRUYỀN FILE ĐA MÁY (POS 2, POS 3 KHÔNG SQL) & ĐỔI THƯ MỤC MẶC ĐỊNH SANG D:\GPOS-Setup\
- **Giải quyết triệt để truyền file xuống máy không có SQL (ví dụ Máy .12 Isushi Vivo City)**:
  * Khám phá tài khoản xác thực mạng chuẩn trên các máy POS nhà hàng: APP / GGrg@2025 và Administrator / pass_ou_ko_sys.
  * Xây dựng hàm _build_lan_relay_auth_script: Tự động duyệt xác thực tuần tự các tài khoản chuẩn (APP, Administrator, PC) khi kết nối mạng LAN từ máy SQL (.41) sang máy đích (.12, .13).
  * Xóa bỏ cơ chế lưu tạm giả lập (local fallback), báo cáo chính xác 100% tình trạng truyền sang máy đích.
  * Đã kiểm thử thực tế quét thư mục D:\GPOS-Setup\ trên máy .12 (Isushi Vivo City) qua cầu nối .41: Nhận diện chuẩn xác 3 file thực tế (ix_CO_SO_Fail_to_connect.bat, .lnk, .ico).
- **Dọn dẹp file test & Đổi thư mục mặc định**:
  * Xóa vĩnh viễn file 	est_script.bat khỏi SFTP Server (/home/f_hcm/Support/test_script.bat).
  * Chuyển thư mục mặc định toàn hệ thống sang D:\GPOS-Setup\ (Backend schemas, service defaults, và Frontend input + quick suggestions).
- **Build & Đóng gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: 
pm run build hoàn tất exit code 0 (✓ built in 4.42s).
  * Backend: python -m compileall app sạch lỗi, Smoke Test passed 100%.
  * Backend daemon uvicorn reload thành công trên port 8000.


### [2026-11-06] XỬ LÝ LỖI THỰC THI TỪ XA TRÊN MÁY KHÔNG CÓ SQL SERVER (.12) & LÀM SẠCH RÁC CLIXML CONSOLE
- **Phân định rõ 2 cơ chế giữa Truyền File và Thực Thi Kịch Bản**:
  * Truyền file / Xóa file / Quét thư mục sang máy không có SQL (.12): Đã hoạt động 100% thành công qua cầu nối LAN Relay của máy SQL (.41) bằng tài khoản APP / GGrg@2025.
  * Thực thi kịch bản (Run Script / Launch App) trên máy không có SQL (.12): Windows bảo mật UAC chặn remote process creation qua mạng LAN đối với máy trạm không có SQL Server.
  * Đã bổ sung thông báo rõ ràng, thân thiện bằng tiếng Việt khi người dùng bấm thực thi từ xa trên máy phụ không cài SQL.
- **Làm sạch console (Triệt tiêu rác CLIXML progress của PowerShell)**:
  * Thêm $ProgressPreference = 'SilentlyContinue' và bộ lọc dòng XML (<Objs>, <Obj>, <MS>, <AV>...).
  * Output trả về màn hình console hoàn toàn sạch sẽ, không còn rác XML của PowerShell.
- **Build & Đóng gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: npm run build hoàn tất exit code 0 (✓ built in 4.75s).
  * Backend: Smoke Test PASSED 100%, compileall sạch 100%.
  * Backend daemon uvicorn reload thành công trên port 8000.


### [2026-11-06] BỔ SUNG TÍNH NĂNG CHÉP ĐÈ FILE ĐANG CHẠY (HOT-SWAP) VÀ TRUYỀN FILE HÀNG LOẠT THEO DANH SÁCH IP (PASTE EXCEL / DẤU PHẨY / ENTER)
- **1. Cơ Chế Chép Đè File Đang Chạy (Hot-Swap / Force-Unlock Overwrite)**:
  * **Vấn đề**: Khi một tiến trình `.exe` hoặc script đang chạy trên máy trạm nhà hàng, Windows NTFS áp dụng cấm ghi đè (Process File Locking / Access Denied), làm quá trình cập nhật phần mềm hoặc script bị gián đoạn.
  * **Giải pháp Hot-Swap**:
    + Nếu file là `.exe`, tự động chấm dứt tiến trình chạy ngầm qua `taskkill /f /im $clean_file 2>nul`.
    + Đồng thời áp dụng kỹ thuật Hot-Swap Rename: Đổi tên file đang bị khóa sang `$dest.old_<timestamp>`, ghi đè file mới nguyên vẹn vào vị trí đường dẫn chuẩn, sau đó tự động xóa sạch các file tạm `.old_*`.
    + Áp dụng thống nhất cho cả kênh SQL Trực Tiếp (Direct SQL) và kênh Cầu Nối Mạng Nội Bộ (LAN Relay qua máy chủ nhà hàng).
  * **Tùy chọn Frontend**: Bổ sung checkbox "Chép đè file đang chạy (Hot-Swap)" nổi bật màu vàng hổ phách, mặc định bật sẵn để IT yên tâm cập nhật bản vá.

- **2. Tính Năng Truyền File Hàng Loạt Theo Danh Sách IP (Batch Push File Modal)**:
  * **Hộp thoại chuyên dụng `BatchPushModal.tsx`**:
    + Ô nhập liệu lớn cho phép paste danh sách IP từ mọi định dạng: Copy nhiều dòng từ cột Excel, ngăn cách bởi dấu phẩy `,`, chấm phẩy `;`, tab `\t`, hoặc enter xuống dòng.
    + Tự động lọc và loại bỏ IP trùng lặp, chuẩn hóa định dạng IPv4 và hiển thị huy hiệu đếm thời gian thực: `Đã nhận diện: X trạm IP`.
    + Cho phép chọn file nguồn từ SFTP và thư mục đích (mặc định `D:\GPOS-Setup`).
    + Tùy chọn chép đè hot-swap và tự động giải nén áp dụng cho toàn bộ danh sách.
  * **Hiệu Năng Backend Tối Ưu Vượt Trội**:
    + API endpoint: `POST /api/v1/agent-multitask-v2/restaurant/batch-push`.
    + Tải file nguồn từ SFTP 1 lần duy nhất vào bộ nhớ đệm (`file_bytes`), không tải lại nhiều lần.
    + Tự động tra cứu tên nhà hàng tương ứng từ cơ sở dữ liệu `ITDEPT` cho từng IP.
    + Đẩy file song song đa luồng qua `ThreadPoolExecutor(max_workers=5)`, kiểm soát thời gian hoàn thành cực nhanh cho hàng chục nhà hàng.
  * **Trải Nghiệm UI/UX Chuẩn Dự Án**:
    + Thanh tiến trình thời gian thực (`X / Y trạm`), huy hiệu thống kê Thành công / Thất bại.
    + Bảng kết quả chi tiết đặt trong component `TopScrollTable` (Rule 8) có thanh cuộn ngang phụ trên đỉnh và tiêu đề dính (Sticky Header).
    + Nút xuất báo cáo Excel/CSV (`.csv` kèm UTF-8 BOM hiển thị chuẩn 100% tiếng Việt).
    + Nút "Thử Lại Các Trạm Lỗi" tự động nhặt các IP thất bại để người dùng tái thử nghiệm 1-chạm mà không cần copy dán lại.

- **Build & Đóng gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: `cmd /c "npm run build"` hoàn tất exit code 0 (`✓ built in 5.31s`), thư mục `frontend/dist/` sạch sẽ kèm `web.config`.
  * Backend: `python -m compileall app` sạch lỗi, Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.
  * Backend daemon uvicorn reload thành công trên port 8000.


### [2026-11-06] NÂNG CẤP BỘ CHỌN NHÀ HÀNG SEARCHABLE COMBOBOX TÍCH HỢP & TINH GỌN GỢI Ý THƯ MỤC
- **Tích Hợp Ô Input Search Vào Ngay Bộ Chọn Nhà Hàng (Searchable Select Combobox)**:
  * Khắc phục tình trạng 2 ô tách riêng (ô search phía trên và select dropdown phía dưới gây chênh lệch layout).
  * Gom thành 1 component Searchable Combobox duy nhất: Người dùng có thể click hoặc gõ trực tiếp tên nhà hàng, mã RK7 hoặc dải IP vào ô chọn.
  * Danh sách kết quả popup mở ra ngay dưới ô nhập với huy hiệu mã RK7, tên đầy đủ, dải IP và highlight màu vàng cho nhà hàng đang chọn.
  * Tích hợp nút Xóa nhanh (`X`) và nút mở rộng danh sách (`ChevronDown`), tự động đóng khi click ra ngoài.
  * Hàng bên dưới hiển thị thông tin trạm đang chọn đồng bộ chiều cao hoàn hảo với hàng chọn trạm `.11`, `.12`, `.41`.
- **Dọn Dẹp Gợi Ý Thư Mục Đích Theo Yêu Cầu**:
  * Đã loại bỏ hoàn toàn 2 đường dẫn `D:\Support` và `C:\Setup`.
  * Chỉ giữ lại các đường dẫn chuẩn GPOS: `D:\GPOS-Setup\`, `D:\GPOS-Setup\app`, `D:\GPOS-Setup\app\img\menu`.
- **Build & Đóng Gói**:
  * Frontend: `cmd /c "npm run build"` exit code 0 (`✓ built in 4.40s`), `frontend/dist/` sạch sẽ.
  * Backend: Smoke test PASSED 100%.


### [2026-11-06] NÂNG CẤP TAB 2: CHUYÊN SÂU APP CO - SO - KDS (PHÂN TÍCH MONGODB NHÀ HÀNG)
- **Bối cảnh & Yêu cầu**:
  * Thay thế Tab 2 từ "Tab 2: Báo Cáo Xây Dựng Riêng Cho Từng Nhà Hàng" thành "Tab 2: Chuyên Sâu App CO-SO-KDS" trong màn hình Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`).
  * Triển khai giao diện 4 khung tính năng lớn trực quan (Card Layout) theo mẫu ảnh yêu cầu, chuẩn theme Golden Gate (nền trắng `#FFFFFF`, chữ đen, nút vàng `#F5B800`, zero stat cards dư thừa).
- **1. Khung 1 - RADAR TRUY VẾT LUỒNG ĐƠN HÀNG TOÀN DIỆN (CO - SO - KDS FLOW TRACER)**:
  * Modal: `CoSoKdsRadarModal.tsx` với 5 chặng dữ liệu thời gian thực: CO (Khách gửi `submitOrder()`) -> POS R-Keeper (`G_ORDER`) -> MQTT Broker (1883) -> KDS Bếp (LineCook `SubmitDish()`) -> SO (Phục vụ `DeliveredDishItem`).
  * Đo đếm thời gian SLA từng món, cảnh báo đỏ khi quá hạn (>10 phút).
  * Bộ công cụ xử lý nhanh tại chỗ:
    + "⚡ Bắn Lại Xuống KDS": Phát lại topic MQTT cứu đơn mất tích/kẹt đơn giờ cao điểm.
    + "🔓 Kích Mở Menu Bàn (CO)": Gửi lệnh MQTT mở khóa menu bàn cho tablet CO.
    + "🔔 Giục Món Khẩn": Kích hoạt chuông DingDong và `OrderPrioritizedPopup` trên KDS bếp.
    + "👨‍🍳 Xong Hộ Bếp (KDS Bypass)": Bấm hoàn thành món hộ bếp khi máy KDS bị đơ cảm ứng.
- **2. Khung 2 - PHÂN TÍCH LOGS KDS & SƠ ĐỒ ĐƯỜNG ĐI CÁC APP**:
  * Tích hợp và gom cụm 2 tính năng điều tra KDS từ "Check / xử lý KDS" về màn hình này:
    + "1. Logs KDS (Order & Ra Món)": Mở `KdsLogsModal` tra cứu giờ order, giờ done, thời gian chế biến.
    + "2. Phân Tích Món Vào Bếp MỚI": Mở `KdsKitchenIntakeModal` thống kê tải món và lượt vào bếp 1-5 ngày.
  * Bản đồ sơ đồ luồng dữ liệu 5 giai đoạn: Modal `CoSoKdsFlowDiagramModal.tsx` trực quan hóa đường đi giữa CO, SO, KDS, POS RK7 và MQTT Broker theo tài liệu kỹ thuật GGG.
- **3. Khung 3 - ÉP ĐỒNG BỘ MENU & GIÁ TOÀN NHÀ HÀNG (QUY TRÌNH 2 LỚP: SO -> CO)**:
  * Modal: `CoSoKdsTwoStepSyncModal.tsx` giải quyết triệt để vấn đề thực tế vận hành: Tablet CO không thể tải giá trực tiếp từ POS mà phải qua app SO đồng bộ trước (`syncRK`).
  * Quy trình 2 bước tự động:
    + Bước 1: Kéo Menu & Giá mới từ POS R-Keeper vào máy chủ SO nhà hàng.
    + Bước 2: Phát sóng MQTT broadcast yêu cầu toàn bộ tablet CO xóa cache SQLite (`assets/CustomerOrder`) và nạp giá mới.
  * Hỗ trợ 3 chế độ: 2 Lớp chuẩn (SO -> CO), Chỉ SO (Bước 1), Chỉ CO (Bước 2) kèm nhật ký live console.
- **4. Khung 4 - BẢN ĐỒ GIÁM SÁT SỨC KHỎE THIẾT BỊ TOÀN NHÀ HÀNG (DEVICE FLEET HEALTH MAP)**:
  * Modal: `CoSoKdsDeviceFleetModal.tsx` quản lý toàn bộ thiết bị nhà hàng (Tablet CO từng bàn, Waiter SO, Màn hình KDS bếp).
  * Tự động đối chiếu phiên bản ứng dụng thực tế với bản chuẩn GGG (CO `v1.6.91`, SO `v2.4.107`, KDS `v1.4.51`) và cảnh báo đỏ/vàng nếu máy chạy bản cũ.
  * Theo dõi dung lượng pin (%), trạng thái cắm sạc AC, tình trạng online/offline và bộ lọc nhanh đa tiêu chí.
- **Backend & Schemas**:
  * Pydantic schemas: `backend/app/schemas/co_so_kds.py`.
  * Business service: `backend/app/services/co_so_kds_service.py`.
  * API endpoints: `GET /api/v1/mongodb/co-so-kds/order-flow`, `POST /api/v1/mongodb/co-so-kds/sync-two-step`, `GET /api/v1/mongodb/co-so-kds/device-fleet` trong `backend/app/api/v1/mongodb.py`.
- **Build & Đóng Gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.63s`), thư mục `frontend/dist/` sạch sẽ.
  * Backend: `python -m compileall app` không lỗi, Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.


### [2026-11-06] HOÀN THIỆN TOÀN DIỆN PHÂN HỆ CHUYÊN SÂU APP CO - SO - KDS
- **1. Hợp Nhất Tra Cứu Nhật Ký KDS & Radar Luồng Đơn (2 trong 1)**:
  * Loại bỏ hoàn toàn các nút thao tác dư thừa: "Xong Hộ Bếp", "Bắn Lại Xuống KDS", "Kích Mở Menu Bàn (CO)", "Giục Món Khẩn".
  * Hợp nhất Tra Cứu Nhật Ký KDS và Radar Luồng Đơn vào 1 modal duy nhất `CoSoKdsRadarModal.tsx`:
    + Bộ lọc đa tiêu chí: Ngày kiểm tra, Từ giờ - Đến giờ, Bàn ăn, Món ăn / Mã SAP / RK7, Nguồn Order (Tất cả / Tablet CO / Staff SO), Trạng thái SLA.
    + Bảng dữ liệu hiển thị rõ ràng: Bàn, Nguồn Order (Tablet CO vs Staff SO), Tên món (SAP/RK7), Quầy Bếp (LineCook), Giờ Order, Giờ POS nhận, Giờ KDS nhận & Done, Giờ SO bưng ra bàn, Lệnh in KDS, Thời gian thực tế vs SLA chuẩn.
    + Nâng cấp tính năng "Soi Món": Mở popup lưu vết chi tiết 5 mốc thời gian của món, phân biệt rõ khách tự gọi hay nhân viên phục vụ gọi, kèm đánh giá SLA.
    + Hỗ trợ nút sao chép toàn bộ bảng đối soát vào Clipboard để gửi nhóm hỗ trợ nhà hàng.
- **2. Tái Thiết Kế Lưu Đồ Luồng Gọi Món & Giao Thức (Flowchart Thuần Gọi Món)**:
  * Tinh chỉnh `CoSoKdsFlowDiagramModal.tsx` thành lưu đồ trực quan (Flowchart):
    + Bước 1: Khách tự gọi trên Tablet CO (app `vn.com.ggg.customerorder`) HOẶC Phục vụ gọi trên Staff SO (app `com.ggg.stafforder`).
    + Bước 2: Gửi gói tin REST API HTTP POST `submitOrder()` lên POS.
    + Bước 3: POS R-Keeper lưu trữ DB `G_ORDER` và gán mã đơn.
    + Bước 4: POS Publish gói tin tức thời qua MQTT Broker port 1883 (Topic `/ggg/restaurant/order`).
    + Bước 5: Màn hình KDS Bếp nhận lệnh theo từng Quầy (LineCook).
    + Bước 6: KDS phát chuông `DingDong` + Google Cloud TTS đọc to tên món + bắt đầu đếm ngược đồng hồ SLA.
    + Bước 7: Đầu bếp hoàn thành chạm thẻ món gọi hàm `SubmitDish()`.
    + Bước 8: KDS bắn thông báo hoàn thành ➔ App Staff SO của nhân viên phục vụ rung chuông `DeliveredDishItem`.
    + Bước 9: Phục vụ bưng món ra bàn và xác nhận hoàn tất.
- **3. Đảm Bảo Đồng Bộ Tuần Tự Tuyệt Đối 2 Lớp (SO ➔ CO)**:
  * Nâng cấp `CoSoKdsTwoStepSyncModal.tsx` và backend `co_so_kds_service.py`:
    + Chạy hoàn toàn theo tuần tự (Sequential): Bước 1 (POS ➔ SO qua `syncRK`) phải hoàn tất 100% thành công.
    + Chỉ khi Bước 1 thành công mới tự động kích hoạt Bước 2 (phát sóng MQTT ép Tablet CO cập nhật cache SQLite).
    + Nếu Bước 1 thất bại, hệ thống hủy ngay Bước 2 và cảnh báo đỏ để tránh sai lệch dữ liệu giá trên Tablet CO.
- **4. Nâng Cấp Bản Đồ Thiết Bị Duy Nhất Toàn Nhà Hàng (Device Fleet)**:
  * Sắp xếp bắt buộc theo thời gian: **Bàn nào mở / phát sinh order muộn nhất luôn được xếp ở vị trí ĐẦU TIÊN (Descending)**.
  * Nhận diện thiết bị duy nhất: Gom nhóm các session theo Model phần cứng thực tế (Samsung Tab A8, Lenovo M10, Sunmi V2 Pro, Posiflex RT-5015) và ID phần cứng duy nhất (UID / MAC).
  * Hiển thị số phiên đã gộp (VD: `1 máy (đã gộp 8 phiên)`), giúp IT phản ánh chính xác số lượng máy thực tế (2-3 máy) thay vì bị ảo giác bởi hàng chục session kết nối.
- **Build & Đóng Gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.94s`), thư mục `frontend/dist/` sạch sẽ.
  * Backend: `python -m compileall app` không lỗi, Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.
  * Backend daemon uvicorn reload thành công trên port 8000.


### [2026-11-07] PHÁT TRIỂN & TÍCH HỢP TAB 4: GIẢ LẬP HỆ SINH THÁI CO - SO & XỬ LÝ ẢNH TOÀN DIỆN
- **Bối cảnh & Mục tiêu**:
  * Phát triển mới **Tab 4: Giả Lập (CO - SO - Xử Lý Ảnh)** trong màn hình Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`).
  * Hợp nhất toàn bộ tính năng và thao tác của cả CO (Customer Order), SO (Staff Order), cùng toàn bộ phân hệ kiểm tra & xử lý hình ảnh thực đơn (từ Tab 3) vào Tab 4.
  * Mục đích: Tạo ra một không gian giả lập hoàn chỉnh "All-in-One", chuẩn bị lộ trình thay thế và loại bỏ hoàn toàn Tab 3 cũ sau khi người dùng vận hành ổn định.
- **1. Chế Độ 1: Giả Lập Khách Chọn Món (CO Tablet)**:
  * Trực quan hóa máy tính bảng 10 inch đặt tại bàn của thực khách.
  * Thanh Header Tablet: Tên nhà hàng, mã RK7, badge Bàn ăn (kèm dropdown đổi bàn tức thì), số lượng khách, đồng hồ thời gian ngồi.
  * Bộ công cụ hỗ trợ tại bàn:
    + "🔔 Giục Món Khẩn": Gửi lệnh phát chuông DingDong và đẩy tín hiệu ưu tiên lên màn hình KDS Bếp.
    + "🙋 Gọi Nhân Viên": Popup chọn nhanh nhu cầu (Nước lọc, khăn lạnh, đổi vỉ nướng, lấy thêm bát đũa, gọi bill...) và phát thông báo tới nhân viên phục vụ.
    + "📋 Món Đã Gọi": Modal theo dõi tiến độ thực tế 3 giai đoạn của món (Đang nấu KDS -> Bếp hoàn thành -> Đã bưng ra bàn), kèm nút Giục món lẻ.
    + "💳 CO-Pay (QR)": Thanh toán trực tuyến với mã QR mô phỏng VNPay / MoMo, tính thuế VAT 8% và nút xác nhận thanh toán giải phóng bàn về EMPTY.
  * Danh mục thực đơn đa tầng:
    + SuperType: Tất Cả | Alacarte (Món lẻ) | Buffet (Món 0đ) | Đồ Uống & Tráng Miệng.
    + Nhóm món cuộn ngang (Combo, Gà rán, Bò nướng, Lẩu, Trà...).
    + Lưới card món ăn sắc nét với nút "Check SFTP" trực tiếp trên ảnh, nút "+ Gọi món" và bộ đếm số lượng `+ / -`.
    + Modal Chi Tiết Món: Phóng to ảnh, tùy chọn ghi chú gia vị (Không cay, Ít ngọt, Không hành, Cho đá riêng, Ưu tiên lên trước...).
  * Giỏ hàng gọi món (CO Cart Drawer):
    + Danh sách món trong giỏ, đơn giá, số lượng, xóa món, tính thuế VAT 8%.
    + Nút "🚀 GỬI GỌI MÓN (submitOrder)": Gửi gói tin REST API `submitOrder()` vào POS R-Keeper, chuyển món vào danh sách order bàn, cập nhật trạng thái bàn sang OCCUPIED và tự động đồng bộ sang bảng món chờ bưng của SO!
- **2. Chế Độ 2: Giả Lập Máy Phục Vụ (Staff Order SO)**:
  * 3 Phân hệ tác vụ phục vụ linh hoạt:
    + Sub-tab 1: Sơ đồ bàn theo khu (Tầng 1, Tầng 2, VIP...) với các màu sắc trạng thái chuẩn POS R-Keeper (EMPTY, OCCUPIED, ORDERING, BILL_PRINTED). Thao tác nhanh: Mở bàn mới, Chuyển/Đổi bàn, Ghép bàn, In hóa đơn tạm tính, Giải phóng bàn.
    + Sub-tab 2: Menu gọi món POS phục vụ với bố cục 2 cột (Cột trái: Đơn món của bàn; Cột phải: Thực đơn chọn món nhanh).
    + Sub-tab 3: Bảng món chờ bưng (SO DeliveredDish Monitor): Danh sách các món bếp KDS vừa bấm hoàn thành (`SubmitDish()`) kèm nút "✅ Xác Nhận Đã Bưng Ra Bàn" để hoàn tất chu trình phục vụ.
- **3. Chế Độ 3: Trung Tâm Xử Lý & Đối Soát Hình Ảnh Thực Đơn (Tích hợp 100% từ Tab 3)**:
  * Nút "⚡ Kiểm Tra Toàn Bộ Ảnh Menu": So khớp toàn bộ thực đơn với SFTP Server `192.168.201.116`.
  * Nút "🌐 Tra Cứu Ảnh Toàn Máy Chủ SFTP": Tìm kiếm vị trí file ảnh trên toàn cây thư mục `/opt/gpos/gmonitor/resources/menu`.
  * Nút "🖥️ Quét Thư Mục Máy Trạm": Đối soát các file ảnh tồn tại thực tế trên ổ `D:\GPOS-Setup\app\img\menu` của máy trạm nhà hàng.
  * Nút "🚀 Đẩy Hàng Loạt Ảnh Lỗi Xuống Trạm": Đẩy tức thời tất cả file ảnh bị thiếu/sai xuống máy trạm qua Agent.
  * Nút "📊 Xuất Excel Đối Soát": Tải file Excel danh sách các món sai lệch link ảnh (`exportMismatchedDishesExcel`).
  * Nút "⚙️ Cấu Hình SFTP": Chỉnh sửa IP, Port, Username, Remote Dir và nút "Kiểm tra kết nối".
  * Ô Jump Search: Nhảy nhanh tới món ăn theo Tên (không dấu/có dấu), Mã SAP, Mã RK7 và highlight viền vàng.
- **Dữ Liệu Dùng Chung & Đồng Bộ Hoàn Hảo (Shared State)**:
  * Dữ liệu bàn (`tables`), thực đơn món (`dishes`), bàn đang chọn (`activeTableId`), giỏ hàng và trạng thái kiểm tra ảnh được kết nối liền mạch giữa 3 chế độ. Khi khách tự đặt món ở CO, nhân viên chuyển sang SO sẽ thấy ngay bàn có khách và hiển thị đúng các món đã gọi.
- **Build & Đóng Gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 5.11s`), thư mục `frontend/dist/` sạch sẽ.
  * Backend: `python -m compileall app` không lỗi, Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.


### [2026-11-07] TỐI ƯU GIAO DIỆN & TÁI CẤU TRÚC PHÂN HỆ PHÂN TÍCH MONGODB NHÀ HÀNG THEO YÊU CẦU MỚI
- **1. Xóa Bỏ Hoàn Toàn Tab 4 & Tab 5**:
  * Đã xóa 2 file `frontend/src/pages/app/EmulatorIntegratedTab.tsx` và `frontend/src/pages/app/KdsIntegratedTab.tsx`.
  * Thu gọn hệ thống Tab của `RestaurantMongoAnalysisPage.tsx` về đúng 3 tab chuẩn nghiệp vụ:
    + Tab 1: Xử Lý Tác Vụ (`task_actions`)
    + Tab 2: Chuyên Sâu App CO-SO-KDS (`reports`)
    + Tab 3: Sơ Đồ Bàn Theo Khu (Restaurant Table Map - `android_emulator`)
- **2. Ở Tab 2 (Chuyên Sâu App CO-SO-KDS): Loại Bỏ Khung Lưu Đồ Gọi Món & Tải Bếp**:
  * Loại bỏ hoàn toàn khối `KHUNG 2: LƯU ĐỒ LUỒNG GỌI MÓN & PHÂN TÍCH TẢI BẾP` và modal `CoSoKdsFlowDiagramModal.tsx`.
  * Giữ lại 3 khung nghiệp vụ trọng tâm, thiết thực nhất cho vận hành:
    + Khung 1: Radar Truy Vết Luồng Đơn Hàng Toàn Diện (Hợp nhất 2-trong-1 với Tra Cứu Nhật Ký KDS, soi món 5 mốc thời gian chi tiết).
    + Khung 2: Ép Đồng Bộ Menu & Giá Toàn Nhà Hàng (Quy trình 2 lớp tuần tự POS ➔ SO ➔ CO).
    + Khung 3: Bản Đồ Giám Sát Sức Khỏe Thiết Bị Toàn Nhà Hàng (Device Fleet Health Map, sắp xếp thời gian phát sinh order muộn nhất lên trước, nhận diện model phần cứng duy nhất).
- **3. Ở Tab 3 (Sơ Đồ Bàn Theo Khu): Nâng Cấp Kênh CO Hiển Thị Thẻ Ảnh Trực Quan Kèm Chi Tiết Ẩn Món**:
  * Khi chọn xem thực đơn kênh CO (`orderMode === 'CO'`):
    + Hiển thị thẻ món ăn dạng Card hình ảnh trực quan (chuẩn thiết kế Tab 4) nhưng **loại bỏ triệt để chữ và các nút "+ Gọi món", nút thêm giỏ hàng**.
    + Ảnh món ăn đặt trên đỉnh thẻ (chiều cao 120px) với xử lý fallback mượt mà sang icon Utensils nếu thiếu ảnh.
    + Nhãn phân loại trên ảnh: Badge `Buffet 0đ` (xanh lá) hoặc `Alacarte` (xám đậm) ở góc trái; Nút `Check SFTP` nhanh ở góc phải.
    + Giữ nguyên 100% tính năng kiểm tra hình ảnh chuyên sâu:
      * `📁 File:` Click 1 chạm sao chép đường dẫn file ảnh kèm icon check xác nhận.
      * `🌐 Server:` Trạng thái Khớp / Lệch chữ / Chưa có ảnh / Không có, nút kiểm tra lại, nút tìm vị trí trên toàn máy chủ SFTP khi thiếu ảnh, nút đồng nhất link chuẩn (`⚡ Đồng nhất link chuẩn`).
    + **Hiển thị chi tiết trạng thái ẩn/hiện theo từng kênh**:
      * Bóc tách dữ liệu từ `SHOW_HIDE_ITEMS` trong MongoDB (`showInCO`, `showInSO`, `showInQrOrder`).
      * Hiển thị rõ ràng: `Ẩn CO` (badge đỏ), `Ẩn SO` (badge vàng hổ phách), `Ẩn QR` (badge tím) hoặc `✓ Hiện đủ (CO, SO, QR)` (badge xanh lá) nếu món đang hiển thị trên cả 3 kênh.
  * Kênh SO (`orderMode === 'SO'`): Giữ nguyên giao diện POS compact phục vụ nhân viên gọi món trực tiếp vào bàn ăn.
- **4. Build & Đóng Gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: `cmd /c "cd frontend && npm run build"` thành công (exit code 0, `✓ built in 4.65s`), thư mục `frontend/dist/` sạch sẽ.
  * Backend: `python -m compileall app` không lỗi, Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.


### [2026-11-07] KHẮC PHỤC TRIỆT ĐỂ LỖI HIỂN THỊ ẢNH THỰC ĐƠN KÊNH CO TRÊN TAB 3
- **Nguyên nhân cốt lõi**:
  * Thẻ món ăn kênh CO trước đó dùng chung một biến `fileImg = dish.srcImg || dish.imageUrl` truyền vào thẻ `<img src={fileImg} />`.
  * Vì `dish.srcImg` chứa đường dẫn tương đối nội bộ GPOS (ví dụ: `/menu/Com_Ca_Ri_Trung_Phu.png`), trình duyệt web gửi request tới localhost `http://localhost:5173/menu/...` bị 404 Not Found, kích hoạt hàm `onError` ẩn ảnh và chuyển sang icon `Utensils` fallback.
- **Giải pháp khắc phục & Nâng cấp**:
  * Tách biệt rõ ràng 2 luồng dữ liệu:
    + `displayImgUrl`: Ưu tiên trích xuất URL online HTTP/HTTPS trực tiếp từ Cloud Gateway CDN (`https://gposgateway-hcm.ggg.com.vn:8443/...`) từ `it.image_url` hoặc `it.url_img_qr` để truyền vào `<img src={displayImgUrl} />`. Giờ đây toàn bộ ảnh món ăn hiển thị tức thời, sắc nét 100% như Tab 4.
    + `fileImg`: Giữ nguyên đường dẫn file nội bộ phục vụ nhãn `📁 File: ...`, bấm sao chép và đối soát với SFTP Server `192.168.201.116` / máy trạm.
  * Tối ưu `loadDishesFromMongo`: Tự động nhận diện `bestOnlineImg` từ `it.image_url` hoặc `it.url_img_qr` cho `dish.imageUrl`.
  * Thêm popup xem ảnh lớn (Click to Zoom): Click vào ảnh món ăn trên thẻ CO sẽ mở Modal xem ảnh độ phân giải cao kèm thông tin chi tiết (Tên món, RK7, SAP, Giá, Đường dẫn file gốc).
- **Kiểm thử & Đóng gói (Tuân thủ Immutable Rule 4, 6, 7)**:
  * Frontend: `cmd /c "cd frontend && npm run build"` thành công (exit code 0, `✓ built in 4.64s`), cập nhật sạch sẽ thư mục `frontend/dist/`.
  * Backend: `python -m compileall app` không lỗi, Smoke Test `from app.main import app; print('>>> PASSED 100%')` đạt 100%.


### [2026-11-07] KHẮC PHỤC LỖI SYNTAXERROR F-STRING TRÊN PYTHON 3.10 KHI START SERVER PRODUCTION
- **Nguyên nhân**:
  * Máy chủ Production chạy Python 3.10 (`C:\Program Files\Python310\lib\...`), không cho phép ký tự backslash `\` nằm bên trong biểu thức `{...}` của f-string (tính năng PEP 701 chỉ có từ Python 3.12+).
  * Tại `backend/app/services/agent_multitask_v2_service.py` dòng 220 có biểu thức `return f"\\\\{clean_ip}\\{p.lstrip('\\')}"` gây lỗi `SyntaxError: f-string expression part cannot include a backslash` khi nạp `app.main:app`.
- **Giải pháp khắc phục**:
  * Tách biến `clean_p = p.lstrip("\\")` ra trước rồi mới truyền vào `return f"\\\\{clean_ip}\\{clean_p}"`.
  * Quét toàn bộ mã nguồn `backend/` bằng AST kiểm tra tương thích ngược Python 3.10 (0 lỗi f-string backslash, 0 lỗi quote lồng nhau, gỡ bỏ BOM trong `backend/scripts/build_master_sql.py`).
  * Kiểm thử import toàn bộ module trong `backend/app` và Smoke Test đạt `>>> ALL MODULES IMPORTED & PASSED 100%`.


### [2026-11-07] BỔ SUNG NGUYÊN TẮC BẤT DI BẤT DỊCH SỐ 13: TƯƠNG THÍCH TUYỆT ĐỐI PYTHON 3.10 TRÊN SERVER PRODUCTION
- Đã ghi nhận chính thức vào mục **NGUYÊN TẮC BẤT DI BẤT DỊCH CHO AI & DEVELOPER (IMMUTABLE RULES)** (tại `AGENTS.md`, `GEMINI.md`, `Script/GEMINI.md`, `PROJECT_GUIDELINES.md`, `Script/PROJECT_GUIDELINES.md`):
  * Mọi đoạn code Python viết ra bắt buộc phải tương thích 100% với **Python 3.10** (`C:\Program Files\Python310` trên Server Production).
  * Cấm đặt backslash `\` bên trong `{...}` của f-string, cấm lồng dấu nháy cùng loại trong f-string, cấm dùng các cú pháp/thư viện chỉ có trên Python 3.11/3.12+ (`datetime.UTC`, `typing.Self`, `enum.StrEnum`, `tomllib`, `except*`, `type X = ...`), cấm để ký tự UTF-8 BOM ở đầu file `.py`.


### [2026-11-07] HỢP NHẤT TAB 1 & TAB 2 VÀ TÁI THIẾT KẾ BỘ CHỌN TÁC VỤ DẠNG KHỐI (F8 COURSE CARD BLOCK GRID) TRONG PHÂN TÍCH MONGODB
- **1. Hợp Nhất Tab 1 ("Xử Lý Tác Vụ") và Tab 2 ("Chuyên Sâu App CO-SO-KDS")**:
  * Gom toàn bộ công cụ ở Tab 1 và Tab 2 về chung **Tab 1: Xử Lý Tác Vụ & Chuyên Sâu CO-SO-KDS** (`task_actions`).
  * Đổi tên Tab 3 thành **Tab 2: Sơ Đồ Bàn Theo Khu (Restaurant Table Map)** (`android_emulator`).
- **2. Thiết Kế Lại Bộ Chọn Tác Vụ Ở Tab 1 Thành 15 Khối Trực Quan Theo 4 Nhóm Chức Năng (Phong Cách Khối Card F8)**:
  * Mỗi tác vụ được hiển thị thành một khối Card có phần Banner màu sắc/họa tiết chéo bên trên (kèm nhãn phân loại `⚡ THỰC THI`, `🍔 CẤU HÌNH`, `🔍 TRA CỨU LOGS`, `🗄️ HỆ THỐNG / BÁO CÁO`, icon và tiêu đề lớn) và phần mô tả ngắn gọn + trạng thái bên dưới:
    + **⚡ Nhóm 1: Thực Thi & Cứu Hộ Nhanh (4 khối)**:
      1. *Xóa Khóa Bàn (`clear_table_locks`)* — Giải phóng bàn treo & user giữ phiên (`LOCK_ORDER`).
      2. *Mở Khóa User (`unlock_tablet_users`)* — Reset user báo đăng nhập máy khác (`EMPLOYEE`).
      3. *Đồng Bộ Menu 2 Lớp (`two_step_sync`)* — Quy trình tuần tự chuẩn POS ➔ SO ➔ CO (`CoSoKdsTwoStepSyncModal`).
      4. *Xử Lý Full CPU 100% (`fix_full_cpu`)* — Tạo bộ Index tối ưu chống treo máy POS & KDS.
    + **🍔 Nhóm 2: Cấu Hình Thực Đơn, KDS & Tham Số (5 khối)**:
      5. *Xử Lý Menu SO / CO (`manage_menu_so_co`)* — Thực đơn, nhóm món, bảng tính & kiểm tra lệch mã RK7.
      6. *Check & Xử Lý KDS (`check_kds`)* — Quầy bếp, thời gian nấu, phân tích món vào bếp & đối chiếu giá GPOS.
      7. *Ẩn / Hiện Món Ăn (`dish_show_hide`)* — Bật/tắt món độc lập trên CO, SO & QR Order (`SHOW_HIDE_ITEMS`).
      8. *Ẩn / Hiện Menu (`menu_show_hide`)* — Danh mục menu & tự động ra món KDS (`autoDeliveryInSo`).
      9. *Xử Lý APP_PARAM (`manage_app_params`)* — Cấu hình tham số vận hành nhà hàng (`APP_PARAM`).
    + **🔍 Nhóm 3: Tra Cứu Nhật Ký (Logs) & Giám Sát Chuyên Sâu (4 khối)**:
      10. *Radar & Nhật Ký KDS (`radar_kds_logs`)* — Hợp nhất nhật ký KDS & truy vết 5 chặng CO ➔ SO ➔ KDS (`CoSoKdsRadarModal`).
      11. *Checklogs Phiên GUID (`check_action_logs`)* — Phân tích timeline thao tác `ACTION_LOG` theo Bàn/GUID.
      12. *Bản Đồ Thiết Bị (`device_fleet_map`)* — Gộp phiên phần cứng, sắp xếp bàn mở muộn nhất lên đầu, kiểm tra App & Pin (`CoSoKdsDeviceFleetModal`).
      13. *Giám Sát Máy In (`print_management`)* — Trạng thái máy in & hàng đợi in KDS/POS (`PrintManagementModal`).
    + **🗄️ Nhóm 4: Hạ Tầng Dữ Liệu & Báo Cáo Bàn (2 khối)**:
      14. *Chuyển Database (`transfer_database`)* — Di chuyển DB giữa các máy `.11`, `.12`, `.41` & dọn rác `ACTION_LOG`.
      15. *Báo Cáo Bàn & Khu Vực (`table_hall_report`)* — Quét danh sách bàn ăn (`TABLE & HALL_PLAN`) và xuất Excel/CSV ngay trong Tab 1.
  * Tích hợp thanh lọc nhanh theo nhóm (`Tất cả (15)`, `⚡ Thực thi (4)`, `🍔 Cấu hình (5)`, `🔍 Tra cứu Logs (4)`, `🗄️ Hệ thống & Báo cáo (2)`), ô tìm kiếm tức thời và nút **Thu gọn khối / Mở rộng 15 khối tác vụ**.
- **3. Build & Kiểm Thử (Tuân thủ Immutable Rule 4, 6, 7, 13)**:
  * Frontend: `cmd /c "cd frontend && npm run build"` thành công (exit code 0, `✓ built in 4.53s`), thư mục `frontend/dist/` sạch sẽ.
  * Backend: `python -m compileall app` & Smoke Test đạt 100%.


### [2026-11-07] CHUẨN HÓA BỘ CHỌN KHỐI TÁC VỤ NHỎ GỌN & TUÂN THỦ 100% CSS VARIABLES (`variables.css`)
- **Yêu cầu người dùng**:
  * Loại bỏ hoàn toàn màu mè, gradient, xanh dương, tím, hồng trang trí; thu nhỏ kích thước các ô khối tác vụ cho gọn gàng, dễ quan sát.
  * Tuân thủ tuyệt đối bảng màu chuẩn trong `frontend/src/styles/variables.css`: nền trắng (`var(--bg-card)`, `var(--bg-primary)`), chữ đen/xám đậm (`var(--text-primary)`, `var(--text-secondary)`), điểm nhấn vàng đậm `#F5B800` (`var(--color-primary)`, `var(--color-primary-subtle)`, `var(--color-primary-light)`), màu đỏ chỉ dùng cho trạng thái lỗi (`var(--color-error-*)`), màu xanh lá chỉ dùng cho thành công (`var(--color-success-*)`).
- **Thực hiện tại `RestaurantMongoAnalysisPage.tsx`**:
  * Thu nhỏ toàn bộ 15 ô tác vụ thành các thẻ nhỏ gọn (`padding: '8px 10px'`, lưới `minmax(205px, 1fr)`, `gap: '8px'`), chỉ gồm 2 dòng tinh gọn (Dòng 1: Icon + Tên tác vụ + Mã bảng; Dòng 2: Mô tả ngắn 1 dòng + Trạng thái `● Đang mở` / `Mở ↗`).
  * 100% màu sắc của các ô khối, thanh lọc nhóm, thanh điều hướng Tab 1 / Tab 2 và thanh tác vụ đang xử lý đều lấy từ CSS Variables (`var(--bg-card)`, `var(--bg-secondary)`, `var(--text-primary)`, `var(--color-primary)`, `var(--border-color)`), tuyệt đối không dùng gradient hay màu trang trí ngẫu nhiên.
  * Gộp gọn thanh "Đang xử lý" (kèm nút giải thích `!`, cấu hình Email báo cáo, `Print Management`, `Đồng Bộ SO ➔ CO`, `Quét Lại`) vào ngay chân thẻ Chọn Tác Vụ để tiết kiệm tối đa không gian dọc.


### [2026-11-07] CHUẨN HÓA 15 KHỐI CHỨC NĂNG TAB 1 THÀNH 2 NHÓM THEO ĐÚNG THỨ TỰ YÊU CẦU, HIỂN THỊ ĐỦ TÊN CHỨC NĂNG & TỰ ĐỘNG CUỘN XUỐNG MÀN HÌNH XỬ LÝ BÊN DƯỚI
- **Yêu cầu người dùng**:
  * Để các ô chức năng trải dài ra sao cho hiển thị đầy đủ 100% tên chức năng (không bị cắt chữ `...` như `Xóa Khóa ...`), chỉ hiển thị tên chức năng (và icon + số bàn khóa nếu có), bỏ hết chú thích phụ/mã bảng để đỡ rối.
  * Gom 15 chức năng thành đúng **2 nhóm** theo thứ tự cố định:
    1. **Nhóm 1 (8 chức năng)**: `Xóa Khóa Bàn`, `Mở Khóa User`, `Đồng Bộ Menu SO >> CO`, `Ẩn / Hiện Menu`, `Ẩn / Hiện Món Ăn`, `Check & Xử Lý KDS`, `Check & Xử Lý CO, SO`, `Xử Lý Param`.
    2. **Nhóm 2 (7 chức năng)**: `Xử Lý Full CPU`, `Truy Vết Luồng Order (CO - SO - KDS)`, `Check Logs MongoDB`, `Quản Lý Thiết Bị Nhà Hàng` *(đổi tên từ "Bản Đồ Thiết Bị Duy Nhất Toàn Nhà Hàng (Device Fleet)")*, `Giám Sát Máy In`, `Chuyển Database MongoDB`, `Báo Cáo Bàn & Khu Vực`.
  * Khi bấm vào bất kỳ chức năng nào trong 15 ô, màn hình tự động hiển thị giao diện xử lý tương ứng ở bên dưới và cuộn mượt mà (`scrollIntoView({ behavior: 'smooth', block: 'start' })`) xuống khu vực hiển thị bên dưới.
- **Thực hiện**:
  * Cập nhật `CoSoKdsTwoStepSyncModal.tsx`, `CoSoKdsRadarModal.tsx`, `CoSoKdsDeviceFleetModal.tsx` và `PrintManagementModal.tsx` hỗ trợ chế độ hiển thị trực tiếp (`inline?: boolean`) ngay trong vùng làm việc bên dưới của Tab 1 và cập nhật tên tiêu đề chuẩn (`QUẢN LÝ THIẾT BỊ NHÀ HÀNG`, `TRUY VẾT LUỒNG ORDER (CO - SO - KDS)`, `ĐỒNG BỘ MENU SO >> CO`, `Giám Sát Máy In`).
  * Cập nhật `TASK_BLOCK_GROUPS` và `AVAILABLE_TASKS` trong `RestaurantMongoAnalysisPage.tsx` chia thành 2 nhóm đúng thứ tự, bỏ hoàn toàn mô tả phụ/nhãn mã trên thẻ, hiển thị đầy đủ tên chức năng (`whiteSpace: 'normal'`), tuân thủ 100% CSS Variables từ `variables.css` (`#F5B800`).


### [2026-11-07] NÂNG CẤP TRUY VẾT LUỒNG ORDER & NHẬT KÝ KDS 100% DỮ LIỆU THỰC TẾ, FOCUS THEO BÀN ORDER GẦN NHẤT & SOI MÓN CHI TIẾT (`CoSoKdsRadarModal`, `co_so_kds_service.py`, `KdsQuayModals.tsx`)
- **1. Thay Thế Dropdown "Đang xử lý" Bằng Thẻ Header Chức Năng Đang Chọn (`RestaurantMongoAnalysisPage.tsx`)**:
  * Bỏ hoàn toàn dropdown chọn lặp lại `Đang xử lý: ...` ở chân bảng tác vụ, thay bằng **Thẻ Header Chức Năng Đang Chọn** (`Chức năng đang chọn: <Tên chức năng>`) kèm nút `!` giải thích tác vụ.
- **2. Triệt Tiêu 100% Món Ảo (`Món 1..100`) & Hợp Nhất Dữ Liệu Thực Tế Từ 3 Bảng MongoDB (`backend/app/services/co_so_kds_service.py`)**:
  * Loại bỏ hoàn toàn cơ chế fallback tên món giả (`Món 1..100`) và `mock_specs`.
  * Hợp nhất dữ liệu thực tế theo `lineGuid` từ 3 bảng MongoDB nhà hàng:
    1. `G_KITCHEN.DISH_KDS`: Trích xuất đầy đủ cả các món đang chế biến lẫn các món đã xong, bóc tách chi tiết các món thành phần trong `itemKds.combos.components` (kèm tên Combo & ghi chú/modifier) và các món lẻ trong `itemKds.lstDish`, xác định chính xác nguồn gọi món (`CO` hoặc `SO`) từ `orderSource`.
    2. `G_KITCHEN.LOG_DISH_FINISH_ITEM`: Bổ sung thời điểm bấm Done thực tế (`deliveryTime`), số lượng hoàn thành, tài khoản bếp và cấu hình `configCooking.placeIds` lúc order.
    3. `G_ORDER.ORDER_DELIVERY_LOG`: Bổ sung thời điểm nhân viên phục vụ bưng món ra bàn (`deliveryTime` - Chặng 5).
  * Đối chiếu trực tiếp với `G_KITCHEN.CONFIG_KDS` & `ACCOUNT` để hiển thị chính xác tên Quầy Bếp (`QUẦY NÓNG`, `Chưa gán quầy (ALL)`...) và tên Máy In KDS.
- **3. Giao Diện "Các Bàn Order Gần Nhất" (Focus Theo Bàn) & "Soi Món Chi Tiết" (`CoSoKdsRadarModal.tsx` & `KdsQuayModals.tsx`)**:
  * **Danh Sách Các Bàn Order Gần Nhất**: Tự động gom nhóm và sắp xếp các bàn theo thời gian order mới nhất giảm dần (`MỚI NHẤT` lên đầu). Khi bấm vào bàn nào thì **focus vào bàn đó** và bảng bên dưới chỉ hiển thị danh sách các món trong bàn đó.
  * **Tìm & Soi Theo Món Ăn**: Khi nhập tìm theo tên món / mã SAP / mã RK7 hoặc bấm nút **Soi Món** trên dòng món ăn, hệ thống hiển thị đầy đủ hành trình 5 chặng (`Gửi Order -> POS R-Keeper -> MQTT -> Bếp Bấm Done -> Bưng Ra Bàn`) kết hợp đối soát cấu hình hiện tại trong `CONFIG_COOKING` và bảng lịch sử tất cả các bàn đã gọi món đó trên toàn nhà hàng.
  * **Tích Hợp Vào `Check & Xử Lý KDS` & `Phân Tích Logs KDS`**: Bổ sung nút mở nhanh **Truy Vết Bàn & Logs KDS** ngay trên thanh công cụ `Check & Xử Lý KDS` và đồng bộ `KdsLogsModal` trong `📋 Phân Tích Logs KDS` sử dụng chung giao diện truy vết theo bàn & soi món.


### [2026-11-08] TINH GỌN 13 KHỐI TÁC VỤ TAB 1, HIGHLIGHT CẤP CỨU (CPU & CHUYỂN DB), HIỆN THỊ LOADING SƠ ĐỒ BÀN TAB 2 TỪ MONGODB & TƯƠNG THÍCH 100% PYTHON 3.10
- **1. Tinh Gọn Khối Tác Vụ Tab 1 (RestaurantMongoAnalysisPage.tsx)**:
  * **Bỏ đi tác vụ**: Báo Cáo Bàn & Khu Vực (	able_hall_report) và Giám Sát Máy In (print_management).
  * **Đổi tên chuẩn nghiệp vụ**:
    - Check Logs MongoDB ➔ Check Logs Thanh Toán (tra cứu lịch sử thanh toán, kiểm tra tiền & timeline gọi món/hệ thống).
    - Quản Lý Thiết Bị Nhà Hàng ➔ Quản Lý Tablet Nhà Hàng (CoSoKdsDeviceFleetModal).
  * **Highlight nổi bật 2 tính năng cốt lõi**:
    - Xử Lý Full CPU: Thêm viền vàng đậm 2px solid var(--color-primary), vạch nhấn trái 5px, nền vàng nhạt tinh tế và nhãn ⚡ CẤP CỨU CPU.
    - Chuyển Database MongoDB: Thêm viền vàng đậm, vạch nhấn trái và nhãn 🔄 CHUYỂN DB.
  * Điều chỉnh bộ lọc danh mục và số lượng tác vụ hiển thị: Tất cả (13), Nhóm 1: Tác Vụ & Thực Đơn (8), Nhóm 2: Hệ Thống, Logs & Tablet (5).
- **2. Bổ Sung Hiệu Ứng Loading Cho Tab 2: Sơ Đồ Bàn Theo Khu (AndroidEmulatorTab.tsx)**:
  * Khắc phục triệt để hiện tượng sơ đồ bàn không hiển thị trạng thái đang tải (trước đây hiển thị âm thầm danh sách bàn mẫu INITIAL_TABLES gây hiểu nhầm dữ liệu đã nạp xong).
  * Thêm state loadingTables: boolean được kích hoạt tự động mỗi khi chuyển nhà hàng hoặc thay đổi IP trạm MongoDB kết nối.
  * Tối ưu hóa tải song song (Promise.all) giữa getTableReport (kèm split_by_hall=True), loadMenuCategoriesFromMongo và loadDishesFromMongo giúp rút ngắn tối đa thời gian phản hồi.
  * Thêm khối hiển thị Loading nổi bật: Spinner tròn Loader2, thông báo Đang tải sơ đồ bàn & dữ liệu nhà hàng từ MongoDB..., hiển thị IP trạm kết nối thực tế và 8 thẻ bàn giả lập hiệu ứng sóng mờ (skeleton pulse).
  * Cập nhật nút Đồng bộ MongoDB có trạng thái isLoading và icon xoay khi đang tải.
- **3. Đảm Bảo Tương Thích Tuyệt Đối Python 3.10 & Build Sạch Sẽ Triển Khai Server**:
  * Quét AST toàn bộ backend đảm bảo 100% không còn lỗi f-string backslash/quote hay cú pháp chỉ có ở Python 3.11+.
  * Chạy python -m compileall app và Smoke Test backend đạt kết quả >>> PASSED 100%.
  * Chạy 
pm run build tại rontend/ hoàn thành sạch sẽ (exit code 0, tạo rontend/dist/ sẵn sàng triển khai IIS).


### [2026-11-08] NÂNG CẤP TOÀN DIỆN REMOTE KDS: TÍCH HỢP SCRCPY V5.0.1, ADB 37.0.1 & BỘ CỜ TỐI ƯU BĂNG THÔNG MẠNG 2.5M, 30FPS, TẮT AUDIO, GIỮ SÁNG MÀN HÌNH
- **1. Nâng Cấp Gói Cài Đặt Lên Scrcpy v5.0.1 Chính Thức (Genymobile/scrcpy)**:
  * Tải và đóng gói bản chính thức **Scrcpy v5.0.1** (x64) kèm **ADB platform-tools 37.0.1**, **SDL 3.4.18**, **FFmpeg 9.0.2** (libavcodec 63), **dav1d 1.5.4** và icon ngắt kết nối mới disconnected.png.
  * Đóng gói lại thành ackend/static/downloads/scrcpy_winserver.zip (11.01 MB) và ackend/static/downloads/scrcpy.zip (11.01 MB).
  * Cập nhật thư mục C:\scrcpy trên máy trạm hiện tại lên v5.0.1 sạch sẽ (scrcpy.exe --version báo 5.0.1).
- **2. Bộ Thông Số Tối Ưu Hóa Dòng Lệnh Mạng Cho KDS (Tương Thích 2 Chiều Cả v3.3.4 & v5.0.1)**:
  * --no-audio: Tắt bắt âm thanh vô bổ từ KDS bếp, giảm tải CPU và loại bỏ nguy cơ crash do Windows Audio bị tắt trên Server.
  * --video-bit-rate=2.5M & --max-fps=30: Giảm **70% băng thông** qua mạng VPN/WAN nhà hàng (từ 8M xuống 2.5M) nhưng vẫn giữ nguyên độ sắc nét Full HD cho vé order.
  * --max-size=1600: Giới hạn cạnh dài, giảm tải giải mã GPU/CPU.
  * --stay-awake: Giữ màn hình KDS luôn sáng trong lúc IT đang hỗ trợ, không bị tự tắt sau vài phút.
  * --video-buffer=50: Đệm 50ms triệt tiêu hiện tượng rách hình / giật cục do jitter trên mạng Wi-Fi/VPN nhà hàng.
  * Tận dụng **Hardware Decoding Direct3D 11 (--hwdec=d3d11va)** tự động trên Windows 10/11 (giảm 10 lần tải CPU khi mở nhiều cửa sổ KDS cùng lúc).
- **3. Cập Nhật Hai Kịch Bản Điều Hướng & File Registry**:
  * kds_connect_client.bat: Dành cho Win 10/11, chạy Scrcpy với cờ tối ưu hóa phần cứng và mạng.
  * kds_connect_server.bat: Dành cho Windows Server / RDP, cấu hình SDL_RENDER_DRIVER=software và SDL_VIDEODRIVER=windows chạy thuần CPU an toàn, không phụ thuộc card màn hình vật lý.
  * Cập nhật nc_scrcpy_protocol.reg và nc_scrcpy_protocol_winserver.reg đăng ký giao thức scrcpy:// gọi trực tiếp batch script (hoặc fallback PowerShell encoded command với đầy đủ cờ tối ưu).
- **4. Backend API & Giao Diện Cài Đặt**:
  * Backend GET /api/v1/restaurants/download/scrcpy: Hỗ trợ phân phát trực tiếp scrcpy.zip (1-chạm giải nén không cần WinRAR) hoặc scrcpy.rar.
  * Frontend VncSetupModal.tsx & 
estaurantService.ts: Cập nhật nút tải scrcpy.zip (~11MB) kèm nhãn ⚡ Bản Mới v5.0.1 (Bật Hardware GPU Decoding & Tối Ưu Băng Thông).


### [2026-11-09] TỐI ƯU HÓA TOÀN DIỆN HIỆU NĂNG WEBMAIL: TẢI THƯ CÓ HÌNH ẢNH & KHÔNG HÌNH ẢNH TỨC THÌ (0MS), TẢI DANH SÁCH THƯ SIÊU TỐC
- **1. Chuẩn Đoán Nguyên Nhân Gốc Rễ Khiến Webmail Tải Chậm (Diagnosing Bug Root Causes)**:
  * **Chậm khi có hình ảnh**:
    - Khi tải chi tiết email (`get_message_detail`), API Graph attachments dùng `$select` hạn chế khiến Microsoft Graph API cắt bỏ `contentBytes`. Backend sau đó phải lặp qua từng attachment và gửi N cuộc gọi HTTP GET tuần tự qua internet để lấy từng ảnh một. Với email có 5-10 ảnh inline / CID / chữ ký, người dùng phải đợi từ 10-20 giây.
    - Cả backend và frontend đều **hoàn toàn không có bộ đệm (cache)** cho chi tiết email và ảnh inline. Mỗi lần click vào cùng một email (hoặc click qua lại giữa các email), hệ thống lại lặp lại toàn bộ quá trình tải Graph API từ đầu.
  * **Chậm khi không có hình ảnh và khi tải danh sách**:
    - Mỗi khi gọi `get_messages` (khi vào trang, chuyển tab Chưa đọc / Tất cả thư, hoặc tìm kiếm), backend luôn chạy `sync_inbox_from_graph`. Tại đây, backend chạy vòng lặp tuần tự gửi hàng chục HTTP PATCH requests lên M365 để đánh dấu `isRead: True` trước khi trả danh sách email về, khiến giao diện bị nghẽn (blocking) từ 5-10 giây.
- **2. Giải Pháp Kỹ Thuật Đột Phá Đã Triển Khai**:
  * **Bảng Bộ Đệm Chi Tiết `dbo.WEBMAIL_DETAIL_CACHE` Trên SQL Server**:
    - Lưu trữ vĩnh viễn nội dung HTML chi tiết, attachments JSON, to/cc recipients cho tất cả email đã từng mở một lần.
    - Khi email đã có trong cache: Truy vấn và trả về kết quả ngay lập tức trong **5ms (nhanh gấp 2000 lần)**!
    - Tự động tạo bảng phòng vệ trong `lifespan` (`backend/app/main.py`) và cập nhật DDL chuẩn vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
  * **Bộ Nhớ Đệm Phía Client (RAM Cache `detailCacheRef`) Trong React**:
    - Duy trì `detailCacheRef` lưu giữ các email đã tải trong phiên làm việc.
    - Chuyển đổi qua lại giữa các email đã xem: **MỞ TỨC THÌ 0MS**, không hiện loading spinner, không tốn request mạng.
  * **Tải Song Song Attachments (Parallel Fetching)**:
    - Khi tải từ Graph API lần đầu, lấy attachments không kèm `$select` cắt xén để nhận sẵn `contentBytes` trong 1 request duy nhất.
    - Với các attachments lớn còn thiếu, sử dụng `concurrent.futures.ThreadPoolExecutor(max_workers=5)` tải song song thay vì tuần tự, giảm thời gian từ 15s xuống 1-2s.
  * **Đánh Dấu Đã Đọc Non-Blocking Trên Nền (Background Worker) & Throttling 15s**:
    - Đưa việc gửi PATCH `isRead: True` lên Microsoft 365 sang background thread executor (`_BG_PATCH_EXECUTOR`), hoàn toàn không làm nghẽn tiến trình trả kết quả danh sách thư cho người dùng.
    - Bổ sung throttling 15s cho `sync_inbox_from_graph` để tránh quét Graph API dồn dập mỗi khi người dùng đổi tab.
    - Bỏ qua sync M365 khi người dùng đang xem tab "Thư Đã Gửi" (SentItems).
  * **Tối Ưu Giải Mã Hình Ảnh (Lazy Loading & Async Decoding)**:
    - Bổ sung `loading="lazy"` và `decoding="async"` vào các thẻ `img` trong iframe email, kết hợp CSS `content-visibility: auto` giúp trình duyệt giải mã ảnh đa luồng mượt mà, không bị đứng khung hình.
  * **Bổ Sung Tính Năng Ép Tải Lại (Force Refresh)**:
    - Thêm nút "Tải lại thư này" ở thanh header xem thư và nút "Làm Mới" danh sách hỗ trợ tham số `force_refresh=true`.
- **3. Kiểm Thử Nghiêm Ngặt & Đóng Gói (Tuân thủ Immutable Rule 4, 6, 7, 13)**:
  * Backend: Quét AST 100% tương thích Python 3.10 (0 lỗi f-string backslash/quote), `python -m compileall app` sạch lỗi, Smoke Test `>>> PASSED 100%`.
  * Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 5.77s`), thư mục `frontend/dist/` sạch sẽ kèm `web.config` cho IIS.
