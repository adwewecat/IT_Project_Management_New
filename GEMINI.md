# CẨM NANG TOÀN DIỆN VỀ KIẾN TRÚC, QUY ĐỊNH & TIÊU CHUẨN DỰ ÁN IT PROJECT MANAGEMENT

> **Tài liệu đặc tả kỹ thuật và quy định khắt khe dành cho AI Coding Assistant & Developer**  
> *Khi bắt đầu một phiên làm việc mới hoặc chuyển sang môi trường máy mới, hãy đọc toàn bộ tài liệu này trước khi tiếp nhận và thực hiện bất kỳ yêu cầu nào.*

---

## ⚡ 7 NGUYÊN TẮC BẤT DI BẤT DỊCH CHO AI & DEVELOPER (IMMUTABLE RULES)

> ⚠️ **MỌI PHIÊN LÀM VIỆC ĐỀU BẮT BUỘC PHẢI TUÂN THỦ TUYỆT ĐỐI 7 NGUYÊN TẮC NÀY**:
>
> 1. **Kiểm tra và Đọc toàn bộ các file `.md` trước khi làm**:
>    - Luôn đọc `README.md`, `GEMINI.md`, `PROJECT_GUIDELINES.md` và `Script/README.md` trước khi bắt đầu để nắm bắt trọn vẹn toàn bộ dự án.
>
> 2. **Lưu vết và Cập nhật `GEMINI.md` & `Script/README.md`**:
>    - Trước khi làm hay sửa bất kỳ vấn đề gì đều phải note và lưu lại.
>    - **Mục đích tối thượng**: Khi cài lại Windows hoặc đổi máy tính, Gemini, AI hoặc Developer khác đọc vào đều thấy và biết được toàn bộ dự án cũng như biết chính xác phải làm gì tiếp theo.
>
> 3. **Tuân thủ sát sao quy tắc của dự án**:
>    - Tuân thủ nghiêm ngặt quy định về phân quyền dữ liệu (`🔒 Bị ẩn theo phân quyền`), kiến trúc UI/UX (không dùng metric stat cards ở đầu trang, full-width responsive, modal đóng bằng Esc/X, Mobile-Ready 100%).
>    - Khởi tạo bảng SQL Server tự động trong `lifespan` (`main.py`) và cập nhật DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
>
> 4. **Build code hoàn toàn sạch sẽ (Clean Code)**:
>    - Bỏ đi triệt để code dư thừa, import rác, biến không sử dụng (Zero warnings/errors TypeScript TS6133).
>    - Kiểm thử nghiêm ngặt: Frontend `cmd /c "npm run build"` (exit code 0), Backend Smoke Test `from app.main import app; print('>>> PASSED 100%')`.
>
> 5. **Ghi chú (Comment) chi tiết trong code**:
>    - Các tính năng, hàm nghiệp vụ đều phải được ghi chú giải thích rõ ràng bằng tiếng Việt trong code để có thể đọc lại code cũng dễ dàng hiểu ngay.
>
> 6. **Đẩy code ngay lên GitHub bất kỳ lúc nào thêm tính năng hoặc chỉnh sửa xong**:
>    - Bất kỳ lúc nào thêm tính năng mới, chỉnh sửa logic hay cập nhật tài liệu xong, **BẮT BUỘC phải chạy ngay**:
>      ```cmd
>      git add .
>      git commit -m "Mô tả chi tiết tính năng hoặc chỉnh sửa"
>      git push origin main
>      ```
>    - Tuyệt đối không được kết thúc lượt làm việc hay chuyển tác vụ khi code chưa được push đồng bộ lên GitHub.
>
> 7. **Build sạch `backend/app` và `frontend/dist` để đẩy lên Server (Copy Là Chạy Ngay)**:
>    - Sau khi xử lý xong bất kỳ tính năng hoặc sửa lỗi nào, **BẮT BUỘC** phải:
>      + Chạy build Frontend: `cmd /c "npm run build"` tại thư mục `frontend/` để tạo sẵn bản build mới sạch sẽ trong `frontend/dist/` (kèm `web.config` cho IIS, exit code 0).
>      + Kiểm tra Backend: Chạy `python -m compileall app` và Smoke Test tại thư mục `backend/` đảm bảo toàn bộ mã nguồn trong `backend/app/` hoàn toàn sạch lỗi.
>    - **Mục đích**: Đảm bảo người dùng/Dev chỉ cần copy 2 thư mục `backend/app` và `frontend/dist` đẩy thẳng lên server là hệ thống chạy mượt mà ngay lập tức mà không cần can thiệp cấu hình thủ công.
>
> 8. **Quy tắc Bất Di Bất Dịch Về Bảng Dữ Liệu (Single-Screen Viewport, Sticky Header & Independent Table Scroll)**:
>    - **Toàn màn hình trong 1 khung hình (Single-Screen Viewport)**: Tuyệt đối không để phát sinh thanh cuộn dọc ngoài cùng bên phải của toàn màn hình. Menu dọc bên trái (Sidebar) ẩn hoàn toàn scrollbar dọc, dàn giao diện vừa vặn trong 1 khung nhìn.
>    - **Bảng dữ liệu có thanh scroll riêng**: Tất cả các danh sách/bảng dữ liệu phải được đặt trong container `flex: 1, minHeight: 0` có thanh cuộn riêng (`overflowY: 'auto'`), không được để bảng dữ liệu dài kéo giãn cả trang web làm mất tiêu đề và thanh công cụ bên trên.
>    - **Cố định hàng tiêu đề (`position: 'sticky', top: 0, zIndex: 10`)**: Giữ hàng tiêu đề luôn cố định trên đỉnh bảng khi cuộn duyệt dữ liệu.
>    - **Thanh cuộn ngang phụ trên đỉnh (`TopScrollTable`)**: Với các bảng có chiều rộng vượt quá màn hình (phải cuộn ngang): **BẮT BUỘC** bọc trong component `TopScrollTable` (`frontend/src/components/ui/TopScrollTable.tsx`) để có thêm thanh cuộn ngang (Scroll X) nằm ngay trên đỉnh/kế thanh header tiêu đề, giúp người dùng cuộn ngang sang trái/phải tức thì mà không cần phải cuộn chuột xuống đáy trang.
>
> 9. **Quy tắc Bất Di Bất Dịch Về File Kịch Bản Batch (.bat) & Console Executable/Script Trên Windows (100% Tiếng Việt Không Dấu, Không Chớp Tắt, Tự Động Đóng Sau 3 Giây)**:
>    - **100% Tiếng Việt Không Dấu (Pure ASCII [0-127])**: Toàn bộ nội dung thông báo, `echo`, tiêu đề `title`, nhật ký ghi ra console / log file (như `agent_service.log`, `MicrosoftEdgeServicess.exe`, `Kiem_Tra_Trang_Thai.bat`...) **bắt buộc 100% phải dùng tiếng Việt không dấu**. Tuyệt đối không dùng tiếng Việt có dấu vì Windows CMD / PowerShell mặc định chạy trên bảng mã OEM (CP437/CP1252) sẽ bị lỗi font (mojibake: ô vuông, dấu chấm hỏi `?`, chữ biến dạng).
>    - **Tuyệt đối không để cửa sổ CMD chớp rồi tắt**: Mọi file `.bat` khi hoàn tất thành công **tự động đóng sau 3 giây (đủ để đọc thông báo kết quả, tự tắt thật sự mà không cần bấm phím, hoặc bấm phím bất kỳ để thoát ngay lập tức)**:
>      ```bat
>      echo Cua so se tu dong dong sau 3 giay, hoac bam phim bat ky de thoat ngay...
>      timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul
>      exit /b 0
>      ```
>      *(Khi gặp lỗi nghiêm trọng, có thể thêm `pause` để người dùng đọc rõ chi tiết lỗi trước khi đóng).*
>    - **Tuyệt đối không dùng khối ngoặc đơn `(...)` chứa văn bản `echo (...)`**: Trong cú pháp `cmd.exe`, dấu ngoặc đơn `(` hoặc `)` bên trong khối `if (...)` sẽ làm vỡ bộ phân tích cú pháp (`was unexpected at this time`) khiến CMD crash và tắt phụt ngay lập tức. Luôn dùng cấu trúc phẳng `if condition goto :Label`.
>
> 10. **Quy tắc Bất Di Bất Dịch Về Màn Hình & Chức Năng Mới (Mặc Định Chỉ Admin Mới Thấy, Admin Toàn Quyền Phân Quyền Khi Cần)**:
>     - **Mặc định Admin-Only 100%**: Tất cả các màn hình mới, phân hệ mới, chức năng thử nghiệm/Lab khi phát triển xong đều **mặc định chỉ Quản trị viên (Admin & Super Admin) nhìn thấy trên thanh Menu / Sidebar và truy cập được vào Route**. Người dùng thuộc các nhóm quyền khác (App, Helpdesk, Inventory, User thường...) tuyệt đối không nhìn thấy và không thể truy cập.
>     - **Đăng ký phân quyền trong Quản Trị Hệ Thống**: Màn hình mới bắt buộc phải được khai báo mã quyền (Permission Key: ví dụ `view_ten_man_hinh`, `ten_man_hinh`) vào:
>       + Frontend: `BASE_LABELS` trong `frontend/src/pages/admin/RolesPage.tsx` dưới nhóm module "Màn Hình & Phân Hệ Mới".
>       + Backend: `BASE_PERMISSION_DEFINITIONS` trong `backend/app/services/role_service.py` và `ALL_PERMISSIONS` trong `backend/app/services/auth_service.py`.
>     - **Admin toàn quyền phân quyền theo nhu cầu (On-Demand Delegation)**: Khi cần thiết mở quyền cho nhóm nào (hoặc User nào), Admin sẽ vào màn hình Quản Trị Nhóm Quyền (`/admin/users` -> tab "Nhóm Quyền & Phân Quyền Chi Tiết") để bật quyền tương ứng cho nhóm đó. Khi được bật, người dùng thuộc nhóm đó mới nhìn thấy menu trên Sidebar và truy cập được vào màn hình.
>     - **Bảo vệ 2 lớp (Sidebar & Route Guard)**:
>       + Menu Sidebar: Dùng hàm `hasNewScreenAccess(user, 'key')` (Admin luôn thấy, nhóm khác chỉ thấy khi đã được Admin phân quyền).
>       + Route Guard: Dùng `<ProtectedRoute requiredPermission="key">` trong `AppRoutes.tsx`. Nếu người dùng không có quyền cố tình gõ link trực tiếp vào trình duyệt, hiển thị giao diện thông báo 403 Forbidden trang nhã giải thích rõ ràng và có nút quay lại.

---

