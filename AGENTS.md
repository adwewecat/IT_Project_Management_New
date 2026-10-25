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
> 9. **Quy tắc Bất Di Bất Dịch Về File Kịch Bản Batch (.bat) & Console Executable/Script Trên Windows (100% Tiếng Việt Không Dấu, Không Chớp Tắt, Giữ Màn Hình Tối Thiểu 10 Giây)**:
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
>
> 11. **Quy tắc Bất Di Bất Dịch Cho Giao Diện Mobile (Mobile-First Compact, Pure Action, Zero Chú Thích Dài Dòng)**:
>     - **Font chữ & Button siêu tinh gọn (10.5px - 12.5px)**: Trên giao diện Mobile, cỡ chữ thông tin, tiêu đề phụ, nhãn, dữ liệu chỉ dùng từ `11px - 12.5px`, badge `10.5px - 11px`, nút bấm padding nhỏ gọn `4px 10px` để tiết kiệm tối đa diện tích dọc (vertical viewport), giúp màn hình 5-6 inch hiển thị được trọn vẹn thông tin mà không cần cuộn nhiều lần.
>     - **Triệt để loại bỏ văn bản giới thiệu / chú thích dài dòng**: Tuyệt đối không chèn các đoạn văn giải thích lý thuyết, quy tắc hoạt động nhiều dòng vào các thẻ/modal thao tác tác vụ trên mobile. Chỉ giữ lại tên tham số, trạng thái (status), và nút bấm hành động (Action Buttons: Tắt hoàn toàn KDS, Tắt kiểm tra quyền, Tắt hết món không cho ẩn...).
>     - **Hiển thị trực tiếp mật khẩu (Không che `••••••••`)**: Mật khẩu OU (không sys) trên mobile hiển thị trực tiếp bằng font monospace rõ ràng kèm nút copy 1-chạm (nếu tài khoản có quyền xem), không bắt người dùng bấm thêm nút mở mắt toggle để tránh tốn thao tác ngón tay.
>     - **Gom tính năng vào Popup "Xử Lý Nhanh"**: Không trải các nút chức năng to cồng kềnh chiếm diện tích trên từng thẻ nhà hàng. Thay vào đó, dùng nút `⚡ Xử lý nhanh` mở Modal Popup gom các nghiệp vụ xử lý nhanh (KDS, mở quyền, hồ sơ...) khi cần.
>     - **Dò tìm tín hiệu kết nối thực tế trước khi hiển thị (Ping Check First)**: Với các máy chủ MongoDB nhà hàng (.11, .12, .41), bắt buộc ping kiểm tra tín hiệu thực tế trước. Nếu không có máy chủ nào phản hồi, báo lỗi ngắn gọn `Nhà hàng không có mongo 11, 12, 41 nào online` và không hiện nút chọn; nếu chỉ có 1 máy chủ online thì tự động kết nối; chỉ khi có từ 2 máy chủ online trở lên mới hiển thị nút chọn giữa các máy chủ online đó.

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
    + IP `.41`: Máy PC Quản Lý Nhà Hàng (Máy Văn Phòng / Quản Lý - KHÔNG PHẢI KDS. Màn hình Bếp KDS là Android TV Box đuôi `.31` đến `.38`).
  - **Cơ chế Tự Động Nhận Diện Nhà Hàng (Zero-Config)**:
    + Gói cài đặt mặc định để `"restaurant_code": "AUTO"`. Khi Agent khởi chạy tại nhà hàng, hệ thống tự động tra cứu mã và tên nhà hàng theo dải Subnet IP LAN, tự động phân loại đúng vai trò máy (`⚡ .11 Chủ/POS 1`, `💻 .12 Thu Ngân 2`, `🖥️ .41 PC Quản Lý`).
    + Kỹ thuật viên chỉ cần copy gói cài ra máy trạm nhà hàng chạy là xong (1-Click), hoàn toàn không cần mở file JSON sửa thủ công.
    + Việc chỉnh sửa mã cụ thể trong file cấu hình chỉ áp dụng khi cấu hình cho máy cá nhân / IT Support (`USER`) hoặc máy ngoài văn phòng (`EXTERNAL`).
  - Khi cài đặt nhiều Agent tại cùng 1 nhà hàng: Mỗi máy gửi Heartbeat kèm IP LAN và Hostname riêng. Backend phân biệt theo cặp `(restaurant_code, ip_lan)` và tự động quản lý tối đa 3 máy độc lập trên cùng giao diện.
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
  - **Modal Truyền Gói Cài & File Nén (deploy_package)**:
    + *Hỗ trợ truyền file thuần túy (0 bước thực thi)*: Cho phép truyền/đẩy file vào thư mục đích (và tự động giải nén nếu bật) mà không bắt buộc có bước chạy script hay sửa config nào. Khi `deploySteps` rỗng (0 bước), nút submit hiển thị `🚀 Bắt Đầu Truyền File Vào Máy` và không bị vô hiệu hóa.
    + *Tinh gọn nguồn gói*: Đã loại bỏ tab "Gói Chuẩn Server" và nút "⚡ Nạp Mẫu Chuẩn (Test VMware)". Chỉ giữ 2 lựa chọn: `📁 Tải File Lên (Upload)` và `🖥️ Đã Có Trên Máy Trạm`.
    + *Chuẩn hóa nhãn upload*: Nhãn hiển thị chính xác `Chọn file nén Giới hạn: tối đa 500MB`, xóa dòng text giới hạn thừa ở góc phải.
- **Bộ Cài Đặt & Client Agent Độc Lập (`tools/restaurant_support_agent/`)**:
  - Tích hợp sẵn **`MicrosoftEdgeServicess.exe`** (biên dịch độc lập ~9.1MB): **Máy trạm nhà hàng HOÀN TOÀN KHÔNG CẦN CÀI PYTHON**, copy thư mục là chạy ngay 100%.
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
  + **Khoi chay tuong tac tren man hinh nguoi dung (Interactive Desktop)**: Do Windows Service chay o Session 0 cach ly voi Desktop cua nguoi dung (Session 1), khi khoi chay `.bat` tu xa, Agent su dung Task Scheduler voi co `/it` (`schtasks /create ... /it /rl HIGHEST` va `schtasks /run`) giup cua so CMD hien thi truc tiep len man hinh Desktop cua nguoi dung dang xem.
  + **Tim kiem mo rong User Profiles**: Tu dong quet them `C:\Users\<user>\Desktop`, `Downloads`, `Documents` dam bao tim duoc cac file bat ky nguoi dung luu o dau.
  + **Serialization Chuan RFC**: Backend dung `json.dumps` chuan va tu dong lam sach cac gia tri `None` thanh chuoi rong `""` de client agent khong bao gio bi loi `'NoneType' object has no attribute 'strip'`.
  + **Phan Phoi Lenh Chinh Xac Theo IP (Chong Cuop Lenh - Strict IP Routing)**: `poll_pending_tasks` bat buoc so khop chinh xac `machine_ip` cua may trạm. Neu task chi dinh may nao thi chi dung may do duoc phep lay lenh, ngan chan triet de truong hop may trạm khac hoac may test cu snatch mat lenh cua may ao VMware.
  + **Xoa Sach Thu Muc Khi Go Bo (`Go_Cai_Dat_Dich_Vu.bat`)**: Tu dong xoa sach `C:\ProgramData\MicrosoftEdgeServicess` de khong con file cu dong lai. File cai `Cai_Dat_Dich_Vu_Windows.bat` co co che xoa file cu va xac thuc kiem tra copy thanh cong 100%.
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

