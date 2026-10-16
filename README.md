# BookNest – Hệ Thống Quản Lý & Nhà Sách Trực Tuyến

> **Đồ Án Chuyên Đề Backend (SERN Architecture)**  
> **Sinh viên thực hiện:** Trần Trọng Quyết (MSSV: 425000143 – Lớp: 25CT401)  
> **Đơn vị:** Khoa Công Nghệ Thông Tin – Trường Đại học Lạc Hồng (LHU Đồng Nai)  
> **Kho lưu trữ GitHub:** [TranTrongQuyet-1812/BookNest](https://github.com/TranTrongQuyet-1812/BookNest)

---

## 1. Giới Thiệu Tổng Quan
**BookNest** là hệ thống quản lý kho sách và sàn thương mại điện tử chuyên ngành sách được xây dựng theo chuẩn kiến trúc phân tầng doanh nghiệp **SERN Stack** (SQL Server, Express.js, React, Node.js). 

Dự án chú trọng đặc biệt vào:
- **Chuẩn hóa Cơ sở dữ liệu 3NF:** 16 bảng quan hệ chặt chẽ (tài khoản tách riêng `NhanVien` và `KhachHang`; thanh toán, cấu hình hệ thống, nhật ký), khóa ngoại `ON DELETE NO ACTION`, bảng mã và giá trị mã bằng tiếng Việt, các chỉ mục (Index) tối ưu hiệu năng gồm Covering Indexes tính sao và doanh thu.
- **Bảo mật & Phân quyền RBAC:** Xác thực JWT Stateless kết hợp kiểm soát truy cập dựa trên vai trò (khách hàng và 3 vai trò nhân sự: `quan_tri`, `thu_kho`, `thu_thu`; hai cổng đăng nhập riêng), mã hóa mật khẩu Bcrypt với salt rounds 10, chống lộ thông tin với IDOR Guard, bảo vệ HTTP Headers với **Helmet**, chống brute-force đăng nhập với **express-rate-limit**.
- **Toàn vẹn Dữ liệu & Xử lý Đồng thời:** Giao dịch đặt hàng nguyên tử (Database Transaction kết hợp chỉ dẫn khóa dòng `tableHint: TableHints.UPDLOCK` sinh `WITH (UPDLOCK)` thực thi trên MS SQL Server) chống bán âm kho (Race Condition Prevention), thuật toán sắp xếp khóa dòng `MaSach ASC` chống Deadlock 1205, máy trạng thái luân chuyển đơn hàng 1 chiều.
- **Thanh toán, thời gian thực và AI:** thanh toán chuyển khoản VietQR qua **payOS** (xác thực chữ ký webhook, tự hủy đơn quá hạn 15 phút và hoàn kho) song song với COD; **Socket.IO** báo thanh toán và đơn mới tức thì; **AI Chatbot** tư vấn sách trên nền NVIDIA NIM (function calling); gửi email hóa đơn và OTP quên mật khẩu; bán sách tại quầy cho thủ thư.
- **Tài liệu hóa API & Kiểm thử tự động:** Swagger UI OpenAPI 3.0 tại `/api-docs` mô tả đầy đủ **mọi endpoint**, chuẩn RESTful không route alias.

---

## 2. Công Nghệ Sử Dụng
- **Database Engine:** Microsoft SQL Server 2022 Express Edition (Cổng 1433, Collation `Vietnamese_CI_AI` cho cột `TenSach` & `TacGia`; tìm kiếm không dấu ép so sánh bằng `Latin1_General_CI_AI`).
- **Backend Framework:** Node.js (v20+) & Express.js 5.x.
- **Bảo mật:** `helmet`, `express-rate-limit`, `cors`, `jsonwebtoken`, `bcryptjs`.
- **ORM & Database Driver:** Sequelize 6.x & Tedious 20.x.
- **Validation:** Joi validator.
- **Thời gian thực & tích hợp:** Socket.IO, `@payos/node` (VietQR), Nodemailer (email), NVIDIA NIM API (AI Chatbot).
- **API Documentation:** Swagger UI Express & Swagger JSDoc.
- **Frontend SPA:** React 19, Vite, React Router DOM, Axios, Lucide Icons, Zustand (giỏ hàng), GSAP, Three.js (hiệu ứng), Custom Warm Paper Design System (Hỗ trợ 2 chế độ: Sáng Giấy Ngà `#FBF9F5` và Tối Dịu Mắt `#18181B`).

---

## 3. Cấu Trúc Thư Mục Dự Án
```text
Project_MonBE/
├── database/                   # Kịch bản DDL và dữ liệu mẫu SQL Server
│   ├── 01_tao_bang.sql         # Tạo 12 bảng đầu, ràng buộc và Index tối ưu
│   ├── 02_du_lieu_mau.sql      # Seed 36 cuốn sách, 8 tài khoản, đơn hàng demo tuần tự
│   ├── 03_don_dep_du_lieu_rac.sql # Kịch bản khôi phục và dọn dẹp CSDL về trạng thái sạch
│   ├── 04_cau_hinh_va_toi_uu_index.sql # Kịch bản cấu hình RCSI, AUTO_CLOSE và index phủ
│   └── 05 → 14_*.sql           # Nâng cấp theo từng giai đoạn: tách tài khoản, bán tại quầy, payOS, mã tra cứu, chatbot, kiểm duyệt đánh giá
├── backend/                    # Mã nguồn máy chủ Node.js / Express
│   ├── src/
│   │   ├── config/             # Cấu hình CSDL, JWT, Swagger OpenAPI
│   │   ├── controllers/        # Điều phối HTTP request/response
│   │   ├── services/           # Nghiệp vụ cốt lõi & giao dịch Transaction
│   │   ├── models/             # Định nghĩa 16 Models Sequelize quan hệ
│   │   ├── middlewares/        # Xác thực JWT, RBAC, IDOR Guard, Rate Limiter, Xử lý lỗi
│   │   ├── routes/             # Định tuyến API theo phân hệ (9 router files)
│   │   ├── app.js              # Express Application, Helmet & Routing
│   │   └── server.js           # Khởi động máy chủ cổng 5000
├── frontend/                   # Ứng dụng khách hàng (Vite React)
│   ├── src/
│   │   ├── components/         # Navbar, Footer, Route Guards, Star Rating
│   │   ├── context/            # AuthContext (JWT, User Profile, Theme switch)
│   │   ├── pages/              # Storefront (Trang chủ, Chi tiết sách, Giỏ hàng, Đơn hàng)
│   └── vite.config.js          # Proxy /api sang backend port 5000
├── frontend-admin/             # Ứng dụng Back-Office độc lập (Vite React)
├── packages/shared/            # API client và xác thực dùng chung qua npm workspace
└── README.md                   # Hướng dẫn cài đặt và sử dụng hệ thống
```

---

## 4. Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Chuẩn bị Cơ sở dữ liệu MS SQL Server
1. Mở **SQL Server Configuration Manager**, đảm bảo dịch vụ **SQL Server (SQLEXPRESS)** đang chạy và giao thức **TCP/IP** đã được `Enabled` ở cổng **1433**.
2. Mở **SQL Server Management Studio (SSMS)** hoặc công cụ dòng lệnh:
   - Tạo trước một CSDL trống (script không tự tạo CSDL): `CREATE DATABASE BookNestDB COLLATE Vietnamese_CI_AI;`
   - Chạy tập lệnh [`database/01_tao_bang.sql`](./database/01_tao_bang.sql) để tạo 12 bảng cùng các chỉ mục tối ưu trong `BookNestDB`.
   - Chạy tập lệnh [`database/02_du_lieu_mau.sql`](./database/02_du_lieu_mau.sql) để nạp 36 cuốn sách và các tài khoản demo.
   - Sau đó chạy lần lượt `10_them_ma_tra_cuu_don_hang.sql`, `08_tao_bang_thanh_toan_payos.sql`, `12_them_cong_tac_ai_chatbot.sql`, `13_tao_bang_nhat_ky_chatbot.sql`, `14_kiem_duyet_danh_gia.sql` để có đủ 16 bảng (thanh toán payOS, cấu hình hệ thống, nhật ký chatbot, kiểm duyệt đánh giá).
   - *(Tùy chọn nâng cao)*: Chạy [`database/04_cau_hinh_va_toi_uu_index.sql`](./database/04_cau_hinh_va_toi_uu_index.sql) để kích hoạt RCSI (`READ_COMMITTED_SNAPSHOT`) và tắt `AUTO_CLOSE`.

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
   *Sau đó mở file `.env` vừa tạo để điền thông tin kết nối SQL Server trên máy của bạn (`DB_USER`, `DB_PASSWORD`, `JWT_SECRET`). Cấu hình `CORS_STOREFRONT_ORIGIN`, `CORS_BACKOFFICE_ORIGIN` và `TRUST_PROXY` theo môi trường triển khai. Các tính năng tùy chọn cần khóa riêng: thanh toán QR (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`), AI Chatbot (`AI_API_KEY` và các biến `AI_*`), gửi email (`EMAIL_*`); thiếu khóa thì tính năng tương ứng tự tắt, hệ thống vẫn chạy. Không đưa khóa thật lên GitHub.*
3. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
4. Khởi động máy chủ backend:
   ```bash
   npm run dev
   # Backend chạy tại: http://localhost:5000
   ```

### Bước 3: Cài workspace và khởi chạy giao diện
1. Tại thư mục gốc dự án, cài các gói giao diện và package dùng chung một lần:
   ```bash
   npm install
   ```
2. Mở terminal mới tại thư mục gốc để chạy cổng khách hàng:
   ```bash
   npm run dev --workspace frontend
   ```
3. Mở terminal khác để chạy cổng nhân viên:
   ```bash
   npm run dev --workspace booknest-backoffice
   ```
4. Truy cập khách hàng tại **`http://localhost:3000`** và Back-Office tại **`http://localhost:5174`**. Hai ứng dụng gọi chung backend và CSDL.

### Triển khai trên một máy chủ
Có thể đặt storefront, Back-Office, backend và SQL Server trên cùng một máy. Caddy hoặc Nginx chạy cùng máy làm reverse proxy và cấp HTTPS; Caddy là lựa chọn gọn nếu chưa có yêu cầu cấu hình đặc thù. Chỉ công khai cổng web cần thiết; SQL Server nên chỉ nhận kết nối nội bộ. Khai báo hai origin frontend trong cấu hình backend và bật `TRUST_PROXY` khi backend nhận request qua proxy.

---

## 5. Danh Sách Tài Khoản Demo Hệ Thống
Tất cả các tài khoản demo đều dùng chung mật khẩu: **`12345678`**:

| Vai trò | Email đăng nhập | Quyền hạn trong hệ thống |
| :--- | :--- | :--- |
| **Quản trị viên** (`quan_tri`) | `admin@booknest.vn` | Toàn quyền: Thống kê doanh thu, Quản lý sách & kho, Xử lý đơn, Quản lý tài khoản nhân sự |
| **Thủ thư** (`thu_thu`) | `thuthu@booknest.vn`, `nhanvien@booknest.vn` | Phụ trách bán hàng: Xem đơn toàn hệ thống, Luân chuyển trạng thái đơn (Duyệt -> Giao -> Hoàn tất), Hủy đơn hoàn kho |
| **Thủ kho** (`thu_kho`) | `thukho@booknest.vn` | Phụ trách hàng hóa: Quản lý danh mục và sách, Lập phiếu nhập kho, Cảnh báo sách sắp hết |
| **Khách hàng** | `khach1@gmail.com` | Tìm kiếm sách, Thêm giỏ hàng, Đặt mua hàng COD, Quản lý đơn cá nhân, Viết đánh giá sản phẩm |

Nhân viên đăng nhập ở **`/admin/login`**, khách hàng đăng nhập ở **`/login`** (hai cổng riêng, hai bảng tài khoản riêng).

---

## 6. Tài Liệu API & Swagger UI
- Địa chỉ truy cập tài liệu tương tác: **`http://localhost:5000/api-docs`**
- Hỗ trợ nút **Authorize** với Bearer JWT để thử nghiệm trực tiếp mọi endpoint có phân quyền trên trình duyệt.
- Cung cấp đặc tả OpenAPI 3.0 chuẩn hóa, mô tả mọi endpoint và không có route alias dư thừa.
