# HỆ THỐNG QUẢN LÝ CỘNG TÁC VIÊN (CTV) & TÌNH NGUYỆN VIÊN (TNV)

> Hệ thống Full-Stack toàn diện hỗ trợ quản lý nhân sự, điểm danh co giãn 19 tuần họp trong kỳ, đánh giá thái độ, ghi nhận hoạt động chiến dịch, quản lý nhóm & gộp nhóm, kỷ luật thẻ vàng/thẻ đỏ và bảng xếp hạng Top 5.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. Quản lý Cộng Tác Viên (CTV)
- **Cấu trúc 8 Nhóm**: Hiển thị rõ Nhóm trưởng, Nhóm phó, thành viên và tổng điểm.
- **Thao tác hàng loạt (Bulk Actions)**: Chọn nhiều CTV bằng checkbox $\rightarrow$ Đổi trạng thái, chuyển nhóm, cộng/trừ điểm thưởng hàng loạt, hoặc xóa nhanh.
- **Điểm danh co giãn (Elastic Attendance)**: Mặc định sẵn 19 tuần học trong kỳ, có thể thêm/xóa buổi họp linh hoạt. Hỗ trợ 4 mức: Có mặt (100%), Đi muộn (50%), Có phép (0%), Vắng (-50%).
- **Đánh giá thái độ & Ghi nhận hoạt động**: Cộng/trừ điểm theo từng sự kiện, tự động tính tổng điểm theo thời gian thực.
- **Tính năng Gộp nhóm CTV**: Gộp nhóm lớn vào nhóm nhỏ (ví dụ Nhóm 8 vào Nhóm 1), tự động hạ Nhóm trưởng nhóm bị gộp thành Nhóm phó và lưu nhật ký.
- **Xuất/Nhập file Excel & CSV chuẩn format**: Hỗ trợ định dạng bảng theo mẫu Bách Khoa, có UTF-8 BOM hiển thị chuẩn tiếng Việt trong Microsoft Excel.

### 2. Quản lý Tình Nguyện Viên (TNV)
- **Cấu trúc 4 Nhóm TNV**: Theo dõi điểm tích lũy, chức vụ, trạng thái kỷ luật.
- **Benchmark so với Top 1**: Thanh tiến độ trực quan tính tỷ lệ phần trăm so với cá nhân xuất sắc nhất toàn đoàn: `(Điểm TNV / Điểm Top 1) * 100%`.
- **Bảng Vinh danh Top 5 & Bảng Kỷ luật**:
  - Top 5: Huy hiệu Hạng 1-5, huân chương vàng/bạc/đồng.
  - Bảng kỷ luật: Cảnh cáo mức 1 (Thẻ Vàng) & Cảnh cáo mức 2 (Thẻ Đỏ) kèm ghi chú lý do.
- **Điểm danh ca trực co giãn 19 tuần**: Đếm tổng số buổi trực đã tham gia.

### 3. Hoạt động & Chiến dịch (Campaigns Management)
- Danh sách các hoạt động đã, đang và sắp diễn ra (Mùa hè xanh, Tiếp sức mùa thi, Hiến máu...).
- **Đăng ký theo nhóm siêu nhanh**: Nhóm trưởng chỉ cần chọn nhóm và bấm 1 click để đăng ký toàn bộ thành viên đang hoạt động tham gia.
- **Điểm danh hoạt động tự động**: Khi điểm danh Có mặt, hệ thống tự động cộng điểm chiến dịch tương ứng vào tài khoản của CTV/TNV; khi hủy thì tự động thu hồi điểm.
- Xuất file danh sách điểm danh hoạt động ra Excel (.xlsx).

### 4. Sẵn sàng cho GitHub & Triển khai Render (Cloud Database)
- Hỗ trợ **Dual-Engine Database**:
  - Chạy Offline: Tự động dùng file SQLite cục bộ (`database.sqlite`).
  - Chạy Production (Render): Tự động kích hoạt PostgreSQL qua biến `DATABASE_URL` (hỗ trợ Render PostgreSQL, Neon.tech, Supabase) để **không bao giờ bị mất dữ liệu khi server tắt/ngủ**.
- **Kiến trúc Fullstack Single-Service**: Express phục vụ cả API và giao diện React build tĩnh (`client/dist`), tiết kiệm 100% chi phí và hạn mức Render.

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY LOCAL (MÁY CÁ NHÂN)

### 1. Yêu cầu môi trường
- Node.js version 18 trở lên (Khuyên dùng v20 hoặc v22).
- Trình quản lý gói npm.

### 2. Cài đặt các gói phụ thuộc
Tại thư mục gốc `D:\quan-ly-ctv-tnv`:
```bash
# Cài đặt server
cd server && npm install

# Cài đặt client
cd ../client && npm install
```

### 3. Khởi tạo dữ liệu mẫu ban đầu
```bash
cd server
npm run seed
```

### 4. Chạy hệ thống ở chế độ Development
Mở 2 cửa sổ terminal:
- **Terminal 1 (Backend API chạy cổng 5000)**:
  ```bash
  cd server
  npm start
  ```
- **Terminal 2 (Frontend React chạy cổng 5173)**:
  ```bash
  cd client
  npm run dev
  ```
Truy cập giao diện tại: `http://localhost:5173`.

---

## 🌐 HƯỚNG DẪN DEPLOY LÊN RENDER & CLOUD DATABASE

Xem hướng dẫn chi tiết từng bước tại:
👉 **[DEPLOY_GUIDE.md](file:///D:/quan-ly-ctv-tnv/DEPLOY_GUIDE.md)**
