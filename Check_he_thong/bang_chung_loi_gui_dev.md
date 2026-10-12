# BẰNG CHỨNG KỸ THUẬT: LỖI THIẾU INDEX DẪN ĐẾN NGHẼN CPU TRÊN MONGODB (10.9.62.12:27017)

> **Mục đích:** Cung cấp log và số liệu đo lường trực tiếp từ MongoDB engine để gửi đội ngũ phát triển (Dev) đối soát và khắc phục triệt để trong source code.
> **Thời gian bắt log:** 02/10/2026 20:10:00 - 20:18:00 (Thời điểm máy POS/KDS chạm ngưỡng 95% CPU, MongoDB chiếm 40.1%).

---

## 1. TÓM TẮT VẤN ĐỀ (TL;DR)
1. Bảng **`G_KITCHEN.DISH_KDS`** tích lũy **124.154 documents**, nhưng trong database **chỉ có duy nhất 1 index mặc định là `_id_`**.
2. Service KDS (Java) gửi liên tục ~10-15 câu query/s với điều kiện `lineGuid` và `id`.
3. Do thiếu index, MongoDB rơi vào **`COLLSCAN` (quét tuần tự toàn bộ 124.154 bản ghi trong RAM)** cho từng câu lệnh.
4. **Hậu quả:** Mỗi câu tốn **143ms CPU**, mỗi giây duyệt qua **>1.200.000 documents**, làm CPU của tiến trình `mongod` chạm đỉnh 100% của 1 core (40.1% tổng CPU máy).

---

## 2. BẰNG CHỨNG 1: LOG `currentOp` BẮT TẠI TRẬN TRÊN SERVER

Lệnh trích xuất từ MongoDB:
```javascript
db.adminCommand({ currentOp: 1, active: true })
```

### Log thực tế bắt được lúc hệ thống đang nghẽn CPU:

```json
{
  "desc": "conn53500",
  "client": "127.0.0.1:53500",
  "active": true,
  "opid": 402985,
  "secs_running": 0,
  "microsecs_running": 48127,
  "op": "query",
  "ns": "G_KITCHEN.DISH_KDS",
  "planSummary": "COLLSCAN",
  "command": {
    "find": "DISH_KDS",
    "filter": {
      "lineGuid": "{9E7418F0-2056-4714-874F-966407F2CB5D}"
    },
    "limit": 1,
    "singleBatch": true,
    "$db": "G_KITCHEN"
  },
  "waitingForLock": false
}
```

```json
{
  "desc": "conn56225",
  "client": "127.0.0.1:56225",
  "active": true,
  "opid": 402990,
  "op": "query",
  "ns": "G_KITCHEN.DISH_KDS",
  "planSummary": "COLLSCAN",
  "command": {
    "find": "DISH_KDS",
    "filter": {
      "lineGuid": "{3BB469BA-3851-4D41-B367-978FA6B91B55}"
    },
    "limit": 1,
    "singleBatch": true,
    "$db": "G_KITCHEN"
  }
}
```

```json
{
  "desc": "conn53499",
  "client": "127.0.0.1:53499",
  "active": true,
  "opid": 403102,
  "op": "command",
  "ns": "G_KITCHEN.DISH_KDS",
  "planSummary": "COLLSCAN",
  "command": {
    "findandmodify": "DISH_KDS",
    "query": { "id": 548970 },
    "update": { "$set": { ... } }
  }
}
```

👉 **Điểm cần chỉ ra cho Dev:** Hãy nhìn vào dòng `"planSummary": "COLLSCAN"`. Đây là lệnh quét toàn bộ bảng, chạy với tần suất hàng chục lần mỗi giây.

---

## 3. BẰNG CHỨNG 2: DANH SÁCH INDEX THỰC TẾ TRÊN BẢNG `DISH_KDS`

Lệnh kiểm tra:
```javascript
use G_KITCHEN;
db.DISH_KDS.getIndexes();
```

### Kết quả trả về (Trước khi tối ưu):
```json
[
  {
    "v": 2,
    "key": {
      "_id": 1
    },
    "name": "_id_"
  }
]
```

👉 **Điểm cần chỉ ra cho Dev:** Bảng có **124.154 dòng** nhưng **KHÔNG HỀ CÓ INDEX** nào cho `lineGuid`, `id` hay `submitTime`!

---

