# HƯỚNG DẪN TRIỂN KHAI LÊN GITHUB & RENDER (DATABASE MỞ KHÔNG BỊ MẤT DỮ LIỆU)

Tài liệu này hướng dẫn chi tiết từng bước để:
1. Đưa mã nguồn lên **GitHub**.
2. Triển khai (Deploy) miễn phí lên **Render**.
3. Cấu hình **Cơ sở dữ liệu đám mây (Cloud Database)** để **không bao giờ bị mất dữ liệu** khi Render rơi vào trạng thái ngủ (Sleep/Spin-down sau 15 phút không dùng).

---

## 🌟 TẠI SAO PHẢI DÙNG CLOUD DATABASE KHI DEPLOY RENDER?

- **Hạn chế của Render Free Tier**: Web Service miễn phí trên Render sử dụng ổ đĩa tạm thời (*ephemeral disk*). Mỗi khi ứng dụng không có lượt truy cập sau 15 phút, server sẽ tự động "ngủ". Khi có người dùng truy cập lại, container khởi động lại từ đầu và các file lưu cục bộ trên server (như file `database.sqlite`) sẽ bị xóa sạch!
- **Giải pháp của hệ thống**:
  - Mã nguồn đã được tích hợp sẵn **Dual-Engine Database Adapter**:
    - **Khi chạy ở máy tính cá nhân (Offline)**: Tự động dùng file SQLite cục bộ mà không cần cài đặt gì thêm.
    - **Khi chạy trên Render (Production)**: Tự động kích hoạt PostgreSQL khi có biến môi trường `DATABASE_URL`. Mọi dữ liệu (CTV, TNV, điểm danh, chiến dịch, kỷ luật) được lưu trên máy chủ cơ sở dữ liệu đám mây vĩnh viễn, **100% không bị mất** dù server Render có bật/tắt bao nhiêu lần.

---

## 🚀 BƯỚC 1: ĐƯA DỰ ÁN LÊN GITHUB

Mở Terminal / PowerShell tại thư mục dự án `D:\quan-ly-ctv-tnv` và thực hiện:

### 1.1. Tạo Repository mới trên GitHub
1. Truy cập [https://github.com/new](https://github.com/new).
2. Đặt tên Repository (Ví dụ: `quan-ly-ctv-tnv`).
3. Chọn chế độ **Public** hoặc **Private** tùy ý.
4. **Không** tích chọn *"Add a README file"* (vì dự án đã có sẵn).
5. Bấm **Create repository**.

### 1.2. Đẩy (Push) mã nguồn lên GitHub
Chạy các lệnh sau trong PowerShell tại `D:\quan-ly-ctv-tnv`:

```powershell
# 1. Khởi tạo Git nếu chưa có
git init

# 2. Thêm toàn bộ mã nguồn vào staging
git add .

# 3. Tạo commit đầu tiên
git commit -m "feat: setup fullstack app with dual-engine db and render deployment"

# 4. Đổi tên nhánh chính thành main
git branch -M main

# 5. Liên kết với kho GitHub của bạn (thay URL bằng URL repo của bạn)
git remote add origin https://github.com/<tai-khoan-github-cua-ban>/quan-ly-ctv-tnv.git

# 6. Đẩy mã nguồn lên GitHub
git push -u origin main
```

---

## ⚡ BƯỚC 2: DEPLOY LÊN RENDER BẰNG FILE BLUEPRINT (KHUYÊN DÙNG - 1 CLICK)

Dự án đã có sẵn file `render.yaml` (Render Blueprint). Render sẽ tự động tạo **Web Service** kèm **PostgreSQL Database** và tự động liên kết chúng với nhau:

1. Đăng nhập vào [Render.com](https://dashboard.render.com).
2. Bấm vào nút **New +** ở góc trên cùng bên phải $\rightarrow$ Chọn **Blueprint**.
3. Chọn kho lưu trữ GitHub `quan-ly-ctv-tnv` vừa đẩy lên ở Bước 1.
4. Render sẽ tự động đọc file `render.yaml`:
   - Tạo dịch vụ web: `quan-ly-ctv-tnv`.
   - Tạo cơ sở dữ liệu PostgreSQL: `quan-ly-ctv-tnv-db`.
   - Tự động nạp biến môi trường `DATABASE_URL` từ database sang web service.
5. Bấm **Apply**.
6. Render sẽ tự động:
   - Cài đặt thư viện (`npm run render-build`).
   - Build giao diện React Vite (`client/dist`).
   - Khởi động server Express (`npm start`).
   - Tự động tạo các bảng và nạp dữ liệu tiếng Việt mẫu chuẩn vào PostgreSQL.

---

## 🌐 BƯỚC 3: PHƯƠNG ÁN THAY THẾ (DÙNG DATABASE CLOUD MIỄN PHÍ KHÁC)

Nếu bạn muốn dùng cơ sở dữ liệu PostgreSQL miễn phí bên ngoài (như **Neon.tech** hoặc **Supabase** - không bị giới hạn 90 ngày như Render Postgres):

### Cách 1: Sử dụng Neon.tech (Khuyên dùng - Rất nhanh, miễn phí vĩnh viễn)
1. Đăng ký tài khoản miễn phí tại [Neon.tech](https://neon.tech).
2. Tạo một Project mới (Ví dụ: `quan-ly-ctv-tnv`).
3. Copy chuỗi kết nối **Connection String** có dạng:
   ```text
   postgresql://username:password@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Trên Render Dashboard $\rightarrow$ Web Service `quan-ly-ctv-tnv` $\rightarrow$ Thẻ **Environment**:
   - Thêm biến môi trường:
     - **Key**: `DATABASE_URL`
     - **Value**: Dán chuỗi kết nối từ Neon.tech ở trên vào.
5. Bấm **Save Changes**. Hệ thống sẽ tự động kết nối Neon, tạo bảng và nạp dữ liệu.

### Cách 2: Sử dụng Supabase
1. Đăng ký tại [Supabase.com](https://supabase.com) $\rightarrow$ Tạo Project mới.
2. Vào **Project Settings** $\rightarrow$ **Database** $\rightarrow$ Tìm mục **Connection string** (chế độ URI / Transaction pooler).
3. Copy URI và điền vào biến `DATABASE_URL` trên Render.

---

## 🔧 DANH SÁCH BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

| Tên biến | Bắt buộc | Giá trị mẫu | Giải thích |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Có | `production` | Chạy chế độ sản phẩm, tự động phục vụ file giao diện React từ `client/dist`. |
| `PORT` | Không | `5000` (Render tự cấp cổng) | Cổng chạy của Express backend. |
| `DATABASE_URL` | **Khuyên dùng** | `postgresql://user:pass@host/dbname?sslmode=require` | Chuỗi kết nối PostgreSQL Cloud. Nếu để trống, server sẽ dùng SQLite cục bộ. |

---

## 🔄 LỆNH CẬP NHẬT KHI CÓ THAY ĐỔI MỚI (UPDATE CODE)

Mỗi khi bạn sửa code ở máy tính và muốn cập nhật lên Render:
```powershell
git add .
git commit -m "Cập nhật tính năng mới"
git push origin main
```
Render sẽ tự động phát hiện commit mới và tiến hành Deploy tự động (Auto-Deploy) trong 1-2 phút!

