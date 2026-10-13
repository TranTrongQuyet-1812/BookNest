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
const lichSuQuanTriController = require('../controllers/lichSuQuanTriController');

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

/**
 * @swagger
 * /api/admin/books:
 *   get:
 *     summary: Xem toàn bộ sách phía Back-Office kể cả sách đã bị ẩn (Quản trị viên, Thủ kho, Thủ thư)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách toàn bộ sách trong hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/books',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho', 'thu_thu'),
  kiemTraDuLieu(luatTruyVanAdminSach, 'query'),
  batLoiAsync(sachController.xuLyLayDanhSachAdmin)
);

// ==========================================
// 2. Quản lý đơn hàng phía Back-Office (T15)
// ==========================================
const luatTruyVanAdminDonHang = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('CHO_DUYET', 'DA_XAC_NHAN', 'DANG_GIAO', 'DA_GIAO', 'DA_HUY'),
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso(),
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY')
});

const luatTaoDonQuay = Joi.object({
  cacMon: Joi.array().min(1).max(30).items(Joi.object({
    maSach: Joi.number().integer().positive().required(),
    soLuong: Joi.number().integer().min(1).required()
  })).required(),
  maKhachHang: Joi.number().integer().positive().allow(null),
  tenKhach: Joi.string().trim().max(100).allow('', null),
  soDienThoaiKhach: Joi.string().trim().max(15).allow('', null)
});

const luatTruyVanLichSu = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(30),
  loaiDoiTuong: Joi.string().valid('SACH', 'DANH_MUC'),
  truongDuLieu: Joi.string().max(50),
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso()
});

const luatDonDepLichSu = Joi.object({
  truocNgay: Joi.date().iso().required()
});

const luatCapNhatTrangThai = Joi.object({
  trangThaiMoi: Joi.string().valid('DA_XAC_NHAN', 'DANG_GIAO', 'DA_GIAO').required().messages({
    'any.only': 'Trạng thái mới không hợp lệ',
    'any.required': 'Trạng thái mới là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, '')
});

const luatAdminHuyDon = Joi.object({
  lyDo: Joi.string().trim().min(3).max(500).required().messages({
    'string.empty': 'Lý do hủy đơn không được để trống',
    'string.min': 'Lý do hủy đơn phải có ít nhất 3 ký tự',
    'any.required': 'Lý do hủy đơn là bắt buộc'
  })
});

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Xem danh sách toàn bộ đơn hàng của hệ thống (Quản trị viên, Thủ thư)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CHO_DUYET, DA_XAC_NHAN, DANG_GIAO, DA_GIAO, DA_HUY]
 *       - in: query
 *         name: tuNgay
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: denNgay
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng toàn hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/orders',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatTruyVanAdminDonHang, 'query'),
  batLoiAsync(donHangController.xuLyAdminLayDanhSachDon)
);

/** @swagger
 * /api/admin/counter-orders:
 *   post:
 *     summary: Hoàn tất bán hàng tại quầy (Quản trị viên, Thủ thư)
 *     tags: [Bán tại quầy]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Đơn quầy đã tạo, trừ kho và lưu lịch sử trong một transaction }
 *       409: { description: Không đủ tồn kho }
 */
router.post(
  '/counter-orders',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatTaoDonQuay),
  batLoiAsync(donHangController.xuLyTaoDonQuay)
);

/**
 * @swagger
 * /api/admin/counter-orders:
 *   get:
 *     summary: Xem danh sách đơn bán tại quầy (Quản trị viên, Thủ thư)
 *     tags: [Bán tại quầy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng tại quầy
 */
router.get(
  '/counter-orders',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatTruyVanAdminDonHang, 'query'),
  batLoiAsync(donHangController.xuLyLayDanhSachDonQuay)
);

/**
 * @swagger
 * /api/admin/counter-orders/{id}:
 *   get:
 *     summary: Xem chi tiết đơn hàng bán tại quầy (Quản trị viên, Thủ thư)
 *     tags: [Bán tại quầy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng tại quầy
 */
router.get(
  '/counter-orders/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(donHangController.xuLyLayChiTietDonQuay)
);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Xem chi tiết bất kỳ đơn hàng nào trong hệ thống (Quản trị viên, Thủ thư)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng và lịch sử luân chuyển
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.get(
  '/orders/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(donHangController.xuLyAdminLayChiTietDon)
);

