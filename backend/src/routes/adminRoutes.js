/**
 * Tuyến đường quản lý chuyên biệt dành cho Back-Office (/api/admin).
 */
const express = require('express');
const Joi = require('joi');
const sachController = require('../controllers/sachController');
const donHangController = require('../controllers/donHangController');
const nguoiDungController = require('../controllers/nguoiDungController');
const thongKeController = require('../controllers/thongKeController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// ==========================================
// 1. Quản lý sách phía Back-Office (T10)
// ==========================================
const luatTruyVanAdminSach = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().allow(''),
  categoryId: Joi.number().integer().positive(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  sort: Joi.string().valid('price_asc', 'price_desc', 'newest').default('newest')
});

/**
 * @swagger
 * /api/admin/books:
 *   get:
 *     summary: Xem toàn bộ sách phía Back-Office kể cả sách đã bị ẩn (Admin/Librarian)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách toàn bộ sách trong hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/books',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  kiemTraDuLieu(luatTruyVanAdminSach, 'query'),
  batLoiAsync(sachController.xuLyLayDanhSachAdmin)
);

// ==========================================
// 2. Quản lý đơn hàng phía Back-Office (T15)
// ==========================================
const luatTruyVanAdminDonHang = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'),
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso()
});

const luatCapNhatTrangThai = Joi.object({
  trangThaiMoi: Joi.string().valid('CONFIRMED', 'SHIPPING', 'DELIVERED').required().messages({
    'any.only': 'Trạng thái mới không hợp lệ',
    'any.required': 'Trạng thái mới là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, '')
});

const luatAdminHuyDon = Joi.object({
  lyDo: Joi.string().trim().min(3).max(500).required().messages({
    'string.empty': 'Lý do hủy đơn không được để trống',
    'string.min': 'Lý do hủy đơn phải có ít nhất 3 ký tự',
    'any.required': 'Lý do hủy đơn là bắt buộc'
  })
});

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Xem danh sách toàn bộ đơn hàng của hệ thống (Admin/Order Staff)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED]
 *       - in: query
 *         name: tuNgay
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: denNgay
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng toàn hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/orders',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  kiemTraDuLieu(luatTruyVanAdminDonHang, 'query'),
  batLoiAsync(donHangController.xuLyAdminLayDanhSachDon)
);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Xem chi tiết bất kỳ đơn hàng nào trong hệ thống (Admin/Order Staff)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng và lịch sử luân chuyển
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.get(
  '/orders/:id',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  batLoiAsync(donHangController.xuLyAdminLayChiTietDon)
);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Chuyển trạng thái đơn hàng theo State Machine (PENDING -> CONFIRMED -> SHIPPING -> DELIVERED)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trangThaiMoi]
 *             properties:
 *               trangThaiMoi:
 *                 type: string
 *                 enum: [CONFIRMED, SHIPPING, DELIVERED]
 *                 example: CONFIRMED
 *               ghiChu:
 *                 type: string
 *                 example: Đã xác nhận đơn hàng với khách
 *     responses:
 *       200:
 *         description: Chuyển trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Trạng thái không hợp lệ
 *       409:
 *         description: Chuyển trạng thái trái quy trình State Machine hoặc xung đột khóa lạc quan
 */
router.put(
  '/orders/:id/status',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  kiemTraDuLieu(luatCapNhatTrangThai),
  batLoiAsync(donHangController.xuLyAdminCapNhatTrangThai)
);

/**
 * @swagger
 * /api/admin/orders/{id}/cancel:
 *   put:
 *     summary: Hủy đơn hàng và tự động hoàn lại tồn kho (Admin/Order Staff - khi đơn PENDING hoặc CONFIRMED)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lyDo]
 *             properties:
 *               lyDo:
 *                 type: string
 *                 example: Không thể liên hệ được với người nhận sau 3 lần gọi
 *     responses:
 *       200:
 *         description: Hủy đơn và hoàn kho thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Lý do hủy không hợp lệ
 *       409:
 *         description: Đơn hàng không ở trạng thái PENDING hoặc CONFIRMED
 */
router.put(
  '/orders/:id/cancel',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  kiemTraDuLieu(luatAdminHuyDon),
  batLoiAsync(donHangController.xuLyAdminHuyDon)
);

// ==========================================
// 3. Quản lý nhân sự & tài khoản (T17)
// ==========================================
const luatTruyVanAdminNguoiDung = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  role: Joi.string().valid('admin', 'librarian', 'order_staff', 'customer'),
  search: Joi.string().trim().allow('')
});

