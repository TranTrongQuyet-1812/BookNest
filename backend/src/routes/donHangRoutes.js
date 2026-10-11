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
 *             required: [tenNguoiNhan, soDienThoaiNhan, diaChiGiaoHang]
 *             properties:
 *               tenNguoiNhan:
 *                 type: string
 *                 example: Hoàng Khách Hàng
 *               soDienThoaiNhan:
 *                 type: string
 *                 example: "0914444555"
 *               diaChiGiaoHang:
 *                 type: string
 *                 example: 123 Biên Hòa, Đồng Nai
 *               ghiChu:
 *                 type: string
 *                 example: Giao hàng vào giờ hành chính
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
 *           enum: [PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED]
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
 *     summary: Khách hàng tự hủy đơn khi đơn còn ở trạng thái PENDING
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
 *         description: Đơn hàng không ở trạng thái PENDING
 */
router.put('/:id/cancel', kiemTraChuDon, kiemTraDuLieu(luatKhachHuyDon), batLoiAsync(donHangController.xuLyKhachHuyDon));

module.exports = router;
