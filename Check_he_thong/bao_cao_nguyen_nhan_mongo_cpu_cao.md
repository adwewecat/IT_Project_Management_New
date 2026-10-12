# BÁO CÁO PHÂN TÍCH VÀ KẾT QUẢ TỐI ƯU MONGODB
**Server:** `10.9.62.12:27017`  
**MongoDB Version:** 6.0.2  
**Thời gian xử lý:** 02/10/2026 20:10 - 20:18  
**Thư mục làm việc:** `Check_he_thong/` (Hoàn toàn độc lập, không can thiệp code dự án)

---

## 1. NGUYÊN NHÂN GỐC RỄ BAN ĐẦU
1. **Lượng truy vấn lớn:** Dịch vụ Java KDS/POS cục bộ trên máy (`127.0.0.1`) gọi hơn **200 queries/giây**.
2. **Thiếu Index nghiêm trọng:**
   - Bảng **`G_KITCHEN.DISH_KDS`** chứa **124,154 bản ghi** nhưng **KHÔNG CÓ BẤT KỲ INDEX NÀO** ngoài `_id`.
   - Các truy vấn tìm kiếm món theo `lineGuid`, `id`, `submitTime` chạy liên tục và rơi vào **COLLSCAN** (quét toàn bộ 124,154 bản ghi).
   - Mỗi câu quét tốn **143 ms**, duyệt qua **124,156 documents**.
   - Hàng giây quét qua 1.200.000+ documents làm **nghẽn 100% công suất của 1 core CPU** (chiếm 40.1% tổng CPU máy).
   - Bảng **`G_ORDER.ORDER`** (8,292 bản ghi) cũng bị COLLSCAN theo `lstSession.lineGuid`.

---

## 2. CÁC INDEX ĐÃ ĐƯỢC TẠO THÀNH CÔNG

Đã thực hiện tạo các index sau ở chế độ an toàn (`background=True`):

1. **Database `G_KITCHEN`:**
   - `DISH_KDS` -> index `lineGuid` (`idx_lineGuid`) - Thời gian tạo: 0.71s
   - `DISH_KDS` -> index `id` (`idx_id`) - Thời gian tạo: 0.58s
   - `DISH_KDS` -> index `submitTime` (`idx_submitTime`) - Thời gian tạo: 0.79s
2. **Database `G_ORDER`:**
   - `ORDER` -> index `lstSession.lineGuid`, `status` (`idx_lstSession_lineGuid_status`) - Thời gian tạo: 0.24s
   - `CO_MENU_ITEM` -> index `code` (`idx_code`) - Thời gian tạo: 0.03s

---

## 3. KẾT QUẢ ĐO LƯỜNG THỰC TẾ (TRƯỚC VÀ SAU KHI TẠO INDEX)

| Tiêu chí | Trước khi tạo Index | Sau khi tạo Index | Cải thiện |
| :--- | :--- | :--- | :--- |
| **Execution Plan `DISH_KDS`** | `COLLSCAN` (quét toàn bộ bảng) | **`FETCH + IXSCAN`** (dùng Index) | Triệt tiêu quét bảng |
| **Số docs quét mỗi câu (`lineGuid`)** | **124,156 documents** | **Đúng 1 document** | **Giảm 99.999%** |
| **Thời gian chạy query (`lineGuid`)** | **143 ms** | **0 ms (< 1 ms)** | **Nhanh gấp >100 lần** |
| **Thời gian chạy query (`id`)** | **86 ms** | **0 ms (< 1 ms)** | **Nhanh gấp >80 lần** |
| **Số query COLLSCAN đang chờ (15s)** | **67 queries** nghẽn hàng đợi | **0 query** | **Sạch hoàn toàn** |
| **Hàng đợi khóa (Global Lock Queue)**| 2 readers chờ liên tục | **0 readers, 0 writers** | Không còn nghẽn |
| **CPU MongoDB Server** | **40.1% (nghẽn CPU)** | **Hạ xuống mức tối thiểu (<2%)** | Máy mượt trở lại |
