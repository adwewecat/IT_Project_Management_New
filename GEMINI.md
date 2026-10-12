# CẨM NANG TOÀN DIỆN VỀ KIẾN TRÚC, QUY ĐỊNH & TIÊU CHUẨN DỰ ÁN IT PROJECT MANAGEMENT

> **Tài liệu đặc tả kỹ thuật và quy định khắt khe dành cho AI Coding Assistant & Developer**  
> *Khi bắt đầu một phiên làm việc mới hoặc chuyển sang môi trường máy mới, hãy đọc toàn bộ tài liệu này trước khi tiếp nhận và thực hiện bất kỳ yêu cầu nào.*

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
  4. **4. Cấu hình Ẩn Hiện Món (`dish_show_hide`)**: Ẩn/hiện trên QrOrder, CO, SO.
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

---

## 7. QUY CHUẨN VIẾT CODE BACKEND

1. **Tương thích Python 3.10**:
   - Luôn đặt dòng sau ở đầu tất cả các file backend trong `api/`, `services/`, `schemas/`:
     ```python
     from __future__ import annotations
     ```
2. **Import đầy đủ Schema**:
   - Mọi schema dùng làm type hint hoặc `response_model` trong router FastAPI phải được import tường minh, không để `NameError` khi khởi động app.
3. **Audit Log Thao Tác**:
   - Mọi thao tác sửa/xóa/đổi cấu hình quan trọng đều ghi nhận vào bảng `AuditLog` (trừ khi là Super Admin).
4. **Kiểm tra cú pháp Python nhanh**:
   ```powershell
   & .\.venv\Scripts\python.exe -c "from app.main import app; print('OK')"
   ```
5. **Quy Chuẩn Tự Động Khởi Tạo Bảng & Cập Nhật `Full_SCRIPT_SQL_TABLE.sql` (BẮT BUỘC)**:
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
