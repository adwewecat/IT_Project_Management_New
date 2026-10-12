# IT_Project_Management_New (Cổng Thông Tin & Quản Trị Vận Hành IT)

Hệ thống quản lý dự án, vận hành nhà hàng, tích hợp tổng đài 3CX Hotline, giám sát hệ thống và tự động hóa tác vụ IT toàn diện.

---

## 📌 1. Giới Thiệu & Kiến Trúc Dự Án

- **Backend**: Python FastAPI (Async), SQLAlchemy ORM, Uvicorn, SQL Server (`pyodbc`).
- **Frontend**: React 18, TypeScript, Vite, Vanilla CSS Design System hiện đại (Dark/Light mode linh hoạt, không giới hạn khung màn hình).
- **Automation Tools & Background Agents**:
  - `tools/3cx_hotline_agent`: Agent chạy ngầm giám sát cửa sổ cuộc gọi 3CX Desktop/PWA và đẩy webhook tới server theo thời gian thực.
  - `tools/3cx_chrome_extension`: Tiện ích mở rộng Chrome bắt sự kiện cuộc gọi 3CX WebClient.
  - `tools/outlook_agent`: Tool đọc và phân loại Mail Memo từ Outlook tự động.
  - Kịch bản tự động hóa Playwright quét và đóng ticket hàng loạt (GProcess / Helpdesk).

---

## 🚀 2. Hướng Dẫn Chạy Dự Án

### Khởi động nhanh (Windows):
- Chạy cả hệ thống: Chạy file `start_all.bat`.
- Khởi động Backend (Port 5002): Chạy `start_backend.bat`.
- Khởi động Frontend (Vite Dev Server): Chạy `start_frontend.bat`.
- Khởi động Production (Backend phục vụ trực tiếp Frontend build): `start_production_5002.bat`.

### Triển khai & Cài đặt:
- **Backend**:
  ```powershell
  cd backend
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  python -m uvicorn app.main:app --host 0.0.0.0 --port 5002 --reload
  ```
- **Frontend**:
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```

---

## 🛡️ 3. Quy Tắc & Quy Chuẩn Phát Triển (BẮT BUỘC)

> ⚠️ **ĐIỀU KIỆN TIÊN QUYẾT BẮT BUỘC DÀNH CHO AI & DEVELOPER**:
> 
> 1. **Đồng bộ GitHub ngay lập tức (`origin/main`)**:
>    - Repository: `https://github.com/adwewecat/IT_Project_Management_New.git`
>    - **Mỗi lần thêm tính năng mới, chỉnh sửa logic, cập nhật giao diện hoặc sửa lỗi, BẮT BUỘC phải commit và push lên GitHub ngay lập tức**.
>    - Không được kết thúc lượt làm việc khi code chưa được push đồng bộ lên GitHub.
> 
> 2. **Ghi nhật ký thay đổi (Changelog)**:
>    - Mọi cập nhật bắt buộc phải được ghi chép vào `Script/README.md` tại mục **"LỊCH SỬ THAY ĐỔI & NHẬT KÝ NÂNG CẤP (CHANGELOG)"**.
> 
> 3. **Cơ chế Phân quyền hiển thị**:
>    - Nếu tài khoản không có quyền xem trường thông tin, ô dữ liệu vẫn hiển thị kèm nhãn `🔒 Bị ẩn theo phân quyền`, tuyệt đối không ẩn cả dòng/cột.
> 
> 4. **Tự động khởi tạo Database**:
>    - Mọi model SQL Server mới đều phải đăng ký vào hàm `lifespan` tại `backend/app/main.py` và lưu trữ DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`.

Chi tiết tài liệu hướng dẫn kỹ thuật: Xem [GEMINI.md](GEMINI.md), [AGENTS.md](AGENTS.md) và [PROJECT_GUIDELINES.md](PROJECT_GUIDELINES.md).
