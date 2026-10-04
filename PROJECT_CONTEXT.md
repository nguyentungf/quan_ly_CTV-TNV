# PROJECT CONTEXT & ARCHITECTURE OVERVIEW

Tài liệu khảo sát kiến trúc và ngữ cảnh hệ thống của dự án **Quản lý Cộng Tác Viên (CTV) & Tình Nguyện Viên (TNV)** (`quan-ly-ctv-tnv`). Đây là tài liệu tham chiếu kỹ thuật toàn diện cho các tác vụ phân tích, bảo trì, kiểm thử và phát triển tiếp theo của hệ thống.

---

## 1. Môi trường & Công nghệ (Tech Stack)

### 1.1. Runtime & Ngôn ngữ
- **Môi trường thực thi (Runtime)**: Node.js (hỗ trợ ECMAScript Modules - `"type": "module"`).
- **Ngôn ngữ chính**: JavaScript (ES6+ / JSX cho Frontend React).

### 1.2. Frontend Stack (`client/package.json`)
- **Framework & Core**: [React](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^18.3.1`, [react-dom](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^18.3.1`.
- **Build Tool / Bundler**: [Vite](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^6.0.3` kết hợp plugin [@vitejs/plugin-react](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^4.3.4`.
- **CSS & UI Framework**: [Tailwind CSS](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^3.4.17`, [postcss](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^8.4.49`, [autoprefixer](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^10.4.20`.
- **UI Utilities & Icons**: [lucide-react](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^0.468.0`, [clsx](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^2.1.1`, [tailwind-merge](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json) `^2.5.5`.

### 1.3. Backend Stack (`server/package.json`)
- **Web Framework**: [Express](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^4.21.2`.
- **Cross-Origin & Parsing**: [cors](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^2.8.5`, [dotenv](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^16.4.7`, [multer](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^1.4.5-lts.1` (xử lý upload tệp tin qua `memoryStorage`).
- **Database Driver & ORM**:
  - [better-sqlite3](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^11.8.1`: Cơ sở dữ liệu SQLite cục bộ (chạy offline / development).
  - [pg](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^8.23.0`: Kết nối PostgreSQL đám mây (Render, Neon, Supabase).
  - [drizzle-orm](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^0.39.3`: Khai báo schema ORM tương thích SQLite.
- **Xử lý tệp dữ liệu (Excel / CSV)**:
  - [xlsx](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^0.18.5`: Đọc và xuất bảng tính Excel (.xlsx).
  - [csv-parse](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^5.6.0`: Parse file định dạng CSV có UTF-8 BOM.
- **Testing Tools**:
  - [vitest](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^5.0.3`: Test runner hiện đại hỗ trợ ES Modules.
  - [supertest](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json) `^7.3.1`: Thư viện kiểm thử tích hợp HTTP assertions cho Express app.

### 1.4. Các lệnh vòng đời hệ thống (Scripts)
- **Root ([`package.json`](file:///E:/VibeCoding/quan-ly-ctv-tnv/package.json))**:
  - `npm run build`: Cài đặt dependencies client, build bản tĩnh client, cài đặt dependencies server.
  - `npm run render-build`: Lệnh build chuẩn dành cho Render deployment Blueprint.
  - `npm start` / `npm run server`: Khởi động backend Express từ `server/src/server.js`.
  - `npm run client`: Khởi chạy Vite dev server cho client.
  - `npm run seed`: Chạy script nạp dữ liệu mẫu ban đầu.
  - `npm test`: Chạy toàn bộ test suite của server (`vitest run`).
- **Server ([`server/package.json`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/package.json))**:
  - `npm start` / `npm run dev`: Chạy `node src/server.js`.
  - `npm run seed`: Chạy `node src/db/seed.js`.
  - `npm test`: Chạy Vitest watch mode.
  - `npm run test:run`: Chạy Vitest single-run mode.
- **Client ([`client/package.json`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/package.json))**:
  - `npm run dev`: Chạy Vite dev server (cổng 3000, proxy `/api` sang `http://localhost:5000`).
  - `npm run build`: Build gói tĩnh ra thư mục `client/dist`.
  - `npm run preview`: Xem trước bản build tĩnh của Vite.

---

## 2. Cấu trúc Thư mục (Directory Topology)

### 2.1. Cây thư mục cấp cao
```text
quan-ly-ctv-tnv/
├── .env.example                     # Mẫu cấu hình biến môi trường
├── .gitignore                       # Danh sách loại trừ tệp Git
├── DEPLOY_GUIDE.md                  # Hướng dẫn chi tiết triển khai lên Render & GitHub
├── package.json                     # Quản lý script monorepo cấp gốc
├── README.md                        # Giới thiệu tổng quan hệ thống & tính năng
├── render.yaml                      # Render Blueprint (Web service Node.js + Cloud Postgres)
├── client/                          # Ứng dụng Frontend (React + Vite + Tailwind)
│   ├── dist/                        # Gói build tĩnh (được server Express phục vụ trong production)
│   ├── src/                         # Mã nguồn giao diện người dùng
│   │   ├── components/              # Các UI Component phân theo domain
│   │   │   ├── auth/                # Modal đăng nhập & Quản lý mật khẩu nhóm/admin
│   │   │   ├── campaigns/           # Giao diện quản lý hoạt động & chiến dịch
│   │   │   ├── common/              # Thành phần tái sử dụng (Toast, ConfirmModal, CsvImportModal)
│   │   │   ├── ctv/                 # Thành phần quản lý CTV (Danh sách, Điểm danh, Gộp nhóm, Chấm điểm)
│   │   │   ├── tnv/                 # Thành phần quản lý TNV (Danh sách, Top 5, Kỷ luật, Điểm danh)
│   │   │   └── Navbar.jsx           # Header điều hướng, huy hiệu thống kê & trạng thái đăng nhập
│   │   ├── context/                 # Quản lý trạng thái xác thực toàn cục
│   │   │   └── AuthContext.jsx      # AuthProvider, useAuth (Guest, Leader, Admin)
│   │   ├── api.js                   # Client HTTP API wrapper giao tiếp backend
│   │   ├── App.jsx                  # Điểm điều phối giao diện chính (Tabs, Filters, State)
│   │   ├── index.css                # CSS nền tảng kết hợp Tailwind directives
│   │   └── main.jsx                 # Entry point khởi tạo React DOM
│   ├── index.html                   # HTML gốc của ứng dụng Single Page App
│   ├── package.json                 # Cấu hình dependencies Frontend
│   ├── postcss.config.js            # Cấu hình PostCSS
│   ├── tailwind.config.js           # Cấu hình màu sắc, theme Tailwind CSS
│   └── vite.config.js               # Cấu hình Vite & reverse proxy `/api`
└── server/                          # Dịch vụ Backend (Express RESTful API)
    ├── data/                        # Nơi lưu trữ tệp SQLite cục bộ
    │   └── database.sqlite          # Cơ sở dữ liệu SQLite khi không có DATABASE_URL
    ├── src/                         # Mã nguồn máy chủ backend
    │   ├── db/                      # Lớp kết nối, định nghĩa lược đồ & dữ liệu mẫu
    │   │   ├── index.js             # Unified Database Adapter (SQLite & PostgreSQL)
    │   │   ├── schema.js            # Lược đồ bảng Drizzle ORM (SQLite-core)
    │   │   └── seed.js              # Script khởi tạo dữ liệu mẫu tiếng Việt
    │   ├── middleware/              # Lớp middleware kiểm soát quyền truy cập
    │   │   └── auth.js              # parseUser, requireAuth, requireAdmin, checkGroupPermission
    │   ├── routes/                  # Định tuyến các API endpoint
    │   │   ├── auth.js              # Xác thực người dùng, JWT token, quản lý mật khẩu
    │   │   ├── campaigns.js         # API chiến dịch, đăng ký nhóm/cá nhân, điểm danh tự động
    │   │   ├── ctv.js               # API quản lý CTV, điểm danh 19 tuần, gộp nhóm, xuất/nhập Excel
    │   │   └── tnv.js               # API quản lý TNV, Top 5, cảnh cáo kỷ luật, ca trực 19 tuần
    │   └── server.js                # Entry point chính của backend Express
    ├── tests/                       # Bộ kiểm thử tự động Vitest & Supertest
    │   ├── helpers/                 # Hàm tiện ích test (tạo app test, tạo token giả lập)
    │   ├── p0.test.js               # Test suite P0 (Critical path & bảo mật token/rate limit)
    │   ├── p1.test.js               # Test suite P1 (Nghiệp vụ chiến dịch, điểm danh, gộp nhóm)
    │   └── smoke.test.js            # Smoke test kiểm tra Vitest runner & ESM
    ├── package.json                 # Cấu hình dependencies Backend
    ├── test-verify.js               # Script xác minh tích hợp end-to-end
    └── vitest.config.js             # Cấu hình Vitest runner

```

### 2.2. Mục đích và vai trò của từng thư mục chính
- `client/src/components/`: Chứa toàn bộ giao diện phân tầng chi tiết theo 3 nghiệp vụ lớn (CTV, TNV, Chiến dịch) và module phân quyền/xác thực.
- `client/src/context/`: Quản lý trạng thái phân quyền toàn cục thông qua React Context (`AuthContext`), lưu phiên trong `localStorage` (`auth_token`, `auth_user`).
- `server/src/db/`: Lõi tích hợp cơ sở dữ liệu với Unified Database Adapter, tự động chuyển đổi cú pháp câu truy vấn SQL (`?` sang `$1, $2,...` cho PostgreSQL) và tự động khởi tạo bảng (`initSchema`).
- `server/src/middleware/`: Chặn và kiểm soát quyền truy cập theo vai trò: Khách (`guest` - chỉ xem), Nhóm trưởng (`leader` - chỉ được sửa nhóm của mình), Ban Quản Trị (`admin` - toàn quyền).
- `server/src/routes/`: Cung cấp các REST API cho 4 phân hệ chính: xác thực, quản lý CTV, quản lý TNV, quản lý chiến dịch/hoạt động.
- `server/tests/`: Hệ thống kiểm thử phân cấp theo độ ưu tiên (Smoke, P0, P1) sử dụng `vitest` và `supertest`.

### 2.3. Vị trí các điểm vào (Entry Points)
- **Backend Application Entry Point**: [`server/src/server.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/server.js).
- **Frontend Application Entry Point**: [`client/src/main.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/main.jsx) kết hợp [`client/index.html`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/index.html) và [`client/src/App.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/App.jsx).
- **Database Seed Entry Point**: [`server/src/db/seed.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/seed.js).
- **Test Entry Point**: [`server/tests/smoke.test.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/tests/smoke.test.js), [`server/tests/p0.test.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/tests/p0.test.js), [`server/tests/p1.test.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/tests/p1.test.js).

---

## 3. Lớp Dữ liệu & Lưu trữ (Data Layer & Schemas)

### 3.1. Cơ chế lưu trữ (Dual-Engine Database Architecture)
Hệ thống sử dụng cơ chế **Unified Database Adapter** tại [`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js):
- **Cơ chế 1 - SQLite Cục bộ (`better-sqlite3`)**: Kích hoạt khi không tìm thấy biến `DATABASE_URL`. Dữ liệu được lưu tại file [`server/data/database.sqlite`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/data/database.sqlite), kích hoạt `PRAGMA journal_mode = WAL` và `PRAGMA foreign_keys = ON`.
- **Cơ chế 2 - Cloud PostgreSQL (`pg.Pool`)**: Tự động kích hoạt khi `DATABASE_URL` bắt đầu bằng `postgres://` hoặc `postgresql://` (tương thích Render Database, Supabase, Neon). Bộ chuyển đổi `toPgSql()` tự động chuẩn hóa tham số từ `?` sang `$1, $2,...` và gắn thêm `RETURNING id` cho câu lệnh `INSERT`.
- **Cơ chế đồng bộ lược đồ**: Hàm `initSchema()` trong [`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js) tự động thực thi các câu lệnh `CREATE TABLE IF NOT EXISTS` khi máy chủ khởi động cho cả SQLite và PostgreSQL.

### 3.2. Danh sách Schema & Entity Cốt lõi
Các bảng được định nghĩa đồng thời tại [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js) (Drizzle Schema) và khởi tạo câu lệnh SQL DDL tại [`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js):

| Tên Bảng (Table) | File Định nghĩa | Mục đích & Mô tả các trường cốt lõi |
| :--- | :--- | :--- |
| `ctv_members` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L8-L23)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L172-L187) | Thông tin nhân sự CTV: `id`, `mssv` (UNIQUE), `full_name`, `group_num` (Nhóm 1-8), `role` (Nhóm trưởng / Nhóm phó / Thành viên), `gender`, `class_name`, `phone`, `email`, `attitude_points`, `activity_points`, `total_points`, `status`. |
| `ctv_events` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L25-L30)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L189-L194) | Danh sách các buổi họp tuần của CTV: `id`, `name` (Tuần 1 - 19), `event_date`. |
| `ctv_attendance` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L32-L37)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L196-L202) | Ma trận điểm danh CTV: `id`, `member_id` (FK `ctv_members`), `event_id` (FK `ctv_events`), `status` (`co_mat` = 100%, `di_muon` = 50%, `co_phep` = 0%, `vang_khong_phep` = -50%). `UNIQUE(member_id, event_id)`. |
| `ctv_point_logs` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L39-L47)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L204-L212) | Nhật ký thay đổi điểm thái độ/hoạt động của CTV: `id`, `member_id` (FK), `type` (`attitude` / `activity`), `title`, `points_delta`, `note`, `created_at`. |
| `ctv_merge_logs` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L49-L57)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L214-L222) | Lịch sử sáp nhập nhóm CTV: `id`, `source_group`, `target_group`, `demoted_leader_name`, `merged_count`, `note`, `created_at`. |
| `tnv_members` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L63-L78)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L224-L239) | Thông tin nhân sự TNV: `id`, `mssv` (UNIQUE), `full_name`, `group_num` (Nhóm 1-4), `role`, `gender`, `class_name`, `phone`, `email`, `total_points`, `status`, `warning_level` (`none`, `canh_cao_1`, `canh_cao_2`), `warning_note`. |
| `tnv_events` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L80-L85)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L241-L246) | Danh sách tuần trực của TNV: `id`, `name` (Tuần 1 - 19), `event_date`. |
| `tnv_attendance` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L87-L92)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L248-L254) | Ghi nhận trực ca của TNV: `id`, `member_id` (FK `tnv_members`), `event_id` (FK `tnv_events`), `status` (`co_mat` / `vang`). `UNIQUE(member_id, event_id)`. |
| `tnv_activities` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L94-L101)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L256-L263) | Ghi nhận hoạt động TNV: `id`, `member_id` (FK), `category` (Trực văn phòng, Hỗ trợ tuyển sinh,...), `points`, `note`, `created_at`. |
| `campaigns` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L107-L117)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L265-L275) | Danh mục hoạt động/chiến dịch: `id`, `name`, `description`, `location`, `event_date`, `points`, `target_type` (`all` / `ctv` / `tnv`), `status` (`dang_mo_dang_ky` / `dang_dien_ra` / `da_hoan_thanh`). |
| `campaign_registrations` | [`server/src/db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js#L119-L129)<br>[`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L277-L288) | Đăng ký tham gia hoạt động: `id`, `campaign_id` (FK `campaigns`), `member_type` (`ctv` / `tnv`), `member_id`, `group_num`, `registered_by`, `attendance_status` (`chua_diem_danh`, `co_mat`, `vang`), `points_awarded`. `UNIQUE(campaign_id, member_type, member_id)`. |
| `system_auth` | [`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L290-L299) | Tài khoản & mật khẩu các nhóm: `id`, `role` (`admin`, `ctv_leader`, `tnv_leader`), `target_type` (`admin`, `ctv`, `tnv`), `group_num`, `display_name`, `password`, `updated_at`. `UNIQUE(role, target_type, group_num)`. |

### 3.3. Cơ chế Khởi tạo dữ liệu & Seed
- Tự động kiểm tra tại [`server/src/server.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/server.js#L72-L84): Khi khởi động máy chủ, nếu `ctv_members` và `tnv_members` đều có 0 bản ghi, hệ thống tự động gọi `seedDatabase()` từ [`server/src/db/seed.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/seed.js).
- Script `seedDatabase()`: Xóa sạch dữ liệu các bảng theo thứ tự quan hệ khóa ngoại, nạp 8 nhóm CTV và 4 nhóm TNV (dữ liệu mẫu sinh viên Đại học Bách Khoa Hà Nội), nạp 19 tuần học, nạp điểm danh mẫu và khởi tạo các chiến dịch mẫu.
- Khởi tạo tài khoản mật khẩu mặc định tại [`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L446-L473):
  - Admin: `admin123`.
  - 8 Nhóm trưởng CTV: `ctv1@123` đến `ctv8@123`.
  - 4 Nhóm trưởng TNV: `tnv1@123` đến `tnv4@123`.

---

## 4. Kiến trúc Luồng Xử lý (Data Flow & Architecture)

### 4.1. Sơ đồ Luồng Dữ liệu (End-to-End Pipeline)
```text
[Trình duyệt Người dùng] 
       │ 
       ▼
[React 18 Component UI] ──(Tương tác / Gọi API)──► [client/src/api.js]
                                                           │
                                                           ▼ (HTTP Fetch + Bearer Token)
                                                   [Express REST Server (Cổng 5000)]
                                                           │
                                                           ▼
                                            [Middleware: parseUser / requireAuth]
                                                           │
                                                           ▼
                                            [Middleware: checkGroupPermission / requireAdmin]
                                                           │
                                                           ▼
                                            [Route Handlers (auth, ctv, tnv, campaigns)]
                                                           │
                                                           ▼
                                            [Unified DB Adapter (server/src/db/index.js)]
                                                           │
                                           ┌───────────────┴───────────────┐
                                           ▼                               ▼
                             [SQLite (Local file)]            [PostgreSQL (Cloud Database)]
```

### 4.2. Cơ chế Quản lý Trạng thái & Xác thực Phân quyền
- **Phía Client ([`client/src/context/AuthContext.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/context/AuthContext.jsx))**:
  - Lưu trữ thông tin người dùng trong React State và đồng bộ `localStorage` (`auth_token`, `auth_user`).
  - Hỗ trợ 3 vai trò:
    1. **Khách (`guest`)**: Xem dữ liệu công khai, bị vô hiệu hóa các nút chỉnh sửa/xóa/điểm danh/nhập xuất.
    2. **Nhóm trưởng (`leader`)**: Được chỉ định `targetType` (`ctv` hoặc `tnv`) và `groupNum`. Hàm `canEditGroup(targetType, groupNum)` kiểm tra trước khi hiển thị nút thao tác.
    3. **Ban Chủ Nhiệm (`admin`)**: Toàn quyền thao tác trên mọi nhóm, đổi/cấp lại mật khẩu, khởi tạo 19 tuần, gộp nhóm và nhập dữ liệu.
  - Tự động kiểm tra tính hợp lệ của token khi khởi động qua endpoint `/api/auth/me`.