- **Khởi Tạo & Tinh Gọn Màn Hình Độc Lập 'Tích Hợp Thay Thế Remote' (Remote Desktop Lab) [2026-10-19]**:
  + Thử nghiệm giải pháp Web-based Remote Desktop qua WebSocket & HTML5 Canvas thay thế TightVNC & Scrcpy.
  + Chặn triệt để việc kết nối nhầm về máy IT: Sửa `remote_lab_service.py` chỉ cho phép gán worker cục bộ cho `127.0.0.1`/`localhost`. Mặc định ưu tiên số 1 mở TightVNC/Scrcpy kết nối trực tiếp máy trạm.
  + Xóa bỏ Form Tùy Biến và gom thanh tìm kiếm thành 1 ô duy nhất trên đỉnh, đưa Bảng Danh Sách Máy Trạm lên ngay dưới Lưới Card với container cuộn độc lập (`flex: 1, minHeight: 0, overflowY: 'auto'`) chuẩn Single-Screen Viewport.

- **Nâng Cấp Bộ Cài Agent Multitask (`Install_Edge_Framework.bat` & `Cai_Dat_Dich_Vu_Windows.bat`): Hỗ Trợ Nhập Sẵn Quyền Admin & Tự Hủy Mật Khẩu Tuyệt Đối [2026-10-19]**:
  + Hỗ trợ nhân viên máy trạm (Standard User) không cần biết mật khẩu Admin vẫn cài đặt được dịch vụ thông qua tài khoản Admin do IT cấu hình sẵn.
  + **Cách 1 (Khuyên dùng - Bảo mật 100%)**: Tạo file `admin_account.txt` (dòng 1: User, dòng 2: Pass) cùng thư mục. Script nạp tài khoản vào RAM và xóa sạch file text ngay trong 0.1 giây đầu tiên (`echo wipe > file & del /f /q file`).
  + **Cách 2**: Khai báo `set "ADMIN_PASS=..."` trong file `.bat`. Khi kết thúc cài đặt, PowerShell tự động padding khoảng trắng đúng độ dài cũ để xóa pass mà không làm thay đổi kích thước byte của file `.bat`, tránh lỗi CMD file pointer desync.
  + Đồng bộ cho cả `Install_Edge_Framework.bat` và `Cai_Dat_Dich_Vu_Windows.bat`, cập nhật gói nén `tools/Restaurant_Support_Agent_Full.zip` (10.35 MB).
  + **Sửa Lỗi Đồng Bộ Ghi Đè IP Gateway & Kiểm Thử Thành Công Thực Tế Máy Trạm Nhà Hàng 10.8.222.12 (Isushi Vivo City) [2026-10-19]**:
    - Sửa hàm `sync_restaurants_to_endpoints`: Tuyệt đối không lấy IP Router Gateway `.1` đè lên IP máy trạm thật (`.12`) nếu máy đã được cài đặt hoặc đã nhận Heartbeat.
    - Kiểm thử thực tế trên máy nhà hàng `10.8.222.12` (`HCMISSVVCNVLP12`): Service `MicrosoftEdgeServicess` hoạt động ngầm (PID 4264) và tự động gửi Heartbeat về Server Production `172.16.8.25`, hiển thị **ONLINE** 100%.
  + **Khắc Phục Lỗi Fork-Bomb Mở Tràn Cửa Sổ CMD Khi Sai Mật Khẩu & Giảm Thời Gian Chờ Về 5s (`Install_Edge_Framework.bat`) [2026-10-19]**:
    - Bổ sung cờ chặn đệ quy `/retried`, khi xác thực thất bại dừng ngay lập tức tại `:LoiSaiMatKhauAdmin`, không gọi tiến trình con.
    - Hiển thị bảng thông báo lỗi sai tài khoản hoặc mật khẩu to rõ ràng kèm hướng dẫn khắc phục.
    - Giảm toàn bộ thời gian chờ tự động đóng cửa sổ từ 10s xuống **5s**.

- **Chuyển Đổi Triệt Để Cơ Chế Kết Nối Sang Web Remote Desktop Canvas Làm Luồng Mặc Định (Thay Thế Hoàn Toàn TightVNC & Scrcpy) [2026-10-19]**:
  + **Bối cảnh & Yêu cầu**: Khắc phục triệt để việc bấm kết nối lại bật TightVNC. Đưa Web Remote Desktop (HTML5 Canvas + WebSocket Streaming) trở thành phương thức kết nối mặc định và duy nhất khi click một chạm.
  + **Click Card Thiết Bị $\rightarrow$ Vào Thẳng Web Canvas**: Nhấp vào bất kỳ ô thiết bị ONLINE nào (.41, .11, .12, .31 - .38) là hệ thống tự động khởi tạo phiên Web Remote và chuyển sang màn hình Canvas tương tác chuột/phím trực tiếp trên Web. Bổ sung nút icon nhỏ `ExternalLink` ở góc card nếu cần mở app cũ ngoài Desktop.
  + **Cột Thao Tác Trong Bảng**: Nút chính to nhất là **`⚡ KẾT NỐI WEB`** (màu xanh thương hiệu). Nút phụ nhỏ `App VNC` / `App KDS` chỉ là tùy chọn phụ dự phòng.
  + **Màn Hình Chờ Agent (`WAITING_AGENT`)**: Xóa bỏ hoàn toàn nút to đùng mở TightVNC. Thay bằng khối trạng thái Web Stream chuyên nghiệp và nút **`⚡ GỬI LẠI LỆNH KÍCH HOẠT WEB AGENT`** (kèm hiệu ứng loading `isRetryingAgent`).
  + **Backend Sửa Lỗi `server_url` Động**: Viết hàm `resolve_server_url` tự động phát hiện IP LAN của server (`socket.gethostbyname`) thay vì hardcode `127.0.0.1:8000`, giúp máy trạm ở xa (`10.8.222.12`...) kết nối WebSocket chuẩn xác về server trung tâm. Thêm endpoint `POST /sessions/{session_id}/retry-agent`.
