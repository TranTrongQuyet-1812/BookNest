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
const cauHinhHeThongController = require('../controllers/cauHinhHeThongController');
const aiChatbotController = require('../controllers/aiChatbotController');
const danhGiaController = require('../controllers/danhGiaController');
const thanhToanController = require('../controllers/thanhToanController');

const taoKiemTraMaSo = require('../middlewares/kiemTraMaSo');

const router = express.Router();

// Mã trên đường dẫn phải là số nguyên dương hợp lệ, sai thì 400 thay vì 500
router.param('id', taoKiemTraMaSo(''));

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
  status: Joi.string().valid('CHO_DUYET', 'DA_DUYET', 'DA_LAY_HANG', 'DA_GIAO', 'DA_HUY'),
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso(),
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY')
});

const luatTaoDonQuay = Joi.object({
  cacMon: Joi.array().min(1).max(30).items(Joi.object({
    maSach: Joi.number().integer().positive().required(),
    soLuong: Joi.number().integer().min(1).required()
  })).required(),
  phuongThucThanhToan: Joi.string().valid('TIEN_MAT', 'CHUYEN_KHOAN_QR').required().messages({
    'any.only': 'Phương thức thanh toán phải là TIEN_MAT hoặc CHUYEN_KHOAN_QR',
    'any.required': 'Phương thức thanh toán là bắt buộc'
  }),
  maKhachHang: Joi.number().integer().positive().allow(null),
  tenKhach: Joi.string().trim().max(100).allow('', null),
  soDienThoaiKhach: Joi.string().trim().max(15).allow('', null)
});

const luatTruyVanLichSu = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(30),
  loaiDoiTuong: Joi.string().valid('SACH', 'DANH_MUC', 'CAU_HINH'),
  truongDuLieu: Joi.string().max(50),
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso()
});

const luatDonDepLichSu = Joi.object({
  truocNgay: Joi.date().iso().required()
});

const luatCapNhatTrangThai = Joi.object({
  trangThaiMoi: Joi.string().valid('DA_DUYET', 'DA_LAY_HANG', 'DA_GIAO').required().messages({
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
 *           enum: [CHO_DUYET, DA_DUYET, DA_LAY_HANG, DA_GIAO, DA_HUY]
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
 * /api/admin/counter-orders/{id}/cancel:
 *   put:
 *     summary: Hủy đơn hàng bán tại quầy đang chờ thanh toán QR (Quản trị viên, Thủ thư)
 *     tags: [Bán tại quầy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lyDo:
 *                 type: string
 *                 example: Khách đổi ý không mua nữa
 *     responses:
 *       200:
 *         description: Đã hủy đơn quầy và hoàn tồn kho thành công
 *       400:
 *         description: Trạng thái đơn không hợp lệ để hủy
 *       404:
 *         description: Không tìm thấy đơn hàng quầy
 */
router.put(
  '/counter-orders/:id/cancel',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(donHangController.xuLyHuyDonQuay)
);

/**
 * @swagger
 * /api/admin/counter-orders/{id}/pay-cash:
 *   put:
 *     summary: Chuyển sang thu tiền mặt cho đơn quầy đang chờ thanh toán QR (Quản trị viên, Thủ thư)
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
 *         description: Đã chuyển sang tiền mặt và hoàn tất đơn hàng (DA_GIAO)
 *       409:
 *         description: Khoản thanh toán không còn ở trạng thái chờ
 */
router.put(
  '/counter-orders/:id/pay-cash',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(donHangController.xuLyChuyenThuTienMatQuay)
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
 *     summary: Chuyển trạng thái đơn hàng theo State Machine (CHO_DUYET -> DA_DUYET -> DA_LAY_HANG -> DA_GIAO)
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
 *                 enum: [DA_DUYET, DA_LAY_HANG, DA_GIAO]
 *                 example: DA_DUYET
 *               ghiChu:
 *                 type: string
 *                 example: Đã duyệt đơn hàng và chuyển đóng gói
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
 *     summary: Hủy đơn hàng và tự động hoàn lại tồn kho (Quản trị viên, Thủ thư - khi đơn CHO_DUYET hoặc DA_DUYET)
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
 *         description: Đơn hàng không ở trạng thái CHO_DUYET hoặc DA_DUYET
 */
router.put(
  '/orders/:id/cancel',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatAdminHuyDon),
  batLoiAsync(donHangController.xuLyAdminHuyDon)
);

/**
 * @swagger
 * /api/admin/pick-list:
 *   get:
 *     summary: Danh sách đơn hàng cần soạn (Pick list) cho kho (Quản trị viên, Thủ kho, Thủ thư)
 *     tags: [Quản trị đơn hàng (Admin Orders)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách đơn cần soạn và tổng hợp số lượng sách cần lấy từ kệ (không lộ thông tin khách)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 */
router.get(
  '/pick-list',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho', 'thu_thu'),
  batLoiAsync(donHangController.xuLyLayDanhSachDonCanSoan)
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
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[35789][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng'
  })
});

const luatCapNhatHoSoAdmin = Joi.object({
  hoTen: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Họ và tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ và tên không được vượt quá 100 ký tự'
  }),
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[35789][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng số di động Việt Nam'
  })
}).min(1).messages({
  'object.min': 'Cần cung cấp ít nhất một thông tin để cập nhật hồ sơ'
});

