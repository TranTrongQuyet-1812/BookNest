/**
 * Tuyến đường (Routes) cho các API liên quan đến xác thực.
 * Cổng khách hàng (routerKhach, gắn tại /api/auth): đăng ký và đăng nhập, chỉ tra bảng KhachHang.
 * Cổng nhân viên (routerNhanVien, gắn tại /api/admin/auth): đăng nhập, chỉ tra bảng NhanVien.
 */
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const xacThucController = require('../controllers/xacThucController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const { gioiHanDangKy } = require('../middlewares/gioiHanTanSuat');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const routerKhach = express.Router();
const routerNhanVien = express.Router();

// Tách bộ đếm theo cổng để một khu không làm khóa đăng nhập của khu còn lại.
function taoGioiHanDangNhap(soLanToiDa) {
  return rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : soLanToiDa,
  skipSuccessfulRequests: true, // Không tính các lần đăng nhập thành công vào giới hạn
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thử đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau 15 phút.'
  }
  });
}

const gioiHanDangNhapKhach = taoGioiHanDangNhap(10);
const gioiHanDangNhapNhanVien = taoGioiHanDangNhap(5);

// Schema kiểm tra dữ liệu đăng ký
const luatDangKy = Joi.object({
  hoTen: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Họ và tên không được để trống',
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ và tên không được vượt quá 100 ký tự',
    'any.required': 'Họ và tên là bắt buộc'
  }),
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc'
  }),
  matKhau: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'string.min': 'Mật khẩu phải có độ dài tối thiểu 8 ký tự',
    'string.pattern.base': 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
    'any.required': 'Mật khẩu là bắt buộc'
  }),
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[35789][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng số di động Việt Nam'
  }),
  diaChiMacDinh: Joi.string().trim().max(255).allow(null, '').messages({
    'string.max': 'Địa chỉ không được vượt quá 255 ký tự'
  })
});

// Schema kiểm tra dữ liệu đăng nhập
const luatDangNhap = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc'
  }),
  matKhau: Joi.string().required().messages({
    'string.empty': 'Mật khẩu không được để trống',
    'any.required': 'Mật khẩu là bắt buộc'
  })
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản khách hàng mới
 *     tags: [Xác thực (Auth)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [hoTen, email, matKhau]
 *             properties:
 *               hoTen:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@example.com
 *               matKhau:
 *                 type: string
 *                 example: MatKhau123
 *               soDienThoai:
 *                 type: string
 *                 example: "0901234567"
 *               diaChiMacDinh:
 *                 type: string
 *                 example: 123 Đường Sách, Q.1, TP.HCM
 *     responses:
 *       201:
 *         description: Đăng ký thành công, trả về token JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       409:
 *         description: Email đã được sử dụng
 */
routerKhach.post('/register', gioiHanDangKy, kiemTraDuLieu(luatDangKy), batLoiAsync(xacThucController.xuLyDangKy));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập tài khoản khách hàng lấy JWT (cổng Storefront, chỉ tra bảng KhachHang)
 *     tags: [Xác thực (Auth)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, matKhau]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: nguyenvana@example.com
 *               matKhau:
 *                 type: string
 *                 example: MatKhau123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về token JWT và thông tin tài khoản
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Email hoặc mật khẩu không chính xác
 *       403:
 *         description: Tài khoản đã bị khóa
 */
routerKhach.post('/login', gioiHanDangNhapKhach, kiemTraDuLieu(luatDangNhap), batLoiAsync(xacThucController.xuLyDangNhapKhachHang));

// Rate limit riêng cho luồng Quên Mật Khẩu (tối đa 5 yêu cầu / 15 phút / IP)
const gioiHanQuenMatKhau = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã yêu cầu gửi mã xác nhận quá nhiều lần. Vui lòng thử lại sau 15 phút.'
  }
});

// Schema kiểm tra dữ liệu yêu cầu quên mật khẩu
const luatQuenMatKhau = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc'
  })
});

// Schema kiểm tra mã xác nhận OTP
const luatXacMinhOtp = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc'
  }),
  maOtp: Joi.string().trim().length(6).required().messages({
    'string.empty': 'Mã xác nhận không được để trống',
    'string.length': 'Mã xác nhận phải gồm đúng 6 chữ số',
    'any.required': 'Mã xác nhận là bắt buộc'
  })
});

// Schema kiểm tra đặt lại mật khẩu mới
const luatDatLaiMatKhau = Joi.object({
  email: Joi.string().trim().email().required().messages({
    'string.empty': 'Email không được để trống',
    'string.email': 'Email không đúng định dạng',
    'any.required': 'Email là bắt buộc'
  }),
  maOtp: Joi.string().trim().length(6).required().messages({
    'string.empty': 'Mã xác nhận không được để trống',
    'string.length': 'Mã xác nhận phải gồm đúng 6 chữ số',
    'any.required': 'Mã xác nhận là bắt buộc'
  }),
  matKhauMoi: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required().messages({
    'string.empty': 'Mật khẩu mới không được để trống',
    'string.min': 'Mật khẩu mới phải có độ dài tối thiểu 8 ký tự',
    'string.pattern.base': 'Mật khẩu mới phải chứa ít nhất một chữ cái và một chữ số',
    'any.required': 'Mật khẩu mới là bắt buộc'
  })
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Yêu cầu gửi mã OTP đặt lại mật khẩu về email
 *     tags: [Xác thực (Auth)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Đã gửi mã xác nhận (hoặc thông báo an toàn)
 */
routerKhach.post('/forgot-password', gioiHanQuenMatKhau, kiemTraDuLieu(luatQuenMatKhau), batLoiAsync(xacThucController.xuLyQuenMatKhau));

/**
 * @swagger
 * /api/auth/verify-reset-code:
 *   post:
 *     summary: Kiểm tra tính hợp lệ của mã OTP
 *     tags: [Xác thực (Auth)]
 */
routerKhach.post('/verify-reset-code', kiemTraDuLieu(luatXacMinhOtp), batLoiAsync(xacThucController.xuLyXacMinhOtp));

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu mới bằng mã OTP
 *     tags: [Xác thực (Auth)]
 */
routerKhach.post('/reset-password', kiemTraDuLieu(luatDatLaiMatKhau), batLoiAsync(xacThucController.xuLyDatLaiMatKhau));

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Đăng nhập tài khoản nhân viên lấy JWT (cổng Back-Office, chỉ tra bảng NhanVien)
 *     tags: [Xác thực (Auth)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, matKhau]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: thuthu@booknest.vn
 *               matKhau:
 *                 type: string
 *                 example: MatKhau123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về token JWT (aud nhan_vien) và thông tin nhân viên
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Email hoặc mật khẩu không chính xác
 *       403:
 *         description: Tài khoản đã bị khóa
 */
routerNhanVien.post('/login', gioiHanDangNhapNhanVien, kiemTraDuLieu(luatDangNhap), batLoiAsync(xacThucController.xuLyDangNhapNhanVien));

module.exports = { routerKhach, routerNhanVien };
