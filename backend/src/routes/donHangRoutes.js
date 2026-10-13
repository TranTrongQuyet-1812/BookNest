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

// Schema kiểm tra thông tin đặt hàng cho khách vãng lai
const luatDatHangKhachVangLai = Joi.object({
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
  emailNhan: Joi.string().trim().lowercase().max(255).email().required().messages({
    'string.empty': 'Email nhận thông báo không được để trống',
    'string.email': 'Email không đúng định dạng',
    'string.max': 'Email không được vượt quá 255 ký tự',
    'any.required': 'Email nhận thông báo đơn hàng là bắt buộc'
  }),
  diaChiGiaoHang: Joi.string().trim().min(5).max(255).required().messages({
    'string.empty': 'Địa chỉ giao hàng không được để trống',
    'string.min': 'Địa chỉ giao hàng phải có ít nhất 5 ký tự',
    'string.max': 'Địa chỉ giao hàng không được vượt quá 255 ký tự',
    'any.required': 'Địa chỉ giao hàng là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, ''),
  phuongThucThanhToan: Joi.string().valid('COD', 'CHUYEN_KHOAN_QR').default('COD'),
  cacMon: Joi.array().items(
    Joi.object({
      maSach: Joi.number().integer().positive().required(),
      soLuong: Joi.number().integer().positive().required()
    })
  ).min(1).required().messages({
    'array.min': 'Đơn hàng phải có ít nhất một cuốn sách',
    'any.required': 'Danh sách sách đặt mua là bắt buộc'
  })
});

/**
 * @swagger
 * /api/orders/guest:
 *   post:
 *     summary: Khách vãng lai đặt hàng trực tiếp từ giỏ hàng client (không tạo tài khoản, không lưu hồ sơ)
 *     tags: [Đơn hàng (Orders)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenNguoiNhan, soDienThoaiNhan, emailNhan, diaChiGiaoHang, cacMon]
 *             properties:
 *               tenNguoiNhan:
 *                 type: string
 *                 example: Khách Vãng Lai
 *               soDienThoaiNhan:
 *                 type: string
 *                 example: "0912345678"
 *               emailNhan:
 *                 type: string
 *                 example: khach@example.com
 *               diaChiGiaoHang:
 *                 type: string
 *                 example: 456 Võ Thị Sáu, Biên Hòa
 *               ghiChu:
 *                 type: string
 *                 example: Giao vào giờ hành chính
 *               cacMon:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [maSach, soLuong]
 *                   properties:
 *                     maSach:
 *                       type: integer
 *                       example: 1
 *                     soLuong:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       201:
 *         description: Đặt hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Thông tin nhận hàng hoặc danh sách sách không hợp lệ
 *       409:
 *         description: Sách hết tồn kho hoặc đã ngừng kinh doanh
 */
router.post('/guest', kiemTraDuLieu(luatDatHangKhachVangLai), batLoiAsync(donHangController.xuLyDatHangKhachVangLai));

// Tất cả các route bên dưới của khách đều cần đăng nhập với vai trò khach_hang
router.use(xacThucToken, phanQuyen('khach_hang'));

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
  emailNhan: Joi.string().trim().lowercase().max(255).email().required().messages({
    'string.empty': 'Email nhận thông báo không được để trống',
    'string.email': 'Email không đúng định dạng',
    'string.max': 'Email không được vượt quá 255 ký tự',
    'any.required': 'Email nhận thông báo đơn hàng là bắt buộc'
  }),
  diaChiGiaoHang: Joi.string().trim().min(5).max(255).required().messages({
    'string.empty': 'Địa chỉ giao hàng không được để trống',
    'string.min': 'Địa chỉ giao hàng phải có ít nhất 5 ký tự',
    'string.max': 'Địa chỉ giao hàng không được vượt quá 255 ký tự',
    'any.required': 'Địa chỉ giao hàng là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, ''),
  phuongThucThanhToan: Joi.string().valid('COD', 'CHUYEN_KHOAN_QR').default('COD'),
  luuMacDinh: Joi.boolean().default(true)
});

// Schema truy vấn danh sách đơn hàng
const luatTruyVanDonKhach = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid('CHO_DUYET', 'DA_XAC_NHAN', 'DANG_GIAO', 'DA_GIAO', 'DA_HUY')
});

// Schema hủy đơn của khách
const luatKhachHuyDon = Joi.object({
  lyDo: Joi.string().trim().max(500).allow(null, '')
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Đặt hàng từ giỏ hàng hiện tại (ACID Transaction, chống bán âm)
 *     tags: [Đơn hàng (Orders)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenNguoiNhan, soDienThoaiNhan, emailNhan, diaChiGiaoHang]
 *             properties:
 *               tenNguoiNhan:
 *                 type: string
 *                 example: Hoàng Khách Hàng
 *               soDienThoaiNhan:
 *                 type: string
 *                 example: "0914444555"
 *               emailNhan:
 *                 type: string
 *                 example: khach@example.com
 *               diaChiGiaoHang:
 *                 type: string
 *                 example: 123 Biên Hòa, Đồng Nai
 *               ghiChu:
 *                 type: string
 *                 example: Giao hàng vào giờ hành chính
 *               luuMacDinh:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Đặt hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Giỏ hàng đang trống hoặc thông tin nhận hàng không hợp lệ
 *       409:
 *         description: Sách hết tồn kho hoặc đã ngừng kinh doanh
 */
router.post('/', kiemTraDuLieu(luatDatHang), batLoiAsync(donHangController.xuLyDatHang));

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Xem danh sách đơn hàng của khách hàng hiện tại
 *     tags: [Đơn hàng (Orders)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số đơn mỗi trang
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CHO_DUYET, DA_XAC_NHAN, DANG_GIAO, DA_GIAO, DA_HUY]
 *         description: Lọc theo trạng thái đơn
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 */
router.get('/my-orders', kiemTraDuLieu(luatTruyVanDonKhach, 'query'), batLoiAsync(donHangController.xuLyLayDanhSachDonCuaKhach));

/**
 * @swagger
 * /api/orders/my-orders/{id}:
 *   get:
 *     summary: Xem chi tiết đơn hàng của chính mình (chống IDOR)
 *     tags: [Đơn hàng (Orders)]
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
 *         description: Chi tiết đơn hàng và lịch sử luân chuyển trạng thái
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy đơn hàng (hoặc không phải đơn của người dùng - chống dò ID)
 */
router.get('/my-orders/:id', kiemTraChuDon, batLoiAsync(donHangController.xuLyLayChiTietDonCuaKhach));

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Khách hàng tự hủy đơn khi đơn còn ở trạng thái CHO_DUYET
 *     tags: [Đơn hàng (Orders)]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lyDo:
 *                 type: string
 *                 example: Đổi ý không mua nữa
 *     responses:
 *       200:
 *         description: Hủy đơn thành công và đã hoàn lại tồn kho
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy đơn hàng
 *       409:
 *         description: Đơn hàng không ở trạng thái CHO_DUYET
 */
router.put('/:id/cancel', kiemTraChuDon, kiemTraDuLieu(luatKhachHuyDon), batLoiAsync(donHangController.xuLyKhachHuyDon));

module.exports = router;
