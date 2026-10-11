/**
 * Tuyến đường (Routes) cho các API liên quan đến xác thực người dùng.
 * Bao gồm: Đăng ký (/api/auth/register) và Đăng nhập (/api/auth/login).
 */
const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const xacThucController = require('../controllers/xacThucController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// Giới hạn tần suất gọi API đăng nhập để chống brute-force (10 lần / 15 phút trên mỗi IP)
// Trong môi trường kiểm thử (test), nâng giới hạn để không gây nghẽn test tự động
const gioiHanDangNhap = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 10,
  skipSuccessfulRequests: true, // Không tính các lần đăng nhập thành công vào giới hạn
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thử đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau 15 phút.'
  }
});

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
  soDienThoai: Joi.string().trim().pattern(/^[0-9]{10,11}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại phải gồm 10 hoặc 11 chữ số'
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
router.post('/register', kiemTraDuLieu(luatDangKy), batLoiAsync(xacThucController.xuLyDangKy));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập tài khoản lấy JWT
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
router.post('/login', gioiHanDangNhap, kiemTraDuLieu(luatDangNhap), batLoiAsync(xacThucController.xuLyDangNhap));

module.exports = router;