## 4. BẰNG CHỨNG 3: BẰNG CHỨNG ĐANH THÉP NHẤT - `explain("executionStats")`

Chạy lệnh kiểm tra hiệu năng thực tế của câu query `find({ lineGuid: "..." })`:

```javascript
use G_KITCHEN;
db.DISH_KDS.find({ "lineGuid": "{5C602C70-98E7-445A-9806-BB657CD44738}" }).explain("executionStats");
```

### So sánh trực diện số liệu:

| Chỉ số trong Execution Stats | KHI CHƯA CÓ INDEX (Gốc của Dev) | KHI CÓ INDEX (Sau khi thêm) |
| :--- | :--- | :--- |
| **`queryPlanner.winningPlan.stage`** | **`COLLSCAN`** (Quét toàn bộ bảng) | **`FETCH` qua `IXSCAN`** (B-tree Index) |
| **`executionStats.nReturned`** (Số kết quả tìm thấy) | 1 | 1 |
| **`executionStats.totalDocsExamined`** (Số dòng phải đọc) | **124.156 documents** ❌ | **1 document** ✅ |
| **`executionStats.totalKeysExamined`** | 0 | 1 |
| **`executionStats.executionTimeMillis`** (Thời gian xử lý) | **143 ms** ❌ | **0 ms (< 1 ms)** ✅ |

### Đoạn JSON trích xuất từ `executionStats` khi chưa có index:
```json
"executionStats": {
  "executionSuccess": true,
  "nReturned": 1,
  "executionTimeMillis": 143,
  "totalKeysExamined": 0,
  "totalDocsExamined": 124156,
  "executionStages": {
    "stage": "COLLSCAN",
    "filter": {
      "lineGuid": { "$eq": "{5C602C70-98E7-445A-9806-BB657CD44738}" }
    },
    "nReturned": 1,
    "executionTimeMillisEstimate": 139,
    "works": 124158,
    "docsExamined": 124156
  }
}
```

👉 **Con số không thể chối cãi:**  
Để tìm ra **1 bản ghi** (`nReturned: 1`), MongoDB phải bới tung **124.156 bản ghi** (`totalDocsExamined: 124156`) và mất **143ms**.  
Trong khi nếu có index, nó chỉ mất đúng **0ms** và chỉ đọc **1 bản ghi**.

---

## 5. TÍNH TOÁN TẢI CPU CHO DEV XEM

- Tần suất query nghiệp vụ KDS đo được: **~10 câu / giây**.
- Khối lượng duyệt dữ liệu:
  $$\text{Dữ liệu quét mỗi giây} = 10 \times 124.156 = \mathbf{1.241.560\text{ documents/giây}}$$
- Thời gian chiếm giữ CPU:
  $$10 \text{ câu} \times 143\text{ ms} = 1.430\text{ ms CPU}$$
  *(Nghĩa là vượt quá 1000ms thời gian thực của 1 giây $\rightarrow$ **1 nhân CPU bị chạy quá tải 100% liên tục**, kéo toàn bộ máy lên 95% CPU).*

---

## 6. KHUYẾN NGHỊ DEV CẦN FIX TRONG SOURCE CODE

Để tránh việc sau này cài lại máy mới hoặc restore database lại bị tình trạng này, đội ngũ Dev cần:

1. **Thêm Index định nghĩa trong Model / Code khởi tạo hệ thống:**
   ```javascript
   // Database: G_KITCHEN
   db.DISH_KDS.createIndex({ "lineGuid": 1 }, { background: true });
   db.DISH_KDS.createIndex({ "id": 1 }, { background: true });
   db.DISH_KDS.createIndex({ "submitTime": -1 }, { background: true });

   // Database: G_ORDER
   db.ORDER.createIndex({ "lstSession.lineGuid": 1, "status": 1 }, { background: true });
   db.CO_MENU_ITEM.createIndex({ "code": 1 }, { background: true });
   ```

2. **Cơ chế Dọn dẹp dữ liệu (Archive / TTL Index):**
   - Màn hình bếp KDS không cần lưu dữ liệu từ 8 tháng trước trong cùng một collection hoạt động realtime.
   - Nên có job định kỳ (sau ca hoặc cuối tuần) đẩy các bản ghi cũ sang bảng lưu trữ hoặc thiết lập TTL Index tự xóa món đã hoàn thành sau 7 - 30 ngày.
