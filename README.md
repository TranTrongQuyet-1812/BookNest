# BookNest – Hệ Thống Quản Lý & Nhà Sách Trực Tuyến

> **Đồ Án Chuyên Đề Backend (SERN Architecture)**  
> **Sinh viên thực hiện:** Trần Trọng Quyết (MSSV: 425000143 – Lớp: 25CT401)  
> **Đơn vị:** Khoa Công Nghệ Thông Tin – Trường Đại học Lạc Hồng (LHU Đồng Nai)  
> **Kho lưu trữ GitHub:** [TranTrongQuyet-1812/BookNest](https://github.com/TranTrongQuyet-1812/BookNest)

---

## 1. Giới Thiệu Tổng Quan
**BookNest** là hệ thống quản lý kho sách và sàn thương mại điện tử chuyên ngành sách được xây dựng theo chuẩn kiến trúc phân tầng doanh nghiệp **SERN Stack** (SQL Server, Express.js, React, Node.js). 

Dự án chú trọng đặc biệt vào:
- **Chuẩn hóa Cơ sở dữ liệu 3NF:** 9 bảng quan hệ chặt chẽ, 12 khóa ngoại `ON DELETE NO ACTION`, bảng mã `Vietnamese_CI_AI` hỗ trợ tiếng Việt toàn diện, 10 chỉ mục (Index) tối ưu hiệu năng.
- **Bảo mật & Phân quyền RBAC:** Xác thực JWT Stateless kết hợp kiểm soát truy cập dựa trên vai trò (4 vai trò: `customer`, `librarian`, `order_staff`, `admin`), mã hóa mật khẩu Bcrypt với salt rounds 10, chống lộ thông tin với IDOR Guard.
- **Toàn vẹn Dữ liệu & Xử lý Đồng thời:** Giao dịch đặt hàng nguyên tử (Database Transaction) với điều kiện cập nhật chống bán âm kho (Race Condition Prevention), máy trạng thái luân chuyển đơn hàng 1 chiều.
- **Tài liệu hóa API & Kiểm thử tự động:** Swagger UI OpenAPI 3.0 tại `/api-docs`, 100% kiểm thử tự động với Jest & Supertest (9 test suites, **110/110 tests passed**).

---

## 2. Công Nghệ Sử Dụng
- **Database Engine:** Microsoft SQL Server 2022 Express Edition (Cổng 1433, Collation: `Vietnamese_CI_AI`).
- **Backend Framework:** Node.js (v20+) & Express.js 5.x.
- **ORM & Database Driver:** Sequelize 6.x & Tedious 20.x.
- **Xác thực & Mã hóa:** JSON Web Token (`jsonwebtoken`), `bcryptjs`.
- **Validation:** Joi validator.
- **API Documentation:** Swagger UI Express & Swagger JSDoc.
- **Automated Testing:** Jest & Supertest.
- **Frontend SPA:** React 19, Vite, React Router DOM, Axios, Lucide Icons, Custom Warm Paper Design System (Hỗ trợ 2 chế độ: Sáng Giấy Ngà `#FBF9F5` và Tối Dịu Mắt `#18181B`).

---

## 3. Cấu Trúc Thư Mục Dự Án
```text
Project_MonBE/
├── database/                   # Kịch bản DDL và dữ liệu mẫu SQL Server
│   ├── 01_tao_bang.sql         # Tạo 9 bảng chuẩn 3NF, 12 FK, 10 Index
│   └── 02_du_lieu_mau.sql      # Seed 36 cuốn sách, 8 tài khoản, đơn hàng demo
├── backend/                    # Mã nguồn máy chủ Node.js / Express
│   ├── src/
│   │   ├── config/             # Cấu hình CSDL, JWT, Swagger OpenAPI
│   │   ├── controllers/        # Điều phối HTTP request/response
│   │   ├── services/           # Nghiệp vụ cốt lõi & giao dịch Transaction
│   │   ├── models/             # Định nghĩa 9 Models Sequelize quan hệ
│   │   ├── middlewares/        # Xác thực JWT, RBAC, IDOR Guard, Xử lý lỗi
│   │   ├── routes/             # Định tuyến API theo phân hệ
│   │   ├── app.js              # Express Application & Routing
│   │   └── server.js           # Khởi động máy chủ cổng 5000
│   └── tests/                  # 9 Test Suites tự động Jest (110 tests)
├── frontend/                   # Ứng dụng giao diện khách hàng & quản trị (Vite React)
│   ├── src/
│   │   ├── components/         # Navbar, Footer, Route Guards, Star Rating
│   │   ├── context/            # AuthContext (JWT, User Profile, Theme switch)
│   │   ├── pages/              # Storefront (Trang chủ, Chi tiết sách, Giỏ hàng, Đơn hàng)
│   │   └── pages/admin/        # Back-Office (Dashboard thống kê, Sách, Kho, Đơn hàng, Nhân sự)
│   └── vite.config.js          # Proxy /api sang backend port 5000
├── PROMPT_LOG.md               # Nhật ký 12 prompt điều hướng và phản biện AI (T24)
└── README.md                   # Hướng dẫn cài đặt và sử dụng hệ thống
```

---

## 4. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Chuẩn bị Cơ sở dữ liệu MS SQL Server
1. Mở **SQL Server Configuration Manager**, đảm bảo dịch vụ **SQL Server (SQLEXPRESS)** đang chạy và giao thức **TCP/IP** đã được `Enabled` ở cổng **1433**.
2. Mở **SQL Server Management Studio (SSMS)** hoặc công cụ dòng lệnh:
   - Chạy tập lệnh [`database/01_tao_bang.sql`](./database/01_tao_bang.sql) để tạo cơ sở dữ liệu `BookNestDB` và 9 bảng.
   - Chạy tập lệnh [`database/02_du_lieu_mau.sql`](./database/02_du_lieu_mau.sql) để nạp 36 cuốn sách và các tài khoản demo.

### Bước 2: Cấu hình Môi trường Backend
1. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Tạo file cấu hình môi trường `.env` từ file mẫu:
   ```bash
   cp .env.example .env
   # Hoặc trên Windows PowerShell:
   copy .env.example .env
   ```
   *Sau đó mở file `.env` vừa tạo để điền thông tin kết nối SQL Server trên máy của bạn (`DB_USER`, `DB_PASSWORD`).*
3. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
4. Chạy kiểm thử tự động đảm bảo toàn bộ hệ thống hoạt động chính xác:
   ```bash
   npm test
   # Kết quả: 9 suites passed, 110 tests passed 100%
   ```
5. Khởi động máy chủ backend:
   ```bash
   npm run dev
   # Backend chạy tại: http://localhost:5000
   ```

### Bước 3: Khởi chạy Giao diện Frontend
1. Mở một terminal mới và di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Truy cập ứng dụng tại: **`http://localhost:3000`**

---

## 5. Danh Sách Tài Khoản Demo Hệ Thống
Tất cả các tài khoản demo đều dùng chung mật khẩu: **`BookNest@123`** (Trang đăng nhập có sẵn 4 nút bấm điền nhanh chỉ bằng 1 cú click):

| Vai trò | Email đăng nhập | Quyền hạn trong hệ thống |
| :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@booknest.vn` | Toàn quyền: Thống kê doanh thu, Quản lý sách & kho, Xử lý đơn, Quản lý tài khoản nhân sự |
| **Thủ thư (Librarian)** | `thuthu@booknest.vn` | Quản lý danh mục sách, Thêm/sửa sách, Lập phiếu nhập kho, Cảnh báo sách sắp hết |
| **Nhân viên đơn (Order Staff)** | `nhanvien@booknest.vn` | Xem đơn toàn hệ thống, Luân chuyển trạng thái đơn (Duyệt -> Giao -> Hoàn tất), Hủy đơn hoàn kho |
| **Khách hàng (Customer)** | `khachhang@booknest.vn` | Tìm kiếm sách, Thêm giỏ hàng, Đặt mua hàng COD, Quản lý đơn cá nhân, Viết đánh giá sản phẩm |

---

## 6. Tài Liệu API & Swagger UI
- Địa chỉ truy cập tài liệu tương tác: **`http://localhost:5000/api-docs`**
- Hỗ trợ nút **Authorize** với Bearer JWT để thử nghiệm trực tiếp mọi endpoint có phân quyền trên trình duyệt.

---

## 7. Tài Liệu Hỗ Trợ Đồ Án
- [`PROMPT_LOG.md`](./PROMPT_LOG.md): Nhật ký 12 prompt điều hướng và phản biện AI chuẩn cấu trúc Context – Task – Constraint.