/**
 * @swagger
 * /api/admin/orders/{id}/status:
 *   put:
 *     summary: Chuyển trạng thái đơn hàng theo State Machine (CHO_DUYET -> DA_XAC_NHAN -> DANG_GIAO -> DA_GIAO)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [trangThaiMoi]
 *             properties:
 *               trangThaiMoi:
 *                 type: string
 *                 enum: [DA_XAC_NHAN, DANG_GIAO, DA_GIAO]
 *                 example: DA_XAC_NHAN
 *               ghiChu:
 *                 type: string
 *                 example: Đã xác nhận đơn hàng với khách
 *     responses:
 *       200:
 *         description: Chuyển trạng thái thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Trạng thái không hợp lệ
 *       409:
 *         description: Chuyển trạng thái trái quy trình State Machine hoặc xung đột khóa lạc quan
 */
router.put(
  '/orders/:id/status',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatCapNhatTrangThai),
  batLoiAsync(donHangController.xuLyAdminCapNhatTrangThai)
);

/**
 * @swagger
 * /api/admin/orders/{id}/cancel:
 *   put:
 *     summary: Hủy đơn hàng và tự động hoàn lại tồn kho (Quản trị viên, Thủ thư - khi đơn CHO_DUYET hoặc DA_XAC_NHAN)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã đơn hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [lyDo]
 *             properties:
 *               lyDo:
 *                 type: string
 *                 example: Không thể liên hệ được với người nhận sau 3 lần gọi
 *     responses:
 *       200:
 *         description: Hủy đơn và hoàn kho thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Lý do hủy không hợp lệ
 *       409:
 *         description: Đơn hàng không ở trạng thái CHO_DUYET hoặc DA_XAC_NHAN
 */
router.put(
  '/orders/:id/cancel',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatAdminHuyDon),
  batLoiAsync(donHangController.xuLyAdminHuyDon)
);

// ==========================================
// 3. Quản lý tài khoản nhân viên và khách hàng (T17)
// ==========================================
const luatTruyVanNhanVien = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  role: Joi.string().valid('quan_tri', 'thu_kho', 'thu_thu'),
  search: Joi.string().trim().allow('')
});

const luatTruyVanKhachHang = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
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
  vaiTro: Joi.string().valid('thu_kho', 'thu_thu').required().messages({
    'any.only': 'Chỉ được phép tạo tài khoản với vai trò thu_kho hoặc thu_thu',
    'any.required': 'Vai trò là bắt buộc'
  }),
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng'
  })
});

const luatCapNhatTrangThaiKhoa = Joi.object({
  dangHoatDong: Joi.boolean().required().messages({
    'any.required': 'Trạng thái hoạt động là bắt buộc'
  })
});

/**
 * @swagger
 * /api/admin/staff:
 *   get:
 *     summary: Xem danh sách nhân viên có phân trang, tìm kiếm và lọc vai trò (Quản trị viên)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [quan_tri, thu_kho, thu_thu]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách nhân viên
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/staff',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanNhanVien, 'query'),
  batLoiAsync(nguoiDungController.xuLyAdminLayDanhSachNhanVien)
);

/**
 * @swagger
 * /api/admin/staff:
 *   post:
 *     summary: Tạo tài khoản nhân viên mới và chỉ định vai trò (thu_kho hoặc thu_thu) (Quản trị viên)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, matKhau, hoTen, vaiTro]
 *             properties:
 *               email:
 *                 type: string
 *                 example: nhanvien.moi@booknest.vn
 *               matKhau:
 *                 type: string
 *                 example: MatKhau123
 *               hoTen:
 *                 type: string
 *                 example: Nguyễn Văn Kho
 *               vaiTro:
 *                 type: string
 *                 enum: [thu_kho, thu_thu]
 *                 example: thu_kho
 *               soDienThoai:
 *                 type: string
 *                 example: "0912345678"
 *     responses:
 *       201:
 *         description: Tạo tài khoản nhân viên thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc vai trò không được phép tạo
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 *       409:
 *         description: Email đã tồn tại
 */
router.post(
  '/staff',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTaoNhanVien),
  batLoiAsync(nguoiDungController.xuLyAdminTaoNhanVien)
);

/**
 * @swagger
 * /api/admin/staff/{id}/status:
 *   put:
 *     summary: Khóa hoặc kích hoạt lại tài khoản nhân viên (chặn quản trị viên tự khóa chính mình)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã nhân viên
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dangHoatDong]
 *             properties:
 *               dangHoatDong:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái tài khoản thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Không thể tự khóa tài khoản của chính mình
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 *       404:
 *         description: Không tìm thấy nhân viên
 */
