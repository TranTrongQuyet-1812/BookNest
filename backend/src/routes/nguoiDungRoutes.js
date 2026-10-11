/**
 * Tuyến đường (Routes) cho các API quản lý người dùng và hồ sơ cá nhân (/api/users).
 */
const express = require('express');
const Joi = require('joi');
const nguoiDungController = require('../controllers/nguoiDungController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// Schema kiểm tra cập nhật hồ sơ
const luatCapNhatHoSo = Joi.object({
  hoTen: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ và tên không được vượt quá 100 ký tự'
  }),
  soDienThoai: Joi.string().trim().pattern(/^[0-9]{10,11}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại phải gồm 10 hoặc 11 chữ số'
  }),
  diaChiMacDinh: Joi.string().trim().max(255).allow(null, '').messages({
    'string.max': 'Địa chỉ không được vượt quá 255 ký tự'
  })
});

// Schema kiểm tra đổi mật khẩu
const luatDoiMatKhau = Joi.object({
  matKhauCu: Joi.string().required().messages({
    'string.empty': 'Vui lòng nhập mật khẩu hiện tại',
    'any.required': 'Mật khẩu hiện tại là bắt buộc'
  }),
  matKhauMoi: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required().messages({
    'string.empty': 'Vui lòng nhập mật khẩu mới',
    'string.min': 'Mật khẩu mới phải có tối thiểu 8 ký tự',
    'string.pattern.base': 'Mật khẩu mới phải chứa ít nhất một chữ cái và một chữ số',
    'any.required': 'Mật khẩu mới là bắt buộc'
  })
});

// Tất cả các tuyến đường này đều bắt buộc đăng nhập (xacThucToken)
router.use(xacThucToken);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Xem thông tin hồ sơ cá nhân của người dùng hiện tại
 *     tags: [Người dùng (Users)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin hồ sơ cá nhân
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.get('/profile', batLoiAsync(nguoiDungController.xuLyLayHoSo));

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Cập nhật thông tin hồ sơ cá nhân
 *     tags: [Người dùng (Users)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hoTen:
 *                 type: string
 *                 example: Nguyễn Văn B
 *               soDienThoai:
 *                 type: string
 *                 example: "0987654321"
 *               diaChiMacDinh:
 *                 type: string
 *                 example: 456 Nguyễn Huệ, Q.1, TP.HCM
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.put('/profile', kiemTraDuLieu(luatCapNhatHoSo), batLoiAsync(nguoiDungController.xuLyCapNhatHoSo));

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: Đổi mật khẩu tài khoản
 *     tags: [Người dùng (Users)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [matKhauCu, matKhauMoi]
 *             properties:
 *               matKhauCu:
 *                 type: string
 *                 example: MatKhau123
 *               matKhauMoi:
 *                 type: string
 *                 example: MatKhau456
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ hoặc mật khẩu cũ không đúng
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ
 */
router.put('/change-password', kiemTraDuLieu(luatDoiMatKhau), batLoiAsync(nguoiDungController.xuLyDoiMatKhau));

module.exports = router;
