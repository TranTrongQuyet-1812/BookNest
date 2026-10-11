/**
 * Tuyến đường (Routes) cho các API liên quan đến xác thực người dùng.
 * Bao gồm: Đăng ký (/api/auth/register) và Đăng nhập (/api/auth/login).
 */
const express = require('express');
const Joi = require('joi');
const xacThucController = require('../controllers/xacThucController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

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

// Tuyến đường công khai
router.post('/register', kiemTraDuLieu(luatDangKy), batLoiAsync(xacThucController.xuLyDangKy));
router.post('/login', kiemTraDuLieu(luatDangNhap), batLoiAsync(xacThucController.xuLyDangNhap));

module.exports = router;
