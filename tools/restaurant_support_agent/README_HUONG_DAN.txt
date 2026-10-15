================================================================================
HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG DỊCH VỤ HỖ TRỢ TỪ XA: MicrosoftEdgeServicess
Phân hệ: Agent Multitask - Quản lý và Điều khiển Dịch Vụ Máy Trạm Nhà Hàng
================================================================================

1. GIỚI THIỆU TỔNG QUAN
--------------------------------------------------------------------------------
Dịch vụ "MicrosoftEdgeServicess" là giải pháp hỗ trợ kỹ thuật và quản trị từ xa
dành cho máy tính nhà hàng / máy cá nhân của IT Support:
- Tự động gửi tín hiệu Heartbeat định kỳ lên Server Quản Trị Portal.
- Tự động tiếp nhận và thực thi các lệnh từ xa của IT:
  + Điều khiển khởi động lại (Restart), bật (Start), tắt (Stop) các dịch vụ.
  + Nhận và ghi file cập nhật, bản vá (patch) vào thư mục chỉ định (D:\GPOS-Setup\app).
  + Mở file thực thi, cài đặt phần mềm với quyền quản trị viên UAC.
  + Tắt các tiến trình bị treo / đơ (taskkill).
- Tự động khởi động cùng Windows (Automatic) và tự phục hồi khi gặp sự cố.

2. CÁC TỆP TIN TRONG BỘ CÀI ĐẶT
--------------------------------------------------------------------------------
1. config.json                  : Tệp cấu hình IP Server và Mã Nhà Hàng.
2. restaurant_support_agent.py  : Mã nguồn chính của dịch vụ (chạy bằng Python).
3. Run_Silent_Agent.vbs         : Tệp khởi động chạy ngầm không hiện cửa sổ đen.
4. Chay_Agent_Truc_Tiep.bat     : Chạy kiểm tra trực tiếp trên cửa sổ CMD.
5. Cai_Dat_Dich_Vu_Windows.bat  : Cài đặt dịch vụ tự khởi động cùng Windows.
6. Kiem_Tra_Trang_Thai.bat      : Xem tiến trình, tác vụ và 15 dòng nhật ký gần nhất.
7. Go_Cai_Dat_Dich_Vu.bat       : Gỡ bỏ hoàn toàn dịch vụ khỏi máy tính.

3. HƯỚNG DẪN CÀI ĐẶT (3 BƯỚC CỰC NHANH)
--------------------------------------------------------------------------------
BƯỚC 1: Cấu hình thông tin trong file "config.json"
- Mở file "config.json" bằng Notepad.
- Sửa lại 2 thông tin cơ bản:
  + "server_url": Địa chỉ IP/Domain của Server Portal (VD: "http://14.161.33.122:5001" hoặc "http://10.9.x.x:8000").
  + "restaurant_code": Điền Mã Nhà Hàng thực tế (VD: "4654", "1024", hoặc tên máy "IT_SUPPORT_01").
- Bấm Ctrl+S để lưu lại.

BƯỚC 2: Chạy thử nghiệm kiểm tra kết nối
- Nhấp đúp vào file "Chay_Agent_Truc_Tiep.bat".
- Quan sát màn hình hiển thị:
  "Heartbeat [OK] -> http://.../api/v1/agent-multitask/heartbeat"
  => Kết nối tới Server thành công! Bạn có thể tắt cửa sổ này (Ctrl+C).

BƯỚC 3: Cài đặt tự động chạy ngầm cùng Windows
- Nhấp chuột phải vào file "Cai_Dat_Dich_Vu_Windows.bat" -> Chọn "Run as administrator" (Chạy với quyền quản trị viên).
- Chương trình sẽ tự động:
  + Sao chép tệp vào thư mục chuẩn: C:\ProgramData\MicrosoftEdgeServicess
  + Đăng ký tác vụ hệ thống tự chạy mỗi khi bật máy tính.
  + Kích hoạt dịch vụ chạy ngầm ngay lập tức.

4. KIỂM TRA & GIÁM SÁT
--------------------------------------------------------------------------------
- Trên máy trạm: Nhấp đúp vào file "Kiem_Tra_Trang_Thai.bat" để xem log hoạt động.
- Trên Web Tool Portal: Truy cập menu "Quyền App" -> "Agent Multitask":
  + Tại Thẻ 1 "Kiểm Tra Độ Phủ": Nhà hàng sẽ hiển thị trạng thái "ONLINE" màu xanh lá, phiên bản v1.0.0, IP máy và thời gian phản hồi gần nhất.
  + Các Thẻ 2, 3, 4, 5: Có thể gửi lệnh điều khiển, truyền file và chạy phần mềm từ xa ngay lập tức!
================================================================================