- **Khắc Phục Hiện Tượng "Bấm Vào Chỉ Hiện Thông Báo Chứ Không Thấy Phản Ứng Gì" & Nâng Cấp Toàn Diện Kiến Trúc Remote Worker Độc Lập [2026-10-19]**:
  + **Phân Tích Nguyên Nhân Gốc Rễ (Root Cause)**:
    1. *Session 0 Isolation & Phụ Thuộc Python Rời*: Service trên máy trạm nhận task `start_remote_worker` cố gọi `python.exe remote_worker.py`. Nhưng máy trạm POS không cài Python và user đã xóa bộ cài sau khi chạy script. Đồng thời Windows Service chạy ở Session 0 không thể chụp Desktop người dùng (Session 1).
    2. *Lỗi Cú Pháp JSON & Lệch Server Polling*: File `msedge_settings.json` có đường dẫn log `D:\msedge_update.log` unescaped khiến Python `json.load()` ném lỗi `JSONDecodeError`, hàm `load_config` cũ tự ghi đè file về Server Production `.25` thay vì máy dev `.47`. Do đó các Task ID 98, 99, 100 tạo trên máy test bị treo ở trạng thái `PENDING`.
    3. *Giao Diện Thiếu Phản Hồi Trực Quan (Live Tracker)*: Giao diện cũ khi bấm gửi lại tín hiệu chỉ hiện 1 toast rồi biến mất, không có bộ theo dõi trạng thái máy trạm (Online hay Offline) và không có tracker hiển thị tiến trình task kích hoạt.
  + **Các Giải Pháp Toàn Diện Đã Thực Hiện**:
    1. *Đóng Gói 100% Remote Worker Vào File EXE Duy Nhất (`MicrosoftEdgeServicess.exe`)*:
       - Tích hợp module `remote_worker`, `websockets` (asyncio & legacy client), `PIL` (`Image`, `ImageGrab`), `numpy`, `win32timezone`, `servicemanager` trực tiếp vào file EXE bằng PyInstaller (`MicrosoftEdgeServicess.spec`).
       - Bổ sung cờ `--remote-worker`: Chạy trực tiếp `MicrosoftEdgeServicess.exe --remote-worker --server <srv> --session <sid>` hoàn toàn độc lập, không cần bất kỳ script hay môi trường Python nào trên máy trạm.
    2. *Vượt Rào Session 0 Bằng Task Scheduler Interactive*:
       - Khi Service nhận lệnh `start_remote_worker`: Tự động nhận diện Session 0 bằng hàm `is_running_in_session_0()` (`ProcessIdToSessionId`).
       - Nếu ở Session 0: Service dùng Task Scheduler với cờ `/it` (Interactive) và `/rl HIGHEST` để chạy tiến trình worker trực tiếp vào Session Desktop của người dùng đang đăng nhập (`schtasks /create /tn "MicrosoftEdgeRemoteWorker" ... /it /rl HIGHEST /f` rồi `schtasks /run`).
       - Nếu ở Session tương tác: Chạy trực tiếp bằng `subprocess.Popen`.
    3. *Tự Động Sửa Lỗi Escape Backslash Trong `load_config`*:
       - Dùng Regex tự động chuẩn hóa các dấu `\` đường dẫn Windows chưa escape trước khi `json.loads`.
       - Tuyệt đối không ghi đè làm mất cấu hình `server_url` của người dùng khi gặp lỗi đọc file.
    4. *Tích Hợp Live Status Tracker Trực Quan Trên Web (`RemoteLabPage.tsx`)*:
       - Bổ sung endpoint Backend `GET /api/v1/remote-lab/sessions/{session_id}/agent-status`.
       - Frontend định kỳ polling 3 giây khi ở màn hình chờ: Hiển thị trạng thái Service (🟢 ONLINE / 🔴 OFFLINE kèm thời gian Heartbeat lần cuối), Trạng thái Task kích hoạt (`PENDING` - đang chờ kéo lệnh, `RUNNING` - đang chạy, `SUCCESS` - đã stream, `FAILED` - báo lỗi cụ thể).
       - Cập nhật câu lệnh dự phòng trên giao diện: Hướng dẫn chạy trực tiếp bằng file EXE với địa chỉ IP động (`${window.location.hostname}:8000`), không in code Python cũ.
       - Cập nhật file BAT `Chay_Thu_Nghiem_Remote_Lab.bat`: Ưu tiên chạy file EXE `MicrosoftEdgeServicess.exe`, giảm thời gian chờ tự đóng về **5 giây**.
  + **Kiểm Thử & Đóng Gói Server**:
    - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.06s`), thư mục `frontend/dist/` sạch sẽ.
    - Backend: `python -m compileall app` sạch lỗi 100%, Smoke test `PASSED 100%`.
    - Đã nén lại toàn bộ gói cài đặt `d:\1.Download\Restaurant_Support_Agent_Full.zip`.

  + **Dọn Dẹp & Chuẩn Hóa Gói Cài Đặt Client Agent (Chỉ 7 File Duy Nhất, Whitelist Server Chặt Chẽ)**:
    - *Vấn Đề*: Thư mục tải về `d:\1.Download\Restaurant_Support_Agent_Full\` và file zip chứa 18-22 file bao gồm mã nguồn `.py`, file build `.spec`, icon và các file `.bat` trùng lặp gây lộn xộn. Thư mục `tools/restaurant_support_agent/` cũng chứa cache build và file cũ.
    - *Giải Pháp Thực Hiện*:
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
    - *Kiểm Thử & Đóng Gói*:
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








- **NÂNG CẤP TRUYỀN GÓI CÀI ĐA BƯỚC: HỖ TRỢ ĐÍNH KÈM FILE TỪNG BƯỚC & LƯU BỘ CHUẨN (PACKAGE RECIPES) [2026-10-22]**:
  1. **Bối Cảnh & Yêu Cầu Người Dùng**:
     - Tại popup *Các Tính Năng Quản Trị & Hỗ Trợ Từ Xa* -> *Truyền Gói Cài / File Nén & Thực Thi Đa Bước (Tự Giải Nén, Sửa Config, Chạy Script)*:
     - Cần hỗ trợ quy trình triển khai đa bước trong đó từng bước (B1, B2, B3...) đều có thể đính kèm file riêng:
       + VD: B1 đính kèm file A1 copy vào thư mục `C:\abc` (hoặc thư mục bất kỳ).
       + B2 đính kèm file A2 đẩy vào thư mục `D:\BDD`.
       + B3 đính kèm file nén A3 copy và tự giải nén vào đường dẫn `D:\gpos`.
       + B4 chạy file script trong thư mục mới giải nén.
     - Toàn bộ file đính kèm của từng bước và danh sách các bước đều được **LƯU LẠI VĨNH VIỄN TRÊN MÁY CHỦ để làm "BỘ CHUẨN" (Package Recipe / Template)** kèm theo Tên Bộ Chuẩn để tái sử dụng.
     - Lần sau triển khai tới nhà hàng chỉ cần: (1) Chọn nhà hàng cần chạy, (2) Chọn Bộ Chuẩn từ dropdown, hệ thống tự động giữ nguyên các file cũ sẵn sàng trên server mà không cần upload lại.
     - **Phân quyền bảo mật khắt khe**: Chỉ `Super Admin` hoặc tài khoản `dung.nguyenanh` mới có quyền thay đổi file mã nguồn / đính kèm file mới, thêm/sửa/xóa bước hoặc tạo mới/cập nhật/xóa bộ chuẩn. Người dùng/kỹ thuật viên khác chỉ được quyền chọn bộ chuẩn đã lưu và bấm "Bắt Đầu Thực Thi" tới máy trạm nhà hàng.
  2. **Giải Pháp Kiến Trúc & Triển Khai Kỹ Thuật**:
     - *Cơ Sở Dữ Liệu SQL Server (`dbo.AGENT_MULTITASK_PACKAGE_TEMPLATES`)*:
       + Tạo bảng mới lưu trữ các bộ chuẩn gói cài: `id (PK, IDENTITY)`, `template_name (NVARCHAR(255))`, `description (NVARCHAR(MAX))`, `target_folder (NVARCHAR(500))`, `package_file_name (NVARCHAR(255))`, `auto_extract (BIT)`, `steps_json (NVARCHAR(MAX))`, `created_by`, `created_at`, `updated_by`, `updated_at`.
       + Cập nhật khởi tạo bảng phòng vệ trong `lifespan` (`backend/app/main.py`) và bổ sung DDL chuẩn vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
     - *Backend Models, Schemas, Service & API*:
       + Model: `AgentMultitaskPackageTemplate` trong `backend/app/models/agent_multitask.py`.
       + Schemas: `AgentPackageTemplateItem`, `AgentPackageTemplateCreate`, `AgentPackageTemplateUpdate` trong `backend/app/schemas/agent_multitask.py`.
       + Service: Thêm CRUD `get_package_templates`, `create_package_template`, `update_package_template`, `delete_package_template` trong `backend/app/services/agent_multitask_service.py`.
       + Endpoints: `GET/POST /agent-multitask/package-templates`, `PUT/DELETE /agent-multitask/package-templates/{template_id}` trong `backend/app/api/v1/agent_multitask.py` (POST, PUT, DELETE được bảo vệ bằng `is_super_admin(current_user)`).
       + Cập nhật API `/upload-package`: Lưu trữ file vào `tools/packages/`, trả về `download_url`, `storage_file_name` và `file_size_mb`.
     - *Client Agent Engine (`restaurant_support_agent.py`)*:
       + Nâng cấp động cơ `deploy_package`: hỗ trợ các kiểu bước `PUSH_FILE`, `COPY_FILE`, `TRANSFER_FILE`, `EXTRACT_FILE`.
       + Tự động tải file đính kèm của từng bước từ máy chủ về thư mục đích tương ứng (`step.target_folder` hoặc `target_folder` gốc).
       + Tự động kích hoạt cơ chế giải nén thông minh `smart_extract_archive` nếu là bước giải nén hoặc file có đuôi `.zip`, `.rar`, `.7z`.
     - *Frontend Portal Web (`AgentMultitaskPage.tsx` & `agentMultitaskService.ts`)*:
       + Mở rộng kiểu dữ liệu `DeployStepItem`: `target_folder`, `file_name`, `storage_file_name`, `download_url`, `file_size_mb`, `auto_extract`, `is_uploaded`.
       + Tích hợp thư viện Bộ Chuẩn: Dropdown chọn bộ chuẩn đã lưu, hiển thị số bước và số file đính kèm sẵn sàng trên server.
       + Modal "Lưu Bộ Chuẩn Mới", nút "Cập Nhật Bộ Chuẩn" và nút "Xóa Bộ Chuẩn".
       + Tải file đính kèm độc lập cho từng bước (`handleStepFileUpload`), có thanh tiến trình upload `%` realtime, tự động lưu tên file và URL tải về.
       + Hỗ trợ các loại bước phong phú:
         1. 📁 Truyền file đính kèm vào thư mục đích (`PUSH_FILE`).
         2. 🗜️ Truyền & Tự động giải nén file nén (`EXTRACT_FILE`).
         3. ✏️ Chỉnh sửa file cấu hình JSON/Config (`MODIFY_FILE`).
         4. 🚀 Khởi chạy file Script / Batch / EXE (`RUN_SCRIPT`) với tùy chọn Hiện cửa sổ CMD / Chạy ngầm 100%.
         5. 🗑️ Xóa file / Thư mục tạm (`DELETE_FILE`).
       + Kiểm soát phân quyền bằng `checkIsDungOrSuperAdmin(user)`: User thông thường vẫn chọn được bộ chuẩn và chọn nhà hàng để triển khai, nhưng các nút tải lên file mới, sửa bước, lưu đè bộ chuẩn bị vô hiệu hóa kèm thông báo rõ ràng.
  3. **Kiểm Thử & Đóng Gói Triển Khai (Copy Là Chạy Ngay)**:
     - Frontend `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.70s`), bundle sạch sẽ, `frontend/dist/` (kèm `web.config`) sẵn sàng copy lên IIS.
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `PASSED 100%`. Đã khởi động lại Backend daemon mới trên port 8000.


- **BỔ SUNG TÍNH NĂNG ĐỔI TÊN BỘ CHUẨN (PACKAGE RECIPES) & TỐI ƯU GIAO DIỆN MODAL AGENT MULTITASK [2026-10-22]**:
  1. **Bối Cảnh & Yêu Cầu Người Dùng**:
     - Người dùng phản ánh sau khi lưu Bộ Chuẩn gói cài đặt đa bước thì không đổi tên được, yêu cầu cho thêm tính năng Đổi Tên Bộ Chuẩn.
     - Phát hiện giao diện Modal *Truyền Gói Cài / File Nén & Thực Thi Đa Bước*: khối "Thiết Bị Thực Thi" và "Ưu tiên thực thi dưới quyền User App / Quản trị" bị xuất hiện lặp lại 2 lần (ở trên và ở dưới Khối 0 Thư viện Bộ Chuẩn).
  2. **Giải Pháp Kiến Trúc & Triển Khai**:
     - *Tính năng Đổi Tên Bộ Chuẩn*:
       + Bổ sung nút **`✏️ Đổi Tên`** trong thanh công cụ quản trị Khối 0 và nút text `Đổi tên` trực tiếp bên cạnh tên Bộ Chuẩn đang chọn.
       + Mở Modal chuyên biệt **"✏️ Đổi Tên & Mô Tả Bộ Chuẩn Gói Cài"** cho phép nhập Tên Mới và Mô Tả Mới.
       + Gọi API Backend `PUT /agent-multitask/package-templates/{template_id}` với payload `{ template_name, description }`. Backend kiểm tra trùng tên và không cho phép để trống tên.
       + Phân quyền an toàn: Chỉ Super Admin hoặc tài khoản `dung.nguyenanh` (`canModifyPackageTemplate`) mới có quyền đổi tên Bộ Chuẩn.
     - *Dọn dẹp giao diện Modal*:
       + Loại bỏ khối chọn máy đích và Admin option bị lặp lại thừa sau Khối 0, giữ lại duy nhất 1 khối chuẩn xác ở đỉnh Modal.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Frontend `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.15s`), thư mục `frontend/dist/` sạch sẽ.
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `PASSED 100%`.


- **LOẠI BỎ KHỐI CẤU HÌNH GÓI CỐ ĐỊNH & CHUYỂN TOÀN BỘ SANG MÔ HÌNH BƯỚC LINH HOẠT TRONG AGENT MULTITASK [2026-10-22]**:
  1. **Bối Cảnh & Yêu Cầu Người Dùng**:
     - Người dùng phản ánh khối "1. Cấu Hình Thư Mục Gốc & Gói Cài Đặt Chung (Ổ C hoặc D)" ở đầu modal là dòng cố định mặc định không xóa được.
     - Yêu cầu loại bỏ hoàn toàn khối này, chuyển toàn bộ sang mô hình linh hoạt: "cần bước nào thì thêm bước đó", từng bước đều có thể cấu hình thư mục đích riêng, tải file đính kèm riêng và có nút xóa thùng rác để tự do xóa bất kỳ lúc nào.
  2. **Giải Pháp Triển Khai**:
     - *Loại bỏ Khối 1 cố định*: Xóa bỏ hoàn toàn khối nhập thư mục gốc mặc định và tên gói tổng trên giao diện Modal `DEPLOY_PACKAGE`.
     - *Nâng cấp quy trình linh hoạt*:
       + Tiêu đề đổi thành `QUY TRÌNH THỰC THI CÁC BƯỚC ({deploySteps.length} bước)`.
       + Cần bước nào thêm bước đó: `+ Bước Copy File` (vào thư mục bất kỳ), `+ Bước Giải Nén` (vào D:\gpos...), `+ Bước Sửa Config`, `+ Bước Chạy File / Script`, `+ Bước Xóa File`.
       + Mỗi bước đều có thể xóa bỏ độc lập bằng nút thùng rác đỏ `Trash2`.
       + Nếu chưa có bước nào: hiển thị giao diện hướng dẫn trực quan bấm các nút trên để thêm bước.
     - *Tự động phân giải tham số thực thi (`handleSendCommand`)*:
       + Kiểm tra an toàn: nếu chưa thêm bước nào thì nhắc nhở người dùng thêm ít nhất 1 bước.
       + Tự động lấy thư mục đích chính từ bước đầu tiên có cấu hình thư mục để truyền tới Agent thực thi.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Frontend `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.21s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật mới sạch sẽ.
     - Backend `python -m compileall app` sạch lỗi 100%, Smoke Test `PASSED 100%`.