const luatTaoNhanVien = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc'
  }),
  matKhau: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
    'string.pattern.base': 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số',
    'any.required': 'Mật khẩu là bắt buộc'
  }),
  hoTen: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Họ tên không được để trống',
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ tên không được vượt quá 100 ký tự',
    'any.required': 'Họ tên là bắt buộc'
  }),
  vaiTro: Joi.string().valid('librarian', 'order_staff').required().messages({
    'any.only': 'Chỉ được phép tạo tài khoản với vai trò librarian hoặc order_staff',
    'any.required': 'Vai trò là bắt buộc'
  }),
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng'
  }),
  diaChiMacDinh: Joi.string().trim().max(255).allow(null, '')
});

const luatCapNhatTrangThaiKhoa = Joi.object({
  dangHoatDong: Joi.boolean().required().messages({
    'any.required': 'Trạng thái hoạt động là bắt buộc'
  })
});

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Xem danh sách mọi tài khoản trong hệ thống có phân trang và lọc vai trò (Admin)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, librarian, order_staff, customer]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Admin
 */
router.get(
  '/users',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTruyVanAdminNguoiDung, 'query'),
  batLoiAsync(nguoiDungController.xuLyAdminLayDanhSach)
);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Tạo tài khoản nhân sự mới và chỉ định vai trò (librarian hoặc order_staff) (Admin)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, matKhau, hoTen, vaiTro]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: thuthu_moi@booknest.vn
 *               matKhau:
 *                 type: string
 *                 example: MatKhau123
 *               hoTen:
 *                 type: string
 *                 example: Lê Thủ Thư
 *               vaiTro:
 *                 type: string
 *                 enum: [librarian, order_staff]
 *                 example: librarian
 *               soDienThoai:
 *                 type: string
 *                 example: "0902222333"
 *               diaChiMacDinh:
 *                 type: string
 *                 example: Văn phòng BookNest
 *     responses:
 *       201:
 *         description: Tạo nhân sự thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Admin
 *       409:
 *         description: Email đã tồn tại
 */
router.post(
  '/users',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTaoNhanVien),
  batLoiAsync(nguoiDungController.xuLyAdminTaoNhanVien)
);

/**
 * @swagger
 * /api/admin/users/{id}/status:
 *   put:
 *     summary: Khóa hoặc kích hoạt lại tài khoản người dùng (chống tự khóa tài khoản Admin chính mình)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dangHoatDong]
 *             properties:
 *               dangHoatDong:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái tài khoản thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Không thể tự khóa tài khoản của chính mình
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Admin
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.put(
  '/users/:id/status',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatCapNhatTrangThaiKhoa),
  batLoiAsync(nguoiDungController.xuLyAdminCapNhatTrangThaiKhoa)
);

// ==========================================
// 4. Thống kê báo cáo doanh thu (T18)
// ==========================================
const luatTruyVanDoanhThu = Joi.object({
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso()
});

const luatTruyVanTopSach = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10)
});

/**
 * @swagger
 * /api/admin/stats/overview:
 *   get:
 *     summary: Thống kê tổng quan tình hình kinh doanh (Tổng doanh thu, số đơn DELIVERED, số sách đã bán) (Admin)
 *     tags: [Thống kê báo cáo (Admin Stats)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: denNgay
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Số liệu báo cáo tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Admin
 */
router.get(
  '/stats/overview',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTruyVanDoanhThu, 'query'),
  batLoiAsync(thongKeController.xuLyLayTongQuan)
);

/**
 * @swagger
 * /api/admin/stats/top-books:
 *   get:
 *     summary: Xem danh sách những cuốn sách bán chạy nhất hệ thống (Admin)
 *     tags: [Thống kê báo cáo (Admin Stats)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng sách trong top
 *     responses:
 *       200:
 *         description: Danh sách sách bán chạy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Admin
 */
router.get(
  '/stats/top-books',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTruyVanTopSach, 'query'),
  batLoiAsync(thongKeController.xuLyLayTopSach)
);

/**
 * @swagger
 * /api/admin/stats/order-rates:
 *   get:
 *     summary: Thống kê tỷ lệ các trạng thái đơn hàng (tỷ lệ hoàn thành, hủy đơn) (Admin)
 *     tags: [Thống kê báo cáo (Admin Stats)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bảng tỷ lệ phần trăm theo từng trạng thái
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Admin
 */
router.get(
  '/stats/order-rates',
  xacThucToken,
  phanQuyen('admin'),
  batLoiAsync(thongKeController.xuLyLayTyLeDon)
);

module.exports = router;
