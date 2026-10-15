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
     - **Gom Gọn Toolbar KDS**: Chỉ giữ lại các nút trọng tâm: `⚙️ Các Tính Năng KDS ▾` (mở popup chứa Thêm quầy, Chuyển món, Cấu hình quầy & máy in, Phân quyền, Phân quyền hàng loạt, Toggle KDS Master, Đồng nhất nhóm bếp theo quầy) và `📋 Logs KDS (Order & Ra Món)` (nút Đồng Nhất Nhóm Theo Quầy gom gọn hoàn toàn vào trong menu Các Tính Năng để toolbar ngoài luôn tinh gọn, không thừa nút).
     - **⚡ Đồng Nhất Nhóm Bếp Theo Quầy (`sync_kds_groups_by_quays`)**: Tự động đồng bộ `groupTypeKds` của tất cả món ăn theo đúng Tên Quầy Bếp (places), chuẩn hóa bỏ dấu tiếng Việt và dấu cách thay bằng `_` (VD: 'Quầy Thịt' -> `Quay_Thit`, 'Quầy Nóng' -> `Quay_Nong`). Những món chưa được gán Quầy Bếp (ACCOUNT) thì nhóm bếp cập nhật lại để trống, xóa bỏ hoàn toàn nhóm rác mặc định "Bếp Nóng & Nướng" hay "ALL".
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