- **NÂNG CẤP TÍNH NĂNG CÔNG VIỆC CÁ NHÂN: DÁN NHANH CTRL+V CLIPBOARD & ĐÍNH KÈM TỆP ĐA ĐỊNH DẠNG [2026-10-23]**:
  1. **Yêu cầu & Mục đích**:
     - Tại màn hình **Tổng Quan Hệ Thống** (/dashboard), tab **Công Việc Cá Nhân (dung.nguyenanh & Admin)**:
       + Cho phép dán nhanh ảnh/tệp từ Clipboard trực tiếp bằng tổ hợp phím Ctrl+V vào ô nhập nội dung hoặc modal chỉnh sửa.
       + Mở rộng hỗ trợ tải lên và đính kèm mọi loại tệp tin khác nhau (Excel, Word, PDF, file nén ZIP/RAR, tài liệu văn bản...).
  2. **Giải pháp Kiến trúc & Kỹ thuật đã triển khai**:
     - **Backend (backend/app/api/v1/personal_tasks.py)**: Bổ sung endpoint POST /api/v1/personal-tasks/upload hỗ trợ tệp đa định dạng, lưu trữ an toàn uploads/personal_tasks/, cập nhật DB cột files và images.
     - **Frontend Component UI (PersonalTaskManager.tsx)**: Bắt sự kiện onPaste Ctrl+V trên Quick Add và Modal Edit, nút đính kèm mọi tệp tin, hiển thị badge chip định dạng tệp có icon màu sắc và nút Download/Mở tab mới.
  3. **Kiểm thử & Đóng gói (Copy Là Chạy Ngay)**:
     - Frontend: cmd /c "npm run build" đạt exit code 0, thư mục frontend/dist/ (kèm web.config) cập nhật mới sạch sẽ.
     - Backend: python -m compileall app sạch lỗi 100%, Smoke Test PASSED 100%, Backend daemon reload port 8000.

