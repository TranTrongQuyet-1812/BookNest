/**
 * Cấu hình OpenAPI 3.0 / Swagger UI cho toàn bộ hệ thống API BookNest (T19).
 * Cung cấp tài liệu API trực quan, cho phép kiểm thử trực tiếp kèm Bearer Token JWT.
 */
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'BookNest API Documentation',
    version: '1.0.0',
    description: 'Hệ thống Quản lý và Bán Sách Trực Tuyến BookNest - Kiến trúc SERN Core (SQL Server 2022 Express, Express.js, React, Node.js). Hệ thống phân tách 2 không gian Storefront & Back-Office với phân quyền RBAC 4 vai trò cốt lõi (Customer, Librarian, Order Staff, Admin) cùng khách vãng lai (Guest).'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Máy chủ phát triển cục bộ (Development Server)'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Dán mã JSON Web Token (JWT) nhận được từ API đăng nhập để xác thực quyền truy cập.'
      }
    },
    schemas: {
      PhanHoiThanhCong: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Thao tác thành công' },
          data: { type: 'object' }
        }
      },
      PhanHoiLoi: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Thông điệp lỗi mô tả chi tiết bằng tiếng Việt' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                truong: { type: 'string', example: 'email' },
                thongDiep: { type: 'string', example: 'Email không đúng định dạng' }
              }
            }
          }
        }
      },
      Sach: {
        type: 'object',
        properties: {
          MaSach: { type: 'integer', example: 1 },
          TenSach: { type: 'string', example: 'Số Đỏ' },
          TacGia: { type: 'string', example: 'Vũ Trọng Phụng' },
          MoTa: { type: 'string', example: 'Kiệt tác trào phúng văn học Việt Nam' },
          GiaBan: { type: 'number', example: 65000 },
          SoLuongTon: { type: 'integer', example: 45 },
          NguongCanhBao: { type: 'integer', example: 5 },
          AnhBia: { type: 'string', example: 'https://images.unsplash.com/...' },
          MaDanhMuc: { type: 'integer', example: 1 },
          DaAn: { type: 'boolean', example: false }
        }
      },
      DanhMuc: {
        type: 'object',
        properties: {
          MaDanhMuc: { type: 'integer', example: 1 },
          TenDanhMuc: { type: 'string', example: 'Văn Học' },
          MoTa: { type: 'string', example: 'Tiểu thuyết kinh điển trong và ngoài nước' },
          soLuongSach: { type: 'integer', example: 8 }
        }
      },
      DonHang: {
        type: 'object',
        properties: {
          MaDonHang: { type: 'integer', example: 101 },
          TenNguoiNhan: { type: 'string', example: 'Hoàng Khách Hàng' },
          SoDienThoaiNhan: { type: 'string', example: '0914444555' },
          DiaChiGiaoHang: { type: 'string', example: '123 Biên Hòa, Đồng Nai' },
          TongTien: { type: 'number', example: 250000 },
          TrangThai: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'],
            example: 'PENDING'
          }
        }
      }
    }
  },
  tags: [
    { name: 'Xác thực (Auth)', description: 'Đăng ký tài khoản khách hàng và đăng nhập nhận JWT' },
    { name: 'Người dùng (Users)', description: 'Xem, cập nhật hồ sơ cá nhân và đổi mật khẩu' },
    { name: 'Danh mục (Categories)', description: 'Quản lý danh mục thể loại sách' },
    { name: 'Sách & Kho (Books)', description: 'Tìm kiếm không dấu, lọc, phân trang, CRUD sách và nhập kho' },
    { name: 'Giỏ hàng (Cart)', description: 'Quản lý giỏ hàng mua sắm của khách hàng' },
    { name: 'Đơn hàng (Orders)', description: 'Đặt hàng (ACID, chống bán âm), xem đơn cá nhân và hủy đơn' },
    { name: 'Quản trị đơn hàng (Admin Orders)', description: 'Back-Office: Điều phối đơn hàng theo State Machine' },
    { name: 'Quản trị nhân sự (Admin Users)', description: 'Back-Office: Tạo nhân viên, khóa/mở khóa tài khoản' },
    { name: 'Thống kê báo cáo (Admin Stats)', description: 'Back-Office: Dashboard doanh thu, top sách bán chạy' },
    { name: 'Đánh giá sách (Reviews)', description: 'Khách đã nhận sách chấm sao và viết nhận xét' }
  ]
};

const swaggerOptions = {
  swaggerDefinition,
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

module.exports = swaggerSpec;
