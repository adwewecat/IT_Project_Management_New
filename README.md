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
- Khởi động Backend (Port 8000): Chạy `start_backend.bat`.
- Khởi động Frontend (Vite Dev Server Port 5173): Chạy `start_frontend.bat`.
- Khởi động Production (Port 5001): `start_production_5001.bat`.

### Triển khai & Cài đặt:
- **Backend**:
  ```powershell
  cd backend
  .\.venv\Scripts\Activate.ps1
  pip install -r requirements.txt
  python run.py
  ```
- **Frontend**:
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```

---

## 🛡️ 3. Quy Tắc Bất Di Bất Dịch Cho AI & Developer (BẮT BUỘC TUÂN THỦ)

> ⚠️ **6 NGUYÊN TẮC CỐT LÕI BẤT BIẾN (IMMUTABLE RULES)**:
> 
> 1. **Kiểm tra và Đọc toàn bộ các file `.md` trước khi làm**:
>    - Luôn đọc `README.md`, `GEMINI.md`, `PROJECT_GUIDELINES.md` và `Script/README.md` trước khi tiếp nhận hoặc can thiệp bất kỳ mã nguồn nào để nắm rõ toàn cảnh hệ thống.
> 
> 2. **Lưu vết và Cập nhật `GEMINI.md` & `Script/README.md`**:
>    - Trước và sau khi làm mới hay sửa bất kỳ vấn đề gì, **BẮT BUỘC PHẢI NOTE VÀ LƯU LẠI**.
>    - Mục đích tối thượng: Khi cài lại Windows hoặc đổi máy tính, Gemini, AI hoặc Developer khác đọc vào đều nắm bắt được toàn bộ dự án và biết chính xác phải làm gì tiếp theo mà không bị đứt đoạn.
> 
> 3. **Tuân thủ sát sao quy tắc của dự án**:
>    - Phân quyền hiển thị dữ liệu: Trường không có quyền xem phải hiển thị `🔒 Bị ẩn theo phân quyền`, không ẩn cả dòng/cột.
>    - UI/UX: Không tạo khối thẻ thống kê to (stat cards) ở đầu trang; giao diện co giãn full-width; modal đóng bằng Esc/X; hỗ trợ Mobile-Ready 100%.
>    - Tự động tạo bảng DB trong `lifespan` (`backend/app/main.py`) và cập nhật DDL vào `Script/Full_SCRIPT_SQL_TABLE.sql`.
> 
> 4. **Build code hoàn toàn sạch sẽ (Clean Code)**:
>    - Bỏ đi triệt để code dư thừa, import rác, biến không sử dụng (Zero warnings/errors TypeScript TS6133).
>    - Chỉ bàn giao khi Frontend build exit code 0 (`cmd /c "npm run build"`) và Backend vượt qua Smoke Test (`python -c "from app.main import app; print('>>> PASSED 100%')"`).
> 
> 5. **Ghi chú (Comment) chi tiết trong code**:
>    - Mọi tính năng, hàm, logic nghiệp vụ đều phải được chú thích rõ ràng bằng tiếng Việt trong mã nguồn để khi đọc lại code ai cũng dễ dàng hiểu được.
> 
> 6. **Đẩy code lên GitHub ngay lập tức (`origin/main`)**:
>    - **Bất kỳ lúc nào thêm tính năng hoặc chỉnh sửa xong, BẮT BUỘC phải commit và push lên GitHub ngay lập tức**.
>    - Tuyệt đối không kết thúc lượt làm việc hay chuyển tác vụ khi code chưa được đồng bộ hoàn toàn lên GitHub repository:
>      ```cmd
>      git add .
>      git commit -m "Mô tả chi tiết tính năng hoặc chỉnh sửa"
>      git push origin main
>      ```

Chi tiết tài liệu hướng dẫn kỹ thuật: Xem [GEMINI.md](GEMINI.md), [AGENTS.md](AGENTS.md), [PROJECT_GUIDELINES.md](PROJECT_GUIDELINES.md) và [Script/README.md](Script/README.md).

