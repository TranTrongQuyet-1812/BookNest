/**
 * Tuyến đường (Routes) quản lý sách và kho (/api/books).
 */
const express = require('express');
const Joi = require('joi');
const sachController = require('../controllers/sachController');
const danhGiaController = require('../controllers/danhGiaController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const { xacThucTuyChon } = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// Schema lọc danh sách sách
const luatTruyVanSach = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().allow(''),
  categoryId: Joi.number().integer().positive(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  sort: Joi.string().valid('price_asc', 'price_desc', 'newest').default('newest')
}).custom((value, helpers) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
    return helpers.message('Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)');
  }
  return value;
});

// Schema thêm sách mới
const luatTaoSach = Joi.object({
  tenSach: Joi.string().trim().min(2).max(255).required().messages({
    'string.empty': 'Tên sách không được để trống',
    'string.min': 'Tên sách phải có ít nhất 2 ký tự',
    'string.max': 'Tên sách không được vượt quá 255 ký tự',
    'any.required': 'Tên sách là bắt buộc'
  }),
  tacGia: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Tác giả không được để trống',
    'string.min': 'Tác giả phải có ít nhất 2 ký tự',
    'string.max': 'Tác giả không được vượt quá 150 ký tự',
    'any.required': 'Tác giả là bắt buộc'
  }),
  moTa: Joi.string().allow(null, ''),
  giaBan: Joi.number().min(0).required().messages({
    'number.min': 'Giá bán không được âm',
    'any.required': 'Giá bán là bắt buộc'
  }),
  soLuongTon: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Số lượng tồn không được âm'
  }),
  nguongCanhBao: Joi.number().integer().min(0).default(5).messages({
    'number.min': 'Ngưỡng cảnh báo không được âm'
  }),
  anhBia: Joi.string().trim().max(500).allow(null, ''),
  maDanhMuc: Joi.number().integer().positive().required().messages({
    'any.required': 'Mã danh mục là bắt buộc'
  })
});

// Schema cập nhật sách
const luatCapNhatSach = Joi.object({
  tenSach: Joi.string().trim().min(2).max(255),
  tacGia: Joi.string().trim().min(2).max(150),
  moTa: Joi.string().allow(null, ''),
  giaBan: Joi.number().min(0),
  nguongCanhBao: Joi.number().integer().min(0),
  anhBia: Joi.string().trim().max(500).allow(null, ''),
  maDanhMuc: Joi.number().integer().positive(),
  daAn: Joi.boolean()
});

// Schema nhập kho
const luatNhapKho = Joi.object({
  soLuongNhap: Joi.number().integer().positive().max(100000).required().messages({
    'number.positive': 'Số lượng nhập phải là số nguyên dương',
    'any.required': 'Số lượng nhập là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, '')
});

// 1. Tuyến đường công khai
router.get('/', kiemTraDuLieu(luatTruyVanSach, 'query'), batLoiAsync(sachController.xuLyLayDanhSach));

// 2. Chú ý thứ tự: low-stock phải đứng trước :id
router.get(
  '/low-stock',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  batLoiAsync(sachController.xuLySapHetHang)
);

router.get('/:id', xacThucTuyChon, batLoiAsync(sachController.xuLyLayChiTiet));

// 3. Tuyến đường quản lý dành cho Admin & Librarian
router.post(
  '/',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  kiemTraDuLieu(luatTaoSach),
  batLoiAsync(sachController.xuLyTao)
);

router.put(
  '/:id',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  kiemTraDuLieu(luatCapNhatSach),
  batLoiAsync(sachController.xuLyCapNhat)
);

router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  batLoiAsync(sachController.xuLyXoa)
);

// 4. Tuyến đường nhập kho (T11)
router.post(
  '/:id/stock-in',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  kiemTraDuLieu(luatNhapKho),
  batLoiAsync(sachController.xuLyNhapKho)
);

router.get(
  '/:id/stock-in-history',
  xacThucToken,
  phanQuyen('admin', 'librarian'),
  batLoiAsync(sachController.xuLyLichSuNhapKho)
);

// 5. Tuyến đường đánh giá sách (T16)
const luatDanhGia = Joi.object({
  soSao: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Số sao đánh giá phải từ 1 đến 5 sao',
    'number.max': 'Số sao đánh giá phải từ 1 đến 5 sao',
    'any.required': 'Số sao là bắt buộc'
  }),
  noiDung: Joi.string().trim().max(1000).allow(null, '').messages({
    'string.max': 'Nội dung đánh giá không được vượt quá 1000 ký tự'
  })
});

// GET /api/books/:id/reviews - Xem đánh giá sách công khai
router.get('/:id/reviews', batLoiAsync(danhGiaController.xuLyLayDanhSachDanhGia));

// POST /api/books/:id/reviews - Khách hàng viết hoặc sửa đánh giá
router.post(
  '/:id/reviews',
  xacThucToken,
  phanQuyen('customer'),
  kiemTraDuLieu(luatDanhGia),
  batLoiAsync(danhGiaController.xuLyTaoHoacCapNhatDanhGia)
);

module.exports = router;