const luatDoiMatKhauAdmin = Joi.object({
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

const luatCapNhatNhanVien = Joi.object({
  hoTen: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ tên không được vượt quá 100 ký tự'
  }),
  vaiTro: Joi.string().valid('quan_tri', 'thu_kho', 'thu_thu').messages({
    'any.only': 'Vai trò chỉ có thể là quan_tri, thu_kho hoặc thu_thu'
  }),
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[35789][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng'
  })
}).min(1).messages({
  'object.min': 'Cần cung cấp ít nhất một thông tin để cập nhật'
});

const luatDatLaiMatKhauNhanVien = Joi.object({
  matKhauMoi: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
    'string.pattern.base': 'Mật khẩu phải chứa ít nhất 1 chữ cái và 1 chữ số',
    'any.required': 'Mật khẩu mới là bắt buộc'
  })
});

const luatCapNhatKhachHang = Joi.object({
  hoTen: Joi.string().trim().min(2).max(100).messages({
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ tên không được vượt quá 100 ký tự'
  }),
  soDienThoai: Joi.string().trim().pattern(/^(0|\+84)[35789][0-9]{8}$/).allow(null, '').messages({
    'string.pattern.base': 'Số điện thoại không đúng định dạng'
  }),
  diaChiMacDinh: Joi.string().trim().max(255).allow(null, '').messages({
    'string.max': 'Địa chỉ không được vượt quá 255 ký tự'
  })
}).min(1).messages({
  'object.min': 'Cần cung cấp ít nhất một thông tin để cập nhật'
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

// ==========================================
// 3.1. Hồ sơ và đổi mật khẩu cá nhân Back-Office (Mọi nhân viên: quan_tri, thu_kho, thu_thu)
// ==========================================
/**
 * @swagger
 * /api/admin/profile:
 *   get:
 *     summary: Xem thông tin hồ sơ nhân viên đang đăng nhập Back-Office
 *     tags: [Quản trị nhân sự (Admin Users)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin hồ sơ nhân viên
 */
router.get(
  '/profile',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho', 'thu_thu'),
  batLoiAsync(nguoiDungController.xuLyLayHoSo)
);

/**
 * @swagger
 * /api/admin/profile:
 *   put:
 *     summary: Cập nhật thông tin hồ sơ nhân viên đang đăng nhập Back-Office
 *     tags: [Quản trị nhân sự (Admin Users)]
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
 *               soDienThoai:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thông tin hồ sơ thành công
 */
router.put(
  '/profile',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho', 'thu_thu'),
  kiemTraDuLieu(luatCapNhatHoSoAdmin),
  batLoiAsync(nguoiDungController.xuLyCapNhatHoSo)
);

/**
 * @swagger
 * /api/admin/change-password:
 *   put:
 *     summary: Đổi mật khẩu cá nhân nhân viên Back-Office
 *     tags: [Quản trị nhân sự (Admin Users)]
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
 *               matKhauMoi:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công và cấp token mới
 */
router.put(
  '/change-password',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho', 'thu_thu'),
  kiemTraDuLieu(luatDoiMatKhauAdmin),
  batLoiAsync(nguoiDungController.xuLyDoiMatKhau)
);

/**
 * @swagger
 * /api/admin/staff/{id}:
 *   put:
 *     summary: Sửa thông tin nhân viên (họ tên, SĐT, vai trò) - Quản trị viên
 *     tags: [Quản trị nhân sự (Admin Users)]
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
 *         description: Cập nhật thông tin nhân viên thành công
 */
router.put(
  '/staff/:id',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatCapNhatNhanVien),
  batLoiAsync(nguoiDungController.xuLyAdminCapNhatNhanVien)
);

/**
 * @swagger
 * /api/admin/staff/{id}/password:
 *   put:
 *     summary: Đặt lại mật khẩu nhân viên - Quản trị viên
 *     tags: [Quản trị nhân sự (Admin Users)]
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
 *         description: Đặt lại mật khẩu thành công
 */
router.put(
  '/staff/:id/password',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatDatLaiMatKhauNhanVien),
  batLoiAsync(nguoiDungController.xuLyAdminDatLaiMatKhauNhanVien)
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
 *     summary: Xem danh sách khách hàng có phân trang và tìm kiếm (Quản trị viên, Thủ thư)
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
 *         description: Chỉ dành cho Quản trị viên hoặc Thủ thư
 */
router.get(
  '/customers',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatTruyVanKhachHang, 'query'),
  batLoiAsync(nguoiDungController.xuLyAdminLayDanhSachKhachHang)
);

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   get:
 *     summary: Xem chi tiết thông tin khách hàng và 5 đơn hàng gần nhất (Quản trị viên, Thủ thư)
 *     tags: [Quản trị nhân sự (Admin Users)]
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
 *         description: Chi tiết khách hàng kèm 5 đơn hàng gần nhất
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.get(
  '/customers/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(nguoiDungController.xuLyAdminLayChiTietKhachHang)
);

