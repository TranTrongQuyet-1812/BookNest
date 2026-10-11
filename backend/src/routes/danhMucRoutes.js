/**
 * Tuyến đường (Routes) quản lý danh mục thể loại sách (/api/categories).
 */
const express = require('express');
const Joi = require('joi');
const danhMucController = require('../controllers/danhMucController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// Schema kiểm tra tạo danh mục
const luatDanhMuc = Joi.object({
  tenDanhMuc: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.min': 'Tên danh mục phải có ít nhất 2 ký tự',
    'string.max': 'Tên danh mục không được vượt quá 100 ký tự',
    'any.required': 'Tên danh mục là bắt buộc'
  }),
  moTa: Joi.string().trim().max(500).allow(null, '').messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự'
  })
});

// Tuyến đường công khai (Khách và người dùng đều xem được)
router.get('/', batLoiAsync(danhMucController.xuLyLayDanhSach));
router.get('/:id', batLoiAsync(danhMucController.xuLyLayChiTiet));

// Tuyến đường yêu cầu quyền quản trị viên hoặc thủ thư
router.post(
  '/',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  kiemTraDuLieu(luatDanhMuc),
  batLoiAsync(danhMucController.xuLyTao)
);

router.put(
  '/:id',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  kiemTraDuLieu(luatDanhMuc),
  batLoiAsync(danhMucController.xuLyCapNhat)
);

router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  batLoiAsync(danhMucController.xuLyXoa)
);

module.exports = router;
