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

router.get('/profile', batLoiAsync(nguoiDungController.xuLyLayHoSo));
router.put('/profile', kiemTraDuLieu(luatCapNhatHoSo), batLoiAsync(nguoiDungController.xuLyCapNhatHoSo));
router.put('/change-password', kiemTraDuLieu(luatDoiMatKhau), batLoiAsync(nguoiDungController.xuLyDoiMatKhau));

module.exports = router;