/**
 * @swagger
 * /api/admin/customers/{id}:
 *   put:
 *     summary: Sửa thông tin khách hàng (họ tên, SĐT, địa chỉ mặc định) (Quản trị viên, Thủ thư)
 *     tags: [Quản trị nhân sự (Admin Users)]
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
 *         description: Cập nhật thông tin khách hàng thành công
 *       404:
 *         description: Không tìm thấy khách hàng
 */
router.put(
  '/customers/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatCapNhatKhachHang),
  batLoiAsync(nguoiDungController.xuLyAdminCapNhatKhachHang)
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
// 4. Thống kê báo cáo doanh thu (T18, T31, T39)
// ==========================================
const luatTruyVanDoanhThu = Joi.object({
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso(),
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY')
});

const luatTruyVanTopSach = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY')
});

const luatTruyVanTyLeDon = Joi.object({
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY')
});

const luatTruyVanChuoiDoanhThu = Joi.object({
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso(),
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY'),
  group: Joi.string().valid('day', 'month').default('day')
});

const luatTruyVanTheoDanhMuc = Joi.object({
  tuNgay: Joi.date().iso(),
  denNgay: Joi.date().iso(),
  kenhBan: Joi.string().valid('TRUC_TUYEN', 'TAI_QUAY')
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
 *       - in: query
 *         name: kenhBan
 *         schema:
 *           type: string
 *           enum: [TRUC_TUYEN, TAI_QUAY]
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
 *       - in: query
 *         name: kenhBan
 *         schema:
 *           type: string
 *           enum: [TRUC_TUYEN, TAI_QUAY]
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
 *     parameters:
 *       - in: query
 *         name: kenhBan
 *         schema:
 *           type: string
 *           enum: [TRUC_TUYEN, TAI_QUAY]
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
  kiemTraDuLieu(luatTruyVanTyLeDon, 'query'),
  batLoiAsync(thongKeController.xuLyLayTyLeDon)
);

/**
 * @swagger
 * /api/admin/stats/revenue-series:
 *   get:
 *     summary: Thống kê chuỗi thời gian doanh thu gom nhóm theo ngày hoặc tháng (Quản trị viên)
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
 *       - in: query
 *         name: kenhBan
 *         schema:
 *           type: string
 *           enum: [TRUC_TUYEN, TAI_QUAY]
 *       - in: query
 *         name: group
 *         schema:
 *           type: string
 *           enum: [day, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Chuỗi số liệu doanh thu theo thời gian
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
  '/stats/revenue-series',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanChuoiDoanhThu, 'query'),
  batLoiAsync(thongKeController.xuLyLayChuoiDoanhThu)
);

/**
 * @swagger
 * /api/admin/stats/by-category:
 *   get:
 *     summary: Thống kê doanh thu và sản lượng bán theo thể loại sách (Quản trị viên)
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
 *       - in: query
 *         name: kenhBan
 *         schema:
 *           type: string
 *           enum: [TRUC_TUYEN, TAI_QUAY]
 *     responses:
 *       200:
 *         description: Báo cáo phân tích doanh thu theo thể loại
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
  '/stats/by-category',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTruyVanTheoDanhMuc, 'query'),
  batLoiAsync(thongKeController.xuLyLayTheoDanhMuc)
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
 * /api/admin/summary:
 *   get:
 *     summary: Tổng hợp danh sách đầu việc cần xử lý theo vai trò nhân sự đăng nhập (Quản trị viên, Thủ kho, Thủ thư)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dữ liệu tổng hợp việc cần làm và danh mục điều hướng nhanh
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
  '/summary',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho', 'thu_thu'),
  batLoiAsync(thongKeController.xuLyLaySummary)
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

// ==========================================
// 5. Công tắc hệ thống: bật/tắt thanh toán QR (T41)
// ==========================================
const luatDatCongTac = Joi.object({
  bat: Joi.boolean().strict().required().messages({
    'boolean.base': 'Giá trị bật/tắt phải là true hoặc false',
    'any.required': 'Giá trị bật/tắt là bắt buộc'
  })
});

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Xem trạng thái các công tắc hệ thống, người đổi và thời điểm đổi (Chỉ Quản trị viên)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách công tắc (khoa, ten, bat, daDuDieuKien, ngayCapNhat, nhanVienCapNhat)
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/settings',
  xacThucToken,
  phanQuyen('quan_tri'),
  batLoiAsync(cauHinhHeThongController.xuLyLayDanhSach)
);

/**
 * @swagger
 * /api/admin/settings/{khoa}:
 *   put:
 *     summary: Bật/tắt một công tắc hệ thống, ví dụ THANH_TOAN_QR_BAT (Chỉ Quản trị viên, có ghi lịch sử và báo realtime)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: khoa
 *         required: true
 *         schema:
 *           type: string
 *           example: THANH_TOAN_QR_BAT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bat]
 *             properties:
 *               bat:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Đã đổi công tắc
 *       400:
 *         description: Giá trị không hợp lệ
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 *       404:
 *         description: Khóa công tắc không tồn tại
 */
router.put(
  '/settings/:khoa',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatDatCongTac),
  batLoiAsync(cauHinhHeThongController.xuLyDatCongTac)
);