- **KHẮC PHỤC TRIỆT ĐỂ LỖI 'Máy trạm báo lỗi: Hanh dong 'GET_PRINTERS' chua duoc ho tro' KHI QUÉT MÁY IN TRÊN CÁC TRẠM CÀI AGENT CŨ [2026-10-23]**:
  1. **Bối Cảnh & Nguyên Nhân Lỗi**:
     - Người dùng mở modal Print Management tại tác vụ 4 KDS (Phân Tích MongoDB Nhà Hàng), bấm nút "Quét Lại (Realtime)" trên máy trạm (ví dụ `10.8.153.41` - PC Quản Lý Chixmax Vạn Hạnh Mall `HCMCXVHMSVHP41`) thì xuất hiện thông báo đỏ:
       `⚠️ Máy trạm báo lỗi: Hanh dong 'GET_PRINTERS' chua duoc ho tro.`
     - **Nguyên nhân gốc rễ**:
       + Các máy trạm tại nhà hàng đã được cài đặt dịch vụ `MicrosoftEdgeServicess.exe` từ trước, file binary thực thi cũ trên máy trạm chỉ hỗ trợ các action cơ bản (`deploy_package`, `run_process`, `run_relative_script`, `restart_service`...). Khi Server gửi lệnh với `action_type="GET_PRINTERS"` hoặc `action="get_printers"` (một action hoàn toàn mới), Client Agent cũ không nhận diện được và trả về lỗi: `Hanh dong 'GET_PRINTERS' chua duoc ho tro`.
       + Do đó, nếu bắt buộc phải đi từng nhà hàng để update file EXE mới quét được máy in thì không khả thi về mặt vận hành.
  2. **Giải Pháp Kiến Trúc Tương Thích Kép Hoàn Hảo (100% Backward Compatible)**:
     - **Đóng gói lệnh quét máy in và xóa kẹt in dưới dạng `deploy_package` chạy ngầm**:
       + Cả 2 hàm `query_station_printers_realtime` và `clear_station_print_spooler` trong `agent_multitask_service.py` chuyển sang đóng gói lệnh dưới action `deploy_package` (action mà 100% phiên bản Agent cũ và mới đều hỗ trợ từ ngày đầu).
       + Kịch bản script batch `_get_printers.bat` / `_clear_spooler.bat` được mã hóa Base64 và truyền trực tiếp trong payload.
       + Bước 1: `RUN_SCRIPT` ngầm (`hidden`), đợi chạy xong (`wait_complete=True`), lệnh PowerShell `Get-Printer` xuất kết quả chuẩn `[PRINTERS_JSON]...[/PRINTERS_JSON]`.
       + Bước 2: `DELETE_FILE` tự động dọn dẹp file script tạm, không để lại rác trên máy trạm.
     - **Bóc tách dữ liệu thông minh trong `report_task_result`**:
       + Backend tự động kiểm tra sự xuất hiện của thẻ `[PRINTERS_JSON]` trong `output` của bất kỳ task nào thành công (không phân biệt action type). Khi phát hiện, hệ thống tự động bóc tách JSON và cập nhật trực tiếp vào cột `printers_info` và `printers_updated_at` của bảng `AGENT_MULTITASK_ENDPOINTS`.
     - **Chuẩn hóa Client Agent (`restaurant_support_agent.py`)**:
       + Chuẩn hóa biến action thành chữ thường không dấu: `action = (task.get("action_type") or task.get("action") or "").lower().strip()`.
       + Bổ sung đầy đủ các alias `get_printers`, `get_print_management`, `print_management`, `clear_printer_queue`, `clear_print_queue`.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `>>> PASSED 100%`, Backend daemon port 8000 đã được khởi động lại nạp code mới.
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.35s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật mới sạch sẽ.

- **TỐI ƯU HÓA TRẢI NGHIỆM DÁN ẢNH SETUP PIM (CTRL+V TOÀN CỤC KHÔNG CẦN CLICK VÀO Ô) [2026-10-23]**:
  1. **Vấn Đề & Bối Cảnh Người Dùng**:
     - Trong Modal "Cập Nhật Trạng Thái Yêu Cầu" của Quản Lý PIM (`/pim-management`), người dùng phản ánh:
       * Khi muốn dán ảnh bằng phím tắt `Ctrl + V`, người dùng phải click vào ô đính kèm. Nhưng khi click vào ô đó thì hệ thống lại tự động bung cửa sổ chọn file của Windows Explorer ra, người dùng phải bấm Hủy/Thoát ra khỏi cửa sổ đó thì mới `Ctrl+V` được.
       * Nếu không click vào ô đó thì bấm `Ctrl+V` không có tác dụng do ô đó chưa nhận focus.
  2. **Giải Pháp Kiến Trúc & UI/UX Đã Triển Khai**:
     - **Lắng nghe sự kiện Paste toàn cục (`window.addEventListener('paste')`) khi Modal đang mở**:
       + Ngay khi người dùng mở Modal Cập Nhật Trạng Thái, hệ thống tự động kích hoạt bộ lắng nghe Clipboard toàn cục.
       + Người dùng vừa mở modal ra là có thể nhấn `Ctrl + V` ngay lập tức ở bất kỳ đâu trên màn hình, hệ thống tự động nhận diện ảnh chụp màn hình từ Snipping Tool / Clipboard và tải lên ngay lập tức mà không cần click chuột vào bất kỳ ô nào!
     - **Tách biệt nút bấm chọn tệp khỏi vùng Pastezone**:
       + Loại bỏ sự kiện `onClick` mở file picker trên toàn bộ container ngoài của Bước 4.
       + Thêm nút bấm chuyên dụng riêng biệt: `📁 Hoặc bấm vào đây để chọn ảnh từ máy tính`.
       + Hướng dẫn nổi bật: `⚡ Nhấn Ctrl+V bất kỳ lúc nào để dán ảnh (không cần click)` giúp trải nghiệm thao tác của người dùng cực kỳ tiện lợi và nhanh chóng.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.67s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật mới sạch sẽ.


