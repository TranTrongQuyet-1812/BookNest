/**
 * Tuyến đường (Routes) quản lý giỏ hàng (/api/cart).
 * Chỉ khách hàng (khach_hang) mới có quyền thao tác trên giỏ hàng cá nhân.
 */
const express = require('express');
const Joi = require('joi');
const gioHangController = require('../controllers/gioHangController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const taoKiemTraMaSo = require('../middlewares/kiemTraMaSo');

const router = express.Router();

// Mã trên đường dẫn phải là số nguyên dương hợp lệ, sai thì 400 thay vì 500
router.param('bookId', taoKiemTraMaSo('sách'));

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập với vai trò khach_hang
router.use(xacThucToken, phanQuyen('khach_hang'));

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

/**
 * @swagger
 * /api/cart:
 *   get:
 *     summary: Xem giỏ hàng cá nhân của khách hàng
 *     tags: [Giỏ hàng (Cart)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin giỏ hàng và danh sách sách đã chọn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chỉ dành cho khách hàng (Customer)
 */
router.get('/', batLoiAsync(gioHangController.xuLyLayGioHang));

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     summary: Thêm sách vào giỏ hàng
 *     tags: [Giỏ hàng (Cart)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [maSach]
 *             properties:
 *               maSach:
 *                 type: integer
 *                 example: 1
 *               soLuong:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Thêm vào giỏ thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc sách không tồn tại / đã ẩn
 *       409:
 *         description: Số lượng yêu cầu vượt quá tồn kho
 */
router.post('/items', kiemTraDuLieu(luatThemVaoGio), batLoiAsync(gioHangController.xuLyThemVaoGio));

/**
 * @swagger
 * /api/cart/items/{bookId}:
 *   put:
 *     summary: Cập nhật số lượng cuốn sách trong giỏ hàng
 *     tags: [Giỏ hàng (Cart)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [soLuong]
 *             properties:
 *               soLuong:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cập nhật số lượng thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Số lượng không hợp lệ
 *       409:
 *         description: Vượt quá tồn kho hiện có
 */
router.put('/items/:bookId', kiemTraDuLieu(luatCapNhatSoLuong), batLoiAsync(gioHangController.xuLyCapNhatSoLuong));

/**
 * @swagger
 * /api/cart:
 *   delete:
 *     summary: Xóa sạch toàn bộ giỏ hàng
 *     tags: [Giỏ hàng (Cart)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Làm trống giỏ hàng thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 */
router.delete('/', batLoiAsync(gioHangController.xuLyXoaToanBoGioHang));

/**
 * @swagger
 * /api/cart/items/{bookId}:
 *   delete:
 *     summary: Xóa một cuốn sách khỏi giỏ hàng
 *     tags: [Giỏ hàng (Cart)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách cần xóa khỏi giỏ
 *     responses:
 *       200:
 *         description: Đã xóa cuốn sách khỏi giỏ hàng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 */
router.delete('/items/:bookId', batLoiAsync(gioHangController.xuLyXoaKhoiGio));

module.exports = router;
