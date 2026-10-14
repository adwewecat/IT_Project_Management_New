# Hướng Dẫn Cài Lại Môi Trường Khi Cài Lại Windows (1-Click Setup)

Tài liệu hướng dẫn khôi phục toàn bộ môi trường và thư viện dự án **IT Project Management New** nhanh chóng, chỉ cần 3 bước đơn giản:

---

### Bước 1: Cài đặt 2 công cụ nền tảng (nếu máy mới tinh chưa có)
1. **Python 3.10 hoặc 3.14**:
   - Tải từ trang chủ: [https://www.python.org/downloads/](https://www.python.org/downloads/)
   - ⚠️ **LƯU Ý QUAN TRỌNG KHI CÀI**: Ở màn hình đầu tiên, **bắt buộc tick chọn ô "Add python.exe to PATH"** trước khi bấm Install.
2. **Node.js (Bản LTS v20 hoặc v24)**:
   - Tải từ trang chủ: [https://nodejs.org/](https://nodejs.org/)
   - Cài đặt mặc định Next $\rightarrow$ Next $\rightarrow$ Finish.

---

### Bước 2: Chạy file cài đặt tự động (1-Click)
- Vào thư mục dự án hoặc thư mục `D:\Setup\`:
  👉 **Nhấp đúp chuột vào file: `Cai_Dat_Full_Moi_Truong_Du_An.bat`**
- File này sẽ tự động 100%:
  1. Tạo môi trường ảo `backend/.venv`.
  2. Cài đặt toàn bộ thư viện Python trong `backend/requirements.txt` (FastAPI, PyMongo, PyODBC, SQLAlchemy, PyJWT, Bcrypt...).
  3. Cài đặt trình quản lý gói `pnpm` toàn cục.
  4. Cài đặt toàn bộ thư viện Frontend (React 19, Vite, Lucide-icons, Axios...).
  5. Tự động kiểm tra và chuẩn hóa thư mục Scrcpy (KDS).

---

### Bước 3: Khởi động dự án
Sau khi chạy xong bước 2, bạn chỉ cần nhấp đúp vào:
- **`start_all.bat`**: Mở đồng thời cả Backend (`http://localhost:8000/docs`) và Frontend (`http://localhost:5173`).
- Hoặc chạy riêng: `start_backend.bat` / `start_frontend.bat`.

---

### Bước 4 (Tùy chọn): Kết nối KDS / VNC từ xa
Nếu cần dùng tính năng điều khiển từ xa KDS và POS:
1. **Scrcpy (KDS Bếp)**: Giải nén bộ cài Scrcpy vào đúng vị trí `C:\scrcpy` (đảm bảo có file `C:\scrcpy\scrcpy.exe`).
2. **TightVNC (Màn hình POS / Quản lý)**: Cài TightVNC tại `C:\Program Files\TightVNC\tvnviewer.exe`.
3. **Đăng ký Protocol**: Nhấp đúp vào file `vnc_scrcpy_protocol.reg` (tải trên web hoặc trong Setup) để đăng ký giao thức cho Windows.
