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
  trangThaiMoi: Joi.string().valid('CONFIRMED', 'SHIPPING', 'DELIVERED').messages({
    'any.only': 'Trạng thái mới không hợp lệ'
  }),
  trangThai: Joi.string().valid('CONFIRMED', 'SHIPPING', 'DELIVERED').messages({
    'any.only': 'Trạng thái mới không hợp lệ'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, '')
}).or('trangThaiMoi', 'trangThai').messages({
  'object.missing': 'Trạng thái mới là bắt buộc'
});

const luatAdminHuyDon = Joi.object({
  lyDo: Joi.string().trim().min(3).max(500).required().messages({
    'string.empty': 'Lý do hủy đơn không được để trống',
    'string.min': 'Lý do hủy đơn phải có ít nhất 3 ký tự',
    'any.required': 'Lý do hủy đơn là bắt buộc'
  })
});

// GET /api/admin/orders - Danh sách đơn hàng toàn hệ thống
router.get(
  '/orders',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  kiemTraDuLieu(luatTruyVanAdminDonHang, 'query'),
  batLoiAsync(donHangController.xuLyAdminLayDanhSachDon)
);

// GET /api/admin/orders/:id - Chi tiết đơn hàng
router.get(
  '/orders/:id',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  batLoiAsync(donHangController.xuLyAdminLayChiTietDon)
);

// PUT /api/admin/orders/:id/status - Chuyển trạng thái đơn hàng (tuân thủ State Machine)
router.put(
  '/orders/:id/status',
  xacThucToken,
  phanQuyen('admin', 'order_staff'),
  kiemTraDuLieu(luatCapNhatTrangThai),
  batLoiAsync(donHangController.xuLyAdminCapNhatTrangThai)
);

// PUT /api/admin/orders/:id/cancel - Hủy đơn hàng và hoàn kho
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

// GET /api/admin/users - Xem danh sách mọi tài khoản
router.get(
  '/users',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTruyVanAdminNguoiDung, 'query'),
  batLoiAsync(nguoiDungController.xuLyAdminLayDanhSach)
);

// POST /api/admin/users - Tạo tài khoản nhân sự
router.post(
  '/users',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTaoNhanVien),
  batLoiAsync(nguoiDungController.xuLyAdminTaoNhanVien)
);

// PUT /api/admin/users/:id/status - Khóa / mở khóa tài khoản
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

// GET /api/admin/stats/overview - Tổng quan doanh thu
router.get(
  '/stats/overview',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTruyVanDoanhThu, 'query'),
  batLoiAsync(thongKeController.xuLyLayTongQuan)
);

// GET /api/admin/stats/top-books - Top sách bán chạy
router.get(
  '/stats/top-books',
  xacThucToken,
  phanQuyen('admin'),
  kiemTraDuLieu(luatTruyVanTopSach, 'query'),
  batLoiAsync(thongKeController.xuLyLayTopSach)
);

// GET /api/admin/stats/order-rates - Tỷ lệ các trạng thái đơn hàng
router.get(
  '/stats/order-rates',
  xacThucToken,
  phanQuyen('admin'),
  batLoiAsync(thongKeController.xuLyLayTyLeDon)
);

module.exports = router;
