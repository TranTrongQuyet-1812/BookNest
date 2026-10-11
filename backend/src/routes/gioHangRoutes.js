/**
 * Tuyến đường (Routes) quản lý giỏ hàng (/api/cart).
 * Chỉ khách hàng (customer) mới có quyền thao tác trên giỏ hàng cá nhân.
 */
const express = require('express');
const Joi = require('joi');
const gioHangController = require('../controllers/gioHangController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập với vai trò customer
router.use(xacThucToken, phanQuyen('customer'));

// Schema thêm sách vào giỏ
const luatThemVaoGio = Joi.object({
  maSach: Joi.number().integer().positive().required().messages({
    'number.base': 'Mã sách phải là số',
    'any.required': 'Mã sách là bắt buộc'
  }),
  soLuong: Joi.number().integer().positive().default(1).messages({
    'number.positive': 'Số lượng mua phải lớn hơn 0'
  })
});

// Schema cập nhật số lượng
const luatCapNhatSoLuong = Joi.object({
  soLuong: Joi.number().integer().positive().required().messages({
    'number.positive': 'Số lượng mua phải là số nguyên dương lớn hơn 0',
    'any.required': 'Số lượng là bắt buộc'
  })
});

// 1. GET /api/cart: Xem giỏ hàng cá nhân
router.get('/', batLoiAsync(gioHangController.xuLyLayGioHang));

// 2. POST /api/cart hoặc /api/cart/items: Thêm sách vào giỏ
router.post('/', kiemTraDuLieu(luatThemVaoGio), batLoiAsync(gioHangController.xuLyThemVaoGio));
router.post('/items', kiemTraDuLieu(luatThemVaoGio), batLoiAsync(gioHangController.xuLyThemVaoGio));

// 3. PUT /api/cart/items/:bookId hoặc /api/cart/:bookId: Cập nhật số lượng
router.put('/:bookId', kiemTraDuLieu(luatCapNhatSoLuong), batLoiAsync(gioHangController.xuLyCapNhatSoLuong));
router.put('/items/:bookId', kiemTraDuLieu(luatCapNhatSoLuong), batLoiAsync(gioHangController.xuLyCapNhatSoLuong));

// 4. DELETE /api/cart: Dọn sạch toàn bộ giỏ hàng
router.delete('/', batLoiAsync(gioHangController.xuLyXoaToanBoGioHang));

// 5. DELETE /api/cart/items/:bookId hoặc /api/cart/:bookId: Xóa khỏi giỏ
router.delete('/:bookId', batLoiAsync(gioHangController.xuLyXoaKhoiGio));
router.delete('/items/:bookId', batLoiAsync(gioHangController.xuLyXoaKhoiGio));

module.exports = router;