// ==========================================
// 12. Giám sát ngân sách AI Chatbot (Chỉ Quản trị viên)
// ==========================================
/**
 * @swagger
 * /api/admin/chatbot/stats:
 *   get:
 *     summary: Xem thống kê tiêu thụ token và trần ngân sách ngày của AI Chatbot (Chỉ Quản trị viên)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thống kê số lượng token đã dùng, trần ngày, phần trăm tiêu thụ
 *       403:
 *         description: Chỉ dành cho Quản trị viên
 */
router.get(
  '/chatbot/stats',
  xacThucToken,
  phanQuyen('quan_tri'),
  batLoiAsync(aiChatbotController.layThongKe)
);

// ==========================================
// 13. Quản lý & Kiểm duyệt đánh giá sách (Task T38)
// ==========================================
const luatAnHienDanhGia = Joi.object({
  daAn: Joi.boolean().required(),
  lyDo: Joi.string().trim().max(255).allow('')
});

/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Xem danh sách đánh giá toàn hệ thống phục vụ kiểm duyệt (Quản trị viên, Thủ thư)
 *     tags: [Quản trị (Admin)]
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
 *         name: rating
 *         schema:
 *           type: integer
 *       - in: query
 *         name: daAn
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Danh sách đánh giá kèm thông tin sách và khách hàng
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/reviews',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(danhGiaController.xuLyLayDanhSachAdmin)
);

/**
 * @swagger
 * /api/admin/reviews/{id}/visibility:
 *   put:
 *     summary: Ẩn hoặc bỏ ẩn một đánh giá vi phạm (Quản trị viên, Thủ thư)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [daAn]
 *             properties:
 *               daAn:
 *                 type: boolean
 *               lyDo:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã cập nhật trạng thái ẩn/hiện đánh giá
 *       403:
 *         description: Không có quyền truy cập
 */
router.put(
  '/reviews/:id/visibility',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  kiemTraDuLieu(luatAnHienDanhGia),
  batLoiAsync(danhGiaController.xuLyAnHienDanhGia)
);

/**
 * @swagger
 * /api/admin/reviews/{id}:
 *   delete:
 *     summary: Xóa vĩnh viễn đánh giá rác/spam nghiêm trọng (Chỉ Quản trị viên)
 *     tags: [Quản trị (Admin)]
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
 *         description: Đã xóa đánh giá thành công
 *       403:
 *         description: Chỉ Quản trị viên mới được xóa
 */
router.delete(
  '/reviews/:id',
  xacThucToken,
  phanQuyen('quan_tri'),
  batLoiAsync(danhGiaController.xuLyXoaDanhGia)
);

// ==========================================
// 8. Quản lý thanh toán & Hoàn tiền (Deliverable 20)
// ==========================================

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: Danh sách toàn bộ các khoản thanh toán của hệ thống (Quản trị viên, Thủ thư)
 *     tags: [Quản trị (Admin)]
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
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách thanh toán kèm thông tin đơn hàng
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/payments',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_thu'),
  batLoiAsync(thanhToanController.layDanhSachThanhToanAdmin)
);

/**
 * @swagger
 * /api/admin/payments/{id}/refunded:
 *   put:
 *     summary: Xác nhận đã hoàn tiền thủ công cho khách qua ngân hàng (Quản trị viên, Thủ thư)
 *     tags: [Quản trị (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maThamChieu:
 *                 type: string
 *               ghiChu:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã xác nhận hoàn tiền thành công
 *       403:
 *         description: Không có quyền truy cập
 */
router.put(
  '/payments/:id/refunded',
  xacThucToken,
  phanQuyen('quan_tri'),
  batLoiAsync(thanhToanController.xacNhanHoanTienAdmin)
);

module.exports = router;