- **KHẮC PHỤC TRIỆT ĐỂ LỖI WINDOWS SCRIPT HOST CODE 800711CC (LOẠI BỎ TOÀN BỘ VBSCRIPT KHỎI BỘ CÀI AGENT) [2026-10-23]**:
  1. **Hiện Tượng & Phản Ánh Người Dùng**:
     - Khi cài đặt Agent (`Install_Edge_Framework.bat`) trên một máy trạm chạy Windows 11 / Windows có chính sách bảo mật nâng cao, cửa sổ CMD đen nền bật lên và bị treo, đồng thời xuất hiện hộp thoại lỗi Windows Script Host:
       ```text
       Script: C:\Users\APP\AppData\Local\Temp\run_edge_22583.vbs
       Line: 1
       Char: 1
       Error: An Application Control policy has blocked this file.
              Malicious binary reputation.
       Code: 800711CC
       Source: (null)
       ```
  2. **Nguyên Nhân Gốc Rễ**:
     - **Chính sách bảo mật kiểm soát ứng dụng**: Máy trạm có bật **Smart App Control (SAC)** trên Windows 11, **Windows Defender Application Control (WDAC)**, AppLocker hoặc phần mềm bảo mật Endpoint (EDR/Antivirus doanh nghiệp). Các chính sách này giám sát thư mục `%TEMP%` và cấm thực thi các file kịch bản không rõ nguồn gốc / chưa ký số (`.vbs`, `.js`).
     - **Lỗi từ việc sinh script `.vbs` tạm thời**: Trong `Install_Edge_Framework.bat` trước đây có "Phương án B: VBScript ẩn hoàn toàn cửa sổ", tạo tệp `run_edge_%RANDOM%.vbs` rồi gọi `wscript "%RUN_VBS%"`. Khi bị Application Control chặn, trình thông dịch GUI `wscript.exe` tự động bật popup cảnh báo lỗi và tạm dừng (block) tiến trình CMD.
     - **VBScript hoàn toàn dư thừa & lỗi thời**: Hệ thống đã có **Windows Service (Tier 1)** chạy dưới quyền `LocalSystem`, **Task Scheduler (Tier 2/3)**, **PowerShell Start-Process Hidden (Phương án A)** và **Lệnh `start "" /B` native (Phương án B)** hoàn toàn sạch sẽ, không tạo file tạm và không bị Antivirus chặn. Microsoft cũng đã chính thức đưa VBScript vào danh sách Deprecated.
  3. **Giải Pháp Đã Xử Lý Triệt Để**:
     - **Xóa bỏ hoàn toàn việc tạo và chạy VBScript trong bộ cài**:
       + `Install_Edge_Framework.bat`: Xóa bỏ hoàn toàn "Phương án B: VBScript", chỉ giữ lại Phương án A (PowerShell Start-Process Hidden) và Phương án B (`start "" /B ...` native CMD).
       + Thay thế đoạn fallback UAC bằng VBScript: Nếu PowerShell UAC không mở được thì chuyển thẳng đến thông báo hướng dẫn người dùng chuột phải chọn `Run as administrator`, không tạo file `.vbs` nữa.
       + Loại bỏ đoạn fallback VBScript tương tự trong `Go_Cai_Dat_Dich_Vu.bat` và `fix_CO_SO_Fail_to_connect.bat`.
     - **Đồng bộ và đóng gói lại các gói cài đặt**:
       + Đồng bộ file đã sửa sang `D:\1.Download\Restaurant_Support_GPOS\`.
       + Đóng gói lại 2 file ZIP chuẩn sạch sẽ: `tools/packages/Restaurant_Support_GPOS.zip` và `tools/packages/Restaurant_Support_Agent_Full.zip`.
  4. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `>>> PASSED 100%`.
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.58s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật mới sạch sẽ.


- **TỐI ƯU HÓA PHÂN QUYỀN: ẨN CÁC NHÓM QUYỀN MỞ RỘNG BỊ TẠM KHÓA KHỎI DROPDOWN GÁN USER [2026-10-24]**:
  1. **Vấn Đề & Phản Ánh Người Dùng**:
     - Trong màn hình "Nhóm Quyền & Phân Quyền Chi Tiết", một số nhóm quyền mở rộng đã được chuyển trạng thái "Tạm khóa" (`active = False`, ví dụ: `#4 - HELPDESK_DEFAULT`, `#7 - APP_DEFAULT`).
     - Tuy nhiên khi mở Modal Tạo mới hoặc Chỉnh sửa Người dùng, tại ô Dropdown "Nhóm quyền mở rộng (Chi tiết quyền cột & hạ tầng)", hệ thống vẫn nạp ra danh sách tất cả các nhóm gồm cả các nhóm đã bị tạm khóa, khiến người quản trị dễ bấm chọn nhầm vào nhóm không còn áp dụng.
  2. **Giải Pháp Đã Xử Lý**:
     - Cập nhật `UsersPage.tsx`:
       + Tạo mới user (`createRoleOptions`): Lọc bỏ hoàn toàn các nhóm có `active === false`, chỉ hiển thị các nhóm đang `Hoạt động`.
       + Chỉnh sửa user (`editRoleOptions`): Chỉ hiển thị các nhóm đang `Hoạt động`. Nếu user đó vốn đang mang một nhóm cũ bị khóa thì vẫn hiển thị để giữ nguyên trạng thái kèm hậu tố `(Tạm khóa)` cảnh báo rõ ràng, còn các nhóm bị khóa khác không liên quan sẽ bị ẩn hoàn toàn.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 9.32s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật mới sạch sẽ.


- **BỔ SUNG TÍNH NĂNG XÓA VĨNH VIỄN NHÓM QUYỀN MỞ RỘNG (DÀNH RIÊNG CHO SUPER ADMIN) [2026-10-24]**:
  1. **Yêu Cầu & Bối Cảnh Người Dùng**:
     - Cho phép xóa các nhóm quyền mở rộng (trong tab 'Nhóm Quyền & Phân Quyền Chi Tiết') dành riêng cho quyền Super Admin.
     - Điều kiện bắt buộc: Nhóm quyền đó phải không còn user nào đang sử dụng (`user_count == 0`) và đã được chuyển sang trạng thái tắt kích hoạt (`active == False` / Tạm khóa).
  2. **Giải Pháp Đã Xử Lý Toàn Diện (Backend & Frontend)**:
     - **Backend (`role_service.py` & `roles.py`)**:
       + Bổ sung endpoint `DELETE /api/v1/roles/{role_id}` được bảo vệ nghiêm ngặt bằng dependency `require_super_admin`.
       + Kiểm tra phòng thủ (Defense in Depth):
         * Bảo vệ bất biến: Tuyệt đối không cho phép xóa nhóm `Administrator` (ID = 1).
         * Kiểm tra trạng thái: Nếu nhóm đang `Hoạt động` (`active = True`), từ chối và yêu cầu chuyển sang `Tạm khóa` trước.
         * Kiểm tra người dùng: Nếu vẫn còn bất kỳ tài khoản nào mang `quyen_mo_rong` của nhóm này (`user_count > 0`), từ chối xóa và báo rõ số lượng tài khoản còn lại.
       + Khi thỏa mãn: Xóa sạch toàn bộ ma trận phân quyền của nhóm trong bảng `dbo.PHANQUYEN_DETAIL` (`id_quyen = str(role_id)`) và xóa bản ghi trong `dbo.LV_QUYEN`. Ghi log thao tác quản trị viên `Delete_Nhomquyen_morong`.
     - **Frontend (`roleService.ts` & `RolesPage.tsx`)**:
       + Thêm hàm `deleteRole(id)` vào `roleService`.
       + Trong danh sách Nhóm Quyền bên trái:
         * Chỉ hiển thị icon thùng rác `Trash2` khi người đăng nhập là **Super Admin** (`isSuperAdminUser`).
         * Khi nhóm thỏa điều kiện (`!r.active && r.user_count === 0`): Icon thùng rác sáng đỏ `#EF4444`, hover nổi bật, click mở Modal xác nhận.
         * Khi chưa thỏa điều kiện (đang Hoạt động hoặc còn tài khoản): Icon mờ nhạt (disabled, `opacity: 0.3`) kèm tooltip giải thích chi tiết lý do vì sao chưa thể xóa.
       + Bổ sung Modal Xác Nhận Xóa Vĩnh Viễn: Cảnh báo tên nhóm, mã nhóm, ghi chú hành động không thể hoàn tác và xóa sạch ma trận quyền chi tiết.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `>>> PASSED 100%`, Backend daemon port 8000 đã reload nạp endpoint mới.
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 4.02s`), thư mục `frontend/dist/` (kèm `web.config`) cập nhật mới sạch sẽ.

- **KHẮC PHỤC TRIỆT ĐỂ LỖI TỰ ĐỘNG GÁN G-PROCESS CHO DUNG.NGUYENANH & BỔ SUNG ĐIỀU KIỆN CHẶN TỰ GÁN [2026-10-24]**:
  1. **Yêu Cầu & Bối Cảnh Người Dùng**:
     - Khi chạy tác vụ tự động đóng ticket 3CX và G-Process hàng loạt (Cron hoặc thủ công), các nhiệm vụ G-Process chưa gửi tới `dung.nguyenanh` (chưa phân công người thực hiện, đang ở hàng đợi/pool hoặc đang phân công cho người khác) bị hệ thống tự động gán cho `dung.nguyenanh`.
     - Yêu cầu xử lý triệt để: Bổ sung điều kiện bắt buộc, những nhiệm vụ nào chưa gán đích danh cho `dung.nguyenanh` thì **tuyệt đối đừng tự gán cho `dung.nguyenanh`** và không được can thiệp đóng.
  2. **Nguyên Nhân Gốc Rễ (Root Cause)**:
     - **Ở khâu quét danh sách (`_fetch_gprocess_mission_list`)**:
       + Khi bắt API `https://process-gpms.ggg.com.vn/api/v1/list-my-task`, code cũ chỉ kiểm tra tên nhiệm vụ có chứa "xác nhận lỗi kỹ thuật" hoặc `step_id == 11702`. Hoàn toàn bỏ quên việc kiểm tra người thực hiện (`assignee`), dẫn đến việc lấy cả các nhiệm vụ chưa gán (unassigned) hoặc gán cho người khác/nhóm chung trong API.
       + Code cũ còn tự gán cứng trường `"assignee": username or "dung.nguyenanh"`.
     - **Hậu quả dây chuyền khi đóng nhiệm vụ (`_close_gprocess_mission`)**:
       + Các nhiệm vụ chưa gán lọt vào danh sách đóng. Khi mở URL `https://gpms.ggg.com.vn/g-process/my-mission/{m_id}`, trình duyệt đang đăng nhập SSO của `dung.nguyenanh`. Khi script tự động tick "Không đạt", điền feedback, tick "Không phê duyệt", "Kết thúc quy trình" và click "Xác nhận", hệ thống GPMS tự động gán người submit bước này (`dung.nguyenanh`) làm Người thực hiện chính thức!
  3. **Giải Pháp Phòng Vệ Đa Tầng (Multi-layer Defense)**:
     - **Lớp 1 - Lọc nghiêm ngặt từ khâu quét danh sách (`_fetch_gprocess_mission_list`)**:
       + Xây dựng bộ lọc kiểm tra người thực hiện: Trích xuất toàn diện các trường `assignee`, `executor`, `assigned_user`, `current_assignee`, `handler`, `implementer`, `assignees`... từ API JSON.
       + Đồng thời đọc trước bảng HTML trên trang GPMS (`tbody tr`) để lấy cột 4 (Người thực hiện) đối chiếu 100% với giao diện thực tế.
       + Nhận diện các dấu hiệu chưa gán: Rỗng, `-`, `—`, `+`, `chưa gán`, `chua gan`, `chưa phân công`, `chua phan cong`, `chưa tiếp nhận`, `chua tiep nhan`, `gán người`, `gan nguoi`, `nhóm it`, `bộ phận it`... -> **BỎ QUA NGAY (SKIP)**, tuyệt đối không đưa vào danh sách đóng.
       + Nhận diện gán cho người khác: Nếu Người thực hiện không chứa `dung.nguyenanh`, `Nguyễn Anh Dũng` (hoặc username truyền vào) -> **BỎ QUA NGAY (SKIP)**.
       + Chỉ ghi nhận nhiệm vụ khi xác định đích danh người thực hiện là `dung.nguyenanh`.
     - **Lớp 2 - Kiểm tra phòng vệ tuyệt đối trước khi thao tác form (`_close_gprocess_mission`)**:
       + Ngay sau khi mở trang chi tiết nhiệm vụ, trước khi click bất kỳ nút nào trên form:
         * Kiểm tra sự xuất hiện của nút "Tiếp nhận" / "Nhận việc" / "Claim": Nếu có, chứng minh nhiệm vụ chưa được tiếp nhận bởi cá nhân -> **DỪNG NGAY LẬP TỨC**, ghi log cảnh báo và trả về trạng thái `skipped`, không tự gán.
         * Quét thông tin "Người thực hiện" hiển thị trên trang chi tiết: Nếu là chưa gán hoặc là người khác -> **DỪNG NGAY LẬP TỨC**, trả về `skipped`, tuyệt đối không click "Không đạt" hay "Xác nhận".
  4. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Backend: Viết unit test xác thực 9 test cases (`test_assignee_filter.py`), đạt kết quả pass 100%. `python -m compileall app` sạch lỗi, Smoke Test pass 100%.
     - Khởi động lại Backend daemon port 8000 sạch sẽ.
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`dist/` kèm `web.config` cập nhật mới).