- **Phía Server ([`server/src/middleware/auth.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/middleware/auth.js))**:
  - `parseUser`: Giải mã HMAC SHA-256 token từ header `Authorization: Bearer <token>`. Nếu không có, gán vai trò `guest`.
  - `requireAuth`: Từ chối yêu cầu (401) nếu người dùng ở vai trò `guest`.
  - `requireAdmin`: Bắt buộc người dùng có `role === 'admin'`, nếu không trả về 403 Forbidden.
  - `checkGroupPermission(expectedTargetType)`:
    - Bỏ qua kiểm tra nếu là `admin`.
    - Xác thực `targetType` của token phải trùng khớp với đối tượng API đang gọi (`ctv` hoặc `tnv`).
    - Xác thực `groupNum` từ body, query params, `memberId` (truy vấn DB tìm nhóm của thành viên) hoặc danh sách `memberIds` trong bulk action. Nhóm trưởng chỉ được can thiệp vào đúng số nhóm của mình.

### 4.3. Cơ chế Điểm Danh & Tự động Cân bằng Điểm (State & Point Hook)
- **Điểm danh hoạt động ([`server/src/routes/campaigns.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/campaigns.js#L297-L398))**:
  - Thực thi trong Transaction (`db.transaction`).
  - Khi chuyển trạng thái sang `co_mat` lần đầu: tự động cộng điểm chiến dịch vào `activity_points` & `total_points` (với CTV) hoặc `total_points` (với TNV), đồng thời tạo bản ghi nhật ký tại `ctv_point_logs` hoặc `tnv_activities`.
  - Khi chuyển từ `co_mat` sang `vang` hoặc `chua_diem_danh`, hoặc khi hủy đăng ký: tự động thu hồi chính xác số điểm đã cộng và ghi log điều chỉnh.

---

## 5. Danh mục Module & Điểm Giao tiếp (Interfaces / Endpoints)

### 5.1. Bảng Tổng hợp các Module Chính

| Module / Tính năng | File Giao diện (Client Component) | File Xử lý Logic (Server Route) | File Dữ liệu / Schema Liên quan |
| :--- | :--- | :--- | :--- |
| **Xác thực & Quản lý Mật khẩu** | [`LoginModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/auth/LoginModal.jsx)<br>[`PasswordManagerModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/auth/PasswordManagerModal.jsx) | [`server/src/routes/auth.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/auth.js) | `system_auth` ([`db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js)) |
| **Quản lý Nhân sự CTV** | [`CtvMemberList.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/ctv/CtvMemberList.jsx)<br>[`CtvMemberModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/ctv/CtvMemberModal.jsx)<br>[`CtvOverview.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/ctv/CtvOverview.jsx) | [`server/src/routes/ctv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/ctv.js) | `ctv_members` ([`db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js)) |
| **Điểm danh Co giãn CTV (19 tuần)** | [`CtvAttendanceMatrix.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/ctv/CtvAttendanceMatrix.jsx) | [`server/src/routes/ctv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/ctv.js) | `ctv_events`, `ctv_attendance` ([`db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js)) |
| **Chấm điểm Thái độ / Hoạt động CTV** | [`CtvAttitudeActivityModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/ctv/CtvAttitudeActivityModal.jsx) | [`server/src/routes/ctv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/ctv.js) | `ctv_point_logs`, `ctv_members` ([`db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js)) |
| **Sáp nhập / Gộp nhóm CTV** | [`CtvMergeGroupModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/ctv/CtvMergeGroupModal.jsx) | [`server/src/routes/ctv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/ctv.js) | `ctv_merge_logs`, `ctv_members` ([`db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js)) |
| **Quản lý Nhân sự TNV** | [`TnvMemberList.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvMemberList.jsx)<br>[`TnvMemberModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvMemberModal.jsx)<br>[`TnvOverview.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvOverview.jsx) | [`server/src/routes/tnv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/tnv.js) | `tnv_members` ([`db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js)) |
| **Bảng Vinh danh Top 5 & Kỷ luật TNV** | [`TnvLeaderboard.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvLeaderboard.jsx)<br>[`TnvDisciplineBoard.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvDisciplineBoard.jsx) | [`server/src/routes/tnv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/tnv.js) | `tnv_members` ([`db/schema.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/schema.js)) |
| **Điểm danh Ca trực & Hoạt động TNV** | [`TnvAttendanceTracker.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvAttendanceTracker.jsx)<br>[`TnvActivityModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/tnv/TnvActivityModal.jsx) | [`server/src/routes/tnv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/tnv.js) | `tnv_events`, `tnv_attendance`, `tnv_activities` |
| **Hoạt động & Chiến dịch (Campaigns)** | [`CampaignManager.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/campaigns/CampaignManager.jsx) | [`server/src/routes/campaigns.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/campaigns.js) | `campaigns`, `campaign_registrations` |
| **Nhập / Xuất Excel & CSV** | [`CsvImportModal.jsx`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/src/components/common/CsvImportModal.jsx) | [`server/src/routes/ctv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/ctv.js)<br>[`server/src/routes/tnv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/tnv.js) | `ctv_members`, `tnv_members` |

---

### 5.2. Danh sách các API Endpoints Quan trọng

#### Phân hệ Xác thực ([`server/src/routes/auth.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/auth.js))
- `POST /api/auth/login`: Xác thực đăng nhập (Hỗ trợ 3 role: `guest`, `leader`, `admin`).
- `GET /api/auth/me`: Lấy thông tin phiên người dùng hiện tại qua token.
- `GET /api/auth/passwords`: [Admin] Lấy toàn bộ danh sách mật khẩu các nhóm.
- `POST /api/auth/reset-password`: [Admin] Đổi hoặc cấp lại mật khẩu cho từng nhóm hoặc Admin.
- `POST /api/auth/reset-all-default`: [Admin] Khôi phục toàn bộ mật khẩu hệ thống về mặc định.

#### Phân hệ CTV ([`server/src/routes/ctv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/ctv.js))
- `GET /api/ctv/members`: Danh sách CTV kèm tìm kiếm, lọc theo nhóm và trạng thái.
- `POST /api/ctv/members`: [Leader/Admin] Thêm mới CTV.
- `PUT /api/ctv/members/:id`: [Leader/Admin] Cập nhật thông tin CTV.
- `DELETE /api/ctv/members/:id`: [Leader/Admin] Xóa CTV.
- `POST /api/ctv/bulk-action`: [Leader/Admin] Thao tác hàng loạt (đổi trạng thái, chuyển nhóm, cộng/trừ điểm, xóa).
- `GET /api/ctv/groups-summary`: Tóm tắt thống kê 8 nhóm CTV (tổng số lượng, đang hoạt động, trung bình điểm).
- `GET /api/ctv/events`: Danh sách các buổi họp tuần.
- `POST /api/ctv/init-19-weeks`: [Admin] Khởi tạo tự động 19 tuần họp trong kỳ.
- `GET /api/ctv/attendance-matrix`: Ma trận điểm danh CTV kèm tỷ lệ phần trăm chuyên cần.
- `POST /api/ctv/attendance`: [Leader/Admin] Cập nhật trạng thái điểm danh cho 1 thành viên.
- `POST /api/ctv/attitude-activity`: [Leader/Admin] Ghi nhận điểm thái độ hoặc hoạt động kèm lý do.
- `GET /api/ctv/point-logs/:memberId`: Lịch sử các lần cộng/trừ điểm của CTV.
- `POST /api/ctv/merge-groups`: [Admin] Sáp nhập 2 nhóm CTV, giáng cấp nhóm trưởng nhóm bị gộp.
- `GET /api/ctv/merge-logs`: Lịch sử các đợt sáp nhập nhóm.
- `GET /api/ctv/export-xlsx` / `GET /api/ctv/export-csv`: Xuất danh sách CTV (có UTF-8 BOM).
- `POST /api/ctv/import-file`: [Admin] Nhập danh sách CTV từ file Excel/CSV.

#### Phân hệ TNV ([`server/src/routes/tnv.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/tnv.js))
- `GET /api/tnv/members`: Danh sách TNV kèm tìm kiếm, lọc theo nhóm, cảnh cáo, trạng thái.
- `POST /api/tnv/members`: [Leader/Admin] Thêm mới TNV.
- `PUT /api/tnv/members/:id`: [Leader/Admin] Cập nhật thông tin TNV.
- `DELETE /api/tnv/members/:id`: [Leader/Admin] Xóa TNV.
- `POST /api/tnv/bulk-action`: [Leader/Admin] Thao tác hàng loạt trên TNV.
- `GET /api/tnv/top-5`: Bảng vinh danh Top 5 TNV có điểm tích lũy cao nhất.
- `GET /api/tnv/discipline`: Danh sách TNV bị kỷ luật (Cảnh cáo mức 1 & Mức 2).
- `PUT /api/tnv/warning/:id`: [Admin] Cập nhật mức độ kỷ luật thẻ vàng/thẻ đỏ và lý do.
- `GET /api/tnv/attendance-matrix`: Ma trận tham gia trực ca 19 tuần của TNV.
- `POST /api/tnv/activities`: [Leader/Admin] Ghi nhận hoạt động TNV (Trực văn phòng, Hỗ trợ tuyển sinh,...).
- `GET /api/tnv/export-xlsx` / `GET /api/tnv/export-csv`: Xuất danh sách TNV ra Excel/CSV.
- `POST /api/tnv/import-file`: [Admin] Nhập danh sách TNV từ file Excel/CSV.

#### Phân hệ Chiến dịch ([`server/src/routes/campaigns.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/campaigns.js))
- `GET /api/campaigns`: Danh sách chiến dịch kèm bộ đếm số lượng đã đăng ký / có mặt / vắng.
- `POST /api/campaigns`: [Admin] Tạo chiến dịch mới.
- `PUT /api/campaigns/:id`: [Admin] Sửa thông tin chiến dịch.
- `DELETE /api/campaigns/:id`: [Admin] Xóa chiến dịch và toàn bộ dữ liệu đăng ký.
- `GET /api/campaigns/:id/registrations`: Danh sách thành viên đăng ký của chiến dịch.
- `POST /api/campaigns/:id/register`: [Leader/Admin] Đăng ký thành viên cá nhân vào chiến dịch.
- `POST /api/campaigns/:id/register-group`: [Leader/Admin] Đăng ký 1-click cho toàn bộ thành viên đang hoạt động trong nhóm.
- `PUT /api/campaigns/:id/attendance`: [Leader/Admin] Điểm danh hoạt động (tự động cộng/thu hồi điểm tích lũy).
- `DELETE /api/campaigns/:id/registrations/:regId`: [Leader/Admin] Hủy đăng ký cá nhân (tự động thu hồi điểm nếu đã cộng).
- `GET /api/campaigns/:id/export-xlsx`: Xuất danh sách đăng ký & điểm danh chiến dịch ra Excel.

#### Endpoint Tiện ích Hệ thống ([`server/src/server.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/server.js))
- `GET /api/health`: Kiểm tra trạng thái hoạt động và loại database đang kết nối (`SQLite` hoặc `PostgreSQL`).
- `POST /api/reset-seed`: [Admin] Đặt lại toàn bộ cơ sở dữ liệu về trạng thái mẫu ban đầu.

---

## 6. Cấu hình & Biến môi trường

### 6.1. Danh sách Biến Môi trường Tham chiếu trong Mã nguồn

| Tên Biến Môi Trường | File Tham Chiếu | Mục Đích & Giá Trị Mặc Định |
| :--- | :--- | :--- |
| `PORT` | [`server/src/server.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/server.js#L19) | Cổng mạng cho máy chủ Express lắng nghe. Mặc định là `5000`. |
| `DATABASE_URL` | [`server/src/db/index.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/db/index.js#L12)<br>[`render.yaml`](file:///E:/VibeCoding/quan-ly-ctv-tnv/render.yaml#L13) | Chuỗi kết nối PostgreSQL (Render, Neon, Supabase). Nếu để trống, hệ thống tự động fallback về SQLite cục bộ tại `server/data/database.sqlite`. |
| `JWT_SECRET` | [`server/src/routes/auth.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/src/routes/auth.js#L6) | Khóa bí mật dùng để ký và xác thực chữ ký HMAC SHA-256 của Token xác thực. Có giá trị dự phòng mặc định khi chưa thiết lập. |
| `NODE_ENV` | [`.env.example`](file:///E:/VibeCoding/quan-ly-ctv-tnv/.env.example#L5)<br>[`render.yaml`](file:///E:/VibeCoding/quan-ly-ctv-tnv/render.yaml#L11) | Môi trường triển khai (`development` hoặc `production`). |

### 6.2. Các Tệp Cấu hình Hệ thống
- [`.env.example`](file:///E:/VibeCoding/quan-ly-ctv-tnv/.env.example): Tệp mẫu khai báo biến môi trường cho quá trình phát triển và triển khai.
- [`render.yaml`](file:///E:/VibeCoding/quan-ly-ctv-tnv/render.yaml): Bản thiết kế Infrastructure as Code (IaC) tự động tạo dịch vụ Web Node.js và dịch vụ cơ sở dữ liệu PostgreSQL tại Singapore region trên nền tảng Render.
- [`client/vite.config.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/vite.config.js): Cấu hình cổng phát triển của Client (`3000`) và reverse proxy cho mọi đường dẫn `/api` sang Backend (`http://localhost:5000`).
- [`client/tailwind.config.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/client/tailwind.config.js): Cấu hình bộ màu `primary` và quét toàn bộ mã nguồn `index.html`, `src/**/*.{js,ts,jsx,tsx}`.
- [`server/vitest.config.js`](file:///E:/VibeCoding/quan-ly-ctv-tnv/server/vitest.config.js): Cấu hình bộ chạy test tự động Vitest cho Node runtime.
