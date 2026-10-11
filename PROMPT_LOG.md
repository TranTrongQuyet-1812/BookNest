# NHẬT KÝ SỬ DỤNG AI (PROMPT_LOG.md)
## Dự Án: BookNest – Hệ Thống Quản Lý & Nhà Sách Trực Tuyến
- **Tác giả:** Trần Trọng Quyết (MSSV: 425000143 - Lớp: 25CT401)
- **Đơn vị:** Khoa Công Nghệ Thông Tin – Trường Đại học Lạc Hồng (LHU)
- **Công cụ AI hỗ trợ:** Antigravity (DeepMind Engine) & Claude Sonnet 3.5 / Gemini 2.5
- **Mục tiêu nhật ký:** Ghi chép phương pháp điều hướng AI thông qua kỹ thuật Prompting theo cấu trúc **Context – Task – Constraint**, phân tích phản biện các điểm yếu/sai sót kỹ thuật của AI và cách khắc phục trong thực tế.

---

### MỤC LỤC 12 PROMPT TRỌNG TÂM
1. [Prompt 01: Thiết kế Cơ sở dữ liệu chuẩn 3NF trên MS SQL Server 2022](#prompt-01-thiết-kế-cơ-sở-dữ-liệu-chuẩn-3nf-trên-ms-sql-server-2022)
2. [Prompt 02: Xây dựng Kiến trúc Phân tầng Express & Chuẩn hóa Phản hồi](#prompt-02-xây-dựng-kiến-trúc-phân-tầng-express--chuẩn-hóa-phản-hồi)
3. [Prompt 03: Xác thực JWT Stateless & Phân quyền RBAC 4 Vai Trò](#prompt-03-xác-thực-jwt-stateless--phân-quyền-rbac-4-vai-trò)
4. [Prompt 04: Truy vấn Tìm kiếm Sách Đa tiêu chí & Chống SQL Injection](#prompt-04-truy-vấn-tìm-kiếm-sách-đa-tiêu-chí--chống-sql-injection)
5. [Prompt 05: Nghiệp vụ Giỏ hàng & Kiểm soát Tồn kho Phía Client](#prompt-05-nghiệp-vụ-giỏ-hàng--kiểm-soát-tồn-kho-phía-client)
6. [Prompt 06: Đặt hàng Nguyên tử (Transaction) & Chống Bán Âm Kho Concurrency](#prompt-06-đặt-hàng-nguyên-tử-transaction--chống-bán-âm-kho-concurrency) ⭐
7. [Prompt 07: Ngăn chặn Lỗ hổng IDOR khi Tra cứu & Hủy đơn của Khách](#prompt-07-ngăn-chặn-lỗ-hổng-idor-khi-tra-cứu--hủy-đơn-của-khách)
8. [Prompt 08: Máy trạng thái (State Machine) & Khóa Lạc quan Đơn hàng](#prompt-08-máy-trạng-thái-state-machine--khóa-lạc-quan-đơn-hàng)
9. [Prompt 09: Đánh giá Sách Xác thực Người mua Thực tế (Verified Buyer)](#prompt-09-đánh-giá-sách-xác-thực-người-mua-thực-tế-verified-buyer)
10. [Prompt 10: Thống kê Gom nhóm Doanh thu & Chống Lỗi Chia Cho Không](#prompt-10-thống-kê-gom-nhóm-doanh-thu--chống-lỗi-chia-cho-không) ⭐
11. [Prompt 11: Thiết kế Bộ Unit Test Thuần Logic Không Cần Database Thật](#prompt-11-thiết-kế-bộ-unit-test-thuần-logic-không-cần-database-thật)
12. [Prompt 12: Xử lý Tranh chấp Connection Pool SQL Server trong Jest](#prompt-12-xử-lý-tranh-chấp-connection-pool-sql-server-trong-jest) ⭐

---

### Prompt 01: Thiết kế Cơ sở dữ liệu chuẩn 3NF trên MS SQL Server 2022
- **Task liên quan:** T02, T03 (Phase GĐ1)
- **Công cụ:** Antigravity / Gemini 2.5
- **Prompt:**
  > **Context:** Dự án BookNest là hệ thống quản lý và bán sách trực tuyến xây dựng trên MS SQL Server 2022 Express.
  > **Task:** Viết kịch bản DDL `01_tao_bang.sql` tạo 9 bảng: `NguoiDung`, `DanhMuc`, `Sach`, `GioHang`, `ChiTietGioHang`, `DonHang`, `ChiTietDonHang`, `PhieuNhapKho`, `DanhGia`.
  > **Constraint:**
  > 1. Chuẩn hóa bậc 3 (3NF).
  > 2. Đặt `Collation Vietnamese_CI_AI` trên toàn bộ database và các cột văn bản tiếng Việt để tìm kiếm không dấu/có dấu chính xác.
  > 3. Tuyệt đối không dùng `CASCADE DELETE` trên 12 khóa ngoại; phải đặt `ON DELETE NO ACTION` để tránh lỗi Multiple Cascade Paths trong SQL Server và bảo toàn lịch sử giao dịch.
  > 4. Tạo đầy đủ 10 chỉ mục (Index) trên các cột tìm kiếm và khóa ngoại thường dùng.
- **Vì sao viết như vậy:** SQL Server có cơ chế chặn chu trình cascade nghiêm ngặt (lỗi 1785). Nếu không ép `NO ACTION`, AI mặc định sẽ sinh `ON DELETE CASCADE` gây lỗi biên dịch DDL.
- **Kết quả AI trả về:** Sinh mã SQL đầy đủ bảng, khóa chính IDENTITY(1,1), kiểm tra ràng buộc CHECK (giá >= 0, số lượng >= 0).
- **Điểm yếu của AI phát hiện:** AI ban đầu định thêm cột `TongTien` vào bảng `Sach` và tính toán động trực tiếp từ chi tiết đơn hàng, gây phụ thuộc bắc cầu vi phạm 3NF.
- **Cách khắc phục:** Yêu cầu AI loại bỏ cột dư thừa, chỉ lưu đơn giá lịch sử `DonGia` trong `ChiTietDonHang` và giải thích lý do lưu `TongTien` trong `DonHang` là denormalization có chủ đích để tăng tốc độ truy vấn báo cáo.

---

### Prompt 02: Xây dựng Kiến trúc Phân tầng Express & Chuẩn hóa Phản hồi
- **Task liên quan:** T04, T05 (Phase GĐ2)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Hệ thống backend viết bằng Express 5 và Node.js.
  > **Task:** Thiết lập cấu trúc thư mục Controller – Service – Model, tách biệt `app.js` và `server.js`. Viết bộ middleware phản hồi chuẩn `phanHoi.js` và xử lý lỗi tập trung `xuLyLoi.js`.
  > **Constraint:**
  > 1. Controller chỉ nhận `req`, trích xuất tham số, gọi Service và trả về `res`. Tuyệt đối không viết câu lệnh ORM/SQL trong Controller.
  > 2. Mọi API trả về định dạng JSON thống nhất: `{ success: true/false, message: '...', data: ... }`.
  > 3. Khi xảy ra lỗi máy chủ (500), tuyệt đối không để lộ Stack Trace hoặc chuỗi kết nối Database ra ngoài client vì lý do bảo mật.
  > 4. Toàn bộ chú thích code (comment) phải viết bằng tiếng Việt 100% có dấu, giải thích rõ "vì sao" chứ không nhắc lại cú pháp.
- **Kết quả AI:** Tạo khung chuẩn mực, hàm ngắn gọn dưới 30 dòng, bắt đúng các loại lỗi (ValidationError của Joi, DatabaseError của Sequelize).

---

### Prompt 03: Xác thực JWT Stateless & Phân quyền RBAC 4 Vai Trò
- **Task liên quan:** T07, T08 (Phase GĐ3)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Hệ thống BookNest có 4 vai trò: `customer`, `librarian`, `order_staff`, `admin`.
  > **Task:** Viết middleware xác thực token `xacThucToken.js` và middleware kiểm tra quyền `phanQuyen.js(vaiTroChoPhep)`.
  > **Constraint:**
  > 1. Dùng JSON Web Token (JWT) stateless, đọc từ header `Authorization: Bearer <token>`.
  > 2. Phân biệt rõ mã lỗi HTTP: Chưa đăng nhập hoặc token sai trả **401 Unauthorized**; Đã đăng nhập nhưng không đủ thẩm quyền trả **403 Forbidden**.
  > 3. Không lưu mật khẩu hash trong payload của token.
  > 4. Viết thêm middleware tùy chọn `xacThucTuyChon.js` để người dùng chưa đăng nhập vẫn xem được sách công khai, nhưng nếu có token nhân sự thì cho phép xem cả sách ẩn.
- **Kết quả AI:** Tạo middleware kiểm tra `req.user.vaiTro` chính xác, hỗ trợ truyền mảng các vai trò được cấp phép.

---

### Prompt 04: Truy vấn Tìm kiếm Sách Đa tiêu chí & Chống SQL Injection
- **Task liên quan:** T10 (Phase GĐ4)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Trang tìm kiếm sách phía khách hàng và quản trị.
  > **Task:** Viết `layDanhSachSach` trong `sachService.js` hỗ trợ lọc theo từ khóa `q` (tìm trong tựa đề và tác giả), theo `maDanhMuc`, khoảng giá `giaTu` - `giaDen`, sắp xếp linh hoạt và phân trang `page`, `limit`.
  > **Constraint:**
  > 1. Sử dụng Sequelize Operators (`Op.like`, `Op.gte`, `Op.lte`) với Parameterized Binding an toàn 100%, không nối chuỗi thô để chống triệt để SQL Injection.
  > 2. Giới hạn `limit` tối đa không vượt quá 100 để chống tấn công DoS làm nghẽn bộ nhớ.
  > 3. Mặc định chỉ trả về sách đang bán (`DaAn = 0`), trừ khi người gọi là nhân sự có quyền (`librarian`, `admin`).
- **Kết quả AI:** Truy vấn trả về cả `duLieu` và metadata `phanTrang` (`page`, `limit`, `total`, `totalPages`).

---

### Prompt 05: Nghiệp vụ Giỏ hàng & Kiểm soát Tồn kho Phía Client
- **Task liên quan:** T12 (Phase GĐ5)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Khách hàng thêm sách vào giỏ trước khi thanh toán. Mỗi người dùng chỉ có 1 giỏ hàng duy nhất (`GioHang`).
  > **Task:** Viết API quản lý giỏ hàng: xem giỏ, thêm vào giỏ, cập nhật số lượng, xóa từng mục và dọn sạch giỏ.
  > **Constraint:**
  > 1. Tìm hoặc tự khởi tạo giỏ hàng nếu chưa có (`findOrCreate`).
  > 2. Nếu sách đã có trong giỏ, cộng dồn số lượng.
  > 3. Không cho phép số lượng < 1.
  > 4. Tính toán tổng tiền động dựa trên đơn giá hiện tại của bảng `Sach`, không tin tưởng dữ liệu client gửi lên.
- **Kết quả AI:** Code xử lý chuẩn xác, kèm liên kết include thông tin sách và thể loại để frontend hiển thị.

---

### Prompt 06: Đặt hàng Nguyên tử (Transaction) & Chống Bán Âm Kho Concurrency ⭐
- **Task liên quan:** T13 (Phase GĐ5)
- **Công cụ:** Antigravity / Claude Sonnet 3.5
- **Prompt:**
  > **Context:** Nghiệp vụ thanh toán và trừ kho khi khách bấm Đặt Hàng. Đây là logic có rủi ro cao nhất trong đồ án.
  > **Task:** Viết hàm `taoDonHang` trong `donHangService.js` thực hiện: kiểm tra giỏ hàng, tạo bản ghi `DonHang`, tạo các `ChiTietDonHang`, trừ số lượng tồn kho `SoLuongTon` trong `Sach`, xóa các mục trong `ChiTietGioHang`.
  > **Constraint:**
  > 1. Phải bọc toàn bộ chuỗi thao tác trong một Database Transaction (`sequelize.transaction()`).
  > 2. **Phải chống được race condition (bán âm kho)** khi nhiều người cùng đặt cuốn sách cuối cùng tại cùng một thời điểm microsecond.
  > 3. Nếu bất kỳ sản phẩm nào không đủ hàng, phải ném lỗi cụ thể và Transaction phải tự động ROLLBACK hoàn toàn, không lưu đơn rác.
- **Điểm yếu của AI phát hiện:** 
  - AI ban đầu viết theo mô hình ngây thơ: Đọc `sach.soLuongTon` lên bộ nhớ JS kiểm tra `if (sach.soLuongTon < soLuongMua)`, sau đó mới gọi `sach.soLuongTon -= soLuongMua; await sach.save()`.
  - **Lỗ hổng:** Giữa thời điểm đọc (SELECT) và thời điểm ghi (UPDATE), nếu có 2 request đồng thời, cả hai đều thấy số lượng còn 1 và đều trừ kho -> Kho sách bị âm (-1)!
- **Cách mình khắc phục & ép AI sửa:**
  - Yêu cầu AI chuyển sang câu lệnh atomic UPDATE có điều kiện trực tiếp dưới Database engine:
    ```sql
    UPDATE Sach 
    SET SoLuongTon = SoLuongTon - :soLuong 
    WHERE MaSach = :maSach AND SoLuongTon >= :soLuong AND DaAn = 0
    ```
  - Kiểm tra số dòng bị ảnh hưởng (`affectedRows`). Nếu trả về `0`, chứng minh sách đã bị người khác mua hết ngay tức khắc -> ném lỗi hết hàng và trigger rollback ngay lập tức. Đây là giải pháp Concurrency Control chuẩn mực cấp doanh nghiệp!

---

### Prompt 07: Ngăn chặn Lỗ hổng IDOR khi Tra cứu & Hủy đơn của Khách
- **Task liên quan:** T14 (Phase GĐ5)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Khách hàng tra cứu chi tiết đơn hàng qua `GET /api/orders/:id` hoặc yêu cầu hủy đơn qua `PUT /api/orders/:id/cancel`.
  > **Task:** Viết middleware hoặc logic service ngăn chặn lỗ hổng IDOR (Insecure Direct Object References).
  > **Constraint:**
  > 1. Khách hàng chỉ được phép xem và hủy đơn hàng do chính mình sở hữu (`MaNguoiDung === req.user.maNguoiDung`).
  > 2. Nếu khách hàng cố tình thay đổi `:id` trên URL để xem đơn hàng của người khác, hệ thống phải trả về **404 Not Found** (không trả về 403 để tránh rò rỉ thông tin về sự tồn tại của tài nguyên).
  > 3. Riêng Quản trị viên (`admin`) được phép truy cập để hỗ trợ khách hàng.
  > 4. Khi hủy đơn, chỉ cho phép hủy khi trạng thái là `PENDING` và phải hoàn lại số lượng tồn kho vào bảng `Sach` trong transaction.
- **Kết quả AI:** Tạo middleware `kiemTraChuDon.js` và hàm `huyDonHang` hoàn kho an toàn tuyệt đối.

---

### Prompt 08: Máy trạng thái (State Machine) & Khóa Lạc quan Đơn hàng
- **Task liên quan:** T15 (Phase GĐ5)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Phân hệ Back-Office nhân viên đơn hàng xử lý tiến độ đơn giao.
  > **Task:** Viết logic kiểm soát luân chuyển trạng thái đơn hàng trong `donHangService.js`.
  > **Constraint:**
  > 1. Tuân thủ nghiêm ngặt máy trạng thái một chiều: `PENDING` ➔ `CONFIRMED` ➔ `SHIPPING` ➔ `DELIVERED`.
  > 2. Chặn tuyệt đối mọi hành vi đi lùi (ví dụ từ DELIVERED về SHIPPING) hoặc nhảy cóc (từ PENDING sang SHIPPING).
  > 3. Trạng thái `DELIVERED` và `CANCELLED` là trạng thái kết thúc (Terminal State), không thể đổi sang bất kỳ trạng thái nào khác.
  > 4. Sử dụng Optimistic Lock: `WHERE MaDonHang = :id AND TrangThai = :trangThaiHienTai` để chống lỗi 2 nhân viên cùng bấm duyệt một đơn hàng cùng lúc.
- **Kết quả AI:** Viết hàm thuần `kiemTraChuyenTrangThai(cu, moi)` trả về boolean hoặc ném lỗi cụ thể, dễ dàng đem ra viết Unit Test ở T20.

---

### Prompt 09: Đánh giá Sách Xác thực Người mua Thực tế (Verified Buyer)
- **Task liên quan:** T16 (Phase GĐ5)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Tính năng nhận xét và chấm sao sách (1 đến 5 sao).
  > **Task:** Viết API `POST /api/books/:id/reviews` cho phép bạn đọc đánh giá sách.
  > **Constraint:**
  > 1. Áp dụng quy tắc "Verified Buyer": Chỉ người dùng đã từng mua cuốn sách này trong một đơn hàng có trạng thái `DELIVERED` mới có quyền gửi đánh giá. Khách chưa mua hoặc đơn đang giao bị từ chối với thông điệp rõ ràng.
  > 2. Một khách hàng chỉ có tối đa 1 đánh giá cho mỗi cuốn sách; nếu gửi lại thì cập nhật (Upsert) số sao và nhận xét cũ.
  > 3. Số sao bắt buộc từ 1 đến 5 (kiểm tra bằng Joi validator).
- **Kết quả AI:** Truy vấn kiểm tra qua bảng `DonHang` JOIN `ChiTietDonHang` tìm điều kiện `TrangThai = 'DELIVERED'` chuẩn xác.

---

### Prompt 10: Thống kê Gom nhóm Doanh thu & Chống Lỗi Chia Cho Không ⭐
- **Task liên quan:** T18 (Phase GĐ6)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Bảng điều khiển Dashboard dành riêng cho Admin.
  > **Task:** Viết 3 API thống kê: Tổng quan doanh thu (`/overview`), Top 5 sách bán chạy (`/top-books`), Tỷ lệ các trạng thái đơn hàng (`/order-rates`).
  > **Constraint:**
  > 1. Doanh thu và số lượng bán chỉ được tính từ các đơn hàng có trạng thái `DELIVERED` (đã giao và thanh toán thành công).
  > 2. Sử dụng các hàm gom nhóm SQL Server (`SUM`, `COUNT`, `GROUP BY`, `ORDER BY DESC`).
  > 3. Ở hàm tính tỷ lệ đơn hàng, phải bọc toán tử chia để chống triệt để lỗi "Divide by zero error" (chia cho 0) khi hệ thống chưa có đơn hàng nào.
- **Điểm yếu của AI phát hiện:**
  - AI sử dụng Sequelize helper: `Model.findOne({ attributes: [[fn('AVG', ...)], [fn('COUNT', ...)]] })`.
  - **Lỗi kỹ thuật:** Với MSSQL dialect, Sequelize tự động gắn thêm mệnh đề `ORDER BY [PrimaryKey] OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`. SQL Server ngay lập tức quăng lỗi biên dịch `Error 8127: Column 'PrimaryKey' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause`.
- **Cách mình khắc phục:**
  - Hướng dẫn AI chuyển sang viết truy vấn SQL Scalar Aggregate thuần qua `sequelize.query('SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) ...', { type: QueryTypes.SELECT })`. Giải quyết triệt để lỗi 8127 của SQL Server.

---

### Prompt 11: Thiết kế Bộ Unit Test Thuần Logic Không Cần Database Thật
- **Task liên quan:** T20 (Phase GĐ7)
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Yêu cầu rubric chấm điểm: Cần tối thiểu 5 Unit Test kiểm thử logic nghiệp vụ cốt lõi, chạy độc lập không phụ thuộc vào Database thật.
  > **Task:** Viết test suite `backend/tests/unit_pure_logic.test.js` kiểm tra 19 trường hợp logic thuần túy.
  > **Constraint:**
  > 1. Không gọi kết nối DB, không chờ timeout server.
  > 2. Kiểm thử: Chuyển trạng thái đơn hàng (tiến, lùi, nhảy cóc), Phân quyền RBAC (403/next), Token JWT (401/hợp lệ), Tính tổng tiền đơn hàng, Mã hóa bcrypt, Chống chia cho 0 khi tính tỷ lệ, Kiểm tra chủ đơn chống IDOR.
  > 3. Tên mỗi test case viết bằng tiếng Việt mô tả rõ hành vi đang bảo vệ.
- **Kết quả AI:** 19/19 test chạy hoàn tất chỉ trong 1.8 giây, màu xanh 100%.

---

### Prompt 12: Xử lý Tranh chấp Connection Pool SQL Server trong Jest ⭐
- **Task liên quan:** Phase GĐ7
- **Công cụ:** Antigravity
- **Prompt:**
  > **Context:** Khi chạy toàn bộ 9 test suites tích hợp của BookNest bằng lệnh `npm test` (`jest`).
  > **Vấn đề phát sinh:** Mặc định Jest chạy các file test song song đa luồng (parallel). Nhiều worker cùng mở transaction và khóa bảng trên SQL Server cục bộ gây nghẽn pool kết nối (`tedious Connection Timeout: 5000ms`).
  > **Task:** Đề xuất giải pháp cấu hình Jest chuẩn công nghiệp cho các bài kiểm thử cơ sở dữ liệu quan hệ.
  > **Constraint:** Không được sửa code nghiệp vụ backend; phải đảm bảo toàn bộ 110 tests chạy qua 100% không bị timeout.
- **Cách khắc phục thực tế:**
  - Thêm cờ `--runInBand` vào script test trong `package.json`: `"test": "jest --runInBand"`.
  - Cờ này yêu cầu Jest chạy tuần tự từng suite một cách kỷ luật, giải phóng transaction và connection pool giữa các suite, giúp 110/110 test chạy mượt mà, xanh 100%.

---

## TỔNG KẾT BÀI HỌC KHI LÀM VIỆC VỚI AI
1. **AI giỏi sinh cú pháp nhưng hay bỏ qua Concurrency:** AI thường viết code theo tư duy tuần tự đơn luồng (đọc rồi ghi). Người lập trình viên phải chủ động ép AI dùng cơ chế khóa nguyên tử (`UPDATE WHERE`) và `Transaction` để bảo vệ dữ liệu.
2. **Khác biệt giữa các Database Dialect:** AI hay mặc định cú pháp của MySQL/Postgres. Khi làm việc với MS SQL Server (MSSQL), phải luôn kiểm tra các ràng buộc về collation tiếng Việt, chu trình khóa ngoại `NO ACTION`, và lỗi `GROUP BY` khi dùng hàm tổng hợp.
3. **Giá trị của việc kiểm chứng bằng Test:** Mọi đoạn code AI viết ra đều phải có Integration Test và Unit Test bọc xung quanh. Thấy test xanh và thử cố tình sửa sai để test chuyển đỏ mới là bằng chứng xác thực nhất của một phần mềm chất lượng cao.