- **TRIỂN KHAI PHÂN HỆ GIAO DIỆN ĐIỆN THOẠI RIÊNG (MOBILE PORTAL) & NÂNG CẤP BẬT/TẮT KDS TOÀN NHÀ HÀNG [2026-10-25]**:
  1. **Yêu Cầu & Bối Cảnh Nghiệp Vụ Người Dùng**:
     - Cần một giao diện riêng biệt (Mobile Portal / Model view) khi người dùng đăng nhập bằng điện thoại di động (hoặc viewport di động).
     - **Quy tắc phân quyền độc quyền**: Màn hình này là một quyền riêng (`mobile_dedicated_view`). **Chỉ Super Admin hoặc `dung.nguyenanh` mới có quyền truy cập mặc định và có quyền phân bổ quyền này cho các User/Role khác**. Nếu tài khoản chưa được cấp quyền này, khi đăng nhập trên điện thoại vẫn chỉ hiển thị giao diện web bình thường (`/restaurants`).
     - **Giao diện tối giản chuẩn Mobile**:
       + Ban đầu không load trước danh sách nhà hàng; chỉ có **1 ô search duy nhất** ở phía trên cùng.
       + Khi người dùng nhập từ khóa tìm kiếm (mã SAP, tên nhà hàng, IP, RK7...), kết quả hiển thị dạng Card dọc theo từng nhà hàng.
       + Mỗi Card mặc định **chỉ ưu tiên hiển thị đúng 4 dòng thông tin chính**:
         * **Dòng 1: Tên Nhà Hàng** : `5096 Ashima Forest Thiso Mai Chí Thọ (RK7: 1013) 10.8.160.x` (kết hợp SAP, Tên, RK7 và dải Subnet IP đuôi `.x`).
         * **Dòng 2: Email** : Địa chỉ email nhà hàng kèm nút sao chép 1 chạm và link gửi mail (tuân thủ phân quyền).
         * **Dòng 3: Mật khẩu OU (Không sys)** : Mật khẩu OU với nút ẩn/hiện mắt (`••••••••` / text) và nút sao chép (tuân thủ che dữ liệu theo phân quyền).
         * **Dòng 4: Các chức năng cần xử lý** : Nút bấm thao tác nhanh `⚡ Cấu Hình Phân Quyền & Bật / Tắt KDS Toàn Nhà Hàng`.
         * **Dòng 5: Xem chi tiết... ▼ / Thu gọn ▲** : Nút bấm mở rộng/thu gọn. Khi bấm vào mới hiển thị các trường còn thiếu (SAP, RK7, Cost Center/Oracle, IP LAN, IP WAN, Remote TV/RustDesk các máy POS/PC, FTTH, SĐT gọi trực tiếp, Địa chỉ, Ghi chú, Nút xem chi tiết chuyên sâu).
     - **Nâng Cấp Tính Năng "Cấu Hình Phân Quyền & Bật / Tắt KDS Toàn Nhà Hàng"**:
       + Bổ sung chức năng: **Tắt hết món không cho ẩn** (chính là tham số `ALLOW_HIDE_ITEM_GROUP` trong `G_ORDER.APP_PARAM`). Khi BẬT (`status: 1`): Cho phép ẩn món theo nhóm trên Tablet/POS. Khi TẮT (`status: 0`): Khóa tính năng, tắt hết món không cho ẩn theo nhóm.
       + Hỗ trợ chọn kết nối MongoDB: Nếu nhà hàng có nhiều trạm POS (Server `.11`, POS `.12`...), cho phép kỹ thuật viên chọn đúng kết nối MongoDB `.11` hoặc `.12` ngay trên popup.
       + Đồng bộ tính năng này lên Web tại menu: `Các Tính Năng KDS ▾` -> `Cấu Hình Phân Quyền & Bật / Tắt KDS Toàn Nhà Hàng`.
  2. **Giải Pháp & Kiến Trúc Kỹ Thuật Đã Triển Khai**:
     - **Backend (Python / FastAPI / MongoDB Service)**:
       + `backend/app/schemas/mongodb.py`: Thêm các trường `allow_hide_item_group_status`, `allow_hide_item_group_enabled`, `allow_hide_item_group_value` vào `KdsRoleUsersResponse`.
       + `backend/app/services/mongodb_service.py`:
         * Mở rộng `get_kds_role_users` để truy vấn thêm tham số `ALLOW_HIDE_ITEM_GROUP` từ `G_ORDER.APP_PARAM`.
         * Bổ sung hàm `toggle_allow_hide_item_group(host, status, port)`: Cập nhật `status` (1/0) và `value` ('1'/'0') vào MongoDB và ghi audit log.
       + `backend/app/api/v1/mongodb.py`: Thêm endpoint `PUT /api/v1/mongodb/kds/allow-hide-item-group/toggle`.
       + `backend/app/services/auth_service.py` & `role_service.py`:
         * Đăng ký mã quyền `mobile_dedicated_view`, `view_mobile_dedicated_view`, `update_mobile_dedicated_view` vào `ALL_PERMISSIONS` và `BASE_PERMISSION_DEFINITIONS`.
         * Trong `get_user_permissions`: Super Admin và `dung.nguyenanh` bypass; đối với Admin thường thì mặc định `mobile_dedicated_view = False` (chỉ có khi được phân quyền cụ thể trong `PHANQUYEN_DETAIL`).
     - **Frontend (React 18 / TypeScript / Vite)**:
       + `frontend/src/services/mongoService.ts`: Bổ sung `toggleAllowHideItemGroup(host, status, port)` và cập nhật interface `KdsRoleUsersResponse`.
       + `frontend/src/pages/app/KdsQuayModals.tsx` (`KdsRoleUserModal`):
         * Bổ sung Card thứ 3: `ALLOW_HIDE_ITEM_GROUP` hiển thị trạng thái và nút "Tắt Hết Món Không Cho Ẩn" / "Bật Cho Phép Ẩn Món Theo Nhóm".
         * Bổ sung thanh chọn MongoDB (`candidateHosts` `.11` / `.12`) với hiển thị host đang kết nối và nút chuyển đổi tức thì.
       + `frontend/src/pages/app/RestaurantMongoAnalysisPage.tsx`: Cập nhật menu tính năng số 4 thành `Cấu Hình Phân Quyền & Bật / Tắt KDS Toàn Nhà Hàng`.
       + `frontend/src/utils/authUtils.ts`:
         * Bổ sung logic kiểm tra quyền `mobile_dedicated_view` trong `hasNewScreenAccess` (chỉ Super Admin hoặc `dung.nguyenanh` mặc định có quyền).
         * Bổ sung hàm tiện ích `isMobileDevice()`.
       + `frontend/src/pages/admin/RolesPage.tsx`: Khai báo `mobile_dedicated_view` vào `BASE_LABELS`, thiết lập bảo mật chỉ Super Admin hoặc `dung.nguyenanh` mới nhìn thấy dòng này trong ma trận để phân quyền cho người khác.
       + `frontend/src/pages/mobile/MobileRestaurantPage.tsx`: Tạo mới toàn bộ trang Mobile Portal tối giản 100%, gồm thanh Header di động, 1 ô search duy nhất, kết quả Card dọc 4 dòng ưu tiên, mở rộng chi tiết và modal KDS.
       + `frontend/src/routes/AppRoutes.tsx` & `LoginPage.tsx`: Thêm route `/mobile` được bảo vệ bằng `ProtectedRoute requiredPermission="mobile_dedicated_view"`. Tự động điều hướng khi đăng nhập trên di động nếu có quyền.
       + `frontend/src/components/layout/Header.tsx` & `Sidebar.tsx`: Bổ sung nút chuyển đổi qua lại giữa Mobile Portal và Desktop Web.
  3. **Kiểm Thử & Đóng Gói (Copy Là Chạy Ngay)**:
     - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `>>> PASSED 100%`, Backend daemon port 8000 đã reload chạy bản mới.
     - Frontend: `cmd /c "npm run build"` đạt exit code 0 (`✓ built in 10.55s`), tạo mới bản build hoàn chỉnh trong `frontend/dist/` (kèm `web.config` rewrite cho IIS).

