/**
 * Quản lý cấu hình Express Application cho dự án BookNest.
 * Tách biệt app và server để phục vụ viết Unit Test / Integration Test với Supertest.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cauHinh = require('./config/cauHinh');
const { phanHoiThanhCong } = require('./middlewares/phanHoi');
const xuLy404 = require('./middlewares/xuLy404');
const xuLyLoi = require('./middlewares/xuLyLoi');

// Nạp các Router phân hệ
const { routerKhach: xacThucKhachRoutes, routerNhanVien: xacThucNhanVienRoutes } = require('./routes/xacThucRoutes');
const nguoiDungRoutes = require('./routes/nguoiDungRoutes');
const danhMucRoutes = require('./routes/danhMucRoutes');
const sachRoutes = require('./routes/sachRoutes');
const adminRoutes = require('./routes/adminRoutes');
const gioHangRoutes = require('./routes/gioHangRoutes');
const donHangRoutes = require('./routes/donHangRoutes');
const thanhToanRoutes = require('./routes/thanhToanRoutes');
const aiChatbotRoutes = require('./routes/aiChatbotRoutes');
const giamGiaRoutes = require('./routes/giamGiaRoutes');
const { gioiHanChung } = require('./middlewares/gioiHanTanSuat');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { taoPhucVuGiaoDien } = require('./middlewares/phucVuGiaoDien');

const app = express();

// Tin cậy reverse proxy để rate limiting nhận đúng IP của Client
// Chỉ bật khi có proxy thật (TRUST_PROXY trong .env), nếu không client có thể giả header X-Forwarded-For
app.set('trust proxy', cauHinh.soLopProxy);

// Middleware bảo mật HTTP headers (Helmet)
// Tắt CSP nghiêm ngặt để Swagger UI hiển thị tài liệu API trơn tru
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Phục vụ hai giao diện đã build theo tên miền (chỉ bật khi PHUC_VU_GIAO_DIEN=true, ví dụ trên Heroku); đặt trước các route
// để trang chủ (/) trả giao diện thay vì JSON kiểm tra sức khỏe. /api và /socket.io luôn đi tiếp vào API.
if (cauHinh.giaoDien.bat) {
  app.use(taoPhucVuGiaoDien(cauHinh.giaoDien));
}

// Middleware giải mã JSON body và form urlencoded để xử lý dữ liệu gửi lên
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Giới hạn origin theo khu; API vẫn kiểm tra JWT và vai trò cho từng request.
app.use(cors((req, callback) => {
  const origin = req.get('Origin');
  if (!origin) return callback(null, { origin: false });
  const laBackOffice = req.path.startsWith('/api/admin');
  const danhSachNguon = laBackOffice ? cauHinh.corsBackOffice : cauHinh.corsStorefront;
  return callback(null, { origin: danhSachNguon.includes(origin) });
}));

// Tuyến đường kiểm tra tình trạng dịch vụ gốc (Root Health Check)
app.get('/', (req, res) => {
  return phanHoiThanhCong(res, {
    thongDiep: 'BookNest API đang hoạt động ổn định',
    duLieu: { thoiGian: new Date().toISOString() }
  });
});

// Tuyến đường kiểm tra sức khỏe hệ thống (API Health Check theo đặc tả T04)
app.get('/api/suc-khoe', (req, res) => {
  return phanHoiThanhCong(res, {
    thongDiep: 'Hệ thống BookNest Backend hoạt động bình thường',
    duLieu: { phienBan: '1.0.0', thoiGian: new Date().toISOString() }
  });
});

// Gắn các tuyến đường API
// Lưới an toàn chung cho mọi API (từng API công khai nhạy cảm còn có bộ giới hạn riêng, xem gioiHanTanSuat.js)
app.use('/api', gioiHanChung);

app.use('/api/auth', xacThucKhachRoutes);
app.use('/api/admin/auth', xacThucNhanVienRoutes);
app.use('/api/users', nguoiDungRoutes);
app.use('/api/categories', danhMucRoutes);
app.use('/api/books', sachRoutes);
app.use('/api/admin/discounts', giamGiaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', gioHangRoutes);
app.use('/api/orders', donHangRoutes);
app.use('/api/payments', thanhToanRoutes);
app.use('/api/payos', thanhToanRoutes);
app.use('/api/chat', aiChatbotRoutes);
app.use('/api/ai', aiChatbotRoutes);

// Tuyến đường tài liệu Swagger UI (T19): tắt khi chạy production để không công khai danh sách API (xem cauHinh.batApiDocs)
if (cauHinh.batApiDocs) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Middleware bắt route không tồn tại (404)
app.use(xuLy404);

// Middleware bắt và xử lý lỗi tập trung (Error Handler)
app.use(xuLyLoi);

module.exports = app;
