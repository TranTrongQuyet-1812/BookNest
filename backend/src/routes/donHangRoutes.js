/**
 * Tuyến đường (Routes) quản lý đơn hàng phía khách hàng (/api/orders).
 */
const express = require('express');
const Joi = require('joi');
const donHangController = require('../controllers/donHangController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');
const kiemTraChuDon = require('../middlewares/kiemTraChuDon');

const router = express.Router();

// Tất cả các route đơn hàng của khách đều cần đăng nhập với vai trò customer
router.use(xacThucToken, phanQuyen('customer'));

// Schema kiểm tra thông tin đặt hàng
const luatDatHang = Joi.object({
  tenNguoiNhan: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên người nhận không được để trống',
    'string.min': 'Tên người nhận phải có ít nhất 2 ký tự',
    'string.max': 'Tên người nhận không được vượt quá 100 ký tự',
    'any.required': 'Tên người nhận là bắt buộc'
  }),
  soDienThoaiNhan: Joi.string().trim().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).required().messages({
    'string.pattern.base': 'Số điện thoại nhận không đúng định dạng số di động Việt Nam',
    'any.required': 'Số điện thoại nhận là bắt buộc'
  }),
  diaChiGiaoHang: Joi.string().trim().min(5).max(255).required().messages({
    'string.empty': 'Địa chỉ giao hàng không được để trống',
    'string.min': 'Địa chỉ giao hàng phải có ít nhất 5 ký tự',
    'string.max': 'Địa chỉ giao hàng không được vượt quá 255 ký tự',
    'any.required': 'Địa chỉ giao hàng là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, '')
});

// Schema truy vấn danh sách đơn hàng
const luatTruyVanDonKhach = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED')
});

// Schema hủy đơn của khách
const luatKhachHuyDon = Joi.object({
  lyDo: Joi.string().trim().max(500).allow(null, '')
});

// 1. POST /api/orders: Đặt hàng từ giỏ hàng
router.post('/', kiemTraDuLieu(luatDatHang), batLoiAsync(donHangController.xuLyDatHang));

// 2. GET /api/orders/my-orders: Xem danh sách đơn của mình
router.get('/my-orders', kiemTraDuLieu(luatTruyVanDonKhach, 'query'), batLoiAsync(donHangController.xuLyLayDanhSachDonCuaKhach));

// 3. GET /api/orders/my-orders/:id: Xem chi tiết đơn của mình (chống IDOR)
router.get('/my-orders/:id', kiemTraChuDon, batLoiAsync(donHangController.xuLyLayChiTietDonCuaKhach));

// 4. PUT /api/orders/:id/cancel: Khách tự hủy đơn PENDING (chống IDOR)
router.put('/:id/cancel', kiemTraChuDon, kiemTraDuLieu(luatKhachHuyDon), batLoiAsync(donHangController.xuLyKhachHuyDon));

module.exports = router;