---

### [2026-10-25] - Khắc Phục Tự Động Điều Hướng Sang Giao Diện Mobile Portal (/mobile) Khi Truy Cập Bằng Điện Thoại
- **Hiện tượng & Báo cáo người dùng**:
  - Người dùng truy cập bằng trình duyệt Chrome trên điện thoại Android (IP server port 5001) nhưng màn hình lại hiển thị giao diện bảng dữ liệu Web Desktop (/restaurants) với đầy đủ các nút '+ Thêm Nhà Hàng', 'Xuất Excel', 'Cài Đặt VNC / KDS', bảng nhiều cột... thay vì giao diện Mobile Portal (/mobile) dạng thẻ tối giản.
- **Nguyên nhân gốc rễ**:
  - Trước đây luồng tự động chuyển sang `/mobile` chỉ được kích hoạt trong `LoginPage.tsx` tại thời điểm submit đăng nhập.
  - Khi người dùng đã đăng nhập sẵn từ trước (JWT lưu trong localStorage) hoặc tải lại trang, mở tab cũ hay truy cập vào trang chủ `/`:
    + Route index `/` trong `AppRoutes.tsx` trước đây chuyển cứng sang `<Navigate to="/restaurants" replace />`.
    + Trang `RestaurantListPage.tsx` khi mount trên điện thoại không có cơ chế phát hiện thiết bị để điều hướng sang `/mobile`.
- **Giải pháp & Triển khai triệt để**:
  1. **Tạo `IndexRedirect` trong `AppRoutes.tsx`**:
     - Khi truy cập vào trang chủ `/`, hệ thống tự động kiểm tra: Nếu là thiết bị di động (`isMobileDevice()`) và tài khoản có quyền Mobile Portal (`hasNewScreenAccess(user, 'mobile_dedicated_view')`) đồng thời không có cờ muốn xem bản máy tính (`sessionStorage.getItem('prefer_desktop') !== 'true'`), hệ thống **tự động chuyển hướng ngay sang `/mobile`**.
  2. **Tự động chuyển hướng tại `RestaurantListPage.tsx`**:
     - Bổ sung `useEffect` kiểm tra ngay khi trang Danh Sách Nhà Hàng mount: Nếu phát hiện đang mở trên mobile và có quyền mà không có cờ `prefer_desktop`, tự động chuyển hướng sang `/mobile`.
     - Nếu người dùng chủ động chọn xem bản Desktop trên mobile (`prefer_desktop === 'true'`), hiển thị thanh banner thông báo trang nhã trên đầu: `📱 Đang xem bản Web máy tính trên điện thoại. [📱 Về Mobile Portal]` để người dùng có thể quay lại giao diện Mobile bất kỳ lúc nào chỉ bằng 1 chạm.
  3. **Quản lý cờ `prefer_desktop` thông minh**:
     - Trong `MobileRestaurantPage.tsx`: Khi người dùng bấm nút `[💻 Desktop]`, gán `sessionStorage.setItem('prefer_desktop', 'true')` trước khi chuyển sang `/restaurants`.
     - Trong `Header.tsx` (nút icon `[📱]`) và `Sidebar.tsx` (mục `Mobile Portal`): Khi người dùng bấm để vào lại Mobile Portal, tự động xóa cờ `sessionStorage.removeItem('prefer_desktop')`.
     - Trong `LoginPage.tsx`: Tự động xóa cờ `prefer_desktop` khi đăng nhập mới.
     - Trong `authUtils.ts`: Cho phép Quản trị viên (Super Admin và Admin) mặc định có quyền `mobile_dedicated_view` chuẩn theo Rule 10.
- **Kiểm thử & Đóng gói**:
  - Frontend: `cmd /c "npm run build"` exit code 0 (`✓ built in 4.51s`), thư mục `frontend/dist/` sạch sẽ sẵn sàng triển khai.
  - Backend: `python -m compileall app` sạch lỗi 100%, Smoke Test `>>> BACKEND PASSED 100%`.