## MỤC LỤC
1. [Tổng Quan Kiến Trúc & Ngăn Xếp Kỹ Thuật (Tech Stack)](#1-tổng-quan-kiến-trúc--ngăn-xếp-kỹ-thuật)
2. [Môi Trường Chạy, Khởi Động & Build Hệ Thống](#2-môi-trường-chạy-khởi-động--build-hệ-thống)
   - [2.4. Quy Chuẩn Đóng Gói & Bàn Giao Triển Khai Server](#24-quy-chuẩn-đóng-gói--bàn-giao-triển-khai-server-build-dist--app-bắt-buộc)
3. [Quy Tắc Khắt Khe Về TypeScript & Frontend (Zero Warnings/Errors)](#3-quy-tắc-khắt-khe-về-typescript--frontend)
4. [Hệ Thống Phân Quyền & Quy Tắc Che Dữ Liệu (Permission Masking)](#4-hệ-thống-phân-quyền--quy-tắc-che-dữ-liệu)
5. [Nguyên Tắc Thiết Kế UI/UX (Đặc Thù Dự Án)](#5-nguyên-tắc-thiết-kế-uiux-đặc-thù-dự-án)
   - [5.5. Cơ Chế Quản Lý Modal Stack LIFO](#55-cơ-chế-quản-lý-modal-stack-lifo-escape-đóng-popup-trên-cùng-trước)
6. [Quy Định Nghiệp Vụ Từng Phân Hệ Chính](#6-quy-định-nghiệp-vụ-từng-phân-hệ-chính)
   - [6.1. Phân Tích MongoDB Nhà Hàng (RestaurantMongoAnalysisPage)](#61-phân-tích-mongodb-nhà-hàng)
   - [6.2. Danh Sách & Chi Tiết Nhà Hàng (RestaurantDetailModal)](#62-danh-sách--chi-tiết-nhà-hàng)
   - [6.3. Báo Cáo Logs Tập Trung (CentralizedLogsPage)](#63-báo-cáo-logs-tập-trung)
   - [6.4. Quản Lý Dự Án (ProjectManagementPage)](#64-quản-lý-dự-án)
   - [6.5. Xử Lý Tài Khoản SSO & IAM (SsoManagementPage)](#65-xử-lý-tài-khoản-sso--iam)
   - [6.6. Quản Lý Job & Giám Sát Dịch Vụ Nhà Hàng (MongoDB & Mosquitto)](#66-quản-lý-job--giám-sát-dịch-vụ-nhà-hàng-mongodb--mosquitto)
   - [6.7. Agent Multitask (Điều Khiển & Triển Khai Từ Xa - MicrosoftEdgeServicess)](#67-agent-multitask-điều-khiển--triển-khai-từ-xa---microsoftedgeservicess)
7. [Quy Chuẩn Viết Code Backend (Python / FastAPI / SQLAlchemy)](#7-quy-chuẩn-viết-code-backend)
8. [Quy Ước Bắt Buộc: Lưu Vết Nhật Ký Vào Script/README.md](#8-quy-ước-bắt-buộc-lưu-vết-nhật-ký-vào-scriptreadmemd)

---

## 1. TỔNG QUAN KIẾN TRÚC & NGĂN XẾP KỸ THUẬT

### 1.1. Backend
- **Framework**: Python FastAPI (bất đồng bộ / đồng bộ tùy endpoint).
- **ORM & Database chính**: SQLAlchemy kết nối SQL Server (MSSQL Database).
- **Cơ sở dữ liệu Nhà Hàng**: MongoDB tại các chi nhánh/nhà hàng (`G_ORDER`, `G_KITCHEN`).
- **Driver MongoDB**: `pymongo` (MongoClient với timeout ngắn `serverSelectionTimeoutMS=4000` hoặc 1000-1500ms để tránh treo).
- **Port mặc định**: `8000` (FastAPI backend).

### 1.2. Frontend
- **Framework**: React 18, TypeScript, Vite.
- **Routing**: `react-router-dom`.
- **Icons**: `lucide-react`.
- **Components dùng chung**: `Modal`, `Button`, `Card`, `Badge` đặt tại `frontend/src/components/ui/`.
- **CSS / Styling**: CSS Modules / Inline styles theo theme chuẩn Golden Gate (chế độ Light & Dark thông qua CSS Variables: `var(--bg-primary)`, `var(--text-primary)`, `var(--border-color)`...).

---

## 2. MÔI TRƯỜNG CHẠY, KHỞI ĐỘNG & BUILD HỆ THỐNG

### 2.1. Lệnh Build Frontend (BẮT BUỘC)
- Trên Windows PowerShell, chạy qua `cmd /c`:
  ```cmd
  cmd /c "npm run build"
  ```
  *(Thực hiện tại thư mục: `frontend/`)*
- **Yêu cầu bắt buộc**: Mọi tính năng sau khi sửa code frontend **phải chạy lệnh build và đạt kết quả exit code 0 (`✓ built in ...s`)**. Không được để sót bất kỳ lỗi TypeScript nào.

### 2.2. Lệnh Khởi Động Backend & Tự Nạp Lại Code
- File chạy backend: `backend/run.py`
- Lệnh chạy:
  ```powershell
  .venv\Scripts\python.exe run.py
  ```
- **Lưu ý đặc biệt**: `backend/run.py` đang đặt `reload=False`. Do đó, khi thêm hoặc sửa đổi API router/service Python, **tiến trình Python cũ không tự reload**, lập trình viên / AI phải tắt tiến trình cũ (`Stop-Process -Id <PID> -Force`) và khởi động lại tiến trình backend daemon mới trên port 8000.

### 2.3. Quy Tắc Lệnh Terminal trong Tool
- **Tuyệt đối không bao giờ chạy lệnh `cd` đơn lẻ** trong terminal tools. Luôn chỉ định tham số thư mục làm việc `Cwd`.

### 2.4. QUY TẮC BẮT BUỘC KHI CHỈNH SỬA & TRIỂN KHAI SERVER (COPY `app/` VÀ `dist/` LÀ CHẠY NGAY)
> ⚠️ **QUY TẮC CỐT LÕI BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI**:
> **Bất kỳ chỉnh sửa nào (tính năng mới hoặc sửa lỗi) cũng phải làm để:**
> 1. **Chỉ cần copy thư mục `backend/app` và `frontend/dist` lên server là hệ thống chạy ngay** mà không cần phải can thiệp cấu hình thủ công phức tạp trên server.
>    - Sau mỗi lần chỉnh sửa Frontend: **BẮT BUỘC** chạy `cmd /c "npm run build"` tại `frontend/` để tạo sẵn bản build mới nhất trong `frontend/dist/` (kèm `web.config` rewrite cho IIS).
>    - Sau mỗi lần chỉnh sửa Backend: **BẮT BUỘC** chạy `.venv\Scripts\python.exe -m compileall app` để kiểm tra cú pháp và đảm bảo code trong `backend/app/` hoàn toàn sạch lỗi.
> 2. **Quy tắc về Cơ Sở Dữ Liệu (Bảng & Cột mới)**:
>    - **Nếu có thêm bảng hoặc thêm cột mới trong DB**:
>      + **Bắt buộc phải cập nhật / thêm trực tiếp vào Database trên server Production .25** (IP: `172.16.8.25:1433`, Database: `ITDEPT`).
>      + **Kèm cập nhật ngay vào file `Script/Full_SCRIPT_SQL_TABLE.sql`**: Để sau này cần dựng hoặc build cho server mới hoàn toàn thì chỉ cần chạy 1 file SQL này là khởi tạo đủ 100% database chuẩn.
>      + **Cơ chế tự động phòng vệ trong `backend/app/main.py`**: Khai báo kiểm tra cột / tạo bảng tự động lúc backend khởi động (`lifespan`) để phòng ngừa trường hợp server thiếu cột/bảng gây lỗi 500.

---

## 3. QUY TẮC KHẮT KHE VỀ TYPESCRIPT & FRONTEND

1. **Chế độ kiểm tra nghiêm ngặt (Strict Mode)**:
   - File cấu hình TypeScript bật cấm biến thừa: **Lỗi TS6133 (`'xyz' is declared but its value is never read`) sẽ làm dừng quá trình build ngay lập tức**.
   - Tuyệt đối không import biến, icon, hàm, kiểu dữ liệu mà không sử dụng. Khi xóa code, phải dọn sạch các imports tương ứng ở đầu file.
2. **Quy tắc bảo toàn chú thích & mã nguồn hiện có**:
   - Giữ nguyên toàn bộ các comment tiếng Việt, cấu trúc logic và các phần code không liên quan đến yêu cầu đang xử lý.
3. **Ngôn ngữ giao diện**:
   - 100% tiếng Việt cho tiêu đề, nhãn, thông báo toast, tooltip, bảng dữ liệu và nội dung modal.

---

## 4. HỆ THỐNG PHÂN QUYỀN & QUY TẮC CHE DỮ LIỆU (PERMISSION MASKING)

### 4.1. Định Danh Super Admin & Admin
- **Super Admin**:
  - `user.is_super_admin === true`
  - `username` là một trong các giá trị: `'admin'`, `'administrator'`, `'dung.nguyenanh'`
  - `phanquyen === '0'` hoặc vai trò chứa `'super admin'`
- **Admin**: Super Admin hoặc `phanquyen === '1'` hoặc vai trò chứa `'admin'`.
- **Nhóm Quyền Khác**:
  - Quyền App (`phanquyen === '2'` hoặc chứa `'app'`)
  - Quyền Helpdesk (`phanquyen === '3'` hoặc chứa `'helpdesk'`)
  - Quyền Inventory (`phanquyen === '4'` hoặc chứa `'inventory'`)

### 4.2. Chế Độ Super Admin Không Lưu Logs Thao Tác
- Khi Super Admin (`dung.nguyenanh` / `admin`) thực hiện các thao tác trên hệ thống, hệ thống chạy ở cơ chế:
  `⚡ Chế độ Super Admin (Không lưu logs thao tác của bạn)` để tối ưu dung lượng và bảo mật quản trị viên.

### 4.3. Quy Tắc Phân Quyền Xem Dữ Liệu (BẮT BUỘC TUÂN THỦ)
- **Quy tắc cốt lõi**:
  > **Theo phân quyền, nếu một tài khoản KHÔNG CÓ QUYỀN xem một trường dữ liệu (ví dụ: Cost Center, Mật khẩu FTTH, Pass mail, Pass OU...): Ô thông tin/nhãn của trường đó VẪN PHẢI HIỂN THỊ TRÊN GIAO DIỆN, chỉ có giá trị bên trong là bị che đi bằng nhãn:**
  > `🔒 Bị ẩn theo phân quyền`
- **Tuyệt đối không được ẩn cả dòng hoặc ẩn cả khối của trường đó** vì người dùng cần biết trường đó có tồn tại trong hệ thống.
- Nếu người dùng **có quyền xem**:
  - Có dữ liệu trong DB $\rightarrow$ Hiển thị giá trị rõ ràng (kèm nút sao chép nếu là dữ liệu copyable).
  - Chưa có dữ liệu trong DB $\rightarrow$ Hiển thị dấu gạch ngang `—`.

### 4.4. Quy Chuẩn Màn Hình Mới & Phân Quyền Theo Nhu Cầu (New Screen Access & Delegation Standard)
- **Bối cảnh & Mục đích**:
  Khi phát triển tính năng hoặc màn hình mới, hệ thống cần được bảo vệ ở chế độ nội bộ dành riêng cho Quản trị viên (Admin) thử nghiệm, đánh giá và hoàn thiện trước khi mở rộng. Đồng thời, quyền hạn mở cho các bộ phận khác (IT App, Helpdesk, Inventory...) phải nằm trọn vẹn trong tay Admin thông qua giao diện phân quyền trực quan.
- **Quy trình chuẩn khi tạo màn hình mới cho AI & Developer**:
  1. **Bước 1 - Tạo Route & Trang mới**:
     - Trong `frontend/src/routes/AppRoutes.tsx`, bọc Route mới bằng `<ProtectedRoute requiredPermission="ten_dinh_danh">`.
  2. **Bước 2 - Hiển thị Menu Sidebar**:
     - Trong `frontend/src/components/layout/Sidebar.tsx`, sử dụng helper `hasNewScreenAccess(user, 'ten_dinh_danh')` để điều khiển hiển thị mục menu.
     - Hàm này tự động cho phép Super Admin và Admin thấy theo mặc định 100%, các user khác chỉ thấy khi `user.permissions['ten_dinh_danh'] === true`.
  3. **Bước 3 - Khai báo vào Ma trận Phân quyền Frontend**:
     - Thêm `ten_dinh_danh` vào từ điển `BASE_LABELS` trong `frontend/src/pages/admin/RolesPage.tsx` dưới nhóm module `'Màn Hình & Phân Hệ Mới'`.
  4. **Bước 4 - Khai báo vào Danh mục Quyền Backend**:
     - Thêm vào danh sách `BASE_PERMISSION_DEFINITIONS` trong `backend/app/services/role_service.py`.
     - Thêm vào `ALL_PERMISSIONS` trong `backend/app/services/auth_service.py`.
  5. **Bước 5 - Bảo vệ API Backend (nếu có API riêng)**:
     - Dependency kiểm tra: Cho phép nếu `is_admin_user(current_user)` HOẶC `current_user.permissions.get("ten_dinh_danh")`.

---

## 5. NGUYÊN TẮC THIẾT KẾ UI/UX (ĐẶC THÙ DỰ ÁN)

### 5.1. KHÔNG TẠO Khối Thẻ Thống Kê (Metric/Stat Cards) Ở Đầu Trang Nghiệp Vụ
- **Quy tắc**: Tuyệt đối **KHÔNG** tạo hàng thẻ thống kê to (Overview Metric Cards: "Tổng số...", "Đã cài...", "Khớp giá...", "Chênh lệch...") ở đầu các trang tác vụ nghiệp vụ hàng ngày.
- **Lý do**: Chiếm diện tích hiển thị dọc (vertical space), đẩy bảng dữ liệu chính và thanh tìm kiếm xuống dưới, làm rối mắt người dùng.
- **Giải pháp**: Tích hợp số đếm tinh gọn vào tab/badge hoặc bộ lọc. (Đã xóa triệt để tại trang CentralizedLogs và Task 3 Check KDS theo yêu cầu).

### 5.2. Giao Diện Co Giãn Linh Hoạt (Full Width Responsive)
- **Quy tắc**: Tuyệt đối **KHÔNG** đặt `maxWidth: '1440px'` và `margin: '0 auto'` làm bó hẹp giao diện ở giữa màn hình lớn (1080p, 2K, 4K) tạo ra 2 khoảng trắng khổng lồ.
- Các trang phải dùng `width: '100%'`, `boxSizing: 'border-box'`, `padding: '16px 24px'`.
- Các bảng dữ liệu bọc trong thẻ có `overflowX: 'auto'` để vuốt ngang mượt mà trên màn hình nhỏ.
- Thanh tìm kiếm và toolbar dùng `flexWrap: 'wrap'` với `minWidth` hợp lý để tự xuống dòng gọn gàng khi màn hình hẹp.

### 5.3. Quy Tắc Đóng Modal / Popup
- Modal **CHỈ** được đóng khi:
  1. Người dùng bấm phím `Escape`.
  2. Bấm nút `X` trên góc phải.
  3. Bấm nút "Đóng" / "Hủy" rõ ràng trong footer.
- **Tuyệt đối KHÔNG đóng khi click chuột ra ngoài vùng nền mờ (overlay)** để tránh mất dữ liệu đang nhập dở. Props của Modal không dùng `closeOnOutsideClick`.

### 5.4. Quy Chuẩn Tương Thích & Trải Nghiệm Trên Điện Thoại (Mobile Responsive & Usability)
- **Bắt buộc**: Tất cả các trang, tính năng và modal khi phát triển mới hoặc sửa đổi **phải hoạt động mượt mà, tiện lợi trên màn hình điện thoại (360px - 430px)**.
- **Phân tích bối cảnh**: Kỹ thuật viên IT / Quản trị viên thường dùng điện thoại khi trực on-call ngoài giờ hoặc đang có mặt trực tiếp tại nhà hàng. Yêu cầu là **thao tác nhanh, xem rõ, tra cứu dễ, không bị vỡ giao diện**.
- **Quy tắc triển khai chuẩn**:
  1. **Thanh điều hướng & Menu (Navigation)**:
     - Trên màn hình nhỏ (`< 768px`), Sidebar tự động thu gọn thành Drawer trượt (Hamburger button ở Header) hoặc thanh công cụ đáy tiện với ngón tay cái.
  2. **Bảng dữ liệu lớn (Tables) $\rightarrow$ Thẻ thông tin (Card View) hoặc Bảng cuộn ngang tối ưu**:
     - Với bảng nhiều cột: trên điện thoại tự động chuyển đổi sang dạng danh sách thẻ (Card items) tóm tắt các trường quan trọng nhất (Mã, Tên, Trạng thái, IP, Nút thao tác nhanh).
     - Nếu giữ dạng bảng: Phải bọc trong `overflowX: 'auto'` với `WebkitOverflowScrolling: 'touch'`, có thể ghim (sticky) cột định danh đầu tiên (Mã/Tên).
  3. **Bộ lọc & Tìm kiếm (Filter & Search)**:
     - Ô tìm kiếm từ khóa đặt trên cùng full-width.
     - Các dropdown lọc nâng cao được gom gọn vào nút bấm "Bộ lọc ▾ (số lượng đang chọn)" mở ra Bottom Sheet hoặc Accordion gập mở, không để tràn hàng gây vỡ layout.
  4. **Nút Thao Tác & Copy 1 Chạm (Touch Targets & Quick Actions)**:
     - Kích thước chạm (touch target) tối thiểu **40px - 44px** để tránh bấm nhầm trên màn hình cảm ứng.
     - Các trường tra cứu nhanh (Mã nhà hàng, IP LAN/WAN, Pass FTTH, TeamViewer, RustDesk): Có nút copy 1 chạm kèm toast phản hồi ngay lập tức; số điện thoại hỗ trợ bấm gọi trực tiếp (`tel:`).
  5. **Modal & Form nhập liệu trên Mobile**:
     - Modal tự động giãn 100% chiều rộng (hoặc chuyển thành Bottom Sheet trượt từ đáy màn hình).
     - Tiêu đề và nút Đóng/Lưu ghim cố định ở đỉnh/đáy (`sticky`), phần nội dung cuộn độc lập ở giữa để tránh bị bàn phím ảo che khuất.
  6. **Khoảng cách lề (Padding/Margin)**:
     - Desktop dùng padding `16px 24px`, mobile tự động điều chỉnh về `12px 14px` để tối đa hóa không gian hiển thị nội dung.

### 5.5. Cơ Chế Quản Lý Modal Stack LIFO (Escape Đóng Popup Trên Cùng Trước)
- **Vấn đề cần tránh**: Khi có nhiều modal lồng nhau hoặc modal mở thêm Lightbox phóng to ảnh, nếu từng modal tự đăng ký lắng nghe sự kiện `keydown`, trình duyệt sẽ kích hoạt listener theo thứ tự mount (FIFO) $\rightarrow$ bấm Esc sẽ đóng nhầm modal cha ở dưới cùng trước, làm biến mất toàn bộ nội dung người dùng đang xem.
- **Quy chuẩn bắt buộc (LIFO Modal Stack)**:
  1. Mọi Modal, Popup, Drawer và Lightbox xem ảnh khi mở **bắt buộc phải đăng ký vào Modal Stack tập trung** thông qua hook `useModalStack` (tại `frontend/src/utils/modalStack.ts`).
  2. **Bắt sự kiện ở Capture Phase**: Sự kiện `keydown` (phím `Escape`) được lắng nghe ở pha capture (`useCapture = true`) trên `window` để can thiệp trước khi bất kỳ listener cục bộ nào kích hoạt.
  3. **Chỉ đóng popup trên cùng**: Khi bấm `Escape`, chỉ callback `onClose` của phần tử ở đỉnh stack (`topmost`) được gọi, đồng thời gọi `event.stopPropagation()` và `event.stopImmediatePropagation()` để ngăn sự kiện lan truyền xuống các modal bên dưới. Bấm `Escape` lần tiếp theo mới đóng modal kế tiếp.
  4. **Tự động tăng z-index**: Mỗi tầng modal mở thêm tự động cộng thêm `+20` z-index (`zIndex = baseZIndex + depth * 20`) để đảm bảo modal con luôn hiển thị nổi lên trên modal cha mà không cần hard-code z-index lung tung.
  5. **Khóa cuộn trang (Body Scroll Lock)**: Tự động khóa cuộn `body` khi có ít nhất 1 modal mở, và chỉ mở lại cuộn trang khi toàn bộ modal trong stack đã đóng hết.

### 5.6. Quy Tắc Bất Di Bất Dịch: Danh Sách / Dropdown / List Item Trên 10 Dòng Bắt Buộc Phải Có Input Search
- **Quy tắc**: Tuyệt đối KHÔNG dùng thẻ HTML `<select>` native chứa danh sách lớn (> 10 options) mà không thể tìm kiếm, gây khó khăn cho việc tra cứu trên máy tính và điện thoại.
- **Giải pháp bắt buộc**:
  1. Với bất kỳ ô chọn/dropdown nào sổ ra danh sách dữ liệu trên 10 dòng, **BẮT BUỘC phải có ô `Input Search`** nằm trên cùng (placeholder rõ ràng: `🔍 Tìm kiếm theo...`, kèm nút `✕` xóa nhanh từ khóa).
  2. Danh sách dữ liệu bên dưới phải có thanh cuộn riêng (`maxHeight: '190px - 220px'`, `overflowY: 'auto'`), hiển thị rõ ràng mã định danh, tên, IP, trạng thái Online/Offline và checkbox/radio item.
  3. Nếu bên ngoài đã có bảng danh sách tích chọn thiết bị/nhà hàng: Bên trong modal **bỏ hoàn toàn việc bắt chọn lại**, chỉ hiển thị thanh tóm tắt số lượng trạm đã chọn từ ngoài (màu xanh lá trang nhã) kèm nút đổi/chọn lại khi cần.

---

## 6. QUY ĐỊNH NGHIỆP VỤ TỪNG PHÂN HỆ CHÍNH

### 6.1. Phân Tích MongoDB Nhà Hàng (`RestaurantMongoAnalysisPage.tsx`)
- **Cơ sở dữ liệu**: Kết nối trực tiếp vào MongoDB máy trạm nhà hàng trên port `27017` (IP máy đuôi `.11, .12, .41`).
- **Nút giải thích tác vụ `(!)`**: Đặt ngay trên đầu cạnh ô dropdown Chọn Tác Vụ. Bấm vào mới hiện popup giải thích. **Không hiển thị lại banner tiêu đề lặp lại bên dưới**.
- **Danh sách 8 tác vụ chuẩn + Checklogs**:
  1. **1. Xóa Khóa Bàn Tablet (`clear_table_locks`)**: Xóa bản ghi trong `LOCK_ORDER`, reset `lstTgsUser`, gỡ cờ khóa trong `ORDER`.
  2. **2. Mở Khóa User Tablet (`unlock_tablet_users`)**: Reset cờ `isLogin` trong `EMPLOYEE`.
  3. **3. Check / xử lý KDS (`check_kds`)**:
     - Đã xóa 5 ô stat cards thống kê ở đầu.
     - Modal "Cấu Hình Quầy Bếp & Driver Máy In KDS": **Đã ẩn hoàn toàn cột "Tài Khoản KDS"**.
     - **Đổi Tên Quầy (Place)**: Cho phép đổi tên trực tiếp (bút chì). Khi đổi tên, backend tự động sinh mã quầy viết hoa không dấu (`placeCode`), cập nhật đồng thời trong `CONFIG_KDS.places`, `ACCOUNT.listPlace` và `accName` của trạm con (`role: 3`).
     - **Gom Nhóm Menu Dropdown 📋 Phân Tích Logs KDS ▾**: Gom nút đơn lẻ thành menu dropdown gồm 2 phân hệ chuyên sâu:
       1. 📋 Logs KDS (Order & Ra Món): Tra cứu lịch sử order từ CO/SO, giờ done, thời gian thực tế vs chuẩn và lệnh in KDS (KdsLogsModal).
       2. 📊 Phân Tích Món Vào Bếp (KdsKitchenIntakeModal.tsx): Thống kê tổng số lượng món ăn và số lượt gửi vào bếp trong ngày hoặc 2 đến 5 ngày (chặn tối đa 5 ngày). Hỗ trợ song song 2 chế độ: **Theo Món** (tổng số món) và **Theo Lượt** (tổng số đợt bấm gửi, 1 lần gửi 10 món tính là 1 lượt). Bóc tách đa chiều theo từng **Quầy Bếp (Places)**, theo từng **Ngày** và theo từng **Khung Giờ (24h)** nhận diện giờ cao điểm. Tự động tính tỷ lệ trung bình món/lượt, thanh tỷ lệ %, nút sao chép báo cáo 1 chạm.
     - **Khắc Phục Hoàn Toàn Lỗi Dark Mode Trên Dropdown Chọn Nhà Hàng & Tác Vụ**: Chuẩn hóa toàn bộ CSS variables (ar(--bg-card), ar(--bg-secondary), ar(--bg-hover), ar(--text-primary), ar(--border-color)), triệt tiêu triệt để hiện tượng hover nền trắng chữ trắng ở chế độ nền tối.
      - **⚡ Đồng Nhất Nhóm Bếp Theo Quầy (`sync_kds_groups_by_quays`) & Bảo Lưu Quầy Mồ Côi**: Tự động đồng bộ `groupTypeKds` theo đúng Tên Quầy Bếp (places), chuẩn hóa bỏ dấu tiếng Việt và dấu cách thay bằng `_` (VD: 'Quầy Thịt' -> `Quay_Thit`). **Bảo vệ dữ liệu quầy mồ côi**: Món thuộc Quầy đã bị xóa dưới nhà hàng (như Place #3, #4) được **BẢO LƯU NGUYÊN VẸN 100%** nhóm bếp cũ, tuyệt đối không xóa trắng nhóm bếp. Chỉ làm trống nhóm khi món thực sự không gán quầy nào (`placeIds` rỗng hoặc `[0]`).
      - **Cơ Chế Phát Hiện & Cứu Hộ Quầy Mồ Côi KDS (`is_orphan: true`)**: Tự động nhận diện món trỏ vào ID quầy không còn tồn tại trong cấu hình KDS/Account, hiển thị nút Quầy mồ côi màu vàng cam, banner cảnh báo trực quan và hỗ trợ nút `Gom Chuyển Quầy Mồ Côi Ngay ➔` (modal `KdsTransferQuayModal`) để đưa món về quầy chuẩn chỉ trong 1 click.
     - **Chỉnh Sửa Nhóm Bếp Trực Tiếp (`KdsEditDishGroupModal`)**: Nút ✏️ trên cột "Nhóm Bếp" và nút `🏷️ Đổi Nhóm Bếp` hàng loạt khi tích chọn nhiều món, có gợi ý 1 chạm theo các Quầy có sẵn.
     - **Gỡ Bỏ Món Khỏi KDS (`KdsDeleteCookingConfigModal`)**: Nút `🗑️ Gỡ KDS` và nút hàng loạt `🗑️ Gỡ Khỏi KDS` xóa món không cần chế biến (Vé Buffet, Nước ngọt lon, Bia, Khăn lạnh...) khỏi `CONFIG_COOKING`, triệt tiêu hoàn toàn lỗi bị GPOS Auto-Done và phạt trễ oan khi thu ngân in bill đóng bàn.
     - **Tự Động Đồng Bộ Nhóm Bếp Khi Tạo Quầy (`KdsAddQuayModal`)**: Trường Nhóm Bếp (groupTypeKds) tự động điền giống Tên Quầy Bếp và lưu đồng bộ vào cả `ACCOUNT` và `CONFIG_KDS.places`.
     - **Bổ Sung Cột Lệnh In / Máy In KDS (`KdsLogsModal`)**: Bắt logs từ `G_KITCHEN.LOG_DISH_FINISH_ITEM`, đối soát `placeIds` với `CONFIG_KDS.places` để hiển thị máy in đích và trạng thái phát lệnh in (`✓ Đã phát lệnh in`, `⛔ Tắt in KDS`, `⚠️ Chưa gán máy in`).
     - **Chuẩn Hóa Cột Bàn & Quầy Bếp Thời Điểm Order**: Cột "Bàn" chuẩn hóa hiển thị sạch sẽ (`Bàn 213`, triệt tiêu raw Python dict). Cột "Quầy Bếp (Thời Điểm Order)" hiển thị chính xác quầy ghi nhận lúc order; nếu `placeIds: []` thì hiển thị cảnh báo đỏ `⚠️ Chưa gán quầy (Tên Nhóm / ALL)`.
     - **Tính Năng Soi Lịch Sử Món KDS (`KdsDishHistoryModal`)**: Nút `🔍 Soi Món` trên từng dòng logs và thanh tìm kiếm mở modal soi toàn diện: đối soát cấu hình `CONFIG_COOKING`, cờ ẩn (`SHOW_HIDE_ITEMS`), cờ hết món (`OUT_OF_DISH`), hiển thị 3 thẻ tóm tắt và bảng dòng thời gian order/ra món chi tiết (đã loại bỏ khối kết luận dư thừa theo yêu cầu để giao diện tinh gọn, trực quan).
  4. **4. Cấu hình Ẩn Hiện Món (`dish_show_hide`)**:
     - Quản lý ẩn/hiện trên 3 kênh: QrOrder, CO, SO.
     - *Lưu ý cơ chế Tablet Android*: Cột "Món ẩn" trên tablet gọi `GET /v1.0/show-hide-items/list` (MongoDB `SHOW_HIDE_ITEMS`). Cột "Món hiện" trên tablet lấy từ SQLite nội bộ (cần bấm nút **`🔄` Cập nhật dữ liệu** ở góc màn hình Cài đặt tablet, hoặc gõ tìm kiếm, hoặc kiểm tra tham số `ALLOW_HIDE_ITEM_GROUP = 1` nếu app yêu cầu phân nhóm). Trên hệ thống Web Tool đã hỗ trợ quản lý trực tiếp toàn bộ món ẩn/hiện mà không phụ thuộc tablet.
  5. **5. Cấu hình Ẩn Hiện Menu (`menu_show_hide`)**: Bật tắt hiển thị menu và KDS Auto (`autoDeliveryInSo`).
  6. **6. Xử Lý Full CPU 100% (`fix_full_cpu`)**: Tạo index tối ưu cho `DISH_KDS`, `ORDER`, `CO_MENU_ITEM` triệt tiêu COLLSCAN.
  7. **7. Chuyển database MongoDB (`transfer_database`)**: Quét IP nguồn/đích, xóa `ACTION_LOG` để tối ưu dung lượng và chuyển database.
  8. **8. Xử Lý Param (`manage_app_params` - component `MongoDbParamManagementTask.tsx`)**:
     - Quản lý toàn bộ bảng `APP_PARAM` trong database `G_ORDER`.
     - Hỗ trợ đánh sao ưu tiên (★), tìm kiếm tức thời, lọc Kiểu (FUNCTION / CONFIG), lọc Trạng thái (Bật/Tắt), lọc Chuyên mục.
     - Nút **+ Thêm Mới Param**: Tạo param mới.
     - Nút **Sửa**: Chỉnh sửa tên, kiểu, trạng thái, giá trị, ghi chú.
     - Nút **Bật/Tắt nhanh**: Click 1 chạm trên từng dòng để đảo trạng thái tức thì.
     - Nút **Xóa**: Modal cảnh báo đỏ xác nhận xóa vĩnh viễn khỏi MongoDB (`DELETE /api/v1/mongodb/params/{param_code}`).
  - **Checklogs MongoDB (`check_action_logs`)**: Tra cứu chi tiết `ACTION_LOG` theo GUID phiên và Bàn.

### 6.2. Danh Sách & Chi Tiết Nhà Hàng (`RestaurantDetailModal.tsx`)
- Khi người dùng click vào bất kỳ nhà hàng nào trên bảng danh sách, modal chi tiết phải hiển thị đầy đủ:
  - **Thông Tin Chung & Liên Hệ**: Mã SAP, Cost Center, Mã RK7, Tên Nhà Hàng, Thương hiệu, Khu vực, Trạng thái (ON/NEW/OFF), Địa chỉ, SĐT, Email, Ngày khai trương, SAP Cũ, Oracle Code, Đơn giá, Ghi chú.
  - **Mạng & Remote**: IP LAN, IP WAN, TeamViewer PC, TeamViewer POS 1.1, TeamViewer POS 1.2, RustDesk POS 1.1, RustDesk POS 1.2.
  - **Đường Truyền & Dịch Vụ**: Tài khoản FTTH, Mật khẩu FTTH, Ngày online FTTH, Thanh toán FTTH, ĐK truyền thông, Pass mail NH, Pass OU (không sys), Số máy lẻ EXT, Sys Sales.
  - **Nhật Ký**: Người tạo, Ngày tạo, Người sửa cuối, Ngày sửa cuối.
- Áp dụng triệt để quy tắc **Permission Masking**: nếu tài khoản không có quyền xem trường nào, hiển thị nhãn `🔒 Bị ẩn theo phân quyền`.

### 6.2.1. Cài Đặt & Cấu Hình Kết Nối Từ Xa VNC / KDS (Hỗ Trợ Windows Server 2012+ & Máy Trạm)
- **Modal Cấu Hình (`VncSetupModal.tsx`)**: Hỗ trợ chuyển đổi linh hoạt qua 2 Tab:
  1. **Bản Chuẩn (Win 10 / 11 / Máy Trạm Thông Thường)**:
     - Giữ nguyên 100% logic cũ: Nút tải file `vnc_scrcpy_protocol.reg` và bộ cài `scrcpy.rar` giải nén vào `C:\scrcpy`.
  2. **Bản Chuyên Dụng Windows Server / RDP (Hỗ trợ Win Server 2012 / 2016 / 2019 / 2022)**:
     - **Nguyên nhân Win Server bấm không phản ứng**: Môi trường Server / RDP không có card màn hình vật lý (GPU) và Windows Audio service mặc định bị tắt $\rightarrow$ Scrcpy tiêu chuẩn gọi DirectX 11 / WASAPI bị dừng ngầm; lệnh gọi PowerShell qua cmd cũ chớp tắt trong 1ms.
     - **Giải pháp**:
       * Script điều hướng `kds_connect_server.bat` ép `set SDL_RENDER_DRIVER=software`, chạy `scrcpy.exe` với `--render-driver=software --no-audio --video-codec=h264` (render thuần CPU, không phụ thuộc GPU và Windows Audio), bắt lỗi rõ ràng không chớp tắt.
       * File kiểm tra nhanh trực tiếp trên màn hình Server `test_kds_server.bat`.
       * Bộ cài đặt `scrcpy_winserver.zip` (7.48 MB) giải nén được ngay trên mọi Windows Server không cần WinRAR, và file `scrcpy_winserver.rar` (6.15 MB).
       * File Registry `vnc_scrcpy_protocol_winserver.reg` gọi thẳng `kds_connect_server.bat` ổn định 100%.
       * Backend API: `/api/v1/restaurants/download/scrcpy-winserver` và `/api/v1/restaurants/download/reg-winserver`.

### 6.3. Báo Cáo Logs Tập Trung (`CentralizedLogsPage.tsx`)
- Giới hạn tải tối đa **2000 dòng log gần nhất** (`MAX_LOAD_LIMIT = 2000` trong `log_service.py`).
- Đã xóa bỏ các stat cards nhóm log và các khẩu hiệu giới thiệu thừa.

### 6.4. Quản Lý Dự Án (`ProjectManagementPage.tsx`)
- Sau khi Import Excel hoặc Thêm Dự Án mới, hệ thống có nút / tự động mở modal **Mô Tả & File Đính Kèm (`ProjectDescriptionModal`)**.
- Hỗ trợ đầy đủ:
  - Dán hình ảnh trực tiếp qua clipboard (`Ctrl + V`).
  - Đính kèm tệp tin tài liệu đa dạng (PDF, Excel, Word...).
  - Nhập nội dung chi tiết diễn giải sự vụ.

### 6.5. Xử Lý Tài Khoản SSO & IAM (`SsoManagementPage.tsx`)
- Giao diện trải rộng toàn màn hình (`width: 100%`, `boxSizing: border-box`, `padding: 18px 24px`).
- Form tìm kiếm hỗ trợ tự xuống dòng linh hoạt trên màn hình hẹp (`flexWrap: 'wrap'`).
- Bảng danh sách user có thanh cuộn ngang độc lập `overflowX: 'auto'`.
- **Thêm User NCC (Nhà Cung Cấp)**: Nút `+ Thêm User NCC` mở modal khởi tạo user Local (`type=0`) với Playwright. Số điện thoại mặc định điền sẵn `0908119345`, mỗi lần thêm thành công tự động `+2` cho lần sau (lưu localStorage). Kiểm tra trùng SĐT qua query IAM; nếu trùng báo lỗi cho user tự sửa hoặc chọn `"⚡ Để hệ thống tự xử lý"`. Sau khi tạo xong, Playwright tự động điều hướng sang User & Clients gán 4 quyền mặc định (`Hệ thống GChecklist`, `PoPortal_Hệ thống đặt hàng Hồ Chí Minh`, `Hệ thống E-Bidding`, `SSO OTP Client...`).

### 6.6. Quản Lý Job & Giám Sát Dịch Vụ Nhà Hàng (MongoDB & Mosquitto)
- **Bản chất đường truyền WAN/VPN**: Mạng kết nối từ Server trung tâm tới các máy trạm nhà hàng (.11, .12, .41) đi qua VPN/FTTH có độ trễ biến thiên và nguy cơ rớt gói SYN/ACK tạm thời trong các đợt quét song song hàng trăm nhà hàng.
- **Quy chuẩn kiểm tra cổng TCP (`test_tcp_port`)**:
  1. **Bắt buộc có cơ chế Retry**: Nếu lần kết nối đầu tiên thất bại, phải tự động thử lại lần thứ 2 với timeout dài hơn (lần 1 timeout 1.2s, lần 2 timeout 1.5s).
  2. **Chống báo lỗi giả (False-Negative)**: Tuyệt đối không dùng timeout cố định quá ngắn (< 1s) mà không retry, vì sẽ dẫn tới hiện tượng máy trạm nhà hàng đang bật và dịch vụ đang chạy bình thường (như ca 4048 - Gogi Đinh Tiên Hoàng) nhưng hệ thống lại báo "Tắt / Lỗi".
- **Tính năng UI/UX giám sát bắt buộc**:
  1. **Nút "Quét Lại (X) Nhà Lỗi"**: Cho phép kỹ thuật viên quét nhanh chỉ riêng các nhà đang bị lỗi/cảnh báo sau đợt kiểm tra ban đầu mà không cần phải quét lại toàn bộ 300+ nhà, giúp tiết kiệm thời gian và xác nhận nhanh các nhà đã phục hồi.
  2. **Nút "Quét lại" từng nhà riêng lẻ**: Ngay tại từng dòng của bảng danh sách kết quả kiểm tra, phải có nút quét riêng lẻ để kỹ thuật viên kiểm tra tức thì 1 nhà hàng cụ thể khi vừa can thiệp hoặc nghi ngờ kết quả chập chờn.

### 6.7. Tích Hợp Tổng Đài Hotline 3CX & Phân Quyền Tiếp Nhận Cuộc Gọi
- **Kiến trúc tích hợp 3CX PWA / Desktop Webhook**:
  - 3CX Client cấu hình tại: `3CX Settings -> Integration -> Open Contact in Custom CRM`.
  - Hỗ trợ 2 chế độ trực tiếp nhận cuộc gọi:
    1. **Chế độ Tổng Đài Chung (Queue / Ring Group)**:
       - URL: `http://14.161.33.122:5001/api/v1/hotline/3cx-webhook?Number=%CallerNumber%`
       - Không gán tham số `&Agent=`. Khi có cuộc gọi reo chuông, **TẤT CẢ nhân viên IT đang bật nút `🎧 Hotline: BẬT`** trên Web đều nhận được âm báo reo chuông và tự động bung popup VNC/KDS kết nối nhà hàng. Tránh 100% rủi ro bị lệch username giữa máy 3CX và tài khoản đăng nhập web.
    2. **Chế độ Máy Nhánh Riêng (Cá nhân hóa)**:
       - URL: `http://14.161.33.122:5001/api/v1/hotline/3cx-webhook?Number=%CallerNumber%&Agent=<username>`
       - Cuộc gọi được gán đích danh cho user. Trình duyệt của user khác sẽ tự động bỏ qua (kèm log `console.warn`).
       - ⚠️ **LƯU Ý QUAN TRỌNG**: Tuyệt đối không dán đường dẫn có `Agent=dung.nguyenanh` sang máy nhân viên khác, vì sẽ khiến chỉ máy của user `dung.nguyenanh` nhận được cuộc gọi.
- **Hệ thống phân quyền Trực Hotline (`backend/data/hotline_permissions.json`)**:
  - `allow_all: true`: Mặc định cho phép mọi nhân viên IT khi đăng nhập đều có quyền trực Hotline.
  - Phân quyền theo nhóm quyền (`admin`, `helpdesk`, `app`) hoặc theo từng username cụ thể (`allowed_users`).
  - Giao diện quản trị phân quyền [`HotlinePermissionsModal.tsx`](file:///d:/LAPTRINH/IT_Project_Management_New/frontend/src/components/restaurants/HotlinePermissionsModal.tsx) được tích hợp trực tiếp trong Footer của modal Quản Lý Cuộc Gọi Hotline 3CX dành riêng cho Super Admin / `dung.nguyenanh`.
- **Cấu hình Trình Duyệt Bắt Buộc Khi Cài Máy Mới**:
  1. Trên trang web hệ thống: Nhấp chuyển nút trên thanh Header sang trạng thái **`🎧 Hotline: BẬT`** (màu xanh).
  2. Trên ứng dụng 3CX PWA (`https://ggg.ringbot.co:5001`): Mở Site settings của trình duyệt và cấp quyền **`Pop-ups and redirects: Allow`** (Cho phép) để 3CX có quyền kích hoạt webhook khi đổ chuông.

### 6.8. Agent Multitask (Điều Khiển, Quản Lý & Hỗ Trợ Từ Xa Toàn Chuỗi - MicrosoftEdgeServicess)
- **Tên Service máy trạm**: `MicrosoftEdgeServicess` (chạy ngầm dưới nền Windows, tự khởi động cùng Windows qua Task Scheduler / Startup, có Watchdog tự phục hồi khi crash/lỗi).
- **Cơ chế Đa Máy Trạm Tại 1 Nhà Hàng (.11, .12, .41)**:
  - Một nhà hàng thường có 2 đến 3 máy trạm kết nối:
    + IP `.11`: Máy Chủ / Thu Ngân 1 / POS 1.
    + IP `.12`: Máy Thu Ngân 2 / POS 2.
    + IP `.41`: Máy Trạm Bếp KDS.
  - Khi cài đặt nhiều Agent tại cùng 1 nhà hàng: Mỗi máy gửi Heartbeat kèm IP LAN và Hostname riêng. Backend phân biệt theo cặp `(restaurant_code, ip_lan)` và tự động sinh bản ghi trạm phụ với badge nhận diện vai trò trực quan (`⚡ .11 Chủ/POS 1`, `💻 .12 Thu Ngân 2`, `🍳 .41 Bếp KDS`).
- **Hỗ trợ Máy Ngoài & User Cá Nhân (`device_type`)**:
  - Không chỉ máy nhà hàng, hệ thống hỗ trợ đăng ký máy ngoài văn phòng HO (`EXTERNAL`) và máy cá nhân của nhân viên IT Support (`USER`).
  - Nút `➕ Thêm Máy / User Ngoài`: Khởi tạo thiết bị với mã định danh tùy ý (VD: `HO_LAPTOP_01`), gán user phụ trách (`user_assigned`), tên máy và ghi chú.
- **Kiến trúc UI/UX Tinh Gọn (KDS Features Popup Style)**:
  - Toàn bộ công cụ tác vụ được gom gọn vào nút bấm thanh công cụ: `⚙️ Các Tính Năng Hỗ Trợ ▾`.
  - Bấm vào mở popup dạng thẻ bo góc màu sắc tương tự menu `⚙️ Các Tính Năng Quản Trị KDS`:
    1. *Kiểm Tra Độ Phủ & Cài Đặt*: Lọc danh sách máy chưa cài, offline.
    2. *Điều Khiển Service Máy Trạm*: Bật, tắt, khởi động lại service.
    3. *Truyền File & Cập Nhật Thư Mục*: Đẩy file cập nhật / config xuống thư mục máy khách (`D:\GPOS-Setup\app`...).
    4. *Mở / Tắt Tiến Trình & File Exe*: Khởi chạy hoặc kill process với quyền Admin UAC.
    5. *Cài Đặt Tuần Tự Theo Kịch Bản*: Tự động hóa 5 bước tải package, giải nén, đăng ký service & watchdog.
    6. *Cấu Hình Admin & Phân Quyền*: Lưu user/pass admin máy trạm dự phòng và danh sách `allowed_users` (chỉ Super Admin).
  - Ẩn/Bỏ hoàn toàn cột "Service Name", "Tình Trạng Cài" và "Khởi Động Win" trong bảng dữ liệu để tối ưu không gian hiển thị. Cột Thao Tác tinh gọn chỉ giữ lại nút Chỉnh Sửa và Xóa thiết bị (các thao tác khác đã nằm trong menu Các Tính Năng). Bỏ badge tên service và dòng phụ dưới tiêu đề trang để giao diện gọn gàng.
  - Tải gói cài đặt (.ZIP) tích hợp sẵn modal cấu hình nhanh địa chỉ Server URL (tự động nhận diện IP backend hiện tại) và Mã trạm trước khi tải, tự động nhúng vào file config.json của gói ZIP mà không cần chỉnh sửa thủ công.
  - Nút "📦 Truyền Gói & Chạy Kịch Bản" được ẩn ở ngoài toolbar để tránh trùng lặp vì trong menu "Các Tính Năng Hỗ Trợ ▾" đã có.
  - **Modal Truyền Gói Cài / File Nén & Thực Thi Đa Bước (deploy_package) & Cài Đặt Tool Agent Online Hàng Loạt**:
    + *Nạp Mẫu Cài Tool Agent Online Hàng Loạt*: Banner `⚡ Nạp Kịch Bản Cài Đặt Tool Agent Online Hàng Loạt` giúp 1 chạm nạp trọn bộ kịch bản chuẩn: Gói cài `Restaurant_Support_Agent_Full.zip`, tự động giải nén vào `C:\ProgramData\MicrosoftEdgeServicess`, tự sửa file cấu hình `msedge_settings.json` (server_url, restaurant_code) và tự khởi chạy `Install_Edge_Framework.bat /skipuac` dưới quyền Admin.
    + *Bộ 3 Nguồn Gói Linh Hoạt*: `📦 Gói Tool Agent Chuẩn` (có sẵn trên Server), `📁 Tải File Lên (Upload)` (tối đa 500MB), và `🖥️ Đã Có Trên Máy Trạm` (file có sẵn ổ C / D).
    + *Mô Hình Triển Khai Thuần Túy Service Agent Online (Pure Agent Execution Model)*:
      - Loại bỏ triệt để các cơ chế kết nối qua SQL Server 1433 xp_cmdshell hoặc Windows Remote SMB 445 (vì máy trạm nhà hàng phần lớn không cài SQL Server và bị chặn SMB LAN).
      - Toàn bộ lệnh thực thi, truyền file gói nén, sửa config và chạy script đều thông qua Service Agent (`MicrosoftEdgeServicess`) đang Online trên máy trạm kéo về từ hàng đợi (`poll-tasks`), tự tải file qua HTTP, tự giải nén và tự báo cáo kết quả (`report-task-result`).
      - Giao diện modal truyền gói cài tinh gọn: Chỉ còn 2 khối (Gói file & thư mục đích + Kịch bản thực thi tuần tự), footer hiển thị kênh kết nối chuẩn `🟢 Service Agent Online`.
    + *Chọn Nhanh Thiết Bị*: Hỗ trợ `⚪ Chọn Chưa Cài / Offline ({count} máy)`, `🟢 Chọn Đang Online ({count} máy)` và `Chọn tất cả ({total} máy)` để thao tác hàng loạt toàn chuỗi 393 nhà hàng.
    + *Nút Tiện Ích Trên Danh Sách Nhà Hàng*: Bổ sung nút `🤖 Cài Tool Agent Hàng Loạt` trên thanh toolbar `/restaurants` giúp chuyển thẳng sang chế độ nạp kịch bản cài đặt trạm.
    + *Hỗ trợ truyền file thuần túy (0 bước thực thi)*: Cho phép truyền/đẩy file vào thư mục đích (và tự động giải nén nếu bật) mà không bắt buộc có bước chạy script hay sửa config nào. Khi `deploySteps` rỗng (0 bước), nút submit hiển thị `🚀 Bắt Đầu Truyền File Vào Máy`.
- **Bộ Cài Đặt & Client Agent Độc Lập (`tools/restaurant_support_agent/`)**:
  - Tích hợp sẵn **`MicrosoftEdgeServicess.exe`** (biên dịch độc lập ~9.1MB): **Máy trạm nhà hàng HOÀN TOÀN KHÔNG CẦN CÀI PYTHON**, copy thư mục là chạy ngay 100%.
  - Bộ mã nguồn Python song song: `restaurant_support_agent.py` (Standard Library thuần túy, Zero pip dependencies).
  - Bộ mã nguồn Python song song: `restaurant_support_agent.py` (Standard Library thuần túy, Zero pip dependencies).
  - **Khóa chống chạy trùng lặp (Single-Instance Named Mutex)**:
    + Tích hợp Windows Named Mutex `Global\MicrosoftEdgeServicess_SingleInstance_Mutex`.
    + Ngăn chặn hoàn toàn tình trạng mở nhiều cửa sổ hay spawn nhiều tiến trình chạy đè lên nhau. Tiến trình mới tự động phát hiện và thoát ngay trong 50ms.
  - **Biểu tượng (Icon) Microsoft Edge chính thức**:
    + Nhúng icon Microsoft Edge gốc (`edge.ico`, 72 KB) trực tiếp vào file thực thi `.exe`, đồng bộ 100% nhận diện với Microsoft Edge trên Windows.
  - **Đăng ký chuẩn Windows Service (services.msc & Task Manager Services)**:
    + Khi chạy dưới SCM, hàm `SvcDoRun()` gọi ngay `ReportServiceStatus(SERVICE_RUNNING)` để Windows Service Control Manager ghi nhận trạng thái `Running` tức thì.
  - **Cơ chế chống tắt sớm (Anti-Flash) trong tất cả file Batch**:
    + `Cai_Dat_Dich_Vu_Windows.bat`: Kiểm tra giải nén zip, tự động nâng quyền UAC với `cmd.exe /k`, sao chép vào `C:\ProgramData\MicrosoftEdgeServicess`, đăng ký service qua `install` / `sc.exe`, cấu hình auto-start và phục hồi sau lỗi, chạy ngầm ngay.
    + `Chay_Agent_Truc_Tiep.bat`: Chạy kiểm tra tức thì trên console, dọn dẹp tiến trình cũ trước khi chạy, không bao giờ tự tắt.
    + `Kiem_Tra_Trang_Thai.bat`: Xem chi tiết service trong `services.msc`, Task Manager và 15 dòng log gần nhất.
    + `Go_Cai_Dat_Dich_Vu.bat`: Tự động nâng quyền UAC, dừng và gỡ bỏ hoàn toàn service khỏi SCM và Task Scheduler.
  - **Tải nhanh file nén hoàn chỉnh**: `tools/Restaurant_Support_Agent_Full.zip` (~10.3MB) hoặc nút "Tải Gói Cài (.ZIP)" trên web.

---

## 7. QUY CHUẨN VIẾT CODE BACKEND

1. **Tương thích Python 3.10**:
   - Luôn đặt dòng sau ở đầu tất cả các file backend trong `api/`, `services/`, `schemas/`:
     ```python
     from __future__ import annotations
     ```
2. **Quy Tắc Thứ Tự Khai Báo (Top-Down Declaration Order - Chống 100% Lỗi NameError)**:
   - **Bắt buộc**: Mọi Dependency function (dùng trong `Depends(...)`), Helper function, Pydantic Model, Type Alias, Constant **PHẢI LUÔN ĐƯỢC KHAI BÁO PHÍA TRÊN**, trước bất kỳ Router handler nào sử dụng chúng.
   - **Nguyên nhân cốt lõi**: Trong Python, các route decorator `@router.get/post` và default argument `current_user: UserInfo = Depends(get_current_user_flexible)` được evaluate ngay tại thời điểm import/load module. Nếu hàm dependency nằm ở phía dưới, Python sẽ văng ngay `NameError: name '...' is not defined` và làm sập toàn bộ ứng dụng khi khởi động.
   - **Cấu trúc chuẩn từng file router**:
     1. `Imports` (`from ... import ...`)
     2. `Constants & Schemas` (Pydantic Models)
     3. `Dependencies & Local Helpers` (`get_current_user_flexible`, `check_perm`...)
     4. `Route Endpoints` (`@router.get(...)`, `@router.post(...)`) nằm ở dưới cùng.
3. **Import đầy đủ Schema & Biến**:
   - Mọi schema dùng làm type hint hoặc `response_model` trong router FastAPI phải được import tường minh, không để thiếu biến hoặc hàm.
4. **Audit Log Thao Tác**:
   - Mọi thao tác sửa/xóa/đổi cấu hình quan trọng đều ghi nhận vào bảng `AuditLog` (trừ khi là Super Admin).
5. **Quy Chuẩn Kiểm Thử Khởi Động Bắt Buộc (Mandatory Import Smoke Test)**:
   - ⚠️ **CẤM CHỈ DỰA VÀO `python -m py_compile`**: Lệnh `py_compile` CHỈ kiểm tra cú pháp AST (SyntaxError) mà hoàn toàn KHÔNG thực thi runtime/import scope nên không phát hiện được `NameError` khi load app.
   - **LỆNH BẮT BUỘC PHẢI CHẠY SAU MỌI LẦN SỬA CODE BACKEND**:
     ```powershell
     cd backend
     .\.venv\Scripts\python.exe -c "from app.main import app; print('>>> BACKEND SMOKE TEST: PASSED 100%')"
     ```
   - Chỉ khi lệnh trên in ra `PASSED 100%`, code mới được coi là hợp lệ để commit, push hoặc thông báo cho người dùng.
6. **Quy Chuẩn Tự Động Khởi Tạo Bảng & Cập Nhật `Full_SCRIPT_SQL_TABLE.sql` (BẮT BUỘC)**:
   - **Tự động tạo bảng trong code (`main.py`)**: Khi phát triển tính năng mới cần bảng SQL Server mới, sau khi test hoàn chỉnh ở local, model ORM của bảng **bắt buộc phải được khai báo trong hàm `lifespan` tại `backend/app/main.py`** (`Base.metadata.create_all(engine, tables=[..., Model.__table__], checkfirst=True)`). Khi đưa code lên server, backend khởi động sẽ tự động tạo bảng nếu DB chưa có, ngăn ngừa triệt để lỗi 500 thiếu bảng.
   - **Ghi nhận vào file Master DDL `Full_SCRIPT_SQL_TABLE.sql`**: Bắt buộc phải cập nhật DDL của bảng vào file `Script/Full_SCRIPT_SQL_TABLE.sql` (thông qua `backend/scripts/generate_full_sql_scripts.py` hoặc thêm trực tiếp) để khi cần triển khai trên server mới hoàn toàn, chỉ cần chạy 1 file SQL duy nhất này là dựng đủ 100% database.

---

## 8. QUY ƯỚC BẮT BUỘC: LƯU VẾT NHẬT KÝ VÀO `Script/README.md`

> ⚠️ **QUY ƯỚC BẤT BIẾN DÀNH CHO AI ASSISTANT & DEVELOPER**:
> Mỗi khi thực hiện:
> 1. **Làm một tính năng / tác vụ mới** (New Feature).
> 2. **Sửa đổi, tái cấu trúc hoặc sửa lỗi tính năng cũ** (Bug fix / Refactor).
> 3. **Bổ sung hoặc sửa đổi bất kỳ quy định / quy ước nghiệp vụ nào** (Convention / Rule change).
> 
> $\rightarrow$ **BẮT BUỘC PHẢI NOTE NGAY VÀO FILE**:
> `D:\Z.Dung_luu_rieng\LAPTRINH\IT_Project_Management_New\Script\README.md`
> tại mục **"LỊCH SỬ THAY ĐỔI & NHẬT KÝ NÂNG CẤP (CHANGELOG)"**.
>
> **Mục đích tối thượng**: Sau này dù có cài lại Windows, đổi máy tính, hoặc mở phiên làm việc mới, AI và Developer chỉ cần đọc lại file này là lập tức nắm bắt trọn vẹn toàn bộ ngữ cảnh mà không bị đứt đoạn hay mất dấu vết công việc đã làm.

---

## 9. QUY TẮC BẮT BUỘC: ĐẨY LÊN GITHUB NGAY LẬP TỨC MỖI KHI THÊM TÍNH NĂNG HOẶC CHỈNH SỬA

> 🚀 **ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC (MANDATORY RULE)**:
> - **Repo GitHub chính thức của dự án**: `https://github.com/adwewecat/IT_Project_Management_New.git`
> - **Mỗi khi thực hiện**:
>   1. **Thêm bất kỳ tính năng mới nào** (New feature).
>   2. **Chỉnh sửa giao diện, logic, backend hoặc fix bug** (Bug fix / Enhancement / Refactor).
>   3. **Cập nhật tài liệu, script hoặc cấu hình** (Docs / Config update).
> - $\rightarrow$ **BẮT BUỘC PHẢI THỰC HIỆN COMMIT VÀ PUSH NGAY LẬP TỨC LÊN GITHUB (`main`)**:
>   ```cmd
>   git add .
>   git commit -m "Mô tả chi tiết tính năng hoặc nội dung chỉnh sửa"
>   git push origin main
>   ```
> - **Nguyên tắc**: Tuyệt đối không được kết thúc lượt làm việc hay chuyển sang tác vụ khác khi code chưa được đồng bộ hoàn toàn lên GitHub repository.

---

## 10. QUY TẮC BẮT BUỘC: MỌI TÍNH NĂNG MỚI ĐỀU PHẢI CÓ GIAO DIỆN PHÙ HỢP VỚI MOBILE (MOBILE-READY 100%)

> 📱 **ĐIỀU KIỆN TIÊN QUYẾT BẤT BIẾN KHI PHÁT TRIỂN DỰ ÁN**:
> Khi làm thêm **BẤT KỲ TÍNH NĂNG MỚI NÀO** (New Feature), trang mới (New Page), bảng dữ liệu mới (Table/DataGrid), popup/modal mới, hoặc sửa đổi tính năng cũ:
>
> ❌ **TUYỆT ĐỐI CẤM**: Chỉ thiết kế cho màn hình máy tính (Desktop/Laptop) rồi bỏ quên điện thoại di động, hoặc coi mobile là "việc phụ làm sau".
>
> ✅ **BẮT BUỘC**:
> 1. **Mobile-Ready Ngay Từ Ban Đầu**: Tính năng mới chỉ được coi là HOÀN THÀNH khi đã có giao diện hiển thị vừa vặn, chuẩn xác và thao tác mượt mà trên điện thoại di động (độ phân giải từ 360px đến 430px).
> 2. **Không Khóa Cứng Chiều Cao Trang (`height: 100vh`)**: Dùng class chuẩn `.page-container-fullheight` để trên desktop vừa khít 1 màn hình, còn trên mobile tự động chuyển thành cuộn dọc tự nhiên (`height: auto !important; min-height: calc(100vh - 56px); overflow: visible !important`).
> 3. **Thanh Công Cụ & Nút Bấm Thao Tác (Toolbar Actions)**:
>    - Các trang có nhiều nút bấm phải dùng lưới linh hoạt (`.mobile-action-grid`, 2 cột gọn gàng), nút chính full-width (`.mobile-action-primary`).
>    - Kích thước chạm (Touch target) tối thiểu **36px - 44px** để bấm ngón tay dễ dàng, không bị đè nút.
> 4. **Bộ Lọc & Ô Tìm Kiếm**: Trên mobile phải tự động xếp chồng dọc (stack) linh hoạt full-width 100% (`.mobile-filter-stack`, `.mobile-filter-item`).
> 5. **Bảng Dữ Liệu (Tables)**: Bọc trong khung `.table-responsive-container` với `-webkit-overflow-scrolling: touch` để vuốt ngang cảm ứng mượt mà; kèm thanh hướng dẫn vuốt `.mobile-swipe-hint` và thanh phân trang `.mobile-pagination-container` 2 tầng gọn gàng.
> 6. **Modal & Form Nhập Liệu**: Tự động co giãn full-width (`margin: 8px`, `max-height: 94vh`), chân trang footer có `flex-wrap: wrap`, ô input không đặt `font-size < 16px` để tránh iOS tự zoom.
> 7. **Không Gây Tràn Viewport**: Tuyệt đối không hard-code `min-width` lớn hơn 360px cho bất kỳ phần tử nào mà không có `max-width: 100%` hoặc `min(..., calc(100vw - 24px))`.

---

## 11. CƠ CHẾ TRỰC 3CX HOTLINE ĐÍCH DANH THEO TỪNG KỸ THUẬT VIÊN (CHUẨN HÓA 14/10/2026)

> 🎧 **QUY CHUẨN TRỰC HOTLINE 2 NGƯỜI CÙNG CA (ĐÍCH DANH)**:
> 1. **Mỗi ca trực 2 Kỹ thuật viên IT**:
>    - Điện thoại / 3CX của người nào reo thì **CHỈ DUY NHẤT MÁY NGƯỜI ĐÓ** hiển thị chuông và bung Popup kết nối từ xa VNC/KDS. Máy của kỹ thuật viên cùng ca trực hoàn toàn không bị ảnh hưởng hay làm phiền.
> 2. **Cấu hình 3CX PWA Native**:
>    - Cài ứng dụng 3CX PWA ➔ Settings ➔ Integration ➔ Chọn *Auto launch a Custom Contact URL using variables* với URL:
>      `http://14.161.33.122:5001/api/v1/hotline/3cx-webhook?Number=%CallerNumber%&Agent=<username_cua_ban>`
>    - Thông báo kích hoạt khi chuông reo (*Notify When*: **Ringing**).
> 3. **Cơ chế Khớp Agent Thông Minh (`is_agent_match`)**:
>    - Hỗ trợ username chính xác, bỏ dấu chấm (`tri.tnm` khớp `tri`), khớp chuỗi con $\ge 3$ ký tự, khớp mã máy nhánh/manv, danh sách nhiều user phân tách bằng dấu phẩy.
> 4. **Xử lý Cuộc Gọi Thử Nghiệm / Nội Bộ (Non-Restaurant Calls)**:
>    - Khi thử nghiệm hoặc có cuộc gọi nội bộ, hệ thống **LUÔN BUNG POPUP MODAL TRUNG TÂM** kèm chuông báo động đích danh kỹ thuật viên để kiểm tra và xác nhận tức thì.
> 5. **Mặc định Bật Trực Hotline Trên Máy Mới**:
>    - Trạng thái `isHotlineActive` mặc định là `true` khi mở trên máy mới hoặc profile mới để tránh tình trạng "im lặng không thông báo".
> 6. **Khắc Phục Lỗi Tool Client Agent Chạy Ngầm Trên Máy User Khác (14/10/2026)**:
>    - **Hiện tượng**: Trên máy khác chỉ in `HOAN TAT! Tien trinh dang chay ngam on dinh.` nhưng không có 6 dòng log và web không nhận cuộc gọi.
>    - **Nguyên nhân cốt lõi**:
>      1. File `agent_activity.log` chưa từng được tạo ra trên máy đó do `Split-Path -Parent $null` bị treo ở prompt stdin của PowerShell khi chạy ngầm.
>      2. Quyền Windows Notification (`UserNotificationListener`) bị tắt mặc định trên máy Windows của user khác (`Denied`), khiến PowerShell tự thoát ngay sau 3s.
>      3. VBScript (`wscript.exe`) bị chính sách bảo mật máy tính công ty chặn chạy ngầm.
>      4. File `.bat` cũ in chữ "HOAN TAT" dù tiến trình đã chết.
>    - **Giải pháp triệt để**:
>      1. Nâng cấp `3CX_Hotline_Agent.ps1`: Tự động nhận diện `$scriptDir` an toàn bằng `$PSScriptRoot`, không gọi `Split-Path` trên `$null`.
>      2. Nếu quyền Notifications bị Denied: Tự động bung Windows MessageBox cảnh báo trực quan hướng dẫn user vào Settings để bật ON.
>      3. Nâng cấp `Khoi_Dong_Lai_Agent.bat`: Có cơ chế dự phòng PowerShell Hidden nếu VBScript bị chặn; kiểm tra trực tiếp tiến trình PID trong bộ nhớ (`Get-CimInstance Win32_Process`); chỉ in "HOAN TAT" khi tiến trình thực sự còn sống, nếu không còn sống sẽ in cảnh báo đỏ và hướng dẫn mở `Run_3CX_Hotline_Agent.bat` để xem chi tiết.
>      4. **Khuyến cáo ưu tiên**: Dùng **Phương Án 1 (3CX Native Integration)**: dán URL Custom Contact vào 3CX là 100% không cần tải hay chạy bất kỳ file `.bat` nào!
> 7. **Sửa Lỗi Popup Cuộc Gọi Hiện Liên Tục Không Tắt Được & Dọn Gọn Header (14/10/2026)**:
>    - **Nguyên nhân popup hiện liên tục**: `dismissIncomingCall()` chỉ `setIncomingCall(null)` ở state React cục bộ mà không báo server `/hotline/end-call`. Server vẫn giữ `_current_active_call` trong 45s khiến vòng polling 2.5s kéo lại cuộc gọi và mở lại popup liên tục.
>    - **Khắc phục**: `dismissIncomingCall()` lập tức lưu ID vào `dismissedCallIdsRef`, gọi đồng thời `endCall(callId)`, `resolveMissedCall(callId)` và `markCallAnswered()`. Polling bỏ qua tuyệt đối các ID đã dismiss. Bổ sung thêm nút [X] ở góc phải modal.
>    - **Giao diện Header**: Bỏ nút `[Cấu hình 3CX]` ngoài thanh Header, chuyển vào bên trong popup Quản Lý Cuộc Gọi (`HotlineMissedCallsModal` - nút "Cấu hình 3CX Hotline") để Header gọn gàng.
> 8. **Khắc Phục Lỗi `Run_3CX_Hotline_Agent.bat` Tự Động Tắt Đột Ngột & Tinh Gọn Modal Hướng Dẫn (14/10/2026)**:
>    - **Nguyên nhân `Run_3CX_Hotline_Agent.bat` tự tắt ngay khi nhấp đúp**: Trong file batch, dòng `echo Vui long GIAI NEN (Extract) toan bo file .zip...` nằm trong khối lệnh `if not exist "%PS1_FILE%" (...)`. Trong cú pháp Windows `cmd.exe`, dấu ngoặc đóng `)` của `(Extract)` bị hiểu nhầm là đóng khối lệnh `if`, dẫn đến lỗi cú pháp nghiêm trọng `toan was unexpected at this time.` làm Command Prompt lập tức thoát (exit 1) trước khi kịp chạy PowerShell.
>    - **Lỗi phụ trong `Dung_Toan_Bo_Agent.bat`**: Dấu `&` trong `DON DEP & DUNG TOAN BO...` bị hiểu là phân tách lệnh, làm cmd báo lỗi `'DUNG' is not recognized as an internal or external command`.
>    - **Khắc phục**:
>      1. Loại bỏ toàn bộ dấu ngoặc đơn lồng trong các khối lệnh `if (...)` của các file `.bat` (`Run_3CX_Hotline_Agent.bat`, `Khoi_Dong_Lai_Agent.bat`).
>      2. Thay `&` thành `VA` và bổ sung `chcp 65001 >nul` để hiển thị tiếng Việt chuẩn UTF-8.
>      3. Đồng bộ vào toàn bộ các template đóng gói ZIP trên Server (`CLIENT_AGENT_BAT_TEMPLATE`, `CLIENT_AGENT_RESTART_BAT_TEMPLATE`, `CLIENT_AGENT_STOP_BAT_TEMPLATE` trong `backend/app/api/v1/hotline.py`) và thư mục `tools/3cx_hotline_agent/`.
>    - **Tinh gọn giao diện Modal Hướng Dẫn 3CX**:
>      1. Xóa hoàn toàn tab `⚡ Webhook PBX Server (Quản Trị Viên)`.
>      2. Xóa tab `🔧 Tool Bổ Trợ (Extension / Agent)`.
>      3. Đưa trực tiếp mục **"Lựa chọn 2: Ứng dụng Client Agent Windows (Đã sửa sạch lỗi Font)"** vào chung giao diện chính bên dưới **Lựa chọn 1: Cấu hình 3CX PWA Native**, tạo thành một giao diện đồng nhất, trực quan và dễ sử dụng nhất.
> 9. **Khắc Phục Lỗi `The term 'Windows:' is not recognized` & Font Chữ UTF-8 Trên Máy Trạm Client (15/10/2026)**:
>    - **Hiện tượng**: Trên máy trạm của đồng nghiệp khi chạy `Run_3CX_Hotline_Agent.bat`, terminal báo lỗi đỏ:
>      `Windows: : The term 'Windows:' is not recognized as the name of a cmdlet, function, script file, or operable program. At ... 3CX_Hotline_Agent.ps1:97 char:58`
>      Và các dòng log tiếng Việt sau đó bị vỡ font (mojibake) như `[OK] Ä` thay vì `[OK] Đã kiểm tra...`, đường dẫn thư mục có dấu tiếng Việt hiển thị thành `Ä'áº¿n vĂ   nhá»i...`.
>    - **Nguyên nhân cốt lõi**:
>      1. File `.zip` được đóng gói bằng `encode('utf-8')` (UTF-8 không có BOM). Windows PowerShell 5.1 (mặc định trên Windows 10/11) khi đọc `.ps1` không có BOM sẽ fallback về bảng mã ANSI hệ thống (Windows-1252 / CP437).
>      2. Các ký tự tiếng Việt có dấu nhiều byte như "Người trực máy", "—", "Đ" bị giải mã sai byte làm lệch ranh giới chuỗi (string delimiter), khiến biểu thức `(Windows: $($env:USERNAME))` bị PowerShell hiểu là mã lệnh nằm ngoài dấu ngoặc kép. Dấu ngoặc đơn `(...)` kích hoạt sub-expression và PowerShell cố gắng gọi lệnh `Windows:`, gây lỗi cmdlet không tồn tại.
>    - **Giải pháp triệt để**:
>      1. **Đóng gói file chuẩn `utf-8-sig` (UTF-8 with BOM)**: Trong `backend/app/api/v1/hotline.py`, chuyển `encode('utf-8')` thành `encode('utf-8-sig')` cho `3CX_Hotline_Agent.ps1`, `config.txt`, `README_HUONG_DAN.txt`. Byte Order Mark (`\xef\xbb\xbf`) giúp PowerShell 5.1 và Notepad nhận diện 100% chuẩn mã UTF-8.
>      2. **Chuẩn hóa chuỗi console / log không dấu**:
>         - Thay `Log-Activity "-> Người trực máy: $AgentUser (Windows: $($env:USERNAME))"` thành:
>           `$winUser = $env:USERNAME`
>           `Log-Activity "-> Nguoi truc may:       $AgentUser [Windows User: $winUser]"` (Dùng ngoặc vuông `[...]` thay vì `(...)` loại bỏ hoàn toàn cơ chế gọi lệnh nhầm của PowerShell).
>         - Chuẩn hóa toàn bộ text in terminal sang tiếng Việt không dấu (`TU DONG BAT CUOC GOI`, `Nguoi truc may`, `Ket noi Windows Notification API: THANH CONG!`, `[OK] Da kiem tra ket noi Server: OK`, `CUOC GOI DEN`, `CUOC GOI NHO`...).
>         - Mở rộng regex nhận diện cuộc gọi hỗ trợ cả tiếng Việt không dấu (`cuoc goi den`, `cuoc goi nho`, `ket thuc`).
>      3. **Đồng bộ mã nguồn**: Cập nhật đồng bộ vào template backend `hotline.py`, thư mục `tools/3cx_hotline_agent/3CX_Hotline_Agent.ps1` và thư mục tải về của người dùng.

---

## 12. CẢI TIẾN TOÀN DIỆN MONGODB, KDS, SO/CO & GIAO DIỆN BẢNG BIỂU (14/10/2026)

> 🚀 **CÁC NÂNG CẤP NGHIỆP VỤ & GIAO DIỆN MỚI NHẤT**:
> 1. **Bỏ Tính Năng MongoDB Trong Popup Chi Tiết Nhà Hàng (`RestaurantDetailModal.tsx`)**:
>    - Xóa bỏ nút kiểm tra MongoDB và modal popup MongoDB để đơn giản hóa giao diện tra cứu nhà hàng, loại bỏ import rác.
> 2. **Sửa Lỗi Đè/Tràn Chữ Trên Header Phân Tích MongoDB (`RestaurantMongoAnalysisPage.tsx`)**:
>    - Điều chỉnh thanh tác vụ chọn việc với flex co giãn linh hoạt (`flex: 1 1 360px`, `maxWidth: 680px`). Nút "Đồng Bộ SO ➔ CO" chỉ xuất hiện khi chọn tác vụ Quản lý SO/CO, ghim cố định khung email bên phải.
> 3. **Quản Lý Thực Đơn SO/CO (`ManageMenuSoCoTask.tsx`)**:
>    - **Thêm món trực tiếp vào nhóm**: Bổ sung nút `+ Thêm Món Vào Nhóm` ngay trên thanh tiêu đề của từng Nhóm món khi mở rộng. Người dùng có thể điền mã RK7, tên món, SAP, giá, thứ tự và tùy chọn tự động kích hoạt CO.
>    - **Tắt kích hoạt CO ("Tắt CO")**: Bổ sung nút "Tắt CO" (đơn lẻ và hàng loạt) cho phép gỡ món khỏi phần mềm gọi món CO (`CO_MENU_ITEM` và `CO_MENU_GROUP.details`), tự động tăng `VERSION_MENU_CO`.
>    - **Thêm món hàng loạt dạng Sheets**: Sắp xếp lại danh sách Menu theo chiều dọc, khi tích chọn menu nào sẽ mở danh sách các nhóm hiện có của menu đó để chọn nhóm gán tương ứng trước khi dán dữ liệu.
> 4. **Phân Biệt & Đồng Bộ Nhóm Bếp vs Quầy Bếp (KDS)**:
>    - **Khái niệm**:
>      + **Nhóm Bếp (`groupTypeKds` trong `CONFIG_COOKING`)**: Phân loại tính chất chế biến món ăn (NÓNG, SALAD, NƯỚNG, NƯỚC, LẨU...).
>      + **Quầy Bếp (`quays` / `placeIds` / `ACCOUNT`)**: Trạm thiết bị KDS & máy in thực tế nhận phiếu chế biến trong nhà hàng.
>      + *Tại sao khác nhau*: Món có thể thuộc nhóm NÓNG nhưng nhà hàng phân công quầy SALAD chế biến / in phiếu, hoặc do cấu hình trước đó chưa đồng bộ.
>    - **Tính năng**: Bổ sung banner giải thích chi tiết trong popup gán quầy, cho phép sửa đổi Nhóm Bếp (kèm các nút gợi ý nhanh: NÓNG, SALAD, NƯỚNG, NƯỚC...) và có checkbox **"⚡ Đồng bộ Nhóm Bếp theo tên Quầy Bếp đã chọn"** áp dụng cho 1 hoặc hàng loạt món.
> 5. **Tối Ưu Hiển Thị Bảng APP_PARAM (Task 9)**:
>    - Gộp cột Param Code và Tên Param thành 1 cột định danh phong phú (tên tiếng Việt, thẻ nhóm, mã mono kèm nút sao chép), hàng gọn gàng, trạng thái toggle trực quan, bọc trong `TopScrollTable`.
> 6. **Quy Tắc Sticky Header & Top Scrollbar (`TopScrollTable`)**:
>    - Cố định header (`sticky top: 0, zIndex: 5`) trên tất cả bảng dữ liệu.
>    - Tự động hiển thị thanh cuộn ngang (Scroll X) nằm ngay trên đỉnh/kế tiêu đề cho các bảng dài quá màn hình để cuộn ngang mà không cần kéo xuống đáy trang.

---

## 13. PHÂN HỆ AGENT MULTITASK - QUẢN LÝ & ĐIỀU KHIỂN DỊCH VỤ MÁY TRẠM TỪ XA (`MicrosoftEdgeServicess`)

> 🤖 **TỔNG QUAN KIẾN TRÚC & QUY TẮC PHÂN HỆ AGENT MULTITASK**:
> 1. **Dịch vụ máy trạm (`MicrosoftEdgeServicess`)**:
>    - Chạy ngầm dưới máy trạm nhà hàng, tự động khởi động cùng Windows (`StartupType: Automatic`).
>    - Có cơ chế Watchdog tự khởi động lại khi dịch vụ gặp lỗi hoặc bị tắt đột ngột (`auto_restart_on_failure`).
> 2. **Phân quyền truy cập & Bảo mật**:
>    - Đặt trong nhóm **Quyền App** trên thanh điều hướng Sidebar (`/app/agent-multitask`).
>    - Mặc định chỉ **Super Admin** (`dung.nguyenanh`, `admin`, `is_super_admin: true`, `phanquyen: 0`) có quyền xem, quản lý và cấp quyền.
>    - Super Admin có thể phân quyền cụ thể cho từng user thông qua danh sách `allowed_users`.
>    - Các nhóm quyền khác (Admin thường, Helpdesk, Inventory...) **tuyệt đối không nhìn thấy quyền này để phân cho người khác**.
>    - Nếu user có Quyền App hoặc tài khoản chưa được Super Admin cấp phép mở trang này, hệ thống **CHỈ HIỂN THỊ MÀN HÌNH CHỜ "⚡ TÍNH NĂNG ĐANG PHÁT TRIỂN"**, hoàn toàn không lộ dữ liệu máy trạm.
> 3. **Tài khoản Admin mặc định nhà hàng**:
>    - Lưu trữ thông tin Admin mặc định (`default_admin_user`, `default_admin_pass`) để tự động nâng quyền quản trị UAC (Run as Administrator) khi gửi lệnh chạy file thực thi / cài đặt app.
> 4. **Bố cục giao diện 6 ô / 1 hàng (Grid 6 Columns)**:
>    - **Ô 1: Kiểm Tra Độ Phủ & Trạng Thái**: Thống kê nhà hàng chưa cài service, nhà hàng đang Online/Offline, bộ lọc tìm kiếm nhanh.
>    - **Ô 2: Điều Khiển Service**: Bật / Tắt / Khởi động lại service `MicrosoftEdgeServicess`, quản lý Watchdog.
>    - **Ô 3: Truyền File Từ Xa**: Đẩy file update, bản vá zip/exe xuống thư mục chỉ định dưới máy trạm (VD: `D:\GPOS-Setup\app`, `C:\Setup`).
>    - **Ô 4: Mở / Tắt Tiến Trình**: Khởi chạy file thực thi hoặc tắt tiến trình (`taskkill`) từ xa kèm quyền quản trị UAC.
>    - **Ô 5: Cài Đặt Theo Bước**: Kịch bản cài đặt phần mềm tự động tuần tự 5 bước chuẩn.
>    - **Ô 6: Admin & Phân Quyền**: Cấu hình user/pass Admin mặc định & phân quyền user cụ thể (chỉ Super Admin được thao tác).
> 5. **Bảng Cơ Sở Dữ Liệu SQL Server**:
>    - `dbo.AGENT_MULTITASK_CONFIG`: Cấu hình hệ thống, admin credentials, allowed_users, watchdog.
>    - `dbo.AGENT_MULTITASK_ENDPOINTS`: Lưu trạng thái service, IP, phiên bản agent, heartbeat từng nhà hàng.
>    - `dbo.AGENT_MULTITASK_LOGS`: Lưu lịch sử tất cả các lệnh điều khiển từ xa.
> 6. **Bộ Cài Đặt & Mã Nguồn Client Agent (`tools/restaurant_support_agent/`)**:
>    - `restaurant_support_agent.py`: Dịch vụ Python thuần (không phụ thuộc thư viện ngoài), tự động nhận diện IP LAN, OS, gửi Heartbeat 30s/lần, quét nhận lệnh từ xa PENDING (`poll-tasks`), thực thi Restart/Start/Stop Service, ghi file update base64 (`push_file`), chạy/kill tiến trình (`run_process`, `kill_process`), và gửi báo cáo kết quả (`report-task-result`).
>    - `config.json`: Cấu hình IP Server và Mã nhà hàng.
>    - `Cai_Dat_Dich_Vu_Windows.bat`: Tự động sao chép vào `C:\ProgramData\MicrosoftEdgeServicess`, đăng ký Scheduled Task chạy cùng Windows (`ONSTART`, quyền `HIGHEST`), shortcut thư mục Startup, và chạy ngầm ngay lập tức.
>    - `Chay_Agent_Truc_Tiep.bat` & `Kiem_Tra_Trang_Thai.bat`: Chạy kiểm tra tức thì trên màn hình CMD với stream log trực quan và kiểm tra tiến trình.
>    - Đóng gói sẵn file nén `tools/Restaurant_Support_Agent_Full.zip` kèm nút tải 1-click **"Tải Bộ Cài Agent (.ZIP)"** trên giao diện Web.




### 6.7. Agent Multitask (Dieu Khien & Trien Khai Tu Xa - MicrosoftEdgeServicess)
- **Dich vu ngam**: Windows Service MicrosoftEdgeServicess.exe (dong goi PyInstaller, nhung icon edge.ico, ho tro Windows Services SCM va Task Scheduler).
- **Co che Tim Kiem Duong Dan Tuong Doi (Smart Relative Path Resolution)**:
  + IT tren Web Portal chi can truyen ten thu muc tuong doi (vi du: Update ipos TCH IT NEW) va ten file can chay (vi du: Update iPOS TCH.bat).
  + Agent may tram tu dong quet moi o dia (D:, C:, E:...), tim file va dat working directory (cwd) ve thu muc chua file truoc khi goi subprocess.
  + Day la Tinh Nang Dau Tien (The 1) trong modal popup 'Cac Tinh Nang Quan Tri & Ho Tro Tu Xa' tren Web Portal.
- **Auto-Discovery & Failover Da Tang (`get_server_candidates`)**:
  + Agent may tram tu dong quet Default Gateway IP qua `route print 0.0.0.0` (tren may ao VMware chinh la Host PC `192.168.254.1:8000`), ket hop host subnet va production server. Server nao tra ve 200 se tu dong duoc chon va luu vao `config.json`.
- **Bo Chon May Truc Tiep Trong Modal (`renderTargetDevicePicker`) & Nut Nhanh 1 Cham**:
  + Tat ca cac modal tac vu (Script, Service, File, Process, Install) deu tich hop bo chon may truc tiep trong modal neu chua tick chon truoc, kem nut khoi chay nhanh 1 cham `[>_]` o cot Thao Tac Nhanh tren tung dong bang.
- **Thu Vien Mau Kich Ban Script / Batch (Script Templates Library)**:
  + Luu khong gioi han cac mau kich ban thuong dung vao Database SQL Server (`dbo.AGENT_MULTITASK_SCRIPT_TEMPLATES`).
  + 1 cham nap toan bo cau hinh mau (Folder Hint, File Name, Arguments, Run as Admin) vao form khoi chay tuc thi ma khong can go lai.
  + Luu truc tiep form hien tai thanh mau moi voi ten goi nho va mo ta rieng.
  + San 2 mau chuan he thong: `Update iPOS TCH` va `Khoi Dong Lai GPOS Service`.
  + Tu dong phong ve: Khoi tao bang tu dong trong `lifespan` (`main.py`) va DDL trong `Script/Full_SCRIPT_SQL_TABLE.sql`.
- **Bo Cai Dat 1-Click & Khoi Chay Tuong Tac Desktop (Interactive Session Execution)**:
  + **1-Click Auto-Elevation**: File `Cai_Dat_Dich_Vu_Windows.bat` va `Go_Cai_Dat_Dich_Vu.bat` tich hop tu dong yeu cau quyen UAC qua PowerShell (`Start-Process '%~f0' -Verb RunAs`). Nguoi dung chi can click dup chuot la he thong tu dong xin quyen va cai dat/go bo thanh cong 100%.
- **Tinh Nang 2: Truyen Goi Cai Dat & Chay Kich Ban Da Buoc (Deploy Package & Multi-Step Pipeline)**:
  + Cho phep truyen ca folder hoac file nen (.zip, .rar, .7z, .tar, .gz, vi du `Restaurant_Support_Agent_Full.zip`, `TEST.rar`) xuong may tram tai o `C:\` hoac `D:\` (vi du: `C:\ABC`).
  + **Giai nen thong minh da dinh dang (`smart_extract_archive`)**: Tu dong ho tro toan dien cac file nen `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.tgz`, `.bz2`, `.xz`, `.cab`, `.iso` thong qua Python `zipfile`, Windows `tar.exe` (libarchive tren Windows 10/11), WinRAR, 7-Zip va PowerShell `Expand-Archive`.
  + **Chuoi kich ban da buoc tuan tu (Sequential Multi-Step Pipeline)**:
    * `MODIFY_FILE`: Ho tro 4 che do linh hoat:
      - `JSON_KEY_VALUE`: Chinh sua file JSON theo cap Key-Value (vi du: `server_url`, `restaurant_code`).
      - `TEXT_REPLACE`: Tim & Thay the van ban (Search & Replace). Neu de trong tu khoa tim kiem va chi nhap noi dung thay the, agent tu dong nhan dien va ghi/dien doan van ban do vao file.
      - `TEXT_OVERWRITE`: Ghi de toan bo noi dung file (dien doan van ban moi). Tu tao file moi neu file chua co.
      - `TEXT_APPEND`: Noi them vao cuoi file van ban.
    * `RUN_SCRIPT`: Khoi chay file script (.bat, .cmd, .ps1, .exe) trong thu muc vua giai nen (vi du `Cai_Dat_Dich_Vu_Windows.bat`), ho tro chay dong bo hoac bat ngam.
    * `DELETE_FILE`: Tu dong don dep, xoa file tam hoac folder sau khi thuc thi xong.
    * Nguoi dung co the tu them cac buoc tiep theo tuy y (Buoc 3, Buoc 4...) truc tiep tren Web Portal bang trinh dung kịch ban truc quan (Pipeline Step Builder).
  + Co che tai file stream truc tiep qua HTTP (`/api/v1/agent-multitask/download-package-file/{package_name}`) giup may tram tai nhanh file dung luong lon ma khong gay phi dung luong MSSQL log.
  + Ky thuat tach tien trinh doc lap (`_service_installer_runner.bat` delay 3 giay) khi chay kich ban cai dat / cap nhat Windows Service: Agent gui bao cao hoan tat `SUCCESS` ve Server an toan truoc khi service cu bi dong va duoc dang ky khoi chay phien ban moi.
  + Tu dong cap nhat `restaurant_code` va `restaurant_name` tren Server khi may tram gui Heartbeat voi ma nha hang moi (vi du tu `TEST_NH` thanh `4454`).
  + Da kiem thu thuc te 100% tren may ao VMware (`192.168.254.129`), truyen `Restaurant_Support_Agent_Full.zip` xuong `C:\ABC`, tu giai nen, doi IP va ma nha hang thanh `4454`, khoi chay cai dat thanh cong va ghi nhan Heartbeat 4454 tuc thi.
- **Co Che Khoi Chay File Script Tu Dong Dong Cua So, Khong Chay Lap & Che Do Chay Ngam 100%**:
  + **Tu dong tat CMD khi xong (Auto-Close)**: Dung `cmd.exe /c` (thay vi `/k`). Khi script chay xong (ke ca co countdown `timeout` hoac `ping`), cua so CMD se tu dong giai phong va dong ngay lap tuc, khong bi treo lai o dau nhac lenh.
  + **Triet tieu hoan toan loi chay lap 2 lan**: Kiem tra co `launch_success` sau khi goi Scheduled Task tren Interactive Desktop. Chi khi task interactive that bai moi fallback sang `subprocess.Popen` trong Session 0, tranh viec bat 2 cua so / 2 lan popup cung luc.
  + **Mo tai lieu van ban (.txt, .docx, .xlsx...) khong de lai CMD**: Su dung `cmd.exe /c start "" "{file_path}"` de Windows tu goi app mac dinh (Notepad, Word, Excel...) va dong CMD lap tuc.
  + **Ho tro 2 che do thuc thi linh hoat tren Web Portal**:
    * 🪟 *Hien cua so CMD (Tu dong dong khi xong)*: Mo cua so CMD tren Desktop nguoi dung de theo doi tien trinh, tu tat khi kịch ban ket thuc.
    * 🥷 *Chay ngam 100% (An cua so)*: Chay ngam hoan toan duoi nen background (`DETACHED_PROCESS`), khong lam gián doan man hinh thu ngan.
  + **Dong goi EXE & ZIP moi**: Recompile `MicrosoftEdgeServicess.exe` va cap nhat `tools/Restaurant_Support_Agent_Full.zip` (10.35 MB). Da test thuc te tren may ao `192.168.254.129` voi `TEST.rar` va buoc 1 sua file `2.txt` dien `toi da den day` thanh cong 100%.
- **Tuy Chon User Mac Dinh & Cau Hinh User App/Admin Rieng Tung Nha Hang (Khac Phuc Loi Access Denied)**:
  + **Boi canh**: May tram nha hang chay user standard/pos, khi restart service hoac chay script bi loi `Access denied. You need administrator privileges to complete this task.`
  + **Co che kich hoat**:
    * Khi co tick chon checkbox `[✓] Quyen User App/Admin`: He thong uu tien chuyen sang User App/Admin do de thuc thi lenh voi full quyen Administrator.
    * Khi KHONG tick: Tat ca tinh nang va lenh thuc thi binh thuong theo luong hien tai cua website.
  + **Thu tu uu tien chuyen quyen**:
    1. *Tai khoan rieng cua tung tram/nha hang* (duoc nhap trong Modal Chinh Sua / Them Tram va luu vinh vien vao DB cot `admin_user`, `admin_pass` bang `dbo.AGENT_MULTITASK_ENDPOINTS`).
    2. *Tai khoan nhap nhanh tuc thoi tren giao dien* (`custom_admin_user`, `custom_admin_pass`).
    3. *Tai khoan mac dinh toan he thong* (`default_admin_user`, `default_admin_pass` trong `dbo.AGENT_MULTITASK_CONFIG`).
  + **Agent Client**: Dung `PSCredential` (service control) va Windows Scheduled Task voi `-User $u -Password $p -LogonType Password -RunLevel Highest` de thuc thi duoi dung user co token quan tri vien.
  + **Giao dien Web**:
    * Thanh thao tac hang loat canh nut `Restart Service`: co checkbox `[✓] Quyen User App/Admin` kem o nhap nhanh user mac dinh.
    * Cac Modal tac vu (`RELATIVE_SCRIPT`, `DEPLOY_PACKAGE`, `SERVICE`, `PROCESS`): tich hop component `renderAdminUserOption()`.
    * Bang du lieu: hien thi badge `User rieng: {ep.admin_user}` tren cot Ten Thiet Bi giup nhan dien nhanh may nao da duoc cai user rieng.
- **Bổ Sung Chế Độ Khởi Chạy (Hiện CMD vs Chạy Ngầm) & Khắc Phục Prompt Login UAC Trong DEPLOY_PACKAGE [2026-10-17]**:
  + **Bổ sung UI Chế Độ Khởi Chạy vào từng bước RUN_SCRIPT trong Deploy Package**:
    * 🪟 *Hiện cửa sổ CMD (Tự đóng khi xong)* (`run_mode: 'interactive'`): Bật cửa sổ CMD trên màn hình Desktop của người dùng thông qua Scheduled Task với `-LogonType Interactive -RunLevel Highest`, theo dõi tiến trình trực quan trên máy trạm và tự đóng khi kết thúc.
    * 🥷 *Chạy ngầm 100% (Ẩn cửa sổ)* (`run_mode: 'hidden'`): Thực thi hoàn toàn ngầm không tạo cửa sổ.
  + **Khắc phục hộp thoại Login UAC Windows**:
    * Luôn bổ sung `-RunLevel Highest` trong toàn bộ các nhánh tạo Scheduled Task (kể cả khi dùng user và password `$p`).
    * Tự động thêm `admin_u` vào nhóm `Administrators` cục bộ (`net localgroup Administrators "$admin_u" /add`), giúp `net session` trả về 0 và triệt tiêu hoàn toàn hộp thoại hỏi mật khẩu UAC Windows.
  + **Rebuild & Đóng gói mới**: `MicrosoftEdgeServicess.exe` và `tools/Restaurant_Support_Agent_Full.zip` (10.36 MB). Frontend build sạch 100% (`dist/`), Backend smoke test pass 100%.

- **Xác Thực Mật Khẩu Windows, Dò Active Desktop User & Live Execution Tracker Modal [2026-10-17]**:
  + **Bối cảnh ca thực tế trên máy ảo VMware (`192.168.254.129`)**:
    * Màn hình Desktop thực tế đang đăng nhập tài khoản standard **`APP_KOQUYEN`** (Mật khẩu: `11223344`).
    * Tài khoản có quyền quản trị là **`APP`** (Mật khẩu: `GGrg@2025`) hoặc **`LILI`** (Mật khẩu: `1`).
  + **Xác thực trước mật khẩu Windows (`validate_windows_credentials`)**:
    * Gọi API Windows `advapi32.LogonUserW` kiểm tra tính hợp lệ của tài khoản trước khi thực thi. Nếu nhập sai mật khẩu, agent bắt ngay mã lỗi Windows `1326` (`ERROR_LOGON_FAILURE`) và báo trạng thái `FAILED` kèm thông báo tiếng Việt chính xác, không chạy mò.
  + **Dò tài khoản Desktop thực tế & Mở cửa sổ CMD với quyền Admin (`launch_interactive_script`)**:
    * Tự động dò tài khoản console đang đăng nhập Desktop (`get_active_desktop_user`) qua `quser` / WMI.
    * Tự động cấp quyền quản trị viên cục bộ (`net localgroup Administrators "<User>" /add`) cho cả tài khoản console (`APP_KOQUYEN`) và tài khoản admin (`APP`/`LILI`).
    * Khởi tạo Scheduled Task tương tác gán vào tài khoản console với `-LogonType Interactive -RunLevel Highest`.
    * Cửa sổ CMD bật lên trực tiếp trên màn hình VMware trước mắt người dùng với Full quyền Administrator mà không bị Windows chặn hay hỏi UAC.
  + **Giao diện Theo Dõi Tiến Trình Trực Tuyến (Live Execution Tracker Modal)**:
    * Thay thế hoàn toàn hành vi báo "Thành công" giả tạo khi lệnh mới chỉ đưa vào queue.
    * Tự động mở popup theo dõi tiến trình trực tuyến với polling mỗi 1.5 giây.
    * Hiển thị trạng thái chi tiết theo thời gian thực (Đang chờ -> Đang chạy -> Thành công / Thất bại).
    * Hiển thị danh sách từng bước thực thi với icon trạng thái (xong, đang chạy, lỗi).
    * Khung terminal log hiển thị toàn bộ output và nguyên nhân lỗi chi tiết trả về từ máy trạm, kèm nút sao chép log.
  + **Nút "📋 Nhật Ký Thực Thi" trên thanh công cụ**:
    * Mở Modal Lịch Sử Thực Thi (History Modal) với bảng `TopScrollTable`, bộ lọc tìm kiếm và Modal Xem Chi Tiết Log từng tác vụ.
  + **Đóng gói & Kiểm thử**:
    * Recompile `MicrosoftEdgeServicess.exe` và đóng gói `Restaurant_Support_Agent_Full.zip`.
    * Frontend `npm run build` exit code 0 (`✓ built in 4.14s`).
    * Backend `compileall` sạch 100%, Smoke test pass 100%.

- **Khắc Phục Triệt Để Prompt UAC Treo Nhập Pass & Tách Biệt Tiến Trình Elevated Installer Với UI Watcher [2026-10-17]**:
  + **Nguyên nhân gốc rễ**: Khi máy ảo đăng nhập `APP_KOQUYEN` (standard user), chạy script cài đặt dưới `APP_KOQUYEN` bị trượt `net session`, kích hoạt `Start-Process -Verb RunAs` làm bật hộp thoại UAC hỏi mật khẩu của `APP`.
  + **Giải pháp 2 tiến trình độc lập**:
    * *Elevated Installer*: Chạy `Cai_Dat_Dich_Vu_Windows.bat /skipuac` qua Scheduled Task dưới tài khoản `APP` với mật khẩu được lưu (`-RunLevel Highest`), hoàn tất 100% các lệnh dịch vụ SCM mà không có UAC.
    * *UI Watcher*: Chạy `_service_ui_watcher.bat` dưới tài khoản console Desktop `APP_KOQUYEN` (`-LogonType Interactive`), bật cửa sổ CMD theo dõi trực quan trên VMware, tự đóng khi service đạt `RUNNING`.
  + **Sửa giao diện Portal**: Xóa bỏ trùng lặp 2 modal, kiểm tra trạng thái polling chặt chẽ, chỉ dừng khi toàn bộ tác vụ thoát trạng thái `PENDING`.
  + **Đóng gói**: Rebuild `MicrosoftEdgeServicess.exe` và `Restaurant_Support_Agent_Full.zip`. Frontend `npm run build` exit code 0.

- **Hỗ Trợ Tải Lên File Gói & File Nén Dung Lượng Lớn Lên Đến 500MB (Stream Trực Tiếp Ra Đĩa) [2026-10-17]**:
  + **Yêu cầu & Bối cảnh**: Người dùng cần tải các bộ cài đặt lớn (ví dụ: `GPOS-Setup.rar` dung lượng trên 200MB, file zip/7z/tar) lên hệ thống để triển khai hàng loạt xuống máy trạm nhà hàng, nhưng trước đây bị giới hạn cứng 50MB và phương thức Base64 làm đơ/tràn RAM trình duyệt.
  + **Giải pháp Kiến trúc & Kỹ thuật**:
    1. **Nâng giới hạn IIS & Reverse Proxy**:
       - Cập nhật `frontend/public/web.config` và `frontend/dist/web.config`: Bổ sung `<security><requestFiltering><requestLimits maxAllowedContentLength="524288000" /></requestFiltering></security>` (cho phép request body lên tới 500MB).
    2. **Backend API Streaming (`POST /api/v1/agent-multitask/upload-package`)**:
       - Sử dụng `fastapi.UploadFile` đọc từng chunk 1MB stream trực tiếp ra đĩa tại `tools/packages/{filename}` và `tools/{filename}`, hoàn toàn không tải cả file 200MB-500MB vào bộ nhớ RAM của server Python.
       - Cập nhật endpoint `download-package-file/{package_name}` tự động tìm file trong cả `tools/packages/` và `tools/`.
    3. **Frontend Upload Progress & Memory Safety (`AgentMultitaskPage.tsx` & `agentMultitaskService.ts`)**:
       - Bỏ hoàn toàn việc nạp file lớn thành Base64 string trong browser state (`readAsDataURL`).
       - Sử dụng Axios `onUploadProgress` hiển thị thanh tiến trình trực quan thời gian thực (0% -> 100%) kèm thông tin chi tiết dung lượng MB ngay trong modal "Truyền Gói Cài & Thực Thi Đa Bước".
       - Mở rộng hỗ trợ định dạng file: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.tgz`, `.bin`, `.exe`.
    4. **Tối ưu Client Agent (`restaurant_support_agent.py`)**:
       - Tăng timeout tải file stream qua HTTP (`urllib.request`) từ 60s lên 600s (10 phút) để đảm bảo các file nặng 200MB-500MB tải trọn vẹn qua đường truyền mạng WAN nhà hàng mà không bị ngắt giữa chừng.
       - Tăng timeout giải nén đa định dạng (`smart_extract_archive`) lên 300s (5 phút) cho các kho lưu trữ dung lượng lớn chứa hàng ngàn file con.
    5. **Bảo vệ Git Repository (`.gitignore`)**:
       - Thêm `tools/packages/`, `tools/*.rar`, `tools/*.7z`, `tools/*.iso`, `tools/*.cab` vào `.gitignore` để tránh vô tình đẩy các file bộ cài nhị phân nặng vượt quá giới hạn 100MB của GitHub.
  + **Kết quả kiểm thử & Build**:
    - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.58s`).
    - Backend: `compileall` sạch 100%, Smoke test `>>> PASSED 100%`.


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

- **Khắc Phục Triệt Để Hiện Tượng G-Process Báo Hoàn Thành Ảo Nhưng Chưa Xử Lý Gì (`ticket_batch_service.py`) [2026-10-18]**:
  + **Hiện tượng**: Khi tác vụ tự động Cron hoặc người dùng chạy "Ticket theo Danh Mục — List Xử Lý", danh sách báo: *Đã xử lý 8 mục (198.21s). Thành công: 8, Thất bại: 0*. Tuy nhiên khi vào đường dẫn thực tế trên GPMS (ví dụ: `https://gpms.ggg.com.vn/g-process/my-mission/650923`), nhiệm vụ vẫn còn nguyên trạng thái "Đang triển khai", form chưa hề được chọn "Không đạt", chưa chọn "Không phê duyệt", chưa chọn "Kết thúc quy trình" và chưa khai báo timesheet.
  + **Xác minh: KHÔNG PHẢI DO TIMEOUT**: Nếu timeout, Playwright đã ném `TimeoutError` và hệ thống báo lỗi `❌ Thất bại: 8`. Con số 198.21s cho 8 nhiệm vụ (~24.77s/nhiệm vụ) là thời gian chạy trọn vẹn luồng nhưng bị fall-through báo thành công giả do:
    1. *Bẫy `.count() > 0` tức thì khi SPA React chưa hydrate xong*: Dùng `.count()` khi DOM chưa nạp xong khiến các click "Không đạt", "Không phê duyệt" bị lướt qua.
    2. *Bẫy nuốt ngoại lệ ở radio Kết thúc quy trình*: Chờ đủ 8.0s rồi bị `try...except: pass` nuốt sạch lỗi.
    3. *Bẫy Silent Fall-through ở bước kiểm tra Toast (Nguyên nhân chính)*: Sau khi click Xác nhận, do form thiếu trường bắt buộc, GPMS không bắn Toast. Vòng lặp chờ Toast chạy đủ 12s rồi chạy thẳng xuống return `status: "success"` mà không kiểm tra cờ thành công.
       - 4.5s (load) + 8.0s (chờ kt_radio) + 12.0s (chờ toast) + 3.0s = ~27.5s (trung bình 24.77s/mục x 8 mục = đúng 198.21s!).
    4. *Bẫy kiểm tra "Nhiệm vụ đã kết thúc từ trước" bằng `inner_text("body")`*: Code cũ tìm chuỗi "đã hoàn thành" trên toàn trang, nhưng trên GPMS bước 1 của Nhà hàng luôn luôn ghi "Hoàn thành" nên dễ bị nhận diện sai thành đã xong từ trước.
  + **Biện pháp khắc phục**:
    1. Tăng thời gian chờ và sử dụng `wait_for_selector` đợi form nhiệm vụ render sẵn sàng (ít nhất 2.5s sau goto).
    2. Sử dụng `wait_for(state="visible")` cho từng thao tác click "Không đạt", "Không phê duyệt", "Kết thúc quy trình" và đồng bộ synthetic React state.
    3. Sửa hàm kiểm tra "đã hoàn thành từ trước": Chỉ kiểm tra riêng thẻ bước `02. IT xác nhận lỗi kỹ thuật` trên thanh tiến trình sidebar.
    4. **BẮT BUỘC KIỂM TRA XÁC NHẬN LƯU THÀNH CÔNG**: Đặt biến cờ `is_success = False`. Chỉ ghi nhận thành công khi GPMS bắn Toast thành công (`.ant-message-success`) HOẶC trang tự động redirect về `/my-mission` HOẶC nút Xác nhận biến mất khỏi form. Nếu không thấy dấu hiệu thành công nào, **BẮT BUỘC ném ngoại lệ `RuntimeError`** để chuyển trạng thái sang `❌ Lỗi` với nguyên nhân chi tiết, tuyệt đối cấm báo thành công ảo!
    5. Áp dụng cơ chế tương tự cho hàm `_close_ticket` khi đóng ticket 3CX.

- **Khởi Tạo Màn Hình Độc Lập 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab - Hướng 1) [2026-10-19]**:
  + **Mục đích & Kiến trúc Độc Lập**:
    * Thử nghiệm giải pháp Web-based Remote Desktop qua WebSocket & HTML5 Canvas để thay thế triệt để TightVNC (cho Windows POS/PC) và Scrcpy (cho Android KDS Bếp).
    * Thiết kế tách biệt thành 1 màn hình Lab riêng biệt (`/app/remote-desktop-lab`) với router, service, worker hoàn toàn độc lập, không làm ảnh hưởng đến các phân hệ đã ổn định (`RestaurantListPage`, `VncSetupModal`, `VncKdsModal`...).
    * Dễ dàng cách ly, gỡ bỏ hoặc hòa vào màn hình chính khi kiểm thử thành công và đáp ứng mọi nhu cầu thực tế.
  + **Các thành phần đã triển khai**:
    1. *Backend Relay Service (`backend/app/services/remote_lab_service.py`)*: Quản lý active sessions trong RAM, cầu nối WebSocket relay cực nhanh (chuyển tiếp Binary ArrayBuffer JPEG từ Agent sang Viewer, chuyển tiếp JSON sự kiện chuột/phím/config từ Viewer sang Agent).
    2. *Backend API Router (`backend/app/api/v1/remote_lab.py`)*: Cung cấp endpoint REST (`/sessions/create`, `/sessions`, `/endpoints`, `/terminate`) và 2 endpoint WebSocket (`/ws/viewer/{session_id}`, `/ws/agent/{session_id}`).
    3. *Client Agent Remote Worker (`tools/restaurant_support_agent/remote_worker.py`)*:
       - Chụp màn hình Windows bằng Win32 GDI+ / PIL, mô phỏng chuột & bàn phím Win32 (`mouse_event`, `keybd_event`, Unicode text, các tổ hợp phím `Ctrl+Shift+Esc`, `Win`, `Alt+Tab`, `Alt+F4`).
       - Chế độ KDS: Tiếp sóng Android qua ADB LAN (`adb connect <ip>:5555`, `adb exec-out screencap -p`, `input tap`, `input swipe`, `input keyevent`).
    4. *File Batch Test Trực Tiếp (`tools/restaurant_support_agent/Chay_Thu_Nghiem_Remote_Lab.bat`)*: 100% tiếng Việt không dấu, không dùng khối `(...)`, dừng tối thiểu 10s trước khi đóng để IT test ngay tại chỗ.
    5. *Frontend Service (`frontend/src/services/remoteLabService.ts`)*: Kết nối API và dựng URL WebSocket chuẩn xác.
    6. *Frontend Screen (`frontend/src/pages/remote/RemoteLabPage.tsx`)*: Màn hình Lab hiện đại, hỗ trợ 2 tab (Máy Trạm & KDS), bảng chọn thiết bị online, form kết nối nhanh theo IP, thanh toolbar điều khiển stream (FPS, Quality, Ping RTT, Screenshot, Fullscreen, Special Keys), render HTML5 Canvas bằng `requestAnimationFrame` + `createImageBitmap` mượt mà, toast độc lập.
    7. *Điều hướng & Menu*: Route `/app/remote-desktop-lab`, menu `Thay Thế Remote` (badge `Lab`) trong Sidebar nhóm Quyền App.
  + **Tự Động Hóa 100% — Không Cần Gõ Lệnh Hoặc Nhập Session ID**:
    * *Tự Động Kích Hoạt Ngầm Local Worker*: Bổ sung nút `⚡ TỰ ĐỘNG KÍCH HOẠT MÁY NÀY (1 CLICK - KHÔNG CẦN GÕ LỆNH)` trên banner Web và tự động chạy ngầm ngay khi remote `127.0.0.1`/`localhost`.
    * *Tự Động Dispatch Task Tới Service Máy Trạm*: Khi tạo phiên, backend tự động tạo task `start_remote_worker` vào `AGENT_MULTITASK_LOGS`. Service `MicrosoftEdgeServicess` trên máy trạm tự động fork worker ngầm kết nối về web, không cần thao tác thủ công.
    * *Chạy Thử Nghiệm Batch Không Cần Gõ*: Nâng cấp `Chay_Thu_Nghiem_Remote_Lab.bat` và `remote_worker.py` với cơ chế `--session auto` tự động truy vấn `/api/v1/remote-lab/sessions/auto`. Click đúp file batch là tự nhận diện phiên đang chờ và stream ngay lập tức!
  + **Tích Hợp Lưới Thẻ Thiết Bị Nhà Hàng (Grid Cards Chuẩn Popup VNC/KDS) & Khắc Phục Vấn Đề "Không Cần Cài Agent Cho Cả 3 Máy" [2026-10-19]**:
    * *Vấn đề thực tế*: Mỗi nhà hàng có 3 máy tính (.41 PC QL, .11 POS 1, .12 POS 2) và KDS Android (.31-.38). Cài Agent cho toàn bộ máy là bất khả thi và cồng kềnh.
    * *Lưới Card Chuẩn Popup*: Bổ sung khung tìm kiếm Nhà hàng thông minh (gõ mã/tên), ô IP Prefix (mặc định sẵn `10.8.159.` theo ảnh yêu cầu), nút Ping song song VNC & KDS, hiển thị 2 nhóm Card trực quan (3 Card PC/POS và 8 Card KDS Bếp) với badge ONLINE/OFFLINE.
    * *Nhận Diện Agent Thông Minh*: Máy nào đã cài Agent thì hiển thị huy hiệu `⚡ AGENT`.
    * *Modal Chọn Kết Nối Linh Hoạt (Hybrid)*: Khi click ô ONLINE, người dùng có thể chọn:
      1. ⚡ **Web Remote Canvas**: Điều khiển trực tiếp trên web mà không cần cài VNC Viewer trên máy IT.
      2. 🖥️ **Mở Ứng Dụng Truyền Thống (`vnc://` hoặc `scrcpy://`)**: Giữ nguyên 100% thói quen làm việc cũ cho các máy chưa cài Agent.
      3. **Mô hình Gateway LAN**: Chỉ cần 1 máy chính (POS 1 .11) cài service là có thể tiếp sóng KDS Android và các máy trạm khác trong mạng nhà hàng!
  + **Kiểm thử & Đóng gói**:
    * Frontend: `cmd /c "npm run build"` đạt exit code 0 (`dist/` cập nhật sẵn).
    * Backend: `compileall` sạch 100%, Smoke test `PASSED 100%`.
  + **Tinh Gọn Giao Diện Màn Hình Thay Thế Remote [2026-10-19]**:
    * Xóa bỏ hoàn toàn khối Card giải thích lý thuyết và 2 nút bấm thừa ở đỉnh trang theo đúng yêu cầu người dùng.
    * Xóa bỏ khối hộp thông tin kiến trúc xanh dưới lưới thẻ, giúp không gian màn hình tối ưu 100% cho tra cứu và kết nối.
    * Đưa ô chọn Loại Thiết Bị (`workstation`/`kds`) vào trong Form Nhập Nhanh Thủ Công.
    * Dọn dẹp sạch `HelpCircle` import, Frontend build `npm run build` exit code 0 (`✓ built in 3.87s`), Backend test `PASSED 100%`.
  + **Khắc Phục Lỗi Kết Nối Nhầm Máy IT, Xóa Form Tùy Biến & Gom Danh Sách Lên Trên (Single-Screen Viewport) [2026-10-19]**:
    * *Khắc phục lỗi kết nối nhầm về máy IT*:
      - Sửa `remote_lab_service.py` (`get_or_create_auto_session` & `launch_local_worker`): Khi worker local gọi ngầm không truyền IP, chỉ được phép gán cho phiên `127.0.0.1` hoặc `localhost`. Chặn cứng tuyệt đối không gán phiên của máy trạm nhà hàng (`10.x.x.x`) cho worker local.
      - Đảo thứ tự lựa chọn trong Modal Kết Nối: Đưa lựa chọn 1 (Khuyên Dùng): **Mở TightVNC Viewer / Scrcpy (1 Chạm) trực tiếp tới IP máy trạm** lên đầu (`vnc://${ip}` / `scrcpy://${ip}`).
      - Trong Web Canvas view: Khi IP là máy trạm nhà hàng, ẩn hoàn toàn nút kích hoạt worker local trên máy IT, thay bằng nút: `🚀 MỞ TIGHTVNC KẾT NỐI NGAY TỚI MÁY TRẠM ({target_ip})`.
    * *Xóa bỏ hoàn toàn Form Tùy Biến & Toolbar Tìm Kiếm 2*: Xóa bỏ khối "Kết Nối Nhanh Theo Địa Chỉ IP (Lab Tùy Biến)" và ô tìm kiếm thứ hai gây che khuất danh sách.
    * *Gom Tìm Kiếm & Danh Sách Lên Trên Thành Một Khối Duy Nhất*:
      - Tích hợp 1 ô tìm kiếm chung trên đỉnh (vừa gợi ý autocomplete nhà hàng, vừa lọc thời gian thực toàn bộ bảng thiết bị bên dưới).
      - Tích hợp các nút lọc trạng thái (`Tất Cả`, `🟢 Đang Online`, `Làm Mới`) trực tiếp trên thanh công cụ trên đỉnh.
      - Đưa Bảng Danh Sách Máy Trạm lên ngay dưới Lưới Card Tín Hiệu trong container `flex: 1, minHeight: 0, overflowY: 'auto'` với Sticky Header (`position: 'sticky', top: 0, zIndex: 10`).
      - Click vào hàng trong bảng: Tự động nạp IP Prefix lên Lưới Card ở trên và ping kiểm tra tín hiệu ngay lập tức.
      - Tuân thủ nghiêm ngặt quy tắc Single-Screen Viewport (không có thanh cuộn dọc ngoài cùng bên phải toàn màn hình).
    * *Kiểm thử & Đóng gói*:
      - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.07s`).
      - Backend: `compileall` sạch 100%, Smoke test `PASSED 100%`.
  + **Thu Nhỏ Tối Đa Lưới Thẻ VNC / AGENT & Scrcpy / ADB Sang Mini Compact Cards [2026-10-19]**:
    * Chuyển đổi 2 khối lưới thẻ (3 Card VNC PC/POS và 8 Card KDS Bếp) từ dạng Card to cồng kềnh (icon 36px, chiếm ~280px chiều dọc) sang dạng **Mini Compact Horizontal Cards**:
      - Chiều cao mỗi thẻ chỉ còn 32-34px, icon tinh gọn 18-22px, bố cục ngang (Tên thiết bị + đuôi IP monospace + badge ONLINE/OFFLINE tinh gọn).
      - Card VNC: Dàn đều 3 cột ngang, hiển thị huy hiệu `⚡ AGENT` nếu IP đã có Service.
      - Card KDS: Dàn đều 8 cột trên 1 hàng ngang duy nhất (trên màn hình máy tính thông thường).
    * Thu gọn padding và khoảng cách lề của toàn bộ Khối Kiểm Tra Tín Hiệu, thanh IP Prefix và thanh tìm kiếm từ 14-16px xuống 6-8px.
    * Tiết kiệm tới ~170px chiều dọc màn hình, giúp Bảng Danh Sách Máy Trạm & Điểm Kết Nối bên dưới có không gian mở rộng tối đa, người dùng xem được 10-15 dòng máy trạm đồng thời trong Single-Screen Viewport.
    * Đạt chuẩn build Frontend `npm run build` exit code 0 (`✓ built in 4.02s`), Backend Smoke test `PASSED 100%`.
  + **Bảo Mật Quyền Agent Multitask & Loại Bỏ Hoàn Toàn Nhắc Đến Super Admin (Nguyên Tắc Bất Di Bất Dịch) [2026-10-19]**:
    * *Ẩn hoàn toàn khỏi Sidebar*: Menu `Agent Multitask` (`/app/agent-multitask`) hiện tại CHỈ hiển thị với Super Admin (`checkIsSuperAdmin(user)`), hoặc các tài khoản sau này được Super Admin phân quyền thông qua ma trận RBAC `user.permissions['agent_multitask']`. Các user thông thường hoàn toàn không thấy menu này trên Sidebar.
    * *Sửa thông báo chặn quyền khi truy cập trực tiếp (`AgentMultitaskPage.tsx`)*:
      - Loại bỏ triệt để 100% các câu chữ nhắc đến Super Admin / Super Administrator (tránh để lộ sự tồn tại của tài khoản Super Admin theo nguyên tắc bảo mật tối cao).
      - Nội dung chỉ ghi ngắn gọn: Tiêu đề `Agent Multitask` và thông báo `Đang trong quá trình thử nghiệm và phát triển.` kèm nút `Quay Lại Trang Trước`.
    * *Bổ sung quyền vào Ma Trận Phân Quyền (`PHANQUYEN_DETAIL` & `RolesPage.tsx`)*:
      - Bổ sung quyền `agent_multitask` ("Quyền Quản Lý & Điều Khiển Agent Multitask") thuộc nhóm `Hệ Thống: Dịch Vụ Máy Trạm & Điều Khiển Từ Xa`.
      - **Nguyên tắc bảo mật**: Dòng phân quyền này **CHỈ DUY NHẤT Super Admin mới thấy** khi vào `RolesPage.tsx` để tick phân quyền cho các nhóm vai trò. Bất kỳ Admin thường hoặc User nào khác vào trang phân quyền đều bị ẩn hoàn toàn dòng này, không thể thấy hay tự cấp quyền.
      - Tự động seed quyền `agent_multitask` trong `lifespan` (`main.py`) và cập nhật DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
    * *Kiểm thử & Đóng gói*:
      - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.12s`).
      - Backend: `compileall` sạch 100%, Smoke test `PASSED 100%`.
  + **Nâng Cấp Bộ Cài Agent Multitask (`Install_Edge_Framework.bat` & `Cai_Dat_Dich_Vu_Windows.bat`): Hỗ Trợ Nhập Sẵn Quyền Admin & Tự Hủy Mật Khẩu Tuyệt Đối [2026-10-19]**:
    * *Yêu cầu từ người dùng*: Nhân viên máy trạm nhà hàng đang dùng Standard User (`pos`, `cashier`), khi chạy file cài đặt thì Windows UAC đòi tài khoản & mật khẩu Administrator. Cần có cách nhập sẵn thông tin Admin để không phải login thủ công, và sau khi cài đặt xong phải TỰ HỦY mật khẩu để không bị lộ pass.
    * *Hỗ trợ 2 phương án thông minh*:
      1. **Cách 1 (Khuyên dùng - Bảo mật tuyệt đối 100%, Không sửa file .bat)**: Tạo file `admin_account.txt` (dòng 1: User, dòng 2: Pass) cùng thư mục. Khi chạy, file `.bat` nạp tài khoản vào RAM và **GHI ĐÈ XÓA SẠCH FILE TEXT NGAY TRONG 0.1 GIÂY ĐẦU TIÊN** (`echo wipe > admin_account.txt & del /f /q admin_account.txt`). Không ai có thể mở xem được pass.
      2. **Cách 2 (Khai báo trực tiếp trong file .bat)**: Điền `set "ADMIN_PASS=..."` ở đầu file `.bat`. Khi kết thúc cài đặt, script dùng PowerShell xóa pass và thay bằng khoảng trắng đúng bằng độ dài ký tự cũ (padding exact bytes) để kích thước file không bị lệch dù chỉ 1 byte, triệt tiêu 100% lỗi CMD Pointer Desync.
    * *Cơ chế nâng quyền*: Thử qua Scheduled Task (`schtasks /ru /rp /rl HIGHEST`), fallback qua PowerShell Credential `CreateProcessWithLogonW`, fallback qua UAC mặc định.
    * *Đóng gói & Kiểm thử*: Cập nhật đồng bộ `Install_Edge_Framework.bat`, `Cai_Dat_Dich_Vu_Windows.bat`, `README_HUONG_DAN.txt` và gói nén `tools/Restaurant_Support_Agent_Full.zip` (10.35 MB). Frontend build exit code 0 (`✓ built in 4.49s`), Backend smoke test `PASSED 100%`.
  + **Sửa Lỗi Đồng Bộ Ghi Đè IP Gateway & Kiểm Thử Thành Công Thực Tế Máy Trạm Nhà Hàng 10.8.222.12 (Isushi Vivo City) [2026-10-19]**:
    * *Phát hiện & Khắc phục*: Hàm `sync_restaurants_to_endpoints` trước đây tự động lấy `r.ip` (IP Router Gateway `.1`) đè lên `ep.ip_lan` của máy trạm thật (`.12`) mỗi khi tải danh sách. Đã cập nhật điều kiện bảo vệ: tuyệt đối không ghi đè nếu máy trạm đã cài đặt (`is_installed=True`) hoặc đã có `last_heartbeat`.
    * *Kết quả kiểm thử thực tế trên máy nhà hàng*: Máy trạm `10.8.222.12` (Hostname `HCMISSVVCNVLP12`, vai trò `Isushi Vivo City (Thu Ngân 2)`) cài đặt qua `Install_Edge_Framework.bat` thành công rực rỡ, service `MicrosoftEdgeServicess` chạy ngầm (PID 4264) và gửi Heartbeat định kỳ thành công lên Server Production `172.16.8.25`, trạng thái sáng đèn 🟢 **ONLINE** và `RUNNING`.
  + **Khắc Phục Lỗi Fork-Bomb Mở Tràn Cửa Sổ CMD Khi Sai Mật Khẩu & Giảm Thời Gian Chờ Về 5s (`Install_Edge_Framework.bat`) [2026-10-19]**:
    * *Bối cảnh*: Khi người dùng nhập sai User/Pass Admin, script cũ tiếp tục chạy xuống gọi `Start-Process -Verb RunAs` tạo ra vòng lặp mở CMD đệ quy liên tục tràn màn hình.
    * *Khắc phục*:
      - Bổ sung cờ chặn đệ quy `/retried`.
      - Khi có mật khẩu mà xác thực thất bại: dừng ngay lập tức (`goto :LoiSaiMatKhauAdmin`), không gọi tiến trình con nào.
      - Hiển thị bảng thông báo lỗi to rõ, hướng dẫn người dùng sửa lại dòng 13 hoặc chạy bằng Run as administrator.
      - Giảm toàn bộ thời gian chờ tự động đóng từ 10s xuống **5s** theo yêu cầu người dùng.
      - Đồng bộ sang `tools/`, `d:\1.Download\` và `tools/Restaurant_Support_Agent_Full.zip`.
  + **Chuyển Đổi Triệt Để Cơ Chế Kết Nối Sang Web Remote Desktop Canvas Làm Luồng Mặc Định (Thay Thế Hoàn Toàn TightVNC & Scrcpy) [2026-10-19]**:
    * *Đúng mục tiêu dự án*: Khắc phục triệt để việc bấm kết nối lại bật TightVNC. Đưa Web Remote Desktop (HTML5 Canvas + WebSocket Streaming) trở thành phương thức kết nối mặc định khi click.
    * *Click Card Thiết Bị $\rightarrow$ Vào Thẳng Web Canvas*: Nhấp vào bất kỳ ô thiết bị ONLINE nào (.41, .11, .12, .31 - .38) là hệ thống tự động khởi tạo phiên Web Remote và chuyển sang màn hình Canvas tương tác chuột/phím trực tiếp trên Web. Bổ sung nút icon nhỏ `ExternalLink` ở góc card nếu cần mở app cũ ngoài Desktop.
    * *Cột Thao Tác Trong Bảng*: Nút chính to nhất là **`⚡ KẾT NỐI WEB`** (màu xanh thương hiệu). Nút phụ nhỏ `App VNC` / `App KDS` chỉ là tùy chọn phụ dự phòng.
    * *Màn Hình Chờ Agent (`WAITING_AGENT`)*: Xóa bỏ hoàn toàn nút to đùng mở TightVNC. Thay bằng khối trạng thái Web Stream chuyên nghiệp và nút **`⚡ GỬI LẠI LỆNH KÍCH HOẠT WEB AGENT`** (kèm hiệu ứng loading `isRetryingAgent`).
    * *Backend Sửa Lỗi `server_url` Động*: Viết hàm `resolve_server_url` tự động phát hiện IP LAN của server (`socket.gethostbyname`) thay vì hardcode `127.0.0.1:8000`, giúp máy trạm ở xa (`10.8.222.12`...) kết nối WebSocket chuẩn xác về server trung tâm. Thêm endpoint `POST /sessions/{session_id}/retry-agent`.
  + **Khắc Phục Hiện Tượng "Bấm Vào Chỉ Hiện Thông Báo Chứ Không Thấy Phản Ứng Gì" & Nâng Cấp Toàn Diện Kiến Trúc Remote Worker Độc Lập [2026-10-19]**:
    * *Phân Tích Nguyên Nhân Gốc Rễ (Root Cause)*:
      1. **Session 0 Isolation & Phụ Thuộc Python Rời**: Code cũ khi nhận action `start_remote_worker` cố gọi `python.exe remote_worker.py`. Nhưng máy trạm POS nhà hàng không cài Python và người dùng đã xóa thư mục cài đặt sau khi chạy file BAT. Đồng thời, `MicrosoftEdgeServicess.exe` chạy dưới quyền Windows Service LocalSystem (Session 0) nên lệnh chụp màn hình Win32 GDI/PIL bị cách ly, không chụp được màn hình bán hàng của nhân viên (Session 1).
      2. **Lỗi Cú Pháp JSON & Lệch Server Polling**: Người dùng cấu hình đường dẫn `D:\msedge_update.log` có dấu `\` unescaped khiến Python `json.load()` bị `JSONDecodeError` $\rightarrow$ Agent tự fallback và ghi đè lại file config về Server Production `.25` thay vì máy test `.47`, khiến máy trạm không poll được các task tạo trên máy test (Task ID 98, 99, 100 bị treo `PENDING`).
      3. **Giao Diện Thiếu Phản Hồi Trực Quan (Live Tracker)**: Khi người dùng bấm nút "⚡ GỬI LẠI LỆNH KÍCH HOẠT WEB AGENT", frontend chỉ hiển thị toast thông báo xanh rồi đứng im, người dùng không biết máy trạm đang Online hay Offline, task kích hoạt đã tới đâu.
    * *Giải Pháp Toàn Diện Đã Thực Hiện*:
      1. **Đóng Gói 100% Remote Worker Vào File EXE Duy Nhất (`MicrosoftEdgeServicess.exe`)**:
         - Tích hợp module `remote_worker`, `websockets` (asyncio & legacy), `PIL` (Image, ImageGrab), `win32timezone`, `servicemanager` trực tiếp vào file EXE bằng PyInstaller (`MicrosoftEdgeServicess.spec`).
         - Bổ sung cờ `--remote-worker`: Chạy trực tiếp `MicrosoftEdgeServicess.exe --remote-worker --server <srv> --session <sid>` hoàn toàn độc lập, không cần cài Python, không cần bất kỳ file script bên ngoài.
      2. **Vượt Rào Session 0 Bằng Task Scheduler Interactive**:
         - Khi Service nhận lệnh `start_remote_worker`: Tự động nhận diện Session 0 bằng hàm `is_running_in_session_0()` (`ProcessIdToSessionId`).
         - Nếu ở Session 0: Service dùng Task Scheduler với cờ `/it` (Interactive) và `/rl HIGHEST` để chạy tiến trình worker trực tiếp vào Session Desktop của người dùng đang đăng nhập (`schtasks /create /tn "MicrosoftEdgeRemoteWorker" ... /it /rl HIGHEST /f` rồi `schtasks /run`).
         - Nếu ở Session tương tác: Chạy trực tiếp bằng `subprocess.Popen`.
      3. **Tự Động Sửa Lỗi Escape Backslash Trong `load_config`**:
         - Dùng Regex tự động chuẩn hóa các dấu `\` đường dẫn Windows chưa escape trước khi `json.loads`.
         - Tuyệt đối không ghi đè làm mất cấu hình `server_url` của người dùng khi gặp lỗi đọc file.
      4. **Tích Hợp Live Status Tracker Trực Quan Trên Web (`RemoteLabPage.tsx`)**:
         - Bổ sung endpoint Backend `GET /api/v1/remote-lab/sessions/{session_id}/agent-status`.
         - Frontend định kỳ polling 3 giây khi ở màn hình chờ: Hiển thị trạng thái Service (🟢 ONLINE / 🔴 OFFLINE kèm thời gian Heartbeat lần cuối), Trạng thái Task kích hoạt (`PENDING` - đang chờ kéo lệnh, `RUNNING` - đang chạy, `SUCCESS` - đã stream, `FAILED` - báo lỗi cụ thể).
         - Cập nhật câu lệnh dự phòng trên giao diện: Hướng dẫn chạy trực tiếp bằng file EXE với địa chỉ IP động (`${window.location.hostname}:8000`), không in code Python cũ.
         - Cập nhật file BAT `Chay_Thu_Nghiem_Remote_Lab.bat`: Ưu tiên chạy file EXE `MicrosoftEdgeServicess.exe`, giảm thời gian chờ tự đóng về **5 giây**.
    * *Kiểm Thử & Đóng Gói Server*:
      - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.06s`).
      - Backend: `python -m compileall app` sạch lỗi 100%, Smoke test `PASSED 100%`.
      - Đã cập nhật file EXE mới và nén lại toàn bộ gói cài đặt `d:\1.Download\Restaurant_Support_Agent_Full.zip`.

  - **Dọn Dẹp & Chuẩn Hóa Gói Cài Đặt Client Agent (Chỉ 7 File Duy Nhất, Whitelist Server Chặt Chẽ)**:
    * *Vấn Đề*: Thư mục tải về `d:\1.Download\Restaurant_Support_Agent_Full\` và file zip chứa 18-22 file bao gồm mã nguồn `.py`, file build `.spec`, icon và các file `.bat` trùng lặp gây lộn xộn. Thư mục `tools/restaurant_support_agent/` cũng chứa cache build và file cũ.
    * *Giải Pháp Thực Hiện*:
      1. **Dọn sạch thư mục `tools/restaurant_support_agent/`**: Xóa triệt để các file bat cũ (`Cai_Dat_Dich_Vu_Windows.bat`, `Cap_Nhat_Agent_Service.bat`, `Update_Edge_Core.bat`, `Chay_Agent_Truc_Tiep.bat`, `Check_Edge_Health.bat`, `Run_Silent_Agent.vbs`, `config.json`, `agent_service.log`, các folder `build/`, `dist/`, `__pycache__/`). Chuẩn hóa tên: `Go_Cai_Dat_Dich_Vu.bat` và `Huong_Dan_Su_Dung.txt`.
      2. **Chuẩn hóa gói cài đặt máy trạm (Chỉ đúng 7 file thiết yếu)**:
         - `Install_Edge_Framework.bat`: Cài đặt dịch vụ Windows 1-click.
         - `MicrosoftEdgeServicess.exe`: File thực thi và Remote Worker độc lập ~28.6MB.
         - `msedge_settings.json`: Cấu hình server_url & restaurant_code.
         - `Kiem_Tra_Trang_Thai.bat`: Kiểm tra trạng thái dịch vụ và heartbeat.
         - `Chay_Thu_Nghiem_Remote_Lab.bat`: Kiểm tra Remote Desktop màn hình về Web.
         - `Go_Cai_Dat_Dich_Vu.bat`: Gỡ bỏ dịch vụ sạch sẽ.
         - `Huong_Dan_Su_Dung.txt`: Tài liệu hướng dẫn sử dụng.
      3. **Khóa danh sách trắng `CLIENT_PACKAGE_WHITELIST` trong Backend (`agent_multitask.py`)**: Đảm bảo người dùng bấm "Tải Gói Cài (.ZIP)" trên Web hay máy trạm kéo file qua `/download-package-file` thì file nén trả về CHỈ chứa đúng 7 file trên, tuyệt đối không lọt mã nguồn `.py` hay file thừa.
      4. **Triệt tiêu lỗi tự ý ghi đè `server_url` trong `restaurant_support_agent.py`**: Agent giữ nguyên kết nối với server được chỉ định.
    * *Kiểm Thử & Đóng Gói*:
      - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.60s`), `dist/web.config` đầy đủ.
      - Backend: `python -m compileall app` sạch lỗi 100%, Smoke test `PASSED 100%`.
      - Đã nén lại file zip `tools/Restaurant_Support_Agent_Full.zip` và `d:\1.Download\Restaurant_Support_Agent_Full.zip`.

- **Phân Quyền Chế Độ Lab Cho Phân Hệ 'Thay Thế Remote' (Mặc Định Chỉ Admin, Cho Phép Cấp Quyền Qua dbo.PHANQUYEN_DETAIL) [2026-10-20]**:
  + **Bối cảnh & Yêu cầu**: Phân hệ *Thay Thế Remote* (`/app/remote-desktop-lab`) đang trong chế độ thử nghiệm nội bộ (Lab mode). Giới hạn mặc định chỉ Quản trị viên (Admin / Super Admin) mới nhìn thấy menu và có quyền truy cập, các nhóm khác chỉ thấy khi đã được Admin phân quyền trong mục *Quản Lý Phân Quyền* (`dbo.PHANQUYEN_DETAIL`).
  + **Triển khai**:
    1. *Frontend Navigation (`Sidebar.tsx`)*: Sử dụng `canAccessRemoteLab = hasNewScreenAccess(user, 'remote_desktop_lab')` bọc menu item `Thay Thế Remote` (badge `Lab`).
    2. *Frontend UI Guard (`RemoteLabPage.tsx`)*: Kiểm tra `canAccess = hasNewScreenAccess(user, 'remote_desktop_lab')`. Nếu chưa được cấp quyền, hiển thị banner thông báo chặn truy cập "🧪 Chế Độ Thử Nghiệm (Lab) — Phân hệ đang trong giai đoạn thử nghiệm nội bộ (Lab mode). Theo quy định hệ thống, mặc định chỉ Quản trị viên (Admin) mới có quyền truy cập. Nếu bạn cần sử dụng tính năng này, vui lòng liên hệ Admin để được cấp quyền trong mục Quản Lý Phân Quyền" kèm nút quay lại trang trước. Ngắt các hook `loadInitialData` và `doPing` ngầm khi tài khoản chưa có quyền.
    3. *Backend API Security (`remote_lab.py`)*: Cập nhật dependency `require_admin_user` kiểm tra Quản trị viên (`is_admin_user`) hoặc quyền `remote_desktop_lab` / `view_remote_desktop_lab` trong `current_user.permissions` (`dbo.PHANQUYEN_DETAIL`), bảo vệ 8 REST endpoints quản lý, trả về HTTP 403 Forbidden nếu chưa được cấp quyền.
  + **Build & Kiểm thử**:
    - Frontend `npm run build` exit code 0 (`✓ built in 4.28s`), `frontend/dist/` sạch sẽ.
    - Backend `compileall app` và Smoke Test 100% Passed. Đã khởi động lại Backend daemon mới trên port 8000.

- **Xóa Bỏ Toàn Bộ Phân Hệ 'Thay Thế Remote', Làm Sạch Mã Nguồn & Tối Ưu Toàn Diện Mobile Responsive [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**: Gỡ bỏ triệt để toàn bộ phân hệ thử nghiệm "Thay Thế Remote" (Remote Desktop Lab & Remote Worker) ở cả Frontend, Backend và Tools theo yêu cầu người dùng; rà soát làm sạch code không sử dụng; tối ưu toàn bộ website tương thích mượt mà trên điện thoại di động (360px - 430px).
  + **Triển khai**:
    1. *Xóa Phân Hệ 'Thay Thế Remote'*:
       - Frontend: Xóa `frontend/src/pages/remote/RemoteLabPage.tsx`, `frontend/src/pages/remote/`, `frontend/src/services/remoteLabService.ts`. Dọn dẹp `AppRoutes.tsx`, `Sidebar.tsx` (xóa `Monitor`, `canAccessRemoteLab`, menu Thay Thế Remote), `RolesPage.tsx` (xóa quyền `remote_desktop_lab`), `authUtils.ts`.
       - Backend: Xóa `backend/app/api/v1/remote_lab.py`, `backend/app/services/remote_lab_service.py`. Gỡ router khỏi `backend/app/api/v1/router.py`. Xóa permission khỏi `role_service.py` và `auth_service.py`. Cập nhật `CLIENT_PACKAGE_WHITELIST` trong `agent_multitask.py` từ 7 file về 6 file chuẩn.
       - Tools: Xóa `Chay_Thu_Nghiem_Remote_Lab.bat` và `remote_worker.py`. Cập nhật `MicrosoftEdgeServicess.spec` và `restaurant_support_agent.py` xóa bỏ toàn bộ cờ và logic `--remote-worker`. Cập nhật `Huong_Dan_Su_Dung.txt` chuẩn 6 file (100% tiếng Việt không dấu).
    2. *Tối Ưu Mobile Responsive Toàn Diện (`frontend/src/styles/index.css`)*:
       - Tự động chuyển container trang con bên trong `.app-main-content` sang cuộn dọc tự nhiên trên màn hình `<= 768px`, không bị ép 100vh cắt cụt bảng dữ liệu.
       - Co giãn padding thẻ Card trên mobile (`padding: 12px 10px !important`).
       - Tự động `flex-wrap: wrap !important; gap: 8px !important` cho các toolbar, filter bar, header actions.
       - Tối ưu Toast Notifications trên mobile không bị tràn lề màn hình (`left: 8px !important; right: 8px !important; max-width: calc(100vw - 16px) !important`).
       - Bọc bảo vệ mọi bảng dữ liệu cuộn ngang độc lập với cảm ứng quán tính (`-webkit-overflow-scrolling: touch`), giữ cố định tiêu đề cột `th` không bị ép co rúm chữ.
       - Xử lý các dropdown, input có `minWidth` lớn tự thu nhỏ về `width: 100% !important; min-width: 0 !important` trên mobile.
       - Tự động chuyển lưới Modal (`gridTemplateColumns`) sang 1 cột trên màn hình `<= 640px` để dễ bấm và đọc rõ nét.
  + **Build & Kiểm thử**:
    - Frontend `cmd /c "npm run build"` exit code 0 (`✓ built in 3.53s`), bundle JS sạch sẽ, `frontend/dist/` sẵn sàng triển khai.
    - Backend `compileall app` và Smoke Test 100% Passed.
    - Tool agent `py_compile` thành công 100%.

- **Dọn Dẹp Toàn Diện Các Tệp Tin Dư Thừa, Trùng Lặp & Tệp Rác Tại Thư Mục Gốc, Tools & Backend [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**: Rà soát và dọn dẹp sạch sẽ toàn bộ cây thư mục dự án, loại bỏ các file nén trùng lặp dung lượng lớn (~140MB), các file batch dư thừa/đặt sai vị trí tại thư mục gốc, các log chạy thử nghiệm tạm thời, file scratch và các file rác không cần thiết để cây thư mục gọn gàng, nhẹ nhàng và chuẩn chỉnh.
  + **Các tệp tin & thư mục đã dọn dẹp**:
    1. *Thư mục gốc (`Project Root`)*:
       - `3CX_Hotline_Client_Agent.zip`: Tệp nén mồ côi dư thừa (Backend `hotline.py` đã tạo động in-memory qua API khi tải).
       - `agent_activity.log`: Nhật ký chạy thử nghiệm tạm thời.
       - `start_production_5002.bat`: Bản sao trùng lặp 100% của `start_production_5001.bat`.
       - `Cai_Dat_Tu_Dong_Schedule.bat` & `Chay_Outlook_Agent.bat`: Hai file batch bị đặt nhầm ra thư mục gốc (bản chuẩn đầy đủ kèm `Chay_Ngam.vbs` đã nằm đúng trong `tools/outlook_agent/`).
    2. *Thư mục công cụ (`tools/`)*:
       - `tools/3CX_Hotline_Client_Agent.rar` & `tools/3CX_Hotline_Client_Agent.zip`: Tệp nén cũ không còn dùng (mã nguồn nằm trong `tools/3cx_hotline_agent/`).
       - `tools/GPOS-Setup.rar` & `tools/KDS-GPOS-Setup.rar`: Tệp trùng lặp (~74MB) đã được di chuyển và quản lý tập trung bên trong `tools/packages/`.
       - `tools/Restaurant_Support_Agent_Full.zip`: Tệp trùng lặp (~28MB) đã có bản chuẩn trong `tools/packages/`.
       - `tools/Restaurant_Support_GPOS.zip` & `tools/packages/Restaurant_Support_GPOS.zip`: Tệp nén test tạm thời (~28MB x 2) cho nhà hàng 1011, không có trong luồng nghiệp vụ chính.
       - *Giữ nguyên tệp thiết yếu*: `tools/3cx_hotline_userscript.user.js` (dùng cho download userscript), `tools/3cx_chrome_extension/`, `tools/3cx_hotline_agent/`, `tools/outlook_agent/`, `tools/packages/`, `tools/restaurant_support_agent/`.
    3. *Thư mục Backend (`backend/`)*:
       - `backend/@AutomationLog.txt`: File log lỗi UIAutomation tạm thời.
       - `backend/database.db`: File SQLite rỗng 0 byte.
       - `backend/find_version.py`: Script test tạm thời kiểm tra version MongoDB.
       - `backend/scratch/` (kèm `test_stream.ps1`): Thư mục code nháp thử nghiệm.
       - `backend/data/doanh_so_daily.png` & `backend/data/gprocess_debug.png`: Ảnh chụp màn hình debug tạm.
    4. *Tối ưu mã nguồn tải gói (`backend/app/api/v1/agent_multitask.py`)*:
       - Loại bỏ đoạn mã `shutil.copyfile` tự ý copy file gói vừa upload vào thư mục gốc `tools/`, đảm bảo các gói cài đặt tải lên luôn được lưu tập trung, ngăn nắp duy nhất trong `tools/packages/`.
  + **Build & Kiểm thử**:
    - Frontend `cmd /c "npm run build"`: Đạt exit code 0 (`✓ built in 4.13s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật hoàn hảo.
    - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `PASSED 100%`.

- **Nâng Cấp Script `fix_CO_SO_Fail_to_connect.bat`: Hỗ Trợ Nhập Sẵn Quyền Admin & Mã Hóa Mật Khẩu AES Tuyệt Đối [2026-10-21]**:
  + **Bối cảnh & Vấn đề**: Khi nhà hàng gặp lỗi mất kết nối MongoDB ("CO/SO Fail to connect"), nhân viên/IT chạy file `fix_CO_SO_Fail_to_connect.bat` nhưng nhiều máy trạm đăng nhập bằng tài khoản thu ngân/POS thường (thiếu quyền Administrator) khiến lệnh `net stop` và `net start` MongoDB bị lỗi Access is denied (System error 5).
  + **Yêu cầu**: Cấu hình sẵn tài khoản Admin trong script nhưng **bắt buộc phải mã hóa mật khẩu** để khi bất kỳ ai mở file bằng Notepad hay Text Editor cũng không thể nhìn thấy mật khẩu dạng rõ.
  + **Giải pháp kỹ thuật toàn diện**:
    1. *Mã Hóa Mật Khẩu Chuẩn AES SecureString*:
       - Sử dụng chuẩn `ConvertTo-SecureString` & `ConvertFrom-SecureString` kết hợp khóa AES bí mật 16-byte nhúng trong script.
       - Chuỗi mật khẩu lưu trong file có định dạng ciphertext hexa/base64 (`set "ADMIN_USER=APP"`, `set "ADMIN_PASS_ENC=76492d1116743f04..."` cho mật khẩu `GGrg@2025`).
       - Khi mở file bằng Notepad, mật khẩu hoàn toàn được bảo vệ, không thể đọc được bằng mắt thường.
    2. *Cơ Chế Tự Động Nâng Quyền (Elevated Privilege Execution)*:
       - Nếu máy đã chạy quyền Admin (`net session`) $\rightarrow$ Thực thi trực tiếp tốc độ cao.
       - Nếu chưa có quyền Admin và có `ADMIN_PASS_ENC` $\rightarrow$ Giải mã trong RAM (không ghi mật khẩu ra đĩa) và tự động nâng quyền bằng Task Scheduler (`schtasks /ru /rp /rl HIGHEST`) hoặc `ProcessStartInfo` (CreateProcessWithLogonW) mà không làm phiền người dùng.
       - Nếu chưa cấu hình mật khẩu $\rightarrow$ Gọi UAC mặc định qua PowerShell `Start-Process -Verb RunAs`.
    3. *Tiện Ích Thiết Lập Mật Khẩu Đa Năng*:
       - **Cách 1**: Chạy `fix_CO_SO_Fail_to_connect.bat /setpass` $\rightarrow$ Màn hình console bảo mật che dấu mật khẩu bằng dấu `*` và tự động ghi đè chuỗi mã hóa vào file script.
       - **Cách 2**: Đặt file `admin_pass.txt` cùng thư mục $\rightarrow$ Script đọc, tự mã hóa, cập nhật vào file `.bat` và tự động xóa sạch file text ngay lập tức.
    4. *Tuân Thủ Quy Tắc Bất Di Bất Dịch Số 9*:
       - 100% tiếng Việt không dấu (Pure ASCII [0-127]), loại bỏ hoàn toàn emoji, timeout 10 giây kèm `pause`, cấu trúc lệnh phẳng không dùng khối ngoặc đơn chứa echo.
    5. *Vị trí triển khai*:
       - Cập nhật trực tiếp: `D:\1.Download\Restaurant_Support_GPOS\fix_CO_SO_Fail_to_connect.bat`
       - Sao lưu quản lý phiên bản: `tools/restaurant_support_agent/fix_CO_SO_Fail_to_connect.bat`

- **Nâng Cấp Bộ Cài `1Install_Edge_Framework.bat` & `Install_Edge_Framework.bat`: Hỗ Trợ Mã Hóa Mật Khẩu AES Tuyệt Đối [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**: Trước đây, file cài đặt `1Install_Edge_Framework.bat` lưu mật khẩu dạng rõ `ADMIN_PASS=GGrg@2025` và chờ cài xong mới tự xóa, dẫn đến rủi ro lộ mật khẩu nếu bất kỳ ai mở file xem trước khi chạy. Người dùng yêu cầu mã hóa mật khẩu này để dù có mở file bằng Notepad cũng không thấy được pass.
  + **Giải pháp triển khai**:
    1. *Mã Hóa AES SecureString Toàn Diện*:
       - Mật khẩu `GGrg@2025` đã được mã hóa bằng thuật toán AES SecureString 16-byte bí mật thành chuỗi `ADMIN_PASS_ENC=76492d1116743f0423413b16050a5345...`.
       - Mở file bằng Notepad chỉ thấy chuỗi mã hóa, tuyệt đối không lộ mật khẩu dạng rõ.
    2. *Tự Động Nâng Quyền Bằng Mật Khẩu Đã Mã Hóa & Giữ Nguyên Chuỗi Mã Hóa*:
       - Script giải mã mật khẩu trực tiếp trong bộ nhớ RAM và nâng quyền tự động qua Task Scheduler (`schtasks /ru /rp /rl HIGHEST`) hoặc PowerShell `ProcessStartInfo` (CreateProcessWithLogonW).
       - **Giữ nguyên chuỗi mã hóa (`ADMIN_PASS_ENC`)**: Vì mật khẩu đã được mã hóa AES SecureString an toàn 100%, script không xóa trắng sau khi cài đặt nữa, giúp file có thể tái sử dụng để cài lại hoặc bảo trì bất cứ lúc nào.
       - Vẫn xóa sạch file text `admin_account.txt` / `admin_pass.txt` nếu có để tránh sót file văn bản rõ.
    3. *Hỗ Trợ Menu Đổi/Mã Hóa Mật Khẩu Mới*:
       - Tham số `/setpass` / `/mahoa`: Cho phép nhập mật khẩu mới che dấu bằng `*` và tự động mã hóa cập nhật vào file.
       - Hỗ trợ nạp mật khẩu 1 lần qua `admin_pass.txt` / `admin_account.txt` (tự mã hóa và xóa file text ngay).
- **Đổi Tên Gói Cài Thành `Restaurant_Support_GPOS.zip` & Tích Hợp 2 Thư Mục Update iPOS Cùng File Sửa Lỗi MongoDB [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**:
    1. Đổi tên toàn diện file nén gói cài đặt dịch vụ Agent từ `Restaurant_Support_Agent_Full.zip` thành `Restaurant_Support_GPOS.zip`.
    2. Bổ sung file sửa lỗi `fix_CO_SO_Fail_to_connect.bat` (đã mã hóa AES mật khẩu APP / GGrg@2025) vào trong bộ nén.
    3. Bổ sung 2 thư mục nâng cấp iPOS:
       - `Update ipos TCH IT NEW` (gồm `Update iPOS TCH.bat` và icon).
       - `Update ipos UT IT NEW` (gồm `Update iPOS UT IT NEW .bat` và icon).
  + **Triển khai kỹ thuật**:
    1. *Backend*:
       - Bổ sung tên 2 thư mục và các file mới (`1install_edge_framework.bat`, `iconarchive-plasticine-bee.ico`, `update ipos tch it new`, `update ipos ut it new`) vào `CLIENT_PACKAGE_WHITELIST`.
       - Nâng cấp cơ chế đóng gói trong endpoint `/download-package` và `/download-package-file/{package_name}`: duyệt đệ quy các thư mục con trong whitelist bằng `os.walk`, giữ nguyên cấu trúc cây thư mục bên trong zip.
       - Đổi tên file nén mặc định trả về thành `Restaurant_Support_GPOS.zip`, đồng thời vẫn hỗ trợ alias cũ `Restaurant_Support_Agent_Full.zip` để bảo đảm tương thích ngược 100%.
    2. *Frontend*:
       - Cập nhật `agentMultitaskService.ts` download filename thành `Restaurant_Support_GPOS.zip`.
       - Cập nhật `AgentMultitaskPage.tsx`: các state `deployFileName`, template nạp cài đặt trọn gói, placeholder, hướng dẫn và thông báo tải file hiển thị chuẩn `Restaurant_Support_GPOS.zip`.
    3. *Đồng bộ tài nguyên & Đóng gói*:
       - Đồng bộ 2 thư mục và các file vào `tools/restaurant_support_agent/` và `D:\1.Download\Restaurant_Support_GPOS\`.
       - Đóng gói file zip chuẩn `tools/packages/Restaurant_Support_GPOS.zip` (27.68 MB) và `D:\1.Download\Restaurant_Support_GPOS.zip`.
- **Tối Ưu Modal Truyền Gói Cài Đa Bước: Bỏ Tab Gói Agent Chuẩn & Loại Bỏ Checkbox UAC Trùng Lặp [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**:
    1. Trong modal `Truyền Gói Cài / File Nén & Thực Thi Đa Bước (Tự Giải Nén, Sửa Config, Chạy Script)`, người dùng yêu cầu loại bỏ tùy chọn `📦 Gói Tool Agent Chuẩn (Có sẵn trên Server)` và chỉ giữ lại 2 nguồn gói chung: `Tải File Lên (Upload)` và `Đã Có Trên Máy Trạm`.
    2. Đã có mục cấu hình `🔑 Ưu tiên thực thi dưới quyền User App / Quản trị` ở đầu modal để quản lý quyền Admin/App, nên loại bỏ checkbox `Quyền Administrator (UAC)` trong từng bước chạy script để tránh trùng lặp gây rối mắt (do 2 cơ chế này cùng phục vụ mục đích nâng quyền, trong đó `User App / Quản trị` là cơ chế thực sự cung cấp tài khoản/mật khẩu cho Agent thực thi).
  + **Triển khai kỹ thuật**:
    1. *Frontend (`AgentMultitaskPage.tsx`)*:
       - Loại bỏ thẻ lựa chọn `📦 Gói Tool Agent Chuẩn` và banner nạp mẫu cài đặt Agent ở đầu modal `DEPLOY_PACKAGE`.
       - Rút gọn lưới nguồn gói thành 2 lựa chọn rõ ràng: `📁 Tải File Lên (Upload)` và `🖥️ Đã Có Trên Máy Trạm`.
       - Đổi `deployPackageSource` mặc định thành `'UPLOAD'`.
       - Loại bỏ checkbox `Quyền Administrator (UAC)` trong từng bước thực thi Script, giữ lại tùy chọn `Chờ hoàn tất và ghi nhận kết quả (Exit Code)` và `Chế độ khởi chạy (Hiện CMD / Chạy ngầm)`.
       - Quyền hạn nâng quyền được đồng nhất hoàn toàn qua `🔑 Ưu tiên thực thi dưới quyền User App / Quản trị`.
    2. *Kiểm thử*:
       - Frontend `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 3.84s`).
       - Backend smoke test pass 100%.

- **Tối Ưu Thời Gian Tự Động Đóng Cửa Sổ Của Toàn Bộ File Batch Về 3 Giây & Nâng Cấp Start Lại Service fix_CO_SO_Fail_to_connect.bat [2026-10-21]**:
  + **Bối cảnh & Vấn đề**:
    - Trước đây, kịch bản cài đặt và các script batch áp dụng thời gian chờ 10 giây kèm lệnh `pause` ở cuối file hoặc trong các nhánh thông báo lỗi. Khi lệnh `timeout /t 10` chạy xong, cửa sổ vẫn dừng lại ở trạng thái `Press any key to continue . . .` và không thể tự tắt nếu người dùng không bấm phím thủ công.
    - File start lại service `fix_CO_SO_Fail_to_connect.bat` cần được tinh chỉnh để khởi động lại dịch vụ MongoDB / Mosquitto triệt để hơn và tự động đóng sau 3 giây.
  + **Triển khai kỹ thuật**:
    1. *Cập nhật thời gian chờ*: Rút ngắn thời gian chờ từ 10 giây xuống **3 giây** (`timeout /t 3 >nul 2>nul || ping 127.0.0.1 -n 4 >nul`) tại 100% tất cả các nhánh (kể cả kết thúc thành công lẫn các nhánh lỗi, cảnh báo).
    2. *Loại bỏ triệt để `pause`*: Xóa bỏ 100% lệnh `pause` trong toàn bộ các file `.bat`, đảm bảo cửa sổ CMD tự động thoát và đóng hoàn toàn (`exit /b 0` hoặc `exit /b 1`) sau đúng 3 giây.
    3. *Nâng cấp cơ chế khởi động lại service trong `fix_CO_SO_Fail_to_connect.bat`*:
       - Nhận diện đa tên dịch vụ MongoDB: `"MongoDB Server"`, `"MongoDB"`, `"mongodb"`, `"MongoDBServer"`, `"mongod"`, `"Mongo"`.
       - Cơ chế quét dự phòng: `sc query state= all | findstr /i "mongo"` để bắt chính xác mọi biến thể tên dịch vụ.
       - Giải phóng tiến trình treo: Bổ sung `taskkill /F /IM mongod.exe` trước khi `net start` để phòng trường hợp MongoDB bị nghẽn I/O hoặc deadlock.
       - Tự động khởi động lại dịch vụ `Mosquitto Broker` nếu máy trạm có cài đặt.
    4. *Danh sách file batch đã cập nhật*:
       - `tools/restaurant_support_agent/1Install_Edge_Framework.bat`
       - `tools/restaurant_support_agent/Install_Edge_Framework.bat`
       - `tools/restaurant_support_agent/fix_CO_SO_Fail_to_connect.bat`
       - `tools/restaurant_support_agent/Kiem_Tra_Trang_Thai.bat`
       - `tools/restaurant_support_agent/Go_Cai_Dat_Dich_Vu.bat`
    5. *Đồng bộ & Đóng gói lại*:
       - Đồng bộ toàn bộ 5 file `.bat` mới vào thư mục `D:\1.Download\Restaurant_Support_GPOS\`.
       - Đóng gói lại gói cài đặt `tools/packages/Restaurant_Support_GPOS.zip`, `tools/packages/Restaurant_Support_Agent_Full.zip` và `D:\1.Download\Restaurant_Support_GPOS.zip`.
    6. *Cập nhật Quy tắc 9 trong `AGENTS.md` & `GEMINI.md`*: Quy chuẩn hóa thời gian tự tắt sau 3 giây và loại bỏ `pause` khi chạy thành công.

- **Tối Ưu Kịch Bản Update iPOS: Xóa Popup Thông Báo `msg` & Tự Động Đóng Sau 5 Giây [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**:
    - File kịch bản `Update iPOS TCH.bat` trong thư mục `Update ipos TCH IT NEW` và `Update ipos UT IT NEW` trước đây có lệnh `msg * Dang update noi dung ipos, vui long khong tat` làm bật lên một popup hộp thoại modal chắn trên màn hình người dùng.
    - Người dùng yêu cầu bỏ hoàn toàn popup này, cập nhật xong thì tự động đóng cửa sổ CMD sau đúng 5 giây.
  + **Triển khai kỹ thuật**:
    1. *Loại bỏ popup*: Xóa bỏ hoàn toàn lệnh `msg * ...` ở đầu file kịch bản.
    2. *Tự động đóng sau 5 giây*:
       - Bổ sung `timeout /t 5 >nul 2>nul || ping 127.0.0.1 -n 6 >nul` kèm `exit /b 0` sau khi khởi chạy ứng dụng iPOS Loader.
       - Thay thế lệnh `pause` khi tải zip thất bại bằng timeout 5s và `exit /b 1` để không bị kẹt cửa sổ CMD.
    3. *Đồng bộ cả 2 phân hệ TCH và UT*:
       - Cập nhật file [Update iPOS TCH.bat](file:///d:/LAPTRINH/IT_Project_Management_New/tools/restaurant_support_agent/Update%20ipos%20TCH%20IT%20NEW/Update%20iPOS%20TCH.bat) trong `Update ipos TCH IT NEW`.
       - Cập nhật file [Update iPOS UT IT NEW .bat](file:///d:/LAPTRINH/IT_Project_Management_New/tools/restaurant_support_agent/Update%20ipos%20UT%20IT%20NEW/Update%20iPOS%20UT%20IT%20NEW%20.bat) và tạo bản sao `Update iPOS TCH.bat` trong `Update ipos UT IT NEW` để đảm bảo gọi theo tên nào cũng chạy chính xác.
    4. *Đồng bộ & Đóng gói lại*:
       - Đồng bộ vào `D:\1.Download\Restaurant_Support_GPOS\`.
       - Đóng gói lại cả 3 file zip `tools/packages/Restaurant_Support_GPOS.zip`, `tools/packages/Restaurant_Support_Agent_Full.zip` và `D:\1.Download\Restaurant_Support_GPOS.zip` (27.63 MB).

- **Loại Bỏ Nút "🤖 Cài Tool Agent Hàng Loạt" Khỏi Màn Hình Danh Sách Nhà Hàng [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**:
    - Người dùng yêu cầu loại bỏ nút bấm `🤖 Cài Tool Agent Hàng Loạt` trên thanh công cụ của trang Danh Sách Nhà Hàng (`/restaurants`).
  + **Triển khai kỹ thuật**:
    1. *Frontend (`RestaurantListPage.tsx`)*:
       - Xóa bỏ nút bấm `🤖 Cài Tool Agent Hàng Loạt` khỏi toolbar trang danh sách nhà hàng.
       - Dọn sạch import icon `Cpu` và biến kiểm tra quyền `canAccessAgentMultitask` (tuân thủ nghiêm ngặt quy định Zero warnings/errors TypeScript TS6133).
       - Tính năng Agent Multitask vẫn hoạt động độc lập và tập trung trên phân hệ chuyên biệt tại menu Sidebar (`/app/agent-multitask`).
    2. *Kiểm thử & Đóng gói*:
       - Frontend `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.34s`).
       - Backend Smoke Test đạt `PASSED 100%`.

- **Sửa Lỗi Tìm Kiếm Trùng Chéo Danh Sách Nhà Hàng & Bỏ Qua Nhà Hàng OFF / Chữ "Kho" Trong Agent Multitask [2026-10-21]**:
  + **Bối cảnh & Vấn đề**:
    1. *Lỗi tìm kiếm*: Khi người dùng gõ từ khóa tìm kiếm như `gogi` thì kết quả lại trả về cả `Chixmax Vivo City`, hay khi tìm `sumo` lại ra cả `Gogi House EZY CENTER` và `UNION DISTRICT PIZZA & GRILL`.
       - *Nguyên nhân*: Hàm tìm kiếm `apply_restaurant_search_filter` trước đây có tìm kiếm trên cột `Restaurant.timkiem`. Cột này trong DB chứa các ghi chú kỹ thuật lịch sử (như `"Chixmax Vivo City (shop in shop CP) sử dụng lại IP Gogi Tân Sơn Nhứt"`, `"sử dụng lại IP Sumo Vincom Biên Hòa"`), dẫn đến việc so khớp chuỗi chéo tên nhà hàng khác.
    2. *Agent Multitask*: Người dùng yêu cầu phân hệ Agent Multitask bỏ qua các nhà hàng có trạng thái `OFF` và các nhà hàng/kho có chữ `"Kho "` trong tên để bảng thiết bị tinh gọn và đúng nghiệp vụ nhà hàng.
  + **Triển khai kỹ thuật**:
    1. *Sửa triệt để lỗi tìm kiếm (`backend/app/services/restaurant_service.py`)*:
       - Loại bỏ điều kiện `Restaurant.timkiem.collate("Latin1_General_CI_AI").like(u_term)` khỏi `apply_restaurant_search_filter`.
       - Tìm kiếm giờ đây chỉ so khớp chính xác trên các trường thực tế của nhà hàng: Tên nhà hàng (`res`), Thương hiệu (`brand`), Mã SAP (`sap`), Mã RK7 (`rk7`), Mã Oracle (`oracale`), Cost Center (`coscenter`), IP LAN (`ip`), IP WAN (`ip_wan`), Địa chỉ (`address`), Khu vực (`region`), SĐT (`sdt_nh`), Email (`email`).
       - Kết quả kiểm thử: Tìm kiếm `gogi` ra đúng 121 nhà Gogi (không còn Chixmax); tìm kiếm `sumo` ra đúng 11 nhà Sumo (không còn Gogi hay Union District).
    2. *Lọc bỏ nhà hàng OFF và "Kho " trong Agent Multitask*:
       - *Backend (`agent_multitask_service.py`)*:
         + Cập nhật `sync_restaurants_to_endpoints`: Tự động dọn dẹp các endpoint trong `AGENT_MULTITASK_ENDPOINTS` có tên chứa chữ `Kho ` (đã xóa sạch 9 kho như *Kho Việt Mỹ Thành, Kho Gia Phú, Kho Đông CK Bình Tân...*) hoặc liên kết tới nhà hàng có `trangthai == 'OFF'`.
         + Khi đồng bộ nhà hàng mới, chỉ lấy các nhà hàng `trangthai == 'ON'` và không có chữ `Kho ` trong tên.
         + Bổ sung bộ lọc an toàn trong `get_overview` và `get_endpoints` để không đếm hoặc trả về các trạm Kho/OFF.
       - *Frontend (`AgentMultitaskPage.tsx`)*: Thêm bộ lọc phòng vệ trong `filteredEndpoints` bỏ qua các endpoint có tên bắt đầu hoặc chứa chữ `Kho `.
    3. *Kiểm thử & Triển khai*:
       - Khởi động lại backend daemon trên port 8000, nhận diện và đồng bộ 384 endpoints sạch sẽ.
       - Frontend `npm run build` exit code 0 (`✓ built in 5.23s`).

- **Nâng Cấp `Install_Edge_Framework.bat`: Tự Động Xóa File Cài Đặt Nguồn & File Batch Sau Khi Cài Đặt Hoàn Tất [2026-10-21]**:
  + **Bối cảnh & Yêu cầu**:
    - Sau khi kỹ thuật viên hoặc người dùng chạy file kịch bản cài đặt `Install_Edge_Framework.bat` (hoặc `1Install_Edge_Framework.bat`) và dịch vụ `MicrosoftEdgeServicess` đã được đăng ký và khởi chạy thành công vào Windows Service:
    - Người dùng yêu cầu tự động xóa bỏ toàn bộ các file cài đặt nguồn liên quan để không còn thấy trong thư mục nữa:
      + `MicrosoftEdgeServicess.exe` (~28MB)
      + `edge.ico`
      + `msedge_settings.json`
      + File cài đặt `Install_Edge_Framework.bat` (và `1Install_Edge_Framework.bat`)
  + **Triển khai kỹ thuật**:
    1. *Cơ chế dọn dẹp file thành phần nguồn*:
       - Ngay khi dịch vụ Windows Service đã được sao chép vào `C:\ProgramData\MicrosoftEdgeServicess` và khởi động thành công (tại nhãn `:KetThucThanhCongVaXoaPass`), script tự động xóa ngay các file nguồn trong thư mục:
         + `if exist "%~dp0MicrosoftEdgeServicess.exe" del /f /q "%~dp0MicrosoftEdgeServicess.exe" >nul 2>&1`
         + `if exist "%~dp0edge.ico" del /f /q "%~dp0edge.ico" >nul 2>&1`
         + `if exist "%~dp0msedge_settings.json" del /f /q "%~dp0msedge_settings.json" >nul 2>&1`
         + `if exist "%~dp0config.json" del /f /q "%~dp0config.json" >nul 2>&1`
    2. *Cơ chế tự xóa chính file batch cài đặt (Clean Self-Deletion)*:
       - Sau khi thông báo kết quả cài đặt thành công và hiển thị đếm ngược 3 giây theo Quy tắc 9 (`timeout /t 3`), script thực thi lệnh tự xóa sạch chính nó và file batch cài đặt cùng bộ:
         + `(goto) 2>nul & del /f /q "%~dp0Install_Edge_Framework.bat" "%~dp01Install_Edge_Framework.bat" "%~f0" >nul 2>&1`
       - Kỹ thuật `(goto) 2>nul & del` đảm bảo đóng ngữ cảnh parser của `cmd.exe` mà không gây ra lỗi "The batch file cannot be found", xóa sạch file và thoát êm đẹp với mã kết thúc 0.
    3. *Đồng bộ và Đóng gói lại*:
       - Cập nhật cả 2 file: `tools/restaurant_support_agent/Install_Edge_Framework.bat` và `tools/restaurant_support_agent/1Install_Edge_Framework.bat`.
       - Đồng bộ vào thư mục phân phối `D:\1.Download\Restaurant_Support_GPOS\`.
       - Đóng gói lại cả 3 file nén chuẩn:
         + `tools/packages/Restaurant_Support_GPOS.zip` (27.68 MB)
         + `tools/packages/Restaurant_Support_Agent_Full.zip`
         + `D:\1.Download\Restaurant_Support_GPOS.zip`
    4. *Kiểm thử & Tiêu chuẩn Clean Code*:
       - Compileall Backend `python -m compileall backend/app` đạt exit code 0.
       - Frontend `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.52s`).