router.put(
  '/staff/:id/status',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatCapNhatTrangThaiKhoa),
  batLoiAsync(nguoiDungController.xuLyAdminCapNhatTrangThaiNhanVien)
);

/**
 * @swagger
 * /api/admin/customers:
 *   get:
 *     summary: Xem danh sách khách hàng có phân trang và tìm kiếm (Quản trị viên)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách khách hàng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/customers',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanKhachHang, 'query'),
  batLoiAsync(nguoiDungController.xuLyAdminLayDanhSachKhachHang)
);

/**
 * @swagger
 * /api/admin/customers/{id}/status:
 *   put:
 *     summary: Khóa hoặc kích hoạt lại tài khoản khách hàng (Quản trị viên)
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã khách hàng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dangHoatDong]
 *             properties:
 *               dangHoatDong:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái tài khoản thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.put(
  '/customers/:id/status',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatCapNhatTrangThaiKhoa),
  batLoiAsync(nguoiDungController.xuLyAdminCapNhatTrangThaiKhachHang)
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

/**
 * @swagger
 * /api/admin/stats/overview:
 *   get:
 *     summary: Thống kê tổng quan tình hình kinh doanh (Tổng doanh thu, số đơn DA_GIAO, số sách đã bán) (Quản trị viên)
 *     tags: [Thống kê báo cáo (Admin Stats)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tuNgay
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: denNgay
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Số liệu báo cáo tổng quan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/stats/overview',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanDoanhThu, 'query'),
  batLoiAsync(thongKeController.xuLyLayTongQuan)
);

/**
 * @swagger
 * /api/admin/stats/top-books:
 *   get:
 *     summary: Xem danh sách những cuốn sách bán chạy nhất hệ thống (Quản trị viên)
 *     tags: [Thống kê báo cáo (Admin Stats)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng sách trong top
 *     responses:
 *       200:
 *         description: Danh sách sách bán chạy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/stats/top-books',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanTopSach, 'query'),
  batLoiAsync(thongKeController.xuLyLayTopSach)
);

/**
 * @swagger
 * /api/admin/stats/order-rates:
 *   get:
 *     summary: Thống kê tỷ lệ các trạng thái đơn hàng (tỷ lệ hoàn thành, hủy đơn) (Quản trị viên)
 *     tags: [Thống kê báo cáo (Admin Stats)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bảng tỷ lệ phần trăm theo từng trạng thái
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/stats/order-rates',
  xacThucToken,
  phanQuyen('quan_tri'),
  batLoiAsync(thongKeController.xuLyLayTyLeDon)
);

/**
 * @swagger
 * /api/admin/stats/inventory:
 *   get:
 *     summary: Xem báo cáo tồn kho và sách không bán trong 90 ngày (Quản trị viên, Thủ kho)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tổng tồn, giá trị tồn và danh sách sách còn hàng không có đơn giao thành công trong 90 ngày gần nhất.
 *       403:
 *         description: Không có quyền truy cập.
 */
router.get(
  '/stats/inventory',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  batLoiAsync(thongKeController.xuLyLayBaoCaoKho)
);

/**
 * @swagger
 * /api/admin/change-history:
 *   get:
 *     summary: Xem nhật ký lịch sử thay đổi quản trị (Chỉ Quản trị viên)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bản ghi lịch sử thay đổi
 */
router.get(
  '/change-history',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanLichSu, 'query'),
  batLoiAsync(lichSuQuanTriController.xuLyLayDanhSach)
);

/**
 * @swagger
 * /api/admin/change-history/cleanup-preview:
 *   post:
 *     summary: Xem trước số lượng bản ghi lịch sử sẽ dọn dẹp (Chỉ Quản trị viên)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kết quả xem trước dọn dẹp
 */
router.post(
  '/change-history/cleanup-preview',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatDonDepLichSu),
  batLoiAsync(lichSuQuanTriController.xuLyXemTruocDonDep)
);

/**
 * @swagger
 * /api/admin/change-history/cleanup:
 *   post:
 *     summary: Thực hiện dọn dẹp nhật ký lịch sử thay đổi (Chỉ Quản trị viên)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dọn dẹp thành công
 */
router.post(
  '/change-history/cleanup',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatDonDepLichSu),
  batLoiAsync(lichSuQuanTriController.xuLyDonDep)
);

module.exports = router;
